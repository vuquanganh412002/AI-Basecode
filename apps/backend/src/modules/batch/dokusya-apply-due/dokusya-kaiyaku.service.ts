import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditOperation, LogType, ResultStatus } from '@/common/enums';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { TetsuzukiShurui } from '@/common/enums/tetsuzuki-shurui.enum';
import { SystemActor } from '@/common/constants/system-actor.constant';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { todayIsoJst } from '@/common/utils/datetime';
import {
  BATCH_SCREEN_KAIYAKU,
  batchAuditCtx,
  resolveJaId,
} from './batch-audit';
import type { BatchStageResult } from './batch-stage-result';

/** 1ループで処理する dokusya_id 件数。第2段 recompute と揃える。 */
const CHUNK_SIZE = 500;

/**
 * 解約確定バッチ — dokusya-apply-due の第1段。購読中止日の到来日に解約行を1件追加し
 * master へ反映（idempotent ヘルパ insertKaiyaku に委譲）。per-row try/catch で
 * 1件失敗しても全体は止めない（が、最後に ng>0 なら呼出し元がバッチ全体を失敗させる）。
 *
 * **自社クラウド内で完結する**（顧客要件 2026-07）。電子版への cancel push は行わない。
 * 以前は解約確定後に電子版へ cancel を push していたが、push が「insertKaiyaku が
 * 実際に行を追加したか」と無関係に実行され、かつ抽出条件（master の
 * dokusya_chushi_date <= 当日）は解約後も真のままなので、解約済みの購読者へ毎晩
 * cancel を送り続けていた（対象は増える一方）。連携は別途設計し直すため、本バッチ
 * からは外部 API 呼び出しを完全に取り除く。
 *
 * 抽出条件（顧客要件 2026-07 改訂）— **全購読種別が対象**:
 *   - 紙版(1)           : dokusya_chushi_date <= 当日   （適用日 = 中止日）
 *   - 電子版(2)/併読(3) : dokusya_chushi_date <  当日   （適用日 = 中止日+1日）
 *   - 支払方法での除外なし（クレカ決済者も対象）
 *
 * 併読は電子版契約を含むので電子版と同じ +1日 扱い。電子版枝が `< 当日` なのは
 * 「適用日(中止日+1)が当日以下」＝「中止日 < 当日」だから。DATE 列なので
 * `<= 当日-1` と完全に等価で、当日を1つ渡すだけで済み yesterday の算出が不要。
 *
 * 以前は「read-only なので対象外」として 併読 と 電子版クレカ を除外していたが、
 * これは誤り。read-only ガード（isDokusyaReadOnly）は「本システムの画面から作成・
 * 編集・停止させない」ためのもので、解約の**確定**まで止める趣旨ではない。中止日は
 * 電子版／第3システムから同期されて入ってくるため、到来日に確定しないと、向こうでは
 * 解約済みなのに cloud だけ購読中のまま永久に残る。本バッチは外部連携を行わない
 * （自社クラウド内で完結する）ので、確定しても相手システムの課金には一切影響しない。
 *
 * 日付分岐は insertKaiyaku の適用日ロジックと対で保つこと（writer の DENSHI_SHUBETSU
 * ＝電子版+併読 が +1日）。片方だけ直すと「抽出はされるが適用日が1日ずれる」状態になる。
 */
@Injectable()
export class DokusyaKaiyakuService {
  private readonly logger = new Logger(DokusyaKaiyakuService.name);

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
      const rows = await this.fetchChunk(today, cursor);
      if (rows.length === 0) break;

      for (const { dokusya_id } of rows) {
        const id = Number(dokusya_id);
        cursor = id;
        target++;
        if (await this.confirmOne(id, today)) ok++;
        else ng++;
      }

