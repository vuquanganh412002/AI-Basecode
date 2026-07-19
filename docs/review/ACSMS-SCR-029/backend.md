# Báo cáo Code Review — ACSMS-SCR-029 (増減通知（日本農業新聞）出力画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/report/report.controller.ts, report.service.ts, zougen-report.service.ts, zougen-nichino.mapper.ts, report-notification.service.ts, dto/zougen-nichino-query.dto.ts, report.module.ts, common/guards/shiten-restricted.guard.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Backend

## Files reviewed

**Backend** (8 source files):
- [`report.controller.ts`](apps/backend/src/modules/report/report.controller.ts) — endpoints ACSMS-API-029-001 (preview) / -002 (export)
- [`report.service.ts`](apps/backend/src/modules/report/report.service.ts) — facade delegating to ZougenReportService
- [`zougen-report.service.ts`](apps/backend/src/modules/report/zougen-report.service.ts) — SCR-028/029 query + export logic (preview/export/DataScope)
- [`zougen-nichino.mapper.ts`](apps/backend/src/modules/report/zougen-nichino.mapper.ts) — pure grouping/pagination + pdfmake doc definition
- [`report-notification.service.ts`](apps/backend/src/modules/report/report-notification.service.ts) — 日農 mail notification (fire-and-forget)
- [`dto/zougen-nichino-query.dto.ts`](apps/backend/src/modules/report/dto/zougen-nichino-query.dto.ts) — shared query/body DTO
- [`report.module.ts`](apps/backend/src/modules/report/report.module.ts) — module wiring
- [`common/guards/shiten-restricted.guard.ts`](apps/backend/src/common/guards/shiten-restricted.guard.ts) — shiten_id runtime guard

> Environment note: `agrinews-backend-1` container is down, so `tsc --noEmit` / `eslint` / `jest` were **not** run. All verdicts below come from static source reading + host-side grep. Magic-number / process.env / guard scans ran clean.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | kebab-case files, PascalCase+suffix classes (ZougenReportService, ReportNotificationService, ZougenNichinoQueryDto), camelCase methods; tsc/lint not run (container down). | — |
| 1.2 | Meaningful naming | ✅ OK | Domain terms preserved (nichino, kanri_shiten, tekiyo_date, dokusya_busu); booleans empty/diff_mark; no orphan data/temp/result. | — |
| 1.3 | Avoid all hardcode | ✅ OK | Branching uses named enums (ItakuKubun.NICHINO_ITAKU, DokusyaShubetsu.DIGITAL, DenshiShoninStatus.APPROVED, DownloadType.ZOUGEN_NICHINO, RoleCode.JA_KANRI_SHITEN, AuditOperation.EXPORT_PDF); only `.length === 0` numeric compares (array-empty, allowed). Messages single-use screen-design literals. | — |
| 1.4 | No duplication | ✅ OK | Shared helpers used: applyBranchScope, buildAuditCtx, auditLog.logExport/logError, FileArchiveService.archive; nichinoBaseQuery is single source for count/preview/export to prevent filter drift. | — |
| 1.5 | Complex logic commented | ✅ OK | classifyNichino store-change split, fire-and-forget mail, page-break/累計 rationale all carry WHY comments. | — |
| 1.6 | Comments accurate & up-to-date | ❌ NOK | dto:99/101 Swagger says `未指定時は15` + `default: 15` but real default is `ZOUGEN_NICHINO_PER_PAGE = 28` (mapper:108) — doc drift from the 15→28 change. | 🟢 Minor |
| 1.7 | Operation purpose commented | ✅ OK | Both endpoints have @ApiOperation; public service methods + mapper functions have JSDoc. | — |
| 1.8 | Other relevant facts commented | ✅ OK | No-PII audit note (service:399), non-fatal mail note (notification:19-25), single-tx-not-needed rationale (service:390). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Chỉ 1 lỗi doc-drift nhỏ (default 15 vs 28 thực tế) ở DTO Swagger; cần đồng bộ giá trị.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | 100% parameterized (`:tekiyo_date`, `IN (:...kanri_shiten_id)`); JOIN ON + CASE WHEN are static SQL, no string interpolation. | — |
| 2.2 | Authentication & Session management | ✅ OK | Controller `@UseGuards(SessionAuthGuard, PermissionsGuard, ShitenRestrictedGuard)` + `@ApiCookieAuth('session_id')`. | — |
| 2.3 | Access Control sufficient | ✅ OK | `@Permissions('report.export_zougen_nichino')` on both endpoints; applyBranchScope in nichinoBaseQuery covers preview+export; kanri_shiten_id filter AND-combined with scope so out-of-scope IDs return 0 rows. Single-record/FK/update layers not applicable. | — |
| 2.4 | Security Configuration | ✅ OK | helmet/CORS/rate-limit are app-global (main.ts); not modified by SCR-029 scope. | — |
| 2.5 | No sensitive data exposure | ✅ OK | Audit afterValue = conditions + counts only (service:400-407, explicit no-PII comment); mail body has no subscriber PII; maskEmail in logs; no secrets in response. | — |
| 2.6 | Attack Protection | ✅ OK | Global `forbidNonWhitelisted:true` + DTO whitelist reject unknown body keys. | — |
| 2.7 | No under-protected APIs | ✅ OK | Both endpoints carry @Permissions; no unguarded route. | — |
| 2.8 | Validate input and output | ✅ OK | DTO: all fields @ApiProperty + class-validator with Japanese messages; toNumberArray transform; ValidateNested for remarks[]; Min/Max on page/per_page. | — |
| 2.9 | Store data securely | ✅ OK | PDF persisted to S3 via FileArchiveService (not local disk); no password/OTP/token handled here. | — |
| 2.10 | No hardcoded credentials | ✅ OK | `grep process.env` = 0 hits in scope; SMTP/S3 creds resolved via ConfigService in Mail/FileArchive services. | — |

