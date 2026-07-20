# Denshiban INBOUND Sync — Porting Guide (for an AI agent)

> **Goal**: install the "denshiban → cloud" inbound subscriber sync into a target
> repo that is structurally identical to the source repo but does **not** yet
> contain the inbound sync logic.
>
> **Audience**: an autonomous coding agent. Every step is explicit. Do not
> improvise field mappings — they live in the copied files. After each phase,
> run the stated verification and do not proceed if it fails.

---

## 0. What this feature does (intent)

A single-shot batch reads the denshiban `users` view (MySQL) and upserts into the
cloud `t_dokusya` (PostgreSQL), preserving history. Data changes shape 4 times:

```
users (MySQL, denshiban field names, mixed types)
  │ FETCHER   — read WHERE collecting='1', DATE_FORMAT dates, coerce every value → string|null
  ▼
DenshibanInboundRow (all string|null, still denshiban names: JACd/zip1/sex/…)
  │ ASSEMBLER — resolve FKs (JACd→ja_id/kanri_shiten_id, ShopCd→hanbaiten_id, payment_id→shiharai_hoho)
  │ BUILDER   — pure value conversion (sex→gender inverted, paper_permission_dt→dokusya_shubetsu, codes→labels, …)
  ▼
DokusyaDraft (cloud t_dokusya shape, camelCase)
  │ DIFF      — classifyInbound(draft, existing t_dokusya matched by denshi_kaiin_id)
  ▼
CREATE | UPDATE{only changed denshiban-sourced cols} | SKIP
  │ WRITER    — applyChange (writes t_dokusya_rireki + recomputes master) + audit, per-row transaction
  ▼
t_dokusya (+ t_dokusya_rireki) in PostgreSQL
```

Scheduling ("every 10 minutes") is **NOT** in the source code. It is an external
EventBridge → ECS RunTask rule (Terraform repo) that runs `npm run dokusya:sync`.
Do not add `@nestjs/schedule`.

---

## 1. Assumptions about the target repo

The target is "identical minus the sync logic". Confirm with the greps in
**§6 Prerequisites** BEFORE copying. Two scenarios:

- **Scenario A** — target already has the denshiban OUTBOUND integration
  (`modules/denshiban/` with `denshiban-db.service.ts`, `mapper/denshiban-payload.builder.ts`
  exporting `DenshibanMappingError`, `denshiban-db.module.ts`, config group `denshiban.*`).
  → Copy only the NEW inbound files (§2) and MERGE the module edit (§4).
- **Scenario B** — target has NO denshiban code at all.
  → Copy the **entire** `modules/denshiban/` folder from the source, then do §3–§5.
  (The inbound files import `DenshibanMappingError` and `DenshibanDbService`, which
  live in that folder.)

---

## 2. Files to copy verbatim (production)

From the source repo, copy these into the same paths in the target:

```
apps/backend/src/modules/denshiban/mapper/denshiban-dokusya.builder.ts     # pure INBOUND mapper
apps/backend/src/modules/denshiban/inbound/denshiban-dokusya.assembler.ts  # FK resolution
apps/backend/src/modules/denshiban/inbound/denshiban-inbound.fetcher.ts    # reads users view
apps/backend/src/modules/denshiban/inbound/denshiban-inbound-diff.ts       # create/update/skip
apps/backend/src/modules/denshiban/inbound/denshiban-inbound-sync.service.ts # orchestrator + write
apps/backend/src/modules/denshiban/inbound/PORTING.md                      # this file
```

Recommended (tests — copy too, keep the safety net):

```
apps/backend/src/modules/denshiban/mapper/denshiban-dokusya.builder.spec.ts
apps/backend/src/modules/denshiban/inbound/denshiban-dokusya.assembler.spec.ts
apps/backend/src/modules/denshiban/inbound/denshiban-inbound.fetcher.spec.ts
apps/backend/src/modules/denshiban/inbound/denshiban-inbound-diff.spec.ts
apps/backend/src/modules/denshiban/inbound/denshiban-inbound-sync.service.spec.ts
```

