// Denshiban integration Phase 1 — unit tests for payload assembly (pure functions).
//
// Contract: docs/design-vi/Denshiban-mapper/outbound-field-matrix.md
//   §A   the field × mode matrix
//   §A-2 the settled signatures of the 3 command modes
//   §B   per-field conversion rules
//   §C   the 4 shared principles
//
// No DB / Redis / network — everything runs offline.

import { buildDokusya } from '@test/fixtures/dokusya.factory';
import { toPaymentStart } from './denshiban-payment-start';
import {
  type BuildCtx,
  DenshibanMappingError,
  buildCommandPayload,
  buildCreatePayload,
  buildUpdatePayload,
  toProducts,
  toProfession,
  toRemarks,
  toSex,
  toSubscribeFlg,
  toTel,
} from './denshiban-payload.builder';
import { assertPayload } from './denshiban-payload.validator';

/** 2026-07-14 12:00 JST. Billing start month 202607 = this month, 202608 = next month. */
const NOW = new Date('2026-07-14T03:00:00Z');

/**
 * The builder has no clock — the caller resolves `payment_start` via
 * `toPaymentStart()` and passes it in (the default here is this month = '0').
 */
function ctx(overrides: Partial<BuildCtx> = {}): BuildCtx {
  return { jacdExecute: '1234567890', paymentStart: '0', ...overrides };
}

/** The default subscriber that can sync to denshiban (digital / farmer / starts today). */
function buildDenshiDokusya(overrides = {}) {
  return buildDokusya({
    dokusyaShubetsu: 2, // digital
    denshiKaiinId: 12345,
    dokusyaKaishiDate: '2026-07-14', // Same day as NOW → payment_start = '0'
    dokusyasoBunrui: '農業者',
    nogyosyaBunrui: '米,野菜',
    biko: '',
    ...overrides,
  });
}

