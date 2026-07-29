import { EntityManager, SelectQueryBuilder } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { SORT_CHAIN_ASC, SORT_CHAIN_DESC } from './dokusya-history.constants';
import { DateOnly, DokusyaSnapshot } from './dokusya-history.types';

/**
 * 複数列のチェーン順序を orderBy/addOrderBy の連続呼出しで適用。合成文字列
 * `'a DESC, b DESC'` を単一 `.orderBy()` に渡さないこと — TypeORM が既定方向を付け
 * 不正な `... DESC ASC` SQL を吐く。
 */
function applyChainOrder(
  qb: SelectQueryBuilder<DokusyaRireki>,
  order: ReadonlyArray<readonly [string, 'ASC' | 'DESC']>,
): SelectQueryBuilder<DokusyaRireki> {
  order.forEach(([expr, dir], i) =>
    i === 0 ? qb.orderBy(expr, dir) : qb.addOrderBy(expr, dir),
  );
  return qb;
}

/**
 * bitemporal 履歴ライタ(dokusya-history.*) の query ヘルパ。EntityManager 上の純関数で
 * caller が tx を制御。生 WHERE/ORDER 文字列は snake_case DB 列名(repo 規約)。
 * docs/dokusya-rireki-common-functions.md §5.1。
 */

/**
 * asOf 時点の有効行: `joho <= asOf` かつ `torikeshi_flg = false` の中で最大
 * `(joho, rireki_no)`。未来行のみ(または皆無)なら null。読取専用。
 */
export function loadEffectiveRow(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.joho_henko_tekiyo_date <= :asOf', { asOf }),
    SORT_CHAIN_DESC,
  )
    .limit(1)
    .getOne();
}

/**
 * 現ライフサイクルの起点 — 最新の新規/再購読行（shinki_flg=true・取消除外の最大
 * (joho, rireki_no)）。全購読者に最低1つ(作成行)存在。再購読でこの行が進むため、これを
 * 境界に「現LC = rireki_no >= 起点」を定義できる。{@link loadCurrentLifecycleEffectiveRow} /
 * {@link loadScheduledChushiDate} が共有。無ければ null（履歴なし）。
 */
function loadLatestShinki(
  m: EntityManager,
  dokusyaId: number,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.shinki_flg = true'),
    SORT_CHAIN_DESC,
  )
    .limit(1)
    .getOne();
}

/**
 * 予約中の解約予定日(購読中止日) — 現LC(最新の新規/再購読行以降)で取消されていない
 * `dokusya_chushi_date` を持つ最新 (joho, rireki_no) 行の中止日。予約行は未来日で
 * effective でないが、中止日だけは予約時点から master(t_dokusya) に反映して
 * 一覧(SCR-014)/詳細(SCR-011)に即時表示するため recomputeMaster が参照（顧客要件2026-07）。無ければ null。
 *
 * LC限定が重要（顧客要件2026-07）: 解約確定→再購読 すると旧LCの解約予約/確定行に中止日が
 * 残るが rireki_no が再購読行より小さいため除外 → 再購読後は master の中止日が null に戻る。
 * 予約を取消(torikeshi)した場合も該当行が除外され null に戻り master もクリア。
 */
export async function loadScheduledChushiDate(
  m: EntityManager,
  dokusyaId: number,
): Promise<DokusyaRireki['dokusyaChushiDate'] | null> {
  const latestShinki = await loadLatestShinki(m, dokusyaId);
  if (!latestShinki) return null; // 履歴なし

  const row = await applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.rireki_no >= :minNo', { minNo: latestShinki.rirekiNo })
      .andWhere('r.dokusya_chushi_date IS NOT NULL'),
    SORT_CHAIN_DESC,
  )
    .limit(1)
    .getOne();
  return row?.dokusyaChushiDate ?? null;
}

