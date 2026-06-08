/**
 * Development-only seeder — populates the database with realistic fixtures
 * to exercise every screen end-to-end during testing.
 *
 * REFUSES TO RUN IN PRODUCTION. Set NODE_ENV=production and the script
 * aborts immediately. For production bootstrap, use `npm run seed`.
 *
 * Run this AFTER `npm run seed` so 'admin' takes account_id=1.
 * This script then adds 20 test accounts (account_id=2..21).
 *
 * Inserted rows:
 *   - m_ja x 100
 *       47 中央会 — one per 都道府県, ja_code 'JC<code>001'
 *       47 単協 #1 — `JA${prefecture}` per 都道府県, ja_code 'JA<code>001'
 *        6 単協 #2 — `JA${prefecture}中央` for the top-6 most-populous
 *                    prefectures (Tokyo / 神奈川 / 大阪 / 愛知 / 埼玉 / 千葉),
 *                    ja_code 'JA<code>002'
 *
 *   - m_kanri_shiten x 151 ≈150:
 *         4 fixed account-bound branches (kanri01..04 用) — codes
 *           'KS1-3000-001' / 'KS0-1000-001' / 'KS2-7000-001' / 'KS2-3000-001'
 *       141 generated — 47 単協 #1 × 3 (A/B/C), codes 'KS-{prefCode}-{001..003}'
 *         6 generated — 6 単協 #2 × 1, codes 'KS-{prefCode}-901'
 *
 *   - m_shiten x 151 ≈150 — one 支店 per 管理支店 (1:1). 支店 code is
 *     'KS' → 'S' on the parent's code suffix.
 *
 *   - m_tanka x 151 ≈150 — 単価マスタ (price master):
 *        94 rows: 47 単協 #1 JAs × 2 tanka each (T001 購読料 + T002 配達手数料)
 *         6 rows: 6 単協 #2 JAs × 1 tanka (T001 only, active_flg=false for
 *                 stopped-tanka filter testing)
 *        47 rows: 47 単協 #1 JAs × 1 (T003 学割購読料)
 *         4 rows: 4 top JAs × 1 (T004 春季キャンペーン購読料, 期間限定)
 *
 *   - t_oshirase x ~21 — お知らせ samples (login-screen banner + menu).
 *     The single oshirase_type=4 row (締め切り時間, publish_location=2)
 *     lives in migration 1711900900007-SeedTOshirase, NOT here, because
 *     the business rule requires exactly ONE such row in every
 *     environment (prod / staging / dev). This dev seed adds banner
 *     samples on top of that single migration-installed row.
 *
 *   - m_account x 20 — 4 per role:
 *       admin01..04     NICHINO_ADMIN     (ja_id=NULL)
 *       staff01..04     NICHINO_STAFF     (ja_id=NULL)
 *       chuokai01..04   CHUOKAI           (at chuokai JAs in Tokyo / 北海道 / 大阪 / 愛知)
 *       honten01..04    JA_HONTEN         (at tanky JAs in the same 4 prefectures)
 *       kanri01..04     JA_KANRI_SHITEN   (same tanky JAs + management branch)
 *
 * Invoke with:
 *   npm run seed:dev
 *
 * Idempotent: every row goes through ON CONFLICT DO NOTHING on its natural
 * unique key (ja_code / kanri_shiten_code / login_id). ja_id and
 * kanri_shiten_id are NOT hard-coded on accounts — they're looked up at
 * runtime via natural keys, so re-running on a partially-seeded DB is safe.
 *
 * Email per account is declared inline in ACCOUNTS (login_id@agrinews.jp);
 * no env var needed.
 *
 * Optional env:
 *   INITIAL_ADMIN_PASSWORD   — override the shared dev password. If unset,
 *                              defaults to the fixed dev password
 *                              'admin@1234567' so testers can log in without
 *                              hunting for a generated value. All 20 test
 *                              accounts share this password (testing only).
 */
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import dataSource from '@/database/data-source';

config();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

/**
 * Convert full-width katakana → half-width.
 *
 * The prefecture table below keeps `kana` / `kana_short` in full-width
 * form (the natural reading for Japanese editors), but seeded
 * `ja_name_kana` / `kanri_shiten_name_kana` columns are HALF-WIDTH per
 * the project's kana-field convention (Zengin/bank-CSV-compatible) —
 * see `.claude/rules/vue.md §Kana fields MUST validate the script`.
 * Use this helper at the seeding boundary so we don't have to maintain
 * two parallel kana tables.
 */
const FW_TO_HW_KATAKANA: Record<string, string> = {
  ガ: 'ｶﾞ', ギ: 'ｷﾞ', グ: 'ｸﾞ', ゲ: 'ｹﾞ', ゴ: 'ｺﾞ',
  ザ: 'ｻﾞ', ジ: 'ｼﾞ', ズ: 'ｽﾞ', ゼ: 'ｾﾞ', ゾ: 'ｿﾞ',
  ダ: 'ﾀﾞ', ヂ: 'ﾁﾞ', ヅ: 'ﾂﾞ', デ: 'ﾃﾞ', ド: 'ﾄﾞ',
  バ: 'ﾊﾞ', ビ: 'ﾋﾞ', ブ: 'ﾌﾞ', ベ: 'ﾍﾞ', ボ: 'ﾎﾞ',
  パ: 'ﾊﾟ', ピ: 'ﾋﾟ', プ: 'ﾌﾟ', ペ: 'ﾍﾟ', ポ: 'ﾎﾟ',
  ヴ: 'ｳﾞ',
  ア: 'ｱ', イ: 'ｲ', ウ: 'ｳ', エ: 'ｴ', オ: 'ｵ',
  カ: 'ｶ', キ: 'ｷ', ク: 'ｸ', ケ: 'ｹ', コ: 'ｺ',
  サ: 'ｻ', シ: 'ｼ', ス: 'ｽ', セ: 'ｾ', ソ: 'ｿ',
  タ: 'ﾀ', チ: 'ﾁ', ツ: 'ﾂ', テ: 'ﾃ', ト: 'ﾄ',
  ナ: 'ﾅ', ニ: 'ﾆ', ヌ: 'ﾇ', ネ: 'ﾈ', ノ: 'ﾉ',
  ハ: 'ﾊ', ヒ: 'ﾋ', フ: 'ﾌ', ヘ: 'ﾍ', ホ: 'ﾎ',
  マ: 'ﾏ', ミ: 'ﾐ', ム: 'ﾑ', メ: 'ﾒ', モ: 'ﾓ',
  ヤ: 'ﾔ', ユ: 'ﾕ', ヨ: 'ﾖ',
  ラ: 'ﾗ', リ: 'ﾘ', ル: 'ﾙ', レ: 'ﾚ', ロ: 'ﾛ',
  ワ: 'ﾜ', ヲ: 'ｦ', ン: 'ﾝ',
  ァ: 'ｧ', ィ: 'ｨ', ゥ: 'ｩ', ェ: 'ｪ', ォ: 'ｫ',
  ャ: 'ｬ', ュ: 'ｭ', ョ: 'ｮ', ッ: 'ｯ',
  ー: 'ｰ', '　': ' ',
};

function toHalfWidthKatakana(s: string): string {
  return [...s].map((ch) => FW_TO_HW_KATAKANA[ch] ?? ch).join('');
}

/* ─── 都道府県マスタデータ ─────────────────────────────────────────── */

