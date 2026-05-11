---
customer_name: Công ty Báo Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý độc giả đám mây
document_name: Thiết kế API
screen_id: ACSMS-SCR-022
screen_name: Màn hình tải xuống tệp
format_code: 18-BM/PM/VTI
format_version: "1.1"
issue_date: 2026-05-08
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/05/08
updated_by: Tran Duc Tuyen
---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | ---------- | ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1   | 2026/05/07 | 1.0  | Tran Duc Tuyen | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/08 | 1.1  | Tran Duc Tuyen | Thay đổi nguồn dữ liệu thành `t_file_upload` (tệp được đăng ký trên S3 + DB khi tải lên, màn hình này chỉ hỗ trợ tìm kiếm / xem trước / tải xuống). Menu thả xuống tỉnh thành được sử dụng từ API chung hiện có `ACSMS-API-COMMON-001` (`GET /api/v1/todofuken`, định nghĩa từ: SCR-009) để trả về tất cả 47 tỉnh thành. | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là một hệ thống quản lý độc giả loại đám mây cho các JA, cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản ngân hàng, v.v.

Các chức năng chính bao gồm đăng ký/cập nhật/tìm kiếm thông tin độc giả, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản ngân hàng, chức năng tải lên/tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng.

## Mục đích tài liệu

Tài liệu này mô tả chi tiết các API mới được tạo trong "Màn hình tải xuống tệp (ACSMS-SCR-022)".

## Tài liệu liên quan

| Số | Mã tài liệu | Tên tài liệu |
| --- | ---------------------- | ------------------------------------------------------------------------------------- |
| 1   | ACSMS-SCR-022          | Thiết kế màn hình tải xuống tệp |
| 2   | ACSMS-API-COMMON-001   | Get Prefecture List (`GET /api/v1/todofuken`) — dành cho menu thả xuống tỉnh thành. Định nghĩa từ: SCR-009 |

※ Màn hình này chỉ cung cấp xem / xem trước / tải xuống tệp đã tải lên (`t_file_upload` bảng + S3). Tải lên mới được thực hiện trên màn hình khác (SCR-021, v.v.).
※ Menu thả xuống tỉnh thành sử dụng `ACSMS-API-COMMON-001`, trả về tất cả 47 tỉnh thành (không lọc theo vai trò). Hoạt động phía FE sẽ chọn `todofuken_code` và chuyển cho điều kiện tìm kiếm.

## Danh sách lỗi

| # | Loại lỗi | Mã lỗi | Thông báo lỗi | Ghi chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST | Thông số yêu cầu không hợp lệ. | HTTP 400 |
| 2   | Chung | UNAUTHORIZED | Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 3   | Chung | FORBIDDEN | Bạn không có quyền truy cập màn hình này. | HTTP 403 |
| 4   | Chung | DATA_SCOPE_VIOLATION | Bạn không có quyền truy cập dữ liệu này. | HTTP 403 |
| 5   | Chung | VALIDATION_ERROR | Giá trị nhập không hợp lệ. Vui lòng xem chi tiết trong trường errors. | HTTP 400 |
| 6   | Chung | TOO_MANY_REQUESTS | Số lượng yêu cầu đã vượt quá giới hạn. Vui lòng thử lại sau. | HTTP 429 |
| 7   | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | HTTP 500 |
| 8   | Riêng màn hình | NOT_FOUND | Không tìm thấy tệp được chỉ định. | HTTP 404 |

---

# API ACSMS-API-022-001

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Get File List |
| Mô tả | Lấy danh sách tệp đã tải lên (hỗ trợ tìm kiếm + phân trang). Nguồn dữ liệu là bảng `t_file_upload`. Chỉ trả về những tệp mà người dùng đã đăng nhập có thể xem được theo DataScope. |
| URI | /api/v1/file-upload |
| Phương thức | GET |
| Thân yêu cầu | Không có |
| Thông số yêu cầu | Thông số truy vấn (xem bên dưới) |
| Header | Content-Type: application/json ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã phản hồi HTTP | 200: Đã lấy danh sách tệp thành công, 400: Giá trị nhập không hợp lệ, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 500: Đã xảy ra lỗi hệ thống |

## Thông số yêu cầu

