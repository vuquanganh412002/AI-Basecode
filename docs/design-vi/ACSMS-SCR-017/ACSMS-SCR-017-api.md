---
customer_name: Japan Agricultural News
system_name: Hệ Thống Quản Lý Độc Giả Phiên Bản Cloud
document_name: Tài Liệu Thiết Kế API
screen_id: ACSMS-SCR-017
screen_name: Màn Hình Đăng Ký Thông Tin Nhà Phân Phối
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-16
created_date: 2026/04/16
created_by: Dao Van Thang
updated_date: 2026/04/16
updated_by: Dao Van Thang
---

## Lịch Sử Thay Đổi

| No  | Ngày Phát Hành | Phiên Bản | Người Thực Hiện | Nội Dung Thay Đổi | Người Xác Nhận | Người Phê Duyệt |
| --- | -------------- | --------- | --------------- | --------------- | -------------- | --------------- |
| 1   | 2026/04/16     | 1.0       | Dao Van Thang   | Tạo bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat  |

## Tổng Quan Hệ Thống

Hệ thống này là một hệ thống quản lý độc giả dạng cloud dành cho JA,
cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đăng ký,
quản lý dữ liệu chuyển khoản tự động, v.v.

Các chức năng chính bao gồm đăng ký, cập nhật và tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên và tải xuống tệp, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng,
ghi lại lịch sử đăng nhập, ghi lại nhật ký hoạt động của người dùng.

## Mục Đích Tài Liệu

Tài liệu này mô tả chi tiết các API mới được tạo trên hệ thống cho
"Màn Hình Đăng Ký Thông Tin Nhà Phân Phối (ACSMS-SCR-017)".

## Tài Liệu Liên Quan

| No  | Mã Tài Liệu   | Tên Tài Liệu                      |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-018 | Tài Liệu Thiết Kế API Màn Hình Tìm Kiếm Chi Tiết Nhà Phân Phối |

## Danh Sách Lỗi

| #   | Loại Lỗi | Mã Lỗi                | Thông Báo Lỗi                                                | Ghi Chú     |
| --- | -------- | ------------------- | ----------------------------------------------------------- | ----------- |
| 1   | Chung    | BAD_REQUEST         | Tham số yêu cầu không hợp lệ.                               | HTTP 400    |
| 2   | Chung    | UNAUTHORIZED        | Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.           | HTTP 401    |
| 3   | Chung    | FORBIDDEN           | Bạn không có quyền truy cập màn hình này.                    | HTTP 403    |
| 4   | Chung    | DATA_SCOPE_VIOLATION| Bạn không có quyền truy cập dữ liệu này.                    | HTTP 403    |
| 5   | Chung    | VALIDATION_ERROR    | Giá trị nhập vào không hợp lệ. Kiểm tra chi tiết trong trường errors. | HTTP 400|
| 6   | Chung    | TOO_MANY_REQUESTS   | Số lượng yêu cầu vượt quá giới hạn. Vui lòng thử lại sau. | HTTP 429    |
| 7   | Chung    | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. | HTTP 500    |
| 8   | Riêng màn hình | NOT_FOUND   | Không tìm thấy nhà phân phối được chỉ định.                 | HTTP 404    |
| 9   | Riêng màn hình | DUPLICATE_CODE    | Mã nhà phân phối trùng lặp đã được đăng ký.                 | HTTP 400    |

---

# API ACSMS-API-017-001

## Tổng Quan

| Trường                  | Nội Dung                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                 | Lấy Chi Tiết Nhà Phân Phối                                                                                                                                                                                |
| Tổng Quan               | Lấy chi tiết nhà phân phối được chỉ định (cho chế độ chỉnh sửa)                                                                                                                                           |
| URI                     | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                           |
| Phương Thức             | GET                                                                                                                                                                                                         |
| Thân Yêu Cầu            | Không có                                                                                                                                                                                                   |
| Tham Số Yêu Cầu         | hanbaiten_id (tham số đường dẫn)                                                                                                                                                                         |
| Header                  | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                               |
| Mã Phản Hồi HTTP        | 200: Đã lấy chi tiết nhà phân phối thành công, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy nhà phân phối được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham Số Yêu Cầu

| #   | Mã Tham Số     | Kiểu Dữ Liệu | Lặp Lại | Bắt Buộc | Độ Dài Tối Thiểu | Độ Dài Tối Đa | Mô Tả                          |
| --- | -------------- | ------------ | ------- | -------- | --------------- | ------------- | ------------------------------ |
| 1   | hanbaiten_id   | Number      | -       | ◯        | -               | -             | hanbaiten_id đối tượng cần lấy (tham số đường dẫn) |

## Dữ Liệu Phản Hồi

