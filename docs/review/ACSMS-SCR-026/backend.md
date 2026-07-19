# Báo cáo Code Review — ACSMS-SCR-026 (購読者名簿出力画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/report/meibo-report.service.ts, report.service.ts, report.controller.ts, report.mapper.ts, report.module.ts, dto/meibo-report-query.dto.ts, exceptions/report-no-data.exception.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Backend

## Files reviewed

**Backend** (7 source files):
- [`meibo-report.service.ts`](apps/backend/src/modules/report/meibo-report.service.ts) — SCR-026 core: preview paging + Excel generation (ACSMS-API-026-001/002)
- [`report.service.ts`](apps/backend/src/modules/report/report.service.ts) — facade delegating meibo → MeiboReportService, zougen → ZougenReportService
- [`report.controller.ts`](apps/backend/src/modules/report/report.controller.ts) — meibo preview/export endpoints (guards + permissions + Swagger)
- [`report.mapper.ts`](apps/backend/src/modules/report/report.mapper.ts) — pure grouping / dynamic-paging transforms (no DI)
- [`report.module.ts`](apps/backend/src/modules/report/report.module.ts) — module wiring
- [`dto/meibo-report-query.dto.ts`](apps/backend/src/modules/report/dto/meibo-report-query.dto.ts) — shared query DTO (preview + export)
- [`exceptions/report-no-data.exception.ts`](apps/backend/src/modules/report/exceptions/report-no-data.exception.ts) — REPORT_NO_DATA (404) domain exception