**Section 2 score**: 10 OK / 0 NOK / 0 NA — Bảo mật đầy đủ: SQL tham số hóa, 3 guard, DataScope, audit không lộ PII.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency in SCR-029 scope (pdfmake, class-validator, typeorm all pre-existing). | — |
| 3.2 | License agreements respected | ✅ OK | No new deps introduced; existing stack is MIT/Apache. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | previewZougenNichino / exportZougenNichinoPdf / notifyNichinoExport / classifyNichino / groupZougenNichinoReports / paginateNichinoSubscribers. | — |
| 4.2 | Descriptive parameter names | ✅ OK | notifyNichinoExport uses option-object `params: { session, todofukenName, tekiyoDate, fileName, recordCount }`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guard/early-return at top (`if (!this.pdfService) throw`, `if (rows.length===0) return { empty:true }`), happy return at bottom. | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | exportZougenNichinoPdf spans 120 lines (zougen-report.service.ts:305-424) > 50; filename-build + archive + notify + audit inlined. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Cyclomatic ≤10, nesting ≤3 across service/mapper. | — |
| 4.6 | Variables well named | ✅ OK | Loop vars `for (const r of rows)` / `for (const id of dokusyaOrder)`; no obj/arr/temp. | — |
| 4.7 | General description for code paragraphs | ✅ OK | SELECT column blocks + JOIN blocks carry section comments. | — |
| 4.8 | Description of changes | ✅ OK | 顧客要件2026-07 / 履歴刷新Pha5 references anchor each business change. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | formatKanriShitenCode regex has example (1AA3300001 → 1AA-3300-001); store-change split explained. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space indentation consistent; method chains dot-aligned. | — |
| 4.11 | One command per line | ✅ OK | No multi-statement lines. | — |
| 4.12 | Break sign for long lines | ✅ OK | Long SELECT strings are one-per-array-element, readable. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained QueryBuilder calls indented 1 level. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of imported types. | — |
| 4.15 | Functions named in common way | ✅ OK | fetchXxxRows / previewXxx / exportXxxPdf consistent. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module-pure helpers (num/str/itakuLabel) file-local; exported transforms named. | — |
| 4.17 | Function name has meaning | ✅ OK | No do()/process()/handle() orphans. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | DTO ZougenNichinoQueryDto/ZougenNichinoRemarkDto; entity PascalCase (DokusyaRireki, Account). | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | BE at src/modules/report/; entity at src/database/entities/. | — |
| 4.20 | Folder content conforms standard | ✅ OK | controller/service/dto/mapper split matches project-structure.md. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code / TODO / console.* / unused import (grep clean). | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Chỉ 1 method (exportZougenNichinoPdf) dài 120 dòng; nên tách private helper.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 10 | 0 | 0 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **39** | **2** | **1** | **5%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 2 | 1.6 (doc-drift default 15→28), 4.4 (method 120 dòng) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Facade + sub-service tách sạch; naming nhất quán. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | 🟡 (7/8 OK) | Comment WHY tốt, nhưng còn giá trị stale (default 15). |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ (2/2 OK) | Enum hoá đầy đủ; helper chung được dùng lại. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ (8/8 OK) | 3 guard + DataScope + SQL tham số hóa. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (2/2 OK) | Audit/mail không lộ PII; lưu S3. |
| **Code Length & Complexity** (4.4, 4.5) | 🟡 (1/2 OK) | exportZougenNichinoPdf 120 dòng. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Không dead-code/console/TODO. |
| **Third Party** (3.1-3.2) | ✅ (2/2 OK) | Không thêm dep. |

