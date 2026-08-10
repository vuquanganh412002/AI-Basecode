-- ═══════════════════════════════════════════════════════════════════════
--  デモ用の電子版会員 2 名（mock cmsDB 専用）。
--
--  `docs/design-vi/demo/demo-scenario.md` §0.1 手順② で流す。読者同期バッチ
--  (dokusya-sync) がこの 2 行を拾い、クラウド側に
--    同期一太 … 購読種別 2（電子版単独）
--    併読二美 … 購読種別 3（併読。画面からは作れない ＝ TC-003 の裏返し）
--  を作る。これで verify-demo-data.sql の H が 2 件になる。
--
--  実行:
--    docker exec -i agrinews-denshiban-mysql-1 \
--      mysql -uroot -prootpassword --default-character-set=utf8mb4 cmsDB \
--      < apps/docker/denshiban-mysql/demo/demo-users.sql
--
--  ⚠ `--default-character-set=utf8mb4` は必須。mysql クライアントの既定は
--    latin1 で、付け忘れると氏名が `ä¸€å¤ª…` になりクラウド側まで壊れて届く。
--
--  ⚠ **本番の cmsDB は顧客の実 DB（read-only）なので絶対に流さない。**
--    実環境ではこの 2 名は存在せず、H が 0 件になるのが正しい挙動。
--
--  ── 値の決め方 ──────────────────────────────────────────────────────
--   id            900000001-2。実データ（MAX ≒ 327,354）から充分離す。
--   JACd          113-9000-001。ハイフンを除去した 1139000001 が
--                 m_kanri_shiten.kanri_shiten_code の突合キー。ここが
--                 合わないとバッチは「スキップ」して何も作らない（TC-008）。
--   collecting    '1'。取込対象条件
--                 `collecting=1 OR (treatment=1 AND payment_id=6)` の片方。
--   Campagna_flg  '0'。キャンペーン読者は取込対象外なので必ず 0。
--   activated_at  購読開始日の第一候補（mapper の kaishiDate）。
--   first_name /  クラウドの 氏 / 名 に入る（sei ← first_name, mei ← last_name）。
--   last_name
--   paper_permission_dt
--                 **併読 (3) と 電子版 (2) を分ける唯一の列。** 日付が入って
--                 いれば併読。同期一太 は NULL のまま。
--   ShopCd        併読二美 に入れてあるが**クラウドは参照しない** — 販売店は
--                 常にダミー(9999999999)になる（顧客要件 2026-08 / TC-007）。
--                 「入っていても使われない」ことを見せるための値。
--
--  REPLACE INTO なので流し直しても重複しない。
-- ═══════════════════════════════════════════════════════════════════════

REPLACE INTO users (
  id, email, password, group_id, activated, activated_at,
  first_name, last_name, first_kana, last_kana,
  payment_id, uuid, zip1, pref_id, addr, city, tel1,
  birthyear, sex, melmaga, profession, products,
  created_at, updated_at, pref, JACd,
  treatment, collecting, application, status, member_type, approval,
  Campagna_flg, paper_permission_dt,
  paper_zip, paper_pref_id, paper_addr, paper_city, ShopCd, ShopNm
) VALUES
-- ① 同期一太 — 電子版単独。paper_permission_dt が NULL なので購読種別 2。
(
  900000001, 'demo-sync-1@demo-agrinews.example.jp', 'demo-password-hash', 1, 1, '2026-02-01 09:00:00',
  '同期', '一太', 'ﾄﾞｳｷ', 'ｲﾂﾀ',
  6, 'demo-uuid-0000000000000000000001', '1000001', 13, 'Quận Chiyoda', '1-1-11', '0312349001',
  1980, '1', 0, 0, '0',
  '2026-02-01 09:00:00', NOW(), 13, '1139000001',
  '0', '1', '1', '0', '1', '1',
  '0', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL
),
-- ② 併読二美 — paper_permission_dt に日付があるので購読種別 3（併読）。
--    紙の配達先は paper_* 側が採用される（配達先＝購読者住所ではない）。
(
  900000002, 'demo-sync-2@demo-agrinews.example.jp', 'demo-password-hash', 1, 1, '2026-02-01 09:00:00',
  '併読', '二美', 'ﾍｲﾄﾞｸ', 'ﾌﾐ',
  6, 'demo-uuid-0000000000000000000002', '1140001', 13, 'Quận Kita', '2-2-22', '0312349002',
  1985, '2', 0, 0, '0',
  '2026-02-01 09:00:00', NOW(), 13, '1139000001',
  '0', '1', '1', '0', '1', '1',
  '0', '20260201',
  '1140001', 13, 'Quận Kita', '2-2-22', 'DM001', 'Đại lý Trung tâm Demo'
);
