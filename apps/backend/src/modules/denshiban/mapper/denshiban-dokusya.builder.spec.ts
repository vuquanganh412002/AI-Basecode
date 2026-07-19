// Denshiban INBOUND — unit tests for the reverse mapper (users view → t_dokusya).
//
// Contract: docs/design-vi/Denshiban-mapper/Display-Rireki-And-Mapping-Denshiban.md §1
//   (the authoritative 62-row `t_dokusya` ← `users` table). `No N` = that table's row.
//
// Pure functions — no DB / network. This is the mirror of
// denshiban-payload.builder.spec.ts (cloud → API).

import { DenshibanMappingError } from './denshiban-payload.builder';
import {
  type DenshibanUserRow,
  type InboundBuildCtx,
  buildDokusyaFromDenshiban,
  fromRemarks,
  toDenshiDokusyaShubetsu,
  toDokusyaShubetsu,
  toDokusyasoBunrui,
  toGender,
  toNogyosyaBunrui,
  toShoninStatus,
  toTetsuzukiShurui,
  toYubinNo,
} from './denshiban-dokusya.builder';

/** FK ids + payment method the assembler resolves; the builder just places them. */
function ctx(overrides: Partial<InboundBuildCtx> = {}): InboundBuildCtx {
  return {
    jaId: 1,
    kanriShitenId: 10,
    hanbaitenId: 5,
    shiharaiHoho: 1,
    ...overrides,
  };
}

/** A default-valid digital (電子版) users row — every consumed column populated. */
function buildUserRow(overrides: Partial<DenshibanUserRow> = {}): DenshibanUserRow {
  return {
    id: '12345',
    first_name: '山田',
    last_name: '太郎',
    first_kana: 'ヤマダ',
    last_kana: 'タロウ',
    zip1: '110',
    zip2: '8722',
    pref_id: '13',
    addr: '台東区秋葉原',
    city: '3-2',
    building: '日本農業新聞社ビル',
    tel1: '0362815801',
    tel2: '0900000000',
    email: 'x@agrinews.co.jp',
    melmaga: '1',
    birthyear: '1990',
    sex: '1',
    member_type: '2',
    status: '1',
    approval: '1',
    payment_cycle: '12',
    payment_start_ym: '202607',
    profession: '0',
    others_profession: null,
    products: '0,1',
    others_products: null,
    remarks1: 'メモ1',
    remarks2: null,
    remarks3: null,
    remarks4: null,
    remarks5: null,
    paper_permission_dt: null,
    paper_zip: null,
    paper_pref_id: null,
    paper_addr: null,
    paper_city: null,
    paper_building: null,
    activated_at: '2026-07-14',
    deleted_at: null,
    ...overrides,
  };
}

