import { EntityManager } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import * as query from './dokusya-history.query';
import {
  applyChange,
  applyTorikeshi,
  revokeScheduledKaiyaku,
  canTorikeshi,
  insertKaiyaku,
  recomputeAfterChain,
  recomputeMaster,
} from './dokusya-history.writer';
import { ApplyChangeInput } from './dokusya-history.types';

// query.ts is mocked; builder.ts (mapRirekiToMaster) runs for real.
jest.mock('./dokusya-history.query');
const q = jest.mocked(query);

function rireki(fields: Record<string, unknown>): DokusyaRireki {
  return fields as unknown as DokusyaRireki;
}

/**
 * `loadCurrentLifecycleEffectiveRow` は有効行と一緒に現LC起点(startRirekiNo)も返す。
 * 起点は直後の `loadScheduledChushiDate` へ渡され、向こうが同じ探索をやり直さずに済む。
 * テストの関心は有効行だけなので、起点は行から機械的に導く薄いラッパを使う。
 */
function mockLcEffective(r: DokusyaRireki | null) {
  return q.loadCurrentLifecycleEffectiveRow.mockResolvedValue({
    row: r,
    startRirekiNo: r ? (r.rirekiNo ?? 1) : null,
  });
}

describe('recomputeMaster', () => {
  let update: jest.Mock;
  let m: EntityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    update = jest.fn().mockResolvedValue(undefined);
    // findOne は writeMaster の差分判定用。既定 null = 「master 未取得」枝 →
    // 従来どおり全列 UPDATE。各テストで上書きして差分あり/なしを作り分ける。
    m = {
      update,
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    q.setSaishinFlags.mockResolvedValue(undefined);
  });

  it('effective row exists → saishin points to it and t_dokusya is overwritten', async () => {
    const eff = rireki({
      dokusyaRirekiId: 3,
      dokusyaId: 1001,
      rirekiNo: 3,
      dokusyaBusu: 8,
      hanbaitenId: 460,
    });
    mockLcEffective(eff);

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(q.loadCurrentLifecycleEffectiveRow).toHaveBeenCalledWith(
      m,
      1001,
      '2026-07-01',
    );
    // invariant: saishin flag targets the effective row's rireki id
    expect(q.setSaishinFlags).toHaveBeenCalledWith(m, 1001, 3);
    expect(update).toHaveBeenCalledTimes(1);
    const [entity, where, partial] = update.mock.calls[0];
    expect(entity).toBe(Dokusya);
    expect(where).toEqual({ dokusyaId: 1001 });
    expect(partial).toMatchObject({ dokusyaBusu: 8, hanbaitenId: 460, rirekiNo: 3 });
    expect(partial).not.toHaveProperty('dokusyaRirekiId'); // rireki-only, excluded
  });

  it('no row at all → all saishin false, t_dokusya untouched', async () => {
    mockLcEffective(null);

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(q.setSaishinFlags).toHaveBeenCalledWith(m, 1001, null);
    expect(update).not.toHaveBeenCalled();
  });

  it('current-lifecycle effective row absent → loadCurrentLifecycleEffectiveRow returns the latest 新規行 (fallback): saishin on it + t_dokusya overwritten (顧客要件 2026-07)', async () => {
    // 未来 購読開始日 の新規/再購読。asOf 時点で現ライフサイクルの有効行は無いが、
    // loadCurrentLifecycleEffectiveRow が最新の新規行を返す → 即 saishin=true。
    mockLcEffective(
      rireki({ dokusyaRirekiId: 7, dokusyaId: 1001, dokusyaBusu: 2 }),
    );

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(q.setSaishinFlags).toHaveBeenCalledWith(m, 1001, 7);
    expect(update).toHaveBeenCalledTimes(1);
  });

  // ── [touch-only-changed] writeMaster の 3 分岐 ──────────────────────────
  // 無条件 UPDATE だと業務値が変わらない夜も updated_at が動き、購読者一覧の
  // 既定ソート `updated_at DESC` が壊れる（誰も触っていない購読者が先頭に来る）。

  it('業務値に差分あり → 全列 UPDATE（updated_at も更新される）', async () => {
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 3,
        rirekiNo: 2,
        johoHenkoTekiyoDate: '2026-05-01',
        dokusyaBusu: 8, // master は 1 → 業務変更
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 1,
      johoHenkoTekiyoDate: '2026-04-01',
      dokusyaBusu: 1,
    });

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(update).toHaveBeenCalledTimes(1);
    expect(m.query).not.toHaveBeenCalled();
  });

  it('業務値は同一・ポインタだけ前進 → 2列だけ生SQL更新（updated_at は据え置き）', async () => {
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 3,
        rirekiNo: 2,
        johoHenkoTekiyoDate: '2026-05-01',
        dokusyaBusu: 1, // master と同値
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 1,
      johoHenkoTekiyoDate: '2026-04-01',
      dokusyaBusu: 1,
    });

    await recomputeMaster(m, 1001, '2026-07-01');

    // m.update だと TypeORM が updated_at = CURRENT_TIMESTAMP を自動付与するため使わない
    expect(update).not.toHaveBeenCalled();
    const [sql, params] = (m.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('joho_henko_tekiyo_date');
    expect(sql).toContain('rireki_no');
    expect(sql).not.toContain('updated_at');
    expect(params).toEqual(['2026-05-01', 2, 1001]);
  });

  it('完全に同一 → 一切書き込まない', async () => {
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 3,
        rirekiNo: 2,
        johoHenkoTekiyoDate: '2026-05-01',
        dokusyaBusu: 1,
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 2,
      johoHenkoTekiyoDate: '2026-05-01',
      dokusyaBusu: 1,
    });

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(update).not.toHaveBeenCalled();
    expect(m.query).not.toHaveBeenCalled();
  });

  // [single-roundtrip] 現LC起点は loadCurrentLifecycleEffectiveRow が確定させた値を
  // そのまま loadScheduledChushiDate へ渡す。渡さないと向こうが副問い合わせで同じ
  // 探索をやり直し、同一 tx 内で全く同一の結果を2度引くことになる
  // （部分インデックス ix_t_dokusya_rireki_shinki への seek 1回ぶんの無駄）。
  it('現LC起点を loadScheduledChushiDate へ引き渡す（同一探索の二度引きを避ける）', async () => {
    mockLcEffective(rireki({ dokusyaRirekiId: 9, rirekiNo: 5 }));

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(q.loadScheduledChushiDate).toHaveBeenCalledWith(m, 1001, 5);
  });

  it('履歴なし（起点 null）なら loadScheduledChushiDate も呼ばない', async () => {
    mockLcEffective(null);

    await recomputeMaster(m, 1001, '2026-07-01');

    expect(q.loadScheduledChushiDate).not.toHaveBeenCalled();
  });

  it('ポインタは業務値でなくても必ず同期する（recompute バッチの抽出基準そのもの）', async () => {
    // ここを書かないと master の (joho, rireki_no) が古いままになり、
    // 同じ購読者が毎晩 R0 に再抽出され続ける（無限ループ）。
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 9,
        rirekiNo: 5,
        johoHenkoTekiyoDate: '2026-06-01',
        dokusyaBusu: 3,
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 4,
      johoHenkoTekiyoDate: '2026-06-01', // 同日・rireki_no だけ違う
      dokusyaBusu: 3,
    });

    await recomputeMaster(m, 1001, '2026-07-01');

    expect((m.query as jest.Mock).mock.calls[0][1]).toEqual([
      '2026-06-01',
      5,
      1001,
    ]);
  });
});