describe('単位変換', () => {
  describe('toSubscribeFlg', () => {
    it('併読 (3) は紙版購読あり → 1', () => {
      expect(toSubscribeFlg(3)).toBe('1');
    });

    it('電子版 (2) は紙版購読なし → 0', () => {
      expect(toSubscribeFlg(2)).toBe('0');
    });
  });

  describe('toSex', () => {
    // The codes are inverted between cloud and denshiban — get this wrong and
    // genders swap.
    it('cloud 女 (2) → 電子版 0', () => {
      expect(toSex(2)).toBe('0');
    });

    it('cloud 男 (1) → 電子版 1', () => {
      expect(toSex(1)).toBe('1');
    });

    it('無回答 (9) / 未設定 (null) → 9', () => {
      expect(toSex(9)).toBe('9');
      expect(toSex(null)).toBe('9');
    });
  });

  describe('toTel', () => {
    it('ハイフンを除去する', () => {
      expect(toTel('03-1234-5678')).toBe('0312345678');
    });
  });

  // Subscription start date (dokusya_kaishi_date) → denshiban's two choices
  // (0: today / 1: the 1st of next month).
  describe('toPaymentStart', () => {
    it('当日 → 0', () => {
      expect(toPaymentStart('2026-07-14', NOW)).toBe('0');
    });

    it('翌月1日 → 1', () => {
      expect(toPaymentStart('2026-08-01', NOW)).toBe('1');
    });

    it('年跨ぎ (12月 → 翌年1月1日) を翌月1日と判定する', () => {
      const dec = new Date('2026-12-05T03:00:00Z'); // 2026-12-05 JST
      expect(toPaymentStart('2027-01-01', dec)).toBe('1');
    });

    it('スラッシュ区切りも受ける', () => {
      expect(toPaymentStart('2026/07/14', NOW)).toBe('0');
    });

    it('翌月1日以外の翌月日 (翌月15日) は投げる', () => {
      expect(() => toPaymentStart('2026-08-15', NOW)).toThrow(
        DenshibanMappingError,
      );
    });

    it('当月の別日 (明日) も投げる — 電子版は「当日」しか表せない', () => {
      expect(() => toPaymentStart('2026-07-15', NOW)).toThrow(
        DenshibanMappingError,
      );
    });

    it('過去日は投げる', () => {
      expect(() => toPaymentStart('2026-07-13', NOW)).toThrow(
        DenshibanMappingError,
      );
    });

    it('空も投げる（黙って 0 を送らない）', () => {
      expect(() => toPaymentStart('', NOW)).toThrow(DenshibanMappingError);
    });

    it('日付境界を JST で判定する（UTC だと前日になる時刻でも当日扱い）', () => {
      // 2026-07-01 05:00 JST = 2026-06-30 20:00 UTC. In UTC terms it's 06-30.
      const justAfterJstMidnight = new Date('2026-06-30T20:00:00Z');
      expect(toPaymentStart('2026-07-01', justAfterJstMidnight)).toBe('0');
      // At the same instant, "the 1st of next month" is 08-01.
      expect(toPaymentStart('2026-08-01', justAfterJstMidnight)).toBe('1');
    });
  });

  describe('toRemarks', () => {
    it('1〜4行目をそれぞれ remarks1..4 に入れる', () => {
      expect(toRemarks('a\nb\nc\nd')).toEqual({
        remarks1: 'a',
        remarks2: 'b',
        remarks3: 'c',
        remarks4: 'd',
      });
    });

    it('5行目以降は改行込みで remarks5 にまとめる（行を捨てない）', () => {
      expect(toRemarks('a\nb\nc\nd\ne\nf')).toEqual({
        remarks1: 'a',
        remarks2: 'b',
        remarks3: 'c',
        remarks4: 'd',
        remarks5: 'e\nf',
      });
    });

    it('各スロットを 255 文字で切る', () => {
      const long = 'あ'.repeat(300);
      expect(toRemarks(long).remarks1).toHaveLength(255);
    });

    it('空文字はキーを作らない', () => {
      expect(toRemarks('')).toEqual({});
    });

    it('空行のスロットはキーを作らない', () => {
      expect(toRemarks('a\n\nc')).toEqual({ remarks1: 'a', remarks3: 'c' });
    });
  });

  describe('toProfession', () => {
    it.each([
      ['農業者', '0'],
      ['JAグループ役職員', '1'],
      ['企業・団体', '2'],
      ['学生', '3'],
    ])('ラベル %s → profession %s', (label, code) => {
      expect(toProfession(label)).toEqual({ profession: code });
    });

    it('その他 → 999 + others_profession に固定値を添える', () => {
      expect(toProfession('その他')).toEqual({
        profession: '999',
        others_profession: '会社員',
      });
    });

    it('複数選択は投げる（先頭だけ送ると残りが黙って消えるため）', () => {
      expect(() => toProfession('農業者,学生')).toThrow(DenshibanMappingError);
    });

    it('未選択は投げる（電子版では必須）', () => {
      expect(() => toProfession('')).toThrow(DenshibanMappingError);
    });

    it('未知のラベルは投げる', () => {
      expect(() => toProfession('宇宙飛行士')).toThrow(DenshibanMappingError);
    });
  });

  describe('toProducts', () => {
    it('複数選択をカンマ区切りのコードにする（products は複数可）', () => {
      expect(toProducts('米,野菜')).toEqual({ products: '0,1' });
    });

    it('その他を含むと 999 + others_products の固定値が付く', () => {
      expect(toProducts('米,その他')).toEqual({
        products: '0,999',
        others_products: 'その他の農畜産物',
      });
    });

    it('空は何も返さない', () => {
      expect(toProducts('')).toEqual({});
    });

    it('未知のラベルは投げる', () => {
      expect(() => toProducts('コーヒー')).toThrow(DenshibanMappingError);
    });
  });
});

