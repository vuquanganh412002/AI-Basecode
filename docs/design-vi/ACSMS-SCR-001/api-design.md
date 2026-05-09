---
customer_name: Báo Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý người đọc phiên bản cloud
document_name: Tài liệu thiết kế API
screen_id: ACSMS-SCR-001
screen_name: Màn hình đăng nhập
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-13
created_date: 2026/04/13
created_by: Nguyen Truong An
updated_date: 2026/04/13
updated_by: Nguyen Truong An
---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm tra | Người phê duyệt |
|---|---|---|---|---|---|---|
| 1 | 2026/04/13 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/04/21 | 1.1 | Nguyen Truong An | Cập nhật thông báo lỗi | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là hệ thống quản lý người đọc dạng cloud dành cho JA,
cung cấp các chức năng quản lý thông tin người đọc, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản ngân hàng, v.v.

Các chức năng chính bao gồm: đăng ký・cập nhật・tìm kiếm thông tin người đọc,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản ngân hàng,
chức năng upload・download file, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như:
quản lý đăng nhập người dùng, ghi lịch sử đăng nhập, ghi log thao tác của người dùng.

## Mục đích tài liệu

Tài liệu mô tả chi tiết các API được tạo mới trong màn hình đăng nhập (ACSMS-SCR-001).

## Tài liệu liên quan

| No | Mã tài liệu | Tên tài liệu |
|---|---|---|
| 1 | ACSMS-SCR-002 | Tài liệu thiết kế API màn hình Menu |

## Danh sách lỗi

| # | Loại lỗi | Mã lỗi | Thông báo lỗi | Ghi chú |
|---|---|---|---|---|
| 1 | Chung | BAD_REQUEST | Tham số request không hợp lệ. | HTTP 400 |
| 2 | Chung | UNAUTHORIZED | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 3 | Chung | FORBIDDEN | Bạn không có quyền truy cập màn hình này. | HTTP 403 |
| 4 | Chung | DATA_SCOPE_VIOLATION | Bạn không có quyền truy cập dữ liệu này. | HTTP 403 |
| 5 | Chung | TOO_MANY_REQUESTS | Số lượng request đã vượt giới hạn. Vui lòng thử lại sau. | HTTP 429 |
| 6 | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | HTTP 500 |
| 7 | Riêng màn hình | INVALID_CREDENTIALS | ID người dùng hoặc mật khẩu không đúng. | HTTP 401 |
| 8 | Riêng màn hình | ACCOUNT_LOCKED | Tài khoản đã bị khóa. | HTTP 401 |
| 9 | Riêng màn hình | INVALID_OTP | Mã xác thực không đúng. | HTTP 401 |
| 10 | Riêng màn hình | OTP_EXPIRED | Mã xác thực đã hết hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 11 | Riêng màn hình | OTP_MAX_ATTEMPTS | Số lần nhập mã xác thực đã đạt giới hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 12 | Riêng màn hình | OTP_RESEND_LIMIT | Số lần gửi lại mã đã đạt giới hạn. Vui lòng đăng nhập lại. | HTTP 429 |
| 13 | Riêng màn hình | OTP_RESEND_COOLDOWN | Thời gian chờ giữa các lần gửi lại chưa đủ 60 giây. Vui lòng thử lại sau. | HTTP 429 |
| 14 | Riêng màn hình | INVALID_MFA_TOKEN | Token MFA không hợp lệ. Vui lòng đăng nhập lại. | HTTP 401 |

---

# API ACSMS-API-001-001

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Login |
| Tổng quan | Xác thực bằng ID người dùng và mật khẩu. Nếu MFA được bật thì gửi OTP qua email |
| URI | /api/v1/auth/login |
| Phương thức | POST |
| Request Body | JSON |
| Tham số request | |
| Header | Content-Type: application/json |
| HTTP Response Code | 200: Xác thực thành công (trả về token khi không cần MFA, trả về mfa_required khi cần MFA), 400: Tham số request không hợp lệ, 401: Xác thực thất bại, 429: Giới hạn tốc độ, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | login_id | String | - | 〇 | 1 | 20 | ID người dùng. Chỉ ký tự nửa góc (chữ cái, số, ký hiệu) |
| 2 | password | String | - | 〇 | 8 | 32 | Mật khẩu. Chỉ ký tự nửa góc. Phải có ít nhất 2 trong 3 loại: chữ cái, số, ký hiệu |

