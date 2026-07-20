# Denshiban OUTBOUND Sync — Porting Guide (for an AI agent)

> **Goal**: install the "cloud → denshiban" outbound subscriber sync into a target
> repo that is structurally identical to the source repo but does **not** yet
> contain the outbound send logic.
>
> **Audience**: an autonomous coding agent. Every step is explicit. Do not
> improvise field mappings or call-site placement — the mappings live in the
> copied files, and the five call sites are enumerated in §5. After each phase,
> run the stated verification and do not proceed if it fails.
>
> This is the outbound counterpart of [`../inbound/PORTING.md`](../inbound/PORTING.md).
> The two directions are independent; port them separately.

---

## 0. What this feature does (intent)

Whenever a **digital-only (電子版, `DOKUSYA_SHUBETSU`=2) subscriber** is created,
edited, cancelled, approved or rejected in the cloud, the change is pushed to the
denshiban `updateUserInfo` common API **synchronously, inside the same DB
transaction, before COMMIT**. If denshiban rejects it, the exception propagates and
the whole cloud transaction rolls back — data denshiban refuses never lands in cloud
either (customer requirement, 2026-07).

```
DokusyaService.<method>  (inside dataSource.transaction, BEFORE commit)
  │ denshibanApi.sendNow({ dokusya, mode, before?, cancelYm? }, manager)
  ▼
DenshibanApiService.sendNow
  │ ① GATE      isDenshibanSubscriber() — only DIGITAL(2); BOTH(3)/PAPER(1) → return null
  │ ② ASSEMBLE  DenshibanPayloadAssembler.assemble() — resolve jacd_execute (reads
  │             m_kanri_shiten on the caller's `manager`) + payment_start (clock) + validate
  │ ③ SEND      encrypt (AES-256-GCM) + POST updateUserInfo
  ▼
denshiban response (HTTP is ALWAYS 200 — the verdict is body.statusCode)
  │ statusCode '0'  → success; on `create`, response.id → t_dokusya.denshi_kaiin_id
  │ statusCode !='0'→ throw DenshibanApiException → caller's tx ROLLS BACK
```

⚠️ **Dual write, not a distributed transaction.** If COMMIT fails *after* denshiban
returned success (and `create` is not idempotent), denshiban has a member cloud does
not — reconcile by hand. This is an accepted trade-off, not a bug to "fix" during porting.

Scheduling does not apply to outbound — it is triggered inline by user actions, not by
a batch. (The 10-minute cadence belongs to the **inbound** side only.)

---

## 1. Assumptions about the target repo

The target is "identical minus the outbound send logic". Two scenarios:

- **Scenario A** — target already has the denshiban INBOUND integration
  (`modules/denshiban/` with `denshiban-db.service.ts`, `denshiban-db.module.ts`,
  `mapper/denshiban-payload.builder.ts` exporting `DenshibanMode` +
  `DenshibanMappingError`, config group `denshiban.*`).
  → Copy only the NEW outbound files (§2), MERGE the module edit (§4), and wire the
  five caller sites (§5).
- **Scenario B** — target has NO denshiban code at all.
  → Copy the **entire** `modules/denshiban/` folder first, then do §3–§8.

Confirm with the greps in **§6 Prerequisites** BEFORE copying.

---

## 2. Files to copy verbatim (production)

From the source repo, copy these into the same paths in the target:

```
apps/backend/src/modules/denshiban/denshiban-api.service.ts            # sendNow + send (transport)
apps/backend/src/modules/denshiban/outbound/denshiban-payload.assembler.ts # resolve jacd_execute + payment_start
apps/backend/src/modules/denshiban/outbound/denshiban-api.exception.ts # DenshibanApiException (statusCode != '0')
apps/backend/src/modules/denshiban/mapper/denshiban-payload.builder.ts # cloud → API payload + DenshibanMode + DenshibanMappingError
apps/backend/src/modules/denshiban/mapper/denshiban-payload.validator.ts # assertPayload (required-by-mode + field rules)
apps/backend/src/modules/denshiban/mapper/denshiban-payment-start.ts   # toPaymentStart (the ONE clock-dependent conversion)
apps/backend/src/modules/denshiban/outbound/PORTING.md                 # this file
```

Shared with inbound (present already if the inbound port ran): `denshiban-db.service.ts`,
`denshiban-db.module.ts`. `denshiban-payload.builder.ts` is the shared home of
`DenshibanMappingError` — the inbound side imports it too.

Recommended (tests — copy too, keep the safety net):

