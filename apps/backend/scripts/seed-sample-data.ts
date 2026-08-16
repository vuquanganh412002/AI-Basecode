/**
 * 開発環境用シーダー — 顧客提供のサンプルマスタを投入する。
 *
 * 本番では動かない。NODE_ENV=production なら即座に abort する。
 * 本番の初期投入は `npm run seed:admin`（管理者1件のみ）を使うこと。
 *
 * 実行:
 *   npm run seed:sample         ← `npm run seed:admin` の後に実行する
 *
 * ── データの出所 ────────────────────────────────────────────────────
 * すべて顧客提供の JA サンプルデータ Excel（シート m_ja / m_kanri_shiten /
 * m_acount）からの転記。実データなので Excel 自体はリポジトリに含めない。
 * 原本は案件の共有ドライブ側にある。
 *
 * **顧客データに無いものは原則投入しない。** 支店・単価・お知らせ・購読者は
 * 画面から登録して確認する。実データと動作確認用の作り物が混ざると、画面に
 * 出ている件数が顧客提供分なのかこちらの生成分なのか判別できなくなるため
 * （以前ここにあった自動生成分は削除済み — 経緯は git 履歴参照）。
 *
 * 例外は 2 つだけ。どちらも「無いと画面から登録する操作自体ができない」もの:
 *   - 電子版ダミー販売店（JA ごと 1 件）… 電子版の購読者を登録できない
 *   - 日農アカウント 2 件 … JAマスタ登録・アカウント管理の画面を開けない
 *
 * ── 投入内容 ────────────────────────────────────────────────────────
 *   m_ja            x  5   単協 3（松本ハイランド / 大阪泉州 / たかつき）
 *                          中央会 2（愛媛県 / 茨城県）
 *   m_kanri_shiten  x  6   松本ハイランド 1 / 大阪泉州 2 / たかつき 3
 *                          （中央会 2 JA は管理支店を持たない＝Excel どおり）
 *   m_hanbaiten     x  5   JA ごとに電子版用ダミー販売店を 1 件（コード
 *                          9999999999）。Excel に無いが、電子版単独の購読者を
 *                          登録するのに必要なので生成する（顧客要件 2026-08）。
 *   m_account       x 13   Excel 11 件（JA本店 3 / JA管理支店 6 / 中央会 2）
 *                          ＋ 日農 2 件（admin01 / staff01）
 *
 * 日農ロール（NICHINO_ADMIN / NICHINO_STAFF）は Excel に無いが、無いと
 * JAマスタ登録・アカウント管理・ファイルアップロード・販売店代行入力の
 * 各画面を誰も開けないので admin01 / staff01 の 2 件だけ補う。
 * パスワードは dev 既定値（`npm run seed:admin` が作る 'admin' と同じ）。
 *
 * ── 再実行 ──────────────────────────────────────────────────────────
 * 冪等。最後に投入するアカウント（SENTINEL_LOGIN_ID）が既にあれば
 * 何もせず終了する。
 * 各 INSERT も自然キー（ja_code / kanri_shiten_code / login_id）で
 * ON CONFLICT を張ってあり、m_account だけは ja_id / kanri_shiten_id を
 * 貼り直す DO UPDATE にしてある。ID は一切ハードコードせず実行時に
 * 自然キーから引くので、途中まで入った DB に流し直しても壊れない。
 *
 * ── Excel から手を入れた箇所（すべて意図的） ────────────────────────
 * DTO の制約に合わせるための機械的な変換 —
 *  1. yubin_no / tel  Excel はハイフン付き（390-8555 / 0263-88-1232）。
 *                     DTO が半角数字のみを要求するのでハイフンを除去。
 *  2. ja_name_kana    Excel はひらがな。カナ項目は半角カタカナが規約なので
 *                     変換する。原文を残したいので変換はコード側で行う。
 *  3. kanri_shiten_code
 *                     Excel は 10 桁。DTO の normalizeKanriShitenCode と同じ
 *                     規則で `NNN-NNNN-NNN` に整形（API 経由と同じ保存形）。
 *  4. kanri_shiten_name_kana の「・」
 *                     半角カタカナの範囲外なので半角空白に置換
 *                     （`.claude/rules/vue.md §Kana fields` の指示どおり）。
 *  5. email           Excel は空欄。MFA / パスワードリセットを試せるように
 *                     `<login_id>@agrinews-manage.com` を生成して入れている。
 *  6. password        Excel の password_hash 列は平文（ログインIDと同値の
 *                     コード）。bcrypt でハッシュ化して投入する。日農 2 件は
 *                     Excel に行が無いので dev 既定パスワードを使う。LoginDto は
 *                     「半角8〜32文字」しか要求しないので数字のみでも
 *                     ログインできる。ただしアカウント登録/パスワード変更 API の
 *                     `IsStrongPassword`（3種のうち2種以上）は通らないため、
 *                     画面から同じパスワードを再設定することはできない。
 *
 * 解釈が要る箇所 ★顧客要確認 —
 *  7. zei_kubun       Excel は 0/1 だが m_code ZEI_KUBUN は 1:内税 / 2:外税。
 *                     1→1（内税）、0→2（外税）と解釈した。
 *  8. login_id の重複 Excel では本店と同コードの管理支店アカウントが同じ
 *                     login_id を持つ（1165741000 / 1275506000 が各2行）。
 *                     login_id は UNIQUE なので管理支店側に `_ks` を付けた。
 *                     パスワードは Excel どおり接尾辞なしのコードのまま。
 *  9. todofuken_code  Excel の値は ja_code の 2〜3 桁目と一致する社内番号で、
 *                     JIS の都道府県コードとずれる行がある（松本ハイランド
 *                     =16→富山県、愛媛県中央会=33→岡山県）。FK としては
 *                     有効なので Excel のまま入れてある。画面には Excel の
 *                     番号どおりの県名が出る。
 *
 * ── 環境変数（任意） ────────────────────────────────────────────────
 *   INITIAL_ADMIN_PASSWORD
 *     指定すると全アカウントをこの1つのパスワードに揃える（12文字以上）。
 *     未指定（既定）なら JA アカウントは Excel の password_hash 列の値、
 *     日農 2 件は dev 既定パスワードを使う。
 */
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { HANBAITEN_DUMMY_CODE } from '@/common/constants/hanbaiten-dummy.constant';
import { SystemActor } from '@/common/constants/system-actor.constant';
import { ItakuKubun } from '@/common/enums';
import dataSource from '@/database/data-source';

