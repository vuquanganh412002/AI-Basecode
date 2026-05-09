---
customer_name: Japan Agricultural News
system_name: Hệ Thống Quản Lý Độc Giả Phiên Bản Cloud
document_name: Tài Liệu Thiết Kế API
screen_id: ACSMS-SCR-018
screen_name: Màn Hình Tìm Kiếm Chi Tiết Nhà Phân Phối
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
"Màn Hình Tìm Kiếm Chi Tiết Nhà Phân Phối (ACSMS-SCR-018)".

## Tài Liệu Liên Quan

| No  | Mã Tài Liệu   | Tên Tài Liệu                      |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-017 | Tài Liệu Thiết Kế API Màn Hình Đăng Ký Thông Tin Nhà Phân Phối |

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
| 9   | Riêng màn hình | CONFLICT    | Không thể xóa vì tồn tại dữ liệu liên quan.                 | HTTP 409    |

---

# API ACSMS-API-018-001

## Tổng Quan

| Trường                  | Nội Dung                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                 | Lấy Danh Sách Nhà Phân Phối                                                                                                                                                                |
| Tổng Quan               | Lấy danh sách chính thông tin nhà phân phối theo điều kiện tìm kiếm, phân trang và sắp xếp                                                                                                 |
| URI                     | /api/v1/hanbaiten                                                                                                                                                                           |
| Phương Thức             | GET                                                                                                                                                                                         |
| Thân Yêu Cầu            | Không có                                                                                                                                                                                   |
| Tham Số Yêu Cầu         | Tham số truy vấn                                                                                                                                                                            |
| Header                  | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                               |
| Mã Phản Hồi HTTP        | 200: Đã lấy danh sách nhà phân phối thành công, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 500: Đã xảy ra lỗi hệ thống |

## Tham Số Yêu Cầu

| #   | Mã Tham Số       | Kiểu Dữ Liệu | Lặp Lại | Bắt Buộc | Độ Dài Tối Thiểu | Độ Dài Tối Đa | Mô Tả                                              |
| --- | --------------- | ------------ | ------- | -------- | --------------- | ------------- | -------------------------------------------------- |
| 1   | hanbaiten_code  | String      | -       | -        | -               | 10            | Mã nhà phân phối (tìm kiếm khớp một phần)         |
| 2   | hanbaiten_name  | String      | -       | -        | -               | 100           | Tên nhà phân phối (tìm kiếm khớp một phần)        |
| 3   | tel             | String      | -       | -        | -               | 15            | Số điện thoại (tìm kiếm khớp một phần)            |
| 4   | fax             | String      | -       | -        | -               | 15            | Số fax (tìm kiếm khớp một phần)                    |
| 5   | address         | String      | -       | -        | -               | 200           | Địa chỉ (tìm kiếm khớp một phần)                  |
| 6   | shocho_name     | String      | -       | -        | -               | 50            | Tên quản lý (tìm kiếm khớp một phần)              |
| 7   | page            | Number      | -       | -        | -               | -             | Số trang (bắt đầu từ 1). Mặc định: 1              |
| 8   | per_page        | Number      | -       | -        | -               | -             | Số bản ghi trên một trang (1-100). Mặc định: 20   |
| 9   | sort_by         | String      | -       | -        | -               | -             | Cột sắp xếp (hanbaiten_code, hanbaiten_name). Mặc định: created_at |
| 10  | sort_order      | String      | -       | -        | -               | -             | Thứ tự sắp xếp (asc, desc). Mặc định: desc        |

## Dữ Liệu Phản Hồi

