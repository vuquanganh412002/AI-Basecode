---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: ACSMS-SCR-007
screen_name: Màn hình Đăng ký Chi nhánh Master
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Dao Van Thang
updated_date: 2026/04/14
updated_by: Dao Van Thang
---

## Lịch sử thay đổi

| Số  | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Dao Van Thang | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan Hệ thống

Hệ thống này là một hệ thống quản lý thuê bao đám mây cho JA, cung cấp các chức năng như
quản lý thông tin thuê bao, quản lý lịch sử thuê bao, quản lý dữ liệu chuyển khoản tài khoản, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin thuê bao,
quản lý lịch sử thay đổi nội dung thuê bao, tạo và quản lý dữ liệu chuyển khoản tài khoản, 
chức năng tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng,
ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục đích Tài liệu

Tài liệu này mô tả chi tiết về API mới được tạo trên Hệ thống cho "Màn hình Đăng ký Chi nhánh Master (ACSMS-SCR-007)".

## Tài liệu Liên quan

| Số  | Mã Tài liệu | Tên Tài liệu |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-006 | Tài liệu Thiết kế API - Màn hình Tìm kiếm Chi tiết Chi nhánh Master |

※ Danh sách thả xuống Chi nhánh Quản lý của Màn hình này sử dụng API Chung sau đây.
- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — Định nghĩa lần đầu: ACSMS-SCR-024

## Danh sách Lỗi

| #   | Loại Lỗi | Mã Lỗi | Thông báo Lỗi | Ghi chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST           | Tham số yêu cầu không hợp lệ। | HTTP 400 |
| 2   | Chung | UNAUTHORIZED          | Phiên làm việc đã hết। Vui lòng đăng nhập lại। | HTTP 401 |
| 3   | Chung | FORBIDDEN             | Bạn không có quyền truy cập màn hình này। | HTTP 403 |
| 4   | Chung | DATA_SCOPE_VIOLATION  | Bạn không có quyền truy cập dữ liệu này। | HTTP 403 |
| 5   | Chung | VALIDATION_ERROR      | Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết। | HTTP 400 |
| 6   | Chung | TOO_MANY_REQUESTS     | Số lượng yêu cầu vượt quá giới hạn। Vui lòng thử lại sau một lúc। | HTTP 429 |
| 7   | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống। Vui lòng thử lại sau một lúc। | HTTP 500 |
| 8   | Dành riêng cho Màn hình | NOT_FOUND      | Không tìm thấy Chi nhánh được chỉ định। | HTTP 404 |
| 9   | Dành riêng cho Màn hình | DUPLICATE_CODE        | Mã Chi nhánh giống nhau đã được đăng ký। | HTTP 400 |

---

# API ACSMS-API-007-001

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Get Shiten Detail (Lấy Chi tiết Chi nhánh) |
| Tổng quan | Lấy chi tiết của Chi nhánh được chỉ định (cho Chế độ Chỉnh sửa) |
| URI | /api/v1/shiten/{shiten_id} |
| Phương thức | GET |
| Phần thân Yêu cầu | Không có |
| Tham số Yêu cầu | shiten_id (Tham số Đường dẫn) |
| Tiêu đề | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 200: Đã lấy thành công chi tiết Chi nhánh, 401: Phiên làm việc đã hết। Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy Chi nhánh được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id      | Số | - | 〇 | | | shiten_id cần Lấy (Tham số Đường dẫn) |

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data | Đối tượng | - | | - | |
| 2   | →shiten_id | Số | - | | - | ID Chi nhánh |
| 3   | →ja_id | Số | - | | - | ID JA |
| 4   | →shiten_code | Chuỗi | - | | - | Mã Chi nhánh |
| 5   | →shiten_name | Chuỗi | - | | - | Tên Chi nhánh |
| 6   | →shiten_name_kana | Chuỗi | - | | - | Tên Chi nhánh (Kana) |
| 7   | →kinyu_shiten_flg | Logic | - | | - | Cờ Chi nhánh Tổ chức Tài chính |
| 8   | →kanri_shiten_id | Số | - | | - | ID Chi nhánh Quản lý |
| 9   | →created_at | Chuỗi | - | ISO8601 | - | Thời gian Tạo |
| 10  | →updated_at | Chuỗi | - | ISO8601 | 〇 | Thời gian Cập nhật |

