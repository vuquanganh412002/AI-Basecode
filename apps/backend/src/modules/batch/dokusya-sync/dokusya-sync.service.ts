import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { SystemActor } from '@/common/constants/system-actor.constant';
import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DenshiSyncState } from '@/database/entities/denshi-sync-state.entity';
import { DenshiShoninStatus, ShiharaiHoho } from '@/common/enums';
import { HANBAITEN_DUMMY_CODE } from '@/common/constants/hanbaiten-dummy.constant';
import { todayIsoJst } from '@/common/utils/datetime';
import type { BatchJob } from '@/batch/batch-job.interface';
import type { DokusyaFields } from '@/modules/dokusya/dokusya-history.types';

import {
  mapUserToDokusyaFields,
  DENSHI_STATUS_KAIYAKU,
  type DenshiUserRow,
  type DenshiFkResolution,
} from './dokusya-sync.mapper';

/** advisory lock キー（本バッチ専用の固定値・多重起動防止）。 */
const SYNC_LOCK_KEY = 4210010;
/** バッチ識別名（t_denshi_sync_state.batch_name）。 */
const BATCH_NAME = 'dokusya-sync';
/**
 * 1 ページの取得件数（keyset ページング）。差分が尽きるまで反復するので、これは
 * 「1 クエリで MySQL から引く行数」であって 1 実行の上限ではない（plan §2.2）。
 */
export const PAGE_SIZE = 1_000;
/**
 * 1 実行で処理する最大件数（暴走ガード）。到達時は watermark を安全側に丸めて中断し、
 * 残りは次回実行が続きから読む。通常運用で到達しない値にしてある。
 */
const MAX_ROWS_PER_RUN = 500_000;

interface SyncCounts {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number; // JACd 未解決でスキップ
  cancelled: number;
  failed: number;
}

/** JACd（ハイフン除去済み）→ 管理支店/JA。 */
type KanriShitenMap = Map<string, { kanriShitenId: number; jaId: number }>;
/** `${jaId}:${hanbaiten_code}` → hanbaiten_id。 */
type HanbaitenMap = Map<string, number>;

/** ページングの読み取り位置（`ORDER BY chg_ts, id` 上の直前行）。 */
/** doSync の停止理由。null = 差分を読み切った（正常完走）。 */
type SyncStop = 'blocked' | 'cap';

interface PageCursor {
  ts: Date;
  id: number;
}

/**
 * 読者同期バッチ（電子版 → cloud, pull 片方向）。電子版 `cmsDB.users` の差分を取得し
 * `t_dokusya`/`t_dokusya_rireki` に取り込む。突合キー: `users.id ↔ denshi_kaiin_id`。
 * 履歴は共通ライタ `applyChange`（source='BATCH', joho=当日）に集約。
 * 10分間隔で EventBridge → ECS RunTask が `run()` を起動。多重起動は PostgreSQL
 * advisory lock で自衛（前回実行中なら skip）。plan: dokusya-sync-implementation-plan.md。
 *
 * 取得は `(chg_ts, id)` の keyset ページング（{@link PAGE_SIZE} 件/クエリ）で
 * **差分が尽きるまで反復**する。件数上限で打ち切らないので、`DENSHIBAN_FULL_SYNC=true`
 * の全件リコンサイルは users テーブルが何万件でも最後まで走査する。
 */
@Injectable()
export class DokusyaSyncService implements BatchJob {
  private readonly logger = new Logger(DokusyaSyncService.name);

