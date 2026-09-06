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
  collectReservedSameDateViolation,
  collectDigitalNewKaishiDateViolation,
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

// 紙版の予約変更（未来日）は同一適用日への変更を1回までに制限する（顧客要件2026-08）。
describe('dokusya-shubetsu.rules — collectReservedSameDateViolation', () => {
  it('紙版・予約変更・既存の変更あり → violation', () => {
    const result = collectReservedSameDateViolation({
      shubetsu: 1,
      isReservedMode: true,
      existingChangeFound: true,
      field: 'joho_henko_tekiyo_date',
    });
    expect(result).toEqual([
      {
        field: 'joho_henko_tekiyo_date',
        message: SHUBETSU_MSG.RESERVE_DATE_ALREADY_USED,
      },
    ]);
  });

  it('紙版・予約変更・既存の変更なし → 違反なし', () => {
    expect(
      collectReservedSameDateViolation({
        shubetsu: 1,
        isReservedMode: true,
        existingChangeFound: false,
        field: 'joho_henko_tekiyo_date',
      }),
    ).toHaveLength(0);
  });

  it('紙版・当日変更（isReservedMode=false）は既存の変更があっても対象外', () => {
    expect(
      collectReservedSameDateViolation({
        shubetsu: 1,
        isReservedMode: false,
        existingChangeFound: true,
        field: 'joho_henko_tekiyo_date',
      }),
    ).toHaveLength(0);
  });

  it('電子版は予約変更・既存の変更ありでも対象外', () => {
    expect(
      collectReservedSameDateViolation({
        shubetsu: 2,
        isReservedMode: true,
        existingChangeFound: true,
        field: 'joho_henko_tekiyo_date',
      }),
    ).toHaveLength(0);
  });

  it('併読(3)は予約変更・既存の変更ありでも対象外（read-onlyで上流に弾かれる想定）', () => {
    expect(
      collectReservedSameDateViolation({
        shubetsu: 3,
        isReservedMode: true,
        existingChangeFound: true,
        field: 'joho_henko_tekiyo_date',
      }),
    ).toHaveLength(0);
  });
});

// 電子版の新規登録（NEW）は購読開始日=本日 or 翌月1日のみ（ACSMS-SCR-011登録画面の
// ラジオボタン「今日から/翌月1日から」と同一制約。顧客要件2026-08 — 取込SCR-016には
// 日付ピッカーが無くExcelセルの値をそのまま受け取るため BE 側だけで守る必要がある）。
describe('dokusya-shubetsu.rules — collectDigitalNewKaishiDateViolation', () => {
  const today = '2026-07-18';
  const nextMonthFirst = '2026-08-01';

  it('電子版・購読開始日=本日 → 違反なし', () => {
    expect(
      collectDigitalNewKaishiDateViolation({
        shubetsu: 2,
        kaishiDate: today,
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      }),
    ).toHaveLength(0);
  });

  it('電子版・購読開始日=翌月1日 → 違反なし', () => {
    expect(
      collectDigitalNewKaishiDateViolation({
        shubetsu: 2,
        kaishiDate: nextMonthFirst,
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      }),
    ).toHaveLength(0);
  });

  it('電子版・購読開始日=本日でも翌月1日でもない未来日 → violation', () => {
    const result = collectDigitalNewKaishiDateViolation({
      shubetsu: 2,
      kaishiDate: '2026-07-19', // 明日（翌月1日ではない）
      today,
      nextMonthFirst,
      field: 'dokusya_kaishi_date',
    });
    expect(result).toEqual([
      {
        field: 'dokusya_kaishi_date',
        message: SHUBETSU_MSG.DIGITAL_KAISHI_DATE_INVALID,
      },
    ]);
  });

  it('電子版・購読開始日=過去日 → violation', () => {
    expect(
      collectDigitalNewKaishiDateViolation({
        shubetsu: 2,
        kaishiDate: '2026-07-17',
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      }),
    ).toHaveLength(1);
  });

  it('紙版は対象外（違反なし。紙版の未来日限定ルールは呼び出し元が別途担当）', () => {
    expect(
      collectDigitalNewKaishiDateViolation({
        shubetsu: 1,
        kaishiDate: today,
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      }),
    ).toHaveLength(0);
  });

  it('購読開始日が空欄 → 違反なし（必須チェックは別モジュールの責務）', () => {
    expect(
      collectDigitalNewKaishiDateViolation({
        shubetsu: 2,
        kaishiDate: undefined,
        today,
        nextMonthFirst,
        field: 'dokusya_kaishi_date',
      }),
    ).toHaveLength(0);
  });
});

