# `modules/denshiban` — Denshiban (電子版) Integration

> Complete reference + porting guide for the whole folder. Written for a developer
> or an AI agent re-implementing this integration in another repo.
>
> The integration is **bidirectional** and the two directions are independent:
>
> | Direction | Path | Trigger | Transport |
> |---|---|---|---|
> | **OUTBOUND** | cloud `t_dokusya` → denshiban `updateUserInfo` API | synchronous, inside the caller's DB transaction (`DokusyaService` create/update/…) | HTTPS POST, AES-256-GCM |
> | **INBOUND** | denshiban `users` view → cloud `t_dokusya` | single-shot batch (EventBridge → ECS RunTask, ~10 min) | MySQL read (short-lived conn) |
>
> Inbound porting has its own step-by-step at [`inbound/PORTING.md`](./inbound/PORTING.md);
> this README covers the whole module and the outbound side in full.

---

## 1. File map

```
modules/denshiban/
├── denshiban-db.module.ts            # @Global module: providers + TypeORM forFeature
├── denshiban-db.service.ts           # SHARED: short-lived MySQL connection (withConnection)
├── denshiban-api.service.ts          # OUTBOUND: sendNow (gate+assemble+send) + send (AES-GCM POST) + temp ping
│
├── mapper/                           # PURE transforms (no DI / no DB / no clock)
│   ├── denshiban-payload.builder.ts  #   OUTBOUND: cloud → API payload; also exports DenshibanMappingError
│   ├── denshiban-payload.validator.ts#   OUTBOUND: assertPayload (required-by-mode + field rules)
│   ├── denshiban-payment-start.ts    #   OUTBOUND: toPaymentStart (the ONE clock-dependent conversion)
│   └── denshiban-dokusya.builder.ts  #   INBOUND: users row → t_dokusya draft
│
├── outbound/
│   ├── denshiban-payload.assembler.ts#   OUTBOUND: resolve jacd_execute + payment_start, pick build* by mode
│   └── denshiban-api.exception.ts    #   OUTBOUND: DenshibanApiException (statusCode != '0')
│
└── inbound/
    ├── denshiban-inbound.fetcher.ts       # read users WHERE collecting='1', normalize
    ├── denshiban-dokusya.assembler.ts     # resolve FKs (JACd/ShopCd/payment_id) → ctx → draft
    ├── denshiban-inbound-diff.ts          # classifyInbound → create/update/skip
    ├── denshiban-inbound-sync.service.ts  # orchestrator: fetch → per-row tx → applyChange + audit
    └── PORTING.md                         # inbound port checklist
```

`DenshibanMappingError` (a value we cannot express across the boundary — never
swallowed) is defined in `mapper/denshiban-payload.builder.ts` and reused by both
directions.

---

## 2. Config & env

All under the `denshiban.*` group in `src/config/configuration.ts`.

| Config key | Env var | Used by | Notes |
|---|---|---|---|
| `denshiban.enabled` | `DENSHIBAN_DB_ENABLED` | inbound (DB) | `false` → no MySQL connection at all |
| `denshiban.host/port/username/password/database/ssl` | `DENSHIBAN_DB_HOST` … `DENSHIBAN_DB_SSL` | inbound (DB) | read-only MySQL (cmsDB). SSL true in prod (RDS) |
| `denshiban.apiUrl` | `DENSHIBAN_API_URL` | outbound | `updateUserInfo` endpoint |
| `denshiban.commonKey` | `DENSHIBAN_DB_COMMON_KEY` | outbound | AES-256 shared key: 64-hex OR 32-byte utf8 |
| `denshiban.apiPing` | `DENSHIBAN_API_PING` | outbound | ⚠️ TEMP diagnostic, default off |
| `denshiban.debugSample` | `DENSHIBAN_DB_DEBUG_SAMPLE` | inbound (DB) | ⚠️ TEMP diagnostic (logs PII), default off |

---

## 3. OUTBOUND — cloud → denshiban `updateUserInfo`

### 3.1 Flow

```
DokusyaService.create/update/cancel/approve/…  (inside dataSource.transaction, BEFORE commit)
   │ denshibanApi.sendNow({ dokusya, mode, before?, cancelYm?, notifyFlg? }, manager)
   ▼
DenshibanApiService.sendNow
   │  ① GATE: only DIGITAL(2) subscribers sync; BOTH(3)/PAPER(1) → return null
   │  ② assembler.assemble(...)  → DenshibanPayload  (reads m_kanri_shiten on `manager`)
   │  ③ send(payload) → encrypt + POST
   ▼
denshiban responds (HTTP always 200; result.statusCode)
   │  statusCode '0' → success (create returns `id` → stored in t_dokusya.denshi_kaiin_id)
   │  statusCode != '0' → throw DenshibanApiException → caller's tx ROLLS BACK
```

