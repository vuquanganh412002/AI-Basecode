---
customer_name: Tờ báo Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý người đăng ký phiên bản đám mây
document_name: Bản thiết kế API
screen_id: ACSMS-SCR-003
screen_name: Màn hình đăng ký giá đơn vị
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-09
created_date: 2026/04/06
created_by: Tran Duc Tuyen
updated_date: 2026/04/09
updated_by: Tran Duc Tuyen
---

## Lịch sử thay đổi

| No  | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm duyệt | Người phê duyệt |
| --- | ---------- | ---- | -------------- | ---------------------- | -------------- | -------------- |
| 1   | 2026/04/06 | 1.0  | Tran Duc Tuyen | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/04/09 | 1.1  | Tran Duc Tuyen | Chuẩn hóa mã lỗi | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là một hệ thống quản lý độc giả dựa trên đám mây cho JA,
cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản ngân hàng v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản ngân hàng, chức năng tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập,
ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục đích tài liệu

Tài liệu này mô tả chi tiết các API mới được tạo trên hệ thống cho "Màn hình đăng ký giá đơn vị (ACSMS-SCR-003)".

## Tài liệu liên quan

| No  | Mã tài liệu    | Tên tài liệu                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-002 | Bản thiết kế API Màn hình tìm kiếm chi tiết bảng giá chính |

## Danh sách lỗi

| #   | Loại lỗi | Mã lỗi          | Thông báo lỗi                                                       | Ghi chú     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung        | BAD_REQUEST           | Tham số yêu cầu không hợp lệ. | HTTP 400 |
| 2   | Chung        | UNAUTHORIZED          | Phiên hết hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 3   | Chung        | FORBIDDEN             | Không có quyền truy cập màn hình này. | HTTP 403 |
| 4   | Chung        | DATA_SCOPE_VIOLATION  | Không có quyền truy cập dữ liệu này. | HTTP 403 |
| 5   | Chung        | VALIDATION_ERROR      | Giá trị nhập không hợp lệ. Vui lòng kiểm tra trường errors. | HTTP 400 |
| 6   | Chung        | TOO_MANY_REQUESTS     | Số lượng yêu cầu đã vượt quá giới hạn. Vui lòng thử lại sau. | HTTP 429 |
| 7   | Chung        | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | HTTP 500 |
| 8   | Dành riêng cho màn hình | NOT_FOUND       | Không tìm thấy giá đơn vị được chỉ định. | HTTP 404 |
| 9   | Dành riêng cho màn hình | DUPLICATE_CODE        | Mã giá đơn vị giống nhau đã được đăng ký. | HTTP 400 |

---

# API ACSMS-API-003-001

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                  | Get Tanka Detail                                                                                                                                                                                       |
| Tổng quan                   | Lấy thông tin chi tiết của giá đơn vị được chỉ định (dùng cho chế độ chỉnh sửa)                                                                                                                                                           |
| URI                    | /api/v1/tanka/{tanka_id}                                                                                                                                                                               |
| Phương thức               | GET                                                                                                                                                                                                    |
| Nội dung yêu cầu     | Không có                                                                                                                                                                                                   |
| Tham số yêu cầu | tanka_id (tham số đường dẫn)                                                                                                                                                                             |
| Tiêu đề | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie                                                                                                                 |
| Mã phản hồi HTTP   | 200: Đã lấy thông tin chi tiết giá đơn vị thành công, 401: Phiên hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy giá đơn vị được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| #   | ID tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | tanka_id       | Number | -        | 〇   |        |        | tanka_id của đối tượng được lấy (tham số đường dẫn) |

## Dữ liệu phản hồi

