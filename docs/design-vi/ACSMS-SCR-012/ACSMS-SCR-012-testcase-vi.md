---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-012
screen_name: パスワードの再設定・パスワードの変更
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-08
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-08 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

Hệ thống này là hệ thống quản lý độc giả phiên bản cloud dành cho JA, cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đặt báo, quản lý dữ liệu chuyển khoản tự động, v.v.
Các chức năng chính bao gồm: đăng ký / cập nhật / tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt báo, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên / tải xuống file, quản lý thông báo hệ thống.
Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật / kiểm toán như quản lý đăng nhập của user,
ghi lịch sử đăng nhập, ghi log thao tác của user.

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống tại màn hình "パスワードの再設定・パスワードの変更（ACSMS-SCR-012）".
Tài liệu tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau:

- Mỗi testcase được tạo dựa trên một scenario duy nhất (single responsibility).
- Mô tả các bước với mức độ chi tiết có thể tái hiện, làm rõ test data sử dụng.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).
- Thiết lập độ ưu tiên (P0: chặn release / P1: cao / P2: trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-012 | Tài liệu thiết kế màn hình đặt lại mật khẩu / thay đổi mật khẩu |
| 2 | ACSMS-SCR-012-api | Tài liệu thiết kế API màn hình đặt lại mật khẩu / thay đổi mật khẩu |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Footer | 4 |
| 4 | Kiểm tra đầu vào — Màn hình đặt lại / thay đổi | 12 |
| 5 | Logic nghiệp vụ — Yêu cầu đặt lại mật khẩu (Function — Forgot) | 6 |
| 6 | Logic nghiệp vụ — Cập nhật mật khẩu (Function — Reset) | 8 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | 合計 | 48 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-012-001 — NICHINO_ADMIN — Sử dụng được toàn bộ flow đặt lại mật khẩu

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Test account role: NICHINO_ADMIN
  - ・Đã set email hợp lệ
  - ・Màn hình này không cần auth (cho user trước login sử dụng)

### 手順

ステップ1：
Trên browser truy cập `/forgot-password`, nhập email → gửi

ステップ2：
Click link đặt lại từ mail nhận được, chuyển sang `/reset-password?token=xxx`

ステップ3：
Nhập password mới và confirm password → click nút「パスワードを更新する」

ステップ4：
Sau 3 giây, đăng nhập lại với password mới ở màn hình `/login`

### 期待結果

ステップ1：
HTTP status code: 200
Response: `message`「パスワード再設定用のメールを送信しました。メールを確認してください。」
Form ẩn, hiển thị message thành công

ステップ2：
Token verify thành công, form thay đổi password hiển thị

ステップ3：
HTTP status code: 200
Toast「パスワードを更新しました。ログイン画面に移動します。」hiển thị
Sau 3 giây tự động chuyển sang màn hình đăng nhập

ステップ4：
Đăng nhập thành công với password mới

補足：
・`m_account.password_hash` được cập nhật, `password_updated_at` là thời điểm hiện tại
・`t_mfa_otp.used_flg = true` (token được vô hiệu)
・`t_log` ghi log với operation='PASSWORD_RESET', result_status=1
・Implementation: sau khi cập nhật password thành công, xóa toàn bộ session Redis (`destroyAllForAccount`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-002 — NICHINO_STAFF — Sử dụng được toàn bộ flow đặt lại mật khẩu

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Test account role: NICHINO_STAFF
  - ・Đã set email hợp lệ

### 手順

ステップ1：
Thực thi `/forgot-password` với email của NICHINO_STAFF

ステップ2：
Từ link đặt lại chuyển sang `/reset-password`, nhập password mới → cập nhật

ステップ3：
Đăng nhập lại với password mới ở `/login`

### 期待結果

ステップ1：
HTTP status code: 200, gửi mail thành công

ステップ2：
HTTP status code: 200, cập nhật password thành công

ステップ3：
Đăng nhập thành công, `data.user.role_code = 'NICHINO_STAFF'`

補足：
・Màn hình này là public flow, hoạt động cho mọi role
・Hành vi sau khi cập nhật password không phụ thuộc role

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-003 — CHUOKAI — Vô hiệu toàn bộ session sau khi cập nhật password

- 観点ID: VP-A-05
- 種類: Normal (正常)
- 前提条件:
  - ・Test account role: CHUOKAI
  - ・Đã đăng nhập trên nhiều browser (Browser A, Browser B)
  - ・Có session hợp lệ trong cookie của cả hai

### 手順

ステップ1：
Trên Browser C khác, thực hiện `/forgot-password` → link đặt lại → cập nhật password

ステップ2：
Trên Browser A và Browser B, gửi request API (ví dụ: GET `/api/v1/dokusya`)

ステップ3：
Kiểm tra session Redis:
```
KEYS session:*
SMEMBERS account_sessions:{account_id}
```

### 期待結果

ステップ1：
Cập nhật password thành công

ステップ2：
Cả hai đều HTTP status code: 401
error_code: UNAUTHORIZED
message:「セッションが切れました。再度ログインしてください。」
Phía FE tự động chuyển về `/login`

ステップ3：
Tất cả session liên kết với account_id đó đều bị xóa
`account_sessions:{account_id}` Set cũng bị xóa

補足：
・Implementation: gọi `destroyAllForAccount(accountId)` trong `AuthService.resetPassword`
・Thực thi ngoài transaction (để lỗi Redis không rollback việc cập nhật password)
・Thiết kế chống attacker tiếp tục sử dụng cookie bị đánh cắp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical về security — Chức năng cốt lõi chống đánh cắp cookie.

## ACSMS-TC-012-004 — JA_HONTEN — Sử dụng được toàn bộ flow đặt lại mật khẩu

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Test account role: JA_HONTEN
  - ・Đã set email hợp lệ

### 手順

ステップ1：
Thực thi `/forgot-password` với email của JA_HONTEN

ステップ2：
Từ link đặt lại chuyển sang `/reset-password`, nhập password mới → cập nhật

ステップ3：
Đăng nhập lại với password mới

### 期待結果

ステップ1：
HTTP status code: 200, gửi mail thành công

ステップ2：
HTTP status code: 200, cập nhật password thành công

ステップ3：
Đăng nhập thành công, `data.user.role_code = 'JA_HONTEN'`, `data.user.ja_id` đã set

補足：
・Màn hình này là public flow, hỗ trợ tất cả role

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-005 — JA_KANRI_SHITEN — Sử dụng được toàn bộ flow đặt lại mật khẩu

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Test account role: JA_KANRI_SHITEN
  - ・Đã set email hợp lệ

### 手順

ステップ1：
Thực thi `/forgot-password` với email của JA_KANRI_SHITEN

ステップ2：
Từ link đặt lại chuyển sang `/reset-password`, nhập password mới → cập nhật

ステップ3：
Đăng nhập lại với password mới

### 期待結果

ステップ1：
HTTP status code: 200, gửi mail thành công

ステップ2：
HTTP status code: 200, cập nhật password thành công

ステップ3：
Đăng nhập thành công, `data.user.role_code = 'JA_KANRI_SHITEN'`, `data.user.ja_id`・`kanri_shiten_id` đã set

補足：
・Màn hình này là public flow, hỗ trợ tất cả role
・Trạng thái khóa account (account_lock_flg=true) không được unlock bằng đặt lại password

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-012-006 — Layout tổng thể màn hình đặt lại mật khẩu khớp với design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Mở `/forgot-password`

ステップ2：
So sánh màn hình với design spec (screen-design.md / forgot-password.html) song song

ステップ3：
Kiểm tra bố cục: tiêu đề「日本農業新聞」/ phụ đề, heading「パスワードの再設定」, text mô tả, ô nhập email, nút gửi, link quay lại

### 期待結果

ステップ1：
Màn hình đặt lại mật khẩu hiển thị căn giữa

ステップ2：
Màu nền, font, padding/margin, màu button, style ô input đều khớp

ステップ3：
Card width max-w-[480px], hiển thị text mô tả「登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをメールで送信します。」

補足：
・design tokens (`design-tokens.ts`) được áp dụng (không có hardcoded color)
・Component AuthLayout được sử dụng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-007 — Layout tổng thể màn hình thay đổi mật khẩu + loading verify token

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang giữ reset_token hợp lệ

### 手順

ステップ1：
Mở `/reset-password?token=valid_token`

ステップ2：
Kiểm tra hiển thị ban đầu của màn hình (đang verify token)

ステップ3：
Kiểm tra hiển thị sau khi verify thành công

ステップ4：
Mở `/reset-password?token=invalid` với token không hợp lệ

### 期待結果

ステップ1：
Màn hình thay đổi password hiển thị

ステップ2：
Loading spinner (`<a-spin>`) và text「トークンを検証中...」hiển thị
Form ẩn

ステップ3：
Heading「パスワードの変更」, ô password mới, ô confirm password, nút「パスワードを更新する」, link「ログイン画面に戻る」hiển thị

ステップ4：
Hiển thị error message「無効なリンクです。」với màu text-error
Form ẩn, chỉ hiển thị link quay lại

補足：
・FE gọi POST `/api/v1/auth/reset-password/verify` ở onMounted
・State phase: 'verifying' → 'valid' / 'invalid' / 'expired' / 'done'

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-008 — Hoạt động responsive — breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đặt lại hoặc thay đổi mật khẩu

### 手順

ステップ1：
Đặt window size 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Form căn giữa, card width 480px

ステップ2：
Layout được giữ nguyên

ステップ3：
Card width fit theo bề ngang màn hình, không có scroll ngang

補足：
・Không bị vỡ layout ở cả 3 breakpoint, không phát sinh scroll ngang
・Tất cả phần tử form đều có thể thao tác được

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-009 — Hiển thị phần tử form — ô input / button / link đúng design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đặt lại / thay đổi

### 手順

ステップ1：
Kiểm tra placeholder, autocomplete, maxlength của ô email ở màn hình đặt lại

ステップ2：
Kiểm tra placeholder, autocomplete, maxlength, hiển thị mask của ô password mới / confirm password ở màn hình thay đổi

ステップ3：
Kiểm tra label, size, color của nút「パスワード再設定メールを送信」và「パスワードを更新する」

ステップ4：
Kiểm tra hiển thị link「ログイン画面に戻る」

### 期待結果

ステップ1：
Placeholder「example@example.com」, autocomplete=email, maxlength=100

ステップ2：
Placeholder「******」, autocomplete=new-password, maxlength=32
Hiển thị mask ●●●● khi nhập

ステップ3：
Cả hai đều màu chính (xanh), size=large, hiển thị block
Chuỗi label đúng spec literal

ステップ4：
Icon mũi tên (arrow_back) +「ログイン画面に戻る」, màu chính

補足：
・Tất cả phần tử form khớp hoàn toàn với design spec
・Mục bắt buộc có dấu * đỏ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-010 — Thứ tự Tab và thao tác bàn phím (Tab / Enter)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đặt lại / thay đổi

### 手順

ステップ1：
Trên màn hình đặt lại, nhấn liên tục phím Tab, kiểm tra tiến trình focus

ステップ2：
Sau khi nhập email, nhấn phím Enter

ステップ3：
Trên màn hình thay đổi, nhấn liên tục phím Tab, kiểm tra tiến trình focus

### 期待結果

ステップ1：
Thứ tự Tab: Email → Nút gửi → ログイン画面に戻る

ステップ2：
Form được submit (@finish="onSubmit")

ステップ3：
Thứ tự Tab: Password mới → Confirm password → Nút cập nhật → ログイン画面に戻る

補足：
・Thứ tự Tab theo đúng design spec, có thể thao tác toàn bộ bằng bàn phím
・Ô password có autocomplete=new-password để liên kết password manager của browser

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-011 — Độ tin cậy thao tác button (double-click / nhấn liên tục)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã nhập giá trị hợp lệ trên màn hình đặt lại hoặc thay đổi

### 手順

ステップ1：
Double-click nút gửi (hoặc nút cập nhật) trong vòng 200ms

ステップ2：
Nhấn liên tục button trong 5 giây

ステップ3：
Kiểm tra số lượng record phát hành `t_mfa_otp` trên DB

### 期待結果

ステップ1：
Lần 1 bắt đầu gửi, lần 2 button bị vô hiệu nên bỏ qua

ステップ2：
Trong khi đang xử lý, button bị vô hiệu, không có request trùng

ステップ3：
Chỉ 1 row (không trùng)

補足：
・Implementation: phòng gửi trùng bằng flag submitting của useApiForm
・Trong khi đang xử lý, button hiển thị ở trạng thái loading

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 3: Header & Footer

## ACSMS-TC-012-012 — Hiển thị tiêu đề + heading

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đặt lại hoặc thay đổi

### 手順

ステップ1：
Kiểm tra phần header

ステップ2：
Kiểm tra heading từng màn hình

### 期待結果

ステップ1：
Cả hai màn hình đều có「日本農業新聞」(h1, font đậm, text-2xl) +「クラウド版購読者管理システム」(text-sm, text-text-secondary)

ステップ2：
Màn hình đặt lại:「パスワードの再設定」(h2, căn giữa)
Màn hình thay đổi:「パスワードの変更」(h2, căn giữa)

補足：
・Chuỗi tiêu đề đúng theo spec literal

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-013 — Hiển thị text mô tả

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đặt lại

### 手順

ステップ1：
Kiểm tra text mô tả bên dưới heading

### 期待結果

ステップ1：
「登録済みのメールアドレスを入力してください。」「パスワード再設定用のリンクをメールで送信します。」(2 dòng, text-text-description, căn giữa) hiển thị

補足：
・Text mô tả đúng theo spec literal

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-014 — Link quay lại màn hình đăng nhập

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang nhập dở trên màn hình đặt lại hoặc thay đổi

### 手順

ステップ1：
Trên màn hình đặt lại, click link「ログイン画面に戻る」

ステップ2：
Sau khi chuyển sang màn hình đăng nhập, dùng nút back của browser quay lại màn hình đặt lại

ステップ3：
Trên màn hình thay đổi, click link「ログイン画面に戻る」

### 期待結果

ステップ1：
Chuyển sang `/login`, email đã nhập bị clear

ステップ2：
Ô input rỗng (đã initialize bằng `form.email = ''`)

ステップ3：
Chuyển sang `/login`, cả 2 ô password đã nhập bị clear

補足：
・Implementation: `form.email = ''` / `form.new_password = '' / form.confirm_password = ''` trong hàm goLogin
・Tuân thủ spec §4.2 / §5.2「入力したデータがクリアされる」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-015 — Hiển thị message thành công (đặt lại / thay đổi)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Gửi mail thành công ở màn hình đặt lại
  - ・Cập nhật password thành công ở màn hình thay đổi

### 手順

ステップ1：
Kiểm tra màn hình khi gửi mail thành công ở màn hình đặt lại

ステップ2：
Kiểm tra màn hình khi cập nhật thành công ở màn hình thay đổi

### 期待結果

ステップ1：
Form ẩn, message thành công「パスワード再設定用のメールを送信しました。メールを確認してください。」hiển thị
Chỉ link「ログイン画面に戻る」hiển thị

ステップ2：
Form ẩn, message thành công「パスワードを更新しました。ログイン画面に移動します。」hiển thị
Sub-text「3秒後にログイン画面へ移動します...」hiển thị

補足：
・FE state phase: 'sent' (đặt lại) / 'done' (thay đổi)
・Tuân thủ spec §3.4 / §4.5

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 4: Kiểm tra đầu vào — Màn hình đặt lại / thay đổi

## ACSMS-TC-012-016 — Email — Kiểm tra bắt buộc (rỗng + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại

### 手順

ステップ1：
Để trống email, nhấn nút gửi

ステップ2：
Nhập 3 ký tự space half-width → nhấn nút gửi

### 期待結果

ステップ1：
Hiển thị「メールアドレスを入力してください。」ngay dưới mục
Phía FE chặn gửi (không gọi API)

ステップ2：
Phía FE `validateClient` loại bỏ space đầu cuối qua `trim()`, được nhận diện là rỗng
Hiển thị「メールアドレスを入力してください。」

補足：
・Rỗng / chỉ ký tự khoảng trắng đều bị xử lý là vi phạm bắt buộc
・Tương ứng ACSMS-SCR-012-001
・Implementation: check an toàn bằng `form.email?.trim()`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-017 — Email — Kiểm tra format

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại

### 手順

ステップ1：
Nhập `user@example.com` → gửi

ステップ2：
Nhập `invalid-email` (không có @) → gửi

ステップ3：
Nhập `abc@` (không có domain) → gửi

ステップ4：
Nhập `@example.com` (không có local part) → gửi

### 期待結果

ステップ1：
Tiếp nhận bình thường, qua kiểm tra format phía FE, gửi API

ステップ2：
Phía FE hiển thị「有効なメールアドレスを入力してください。」
Không gọi API

ステップ3：
Phía FE hiển thị「有効なメールアドレスを入力してください。」

ステップ4：
Phía FE hiển thị「有効なメールアドレスを入力してください。」

補足：
・Implementation: kiểm tra format bằng regex FE `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
・Verify lại bằng @IsEmail ở BE (chống DevTools trực tiếp)
・Tương ứng ACSMS-SCR-012-002
・Không sử dụng HTML5 `type="email"` (vue.md §「NEVER use HTML5 native input types for validation」)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-018 — Email — Giới hạn tối đa 100 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn hình đặt lại

### 手順

ステップ1：
Nhập email hợp lệ trong 100 ký tự → gửi

ステップ2：
Thử nhập ký tự thứ 101

ステップ3：
Trên DevTools, gửi request axios trực tiếp với email 102 ký tự

### 期待結果

ステップ1：
Tiếp nhận bình thường, gửi API

ステップ2：
input maxlength chặn ký tự thứ 101

ステップ3：
Phía BE @MaxLength(100) từ chối
HTTP status code: 400
errors[] chứa { field: "email", message: "メールアドレスは100文字以内で入力してください。" }

補足：
・Giới hạn 100 ký tự được enforce kép bằng input maxlength và validation BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-019 — Email — Xử lý an toàn XSS / SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại

### 手順

ステップ1：
Nhập HTML tag `<script>alert(1)</script>` vào email → gửi

ステップ2：
Nhập SQL injection `admin'; DROP TABLE m_account; --@example.com` → gửi

ステップ3：
Kiểm tra bảng `m_account` không bị xóa trên DB

### 期待結果

ステップ1：
Phía FE từ chối qua kiểm tra format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` không khớp)

ステップ2：
Phía FE hoặc BE từ chối format
Bảng `m_account` không bị xóa

ステップ3：
Bảng `m_account` tồn tại bình thường

補足：
・SQL injection không phát huy (parameterized query của TypeORM)
・XSS không phát huy (Vue auto-escape)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical về security — Nếu fail thì xử lý như incident.

## ACSMS-TC-012-020 — Password mới — Kiểm tra bắt buộc (rỗng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi, đã verify token thành công

### 手順

ステップ1：
Để trống password mới, nhấn nút cập nhật

ステップ2：
Chỉ nhập 1 ký tự space half-width → cập nhật

### 期待結果

ステップ1：
Hiển thị「新しいパスワードを入力してください。」ngay dưới mục
Phía FE chặn gửi

ステップ2：
Phía FE `validateClient` nhận diện rỗng qua `trim()`
Hiển thị「新しいパスワードを入力してください。」

補足：
・Rỗng / chỉ ký tự khoảng trắng đều bị xử lý là vi phạm bắt buộc
・Tương ứng ACSMS-SCR-012-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-021 — Password mới — Giới hạn 8〜32 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn hình thay đổi

### 手順

ステップ1：
Nhập 8 ký tự (ví dụ: `Admin@01`) → cập nhật

ステップ2：
Nhập 7 ký tự (ví dụ: `Admin@1`) → cập nhật

ステップ3：
Nhập 32 ký tự → cập nhật

ステップ4：
Thử nhập ký tự thứ 33

### 期待結果

ステップ1：
Tiếp nhận bình thường (giá trị nhỏ nhất), nếu cũng qua format check thì cập nhật thành công

ステップ2：
HTTP status code: 400
errors[] chứa { field: "new_password", message: "パスワードは8文字以上で入力してください。" }
(Phía FE cũng từ chối tương tự bằng `PASSWORD_FORMAT_RE`)

ステップ3：
Tiếp nhận bình thường (giá trị lớn nhất)

ステップ4：
input maxlength chặn ký tự thứ 33

補足：
・Giới hạn 8〜32 ký tự, enforce bằng @MinLength(8) và @MaxLength(32)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-022 — Password mới — Chỉ tiếp nhận half-width

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi

### 手順

ステップ1：
Nhập chữ-số-ký hiệu half-width `Admin@1234` → cập nhật

ステップ2：
Nhập chữ-số full-width `Ａｄｍｉｎ＠１２３４` → cập nhật

ステップ3：
Nhập ký tự tiếng Nhật `パスワード１２３` → cập nhật

### 期待結果

ステップ1：
Tiếp nhận bình thường, nếu qua format check thì cập nhật thành công

ステップ2：
Phía FE từ chối bằng `HALFWIDTH_RE`
Hiển thị「パスワードは半角文字のみで入力してください。」

ステップ3：
Phía FE từ chối bằng `HALFWIDTH_RE`
Hiển thị「パスワードは半角文字のみで入力してください。」

補足：
・Regex FE `/^[\x21-\x7E]+$/` chỉ cho phép half-width
・BE @Matches(HALFWIDTH_RE) verify lại
・FE thực hiện check half-width TRƯỚC check loại ký tự (UX: specific message > combined message)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-023 — Password mới — Kiểm tra có ≥ 2 loại ký tự

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi

### 手順

ステップ1：
Nhập chữ + số `Admin1234` → cập nhật

ステップ2：
Nhập chữ + ký hiệu `Admin!@#$` → cập nhật

ステップ3：
Nhập số + ký hiệu `1234!@#$` → cập nhật

ステップ4：
Nhập chỉ chữ `AdminAdmin` → cập nhật

ステップ5：
Nhập chỉ số `12345678` → cập nhật

ステップ6：
Nhập chỉ ký hiệu `!@#$%^&*` → cập nhật

### 期待結果

ステップ1：
Tiếp nhận bình thường (2 loại)

ステップ2：
Tiếp nhận bình thường (2 loại)

ステップ3：
Tiếp nhận bình thường (2 loại)

ステップ4：
HTTP status code: 400
errors[] chứa { field: "new_password", message: "パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。" }

ステップ5：
HTTP status code: 400
Cùng message như trên

ステップ6：
HTTP status code: 400
Cùng message như trên

補足：
・Implementation: regex FE `PASSWORD_FORMAT_RE` kiểm tra có ≥ 2 loại
・BE `AuthService.hasAtLeastTwoCategories` verify lại (bộ ký hiệu: `!@#$%^&*()_+-=[]{}|;:,.<>?`)
・Tương ứng ACSMS-SCR-012-006

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-024 — Password mới — Không được trùng login ID

- 観点ID: VP-A-09
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi, login_id của account đối tượng = `admin01`

### 手順

ステップ1：
Nhập `admin01` (trùng hoàn toàn với login_id) vào password mới → cập nhật
(Lưu ý: thỏa mãn 8 ký tự + 2 loại nhưng trùng login_id)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Phía BE từ chối (kiểm tra trùng login ID)

ステップ2：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "new_password", message: "新しいパスワードはログインIDと同じものに設定できません。" }

補足：
・Implementation: trong `AuthService.resetPassword` kiểm tra `dto.new_password === account.loginId`
・So sánh khớp hoàn toàn, có phân biệt hoa thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-025 — Confirm password — Kiểm tra bắt buộc

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi, đã nhập giá trị hợp lệ ở password mới

### 手順

ステップ1：
Để trống confirm password, nhấn nút cập nhật

ステップ2：
Chỉ nhập 1 ký tự space half-width → cập nhật

### 期待結果

ステップ1：
Hiển thị「確認用パスワードを入力してください。」ngay dưới mục
Phía FE chặn gửi

ステップ2：
Phía FE `trim()` nhận diện rỗng
Hiển thị「確認用パスワードを入力してください。」

補足：
・Tương ứng ACSMS-SCR-012-009

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-026 — Confirm password — Kiểm tra trùng khớp

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi, đã nhập giá trị hợp lệ ở password mới

### 手順

ステップ1：
Nhập password mới `NewPass123!`, confirm password `NewPass123!` (trùng) → cập nhật

ステップ2：
Nhập password mới `NewPass123!`, confirm password `NewPass456!` (không trùng) → cập nhật

ステップ3：
Trên DevTools, nhập với khác hoa thường `NewPass123!` vs `newpass123!` → cập nhật

### 期待結果

ステップ1：
Tiếp nhận bình thường, thực hiện xử lý cập nhật

ステップ2：
Phía FE hiển thị「新しいパスワードと一致していません。」
Không gọi API

ステップ3：
Phía FE hiển thị「新しいパスワードと一致していません。」
(Phân biệt hoa thường)

補足：
・Implementation: FE check `form.new_password !== form.confirm_password`
・BE `dto.confirm_password !== dto.new_password` verify lại
・Tương ứng ACSMS-SCR-012-010

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-027 — Token — Kiểm tra format UUID

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi

### 手順

ステップ1：
Truy cập URL `/reset-password?token=550e8400-e29b-41d4-a716-446655440000` (UUID format hợp lệ)

ステップ2：
Truy cập URL `/reset-password?token=invalid-token` (35 ký tự, UUID không hợp lệ)

ステップ3：
Truy cập URL `/reset-password?token=` (không có token)

ステップ4：
Trên DevTools, gửi POST `/api/v1/auth/reset-password/verify` với `token: 'not-a-uuid-format'`

### 期待結果

ステップ1：
Gọi API verify token, kết quả phụ thuộc các bước verify sau

ステップ2：
Gọi API verify token, HTTP status code: 400
error_code: BAD_REQUEST hoặc VALIDATION_ERROR
errors[] chứa { field: "token", message: "リセットトークンの形式が不正です。" }

ステップ3：
FE đặt `phase = 'invalid'` ở onMounted (không gọi API)
Hiển thị「無効なリンクです。」trên màn hình

ステップ4：
HTTP status code: 400
errors[] chứa message format token không hợp lệ

補足：
・FE check rỗng bằng `if (typeof queryToken !== 'string' || !queryToken)`
・BE @IsUUID('all') + @Length(36, 36) enforce format UUID v1-v5

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 5: Logic nghiệp vụ — Yêu cầu đặt lại mật khẩu (Function — Forgot)

## ACSMS-TC-012-028 — Email tồn tại — 200 + gửi mail + lưu token

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Account đã đăng ký (email = `user@example.com`, deleted_at IS NULL)
  - ・Trong 5 phút gần đây không có request đặt lại password

### 手順

ステップ1：
Trên `/forgot-password` nhập `user@example.com` → gửi

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_mfa_otp` trên DB:
```sql
SELECT otp_id, account_id, otp_type, expired_at, used_flg, created_at
FROM t_mfa_otp
WHERE account_id = (SELECT account_id FROM m_account WHERE email = 'user@example.com')
  AND otp_type = 2
ORDER BY created_at DESC
LIMIT 1;
```

ステップ4：
Kiểm tra mail nhận được

ステップ5：
Kiểm tra `t_log` trên DB:
```sql
SELECT operation, result_status, target_table, after_value
FROM t_log
WHERE account_id = (SELECT account_id FROM m_account WHERE email = 'user@example.com')
  AND operation = 'PASSWORD_RESET_REQUEST'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
HTTP status code: 200

ステップ2：
Response: `{ message: "パスワード再設定用のメールを送信しました。メールを確認してください。" }`
Trên màn hình form ẩn, hiển thị message thành công

ステップ3：
1 row, `otp_type = 2` (PASSWORD_RESET), `expired_at = NOW() + 1 giờ`, `used_flg = false`, `otp_code_hash` là bcrypt hash

ステップ4：
Mail tiêu đề「【agrinews】パスワードリセット」, body chứa link đặt lại `https://{FRONTEND_URL}/reset-password?token={uuid}`

ステップ5：
1 row, `operation = 'PASSWORD_RESET_REQUEST'`, `result_status = 1`, `target_table = 't_mfa_otp'`, `after_value` JSON chứa `{"event": "reset_token_issued"}`

補足：
・Implementation: tạo UUID token → bcrypt hash → lưu t_mfa_otp → log kiểm toán + gửi mail
・Main DML (lưu OTP) + log kiểm toán trong cùng 1 transaction
・Mail gửi sau commit (thiết kế chống mail còn lại khi rollback)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-029 — Email không tồn tại — 200 (chống liệt kê account)

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Email không tồn tại `notexist@example.com`

### 手順

ステップ1：
Trên `/forgot-password` nhập `notexist@example.com` → gửi

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

ステップ4：
Kiểm tra thời gian response (verify timing attack)

### 期待結果

ステップ1：
HTTP status code: 200 (giống email tồn tại)

ステップ2：
Response: `{ message: "パスワード再設定用のメールを送信しました。メールを確認してください。" }`

ステップ3：
Không có row mới, không INSERT vào `t_mfa_otp`

ステップ4：
Thời gian response gần tương đương trường hợp email tồn tại (nhưng có thể hơi ngắn hơn do bcrypt không chạy, thiết kế chấp nhận)

補足：
・Security: chống tấn công liệt kê account
・Implementation: nếu kết quả accountRepo.findOne là null, chỉ log và trả successMessage
・Không gửi mail, không tạo token

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical về security — Chức năng cốt lõi chống tấn công liệt kê account.

## ACSMS-TC-012-030 — Vô hiệu token cũ (khi yêu cầu lại)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Account đã đăng ký
  - ・Đã có request đặt lại lần 1 hơn 10 phút trước (tồn tại row otp_type=2, used_flg=false trong `t_mfa_otp`, created_at trên 10 phút trước)

### 手順

ステップ1：
Gửi request đặt lại password lần 2 (đã qua cooldown)

ステップ2：
Kiểm tra `t_mfa_otp` trên DB:
```sql
SELECT otp_id, used_flg, created_at
FROM t_mfa_otp
WHERE account_id = :account_id
  AND otp_type = 2
ORDER BY created_at ASC;
```

ステップ3：
Thử truy cập với link đặt lại của token cũ

### 期待結果

ステップ1：
HTTP status code: 200, phát hành token mới thành công

ステップ2：
Row cũ: `used_flg = true` (đã vô hiệu)
Row mới: `used_flg = false`, `otp_code_hash` khác, `expired_at = NOW() + 1 giờ`

ステップ3：
Truy cập với token cũ → HTTP status code: 400
error_code: INVALID_RESET_TOKEN
message:「無効なリンクです。」

補足：
・Implementation: trong `AuthService.forgotPassword`, `manager.update(MfaOtp, { accountId, otpType: 2, usedFlg: false }, { usedFlg: true })`
・Đảm bảo 1 account chỉ có 1 token hợp lệ (yêu cầu lại sẽ vô hiệu link cũ ngay lập tức)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-031 — Cooldown 5 phút — Account tồn tại

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Account đã đăng ký
  - ・Đã gửi request đặt lại password trong 1 phút gần đây

### 手順

ステップ1：
Sau 1 phút, gửi request lần 2 với cùng email

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

ステップ4：
Sau 6 phút, gửi lại request (đã qua cooldown)

### 期待結果

ステップ1：
HTTP status code: 429
error_code: PASSWORD_RESET_RATE_LIMIT
message:「再送信は5分後に可能です。時間をおいてから再度お試しください。」

ステップ2：
Hiển thị error trên màn hình (qua axios interceptor)

ステップ3：
Không có row mới (chỉ row cũ), check 5 phút theo created_at

ステップ4：
HTTP status code: 200, phát hành token mới thành công, vô hiệu token cũ

補足：
・Implementation: `PASSWORD_RESET_COOLDOWN_MINUTES = 5`
・Đếm theo `t_mfa_otp.created_at` (bao gồm cả row đã vô hiệu)
・Thiết kế「cooldown không reset sau khi vô hiệu」
・Khác với controller throttle (@Throttle 3 req/hour) (cái đó theo account)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-032 — Hủy bằng link quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã nhập `user@example.com` ở màn hình đặt lại

### 手順

ステップ1：
Click link「ログイン画面に戻る」

ステップ2：
Quay lại màn hình đặt lại bằng nút back của browser

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

### 期待結果

ステップ1：
Chuyển sang `/login`, email đã nhập bị clear

ステップ2：
Ô input rỗng (form.email = '')

ステップ3：
Không phát hành token mới (vì chưa gửi API)

補足：
・Implementation: trong hàm goLogin `form.email = ''` rồi router.push
・Hủy không thay đổi DB

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-033 — Controller throttle (3 lần/giờ)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Script test gửi 4 request POST `/api/v1/auth/forgot-password` trong 1 giờ

### 手順

ステップ1：
Script gửi request 1〜3 (cùng IP)

ステップ2：
Gửi request thứ 4

### 期待結果

ステップ1：
Mỗi request 200 phản hồi bình thường

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS
message:「リクエスト回数が上限を超えました。しばらくしてから再度お試しください。」

補足：
・Implementation: `@Throttle({ default: { ttl: 60 * 60 * 1000, limit: 3 } })` on forgot-password endpoint
・Throttle theo IP (chống gửi lượng lớn từ cùng IP)
・Khác với cooldown 5 phút (theo account)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 6: Logic nghiệp vụ — Cập nhật mật khẩu (Function — Reset)

## ACSMS-TC-012-034 — Verify token thành công → hiển thị form

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang giữ reset_token hợp lệ (`t_mfa_otp.otp_type=2`, `used_flg=false`, `expired_at > NOW()`)

### 手順

ステップ1：
Mở `/reset-password?token=valid_uuid`

ステップ2：
Kiểm tra response và UI state

### 期待結果

ステップ1：
FE gọi POST `/api/v1/auth/reset-password/verify` ở onMounted
phase = 'verifying' → 'valid'

ステップ2：
HTTP status code: 200
Response: `{ data: { valid: true } }`
Form thay đổi password hiển thị

補足：
・Implementation: BE `findResetTokenOtp` iterate bcrypt để tìm row otp tương ứng
・Verify token không consume (used_flg không cập nhật, `AuthService.verifyResetToken` là read-only)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-035 — Token không hợp lệ → INVALID_RESET_TOKEN

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Token định dạng UUID nhưng không tồn tại

### 手順

ステップ1：
Mở `/reset-password?token=00000000-0000-0000-0000-000000000000`

ステップ2：
Kiểm tra response và UI state

### 期待結果

ステップ1：
FE gọi API verify

ステップ2：
HTTP status code: 400
error_code: INVALID_RESET_TOKEN
message:「無効なリンクです。」
phase = 'invalid', hiển thị error message màu đỏ trên màn hình
Form ẩn, chỉ hiển thị link quay lại

補足：
・Tương ứng ACSMS-SCR-012-008
・Implementation: nếu kết quả `findResetTokenOtp` là null → InvalidResetTokenException

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-036 — Token hết hạn → EXPIRED_RESET_TOKEN

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Token đã phát hành hơn 1 giờ trước (`expired_at < NOW()`)

### 手順

ステップ1：
Mở `/reset-password?token=expired_uuid`

ステップ2：
Kiểm tra response và UI state

### 期待結果

ステップ1：
FE gọi API verify

ステップ2：
HTTP status code: 400
error_code: EXPIRED_RESET_TOKEN
message:「リンクの有効期限が切れています。再度パスワード再設定をお試しください。」
phase = 'expired', hiển thị error message màu đỏ trên màn hình

補足：
・Tương ứng ACSMS-SCR-012-007
・Implementation: `matched.expiredAt.getTime() < Date.now()` → ExpiredResetTokenException

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-037 — Token đã sử dụng → INVALID_RESET_TOKEN (chống tái sử dụng)

- 観点ID: VP-A-09
- 種類: Abnormal (異常)
- 前提条件:
  - ・Token đã được sử dụng cho việc cập nhật password 1 lần (`t_mfa_otp.used_flg = true`)

### 手順

ステップ1：
Mở `/reset-password?token=used_uuid` với token đã sử dụng

ステップ2：
Kiểm tra response và UI state

### 期待結果

ステップ1：
FE gọi API verify

ステップ2：
HTTP status code: 400
error_code: INVALID_RESET_TOKEN
message:「無効なリンクです。」
phase = 'invalid'

補足：
・Implementation: `if (matched.usedFlg) throw new InvalidResetTokenException()`
・Đảm bảo token sử dụng đơn lẻ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-038 — Cập nhật password thành công — DB + log kiểm toán + hủy session cũ

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang giữ reset_token hợp lệ
  - ・Account đối tượng có ≥ 2 session active (đã đăng nhập trên nhiều browser)

### 手順

ステップ1：
Trên màn hình thay đổi nhập password mới `NewPass123!` → cập nhật

ステップ2：
Kiểm tra `m_account` trên DB:
```sql
SELECT password_hash, password_updated_at, updated_at, updated_by
FROM m_account
WHERE account_id = :account_id;
```

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

ステップ4：
Kiểm tra `t_log` trên DB:
```sql
SELECT operation, result_status, target_table, target_id, after_value
FROM t_log
WHERE account_id = :account_id
  AND operation = 'PASSWORD_RESET'
ORDER BY log_datetime DESC
LIMIT 1;
```

ステップ5：
Kiểm tra session của account đối tượng trên Redis

### 期待結果

ステップ1：
HTTP status code: 200
Response: `{ message: "パスワードを更新しました。ログイン画面に移動します。" }`
Trên màn hình toast hiển thị, sau 3 giây tự động chuyển `/login`

ステップ2：
`password_hash` cập nhật sang bcrypt hash mới
`password_updated_at = thời điểm hiện tại`
`updated_at = thời điểm hiện tại`
`updated_by = 'SYSTEM'`

ステップ3：
`used_flg = true` của `otp_id` tương ứng

ステップ4：
1 row, `operation = 'PASSWORD_RESET'`, `result_status = 1`, `target_table = 'm_account'`, `target_id = :account_id`, `after_value` JSON chứa `{"event": "password_reset"}`

ステップ5：
Tất cả session liên kết với account_id đó đều bị xóa
`account_sessions:{account_id}` Set cũng bị xóa

補足：
・Implementation: trong dataSource.transaction cập nhật password + vô hiệu token + ghi log kiểm toán
・Gọi `destroyAllForAccount(accountId)` ngoài transaction
・Tương ứng ACSMS-SCR-012-011

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-039 — Token hết hạn trong khi cập nhật password

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã hiển thị màn hình thay đổi (verify token thành công)
  - ・Đã nhập password hợp lệ

### 手順

ステップ1：
Trong khi đang nhập, token hết hạn (ví dụ: cập nhật thủ công `t_mfa_otp.expired_at` về thời điểm quá khứ)

ステップ2：
Nhấn nút cập nhật

ステップ3：
Kiểm tra response và UI state

### 期待結果

ステップ1：
(Chuẩn bị làm precondition)

ステップ2：
Phía BE check token hết hạn

ステップ3：
HTTP status code: 400
error_code: EXPIRED_RESET_TOKEN
message:「リンクの有効期限が切れています。再度パスワード再設定をお試しください。」
FE detect 'expired' bằng `matchTokenError(err)` → phase = 'expired'
Form ẩn, hiển thị error message

補足：
・Implementation: hàm `matchTokenError` của FE chuyển phase theo error_code
・VALIDATION_ERROR và INTERNAL_SERVER_ERROR throw để qua useApiForm + axios interceptor
・Chỉ token error mới ẩn form (tuân thủ spec §4.4)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-040 — Sau khi cập nhật password tự động chuyển /login sau 3 giây

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・reset_token hợp lệ, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn nút cập nhật

ステップ2：
Sau khi message thành công hiển thị, kiểm tra việc tự động chuyển trang (đo thời gian)

ステップ3：
Đóng browser hoặc chuyển sang màn hình khác trước khi 3 giây trôi qua

### 期待結果

ステップ1：
HTTP status code: 200, toast hiển thị
phase = 'done', sub-text「3秒後にログイン画面へ移動します...」hiển thị

ステップ2：
Tự động chuyển `/login` sau 3 giây (±100ms)

ステップ3：
Timer được giải phóng bằng `clearTimeout(redirectTimer)` ở onUnmounted
Hành vi meaningful trên màn hình khác (timer không tiếp tục)

補足：
・Implementation: `window.setTimeout(() => router.push({ name: 'Login' }), 3000)`
・clearTimeout ở onUnmounted bắt buộc (chống memory leak)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-041 — Trạng thái DB và log khi cập nhật password thất bại (chống commit không hợp lệ)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Cấu hình mock cho INSERT log kiểm toán phía BE thất bại trong test environment
  - ・reset_token hợp lệ, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn nút cập nhật

ステップ2：
Kiểm tra `m_account` trên DB

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

ステップ4：
Kiểm tra `t_log` trên DB

### 期待結果

ステップ1：
INSERT log kiểm toán sau main DML thất bại → transaction rollback

ステップ2：
`password_hash` không thay đổi (giữ nguyên giá trị cũ)
`password_updated_at` không thay đổi

ステップ3：
`used_flg` không thay đổi (vẫn là false)

ステップ4：
Không có log thành công, nhưng có log lỗi (catch ngoài, log_type=3)

補足：
・Implementation: tất cả DML trong dataSource.transaction(async (manager) => {...}) đều rollback
・Trong catch block gọi `auditLogService.logError(...)` ngoài transaction
・Tuân thủ quy tắc `nestjs.md §I/O & External Services / Transaction`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Test critical đảm bảo tính toàn vẹn giữa log kiểm toán và DB state.

---

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-012-042 — Lỗi chung — BAD_REQUEST — Request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại, đã mở DevTools browser

### 手順

ステップ1：
Trên DevTools Console chạy POST `/api/v1/auth/forgot-password` với JSON không hợp lệ
```js
fetch('/api/v1/auth/forgot-password', {
  method: 'POST',
  body: '{invalid json',
  headers: { 'Content-Type': 'application/json' }
});
```

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request bị body parser phía BE từ chối

ステップ2：
HTTP status code: 400
error_code: BAD_REQUEST
message:「リクエストパラメータが不正です。」

補足：
・JSON parse error, Content-Type không hợp lệ, parameter không xác định v.v. tất cả đều map về BAD_REQUEST

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-043 — Lỗi chung — VALIDATION_ERROR — Kiểm tra hình dáng array errors[]

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình thay đổi, nhập giá trị không hợp lệ ở nhiều field (new_password=`abc`, confirm_password=`xyz`)

### 手順

ステップ1：
Nhấn nút cập nhật

ステップ2：
Kiểm tra hình dáng array `errors` của response body

ステップ3：
Kiểm tra hiển thị error message ngay dưới mỗi mục phía màn hình

### 期待結果

ステップ1：
HTTP status code: 400
error_code: VALIDATION_ERROR
message:「入力値が不正です。詳細はerrorsフィールドを確認してください。」

ステップ2：
Array `errors` chứa nhiều entry:
・{ field: "new_password", message: "パスワードは8文字以上で入力してください。" }
・(Việc không trùng confirm_password được detect ở tầng service nên có thể là error riêng)

ステップ3：
Mỗi mục hiển thị error message tương ứng ngay dưới (bind vào `<a-form-item :help>` qua `useApiForm`)

補足：
・Trả về vi phạm của nhiều field cùng lúc trong 1 request
・Implementation: FE `useApiForm` chuyển `errors[]` sang `fieldErrors`, hiển thị vào `:help` của từng `<a-form-item>`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-044 — Lỗi chung — INTERNAL_SERVER_ERROR — Mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại, đã nhập giá trị hợp lệ
  - ・Cố ý ngắt kết nối DB phía BE (test environment)

### 手順

ステップ1：
Nhấn nút gửi

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra trạng thái màn hình

ステップ4：
Kiểm tra log lỗi

### 期待結果

ステップ1：
Phía BE phát sinh exception, xử lý exception ở catch block ngoài

ステップ2：
HTTP status code: 500
error_code: INTERNAL_SERVER_ERROR
message:「システムエラーが発生しました。しばらくしてから再度お試しください。」

ステップ3：
Vẫn ở màn hình đặt lại, toast hiển thị, giữ nguyên giá trị input

ステップ4：
`t_log` có log với log_type=3 được ghi

補足：
・Không lộ thông tin nội bộ như stack trace ra phía user
・Tương ứng ACSMS-SCR-012-004

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-045 — Lỗi chung — NOT_FOUND — Truy cập màn hình không có token

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Không có token trong URL

### 手順

ステップ1：
Mở `/reset-password` (không có query parameter)

ステップ2：
Kiểm tra trạng thái màn hình

### 期待結果

ステップ1：
FE check ở onMounted bằng `if (typeof queryToken !== 'string' || !queryToken)`

ステップ2：
phase = 'invalid', không gọi API verify
Hiển thị「無効なリンクです。」trên màn hình
Chỉ hiển thị link「ログイン画面に戻る」

補足：
・Phía FE return sớm, tránh gọi API vô ích
・Tuân thủ spec §1.2「トークンが無い場合 → ACSMS-SCR-012-008を表示」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-046 — Lỗi chung — TOO_MANY_REQUESTS — reset-password throttle (5/phút)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Script test gửi 6 request POST `/api/v1/auth/reset-password` trong 1 phút

### 手順

ステップ1：
Script gửi request 1〜5

ステップ2：
Gửi request thứ 6

### 期待結果

ステップ1：
Mỗi request 200 hoặc 400 (lỗi token) phản hồi

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS

補足：
・Implementation: `@Throttle({ default: { ttl: 60_000, limit: 5 } })` on reset-password endpoint
・Phòng tấn công brute force (chống thử lượng lớn cho cùng token)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-012-047 — Lỗi chung — Xử lý khi gửi mail thất bại

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Account đã đăng ký
  - ・Cố ý làm thất bại MailService.sendPasswordReset (test environment)

### 手順

ステップ1：
Trên `/forgot-password` nhập email hợp lệ → gửi

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

### 期待結果

ステップ1：
Phía BE phát sinh lỗi gửi mail

ステップ2：
HTTP status code: 500
error_code: INTERNAL_SERVER_ERROR
message:「システムエラーが発生しました。しばらくしてから再度お試しください。」

ステップ3：
(Phụ thuộc implementation) transaction đã commit nên token có thể đã được lưu, hoặc bị rollback xóa
※ Cần xác nhận ở giai đoạn thiết kế

補足：
・spec §4.6「メール送信に失敗した場合：HTTP 500 を返す（トークンは削除）」
・Trong implementation, mail gửi sau commit, nên thiết kế là token còn lại khi mail thất bại
・TBD: việc xóa token phụ thuộc implementation, QA cần xác nhận trên thực tế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Có lệch giữa thiết kế và implementation về xử lý token khi gửi mail thất bại, QA cần xác nhận thực tế.

## ACSMS-TC-012-048 — Lỗi chung — Hiển thị toast FE khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn hình đặt lại / thay đổi, đã nhập giá trị hợp lệ
  - ・Chuyển Network tab DevTools sang chế độ mất kết nối mạng

### 手順

ステップ1：
Nhấn nút gửi (hoặc nút cập nhật)

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Sau khi mạng được phục hồi, nhấn lại button

### 期待結果

ステップ1：
Toast「ネットワークエラーが発生しました。接続をご確認ください。」hiển thị

ステップ2：
Vẫn ở màn hình, giữ nguyên giá trị input

ステップ3：
Thành công bình thường, HTTP status code: 200

補足：
・Phát hiện network error → thông báo cho user
・Giá trị input được giữ, có thể gửi lại
・axios interceptor xử lý Network Error tập trung

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---
