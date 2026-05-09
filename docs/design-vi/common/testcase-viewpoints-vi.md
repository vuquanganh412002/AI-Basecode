---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト観点一覧
format_code: 19-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-27
test_level: 結合テスト
author: VTI QA Lead
reviewer: Nguyen Huy Dat
---

# Tài liệu chiến lược test — Danh sách quan điểm test (Testcase Viewpoints)

## 1. Mục đích tài liệu

Tài liệu này là **chiến lược test toàn hệ thống**, không phải danh sách test case chi tiết. Khi đội QA thiết kế test case cho từng màn hình ACSMS-SCR-XXX, tài liệu này định nghĩa các "quan điểm (viewpoint)" cần kiểm tra. Mỗi viewpoint biểu diễn **một trục rủi ro nghiệp vụ hoặc kỹ thuật** áp dụng xuyên suốt nhiều màn hình.

### Lý do cần tài liệu này

ACSMS có khoảng 31 màn hình. Nếu mỗi màn hình thiết kế test case độc lập, sẽ phát sinh 3 vấn đề điển hình của dự án Nhật:

1. **Mất cân bằng coverage** — Màn hình A có 80 case validation đầu vào, màn hình B chỉ có 20 → Khi review với khách hàng phát hiện gap → Hồi quy cuối kỳ.
2. **Lặp lại mô tả** — Cùng quan điểm "SQL Injection input" có 31 cách diễn đạt khác nhau → Khó audit.
3. **Bỏ sót rủi ro xuyên hệ thống** — Các quan điểm như "test edit đồng thời", "test session expire khi đang thao tác"... cần thực hiện thống nhất trên toàn bộ màn hình nhưng dễ bị bỏ sót khi mỗi tester làm riêng.

Tài liệu viewpoint giải quyết bằng cách:

- Phân chia rủi ro thành **5 nhóm × 37 viewpoint**.
- Mỗi viewpoint có **mức rủi ro**, **phạm vi áp dụng**, **phương pháp thiết kế test case**, **cạm bẫy điển hình**.
- Trong feature sheet của từng màn hình, chỉ cần map test case của mình với `観点ID` là đủ. Reviewer chỉ cần scan 1 lần để đánh giá độ phủ.

### Cách sử dụng

| Vai trò | Hành động |
|---|---|
| Test Lead | Review viewpoint, set mức rủi ro, được khách hàng phê duyệt |
| QA Designer | Khi tạo test case cho màn hình mới, kiểm tra từng viewpoint, mỗi viewpoint áp dụng cần ≥1 case |
| QA Executor | Khi thực thi test, ghi `観点ID` cho từng case để biết đang cover viewpoint nào |
| Reviewer / Khách hàng | Đọc tài liệu này **trước** khi xem feature sheet, hiểu chiến lược tổng thể trước khi đi vào chi tiết |

### Mức rủi ro

- **Cao (高)** — Bug gây mất dữ liệu, sai phán đoán quyền, rò rỉ thông tin, vỡ audit log. Phải test 100% trước release.
- **Trung bình (中)** — Bug gây sai số liệu, vỡ UX, không thực hiện được nghiệp vụ. Sampling 70-80%.
- **Thấp (低)** — UX, layout, edge case hiệu năng. Chỉ spot check.

---

## 2. 観点一覧（全体）