config();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

/* ─── カナ変換ヘルパー ─────────────────────────────────────────────── */

/**
 * ひらがな → 全角カタカナ。
 *
 * 顧客 Excel の `ja_name_kana` はひらがな（まつもとはいらんど）。
 * 転記元をそのまま残したいので、変換はここで行う。
 */
function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/gu, (ch) =>
    String.fromCodePoint((ch.codePointAt(0) as number) + 0x60),
  );
}

/**
 * 全角カタカナ → 半角カタカナ。
 *
 * カナ項目は半角カタカナ（Zengin / 銀行 CSV 互換）が規約 —
 * `.claude/rules/vue.md §Kana fields MUST validate the script` 参照。
 * DTO の正規表現は `/^[ｦ-ﾟ\s]+$/u` なので「・」等の記号は通らない。
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
  // 「・」は半角カタカナ範囲外。DTO の /^[ｦ-ﾟ\s]+$/u を通すため空白にする。
  '・': ' ',
};

function toHalfWidthKatakana(s: string): string {
  return [...s].map((ch) => FW_TO_HW_KATAKANA[ch] ?? ch).join('');
}

/** ひらがな or 全角カタカナ → 半角カタカナ（DTO 準拠形）。 */
function toKana(s: string): string {
  return toHalfWidthKatakana(hiraganaToKatakana(s));
}

/**
 * シードアカウントの通知先メールドメイン。Excel の email 列は空欄なので
 * `<login_id>@` の後ろにこれを付けて生成する。ローカルでは MailHog が
 * すべて受け取るので実在ドメインである必要はない。
 */
const SEED_EMAIL_DOMAIN = 'agrinews-manage.com';

