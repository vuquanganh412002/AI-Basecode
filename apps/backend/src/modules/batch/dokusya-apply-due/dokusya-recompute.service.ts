import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { todayIsoJst } from '@/common/utils/datetime';

/** 1ループで処理する dokusya_id 件数（メモリ・ロック分散）。keyset(id>cursor)で進める。 */
const CHUNK_SIZE = 500;

/**
 * 情報変更反映バッチ — `dokusya-apply-due` の第2段（Batch 3）。
 *
 * 全（未削除）購読者について `recomputeMaster(m, dokusyaId, 当日)` を実行し、
 * master(t_dokusya) と最新データフラグ(saishin_data_flg) を当日基準で再計算する。
 * 予約された情報変更行は適用日(joho)が当日に到来した時点でこの再計算により
 * effective(saishin=TRUE)へ切り替わり master に反映される（＝「到来日で自動反映」）。
 *
 * recomputeMaster は全件再計算で idempotent（新しい履歴行は追加しない。
 * saishin_data_flg と master 列のみ更新）。1件失敗しても全体は止めない。
 *
 * 大量件数対策として dokusya_id を keyset(id>cursor) で CHUNK_SIZE 件ずつ回す。
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
          await this.db.transaction((m) => recomputeMaster(m, id, today));
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
