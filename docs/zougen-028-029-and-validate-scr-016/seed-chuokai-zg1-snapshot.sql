-- ============================================================================
-- seed-chuokai-zg1-snapshot.sql   (AUTO-GENERATED from seed-chuokai-zg-snapshot.sql)
--   Coexisting copy: login_id=chuokai_zg1, ja_code=JAZG9002.
--   All PKs are sequence-allocated; every FK is rewired via mapping tables, so
--   this loads alongside existing data WITHOUT touching chuokai_zg / JAZG9001.
--   IDEMPOTENT: deletes the chuokai_zg1 / JAZG9002 graph first, then re-inserts.
--
--   Run:
--     psql -h <host> -p 5432 -U <user> -d <db> -v ON_ERROR_STOP=1 \
--       -f docs/zougen-028-029-and-validate-scr-016/seed-chuokai-zg1-snapshot.sql
--
--   Login: chuokai_zg1 / admin@1234567   (password_hash copied from snapshot)
-- ============================================================================

BEGIN;

-- ── 1) CLEANUP chuokai_zg1 / JAZG9002 graph (idempotent, NULL-safe) ─────────
DELETE FROM t_dokusya_rireki WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM t_dokusya        WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM t_mfa_otp   WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg1');
DELETE FROM t_log       WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg1');
DELETE FROM t_login_log WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id='chuokai_zg1');
DELETE FROM m_account   WHERE login_id='chuokai_zg1';
DELETE FROM m_hanbaiten WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM m_tanka     WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM m_shiten    WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM m_kanri_shiten WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code='JAZG9002');
DELETE FROM m_ja        WHERE ja_code='JAZG9002';

-- ── 2) Staging temp tables (verbatim original VALUES, original IDs kept) ────
CREATE TEMP TABLE _stg_m_ja ON COMMIT DROP AS SELECT * FROM m_ja WHERE false;
CREATE TEMP TABLE _stg_m_tanka ON COMMIT DROP AS SELECT * FROM m_tanka WHERE false;
CREATE TEMP TABLE _stg_m_kanri_shiten ON COMMIT DROP AS SELECT * FROM m_kanri_shiten WHERE false;
CREATE TEMP TABLE _stg_m_shiten ON COMMIT DROP AS SELECT * FROM m_shiten WHERE false;
CREATE TEMP TABLE _stg_m_hanbaiten ON COMMIT DROP AS SELECT * FROM m_hanbaiten WHERE false;
CREATE TEMP TABLE _stg_m_account ON COMMIT DROP AS SELECT * FROM m_account WHERE false;
CREATE TEMP TABLE _stg_t_dokusya ON COMMIT DROP AS SELECT * FROM t_dokusya WHERE false;
CREATE TEMP TABLE _stg_t_dokusya_rireki ON COMMIT DROP AS SELECT * FROM t_dokusya_rireki WHERE false;

