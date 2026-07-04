-- ============================================================================
-- seed-chuokai-zg-current.sql   (AUTO-GENERATED — KHÔNG sửa tay)
--   Sinh bởi gen-seed-chuokai-zg-current.sh từ DB 'agrinews_dev'
--   Thời điểm sinh: 2026-07-02 01:55:08 +0700
--
--   Snapshot graph chuokai_zg2 (JA 'JAZG9001') tại thời điểm hiện tại:
--   m_ja / m_tanka / m_kanri_shiten / m_shiten / m_hanbaiten /
--   t_dokusya / t_dokusya_rireki + account chuokai_zg2, kanri_zgA, kanri_zgB.
--
--   IDEMPOTENT: xóa đúng graph rồi chèn lại, giữ nguyên ID gốc. Chạy nhiều
--   lần cho cùng kết quả. Yêu cầu DB đích đã chạy migration + seed nền
--   (m_todofuken, m_roles role_id 3/5, m_code…).
--
--   Nạp: psql -U postgres -d <db> -v ON_ERROR_STOP=1 -f seed-chuokai-zg-current.sql
--   Login: chuokai_zg2 / kanri_zgA / kanri_zgB  (password_hash giữ từ snapshot)
-- ============================================================================

BEGIN;

-- ── 1) CLEANUP graph cũ (con → cha, NULL-safe, theo ja_code + login_id) ──────
DELETE FROM t_dokusya_rireki WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM t_dokusya        WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM t_mfa_otp   WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id IN ('chuokai_zg','chuokai_zg2','kanri_zgA','kanri_zgB'));
DELETE FROM t_login_log WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id IN ('chuokai_zg','chuokai_zg2','kanri_zgA','kanri_zgB'));
DELETE FROM t_log       WHERE account_id IN (SELECT account_id FROM m_account WHERE login_id IN ('chuokai_zg','chuokai_zg2','kanri_zgA','kanri_zgB')) OR ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM t_oshirase       WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM t_file_upload    WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM t_file_download  WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM m_account   WHERE login_id IN ('chuokai_zg','chuokai_zg2','kanri_zgA','kanri_zgB');
DELETE FROM m_hanbaiten WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM m_shiten    WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM m_tanka     WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM m_kanri_shiten WHERE ja_id IN (SELECT ja_id FROM m_ja WHERE ja_code IN ('JAZG9001'));
DELETE FROM m_ja        WHERE ja_code IN ('JAZG9001');