### Strength (điểm mạnh đáng ghi nhận)

1. **DataScope một nguồn duy nhất**: `nichinoBaseQuery` gọi `applyBranchScope` và được dùng chung cho count/preview/export (zougen-report.service.ts:702) → không thể drift filter giữa các đường dẫn — mẫu này nên copy cho mọi report screen.
2. **Audit không lộ PII, có chủ đích**: afterValue chỉ log điều kiện + số lượng, kèm comment rõ ràng (zougen-report.service.ts:399-407); log lỗi chạy ngoài đường dẫn thành công (logError).
3. **Mail notification fire-and-forget non-fatal**: `notifyRoles` không bao giờ throw; lỗi từng người nhận được skip + warn, S3/audit không bị ảnh hưởng bởi lỗi mail (report-notification.service.ts:19-25, 66-77).
4. **Preview và PDF chia sẻ đúng một hàm phân trang** (`paginateNichinoSubscribers`) → "trang n của PDF = trang n của preview" được đảm bảo về mặt cấu trúc, không phải bằng thỏa thuận ngầm.

### Weakness (điểm cần cải thiện)

1. **Doc-drift khi đổi hằng số**: default per-page đã đổi 15→28 nhưng Swagger `default: 15` ở DTO không được cập nhật. Gốc rễ: hằng số `ZOUGEN_NICHINO_PER_PAGE` được duplicate (BE mapper + FE view) thay vì 1 nguồn chia sẻ, nên comment/doc trôi độc lập. Thiếu bước "grep giá trị cũ toàn repo" khi đổi.
2. **Method phình dần theo yêu cầu**: exportZougenNichinoPdf gộp build-filename (rẽ theo role) + archive + notify + audit trong 1 hàm 120 dòng — sẽ còn dài thêm khi quy tắc filename/mail mở rộng; nên tách sớm.

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 2 NOK đều 🟢 → theo ruleset là **Pass**.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `dto/zougen-nichino-query.dto.ts:99,101` | 1.6 | Sửa Swagger `default: 15` + text `未指定時は15` → `28` (khớp ZOUGEN_NICHINO_PER_PAGE); cân nhắc import hằng số thay vì literal. | 3 phút |
| 2 | 🟢 | `zougen-report.service.ts:305-424` | 4.4 | Tách `buildNichinoBaseName()` + `archiveNichinoPdf()` (hoặc gộp archive+notify+audit) thành private để hàm chính < 60 dòng. | 20 phút |