INSERT INTO _stg_m_ja (ja_id,ja_code,ja_name,ja_name_kana,todofuken_code,yubin_no,address,tel,fax,email,tanto_busho,tanto_name,jastem_itakusha_code,jastem_itakusha_name,jastem_ja_code,jastem_ja_name,chuokai_flg,zei_kubun,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('108', 'JAZG9001', '増減検証JA', 'ｿﾞｳｹﾞﾝｹﾝｼｮｳｼﾞｪｲｴｰ', '13', '1000001', '東京都千代田区1-1-1', '03-0000-1111', '03-0000-0002', '', '', '', '', '', '', '', 'false', '1', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('159', '108', 'T001', '1', '新聞購読料 月額', '3500', '3182', '10.00', '2026-01-10', NULL, '', 'true', 'false', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('163', '108', 'T002', '2', '配達手数料 月額', '350', '318', '10.00', '2026-01-10', NULL, '', 'true', 'false', NULL, '2026-06-26 03:32:15.684711+09', 'PATCH_2021', '2026-06-26 03:32:15.684711+09', 'PATCH_2021');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('164', '108', 'T003', '1', '新聞購読料 月額(セット)', '4200', '3819', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('165', '108', 'T004', '1', '新聞購読料 月額(統合版)', '3000', '2728', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('166', '108', 'T005', '1', '新聞購読料 月額(日曜版)', '1200', '1091', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('167', '108', 'T006', '1', '新聞購読料 月額(夕刊)', '1800', '1637', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('168', '108', 'T007', '1', '新聞購読料 月額(電子+紙)', '4800', '4365', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('169', '108', 'T008', '2', '配達手数料 月額(市内)', '400', '364', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('170', '108', 'T009', '2', '配達手数料 月額(郊外)', '600', '546', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('171', '108', 'T010', '2', '配達手数料 月額(山間部)', '1000', '909', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('172', '108', 'T011', '2', '配達手数料 月額(離島)', '1500', '1364', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('173', '108', 'T012', '2', '配達手数料 月額(早朝便)', '700', '637', '10.00', '2025-04-01', NULL, '', 'true', 'false', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_kanri_shiten (kanri_shiten_id,ja_id,kanri_shiten_code,kanri_shiten_name,kanri_shiten_name_kana,yubin_no,todofuken_code,address,tel,fax,paper_flg,denshi_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('166', '108', '113-9001-001', '増減検証管理支店A', 'ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝｴｰ', '1000001', '13', '東京都千代田区A', '03-0000-1001', '03-0000-1002', 'false', 'false', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_kanri_shiten (kanri_shiten_id,ja_id,kanri_shiten_code,kanri_shiten_name,kanri_shiten_name_kana,yubin_no,todofuken_code,address,tel,fax,paper_flg,denshi_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('167', '108', '113-9001-002', '増減検証管理支店B', 'ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝﾋﾞｰ', '1000001', '13', '東京都千代田区B', '03-0000-2001', '03-0000-2002', 'false', 'false', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_shiten (shiten_id,ja_id,shiten_code,shiten_name,shiten_name_kana,kinyu_shiten_flg,jastem_toriatsukai_tenpo_code,jastem_tenpo_name,jastem_tyokin_shubetsu,jastem_koza_no,kanri_shiten_id,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('166', '108', 'ST9001', '増減検証支店A', 'ｿﾞｳｹﾞﾝｼﾃﾝｴｰ', 'false', '', '', '', '', '166', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_shiten (shiten_id,ja_id,shiten_code,shiten_name,shiten_name_kana,kinyu_shiten_flg,jastem_toriatsukai_tenpo_code,jastem_tenpo_name,jastem_tyokin_shubetsu,jastem_koza_no,kanri_shiten_id,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('167', '108', 'ST9002', '増減検証支店B', 'ｿﾞｳｹﾞﾝｼﾃﾝﾋﾞｰ', 'false', '', '', '', '', '167', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_shiten (shiten_id,ja_id,shiten_code,shiten_name,shiten_name_kana,kinyu_shiten_flg,jastem_toriatsukai_tenpo_code,jastem_tenpo_name,jastem_tyokin_shubetsu,jastem_koza_no,kanri_shiten_id,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('171', '108', '010', 'STBank', '', 'true', '010', 'ABCE', '1', '1234456', '166', '', NULL, '2026-06-26 02:44:08.834529+09', '29', '2026-06-26 02:44:08.834529+09', '29');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('24', '108', 'HB001', '増減販売店1', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ1', '', '13', '', '', '', '', '', '2', '163', '1', NULL, NULL, '0001', 'みずほ銀行', '001', '本店', '1', '9001', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ1', 'false', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('25', '108', 'HB002', '増減販売店2', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ2', 'T1234567890123', '13', '', '', '', '', '', '1', '163', '3', NULL, NULL, '0001', 'みずほ銀行', '002', '丸の内', '1', '9002', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ2', 'false', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('26', '108', 'HB003', '増減販売店3(廃店)', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ3', '', '13', '', '', '', '', '', '2', '163', '6', NULL, NULL, '0001', 'みずほ銀行', '003', '廃店', '1', '9003', 'ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ3', 'true', '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-21 19:48:37.608732+09', 'SEED_ZG');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('36', '108', 'HB004', '追加販売店4', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ4', 'T4000000000004', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0001', 'みずほ銀行', '011', '秋葉原', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('37', '108', 'HB005', '追加販売店5', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ5', 'T4000000000005', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0005', '三菱UFJ銀行', '012', '上野', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('38', '108', 'HB006', '追加販売店6', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ6', 'T4000000000006', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0009', '三井住友銀行', '013', '浅草', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('39', '108', 'HB007', '追加販売店7', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ7', 'T4000000000007', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0001', 'みずほ銀行', '014', '錦糸町', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('40', '108', 'HB008', '追加販売店8', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ8', 'T4000000000008', '13', '', '', '', '', '', '2', '169', NULL, NULL, NULL, '0005', '三菱UFJ銀行', '015', '新宿', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('41', '108', 'HB009', '追加販売店9', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ9', 'T4000000000009', '13', '', '', '', '', '', '2', '169', NULL, NULL, NULL, '0009', '三井住友銀行', '016', '渋谷', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('42', '108', 'HB010', '追加販売店10', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ10', 'T4000000000010', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0001', 'みずほ銀行', '017', '池袋', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('43', '108', 'HB011', '追加販売店11', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ11', 'T4000000000011', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0005', '三菱UFJ銀行', '018', '品川', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('44', '108', 'HB012', '追加販売店12', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ12', 'T4000000000012', '13', '', '', '', '', '', '2', '169', NULL, NULL, NULL, '0009', '三井住友銀行', '019', '目黒', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('45', '108', 'HB013', '追加販売店13', 'ﾂｲｶﾊﾝﾊﾞｲﾃﾝ13', 'T4000000000013', '13', '', '', '', '', '', '1', '169', NULL, NULL, NULL, '0001', 'みずほ銀行', '020', '中野', NULL, '', '', 'false', '', NULL, '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10', '2026-06-30 01:12:13.069938+09', 'PATCH_ADD10');
INSERT INTO _stg_m_account (account_id,login_id,password_hash,account_name,role_id,ja_id,kanri_shiten_id,todofuken_code,paper_flg,denshi_flg,email,sub_email_1,sub_email_2,sub_email_3,password_updated_at,last_login_at,login_failure_count,mfa_enable_flg,account_lock_flg,account_lock_at,biko,deleted_at,created_at,created_by,updated_at,updated_by) VALUES ('29', 'chuokai_zg', '$2b$10$n4LPqi8Ix8.LVTNqeIZJb.aKAdY8mGfrwbiCxdQ17E7bLPY/24qaG', '増減検証中央会アカウント', '3', '108', NULL, '13', 'true', 'true', 'chuokai_zg@agrinews.jp', '', '', '', NULL, '2026-06-28 22:37:12.304+09', '0', 'false', 'false', NULL, '', NULL, '2026-06-21 19:48:37.608732+09', 'SEED_ZG', '2026-06-28 22:37:12.306065+09', 'SEED_ZG');
INSERT INTO _stg_t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) VALUES ('172', '108', '166', '166', '', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '3', '1000000', '02', 'Phường Hà Đông', 'Địa chỉ thứ 2', '', 'DC-LH-002', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '164', '0', '2', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '2', NULL, '2026-06-30 01:33:21.721161+09', '29', '2026-06-30 02:26:55.481488+09', '29', NULL, NULL);
INSERT INTO _stg_t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) VALUES ('173', '108', '166', '166', 'TC-0000002', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '5', '1000001', '02', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '25', '164', '0', '3', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '1', NULL, '2026-06-30 01:35:41.014243+09', '29', '2026-06-30 01:35:41.014243+09', '29', NULL, NULL);
INSERT INTO _stg_t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) VALUES ('174', '108', '166', '166', 'TC-0000003', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '2', '1000003', '01', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '167', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-07-03', '2026-07-03', NULL, '2026-07-03', '', '', '1', NULL, '2026-06-30 01:45:14.520668+09', '29', '2026-06-30 01:45:14.520668+09', '29', NULL, NULL);
INSERT INTO _stg_t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) VALUES ('175', '108', '166', '166', 'TC-0000004', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '1', '1000004', '02', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '167', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '1', NULL, '2026-06-30 01:48:04.762104+09', '29', '2026-06-30 01:48:04.762104+09', '29', NULL, NULL);
INSERT INTO _stg_t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) VALUES ('176', '108', '167', '167', 'TC-0000005', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '6', '1000006', '04', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'false', '1133333', '05', 'Phường Đông Anh', 'Địa chỉ haitatsu thứ 2', '', 'LH haitatsu 2', '', '今日', '今日', 'べとなむ', 'べとなむ', '24', '166', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '2', NULL, '2026-06-30 02:07:01.731606+09', '29', '2026-06-30 02:49:48.856253+09', '29', NULL, NULL);
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('397', '172', '1', '108', '166', '166', '', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '3', '1000000', '01', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ thứ 2', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '164', '0', '2', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'false', 'true', 'true', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-30 01:33:21.721161+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('398', '173', '1', '108', '166', '166', 'TC-0000002', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '5', '1000001', '02', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '25', '164', '0', '3', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'true', 'true', 'true', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-30 01:35:41.014243+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('399', '174', '1', '108', '166', '166', 'TC-0000003', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '2', '1000003', '01', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '167', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-07-03', '2026-07-03', NULL, '2026-07-03', '', '', '', 'true', 'true', 'true', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-30 01:45:14.520668+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('400', '175', '1', '108', '166', '166', 'TC-0000004', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '1', '1000004', '02', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '167', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'true', 'true', 'true', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-30 01:48:04.762104+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('401', '176', '1', '108', '167', '167', 'TC-0000005', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '6', '1000006', '04', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'false', '1133333', '03', 'Phường Từ Liêm', 'Địa chỉ haitatsu thứ 1', '', 'LH haitatsu 1', '', '今日', '今日', 'べとなむ', 'べとなむ', '24', '166', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'false', 'true', 'true', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-30 02:07:01.731606+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('402', '172', '2', '108', '166', '166', '', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '3', '1000000', '02', 'Phường Hà Đông', 'Địa chỉ thứ 2', '', 'DC-LH-002', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'true', '', '', '', '', '', '', '', '', '', '', '', '24', '164', '0', '2', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'true', 'true', 'false', 'false', NULL, NULL, '1000000', '01', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', NULL, NULL, '2026-06-30 02:26:55.481488+09', '29');
INSERT INTO _stg_t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) VALUES ('403', '176', '2', '108', '167', '167', 'TC-0000005', '1', '1', NULL, '今日', '今日', 'べとなむ', 'べとなむ', '6', '1000006', '04', 'Phường Từ Liêm', 'Địa chỉ đầu tiên', '', 'Liên hệ đây', '', 'vuanhquang0401@gmail.com', '0', NULL, NULL, 'false', '1133333', '05', 'Phường Đông Anh', 'Địa chỉ haitatsu thứ 2', '', 'LH haitatsu 2', '', '今日', '今日', 'べとなむ', 'べとなむ', '24', '166', '0', '5', NULL, '', '', NULL, '', '', '', '', '2026-06-30', '2026-06-30', NULL, '2026-06-30', '', '', '', 'true', 'true', 'false', 'false', NULL, NULL, '1133333', '03', 'Phường Từ Liêm', 'Địa chỉ haitatsu thứ 1', '', NULL, NULL, '2026-06-30 02:49:48.856253+09', '29');

-- ── 3) Mapping temp tables (old_id -> new sequence id) ─────────────────────
CREATE TEMP TABLE _map_m_hanbaiten (old_id BIGINT PRIMARY KEY, new_id BIGINT) ON COMMIT DROP;
CREATE TEMP TABLE _map_m_kanri_shiten (old_id BIGINT PRIMARY KEY, new_id BIGINT) ON COMMIT DROP;
CREATE TEMP TABLE _map_m_shiten (old_id BIGINT PRIMARY KEY, new_id BIGINT) ON COMMIT DROP;
CREATE TEMP TABLE _map_m_tanka (old_id BIGINT PRIMARY KEY, new_id BIGINT) ON COMMIT DROP;
CREATE TEMP TABLE _map_t_dokusya (old_id BIGINT PRIMARY KEY, new_id BIGINT) ON COMMIT DROP;

-- ── 4) Re-insert with fresh PKs + rewired FKs ──────────────────────────────
DO $$
DECLARE
  rec RECORD;
  v_ja_id BIGINT;
  v_account_id BIGINT;
  v_new BIGINT;
BEGIN
  -- m_ja (single row)
  SELECT * INTO rec FROM _stg_m_ja LIMIT 1;
  INSERT INTO m_ja (
      ja_code,
      ja_name,
      ja_name_kana,
      todofuken_code,
      yubin_no,
      address,
      tel,
      fax,
      email,
      tanto_busho,
      tanto_name,
      jastem_itakusha_code,
      jastem_itakusha_name,
      jastem_ja_code,
      jastem_ja_name,
      chuokai_flg,
      zei_kubun,
      biko,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      'JAZG9002',
      '増減検証JA2',
      rec.ja_name_kana,
      rec.todofuken_code,
      rec.yubin_no,
      rec.address,
      rec.tel,
      rec.fax,
      rec.email,
      rec.tanto_busho,
      rec.tanto_name,
      rec.jastem_itakusha_code,
      rec.jastem_itakusha_name,
      rec.jastem_ja_code,
      rec.jastem_ja_name,
      rec.chuokai_flg,
      rec.zei_kubun,
      rec.biko,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING ja_id INTO v_ja_id;

  -- m_tanka
  FOR rec IN SELECT * FROM _stg_m_tanka ORDER BY tanka_id LOOP
    INSERT INTO m_tanka (
      ja_id,
      tanka_code,
      tanka_type,
      tanka_name,
      kingaku_zeikomi,
      kingaku_zeinuki,
      tax_rate,
      tekiyo_start_date,
      tekiyo_end_date,
      biko,
      active_flg,
      campaign_flg,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      v_ja_id,
      rec.tanka_code,
      rec.tanka_type,
      rec.tanka_name,
      rec.kingaku_zeikomi,
      rec.kingaku_zeinuki,
      rec.tax_rate,
      rec.tekiyo_start_date,
      rec.tekiyo_end_date,
      rec.biko,
      rec.active_flg,
      rec.campaign_flg,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING tanka_id INTO v_new;
    INSERT INTO _map_m_tanka VALUES (rec.tanka_id, v_new);
  END LOOP;

  -- m_kanri_shiten
  FOR rec IN SELECT * FROM _stg_m_kanri_shiten ORDER BY kanri_shiten_id LOOP
    INSERT INTO m_kanri_shiten (
      ja_id,
      kanri_shiten_code,
      kanri_shiten_name,
      kanri_shiten_name_kana,
      yubin_no,
      todofuken_code,
      address,
      tel,
      fax,
      paper_flg,
      denshi_flg,
      biko,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      v_ja_id,
      replace(rec.kanri_shiten_code, '113-9001-', '113-9002-'),
      rec.kanri_shiten_name,
      rec.kanri_shiten_name_kana,
      rec.yubin_no,
      rec.todofuken_code,
      rec.address,
      rec.tel,
      rec.fax,
      rec.paper_flg,
      rec.denshi_flg,
      rec.biko,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING kanri_shiten_id INTO v_new;
    INSERT INTO _map_m_kanri_shiten VALUES (rec.kanri_shiten_id, v_new);
  END LOOP;

  -- m_shiten
  FOR rec IN SELECT * FROM _stg_m_shiten ORDER BY shiten_id LOOP
    INSERT INTO m_shiten (
      ja_id,
      shiten_code,
      shiten_name,
      shiten_name_kana,
      kinyu_shiten_flg,
      jastem_toriatsukai_tenpo_code,
      jastem_tenpo_name,
      jastem_tyokin_shubetsu,
      jastem_koza_no,
      kanri_shiten_id,
      biko,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      v_ja_id,
      rec.shiten_code,
      rec.shiten_name,
      rec.shiten_name_kana,
      rec.kinyu_shiten_flg,
      rec.jastem_toriatsukai_tenpo_code,
      rec.jastem_tenpo_name,
      rec.jastem_tyokin_shubetsu,
      rec.jastem_koza_no,
      (SELECT new_id FROM _map_m_kanri_shiten WHERE old_id = rec.kanri_shiten_id),
      rec.biko,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING shiten_id INTO v_new;
    INSERT INTO _map_m_shiten VALUES (rec.shiten_id, v_new);
  END LOOP;

  -- m_hanbaiten
  FOR rec IN SELECT * FROM _stg_m_hanbaiten ORDER BY hanbaiten_id LOOP
    INSERT INTO m_hanbaiten (
      ja_id,
      hanbaiten_code,
      hanbaiten_name,
      hanbaiten_name_kana,
      torihikisaki_no,
      todofuken_code,
      yubin_no,
      address,
      tel,
      fax,
      shocho_name,
      itaku_kubun,
      haitatsuryo_tanka_id,
      haitatsuryo_shiharai_cycle,
      furikomi_tesuryo_futan_kubun,
      furikomi_tesuryo,
      bank_code,
      bank_name,
      bank_branch_code,
      bank_branch_name,
      yokin_shubetsu,
      koza_no,
      koza_meigi,
      haiten_flg,
      biko,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      v_ja_id,
      rec.hanbaiten_code,
      rec.hanbaiten_name,
      rec.hanbaiten_name_kana,
      rec.torihikisaki_no,
      rec.todofuken_code,
      rec.yubin_no,
      rec.address,
      rec.tel,
      rec.fax,
      rec.shocho_name,
      rec.itaku_kubun,
      (SELECT new_id FROM _map_m_tanka WHERE old_id = rec.haitatsuryo_tanka_id),
      rec.haitatsuryo_shiharai_cycle,
      rec.furikomi_tesuryo_futan_kubun,
      rec.furikomi_tesuryo,
      rec.bank_code,
      rec.bank_name,
      rec.bank_branch_code,
      rec.bank_branch_name,
      rec.yokin_shubetsu,
      rec.koza_no,
      rec.koza_meigi,
      rec.haiten_flg,
      rec.biko,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING hanbaiten_id INTO v_new;
    INSERT INTO _map_m_hanbaiten VALUES (rec.hanbaiten_id, v_new);
  END LOOP;

  -- m_account (single row)
  SELECT * INTO rec FROM _stg_m_account LIMIT 1;
  INSERT INTO m_account (
      login_id,
      password_hash,
      account_name,
      role_id,
      ja_id,
      kanri_shiten_id,
      todofuken_code,
      paper_flg,
      denshi_flg,
      email,
      sub_email_1,
      sub_email_2,
      sub_email_3,
      password_updated_at,
      last_login_at,
      login_failure_count,
      mfa_enable_flg,
      account_lock_flg,
      account_lock_at,
      biko,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by
    ) VALUES (
      'chuokai_zg1',
      rec.password_hash,
      '増減検証中央会アカウント2',
      rec.role_id,
      v_ja_id,
      rec.kanri_shiten_id,
      rec.todofuken_code,
      rec.paper_flg,
      rec.denshi_flg,
      'chuokai_zg1@agrinews.jp',
      rec.sub_email_1,
      rec.sub_email_2,
      rec.sub_email_3,
      rec.password_updated_at,
      rec.last_login_at,
      rec.login_failure_count,
      rec.mfa_enable_flg,
      rec.account_lock_flg,
      rec.account_lock_at,
      rec.biko,
      rec.deleted_at,
      rec.created_at,
      'SEED_ZG1',
      rec.updated_at,
      'SEED_ZG1'
    )
    RETURNING account_id INTO v_account_id;

  -- t_dokusya
  FOR rec IN SELECT * FROM _stg_t_dokusya ORDER BY dokusya_id LOOP
    INSERT INTO t_dokusya (
      ja_id,
      kanri_shiten_id,
      shiten_id,
      kumiaiin_code,
      dokusya_shubetsu,
      tetsuzuki_shurui,
      denshi_dokusya_shubetsu,
      shimei_sei,
      shimei_mei,
      shimei_kana_sei,
      shimei_kana_mei,
      dokusya_busu,
      yubin_no,
      todofuken_code,
      shikuchoson,
      chome_banchi,
      tatemono_mei,
      renrakusaki_1,
      renrakusaki_2,
      email,
      mail_magazine_flg,
      birth_year,
      gender,
      haitatsu_same_flg,
      haitatsu_yubin_no,
      haitatsu_todofuken_code,
      haitatsu_shikuchoson,
      haitatsu_chome_banchi,
      haitatsu_tatemono_mei,
      haitatsu_renrakusaki_1,
      haitatsu_renrakusaki_2,
      haitatsu_shimei_sei,
      haitatsu_shimei_mei,
      haitatsu_shimei_kana_sei,
      haitatsu_shimei_kana_mei,
      hanbaiten_id,
      tanka_id,
      yubin_kubun,
      shiharai_hoho,
      dokusyaryo_shiharai_cycle,
      bank_branch_code,
      bank_branch_name,
      hikiotoshi_yokin_shubetsu,
      hikiotoshi_koza_no,
      hikiotoshi_koza_meigi,
      dokusyaso_bunrui,
      nogyosya_bunrui,
      shoki_dokusya_kaishi_date,
      dokusya_kaishi_date,
      dokusya_chushi_date,
      joho_henko_tekiyo_date,
      seikyu_kaishi_month,
      biko,
      rireki_no,
      deleted_at,
      created_at,
      created_by,
      updated_at,
      updated_by,
      denshi_shonin_status,
      denshi_kaiin_id
    ) VALUES (
      v_ja_id,
      (SELECT new_id FROM _map_m_kanri_shiten WHERE old_id = rec.kanri_shiten_id),
      (SELECT new_id FROM _map_m_shiten WHERE old_id = rec.shiten_id),
      rec.kumiaiin_code,
      rec.dokusya_shubetsu,
      rec.tetsuzuki_shurui,
      rec.denshi_dokusya_shubetsu,
      rec.shimei_sei,
      rec.shimei_mei,
      rec.shimei_kana_sei,
      rec.shimei_kana_mei,
      rec.dokusya_busu,
      rec.yubin_no,
      rec.todofuken_code,
      rec.shikuchoson,
      rec.chome_banchi,
      rec.tatemono_mei,
      rec.renrakusaki_1,
      rec.renrakusaki_2,
      rec.email,
      rec.mail_magazine_flg,
      rec.birth_year,
      rec.gender,
      rec.haitatsu_same_flg,
      rec.haitatsu_yubin_no,
      rec.haitatsu_todofuken_code,
      rec.haitatsu_shikuchoson,
      rec.haitatsu_chome_banchi,
      rec.haitatsu_tatemono_mei,
      rec.haitatsu_renrakusaki_1,
      rec.haitatsu_renrakusaki_2,
      rec.haitatsu_shimei_sei,
      rec.haitatsu_shimei_mei,
      rec.haitatsu_shimei_kana_sei,
      rec.haitatsu_shimei_kana_mei,
      (SELECT new_id FROM _map_m_hanbaiten WHERE old_id = rec.hanbaiten_id),
      (SELECT new_id FROM _map_m_tanka WHERE old_id = rec.tanka_id),
      rec.yubin_kubun,
      rec.shiharai_hoho,
      rec.dokusyaryo_shiharai_cycle,
      rec.bank_branch_code,
      rec.bank_branch_name,
      rec.hikiotoshi_yokin_shubetsu,
      rec.hikiotoshi_koza_no,
      rec.hikiotoshi_koza_meigi,
      rec.dokusyaso_bunrui,
      rec.nogyosya_bunrui,
      rec.shoki_dokusya_kaishi_date,
      rec.dokusya_kaishi_date,
      rec.dokusya_chushi_date,
      rec.joho_henko_tekiyo_date,
      rec.seikyu_kaishi_month,
      rec.biko,
      rec.rireki_no,
      rec.deleted_at,
      rec.created_at,
      v_account_id::text,
      rec.updated_at,
      v_account_id::text,
      rec.denshi_shonin_status,
      rec.denshi_kaiin_id
    )
    RETURNING dokusya_id INTO v_new;
    INSERT INTO _map_t_dokusya VALUES (rec.dokusya_id, v_new);
  END LOOP;

  -- t_dokusya_rireki
  FOR rec IN SELECT * FROM _stg_t_dokusya_rireki ORDER BY dokusya_rireki_id LOOP
    INSERT INTO t_dokusya_rireki (
      dokusya_id,
      rireki_no,
      ja_id,
      kanri_shiten_id,
      shiten_id,
      kumiaiin_code,
      dokusya_shubetsu,
      tetsuzuki_shurui,
      denshi_dokusya_shubetsu,
      shimei_sei,
      shimei_mei,
      shimei_kana_sei,
      shimei_kana_mei,
      dokusya_busu,
      yubin_no,
      todofuken_code,
      shikuchoson,
      chome_banchi,
      tatemono_mei,
      renrakusaki_1,
      renrakusaki_2,
      email,
      mail_magazine_flg,
      birth_year,
      gender,
      haitatsu_same_flg,
      haitatsu_yubin_no,
      haitatsu_todofuken_code,
      haitatsu_shikuchoson,
      haitatsu_chome_banchi,
      haitatsu_tatemono_mei,
      haitatsu_renrakusaki_1,
      haitatsu_renrakusaki_2,
      haitatsu_shimei_sei,
      haitatsu_shimei_mei,
      haitatsu_shimei_kana_sei,
      haitatsu_shimei_kana_mei,
      hanbaiten_id,
      tanka_id,
      yubin_kubun,
      shiharai_hoho,
      dokusyaryo_shiharai_cycle,
      bank_branch_code,
      bank_branch_name,
      hikiotoshi_yokin_shubetsu,
      hikiotoshi_koza_no,
      hikiotoshi_koza_meigi,
      dokusyaso_bunrui,
      nogyosya_bunrui,
      shoki_dokusya_kaishi_date,
      dokusya_kaishi_date,
      dokusya_chushi_date,
      joho_henko_tekiyo_date,
      seikyu_kaishi_month,
      biko,
      henko_riyu,
      saishin_data_flg,
      zougen_hokoku_flg,
      shinki_flg,
      kaiyaku_flg,
      zenkai_hanbaiten_id,
      zenkai_dokusya_busu,
      zenkai_yubin_no,
      zenkai_todofuken_code,
      zenkai_shikuchoson,
      zenkai_chome_banchi,
      zenkai_tatemono_mei,
      denshi_shonin_status,
      hanbaiten_tekiyo_date,
      created_at,
      created_by
    ) VALUES (
      (SELECT new_id FROM _map_t_dokusya WHERE old_id = rec.dokusya_id),
      rec.rireki_no,
      v_ja_id,
      (SELECT new_id FROM _map_m_kanri_shiten WHERE old_id = rec.kanri_shiten_id),
      (SELECT new_id FROM _map_m_shiten WHERE old_id = rec.shiten_id),
      rec.kumiaiin_code,
      rec.dokusya_shubetsu,
      rec.tetsuzuki_shurui,
      rec.denshi_dokusya_shubetsu,
      rec.shimei_sei,
      rec.shimei_mei,
      rec.shimei_kana_sei,
      rec.shimei_kana_mei,
      rec.dokusya_busu,
      rec.yubin_no,
      rec.todofuken_code,
      rec.shikuchoson,
      rec.chome_banchi,
      rec.tatemono_mei,
      rec.renrakusaki_1,
      rec.renrakusaki_2,
      rec.email,
      rec.mail_magazine_flg,
      rec.birth_year,
      rec.gender,
      rec.haitatsu_same_flg,
      rec.haitatsu_yubin_no,
      rec.haitatsu_todofuken_code,
      rec.haitatsu_shikuchoson,
      rec.haitatsu_chome_banchi,
      rec.haitatsu_tatemono_mei,
      rec.haitatsu_renrakusaki_1,
      rec.haitatsu_renrakusaki_2,
      rec.haitatsu_shimei_sei,
      rec.haitatsu_shimei_mei,
      rec.haitatsu_shimei_kana_sei,
      rec.haitatsu_shimei_kana_mei,
      (SELECT new_id FROM _map_m_hanbaiten WHERE old_id = rec.hanbaiten_id),
      (SELECT new_id FROM _map_m_tanka WHERE old_id = rec.tanka_id),
      rec.yubin_kubun,
      rec.shiharai_hoho,
      rec.dokusyaryo_shiharai_cycle,
      rec.bank_branch_code,
      rec.bank_branch_name,
      rec.hikiotoshi_yokin_shubetsu,
      rec.hikiotoshi_koza_no,
      rec.hikiotoshi_koza_meigi,
      rec.dokusyaso_bunrui,
      rec.nogyosya_bunrui,
      rec.shoki_dokusya_kaishi_date,
      rec.dokusya_kaishi_date,
      rec.dokusya_chushi_date,
      rec.joho_henko_tekiyo_date,
      rec.seikyu_kaishi_month,
      rec.biko,
      rec.henko_riyu,
      rec.saishin_data_flg,
      rec.zougen_hokoku_flg,
      rec.shinki_flg,
      rec.kaiyaku_flg,
      (SELECT new_id FROM _map_m_hanbaiten WHERE old_id = rec.zenkai_hanbaiten_id),
      rec.zenkai_dokusya_busu,
      rec.zenkai_yubin_no,
      rec.zenkai_todofuken_code,
      rec.zenkai_shikuchoson,
      rec.zenkai_chome_banchi,
      rec.zenkai_tatemono_mei,
      rec.denshi_shonin_status,
      rec.hanbaiten_tekiyo_date,
      rec.created_at,
      v_account_id::text
    )
    ;
  END LOOP;

  RAISE NOTICE '[seed-chuokai-zg1] ja_id=% / account_id=% / dokusya=% / rireki=%',
    v_ja_id, v_account_id,
    (SELECT count(*) FROM t_dokusya WHERE ja_id=v_ja_id),
    (SELECT count(*) FROM t_dokusya_rireki WHERE ja_id=v_ja_id);
END $$;

COMMIT;
