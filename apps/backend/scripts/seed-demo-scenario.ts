/**
 * デモ用シーダー — `docs/design-vi/demo/demo-scenario.md`（TC-001〜TC-031）が
 * 前提にするマスタ + 購読者 10 名を 1 つのデモ JA に投入する。
 *
 * 本番では動かない。NODE_ENV=production なら即座に abort する。
 *
 * 実行:
 *   npm run seed:demo                ← 冪等（既にあれば何もしない）
 *   npm run seed:demo -- --reset     ← デモ JA を丸ごと消してから作り直す
 *
 * ── 設計 ────────────────────────────────────────────────────────────
 * 全データを **専用 JA（ja_code = 1139000000）** に閉じ込める。顧客実データと
 * 混ざらないので、画面に出た件数がそのままシナリオの期待値になる。片付けも
 * `--reset` で JA ごと消すだけで済む。
 *
 * 購読者は「master を直接書く」のではなく **履歴を積んでから
 * `recomputeMaster()` を呼ぶ**。master は履歴から導出される値なので、手で
 * 計算して書くとアプリの実装とズレる（ズレたまま画面から 1 回編集すると
 * 値が飛ぶ）。実装と同じ関数に計算させるのが唯一の正解。
 *
 * ── 日付 ────────────────────────────────────────────────────────────
 * すべて実行日（JST）からの相対で決める。いつ流しても
 * `docs/design-vi/demo/verify-demo-data.sql` の期待件数が合う。
 *
 *   thisMonth  当月 1 日   SCR-020 / SCR-021 の「対象年月」
 *   nextMonth  翌月 1 日   SCR-028 / SCR-029 の「適用日」＝予約変更の適用日
 *   today      当日        SCR-026 の「基準日」
 *
 * ⚠ 唯一の例外が `即解八郎`（中止日 = 昨日）。**当月 1 日と 2 日に流すと**
 * 昨日が前月になり SCR-020 の条件（中止日 > 対象年月）から外れて 7 → 6 件に
 * なる。デモ当日が月初 2 日間に当たるならシード日をずらすこと。
 *
 * ── 電子版同期の 2 名（同期一太 / 併読二美）────────────────────────
 * このスクリプトは作らない。`apps/docker/denshiban-mysql/demo/demo-users.sql`
 * を mock cmsDB に流し、`dokusya-sync` バッチに作らせる（＝本番と同じ経路）。
 * 手順は demo-scenario.md §0.1 の手順②。実環境の cmsDB は read-only なので
 * この 2 名は存在せず、verify の H は 0 件になる（仕様どおり）。
 */
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import type { EntityManager } from 'typeorm';
import { HANBAITEN_DUMMY_CODE } from '@/common/constants/hanbaiten-dummy.constant';
import { todayIsoJst } from '@/common/utils/datetime';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import dataSource from '@/database/data-source';

config();

/* ─── 定数 ───────────────────────────────────────────────────────────── */

const DEMO_JA_CODE = '1139000000';
const DEMO_PASSWORD = 'admin@1234567';
const SALT_ROUNDS = 10;
const TODOFUKEN = '13'; // 東京都

/** 購読種別（m_code DOKUSYA_SHUBETSU）。 */
const PAPER = 1;
const DIGITAL = 2;

/** 手続種類（m_code TETSUZUKI_SHURUI）。 */
const SHINKI = 1;
const KAIYAKU = 0;

/** 支払方法（m_code SHIHARAI_HOHO）。 */
const KOZA = 1; // 口座引落
const GENKIN = 2; // 現金集金

/** 夜間バッチが解約確定行に入れる実行者名（再開六子の 3 行目で使う）。 */
const BATCH_NIGHTLY = 'SYSTEM_BATCH_NIGHTLY';

/* ─── 日付ヘルパ ─────────────────────────────────────────────────────── */

/** `YYYY-MM-DD` の当月 1 日を `offset` か月ずらして返す。 */
function monthStart(iso: string, offset: number): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` を `days` 日ずらして返す。 */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` → `YYYYMM`（請求開始年月）。 */
function ym(iso: string): string {
  return iso.slice(0, 7).replace('-', '');
}

/* ─── SQL ヘルパ ─────────────────────────────────────────────────────── */

type Row = Record<string, unknown>;

