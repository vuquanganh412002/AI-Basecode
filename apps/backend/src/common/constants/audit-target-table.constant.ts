/**
 * `buildAuditCtx()` の `targetTable` 引数（`t_log.target_table`）に渡す、
 * 複数の無関係なモジュールで共有されているテーブル名。
 *
 * 各`*.service.ts`が持つ `TABLE_NAME` ローカル定数は基本的にそのモジュールが
 * 所有する1テーブルを指すので集約の必要はない（drift のリスクが無い）。唯一
 * 例外なのが `t_file_download` — 帳票エクスポート系の3モジュール
 * （file-download / koza-furikae / haitatsuryo）が、自分の生成した
 * ダウンロード記録を指す `target_table` として同じ文字列をそれぞれ独立に
 * ローカル定義していた。`target_table` は DB 制約もコンパイル時チェックも
 * 無い自由文字列なので、どれか1つが typo すると当該モジュールの監査ログだけ
 * 静かに `target_table` が食い違う（`WHERE target_table = 't_file_download'`
 * の集計から漏れる）。この1値だけを共通化する（不具合修正2026-08）。
 */
export const FILE_DOWNLOAD_TARGET_TABLE = 't_file_download';
