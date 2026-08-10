-- ═══════════════════════════════════════════════════════════════════════
--  Kiểm tra dữ liệu demo — chạy trước khi demo để chắc chắn từng màn hình
--  báo cáo sẽ ra đúng số dòng ghi trong docs/demo/demo-scenario.md.
--
--  Cách chạy:
--    docker exec -i agrinews-postgres-1 psql -U postgres -d agrinews_dev \
--      < docs/demo/verify-demo-data.sql
--
--  Ngày tháng lấy động từ CURRENT_DATE (JST) nên không cần sửa file khi
--  seed lại vào ngày khác. Điều kiện WHERE của từng phần được chép đúng
--  theo query thật trong code (xem chú thích từng phần) — nếu code đổi
--  filter mà file này không đổi thì kết quả ở đây sẽ khác màn hình, đó là
--  tín hiệu phải cập nhật cả hai.
-- ═══════════════════════════════════════════════════════════════════════

\set QUIET on
\pset pager off

-- ja_id của JA demo — tra theo ja_code nên không phụ thuộc lần seed nào.
SELECT ja_id AS demo_ja FROM m_ja WHERE ja_code = '1139000000' \gset
-- Mốc ngày: đúng công thức seed-demo-scenario.ts dùng.
SELECT to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM-DD')                   AS this_month,
       to_char(date_trunc('month', CURRENT_DATE) + INTERVAL '1 month', 'YYYY-MM-DD') AS next_month,
       to_char(CURRENT_DATE, 'YYYY-MM-DD')                                        AS today \gset
\set QUIET off

\echo ''
\echo '### 0. Mốc ngày dùng cho màn hình'
SELECT :'demo_ja' AS ja_id, :'today' AS today,
       :'this_month' AS "SCR-020/021 対象年月",
       :'next_month' AS "SCR-028/029 適用日";

\echo ''
\echo '### A. Danh sách độc giả (SCR-014 購読者明細検索) — mong đợi 12 dòng'
SELECT d.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名",
       d.dokusya_shubetsu AS "種別", d.dokusya_busu AS "部数",
       d.tetsuzuki_shurui AS "手続", d.shiharai_hoho AS "支払",
       h.hanbaiten_code AS "販売店", d.dokusya_kaishi_date AS "開始日",
       d.dokusya_chushi_date AS "中止日",
       (SELECT count(*) FROM t_dokusya_rireki r WHERE r.dokusya_id = d.dokusya_id) AS "履歴数"
  FROM t_dokusya d
  LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id
 WHERE d.ja_id = :demo_ja
 ORDER BY d.dokusya_id;

\echo ''
\echo '### B. SCR-020 口座振替 — mong đợi 7 dòng (6 sau khi chạy batch apply-due)'
\echo '    filter: koza-furikae.service.ts KOZA_FURIKAE_AGG_SQL'
SELECT d.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名",
       d.dokusya_shubetsu AS "種別", t.kingaku_zeikomi AS "振替金額",
       d.bank_branch_code AS "引落支店コード", s.shiten_name AS "引落支店名"
  FROM t_dokusya d
  INNER JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
  INNER JOIN m_tanka t ON t.tanka_id = d.tanka_id
       AND t.tanka_type = 1 AND t.deleted_at IS NULL AND t.active_flg
  LEFT JOIN m_shiten s ON s.shiten_code = d.bank_branch_code AND s.ja_id = d.ja_id
       AND s.kinyu_shiten_flg AND s.deleted_at IS NULL
 WHERE d.deleted_at IS NULL
   AND d.shiharai_hoho = 1            -- 口座引落
   AND d.tetsuzuki_shurui = 1         -- 新規（＝購読中）
   AND (d.dokusya_shubetsu = 1
        OR (d.dokusya_shubetsu = 2 AND d.denshi_shonin_status = 1
            AND d.denshi_dokusya_shubetsu = 1))
   AND d.dokusya_kaishi_date <= :'this_month'
   AND (d.dokusya_chushi_date IS NULL OR d.dokusya_chushi_date > :'this_month')
   AND d.ja_id = :demo_ja
 ORDER BY d.dokusya_id;

\echo ''
\echo '### C. SCR-021 配達手数料 — mong đợi 2 販売店 (DM001 7部/3850円, DM002 2部/1100円)'
\echo '    filter: haitatsuryo.mapper.ts buildHaitatsuryoSql'
WITH latest AS (
  SELECT DISTINCT ON (d.dokusya_id)
         d.dokusya_id, d.hanbaiten_id, d.dokusya_busu
    FROM t_dokusya d
   WHERE d.deleted_at IS NULL
     AND d.tetsuzuki_shurui = 1
     AND d.dokusya_shubetsu = 1        -- 紙版のみ
     AND d.joho_henko_tekiyo_date
         <= date_trunc('month', :'this_month'::date) + INTERVAL '1 month' - INTERVAL '1 day'
     AND d.ja_id = :demo_ja
   ORDER BY d.dokusya_id, d.joho_henko_tekiyo_date DESC, d.created_at DESC
)
SELECT h.hanbaiten_code AS "販売店", h.hanbaiten_name AS "販売店名",
       SUM(l.dokusya_busu) AS "部数計",
       MAX(t.kingaku_zeikomi) AS "手数料単価",
       SUM(l.dokusya_busu * t.kingaku_zeikomi) AS "支払金額"
  FROM latest l
  INNER JOIN m_hanbaiten h ON h.hanbaiten_id = l.hanbaiten_id
       AND h.deleted_at IS NULL AND h.haiten_flg = FALSE
  INNER JOIN m_tanka t ON t.tanka_id = h.haitatsuryo_tanka_id
       AND t.tanka_type = 2 AND t.deleted_at IS NULL AND t.active_flg
 GROUP BY h.hanbaiten_code, h.hanbaiten_name
 ORDER BY 1;