describe('recomputeAfterChain', () => {
  let save: jest.Mock;
  let m: EntityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    save = jest.fn().mockResolvedValue(undefined);
    m = { save } as unknown as EntityManager;
  });

  it('successor that changed the field itself → relink zenkai + zougen, stop', async () => {
    const before = rireki({ dokusyaBusu: 6, hanbaitenId: 459 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-07-01',
      rirekiNo: 3,
      dokusyaBusu: 8,
      hanbaitenId: 459,
    });
    const after = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-09-01',
      rirekiNo: 2,
      dokusyaBusu: 10, // successor set busu itself → not carried
      hanbaitenId: 459,
    });
    q.findNext.mockResolvedValueOnce(after);

    await recomputeAfterChain(m, 1001, inserted, before, ['dokusyaBusu']);

    expect(q.findNext).toHaveBeenCalledTimes(1); // stopped (keep empty)
    expect(save).toHaveBeenCalledTimes(1);
    expect(after.dokusyaBusu).toBe(10); // its own value kept
    expect(after.zenkaiDokusyaBusu).toBe(8); // relinked to inserted (prev)
    expect(after.zougenHokokuFlg).toBe(true); // 10 vs prev 8 → changed
  });

  it('B-thuần: updates ONLY the immediate successor — NO cascade to rows after it', async () => {
    // 顧客要件 2026-07: 挿入行の直後行だけを更新し、後続行へは伝播しない。
    const before = rireki({ dokusyaBusu: 4 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-07-01',
      rirekiNo: 3,
      dokusyaBusu: 6,
    });
    const after1 = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-08-01',
      rirekiNo: 2,
      dokusyaBusu: 4,
    });
    const after2 = rireki({
      dokusyaRirekiId: 5,
      johoHenkoTekiyoDate: '2026-09-01',
      rirekiNo: 4,
      dokusyaBusu: 4,
    });
    q.findNext
      .mockResolvedValueOnce(after1)
      .mockResolvedValueOnce(after2)
      .mockResolvedValue(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['dokusyaBusu']);

    // 直後行(after1)のみ: findNext 1回・save 1回。
    expect(q.findNext).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    // after1: zenkai を挿入行へ relink するが current 値は据え置き。
    expect(after1.zenkaiDokusyaBusu).toBe(6); // prev = inserted
    expect(after1.dokusyaBusu).toBe(4); // current NOT cascaded (B-thuần)
    // after2 は一切触らない。
    expect(after2.dokusyaBusu).toBe(4);
    expect(after2.zenkaiDokusyaBusu).toBeUndefined();
  });

  it('B-thuần: keeps the successor\'s haitatsu_same_flg unchanged even when the inserted row changed it', async () => {
    // 顧客要件 2026-07: 直後行の haitatsu_same_flg は挿入行に追随して書き換えない。
    const before = rireki({ haitatsuSameFlg: true, dokusyaBusu: 4 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-07-01',
      rirekiNo: 3,
      haitatsuSameFlg: false, // 挿入行が別配達先へ切替
      dokusyaBusu: 4,
    });
    const after = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-08-01',
      rirekiNo: 2,
      haitatsuSameFlg: true, // 直後行は購読者住所と同一のまま
      dokusyaBusu: 4,
    });
    q.findNext.mockResolvedValueOnce(after).mockResolvedValue(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['haitatsuSameFlg']);

    expect(after.haitatsuSameFlg).toBe(true); // 据え置き（挿入行の false に追随しない）
  });

  it('CREATE (before null) → no successor work', async () => {
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-07-01',
      rirekiNo: 1,
      dokusyaBusu: 4,
    });
    await recomputeAfterChain(m, 1001, inserted, null, ['dokusyaBusu']);
    expect(q.findNext).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('applyChange', () => {
  let m: EntityManager;
  let idCounter: number;

  const master = (fields: Record<string, unknown>): Dokusya =>
    fields as unknown as Dokusya;

  beforeEach(() => {
    jest.clearAllMocks();
    idCounter = 10;
    m = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    q.insertRow.mockImplementation(
      async (_m, r) =>
        ({ ...(r as object), dokusyaRirekiId: idCounter++ }) as DokusyaRireki,
    );
    q.nextRirekiNo.mockResolvedValue(1);
    q.setSaishinFlags.mockResolvedValue(undefined);
    q.findNext.mockResolvedValue(null); // no successors in orchestration tests
    // recomputeMaster の有効行選択（現ライフサイクル）を既定でモック。
    mockLcEffective(
      rireki({ dokusyaRirekiId: 10, dokusyaShubetsu: 1 }),
    );
  });

  it('CREATE → ensureMaster, one rireki insert, master recomputed', async () => {
    q.ensureMaster.mockResolvedValue(1001);
    q.findBefore.mockResolvedValue(null);
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 1001, dokusyaShubetsu: 1 }),
    );

    const input: ApplyChangeInput = {
      mode: 'CREATE',
      values: { dokusyaBusu: 4, hanbaitenId: 459, dokusyaShubetsu: 1 },
      johoDate: '2026-07-01',
      source: 'UI',
      actor: 'admin',
    };
    const res = await applyChange(m, input);

    expect(q.ensureMaster).toHaveBeenCalledTimes(1);
    expect(q.insertRow).toHaveBeenCalledTimes(1); // CREATE = 1 event
    const inserted = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(inserted.shinkiFlg).toBe(true);
    // recomputeMaster ran
    expect(q.loadCurrentLifecycleEffectiveRow).toHaveBeenCalled();
    expect(q.setSaishinFlags).toHaveBeenCalled();
    expect(m.update).toHaveBeenCalled();
    // result
    expect(res.dokusyaId).toBe(1001);
    expect(res.before).toBeNull();
    expect(res.insertedRirekiIds).toEqual([10]);
    expect(res.denshiSync).toBe(false);
  });

  it('CREATE with a FUTURE joho → recomputeMaster reflects the latest 新規行 (saishin=true)', async () => {
    // 顧客要件 2026-07: 新規は未来日のみだが、作成時点の唯一のレコードは saishin=true。
    // applyChange は当日基準で recomputeMaster を呼ぶが、現ライフサイクルの有効行が
    // 無ければ loadCurrentLifecycleEffectiveRow が最新の新規行を返す → saishin=true。
    q.ensureMaster.mockResolvedValue(2002);
    q.findBefore.mockResolvedValue(null);
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 2002, dokusyaShubetsu: 1 }),
    );
    mockLcEffective(
      rireki({ dokusyaRirekiId: 10, dokusyaShubetsu: 1 }),
    );

    await applyChange(m, {
      mode: 'CREATE',
      values: { dokusyaBusu: 1, dokusyaShubetsu: 1 },
      johoDate: '2099-12-31', // 未来
      source: 'UI',
      actor: 'admin',
    });

    expect(q.setSaishinFlags).toHaveBeenCalledWith(m, 2002, 10);
  });

  it('UPDATE single info → one insert, before = master snapshot', async () => {
    q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 6, hanbaitenId: 459 }));
    q.loadMaster
      .mockResolvedValueOnce(
        master({ dokusyaId: 1001, dokusyaBusu: 6, dokusyaShubetsu: 1 }),
      )
      .mockResolvedValueOnce(
        master({ dokusyaId: 1001, dokusyaBusu: 8, dokusyaShubetsu: 1 }),
      );

    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 1001,
      values: { dokusyaBusu: 8 },
      johoDate: '2026-07-05',
      source: 'UI',
      actor: 'u',
    });

    expect(q.ensureMaster).not.toHaveBeenCalled();
    expect(q.insertRow).toHaveBeenCalledTimes(1);
    expect(res.before).toMatchObject({ dokusyaBusu: 6 });
    expect(res.after).toMatchObject({ dokusyaBusu: 8 });
    expect(res.insertedRirekiIds).toHaveLength(1);
  });

  it('UPDATE(UI) 情報+販売店 同時変更 → 1行のみ (1更新1レコード・顧客要件 2026-07)', async () => {
    // 画面編集(source=UI)は販売店適用日を廃止し joho に統一 → 情報+販売店を同時に
    // 変えても1件の履歴行にまとめる（適用日は joho のみ）。
    q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 6, hanbaitenId: 459 }));
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 1001, dokusyaShubetsu: 1 }),
    );

    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 1001,
      values: { dokusyaBusu: 8, hanbaitenId: 460 },
      johoDate: '2026-07-05',
      source: 'UI',
      actor: 'u',
    });

    expect(q.insertRow).toHaveBeenCalledTimes(1);
    expect(res.insertedRirekiIds).toHaveLength(1);
    const row = q.insertRow.mock.calls[0][1] as Record<string, unknown>;
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-05');
  });

  it('UPDATE(IMPORT) 情報+販売店 → 1行のみ (取込も UI と同一・1更新1レコード)', async () => {
    // 顧客要件 2026-07: 取込(source=IMPORT)も販売店適用日を廃止し joho に統一。
    // 情報+販売店を同時に変えても履歴は1件のみ（UI/置換と同一ロジック）。
    q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 6, hanbaitenId: 459 }));
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 1001, dokusyaShubetsu: 1 }),
    );

    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 1001,
      values: { dokusyaBusu: 8, hanbaitenId: 460 },
      johoDate: '2026-07-05',
      source: 'IMPORT',
      actor: 'u',
    });

    expect(q.insertRow).toHaveBeenCalledTimes(1);
    expect(res.insertedRirekiIds).toHaveLength(1);
    const row = q.insertRow.mock.calls[0][1] as Record<string, unknown>;
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-05');
  });

  it('UPDATE 変更検出は直前行(findBefore)基準 — 直前行と同値の項目は非変更 (顧客要件改訂 2026-07)', async () => {
    // 変更検出は master ではなく findBefore(joho=タイムライン上の直前行)基準。
    // フォームは直前行の実効値をベースに送るため、未編集の busu は直前行と同値(8)で
    // 届く → 非変更。販売店のみ 459→460。master(busu=3)は diff に無関係になった。
    q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 8, hanbaitenId: 459 }));
    q.loadMaster.mockResolvedValue(
      master({
        dokusyaId: 1001,
        dokusyaBusu: 3,
        hanbaitenId: 459,
        dokusyaShubetsu: 1,
      }),
    );

    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 1001,
      // 適用日(johoHenkoTekiyoDate)は業務変更ではないので diff 対象外(DIFF_EXCLUDE)。
      values: {
        dokusyaBusu: 8, // 直前行と同値＝ユーザー未編集 → 非変更
        hanbaitenId: 460,
        johoHenkoTekiyoDate: '2026-07-24',
      },
      johoDate: '2026-07-24',
      source: 'UI',
      actor: 'u',
    });

    expect(q.insertRow).toHaveBeenCalledTimes(1); // hanbaiten 1行のみ（busu は非変更）
    expect(res.insertedRirekiIds).toHaveLength(1);
    const inserted = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(inserted.hanbaitenId).toBe(460); // ユーザー入力
    expect(inserted.dokusyaBusu).toBe(8); // 直前行から carry
    expect(inserted.zenkaiHanbaitenId).toBe(459); // 直前行の販売店
    expect(inserted.zenkaiDokusyaBusu).toBe(8); // 直前行の busu
  });

  it('UPDATE 予約変更の積み重ね: 直前行と異なれば master と同値でも検出 (回帰: false@22 → true@23)', async () => {
    // 直前行 findBefore(07-23) = 予約 false@22（haitatsuSameFlg=false）。master は
    // rireki#1(=true・未来予約はまだ有効化されていない)。07-23 で true へ戻すと
    // master と同値(true)だが直前行(false)とは異なる → 検出され1行 insert。
    // 旧・master 基準では「master と同値」で未検出になり履歴が作られなかった不具合の
    // 回帰防止（顧客要件改訂 2026-07：予約変更の積み重ねを許可）。
    q.findBefore.mockResolvedValue(
      rireki({ dokusyaBusu: 5, hanbaitenId: 459, haitatsuSameFlg: false }),
    );
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 4, haitatsuSameFlg: true, dokusyaShubetsu: 1 }),
    );

    const res = await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 4,
      values: { haitatsuSameFlg: true, johoHenkoTekiyoDate: '2026-07-23' },
      johoDate: '2026-07-23',
      source: 'UI',
      actor: 'u',
    });

    expect(q.insertRow).toHaveBeenCalledTimes(1);
    expect(res.insertedRirekiIds).toHaveLength(1);
    const inserted = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(inserted.haitatsuSameFlg).toBe(true);
  });

  it('denshiSync = true when master is 電子版 (dokusya_shubetsu=2)', async () => {
    q.ensureMaster.mockResolvedValue(1001);
    q.findBefore.mockResolvedValue(null);
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 1001, dokusyaShubetsu: 2 }),
    );

    const res = await applyChange(m, {
      mode: 'CREATE',
      values: { dokusyaBusu: 4, dokusyaShubetsu: 2 },
      johoDate: '2026-07-01',
      source: 'UI',
      actor: 'a',
    });
    expect(res.denshiSync).toBe(true);
  });
});