## Dữ liệu response

### Trường hợp không cần MFA

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_required | Boolean | - | | - | Cờ yêu cầu MFA (false) |
| 3 | →user | Object | - | | - | Thông tin người dùng |
| 4 | →→account_id | Number | - | | - | ID tài khoản |
| 5 | →→login_id | String | - | | - | ID đăng nhập |
| 6 | →→account_name | String | - | | - | Tên tài khoản |
| 7 | →→role_id | Number | - | | - | ID vai trò |
| 8 | →→role_code | String | - | | - | Mã vai trò |
| 9 | →→role_name | String | - | | - | Tên vai trò |
| 10 | →→ja_id | Number | - | | 〇 | ID JA (khóa ngoại). Nichi-Nō là NULL, Trung ương hội・JA Trụ sở chính・JA Kanri-Shiten là bắt buộc |
| 11 | →→kanri_shiten_id | Number | - | | 〇 | ID chi nhánh quản lý (chỉ JA Kanri-Shiten) |
| 12 | →→todofuken_code | String | - | | 〇 | Mã tỉnh/thành phố. Bắt buộc với Trung ương hội・JA Trụ sở chính・JA Kanri-Shiten |
| 13 | →→paper_flg | Boolean | - | | - | Cờ xử lý phiên bản giấy |
| 14 | →→denshi_flg | Boolean | - | | - | Cờ xử lý phiên bản điện tử |
| 15 | →→email | String | - | | - | Địa chỉ email |
| 16 | →→permissions | Array | 〇 | | - | Danh sách mã quyền (permission_code trong m_permissions) |

※ Thông tin xác thực (session ID) được trả về qua HTTP-only Cookie, không phải trong response body.

### Trường hợp cần MFA

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_required | Boolean | - | | - | Cờ yêu cầu MFA (true) |
| 3 | →mfa_token | String | - | UUID | - | Token tạm thời cho xác thực MFA |
| 5 | →expires_in | Number | - | | - | Thời hạn hiệu lực OTP (giây). 300 (5 phút) |

## Ví dụ request

```json
POST /api/v1/auth/login

{
  "login_id": "admin01",
  "password": "P@ssw0rd123"
}
```

## Ví dụ response thành công

### Trường hợp không cần MFA

```json
{
  "data": {
    "mfa_required": false,
    "user": {
      "account_id": 1,
      "login_id": "admin01",
      "account_name": "管理者太郎",
      "role_id": 1,
      "role_code": "NICHINO_ADMIN",
      "role_name": "日農（管理者）",
      "ja_id": null,
      "kanri_shiten_id": null,
      "todofuken_code": null,
      "paper_flg": false,
      "denshi_flg": false,
      "email": "admin@nichino.co.jp",
      "permissions": [
        "dokusya.create", "dokusya.view", "dokusya.update", "dokusya.delete",
        "dokusya.import", "dokusya.replace_hanbaiten",
        "hanbaiten.create", "hanbaiten.view", "hanbaiten.update", "hanbaiten.delete",
        "hanbaiten.import",
        "tanka.create", "tanka.view", "tanka.update", "tanka.delete",
        "account.create", "account.view", "account.update", "account.delete",
        "oshirase.create", "oshirase.view", "oshirase.update", "oshirase.delete",
        "log.view"
      ]
    }
  }
}
```

※ Response header thiết lập session ID (UUID v4) dưới dạng HTTP-only Cookie (Secure + SameSite=Strict, hiệu lực 24 giờ).

### Trường hợp cần MFA

```json
{
  "data": {
    "mfa_required": true,
    "mfa_token": "550e8400-e29b-41d4-a716-446655440000",
    "expires_in": 300
  }
}
```

## Ví dụ response thất bại

### 401 Unauthorized — Thông tin xác thực không hợp lệ

```json
{
  "error_code": "INVALID_CREDENTIALS",
  "message": "ユーザーIDまたはパスワードが正しくありません"
}
```

### 401 Unauthorized — Tài khoản bị khóa

