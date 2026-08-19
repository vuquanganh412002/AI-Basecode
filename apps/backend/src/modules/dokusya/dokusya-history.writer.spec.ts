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
  insertScheduledKaiyaku,
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

  /**
   * master の監査列は履歴側に対応列が無い（t_dokusya_rireki は created_by のみで
   * 行は不変）。mapRirekiToMaster も updated_by を運ばないので、actor を渡さない
   * 限り t_dokusya.updated_by は登録時の値のまま固まる。夜間バッチ（情報変更反映）は
   * 履歴行を作らないため、ここが唯一の実行者の記録になる（顧客要件 2026-08）。
   */
  it('actor を渡すと updated_by も差し替える（created_by は触らない）', async () => {
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 3,
        rirekiNo: 2,
        johoHenkoTekiyoDate: '2026-05-01',
        dokusyaBusu: 8, // 業務変更あり
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 1,
      johoHenkoTekiyoDate: '2026-04-01',
      dokusyaBusu: 1,
    });

    await recomputeMaster(m, 1001, '2026-07-01', 'SYSTEM_BATCH_NIGHTLY');

    const fields = update.mock.calls[0][2] as Record<string, unknown>;
    expect(fields.updatedBy).toBe('SYSTEM_BATCH_NIGHTLY');
    // created_by は「誰が作ったか」の事実で、電子版同期由来の判別にも使うため不変。
    expect(fields).not.toHaveProperty('createdBy');
  });

  it('actor を渡さなければ updated_by は据え置く（既存呼出しの挙動を変えない）', async () => {
    mockLcEffective(
      rireki({
        dokusyaRirekiId: 3,
        rirekiNo: 2,
        johoHenkoTekiyoDate: '2026-05-01',
        dokusyaBusu: 8,
      }),
    );
    (m.findOne as jest.Mock).mockResolvedValue({
      dokusyaId: 1001,
      rirekiNo: 1,
      johoHenkoTekiyoDate: '2026-04-01',
      dokusyaBusu: 1,
    });

    await recomputeMaster(m, 1001, '2026-07-01');

    const fields = update.mock.calls[0][2] as Record<string, unknown>;
    expect(fields).not.toHaveProperty('updatedBy');
  });

  /**
   * ポインタ前進は業務値の変更ではないので updated_at を動かさない。updated_by も
   * 同じ扱い — 片方だけ動くと「更新者は新しいのに更新日時は古い」行になる。
   */
  it('ポインタ前進だけのときは actor を渡しても updated_by を動かさない', async () => {
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

    await recomputeMaster(m, 1001, '2026-07-01', 'SYSTEM_BATCH_NIGHTLY');

    expect(update).not.toHaveBeenCalled();
    const [sql] = (m.query as jest.Mock).mock.calls[0];
    expect(sql).not.toContain('updated_by');
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

  it('successor that changed the field itself → relink zenkai, stop, zougen untouched', async () => {
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
      zenkaiDokusyaBusu: 6, // 作成時点の zenkai（挿入前の predecessor 値）
      hanbaitenId: 459,
      // 住所も意図的な変更として stop させる（未設定=undefined同士だと
      // キャリーフォワード扱いになり、この行1つで全グループ停止という
      // テストの意図から外れてしまうため）。
      yubinNo: '1000001',
      zenkaiYubinNo: '2000002',
      zougenHokokuFlg: false, // 作成時点の値 — カスケードで変わらないことを確認する
    });
    q.findNext.mockResolvedValueOnce(after);

    await recomputeAfterChain(m, 1001, inserted, before, ['dokusyaBusu']);

    expect(q.findNext).toHaveBeenCalledTimes(1); // 3グループとも after で停止
    expect(save).toHaveBeenCalledTimes(1);
    expect(after.dokusyaBusu).toBe(10); // its own value kept (intentional change)
    expect(after.zenkaiDokusyaBusu).toBe(8); // relinked to inserted (prev)
    // zougen_hokoku_flg はカスケードで一切変更しない（増減連絡票/増減通知書の
    // 二重計上防止 — docs/requirement/dokusya_rireki_record_writing_rules.md §7.3）。
    expect(after.zougenHokokuFlg).toBe(false);
  });

  it('cascade: carried-forward busu/hanbaiten propagate through multiple successors until an intentional change (顧客要件 No.86 ケース3)', async () => {
    // 資料 docs/123.xlsx ケース3の多段版: after1・after2 とも busu/hanbaiten
    // ともキャリーフォワードのため、後続行が尽きるまでカスケードが続く。
    const before = rireki({ dokusyaBusu: 4 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-07-01',
      rirekiNo: 3,
      dokusyaBusu: 6,
      hanbaitenId: 459,
    });
    const after1 = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-08-01',
      rirekiNo: 2,
      dokusyaBusu: 4,
      zenkaiDokusyaBusu: 4, // busu キャリーフォワード（挿入前の predecessor と同値）
      hanbaitenId: 459,
      zenkaiHanbaitenId: 459, // hanbaiten もキャリーフォワード
    });
    const after2 = rireki({
      dokusyaRirekiId: 5,
      johoHenkoTekiyoDate: '2026-09-01',
      rirekiNo: 4,
      dokusyaBusu: 4,
      zenkaiDokusyaBusu: 4, // これもキャリーフォワード
      hanbaitenId: 459,
      zenkaiHanbaitenId: 459,
    });
    q.findNext
      .mockResolvedValueOnce(after1)
      .mockResolvedValueOnce(after2)
      .mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['dokusyaBusu']);

    // after1・after2 とも両フィールドともキャリーフォワード → 後続行が尽きる
    // まで続く: findNext 3回（after1, after2, null）・save 2回。
    expect(q.findNext).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledTimes(2);

    expect(after1.dokusyaBusu).toBe(6); // 4→6 へ追随（挿入行の値）
    expect(after1.zenkaiDokusyaBusu).toBe(6); // relink
    expect(after1.hanbaitenId).toBe(459); // 変化なし（両方 459 のまま）
    expect(after1.zenkaiHanbaitenId).toBe(459);

    expect(after2.dokusyaBusu).toBe(6); // after1(カスケード後の6)を引き継いで6へ
    expect(after2.zenkaiDokusyaBusu).toBe(6); // relink（after1 の値）
  });

  it('cascade: busu stops at the first successor with an intentional change while hanbaiten keeps propagating past it', async () => {
    // busu と hanbaiten は独立に停止する — 顧客要件 No.86 §6-3。
    const before = rireki({ dokusyaBusu: 4, hanbaitenId: 459 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-02-01',
      rirekiNo: 4,
      dokusyaBusu: 4,
      hanbaitenId: 470, // 販売店変更のみ（意図的、遡及挿入）
    });
    const after1 = rireki({
      dokusyaRirekiId: 5,
      johoHenkoTekiyoDate: '2026-04-01',
      rirekiNo: 2,
      dokusyaBusu: 6, // 意図的な増部（4→6） → busu はここで停止
      zenkaiDokusyaBusu: 4,
      hanbaitenId: 459,
      zenkaiHanbaitenId: 459, // hanbaiten はキャリーフォワード → 継続
    });
    const after2 = rireki({
      dokusyaRirekiId: 6,
      johoHenkoTekiyoDate: '2026-06-01',
      rirekiNo: 3,
      dokusyaBusu: 6,
      zenkaiDokusyaBusu: 6,
      hanbaitenId: 459,
      zenkaiHanbaitenId: 459, // hanbaiten もキャリーフォワード → さらに継続
    });
    q.findNext
      .mockResolvedValueOnce(after1)
      .mockResolvedValueOnce(after2)
      .mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['hanbaitenId']);

    expect(q.findNext).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledTimes(2);

    // busu は after1 で即停止（意図的変更を検出）。
    expect(after1.dokusyaBusu).toBe(6); // 不変（据え置き）
    expect(after1.zenkaiDokusyaBusu).toBe(4); // relinkのみ（値は変わらず）
    expect(after1.hanbaitenId).toBe(470); // hanbaiten は継続してカスケード
    expect(after1.zenkaiHanbaitenId).toBe(470);

    // busu は after2 に一切触れない（既に停止済み）。
    expect(after2.dokusyaBusu).toBe(6);
    expect(after2.hanbaitenId).toBe(470); // hanbaiten はさらに継続
    expect(after2.zenkaiHanbaitenId).toBe(470);
  });

  it('cascade: skips torikeshi-flagged rows via findNext (regression — no extra handling needed)', async () => {
    // findNext は torikeshi_flg=1 行を自動的にスキップするため、カスケードが
    // 取消済み行を誤って書き換えないことを確認する（顧客要件 No.86 ケース4）。
    const before = rireki({ dokusyaBusu: 4 });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-02-01',
      rirekiNo: 5,
      dokusyaBusu: 6,
      hanbaitenId: 459,
    });
    // findNext のモック自体が「torikeshi 行はスキップ済み」の結果を返す —
    // query 層の既存フィルタを信頼し、writer 側では何もしないことの確認。
    const after = rireki({
      dokusyaRirekiId: 7,
      johoHenkoTekiyoDate: '2026-08-01',
      rirekiNo: 4,
      dokusyaBusu: 4,
      zenkaiDokusyaBusu: 4,
      hanbaitenId: 459,
      zenkaiHanbaitenId: 459,
    });
    q.findNext.mockResolvedValueOnce(after).mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['dokusyaBusu']);

    expect(after.dokusyaBusu).toBe(6); // 取消済み行(rireki_no=2・3相当)を飛ばして直接カスケード
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cascade: propagates carried-forward effective address through multiple successors (Phase 2)', async () => {
    // 資料 docs/requirement/dokusya_rireki_cascade_implementation_plan.md
    // §3.3 例6の多段版。busu/hanbaiten は未設定(undefined同士)のため一緒に
    // キャリーフォワードし続けるが、この行の関心はあくまで住所。
    const before = rireki({ yubinNo: '1000001' });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-02-01',
      rirekiNo: 4,
      yubinNo: '1500005', // 引っ越し（意図的、遡及挿入）
    });
    const after1 = rireki({
      dokusyaRirekiId: 5,
      johoHenkoTekiyoDate: '2026-03-01',
      rirekiNo: 2,
      yubinNo: '1000001', // キャリーフォワード（挿入前の predecessor と同値）
      zenkaiYubinNo: '1000001',
    });
    const after2 = rireki({
      dokusyaRirekiId: 6,
      johoHenkoTekiyoDate: '2026-06-01',
      rirekiNo: 3,
      yubinNo: '1000001', // これもキャリーフォワード
      zenkaiYubinNo: '1000001',
    });
    q.findNext
      .mockResolvedValueOnce(after1)
      .mockResolvedValueOnce(after2)
      .mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['yubinNo']);

    expect(q.findNext).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledTimes(2);
    expect(after1.yubinNo).toBe('1500005'); // 追随（挿入行の値）
    expect(after1.zenkaiYubinNo).toBe('1500005'); // relink
    expect(after2.yubinNo).toBe('1500005'); // after1(カスケード後)を引き継ぐ
    expect(after2.zenkaiYubinNo).toBe('1500005'); // relink（after1 の値）
  });

  it('cascade: address stops at a successor that switched haitatsu_same_flg (意図的な配達先変更 — Phase 2)', async () => {
    const before = rireki({ yubinNo: '1000001' });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-02-01',
      rirekiNo: 4,
      yubinNo: '1500005', // 引っ越し（意図的、遡及挿入）
    });
    const after = rireki({
      dokusyaRirekiId: 5,
      johoHenkoTekiyoDate: '2026-06-01',
      rirekiNo: 2,
      haitatsuSameFlg: false, // 配達先を別住所に設定（意図的な変更）
      haitatsuYubinNo: '2000002',
      zenkaiYubinNo: '1000001', // 作成時点は購読者住所ベースで埋まっていた
    });
    q.findNext.mockResolvedValueOnce(after).mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['haitatsuSameFlg']);

    expect(after.haitatsuYubinNo).toBe('2000002'); // 不変（意図的な変更として stop）
    expect(after.zenkaiYubinNo).toBe('1500005'); // relinkのみ（値は正しい predecessor へ）
  });

  it('cascades haitatsu_same_flg itself (not just the address values) when a carrying-forward successor exists (バグ報告 2026-08)', async () => {
    // 9/1(新規,同一)→15/1(同一,キャリーフォワード) の間に 12/1 適用で配達先を
    // 別住所へ切替える行を遡及挿入したケース。修正前は 15/1 行の
    // haitatsu_same_flg を据え置いたまま実効住所だけ書き換えていたため、
    // 挿入行(別住所)の値が誤って 15/1 行の購読者住所側の列へ書き込まれて
    // いた。正しくは haitatsu_same_flg 自体もモードごと追随し、配達先住所
    // 列（haitatsu_*）へ書き込み、購読者住所（yubinNo 等）は触らない。
    const before = rireki({ haitatsuSameFlg: true, yubinNo: '1000001' });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-01-12',
      rirekiNo: 3,
      haitatsuSameFlg: false, // 配達先を別住所に切替（意図的、遡及挿入）
      haitatsuYubinNo: '2000002',
      haitatsuRenrakusaki1: '0100022',
      haitatsuShimeiSei: '配達',
      haitatsuShimeiMei: 'TUYEN Tran Duc',
    });
    const after = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-01-15',
      rirekiNo: 2,
      haitatsuSameFlg: true, // 挿入前は購読者住所と同一のままキャリーフォワード
      yubinNo: '1000001',
      zenkaiYubinNo: '1000001', // 挿入前の predecessor(9/1) と同値 → carry-forward
    });
    q.findNext.mockResolvedValueOnce(after).mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['haitatsuSameFlg']);

    expect(after.haitatsuSameFlg).toBe(false); // モードごと追随
    expect(after.haitatsuYubinNo).toBe('2000002'); // 配達先住所を追随
    expect(after.yubinNo).toBe('1000001'); // 購読者住所は汚染されず維持
    // 連絡先・氏名6列（zenkai_* を持たない）も住所と同じ判定で追随する
    // （画面上「配達先」ブロックとして一体で扱われるため — バグ報告 2026-08）。
    expect(after.haitatsuRenrakusaki1).toBe('0100022');
    expect(after.haitatsuShimeiSei).toBe('配達');
    expect(after.haitatsuShimeiMei).toBe('TUYEN Tran Duc');
  });

  it('clears haitatsu_* back to empty string when a carrying-forward successor settles back to haitatsu_same_flg=true', async () => {
    // 逆方向: predecessor が haitatsu_same_flg=true に確定したら、追随した
    // 行の haitatsu_* は空欄が不変条件（DokusyaFormView.vue §9）。
    const before = rireki({ haitatsuSameFlg: false, haitatsuYubinNo: '9999999' });
    const inserted = rireki({
      johoHenkoTekiyoDate: '2026-01-12',
      rirekiNo: 3,
      haitatsuSameFlg: true, // 配達先=購読者情報と同じ に戻す（意図的、遡及挿入）
      yubinNo: '1000001',
    });
    const after = rireki({
      dokusyaRirekiId: 4,
      johoHenkoTekiyoDate: '2026-01-15',
      rirekiNo: 2,
      haitatsuSameFlg: false,
      haitatsuYubinNo: '9999999',
      haitatsuRenrakusaki1: '0100099',
      haitatsuShimeiSei: '旧配達',
      zenkaiYubinNo: '9999999', // 挿入前の predecessor と同値 → carry-forward
    });
    q.findNext.mockResolvedValueOnce(after).mockResolvedValueOnce(null);

    await recomputeAfterChain(m, 1001, inserted, before, ['haitatsuSameFlg']);

    expect(after.haitatsuSameFlg).toBe(true);
    expect(after.haitatsuYubinNo).toBe(''); // 不変条件どおり空欄化
    expect(after.haitatsuRenrakusaki1).toBe(''); // 連絡先・氏名6列も同様に空欄化
    expect(after.haitatsuShimeiSei).toBe('');
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

  // 顧客要件2026-08: 販売店統廃合フラグ。統廃合販売店読者移行画面（旧: 購読者販売店
  // 一括置換画面・SCR-015）だけが source='REPLACE_HANBAITEN' を渡す。他のsourceは全てfalse。
  it('UPDATE(REPLACE_HANBAITEN) → 挿入行の hanbaitenTohaigoFlg が true', async () => {
    q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 6, hanbaitenId: 459 }));
    q.loadMaster.mockResolvedValue(
      master({ dokusyaId: 1001, dokusyaShubetsu: 1 }),
    );

    await applyChange(m, {
      mode: 'UPDATE',
      dokusyaId: 1001,
      values: { hanbaitenId: 460 },
      johoDate: '2026-07-05',
      source: 'REPLACE_HANBAITEN',
      actor: 'u',
    });

    const row = q.insertRow.mock.calls[0][1] as Record<string, unknown>;
    expect(row.hanbaitenTohaigoFlg).toBe(true);
  });

  it.each(['UI', 'IMPORT', 'BATCH'] as const)(
    'UPDATE(%s) → 挿入行の hanbaitenTohaigoFlg が false',
    async (source) => {
      q.findBefore.mockResolvedValue(rireki({ dokusyaBusu: 6, hanbaitenId: 459 }));
      q.loadMaster.mockResolvedValue(
        master({ dokusyaId: 1001, dokusyaShubetsu: 1 }),
      );

      await applyChange(m, {
        mode: 'UPDATE',
        dokusyaId: 1001,
        values: { hanbaitenId: 460 },
        johoDate: '2026-07-05',
        source,
        actor: 'u',
      });

      const row = q.insertRow.mock.calls[0][1] as Record<string, unknown>;
      expect(row.hanbaitenTohaigoFlg).toBe(false);
    },
  );

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

    await insertKaiyaku(m, 1001, '2026-07-15', 'batch-test');

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-07-15'); // as-of chushi
    expect(q.insertRow).toHaveBeenCalledTimes(1);
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.tetsuzukiShurui).toBe(0);
    expect(row.kaiyakuFlg).toBe(true);
    expect(row.johoHenkoTekiyoDate).toBe('2026-07-15');
    expect(row.createdBy).toBe('batch-test'); // 呼出し元の actor がそのまま入る
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

    await insertKaiyaku(m, 1001, '2026-07-01', 'batch-test');

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

    await insertKaiyaku(m, 1001, '2026-07-01', 'batch-test');

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

    await insertKaiyaku(m, 1001, '2026-07-15', 'batch-test');

    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.hanbaitenId).toBe(460); // inherited new hanbaiten
  });

  it('no chushi date → nothing inserted', async () => {
    q.loadEffectiveRow.mockResolvedValueOnce(
      rireki({ dokusyaChushiDate: null, dokusyaShubetsu: 1 }),
    );
    await insertKaiyaku(m, 1001, '2026-07-15', 'batch-test');
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
    await insertKaiyaku(m, 1001, '2026-07-15', 'batch-test');
    expect(q.insertRow).not.toHaveBeenCalled();
  });
});