| # | ID thông số | Loại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --------------- | ------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | file_name       | String  |      | 1      | 255    | Tên tệp (tìm kiếm khớp một phần / LIKE) |
| 2   | todofuken_code  | String  |      | 2      | 2      | Mã tỉnh thành (số 0-9, 2 chữ số, ví dụ: "13") |
| 3   | page            | Integer |      | -      | -      | Số trang (bắt đầu từ 1, mặc định 1, tối thiểu 1) |
| 4   | per_page        | Integer |      | -      | -      | Số mục trên mỗi trang (mặc định 20, tối thiểu 1, tối đa 100) |
| 5   | sort_by         | String  |      | -      | -      | Cột sắp xếp (cho phép: `upload_datetime`, `file_name`, `created_by` / mặc định `upload_datetime`) |
| 6   | sort_order      | String  |      | -      | -      | Thứ tự sắp xếp (`asc`/`desc` / mặc định `desc`) |

## Dữ liệu phản hồi

| # | ID mục | Loại | Định dạng | Nullable | Mô tả |
| --- | --------------------- | ------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                  | Array<Object> | -                    |          | Mảng danh sách tệp (trống khi không có mục) |
| 2   | →file_upload_id       | Integer       | -                    |          | ID tải lên tệp (PK) |
| 3   | →ja_id                | Integer       | -                    | 〇       | ID JA (FK: m_ja.ja_id). NULL nếu tệp dành cho tất cả JA |
| 4   | →upload_datetime      | String        | YYYY/MM/DD HH:mm:ss  |          | Ngày giờ tải lên (định dạng ISO 8601, ví dụ: `2026-05-07T10:30:00+09:00`) |
| 5   | →file_name            | String        | -                    |          | Tên tệp |
| 6   | →file_size            | Integer       | -                    | 〇       | Kích thước tệp (byte) |
| 7   | →record_count         | Integer       | -                    | 〇       | Số bản ghi |
| 8   | →status               | Integer       | -                    |          | Trạng thái xử lý (1: Đang xử lý, 2: Hoàn thành, 3: Lỗi) |
| 9   | →created_by           | String        | -                    |          | ID đăng nhập người tạo (m_account.login_id) |
| 10  | →created_by_name      | String        | -                    |          | Tên người tạo (JOIN từ m_account.account_name) |
| 11  | →created_at           | String        | YYYY/MM/DD HH:mm:ss  |          | Ngày tạo (định dạng ISO 8601) |
| 12  | meta                  | Object        | -                    |          | Thông tin phân trang |
| 13  | →total                | Integer       | -                    |          | Tổng số kết quả tìm kiếm |
| 14  | →page                 | Integer       | -                    |          | Số trang hiện tại |
| 15  | →per_page             | Integer       | -                    |          | Số mục trên mỗi trang |
| 16  | →total_pages          | Integer       | -                    |          | Tổng số trang |

## Ví dụ yêu cầu

```
GET /api/v1/file-upload?file_name=zougen&todofuken_code=13&page=1&per_page=20&sort_by=upload_datetime&sort_order=desc
```

## Ví dụ phản hồi thành công

```json
{
  "data": [
    {
      "file_upload_id": 101,
      "ja_id": 1,
      "upload_datetime": "2026-05-07T10:30:00+09:00",
      "file_name": "zougen_tsuchi_202604.pdf",
      "file_size": 524288,
      "record_count": 250,
      "status": 2,
      "created_by": "nichino_admin01",
      "created_by_name": "Quản lý Nhật Nông",
      "created_at": "2026-05-07T10:30:00+09:00"
    },
    {
      "file_upload_id": 102,
      "ja_id": null,
      "upload_datetime": "2026-05-06T15:00:00+09:00",
      "file_name": "kouza_furikae_20260506.csv",
      "file_size": 102400,
      "record_count": 80,
      "status": 2,
      "created_by": "nichino_staff02",
      "created_by_name": "Nhân viên Nhật Nông",
      "created_at": "2026-05-06T15:00:00+09:00"
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

## Ví dụ phản hồi lỗi

### HTTP 400 — VALIDATION_ERROR

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ. Vui lòng xem chi tiết trong trường errors.",
  "errors": [
    { "field": "todofuken_code", "message": "Mã tỉnh thành phải là số 0-9, 2 chữ số." },
    { "field": "per_page", "message": "Số mục trên mỗi trang phải trong khoảng 1-100." }
  ]
}
```

