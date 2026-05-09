---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-010
screen_name: メニュー画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-17
created_date: 2026/04/17
created_by: Nguyen Duyen Manh
updated_date: 2026/04/17
updated_by: Nguyen Duyen Manh
---

## Lịch Sử Thay Đổi

| No  | Ngày Phát Hành | Phiên Bản | Người Phụ Trách | Nội Dung Thay Đổi | Người Xác Nhận | Người Phê Duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/17 | 1.0  | Nguyen Duyen Manh | Tạo Phiên Bản Ban Đầu | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng Quan Hệ Thống

Hệ thống này là một hệ thống quản lý người đăng ký dựa trên điện toán đám mây cho các JA, cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật, tìm kiếm thông tin người đăng ký, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động, tính năng tải lên và tải xuống tệp, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng, v.v.

## Mục Đích Tài Liệu

Tài liệu này mô tả chi tiết về các API mới được tạo trên hệ thống cho "Màn Hình Trình Đơn (ACSMS-SCR-010)".

## Tài Liệu Liên Quan

| No  | Mã Tài Liệu | Tên Tài Liệu |
| --- | ------------- | ---------------------------- |
| 1   | ACSMS-SCR-031 | API Thiết Kế Màn Hình Danh Sách Thông Báo   |
| 2   | ACSMS-SCR-020 | API Thiết Kế Màn Hình Tìm Kiếm Chi Tiết Người Đăng Ký |

※ Thông tin tài khoản và danh sách quyền được sử dụng trong màn hình này được lấy từ phản hồi khi đăng nhập và được giữ bởi giao diện người dùng trong kho lưu trữ phiên. Chúng tôi không lấy lại những thông tin này trong màn hình này.
※ Danh sách mục trình đơn không được lấy động mà được xác định trước trên giao diện người dùng bằng cách so sánh định nghĩa trình đơn được xác định trước với mảng `permissions` được lấy khi đăng nhập để xác định những trình đơn nào sẽ hiển thị.

## Danh Sách Lỗi

| #   | Loại Lỗi | Mã Lỗi | Tin Nhắn Lỗi | Ghi Chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST | Các Tham Số Yêu Cầu Không Hợp Lệ. | HTTP 400 |
| 2   | Chung | UNAUTHORIZED | Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại. | HTTP 401 |
| 3   | Chung | FORBIDDEN | Bạn Không Có Quyền Truy Cập Màn Hình Này. | HTTP 403 |
| 4   | Chung | TOO_MANY_REQUESTS | Số Lượng Yêu Cầu Đã Vượt Quá Giới Hạn. Vui Lòng Thử Lại Sau Một Lúc. | HTTP 429 |
| 5   | Chung | INTERNAL_SERVER_ERROR | Đã Xảy Ra Lỗi Hệ Thống. Vui Lòng Thử Lại Sau Một Lúc. | HTTP 500 |
| 6   | Cụ Thể Màn Hình | DENSHI_NOT_ENABLED | Chức Năng Phiên Bản Điện Tử Không Được Kích Hoạt Cho Tài Khoản Này. | HTTP 403 |

---

# API ACSMS-API-010-001

## Tóm Tắt

| Mục | Nội Dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Lấy Danh Sách Thông Báo Trình Đơn |
| Tóm Tắt | Lấy danh sách thông báo cho màn hình trình đơn (chỉ những thông báo đang công bố, dành cho màn hình trình đơn, trong thời gian hiển thị) |
| URI | /api/v1/oshirase/menu |
| Phương Pháp | GET |
| Thân Yêu Cầu | Không |
| Tham Số Yêu Cầu | Tham Số Truy Vấn |
| Tiêu Đề | Content-Type: application/json※ Thông Tin Xác Thực Được Gửi Tự Động Thông Qua Cookie HTTP-only |
| Mã Phản Hồi HTTP | 200: Lấy Danh Sách Thông Báo Thành Công, 401: Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại, 500: Đã Xảy Ra Lỗi Hệ Thống |

## Tham Số Yêu Cầu

| #   | ID Tham Số | Loại | Lặp Lại | Bắt Buộc | Chiều Dài Tối Thiểu | Chiều Dài Tối Đa | Mô Tả |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------ |
| 1   | limit | Số | - | - | | | Số Lượng Thông Báo Tối Đa Cần Lấy (Mặc Định: 20, Tối Đa: 100) |

## Dữ Liệu Phản Hồi

