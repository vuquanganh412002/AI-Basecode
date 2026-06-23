-- ============================================================================
-- VERIFY — kiểm chứng query báo cáo 増減 (SCR-028 / SCR-029)
--
-- ⚠️ CẬP NHẬT THEO YÊU CẦU KHÁCH HÀNG (2026-06):
--   Điều kiện lọc đổi từ  joho_henko_tekiyo_date = :tekiyo
--                   sang  joho_henko_tekiyo_date <= :tekiyo
--   → "lấy mọi thay đổi đã có hiệu lực TÍNH ĐẾN ngày chỉ định".
--
--   ⚠️ Code thực tế (report.service.ts:1034 và :1126) HIỆN VẪN dùng `=`.
--      Phải sửa code khớp với spec mới — xem ghi chú cuối file.
--
--   ⚠️ RỦI RO ĐẾM TRÙNG: `<=` trần (chỉ đổi toán tử) khiến 1 độc giả có
--      nhiều dòng history (nhiều lần đổi với joho <= ngày) bị tính NHIỀU LẦN.
--      Báo cáo 購読者名簿 (report.service.ts:573) tránh điều này bằng cách thêm
--      điều kiện rireki_no = MAX(rireki_no) theo từng dokusya. Case ZG13 trong
--      seed dựng riêng để minh chứng. Phần D dưới đây so sánh 2 biến thể.
--
-- Chạy SAU khi đã chạy seed-zougen-verify.sql.
--   psql "$DATABASE_URL" -v tekiyo="'2026-07-01'" -f docs/review/zougen-028-029/verify-zougen-report.sql
--   (đổi -v tekiyo thành '2026-08-01' để thấy hành vi cộng dồn của <=)
-- ============================================================================

\if :{?tekiyo}
\else
  \set tekiyo '\'2026-07-01\''
\endif

-- Bộ lọc checkbox của màn 028 — danh sách mã, phẩy ngăn cách; CHUỖI RỖNG = lấy tất cả.
-- Truyền GIÁ TRỊ THÔ không bọc nháy (vì SQL dùng :'var' đã tự bọc nháy):
--   -v hanbaiten_codes="HB001,HB002"  -v kanri_shiten_codes=""
--   -v hanbaiten_codes=""             -v kanri_shiten_codes="113-9001-001"
-- LUÔN truyền cả 2 (để "" = không lọc); nếu quên truyền psql báo biến chưa khai báo.
\echo '================ 適用日 đang kiểm chứng (:tekiyo) — lọc <= ================'
\echo :tekiyo

-- ───────────────────────────────────────────────────────────────────────────
-- A. MA TRẬN PHỦ — mọi history row của JAZG9001, kèm 2 cờ ĐẾN HẠN (khớp B/C):
--    transfer_due = ① ② (đổi cửa hàng) đến hạn theo hanb (— nếu không đổi CH).
--    info_due     = ③ (đổi phần/địa chỉ) đến hạn theo joho.
--    Một dòng vào report nếu transfer_due=YES HOẶC info_due=YES.
-- ───────────────────────────────────────────────────────────────────────────
\echo ''
\echo '================ A. MA TRẬN PHỦ (toàn bộ history của JA test) ================'
SELECT
  r.kumiaiin_code                                   AS case,
  r.rireki_no                                       AS rno,
  h.hanbaiten_code                                  AS hb,
  k.kanri_shiten_code                               AS ks,
  r.zenkai_dokusya_busu                             AS zenkai,
  r.dokusya_busu                                    AS busu,
  to_char(r.joho_henko_tekiyo_date,'YYYY-MM-DD')    AS joho_date,
  to_char(r.hanbaiten_tekiyo_date,'YYYY-MM-DD')     AS hanb_date,
  r.zougen_hokoku_flg                               AS flag,
  h.haiten_flg                                      AS haiten,
  -- ① ② (đổi cửa hàng) ĐẾN HẠN? gate theo hanb (CHỈ dòng có đổi cửa hàng).
  CASE
    WHEN r.zougen_hokoku_flg = true AND h.haiten_flg = false
     AND r.zenkai_hanbaiten_id IS NOT NULL
     AND r.hanbaiten_tekiyo_date <= :tekiyo::date              THEN 'YES'
    WHEN r.zenkai_hanbaiten_id IS NULL                          THEN '—'   -- không đổi CH
    ELSE 'no'
  END                                               AS transfer_due,
  -- ③ (đổi phần/địa chỉ) ĐẾN HẠN? gate theo joho.
  CASE
    WHEN r.zougen_hokoku_flg = true AND h.haiten_flg = false
     AND r.joho_henko_tekiyo_date <= :tekiyo::date              THEN 'YES'
    ELSE 'no'
  END                                               AS info_due,
  CASE
    WHEN r.zougen_hokoku_flg = false                            THEN 'flag=false → loại'
    WHEN h.haiten_flg = true                                    THEN '廃店(haiten) → loại'
    WHEN r.joho_henko_tekiyo_date IS NULL                       THEN 'joho=NULL'
    WHEN r.joho_henko_tekiyo_date >  :tekiyo::date
     AND (r.zenkai_hanbaiten_id IS NULL
          OR r.hanbaiten_tekiyo_date > :tekiyo::date)           THEN 'cả 2 mốc > X (chưa tới)'
    WHEN COALESCE(r.zenkai_dokusya_busu,0)=0 AND r.dokusya_busu=0 THEN '028:hiện / 029:loại(0→0)'
    ELSE 'OK'
  END                                               AS note
