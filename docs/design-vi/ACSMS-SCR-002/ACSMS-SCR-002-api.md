---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-002
screen_name: 単価マスタ明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-06
created_date: 2026/04/06
created_by: Tran Duc Tuyen
updated_date: 2026/04/01
updated_by: Tran Duc Tuyen
---

## Lịch Sử Thay Đổi

| No | Ngày Phát Hành | Phiên Bản | Người Phụ Trách | Nội Dung Thay Đổi | Người Xác Nhận | Người Phê Duyệt |
|---|---|---|---|---|---|---|
| 1 | {issue_date} | 1.0 | Tran Duc Tuyen | Tạo Phiên Bản Ban Đầu | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng Quan Hệ Thống

Hệ thống này là một hệ thống quản lý người đăng ký dựa trên điện toán đám mây cho các JA, cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật, tìm kiếm thông tin người đăng ký, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động, tính năng tải lên và tải xuống tệp, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục Đích Tài Liệu

Tài Liệu Này Mô Tả Chi Tiết Về Các API Mới Được Tạo Trên Hệ Thống Cho "{screen_name}({screen_id})".

## Tài Liệu Liên Quan

| No | Mã Tài Liệu | Tên Tài Liệu |
|---|---|---|

## Danh Sách Lỗi

| #   | Loại Lỗi | Mã Lỗi | Tin Nhắn Lỗi | Ghi Chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST | Các Tham Số Yêu Cầu Không Hợp Lệ. | HTTP 400 |
| 2   | Chung | UNAUTHORIZED | Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại. | HTTP 401 |
| 3   | Chung | FORBIDDEN | Bạn Không Có Quyền Truy Cập Màn Hình Này. | HTTP 403 |
| 4   | Chung | DATA_SCOPE_VIOLATION | Bạn Không Có Quyền Truy Cập Dữ Liệu Này. | HTTP 403 |
| 5   | Chung | VALIDATION_ERROR | Giá Trị Nhập Không Hợp Lệ. Vui Lòng Kiểm Tra Trường errors Để Biết Chi Tiết. | HTTP 400 |
| 6   | Chung | TOO_MANY_REQUESTS | Số Lượng Yêu Cầu Đã Vượt Quá Giới Hạn. Vui Lòng Thử Lại Sau Một Lúc. | HTTP 429 |
| 7   | Chung | INTERNAL_SERVER_ERROR | Đã Xảy Ra Lỗi Hệ Thống. Vui Lòng Thử Lại Sau Một Lúc. | HTTP 500 |
| 8   | Cụ Thể Màn Hình | NOT_FOUND | Không Tìm Thấy Đơn Giá Được Chỉ Định. | HTTP 404 |
| 9   | Cụ Thể Màn Hình | CONFLICT | Không Thể Xóa Vì Tồn Tại Dữ Liệu Liên Quan. | HTTP 409 |

---

# API ACSMS-API-{screen_number}-001

## Tóm Tắt

| Mục | Nội Dung |
|---|---|
| Tên API | Lấy Danh Sách Đơn Giá |
| Tóm Tắt | Lấy Danh Sách Đơn Giá |
| URI | /api/v1/tanka |
| Phương Pháp | GET |
| Thân Yêu Cầu | JSON |
| Tham Số Yêu Cầu | ?tanka_type={tanka_type}&tanka_name={tanka_name}&page={page}&per_page={per_page}&sort_by={sort_by}&sort_order={sort_order} |
| Tiêu Đề | Content-Type: application/json\n※ Thông Tin Xác Thực Được Gửi Tự Động Thông Qua Cookie HTTP-only |
| Mã Phản Hồi HTTP | 200: Lấy Danh Sách Đơn Giá Thành Công, 400: Các Tham Số Yêu Cầu Không Hợp Lệ, 401: Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại, 403: Bạn Không Có Quyền Truy Cập Màn Hình Này, 500: Đã Xảy Ra Lỗi Hệ Thống |

## Tham Số Yêu Cầu

| # | ID Tham Số | Loại | Lặp Lại | Bắt Buộc | Chiều Dài Tối Thiểu | Chiều Dài Tối Đa | Mô Tả |
|---|---|---|---|---|---|---|---|
| 1 | tanka_type | Số | - | - | | | Loại Đơn Giá (Khớp Chính Xác) |
| 2 | tanka_name | Chuỗi | - | - | | 100 | Tên Đơn Giá (Khớp Một Phần) |
| 3 | page | Số | - | - | | | Số Trang (Mặc Định: 1) |
| 4 | per_page | Số | - | - | | | Số Bản Ghi Trên Trang (Mặc Định: 20) |
| 5 | sort_by | Chuỗi | - | - | | | Trường Sắp Xếp (Chỉ Định Tên Cột Của Bảng m_tanka. Ví Dụ: tanka_code, tanka_name, kingaku_zeikomi, tekiyo_start_date) |
| 6 | sort_order | Chuỗi | - | - | | | Hướng Sắp Xếp (asc / desc) |