Also copy the migration file (§3.3).

**Scenario B only**: additionally copy the rest of `modules/denshiban/`
(`denshiban-db.service.ts`, `mapper/denshiban-payload.builder.ts` + its deps).

---

## 3. Schema changes (MANDATORY — outside `denshiban/`)

The sync writes `tanka_id = NULL` and `hanbaiten_id = NULL` for digital-only
subscribers (単価 assigned later at approval; 販売店 = dummy created later). Both
columns are currently `NOT NULL` → the INSERT fails without this.

### 3.1 `apps/backend/src/database/entities/dokusya.entity.ts`

```ts
// BEFORE
@Column({ name: 'hanbaiten_id', type: 'bigint' })
hanbaitenId: number;

@Column({ name: 'tanka_id', type: 'bigint' })
tankaId: number;

// AFTER
@Column({ name: 'hanbaiten_id', type: 'bigint', nullable: true })
hanbaitenId: number | null;

@Column({ name: 'tanka_id', type: 'bigint', nullable: true })
tankaId: number | null;
```

### 3.2 `apps/backend/src/database/entities/dokusya-rireki.entity.ts`

Apply the **same** change to `hanbaitenId` and `tankaId` (the history table mirrors
`t_dokusya`; sync writes history snapshots).

### 3.3 Migration

Copy `apps/backend/src/database/migrations/1783700000000-AlterTDokusyaTankaHanbaitenNullable.ts`.
It runs `ALTER TABLE … ALTER COLUMN … DROP NOT NULL` on `tanka_id` + `hanbaiten_id`
for BOTH `t_dokusya` and `t_dokusya_rireki`.

⚠️ **Rename the timestamp prefix so it is strictly greater than the target repo's
newest migration** (run `ls apps/backend/src/database/migrations | sort | tail -1`
and pick a larger number). Keep the class name suffix matching the filename number.

Run it once (§8): `npm run migration:run`.

---

## 4. Module wiring (inside `denshiban/`)

Edit `apps/backend/src/modules/denshiban/denshiban-db.module.ts`
(if copying the whole folder in Scenario B, it is already done — just verify):

- `imports`: `TypeOrmModule.forFeature([Dokusya, KanriShiten, Hanbaiten])`
  (add `Hanbaiten` — import from `@/database/entities/hanbaiten.entity`).
- `providers`: add `DenshibanInboundFetcher`, `DenshibanDokusyaAssembler`,
  `DenshibanInboundSyncService`.
- `exports`: add `DenshibanInboundSyncService`.

The module is `@Global()`, so the batch runner can inject the sync service without
importing the module.

---

## 5. Batch trigger (MANDATORY — outside `denshiban/`)

The existing single-shot batch service delegates to the sync service. Edit
`apps/backend/src/modules/batch/dokusya-sync/dokusya-sync.service.ts` so `run()`
calls `syncAll()`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { DenshibanInboundSyncService } from '@/modules/denshiban/inbound/denshiban-inbound-sync.service';

@Injectable()
export class DokusyaSyncService {
  private readonly logger = new Logger(DokusyaSyncService.name);

  constructor(private readonly inboundSync: DenshibanInboundSyncService) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({ event: 'dokusya_sync.start' });
    try {
      const summary = await this.inboundSync.syncAll();
      this.logger.log({ event: 'dokusya_sync.summary', ...summary });
    } catch (err) {
      this.logger.error({ event: 'dokusya_sync.error', message: (err as Error).message });
      throw err;
    } finally {
      this.logger.log({ event: 'dokusya_sync.done', durationMs: Date.now() - startedAt });
    }
  }
}
```

Verify the invocation chain already exists (identical repo → it should):
`package.json` has `"dokusya:sync": "ts-node -r tsconfig-paths/register scripts/batch/dokusya-sync.ts"`,
`scripts/batch/dokusya-sync.ts` calls `runBatch('dokusya-sync', DokusyaSyncService)`,
and `AppModule` imports both `DokusyaSyncModule` and `DenshibanDbModule`.

---

## 6. Prerequisites — VERIFY before/after copying (run these greps)

All are `@Global` or already present in an identical repo, but the sync imports
them, so a missing one breaks the build.

```bash
cd apps/backend