| #   | Mã Trường                       | Kiểu Dữ Liệu | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả                              |
| --- | ------------------------------- | ------------ | ------- | --------- | ----------- | ---------------------------------- |
| 1   | data                            | Object      | -       | -         | -           | -                                  |
| 2   | →hanbaiten_id                   | Number      | -       | -         | -           | ID nhà phân phối                   |
| 3   | →ja_id                          | Number      | -       | -         | -           | ID JA                              |
| 4   | →hanbaiten_code                 | String      | -       | -         | -           | Mã nhà phân phối                   |
| 5   | →hanbaiten_name                 | String      | -       | -         | -           | Tên nhà phân phối                  |
| 6   | →hanbaiten_name_kana            | String      | -       | -         | -           | Tên nhà phân phối (Katakana)       |
| 7   | →torihikisaki_no                | String      | -       | -         | ◯           | Số định danh của người phát hành hóa đơn |
| 8   | →yubin_no                       | String      | -       | -         | -           | Mã bưu chính                       |
| 9   | →address                        | String      | -       | -         | -           | Địa chỉ                            |
| 10  | →tel                            | String      | -       | -         | -           | Số điện thoại                      |
| 11  | →fax                            | String      | -       | -         | -           | Số fax                             |
| 12  | →shocho_name                    | String      | -       | -         | ◯           | Tên quản lý                        |
| 13  | →itaku_kubun                    | Number      | -       | -         | ◯           | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 14  | →haitatsuryo_tanka_id           | Number      | -       | -         | ◯           | ID đơn giá phí giao hàng           |
| 15  | →haitatsuryo_shiharai_cycle     | Number      | -       | -         | ◯           | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 16  | →tesuryo_kubun                  | Number      | -       | -         | ◯           | Loại phí (1: JA, 2: Nhà phân phối) |
| 17  | →tesuryo_amount                 | Number      | -       | 0.00      | ◯           | Số tiền phí                        |
| 18  | →bank_code                      | String      | -       | -         | -           | Mã ngân hàng                       |
| 19  | →bank_name                      | String      | -       | -         | -           | Tên ngân hàng                      |
| 20  | →bank_branch_code               | String      | -       | -         | ◯           | Mã chi nhánh                       |
| 21  | →bank_branch_name               | String      | -       | -         | ◯           | Tên chi nhánh                      |
| 22  | →yokin_shubetsu                 | Number      | -       | -         | ◯           | Loại tài khoản (1: Tiền gửi thường, 2: Tiền gửi cuối kỳ) |
| 23  | →koza_no                        | String      | -       | -         | ◯           | Số tài khoản                       |
| 24  | →koza_meigi                     | String      | -       | -         | ◯           | Tên tài khoản                      |
| 25  | →haiten_flg                     | Boolean     | -       | -         | -           | Cờ đóng cửa (true: Đóng cửa, false: Đang kinh doanh) |
| 26  | →biko                           | String      | -       | -         | -           | Ghi chú                            |
| 27  | →created_at                     | String      | -       | ISO8601   | -           | Thời gian tạo                      |
| 28  | →updated_at                     | String      | -       | ISO8601   | ◯           | Thời gian cập nhật                 |

## Ví Dụ Yêu Cầu

```
GET /api/v1/hanbaiten/1
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 500.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "haiten_flg": false,
    "biko": "特別な対応なし",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-10T14:30:00Z"
  }
}
```

## Ví Dụ Phản Hồi Thất Bại

### 401 Không được Phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 403 Vi Phạm Phạm Vi Dữ Liệu

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "Bạn không có quyền truy cập dữ liệu này"
}
```

### 404 Không Tìm Thấy

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy nhà phân phối được chỉ định"
}
```

### 500 Lỗi Máy Chủ Nội Bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy Trình Xử Lý

### 4.1 Xác Thực Tham Số Yêu Cầu