describe('insertKaiyaku', () => {
  let m: EntityManager;
  let update: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    update = jest.fn().mockResolvedValue(undefined);
    m = {
      update,
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    q.insertRow.mockImplementation(
      async (_m, r) => ({ ...(r as object), dokusyaRirekiId: 99 }) as DokusyaRireki,
    );
    q.setSaishinFlags.mockResolvedValue(undefined);
  });

  it('紙版: joho = chushi, builds 解約 row, reflects to master', async () => {
    const ref = rireki({
      dokusyaRirekiId: 2,
      dokusyaChushiDate: '2026-07-15',
      dokusyaShubetsu: 1,
      kaiyakuFlg: false,
      dokusyaBusu: 6,
      hanbaitenId: 459,
    });
    q.loadEffectiveRow.mockResolvedValueOnce(ref); // ref read (chushi source)
    mockLcEffective(
      rireki({ dokusyaRirekiId: 99, tetsuzukiShurui: 0 }),
    ); // recompute
    q.findBefore.mockResolvedValue(ref);
    q.nextRirekiNo.mockResolvedValue(3);

    await insertKaiyaku(m, 1001, '2026-07-15');

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-07-15'); // as-of chushi
    expect(q.insertRow).toHaveBeenCalledTimes(1);
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.tetsuzukiShurui).toBe(0);
    expect(row.kaiyakuFlg).toBe(true);
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-15');
    expect(row.createdBy).toBe('batch');
    expect(q.setSaishinFlags).toHaveBeenCalled(); // reflected
    expect(update).toHaveBeenCalled();
  });

  it('電子版: joho = chushi + 1 day', async () => {
    const ref = rireki({
      dokusyaChushiDate: '2026-06-30',
      dokusyaShubetsu: 2,
      kaiyakuFlg: false,
    });
    q.loadEffectiveRow.mockResolvedValueOnce(ref);
    mockLcEffective(ref);
    q.findBefore.mockResolvedValue(ref);
    q.nextRirekiNo.mockResolvedValue(2);

    await insertKaiyaku(m, 1001, '2026-07-01');

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-07-01'); // chushi + 1
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-01');
  });

  // 顧客要件 2026-07 改訂: 併読(3) も電子版契約を含むため 電子版(2) と同じ +1日。
  // `=== DIGITAL` で判定すると併読を取りこぼすので DENSHI_SHUBETSU を使う。
  // バッチの抽出条件も同じ枝（<= 当日-1）に入れており、片方だけ変わると確定が
  // 1日ずれる — その回帰をここで止める。
  it('併読: joho = chushi + 1 day（電子版と同じ扱い）', async () => {
    const ref = rireki({
      dokusyaChushiDate: '2026-06-30',
      dokusyaShubetsu: 3, // 併読
      kaiyakuFlg: false,
    });
    q.loadEffectiveRow.mockResolvedValueOnce(ref);
    mockLcEffective(ref);
    q.findBefore.mockResolvedValue(ref);
    q.nextRirekiNo.mockResolvedValue(2);

    await insertKaiyaku(m, 1001, '2026-07-01');

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-07-01'); // chushi + 1
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-01');
    expect(row.kaiyakuFlg).toBe(true);
  });

  it('case D: 解約 inherits the new hanbaiten from the future-activated row', async () => {
    const ref = rireki({
      dokusyaChushiDate: '2026-07-15',
      dokusyaShubetsu: 1,
      kaiyakuFlg: false,
      hanbaitenId: 459,
    });
    const activated = rireki({ hanbaitenId: 460, dokusyaChushiDate: '2026-07-15' });
    q.loadEffectiveRow.mockResolvedValueOnce(ref);
    mockLcEffective(activated);
    q.findBefore.mockResolvedValue(activated); // as-of chushi → the 販売店 change
    q.nextRirekiNo.mockResolvedValue(4);

    await insertKaiyaku(m, 1001, '2026-07-15');

    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.hanbaitenId).toBe(460); // inherited new hanbaiten
  });

  it('no chushi date → nothing inserted', async () => {
    q.loadEffectiveRow.mockResolvedValueOnce(
      rireki({ dokusyaChushiDate: null, dokusyaShubetsu: 1 }),
    );
    await insertKaiyaku(m, 1001, '2026-07-15');
    expect(q.insertRow).not.toHaveBeenCalled();
  });

  it('already cancelled → nothing inserted', async () => {
    q.loadEffectiveRow.mockResolvedValueOnce(
      rireki({
        dokusyaChushiDate: '2026-07-15',
        kaiyakuFlg: true,
        dokusyaShubetsu: 1,
      }),
    );
    await insertKaiyaku(m, 1001, '2026-07-15');
    expect(q.insertRow).not.toHaveBeenCalled();
  });
});

