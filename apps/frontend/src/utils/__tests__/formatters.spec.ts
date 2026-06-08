// Drives src/utils/formatters.ts. Pure-function unit tests — each
// formatter is consumed across many table cells / form labels, so the
// contract (especially the `null | undefined | ''` → "" guard) must
// stay stable.

import { describe, it, expect } from 'vitest';
import {
  formatYen,
  formatNumber,
  formatTaxRate,
  formatDate,
  formatDateTime,
  formatYearMonth,
  formatPostalCode,
  formatPhone,
  formatKanriShitenCode,
  KANRI_SHITEN_CODE_REGEX,
  truncate,
  APP_TIMEZONE,
} from '@/utils/formatters';

describe('APP_TIMEZONE', () => {
  it('should be Asia/Tokyo per project policy', () => {
    expect(APP_TIMEZONE).toBe('Asia/Tokyo');
  });
});

describe('formatYen', () => {
  it.each([
    [3500, '¥3,500'],
    [0, '¥0'],
    [1234567, '¥1,234,567'],
  ])('formatYen(%i) -> %s', (input, expected) => {
    expect(formatYen(input)).toBe(expected);
  });

  it.each([
    [null, ''],
    [undefined, ''],
  ] as const)('formatYen(%s) -> ""', (input, expected) => {
    expect(formatYen(input)).toBe(expected);
  });
});

describe('formatNumber', () => {
  it('renders grouping commas with no currency mark', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });
  it('returns "" for null/undefined', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
  });
});

describe('formatTaxRate', () => {
  it('appends % suffix', () => {
    expect(formatTaxRate(10)).toBe('10%');
    expect(formatTaxRate(0)).toBe('0%');
  });
  it('returns "" for null/undefined', () => {
    expect(formatTaxRate(null)).toBe('');
    expect(formatTaxRate(undefined)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats ISO with +09:00 offset as YYYY/MM/DD in JST', () => {
    expect(formatDate('2026-04-25T00:00:00+09:00')).toBe('2026/04/25');
  });
  it('converts a UTC midnight to the next day in JST', () => {
    // 2026-04-24 22:00 UTC == 2026-04-25 07:00 JST
    expect(formatDate('2026-04-24T22:00:00Z')).toBe('2026/04/25');
  });
  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2026-01-01T00:00:00+09:00'))).toBe('2026/01/01');
  });
  it('returns "" for null/undefined/empty', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats ISO as YYYY/MM/DD HH:mm in JST', () => {
    expect(formatDateTime('2026-04-25T14:30:00+09:00')).toBe('2026/04/25 14:30');
  });
  it('returns "" for null/undefined', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });
});

describe('formatYearMonth', () => {
  it('formats as YYYY/MM', () => {
    expect(formatYearMonth('2026-04-25T00:00:00+09:00')).toBe('2026/04');
  });
  it('returns "" for null', () => {
    expect(formatYearMonth(null)).toBe('');
  });
});

describe('formatPostalCode', () => {
  it('inserts hyphen after 3 digits (XXX-XXXX)', () => {
    expect(formatPostalCode('1234567')).toBe('123-4567');
  });
  it('is idempotent — already-hyphenated input passes through', () => {
    expect(formatPostalCode('123-4567')).toBe('123-4567');
  });
  it('strips non-digits before formatting', () => {
    expect(formatPostalCode('123 4567')).toBe('123-4567');
  });
  it('returns the input untouched when digit-count != 7', () => {
    expect(formatPostalCode('12345')).toBe('12345');
    expect(formatPostalCode('12345678')).toBe('12345678');
  });
  it('returns "" for null/undefined/empty', () => {
    expect(formatPostalCode(null)).toBe('');
    expect(formatPostalCode(undefined)).toBe('');
    expect(formatPostalCode('')).toBe('');
  });
});

describe('formatPhone', () => {
  it('formats 11-digit mobile as 3-4-4', () => {
    expect(formatPhone('09012345678')).toBe('090-1234-5678');
  });
  it('formats 10-digit landline as 2-4-4', () => {
    expect(formatPhone('0312345678')).toBe('03-1234-5678');
  });
  it('strips non-digits before formatting', () => {
    expect(formatPhone('03-1234-5678')).toBe('03-1234-5678');
  });
  it('returns the input untouched when digit-count is neither 10 nor 11', () => {
    expect(formatPhone('123')).toBe('123');
  });
  it('returns "" for null/undefined/empty', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });
});

describe('formatKanriShitenCode + KANRI_SHITEN_CODE_REGEX', () => {
  it('regex accepts canonical NNN-NNNN-NNN (digits only)', () => {
    expect(KANRI_SHITEN_CODE_REGEX.test('013-3300-001')).toBe(true);
    // Customer spec 2026-05-19: alphabet is REJECTED.
    expect(KANRI_SHITEN_CODE_REGEX.test('abc-1234-XYZ')).toBe(false);
  });
  it('regex rejects wrong segment lengths', () => {
    expect(KANRI_SHITEN_CODE_REGEX.test('13-3300-001')).toBe(false);
    expect(KANRI_SHITEN_CODE_REGEX.test('013-330-001')).toBe(false);
  });
  it('passes through already-hyphenated canonical input', () => {
    expect(formatKanriShitenCode('013-3300-001')).toBe('013-3300-001');
  });
  it('auto-inserts hyphens on bare 10-digit input', () => {
    expect(formatKanriShitenCode('0133300001')).toBe('013-3300-001');
    // Alphabet no longer normalises — the trimmed value is returned
    // untouched so the caller's regex check flags it.
    expect(formatKanriShitenCode('abc1234XYZ')).toBe('abc1234XYZ');
  });
  it('trims surrounding whitespace before checking shape', () => {
    expect(formatKanriShitenCode('  013-3300-001  ')).toBe('013-3300-001');
  });
  it('returns the trimmed input untouched when neither shape fits', () => {
    expect(formatKanriShitenCode('short')).toBe('short');
  });
  it('returns "" for null/undefined', () => {
    expect(formatKanriShitenCode(null)).toBe('');
    expect(formatKanriShitenCode(undefined)).toBe('');
  });
});

describe('truncate', () => {
  it('appends "…" when the string exceeds max', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde…');
  });
  it('passes through when within max', () => {
    expect(truncate('abc', 5)).toBe('abc');
  });
  it('uses default max = 20', () => {
    const s = 'a'.repeat(21);
    expect(truncate(s)).toBe(`${'a'.repeat(20)}…`);
  });
  it('returns "" for null/undefined/empty', () => {
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
    expect(truncate('')).toBe('');
  });
});
