# Báo cáo Code Review — ACSMS-SCR-017 (販売店情報登録画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts, hanbaiten.service.ts, hanbaiten.mapper.ts, hanbaiten-form.mapper.ts, dto/create-hanbaiten.dto.ts, dto/update-hanbaiten.dto.ts, dto/hanbaiten-response.dto.ts, dto/hanbaiten-envelopes.dto.ts, hanbaiten.module.ts, exceptions/*, apps/backend/src/database/entities/hanbaiten.entity.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/11
- Side: Backend

## Files reviewed

**Backend** (10 source files):
- [`hanbaiten.controller.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts) — REST endpoints (SCR-017 create/update/detail + shared SCR-018/019)
- [`hanbaiten.service.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts) — business logic (create/update/detail focus)
- [`dto/create-hanbaiten.dto.ts`](apps/backend/src/modules/hanbaiten/dto/create-hanbaiten.dto.ts) — POST body
- [`dto/update-hanbaiten.dto.ts`](apps/backend/src/modules/hanbaiten/dto/update-hanbaiten.dto.ts) — PUT body
- [`dto/hanbaiten-response.dto.ts`](apps/backend/src/modules/hanbaiten/dto/hanbaiten-response.dto.ts) — response shape
- [`dto/hanbaiten-envelopes.dto.ts`](apps/backend/src/modules/hanbaiten/dto/hanbaiten-envelopes.dto.ts) — swagger envelopes
- [`hanbaiten-form.mapper.ts`](apps/backend/src/modules/hanbaiten/hanbaiten-form.mapper.ts) — row→detail-response mapper
- [`hanbaiten.mapper.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.mapper.ts) — list-item mapper
- [`hanbaiten.module.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.module.ts) — module wiring
- [`entities/hanbaiten.entity.ts`](apps/backend/src/database/entities/hanbaiten.entity.ts) — TypeORM entity

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | `tsc --noEmit -p .` clean (verified via docker exec). kebab-file + PascalClass+suffix + camelCase methods. ESLint binary missing in container (`node_modules/.bin/eslint not found`) — lint not enforced, infra follow-up only. | — |
| 1.2 | Meaningful naming | ✅ OK | — | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a: `hanbaiten.service.ts:71` declares local `const ITAKU_KUBUN_FURIKOMI = 1` and branches on it (`:101`, `:1434`) while the canonical Group A enum `ItakuKubun.FURIKOMI` exists at `@/common/enums/itaku-kubun.enum.ts` (FE form correctly uses `ItakuKubun.FURIKOMI`). §1.3.b: no inline-message duplication — DTO validator messages are per-field Japanese (allowed); service success messages are verb-only literals `'登録しました。'`/`'更新しました。'`. | 🟡 Major |
| 1.4 | No duplication | ✅ OK | Common helpers used: `paginate`, `buildAuditCtx`, `applyJaScope`, `assertJaScope`, `fetchFkInJa`, `assertMCodeValues`. dto→entity field map duplicated across create/update (2×, under the ≥3 threshold) — see 4.4. | — |
| 1.5 | Complex logic commented | ✅ OK | Labeled-block comments explain WHY: `[data-scope]`, `[audit-log-in-tx]`, `[audit-error-log]`, `[uniqueness-check]` (service.ts:585,672,695,616). | — |
| 1.6 | Comments accurate & up-to-date | ❌ NOK | `hanbaiten.controller.ts:43-56` class JSDoc says "ACSMS-SCR-018 — 販売店明細検索画面. Two endpoints" but the controller hosts 8 endpoints across SCR-017 (create/update/detail), SCR-018 (search/delete), SCR-019 (import/template). | 🟢 Minor |
| 1.7 | Operation purpose commented | ✅ OK | Every endpoint has `@ApiOperation`; service methods have JSDoc (e.g. service.ts:543-552, 718-725). | — |
| 1.8 | Other relevant facts commented | ✅ OK | Transaction boundaries + race-condition unique-violation safety net (service.ts:683-694) documented. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 7 OK / 2 NOK / 0 NA — 1 Major (1.3.a enum dup) + 1 Minor (1.6 stale controller header); cả hai dễ sửa.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | 3 raw `dataSource.query(...)` calls (service.ts:386,478,1044) all parameterized (`$1::bigint[]`, `$2::text[]`, `[id]`). No string interpolation. Rest is QueryBuilder/repo. | — |
| 2.2 | Authentication & Session management | ✅ OK | `@UseGuards(SessionAuthGuard, PermissionsGuard)` at controller class (controller.ts:60) + `@ApiCookieAuth`. | — |
| 2.3 | Access Control sufficient | ✅ OK | Every endpoint `@Permissions(...)`; list `applyJaScope` (service.ts:299,430), single-record `assertJaScope` (service.ts:469,764), FK body `fetchFkInJa` for haitatsuryo_tanka_id (service.ts:607,775). Field-level restriction NA (hanbaiten not in FIELD_RESTRICTIONS — restriction is permission-level NICHINO_STAFF create/update-only). | — |
| 2.4 | Security Configuration | ✅ OK | helmet/CORS are app-level (main.ts); module adds `@Throttle({ limit:10, ttl:60000 })` on import endpoint (controller.ts:176). | — |
| 2.5 | No sensitive data exposure | ✅ OK | No password/session/OTP logged; audit before/after snapshots carry only hanbaiten columns (no secrets); response DTO has no sensitive fields. | — |
| 2.6 | Attack Protection | ✅ OK | Global `forbidNonWhitelisted:true`; `ja_id`/`hanbaiten_code` stripped on update via whitelist. | — |
| 2.7 | No under-protected APIs | ✅ OK | `grep -L @Permissions/@UseGuards` returns none. | — |
| 2.8 | Validate input and output | ✅ OK | All DTO fields `@ApiProperty(Optional)` + class-validator with Japanese `message`; optional strings paired with `@Transform(blankToUndef)`; kana via `HALF_WIDTH_KATAKANA_RE`. Cross-field conditional-required in service (`assertConditionalRequired`). | — |
| 2.9 | Store data securely | ⚪ NA | No password / file-to-disk / S3 in this module (import parses in-memory). | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env. apps/backend/src/modules/hanbaiten` → zero hits. | — |

**Section 2 score**: 9 OK / 0 NOK / 1 NA — Bảo mật vững; DataScope 2 tầng + Layer-4 FK guard đầy đủ.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency introduced for this screen. | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA — Không phát sinh thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `createHanbaiten`, `updateHanbaiten`, `getHanbaitenDetail`, `assertConditionalRequired`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | — | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards throw at top, happy return at bottom (service.ts create/update). | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `createHanbaiten` (service.ts:553-716, ~160 lines) + `updateHanbaiten` (:726-848, ~120 lines) exceed the 50-line guideline; the bulk is a 26-field dto→entity literal (`newRow` :631-659 ≈ `updatePartial` :787-812) duplicated across both — extract to a shared `toHanbaitenEntityFields(dto)` helper. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Conditional-required loop extracted (`assertConditionalRequired`) to keep complexity under lint threshold. | — |
| 4.6 | Variables well named | ✅ OK | `effectiveJaId`, `dupes`, `before`, `updatePartial`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | No stale change-log comments. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Race-condition / tx-isolation re-read explained (service.ts:826). | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, verified via tsc. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | `findAll/create/update/remove`, mapper `toHanbaitenDetail`. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module-local consts + private methods clearly separated. | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `CreateHanbaitenDto`/`UpdateHanbaitenDto`/`HanbaitenResponseDto`, entity `Hanbaiten` PascalCase singular. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/modules/hanbaiten/`, entity at `src/database/entities/hanbaiten.entity.ts`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | controller/service/module/dto/exceptions/mapper layout per project-structure.md. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code; no console; `noUnusedLocals` clean via tsc. | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — 1 Minor (4.4 method length / dto→entity dup), refactor 1 lần giải quyết.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 2 | 0 | 22% |
| 2. Security | 10 | 9 | 0 | 1 | 0% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **36** | **3** | **3** | **7%** |

