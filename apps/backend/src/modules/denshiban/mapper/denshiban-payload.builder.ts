import { DokusyaShubetsu } from '@/common/enums';
import type { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * Pure functions that assemble the plaintext request (props) sent to denshiban's
 * common API `updateUserInfo`. No DI, no repo, no HTTP, and **no clock** → 100%
 * unit-testable offline (TDD Phase 1).
 *
 * The one clock-dependent conversion (`payment_start` = absolute month → the
 * two-valued this-month/next-month) is isolated in
 * {@link ./denshiban-payment-start}. The caller resolves it with
 * `toPaymentStart()` and passes it as {@link BuildCtx.paymentStart}.
 *
 * The contract is `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md`:
 *   §A   the field × mode matrix
 *   §A-2 the settled signatures of the 3 command modes (cancel / approve / unapprove)
 *   §B   per-field conversion rules
 *   §C   the 4 shared principles
 * **Do not guess and add anything that isn't in that matrix.**
 *
 * The 4 shared principles (§C):
 *   1. Every value is a `String` (numbers included).
 *   2. null / undefined / '' are **dropped key and all** (sending '' risks being
 *      interpreted as "clear this value"). Only required fields are sent even when
 *      empty, so {@link assertPayload} can reject them.
 *   3. UPDATE sends **only the fields that changed** (required fields are always sent).
 *   4. Breaking an inter-field condition (products only when profession=0, etc.)
 *      makes denshiban return `V**` for that field.
 *
 * `timestamp` is not generated here — sitting in the queue past 300 seconds turns
 * into `E05`, so it is stamped right before sending (`DenshibanApiService.send()`).
 */

/** Operation type (action_kbn). */
export type DenshibanMode =
  | 'create'
  | 'update'
  | 'reread'
  | 'cancel'
  | 'approve'
  | 'unapprove';

/** The 3 command modes — "instruction only" modes that carry no profile. */
export type DenshibanCommandMode = Extract<
  DenshibanMode,
  'cancel' | 'approve' | 'unapprove'
>;

/**
 * The plaintext body of `updateUserInfo` (excluding `timestamp`). Per the spec
 * every field is a String. Fields that aren't sent **do not exist as keys**.
 */
export interface DenshibanPayload {
  action_kbn: DenshibanMode;
  jacd_execute: string;
  [key: string]: string;
}

/**
 * Context the caller resolves up front and passes in, so the builder never has to
 * touch the DB.
 */
export interface BuildCtx {
  /** Executing JA — the operator's (logged-in user's) `m_kanri_shiten.kanri_shiten_code` (10 digits). */
  jacdExecute: string;
  /** Owning JA — the record's `kanri_shiten_code`. For `jacd` on update / reread. */
  jacd?: string;
  /** Notify-the-member flag. Required for update / reread / cancel. Defaults to '0' (do not notify). */
  notifyFlg?: '0' | '1';
  /** Cancellation month `YYYYMM` — cancel only. A past month makes denshiban return `P05`. */
  cancelYm?: string;
  /**
   * Subscription start (0: today / 1: the 1st of next month). Required for
   * create / approve / unapprove. Converting from
   * `t_dokusya.dokusya_kaishi_date` (an absolute date) depends on the clock, so the
   * builder doesn't do it — the caller resolves it via
   * {@link ./denshiban-payment-start#toPaymentStart} and passes it in.
   */
  paymentStart?: '0' | '1';
}

/**
 * Signals that a value cannot be mapped. **Do not swallow it** — quietly dropping
 * data we can't send makes denshiban and cloud diverge silently. The caller
 * (Phase 2's trigger) records it in `t_log(ERROR)` for operators to see.
 */
export class DenshibanMappingError extends Error {
  constructor(
    /** The cloud-side column that caused it (`t_dokusya`). */
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'DenshibanMappingError';
  }
}

// ─── Code conversion tables ────────────────────────────────────────────────
// Cloud stores CSVs of Japanese labels (SCR-011's checkboxes) and denshiban
// receives numeric codes. The screen definition (`DokusyaFormView.vue`
// dokusyaSoBunruiOptions / nogyosyaBunruiOptions) is the single source of the
// label set.

/** Subscriber-attribute label → denshiban `profession`. */
const PROFESSION_BY_LABEL: Record<string, string> = {
  農業者: '0',
  JAグループ役職員: '1',
  '企業・団体': '2',
  学生: '3',
  その他: '999',
};

/**
 * Main-product label → denshiban `products`.
 *
 * denshiban has `5:酪農` but cloud's screen has no matching checkbox (i.e. 5 can
 * never come out of cloud). The inbound side, which needs the reverse mapping,
 * will handle it (a future phase).
 */
const PRODUCTS_BY_LABEL: Record<string, string> = {
  米: '0',
  野菜: '1',
  果実: '2',
  花: '3',
  畜産: '4',
  その他: '999',
};

/**
 * Gender: cloud (`GENDER`) → denshiban `sex`. **The codes are inverted**
 * (cloud female=2 / denshiban female=0). `GENDER` is m_code Group B (it has no TS
 * enum), so the conversion is confined to this table. Unset and unsupported values
 * collapse to '9' (no answer).
 */
const SEX_BY_GENDER: Record<number, string> = {
  1: '1', // male
  2: '0', // female
  9: '9', // no answer
};
/** The default for denshiban `sex` (no answer). Used when the cloud side is NULL or unsupported. */
const SEX_UNKNOWN = '9';

/** The fixed value sent to denshiban when `profession = 999` (other) (spec §2 / QnA 7). */
const OTHERS_PROFESSION_VALUE = '会社員';
/** The fixed value sent to denshiban when `products` contains 999 (spec §2 / QnA 8). */
const OTHERS_PRODUCTS_VALUE = 'その他の農畜産物';

/**
 * The profession group — fields bound to each other by conditions (§B condition
 * table). Used so that an update diff sends "all of them if any one changed" =
 * always a mutually consistent set.
 */
const PROFESSION_GROUP = [
  'profession',
  'others_profession',
  'products',
  'others_products',
] as const;

/** Remarks go one line each into remarks1..4; line 5 onward is grouped into remarks5 (§B). */
const REMARKS_SLOTS = 5;
/** Max length of each remarks field (spec: 255 characters). */
const REMARKS_MAX = 255;

// ─── Unit conversions (each tested independently) ──────────────────────────

/**
 * 本紙購読フラグ → `subscribe_flg` (whether the paper edition is subscribed).
 *
 * Reads `t_dokusya.honshi_kodoku_flg` — the column the INBOUND sync fills from
 * this very same `users.subscribe_flg` — so the value round-trips unchanged.
 *
 * ⚠️ Do NOT derive this from `dokusya_shubetsu` again (the previous
 * implementation returned `'1'` only for 併読(3)). The outbound gate
 * ({@link @/common/utils/denshiban-sync-gate}) only lets 電子版(2) through, so
 * that version emitted a hard-coded `'0'` on every request — wiping the flag in
 * denshiban the first time an operator edited the subscriber in the cloud.
 * 顧客決定 2026-07: `honshi_kodoku_flg` is the single source for this field.
 */
export function toSubscribeFlg(
  honshiKodokuFlg: boolean | null | undefined,
): string {
  return honshiKodokuFlg === true ? '1' : '0';
}

/**
 * Gender → `sex`. **The codes are inverted between cloud and denshiban**
 * (cloud female=2 / denshiban female=0). The conversion is confined to
 * {@link SEX_BY_GENDER}; unset and unsupported values become {@link SEX_UNKNOWN}.
 */
export function toSex(gender: number | null | undefined): string {
  if (gender === null || gender === undefined) return SEX_UNKNOWN;
  return SEX_BY_GENDER[gender] ?? SEX_UNKNOWN;
}

/** Contact 1 → `tel`. Digits only, hyphens stripped. */
export function toTel(renrakusaki1: string): string {
  return (renrakusaki1 ?? '').replace(/-/g, '');
}

/**
 * Remarks → `remarks1`..`remarks5`. Lines 1-4 go to their own slot; **line 5 onward
 * is grouped into remarks5, newlines included** (so no line is lost). Each slot is
 * truncated at 255 characters. Empty lines / empty strings are dropped key and all.
 */
export function toRemarks(biko: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!biko) return out;

  const lines = biko.split('\n');
  const head = lines.slice(0, REMARKS_SLOTS - 1);
  const tail = lines.slice(REMARKS_SLOTS - 1).join('\n');

  head.forEach((line, i) => {
    if (line !== '') out[`remarks${i + 1}`] = line.slice(0, REMARKS_MAX);
  });
  if (tail !== '') out[`remarks${REMARKS_SLOTS}`] = tail.slice(0, REMARKS_MAX);
  return out;
}