```
apps/backend/src/modules/denshiban/denshiban-api.service.spec.ts
apps/backend/src/modules/denshiban/mapper/denshiban-payload.builder.spec.ts
```

---

## 3. Schema — NO new migration, but verify one column exists

Outbound needs **no schema change**. It only *reads* `m_kanri_shiten` and, on `create`,
*writes* the denshiban-issued member id back into an existing column. Verify:

- `t_dokusya.denshi_kaiin_id` exists, is `bigint` **nullable** (PAPER/BOTH rows never
  get one), and carries the partial-unique index
  `UQ_t_dokusya_denshi_kaiin_id` (`WHERE denshi_kaiin_id IS NOT NULL AND deleted_at IS NULL`).
  See `dokusya.entity.ts`.

```bash
grep -n "denshi_kaiin_id\|denshiKaiinId" apps/backend/src/database/entities/dokusya.entity.ts
#   expect: @Column nullable: true  +  @Index UQ_t_dokusya_denshi_kaiin_id
```

If the column is missing in the target, add it + a migration before wiring §5 — the
`create` path stamps it.

---

## 4. Module wiring (inside `denshiban/`)

Edit `apps/backend/src/modules/denshiban/denshiban-db.module.ts`
(if copying the whole folder in Scenario B, it is already done — just verify):

- `imports`: `TypeOrmModule.forFeature([… KanriShiten …])` — the assembler reads
  `m_kanri_shiten`. (Inbound also needs `Dokusya`, `Hanbaiten`; keep whatever is there.)
- `providers`: add `DenshibanApiService`, `DenshibanPayloadAssembler`.
- `exports`: add `DenshibanApiService`.

The module is `@Global()`, so `DokusyaService` can inject `DenshibanApiService` without
importing the module.

> **Why `DenshibanPayloadAssembler` is `@Optional()` in `DenshibanApiService`**: transport-only
> unit specs construct the service without the assembler. In production DI the global
> module always provides it. If `sendNow` runs and the assembler is missing, it **throws**
> (never silently no-ops) so an unwired send can't masquerade as a successful one.

---

## 5. Wire the five caller sites in `DokusyaService` (THE CORE)

This is the step a one-line instruction gets wrong. There are **five** `sendNow` calls,
each inside its method's `dataSource.transaction`, placed **before COMMIT and before the
`auditLog.logUpdate/logCreate`** call. Inject once:

```ts
// dokusya.service.ts constructor
private readonly denshibanApi: DenshibanApiService,
```

| # | Event | Host method | `sendNow` args | Extra step |
|---|---|---|---|---|
| 1 | Create | `create()` | `{ dokusya: result.after, mode: 'create' }` | Capture id — see 5.1 |
| 2 | Re-subscribe | `update()` (resubscribe branch) | `{ dokusya: result.after, mode: 'update', before }` | uses `'update'`, **not** `'reread'` |
| 3 | Info change | `update()` (normal branch) | `{ dokusya: result.after, mode: 'update', before }` | `before` = applied-before snapshot |
| 4 | Cancel (解約) | `stop()` | `{ dokusya: result.after, mode: 'cancel', cancelYm }` | `cancelYm` — see 5.2 |
| 5 | Approve / Reject | `changeApprovalStatus()` (shared by `approve()` + `reject()`) | `{ dokusya: after, mode: options.denshibanMode }` | mode from the options — see 5.3 |

Every call passes the transaction `manager` as the 2nd arg:
`await this.denshibanApi.sendNow({ … }, manager)`.

### 5.1 Create — capture the denshiban member id

`sendNow` returns denshiban's response; on `create` its `id` is the member number.
Persist it onto the master in the **same transaction**, then it becomes the 1:1 link
inbound matches on:

```ts
const dsResult = await this.denshibanApi.sendNow(
  { dokusya: result.after, mode: 'create' },
  manager,
);
if (dsResult?.id) {
  const denshiKaiinId = Number(dsResult.id);
  result.after.denshiKaiinId = denshiKaiinId;
  await manager.update(Dokusya, { dokusyaId: result.dokusyaId }, { denshiKaiinId });
}
```

`dsResult` is `null` when the subscriber is not DIGITAL(2) (the gate) — the `if` skips
cleanly. Do NOT throw on a null result.

### 5.2 Cancel — derive `cancelYm` (`YYYYMM`) from the stop date

`cancel_ym` is the `YYYYMM` of the subscription-stop date (`chushi`, a `YYYY-MM-DD`
string):