| #   | ID mục             | Loại | Lặp lại | Định dạng | Nullable | Mô tả                     |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data               | Object | -        |              | -        |                          |
| 2   | →tanka_id          | Number | -        |              | -        | ID giá đơn vị                   |
| 3   | →ja_id             | Number | -        |              | -        | ID JA                    |
| 4   | →tanka_type        | Number | -        |              | -        | 1: Phí đăng ký, 2: Phí giao hàng |
| 5   | →tanka_type_label  | String | -        |              | -        | Nhãn của tanka_type       |
| 6   | →tanka_code        | String | -        |              | -        | Mã giá đơn vị               |
| 7   | →tanka_name        | String | -        |              | -        | Tên giá đơn vị                |
| 8   | →kingaku_zeikomi   | Number | -        |              | 〇       | Giá (tính thuế) (Yên)           |
| 9   | →kingaku_zeinuki   | Number | -        |              | 〇       | Giá (không tính thuế) (Yên)           |
| 10  | →tax_rate          | Number | -        | ##.##        | 〇       | Suất thuế (%)                |
| 11  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | Ngày bắt đầu áp dụng               |
| 12  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | Ngày kết thúc áp dụng               |
| 13  | →created_at        | String | -        | ISO8601      | -        | Ngày giờ tạo                 |
| 14  | →updated_at        | String | -        | ISO8601      | 〇       | Ngày giờ cập nhật                 |

## Ví dụ yêu cầu

```
GET /api/v1/tanka/1
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "tanka_id": 1,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_type_label": "Phí đăng ký tờ báo",
    "tanka_code": "T001",
    "tanka_name": "Phí đăng ký cơ bản (hàng tháng)",
    "kingaku_zeikomi": 4900,
    "kingaku_zeinuki": 4455,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-01-01",
    "tekiyo_end_date": null,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
  }
}
```

## Ví dụ phản hồi thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy giá đơn vị được chỉ định"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy trình xử lý

### 4.1 Xác thực yêu cầu

- Xác thực tham số đường dẫn:
  - tanka_id: Kiểm tra loại số, kiểm tra bắt buộc
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm tra xác thực và phân quyền