// 顧客要件 2026-08 改訂: Phase 1（UI 解約予約）の適用日も insertKaiyaku(Phase 2) と
// 同じ紙版/電子版分岐にする。以前は紙版/電子版とも joho=chushiDate に統一していたが、
// 電子版の中止日は「電子版が読める有効な最終日」であり当日は有効な読者として扱う
// 必要があるため、予約行の時点から +1日 を使う（実際の解約確定は変わらず Phase 2）。
describe('insertScheduledKaiyaku', () => {
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

  it('紙版: joho = chushi（変更なし）', async () => {
    const before = rireki({
      dokusyaRirekiId: 1,
      dokusyaBusu: 1,
      tetsuzukiShurui: 1,
    });
    q.loadMaster.mockResolvedValue({ dokusyaId: 1001 } as unknown as Dokusya);
    q.findBefore.mockResolvedValue(before);
    q.nextRirekiNo.mockResolvedValue(5);
    mockLcEffective(null); // 未来予約 → 当日時点で未反映

    await insertScheduledKaiyaku(m, {
      dokusyaId: 1001,
      chushiDate: '2026-08-31',
      shubetsu: 1, // 紙版
      actor: '11',
    });

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-08-31'); // joho=chushi
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.dokusyaChushiDate).toBe('2026-08-31');
    expect(row.johoHenkoTekiyoDate).toBe('2026-08-31');
    expect(row.dokusyaBusu).toBe(0);
  });

  it('電子版: joho = chushi + 1 day（顧客要件2026-08）', async () => {
    const before = rireki({
      dokusyaRirekiId: 1,
      dokusyaBusu: 1,
      tetsuzukiShurui: 1,
    });
    q.loadMaster.mockResolvedValue({ dokusyaId: 1001 } as unknown as Dokusya);
    q.findBefore.mockResolvedValue(before);
    q.nextRirekiNo.mockResolvedValue(5);
    mockLcEffective(null);

    await insertScheduledKaiyaku(m, {
      dokusyaId: 1001,
      chushiDate: '2026-08-31',
      shubetsu: 2, // 電子版
      actor: '11',
    });

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-09-01'); // joho=chushi+1
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.dokusyaChushiDate).toBe('2026-08-31'); // 中止日はそのまま
    expect(row.johoHenkoTekiyoDate).toBe('2026-09-01'); // 適用日=中止日の翌日
    expect(row.dokusyaBusu).toBe(0);
    expect(row.tetsuzukiShurui).toBe(1); // まだ新規（解約確定は Phase 2 バッチ）
  });

  // 併読(3)も電子版契約を含むため電子版と同じ+1日（insertKaiyaku と同じ判定基準）。
  it('併読: joho = chushi + 1 day（電子版と同じ扱い）', async () => {
    const before = rireki({ dokusyaRirekiId: 1, dokusyaBusu: 1 });
    q.loadMaster.mockResolvedValue({ dokusyaId: 1001 } as unknown as Dokusya);
    q.findBefore.mockResolvedValue(before);
    q.nextRirekiNo.mockResolvedValue(5);
    mockLcEffective(null);

    await insertScheduledKaiyaku(m, {
      dokusyaId: 1001,
      chushiDate: '2026-08-31',
      shubetsu: 3, // 併読
      actor: '11',
    });

    expect(q.findBefore).toHaveBeenCalledWith(m, 1001, '2026-09-01');
    const row = q.insertRow.mock.calls[0][1] as DokusyaRireki;
    expect(row.johoHenkoTekiyoDate).toBe('2026-09-01');
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