```json
{
  "error_code": "ACCOUNT_LOCKED",
  "message": "アカウントがロックされています"
}
```

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
}
```

### 429 Too Many Requests

```json
{
  "error_code": "TOO_MANY_REQUESTS",
  "message": "リクエスト回数が上限を超えました。しばらくしてから再度お試しください"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

> ※ Các xử lý dưới đây được thực hiện trong một transaction duy nhất (xử lý chính + ghi log thao tác).
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng ngoài transaction.

### 4.1 Validation request
- Kiểm tra request body:
  - login_id: Bắt buộc, tối đa 20 ký tự, chỉ ký tự nửa góc
  - password: Bắt buộc, 8〜32 ký tự, chỉ ký tự nửa góc
- Nếu lỗi validation: HTTP 400 (`BAD_REQUEST`)

### 4.2 Xác thực tài khoản
- Lấy tài khoản theo điều kiện sau:
```sql
SELECT a.account_id, a.login_id, a.password_hash, a.account_name,
       a.paper_flg, a.denshi_flg, a.email, a.mfa_enable_flg,
       a.login_failure_count, a.account_lock_flg,
       r.role_code, r.role_name
INNER JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
WHERE a.login_id = :login_id
  AND a.deleted_at IS NULL
```
- Lấy danh sách mã quyền của tài khoản:
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```
- Không tìm thấy bản ghi: HTTP 401 (`INVALID_CREDENTIALS`)
  - ※ Vì lý do bảo mật, không phân biệt tài khoản không tồn tại và xác thực thất bại
- Nếu cờ khóa tài khoản là true: HTTP 401 (`ACCOUNT_LOCKED`)
  - Thông báo rõ ràng rằng tài khoản đang bị khóa
- Đối chiếu mật khẩu: `bcrypt.compare(mật khẩu nhập vào, password_hash)`
- Nếu mật khẩu không khớp:
  - Tăng số lần đăng nhập thất bại:
```sql
UPDATE m_account
SET login_failure_count = login_failure_count + 1,
    updated_at = NOW()
WHERE account_id = :account_id
  AND deleted_at IS NULL
```
  - HTTP 401 (`INVALID_CREDENTIALS`)

### 4.3 Xử lý đăng nhập thành công
- Reset số lần đăng nhập thất bại và cập nhật thời gian đăng nhập cuối:
```sql
UPDATE m_account
SET login_failure_count = 0,
    last_login_at = NOW(),
    updated_at = NOW()
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.4 Phán định MFA・Gửi OTP
- Nếu `mfa_enable_flg = false`:
  - Tạo session và lưu vào Redis (TTL 24 giờ, key: session:{session_id}).
  - Thiết lập session ID (UUID v4) dưới dạng HTTP-only Cookie (Secure + SameSite=Strict, hiệu lực 24 giờ).
  - Trả về thông tin người dùng.
- Nếu `mfa_enable_flg = true`:
  - Vô hiệu hóa OTP chưa sử dụng hiện có:
```sql
UPDATE t_mfa_otp
SET used_flg = true
WHERE account_id = :account_id
  AND used_flg = false
  AND otp_type = 1
```
  - Tạo mã OTP ngẫu nhiên 6 chữ số.
  - Hash mã OTP bằng bcrypt và lưu:
```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at,
                       verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :otp_code_hash, 1, NOW() + INTERVAL '5 minutes',
        0, 0, false, NOW())
RETURNING otp_id
```
  - Gửi mã OTP qua email (tiêu đề: 【agrinews】ログイン認証コード).
  - Tạo token tạm thời MFA (UUID), liên kết với otp_id và quản lý ở phía server.
  - Trả về `mfa_required: true`, `mfa_token`, `expires_in: 300`.

### 4.5 Ghi log đăng nhập
- Ghi nhật ký đăng nhập (cả thành công lẫn thất bại):
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        1, :failure_reason,
        :ip_address, :user_agent)