describe('単位変換 (逆方向)', () => {
  describe('toYubinNo', () => {
    it('zip1 + zip2 を連結する（ハイフン無し）', () => {
      expect(toYubinNo('110', '8722')).toBe('1108722');
    });

    it('数字以外を除去する', () => {
      expect(toYubinNo('110-', '8722')).toBe('1108722');
    });

    it('空は空文字', () => {
      expect(toYubinNo(null, null)).toBe('');
    });
  });

  describe('toGender', () => {
    // The codes are inverted — the exact reverse of the outbound toSex.
    it('電子版 0 (女性) → cloud 2', () => {
      expect(toGender('0')).toBe(2);
    });

    it('電子版 1 (男性) → cloud 1', () => {
      expect(toGender('1')).toBe(1);
    });

    it('9 / 空 / 未対応 → 9 (無回答)', () => {
      expect(toGender('9')).toBe(9);
      expect(toGender('')).toBe(9);
      expect(toGender(null)).toBe(9);
      expect(toGender('7')).toBe(9);
    });
  });

  describe('toDenshiDokusyaShubetsu', () => {
    it('1 (無料) → 0, 2 (有料) → 1', () => {
      expect(toDenshiDokusyaShubetsu('1')).toBe(0);
      expect(toDenshiDokusyaShubetsu('2')).toBe(1);
    });

    it('空 → null', () => {
      expect(toDenshiDokusyaShubetsu('')).toBeNull();
      expect(toDenshiDokusyaShubetsu(null)).toBeNull();
    });

    it('未対応値は投げる', () => {
      expect(() => toDenshiDokusyaShubetsu('3')).toThrow(DenshibanMappingError);
    });
  });

  describe('toTetsuzukiShurui', () => {
    it('9 (解約) → 0', () => {
      expect(toTetsuzukiShurui('9')).toBe(0);
    });

    it.each(['0', '1', '2', '3'])('%s (新規系) → 1', (status) => {
      expect(toTetsuzukiShurui(status)).toBe(1);
    });

    it('未対応 / 空は投げる', () => {
      expect(() => toTetsuzukiShurui('5')).toThrow(DenshibanMappingError);
      expect(() => toTetsuzukiShurui('')).toThrow(DenshibanMappingError);
    });
  });

  describe('toDokusyaShubetsu', () => {
    it('paper_permission_dt があれば 併読 (3)', () => {
      expect(toDokusyaShubetsu('2026-07-01')).toBe(3);
    });

    it('無ければ 電子版 (2)', () => {
      expect(toDokusyaShubetsu(null)).toBe(2);
      expect(toDokusyaShubetsu('')).toBe(2);
    });
  });

  describe('toShoninStatus', () => {
    it.each([
      ['0', 0],
      ['1', 1],
      ['2', 2],
    ])('approval %s → %s', (approval, expected) => {
      expect(toShoninStatus(approval)).toBe(expected);
    });

    it('9 (対象外) / 空 → null', () => {
      expect(toShoninStatus('9')).toBeNull();
      expect(toShoninStatus('')).toBeNull();
      expect(toShoninStatus(null)).toBeNull();
    });

    it('未対応値は投げる', () => {
      expect(() => toShoninStatus('5')).toThrow(DenshibanMappingError);
    });
  });

  describe('toDokusyasoBunrui', () => {
    it.each([
      ['0', '農業者'],
      ['1', 'JAグループ役職員'],
      ['2', '企業・団体'],
      ['3', '学生'],
      ['999', 'その他'],
    ])('profession %s → %s', (code, label) => {
      expect(toDokusyasoBunrui(code)).toBe(label);
    });

    it('空は空文字', () => {
      expect(toDokusyasoBunrui('')).toBe('');
    });

    it('未知コードは投げる', () => {
      expect(() => toDokusyasoBunrui('42')).toThrow(DenshibanMappingError);
    });
  });

  describe('toNogyosyaBunrui', () => {
    it('CSV を各ラベルに変換して連結する', () => {
      expect(toNogyosyaBunrui('0,1')).toBe('米,野菜');
    });

    it('5 (酪農) を変換できる（入方向専用コード）', () => {
      expect(toNogyosyaBunrui('4,5')).toBe('畜産,酪農');
    });

    it('999 (その他) を変換できる', () => {
      expect(toNogyosyaBunrui('0,999')).toBe('米,その他');
    });

    it('空は空文字', () => {
      expect(toNogyosyaBunrui('')).toBe('');
      expect(toNogyosyaBunrui(null)).toBe('');
    });

    it('未知コードは投げる', () => {
      expect(() => toNogyosyaBunrui('0,7')).toThrow(DenshibanMappingError);
    });
  });

  describe('fromRemarks', () => {
    it('非空スロットを改行で連結する', () => {
      expect(
        fromRemarks({ remarks1: 'a', remarks2: 'b', remarks3: 'c' }),
      ).toBe('a\nb\nc');
    });

    it('空スロットは飛ばす', () => {
      expect(
        fromRemarks({ remarks1: 'a', remarks2: '', remarks3: 'c' }),
      ).toBe('a\nc');
    });

    it('remarks5 の埋め込み改行を保持する（往復で行を落とさない）', () => {
      expect(
        fromRemarks({ remarks1: 'a', remarks5: 'e\nf' }),
      ).toBe('a\ne\nf');
    });

    it('全て空なら空文字', () => {
      expect(fromRemarks({})).toBe('');
    });
  });
});

