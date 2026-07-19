import type { Dokusya } from '@/database/entities/dokusya.entity';

import type { DokusyaDraft } from '../mapper/denshiban-dokusya.builder';

/**
 * INBOUND diff / classify engine (電子版 `users` → クラウド `t_dokusya`).
 *
 * The batch fetches denshiban `users` (collecting=1), turns each row into a
 * {@link DokusyaDraft} via {@link ../mapper/denshiban-dokusya.builder}, then hands
 * `(draft, existing)` to {@link classifyInbound}. The result tells the writer to
 * CREATE, UPDATE (which fields), or SKIP.
 *
 * The comparison happens in **cloud shape** (draft vs the existing `t_dokusya`
 * row) — NOT in users-shape — because:
 *   - it reuses the already-tested inbound builder (one source of truth for the
 *     mapping); no reverse `t_dokusya → users` mapper to write/maintain;
 *   - the lossy conversions (`sex ''↔9`, code↔label, …) collapse **symmetrically**
 *     on both sides, so they never produce a false diff. Comparing in users-shape
 *     would be the lossy direction and would need per-field special-casing.
 *
 * ⚠️ CARE-POINT — only **denshiban-sourced** columns are compared
 * ({@link COMPARABLE_FIELDS}). Everything the cloud owns is deliberately excluded
 * (see {@link EXCLUDED_FIELDS_DOC}). If `tanka_id` / `ja_id` / `rireki_no` etc.
 * were compared, the draft's placeholder (`tanka_id: null`, a re-resolved FK, …)
 * would be written back over the cloud's real value on every run — data loss.
 *
 * The premise that makes cloud-shape comparison safe: a cloud-side edit of a
 * digital subscriber is pushed OUT to denshiban synchronously, in the same
 * transaction ({@link ../denshiban-api.service}#sendNow). So denshiban stays
 * consistent with `t_dokusya`, and `users` vs `t_dokusya` never disagrees just
 * because the cloud edited first. (Known edge — 併読(3): the outbound gate is
 * digital-only(2), so a cloud edit to a 併読 subscriber is NOT pushed out; how
 * inbound should treat 併読 updates is a policy decision left to the writer, not
 * this pure diff.)
 */

/**
 * The `t_dokusya` columns that ORIGINATE from the denshiban `users` view and are
 * therefore safe to diff on an UPDATE. Shared camelCase keys of both
 * {@link DokusyaDraft} and {@link Dokusya} (the `satisfies` clause fails the
 * build if any name is mistyped or not present on both).
 *
 * Deliberately EXCLUDED — see {@link EXCLUDED_FIELDS_DOC} for the reason each is
 * left out. Changing this list is a security/data-integrity decision: adding a
 * cloud-owned column here makes the batch overwrite it.
 */
export const COMPARABLE_FIELDS = [
  // Classification (No 7, 8, 9, 57).
  'dokusyaShubetsu',
  'tetsuzukiShurui',
  'denshiDokusyaShubetsu',
  'denshiShoninStatus',

  // Name (No 10-13).
  'shimeiSei',
  'shimeiMei',
  'shimeiKanaSei',
  'shimeiKanaMei',

  // Address (No 15-22).
  'yubinNo',
  'todofukenCode',
  'shikuchoson',
  'chomeBanchi',
  'tatemonoMei',
  'renrakusaki1',
  'renrakusaki2',
  'email',

  // Attributes (No 23-25, 48-49).
  'mailMagazineFlg',
  'birthYear',
  'gender',
  'dokusyasoBunrui',
  'nogyosyaBunrui',

  // Paper-delivery address — 併読 only; sourced from paper_* (No 26-31).
  // Delivery NAME / PHONE (haitatsu_shimei_*, haitatsu_renrakusaki_*) are NOT
  // here: the view carries no such value, so the builder always emits ''.
  // Comparing them would clobber a name a cloud operator typed in.
  'haitatsuSameFlg',
  'haitatsuYubinNo',
  'haitatsuTodofukenCode',
  'haitatsuShikuchoson',
  'haitatsuChomeBanchi',
  'haitatsuTatemonoMei',

  // Payment / billing (No 42, 54).
  'dokusyaryoShiharaiCycle',
  'seikyuKaishiMonth',

  // Dates (No 51-52). `shoki_dokusya_kaishi_date` (No 50) is EXCLUDED — it keeps
  // its initial value forever.
  'dokusyaKaishiDate',
  'dokusyaChushiDate',

  // Notes (No 55).
  'biko',
] as const satisfies readonly (keyof DokusyaDraft & keyof Dokusya)[];

export type ComparableField = (typeof COMPARABLE_FIELDS)[number];

/**
 * Documentation of every draft column NOT in {@link COMPARABLE_FIELDS}, with the
 * reason. Kept as data so the diff spec can assert none of these ever leaks into
 * the comparison (the care-point regression guard).
 */