describe('canTorikeshi', () => {
  const m = {} as EntityManager;

  beforeEach(() => jest.clearAllMocks());

  it('新規 (shinki) → false (no tail lookup)', async () => {
    const ok = await canTorikeshi(m, 1001, rireki({ dokusyaRirekiId: 1, shinkiFlg: true }));
    expect(ok).toBe(false);
    expect(q.loadEffectiveRow).not.toHaveBeenCalled();
  });

  it('already cancelled (torikeshi_flg) → false', async () => {
    const ok = await canTorikeshi(m, 1001, rireki({ dokusyaRirekiId: 2, torikeshiFlg: true }));
    expect(ok).toBe(false);
  });

  it('中間 row (not the chain tail) → false', async () => {
    q.loadEffectiveRow.mockResolvedValue(rireki({ dokusyaRirekiId: 5 })); // tail is #5
    const ok = await canTorikeshi(m, 1001, rireki({ dokusyaRirekiId: 3 }));
    expect(ok).toBe(false);
  });

  it('通常変更 at the tail (紙版・適用日未来) → true', async () => {
    q.loadEffectiveRow.mockResolvedValue(rireki({ dokusyaRirekiId: 3 }));
    const ok = await canTorikeshi(
      m,
      1001,
      rireki({ dokusyaRirekiId: 3, dokusyaShubetsu: 1, johoHenkoTekiyoDate: '2099-12-31' }),
    );
    expect(ok).toBe(true);
  });

  it('解約 at the tail (紙版・適用日未来=中止日) → true', async () => {
    q.loadEffectiveRow.mockResolvedValue(rireki({ dokusyaRirekiId: 4, kaiyakuFlg: true }));
    const ok = await canTorikeshi(
      m,
      1001,
      rireki({
        dokusyaRirekiId: 4,
        kaiyakuFlg: true,
        dokusyaShubetsu: 1,
        johoHenkoTekiyoDate: '2099-12-31',
      }),
    );
    expect(ok).toBe(true);
  });

  // 顧客要件2026-07 — 追加された 2 条件（紙版のみ・適用日未来のみ）。
  it('電子版 (dokusya_shubetsu=2) → false (電子版連携のため取消不可・末尾でも不可)', async () => {
    const ok = await canTorikeshi(
      m,
      1001,
      rireki({ dokusyaRirekiId: 3, dokusyaShubetsu: 2, johoHenkoTekiyoDate: '2099-12-31' }),
    );
    expect(ok).toBe(false);
    expect(q.loadEffectiveRow).not.toHaveBeenCalled(); // 紙版チェックで早期 return
  });

  it('併読 (dokusya_shubetsu=3) → false (電子版連携のため取消不可)', async () => {
    const ok = await canTorikeshi(
      m,
      1001,
      rireki({ dokusyaRirekiId: 3, dokusyaShubetsu: 3, johoHenkoTekiyoDate: '2099-12-31' }),
    );
    expect(ok).toBe(false);
  });

  it('適用日到来済み (past joho) → false (反映・報告済みのため取消不可)', async () => {
    const ok = await canTorikeshi(
      m,
      1001,
      rireki({ dokusyaRirekiId: 3, dokusyaShubetsu: 1, johoHenkoTekiyoDate: '2000-01-01' }),
    );
    expect(ok).toBe(false);
    expect(q.loadEffectiveRow).not.toHaveBeenCalled(); // 適用日チェックで早期 return（末尾判定前）
  });
});

