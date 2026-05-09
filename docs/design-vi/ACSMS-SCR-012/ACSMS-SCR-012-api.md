---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: ACSMS-SCR-012
screen_name: Đặt lại Mật khẩu・Thay đổi Mật khẩu
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-09
created_date: 2026/04/16
created_by: Nguyen Truong An
updated_date: 2026/04/16
updated_by: Nguyen Truong An
---

## Lịch sử thay đổi

| Số  | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | ---------- | ---- | ---------- | ---------------------- | -------------- | -------------- |
| 1   | 2026/04/16 | 1.0  | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan Hệ thống

Hệ thống này là một hệ thống quản lý thuê bao đám mây cho JA, cung cấp các chức năng như
quản lý thông tin thuê bao, quản lý lịch sử thuê bao, quản lý dữ liệu chuyển khoản tài khoản, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin thuê bao,
quản lý lịch sử thay đổi nội dung thuê bao, tạo và quản lý dữ liệu chuyển khoản tài khoản, 
chức năng tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng,
ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục đích Tài liệu

Tài liệu này mô tả chi tiết về API mới được tạo trên Hệ thống cho "Đặt lại Mật khẩu・Thay đổi Màn hình Mật khẩu (ACSMS-SCR-012)".

## Tài liệu Liên quan

| Số  | Mã Tài liệu | Tên Tài liệu |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-001 | Tài liệu Thiết kế API - Màn hình Đăng nhập |

## Danh sách Lỗi

| #   | Loại Lỗi | Mã Lỗi | Thông báo Lỗi | Ghi chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST | Tham số yêu cầu không hợp lệ। | HTTP 400 |
| 2   | Chung | VALIDATION_ERROR | Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết। | HTTP 400 |
| 3   | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống। Vui lòng thử lại sau một lúc। | HTTP 500 |
| 4   | Dành riêng cho Màn hình | NOT_FOUND | Không tìm thấy Tài khoản với Địa chỉ Email được chỉ định। | HTTP 404 |
| 5   | Dành riêng cho Màn hình | INVALID_RESET_TOKEN | Liên kết Không hợp lệ। | HTTP 400 |
| 6   | Dành riêng cho Màn hình | EXPIRED_RESET_TOKEN | Liên kết đã Hết hạn Hợp lệ। Vui lòng Thử lại Đặt lại Mật khẩu। | HTTP 400 |

---

# API ACSMS-API-012-001

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Quên Mật khẩu (Yêu cầu Email Đặt lại) |
| Tổng quan | Nhập Địa chỉ Email và Gửi Email Đặt lại Mật khẩu |
| URI | /api/v1/auth/forgot-password |
| Phương thức | POST |
| Phần thân Yêu cầu | JSON |
| Tham số Yêu cầu | Không có |
| Tiêu đề | Content-Type: application/json |
| Mã Phản hồi HTTP | 200: Đã Gửi Email Đặt lại Mật khẩu, 400: Tham số Yêu cầu Không hợp lệ/Giá trị nhập không hợp lệ, 500: Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------ |
| 1   | email | Chuỗi | - | 〇 | 1 | 100 | Địa chỉ Email |

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------------------------------------------------------------- |
| 1   | message | Chuỗi | - | | - | Đã Gửi Email Đặt lại Mật khẩu। Vui lòng Kiểm tra Email। |

## Ví dụ Yêu cầu

```json
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "message": "Đã Gửi Email Đặt lại Mật khẩu। Vui lòng Kiểm tra Email।"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Yêu cầu Không hợp lệ - Định dạng Email Không hợp lệ

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết।",
  "errors": [
    {
      "field": "email",
      "message": "Vui lòng nhập Địa chỉ Email Hợp lệ।"
    }
  ]
}
```

### 200 OK - Email Không tìm thấy (Luôn Trả về 200 để Ngăn Liệt kê Tài khoản)

