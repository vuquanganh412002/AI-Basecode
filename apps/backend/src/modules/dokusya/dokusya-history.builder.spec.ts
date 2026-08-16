import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import {
  buildCounterRow,
  buildKaiyakuRow,
  buildKaiyakuReservationRow,
  buildResubscribeRow,
  buildRirekiRow,
  computeZougen,
  diffChangedFields,
  fillZenkai,
  mapRirekiToMaster,
  splitEvents,
} from './dokusya-history.builder';
import { ChangeEvent, DokusyaFields } from './dokusya-history.types';

/** Build a partial rireki row as a stand-in for `before`. */
function row(fields: DokusyaFields): DokusyaRireki {
  return fields as unknown as DokusyaRireki;
}

describe('diffChangedFields', () => {
  it('returns every key on CREATE (before = null)', () => {
    const values: DokusyaFields = { dokusyaBusu: 4, hanbaitenId: 459 };
    expect(diffChangedFields(null, values)).toEqual(['dokusyaBusu', 'hanbaitenId']);
  });

  it('returns [] when nothing differs from before', () => {
    const before = row({ dokusyaBusu: 6, hanbaitenId: 459 });
    expect(diffChangedFields(before, { dokusyaBusu: 6, hanbaitenId: 459 })).toEqual(
      [],
    );
  });

  it('returns only the changed keys', () => {
    const before = row({ dokusyaBusu: 6, hanbaitenId: 459 });
    expect(diffChangedFields(before, { dokusyaBusu: 8, hanbaitenId: 459 })).toEqual(
      ['dokusyaBusu'],
    );
  });

  it('detects an address change and ignores the unchanged pair', () => {
    const before = row({ shikuchoson: 'Chiyoda-ku', chomeBanchi: 'Kanda 1-1-1' });
    expect(
      diffChangedFields(before, {
        shikuchoson: 'Minato-ku',
        chomeBanchi: 'Kanda 1-1-1',
      }),
    ).toEqual(['shikuchoson']);
  });

  it('returns [] for empty values', () => {
    const before = row({ dokusyaBusu: 6 });
    expect(diffChangedFields(before, {})).toEqual([]);
  });

  it('treats a field missing on before as changed', () => {
    const before = row({ dokusyaBusu: 6 });
    // hikiotoshiKozaNo not present on `before` (undefined) → any value differs
    expect(diffChangedFields(before, { hikiotoshiKozaNo: '7654321' })).toEqual([
      'hikiotoshiKozaNo',
    ]);
  });
});

describe('splitEvents', () => {
  const values: DokusyaFields = {
    dokusyaBusu: 8,
    shikuchoson: 'Minato-ku',
    hanbaitenId: 460,
  };

  it('CREATE → single event with all fields, hanbaiten not split', () => {
    const events = splitEvents(
      'CREATE',
      ['dokusyaBusu', 'shikuchoson', 'hanbaitenId'],
      values,
      '2026-07-01',
    );
    expect(events).toEqual([
      {
        joho: '2026-07-01',
        values: { dokusyaBusu: 8, shikuchoson: 'Minato-ku', hanbaitenId: 460 },
      },
    ]);
  });

  // 顧客要件 2026-07: 販売店適用日を廃止し joho に統一 → UPDATE は常に1イベント
  // （UI/取込/置換で共通・1更新1レコード）。
  it('UPDATE information only → one event (1更新1レコード)', () => {
    const events = splitEvents('UPDATE', ['dokusyaBusu'], values, '2026-07-01');
    expect(events).toEqual([
      { joho: '2026-07-01', values: { dokusyaBusu: 8 } },
    ]);
  });

  it('UPDATE hanbaiten only → one event at johoDate', () => {
    const events = splitEvents('UPDATE', ['hanbaitenId'], values, '2026-07-01');
    expect(events).toEqual([
      { joho: '2026-07-01', values: { hanbaitenId: 460 } },
    ]);
  });

  it('UPDATE 情報+販売店 → 1イベントにまとめる (1更新1レコード)', () => {
    const events = splitEvents(
      'UPDATE',
      ['dokusyaBusu', 'hanbaitenId'],
      values,
      '2026-07-01',
    );
    expect(events).toEqual([
      {
        joho: '2026-07-01',
        values: { dokusyaBusu: 8, hanbaitenId: 460 },
      },
    ]);
  });

  it('no changes → no events', () => {
    expect(splitEvents('UPDATE', [], values, '2026-07-01')).toEqual([]);
  });
});

