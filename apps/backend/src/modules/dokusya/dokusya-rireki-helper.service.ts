import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * 履歴(t_dokusya_rireki)書込みの共有プリミティブ。
 *
 * Pha3 で登録/更新/取込/一括置換/承認否認 の履歴生成は共通ライタ
 * `dokusya-history.writer.applyChange` に一本化（zenkai_* 退避・増減報告フラグ・rireki_no
 * 採番・saishin 確定・イベント分割は全て applyChange が担う）。本サービスに残る責務は
 * 「採番前の行ロックによる直列化」のみ — applyChange を呼ぶ全経路が共有する。
 *
 * constructor 注入なし — caller が渡す manager: EntityManager 経由で操作する純ロジックのため。
 */
@Injectable()
export class DokusyaRirekiService {
  /**
   * open tx 内で master t_dokusya 行に `FOR UPDATE` 行ロックを取得。同一購読者の
   * 並行 UPDATE/approve/reject/import/bulk-replace を直列化し、2 caller が同時に
   * `MAX(rireki_no)` を読んで同じ rireki_no を INSERT するのを防ぐ（(dokusya_id, rireki_no)
   * unique 制約違反 → 500 になる）。ロック行自体は読み戻さない — ロックだけが目的。
   */
  async lockDokusyaRow(
    manager: EntityManager,
    dokusyaId: number,
  ): Promise<void> {
    await manager.findOne(Dokusya, {
      where: { dokusyaId },
      lock: { mode: 'pessimistic_write' },
    });
  }
}