**Tổng effort dự kiến để giữ verdict "Pass" và dọn sạch NOK**: ~25 phút; item #2 optional có thể defer sang follow-up MR (không phải blocker).

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.6 — Swagger default 15 lệch với giá trị thực 28

Hiện trạng:
```
apps/backend/src/modules/report/dto/zougen-nichino-query.dto.ts:99
apps/backend/src/modules/report/dto/zougen-nichino-query.dto.ts:101
```

```ts
  @ApiPropertyOptional({
    description: '1ページの販売店行数（1〜500。≒購読者数）。preview のみ。未指定時は15',
    example: 15,
    default: 15,
  })
```

Suggested fix:
```diff
  @ApiPropertyOptional({
-    description: '1ページの販売店行数（1〜500。≒購読者数）。preview のみ。未指定時は15',
-    example: 15,
-    default: 15,
+    description: '1ページの販売店行数（1〜500。≒購読者数）。preview のみ。未指定時は28',
+    example: 28,
+    default: 28,
  })
```
(Giá trị thực do service dùng `query.per_page ?? ZOUGEN_NICHINO_PER_PAGE` với `ZOUGEN_NICHINO_PER_PAGE = 28` ở zougen-nichino.mapper.ts:108. Lý tưởng: `default: ZOUGEN_NICHINO_PER_PAGE` để không drift lần sau.)

### NOK 4.4 — exportZougenNichinoPdf quá dài (120 dòng)

Hiện trạng:
```
apps/backend/src/modules/report/zougen-report.service.ts:305-424  (exportZougenNichinoPdf)
```

Suggested fix (trích ví dụ — tách phần build tên file ra private):
```diff
+  /** SCR-029 表示ファイル名（拡張子・タイムスタンプ無し・ロール別）。 */
+  private buildNichinoBaseName(
+    tekiyoDate: string,
+    roleCode: string,
+    jaCode: string,
+    jaName: string,
+    firstRow: ZougenNichinoRawRow | undefined,
+  ): string {
+    const ymd = tekiyoDate.replaceAll('-', '');
+    const name = sanitizeFilenamePart(jaName);
+    if (roleCode === RoleCode.JA_KANRI_SHITEN) {
+      const ksName = sanitizeFilenamePart(firstRow?.kanri_shiten_name ?? '');
+      const ksCode = firstRow?.kanri_shiten_code ?? '';
+      return `増減通知_${name}_${jaCode}_${ksName}_${ksCode}_${ymd}`;
+    }
+    return `増減通知_${name}_${jaCode}_${ymd}`;
+  }
```
```diff
-      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
-      const jaName = sanitizeFilenamePart(ja.name);
-      const jaCode = ja.code;
-      let baseName: string;
-      if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
-        const ksName = sanitizeFilenamePart(rows[0]?.kanri_shiten_name ?? '');
-        const ksCode = rows[0]?.kanri_shiten_code ?? '';
-        baseName = `増減通知_${jaName}_${jaCode}_${ksName}_${ksCode}_${ymd}`;
-      } else {
-        baseName = `増減通知_${jaName}_${jaCode}_${ymd}`;
-      }
+      const ja = await this.fileArchive.resolveJa(session.ja_id ?? null);
+      const baseName = this.buildNichinoBaseName(
+        query.tekiyo_date, session.role_code, ja.code, ja.name, rows[0],
+      );
```
(Đối xứng với `buildZougenBaseName` đã có cho SCR-028; giảm hàm chính xuống < 60 dòng. Không bắt buộc — Minor.)
