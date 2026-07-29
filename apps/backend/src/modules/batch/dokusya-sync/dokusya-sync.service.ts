import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { DenshibanDbService } from '@/modules/denshiban/denshiban-db.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DenshiSyncState } from '@/database/entities/denshi-sync-state.entity';
import { DenshiShoninStatus, ShiharaiHoho } from '@/common/enums';
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
/** 1 実行で処理する最大件数（安全上限。超過分は次回/夜間全件で追従）。 */
const MAX_ROWS_PER_RUN = 50_000;

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

/**
 * 読者同期バッチ（電子版 → cloud, pull 片方向）。電子版 `cmsDB.users` の差分を取得し
 * `t_dokusya`/`t_dokusya_rireki` に取り込む。突合キー: `users.id ↔ denshi_kaiin_id`。
 * 履歴は共通ライタ `applyChange`（source='BATCH', joho=当日）に集約。
 * 10分間隔で EventBridge → ECS RunTask が `run()` を起動。多重起動は PostgreSQL
 * advisory lock で自衛（前回実行中なら skip）。plan: dokusya-sync-implementation-plan.md。
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

    const rows = await this.fetchDelta(state, fullSync);
    if (rows.length >= MAX_ROWS_PER_RUN) {
      this.logger.warn({
        event: 'dokusya_sync.cap_hit',
        cap: MAX_ROWS_PER_RUN,
        note: '上限到達。残りは次回実行/夜間全件同期で追従する。',
      });
    }

    const counts: SyncCounts = {
      read: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      cancelled: 0,
      failed: 0,
    };
    let maxId = Number(state.lastSourceId ?? 0);
    let maxTs = state.lastSourceUpdatedAt ?? new Date(0);
    // 最初の失敗行以降は watermark を進めない。rows は (chg_ts, id) 昇順なので、
    // 「失敗行の手前まで」で止めれば次回実行が必ずその行から読み直す。
    //
    // ⚠️ 単純な max() ではダメ（2026-07-29 実データ検証で判明）: 失敗行より後ろの行が
    // 1つでも成功/skip すると watermark がそれを追い越し、失敗行は id も chg_ts も
    // watermark 以下になって**二度と差分に乗らない**（電子版側で更新されない限り恒久
    // miss）。実際 95 件が summary 上 failed→次回 0 件と消え、cloud に存在しないまま
    // になっていた。skip 行は業務判断で取り込まないと決めた行なので進めてよい
    // （マスタ整備後の取り込みは全件同期で拾う）。
    let blocked = false;

    for (const u of rows) {
      counts.read++;
      try {
        await this.upsertOne(u, kanriMap, hanbaitenMap, counts);
      } catch (err) {
        counts.failed++;
        blocked = true;
        this.logger.error({
          event: 'dokusya_sync.record_error',
          denshi_kaiin_id: u.id,
          message: (err as Error).message,
        });
        continue;
      }
      if (blocked) continue; // 失敗行を追い越さない
      const id = Number(u.id);
      const ts = this.chgTs(u);
      if (Number.isFinite(id) && id > maxId) maxId = id;
      if (ts && ts.getTime() > maxTs.getTime()) maxTs = ts;
    }

    await this.saveState(maxId, maxTs);
    this.logger.log({ event: 'dokusya_sync.summary', ...counts });
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

  private async fetchDelta(
    state: DenshiSyncState,
    fullSync: boolean,
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
    // 全クエリ共通の抽出条件（キャンペーン除外 AND 取込対象条件）。
    const baseFilter = `${campaignFilter} AND ${eligibilityFilter}`;
    const chg = 'COALESCE(updated_at, created_at)';

    if (fullSync) {
      // 全件リコンサイル（夜間）。watermark 無視。
      return this.denshibanDb.withConnection((ds) =>
        ds.query(
          `SELECT *, ${chg} AS chg_ts FROM users
             WHERE ${baseFilter}
             ORDER BY ${chg} ASC, id ASC
             LIMIT ?`,
          [MAX_ROWS_PER_RUN],
        ),
      );
    }

    const wId = String(state.lastSourceId ?? '0');
    const wTs = state.lastSourceUpdatedAt ?? new Date(0);
    // 差分: 新規(id 進行) OR 更新(chg_ts 進行)。id は AUTO_INCREMENT のため
    // updated_at が NULL の新規行も拾える。
    return this.denshibanDb.withConnection((ds) =>
      ds.query(
        `SELECT *, ${chg} AS chg_ts FROM users
           WHERE ( id > ? OR ${chg} > ? )
             AND ${baseFilter}
           ORDER BY ${chg} ASC, id ASC
           LIMIT ?`,
        [wId, wTs, MAX_ROWS_PER_RUN],
      ),
    );
  }

  // ── 1 行の upsert（CREATE / UPDATE / 解約）───────────────────────────
  private async upsertOne(
    u: DenshiUserRow,
    kanriMap: KanriShitenMap,
    hanbaitenMap: HanbaitenMap,
    counts: SyncCounts,
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
    // 販売店: 併読は ShopCd を m_hanbaiten で解決。電子版単独はダミー販売店（§9・
    // 具体レコード未確定のため暫定 null）。
    const hanbaitenId = isHeidoku
      ? hanbaitenMap.get(`${kanri.jaId}:${String(u.ShopCd ?? '')}`) ?? null
      : null;

    const fk: DenshiFkResolution = {
      jaId: kanri.jaId,
      kanriShitenId: kanri.kanriShitenId,
      hanbaitenId,
    };
    const values = mapUserToDokusyaFields(u, fk);
    const denshiKaiinId = Number(u.id);
    const johoDate = todayIsoJst();
    const actor = `batch:${BATCH_NAME}`;

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