## Dữ Liệu Phản Hồi

| # | ID Mục | Loại | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả |
|---|---|---|---|---|---|---|
| 1 | data | Mảy | 〇 | | - | |
| 2 | →tanka_id | Số | - | | - | |
| 3 | →tanka_type | Số | - | | - | 1: Phí Đăng Ký Báo, 2: Phí Giao Hàng |
| 4 | →tanka_type_label | Chuỗi | - | | - | Nhãn Của tanka_type |
| 5 | →tanka_code | Chuỗi | - | | - | |
| 6 | →tanka_name | Chuỗi | - | | - | |
| 7 | →kingaku_zeikomi | Số | - | | - | Số Tiền Bao Gồm Thuế (Yên) |
| 8 | →kingaku_zeinuki | Số | - | | - | Số Tiền Không Bao Gồm Thuế (Yên) |
| 9 | →tax_rate | Số | - | ##.## | - | Tỷ Lệ Thuế (%) |
| 10 | meta | Đối Tượng | - | | - | |
| 11 | →total | Số | - | | - | Tổng Số Bản Ghi |
| 12 | →page | Số | - | | - | Số Trang Hiện Tại |
| 13 | →per_page | Số | - | | - | Số Bản Ghi Trên Trang |
| 14 | →total_pages | Số | - | | - | Tổng Số Trang |

## Ví Dụ Yêu Cầu

```
GET /api/v1/tanka?tanka_type=1&tanka_name=基本&page=1&per_page=20&sort_by=tanka_code&sort_order=asc
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": [
    {
      "tanka_id": 1,
      "tanka_type": 1,
      "tanka_type_label": "Phí Đăng Ký Báo",
      "tanka_code": "T001",
      "tanka_name": "Phí Đăng Ký Cơ Bản (Hàng Tháng)",
      "kingaku_zeikomi": 4900,
      "kingaku_zeinuki": 4455,
      "tax_rate": 10.00
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

## Ví Dụ Phản Hồi Lỗi

### 400 Bad Request
```json
{
  "error_code": "BAD_REQUEST",
  "message": "Các Tham Số Yêu Cầu Không Hợp Lệ"
}
```

### 401 Unauthorized
```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại"
}
```

### 403 Forbidden
```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn Không Có Quyền Truy Cập Màn Hình Này"
}
```

### 500 Internal Server Error
```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã Xảy Ra Lỗi Hệ Thống. Vui Lòng Thử Lại Sau Một Lúc"
}
```

## Quy Trình Xử Lý

### 4.1 Xác Minh Yêu Cầu
- Xác Minh Tham Số Truy Vấn:
  - Kiểm Tra Loại (string / number / enum)
  - Kiểm Tra Giá Trị Tối Đa/Tối Thiểu
  - Kiểm Tra Trường Bắt Buộc (Nếu Áp Dụng)
- Áp Dụng Giá Trị Mặc Định:
  - page: Nếu Không Chỉ Định, Hãy Đặt Thành 1
  - per_page: Nếu Không Chỉ Định, Hãy Đặt Thành 20
- Nếu Tham Số Không Hợp Lệ:
  - Trả Về HTTP 400 Bad Request.

### 4.2 Kiểm Tra Xác Thực và Ủy Quyền
- Xác Minh Thông Tin Xác Thực (Phiên Cookie HTTP-only).
- Nếu Xác Thực Không Thành Công: HTTP 401 Unauthorized
- Kiểm Tra Quyền: Xác Nhận Rằng Người Dùng Có Quyền tanka.view.
  - Vai Trò Mục Tiêu: CHUOKAI (Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu Không Có Quyền: HTTP 403 Forbidden

### 4.3 Đặt Điều Kiện Lấy Dữ Liệu
- Lấy Phạm Vi Của Người Dùng Đã Đăng Nhập (Ví Dụ: ja_id).
- Điều Kiện Cơ Bản:
  - Kiểm Soát Phạm Vi (ja_id = user.ja_id)
  - Loại Trừ Xóa Logic (deleted_at IS NULL)
  - Điều Kiện Thời Gian Có Hiệu Lực (tekiyo_end_date IS NULL OR tekiyo_end_date >= CURRENT_DATE)
- Điều Kiện Tìm Kiếm:
  - tanka_type: Khớp Chính Xác (=)
  - tanka_name: Khớp Một Phần (ILIKE '%value%')
  - sort_by / sort_order: Áp Dụng Sắp Xếp

### 4.4 Lấy Số Lượng Dữ Liệu
- Lấy Tổng Số Bản Ghi Khớp Với Điều Kiện.
- Sử Dụng Cho meta.total

### 4.5 Sắp Xếp và Phân Trang
- Áp Dụng Sắp Xếp Bằng sort_by / sort_order.
- OFFSET = (page - 1) * per_page, LIMIT = per_page

### 4.6 Lấy Dữ Liệu
- Thực Thi SQL Sau Để Lấy Dữ Liệu.
```sql
SELECT tanka_id, tanka_type, tanka_code, tanka_name,
       kingaku_zeikomi, kingaku_zeinuki, tax_rate
