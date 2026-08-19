import { EntityManager } from 'typeorm';

import { DokusyaShubetsu } from '@/common/enums';
import { addDaysIso, todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { TorikeshiNotAllowedException } from './exceptions/torikeshi-not-allowed.exception';

import {
  applyCascadeStep,
  buildCounterRow,
  buildKaiyakuRow,
  buildKaiyakuReservationRow,
  buildResubscribeRow,
  buildRirekiRow,
  CascadeActive,
  diffChangedFields,
  mapRirekiToMaster,
  splitEvents,
} from './dokusya-history.builder';
import {
  ensureMaster,
  findBefore,
  findNext,
  insertRow,
  loadCurrentLifecycleEffectiveRow,
  loadEarliestRow,
  loadEffectiveRow,
  loadMaster,
  loadRireki,
  loadScheduledChushiDate,
  markTorikeshi,
  nextRirekiNo,
  setSaishinFlags,
} from './dokusya-history.query';
import {
  ApplyChangeInput,
  ApplyChangeResult,
  DateOnly,
  DokusyaFields,
  KaiyakuResult,
  RecomputeResult,
} from './dokusya-history.types';

// 電子版=2 / 併読=3 → どちらも電子版同期対象。
// Set<number>: enum は 2|3 リテラル型だが `.has()` に一般 number を渡すため明示的に広げる。
const DENSHI_SHUBETSU = new Set<number>([
  DokusyaShubetsu.DIGITAL,
  DokusyaShubetsu.BOTH,
]);

/**
 * Bitemporal 履歴ライタ — query/builder ヘルパの orchestration。EntityManager 上の
 * 純関数（tx は caller 所有）。docs/dokusya-rireki-common-functions.md §4。
 */

/**
 * create / update / import / replace の単一入口。caller の `m`(tx) 上で履歴行を書き
 * master を再計算する。監査・外部連携は行わない（監査は tx 内で before/after を使い
 * caller が、電子版同期は denshiSync 時に commit 後）。§4.1。
 */
export async function applyChange(
  m: EntityManager,
  input: ApplyChangeInput,
): Promise<ApplyChangeResult> {
  const { mode, values, johoDate, actor, source } = input;
  // 販売店統廃合フラグ（顧客要件2026-08）: 購読者販売店一括置換画面（SCR-015）だけが
  // source='REPLACE_HANBAITEN' を渡す。UI編集/Excel取込/バッチ同期は全てfalse。
  const hanbaitenTohaigoFlg = source === 'REPLACE_HANBAITEN';

  let dokusyaId: number;
  let beforeMaster: Dokusya | null;

  if (mode === 'CREATE') {
    dokusyaId = await ensureMaster(m, values as Partial<Dokusya>, actor);
    beforeMaster = null;
  } else {
    if (input.dokusyaId == null) {
      throw new Error('applyChange(UPDATE): dokusyaId is required');
    }
    dokusyaId = input.dokusyaId;
    beforeMaster = await loadMaster(m, dokusyaId); // 監査 result.before 用
  }

  // 変更検出は直前行 findBefore(joho) 基準（顧客要件2026-07：予約変更を積み重ね可に）。
  // joho は必ず当日以降（過去日は service ガードで拒否）なので直前行=joho時点の有効行=
  // carry-forward 元。master 基準だと未来予約行があると「直前行と異なるが master と同値」
  // の変更が未検出になり履歴が作られなかった。zenkai_*・cascade も同じ findBefore 起点で一貫。
  // CREATE は直前行なし(null)＝全項目を変更扱い。
  const diffBase =
    mode === 'CREATE' ? null : await findBefore(m, dokusyaId, johoDate);
  const changed = diffChangedFields(diffBase, values);
  // [1更新1レコード] 全変更を joho で1件の履歴行にまとめる（顧客要件2026-07）。
  // UI編集・Excel取込・一括置換で書込みロジックは統一（`hanbaitenTohaigoFlg` のみ
  // sourceで分岐・顧客要件2026-08）。
  const events = splitEvents(mode, changed, values, johoDate);

  const insertedRirekiIds: number[] = [];
  for (const e of events) {
    const before = await findBefore(m, dokusyaId, e.joho);
    const no = await nextRirekiNo(m, dokusyaId);
    const row = buildRirekiRow(before, e, {
      dokusyaId,
      rirekiNo: no,
      actor,
      hanbaitenTohaigoFlg,
    });
    // Excel取込で配達先データありの行は増減報告対象に（顧客要件 — 配達先列は標準の
    // 増減トリガではないため force で明示的に立てる）。
    if (input.forceZougen) row.zougenHokokuFlg = true;
    const saved = await insertRow(m, row);
    insertedRirekiIds.push(saved.dokusyaRirekiId);
    await recomputeAfterChain(m, dokusyaId, saved, before, Object.keys(e.values));
  }

  // 再計算基準日は常に当日。未来日レコードは当日時点で有効化されない（夜間バッチが
  // 到来日に有効化）。ただし全行が未来（未来 購読開始日 の新規）の場合、recomputeMaster が
  // 最早行へ fallback し saishin=true を保証（顧客要件2026-07: 新規は saishin=true）。
  await recomputeMaster(m, dokusyaId, todayIsoJst(), actor);
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds,
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

/**
 * `t_dokusya` と `saishin_data_flg` を asOf 時点で再計算。現ライフサイクル（最新の
 * 新規行以降 — {@link loadCurrentLifecycleEffectiveRow}）に限定する。
 *
 * 不変条件 `t_dokusya ⇔ 常に 1 行 saishin_data_flg=TRUE`（履歴が1行以上あれば）を担保:
 * - 現ライフサイクル内で `joho <= asOf` の最大 `(joho, rireki_no)` が有効行；
 * - 無ければ（全て未来 = 未来開始日の新規/再購読）最新の新規行へ fallback し master を
 *   即その内容にする（新規作成の即時反映と同じ）。
 *
 * これにより再購読は初回新規と同じく即 購読中 になる。update/解約（同一LC内の未来 joho 行）は
 * joho<=asOf まで有効化されず到来日バッチ任せ。単一LC（再購読なし）は従来と同一挙動。
 *
 * 冪等: フル再計算。save / batch で繰り返し実行可。
 *
 * [touch-only-changed] 書き込みは 3 分岐（下の `writeMaster`）。業務値が変わらない
 * ときに 56 列を無条件 UPDATE すると `updated_at` が毎回動き、購読者一覧(ACSMS-SCR-014)の
 * 既定ソート `updated_at DESC` が「誰も触っていないのに先頭に来る」状態になる。
 *
 * 戻り値 {@link RecomputeResult} は「業務値が実際に動いたか」を呼出し元へ伝えるため
 * のもの。監査ログを書くのは**バッチ側の責務**で、ここでは書かない — 本関数は UI 経由の
 * applyChange / 解約 / 取消 からも呼ばれ、それらは既に自前で t_log を書いているので、
 * ここで書くと 1 操作につき監査行が 2 本になる。
 */
export async function recomputeMaster(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
  actor?: string,
): Promise<RecomputeResult> {
  const { row: effectiveRow, startRirekiNo } =
    await loadCurrentLifecycleEffectiveRow(m, dokusyaId, asOf);
  await setSaishinFlags(m, dokusyaId, effectiveRow?.dokusyaRirekiId ?? null);
  if (effectiveRow) {
    const masterFields = mapRirekiToMaster(effectiveRow);
    // [scheduled-chushi] 予約中の解約予定日(購読中止日)を master へ即時反映（顧客要件
    // 2026-07）。予約行は未来日で effective でないため通常 master 未反映だが、中止日だけは
    // 予約時点から一覧(ACSMS-SCR-014)/詳細(ACSMS-SCR-011)に表示したい。取消済みなら null → master も
    // クリア。effective 行が既に中止日を持つ（バッチ確定後等）場合も同値が返り整合。
    const scheduledChushi = await loadScheduledChushiDate(
      m,
      dokusyaId,
      startRirekiNo,
    );
    if (scheduledChushi != null) {
      masterFields.dokusyaChushiDate = scheduledChushi;
    }
    return writeMaster(m, dokusyaId, masterFields, actor);
  }
  return { changedFields: [], before: null, after: {} };
}

/**
 * master への書き込み最小化。業務値の差分有無で 3 分岐する:
 *
 * 1. **業務値に差分あり** → 従来どおり全列 UPDATE（`updated_at` も更新される）。
 * 2. **業務値は同一・ポインタだけ前進** → `(joho_henko_tekiyo_date, rireki_no)` の
 *    2 列だけを生 SQL で更新。`m.update()` を使うと TypeORM が @UpdateDateColumn を
 *    検出して `updated_at = CURRENT_TIMESTAMP` を自動付与してしまうため、ここは
 *    意図的に `m.query()` を使う。
 * 3. **完全に同一** → 何もしない。
 *
 * 「業務値」の定義は applyChange の変更検出と同じ {@link diffChangedFields}
 * （＝ DIFF_EXCLUDE_FIELDS 以外）。両者で判定基準を揃えることで「履歴行は作られた
 * のに master は動かない」「その逆」といったズレが起きない。
 *
 * ポインタ 2 列は業務値ではないが**必ず同期する**こと。これは recompute バッチの
 * 抽出条件（master の (joho, rireki_no) より後ろに到来済み履歴行があるか）の基準
 * そのもので、ここを更新しないと同じ購読者が毎晩無限に抽出され続ける。
 */
async function writeMaster(
  m: EntityManager,
  dokusyaId: number,
  masterFields: Partial<Dokusya>,
  actor?: string,
): Promise<RecomputeResult> {
  const before = await m.findOne(Dokusya, { where: { dokusyaId } });
  if (!before) {
    await m.update(Dokusya, { dokusyaId }, masterFields);
    return { changedFields: [], before: null, after: masterFields };
  }

  const changedFields = diffChangedFields(
    before,
    masterFields as DokusyaFields,
  );
  if (changedFields.length > 0) {
    // [updated-by] 業務値が動いたときだけ更新者を差し替える。master の監査列は
    // 履歴側に対応列が無く（t_dokusya_rireki は created_by のみ・行は不変）、
    // mapRirekiToMaster も updated_by を運ばないので、actor を渡さないと登録時の
    // 値が残り続ける。created_by は触らない — 「誰が作ったか」は作成時の事実で、
    // かつ電子版同期由来の読者を判別する手掛かりとして使う（顧客要件 2026-08）。
    await m.update(
      Dokusya,
      { dokusyaId },
      actor ? { ...masterFields, updatedBy: actor } : masterFields,
    );
    return { changedFields, before, after: masterFields };
  }

  const joho = masterFields.johoHenkoTekiyoDate ?? null;
  const no = masterFields.rirekiNo ?? null;
  const samePointer =
    String(before.johoHenkoTekiyoDate ?? '') === String(joho ?? '') &&
    Number(before.rirekiNo ?? -1) === Number(no ?? -1);
  if (samePointer) return { changedFields: [], before, after: masterFields };

  // ポインタ前進は業務値の変更ではないので updated_at を動かさない（上の
  // docblock 参照）。updated_by も同じ理由で据え置く — 片方だけ動かすと
  // 「更新者は変わったのに更新日時は古い」という読めない行になる。
  await m.query(
    `UPDATE t_dokusya
        SET joho_henko_tekiyo_date = $1, rireki_no = $2
      WHERE dokusya_id = $3`,
    [joho, no, dokusyaId],
  );
  return { changedFields: [], before, after: masterFields };
}

/**
 * Batch 解約: `dokusya_chushi_date` が到来した購読者に解約行を1件 append し t_dokusya へ反映。
 * 呼出し元は到来日バッチ `DokusyaKaiyakuService`（dokusya-apply-due の第1段）。
 *
 * - 適用日 = 中止日+1日(電子版=2 / 併読=3) または 中止日(紙版=1)。併読は電子版契約を
 *   含むので電子版と同じ扱い（顧客要件 2026-07 改訂）。バッチの抽出条件も同じ枝
 *   （<= 当日-1）に揃える必要がある — 片方だけ直すと確定が1日ずれる。
 * - `before` = 解約日時点の有効行(G3, NOT INFINITY) — 同夜有効化の未来変更を継承(case D)。
 * - 冪等: 中止日なし or 解約済みならスキップ（この場合 `null` を返す）。戻り値が
 *   non-null＝**この呼び出しで実際に解約が確定した**ことの証。バッチはこれを見て
 *   監査ログ(t_log)を書くので、冪等スキップした夜には監査行が積まれない。
 * - **対象範囲の決定はバッチ側の責務**。顧客要件 2026-07 改訂で全購読種別・全支払方法が
 *   対象になった（併読・電子版クレカも確定する）。read-only ガードは画面操作の禁止で
 *   あって解約確定を止める趣旨ではなく、確定しないと相手システムと状態が食い違うため。
 * §4.3。
 */
export async function insertKaiyaku(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
  actor: string,
): Promise<KaiyakuResult | null> {
  const ref = await loadEffectiveRow(m, dokusyaId, asOf);
  if (ref?.dokusyaChushiDate == null || ref.kaiyakuFlg) return null;

  // 併読(3) も電子版契約を含むため 電子版(2) と同じ +1日（顧客要件 2026-07 改訂）。
  // 判定はファイル先頭の DENSHI_SHUBETSU を再利用し、`=== DIGITAL` を書かない
  // （併読の扱いを取りこぼす典型の書き方）。
  const isDenshi = DENSHI_SHUBETSU.has(Number(ref.dokusyaShubetsu));
  const kaiyakuJoho = isDenshi
    ? addDaysIso(ref.dokusyaChushiDate, 1)
    : ref.dokusyaChushiDate;

  const before = await findBefore(m, dokusyaId, kaiyakuJoho);
  if (!before) return null;

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildKaiyakuRow(before, {
    dokusyaId,
    rirekiNo: no,
    kaiyakuJoho,
    chushiDate: ref.dokusyaChushiDate,
    createdBy: actor,
  });
  await insertRow(m, row);
  const master = await recomputeMaster(m, dokusyaId, asOf, actor);
  return { rirekiNo: no, master };
}

/**
 * UI 解約予約（Phase 1・顧客要件2026-07 の2フェーズ化）: 編集画面で購読中止日を入力した
 * 時点で予約行を1件追加（継続情報行ではない）。予約行は最小限のみ override（部数=0・
 * zougen=true・中止日・適用日・kaiyaku_flg=false・saishin=false）— build は
 * `buildKaiyakuReservationRow`。実際の解約確定（tetsuzuki=0・kaiyaku_flg=true・saishin
 * 反映）は Phase 2 の到来日バッチ `insertKaiyaku` が別レコードで行う
 * （docs/dokusya-kaiyaku-phase2-plan.md）。予約行は未来日（saishin=false）で到来まで master
 * 未反映。返り値は applyChange と同じ ApplyChangeResult（caller が監査を統一的に書ける）。
 *
 * 適用日（joho）= 紙版は中止日、電子版/併読は中止日+1日（顧客要件 2026-08 改訂）。
 * 紙版の中止日は「紙が届かなくなる日」なので即日反映でよいが、電子版の中止日は
 * 「電子版が読める有効な最終日」であり、中止日当日はまだ有効な読者として扱う必要が
 * あるため、Phase 2 の解約確定行（insertKaiyaku）と同じ +1日 を Phase 1 の予約行にも
 * 適用する（旧仕様は紙版/電子版とも中止日で統一していたが、顧客要件変更でこの分岐に）。
 * DENSHI_SHUBETSU（電子版=2/併読=3）判定は insertKaiyaku と共通。
 */
export async function insertScheduledKaiyaku(
  m: EntityManager,
  input: {
    dokusyaId: number;
    chushiDate: DateOnly;
    shubetsu: number;
    actor: string;
  },
): Promise<ApplyChangeResult> {
  const { dokusyaId, chushiDate, shubetsu, actor } = input;
  const beforeMaster = await loadMaster(m, dokusyaId);

  const isDenshi = DENSHI_SHUBETSU.has(Number(shubetsu));
  const joho = isDenshi ? addDaysIso(chushiDate, 1) : chushiDate;

  // predecessor = 適用日(joho)時点の有効行。zenkai_* と継承業務項目の基準
  // （applyChange/insertKaiyaku と同じく「探索キー = 挿入行自身の joho」で統一）。
  const before = await findBefore(m, dokusyaId, joho);
  if (!before) {
    throw new Error('insertScheduledKaiyaku: predecessor row not found');
  }

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildKaiyakuReservationRow(before, {
    dokusyaId,
    rirekiNo: no,
    chushiDate,
    joho,
    createdBy: actor,
  });
  const saved = await insertRow(m, row);

  // 再計算基準日は当日。未来予約は当日時点で未反映（saishin=false のまま）。
  await recomputeMaster(m, dokusyaId, todayIsoJst(), actor);
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds: [saved.dokusyaRirekiId],
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

/**
 * 再購読: 解約済み購読者が編集画面(手続種類=新規)で新しい購読開始日を指定して再加入。
 * 新規(再購読)行を append — shinki_flg=true・tetsuzuki=1・kaiyaku_flg=false・新
 * dokusya_kaishi_date・chushi=null — tail(解約行) から状態継承。`values` は再購読後の新値。
 *
 * 適用日(joho) = 新 購読開始日（初回作成行と同じ形）。即時反映は recomputeMaster が
 * 現ライフサイクル(最新の新規行以降)で有効行を選ぶことで担保: 新開始日が未来でも有効行が
 * 無ければ最新の新規(=この再購読)行へ fallback し master が即 購読中（新規の未来開始日と同じ）。
 * update/解約（同一LC内の未来 joho 行）は joho<=当日 まで有効化されず到来日バッチ任せ。
 * 返り値は ApplyChangeResult。
 */
export async function insertResubscribe(
  m: EntityManager,
  input: {
    dokusyaId: number;
    kaishiDate: DateOnly;
    values: DokusyaFields;
    actor: string;
  },
): Promise<ApplyChangeResult> {
  const { dokusyaId, kaishiDate, values, actor } = input;
  const beforeMaster = await loadMaster(m, dokusyaId);

  // predecessor は新開始日時点の有効行(=解約行)から状態継承。無ければ最早行。
  const before =
    (await findBefore(m, dokusyaId, kaishiDate)) ??
    (await loadEarliestRow(m, dokusyaId));
  if (!before) {
    throw new Error('insertResubscribe: no history row to carry forward');
  }

  const no = await nextRirekiNo(m, dokusyaId);
  const row = buildResubscribeRow(
    before,
    values,
    // 再購読はSCR-011の編集画面専用機能でSCR-015（統廃合）とは無関係のため常にfalse。
    { dokusyaId, rirekiNo: no, actor, hanbaitenTohaigoFlg: false },
    kaishiDate, // joho = 新 購読開始日
  );
  const saved = await insertRow(m, row);

  await recomputeMaster(m, dokusyaId, todayIsoJst(), actor);
  const after = await loadMaster(m, dokusyaId);

  return {
    dokusyaId,
    insertedRirekiIds: [saved.dokusyaRirekiId],
    before: beforeMaster,
    after,
    denshiSync: DENSHI_SHUBETSU.has(after.dokusyaShubetsu),
  };
}

// today/future を問わずチェーン末尾を取るための遠未来 sentinel。
const CHAIN_TAIL_ASOF = '9999-12-31';

/**
 * `target` を取消できるか（取消可否, G1・顧客要件2026-07）:
 * - 紙版(1)のみ → 電子版(2)・併読(3) は電子版読者管理システムへ即時連携のため取消不可;
 * - `shinki_flg`（新規/解約→再購読, DB設計で両方 flagged）→ no;
 * - 既に `torikeshi_flg` → no;
 * - 適用日が未来(本日 < joho, JST) でなければ no（到来済み＝反映・報告済み）。紙版の解約行は
 *   joho=購読中止日 なので「解約バッチ前まで取消可」もこの一条件で満たす（電子版は joho=中止日+1
 *   だがそもそも取消不可）;
 * - `flag=0` 行の (joho, rireki_no) チェーン末尾(LIFO)であること — 後続の未取消行がある中間行→no。
 * 紙版・末尾・適用日未来の 解約/通常変更 → yes。
 */
export async function canTorikeshi(
  m: EntityManager,
  dokusyaId: number,
  target: DokusyaRireki,
): Promise<boolean> {
  // 6. 紙版のみ取消可（電子版連携のため 電子版・併読 は不可）。
  if (target.dokusyaShubetsu !== DokusyaShubetsu.PAPER) return false;
  // 3+4. 新規/再購読・取消済は取消不可。
  if (target.shinkiFlg || target.torikeshiFlg) return false;
  // 7. 適用日が未来(本日 < 適用日, JST) でなければ取消不可（到来済み＝反映済み）。
  //    joho は DATE('YYYY-MM-DD') — ISO 文字列比較で日付順保持。null も未来でないので取消不可扱い。
  if (
    target.johoHenkoTekiyoDate == null ||
    target.johoHenkoTekiyoDate <= todayIsoJst()
  ) {
    return false;
  }
  // 5. 末尾（適用日チェーンの有効レコード）でなければ取消不可（LIFO）。
  const tail = await loadEffectiveRow(m, dokusyaId, CHAIN_TAIL_ASOF);
  // tail が null なら optional chain で undefined ⇒ 一致せず false。
  return target.dokusyaRirekiId === tail?.dokusyaRirekiId;
}

/**
 * 取消(赤伝): 誤登録の変更を削除せず無効化。対象行にフラグを立て打ち消し行を append
 * （両方 torikeshi_flg=1）、残る flag=0 行で master 再計算。§4.4。
 */
export async function applyTorikeshi(
  m: EntityManager,
  dokusyaId: number,
  targetRirekiId: number,
  reason: string,
  actor: string,
): Promise<void> {
  const target = await loadRireki(m, targetRirekiId);
  if (!(await canTorikeshi(m, dokusyaId, target))) {
    throw new TorikeshiNotAllowedException();
  }
  await markTorikeshi(m, targetRirekiId, reason);
  const no = await nextRirekiNo(m, dokusyaId);
  const counter = buildCounterRow(target, { rirekiNo: no, actor, reason });
  await insertRow(m, counter);
  await recomputeMaster(m, dokusyaId, todayIsoJst(), actor);
}

/**
 * 解約予約の取消（電子版の「購読中止」再操作・顧客要件 2026-08）。赤伝は
 * {@link applyTorikeshi} と同形（対象行に torikeshi_flg + 打ち消し行を append）だが、
 * `canTorikeshi` は通さない。
 *
 * 理由: `canTorikeshi` は「紙版のみ」を課している。電子版を弾いていたのは、履歴画面から
 * 個別に取消されると電子版へ何も伝わらず両システムが食い違うため。ここは ACSMS-SCR-014 の
 * 「購読中止」操作専用の入口で、呼び出し元(`DokusyaService.stop`)が同一 tx 内で
 * 電子版へ cancel を push する。連携が伴う以上、その禁止理由は当てはまらない。
 *
 * 代わりに「予約行であること」を自前で守る:
 *   - `dokusya_chushi_date` を持つ（＝解約予約/解約行）
 *   - `kaiyaku_flg=false`（到来日バッチが確定させた実解約行は取消不可 — 再購読の領域）
 *   - `torikeshi_flg=false`（二重取消しない）
 * 適用日が未来かは問わない: 電子版の予約行は 適用日=中止日(月末) なので、月末当日に
 * 変更したい要求が正当に起こりうる。確定済みか否かは `kaiyaku_flg` が正しい境界。
 */
export async function revokeScheduledKaiyaku(
  m: EntityManager,
  dokusyaId: number,
  target: DokusyaRireki,
  reason: string,
  actor: string,
): Promise<void> {
  if (
    target.dokusyaChushiDate == null ||
    target.kaiyakuFlg ||
    target.torikeshiFlg
  ) {
    throw new TorikeshiNotAllowedException();
  }
  await markTorikeshi(m, target.dokusyaRirekiId, reason);
  const no = await nextRirekiNo(m, dokusyaId);
  const counter = buildCounterRow(target, { rirekiNo: no, actor, reason });
  await insertRow(m, counter);
  await recomputeMaster(m, dokusyaId, todayIsoJst(), actor);
}

/**
 * `inserted` を既存2行の間に挿入した後、影響を受ける後続行をカスケード更新する
 * （顧客要件 No.86 — docs/requirement/dokusya_rireki_record_writing_rules.md §7.3、
 * 実装計画: docs/requirement/dokusya_rireki_cascade_implementation_plan.md）。
 *
 * 購読部数・販売店・実効配達先住所の3グループを対象に、直後行から順に
 * {@link applyCascadeStep} を適用する:
 *  - キャリーフォワードしていた行（現在値が変更前の zenkai と同値）は
 *    現在値ごと `predecessor`（挿入行、以降はカスケード済みの直前行）へ
 *    追随させ、カスケードを継続する。
 *  - 意図的に変更していた行（現在値が zenkai と異なる）に到達したら、
 *    そのフィールドのカスケードを停止する（zenkai の relink のみ行う）。
 *  - 3グループとも停止する（または後続行が尽きる）までループする。
 *
 * `zougen_hokoku_flg` は一切変更しない（重複計上防止 — {@link applyCascadeStep} 参照）。
 *
 * - CREATE / no change → 直後行なし（早期 return）。
 * - `findNext` は torikeshi_flg=1 行をスキップ（取消行はカスケード対象にならない）。
 */
export async function recomputeAfterChain(
  m: EntityManager,
  dokusyaId: number,
  inserted: DokusyaRireki,
  before: DokusyaRireki | null,
  changed: string[],
): Promise<void> {
  if (!before || changed.length === 0) return;

  let predecessor = inserted;
  let active: CascadeActive = { busu: true, hanbaiten: true, address: true };
  let cur = inserted;

  while (active.busu || active.hanbaiten || active.address) {
    const after = await findNext(
      m,
      dokusyaId,
      cur.johoHenkoTekiyoDate as DateOnly,
      cur.rirekiNo,
    );
    if (after === null) break;

    active = applyCascadeStep(after, predecessor, active);
    await m.save(DokusyaRireki, after);

    predecessor = after;
    cur = after;
  }
}
