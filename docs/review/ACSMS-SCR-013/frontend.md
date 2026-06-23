# Báo cáo Code Review — ACSMS-SCR-013 (購読者履歴情報画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/dokusya/DokusyaRirekiView.vue, apps/frontend/src/api/dokusya/dokusya.ts (getDokusyaRirekiList + DokusyaRirekiItem), apps/frontend/src/router/index.ts (DokusyaRireki route)
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Frontend

## Files reviewed

**Frontend** (3 source files):
- [`DokusyaRirekiView.vue`](apps/frontend/src/views/dokusya/DokusyaRirekiView.vue) — read-only paginated history list (253 lines)
- [`api/dokusya/dokusya.ts`](apps/frontend/src/api/dokusya/dokusya.ts#L499) — `getDokusyaRirekiList` (L500-L509) + `DokusyaRirekiItem` / `DokusyaRirekiParams` / `DokusyaRirekiListResponse` types (L407-L497)
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L452) (entries L452-L464)

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | `vue-tsc --noEmit` clean (rireki-filtered); PascalComponent.vue, `<script setup>` (no Options API) | — |
| 1.2 | Meaningful naming | ✅ OK | `fetchList`, `onPageChange`, `goBack`, `fullName`, `joinAddress`, `flagLabel`, `dokusyaId` | — |
| 1.3 | Avoid all hardcode | ✅ OK | (1.3.a) Magic number only `total === 0` (allowed). m_code columns resolved via `useCodesStore().label(...)` not hardcoded maps. (1.3.b) Empty message `履歴データが存在しません。` matches ACSMS-MSG-013-001 verbatim (single-use); column titles are screen-specific headers; `はい/いいえ` in one `flagLabel` helper (single definition) | — |
| 1.4 | No duplication | ✅ OK | Uses `BaseDataTable`, `useTableQuery`, `useCodesStore`, `formatDate` — common primitives; address-join centralized in `joinAddress` reused 3× | — |
| 1.5 | Complex logic commented | ✅ OK | Empty-message-outside-table workaround documented (View:153-155); error-swallow rationale at :124-129 | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments cite ACSMS-MSG-013-001/002, 機能定義 1.2/2.1, api.md §4.1 — current | — |
| 1.7 | Operation purpose commented | ✅ OK | File-top block comment describes screen behaviour; functions self-documenting | — |
| 1.8 | Other relevant facts commented | ✅ OK | sort allow-list (`sorter: true` only on 4 allowed cols) noted at View:45-47 | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header (top comment is screen-context, allowed) | — |

**Section 1 score**: 8 OK / 0 NOK / 1 NA — Format sạch; literal đều khớp screen-design hoặc dùng store m_code.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.2 | Authentication & Session management | ✅ OK | Calls go through shared `axiosInstance` (withCredentials); no token in localStorage (grep clean) | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: 'dokusya.view'` (router:462); read-only screen has no action buttons to gate | — |
| 2.4 | Security Configuration | ⚪ NA | App-level config, not in this screen | — |
| 2.5 | No sensitive data exposure | ✅ OK | No `console.*` (grep clean); no password/session logging | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html`; all cell rendering via `{{ }}` interpolation (auto-escaped) | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE) | — |
| 2.8 | Validate input and output | ✅ OK | Read-only screen, no form input; params typed (`DokusyaRirekiParams`); `dokusyaId` coerced via `Number(route.params.id)` | — |
| 2.9 | Store data securely | ⚪ NA | No client-side storage write | — |
| 2.10 | No hardcoded credentials | ✅ OK | No secrets / localStorage in view | — |