/** Excel の `390-8555` / `0263-88-1232` → 半角数字のみ。 */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Excel の 10 桁管理支店コード → `NNN-NNNN-NNN`。
 * DTO の normalizeKanriShitenCode（create-kanri-shiten.dto.ts）と同じ規則。
 */
function formatKanriShitenCode(raw: string): string {
  const d = digitsOnly(raw);
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/* ─── m_ja（顧客 Excel シート m_ja） ───────────────────────────────── */

interface JaSeed {
  ja_code: string;
  ja_name: string;
  /** Excel 原文（ひらがな）。投入時に toKana() で半角カタカナへ変換する。 */
  ja_name_kana_src: string;
  todofuken_code: string;
  /** Excel 原文（ハイフン付き）。投入時に digitsOnly() で除去する。 */
  yubin_no_src: string;
  address: string;
  tel_src: string;
  fax_src: string;
  chuokai_flg: boolean;
  /** m_code ZEI_KUBUN — 1:内税 / 2:外税。Excel の 1/0 を 1/2 に読み替え。 */
  zei_kubun: number;
  biko: string;
}

const JA_SEEDS: ReadonlyArray<JaSeed> = [
  {
    ja_code: '1165741000',
    ja_name: '松本ハイランド',
    ja_name_kana_src: 'まつもとはいらんど',
    todofuken_code: '16',
    yubin_no_src: '390-8555',
    address: '長野県松本市南松本１－２－１６',
    tel_src: '0263-88-1232',
    fax_src: '',
    chuokai_flg: false,
    zei_kubun: 1,
    biko: '',
  },
  {
    ja_code: '1275570000',
    ja_name: '大阪泉州',
    ja_name_kana_src: 'おおさかせんしゅう',
    todofuken_code: '27',
    yubin_no_src: '598-0021',
    address: '泉佐野市日根野４０４０－１',
    tel_src: '0724-68-0600',
    fax_src: '',
    chuokai_flg: false,
    zei_kubun: 1,
    biko: '',
  },
  {
    ja_code: '1275506000',
    ja_name: 'たかつき',
    ja_name_kana_src: 'たかつき',
    todofuken_code: '27',
    yubin_no_src: '569-0071',
    address: '大阪府高槻市城北町１－１５－８',
    tel_src: '0726-71-5421',
    fax_src: '',
    chuokai_flg: false,
    zei_kubun: 2, // Excel: 0
    biko: '',
  },
  {
    ja_code: '1333300000',
    ja_name: '愛媛県中央会',
    ja_name_kana_src: 'えひめけんちゅうおうかい',
    todofuken_code: '33',
    yubin_no_src: '790-8555',
    address: '愛媛県松山市南堀端町２番地３号',
    tel_src: '089-948-5607',
    fax_src: '',
    chuokai_flg: true,
    zei_kubun: 1,
    biko: '',
  },
  {
    ja_code: '1083300000',
    ja_name: '茨城県中央会',
    ja_name_kana_src: 'いばらきけんちゅうおうかい',
    todofuken_code: '08',
    yubin_no_src: '310-0022',
    address: '茨城県水戸市梅香1丁目1番4号',
    tel_src: '029-232-2070',
    fax_src: '',
    chuokai_flg: true,
    zei_kubun: 2, // Excel: 0
    biko: '',
  },
];

/* ─── m_kanri_shiten（顧客 Excel シート m_kanri_shiten） ───────────── */

interface KanriShitenSeed {
  /** Excel 原文（10桁）。投入時に formatKanriShitenCode() で整形する。 */
  kanri_shiten_code_src: string;
  kanri_shiten_name: string;
  /** Excel 原文（「・」を含む場合あり）。投入時に toKana() を通す。 */
  kanri_shiten_name_kana_src: string;
  ja_code: string; // FK ref via natural key
  yubin_no_src: string;
  todofuken_code: string;
  address: string;
  tel_src: string;
  fax_src: string;
  paper_flg: boolean;
  denshi_flg: boolean;
  biko: string;
}

const KANRI_SHITEN_SEEDS: ReadonlyArray<KanriShitenSeed> = [
  {
    kanri_shiten_code_src: '1165741000',
    kanri_shiten_name: '松本ハイランド',
    kanri_shiten_name_kana_src: 'ﾏﾂﾓﾄﾊｲﾗﾝﾄﾞ',
    ja_code: '1165741000',
    yubin_no_src: '390-8555',
    todofuken_code: '16',
    address: '長野県松本市南松本１－２－１６',
    tel_src: '0263-88-1232',
    fax_src: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
  },
  {
    kanri_shiten_code_src: '1275570050',
    kanri_shiten_name: '大阪泉州購買口',
    kanri_shiten_name_kana_src: 'ｵｵｻｶｾﾝｼｭｳ',
    ja_code: '1275570000',
    yubin_no_src: '598-0021',
    todofuken_code: '27',
    address: '泉佐野市日根野４０４０－１',
    tel_src: '0724-68-0600',
    fax_src: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
  },
  {
    kanri_shiten_code_src: '1275570055',
    kanri_shiten_name: '大阪泉州総務口',
    kanri_shiten_name_kana_src: 'ｵｵｻｶｾﾝｼｭｳ',
    ja_code: '1275570000',
    yubin_no_src: '598-0021',
    todofuken_code: '27',
    address: '泉佐野市日根野４０４０－１',
    tel_src: '0724-68-0600',
    fax_src: '',
    paper_flg: true,
    denshi_flg: true,
    biko: '',
  },
  {
    kanri_shiten_code_src: '1275506000',
    kanri_shiten_name: 'たかつき',
    kanri_shiten_name_kana_src: 'ﾀｶﾂｷ',
    ja_code: '1275506000',
    yubin_no_src: '569-0071',
    todofuken_code: '27',
    address: '大阪府高槻市城北町１－１５－８',
    tel_src: '0726-71-5421',
    fax_src: '',
    paper_flg: false,
    denshi_flg: true,
    biko: '',
  },
  {
    kanri_shiten_code_src: '1275506010',
    kanri_shiten_name: 'たかつき・総務',
    kanri_shiten_name_kana_src: 'ﾀｶﾂｷ・ｿｳﾑ',
    ja_code: '1275506000',
    yubin_no_src: '569-0071',
    todofuken_code: '27',
    address: '大阪府高槻市城北町１－１５－８',
    tel_src: '0726-71-5421',
    fax_src: '',
    paper_flg: true,
    denshi_flg: false,
    biko: '',
  },
  {
    kanri_shiten_code_src: '1275506015',
    kanri_shiten_name: 'たかつき・経済',
    kanri_shiten_name_kana_src: 'ﾀｶﾂｷ・ｹｲｻﾞｲ',
    ja_code: '1275506000',
    yubin_no_src: '569-0071',
    todofuken_code: '27',
    address: '大阪府高槻市城北町１－１５－８',
    tel_src: '0726-71-5421',
    fax_src: '',
    paper_flg: true,
    denshi_flg: false,
    biko: '',
  },
];

/* ─── m_hanbaiten（電子版ダミー販売店・Excel に無いので生成） ───────── */

/**
 * JA ごとに 1 件だけ置く「電子版」用のダミー販売店。
 *
 * 電子版は紙を配達しないので実在の販売店に紐づかないが、
 * `hanbaiten_id` が空だと「販売店未設定」と区別できない。そこで JA ごとに
 * {@link HANBAITEN_DUMMY_CODE} の受け皿を 1 件用意する運用になっている
 * （顧客要件 2026-08）。SCR-011 の販売店ドロップダウンは購読種別=電子版の
 * ときこのコードだけを候補にし、それ以外では除外する。読者同期バッチ
 * （dokusya-sync）も電子版単独の行にこの販売店を割り当てる。
 * → `apps/backend/src/common/constants/hanbaiten-dummy.constant.ts`
 *
 * 銀行口座は持たないので itaku_kubun=9（その他）にする。DTO は
 * itaku_kubun=1（振込）のときだけ bank_* を必須にするため、9 なら空文字で通る。
 */
const HANBAITEN_DUMMY_NAME = '電子版';
const HANBAITEN_DUMMY_NAME_KANA = 'ﾃﾞﾝｼﾊﾞﾝ';

/* ─── m_account（顧客 Excel シート m_acount） ──────────────────────── */

interface AccountSeed {
  login_id: string;
  /**
   * 平文パスワード。投入時に bcrypt でハッシュ化する。
   * JA アカウントは Excel の password_hash 列の値（`_ks` 付き行も接尾辞なしの
   * 元コードのまま）。日農アカウントは Excel に無いので dev 既定パスワード。
   */
  password: string;
  account_name: string;
  role_id: number;          // 1:日農管理者 2:日農担当者 3:中央会 4:JA本店 5:JA管理支店
  /** 日農ロールは所属 JA を持たないので null。 */
  ja_code: string | null;
  /** 整形済み（NNN-NNNN-NNN）の管理支店コード。本店・中央会・日農は null。 */
  kanri_shiten_code: string | null;
  todofuken_code: string | null;
  paper_flg: boolean;
  denshi_flg: boolean;
}

/**
 * dev 既定パスワード。日農アカウント 2 件だけが使う（Excel に該当行が無いため）。
 * `npm run seed:admin` が作る 'admin' と同じ値なので覚えることが増えない。
 * NODE_ENV=production では本スクリプト自体が起動を拒否する。
 * NOSONAR — intentional hard-coded fixture password, dev-only.
 */
const DEV_DEFAULT_PASSWORD = 'admin@1234567';

/**
 * 日農ロール（NICHINO_ADMIN / NICHINO_STAFF）。顧客 Excel は JA 側しか
 * 無いのでここで補う。この 2 ロールが無いと JAマスタ登録・アカウント管理・
 * ファイルアップロード・販売店代行入力の各画面を誰も開けない。
 */
const NICHINO_ACCOUNTS: ReadonlyArray<AccountSeed> = [
  { login_id: 'admin01', password: DEV_DEFAULT_PASSWORD, account_name: '日農 管理者', role_id: 1,
    ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    paper_flg: true, denshi_flg: true },
  { login_id: 'staff01', password: DEV_DEFAULT_PASSWORD, account_name: '日農 担当者', role_id: 2,
    ja_code: null, kanri_shiten_code: null, todofuken_code: null,
    paper_flg: true, denshi_flg: true },
];

/** 顧客 Excel シート m_acount の 11 行。 */
const JA_ACCOUNTS: ReadonlyArray<AccountSeed> = [
  // 松本ハイランド
  { login_id: '1165741000', password: '1165741000', account_name: '松本ハイランド', role_id: 4,
    ja_code: '1165741000', kanri_shiten_code: null, todofuken_code: '16',
    paper_flg: true, denshi_flg: true },
  { login_id: '1165741000_ks', password: '1165741000', account_name: '松本ハイランド', role_id: 5,
    ja_code: '1165741000', kanri_shiten_code: '116-5741-000', todofuken_code: '16',
    paper_flg: true, denshi_flg: true },

  // 大阪泉州
  { login_id: '1275570000', password: '1275570000', account_name: '大阪泉州', role_id: 4,
    ja_code: '1275570000', kanri_shiten_code: null, todofuken_code: '27',
    paper_flg: true, denshi_flg: true },
  { login_id: '1275570050', password: '1275570050', account_name: '大阪泉州購買口', role_id: 5,
    ja_code: '1275570000', kanri_shiten_code: '127-5570-050', todofuken_code: '27',
    paper_flg: true, denshi_flg: true },
  { login_id: '1275570055', password: '1275570055', account_name: '大阪泉州総務口', role_id: 5,
    ja_code: '1275570000', kanri_shiten_code: '127-5570-055', todofuken_code: '27',
    paper_flg: true, denshi_flg: true },

  // たかつき
  { login_id: '1275506000', password: '1275506000', account_name: 'たかつき', role_id: 4,
    ja_code: '1275506000', kanri_shiten_code: null, todofuken_code: '27',
    paper_flg: true, denshi_flg: true },
  { login_id: '1275506000_ks', password: '1275506000', account_name: 'たかつき', role_id: 5,
    ja_code: '1275506000', kanri_shiten_code: '127-5506-000', todofuken_code: '27',
    paper_flg: false, denshi_flg: true },
  { login_id: '1275506010', password: '1275506010', account_name: 'たかつき・総務', role_id: 5,
    ja_code: '1275506000', kanri_shiten_code: '127-5506-010', todofuken_code: '27',
    paper_flg: true, denshi_flg: false },
  { login_id: '1275506015', password: '1275506015', account_name: 'たかつき・経済', role_id: 5,
    ja_code: '1275506000', kanri_shiten_code: '127-5506-015', todofuken_code: '27',
    paper_flg: true, denshi_flg: false },

  // 中央会
  { login_id: '1333300000', password: '1333300000', account_name: '愛媛県中央会', role_id: 3,
    ja_code: '1333300000', kanri_shiten_code: null, todofuken_code: '33',
    paper_flg: true, denshi_flg: true },
  { login_id: '1083300000', password: '1083300000', account_name: '茨城県中央会', role_id: 3,
    ja_code: '1083300000', kanri_shiten_code: null, todofuken_code: '08',
    paper_flg: true, denshi_flg: false },
];

const ACCOUNTS: ReadonlyArray<AccountSeed> = [
  ...NICHINO_ACCOUNTS,
  ...JA_ACCOUNTS,
];

/* ─── INSERT helpers ──────────────────────────────────────────────── */

async function seedMJa(): Promise<void> {
  for (const ja of JA_SEEDS) {
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
         '', '', '', '',
         $9, $10, $11,
         NOW(), $12, NOW(), $12
       )
       ON CONFLICT (ja_code) DO NOTHING`,
      [
        ja.ja_code,
        ja.ja_name,
        toKana(ja.ja_name_kana_src),
        ja.todofuken_code,
        digitsOnly(ja.yubin_no_src),
        ja.address,
        digitsOnly(ja.tel_src),
        digitsOnly(ja.fax_src),
        ja.chuokai_flg,
        ja.zei_kubun,
        ja.biko,
        SystemActor.MIGRATION,
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
         $10, $11, $12,
         NOW(), $13, NOW(), $13
       )
       ON CONFLICT (kanri_shiten_code) DO NOTHING`,
      [
        jaId,
        formatKanriShitenCode(ks.kanri_shiten_code_src),
        ks.kanri_shiten_name,
        toKana(ks.kanri_shiten_name_kana_src),
        digitsOnly(ks.yubin_no_src),
        ks.todofuken_code,
        ks.address,
        digitsOnly(ks.tel_src),
        digitsOnly(ks.fax_src),
        ks.paper_flg,
        ks.denshi_flg,
        ks.biko,
        SystemActor.MIGRATION,
      ],
    );
  }
}