FROM m_tanka
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (tekiyo_end_date IS NULL OR tekiyo_end_date >= CURRENT_DATE)
  AND (:tanka_type IS NULL OR tanka_type = :tanka_type)
  AND (:tanka_name IS NULL OR tanka_name ILIKE '%' || :tanka_name || '%')
ORDER BY {sort_by} {sort_order}
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```
- Ánh Xạ Giá Trị tanka_type Thành Nhãn (1 → Phí Đăng Ký Báo, 2 → Phí Giao Hàng)

### 4.7 Tạo Phản Hồi
- Trả Về JSON Chứa Mảng data Và Đối Tượng meta.

### 4.8 Xử Lý Ngoại Lệ
- Nếu Có Lỗi Kết Nối Cơ Sở Dữ Liệu, v.v.: HTTP 500 Internal Server Error.

---

# API ACSMS-API-{screen_number}-002

## Tóm Tắt

| Mục | Nội Dung |
|---|---|
| Tên API | Xóa Đơn Giá |
| Tóm Tắt | Xóa Đơn Giá Được Chỉ Định |
| URI | /api/v1/tanka/{tanka_id} |
| Phương Pháp | DELETE |
| Thân Yêu Cầu | JSON |
| Tham Số Yêu Cầu | |
| Tiêu Đề | Content-Type: application/json\n※ Thông Tin Xác Thực Được Gửi Tự Động Thông Qua Cookie HTTP-only |
| Mã Phản Hồi HTTP | 200: Xóa Thành Công, 400: Các Tham Số Yêu Cầu Không Hợp Lệ, 401: Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại, 403: Bạn Không Có Quyền Truy Cập Màn Hình Này, 404: Không Tìm Thấy Đơn Giá Được Chỉ Định, 409: Không Thể Xóa Vì Tồn Tại Dữ Liệu Liên Quan, 500: Đã Xảy Ra Lỗi Hệ Thống |

## Tham Số Yêu Cầu

| # | ID Tham Số | Loại | Lặp Lại | Bắt Buộc | Chiều Dài Tối Thiểu | Chiều Dài Tối Đa | Mô Tả |
|---|---|---|---|---|---|---|---|
| 1 | tanka_id | Số | - | 〇 | | | tanka_id Của Đối Tượng Cần Xóa (Tham Số Đường Dẫn) |

## Dữ Liệu Phản Hồi

| # | ID Mục | Loại | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả |
|---|---|---|---|---|---|---|
| 1 | message | Chuỗi | - | | - | Tin Nhắn Kết Quả Xử Lý |

## Ví Dụ Yêu Cầu

```
DELETE /api/v1/tanka/5
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "message": "Xóa Thành Công"
}
```

## Ví Dụ Phản Hồi Lỗi

### 400 Bad Request
```json
{
  "error_code": "BAD_REQUEST",
  "message": "Các Tham Số Yêu Cầu Không Hợp Lệ"
}
```

### 401 Unauthorized
```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại"
}
```

### 403 Forbidden
```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn Không Có Quyền Truy Cập Màn Hình Này"
}
```

### 404 Not Found
```json
{
  "error_code": "NOT_FOUND",
  "message": "Không Tìm Thấy Đơn Giá Được Chỉ Định"
}
```

### 409 Conflict
```json
{
  "error_code": "CONFLICT",
  "message": "Không Thể Xóa Vì Tồn Tại Dữ Liệu Liên Quan"
}
```

### 500 Internal Server Error
```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã Xảy Ra Lỗi Hệ Thống. Vui Lòng Thử Lại Sau Một Lúc"
}
```

## Quy Trình Xử Lý

> ※ Quy Trình Sau Được Thực Hiện Trong Một Giao Dịch Duy Nhất (Xử Lý Chính + Ghi Nhật Ký Hoạt Động).
> Nếu Bất Kỳ Quy Trình Nào Thất Bại, Hãy Hoàn Lại Tất Cả.
> Nhật Ký Lỗi Trong Xử Lý Ngoại Lệ (log_type=3) Được Ghi Lại Riêng Biệt Bên Ngoài Giao Dịch.

### 4.1 Xác Minh Yêu Cầu
- Xác Minh Tham Số Đường Dẫn:
  - tanka_id: Kiểm Tra Loại Số
  - tanka_id: Kiểm Tra Bắt Buộc
- Nếu Tham Số Không Hợp Lệ:
  - Trả Về HTTP 400 Bad Request.

### 4.2 Kiểm Tra Xác Thực và Ủy Quyền
- Xác Minh Thông Tin Xác Thực (Phiên Cookie HTTP-only).
- Nếu Xác Thực Không Thành Công: HTTP 401 Unauthorized
  - Vai Trò Mục Tiêu: CHUOKAI (Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu Không Có Quyền: HTTP 403 Forbidden

- Lấy Phạm Vi Của Người Dùng Đã Đăng Nhập (Ví Dụ: ja_id).
- Tìm Kiếm Bản Ghi Mục Tiêu:
  - tanka_id = :tanka_id Và ja_id = :ja_id
  - Loại Trừ Xóa Logic (deleted_at IS NULL)
- Nếu Bản Ghi Mục Tiêu Không Tồn Tại:
  - Trả Về HTTP 404 Not Found.

### 4.4 Kiểm Tra Sự Tồn Tại Của Dữ Liệu Liên Quan
- Kiểm Tra Xem Các Bản Ghi Liên Quan Có Tồn Tại Trong Các Bảng Sau Không.
```sql
-- Kiểm Tra Tham Chiếu Phí Giao Hàng Của Nhà Bán Hàng
SELECT COUNT(*) FROM m_hanbaiten
WHERE haitatsuryo_tanka_id = :tanka_id AND deleted_at IS NULL;

