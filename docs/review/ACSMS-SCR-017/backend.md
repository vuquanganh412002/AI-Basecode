# Báo cáo Code Review — ACSMS-SCR-017 (販売店情報登録画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts, apps/backend/src/modules/hanbaiten/hanbaiten.service.ts, apps/backend/src/modules/hanbaiten/dto/create-hanbaiten.dto.ts, apps/backend/src/modules/hanbaiten/dto/update-hanbaiten.dto.ts, apps/backend/src/modules/hanbaiten/hanbaiten-form.mapper.ts, apps/backend/src/modules/hanbaiten/dto/hanbaiten-response.dto.ts, apps/backend/src/database/entities/hanbaiten.entity.ts
- Reviewer: quanh
- Approver:
- Review date: 2026/06/07
- Side: Backend

## Files reviewed

**Backend** (SCR-017 surface — Detail / Create / Update):
- [`hanbaiten.controller.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts#L185) — GET `:id` / POST `/` / PUT `:id` (017-001/002/003)
- [`hanbaiten.service.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L449) — `getHanbaitenDetail` / `createHanbaiten` / `updateHanbaiten` + `buildDetailQuery` + `assertConditionalRequired`
- [`dto/create-hanbaiten.dto.ts`](apps/backend/src/modules/hanbaiten/dto/create-hanbaiten.dto.ts) — POST body
- [`dto/update-hanbaiten.dto.ts`](apps/backend/src/modules/hanbaiten/dto/update-hanbaiten.dto.ts) — PUT body (omits `hanbaiten_code`)
- [`hanbaiten-form.mapper.ts`](apps/backend/src/modules/hanbaiten/hanbaiten-form.mapper.ts) — raw row → detail-response (nullable policy)
- [`hanbaiten.entity.ts`](apps/backend/src/database/entities/hanbaiten.entity.ts) — TypeORM entity (timestamptz audit columns)

> ⚠️ Tooling limitation: `agrinews-backend-1` container was **down** at review time → `tsc --noEmit` and `eslint` **not run**. All checks are static (grep + manual read). Re-run `docker exec agrinews-backend-1 npx tsc --noEmit -p .` before merge.
>
> Note: `hanbaiten.service.ts` is shared across SCR-017/018/019. This review evaluates ONLY the SCR-017 methods (`getHanbaitenDetail`, `createHanbaiten`, `updateHanbaiten`, `buildDetailQuery`, `assertConditionalRequired`) + their DTOs/mapper. SCR-018 (`findAll`/`remove`) and SCR-019 (`importExcel` and helpers) are out of scope.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | kebab-file + `HanbaitenService`/`HanbaitenController`/`CreateHanbaitenDto` PascalClass+suffix + camelCase methods; no `any` in 017 paths. tsc/lint not run — container down. | — |
| 1.2 | Meaningful naming | ✅ OK | Domain terms preserved (`hanbaiten`, `itaku_kubun`, `koza_meigi`); `ITAKU_KUBUN_FURIKOMI` named const; `effectiveJaId`/`before`/`updatePartial` descriptive. | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a: no magic number — branching uses const `ITAKU_KUBUN_FURIKOMI` ([:64,:94](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L94)) — good. §1.3.b: literal `入力値が不正です。詳細はerrorsフィールドを確認してください。` inlined 3× ([:114](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L114), :524, :941) — reusable message must live in a `hanbaiten.constants.ts`. | 🟡 Major |
| 1.4 | No duplication | ❌ NOK | (a) Full `VALIDATION_ERROR` HttpException block (~10 lines) repeated 3× (:110, :520, :936). (b) dto→entity 24-field mapping near-identical between `createHanbaiten` ([:564-592](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L564)) and `updateHanbaiten` ([:723-748](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L723)). Extract a `throwFieldValidationError(errors)` helper + a `mapDtoToHanbaitenFields(dto)` mapper. (Mandated common helpers paginate/buildAuditCtx/applyJaScope/fetchFkInJa/assertMCodeValues/DuplicateCodeException all correctly used.) | 🟡 Major |
| 1.5 | Complex logic commented | ✅ OK | `[data-scope]`, `[audit-log-in-tx]`, `[reread-after-write]`, race-condition unique-violation net all carry WHY comments. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments anchor to api.md §4.x / 画面設計書 v1.2 §3.1; `t_dokusya_rireki` deliberate-omission note is current + actionable. | — |
| 1.7 | Operation purpose commented | ✅ OK | Every endpoint has `@ApiOperation` + `@ApiResponse`; service methods have JSDoc. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Transaction boundary, audit-in-tx vs error-log-outside-tx, Layer-4 FK rationale all noted. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header block. | — |

