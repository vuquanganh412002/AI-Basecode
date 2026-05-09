---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: JACSMS-SCR-005
screen_name: Màn hình Đăng ký JA Master
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-07
created_date: 2026/04/07
created_by: Nguyen Duyen Manh
updated_date: 2026/04/07
updated_by: Nguyen Duyen Manh
---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
|---|---|---|---|---|---|---|
| 1 | {issue_date} | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan Hệ thống

Hệ thống này là một hệ thống quản lý thuê bao dạng đám mây dành cho JA,
cung cấp các chức năng như quản lý thông tin thuê bao, quản lý lịch sử thuê bao, quản lý dữ liệu chuyển khoản tài khoản, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật, tìm kiếm thông tin thuê bao,
quản lý lịch sử thay đổi nội dung thuê bao, tạo và quản lý dữ liệu chuyển khoản tài khoản, tải lên và tải xuống tệp, quản lý thông báo hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng quản lý đăng nhập người dùng, ghi lại lịch sử đăng nhập,
ghi lại nhật ký hoạt động của người dùng và các chức năng bảo mật cũng như kiểm toán.

## Mục đích Tài liệu

Tài liệu mô tả chi tiết các API mới được tạo trong hệ thống cho "{screen_name}（{screen_id}）".

## Tài liệu Liên quan

| Số | Mã Tài liệu | Tên Tài liệu |
|---|---|---|

## Danh sách Lỗi

| #   | Loại Lỗi | Mã Lỗi          | Thông báo Lỗi                                                       | Ghi chú     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung       | BAD_REQUEST           | Tham số yêu cầu không hợp lệ。                                       | HTTP 400 |
| 2   | Chung       | UNAUTHORIZED          | Phiên làm việc đã hết hạn。Vui lòng đăng nhập lại।                     | HTTP 401 |
| 3   | Chung       | FORBIDDEN             | Không có quyền truy cập màn hình này।                                 | HTTP 403 |
| 4   | Chung       | DATA_SCOPE_VIOLATION  | Không có quyền truy cập dữ liệu này।                               | HTTP 403 |
| 5   | Chung       | VALIDATION_ERROR      | Giá trị nhập không hợp lệ।Vui lòng kiểm tra trường errors।           | HTTP 400 |
| 6   | Chung       | TOO_MANY_REQUESTS     | Số lượng yêu cầu vượt quá giới hạn।Vui lòng thử lại sau।             | HTTP 429 |
| 7   | Chung       | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống।Vui lòng thử lại sau।     | HTTP 500 |
| 8   | Cụ thể Màn hình     | NOT_FOUND             | JA được chỉ định không tìm thấy।                                         | HTTP 404 |
| 9   | Cụ thể Màn hình     | DUPLICATE_CODE        | Mã JA「{ja_code}」đã được đăng ký।                          | HTTP 400 |

---

# API ACSMS-API-{screen_number}-001

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Lấy Chi tiết JA |
| Tổng quan | Lấy thông tin JA của ID JA được chỉ định (cho màn hình chỉnh sửa) |
| URI | /api/v1/ja/{ja_id} |
| Phương pháp | GET |
| Thân Yêu cầu | Không |
| Tham số Yêu cầu | ja_id（Tham số Đường dẫn） |
| Tiêu đề | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 200:Lấy thông tin JA thành công, 401:Phiên làm việc đã hết hạn। Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 404:JA được chỉ định không tìm thấy, 500:Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| # | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | Số | - | ○ | | | ID JA (Tham số Đường dẫn) |

## Dữ liệu Phản hồi