  constructor(
    private readonly denshibanDb: DenshibanDbService,
    private readonly rireki: DokusyaRirekiService,
    @InjectDataSource() private readonly mainDb: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({ event: 'dokusya_sync.start' });

    // ── 多重起動防止（advisory lock。前回実行中なら skip）─────────────
    const lockQr = this.mainDb.createQueryRunner();
    await lockQr.connect();
    try {
      const [{ locked }] = (await lockQr.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [SYNC_LOCK_KEY],
      )) as [{ locked: boolean }];
      if (!locked) {
        this.logger.warn({
          event: 'dokusya_sync.skip',
          reason: 'previous run still in progress',
        });
        return;
      }
      try {
        await this.doSync();
      } finally {
        await lockQr.query('SELECT pg_advisory_unlock($1)', [SYNC_LOCK_KEY]);
      }
    } catch (err) {
      this.logger.error({
        event: 'dokusya_sync.error',
        message: (err as Error).message,
      });
      throw err;
    } finally {
      await lockQr.release();
      this.logger.log({
        event: 'dokusya_sync.done',
        durationMs: Date.now() - startedAt,
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  private async doSync(): Promise<void> {
    const fullSync =
      this.configService.get<boolean>('denshiban.fullSync') === true;
    const state = await this.loadState();
    const [kanriMap, hanbaitenMap] = await this.loadFkMaps();

    const counts: SyncCounts = {
      read: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      cancelled: 0,
      failed: 0,
    };

    // ── watermark の前進管理 ───────────────────────────────────────────
    // 初期値は保存済み値。full-sync は古い行から読むため、ここから後退させない。
    let safeId = Number(state.lastSourceId ?? 0);
    let safeTs = state.lastSourceUpdatedAt ?? new Date(0);
    // 前進は **chg_ts グループ単位**でコミットする。差分条件は
    // `id > wId OR chg_ts > wTs` で両方 strict なので、同じ chg_ts を持つ行の途中で
    // 中断すると「chg_ts は watermark 以下・id も（別グループの大きな id に負けて）
    // watermark 以下」の未処理行が生まれ、二度と差分に乗らない。行ごとの max() では
    // なくグループ完了時にだけコミットし、中断時は最終グループを捨てることで、
    // 未処理行は必ず `chg_ts > wTs` で再取得される。
    // （2026-07-29 実データ検証: 失敗行を追い越して 95 件が恒久 miss した事象の一般化。）
    let groupTs: Date | null = null;
    let groupMaxId = 0;
    const commitGroup = (): void => {
      if (groupTs === null) return;
      if (groupTs.getTime() > safeTs.getTime()) safeTs = groupTs;
      if (groupMaxId > safeId) safeId = groupMaxId;
      groupTs = null;
      groupMaxId = 0;
    };
    // 昇順なので「別の chg_ts が来た＝前のグループは完了」。
    const commitIfNewGroup = (ts: Date): void => {
      if (groupTs !== null && ts.getTime() !== groupTs.getTime()) commitGroup();
    };

    // ダミー販売店が未整備の JA を記録し、警告を 1 実行 1 JA に抑える
    // （数万件の電子版読者がいる JA だと行ごとに出すとログが溢れる）。
    const warnedNoDummyJa = new Set<number>();

    // 1行ぶんの処理。watermark の前進は「グループ完了」時だけなので、
    // 呼び出し側（processPage）へ判定結果を返して制御を任せる。
    const handleRow = async (u: DenshiUserRow): Promise<'ok' | 'failed'> => {
      const id = Number(u.id);
      const ts: Date = this.chgTs(u) ?? groupTs ?? safeTs;
      try {
        await this.upsertOne(u, kanriMap, hanbaitenMap, counts, warnedNoDummyJa);
      } catch (err) {
        // 失敗行のグループは未コミットのまま残し、次回必ず読み直させる。
        commitIfNewGroup(ts);
        counts.failed++;
        this.logger.error({
          event: 'dokusya_sync.record_error',
          denshi_kaiin_id: u.id,
          message: (err as Error).message,
        });
        return 'failed';
      }
      // skip 行は「業務判断で取り込まない」と決めた行なので前進してよい
      // （マスタ整備後の取込は全件同期で拾う）。
      commitIfNewGroup(ts);
      groupTs = ts;
      if (Number.isFinite(id) && id > groupMaxId) groupMaxId = id;
      return 'ok';
    };

    // 1ページぶんを処理し、停止理由（あれば）と読み取り位置を返す。
    const processPage = async (
      rows: DenshiUserRow[],
      startCursor: PageCursor | null,
    ): Promise<{ cursor: PageCursor | null; stop: SyncStop | null }> => {
      let cursor = startCursor;
      let stop: SyncStop | null = null;
      for (const u of rows) {
        const ts: Date = this.chgTs(u) ?? groupTs ?? safeTs;
        // 読み取り位置は成否に関わらず進める（同じページを再取得しないため）。
        cursor = { ts, id: Number(u.id) };

        if (counts.read >= MAX_ROWS_PER_RUN) {
          commitIfNewGroup(ts); // 未処理行のグループは残す
          stop = 'cap';
          break;
        }
        counts.read++;

        const result = await handleRow(u);
        // 失敗後も同一ページの残りは診断目的で処理を続けるが、watermark は
        // 進めない（失敗行を追い越さない）。
        if (result === 'failed') stop = 'blocked';
      }
      return { cursor, stop };
    };

    let cursor: PageCursor | null = null;
    let stop: SyncStop | null = null;
    let pages = 0;

    // ── ページング: 差分が尽きるまで反復（plan §2.2）─────────────────────
    while (stop === null) {
      const rows = await this.fetchPage(state, fullSync, cursor);
      pages++;
      if (rows.length === 0) break;

      const page = await processPage(rows, cursor);
      cursor = page.cursor;
      if (page.stop !== null) {
        stop = page.stop;
        break;
      }
      // 端数ページ＝差分を読み切った。
      if (rows.length < PAGE_SIZE) break;
    }

    // 完走したときだけ最終グループをコミットする。
    if (stop === null) commitGroup();

    if (stop === 'cap') {
      this.logger.warn({
        event: 'dokusya_sync.cap_hit',
        cap: MAX_ROWS_PER_RUN,
        note: '上限到達。残りは次回実行が続きから読む。',
      });
    }

    await this.saveState(safeId, safeTs);
    this.logger.log({
      event: 'dokusya_sync.summary',
      ...counts,
      pages,
      full_sync: fullSync,
      stopped: stop ?? 'done',
    });
  }

  // ── state（watermark）────────────────────────────────────────────────
  private async loadState(): Promise<DenshiSyncState> {
    const repo = this.mainDb.getRepository(DenshiSyncState);
    let state = await repo.findOne({ where: { batchName: BATCH_NAME } });
    if (!state) {
      // migration の初期行が無い環境でも自己修復する。
      state = repo.create({ batchName: BATCH_NAME });
      await repo.save(state);
    }
    return state;
  }

  private async saveState(maxId: number, maxTs: Date): Promise<void> {
    await this.mainDb.getRepository(DenshiSyncState).update(
      { batchName: BATCH_NAME },
      {
        lastSourceId: String(maxId),
        lastSourceUpdatedAt: maxTs,
        lastRunAt: new Date(),
      },
    );
  }

  // ── FK 解決マップ（自社 PostgreSQL から一括ロード）────────────────────
  private async loadFkMaps(): Promise<[KanriShitenMap, HanbaitenMap]> {
    const kanriRows: Array<{
      kanri_shiten_id: string;
      ja_id: string;
      kanri_shiten_code: string;
    }> = await this.mainDb.query(
      `SELECT kanri_shiten_id, ja_id, kanri_shiten_code
         FROM m_kanri_shiten WHERE deleted_at IS NULL`,
    );
    const kanriMap: KanriShitenMap = new Map();
    for (const r of kanriRows) {
      // JACd 突合はハイフン除去して行う（顧客要件 2026-07）。
      const key = normalizeJacd(r.kanri_shiten_code);
      if (key) {
        kanriMap.set(key, {
          kanriShitenId: Number(r.kanri_shiten_id),
          jaId: Number(r.ja_id),
        });
      }
    }

    const hanbaitenRows: Array<{
      hanbaiten_id: string;
      ja_id: string;
      hanbaiten_code: string;
    }> = await this.mainDb.query(
      `SELECT hanbaiten_id, ja_id, hanbaiten_code
         FROM m_hanbaiten WHERE deleted_at IS NULL`,
    );
    const hanbaitenMap: HanbaitenMap = new Map();
    for (const r of hanbaitenRows) {
      hanbaitenMap.set(
        `${Number(r.ja_id)}:${r.hanbaiten_code}`,
        Number(r.hanbaiten_id),
      );
    }
    return [kanriMap, hanbaitenMap];
  }

  // ── 電子版 users 差分取得（MySQL 読み取り専用・短命接続）──────────────
  private chgTs(u: DenshiUserRow): Date | null {
    const v = u.chg_ts ?? u.updated_at ?? u.created_at;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    if (v === null || v === undefined || v === '') return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /**
   * 1 ページ分の対象行を取得する（`ORDER BY chg_ts, id` 昇順・`LIMIT PAGE_SIZE`）。
   *
   * - 抽出条件（キャンペーン除外 AND 取込対象条件）は差分/全件とも常に適用。
   * - `fullSync=false` は watermark 条件を追加（差分）。`true` は付けない（全件）。
   * - `cursor` は同一実行内のページ送り。`(chg_ts, id)` の keyset なので、同じ
   *   chg_ts が PAGE_SIZE をまたいでも取りこぼさない（OFFSET は使わない）。
   *
   * 接続は 1 ページ 1 接続（`withConnection` が都度 destroy）。バッチ全体で 1 本を
   * 保持すると PostgreSQL 側の長い書込みの間 MySQL が idle になり wait_timeout /
   * NAT 切断を踏むため、意図的にページ単位で開閉する。
   */
  private async fetchPage(
    state: DenshiSyncState,
    fullSync: boolean,
    cursor: PageCursor | null,
  ): Promise<DenshiUserRow[]> {
    // キャンペーン読者（Campagna_flg が立つ）は取込除外（顧客要件 2026-07）。
    const campaignFilter = `(Campagna_flg IS NULL OR Campagna_flg IN ('', '0'))`;
    // 取込対象条件（顧客要件）: 収集中(collecting=1) または
    // treatment=1 かつ クレジットカード払い の会員のみ同期する。
    // どちらにも該当しない会員は取り込まない。
    // ※ 電子版 payment_id は cloud の支払方法コードと同一体系（mapper の
    //   mapShiharai と同じ前提）なので ShiharaiHoho をそのまま使える。
    const eligibilityFilter =
      `(collecting = 1 OR (treatment = 1 AND payment_id = ${ShiharaiHoho.CREDIT_CARD}))`;
    const chg = 'COALESCE(updated_at, created_at)';

    const where: string[] = [`${campaignFilter} AND ${eligibilityFilter}`];
    const params: unknown[] = [];

    if (!fullSync) {
      // 差分: 新規(id 進行) OR 更新(chg_ts 進行)。id は AUTO_INCREMENT のため
      // created_at を遡って挿入された行も拾える保険になる。
      where.push(`( id > ? OR ${chg} > ? )`);
      params.push(
        String(state.lastSourceId ?? '0'),
        state.lastSourceUpdatedAt ?? new Date(0),
      );
    }
    if (cursor) {
      where.push(`( ${chg} > ? OR (${chg} = ? AND id > ?) )`);
      params.push(cursor.ts, cursor.ts, cursor.id);
    }
    params.push(PAGE_SIZE);

    return this.denshibanDb.withConnection((ds) =>
      ds.query(
        `SELECT *, ${chg} AS chg_ts FROM users
           WHERE ${where.join(' AND ')}
           ORDER BY ${chg} ASC, id ASC
           LIMIT ?`,
        params,
      ),
    );
  }

  // ── 1 行の upsert（CREATE / UPDATE / 解約）───────────────────────────
  private async upsertOne(
    u: DenshiUserRow,
    kanriMap: KanriShitenMap,
    hanbaitenMap: HanbaitenMap,
    counts: SyncCounts,
    /** ダミー販売店が無い JA。1 実行 1 JA につき 1 回だけ警告するための既出集合。 */
    warnedNoDummyJa: Set<number>,
  ): Promise<void> {
    // FK 解決: JACd（ハイフン除去）→ 管理支店/JA。未解決は作成不可なので skip。
    const jacd = normalizeJacd(String(u.JACd ?? ''));
    const kanri = jacd ? kanriMap.get(jacd) : undefined;
    if (!kanri) {
      counts.skipped++;
      this.logger.warn({
        event: 'dokusya_sync.skip_no_ja',
        denshi_kaiin_id: u.id,
        jacd: u.JACd,
      });
      return;
    }

    const status = Number(u.status);
    const isHeidoku = hasValue(u.paper_permission_dt);
    // 販売店の解決:
    //   併読       → 紙を配達するので ShopCd を m_hanbaiten で実店に解決。
    //   電子版単独 → 配達が無いので当該 JA のダミー販売店
    //                （hanbaiten_code=9999999999・顧客要件2026-08）。
    // ダミーが未整備の JA は null のまま取り込む（hanbaiten_id は NULL 許容）。
    // 行を落とすと watermark が止まり後続の正常行まで巻き添えになるため、
    // 取り込みは通し、運用が気付けるよう JA 単位で 1 回だけ警告する。
    //
    // ※ 併読で ShopCd が解決できない場合にダミーへ倒さないのは、ダミーが
    //   「配達先の販売店が無い」を意味するため。紙を配る読者に付けると
    //   増減連絡票・名簿の配達担当が誤る。SCR-011 の候補絞り込み
    //   （電子版=ダミーのみ / それ以外=ダミー除外）とも一致する。
    let hanbaitenId: number | null;
    if (isHeidoku) {
      hanbaitenId =
        hanbaitenMap.get(`${kanri.jaId}:${String(u.ShopCd ?? '')}`) ?? null;
    } else {
      hanbaitenId =
        hanbaitenMap.get(`${kanri.jaId}:${HANBAITEN_DUMMY_CODE}`) ?? null;
      if (hanbaitenId === null && !warnedNoDummyJa.has(kanri.jaId)) {
        warnedNoDummyJa.add(kanri.jaId);
        this.logger.warn({
          event: 'dokusya_sync.no_dummy_hanbaiten',
          ja_id: kanri.jaId,
          hanbaiten_code: HANBAITEN_DUMMY_CODE,
          note: 'この JA の電子版単独読者は販売店未設定(NULL)で取り込む。ダミー販売店を登録すること。',
        });
      }
    }

    const fk: DenshiFkResolution = {
      jaId: kanri.jaId,
      kanriShitenId: kanri.kanriShitenId,
      hanbaitenId,
    };
    const values = mapUserToDokusyaFields(u, fk);
    const denshiKaiinId = Number(u.id);
    const johoDate = todayIsoJst();
    // 監査列に入る実行者名。t_dokusya_rireki の最古行(rireki_no=1)の created_by を
    // 見て「クラウド版で作成された電子版読者」と区別するための判別キーでもある
    // （顧客要件 2026-08）。表示ラベルではないので勝手に変えないこと。
    const actor: string = SystemActor.DENSHI_SYNC;

    await this.mainDb.transaction(async (m) => {
      const existing = await m.findOne(Dokusya, {
        where: { denshiKaiinId },
      });

      // ── 解約（status=9）─────────────────────────────────────────────
      if (status === DENSHI_STATUS_KAIYAKU) {
        if (!existing) {
          counts.skipped++; // 未存在の解約は無意味
          return;
        }
        await this.rireki.lockDokusyaRow(m, existing.dokusyaId);
        // 解約: 部数0 + tetsuzuki=解約（mapper が既に tetsuzuki=0 を設定済み）。
        // cloud 所有列（tanka_id 等）は上書きしない。
        await applyChange(m, {
          mode: 'UPDATE',
          dokusyaId: existing.dokusyaId,
          values: { ...this.ownedByCloudFiltered(values, existing), dokusyaBusu: 0 },
          johoDate,
          source: 'BATCH',
          actor,
        });
        // master 論理削除（購読中止日は values.dokusyaChushiDate に反映済み）。
        await m.softDelete(Dokusya, existing.dokusyaId);
        counts.cancelled++;
        return;
      }

      // ── UPDATE（既存）──────────────────────────────────────────────
      if (existing) {
        await this.rireki.lockDokusyaRow(m, existing.dokusyaId);
        const res = await applyChange(m, {
          mode: 'UPDATE',
          dokusyaId: existing.dokusyaId,
          // cloud 所有列は上書きしない（tanka_id / 承認確定済みの denshi_shonin_status）。
          values: this.ownedByCloudFiltered(values, existing),
          johoDate,
          source: 'BATCH',
          actor,
        });
        if (res.insertedRirekiIds.length > 0) counts.updated++;
        else counts.unchanged++;
        return;
      }

      // ── CREATE（新規）──────────────────────────────────────────────
      // 購読開始日が全フォールバック（activated_at→application_date→created_at）
      // でも取れない行は master の NOT NULL 制約で必ず落ちる。例外にすると
      // watermark が止まり後続の正常行まで巻き添えになるため、理由を明示して skip。
      if (!values.shokiDokusyaKaishiDate) {
        counts.skipped++;
        this.logger.warn({
          event: 'dokusya_sync.skip_no_kaishi_date',
          denshi_kaiin_id: denshiKaiinId,
          note: 'activated_at / application_date / created_at がすべて空',
        });
        return;
      }
      const res = await applyChange(m, {
        mode: 'CREATE',
        values,
        johoDate,
        source: 'BATCH',
        actor,
      });
      // denshi_kaiin_id は履歴に無く master 専用列 → 作成後に直接 set する。
      await m.update(Dokusya, { dokusyaId: res.dokusyaId }, { denshiKaiinId });
      counts.created++;
    });
  }

  /**
   * UPDATE 時に **cloud 所有列を電子版値で上書きしない**ためのフィルタ（双方向同期の
   * echo/上書き対策）。該当キーを values から除外すると、applyChange は直前行から
   * carry-forward するため cloud の既存値がそのまま保持される。
   *
   * - `tanka_id`: cloud 側で決定（承認時に画面登録）→ 常に保持。
   * - `denshi_shonin_status`: 電子版 `approval` が基本ソースだが、電子版が
   *   0(未承認) のとき cloud 側で承認/否認を確定する運用。既に cloud が
   *   承認(1)/否認(2) 済みなら、電子版の 0 で差し戻さない（顧客回答 2026-07-27）。
   */
  private ownedByCloudFiltered(
    values: DokusyaFields,
    existing: Dokusya,
  ): DokusyaFields {
    const out: DokusyaFields = { ...values };
    // tanka_id は常に cloud 所有 → 除外して既存値を保持。
    delete out.tankaId;
    // denshi_shonin_status: 電子版=未承認(0) かつ cloud=承認/否認済み なら保持。
    const incoming = out.denshiShoninStatus;
    const current = existing.denshiShoninStatus;
    if (
      incoming === DenshiShoninStatus.PENDING &&
      (current === DenshiShoninStatus.APPROVED ||
        current === DenshiShoninStatus.REJECTED)
    ) {
      delete out.denshiShoninStatus;
    }
    return out;
  }
}

/** JACd / 管理支店コードのハイフン等を除去して突合キーに正規化する。 */
function normalizeJacd(code: string): string {
  return code.replaceAll('-', '').trim();
}

/** 文字列/日付が「値あり」か（空・null・undefined でない）。 */
function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return String(v).trim() !== '';
}
