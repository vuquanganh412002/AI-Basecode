# Báo cáo Code Review — ACSMS-SCR-018 (販売店明細検索画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py.
     Keep these exact bullet keys; one block per report file (= per side).
     PIC / Reviewer / Approver / Project name / Project manager come VERBATIM
     from the §Review metadata (EDIT THESE) table at the top of the skill. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/hanbaiten/HanbaitenListView.vue, apps/frontend/src/api/hanbaiten/hanbaiten.ts, apps/frontend/src/router/index.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/07
- Side: Frontend

## Files reviewed

**Frontend** (3 source files):
- [`HanbaitenListView.vue`](apps/frontend/src/views/hanbaiten/HanbaitenListView.vue) — search/list/delete screen; canonical list-view pattern (BaseSearchForm + BaseDataTable + BaseActionColumn + useTableQuery + useNotify).
- [`api/hanbaiten/hanbaiten.ts`](apps/frontend/src/api/hanbaiten/hanbaiten.ts) — hand-written axios wrapper; `listHanbaiten` / `removeHanbaiten` consumed by SCR-018.
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L145) (HanbaitenList entry L145-L157, perm-any-of `['hanbaiten.view','hanbaiten.daiko_input']`).

> NOTE: `vue-tsc --noEmit` / `eslint` were NOT executed — the `agrinews-frontend-1` dev container is down. Static review of types/imports/template is clean; CI must run the vue-tsc gate before merge.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | PascalCase `HanbaitenListView.vue`, `<script setup>`, no Options API; vue-tsc not executed (container down) — static review clean | — |
| 1.2 | Meaningful naming | ✅ OK | `canCreate`/`canUpdate`/`canDelete`/`isStaff` computed; `HanbaitenFilters` interface | — |
| 1.3 | Avoid all hardcode | ✅ OK | 1.3.a: only `total === 0` (math) — no magic m_code numbers; labels via `codes.label('ITAKU_KUBUN'/'TESURYO_KUBUN', ...)`. 1.3.b: column titles + delete-confirm `この販売店を削除してもよろしいですか？` are single-use screen-design literals — allowed | — |
| 1.4 | No duplication | ❌ NOK | `¥{{ (...tesuryo_amount).toLocaleString() }}` rendered inline (HanbaitenListView.vue:404) instead of `formatYen` from `@/utils/formatters`; vue.md §Formatters forbids inline `value.toLocaleString()` | 🟢 Minor |
| 1.5 | Complex logic commented | ✅ OK | `[staff-ja-filter]` / `[staff-ja-prefill]` block comments explain NICHINO_STAFF flow | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | MSG references (ACSMS-MSG-018-001/004/005/006) annotated at point of use | — |
| 1.7 | Operation purpose commented | ✅ OK | `fetchList` / `onSearch` / `askDelete` carry intent comments | — |
| 1.8 | Other relevant facts commented | ✅ OK | Empty-message-outside-table + error-swallow rationale documented (lines 138-148, 338-347) | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Sạch; chỉ 1 điểm dùng formatter (1.4).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.2 | Authentication & Session management | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: ['hanbaiten.view','hanbaiten.daiko_input']`; buttons `:disabled="!canCreate"` / `:disable-delete="!canDelete"`; `hanbaiten_code` anchor only when `canUpdate`, else plain `<span>` | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.5 | No sensitive data exposure | ✅ OK | No `console.*`, no sensitive data logged (grep = 0) | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html`; all interpolation escaped | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.8 | Validate input and output | ✅ OK | Search-only screen; `onSearch` trims every text filter before apply (lines 167-172); optional params omitted via `|| undefined` | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.10 | No hardcoded credentials | ✅ OK | No `localStorage`/`sessionStorage` token usage (grep = 0); session is cookie-based | — |