| #   | Mã Trường                       | Kiểu Dữ Liệu | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả                              |
| --- | ------------------------------- | ------------ | ------- | --------- | ----------- | ---------------------------------- |
| 1   | data                            | Array       | ◯       | -         | -           | Mảng dữ liệu nhà phân phối         |
| 2   | →hanbaiten_id                   | Number      | -       | -         | -           | ID nhà phân phối                   |
| 3   | →ja_id                          | Number      | -       | -         | -           | ID JA                              |
| 4   | →hanbaiten_code                 | String      | -       | -         | -           | Mã nhà phân phối                   |
| 5   | →hanbaiten_name                 | String      | -       | -         | -           | Tên nhà phân phối                  |
| 6   | →yubin_no                       | String      | -       | -         | -           | Mã bưu chính                       |
| 7   | →address                        | String      | -       | -         | -           | Địa chỉ                            |
| 8   | →tel                            | String      | -       | -         | -           | Số điện thoại                      |
| 9   | →fax                            | String      | -       | -         | -           | Số fax                             |
| 10  | →shocho_name                    | String      | -       | -         | -           | Tên quản lý                        |
| 11  | →itaku_kubun                    | Number      | -       | -         | ◯           | Loại giao phó (1: Chuyển khoản, 2: Giao phó cho Nhật Nông, 9: Khác) |
| 12  | →itaku_kubun_label              | String      | -       | -         | ◯           | Nhãn loại giao phó                 |
| 13  | →haitatsuryo_shiharai_cycle     | Number      | -       | -         | ◯           | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 14  | →tesuryo_kubun                  | Number      | -       | -         | ◯           | Loại chịu phí chuyển khoản (1: JA, 2: Nhà phân phối) |
| 15  | →tesuryo_kubun_label            | String      | -       | -         | ◯           | Nhãn loại chịu phí chuyển khoản   |
| 16  | →tesuryo_amount                 | Number      | -       | -         | ◯           | Số tiền phí                        |
| 17  | →created_at                     | String      | -       | ISO8601   | -           | Thời gian tạo                      |
| 18  | →updated_at                     | String      | -       | ISO8601   | ◯           | Thời gian cập nhật                 |
| 19  | meta                            | Object      | -       | -         | -           | Thông tin phân trang               |
| 20  | →total                          | Number      | -       | -         | -           | Tổng số bản ghi                    |
| 21  | →page                           | Number      | -       | -         | -           | Số trang hiện tại                  |
| 22  | →per_page                       | Number      | -       | -         | -           | Số bản ghi trên một trang          |
| 23  | →total_pages                    | Number      | -       | -         | -           | Tổng số trang                      |

## Ví Dụ Yêu Cầu

```
GET /api/v1/hanbaiten?hanbaiten_name=山田&tel=03&page=1&per_page=20&sort_by=hanbaiten_code&sort_order=asc
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "data": [
    {
      "hanbaiten_id": 1,
      "ja_id": 1,
      "hanbaiten_code": "H001",
      "hanbaiten_name": "山田新聞販売店",
      "yubin_no": "1000001",
      "address": "東京都千代田区千代田1-1",
      "tel": "0312345678",
      "fax": "0312345679",
      "shocho_name": "山田太郎",
      "itaku_kubun": 1,
      "itaku_kubun_label": "振込",
      "haitatsuryo_shiharai_cycle": 1,
      "tesuryo_kubun": 1,
      "tesuryo_kubun_label": "JA",
      "tesuryo_amount": 500,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    },
    {
      "hanbaiten_id": 2,
      "ja_id": 1,
      "hanbaiten_code": "H002",
      "hanbaiten_name": "山田書店",
      "yubin_no": "1500001",
      "address": "東京都渋谷区神宮前1-2-3",
      "tel": "0398765432",
      "fax": "0398765433",
      "shocho_name": "山田花子",
      "itaku_kubun": 2,
      "itaku_kubun_label": "日農委託",
      "haitatsuryo_shiharai_cycle": 3,
      "tesuryo_kubun": 2,
      "tesuryo_kubun_label": "販売店",
      "tesuryo_amount": 300,
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": null
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
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

### 500 Lỗi Máy Chủ Nội Bộ

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau"
}
```

## Quy Trình Xử Lý

### 4.1 Xác Thực Tham Số Yêu Cầu