- Xác thực thông tin xác thực (Phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem có quyền `tanka.view` không.
  - Vai trò đích: CHUOKAI (Hội trung tâm), JA_HONTEN (Chi nhánh chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Nếu không có quyền: HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Lấy dữ liệu

- Lấy phạm vi của người dùng đăng nhập (ja_id).
- Lấy dữ liệu theo các điều kiện sau.

```sql
SELECT tanka_id, ja_id, tanka_type, tanka_code, tanka_name,
       kingaku_zeikomi, kingaku_zeinuki, tax_rate,
       tekiyo_start_date, tekiyo_end_date, created_at, updated_at
FROM m_tanka
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu không có bản ghi: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Tạo phản hồi

- Ánh xạ giá trị tanka_type thành nhãn (1 → Phí đăng ký tờ báo, 2 → Phí giao hàng)
- Trả về JSON chứa đối tượng data.

### 4.5 Xử lý ngoại lệ

- Nếu xảy ra lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-003-002

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                  | Create Tanka                                                                                                                                                                                                                               |
| Tổng quan                   | Đăng ký giá đơn vị mới                                                                                                                                                                                                                       |
| URI                    | /api/v1/tanka                                                                                                                                                                                                                              |
| Phương thức               | POST                                                                                                                                                                                                                                       |
| Nội dung yêu cầu     | JSON                                                                                                                                                                                                                                       |
| Tham số yêu cầu |                                                                                                                                                                                                                                            |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie                                                                                                                                                     |
| Mã phản hồi HTTP   | 201: Đã đăng ký giá đơn vị thành công, 400: Có lỗi trong nội dung nhập liệu, 401: Phiên hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 400: Mã giá đơn vị giống nhau đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| #   | ID tham số    | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                           |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------- |
| 1   | tanka_type        | Number | -        | 〇   |        |        | Loại giá đơn vị (1: Phí đăng ký, 2: Phí giao hàng)           |
| 2   | tanka_code        | String | -        | 〇   | 1      | 10     | Mã giá đơn vị                                     |
| 3   | tanka_name        | String | -        | 〇   | 1      | 100    | Tên giá đơn vị                                         |
| 4   | tax_rate          | Number | -        | -    |        |        | Suất thuế (%) 0～100, 2 chữ số thập phân. Mặc định: 0  |
| 5   | kingaku_zeikomi   | Number | -        | -    |        |        | Giá (tính thuế) (Yên) ≧0. Mặc định: 0                |
| 6   | kingaku_zeinuki   | Number | -        | -    |        |        | Giá (không tính thuế) (Yên) ≧0. Mặc định: 0                |
| 7   | tekiyo_start_date | String | -        | -    |        |        | Ngày bắt đầu áp dụng (YYYY-MM-DD). Nếu để trống sẽ là ngày hiện tại |
| 8   | tekiyo_end_date   | String | -        | -    |        |        | Ngày kết thúc áp dụng (YYYY-MM-DD). Nếu để trống sẽ không giới hạn   |

## Dữ liệu phản hồi

| #   | ID mục             | Loại | Lặp lại | Định dạng | Nullable | Mô tả                     |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data               | Object | -        |              | -        | Dữ liệu giá đơn vị đã đăng ký     |
| 2   | →tanka_id          | Number | -        |              | -        | ID giá đơn vị                   |
| 3   | →ja_id             | Number | -        |              | -        | ID JA                    |
| 4   | →tanka_type        | Number | -        |              | -        | 1: Phí đăng ký, 2: Phí giao hàng |
| 5   | →tanka_type_label  | String | -        |              | -        | Nhãn của tanka_type       |
| 6   | →tanka_code        | String | -        |              | -        | Mã giá đơn vị               |
| 7   | →tanka_name        | String | -        |              | -        | Tên giá đơn vị                |
| 8   | →kingaku_zeikomi   | Number | -        |              | 〇       | Giá (tính thuế) (Yên)           |
| 9   | →kingaku_zeinuki   | Number | -        |              | 〇       | Giá (không tính thuế) (Yên)           |
| 10  | →tax_rate          | Number | -        | ##.##        | 〇       | Suất thuế (%)                |
| 11  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | Ngày bắt đầu áp dụng               |
| 12  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | Ngày kết thúc áp dụng               |
| 13  | →created_at        | String | -        | ISO8601      | -        | Ngày giờ tạo                 |
| 14  | →updated_at        | String | -        | ISO8601      | 〇       | Ngày giờ cập nhật                 |

## Ví dụ yêu cầu

```json
POST /api/v1/tanka
Content-Type: application/json

{
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "Phí đăng ký cơ bản (hàng tháng)",
  "tax_rate": 10.0,
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null
}
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "tanka_id": 10,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_type_label": "Phí đăng ký tờ báo",
    "tanka_code": "T001",
    "tanka_name": "Phí đăng ký cơ bản (hàng tháng)",
    "kingaku_zeikomi": 4900,
    "kingaku_zeinuki": 4455,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-04-01",
    "tekiyo_end_date": null,
    "created_at": "2026-04-09T10:00:00Z",
    "updated_at": null
  }
}
```

## Ví dụ phản hồi thất bại

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ. Vui lòng kiểm tra trường errors",
  "errors": [
    { "field": "tanka_code", "message": "Mã giá đơn vị là bắt buộc" },
    { "field": "tanka_name", "message": "Tên giá đơn vị là bắt buộc" }
  ]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này"
}
```

### 400 Bad Request (Trùng lặp)

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "Mã giá đơn vị giống nhau đã được đăng ký"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy trình xử lý

> ※ Quy trình sau được thực hiện trong một giao dịch duy nhất (xử lý chính + ghi nhật ký hoạt động).
> Nếu bất kỳ quy trình nào thất bại, tất cả sẽ bị hoàn tác.
> Nhật ký lỗi trong xử lý ngoại lệ (log_type=3) được ghi lại riêng bên ngoài giao dịch.