FROM t_dokusya_rireki r
JOIN m_ja j          ON j.ja_id = r.ja_id AND j.ja_code = 'JAZG9001'
JOIN m_hanbaiten h   ON h.hanbaiten_id = r.hanbaiten_id
LEFT JOIN m_kanri_shiten k ON k.kanri_shiten_id = r.kanri_shiten_id
ORDER BY r.kumiaiin_code, r.rireki_no;

-- ───────────────────────────────────────────────────────────────────────────
-- B. SCR-028 — query per-store theo MÔ HÌNH 3 HIỆU ỨNG.
--
--    Báo cáo 増減連絡票 là THEO TỪNG CỬA HÀNG. Vấn đề: 1 dòng history có thể
--    gói 2 thay đổi với 2 MỐC NGÀY KHÁC NHAU:
--        • Đổi cửa hàng         → hiệu lực theo hanbaiten_tekiyo_date (hanb)
--        • Đổi số phần / địa chỉ → hiệu lực theo joho_henko_tekiyo_date (joho)
--    Khi hanb ≠ joho và ngày báo cáo X nằm GIỮA, 2 thay đổi không cùng hiệu
--    lực → không thể gán cả dòng vào 1 cửa hàng với 1 con số.
--
--    GIẢI PHÁP — chẻ mỗi dòng thành tối đa 3 hiệu ứng nguyên tử, mỗi cái có
--    NGÀY HIỆU LỰC + CỬA HÀNG riêng:
--      ① Rời CH cũ      : −move_busu @ CH cũ    | gate hanb ≤ X   (chỉ đổi-CH)
--      ② Đến CH mới     : +move_busu @ CH mới   | gate hanb ≤ X   (chỉ đổi-CH)
--      ③ Đổi phần/địa chỉ: busu_old→busu_new     | gate joho ≤ X   (mọi dòng)
--
--    move_busu = số phần MANG THEO khi chuyển, phụ thuộc thứ tự ngày:
--      • joho < hanb (đổi phần TRƯỚC khi chuyển): lúc chuyển CH cũ đã là phần
--        mới → move_busu = busu_new; ③ ghi tại CH CŨ (vì lúc joho chưa chuyển).
--      • joho ≥ hanb (chuyển TRƯỚC/đồng thời): mang phần cũ → move_busu =
--        busu_old; ③ ghi tại CH MỚI (lúc joho đã chuyển xong).
--      → change_at_old := (joho < hanb).
--
--    Gate ① ② theo hanb, ③ theo joho ⇒ tự động đúng MỌI thứ tự ngày:
--      - hanb=joho (cùng ngày)   : ②+③ tại CH mới = +busu_new (như cũ).
--      - hanb<X<joho             : chỉ ①②  → CH cũ −busu_old, CH mới +busu_old
--                                  (phần tăng/giảm CHỜ tới joho).  ← case 105.
--      - joho<X<hanb             : chỉ ③ tại CH CŨ (chưa chuyển). ← case 113/114.
--      - X≥cả hai                : đủ ①②③, cộng dồn ra trạng thái cuối.
--
--    ⚠️ Đây là logic ĐÚNG cần có; code report HIỆN TẠI sai: (1) lọc đổi-CH theo
--       joho thay vì hanb; (2) mapper chỉ +ở CH mới, không −ở CH cũ; (3) gộp
--       cả phần thay đổi vào lúc chuyển (dùng busu_new) thay vì chẻ theo ngày;
--       (4) 住所変更 dùng haitatsu_* vô điều kiện. Không dedup — xem Phần D.
-- ───────────────────────────────────────────────────────────────────────────
\echo ''
\echo '================ B. SCR-028 per-store — MÔ HÌNH 3 HIỆU ỨNG (①OUT ②IN ③数量/住所) ======='
WITH
-- ╔═══ THAM SỐ ĐẦU VÀO — gom 1 chỗ, parse 1 lần ═══╗
--   as_of  : ngày báo cáo X (適用日)
--   hb_csv : checkbox 販売店  (CSV) — NULL = không lọc
--   ks_csv : checkbox 管理支店 (CSV) — NULL = không lọc
--   NULLIF(replace(...,' ',''),'') : bỏ khoảng trắng, chuỗi rỗng → NULL.
params AS (
  SELECT
    :tekiyo::date                                       AS as_of,
    NULLIF(replace(:'hanbaiten_codes',   ' ', ''), '')  AS hb_csv,
    NULLIF(replace(:'kanri_shiten_codes',' ', ''), '')  AS ks_csv
),
-- ╔═══ NGUỒN — history hợp lệ trong JA + lọc 管理支店 ═══╗
src AS (
  SELECT r.*,
         h.hanbaiten_code  AS new_code,    -- cửa hàng hiện tại / mới
         zh.hanbaiten_code AS old_code,    -- cửa hàng cũ (nếu đổi CH)
         k.kanri_shiten_code,
         p.as_of
  FROM t_dokusya_rireki r
  CROSS JOIN params p
  JOIN m_ja           j ON j.ja_id = r.ja_id AND j.ja_code = 'JAZG9001'  -- DataScope CHUOKAI (ja_id)
  JOIN m_hanbaiten    h ON h.hanbaiten_id = r.hanbaiten_id
                       AND h.deleted_at IS NULL AND h.haiten_flg = false -- CH hiện tại còn hoạt động
  JOIN m_kanri_shiten k ON k.kanri_shiten_id = r.kanri_shiten_id
                       AND k.deleted_at IS NULL
  LEFT JOIN m_hanbaiten zh ON zh.hanbaiten_id = r.zenkai_hanbaiten_id
                          AND zh.deleted_at IS NULL
  WHERE r.zougen_hokoku_flg = true
    AND (p.ks_csv IS NULL OR k.kanri_shiten_code = ANY(string_to_array(p.ks_csv, ',')))
),
-- ╔═══ DẪN XUẤT — tính sẵn MỌI biến quyết định cho 3 hiệu ứng ═══╗
calc AS (
  SELECT s.*,
    (s.zenkai_hanbaiten_id IS NOT NULL)                           AS is_transfer,
    COALESCE(s.zenkai_dokusya_busu, 0)                            AS busu_old,
    s.dokusya_busu                                                AS busu_new,
    -- đổi phần/địa chỉ hiệu lực TRƯỚC khi chuyển CH (joho < hanb)?
    (s.zenkai_hanbaiten_id     IS NOT NULL
     AND s.joho_henko_tekiyo_date IS NOT NULL
     AND s.hanbaiten_tekiyo_date  IS NOT NULL
     AND s.joho_henko_tekiyo_date < s.hanbaiten_tekiyo_date)      AS change_at_old,
    -- cờ ĐẾN HẠN theo từng mốc ngày
    (s.zenkai_hanbaiten_id IS NOT NULL
     AND s.hanbaiten_tekiyo_date <= s.as_of)                      AS transfer_due,  -- ① ②
    (s.joho_henko_tekiyo_date <= s.as_of)                         AS info_due,      -- ③
    -- 住所変更 (gắn vào ③): so zenkai_* với ĐỊA CHỈ GIAO HIỆU LỰC tùy
    -- haitatsu_same_flg (true→địa chỉ độc giả; false→haitatsu_*) + guard
    -- zenkai_shikuchoson NOT NULL để 新規 không bị tính nhầm.
    (s.zenkai_shikuchoson IS NOT NULL
     AND (   COALESCE(s.zenkai_todofuken_code,'') <> COALESCE(CASE WHEN s.haitatsu_same_flg THEN s.todofuken_code ELSE s.haitatsu_todofuken_code END,'')
          OR COALESCE(s.zenkai_shikuchoson,'')    <> COALESCE(CASE WHEN s.haitatsu_same_flg THEN s.shikuchoson    ELSE s.haitatsu_shikuchoson    END,'')
          OR COALESCE(s.zenkai_chome_banchi,'')   <> COALESCE(CASE WHEN s.haitatsu_same_flg THEN s.chome_banchi   ELSE s.haitatsu_chome_banchi   END,'')
          OR COALESCE(s.zenkai_tatemono_mei,'')   <> COALESCE(CASE WHEN s.haitatsu_same_flg THEN s.tatemono_mei   ELSE s.haitatsu_tatemono_mei   END,''))
    )                                                             AS jusho_henko
  FROM src s
),
-- Suy ra số phần mang theo khi chuyển + cửa hàng/nhãn cho ③ (tính 1 lần).
deriv AS (
  SELECT c.*,
    CASE WHEN change_at_old THEN busu_new ELSE busu_old END       AS move_busu,   -- ① ②
    CASE WHEN change_at_old THEN old_code ELSE new_code END       AS info_store,  -- ③ ở đâu
    CASE WHEN NOT is_transfer THEN '数量/住所(同一CH)'        -- Số phần/Địa chỉ (cùng cửa hàng)
         WHEN change_at_old   THEN '③数量/住所(店変前·旧CH)'  -- ③ Số phần/Địa chỉ (trước khi đổi CH · ở CH CŨ)
         ELSE                      '③数量/住所(店変後·新CH)'  -- ③ Số phần/Địa chỉ (sau khi đổi CH · ở CH MỚI)
    END                                                          AS info_kind
  FROM calc c
),
-- ╔═══ 3 HIỆU ỨNG — mỗi dòng history nở ra tối đa 3 sự kiện per-store ═══╗
effects AS (
  -- ① Rời CH cũ  (chỉ đổi-CH, đến hạn theo hanb)
  SELECT old_code AS hanbaiten_code, kanri_shiten_code, kumiaiin_code AS kumiaiin, rireki_no,
         '①店変OUT(旧)' AS kind,  -- ① Rời cửa hàng CŨ (店変=đổi cửa hàng, OUT=ra, 旧=cũ)
         move_busu AS frm, 0 AS to_, false AS jusho_henko
  FROM deriv WHERE transfer_due
  UNION ALL
  -- ② Đến CH mới (chỉ đổi-CH, đến hạn theo hanb)
  SELECT new_code, kanri_shiten_code, kumiaiin_code, rireki_no,
         '②店変IN(新)',  -- ② Đến cửa hàng MỚI (IN=vào, 新=mới)
         0, move_busu, false
  FROM deriv WHERE transfer_due
  UNION ALL
  -- ③ Đổi phần/địa chỉ (mọi dòng, đến hạn theo joho)
  SELECT info_store, kanri_shiten_code, kumiaiin_code, rireki_no,
         info_kind, busu_old, busu_new, jusho_henko
  FROM deriv WHERE info_due
)
-- ╔═══ KẾT QUẢ — lọc 販売店 trên cửa hàng XUẤT của từng hiệu ứng ═══╗
-- (lọc ở ĐÂY, không ở src: ①OUT thuộc CH cũ, ②IN thuộc CH mới — phải lọc
--  theo cửa hàng mà từng dòng kết quả thực sự thuộc về.)
SELECT
  eff.hanbaiten_code,
  eff.kanri_shiten_code,
  eff.kumiaiin,
  eff.rireki_no AS rno,
  eff.kind,
  eff.frm || ' → ' || eff.to_                                     AS busu_change,
  CASE WHEN eff.to_ > eff.frm THEN '増部'   -- Tăng phần
       WHEN eff.to_ < eff.frm THEN '減部'   -- Giảm phần
       ELSE '−' END                                              AS zou_gen,  -- '−' = Không đổi
  eff.jusho_henko