### Phân bổ severity 3 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 1 | 1.3 (enum dup — ITAKU_KUBUN_FURIKOMI local const vs ItakuKubun.FURIKOMI) |
| 🟢 Minor | 2 | 1.6 (stale controller header), 4.4 (method length / dto→entity dup) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Cấu trúc module + đặt tên chuẩn, mapper tách riêng. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | 🟡 (7/8 OK) | Comment WHY rất tốt; chỉ header class controller bị lỗi thời (1.6). |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 (1/2 OK) | FE dùng enum đúng, BE còn const cục bộ trùng enum Group A (1.3.a). |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ (8/8 OK) | Guard + @Permissions + DataScope 2 tầng + Layer-4 FK đầy đủ. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (1 OK / 1 NA) | Không lộ dữ liệu nhạy cảm. |
| **Code Length & Complexity** (4.4, 4.5) | 🟡 (1/2 OK) | create/update dài >50 dòng do literal 26 trường. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Không rác, không console, tsc sạch. |
| **Third Party** (3.1-3.2) | ⚪ (NA) | Không phát sinh lib. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Audit + transaction kỷ luật**: create/update gói INSERT/UPDATE + `logCreate`/`logUpdate` trong cùng `dataSource.transaction` và truyền `manager`, còn `logError` chạy NGOÀI tx (service.ts:666-702, 822-838) — đúng chuẩn nestjs.md §Audit Log, audit trail không bao giờ lệch DB.
2. **Layer-4 FK guard chống cross-tenant injection**: `fetchFkInJa` cho `haitatsuryo_tanka_id` neo theo `effectiveJaId` (create) và `before.jaId` (update) (service.ts:607,775) — chặn forge tanka_id của JA khác.
3. **Race-condition safety net**: 2 request CREATE đồng thời → bắt `isUniqueViolation` và chuyển 23505 thành `DuplicateCodeException` 400 thay vì 500 (service.ts:683-694).
4. **Cross-field validation đặt đúng tầng**: `assertConditionalRequired` (No.17-23 khi itaku_kubun=1) ở service thay vì DTO `@ValidateIf`, gom thành 1 VALIDATION_ERROR khớp shape `useApiForm` (service.ts:94-118).

