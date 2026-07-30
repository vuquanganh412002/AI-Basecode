import { Injectable, Logger } from '@nestjs/common';
import type { BatchJob } from '@/batch/batch-job.interface';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

/**
 * 購読者「到来日反映」バッチ（適用日到来 = due の予約を master へ適用）。
 * 顧客レビュー 2026-07 Batch 2+3 をまとめた 1 エントリ。
 *
 * 順序保証（解約 → 反映）のため 1 バッチにまとめ、内部で順に実行:
 *   ① kaiyaku   … 購読中止日が到来した購読者の解約を確定（履歴追加 + master反映）
 *   ② recompute … 全購読者を当日基準で再計算（情報変更予約の反映 + saishin_data_flg）
 *
 * ①が新規の解約行を追加した後に②の全件再計算が走ることで、その晩のうちに
 * 解約・情報変更の両方が矛盾なく master へ反映される。両段とも idempotent。
 *
 * **本バッチは自社クラウド内で完結する**（顧客要件 2026-07）。電子版への push
 * （cancel / update）は行わない。外部呼び出しが無くなったため、同日に複数回
 * 実行しても履歴・master・外部システムのいずれにも副作用は生じない。
 *
 * スケジュール(5:00 JST)は agrinews-terraform の EventBridge ルールが持つ。
 * エントリ: src/batch/dokusya-apply-due.main.ts（`npm run dokusya:apply-due:{dev,prod}`）。
 */
@Injectable()
export class DokusyaApplyDueService implements BatchJob {
  private readonly logger = new Logger(DokusyaApplyDueService.name);

  constructor(
    private readonly kaiyaku: DokusyaKaiyakuService,
    private readonly recompute: DokusyaRecomputeService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    await this.kaiyaku.run(); // ① 解約（到来日）
    await this.recompute.run(); // ② 反映（全件 recompute）
    this.logger.log({
      event: 'dokusya_apply.done',
      durationMs: Date.now() - startedAt,
    });
  }
}