/**
 * Subscriber-attribute CSV → `profession` (+ `others_profession` when "other").
 *
 * ⚠️ **Cardinality mismatch** (matrix §D-1): cloud allows multiple selections,
 * denshiban takes a single value. If two or more are selected, **throw** — sending
 * only the first would silently discard the rest. The UI is expected to let
 * denshiban subscribers pick exactly one (§D option (a)).
 */
export function toProfession(dokusyasoBunrui: string): Record<string, string> {
  const labels = splitCsv(dokusyasoBunrui);

  if (labels.length === 0) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      '読者属性が未選択です。電子版の profession は必須のため同期できません。',
    );
  }
  if (labels.length > 1) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      `読者属性が複数選択されています（${labels.join('・')}）。電子版の profession は単一値のみ受け付けます。`,
    );
  }

  const label = labels[0];
  const code = PROFESSION_BY_LABEL[label];
  if (code === undefined) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      `読者属性「${label}」は電子版の profession に対応しません。`,
    );
  }

  const out: Record<string, string> = { profession: code };
  if (code === '999') out.others_profession = OTHERS_PROFESSION_VALUE;
  return out;
}

/**
 * Main-products CSV → `products` (+ `others_products` when "other").
 *
 * `products` **accepts multiple values** on denshiban too (comma-separated) — unlike
 * profession, there is no cardinality problem. It cannot be sent unless
 * `profession = 0` (farmer), which the caller decides (this function only converts).
 */