### HTTP 401 — UNAUTHORIZED

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
}
```

### HTTP 403 — FORBIDDEN

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này."
}
```

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
}
```

## Quy trình xử lý

### 4.1 Xác thực thông số yêu cầu

- `file_name`: Tùy chọn. Tối đa 255 ký tự. Tự động cắt khoảng trắng đầu/cuối.
- `todofuken_code`: Tùy chọn. Số 0-9, 2 chữ số (`^\d{2}$`).
- `page`: Tùy chọn (mặc định 1). Số nguyên, tối thiểu 1.
- `per_page`: Tùy chọn (mặc định 20). Số nguyên, 1-100.
- `sort_by`: Tùy chọn (mặc định `upload_datetime`). Giá trị cho phép: `upload_datetime`, `file_name`, `created_by`. Giá trị khác trả về HTTP 400 (`VALIDATION_ERROR`).
- `sort_order`: Tùy chọn (mặc định `desc`). Giá trị cho phép: `asc`, `desc`.

### 4.2 Kiểm tra xác thực và ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `file.download`
- Vai trò có quyền: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN (5 vai trò)
- Nếu không đủ quyền: HTTP 403 (`FORBIDDEN`)
- DataScope (`t_file_upload.ja_id` dựa trên):
  - `NICHINO_ADMIN` / `NICHINO_STAFF`: Xem được tất cả tệp (không lọc)
  - `CHUOKAI`: Tệp của chuokai của mình + tệp của JA được quản lý + tệp dành cho tất cả JA (`fu.ja_id IN (:managed_ja_ids) OR fu.ja_id IS NULL`)
  - `JA_HONTEN`: Tệp của JA của mình + tệp dành cho tất cả JA (`fu.ja_id = :user_ja_id OR fu.ja_id IS NULL`)
  - `JA_KANRI_SHITEN`: Tệp của JA của mình + tệp dành cho tất cả JA (`fu.ja_id = :user_ja_id OR fu.ja_id IS NULL`) ※ không lọc theo đơn vị quản lý

### 4.3 Thiết lập điều kiện lấy dữ liệu

- Mệnh đề WHERE tìm kiếm:
  - `t_file_upload.deleted_at IS NULL` (không lấy bản ghi đã xóa mềm)
  - `file_name ILIKE '%' || :file_name || '%'` (chỉ khi được chỉ định)
  - Lọc mã tỉnh thành áp dụng cho **tỉnh thành của JA mà tệp thuộc về**: sử dụng chuỗi JOIN `t_file_upload.ja_id` → `m_ja.ja_id` → `m_ja.todofuken_code`. Không phải tỉnh thành của người tạo `m_account.todofuken_code` (tệp do quản trị viên tạo sẽ có tỉnh thành của người tạo là NULL, sẽ bị loại trừ).
  - Khi chỉ định `:todofuken_code`, tệp `ja_id IS NULL` (tất cả JA) không được đưa vào kết quả (LEFT JOIN sẽ có `j.todofuken_code IS NULL`, `NULL = :code` là FALSE). Tệp dành cho tất cả JA chỉ được hiển thị trong danh sách mặc định không có bộ lọc tỉnh thành.
- Mệnh đề WHERE DataScope (áp dụng quy tắc riêng vai trò từ 4.2)

### 4.4 Lấy số lượng dữ liệu

```sql
SELECT COUNT(*) AS total
  FROM t_file_upload fu
  LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
 WHERE fu.deleted_at IS NULL
   AND (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fu.ja_id IS NULL
     OR fu.ja_id IN (:managed_ja_ids)
   )
```

### 4.5 Lấy dữ liệu

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.upload_datetime,
    fu.file_name,
    fu.file_size,
    fu.record_count,
    fu.status,
    fu.created_by,
    a.account_name AS created_by_name,
    fu.created_at
  FROM t_file_upload fu
  LEFT JOIN m_ja j      ON j.ja_id    = fu.ja_id      AND j.deleted_at IS NULL
  LEFT JOIN m_account a ON a.login_id = fu.created_by AND a.deleted_at IS NULL
 WHERE fu.deleted_at IS NULL
   AND (:file_name IS NULL OR fu.file_name ILIKE '%' || :file_name || '%')
   AND (:todofuken_code IS NULL OR j.todofuken_code = :todofuken_code)
   AND (
     :role_code IN ('NICHINO_ADMIN', 'NICHINO_STAFF')
     OR fu.ja_id IS NULL
     OR fu.ja_id IN (:managed_ja_ids)
   )
 ORDER BY :sort_by :sort_order
 LIMIT :per_page OFFSET (:page - 1) * :per_page
```

### 4.6 Tạo phản hồi