/** JA ごとに電子版ダミー販売店を 1 件ずつ。 */
async function seedMHanbaiten(): Promise<void> {
  for (const ja of JA_SEEDS) {
    const jaId = await lookupJaId(ja.ja_code);
    await dataSource.query(
      `INSERT INTO m_hanbaiten (
         ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana,
         torihikisaki_no, todofuken_code, yubin_no, address, tel, fax, shocho_name,
         itaku_kubun, haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
         furikomi_tesuryo_futan_kubun, furikomi_tesuryo,
         bank_code, bank_name, bank_branch_code, bank_branch_name,
         yokin_shubetsu, koza_no, koza_meigi,
         haiten_flg, biko,
         created_at, created_by, updated_at, updated_by
       ) VALUES (
         $1, $2, $3, $4,
         '', $5, '', '', '', '', '',
         $6, NULL, NULL,
         NULL, NULL,
         '', '', '', '',
         NULL, '', '',
         false, $7,
         NOW(), $8, NOW(), $8
       )
       ON CONFLICT (ja_id, hanbaiten_code) DO NOTHING`,
      [
        jaId,
        HANBAITEN_DUMMY_CODE,
        HANBAITEN_DUMMY_NAME,
        HANBAITEN_DUMMY_NAME_KANA,
        ja.todofuken_code,
        ItakuKubun.SONOTA,
        '電子版単独の購読者用ダミー販売店。実店舗ではない（顧客要件 2026-08）',
        SystemActor.MIGRATION,
      ],
    );
  }
}