**Section 1 score**: 7 OK / 2 NOK / 1 NA — 2 Major (cùng gốc: VALIDATION_ERROR throw + 24-field mapping chưa extract).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | All `createQueryBuilder` use `:param` binding; raw `dataSource.query` uses `$1/$2` placeholders; only `${table}` interpolation (remove()) is from hardcoded `RELATED_TABLES` const, never user input. | — |
| 2.2 | Authentication & Session management | ✅ OK | Controller `@UseGuards(SessionAuthGuard, PermissionsGuard)` + `@ApiCookieAuth('session_id')` (hanbaiten.controller.ts:57-59). | — |
| 2.3 | Access Control sufficient | ✅ OK | Every endpoint `@Permissions(...)`; `PermissionsGuard` uses `.some()` (OR) confirming `[perm-any-of]` daiko_input flow; `applyJaScope` in `buildDetailQuery` + create/update existence guards mask out-of-scope as 404; `fetchFkInJa` Layer-4 on `haitatsuryo_tanka_id` (create:540, update:711). | — |
| 2.4 | Security Configuration | ⚪ NA | helmet / CORS / global rate-limit live in main.ts bootstrap — not in this screen's scope. | — |
| 2.5 | No sensitive data exposure | ✅ OK | No password/session/OTP logged; response DTO carries no secret fields; audit `before/after` are business columns only. | — |
| 2.6 | Attack Protection | ✅ OK | BE relies on global `forbidNonWhitelisted: true` (UpdateDto omits `hanbaiten_code` → smuggled value rejected). FE v-html clause not in scope (side=BE). | — |
| 2.7 | No under-protected APIs | ✅ OK | `grep -L @Permissions` on controller → zero unprotected endpoints. | — |
| 2.8 | Validate input and output | ✅ OK | Every DTO field `@ApiProperty(Optional)` + class-validator with Japanese `message`; `@Transform(blankToUndef)` precedes `@IsOptional()` on optional strings; `@Type(()=>Number)` on numeric; m_code allow-list via `assertMCodeValues`; cross-field conditional-required in service. | — |
| 2.9 | Store data securely | ⚪ NA | No password/OTP/file storage in this screen (master CRUD only). | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env` on module → zero hits; no secrets in source. | — |
| 2.11 | — | — | — | — |

**Section 2 score**: 7 OK / 0 NOK / 2 NA — bảo mật rất chắc: parameterized, OR-guard, DataScope + Layer-4 FK, nullable policy đúng.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency for SCR-017 (exceljs used only by SCR-019 import). | — |
| 3.2 | License agreements respected | ✅ OK | No new dep → no license change. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — không thêm thư viện.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | Verb-first: `getHanbaitenDetail`, `createHanbaiten`, `updateHanbaiten`, `assertConditionalRequired`, `buildDetailQuery`, `requireTankaRepo`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `(dto, session, req)` consistent; helper ctx objects named. | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards/throws at top (requireCodeService, assertMCode, assertConditionalRequired, dup-check) then happy path; try/catch wraps only the tx. | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `createHanbaiten` ~170 lines ([:480-649](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L480)), `updateHanbaiten` ~125 lines (:659-784) — exceed the 50-line guideline, mostly from the inline 24-field entity-mapping object (fix shared with 1.4: extract `mapDtoToHanbaitenFields`). | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Cyclomatic low in 017 methods; nesting ≤ 3 (SCR-019 helpers were extracted to stay under S3776). | — |
| 4.6 | Variables well named | ✅ OK | `before`/`row`/`newRow`/`updatePartial`/`effectiveJaId`; no `obj`/`temp`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | `─── section ───` band comments + `[tag]` step markers per paragraph. | — |
| 4.8 | Description of changes | ✅ OK | No churn markers; deviations documented (t_dokusya_rireki omission). | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Race-condition unique-violation conversion + audit-in/out-of-tx explained. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space indent; query-builder chains aligned. | — |
| 4.11 | One command per line | ✅ OK | No `a(); b();` lines. | — |
| 4.12 | Break sign for long lines | ✅ OK | Multi-line throw objects + `.getRawOne<…>()` generics broken cleanly. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained `qb.orderBy().take().skip()` indented 1 level. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of `Hanbaiten`/`Tanka` entities. | — |
| 4.15 | Functions named in common way | ✅ OK | Repo `findOne`/`count`/`save`; service `getX/create/update/remove`; mapper `toHanbaitenDetail`. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Private helpers (`requireTankaRepo`, `buildDetailQuery`) vs public endpoints clear. | — |
| 4.17 | Function name has meaning | ✅ OK | `assertConditionalRequired`/`assertMCodeValues` assert-prefix; no `do()`/`handle()`. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `CreateHanbaitenDto`/`UpdateHanbaitenDto`/`HanbaitenDetailResponse`; entity `Hanbaiten` PascalCase singular. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `modules/hanbaiten/`, entity at `database/entities/`, mapper sibling per project-structure.md. | — |
| 4.20 | Folder content conforms standard | ✅ OK | controller/service/module/dto/exceptions/mapper layout matches the rule. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code, no console.log, no unused imports in 017 paths. | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — 1 Minor (độ dài hàm create/update do inline field-mapping; sửa chung với 1.4).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 2 | 1 | 22% |
| 2. Security | 10 | 7 | 0 | 3 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **36** | **3** | **3** | **7%** |

### Phân bổ severity 3 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 2 | 1.3 (message literal 3×), 1.4 (VALIDATION_ERROR block + 24-field mapping dup) |
| 🟢 Minor | 1 | 4.4 (create/update method length) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Layered đúng chuẩn, naming nhất quán, mapper tách riêng, DTO/entity convention chuẩn. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ (8/8 OK, 1 NA) | Comment WHY chất lượng cao, neo api.md/screen-design, ghi rõ deviation. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 (2 NOK) | VALIDATION_ERROR throw + 24-field mapping lặp 3× / 2× — cần extract helper + mapper. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Parameterized, OR-guard, DataScope + Layer-4 FK guard, forbidNonWhitelisted. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (1 NA) | Không log nhạy cảm; screen không lưu credential. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 (1 NOK) | create/update dài do field-mapping inline; complexity thực tế thấp. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không dead code/console/unused import. |
| **Third Party** (3.1-3.2) | ✅ | Không thêm thư viện. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Audit-log atomicity kỷ luật**: business write + `logCreate/logUpdate/logDelete` luôn chung một `dataSource.transaction(manager)` ([:599-614](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L599)), còn `logError` chạy NGOÀI tx đã rollback ([:630](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L630)) — đúng tuyệt đối quy ước `.claude/rules/nestjs.md §Audit Log`. Future screens nên copy mẫu này.
2. **Layer-4 FK cross-tenant guard**: `fetchFkInJa(tankaRepo, 'tankaId', dto.haitatsuryo_tanka_id, effectiveJaId, …)` trên cả create ([:540](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L540)) lẫn update (bind theo `before.jaId` không phải session — [:715](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L715)) — chặn chính xác cross-tenant injection cho NICHINO_* sửa row của JA khác.
3. **Race-condition net cho unique code**: pre-check duplicate + bắt lại 23505 trong catch và convert sang `DuplicateCodeException` ([:620](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts#L620)) — 2 request CREATE đồng thời không lọt 500.
4. **Nullable serialization đúng policy**: `hanbaiten-form.mapper.ts` map NOT NULL → `''`, nullable → `null` ([:88-121](apps/backend/src/modules/hanbaiten/hanbaiten-form.mapper.ts#L88)) đúng `.claude/rules/nestjs.md §Nullable field serialization`; message verb-only `登録/更新/削除しました。` đúng convention.
5. **DataScope masking nhất quán**: out-of-scope row resolve `null` → 404 (không lộ tồn tại cross-JA) ở cả GET/PUT, NICHINO_* bypass qua `applyJaScope` no-op.

### Weakness (điểm cần cải thiện)

1. **VALIDATION_ERROR throw chưa được helper-hoá** (gốc NOK 1.3 + 1.4): cùng block `throw new HttpException({ code:'VALIDATION_ERROR', … })` + cùng literal lặp 3 chỗ. Process gap: chưa có helper chung `throwFieldValidationError(errors)` ở `@/common` — `assertMCodeValues` đã build shape này nhưng không expose được cho throw thủ công. Khi thêm screen mới, pattern này sẽ tiếp tục copy-paste.
2. **Field-mapping inline phình method** (gốc NOK 4.4): create/update mỗi cái map 24 trường dto→entity bằng tay, gần như trùng nhau. Module đã có pattern mapper (`hanbaiten-form.mapper.ts`) nhưng chỉ dùng cho hướng entity→response; thiếu một `mapDtoToHanbaitenFields(dto)` cho hướng ngược → method dài + duplication.
3. **Kana regex drift FE↔BE** (observation, không tính NOK): BE inline `/^[ｦ-ﾟ\s0-9]+$/u` cho phép 半角数字 + message ghi 半角数字 ([create-hanbaiten.dto.ts:32,:83](apps/backend/src/modules/hanbaiten/dto/create-hanbaiten.dto.ts#L32)), trong khi FE `@/utils/kana` dùng `/^[ｦ-ﾟ\s]+$/u` (không số). FE chặt hơn (safe-direction) nên user UI không bị ảnh hưởng, nhưng hai bên lệch contract; nên thống nhất 1 nguồn (sửa FE hoặc document lý do BE cho phép số).

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND ≤ 2 🟡 (đúng 2 🟡 + 1 🟢)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 Major | `hanbaiten.service.ts:110,520,936` | 1.3 + 1.4 | Extract `throwFieldValidationError(errors)` helper (vào `@/common/utils` hoặc `hanbaiten.constants.ts`) + hằng-hoá literal; thay 3 inline block | ~20 phút |
| 2 | 🟡/🟢 | `hanbaiten.service.ts:564-592,723-748` | 1.4 + 4.4 | Extract `mapDtoToHanbaitenFields(dto)` cho 24-field mapping; create/update gọi chung → rút ngắn method + bỏ duplication | ~20 phút |
| 3 | 🟢 (optional) | `create-hanbaiten.dto.ts:32` + FE `utils/kana` | Weakness | Thống nhất kana regex FE↔BE (defer sang follow-up, cần xác nhận intent với BA) | ~10 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~40 phút (item #1 + #2); item #3 optional defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 + 1.4 #1 — VALIDATION_ERROR throw + literal lặp 3 chỗ

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:110-118   (assertConditionalRequired)
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:520-528   (createHanbaiten — ja_id missing)
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:936-951   (importExcel — partial-key-guard, SCR-019)
```

