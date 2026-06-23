# Báo cáo Code Review — ACSMS-SCR-014 (購読者明細検索画面) — Backend only

**Scope**: BE

- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/dokusya/dokusya.controller.ts, dokusya.service.ts (search/remove/exportExcel + helpers), dokusya.mapper.ts, dto/search-dokusya.dto.ts, dto/dokusya-response.dto.ts, dokusya.module.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Backend

## Files reviewed

**Backend** (6 source files):
- [`dokusya.controller.ts`](apps/backend/src/modules/dokusya/dokusya.controller.ts) — SCR-014 endpoints: `GET /` search (L76), `GET /export` (L92), `DELETE /:id` (L315)
- [`dokusya.service.ts`](apps/backend/src/modules/dokusya/dokusya.service.ts) — `search` (L1928), `remove` (L1973), `exportExcel` (L2066) + helpers `buildSearchQuery` / `applySearch*Filters` / `buildExcelBuffer`
- [`dokusya.mapper.ts`](apps/backend/src/modules/dokusya/dokusya.mapper.ts) — `toDokusyaListItem`, `isDokusyaReadOnly`, `toDokusyaExcelRow`, `DOKUSYA_EXPORT_HEADERS`
- [`dto/search-dokusya.dto.ts`](apps/backend/src/modules/dokusya/dto/search-dokusya.dto.ts) — search + export query DTO
- [`dto/dokusya-response.dto.ts`](apps/backend/src/modules/dokusya/dto/dokusya-response.dto.ts) — response envelopes
- [`dokusya.module.ts`](apps/backend/src/modules/dokusya/dokusya.module.ts) — module wiring

