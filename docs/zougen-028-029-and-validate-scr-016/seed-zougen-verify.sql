-- ============================================================================
-- SEED — 増減連絡票(SCR-028) / 増減通知(SCR-029) 検証用データ  (v2 — sửa nghiệp vụ rireki)
--
-- Mục đích:
--   1 JA cô lập + 1 account role 3 (CHUOKAI) mới + các độc giả có CHUỖI LỊCH SỬ
--   (t_dokusya_rireki) đúng nghiệp vụ, phủ hết biến số của:
--     - joho_henko_tekiyo_date  (ngày áp dụng đổi thông tin độc giả)
--     - hanbaiten_tekiyo_date   (ngày áp dụng đổi cửa hàng)
--     - zougen_hokoku_flg, shinki_flg, kaiyaku_flg
--
-- ⚠️ QUY TẮC NGHIỆP VỤ rireki_no (đã sửa theo phản hồi khách hàng):
--   - 新規 (đăng ký mới)  : LUÔN rireki_no = 1 (bản ghi đầu tiên, zenkai_* = NULL).
--   - 解約 (hủy)          : rireki_no ≥ 2 (phải có 新規 trước đó).
--   - 再購読 (tái đặt)    : = hủy rồi đặt lại → rireki_no ≥ 3
--                           (chuỗi: 1=新規 → 2=解約 → 3=再購読, shinki_flg=true).
--   - Mọi thay đổi khác   : rireki_no ≥ 2 (có baseline 新規 ở rireki 1).
--
--   👉 MỌI 新規/再購読 (shinki_flg=true) đều có zougen_hokoku_flg=TRUE — khớp code
--      SCR-011 create() (dokusya.service.ts:749): đăng ký mới là sự kiện 増 (tăng).
--      Baseline 新規 ở rireki 1 đặt joho QUÁ KHỨ (2026-01-10) nên KHÔNG khớp `=` D1
--      (báo cáo `=` chỉ thấy sự kiện đúng ngày D1), NHƯNG SẼ xuất hiện dưới `<=` D1
--      (cộng dồn mọi thay đổi ≤ ngày) — đây chính là lý do bắt buộc phải dedup
--      MAX(rireki_no), nếu không 1 độc giả bị tính cả 新規 cũ lẫn thay đổi mới.
--
-- ⚠️ LƯU Ý LOGIC CODE: update() (apps/backend/.../dokusya.service.ts:966) đang ép
--   shinki_flg=false → app HIỆN KHÔNG sinh được bản ghi 再購読 (shinki_flg=true ở
--   rireki≥3). Seed này dựng tay đúng nghiệp vụ để test báo cáo; code cần sửa
--   riêng cho khớp spec.
--
-- ⚠️ Báo cáo 028/029 lọc theo joho_henko_tekiyo_date (đã đổi `=`→`<=` 2026-06);
--   KHÔNG dùng hanbaiten_tekiyo_date. ZG07/ZG10 minh chứng điều này.
--
-- Cách chạy (idempotent — tự xóa bộ cũ theo ja_code='JAZG9001'):
--   docker exec -i agrinews-postgres-1 psql -U postgres -d agrinews_dev \
--     < docs/review/zougen-028-029/seed-zougen-verify.sql
--
-- Login: chuokai_zg / admin@1234567
-- ============================================================================

DO $$
DECLARE
  -- ── tham số ngày ──────────────────────────────────────────────────────
  v_d1     DATE := DATE '2026-07-01';   -- 適用日 chính của báo cáo
  v_d2     DATE := DATE '2026-08-01';   -- ngày khác (> D1) — case đổi cửa hàng異日
  v_d0     DATE := DATE '2026-06-15';   -- thay đổi giữa kỳ (< D1) — ZG13
  v_d3     DATE := DATE '2026-09-01';   -- đổi cửa hàng TƯƠNG LAI (> D1) — ZG15/ZG16
  v_kai    DATE := DATE '2026-03-15';   -- ngày hủy trong chuỗi 再購読 — ZG14
  v_base   DATE := DATE '2026-01-10';   -- ngày 新規 baseline (quá khứ, zougen=false)
  v_kaishi DATE := DATE '2026-01-10';   -- 購読開始日

  v_ja_id    BIGINT;
  v_ks_a     BIGINT;
  v_ks_b     BIGINT;
  v_shiten_a BIGINT;
  v_shiten_b BIGINT;
  v_tanka    BIGINT;
  v_h1       BIGINT;
  v_h2       BIGINT;
  v_h3       BIGINT;
  v_pwd      VARCHAR(256);
