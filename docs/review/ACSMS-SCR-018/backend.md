# Báo cáo Code Review — ACSMS-SCR-018 (販売店明細検索画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py.
     Keep these exact bullet keys; one block per report file (= per side).
     PIC / Reviewer / Approver / Project name / Project manager come VERBATIM
     from the §Review metadata (EDIT THESE) table at the top of the skill. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts, apps/backend/src/modules/hanbaiten/hanbaiten.service.ts, apps/backend/src/modules/hanbaiten/dto/search-hanbaiten.dto.ts, apps/backend/src/modules/hanbaiten/hanbaiten.mapper.ts, apps/backend/src/modules/hanbaiten/hanbaiten.module.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/07
- Side: Backend

## Files reviewed

**Backend** (5 source files):
- [`hanbaiten.controller.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.controller.ts) — GET list (API-018-001) + DELETE (API-018-002); both behind SessionAuthGuard + PermissionsGuard.
- [`hanbaiten.service.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.service.ts) — `findAll` (search/paginate/DataScope), `remove` (soft-delete + FK-conflict guard + audit-in-tx), `listDropdown`. (File also hosts SCR-017/019 logic — out of SCR-018 scope but counted for file-length items.)
- [`search-hanbaiten.dto.ts`](apps/backend/src/modules/hanbaiten/dto/search-hanbaiten.dto.ts) — query DTO, all fields validated with Japanese messages.
- [`hanbaiten.mapper.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.mapper.ts) — pure entity→snake_case list-row mapper.
- [`hanbaiten.module.ts`](apps/backend/src/modules/hanbaiten/hanbaiten.module.ts) — module wiring.

> NOTE: `tsc --noEmit` / `eslint` were NOT executed — the `agrinews-backend-1` dev container is down. Static review of naming/imports/types is clean; CI must run the compiler gate before merge.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | Kebab-case files, PascalCase+suffix classes, camelCase methods; tsc/eslint not executed (dev container down) — static review clean | — |
| 1.2 | Meaningful naming | ✅ OK | Domain romaji preserved (hanbaiten, tanka, todofuken); boolean `haitenFlg`; constants `ITAKU_KUBUN_FURIKOMI` / `SORT_COLUMN_MAP` | — |
| 1.3 | Avoid all hardcode | ✅ OK | 1.3.a: branching uses named const `ITAKU_KUBUN_FURIKOMI` (service.ts:64,94), sort via `SORT_COLUMN_MAP` whitelist — no magic numbers in branching. 1.3.b: customer message `CONFLICT_MESSAGE` (ACSMS-MSG-018-004) is a named const; success literal `削除しました。` matches useNotify contract | — |
| 1.4 | No duplication | ❌ NOK | `remove()` re-implements the FK-conflict loop inline (service.ts:401-410) instead of `assertNoRelatedRows`, and an inline DataScope where-clause (service.ts:388-394) instead of `assertJaScope`; both behave correctly and have justifications (custom CONFLICT message + per-table deleted_at flag; combined existence+scope SELECT) but bypass the mandated common helpers | 🟢 Minor |
| 1.5 | Complex logic commented | ✅ OK | Labeled-block comments `[data-scope]` / `[staff-ja-filter]` / `[audit-log-in-tx]` explain WHY, not WHAT | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | `RELATED_TABLES` note documents the deliberate `t_dokusya_rireki` deferral with re-add instructions (service.ts:133-151) | — |
| 1.7 | Operation purpose commented | ✅ OK | JSDoc on every public method + `@ApiOperation` on every endpoint | — |
| 1.8 | Other relevant facts commented | ✅ OK | Transaction boundaries + "error log OUTSIDE rolled-back tx" rationale documented (service.ts:436-444) | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Sạch; chỉ 1 điểm trừ nhỏ về tái sử dụng helper (1.4).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | All queries parameterized (`$1`, `ANY($2::text[])`); `${table}` only from hardcoded `RELATED_TABLES`; sort via `SORT_COLUMN_MAP` + DTO `@IsIn` | — |
| 2.2 | Authentication & Session management | ✅ OK | `@UseGuards(SessionAuthGuard, PermissionsGuard)` at controller class (controller.ts:59) | — |
| 2.3 | Access Control sufficient | ✅ OK | Every endpoint `@Permissions(...)`; OR-semantics confirmed in PermissionsGuard:32; `findAll` `applyJaScope` (service.ts:250); `remove` combined existence+scope SELECT masks cross-JA as 404; FK body via `fetchFkInJa` | — |
| 2.4 | Security Configuration | ⚪ NA | helmet / CORS / throttle configured globally in main.ts — not in screen-module scope | — |
| 2.5 | No sensitive data exposure | ✅ OK | No password/session/OTP logged; response mapper exposes no sensitive fields | — |
| 2.6 | Attack Protection | ✅ OK | `forbidNonWhitelisted` global; `hanbaiten_code` excluded from UpdateDto so it can't be mutated | — |
| 2.7 | No under-protected APIs | ✅ OK | No endpoint lacks `@Permissions` | — |
| 2.8 | Validate input and output | ✅ OK | `SearchHanbaitenDto` every field `@ApiPropertyOptional` + validator with Japanese message; `blankToUndef` + `stringToBoolean` transforms handle query-string edge cases | — |
| 2.9 | Store data securely | ⚪ NA | No password/OTP/file storage in SCR-018 (search + soft-delete only) | — |
| 2.10 | No hardcoded credentials | ✅ OK | grep `process.env.` in module = 0 hits; secrets via ConfigService elsewhere | — |

**Section 2 score**: 8 OK / 0 NOK / 2 NA — Bảo mật đạt; DataScope + audit-in-transaction làm rất tốt.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency introduced by SCR-018 (list/delete); `exceljs` belongs to SCR-019 import, already approved | — |
| 3.2 | License agreements respected | ✅ OK | exceljs MIT; no GPL/AGPL | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không phát sinh dependency mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `findAll`, `remove`, `listDropdown`, `buildDetailQuery` | — |
| 4.2 | Descriptive parameter names | ✅ OK | `(query, session)`, `(id, session, req)` — no `(a,b,c)` | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards/throws at top (`if (!before) throw NotFound`), happy return at bottom | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `findAll` ≈ 96 lines (service.ts:231-327) and `importExcel` ≈ 260 lines (service.ts:907-1171) exceed the 50-line guide; importExcel already extracts collect*/apply* helpers but the orchestrator stays long | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | importExcel decomposed into `collect*`/`apply*` helpers to keep S3776 below threshold; findAll is a flat filter chain | — |
| 4.6 | Variables well named | ✅ OK | `orderColumn`, `nameMap`, `effectiveJaId`; loop var `for (const { table, hasDeletedAt } of ...)` | — |
| 4.7 | General description for code paragraphs | ✅ OK | Each block has a leading WHY comment | — |
| 4.8 | Description of changes | ✅ OK | v1.2 deltas annotated (廃店フラグ / todofuken_name) | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Content-Disposition RFC-6266 encoding rationale documented | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space; query-builder chain dot-aligned | — |
| 4.11 | One command per line | ✅ OK | No `a(); b();` | — |
| 4.12 | Break sign for long lines | ✅ OK | Multi-line method signatures, one param per line | — |
| 4.13 | Continuation line indent | ✅ OK | Chained `.orderBy().take().skip()` indented | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of entity class names | — |
| 4.15 | Functions named in common way | ✅ OK | Service `findAll`/`remove`; mapper `toHanbaitenListItem`; validator `assertConditionalRequired` | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module-level pure fns vs private methods clearly separated | — |
| 4.17 | Function name has meaning | ✅ OK | All verb-first | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `CreateHanbaitenDto` / `UpdateHanbaitenDto` / `SearchHanbaitenDto` | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/modules/hanbaiten/` per project-structure.md | — |
| 4.20 | Folder content conforms standard | ✅ OK | Entity at `src/database/entities/`, DTOs under `dto/`, exceptions under `exceptions/` | — |
| 4.21 | No redundant/unused lines | ✅ OK | No console.log / commented-out code / dead fns in static review (tsc unused-import gate not run — container down) | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Tốt; chỉ method length (4.4) ở mức nhỏ.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 8 | 0 | 2 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **37** | **2** | **3** | **5%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 2 | 1.4 (helper reuse: assertNoRelatedRows / assertJaScope), 4.4 (method length: findAll / importExcel) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Đặt tên + cấu trúc thư mục chuẩn |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Labeled-block comments giải thích WHY rất tốt |
| **Hardcode & Duplication** (1.3, 1.4) | 🟢 | 1.3 sạch; 1.4 bỏ qua 2 helper bắt buộc (có lý do chức năng) |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | DataScope + perm-any-of guard + parameterized SQL đầy đủ |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không lộ dữ liệu nhạy cảm |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 | findAll/importExcel hơi dài nhưng đã tách helper giảm complexity |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Sạch (chưa chạy được tsc unused-import gate) |
| **Third Party** (3.1-3.2) | ✅ | Không dependency mới |

### Strength (điểm mạnh đáng ghi nhận)

1. **Audit-trail atomic discipline**: `remove()` gói soft-delete + `auditLog.logDelete(..., manager)` trong cùng `dataSource.transaction`, còn `logError` chạy NGOÀI tx đã rollback (service.ts:412-446) — đúng chuẩn nestjs.md §Audit, đảm bảo audit không bao giờ lệch với state thực.
2. **DataScope masking nhất quán**: out-of-scope row trả `null` → 404 (service.ts:395-396) thay vì 403, che giấu sự tồn tại cross-JA — đúng security.md §Layer 2.
3. **Chống SQL-injection ở sort**: `SORT_COLUMN_MAP` whitelist + DTO `@IsIn` (service.ts:128-131, dto:136) thay vì `ORDER BY ${user_input}` — pattern này nên copy cho mọi list screen.
4. **Comment quyết định lệch spec có trách nhiệm**: khối `RELATED_TABLES` ghi rõ lý do hoãn `t_dokusya_rireki` + hướng dẫn re-add (service.ts:133-151), tránh 500 ở prod.
5. **Xử lý query-string boolean tinh tế**: `@Type(() => String)` + `stringToBoolean` chặn `enableImplicitConversion` ép `'false'`→`true` (dto:118-128).

### Weakness (điểm cần cải thiện)

1. **Helper bắt buộc chưa bao trùm hết biến thể thực tế**: `assertNoRelatedRows` không nhận custom message và luôn nối `AND deleted_at IS NULL`, nên `remove()` buộc phải tự viết loop để giữ message ACSMS-MSG-018-004 + hỗ trợ bảng không có deleted_at. Đây là tín hiệu helper nên được mở rộng (thêm tham số message + cờ deleted_at) thay vì để mỗi service tự fork.
2. **File service đa-màn-hình phình dần**: 1 file `hanbaiten.service.ts` gánh SCR-017/018/019 → 1447 dòng; `importExcel` dài dù đã tách helper. Khi thêm yêu cầu, method length sẽ tiếp tục vượt ngưỡng — nên cân nhắc tách theo screen/use-case.

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 2 NOK đều 🟢 → đạt ngưỡng Pass.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `hanbaiten.service.ts:401-410` | 1.4 | Mở rộng `assertNoRelatedRows` để nhận `{ message?, hasDeletedAt? }` rồi gọi helper trong `remove()` (giữ nguyên message ACSMS-MSG-018-004) | ~20 phút |
| 2 | 🟢 | `hanbaiten.service.ts:388-394` | 1.4 | Thay where-clause role thủ công bằng fetch-then-`assertJaScope(before.jaId, session, '販売店')` | ~10 phút |
| 3 | 🟢 | `hanbaiten.service.ts:907-1171` | 4.4 | (Defer) Cân nhắc tách SCR-019 `importExcel` sang `hanbaiten-import.service.ts` để giảm độ dài file/method | ~40 phút |

**Tổng effort dự kiến để chuyển từ "Pass (with minors)" → "Pass sạch"**: ~30 phút (item #1-#2); item #3 optional, defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.4 #1 — `remove()` FK-conflict loop nên dùng `assertNoRelatedRows`

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:401-410
```

```ts
for (const { table, hasDeletedAt } of RELATED_TABLES) {
  const sql = hasDeletedAt
    ? `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1 AND deleted_at IS NULL`
    : `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1`;
  const rows = await this.dataSource.query(sql, [id]);
  const count = Number(rows?.[0]?.count ?? 0);
  if (count > 0) {
    throw new ConflictException(CONFLICT_MESSAGE);
  }
}
```

Suggested fix (extend the shared helper, then call it):
```diff
// apps/backend/src/common/utils/fk-conflict.ts
- export async function assertNoRelatedRows(
-   dataSource: DataSource,
-   tables: readonly string[],
-   fkField: string,
-   fkValue: number,
- ): Promise<void> {
-   for (const table of tables) {
-     const rows = await dataSource.query(
-       `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1 AND deleted_at IS NULL`,
-       [fkValue],
-     );
-     const count = Number(rows?.[0]?.count ?? 0);
-     if (count > 0) {
-       throw new ConflictException();
-     }
+ export async function assertNoRelatedRows(
+   dataSource: DataSource,
+   tables: ReadonlyArray<string | { table: string; hasDeletedAt: boolean }>,
+   fkField: string,
+   fkValue: number,
+   message?: string,
+ ): Promise<void> {
+   for (const t of tables) {
+     const table = typeof t === 'string' ? t : t.table;
+     const softDelete = typeof t === 'string' ? true : t.hasDeletedAt;
+     const sql = softDelete
+       ? `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1 AND deleted_at IS NULL`
+       : `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1`;
+     const rows = await dataSource.query(sql, [fkValue]);
+     const count = Number(rows?.[0]?.count ?? 0);
+     if (count > 0) {
+       throw new ConflictException(message);
+     }
```
```diff
// hanbaiten.service.ts — remove()
- for (const { table, hasDeletedAt } of RELATED_TABLES) {
-   const sql = hasDeletedAt
-     ? `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1 AND deleted_at IS NULL`
-     : `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1`;
-   const rows = await this.dataSource.query(sql, [id]);
-   const count = Number(rows?.[0]?.count ?? 0);
-   if (count > 0) {
-     throw new ConflictException(CONFLICT_MESSAGE);
-   }
- }
+ await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'hanbaiten_id', id, CONFLICT_MESSAGE);
```
Reference: `.claude/rules/nestjs.md §Service-layer common helpers`. (Requires `ConflictException` to accept an optional message — verify the current signature before applying.)

### NOK 1.4 #2 — `remove()` DataScope nên dùng `assertJaScope`

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:384-396
```

```ts
const where: Record<string, unknown> = { hanbaitenId: id, deletedAt: IsNull() };
if (
  session.role_code !== RoleCode.NICHINO_ADMIN &&
  session.role_code !== RoleCode.NICHINO_STAFF &&
  session.ja_id !== null
) {
  where.jaId = session.ja_id;
}
const before = await this.repo.findOne({ where });
if (!before) throw new NotFoundException('販売店');
```

Suggested fix:
```diff
- const where: Record<string, unknown> = { hanbaitenId: id, deletedAt: IsNull() };
- if (
-   session.role_code !== RoleCode.NICHINO_ADMIN &&
-   session.role_code !== RoleCode.NICHINO_STAFF &&
-   session.ja_id !== null
- ) {
-   where.jaId = session.ja_id;
- }
- const before = await this.repo.findOne({ where });
- if (!before) throw new NotFoundException('販売店');
+ const before = await this.repo.findOne({
+   where: { hanbaitenId: id, deletedAt: IsNull() },
+ });
+ if (!before) throw new NotFoundException('販売店');
+ // Mask cross-JA existence as 404 for scoped roles (NICHINO_* bypass).
+ assertJaScope(Number(before.jaId), session, '販売店');
```
Reference: `.claude/rules/security.md §Layer 2 — Single-record access via assertJaScope`. (`assertJaScope` is already imported is NOT — add it to the existing `@/common/utils/data-scope` import.)

### NOK 4.4 — `importExcel` / `findAll` method length (defer)

Hiện trạng:
```
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:907-1171  (importExcel ≈ 260 lines)
apps/backend/src/modules/hanbaiten/hanbaiten.service.ts:231-327   (findAll ≈ 96 lines)
```

Không kèm diff — đây là refactor cấu trúc (tách SCR-019 import sang service riêng `hanbaiten-import.service.ts`, hoặc tách phần audit-summary của importExcel ra helper). Defer sang follow-up MR; không chặn merge SCR-018.
