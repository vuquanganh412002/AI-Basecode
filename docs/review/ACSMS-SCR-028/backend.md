# Báo cáo Code Review — ACSMS-SCR-028 (増減連絡票（販売店）出力画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/report/report.controller.ts, apps/backend/src/modules/report/report.service.ts, apps/backend/src/modules/report/zougen-report.service.ts, apps/backend/src/modules/report/zougen.mapper.ts, apps/backend/src/modules/report/pdf-export.service.ts, apps/backend/src/modules/report/report.module.ts, apps/backend/src/modules/report/dto/zougen-hanbaiten-query.dto.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Backend

## Files reviewed

**Backend** (7 source files):
- [`report.controller.ts`](apps/backend/src/modules/report/report.controller.ts) — 2 endpoints cho SCR-028 (`GET zougen-hanbaiten/preview`, `POST zougen-hanbaiten/export`)
- [`report.service.ts`](apps/backend/src/modules/report/report.service.ts) — facade, ủy quyền sang `ZougenReportService`
- [`zougen-report.service.ts`](apps/backend/src/modules/report/zougen-report.service.ts) — logic chính SCR-028 (query, DataScope, PDF, archive, audit)
- [`zougen.mapper.ts`](apps/backend/src/modules/report/zougen.mapper.ts) — pure transform: gộp lịch sử cùng ngày → phân loại tăng/giảm/đổi địa chỉ + pdfmake docDefinition
- [`pdf-export.service.ts`](apps/backend/src/modules/report/pdf-export.service.ts) — render pdfmake → Buffer (font IPAexGothic nhúng)
- [`report.module.ts`](apps/backend/src/modules/report/report.module.ts) — module wiring
- [`dto/zougen-hanbaiten-query.dto.ts`](apps/backend/src/modules/report/dto/zougen-hanbaiten-query.dto.ts) — query/body DTO dùng chung 028-001/028-002