| # | ID Mục | Loại | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Đối tượng | - | | - | |
| 2 | →ja_id | Số | - | | - | ID JA |
| 3 | →ja_code | Chuỗi | - | | - | Mã JA |
| 4 | →ja_name | Chuỗi | - | | - | Tên JA |
| 5 | →ja_name_kana | Chuỗi | - | | -   | Tên JA (Katakana) |
| 6 | →todofuken_code | Chuỗi | - | | - | Mã Tỉnh/Thành phố |
| 7 | →todofuken_name | Chuỗi | - | | - | Tên Tỉnh/Thành phố (Lấy từ JOIN) |
| 8 | →chuokai_flg | Boolean | - | | - | Cờ Chuokai (true: Chuokai, false: Đơn vị) |
| 9 | →bank_code | Chuỗi | - | | - | Mã Tổ chức Tài chính |
| 10 | →bank_name | Chuỗi | - | | - | Tên Tổ chức Tài chính |
| 11 | →yubin_no | Chuỗi | - | | -   | Mã Bưu chính |
| 12 | →address | Chuỗi | - | | -   | Địa chỉ |
| 13 | →tel | Chuỗi | - | | -   | Số Điện thoại |
| 14 | →fax | Chuỗi | - | | -   | Số FAX |
| 15 | →email | Chuỗi | - | | -   | Địa chỉ Email |
| 16 | →tanto_busho | Chuỗi | - | | -   | Tên Phòng ban Phụ trách |
| 17 | →tanto_name | Chuỗi | - | | -   | Tên Người phụ trách |
| 18 | →zei_kubun | Chuỗi | - | | - | Phân loại Thuế (1: Thuế nội tạo, 2: Thuế ngoài) |
| 19 | →biko | Chuỗi | - | | -   | Ghi chú |
| 20 | →created_at | Chuỗi | - | ISO 8601 | - | Thời gian Tạo |
| 21 | →updated_at | Chuỗi | - | ISO 8601 | ○ | Thời gian Cập nhật |

## Ví dụ Yêu cầu

```
GET /api/v1/ja/1
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "ja_id": 1,
    "ja_code": "1301001001",
    "ja_name": "JA Tokyo Chuo",
    "ja_name_kana": "ジェイエイトウキョウチュウオウ",
    "todofuken_code": "13",
    "todofuken_name": "Tokyo",
    "chuokai_flg": true,
    "bank_code": "1234",
    "bank_name": "Norinchukin Bank",
    "yubin_no": "1000001",
    "address": "1-1-1 Marunouchi, Chiyoda-ku, Tokyo",
    "tel": "0312345678",
    "fax": "0312345679",
    "email": "info@ja-tokyo-chuo.or.jp",
    "tanto_busho": "General Affairs Department",
    "tanto_name": "Taro Tanaka",
    "zei_kubun": "1",
    "biko": "",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
  }
}
```

## Ví dụ Phản hồi Thất bại


### 400 Bad Request
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ।Vui lòng kiểm tra trường errors",
  "errors": [
    {
      "field": "ja_id",
      "message": "Vui lòng nhập ID JA"
    }
  ]
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
  "message": "Không có quyền truy cập màn hình này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "JA được chỉ định không tìm thấy"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống।Vui lòng thử lại sau"
}
```

## Thủ tục Xử lý

### 4.1 Xác thực Yêu cầu

- Xác thực tham số đường dẫn:
  - `ja_id`：Kiểm tra loại số
  - `ja_id`：Kiểm tra bắt buộc
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request।

### 4.2 Xác thực Xác thực và Ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie)।
- Nếu xác thực không thành công: HTTP 401 Unauthorized
- Kiểm tra quyền: Kiểm tra có `ja.view`।
  - Vai trò Mục tiêu: NICHINO_ADMIN (Quản trị viên Nhật báo Nhật Bản), CHUOKAI (Chuokai), JA_HONTEN (Trụ sở chính JA)
- Nếu không có quyền: HTTP 403 Forbidden

### 4.3 Thiết lập Điều kiện Lấy dữ liệu

- Lấy phạm vi người dùng đã đăng nhập (`m_account.ja_id`)।
- Kiểm soát Phạm vi Dữ liệu:
  - NICHINO_ADMIN:`m_account.ja_id` là NULL → Có thể truy cập tất cả các bản ghi JA
  - CHUOKAI / JA_HONTEN:`m_ja.ja_id` = `m_account.ja_id` Chỉ có thể truy cập
- Điều kiện Cơ bản:
  - `m_ja.ja_id` = `:ja_id`
  - `m_ja.deleted_at IS NULL`
  - Điều kiện Phạm vi (`:user_ja_id IS NULL OR m_ja.ja_id = :user_ja_id`)

### 4.4 Lấy Dữ liệu

- Thực thi SQL sau để lấy dữ liệu।

```sql
SELECT
  mj.ja_id,
  mj.ja_code,
  mj.ja_name,
  mj.ja_name_kana,
  mj.todofuken_code,
  mt.todofuken_name,
  mj.chuokai_flg,
  mj.bank_code,
  mj.bank_name,
  mj.yubin_no,
  mj.address,
  mj.tel,
  mj.fax,
  mj.email,
  mj.tanto_busho,
  mj.tanto_name,
  mj.zei_kubun,
  mj.biko,
  mj.created_at,
  mj.updated_at
