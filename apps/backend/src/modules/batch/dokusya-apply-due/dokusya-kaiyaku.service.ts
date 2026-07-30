import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DokusyaShubetsu } from '@/common/enums/dokusya-shubetsu.enum';
import { ShiharaiHoho } from '@/common/enums/shiharai-hoho.enum';
import { insertKaiyaku } from '@/modules/dokusya/dokusya-history.writer';
import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';

/**
 * 解約確定バッチ — dokusya-apply-due の第1段。購読中止日の到来日に解約行を1件追加し
 * master へ反映（idempotent ヘルパ insertKaiyaku に委譲）。per-row try/catch で
 * 1件失敗しても全体は止めない。
 *
 * **自社クラウド内で完結する**（顧客要件 2026-07）。電子版への cancel push は行わない。
 * 以前は解約確定後に電子版へ cancel を push していたが、push が「insertKaiyaku が
 * 実際に行を追加したか」と無関係に実行され、かつ抽出条件（master の
 * dokusya_chushi_date <= 当日）は解約後も真のままなので、解約済みの購読者へ毎晩
 * cancel を送り続けていた（対象は増える一方）。連携は別途設計し直すため、本バッチ
 * からは外部 API 呼び出しを完全に取り除く。
 *
 * 抽出条件（§6-2）:
 *   - 紙版(1)   : dokusya_chushi_date <= 当日
 *   - 電子版(2) : dokusya_chushi_date <= 当日-1（適用日+1日）かつ shiharai_hoho≠クレカ
 *   - 併読(3) / 電子版クレカ : 除外（read-only）
 */
@Injectable()
export class DokusyaKaiyakuService {
  private readonly logger = new Logger(DokusyaKaiyakuService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();
    const yesterday = addDaysIso(today, -1);

    // master は予約中の中止日も反映済み（recomputeMaster）なので抽出は master 1本で足りる。
    const rows: { dokusya_id: string }[] = await this.db.query(
      `SELECT dokusya_id FROM t_dokusya
        WHERE deleted_at IS NULL
          AND dokusya_chushi_date IS NOT NULL
          AND (
            (dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3) OR
            (dokusya_shubetsu = $2 AND dokusya_chushi_date <= $4 AND shiharai_hoho <> $5)
          )
        ORDER BY dokusya_id`,
      [
        DokusyaShubetsu.PAPER,
        DokusyaShubetsu.DIGITAL,
        today,
        yesterday,
        ShiharaiHoho.CREDIT_CARD,
      ],
    );

    let ok = 0;
    let ng = 0;
    for (const { dokusya_id } of rows) {
      const id = Number(dokusya_id);
      try {
        // insertKaiyaku は解約済み（有効行が kaiyaku_flg=true）なら no-op。
        // 外部連携が無くなったので、同日に複数回流しても副作用は一切無い。
        await this.db.transaction(async (m) => {
          await insertKaiyaku(m, id, today);
        });
        ok++;
      } catch (err) {
        ng++; // 1件失敗で全体を止めない
        this.logger.error({
          event: 'kaiyaku.fail',
          dokusyaId: id,
          message: (err as Error).message,
        });
      }
    }

    this.logger.log({
      event: 'kaiyaku.done',
      today,
      target: rows.length,
      ok,
      ng,
      durationMs: Date.now() - startedAt,
    });
  }
}