- Xác thực tham số đường dẫn:
  - hanbaiten_id: Kiểm tra kiểu số, kiểm tra bắt buộc
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm Tra Xác Thực và Quyền Hạn

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem người dùng có quyền `hanbaiten.view` không.
  - Vai trò áp dụng: NICHINO_STAFF (Nhân viên Nhật Nông), CHUOKAI (Hội Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu không có quyền: HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Lấy Dữ Liệu

- Lấy phạm vi (scope) của người dùng đã đăng nhập (ja_id).
- Lấy dữ liệu theo điều kiện sau.

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       hanbaiten_name_kana, torihikisaki_no, yubin_no, address,
       tel, fax, shocho_name, itaku_kubun, haitatsuryo_tanka_id,
       haitatsuryo_shiharai_cycle, tesuryo_kubun, tesuryo_amount,
       bank_code, bank_name, bank_branch_code, bank_branch_name,
       yokin_shubetsu, koza_no, koza_meigi, haiten_flg, biko,
       created_at, updated_at
FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Tạo Phản Hồi

- Trả về JSON chứa đối tượng data.

### 4.5 Xử Lý Ngoại Lệ

- Trong trường hợp lỗi kết nối cơ sở dữ liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-017-002

## Tổng Quan

| Trường                  | Nội Dung                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                 | Tạo Nhà Phân Phối                                                                                                                                                                                                                           |
| Tổng Quan               | Đăng ký nhà phân phối mới                                                                                                                                                                                                                    |
| URI                     | /api/v1/hanbaiten                                                                                                                                                                                                                          |
| Phương Thức             | POST                                                                                                                                                                                                                                       |
| Thân Yêu Cầu            | JSON                                                                                                                                                                                                                                       |
| Tham Số Yêu Cầu         | -                                                                                                                                                                                                                                            |
| Header                  | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                                     |
| Mã Phản Hồi HTTP        | 201: Đã đăng ký nhà phân phối thành công, 400: Nội dung nhập vào có lỗi, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 400: Mã nhà phân phối trùng lặp đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham Số Yêu Cầu

| #   | Mã Tham Số               | Kiểu Dữ Liệu | Lặp Lại | Bắt Buộc | Độ Dài Tối Thiểu | Độ Dài Tối Đa | Mô Tả                                     |
| --- | ----------------------- | ------------ | ------- | -------- | --------------- | ------------- | ---------------------------------------- |
| 1   | hanbaiten_code          | String      | -       | ◯        | 1               | 10            | Mã nhà phân phối                          |
| 2   | hanbaiten_name          | String      | -       | ◯        | 1               | 100           | Tên nhà phân phối                         |
| 3   | hanbaiten_name_kana     | String      | -       | -        | 1               | 100           | Tên nhà phân phối (Katakana)              |
| 4   | torihikisaki_no         | String      | -       | -        | 1               | 20            | Số định danh của người phát hành hóa đơn |
| 5   | yubin_no                | String      | -       | -        | 1               | 7             | Mã bưu chính                              |
| 6   | address                 | String      | -       | -        | 1               | 200           | Địa chỉ                                   |
| 7   | tel                     | String      | -       | -        | 1               | 15            | Số điện thoại                             |
| 8   | fax                     | String      | -       | -        | 1               | 15            | Số fax                                    |
| 9   | shocho_name             | String      | -       | -        | 1               | 50            | Tên quản lý                               |
| 10  | itaku_kubun             | Number      | -       | -        | -               | -             | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 11  | haitatsuryo_tanka_id    | Number      | -       | -        | -               | -             | ID đơn giá phí giao hàng                  |
| 12  | haitatsuryo_shiharai_cycle | Number   | -       | -        | -               | -             | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 13  | tesuryo_kubun           | Number      | -       | -        | -               | -             | Loại phí (1: JA, 2: Nhà phân phối)       |
| 14  | tesuryo_amount          | Number      | -       | -        | -               | -             | Số tiền phí ≧ 0                          |
| 15  | bank_code               | String      | -       | -        | 1               | 4             | Mã ngân hàng (bắt buộc khi itaku_kubun=1) |
| 16  | bank_name               | String      | -       | -        | 1               | 100           | Tên ngân hàng (bắt buộc khi itaku_kubun=1) |
| 17  | bank_branch_code        | String      | -       | -        | 1               | 3             | Mã chi nhánh (bắt buộc khi itaku_kubun=1) |
| 18  | bank_branch_name        | String      | -       | -        | 1               | 100           | Tên chi nhánh (bắt buộc khi itaku_kubun=1) |
| 19  | yokin_shubetsu          | Number      | -       | -        | -               | -             | Loại tài khoản (1: Tiền gửi thường, 2: Tiền gửi cuối kỳ, bắt buộc khi itaku_kubun=1) |
| 20  | koza_no                 | String      | -       | -        | 1               | 10            | Số tài khoản (bắt buộc khi itaku_kubun=1) |
| 21  | koza_meigi              | String      | -       | -        | 1               | 50            | Tên tài khoản                             |
| 22  | haiten_flg              | Boolean     | -       | -        | -               | -             | Cờ đóng cửa (true: Đóng cửa, false: Đang kinh doanh, mặc định là false) |
| 23  | biko                    | String      | -       | -        | -               | -             | Ghi chú                                   |

## Dữ Liệu Phản Hồi

| #   | Mã Trường                     | Kiểu Dữ Liệu | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả                       |
| --- | ----------------------------- | ------------ | ------- | --------- | ----------- | -------------------------- |
| 1   | data                          | Object      | -       | -         | -           | Dữ liệu nhà phân phối được đăng ký |
| 2   | →hanbaiten_id                 | Number      | -       | -         | -           | ID nhà phân phối                  |
| 3   | →ja_id                        | Number      | -       | -         | -           | ID JA                              |
| 4   | →hanbaiten_code               | String      | -       | -         | -           | Mã nhà phân phối                  |
| 5   | →hanbaiten_name               | String      | -       | -         | -           | Tên nhà phân phối                 |
| 6   | →hanbaiten_name_kana          | String      | -       | -         | -           | Tên nhà phân phối (Katakana)      |
| 7   | →torihikisaki_no              | String      | -       | -         | ◯           | Số định danh của người phát hành hóa đơn |
| 8   | →yubin_no                     | String      | -       | -         | -           | Mã bưu chính                      |
| 9   | →address                      | String      | -       | -         | -           | Địa chỉ                          |
| 10  | →tel                          | String      | -       | -         | -           | Số điện thoại                     |
| 11  | →fax                          | String      | -       | -         | -           | Số fax                            |
| 12  | →shocho_name                  | String      | -       | -         | ◯           | Tên quản lý                       |
| 13  | →itaku_kubun                  | Number      | -       | -         | ◯           | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 14  | →haitatsuryo_tanka_id         | Number      | -       | -         | ◯           | ID đơn giá phí giao hàng          |
| 15  | →haitatsuryo_shiharai_cycle   | Number      | -       | -         | ◯           | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 16  | →tesuryo_kubun                | Number      | -       | -         | ◯           | Loại phí (1: JA, 2: Nhà phân phối) |
| 17  | →tesuryo_amount               | Number      | -       | 0.00      | ◯           | Số tiền phí                       |
| 18  | →bank_code                    | String      | -       | -         | -           | Mã ngân hàng                      |
| 19  | →bank_name                    | String      | -       | -         | -           | Tên ngân hàng                     |
| 20  | →bank_branch_code             | String      | -       | -         | ◯           | Mã chi nhánh                      |
| 21  | →bank_branch_name             | String      | -       | -         | ◯           | Tên chi nhánh                     |
| 22  | →yokin_shubetsu               | Number      | -       | -         | ◯           | Loại tài khoản (1: Tiền gửi thường, 2: Tiền gửi cuối kỳ) |
| 23  | →koza_no                      | String      | -       | -         | ◯           | Số tài khoản                      |
| 24  | →koza_meigi                   | String      | -       | -         | ◯           | Tên tài khoản                     |
| 25  | →haiten_flg                   | Boolean     | -       | -         | -           | Cờ đóng cửa (true: Đóng cửa, false: Đang kinh doanh) |
| 26  | →biko                         | String      | -       | -         | -           | Ghi chú                           |
| 27  | →created_at                   | String      | -       | ISO8601   | -           | Thời gian tạo                     |
| 28  | →updated_at                   | String      | -       | ISO8601   | ◯           | Thời gian cập nhật                |

## Ví Dụ Yêu Cầu

```json
POST /api/v1/hanbaiten
Content-Type: application/json

{
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "haiten_flg": false,
  "biko": "特別な対応なし"
}
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 500.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "haiten_flg": false,
    "biko": "特別な対応なし",
    "created_at": "2026-04-16T10:00:00Z",
    "updated_at": null
  }
}
```

## Ví Dụ Phản Hồi Thất Bại

### 400 Bad Request (Lỗi Xác Thực)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập vào không hợp lệ. Kiểm tra chi tiết trong trường errors",
  "errors": [
    { "field": "hanbaiten_code", "message": "Mã nhà phân phối là bắt buộc" },
    { "field": "hanbaiten_name", "message": "Tên nhà phân phối là bắt buộc" },
    { "field": "bank_code", "message": "Khi loại giao phó là chuyển khoản, mã ngân hàng là bắt buộc" }
  ]
}
```

### 401 Không được Phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 400 Bad Request (Mã Trùng Lặp)

```json
{
  "error_code": "DUPLICATE_CODE",
  "message": "Mã nhà phân phối trùng lặp đã được đăng ký"
}
```

### 500 Lỗi Máy Chủ Nội Bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy Trình Xử Lý

> ※ Quy trình sau được thực thi trong một giao dịch (transaction) duy nhất (xử lý chính + ghi lại nhật ký hoạt động).
> Nếu bất kỳ bước nào thất bại, toàn bộ giao dịch phải được rollback.
> Nhật ký lỗi (log_type=3) trong xử lý ngoại lệ được ghi lại riêng ngoài giao dịch.

### 4.1 Xác Thực Tham Số Yêu Cầu

- Xác thực thân yêu cầu:
  - hanbaiten_code: Bắt buộc, tối đa 10 ký tự, duy nhất trong JA hiện tại
  - hanbaiten_name: Bắt buộc, tối đa 100 ký tự
  - hanbaiten_name_kana: Tối đa 100 ký tự
  - torihikisaki_no: Tối đa 20 ký tự
  - yubin_no: Tối đa 7 ký tự (kiểm tra định dạng mã bưu chính)
  - address: Tối đa 200 ký tự
  - tel: Tối đa 15 ký tự
  - shocho_name: Tối đa 50 ký tự
  - itaku_kubun: Một trong 1, 2, 9
  - haitatsuryo_tanka_id: Kiểm tra kiểu số
  - tesuryo_kubun: Một trong 1, 2
  - tesuryo_amount: Kiểm tra kiểu số, ≧ 0
  - Khi itaku_kubun = 1 (Chuyển khoản):
    - bank_code: Bắt buộc, tối đa 4 ký tự
    - bank_name: Bắt buộc, tối đa 100 ký tự
    - bank_branch_code: Bắt buộc, tối đa 3 ký tự
    - bank_branch_name: Bắt buộc, tối đa 100 ký tự
    - yokin_shubetsu: Bắt buộc, 1 hoặc 2
    - koza_no: Bắt buộc, tối đa 10 ký tự
  - koza_meigi: Tối đa 50 ký tự
  - haiten_flg: Kiểm tra kiểu Boolean (mặc định là false)
  - biko: Kiểu văn bản
- Nếu lỗi xác thực: HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm Tra Xác Thực và Quyền Hạn

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem người dùng có quyền `hanbaiten.create` không.
  - Vai trò áp dụng: NICHINO_STAFF (Nhân viên Nhật Nông), CHUOKAI (Hội Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)

### 4.3 Kiểm Tra Trùng Lặp

- Lấy phạm vi (scope) của người dùng đã đăng nhập (ja_id).
- Kiểm tra trùng lặp theo điều kiện sau.

```sql
SELECT COUNT(*) FROM m_hanbaiten
WHERE hanbaiten_code = :hanbaiten_code
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu tồn tại trùng lặp: HTTP 400 (`DUPLICATE_CODE`)