FROM m_ja mj
LEFT JOIN m_todofuken mt ON mj.todofuken_code = mt.todofuken_code
WHERE mj.ja_id = :ja_id
  AND mj.deleted_at IS NULL
  AND (:user_ja_id IS NULL OR mj.ja_id = :user_ja_id)
```

- Nếu không tồn tại bản ghi mục tiêu: Trả về HTTP 404 Not Found।

### 4.5 Tạo Phản hồi

- Trả về dữ liệu JA được lấy dưới dạng JSON।

### 4.6 Xử lý Ngoại lệ

- Nếu có lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error।

---

# API ACSMS-API-{screen_number}-002

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Tạo JA |
| Tổng quan | Đăng ký bản ghi JA Master mới (Chỉ NICHINO_ADMIN) |
| URI | /api/v1/ja |
| Phương pháp | POST |
| Thân Yêu cầu | JSON |
| Tham số Yêu cầu | |
| Tiêu đề | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 201:Đăng ký JA thành công, 400:Có lỗi trong nội dung nhập/Mã JA đã được đăng ký, 401:Phiên làm việc đã hết hạn। Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 500:Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| # | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | ja_code | Chuỗi | - | ○ | | 10 | Mã JA (Ràng buộc Duy nhất) |
| 2 | ja_name | Chuỗi | - | ○ | | 200 | Tên JA |
| 3 | ja_name_kana | Chuỗi | - | - | | 200 | Tên JA (Katakana) |
| 4 | todofuken_code | Chuỗi | - | ○ | 2 | 2 | Mã Tỉnh/Thành phố (Phải tồn tại trong m_todofuken) |
| 5 | chuokai_flg | Boolean | - | ○ | | | Cờ Chuokai (true: Chuokai, false: Đơn vị) |
| 6 | bank_code | Chuỗi | - | ○ | 4 | 4 | Mã Tổ chức Tài chính (4 chữ số toàn bộ) |
| 7 | bank_name | Chuỗi | - | ○ | | 100 | Tên Tổ chức Tài chính |
| 8 | yubin_no | Chuỗi | - | - | 7 | 7 | Mã Bưu chính (7 chữ số toàn bộ) |
| 9 | address | Chuỗi | - | - | | 200 | Địa chỉ |
| 10 | tel | Chuỗi | - | - | | 15 | Số Điện thoại (Chỉ chữ số) |
| 11 | fax | Chuỗi | - | - | | 15 | Số FAX (Chỉ chữ số) |
| 12 | email | Chuỗi | - | - | | 100 | Địa chỉ Email |
| 13 | tanto_busho | Chuỗi | - | - | | 100 | Tên Phòng ban Phụ trách |
| 14 | tanto_name | Chuỗi | - | - | | 50 | Tên Người phụ trách |
| 15 | zei_kubun | Chuỗi | - | ○ | 1 | 1 | Phân loại Thuế (1: Thuế nội tạo, 2: Thuế ngoài) |
| 16 | biko | Chuỗi | - | - | | 500 | Ghi chú |

## Dữ liệu Phản hồi

| # | ID Mục | Loại | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Đối tượng | - | | - | |
| 2 | →ja_id | Số | - | | - | ID JA được tự động gán |
| 3 | →ja_code | Chuỗi | - | | - | Mã JA |
| 4 | →ja_name | Chuỗi | - | | - | Tên JA |
| 5 | →ja_name_kana | Chuỗi | - | | -   | Tên JA (Katakana) |
| 6 | →todofuken_code | Chuỗi | - | | - | Mã Tỉnh/Thành phố |
| 7 | →chuokai_flg | Boolean | - | | - | Cờ Chuokai |
| 8 | →bank_code | Chuỗi | - | | - | Mã Tổ chức Tài chính |
| 9 | →bank_name | Chuỗi | - | | - | Tên Tổ chức Tài chính |
| 10 | →yubin_no | Chuỗi | - | | -   | Mã Bưu chính |
| 11 | →address | Chuỗi | - | | -   | Địa chỉ |
| 12 | →tel | Chuỗi | - | | -   | Số Điện thoại |
| 13 | →fax | Chuỗi | - | | -   | Số FAX |
| 14 | →email | Chuỗi | - | | -   | Địa chỉ Email |
| 15 | →tanto_busho | Chuỗi | - | | -   | Tên Phòng ban Phụ trách |
| 16 | →tanto_name | Chuỗi | - | | -   | Tên Người phụ trách |
| 17 | →zei_kubun | Chuỗi | - | | - | Phân loại Thuế |
| 18 | →biko | Chuỗi | - | | -   | Ghi chú |
| 19 | →created_at | Chuỗi | - | ISO 8601 | - | Thời gian Tạo |
| 20 | message | Chuỗi | - | | - | Thông báo Kết quả Xử lý |

## Ví dụ Yêu cầu

```json
POST /api/v1/ja
Content-Type: application/json