-- Kiểm Tra Tham Chiếu Đơn Giá Của Người Đăng Ký
SELECT COUNT(*) FROM t_dokusya
WHERE tanka_id = :tanka_id AND deleted_at IS NULL;
```
- Nếu Bất Kỳ Bản Ghi Liên Quan Nào Tồn Tại:
  - Trả Về HTTP 409 Conflict.

### 4.5 Thực Hiện Xóa Logic
- Lấy Dữ Liệu Trước Khi Xóa (Kết Quả SELECT Từ 4.3) Và Lưu Trữ Trong `before_value`.
- Thực Thi SQL Sau Để Thực Hiện Xóa Logic.
```sql
UPDATE m_tanka
SET deleted_at = NOW(),
    updated_by = :user_account_id
WHERE tanka_id = :tanka_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

### 4.6 Ghi Nhật Ký Hoạt Động
- Thực Thi SQL Sau Để Ghi Lại Nhật Ký Hoạt Động.
```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn Hình Tìm Kiếm Chi Tiết Chủ Yếu Đơn Giá (ACSMS-SCR-002)', 'DELETE', 1,
        :tanka_id, 'm_tanka',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**before_value Ví Dụ:**
```json
`before_value`: Dữ Liệu Trước Khi Xóa Được Lưu Trữ Ở Định Dạng JSON. Không Bao Gồm Thông Tin Bảo Mật Như Mật Khẩu.
`after_value`: Đặt Chuỗi Trống Cho DELETE.

{
  "tanka_id": 5,
  "ja_id": 1,
  "tanka_type": 1,
  "tanka_code": "T005",
  "tanka_name": "Đơn Giá Cần Xóa",
  "kingaku_zeikomi": 3000,
  "kingaku_zeinuki": 2727,
  "tax_rate": 10.00,
  "tekiyo_start_date": "2026-01-01",
  "tekiyo_end_date": null
}
```

### 4.7 Tạo Phản Hồi
- Trả Về Tin Nhắn Thành Công.

### 4.8 Xử Lý Ngoại Lệ
- Nếu Có Lỗi Kết Nối Cơ Sở Dữ Liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ngay Cả Khi Xảy Ra Lỗi, Hãy Ghi Nhật Ký Hoạt Động (log_type = 3).
```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn Hình Tìm Kiếm Chi Tiết Chủ Yếu Đơn Giá (ACSMS-SCR-002)', 'DELETE', 2,
        :tanka_id, 'm_tanka',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