## Ví dụ Yêu cầu

```
GET /api/v1/shiten/1
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "shiten_id": 1,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "Phòng Kinh doanh Cửa hàng Chính",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
  }
}
```

## Ví dụ Phản hồi Thất bại

### 401 Không được phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết। Vui lòng đăng nhập lại"
}
```

### 403 Bị cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 404 Không tìm thấy

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy Chi nhánh được chỉ định"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống। Vui lòng thử lại sau một lúc"
}
```

## Quy trình Xử lý

### 4.1 Xác thực Yêu cầu

- Xác thực Tham số Đường dẫn:
  - shiten_id: Kiểm tra Loại Số, Kiểm tra Bắt buộc
- Nếu tồn tại Tham số Không hợp lệ:
  - Trả về HTTP 400 Bad Request।

### 4.2 Kiểm tra Xác thực và Phê duyệt

- Xác thực Thông tin Xác thực (Phiên HTTP-only Cookie).
- Nếu Xác thực Thất bại: HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra Quyền hạn: Xác nhận rằng nắm giữ `shiten.view`.
  - Vai trò Mục tiêu: CHUOKAI (Trung ương), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh Quản lý JA)
- Nếu Không có Quyền hạn: HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Lấy Dữ liệu

- Lấy Phạm vi của Người dùng Đã đăng nhập (ja_id).
- Lấy Dữ liệu với các Điều kiện sau:

```sql
SELECT shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
       kinyu_shiten_flg, kanri_shiten_id, created_at, updated_at
FROM m_shiten
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu Bản ghi Không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id Không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Tạo Phản hồi

- Trả về JSON chứa Đối tượng data.

### 4.5 Xử lý Ngoại lệ

- Trong trường hợp Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-007-002

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Create Shiten (Tạo Chi nhánh) |
| Tổng quan | Đăng ký Chi nhánh Mới |
| URI | /api/v1/shiten |
| Phương thức | POST |
| Phần thân Yêu cầu | JSON |
| Tham số Yêu cầu | |
| Tiêu đề | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 201: Đã đăng ký Chi nhánh thành công, 400: Nội dung nhập liệu có Lỗi, 401: Phiên làm việc đã hết। Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 400: Mã Chi nhánh giống nhau đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | shiten_code | Chuỗi | - | 〇 | 1 | 3 | Mã Chi nhánh |
| 2   | shiten_name | Chuỗi | - | 〇 | 1 | 100 | Tên Chi nhánh |
| 3   | shiten_name_kana | Chuỗi | - | - | | 100 | Tên Chi nhánh (Kana) |
| 4   | kanri_shiten_id | Số | - | 〇 | | | ID Chi nhánh Quản lý (Giá trị Lựa chọn Thả xuống) |
| 5   | kinyu_shiten_flg | Logic | - | - | | | Cờ Chi nhánh Tổ chức Tài chính |

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data | Đối tượng | - | | - | Dữ liệu Chi nhánh Đã đăng ký |
| 2   | →shiten_id | Số | - | | - | ID Chi nhánh |
| 3   | →ja_id | Số | - | | - | ID JA |
| 4   | →shiten_code | Chuỗi | - | | - | Mã Chi nhánh |
| 5   | →shiten_name | Chuỗi | - | | - | Tên Chi nhánh |
| 6   | →shiten_name_kana | Chuỗi | - | | - | Tên Chi nhánh (Kana) |
| 7   | →kinyu_shiten_flg | Logic | - | | - | Cờ Chi nhánh Tổ chức Tài chính |
| 8   | →kanri_shiten_id | Số | - | | - | ID Chi nhánh Quản lý |
| 9   | →created_at | Chuỗi | - | ISO8601 | - | Thời gian Tạo |
| 10  | →updated_at | Chuỗi | - | ISO8601 | 〇 | Thời gian Cập nhật |

## Ví dụ Yêu cầu

```json
POST /api/v1/shiten
Content-Type: application/json