- Ánh xạ kết quả SELECT trên vào mảng `data`.
- Đặt `meta` với tổng số từ 4.4, `page` / `per_page` / `total_pages = CEIL(total / per_page)`.
- Nếu kết quả tìm kiếm bằng 0: trả về `data: []` + `meta.total: 0` (HTTP 200).

### 4.7 Xử lý ngoại lệ

- Nếu có lỗi xác thực: HTTP 400 (`VALIDATION_ERROR`) + mảng errors
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)
- Nếu vi phạm DataScope: HTTP 403 (`DATA_SCOPE_VIOLATION`)
- Nếu lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Nếu vượt quá giới hạn tốc độ: HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-022-002

## Tổng quan

| Mục | Nội dung |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Get File Preview |
| Mô tả | Lấy URL có chữ ký để xem trước tệp (URL được ký S3 ngắn hạn) + thông tin meta. Hiển thị trên phía FE trong modal. Nguồn dữ liệu là `t_file_upload`. |
| URI | /api/v1/file-upload/{file_upload_id}/preview |
| Phương thức | GET |
| Thân yêu cầu | Không có |
| Thông số yêu cầu | file_upload_id (thông số đường dẫn) |
| Header | Content-Type: application/json ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã phản hồi HTTP | 200: Đã lấy thông tin xem trước thành công, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy tệp được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Thông số yêu cầu

| # | ID thông số | Loại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_upload_id  | Integer | ✓    | -      | -      | ID tải lên tệp (thông số đường dẫn, tối thiểu 1) |

## Dữ liệu phản hồi

| # | ID mục | Loại | Định dạng | Nullable | Mô tả |
| --- | ----------------- | ------ | -------------------- | -------- | --------------------------------------------------------------------- |
| 1   | data              | Object | -                    |          | Thông tin xem trước |
| 2   | →file_upload_id   | Integer | -                   |          | ID tải lên tệp |
| 3   | →file_name        | String  | -                   |          | Tên tệp (tên gốc) |
| 4   | →file_size        | Integer | -                   | 〇       | Kích thước tệp (byte) |
| 5   | →content_type     | String  | -                   |          | Loại MIME nội dung (ví dụ: `application/pdf`, `text/csv`) |
| 6   | →preview_url      | String  | -                   |          | URL có chữ ký để xem trước (S3 presigned URL, hết hạn trong 1 giờ) |
| 7   | →expires_at       | String  | YYYY/MM/DD HH:mm:ss |          | Thời gian hết hạn của URL có chữ ký (định dạng ISO 8601) |

## Ví dụ yêu cầu

```
GET /api/v1/file-upload/101/preview
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "file_upload_id": 101,
    "file_name": "zougen_tsuchi_202604.pdf",
    "file_size": 524288,
    "content_type": "application/pdf",
    "preview_url": "https://s3.ap-northeast-1.amazonaws.com/agrinews-prod-files/ja-1/zougen_tsuchi_202604.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&...",
    "expires_at": "2026-05-07T11:30:00+09:00"
  }
}
```

## Ví dụ phản hồi lỗi

### HTTP 401 — UNAUTHORIZED

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
}
```

### HTTP 403 — FORBIDDEN

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này."
}
```

### HTTP 404 — NOT_FOUND

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy tệp được chỉ định."
}
```

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
}
```

## Quy trình xử lý

### 4.1 Xác thực thông số yêu cầu

- `file_upload_id`: Bắt buộc, số nguyên, tối thiểu 1.

### 4.2 Kiểm tra xác thực và ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `file.download`
- Vai trò có quyền: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN (5 vai trò)
- Nếu không đủ quyền: HTTP 403 (`FORBIDDEN`)
- DataScope: Giống như API-022-001 (tệp `ja_id IS NULL` dành cho tất cả JA có thể xem được bởi tất cả vai trò). Nếu `ja_id` của bản ghi nằm ngoài phạm vi của người dùng, trả về HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại - quy tắc `assertJaScope` trong security.md).

### 4.3 Lấy dữ liệu

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.file_name,
    fu.file_path,
    fu.file_size
  FROM t_file_upload fu
 WHERE fu.file_upload_id = :file_upload_id
   AND fu.deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.4 Tạo phản hồi

