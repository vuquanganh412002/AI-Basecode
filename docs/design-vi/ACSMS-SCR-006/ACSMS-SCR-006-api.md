---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: ACSMS-SCR-006
screen_name: Màn hình Tìm kiếm Chi tiết Branch Master
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

Hệ thống này là một hệ thống quản lý thuê bao dạng đám mây dành cho JA,
cung cấp các chức năng như quản lý thông tin thuê bao, quản lý lịch sử thuê bao, quản lý dữ liệu chuyển khoản tài khoản, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật, tìm kiếm thông tin thuê bao,
quản lý lịch sử thay đổi nội dung thuê bao, tạo và quản lý dữ liệu chuyển khoản tài khoản, tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập,
ghi lại nhật ký hoạt động của người dùng và các chức năng bảo mật cũng như kiểm toán.

## Mục đích Tài liệu

Tài liệu mô tả chi tiết các API mới được tạo trong hệ thống cho "Màn hình Tìm kiếm Chi tiết Branch Master（ACSMS-SCR-006）".

## Tài liệu Liên quan

| Số  | Mã Tài liệu    | Tên Tài liệu                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-007 | Tài liệu Thiết kế API Màn hình Đăng ký Branch Master     |

## Danh sách Lỗi

| #   | Loại Lỗi | Mã Lỗi          | Thông báo Lỗi                                                       | Ghi chú     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung       | BAD_REQUEST           | Tham số Yêu cầu không hợp lệ।                                       | HTTP 400 |
| 2   | Chung       | UNAUTHORIZED          | Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại।                     | HTTP 401 |
| 3   | Chung       | FORBIDDEN             | Không có Quyền truy cập Màn hình này।                                 | HTTP 403 |
| 4   | Chung       | DATA_SCOPE_VIOLATION  | Không có Quyền truy cập Dữ liệu này।                               | HTTP 403 |
| 5   | Chung       | VALIDATION_ERROR      | Giá trị Nhập không hợp lệ।Chi tiết Xem Trường errors।           | HTTP 400 |
| 6   | Chung       | TOO_MANY_REQUESTS     | Số Lượng Yêu cầu Vượt quá Giới hạn।Vui lòng Thử lại Sau।             | HTTP 429 |
| 7   | Chung       | INTERNAL_SERVER_ERROR | Đã xảy ra Lỗi Hệ thống।Vui lòng Thử lại Sau।     | HTTP 500 |
| 8   | Cụ thể Màn hình     | NOT_FOUND      | Branch được chỉ định không Tìm thấy।                                       | HTTP 404 |
| 9   | Cụ thể Màn hình     | CONFLICT      | Dữ liệu Liên quan Tồn tại, không thể Xóa।                               | HTTP 409 |

---

# API ACSMS-API-006-001

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                  | Lấy Danh sách Branch                                                                                                                                                                                        |
| Tổng quan                   | Lấy Danh sách Branch (Hỗ trợ Tìm kiếm، Phân trang، Sắp xếp)                                                                                                                                             |
| URI                    | /api/v1/shiten                                                                                                                                                                                         |
| Phương pháp               | GET                                                                                                                                                                                                    |
| Thân Yêu cầu     | Không                                                                                                                                                                                                   |
| Tham số Yêu cầu | ?shiten_name={shiten_name}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order}                                                                                                   |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                                                                 |
| Mã Phản hồi HTTP   | 200:Lấy Danh sách Branch Thành công, 400:Tham số Yêu cầu không hợp lệ, 401:Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại, 403:Không có Quyền truy cập Màn hình này, 500:Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                                                               |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------- |
| 1   | shiten_name    | Chuỗi | -        | -    |        | 100    | Tên Branch (Tìm kiếm Khớp Một phần)                                                                             |
| 2   | page           | Số | -        | -    |        |        | Số Trang (Mặc định: 1)                                                        |
| 3   | per_page       | Số | -        | -    |        |        | Số Bản ghi Mỗi Trang (Mặc định: 20, Tối đa: 100)                                         |
| 4   | sort_by        | Chuỗi | -        | -    |        |        | Mục Sắp xếp (shiten_code, shiten_name. Mặc định: shiten_code)                    |
| 5   | sort_order     | Chuỗi | -        | -    |        |        | Hướng Sắp xếp (asc / desc. Mặc định: asc)                                          |

