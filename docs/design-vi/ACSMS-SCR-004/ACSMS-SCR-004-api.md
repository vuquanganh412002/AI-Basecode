---
customer_name: Tờ báo Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý người đăng ký phiên bản đám mây
document_name: Bản thiết kế API
screen_id: ACSMS-SCR-004
screen_name: Màn hình tìm kiếm chi tiết bảng JA
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Nguyen Duyen Manh
updated_date: 2026/04/07
updated_by: Nguyen Duyen Manh
---

## Lịch sử thay đổi

| No  | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm duyệt | Người phê duyệt |
| --- | ------------ | ---- | --------------- | -------- | -------------- | -------------- |
| 1   | {issue_date} | 1.0  | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là một hệ thống quản lý độc giả dựa trên đám mây cho JA,
cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản ngân hàng v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản ngân hàng, chức năng tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập,
ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục đích tài liệu

Tài liệu này mô tả chi tiết các API mới được tạo trên hệ thống cho "Màn hình tìm kiếm chi tiết bảng JA ({screen_name}（{screen_id}））".

## Tài liệu liên quan

| No  | Mã tài liệu | Tên tài liệu |
| --- | ---------- | ------ |

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
| 8   | Dành riêng cho màn hình | NOT_FOUND             | Không tìm thấy JA được chỉ định. | HTTP 404 |
| 9   | Dành riêng cho màn hình | CONFLICT              | Không thể xóa vì có dữ liệu liên quan. | HTTP 409 |

---

# API ACSMS-API-{screen_number}-001

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Get list JA                                                                                                                                                                                          |
| Tổng quan                   | Tìm kiếm và lấy danh sách bảng JA chính                                                                                                                                                                       |
| URI                    | /api/v1/ja                                                                                                                                                                                           |
| Phương thức               | GET                                                                                                                                                                                                  |
| Nội dung yêu cầu     | Không có                                                                                                                                                                                                 |
| Tham số yêu cầu | ?ja_code={ja_code}&ja_name={ja_name}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order}                                                                                       |
| Tiêu đề                 | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie                                                                                                                 |
| Mã phản hồi HTTP   | 200: Đã lấy danh sách JA thành công, 400: Tham số yêu cầu không hợp lệ, 401: Phiên hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 500: Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| #   | ID tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                                                                                          |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | ja_code        | String | -        | -    |        | 10     | Mã JA (khớp một phần)                                                                                          |
| 2   | ja_name        | String | -        | -    |        | 100    | Tên JA (khớp một phần)                                                                                              |
| 3   | page           | Number | -        | -    |        |        | Số trang (Mặc định: 1)                                                                                   |
| 4   | per_page       | Number | -        | -    |        |        | Số mục trên mỗi trang (Mặc định: 20)                                                                               |
| 5   | sort_by        | String | -        | -    |        |        | Mục sắp xếp (chỉ định tên cột của bảng m_ja. Ví dụ: ja_code, ja_name, yubin_no, todofuken_name, tel, address, fax) |
| 6   | sort_order     | String | -        | -    |        |        | Hướng sắp xếp (asc / desc)                                                                                      |

## Dữ liệu phản hồi

| #   | ID mục          | Loại | Lặp lại | Định dạng | Nullable | Mô tả                              |
| --- | --------------- | ------ | -------- | ------------ | -------- | --------------------------------- |
| 1   | data            | Array  | 〇       |              | -        | Dữ liệu danh sách JA                      |
| 2   | →ja_id          | Number | -        |              | -        | ID JA                             |
| 3   | →ja_code        | String | -        |              | -        | Mã JA                          |
| 4   | →ja_name        | String | -        |              | -        | Tên JA                              |
| 5   | →yubin_no       | String | -        |              | -         | Mã bưu chính                          |
| 6   | →todofuken_code | String | -        |              | -        | Mã tỉnh thành phố                    |
| 7   | →todofuken_name | String | -        |              | -        | Tên tỉnh thành phố (JOIN từ m_todofuken) |
| 8   | →tel            | String | -        |              | -         | Số điện thoại                          |
| 9   | →address        | String | -        |              | -         | Địa chỉ                              |
| 10  | →fax            | String | -        |              | -         | Số FAX                           |
| 11  | meta            | Object | -        |              | -        | Thông tin phân trang                    |
| 12  | →total          | Number | -        |              | -        | Tổng số mục                            |
| 13  | →page           | Number | -        |              | -        | Số trang hiện tại                  |
| 14  | →per_page       | Number | -        |              | -        | Số mục trên mỗi trang                     |
| 15  | →total_pages    | Number | -        |              | -        | Tổng số trang                        |

## Ví dụ yêu cầu

```
GET /api/v1/ja?ja_name=東京&page=1&per_page=20&sort_by=ja_code&sort_order=asc
```

## Ví dụ phản hồi thành công