export function toProducts(nogyosyaBunrui: string): Record<string, string> {
  const labels = splitCsv(nogyosyaBunrui);
  if (labels.length === 0) return {};

  const codes = labels.map((label) => {
    const code = PRODUCTS_BY_LABEL[label];
    if (code === undefined) {
      throw new DenshibanMappingError(
        'nogyosya_bunrui',
        `主な生産物「${label}」は電子版の products に対応しません。`,
      );
    }
    return code;
  });

  const out: Record<string, string> = { products: codes.join(',') };
  if (codes.includes('999')) out.others_products = OTHERS_PRODUCTS_VALUE;
  return out;
}

/** Splits a CSV into an array, trimming and dropping empty elements. */
function splitCsv(csv: string): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

// ─── Profile (shared by create / update) ───────────────────────────────────

/**
 * Assembles every profile field from one subscriber (with the key-dropping rule
 * already applied). create uses it as-is; update diffs it against before first.
 *
 * `opts.lenient` — used ONLY for the update diff's **before** snapshot. The before
 * row is compared against, never sent, so a value the old record can't express
 * (profession unselected / multi-selected / unknown label) must NOT abort the
 * update: the *after* value is what we're sending. In lenient mode a
 * {@link DenshibanMappingError} from the profession/products conversion is
 * swallowed and the group is simply left out of the before-fields — so the
 * (valid) after value shows up as "changed" and is sent. The after build stays
 * strict, so genuinely invalid NEW data still throws.
 */