# 6.1 CRITICAL — ApplyChangeSource MUST include 'BATCH'.
grep -n "ApplyChangeSource" src/modules/dokusya/dokusya-history.types.ts
#   expect: 'UI' | 'IMPORT' | 'REPLACE_HANBAITEN' | 'BATCH'
#   If 'BATCH' is missing, ADD it to the union.

# 6.2 applyChange + DokusyaFields exist with the expected signature.
grep -n "export async function applyChange" src/modules/dokusya/dokusya-history.writer.ts
grep -n "export type DokusyaFields"        src/modules/dokusya/dokusya-history.types.ts

# 6.3 DenshibanMappingError exists (Scenario A) — else copy the outbound mapper (Scenario B).
grep -rn "class DenshibanMappingError" src/modules/denshiban/mapper/denshiban-payload.builder.ts

# 6.4 DenshibanDbService.withConnection + config group.
grep -n "withConnection" src/modules/denshiban/denshiban-db.service.ts
grep -n "denshiban:"     src/config/configuration.ts

# 6.5 Global helpers the sync uses.
grep -n "class AuditLogService" src/modules/audit-log/audit-log.service.ts   # logCreate/logUpdate, @Global module
grep -n "class CodeService"     src/modules/code/code.service.ts             # has(category, value), @Global module
grep -n "todayIsoJst"           src/common/utils/datetime.ts

# 6.6 Enums used by the builder.
grep -rn "DokusyaShubetsu\|TetsuzukiShurui\|DenshiShoninStatus" src/common/enums/index.ts