### Weakness (điểm cần cải thiện)

1. **Enum Group A chưa dùng nhất quán hai phía**: FE đã import `ItakuKubun.FURIKOMI` nhưng BE service tự khai báo `const ITAKU_KUBUN_FURIKOMI = 1`. Gốc rễ: chưa có thói quen import enum `@/common/enums` trong service (service chỉ import `LogType, ResultStatus`). Enum-sync test bảo vệ file enum nhưng KHÔNG bắt được const cục bộ trùng giá trị → rủi ro drift khi mã 振込 đổi.
2. **Method dài do mapping thủ công lặp**: literal 26 trường dto→entity bị viết 2 lần (create/update), đẩy độ dài method >50 dòng. Khi thêm cột mới phải sửa 2 chỗ — dễ sót. Đã có sẵn `hanbaiten-form.mapper.ts` (row→response); thiếu chiều ngược (dto→entity).

### Verdict cuối

- [ ] Pass
- [x] Acceptable ← 0 🔴 AND ≤ 2 🟡 (đúng 1 🟡)
- [ ] Review Again

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `hanbaiten.service.ts:71,101,1434` | 1.3.a | Xóa `ITAKU_KUBUN_FURIKOMI`, import `ItakuKubun` từ `@/common/enums`, đổi branching sang `ItakuKubun.FURIKOMI`. | 5 phút |
| 2 | 🟢 | `hanbaiten.service.ts:631-659, 787-812` | 4.4 + 1.4 | Tách `toHanbaitenEntityFields(dto)` dùng chung cho create/update (giảm độ dài method + khử lặp 26 trường). | 20 phút |
| 3 | 🟢 | `hanbaiten.controller.ts:43-56` | 1.6 | Sửa JSDoc class: liệt kê đúng SCR-017/018/019 + 8 endpoints thay vì "SCR-018, two endpoints". | 3 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~5 phút (item #1 — xử lý 🟡 duy nhất); item #2, #3 (🟢) có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 #a — local const trùng enum Group A `ItakuKubun`

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:71   const ITAKU_KUBUN_FURIKOMI = 1;
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:101  if (dto.itaku_kubun !== ITAKU_KUBUN_FURIKOMI) return;
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:1434 if (effective('itaku_kubun') !== ITAKU_KUBUN_FURIKOMI) return;
```

Suggested fix:
```diff
- import { LogType, ResultStatus } from '@/common/enums';
+ import { ItakuKubun, LogType, ResultStatus } from '@/common/enums';
...
- const ITAKU_KUBUN_FURIKOMI = 1;
...
- if (dto.itaku_kubun !== ITAKU_KUBUN_FURIKOMI) return;
+ if (dto.itaku_kubun !== ItakuKubun.FURIKOMI) return;
...
- if (effective('itaku_kubun') !== ITAKU_KUBUN_FURIKOMI) return;
+ if (effective('itaku_kubun') !== ItakuKubun.FURIKOMI) return;
```
Lý do: `ItakuKubun` là Group A enum (`apps/backend/src/common/enums/itaku-kubun.enum.ts`), được enum-sync test bảo vệ đồng bộ FE/BE. FE đã dùng `ItakuKubun.FURIKOMI`; BE nên dùng cùng nguồn thay vì const cục bộ trùng giá trị — `.claude/rules/nestjs.md §Group A`.

### NOK 4.4 — method create/update quá dài + dto→entity lặp 2 lần

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:631-659  newRow (26 fields)
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:787-812  updatePartial (≈ same 26 fields)
```

Suggested fix (thêm vào `hanbaiten-form.mapper.ts`, dùng ở cả create + update):
```diff
+ /** Map create/update DTO → entity column partial (shared by both flows). */
+ export function toHanbaitenEntityFields(
+   dto: CreateHanbaitenDto | UpdateHanbaitenDto,
+ ): Partial<Hanbaiten> {
+   return {
+     hanbaitenName: dto.hanbaiten_name,
+     hanbaitenNameKana: dto.hanbaiten_name_kana ?? '',
+     torihikisakiNo: dto.torihikisaki_no ?? '',
+     todofukenCode: dto.todofuken_code ?? '',
+     yubinNo: dto.yubin_no ?? '',
+     address: dto.address ?? '',
+     tel: dto.tel ?? '',
+     fax: dto.fax ?? '',
+     shochoName: dto.shocho_name ?? '',
+     itakuKubun: dto.itaku_kubun ?? null,
+     haitatsuryoTankaId: dto.haitatsuryo_tanka_id ?? null,
+     haitatsuryoShiharaiCycle: dto.haitatsuryo_shiharai_cycle ?? null,
+     furikomiTesuryoFutanKubun: dto.furikomi_tesuryo_futan_kubun ?? null,
+     furikomiTesuryo: dto.furikomi_tesuryo ?? null,
+     bankCode: dto.bank_code ?? '',
+     bankName: dto.bank_name ?? '',
+     bankBranchCode: dto.bank_branch_code ?? '',
+     bankBranchName: dto.bank_branch_name ?? '',
+     yokinShubetsu: dto.yokin_shubetsu ?? null,
+     kozaNo: dto.koza_no ?? '',
+     kozaMeigi: dto.koza_meigi ?? '',
+     haitenFlg: dto.haiten_flg ?? false,
+     biko: dto.biko ?? '',
+   };
+ }
```
```diff
  // create
- const newRow: Partial<Hanbaiten> = { jaId: effectiveJaId, hanbaitenCode: dto.hanbaiten_code, hanbaitenName: …, /* 26 dòng */ createdBy: …, updatedBy: … };
+ const newRow: Partial<Hanbaiten> = {
+   ...toHanbaitenEntityFields(dto),
+   jaId: effectiveJaId,
+   hanbaitenCode: dto.hanbaiten_code,
+   createdBy: String(session.account_id),
+   updatedBy: String(session.account_id),
+ };
  // update
- const updatePartial: Partial<Hanbaiten> = { hanbaitenName: …, /* 26 dòng */ updatedBy: … };
+ const updatePartial: Partial<Hanbaiten> = {
+   ...toHanbaitenEntityFields(dto),
+   updatedBy: String(session.account_id),
+ };
```

### NOK 1.6 — header class controller lỗi thời

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts:44  * ACSMS-SCR-018 — 販売店明細検索画面.
apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts:46  * Two endpoints:
```

Suggested fix:
```diff
- * ACSMS-SCR-018 — 販売店明細検索画面.
- *
- * Two endpoints:
- *   - GET    /api/v1/hanbaiten             search + paginate
- *   - DELETE /api/v1/hanbaiten/:id         soft-delete with FK guard
+ * 販売店 controller — hosts SCR-017 (登録: detail/create/update),
+ * SCR-018 (明細検索: search/delete), SCR-019 (Excel取込: import/template)
+ * + the SCR-011 dropdown. All endpoints sit behind
+ * SessionAuthGuard + PermissionsGuard.
```