**Why in-transaction / before commit** (customer req 2026-07): data denshiban
rejects must not end up in cloud either. A denshiban error propagates and rolls the
whole transaction back. ⚠️ It is a **dual write, not a distributed transaction** —
if COMMIT fails *after* denshiban returned success, denshiban has a member cloud
does not; reconcile by hand.

### 3.2 `denshiban-api.service.ts`

- **`sendNow(input, manager?)`** — the ONLY method business logic calls. Gate →
  assemble → send. Returns `null` when out of scope, denshiban's result otherwise.
  Throws if unwired (assembler missing) so a silent no-op can't masquerade as a send.
- **`send(payload)`** — transport. Stamps `timestamp` (epoch sec) HERE (not at build
  time — a queued/retried payload older than 300 s returns `E05`). Encrypts, POSTs,
  parses. **HTTP status is not the verdict** — always 200; the body's `statusCode`
  is. Missing/`!= '0'` statusCode → throw.
- **Crypto**: AES-256-GCM. Packet = `IV(12B) + ciphertext + AuthTag(16B)`, Base64;
  body `{ "payload": "<base64>" }`. Key resolved from `commonKey`: 64-hex → hex
  decode; else a raw 32-byte utf8 string; anything else throws (key out of sync).
- **`onApplicationBootstrap` ping** — ⚠️ TEMP. Only when `DENSHIBAN_API_PING=true`.
  Sends an invalid probe (no real write) to confirm NAT-whitelist/TLS/key from ECS.
  Delete before go-live.
- **`isDenshibanSubscriber(shubetsu)`** — the gate: `=== DokusyaShubetsu.DIGITAL`.

### 3.3 `outbound/denshiban-payload.assembler.ts`

Resolves the two things the pure builder can't:
1. `jacd_execute` = the subscriber's `m_kanri_shiten.kanri_shiten_code`, normalized
   to 10 digits (hyphens stripped). Reads on the caller's `manager` (same tx). Non-10-digit → mapping error.
2. `payment_start` (create/approve/unapprove) via `toPaymentStart(dokusyaKaishiDate)`
   resolved **at call time** (clock).
Then picks `buildCreatePayload` / `buildUpdatePayload` / `buildCommandPayload` by
mode and runs `assertPayload`.

### 3.4 `mapper/denshiban-payload.builder.ts` — modes & field mapping

Six modes (`action_kbn`):

| mode | fields sent |
|---|---|
| `create` | full profile + `payment_start` (no id/jacd/notify_flg) |
| `update` / `reread` | **only changed** profile fields + required (`action_kbn`,`jacd_execute`,`id`,`notify_flg`); no payment_start |
| `cancel` | `action_kbn`,`jacd_execute`,`id`,`cancel_ym`,`notify_flg` |
| `approve` / `unapprove` | `action_kbn`,`jacd_execute`,`id`,`payment_start` |

Field conversions (cloud `t_dokusya` → denshiban):

| cloud | → denshiban | rule |
|---|---|---|
| `shimei_sei`/`shimei_mei` | `first_name`/`last_name` | required |
| `shimei_kana_*` | `first_kana`/`last_kana` | passthrough |
| `yubin_no` | `zip` | — |
| `todofuken_code` | `pref_id` | verbatim (`'01'`, no strip) |
| `shikuchoson` / `chome_banchi` | `addr` / `city` | **twisted** (addr←municipality, city←street) |
| `renrakusaki_1` | `tel` | digits only |
| `dokusya_shubetsu` | `subscribe_flg` | BOTH→'1', DIGITAL→'0' |
| `mail_magazine_flg` | `melmaga` | — |
| `tatemono_mei`/`birth_year` | `building`/`birthyear` | optional (empties dropped) |
| `gender` | `sex` | **INVERTED** (cloud female=2 ↔ denshiban 0); unknown→'9' |
| `biko` | `remarks1..5` | lines 1-4 each; line 5+ grouped in remarks5; each ≤255 |
| `dokusyaso_bunrui` | `profession` (+`others_profession`) | CSV→**single** (multi→throw); 999→`会社員` |
| `nogyosya_bunrui` | `products` (+`others_products`) | only when `profession=0`; multi OK; 999→`その他の農畜産物` |