{
  "ja_code": "1301003001",
  "ja_name": "JA Tokyo Midori",
  "ja_name_kana": "ジェイエイトウキョウミドリ",
  "todofuken_code": "13",
  "chuokai_flg": false,
  "bank_code": "1234",
  "bank_name": "Norinchukin Bank",
  "yubin_no": "1600022",
  "address": "3-1-1 Shinjuku, Shinjuku-ku, Tokyo",
  "tel": "0323456789",
  "fax": "0323456780",
  "email": "info@ja-tokyo-midori.or.jp",
  "tanto_busho": "Planning Division",
  "tanto_name": "Hanako Suzuki",
  "zei_kubun": "1",
  "biko": ""
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "ja_id": 3,
    "ja_code": "1301003001",
    "ja_name": "JA Tokyo Midori",
    "ja_name_kana": "ジェイエイトウキョウミドリ",
    "todofuken_code": "13",
    "chuokai_flg": false,
    "bank_code": "1234",
    "bank_name": "Norinchukin Bank",
    "yubin_no": "1600022",
    "address": "3-1-1 Shinjuku, Shinjuku-ku, Tokyo",
    "tel": "0323456789",
    "fax": "0323456780",
    "email": "info@ja-tokyo-midori.or.jp",
    "tanto_busho": "Planning Division",
    "tanto_name": "Hanako Suzuki",
    "zei_kubun": "1",
    "biko": "",
    "created_at": "2026-04-07T10:00:00Z"
  },
  "message": "Đã đăng ký JA"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ।Vui lòng kiểm tra trường errors",
  "errors": [
    { "field": "ja_code", "message": "Vui lòng nhập Mã JA" },
    { "field": "bank_code", "message": "Mã Tổ chức Tài chính phải là 4 chữ số toàn bộ" }
  ]
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
  "message": "Không có quyền truy cập màn hình này"
}
```

### 409 Conflict

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "Mã JA「002001」đã được đăng ký।"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống।Vui lòng thử lại sau"
}
```

## Thủ tục Xử lý

> ※ Quá trình sau được thực hiện trong một giao dịch duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động)।
> Nếu bất kỳ quy trình nào không thành công, tất cả đều sẽ được Rollback।
> Nhật ký Lỗi trong Xử lý Ngoại lệ (log_type=3) được ghi lại riêng biệt ngoài giao dịch।

### 4.1 Xác thực Yêu cầu

- Xác thực tất cả các trường trong Thân Yêu cầu:
  - `ja_code`：Bắt buộc, Tối đa 10 ký tự
  - `ja_name`：Bắt buộc, Tối đa 200 ký tự
  - `ja_name_kana`：Tùy chọn, Tối đa 200 ký tự
  - `todofuken_code`：Bắt buộc, 2 ký tự
  - `chuokai_flg`：Bắt buộc, Giá trị Boolean (`true` hoặc `false`)
  - `bank_code`：Bắt buộc, 4 chữ số toàn bộ
  - `bank_name`：Bắt buộc, Tối đa 100 ký tự
  - `tel`：Tùy chọn, Chỉ chữ số, Tối đa 15 ký tự
  - `fax`：Tùy chọn, Chỉ chữ số, Tối đa 15 ký tự
  - `email`：Tùy chọn, Định dạng Email, Tối đa 100 ký tự
  - `biko`：Tùy chọn, Tối đa 500 ký tự
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request।

### 4.2 Xác thực Xác thực và Ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie)।
- Nếu xác thực không thành công: HTTP 401 Unauthorized
- Kiểm tra quyền: Kiểm tra có `ja.create`।
  - Vai trò Mục tiêu: NICHINO_ADMIN (Quản trị viên Nhật báo Nhật Bản) Chỉ
- Nếu không có quyền: HTTP 403 Forbidden

### 4.3 Xác thực Tồn tại Mã Tỉnh/Thành phố

- Xác minh rằng `todofuken_code` tồn tại trong bảng `m_todofuken`।

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = :todofuken_code
```

- Nếu không tồn tại: Trả về HTTP 400 Bad Request।

### 4.4 Kiểm tra Tính Duy nhất Mã JA

- Xác minh rằng `ja_code` chưa tồn tại trong bảng `m_ja`।

```sql
SELECT ja_id
FROM m_ja
WHERE ja_code = :ja_code
  AND deleted_at IS NULL
