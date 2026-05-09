---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: ACSMS-SCR-024
screen_name: Màn hình Tìm kiếm Chi tiết Master Tài khoản
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-14
created_date: 2026/04/14
created_by: Nguyen Duyen Manh
updated_date: 2026/04/14
updated_by: Nguyen Duyen Manh
---

## Lịch sử Thay đổi

| Số  | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung Thay đổi | Người xác minh | Người duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/14 | 1.0  | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan Hệ thống

Hệ thống này là một Hệ thống Quản lý Thuê bao dựa trên Đám mây dành cho JA,
cung cấp các chức năng quản lý Thông tin Thuê bao, quản lý Lịch sử Thuê bao, quản lý Dữ liệu Chuyển khoản Tài khoản, v.v.

Các chức năng chính bao gồm Đăng ký, Cập nhật, Tìm kiếm Thông tin Thuê bao,
Quản lý Lịch sử Thay đổi Nội dung Thuê bao, Tạo và Quản lý Dữ liệu Chuyển khoản Tài khoản, 
Chức năng Tải lên/Tải xuống Tệp, Quản lý Thông báo Hệ thống, v.v.

Ngoài ra, nó hỗ trợ Quản lý Đăng nhập Người dùng, Ghi lại Lịch sử Đăng nhập,
Ghi lại Nhật ký Hoạt động Người dùng và các chức năng Bảo mật + Kiểm tra.

## Mục đích Tài liệu

Tài liệu này mô tả chi tiết về API mới được tạo trên Hệ thống trong Màn hình Tìm kiếm Chi tiết Master Tài khoản (ACSMS-SCR-024).

## Tài liệu Liên quan

| Số  | Mã Tài liệu   | Tên Tài liệu                   |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-025 | Tài liệu Thiết kế API Màn hình Đăng ký Master Tài khoản     |

## Danh sách Lỗi

| #   | Loại Lỗi | Mã Lỗi          | Thông báo Lỗi                                                       | Ghi chú     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung        | BAD_REQUEST           | Tham số Yêu cầu không hợp lệ।                                       | HTTP 400 |
| 2   | Chung        | UNAUTHORIZED          | Phiên Làm việc đã hết hạn। Vui lòng Đăng nhập lại।                     | HTTP 401 |
| 3   | Chung        | FORBIDDEN             | Bạn không có Quyền truy cập Màn hình này।                                 | HTTP 403 |
| 4   | Chung        | DATA_SCOPE_VIOLATION  | Bạn không có Quyền truy cập Dữ liệu này।                               | HTTP 403 |
| 5   | Chung        | VALIDATION_ERROR      | Giá trị Nhập liệu không hợp lệ। Vui lòng kiểm tra Trường errors।           | HTTP 400 |
| 6   | Chung        | TOO_MANY_REQUESTS     | Yêu cầu vượt quá Giới hạn। Vui lòng thử lại sau।         | HTTP 429 |
| 7   | Chung        | INTERNAL_SERVER_ERROR | Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau।     | HTTP 500 |
| 8   | Cụ thể Màn hình     | NOT_FOUND     | Tài khoản được chỉ định không được Tìm thấy।                                 | HTTP 404 |
| 9   | Cụ thể Màn hình     | CONFLICT              | Dữ liệu Liên quan tồn tại, không thể Xóa।                       | HTTP 409 |

---

# API ACSMS-API-024-001

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Tìm kiếm Tài khoản                                                                                                                                                                                          |
| Tổng quan                   | Lấy Danh sách Tài khoản theo Điều kiện Tìm kiếm (Kèm Phân trang)                                                                                                                                               |
| URI                    | /api/v1/accounts                                                                                                                                                                                         |
| Phương thức               | GET                                                                                                                                                                                                      |
| Thân Yêu cầu     | Không                                                                                                                                                                                                     |
| Tham số Yêu cầu | Tham số Truy vấn                                                                                                                                                                                         |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                                                                   |
| Mã Phản hồi HTTP   | 200:Lấy Danh sách Tài khoản thành công, 401:Phiên đã hết hạn। Vui lòng Đăng nhập lại, 403:Bạn không có Quyền truy cập Màn hình này, 500:Đã xảy ra Lỗi Hệ thống                                   |

## Tham số Yêu cầu