Pre-checks: `docker exec agrinews-backend-1 npx tsc --noEmit` → clean (exit 0). `eslint src/modules/dokusya/**/*.ts` → 1 error + 3 warnings (see 1.1).

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ❌ NOK | `tsc --noEmit` clean, but `eslint src/modules/dokusya` reports 1 error: `no-extra-boolean-cast` at dokusya.service.ts:1731 (`return Boolean(after.haitatsuSameFlg) ? …`). The line is in SCR-011's `addressZenkaiPairs` helper (shared file), not SCR-014's search/remove/export methods, but the shared file fails a clean lint run. | 🟡 Major |
| 1.2 | Meaningful naming | ✅ OK | — | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a magic numbers in `is_read_only` computed column: dokusya.service.ts:2241 `((d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6) OR d.dokusya_shubetsu = 3)` — literals 2/6/3 instead of `DokusyaShubetsu.DIGITAL/BOTH` + `ShiharaiHoho.CREDIT_CARD` (both enums already imported L36-42). §1.3.b: no inline JP message issue (all via exceptions / ValidationException). | 🟡 Major |
| 1.4 | No duplication | ❌ NOK | The `is_read_only` business rule exists twice: mapper `isDokusyaReadOnly` (dokusya.mapper.ts:183) and the raw SQL at dokusya.service.ts:2241. SQL cannot call the TS fn, but the magic-number duplication risks drift if the rule changes. | 🟢 Minor |
| 1.5 | Complex logic commented | ✅ OK | Strong WHY comments: limit/offset vs take/skip (L1944), 404-mask DataScope (L1983), t_koza_furikae deleted_at omission (L2007). | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | — | — |
| 1.7 | Operation purpose commented | ✅ OK | Every endpoint has `@ApiOperation` + service JSDoc with api.md flow refs. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Transaction boundary + error-log-outside-tx reasoning documented (L2029-2044). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 5 OK / 3 NOK / 1 NA — 2 Major (1.1 lint, 1.3 magic numbers) + 1 Minor (1.4). Fix the magic numbers (1.3) and lint error (1.1) to reach Pass.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | All filters parameterized (`'%' || :param || '%'`, `= :param`). The `FROM ${table}` at L2012 interpolates a value from the `RELATED_TABLES` const (`['t_koza_furikae']`), not user input; dokusya_id is `$1`. | — |
| 2.2 | Authentication & Session management | ✅ OK | `@UseGuards(SessionAuthGuard, PermissionsGuard)` + `@ApiCookieAuth('session_id')` at controller class level (L63-65). | — |
| 2.3 | Access Control sufficient | ✅ OK | search/export `@Permissions('dokusya.view')`, remove `@Permissions('dokusya.delete')`. List: `applyBranchScope` (L2247). Single record: `assertBranchScope` after fetch (L1984). Account-flag gate `assertShubetsuFlag` on delete (L1998). | — |
| 2.4 | Security Configuration | ✅ OK | helmet / CORS / global throttle configured app-wide in main.ts; import endpoint adds explicit `@Throttle` (L196). No screen-specific gap. | — |
| 2.5 | No sensitive data exposure | ✅ OK | Export audit `afterValue` logs only filter params + record_count (L2116-2125); no PII/secret. Response DTO has no password/session/token. | — |
| 2.6 | Attack Protection | ✅ OK | Global `forbidNonWhitelisted: true`; DTO `@MaxLength` caps every free-text filter. | — |
| 2.7 | No under-protected APIs | ✅ OK | All 3 SCR-014 endpoints carry `@Permissions`. | — |
| 2.8 | Validate input and output | ✅ OK | search-dokusya.dto.ts: every field `@ApiPropertyOptional` + class-validator with Japanese `message`; `@Transform(blankToUndef)` before `@IsOptional`; date-range correlation via `@ValidateIf`. Service re-validates m_code via `assertSearchMCodeValues` + sort_by via `resolveSortColumn`. | — |
| 2.9 | Store data securely | ⚪ NA | SCR-014 has no password/OTP/file write (soft-delete sets deletedAt only). | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env src/modules/dokusya` → 0 hits; values via ConfigService/CodeService. | — |

**Section 2 score**: 8 OK / 0 NOK / 2 NA — Security clean. Layered access control + DataScope + FK-tenant guard (SCR-011) all present; SCR-014 read paths correctly scoped.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency for this screen (ExcelJS already in use project-wide). | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA — No dependency change.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `search` / `remove` / `exportExcel` / `buildSearchQuery` / `applySearchEqualityFilters` — verb-first, intent-clear. | — |
| 4.2 | Descriptive parameter names | ✅ OK | — | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards/validation throw at top; happy return at bottom (search L1932-1957). | — |
| 4.4 | Operation not too long | ✅ OK | search ~30 lines; export ~75 (mostly the audit afterValue literal); buildSearchQuery delegates to 3 sub-filters. Within reason. | — |
| 4.5 | Decision points limited | ✅ OK | Filter application split per type (equality/partial/date) keeps each helper low-complexity. | — |
| 4.6 | Variables well named | ✅ OK | `sortColumn`, `perPage`, `total`, `auditCtx`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | api.md §4.x flow references in each method JSDoc. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | joho_henko_tekiyo_date INNER JOIN branch explained (L2413-2422). | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, dot-aligned QB chains. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | Repo `findOne`, service `search/remove`, mapper `toDokusyaListItem`. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module-level helpers (`isDigitalOrBoth`, `fieldValidationError`) vs private methods. | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | DTO `SearchDokusyaDto`, response `DokusyaResponseDto`, entity `Dokusya`. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/modules/dokusya/`, entity at `src/database/entities/`, mapper sibling. | — |
| 4.20 | Folder content conforms standard | ✅ OK | controller/service/module/dto/exceptions/mapper layout per project-structure.md. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code / console.log / unused imports in SCR-014 methods. (The Boolean()-redundancy at L1731 is captured under 1.1.) | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Source structure exemplary; decomposition + naming are model for future screens.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 5 | 3 | 1 | 33% |
| 2. Security | 10 | 8 | 0 | 2 | 0% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **34** | **3** | **5** | **7%** |