- Xác định `content_type` từ phần mở rộng tệp (`.pdf` → `application/pdf`, `.csv` → `text/csv`, `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- Phát hành URL có chữ ký với S3 SDK cho `file_path` (hết hạn trong 3600 giây / 1 giờ).
- Trả về phản hồi chứa `preview_url` + `expires_at`.

### 4.5 Xử lý ngoại lệ

- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)
- Nếu bản ghi không tồn tại hoặc vi phạm DataScope: HTTP 404 (`NOT_FOUND`)
- Nếu lỗi kết nối S3 / DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Nếu vượt quá giới hạn tốc độ: HTTP 429 (`TOO_MANY_REQUESTS`)

---

# API ACSMS-API-022-003

## Tổng quan

| Mục | Nội dung |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Download File |
| Mô tả | Trả về tệp được chỉ định dưới dạng luồng nhị phân. Header phản hồi `Content-Disposition: attachment; filename="..."` sẽ hiển thị hộp thoại lưu trong trình duyệt. Đồng thời ghi lại lịch sử tải xuống (`t_file_download`) và nhật ký hoạt động (`t_log`, log_type=4) mỗi cái 1 bản ghi. Nguồn dữ liệu là `t_file_upload`. |
| URI | /api/v1/file-upload/{file_upload_id}/download |
| Phương thức | GET |
| Thân yêu cầu | Không có |
| Thông số yêu cầu | file_upload_id (thông số đường dẫn) |
| Header | Content-Type: application/json ※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã phản hồi HTTP | 200: Đã tải xuống tệp thành công (phản hồi nhị phân), 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy tệp được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Thông số yêu cầu

| # | ID thông số | Loại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --------------- | ------- | ---- | ------ | ------ | ------------------------------------------------------------- |
| 1   | file_upload_id  | Integer | ✓    | -      | -      | ID tải lên tệp (thông số đường dẫn, tối thiểu 1) |

## Dữ liệu phản hồi

Khi thành công, trả về luồng nhị phân. Không có thân JSON. Trả về các header sau:

| Header | Mô tả |
| --------------------- | ------------------------------------------------------------------------------------- |
| Content-Type          | Loại MIME của tệp (ví dụ: `application/pdf`, `text/csv`, `application/octet-stream`) |
| Content-Disposition   | `attachment; filename="<file_name>"; filename*=UTF-8''<URL-encoded file_name>` |
| Content-Length        | Kích thước tệp (byte) |
| Cache-Control         | `no-store` |

## Ví dụ yêu cầu

```
GET /api/v1/file-upload/101/download
```

## Ví dụ phản hồi thành công

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_tsuchi_202604.pdf"; filename*=UTF-8''zougen_tsuchi_202604.pdf
Content-Length: 524288
Cache-Control: no-store

<binary PDF stream>
```

## Ví dụ phản hồi lỗi

### HTTP 401 — UNAUTHORIZED

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
}
```

### HTTP 403 — FORBIDDEN

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này."
}
```

### HTTP 404 — NOT_FOUND

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy tệp được chỉ định."
}
```

### HTTP 500 — INTERNAL_SERVER_ERROR

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
}
```

## Quy trình xử lý

※ Phần 4.4 Lấy tệp / 4.5 Ghi lại lịch sử tải xuống / 4.6 Ghi lại nhật ký hoạt động được thực hiện trong một giao dịch duy nhất. Nếu bất kỳ phần nào thất bại, hãy khôi phục tất cả. Nhật ký lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng bên ngoài giao dịch.

### 4.1 Xác thực thông số yêu cầu

- `file_upload_id`: Bắt buộc, số nguyên, tối thiểu 1.

### 4.2 Kiểm tra xác thực và ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `file.download`
- Vai trò có quyền: NICHINO_ADMIN / NICHINO_STAFF / CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN (5 vai trò)
- Nếu không đủ quyền: HTTP 403 (`FORBIDDEN`)
- DataScope: Giống như API-022-001. Nếu nằm ngoài phạm vi, trả về HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại).

### 4.3 Lấy dữ liệu