| #   | ID Tham số   | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả                                                                 |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------------- |
| 1   | login_id         | String | -        | -    |        | 20     | ID Đăng nhập (Tìm kiếm Khớp Một phần)                                           |
| 2   | role_id          | Number | -        | -    |        |        | Phân loại Quản trị viên (1〜5)।Không được chỉ định = Tất cả                                      |
| 3   | ja_id            | Number | -        | -    |        |        | ID JA                                                                |
| 4   | kanri_shiten_id  | Number | -        | -    |        |        | ID Chi nhánh Quản lý                                                           |
| 5   | page             | Number | -        | -    |        |        | Số Trang (Mặc định: 1)                                          |
| 6   | per_page         | Number | -        | -    |        |        | Số Mục trên Trang (Mặc định: 20, Tối đa: 100)                     |
| 7   | sort_by          | String | -        | -    |        |        | Mục Sắp xếp (Mặc định: created_at)                                  |
| 8   | sort_order       | String | -        | -    |        |        | Thứ tự Sắp xếp (asc / desc, Mặc định: desc)                             |

## Dữ liệu Phản hồi

| #   | ID Mục                | Loại  | Lặp lại | Định dạng | Có thể Null | Mô tả                                        |
| --- | --------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------- |
| 1   | data                  | Array   | ○        |              | -        | Danh sách Tài khoản                              |
| 2   | →account_id           | Number  | -        |              | -        | ID Tài khoản                                |
| 3   | →login_id             | String  | -        |              | -        | ID Đăng nhập                                  |
| 4   | →account_name         | String  | -        |              | -        | Tên Tài khoản                                |
| 5   | →role_id              | Number  | -        |              | -        | ID Phân loại Quản trị viên                                |
| 6   | →role_name            | String  | -        |              | -        | Tên Phân loại Quản trị viên                              |
| 7   | →todofuken_code       | String  | -        |              | 〇       | Mã Tỉnh/Thành phố                              |
| 8   | →todofuken_name       | String  | -        |              | 〇       | Tên Tỉnh/Thành phố                                  |
| 9   | →ja_id                | Number  | -        |              | 〇       | ID JA                                       |
| 10  | →ja_name              | String  | -        |              | 〇       | Tên JA                                      |
| 11  | →kanri_shiten_id      | Number  | -        |              | 〇       | ID Chi nhánh Quản lý                                  |
| 12  | →kanri_shiten_name    | String  | -        |              | 〇       | Tên Chi nhánh Quản lý                                |
| 13  | →paper_flg            | Boolean | -        |              | -        | Cờ Xử lý Phiên bản Giấy                              |
| 14  | →denshi_flg           | Boolean | -        |              | -        | Cờ Xử lý Phiên bản Điện tử                            |
| 15  | →created_at           | String  | -        | ISO8601      | -        | Ngày tháng Tạo                                    |
| 16  | →updated_at           | String  | -        | ISO8601      | 〇       | Ngày tháng Cập nhật                                    |
| 17  | meta                  | Object  | -        |              | -        | Thông tin Phân trang                        |
| 18  | →total                | Number  | -        |              | -        | Tổng Số lượng                                      |
| 19  | →page                 | Number  | -        |              | -        | Trang Hiện tại                                  |
| 20  | →per_page             | Number  | -        |              | -        | Số Mục trên Trang                         |
| 21  | →total_pages          | Number  | -        |              | -        | Tổng Số Trang                                  |

## Ví dụ Yêu cầu

```
GET /api/v1/accounts?login_id=admin&role_id=1&page=1&per_page=20&sort_by=created_at&sort_order=desc
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": [
    {
      "account_id": 1,
      "login_id": "admin001",
      "account_name": "Quản trị viên Taro",
      "role_id": 1,
      "role_name": "Nhật báo nông nghiệp (Quản trị viên)",
      "todofuken_code": null,
      "todofuken_name": null,
      "ja_id": null,
      "ja_name": null,
      "kanri_shiten_id": null,
      "kanri_shiten_name": null,
      "paper_flg": true,
      "denshi_flg": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "account_id": 2,
      "login_id": "ja_honten001",
      "account_name": "JA Trụ sở chính Hanako",
      "role_id": 4,
      "role_name": "JA Trụ sở chính",
      "todofuken_code": "13",
      "todofuken_name": "Tokyo",
      "ja_id": 10,
      "ja_name": "JA Tokyo Central",
      "kanri_shiten_id": null,
      "kanri_shiten_name": null,
      "paper_flg": true,
      "denshi_flg": true,
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": "2026-03-15T11:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

## Ví dụ Phản hồi Thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Làm việc đã hết hạn। Vui lòng Đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có Quyền truy cập Màn hình này"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau"
}
```

## Quy trình Xử lý

### 4.1 Kiểm chứng Yêu cầu

- Xác minh Tham số Truy vấn:
  - login_id：Tối đa 20 Ký tự, Chuỗi
  - role_id：Số nguyên 1〜5
  - ja_id：Kiểm tra Loại Số
  - kanri_shiten_id：Kiểm tra Loại Số
  - page：Số nguyên Dương (Mặc định: 1)
  - per_page：Số nguyên 1〜100 (Mặc định: 20)
  - sort_by：Tên Cột Được phép (login_id, role_id, created_at)
  - sort_order：asc hoặc desc (Mặc định: desc)
