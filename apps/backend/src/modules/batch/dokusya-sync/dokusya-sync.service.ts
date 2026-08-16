import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';

import { SystemActor } from '@/common/constants/system-actor.constant';
import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import {
  applyChange,
  insertScheduledKaiyaku,
  revokeScheduledKaiyaku,
} from '@/modules/dokusya/dokusya-history.writer';
import { loadActiveKaiyakuRow } from '@/modules/dokusya/dokusya-history.query';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DenshiSyncState } from '@/database/entities/denshi-sync-state.entity';
import {
  DenshiShoninStatus,
  DokusyaShubetsu,
  ShiharaiHoho,
  TetsuzukiShurui,
} from '@/common/enums';
import { HANBAITEN_DUMMY_CODE } from '@/common/constants/hanbaiten-dummy.constant';
import { todayIsoJst } from '@/common/utils/datetime';
import type { BatchJob } from '@/batch/batch-job.interface';
import type { DateOnly, DokusyaFields } from '@/modules/dokusya/dokusya-history.types';

import {
  mapUserToDokusyaFields,
  normalizePaymentYm,
  paymentEndYmToChushiDate,
  DENSHI_STATUS_KAIYAKU,
  type DenshiUserRow,
  type DenshiFkResolution,
} from './dokusya-sync.mapper';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { logBatchRun } from '../batch-run-audit';

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

/** t_log.gamen_name。実行体を追えるよう npm script 名を添える。 */
const BATCH_SCREEN = '電子版読者同期バッチ (dokusya-sync)';

/**
 * #57986: 電子版側の payment_end_ym 変更で既存の解約予約行の中止日を差し替える
 * 際、旧予約行の取消理由（対象行・打ち消し行の両方の biko に記録される）。
 */