- Xác thực tham số truy vấn:
  - hanbaiten_code: Tối đa 10 ký tự
  - hanbaiten_name: Tối đa 100 ký tự
  - tel: Tối đa 15 ký tự
  - fax: Tối đa 15 ký tự
  - address: Tối đa 200 ký tự
  - shocho_name: Tối đa 50 ký tự
  - page: Số nguyên dương. Mặc định: 1
  - per_page: Số nguyên từ 1-100. Mặc định: 20
  - sort_by: Chỉ cho phép cột (hanbaiten_code, hanbaiten_name, created_at). Mặc định: created_at
  - sort_order: Chỉ cho phép asc hoặc desc. Mặc định: desc
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm Tra Xác Thực và Quyền Hạn

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Nếu xác thực thất bại: HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra quyền: Kiểm tra xem người dùng có quyền `hanbaiten.view` không.
  - Vai trò áp dụng: NICHINO_STAFF (Nhân viên Nhật Nông), CHUOKAI (Hội Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
- Nếu không có quyền: HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Thiết Lập Điều Kiện Lấy Dữ Liệu

- Lấy phạm vi (scope) của người dùng đã đăng nhập (role_code, ja_id).
- Xây dựng điều kiện DataScope:
  - NICHINO_STAFF: Không có bộ lọc ja_id (có thể truy cập nhà phân phối của tất cả JA)
  - CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN: `ja_id = :ja_id` (chỉ JA của riêng mình)
- Điều kiện cơ bản:
  - `deleted_at IS NULL` (loại trừ xóa logic: điều kiện bắt buộc)
- Điều kiện tìm kiếm (chỉ thêm khi được chỉ định):
  - Khi chỉ định hanbaiten_code: `hanbaiten_code ILIKE '%' || :hanbaiten_code || '%'`
  - Khi chỉ định hanbaiten_name: `hanbaiten_name ILIKE '%' || :hanbaiten_name || '%'`
  - Khi chỉ định tel: `tel ILIKE '%' || :tel || '%'`
  - Khi chỉ định fax: `fax ILIKE '%' || :fax || '%'`
  - Khi chỉ định address: `address ILIKE '%' || :address || '%'`
  - Khi chỉ định shocho_name: `shocho_name ILIKE '%' || :shocho_name || '%'`

### 4.4 Lấy Số Lượng Bản Ghi Dữ Liệu

```sql
SELECT COUNT(*) AS total
FROM m_hanbaiten
WHERE deleted_at IS NULL
  AND (:role_code = 'NICHINO_STAFF' OR ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR shocho_name ILIKE '%' || :shocho_name || '%')
```

### 4.5 Lấy Dữ Liệu

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       yubin_no, address, tel, fax, shocho_name,
       itaku_kubun, haitatsuryo_shiharai_cycle,
       tesuryo_kubun, tesuryo_amount,
       created_at, updated_at
FROM m_hanbaiten
WHERE deleted_at IS NULL
  AND (:role_code = 'NICHINO_STAFF' OR ja_id = :ja_id)
  AND (:hanbaiten_code IS NULL OR hanbaiten_code ILIKE '%' || :hanbaiten_code || '%')
  AND (:hanbaiten_name IS NULL OR hanbaiten_name ILIKE '%' || :hanbaiten_name || '%')
  AND (:tel IS NULL OR tel ILIKE '%' || :tel || '%')
  AND (:fax IS NULL OR fax ILIKE '%' || :fax || '%')
  AND (:address IS NULL OR address ILIKE '%' || :address || '%')
  AND (:shocho_name IS NULL OR shocho_name ILIKE '%' || :shocho_name || '%')
ORDER BY :sort_by :sort_order
LIMIT :per_page
OFFSET (:page - 1) * :per_page
```

### 4.6 Tạo Phản Hồi

- Ánh xạ giá trị mã thành nhãn:
  - itaku_kubun: 1 → Chuyển khoản, 2 → Giao phó cho Nhật Nông, 9 → Khác
  - tesuryo_kubun: 1 → JA, 2 → Nhà phân phối
- Trả về JSON chứa mảng data và đối tượng meta.
- total_pages = CEIL(total / per_page)
- Nếu kết quả tìm kiếm là 0 bản ghi, vẫn trả về mảng rỗng `[]` (HTTP 200).

### 4.7 Xử Lý Ngoại Lệ

- Trong trường hợp lỗi kết nối cơ sở dữ liệu, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-018-002

## Tổng Quan

| Trường                  | Nội Dung                                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------- |
| Tên API                 | Xóa Nhà Phân Phối                                                                                                                                                                                                                                                                    |
| Tổng Quan               | Xóa logic nhà phân phối được chỉ định (không thể xóa nếu tồn tại dữ liệu liên quan)                                                                                                                                                                                               |
| URI                     | /api/v1/hanbaiten/{hanbaiten_id}                                                                                                                                                                                                                                                     |
| Phương Thức             | DELETE                                                                                                                                                                                                                                                                              |
| Thân Yêu Cầu            | Không có                                                                                                                                                                                                                                                                           |
| Tham Số Yêu Cầu         | hanbaiten_id (tham số đường dẫn)                                                                                                                                                                                                                                                    |
| Header                  | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                                                                      |
| Mã Phản Hồi HTTP        | 200: Đã xóa nhà phân phối thành công, 401: Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy nhà phân phối được chỉ định, 409: Không thể xóa vì tồn tại dữ liệu liên quan, 500: Đã xảy ra lỗi hệ thống |

## Tham Số Yêu Cầu

| #   | Mã Tham Số     | Kiểu Dữ Liệu | Lặp Lại | Bắt Buộc | Độ Dài Tối Thiểu | Độ Dài Tối Đa | Mô Tả                          |
| --- | -------------- | ------------ | ------- | -------- | --------------- | ------------- | ------------------------------ |
| 1   | hanbaiten_id   | Number      | -       | ◯        | -               | -             | hanbaiten_id của đối tượng xóa (tham số đường dẫn) |

## Dữ Liệu Phản Hồi

| #   | Mã Trường | Kiểu Dữ Liệu | Lặp Lại | Định Dạng | Có Thể Null | Mô Tả         |
| --- | --------- | ------------ | ------- | --------- | ----------- | ------------- |
| 1   | message   | String      | -       | -         | -           | Thông báo xóa thành công |

## Ví Dụ Yêu Cầu

```
DELETE /api/v1/hanbaiten/1
```

## Ví Dụ Phản Hồi Thành Công

```json
{
  "message": "Đã xóa thành công"
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

### 409 Xung Đột

```json
{
  "error_code": "CONFLICT",
  "message": "Không thể xóa vì tồn tại dữ liệu liên quan"
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

- Xác thực tham số đường dẫn:
  - hanbaiten_id: Kiểm tra kiểu số, kiểm tra bắt buộc
- Nếu tham số không hợp lệ:
  - Trả về HTTP 400 Bad Request.

### 4.2 Kiểm Tra Xác Thực và Quyền Hạn

- Xác thực thông tin xác thực (phiên HTTP-only Cookie).
- Kiểm tra quyền: Kiểm tra xem người dùng có quyền `hanbaiten.delete` không.
  - Vai trò áp dụng: CHUOKAI (Hội Trung Ương), JA_HONTEN (Trụ Sở Chính JA), JA_KANRI_SHITEN (Chi Nhánh Quản Lý JA)
  - ※ NICHINO_STAFF (Nhân viên Nhật Nông) không sở hữu quyền `hanbaiten.delete`, vì vậy không thể xóa

### 4.3 Thiết Lập Điều Kiện Lấy Dữ Liệu

- Lấy phạm vi (scope) của người dùng đã đăng nhập (ja_id).
- Thực hiện kiểm tra tồn tại của bản ghi đích và kiểm tra phạm vi.

```sql
SELECT hanbaiten_id, ja_id, hanbaiten_code, hanbaiten_name,
       hanbaiten_name_kana, torihikisaki_no,
       yubin_no, address, tel, fax, shocho_name,
       itaku_kubun, haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
       tesuryo_kubun, tesuryo_amount,
       bank_code, bank_name, bank_branch_code, bank_branch_name,
       yokin_shubetsu, koza_no, koza_meigi, biko,
       created_at, updated_at
FROM m_hanbaiten
WHERE hanbaiten_id = :hanbaiten_id
  AND deleted_at IS NULL
```

- Nếu bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Nếu ja_id không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 Kiểm Tra Tồn Tại Dữ Liệu Liên Quan

- Xác minh xem nhà phân phối đích có được tham chiếu trong các bảng sau không.

**Bảng Độc Giả:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya
WHERE hanbaiten_id = :hanbaiten_id
  AND deleted_at IS NULL
```

**Bảng Lịch Sử Độc Giả:**

```sql
SELECT COUNT(*) AS cnt
FROM t_dokusya_rireki
WHERE hanbaiten_id = :hanbaiten_id
```

- Nếu dữ liệu liên quan tồn tại trong bất kỳ bảng nào (cnt > 0): HTTP 409 (`CONFLICT`)

### 4.5 Thực Hiện Xóa Logic

```sql
UPDATE m_hanbaiten
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

### 4.6 Ghi Lại Nhật Ký Hoạt Động

- Thực thi SQL sau để ghi lại nhật ký hoạt động.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn Hình Tìm Kiếm Chi Tiết Nhà Phân Phối (ACSMS-SCR-018)', 'DELETE', 1,
        :hanbaiten_id, 'm_hanbaiten',
        :before_value_json, '',
        '', '',
        :ip_address, :user_agent)
```

**Ví Dụ before_value:**

```json
`before_value`: Lưu trữ dữ liệu trước khi xóa dưới dạng JSON. Không bao gồm thông tin bí mật như mật khẩu.
`after_value`: Để trống vì là DELETE.

{
  "hanbaiten_id": 1,
  "ja_id": 1,
  "hanbaiten_code": "H001",
  "hanbaiten_name": "山田新聞販売店",
  "yubin_no": "1000001",
  "address": "東京都千代田区千代田1-1",
  "tel": "0312345678",
  "fax": "0312345679",
  "shocho_name": "山田太郎",
  "itaku_kubun": 1,
  "haitatsuryo_shiharai_cycle": 1,
  "tesuryo_kubun": 1,
  "tesuryo_amount": 500
}
```

### 4.7 Tạo Phản Hồi

- Trả về thông báo xóa thành công. HTTP 200.

### 4.8 Xử Lý Ngoại Lệ

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
        'Màn Hình Tìm Kiếm Chi Tiết Nhà Phân Phối (ACSMS-SCR-018)', 'DELETE', 2,
        :hanbaiten_id, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
