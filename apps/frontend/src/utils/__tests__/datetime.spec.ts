// Drives src/utils/datetime.ts. The whole point of this module is to
// behave the same regardless of the machine the test runs on — so we
// flip Node's TZ env var to a non-JST zone (America/Los_Angeles) and
// assert that "now in Tokyo" / "parse as Tokyo" produce JST-consistent
// outputs anyway. Without the module's `.tz('Asia/Tokyo')` calls,
// every assertion below would fail when the suite runs in CI (UTC) or
// on a Vietnam laptop (UTC+7).

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import {
  APP_TIMEZONE,
  nowTokyo,
  todayStartTokyo,
  nowMinuteFloorTokyo,
  parseDatetimeTokyo,
  parseDatetimeWithSecondsTokyo,
  todayIsoTokyo,
  isPastDayTokyo,
  isTodayOrPastDayTokyo,
  tomorrowIsoTokyo,
  endOfMonthIsoTokyo,
  timestampForFilenameTokyo,
  excelSerialToIsoDate,
  normalizeImportDate,
  isFutureDayTokyo,
  pickerToTokyoWallclock,
  dateToIsoDateTokyo,
} from '@/utils/datetime';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('APP_TIMEZONE', () => {
  it('is Asia/Tokyo', () => {
    expect(APP_TIMEZONE).toBe('Asia/Tokyo');
  });
});

describe('nowTokyo / todayStartTokyo / nowMinuteFloorTokyo', () => {
  // Pin wall-clock to a moment that crosses a UTC date boundary —
  //   2026-05-27T22:00:00Z  =  2026-05-28 07:00 JST  =  2026-05-27 15:00 PDT
  // so any helper that secretly used the browser-local TZ would emit
  // 2026-05-27 (PDT) instead of 2026-05-28 (JST).
  const FIXED_UTC_ISO = '2026-05-27T22:00:00.000Z';

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_UTC_ISO));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('nowTokyo returns the JST wall-clock for the fixed instant', () => {
    expect(nowTokyo().format('YYYY-MM-DD HH:mm')).toBe('2026-05-28 07:00');
  });

  it('todayStartTokyo returns 00:00 JST of the JST date', () => {
    expect(todayStartTokyo().format('YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-05-28 00:00:00',
    );
  });

  it('nowMinuteFloorTokyo strips seconds but keeps minute', () => {
    vi.setSystemTime(new Date('2026-05-27T22:00:42.500Z'));
    expect(nowMinuteFloorTokyo().format('YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-05-28 07:00:00',
    );
  });
});

describe('parseDatetimeTokyo', () => {
  it('parses YYYY/MM/DD HH:mm as Asia/Tokyo wall-clock', () => {
    const d = parseDatetimeTokyo('2026/05/28 14:00');
    expect(d).not.toBeNull();
    // 14:00 JST = 05:00 UTC
    expect(d!.toISOString()).toBe('2026-05-28T05:00:00.000Z');
  });

  it('returns null for unparseable input', () => {
    expect(parseDatetimeTokyo('')).toBeNull();
    expect(parseDatetimeTokyo(null)).toBeNull();
    expect(parseDatetimeTokyo(undefined)).toBeNull();
    expect(parseDatetimeTokyo('2026-05-28T14:00:00')).toBeNull(); // wrong format
    // NOTE: dayjs customParseFormat is lenient (month 13 rolls to next
    // year); the regex shape-guard catches truly-mangled input, but
    // overflow is documented dayjs behaviour. Don't assert on it.
  });
});

describe('parseDatetimeWithSecondsTokyo', () => {
  it('parses YYYY/MM/DD HH:mm:ss as Asia/Tokyo', () => {
    const d = parseDatetimeWithSecondsTokyo('2026/04/17 14:30:45');
    expect(d).not.toBeNull();
    // 14:30:45 JST = 05:30:45 UTC
    expect(d!.toISOString()).toBe('2026-04-17T05:30:45.000Z');
  });

  it('returns null when seconds are missing', () => {
    expect(parseDatetimeWithSecondsTokyo('2026/05/28 14:00')).toBeNull();
  });
});

describe('todayIsoTokyo', () => {
  it('returns YYYY-MM-DD of the current JST date', () => {
    vi.useFakeTimers();
    // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST
    vi.setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
    expect(todayIsoTokyo()).toBe('2026-05-28');
    vi.useRealTimers();
  });
});

