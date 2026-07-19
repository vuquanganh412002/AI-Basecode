import { dateOnlyIsoJst, yearMonthJst } from '@/common/utils/datetime';
import { DenshibanMappingError } from './denshiban-payload.builder';

/**
 * Computes `payment_start` (denshiban's subscription start — **0: today / 1: the
 * 1st of next month**).
 *
 * The corresponding cloud column is `t_dokusya.dokusya_kaishi_date` (subscription
 * start date). denshiban's member-registration screen **collapses the start date
 * into those two choices**, so cloud's absolute date has to be converted to the two
 * values. `approve` (approving an unapproved member) uses the same conversion —
 * because approving *is* the act of settling "when does the subscription start".
 *
 * **Split out of the builder.** Only the 0/1 pair is sent to denshiban, never a
 * date, so the builder itself need not know about the clock. Isolating the clock
 * dependency in this one function keeps {@link ./denshiban-payload.builder} purely
 * functional.
 *
 * ⚠️ The two values are interpreted against the date **at the moment denshiban
 * receives them**. If a queue delay or a retry crosses a day or month boundary, the
 * result disagrees with the start date cloud intended. Callers must compute this
 * with the `now` from right before sending (which is why `new Date()` is the default).
 *
 * @param dokusyaKaishiDate Subscription start date `YYYY-MM-DD` (`YYYY/MM/DD` also accepted).
 * @param now The reference time. Defaults to the current time.
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

  // A date that is neither "today" nor "the 1st of next month" (e.g. next week, a
  // past date, the 15th of this month) cannot be expressed by denshiban's two
  // values. Arbitrarily sending '0' would silently shift the subscription start,
  // making cloud and denshiban disagree about when billing begins.
  throw new DenshibanMappingError(
    'dokusya_kaishi_date',
    `購読開始日「${date || '(空)'}」は電子版の payment_start（当日=${today} → 0 / 翌月1日=${nextMonth1st} → 1）で表現できません。`,
  );
}

/** Returns the 1st of next month as `YYYY-MM-DD`, JST-based (December → Jan 1 of next year). */
function firstDayOfNextMonth(now: Date): string {
  const ym = yearMonthJst(now);
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(4, 6));
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