Ghi chú: Vì Bảo mật, Ngăn Liệt kê Tài khoản được Triển khai। Cả Email Hợp lệ và Không hợp lệ Nhận được Cùng Phản hồi Thành công।

```json
{
  "message": "Đã Gửi Email Đặt lại Mật khẩu। Vui lòng Kiểm tra Email।"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau một lúc।"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực hiện trong một Giao dịch Duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động).
> Nếu một trong hai Thất bại, Hãy Quay lại Toàn bộ.
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Tách rời ngoài Giao dịch.

### 4.1 Xác thực Yêu cầu

- Xác thực Trường email:
  - Kiểm tra Bắt buộc
  - Kiểm tra Định dạng Địa chỉ Email
- Nếu tồn tại Tham số Không hợp lệ:
  - Trả về HTTP 400 Bad Request।

### 4.2 Kiểm tra Xác thực và Phê duyệt

- Không Cần Kiểm tra Xác thực

### 4.3 Xác nhận Sự tồn tại của Địa chỉ Email

- Tìm kiếm Tài khoản với các Điều kiện sau:

```sql
SELECT account_id, account_name
FROM m_account
WHERE email = :email
  AND deleted_at IS NULL
LIMIT 1
```

- Nếu Bản ghi Không tồn tại:
  - Vì Lý do Bảo mật, Trả về Phản hồi Thành công (HTTP 200) cho Email Không tồn tại (Ngăn Liệt kê Tài khoản)

### 4.4 Tạo Mã Đặt lại Mật khẩu

- Tạo UUID Ngẫu nhiên (Mã):
  - `reset_token = UUID()`
- Hash Mã bằng bcrypt:
  - `reset_token_hash = bcrypt.hash(reset_token, 10)`
- Đặt Hết hạn thành 30 Phút sau:
  - `expired_at = NOW() + INTERVAL '30 minutes'`

### 4.5 Lưu trữ Mã trong Cơ sở Dữ liệu

- Lưu trữ Mã với các Điều kiện sau:

```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at, verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :reset_token_hash, 2, :expired_at, 0, 0, false, NOW())
```

### 4.6 Gửi Email

- Mẫu Email
- Tiêu đề Email: `【agrinews】Đặt lại Mật khẩu`
- Nội dung Gửi:
  - Liên kết Đặt lại Mật khẩu (Có Mã): `https://{FRONTEND_URL}/reset-password?token={reset_token}`
  - Hết hạn: 30 Phút
- Nếu Gửi Email Thất bại:
  - Trả về HTTP 500 (Xóa Mã)

### 4.7 Tạo Phản hồi

- Trả về Thông báo Thành công (HTTP 200) Bất kể Sự tồn tại của Địa chỉ Email (Ngăn Liệt kê Tài khoản)

### 4.8 Xử lý Ngoại lệ

- Lỗi Kết nối DB, Lỗi Gửi Email, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-012-002

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Xác thực Mã Đặt lại |
| Tổng quan | Xác thực Giá trị Mã bên trong Liên kết Đặt lại Mật khẩu (Khi Tải Trang) |
| URI | /api/v1/auth/reset-password/verify |
| Phương thức | POST |
| Phần thân Yêu cầu | JSON |
| Tham số Yêu cầu | Không có |
| Tiêu đề | Content-Type: application/json |
| Mã Phản hồi HTTP | 200: Mã Hợp lệ, 400: Mã Không hợp lệ hoặc Hết hạn, 500: Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------- |
| 1   | token | Chuỗi | - | 〇 | 36 | 36 | Mã Đặt lại Mật khẩu (UUID) |

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------ | ------ | -------- | ------------ | -------- | -------------- |
| 1   | valid | Chuỗi | - | | - | Giá trị Mã |

## Ví dụ Yêu cầu

```json
POST /api/v1/auth/reset-password/verify
Content-Type: application/json

{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "valid": true
  }
}
```

## Ví dụ Phản hồi Thất bại

### 400 Yêu cầu Không hợp lệ - Mã Không hợp lệ