```ts
throw new HttpException(
  {
    code: 'VALIDATION_ERROR',
    error_code: 'VALIDATION_ERROR',
    message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
    errors,
  },
  HttpStatus.BAD_REQUEST,
);
```

Suggested fix — shared helper (e.g. `apps/backend/src/common/utils/validation-error.ts`):
```diff
+ import { HttpException, HttpStatus } from '@nestjs/common';
+
+ export const VALIDATION_ERROR_MESSAGE =
+   '入力値が不正です。詳細はerrorsフィールドを確認してください。';
+
+ /** Throw the canonical field-level VALIDATION_ERROR (ValidationPipe-shaped). */
+ export function throwFieldValidationError(
+   errors: Array<{ field: string; message: string }>,
+ ): never {
+   throw new HttpException(
+     {
+       code: 'VALIDATION_ERROR',
+       error_code: 'VALIDATION_ERROR',
+       message: VALIDATION_ERROR_MESSAGE,
+       errors,
+     },
+     HttpStatus.BAD_REQUEST,
+   );
+ }
```
```diff
// hanbaiten.service.ts (3 sites)
- throw new HttpException(
-   { code: 'VALIDATION_ERROR', error_code: 'VALIDATION_ERROR',
-     message: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
-     errors: missing },
-   HttpStatus.BAD_REQUEST,
- );
+ throwFieldValidationError(missing);
```
Reference: `.claude/rules/nestjs.md §BE message convention` + §1.3.b (reusable message → constant).