> ⚠️ Môi trường: dev stack Docker (`agrinews-backend-1`) đang **down** → `tsc --noEmit` / `eslint` **không chạy được**. Các mục 1.1 / 4.21 dựa trên grep + đọc code, không có kết quả type-check/lint.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | kebab-case files, PascalCase+suffix classes, camelCase methods. tsc/eslint NOT run (backend container down) — verified by read + grep only. | — |
| 1.2 | Meaningful naming | ✅ OK | Domain terms preserved (`zougen`, `hanbaiten`, `kanri_shiten`, `tekiyo_date`); helpers `mergeSameDay`/`classifyDayChange`/`fetchZougenRows` self-describing. | — |
| 1.3 | Avoid all hardcode | ✅ OK | 1.3.a: no magic number in branching — `dokusya_shubetsu !== DokusyaShubetsu.DIGITAL` / `denshi_shonin_status = DenshiShoninStatus.APPROVED` use enums; `.length === 0` are array checks. 1.3.b: screen/table names extracted to consts (`ZOUGEN_SCREEN_NAME`, `ZOUGEN_TARGET_TABLE`); DTO validation messages inline but single-use per field. | — |
| 1.4 | No duplication | ✅ OK | Shared helpers used: `buildAuditCtx`, `applyBranchScope`, `AuditLogService.logExport`, `FileArchiveService.archive`. `entrySection` factored for 増部/減部 in mapper. `zougenBaseQuery`/`nichinoBaseQuery` intentionally separate (commented). | — |
| 1.5 | Complex logic commented | ✅ OK | `mergeSameDay`, `classifyDayChange`, `addressChangedFromRc`, `paginateZougenSubscribers` all carry WHY comments tied to change_notification_concept.md. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments match code. (One misleading comment about the transaction boundary is folded into 1.8 as the same root cause.) | — |
| 1.7 | Operation purpose commented | ✅ OK | `@ApiOperation` on every endpoint; JSDoc on all public service methods + private helpers. | — |
| 1.8 | Other relevant facts commented | ❌ NOK | Export does NOT wrap `t_file_download` insert (in `FileArchiveService.archive`, zougen-report.service.ts:203) + `t_log` insert (`logExport`, :239) in one transaction. api.md §4.5/4.6 and nestjs.md ("Main DML + Audit log must share one transaction") mandate atomicity. The comment at :221-222 ("no DML needs atomic pairing") contradicts the spec — an inaccurate transaction-boundary note. | 🟡 Major |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header comments. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Định dạng tốt; điểm duy nhất cần xử lý là ranh giới transaction (1.8) cho luồng export.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | 100% parameterized `.andWhere('… = :x', { x })`; JOIN ON conditions use literal booleans (`h.haiten_flg = false`), no user input; `CASE WHEN` columns carry no interpolation. | — |
| 2.2 | Authentication & Session management | ✅ OK | Controller-wide `@UseGuards(SessionAuthGuard, PermissionsGuard, ShitenRestrictedGuard)` + `@ApiCookieAuth('session_id')`. | — |
| 2.3 | Access Control sufficient | ✅ OK | `@Permissions('report.export_zougen_hanbaiten')` on both endpoints; `applyBranchScope` on every query (CHUOKAI/JA_HONTEN→ja_id, JA_KANRI_SHITEN→kanri_shiten_id) matching api.md §4.2; filter ids intersect DataScope so cross-tenant ids yield empty (no leak). | — |
| 2.4 | Security Configuration | ✅ OK | helmet / CORS / rate-limit applied at global bootstrap (main.ts), inherited by module. Not independently re-verified (container down). | — |
| 2.5 | No sensitive data exposure | ✅ OK | `afterValue` JSON excludes PII by design (:230-238 — only tekiyo_date, ids, counts, file_name); no logging of session/PII; response carries no secrets. | — |
| 2.6 | Attack Protection | ✅ OK | Global `forbidNonWhitelisted: true`; `sanitizeFilenamePart` strips `/\:*?"<>|_` before Content-Disposition; filename URL-encoded (RFC 5987). | — |
| 2.7 | No under-protected APIs | ✅ OK | Both SCR-028 endpoints carry `@Permissions`; no anonymous route. | — |
| 2.8 | Validate input and output | ❌ NOK | `issued_at` (optional string) has `@IsOptional` + `@IsString` + `@Matches` but no `@Transform(blankToUndef)` (dto:95-100). An `issued_at:""` would fail `@Matches` → 400 instead of being treated as absent. Latent (this app's FE always sends a valid value), but violates the documented optional-string gotcha. Rest of DTO exemplary (all `@ApiProperty`, all Japanese messages, arrays coerced via `toNumberArray`). | 🟢 Minor |
| 2.9 | Store data securely | ✅ OK | PDF persisted to S3 via `FileArchiveService` (not local disk); no password/OTP/token handled here. | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env apps/backend/src/modules/report` → 0 hits; secrets via ConfigService elsewhere. | — |

**Section 2 score**: 9 OK / 1 NOK / 0 NA — Bảo mật vững (injection, auth, DataScope, PII-safe audit). Chỉ thiếu `blankToUndef` cho một field optional (2.8, minor/latent).

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency introduced by SCR-028; `pdfmake` pre-existing (shared with SCR-026/029 report stack). | — |
| 3.2 | License agreements respected | ✅ OK | `pdfmake` is MIT; IPAexGothic font is IPA license (redistributable). No GPL/AGPL. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không phát sinh dependency mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | Verb-first: `previewZougenHanbaiten`, `exportZougenHanbaitenPdf`, `fetchZougenRows`, `buildZougenBaseName`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `(query, session, req)` consistent; mapper params `(rows, tekiyo, perPage, issuedAt)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guards/empty-checks return early (`if (!this.pdfService) throw`, `if (rows.length === 0) return { empty: true }`); happy path last; catch tail. | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `exportZougenHanbaitenPdf` ≈100 lines (zougen-report.service.ts:156-255) > 50-line guideline. Filename builders already extracted; the archive+audit block could become a private helper. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Mapper branches bounded (store-change / net±0 / address-change); complexity ≤10, nesting ≤3. | — |
| 4.6 | Variables well named | ✅ OK | `busuBefore/busuAfter`, `storeBefore/storeAfter`; `rmin/rmax` abbreviations explicitly documented. | — |
| 4.7 | General description for code paragraphs | ✅ OK | SELECT-column arrays + JOIN blocks carry section comments. | — |
| 4.8 | Description of changes | ✅ OK | 履歴刷新 Pha5 (`torikeshi_flg`) exclusion + 顧客要件 2026-07 changes annotated inline. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | `haitatsu_same_flg` subscriber/delivery address switching explained at both SQL and mapper sites. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space indentation, method-chain aligned (verified by read). | — |
| 4.11 | One command per line | ✅ OK | No `a(); b();` on one line. | — |
| 4.12 | Break sign for long lines | ✅ OK | Long SELECT list is one column per array element; query builders broken per `.andWhere`. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained `.leftJoin/.andWhere` indented one level. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of imported class names. | — |
| 4.15 | Functions named in common way | ✅ OK | `fetch*`, `build*`, `group*`, `paginate*` verb families consistent. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Exported mapper fns vs private service methods clearly separated. | — |
| 4.17 | Function name has meaning | ✅ OK | `mergeSameDay`, `classifyDayChange`, `addressChangedFromRc` — intent-revealing. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | DTO `ZougenHanbaitenQueryDto`, service `ZougenReportService`, entity `DokusyaRireki`. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | Module at `src/modules/report/`, entity at `src/database/entities/dokusya-rireki.entity.ts`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | dto/ + exceptions/ subfolders; 3-screen report module aggregates services in one folder (acceptable). | — |
| 4.21 | No redundant/unused lines | ✅ OK | No `console.*`, no commented-out code, imports all consumed. `noUnusedLocals` not verified via tsc (container down). | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Cấu trúc/naming sạch; chỉ method export dài quá 50 dòng (4.4, minor).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 9 | 1 | 0 | 10% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **38** | **3** | **1** | **7%** |

### Phân bổ severity 3 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 1 | 1.8 (transaction atomicity export) |
| 🟢 Minor | 2 | 2.8 (issued_at blankToUndef), 4.4 (export method length) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Facade + sub-service tách rõ; naming domain-preserving nhất quán. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | 🟡 (7/8 OK) | Comment dày và chính xác, trừ note về transaction (1.8) mâu thuẫn spec. |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ (2/2 OK) | Enum cho branching, helper dùng chung; không magic number. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | 🟢 (7/8 OK) | 3 lớp guard + DataScope + parameterized. Chỉ thiếu blankToUndef (2.8). |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (2/2 OK) | audit `afterValue` loại PII; file lưu S3. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 (1/2 OK) | `exportZougenHanbaitenPdf` ~100 dòng cần tách helper. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Không dead code, không console, indent chuẩn. |
| **Third Party** (3.1-3.2) | ✅ (2/2 OK) | Không dep mới; license sạch. |

### Strength (điểm mạnh đáng ghi nhận)

1. **DataScope + filter giao nhau chống rò rỉ tenant**: `zougenBaseQuery` bắt buộc `applyBranchScope` (r.ja_id / r.kanri_shiten_id) song song với filter `hanbaiten_id IN (...)` (zougen-report.service.ts:527-546) — id của JA/chi nhánh khác chỉ trả rỗng, không cần assert riêng. Mẫu này nên nhân rộng cho mọi list-report.
2. **Audit loại PII có chủ đích**: `afterValue` (zougen-report.service.ts:230-238) chỉ ghi điều kiện + số lượng, comment nói rõ "個人情報は含めない" — đúng nestjs.md §Audit Log.
3. **BE là nguồn chân lý duy nhất cho phân trang**: `paginateZougenSubscribers` được dùng chung cho cả preview lẫn PDF (zougen.mapper.ts:517, buildZougenDocDefinition:724) → trang n của PDF = trang n của preview, không lệch.
4. **Chống drift filter bằng base query dùng chung**: `zougenBaseQuery` là nền chung cho count/page-id/detail, comment giải thích lý do (zougen-report.service.ts:491-497) — thay đổi điều kiện chỉ sửa 1 nơi.
5. **Xử lý địa chỉ theo field-level rất kỹ**: `addressChangedFromRc` so sánh 5 field (kèm yubin_no) với fallback tránh báo nhầm khách mới (zougen.mapper.ts:283-337) — logic khó nhưng có comment đầy đủ.

### Weakness (điểm cần cải thiện)

1. **Ranh giới transaction không khớp spec (systemic)**: export ghi `t_file_download` (trong `FileArchiveService.archive`) và `t_log` (`logExport`) trên 2 connection rời — api.md §4.5/4.6 yêu cầu atomic. `FileArchiveService.archive` hiện không nhận `EntityManager`, nên đây là hạn chế thiết kế của service dùng chung (ảnh hưởng cả SCR-026/029), không riêng SCR-028. Comment tại :221-222 lại khẳng định "không có DML cần ghép nguyên tử" → cần sửa cả comment lẫn hành vi.
2. **`record_count` lệch định nghĩa spec**: `archive({ recordCount: rows.length })` và `afterValue.record_count = rows.length` dùng số dòng lịch sử thô, trong khi api.md §4.5 định nghĩa là "対象購読者件数" (số purchaser distinct — preview dùng `COUNT(DISTINCT dokusya_id)`). Chênh khi 1 khách có nhiều lịch sử cùng ngày. Minor nhưng là dữ liệu lưu vào `t_file_download`.
3. **Method export phình dần**: `exportZougenHanbaitenPdf` gộp fetch + group + build doc + generate + resolve JA + đặt tên + archive + audit trong 1 hàm ~100 dòng; khi thêm yêu cầu (vd. ZIP nhiều JA) sẽ vượt xa 50 dòng — nên tách helper sớm.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND ≤ 2 🟡 (đúng 1 🟡 + 2 🟢)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `zougen-report.service.ts:200-242` | 1.8 | Bọc `archive` + `logExport` trong `dataSource.transaction`; cho `FileArchiveService.archive` nhận `EntityManager` optional để ghi `t_file_download` cùng tx với `t_log`. Sửa comment :221-222. (Cross-service — cân nhắc gộp cùng SCR-026/029.) | 40-60 phút |
| 2 | 🟢 | `zougen-report.service.ts:216,235` | (spec §4.5) | Đổi `recordCount`/`record_count` sang số purchaser distinct: `new Set(rows.map(r => Number(r.dokusya_id))).size`. | 5 phút |
| 3 | 🟢 | `dto/zougen-hanbaiten-query.dto.ts:95` | 2.8 | Thêm `@Transform(blankToUndef)` trước `@IsOptional` cho `issued_at`. | 3 phút |
| 4 | 🟢 | `zougen-report.service.ts:184-242` | 4.4 | Tách khối "đặt tên + archive + audit" thành private `persistAndAudit(...)`. | 15 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~50 phút (item #1 là chính; #2-#4 optional có thể defer sang follow-up MR). Lưu ý item #1 mang tính systemic (chung FileArchiveService) nên nên xử lý một lần cho cả 3 màn report.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.8 — Export không atomic `t_file_download` + `t_log` (deviates api.md §4.5/4.6)

Hiện trạng:
```
apps/backend/src/modules/report/zougen-report.service.ts:203  (archive → INSERT t_file_download, own connection)
apps/backend/src/modules/report/zougen-report.service.ts:239  (logExport → INSERT t_log, own connection)
apps/backend/src/modules/report/zougen-report.service.ts:221-222 (comment mâu thuẫn spec)
```

```ts
// zougen-report.service.ts (hiện tại) — 2 ghi DB tách rời, không tx
const archived = await this.fileArchive.archive({ /* … INSERT t_file_download … */ });
// 操作ログ（4.6）— アーカイブと原子的に対にすべき DML がないため
// 単一トランザクションは組まず、標準コネクションで記録する。   ← comment sai
await this.auditLog.logExport(ctx, { operation: AuditOperation.EXPORT_PDF, afterValue });
```

Suggested fix (định hướng — cần đổi chữ ký `FileArchiveService.archive` để nhận `EntityManager`):
```diff
+ // S3 (external I/O) xong trước; 2 ghi DB (t_file_download + t_log) chung 1 tx (api.md §4.5/4.6).
+ const archived = await this.dataSource.transaction(async (manager) => {
+   const saved = await this.fileArchive.archive({ /* …params… */ }, manager);
+   const ctx = buildAuditCtx(session, req, ZOUGEN_SCREEN_NAME, ZOUGEN_TARGET_TABLE, saved.fileDownloadId);
+   await this.auditLog.logExport(ctx, { operation: AuditOperation.EXPORT_PDF, afterValue: buildAfterValue(saved) }, manager);
+   return saved;
+ });
- const archived = await this.fileArchive.archive({ /* …params… */ });
- const ctx = buildAuditCtx(session, req, ZOUGEN_SCREEN_NAME, ZOUGEN_TARGET_TABLE, archived.fileDownloadId);
- await this.auditLog.logExport(ctx, { operation: AuditOperation.EXPORT_PDF, afterValue });
```
Ghi chú: cần (a) inject `DataSource`, (b) `FileArchiveService.archive(params, manager?)` dùng `manager.getRepository(FileDownload)` khi có manager, (c) `AuditLogService.logExport(ctx, opts, manager?)` (đã có mẫu manager ở `logCreate/logUpdate/logDelete`). S3 upload vẫn ngoài tx (api.md ghi rõ). Đồng thời xoá/đổi comment :221-222 vì thực tế CÓ DML (`t_file_download`) cần ghép nguyên tử với `t_log`.

### NOK 2.8 — `issued_at` thiếu `@Transform(blankToUndef)`

`apps/backend/src/modules/report/dto/zougen-hanbaiten-query.dto.ts:95-100`
```ts
@IsOptional()
@IsString({ message: '発行日時は文字列で指定してください。' })
@Matches(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/, {
  message: '発行日時はYYYY/MM/DD HH:mm形式で指定してください。',
})
issued_at?: string;
```

Suggested fix:
```diff
+ const blankToUndef = ({ value }: { value: unknown }) =>
+   typeof value === 'string' && value.trim() === '' ? undefined : value;
...
+ @Transform(blankToUndef)
  @IsOptional()
  @IsString({ message: '発行日時は文字列で指定してください。' })
  @Matches(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/, {
    message: '発行日時はYYYY/MM/DD HH:mm形式で指定してください。',
  })
  issued_at?: string;
```
Reference: `.claude/rules/nestjs.md §DTO validation gotchas #1`.

### NOK 4.4 — `exportZougenHanbaitenPdf` quá dài (~100 dòng)

`apps/backend/src/modules/report/zougen-report.service.ts:156-255`

Suggested fix (định hướng): tách khối đặt-tên + archive + audit thành private helper để thân method chỉ còn: guard → fetch → empty-check → buildDoc → `persistAndAudit(...)`.
```diff
+ private async persistAndAudit(
+   buffer: Buffer, rows: ZougenRawRow[], reports: ZougenReport[],
+   query: ZougenHanbaitenQueryDto, session: SessionPayload, req: Request,
+ ): Promise<{ filename: string; asciiFilename: string }> {
+   // …resolveJa + buildZougenBaseName + archive + logExport (bọc tx theo NOK 1.8)…
+ }
```
(Có thể gộp cùng lần refactor NOK 1.8 để chỉ chạm method một lần.)