### 4.4 Đăng Ký Dữ Liệu

- Thực thi SQL sau để đăng ký.

```sql
INSERT INTO m_hanbaiten (ja_id, hanbaiten_code, hanbaiten_name,
                         hanbaiten_name_kana, torihikisaki_no, yubin_no, address,
                         tel, fax, shocho_name, itaku_kubun,
                         haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
                         tesuryo_kubun, tesuryo_amount,
                         bank_code, bank_name, bank_branch_code, bank_branch_name,
                         yokin_shubetsu, koza_no, koza_meigi, haiten_flg, biko,
                         created_at, created_by, updated_at, updated_by)
VALUES (:ja_id, :hanbaiten_code, :hanbaiten_name,
        :hanbaiten_name_kana, :torihikisaki_no, :yubin_no, :address,
        :tel, :fax, :shocho_name, :itaku_kubun,
        :haitatsuryo_tanka_id, :haitatsuryo_shiharai_cycle,
        :tesuryo_kubun, :tesuryo_amount,
        :bank_code, :bank_name, :bank_branch_code, :bank_branch_name,
        :yokin_shubetsu, :koza_no, :koza_meigi, :haiten_flg, :biko,
        NOW(), :user_account_id, NOW(), :user_account_id)
RETURNING *
```

### 4.5 Ghi Lại Nhật Ký Hoạt Động