```sql
SELECT
    fu.file_upload_id,
    fu.ja_id,
    fu.file_name,
    fu.file_path,
    fu.file_size,
    fu.record_count
  FROM t_file_upload fu
 WHERE fu.file_upload_id = :file_upload_id
   AND fu.deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.4 Lấy tệp

- Lấy đối tượng `file_path` bằng AWS S3 SDK và đưa vào luồng phản hồi.
- Header phản hồi:
  - `Content-Type`: Xác định từ phần mở rộng tệp (cùng logic với API-022-002)
  - `Content-Disposition`: `attachment; filename="<file_name>"; filename*=UTF-8''<URL-encoded file_name>`
  - `Content-Length`: `fu.file_size`
  - `Cache-Control`: `no-store`

### 4.5 Ghi lại lịch sử tải xuống (`t_file_download`)

- Mỗi lần bấm nút, INSERT 1 bản ghi vào bảng `t_file_download` (lịch sử tải xuống).

```sql
INSERT INTO t_file_download (
    ja_id,
    download_datetime,
    download_type,
    file_name,
    file_path,
    file_size,
    record_count,
    target_month,
    created_at,
    created_by
) VALUES (
    :user_ja_id,            -- JA của người thực hiện tải xuống. NICHINO_* cho phép NULL
    NOW(),                  -- Ngày giờ tải xuống
    :download_type,         -- Xác định từ phần mở rộng / quy tắc đặt tên tệp (1: Chuyển khoản ngân hàng, 2: Khác, 3: Thông báo thay đổi, 4: Thông báo thay đổi, 5: Danh sách độc giả)
    :file_name,             -- Tên tệp gốc (`fu.file_name`)
    :file_path,             -- Đường dẫn S3 (`fu.file_path`)
    :file_size,             -- Kích thước tệp (`fu.file_size`)
    :record_count,          -- Số bản ghi (`fu.record_count`, NULL nếu là 0)
    :target_month,          -- Tháng năm đối tượng (YYYYMM, lấy từ tên tệp. Nếu không thể xác định là chuỗi trống)
    NOW(),
    :user_login_id          -- ID đăng nhập người thực hiện tải xuống (`m_account.login_id`)
)
RETURNING file_download_id
```

- `download_type` được xác định theo thứ tự ưu tiên sau:
  - Tên tệp chứa `kouza_furikae` → 1 (Chuyển khoản ngân hàng)
  - Tên tệp chứa `zougen_renraku` → 3 (Thông báo thay đổi)
  - Tên tệp chứa `zougen_tsuchi` → 4 (Thông báo thay đổi)
  - Tên tệp chứa `meibo` hoặc `dokusya_meibo` → 5 (Danh sách độc giả)
  - Không khớp với bất kỳ cái nào ở trên → 2 (Khác)
- `ja_id` của `t_file_download` là JA của người thực hiện tải xuống. Khi NICHINO_ADMIN / NICHINO_STAFF tải xuống tệp dành cho tất cả JA (`fu.ja_id IS NULL`), cho phép `t_file_download.ja_id = NULL`.
- Tải xuống cùng một tệp nhiều lần sẽ tăng số hàng trong `t_file_download` (giữ tất cả bản ghi như lịch sử).

### 4.6 Ghi lại nhật ký hoạt động (`t_log`)

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :user_ja_id,
        'Màn hình tải xuống tệp', 'DOWNLOAD', 1,
        :file_upload_id, 't_file_upload',
        '',
        :downloaded_file_metadata_json,
        :ip_address, :user_agent)
```

- `log_type = 4` (Hoạt động tệp).
- `operation = 'DOWNLOAD'` (Hoạt động tải xuống).
- `before_value`: Chuỗi trống (không thay đổi trạng thái khi lấy).
- `after_value`: JSON thông tin meta của tệp được tải xuống (`file_upload_id`, `file_download_id` (giá trị RETURNING từ 4.5), `file_name`, `file_size`, `ja_id`).

### 4.7 Tạo phản hồi

- Gửi luồng nhị phân cho client.
- Đặt header ở trên.
- Trạng thái 200.

### 4.8 Xử lý ngoại lệ

- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)
- Nếu bản ghi không tồn tại hoặc vi phạm DataScope: HTTP 404 (`NOT_FOUND`)
- Nếu lỗi kết nối S3 / DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Nếu vượt quá giới hạn tốc độ: HTTP 429 (`TOO_MANY_REQUESTS`)
- Chính sách khôi phục giao dịch:
  - Nếu INSERT `t_file_download` hoặc `t_log` thất bại, khôi phục toàn bộ giao dịch và coi tải xuống là thất bại (HTTP 500).
  - ※ Luồng S3 hoạt động bên BE gửi byte đầu tiên trước khi COMMIT giao dịch (khi COMMIT thất bại, trả về 500 cho client và dừng gửi HTTP body).
- Ghi lại nhật ký lỗi (riêng bên ngoài giao dịch):

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :user_ja_id,
        'Màn hình tải xuống tệp', 'DOWNLOAD', 2,
        :file_upload_id, 't_file_upload',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