| 観点ID | 大分類 | 観点名 | リスク | 対象画面範囲 | TC見積 |
|---|---|---|---|---|---|
| VP-A-01 | A. Bảo mật & Phân quyền | Kiểm soát quyền theo Role (RBAC gate) | 高 | Khoảng 25 màn hình bảo vệ | 265 |
| VP-A-02 | A. Bảo mật & Phân quyền | Phạm vi dữ liệu (DataScope) | 高 | Khoảng 20 màn list/detail | 200 |
| VP-A-03 | A. Bảo mật & Phân quyền | Hạn chế cấp trường (Field-level restriction) | 高 | 5 màn master | 50 |
| VP-A-04 | A. Bảo mật & Phân quyền | Tấn công truy cập URL trực tiếp | 高 | Khoảng 25 màn bảo vệ | 75 |
| VP-A-05 | A. Bảo mật & Phân quyền | Session expire / Xử lý 401 | 高 | Toàn hệ thống | 30 |
| VP-A-06 | A. Bảo mật & Phân quyền | XSS / HTML / SQL Injection | 高 | Khoảng 20 form | 80 |
| VP-A-07 | A. Bảo mật & Phân quyền | CSRF / Cookie security flag | 中 | Toàn hệ thống | 10 |
| VP-B-01 | B. Validation dữ liệu | Kiểm tra trường bắt buộc | 中 | Khoảng 25 form | 100 |
| VP-B-02 | B. Validation dữ liệu | Boundary độ dài tối thiểu/tối đa | 中 | Khoảng 25 form | 80 |
| VP-B-03 | B. Validation dữ liệu | Regex format (mã bưu điện/SĐT/code) | 中 | Khoảng 20 form | 60 |
| VP-B-04 | B. Validation dữ liệu | Xử lý nửa-rộng / toàn-rộng | 中 | Khoảng 25 form | 50 |
| VP-B-05 | B. Validation dữ liệu | Logic ngày | 中 | Khoảng 10 form có date | 30 |
| VP-B-06 | B. Validation dữ liệu | Format tiền tệ / phần trăm | 中 | 2-3 form (đơn giá) | 15 |
| VP-B-07 | B. Validation dữ liệu | Tham chiếu master code (m_code) | 中 | Khoảng 15 form có dropdown | 45 |
| VP-B-08 | B. Validation dữ liệu | Trùng key (duplicate code) | 中 | Khoảng 10 master | 30 |
| VP-C-01 | C. Logic nghiệp vụ | CRUD chính + Persist DB | 高 | Khoảng 10 master | 60 |
| VP-C-02 | C. Logic nghiệp vụ | Conflict edit đồng thời | 中 | Khoảng 8 màn edit | 16 |
| VP-C-03 | C. Logic nghiệp vụ | Soft delete + ràng buộc FK | 高 | Khoảng 6 master có liên kết | 18 |
| VP-C-04 | C. Logic nghiệp vụ | Tính thuế bao gồm/không bao gồm | 中 | Master đơn giá | 8 |
| VP-C-05 | C. Logic nghiệp vụ | Rule loại độc giả (read-only) | 高 | Master độc giả | 10 |
| VP-C-06 | C. Logic nghiệp vụ | Excel import partial success | 中 | 2 màn import | 30 |
| VP-C-07 | C. Logic nghiệp vụ | Bulk replace điểm bán | 高 | Bulk replace | 15 |
| VP-C-08 | C. Logic nghiệp vụ | Độ chính xác báo cáo tổng hợp | 高 | 3 báo cáo | 18 |
| VP-D-01 | D. Tích hợp & Hệ thống | Login + MFA flow | 高 | SCR-001 / 002 | 25 |
| VP-D-02 | D. Tích hợp & Hệ thống | Sliding session 24h | 高 | Toàn hệ thống | 8 |
| VP-D-03 | D. Tích hợp & Hệ thống | Flow reset password | 高 | SCR-007 | 15 |
| VP-D-04 | D. Tích hợp & Hệ thống | Tính toàn vẹn audit log | 高 | Toàn hệ thống | 40 |
| VP-D-05 | D. Tích hợp & Hệ thống | File upload S3 | 中 | SCR-022 | 20 |
| VP-D-06 | D. Tích hợp & Hệ thống | Mail thông báo | 中 | SCR-001 / 007 / お知らせ | 12 |
| VP-D-07 | D. Tích hợp & Hệ thống | Tuân thủ format CSV ngoài | 高 | SCR-008 / 009 | 15 |
| VP-D-08 | D. Tích hợp & Hệ thống | Network / 500 / Timeout | 中 | Toàn hệ thống | 30 |
| VP-E-01 | E. Phi chức năng | Layout / Design Token | 低 | Toàn màn hình | 60 |
| VP-E-02 | E. Phi chức năng | Responsive (mobile/tablet) | 低 | Toàn màn hình | 40 |
| VP-E-03 | E. Phi chức năng | Thao tác bàn phím | 低 | Khoảng 25 form | 25 |
| VP-E-04 | E. Phi chức năng | Browser compatibility | 低 | Toàn hệ thống | 5 |
| VP-E-05 | E. Phi chức năng | Đồng bộ session đa tab | 中 | Toàn hệ thống | 5 |
| VP-E-06 | E. Phi chức năng | Performance benchmark | 中 | Màn list / export | 12 |
| | | | | **Tổng** | **~1635** |

> **Ghi chú số liệu**: TC見積 ở trên là worst case. Sau khi review loại bỏ trùng lặp (giảm ~15-20%), thực tế dự kiến **1300-1400 TC**.

---

## 3. Chi tiết quan điểm

### Nhóm A — Bảo mật & Phân quyền

#### VP-A-01 — Kiểm soát quyền theo Role (RBAC gate)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Toàn bộ màn hình có `meta.permission` (~25/31 màn hình) |
| **TC見積** | ~265 (5 role × 25 màn × bình quân 2.1 TC/màn) |
| **Liên quan** | VP-A-02 (DataScope), VP-A-04 (URL attack), VP-D-04 (audit) |

**Mục đích test**:
Đảm bảo cơ chế kiểm tra quyền 3-tầng hoạt động nhất quán.

1. **FE Menu Filter** — `useMenu()` ẩn item không có permission khỏi sidebar + dashboard.
2. **FE Router Guard** — Nhập URL trực tiếp → toast `アクセス権がありません。` + redirect `/dashboard`.
3. **BE API Guard** — Gọi API trực tiếp (DevTools/curl) → trả 403 FORBIDDEN, ghi đầy đủ error log vào `t_log`.

**Phương pháp thiết kế test case**:
1. Tạo ma trận quyền từ `docs/database/seeder.md §3` — 43 permission × 5 role. Cell `○` = normal case, `×` = abnormal case.
2. Tạo 5 test account theo role tại staging.
3. Cho mỗi màn hình:
   - Normal case role được phép (xem màn + lấy data OK)
   - Abnormal case role không được phép (URL trực tiếp)
   - Abnormal case API trực tiếp qua DevTools — phát hiện bug "FE ẩn nhưng BE cho phép"

**Cạm bẫy điển hình**:
- Chỉ test FE filter là đủ — sai. Tấn công thật là gọi API trực tiếp, phải đào đến tầng API.
- Bỏ sót edge case: Role có quyền `view` nhưng không có `update` → button "Sửa" ẩn + URL `/edit` cũng bị chặn.
- Nhầm lẫn `アクセス権がありません` (text router guard) với `権限がありません` (text khách hàng từng paraphrase) — Spec yêu cầu **literal copy**.