{
  "shiten_code": "S01",
  "shiten_name": "Phòng Kinh doanh Cửa hàng Chính",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id": 1,
  "kinyu_shiten_flg": false
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "shiten_id": 10,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "Phòng Kinh doanh Cửa hàng Chính",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-04-14T10:00:00Z",
    "updated_at": null
  }
}
```

## Ví dụ Phản hồi Thất bại

### 400 Yêu cầu Không hợp lệ

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết",
  "errors": [
    { "field": "shiten_code", "message": "Mã Chi nhánh là bắt buộc" },
    { "field": "shiten_name", "message": "Tên Chi nhánh là bắt buộc" }
  ]
}
```

### 401 Không được phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết। Vui lòng đăng nhập lại"
}
```

### 403 Bị cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 400 Yêu cầu Không hợp lệ (Trùng lặp)

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "Mã Chi nhánh giống nhau đã được đăng ký"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống। Vui lòng thử lại sau một lúc"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực hiện trong một Giao dịch Duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động).
> Nếu một trong hai Thất bại, Hãy Quay lại Toàn bộ.
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Tách rời ngoài Giao dịch.

### 4.1 Xác thực Yêu cầu

- Xác thực Phần thân Yêu cầu:
  - shiten_code: Bắt buộc, Tối đa 3 Chữ số
  - shiten_name: Bắt buộc, Tối đa 100 Chữ số
  - shiten_name_kana: Tùy chọn, Tối đa 100 Chữ số
  - kanri_shiten_id: Bắt buộc, Kiểm tra Loại Số
  - kinyu_shiten_flg: Tùy chọn
- Nếu có Lỗi Xác thực: HTTP 400 (`VALIDATION_ERROR`) + Mảng lỗi


- Xác thực Thông tin Xác thực (Phiên HTTP-only Cookie).
- Nếu Xác thực Thất bại: HTTP 401 (`UNAUTHORIZED`)
  - Vai trò Mục tiêu: CHUOKAI (Trung ương), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh Quản lý JA)
- Nếu Không có Quyền hạn: HTTP 403 (`FORBIDDEN`)

### 4.3 Kiểm tra Trùng lặp

- Lấy Phạm vi của Người dùng Đã đăng nhập (ja_id).
- Xác nhận Trùng lặp với các Điều kiện sau:

```sql
SELECT COUNT(*) FROM m_shiten
WHERE ja_id = :ja_id
  AND shiten_code = :shiten_code
  AND deleted_at IS NULL
```

- Nếu có Trùng lặp: HTTP 400 (`DUPLICATE_CODE`)

### 4.4 Đăng ký Dữ liệu

- kinyu_shiten_flg được Lấy từ Yêu cầu (Nếu không Cung cấp, Sử dụng Giá trị Mặc định false).
- Thực thi SQL sau để Đăng ký:

```sql
INSERT INTO m_shiten (ja_id, shiten_code, shiten_name, shiten_name_kana,
                      kinyu_shiten_flg, kanri_shiten_id,
                      created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :shiten_code, :shiten_name, :shiten_name_kana,
        :kinyu_shiten_flg, :kanri_shiten_id,
        NOW(), :user_account_id, NOW(), :user_account_id)
