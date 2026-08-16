// collectTekiyoDateViolations / collectChushiViolations（適用日整合性チェック）の単体テスト。
// 顧客要件 2026-07 改訂（上限は2026-08改訂で同日不可に変更）:
//   - 範囲: 購読開始日 <= joho/hanbaiten < 解約予定日（下限のみ等号可・chushi null 時は上限省略）。
//   - 解約予定日: 購読開始日 <= chushi かつ chushi > 本日（未来日のみ・当日不可）。
//   - 未来日チェック(joho/hanbaiten > today) は呼び出し側の責務なので本関数では扱わない。
import {
  collectTekiyoDateViolations,
  collectChushiViolations,
  collectChushiVsMaxJoho,
  tekiyoViolationField,
  TEKIYO_VIOLATION,
} from './dokusya-tekiyo-date.rules';

describe('collectTekiyoDateViolations', () => {
  it('should return no violation when kaishi <= joho < chushi', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026-07-10',
        kaishiDate: '2026-07-01',
        chushiDate: '2026-12-31',
      }),
    ).toEqual([]);
  });

  it('should flag JOHO_BEFORE_KAISHI when joho < kaishi', () => {
    const v = collectTekiyoDateViolations({
      johoDate: '2026-06-30',
      kaishiDate: '2026-07-01',
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI]);
    expect(v[0].message).toContain('購読開始日（2026/07/01）');
  });

  it('should flag JOHO_AFTER_CHUSHI when joho > chushi', () => {
    const v = collectTekiyoDateViolations({
      johoDate: '2027-01-05',
      kaishiDate: '2026-07-01',
      chushiDate: '2026-12-31',
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.JOHO_AFTER_CHUSHI]);
    expect(v[0].message).toContain('解約予定日（2026/12/31）');
  });

  it('should flag JOHO_AFTER_CHUSHI when joho == chushi (同日不可・顧客要件2026-08)', () => {
    const v = collectTekiyoDateViolations({
      johoDate: '2026-12-31',
      kaishiDate: '2026-07-01',
      chushiDate: '2026-12-31',
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.JOHO_AFTER_CHUSHI]);
    expect(v[0].message).toContain('より前');
  });

  it('should allow joho == kaishi (下限は等号可)', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026-07-01',
        kaishiDate: '2026-07-01',
        chushiDate: '2026-12-31',
      }),
    ).toEqual([]);
  });

  it('should skip the upper-bound (chushi) check when chushi is null', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2099-12-31',
        kaishiDate: '2026-07-01',
        chushiDate: null,
      }),
    ).toEqual([]);
  });

  it('should normalize YYYY/MM/DD input before comparing', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026/07/10',
        kaishiDate: '2026-07-01',
      }),
    ).toEqual([]);
  });

  it('should skip checks when reference dates are missing', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026-07-10',
      }),
    ).toEqual([]);
  });
});

describe('collectChushiViolations', () => {
  const TODAY = '2026-07-07';

  it('should return no violation when kaishi <= chushi and chushi > today', () => {
    expect(
      collectChushiViolations({
        chushiDate: '2026-12-31',
        kaishiDate: '2026-04-01',
        today: TODAY,
      }),
    ).toEqual([]);
  });

  it('should skip all checks when chushi is null/empty (未入力)', () => {
    expect(
      collectChushiViolations({ chushiDate: null, kaishiDate: '2026-04-01', today: TODAY }),
    ).toEqual([]);
  });

  it('should flag CHUSHI_BEFORE_KAISHI when chushi < kaishi', () => {
    const v = collectChushiViolations({
      chushiDate: '2026-03-31',
      kaishiDate: '2026-04-01',
      today: '2026-01-01',
    });
    expect(v.map((x) => x.kind)).toContain(TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI);
  });

  it('should flag CHUSHI_NOT_FUTURE when chushi == today (未来日のみ・当日不可)', () => {
    const v = collectChushiViolations({
      chushiDate: TODAY,
      kaishiDate: '2026-04-01',
      today: TODAY,
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE]);
    expect(v[0].message).toContain('本日より後');
  });

  it('should flag CHUSHI_NOT_FUTURE when chushi < today', () => {
    const v = collectChushiViolations({
      chushiDate: '2026-07-06',
      kaishiDate: '2026-04-01',
      today: TODAY,
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE]);
  });

  it('should allow chushi = tomorrow (未来日)', () => {
    expect(
      collectChushiViolations({ chushiDate: '2026-07-08', kaishiDate: '2026-04-01', today: TODAY }),
    ).toEqual([]);
  });

  it('should return BOTH violations when chushi < kaishi and chushi <= today', () => {
    const v = collectChushiViolations({
      chushiDate: '2026-03-01',
      kaishiDate: '2026-04-01',
      today: TODAY,
    });
    expect(v.map((x) => x.kind).sort()).toEqual(
      [TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI, TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE].sort(),
    );
  });
});

describe('collectChushiVsMaxJoho（解約予定日 > 最終変更適用日・同日不可・顧客要件 2026-07）', () => {
  it('should return no violation when chushi > maxJoho（最終変更より後）', () => {
    expect(
      collectChushiVsMaxJoho({ chushiDate: '2026-08-02', maxJoho: '2026-08-01' }),
    ).toEqual([]);
  });

  it('should flag CHUSHI_BEFORE_MAX_JOHO when chushi == maxJoho（同日は不可）', () => {
    const out = collectChushiVsMaxJoho({
      chushiDate: '2026-08-01',
      maxJoho: '2026-08-01',
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe(TEKIYO_VIOLATION.CHUSHI_BEFORE_MAX_JOHO);
    expect(out[0].message).toContain('より後');
  });

  it('should flag CHUSHI_BEFORE_MAX_JOHO when chushi < maxJoho', () => {
    const out = collectChushiVsMaxJoho({
      chushiDate: '2026-07-20',
      maxJoho: '2026-08-01',
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe(TEKIYO_VIOLATION.CHUSHI_BEFORE_MAX_JOHO);
  });

  it('should skip when chushi or maxJoho is null/empty', () => {
    expect(collectChushiVsMaxJoho({ chushiDate: null, maxJoho: '2026-08-01' })).toEqual([]);
    expect(collectChushiVsMaxJoho({ chushiDate: '2026-08-02', maxJoho: null })).toEqual([]);
  });

  it('should compare correctly with YYYY/MM/DD input (正規化)', () => {
    expect(
      collectChushiVsMaxJoho({ chushiDate: '2026/08/01', maxJoho: '2026/08/01' }),
    ).toHaveLength(1); // 同日 → 違反
  });
});

describe('tekiyoViolationField', () => {
  it('should map each kind to the standard 購読者フォーム field name', () => {
    expect(tekiyoViolationField(TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI)).toBe(
      'joho_henko_tekiyo_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.JOHO_AFTER_CHUSHI)).toBe(
      'joho_henko_tekiyo_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI)).toBe(
      'dokusya_chushi_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.CHUSHI_NOT_FUTURE)).toBe(
      'dokusya_chushi_date',
    );
  });
});