Vì được hiển thị ở hai vị trí khác nhau trên màn hình, phản hồi được chia thành hai phần khi trả về.
- `oshirase_list`: Danh sách thông báo bình thường (`oshirase_type != 4`)
- `deadline_notice`: Thông báo về thời gian hạn chót (`oshirase_type = 4` và `publish_location = 2`, nếu không có bản ghi phù hợp, hãy trả về `null`)

| #   | ID Mục | Loại | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả |
| --- | ----------------------------------- | ------- | -------- | ---------------- | -------- | ---------------------------------------------------------- |
| 1   | data | Đối Tượng | - | | - | Dữ Liệu Thông Báo Màn Hình Trình Đơn |
| 2   | →oshirase_list | Mảng | 〇 | | - | Danh Sách Thông Báo Bình Thường (oshirase_type != 4) |
| 3   | →→oshirase_id | Số | - | | - | ID Thông Báo |
| 4   | →→title | Chuỗi | - | | - | Tiêu Đề Thông Báo |
| 5   | →→content | Chuỗi | - | | - | Nội Dung |
| 6   | →→oshirase_type | Số | - | | - | Loại Thông Báo (1: Hệ Thống, 2: Quan Trọng, 3: Chung) |
| 7   | →→oshirase_type_label | Chuỗi | - | | - | Nhãn Loại Thông Báo |
| 8   | →→publish_start_date | Chuỗi | - | YYYY/MM/DD HH:mm | - | Ngày Giờ Bắt Đầu Công Bố |
| 9   | →→publish_end_date | Chuỗi | - | YYYY/MM/DD HH:mm | 〇 | Ngày Giờ Kết Thúc Công Bố (NULL = Vô Thời Hạn) |
| 10  | →→is_new | Boolean | - | | - | Cờ NEWW (true Nếu Trong Vòng 7 Ngày Từ Ngày Bắt Đầu Công Bố) |
| 11  | →→ja_id | Số | - | | 〇 | ID JA (NULL = Cho Tất Cả JA) |
| 12  | →deadline_notice | Đối Tượng | - | | 〇 | Thông Báo Thời Gian Hạn Chót (null Nếu Không Áp Dụng) |
| 13  | →→oshirase_id | Số | - | | - | ID Thông Báo |
| 14  | →→title | Chuỗi | - | | - | Tiêu Đề Thông Báo |
| 15  | →→content | Chuỗi | - | | - | Nội Dung |
| 16  | →→oshirase_type | Số | - | | - | Loại Thông Báo (4: Thời Gian Hạn Chót - Cố Định) |
| 17  | →→oshirase_type_label | Chuỗi | - | | - | Nhãn Loại Thông Báo (Thời Gian Hạn Chót) |
| 18  | →→publish_start_date | Chuỗi | - | YYYY/MM/DD HH:mm | - | Ngày Giờ Bắt Đầu Công Bố |
| 19  | →→publish_end_date | Chuỗi | - | YYYY/MM/DD HH:mm | 〇 | Ngày Giờ Kết Thúc Công Bố (NULL = Vô Thời Hạn) |
| 20  | →→is_new | Boolean | - | | - | Cờ NEW (true Nếu Trong Vòng 7 Ngày Từ Ngày Bắt Đầu Công Bố) |

## Ví Dụ Yêu Cầu

```
GET /api/v1/oshirase/menu?limit=20
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "Thông Báo Bảo Trì Hệ Thống",
        "content": "Bảo trì hệ thống sẽ được thực hiện vào lúc 02:00～06:00 vào ngày 20 tháng 4 (Thứ Hai).",
        "oshirase_type": 1,
        "oshirase_type_label": "Hệ Thống",
        "publish_start_date": "2026/04/10 10:00",
        "publish_end_date": "2026/04/20 06:00",
        "is_new": true,
        "ja_id": null
      },
      {
        "oshirase_id": 1,
        "title": "Thông Báo Phát Hành Tính Năng Mới",
        "content": "Một tính năng mới đã được phát hành.",
        "oshirase_type": 3,
        "oshirase_type_label": "Chung",
        "publish_start_date": "2026/04/01 09:00",
        "publish_end_date": null,
        "is_new": false,
        "ja_id": 100
      }
    ],
    "deadline_notice": {
      "oshirase_id": 5,
      "title": "【Quan Trọng】Thông Báo Thay Đổi Thời Gian Hạn Chót",
      "content": "Từ tháng 4 năm 2026, thời gian hạn chót sẽ được thay đổi thành 17:00.",
      "oshirase_type": 4,
      "oshirase_type_label": "Thời Gian Hạn Chót",
      "publish_start_date": "2026/04/15 09:00",
      "publish_end_date": null,
      "is_new": true
    }
  }
}
```