# 6.7 Entities.
ls src/database/entities/{dokusya,dokusya-rireki,kanri-shiten,hanbaiten}.entity.ts
```

If any grep is empty, resolve it before continuing (usually: copy the missing file,
or add `'BATCH'` to the source union).

---

## 7. Optional — keep the dokusya READ API honest (recommended, not required for sync)

Without this, `t_dokusya` rows the sync created (null FKs) serialize as
`hanbaiten_id: 0` / `tanka_id: 0` instead of `null`. Sync works either way.

`apps/backend/src/modules/dokusya/dokusya.mapper.ts`:

```ts
// BEFORE
hanbaiten_id: coerceNumber(entity.hanbaitenId),
tanka_id: coerceNumber(entity.tankaId),
// AFTER (coerceNullableNumber returns null for null instead of 0; it already exists in this file)
hanbaiten_id: coerceNullableNumber(entity.hanbaitenId),
tanka_id: coerceNullableNumber(entity.tankaId),
```

`apps/backend/src/modules/dokusya/dto/dokusya-response.dto.ts`:

```ts
@ApiProperty({ nullable: true }) hanbaiten_id: number | null;
@ApiProperty({ nullable: true }) tanka_id: number | null;
```

---

## 8. Configuration & verification

### 8.1 Env (`.env` — set by a human / task definition; list, do not commit secrets)

```dotenv
DENSHIBAN_DB_ENABLED=true
DENSHIBAN_DB_HOST=<denshiban mysql host>     # docker network: denshiban-mysql ; host: localhost
DENSHIBAN_DB_PORT=3306                        # host-mapped mock: 3307
DENSHIBAN_DB_USERNAME=<read-only user>
DENSHIBAN_DB_PASSWORD=<password>
DENSHIBAN_DB_NAME=cmsDB
DENSHIBAN_DB_SSL=false                         # true in prod (RDS)
```

`denshiban.enabled=false` disables the whole integration (fetch throws → batch exits).

### 8.2 Verify (run in order; stop on failure)

```bash
cd apps/backend
npx tsc --noEmit -p tsconfig.json                         # 0 errors
npx jest src/modules/denshiban                            # inbound + existing denshiban suites green
npx jest src/modules/dokusya/dokusya.service.spec.ts      # nullable change didn't break dokusya
npm run migration:run                                     # apply the NOT NULL relaxation once
npm run dokusya:sync                                      # one manual run; watch dokusya_sync.summary log
```

`dokusya_sync.summary` logs `{ fetched, created, updated, skipped, failed }`.

---

## 9. Behavior contract (do NOT change when porting)

- **Match key**: existing `t_dokusya` is found by `denshi_kaiin_id == users.id`.
- **Per-row transaction**: each row is its own tx; a row failure is logged +
  counted (`failed`) and never aborts the batch. Fetch/connection failure DOES
  propagate (whole run fails → ECS task fails).
- **Write via `applyChange`** (reuse — do not reimplement rireki): it writes the
  history row + recomputes the master + computes 増減. `source: 'BATCH'`,
  `actor: 'DENSHIBAN_SYNC'`.
- **CREATE**: pass the full draft as `values` MINUS `denshiKaiinId` (master-only,
  not a history column) and `rirekiNo` (DB default). Stamp `denshi_kaiin_id` onto
  the master with a separate `manager.update`. Validate `shiharai_hoho` via
  `CodeService.has('SHIHARAI_HOHO', …)` (NOT NULL column).
- **UPDATE**: pass ONLY `decision.changes` (the changed denshiban-sourced columns)
  — NEVER the full draft, or excluded cloud-owned FKs (`tanka_id`, `ja_id`, …)
  would be clobbered. See `COMPARABLE_FIELDS` / `EXCLUDED_FIELDS_DOC` in
  `denshiban-inbound-diff.ts`.
- **NEVER call `sendNow`** from the inbound path — the data came FROM denshiban;
  echoing it back loops.

---

## 10. Open decisions & caveats (carry these over)

- **`shiharai_hoho` is CREATE-only, excluded from the UPDATE diff** (see
  `EXCLUDED_FIELDS_DOC`). Reason: an empty `payment_id` → null draft would clobber;
  and whether denshiban should override a cloud-side payment-method edit is a
  policy call. To enable on update: add `'shiharaiHoho'` to `COMPARABLE_FIELDS` and
  handle the null-draft case.
- **`hanbaiten_id` for 電子版単独 = NULL** until a real ダミー販売店 exists; then
  backfill. 併読 resolves it from `ShopCd`.
- **`tanka_id` = NULL on sync** always (連動時NULL); 単価 is set later at approval.
- **`JACd → kanri_shiten_code`** matches after stripping non-digits (cloud stores
  hyphenated `NNN-NNNN-NNN`, denshiban sends 10 digits). If the target seed data's
  `JACd` doesn't match a seeded `kanri_shiten_code`, those rows count as `failed`.
- **Migration timestamp** must be the newest in the target (§3.3).
- **Temporary PII debug logs** (if present in the denshiban module, e.g.
  `logSampleData` / `DENSHIBAN_DB_DEBUG_SAMPLE`) must stay OFF in production and be
  removed before go-live.
- **No in-process scheduler**: the 10-minute cadence is an infra concern
  (EventBridge → ECS RunTask `npm run dokusya:sync`) configured in the Terraform
  repo, not here.

---

## 11. Minimal porting checklist

```
[ ] §6 prerequisites grep — all non-empty (add 'BATCH' to ApplyChangeSource if missing)
[ ] §2 copy inbound files (+ specs) ; Scenario B: copy whole modules/denshiban/
[ ] §3 make tanka_id + hanbaiten_id nullable on dokusya + dokusya-rireki entities
[ ] §3.3 copy migration, bump timestamp to newest
[ ] §4 denshiban-db.module.ts: +Hanbaiten forFeature, +3 providers, +export sync service
[ ] §5 dokusya-sync.service.ts run() → inboundSync.syncAll()
[ ] §7 (optional) coerceNullableNumber + nullable response DTO
[ ] §8.1 set DENSHIBAN_DB_* env
[ ] §8.2 tsc 0 ; jest green ; migration:run ; npm run dokusya:sync
[ ] §10 scheduling configured in the infra/Terraform repo
```