- Thực thi SQL sau để ghi lại nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn Hình Đăng Ký Thông Tin Nhà Phân Phối (ACSMS-SCR-017)', 'CREATE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví Dụ after_value:**

```json
`before_value`: Để trống vì là INSERT.
`after_value`: Lưu trữ dữ liệu được đăng ký dưới dạng JSON. Không bao gồm thông tin bí mật như mật khẩu.

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "haiten_flg": false,
  "biko": "特別な対応なし"
}
```

### 4.6 Tạo Phản Hồi

- Trả về dữ liệu được đăng ký dưới dạng đối tượng data. HTTP 201.

### 4.7 Xử Lý Ngoại Lệ

- Trong trường hợp lỗi kết nối cơ sở dữ liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ngay cả khi xảy ra lỗi, nhật ký hoạt động vẫn được ghi lại (`log_type = 3`).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn Hình Đăng Ký Thông Tin Nhà Phân Phối (ACSMS-SCR-017)', 'CREATE', 2,
        NULL, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-017-003

## Tổng Quan

| Trường                  | Nội Dung                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                 | Cập Nhật Nhà Phân Phối                                                                                                                                                                                                                   |
| Tổng Quan               | Cập nhật nhà phân phối được chỉ định                                                                                                                                                                                                           |
| URI                     | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                                                   |
| Phương Thức             | PUT                                                                                                                                                                                                                                |
| Thân Yêu Cầu            | JSON                                                                                                                                                                                                                               |
| Tham Số Yêu Cầu         | hanbaiten_id (tham số đường dẫn)                                                                                                                                                                                                     |
| Header                  | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                             |
| Mã Phản Hồi HTTP        | 200: Đã cập nhật nhà phân phối thành công, 400: Nội dung nhập vào có lỗi, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy nhà phân phối được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham Số Yêu Cầu