```json
{
  "data": [
    {
      "ja_id": 1,
      "ja_code": "1301001001",
      "ja_name": "JA Trung tâm Tokyo",
      "yubin_no": "100-0001",
      "todofuken_code": "13",
      "todofuken_name": "Tokyo",
      "tel": "03-1234-5678",
      "address": "Marunouchi, Chiyoda Ward, Tokyo 1-1-1",
      "fax": "03-1234-5679"
    },
    {
      "ja_id": 2,
      "ja_code": "1301002001",
      "ja_name": "JA Tokyo Mirai",
      "yubin_no": "160-0022",
      "todofuken_code": "13",
      "todofuken_name": "Tokyo",
      "tel": "03-2345-6789",
      "address": "Shinjuku 3-1-1, Shinjuku Ward, Tokyo",
      "fax": "03-2345-6780"
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

## Ví dụ phản hồi thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "Tham số yêu cầu không hợp lệ"
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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy trình xử lý

### 4.1 Xác thực yêu cầu

- Xác thực tham số truy vấn:
  - ja_code: Loại chuỗi, tối đa 10 ký tự
  - ja_name: Loại chuỗi, tối đa 100 ký tự
  - page: Loại số, số nguyên ≥ 1
  - per_page: Loại số, số nguyên từ 1 đến 100
  - sort_by: Loại liệt kê (ja_code, ja_name, yubin_no, todofuken_name, tel, address, fax)
  - sort_order: Loại liệt kê (asc, desc)
- Áp dụng các giá trị mặc định:
  - page: Nếu không chỉ định, 1
  - per_page: Nếu không chỉ định, 20
  - sort_by: Nếu không chỉ định, ja_code
  - sort_order: Nếu không chỉ định, asc
- Nếu có tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm tra xác thực và phân quyền

- Xác thực thông tin xác thực (Phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 Unauthorized
- Kiểm tra quyền: Kiểm tra xem có quyền ja.view không.
  - Vai trò đích: NICHINO_ADMIN (Quản trị viên nông nghiệp), CHUOKAI (Hội trung tâm), JA_HONTEN (Chi nhánh chính JA)
- Nếu không có quyền: HTTP 403 Forbidden

### 4.3 Thiết lập điều kiện lấy dữ liệu

- Lấy `m_account.ja_id` của người dùng đăng nhập.
- Áp dụng DataScope:
  - Nếu `user.ja_id` là NULL (NICHINO_ADMIN): Không có bộ lọc ja_id → Lấy tất cả bản ghi JA
  - Nếu `user.ja_id` không phải NULL (CHUOKAI / JA_HONTEN): ja_id = user.ja_id → Lấy chỉ bản ghi JA của chính họ
- Điều kiện cơ bản:
  - Loại trừ xóa logic (deleted_at IS NULL)
- Điều kiện tìm kiếm:
  - ja_code: Khớp một phần (ILIKE '%value%')
  - ja_name: Khớp một phần (ILIKE '%value%')
  - sort_by / sort_order: Áp dụng sắp xếp

### 4.4 Lấy số lượng dữ liệu

- Lấy tổng số bản ghi khớp với điều kiện.
- Sử dụng cho meta.total.

### 4.5 Sắp xếp và Phân trang

- Áp dụng sắp xếp bởi sort_by / sort_order.
- OFFSET = (page - 1) \* per_page, LIMIT = per_page

### 4.6 Lấy dữ liệu

- Thực hiện SQL sau để lấy dữ liệu.

```sql
SELECT
    mj.ja_id,
    mj.ja_code,
    mj.ja_name,
    mj.yubin_no,
    mj.todofuken_code,
    mt.todofuken_name,
    mj.tel,
    mj.address,
    mj.fax
FROM m_ja mj
LEFT JOIN m_todofuken mt ON mj.todofuken_code = mt.todofuken_code
WHERE mj.deleted_at IS NULL
  AND (:ja_id IS NULL OR mj.ja_id = :ja_id)
  AND (:ja_code IS NULL OR mj.ja_code ILIKE '%' || :ja_code || '%')
  AND (:ja_name IS NULL OR mj.ja_name ILIKE '%' || :ja_name || '%')
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

- `:ja_id` = `user.ja_id` (lấy từ m_account). NICHINO_ADMIN có ja_id=NULL nên điều kiện `:ja_id IS NULL` trở thành true và bộ lọc JA được bỏ qua để lấy tất cả bản ghi. CHUOKAI/JA_HONTEN có ja_id được đặt nên chỉ lấy JA của chính họ.

### 4.7 Tạo phản hồi

- Trả về JSON chứa mảng data và đối tượng meta.

### 4.8 Xử lý ngoại lệ

- Nếu xảy ra lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error.

---