Four shared principles: (1) every value is a String; (2) null/undefined/`''` are
**dropped key-and-all** (`''` risks meaning "clear"), so only required fields are
sent when empty; (3) UPDATE sends only changed fields (required always sent, and the
`profession` group is sent together to keep the condition consistent); (4) breaking
an inter-field condition → denshiban returns `V**`.

### 3.5 `mapper/denshiban-payload.validator.ts` & exceptions

- `assertPayload(payload)` — checks required-by-mode presence + per-field rules;
  throws `DenshibanMappingError` (field = the cloud column).
- `DenshibanApiException` (in `outbound/`) — `statusCode != '0'` business error;
  carries the denshiban code (`E05`/`V12`/`P03`…).

---

## 4. INBOUND — denshiban `users` → cloud `t_dokusya`

Full detail + step-by-step port in [`inbound/PORTING.md`](./inbound/PORTING.md). Summary:

```
users (MySQL) ─FETCHER→ DenshibanInboundRow ─ASSEMBLER+BUILDER→ DokusyaDraft ─DIFF→ create/update/skip ─WRITER→ t_dokusya(+rireki)
```

- **`denshiban-inbound.fetcher.ts`** — `SELECT … FROM users WHERE collecting='1'`,
  `DATE_FORMAT` the two date columns, coerce every value to `string|null`.
- **`inbound/denshiban-dokusya.assembler.ts`** — resolves `JACd → ja_id +
  kanri_shiten_id` (strip hyphens), `ShopCd → hanbaiten_id` (電子版単独 → null,
  併読 → lookup), `payment_id → shiharai_hoho` (same value set), then calls the
  builder.
- **`mapper/denshiban-dokusya.builder.ts`** — pure reverse of the outbound builder:
  `sex→gender` (inverted), `paper_permission_dt→dokusya_shubetsu`, `status→
  tetsuzuki_shurui`, `member_type/approval→…`, code→label, `remarks→biko`, etc.
- **`denshiban-inbound-diff.ts`** — `classifyInbound(draft, existing)`; compares
  ONLY denshiban-sourced columns (`COMPARABLE_FIELDS`); excludes cloud-owned ones
  (`tanka_id`, `ja_id`, `rireki_no`, …) so a sync never clobbers them.
- **`denshiban-inbound-sync.service.ts`** — `syncAll()`: per-row transaction;
  match by `denshi_kaiin_id`; write via `applyChange` (reuses the rireki writer:
  history row + master recompute + 増減) + audit; `source:'BATCH'`; NEVER `sendNow`
  (no echo).

### 4.1 Sync service — transaction model & system columns

**Transaction granularity = ONE transaction PER ROW.** `syncAll()` fetches every
`collecting='1'` row once, then loops calling `syncOne(row)`, each wrapped in its own
`dataSource.transaction(manager => …)`. There is **no batch-level transaction** — this
is deliberate:

- **Atomic per row** — the same `manager` carries the master write (`t_dokusya`), the
  history rows (`t_dokusya_rireki`, via `applyChange`), the `denshi_kaiin_id` stamp,
  AND the audit row (`t_log`, via `auditLog.logCreate/logUpdate(…, manager)`). If any
  step throws, the whole row rolls back — you never get a master without its
  history/audit (same rule as CRUD: main DML + audit share one tx).
- **Row isolation** — one bad row is caught, `failed++`, logged, and the loop
  continues; the other rows' transactions are untouched. This is why a run can end
  `created:16, failed:4` with the 16 good rows committed.
- **Failure path is OUTSIDE any transaction** — the `catch` in `syncAll` only writes a
  structured CloudWatch log (`event:'denshiban_inbound.row_failed'`, `denshiKaiinId`),
  **NOT a `t_log` DB row**: when assembly itself fails the target ja_id/id may be
  unknown, so there is nothing to attribute an audit row to.