## Dữ liệu Phản hồi

| #   | ID Mục              | Loại  | Lặp lại | Định dạng | Nullable | Mô tả                                     |
| --- | ------------------- | ------- | -------- | ------------ | -------- | ---------------------------------------- |
| 1   | data                | Mảng   | ○       |              | -        | Danh sách Branch                                 |
| 2   | →shiten_id          | Số  | -        |              | -        | ID Branch                                   |
| 3   | →ja_id              | Số  | -        |              | -        | ID JA                                    |
| 4   | →shiten_code        | Chuỗi  | -        |              | -        | Mã Branch                               |
| 5   | →shiten_name        | Chuỗi  | -        |              | -        | Tên Branch                                 |
| 6   | →shiten_name_kana   | Chuỗi  | -        |              | -        | Tên Branch (Katakana)                         |
| 7   | →kinyu_shiten_flg   | Boolean | -        |              | -        | Cờ Branch Tổ chức Tài chính                       |
| 8   | →kanri_shiten_id    | Số  | -        |              | -        | ID Branch Quản lý                               |
| 9   | →created_at         | Chuỗi  | -        | ISO8601      | -        | Thời gian Tạo                                 |
| 10  | →updated_at         | Chuỗi  | -        | ISO8601      | ○       | Thời gian Cập nhật                                 |
| 11  | meta                | Đối tượng  | -        |              | -        | Thông tin Phân trang                     |
| 12  | →total              | Số  | -        |              | -        | Tổng Số Bản ghi                                   |
| 13  | →page               | Số  | -        |              | -        | Số Trang Hiện tại                         |
| 14  | →per_page           | Số  | -        |              | -        | Số Bản ghi Mỗi Trang                            |
| 15  | →total_pages        | Số  | -        |              | -        | Tổng Số Trang                               |

## Ví dụ Yêu cầu

```
GET /api/v1/shiten?shiten_name=Trụ sở chính&page=1&per_page=20&sort_by=shiten_code&sort_order=asc
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": [
    {
      "shiten_id": 1,
      "ja_id": 1,
      "shiten_code": "S001",
      "shiten_name": "Division Hoạt động Trụ sở chính",
      "shiten_name_kana": "ホンテンエイギョウブ",
      "kinyu_shiten_flg": false,
      "kanri_shiten_id": 1,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "shiten_id": 2,
      "ja_id": 1,
      "shiten_code": "S002",
      "shiten_name": "Chi nhánh Trụ sở chính Phía Đông",
      "shiten_name_kana": "ヒガシホンテンシテン",
      "kinyu_shiten_flg": true,
      "kanri_shiten_id": 1,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": null
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

## Ví dụ Phản hồi Thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "Tham số Yêu cầu không hợp lệ"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có Quyền truy cập Màn hình này"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống।Vui lòng Thử lại Sau"
}
```

## Thủ tục Xử lý

### 4.1 Xác thực Yêu cầu

- Xác thực Tham số Truy vấn:
  - shiten_name: Kiểm tra Loại Chuỗi, Tối đa 100 Ký tự
  - page: Kiểm tra Loại Số, ≧ 1
  - per_page: Kiểm tra Loại Số, 1〜100
  - sort_by: Kiểm tra Giá trị được Phép (shiten_code, shiten_name)
  - sort_order: Kiểm tra Giá trị được Phép (asc, desc)