describe('isFutureDayTokyo', () => {
  // isPastDayTokyo と同じ境界固定。2026-05-27 22:00 UTC = 2026-05-28 07:00 JST
  // → JST 当日は 2026-05-28。ブラウザ TZ が JST より遅れていても判定がズレない
  // ことを保証する（ログ参照の検索終了日はこの関数で未来日を無効化する）。
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when current is null', () => {
    expect(isFutureDayTokyo(null)).toBe(false);
  });

  it('returns true for the day after JST today', () => {
    expect(isFutureDayTokyo(dayjs('2026-05-29'))).toBe(true);
  });

  it('returns false for JST today (same-day is selectable)', () => {
    expect(isFutureDayTokyo(dayjs('2026-05-28'))).toBe(false);
  });

  it('returns false for a past day', () => {
    expect(isFutureDayTokyo(dayjs('2026-05-27'))).toBe(false);
  });
});

describe('isPastDayTokyo', () => {
  // TZ 非依存を保証するため、システム時刻を JST/UTC 境界の手前に固定する。
  // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST → JST 当日は 2026-05-28。
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when current is null', () => {
    expect(isPastDayTokyo(null)).toBe(false);
  });

  it('returns true for the day before JST today', () => {
    expect(isPastDayTokyo(dayjs('2026-05-27'))).toBe(true);
  });

  it('returns false for JST today (same-day is selectable)', () => {
    expect(isPastDayTokyo(dayjs('2026-05-28'))).toBe(false);
  });

  it('returns false for a future day', () => {
    expect(isPastDayTokyo(dayjs('2026-05-29'))).toBe(false);
  });
});

describe('isTodayOrPastDayTokyo', () => {
  // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST → JST 当日は 2026-05-28。
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when current is null', () => {
    expect(isTodayOrPastDayTokyo(null)).toBe(false);
  });

  it('returns true for the day before JST today', () => {
    expect(isTodayOrPastDayTokyo(dayjs('2026-05-27'))).toBe(true);
  });

  it('returns true for JST today (当日は選択不可＝未来日のみ)', () => {
    expect(isTodayOrPastDayTokyo(dayjs('2026-05-28'))).toBe(true);
  });

  it('returns false for a future day (翌日以降のみ選択可)', () => {
    expect(isTodayOrPastDayTokyo(dayjs('2026-05-29'))).toBe(false);
  });

  it('uses the same JST-today basis as todayIsoTokyo() — picker と validation がズレない', () => {
    // 検証は `date <= todayIsoTokyo()`。picker も同じ暦日文字列で判定するので、
    // ブラウザ TZ が JST より遅れていても JST 当日セルは必ず無効になる。
    const today = todayIsoTokyo(); // '2026-05-28' (JST)
    expect(isTodayOrPastDayTokyo(dayjs(today))).toBe(true); // JST 当日=無効
    expect(isTodayOrPastDayTokyo(dayjs(today).add(1, 'day'))).toBe(false); // 翌日=有効
  });

  it('disables the JST-today cell even when the cell is a browser-local (UTC+7) Dayjs (TZ ズレ回帰防止)', () => {
    // JST 当日 (2026-05-28) を UTC+7 フレームの Dayjs として渡しても、暦日文字列
    // 比較なので無効判定になる（instant 比較だと 1 日ズレる恐れがあった）。
    const jstTodayInVn = dayjs.tz('2026-05-28', 'Asia/Ho_Chi_Minh');
    expect(isTodayOrPastDayTokyo(jstTodayInVn)).toBe(true);
    const jstTomorrowInVn = dayjs.tz('2026-05-29', 'Asia/Ho_Chi_Minh');
    expect(isTodayOrPastDayTokyo(jstTomorrowInVn)).toBe(false);
  });
});

