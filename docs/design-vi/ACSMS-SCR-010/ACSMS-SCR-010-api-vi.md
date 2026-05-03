---
customer_name: Ngân hàng Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý người đăng ký trên nền tảng đám mây
document_name: Tài liệu thiết kế API
screen_id: ACSMS-SCR-010
screen_name: Màn hình Menu
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-17
created_date: 2026/04/17
created_by: Nguyễn Duyên Mạnh
updated_date: 2026/04/17
updated_by: Nguyễn Duyên Mạnh
---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/17 | 1.0  | Nguyễn Duyên Mạnh | Tạo phiên bản đầu tiên | Nguyễn Huy Đạt | Nguyễn Huy Đạt |

## Tổng quan hệ thống

Hệ thống này là một hệ thống quản lý người đăng ký dạng đám mây dành cho JA (tổ chức nông nghiệp),
cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin người đăng ký,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên và tải xuống tệp, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng,
ghi nhật ký lịch sử đăng nhập, ghi nhật ký hoạt động của người dùng, v.v.

## Mục đích tài liệu

Tài liệu này mô tả chi tiết về API mới được tạo trên hệ thống cho "Màn hình Menu (ACSMS-SCR-010)".

## Tài liệu liên quan

| Số | Mã tài liệu | Tên tài liệu |
| --- | ------------- | ---------------------------- |
| 1   | ACSMS-SCR-031 | Tài liệu thiết kế API - Màn hình danh sách thông báo |
| 2   | ACSMS-SCR-020 | Tài liệu thiết kế API - Màn hình tìm kiếm chi tiết người đăng ký |

※ Thông tin tài khoản và danh sách quyền hạn được sử dụng trên màn hình này được lấy từ phản hồi đăng nhập và giữ trong bộ nhớ session store của giao diện người dùng. Màn hình này không cần lấy lại thông tin này.
※ Danh sách mục menu không được lấy động mà được xác định sẵn trên giao diện người dùng, so sánh với danh sách định nghĩa menu đã được xác định trước đó và mảng `permissions` được lấy khi đăng nhập để xác định menu sẽ được hiển thị.

## Danh sách lỗi

| # | Loại lỗi | Mã lỗi | Thông báo lỗi | Ghi chú |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung | BAD_REQUEST | Tham số yêu cầu không hợp lệ. | HTTP 400 |
| 2   | Chung | UNAUTHORIZED | Phiên kết thúc rồi. Vui lòng đăng nhập lại. | HTTP 401 |
| 3   | Chung | FORBIDDEN | Bạn không có quyền truy cập màn hình này. | HTTP 403 |
| 4   | Chung | TOO_MANY_REQUESTS | Số lượng yêu cầu vượt quá giới hạn. Vui lòng thử lại sau. | HTTP 429 |
| 5   | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | HTTP 500 |
| 6   | Riêng biệt | DENSHI_NOT_ENABLED | Chức năng phiên bản điện tử không được kích hoạt cho tài khoản này. | HTTP 403 |

---

# API ACSMS-API-010-001

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API | Lấy danh sách thông báo cho Menu |
| Tổng quan | Lấy danh sách thông báo dành cho màn hình menu (chỉ những thông báo đang công khai, dành cho màn hình menu, nằm trong thời gian hiển thị) |
| URI | /api/v1/oshirase/menu |
| Phương thức | GET |
| Thân yêu cầu | Không có |
| Tham số yêu cầu | Tham số truy vấn |
| Header | Content-Type: application/json※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã phản hồi HTTP | 200:Lấy danh sách thông báo thành công, 401:Phiên kết thúc. Vui lòng đăng nhập lại, 500:Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

| # | ID Tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------ |
| 1   | limit | Number | - | - | | | Số lượng tối đa bản ghi thông báo được lấy (Mặc định: 20, Tối đa: 100) |

## Dữ liệu phản hồi

Vì có 2 vị trí khác nhau để hiển thị trên màn hình, phản hồi được chia thành 2 phần.
- `oshirase_list`: Danh sách thông báo thông thường (`oshirase_type != 4`)
- `deadline_notice`: Thông báo về thời gian hạn chót (`oshirase_type = 4` và `publish_location = 2`, nếu không có bản ghi phù hợp thì trả về `null`)