# API ACSMS-API-{screen_number}-002

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Delete JA                                                                                                                                                                                                                                                                  |
| Tổng quan                   | Xóa logic bảng JA chính được chỉ định                                                                                                                                                                                                                                             |
| URI                    | /api/v1/ja/{id}                                                                                                                                                                                                                                                            |
| Phương thức               | DELETE                                                                                                                                                                                                                                                                     |
| Nội dung yêu cầu     | Không có                                                                                                                                                                                                                                                                       |
| Tham số yêu cầu |                                                                                                                                                                                                                                                                            |
| Tiêu đề                 | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie                                                                                                                                                                                       |
| Mã phản hồi HTTP   | 200: Đã xóa thành công, 400: Tham số yêu cầu không hợp lệ, 401: Phiên hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy JA được chỉ định, 409: Không thể xóa vì có dữ liệu liên quan, 500: Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| #   | ID tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả             |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ---------------- |
| 1   | id             | Number | -        | 〇   |        |        | ja_id của đối tượng được xóa |

## Dữ liệu phản hồi

| #   | ID mục  | Loại | Lặp lại | Định dạng | Nullable | Mô tả               |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------ |
| 1   | message | String | -        |              | -        | Tin nhắn kết quả xử lý |

## Ví dụ yêu cầu

```
DELETE /api/v1/ja/5
```

## Ví dụ phản hồi thành công

```json
{
  "message": "Đã xóa thành công"
}
```

## Ví dụ phản hồi thất bại

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "Tham số yêu cầu không hợp lệ"
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
  "message": "Không tìm thấy JA được chỉ định"
}
```

### 409 Conflict

```json
{
  "error_code": "CONFLICT",
  "message": "Không thể xóa vì có dữ liệu liên quan"
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

- Xác thực tham số đường dẫn:
  - id: Kiểm tra loại số
  - id: Kiểm tra bắt buộc
- Nếu có tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm tra xác thực và phân quyền

- Nếu xác thực thất bại: HTTP 401 Unauthorized
- Kiểm tra quyền: Kiểm tra xem có quyền ja.delete không.
  - Vai trò đích: NICHINO_ADMIN (Quản trị viên nông nghiệp)

### 4.3 Thiết lập điều kiện lấy dữ liệu

- Tìm kiếm bản ghi đích:
  - ja_id = {id}
  - Loại trừ xóa logic (deleted_at IS NULL)
- Nếu bản ghi đích không tồn tại:
  - Trả về HTTP 404 Not Found.

### 4.4 Kiểm tra sự tồn tại của dữ liệu liên quan

- Kiểm tra xem có bản ghi liên quan tồn tại trong các bảng sau không.

```sql
-- Kiểm tra sự tồn tại của chi nhánh quản lý
SELECT COUNT(*) FROM m_kanri_shiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- Kiểm tra sự tồn tại của chi nhánh
SELECT COUNT(*) FROM m_shiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- Kiểm tra sự tồn tại của cửa hàng bán lẻ
SELECT COUNT(*) FROM m_hanbaiten
WHERE ja_id = :id AND deleted_at IS NULL;

-- Kiểm tra sự tồn tại của bảng giá chính
SELECT COUNT(*) FROM m_tanka
WHERE ja_id = :id AND deleted_at IS NULL;

-- Kiểm tra sự tồn tại của người đăng ký
SELECT COUNT(*) FROM t_dokusya
WHERE ja_id = :id AND deleted_at IS NULL;

-- Kiểm tra sự tồn tại của tài khoản
SELECT COUNT(*) FROM m_account
WHERE ja_id = :id AND deleted_at IS NULL;
```

- Nếu có bất kỳ bản ghi liên quan nào tồn tại:
  - Trả về HTTP 409 Conflict.

### 4.5 Thực hiện xóa logic

- Thực hiện SQL sau để xóa logic.

```sql
UPDATE m_ja
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE ja_id = :id
  AND deleted_at IS NULL
```

### 4.6 Ghi nhật ký hoạt động

- Lấy dữ liệu trước khi xóa (kết quả SELECT từ 4.3), lưu vào `before_value`.
- Thực hiện SQL sau để ghi nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình tìm kiếm chi tiết bảng JA (ACSMS-SCR-004)', 'DELETE', 1,
        :ja_id, 'm_ja',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ before_value:**

```json
`before_value`: Lưu trữ dữ liệu trước khi xóa ở định dạng JSON. Không bao gồm thông tin nhạy cảm như mật khẩu.
`after_value`: Đặt chuỗi trống cho DELETE.

{
  "ja_id": 5,
  "ja_code": "1301005001",
  "ja_name": "JA xóa mục tiêu",
  "yubin_no": "100-0001",
  "todofuken_code": "13",
  "todofuken_name": "Tokyo",
  "tel": "03-5555-5555",
  "address": "Chiyoda Ward, Tokyo",
  "fax": "03-5555-5556"
}
```

### 4.7 Tạo phản hồi

- Trả về tin nhắn thành công.

### 4.8 Xử lý ngoại lệ

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
        'Màn hình tìm kiếm chi tiết bảng JA (ACSMS-SCR-004)', 'DELETE', 2,
        :ja_id, 'm_ja',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