describe('buildCreatePayload', () => {
  it('プロフィール全項目 + payment_start を組み立てる', () => {
    const d = buildDenshiDokusya({
      shimeiSei: '山田',
      shimeiMei: '太郎',
      shimeiKanaSei: 'やまだ',
      shimeiKanaMei: 'たろう',
      yubinNo: '1108722',
      todofukenCode: '13',
      shikuchoson: '台東区秋葉原',
      chomeBanchi: '3-2',
      tatemonoMei: '日本農業新聞社ビル',
      renrakusaki1: '03-6281-5801',
      email: 'x@agrinews.co.jp',
      mailMagazineFlg: 1,
      birthYear: 1990,
      gender: 2,
    });

    expect(buildCreatePayload(d, ctx())).toEqual({
      action_kbn: 'create',
      jacd_execute: '1234567890',
      first_name: '山田',
      last_name: '太郎',
      first_kana: 'やまだ',
      last_kana: 'たろう',
      zip: '1108722',
      pref_id: '13',
      addr: '台東区秋葉原',
      city: '3-2',
      building: '日本農業新聞社ビル',
      tel: '0362815801',
      email: 'x@agrinews.co.jp',
      subscribe_flg: '0',
      melmaga: '1',
      birthyear: '1990',
      sex: '0',
      profession: '0',
      products: '0,1',
      payment_start: '0',
    });
  });

  it('id / jacd / notify_flg を含めない（create には存在しないフィールド）', () => {
    const payload = buildCreatePayload(buildDenshiDokusya(), ctx({ jacd: '9999999999' }));
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('jacd');
    expect(payload).not.toHaveProperty('notify_flg');
  });

  it('カナを変換しない（素通し）', () => {
    const d = buildDenshiDokusya({ shimeiKanaSei: 'ヤマダ' });
    expect(buildCreatePayload(d, ctx()).first_kana).toBe('ヤマダ');
  });

  it('都道府県コードの先頭 0 を落とさない（往復で値が変わらないように）', () => {
    const d = buildDenshiDokusya({ todofukenCode: '01' });
    expect(buildCreatePayload(d, ctx()).pref_id).toBe('01');
  });

  it('空の任意フィールドはキーごと落とす（"" を送らない）', () => {
    const d = buildDenshiDokusya({ tatemonoMei: '', birthYear: null, biko: '' });
    const payload = buildCreatePayload(d, ctx());
    expect(payload).not.toHaveProperty('building');
    expect(payload).not.toHaveProperty('birthyear');
    expect(payload).not.toHaveProperty('remarks1');
  });

  it('農業者以外では products を送らない（profession=0 のときのみ許可）', () => {
    const d = buildDenshiDokusya({
      dokusyasoBunrui: '学生',
      nogyosyaBunrui: '米', // The screen should clear it, but even if it lingers we don't send it
    });
    const payload = buildCreatePayload(d, ctx());
    expect(payload.profession).toBe('3');
    expect(payload).not.toHaveProperty('products');
  });

  it('cloud に出所が無い branch / profession_and_* は送らない', () => {
    const payload = buildCreatePayload(buildDenshiDokusya(), ctx());
    expect(payload).not.toHaveProperty('branch');
    expect(payload).not.toHaveProperty('profession_and_ja');
    expect(payload).not.toHaveProperty('profession_and_agri');
  });

  it('併読 (3) は subscribe_flg=1', () => {
    const d = buildDenshiDokusya({ dokusyaShubetsu: 3 });
    expect(buildCreatePayload(d, ctx()).subscribe_flg).toBe('1');
  });

  it('timestamp は組み立てない（送信直前に打つため）', () => {
    expect(buildCreatePayload(buildDenshiDokusya(), ctx())).not.toHaveProperty(
      'timestamp',
    );
  });

  it('paymentStart の渡し忘れは投げる（黙って落とさない）', () => {
    expect(() =>
      buildCreatePayload(buildDenshiDokusya(), {
        jacdExecute: '1234567890',
      }),
    ).toThrow(DenshibanMappingError);
  });
});