**Xác nhận coverage**:
- Mọi `@Permissions('xxx.action')` trong controller (`grep -r '@Permissions' apps/backend/src/`) đều phải có ≥1 abnormal case tương ứng.
- `AppSidebar.spec.ts` đã cover tầng FE filter (12 test hiện có).

---

#### VP-A-02 — Phạm vi dữ liệu (DataScope)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Màn list + detail (~20 màn) |
| **TC見積** | ~200 (4 role có scope × 20 màn × 2.5 TC/màn) |
| **Liên quan** | VP-A-01, VP-A-03, VP-A-04 |

**Mục đích test**:
Đảm bảo mỗi role chỉ xem được dữ liệu trong phạm vi của mình, kiểm tra cả **list query và truy cập trực tiếp theo ID**.

| Role | Độc giả | Điểm bán | Đơn giá/CN | JA | Báo cáo | Log |
|---|---|---|---|---|---|---|
| NICHINO_ADMIN | — | — | — | Toàn JA | — | Toàn JA |
| NICHINO_STAFF | — | Toàn JA (đại diện) | — | — | — | Toàn JA |
| CHUOKAI | Của Chuokai mình | Của Chuokai mình | Của Chuokai mình | JA mình (một số trường) | Của Chuokai mình | Của Chuokai mình |
| JA_HONTEN | JA mình | JA mình | JA mình | JA mình (một số trường) | CN của JA mình | CN của JA mình |
| JA_KANRI_SHITEN | CN mình | JA mình | JA mình | — | CN mình | CN mình |

**Phương pháp thiết kế test case**:
1. Seed test data: tối thiểu 2 chuokai, mỗi chuokai 2 JA, mỗi JA 2 CN.
2. Cho mỗi role, list query → chỉ hiển thị dữ liệu trong scope.
3. GET trực tiếp với ID ngoài scope → expect 404 (không phải 403, để giấu sự tồn tại record — tham chiếu `data-scope.ts`).
4. PATCH/DELETE ngoài scope → cũng 404.

**Cạm bẫy điển hình**:
- Chỉ test list query (SQL filter). Cần test detail/update/delete bằng URL trực tiếp.
- Nhầm 403 và 404 — Quy ước dự án: ngoài scope = **404 để giấu**. BE trả 403 là bug (xem `assertJaScope` / `assertBranchScope`).
- Bỏ sót quan điểm "JA_HONTEN xem JA master với một số trường read-only" — Không phải ẩn màn, mà chỉ trường nhất định read-only (xem VP-A-03).

**Xác nhận coverage**:
- Mọi service method gọi `applyJaScope` / `applyBranchScope` / `assertJaScope` / `assertBranchScope` đều phải có ≥1 abnormal case tương ứng.

---

#### VP-A-03 — Hạn chế cấp trường (Field-level restriction)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | 5 master có field-level restriction (`ja`, `shiten`, `kanri_shiten`, `account`, `dokusya`) |
| **TC見積** | ~50 (5 master × 5 role × bình quân 2 TC/màn) |
| **Liên quan** | VP-A-02 |

**Mục đích test**:
Cùng màn edit, cùng record, nhưng theo role các trường được phép chỉnh sửa khác nhau. Trường không cho sửa = read-only (input disabled), và PATCH chứa trường đó BE phải reject.

**Phương pháp thiết kế test case**:
1. Tham chiếu bảng `FIELD_RESTRICTIONS` trong `.claude/rules/security.md §Layer 3`.
2. Cho mỗi cell `trường × role`:
   - Normal: Mở màn edit với role X, trường Y có thể edit, lưu thành công với giá trị mới.
   - Abnormal: Gọi PATCH API trực tiếp gồm trường Y mà role không có quyền → `filterAllowedFields` sẽ loại bỏ Y, BE chỉ update các trường được phép.

**Cạm bẫy điển hình**:
- Nhìn UI disabled là pass. Attacker bypass được UI, phải test trực tiếp PATCH API qua DevTools.
- Bỏ sót combination: Role có quyền sửa trường A, gửi PATCH với A + B (B không có quyền) → A update OK, B bị bỏ (không lỗi).

---

#### VP-A-04 — Tấn công truy cập URL trực tiếp

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Mọi URL có path parameter (`/ja/:id/edit`, `/dokusya/:id`...) |
| **TC見積** | ~75 (~25 URL × 3 case bình quân) |
| **Liên quan** | VP-A-01, VP-A-02 |

**Mục đích test**:
Khi user truy cập URL trực tiếp với ID ngoài scope/quyền, không bypass được FE guard. Bao gồm:

- ID không tồn tại → 404 (NotFound)
- ID tồn tại nhưng ngoài scope → 404 (giấu)
- ID trong scope nhưng thiếu quyền → toast + redirect

**Phương pháp thiết kế test case**:
1. Tạo danh sách URL pattern từ `apps/frontend/src/router/index.ts`.
2. Cho mỗi URL test 3 case:
   - ID = 99999 (không tồn tại)
   - ID record của JA khác
   - ID record JA của mình nhưng role không có quyền `update`

**Cạm bẫy điển hình**:
- Chỉ test navigate UI là chưa đủ. Phải nhập URL hoặc sửa ID ở address bar.
- Có bug chỉ phát hiện khi mở từ bookmark cũ — phải test cả F5 reload.

---

#### VP-A-05 — Session expire / Xử lý 401

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~30 |
| **Liên quan** | VP-D-02 (Sliding session) |