RETURNING *
```

### 4.5 Ghi lại Nhật ký Hoạt động

- Thực thi SQL sau để Ghi lại Nhật ký Hoạt động:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình Đăng ký Chi nhánh Master (ACSMS-SCR-007)', 'CREATE', 1,
        :shiten_id, 'm_shiten',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ after_value:**

```json
`before_value`: Đặt Chuỗi Trống cho INSERT.
`after_value`: Lưu trữ Dữ liệu Được đăng ký ở Định dạng JSON. Không Bao gồm Thông tin Nhạy cảm như Mật khẩu.

{
  "shiten_id": 10,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "Phòng Kinh doanh Cửa hàng Chính",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

### 4.6 Tạo Phản hồi

- Trả về Dữ liệu Được đăng ký dưới dạng Đối tượng data. HTTP 201.

### 4.7 Xử lý Ngoại lệ

- Trong trường hợp Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Cũng Ghi lại Nhật ký Hoạt động khi Xảy ra Lỗi (`log_type = 3`).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình Đăng ký Chi nhánh Master (ACSMS-SCR-007)', 'CREATE', 2,
        NULL, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-007-003

## Tổng quan

| Mục | Nội dung |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Update Shiten (Cập nhật Chi nhánh) |
| Tổng quan | Cập nhật Chi nhánh Được chỉ định |
| URI | /api/v1/shiten/{shiten_id} |
| Phương thức | PUT |
| Phần thân Yêu cầu | JSON |
| Tham số Yêu cầu | shiten_id (Tham số Đường dẫn) |
| Tiêu đề | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 200: Đã cập nhật Chi nhánh thành công, 400: Nội dung nhập liệu có Lỗi, 401: Phiên làm việc đã hết। Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy Chi nhánh được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id | Số | - | 〇 | | | shiten_id Cần Cập nhật (Tham số Đường dẫn) |
| 2   | shiten_name | Chuỗi | - | 〇 | 1 | 100 | Tên Chi nhánh |
| 3   | shiten_name_kana | Chuỗi | - | - | | 100 | Tên Chi nhánh (Kana) |
| 4   | kinyu_shiten_flg | Logic | - | - | | | Cờ Chi nhánh Tổ chức Tài chính |
※ shiten_code Không thể Cập nhật (Bị tắt ở Phía Màn hình)। Không Bao gồm trong Yêu cầu.

## Dữ liệu Phản hồi

| #   | ID Mục | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả |
| --- | ------------------- | ------- | -------- | ------------ | -------- | -------------------- |
| 1   | data | Đối tượng | - | | - | Dữ liệu Chi nhánh Đã cập nhật |
| 2   | →shiten_id | Số | - | | - | ID Chi nhánh |
| 3   | →ja_id | Số | - | | - | ID JA |
| 4   | →shiten_code | Chuỗi | - | | - | Mã Chi nhánh |
| 5   | →shiten_name | Chuỗi | - | | - | Tên Chi nhánh |
| 6   | →shiten_name_kana | Chuỗi | - | | - | Tên Chi nhánh (Kana) |
| 7   | →kinyu_shiten_flg | Logic | - | | - | Cờ Chi nhánh Tổ chức Tài chính |
| 8   | →kanri_shiten_id | Số | - | | - | ID Chi nhánh Quản lý |
| 9   | →created_at | Chuỗi | - | ISO8601 | - | Thời gian Tạo |
| 10  | →updated_at | Chuỗi | - | ISO8601 | 〇 | Thời gian Cập nhật |

## Ví dụ Yêu cầu

```json
PUT /api/v1/shiten/1
Content-Type: application/json

{
  "shiten_name": "Phòng Kinh doanh Cửa hàng Chính (Tên Thay đổi)",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kanri_shiten_id": 1,
  "kinyu_shiten_flg": true
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "shiten_id": 1,
    "ja_id": 1,
    "shiten_code": "S01",
    "shiten_name": "Phòng Kinh doanh Cửa hàng Chính (Tên Thay đổi)",
    "shiten_name_kana": "ホンテンエイギョウブ",
    "kinyu_shiten_flg": false,
    "kanri_shiten_id": 1,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-14T14:30:00Z"
  }
}
```

## Ví dụ Phản hồi Thất bại

### 400 Yêu cầu Không hợp lệ

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ। Vui lòng kiểm tra trường Lỗi để biết chi tiết",
  "errors": [{ "field": "shiten_name", "message": "Tên Chi nhánh là bắt buộc" }]
}
```

### 401 Không được phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết। Vui lòng đăng nhập lại"
}
```

