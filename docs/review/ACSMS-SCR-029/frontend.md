# Báo cáo Code Review — ACSMS-SCR-029 (増減通知（日本農業新聞）出力画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/report/ZougenNichinoReportView.vue, apps/frontend/src/api/report/report.ts, apps/frontend/src/router/index.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Frontend

## Files reviewed

**Frontend** (3 source files):
- [`views/report/ZougenNichinoReportView.vue`](apps/frontend/src/views/report/ZougenNichinoReportView.vue) — 出力条件 → preview / 電子帳票作成
- [`api/report/report.ts`](apps/frontend/src/api/report/report.ts) — hand-written wrapper (previewZougenNichino / exportZougenNichino), usage only
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L367) (entries L361-L375)

> Environment note: `agrinews-frontend-1` container is down, so `vue-tsc --noEmit` / `eslint` / `vitest` were **not** run. All verdicts below come from static source reading + host-side grep (localStorage / console / v-html / any-type scans ran clean).

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | PascalCase view (ZougenNichinoReportView.vue), `<script setup lang="ts">` Composition API, kebab-case api file; vue-tsc/lint not run (container down). | — |
| 1.2 | Meaningful naming | ✅ OK | canUse / hasReports / noDataMessage / previewData / currentPage; domain terms (kanri_shiten, tekiyo_date, gen_busu) preserved. | — |
| 1.3 | Avoid all hardcode | ✅ OK | No magic-number branching (only `.length === 0` array checks); messages are single-use screen-design literals (MSG-029-001/002/004/005). | — |
| 1.4 | No duplication | ✅ OK | Uses BaseKanriShitenSelect / BaseReportPager / useNotify / formatJpDate; `groupKanriShitenCode` + `formatGenBusu` are intentional documented FE mirrors of the BE mapper. | — |
| 1.5 | Complex logic commented | ✅ OK | Page-refetch reset, `?.trim()` clear-icon guard, remarks→body conversion all carry WHY comments. | — |
| 1.6 | Comments accurate & up-to-date | ❌ NOK | Header comment `15販売店行/ページ` (view:3) + `1ページ=A4 1枚＝15販売店行` (view:52) contradict actual `ZOUGEN_NICHINO_PER_PAGE = 28` (view:55); router:362 says `複数管理支店は ZIP` but design 3.2 is a single PDF (no ZIP). | 🟢 Minor |
| 1.7 | Operation purpose commented | ✅ OK | onPreview / onExport / fetchPage / buildExportQuery each have purpose comments. | — |
| 1.8 | Other relevant facts commented | ✅ OK | no-data 200-reports:[] handling, interceptor-already-toasted rationale in catch blocks. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Chỉ lỗi comment stale (15 vs 28 thực tế + ghi chú ZIP đã bỏ); logic không ảnh hưởng.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE) — no SQL on FE. | — |
| 2.2 | Authentication & Session management | ✅ OK | Session via HttpOnly cookie (axiosInstance withCredentials); no token in localStorage (grep clean). | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: 'report.export_zougen_nichino'`; buttons `:disabled="!canUse"` / `:disabled="!canUse || !hasReports"`; MSG-029-001 alert when `!canUse`. | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE) — helmet/CORS are BE-side. | — |
| 2.5 | No sensitive data exposure | ✅ OK | No console logging; no PII persisted; success toast text only. | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html` (grep clean); all interpolation via `{{ }}` auto-escaped. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE) — endpoint guards are BE-side. | — |
| 2.8 | Validate input and output | ✅ OK | `validate()` mirrors BE: tekiyo_date required (`?.trim()` for a-date-picker clear), kanri_shiten_id ≥ 1 required; buildQuery/buildExportQuery shape correct. | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE) — no client-side persistence. | — |
| 2.10 | No hardcoded credentials | ✅ OK | No secrets/tokens in view or wrapper. | — |

**Section 2 score**: 6 OK / 0 NOK / 4 NA — Không lộ dữ liệu, không token localStorage, permission gate đủ; các mục thuần BE đánh NA.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency (ant-design-vue, existing composables/components reused). | — |
| 3.2 | License agreements respected | ✅ OK | No new deps introduced. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | onPreview / onExport / onPageChange / fetchPage / runExport / buildExportQuery. | — |
| 4.2 | Descriptive parameter names | ✅ OK | fetchPage(page) / onPageChange(page) / groupKanriShitenCode(code). | — |
| 4.3 | Normal path distinguishable | ✅ OK | validate() guard returns early; happy path continues below. | — |
| 4.4 | Operation not too long (extract private) | ✅ OK | Longest fn ~17 lines (runExport/fetchPage); all well under limit. | — |
| 4.5 | Decision points limited | ✅ OK | Low branching; nesting ≤2. | — |
| 4.6 | Variables well named | ✅ OK | report / row loop vars; entries in buildExportQuery. | — |
| 4.7 | General description for code paragraphs | ✅ OK | Template sections (出力条件 / プレビュー / ページャ) commented. | — |
| 4.8 | Description of changes | ✅ OK | 顧客要件2026-07 anchors on formatGenBusu / per-page. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | groupKanriShitenCode has example + why-separate-from-formatters comment. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space; template nesting consistent. | — |
| 4.11 | One command per line | ✅ OK | No multi-statement lines. | — |
| 4.12 | Break sign for long lines | ✅ OK | Long template rows wrapped in colgroup/thead. | — |
| 4.13 | Continuation line indent | ✅ OK | Multi-line reactive/objects indented. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing. | — |
| 4.15 | Functions named in common way | ✅ OK | onXxx handlers / buildXxx / fetchXxx consistent. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Local helpers (validate/buildQuery) vs imported api functions. | — |
| 4.17 | Function name has meaning | ✅ OK | No do()/handle() orphans. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | useAuthStore / useNotify; interfaces ZougenNichinoQuery/PreviewData. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | FE at src/views/report/; wrapper at src/api/report/. | — |
| 4.20 | Folder content conforms standard | ✅ OK | view + api wrapper + router entry match project-structure.md. | — |
| 4.21 | No redundant/unused lines | ✅ OK | All imports used (formatJpDate, Modal, BaseReportPager, BaseKanriShitenSelect); no console/TODO/dead code. | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Cấu trúc view gọn, hàm ngắn, không dead-code.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 6 | 0 | 4 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **36** | **1** | **5** | **2%** |