describe('dateToIsoDateTokyo', () => {
  it('converts a UTC instant to its Asia/Tokyo calendar day', () => {
    // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST.
    expect(dateToIsoDateTokyo(new Date('2026-05-27T22:00:00.000Z'))).toBe('2026-05-28');
  });

  it('should combine with pickerToTokyoWallclock to compare a picker cell against a parseDatetimeTokyo() Date without TZ drift (regression)', () => {
    // Reproduces the OshiraseManagementView disabledEndDate bug: comparing a
    // browser-local picker Dayjs directly against a parseDatetimeTokyo() Date
    // via `.isBefore(date, 'day')` re-interprets the Date in the browser's
    // local TZ, drifting the day boundary when the browser TZ isn't JST.
    // Stringifying both sides to their JST calendar day first removes the
    // ambiguity entirely.
    const publishStart = parseDatetimeTokyo('2026/05/28 09:00')!; // JST 2026-05-28
    expect(publishStart).not.toBeNull();

    // Picker cell for JST 2026-05-27 (the day BEFORE the start date),
    // expressed in a non-JST frame (Ho Chi Minh, UTC+7) exactly like a
    // Vietnam-based developer's browser would produce.
    const cellBeforeStartInVn = dayjs.tz('2026-05-27', 'Asia/Ho_Chi_Minh');
    const cellIso = pickerToTokyoWallclock(cellBeforeStartInVn).format('YYYY-MM-DD');
    const startIso = dateToIsoDateTokyo(publishStart);
    expect(cellIso < startIso).toBe(true);

    // The start date's own JST day, expressed the same way, must NOT be
    // considered "before" itself.
    const cellOnStartInVn = dayjs.tz('2026-05-28', 'Asia/Ho_Chi_Minh');
    const cellOnStartIso = pickerToTokyoWallclock(cellOnStartInVn).format('YYYY-MM-DD');
    expect(cellOnStartIso < startIso).toBe(false);
  });
});

describe('tomorrowIsoTokyo', () => {
  it('returns the JST next calendar day even across the UTC/JST boundary', () => {
    vi.useFakeTimers();
    // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST → 翌日 = 2026-05-29。
    vi.setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
    expect(tomorrowIsoTokyo()).toBe('2026-05-29');
    vi.useRealTimers();
  });
});

describe('endOfMonthIsoTokyo', () => {
  it('returns the last day of the current JST month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z')); // 2026-07-10 21:00 JST
    expect(endOfMonthIsoTokyo()).toBe('2026-07-31');
    vi.useRealTimers();
  });

  it('uses the JST month across the UTC/JST boundary (UTC=2月末, JST=3月)', () => {
    vi.useFakeTimers();
    // 2026-02-28 22:00 UTC = 2026-03-01 07:00 JST → 当月(JST)は3月 → 末日 2026-03-31。
    vi.setSystemTime(new Date('2026-02-28T22:00:00.000Z'));
    expect(endOfMonthIsoTokyo()).toBe('2026-03-31');
    vi.useRealTimers();
  });
});

describe('timestampForFilenameTokyo', () => {
  it('renders the YYYYMMDD_HHmmss filename stamp in JST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T22:00:42.500Z'));
    expect(timestampForFilenameTokyo()).toBe('20260528_070042');
    vi.useRealTimers();
  });
});

describe('excelSerialToIsoDate', () => {
  it('converts an Excel serial to YYYY-MM-DD (Asia/Tokyo, integer days)', () => {
    // 45809 = 2025-06-01 (1899-12-30 origin, 1900 leap-bug included).
    expect(excelSerialToIsoDate(45809)).toBe('2025-06-01');
  });
  it('is TZ-stable — same result regardless of the host timezone', () => {
    // JST add-days on a date-only serial doesn't drift across TZ.
    expect(excelSerialToIsoDate(45778)).toBe('2025-05-01');
  });
});

describe('normalizeImportDate', () => {
  it('numeric serial → ISO', () => {
    expect(normalizeImportDate(45809)).toBe('2025-06-01');
  });
  it('string serial → ISO', () => {
    expect(normalizeImportDate('45809')).toBe('2025-06-01');
  });
  it('YYYY/MM/DD → hyphen + zero-pad', () => {
    expect(normalizeImportDate('2026/5/1')).toBe('2026-05-01');
  });
  it('already YYYY-MM-DD passes through (zero-padded)', () => {
    expect(normalizeImportDate('2026-05-01')).toBe('2026-05-01');
  });
  it('D/M/YY: swaps to M/D when month > 12, expands 2-digit year', () => {
    expect(normalizeImportDate('25/12/26')).toBe('2026-12-25');
  });
  it('blank / unparseable returned as-is', () => {
    expect(normalizeImportDate('')).toBe('');
    expect(normalizeImportDate('not-a-date')).toBe('not-a-date');
    expect(normalizeImportDate(null)).toBeNull();
  });
});