export const EXCLUDED_FIELDS_DOC: Record<string, string> = {
  // Match key — equal by definition when a row is matched by it.
  denshiKaiinId: 'match key (No 6)',

  // Cloud-owned FKs — resolved once at CREATE from JACd / ShopCd. Re-resolving
  // and diffing them would rewrite the tenant/ownership on every run.
  jaId: 'cloud FK, resolved at create (No 2)',
  kanriShitenId: 'cloud FK, resolved at create (No 3)',
  hanbaitenId: 'cloud FK, resolved at create (No 38)',

  // Sync bookkeeping the cloud maintains.
  rirekiNo: 'cloud bumps per update (No 56)',
  johoHenkoTekiyoDate: 'set to the sync date, not compared (No 53)',

  // Preserve-initial — must never be overwritten after first sync.
  shokiDokusyaKaishiDate: 'keeps its initial value forever (No 50)',

  // Cloud constants / defaults — the view has no source for these.
  shitenId: 'cloud constant null (No 4)',
  kumiaiinCode: "cloud constant '' (No 5)",
  dokusyaBusu: 'cloud constant 1 (No 14)',
  tankaId: 'cloud-assigned; draft placeholder is null — diffing would clobber (No 39)',
  yubinKubun: "cloud constant '0' (No 40)",
  bankBranchCode: 'no bank info in the view (No 43)',
  bankBranchName: 'no bank info in the view (No 44)',
  hikiotoshiYokinShubetsu: 'no bank info in the view (No 45)',
  hikiotoshiKozaNo: 'no bank info in the view (No 46)',
  hikiotoshiKozaMeigi: 'no bank info in the view (No 47)',

  // Not sourced by the view (builder always emits '') — never clobber a
  // cloud-entered delivery name/phone.
  haitatsuRenrakusaki1: 'view has no delivery phone (No 34)',
  haitatsuRenrakusaki2: 'view has no delivery phone (No 35)',
  haitatsuShimeiSei: 'view has no delivery name (No 32)',
  haitatsuShimeiMei: 'view has no delivery name (No 33)',
  haitatsuShimeiKanaSei: 'view has no delivery name kana (No 36)',
  haitatsuShimeiKanaMei: 'view has no delivery name kana (No 37)',

  // Resolvable now (payment_id ≡ shiharai_hoho, customer 2026-07-19) but held
  // OUT of the diff for two reasons: (a) an empty payment_id yields a null draft
  // value that would clobber the cloud's real method; (b) whether denshiban
  // should override a cloud-side payment-method edit on every sync is a policy
  // call (shiharai_hoho is inbound-only `←` in the mapping matrix — denshiban is
  // authoritative — so including it here is defensible, pending confirmation).
  // CREATE writes it from ctx; UPDATE leaves it alone for now.
  shiharaiHoho: 'CREATE-only; diff held pending null-clobber + policy review (No 41)',
};

/** The minimal existing-row shape the classifier reads (only comparable cols). */
export type DokusyaSnapshot = Pick<Dokusya, ComparableField>;

/** Only-changed comparable columns, as they should be written to `t_dokusya`. */
export type DokusyaChanges = Partial<Pick<DokusyaDraft, ComparableField>>;

/** What the batch should do with one denshiban row. */
export type InboundDecision =
  | { kind: 'create'; draft: DokusyaDraft }
  | { kind: 'update'; changes: DokusyaChanges }
  | { kind: 'skip' };

/**
 * Decides CREATE / UPDATE / SKIP for one denshiban row already turned into a
 * draft.
 *
 * @param draft    the cloud-shape draft built from the denshiban `users` row.
 * @param existing the matched `t_dokusya` row (by `denshi_kaiin_id`), or `null`
 *                 when no cloud row carries this `denshi_kaiin_id` yet.
 * @returns `create` when unmatched; `update` with only the differing
 *          denshiban-sourced columns; `skip` when every compared column matches.
 */
export function classifyInbound(
  draft: DokusyaDraft,
  existing: DokusyaSnapshot | null,
): InboundDecision {
  if (existing == null) {
    return { kind: 'create', draft };
  }

  const changes: DokusyaChanges = {};
  for (const field of COMPARABLE_FIELDS) {
    if (!valuesEqual(draft[field], existing[field])) {
      // `field` is a union of the comparable keys; the value types line up by
      // construction (draft/entity share the column's declared type) but TS
      // can't correlate them across the loop, so widen for the assignment.
      (changes as Record<ComparableField, unknown>)[field] = draft[field];
    }
  }

  return Object.keys(changes).length > 0
    ? { kind: 'update', changes }
    : { kind: 'skip' };
}

/**
 * Equality for one column. Both sides carry the column's declared TypeScript type
 * (number for `int`, string for `varchar`, boolean for `boolean`, or `null`), so
 * strict compare is correct — with the one normalization that `null` and
 * `undefined` are treated as the same "absent" value.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  return a === b;
}