FROM effects eff
CROSS JOIN params p
WHERE (p.hb_csv IS NULL OR eff.hanbaiten_code = ANY(string_to_array(p.hb_csv, ',')))
ORDER BY eff.hanbaiten_code, eff.kanri_shiten_code, eff.kumiaiin, rno, eff.kind;

-- ───────────────────────────────────────────────────────────────────────────
-- C. SCR-029 — TỔNG HỢP per-store, ÁP MÔ HÌNH 3 HIỆU ỨNG (giống 028).
--
--    Khác 028: 029 KHÔNG liệt kê từng độc giả mà GROUP BY 販売店 → mỗi cửa
--    hàng 1 dòng với các con số TỔNG (screen-design §2.2/§2.3):
--        現在部数 / 増部数 / 減部数 / 新部数
--    Group ngoài theo 管理支店 (mỗi 管理支店 = 1 tờ báo).
--    Input: CHỈ tekiyo + kanri_shiten_codes (KHÔNG có lọc 販売店).
--
--    Vẫn dùng 3 hiệu ứng (①OUT/②IN/③) để chuyển cửa hàng tính ĐÚNG: rời
--    CH cũ → cộng vào 減部数 của CH cũ; đến CH mới → cộng vào 増部数 của CH mới.
--    Map cột:  現在部数=SUM(frm)  増部数=SUM(max(to-frm,0))
--              減部数=SUM(min(to-frm,0))(âm, FE hiện ▲)  新部数=SUM(to)
--    Loại dòng store có 現在部数=0 AND 新部数=0 (spec §2.2). Cửa hàng 廃店/dummy
--    bị loại qua haiten_flg=false ở src.
-- ───────────────────────────────────────────────────────────────────────────
\echo ''
\echo '================ C. SCR-029 — TỔNG HỢP per-store (3 hiệu ứng) ================'
WITH
params AS (
  SELECT
    :tekiyo::date                                       AS as_of,
    NULLIF(replace(:'kanri_shiten_codes',' ', ''), '')  AS ks_csv  -- 029 không lọc 販売店
),
src AS (
  SELECT r.*,
         h.hanbaiten_code  AS new_code,
         zh.hanbaiten_code AS old_code,
         k.kanri_shiten_code,
         p.as_of
  FROM t_dokusya_rireki r
  CROSS JOIN params p
  JOIN m_ja           j ON j.ja_id = r.ja_id AND j.ja_code = 'JAZG9001'  -- DataScope CHUOKAI
  JOIN m_hanbaiten    h ON h.hanbaiten_id = r.hanbaiten_id
                       AND h.deleted_at IS NULL AND h.haiten_flg = false
  JOIN m_kanri_shiten k ON k.kanri_shiten_id = r.kanri_shiten_id
                       AND k.deleted_at IS NULL
  LEFT JOIN m_hanbaiten zh ON zh.hanbaiten_id = r.zenkai_hanbaiten_id
                          AND zh.deleted_at IS NULL
  WHERE r.zougen_hokoku_flg = true
    AND (p.ks_csv IS NULL OR k.kanri_shiten_code = ANY(string_to_array(p.ks_csv, ',')))
),
calc AS (
  SELECT s.*,
    (s.zenkai_hanbaiten_id IS NOT NULL)                           AS is_transfer,
    COALESCE(s.zenkai_dokusya_busu, 0)                            AS busu_old,
    s.dokusya_busu                                                AS busu_new,
    (s.zenkai_hanbaiten_id     IS NOT NULL
     AND s.joho_henko_tekiyo_date IS NOT NULL
     AND s.hanbaiten_tekiyo_date  IS NOT NULL
     AND s.joho_henko_tekiyo_date < s.hanbaiten_tekiyo_date)      AS change_at_old,
    (s.zenkai_hanbaiten_id IS NOT NULL
     AND s.hanbaiten_tekiyo_date <= s.as_of)                      AS transfer_due,
    (s.joho_henko_tekiyo_date <= s.as_of)                         AS info_due
  FROM src s
),
deriv AS (
  SELECT c.*,
    CASE WHEN change_at_old THEN busu_new ELSE busu_old END       AS move_busu,
    CASE WHEN change_at_old THEN old_code ELSE new_code END       AS info_store
  FROM calc c
),
-- 3 hiệu ứng per-store, kèm rireki_no + seq (thứ tự thời gian trong cùng rireki):
--   ③ trước move (change_at_old)=0 | ①=1 | ②=2 | ③ sau move / không-đổi-CH=3
effects AS (
  SELECT old_code AS hanbaiten_code, kanri_shiten_code, kumiaiin_code AS kumiaiin,
         rireki_no, 1 AS seq, move_busu AS frm, 0 AS to_                     -- ① rời CH cũ
  FROM deriv WHERE transfer_due
  UNION ALL
  SELECT new_code, kanri_shiten_code, kumiaiin_code,
         rireki_no, 2, 0, move_busu                                          -- ② đến CH mới
  FROM deriv WHERE transfer_due
  UNION ALL
  SELECT info_store, kanri_shiten_code, kumiaiin_code,
         rireki_no, CASE WHEN change_at_old THEN 0 ELSE 3 END, busu_old, busu_new  -- ③
  FROM deriv WHERE info_due
),
-- ⚠️ GỘP NET mỗi (độc giả, cửa hàng) TRƯỚC khi SUM — nếu SUM thẳng effects thì
--    độc giả sửa nhiều lần bị telescoping (0→2→5 cộng ra 2→7 thay vì 0→5),
--    làm 現在部数/新部数 phồng. NET = frm sớm nhất → to muộn nhất theo (rireki,seq).
netted AS (
  SELECT DISTINCT hanbaiten_code, kanri_shiten_code, kumiaiin,
    first_value(frm) OVER w AS net_frm,
    last_value(to_)  OVER w AS net_to
  FROM effects
  WINDOW w AS (
    PARTITION BY hanbaiten_code, kanri_shiten_code, kumiaiin
    ORDER BY rireki_no, seq
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  )
),
-- GỘP theo (管理支店, 販売店) trên giá trị NET đã khử telescoping.
agg AS (
  SELECT
    kanri_shiten_code,
    hanbaiten_code,
    SUM(net_frm)                          AS genzai_busu,             -- 現在部数
    SUM(GREATEST(net_to - net_frm, 0))    AS zou_busu,                -- 増部数
    SUM(LEAST(net_to - net_frm, 0))       AS gen_busu,                -- 減部数 (âm)
    SUM(net_to)                           AS shin_busu                -- 新部数
  FROM netted
  GROUP BY kanri_shiten_code, hanbaiten_code
)
SELECT
  a.kanri_shiten_code,
  CASE WHEN h.itaku_kubun = 2 THEN '委託' ELSE '' END        AS itaku,
  CASE WHEN COALESCE(h.torihikisaki_no,'') = '' THEN '（免）' ELSE '' END
    || h.hanbaiten_name                                      AS hanbaiten,
  a.hanbaiten_code,
  a.genzai_busu,
  a.zou_busu,
  a.gen_busu,                                                          -- âm; FE hiển thị ▲n
  a.shin_busu