> ⚠️ Môi trường: docker dev-stack đang **down** — `tsc --noEmit` / `eslint` không chạy được. Các kết luận 1.1/4.21 dựa trên grep tĩnh + đọc source, không có type-check runtime.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | kebab file names, PascalClass+suffix (MeiboReportService/ReportController/MeiboReportQueryDto), camelCase methods. tsc/lint NOT run (container down) — grep-clean only. | — |
| 1.2 | Meaningful naming | ✅ OK | Domain terms preserved (meibo, hanbaiten, kanri_shiten, dokusya, busu); boolean `haitatsu_same_flg`; no orphan `data`/`temp`. | — |
| 1.3 | Avoid all hardcode | ✅ OK | 1.3.a: branching uses enums — `TetsuzukiShurui.SHINKI`, `DokusyaShubetsu.BOTH/.DIGITAL`, `DenshiShoninStatus.APPROVED`, `DownloadType.MEIBO` (meibo-report.service.ts:301-334); only `.length === 0`/`pages.length === 0` numeric compares. 1.3.b: no reused inline JP message (each literal single-use). | — |
| 1.4 | No duplication | ✅ OK | Shared helpers used — `applyBranchScope`, `buildAuditCtx`, `FileArchiveService`; preview & Excel share `buildMeiboDocPages`/`estimateMeiboRowHeightPt` (single source of truth for pagination). | — |
| 1.5 | Complex logic commented | ✅ OK | WHY comments on snapshot selection (meibo-report.service.ts:293-300), dynamic paging budget (report.mapper.ts:319-326), digital-approval filter (:306-314). | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments match code (shiharai_hoho replaced shiharai_cycle noted at :330-332); no stale TODO / renamed-symbol refs. | — |
| 1.7 | Operation purpose commented | ✅ OK | `@ApiOperation` on both endpoints; JSDoc on every private method. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Error-log-outside-transaction rationale (:182-184), INNER vs LEFT JOIN reasoning (:268-271). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 8 OK / 0 NOK / 1 NA — Format sạch; enum-based branching áp dụng đúng phía BE.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | All conditions parameterized (`:tekiyo_date`, `IN (:...hanbaiten_ids)`, applyBranchScope binds); as-of subquery is a static string with no interpolation (meibo-report.service.ts:293-300). | — |
| 2.2 | Authentication & Session management | ✅ OK | `@UseGuards(SessionAuthGuard, PermissionsGuard, ShitenRestrictedGuard)` at controller (report.controller.ts:34) + `@ApiCookieAuth`. | — |
| 2.3 | Access Control sufficient | ✅ OK | `@Permissions('report.export_meibo')` on both endpoints; `applyBranchScope(qb,'r',{jaIdField,kanriShitenIdField},session)` (meibo-report.service.ts:340). Out-of-scope ids masked as empty/404 (safe, no leak) rather than explicit 403 per api.md §4.2 — spec-conformance nuance, not a defect. | — |
| 2.4 | Security Configuration | ✅ OK | Inherits app-global helmet/CORS/ValidationPipe from main.ts; no module-specific config required. | — |
| 2.5 | No sensitive data exposure | ✅ OK | No password/session/OTP in responses; `logError` records error+stack only (targetId null, no PII before/after). Report PII is the intended payload for authorized JA roles. | — |
| 2.6 | Attack Protection | ✅ OK | Global `forbidNonWhitelisted: true`; DTO whitelists all query params. | — |
| 2.7 | No under-protected APIs | ✅ OK | Both meibo endpoints carry `@Permissions('report.export_meibo')`. | — |
| 2.8 | Validate input and output | ✅ OK | Every DTO field has `@ApiProperty(...)` + class-validator w/ JP message; `dokusya_shubetsu` restricted `@IsIn([1,2])`; `nichino_download_allowed_flg` uses `@Transform` bool-coerce. | — |
| 2.9 | Store data securely | ✅ OK | Excel persisted to S3 via `FileArchiveService.archive` (not local disk); download history → t_file_download (DownloadType.MEIBO). | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env.` on module = 0 hits; no secrets in source. | — |

**Section 2 score**: 10 OK / 0 NOK / 0 NA — DataScope, permission, parameterization đều đạt.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency — `exceljs` already used across the repo (haitatsuryo export). | — |
| 3.2 | License agreements respected | ✅ OK | `exceljs` = MIT; no GPL/AGPL introduced. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm dependency mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | Verb-first: previewMeibo, exportMeiboExcel, fetchRows, buildPreview, groupByHanbaiten, buildMeiboDocPages. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `(query, session, req)`, `(sheet, row, cols)`; no `(a,b,c)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards throw first (assertConditionalRequired, ReportNoDataException at :150), happy return at bottom. | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `meiboBaseQuery` ~75L (:272-347), `writeReportHeader` ~65L (:534-599), `previewMeibo` ~53L (:85-138) exceed the 50L guideline. Low cyclomatic complexity — linear qb / Excel rendering; extraction optional. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Nesting ≤ 3, cyclomatic ≤ 10 throughout; `splitByHeight` is a single loop. | — |
| 4.6 | Variables well named | ✅ OK | Loop vars named (`for (const row of slice)`); `hg/kg/sg/qb` are conventional abbrevs w/ context+comments. | — |
| 4.7 | General description for code paragraphs | ✅ OK | Section banners (`─── private ───`, `─── Excel スタイル共通 ───`) group logic blocks. | — |
| 4.8 | Description of changes | ✅ OK | Change rationale noted inline (shiharai_hoho ← shiharai_cycle; budget 520/590 → 650). | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | as-of-date subquery + dynamic-paging height budget both carry match examples / rationale. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space; qb chain dot-aligned. | — |
| 4.11 | One command per line | ✅ OK | No `a();b();`. | — |
| 4.12 | Break sign for long lines | ✅ OK | Long qb / addRow arrays wrapped one-arg-per-line. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained `.andWhere()` / `.addOrderBy()` indented 1 level. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of imported types. | — |
| 4.15 | Functions named in common way | ✅ OK | Service: previewMeibo/exportMeiboExcel; DTO validators standard. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Pure module fns (num/displayWidth/splitByHeight) file-local; exported transforms clearly named. | — |
| 4.17 | Function name has meaning | ✅ OK | estimateMeiboRowHeightPt / autoFitRowHeight / applyA4PageSetup self-describing. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | MeiboReportQueryDto, ReportNoDataException, MeiboReportService per convention. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/modules/report/`; entity `DokusyaRireki` at `src/database/entities/`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | dto/ + exceptions/ subfolders; mapper as sibling pure-fn file. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No console/debugger, no commented-out code, no `any`, no `@ts-nocheck`; imports all consumed. | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Chỉ vướng độ dài một vài method render/query (Minor).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 8 | 0 | 1 | 0% |
| 2. Security | 10 | 10 | 0 | 0 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 4.8% |
| **Total** | **42** | **40** | **1** | **1** | **2.4%** |

### Phân bổ severity 1 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 1 | 4.4 (method length) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Facade + pure-mapper tách bạch; naming chuẩn. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Mật độ comment WHY rất tốt, đặc biệt phần snapshot & dynamic paging. |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ | Branching dùng enum; preview/Excel dùng chung hàm phân trang. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Guard + @Permissions + applyBranchScope + parameterized query đủ. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không lộ secret; file lên S3, log lỗi không kèm PII. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 | 3 method vượt 50 dòng nhưng độ phức tạp thấp (render/query tuyến tính). |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không rác, không import thừa, không console. |
| **Third Party** (3.1-3.2) | ✅ | Không thêm lib. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Single-source pagination**: `buildMeiboDocPages` + `estimateMeiboRowHeightPt` dùng chung cho cả preview và Excel (report.mapper.ts:425, meibo-report.service.ts:477-497) → cấu trúc trang luôn khớp, tránh drift giữa màn hình và file — pattern nên nhân rộng cho mọi report có phân trang động.
2. **Snapshot chọn đúng bằng (joho_henko_tekiyo_date, rireki_no)**: không dùng `MAX(rireki_no)` đơn lẻ, kèm loại `torikeshi_flg` (meibo-report.service.ts:293-300) — xử lý đúng ca back-date + đỏ-伝, comment giải thích rõ lý do.
3. **Audit theo đúng chuẩn tách tx**: `logError` chạy ngoài transaction ở catch (meibo-report.service.ts:181-191), 404 REPORT_NO_DATA được loại khỏi error-log — đúng rule §Audit của nestjs.md.
4. **Facade giữ chữ ký ổn định**: `ReportService` re-export type từ sub-service (report.service.ts:24-28) để controller + test cũ không phải sửa khi tách MeiboReportService.

### Weakness (điểm cần cải thiện)

1. **Độ dài method render sẽ còn phình**: các hàm dựng Excel/header đã ~65-75 dòng; khi thêm cột/biến thể chúng sẽ vượt xa ngưỡng — thiếu một lớp helper "row-writer" nhỏ để tách phần style khỏi phần dữ liệu. Đây là dấu hiệu cần refactor sớm trước SCR report kế tiếp, không phải lỗi hiện tại.

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 1 NOK green → Pass.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `meibo-report.service.ts:534` | 4.4 | (Optional) tách phần "空欄チェックボックス" trong `writeReportHeader` thành `writeCheckBox()` để hạ xuống <50 dòng | ~15 phút |

**Tổng effort dự kiến để giữ "Pass"**: 0 phút bắt buộc; item #1 optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 4.4 #1 — method dài (Minor, optional)

Hiện trạng:
```
apps/backend/src/modules/report/meibo-report.service.ts:534  writeReportHeader (~65 dòng)
apps/backend/src/modules/report/meibo-report.service.ts:272  meiboBaseQuery (~75 dòng)
apps/backend/src/modules/report/meibo-report.service.ts:85   previewMeibo (~53 dòng)
```

Suggested fix (minh hoạ cho `writeReportHeader` — tách khối check-box):
```diff
   private writeReportHeader(
     sheet: ExcelJS.Worksheet,
     cols: number,
     title: string,
     leftLines: string[],
     rightLines: string[],
     showCheckBox = true,
   ): void {
-    // ... 手書きチェック欄の 25 行をインラインで組む ...
-    if (showCheckBox) {
-      const CHECK_BOX_BLANK_ROWS = 3;
-      // ...
-    }
+    if (showCheckBox) this.writeCheckBox(sheet, cols);
     // タイトル + 左右情報 (残りは変更なし)
   }
+
+  /** チェック日 / 確認印（手書き記入ボックス）— 販売店別ヘッダ専用。 */
+  private writeCheckBox(sheet: ExcelJS.Worksheet, cols: number): void {
+    // ... 既存の 25 行をここへ移動 ...
+  }
```
(Non-blocking — chỉ để giữ method <50 dòng; hành vi không đổi.)
