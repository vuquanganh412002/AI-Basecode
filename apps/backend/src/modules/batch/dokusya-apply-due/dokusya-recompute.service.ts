import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { todayIsoJst } from '@/common/utils/datetime';

/** 1ループで処理する dokusya_id 件数（メモリ・ロック分散）。keyset(id>cursor)で進める。 */
const CHUNK_SIZE = 500;

/**
 * 情報変更反映バッチ — dokusya-apply-due の第2段。全（未削除）購読者に
 * recomputeMaster(当日) を実行し master + saishin_data_flg を当日基準で再計算。
 * 予約情報変更は適用日(joho)が当日到来した時点で effective 化し master に反映される。
 * idempotent（履歴行は追加しない）。1件失敗しても止めず、keyset で CHUNK_SIZE 件ずつ回す。
 *
 * **自社クラウド内で完結する**（顧客要件 2026-07）。電子版への update push は行わない。
 * 以前は「本日 effective 化する予約情報変更を持つ電子版/併読」を先に集めて recompute 後に
 * push していたが、その候補集合は当日中なら何度でも同じものが返るため、同日に2回流すと
 * 同じ update を2回送っていた。連携は別途設計し直すため外部 API 呼び出しを取り除く。
 */
@Injectable()
export class DokusyaRecomputeService {
  private readonly logger = new Logger(DokusyaRecomputeService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();

    let ok = 0;
    let ng = 0;
    let target = 0;
    let cursor = 0;

    for (;;) {
      const rows: { dokusya_id: string }[] = await this.db.query(
        `SELECT dokusya_id FROM t_dokusya
          WHERE deleted_at IS NULL AND dokusya_id > $1
          ORDER BY dokusya_id
          LIMIT ${CHUNK_SIZE}`,
        [cursor],
      );
      if (rows.length === 0) break;

      for (const { dokusya_id } of rows) {
        const id = Number(dokusya_id);
        cursor = id;
        target++;
        try {
          await this.db.transaction(async (m) => {
            await recomputeMaster(m, id, today);
          });
          ok++;
        } catch (err) {
          ng++; // 1件失敗で全体を止めない
          this.logger.error({
            event: 'recompute.fail',
            dokusyaId: id,
            message: (err as Error).message,
          });
        }
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
  }
}
