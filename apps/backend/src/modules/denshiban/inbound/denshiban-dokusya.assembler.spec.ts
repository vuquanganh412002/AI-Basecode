import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';

import { DenshibanMappingError } from '../mapper/denshiban-payload.builder';

import {
  DenshibanDokusyaAssembler,
  resolveShiharaiHoho,
  type DenshibanInboundRow,
} from './denshiban-dokusya.assembler';

// ── Mocks ─────────────────────────────────────────────────────────────────────

/** A KanriShiten query-builder mock resolving to `row` (null = not found). */
function kanriRepoResolving(row: unknown) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(row),
  };
  return {
    repo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
    qb,
  };
}

/** A Hanbaiten repo mock resolving `findOne` to `row`. */
function hanbaitenRepoResolving(row: unknown) {
  return { findOne: jest.fn().mockResolvedValue(row) };
}

function buildAssembler(kanriRepo: unknown, hanbaitenRepo: unknown) {
  return new DenshibanDokusyaAssembler(
    kanriRepo as never,
    hanbaitenRepo as never,
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** A 電子版単独(2) inbound row; override for 併読 / bad codes. */
function inboundRow(overrides: Partial<DenshibanInboundRow> = {}): DenshibanInboundRow {
  return {
    // assembler-only raw codes
    JACd: '1135001999',
    ShopCd: '',
    payment_id: '1',
    // pure-builder subset
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

// ── JACd → kanri_shiten + ja ──────────────────────────────────────────────────

describe('DenshibanDokusyaAssembler.resolveCtx — JACd', () => {
  it('JACd(10桁) → kanri_shiten_id と ja_id を1回の照会で解決', async () => {
    const { repo, qb } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });
    const ctx = await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow({ JACd: '1135001999' }),
    );

    expect(ctx.kanriShitenId).toBe(10);
    expect(ctx.jaId).toBe(1);
    // ハイフン除去して 10 桁で突合していること。
    expect(qb.where).toHaveBeenCalledWith(expect.any(String), { jacd: '1135001999' });
  });

  it('ハイフン付き JACd もハイフン除去して10桁なら解決', async () => {
    const { repo, qb } = kanriRepoResolving({ kanriShitenId: 7, jaId: 3 });
    await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow({ JACd: '113-5001-999' }),
    );

    expect(qb.where).toHaveBeenCalledWith(expect.any(String), { jacd: '1135001999' });
  });

  it('JACd が10桁でない → DenshibanMappingError', async () => {
    const { repo } = kanriRepoResolving(null);

    await expect(
      buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
        inboundRow({ JACd: '123' }),
      ),
    ).rejects.toBeInstanceOf(DenshibanMappingError);
  });

  it('JACd 空 → DenshibanMappingError', async () => {
    const { repo } = kanriRepoResolving(null);

    await expect(
      buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
        inboundRow({ JACd: '' }),
      ),
    ).rejects.toBeInstanceOf(DenshibanMappingError);
  });

  it('該当 kanri_shiten が無い → DenshibanMappingError', async () => {
    const { repo } = kanriRepoResolving(null);

    await expect(
      buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(inboundRow()),
    ).rejects.toBeInstanceOf(DenshibanMappingError);
  });
});

// ── ShopCd → hanbaiten ─────────────────────────────────────────────────────────

describe('DenshibanDokusyaAssembler.resolveCtx — hanbaiten', () => {
  it('電子版単独(paper_permission_dt なし) → hanbaiten_id は null、hanbaiten は照会しない', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });
    const hanbaitenRepo = hanbaitenRepoResolving({ hanbaitenId: 100 });

    const ctx = await buildAssembler(repo, hanbaitenRepo).resolveCtx(
      inboundRow({ paper_permission_dt: null }),
    );

    expect(ctx.hanbaitenId).toBeNull();
    expect(hanbaitenRepo.findOne).not.toHaveBeenCalled();
  });

  it('併読(paper_permission_dt あり) → ShopCd を JA 内で照会し hanbaiten_id を解決', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });
    const hanbaitenRepo = hanbaitenRepoResolving({ hanbaitenId: 100 });

    const ctx = await buildAssembler(repo, hanbaitenRepo).resolveCtx(
      inboundRow({ paper_permission_dt: '2026-07-01', ShopCd: 'H001' }),
    );

    expect(ctx.hanbaitenId).toBe(100);
    expect(hanbaitenRepo.findOne).toHaveBeenCalledWith({
      where: { jaId: 1, hanbaitenCode: 'H001' },
    });
  });

  it('併読だが ShopCd 空 → DenshibanMappingError', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    await expect(
      buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
        inboundRow({ paper_permission_dt: '2026-07-01', ShopCd: '' }),
      ),
    ).rejects.toBeInstanceOf(DenshibanMappingError);
  });

  it('併読で ShopCd が見つからない → DenshibanMappingError', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    await expect(
      buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
        inboundRow({ paper_permission_dt: '2026-07-01', ShopCd: 'NOPE' }),
      ),
    ).rejects.toBeInstanceOf(DenshibanMappingError);
  });
});

