# Báo cáo Code Review — ACSMS-SCR-011 (購読者情報登録画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/dokusya/DokusyaFormView.vue, apps/frontend/src/api/dokusya/dokusya.ts, apps/frontend/src/router/index.ts (dokusya entries)
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Frontend

## Files reviewed

**Frontend**:
- [`DokusyaFormView.vue`](apps/frontend/src/views/dokusya/DokusyaFormView.vue) — 購読者登録/編集 form (67 fields, create + edit + approve/reject)
- [`api/dokusya/dokusya.ts`](apps/frontend/src/api/dokusya/dokusya.ts) — hand-written axios wrapper
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L417-L483) (DokusyaCreate L430 / DokusyaEdit L442)

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | vue-tsc clean; `<script setup>` (no Options API); PascalCase view. (eslint binary absent in frontend container — not enforced this run.) | — |
| 1.2 | Meaningful naming | ✅ OK | — | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a magic numbers: `dokusya_shubetsu === 3` (DokusyaFormView.vue:1315) though `DokusyaShubetsu.BOTH` is imported; `tetsuzuki_shurui` raw `0`/`1` (:516,:535,:536,:1342,:1516) though `TetsuzukiShurui` enum exists (not imported); `denshi_shonin_status === 0` (:274, no FE enum). §1.3.b: `'過去日は指定できません。'` duplicated (:895,:903). | 🟡 Major |
| 1.4 | No duplication | ✅ OK | `useNotify`, `useCodesStore().options(...)`, `preventEnterImplicitSubmit`, centralized msg consts (`REQUIRED_MSG`/`KANJI_MSG`/`HIRAGANA_MSG`/`POSTAL_MSG`/`EMAIL_MSG`). | — |
| 1.5 | Complex logic commented | ✅ OK | WHY comments on 解約/新規 部数 logic, credit-card disable, 併読 disable. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | — | — |
| 1.7 | Operation purpose commented | ✅ OK | — | — |
| 1.8 | Other relevant facts commented | ✅ OK | — | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — magic-number (1.3) là vấn đề duy nhất, đặc biệt khi enum đã import sẵn.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission` (DokusyaCreate=dokusya.create, DokusyaEdit=dokusya.update); `:disabled="isRecordReadOnly"`, credit-card option disabled (:1162), 併読 disabled (:1307), shubetsu gated by canPaper/canDenshi. | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.5 | No sensitive data exposure | ✅ OK | Zero `console.*`; zero `localStorage`; no token/PII logging. | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html` in the view. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.8 | Validate input and output | ✅ OK | `validateClient` mirrors BE (required + format), kana=`HIRAGANA_RE` per spec, `?.trim()` optional-chaining for clearable inputs, no HTML5 `type=email/number`. | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.10 | No hardcoded credentials | ⚪ NA | Backend not in scope (side=FE). | — |