| #   | Mã Tham Số               | Kiểu Dữ Liệu | Lặp Lại | Bắt Buộc | Độ Dài Tối Thiểu | Độ Dài Tối Đa | Mô Tả                                     |
| --- | ----------------------- | ------------ | ------- | -------- | --------------- | ------------- | ---------------------------------------- |
| 1   | hanbaiten_id            | Number      | -       | ◯        | -               | -             | hanbaiten_id đối tượng cần cập nhật (tham số đường dẫn) |
| 2   | hanbaiten_name          | String      | -       | ◯        | 1               | 100           | Tên nhà phân phối                         |
| 3   | hanbaiten_name_kana     | String      | -       | -        | 1               | 100           | Tên nhà phân phối (Katakana)              |
| 4   | torihikisaki_no         | String      | -       | -        | 1               | 20            | Số định danh của người phát hành hóa đơn |
| 5   | yubin_no                | String      | -       | -        | 1               | 7             | Mã bưu chính                              |
| 6   | address                 | String      | -       | -        | 1               | 200           | Địa chỉ                                   |
| 7   | tel                     | String      | -       | -        | 1               | 15            | Số điện thoại                             |
| 8   | fax                     | String      | -       | -        | 1               | 15            | Số fax                                    |
| 9   | shocho_name             | String      | -       | -        | 1               | 50            | Tên quản lý                               |
| 10  | itaku_kubun             | Number      | -       | -        | -               | -             | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 11  | haitatsuryo_tanka_id    | Number      | -       | -        | -               | -             | ID đơn giá phí giao hàng                  |
| 12  | haitatsuryo_shiharai_cycle | Number   | -       | -        | -               | -             | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 13  | tesuryo_kubun           | Number      | -       | -        | -               | -             | Loại phí (1: JA, 2: Nhà phân phối)       |
| 14  | tesuryo_amount          | Number      | -       | -        | -               | -             | Số tiền phí ≧ 0                          |
| 15  | bank_code               | String      | -       | -        | 1               | 4             | Mã ngân hàng (bắt buộc khi itaku_kubun=1) |
| 16  | bank_name               | String      | -       | -        | 1               | 100           | Tên ngân hàng (bắt buộc khi itaku_kubun=1) |
| 17  | bank_branch_code        | String      | -       | -        | 1               | 3             | Mã chi nhánh (bắt buộc khi itaku_kubun=1) |
| 18  | bank_branch_name        | String      | -       | -        | 1               | 100           | Tên chi nhánh (bắt buộc khi itaku_kubun=1) |
| 19  | yokin_shubetsu          | Number      | -       | -        | -               | -             | Loại tài khoản (1: Tiền gửi thường, 2: Tiền gửi cuối kỳ, bắt buộc khi itaku_kubun=1) |
| 20  | koza_no                 | String      | -       | -        | 1               | 10            | Số tài khoản (bắt buộc khi itaku_kubun=1) |
| 21  | koza_meigi              | String      | -       | -        | 1               | 50            | Tên tài khoản                             |
| 22  | haiten_flg              | Boolean     | -       | -        | -               | -             | Cờ đóng cửa (true: Đóng cửa, false: Đang kinh doanh) |
| 23  | biko                    | String      | -       | -        | -               | -             | Ghi chú                                   |

※ hanbaiten_code không thể cập nhật (vô hiệu hóa trên màn hình). Không bao gồm trong yêu cầu.

## Dữ Liệu Phản Hồi

