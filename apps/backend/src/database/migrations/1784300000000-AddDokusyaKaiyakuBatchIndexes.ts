import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 解約確定バッチ（dokusya-apply-due 第1段）のための部分インデックス 2 本。
 *
 * どちらも「該当行がごく一部」という性質を使った部分インデックスなので、通常の
 * インデックスより桁違いに小さく、更新コストもほぼ無視できる。
 *
 * ── 1. ix_t_dokusya_kaiyaku_due（抽出クエリ用）
 * バッチ冒頭の抽出は `dokusya_chushi_date` / `tetsuzuki_shurui` / `deleted_at` の
 * どれにもインデックスが無く、毎晩 t_dokusya を全件シーケンシャルスキャンしていた。
 * 実際に必要なのは「解約予定日が入っている行」だけで、全体のごく一部。
 *
 * 述語に `tetsuzuki_shurui <> 0` を**入れない**のが要点: 抽出クエリはこの値を
 * バインドパラメータで渡すため、プランナが「クエリの条件 ⊇ インデックスの述語」を
 * 証明できず部分インデックスが使われないことがある（generic plan 時）。
 * 述語はクエリ側でもリテラルな `IS NULL` / `IS NOT NULL` の 2 条件だけにし、
 * 絞り込みに使う列はキーに載せてインデックスだけで判定できるようにする。
 *
 * ── 2. ix_t_dokusya_rireki_shinki（現ライフサイクル起点の探索用）
 * `shinki_flg = true` の最新行を引くクエリ（loadCurrentLifecycleEffectiveRow と
 * loadScheduledChushiDate が使用）は shinki_flg にインデックスが無く、購読者の
 * 履歴チェーンを新しい方から逆走して探していた。新規行は普通いちばん**古い**行
 * なので、実質チェーン全体を舐める O(K)。
 * 新規行は購読者あたり 1〜2 行（再購読のたびに 1 行増える）しかないため、部分
 * インデックスは極小になる。こちらの述語 2 条件はクエリ側でもリテラルなので
 * そのまま一致する。
 *
 * ── 運用上の注意
 * 素の `CREATE INDEX` はテーブルに SHARE ロックを取り、作成中は当該テーブルへの
 * INSERT/UPDATE/DELETE がブロックされる（SELECT は可）。本番の行数が多い場合は
 * このマイグレーションを流す前に、メンテナンス時間帯で手動の
 * `CREATE INDEX CONCURRENTLY`（トランザクション外で実行）を検討すること。
 * `IF NOT EXISTS` を付けてあるので、先に手動作成しても本マイグレーションは no-op。
 */
export class AddDokusyaKaiyakuBatchIndexes1784300000000
  implements MigrationInterface
{
  name = 'AddDokusyaKaiyakuBatchIndexes1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_t_dokusya_kaiyaku_due
          ON t_dokusya (dokusya_chushi_date, dokusya_shubetsu, tetsuzuki_shurui)
       WHERE deleted_at IS NULL AND dokusya_chushi_date IS NOT NULL
    `);
    await queryRunner.query(
      `COMMENT ON INDEX ix_t_dokusya_kaiyaku_due IS '解約確定バッチの抽出用（解約予定日ありの未削除行のみ）'`,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_t_dokusya_rireki_shinki
          ON t_dokusya_rireki (dokusya_id, joho_henko_tekiyo_date DESC, rireki_no DESC)
       WHERE shinki_flg = true AND torikeshi_flg = false
    `);
    await queryRunner.query(
      `COMMENT ON INDEX ix_t_dokusya_rireki_shinki IS '現ライフサイクル起点（最新の新規/再購読行）の探索用'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_t_dokusya_rireki_shinki`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_t_dokusya_kaiyaku_due`);
  }
}