- Áp dụng Giá trị Mặc định:
  - page: Nếu Không được chỉ định, 1
  - per_page: Nếu Không được chỉ định, 20
  - sort_by: Nếu Không được chỉ định, shiten_code
  - sort_order: Nếu Không được chỉ định, asc
- Nếu Tham số Không hợp lệ Tồn tại:
  - Trả về HTTP 400 Bad Request (`BAD_REQUEST`)।

### 4.2 Xác thực Xác thực và Ủy quyền

- Xác thực Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Nếu Xác thực Không thành công: HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra Quyền: Kiểm tra có `shiten.view`।
  - Vai trò Mục tiêu: CHUOKAI (Chuokai), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Branch Quản lý JA)
- Nếu Không có Quyền: HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Thiết lập Điều kiện Lấy Dữ liệu

- Lấy Phạm vi Người dùng đã đăng nhập (ja_id)।
- Điều kiện Cơ bản:
  - Kiểm soát Phạm vi (ja_id = user.ja_id)
  - Loại trừ Xóa Mềm (deleted_at IS NULL)
- Điều kiện Tìm kiếm:
  - shiten_name: Khớp Một phần (ILIKE '%value%')
  - sort_by / sort_order: Áp dụng Sắp xếp

### 4.4 Lấy Số Bản ghi Dữ liệu

- Lấy Tổng Số Bản ghi Phù hợp với Điều kiện।
- Sử dụng cho meta.total।

```sql
SELECT COUNT(*) AS total
FROM m_shiten
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (:shiten_name IS NULL OR shiten_name ILIKE '%' || :shiten_name || '%')
```

### 4.5 Lấy Dữ liệu

- Thực thi SQL sau để Lấy Dữ liệu।

```sql
SELECT shiten_id, ja_id, shiten_code, shiten_name, shiten_name_kana,
       kinyu_shiten_flg, kanri_shiten_id, created_at, updated_at
FROM m_shiten
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (:shiten_name IS NULL OR shiten_name ILIKE '%' || :shiten_name || '%')
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 Tạo Phản hồi

- Trả về JSON bao gồm Mảng data và Đối tượng meta।
- Tính toán meta:
  - total: Tổng Số Bản ghi được Lấy từ 4.4
  - page: Giá trị page của Yêu cầu
  - per_page: Giá trị per_page của Yêu cầu
  - total_pages: CEIL(total / per_page)

### 4.7 Xử lý Ngoại lệ

- Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-006-002

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Xóa Branch                                                                                                                                                                                                                                                          |
| Tổng quan                   | Xóa Mềm Branch được chỉ định                                                                                                                                                                                                                                             |
| URI                    | /api/v1/shiten/{shiten_id}                                                                                                                                                                                                                                             |
| Phương pháp               | DELETE                                                                                                                                                                                                                                                                 |
| Thân Yêu cầu     | Không                                                                                                                                                                                                                                                                   |
| Tham số Yêu cầu | shiten_id (Tham số Đường dẫn)                                                                                                                                                                                                                                            |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                                                                                                                                 |
| Mã Phản hồi HTTP   | 200:Xóa Thành công, 400:Tham số Yêu cầu không hợp lệ, 401:Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại, 403:Không có Quyền truy cập Màn hình này, 404:Branch được chỉ định không Tìm thấy, 409:Dữ liệu Liên quan Tồn tại, không thể Xóa, 500:Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | shiten_id      | Số | -        | ○   |        |        | shiten_id Mục tiêu Xóa (Tham số Đường dẫn)  |

## Dữ liệu Phản hồi

| #   | ID Mục  | Loại | Lặp lại | Định dạng | Nullable | Mô tả               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | Chuỗi | -        |              | -        | Thông báo Kết quả Xử lý |

## Ví dụ Yêu cầu

```
DELETE /api/v1/shiten/5
```

## Ví dụ Phản hồi Thành công

```json
{
  "message": "Đã Xóa Thành công"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "Tham số Yêu cầu không hợp lệ"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có Quyền truy cập Màn hình này"
}
```

### 403 Data Scope Violation

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "Không có Quyền truy cập Dữ liệu này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Branch được chỉ định không Tìm thấy"
}
```

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "Dữ liệu Liên quan Tồn tại, không thể Xóa"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống।Vui lòng Thử lại Sau"
}
```

## Thủ tục Xử lý

> ※ Quá trình sau được Thực thi trong một Giao dịch duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động)।
> Nếu bất kỳ quy trình Nào không Thành công, tất cả Sẽ được Rollback।
> Nhật ký Lỗi trong Xử lý Ngoại lệ (log_type=3) được Ghi lại riêng biệt ngoài Giao dịch।

### 4.1 Xác thực Yêu cầu

- Xác thực Tham số Đường dẫn:
  - shiten_id: Kiểm tra Loại Số, Kiểm tra Bắt buộc
- Nếu Tham số Không hợp lệ Tồn tại:
  - Trả về HTTP 400 Bad Request (`BAD_REQUEST`)।

### 4.2 Xác thực Xác thực và Ủy quyền

- Xác thực Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Kiểm tra Quyền: Kiểm tra có `shiten.delete`।
  - Vai trò Mục tiêu: CHUOKAI (Chuokai), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Branch Quản lý JA)
- Nếu Không có Quyền: HTTP 403 Forbidden (`FORBIDDEN`)
### 4.3 Thiết lập Điều kiện Lấy Dữ liệu Mục tiêu

- Tìm kiếm Bản ghi Mục tiêu:
  - shiten_id = {id}
  - Loại trừ Xóa Mềm (deleted_at IS NULL)
- Nếu Bản ghi Mục tiêu Không tồn tại:
  - Trả về HTTP 404 Not Found।


### 4.4 Kiểm tra Tồn tại Dữ liệu Liên quan

- Kiểm tra xem Bản ghi Liên quan Có tồn tại trong Bảng sau không।

```sql
-- Kiểm tra Tham chiếu Branch của Thuê bao
SELECT COUNT(*) FROM t_dokusya
WHERE shiten_id = :shiten_id AND deleted_at IS NULL;

