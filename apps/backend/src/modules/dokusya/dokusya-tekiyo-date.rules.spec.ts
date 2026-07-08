// collectTekiyoDateViolations（適用日整合性チェック）の単体テスト。
//   - joho >= kaishi / hanbaiten < chushi(非null時) の相対チェックのみ扱う。
//   - 過去日(today基準)チェックは呼び出し側の責務なので本関数では検証しない。
import {
  collectTekiyoDateViolations,
  collectChushiViolations,
  tekiyoViolationField,
  TEKIYO_VIOLATION,
} from './dokusya-tekiyo-date.rules';

describe('collectTekiyoDateViolations', () => {
  it('should return no violation when joho >= kaishi and hanbaiten < chushi', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026-07-10',
        hanbaitenDate: '2026-07-10',
        kaishiDate: '2026-07-01',
        chushiDate: '2026-12-31',
      }),
    ).toEqual([]);
  });

  it('should flag JOHO_BEFORE_KAISHI when joho < kaishi and echo 購読開始日 in message', () => {
    const v = collectTekiyoDateViolations({
      johoDate: '2026-06-30',
      kaishiDate: '2026-07-01',
    });
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe(TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI);
    expect(v[0].message).toContain('2026/07/01');
    expect(v[0].message).toContain('購読開始日');
  });

  it('should allow joho == kaishi (境界: 開始日当日)', () => {
    expect(
      collectTekiyoDateViolations({
        johoDate: '2026-07-01',
        kaishiDate: '2026-07-01',
      }),
    ).toEqual([]);
  });

  it('should flag HANBAITEN_AFTER_CHUSHI when hanbaiten == chushi (< は境界含まず)', () => {
    const v = collectTekiyoDateViolations({
      hanbaitenDate: '2026-12-31',
      chushiDate: '2026-12-31',
    });
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe(TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI);
    expect(v[0].message).toContain('2026/12/31');
    expect(v[0].message).toContain('解約予定日');
  });

  it('should flag HANBAITEN_AFTER_CHUSHI when hanbaiten > chushi', () => {
    const v = collectTekiyoDateViolations({
      hanbaitenDate: '2027-01-05',
      chushiDate: '2026-12-31',
    });
    expect(v.map((x) => x.kind)).toEqual([
      TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI,
    ]);
  });

  it('should skip the chushi check when chushi is null (解約予定日 未設定)', () => {
    expect(
      collectTekiyoDateViolations({
        hanbaitenDate: '2099-12-31',
        chushiDate: null,
      }),
    ).toEqual([]);
  });

  it('should return BOTH violations when joho < kaishi and hanbaiten >= chushi', () => {
    const v = collectTekiyoDateViolations({
      johoDate: '2026-06-01',
      hanbaitenDate: '2027-01-01',
      kaishiDate: '2026-07-01',
      chushiDate: '2026-12-31',
    });
    expect(v.map((x) => x.kind).sort()).toEqual(
      [
        TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI,
        TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI,
      ].sort(),
    );
  });

  it('should normalize YYYY/MM/DD input before comparing (区切り差で誤判定しない)', () => {
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
        hanbaitenDate: '2026-07-10',
      }),
    ).toEqual([]);
  });
});

describe('collectChushiViolations', () => {
  const TODAY = '2026-07-07';

  it('should return no violation when kaishi <= chushi and chushi >= today', () => {
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

  it('should flag CHUSHI_BEFORE_KAISHI when chushi < kaishi and echo 購読開始日', () => {
    // today を過去に置き、CHUSHI_PAST を発火させず kaishi 違反のみを分離する。
    const v = collectChushiViolations({
      chushiDate: '2026-03-31',
      kaishiDate: '2026-04-01',
      today: '2026-01-01',
    });
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe(TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI);
    expect(v[0].message).toContain('購読開始日（2026/04/01）');
  });

  it('should allow chushi == kaishi (境界: 同日可)', () => {
    expect(
      collectChushiViolations({ chushiDate: '2026-04-01', kaishiDate: '2026-04-01', today: '2026-01-01' }),
    ).toEqual([]);
  });

  it('should flag CHUSHI_PAST when chushi < today (過去日不可)', () => {
    const v = collectChushiViolations({
      chushiDate: '2026-07-06',
      kaishiDate: '2026-04-01',
      today: TODAY,
    });
    expect(v.map((x) => x.kind)).toEqual([TEKIYO_VIOLATION.CHUSHI_PAST]);
    expect(v[0].message).toContain('過去日');
  });

  it('should allow chushi == today (当日可)', () => {
    expect(
      collectChushiViolations({ chushiDate: TODAY, kaishiDate: '2026-04-01', today: TODAY }),
    ).toEqual([]);
  });

  it('should return BOTH violations when chushi < kaishi and chushi < today', () => {
    const v = collectChushiViolations({
      chushiDate: '2026-03-01',
      kaishiDate: '2026-04-01',
      today: TODAY,
    });
    expect(v.map((x) => x.kind)).toEqual([
      TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI,
      TEKIYO_VIOLATION.CHUSHI_PAST,
    ]);
  });

  it('should skip the kaishi check when kaishi is missing but still check past', () => {
    expect(
      collectChushiViolations({ chushiDate: '2026-07-06', today: TODAY }).map((x) => x.kind),
    ).toEqual([TEKIYO_VIOLATION.CHUSHI_PAST]);
  });
});

describe('tekiyoViolationField', () => {
  it('should map each kind to the standard 購読者フォーム field name', () => {
    expect(tekiyoViolationField(TEKIYO_VIOLATION.JOHO_BEFORE_KAISHI)).toBe(
      'joho_henko_tekiyo_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.HANBAITEN_AFTER_CHUSHI)).toBe(
      'hanbaiten_tekiyo_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.CHUSHI_BEFORE_KAISHI)).toBe(
      'dokusya_chushi_date',
    );
    expect(tekiyoViolationField(TEKIYO_VIOLATION.CHUSHI_PAST)).toBe(
      'dokusya_chushi_date',
    );
  });
});