```
- login_result: 1 (thành công), 2 (thất bại)
- failure_reason: Lý do thất bại (xác thực thất bại, khóa tài khoản, v.v.). Để trống khi thành công.
- account_id: NULL nếu không xác định được tài khoản.

### 4.6 Tạo response
- Không cần MFA: Trả về thông tin người dùng dưới dạng object `data`. HTTP 200.
- Cần MFA: Trả về `mfa_required: true` + `mfa_token` + `expires_in`. HTTP 200.

### 4.7 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Kể cả khi xảy ra lỗi vẫn ghi log đăng nhập:
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        2, :error_message,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-001-002

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Verify MFA OTP |
| Tổng quan | Xác minh mã xác thực MFA (OTP) và hoàn tất quá trình xác thực |
| URI | /api/v1/auth/mfa/verify |
| Phương thức | POST |
| Request Body | JSON |
| Tham số request | |
| Header | Content-Type: application/json |
| HTTP Response Code | 200: Xác thực thành công, 400: Tham số request không hợp lệ, 401: Mã xác thực sai・hết hạn・vượt giới hạn, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | mfa_token | String | - | 〇 | | | Token tạm thời cho xác thực MFA (giá trị trả về từ API đăng nhập) |
| 2 | otp_code | String | - | 〇 | 6 | 6 | Mã xác thực 6 chữ số. Chỉ số (0-9) |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →user | Object | - | | - | Thông tin người dùng |
| 3 | →→account_id | Number | - | | - | ID tài khoản |
| 4 | →→login_id | String | - | | - | ID đăng nhập |
| 5 | →→account_name | String | - | | - | Tên tài khoản |
| 6 | →→role_id | Number | - | | - | ID vai trò |
| 7 | →→role_code | String | - | | - | Mã vai trò |
| 8 | →→role_name | String | - | | - | Tên vai trò |
| 9 | →→ja_id | Number | - | | 〇 | ID JA (khóa ngoại). Nichi-Nō là NULL, Trung ương hội・JA Trụ sở chính・JA Kanri-Shiten là bắt buộc |
| 10 | →→kanri_shiten_id | Number | - | | 〇 | ID chi nhánh quản lý (chỉ JA Kanri-Shiten) |
| 11 | →→todofuken_code | String | - | | 〇 | Mã tỉnh/thành phố. Bắt buộc với Trung ương hội・JA Trụ sở chính・JA Kanri-Shiten |
| 12 | →→paper_flg | Boolean | - | | - | Cờ xử lý phiên bản giấy |
| 13 | →→denshi_flg | Boolean | - | | - | Cờ xử lý phiên bản điện tử |
| 14 | →→email | String | - | | - | Địa chỉ email |
| 15 | →→permissions | Array | 〇 | | - | Danh sách mã quyền (permission_code trong m_permissions) |

※ Thông tin xác thực (session ID) được trả về qua HTTP-only Cookie, không phải trong response body.

## Ví dụ request

```json
POST /api/v1/auth/mfa/verify

{
  "mfa_token": "550e8400-e29b-41d4-a716-446655440000",
  "otp_code": "123456"
}
```

## Ví dụ response thành công

```json
{
  "data": {
    "user": {
      "account_id": 3,
      "login_id": "chuokai01",
      "account_name": "中央会太郎",
      "role_id": 3,
      "role_code": "CHUOKAI",
      "role_name": "中央会",
      "ja_id": 1,
      "kanri_shiten_id": null,
      "todofuken_code": "13",
      "paper_flg": true,
      "denshi_flg": true,
      "email": "c***i@ja-example.or.jp",
      "permissions": [
        "dokusya.view", "dokusya.update",
        "hanbaiten.view",
        "tanka.view"
      ]
    }
  }
}
```

※ Response header thiết lập session ID (UUID v4) dưới dạng HTTP-only Cookie (Secure + SameSite=Strict, hiệu lực 24 giờ).

## Ví dụ response thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
}
```

### 401 Unauthorized — Mã OTP không hợp lệ

```json
{
  "error_code": "INVALID_OTP",
  "message": "認証コードが正しくありません"
}
```

### 401 Unauthorized — Mã OTP hết hạn

```json
{
  "error_code": "OTP_EXPIRED",
  "message": "認証コードの有効期限が切れました。再度ログインしてください"
}
```

### 401 Unauthorized — Vượt số lần nhập OTP tối đa

```json
{
  "error_code": "OTP_MAX_ATTEMPTS",
  "message": "認証コードの入力回数が上限に達しました。再度ログインしてください"
}
```

### 401 Unauthorized — Token MFA không hợp lệ

