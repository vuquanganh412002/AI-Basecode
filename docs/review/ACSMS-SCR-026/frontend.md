# Báo cáo Code Review — ACSMS-SCR-026 (購読者名簿出力画面) — Frontend only

**Scope**: FE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/frontend/src/views/report/MeiboReportView.vue, apps/frontend/src/api/report/report.ts, apps/frontend/src/router/index.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/07/19
- Side: Frontend

## Files reviewed

**Frontend** (2 source files + router):
- [`views/report/MeiboReportView.vue`](apps/frontend/src/views/report/MeiboReportView.vue) — SCR-026 view: output-condition form + preview (hanbaiten/kanri_shiten) + Excel export
- [`api/report/report.ts`](apps/frontend/src/api/report/report.ts) — hand-written axios wrapper (meibo portion, L1-134; usage reviewed, not the zougen part)
- Router entry: [`router/index.ts`](apps/frontend/src/router/index.ts#L337-L343) (entries L337-L343)

> ⚠️ Môi trường: docker dev-stack đang **down** — `vue-tsc --noEmit` / `eslint` không chạy được. Kết luận 1.1/4.21 dựa trên grep tĩnh + đọc source.

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ✅ OK | PascalComponent `MeiboReportView.vue`, `<script setup lang="ts">` (no Options API), kebab-case wrapper file. vue-tsc/lint NOT run (container down) — grep-clean only. | — |
| 1.2 | Meaningful naming | ✅ OK | `canUse`, `hasReportData`, `isEmptyResult`, `previewData`, `fieldErrors`; boolean prefixes `is*/has*/can*`. | — |
| 1.3 | Avoid all hardcode | ❌ NOK | 1.3.a: magic number `3` in branching — `codes.options('DOKUSYA_SHUBETSU').filter((o) => Number(o.value) !== 3)` (MeiboReportView.vue:76). FE enum `DokusyaShubetsu.BOTH` exists (`@/constants/enums`) and is Group A — must be referenced, not literal `3`. 1.3.b: no reused inline JP message. | 🟡 Major |
| 1.4 | No duplication | ✅ OK | Uses BaseHanbaitenSelect / BaseKanriShitenSelect / BaseReportPager / useNotify / formatters. Raw card div (not BaseCard) but consistent with sibling ZougenHanbaiten/Nichino views (module convention). | — |
| 1.5 | Complex logic commented | ✅ OK | WHY comments on `v-show` vs `v-if` (all-select cache, :306-308), nominal per_page (:57-61), items-start alignment (:240-242). | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | Comments match current behavior (支払サイクル→支払方法 migration noted :70-71); no stale TODO. | — |
| 1.7 | Operation purpose commented | ✅ OK | JSDoc on `fetchPage`, `splitAddress`, `validate` intent; screen header comment (:1-3). | — |
| 1.8 | Other relevant facts commented | ✅ OK | Empty-result vs has-data gating rationale (:79-84), nichino flag not sent by FE (:136-137). | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 7 OK / 1 NOK / 1 NA — Chỉ vướng 1 magic number `3` (DokusyaShubetsu.BOTH).

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.2 | Authentication & Session management | ✅ OK | Route `meta.permission: 'report.export_meibo'`; no token/session in localStorage; API via shared axios (cookie-based). | — |
| 2.3 | Access Control sufficient | ✅ OK | FE mirror: `canUse` gates preview+export buttons `:disabled="!canUse"` (:352,356) + no-permission alert `data-test="no-permission"` (:229-235) + router meta.permission. | — |
| 2.4 | Security Configuration | ⚪ NA | Backend not in scope (side=FE) — helmet/CORS/throttle are server-side. | — |
| 2.5 | No sensitive data exposure | ✅ OK | No `console.*` in view (grep clean); no credentials logged. | — |
| 2.6 | Attack Protection | ✅ OK | No `v-html` (grep clean); all interpolation escaped. | — |
| 2.7 | No under-protected APIs | ⚪ NA | Backend not in scope (side=FE). | — |
| 2.8 | Validate input and output | ✅ OK | `validate()` mirrors BE required rules (tekiyo_date / ids ≥1), `formState.tekiyo_date?.trim()` optional-chaining for clearable date-picker (:107). | — |
| 2.9 | Store data securely | ⚪ NA | Backend not in scope (side=FE) — S3 storage is server-side; FE keeps no local persistence. | — |
| 2.10 | No hardcoded credentials | ⚪ NA | Backend not in scope (side=FE). | — |

**Section 2 score**: 6 OK / 0 NOK / 4 NA — Permission mirror + input validation phía FE đạt.

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ✅ OK | No new FE dependency — reuses ant-design-vue, existing Base* components, dayjs helpers. | — |
| 3.2 | License agreements respected | ✅ OK | No new library added. | — |

**Section 3 score**: 2 OK / 0 NOK / 0 NA — Không thêm dependency.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | onPreview / onExport / onPageChange / fetchPage / buildQuery / validate; composable `useNotify`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | `fetchPage(page)`, `buildQuery(page?)`, `splitAddress(addr)`, `onPageChange(page)`. | — |
| 4.3 | Normal path distinguishable | ✅ OK | `validate()` guard returns early in onPreview/onExport; happy path after. | — |
| 4.4 | Operation not too long (extract private) | ❌ NOK | `<template>` ~344 lines (:226-570) > 200-line component guideline — renders two full report layouts inline; extract `<HanbaitenMeiboPreview>` / `<KanriShitenMeiboPreview>` sub-components. Script methods themselves all < 50L. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Script complexity low; template nesting is data-rendering (table>tbody>v-for), not logic branching. | — |
| 4.6 | Variables well named | ✅ OK | Loop vars named (`hg`/`kg`/`row` w/ context), no `obj`/`arr`/`temp`. | — |
| 4.7 | General description for code paragraphs | ✅ OK | Section banners (`─── ページ送り ───`, `─── 帳票ヘッダ表示用 ───`). | — |
| 4.8 | Description of changes | ✅ OK | Migration notes inline (支払区分→支払方法; ラジオ廃止 :344-345). | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | `splitAddress` regex has 〒{7桁} match description (:198-201). | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space; template consistently indented. | — |
| 4.11 | One command per line | ✅ OK | No multi-statement lines. | — |
| 4.12 | Break sign for long lines | 🟢 note | A few long template `<td>`/`<div>` lines (:472,539) — acceptable for markup. | — |
| 4.13 | Continuation line indent | ✅ OK | Chained computed / reactive wrapped + indented. | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | No shadow of imported types. | — |
| 4.15 | Functions named in common way | ✅ OK | on*-prefixed handlers; buildQuery/fetchPage descriptive. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | All local to `<script setup>`; shared logic via imported composables. | — |
| 4.17 | Function name has meaning | ✅ OK | splitAddress / tekiyoLabel / selectedHanbaitenNames self-describing. | — |
| 4.18 | Object naming standard-compliant | ✅ OK | Store `useAuthStore`/`useCodesStore`; interface `MeiboReportQuery` per convention. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/views/report/`; wrapper `src/api/report/report.ts`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | View + `__tests__` sibling; api wrapper per tag. | — |
| 4.21 | No redundant/unused lines | ✅ OK | No console/debugger, no commented-out code, no `any`, no `@ts-nocheck`; imports consumed. | — |

**Section 4 score**: 20 OK / 1 NOK / 0 NA — Template dài (2 layout gộp) là điểm duy nhất.

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 7 | 1 | 1 | 11.1% |
| 2. Security | 10 | 6 | 0 | 4 | 0% |
| 3. Third party | 2 | 2 | 0 | 0 | 0% |
| 4. Source code | 21 | 20 | 1 | 0 | 4.8% |
| **Total** | **42** | **35** | **2** | **5** | **4.8%** |

### Phân bổ severity 2 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 1 | 1.3 (magic number `3` → DokusyaShubetsu.BOTH) |
| 🟢 Minor | 1 | 4.4 (template 344 dòng — tách sub-component) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (10/10 OK) | `<script setup>`, naming chuẩn, Base* components tái sử dụng. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment WHY dày, giải thích v-show/v-if & nominal per_page tốt. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 | 1 magic number `3` (併読) chưa dùng enum; phần còn lại sạch. |
| **Security & Auth** (2.2, 2.3, 2.5, 2.6, 2.8) | ✅ | Permission gate + validate mirror + không v-html/console. |
| **Sensitive Data Handling** (2.5) | ✅ | Không log PII, không lưu token localStorage. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 | Template gộp 2 layout → 344 dòng; nên tách 2 preview component. |
| **Code Hygiene** (4.10-4.13, 4.21) | ✅ | Không rác, không import thừa. |
| **Third Party** (3.1-3.2) | ✅ | Không thêm lib. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Permission UX đúng chuẩn**: nút preview/export `:disabled="!canUse"` + alert `この機能はJAアカウントのみ使用できます。` (MeiboReportView.vue:229-235,352,356) — người dùng日農 thấy rõ lý do thay vì nút biến mất; khớp pattern §Form/Layout của vue.md.
2. **Label m_code không hardcode**: `codes.label('DOKUSYA_SHUBETSU', …)` / `codes.label('SHIHARAI_HOHO', …)` (:541-542) đúng luật m_code editable-at-runtime.
3. **Validate mirror + optional chaining**: `formState.tekiyo_date?.trim()` (:107) phòng đúng ca a-date-picker clear → undefined; message literal khớp ACSMS-MSG-026-002/003/006.
4. **Wrapper type mirror BE**: `report.ts` phản chiếu chính xác shape `MeiboPreviewData` gồm cả meta phân trang (group_page_no/group_total_pages) — không lệch contract.

### Weakness (điểm cần cải thiện)

1. **Chưa tận dụng FE enum cho branching**: `!== 3` cho thấy thói quen dùng literal khi lọc option; DokusyaShubetsu là Group A đã có enum → cần quy ước "branching = enum, label = m_code" được enforce (lint rule / review) để không tái diễn ở report screen sau.
2. **Template phình do gộp 2 layout**: đặt cả hanbaiten + kanri_shiten preview trong 1 file làm template 344 dòng, khó đọc/khó test riêng; là dấu hiệu nên tách component preview trước khi thêm biến thể帳票 mới.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable

(0 🔴, 1 🟡 → Acceptable.)

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `MeiboReportView.vue:76` | 1.3 | Thay literal `3` bằng `DokusyaShubetsu.BOTH`, import từ `@/constants/enums` | ~3 phút |
| 2 | 🟢 | `MeiboReportView.vue:226-570` | 4.4 | (Optional) tách `<HanbaitenMeiboPreview>` / `<KanriShitenMeiboPreview>` để template < 200 dòng | ~30 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~3 phút (item #1); item #2 optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 #1 — magic number `3` (併読) trong branching

Hiện trạng:
```
apps/frontend/src/views/report/MeiboReportView.vue:76
```

```ts
const shubetsuOptions = computed(() =>
  codes.options('DOKUSYA_SHUBETSU').filter((o) => Number(o.value) !== 3),
);
```

Suggested fix:
```diff
+ import { DokusyaShubetsu } from '@/constants/enums';
...
  const shubetsuOptions = computed(() =>
-   codes.options('DOKUSYA_SHUBETSU').filter((o) => Number(o.value) !== 3),
+   codes.options('DOKUSYA_SHUBETSU').filter(
+     (o) => Number(o.value) !== DokusyaShubetsu.BOTH,
+   ),
  );
```
Tham chiếu: `.claude/rules/vue.md §Group A vs Group B` — DOKUSYA_SHUBETSU là Group A (branching), enum `@/constants/enums/dokusya-shubetsu.ts` đã tồn tại (`BOTH: 3`). BE đã dùng `DokusyaShubetsu.BOTH` ở meibo-report.service.ts:304 → FE phải khớp.

### NOK 4.4 #2 — template 344 dòng (Minor, optional)

Hiện trạng:
```
apps/frontend/src/views/report/MeiboReportView.vue:226-570  <template> (~344 dòng, gộp 2 layout)
```

Suggested fix (tách sub-component preview theo report_type):
```diff
  <template v-if="previewData.report_type === 'hanbaiten'">
-   <!-- ~110 dòng bảng販売店別 inline -->
+   <HanbaitenMeiboPreview :data="previewData" :output-date="outputDate" :output-time="outputTime" />
  </template>
  <template v-else>
-   <!-- ~60 dòng bảng管理支店別 inline -->
+   <KanriShitenMeiboPreview :data="previewData" :output-date="outputDate" :output-time="outputTime" />
  </template>
```
(Non-blocking — giảm độ dài template + cho phép test riêng từng layout; hành vi không đổi.)