describe('applyTorikeshi', () => {
  let m: EntityManager;
  let update: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    update = jest.fn().mockResolvedValue(undefined);
    m = {
      update,
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    q.insertRow.mockImplementation(
      async (_m, r) => ({ ...(r as object), dokusyaRirekiId: 88 }) as DokusyaRireki,
    );
    q.setSaishinFlags.mockResolvedValue(undefined);
    q.markTorikeshi.mockResolvedValue(undefined);
  });

  it('tail change → mark target + insert reversing row (swapped) + recompute', async () => {
    const target = rireki({
      dokusyaRirekiId: 3,
      dokusyaId: 1001,
      dokusyaShubetsu: 1,
      hanbaitenId: 460,
      zenkaiHanbaitenId: 459,
      johoHenkoTekiyoDate: '2099-12-31',
      shinkiFlg: false,
      torikeshiFlg: false,
    });
    q.loadRireki.mockResolvedValue(target);
    q.loadEffectiveRow.mockResolvedValueOnce(target); // canTorikeshi tail = target
    mockLcEffective(
      rireki({ dokusyaRirekiId: 1 }),
    ); // recompute
    q.nextRirekiNo.mockResolvedValue(4);

    await applyTorikeshi(m, 1001, 3, '誤入力', 'u1');

    // 取消理由は対象行の biko へ（markTorikeshi の第3引数）。
    expect(q.markTorikeshi).toHaveBeenCalledWith(m, 3, '誤入力');
    expect(q.insertRow).toHaveBeenCalledTimes(1);
    const counter = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(counter.hanbaitenId).toBe(459); // reversed
    expect(counter.zenkaiHanbaitenId).toBe(460);
    expect(counter.torikeshiFlg).toBe(true);
    expect(counter.createdBy).toBe('u1');
    expect(q.setSaishinFlags).toHaveBeenCalled(); // recompute ran
  });

  it('中間 row → throws, nothing marked/inserted', async () => {
    const target = rireki({ dokusyaRirekiId: 3, shinkiFlg: false, torikeshiFlg: false });
    q.loadRireki.mockResolvedValue(target);
    q.loadEffectiveRow.mockResolvedValue(rireki({ dokusyaRirekiId: 5 })); // tail #5 → target is 中間

    await expect(applyTorikeshi(m, 1001, 3, 'r', 'u')).rejects.toThrow();
    expect(q.markTorikeshi).not.toHaveBeenCalled();
    expect(q.insertRow).not.toHaveBeenCalled();
  });

  it('解約 target → reversing row restores 購読中', async () => {
    const target = rireki({
      dokusyaRirekiId: 4,
      dokusyaId: 1001,
      dokusyaShubetsu: 1,
      tetsuzukiShurui: 0,
      kaiyakuFlg: true,
      johoHenkoTekiyoDate: '2099-12-31',
      shinkiFlg: false,
      torikeshiFlg: false,
    });
    q.loadRireki.mockResolvedValue(target);
    q.loadEffectiveRow.mockResolvedValueOnce(target); // canTorikeshi tail
    mockLcEffective(target); // recompute
    q.nextRirekiNo.mockResolvedValue(5);

    await applyTorikeshi(m, 1001, 4, '取消', 'u');

    const counter = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(counter.tetsuzukiShurui).toBe(1);
    expect(counter.kaiyakuFlg).toBe(false);
  });
});