### Ví Dụ Phản Hồi Thành Công (Không Có Thông Báo Thời Gian Hạn Chót)

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "Thông Báo Bảo Trì Hệ Thống",
        "content": "Bảo trì hệ thống sẽ được thực hiện vào lúc 02:00～06:00 vào ngày 20 tháng 4 (Thứ Hai).",
        "oshirase_type": 1,
        "oshirase_type_label": "Hệ Thống",
        "publish_start_date": "2026/04/10 10:00",
        "publish_end_date": "2026/04/20 06:00",
        "is_new": true,
        "ja_id": null
      }
    ],
    "deadline_notice": null
  }
}
```

## Ví Dụ Phản Hồi Lỗi

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại"
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
  - limit: Kiểm Tra Loại Số, 1～100
- Đặt Giá Trị Mặc Định (limit=20)
- Nếu Tham Số Không Hợp Lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm Tra Xác Thực và Ủy Quyền

- Xác Minh Thông Tin Xác Thực (Phiên Cookie HTTP-only).
- Nếu Xác Thực Không Thành Công: HTTP 401 (`UNAUTHORIZED`)
- API Này Có Thể Truy Cập Bởi Bất Kỳ Người Dùng Xác Thực Nào (Không Cần Quyền Cụ Thể).

### 4.3 Đặt Điều Kiện Lấy Dữ Liệu

- Lấy ja_id Của Người Dùng Đã Đăng Nhập (Tài Khoản Nông Nghiệp Nhật Bản là NULL).
- Điều Kiện Chung:
  - `publish_location = 2` (Cho Màn Hình Trình Đơn)
  - `status = 2` (Đang Công Bố)
  - `deleted_at IS NULL`
  - `publish_start_date <= NOW()` (Đã Bắt Đầu Công Bố)
  - `publish_end_date IS NULL OR publish_end_date >= NOW()` (Chưa Kết Thúc)
  - `ja_id IS NULL OR ja_id = :user_ja_id` (Cho Tất Cả JA Hoặc JA Của Người Dùng)
- Điều Kiện Bổ Sung oshirase_list: `oshirase_type != 4` (Loại Trừ Thời Gian Hạn Chót)
- Điều Kiện Bổ Sung deadline_notice: `oshirase_type = 4` (Chỉ Thời Gian Hạn Chót, Chỉ Lấy 1 Mục)

### 4.4 Lấy Danh Sách Thông Báo Bình Thường (oshirase_list)

```sql
SELECT oshirase_id, ja_id, oshirase_type,
       title, content, publish_start_date, publish_end_date,
       created_at
FROM t_oshirase
WHERE publish_location = 2
  AND status = 2
  AND oshirase_type != 4
  AND deleted_at IS NULL
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
  AND (ja_id IS NULL OR ja_id = :user_ja_id)
ORDER BY publish_start_date DESC
LIMIT :limit
```

### 4.5 Lấy Thông Báo Thời Gian Hạn Chót (deadline_notice)

- Theo Quy Tắc Kinh Doanh, Chỉ Tối Đa 1 Thông Báo Có `publish_location = 2` Và `oshirase_type = 4` Được Đăng Ký (Xem Kiểm Tra Đăng Ký Trong ACSMS-SCR-031).

```sql
SELECT oshirase_id, oshirase_type,
       title, content, publish_start_date, publish_end_date,
       created_at
FROM t_oshirase
WHERE publish_location = 2
  AND oshirase_type = 4
  AND status = 2
  AND deleted_at IS NULL
  AND publish_start_date <= NOW()
  AND (publish_end_date IS NULL OR publish_end_date >= NOW())