```

- Nếu đã tồn tại: Trả về HTTP 409 Conflict।

### 4.5 Đăng ký Dữ liệu

- Thực thi SQL sau để đăng ký bản ghi mới।

```sql
INSERT INTO m_ja (
  ja_code, ja_name, ja_name_kana, todofuken_code, chuokai_flg,
  bank_code, bank_name, yubin_no, address, tel, fax, email,
  tanto_busho, tanto_name, zei_kubun, biko,
  created_by, created_at
)
VALUES (
  :ja_code, :ja_name, :ja_name_kana, :todofuken_code, :chuokai_flg,
  :bank_code, :bank_name, :yubin_no, :address, :tel, :fax, :email,
  :tanto_busho, :tanto_name, :zei_kubun, :biko,
  :user_account_id, NOW()
)
RETURNING ja_id
```

### 4.6 Ghi lại Nhật ký Hoạt động

- Ghi lại Nhật ký Hoạt động vào bảng `t_log`।

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, NULL,
  'Màn hình Đăng ký JA Master (ACSMS-SCR-005)', 'CREATE', 1,
  :ja_id, 'm_ja',
  '', :after_value_json,
  '', '',
  :ip_address, :user_agent
)
```

### 4.7 Tạo Phản hồi

- Trả về dữ liệu JA được đăng ký và thông báo Thành công dưới dạng JSON।
- HTTP 201 Created

### 4.8 Xử lý Ngoại lệ

- Nếu có lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error।
- Ghi lại Nhật ký Hoạt động khi có lỗi (`log_type = 3`)।
```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  3, NOW(), :user_account_id, NULL,
  'Màn hình Đăng ký JA Master (ACSMS-SCR-005)', 'CREATE', 2,
  NULL, 'm_ja',
  '', '',
  :error_message, :stack_trace,
  :ip_address, :user_agent
)
```

---

# API ACSMS-API-{screen_number}-003

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Cập nhật JA |
| Tổng quan | Cập nhật bản ghi JA Master hiện có। NICHINO_ADMIN có thể cập nhật tất cả các trường। CHUOKAI/JA_HONTEN chỉ có thể cập nhật một số trường (※4) |
| URI | /api/v1/ja/{ja_id} |
| Phương pháp | PUT |
| Thân Yêu cầu | JSON |
| Tham số Yêu cầu | ja_id (Tham số Đường dẫn) |
| Tiêu đề | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 200:Cập nhật JA thành công, 400:Có lỗi trong nội dung nhập, 401:Phiên làm việc đã hết hạn। Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 404:JA được chỉ định không tìm thấy, 500:Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

### Tham số Đường dẫn

| # | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | Số | - | ○ | | | ID JA (Tham số Đường dẫn) |
| 2 | ja_name | Chuỗi | - | ○ | | 200 | Tên JA |
| 3 | ja_name_kana | Chuỗi | - | - | | 200 | Tên JA (Katakana) |
| 4 | todofuken_code | Chuỗi | - | ○ | 2 | 2 | Mã Tỉnh/Thành phố |
| 5 | chuokai_flg | Boolean | - | ○ | | | Cờ Chuokai (true: Chuokai, false: Đơn vị) |
| 6 | bank_code | Chuỗi | - | ○ | 4 | 4 | Mã Tổ chức Tài chính (4 chữ số toàn bộ) |
| 7 | bank_name | Chuỗi | - | ○ | | 100 | Tên Tổ chức Tài chính |
| 8 | yubin_no | Chuỗi | - | - | 7 | 7 | Mã Bưu chính (7 chữ số toàn bộ) |
| 9 | address | Chuỗi | - | - | | 200 | Địa chỉ |
| 10 | tel | Chuỗi | - | - | | 15 | Số Điện thoại (Chỉ chữ số) |
| 11 | fax | Chuỗi | - | - | | 15 | Số FAX (Chỉ chữ số) |
| 12 | email | Chuỗi | - | - | | 100 | Địa chỉ Email |
| 13 | tanto_busho | Chuỗi | - | - | | 100 | Tên Phòng ban Phụ trách |
| 14 | tanto_name | Chuỗi | - | - | | 50 | Tên Người phụ trách |
| 15 | zei_kubun | Chuỗi | - | ○ | 1 | 1 | Phân loại Thuế (1: Thuế nội tạo, 2: Thuế ngoài) |
| 16 | biko | Chuỗi | - | - | | 500 | Ghi chú |