**Section 2 score**: 5 OK / 0 NOK / 5 NA — Phân quyền FE (nút + router + cell) đầy đủ.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency; `BaseJaDropdown` is an internal common component | — |
| 3.2 | License agreements respected | ✅ OK | No 3rd-party lib added | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không phát sinh dependency mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `fetchList`, `onSearch`, `onClear`, `goCreate`, `goEdit`, `askDelete` | — |
| 4.2 | Descriptive parameter names | ✅ OK | `onJaFilterChange(v)`, `goEdit(row)` | — |
| 4.3 | Normal path distinguishable | ✅ OK | try/catch/finally with documented swallow; happy path linear | — |
| 4.4 | Operation not too long (extract private) | ✅ OK | Template ≈ 195 lines (< 200); all functions small | — |
| 4.5 | Decision points limited | ✅ OK | bodyCell branches are flat `v-if/v-else-if` per column key | — |
| 4.6 | Variables well named | ✅ OK | `params`, `rows`, `columns` | — |
| 4.7 | General description for code paragraphs | ✅ OK | Search-area + table blocks have leading comments | — |
| 4.8 | Description of changes | ✅ OK | v1.2 column rename annotated (配達手数料支払サイクル / 振込手数料負担区分) | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Invisible-spacer-label trick for checkbox alignment explained (lines 301-310) | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space template indentation | — |
| 4.11 | One command per line | ✅ OK | No multi-command lines | — |
| 4.12 | Break sign for long lines | ✅ OK | Multi-line attribute lists on inputs | — |
| 4.13 | Continuation line indent | ✅ OK | Chained calls indented | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing | — |
| 4.15 | Functions named in common way | ✅ OK | `onX` handlers, `useX` composables | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Composables vs local handlers separated | — |
| 4.17 | Function name has meaning | ✅ OK | All verb-first | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `HanbaitenFilters`, `ListHanbaitenQuery` | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/views/hanbaiten/`, `src/api/hanbaiten/` | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + `__tests__` + api wrapper per project-structure.md | — |
| 4.21 | No redundant/unused lines | ✅ OK | No console.log / commented-out code (vue-tsc unused-import gate not run — container down) | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Theo đúng canonical list-view pattern.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 5 | 0 | 5 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **35** | **1** | **6** | **2%** |

### Phân bổ severity 1 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 1 | 1.4 (inline toLocaleString thay vì formatYen) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Đúng canonical list-view pattern |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment giải thích flow NICHINO_STAFF + MSG refs rõ |
| **Hardcode & Duplication** (1.3, 1.4) | 🟢 | 1.3 sạch (label qua m_code); 1.4 1 chỗ inline toLocaleString |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Phân quyền nút + router + cell đầy đủ; không localStorage token |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không console.log / dữ liệu nhạy cảm |
| **Code Length & Complexity** (4.4, 4.5) | ✅ | Template + handler ngắn gọn |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Sạch (chưa chạy được vue-tsc gate) |
| **Third Party** (3.1-3.2) | ✅ | Không dependency mới |

### Strength (điểm mạnh đáng ghi nhận)

1. **Permission-aware UI đúng chuẩn**: nút 販売店情報登録 `:disabled="!canCreate"` (không ẩn), 削除 `:disable-delete="!canDelete"`, và `hanbaiten_code` chỉ là anchor khi `canUpdate` — tránh dead-link rơi vào 403-rebound (lines 364-389). Đúng vue.md §Permission-aware list buttons.
2. **m_code label không hardcode**: `codes.label('ITAKU_KUBUN'/'TESURYO_KUBUN', ...)` cho cả cell hiển thị (lines 392, 400) — khách đổi `m_code.code_name` là FE phản ánh ngay, không cần redeploy.
3. **Trim filter trước khi search**: `onSearch` trim toàn bộ text filter rồi mới applyFilters (lines 167-172) — đúng list-view rule 5a, người dùng thấy khoảng trắng thừa biến mất.
4. **Error-swallow có chủ đích + comment**: `fetchList` catch nuốt lỗi vì global interceptor đã toast, kèm comment dẫn chiếu rule (lines 138-148) — tránh unhandled rejection trong onMounted.

### Weakness (điểm cần cải thiện)

1. **Formatter dùng chưa nhất quán**: tiền tệ render bằng `.toLocaleString()` inline thay vì `formatYen`. Triệu chứng nhỏ nhưng cho thấy lúc viết view, layer `@/utils/formatters` chưa thành phản xạ mặc định — dễ tái diễn ở các cột tiền khác (đề xuất lint-rule cấm `.toLocaleString(` trong `*.vue`).

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 1 NOK 🟢 → đạt ngưỡng Pass.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟢 | `HanbaitenListView.vue:402-405` | 1.4 | Thay `¥{{ (...).toLocaleString() }}` bằng `{{ formatYen((record as HanbaitenListItem).tesuryo_amount) }}` (import `formatYen` từ `@/utils/formatters`) | ~3 phút |

**Tổng effort dự kiến để chuyển từ "Pass (with minor)" → "Pass sạch"**: ~3 phút (item #1).

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.4 — dùng `formatYen` thay cho inline `toLocaleString()`

Hiện trạng:
```
apps/frontend/src/views/hanbaiten/HanbaitenListView.vue:402-405
```

```vue
<template v-else-if="column.key === 'tesuryo_amount'">
  <template v-if="(record as HanbaitenListItem).tesuryo_amount != null">
    ¥{{ ((record as HanbaitenListItem).tesuryo_amount as number).toLocaleString() }}
  </template>
</template>
```

Suggested fix:
```diff
+ // <script setup> imports
+ import { formatYen } from '@/utils/formatters';
...
- <template v-else-if="column.key === 'tesuryo_amount'">
-   <template v-if="(record as HanbaitenListItem).tesuryo_amount != null">
-     ¥{{ ((record as HanbaitenListItem).tesuryo_amount as number).toLocaleString() }}
-   </template>
- </template>
+ <template v-else-if="column.key === 'tesuryo_amount'">
+   {{ formatYen((record as HanbaitenListItem).tesuryo_amount) }}
+ </template>
```
`formatYen` trả `''` khi giá trị `null`/`undefined`, nên có thể bỏ luôn `v-if` guard. Reference: `.claude/rules/vue.md §Formatters (src/utils/formatters.ts)`.