/** オブジェクトを INSERT ... RETURNING に変換して 1 列だけ返す。 */
async function insertReturning(
  m: EntityManager,
  table: string,
  row: Row,
  returning: string,
): Promise<number> {
  const cols = Object.keys(row);
  const params = cols.map((_, i) => `$${i + 1}`);
  const res: Record<string, string>[] = await m.query(
    `INSERT INTO ${table} (${cols.join(', ')})
     VALUES (${params.join(', ')})
     RETURNING ${returning}`,
    Object.values(row),
  );
  return Number(res[0][returning]);
}

/* ─── 購読者定義 ─────────────────────────────────────────────────────── */

/**
 * 履歴 1 行ぶんの差分。`overrides` は base に対する上書き列（snake_case）。
 * `zenkai` は増減連絡票（SCR-028/029）が読む前回値。
 */
interface Step {
  joho: string;
  overrides?: Row;
  shinki?: boolean;
  zougen?: boolean;
  kaiyaku?: boolean;
  createdBy?: string;
  zenkai?: Row;
}

interface ReaderSpec {
  tag: string;
  sei: string;
  mei: string;
  kanaSei: string;
  kanaMei: string;
  base: Row;
  steps: Step[];
}

/* ─── メイン ─────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[seed:demo] 本番環境では実行できない。');
  }
  const reset = process.argv.includes('--reset');

  const today = todayIsoJst();
  const thisMonth = monthStart(today, 0);
  const nextMonth = monthStart(today, 1);
  const startDate = monthStart(today, -6); // 継続組の購読開始日
  const rejoinStart = monthStart(today, -4); // 再開六子 の旧ライフサイクル開始
  const rejoinStop = monthStart(today, -3); // 同 解約日
  const yesterday = addDays(today, -1); // 即解八郎 の中止日（到来済み）

  await dataSource.initialize();

  await dataSource.transaction(async (m) => {
    /* ── 0. --reset: デモ JA を丸ごと削除 ─────────────────────────── */
    const existing: { ja_id: string }[] = await m.query(
      `SELECT ja_id FROM m_ja WHERE ja_code = $1`,
      [DEMO_JA_CODE],
    );
    if (existing.length > 0) {
      if (!reset) {
        console.log(
          `[seed:demo] デモ JA(${DEMO_JA_CODE}) は既にある。作り直すなら --reset を付けて実行。`,
        );
        return;
      }
      const jaId = Number(existing[0].ja_id);
      // 子 → 親 の順。t_dokusya は m_hanbaiten / m_tanka を参照するので先に消す。
      await m.query(
        `DELETE FROM t_dokusya_rireki WHERE ja_id = $1`,
        [jaId],
      );
      await m.query(`DELETE FROM t_dokusya WHERE ja_id = $1`, [jaId]);
      // m_account を参照する 3 テーブル（t_mfa_otp / t_log / t_login_log）を
      // 先に落とす。ログイン試行が 1 回でもあると t_login_log が残り、
      // アカウント削除が FK 違反で落ちる。
      const accountFilter = `account_id IN (SELECT account_id FROM m_account WHERE ja_id = $1)`;
      await m.query(`DELETE FROM t_mfa_otp WHERE ${accountFilter}`, [jaId]);
      await m.query(`DELETE FROM t_login_log WHERE ${accountFilter}`, [jaId]);
      await m.query(`DELETE FROM t_log WHERE ${accountFilter}`, [jaId]);
      await m.query(`DELETE FROM t_log WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_account WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_hanbaiten WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_shiten WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_tanka WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_kanri_shiten WHERE ja_id = $1`, [jaId]);
      await m.query(`DELETE FROM m_ja WHERE ja_id = $1`, [jaId]);
      console.log(`[seed:demo] 既存のデモ JA(id=${jaId}) を削除した。`);
    }

    const audit = { created_by: 'SYSTEM', updated_by: 'SYSTEM' };

    /* ── 1. JA ─────────────────────────────────────────────────────── */
    const jaId = await insertReturning(
      m,
      'm_ja',
      {
        ja_code: DEMO_JA_CODE,
        ja_name: 'JA Demo',
        ja_name_kana: 'ｼﾞｪｲｴｰﾃﾞﾓ',
        todofuken_code: TODOFUKEN,
        yubin_no: '1000001',
        address: 'Quận Chiyoda 1-1-1',
        tel: '0312340000',
        fax: '0312340001',
        email: 'demo@demo-agrinews.example.jp',
        chuokai_flg: false, // 単協
        zei_kubun: 1, // 内税
        ...audit,
      },
      'ja_id',
    );

    /* ── 2. 管理支店 ──────────────────────────────────────────────── */
    const ks = { chuo: 0, kita: 0 };
    ks.chuo = await insertReturning(
      m,
      'm_kanri_shiten',
      {
        ja_id: jaId,
        kanri_shiten_code: '113-9000-001',
        kanri_shiten_name: 'Chi nhánh Trung tâm Demo',
        kanri_shiten_name_kana: 'ﾃﾞﾓﾁｭｳｵｳｼﾃﾝ',
        yubin_no: '1000001',
        todofuken_code: TODOFUKEN,
        address: 'Quận Chiyoda 1-1-1',
        tel: '0312340010',
        fax: '0312340011',
        paper_flg: true,
        denshi_flg: true,
        ...audit,
      },
      'kanri_shiten_id',
    );
    ks.kita = await insertReturning(
      m,
      'm_kanri_shiten',
      {
        ja_id: jaId,
        kanri_shiten_code: '113-9000-002',
        kanri_shiten_name: 'Chi nhánh Bắc Demo',
        kanri_shiten_name_kana: 'ﾃﾞﾓｷﾀｼﾃﾝ',
        yubin_no: '1140001',
        todofuken_code: TODOFUKEN,
        address: 'Quận Kita 2-2-2',
        tel: '0312340020',
        fax: '0312340021',
        paper_flg: true,
        denshi_flg: true,
        ...audit,
      },
      'kanri_shiten_id',
    );

    /* ── 3. 支店（＝ SCR-020 の引落支店。shiten_code が bank_branch_code）── */
    await insertReturning(
      m,
      'm_shiten',
      {
        ja_id: jaId,
        shiten_code: '001',
        shiten_name: 'Trụ sở chính Demo',
        shiten_name_kana: 'ﾃﾞﾓﾎﾝﾃﾝ',
        kinyu_shiten_flg: true,
        kanri_shiten_id: ks.chuo,
        ...audit,
      },
      'shiten_id',
    );
    await insertReturning(
      m,
      'm_shiten',
      {
        ja_id: jaId,
        shiten_code: '002',
        shiten_name: 'Chi nhánh Bắc Demo',
        shiten_name_kana: 'ﾃﾞﾓｷﾀｼﾃﾝ',
        kinyu_shiten_flg: true,
        kanri_shiten_id: ks.kita,
        ...audit,
      },
      'shiten_id',
    );

    /* ── 4. 単価 ──────────────────────────────────────────────────── */
    const tankaKodoku = await insertReturning(
      m,
      'm_tanka',
      {
        ja_id: jaId,
        tanka_code: 'DMT001',
        tanka_type: 1, // 購読料
        tanka_name: 'Phí đăng ký Demo (theo tháng)',
        kingaku_zeikomi: 3400,
        kingaku_zeinuki: 3091,
        tax_rate: 10,
        tekiyo_start_date: monthStart(today, -12),
        active_flg: true,
        ...audit,
      },
      'tanka_id',
    );
    const tankaHaitatsu = await insertReturning(
      m,
      'm_tanka',
      {
        ja_id: jaId,
        tanka_code: 'DMT002',
        tanka_type: 2, // 配達手数料
        tanka_name: 'Phí giao báo Demo (theo tháng)',
        kingaku_zeikomi: 550,
        kingaku_zeinuki: 500,
        tax_rate: 10,
        tekiyo_start_date: monthStart(today, -12),
        active_flg: true,
        ...audit,
      },
      'tanka_id',
    );

    /* ── 5. 販売店 ────────────────────────────────────────────────── */
    const bank = {
      bank_code: '0001',
      bank_name: 'Ngân hàng Demo',
      bank_branch_code: '001',
      bank_branch_name: 'Chi nhánh Trung tâm Demo',
    };
    const hb = { dm001: 0, dm002: 0, dm003: 0, dummy: 0 };
    hb.dm001 = await insertReturning(
      m,
      'm_hanbaiten',
      {
        ja_id: jaId,
        hanbaiten_code: 'DM001',
        hanbaiten_name: 'Đại lý Trung tâm Demo',
        todofuken_code: TODOFUKEN,
        haitatsuryo_tanka_id: tankaHaitatsu,
        haiten_flg: false,
        ...bank,
        ...audit,
      },
      'hanbaiten_id',
    );
    hb.dm002 = await insertReturning(
      m,
      'm_hanbaiten',
      {
        ja_id: jaId,
        hanbaiten_code: 'DM002',
        hanbaiten_name: 'Đại lý Bắc Demo',
        todofuken_code: TODOFUKEN,
        haitatsuryo_tanka_id: tankaHaitatsu,
        haiten_flg: false,
        ...bank,
        ...audit,
      },
      'hanbaiten_id',
    );
    // 廃店。単価は付いているのに SCR-021/028/029 から消える例として使う。
    hb.dm003 = await insertReturning(
      m,
      'm_hanbaiten',
      {
        ja_id: jaId,
        hanbaiten_code: 'DM003',
        hanbaiten_name: 'Đại lý Ngừng hoạt động Demo',
        todofuken_code: TODOFUKEN,
        haitatsuryo_tanka_id: tankaHaitatsu,
        haiten_flg: true,
        ...bank,
        ...audit,
      },
      'hanbaiten_id',
    );
    // 電子版ダミー。配達手数料単価は付けない（配達しないので SCR-021 に出さない）。
    hb.dummy = await insertReturning(
      m,
      'm_hanbaiten',
      {
        ja_id: jaId,
        hanbaiten_code: HANBAITEN_DUMMY_CODE,
        hanbaiten_name: 'Bản điện tử',
        todofuken_code: TODOFUKEN,
        haiten_flg: false,
        ...bank,
        ...audit,
      },
      'hanbaiten_id',
    );

    /* ── 6. アカウント ────────────────────────────────────────────── */
    const hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    const hontenId = await insertReturning(
      m,
      'm_account',
      {
        login_id: 'demo_honten',
        password_hash: hash,
        account_name: 'Demo JA trụ sở chính',
        role_id: 4, // JA_HONTEN
        ja_id: jaId,
        todofuken_code: TODOFUKEN,
        // 購読種別の操作可否。両方 false だと SCR-011 の購読種別ラジオが
        // 全部 disabled になり（BE も 403）、TC-001 が一歩も進まない。
        paper_flg: true,
        denshi_flg: true,
        email: 'demo-honten@demo-agrinews.example.jp',
        password_updated_at: new Date(),
        ...audit,
      },
      'account_id',
    );
    await insertReturning(
      m,
      'm_account',
      {
        login_id: 'demo_shiten',
        password_hash: hash,
        account_name: 'Demo JA chi nhánh quản lý',
        role_id: 5, // JA_KANRI_SHITEN
        ja_id: jaId,
        kanri_shiten_id: ks.chuo,
        todofuken_code: TODOFUKEN,
        paper_flg: true,
        denshi_flg: true,
        email: 'demo-shiten@demo-agrinews.example.jp',
        password_updated_at: new Date(),
        ...audit,
      },
      'account_id',
    );

    /* ── 7. 購読者 ────────────────────────────────────────────────── */

    /** 口座引落の 4 列。支店コードは m_shiten.shiten_code と一致させる。 */
    const koza = (branch: '001' | '002') => ({
      shiharai_hoho: KOZA,
      bank_branch_code: branch,
      bank_branch_name:
        branch === '001' ? 'Trụ sở chính Demo' : 'Chi nhánh Bắc Demo',
      hikiotoshi_yokin_shubetsu: 1, // 普通
      hikiotoshi_koza_no: '1234567',
    });

    const paperBase = (o: Row): Row => ({
      ja_id: jaId,
      dokusya_shubetsu: PAPER,
      tetsuzuki_shurui: SHINKI,
      dokusya_busu: 1,
      yubin_no: '1000001',
      todofuken_code: TODOFUKEN,
      shikuchoson: 'Quận Chiyoda',
      chome_banchi: '1-1-1',
      renrakusaki_1: '0312345678',
      haitatsu_same_flg: true,
      tanka_id: tankaKodoku,
      shiharai_hoho: GENKIN,
      dokusyaso_bunrui: '0', // 農業者
      shoki_dokusya_kaishi_date: startDate,
      dokusya_kaishi_date: startDate,
      seikyu_kaishi_month: ym(startDate),
      ...o,
    });

    const readers: ReaderSpec[] = [
      /* DM01 継続一郎 — 2部の土台。TC-005 / TC-012 の操作対象。 */
      {
        tag: 'DM01',
        sei: '継続',
        mei: '一郎',
        kanaSei: 'ｹｲｿﾞｸ',
        kanaMei: 'ｲﾁﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm001,
          dokusya_busu: 2,
          ...koza('001'),
        }),
        steps: [{ joho: startDate, shinki: true, zougen: true }],
      },

      /* DM02 増部二郎 — 翌月から 1 → 3 部（SCR-028/029 の「増」）。 */
      {
        tag: 'DM02',
        sei: '増部',
        mei: '二郎',
        kanaSei: 'ﾏｼﾍﾞ',
        kanaMei: 'ｼﾞﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm001,
          ...koza('001'),
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: nextMonth,
            overrides: { dokusya_busu: 3 },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm001 },
          },
        ],
      },

      /* DM03 移転三郎 — 翌月から DM001 → DM002（「販売店変更」）。 */
      {
        tag: 'DM03',
        sei: '移転',
        mei: '三郎',
        kanaSei: 'ｲﾃﾝ',
        kanaMei: 'ｻﾌﾞﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm001,
          ...koza('001'),
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: nextMonth,
            overrides: { hanbaiten_id: hb.dm002 },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm001 },
          },
        ],
      },

      /* DM04 転居四郎 — 翌月から住所変更（部数も販売店も動かない例）。 */
      {
        tag: 'DM04',
        sei: '転居',
        mei: '四郎',
        kanaSei: 'ﾃﾝｷｮ',
        kanaMei: 'ｼﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.kita,
          hanbaiten_id: hb.dm002,
          shikuchoson: 'Quận Kita',
          chome_banchi: '4-4-4',
          ...koza('002'),
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: nextMonth,
            overrides: { chome_banchi: '44-44-44' },
            zougen: true,
            zenkai: {
              zenkai_dokusya_busu: 1,
              zenkai_hanbaiten_id: hb.dm002,
              zenkai_yubin_no: '1140001',
              zenkai_todofuken_code: TODOFUKEN,
              zenkai_shikuchoson: 'Quận Kita',
              zenkai_chome_banchi: '4-4-4',
            },
          },
        ],
      },

      /* DM05 解約五郎 — 解約予約済み（フェーズ 1 で止まった状態）。TC-011 / TC-013。 */
      {
        tag: 'DM05',
        sei: '解約',
        mei: '五郎',
        kanaSei: 'ｶｲﾔｸ',
        kanaMei: 'ｺﾞﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.kita,
          hanbaiten_id: hb.dm002,
          shikuchoson: 'Quận Kita',
          chome_banchi: '5-5-5',
          ...koza('002'),
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: nextMonth,
            overrides: { dokusya_busu: 0, dokusya_chushi_date: nextMonth },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm002 },
          },
        ],
      },

      /* DM06 再開六子 — 3 か月前に解約確定済み。TC-016 の再契約対象。 */
      {
        tag: 'DM06',
        sei: '再開',
        mei: '六子',
        kanaSei: 'ｻｲｶｲ',
        kanaMei: 'ﾑﾂｺ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm001,
          shoki_dokusya_kaishi_date: rejoinStart,
          dokusya_kaishi_date: rejoinStart,
          seikyu_kaishi_month: ym(rejoinStart),
        }),
        steps: [
          { joho: rejoinStart, shinki: true, zougen: true },
          {
            joho: rejoinStop,
            overrides: { dokusya_busu: 0, dokusya_chushi_date: rejoinStop },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm001 },
          },
          // 夜間バッチが打った解約確定行。created_by がその証跡。
          {
            joho: rejoinStop,
            overrides: {
              dokusya_busu: 0,
              dokusya_chushi_date: rejoinStop,
              tetsuzuki_shurui: KAIYAKU,
            },
            kaiyaku: true,
            createdBy: BATCH_NIGHTLY,
          },
        ],
      },

      /* DM07 電子七海 — 電子版・承認済み・有料。SCR-020 に出る唯一の電子版。 */
      {
        tag: 'DM07',
        sei: '電子',
        mei: '七海',
        kanaSei: 'ﾃﾞﾝｼ',
        kanaMei: 'ﾅﾅﾐ',
        base: paperBase({
          dokusya_shubetsu: DIGITAL,
          denshi_dokusya_shubetsu: 1, // 有料
          denshi_shonin_status: 1, // 承認済み
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dummy,
          ...koza('001'),
        }),
        steps: [{ joho: startDate, shinki: true, zougen: true }],
      },

      /* DM08 即解八郎 — 中止日が昨日。フェーズ 1 と 2 の中間状態。TC-014。 */
      {
        tag: 'DM08',
        sei: '即解',
        mei: '八郎',
        kanaSei: 'ｿｯｶｲ',
        kanaMei: 'ﾊﾁﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.kita,
          hanbaiten_id: hb.dm002,
          shikuchoson: 'Quận Kita',
          chome_banchi: '8-8-8',
          ...koza('002'),
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: yesterday,
            overrides: { dokusya_busu: 0, dokusya_chushi_date: yesterday },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm002 },
          },
        ],
      },

      /* DM09 現金九郎 — 現金集金なので SCR-020 から外れる。DM001 の部数を 3 稼ぐ。 */
      {
        tag: 'DM09',
        sei: '現金',
        mei: '九郎',
        kanaSei: 'ｹﾞﾝｷﾝ',
        kanaMei: 'ｸﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm001,
          dokusya_busu: 3,
        }),
        steps: [{ joho: startDate, shinki: true, zougen: true }],
      },

      /* DM10 廃店十郎 — 増減はあるのに販売店が廃店なので帳票から落ちる。TC-028。 */
      {
        tag: 'DM10',
        sei: '廃店',
        mei: '十郎',
        kanaSei: 'ﾊｲﾃﾝ',
        kanaMei: 'ｼﾞｭｳﾛｳ',
        base: paperBase({
          kanri_shiten_id: ks.chuo,
          hanbaiten_id: hb.dm003,
        }),
        steps: [
          { joho: startDate, shinki: true, zougen: true },
          {
            joho: nextMonth,
            overrides: { dokusya_busu: 5 },
            zougen: true,
            zenkai: { zenkai_dokusya_busu: 1, zenkai_hanbaiten_id: hb.dm003 },
          },
        ],
      },
    ];

    const actor = String(hontenId);

    for (const r of readers) {
      const name = {
        shimei_sei: r.sei,
        shimei_mei: r.mei,
        shimei_kana_sei: r.kanaSei,
        shimei_kana_mei: r.kanaMei,
      };
      const first = { ...r.base, ...name, ...(r.steps[0].overrides ?? {}) };

      // master は後段の recomputeMaster が履歴から上書きする。ここでは
      // NOT NULL を満たす種を置くだけ。
      const dokusyaId = await insertReturning(
        m,
        't_dokusya',
        {
          ...first,
          joho_henko_tekiyo_date: r.steps[0].joho,
          rireki_no: 1,
          created_by: actor,
          updated_by: actor,
        },
        'dokusya_id',
      );

      for (const [i, step] of r.steps.entries()) {
        await insertReturning(
          m,
          't_dokusya_rireki',
          {
            ...r.base,
            ...name,
            ...(step.overrides ?? {}),
            ...(step.zenkai ?? {}),
            dokusya_id: dokusyaId,
            rireki_no: i + 1,
            joho_henko_tekiyo_date: step.joho,
            saishin_data_flg: false, // recomputeMaster が立て直す
            zougen_hokoku_flg: step.zougen ?? false,
            shinki_flg: step.shinki ?? false,
            kaiyaku_flg: step.kaiyaku ?? false,
            torikeshi_flg: false,
            created_by: step.createdBy ?? actor,
          },
          'dokusya_rireki_id',
        );
      }

      // 実装と同じ関数に master を計算させる（手計算しない）。
      await recomputeMaster(m, dokusyaId, today, actor);
      console.log(
        `[seed:demo]   ${r.tag} ${r.sei}${r.mei} — 履歴 ${r.steps.length} 行 (dokusya_id=${dokusyaId})`,
      );
    }

    /* ── 8. 画面に入力する日付を表示 ──────────────────────────────── */
    console.log('');
    console.log(`[seed:demo] 完了。JA Demo (ja_id=${jaId}) / 購読者 10 名`);
    console.log('[seed:demo] ── 画面に入力する日付 ──────────────────');
    console.log(`  SCR-020 / SCR-021  対象年月 : ${thisMonth}`);
    console.log(`  SCR-026            基準日   : ${today}`);
    console.log(`  SCR-028 / SCR-029  適用日   : ${nextMonth}`);
    console.log(`  TC-016 再契約      購読開始日: ${monthStart(today, 2)}`);
    console.log('[seed:demo] ── ログイン ────────────────────────────');
    console.log(`  demo_honten / ${DEMO_PASSWORD}  (JA本店)`);
    console.log(`  demo_shiten / ${DEMO_PASSWORD}  (JA管理支店)`);
  });

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('[seed:demo] 失敗:', err);
  process.exit(1);
});