### Phân bổ severity 3 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 2 | 1.1 (eslint error), 1.3 (magic number is_read_only SQL) |
| 🟢 Minor | 1 | 1.4 (is_read_only rule duplication) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | 🟡 (9/10 OK) | Chỉ lỗi lint (1.1) ở helper SCR-011 dùng chung file; naming/layout đạt chuẩn. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment WHY chất lượng cao, tham chiếu api.md §4.x đầy đủ. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 | Magic number 2/6/3 trong SQL is_read_only; trùng rule với mapper `isDokusyaReadOnly`. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Guard + DataScope + parameterized query + DTO validation đầy đủ. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không log/expose PII; export audit chỉ ghi filter + record_count. |
| **Code Length & Complexity** (4.4, 4.5) | ✅ | Tách helper theo loại filter giữ complexity thấp. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không có dead code trong phạm vi SCR-014. |
| **Third Party** (3.1-3.2) | ⚪ | Không thêm dependency. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Audit + transaction discipline**: remove() bọc soft-delete + `logDelete` trong một `dataSource.transaction`, error-log chạy NGOÀI tx đã rollback (dokusya.service.ts:2029-2044) — đúng chuẩn nestjs.md §Audit Log, đáng nhân rộng.
2. **DataScope nhất quán hai chiều**: list dùng `applyBranchScope` (L2247), single-record dùng `assertBranchScope` mask 404 (L1984) — không re-implement role switch inline.
3. **Defensive query notes**: comment giải thích vì sao dùng `limit/offset` thay `take/skip` cho `getRawMany` (L1944) và vì sao không thêm `deleted_at IS NULL` cho t_koza_furikae (L2007) — bắt được 2 bug class thật.
4. **DTO phòng thủ kỹ**: `@Transform(blankToUndef)` trước `@IsOptional`, date-range correlation `@ValidateIf`, mọi message tiếng Nhật — search-dokusya.dto.ts.

### Weakness (điểm cần cải thiện)

1. **Magic number trong SQL string**: rule is_read_only viết literal 2/6/3 trong câu SELECT thay vì bind enum value qua parameter. Triệu chứng nhỏ nhưng phản ánh việc enum chưa được áp dụng triệt để ở tầng raw-SQL — khi rule đổi (vd thêm 購読種別 mới read-only) sẽ phải sửa 2 nơi mà SQL không được type-check.
2. **Lint chưa sạch ở file dùng chung**: dokusya.service.ts gộp 6 screen (011/013/014/015/016) trong một file 4181 dòng; lỗi lint của SCR-011 (L1731) làm `npm run lint` của cả module fail. Gợi ý quy trình: bật pre-commit eslint --max-warnings 0 để chặn lỗi tích lũy.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND 2 🟡 (≤ 2 Major)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `dokusya.service.ts:2241` | 1.3 + 1.4 | Bind enum value qua parameter cho cột `is_read_only` (DokusyaShubetsu.DIGITAL/BOTH + ShiharaiHoho.CREDIT_CARD). | 10 phút |
| 2 | 🟡 | `dokusya.service.ts:1731` | 1.1 | Bỏ `Boolean()` thừa: `return after.haitatsuSameFlg ? … : …` (sửa lỗi no-extra-boolean-cast để lint module sạch). | 2 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~12 phút (item #1-#2).

---

## Suggested diffs

### NOK 1.3 / 1.4 — magic number trong is_read_only SQL

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.service.ts:2241
```

```ts
'((d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6) OR d.dokusya_shubetsu = 3) AS is_read_only',
```

Suggested fix (bind enum values as named parameters; `DokusyaShubetsu` + `ShiharaiHoho` already imported at L36-42):
```diff
-      .select([
+      .setParameters({
+        roShubetsuDigital: DokusyaShubetsu.DIGITAL,
+        roHohoCard: ShiharaiHoho.CREDIT_CARD,
+        roShubetsuBoth: DokusyaShubetsu.BOTH,
+      })
+      .select([
         ...
-        '((d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6) OR d.dokusya_shubetsu = 3) AS is_read_only',
+        '((d.dokusya_shubetsu = :roShubetsuDigital AND d.shiharai_hoho = :roHohoCard) OR d.dokusya_shubetsu = :roShubetsuBoth) AS is_read_only',
       ])
```
(Mapper `isDokusyaReadOnly` đã có sẵn — giữ nó là canonical cho non-SQL path; SQL chỉ cần bỏ literal.)

### NOK 1.1 — redundant Boolean call (no-extra-boolean-cast)

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.service.ts:1731
```

```ts
return Boolean(after.haitatsuSameFlg)
  ? [ ... ]
  : [ ... ];
```

Suggested fix:
```diff
-    return Boolean(after.haitatsuSameFlg)
+    return after.haitatsuSameFlg
       ? [
```
(`haitatsuSameFlg` đã là `boolean` trên `ZougenComparable` — ternary tự coerce, `Boolean()` thừa. Lưu ý: dòng này thuộc helper update của SCR-011, ngoài 3 method SCR-014, nhưng nằm cùng file được review.)