describe('buildUpdatePayload', () => {
  it('変わったフィールドだけ + 必須フィールドを送る', () => {
    const before = buildDenshiDokusya();
    const after = buildDenshiDokusya({ ...before, email: 'new@example.com' });

    expect(buildUpdatePayload(before, after, ctx(), 'update')).toEqual({
      action_kbn: 'update',
      jacd_execute: '1234567890',
      id: '12345',
      notify_flg: '0',
      email: 'new@example.com',
    });
  });

  it('reread も同じシグネチャ（action_kbn だけ違う）', () => {
    const before = buildDenshiDokusya();
    const after = buildDenshiDokusya({ ...before, email: 'new@example.com' });
    expect(buildUpdatePayload(before, after, ctx(), 'reread').action_kbn).toBe(
      'reread',
    );
  });

  it('何も変わっていなければ必須フィールドだけになる', () => {
    const d = buildDenshiDokusya();
    expect(buildUpdatePayload(d, { ...d }, ctx(), 'update')).toEqual({
      action_kbn: 'update',
      jacd_execute: '1234567890',
      id: '12345',
      notify_flg: '0',
    });
  });

  it('notify_flg の既定は 0（通知しない）', () => {
    const d = buildDenshiDokusya();
    expect(buildUpdatePayload(d, { ...d }, ctx(), 'update').notify_flg).toBe('0');
    expect(
      buildUpdatePayload(d, { ...d }, ctx({ notifyFlg: '1' }), 'update').notify_flg,
    ).toBe('1');
  });

  it('jacd は指定されたときだけ送る（JA 間移管）', () => {
    const d = buildDenshiDokusya();
    expect(buildUpdatePayload(d, { ...d }, ctx(), 'update')).not.toHaveProperty(
      'jacd',
    );
    expect(
      buildUpdatePayload(d, { ...d }, ctx({ jacd: '9999999999' }), 'update').jacd,
    ).toBe('9999999999');
  });

  it('備考の1行変更が remarks の該当スロットだけに出る', () => {
    const before = buildDenshiDokusya({ biko: 'a\nb' });
    const after = buildDenshiDokusya({ ...before, biko: 'a\nB' });
    const payload = buildUpdatePayload(before, after, ctx(), 'update');
    expect(payload.remarks2).toBe('B');
    expect(payload).not.toHaveProperty('remarks1');
  });

  it('生産物だけ変わっても profession を一緒に送る（products は単独で送れない）', () => {
    const before = buildDenshiDokusya({ nogyosyaBunrui: '米' });
    const after = buildDenshiDokusya({ ...before, nogyosyaBunrui: '米,野菜' });

    const payload = buildUpdatePayload(before, after, ctx(), 'update');
    expect(payload.products).toBe('0,1');
    // profession itself didn't change, but it's a condition field so it goes along.
    expect(payload.profession).toBe('0');
    expect(() => assertPayload(payload)).not.toThrow();
  });

  it('未同期（denshi_kaiin_id が NULL）は投げる', () => {
    const d = buildDenshiDokusya({ denshiKaiinId: null });
    expect(() => buildUpdatePayload(d, { ...d }, ctx(), 'update')).toThrow(
      DenshibanMappingError,
    );
  });

  it('payment_start は update 系に存在しない', () => {
    const d = buildDenshiDokusya();
    expect(
      buildUpdatePayload(d, { ...d }, ctx(), 'update'),
    ).not.toHaveProperty('payment_start');
  });
});

describe('buildCommandPayload', () => {
  it('cancel — id + cancel_ym + notify_flg（payment_start は無い）', () => {
    const d = buildDenshiDokusya();
    expect(
      buildCommandPayload(d, ctx({ cancelYm: '202608', notifyFlg: '1' }), 'cancel'),
    ).toEqual({
      action_kbn: 'cancel',
      jacd_execute: '1234567890',
      id: '12345',
      cancel_ym: '202608',
      notify_flg: '1',
    });
  });

  it('cancel で解約月が無ければ投げる', () => {
    expect(() =>
      buildCommandPayload(buildDenshiDokusya(), ctx(), 'cancel'),
    ).toThrow(DenshibanMappingError);
  });

  // Approval = settling "when does the subscription start". Same conversion as create.
  it('approve — id + payment_start（購読開始日から導出、notify_flg は無い）', () => {
    const d = buildDenshiDokusya({ dokusyaKaishiDate: '2026-08-01' });
    expect(
      buildCommandPayload(
        d,
        ctx({ paymentStart: toPaymentStart(d.dokusyaKaishiDate, NOW) }),
        'approve',
      ),
    ).toEqual({
      action_kbn: 'approve',
      jacd_execute: '1234567890',
      id: '12345',
      payment_start: '1',
    });
  });

  it('unapprove も payment_start が必須（API 仕様のクセ — 省くと V** になる）', () => {
    const d = buildDenshiDokusya();
    expect(buildCommandPayload(d, ctx(), 'unapprove')).toEqual({
      action_kbn: 'unapprove',
      jacd_execute: '1234567890',
      id: '12345',
      payment_start: '0',
    });
  });

  it('プロフィールを一切載せない', () => {
    const payload = buildCommandPayload(buildDenshiDokusya(), ctx(), 'approve');
    expect(payload).not.toHaveProperty('first_name');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('profession');
  });

  it('未同期（denshi_kaiin_id が NULL）は投げる', () => {
    const d = buildDenshiDokusya({ denshiKaiinId: null });
    expect(() => buildCommandPayload(d, ctx(), 'approve')).toThrow(
      DenshibanMappingError,
    );
  });

  it('approve / unapprove で paymentStart の渡し忘れは投げる', () => {
    const d = buildDenshiDokusya();
    const bare: BuildCtx = { jacdExecute: '1234567890' };
    expect(() => buildCommandPayload(d, bare, 'approve')).toThrow(
      DenshibanMappingError,
    );
    expect(() => buildCommandPayload(d, bare, 'unapprove')).toThrow(
      DenshibanMappingError,
    );
    // cancel has no payment_start, so forgetting to pass it is harmless.
    expect(() =>
      buildCommandPayload(d, { ...bare, cancelYm: '202608' }, 'cancel'),
    ).not.toThrow();
  });
});