| # | ID Mục | Kiểu | Lặp lại | Định dạng | Có thể null | Mô tả |
| --- | ----------------------------------- | ------- | -------- | ---------------- | -------- | ---------------------------------------------------------- |
| 1   | data | Object | - | | - | Dữ liệu thông báo menu |
| 2   | →oshirase_list | Array | 〇 | | - | Danh sách thông báo thông thường (oshirase_type != 4) |
| 3   | →→oshirase_id | Number | - | | - | ID thông báo |
| 4   | →→title | String | - | | - | Tiêu đề thông báo |
| 5   | →→content | String | - | | - | Nội dung |
| 6   | →→oshirase_type | Number | - | | - | Loại thông báo (1:Hệ thống, 2:Quan trọng, 3:Tổng quát) |
| 7   | →→oshirase_type_label | String | - | | - | Nhãn loại thông báo |
| 8   | →→publish_start_date | String | - | YYYY/MM/DD HH:mm | - | Ngày giờ bắt đầu công khai |
| 9   | →→publish_end_date | String | - | YYYY/MM/DD HH:mm | 〇 | Ngày giờ kết thúc công khai (NULL = Vô thời hạn) |
| 10  | →→is_new | Boolean | - | | - | Cờ NEW (true nếu trong vòng 7 ngày từ ngày công khai) |
| 11  | →→ja_id | Number | - | | 〇 | ID JA (NULL=Dành cho tất cả JA) |
| 12  | →deadline_notice | Object | - | | 〇 | Thông báo thời gian hạn chót (null nếu không có) |
| 13  | →→oshirase_id | Number | - | | - | ID thông báo |
| 14  | →→title | String | - | | - | Tiêu đề thông báo |
| 15  | →→content | String | - | | - | Nội dung |
| 16  | →→oshirase_type | Number | - | | - | Loại thông báo (4:Thời gian hạn chót - cố định) |
| 17  | →→oshirase_type_label | String | - | | - | Nhãn loại thông báo (Thời gian hạn chót) |
| 18  | →→publish_start_date | String | - | YYYY/MM/DD HH:mm | - | Ngày giờ bắt đầu công khai |
| 19  | →→publish_end_date | String | - | YYYY/MM/DD HH:mm | 〇 | Ngày giờ kết thúc công khai (NULL = Vô thời hạn) |
| 20  | →→is_new | Boolean | - | | - | Cờ NEW (true nếu trong vòng 7 ngày từ ngày công khai) |

## Ví dụ yêu cầu

```
GET /api/v1/oshirase/menu?limit=20
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "Thông báo về bảo trì hệ thống",
        "content": "Sẽ tiến hành bảo trì hệ thống vào lúc 02:00 ~ 06:00 ngày 20 tháng 4 (thứ Hai).",
        "oshirase_type": 1,
        "oshirase_type_label": "Hệ thống",
        "publish_start_date": "2026/04/10 10:00",
        "publish_end_date": "2026/04/20 06:00",
        "is_new": true,
        "ja_id": null
      },
      {
        "oshirase_id": 1,
        "title": "Thông báo phát hành tính năng mới",
        "content": "Tính năng mới đã được phát hành.",
        "oshirase_type": 3,
        "oshirase_type_label": "Tổng quát",
        "publish_start_date": "2026/04/01 09:00",
        "publish_end_date": null,
        "is_new": false,
        "ja_id": 100
      }
    ],
    "deadline_notice": {
      "oshirase_id": 5,
      "title": "【Quan trọng】Về sự thay đổi thời gian hạn chót",
      "content": "Bắt đầu từ tháng 4 năm 2026, sẽ thay đổi thời gian hạn chót thành 17:00.",
      "oshirase_type": 4,
      "oshirase_type_label": "Thời gian hạn chót",
      "publish_start_date": "2026/04/15 09:00",
      "publish_end_date": null,
      "is_new": true
    }
  }
}
```

### Ví dụ phản hồi thành công (không có thời gian hạn chót)

