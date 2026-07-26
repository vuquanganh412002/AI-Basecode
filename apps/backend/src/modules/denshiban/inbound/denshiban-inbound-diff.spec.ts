import {
  buildDokusyaFromDenshiban,
  type DenshibanUserRow,
  type DokusyaDraft,
  type InboundBuildCtx,
} from '../mapper/denshiban-dokusya.builder';

import {
  classifyInbound,
  COMPARABLE_FIELDS,
  EXCLUDED_FIELDS_DOC,
  type ComparableField,
  type DokusyaSnapshot,
} from './denshiban-inbound-diff';

// ── Fixtures ────────────────────────────────────────────────────────────────

/** A full 電子版(2) draft with sensible defaults; override any field. */
function makeDraft(overrides: Partial<DokusyaDraft> = {}): DokusyaDraft {
  return {
    // ctx-resolved (all excluded from the diff)
    jaId: 1,
    kanriShitenId: 10,
    hanbaitenId: 100,
    shiharaiHoho: 1,
    rirekiNo: 1,
    johoHenkoTekiyoDate: '2026-07-18',
    // identity / classification
    denshiKaiinId: 5001,
    dokusyaShubetsu: 2,
    tetsuzukiShurui: 1,
    denshiDokusyaShubetsu: 1,
    denshiShoninStatus: 1,
    // name
    shimeiSei: '山田',
    shimeiMei: '太郎',
    shimeiKanaSei: 'ﾔﾏﾀﾞ',
    shimeiKanaMei: 'ﾀﾛｳ',
    // address
    yubinNo: '1234567',
    todofukenCode: '13',
    shikuchoson: '千代田区',
    chomeBanchi: '1-1',
    tatemonoMei: '',
    renrakusaki1: '0312345678',
    renrakusaki2: '',
    email: 'taro@example.jp',
    // attributes
    mailMagazineFlg: 1,
    honshiKodokuFlg: false,
    birthYear: 1990,
    gender: 1,
    dokusyasoBunrui: '農業者',
    nogyosyaBunrui: '米,野菜',
    // paper delivery
    haitatsuSameFlg: true,
    haitatsuYubinNo: '',
    haitatsuTodofukenCode: '',
    haitatsuShikuchoson: '',
    haitatsuChomeBanchi: '',
    haitatsuTatemonoMei: '',
    haitatsuRenrakusaki1: '',
    haitatsuRenrakusaki2: '',
    haitatsuShimeiSei: '',
    haitatsuShimeiMei: '',
    haitatsuShimeiKanaSei: '',
    haitatsuShimeiKanaMei: '',
    // payment / billing
    dokusyaryoShiharaiCycle: 12,
    seikyuKaishiMonth: '202607',
    // dates
    shokiDokusyaKaishiDate: '2026-07-01',
    dokusyaKaishiDate: '2026-07-01',
    dokusyaChushiDate: null,
    // notes
    biko: '',
    // cloud constants (all excluded)
    shitenId: null,
    kumiaiinCode: '',
    dokusyaBusu: 1,
    tankaId: null,
    yubinKubun: '0',
    bankBranchCode: '',
    bankBranchName: '',
    hikiotoshiYokinShubetsu: null,
    hikiotoshiKozaNo: '',
    hikiotoshiKozaMeigi: '',
    ...overrides,
  };
}

/** Projects a draft to the comparable-only snapshot an existing row would expose. */
function snapshotOf(draft: DokusyaDraft): DokusyaSnapshot {
  const snap = {} as Record<ComparableField, unknown>;
  for (const f of COMPARABLE_FIELDS) snap[f] = draft[f];
  return snap as DokusyaSnapshot;
}

// ── create / skip / update ───────────────────────────────────────────────────

