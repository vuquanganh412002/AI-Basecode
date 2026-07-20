import {
  isDigitalOrBoth,
  isBoth,
  isDigitalCreditCard,
  isDokusyaReadOnly,
  collectEmailViolation,
  collectDigitalBusuViolation,
  collectDigitalTodayModeViolation,
  computeChangedReportFields,
  collectTodayModeReportViolations,
  SHUBETSU_MSG,
} from './dokusya-shubetsu.rules';

describe('dokusya-shubetsu.rules — predicates', () => {
  it.each([
    [1, false],
    [2, true],
    [3, true],
  ])('isDigitalOrBoth(%s) = %s', (shubetsu, expected) => {
    expect(isDigitalOrBoth(shubetsu)).toBe(expected);
  });

  it.each([
    [1, false],
    [2, false],
    [3, true],
  ])('isBoth(%s) = %s', (shubetsu, expected) => {
    expect(isBoth(shubetsu)).toBe(expected);
  });

  it('isDigitalCreditCard: true only for 電子版(2) + クレカ(6)', () => {
    expect(isDigitalCreditCard(2, 6)).toBe(true);
    expect(isDigitalCreditCard(2, 1)).toBe(false); // 電子版+口座引落
    expect(isDigitalCreditCard(1, 6)).toBe(false); // 紙版+クレカ
  });

  it('isDokusyaReadOnly: 併読 OR 電子版クレカ', () => {
    expect(isDokusyaReadOnly(3, 1)).toBe(true); // 併読
    expect(isDokusyaReadOnly(2, 6)).toBe(true); // 電子版クレカ
    expect(isDokusyaReadOnly(1, 1)).toBe(false); // 紙版
    expect(isDokusyaReadOnly(2, 1)).toBe(false); // 電子版+口座引落
  });
});

describe('dokusya-shubetsu.rules — email / busu', () => {
  it('collectEmailViolation: 電子版/併読 で email 空 → violation', () => {
    expect(collectEmailViolation('', 2)).toHaveLength(1);
    expect(collectEmailViolation('   ', 3)).toHaveLength(1);
    expect(collectEmailViolation('a@b.co', 2)).toHaveLength(0);
    expect(collectEmailViolation('', 1)).toHaveLength(0); // 紙版は任意
    expect(collectEmailViolation('', 2)[0].message).toBe(
      SHUBETSU_MSG.EMAIL_REQUIRED_DIGITAL,
    );
  });

  it('collectDigitalBusuViolation: 電子版 busu≠1(非解約) → violation', () => {
    expect(collectDigitalBusuViolation(2, 5, 1)).toHaveLength(1); // 電子版 busu=5
    expect(collectDigitalBusuViolation(2, 1, 1)).toHaveLength(0); // 電子版 busu=1 OK
    expect(collectDigitalBusuViolation(2, 0, 0)).toHaveLength(0); // 解約(手続0) busu=0 許容
    expect(collectDigitalBusuViolation(1, 5, 1)).toHaveLength(0); // 紙版は自由
  });
});

describe('dokusya-shubetsu.rules — date mode', () => {
  const today = '2026-07-18';

  it('collectDigitalTodayModeViolation: 電子版 未来 joho → violation; 当日 → OK', () => {
    expect(
      collectDigitalTodayModeViolation({
        shubetsu: 2,
        joho: '2026-08-01',
        today,
        field: 'joho_henko_tekiyo_date',
      }),
    ).toHaveLength(1);
    expect(
      collectDigitalTodayModeViolation({ shubetsu: 2, joho: today, today, field: 'x' }),
    ).toHaveLength(0);
    // 紙版は対象外（未来でも violation 無し）。
    expect(
      collectDigitalTodayModeViolation({
        shubetsu: 1,
        joho: '2026-08-01',
        today,
        field: 'x',
      }),
    ).toHaveLength(0);
  });

  it('computeChangedReportFields: entity(camel) / 生DB(snake) 両対応で変更帳票項目を返す', () => {
    // before が entity(camel)。busu と 販売店 を変更。
    const changedCamel = computeChangedReportFields(
      { dokusya_busu: 3, hanbaiten_id: 200, shimei_sei: '新' },
      { dokusyaBusu: 2, hanbaitenId: 200, yubinNo: '1000001' },
    );
    expect(changedCamel).toEqual(['dokusya_busu']); // busu のみ変更（氏名は帳票外）
    // before が snake(生DB)。住所変更。
    const changedSnake = computeChangedReportFields(
      { yubin_no: '9999999' },
      { yubin_no: '1000001' },
    );
    expect(changedSnake).toEqual(['yubin_no']);
  });

  it('collectTodayModeReportViolations: 紙版 当日 + 帳票項目変更 → violation; 電子版は対象外', () => {
    expect(
      collectTodayModeReportViolations({
        shubetsu: 1,
        joho: today,
        today,
        changedReportFields: ['dokusya_busu', 'hanbaiten_id'],
      }),
    ).toHaveLength(2);
    // 紙版でも未来日(予約変更)なら制限なし。
    expect(
      collectTodayModeReportViolations({
        shubetsu: 1,
        joho: '2026-08-01',
        today,
        changedReportFields: ['dokusya_busu'],
      }),
    ).toHaveLength(0);
    // 電子版は全項目 当日可。
    expect(
      collectTodayModeReportViolations({
        shubetsu: 2,
        joho: today,
        today,
        changedReportFields: ['dokusya_busu'],
      }),
    ).toHaveLength(0);
  });
});