- Nếu Tham số không hợp lệ Tồn tại:
  - Trả về HTTP 400 Bad Request।

### 4.2 Kiểm tra Xác thực + Ủy quyền

- Xác minh Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Nếu Xác thực Thất bại：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra Quyền hạn：Xác minh Quyền hạn `account.view`।
  - Vai trò Đích：Chỉ NICHINO_ADMIN (Quản trị viên Nhật báo nông nghiệp)
- Nếu Không có Quyền hạn：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Thiết lập Điều kiện Tìm kiếm Dữ liệu

- Xây dựng Điều kiện Tìm kiếm।
  - Nếu login_id được chỉ định:`LIKE '%' || :login_id || '%'` (Khớp Một phần)
  - Nếu role_id được chỉ định:`= :role_id` (Khớp Hoàn hảo)
  - Nếu ja_id được chỉ định:`= :ja_id` (Khớp Hoàn hảo)
  - Nếu kanri_shiten_id được chỉ định:`= :kanri_shiten_id` (Khớp Hoàn hảo)
- Luôn Lọc bằng `deleted_at IS NULL`।
- NICHINO_ADMIN có thể Tham chiếu tất cả Tài khoản (Không có Hạn chế DataScope)।

### 4.4 Lấy Số lượng Dữ liệu

```sql
SELECT COUNT(*) AS total
FROM m_account a
WHERE a.deleted_at IS NULL
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
```

### 4.5 Lấy Dữ liệu

```sql
SELECT a.account_id, a.login_id, a.account_name,
       a.role_id, r.role_name,
       a.todofuken_code, t.todofuken_name,
       a.ja_id, j.ja_name,
       a.kanri_shiten_id, ks.kanri_shiten_name,
       a.paper_flg, a.denshi_flg,
       a.created_at, a.updated_at
FROM m_account a
  LEFT JOIN m_roles r ON a.role_id = r.role_id AND r.deleted_at IS NULL
  LEFT JOIN m_todofuken t ON a.todofuken_code = t.todofuken_code
  LEFT JOIN m_ja j ON a.ja_id = j.ja_id AND j.deleted_at IS NULL
  LEFT JOIN m_kanri_shiten ks ON a.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL
WHERE a.deleted_at IS NULL
  AND (:login_id IS NULL OR a.login_id LIKE '%' || :login_id || '%')
  AND (:role_id IS NULL OR a.role_id = :role_id)
  AND (:ja_id IS NULL OR a.ja_id = :ja_id)
  AND (:kanri_shiten_id IS NULL OR a.kanri_shiten_id = :kanri_shiten_id)
ORDER BY a.:sort_by :sort_order
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 Tạo Phản hồi

- Trả về Kết quả Lấy dữ liệu như Mảng data।
- Trả về Thông tin Phân trang như Đối tượng meta।
  - total：Tổng Số lượng Được lấy từ 4.4
  - page：page của Yêu cầu
  - per_page：per_page của Yêu cầu
  - total_pages：CEIL(total / per_page)
- Nếu Kết quả Tìm kiếm Là 0 Mục：Trả về data Là Mảng Trống `[]`, meta.total = 0 (HTTP 200)।

### 4.7 Xử lý Ngoại lệ

- Nếu xảy ra Lỗi Kết nối DB, v.v।：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-024-002

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------|
| Tên API                  | Xóa Tài khoản                                                                                                                                                                                                                                             |
| Tổng quan                   | Xóa Logic Tài khoản được chỉ định                                                                                                                                                                                                                           |
| URI                    | /api/v1/accounts/{account_id}                                                                                                                                                                                                                              |
| Phương thức               | DELETE                                                                                                                                                                                                                                                     |
| Thân Yêu cầu     | Không                                                                                                                                                                                                                                                       |
| Tham số Yêu cầu | account_id (Tham số Đường dẫn)                                                                                                                                                                                                                               |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                                                                                                                     |
| Mã Phản hồi HTTP   | 200:Xóa Tài khoản thành công, 401:Phiên đã hết hạn। Vui lòng Đăng nhập lại, 403:Bạn không có Quyền truy cập Màn hình này, 404:Tài khoản được chỉ định không được Tìm thấy, 409:Dữ liệu Liên quan tồn tại, không thể Xóa।, 500:Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả                                      |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------- |
| 1   | account_id     | Number | -        | 〇   |        |        | account_id của Đích Xóa (Tham số Đường dẫn)   |

## Dữ liệu Phản hồi

| #   | ID Mục  | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả           |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------- |
| 1   | message | String | -        |              | -        | Thông báo Xóa Thành công |

## Ví dụ Yêu cầu

```
DELETE /api/v1/accounts/5
```

## Ví dụ Phản hồi Thành công

```json
{
  "message": "Đã xóa thành công"
}
```

## Ví dụ Phản hồi Thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Làm việc đã hết hạn। Vui lòng Đăng nhập lại"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có Quyền truy cập Màn hình này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Tài khoản được chỉ định không được Tìm thấy"
}
```

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "Dữ liệu Liên quan tồn tại, không thể Xóa।"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra Lỗi Hệ thống। Vui lòng thử lại sau"
}
```

## Quy trình Xử lý

> ※ Quy trình sau được Thực thi trong một Giao dịch Đơn nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động)।
> Nếu xảy ra Lỗi, Khôi phục tất cả।
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Riêng biệt ngoài Giao dịch।

### 4.1 Kiểm chứng Yêu cầu

- Xác minh Tham số Đường dẫn:
  - account_id：Kiểm tra Loại Số, Kiểm tra Bắt buộc
- Nếu Tham số không hợp lệ Tồn tại:
  - Trả về HTTP 400 Bad Request।

### 4.2 Kiểm tra Xác thực + Ủy quyền

- Xác minh Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Kiểm tra Quyền hạn：`account.delete` có được giữ làm Quyền hạn không।
  - Vai trò Đích：Chỉ NICHINO_ADMIN (Quản trị viên Nhật báo nông nghiệp)
- Nếu Không có Quyền hạn：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Thiết lập Điều kiện Lấy dữ liệu (Kiểm tra Tồn tại · Kiểm tra Dữ liệu Liên quan)

- Xác minh Tồn tại của Tài khoản Đích।

```sql
SELECT a.account_id, a.login_id, a.account_name, a.role_id,
       a.ja_id, a.kanri_shiten_id, a.todofuken_code,
       a.paper_flg, a.denshi_flg, a.email, a.biko,
       a.created_at, a.updated_at