**Section 2 score**: 6 OK / 0 NOK / 4 NA — An toàn; read-only, escape mặc định, permission gate ở router.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency (ant-design-vue / vue-router already in project) | — |
| 3.2 | License agreements respected | ✅ OK | No new dependency | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm thư viện.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `fetchList`, `goBack`, `onPageChange`, `getDokusyaRirekiList` (api) verb-first | — |
| 4.2 | Descriptive parameter names | ✅ OK | `joinAddress(todofuken, shikuchoson, chomeBanchi, tatemono)` — named, not positional blobs | — |
| 4.3 | Normal path distinguishable | ✅ OK | `fetchList` try/catch/finally; happy assigns rows, catch resets to empty | — |
| 4.4 | Operation not too long (extract private) | ✅ OK | All functions ≤20 lines; template ≤120 effective lines | — |
| 4.5 | Decision points limited | ✅ OK | Template uses `v-else-if` chain for cell render — flat, no nesting | — |
| 4.6 | Variables well named | ✅ OK | `rows`, `columns`, `state`, `loading`, `total`, `dokusyaId` | — |
| 4.7 | General description for code paragraphs | ✅ OK | columns/fetch/back sections delimited with comment banners | — |
| 4.8 | Description of changes | ✅ OK | bank_branch column labels match api.md v1.1 rename (引落元口座店舗コード/名) | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | empty-message + error-swallow blocks explained | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space indent | — |
| 4.11 | One command per line | ✅ OK | No multi-statement lines | — |
| 4.12 | Break sign for long lines | ✅ OK | column defs one per line; joinAddress args wrapped in template | — |
| 4.13 | Continuation line indent | ✅ OK | Wrapped calls indented 1 level | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of `DokusyaRirekiItem` type | — |
| 4.15 | Functions named in common way | ✅ OK | `use*` composables, `getDokusyaRirekiList` api fn | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Local helpers in `<script setup>`, api fn imported | — |
| 4.17 | Function name has meaning | ✅ OK | All self-describing | — |
| 4.18 | Object naming standard-compliant | ✅ OK | Route name `DokusyaRireki` PascalCase; types `DokusyaRirekiItem` etc | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | View at `src/views/dokusya/`, api at `src/api/dokusya/` | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + spec sibling in `__tests__/`; api wrapper per tag | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code / console / unused imports (vue-tsc clean) | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Toàn bộ đạt; view ngắn gọn, dùng đúng primitive.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 8 | 0 | 1 | 0% |
| 2. Security | 10 | 6 | 0 | 4 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **37** | **0** | **5** | **0%** |

### Phân bổ severity 0 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 0 | — |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Đúng chuẩn folder + naming hoàn toàn |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ (8/8 OK) | Comment WHY + tham chiếu MSG/機能定義 chính xác |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ | m_code qua store, message khớp MSG catalog, joinAddress reuse |
| **Security & Auth** (2.2-2.3, 2.5-2.6, 2.8, 2.10) | ✅ | Read-only, auto-escape, permission gate ở router |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Không log / không lưu client-side |
| **Code Length & Complexity** (4.4, 4.5) | ✅ | Helper ngắn, template phẳng |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không dead code / console / unused import |
| **Third Party** (3.1-3.2) | ✅ | Không thêm dependency |

### Strength (điểm mạnh đáng ghi nhận)

1. **m_code đúng chuẩn tuyệt đối**: 4 cột code (mail_magazine_flg / gender / tetsuzuki_shurui / hikiotoshi_yokin_shubetsu) đều render qua `useCodesStore().label(...)` (View:212-223) — không hardcode label map, customer đổi `code_name` là phản ánh ngay. Mẫu chuẩn cho mọi table cell.
2. **Message khớp catalog verbatim**: `履歴データが存在しません。` (View:161) = ACSMS-MSG-013-001 chính xác, có trailing 「。」 và `data-test` hook cho spec.
3. **Error-swallow có chủ đích + comment rõ**: catch block (View:123-134) giải thích tại sao nuốt lỗi (interceptor đã toast, onMounted fire-and-forget) — đúng §Error Handling Architecture, tránh unhandled rejection.
4. **Named route + breadcrumb array đúng convention**: `{ name: 'DokusyaList' }` clickable parent (router:459), không dùng path literal; `:id` param chuẩn REST.

### Weakness (điểm cần cải thiện)

1. **Không có** — màn hình read-only đơn giản, không phát hiện điểm yếu hệ thống. (Theo dõi: nếu sau này thêm cột vào history, mảng `columns` 36 cột sẽ dài; có thể cân nhắc generate từ metadata, nhưng hiện tại chấp nhận được vì mỗi cột có width/render riêng.)

### Verdict cuối

- [x] Pass
- [ ] Review Again
- [ ] Acceptable

(0 🔴, 0 🟡, 0 NOK → Pass.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| — | — | — | — | Không có action bắt buộc — FE đạt Pass sạch | — |

**Tổng effort dự kiến**: 0 phút — không có NOK phía FE.

---

## Suggested diffs (chi tiết cho mỗi NOK)

Không có NOK phía Frontend — không có diff.

---

**Lint note**: `node_modules/.bin/eslint` không tồn tại trong container `agrinews-frontend-1` — lint không chạy được qua đường này (follow-up infra, không block review). `vue-tsc --noEmit` đã xác nhận clean (rireki-filtered).