      if (rows.length < CHUNK_SIZE) break;
    }

    this.logger.log({
      event: 'kaiyaku.done',
      today,
      target,
      ok,
      ng,
      durationMs: Date.now() - startedAt,
    });
    return { ok, ng };
  }

  /**
   * 抽出。master は予約中の中止日も反映済み（recomputeMaster）なので master 1本で足りる。
   *
   * keyset(`dokusya_id > cursor` + LIMIT)で回す。処理済みの行は tetsuzuki_shurui が
   * 解約に変わり抽出条件から外れるが、それに頼らず id 昇順で前進するので、条件が
   * 変わろうと同じ行を二度読まない。
   *
   * [skip-already-cancelled] `tetsuzuki_shurui <> 解約` で確定済みを除外する。
   * 解約後も dokusya_chushi_date は残り deleted_at も立たないため、この条件が無いと
   * 解約済みの購読者が毎晩ずっと抽出され続け（対象は増える一方）、1件ずつ空の
   * トランザクションを開いては insertKaiyaku の冪等ガードで抜けるだけになる。
   * master に kaiyaku_flg は無く（MASTER_EXCLUDE_FIELDS）、確定済みを見分けられる
   * 唯一の列が tetsuzuki_shurui（buildKaiyakuRow が 0 を立て recomputeMaster が
   * master へ反映）。再購読すると新規行が 1 に戻すので、再び停止予約できる。
   *
   * ※ これは性能のための絞り込みであって正しさの担保ではない。二重解約を防ぐのは
   *   insertKaiyaku 内の `if (ref.kaiyakuFlg) return`（独立した2層目）。
   */
  private fetchChunk(
    today: string,
    cursor: number,
  ): Promise<{ dokusya_id: string }[]> {
    return this.db.query(
      `SELECT dokusya_id FROM t_dokusya
        WHERE deleted_at IS NULL
          AND dokusya_id > $6
          AND dokusya_chushi_date IS NOT NULL
          AND tetsuzuki_shurui <> $4
          AND (
            (dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3) OR
            (dokusya_shubetsu IN ($2, $5) AND dokusya_chushi_date < $3)
          )
        ORDER BY dokusya_id
        LIMIT ${CHUNK_SIZE}`,
      [
        DokusyaShubetsu.PAPER,
        DokusyaShubetsu.DIGITAL,
        today,
        TetsuzukiShurui.KAIYAKU,
        DokusyaShubetsu.BOTH,
        cursor,
      ],
    );
  }

  /**
   * 1購読者の解約確定 + 監査ログを 1 トランザクションで実行。成否を bool で返す。
   *
   * 監査ログは insertKaiyaku が **実際に行を追加したとき（戻り値 non-null）だけ** 書く。
   * 冪等スキップした夜に書くと、同じ解約について毎晩 t_log 行が増えていく。
   */
  private async confirmOne(id: number, today: string): Promise<boolean> {
    try {
      await this.db.transaction(async (m) => {
        const res = await insertKaiyaku(m, id, today, SystemActor.BATCH_NIGHTLY);
        if (!res) return;
        await this.auditLog.logOperation(
          {
            // 人ではなくスケジュール実行なので SYSTEM。account_id は null
            // （t_log.account_id は nullable）。
            logType: LogType.SYSTEM,
            accountId: null,
            jaId: resolveJaId(res.master.before, res.master.after),
            gamenName: BATCH_SCREEN_KAIYAKU,
            operation: AuditOperation.UPDATE,
            resultStatus: ResultStatus.SUCCESS,
            targetId: id,
            targetTable: 't_dokusya',
            beforeValue: JSON.stringify(res.master.before),
            afterValue: JSON.stringify(res.master.after),
          },
          m, // ← 業務書き込みと同一 tx。ロールバック時は監査行も消える
        );
      });
      return true;
    } catch (err) {
      // tx は既にロールバック済み。エラーログは manager を渡さず独立接続で書く
      // （渡すと一緒に巻き戻り、失敗の痕跡が残らない）。
      this.logger.error({
        event: 'kaiyaku.fail',
        dokusyaId: id,
        message: (err as Error).message,
      });
      await this.auditLog.logError(
        batchAuditCtx(BATCH_SCREEN_KAIYAKU, id),
        AuditOperation.UPDATE,
        err as Error,
      );
      return false;
    }
  }
}