**Mục đích test**:
Khi Redis session expire (>24h hoặc bị revoke), BE trả 401 cho request kế tiếp. FE thực hiện:

1. Clear `useAuthStore().user`
2. Redirect `/login?redirect=current_url`
3. Trên màn login, **không hiện toast** `セッションが切れました…` (form login đã thể hiện trạng thái).

**Phương pháp thiết kế test case**:
1. Sau login, mở 1 tab và đợi >24h (hoặc dùng admin tool revoke session).
2. Click 1 button bất kỳ → redirect `/login` + URL có `?redirect=...`.
3. Login lại → trở về URL ban đầu.
4. Khi đang nhập form: form data có giữ lại không? (Hiện tại: không giữ, đã ghi rõ trong UX guide).

**Cạm bẫy điển hình**:
- Set TTL ngắn (60s) ở môi trường test, quên reset về 24h khi lên staging.
- Trên màn auth (login/mfa) interceptor không redirect — Hiển thị inline error. Phải test cả 2 path.

---

#### VP-A-06 — XSS / HTML / SQL Injection

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Mọi text input lưu DB và hiển thị lại (~20 form) |
| **TC見積** | ~80 (~20 form × bình quân 4 vector) |
| **Liên quan** | VP-B-04 |

**Mục đích test**:
Chuỗi đầu vào đặc biệt phải thỏa:
1. **Lưu an toàn** — BE dùng parameterized query, không thể SQL Inject.
2. **Hiển thị an toàn** — FE dùng `{{ }}` (Vue tự escape), cấm `v-html` với user data.
3. **Persistent XSS** — Sau khi lưu, load lại payload không thực thi.

Vector test:
- HTML tag: `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `<a href="javascript:alert(1)">click</a>`
- SQL Inject: `'; DROP TABLE m_ja; --`, `' OR '1'='1`
- Stored XSS: nhập payload → save → màn list reload payload không thực thi
- DOM XSS: payload trong query string → không được render thô

**Phương pháp thiết kế test case**:
1. Liệt kê text input (description, biko, name...) — toàn bộ trường không có format chặt.
2. Tạo ma trận `trường × 4 vector trên`.
3. Sau nhập + save, xem lại màn list/detail → payload hiển thị plain text (không thực thi).

**Cạm bẫy điển hình**:
- Vue auto escape cover 95%, nhưng `v-html` bypass được. Grep `v-html` trong codebase, mỗi chỗ phải có DOMPurify hoặc justification rõ ràng.
- Test team khách hàng thường chỉ test 1-2 payload đơn giản. Phải test cả encoded variant `&#60;script&#62;`, `<script>`.

---

#### VP-A-07 — CSRF / Cookie security flag

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~10 |

**Mục đích test**:
Session cookie có đầy đủ flag chuẩn:
- `HttpOnly` (JS không đọc được — chống XSS chiếm session)
- `Secure` (chỉ gửi qua HTTPS, HTTP không gửi)
- `SameSite=Strict` (chống CSRF)

Test:
1. DevTools → Application → Cookies → kiểm flag của session cookie.
2. Origin attack: Submit form từ HTML page domain khác đến API → bị `SameSite=Strict` chặn.

**Cạm bẫy điển hình**:
- `Secure` flag chỉ có hiệu lực HTTPS prod. Dev (HTTP localhost) không verify được — phải test ở staging.

---

### Nhóm B — Validation dữ liệu

#### VP-B-01 — Kiểm tra trường bắt buộc

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~25 form (CRUD master) |
| **TC見積** | ~100 (~5 trường bắt buộc/form × 25 form) |

**Mục đích test**:
Submit khi để trống trường bắt buộc → hiện `必須項目です。` ngay dưới trường (không phải toast).

**Phương pháp thiết kế test case**:
Cho mỗi trường bắt buộc:
1. Submit khi rỗng → message ở vị trí đúng
2. Chỉ space (`"   "`) → coi như rỗng (BE phải gắn `@Transform(blankToUndef)` trước `@IsOptional()`)
3. Nhập 1 ký tự bất kỳ → message biến mất

**Cạm bẫy điển hình**:
- BE quên `@Transform(blankToUndef)` → user nhập space được coi là valid (xem `.claude/rules/nestjs.md §DTO validation gotchas`).
- FE có check bắt buộc, BE không có → API success → DB có row với trường rỗng → bug nghiệp vụ phía sau.

---

#### VP-B-02 — Boundary độ dài tối thiểu/tối đa

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~25 form (có maxLength) |
| **TC見積** | ~80 |

**Mục đích test**:
Cho mỗi trường có `maxLength=N`:
- Nhập N ký tự → OK
- Ký tự N+1 bị chặn (input attribute maxLength)
- Paste chuỗi dài hơn N → cắt còn N
- Trường có minLength: nhập < min → hiện format error

**Cạm bẫy điển hình**:
- Nửa-rộng vs toàn-rộng: ký tự toàn-rộng có thể bị regex đếm thành 1 hoặc 2 ký tự. BE validation phải nhất quán.
- Khách thường chỉ test "1 / max / max+1". Quên case paste → bug ở chỗ này nhiều.

---

#### VP-B-03 — Regex format (mã bưu điện/SĐT/code)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~20 form (có format check) |
| **TC見積** | ~60 |

**Mục đích test**:
Trường có regex (mã bưu điện `\d{7}`, SĐT `\d{10,11}`, ngân hàng `\d{4}`, code `\w+`):
- Nhập đúng format → OK
- Nhập sai → message riêng (`金融機関コードは半角数字4桁で入力してください`)
- Format OK nhưng nghiệp vụ không hợp lệ (mã bưu `0000000`...) → format pass (rule nghiệp vụ là viewpoint khác)

