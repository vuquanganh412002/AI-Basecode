import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { AuditOperation, LogType, ResultStatus } from '@/common/enums';
import { todayIsoJst } from '@/common/utils/datetime';
import {
  BATCH_SCREEN_RECOMPUTE,
  batchAuditCtx,
  resolveJaId,
} from './batch-audit';
import type { BatchStageResult } from './batch-stage-result';

/** 1ループで処理する dokusya_id 件数（メモリ・ロック分散）。keyset(id>cursor)で進める。 */
const CHUNK_SIZE = 500;

/**
 * 情報変更反映バッチ — dokusya-apply-due の第2段。予約情報変更は適用日(joho)が当日
 * 到来した時点で effective 化するので、それを master + saishin_data_flg へ反映する。
 * idempotent（履歴行は追加しない）。1件失敗しても止めず、keyset で CHUNK_SIZE 件ずつ回す。
 *
 * 抽出は「master が古い購読者」だけに絞る（顧客要件 2026-07 / 性能）。以前は未削除の
 * 全購読者を毎晩なめており、実際に反映が要るのはごく一部なのに N 件ぶんのトランザクションを
 * 開いていた。判定は master が持つ (joho_henko_tekiyo_date, rireki_no) — これは
 * mapRirekiToMaster が有効行からコピーした「今 master が指している位置」なので、
 * 「その位置より後ろに、到来済みの履歴行が存在するか」を見れば古いかどうかが分かる。
 * saishin_data_flg を引くための JOIN は不要。
 *
 * **自社クラウド内で完結する**（顧客要件 2026-07）。電子版への update push は行わない。
 * 以前は「本日 effective 化する予約情報変更を持つ電子版/併読」を先に集めて recompute 後に
 * push していたが、その候補集合は当日中なら何度でも同じものが返るため、同日に2回流すと
 * 同じ update を2回送っていた。連携は別途設計し直すため外部 API 呼び出しを取り除く。
 */
@Injectable()
export class DokusyaRecomputeService {
  private readonly logger = new Logger(DokusyaRecomputeService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  async run(): Promise<BatchStageResult> {
    const startedAt = Date.now();
    const today = todayIsoJst();

    let ok = 0;
    let ng = 0;
    let target = 0;
    let cursor = 0;

    for (;;) {
      // 条件 `joho <= 当日`（`= 当日` ではない）なので、バッチが1日落ちても翌晩に
      // そのまま拾い直せる。取りこぼしの自己修復はこの不等号が担保する。
      // master.joho が NULL の行はタプル比較が NULL になり EXISTS が偽になるため、
      // 別枝で必ず対象に含める（そうしないと永久に再計算されない）。
      const rows: { dokusya_id: string }[] = await this.db.query(
        `SELECT d.dokusya_id FROM t_dokusya d
          WHERE d.deleted_at IS NULL
            AND d.dokusya_id > $1
            AND (
              d.joho_henko_tekiyo_date IS NULL
              OR EXISTS (
                SELECT 1 FROM t_dokusya_rireki r
                 WHERE r.dokusya_id = d.dokusya_id
                   AND r.torikeshi_flg = false
                   AND r.joho_henko_tekiyo_date <= $2
                   AND (r.joho_henko_tekiyo_date, r.rireki_no)
                         > (d.joho_henko_tekiyo_date, d.rireki_no)
              )
            )
          ORDER BY d.dokusya_id
          LIMIT ${CHUNK_SIZE}`,
        [cursor, today],
      );
      if (rows.length === 0) break;

      for (const { dokusya_id } of rows) {
        const id = Number(dokusya_id);
        cursor = id;
        target++;
        if (await this.applyOne(id, today)) ok++;
        else ng++;
      }

      if (rows.length < CHUNK_SIZE) break;
    }

    this.logger.log({
      event: 'recompute.done',
      today,
      target,
      ok,
      ng,
      durationMs: Date.now() - startedAt,
    });
    return { ok, ng };
  }

  /**
   * 1購読者の再計算 + 監査ログを 1 トランザクションで実行。成否を bool で返す。
   *
   * 監査ログは **業務値が実際に動いたときだけ**（`changedFields` が非空）書く。
   * ポインタ2列だけの前進は業務変更ではないので対象外 — updated_at を動かさないのと
   * 同じ基準（recomputeMaster の [touch-only-changed]）。ここを無条件にすると、
   * 中身が変わっていない購読者ぶんの t_log が毎晩積み上がる。
   */
  private async applyOne(id: number, today: string): Promise<boolean> {
    try {
      await this.db.transaction(async (m) => {
        const res = await recomputeMaster(m, id, today);
        if (res.changedFields.length === 0) return;
        await this.auditLog.logOperation(
          {
            logType: LogType.SYSTEM, // 人ではなくスケジュール実行
            accountId: null,
            jaId: resolveJaId(res.before, res.after),
            gamenName: BATCH_SCREEN_RECOMPUTE,
            operation: AuditOperation.UPDATE,
            resultStatus: ResultStatus.SUCCESS,
            targetId: id,
            targetTable: 't_dokusya',
            beforeValue: JSON.stringify(res.before),
            afterValue: JSON.stringify(res.after),
          },
          m, // ← 業務書き込みと同一 tx
        );
      });
      return true;
    } catch (err) {
      // tx はロールバック済み。エラーログは manager を渡さず独立接続で残す。
      this.logger.error({
        event: 'recompute.fail',
        dokusyaId: id,
        message: (err as Error).message,
      });
      await this.auditLog.logError(
        batchAuditCtx(BATCH_SCREEN_RECOMPUTE, id),
        AuditOperation.UPDATE,
        err as Error,
      );
      return false;
    }
  }
}