### 4.1 Xác thực yêu cầu

- Xác thực nội dung yêu cầu:
  - tanka_type: Bắt buộc, 1 hoặc 2
  - tanka_code: Bắt buộc, tối đa 10 chữ số
  - tanka_name: Bắt buộc, tối đa 100 chữ số
  - tax_rate: 0～100, 2 chữ số thập phân
  - kingaku_zeikomi: ≧ 0, số
  - kingaku_zeinuki: ≧ 0, số
  - tekiyo_start_date: Định dạng ngày hợp lệ (YYYY-MM-DD), không thể chọn ngày quá khứ khi đăng ký mới
- Nếu lỗi xác thực: HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm tra xác thực và phân quyền
- Xác thực thông tin xác thực (Phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem có quyền `tanka.create` không.
  - Vai trò đích: CHUOKAI (Hội trung tâm), JA_HONTEN (Chi nhánh chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)

### 4.3 Kiểm tra trùng lặp

- Lấy phạm vi của người dùng đăng nhập (ja_id).
- Xác nhận trùng lặp theo các điều kiện sau.

```sql
SELECT COUNT(*) FROM m_tanka
WHERE tanka_code = :tanka_code
  AND deleted_at IS NULL
```

- Nếu có trùng lặp: HTTP 400 (`DUPLICATE_CODE`)

### 4.4 Đăng ký dữ liệu

- Nếu tekiyo_start_date để trống, hãy đặt CURRENT_DATE.
- Thực hiện SQL sau để đăng ký.

```sql
INSERT INTO m_tanka (ja_id, tanka_type, tanka_code, tanka_name,
                     kingaku_zeikomi, kingaku_zeinuki, tax_rate,
                     tekiyo_start_date, tekiyo_end_date,
                     created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :tanka_type, :tanka_code, :tanka_name,
        :kingaku_zeikomi, :kingaku_zeinuki, :tax_rate,
        :tekiyo_start_date, :tekiyo_end_date,
        NOW(), :user_account_id, NOW(), :user_account_id)
RETURNING *
```

### 4.5 Ghi nhật ký hoạt động

- Thực hiện SQL sau để ghi nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình đăng ký giá đơn vị (ACSMS-SCR-003)', 'CREATE', 1,
        :tanka_id, 'm_tanka',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ after_value:**

```json
`before_value`: Đặt chuỗi trống cho INSERT.
`after_value`: Lưu trữ dữ liệu đã đăng ký ở định dạng JSON. Không bao gồm thông tin nhạy cảm như mật khẩu.

{
  "tanka_id": 10,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "Phí đăng ký cơ bản (hàng tháng)",
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null
}
```

### 4.6 Tạo phản hồi

- Trả về dữ liệu đã đăng ký làm đối tượng data. HTTP 201.

### 4.7 Xử lý ngoại lệ

- Nếu xảy ra lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ghi nhật ký lỗi ngay cả khi xảy ra lỗi (log_type = 3).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình đăng ký giá đơn vị (ACSMS-SCR-003)', 'CREATE', 2,
        NULL, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-003-003

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Update Tanka                                                                                                                                                                                                                       |
| Tổng quan                   | Cập nhật giá đơn vị được chỉ định                                                                                                                                                                                                                             |
| URI                    | /api/v1/tanka/{tanka_id}                                                                                                                                                                                                           |
| Phương thức               | PUT                                                                                                                                                                                                                                |
| Nội dung yêu cầu     | JSON                                                                                                                                                                                                                                |
| Tham số yêu cầu | tanka_id (tham số đường dẫn)                                                                                                                                                                                                         |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie                                                                                                                                             |
| Mã phản hồi HTTP   | 200: Đã cập nhật giá đơn vị thành công, 400: Có lỗi trong nội dung nhập liệu, 401: Phiên hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy giá đơn vị được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| #   | ID tham số    | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                  |
| --- | ----------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | tanka_id          | Number | -        | 〇   |        |        | tanka_id của đối tượng được cập nhật (tham số đường dẫn) |
| 2   | tanka_type        | Number | -        | 〇   |        |        | Loại giá đơn vị (1: Phí đăng ký, 2: Phí giao hàng)  |
| 3   | tanka_name        | String | -        | 〇   | 1      | 100    | Tên giá đơn vị                                |
| 4   | tax_rate          | Number | -        | -    |        |        | Suất thuế (%)                             |
| 5   | kingaku_zeikomi   | Number | -        | -    |        |        | Giá (tính thuế) (Yên)                        |
| 6   | kingaku_zeinuki   | Number | -        | -    |        |        | Giá (không tính thuế) (Yên)                        |
| 7   | tekiyo_start_date | String | -        | -    |        |        | Ngày bắt đầu áp dụng (YYYY-MM-DD)              |
| 8   | tekiyo_end_date   | String | -        | -    |        |        | Ngày kết thúc áp dụng (YYYY-MM-DD)              |

※ tanka_code không thể cập nhật (bị disabled ở phía màn hình). Không bao gồm trong yêu cầu.

## Dữ liệu phản hồi

| #   | ID mục             | Loại | Lặp lại | Định dạng | Nullable | Mô tả                                |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ----------------------------------- |
| 1   | data               | Object | -        |              | -        | Dữ liệu giá đơn vị đã cập nhật                |
| 2   | →tanka_id          | Number | -        |              | -        | ID giá đơn vị                              |
| 3   | →ja_id             | Number | -        |              | -        | ID JA                               |
| 4   | →tanka_type        | Number | -        |              | -        | 1: Phí đăng ký, 2: Phí giao hàng            |
| 5   | →tanka_type_label  | String | -        |              | -        | Nhãn của tanka_type                  |
| 6   | →tanka_code        | String | -        |              | -        | Mã giá đơn vị, vui lòng không chỉnh sửa. |
| 7   | →tanka_name        | String | -        |              | -        | Tên giá đơn vị                                |
| 8   | →kingaku_zeikomi   | Number | -        |              | 〇       | Giá (tính thuế) (Yên)                      |
| 9   | →kingaku_zeinuki   | Number | -        |              | 〇       | Giá (không tính thuế) (Yên)                      |
| 10  | →tax_rate          | Number | -        | ##.##        | 〇       | Suất thuế (%)                            |
| 11  | →tekiyo_start_date | String | -        | YYYY-MM-DD   | 〇       | Ngày bắt đầu áp dụng                          |
| 12  | →tekiyo_end_date   | String | -        | YYYY-MM-DD   | 〇       | Ngày kết thúc áp dụng                          |
| 13  | →created_at        | String | -        | ISO8601      | -        | Ngày giờ tạo                         |
| 14  | →updated_at        | String | -        | ISO8601      | 〇       | Ngày giờ cập nhật                         |

## Ví dụ yêu cầu

```json
PUT /api/v1/tanka/1
Content-Type: application/json

{
  "tanka_type": 1,
  "tanka_name": "Phí đăng ký cơ bản (hàng tháng) (sửa đổi)",
  "tax_rate": 10.0,
  "kingaku_zeikomi": 5200,
  "kingaku_zeinuki": 4727,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null
}
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "tanka_id": 1,
    "ja_id": 1,
    "tanka_type": 1,
    "tanka_type_label": "Phí đăng ký tờ báo",
    "tanka_code": "T001",
    "tanka_name": "Phí đăng ký cơ bản (hàng tháng) (sửa đổi)",
    "kingaku_zeikomi": 5200,
    "kingaku_zeinuki": 4727,
    "tax_rate": 10.0,
    "tekiyo_start_date": "2026-04-01",
    "tekiyo_end_date": null,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-09T14:30:00Z"
  }
}
```

## Ví dụ phản hồi thất bại

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ. Vui lòng kiểm tra trường errors",
  "errors": [{ "field": "tanka_name", "message": "Tên giá đơn vị là bắt buộc" }]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy giá đơn vị được chỉ định"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy trình xử lý

> ※ Quy trình sau được thực hiện trong một giao dịch duy nhất (xử lý chính + ghi nhật ký hoạt động).
> Nếu bất kỳ quy trình nào thất bại, tất cả sẽ bị hoàn tác.
> Nhật ký lỗi trong xử lý ngoại lệ (log_type=3) được ghi lại riêng bên ngoài giao dịch.

### 4.1 Xác thực yêu cầu

- Tham số đường dẫn: tanka_id Kiểm tra loại số, bắt buộc
- Nội dung yêu cầu:
  - tanka_type: Bắt buộc, 1 hoặc 2
  - tanka_name: Bắt buộc, tối đa 100 chữ số
  - tax_rate: 0～100, 2 chữ số thập phân
  - kingaku_zeikomi: ≧ 0, số
  - kingaku_zeinuki: ≧ 0, số
  - tekiyo_start_date: Định dạng ngày hợp lệ. Không thể thay đổi nếu là ngày quá khứ
- Nếu lỗi xác thực: HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm tra xác thực và phân quyền
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem có quyền `tanka.update` không.
  - Vai trò đích: CHUOKAI (Hội trung tâm), JA_HONTEN (Chi nhánh chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)

### 4.3 Xác nhận bản ghi đích tồn tại

- Lấy phạm vi của người dùng đăng nhập (ja_id).

```sql
SELECT * FROM m_tanka
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Cập nhật dữ liệu

```sql
UPDATE m_tanka
SET tanka_type = :tanka_type,
    tanka_name = :tanka_name,
    kingaku_zeikomi = :kingaku_zeikomi,
    kingaku_zeinuki = :kingaku_zeinuki,
    tax_rate = :tax_rate,
    tekiyo_start_date = :tekiyo_start_date,
    tekiyo_end_date = :tekiyo_end_date,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi nhật ký hoạt động

- Lấy dữ liệu trước khi cập nhật (kết quả SELECT từ 4.3), lưu vào `before_value`.
- Thực hiện SQL sau để ghi nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình đăng ký giá đơn vị (ACSMS-SCR-003)', 'UPDATE', 1,
        :tanka_id, 'm_tanka',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ before_value:**

```json
`before_value`: Lưu trữ dữ liệu trước khi cập nhật ở định dạng JSON. Không bao gồm thông tin nhạy cảm như mật khẩu.

{
  "tanka_id": 1,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "Phí đăng ký cơ bản (hàng tháng)",
  "kingaku_zeikomi": 4900,
  "kingaku_zeinuki": 4455,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-01-01",
  "tekiyo_end_date": null
}
```

**Ví dụ after_value:**

```json
`after_value`: Lưu trữ dữ liệu sau khi cập nhật ở định dạng JSON. Không bao gồm thông tin nhạy cảm như mật khẩu.

{
  "tanka_id": 1,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T001",
  "tanka_name": "Phí đăng ký cơ bản (hàng tháng) (sửa đổi)",
  "kingaku_zeikomi": 5200,
  "kingaku_zeinuki": 4727,
  "tax_rate": 10.0,
  "tekiyo_start_date": "2026-04-01",
  "tekiyo_end_date": null
}
```

### 4.6 Tạo phản hồi

- Trả về dữ liệu đã cập nhật làm đối tượng data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Nếu xảy ra lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ghi nhật ký lỗi ngay cả khi xảy ra lỗi (log_type = 3).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình đăng ký giá đơn vị (ACSMS-SCR-003)', 'UPDATE', 2,
        :tanka_id, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
