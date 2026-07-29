import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `dokusyaso_bunrui` / `nogyosya_bunrui` を**電子版と同じコード値**へ正規化する
 * （顧客要件 2026-07）。
 *
 * 経緯: 画面(SCR-011)は選択肢の value 自体が日本語ラベル（'農業者' 等）だったため
 * ラベルが保存され、pull バッチ(dokusya-sync)はコード（'0' 等）を保存していた。
 * 同じ列に2種類の表現が混在すると push(denshiban) 側の profession/products 変換が
 * 不安定になる（未知値は 999(その他) に落ちる）。以後はコードのみを保存する。
 *
 * 変換:
 *   購読者層分類 農業者=0 / JAグループ役職員=1 / 企業・団体=2 / 学生=3 / その他=999
 *   農業者分類   米=0 / 野菜=1 / 果実=2 / 花=3 / 畜産=4 / 酪農=5 / その他=999
 * 上記いずれにも該当しないトークン（旧仕様の '組合員' 等）は 999(その他) に寄せる。
 * 変換後に重複するトークンは初出位置を保って 1 つに畳む。
 *
 * 対象は「既に妥当なコード CSV になっていない行」のみ（WHERE の否定マッチ）。
 * 正常な行は書き換えないので再実行しても no-op（冪等）。
 *
 * down は no-op — コード→ラベルへ戻すと「不明値→999」で失われた情報が復元できず、
 * ロールバックで別の壊れ方をするだけのため（前方修正のみ）。
 */
export class NormalizeDokusyaBunruiCodes1784100000000
  implements MigrationInterface
{
  name = 'NormalizeDokusyaBunruiCodes1784100000000';

  /** 購読者層分類: ラベル/コード → コード。 */
  private static readonly DOKUSYASO_CASE = `
    CASE btrim(t.tok)
      WHEN '0' THEN '0'
      WHEN '1' THEN '1'
      WHEN '2' THEN '2'
      WHEN '3' THEN '3'
      WHEN '999' THEN '999'
      WHEN '農業者' THEN '0'
      WHEN 'JAグループ役職員' THEN '1'
      WHEN '企業・団体' THEN '2'
      WHEN '学生' THEN '3'
      WHEN 'その他' THEN '999'
      ELSE '999'
    END`;

  /** 農業者分類: ラベル/コード → コード。 */
  private static readonly NOGYOSYA_CASE = `
    CASE btrim(t.tok)
      WHEN '0' THEN '0'
      WHEN '1' THEN '1'
      WHEN '2' THEN '2'
      WHEN '3' THEN '3'
      WHEN '4' THEN '4'
      WHEN '5' THEN '5'
      WHEN '999' THEN '999'
      WHEN '米' THEN '0'
      WHEN '野菜' THEN '1'
      WHEN '果実' THEN '2'
      WHEN '花' THEN '3'
      WHEN '畜産' THEN '4'
      WHEN '酪農' THEN '5'
      WHEN 'その他' THEN '999'
      ELSE '999'
    END`;

  /** 妥当なコード CSV かどうかの判定（この形でない行だけ書き換える）。 */
  private static validCsvRegex(codes: string[]): string {
    const alt = `(${codes.join('|')})`;
    return `^${alt}(,${alt})*$`;
  }

  private static updateSql(
    table: string,
    column: string,
    caseExpr: string,
    codes: string[],
  ): string {
    return `
      UPDATE ${table}
      SET ${column} = (
        SELECT COALESCE(string_agg(q.code, ',' ORDER BY q.pos), '')
        FROM (
          SELECT ${caseExpr} AS code, MIN(t.ord) AS pos
          FROM unnest(string_to_array(${table}.${column}, ',')) WITH ORDINALITY AS t(tok, ord)
          WHERE btrim(t.tok) <> ''
          GROUP BY 1
        ) q
      )
      WHERE ${column} IS NOT NULL
        AND ${column} <> ''
        AND ${column} !~ '${NormalizeDokusyaBunruiCodes1784100000000.validCsvRegex(codes)}'
    `;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = NormalizeDokusyaBunruiCodes1784100000000;
    const dokusyaSoCodes = ['0', '1', '2', '3', '999'];
    const nogyosyaCodes = ['0', '1', '2', '3', '4', '5', '999'];

    for (const table of ['t_dokusya', 't_dokusya_rireki']) {
      await queryRunner.query(
        cls.updateSql(table, 'dokusyaso_bunrui', cls.DOKUSYASO_CASE, dokusyaSoCodes),
      );
      await queryRunner.query(
        cls.updateSql(table, 'nogyosya_bunrui', cls.NOGYOSYA_CASE, nogyosyaCodes),
      );
      await queryRunner.query(
        `COMMENT ON COLUMN ${table}.dokusyaso_bunrui IS '購読者層分類（コードのカンマ区切り。0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。電子版 profession と 1:1）※空文字許容'`,
      );
      await queryRunner.query(
        `COMMENT ON COLUMN ${table}.nogyosya_bunrui IS '農業者分類（コードのカンマ区切り。0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。電子版 products と 1:1）※空文字許容'`,
      );
    }
  }

  public async down(): Promise<void> {
    // 前方修正のみ（コード→ラベル復元は不可能・上記コメント参照）。
  }
}