// 顧客要件 2026-08 — 電子版の「購読中止」ポップアップからの予約変更・予約取消。
// applyTorikeshi と同じ赤伝だが canTorikeshi(紙版のみ・末尾・未来日) を通さない。
// 呼び出し元(DokusyaService.stop)が同一 tx で電子版へ cancel を push するため、
// 「電子版は連携が切れるから取消不可」という canTorikeshi の前提が当てはまらない。
describe('revokeScheduledKaiyaku', () => {
  let m: EntityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    m = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    q.insertRow.mockImplementation(
      async (_m, r) => ({ ...(r as object), dokusyaRirekiId: 88 }) as DokusyaRireki,
    );
    q.setSaishinFlags.mockResolvedValue(undefined);
    q.markTorikeshi.mockResolvedValue(undefined);
    q.nextRirekiNo.mockResolvedValue(4);
  });

  /** 電子版の解約予約行（Phase 1・バッチ未確定）。 */
  function reservation(over: Partial<DokusyaRireki> = {}): DokusyaRireki {
    return rireki({
      dokusyaRirekiId: 3,
      dokusyaId: 1001,
      dokusyaShubetsu: 2, // 電子版 — canTorikeshi ならここで弾かれる
      dokusyaChushiDate: '2030-07-31',
      johoHenkoTekiyoDate: '2030-07-31',
      kaiyakuFlg: false,
      shinkiFlg: false,
      torikeshiFlg: false,
      ...over,
    });
  }

  it('電子版の予約行でも取消できる（mark + 打ち消し行 + recompute）', async () => {
    const target = reservation();
    mockLcEffective(rireki({ dokusyaRirekiId: 1 })); // recompute

    await revokeScheduledKaiyaku(m, 1001, target, '変更', 'u1');

    expect(q.markTorikeshi).toHaveBeenCalledWith(m, 3, '変更');
    const counter = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(counter.torikeshiFlg).toBe(true);
    expect(counter.createdBy).toBe('u1');
    // 対象行・打ち消し行とも torikeshi_flg=true になるので、recomputeMaster の
    // loadScheduledChushiDate から外れ master の購読中止日は null に戻る。
    expect(q.setSaishinFlags).toHaveBeenCalled();
  });

  it('バッチ確定済み(kaiyaku_flg=true)は取消不可 — 再購読の領域', async () => {
    await expect(
      revokeScheduledKaiyaku(m, 1001, reservation({ kaiyakuFlg: true }), 'r', 'u'),
    ).rejects.toThrow();
    expect(q.markTorikeshi).not.toHaveBeenCalled();
    expect(q.insertRow).not.toHaveBeenCalled();
  });

  it('中止日を持たない通常の変更行は取消不可（この入口は予約専用）', async () => {
    await expect(
      revokeScheduledKaiyaku(
        m,
        1001,
        reservation({ dokusyaChushiDate: null }),
        'r',
        'u',
      ),
    ).rejects.toThrow();
    expect(q.markTorikeshi).not.toHaveBeenCalled();
  });

  it('取消済み行は二重に取消さない', async () => {
    await expect(
      revokeScheduledKaiyaku(m, 1001, reservation({ torikeshiFlg: true }), 'r', 'u'),
    ).rejects.toThrow();
    expect(q.markTorikeshi).not.toHaveBeenCalled();
  });
});