> **Ghi chú:** `ja_code` không thể cập nhật (Không thể thay đổi sau khi tạo)। CHUOKAI / JA_HONTEN nếu bao gồm các trường nằm ngoài ※4 trong Thân Yêu cầu, Back-end sẽ bỏ qua chúng।

## Dữ liệu Phản hồi

| # | ID Mục | Loại | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Đối tượng | - | | - | |
| 2 | →ja_id | Số | - | | - | ID JA |
| 3 | →ja_code | Chuỗi | - | | - | Mã JA |
| 4 | →ja_name | Chuỗi | - | | - | Tên JA |
| 5 | →ja_name_kana | Chuỗi | - | | -   | Tên JA (Katakana) |
| 6 | →todofuken_code | Chuỗi | - | | - | Mã Tỉnh/Thành phố |
| 7 | →chuokai_flg | Boolean | - | | - | Cờ Chuokai |
| 8 | →bank_code | Chuỗi | - | | - | Mã Tổ chức Tài chính |
| 9 | →bank_name | Chuỗi | - | | - | Tên Tổ chức Tài chính |
| 10 | →yubin_no | Chuỗi | - | | -   | Mã Bưu chính |
| 11 | →address | Chuỗi | - | | -   | Địa chỉ |
| 12 | →tel | Chuỗi | - | | -   | Số Điện thoại |
| 13 | →fax | Chuỗi | - | | -   | Số FAX |
| 14 | →email | Chuỗi | - | | -   | Địa chỉ Email |
| 15 | →tanto_busho | Chuỗi | - | | -   | Tên Phòng ban Phụ trách |
| 16 | →tanto_name | Chuỗi | - | | -   | Tên Người phụ trách |
| 17 | →zei_kubun | Chuỗi | - | | - | Phân loại Thuế |
| 18 | →biko | Chuỗi | - | | -   | Ghi chú |
| 19 | →updated_at | Chuỗi | - | ISO 8601 | - | Thời gian Cập nhật |
| 20 | message | Chuỗi | - | | - | Thông báo Kết quả Xử lý |

## Ví dụ Yêu cầu

### NICHINO_ADMIN (Cập nhật Tất cả Trường)

```json
PUT /api/v1/ja/1
Content-Type: application/json

{
  "ja_name": "JA Tokyo Chuo (Revised)",
  "ja_name_kana": "ジェイエイトウキョウチュウオウカイテイ",
  "todofuken_code": "13",
  "chuokai_flg": true,
  "bank_code": "1234",
  "bank_name": "Norinchukin Bank",
  "yubin_no": "1000001",
  "address": "2-2-2 Marunouchi, Chiyoda-ku, Tokyo",
  "tel": "0312345678",
  "fax": "0312345679",
  "email": "info-new@ja-tokyo-chuo.or.jp",
  "tanto_busho": "General Affairs Department",
  "tanto_name": "Taro Tanaka",
  "zei_kubun": "2",
  "biko": "Address Changed"
}
```

### CHUOKAI / JA_HONTEN (Chỉ Trường Một Phần ※4)

```json
PUT /api/v1/ja/1
Content-Type: application/json

{
  "yubin_no": "1000001",
  "address": "2-2-2 Marunouchi, Chiyoda-ku, Tokyo",
  "tel": "0312345678",
  "fax": "0312345679",
  "email": "info-new@ja-tokyo-chuo.or.jp",
  "tanto_busho": "General Affairs Department",
  "tanto_name": "Taro Tanaka",
  "zei_kubun": "2",
  "biko": "Address Changed"
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "ja_id": 1,
    "ja_code": "1301001001",
    "ja_name": "JA Tokyo Chuo (Revised)",
    "ja_name_kana": "ジェイエイトウキョウチュウオウカイテイ",
    "todofuken_code": "13",
    "chuokai_flg": true,
    "bank_code": "1234",
    "bank_name": "Norinchukin Bank",
    "yubin_no": "1000001",
    "address": "2-2-2 Marunouchi, Chiyoda-ku, Tokyo",
    "tel": "0312345678",
    "fax": "0312345679",
    "email": "info-new@ja-tokyo-chuo.or.jp",
    "tanto_busho": "General Affairs Department",
    "tanto_name": "Taro Tanaka",
    "zei_kubun": "2",
    "biko": "Address Changed",
    "updated_at": "2026-04-07T15:30:00Z"
  },
  "message": "Đã cập nhật JA"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Bad Request

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ।Vui lòng kiểm tra trường errors",
  "errors": [
    { "field": "email", "message": "Định dạng Địa chỉ Email không hợp lệ" }
  ]
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
  "message": "Không có quyền truy cập màn hình này"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "JA được chỉ định không tìm thấy"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống।Vui lòng thử lại sau"
}
```