### NOK 1.4 + 4.4 #2 — dto→entity 24-field mapping lặp giữa create/update

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:564-592   (createHanbaiten — newRow)
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:723-748   (updateHanbaiten — updatePartial)
```

Suggested fix — pure mapper (sibling, e.g. trong `hanbaiten-form.mapper.ts` hoặc `hanbaiten.mapper.ts`):
```diff
+ /** Common dto→entity field mapping (NOT NULL cols default '' / false). */
+ export function mapDtoToHanbaitenFields(
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
+     tesuryoKubun: dto.tesuryo_kubun ?? null,
+     tesuryoAmount: dto.tesuryo_amount ?? null,
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
// createHanbaiten
- const newRow: Partial<Hanbaiten> = {
-   jaId: effectiveJaId,
-   hanbaitenCode: dto.hanbaiten_code,
-   hanbaitenName: dto.hanbaiten_name,
-   …22 dòng…
-   createdBy: String(session.account_id),
-   updatedBy: String(session.account_id),
- };
+ const newRow: Partial<Hanbaiten> = {
+   ...mapDtoToHanbaitenFields(dto),
+   jaId: effectiveJaId,
+   hanbaitenCode: dto.hanbaiten_code,
+   createdBy: String(session.account_id),
+   updatedBy: String(session.account_id),
+ };

// updateHanbaiten
- const updatePartial: Partial<Hanbaiten> = {
-   hanbaitenName: dto.hanbaiten_name,
-   …22 dòng…
-   updatedBy: String(session.account_id),
- };
+ const updatePartial: Partial<Hanbaiten> = {
+   ...mapDtoToHanbaitenFields(dto),
+   updatedBy: String(session.account_id),
+ };
```
Giảm ~20 dòng/method (sửa luôn 4.4) và loại bỏ nguy cơ hai nhánh lệch nhau khi thêm cột mới. (Mapper là pure fn — test import trực tiếp không cần boot Nest, đúng pattern `hanbaiten-form.mapper.ts`.)