**Cạm bẫy điển hình**:
- Áp dụng cả bắt buộc + format trên 1 trường → 2 validator → BE join 2 message theo thứ tự khác nhau → user thấy rối. Best practice: chỉ dùng `@Matches` cover cả length + digit trong 1 message.

---

#### VP-B-04 — Xử lý nửa-rộng / toàn-rộng

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~25 form |
| **TC見積** | ~50 |

**Mục đích test**:
- Trường số (thuế, đơn giá, mã bưu): chỉ chấp nhận số nửa-rộng
- Trường text (họ tên, địa chỉ, ghi chú): chấp nhận cả nửa và toàn-rộng
- Xử lý IME mode: khi nhập số, IME có gợi ý tự chuyển sang nửa-rộng (browser feature)

**Cạm bẫy điển hình**:
- BE `@Matches(/^\d+$/)` chỉ match số nửa-rộng. User nhập `１２３` toàn-rộng → reject — UX kém. Nên auto-convert ở FE trước khi submit.

---

#### VP-B-05 — Logic ngày

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~10 form (có cặp ngày) |
| **TC見積** | ~30 |

**Mục đích test**:
- Ngày bắt đầu áp dụng ≤ ngày kết thúc áp dụng
- Đã có hiệu lực (có audit record) → ngày quá khứ read-only
- Format ngày `YYYY-MM-DD`, picker UI
- Master mới: ngày bắt đầu chỉ chọn ngày tương lai
- Edge case: năm nhuận (2/29), giáp tháng (3/31 vs 4/1)

**Cạm bẫy điển hình**:
- Timezone: BE lưu TIMESTAMPTZ JST, FE render dayjs. Khi browser TZ khác Nhật, kiểm ngày không lệch.

---

#### VP-B-06 — Format tiền tệ / phần trăm

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | 2-3 form (đơn giá master) |
| **TC見積** | ~15 |

**Mục đích test**:
- Đơn giá hiển thị `¥1,234` (formatYen)
- Thuế hiển thị `10.50%` (formatTaxRate)
- Số âm bị reject
- Số chữ số sau dấu phẩy: đơn giá = số nguyên, thuế = max 2 chữ số

**Cạm bẫy điển hình**:
- Khách có thể kỳ vọng `¥1,234.50` cho subunit của yên, nhưng quy ước Nhật là `¥1,234` số nguyên. Confirm với khách.

---

#### VP-B-07 — Tham chiếu master code (m_code)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~15 form (dropdown m_code) |
| **TC見積** | ~45 |

**Mục đích test**:
- Dropdown lấy đúng category từ `useCodesStore.options('XXX')`
- Label tiếng Nhật hiển thị đúng (vd: TANKA_TYPE=1 → `購読料`)
- BE check value tồn tại trong category (`codeService.has('XXX', value)`)

**Cạm bẫy điển hình**:
- m_code seed từ migration. Chưa chạy seed → dropdown rỗng. Trước khi test FE phải confirm seed.
- DB test khách hàng có thể có m_code khác staging → dropdown nội dung khác → test case phải dùng giá trị đã seed cụ thể.

---

#### VP-B-08 — Trùng key (duplicate code)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~10 master |
| **TC見積** | ~30 |

**Mục đích test**:
- Tạo record với code đã tồn tại → message `同一の{resource}コードが既に登録されています。`
- Phân biệt hoa thường: `T001` vs `t001` — nên case-insensitive (DB index collation)
- Trùng giữa các JA: 2 JA khác nhau cùng code → cho phép (theo scope đơn vị)

**Cạm bẫy điển hình**:
- BE check trùng bằng SQL `SELECT WHERE code = X` → không lock row, 2 request đồng thời → race. Cần unique constraint cấp DB.

---

### Nhóm C — Logic nghiệp vụ

#### VP-C-01 — CRUD chính + Persist DB + Audit

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | ~10 master CRUD |
| **TC見積** | ~60 (3 thao tác × 10 master × 2 TC) |
| **Liên quan** | VP-D-04 |

**Mục đích test**:
Mỗi CREATE/UPDATE/DELETE phải thỏa:
1. Toast thành công (`登録しました。` / `更新しました。` / `削除しました。`)
2. Redirect màn list
3. Row DB đúng (CREATE → row mới, UPDATE → trường đúng, DELETE → set `deleted_at`)
4. `t_log` có row với `operation` đúng (`CREATE`/`UPDATE`/`DELETE`), `before_value` / `after_value` JSON đầy đủ
5. **Single transaction**: nếu audit log fail → rollback luôn business write

**Phương pháp thiết kế test case**:
1. Normal: nhập đầy đủ → submit → verify UI + DB + log
2. Force audit log fail (error injection): business write phải rollback
3. Refresh list → record mới/sửa hiển thị

**Cạm bẫy điển hình**:
- Chỉ check UI toast → log không ghi mà business commit → silent bug. Sau mỗi thao tác phải query `t_log`.
- Giá trị `operation` là bare verb `CREATE` / `UPDATE` / `DELETE`. Bug thường gặp: set `'TANKA_CREATE'` (sai). Xem `.claude/rules/nestjs.md`.

---

#### VP-C-02 — Conflict edit đồng thời

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | ~8 màn edit |
| **TC見積** | ~16 |