FROM agg a
JOIN m_hanbaiten h  ON h.hanbaiten_code = a.hanbaiten_code AND h.deleted_at IS NULL
JOIN m_ja        jx ON jx.ja_id = h.ja_id AND jx.ja_code = 'JAZG9001'
WHERE NOT (a.genzai_busu = 0 AND a.shin_busu = 0)                      -- spec §2.2
ORDER BY a.kanri_shiten_code ASC, a.hanbaiten_code ASC;

-- ───────────────────────────────────────────────────────────────────────────
-- D. SCR-028 — BIẾN THỂ GỘP NET theo (độc giả, cửa hàng).  [chống đếm trùng]
--
--    Part B liệt kê TỪNG sự kiện: 1 độc giả sửa nhiều lần (joho<=X) ra nhiều
--    dòng. Part D GỘP các sự kiện của cùng (độc giả, cửa hàng) thành 1 dòng NET.
--
--    ⚠️ KHÔNG cộng dồn frm/to (telescoping sai: 0→2 rồi 2→5 mà cộng = 2→7).
--    NET đúng = frm của sự kiện SỚM NHẤT  →  to của sự kiện MUỘN NHẤT, theo
--    thứ tự thời gian (rireki_no, rồi seq trong cùng rireki). seq phản ánh
--    đúng trình tự: nếu đổi phần TRƯỚC khi chuyển CH (change_at_old) thì ③
--    đứng trước ①②; ngược lại ③ đứng sau.
--
--    So số dòng D (gộp) vs B (từng sự kiện) = mức đếm trùng. Đây cũng chính là
--    bước net-per-độc-giả mà 029 PHẢI làm TRƯỚC khi SUM lên per-cửa-hàng (nếu
--    không 現在部数/新部数 của 029 sẽ bị telescoping cho độc giả sửa nhiều lần).
-- ───────────────────────────────────────────────────────────────────────────
\echo ''
\echo '================ D. SCR-028 — GỘP NET theo (độc giả, cửa hàng) =========='
WITH
params AS (
  SELECT
    :tekiyo::date                                       AS as_of,
    NULLIF(replace(:'hanbaiten_codes',   ' ', ''), '')  AS hb_csv,
    NULLIF(replace(:'kanri_shiten_codes',' ', ''), '')  AS ks_csv
),
src AS (
  SELECT r.*, h.hanbaiten_code AS new_code, zh.hanbaiten_code AS old_code,
         k.kanri_shiten_code, p.as_of
  FROM t_dokusya_rireki r
  CROSS JOIN params p
  JOIN m_ja           j ON j.ja_id = r.ja_id AND j.ja_code = 'JAZG9001'
  JOIN m_hanbaiten    h ON h.hanbaiten_id = r.hanbaiten_id
                       AND h.deleted_at IS NULL AND h.haiten_flg = false
  JOIN m_kanri_shiten k ON k.kanri_shiten_id = r.kanri_shiten_id
                       AND k.deleted_at IS NULL
  LEFT JOIN m_hanbaiten zh ON zh.hanbaiten_id = r.zenkai_hanbaiten_id
                          AND zh.deleted_at IS NULL
  WHERE r.zougen_hokoku_flg = true
    AND (p.ks_csv IS NULL OR k.kanri_shiten_code = ANY(string_to_array(p.ks_csv, ',')))
),
calc AS (
  SELECT s.*,
    COALESCE(s.zenkai_dokusya_busu, 0)                            AS busu_old,
    s.dokusya_busu                                                AS busu_new,
    (s.zenkai_hanbaiten_id     IS NOT NULL
     AND s.joho_henko_tekiyo_date IS NOT NULL
     AND s.hanbaiten_tekiyo_date  IS NOT NULL
     AND s.joho_henko_tekiyo_date < s.hanbaiten_tekiyo_date)      AS change_at_old,
    (s.zenkai_hanbaiten_id IS NOT NULL
     AND s.hanbaiten_tekiyo_date <= s.as_of)                      AS transfer_due,
    (s.joho_henko_tekiyo_date <= s.as_of)                         AS info_due
  FROM src s
),
deriv AS (
  SELECT c.*,
    CASE WHEN change_at_old THEN busu_new ELSE busu_old END       AS move_busu,
    CASE WHEN change_at_old THEN old_code ELSE new_code END       AS info_store
  FROM calc c
),
-- 3 hiệu ứng, kèm rireki_no + seq (thứ tự thời gian trong cùng rireki):
--   ③ trước move (change_at_old) = 0 | ①=1 | ②=2 | ③ sau move / không-đổi-CH = 3
effects AS (
  SELECT old_code AS hanbaiten_code, kanri_shiten_code, kumiaiin_code AS kumiaiin,
         rireki_no, 1 AS seq, move_busu AS frm, 0 AS to_
  FROM deriv WHERE transfer_due
  UNION ALL
  SELECT new_code, kanri_shiten_code, kumiaiin_code,
         rireki_no, 2, 0, move_busu
  FROM deriv WHERE transfer_due
  UNION ALL
  SELECT info_store, kanri_shiten_code, kumiaiin_code,
         rireki_no, CASE WHEN change_at_old THEN 0 ELSE 3 END, busu_old, busu_new
  FROM deriv WHERE info_due
),
-- GỘP NET: frm sự kiện sớm nhất → to sự kiện muộn nhất (KHÔNG cộng dồn).
netted AS (
  SELECT DISTINCT hanbaiten_code, kanri_shiten_code, kumiaiin,
    first_value(frm) OVER w AS net_frm,
    last_value(to_)  OVER w AS net_to
  FROM effects
  WINDOW w AS (
    PARTITION BY hanbaiten_code, kanri_shiten_code, kumiaiin
    ORDER BY rireki_no, seq
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  )
)
SELECT
  n.hanbaiten_code,
  n.kanri_shiten_code,
  n.kumiaiin,
  n.net_frm || ' → ' || n.net_to                                 AS busu_change_net,
  CASE WHEN n.net_to > n.net_frm THEN '増部'
       WHEN n.net_to < n.net_frm THEN '減部'
       ELSE '−' END                                              AS zou_gen