describe('buildDokusyaFromDenshiban', () => {
  it('電子版レコードの全項目を組み立てる', () => {
    const draft = buildDokusyaFromDenshiban(buildUserRow(), ctx());

    expect(draft).toMatchObject({
      // ctx
      jaId: 1,
      kanriShitenId: 10,
      hanbaitenId: 5,
      shiharaiHoho: 1,
      rirekiNo: 1,
      johoHenkoTekiyoDate: null,
      // identity / classification
      denshiKaiinId: 12345,
      dokusyaShubetsu: 2, // 電子版
      tetsuzukiShurui: 1, // 新規
      denshiDokusyaShubetsu: 1, // member_type=2 (有料)
      denshiShoninStatus: 1, // approval=1
      // name
      shimeiSei: '山田',
      shimeiMei: '太郎',
      shimeiKanaSei: 'ヤマダ',
      shimeiKanaMei: 'タロウ',
      // address
      yubinNo: '1108722',
      todofukenCode: '13',
      shikuchoson: '台東区秋葉原',
      chomeBanchi: '3-2',
      tatemonoMei: '日本農業新聞社ビル',
      renrakusaki1: '0362815801',
      renrakusaki2: '0900000000',
      email: 'x@agrinews.co.jp',
      // attributes
      mailMagazineFlg: 1,
      birthYear: 1990,
      gender: 1,
      dokusyasoBunrui: '農業者',
      nogyosyaBunrui: '米,野菜',
      // billing
      dokusyaryoShiharaiCycle: 12,
      seikyuKaishiMonth: '202607',
      // dates
      shokiDokusyaKaishiDate: '2026-07-14',
      dokusyaKaishiDate: '2026-07-14',
      dokusyaChushiDate: null,
      // notes
      biko: 'メモ1',
    });
  });

  it('電子版は配達先を購読者と同じ (haitatsu_same_flg=TRUE) にし、配達先住所を空にする', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow({ paper_zip: '9999999', paper_addr: '無視される' }),
      ctx(),
    );
    expect(draft.haitatsuSameFlg).toBe(true);
    expect(draft.haitatsuYubinNo).toBe('');
    expect(draft.haitatsuShikuchoson).toBe('');
  });

  it('併読は haitatsu_same_flg=FALSE + paper_* から配達先を埋める', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow({
        paper_permission_dt: '2026-07-01',
        paper_zip: '160-0022',
        paper_pref_id: '13',
        paper_addr: '新宿区',
        paper_city: '新宿1-1',
        paper_building: 'XXビル',
      }),
      ctx(),
    );
    expect(draft.dokusyaShubetsu).toBe(3); // 併読
    expect(draft.haitatsuSameFlg).toBe(false);
    expect(draft.haitatsuYubinNo).toBe('1600022');
    expect(draft.haitatsuTodofukenCode).toBe('13');
    expect(draft.haitatsuShikuchoson).toBe('新宿区');
    expect(draft.haitatsuChomeBanchi).toBe('新宿1-1');
    expect(draft.haitatsuTatemonoMei).toBe('XXビル');
  });

  it('配達先の氏名・電話はビューに無いので常に空文字', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow({ paper_permission_dt: '2026-07-01', paper_addr: '新宿区' }),
      ctx(),
    );
    expect(draft.haitatsuRenrakusaki1).toBe('');
    expect(draft.haitatsuShimeiSei).toBe('');
    expect(draft.haitatsuShimeiKanaMei).toBe('');
  });

  it('解約 (status=9) は購読中止日を deleted_at から設定する', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow({ status: '9', deleted_at: '2026-07-20' }),
      ctx(),
    );
    expect(draft.tetsuzukiShurui).toBe(0); // 解約
    expect(draft.dokusyaChushiDate).toBe('2026-07-20');
  });

  it('未解約は購読中止日を null にする', () => {
    const draft = buildDokusyaFromDenshiban(buildUserRow({ status: '1' }), ctx());
    expect(draft.dokusyaChushiDate).toBeNull();
  });

  it('その他 (999) 職業をラベルに変換する', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow({ profession: '999', others_profession: '会社員', products: '' }),
      ctx(),
    );
    expect(draft.dokusyasoBunrui).toBe('その他');
  });

  it('未同期 (id 空) は denshi_kaiin_id を null にする', () => {
    const draft = buildDokusyaFromDenshiban(buildUserRow({ id: null }), ctx());
    expect(draft.denshiKaiinId).toBeNull();
  });

  it('ctx の rireki_no / syncDate を反映する', () => {
    const draft = buildDokusyaFromDenshiban(
      buildUserRow(),
      ctx({ rirekiNo: 3, syncDate: '2026-07-18' }),
    );
    expect(draft.rirekiNo).toBe(3);
    expect(draft.johoHenkoTekiyoDate).toBe('2026-07-18');
  });

  it('固定値（No 4/5/14/39/40/43-47）を仕様どおり設定する', () => {
    const draft = buildDokusyaFromDenshiban(buildUserRow(), ctx());
    expect(draft.shitenId).toBeNull();
    expect(draft.kumiaiinCode).toBe('');
    expect(draft.dokusyaBusu).toBe(1);
    expect(draft.tankaId).toBeNull();
    expect(draft.yubinKubun).toBe('0');
    expect(draft.bankBranchCode).toBe('');
    expect(draft.bankBranchName).toBe('');
    expect(draft.hikiotoshiYokinShubetsu).toBeNull();
    expect(draft.hikiotoshiKozaNo).toBe('');
    expect(draft.hikiotoshiKozaMeigi).toBe('');
  });

  it('数値でない id は投げる', () => {
    expect(() =>
      buildDokusyaFromDenshiban(buildUserRow({ id: 'abc' }), ctx()),
    ).toThrow(DenshibanMappingError);
  });

  it('4桁でない誕生年は投げる', () => {
    expect(() =>
      buildDokusyaFromDenshiban(buildUserRow({ birthyear: '90' }), ctx()),
    ).toThrow(DenshibanMappingError);
  });
});