## Thủ tục Xử lý

> ※ Quá trình sau được thực hiện trong một giao dịch duy nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động)।
> Nếu bất kỳ quy trình nào không thành công, tất cả đều sẽ được Rollback।
> Nhật ký Lỗi trong Xử lý Ngoại lệ (log_type=3) được ghi lại riêng biệt ngoài giao dịch।

### 4.1 Xác thực Yêu cầu

- Xác thực Tham số Đường dẫn:
  - `ja_id`：Kiểm tra loại số, Kiểm tra bắt buộc
- Xác thực Thân Yêu cầu:
  - NICHINO_ADMIN: Xác thực tất cả các trường
  - CHUOKAI / JA_HONTEN: Xác thực Chỉ các trường ※4
  - Kiểm tra loại/độ dài/định dạng của mỗi trường (Tương tự như API ACSMS-API-005-002 §4.1)
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request।
### 4.2 Xác thực Xác thực và Ủy quyền

- Xác thực thông tin xác thực (phiên HTTP-only Cookie)।
- Kiểm tra quyền: Kiểm tra có `ja.update`।
  - Vai trò Mục tiêu: NICHINO_ADMIN (Quản trị viên Nhật báo Nhật Bản), CHUOKAI (Chuokai), JA_HONTEN (Trụ sở chính JA)
- Nếu không có quyền: HTTP 403 Forbidden

### 4.3 Xác nhận Tồn tại Bản ghi Mục tiêu và Xác thực Phạm vi Dữ liệu

- Lấy Phạm vi người dùng đã đăng nhập (`m_account.ja_id`)।
- Xác nhận Tồn tại Bản ghi Mục tiêu và Xác thực Quyền:

```sql
SELECT ja_id, ja_code, ja_name, ja_name_kana,
       todofuken_code, chuokai_flg, bank_code, bank_name,
       yubin_no, address, tel, fax, email,
       tanto_busho, tanto_name, zei_kubun, biko
FROM m_ja
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND (:user_ja_id IS NULL OR ja_id = :user_ja_id)
```

- Nếu không tồn tại Bản ghi Mục tiêu: Trả về HTTP 404 Not Found।

### 4.4 Xác định Trường Cập nhật Theo Vai trò

- Xác định Trường Có thể Cập nhật dựa trên Vai trò người dùng:
  - **NICHINO_ADMIN**:`ja_name`, `ja_name_kana`, `todofuken_code`, `chuokai_flg`, `bank_code`, `bank_name`, `yubin_no`, `address`, `tel`, `fax`, `email`, `tanto_busho`, `tanto_name`, `zei_kubun`, `biko`
  - **CHUOKAI / JA_HONTEN (※4)**:`yubin_no`, `address`, `tel`, `fax`, `email`, `tanto_busho`, `tanto_name`, `zei_kubun`, `biko`
- CHUOKAI / JA_HONTEN nếu bao gồm các trường ngoài Mục tiêu trong Thân Yêu cầu, bỏ qua chúng।

### 4.5 Xác thực Tồn tại Mã Tỉnh/Thành phố (Chỉ NICHINO_ADMIN)

- Nếu `todofuken_code` được bao gồm trong Mục tiêu Cập nhật, xác minh rằng nó tồn tại trong bảng `m_todofuken`।

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = :todofuken_code
```

- Nếu không tồn tại: Trả về HTTP 400 Bad Request।

### 4.6 Cập nhật Dữ liệu

- NICHINO_ADMIN Trường hợp (Cập nhật Tất cả Trường):

```sql
UPDATE m_ja
SET ja_name = :ja_name,
    ja_name_kana = :ja_name_kana,
    todofuken_code = :todofuken_code,
    chuokai_flg = :chuokai_flg,
    bank_code = :bank_code,
    bank_name = :bank_name,
    yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    email = :email,
    tanto_busho = :tanto_busho,
    tanto_name = :tanto_name,
    zei_kubun = :zei_kubun,
    biko = :biko,
    updated_by = :user_account_id,
    updated_at = NOW()
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
```

- CHUOKAI / JA_HONTEN Trường hợp (Chỉ Trường Một Phần ※4):

```sql
UPDATE m_ja
SET yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    email = :email,
    tanto_busho = :tanto_busho,
    tanto_name = :tanto_name,
    zei_kubun = :zei_kubun,
    biko = :biko,
    updated_by = :user_account_id,
    updated_at = NOW()