| #   | Mã Trường                     | Kiểu Dữ Liệu | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả                       |
| --- | ----------------------------- | ------------ | ------- | --------- | ----------- | -------------------------- |
| 1   | data                          | Object      | -       | -         | -           | Dữ liệu nhà phân phối được cập nhật |
| 2   | →hanbaiten_id                 | Number      | -       | -         | -           | ID nhà phân phối                  |
| 3   | →ja_id                        | Number      | -       | -         | -           | ID JA                              |
| 4   | →hanbaiten_code               | String      | -       | -         | -           | Mã nhà phân phối (không thể chỉnh sửa) |
| 5   | →hanbaiten_name               | String      | -       | -         | -           | Tên nhà phân phối                 |
| 6   | →hanbaiten_name_kana          | String      | -       | -         | -           | Tên nhà phân phối (Katakana)      |
| 7   | →torihikisaki_no              | String      | -       | -         | ◯           | Số định danh của người phát hành hóa đơn |
| 8   | →yubin_no                     | String      | -       | -         | -           | Mã bưu chính                      |
| 9   | →address                      | String      | -       | -         | -           | Địa chỉ                          |
| 10  | →tel                          | String      | -       | -         | -           | Số điện thoại                     |
| 11  | →fax                          | String      | -       | -         | -           | Số fax                            |
| 12  | →shocho_name                  | String      | -       | -         | ◯           | Tên quản lý                       |
| 13  | →itaku_kubun                  | Number      | -       | -         | ◯           | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 14  | →haitatsuryo_tanka_id         | Number      | -       | -         | ◯           | ID đơn giá phí giao hàng          |
| 15  | →haitatsuryo_shiharai_cycle   | Number      | -       | -         | ◯           | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 16  | →tesuryo_kubun                | Number      | -       | -         | ◯           | Loại phí (1: JA, 2: Nhà phân phối) |
| 17  | →tesuryo_amount               | Number      | -       | 0.00      | ◯           | Số tiền phí                       |
| 18  | →bank_code                    | String      | -       | -         | -           | Mã ngân hàng                      |
| 19  | →bank_name                    | String      | -       | -         | -           | Tên ngân hàng                     |
| 20  | →bank_branch_code             | String      | -       | -         | ◯           | Mã chi nhánh                      |
| 21  | →bank_branch_name             | String      | -       | -         | ◯           | Tên chi nhánh                     |
| 22  | →yokin_shubetsu               | Number      | -       | -         | ◯           | Loại tài khoản (1: Tiền gửi thường, 2: Tiền gửi cuối kỳ) |
| 23  | →koza_no                      | String      | -       | -         | ◯           | Số tài khoản                      |
| 24  | →koza_meigi                   | String      | -       | -         | ◯           | Tên tài khoản                     |
| 25  | →haiten_flg                   | Boolean     | -       | -         | -           | Cờ đóng cửa (true: Đóng cửa, false: Đang kinh doanh) |
| 26  | →biko                         | String      | -       | -         | -           | Ghi chú                           |
| 27  | →created_at                   | String      | -       | ISO8601   | -           | Thời gian tạo                     |
| 28  | →updated_at                   | String      | -       | ISO8601   | ◯           | Thời gian cập nhật                |

## Ví Dụ Yêu Cầu

```json
PUT /api/v1/hanbaiten/1
Content-Type: application/json

{
  "hanbaiten_name": "販売店A改定",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 600.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "haiten_flg": false,
  "biko": "更新しました"
}
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": {
    "hanbaiten_id": 1,
    "ja_id": 1,
    "hanbaiten_code": "H001",
    "hanbaiten_name": "販売店A改定",
    "hanbaiten_name_kana": "ハンバイテンA",
    "torihikisaki_no": "1234567890123",
    "yubin_no": "1000001",
    "address": "東京都千代田区1-1-1",
    "tel": "03-1234-5678",
    "fax": "03-1234-5679",
    "shocho_name": "山田太郎",
    "itaku_kubun": 1,
    "haitatsuryo_tanka_id": 10,
    "haitatsuryo_shiharai_cycle": 1,
    "tesuryo_kubun": 1,
    "tesuryo_amount": 600.00,
    "bank_code": "0001",
    "bank_name": "○○銀行",
    "bank_branch_code": "001",
    "bank_branch_name": "東京支店",
    "yokin_shubetsu": 1,
    "koza_no": "1234567",
    "koza_meigi": "販売店A代表",
    "haiten_flg": false,
    "biko": "更新しました",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-04-16T14:30:00Z"
  }
}
```

## Ví Dụ Phản Hồi Thất Bại

### 400 Bad Request (Lỗi Xác Thực)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập vào không hợp lệ. Kiểm tra chi tiết trong trường errors",
  "errors": [
    { "field": "hanbaiten_name", "message": "Tên nhà phân phối là bắt buộc" },
    { "field": "bank_code", "message": "Khi loại giao phó là chuyển khoản, mã ngân hàng là bắt buộc" }
  ]
}
```

### 401 Không được Phép

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại"
}
```

### 403 Cấm

```json
{
  "error_code": "FORBIDDEN",
  "message": "Bạn không có quyền truy cập màn hình này"
}
```

### 403 Vi Phạm Phạm Vi Dữ Liệu

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "Bạn không có quyền truy cập dữ liệu này"
}
```

### 404 Không Tìm Thấy

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy nhà phân phối được chỉ định"
}
```

### 500 Lỗi Máy Chủ Nội Bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy Trình Xử Lý

> ※ Quy trình sau được thực thi trong một giao dịch (transaction) duy nhất (xử lý chính + ghi lại nhật ký hoạt động).
> Nếu bất kỳ bước nào thất bại, toàn bộ giao dịch phải được rollback.
> Nhật ký lỗi (log_type=3) trong xử lý ngoại lệ được ghi lại riêng ngoài giao dịch.

### 4.1 Xác Thực Tham Số Yêu Cầu