```ts
await this.denshibanApi.sendNow(
  { dokusya: result.after, mode: 'cancel', cancelYm: chushi.slice(0, 4) + chushi.slice(5, 7) },
  manager,
);
```

Paper-only(1) cancellations are irrelevant to denshiban — the gate returns `null`.

### 5.3 Approve / Reject — one shared method, mode from options

`approve()` and `reject()` are thin public wrappers that both call the private
`changeApprovalStatus(id, session, req, options)`; `options.denshibanMode` is
`'approve'` or `'unapprove'`. The single `sendNow` lives in the shared method:

```ts
await this.denshibanApi.sendNow(
  { dokusya: after, mode: options.denshibanMode },
  manager,
);
```

For `approve`/`unapprove` the assembler resolves `payment_start` against the clock
(billing start) — no `before`/`cancelYm` needed.

### Placement rules (all five)

- **Inside** the method's `dataSource.transaction(async (manager) => { … })`.
- **After** the business write produced `result.after` / `after`, **before** the
  `auditLog.log*` call and the transaction's implicit COMMIT.
- Pass `manager` so the assembler reads `m_kanri_shiten` on the *uncommitted* connection
  (a kanri-shiten created in the same tx is invisible to a separate connection).
- Let the exception propagate — the surrounding `try/catch` already logs an error row
  (`auditLog.logError`, OUTSIDE the tx) and rethrows.

---

## 6. Prerequisites — VERIFY before/after copying (run these greps)

```bash
cd apps/backend

# 6.1 The six modes + mapping error live in the shared builder.
grep -n "DenshibanMode\|class DenshibanMappingError" src/modules/denshiban/mapper/denshiban-payload.builder.ts
#   expect: 'create'|'update'|'reread'|'cancel'|'approve'|'unapprove'  +  DenshibanMappingError

# 6.2 Config group + the outbound keys.
grep -n "apiUrl\|commonKey\|apiPing" src/config/configuration.ts

# 6.3 Enum + entity the gate/assembler use.
grep -rn "DokusyaShubetsu" src/common/enums/index.ts
ls src/database/entities/{dokusya,kanri-shiten}.entity.ts

# 6.4 Datetime helpers used by payment-start.ts.
grep -n "dateOnlyIsoJst\|yearMonthJst" src/common/utils/datetime.ts

# 6.5 The caller exists and already runs in a transaction.
grep -n "dataSource.transaction" src/modules/dokusya/dokusya.service.ts   # non-empty
```

If any grep is empty, resolve it before continuing (usually: copy the missing file).

---

## 7. ⚠️ Environment variables — DO NOT EDIT `.env` YOURSELF

The outbound path needs the keys below. **An AI porting this MUST NOT write to `.env`,
`.env.example`, or any secret file** — only *read* them to check the keys are present,
and **print this list as a WARNING for a human to fill in** (secrets come from AWS
Secrets Manager / the ECS task definition, never a commit).

| Env var | Config key | Meaning | If unset |
|---|---|---|---|
| `DENSHIBAN_API_URL` | `denshiban.apiUrl` | `updateUserInfo` endpoint | `send()` throws `電子版APIのURL … が未設定` |
| `DENSHIBAN_DB_COMMON_KEY` | `denshiban.commonKey` | AES-256 shared key: 64-hex OR 32-byte utf8 | `send()` throws `共通鍵 … が未設定` |
| `DENSHIBAN_API_PING` | `denshiban.apiPing` | ⚠️ TEMP boot-time probe, default off | no-op (leave `false`) |

> **WARNING to the human operator** — add to `apps/backend/.env` (verification/local) and
> to the ECS task definition (prod, key from Secrets Manager):
> ```dotenv
> DENSHIBAN_API_URL=<updateUserInfo endpoint>
> DENSHIBAN_DB_COMMON_KEY=<shared AES key: 64-hex or 32-byte string>
> DENSHIBAN_API_PING=false
> ```
> A wrong/rotated `DENSHIBAN_DB_COMMON_KEY` makes denshiban fail to decrypt → the send
> throws and every DIGITAL create/update/cancel/approve rolls back. Keep it in sync with
> denshiban's side.

The AI's job is limited to: (1) confirm `configuration.ts` reads these keys (§6.2), and
(2) surface the warning above. It must not modify env files.

---

## 8. Verification (run in order; stop on failure)

```bash
cd apps/backend
npx tsc --noEmit -p tsconfig.json                          # 0 errors
npx jest src/modules/denshiban/denshiban-api.service.spec.ts        # transport + gate
npx jest src/modules/denshiban/mapper/denshiban-payload.builder.spec.ts  # field mapping / modes
npx jest src/modules/dokusya/dokusya.service.spec.ts       # the 5 call sites gate/send correctly
```