**Mục đích test**:
2 user (hoặc cùng user 2 tab) cùng edit 1 record:
1. User A submit trước → success
2. User B submit sau (data cũ) → expect conflict response (optimistic lock theo `updated_at`)

**Cạm bẫy điển hình**:
- Hệ thống có thể chưa implement optimistic lock. Khi đó: User B đè lên thay đổi của User A → mất data của A. Confirm BE design có optimistic lock hay không, nếu chưa → tạo bug ticket trước khi test.

---

#### VP-C-03 — Soft delete + ràng buộc FK

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | ~6 master (có FK) |
| **TC見積** | ~18 |

**Mục đích test**:
- Master không có liên kết → delete OK (set `deleted_at`, ẩn khỏi list)
- Master có FK đang dùng → message `関連データが存在するため削除できません。` (CONFLICT)
- Khôi phục (nếu có): record xuất hiện lại

**Cạm bẫy điển hình**:
- Confirm logic cascade delete cho từng master. JA bị soft delete → các CN/đơn giá/độc giả bên dưới còn dùng được không?
- Khách hàng thường kỳ vọng "delete = xóa hoàn toàn" — Cần giải thích soft delete là policy hệ thống (cho audit/recovery).

---

#### VP-C-04 — Tính thuế bao gồm/không bao gồm

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | Đơn giá master |
| **TC見積** | ~8 |

**Mục đích test**:
- Nhập đơn giá (gồm thuế) → đơn giá (chưa thuế) **không tự tính**
  (Spec hiện tại: 2 trường độc lập)
- Cùng record có cả gồm và chưa thuế, giá trị không sync → cho phép (trách nhiệm operator)

**Cạm bẫy điển hình**:
- Quy ước nghiệp vụ Nhật thường tự tính thuế bao gồm. Khách có thể kỳ vọng auto-calc. Confirm spec để tránh tranh cãi.

---

#### VP-C-05 — Rule loại độc giả (read-only)

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Master độc giả |
| **TC見積** | ~10 |

**Mục đích test**:
- Record độc giả thanh toán e-version qua thẻ tín dụng → các JA role (CHUOKAI / JA_HONTEN / JA_KANRI) chỉ xem được, không edit/delete
- Record độc giả combo cũng read-only
- BE phải check trường `dokusya.shubetsu`, reject PATCH/DELETE thuộc rule này

**Cạm bẫy điển hình**:
- FE disable button chưa đủ. Test API trực tiếp (DevTools) verify BE reject + trả message rõ ràng.

---

#### VP-C-06 — Excel import partial success

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | 2 màn import (độc giả, điểm bán) |
| **TC見積** | ~30 |

**Mục đích test**:
- Upload file 100 dòng có 5 lỗi (mix: format, trùng, thiếu bắt buộc)
- Expect: commit 95 dòng + report 5 lỗi (số dòng + lý do)
- Toàn dòng lỗi → 0 commit, report đầy đủ
- File rỗng → reject sớm
- File >10MB → reject (giới hạn dung lượng)

**Cạm bẫy điển hình**:
- Khách có xu hướng test file 10 dòng. Phải test file 10000 dòng để verify hiệu năng + memory.
- Encoding: UTF-8 BOM/no BOM, Shift-JIS — mỗi loại behavior khác, ghi rõ trong spec.

---

#### VP-C-07 — Bulk replace điểm bán

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Bulk replace điểm bán cho độc giả (SCR) |
| **TC見積** | ~15 |

**Mục đích test**:
- Bulk replace điểm bán độc giả → verify mọi record được update đúng
- Audit log có 1 row cho mỗi độc giả update (không phải 1 row tóm tắt)
- Nếu có spec dry-run mode (preview trước commit)
- Failure giữa chừng → rollback

**Cạm bẫy điển hình**:
- Hiệu năng: 10000 độc giả có thể HTTP timeout. Cần background job + progress reporting.

---

#### VP-C-08 — Độ chính xác báo cáo tổng hợp

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | 3 báo cáo (danh sách, biên bản tăng giảm, thông báo tăng giảm) |
| **TC見積** | ~18 |

**Mục đích test**:
- Tổng = sum chi tiết, không lệch
- Filter date range → record trong kỳ chính xác
- Phân trang/grouping không mất dòng
- PDF/CSV/Excel theo spec (thứ tự cột, header text)
- Edge: 0 record → file có header, không crash

**Cạm bẫy điển hình**:
- Off-by-one ở date range (inclusive vs exclusive end date).
- Floating point: tổng ¥1.05 + ¥1.05 + ¥1.05 ≠ ¥3.15 (precision). Dùng BigDecimal hoặc số nguyên.

---

### Nhóm D — Tích hợp & Hệ thống

#### VP-D-01 — Login + MFA flow

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | SCR-001 (login), SCR-002 (MFA verify) |
| **TC見積** | ~25 |

**Mục đích test**:
- Login đúng user+pass → trả `mfa_required: true` + gửi OTP email
- OTP đúng → set session cookie, redirect `/dashboard`
- Sai OTP 5 lần liên tiếp → khóa OTP token, phải login lại
- OTP quá 5 phút → reject + message `OTP_EXPIRED`
- Resend OTP: tối đa 3 lần/login session, cooldown 60s
- Brute force: 1 IP fail login 10 lần → tạm khóa account
- Login với account đang khóa → message rõ ràng
- Login trong window đang reset password → behavior thế nào?