describe('fillZenkai', () => {
  it('null before → every zenkai_* becomes null', () => {
    const target = {} as unknown as DokusyaRireki;
    fillZenkai(target, null);
    expect(target).toEqual({
      zenkaiHanbaitenId: null,
      zenkaiDokusyaBusu: null,
      zenkaiYubinNo: null,
      zenkaiTodofukenCode: null,
      zenkaiShikuchoson: null,
      zenkaiChomeBanchi: null,
      zenkaiTatemonoMei: null,
    });
  });

  it('copies each business field of before into its zenkai_* column', () => {
    const before = row({
      hanbaitenId: 459,
      dokusyaBusu: 6,
      yubinNo: '1000001',
      todofukenCode: '13',
      shikuchoson: 'Chiyoda-ku',
      chomeBanchi: 'Kanda 1-1-1',
      tatemonoMei: '',
    });
    const target = {} as unknown as DokusyaRireki;
    fillZenkai(target, before);
    const t = target as unknown as Record<string, unknown>;
    expect(t.zenkaiHanbaitenId).toBe(459);
    expect(t.zenkaiDokusyaBusu).toBe(6);
    expect(t.zenkaiYubinNo).toBe('1000001');
    expect(t.zenkaiShikuchoson).toBe('Chiyoda-ku');
    expect(t.zenkaiTatemonoMei).toBe(''); // empty string kept (only nullish → null)
  });

  it('missing field on before → null', () => {
    const before = row({ dokusyaBusu: 6 }); // hanbaitenId absent
    const target = {} as unknown as DokusyaRireki;
    fillZenkai(target, before);
    const t = target as unknown as Record<string, unknown>;
    expect(t.zenkaiDokusyaBusu).toBe(6);
    expect(t.zenkaiHanbaitenId).toBeNull();
  });

  it('haitatsu_same_flg=TRUE → address zenkai_* uses before の購読者住所 (KODOKU)', () => {
    // 顧客要件 2026-07: 住所 zenkai は「実効配達先住所」。同一フラグ=true は購読者住所。
    const before = row({
      haitatsuSameFlg: true,
      yubinNo: '1000001',
      shikuchoson: 'Chiyoda-ku',
      haitatsuYubinNo: '9999999', // 別配達先は入っていても無視される
      haitatsuShikuchoson: '無視される区',
    });
    const target = {} as unknown as DokusyaRireki;
    fillZenkai(target, before);
    const t = target as unknown as Record<string, unknown>;
    expect(t.zenkaiYubinNo).toBe('1000001');
    expect(t.zenkaiShikuchoson).toBe('Chiyoda-ku');
  });

  it('haitatsu_same_flg=FALSE → address zenkai_* uses before の配達先住所 (HAITATSU)', () => {
    // 同一フラグ=false は別配達先住所を実効配達先住所として zenkai に入れる。
    const before = row({
      haitatsuSameFlg: false,
      yubinNo: '1000001', // 購読者住所は無視される
      shikuchoson: 'Chiyoda-ku',
      haitatsuYubinNo: '5300001',
      haitatsuShikuchoson: 'Kita-ku',
      haitatsuChomeBanchi: '配達先1-2-3',
    });
    const target = {} as unknown as DokusyaRireki;
    fillZenkai(target, before);
    const t = target as unknown as Record<string, unknown>;
    expect(t.zenkaiYubinNo).toBe('5300001'); // 配達先の郵便番号
    expect(t.zenkaiShikuchoson).toBe('Kita-ku'); // 配達先の市区町村
    expect(t.zenkaiChomeBanchi).toBe('配達先1-2-3');
    // 非住所 zenkai は従来どおり直接コピー。
    expect(t.zenkaiDokusyaBusu).toBe(before.dokusyaBusu ?? null);
  });
});

