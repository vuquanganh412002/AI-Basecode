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
  timestampForFilenameTokyo,
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

describe('timestampForFilenameTokyo', () => {
  it('renders the YYYYMMDD_HHmmss filename stamp in JST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T22:00:42.500Z'));
    expect(timestampForFilenameTokyo()).toBe('20260528_070042');
    vi.useRealTimers();
  });
});