interface PrefectureInfo {
  code: string;        // m_todofuken.todofuken_code (01..47)
  name: string;        // 東京都, 神奈川県, ...
  name_short: string;  // 東京, 神奈川, ...（suffix を除去）
  kana: string;        // トウキョウト
  kana_short: string;  // トウキョウ
  capital: string;     // 県庁所在地（市町村郡）
  postal_prefix: string; // 郵便番号の上3桁
  area_code: string;     // 電話番号の市外局番
}

const PREFECTURES: ReadonlyArray<PrefectureInfo> = [
  { code: '01', name: '北海道', name_short: '北海道', kana: 'ホッカイドウ', kana_short: 'ホッカイ', capital: '札幌市中央区', postal_prefix: '060', area_code: '011' },
  { code: '02', name: '青森県', name_short: '青森', kana: 'アオモリケン', kana_short: 'アオモリ', capital: '青森市', postal_prefix: '030', area_code: '017' },
  { code: '03', name: '岩手県', name_short: '岩手', kana: 'イワテケン', kana_short: 'イワテ', capital: '盛岡市', postal_prefix: '020', area_code: '019' },
  { code: '04', name: '宮城県', name_short: '宮城', kana: 'ミヤギケン', kana_short: 'ミヤギ', capital: '仙台市青葉区', postal_prefix: '980', area_code: '022' },
  { code: '05', name: '秋田県', name_short: '秋田', kana: 'アキタケン', kana_short: 'アキタ', capital: '秋田市', postal_prefix: '010', area_code: '018' },
  { code: '06', name: '山形県', name_short: '山形', kana: 'ヤマガタケン', kana_short: 'ヤマガタ', capital: '山形市', postal_prefix: '990', area_code: '023' },
  { code: '07', name: '福島県', name_short: '福島', kana: 'フクシマケン', kana_short: 'フクシマ', capital: '福島市', postal_prefix: '960', area_code: '024' },
  { code: '08', name: '茨城県', name_short: '茨城', kana: 'イバラキケン', kana_short: 'イバラキ', capital: '水戸市', postal_prefix: '310', area_code: '029' },
  { code: '09', name: '栃木県', name_short: '栃木', kana: 'トチギケン', kana_short: 'トチギ', capital: '宇都宮市', postal_prefix: '320', area_code: '028' },
  { code: '10', name: '群馬県', name_short: '群馬', kana: 'グンマケン', kana_short: 'グンマ', capital: '前橋市', postal_prefix: '371', area_code: '027' },
  { code: '11', name: '埼玉県', name_short: '埼玉', kana: 'サイタマケン', kana_short: 'サイタマ', capital: 'さいたま市浦和区', postal_prefix: '330', area_code: '048' },
  { code: '12', name: '千葉県', name_short: '千葉', kana: 'チバケン', kana_short: 'チバ', capital: '千葉市中央区', postal_prefix: '260', area_code: '043' },
  { code: '13', name: '東京都', name_short: '東京', kana: 'トウキョウト', kana_short: 'トウキョウ', capital: '千代田区', postal_prefix: '100', area_code: '03' },
  { code: '14', name: '神奈川県', name_short: '神奈川', kana: 'カナガワケン', kana_short: 'カナガワ', capital: '横浜市西区', postal_prefix: '220', area_code: '045' },
  { code: '15', name: '新潟県', name_short: '新潟', kana: 'ニイガタケン', kana_short: 'ニイガタ', capital: '新潟市中央区', postal_prefix: '950', area_code: '025' },
  { code: '16', name: '富山県', name_short: '富山', kana: 'トヤマケン', kana_short: 'トヤマ', capital: '富山市', postal_prefix: '930', area_code: '076' },
  { code: '17', name: '石川県', name_short: '石川', kana: 'イシカワケン', kana_short: 'イシカワ', capital: '金沢市', postal_prefix: '920', area_code: '076' },
  { code: '18', name: '福井県', name_short: '福井', kana: 'フクイケン', kana_short: 'フクイ', capital: '福井市', postal_prefix: '910', area_code: '0776' },
  { code: '19', name: '山梨県', name_short: '山梨', kana: 'ヤマナシケン', kana_short: 'ヤマナシ', capital: '甲府市', postal_prefix: '400', area_code: '055' },
  { code: '20', name: '長野県', name_short: '長野', kana: 'ナガノケン', kana_short: 'ナガノ', capital: '長野市', postal_prefix: '380', area_code: '026' },
  { code: '21', name: '岐阜県', name_short: '岐阜', kana: 'ギフケン', kana_short: 'ギフ', capital: '岐阜市', postal_prefix: '500', area_code: '058' },
  { code: '22', name: '静岡県', name_short: '静岡', kana: 'シズオカケン', kana_short: 'シズオカ', capital: '静岡市葵区', postal_prefix: '420', area_code: '054' },
  { code: '23', name: '愛知県', name_short: '愛知', kana: 'アイチケン', kana_short: 'アイチ', capital: '名古屋市中区', postal_prefix: '460', area_code: '052' },
  { code: '24', name: '三重県', name_short: '三重', kana: 'ミエケン', kana_short: 'ミエ', capital: '津市', postal_prefix: '514', area_code: '059' },
  { code: '25', name: '滋賀県', name_short: '滋賀', kana: 'シガケン', kana_short: 'シガ', capital: '大津市', postal_prefix: '520', area_code: '077' },
  { code: '26', name: '京都府', name_short: '京都', kana: 'キョウトフ', kana_short: 'キョウト', capital: '京都市下京区', postal_prefix: '600', area_code: '075' },
  { code: '27', name: '大阪府', name_short: '大阪', kana: 'オオサカフ', kana_short: 'オオサカ', capital: '大阪市北区', postal_prefix: '530', area_code: '06' },
  { code: '28', name: '兵庫県', name_short: '兵庫', kana: 'ヒョウゴケン', kana_short: 'ヒョウゴ', capital: '神戸市中央区', postal_prefix: '650', area_code: '078' },
  { code: '29', name: '奈良県', name_short: '奈良', kana: 'ナラケン', kana_short: 'ナラ', capital: '奈良市', postal_prefix: '630', area_code: '0742' },
  { code: '30', name: '和歌山県', name_short: '和歌山', kana: 'ワカヤマケン', kana_short: 'ワカヤマ', capital: '和歌山市', postal_prefix: '640', area_code: '073' },
  { code: '31', name: '鳥取県', name_short: '鳥取', kana: 'トットリケン', kana_short: 'トットリ', capital: '鳥取市', postal_prefix: '680', area_code: '0857' },
  { code: '32', name: '島根県', name_short: '島根', kana: 'シマネケン', kana_short: 'シマネ', capital: '松江市', postal_prefix: '690', area_code: '0852' },
  { code: '33', name: '岡山県', name_short: '岡山', kana: 'オカヤマケン', kana_short: 'オカヤマ', capital: '岡山市北区', postal_prefix: '700', area_code: '086' },
  { code: '34', name: '広島県', name_short: '広島', kana: 'ヒロシマケン', kana_short: 'ヒロシマ', capital: '広島市中区', postal_prefix: '730', area_code: '082' },
  { code: '35', name: '山口県', name_short: '山口', kana: 'ヤマグチケン', kana_short: 'ヤマグチ', capital: '山口市', postal_prefix: '753', area_code: '083' },
  { code: '36', name: '徳島県', name_short: '徳島', kana: 'トクシマケン', kana_short: 'トクシマ', capital: '徳島市', postal_prefix: '770', area_code: '088' },
  { code: '37', name: '香川県', name_short: '香川', kana: 'カガワケン', kana_short: 'カガワ', capital: '高松市', postal_prefix: '760', area_code: '087' },
  { code: '38', name: '愛媛県', name_short: '愛媛', kana: 'エヒメケン', kana_short: 'エヒメ', capital: '松山市', postal_prefix: '790', area_code: '089' },
  { code: '39', name: '高知県', name_short: '高知', kana: 'コウチケン', kana_short: 'コウチ', capital: '高知市', postal_prefix: '780', area_code: '088' },
  { code: '40', name: '福岡県', name_short: '福岡', kana: 'フクオカケン', kana_short: 'フクオカ', capital: '福岡市中央区', postal_prefix: '810', area_code: '092' },
  { code: '41', name: '佐賀県', name_short: '佐賀', kana: 'サガケン', kana_short: 'サガ', capital: '佐賀市', postal_prefix: '840', area_code: '0952' },
  { code: '42', name: '長崎県', name_short: '長崎', kana: 'ナガサキケン', kana_short: 'ナガサキ', capital: '長崎市', postal_prefix: '850', area_code: '095' },
  { code: '43', name: '熊本県', name_short: '熊本', kana: 'クマモトケン', kana_short: 'クマモト', capital: '熊本市中央区', postal_prefix: '860', area_code: '096' },
  { code: '44', name: '大分県', name_short: '大分', kana: 'オオイタケン', kana_short: 'オオイタ', capital: '大分市', postal_prefix: '870', area_code: '097' },
  { code: '45', name: '宮崎県', name_short: '宮崎', kana: 'ミヤザキケン', kana_short: 'ミヤザキ', capital: '宮崎市', postal_prefix: '880', area_code: '0985' },
  { code: '46', name: '鹿児島県', name_short: '鹿児島', kana: 'カゴシマケン', kana_short: 'カゴシマ', capital: '鹿児島市', postal_prefix: '890', area_code: '099' },
  { code: '47', name: '沖縄県', name_short: '沖縄', kana: 'オキナワケン', kana_short: 'オキナワ', capital: '那覇市', postal_prefix: '900', area_code: '098' },
];

