# Báo cáo Code Review — ACSMS-SCR-013 (購読者履歴情報画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/dokusya/dokusya.controller.ts (getRirekiList), dokusya.service.ts (getRirekiList + RIREKI_SORT_COLUMN_MAP + fetchInScope), dokusya.mapper.ts (toDokusyaRirekiListItem + DokusyaRirekiListItem), dto/dokusya-rireki-query.dto.ts, database/entities/dokusya-rireki.entity.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Backend

## Files reviewed

**Backend** (5 source files):
- [`dokusya.controller.ts`](apps/backend/src/modules/dokusya/dokusya.controller.ts#L348) — `GET /:dokusya_id/rireki` endpoint (L348-L370)
- [`dokusya.service.ts`](apps/backend/src/modules/dokusya/dokusya.service.ts#L1068) — `getRirekiList` (L1068-L1183), `RIREKI_SORT_COLUMN_MAP` (L439-L444), `fetchInScope` (L1191-L1201)
- [`dokusya.mapper.ts`](apps/backend/src/modules/dokusya/dokusya.mapper.ts#L420) — `toDokusyaRirekiListItem` (L420-L490) + `DokusyaRirekiListItem` interface (L328-L389)
- [`dto/dokusya-rireki-query.dto.ts`](apps/backend/src/modules/dokusya/dto/dokusya-rireki-query.dto.ts) — pagination + sort query DTO
- [`database/entities/dokusya-rireki.entity.ts`](apps/backend/src/database/entities/dokusya-rireki.entity.ts) — `t_dokusya_rireki` entity (shared, source for read)

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | `tsc --noEmit` clean via `docker exec agrinews-backend-1`; kebab files, PascalClass+suffix, camelCase methods | — |
| 1.2 | Meaningful naming | ✅ OK | `getRirekiList`, `RIREKI_SORT_COLUMN_MAP`, `fetchInScope`, `toDokusyaRirekiListItem` — domain terms preserved | — |
| 1.3 | Avoid all hardcode | ✅ OK | (1.3.a) No magic number in branching — sort resolved via `RIREKI_SORT_COLUMN_MAP`; no `=== N` in rireki path. (1.3.b) No inline JP message — read-only endpoint emits no toast literals; exceptions use `new NotFoundException('購読者')` factory | — |
| 1.4 | No duplication | ✅ OK | Uses shared `paginate()`, `assertBranchScope`, mapper pure-function pattern; sort allow-list mirrored DTO↔service intentionally | — |
| 1.5 | Complex logic commented | ✅ OK | `limit/offset vs take/skip` getRawMany pitfall documented at dokusya.service.ts:1169-1172 | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments reference current symbols (api.md §4.x, getHistory distinction); no stale TODO | — |
| 1.7 | Operation purpose commented | ❌ NOK | `@ApiOperation` present, but `@ApiResponse({status:200})` at dokusya.controller.ts:359 has only `description`, no `type` — 200 body schema undocumented in Swagger (other endpoints use `type: XxxResponseDto`) | 🟢 Minor |
| 1.8 | Other relevant facts commented | ✅ OK | Read-only / no-audit-log rationale noted (dokusya.service.ts:1065-1066); 404-mask DataScope noted | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Sạch; chỉ thiếu typed `@ApiResponse` cho response 200.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | QueryBuilder parameterized: `.where('r.dokusya_id = :dokusya_id', {...})`; sort column from fixed `RIREKI_SORT_COLUMN_MAP` (no interpolation of user input) | — |
| 2.2 | Authentication & Session management | ✅ OK | Controller `@UseGuards(SessionAuthGuard, PermissionsGuard)` at dokusya.controller.ts:65 | — |
| 2.3 | Access Control sufficient | ✅ OK | `@Permissions('dokusya.view')` (L353) + `fetchInScope` → `assertBranchScope(jaId, kanriShitenId, session)` masks out-of-scope as 404 | — |
| 2.4 | Security Configuration | ⚪ NA | helmet/CORS/rate-limit are app-bootstrap concerns, not in this screen's source | — |
| 2.5 | No sensitive data exposure | ✅ OK | Read-only; response carries no password/session/OTP; account fields not exposed | — |
| 2.6 | Attack Protection | ⚪ NA | `forbidNonWhitelisted` global pipe (bootstrap, not in scope); no v-html (FE) | — |
| 2.7 | No under-protected APIs | ✅ OK | Endpoint carries both `@Permissions` + class-level guards | — |
| 2.8 | Validate input and output | ✅ OK | Query DTO every field has `@ApiPropertyOptional` + class-validator with JP `message`; `ParseIntPipe` on `:dokusya_id` path param | — |
| 2.9 | Store data securely | ⚪ NA | Read-only endpoint — no write/storage path | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env` on dokusya module → zero hits | — |

**Section 2 score**: 7 OK / 0 NOK / 3 NA — Bảo mật đầy đủ cho endpoint read-only (guard + permission + DataScope + parameterized).

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency introduced for this screen | — |
| 3.2 | License agreements respected | ✅ OK | No new dependency | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm thư viện.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | Verb-first: `getRirekiList`, `fetchInScope`, `toDokusyaRirekiListItem` | — |
| 4.2 | Descriptive parameter names | ✅ OK | `(id, query, session)`, `(row)` for mapper — clear | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guard `fetchInScope` (throws) at top, happy `paginate(...)` return at bottom | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `getRirekiList` ≈115 lines (dokusya.service.ts:1068-1183), driven by a ~60-line inline `.select([...])` array — could extract to a `RIREKI_SELECT` module const like `RIREKI_SORT_COLUMN_MAP` | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Low cyclomatic complexity; only sort/order ternaries, no nesting | — |
| 4.6 | Variables well named | ✅ OK | `sortColumn`, `sortOrder`, `perPage`, `rows`, `total` | — |
| 4.7 | General description for code paragraphs | ✅ OK | JOIN block + SELECT block intent documented | — |
| 4.8 | Description of changes | ✅ OK | api.md §変更履歴 v1.1 recorded bank_branch rename; mapper matches | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | getRawMany limit/offset pitfall explained | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, dot-aligned method chain | — |
| 4.11 | One command per line | ✅ OK | No multi-statement lines | — |
| 4.12 | Break sign for long lines | ✅ OK | SELECT array one column per line; signatures wrapped | — |
| 4.13 | Continuation line indent | ✅ OK | Chained QB calls indented 1 level | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of entity/DTO names | — |
| 4.15 | Functions named in common way | ✅ OK | `findOne`, `createQueryBuilder`, mapper `toXxx` | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module consts UPPER_SNAKE, methods camelCase | — |
| 4.17 | Function name has meaning | ✅ OK | All names self-describing | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `DokusyaRirekiQueryDto`, entity `DokusyaRireki` PascalCase singular | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | Module at `src/modules/dokusya/`, entity at `src/database/entities/` | — |
| 4.20 | Folder content conforms standard | ✅ OK | controller/service/mapper/dto/exceptions split per project-structure.md | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code, no console.*, no unused imports (tsc noUnusedLocals clean) | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Chất lượng cao; chỉ method `getRirekiList` hơi dài do SELECT inline.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 7 | 0 | 3 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **36** | **2** | **4** | **5%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 2 | 1.7 (untyped @ApiResponse 200), 4.4 (getRirekiList length / inline SELECT) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Naming + folder structure đúng chuẩn hoàn toàn |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | 🟡 (7/8 OK) | Comment WHY tốt; thiếu duy nhất typed response DTO cho Swagger |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ | Sort allow-list double-guard, shared helpers (paginate, assertBranchScope) |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Guard + permission + DataScope 404-mask + parameterized query đầy đủ |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Read-only, không lộ field nhạy cảm |
| **Code Length & Complexity** (4.4, 4.5) | 🟡 (1/2 OK) | `getRirekiList` ~115 dòng do SELECT inline; complexity thấp |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không dead code / console / unused import |
| **Third Party** (3.1-3.2) | ✅ | Không thêm dependency |

### Strength (điểm mạnh đáng ghi nhận)

1. **Double-guard chống SQL injection trên sort**: `DokusyaRirekiQueryDto.@IsIn(ALLOWED_SORT_COLUMNS)` (dto:54) chặn ở DTO, `RIREKI_SORT_COLUMN_MAP` (service:439) map sang fully-qualified column — user input không bao giờ chạm raw SQL. Mẫu này nên copy cho mọi list endpoint.
2. **404-mask DataScope đúng chuẩn**: `fetchInScope` → `assertBranchScope` (service:1191-1201) che giấu sự tồn tại row ngoài phạm vi, đúng security.md Layer 2.
3. **Comment WHY thực chất**: pitfall `getRawMany` bỏ qua `take/skip` được giải thích rõ tại service:1169-1172 — bug thật đã từng xảy ra, comment ngăn tái phạm.
4. **Mapper thuần & nullable-faithful**: `toDokusyaRirekiListItem` giữ `null` cho join thiếu (kanri_shiten_name, zenkai_*) và `''` cho NOT NULL — đúng quy tắc serialize nullable; không emit `*_label` (đúng m_code rule cho authenticated endpoint).

### Weakness (điểm cần cải thiện)

1. **SELECT column list inline phình method**: ~60 dòng `.select([...])` nằm trong thân `getRirekiList` khiến method vượt ngưỡng 50 dòng. Khi `t_dokusya_rireki` thêm cột, method sẽ tiếp tục phình — gợi ý tách thành module const tương tự cách đã làm với `RIREKI_SORT_COLUMN_MAP`.
2. **Swagger response schema không đầy đủ cho SCR-013**: endpoint trả về interface `DokusyaRirekiListItem` (không phải class DTO) nên `@ApiResponse` không khai báo được `type` → `/api/docs` không hiển thị schema body. Quy trình gen-code chưa tạo `XxxResponseDto` class cho endpoint trả mapper-interface.

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 2 NOK đều 🟢 → Pass theo ruleset.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `dokusya.service.ts:1104-1165` | 4.4 | Tách `.select([...])` thành module const `RIREKI_SELECT_COLUMNS` (cạnh `RIREKI_SORT_COLUMN_MAP`); method còn ~50 dòng | ~10 phút |
| 2 | 🟢 | `dokusya.controller.ts:359` | 1.7 | Tạo `DokusyaRirekiResponseDto` (data: [DokusyaRirekiItemDto], meta) và gắn `@ApiResponse({status:200, type: DokusyaRirekiResponseDto})` | ~20 phút |

**Tổng effort dự kiến**: cả 2 đều là minor, có thể defer sang follow-up MR — đã ở mức "Pass". ~30 phút nếu muốn dọn sạch hoàn toàn.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 4.4 — getRirekiList quá dài do SELECT inline

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.service.ts:1104-1165 (≈60-line .select([...]) inside the method)
```

Suggested fix:
```diff
+// Cạnh RIREKI_SORT_COLUMN_MAP (service:444)
+const RIREKI_SELECT_COLUMNS = [
+  'r.dokusya_rireki_id AS dokusya_rireki_id',
+  'r.dokusya_id AS dokusya_id',
+  // … toàn bộ danh sách cột hiện tại …
+  'r.created_by AS created_by',
+] as const;
...
-      .select([
-        'r.dokusya_rireki_id AS dokusya_rireki_id',
-        // … 60 dòng …
-        'r.created_by AS created_by',
-      ])
+      .select([...RIREKI_SELECT_COLUMNS])
       .where('r.dokusya_id = :dokusya_id', { dokusya_id: id });
```

### NOK 1.7 — @ApiResponse 200 thiếu typed DTO

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.controller.ts:359
@ApiResponse({ status: 200, description: '履歴一覧（data/meta envelope）' })
```

Suggested fix:
```diff
+// dto/dokusya-rireki-response.dto.ts (new)
+export class DokusyaRirekiResponseDto {
+  @ApiProperty({ type: [/* DokusyaRirekiItemDto */] }) data: unknown[];
+  @ApiProperty() meta: { total: number; page: number; per_page: number; total_pages: number };
+}

// dokusya.controller.ts:359
- @ApiResponse({ status: 200, description: '履歴一覧（data/meta envelope）' })
+ @ApiResponse({ status: 200, type: DokusyaRirekiResponseDto })
```

---

**Lint note**: `node_modules/.bin/eslint` không tồn tại trong container `agrinews-backend-1` — lint không chạy được qua đường này (follow-up infra, không block review). `tsc --noEmit` đã xác nhận clean.
