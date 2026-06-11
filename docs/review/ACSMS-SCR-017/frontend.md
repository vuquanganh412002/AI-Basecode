# Báo cáo Code Review — ACSMS-SCR-017 (販売店情報登録画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue, apps/frontend/src/api/hanbaiten/hanbaiten.ts (usage), apps/frontend/src/router/index.ts (entries)
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/11
- Side: Frontend

## Files reviewed

**Frontend** (1 source file + wrapper usage + router):
- [`HanbaitenFormView.vue`](apps/frontend/src/views/hanbaiten/HanbaitenFormView.vue) — SCR-017 create/edit form (single component, both modes)
- API wrapper usage: [`api/hanbaiten/hanbaiten.ts`](apps/frontend/src/api/hanbaiten/hanbaiten.ts) (hand-written — call-site review only)
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L161) (HanbaitenCreate L161-174, HanbaitenEdit L176-189)

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | `vue-tsc --noEmit` clean (verified via docker exec). `PascalComponent.vue` + `<script setup>` (no Options API). ESLint binary missing in container — lint not enforced, infra follow-up only. | — |
| 1.2 | Meaningful naming | ✅ OK | `isStaff`, `canSubmit`, `isEdit`, `collectBankClusterErrors`; domain terms preserved. | — |
| 1.3 | Avoid all hardcode | ✅ OK | §1.3.a: branching uses `ItakuKubun.FURIKOMI` from `@/constants/enums` (HanbaitenFormView.vue:369, :783+), no magic `=== 1`. §1.3.b: messages extracted to named consts `REQUIRED_MSG`/`TEL_DIGITS_ONLY_MSG`/`FAX_DIGITS_ONLY_MSG` (:347-350) + `kanaFormatMessage()` util; success toasts via `useNotify().created/updated()`. | — |
| 1.4 | No duplication | ✅ OK | Base components used: `BaseCard`, `BaseFormFooter`, `BaseCodeInput`, `BaseJaDropdown`, `BaseTankaDropdown`. Bank-cluster check extracted to `collectBankClusterErrors`. | — |
| 1.5 | Complex logic commented | ✅ OK | `[staff-ja-id]`, `[staff-ja-required]`, `[perm-any-of]`, `[route-reuse]` labeled comments explain WHY. | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Header (HanbaitenFormView.vue:1-14) correctly names SCR-017 + the 3 API endpoints + conditional-required rule. | — |
| 1.7 | Operation purpose commented | ✅ OK | `validateClient`, `buildCreateBody`, `buildUpdateBody`, `handleServerError` documented. | — |
| 1.8 | Other relevant facts commented | ✅ OK | `hanbaiten_code 更新不可` omission noted (:460); error-handler "view must NOT re-toast" (:509). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header (SFC top comment is contextual, allowed). | — |

**Section 1 score**: 8 OK / 0 NOK / 1 NA — Format FE sạch, enum + message centralization đã adopt đúng.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ✅ OK | No token/session in localStorage (grep clean); auth via `useAuthStore` (cookie-based session). | — |
| 2.3 | Access Control sufficient | ✅ OK | Router `meta.permission: ['hanbaiten.create','hanbaiten.daiko_input']` (index.html:171,185); submit gated by `canSubmit` computed (:157-172) → button `:disabled="!canSubmit"` (:969); `hanbaiten_code` `:disabled="isEdit"`. | — |
| 2.4 | Security Configuration | ⚪ NA | App-level (main.ts) — not a per-view concern. | — |
| 2.5 | No sensitive data exposure | ✅ OK | `grep console.` on hanbaiten views → none; no sensitive data logged. | — |
| 2.6 | Attack Protection | ✅ OK | `grep v-html` → none; no user-HTML rendering. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.8 | Validate input and output | ✅ OK | `validateClient()` mirrors BE rules (kana `HALF_WIDTH_KATAKANA_RE` + tel/fax `/^\d+$/` + conditional bank cluster); required strings use `?.trim()` (optional chaining for antd allow-clear). | — |
| 2.9 | Store data securely | ⚪ NA | No credential/file storage on FE. | — |
| 2.10 | No hardcoded credentials | ✅ OK | No secrets in view. | — |