/** Top-6 most-populous prefectures get a second tanky (JA○○中央). */
const SECOND_TANKY_PREFS = new Set(['11', '12', '13', '14', '23', '27']);

/* ─── m_ja seed builder ────────────────────────────────────────────── */

interface JaSeed {
  ja_code: string;
  ja_name: string;
  ja_name_kana: string;
  todofuken_code: string;
  yubin_no: string;
  address: string;
  tel: string;
  fax: string;
  chuokai_flg: boolean;
  biko: string;
  // JASTEM 委託者・農協 metadata (NOT NULL DEFAULT '' on m_ja per
  // customer spec 2026-05-20). 中央会 rows get realistic settlement
  // codes; 単協 rows stay '' so the UI exercises the ※空文字許容 path.
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
}

function buildPostal(prefix: string, seq: number): string {
  // 7 桁の郵便番号。prefix(3) + 4桁シーケンス。
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function buildPhone(areaCode: string, seq: number, offset = 0): string {
  // 市外局番 + '10' + 4桁シーケンス。
  return `${areaCode}10${String(seq + offset).padStart(4, '0')}`;
}

function buildJaSeeds(): JaSeed[] {
  const rows: JaSeed[] = [];

  // 1. 中央会 47 件 — ja_code 'JC<prefCode>001'.
  //    中央会 holds the Zengin/JASTEM consignor relationship for the
  //    region, so 4 JASTEM 委託者・農協 fields get populated.
  PREFECTURES.forEach((pref, i) => {
    rows.push({
      ja_code: `JC${pref.code}001`,
      ja_name: `${pref.name_short}中央会`,
      ja_name_kana: toHalfWidthKatakana(`${pref.kana_short}チュウオウカイ`),
      todofuken_code: pref.code,
      yubin_no: buildPostal(pref.postal_prefix, 1),
      address: `${pref.name}${pref.capital}中央1-1-1`,
      tel: buildPhone(pref.area_code, i + 1),
      fax: buildPhone(pref.area_code, i + 1, 1000),
      chuokai_flg: true,
      biko: `${pref.name_short}中央会`,
      // 10-digit 委託者コード — derive from pref.code so values stay
      // unique per row but recognisable in the UI.
      jastem_itakusha_code: `${pref.code}${String(i + 1).padStart(8, '0')}`,
      jastem_itakusha_name: `${pref.name_short}中央会`,
      // JASTEM 農協番号 (4 chars). 中央会 has its own JASTEM code.
      jastem_ja_code: `${pref.code}${String(i + 1).padStart(2, '0')}`,
      jastem_ja_name: `${pref.kana_short}チュウオウ`.slice(0, 15),
    });
  });

  // 2. 単協 #1 — 47 件 — ja_code 'JA<prefCode>001'.
  //    単協 might or might not have its own JASTEM settlement contract.
  //    Populate 4 fields for ~half of the 単協 (even-indexed prefs);
  //    leave the rest empty to exercise the ※空文字許容 path on the
  //    list / edit forms.
  PREFECTURES.forEach((pref, i) => {
    const hasJastem = i % 2 === 0;
    rows.push({
      ja_code: `JA${pref.code}001`,
      ja_name: `JA${pref.name_short}`,
      ja_name_kana: toHalfWidthKatakana(`ジェイエー${pref.kana_short}`),
      todofuken_code: pref.code,
      yubin_no: buildPostal(pref.postal_prefix, 100),
      address: `${pref.name}${pref.capital}本町2-2-2`,
      tel: buildPhone(pref.area_code, i + 1, 2000),
      fax: buildPhone(pref.area_code, i + 1, 3000),
      chuokai_flg: false,
      biko: `JA${pref.name_short}本店`,
      jastem_itakusha_code: hasJastem
        ? `${pref.code}${String(i + 100).padStart(8, '0')}`
        : '',
      jastem_itakusha_name: hasJastem ? `JA${pref.name_short}` : '',
      jastem_ja_code: hasJastem
        ? `${pref.code}${String(i + 50).padStart(2, '0')}`
        : '',
      jastem_ja_name: hasJastem
        ? toHalfWidthKatakana(`ジェイエー${pref.kana_short}`).slice(0, 15)
        : '',
    });
  });

  // 3. 単協 #2 — 6 件 — 人口の多い 6 都道府県 (ja_code 'JA<prefCode>002').
  //    Always populate JASTEM — these are large urban JAs that always
  //    have their own settlement contract.
  PREFECTURES.filter((p) => SECOND_TANKY_PREFS.has(p.code)).forEach((pref, idx) => {
    rows.push({
      ja_code: `JA${pref.code}002`,
      ja_name: `JA${pref.name_short}中央`,
      ja_name_kana: toHalfWidthKatakana(`ジェイエー${pref.kana_short}チュウオウ`),
      todofuken_code: pref.code,
      yubin_no: buildPostal(pref.postal_prefix, 200),
      address: `${pref.name}${pref.capital}西本町3-3-3`,
      tel: buildPhone(pref.area_code, idx + 1, 4000),
      fax: buildPhone(pref.area_code, idx + 1, 5000),
      chuokai_flg: false,
      biko: `JA${pref.name_short}中央 (大規模都市圏)`,
      jastem_itakusha_code: `${pref.code}${String(idx + 200).padStart(8, '0')}`,
      jastem_itakusha_name: `JA${pref.name_short}中央`,
      jastem_ja_code: `${pref.code}${String(idx + 70).padStart(2, '0')}`,
      jastem_ja_name: toHalfWidthKatakana(
        `ジェイエー${pref.kana_short}チュウオウ`,
      ).slice(0, 15),
    });
  });

  return rows; // 47 + 47 + 6 = 100
}

/* ─── m_kanri_shiten seed builder ─────────────────────────────────── */

interface KanriShitenSeed {
  kanri_shiten_code: string;
  kanri_shiten_name: string;
  kanri_shiten_name_kana: string;
  ja_code: string;          // FK ref via natural key
  yubin_no: string;
  todofuken_code: string;
  address: string;
  tel: string;
  fax: string;
  biko: string;
}

/**
 * Code format follows database-design.md §m_kanri_shiten:
 *   `1AA-BBBB-CCC`
 *     1AA  = '1' + 2-digit prefecture code (113 = 東京都, 101 = 北海道, …)
 *     BBBB = JA code suffix (5001 = 単協 #1 で 1JA, 5002 = 単協 #2, …)
 *     CCC  = branch sequence within the JA (001..003 normal, 999 = 中央)
 *
 * The 4 fixed account-bound branches — referenced by kanri01..04 in
 * ACCOUNTS — use CCC=999 so they don't collide with the generated 001..003.
 */
const KANRI_SHITEN_ACCOUNT_BOUND: ReadonlyArray<KanriShitenSeed> = [
  {
    kanri_shiten_code: '113-5001-999',
    kanri_shiten_name: '東京中央管理支店',
    kanri_shiten_name_kana: 'ﾄｳｷｮｳﾁｭｳｵｳｶﾝﾘｼﾃﾝ',
    ja_code: 'JA13001',
    yubin_no: '1000010',
    todofuken_code: '13',
    address: '東京都千代田区神田1-1-1',
    tel: '0320000001',
    fax: '0320000002',
    biko: 'kanri01 用テスト管理支店',
  },
  {
    kanri_shiten_code: '101-5001-999',
    kanri_shiten_name: '北海道中央管理支店',
    kanri_shiten_name_kana: 'ﾎｯｶｲﾄﾞｳﾁｭｳｵｳｶﾝﾘｼﾃﾝ',
    ja_code: 'JA01001',
    yubin_no: '0600010',
    todofuken_code: '01',
    address: '北海道札幌市中央区北一条1-1',
    tel: '01120000001',
    fax: '01120000002',
    biko: 'kanri02 用テスト管理支店',
  },
  {
    kanri_shiten_code: '127-5001-999',
    kanri_shiten_name: '大阪中央管理支店',
    kanri_shiten_name_kana: 'ｵｵｻｶﾁｭｳｵｳｶﾝﾘｼﾃﾝ',
    ja_code: 'JA27001',
    yubin_no: '5300010',
    todofuken_code: '27',
    address: '大阪府大阪市北区梅田1-1',
    tel: '0620000001',
    fax: '0620000002',
    biko: 'kanri03 用テスト管理支店',
  },
  {
    kanri_shiten_code: '123-5001-999',
    kanri_shiten_name: '愛知中央管理支店',
    kanri_shiten_name_kana: 'ｱｲﾁﾁｭｳｵｳｶﾝﾘｼﾃﾝ',
    ja_code: 'JA23001',
    yubin_no: '4600010',
    todofuken_code: '23',
    address: '愛知県名古屋市中区栄1-1',
    tel: '05220000001',
    fax: '05220000002',
    biko: 'kanri04 用テスト管理支店',
  },
];

/**
 * Generates additional management branches so every JA has multiple
 * 管理支店 to play with. 47 単協 #1 × 3 + 6 単協 #2 × 1 = 147 generated
 * rows, plus the 4 fixed account-bound branches above = ~151 total.
 *
 * Codes follow the canonical `1AA-BBBB-CCC` format documented in
 * database-design.md (1AA = 1+pref_code, BBBB = 5001/5002, CCC =
 * 001..003 / 901). CCC=999 is reserved for the account-bound branches
 * declared above.
 */
function buildExtraKanriShitenSeeds(): KanriShitenSeed[] {
  const rows: KanriShitenSeed[] = [];
  const SUFFIX = ['A', 'B', 'C'];

  PREFECTURES.forEach((pref) => {
    for (let n = 0; n < 3; n++) {
      const suffix = SUFFIX[n];
      const seq = String(n + 1).padStart(3, '0');
      rows.push({
        kanri_shiten_code: `1${pref.code}-5001-${seq}`,
        kanri_shiten_name: `${pref.name_short}${suffix}管理支店`,
        // Kana drops the Latin A/B/C — the DTO regex (/^[ｦ-ﾟ\s]+$/u) is
        // half-width-katakana only. Same prefecture's 3 branches share
        // the same kana; uniqueness lives on the code, not the kana.
        kanri_shiten_name_kana: toHalfWidthKatakana(
          `${pref.kana_short}ｶﾝﾘｼﾃﾝ`,
        ),
        ja_code: `JA${pref.code}001`,
        yubin_no: buildPostal(pref.postal_prefix, 300 + n),
        todofuken_code: pref.code,
        address: `${pref.name}${pref.capital}本町${n + 1}-${n + 1}-${n + 1}`,
        tel: buildPhone(pref.area_code, n + 1, 6000),
        fax: buildPhone(pref.area_code, n + 1, 7000),
        biko: `${pref.name_short}${suffix}地区 管理支店`,
      });
    }
  });

  PREFECTURES.filter((p) => SECOND_TANKY_PREFS.has(p.code)).forEach(
    (pref, idx) => {
      rows.push({
        kanri_shiten_code: `1${pref.code}-5002-001`,
        kanri_shiten_name: `${pref.name_short}中央管理支店`,
        kanri_shiten_name_kana: toHalfWidthKatakana(
          `${pref.kana_short}ﾁｭｳｵｳｶﾝﾘｼﾃﾝ`,
        ),
        ja_code: `JA${pref.code}002`,
        yubin_no: buildPostal(pref.postal_prefix, 900),
        todofuken_code: pref.code,
        address: `${pref.name}${pref.capital}中央2-${idx + 1}`,
        tel: buildPhone(pref.area_code, idx + 1, 8000),
        fax: buildPhone(pref.area_code, idx + 1, 9000),
        biko: `${pref.name_short}中央 管理支店 (大規模都市圏)`,
      });
    },
  );

  return rows; // 47 × 3 + 6 × 1 = 147
}

/** Combined list — account-bound (4) + generated (147) = 151 rows ≈150. */
const KANRI_SHITEN_SEEDS: ReadonlyArray<KanriShitenSeed> = [
  ...KANRI_SHITEN_ACCOUNT_BOUND,
  ...buildExtraKanriShitenSeeds(),
];

/* ─── m_shiten seed builder ────────────────────────────────────────── */

interface ShitenSeed {
  shiten_code: string;
  shiten_name: string;
  shiten_name_kana: string;
  ja_code: string;
  kanri_shiten_code: string;
  biko: string;
  // JASTEM 店舗単位 metadata (NOT NULL DEFAULT '' on m_shiten per
  // customer spec 2026-05-20). Populate for ~1/3 of the rows so the
  // list view shows both filled and empty samples (the ※空文字許容
  // case still needs to render gracefully).
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string; // '1' 普通 / '2' 当座
  jastem_koza_no: string;
}

/**
 * Generates one 支店 per 管理支店 = 151 rows ≈150. shiten_code is
 * unique per ja_id, so we derive it from the parent kanri_shiten_code
 * suffix (e.g. KS-13-001 → S-13-001).
 */
function buildShitenSeeds(): ShitenSeed[] {
  return KANRI_SHITEN_SEEDS.map((ks, idx) => {
    // Per the SCR-007 DTO: shiten_code must match /^\d{3}$/. Take the CCC
    // suffix of the parent kanri_shiten_code (last 3 chars after the
    // final dash). Examples:
    //   113-5001-001 → 001
    //   113-5001-999 → 999
    //   113-5002-001 → 001  (different JA, no collision)
    const parts = ks.kanri_shiten_code.split('-');
    const shitenCode = parts[parts.length - 1];
    // Populate JASTEM 店舗単位 fields for every 3rd row so the list
    // shows a mix of filled vs empty (※空文字許容). Branch code is a
    // 3-digit sequence; tyokin_shubetsu alternates 1(普通) / 2(当座);
    // koza_no is a 7-digit sequence derived from the row index.
    const hasJastem = idx % 3 === 0;
    const branchSeq = String((idx % 999) + 1).padStart(3, '0');
    const kozaSeq = String(1000000 + idx).slice(-7);
    return {
      shiten_code: shitenCode,
      shiten_name: ks.kanri_shiten_name.replace('管理支店', '支店'),
      // Parent kana is already pure half-width katakana (Latin A/B/C
      // stripped). Just swap ｶﾝﾘｼﾃﾝ → ｼﾃﾝ.
      shiten_name_kana: ks.kanri_shiten_name_kana.replace('ｶﾝﾘｼﾃﾝ', 'ｼﾃﾝ'),
      ja_code: ks.ja_code,
      kanri_shiten_code: ks.kanri_shiten_code,
      biko: ks.biko.replace('管理支店', '支店'),
      jastem_toriatsukai_tenpo_code: hasJastem ? branchSeq : '',
      jastem_tenpo_name: hasJastem
        ? ks.kanri_shiten_name.replace('管理支店', '店').slice(0, 15)
        : '',
      jastem_tyokin_shubetsu: hasJastem ? (idx % 2 === 0 ? '1' : '2') : '',
      jastem_koza_no: hasJastem ? kozaSeq : '',
    };
  });
}

/* ─── m_tanka seed builder ────────────────────────────────────────── */

interface TankaSeed {
  ja_code: string;        // FK ref via natural key
  tanka_code: string;     // unique within ja_id
  tanka_type: number;     // 1:購読料, 2:配達手数料
  tanka_name: string;
  kingaku_zeinuki: number; // tax-exclusive amount (整数 円)
  kingaku_zeikomi: number; // tax-inclusive amount
  tax_rate: number;        // 10.00 (NUMERIC(5,2))
  tekiyo_start_date: string; // 'YYYY-MM-DD'
  tekiyo_end_date: string | null;
  biko: string;
  active_flg: boolean;
}

/**
 * 100 件の単価データ。日本農業新聞の標準購読料 (¥3,500/月 税抜) と
 * 標準配達手数料 (¥250/部 税込) を 47 単協 #1 JA に2件ずつ展開し、
 * 6 単協 #2 JA に購読料のみ1件ずつ追加して合計 100 件。
 *
 *   47 × 2 = 94 件 (購読料 + 配達手数料、active_flg=true)
 *   6  × 1 =  6 件 (購読料のみ、active_flg=false — 停止中検索のテスト用)
 */
function buildTankaSeeds(): TankaSeed[] {
  const rows: TankaSeed[] = [];

  // 47 単協 #1: 購読料 (¥3,500 税抜) + 配達手数料 (¥250 税抜) ペア
  PREFECTURES.forEach((pref) => {
    const ja_code = `JA${pref.code}001`;
    rows.push(
      {
        ja_code,
        tanka_code: 'T001',
        tanka_type: 1,
        tanka_name: '新聞購読料 月額',
        kingaku_zeinuki: 3500,
        kingaku_zeikomi: 3850,
        tax_rate: 10,
        tekiyo_start_date: '2025-04-01',
        tekiyo_end_date: null,
        biko: `${pref.name_short}地区 標準購読料`,
        active_flg: true,
      },
      {
        ja_code,
        tanka_code: 'T002',
        tanka_type: 2,
        tanka_name: '配達手数料 標準',
        kingaku_zeinuki: 250,
        kingaku_zeikomi: 275,
        tax_rate: 10,
        tekiyo_start_date: '2025-04-01',
        tekiyo_end_date: null,
        biko: `${pref.name_short}地区 標準配達手数料`,
        active_flg: true,
      },
    );
  });

  // 6 単協 #2: 旧プラン購読料、active_flg=false（停止中検索用テストデータ）
  PREFECTURES.filter((p) => SECOND_TANKY_PREFS.has(p.code)).forEach((pref) => {
    rows.push({
      ja_code: `JA${pref.code}002`,
      tanka_code: 'T001',
      tanka_type: 1,
      tanka_name: '新聞購読料 月額（旧プラン）',
      kingaku_zeinuki: 3200,
      kingaku_zeikomi: 3520,
      tax_rate: 10,
      tekiyo_start_date: '2024-04-01',
      tekiyo_end_date: '2026-03-31',
      biko: `${pref.name_short}中央 旧プラン（停止中）`,
      active_flg: false,
    });
  });

  // Extra T003 学割購読料 on every 単協 #1 (47 rows) — bumps the total
  // up to roughly 150 so list/pagination screens have realistic depth.
  PREFECTURES.forEach((pref) => {
    rows.push({
      ja_code: `JA${pref.code}001`,
      tanka_code: 'T003',
      tanka_type: 1,
      tanka_name: '学割購読料 月額',
      kingaku_zeinuki: 2800,
      kingaku_zeikomi: 3080,
      tax_rate: 10,
      tekiyo_start_date: '2025-04-01',
      tekiyo_end_date: null,
      biko: `${pref.name_short}地区 学割`,
      active_flg: true,
    });
  });

  // Extra T004 春季キャンペーン on 4 top JAs (Tokyo / 北海道 / 大阪 / 愛知).
  ['13', '01', '27', '23'].forEach((code) => {
    const pref = PREFECTURES.find((p) => p.code === code);
    if (!pref) return;
    rows.push({
      ja_code: `JA${pref.code}001`,
      tanka_code: 'T004',
      tanka_type: 1,
      tanka_name: '春季キャンペーン購読料',
      kingaku_zeinuki: 3000,
      kingaku_zeikomi: 3300,
      tax_rate: 10,
      tekiyo_start_date: '2026-04-01',
      tekiyo_end_date: '2026-06-30',
      biko: `${pref.name_short} 春季キャンペーン (期間限定)`,
      active_flg: true,
    });
  });

  return rows; // 94 + 6 + 47 + 4 = 151
}

/* ─── t_oshirase seed builder ─────────────────────────────────────── */

interface OshiraseSeed {
  /** Stable natural key for ON CONFLICT — derived from title since
   *  t_oshirase has no business unique column. */
  natural_key: string;
  ja_code: string | null;           // null = 全JA向け
  oshirase_type: number;            // 1:システム, 2:重要, 3:一般, 4:締め切り時間
  publish_location: number;         // 1:ログイン画面, 2:メニュー画面
  status: number;                   // 1:下書き, 2:公開, 3:非公開
  title: string;
  content: string;
  publish_start_date: string;       // ISO-ish
  publish_end_date: string | null;
  target_kanri_kubun: string;       // CSV of role ids (1〜5) or '' = 全選択
}

function buildOshiraseSeeds(): OshiraseSeed[] {
  // Anchor times relative to wall-clock so tests stay green over time.
  const now = new Date();
  const iso = (offsetDays: number, h = 9, m = 0): string => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offsetDays,
      h,
      m,
      0,
    );
    return d.toISOString();
  };

  return [
    // 締め切り時間 (oshirase_type=4) は migration
    // 1711900900007-SeedTOshirase で 1 行だけ投入する（業務要件で
    // プロジェクト全体に EXACTLY ONE 行）。dev seed では追加しない。

    // ── ログイン画面向け 公開中 (publish_location=1) — 旧 migration から
    //    移植した 3 件。本番には投入しない dev サンプル。
    {
      natural_key: 'login-banner-maintenance',
      ja_code: null,
      oshirase_type: 1,
      publish_location: 1, // ログイン画面
      status: 2,           // 公開
      title: 'システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）',
      content: 'サービス全般を一時停止いたします。',
      publish_start_date: iso(-15),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'login-banner-new-feature',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 1,
      status: 2,
      title: '新機能「購読者一括取込」リリースのお知らせ',
      content: 'Excel ファイルから購読者情報を一括取込できるようになりました。',
      publish_start_date: iso(-20),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'login-banner-terms-update',
      ja_code: null,
      oshirase_type: 2,
      publish_location: 1,
      status: 2,
      title: '利用規約改訂のご案内',
      content: '2026年4月1日付で利用規約を改訂いたしました。',
      publish_start_date: iso(-25),
      publish_end_date: null,
      target_kanri_kubun: '',
    },

    // ── メニュー画面向け 公開中 (status=2) — 6 件 ─────────────────────
    {
      natural_key: 'menu-system-maintenance',
      ja_code: null,
      oshirase_type: 1,
      publish_location: 2,
      status: 2,
      title: 'システムメンテナンスのお知らせ',
      content:
        '本日深夜 02:00〜06:00 にシステムメンテナンスを実施します。ログイン不可となる時間帯がございます。',
      publish_start_date: iso(-3),
      publish_end_date: iso(10, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'menu-new-feature',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '新機能「お知らせ一覧画面」がリリースされました',
      content:
        '管理者向けにお知らせ一覧画面が追加されました。メニュー > お知らせ管理から確認できます。',
      publish_start_date: iso(-5),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'menu-important-update',
      ja_code: null,
      oshirase_type: 2,
      publish_location: 2,
      status: 2,
      title: '【重要】個人情報取扱規定の改定について',
      content:
        '個人情報の取扱規定が改定されました。詳細は社内ポータルをご確認ください。',
      publish_start_date: iso(-1),
      publish_end_date: iso(60, 23, 59),
      target_kanri_kubun: '1,2',
    },
    {
      natural_key: 'menu-monthly-report',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '月次レポートのご案内',
      content: '月次レポートが更新されました。レポート画面からダウンロードください。',
      publish_start_date: iso(-10),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'menu-ja-tokyo-only',
      ja_code: 'JA13001',
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '【JA東京限定】春季イベント開催のお知らせ',
      content: 'JA東京の組合員向けに春季イベントを開催します。詳細はお問い合わせください。',
      publish_start_date: iso(-2),
      publish_end_date: iso(30, 23, 59),
      target_kanri_kubun: '4,5',
    },
    {
      natural_key: 'menu-osaka-only',
      ja_code: 'JA27001',
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '【JA大阪限定】配達ルート変更のお知らせ',
      content: '4月より配達ルートを変更します。',
      publish_start_date: iso(-1),
      publish_end_date: null,
      target_kanri_kubun: '4,5',
    },

    // ── ログイン画面向け (publish_location=1) — 3 件 ─────────────────
    {
      natural_key: 'login-welcome',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 1,
      status: 2,
      title: 'クラウド版購読者管理システムへようこそ',
      content: '本システムへのアクセス情報は管理者にお問い合わせください。',
      publish_start_date: iso(-60),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'login-security-notice',
      ja_code: null,
      oshirase_type: 2,
      publish_location: 1,
      status: 2,
      title: '【重要】パスワード定期変更のお願い',
      content: 'セキュリティ強化のため、3ヶ月毎のパスワード変更にご協力ください。',
      publish_start_date: iso(-15),
      publish_end_date: iso(45, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'login-system-status',
      ja_code: null,
      oshirase_type: 1,
      publish_location: 1,
      status: 2,
      title: 'システム稼働状況のご案内',
      content: '現在、すべてのシステムが正常に稼働しています。',
      publish_start_date: iso(-7),
      publish_end_date: null,
      target_kanri_kubun: '',
    },

    // ── 下書き (status=1) — 3 件、admin 一覧でのみ表示 ───────────────
    {
      natural_key: 'draft-1',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 2,
      status: 1,
      title: '【下書き】次回キャンペーンのご案内',
      content: '次回のキャンペーンについて準備中です。',
      publish_start_date: iso(30),
      publish_end_date: iso(60, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'draft-2',
      ja_code: null,
      oshirase_type: 2,
      publish_location: 2,
      status: 1,
      title: '【下書き】規約改定のご案内',
      content: '規約改定について検討中です。',
      publish_start_date: iso(45),
      publish_end_date: null,
      target_kanri_kubun: '',
    },
    {
      natural_key: 'draft-3',
      ja_code: 'JA01001',
      oshirase_type: 3,
      publish_location: 2,
      status: 1,
      title: '【下書き】JA北海道 冬季営業時間',
      content: '冬季営業時間について調整中です。',
      publish_start_date: iso(60),
      publish_end_date: null,
      target_kanri_kubun: '4,5',
    },

    // ── 非公開 (status=3) — 3 件 ─────────────────────────────────────
    {
      natural_key: 'hidden-1',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 2,
      status: 3,
      title: '【非公開】テスト掲載',
      content: '社内テスト用のお知らせです。',
      publish_start_date: iso(-100),
      publish_end_date: iso(-50, 23, 59),
      target_kanri_kubun: '1',
    },
    {
      natural_key: 'hidden-2',
      ja_code: null,
      oshirase_type: 1,
      publish_location: 2,
      status: 3,
      title: '【非公開】過去システムメンテ',
      content: '掲載済みの過去のメンテナンス案内です。',
      publish_start_date: iso(-90),
      publish_end_date: iso(-80, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'hidden-3',
      ja_code: null,
      oshirase_type: 2,
      publish_location: 1,
      status: 3,
      title: '【非公開】過去ログイン画面お知らせ',
      content: '掲載済みのログイン画面お知らせ。',
      publish_start_date: iso(-150),
      publish_end_date: iso(-100, 23, 59),
      target_kanri_kubun: '',
    },

    // ── 公開だが期間外（過去 publish_end_date） — 3 件 ────────────────
    {
      natural_key: 'expired-1',
      ja_code: null,
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '【期間外】先月の特売キャンペーン',
      content: '先月のキャンペーンは終了しました。',
      publish_start_date: iso(-60),
      publish_end_date: iso(-30, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'expired-2',
      ja_code: null,
      oshirase_type: 1,
      publish_location: 2,
      status: 2,
      title: '【期間外】システム移行完了',
      content: 'システム移行は完了しました。',
      publish_start_date: iso(-120),
      publish_end_date: iso(-90, 23, 59),
      target_kanri_kubun: '',
    },
    {
      natural_key: 'expired-3',
      ja_code: 'JA23001',
      oshirase_type: 3,
      publish_location: 2,
      status: 2,
      title: '【期間外】JA愛知 年末年始営業',
      content: '年末年始の営業は終了しました。',
      publish_start_date: iso(-180),
      publish_end_date: iso(-150, 23, 59),
      target_kanri_kubun: '4,5',
    },
  ];
}

/* ─── m_account seed builder ──────────────────────────────────────── */

interface AccountSeed {
  login_id: string;
  account_name: string;
  role_id: number;
  ja_code: string | null;
  kanri_shiten_code: string | null;
  todofuken_code: string | null;
  email: string;
}

const ACCOUNTS: ReadonlyArray<AccountSeed> = [
  // ─── NICHINO_ADMIN (role_id=1) × 4 ──────────────────────────────
  { login_id: 'admin01', account_name: '日農 管理者A',
    role_id: 1, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'admin01@agrinews.jp' },
  { login_id: 'admin02', account_name: '日農 管理者B',
    role_id: 1, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'admin02@agrinews.jp' },
  { login_id: 'admin03', account_name: '日農 管理者C',
    role_id: 1, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'admin03@agrinews.jp' },
  { login_id: 'admin04', account_name: '日農 管理者D',
    role_id: 1, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'admin04@agrinews.jp' },

  // ─── NICHINO_STAFF (role_id=2) × 4 ──────────────────────────────
  { login_id: 'staff01', account_name: '日農 担当者A',
    role_id: 2, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'staff01@agrinews.jp' },
  { login_id: 'staff02', account_name: '日農 担当者B',
    role_id: 2, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'staff02@agrinews.jp' },
  { login_id: 'staff03', account_name: '日農 担当者C',
    role_id: 2, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'staff03@agrinews.jp' },
  { login_id: 'staff04', account_name: '日農 担当者D',
    role_id: 2, ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    email: 'staff04@agrinews.jp' },

  // ─── CHUOKAI (role_id=3) × 4 — 4 都道府県の中央会 ───────────────
  { login_id: 'chuokai01', account_name: '東京中央会 担当者',
    role_id: 3, ja_code: 'JC13001', kanri_shiten_code: null, todofuken_code: '13',
    email: 'chuokai01@agrinews.jp' },
  { login_id: 'chuokai02', account_name: '北海道中央会 担当者',
    role_id: 3, ja_code: 'JC01001', kanri_shiten_code: null, todofuken_code: '01',
    email: 'chuokai02@agrinews.jp' },
  { login_id: 'chuokai03', account_name: '大阪中央会 担当者',
    role_id: 3, ja_code: 'JC27001', kanri_shiten_code: null, todofuken_code: '27',
    email: 'chuokai03@agrinews.jp' },
  { login_id: 'chuokai04', account_name: '愛知中央会 担当者',
    role_id: 3, ja_code: 'JC23001', kanri_shiten_code: null, todofuken_code: '23',
    email: 'chuokai04@agrinews.jp' },

  // ─── JA_HONTEN (role_id=4) × 4 — 4 都道府県の単協本店 ───────────
  { login_id: 'honten01', account_name: 'JA東京 本店',
    role_id: 4, ja_code: 'JA13001', kanri_shiten_code: null, todofuken_code: '13',
    email: 'honten01@agrinews.jp' },
  { login_id: 'honten02', account_name: 'JA北海道 本店',
    role_id: 4, ja_code: 'JA01001', kanri_shiten_code: null, todofuken_code: '01',
    email: 'honten02@agrinews.jp' },
  { login_id: 'honten03', account_name: 'JA大阪 本店',
    role_id: 4, ja_code: 'JA27001', kanri_shiten_code: null, todofuken_code: '27',
    email: 'honten03@agrinews.jp' },
  { login_id: 'honten04', account_name: 'JA愛知 本店',
    role_id: 4, ja_code: 'JA23001', kanri_shiten_code: null, todofuken_code: '23',
    email: 'honten04@agrinews.jp' },

  // ─── JA_KANRI_SHITEN (role_id=5) × 4 — 4 つの管理支店 ───────────
  // kanri_shiten_code follows `1AA-BBBB-CCC` canonical format with CCC=999
  // reserved for the account-bound branch (avoids collision with the
  // generated 001..003 sequence for the same JA).
  { login_id: 'kanri01', account_name: 'JA東京 管理支店',
    role_id: 5, ja_code: 'JA13001', kanri_shiten_code: '113-5001-999', todofuken_code: '13',
    email: 'kanri01@agrinews.jp' },
  { login_id: 'kanri02', account_name: 'JA北海道 管理支店',
    role_id: 5, ja_code: 'JA01001', kanri_shiten_code: '101-5001-999', todofuken_code: '01',
    email: 'kanri02@agrinews.jp' },
  { login_id: 'kanri03', account_name: 'JA大阪 管理支店',
    role_id: 5, ja_code: 'JA27001', kanri_shiten_code: '127-5001-999', todofuken_code: '27',
    email: 'kanri03@agrinews.jp' },
  { login_id: 'kanri04', account_name: 'JA愛知 管理支店',
    role_id: 5, ja_code: 'JA23001', kanri_shiten_code: '123-5001-999', todofuken_code: '23',
    email: 'kanri04@agrinews.jp' },
];

/* ─── INSERT helpers ──────────────────────────────────────────────── */

async function seedMJa(): Promise<void> {
  const rows = buildJaSeeds();
  for (const ja of rows) {
    await dataSource.query(
      `INSERT INTO m_ja (
         ja_code, ja_name, ja_name_kana, todofuken_code, yubin_no, address, tel, fax,
         email, tanto_busho, tanto_name,
         jastem_itakusha_code, jastem_itakusha_name,
         jastem_ja_code, jastem_ja_name,
         chuokai_flg, zei_kubun, biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         '', '', '',
         $9, $10, $11, $12,
         $13, 1, $14,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       ON CONFLICT (ja_code) DO NOTHING`,
      [
        ja.ja_code,
        ja.ja_name,
        ja.ja_name_kana,
        ja.todofuken_code,
        ja.yubin_no,
        ja.address,
        ja.tel,
        ja.fax,
        ja.jastem_itakusha_code,
        ja.jastem_itakusha_name,
        ja.jastem_ja_code,
        ja.jastem_ja_name,
        ja.chuokai_flg,
        ja.biko,
      ],
    );
  }
}

async function lookupJaId(ja_code: string): Promise<number> {
  const rows = await dataSource.query(
    `SELECT ja_id FROM m_ja WHERE ja_code = $1 AND deleted_at IS NULL LIMIT 1`,
    [ja_code],
  );
  if (rows.length === 0) {
    throw new Error(`Missing m_ja with ja_code='${ja_code}' — did seedMJa() run first?`);
  }
  return Number(rows[0].ja_id);
}

async function lookupKanriShitenId(code: string): Promise<number> {
  const rows = await dataSource.query(
    `SELECT kanri_shiten_id FROM m_kanri_shiten WHERE kanri_shiten_code = $1 AND deleted_at IS NULL LIMIT 1`,
    [code],
  );
  if (rows.length === 0) {
    throw new Error(`Missing m_kanri_shiten with code='${code}'`);
  }
  return Number(rows[0].kanri_shiten_id);
}

async function seedMKanriShiten(): Promise<void> {
  for (const ks of KANRI_SHITEN_SEEDS) {
    const jaId = await lookupJaId(ks.ja_code);
    await dataSource.query(
      `INSERT INTO m_kanri_shiten (
         ja_id, kanri_shiten_code, kanri_shiten_name, kanri_shiten_name_kana,
         yubin_no, todofuken_code, address, tel, fax,
         paper_flg, denshi_flg, biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8, $9,
         true, true, $10,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       ON CONFLICT (kanri_shiten_code) DO NOTHING`,
      [
        jaId,
        ks.kanri_shiten_code,
        ks.kanri_shiten_name,
        ks.kanri_shiten_name_kana,
        ks.yubin_no,
        ks.todofuken_code,
        ks.address,
        ks.tel,
        ks.fax,
        ks.biko,
      ],
    );
  }
}

async function seedMTanka(): Promise<void> {
  const rows = buildTankaSeeds();
  for (const t of rows) {
    const jaId = await lookupJaId(t.ja_code);
    await dataSource.query(
      `INSERT INTO m_tanka (
         ja_id, tanka_code, tanka_type, tanka_name,
         kingaku_zeikomi, kingaku_zeinuki, tax_rate,
         tekiyo_start_date, tekiyo_end_date,
         biko, active_flg,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         $8, $9,
         $10, $11,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       ON CONFLICT (ja_id, tanka_code) DO NOTHING`,
      [
        jaId,
        t.tanka_code,
        t.tanka_type,
        t.tanka_name,
        t.kingaku_zeikomi,
        t.kingaku_zeinuki,
        t.tax_rate,
        t.tekiyo_start_date,
        t.tekiyo_end_date,
        t.biko,
        t.active_flg,
      ],
    );
  }
}

async function seedMShiten(): Promise<void> {
  const rows = buildShitenSeeds();
  for (const s of rows) {
    const jaId = await lookupJaId(s.ja_code);
    const kanriShitenId = await lookupKanriShitenId(s.kanri_shiten_code);
    await dataSource.query(
      `INSERT INTO m_shiten (
         ja_id, shiten_code, shiten_name, shiten_name_kana,
         kinyu_shiten_flg, kanri_shiten_id,
         jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
         jastem_tyokin_shubetsu, jastem_koza_no,
         biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         false, $5,
         $6, $7, $8, $9,
         $10,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       ON CONFLICT (ja_id, shiten_code) DO NOTHING`,
      [
        jaId,
        s.shiten_code,
        s.shiten_name,
        s.shiten_name_kana,
        kanriShitenId,
        s.jastem_toriatsukai_tenpo_code,
        s.jastem_tenpo_name,
        s.jastem_tyokin_shubetsu,
        s.jastem_koza_no,
        s.biko,
      ],
    );
  }
}

async function seedTOshirase(): Promise<void> {
  const rows = buildOshiraseSeeds();
  for (const o of rows) {
    const jaId = o.ja_code === null ? null : await lookupJaId(o.ja_code);
    // t_oshirase has no business unique column, so we dedup by exact
    // title — re-running the seed never piles up duplicates.
    const existing = await dataSource.query(
      `SELECT oshirase_id FROM t_oshirase WHERE title = $1 LIMIT 1`,
      [o.title],
    );
    if (existing.length > 0) continue;
    await dataSource.query(
      `INSERT INTO t_oshirase (
         ja_id, oshirase_type, publish_location, status,
         title, content,
         publish_start_date, publish_end_date,
         target_kanri_kubun,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6,
         $7, $8,
         $9,
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )`,
      [
        jaId,
        o.oshirase_type,
        o.publish_location,
        o.status,
        o.title,
        o.content,
        o.publish_start_date,
        o.publish_end_date,
        o.target_kanri_kubun,
      ],
    );
  }
}

async function seedMAccount(passwordHash: string): Promise<void> {
  for (const acc of ACCOUNTS) {
    const jaId = acc.ja_code === null ? null : await lookupJaId(acc.ja_code);
    const kanriShitenId =
      acc.kanri_shiten_code === null
        ? null
        : await lookupKanriShitenId(acc.kanri_shiten_code);

    await dataSource.query(
      `INSERT INTO m_account (
         login_id, password_hash, account_name, role_id,
         ja_id, kanri_shiten_id, todofuken_code,
         paper_flg, denshi_flg,
         email, sub_email_1, sub_email_2, sub_email_3,
         password_updated_at, last_login_at, login_failure_count,
         mfa_enable_flg, account_lock_flg, account_lock_at,
         biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         false, false,
         $8, '', '', '',
         NOW(), NULL, 0,
         false, false, NULL,
         '開発用シードアカウント',
         NOW(), 'SYSTEM', NOW(), 'SYSTEM'
       )
       ON CONFLICT (login_id) DO UPDATE
         SET ja_id = EXCLUDED.ja_id,
             kanri_shiten_id = EXCLUDED.kanri_shiten_id`,
      [
        acc.login_id,
        passwordHash,
        acc.account_name,
        acc.role_id,
        jaId,
        kanriShitenId,
        acc.todofuken_code,
        acc.email,
      ],
    );
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'seed:dev MUST NOT run in production. This script inserts dev fixtures ' +
        '(shared password across 20 test accounts, sample JA records). ' +
        'Use `npm run seed` for production bootstrap.',
    );
  }

  // Fixed dev password — known to all developers so anyone can log in
  // without grepping logs. NEVER use this password outside `npm run seed:dev`;
  // the production seeder requires INITIAL_ADMIN_PASSWORD explicitly, and
  // this script aborts above when NODE_ENV=production.
  // NOSONAR — intentional hard-coded fixture password, dev-only.
  const DEV_DEFAULT_PASSWORD = 'admin@1234567';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? DEV_DEFAULT_PASSWORD;
  const passwordSource: 'env' | 'default' =
    process.env.INITIAL_ADMIN_PASSWORD ? 'env' : 'default';

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await dataSource.initialize();
  try {
    const existing = await dataSource.query(
      `SELECT account_id FROM m_account WHERE login_id = 'admin01' LIMIT 1`,
    );
    if (existing.length > 0) {
      console.log(
        '[seed:dev] fixtures already present (admin01 exists) — skipping',
      );
      return;
    }

    await seedMJa();
    await seedMKanriShiten();
    await seedMShiten();
    await seedMTanka();
    await seedTOshirase();
    await seedMAccount(passwordHash);

    const jaCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_ja`);
    const ksCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_kanri_shiten`);
    const stCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_shiten`);
    const tkCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_tanka`);
    const osCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM t_oshirase`);
    const acCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_account`);

    console.log('---------------------------------------------------------------');
    console.log('[seed:dev] inserted (or skipped if existing):');
    console.log(`  m_ja            x ${buildJaSeeds().length}  (total in DB: ${jaCount[0].c})`);
    console.log(`  m_kanri_shiten  x ${KANRI_SHITEN_SEEDS.length}  (total in DB: ${ksCount[0].c})`);
    console.log(`  m_shiten        x ${buildShitenSeeds().length}  (total in DB: ${stCount[0].c})`);
    console.log(`  m_tanka         x ${buildTankaSeeds().length}  (total in DB: ${tkCount[0].c})`);
    console.log(`  t_oshirase      x ${buildOshiraseSeeds().length}  (total in DB: ${osCount[0].c})`);
    console.log(`  m_account       x ${ACCOUNTS.length}  (total in DB: ${acCount[0].c})`);
    console.log('---------------------------------------------------------------');
    if (passwordSource === 'default') {
      console.log(`[seed:dev] all 20 test accounts share the fixed dev password: ${password}`);
      console.log('Testing only — never use this password outside seed:dev.');
      console.log('---------------------------------------------------------------');
    } else {
      console.log('[seed:dev] all 20 test accounts share INITIAL_ADMIN_PASSWORD.');
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[seed:dev] failed:', err.message);
  process.exit(1);
});