ORDER BY publish_start_date DESC
LIMIT 1
```

- Nếu Không Có Bản Ghi Phù Hợp, Đặt `deadline_notice` Thành `null`.

### 4.6 Tạo Phản Hồi

- Ánh Xạ Giá Trị oshirase_type Thành Nhãn (1→Hệ Thống, 2→Quan Trọng, 3→Chung, 4→Thời Gian Hạn Chót)
- Định Dạng publish_start_date / publish_end_date Thành Định Dạng `YYYY/MM/DD HH:mm`.
- Cờ is_new: true Nếu `publish_start_date` Nằm Trong Vòng 7 Ngày Từ Thời Gian Hiện Tại, Nếu Không Thì false
- Trả về JSON Chứa `data.oshirase_list` (Mảng) Và `data.deadline_notice` (Đối Tượng Hoặc null). HTTP 200.

### 4.7 Xử Lý Ngoại Lệ

- Lỗi Kết Nối Cơ Sở Dữ Liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-010-002

## Tóm Tắt

| Mục | Nội Dung |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Lấy Số Lượng Phê Duyệt Đang Chờ |
| Tóm Tắt | Lấy Số Lượng Người Đăng Ký Phiên Bản Điện Tử Đang Chờ Phê Duyệt (Chỉ Cho Tài Khoản Xử Lý Phiên Bản Điện Tử) |
| URI | /api/v1/dokusya/pending-approval/count |
| Phương Pháp | GET |
| Thân Yêu Cầu | Không |
| Tham Số Yêu Cầu | Không |
| Tiêu Đề | Content-Type: application/json※ Thông Tin Xác Thực Được Gửi Tự Động Thông Qua Cookie HTTP-only |
| Mã Phản Hồi HTTP | 200: Lấy Số Lượng Phê Duyệt Đang Chờ Thành Công, 401: Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại, 403: Chức Năng Phiên Bản Điện Tử Không Được Kích Hoạt / Bạn Không Có Quyền Truy Cập Màn Hình Này, 500: Đã Xảy Ra Lỗi Hệ Thống |

## Tham Số Yêu Cầu

Không

## Dữ Liệu Phản Hồi

| #   | ID Mục | Loại | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data | Đối Tượng | - | | - | Thông Tin Số Lượng Phê Duyệt Đang Chờ |
| 2   | →count | Số | - | | - | Số Lượng Phê Duyệt Đang Chờ |
| 3   | →ja_id | Số | - | | 〇 | ID JA Mục Tiêu (Cho Phạm Vi) |

## Ví Dụ Yêu Cầu

```
GET /api/v1/dokusya/pending-approval/count
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": {
    "count": 5,
    "ja_id": 100
  }
}
```

## Ví Dụ Phản Hồi Lỗi

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên Hết Hạn. Vui Lòng Đăng Nhập Lại"
}
```

### 403 Forbidden (Chức Năng Phiên Bản Điện Tử Được Vô Hiệu Hóa)

```json
{
  "error_code": "DENSHI_NOT_ENABLED",
  "message": "Chức Năng Phiên Bản Điện Tử Không Được Kích Hoạt Cho Tài Khoản Này"
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

- Không Có Tham Số Yêu Cầu.

### 4.2 Kiểm Tra Xác Thực và Ủy Quyền

- Xác Minh Thông Tin Xác Thực (Phiên Cookie HTTP-only).
- Nếu Xác Thực Không Thành Công: HTTP 401 (`UNAUTHORIZED`)
- Kiểm Tra Quyền: Xác Nhận Rằng Người Dùng Có Quyền `dokusya.view`.
  - Vai Trò Mục Tiêu: CHUOKAI (Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu Không Có Quyền: HTTP 403 (`FORBIDDEN`)
- Xác Nhận Cờ Xử Lý Phiên Bản Điện Tử: `m_account.denshi_flg = true`.
- Nếu `denshi_flg = false`: HTTP 403 (`DENSHI_NOT_ENABLED`)

### 4.3 Đặt Điều Kiện Lấy Dữ Liệu

- Lấy Phạm Vi Của Người Dùng Đã Đăng Nhập (ja_id, kanri_shiten_id, role_code).
- DataScope:
  - `CHUOKAI` / `JA_HONTEN`: `ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`: `ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`
- Điều Kiện Lọc:
  - `denshi_shonin_status = 1` (Chưa Phê Duyệt / Đang Chờ Phê Duyệt)
  - `deleted_at IS NULL` (Chưa Bị Xóa)

### 4.4 Lấy Số Lượng Dữ Liệu

```sql
SELECT COUNT(*) AS count
FROM t_dokusya
WHERE denshi_shonin_status = 1
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
  /* Nếu JA_KANRI_SHITEN, thêm phần sau */
  AND kanri_shiten_id = :user_kanri_shiten_id
```

### 4.5 Tạo Phản Hồi

- Trả về Đối Tượng data Chứa Số Lượng. HTTP 200.

### 4.6 Xử Lý Ngoại Lệ

- Lỗi Kết Nối Cơ Sở Dữ Liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
