/**
 * JST (Asia/Tokyo) 日時ヘルパー共通化（`.claude/rules/nestjs.md §Timestamp policy`）。
 * 全ての now/today・DLファイル名タイムスタンプ・date列シリアライズはここを経由し
 * TZ 非依存にする。FE `apps/frontend/src/utils/datetime.ts` と対。
 *
 * Intl.DateTimeFormat(timeZone:'Asia/Tokyo') を使う理由: getHours() 等はプロセス TZ
 * 依存で TZ=Asia/Tokyo 以外の host でずれ、toISOString() は常に UTC のため
 * `.slice(0,10)` は UTC 日付＝JST 早朝(00-09時)に1日ずれる。
 * 各サービスに散った drift 版（filename stamp の `_` 欠落等）を置換。
 */

/** `date` の Asia/Tokyo 壁時計パーツ（year は4桁、他2桁）。 */
function jstParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

/**
 * 本日 (Asia/Tokyo) を `YYYY-MM-DD` で返す。「当日以降か」の日付ガード（情報変更
 * 適用日・公開日 など）は全てこれを経由すること。FE `todayIsoTokyo()` と同一。
 *
 * @example 2026-06-15 06:00 JST (= 2026-06-14T21:00Z) でも '2026-06-15'。
 */
export function todayIsoJst(): string {
  const p = jstParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * `YYYY-MM-DD` + `days` → `YYYY-MM-DD`（暦日計算・TZ 非依存）。UTC 基準で計算し
 * DST や TZ 早朝ずれの影響を受けない。解約バッチ適用日（電子版=購読中止日+1日）等。
 */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * DATE 列/日時値を Asia/Tokyo の `YYYY-MM-DD` で返す。空/無効は `''`（文字列入力
 * はそのまま）。`toISOString().slice(0,10)` は UTC 日付で JST 早朝に1日ずれるための代替。
 */
export function dateOnlyIsoJst(
  value: Date | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  const p = jstParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * DLファイル名用タイムスタンプ `YYYYMMDD_HHmmss`（Asia/Tokyo、既定は現在時刻）。
 * 全出力サービス共通（旧 `jstTimestamp` / `timestampForFilename`）。
 */
export function timestampForFilenameJst(date: Date = new Date()): string {
  const p = jstParts(date);
  return `${p.year}${p.month}${p.day}_${p.hour}${p.minute}${p.second}`;
}

/**
 * 区切りなしタイムスタンプ `yyyyMMddHHmmss`（14桁・Asia/Tokyo）。顧客指定フォーマット
 * のファイル名用（例: 一括ダウンロード_20260619153000.zip）。区切りあり版は
 * {@link timestampForFilenameJst}。
 *
 * @example 2026-06-19 15:30:00 JST → '20260619153000'
 */
export function compactTimestampJst(date: Date = new Date()): string {
  const p = jstParts(date);
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}

/**
 * 日時値を Asia/Tokyo の `YYYY/MM/DD HH:mm:ss` で返す（表示・CSV 用）。無効値は `''`。
 * 旧 log.service `formatDatetime` の共通版。
 */
export function formatDateTimeJst(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = jstParts(d);
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** 現在日 (Asia/Tokyo) を `YYYY/MM/DD` で返す（帳票の出力日など）。 */
export function nowDateJst(): string {
  const p = jstParts(new Date());
  return `${p.year}/${p.month}/${p.day}`;
}

/** 現在時刻 (Asia/Tokyo) を `HH:mm:ss` で返す（帳票の出力時間など）。 */
export function nowTimeJst(): string {
  const p = jstParts(new Date());
  return `${p.hour}:${p.minute}:${p.second}`;
}

/**
 * 日時値を Asia/Tokyo の `YYYY/MM/DD HH:mm`（分まで）で返す。無効値は `''`。
 * お知らせの公開開始/終了日時の表示など（旧 oshirase `formatJstDateTimeMinutes`）。
 */
export function formatDateTimeMinutesJst(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = jstParts(d);
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/**
 * `YYYY/MM/DD HH:mm` をプロセス TZ の壁時計として Date に変換（不正形式 null、秒 0）。
 * 本番コンテナは `TZ=Asia/Tokyo` 固定（`.claude/rules/nestjs.md §Timestamp policy` /
 * Dockerfile）なので JST 解釈。旧 oshirase `parseJstDateTimeMinutes` と同一。
 * 本モジュールで唯一 TZ 依存の関数（フォーマッタ群は Intl で TZ 非依存）。
 */
export function parseDatetimeMinutesJst(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0);
}

/**
 * `YYYY/MM/DD HH:mm:ss`（秒まで）をプロセス TZ の壁時計として Date に変換（不正形式
 * null）。`parseDatetimeMinutesJst` の秒あり版（ログ検索範囲用）。本番コンテナは
 * TZ=Asia/Tokyo 固定なので JST 解釈。
 */
export function parseDatetimeJst(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(se),
  );
}

/** `YYYY-MM-DD` → `YYYY/MM/DD`（純粋な文字列変換、空はそのまま）。TZ 非依存。 */
export function isoDateToSlash(d: string): string {
  return d ? d.replaceAll('-', '/') : '';
}

/** `YYYY/MM/DD` → `YYYY-MM-DD`（`isoDateToSlash` の逆、空はそのまま）。TZ 非依存。 */
export function slashDateToIso(d: string): string {
  return d ? d.replaceAll('/', '-') : '';
}

/**
 * Excel シリアル日付値（1899-12-30 起点、1900 うるう年バグ込み）を Asia/Tokyo の
 * `YYYY-MM-DD` へ変換。シリアルの暦日 0:00(UTC) を JST 投影しても +9h で同一暦日に
 * なるため `dateOnlyIsoJst` で JST 暦日を得る（FE `excelSerialToIsoDate` と同一）。
 */
export function excelSerialToIsoJst(serial: number): string {
  return dateOnlyIsoJst(
    new Date(Math.round(serial) * 86_400_000 + Date.UTC(1899, 11, 30)),
  );
}

/**
 * 日付のみ文字列を varchar(10) 列向けにハイフン形へ正規化。DTO は YYYY/MM/DD
 * （picker）と YYYY-MM-DD を受けるが、列は検索の辞書順比較（`<=`）のためハイフン統一が
 * 必須（'/'=0x2F > '-'=0x2D）。空/null はそのまま。区切りなし純数字は防御的に Excel
 * シリアルとみなし変換（旧版 FE 等が生シリアルを送る場合あり）。
 */
export function normalizeDbDate<T extends string | null | undefined>(
  value: T,
): T {
  if (typeof (value as unknown) === 'number') {
    return excelSerialToIsoJst(value as unknown as number) as T;
  }
  if (typeof value !== 'string') return value;
  if (/^\d{4,6}$/.test(value)) {
    return excelSerialToIsoJst(Number(value)) as T;
  }
  return value.replaceAll('/', '-') as T;
}

/**
 * 取込セルを DB `date` 値（または null）へ正規化。空/未指定 → null（`date` 列が ''
 * で "invalid input syntax for type date" にならないよう）。非空 → ハイフン形日付
 * （Excel シリアルは `normalizeDbDate` 経由）。`date` 型列を持つ取込 UPDATE パス用。
 */
export function dbDateOrNull(value: unknown): string | null {
  const raw =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = normalizeDbDate(raw);
  return normalized === '' ? null : normalized;
}
