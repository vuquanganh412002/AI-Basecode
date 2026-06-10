// `pg` ships no bundled types and `@types/pg` isn't installed here, so
// type the tiny slice we use locally instead of pulling a new dependency.
interface PgTypes {
  builtins: { DATE: number };
  setTypeParser(oid: number, parse: (value: string) => unknown): void;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { types } = require('pg') as { types: PgTypes };

/**
 * pg の DATE (OID 1082) 型パーサを「生の 'YYYY-MM-DD' 文字列をそのまま返す」
 * 挙動に上書きする。
 *
 * 既定では pg は DATE 値を JS `Date` に変換する。本番コンテナは
 * `TZ=Asia/Tokyo` のため、DB の DATE `'2026-05-19'` は
 * `new Date(2026, 4, 19)` = Tokyo 0:00 = UTC `2026-05-18T15:00:00Z` という
 * Date になり、JSON 直列化で `'2026-05-18T15:00:00.000Z'` になる。FE の
 * `<a-date-picker value-format="YYYY-MM-DD">` はこの ISO 文字列の UTC 日付
 * 部分だけを取り出すため、DB=19 なのに画面=18 という off-by-one になる。
 *
 * DATE はタイムゾーンを持たない「暦日」なので、生の 'YYYY-MM-DD' 文字列を
 * そのまま返すのが正しい。これでエンティティの `type: 'varchar'` 宣言・
 * spec の文字列比較・pg-mem(DATE を文字列で返す)・実 Postgres の挙動が
 * すべて一致し、JST 運用の「保存=表示=入力 すべて東京の暦日」が成立する。
 *
 * TIMESTAMP/TIMESTAMPTZ (1114 / 1184) は対象外 — それらは絶対時刻なので
 * `Date` のまま ISO(+09:00) で扱う (nestjs.md §Timestamp policy)。
 *
 * プロセスグローバルな設定なので、接続前に一度呼べば全コネクションに効く。
 */
export function configurePgTypeParsers(): void {
  // 1082 = DATE
  types.setTypeParser(types.builtins.DATE, (value: string) => value);
}