/**
 * @param forcedPassword INITIAL_ADMIN_PASSWORD が設定されていればその値。
 *        未設定なら各アカウントが Excel の password_hash 列の値を使う。
 */
async function seedMAccount(forcedPassword: string | null): Promise<void> {
  for (const acc of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(
      forcedPassword ?? acc.password,
      SALT_ROUNDS,
    );
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
         $8, $9,
         $10, '', '', '',
         NOW(), NULL, 0,
         false, false, NULL,
         '顧客提供サンプルデータ',
         NOW(), $11, NOW(), $11
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
        acc.paper_flg,
        acc.denshi_flg,
        `${acc.login_id}@${SEED_EMAIL_DOMAIN}`,
        SystemActor.MIGRATION,
      ],
    );
  }
}

/**
 * 再実行判定に使う番兵。**最後**に投入されるアカウントを見る。
 * アカウント投入はトランザクションを張っていないので、途中で落ちた場合に
 * 先頭（admin01）を番兵にすると「入っている」と誤判定して残りを永久に
 * 投入できなくなる。最後の1件があれば全件通ったと言える。
 */
const SENTINEL_LOGIN_ID = ACCOUNTS.at(-1)!.login_id;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'seed:sample MUST NOT run in production. This script inserts sample ' +
        'accounts whose password equals their login code. ' +
        'Use `npm run seed:admin` for production bootstrap.',
    );
  }

  // 既定では各アカウントが Excel の password_hash 列（＝ログインコード）を
  // パスワードに使う。INITIAL_ADMIN_PASSWORD を渡したときだけ全アカウントを
  // その1つに揃える（本番用シーダーと同じ逃げ道を残しておく）。
  const forcedPassword = process.env.INITIAL_ADMIN_PASSWORD ?? null;

  if (forcedPassword !== null && forcedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  await dataSource.initialize();
  try {
    const existing = await dataSource.query(
      `SELECT account_id FROM m_account WHERE login_id = $1 LIMIT 1`,
      [SENTINEL_LOGIN_ID],
    );
    if (existing.length > 0) {
      console.log(
        `[seed:sample] fixtures already present (${SENTINEL_LOGIN_ID} exists) — skipping`,
      );
      return;
    }

    await seedMJa();
    await seedMKanriShiten();
    await seedMHanbaiten();
    await seedMAccount(forcedPassword);

    const jaCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_ja`);
    const ksCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_kanri_shiten`);
    const hbCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_hanbaiten`);
    const acCount = await dataSource.query(`SELECT COUNT(*)::int AS c FROM m_account`);

    console.log('---------------------------------------------------------------');
    console.log('[seed:sample] 顧客提供サンプルデータを投入しました:');
    console.log(`  m_ja            x ${JA_SEEDS.length}   (total in DB: ${jaCount[0].c})`);
    console.log(`  m_kanri_shiten  x ${KANRI_SHITEN_SEEDS.length}   (total in DB: ${ksCount[0].c})`);
    console.log(`  m_hanbaiten     x ${JA_SEEDS.length}   (total in DB: ${hbCount[0].c})  電子版ダミー ${HANBAITEN_DUMMY_CODE}`);
    console.log(`  m_account       x ${ACCOUNTS.length}  (total in DB: ${acCount[0].c})`);
    console.log('---------------------------------------------------------------');
    if (forcedPassword === null) {
      console.log('[seed:sample] パスワード（JA は顧客 Excel の password_hash 列、日農は dev 既定値）:');
    } else {
      console.log('[seed:sample] 全アカウントが INITIAL_ADMIN_PASSWORD を共有します:');
    }
    console.log('  login_id       password        role_id  account_name');
    for (const acc of ACCOUNTS) {
      const pw = forcedPassword ?? acc.password;
      console.log(
        `  ${acc.login_id.padEnd(14)} ${pw.padEnd(14)}  ${acc.role_id}      ${acc.account_name}`,
      );
    }
    console.log('  ※ admin01 / staff01 は Excel に無い補完分（日農ロール）。');
    console.log("     `npm run seed:admin` が作る login_id='admin' も NICHINO_ADMIN。");
    console.log('---------------------------------------------------------------');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[seed:sample] failed:', err.message);
  process.exit(1);
});