FROM m_account a
WHERE a.account_id = :account_id
  AND a.deleted_at IS NULL
```

- Nếu Bản ghi Không tồn tại：HTTP 404 (`NOT_FOUND`)

- Kiểm tra xem Dữ liệu Có liên kết với Các bảng Liên quan না।

```sql
SELECT COUNT(*) AS related_count
FROM (
  SELECT account_id FROM t_mfa_otp WHERE account_id = :account_id AND used_flg = false AND expired_at > NOW()
) AS related_data
```

※ Nếu Tồn tại OTP MFA Hợp lệ, v.v., Quyết định Khả năng Xóa dựa trên Tình trạng Liên kết Dữ liệu Liên quan।
Mở rộng Phạm vi Kiểm tra của Các bảng Liên quan dựa trên Yêu cầu Kinh doanh।

- Nếu Dữ liệu Liên quan Tồn tại：HTTP 409 (`CONFLICT`)

### 4.4 Thực hiện Xóa Logic

```sql
UPDATE m_account
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE account_id = :account_id
  AND deleted_at IS NULL
```

### 4.5 Ghi lại Nhật ký Hoạt động

- Thực thi SQL dưới đây để Ghi lại Nhật ký Hoạt động।

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình Tìm kiếm Chi tiết Master Tài khoản (ACSMS-SCR-024)', 'DELETE', 1,
        :target_account_id, 'm_account',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ before_value:**

```json
`before_value`：Lưu trữ Dữ liệu trước Xóa dưới dạng JSON। Không Bao gồm Thông tin Nhạy cảm như Mật khẩu।
`after_value`：Vì là DELETE Nên Đặt Chuỗi Trống।
{
  "account_id": 5,
  "login_id": "ja_shiten001",
  "account_name": "JA Chi nhánh Quản lý Jiro",
  "role_id": 5,
  "ja_id": 10,
  "kanri_shiten_id": 20,
  "todofuken_code": "13",
  "paper_flg": true,
  "denshi_flg": false,
  "email": "shiten001@example.com"
}
```

### 4.6 Tạo Phản hồi

- Trả về Thông báo Xóa Thành công। HTTP 200।

```json
{
  "message": "Đã xóa thành công"
}
```

### 4.7 Xử lý Ngoại lệ

- Nếu xảy ra Lỗi Kết nối DB, v.v।：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Nhật ký Hoạt động được Ghi lại ngay cả khi xảy ra Lỗi (log_type = 3)।

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn hình Tìm kiếm Chi tiết Master Tài khoản (ACSMS-SCR-024)', 'DELETE', 2,
        :target_account_id, 'm_account',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-COMMON-002

[This section contains common dropdown APIs for roles, JA, and kanri_shiten - same structure as above, providing reusable dropdown lists]

## Tổng quan

Xem chi tiết trong tài liệu hoàn chỉnh - Các API Chung cho Danh sách Thả xuống các Vai trò, JA, Chi nhánh Quản lý