describe('computeZougen', () => {
  it('CREATE (before null) → true', () => {
    expect(computeZougen(row({ dokusyaBusu: 4 }), null)).toBe(true);
  });

  it('dokusya_busu change → true', () => {
    expect(computeZougen(row({ dokusyaBusu: 8 }), row({ dokusyaBusu: 6 }))).toBe(
      true,
    );
  });

  it('hanbaiten_id change → true', () => {
    expect(
      computeZougen(row({ hanbaitenId: 460 }), row({ hanbaitenId: 459 })),
    ).toBe(true);
  });

  it('購読者住所 change with haitatsu_same_flg=true → true (実効配達先=購読者住所)', () => {
    expect(
      computeZougen(
        row({ haitatsuSameFlg: true, shikuchoson: 'Minato-ku' }),
        row({ haitatsuSameFlg: true, shikuchoson: 'Chiyoda-ku' }),
      ),
    ).toBe(true);
  });

  it('配達先住所 change with haitatsu_same_flg=false → true (顧客要件: 別住所の配達先変更も増減報告対象)', () => {
    expect(
      computeZougen(
        row({ haitatsuSameFlg: false, haitatsuChomeBanchi: '新配達先1-2-3' }),
        row({ haitatsuSameFlg: false, haitatsuChomeBanchi: '旧配達先4-5-6' }),
      ),
    ).toBe(true);
  });

  it('haitatsu_same_flg change (配達先同一→別住所) → true', () => {
    // haitatsu_same_flg=true→false（別住所を入力）で配達先が切り替わる＝配達変更。
    expect(
      computeZougen(
        row({ haitatsuSameFlg: false, haitatsuChomeBanchi: '別1-1' }),
        row({ haitatsuSameFlg: true }),
      ),
    ).toBe(true);
  });

  it('購読者住所 change with haitatsu_same_flg=false → false (実効配達先=配達先住所は不変なので増減なし)', () => {
    // 別住所(false)のとき購読者住所を変えても配達先(haitatsu_*)は変わらない＝増減なし。
    expect(
      computeZougen(
        row({ haitatsuSameFlg: false, shikuchoson: 'Minato-ku', haitatsuChomeBanchi: '配達先1-1' }),
        row({ haitatsuSameFlg: false, shikuchoson: 'Chiyoda-ku', haitatsuChomeBanchi: '配達先1-1' }),
      ),
    ).toBe(false);
  });

  it('account-only change (not a trigger field) → false', () => {
    expect(
      computeZougen(
        row({ hikiotoshiKozaNo: '7654321', dokusyaBusu: 6 }),
        row({ hikiotoshiKozaNo: '1234567', dokusyaBusu: 6 }),
      ),
    ).toBe(false);
  });

  it('no trigger field changed → false', () => {
    expect(
      computeZougen(
        row({ dokusyaBusu: 6, hanbaitenId: 459 }),
        row({ dokusyaBusu: 6, hanbaitenId: 459 }),
      ),
    ).toBe(false);
  });
});

