# Báo cáo Code Review — ACSMS-SCR-017 (販売店情報登録画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue, apps/frontend/src/api/hanbaiten/hanbaiten.ts, apps/frontend/src/components/common/BaseTankaDropdown.vue, apps/frontend/src/router/index.ts
- Reviewer: quanh
- Approver:
- Review date: 2026/06/07
- Side: Frontend

## Files reviewed

**Frontend** (4 source files):
- [`views/hanbaiten/HanbaitenFormView.vue`](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue) — SCR-017 create/edit form (Detail + Create + Update)
- [`api/hanbaiten/hanbaiten.ts`](apps/frontend/src/api/hanbaiten/hanbaiten.ts#L133) — hand-written axios wrapper (SCR-017 trio: getHanbaiten / createHanbaiten / updateHanbaiten)
- [`components/common/BaseTankaDropdown.vue`](apps/frontend/src/components/common/BaseTankaDropdown.vue) — server-paginated 配達手数料単価 dropdown consumed by the form
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L160) (entries L160-L189 — HanbaitenCreate / HanbaitenEdit)

> ⚠️ Tooling limitation: the `agrinews-frontend-1` container was **down** at review time, so `vue-tsc --noEmit` and `eslint` were **not run**. All checks below are static (grep + manual read). Re-run `docker exec agrinews-frontend-1 npx vue-tsc --noEmit` before merge to confirm type-cleanliness.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | PascalComponent.vue + `<script setup lang="ts">`, no Options API; no `any` / `@ts-ignore` (grep clean). tsc/lint not run — container down. | — |
| 1.2 | Meaningful naming | ✅ OK | Domain terms preserved (`hanbaiten`, `itaku_kubun`, `koza_meigi`); booleans `isEdit` / `isStaff` / `isHydrating` / `canSubmit`. | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a Magic number `formState.itaku_kubun === 1` (= 振込) repeated 8× — script [HanbaitenFormView.vue:302](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue#L302) + template :693 :709 :743 :759 :775 :797 :813. ITAKU_KUBUN is Group B (no enum), but the literal `1` needs a named local const + `isBankRequired` computed. §1.3.b: only `必須項目です。` literal, held in `REQUIRED_MSG` const matching ACSMS-MSG-017-007 — OK. | 🟡 Major |
| 1.4 | No duplication | ✅ OK | Common primitives used correctly (BaseCard, BaseFormFooter, BaseCodeInput, BaseJaDropdown, BaseTankaDropdown, useNotify, useCodesStore). The 7× repeated `*` span is the symptom of 1.3's magic number — one `isBankRequired` computed DRYs both; counted under 1.3. | — |
| 1.5 | Complex logic commented | ✅ OK | `[tanka-cascade]` watch, `queueMicrotask` hydrate-reset, `[staff-ja-id]` flow all carry WHY comments. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments reference api.md §API-017-001/002/003 + screen-design v1.2 §3.1; no stale/renamed-symbol refs. | — |
| 1.7 | Operation purpose commented | ✅ OK | File header documents the 3 API bindings + conditional-required cluster; helper fns self-descriptive. | — |
| 1.8 | Other relevant facts commented | ✅ OK | `[haiten-edit-only]`, `[staff-ja-prefill]`, dual-envelope tolerance in `fetchTodofukenOptions` all noted. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header block. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — 1 Major (1.3 magic number `itaku_kubun === 1`); cần tách const + computed `isBankRequired`.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: ['hanbaiten.create'/'update', 'hanbaiten.daiko_input']` (router/index.ts:171,185) + `canSubmit` gates BaseFormFooter `:disabled`. No FE field-restriction needed (hanbaiten absent from FIELD_RESTRICTIONS). | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.5 | No sensitive data exposure | ✅ OK | No `console.*` (grep clean); no password/session/PII logged. | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html` in template; all output via `{{ }}` / v-model. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.8 | Validate input and output | ✅ OK | `validateClient()` mirrors screen-design §3.1 (required hanbaiten_code/name, conditional bank cluster); required strings use `?.trim()` optional chaining; kana via `@/utils/kana` (HALF_WIDTH_KATAKANA_RE). | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.10 | No hardcoded credentials | ✅ OK | No `localStorage`/`sessionStorage`/token (grep clean); session via HttpOnly cookie. | — |
| 2.11 | — | — | — | — |

**Section 2 score**: 5 OK / 0 NOK / 5 NA — không có lỗ hổng phía FE; các item BE đánh dấu NA do side=FE.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new dependency introduced; uses existing axios + antd + dayjs stack. | — |
| 3.2 | License agreements respected | ✅ OK | No new dep → no license change. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — không thêm thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | Verb-first: `validateClient`, `buildCreateBody`, `buildUpdateBody`, `handleServerError`, `loadDetail`, `fetchTodofukenOptions`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `loadDetail(id)`, `handleServerError(err)`, watch `(next, prev)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | `onSubmit` guards first (`!validateClient()` / `submitting`) then happy path; try/catch/finally clear. | — |
| 4.4 | Operation not too long (extract private) | ✅ OK | `validateClient` 42 lines; `loadDetail`/`onSubmit` short. Template ~440 lines is a 24-field bank form — single cohesive form, splitting would hurt readability (justified). | — |
| 4.5 | Decision points limited | ✅ OK | Bank-cluster loop is flat; no nesting > 3 levels. | — |
| 4.6 | Variables well named | ✅ OK | Loop var `for (const field of BANK_FIELDS)`; no `obj`/`arr`/`temp`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | Each section has a `─── header ───` band comment (Form state / Dropdown options / Submit pipeline). | — |
| 4.8 | Description of changes | ✅ OK | No churn markers; api.md v1.2 delta documented in wrapper header. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | Cascade watch + microtask reset explained. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space indent throughout. | — |
| 4.11 | One command per line | ✅ OK | No `a(); b();` lines. | — |
| 4.12 | Break sign for long lines | ✅ OK | Multi-line `Object.assign`, ternary placeholder broken across lines. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained `.filter().map()` in `handleServerError` indented 1 level. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadowing of imported types. | — |
| 4.15 | Functions named in common way | ✅ OK | `getHanbaiten`/`createHanbaiten`/`updateHanbaiten` wrapper verbs consistent. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | Module-local helpers vs imported composables clear. | — |
| 4.17 | Function name has meaning | ✅ OK | No `do()`/`process()`/`handle()` orphan (handleServerError is specific). | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `CreateHanbaitenBody`/`UpdateHanbaitenBody`/`HanbaitenDetail` types; `HanbaitenFormState` interface. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `views/hanbaiten/`, `api/hanbaiten/` per project-structure.md. | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + sibling spec under `__tests__/`; wrapper under `api/<tag>/`. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No commented-out code, no console.log, no unused imports (all 16 imports used). Hidden `todofuken-options` span + `defineExpose` are intentional spec hooks (commented) — see Weakness. | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — code hygiene tốt; chỉ có vài chỗ couple test (không tính NOK).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 5 | 0 | 5 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **35** | **1** | **6** | **2.4%** |

### Phân bổ severity 1 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 1 | 1.3 (magic number `itaku_kubun === 1` ×8) |
| 🟢 Minor | 0 | — |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | Naming nhất quán, domain term giữ nguyên, type/interface đúng convention. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ (8/8 OK, 1 NA) | Comment WHY chất lượng cao, neo tới api.md/screen-design; không có comment stale. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 (1 NOK) | Magic number `1` (=振込) lặp 8 lần — cần const + computed `isBankRequired`. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | ✅ | Router meta.permission + button disabled; không v-html, không localStorage. |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ (1 NA) | Không log nhạy cảm; lưu trữ là phần BE (NA). |
| **Code Length & Complexity** (4.4, 4.5) | ✅ | Hàm ngắn; template dài nhưng justified cho form 24 trường. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không dead code/console/unused import. |
| **Third Party** (3.1-3.2) | ✅ | Không thêm thư viện. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Defense-in-depth permission gating đúng chuẩn**: `canSubmit` ([HanbaitenFormView.vue:137](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue#L137)) gộp `hanbaiten.update`/`create` + `hanbaiten.daiko_input`, khớp 1:1 với router `meta.permission` (router/index.ts:171,185) — FE chỉ là UX hint, BE vẫn là biên giới thật. Future screens nên copy mẫu "any-of permission" này.
2. **Cascade an toàn cross-tenant**: watch `formState.ja_id` ([:185](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue#L185)) reset `haitatsuryo_tanka_id` khi staff đổi JA, kèm `isHydrating` guard để không xoá nhầm khi load edit — ngăn tanka_id của JA cũ lọt qua Layer-4 FK guard. Đây là phòng thủ chủ động đáng học.
3. **Conditional-required mirror chính xác screen-design v1.2 §3.1**: cụm 7 bank field chỉ required khi `itaku_kubun=1`, và dấu `*` cũng ẩn/hiện theo đúng điều kiện — FE/BE contract khớp verbatim.
4. **Wrapper envelope-tolerant**: `fetchTodofukenOptions` chấp nhận cả `{ data: [] }` lẫn array thuần ([:167](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue#L167)) với comment giải thích — robust trước cả legacy fixture.

### Weakness (điểm cần cải thiện)

1. **Magic number chưa được hằng-hoá ở FE** (root cause của NOK 1.3): `itaku_kubun === 1` rải 8 chỗ. Group B không có enum nên dễ bị bỏ qua, nhưng giá trị `1`=振込 là business rule ổn định — cần local const + `isBankRequired` computed. Process gap: chưa có quy ước "named const cho mọi nhánh m_code dù Group B".
2. **Production code couple với spec**: hidden `<span data-test="todofuken-options">` ([:553](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue#L553)) render DOM ẩn chỉ để test đọc option text, và `defineExpose({ formState, fieldErrors })` mở nội bộ cho `fillForm`. Hợp lý ngắn hạn (antd không render option khi chưa mở dropdown) nhưng là chỉ dấu test brittle — nếu nhiều screen lặp lại nên cân nhắc test util chung thay vì DOM ẩn.
3. **Template lớn (~440 dòng)**: chấp nhận được cho form 24 trường nhưng sẽ phình thêm khi requirement mở rộng; theo dõi để section-hoá (基本情報 / 振込先情報) thành sub-component nếu vượt thêm.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND ≤ 2 🟡 (đúng 1 🟡)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 Major | `HanbaitenFormView.vue:302,693,709,743,759,775,797,813` | 1.3 | Thêm `const ITAKU_KUBUN_FURIKOMI = 1` + `const isBankRequired = computed(() => formState.itaku_kubun === ITAKU_KUBUN_FURIKOMI)`; thay 8 chỗ `=== 1` bằng const/computed | ~10 phút |
| 2 | 🟢 (optional) | `HanbaitenFormView.vue:553-557` | 4.21 / Weakness | Cân nhắc thay hidden options span bằng test util chung (defer sang follow-up) | ~15 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~10 phút (item #1); item #2 optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 #1 — magic number `itaku_kubun === 1` lặp 8 chỗ

Hiện trạng:
```
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:302   (validateClient)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:693   (bank_code *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:709   (bank_name *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:743   (bank_branch_code *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:759   (bank_branch_name *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:775   (yokin_shubetsu *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:797   (koza_no *)
apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue:813   (koza_meigi *)
```

```ts
// :302
if (formState.itaku_kubun === 1) {
  for (const field of BANK_FIELDS) { ... }
}
```
```vue
<!-- :693 (×7 in template) -->
<span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
```

Suggested fix — script (add near BANK_FIELDS, ~:264):
```diff
+ // 委託区分 = 1 (振込) → cụm No.17-23 bắt buộc. ITAKU_KUBUN là Group B
+ // (m_code, không có TS enum) nên neo giá trị bằng const cục bộ + comment.
+ const ITAKU_KUBUN_FURIKOMI = 1;
+ const isBankRequired = computed(
+   () => formState.itaku_kubun === ITAKU_KUBUN_FURIKOMI,
+ );
...
- if (formState.itaku_kubun === 1) {
+ if (isBankRequired.value) {
    for (const field of BANK_FIELDS) {
```

Suggested fix — template (7 chỗ asterisk):
```diff
- <span v-if="formState.itaku_kubun === 1" class="text-error ml-1">*</span>
+ <span v-if="isBankRequired" class="text-error ml-1">*</span>
```

Một computed `isBankRequired` đồng thời xoá magic number (1.3.a) lẫn lặp `v-if` 7 lần (gốc của repetition), giữ đúng quy ước "không branch trực tiếp trên `=== <m_code value>`" trong `.claude/rules/vue.md §Code Master (m_code)`.
