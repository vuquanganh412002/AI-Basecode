# Báo cáo Code Review — ACSMS-SCR-014 (購読者明細検索画面) — Frontend only

**Scope**: FE

- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/dokusya/DokusyaListView.vue, apps/frontend/src/api/dokusya/dokusya.ts (SCR-014 section), router/index.ts (dokusya entries)
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Frontend

## Files reviewed

**Frontend** (2 source files + router):
- [`DokusyaListView.vue`](apps/frontend/src/views/dokusya/DokusyaListView.vue) — 検索 (19 filters) + 一覧 + 削除 + Excel出力
- [`api/dokusya/dokusya.ts`](apps/frontend/src/api/dokusya/dokusya.ts#L275-L395) — `listDokusya`, `removeDokusya`, `exportDokusyaExcel` + types
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L417-L425) (DokusyaList, `meta.permission: 'dokusya.view'`)

Pre-checks: `docker exec agrinews-frontend-1 npx vue-tsc --noEmit` → clean (exit 0). FE eslint not installed in container (eslint@10 missing) — lint not run; type safety covered by vue-tsc. No `console.*`, no `localStorage` in scope.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | `vue-tsc --noEmit` clean. `<script setup lang="ts">`, PascalCase view, no Options API. (eslint not run — binary absent in container.) | — |
| 1.2 | Meaningful naming | ✅ OK | `buildSearchParams`, `applyNumberFilters`, `validateFilters`, `denshiShoninOptions`. | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.b: `onExport` uses raw `message.success(MSG_EXPORT_SUCCESS)` (DokusyaListView.vue:600) instead of `notify.success(...)` — inconsistent with `notify.deleted()` used in the same file (L546). m_code labels correctly via `useCodesStore`; `denshiShoninOptions` hardcode is justified (no m_code category, documented L143-155). | 🟢 Minor |
| 1.4 | No duplication | ✅ OK | Filter copy split into `applyNumberFilters` / `applyTextFilters` / `applyDateFilters`; Base* components reused. | — |
| 1.5 | Complex logic commented | ✅ OK | dashboard deep-link (L474), trim-rationale (L494), blob jsdom skip (L559). | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | — | — |
| 1.7 | Operation purpose commented | ✅ OK | File header + per-function JSDoc. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Error-swallow rationale referencing rules/vue.md (L461-465, L549-551). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header (view top comment is acceptable). | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — only the `message.success` vs `notify.success` consistency nit (1.3).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: 'dokusya.view'` (L425); buttons gated: 新規登録 `:disabled="!canCreateDokusya"` (L1013), 削除 `:disable-delete` on `!canDelete \|\| !hasAnyDokusyaFlag \|\| is_read_only` (L1062), Excel出力 `:disabled="!canView"`, 編集 anchor only when `canUpdate` (L1028). | — |
| 2.4 | Security Configuration | ⚪ NA | App-global (main.ts) — not a view concern. | — |
| 2.5 | No sensitive data exposure | ✅ OK | No `console.*`; no token/PII logged. | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html`; all rendering via `{{ }}` interpolation. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.8 | Validate input and output | ✅ OK | `validateFilters` mirrors BE: email regex (ACSMS-MSG-014-008) + 3 date-range from≦to checks; messages are screen-design literals. | — |
| 2.9 | Store data securely | ✅ OK | No `localStorage`/`sessionStorage`; session via HttpOnly cookie. | — |
| 2.10 | No hardcoded credentials | ⚪ NA | Backend not in scope (side=FE). | — |

