# Báo cáo Code Review — ACSMS-SCR-028 (増減連絡票（販売店）出力画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/report/ZougenHanbaitenReportView.vue, apps/frontend/src/api/report/report.ts, apps/frontend/src/router/index.ts (entry ReportZougenHanbaiten)
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Frontend

## Files reviewed

**Frontend** (2 source files + router entry):
- [`ZougenHanbaitenReportView.vue`](apps/frontend/src/views/report/ZougenHanbaitenReportView.vue) — màn hình chính: điều kiện xuất → preview → PDF export
- [`api/report/report.ts`](apps/frontend/src/api/report/report.ts) — wrapper `previewZougenHanbaiten` / `exportZougenHanbaiten` (chỉ review cách dùng)
- Router entry: [`router/index.ts:351`](apps/frontend/src/router/index.ts#L351-L359) (route `ReportZougenHanbaiten`, `meta.permission`)

> ⚠️ Môi trường: dev stack Docker (`agrinews-frontend-1`) đang **down** → `vue-tsc --noEmit` / `eslint` **không chạy được**. Mục 1.1 / 4.21 dựa trên grep + đọc code.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | PascalCase `.vue`, `<script setup lang="ts">`, no Options API. vue-tsc/eslint NOT run (container down) — read + grep only. | — |
| 1.2 | Meaningful naming | ✅ OK | `formState`, `fieldErrors`, `previewData`, `noDataMessage`, `addressChangePairs`, `onPreview/onExport/onPageChange` — intent-clear. | — |
| 1.3 | Avoid all hardcode | ✅ OK | 1.3.a: no magic-number branching (`.length === 0` array checks). 1.3.b: validation messages `'必須項目です。'`/`'販売店を1件以上選択してください。'`/`'管理支店を1件以上選択してください。'` each single-use; report labels (増部/減部/住所変更/…) are single-use layout literals from index.html design. Permission code `report.export_zougen_hanbaiten` is canonical string usage. | — |
| 1.4 | No duplication | ❌ NOK | 増部 (L349-386) và 減部 (L388-425) tables gần như trùng khít (6 cột, chỉ khác header 新規氏名 vs 中止氏名); trailing empty-row 6×`<td>` block lặp 3 lần (L376-383, L415-422, L463-470). BE đã factor `entrySection`; FE inline. | 🟢 Minor |
| 1.5 | Complex logic commented | ✅ OK | `addressChangePairs` rowspan pairing, no-data 200 handling, `?.trim()` reasoning đều có comment. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comment khớp code + tham chiếu đúng MSG-028-001/002/004 và index.html. | — |
| 1.7 | Operation purpose commented | ✅ OK | JSDoc trên `addressChangePairs`, `buildQuery`, `fetchPage`, `nowIssuedAt`. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Giải thích: page = 1 combo, per_page semantics, export bỏ qua page, no-data blob.type. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header (view mở đầu bằng comment mục đích ngắn — chấp nhận). | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Sạch; chỉ template lặp bảng tăng/giảm (1.4, minor).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ✅ OK | Không lưu token/session ở `localStorage`/`sessionStorage` (grep sạch); auth qua cookie tự động. | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: 'report.export_zougen_hanbaiten'`; `canUse = hasPermission(...)`; 2 button `:disabled="!canUse"`; alert MSG-028-001 khi `!canUse`. | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.5 | No sensitive data exposure | ✅ OK | Không `console.*`; không log PII; dữ liệu khách render qua `{{ }}` (auto-escape). | — |
| 2.6 | Attack Protection | ✅ OK | Không `v-html`; toàn bộ giá trị người dùng/khách render qua interpolation (XSS-safe). | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). Bảo vệ endpoint là phía BE. | — |
| 2.8 | Validate input and output | ✅ OK | `validate()` mirror BE: `tekiyo_date` required với `?.trim()` (an toàn khi `<a-date-picker>` clear → undefined), hanbaiten/kanri_shiten bắt buộc ≥1. | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE); FE không lưu client-side. | — |
| 2.10 | No hardcoded credentials | ✅ OK | Không secret/credential trong FE. | — |

**Section 2 score**: 6 OK / 0 NOK / 4 NA — FE mirror quyền + validate đúng; XSS-safe. 4 mục thuần BE → NA.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | Không dep mới; tái dùng `BaseHanbaitenSelect`/`BaseKanriShitenSelect`/`BaseReportPager` + util có sẵn. | — |
| 3.2 | License agreements respected | ✅ OK | Không thêm thư viện ngoài. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không phát sinh dependency.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `onPreview`, `onExport`, `onPageChange`, `fetchPage`, `buildQuery`, `validate` — verb-first. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `addressChangePairs(rows)`, `buildQuery(page?)`, `fetchPage(page)`, `onPageChange(page)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | `if (!validate()) return` sớm; try/catch chỉ dọn local state (interceptor đã toast). | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | Template ≈313 dòng (L185-498) > guideline 200 — bị phồng bởi 3 bảng inline (cùng gốc với 1.4). Phần `<script>` gọn (≤50 dòng/hàm). | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Nhánh ít; `addressChangePairs` vòng lặp bước 2 đơn giản. | — |
| 4.6 | Variables well named | ✅ OK | `currentPage`, `issuedAt`, `hasReports`, `previewData`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | Khối điều kiện xuất / preview / pager đều có comment mở đầu. | — |
| 4.8 | Description of changes | ✅ OK | Ghi chú 顧客要件 2026-07 (bắt buộc chọn販売店/管理支店, page=1 combo). | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Logic no-data (blob.type application/json) + fallback filename có giải thích. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, template lồng nhau đúng cấp. | — |
| 4.11 | One command per line | ✅ OK | Không nhồi nhiều lệnh 1 dòng. | — |
| 4.12 | Break sign for long lines | ✅ OK | Import + call multi-line ngắt hợp lý (markup dài là bản chất template). | — |
| 4.13 | Continuation line indent | ✅ OK | Chuỗi option/props xuống dòng thụt 1 cấp. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | Không trùng tên type/component. | — |
| 4.15 | Functions named in common way | ✅ OK | `on*` handler, `fetch*`, `build*`, `validate` nhất quán. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Handler cục bộ view vs wrapper API (import) tách rõ. | — |
| 4.17 | Function name has meaning | ✅ OK | `addressChangePairs`, `nowIssuedAt` tự mô tả. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | View `ZougenHanbaitenReportView.vue`, wrapper interface `ZougenHanbaitenQuery`. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | View tại `src/views/report/`, wrapper tại `src/api/report/report.ts`, route lazy-loaded. | — |
| 4.20 | Folder content conforms standard | ✅ OK | Đúng project-structure.md (views/report + api/report). | — |
| 4.21 | No redundant/unused lines | ✅ OK | Không `console.*`, không code comment-out, import đều dùng; `defineExpose({ formState })` là test-hook hợp lệ. `noUnusedLocals` chưa verify qua vue-tsc (container down). | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Script gọn, naming chuẩn; chỉ template dài do bảng inline (4.4, cùng gốc 1.4).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 6 | 0 | 4 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **35** | **2** | **5** | **5%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 2 | 1.4 (template table duplication), 4.4 (template length) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Composition API, naming domain-preserving, folder chuẩn. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ (8/8 OK) | Comment tham chiếu đúng MSG code + index.html. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟢 (1/2 OK) | Không magic-number/message hardcode; nhưng bảng tăng/giảm inline lặp (1.4). |
| **Security & Auth** (2.2, 2.3, 2.5, 2.6, 2.8) | ✅ (5/5 OK, 4 NA) | Mirror quyền + validate; XSS-safe; không lưu token. Mục thuần BE → NA. |
| **Sensitive Data Handling** (2.5) | ✅ (OK; 2.9 NA) | Không console/PII. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 (1/2 OK) | Template ~313 dòng do 3 bảng inline. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Không dead code/console; import sạch. |
| **Third Party** (3.1-3.2) | ✅ (2/2 OK) | Tái dùng Base* components. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Mirror phân quyền đầy đủ 3 lớp**: router `meta.permission` (L357) + `canUse` computed + button `:disabled` + alert MSG-028-001 (L188-194) — người dùng日農 thấy rõ lý do không dùng được, đúng vue.md §Permission-aware list buttons.
2. **Xử lý no-data không dùng toast**: cả preview (`reports.length === 0`, L133) và export (`blob.type application/json`, L164) đều set `noDataMessage` hiển thị trong màn (MSG-028-002) thay vì toast — đúng đặc tả api.md ("トーストではない").
3. **Error handling đúng kiến trúc 4 lớp**: `try/catch` chỉ dọn `previewData=null`, comment nói rõ interceptor đã toast 403/500 (L134-137, L174-176) — không re-toast, đúng vue.md §Error Handling Architecture.
4. **Datetime pin JST**: phát hành dùng `nowTokyo().format('YYYY/MM/DD HH:mm')` (L65) thay vì `dayjs()` trần — đúng rule datetime Asia/Tokyo.
5. **Tên file do server quyết định**: đọc từ `Content-Disposition` (`filenameFromDisposition`, report.ts:235) với fallback theo適用日 — FE không hardcode quy tắc đặt tên theo role.

### Weakness (điểm cần cải thiện)

1. **Template lặp bảng tăng/giảm**: 2 bảng 増部/減部 gần như copy-paste + trailing empty-row lặp 3 lần khiến template ~313 dòng. Khi phát sinh cột mới phải sửa nhiều nơi → nên trích 1 sub-component (`ZougenEntryTable`) nhận `title` + `nameHeader` + `entries`, tương tự `entrySection` bên BE. Đây là nguồn chung của cả 1.4 lẫn 4.4.
2. **Chưa có chốt chặn Enter-submit**: form điều kiện có `<a-date-picker>` + 2 multiselect; tuy hành động là button (không phải `html-type=submit`) nên rủi ro thấp, nhưng nếu về sau đổi sang `<a-form @finish>` cần nhớ `preventEnterImplicitSubmit` (vue.md). Không phải NOK hiện tại — ghi nhận phòng ngừa.

### Verdict cuối

- [x] Pass ← 0 🔴, 0 🟡, NOK = 2 (đều 🟢)
- [ ] Review Again
- [ ] Acceptable

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `ZougenHanbaitenReportView.vue:349-425` | 1.4 + 4.4 | Trích `ZougenEntryTable.vue` (props: `title`, `nameHeader`, `entries`) dùng cho cả 増部/減部; gom trailing empty-row vào component. Giảm template + hết lặp. | 20-30 phút |

**Tổng effort dự kiến để giữ verdict "Pass" và dọn nợ kỹ thuật**: ~25 phút (item #1 optional — Pass không bị chặn bởi 2 NOK minor này; xử lý khi có MR chỉnh sửa report views).

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.4 + 4.4 — Bảng 増部/減部 inline lặp (cùng gốc)

Hiện trạng:
```
apps/frontend/src/views/report/ZougenHanbaitenReportView.vue:349-386  (bảng 増部)
apps/frontend/src/views/report/ZougenHanbaitenReportView.vue:388-425  (bảng 減部 — gần trùng khít)
apps/frontend/src/views/report/ZougenHanbaitenReportView.vue:376-383, 415-422, 463-470  (trailing empty-row lặp 3 lần)
```

Suggested fix (định hướng — trích sub-component):
```diff
+ <!-- components/report/ZougenEntryTable.vue -->
+ <script setup lang="ts">
+ import type { ZougenEntry } from '@/api/report/report';
+ defineProps<{ title: string; nameHeader: string; entries: ZougenEntry[] }>();
+ </script>
+ <template>
+   <div class="mb-5">
+     <div class="font-bold text-sm mb-0.5 text-text-main">{{ title }}</div>
+     <table class="w-full text-xs border-collapse" style="table-layout: fixed"> … </table>
+   </div>
+ </template>
```
```diff
  <!-- ZougenHanbaitenReportView.vue -->
- <!-- ── 増部 ── --> …37 dòng…
- <!-- ── 減部 ── --> …37 dòng…
+ <ZougenEntryTable title="増部" name-header="新規氏名" :entries="report.zoubu" />
+ <ZougenEntryTable title="減部" name-header="中止氏名" :entries="report.genbu" />
```
Ghi chú: giảm ~70 dòng template, đưa độ dài file xuống dưới 250 dòng, đồng thời hết duplication. Bảng 住所変更 (rowspan) giữ riêng hoặc trích `ZougenAddressTable.vue` nếu muốn triệt để. Ưu tiên thấp — 2 NOK đều 🟢, không chặn verdict Pass.