describe('classifyInbound — action', () => {
  it('未マッチ（existing=null）は create（draft をそのまま載せる）', () => {
    const draft = makeDraft();

    const decision = classifyInbound(draft, null);

    expect(decision).toEqual({ kind: 'create', draft });
  });

  it('全比較列が一致なら skip', () => {
    const draft = makeDraft();

    expect(classifyInbound(draft, snapshotOf(draft))).toEqual({ kind: 'skip' });
  });

  it('1列だけ差分 → update に その列だけ載る（新しい値）', () => {
    const before = makeDraft({ email: 'old@example.jp' });
    const after = makeDraft({ email: 'new@example.jp' });

    const decision = classifyInbound(after, snapshotOf(before));

    expect(decision).toEqual({ kind: 'update', changes: { email: 'new@example.jp' } });
  });

  it('複数列の差分 → 変わった列だけ載る', () => {
    const before = makeDraft({ shimeiSei: '山田', renrakusaki1: '0300000000', biko: '' });
    const after = makeDraft({ shimeiSei: '田中', renrakusaki1: '0311112222', biko: 'メモ' });

    const decision = classifyInbound(after, snapshotOf(before));

    expect(decision).toEqual({
      kind: 'update',
      changes: { shimeiSei: '田中', renrakusaki1: '0311112222', biko: 'メモ' },
    });
  });
});

// ── null ↔ value transitions ──────────────────────────────────────────────────

describe('classifyInbound — null 正規化', () => {
  it('null → 値 は差分（birth_year）', () => {
    const before = snapshotOf(makeDraft({ birthYear: null }));
    const after = makeDraft({ birthYear: 2000 });

    expect(classifyInbound(after, before)).toEqual({
      kind: 'update',
      changes: { birthYear: 2000 },
    });
  });

  it('値 → null は差分（dokusya_chushi_date：解約で停止日が入る）', () => {
    const before = snapshotOf(makeDraft({ dokusyaChushiDate: null }));
    const after = makeDraft({ dokusyaChushiDate: '2026-08-01' });

    expect(classifyInbound(after, before)).toEqual({
      kind: 'update',
      changes: { dokusyaChushiDate: '2026-08-01' },
    });
  });

  it('null と null は一致（skip）', () => {
    const draft = makeDraft({ birthYear: null, gender: 9, dokusyaChushiDate: null });

    expect(classifyInbound(draft, snapshotOf(draft))).toEqual({ kind: 'skip' });
  });

  it('boolean 差分（haitatsu_same_flg：電子版→併読で false 化）', () => {
    const before = snapshotOf(makeDraft({ haitatsuSameFlg: true }));
    const after = makeDraft({ haitatsuSameFlg: false, haitatsuYubinNo: '9998888' });

    expect(classifyInbound(after, before)).toEqual({
      kind: 'update',
      changes: { haitatsuSameFlg: false, haitatsuYubinNo: '9998888' },
    });
  });
});

// ── CARE-POINT: cloud-owned columns are never diffed ──────────────────────────

describe('classifyInbound — クラウド管理列は絶対に比較しない（データ破壊防止）', () => {
  const cloudManaged: string[] = [
    'tankaId',
    'jaId',
    'kanriShitenId',
    'hanbaitenId',
    'rirekiNo',
    'johoHenkoTekiyoDate',
    'shokiDokusyaKaishiDate',
    'shitenId',
    'kumiaiinCode',
    'dokusyaBusu',
    'yubinKubun',
    'bankBranchCode',
    'bankBranchName',
    'hikiotoshiYokinShubetsu',
    'hikiotoshiKozaNo',
    'hikiotoshiKozaMeigi',
    'shiharaiHoho', // blocked on payment_id — must not diff yet
    'haitatsuShimeiSei',
    'haitatsuShimeiMei',
    'haitatsuShimeiKanaSei',
    'haitatsuShimeiKanaMei',
    'haitatsuRenrakusaki1',
    'haitatsuRenrakusaki2',
    'denshiKaiinId',
  ];

  it.each(cloudManaged)('%s は COMPARABLE_FIELDS に含まれず、除外理由が記録されている', (field) => {
    expect(COMPARABLE_FIELDS as readonly string[]).not.toContain(field);
    expect(EXCLUDED_FIELDS_DOC[field]).toBeDefined();
  });

  it('比較列と除外列は素集合（重複なし）', () => {
    for (const f of COMPARABLE_FIELDS) {
      expect(EXCLUDED_FIELDS_DOC[f]).toBeUndefined();
    }
  });

  it('draft の全列は「比較」か「明示除外」のどちらかに分類される（列の付け忘れ検知）', () => {
    const comparable = new Set<string>(COMPARABLE_FIELDS);
    const excluded = new Set(Object.keys(EXCLUDED_FIELDS_DOC));
    for (const field of Object.keys(makeDraft())) {
      expect(comparable.has(field) || excluded.has(field)).toBe(true);
    }
  });
});