function buildProfileFields(
  d: Dokusya,
  opts: { lenient?: boolean } = {},
): Record<string, string> {
  const out: Record<string, string> = {};

  // Required — sent even when empty so assertPayload can reject them (never
  // dropped silently).
  out.first_name = d.shimeiSei ?? '';
  out.last_name = d.shimeiMei ?? '';
  // Kana is not converted (passed through exactly as the spec says).
  out.first_kana = d.shimeiKanaSei ?? '';
  out.last_kana = d.shimeiKanaMei ?? '';
  out.zip = d.yubinNo ?? '';
  // The prefecture code is sent as '01' verbatim (no zero-stripping) — the value
  // survives a round trip unchanged.
  out.pref_id = d.todofukenCode ?? '';
  // The names are twisted: addr ← municipality / city ← street address.
  out.addr = d.shikuchoson ?? '';
  out.city = d.chomeBanchi ?? '';
  out.tel = toTel(d.renrakusaki1);
  out.email = d.email ?? '';
  out.subscribe_flg = toSubscribeFlg(d.honshiKodokuFlg);
  out.melmaga = String(d.mailMagazineFlg ?? 0);

  // Optional — empties are dropped key and all.
  put(out, 'building', d.tatemonoMei);
  put(out, 'birthyear', d.birthYear === null ? '' : String(d.birthYear ?? ''));
  put(out, 'sex', toSex(d.gender));
  Object.assign(out, toRemarks(d.biko ?? ''));

  // `branch` has no source on the cloud side (a denshiban subscriber's shiten_id is
  // NULL). It's an optional field, so it isn't sent (matrix §D-2 / awaiting QnA 9).
  // `profession_and_ja` / `profession_and_agri` have no corresponding cloud column
  // either, so they aren't sent (§D-3 / awaiting QnA 10).

  try {
    const profession = toProfession(d.dokusyasoBunrui ?? '');
    Object.assign(out, profession);

    // products can only be sent when profession = 0 (farmer) (§B condition table).
    if (profession.profession === '0') {
      Object.assign(out, toProducts(d.nogyosyaBunrui ?? ''));
    }
  } catch (err) {
    // Lenient before-diff only: an unmappable old value doesn't block a valid
    // new one. Leave the profession group out → after's value diffs as changed.
    // Any non-mapping error, or the strict (after / create) path, still throws.
    if (!opts.lenient || !(err instanceof DenshibanMappingError)) throw err;
  }

  return out;
}

/** null / undefined / '' are dropped key and all (§C-2). */
function put(
  target: Record<string, string>,
  key: string,
  value: string | null | undefined,
): void {
  if (value === null || value === undefined || value === '') return;
  target[key] = value;
}

// ─── Per-mode builders ─────────────────────────────────────────────────────

/**
 * create — the whole profile + `payment_start`. `id` / `jacd` / `notify_flg` do
 * **not** exist here.
 *
 * @throws {DenshibanMappingError} for values denshiban cannot express, such as a
 *   subscriber attribute that is unselected or multi-selected. Also thrown when
 *   `ctx.paymentStart` is missing.
 */
export function buildCreatePayload(d: Dokusya, ctx: BuildCtx): DenshibanPayload {
  return {
    action_kbn: 'create',
    jacd_execute: ctx.jacdExecute,
    ...buildProfileFields(d),
    payment_start: requirePaymentStart(ctx, 'create'),
  };
}

/**
 * update / reread — **only the changed fields** + the required ones
 * (`action_kbn` / `jacd_execute` / `id` / `notify_flg`). The update modes have no
 * `payment_start`.
 *
 * The diff is taken over the **assembled denshiban fields**, not over cloud columns.
 * Some cloud columns expand into several fields (remarks does), so a column-level
 * diff wouldn't line up.
 *
 * ⚠️ Known limitation: a change that **clears** an optional field (e.g. deleting the
 * building name) cannot be sent, because of §C-2 ('' is dropped key and all).
 * Whether denshiban interprets '' as "delete the value" is unconfirmed, so we follow
 * the matrix rule and don't send it. Awaiting QnA.
 */