```

- Nếu Bản ghi Liên quan Tồn tại trong bất kỳ Bảng Nào:
  - Trả về HTTP 409 Conflict (`CONFLICT`)।

### 4.5 Thực thi Xóa Mềm

- Lấy Dữ liệu trước Xóa (Kết quả SELECT từ 4.3) và Lưu trữ vào `before_value`।
- Thực thi SQL sau để Thực hiện Xóa Mềm।

```sql
UPDATE m_shiten
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE shiten_id = :shiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

### 4.6 Ghi lại Nhật ký Hoạt động

- Thực thi SQL sau để Ghi lại Nhật ký Hoạt động।

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình Tìm kiếm Chi tiết Branch Master (ACSMS-SCR-006)', 'DELETE', 1,
        :shiten_id, 'm_shiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ before_value:**

```json
`before_value`: Lưu trữ Dữ liệu trước Xóa dưới dạng JSON। Không bao gồm Thông tin Bảo mật như Mật khẩu।
`after_value`: Đặt Chuỗi Trống vì DELETE।

{
  "shiten_id": 5,
  "ja_id": 1,
  "shiten_code": "S005",
  "shiten_name": "Branch Mục tiêu Xóa",
  "shiten_name_kana": "サクジョタイショウシテン",
  "kinyu_shiten_flg": false,
  "kanri_shiten_id": 1
}
```

### 4.7 Tạo Phản hồi

- Trả về Thông báo Thành công। HTTP 200।

### 4.8 Xử lý Ngoại lệ

- Lỗi Kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ghi lại Nhật ký Hoạt động khi Lỗi Xảy ra (`log_type = 3`)।

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình Tìm kiếm Chi tiết Branch Master (ACSMS-SCR-006)', 'DELETE', 2,
        :shiten_id, 'm_shiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