```json
{
  "data": {
    "oshirase_list": [
      {
        "oshirase_id": 3,
        "title": "Thông báo về bảo trì hệ thống",
        "content": "Sẽ tiến hành bảo trì hệ thống vào lúc 02:00 ~ 06:00 ngày 20 tháng 4 (thứ Hai).",
        "oshirase_type": 1,
        "oshirase_type_label": "Hệ thống",
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

## Ví dụ phản hồi lỗi

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên kết thúc rồi. Vui lòng đăng nhập lại"
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

### 4.1 Xác thực tham số yêu cầu

- Xác thực tham số truy vấn:
  - limit: Kiểm tra kiểu số, phạm vi 1 ~ 100
- Đặt giá trị mặc định (limit=20)
- Nếu tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực và phân quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- API này có thể truy cập bởi bất kỳ người dùng được xác thực nào (không cần quyền cụ thể).

### 4.3 Thiết lập điều kiện lấy dữ liệu

- Lấy ja_id của người dùng đã đăng nhập (JA account có giá trị NULL).
- Điều kiện chung:
  - `publish_location = 2` (dành cho màn hình menu)
  - `status = 2` (đang công khai)
  - `deleted_at IS NULL`
  - `publish_start_date <= NOW()` (đã bắt đầu công khai)
  - `publish_end_date IS NULL OR publish_end_date >= NOW()` (chưa kết thúc)
  - `ja_id IS NULL OR ja_id = :user_ja_id` (dành cho tất cả JA hoặc dành cho JA của người dùng)
- Điều kiện bổ sung cho oshirase_list: `oshirase_type != 4` (loại trừ thời gian hạn chót)
- Điều kiện bổ sung cho deadline_notice: `oshirase_type = 4` (chỉ thời gian hạn chót, lấy 1 bản ghi)

### 4.4 Lấy danh sách thông báo thông thường (oshirase_list)

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

### 4.5 Lấy thông báo thời gian hạn chót (deadline_notice)

- Thông báo có `publish_location = 2` và `oshirase_type = 4` được đăng ký tối đa 1 bản ghi theo quy tắc kinh doanh (xem kiểm tra đăng ký ACSMS-SCR-031).

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

- Nếu không có bản ghi phù hợp, đặt `deadline_notice` thành `null`.

### 4.6 Tạo phản hồi

- Ánh xạ giá trị oshirase_type thành nhãn (1→Hệ thống, 2→Quan trọng, 3→Tổng quát, 4→Thời gian hạn chót)
- Định dạng publish_start_date / publish_end_date theo định dạng `YYYY/MM/DD HH:mm`.
- Cờ is_new: true nếu publish_start_date trong vòng 7 ngày từ thời điểm hiện tại, ngược lại false
- Trả về JSON chứa `data.oshirase_list` (mảng) và `data.deadline_notice` (đối tượng hoặc null). HTTP 200.

### 4.7 Xử lý ngoại lệ

- Trong trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-010-002

## Tổng quan

| Mục | Nội dung |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API | Lấy số lượng chờ phê duyệt |
| Tổng quan | Lấy số lượng người đăng ký phiên bản điện tử chờ phê duyệt (chỉ dành cho tài khoản xử lý phiên bản điện tử) |
| URI | /api/v1/dokusya/pending-approval/count |
| Phương thức | GET |
| Thân yêu cầu | Không có |
| Tham số yêu cầu | Không có |
| Header | Content-Type: application/json※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã phản hồi HTTP | 200:Lấy số lượng chờ phê duyệt thành công, 401:Phiên kết thúc. Vui lòng đăng nhập lại, 403:Chức năng phiên bản điện tử không được kích hoạt / Bạn không có quyền truy cập màn hình này, 500:Đã xảy ra lỗi hệ thống |

## Tham số yêu cầu

Không có

## Dữ liệu phản hồi

| # | ID Mục | Kiểu | Lặp lại | Định dạng | Có thể null | Mô tả |
| --- | ------- | ------ | -------- | ------------ | -------- | ------------------------ |
| 1   | data | Object | - | | - | Thông tin số lượng chờ phê duyệt |
| 2   | →count | Number | - | | - | Số lượng chờ phê duyệt |
| 3   | →ja_id | Number | - | | 〇 | ID JA đích (dùng cho phạm vi) |

## Ví dụ yêu cầu

```
GET /api/v1/dokusya/pending-approval/count
```

## Ví dụ phản hồi thành công

```json
{
  "data": {
    "count": 5,
    "ja_id": 100
  }
}
```

## Ví dụ phản hồi lỗi

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên kết thúc rồi. Vui lòng đăng nhập lại"
}
```

### 403 Forbidden (Chức năng phiên bản điện tử không hoạt động)

```json
{
  "error_code": "DENSHI_NOT_ENABLED",
  "message": "Chức năng phiên bản điện tử không được kích hoạt cho tài khoản này"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
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

### 4.1 Xác thực tham số yêu cầu

- Không có tham số yêu cầu.

### 4.2 Kiểm tra xác thực và phân quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem có `dokusya.view` hay không.
  - Các vai trò được đích danh: CHUOKAI (Tổng hội), JA_HONTEN (Chi nhánh chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)
- Xác nhận cờ xử lý phiên bản điện tử: `m_account.denshi_flg = true`.
- Nếu `denshi_flg = false`: HTTP 403 (`DENSHI_NOT_ENABLED`)

### 4.3 Thiết lập điều kiện lấy dữ liệu

- Lấy phạm vi của người dùng đã đăng nhập (ja_id, kanri_shiten_id, role_code).
- DataScope:
  - `CHUOKAI` / `JA_HONTEN`: `ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`: `ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`
- Điều kiện lọc:
  - `denshi_shonin_status = 1` (chưa phê duyệt/chờ phê duyệt)
  - `deleted_at IS NULL` (chưa xóa)

### 4.4 Lấy số lượng bản ghi dữ liệu

```sql
SELECT COUNT(*) AS count
FROM t_dokusya
WHERE denshi_shonin_status = 1
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
  /* Thêm điều kiện sau cho JA_KANRI_SHITEN */
  AND kanri_shiten_id = :user_kanri_shiten_id
```

### 4.5 Tạo phản hồi

- Trả về đối tượng data chứa số lượng. HTTP 200.

### 4.6 Xử lý ngoại lệ

- Trong trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