export function buildUpdatePayload(
  before: Dokusya,
  after: Dokusya,
  ctx: BuildCtx,
  mode: 'update' | 'reread',
): DenshibanPayload {
  // before is diff-only → lenient (an unmappable old profession must not block a
  // valid new one). after stays strict so invalid new data still throws.
  const beforeFields = buildProfileFields(before, { lenient: true });
  const afterFields = buildProfileFields(after);

  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(afterFields)) {
    if (beforeFields[key] !== value) changed[key] = value;
  }

  // The profession group is sent **together**. `products` can only be sent when
  // `profession=0` (§B condition table), so if only the products changed and
  // profession drops out of the diff, the payload becomes "products without
  // profession" = a condition violation.
  if (PROFESSION_GROUP.some((key) => key in changed)) {
    for (const key of PROFESSION_GROUP) {
      if (afterFields[key] !== undefined) changed[key] = afterFields[key];
    }
  }

  const payload: DenshibanPayload = {
    action_kbn: mode,
    jacd_execute: ctx.jacdExecute,
    id: requireKaiinId(after),
    notify_flg: ctx.notifyFlg ?? '0',
    ...changed,
  };
  // Owning JA (the record side) — used when transferring between JAs. Optional field.
  put(payload, 'jacd', ctx.jacd);
  return payload;
}

/**
 * cancel / approve / unapprove — "instruction" modes that carry no profile.
 * The settled signatures are matrix §A-2 (every field required):
 *
 * | mode      | fields                                                        |
 * |-----------|---------------------------------------------------------------|
 * | cancel    | action_kbn, jacd_execute, id, cancel_ym, notify_flg            |
 * | approve   | action_kbn, jacd_execute, id, payment_start                    |
 * | unapprove | action_kbn, jacd_execute, id, payment_start                    |
 *
 * The 3 modes have **different field sets** (cancel has no payment_start;
 * approve / unapprove have no notify_flg), so we branch on mode and return each
 * whole. `unapprove` needing payment_start too is the API's own spec (odd from a
 * business standpoint, but omitting it yields `V**`).
 */
export function buildCommandPayload(
  d: Dokusya,
  ctx: BuildCtx,
  mode: DenshibanCommandMode,
): DenshibanPayload {
  const base = {
    action_kbn: mode,
    jacd_execute: ctx.jacdExecute,
    id: requireKaiinId(d),
  };

  if (mode === 'cancel') {
    if (!ctx.cancelYm) {
      throw new DenshibanMappingError(
        'cancel_ym',
        '解約月 (cancel_ym) が指定されていません。cancel モードでは必須です。',
      );
    }
    return { ...base, cancel_ym: ctx.cancelYm, notify_flg: ctx.notifyFlg ?? '0' };
  }

  // approve / unapprove — both require payment_start.
  return { ...base, payment_start: requirePaymentStart(ctx, mode) };
}

/**
 * Returns `ctx.paymentStart`, throwing when it's missing.
 *
 * The absolute-month → two-value conversion depends on the clock, so the builder
 * doesn't do it (the caller uses `toPaymentStart()`). This is just the guard that
 * keeps a forgotten hand-off from being dropped silently.
 */
function requirePaymentStart(ctx: BuildCtx, mode: DenshibanMode): '0' | '1' {
  if (ctx.paymentStart === undefined) {
    throw new DenshibanMappingError(
      'dokusya_kaishi_date',
      `payment_start が未指定です。${mode} モードでは必須です（toPaymentStart() で解決して BuildCtx に渡してください）。`,
    );
  }
  return ctx.paymentStart;
}

/** Returns the denshiban member id as a string. Throws when unsynced (NULL). */
function requireKaiinId(d: Dokusya): string {
  if (d.denshiKaiinId === null || d.denshiKaiinId === undefined) {
    throw new DenshibanMappingError(
      'denshi_kaiin_id',
      '電子版会員IDが未設定です（未同期）。先に create で会員IDを採番してください。',
    );
  }
  return String(d.denshiKaiinId);
}