describe('buildRirekiRow', () => {
  const ctx = { dokusyaId: 1001, rirekiNo: 3, actor: 'u1' };

  it('CREATE → shinki/zougen true, zenkai null, hanbaiten_tekiyo null, saishin false', () => {
    const event: ChangeEvent = {
      joho: '2026-07-01',
      values: { dokusyaBusu: 4, hanbaitenId: 459 },
    };
    const r = buildRirekiRow(null, event, {
      dokusyaId: 1001,
      rirekiNo: 1,
      actor: 'admin',
    });
    expect(r.shinkiFlg).toBe(true);
    expect(r.zougenHokokuFlg).toBe(true);
    expect(r.kaiyakuFlg).toBe(false);
    expect(r.torikeshiFlg).toBe(false);
    expect(r.saishinDataFlg).toBe(false);
    expect(r.johoHenkoTekiyoDate).toBe('2026-07-01');
    expect(r.rirekiNo).toBe(1);
    expect(r.dokusyaId).toBe(1001);
    expect(r.dokusyaBusu).toBe(4);
    expect(r.hanbaitenId).toBe(459);
    expect(r.zenkaiDokusyaBusu).toBeNull();
  });

  it('UPDATE info → carries forward, applies change, fills zenkai, drops PK/saishin', () => {
    const before = row({
      dokusyaRirekiId: 2,
      dokusyaId: 1001,
      dokusyaBusu: 6,
      hanbaitenId: 459,
      shikuchoson: 'Chiyoda-ku',
      saishinDataFlg: true,
      shinkiFlg: true,
    });
    const event: ChangeEvent = {
      joho: '2026-07-05',
      values: { dokusyaBusu: 8 },
    };
    const r = buildRirekiRow(before, event, ctx);
    expect(r.dokusyaBusu).toBe(8); // applied
    expect(r.hanbaitenId).toBe(459); // carried
    expect(r.shikuchoson).toBe('Chiyoda-ku'); // carried
    expect(r.shinkiFlg).toBe(false);
    expect(r.zougenHokokuFlg).toBe(true); // busu 6→8
    expect(r.zenkaiDokusyaBusu).toBe(6);
    expect(r.zenkaiHanbaitenId).toBe(459);
    expect(r.dokusyaRirekiId).toBeUndefined(); // PK cleared → INSERTs
    expect(r.saishinDataFlg).toBe(false); // reset, not carried
    expect(r.rirekiNo).toBe(3);
  });

  it('UPDATE hanbaiten event → joho 適用日, zougen true', () => {
    const before = row({ dokusyaBusu: 6, hanbaitenId: 459 });
    const event: ChangeEvent = {
      joho: '2026-08-01',
      values: { hanbaitenId: 460 },
    };
    const r = buildRirekiRow(before, event, ctx);
    expect(r.hanbaitenId).toBe(460);
    expect(r.zougenHokokuFlg).toBe(true);
    expect(r.zenkaiHanbaitenId).toBe(459);
    expect(r.dokusyaBusu).toBe(6); // carried
  });

  it('UPDATE account-only → zougen false', () => {
    const before = row({ dokusyaBusu: 6, hikiotoshiKozaNo: '111' });
    const event: ChangeEvent = {
      joho: '2026-07-05',
      values: { hikiotoshiKozaNo: '222' },
    };
    const r = buildRirekiRow(before, event, ctx);
    expect(r.hikiotoshiKozaNo).toBe('222');
    expect(r.zougenHokokuFlg).toBe(false);
  });
});

describe('mapRirekiToMaster', () => {
  const rireki = row({
    dokusyaRirekiId: 5,
    dokusyaId: 1001,
    rirekiNo: 3,
    dokusyaBusu: 8,
    hanbaitenId: 460,
    shikuchoson: 'Minato-ku',
    tetsuzukiShurui: 1,
    saishinDataFlg: true,
    zougenHokokuFlg: true,
    shinkiFlg: false,
    kaiyakuFlg: false,
    torikeshiFlg: false,
    zenkaiDokusyaBusu: 6,
    zenkaiHanbaitenId: 459,
    createdBy: 'batch',
  });

  it('copies business columns and the rireki_no pointer', () => {
    const m = mapRirekiToMaster(rireki);
    expect(m.dokusyaBusu).toBe(8);
    expect(m.hanbaitenId).toBe(460);
    expect(m.shikuchoson).toBe('Minato-ku');
    expect(m.tetsuzukiShurui).toBe(1);
    expect(m.rirekiNo).toBe(3);
  });

  it('excludes rireki-only columns (PK, zenkai_*, history flags, hanbaiten_tekiyo)', () => {
    const m = mapRirekiToMaster(rireki);
    for (const k of [
      'dokusyaRirekiId',
      'zenkaiDokusyaBusu',
      'zenkaiHanbaitenId',
      'saishinDataFlg',
      'zougenHokokuFlg',
      'shinkiFlg',
      'kaiyakuFlg',
      'torikeshiFlg',
    ]) {
      expect(m).not.toHaveProperty(k);
    }
  });

  // [cloud-owned-column] denshi_kaiin_id は電子版同期バッチが master へ直接書く列で、
  // 履歴側は常に NULL。ここに漏れると毎晩 NULL で上書きされ、電子版の会員紐付けが
  // 消える（UI からは復旧できない）。
  //
  // 今これを防いでいるのは MASTER_EXCLUDE_FIELDS ではなく「DokusyaRireki エンティティが
  // この列を宣言していない」という事実だけ — DB の t_dokusya_rireki には列が存在する。
  // MASTER_EXCLUDE_FIELDS の型は `keyof DokusyaRireki` なので、エンティティに無い列は
  // そもそも追加できない。つまり将来 rireki エンティティに denshi_kaiin_id を足した
  // 瞬間、無言で上書きが始まる。このテストがその時に赤くなる番人。
  it('never emits denshi_kaiin_id (cloud-owned column — see comment)', () => {
    const withCloudColumn = row({
      dokusyaBusu: 8,
      ...({ denshiKaiinId: null } as Record<string, unknown>),
    });
    expect(mapRirekiToMaster(withCloudColumn)).not.toHaveProperty(
      'denshiKaiinId',
    );
  });

  it('does not overwrite master creation metadata or the update key', () => {
    const m = mapRirekiToMaster(rireki);
    expect(m).not.toHaveProperty('createdBy');
    expect(m).not.toHaveProperty('dokusyaId');
  });

  it('kaiyaku: propagates tetsuzuki_shurui=0 while kaiyaku_flg itself is excluded', () => {
    const cancelled = row({
      tetsuzukiShurui: 0,
      kaiyakuFlg: true,
      dokusyaBusu: 6,
    });
    const m = mapRirekiToMaster(cancelled);
    expect(m.tetsuzukiShurui).toBe(0);
    expect(m).not.toHaveProperty('kaiyakuFlg');
  });
});