\echo ''
\echo '### D. SCR-026 購読者名簿 — mong đợi 11 dòng (10 sau khi chạy batch apply-due)'
\echo '    filter: meibo-report.service.ts meiboBaseQuery'
SELECT r.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名", r.rireki_no AS "履歴No",
       r.dokusya_shubetsu AS "種別", r.dokusya_busu AS "部数", h.hanbaiten_code AS "販売店"
  FROM t_dokusya_rireki r
  JOIN t_dokusya d USING (dokusya_id)
  INNER JOIN m_hanbaiten h ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
  INNER JOIN m_ja j ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
 WHERE r.joho_henko_tekiyo_date <= :'today'
   AND NOT r.torikeshi_flg
   -- 現在行 = (joho, rireki_no) 最大
   AND (r.joho_henko_tekiyo_date, r.rireki_no) = (
         SELECT r2.joho_henko_tekiyo_date, r2.rireki_no
           FROM t_dokusya_rireki r2
          WHERE r2.dokusya_id = r.dokusya_id
            AND r2.joho_henko_tekiyo_date <= :'today'
            AND r2.torikeshi_flg = false
          ORDER BY r2.joho_henko_tekiyo_date DESC, r2.rireki_no DESC LIMIT 1)
   AND r.tetsuzuki_shurui = 1
   AND r.ja_id = :demo_ja
 ORDER BY h.hanbaiten_code, r.dokusya_id;

\echo ''
\echo '### E. SCR-028 増減連絡票（販売店）— mong đợi 4 dòng'
\echo '    filter: zougen-report.service.ts zougenBaseQuery'
SELECT r.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名",
       r.zenkai_dokusya_busu AS "前回部数", r.dokusya_busu AS "今回部数",
       zh.hanbaiten_code AS "前回販売店", h.hanbaiten_code AS "今回販売店",
       r.zenkai_shikuchoson || r.zenkai_chome_banchi AS "前回住所",
       r.shikuchoson || r.chome_banchi AS "今回住所"
  FROM t_dokusya_rireki r
  JOIN t_dokusya d USING (dokusya_id)
  INNER JOIN m_hanbaiten h ON h.hanbaiten_id = r.hanbaiten_id
       AND h.deleted_at IS NULL AND h.haiten_flg = false
  LEFT JOIN m_hanbaiten zh ON zh.hanbaiten_id = r.zenkai_hanbaiten_id
 WHERE r.joho_henko_tekiyo_date = :'next_month'
   AND r.zougen_hokoku_flg
   AND NOT r.torikeshi_flg
   AND r.dokusya_shubetsu = 1
   AND r.ja_id = :demo_ja
 ORDER BY r.dokusya_id;

\echo ''
\echo '### F. SCR-029 増減通知（日農）— mong đợi 4 dòng, net = +2 / 0 / 0 / -1'
\echo '    filter: zougen-report.service.ts nichinoBaseQuery'
SELECT r.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名",
       r.zenkai_dokusya_busu AS "前回部数", r.dokusya_busu AS "今回部数",
       (r.dokusya_busu - COALESCE(r.zenkai_dokusya_busu, 0)) AS "増減"
  FROM t_dokusya_rireki r
  JOIN t_dokusya d USING (dokusya_id)
  INNER JOIN m_hanbaiten h ON h.hanbaiten_id = r.hanbaiten_id
       AND h.deleted_at IS NULL AND h.haiten_flg = false
  INNER JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = r.kanri_shiten_id
       AND ks.deleted_at IS NULL
  INNER JOIN m_ja j ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
 WHERE r.joho_henko_tekiyo_date = :'next_month'
   AND r.zougen_hokoku_flg
   AND NOT r.torikeshi_flg
   AND NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)
   AND r.dokusya_shubetsu = 1
   AND r.ja_id = :demo_ja
 ORDER BY r.dokusya_id;

\echo ''
\echo '### G. Dòng CÓ tăng giảm nhưng BỊ LOẠI khỏi 028/029 vì 販売店 廃店'
\echo '    mong đợi 1 dòng: 廃店十郎 (1 → 5 部) ở DM003'
SELECT r.dokusya_id, d.shimei_sei || d.shimei_mei AS "氏名",
       r.zenkai_dokusya_busu AS "前回部数", r.dokusya_busu AS "今回部数",
       h.hanbaiten_code AS "販売店", h.haiten_flg AS "廃店"
  FROM t_dokusya_rireki r
  JOIN t_dokusya d USING (dokusya_id)
  JOIN m_hanbaiten h ON h.hanbaiten_id = r.hanbaiten_id
 WHERE r.joho_henko_tekiyo_date = :'next_month'
   AND r.zougen_hokoku_flg
   AND r.ja_id = :demo_ja
   AND h.haiten_flg;

\echo ''
\echo '### H. Độc giả đến từ đồng bộ điện tử bản — mong đợi 2 dòng'
SELECT d.dokusya_id, d.denshi_kaiin_id AS "電子版会員ID",
       d.shimei_sei || ' ' || d.shimei_mei AS "氏名",
       d.dokusya_shubetsu AS "種別（2=電子版 3=併読）",
       d.hanbaiten_id AS "販売店ID（ダミー固定）", d.created_by AS "作成者"
  FROM t_dokusya d
 WHERE d.ja_id = :demo_ja AND d.denshi_kaiin_id IS NOT NULL
 ORDER BY d.dokusya_id;