**Cạm bẫy điển hình**:
- Mail delay: OTP có thể chậm 30s. Dev: mailhog, prod: SES test.
- Không log OTP plain text ở bất kỳ đâu.

---

#### VP-D-02 — Sliding session 24h

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~8 |

**Mục đích test**:
- Mỗi API request reset Redis TTL về 24h
- Idle 24h → session expire → request kế trả 401
- User active (request mỗi 23h) → không expire
- Multi-tab: 1 tab active thì các tab khác cũng được hưởng

**Cạm bẫy điển hình**:
- Test idle 24h thực tế khó. Môi trường test set TTL ngắn (60s), khi lên staging chuyển cẩn thận về 24h.

---

#### VP-D-03 — Flow reset password

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | SCR-007 |
| **TC見積** | ~15 |

**Mục đích test**:
- Submit email → luôn 200 (chống enumeration), nếu email tồn tại thì gửi mail có token
- Token hợp lệ → reset password được
- Token sai → reject (`INVALID_TOKEN`)
- Token expire (>1 tiếng) → reject
- Token đã dùng → reject (single-use)
- Reset thành công → invalidate toàn bộ session của account (Redis SREM)

**Cạm bẫy điển hình**:
- "Luôn 200" để chống enumeration, nhưng nếu email không tồn tại thì không gửi mail. Phải verify behavior này.

---

#### VP-D-04 — Tính toàn vẹn audit log

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~40 |

**Mục đích test**:
- Mỗi CREATE/UPDATE/DELETE có row trong `t_log`:
  - `account_id`, `ja_id` đúng
  - `gamen_name` đúng (vd: `単価マスタ登録画面`)
  - `operation` = bare verb
  - `result_status` = 1 (success) hoặc 2 (fail)
  - `before_value` / `after_value` JSON đầy đủ (UPDATE/DELETE có before, ngoài DELETE có after)
  - `target_id`, `target_table` đúng
- Mỗi attempt login → row trong `t_login_log`
- Lỗi (INTERNAL_ERROR / VALIDATION_ERROR) → ghi log với `result_status=2`
- Password / token / OTP **không bao gồm** trong log

**Phương pháp thiết kế test case**:
1. Liệt kê các action sinh log: trích từ chỗ gọi `AuditLogService.logXxx()`.
2. Mỗi action × 2 case (success + fail) → query `t_log` verify row.
3. Edge: business write success, audit log fail → rollback expected.

**Cạm bẫy điển hình**:
- Hay nghĩ "log không ảnh hưởng UX" → bỏ test. Nhưng audit log là yêu cầu pháp lý của Nông Nghiệp Tin Báo — bug này có thể fail UAT.

---

#### VP-D-05 — File upload S3

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | SCR-022 (file upload) |
| **TC見積** | ~20 |

**Mục đích test**:
- Upload PDF/Excel/CSV ≤10MB → S3 (folder theo JA)
- File >10MB → reject ngay từ client (input attr) + server
- MIME không hợp lệ (`.exe`...) → reject
- Trùng tên file → rename hoặc reject (theo spec)
- Download: signed URL hiệu lực 1h, hết 1h expire
- Cross-JA access: user JA-A request file JA-B → 403

**Cạm bẫy điển hình**:
- MIME spoofing: rename `.exe` thành `.pdf` → MIME header vẫn exe. BE phải kiểm magic number, ext không đủ.

---

#### VP-D-06 — Mail thông báo

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | OTP, reset password, gửi お知らせ |
| **TC見積** | ~12 |

**Mục đích test**:
- Mail đến đúng địa chỉ
- Subject + Body theo template
- HTML render đúng
- Log mailer không chứa data nhạy cảm
- Bounce/error handling: mail không tồn tại → graceful fail, không crash main flow

**Cạm bẫy điển hình**:
- Mail prod (SES) có rate limit. Load test có thể bị throttle.

---

#### VP-D-07 — Tuân thủ format CSV ngoài

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Cao |
| **Phạm vi** | SCR-008 (chuyển khoản), SCR-009 (OA liên kết) |
| **TC見積** | ~15 |

**Mục đích test**:
- CSV format theo chuẩn Zengin — record Header/Data/Trailer
- Encoding (theo spec: Shift-JIS hoặc UTF-8)
- Độ rộng trường (fixed-width banking format)
- Checksum / control number chính xác
- Edge: data rỗng, max records

**Cạm bẫy điển hình**:
- Format banking rất nghiêm ngặt. Lệch 1 byte → bank reject toàn file. Nếu được, test bằng bank validation tool chính thức.

---

#### VP-D-08 — Network / 500 / Timeout

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~30 |

**Mục đích test**:
- Mất mạng giữa request → toast `ネットワークエラーが発生しました…`
- BE crash → 500 → toast `システムエラーが発生しました…`
- DB chậm (timeout 30s) → toast hoặc retry mechanism
- Form data không bị mất khi network error (UX retry)

**Phương pháp thiết kế test case**:
- DevTools → Network → "Offline" mode
- Chrome network throttle → "Slow 3G"
- Gọi endpoint chưa implement để trigger BE crash

---

### Nhóm E — Phi chức năng

#### VP-E-01 — Layout / Design Token

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Thấp |
| **Phạm vi** | Toàn màn hình |
| **TC見積** | ~60 |

**Mục đích test**:
- margin, padding, font-size theo `design-tokens.ts`
- Màu dùng semantic class (`text-text-main`, `bg-surface-card`), không hardcode `text-slate-700`...
- Toggle dark mode: text/bg flip đúng
- Hover/focus state hiển thị