describe('buildKaiyakuRow', () => {
  it('forces cancel shape: tetsuzuki=0, kaiyaku_flg, busu=0, zougen=true, created_by=actor, drops PK', () => {
    const before = row({
      dokusyaRirekiId: 4,
      dokusyaId: 1001,
      dokusyaBusu: 6,
      hanbaitenId: 459,
      dokusyaChushiDate: null,
      tetsuzukiShurui: 1,
    });
    const r = buildKaiyakuRow(before, {
      dokusyaId: 1001,
      rirekiNo: 5,
      kaiyakuJoho: '2026-07-15',
      chushiDate: '2026-07-15',
      createdBy: '42',
    });
    expect(r.tetsuzukiShurui).toBe(0);
    expect(r.kaiyakuFlg).toBe(true);
    expect(r.johoHenkoTekiyoDate).toBe('2026-07-15');
    expect(r.createdBy).toBe('42'); // actor override (UI 解約予約)
    expect(r.dokusyaChushiDate).toBe('2026-07-15'); // from ctx.chushiDate
    expect(r.dokusyaBusu).toBe(0); // 解約 = 部数なし (forced)
    expect(r.zougenHokokuFlg).toBe(true); // 解約は常に増減報告対象 (forced)
    expect(r.zenkaiDokusyaBusu).toBe(6); // zenkai from before
    expect(r.shinkiFlg).toBe(false);
    expect(r.saishinDataFlg).toBe(false);
    expect(r.torikeshiFlg).toBe(false);
    expect(r.dokusyaRirekiId).toBeUndefined(); // PK dropped → INSERTs
  });

  /**
   * 以前は createdBy 省略時に 'batch' へ落としていたが、created_by は
   * 電子版同期由来の読者を判別するキーになったので（顧客要件 2026-08）、
   * 呼出し元に必ず渡させる。既定値に落ちると誰が作った行か分からなくなる。
   */
  it('carries the caller の actor into created_by (到来日バッチ)', () => {
    const before = row({ dokusyaBusu: 6, dokusyaChushiDate: '2026-07-15' });
    const r = buildKaiyakuRow(before, {
      dokusyaId: 1001,
      rirekiNo: 5,
      kaiyakuJoho: '2026-07-15',
      chushiDate: '2026-07-15',
      createdBy: 'SYSTEM_BATCH_NIGHTLY',
    });
    expect(r.createdBy).toBe('SYSTEM_BATCH_NIGHTLY');
  });

  it('case D: inherits the new hanbaiten from the (future-activated) before row', () => {
    const before = row({
      hanbaitenId: 460,
      dokusyaBusu: 8,
      dokusyaChushiDate: '2026-07-15',
    });
    const r = buildKaiyakuRow(before, {
      dokusyaId: 1001,
      rirekiNo: 3,
      kaiyakuJoho: '2026-07-15',
      chushiDate: '2026-07-15',
      createdBy: 'batch-test',
    });
    expect(r.hanbaitenId).toBe(460);
    expect(r.zenkaiHanbaitenId).toBe(460);
  });
});

