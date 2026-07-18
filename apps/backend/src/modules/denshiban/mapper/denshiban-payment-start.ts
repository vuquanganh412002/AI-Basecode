import { dateOnlyIsoJst, yearMonthJst } from '@/common/utils/datetime';
import { DenshibanMappingError } from './denshiban-payload.builder';

/**
 * `payment_start`（電子版の購読開始 — **0: 当日 / 1: 翌月1日**）の算出。
 *
 * 対応する cloud 側の列は `t_dokusya.dokusya_kaishi_date`（購読開始日）。電子版の
 * 会員登録画面では購読開始日が **この2択に畳まれている** ため、cloud の絶対日付を
 * 2値へ変換する必要がある。`approve`（未承認会員の承認）も同じ変換を使う — 承認とは
 * 「いつから購読を開始するか」を確定させる操作だから。
 *
 * **builder から切り出してある**。電子版へ送るのは 0/1 の2値だけで日付は送らない
 * ので、builder 自身は時計を知らなくてよい。時計依存をこの1関数に隔離して
 * {@link ./denshiban-payload.builder} を完全な純関数に保つ。
 *
 * ⚠️ 2値は **電子版が受信した瞬間** の日付で解釈される。キュー滞留や再送で日付／
 * 月境界をまたぐと、cloud が意図した開始日と食い違う。呼び出し側は送信直前の
 * `now` で算出すること（`new Date()` を既定にしているのはそのため）。
 *
 * @param dokusyaKaishiDate 購読開始日 `YYYY-MM-DD`（`YYYY/MM/DD` も受ける）。
 * @param now 判定基準時刻。既定は現在時刻。
 */
export function toPaymentStart(
  dokusyaKaishiDate: string,
  now: Date = new Date(),
): '0' | '1' {
  const date = (dokusyaKaishiDate ?? '').replaceAll('/', '-');
  const today = dateOnlyIsoJst(now);
  const nextMonth1st = firstDayOfNextMonth(now);

  if (date === today) return '0';
  if (date === nextMonth1st) return '1';

  // 「当日」でも「翌月1日」でもない日付（例: 来週・過去日・当月15日）は電子版の
  // 2値では表現できない。適当に '0' を送ると購読開始日が黙ってずれ、cloud と
  // 電子版で課金開始が食い違う。
  throw new DenshibanMappingError(
    'dokusya_kaishi_date',
    `購読開始日「${date || '(空)'}」は電子版の payment_start（当日=${today} → 0 / 翌月1日=${nextMonth1st} → 1）で表現できません。`,
  );
}

/** JST 基準で翌月1日を `YYYY-MM-DD` で返す（12月 → 翌年1月1日）。 */
function firstDayOfNextMonth(now: Date): string {
  const ym = yearMonthJst(now);
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(4, 6));
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