/**
 * チェーン最早行（MIN (joho, rireki_no), torikeshi_flg = false）。recomputeMaster が
 * `joho <= asOf` の行が皆無（全行未来 = 未来購読開始日の新規）のとき master-effective
 * fallback に使う。開始日到来前でも不変条件 `t_dokusya ⇔ 1 行 saishin=true` を維持
 * （バッチが到来日に有効行を進める）。findBefore では未使用（挿入時の直前行は今日より前のみ見る）。
 */
export function loadEarliestRow(
  m: EntityManager,
  dokusyaId: number,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false'),
    SORT_CHAIN_ASC,
  )
    .limit(1)
    .getOne();
}

/**
 * 現LC（最新の新規 shinki_flg=true・取消除外 以降）に限定した t_dokusya 用有効行。これで
 * 再購読を新規作成と同じ挙動にする: 新開始日が未来でも現LCの有効行が無ければ最新の
 * 新規(=再購読)行へ fallback → master が即 購読中（初回作成の未来開始日と同じ）。
 *
 * - `latestShinki` = shinki_flg=true・torikeshi_flg=false の最大 (joho, rireki_no)
 *   （作成行 or 再購読行）。全購読者に最低1つ(作成行)存在。
 * - effective = torikeshi_flg=false・rireki_no >= latestShinki.rireki_no・joho <= asOf の
 *   最大 (joho, rireki_no)。無ければ latestShinki。
 *
 * 単一LC（再購読なし）では latestShinki=作成行(最小 rireki_no) なので従来の
 * 「loadEffectiveRow(asOf) ?? loadEarliestRow」と同一挙動（後方互換）。update/解約
 * （同一LC内の未来 joho 行）は joho<=asOf まで有効化されず到来日バッチ任せ。
 */
export async function loadCurrentLifecycleEffectiveRow(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<DokusyaRireki | null> {
  const latestShinki = await loadLatestShinki(m, dokusyaId);
  if (!latestShinki) return null; // 履歴なし

  const effective = await applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.rireki_no >= :minNo', { minNo: latestShinki.rirekiNo })
      .andWhere('r.joho_henko_tekiyo_date <= :asOf', { asOf }),
    SORT_CHAIN_DESC,
  )
    .limit(1)
    .getOne();
  return effective ?? latestShinki;
}

/**
 * `joho` に挿入予定の行の直前行(日付順)。{@link loadEffectiveRow} と同じクエリ —
 * 直前行 = joho 時点の有効行（新行は未 persist）。読取専用；新行の zenkai_* の元。
 */
export function findBefore(
  m: EntityManager,
  dokusyaId: number,
  joho: DateOnly,
): Promise<DokusyaRireki | null> {
  return loadEffectiveRow(m, dokusyaId, joho);
}

/**
 * 指定位置より厳密に後の直後行（(joho, rireki_no) 順・torikeshi_flg=false）。
 * チェーン中間へ挿入時に直後行を再計算するのに使う。
 */
export function findNext(
  m: EntityManager,
  dokusyaId: number,
  joho: DateOnly,
  rirekiNo: number,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere(
        '(r.joho_henko_tekiyo_date > :joho OR (r.joho_henko_tekiyo_date = :joho AND r.rireki_no > :rirekiNo))',
        { joho, rirekiNo },
      ),
    SORT_CHAIN_ASC,
  )
    .limit(1)
    .getOne();
}

/**
 * 次の rireki_no: `COALESCE(MAX(rireki_no), 0) + 1`。全行(torikeshi_flg=true 含む)を
 * 数えるので打ち消し行が (dokusya_id, rireki_no) で衝突しない。
 */
export async function nextRirekiNo(
  m: EntityManager,
  dokusyaId: number,
): Promise<number> {
  const row = await m
    .createQueryBuilder(DokusyaRireki, 'r')
    .select('COALESCE(MAX(r.rireki_no), 0) + 1', 'next')
    .where('r.dokusya_id = :dokusyaId', { dokusyaId })
    .getRawOne<{ next: string }>();
  return Number(row?.next ?? 1);
}