- Tham số đường dẫn: hanbaiten_id kiểm tra kiểu số, bắt buộc
- Thân yêu cầu:
  - hanbaiten_name: Bắt buộc, tối đa 100 ký tự
  - hanbaiten_name_kana: Tối đa 100 ký tự
  - torihikisaki_no: Tối đa 20 ký tự
  - yubin_no: Tối đa 7 ký tự (kiểm tra định dạng mã bưu chính)
  - address: Tối đa 200 ký tự
  - tel: Tối đa 15 ký tự
  - shocho_name: Tối đa 50 ký tự
  - itaku_kubun: Một trong 1, 2, 9
  - haitatsuryo_tanka_id: Kiểm tra kiểu số
  - tesuryo_kubun: Một trong 1, 2
  - tesuryo_amount: Kiểm tra kiểu số, ≧ 0
  - Khi itaku_kubun = 1 (Chuyển khoản):
    - bank_code: Bắt buộc, tối đa 4 ký tự
    - bank_name: Bắt buộc, tối đa 100 ký tự
    - bank_branch_code: Bắt buộc, tối đa 3 ký tự
    - bank_branch_name: Bắt buộc, tối đa 100 ký tự
    - yokin_shubetsu: Bắt buộc, 1 hoặc 2
    - koza_no: Bắt buộc, tối đa 10 ký tự
  - koza_meigi: Tối đa 50 ký tự
  - haiten_flg: Kiểm tra kiểu Boolean
  - biko: Kiểu văn bản
- Nếu lỗi xác thực: HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm Tra Xác Thực và Quyền Hạn

- Nếu xác thực thất bại: HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem người dùng có quyền `hanbaiten.update` không.
  - Vai trò áp dụng: NICHINO_STAFF (Nhân viên Nhật Nông), CHUOKAI (Hội Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu không có quyền: HTTP 403 (`FORBIDDEN`)

### 4.3 Kiểm Tra Tồn Tại của Bản Ghi Đích

- Lấy phạm vi (scope) của người dùng đã đăng nhập (ja_id).

```sql
SELECT * FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Cập Nhật Dữ Liệu

```sql
UPDATE m_hanbaiten
SET hanbaiten_name = :hanbaiten_name,
    hanbaiten_name_kana = :hanbaiten_name_kana,
    torihikisaki_no = :torihikisaki_no,
    yubin_no = :yubin_no,
    address = :address,
    tel = :tel,
    fax = :fax,
    shocho_name = :shocho_name,
    itaku_kubun = :itaku_kubun,
    haitatsuryo_tanka_id = :haitatsuryo_tanka_id,
    haitatsuryo_shiharai_cycle = :haitatsuryo_shiharai_cycle,
    tesuryo_kubun = :tesuryo_kubun,
    tesuryo_amount = :tesuryo_amount,
    bank_code = :bank_code,
    bank_name = :bank_name,
    bank_branch_code = :bank_branch_code,
    bank_branch_name = :bank_branch_name,
    yokin_shubetsu = :yokin_shubetsu,
    koza_no = :koza_no,
    koza_meigi = :koza_meigi,
    haiten_flg = :haiten_flg,
    biko = :biko,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi Lại Nhật Ký Hoạt Động

- Lấy dữ liệu trước khi cập nhật (kết quả SELECT từ 4.3) và lưu trữ vào `before_value`.
- Thực thi SQL sau để ghi lại nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn Hình Đăng Ký Thông Tin Nhà Phân Phối (ACSMS-SCR-017)', 'UPDATE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví Dụ before_value:**

```json
`before_value`: Lưu trữ dữ liệu trước khi cập nhật dưới dạng JSON. Không bao gồm thông tin bí mật như mật khẩu.

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "haiten_flg": false,
  "biko": "特別な対応なし"
}
```

**Ví Dụ after_value:**

```json
`after_value`: Lưu trữ dữ liệu sau khi cập nhật dưới dạng JSON. Không bao gồm thông tin bí mật như mật khẩu.

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "販売店A改定",
  "hanbaiten_name_kana": "ハンバイテンA",
  "torihikisaki_no": "1234567890123",
  "yubin_no": "1000001",
  "address": "東京都千代田区1-1-1",
  "tel": "03-1234-5678",
  "fax": "03-1234-5679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_tanka_id": 10,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 600.00,
  "bank_code": "0001",
  "bank_name": "○○銀行",
  "bank_branch_code": "001",
  "bank_branch_name": "東京支店",
  "yokin_shubetsu": 1,
  "koza_no": "1234567",
  "koza_meigi": "販売店A代表",
  "haiten_flg": false,
  "biko": "更新しました"
}
```

### 4.6 Tạo Phản Hồi

- Trả về dữ liệu được cập nhật dưới dạng đối tượng data. HTTP 200.

### 4.7 Xử Lý Ngoại Lệ

- Trong trường hợp lỗi kết nối cơ sở dữ liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Ngay cả khi xảy ra lỗi, nhật ký hoạt động vẫn được ghi lại (`log_type = 3`).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        'Màn Hình Đăng Ký Thông Tin Nhà Phân Phối (ACSMS-SCR-017)', 'UPDATE', 2,
        :hanbaiten_id, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