describe('buildKaiyakuReservationRow (Phase 1 予約行)', () => {
  it('紙版(joho=chushi): overrides 部数0・zougen=true・中止日・適用日・kaiyaku_flg=false・saishin=false; inherits tetsuzuki; zenkai from before', () => {
    const before = row({
      dokusyaRirekiId: 4,
      dokusyaId: 1001,
      dokusyaBusu: 6,
      hanbaitenId: 459,
      dokusyaChushiDate: null,
      tetsuzukiShurui: 1, // 継続（購読中）
      shinkiFlg: true, // before が新規でも予約は非新規
    });
    const r = buildKaiyakuReservationRow(before, {
      dokusyaId: 1001,
      rirekiNo: 5,
      chushiDate: '2027-12-01',
      joho: '2027-12-01', // 紙版: caller が joho=chushiDate を計算して渡す
      createdBy: '42',
    });

    // Phase 1 で override する項目
    expect(r.dokusyaBusu).toBe(0); // 予約=部数0
    expect(r.zougenHokokuFlg).toBe(true); // 減の増減報告対象
    expect(r.dokusyaChushiDate).toBe('2027-12-01'); // 中止日
    expect(r.johoHenkoTekiyoDate).toBe('2027-12-01'); // 適用日=中止日（紙版）
    expect(r.kaiyakuFlg).toBe(false); // 解約確定はバッチ（Phase 2）
    expect(r.saishinDataFlg).toBe(false); // 未来予約 → 未反映
    expect(r.shinkiFlg).toBe(false); // 予約は非新規（before が新規でも）
    expect(r.torikeshiFlg).toBe(false);
    expect(r.createdBy).toBe('42');
    expect(r.dokusyaRirekiId).toBeUndefined(); // PK dropped → INSERTs

    // 継承する項目（override しない）
    expect(r.tetsuzukiShurui).toBe(1); // 継承（解約確定はバッチ）
    expect(r.hanbaitenId).toBe(459); // 継承

    // zenkai_* は before 由来（増減報告用: 6 → 0）
    expect(r.zenkaiDokusyaBusu).toBe(6);
    expect(r.zenkaiHanbaitenId).toBe(459);
  });

  // 顧客要件 2026-08 改訂: 電子版の解約予定日は「電子版が読める有効な最終日」であり、
  // 当日はまだ有効な読者として扱う必要があるため、適用日は中止日+1（caller が計算し
  // joho として渡す）。dokusya_chushi_date には中止日そのものが残る点は紙版と同じ。
  it('電子版(joho=chushi+1): 中止日と適用日が別値として保持される', () => {
    const before = row({
      dokusyaRirekiId: 8,
      dokusyaId: 2002,
      dokusyaBusu: 1,
      dokusyaShubetsu: 2,
      tetsuzukiShurui: 1,
    });
    const r = buildKaiyakuReservationRow(before, {
      dokusyaId: 2002,
      rirekiNo: 3,
      chushiDate: '2026-08-31',
      joho: '2026-09-01', // caller が中止日+1 を計算して渡す
      createdBy: '11',
    });

    expect(r.dokusyaChushiDate).toBe('2026-08-31'); // 中止日はそのまま
    expect(r.johoHenkoTekiyoDate).toBe('2026-09-01'); // 適用日=中止日の翌日
    expect(r.dokusyaBusu).toBe(0);
    expect(r.tetsuzukiShurui).toBe(1); // まだ新規（解約確定はバッチ）
  });
});