**Section 2 score**: 6 OK / 0 NOK / 4 NA — Quyền + validate phía FE đầy đủ; mục BE-only đánh NA theo side=FE.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency introduced. | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA — Không phát sinh thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `validateClient`, `buildCreateBody`, `onSubmit`, `applyRouteMode`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | — | — |
| 4.3 | Normal path distinguishable | ✅ OK | `onSubmit` validates → guards → happy submit → navigate. | — |
| 4.4 | Operation not too long (extract private) | ✅ OK | `validateClient` ~40 lines (bank cluster extracted); template sectioned via Base* components. | — |
| 4.5 | Decision points limited | ✅ OK | `collectBankClusterErrors` extracted to keep `validateClient` complexity low. | — |
| 4.6 | Variables well named | ✅ OK | `errs`, `BANK_FIELDS`, `SHIHARAI_CYCLE_OPTIONS`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | No stale change-log comments. | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | `[route-reuse]` explains the create↔edit instance reuse re-init. | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, verified via vue-tsc. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | — | — |
| 4.16 | Global vs local function differentiated | ✅ OK | — | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `defaultFormState`, `HanbaitenFormState` interface. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/views/hanbaiten/HanbaitenFormView.vue`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + sibling spec under `__tests__/`. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No console / commented-out code; `noUnusedLocals` clean via vue-tsc. | — |

**Section 4 score**: 21 OK / 0 NOK / 0 NA — Source code FE đạt toàn bộ tiêu chí.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 8 | 0 | 1 | 0% |
| 2. Security | 10 | 6 | 0 | 4 | 0% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 21 | 0 | 0 | 0% |
| **Total** | **42** | **35** | **0** | **7** | **0%** |

### Phân bổ severity 0 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 0 | — |
| 🟢 Minor | 0 | — |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | `<script setup>`, đặt tên chuẩn, dùng Base* components. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ (8 OK / 1 NA) | Comment WHY có nhãn rõ ràng, header SFC chính xác. |
| **Hardcode & Duplication** (1.3, 1.4) | ✅ (2/2 OK) | Dùng `ItakuKubun.FURIKOMI` + message consts + Base components. |
| **Security & Auth** (2.2, 2.3, 2.6, 2.8, 2.10) | ✅ (5/5 OK) | Router permission + canSubmit + validate mirror BE. |
| **Sensitive Data Handling** (2.5) | ✅ (1 OK) | Không console/localStorage token. |
| **Code Length & Complexity** (4.4, 4.5) | ✅ (2/2 OK) | validateClient gọn, bank cluster tách hàm. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ (5/5 OK) | Sạch, vue-tsc clean. |
| **Third Party** (3.1-3.2) | ⚪ (NA) | Không phát sinh lib. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Mirror BE validation chính xác**: `validateClient` lặp lại đúng quy tắc BE (kana half-width, tel/fax `/^\d+$/`, conditional bank cluster khi `ItakuKubun.FURIKOMI`) (HanbaitenFormView.vue:380-420) — người dùng thấy lỗi tức thì, không chờ round-trip.
2. **Enum Group A dùng đúng nguồn**: `ItakuKubun.FURIKOMI` từ `@/constants/enums` cho cả branching script lẫn dấu `*` required trong template (:369, :783-905) — không magic number (gương mẫu mà BE nên copy).
3. **Permission OR-semantics nhất quán router↔component**: route `meta.permission` mảng + `canSubmit`/`isStaff` computed cùng đọc `hanbaiten.daiko_input` cho luồng NICHINO_STAFF 代行入力 (:157-176) — phân quyền không drift giữa guard và nút.
4. **Error handling đúng kiến trúc 4 tầng**: chỉ map `errors[]` field-level vào `fieldErrors`, để global axios interceptor toast 500/400 chung (:496-511) — không double-toast.

### Weakness (điểm cần cải thiện)

1. **ESLint không chạy được trong container**: `node_modules/.bin/eslint not found` — type-check (`vue-tsc`) sạch nhưng quy tắc style/lint không được CI enforce ở môi trường review hiện tại. Gốc rễ: image frontend thiếu eslint binary / script `npm run lint` chưa wire. Không phải lỗi của màn hình này nhưng nên xử lý ở tầng infra để các review sau có lint gate.

### Verdict cuối

- [x] Pass ← 0 🔴, 0 🟡, 0 NOK
- [ ] Review Again
- [ ] Acceptable

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| — | — | — | — | Không có action bắt buộc cho FE. (Follow-up infra: wire ESLint binary trong container frontend để có lint gate.) | — |

**Tổng effort dự kiến**: 0 phút — FE đạt Pass. Follow-up ESLint infra nằm ngoài phạm vi màn hình.

---

## Suggested diffs (chi tiết cho mỗi NOK)

Không có NOK cho phía Frontend — không có diff đề xuất.