// ── payment_id / options ───────────────────────────────────────────────────────

describe('DenshibanDokusyaAssembler.resolveCtx — payment / options', () => {
  it('payment_id は shiharai_hoho と同値でそのまま反映', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const ctx = await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow({ payment_id: '6' }),
    );

    expect(ctx.shiharaiHoho).toBe(6);
  });

  it('payment_id 空 → shiharai_hoho は null（未設定・CREATE 側で判断）', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const ctx = await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow({ payment_id: '' }),
    );

    expect(ctx.shiharaiHoho).toBeNull();
  });

  it('rireki_no / syncDate は既定（1 / null）', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const ctx = await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow(),
    );

    expect(ctx.rirekiNo).toBe(1);
    expect(ctx.syncDate).toBeNull();
  });

  it('rireki_no / syncDate を渡すとそのまま反映', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const ctx = await buildAssembler(repo, hanbaitenRepoResolving(null)).resolveCtx(
      inboundRow(),
      { rirekiNo: 5, syncDate: '2026-07-19' },
    );

    expect(ctx.rirekiNo).toBe(5);
    expect(ctx.syncDate).toBe('2026-07-19');
  });
});

// ── assemble() end-to-end (ctx + pure builder) ─────────────────────────────────

describe('DenshibanDokusyaAssembler.assemble', () => {
  it('解決した ctx で draft を組み立てる（電子版単独）', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const draft = await buildAssembler(repo, hanbaitenRepoResolving(null)).assemble(
      inboundRow(),
      { syncDate: '2026-07-19' },
    );

    expect(draft.jaId).toBe(1);
    expect(draft.kanriShitenId).toBe(10);
    expect(draft.hanbaitenId).toBeNull();
    expect(draft.shiharaiHoho).toBe(1); // inboundRow default payment_id='1'
    expect(draft.denshiKaiinId).toBe(5001);
    expect(draft.dokusyaShubetsu).toBe(2); // 電子版
    expect(draft.johoHenkoTekiyoDate).toBe('2026-07-19');
    expect(draft.tankaId).toBeNull();
  });

  it('併読は hanbaiten を解決して draft に載せる', async () => {
    const { repo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });

    const draft = await buildAssembler(
      repo,
      hanbaitenRepoResolving({ hanbaitenId: 100 }),
    ).assemble(inboundRow({ paper_permission_dt: '2026-07-01', ShopCd: 'H001' }));

    expect(draft.dokusyaShubetsu).toBe(3); // 併読
    expect(draft.hanbaitenId).toBe(100);
    expect(draft.haitatsuSameFlg).toBe(false);
  });

  it('manager を渡すと FK 照会はその接続で行う（同一トランザクション）', async () => {
    const { repo: kanriRepo } = kanriRepoResolving({ kanriShitenId: 10, jaId: 1 });
    const hanbaitenRepo = hanbaitenRepoResolving({ hanbaitenId: 100 });
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === KanriShiten ? kanriRepo : hanbaitenRepo,
      ),
    };

    await buildAssembler(
      { createQueryBuilder: jest.fn() }, // default repos must NOT be used
      { findOne: jest.fn() },
    ).assemble(
      inboundRow({ paper_permission_dt: '2026-07-01', ShopCd: 'H001' }),
      {},
      manager as never,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(KanriShiten);
    expect(manager.getRepository).toHaveBeenCalledWith(Hanbaiten);
  });
});

describe('resolveShiharaiHoho', () => {
  it.each([
    ['1', 1],
    ['6', 6],
    ['9', 9],
  ])('payment_id=%p → shiharai_hoho %p（同値マップ）', (input, expected) => {
    expect(resolveShiharaiHoho(input)).toBe(expected);
  });

  it.each(['', null, undefined])('payment_id=%p → null（未設定）', (v) => {
    expect(resolveShiharaiHoho(v)).toBeNull();
  });

  it('数値でない payment_id → DenshibanMappingError', () => {
    expect(() => resolveShiharaiHoho('abc')).toThrow(DenshibanMappingError);
  });
});