/** 構築済み履歴行を保存し、採番済み id 付きで返す。 */
export function insertRow(
  m: EntityManager,
  row: Partial<DokusyaRireki>,
): Promise<DokusyaRireki> {
  return m.save(DokusyaRireki, m.create(DokusyaRireki, row));
}

/**
 * 有効行に saishin_data_flg=TRUE、他の torikeshi_flg=false 行は全て FALSE。有効行が無い
 * （未来行のみ）なら null を渡す → 全て FALSE。不変条件 `t_dokusya ⇔ saishin_data_flg=TRUE`。
 */
export async function setSaishinFlags(
  m: EntityManager,
  dokusyaId: number,
  effectiveRirekiId: number | null,
): Promise<void> {
  // bind param を明示 int cast: pg wire は text 送信で COALESCE(text, -1) が int リテラルと
  // 統一できない（pg-mem で失敗・strict PG で脆い）。$1::int は NULL(有効行なし)も綺麗に処理。
  await m.query(
    `UPDATE t_dokusya_rireki
        SET saishin_data_flg = (dokusya_rireki_id = COALESCE($1::int, -1))
      WHERE dokusya_id = $2::int AND torikeshi_flg = false`,
    [effectiveRirekiId, dokusyaId],
  );
}

/**
 * 履歴行を 取消(赤伝) にフラグ。削除はしない。取消理由は対象行の biko に記録
 * （顧客要件 — 取消理由は対象行と打ち消し行の両方の備考に記録）。
 */
export async function markTorikeshi(
  m: EntityManager,
  dokusyaRirekiId: number,
  reason: string,
): Promise<void> {
  await m.update(
    DokusyaRireki,
    { dokusyaRirekiId },
    { torikeshiFlg: true, biko: reason },
  );
}

/**
 * CREATE 用に master(t_dokusya) の shell を INSERT し採番済み dokusya_id を返す。
 * 行は直後に recomputeMaster が最初の rireki 行から上書きするため、ここでは PK 取得に
 * 必要な列だけあればよい。
 */
export async function ensureMaster(
  m: EntityManager,
  values: Partial<Dokusya>,
  actor: string,
): Promise<number> {
  // created_by / updated_by は t_dokusya の NOT NULL 列（DB 側 DEFAULT なし。entity の
  // `default: 'SYSTEM'` は DDL 生成用メタデータで INSERT 時には効かない）。UI create /
  // Excel取込は values に載せてくるが、履歴業務項目だけを組み立てる呼出元
  // （dokusya-sync バッチの DokusyaFields）には監査列が無く NULL 違反で落ちる。
  // 呼出元共通の actor を最終フォールバックにして同じ罠を踏まないようにする。
  const saved = await m.save(
    Dokusya,
    m.create(Dokusya, {
      ...values,
      createdBy: values.createdBy ?? actor,
      updatedBy: values.updatedBy ?? actor,
    }),
  );
  return saved.dokusyaId;
}

/** 現 master スナップショットを読む（無ければ throw — 書込み後は必ず存在）。 */
export async function loadMaster(
  m: EntityManager,
  dokusyaId: number,
): Promise<DokusyaSnapshot> {
  const row = await m.findOne(Dokusya, { where: { dokusyaId } });
  if (!row) {
    throw new Error(`t_dokusya not found for dokusya_id=${dokusyaId}`);
  }
  return row;
}

/** 履歴行を PK で1件読む（無ければ throw）。取消 で使用。 */
export async function loadRireki(
  m: EntityManager,
  dokusyaRirekiId: number,
): Promise<DokusyaRireki> {
  const row = await m.findOne(DokusyaRireki, { where: { dokusyaRirekiId } });
  if (!row) {
    throw new Error(`t_dokusya_rireki not found: ${dokusyaRirekiId}`);
  }
  return row;
}