FROM netted n
CROSS JOIN params p
WHERE (p.hb_csv IS NULL OR n.hanbaiten_code = ANY(string_to_array(p.hb_csv, ',')))
ORDER BY n.hanbaiten_code, n.kanri_shiten_code, n.kumiaiin;

-- ============================================================================
-- GHI CHÚ — việc cần làm để khớp spec mới (ngoài file verify này):
--   1. report.service.ts:1034 (fetchZougenRows / SCR-028)  : = → <=
--   2. report.service.ts:1126 (fetchZougenNichinoRows / 029): = → <=
--   3. PER-STORE cho đổi cửa hàng (lỗi quan trọng nhất, xem Phần B):
--        - Đổi cửa hàng phải sinh 2 dòng: cửa hàng CŨ 減部 / cửa hàng MỚI 増部.
--          Hiện zougen.mapper.ts chỉ gán vào hanbaiten_id (cửa hàng mới),
--          KHÔNG trừ ở zenkai_hanbaiten_id → tổng phần toàn JA bị phồng.
--        - Mốc hiệu lực đổi cửa hàng = hanbaiten_tekiyo_date (KHÔNG phải
--          joho_henko_tekiyo_date). Query phải gate phần đổi cửa hàng theo
--          hanb_tekiyo <= :tekiyo: lần đổi tương lai (hanb>:tekiyo) KHÔNG tính
--          dù joho<=:tekiyo; lần đổi đã hiệu lực mà joho>:tekiyo VẪN phải tính.
--          → cần điều kiện lọc tách biệt cho 2 loại thay đổi, không thể chỉ
--            đổi 1 toán tử = → <=.
--   4. Quyết định CÓ/KHÔNG dedup MAX(rireki_no):
--        - Nếu CÓ  → thêm điều kiện rireki_no = (SELECT MAX...) như Phần D
--                    (an toàn đếm trùng; giống 名簿). Khuyến nghị mặc định.
--                    LƯU Ý: dedup theo dokusya XUNG ĐỘT với per-store split —
--                    1 lần đổi cửa hàng cần 2 dòng (2 cửa hàng) nên không thể
--                    "1 dokusya = 1 dòng" thuần; dedup phải theo (dokusya, cửa
--                    hàng-vai trò) hoặc theo sự kiện. Cân nhắc khi implement.
--        - Nếu KHÔNG→ chấp nhận mỗi lần đổi là 1 sự kiện 増減 độc lập (Phần B/C),
--                    nhưng khi đó cần cơ chế khác chống báo cáo lặp (cờ đã báo
--                    cáo / khoảng ngày from-to), nếu không mỗi lần chạy báo cáo
--                    sẽ lặp lại toàn bộ thay đổi quá khứ.
--   5. 住所変更: so zenkai_* với địa chỉ giao hiệu lực theo haitatsu_same_flg
--      (true→địa chỉ độc giả; false→haitatsu_*) + guard zenkai NOT NULL để
--      新規 không bị xếp nhầm. zougen.mapper.ts hiện dùng haitatsu_* vô điều kiện.
--   6. Cập nhật api.md (§4.4/§4.5) + screen-design 028/029 + testcase cho khớp.
--   7. Sửa unit test report.service.spec để phản ánh <= + per-store split.
-- ============================================================================