const KAIYAKU_REVOKE_REASON_SYNC = '購読中止日の変更（電子版同期 #57986）';

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
    private readonly auditLog: AuditLogService,
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
    const summary = {
      ...counts,
      pages,
      full_sync: fullSync,
      stopped: stop ?? 'done',
    };
    this.logger.log({ event: 'dokusya_sync.summary', ...summary });

    // 実行サマリを t_log へ 1 行（顧客要望 2026-08）。
    // 行単位の監査ではないので「どの購読者がどう変わったか」までは追えない。
    // まずは「いつ・何件動いたか」を DB に残し、CloudWatch を見られない
    // 運用者でも実行痕跡を追えるようにする段階的対応。
    // counts.failed > 0 なら WARNING（個々の失敗は record_error のログを参照）。
    await logBatchRun(this.auditLog, {
      screen: BATCH_SCREEN,
      // 実行者名は t_dokusya_rireki.created_by と同じ値。監査列と突き合わせて
      // 「この行は同期バッチが書いた」と辿れるようにする。
      operation: '電子版読者同期',
      actor: SystemActor.DENSHI_SYNC,
      table: 't_dokusya',
      summary,
      hasFailure: counts.failed > 0,
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
    // #57986: Denshiban 側で実削除済み（deleted_at 有）の行は取り込み対象外。
    // 解約(status=9)の反映は payment_end_ym ベースの中止日算出＋予約行作成で
    // 完結しており、実削除された行を読み直す必要はない（読んでも既存の Cloud
    // skip ガードで無害だったが、無駄な行を1件ずつ FK 解決するコストを避ける）。
    const notDeletedFilter = `deleted_at IS NULL`;
    const chg = 'COALESCE(updated_at, created_at)';

    const where: string[] = [
      `${campaignFilter} AND ${eligibilityFilter} AND ${notDeletedFilter}`,
    ];
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
    // 販売店は 電子版単独 / 併読 とも当該 JA のダミー販売店
    // （hanbaiten_code=9999999999）を割り当てる。電子版側の ShopCd は参照しない
    // （顧客要件 2026-08）。紙の配達担当は cloud 側で SCR-011 / SCR-017 から
    // 設定する運用に統一するため、同期は販売店を決めない。
    //
    // ダミーが未整備の JA は null のまま取り込む（hanbaiten_id は NULL 許容）。
    // 行を落とすと watermark が止まり後続の正常行まで巻き添えになるため、
    // 取り込みは通し、運用が気付けるよう JA 単位で 1 回だけ警告する。
    let hanbaitenId =
      hanbaitenMap.get(`${kanri.jaId}:${HANBAITEN_DUMMY_CODE}`) ?? null;
    if (hanbaitenId === null && !warnedNoDummyJa.has(kanri.jaId)) {
      warnedNoDummyJa.add(kanri.jaId);
      this.logger.warn({
        event: 'dokusya_sync.no_dummy_hanbaiten',
        ja_id: kanri.jaId,
        hanbaiten_code: HANBAITEN_DUMMY_CODE,
        note: 'この JA の同期読者は販売店未設定(NULL)で取り込む。ダミー販売店を登録すること。',
      });
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
      let existing = await m.findOne(Dokusya, {
        where: { denshiKaiinId },
      });

      // ── email フォールバック照合（顧客要件 2026-08 追補）─────────────
      // denshi_kaiin_id で見つからない場合、cloud 側で先に手動登録された
      // 電子版/併読読者（campaign 単価などで denshi_kaiin_id が未設定のまま
      // 残っている行）を email で拾い、二重登録を防ぐ。
      //   - スコープは assertEmailUnique と同じ: 電子版/併読・削除済み除外。
      //   - denshi_kaiin_id が既に設定済みの行は対象外（別の会員に紐付け済み
      //     の行を奪わない）— 未設定行のみ拾う。
      //   - email の一意性は SCR-011 側で担保済み（同スコープ）なので通常
      //     複数該当しないが、念のため最新作成行を採用する。
      if (!existing && hasValue(u.email)) {
        const emailMatch = await m
          .createQueryBuilder(Dokusya, 'd')
          .where(
            `d.email = :email AND d.deleted_at IS NULL
               AND d.dokusya_shubetsu IN (:...digital)
               AND d.denshi_kaiin_id IS NULL`,
            {
              email: String(u.email),
              digital: [DokusyaShubetsu.DIGITAL, DokusyaShubetsu.BOTH],
            },
          )
          .orderBy('d.created_at', 'DESC')
          .getOne();
        if (emailMatch) {
          await m.update(
            Dokusya,
            { dokusyaId: emailMatch.dokusyaId },
            { denshiKaiinId },
          );
          existing = { ...emailMatch, denshiKaiinId };
          this.logger.log({
            event: 'dokusya_sync.matched_by_email',
            dokusya_id: emailMatch.dokusyaId,
            denshi_kaiin_id: denshiKaiinId,
          });
        }
      }

      // ── 解約（status=9）─────────────────────────────────────────────
      if (status === DENSHI_STATUS_KAIYAKU) {
        await this.handleKaiyaku(m, existing, u, values, denshiKaiinId, johoDate, actor, counts);
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
   * 解約（status=9）の分岐 — #57986。tetsuzuki_shurui=解約(0)・kaiyaku_flg=true は
   * もうこの同期からは直接書かない。解約の確定（Phase2）は既存の夜間バッチ
   * （dokusya-apply-due / insertKaiyaku）に一本化し、ここでは中止日を Cloud 側へ
   * 反映する（予約 Phase1）だけに留める — 到来日判定・tetsuzuki/kaiyaku_flg の確定は
   * 夜間バッチの責務のまま変えない。
   *
   * master は論理削除しない（顧客要件 2026-08）。以前はここで softDelete していたが、
   * SCR-014 の購読停止は「予約」でありその時点で電子版へ cancel を push する
   * （DokusyaService.stop）。電子版は受信と同時に status=9 になるため、中止日が未来
   * でも次の同期でこの分岐に入り、master が即座に消えていた（予約したのに一覧から
   * 居なくなる）。
   *
   * 中止日は payment_end_ym（支払済み最終月）から算出する。users.deleted_at は
   * 使わない — 未来日解約は Denshiban 側で status=9 に切り替わった時点ではまだ実削除
   * されておらず deleted_at が NULL のままなので、中止日を正しく表せない（2026-08
   * 実データで確認）。なお実削除済み（deleted_at 有）の行は fetchPage で既に除外して
   * いる。
   */
  private async handleKaiyaku(
    m: EntityManager,
    existing: Dokusya | null,
    u: DenshiUserRow,
    values: DokusyaFields,
    denshiKaiinId: number,
    johoDate: string,
    actor: string,
    counts: SyncCounts,
  ): Promise<void> {
    const paymentEndYm = normalizePaymentYm(u.payment_end_ym);
    const currentYm = todayIsoJst().replaceAll('-', '').slice(0, 6);
    if (paymentEndYm === null || paymentEndYm < currentYm) {
      // 支払済み期間がすでに完全に過去（今月より前）— 対象外とし、
      // 中止日・tetsuzuki_shurui・kaiyaku_flg のいずれにも触れない。
      counts.skipped++;
      this.logger.warn({
        event: 'dokusya_sync.skip_kaiyaku_stale_payment_end_ym',
        denshi_kaiin_id: denshiKaiinId,
        payment_end_ym: u.payment_end_ym,
      });
      return;
    }
    const chushiDate = paymentEndYmToChushiDate(paymentEndYm);
    if (chushiDate === null) {
      counts.skipped++;
      return;
    }

    // tetsuzuki_shurui / kaiyaku_flg は夜間バッチ専用列 — この同期では一切触らず、
    // 前回値を carry-forward させる（キー自体を除外する）。
    const { tetsuzukiShurui: _tetsuzukiShurui, kaiyakuFlg: _kaiyakuFlg, ...otherValues } =
      values;

    if (!existing) {
      await this.createAlreadyKaiyaku(m, otherValues, denshiKaiinId, johoDate, actor, chushiDate, counts);
      return;
    }

    await this.rireki.lockDokusyaRow(m, existing.dokusyaId);
    const filtered = this.ownedByCloudFiltered(otherValues, existing);

    // ロック取得後に読み直す（DokusyaService.stop と同じ理由 — ガードした状態と
    // 実際に revoke する行を一致させる。並行更新で予約が消えていた場合は
    // active=null になり、下の「予約なし」分岐が自然に対応する）。
    const active = await loadActiveKaiyakuRow(m, existing.dokusyaId);

    if (active && !active.kaiyakuFlg && active.dokusyaChushiDate !== chushiDate) {
      // Case 1: 既存の予約行はあるが中止日が変わった（payment_end_ym の変更を
      // 反映）。旧予約行を赤伝で無効化してから、新しい中止日で予約を作り直す
      // （DokusyaService.stop の変更経路と同じパターン — 単純な UPDATE で
      // 中止日を上書きするのではなく、旧履歴を取消して新履歴を積む）。
      await revokeScheduledKaiyaku(
        m,
        existing.dokusyaId,
        active,
        KAIYAKU_REVOKE_REASON_SYNC,
        actor,
      );
      await applyChange(m, {
        mode: 'UPDATE',
        dokusyaId: existing.dokusyaId,
        values: filtered,
        johoDate,
        source: 'BATCH',
        actor,
      });
      await insertScheduledKaiyaku(m, {
        dokusyaId: existing.dokusyaId,
        chushiDate,
        shubetsu: existing.dokusyaShubetsu,
        actor,
      });
      counts.cancelled++;
      return;
    }

    if (!active) {
      // Case 2: Cloud には既に読者は存在するが、まだ予約が無い（Denshiban 側で
      // 先に発生していた解約に、この同期で初めて追従する）。先に他の情報変更が
      // あれば通常の更新行として反映し（無ければ no-op）、その後に解約予約行
      // （Phase1）を作る。
      await applyChange(m, {
        mode: 'UPDATE',
        dokusyaId: existing.dokusyaId,
        values: filtered,
        johoDate,
        source: 'BATCH',
        actor,
      });
      await insertScheduledKaiyaku(m, {
        dokusyaId: existing.dokusyaId,
        chushiDate,
        shubetsu: existing.dokusyaShubetsu,
        actor,
      });
      counts.cancelled++;
      return;
    }

    // 予約の中止日は既に一致している（または既に確定済み＝夜間バッチ済み）—
    // 予約/確定はそのまま、他の情報だけ更新する。
    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: existing.dokusyaId,
      values: filtered,
      johoDate,
      source: 'BATCH',
      actor,
    });
    if (res.insertedRirekiIds.length > 0) counts.cancelled++;
    else counts.unchanged++;
  }

  /**
   * Cloud にまだ全く存在しない読者が、初回同期の時点で既に解約済み（Denshiban
   * 側で入会〜解約が完結した履歴）— 2件の履歴行を作る: 1件目は新規行、2件目は
   * 解約予約行（Phase1）。
   */
  private async createAlreadyKaiyaku(
    m: EntityManager,
    otherValues: DokusyaFields,
    denshiKaiinId: number,
    johoDate: string,
    actor: string,
    chushiDate: DateOnly,
    counts: SyncCounts,
  ): Promise<void> {
    // 購読開始日が無ければ通常の CREATE と同じ理由で作成不可なので skip する。
    if (!otherValues.shokiDokusyaKaishiDate) {
      counts.skipped++;
      this.logger.warn({
        event: 'dokusya_sync.skip_no_kaishi_date',
        denshi_kaiin_id: denshiKaiinId,
        note: 'activated_at / application_date / created_at がすべて空',
      });
      return;
    }
    // 1件目: 新規行（tetsuzuki_shurui=新規で作成 — CREATE には carry-forward 元の
    // before が無いため、解約由来の値をそのまま渡すと初回行が解約扱いになって
    // しまう。明示的に新規で上書きする）。
    const res = await applyChange(m, {
      mode: 'CREATE',
      values: { ...otherValues, tetsuzukiShurui: TetsuzukiShurui.SHINKI },
      johoDate,
      source: 'BATCH',
      actor,
    });
    await m.update(Dokusya, { dokusyaId: res.dokusyaId }, { denshiKaiinId });
    // 2件目: 解約予約行（Phase1）。tetsuzuki_shurui=解約への確定は夜間バッチに
    // 任せる（handleKaiyaku 冒頭のコメント参照）。
    await insertScheduledKaiyaku(m, {
      dokusyaId: res.dokusyaId,
      chushiDate,
      shubetsu: Number(otherValues.dokusyaShubetsu),
      actor,
    });
    counts.created++;
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
