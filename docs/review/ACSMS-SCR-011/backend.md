# Báo cáo Code Review — ACSMS-SCR-011 (購読者情報登録画面) — Backend only

**Scope**: BE

<!-- machine-readable metadata — consumed by scripts/checklist_md_to_excel.py. -->
- Project name: AGRI_CMS
- Project manager: dat.nguyenhuy
- Products/Files: apps/backend/src/modules/dokusya/dokusya.controller.ts, dokusya.service.ts, dokusya.mapper.ts, dokusya.module.ts, dto/*, exceptions/*, apps/backend/src/database/entities/dokusya.entity.ts
- PIC: dat.nguyenhuy
- Reviewer: quanh
- Approver:
- Review date: 2026/06/20
- Side: Backend

## Files reviewed

**Backend** (核心ファイル):
- [`dokusya.controller.ts`](apps/backend/src/modules/dokusya/dokusya.controller.ts) — 13 endpoints (SCR-010/011/013/014/015/016); SCR-011 = detail / create / update / approve / reject / history
- [`dokusya.service.ts`](apps/backend/src/modules/dokusya/dokusya.service.ts) — business logic (create / update / approve / reject + bulk flows)
- [`dokusya.mapper.ts`](apps/backend/src/modules/dokusya/dokusya.mapper.ts) — entity → response DTO + `isDokusyaReadOnly` predicate
- [`dto/create-dokusya.dto.ts`](apps/backend/src/modules/dokusya/dto/create-dokusya.dto.ts), [`dto/update-dokusya.dto.ts`](apps/backend/src/modules/dokusya/dto/update-dokusya.dto.ts), [`dto/dokusya-response.dto.ts`](apps/backend/src/modules/dokusya/dto/dokusya-response.dto.ts)
- [`exceptions/`](apps/backend/src/modules/dokusya/exceptions/) — 12 domain exceptions

---

## Summary chi tiết — Bảng tổng hợp theo từng tiêu chí

### Section 1 — Format

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 1.1 | Standard Coding Convention | ❌ NOK | tsc clean; eslint reports 1 error + 1 warning in production source: `no-extra-boolean-cast` (dokusya.service.ts:1731), `no-useless-assignment` (dokusya.service.ts:3657). | 🟢 Minor |
| 1.2 | Meaningful naming | ✅ OK | — | — |
| 1.3 | Avoid all hardcode | ❌ NOK | §1.3.a magic numbers in `isDokusyaReadOnly` (dokusya.mapper.ts:189-190): raw `3`/`2`/`6` while `DokusyaShubetsu.BOTH/DIGITAL` + `ShiharaiHoho.CREDIT_CARD` enums exist and are used in dokusya.service.ts. §1.3.b: no inline JP business message — clean. | 🟡 Major |
| 1.4 | No duplication | ✅ OK | Uses shared helpers `applyBranchScope`/`assertBranchScope`/`fetchFkInJa`/`buildAuditCtx`; message consts (`EMAIL_REQUIRED_DIGITAL_MSG`). | — |
| 1.5 | Complex logic commented | ✅ OK | WHY comments on route ordering, tx boundaries, read-only rule (api.md §4.5). | — |
| 1.6 | Comments accurate & up-to-date | ✅ OK | — | — |
| 1.7 | Operation purpose commented | ✅ OK | `@ApiOperation` on every endpoint; JSDoc on service methods. | — |
| 1.8 | Other relevant facts commented | ✅ OK | Tx-in/out-of-scope audit reasoning documented. | — |
| 1.9 | Correct header comments on class/function | ⚪ NA | Project convention: no file-level header. | — |

**Section 1 score**: 6 OK / 2 NOK / 1 NA — magic-number (1.3) là vấn đề chính; lint nit (1.1) trivial.

### Section 2 — Security

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 2.1 | Injection / SQL Injection protected | ✅ OK | All ~10 raw `dataSource.query` calls use `$1`/`$2` placeholders; lone `${table}` interpolation is from `RELATED_TABLES` allowlist const (`t_koza_furikae`). | — |
| 2.2 | Authentication & Session management | ✅ OK | `@UseGuards(SessionAuthGuard, PermissionsGuard)` at controller (dokusya.controller.ts:65). | — |
| 2.3 | Access Control sufficient | ✅ OK | `@Permissions('dokusya.*')` per endpoint; `applyBranchScope`/`assertBranchScope`, `fetchFkInJa` (FK guard), `assertShubetsuFlag`, `DokusyaReadOnlyException`. | — |
| 2.4 | Security Configuration | ✅ OK | Import endpoint `@Throttle({ limit: 10, ttl: 60000 })`; helmet/CORS at app-level (main.ts, out of module scope). | — |
| 2.5 | No sensitive data exposure | ✅ OK | Single structured `logger.warn` logs import metadata only (no PII); response DTO has no password/session/otp/token. | — |
| 2.6 | Attack Protection | ✅ OK | `forbidNonWhitelisted: true` global; DTO `@Transform(blankToUndef)` + class-validator. | — |
| 2.7 | No under-protected APIs | ✅ OK | Every endpoint has `@Permissions`. | — |
| 2.8 | Validate input and output | ❌ NOK | `shimei_kana_sei`/`shimei_kana_mei` (create-dokusya.dto.ts:159,167) have only `@IsString`/`@MaxLength` — no hiragana `@Matches`, while FE enforces `HIRAGANA_RE`. Spec (validation-matrix #8/#9) requires ひらがな. Defense-in-depth gap; same for optional `haitatsu_shimei_kana_*`. | 🟡 Major |
| 2.9 | Store data securely | ⚪ NA | No password/secret/file storage on this screen (subscriber master data). | — |
| 2.10 | No hardcoded credentials | ✅ OK | Zero `process.env` in module; no secrets. | — |

**Section 2 score**: 8 OK / 1 NOK / 1 NA — auth/scope/FK-guard mạnh; chỉ thiếu format-validation cho kana (2.8).

### Section 3 — Third party

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 3.1 | Customer/PM approval for libraries | ⚪ NA | No new dependency introduced for this screen. | — |
| 3.2 | License agreements respected | ⚪ NA | No new dependency. | — |

**Section 3 score**: 0 OK / 0 NOK / 2 NA — không phát sinh thư viện mới.

### Section 4 — Source code

| # | Check Item | Status | 1-line Evidence | Severity |
|---|---|---|---|---|
| 4.1 | Meaningful operation name | ✅ OK | `getDetail`/`create`/`update`/`approve`/`reject`/`assertShubetsuFlag`. | — |
| 4.2 | Descriptive parameter names | ✅ OK | — | — |
| 4.3 | Normal path distinguishable | ✅ OK | Guard-first (assertScope/assertShubetsuFlag throw early), happy return at bottom. | — |
| 4.4 | Operation not too long | ❌ NOK | `create()` (~110 lines), `update()`, `importExcel()` exceed 50 lines — driven by 67-field form + tx orchestration; extractable into private snapshot/FK-resolve helpers. | 🟢 Minor |
| 4.5 | Decision points limited | ✅ OK | Complex but helpers extracted; nesting ≤3. | — |
| 4.6 | Variables well named | ✅ OK | — | — |
| 4.7 | General description for code paragraphs | ✅ OK | — | — |
| 4.8 | Description of changes | ✅ OK | — | — |
| 4.9 | Complicated paragraphs have explanation | ✅ OK | — | — |
| 4.10 | Structural code paragraph indented | ✅ OK | 2-space, verified via tsc/prettier-clean source. | — |
| 4.11 | One command per line | ✅ OK | — | — |
| 4.12 | Break sign for long lines | ✅ OK | — | — |
| 4.13 | Continuation line indent | ✅ OK | — | — |
| 4.14 | Variable ≠ object/class name | ✅ OK | — | — |
| 4.15 | Functions named in common way | ✅ OK | Repo `findOne`; service `create/update/remove`. | — |
| 4.16 | Global vs local function differentiated | ✅ OK | — | — |
| 4.17 | Function name has meaning | ✅ OK | — | — |
| 4.18 | Object naming standard-compliant | ✅ OK | `CreateDokusyaDto`/`UpdateDokusyaDto`/`DokusyaResponseDto`; entity `Dokusya`. | — |
| 4.19 | Folder/library naming per design doc | ✅ OK | `src/modules/dokusya/`, entity at `src/database/entities/`. | — |
| 4.20 | Folder content conforms standard | ✅ OK | — | — |
| 4.21 | No redundant/unused lines | ❌ NOK | Dead init `let affectedDokusyaId: number \| null = null` overwritten before read (dokusya.service.ts:3657); redundant `Boolean(...)` in ternary (dokusya.service.ts:1731). | 🟢 Minor |

**Section 4 score**: 18 OK / 2 NOK / 0 NA — chỉ còn nit về độ dài method (4.4) và dead-code (4.21).

---

## Tổng hợp toàn báo cáo

### Bảng số liệu

| Section | Total | ✅ OK | ❌ NOK | ⚪ NA | NOK% |
|---|---|---|---|---|---|
| 1. Format | 9 | 6 | 2 | 1 | 22% |
| 2. Security | 10 | 8 | 1 | 1 | 10% |
| 3. Third party | 2 | 0 | 0 | 2 | 0% |
| 4. Source code | 21 | 18 | 2 | 0 | 10% |
| **Total** | **42** | **32** | **5** | **5** | **12%** |

### Phân bổ severity 5 NOK

| Severity | Count | Items |
|---|---|---|
| 🔴 Block | 0 | — |
| 🟡 Major | 2 | 1.3 (magic-number in mapper), 2.8 (kana format-validation gap) |
| 🟢 Minor | 3 | 1.1 (lint nit), 4.4 (method length), 4.21 (dead-code) |

### Đánh giá theo nhóm tiêu chí

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| **Architecture & Naming** (1.1, 1.2, 4.1, 4.6, 4.14-4.20) | ✅ (9/10 OK) | Cấu trúc module chuẩn; chỉ vướng lint nit ở 1.1. |
| **Comments & Documentation** (1.5-1.9, 4.7-4.9) | ✅ | Comment WHY dày, giải thích tx boundary + route ordering rõ. |
| **Hardcode & Duplication** (1.3, 1.4) | 🟡 | Mapper dùng số ma thuật dù enum đã tồn tại; duplication tổng thể tốt. |
| **Security & Auth** (2.1-2.4, 2.6-2.8, 2.10) | 🟡 | Auth/scope/FK-guard rất mạnh; chỉ thiếu format-validation kana (2.8). |
| **Sensitive Data Handling** (2.5, 2.9) | ✅ | Log structured không lộ PII; DTO không lộ field nhạy cảm. |
| **Code Length & Complexity** (4.4, 4.5) | 🟢 | Method dài do form 67 field — chấp nhận được, có thể tách helper. |
| **Code Hygiene** (4.10-4.13, 4.21) | 🟢 | 1 dead-init + 1 redundant Boolean. |
| **Third Party** (3.1-3.2) | ⚪ NA | Không phát sinh dependency mới. |

### Strength (điểm mạnh đáng ghi nhận)

1. **Audit + DML atomicity chuẩn mực**: create/update/delete bọc `dataSource.transaction(...)` với `logCreate/logUpdate/logDelete` nhận `manager` IN-TX, còn `logError` chạy OUTSIDE tx đã rollback (dokusya.service.ts:715-764, 889-982, 2030-2042) — đúng tuyệt đối spec nestjs.md §Audit.
2. **4 lớp access control đầy đủ**: `@Permissions` + `applyBranchScope`/`assertBranchScope` (Layer 2) + `fetchFkInJa` (Layer 4 cross-tenant FK) + `assertShubetsuFlag` + read-only enforcement — hiếm screen nào dùng đủ cả 4.
2. **Raw SQL an toàn 100%**: mọi `dataSource.query` đều parameterized; `${table}` duy nhất đến từ allowlist const, không phải user input (dokusya.service.ts:2011).
4. **m_code serialization đúng**: response DTO KHÔNG có `*_label` (dokusya-response.dto.ts:18) — đúng rule "authenticated endpoint chỉ serialize value".

### Weakness (điểm cần cải thiện)

1. **Enum đã có nhưng mapper bỏ quên**: service.ts dùng `DokusyaShubetsu.*`/`ShiharaiHoho.*` nhất quán, nhưng mapper.ts vẫn hardcode `3`/`2`/`6` — dấu hiệu code-review chưa quét hết file phụ (mapper) khi enforce enum, dễ tái diễn ở các mapper module khác.
2. **Format-validation không đối xứng FE↔BE**: kana field được FE check hiragana nhưng BE chỉ check length/type → khi import qua API/curl, dữ liệu sai script lọt vào DB rồi vỡ ở report PDF/Excel downstream. Gốc rễ: chưa có decorator kana dùng chung như `@/utils/kana` bên FE.

### Verdict cuối

- [ ] Pass
- [ ] Review Again
- [x] Acceptable ← 0 🔴 AND 2 🟡

### Action items theo thứ tự ưu tiên

| # | Severity | File:Line | Item ref | Action | Effort |
|---|---|---|---|---|---|
| 1 | 🟡 | `dokusya.mapper.ts:189-190` | 1.3 | Import `DokusyaShubetsu`/`ShiharaiHoho`, thay `3`/`2`/`6` bằng `BOTH`/`DIGITAL`/`CREDIT_CARD`. | 5 phút |
| 2 | 🟡 | `create-dokusya.dto.ts:159,167` (+haitatsu kana) | 2.8 | Thêm `@Matches(HIRAGANA_NAME_RE)` cho các field `*_kana`, message ひらがな. | 10 phút |
| 3 | 🟢 | `dokusya.service.ts:1731,3657` | 1.1 + 4.21 | Bỏ `Boolean(...)` thừa; bỏ init `= null` thừa (chạy `eslint --fix`). | 3 phút |
| 4 | 🟢 | `dokusya.service.ts` create/update/importExcel | 4.4 | (Optional) tách private helper cho snapshot/FK-resolve. | 30 phút |

**Tổng effort dự kiến để chuyển từ "Acceptable" → "Pass"**: ~18 phút (item #1-#3); item #4 optional có thể defer sang follow-up MR.

---

## Suggested diffs (chi tiết cho mỗi NOK)

### NOK 1.3 — magic number in `isDokusyaReadOnly` (mapper)

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.mapper.ts:189-190
```

```ts
if (shubetsu === 3) return true;
return shubetsu === 2 && hoho === 6;
```

Suggested fix:
```diff
+ import { DokusyaShubetsu, ShiharaiHoho } from '@/common/enums';
...
- if (shubetsu === 3) return true;
- return shubetsu === 2 && hoho === 6;
+ if (shubetsu === DokusyaShubetsu.BOTH) return true;
+ return shubetsu === DokusyaShubetsu.DIGITAL && hoho === ShiharaiHoho.CREDIT_CARD;
```
Lý do: enum đã tồn tại và service.ts đã dùng — mapper phải đồng bộ (`.claude/rules/nestjs.md §Group A`).

### NOK 2.8 — kana field thiếu format-validation (BE)

Hiện trạng:
```
apps/backend/src/modules/dokusya/dto/create-dokusya.dto.ts:159,167 (+ haitatsu_shimei_kana_* trong cùng file / update DTO)
```

Suggested fix:
```diff
+ const HIRAGANA_NAME_RE = /^[ぁ-ゖー\s]+$/u;
+ const HIRAGANA_NAME_MSG = '氏名カナは全角ひらがなで入力してください。';
...
  @MaxLength(100, { message: '氏名カナ(姓)は最大100文字で指定してください。' })
+ @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
  shimei_kana_sei!: string;
...
  @MaxLength(100, { message: '氏名カナ(名)は最大100文字で指定してください。' })
+ @Matches(HIRAGANA_NAME_RE, { message: HIRAGANA_NAME_MSG })
  shimei_kana_mei!: string;
```
Phải khớp regex với FE `HIRAGANA_RE` (`/^[ぁ-ゖー\s]+$/u`). Áp dụng tương tự cho `haitatsu_shimei_kana_*` (giữ `@IsOptional` + `@Transform(blankToUndef)` trước `@Matches`).

### NOK 1.1 + 4.21 — lint (redundant Boolean + dead assignment)

Hiện trạng:
```
apps/backend/src/modules/dokusya/dokusya.service.ts:1731  (no-extra-boolean-cast, error)
apps/backend/src/modules/dokusya/dokusya.service.ts:3657  (no-useless-assignment, warning)
```

Suggested fix:
```diff
- return Boolean(after.haitatsuSameFlg)
+ return after.haitatsuSameFlg
    ? [ /* ... */ ]
    : [ /* ... */ ];
```
```diff
- let affectedDokusyaId: number | null = null;
+ let affectedDokusyaId: number | null;
```
(Init `= null` bị ghi đè trên mọi nhánh trước khi đọc → khai báo không init; hoặc chạy `eslint --fix`.)