**Cạm bẫy điển hình**:
- Content `v-html` không inherit theme token → vỡ ở dark mode.
- Designer khách hàng hay nitpick từng pixel — chuẩn bị cho rất nhiều ticket nhỏ.

---

#### VP-E-02 — Responsive

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Thấp |
| **Phạm vi** | Toàn màn hình |
| **TC見積** | ~40 |

**Mục đích test**:
- Sidebar collapse khi <768px (md breakpoint)
- Mobile: table scroll ngang
- Mobile: form field stack dọc
- Mobile: modal full width

**Cạm bẫy điển hình**:
- iOS Safari có viewport bug khi keyboard hiện. Phải test thực máy, không chỉ DevTools.

---

#### VP-E-03 — Thao tác bàn phím

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Thấp |
| **Phạm vi** | ~25 form |
| **TC見積** | ~25 |

**Mục đích test**:
- Tab order tự nhiên (top-down, left-right)
- Enter submit form
- Escape đóng modal
- Space/Enter activate button
- Focus visible (outline)

---

#### VP-E-04 — Browser compatibility

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Thấp |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~5 |

**Mục đích test**:
- Chrome stable (2 phiên bản mới nhất)
- Edge (mới nhất)
- Firefox (mới nhất) — optional theo spec

**Cạm bẫy điển hình**:
- Safari: UI `<input type="date">` khác Chrome, có thể vỡ test case ngày.

---

#### VP-E-05 — Đồng bộ session đa tab

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | Toàn hệ thống |
| **TC見積** | ~5 |

**Mục đích test**:
- Tab1 login → Tab2 cùng domain auto detect (khi refresh)
- Tab1 logout → Tab2 redirect `/login` khi click
- Session expire → toàn tab redirect

---

#### VP-E-06 — Performance benchmark

| Mục | Giá trị |
|---|---|
| **Mức rủi ro** | Trung bình |
| **Phạm vi** | Màn list + export |
| **TC見積** | ~12 |

**Mục đích test**:
- Load 1000 dòng list < 2s
- Export PDF 1000 dòng < 5s
- Excel import 10000 dòng < 30s
- Search debounce hoạt động (không spam BE)

**Cạm bẫy điển hình**:
- Dev DB ít data → chạy nhanh. Phải test ở staging có sample data lớn.

---

## 4. Tổng kết + Ước lượng test case

### Tổng số TC ước lượng

```
Nhóm A (Bảo mật & Phân quyền)        710 TC
Nhóm B (Validation dữ liệu)          510 TC
Nhóm C (Logic nghiệp vụ)             175 TC
Nhóm D (Tích hợp & Hệ thống)         165 TC
Nhóm E (Phi chức năng)               147 TC
──────────────────────────────────────────
                              Tổng ~1700 TC (worst case)
```

Sau khi review loại trùng lặp (giảm 15-20%) → thực tế ước **1300-1400 TC**.

So với cách cũ (mỗi màn độc lập, ~80 TC/màn × 31 màn ≈ **2480 TC**) → **giảm trùng lặp ~45%**.

### Thứ tự thực thi

| Phase | Quan điểm | TC | Thời gian dự kiến |
|---|---|---|---|
| Phase 1 (Pre-release test) | Nhóm A + C cao | ~750 | 4 tuần |
| Phase 2 (Regression + UAT) | Nhóm B + C trung bình | ~400 | 2 tuần |
| Phase 3 (Post go-live) | Nhóm D + E | ~250 | 1 tuần |

Tổng QA effort: **2 tester full-time × ~7 tuần** (giả sử 1 tester 30 TC/ngày, gồm setup + report).

---

## 5. Quan hệ với Feature Sheet

Mỗi test case trong feature sheet phải có cột `観点ID` tham chiếu viewpoint trong tài liệu này. Reviewer scan cột này để verify coverage:

- Mỗi viewpoint áp dụng cho màn hình → ≥1 TC trong feature sheet map đến
- Viewpoint không có TC nào map → coverage gap, cần bổ sung

Ví dụ mapping cho ACSMS-SCR-003 (màn đăng ký đơn giá master):

| TC ID | 観点ID | Mô tả |
|---|---|---|
| TC-003-001 | VP-A-01 | Permission gate cho NICHINO_ADMIN |
| TC-003-002 | VP-A-01 + VP-A-02 | CHUOKAI login OK + DataScope |
| TC-003-021 | VP-B-01 | Required check mã đơn giá |
| TC-003-038 | VP-A-06 | SQL Injection vào tên đơn giá |
| TC-003-080 | VP-C-01 | Create normal case |
| TC-003-099 | VP-C-02 | Edit đồng thời 2 user |
| TC-003-103 | VP-A-05 | Network error handling |

---

## 6. Open Items (đợi khách hàng confirm)

1. Mức rủi ro 高/中/低 cần khách hàng phê duyệt, hay đội QA tự quyết?
2. TC見積 dùng cho hợp đồng/billing hay chỉ kế hoạch nội bộ?
3. Phase 3 (regression sau go-live) thuộc scope hợp đồng hiện tại hay tính riêng?
4. Browser compatibility (VP-E-04): chỉ định version Chrome cụ thể, có support Edge / Firefox?
5. Performance benchmark (VP-E-06): có SLA cụ thể không (vd: 99% request < 2s)?

Sau khi confirm các điểm trên, đội QA chốt scope test và tiến hành thiết kế chi tiết theo từng màn hình.
