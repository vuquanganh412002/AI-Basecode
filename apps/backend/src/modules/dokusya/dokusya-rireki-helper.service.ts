import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * 履歴(t_dokusya_rireki)書込みの共有プリミティブ。
 *
 * Pha3 で登録/更新/取込/一括置換/承認否認 の履歴生成は共通ライタ
 * `dokusya-history.writer.applyChange` に一本化された（zenkai_* 退避・増減報告
 * フラグ・rireki_no 採番・saishin 確定・イベント分割はすべて applyChange が担う）。
 * 本サービスに残る責務は「採番前の行ロックによる直列化」のみ — applyChange を
 * 呼ぶ全経路（UI update/approve/reject, 取込 UPDATE, 一括置換）がこれを共有する。
 *
 * constructor 注入を持たない — メソッドは呼び出し側から渡される
 * `manager: EntityManager` 経由で操作する純粋ロジックのため。
 */
@Injectable()
export class DokusyaRirekiService {
  /**
   * Acquire a `FOR UPDATE` row lock on the master `t_dokusya` row inside
   * the open transaction. Serializes concurrent UPDATE / approve / reject /
   * import / bulk-replace of the SAME 購読者 so two callers can't both read
   * `MAX(rireki_no)` and INSERT the same history `rireki_no` (which would hit
   * the `(dokusya_id, rireki_no)` unique constraint and surface as a 500).
   * The locked row itself isn't read back — only its lock matters.
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