**System columns — the sync service MUST stamp `created_by` / `updated_by`.** The pure
builder (`DokusyaDraft`) deliberately omits `created_*` / `updated_*` ("system columns
owned by the assembler / DB"). But those columns are **NOT NULL with no DB default**,
so `createDokusya` stamps them onto the values before `applyChange`, exactly like the
UI create stamps `session.account_id`:

```ts
const SYNC_ACTOR = 'DENSHIBAN_SYNC';
values: { ...draft, createdBy: SYNC_ACTOR, updatedBy: SYNC_ACTOR }  // → ensureMaster INSERT
```

Omit this and every inbound CREATE fails on a real DB with
`null value in column "created_by" of relation "t_dokusya" violates not-null constraint`
(the entity's `default:'SYSTEM'` is a TypeORM hint that was never emitted as a DB
default). `SYNC_ACTOR` also feeds `actor` on the history rows, so audit shows
`DENSHIBAN_SYNC` as the writer. (Inbound UPDATE currently stamps `updated_by` on the
history rows only, not the master — see §10.)

---

## 5. Shared invariants & gotchas (do NOT change)

- **HTTP is always 200** (outbound). The verdict is `statusCode` in the body.
- **`timestamp` stamped at send**, not at build (replay window 300 s → `E05`).
- **Gender is inverted** both ways (cloud female=2 ↔ denshiban 0).
- **Outbound gate = DIGITAL(2) only.** BOTH(3)/PAPER(1) are not pushed out. This is
  why the inbound diff holds some fields out of UPDATE (a cloud edit to a 併読 row
  doesn't reach denshiban).
- **`denshi_kaiin_id`** is the 1:1 link between the two systems. Outbound `create`
  returns it (→ stored on the master); inbound matches on it.
- **`DenshibanMappingError`** is thrown (never swallowed) for un-expressible values
  → recorded for operators.
- **Inbound never calls `sendNow`; outbound never runs the batch** — no echo loop.
- **`kanri_shiten_code`** is stored hyphenated (`NNN-NNNN-NNN`); denshiban `JACd` /
  `jacd_execute` are 10 digits — always strip non-digits when crossing.
- **Inbound write stamps `created_by`/`updated_by` = `'DENSHIBAN_SYNC'`** — the pure
  builder omits these system columns and the DB has no default, so the sync service
  must set them or the CREATE INSERT violates NOT NULL (see §4.1).

---

## 6. Data-model touchpoints (outside this folder)

- Entities `t_dokusya` + `t_dokusya_rireki`: `tanka_id` and `hanbaiten_id` are
  **nullable** (inbound creates digital subscribers without them). Migration:
  `…AlterTDokusyaTankaHanbaitenNullable`. See `inbound/PORTING.md §3`.
- `dokusya.mapper.ts` maps these via `coerceNullableNumber` (null stays null, not 0).
- `t_dokusya.created_by` / `updated_by` are **NOT NULL with no DB default** — the
  inbound sync service stamps them (`'DENSHIBAN_SYNC'`) since the pure builder omits
  them (§4.1).
- The write path reuses `@/modules/dokusya/dokusya-history.writer#applyChange`
  (requires `ApplyChangeSource` to include `'BATCH'`).
- Batch entry: `modules/batch/dokusya-sync/dokusya-sync.service.ts#run()` →
  `DenshibanInboundSyncService.syncAll()`; script `scripts/batch/dokusya-sync.ts`
  (`npm run dokusya:sync`).

---

## 7. Porting the WHOLE module

1. **Copy the entire `modules/denshiban/` folder** (both directions + specs).
2. **Verify prerequisites** (identical repo → mostly present):
   - `ApplyChangeSource` includes `'BATCH'` (inbound write) — `dokusya-history.types.ts`.
   - `@Global` `AuditLogService`, `CodeService`; `todayIsoJst`; enums
     `DokusyaShubetsu`/`TetsuzukiShurui`/`DenshiShoninStatus`; entities
     `Dokusya`/`DokusyaRireki`/`KanriShiten`/`Hanbaiten`.
   - Datetime helpers used by `payment-start.ts`: `dateOnlyIsoJst`, `yearMonthJst`.
3. **Register the module**: import `DenshibanDbModule` in `AppModule` (it is `@Global`,
   so `DenshibanApiService` / `DenshibanInboundSyncService` become injectable app-wide).
4. **Wire the outbound caller**: `DokusyaService` (create/update/cancel/approve)
   injects `DenshibanApiService` and calls `sendNow(...)` inside its transaction,
   capturing `result.id` into `denshi_kaiin_id` on create.
5. **Wire the inbound batch** + **schema nullable** + **env** — follow
   [`inbound/PORTING.md`](./inbound/PORTING.md) §3–§8.
6. **Config `denshiban.*`** in `configuration.ts` + env (§2).
7. **Verify**: `npx tsc --noEmit`; `npx jest src/modules/denshiban`;
   `npm run migration:run`; `npm run dokusya:sync`.
8. **Scheduling** (10-min inbound) is infra (EventBridge → ECS RunTask), configured
   in the Terraform repo — NOT in source code. Full recipe + image/env prerequisites
   + the overlap caveat: **§9**.

---

## 8. Temporary code to REMOVE before production

- `denshiban-api.service.ts`: the two `console.log('[denshiban] plain/cipher', …)`
  in `send()` (log PII) and the whole `onApplicationBootstrap`/`ping` block
  (`DENSHIBAN_API_PING`).
- `denshiban-db.service.ts`: `logSampleData` + the `DENSHIBAN_DB_DEBUG_SAMPLE` branch
  (logs PII rows).

These are interim diagnostics gated by default-off flags; they contradict
`security.md` "never log PII" and must not ship enabled.

---

## 9. Scheduling the inbound batch (10-min, production)

The inbound batch is **single-shot** — NOT an in-process cron. Production runs it every
10 minutes via **EventBridge Scheduler → ECS RunTask**, defined in the Terraform repo
(`agrinews-terraform`), never in source.

- **Trigger → command override**: the schedule launches the backend task definition
  with `containerOverrides.command = ["npm","run","dokusya:sync"]`. That script boots a
  Nest **application context** (no HTTP server), resolves `DokusyaSyncService`, runs
  `syncAll()` once, and exits `0` (success) / `1` (failure) so ECS/EventBridge can
  detect it. See `scripts/batch/dokusya-sync.ts` + `scripts/batch/run-batch.ts`.
- **Image requirement — already satisfied**: `npm run dokusya:sync` runs via `ts-node`
  against `src/`. `apps/docker/backend/Dockerfile.prod` already copies `scripts/` +
  `src/` + `tsconfig.json` and re-installs `ts-node`/`tsconfig-paths`/`typescript` (for
  the seed/migration one-off tasks), so the batch piggybacks — **no image change
  needed**. (`tsconfig.build.json` excludes `scripts/`, but that only affects `dist/`,
  which the batch does not use.)
- **Env prerequisites** on the task definition: `DENSHIBAN_DB_ENABLED=true` +
  `DENSHIBAN_DB_*` (password from Secrets Manager), plus network reach (private subnet +
  NAT / SG egress) to the denshiban MySQL. With `DENSHIBAN_DB_ENABLED=false` the batch
  throws `電子版DB is disabled` and exits 1.
- **Schedule**: `schedule_expression = "rate(10 minutes)"`,
  `schedule_expression_timezone = "Asia/Tokyo"`. The schedule/IAM/DLQ live in
  `agrinews-terraform` (`aws_scheduler_schedule` targeting ECS RunTask, an IAM role
  granting `ecs:RunTask` + `iam:PassRole`, and an SQS DLQ for launch failures).
- **⚠️ Overlap**: one run is estimated ~10 min; if a run exceeds 10 min the next fires
  while it is still running → two RunTasks reading the same `users` and writing
  `t_dokusya` concurrently. Mitigate with a Redis lease at the top of `run()`
  (`SET NX` + TTL 15 min → skip if held), or widen to `rate(15 minutes)` with a
  duration alarm. `retry_policy.maximum_retry_attempts = 0` (a partial-progress run is
  safer re-run on the next cycle than retried immediately).

**Local simulation** (dev): the same command inside the running backend container, on a
loop — `while true; do docker exec <backend> npm run dokusya:sync; sleep 600; done`.
Requires the denshiban MySQL reachable and its `users` seed to satisfy the mapping
(valid `payment_id` ∈ m_code `SHIHARAI_HOHO`, `JACd` matching an existing
`m_kanri_shiten`), else rows fail assembly and `created` stays 0.

---

## 10. Known limitations / TODO

- **Inbound UPDATE does not stamp the master `updated_by`** yet — only CREATE stamps
  `created_by`/`updated_by` (§4.1). When denshiban changes an already-synced row, the
  master's `updated_by` keeps its previous value instead of `'DENSHIBAN_SYNC'`. Mirror
  the UI update — a separate `manager.update(Dokusya, {dokusyaId}, {updatedBy: SYNC_ACTOR})`
  after `applyChange` — to close the gap.
- **`denshiban-inbound-sync.service.spec.ts` `johoDate` assertion is clock-dependent** —
  it hard-codes `'2026-07-19'` (the sync day = `todayIsoJst()`) with no frozen clock, so
  it fails on any other date. Fix with `jest.useFakeTimers().setSystemTime(...)`.
- **Digital-only rows carry `hanbaiten_id = null`** pending the ダミー販売店 the customer
  will create (decision 2026-07-19). Revisit once that master row exists.
- **Temporary diagnostics** (§8) must be removed before go-live.