### Phân bổ severity 1 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 1 | 1.6 (comment stale: 15 vs 28, ghi chú ZIP đã bỏ) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | `<script setup>`, naming chuẩn, reuse Base components. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | 🟡 (7/8 OK) | Comment WHY tốt; còn giá trị/ghi chú stale (15, ZIP). |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ (2/2 OK) | Không magic number branching; mirror FE/BE có chủ đích. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ (5/5 OK relevant) | Permission gate + disabled buttons; các mục BE đánh NA. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (1/1 OK relevant) | Không console/PII; 2.9 NA (không lưu client). |
| **Code Length & Complexity** (4.4, 4.5) | ✅ (2/2 OK) | Hàm ngắn, ít nhánh. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Không dead-code/console/TODO. |
| **Third Party** (3.1-3.2) | ✅ (2/2 OK) | Không thêm dep. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Mirror FE/BE có tài liệu**: `formatGenBusu` (view:85) và `groupKanriShitenCode` (view:71) sao chép logic hiển thị từ BE mapper với comment giải thích tại sao tách khỏi `formatters.formatKanriShitenCode` (digit-only) → preview và PDF hiển thị đồng nhất.
2. **Xử lý no-data đúng chuẩn dự án**: cả preview và export coi 200 + `reports:[]` là "không có dữ liệu" (view:138, 174) → hiển thị text trong màn, không toast (đúng Error Handling Architecture).
3. **Guard clear-icon**: `formState.tekiyo_date?.trim()` (view:93) né TypeError khi a-date-picker bị clear về undefined — đúng lesson đã ghi trong rule.
4. **Permission-aware UX**: nút disabled thay vì ẩn + alert MSG-029-001, giữ tính khám phá được của chức năng cho JA role.

### Weakness (điểm cần cải thiện)

1. **Comment trôi theo thay đổi hằng số/thiết kế**: giá trị per-page đổi 15→28 nhưng 2 comment trong view vẫn ghi 15; router vẫn ghi "ZIP" dù thiết kế đã chuyển sang 1 PDF. Gốc rễ: hằng số per-page duplicate giữa FE và BE (không phải 1 nguồn chia sẻ) và comment không được grep khi đổi giá trị → thiếu bước rà comment khi refactor.

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 1 NOK 🟢 → theo ruleset là **Pass**.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `ZougenNichinoReportView.vue:3,52` + `router/index.ts:362` | 1.6 | Sửa comment `15販売店行` → `28`; xóa cụm `複数管理支店は ZIP` ở router (thiết kế là 1 PDF). | 5 phút |

**Tổng effort dự kiến để dọn sạch NOK**: ~5 phút (chỉ sửa comment, không đổi logic).

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.6 — Comment stale (15 vs 28 thực tế) + ghi chú ZIP đã bỏ

Hiện trạng:
```
apps/frontend/src/views/report/ZougenNichinoReportView.vue:3   (header: 15販売店行/ページ)
apps/frontend/src/views/report/ZougenNichinoReportView.vue:52  (1ページ=A4 1枚＝15販売店行)
apps/frontend/src/router/index.ts:362                          (電子帳票(PDF / 複数管理支店は ZIP)出力)
```

```ts
// view:55 — giá trị thực đang là 28, không phải 15
const ZOUGEN_NICHINO_PER_PAGE = 28;
```

Suggested fix:
```diff
- // 出力条件 → レポートプレビュー（15販売店行/ページのページ送り。各ページを別API
+ // 出力条件 → レポートプレビュー（28販売店行/ページのページ送り。各ページを別API
  // で再取得）/ 電子帳票作成（全管理支店をプレビューと同じ改ページでまとめた1つのPDF）。
```
```diff
- /** 1ページ=A4 1枚＝15販売店行（SCR-028 と同方針。BEは購読者単位でSQLページング）。 */
+ /** 1ページ=A4 1枚＝28販売店行（SCR-028 と同方針。BEは購読者単位でSQLページング）。 */
```
```diff
      // 増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029). 出力条件 →
-      // プレビュー / 電子帳票(PDF / 複数管理支店は ZIP)出力。管理支店ごとに
+      // プレビュー / 電子帳票(全管理支店を1つのPDF・管理支店ごとに改ページ)出力。管理支店ごとに
      // 1帳票。電子帳票作成は MSG-029-005 の確認ダイアログ（日農担当者へメール
```
(Thiết kế 3.2 nói rõ: "全管理支店を1つのPDFにまとめる … 管理支店ごとのZIP分割ではない". Việc mã hoá `ZOUGEN_NICHINO_PER_PAGE` là hằng số riêng ở FE + BE khiến comment trôi độc lập — cân nhắc chia sẻ hằng số hoặc rà comment khi đổi giá trị.)
