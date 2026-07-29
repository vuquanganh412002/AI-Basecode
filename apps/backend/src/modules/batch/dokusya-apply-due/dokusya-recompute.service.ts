import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { recomputeMaster } from '@/modules/dokusya/dokusya-history.writer';
import { isDigitalOrBoth } from '@/modules/dokusya/dokusya-shubetsu.rules';
import { DenshibanPushService } from '@/modules/denshiban/denshiban-push.service';
import { todayIsoJst } from '@/common/utils/datetime';

/** 1ループで処理する dokusya_id 件数（メモリ・ロック分散）。keyset(id>cursor)で進める。 */
const CHUNK_SIZE = 500;

/**
 * 情報変更反映バッチ — dokusya-apply-due の第2段。全（未削除）購読者に
 * recomputeMaster(当日) を実行し master + saishin_data_flg を当日基準で再計算。
 * 予約情報変更は適用日(joho)が当日到来した時点で effective 化し master に反映される。
 * idempotent（履歴行は追加しない）。1件失敗しても止めず、keyset で CHUNK_SIZE 件ずつ回す。
 */
@Injectable()
export class DokusyaRecomputeService {
  private readonly logger = new Logger(DokusyaRecomputeService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly denshiPush: DenshibanPushService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();

    // 本日 effective 化する予約情報変更を持つ電子版/併読の購読者IDを先に集め、
    // recompute 後にその集合だけ電子版へ update を push する。当日変更は UI で push 済み・
    // 予約分は created<当日 で二重 push を避けるため、実質 併読(3) の予約分が対象。
    const pushTargets = await this.collectDuePushTargets(today);

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
            // 本日 effective 化した予約情報変更 → 電子版へ update を push（同期 Saga）。
            // 候補SQLで種別は絞り込み済みだが call site でも明示ガード（紙版は呼ばない）。
            if (pushTargets.has(id)) {
              const after = await m.findOne(Dokusya, { where: { dokusyaId: id } });
              if (after && isDigitalOrBoth(after.dokusyaShubetsu)) {
                await this.denshiPush.pushOnBatch(m, { action: 'update', after });
              }
            }
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
      pushTargets: pushTargets.size,
      ok,
      ng,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 本日 effective 化する予約情報変更を持つ電子版/併読の購読者ID集合。
   * 条件: joho=当日・非解約・created<当日（当日作成の当日変更は UI で push 済みなので
   * 除外＝二重 push 防止）。created_at::date は接続TZ(Asia/Tokyo)基準で比較。
   */
  private async collectDuePushTargets(today: string): Promise<Set<number>> {
    const rows: { dokusya_id: string }[] = await this.db.query(
      `SELECT DISTINCT d.dokusya_id
         FROM t_dokusya d
         JOIN t_dokusya_rireki r ON r.dokusya_id = d.dokusya_id
        WHERE d.deleted_at IS NULL
          AND d.dokusya_shubetsu IN ($1, $2)
          AND r.joho_henko_tekiyo_date = $3
          AND r.kaiyaku_flg = false
          AND r.created_at::date < $3::date`,
      [DokusyaShubetsu.DIGITAL, DokusyaShubetsu.BOTH, today],
    );
    return new Set(rows.map((r) => Number(r.dokusya_id)));
  }
}