```json
{
  "error_code": "INVALID_RESET_TOKEN",
  "message": "Liên kết Không hợp lệ।"
}
```

### 400 Yêu cầu Không hợp lệ - Mã Hết hạn

```json
{
  "error_code": "EXPIRED_RESET_TOKEN",
  "message": "Liên kết đã Hết hạn Hợp lệ। Vui lòng Thử lại Đặt lại Mật khẩu।"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau một lúc।"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực hiện trong một Giao dịch Duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động).
> Nếu một trong hai Thất bại, Hãy Quay lại Toàn bộ.
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Tách rời ngoài Giao dịch.

### 4.1 Xác thực Yêu cầu

- Xác thực Tham số Truy vấn `token`:
  - Kiểm tra Bắt buộc (URL Bao gồm `?token=xxx`)
  - Kiểm tra Định dạng UUID (Là UUID 36 Ký tự)
- Nếu tồn tại Tham số Không hợp lệ:
  - Trả về HTTP 400 Bad Request (`BAD_REQUEST`)

### 4.2 Kiểm tra Xác thực và Phê duyệt

- Không Cần Kiểm tra Xác thực

### 4.3 Xác thực Mã

- Tìm kiếm Mã với các Điều kiện sau:

```sql
SELECT otp_id, account_id, expired_at, used_flg
FROM t_mfa_otp
WHERE otp_type = 2
```

- Nếu Mã không Tìm thấy:
  - Trả về HTTP 400 (`INVALID_RESET_TOKEN`)

### 4.4 Xác nhận Hết hạn Mã

- Xác nhận `expired_at > NOW()`
- Nếu Hết hạn:
  - Trả về HTTP 400 (`EXPIRED_RESET_TOKEN`)

### 4.5 Xác nhận Cờ Sử dụng Mã

- Xác nhận `used_flg = false`
- Nếu Đã sử dụng:
  - Trả về HTTP 400 (`INVALID_RESET_TOKEN`)

### 4.6 Tạo Phản hồi

- Nếu Mã Hợp lệ:
  - Trả về HTTP 200
  - `{ "data": { "valid": true } }`

### 4.7 Xử lý Ngoại lệ

- Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-012-003

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Đặt lại Mật khẩu |
| Tổng quan | Xác thực Mã và Cập nhật Mật khẩu |
| URI | /api/v1/auth/reset-password |
| Phương thức | POST |
| Phần thân Yêu cầu | JSON |
| Tham số Yêu cầu | Không có |
| Tiêu đề | Content-Type: application/json |
| Mã Phản hồi HTTP | 200: Đã Cập nhật Mật khẩu, 400: Mã Không hợp lệ hoặc Giá trị nhập không hợp lệ, 500: Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | -------------------------------- |
| 1   | token | Chuỗi | - | 〇 | 36 | 36 | Mã Đặt lại Mật khẩu (UUID) |
| 2   | new_password | Chuỗi | - | 〇 | 8 | 32 | Mật khẩu Mới |
| 3   | confirm_password | Chuỗi | - | 〇 | 8 | 32 | Mật khẩu Xác nhận |

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------- |
| 1   | message | Chuỗi | - | | - | Thông báo Cập nhật Thành công |

## Ví dụ Yêu cầu

```json
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "new_password": "NewPass123!@",
  "confirm_password": "NewPass123!@"
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "message": "Đã Cập nhật Mật khẩu। Chuyển đến Màn hình Đăng nhập।"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Yêu cầu Không hợp lệ - Lỗi Xác thực

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết।",
  "errors": [
    {
      "field": "new_password",
      "message": "Mật khẩu phải từ 8~32 Ký tự và Bao gồm 2+ Loại trong Số Nửa Độ rộng Chữ cái・Số・Ký hiệu।"
    },
    {
      "field": "confirm_password",
      "message": "Không Khớp với Mật khẩu Mới।"
    }
  ]
}
```

### 400 Yêu cầu Không hợp lệ - Mã Không hợp lệ

```json
{
  "error_code": "INVALID_RESET_TOKEN",
  "message": "Liên kết Không hợp lệ।"
}
```

### 400 Yêu cầu Không hợp lệ - Mã Hết hạn

```json
{
  "error_code": "EXPIRED_RESET_TOKEN",
  "message": "Liên kết đã Hết hạn Hợp lệ। Vui lòng Thử lại Đặt lại Mật khẩu।"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau một lúc।"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực hiện trong một Giao dịch Duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động).
> Nếu một trong hai Thất bại, Hãy Quay lại Toàn bộ.
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Tách rời ngoài Giao dịch.

### 4.1 Xác thực Yêu cầu

- Xác thực Trường token:
  - Kiểm tra Bắt buộc
- Xác thực Trường new_password:
  - Kiểm tra Bắt buộc
  - Kiểm tra Độ dài (8~32 Ký tự)
  - Kiểm tra Định dạng Mật khẩu (Bao gồm 2+ Loại trong Số Chữ cái・Số・Ký hiệu)
  - Tên Đăng nhập không Giống nhau
- Xác thực Trường confirm_password:
  - Khớp với new_password
- Nếu tồn tại Tham số Không hợp lệ:
  - Trả về HTTP 400 Bad Request।

### 4.2 Kiểm tra Xác thực và Phê duyệt

- API này không Cần Xác thực (Người dùng trước khi Đăng nhập Sử dụng)
- Không Cần Kiểm tra Xác thực

### 4.3 Xác thực Mã

- Tìm kiếm Mã với các Điều kiện sau:

```sql
SELECT otp_id, account_id, expired_at, used_flg, otp_code_hash
FROM t_mfa_otp
WHERE otp_type = 2
```

- Nếu Mã không Tìm thấy, hoặc Hết hạn:
  - Trả về HTTP 400 (`INVALID_RESET_TOKEN` hoặc `EXPIRED_RESET_TOKEN`)

### 4.4 Lấy Thông tin Tài khoản

- Lấy Tài khoản với các Điều kiện sau:

```sql
SELECT account_id, login_id, email, password_hash
FROM m_account
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

- Nếu Tài khoản không Tìm thấy:
  - Trả về HTTP 400 (`INVALID_RESET_TOKEN`)

### 4.5 Kiểm tra Chi tiết Định dạng Mật khẩu

- Xác nhận Mật khẩu Mới Đáp ứng các Điều kiện sau:
  - 8~32 Ký tự
  - Bao gồm 2+ Loại trong Số Chữ cái、Số、Ký hiệu
  - Không Giống Tên Đăng nhập (login_id)
- Nếu Kiểm tra Thất bại:
  - Trả về HTTP 400 Bad Request

### 4.6 Cập nhật Mật khẩu

- Hash Mật khẩu Mới bằng bcrypt:
- Cập nhật Mật khẩu với các Điều kiện sau:

```sql
UPDATE m_account
SET password_hash = :new_password_hash,
    password_updated_at = NOW(),
    updated_at = NOW(),
    updated_by = 'SYSTEM'
WHERE account_id = :account_id
```

### 4.7 Vô hiệu hóa Mã

- Vô hiệu hóa Mã với các Điều kiện sau:

```sql
UPDATE t_mfa_otp
SET used_flg = true,
    updated_at = NOW()
WHERE otp_id = :otp_id
```

### 4.8 Vô hiệu hóa Phiên làm việc Hiện tại (Tùy chọn)

- Xóa tất cả các Phiên làm việc Hiện tại trên Redis của Tài khoản Giống nhau:
  - Lấy tất cả `session_id` được Liên kết với account_id Mục tiêu từ Chỉ mục Phiên làm việc Redis (Ví dụ: `account_sessions:{account_id}` Khóa Tập hợp).
  - Xóa mỗi Khóa Phiên `session:{session_id}` được Lấy bằng `DEL`.
  - Xóa Khóa Chỉ mục bằng `DEL account_sessions:{account_id}`.
- Bằng cách này, Truy cập Sử dụng Phiên được Lấy bằng Mật khẩu Cũ sẽ bị Vô hiệu hóa Ngay lập tức.

### 4.9 Ghi lại Nhật ký Hoạt động (Tùy chọn)

- Ghi lại Sự kiện Cập nhật Mật khẩu:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id,
                   gamen_name, operation, result_status,
                   target_table, after_value,
                   user_agent)
VALUES (1, NOW(), :account_id,
        'Màn hình Đặt lại Mật khẩu (ACSMS-SCR-012)', 'PASSWORD_RESET', 1,
        'm_account', '{"event": "password_reset"}',
        :user_agent)
```

### 4.10 Tạo Phản hồi

- Trả về HTTP 200 Với Thông báo Thành công

### 4.11 Xử lý Ngoại lệ

- Mã Hết hạn trong Quá trình Cập nhật: HTTP 400 (`EXPIRED_RESET_TOKEN`)
- Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

## Cấu hình Xác thực・Phê duyệt

### ACSMS-API-012-001 (Quên Mật khẩu)

- **Yêu cầu Xác thực**: Không Cần (Người dùng trước khi Đăng nhập Sử dụng)
- **Yêu cầu Quyền hạn**: Không có
- **Giới hạn Tỷ lệ**: 3 Yêu cầu/Giờ cho mỗi Địa chỉ Email (Phòng chống Tấn công Vũ phu)

### ACSMS-API-012-002 (Xác thực Mã)

- **Yêu cầu Xác thực**: Không Cần (Người dùng trước khi Đăng nhập Sử dụng)
- **Yêu cầu Quyền hạn**: Không có
- **Giới hạn Tỷ lệ**: Không Giới hạn (Chỉ Xác thực Mã)

### ACSMS-API-012-003 (Đặt lại Mật khẩu)

- **Yêu cầu Xác thực**: Không Cần (Người dùng trước khi Đăng nhập Sử dụng)
- **Yêu cầu Quyền hạn**: Không có
- **Giới hạn Tỷ lệ**: 5 Yêu cầu/Phút cho mỗi Mã (Phòng chống Tấn công Vũ phu)

---

## Yêu cầu Định dạng Mật khẩu

Mật khẩu Phải Đáp ứng các Điều kiện sau:

| Mục | Yêu cầu |
| --- | --- |
| Độ dài | 8~32 Ký tự |
| Loại Ký tự | Bao gồm 2+ Loại trong Số Chữ cái (Lớn/Nhỏ), Số, Ký hiệu |
| Trùng lặp với Tên Đăng nhập | Không Giống Tên Đăng nhập |
| Trùng lặp với Mật khẩu trước | Khác với Mật khẩu Trước (Tùy chọn) |

Ví dụ Ký hiệu: `!@#$%^&*()_+-=[]{}|;:,.<>?`

---

## Lưu ý về Bảo mật

1. **Ngăn Liệt kê Tài khoản**: API Quên Mật khẩu Trả về Phản hồi Thành công (HTTP 200) Ngay cả khi Địa chỉ Email không Tồn tại
2. **Lưu trữ Mã**: Mã Đặt lại được Hash bằng bcrypt để Lưu trữ, Không được Lưu trữ dưới Dạng Văn bản Thuần
3. **Hết hạn Mã**: 30 Phút (Cân bằng Bảo mật và Tiện lợi)
4. **Sử dụng Duy nhất**: Mã Đặt lại Được vô hiệu hóa sau khi Sử dụng một Lần
5. **Vô hiệu hóa Phiên làm việc**: Tất cả các Phiên làm việc Hiện tại trên Redis được Xóa sau khi Cập nhật Mật khẩu
6. **Giới hạn Tỷ lệ**: Được Triển khai để Phòng chống Tấn công Vũ phu
7. **HTTPS Bắt buộc**: Tất cả các API Sử dụng HTTPS