```json
{
  "error_code": "INVALID_MFA_TOKEN",
  "message": "MFAトークンが無効です。再度ログインしてください"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

> ※ Các xử lý dưới đây được thực hiện trong một transaction duy nhất (xử lý chính + ghi log thao tác).
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng ngoài transaction.

### 4.1 Validation request
- Kiểm tra request body:
  - mfa_token: Bắt buộc
  - otp_code: Bắt buộc, 6 chữ số, chỉ số (0-9)
- Nếu lỗi validation: HTTP 400 (`BAD_REQUEST`)

### 4.2 Xác minh token MFA
- Xác định bản ghi OTP từ mfa_token (mapping mfa_token → otp_id được quản lý phía server).
- Nếu token MFA không hợp lệ hoặc không tồn tại: HTTP 401 (`INVALID_MFA_TOKEN`)
- Lấy bản ghi OTP tương ứng:
```sql
SELECT o.otp_id, o.account_id, o.otp_code_hash, o.expired_at,
       o.verify_attempt_count, o.resend_count, o.used_flg
FROM t_mfa_otp o
  AND o.used_flg = false
  AND o.otp_type = 1
```
- Không tìm thấy bản ghi: HTTP 401 (`INVALID_MFA_TOKEN`)

### 4.3 Xác minh OTP
- Kiểm tra thời hạn OTP: Nếu `expired_at < NOW()`:
  - Vô hiệu hóa OTP:
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 401 (`OTP_EXPIRED`)
- Kiểm tra số lần thử OTP: Nếu `verify_attempt_count >= 5`:
  - Vô hiệu hóa OTP:
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 401 (`OTP_MAX_ATTEMPTS`)
- Đối chiếu mã OTP: `bcrypt.compare(otp_code nhập vào, otp_code_hash)`
- Nếu mã OTP không khớp:
  - Tăng số lần thử:
```sql
UPDATE t_mfa_otp
SET verify_attempt_count = verify_attempt_count + 1
WHERE otp_id = :otp_id
```
  - Sau khi tăng nếu `verify_attempt_count >= 5`:
    - Vô hiệu hóa OTP và HTTP 401 (`OTP_MAX_ATTEMPTS`)
  - Trường hợp khác: HTTP 401 (`INVALID_OTP`)

### 4.4 Xử lý hoàn tất xác thực
- Đánh dấu OTP đã sử dụng:
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
- Lấy thông tin tài khoản:
```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email,
       r.role_code, r.role_name
FROM m_account a
INNER JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
```
- Lấy danh sách mã quyền của tài khoản:
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```
- Tạo session và lưu vào Redis (TTL 24 giờ, key: session:{session_id}).
- Thiết lập session ID (UUID v4) dưới dạng HTTP-only Cookie (Secure + SameSite=Strict, hiệu lực 24 giờ).

### 4.5 Ghi log đăng nhập
- Ghi log xác thực MFA thành công:
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        1, '',
        :ip_address, :user_agent)
```

### 4.6 Tạo response
- Trả về thông tin người dùng dưới dạng object `data`. HTTP 200.

### 4.7 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Kể cả khi xảy ra lỗi vẫn ghi log đăng nhập:
```sql
INSERT INTO t_login_log (login_datetime, account_id, login_id,
                         login_result, failure_reason,
                         ip_address, user_agent)