**Section 2 score**: 4 OK / 0 NOK / 6 NA — phần FE của access-control + validation đều đạt.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency introduced for this screen. | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | — | — |
| 4.2 | Descriptive parameter names | ✅ OK | — | — |
| 4.3 | Normal path distinguishable | ✅ OK | — | — |
| 4.4 | Operation not too long | ❌ NOK | Single-file view ~2,000 lines / template ≫200 lines (67-field form); section-extract into child components (基本情報 / 配達先 / 電子版) would help. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Branching extracted to computed (`isShubetsuAllowed`, `isNewTetsuzuki`). | — |
| 4.6 | Variables well named | ✅ OK | — | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | — | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | — | — |
| 4.10 | Structural code paragraph indented | ✅ OK | vue-tsc/prettier-clean. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | — | — |
| 4.16 | Global vs local function differentiated | ✅ OK | — | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | View `DokusyaFormView`; wrapper functions typed. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/views/dokusya/`, wrapper `src/api/dokusya/`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | — | — |
| 4.21 | No redundant/unused lines | ✅ OK | vue-tsc clean (noUnusedLocals); no `console.*`. | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — chỉ vướng độ dài file view (4.4).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11% |
| 2. Security | 10 | 4 | 0 | 6 | 0% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 5% |
| **Total** | **42** | **31** | **2** | **9** | **5%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 1 | 1.3 (magic-number + duplicated message) |
| 🟢 Minor | 1 | 4.4 (single-file view length) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ | `<script setup>`, named routes, wrapper-per-tag chuẩn. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment WHY cho logic 解約/併読/credit-card đầy đủ. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 | Magic-number rải rác dù enum/const đã có; message phần lớn đã extract. |
| **Security & Auth** (2.3, 2.5, 2.6, 2.8) | ✅ | meta.permission + :disabled mirror tốt; validateClient bám spec. |
| **Sensitive Data Handling** (2.5) | ✅ | Không console/localStorage/PII. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 | View 67 field rất dài — nên tách component con. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | vue-tsc sạch. |
| **Third Party** (3.1-3.2) | ⚪ NA | Không phát sinh dependency. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Enum dùng đúng ở phần lớn nhánh logic**: `DokusyaShubetsu.PAPER/DIGITAL/BOTH` + `ShiharaiHoho.CREDIT_CARD` trong `isShubetsuAllowed`/credit-card disable (DokusyaFormView.vue:234-257,1162) — chỉ còn vài chỗ sót.
2. **Validation mirror BE chặt**: `validateClient` dùng `?.trim()` cho clearable input, regex hiragana đúng spec, không dùng HTML5 `type` để tránh popup tiếng Anh native.
3. **Access-control UX đúng pattern**: read-only/disabled thay vì ẩn field; credit-card option `disabled` giữ hiển thị giá trị hiện tại (:1157-1162).
4. **Chống Enter-submit + notify chuẩn hoá**: `preventEnterImplicitSubmit` trên form 67 field; success toast qua `useNotify()` (verb-only).

### Weakness (điểm cần cải thiện)

1. **Magic-number tồn dư dù enum đã import**: `=== 3` cho 併読 và `=== 0/1` cho 手続種類 cho thấy enforce enum chưa quét hết template (chỉ check phần `<script>` logic, bỏ sót binding trong `<template>`); `TetsuzukiShurui` còn chưa được import dù đã tồn tại.
2. **View đơn file quá lớn (~2,000 dòng)**: khi requirement form mở rộng sẽ phình tiếp; nên tách 配達先/電子版/基本情報 thành component con để giảm tải maintenance.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND 1 🟡

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `DokusyaFormView.vue:1315,516,535,536,1342,1516` | 1.3 | Import `TetsuzukiShurui`; thay `=== 3`→`DokusyaShubetsu.BOTH`, `=== 0/1`→`TetsuzukiShurui.KAIYAKU/SHINKI`; thêm const cho `denshi_shonin_status===0`. | 10 phút |
| 2 | 🟢 | `DokusyaFormView.vue:895,903` | 1.3 | Extract `'過去日は指定できません。'` → const `PAST_DATE_MSG`. | 2 phút |
| 3 | 🟢 | `DokusyaFormView.vue` (toàn file) | 4.4 | (Optional) tách component con cho các section của form. | 60 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~12 phút (item #1-#2); item #3 optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 — magic number trong template/script (FormView)

Hiện trạng:
```
apps/frontend/src/views/dokusya/DokusyaFormView.vue:1315  (dokusya_shubetsu === 3)
apps/frontend/src/views/dokusya/DokusyaFormView.vue:516,535,536,1342,1516  (tetsuzuki_shurui === 0/1)
apps/frontend/src/views/dokusya/DokusyaFormView.vue:274  (denshi_shonin_status === 0, no FE enum)
```

Suggested fix:
```diff
- import { DokusyaShubetsu, ShiharaiHoho } from '@/constants/enums';
+ import { DokusyaShubetsu, ShiharaiHoho, TetsuzukiShurui } from '@/constants/enums';
...
- if (Number(next) === 0) {
+ if (Number(next) === TetsuzukiShurui.KAIYAKU) {
...
- const isNewTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === 1);
- const isCancelTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === 0);
+ const isNewTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.SHINKI);
+ const isCancelTetsuzuki = computed(() => Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.KAIYAKU);
```
```diff
  :disabled="
    !isEdit &&
-   (Number(opt.value) === 3 ||
+   (Number(opt.value) === DokusyaShubetsu.BOTH ||
      !isShubetsuAllowed(Number(opt.value)))
  "
...
- :disabled="!isEdit && Number(opt.value) === 0"
+ :disabled="!isEdit && Number(opt.value) === TetsuzukiShurui.KAIYAKU"
...
- :readonly="Number(formState.tetsuzuki_shurui) === 0"
+ :readonly="Number(formState.tetsuzuki_shurui) === TetsuzukiShurui.KAIYAKU"
```
Với `denshi_shonin_status === 0` (:274): chưa có FE enum (BE-only). Khuyến nghị thêm const cục bộ rõ nghĩa:
```diff
+ // denshi_shonin_status: 0 = 承認待ち (PENDING). BE-only enum — no FE mirror yet.
+ const DENSHI_STATUS_PENDING = 0;
- () => isEdit.value && detailDenshiShoninStatus.value === 0,
+ () => isEdit.value && detailDenshiShoninStatus.value === DENSHI_STATUS_PENDING,
```

### NOK 1.3 (§1.3.b) — duplicated inline message

Hiện trạng:
```
apps/frontend/src/views/dokusya/DokusyaFormView.vue:895,903
```

Suggested fix:
```diff
+ const PAST_DATE_MSG = '過去日は指定できません。';
...
- errs.hanbaiten_tekiyo_date = '過去日は指定できません。';
+ errs.hanbaiten_tekiyo_date = PAST_DATE_MSG;
...
- errs.joho_henko_tekiyo_date = '過去日は指定できません。';
+ errs.joho_henko_tekiyo_date = PAST_DATE_MSG;
```