// ── Integration with the real inbound builder ─────────────────────────────────

describe('classifyInbound — 実ビルダー連携', () => {
  const ctx: InboundBuildCtx = {
    jaId: 1,
    kanriShitenId: 10,
    hanbaitenId: 100,
    shiharaiHoho: 1,
    rirekiNo: 1,
    syncDate: '2026-07-18',
  };

  function userRow(overrides: Partial<DenshibanUserRow> = {}): DenshibanUserRow {
    return {
      id: '5001',
      first_name: '山田',
      last_name: '太郎',
      first_kana: 'ﾔﾏﾀﾞ',
      last_kana: 'ﾀﾛｳ',
      zip1: '123',
      zip2: '4567',
      pref_id: '13',
      addr: '千代田区',
      city: '1-1',
      building: '',
      tel1: '0312345678',
      tel2: '',
      email: 'taro@example.jp',
      melmaga: '1',
      subscribe_flg: '0',
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
      remarks1: '',
      remarks2: '',
      remarks3: '',
      remarks4: '',
      remarks5: '',
      paper_permission_dt: null,
      paper_zip: null,
      paper_pref_id: null,
      paper_addr: null,
      paper_city: null,
      paper_building: null,
      activated_at: '2026-07-01',
      deleted_at: null,
      ...overrides,
    };
  }

  it('同じ users 行 → skip（往復で false 差分が出ない）', () => {
    const draft = buildDokusyaFromDenshiban(userRow(), ctx);

    expect(classifyInbound(draft, snapshotOf(draft))).toEqual({ kind: 'skip' });
  });

  it('denshiban 側で email 変更 → その列だけ update', () => {
    const base = buildDokusyaFromDenshiban(userRow(), ctx);
    const changed = buildDokusyaFromDenshiban(
      userRow({ email: 'ja@example.jp' }),
      ctx,
    );

    expect(classifyInbound(changed, snapshotOf(base))).toEqual({
      kind: 'update',
      changes: { email: 'ja@example.jp' },
    });
  });

  it('sex 反転（1→0）は gender 差分として検出（2）', () => {
    const male = buildDokusyaFromDenshiban(userRow({ sex: '1' }), ctx);
    const female = buildDokusyaFromDenshiban(userRow({ sex: '0' }), ctx);

    expect(classifyInbound(female, snapshotOf(male))).toEqual({
      kind: 'update',
      changes: { gender: 2 },
    });
  });

  it('ctx のみ差分（payment_start 等）でも skip — 支払方法/FK は比較対象外', () => {
    const base = buildDokusyaFromDenshiban(userRow(), ctx);
    const otherCtx = buildDokusyaFromDenshiban(userRow(), {
      ...ctx,
      shiharaiHoho: 6,
      hanbaitenId: 999,
      rirekiNo: 7,
      syncDate: '2026-12-31',
    });

    expect(classifyInbound(otherCtx, snapshotOf(base))).toEqual({ kind: 'skip' });
  });
});