VALUES (NOW(), :account_id, :login_id,
        2, :error_message,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-001-003

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Resend MFA OTP |
| Tổng quan | Gửi lại mã xác thực MFA (OTP) |
| URI | /api/v1/auth/mfa/resend |
| Phương thức | POST |
| Request Body | JSON |
| Tham số request | |
| Header | Content-Type: application/json |
| HTTP Response Code | 200: Gửi lại thành công, 400: Tham số request không hợp lệ, 401: Token MFA không hợp lệ, 429: Vượt giới hạn gửi lại・Cooldown, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | mfa_token | String | - | 〇 | | | Token tạm thời cho xác thực MFA (giá trị trả về từ API đăng nhập) |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →mfa_token | String | - | UUID | - | Token tạm thời MFA mới |
| 4 | →expires_in | Number | - | | - | Thời hạn hiệu lực OTP mới (giây). 300 (5 phút) |
| 5 | →resend_count | Number | - | | - | Số lần gửi lại (bao gồm lần gửi đầu tiên) |
| 6 | →max_resend | Number | - | | - | Số lần gửi lại tối đa. 3 |

## Ví dụ request

```json
POST /api/v1/auth/mfa/resend

{
  "mfa_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Ví dụ response thành công

```json
{
  "data": {
    "mfa_token": "660e8400-e29b-41d4-a716-446655440001",
    "expires_in": 300,
    "resend_count": 2,
    "max_resend": 3
  }
}
```

## Ví dụ response thất bại

### 401 Unauthorized — Token MFA không hợp lệ

```json
{
  "error_code": "INVALID_MFA_TOKEN",
  "message": "MFAトークンが無効です。再度ログインしてください"
}
```

### 429 Too Many Requests — Vượt giới hạn gửi lại

```json
{
  "error_code": "OTP_RESEND_LIMIT",
  "message": "コードの再送回数が上限に達しました。再度ログインしてください"
}
```

### 429 Too Many Requests — Cooldown

```json
{
  "error_code": "OTP_RESEND_COOLDOWN",
  "message": "再送間隔が60秒未満です。しばらくしてから再度お試しください"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

> ※ Các xử lý dưới đây được thực hiện trong một transaction duy nhất (xử lý chính + ghi log thao tác).
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng ngoài transaction.

### 4.1 Validation request
- Kiểm tra request body:
  - mfa_token: Bắt buộc
- Nếu lỗi validation: HTTP 400 (`BAD_REQUEST`)

### 4.2 Xác minh token MFA
- Xác định bản ghi OTP từ mfa_token.
- Nếu token MFA không hợp lệ hoặc không tồn tại: HTTP 401 (`INVALID_MFA_TOKEN`)
- Lấy bản ghi OTP tương ứng:
```sql
FROM t_mfa_otp o
WHERE o.otp_id = :otp_id
  AND o.used_flg = false
```
- Không tìm thấy bản ghi: HTTP 401 (`INVALID_MFA_TOKEN`)

### 4.3 Kiểm tra giới hạn gửi lại
- Kiểm tra số lần gửi lại: Nếu `resend_count >= 3`:
  - Vô hiệu hóa OTP:
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
  - HTTP 429 (`OTP_RESEND_LIMIT`)
- Kiểm tra cooldown: Nếu chưa đủ 60 giây kể từ lần gửi trước:
  - HTTP 429 (`OTP_RESEND_COOLDOWN`)

### 4.4 Phát hành OTP mới
- Vô hiệu hóa OTP cũ:
```sql
UPDATE t_mfa_otp SET used_flg = true WHERE otp_id = :otp_id
```
- Tạo mã OTP ngẫu nhiên 6 chữ số mới.
- Hash mã OTP bằng bcrypt và lưu. resend_count kế thừa giá trị OTP cũ + 1:
```sql
INSERT INTO t_mfa_otp (account_id, otp_code_hash, otp_type, expired_at,
                       verify_attempt_count, resend_count, used_flg, created_at)
VALUES (:account_id, :otp_code_hash, 1, NOW() + INTERVAL '5 minutes',
        0, :new_resend_count, false, NOW())
RETURNING otp_id
```
- Tạo token tạm thời MFA mới (UUID), liên kết với otp_id mới và quản lý ở phía server.

### 4.5 Gửi email
- Gửi mã OTP mới qua email (tiêu đề: 【agrinews】ログイン認証コード).
- Lấy địa chỉ email của tài khoản:
```sql
SELECT email FROM m_account
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.6 Tạo response
- Trả về `mfa_token` mới, `expires_in: 300`, `resend_count`, `max_resend: 3`. HTTP 200.

### 4.7 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB・lỗi gửi email, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-004

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Refresh Token |
| Tổng quan | Xác minh session từ HTTP-only Cookie, trả về thông tin người dùng và gia hạn thời hạn session |
| URI | /api/v1/auth/refresh |
| Phương thức | POST |
| Request Body | Không có |
| Tham số request | |
| Header | Content-Type: application/json ※ Session ID được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Gia hạn session thành công, 401: Session không hợp lệ・hết hạn, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| - | (Không có) | - | - | - | - | - | Session ID được gửi qua HTTP-only Cookie |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Object | - | | - | |
| 2 | →user | Object | - | | - | Thông tin người dùng |
| 3 | →→account_id | Number | - | | - | ID tài khoản |
| 4 | →→login_id | String | - | | - | ID đăng nhập |
| 5 | →→account_name | String | - | | - | Tên tài khoản |
| 6 | →→role_id | Number | - | | - | ID vai trò |
| 7 | →→role_code | String | - | | - | Mã vai trò |
| 8 | →→role_name | String | - | | - | Tên vai trò |
| 9 | →→ja_id | Number | - | | 〇 | ID JA (Nichi-Nō là NULL) |
| 10 | →→kanri_shiten_id | Number | - | | 〇 | ID chi nhánh quản lý (chỉ JA Kanri-Shiten) |
| 11 | →→todofuken_code | String | - | | 〇 | Mã tỉnh/thành phố |
| 12 | →→paper_flg | Boolean | - | | - | Cờ xử lý phiên bản giấy |
| 13 | →→denshi_flg | Boolean | - | | - | Cờ xử lý phiên bản điện tử |
| 14 | →→email | String | - | | - | Địa chỉ email |
| 15 | →→permissions | Array | 〇 | | - | Danh sách mã quyền (permission_code trong m_permissions) |

※ Khi gia hạn session thành công, thời hạn Cookie session (Max-Age) được gia hạn thêm 24 giờ khớp với TTL Redis.

## Ví dụ request

```
POST /api/v1/auth/refresh
Cookie: session_id=550e8400-e29b-41d4-a716-446655440000
```

## Ví dụ response thành công

```json
{
  "data": {
    "user": {
      "account_id": 1,
      "login_id": "admin01",
      "account_name": "管理者太郎",
      "role_id": 1,
      "role_code": "NICHINO_ADMIN",
      "role_name": "日農（管理者）",
      "ja_id": null,
      "kanri_shiten_id": null,
      "todofuken_code": null,
      "paper_flg": false,
      "denshi_flg": false,
      "email": "admin@nichino.co.jp",
      "permissions": [
        "dokusya.create", "dokusya.view", "dokusya.update", "dokusya.delete",
        "dokusya.import", "dokusya.replace_hanbaiten",
        "hanbaiten.create", "hanbaiten.view", "hanbaiten.update", "hanbaiten.delete",
        "hanbaiten.import",
        "tanka.create", "tanka.view", "tanka.update", "tanka.delete",
        "account.create", "account.view", "account.update", "account.delete",
        "oshirase.create", "oshirase.view", "oshirase.update", "oshirase.delete",
        "log.view"
      ]
    }
  }
}
```

## Ví dụ response thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

> ※ Các xử lý dưới đây được thực hiện trong một transaction duy nhất (xử lý chính + ghi log thao tác).
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng ngoài transaction.

### 4.1 Validation request
- Lấy session ID từ HTTP-only Cookie và xác minh session tương ứng trong Redis.
- Nếu session ID không tồn tại hoặc không tìm thấy session trong Redis: HTTP 401 (`UNAUTHORIZED`)
- Nếu session đã hết hạn: HTTP 401 (`UNAUTHORIZED`)

### 4.2 Xác nhận tài khoản
- Lấy account_id từ session.
- Xác nhận sự tồn tại và tính hợp lệ của tài khoản:
```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.paper_flg, a.denshi_flg, a.email,
       r.role_code, r.role_name
FROM m_account a
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
  AND a.account_lock_flg = false
```
- Nếu không tìm thấy bản ghi hoặc tài khoản bị khóa: HTTP 401 (`UNAUTHORIZED`)
- Lấy danh sách mã quyền của tài khoản:
```sql
SELECT p.permission_code
FROM m_roles_permissions rp
INNER JOIN m_permissions p ON rp.permission_id = p.permission_id AND p.deleted_at IS NULL
WHERE rp.role_id = :role_id
  AND rp.deleted_at IS NULL
ORDER BY p.permission_id ASC
```

### 4.3 Tái phát hành token
- Tạo session mới và lưu vào Redis (TTL 24 giờ, key: session:{session_id}).
- Xoay vòng session ID và thiết lập lại dưới dạng HTTP-only Cookie (Secure + SameSite=Strict, hiệu lực 24 giờ).

### 4.4 Tạo response
- Trả về thông tin người dùng mới dưới dạng object `data`. HTTP 200.

### 4.5 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-005

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Logout |
| Tổng quan | Thực hiện đăng xuất, xóa session khỏi Redis và xóa session Cookie |
| URI | /api/v1/auth/logout |
| Phương thức | POST |
| Request Body | Không có |
| Tham số request | |
| Header | Content-Type: application/json ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Đăng xuất thành công, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| - | (Không có) | - | - | - | - | - | Session ID được gửi qua HTTP-only Cookie |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | message | String | - | | - | Thông báo kết quả xử lý |

## Ví dụ request

```
POST /api/v1/auth/logout
Cookie: session_id=550e8400-e29b-41d4-a716-446655440000
```

## Ví dụ response thành công

```json
{
  "message": "正常にログアウトしました"
}
```

## Ví dụ response thất bại

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

> ※ Các xử lý dưới đây được thực hiện trong một transaction duy nhất (xử lý chính + ghi log thao tác).
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng ngoài transaction.

### 4.1 Xóa session
- Xóa session khỏi Redis (DEL session:{session_id}).
- Xóa session Cookie qua response header (Max-Age=0).
- ※ Kể cả khi không có thông tin xác thực hoặc session đã không hợp lệ, vẫn hoàn tất đăng xuất bình thường (không báo lỗi).

### 4.2 Tạo response
- Trả về `message: "正常にログアウトしました"`. HTTP 200.

### 4.3 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-001-006

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Get Public Oshirase List |
| Tổng quan | Lấy danh sách thông báo công khai hiển thị trên màn hình đăng nhập (không cần xác thực) |
| URI | /api/v1/oshirase/public |
| Phương thức | GET |
| Request Body | Không có |
| Tham số request | Tham số query |
| Header | Content-Type: application/json |
| HTTP Response Code | 200: Lấy danh sách thông báo thành công, 400: Tham số request không hợp lệ, 500: Lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | publish_location | Number | - | - | | | Vị trí công khai (1: Màn hình đăng nhập, 2: Màn hình menu). Mặc định: 1 |
| 2 | limit | Number | - | - | | | Giới hạn số lượng lấy. Mặc định: 10, Tối đa: 10 |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Array | 〇 | | - | Danh sách thông báo |
| 2 | →oshirase_id | Number | - | | - | ID thông báo |
| 3 | →oshirase_type | Number | - | | - | Loại thông báo (1: Hệ thống, 2: Quan trọng, 3: Thông thường) |
| 4 | →oshirase_type_label | String | - | | - | Nhãn loại thông báo |
| 5 | →title | String | - | | - | Tiêu đề |
| 6 | →publish_start_date | String | - | YYYY-MM-DD | - | Ngày bắt đầu công khai |

## Ví dụ request

```
GET /api/v1/oshirase/public?publish_location=1&limit=10
```

## Ví dụ response thành công

```json
{
  "data": [
    {
      "oshirase_id": 1,
      "oshirase_type": 1,
      "oshirase_type_label": "システム",
      "title": "システムメンテナンスのお知らせ（4/20 22:00〜翌6:00）",
      "publish_start_date": "2026-04-10"
    },
    {
      "oshirase_id": 2,
      "oshirase_type": 3,
      "oshirase_type_label": "一般",
      "title": "新機能「購読者一括取込」リリースのお知らせ",
      "publish_start_date": "2026-04-05"
    }
  ]
}
```

### Trường hợp không có thông báo

```json
{
  "data": []
}
```

## Ví dụ response thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Quy trình xử lý

### 4.1 Validation request
- Kiểm tra tham số query:
  - publish_location: 1 (1: Màn hình đăng nhập, 2: Màn hình menu)
  - limit: Kiểu số, 1〜10. Mặc định: 10
- Nếu có tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực
- API này không cần xác thực (API công khai).

### 4.3 Thiết lập điều kiện lấy dữ liệu
- Lấy thông báo theo các điều kiện sau:
  - publish_location: 1 (1: Màn hình đăng nhập, 2: Màn hình menu)
  - Trạng thái = 2 (Đang công khai)
  - Ngày bắt đầu công khai <= Thời gian hiện tại
  - Ngày kết thúc công khai là NULL hoặc Ngày kết thúc công khai >= Thời gian hiện tại
  - Không phải gửi riêng cho JA (ja_id IS NULL = Gửi cho tất cả)

### 4.4 Lấy dữ liệu
```sql
SELECT oshirase_id, oshirase_type, title, publish_start_date
FROM t_oshirase
WHERE publish_location = :publish_location
  AND status = 2
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
  AND ja_id IS NULL
  AND deleted_at IS NULL
ORDER BY publish_start_date DESC
LIMIT :limit
```

### 4.5 Tạo response
- Format publish_start_date theo dạng YYYY-MM-DD.
- Trả về dưới dạng mảng `data`. HTTP 200.
- Nếu không có thông báo nào thì trả về mảng rỗng.

### 4.6 Xử lý ngoại lệ
- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