There is no `migration:run` / batch command for outbound — it fires inline on the
dokusya CRUD endpoints. To exercise end-to-end, hit
`POST /api/v1/dokusya` (create) / `PUT …` (update/stop/approve/reject) with a DIGITAL(2)
subscriber and watch the `denshiban.sync.sent` log + `denshi_kaiin_id` populated on create.

---

## 9. Behavior contract (do NOT change when porting)

- **Gate = DIGITAL(2) only.** BOTH(3) and PAPER(1) return `null` from `sendNow` and send
  nothing. (This is why the *inbound* diff holds some fields out of UPDATE.)
- **In-transaction, before COMMIT.** A denshiban error rolls the cloud tx back. Dual
  write, not distributed tx (§0).
- **HTTP is always 200** — the verdict is `body.statusCode`. `'0'` = success; anything
  else → `DenshibanApiException` carrying the denshiban code (`E05`/`V**`/`P**`…).
- **`timestamp` is stamped at send, not at build** (replay window 300 s → `E05`).
- **`payment_start` resolved at call time** (clock) for `create`/`approve`/`unapprove`
  — deciding it earlier shifts the billing start on a retry crossing a month boundary.
- **UPDATE sends only changed fields** + the always-required set; `before` is mandatory
  for `update`/`reread` (no snapshot → `DenshibanMappingError`, never a full-field send
  that could clobber a concurrent edit).
- **Gender is inverted** (cloud female=2 ↔ denshiban 0); **addr/city are twisted**
  (addr←municipality, city←street) — see the builder table in `../README.md §3.4`.
- **`kanri_shiten_code` is stored hyphenated** (`NNN-NNNN-NNN`); `jacd_execute` is 10
  digits — always strip non-digits. A non-10-digit result → `DenshibanMappingError`.
- **`create` response.id → `denshi_kaiin_id`** (the 1:1 link). Never overwrite an
  existing one.
- **Outbound never runs the batch; inbound never calls `sendNow`** — no echo loop.
- **`DenshibanMappingError` is thrown, never swallowed** — un-expressible values surface
  to operators.

---

## 10. Open decisions & caveats (carry these over)

- **`mode: 'reread'` is implemented but currently has no caller.** The assembler +
  builder fully handle it (identical to `update`), but the re-subscribe path in
  `DokusyaService.update()` sends `mode: 'update'`. Treat `reread` as reserved; do not
  invent a caller during porting.
- **Temporary diagnostics MUST be removed before go-live** (see `../README.md §8`):
  the two `console.log('[denshiban] plain/cipher', …)` in `send()` (log PII) and the
  whole `onApplicationBootstrap`/`ping` block gated by `DENSHIBAN_API_PING`.
- **Dual-write reconciliation** (§0) has no automatic repair — a COMMIT failure after a
  denshiban success is reconciled by hand. Keep the note; do not add a half-baked
  compensation.
- **Retryability**: `send()` distinguishes transient (network/timeout/non-JSON → plain
  `Error`, caller may retry) from business (`statusCode != '0'` → `DenshibanApiException`,
  do not retry blindly). Preserve that split.

---

## 11. Minimal porting checklist

```
[ ] §6 prerequisites grep — all non-empty
[ ] §2 copy outbound files (+ specs) ; Scenario B: copy whole modules/denshiban/
[ ] §3 verify t_dokusya.denshi_kaiin_id exists (bigint, nullable, partial-unique index)
[ ] §4 denshiban-db.module.ts: +KanriShiten forFeature, +DenshibanApiService/+Assembler providers, +export DenshibanApiService
[ ] §5 wire ALL FIVE sendNow calls in DokusyaService (create / update×2 / stop / changeApprovalStatus)
[ ]     5.1 create → capture dsResult.id → denshi_kaiin_id via manager.update
[ ]     5.2 stop   → cancelYm = chushi.slice(0,4)+chushi.slice(5,7)
[ ]     5.3 approve/reject → mode = options.denshibanMode
[ ] §7 ⚠️ DO NOT edit .env — print the env warning for a human (API_URL, COMMON_KEY, API_PING)
[ ] §8 tsc 0 ; jest denshiban + dokusya green
[ ] §9 behavior contract preserved (gate, in-tx, statusCode verdict, timestamp-at-send)
[ ] §10 reread has no caller ; temporary PII logs still gated OFF / removed for prod
```