WHERE ja_id = :ja_id
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
```

### 4.7 Ghi lại Nhật ký Hoạt động

- Ghi lại Nhật ký Hoạt động vào bảng `t_log`।

```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  1, NOW(), :user_account_id, :user_ja_id,
  'Màn hình Đăng ký JA Master (ACSMS-SCR-005)', 'UPDATE', 1,
  :ja_id, 'm_ja',
  :before_value_json, :after_value_json,
  '', '',
  :ip_address, :user_agent
)
```

### 4.8 Tạo Phản hồi

- Trả về dữ liệu JA được cập nhật và thông báo Thành công dưới dạng JSON।
- HTTP 200 OK

### 4.9 Xử lý Ngoại lệ

- Nếu có lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error।
- Ghi lại Nhật ký Hoạt động khi có lỗi (`log_type = 3`)।
```sql
INSERT INTO t_log (
  log_type, log_datetime, account_id, ja_id,
  gamen_name, operation, result_status,
  target_id, target_table,
  before_value, after_value,
  error_message, stack_trace,
  ip_address, user_agent
)
VALUES (
  3, NOW(), :user_account_id, :user_ja_id,
  'Màn hình Đăng ký JA Master (ACSMS-SCR-005)', 'UPDATE', 2,
  :ja_id, 'm_ja',
  '', '',
  :error_message, :stack_trace,
  :ip_address, :user_agent
)
```

- Nếu có lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error।

---

# API ACSMS-API-COMMON-001

## Tổng quan

| Mục | Nội dung |
|---|---|
| Tên API | Lấy Danh sách Tỉnh/Thành phố |
| Tổng quan | Lấy Danh sách Tỉnh/Thành phố (Cho Thả xuống) |
| URI | /api/v1/todofuken |
| Phương pháp | GET |
| Thân Yêu cầu | Không |
| Tham số Yêu cầu | |
| Tiêu đề | Content-Type: application/json\n※ Thông tin xác thực được gửi tự động thông qua HTTP-only Cookie |
| Mã Phản hồi HTTP | 200:Lấy Danh sách Tỉnh/Thành phố thành công, 401:Phiên làm việc đã hết hạn। Vui lòng đăng nhập lại, 500:Đã xảy ra lỗi hệ thống |

## Tham số Yêu cầu

| # | ID Tham số | Loại | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
|---|---|---|---|---|---|---|---|
| | (Không) | | | | | | Không có Tham số Yêu cầu |

## Dữ liệu Phản hồi

| # | ID Mục | Loại | Lặp lại | Định dạng | Nullable | Mô tả |
|---|---|---|---|---|---|---|
| 1 | data | Mảng | ○ | | - | |
| 2 | →todofuken_code | Chuỗi | - | | - | Mã Tỉnh/Thành phố (01〜47) |
| 3 | →todofuken_name | Chuỗi | - | | - | Tên Tỉnh/Thành phố |

## Ví dụ Yêu cầu

```
GET /api/v1/todofuken
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": [
    { "todofuken_code": "01", "todofuken_name": "Hokkaido" },
    { "todofuken_code": "02", "todofuken_name": "Aomori" },
    { "todofuken_code": "03", "todofuken_name": "Iwate" },
    { "todofuken_code": "13", "todofuken_name": "Tokyo" },
    { "todofuken_code": "27", "todofuken_name": "Osaka" },
    { "todofuken_code": "47", "todofuken_name": "Okinawa" }
  ]
}
```

## Ví dụ Phản hồi Thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn।Vui lòng đăng nhập lại"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống।Vui lòng thử lại sau"
}
```

## Thủ tục Xử lý

### 4.1 Xác thực Xác thực

- Xác thực thông tin xác thực (phiên HTTP-only Cookie)।
- Nếu xác thực không thành công: HTTP 401 Unauthorized
- Kiểm tra quyền: Nếu người dùng đã được xác thực, tất cả các vai trò đều có thể truy cập।

### 4.2 Lấy Dữ liệu

- Thực thi SQL sau để lấy Danh sách Tỉnh/Thành phố।

```sql
SELECT todofuken_code, todofuken_name
FROM m_todofuken
ORDER BY todofuken_code ASC
```

### 4.3 Tạo Phản hồi

- Trả về Danh sách Tỉnh/Thành phố được lấy dưới dạng JSON।

### 4.4 Xử lý Ngoại lệ

- Nếu có lỗi kết nối DB, v.v.: Trả về HTTP 500 Internal Server Error।