-- ── 2) DỮ LIỆU (COPY, giữ nguyên ID) ────────────────────────────────────────
-- ---- m_ja ----
COPY public.m_ja (ja_id,ja_code,ja_name,ja_name_kana,todofuken_code,yubin_no,address,tel,fax,email,tanto_busho,tanto_name,jastem_itakusha_code,jastem_itakusha_name,jastem_ja_code,jastem_ja_name,chuokai_flg,zei_kubun,biko,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
108	JAZG9001	増減検証JA	ｿﾞｳｹﾞﾝｹﾝｼｮｳｼﾞｪｲｴｰ	13	1000001	東京都千代田区1-1-1	030001300000000	0300000002				JAJT0001	JA-JASTEM-ZG-0001	0101	JA-JASTEM-ZG-00	f	1		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-07-02 01:43:47.17925+09	29
\.

-- ---- m_tanka ----
COPY public.m_tanka (tanka_id,ja_id,tanka_code,tanka_type,tanka_name,kingaku_zeikomi,kingaku_zeinuki,tax_rate,tekiyo_start_date,tekiyo_end_date,biko,active_flg,campaign_flg,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
159	108	T001	1	新聞購読料 月額	3500	3182	10.00	2026-01-10	\N		t	f	\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
163	108	T002	2	配達手数料 月額	350	318	10.00	2026-01-10	\N		t	f	\N	2026-06-26 03:32:15.684711+09	PATCH_2021	2026-06-26 03:32:15.684711+09	PATCH_2021
164	108	T003	1	新聞購読料 月額(セット)	4200	3819	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
165	108	T004	1	新聞購読料 月額(統合版)	3000	2728	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
166	108	T005	1	新聞購読料 月額(日曜版)	1200	1091	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
167	108	T006	1	新聞購読料 月額(夕刊)	1800	1637	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
168	108	T007	1	新聞購読料 月額(電子+紙)	4800	4365	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
169	108	T008	2	配達手数料 月額(市内)	400	364	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
170	108	T009	2	配達手数料 月額(郊外)	600	546	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
171	108	T010	2	配達手数料 月額(山間部)	1000	909	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
172	108	T011	2	配達手数料 月額(離島)	1500	1364	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
173	108	T012	2	配達手数料 月額(早朝便)	700	637	10.00	2025-04-01	\N		t	f	\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
\.

-- ---- m_kanri_shiten ----
COPY public.m_kanri_shiten (kanri_shiten_id,ja_id,kanri_shiten_code,kanri_shiten_name,kanri_shiten_name_kana,yubin_no,todofuken_code,address,tel,fax,paper_flg,denshi_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
166	108	113-9001-001	増減検証管理支店A	ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝｴｰ	1000001	13	東京都千代田区A	03-0000-1001	03-0000-1002	f	f		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
167	108	113-9001-002	増減検証管理支店B	ｿﾞｳｹﾞﾝｹﾝｼｮｳｶﾝﾘｼﾃﾝﾋﾞｰ	1000001	13	東京都千代田区B	03-0000-2001	03-0000-2002	f	f		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
\.

-- ---- m_shiten ----
COPY public.m_shiten (shiten_id,ja_id,shiten_code,shiten_name,shiten_name_kana,kinyu_shiten_flg,jastem_toriatsukai_tenpo_code,jastem_tenpo_name,jastem_tyokin_shubetsu,jastem_koza_no,kanri_shiten_id,biko,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
166	108	ST9001	増減検証支店A	ｿﾞｳｹﾞﾝｼﾃﾝｴｰ	f					166		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
167	108	ST9002	増減検証支店B	ｿﾞｳｹﾞﾝｼﾃﾝﾋﾞｰ	f					167		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
171	108	010	STBank		t	010	ABCE	1	1234456	166		\N	2026-06-26 02:44:08.834529+09	29	2026-06-26 02:44:08.834529+09	29
\.

-- ---- m_hanbaiten ----
COPY public.m_hanbaiten (hanbaiten_id,ja_id,hanbaiten_code,hanbaiten_name,hanbaiten_name_kana,torihikisaki_no,todofuken_code,yubin_no,address,tel,fax,shocho_name,itaku_kubun,haitatsuryo_tanka_id,haitatsuryo_shiharai_cycle,furikomi_tesuryo_futan_kubun,furikomi_tesuryo,bank_code,bank_name,bank_branch_code,bank_branch_name,yokin_shubetsu,koza_no,koza_meigi,haiten_flg,biko,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
24	108	HB001	増減販売店1	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ1		13						2	163	1	\N	\N	0001	みずほ銀行	001	本店	1	9001	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ1	f		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
25	108	HB002	増減販売店2	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ2	T1234567890123	13						1	163	3	\N	\N	0001	みずほ銀行	002	丸の内	1	9002	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ2	f		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
26	108	HB003	増減販売店3(廃店)	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ3		13						2	163	6	\N	\N	0001	みずほ銀行	003	廃店	1	9003	ｿﾞｳｹﾞﾝﾊﾝﾊﾞｲﾃﾝ3	t		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-06-21 19:48:37.608732+09	SEED_ZG
36	108	HB004	追加販売店4	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ4	T4000000000004	13						1	169	\N	\N	\N	0001	みずほ銀行	011	秋葉原	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
37	108	HB005	追加販売店5	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ5	T4000000000005	13						1	169	\N	\N	\N	0005	三菱UFJ銀行	012	上野	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
38	108	HB006	追加販売店6	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ6	T4000000000006	13						1	169	\N	\N	\N	0009	三井住友銀行	013	浅草	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
39	108	HB007	追加販売店7	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ7	T4000000000007	13						1	169	\N	\N	\N	0001	みずほ銀行	014	錦糸町	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
40	108	HB008	追加販売店8	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ8	T4000000000008	13						2	169	\N	\N	\N	0005	三菱UFJ銀行	015	新宿	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
41	108	HB009	追加販売店9	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ9	T4000000000009	13						2	169	\N	\N	\N	0009	三井住友銀行	016	渋谷	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
42	108	HB010	追加販売店10	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ10	T4000000000010	13						1	169	\N	\N	\N	0001	みずほ銀行	017	池袋	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
43	108	HB011	追加販売店11	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ11	T4000000000011	13						1	169	\N	\N	\N	0005	三菱UFJ銀行	018	品川	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
44	108	HB012	追加販売店12	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ12	T4000000000012	13						2	169	\N	\N	\N	0009	三井住友銀行	019	目黒	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
45	108	HB013	追加販売店13	ﾂｲｶﾊﾝﾊﾞｲﾃﾝ13	T4000000000013	13						1	169	\N	\N	\N	0001	みずほ銀行	020	中野	\N			f		\N	2026-06-30 01:12:13.069938+09	PATCH_ADD10	2026-06-30 01:12:13.069938+09	PATCH_ADD10
\.

-- ---- m_account ----
COPY public.m_account (account_id,login_id,password_hash,account_name,role_id,ja_id,kanri_shiten_id,todofuken_code,paper_flg,denshi_flg,email,sub_email_1,sub_email_2,sub_email_3,password_updated_at,last_login_at,login_failure_count,mfa_enable_flg,account_lock_flg,account_lock_at,biko,deleted_at,created_at,created_by,updated_at,updated_by) FROM stdin;
29	chuokai_zg2	$2b$10$n4LPqi8Ix8.LVTNqeIZJb.aKAdY8mGfrwbiCxdQ17E7bLPY/24qaG	増減検証中央会アカウント	3	108	\N	13	t	t	chuokai_zg2@agrinews.jp				\N	2026-07-02 02:52:08.332+09	0	f	f	\N		\N	2026-06-21 19:48:37.608732+09	SEED_ZG	2026-07-02 02:52:08.333511+09	SEED_ZG
30	kanri_zgA	$2b$10$u9DubcTeb8.pUOemnjKHNuIBfUha3T0YqGU7r1YCcIZxch2oN/x5u	JA東京都A	5	108	166	13	t	t	kanri_zgA@gmail.com				\N	\N	0	f	f	\N		\N	2026-07-02 02:49:13.86249+09	2	2026-07-02 02:49:13.86249+09	2
31	kanri_zgB	$2b$10$xirxbV.6.tmDtylO4J5bjeT9OQpAooFHooRLXY2SJXF0pnjnm9sB6	JA東京都B	5	108	167	13	t	t	kanri_zgB@gmail.com				\N	\N	0	f	f	\N		\N	2026-07-02 02:50:09.467269+09	2	2026-07-02 02:50:09.467269+09	2
\.

-- ---- t_dokusya ----
COPY public.t_dokusya (dokusya_id,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,rireki_no,deleted_at,created_at,created_by,updated_at,updated_by,denshi_shonin_status,denshi_kaiin_id) FROM stdin;
189	108	166	166	DOKU01	1	1	\N	田中	太郎	ﾀﾅｶ	ﾀﾛｳ	2	1000001	13	千代田区	1-1-1		090-1000-0001			0	1975	1	t												24	159	0	1	1	001	本店	1	1234567	ﾀﾅｶ ﾀﾛｳ			2026-07-03	2026-07-03	\N	2026-07-03	202607		1	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-03 00:00:00+09	SEED_DOKU10	\N	\N
190	108	166	166	DOKU02	1	1	\N	佐藤	花子	ｻﾄｳ	ﾊﾅｺ	1	1000001	13	千代田区	1-1-2		090-1000-0002			0	1982	2	t												25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607		1	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-03 00:00:00+09	SEED_DOKU10	\N	\N
191	108	166	166	DOKU03	2	1	\N	鈴木	一郎	ｽｽﾞｷ	ｲﾁﾛｳ	1	1000001	13	千代田区	1-1-3		090-1000-0003		doku03.suzuki@example.jp	1	1968	1	t												25	163	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607		2	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-02 03:29:05.778978+09	29	1	\N
192	108	166	166	DOKU04	1	1	\N	高橋	恵子	ﾀｶﾊｼ	ｹｲｺ	3	1000001	13	千代田区	1-1-4		090-1000-0004			0	1990	2	f	1000002	02	千代田区2	1-1-3				高橋	恵子	たかはし	たかはし	25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607		2	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-02 03:31:42.422631+09	29	\N	\N
193	108	166	166	DOKU05	1	1	\N	渡辺	健	ﾜﾀﾅﾍﾞ	ｹﾝ	2	1000004	09	千代田区1-3	1-1-8		090-1000-0004			0	1971	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607		2	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-02 03:32:14.771959+09	29	\N	\N
194	108	167	167	DOKU06	1	1	\N	伊藤	幸子	ｲﾄｳ	ｻﾁｺ	4	1000001	13	千代田区	1-1-6		090-1000-0006			0	1985	2	t												25	159	0	1	1	010	ABCE	1	2345678	ｲﾄｳ ｻﾁｺ			2026-07-03	2026-07-03	\N	2026-07-03	202607		2	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-02 03:26:54.817956+09	29	\N	\N
195	108	167	167	DOKU07	1	1	\N	山本	実	ﾔﾏﾓﾄ	ﾐﾉﾙ	1	1000001	13	千代田区	1-1-7		090-1000-0007			0	1960	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607		1	\N	2026-07-03 00:00:00+09	SEED_DOKU10	2026-07-03 00:00:00+09	SEED_DOKU10	\N	\N
196	108	167	167	DOKU08	2	1	\N	中村	京子	ﾅｶﾑﾗ	ｷｮｳｺ	1	1000001	13	千代田区	1-1-8		090-1000-0008		doku08.nakamura@example.jp	1	1978	2	t												25	163	0	2	\N			\N					2026-07-08	2026-07-08	\N	2026-07-08	202607		1	\N	2026-07-08 00:00:00+09	SEED_DOKU10	2026-07-08 00:00:00+09	SEED_DOKU10	1	\N
197	108	167	167	DOKU09	1	1	\N	小林	修	ｺﾊﾞﾔｼ	ｵｻﾑ	4	1000001	13	千代田区	1-1-9		090-1000-0009			0	1995	1	t												25	159	0	2	\N			\N					2026-07-08	2026-07-08	\N	2026-07-08	202607		3	\N	2026-07-08 00:00:00+09	SEED_DOKU10	2026-07-02 03:41:44.172261+09	29	\N	\N
198	108	167	167	DOKU10	1	1	\N	加藤	真理	ｶﾄｳ	ﾏﾘ	2	1000001	13	千代田区	1-1-10		090-1000-0010			0	1988	2	t												25	159	0	1	1	010	ABCE	1	3456789	ｶﾄｳ ﾏﾘ			2026-07-08	2026-07-08	\N	2026-07-02	202607		2	\N	2026-07-08 00:00:00+09	SEED_DOKU10	2026-07-02 03:26:25.925645+09	29	\N	\N
\.

-- ---- t_dokusya_rireki ----
COPY public.t_dokusya_rireki (dokusya_rireki_id,dokusya_id,rireki_no,ja_id,kanri_shiten_id,shiten_id,kumiaiin_code,dokusya_shubetsu,tetsuzuki_shurui,denshi_dokusya_shubetsu,shimei_sei,shimei_mei,shimei_kana_sei,shimei_kana_mei,dokusya_busu,yubin_no,todofuken_code,shikuchoson,chome_banchi,tatemono_mei,renrakusaki_1,renrakusaki_2,email,mail_magazine_flg,birth_year,gender,haitatsu_same_flg,haitatsu_yubin_no,haitatsu_todofuken_code,haitatsu_shikuchoson,haitatsu_chome_banchi,haitatsu_tatemono_mei,haitatsu_renrakusaki_1,haitatsu_renrakusaki_2,haitatsu_shimei_sei,haitatsu_shimei_mei,haitatsu_shimei_kana_sei,haitatsu_shimei_kana_mei,hanbaiten_id,tanka_id,yubin_kubun,shiharai_hoho,dokusyaryo_shiharai_cycle,bank_branch_code,bank_branch_name,hikiotoshi_yokin_shubetsu,hikiotoshi_koza_no,hikiotoshi_koza_meigi,dokusyaso_bunrui,nogyosya_bunrui,shoki_dokusya_kaishi_date,dokusya_kaishi_date,dokusya_chushi_date,joho_henko_tekiyo_date,seikyu_kaishi_month,biko,henko_riyu,saishin_data_flg,zougen_hokoku_flg,shinki_flg,kaiyaku_flg,zenkai_hanbaiten_id,zenkai_dokusya_busu,zenkai_yubin_no,zenkai_todofuken_code,zenkai_shikuchoson,zenkai_chome_banchi,zenkai_tatemono_mei,denshi_shonin_status,hanbaiten_tekiyo_date,created_at,created_by) FROM stdin;
417	189	1	108	166	166	DOKU01	1	1	\N	田中	太郎	ﾀﾅｶ	ﾀﾛｳ	2	1000001	13	千代田区	1-1-1		090-1000-0001			0	1975	1	t												24	159	0	1	1	001	本店	1	1234567	ﾀﾅｶ ﾀﾛｳ			2026-07-03	2026-07-03	\N	2026-07-03	202607			t	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
418	190	1	108	166	166	DOKU02	1	1	\N	佐藤	花子	ｻﾄｳ	ﾊﾅｺ	1	1000001	13	千代田区	1-1-2		090-1000-0002			0	1982	2	t												25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			t	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
419	191	1	108	166	166	DOKU03	2	1	\N	鈴木	一郎	ｽｽﾞｷ	ｲﾁﾛｳ	1	1000001	13	千代田区	1-1-3		090-1000-0003		doku03.suzuki@example.jp	1	1968	1	t												24	163	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	1	\N	2026-07-03 00:00:00+09	SEED_DOKU10
420	192	1	108	166	166	DOKU04	1	1	\N	高橋	恵子	ﾀｶﾊｼ	ｹｲｺ	3	1000001	13	千代田区	1-1-4		090-1000-0004			0	1990	2	t												25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
421	193	1	108	166	166	DOKU05	1	1	\N	渡辺	健	ﾜﾀﾅﾍﾞ	ｹﾝ	2	1000001	13	千代田区	1-1-5		090-1000-0005			0	1971	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
422	194	1	108	167	167	DOKU06	1	1	\N	伊藤	幸子	ｲﾄｳ	ｻﾁｺ	4	1000001	13	千代田区	1-1-6		090-1000-0006			0	1985	2	t												25	159	0	1	1	001	本店	1	2345678	ｲﾄｳ ｻﾁｺ			2026-07-03	2026-07-03	\N	2026-07-03	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
423	195	1	108	167	167	DOKU07	1	1	\N	山本	実	ﾔﾏﾓﾄ	ﾐﾉﾙ	1	1000001	13	千代田区	1-1-7		090-1000-0007			0	1960	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			t	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-03 00:00:00+09	SEED_DOKU10
424	196	1	108	167	167	DOKU08	2	1	\N	中村	京子	ﾅｶﾑﾗ	ｷｮｳｺ	1	1000001	13	千代田区	1-1-8		090-1000-0008		doku08.nakamura@example.jp	1	1978	2	t												25	163	0	2	\N			\N					2026-07-08	2026-07-08	\N	2026-07-08	202607			t	t	t	f	\N	\N	\N	\N	\N	\N	\N	1	\N	2026-07-08 00:00:00+09	SEED_DOKU10
425	197	1	108	167	167	DOKU09	1	1	\N	小林	修	ｺﾊﾞﾔｼ	ｵｻﾑ	3	1000001	13	千代田区	1-1-9		090-1000-0009			0	1995	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-03	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-08 00:00:00+09	SEED_DOKU10
426	198	1	108	167	167	DOKU10	1	1	\N	加藤	真理	ｶﾄｳ	ﾏﾘ	2	1000001	13	千代田区	1-1-10		090-1000-0010			0	1988	2	t												25	159	0	1	1	001	本店	1	3456789	ｶﾄｳ ﾏﾘ			2026-07-08	2026-07-08	\N	2026-07-08	202607			f	t	t	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-08 00:00:00+09	SEED_DOKU10
427	198	2	108	167	167	DOKU10	1	1	\N	加藤	真理	ｶﾄｳ	ﾏﾘ	2	1000001	13	千代田区	1-1-10		090-1000-0010			0	1988	2	t												25	159	0	1	1	010	ABCE	1	3456789	ｶﾄｳ ﾏﾘ			2026-07-08	2026-07-08	\N	2026-07-02	202607			t	f	f	f	25	2	1000001	13	千代田区	1-1-10		\N	\N	2026-07-02 03:26:25.925645+09	29
428	194	2	108	167	167	DOKU06	1	1	\N	伊藤	幸子	ｲﾄｳ	ｻﾁｺ	4	1000001	13	千代田区	1-1-6		090-1000-0006			0	1985	2	t												25	159	0	1	1	010	ABCE	1	2345678	ｲﾄｳ ｻﾁｺ			2026-07-03	2026-07-03	\N	2026-07-03	202607			t	f	f	f	25	4	1000001	13	千代田区	1-1-6		\N	\N	2026-07-02 03:26:54.817956+09	29
429	197	2	108	167	167	DOKU09	1	1	\N	小林	修	ｺﾊﾞﾔｼ	ｵｻﾑ	3	1000001	13	千代田区	1-1-9		090-1000-0009			0	1995	1	t												25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607			f	t	f	f	24	3	1000001	13	千代田区	1-1-9		\N	2026-07-08	2026-07-02 03:28:36.112131+09	29
430	191	2	108	166	166	DOKU03	2	1	\N	鈴木	一郎	ｽｽﾞｷ	ｲﾁﾛｳ	1	1000001	13	千代田区	1-1-3		090-1000-0003		doku03.suzuki@example.jp	1	1968	1	t												25	163	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607			t	t	f	f	24	1	1000001	13	千代田区	1-1-3		1	2026-07-08	2026-07-02 03:29:05.778978+09	29
431	192	2	108	166	166	DOKU04	1	1	\N	高橋	恵子	ﾀｶﾊｼ	ｹｲｺ	3	1000001	13	千代田区	1-1-4		090-1000-0004			0	1990	2	f	1000002	02	千代田区2	1-1-3				高橋	恵子	たかはし	たかはし	25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607			t	t	f	f	25	3	1000001	13	千代田区	1-1-4		\N	\N	2026-07-02 03:31:42.422631+09	29
432	193	2	108	166	166	DOKU05	1	1	\N	渡辺	健	ﾜﾀﾅﾍﾞ	ｹﾝ	2	1000004	09	千代田区1-3	1-1-8		090-1000-0004			0	1971	1	t												24	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607			t	t	f	f	24	2	1000001	13	千代田区	1-1-5		\N	\N	2026-07-02 03:32:14.771959+09	29
433	197	3	108	167	167	DOKU09	1	1	\N	小林	修	ｺﾊﾞﾔｼ	ｵｻﾑ	4	1000001	13	千代田区	1-1-9		090-1000-0009			0	1995	1	t												25	159	0	2	\N			\N					2026-07-03	2026-07-03	\N	2026-07-08	202607			t	t	f	f	25	3	1000001	13	千代田区	1-1-9		\N	\N	2026-07-02 03:41:44.172261+09	29
\.

-- ── 3) Fix sequence (setval = MAX hiện có) ──────────────────────────────────
SELECT setval('public.m_ja_ja_id_seq',                        (SELECT GREATEST(COALESCE(MAX(ja_id),1),1)              FROM m_ja),               true);
SELECT setval('public.m_tanka_tanka_id_seq',                  (SELECT GREATEST(COALESCE(MAX(tanka_id),1),1)           FROM m_tanka),            true);
SELECT setval('public.m_kanri_shiten_kanri_shiten_id_seq',    (SELECT GREATEST(COALESCE(MAX(kanri_shiten_id),1),1)    FROM m_kanri_shiten),     true);
SELECT setval('public.m_shiten_shiten_id_seq',                (SELECT GREATEST(COALESCE(MAX(shiten_id),1),1)          FROM m_shiten),           true);
SELECT setval('public.m_hanbaiten_hanbaiten_id_seq',          (SELECT GREATEST(COALESCE(MAX(hanbaiten_id),1),1)       FROM m_hanbaiten),        true);
SELECT setval('public.m_account_account_id_seq',              (SELECT GREATEST(COALESCE(MAX(account_id),1),1)         FROM m_account),          true);
SELECT setval('public.t_dokusya_dokusya_id_seq',              (SELECT GREATEST(COALESCE(MAX(dokusya_id),1),1)         FROM t_dokusya),          true);
SELECT setval('public.t_dokusya_rireki_dokusya_rireki_id_seq',(SELECT GREATEST(COALESCE(MAX(dokusya_rireki_id),1),1)  FROM t_dokusya_rireki),   true);

-- ── 4) Sanity check ─────────────────────────────────────────────────────────
DO $$
DECLARE v_ja BIGINT; v_d INT; v_r INT; v_h INT; v_t INT; v_a INT;
BEGIN
  SELECT ja_id INTO v_ja FROM m_ja WHERE ja_code='JAZG9001';
  SELECT count(*) INTO v_d FROM t_dokusya        WHERE ja_id=v_ja;
  SELECT count(*) INTO v_r FROM t_dokusya_rireki WHERE ja_id=v_ja;
  SELECT count(*) INTO v_h FROM m_hanbaiten      WHERE ja_id=v_ja;
  SELECT count(*) INTO v_t FROM m_tanka          WHERE ja_id=v_ja;
  SELECT count(*) INTO v_a FROM m_account        WHERE login_id IN ('chuokai_zg2','kanri_zgA','kanri_zgB');
  RAISE NOTICE '[seed-chuokai-zg-current] ja_id=% / dokusya=% / rireki=% / hanbaiten=% / tanka=% / account=%',
    v_ja, v_d, v_r, v_h, v_t, v_a;
END $$;

COMMIT;