### 403 Bị cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 404 Không tìm thấy

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy Chi nhánh được chỉ định"
}
```

### 500 Lỗi Máy chủ Nội bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống। Vui lòng thử lại sau một lúc"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực hiện trong một Giao dịch Duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động).
> Nếu một trong hai Thất bại, Hãy Quay lại Toàn bộ.
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Tách rời ngoài Giao dịch.

### 4.1 Xác thực Yêu cầu

- Tham số Đường dẫn: shiten_id Kiểm tra Loại Số, Bắt buộc
- Phần thân Yêu cầu:
  - shiten_name: Bắt buộc, Tối đa 100 Chữ số
  - shiten_name_kana: Tùy chọn, Tối đa 100 Chữ số
- Nếu có Lỗi Xác thực: HTTP 400 (`VALIDATION_ERROR`) + Mảng lỗi

### 4.2 Kiểm tra Xác thực và Phê duyệt

- Xác thực Thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra Quyền hạn: Xác nhận rằng nắm giữ `shiten.update`.
  - Vai trò Mục tiêu: CHUOKAI (Trung ương), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh Quản lý JA)
- Hạn chế Cấp độ Trường: Lọc các Trường có thể Chỉnh sửa theo Vai trò.
  - CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN: Chỉ có thể Cập nhật shiten_name, shiten_name_kana, kinyu_shiten_flg

### 4.3 Xác nhận Sự tồn tại của Bản ghi Mục tiêu

- Lấy Phạm vi của Người dùng Đã đăng nhập (ja_id).

```sql
SELECT * FROM m_shiten
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu Bản ghi Không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id Không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Cập nhật Dữ liệu

```sql
UPDATE m_shiten
SET shiten_name = :shiten_name,
    shiten_name_kana = :shiten_name_kana,
    kinyu_shiten_flg = :kinyu_shiten_flg,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi lại Nhật ký Hoạt động

- Lấy Dữ liệu trước Cập nhật (Kết quả SELECT từ 4.3), Lưu trữ trong `before_value`.
- Thực thi SQL sau để Ghi lại Nhật ký Hoạt động:

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình Đăng ký Chi nhánh Master (ACSMS-SCR-007)', 'UPDATE', 1,
        :shiten_id, 'm_shiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ before_value:**

```json
`before_value`: Lưu trữ Dữ liệu trước Cập nhật ở Định dạng JSON. Không Bao gồm Thông tin Nhạy cảm như Mật khẩu.

{
  "shiten_id": 1,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "Phòng Kinh doanh Cửa hàng Chính",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

**Ví dụ after_value:**

```json
`after_value`: Lưu trữ Dữ liệu sau Cập nhật ở Định dạng JSON. Không Bao gồm Thông tin Nhạy cảm như Mật khẩu.

{
  "shiten_id": 1,
  "ja_id": 1,
  "shiten_code": "S01",
  "shiten_name": "Phòng Kinh doanh Cửa hàng Chính (Tên Thay đổi)",
  "shiten_name_kana": "ホンテンエイギョウブ",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

### 4.6 Tạo Phản hồi

- Trả về Dữ liệu Đã cập nhật dưới dạng Đối tượng data. HTTP 200.

### 4.7 Xử lý Ngoại lệ

- Trong trường hợp Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Cũng Ghi lại Nhật ký Hoạt động khi Xảy ra Lỗi (`log_type = 3`).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình Đăng ký Chi nhánh Master (ACSMS-SCR-007)', 'UPDATE', 2,
        :shiten_id, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