describe('assertPayload', () => {
  it('正常な create ペイロードは通る', () => {
    const payload = buildCreatePayload(buildDenshiDokusya(), ctx());
    expect(() => assertPayload(payload)).not.toThrow();
  });

  it.each(['cancel', 'approve', 'unapprove'] as const)(
    '正常な %s ペイロードは通る',
    (mode) => {
      const payload = buildCommandPayload(
        buildDenshiDokusya(),
        ctx({ cancelYm: '202608' }),
        mode,
      );
      expect(() => assertPayload(payload)).not.toThrow();
    },
  );

  it('jacd_execute が 10桁でなければ落とす', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya(),
      ctx({ jacdExecute: '123' }),
    );
    expect(() => assertPayload(payload)).toThrow(/jacd_execute/);
  });

  it('必須フィールドが空なら落とす（電子版に判定させない）', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya({ shimeiSei: '' }),
      ctx(),
    );
    expect(() => assertPayload(payload)).toThrow(/first_name/);
  });

  it('長さ超過を落とす', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya({ shikuchoson: 'あ'.repeat(256) }),
      ctx(),
    );
    expect(() => assertPayload(payload)).toThrow(/addr/);
  });

  it('電話番号に数字以外が混ざれば落とす', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya({ renrakusaki1: '03-1234-ABCD' }),
      ctx(),
    );
    expect(() => assertPayload(payload)).toThrow(/tel/);
  });

  it('cancel_ym が YYYYMM でなければ落とす', () => {
    const payload = buildCommandPayload(
      buildDenshiDokusya(),
      ctx({ cancelYm: '2026-08' }),
      'cancel',
    );
    expect(() => assertPayload(payload)).toThrow(/cancel_ym/);
  });

  it('profession=0 以外で products を載せると落とす（条件違反）', () => {
    const payload = buildCreatePayload(buildDenshiDokusya(), ctx());
    payload.profession = '3';
    expect(() => assertPayload(payload)).toThrow(/products/);
  });

  it('仕様に無いキーを載せると落とす（勝手な追加の保険）', () => {
    const payload = buildCreatePayload(buildDenshiDokusya(), ctx());
    payload.nickname = 'たろちゃん';
    expect(() => assertPayload(payload)).toThrow(/nickname/);
  });

  it('違反を1件目で止めずまとめて報告する', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya({ shimeiSei: '', shimeiMei: '' }),
      ctx(),
    );
    expect(() => assertPayload(payload)).toThrow(/first_name.*last_name/s);
  });

  it('エラーは cloud 側の列名を持つ（画面のどの項目かを特定できる）', () => {
    const payload = buildCreatePayload(
      buildDenshiDokusya({ shimeiSei: '' }),
      ctx(),
    );
    try {
      assertPayload(payload);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DenshibanMappingError);
      expect((err as DenshibanMappingError).field).toBe('shimei_sei');
    }
  });
});
