import {
  dateOnlyIsoJst,
  formatDateTimeJst,
  formatDateTimeMinutesJst,
  isoDateToSlash,
  nowDateJst,
  nowTimeJst,
  parseDatetimeJst,
  parseDatetimeMinutesJst,
  slashDateToIso,
  timestampForFilenameJst,
  compactTimestampJst,
  todayIsoJst,
  excelSerialToIsoJst,
  normalizeDbDate,
  dbDateOrNull,
} from './datetime';

describe('todayIsoJst', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return the JST calendar date as YYYY-MM-DD', () => {
    // 2026-05-27 22:00 UTC = 2026-05-28 07:00 JST → JST 当日は 2026-05-28。
    // toISOString().slice(0,10) なら UTC で '2026-05-27' になり 1 日ずれる。
    jest.useFakeTimers().setSystemTime(new Date('2026-05-27T22:00:00.000Z'));
    expect(todayIsoJst()).toBe('2026-05-28');
  });

  it('should stay on the same JST date well inside the day', () => {
    // 2026-05-28 03:00 UTC = 2026-05-28 12:00 JST。
    jest.useFakeTimers().setSystemTime(new Date('2026-05-28T03:00:00.000Z'));
    expect(todayIsoJst()).toBe('2026-05-28');
  });

  it('should match the YYYY-MM-DD shape', () => {
    expect(todayIsoJst()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('dateOnlyIsoJst', () => {
  it('should render a UTC instant as the JST calendar date (off-by-one guard)', () => {
    // 22:00 UTC = 翌 07:00 JST → JST 暦日は翌日。
    expect(dateOnlyIsoJst(new Date('2026-05-27T22:00:00.000Z'))).toBe(
      '2026-05-28',
    );
  });

  it('should pass a YYYY-MM-DD string through unchanged', () => {
    expect(dateOnlyIsoJst('2024-01-01')).toBe('2024-01-01');
  });

  it('should return empty string for null / undefined / blank', () => {
    expect(dateOnlyIsoJst(null)).toBe('');
    expect(dateOnlyIsoJst(undefined)).toBe('');
    expect(dateOnlyIsoJst('')).toBe('');
  });
});

describe('timestampForFilenameJst', () => {
  it('should format YYYYMMDD_HHmmss in JST', () => {
    // 2026-05-27 22:05:09 UTC = 2026-05-28 07:05:09 JST。
    expect(
      timestampForFilenameJst(new Date('2026-05-27T22:05:09.000Z')),
    ).toBe('20260528_070509');
  });

  it('should match the canonical shape for the current time', () => {
    expect(timestampForFilenameJst()).toMatch(/^\d{8}_\d{6}$/);
  });
});

describe('compactTimestampJst', () => {
  it('should format yyyyMMddHHmmss (14 digits, no separator) in JST', () => {
    // 2026-05-27 22:05:09 UTC = 2026-05-28 07:05:09 JST。
    expect(
      compactTimestampJst(new Date('2026-05-27T22:05:09.000Z')),
    ).toBe('20260528070509');
  });

  it('should match the canonical 14-digit shape for the current time', () => {
    expect(compactTimestampJst()).toMatch(/^\d{14}$/);
  });
});

describe('formatDateTimeJst / formatDateTimeMinutesJst', () => {
  it('should format full datetime with seconds in JST', () => {
    expect(formatDateTimeJst(new Date('2026-05-27T22:05:09.000Z'))).toBe(
      '2026/05/28 07:05:09',
    );
  });

  it('should format datetime to minutes in JST', () => {
    expect(
      formatDateTimeMinutesJst(new Date('2026-05-27T22:05:09.000Z')),
    ).toBe('2026/05/28 07:05');
  });

  it('should return empty string for an invalid value', () => {
    expect(formatDateTimeJst('not-a-date')).toBe('');
    expect(formatDateTimeMinutesJst('not-a-date')).toBe('');
  });
});

describe('nowDateJst / nowTimeJst', () => {
  afterEach(() => jest.useRealTimers());

  it('should split the JST now into date and time parts', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-27T22:05:09.000Z'));
    expect(nowDateJst()).toBe('2026/05/28');
    expect(nowTimeJst()).toBe('07:05:09');
  });
});

describe('parseDatetimeMinutesJst', () => {
  it('should parse a valid YYYY/MM/DD HH:mm string to a Date with seconds=0', () => {
    const d = parseDatetimeMinutesJst('2026/05/28 07:05');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getSeconds()).toBe(0);
  });

  it('should return null on malformed input', () => {
    expect(parseDatetimeMinutesJst('2026-05-28 07:05')).toBeNull();
    expect(parseDatetimeMinutesJst('garbage')).toBeNull();
  });
});

describe('parseDatetimeJst (with seconds)', () => {
  it('should parse a valid YYYY/MM/DD HH:mm:ss string to a Date', () => {
    const d = parseDatetimeJst('2026/05/28 07:05:09');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getSeconds()).toBe(9);
  });

  it('should return null on minutes-only / malformed input', () => {
    expect(parseDatetimeJst('2026/05/28 07:05')).toBeNull();
    expect(parseDatetimeJst('garbage')).toBeNull();
  });
});

describe('isoDateToSlash / slashDateToIso', () => {
  it('should convert YYYY-MM-DD to YYYY/MM/DD and back', () => {
    expect(isoDateToSlash('2024-01-01')).toBe('2024/01/01');
    expect(slashDateToIso('2024/01/01')).toBe('2024-01-01');
  });

  it('should pass blank through', () => {
    expect(isoDateToSlash('')).toBe('');
    expect(slashDateToIso('')).toBe('');
  });
});

describe('excelSerialToIsoJst', () => {
  it('should convert an Excel serial to the JST calendar date', () => {
    // 45809 = 2025-06-01 (1899-12-30 origin, 1900 leap-bug included).
    expect(excelSerialToIsoJst(45809)).toBe('2025-06-01');
    expect(excelSerialToIsoJst(45778)).toBe('2025-05-01');
  });

  it('should be TZ-stable regardless of the host timezone', () => {
    const prev = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      // Intl pins Asia/Tokyo, so the calendar date never drifts.
      expect(excelSerialToIsoJst(45809)).toBe('2025-06-01');
    } finally {
      process.env.TZ = prev;
    }
  });
});

describe('normalizeDbDate', () => {
  it('should keep YYYY-MM-DD as-is', () => {
    expect(normalizeDbDate('2026-05-01')).toBe('2026-05-01');
  });
  it('should convert slash form to hyphen form', () => {
    expect(normalizeDbDate('2026/05/01')).toBe('2026-05-01');
  });
  it('should convert a numeric / string Excel serial to ISO', () => {
    expect(normalizeDbDate(45809 as unknown as string)).toBe('2025-06-01');
    expect(normalizeDbDate('45809')).toBe('2025-06-01');
  });
  it('should pass blank / null / undefined through', () => {
    expect(normalizeDbDate('')).toBe('');
    expect(normalizeDbDate(null)).toBeNull();
    expect(normalizeDbDate(undefined)).toBeUndefined();
  });
});

describe('dbDateOrNull', () => {
  it('should map blank / non-primitive to null', () => {
    expect(dbDateOrNull('')).toBeNull();
    expect(dbDateOrNull(null)).toBeNull();
    expect(dbDateOrNull({})).toBeNull();
  });
  it('should normalize a date value to hyphen form', () => {
    expect(dbDateOrNull('2026/05/01')).toBe('2026-05-01');
    expect(dbDateOrNull(45809)).toBe('2025-06-01');
  });
});