**Section 2 score**: 5 OK / 0 NOK / 5 NA — FE permission gating + client validation + no-storage all correct.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency. | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA — No dependency change.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `onSearch`/`onClear`/`onExport`/`goCreate`/`goEdit`/`askDelete`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `applyNumberFilters(params, f)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | `validateFilters` returns early on first violation. | — |
| 4.4 | Operation not too long | ✅ OK | Filter builders split; no method > 50 lines. Template uses sub-grids cleanly. | — |
| 4.5 | Decision points limited | ✅ OK | Filter copying split per type keeps each fn flat. | — |
| 4.6 | Variables well named | ✅ OK | `kanriShitenOptions`, `showAdvanced`, `validationError`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | Section banners (常時表示エリア / 詳細検索エリア). | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | `downloadBlob` jsdom guard explained (L559). | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space; template grid structure consistent. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | wrapper `listDokusya`/`removeDokusya`/`exportDokusyaExcel`. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module helpers vs component handlers. | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `useAuthStore`/`useCodesStore`/`DokusyaSearchParams`/`DokusyaListItem`. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/views/dokusya/`, `src/api/dokusya/`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + wrapper + `__tests__` per project-structure.md. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code / console.log / unused imports in view. | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Component decomposition + naming exemplary.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 5 | 0 | 5 | 0% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **33** | **1** | **8** | **2%** |

### Phân bổ severity 1 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 1 | 1.3 (raw message.success thay vì notify.success) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ | `<script setup>`, naming + layout chuẩn, vue-tsc sạch. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment WHY tham chiếu rules/vue.md + ACSMS-MSG codes. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟢 | m_code dùng useCodesStore đúng; chỉ lệch nhỏ message.success. |
| **Security & Auth** (2.3, 2.5, 2.6, 2.8, 2.9) | ✅ | Permission gating đa lớp + client validation + no-storage. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không log/lưu token. |
| **Code Length & Complexity** (4.4, 4.5) | ✅ | Filter builder tách nhỏ. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Sạch, không dead code. |
| **Third Party** (3.1-3.2) | ⚪ | Không thêm dependency. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Permission gating đa lớp + business-flag**: ngoài `canDelete`, nút 削除 còn xét `hasAnyDokusyaFlag` (paper/denshi flag) và `is_read_only` từng dòng (DokusyaListView.vue:1062) — mirror đúng BE `assertShubetsuFlag`, đáng nhân rộng.
2. **Client validation mirror BE**: `validateFilters` chạy email regex + 3 date-range from≦to trước khi gọi API (L337-368), hiển thị inline `validationError` thay vì chỉ toast.
3. **Error-handling kỷ luật**: `fetchList`/`askDelete` nuốt lỗi có chủ đích + comment dẫn rules/vue.md §Error Handling; `onExport` chỉ toast cho code view-handled (EXPORT_NO_DATA / EXPORT_LIMIT_EXCEEDED).
4. **JST-safe filename**: `buildExportFilename` dùng `timestampForFilenameTokyo()` thay vì `new Date()` browser-local (L576-580).

### Weakness (điểm cần cải thiện)

1. **Lệch convention toast success**: file dùng cả `notify.deleted()` (chuẩn) lẫn `message.success(MSG_EXPORT_SUCCESS)` (raw). Triệu chứng nhỏ nhưng cho thấy convention "success toast luôn qua useNotify" chưa được enforce — nên thêm vào checklist review FE hoặc lint rule cấm `message.success` trực tiếp.

### Verdict cuối

- [x] Pass ← 0 🔴, 0 🟡, 1 NOK (🟢)
- [ ] Review Again
- [ ] Acceptable

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `DokusyaListView.vue:600` | 1.3 | Đổi `message.success(MSG_EXPORT_SUCCESS)` → `notify.success(MSG_EXPORT_SUCCESS)` để đồng nhất convention toast. | 2 phút |

**Tổng effort dự kiến để giữ "Pass"**: ~2 phút (item #1, optional — có thể defer).

---

## Suggested diffs

### NOK 1.3 — raw message.success thay vì notify.success

Hiện trạng:
```
apps/frontend/src/views/dokusya/DokusyaListView.vue:600
```

```ts
message.success(MSG_EXPORT_SUCCESS);
```

Suggested fix (`notify` đã import + dùng `notify.deleted()` trong cùng file):
```diff
-    message.success(MSG_EXPORT_SUCCESS);
+    notify.success(MSG_EXPORT_SUCCESS);
```
(Nếu sau khi đổi `message` không còn được dùng ở nơi khác trong file — kiểm tra: vẫn dùng cho `message.error` ở các nhánh export — nên giữ import `message`.)