BEGIN
  SELECT password_hash INTO v_pwd
  FROM m_account WHERE deleted_at IS NULL ORDER BY account_id LIMIT 1;
  IF v_pwd IS NULL THEN
    RAISE EXCEPTION '[seed-zougen] Chưa có account nào để lấy password_hash. Chạy `npm run seed` trước.';
  END IF;

  -- ── CLEANUP (idempotent) ─────────────────────────────────────────────
  DELETE FROM t_dokusya_rireki r USING m_ja j WHERE r.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  DELETE FROM t_dokusya d        USING m_ja j WHERE d.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  -- Xóa các bảng tham chiếu m_account trước (FK), tránh lỗi khi account đã từng
  -- đăng nhập / phát sinh log / OTP trong lúc test.
  DELETE FROM t_login_log WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg');
  DELETE FROM t_log       WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg');
  DELETE FROM t_mfa_otp   WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg');
  DELETE FROM m_account WHERE login_id='chuokai_zg';
  DELETE FROM m_hanbaiten h USING m_ja j WHERE h.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  DELETE FROM m_shiten s    USING m_ja j WHERE s.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  DELETE FROM m_tanka t     USING m_ja j WHERE t.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  DELETE FROM m_kanri_shiten k USING m_ja j WHERE k.ja_id=j.ja_id AND j.ja_code='JAZG9001';
  DELETE FROM m_ja WHERE ja_code='JAZG9001';

  -- ── masters ──────────────────────────────────────────────────────────
  INSERT INTO m_ja (ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no,
                    address, tel, fax, chuokai_flg, zei_kubun, created_by, updated_by)
  VALUES ('JAZG9001','増減検証JA','ｿﾞｳｹﾞﾝｹﾝｼｮｳｼﾞｪｲｴｰ','13','1000001',
          '東京都千代田区1-1-1','03-0000-0001','03-0000-0002',false,1,'SEED_ZG','SEED_ZG')
  RETURNING ja_id INTO v_ja_id;

  INSERT INTO m_kanri_shiten (ja_id,kanri_shiten_code,kanri_shiten_name,kanri_shiten_name_kana,
                              yubin_no,todofuken_code,address,tel,fax,created_by,updated_by)
  VALUES (v_ja_id,'113-9001-001','増減検証管理支店A','ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝｴｰ',
          '1000001','13','東京都千代田区A','03-0000-1001','03-0000-1002','SEED_ZG','SEED_ZG')
  RETURNING kanri_shiten_id INTO v_ks_a;
  INSERT INTO m_kanri_shiten (ja_id,kanri_shiten_code,kanri_shiten_name,kanri_shiten_name_kana,
                              yubin_no,todofuken_code,address,tel,fax,created_by,updated_by)
  VALUES (v_ja_id,'113-9001-002','増減検証管理支店B','ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝﾋﾞｰ',
          '1000001','13','東京都千代田区B','03-0000-2001','03-0000-2002','SEED_ZG','SEED_ZG')
  RETURNING kanri_shiten_id INTO v_ks_b;

  INSERT INTO m_shiten (ja_id,shiten_code,shiten_name,shiten_name_kana,kanri_shiten_id,created_by,updated_by)
  VALUES (v_ja_id,'ST9001','増減検証支店A','ｿﾞｳｹﾞﾝｼﾃﾝｴｰ',v_ks_a,'SEED_ZG','SEED_ZG')
  RETURNING shiten_id INTO v_shiten_a;
  INSERT INTO m_shiten (ja_id,shiten_code,shiten_name,shiten_name_kana,kanri_shiten_id,created_by,updated_by)
  VALUES (v_ja_id,'ST9002','増減検証支店B','ｿﾞｳｹﾞﾝｼﾃﾝﾋﾞｰ',v_ks_b,'SEED_ZG','SEED_ZG')
  RETURNING shiten_id INTO v_shiten_b;

  INSERT INTO m_tanka (ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,
                       tax_rate,tekiyo_start_date,active_flg,created_by,updated_by)
  VALUES (v_ja_id,'T001',1,'新聞購読料 月額',3500,3182,10.00,v_kaishi,true,'SEED_ZG','SEED_ZG')
  RETURNING tanka_id INTO v_tanka;

  INSERT INTO m_hanbaiten (ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,
                           todofuken_code,itaku_kubun,bank_code,bank_name,bank_branch_code,
                           bank_branch_name,haiten_flg,created_by,updated_by)
  VALUES (v_ja_id,'HB001','増減販売店1','ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ1','','13',2,'0001','みずほ銀行','001','本店',false,'SEED_ZG','SEED_ZG')
  RETURNING hanbaiten_id INTO v_h1;
  INSERT INTO m_hanbaiten (ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,
                           todofuken_code,itaku_kubun,bank_code,bank_name,bank_branch_code,
                           bank_branch_name,haiten_flg,created_by,updated_by)
  VALUES (v_ja_id,'HB002','増減販売店2','ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ2','T1234567890123','13',1,'0001','みずほ銀行','002','丸の内',false,'SEED_ZG','SEED_ZG')
  RETURNING hanbaiten_id INTO v_h2;
  INSERT INTO m_hanbaiten (ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,
                           todofuken_code,itaku_kubun,bank_code,bank_name,bank_branch_code,
                           bank_branch_name,haiten_flg,created_by,updated_by)
  VALUES (v_ja_id,'HB003','増減販売店3(廃店)','ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ3','','13',2,'0001','みずほ銀行','003','廃店',true,'SEED_ZG','SEED_ZG')
  RETURNING hanbaiten_id INTO v_h3;

  INSERT INTO m_account (login_id,password_hash,account_name,role_id,ja_id,kanri_shiten_id,
                         todofuken_code,paper_flg,denshi_flg,email,created_by,updated_by)
  VALUES ('chuokai_zg',v_pwd,'増減検証中央会アカウント',3,v_ja_id,NULL,'13',true,true,
          'chuokai_zg@agrinews.jp','SEED_ZG','SEED_ZG');

  -- ════════════════════════════════════════════════════════════════════
  -- t_dokusya — 1 master / độc giả (trạng thái HIỆN HÀNH = rireki mới nhất)
  --   cột: code, shubetsu, tetsuzuki, busu(hiện), hanb, ks, shiten, joho(hiện),
  --        rireki_no(max), shiku(địa chỉ giao hiện hành)
  -- ════════════════════════════════════════════════════════════════════
  INSERT INTO t_dokusya (
    ja_id, kanri_shiten_id, shiten_id, kumiaiin_code, dokusya_shubetsu, tetsuzuki_shurui,
    shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei, dokusya_busu, yubin_no,
    todofuken_code, shikuchoson, chome_banchi, mail_magazine_flg, haitatsu_same_flg,
    haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi,
    haitatsu_renrakusaki_1, hanbaiten_id, tanka_id, shiharai_hoho,
    shoki_dokusya_kaishi_date, dokusya_kaishi_date, joho_henko_tekiyo_date,
    rireki_no, created_by, updated_by)
  SELECT
    v_ja_id, t.ks, t.shiten, t.code, t.shubetsu, t.tetsuzuki,
    '検証', t.code, 'ｹﾝｼｮｳ', t.code, t.busu, '1000001',
    -- haitatsu_same_flg: ZG11 = false (giao ≠ độc giả → haitatsu_* có dữ liệu),
    -- các case khác = true (giao = độc giả → haitatsu_* để rỗng).
    '13', t.shiku, '1-1-1', 0, (t.code <> 'ZG11'),
    CASE WHEN t.code='ZG11' THEN '1000001' ELSE '' END,
    CASE WHEN t.code='ZG11' THEN '13'      ELSE '' END,
    CASE WHEN t.code='ZG11' THEN t.shiku   ELSE '' END,
    CASE WHEN t.code='ZG11' THEN '1-1-1'   ELSE '' END,
    '090-0000-0000', t.hanb, v_tanka, 2,
    v_kaishi, v_kaishi, t.joho,
    t.rno, 'SEED_ZG', 'SEED_ZG'
  FROM (VALUES
    --  code ,shubetsu,tetsuzuki, busu, hanb , ks    , shiten    , joho , rno, shiku
    ('ZG01', 1, 1, 5, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG02', 1, 1, 2, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG03', 1, 1, 3, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区丸の内'),
    ('ZG04', 1, 1, 4, v_h1, v_ks_a, v_shiten_a, v_d1,  1, '千代田区神田'),
    ('ZG05', 1, 0, 0, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG06', 1, 1, 6, v_h2, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG07', 1, 1, 6, v_h2, v_ks_a, v_shiten_a, v_d2,  2, '千代田区神田'),
    ('ZG08', 1, 1, 3, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG09', 1, 1, 5, v_h3, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG10', 1, 1, 6, v_h2, v_ks_a, v_shiten_a, v_d0,  2, '千代田区神田'),
    ('ZG11', 1, 1, 0, v_h1, v_ks_a, v_shiten_a, v_d1,  2, '千代田区丸の内'),
    ('ZG12', 1, 1, 3, v_h1, v_ks_b, v_shiten_b, v_d1,  2, '千代田区神田'),
    ('ZG13', 1, 1, 5, v_h1, v_ks_a, v_shiten_a, v_d1,  3, '千代田区神田'),
    ('ZG14', 1, 1, 4, v_h1, v_ks_a, v_shiten_a, v_d1,  3, '千代田区神田'),
    ('ZG15', 1, 1, 6, v_h2, v_ks_a, v_shiten_a, v_d1,  2, '千代田区神田'),
    ('ZG16', 1, 1, 6, v_h2, v_ks_a, v_shiten_a, v_d1,  3, '千代田区神田')
  ) AS t(code,shubetsu,tetsuzuki,busu,hanb,ks,shiten,joho,rno,shiku);

  -- ════════════════════════════════════════════════════════════════════
  -- t_dokusya_rireki — TOÀN BỘ chuỗi lịch sử (baseline 新規 + các sự kiện)
  --   join t_dokusya theo kumiaiin_code để lấy dokusya_id.
  --   cột VALUES: code, rno, busu, zenkai_busu, joho, hanb_tekiyo, flag,
  --               shinki, kaiyaku, hanb, zenkai_hanb, ks, shiten,
  --               now_shiku(配達先 hiện), zen_shiku(前回配達先), saishin
  --
  --   Ý nghĩa từng độc giả:
  --     ZG01 増部      : 1=新規(busu2,quá khứ,zougen T) → 2=増(2→5, D1)
  --     ZG02 減部      : 1=新規(5) → 2=減(5→2, D1)
  --     ZG03 住所変更  : 1=新規(3,神田) → 2=住所(神田→丸の内, busu 3→3, D1)
  --     ZG04 新規      : 1=新規(4, D1, zougen T)  ← CHỈ rireki 1
  --     ZG05 解約      : 1=新規(3) → 2=解約(3→0, D1)
  --     ZG06 đổi店+増  : 1=新規(4) → 2=店変+増(H1→H2,4→6, joho=hanb=D1)
  --     ZG07 đổi店異日 : 1=新規(4) → 2=店変+増(H1→H2,4→6, joho=D2, hanb_tekiyo=D1)
  --     ZG08 cờ false  : 1=新規(3) → 2=đổi ngân hàng(3→3, D1, zougen F)
  --     ZG09 廃店      : 1=新規(2,H3) → 2=増(2→5, D1, H3 廃店)
  --     ZG10 bulk店変  : 1=新規(4) → 2=đổi店 SCR-015(H1→H2,4→6, joho=D0 kế thừa từ info trước, hanb_tekiyo=D1)
  --     ZG11 0→0+住所  : 1=新規(0) → 2=住所(0→0, D1)  [synthetic cho 029 NOT(0&0)]
  --     ZG12 KS-B 増   : 1=新規(1) → 2=増(1→3, D1, ks=B)
  --     ZG13 増 nhiều  : 1=新規(2) → 2=増(2→3, D0=06-15) → 3=増(3→5, D1)
  --     ZG14 再購読    : 1=新規(3,quá khứ) → 2=解約(3→0, 03-15) → 3=再購読(0→4, D1, shinki T) ← rireki_no=3
  --     ZG15 hanb>joho 1 lần : 1=新規(4) → 2=tăng phần+đổi店 cùng record (joho=D1, hanbaiten_tekiyo=D3>joho)
  --     ZG16 hanb>joho 2 lần : 1=新規(4) → 2=tăng phần(joho=D1) → 3=đổi店(joho=D1 kế thừa, hanbaiten_tekiyo=D3>joho)
  -- ════════════════════════════════════════════════════════════════════
  INSERT INTO t_dokusya_rireki (
    dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
    dokusya_shubetsu, tetsuzuki_shurui, shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
    dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, mail_magazine_flg,
    haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
    haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_shimei_sei, haitatsu_shimei_mei,
    haitatsu_renrakusaki_1, hanbaiten_id, tanka_id, shiharai_hoho,
    shoki_dokusya_kaishi_date, dokusya_kaishi_date, joho_henko_tekiyo_date, hanbaiten_tekiyo_date,
    saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
    zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no, zenkai_todofuken_code,
    zenkai_shikuchoson, zenkai_chome_banchi, zenkai_tatemono_mei, created_by)
  SELECT
    d.dokusya_id, v.rno, v_ja_id, v.ks, v.shiten, v.code,
    1, v.tetsuzuki, '検証', v.code, 'ｹﾝｼｮｳ', v.code,
    v.busu, '1000001', '13', v.now_shiku, '1-1-1', 0,
    -- same_flg theo case (ZG11=false còn lại=true); haitatsu_* chỉ điền khi false.
    (v.code <> 'ZG11'),
    CASE WHEN v.code='ZG11' THEN '1000001'   ELSE '' END,
    CASE WHEN v.code='ZG11' THEN '13'        ELSE '' END,
    CASE WHEN v.code='ZG11' THEN v.now_shiku ELSE '' END,
    CASE WHEN v.code='ZG11' THEN '1-1-1'     ELSE '' END, '', '検証', v.code,
    '090-0000-0000', v.hanb, v_tanka, 2,
    v_kaishi, v_kaishi, v.joho, v.hanb_tekiyo,
    -- 新規/再購読 (shinki) LUÔN zougen_hokoku_flg=true (khớp SCR-011 create);
    -- các sự kiện khác dùng đúng cờ trong VALUES.
    v.saishin, (v.flag OR v.shinki), v.shinki, v.kaiyaku,
    v.zenkai_hanb, v.zenkai_busu, v.zen_yubin, '13',
    v.zen_shiku, v.zen_chome, '', 'SEED_ZG'
  FROM (VALUES
    -- code , rno, tetsuzuki, busu, zenkai_busu, joho , hanb_tekiyo, flag , shinki, kaiyaku, hanb , zenkai_hanb , ks    , shiten    , now_shiku        , zen_shiku        , zen_yubin , zen_chome , saishin
    ('ZG01', 1, 1, 2, NULL::INT,   v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL::TEXT,        NULL::TEXT, NULL::TEXT, false),
    ('ZG01', 2, 1, 5, 2,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG02', 1, 1, 5, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG02', 2, 1, 2, 5,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG03', 1, 1, 3, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG03', 2, 1, 3, 3,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区丸の内', '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG04', 1, 1, 4, NULL,       v_d1,   NULL::DATE, true , true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       true ),

    ('ZG05', 1, 1, 3, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG05', 2, 0, 0, 3,          v_d1,   NULL::DATE, true , false, true , v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG06', 1, 1, 4, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG06', 2, 1, 6, 4,          v_d1,   v_d1,       true , false, false, v_h2, v_h1,         v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG07', 1, 1, 4, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG07', 2, 1, 6, 4,          v_d2,   v_d1,       true , false, false, v_h2, v_h1,         v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG08', 1, 1, 3, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG08', 2, 1, 3, 3,          v_d1,   NULL::DATE, false, false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG09', 1, 1, 2, NULL,       v_base, NULL::DATE, false, true , false, v_h3, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG09', 2, 1, 5, 2,          v_d1,   NULL::DATE, true , false, false, v_h3, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG10', 1, 1, 4, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG10', 2, 1, 6, 4,          v_d0,   v_d1,       true , false, false, v_h2, v_h1,         v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG11', 1, 1, 0, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG11', 2, 1, 0, 0,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区丸の内', '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG12', 1, 1, 1, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_b, v_shiten_b, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG12', 2, 1, 3, 1,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_b, v_shiten_b, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG13', 1, 1, 2, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG13', 2, 1, 3, 2,          v_d0,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    false),
    ('ZG13', 3, 1, 5, 3,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    ('ZG14', 1, 1, 3, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG14', 2, 0, 0, 3,          v_kai,  NULL::DATE, true , false, true , v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    false),
    ('ZG14', 3, 1, 4, 0,          v_d1,   NULL::DATE, true , true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    -- ZG15 — 1 LẦN: 1 lần sửa gồm CẢ đổi thông tin (tăng phần, áp dụng D1) VÀ
    --   đổi cửa hàng (áp dụng D3 tương lai). 1 history row mang joho=D1 và
    --   hanbaiten_tekiyo=D3 (> joho). hanbaiten_id đã đổi sang H2 ngay trong record.
    ('ZG15', 1, 1, 4, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG15', 2, 1, 6, 4,          v_d1,   v_d3,       true , false, false, v_h2, v_h1,         v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true ),

    -- ZG16 — 2 LẦN: lần 1 đổi thông tin (tăng phần, D1) → lần 2 đổi cửa hàng
    --   (D3 tương lai). rireki2 = info(joho D1, hanb NULL), rireki3 = đổi店
    --   (joho=D1 kế thừa từ master vì luồng đổi店 không đụng joho;
    --    hanbaiten_tekiyo=D3 > joho). busu không đổi ở rireki3.
    ('ZG16', 1, 1, 4, NULL,       v_base, NULL::DATE, false, true , false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   NULL,             NULL,      NULL,       false),
    ('ZG16', 2, 1, 6, 4,          v_d1,   NULL::DATE, true , false, false, v_h1, NULL::BIGINT, v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    false),
    ('ZG16', 3, 1, 6, 6,          v_d1,   v_d3,       true , false, false, v_h2, v_h1,         v_ks_a, v_shiten_a, '千代田区神田',   '千代田区神田',   '1000001', '1-1-1',    true )
  ) AS v(code,rno,tetsuzuki,busu,zenkai_busu,joho,hanb_tekiyo,flag,shinki,kaiyaku,
         hanb,zenkai_hanb,ks,shiten,now_shiku,zen_shiku,zen_yubin,zen_chome,saishin)
  JOIN t_dokusya d ON d.kumiaiin_code = v.code AND d.ja_id = v_ja_id;

  RAISE NOTICE '[seed-zougen v2] DONE. ja_id=%, account=chuokai_zg, KS-A=%, KS-B=%, H1=%, H2=%, H3(廃店)=%',
    v_ja_id, v_ks_a, v_ks_b, v_h1, v_h2, v_h3;
END $$;