describe('buildResubscribeRow', () => {
  it('mirrors a first 新規作成 row: shinki, tetsuzuki=1, chushi/zenkai/hanbaiten適用日 all null (顧客要件 2026-07)', () => {
    const before = row({
      dokusyaRirekiId: 7,
      dokusyaId: 1001,
      tetsuzukiShurui: 0, // 解約行
      kaiyakuFlg: true,
      dokusyaBusu: 0,
      hanbaitenId: 459,
      zenkaiHanbaitenId: 458,
      zenkaiDokusyaBusu: 6,
      shokiDokusyaKaishiDate: '2025-01-01',
      dokusyaChushiDate: '2026-06-01',
    });
    const values: DokusyaFields = {
      dokusyaKaishiDate: '2027-12-01',
      dokusyaBusu: 2,
      hanbaitenId: 460,
    };
    const r = buildResubscribeRow(
      before,
      values,
      { dokusyaId: 1001, rirekiNo: 8, actor: '42' },
      '2026-07-09', // joho=当日（即時反映）
    );
    // 新規(再購読)の形。
    expect(r.shinkiFlg).toBe(true);
    expect(r.kaiyakuFlg).toBe(false);
    expect(Number(r.tetsuzukiShurui)).toBe(1);
    expect(r.zougenHokokuFlg).toBe(true);
    expect(r.dokusyaChushiDate).toBeNull();
    // 業務新値は values 由来。
    expect(r.hanbaitenId).toBe(460);
    expect(Number(r.dokusyaBusu)).toBe(2);
    expect(String(r.dokusyaKaishiDate).slice(0, 10)).toBe('2027-12-01');
    // 初回購読開始日は不変。
    expect(String(r.shokiDokusyaKaishiDate).slice(0, 10)).toBe('2025-01-01');
    // zenkai_* は初回新規作成同様に全て null（前回値を継承しない）。
    expect(r.zenkaiHanbaitenId).toBeNull();
    expect(r.zenkaiDokusyaBusu).toBeNull();
    // 識別列はクリア（INSERT 用）。
    expect(r.dokusyaRirekiId).toBeUndefined();
  });
});

describe('buildCounterRow', () => {
  it('reverses a hanbaiten change: swaps current ↔ zenkai, flags torikeshi', () => {
    // target: 459 → 460 (zenkai=459, current=460)
    const target = row({
      dokusyaRirekiId: 2,
      dokusyaId: 1001,
      hanbaitenId: 460,
      zenkaiHanbaitenId: 459,
      johoHenkoTekiyoDate: '2026-07-01',
      dokusyaBusu: 6,
      zenkaiDokusyaBusu: 6,
    });
    const r = buildCounterRow(target, { rirekiNo: 3, actor: 'u1', reason: '取消' });
    expect(r.hanbaitenId).toBe(459); // reversed to previous
    expect(r.zenkaiHanbaitenId).toBe(460); // previous = target's current
    expect(r.dokusyaBusu).toBe(6); // unchanged pair stays
    expect(r.torikeshiFlg).toBe(true);
    expect(r.saishinDataFlg).toBe(false);
    expect(r.johoHenkoTekiyoDate).toBe('2026-07-01'); // same applied date
    expect(r.rirekiNo).toBe(3);
    expect(r.createdBy).toBe('u1');
    expect(r.dokusyaRirekiId).toBeUndefined(); // PK dropped
  });

  it('G5: reversing a 解約 restores 購読中 (tetsuzuki=1, kaiyaku_flg=false)', () => {
    const target = row({
      dokusyaRirekiId: 4,
      tetsuzukiShurui: 0,
      kaiyakuFlg: true,
      shokiDokusyaKaishiDate: '2026-01-10',
      johoHenkoTekiyoDate: '2026-07-15',
    });
    const r = buildCounterRow(target, { rirekiNo: 5, actor: 'u', reason: '取消' });
    expect(r.tetsuzukiShurui).toBe(1);
    expect(r.kaiyakuFlg).toBe(false);
    expect(r.torikeshiFlg).toBe(true);
    expect(r.shokiDokusyaKaishiDate).toBe('2026-01-10'); // NOT changed
  });
});
