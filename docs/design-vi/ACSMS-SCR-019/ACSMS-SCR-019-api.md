---
customer_name: Công ty Nhật báo Nông nghiệp Nhật Bản
system_name: Hệ thống Quản lý Thuê bao Đám mây
document_name: Tài liệu Thiết kế API
screen_id: ACSMS-SCR-019
screen_name: Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-22
created_date: 2026/04/22
created_by: Tran Duc Tuyen
updated_date: 2026/04/22
updated_by: Tran Duc Tuyen
---

## Lịch sử Thay đổi

| Số  | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung Thay đổi | Người xác minh | Người duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/22 | 1.0  | Tran Duc Tuyen | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan Hệ thống

Hệ thống này là một Hệ thống Quản lý Thuê bao dựa trên Đám mây dành cho JA,
cung cấp các chức năng quản lý Thông tin Thuê bao, quản lý Lịch sử Thuê bao, quản lý Dữ liệu Chuyển khoản Tài khoản, v.v.

Các chức năng chính bao gồm Đăng ký, Cập nhật, Tìm kiếm Thông tin Thuê bao,
Quản lý Lịch sử Thay đổi Nội dung Thuê bao, Tạo và Quản lý Dữ liệu Chuyển khoản Tài khoản, 
Chức năng Tải lên/Tải xuống Tệp, Quản lý Thông báo Hệ thống, v.v.

Ngoài ra, nó hỗ trợ Quản lý Đăng nhập Người dùng, Ghi lại Lịch sử Đăng nhập,
Ghi lại Nhật ký Hoạt động Người dùng và các chức năng Bảo mật + Kiểm tra.

## Mục đích Tài liệu

Tài liệu này mô tả chi tiết về API mới được tạo trên Hệ thống trong Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng (ACSMS-SCR-019).

## Tài liệu Liên quan

| Số  | Mã Tài liệu   | Tên Tài liệu                   |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-017 | Tài liệu Thiết kế API Màn hình Đăng ký Thông tin Cửa hàng Bán hàng     |
| 2   | ACSMS-SCR-018 | Tài liệu Thiết kế API Màn hình Tìm kiếm Chi tiết Cửa hàng Bán hàng     |

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
| 8   | Cụ thể Màn hình     | NOT_FOUND             | Cửa hàng Bán hàng được chỉ định không được Tìm thấy।                                     | HTTP 404 |
| 9   | Cụ thể Màn hình     | DUPLICATE_CODE        | Mã Cửa hàng Bán hàng giống nhau đã được Đăng ký।                             | HTTP 400 |
| 10  | Cụ thể Màn hình     | IMPORT_VALIDATION_ERROR | Dữ liệu Nhập khẩu Excel có Lỗi। Vui lòng kiểm tra Trường errors।| HTTP 400 |
| 11  | Cụ thể Màn hình     | FILE_FORMAT_ERROR     | Không thể nhập Tệp Excel। Vui lòng kiểm tra Định dạng Tệp।        | HTTP 400 |
| 12  | Cụ thể Màn hình     | ROW_LIMIT_EXCEEDED    | Dữ liệu Nhập khẩu vượt quá Giới hạn Hàng (500 hàng)।                          | HTTP 400 |

---

# API ACSMS-API-019-001

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                  | Tải xuống Mẫu Nhập khẩu Cửa hàng Bán hàng                                                                                                                                                   |
| Tổng quan                   | Tạo và Tải xuống Tệp Mẫu (23 cột cố định) để Nhập dữ liệu Excel Cửa hàng Bán hàng                                                                                                    |
| URI                    | /api/v1/hanbaiten/import/template                                                                                                                                                    |
| Phương thức               | GET                                                                                                                                                                                  |
| Thân Yêu cầu     | Không                                                                                                                                                                                  |
| Tham số Yêu cầu | Không                                                                                                                                                                                |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                               |
| Mã Phản hồi HTTP   | 200:Mẫu được tạo thành công, 401:Phiên đã hết hạn। Vui lòng Đăng nhập lại, 403:Bạn không có Quyền truy cập Màn hình này, 500:Đã xảy ra Lỗi Hệ thống                |

## Tham số Yêu cầu

Không

## Dữ liệu Phản hồi

| #   | ID Mục              | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả                                                 |
| --- | ------------------- | ------ | -------- | ------------ | -------- | ---------------------------------------------------- |
| 1   | (Dữ liệu Nhị phân)  | Binary | -        | XLSX         | -        | Tệp Excel (MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet) |

### Tiêu đề Phản hồi

| Tên Tiêu đề            | Giá trị                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Content-Type        | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet                          |
| Content-Disposition | attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"                             |

### Thông số Kỹ thuật Tệp Mẫu

- Tên Trang tính：`Cửa hàng Bán hàng`
- Hàng 1：Hàng Tiêu đề (23 cột theo thứ tự sau)

| Cột | Tên Tiêu đề             | Cột Logic                 | Cột Vật lý                 | Loại Dữ liệu      | Số chữ số |
| -- | ---------------------- | -------------------------- | -------------------------- | ------------- | ---- |
| 1  | Mã Cửa hàng Bán hàng           | Mã Cửa hàng Bán hàng               | hanbaiten_code             | VARCHAR       | 10   |
| 2  | Tên Cửa hàng Bán hàng             | Tên Cửa hàng Bán hàng                   | hanbaiten_name             | VARCHAR       | 100  |
| 3  | Tên Cửa hàng Bán hàng (Kana)     | Tên Cửa hàng (Kana)           | hanbaiten_name_kana        | VARCHAR       | 100  |
| 4  | Số Hóa đơn         | Số Người phát hành Hóa đơn Nơi chứa   | torihikisaki_no            | VARCHAR       | 20   |
| 5  | Mã Bưu chính               | Mã Bưu chính                   | yubin_no                   | VARCHAR       | 7    |
| 6  | Địa chỉ                   | Địa chỉ                       | address                    | VARCHAR       | 200  |
| 7  | Số Điện thoại               | Số Điện thoại                       | tel                        | VARCHAR       | 15   |
| 8  | Số Fax                | Số Fax                    | fax                        | VARCHAR       | 15   |
| 9  | Tên Trưởng                 | Tên Trưởng                     | shocho_name                | VARCHAR       | 50   |
| 10 | Phân loại Ủy thác               | Phân loại Ủy thác                   | itaku_kubun                | INTEGER       | -    |
| 11 | Mã Đơn giá Phí Giao hàng         | Mã Đơn giá Phí Giao hàng       | haitatsuryo_tanka_code     | VARCHAR       | 10   |
| 12 | Mã Tổ chức Tài chính         | Mã Ngân hàng                 | bank_code                  | VARCHAR       | 4    |
| 13 | Tên Tổ chức Tài chính             | Tên Ngân hàng                   | bank_name                  | VARCHAR       | 100  |
| 14 | Chu kỳ Thanh toán Phí Giao hàng | Chu kỳ Thanh toán Phí Giao hàng     | haitatsuryo_shiharai_cycle | INTEGER       | -    |
| 15 | Mã Chi nhánh Tài khoản         | Mã Chi nhánh                 | bank_branch_code           | VARCHAR       | 3    |
| 16 | Tên Chi nhánh Tài khoản             | Tên Chi nhánh                   | bank_branch_name           | VARCHAR       | 100  |
| 17 | Loại Tài khoản               | Loại Tiền gửi                   | yokin_shubetsu             | INTEGER       | -    |
| 18 | Số Tài khoản               | Số Tài khoản                   | koza_no                    | VARCHAR       | 10   |
| 19 | Tên Chủ Tài khoản               | Tên Chủ Tài khoản                   | koza_meigi                 | VARCHAR       | 50   |
| 20 | Phân loại Phí Dịch vụ             | Phân loại Phí Dịch vụ                 | tesuryo_kubun              | INTEGER       | -    |
| 21 | Phí Dịch vụ                 | Số Tiền Phí Dịch vụ                 | tesuryo_amount             | NUMERIC(10,0) | -    |
| 22 | Ghi chú                   | Ghi chú                       | biko                       | TEXT          | -    |
| 23 | Cờ Cửa hàng Đóng             | Cờ Cửa hàng Đóng                 | haiten_flg                 | BOOLEAN       | -    |

## Ví dụ Yêu cầu

```
GET /api/v1/hanbaiten/import/template
```

## Ví dụ Phản hồi Thành công

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"

(Dữ liệu Nhị phân)
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

- Không có Tham số Yêu cầu। Không có Kiểm chứng Đặc biệt।

### 4.2 Kiểm tra Xác thực + Ủy quyền

- Xác minh Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Nếu Xác thực Thất bại：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- Kiểm tra Quyền hạn：Xác minh Quyền hạn `hanbaiten.import`।
  - Vai trò Đích：NICHINO_STAFF (Nhân viên Nhật báo nông nghiệp), CHUOKAI (Trung ương), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Cửa hàng Quản lý JA)
- Nếu Không có Quyền hạn：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 Tạo Mẫu

- Sử dụng Thư viện ExcelJS để Tạo Sổ làm việc Mới।
- Tên Trang tính：`Cửa hàng Bán hàng`
- Ghi 23 Cột Chuỗi Tiêu đề vào Hàng 1 theo thứ tự sau।
  - 「Mã Cửa hàng Bán hàng」「Tên Cửa hàng Bán hàng」「Tên Cửa hàng (Kana)」「Số Hóa đơn」「Mã Bưu chính」「Địa chỉ」「Số Điện thoại」「Số Fax」「Tên Trưởng」「Phân loại Ủy thác」「Mã Đơn giá Phí Giao hàng」「Mã Tổ chức Tài chính」「Tên Tổ chức Tài chính」「Chu kỳ Thanh toán Phí Giao hàng」「Mã Chi nhánh Tài khoản」「Tên Chi nhánh Tài khoản」「Loại Tài khoản」「Số Tài khoản」「Tên Chủ Tài khoản」「Phân loại Phí Dịch vụ」「Phí Dịch vụ」「Ghi chú」「Cờ Cửa hàng Đóng」
- Hàng Tiêu đề được Đặt kiểu Đậm và Màu nền।
- Tự động Điều chỉnh Chiều rộng mỗi Cột theo Nội dung Mục।

### 4.4 Tạo Phản hồi

- Đặt Tệp Excel được Tạo thành Dữ liệu Nhị phân vào Phản hồi।
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"`
- Trả về với HTTP 200।

### 4.5 Xử lý Ngoại lệ

- Nếu xảy ra Lỗi Tạo tệp, Lỗi Kết nối DB, v.v।：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-019-002

## Tổng quan

| Mục                   | Nội dung                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                  | Nhập khẩu Cửa hàng Bán hàng từ Excel                                                                                                                                                                                                                                        |
| Tổng quan                   | Nhập khẩu Dữ liệu Cửa hàng Bán hàng từ Excel hàng loạt (Đăng ký Mới / Cập nhật Toàn bộ Mục / Cập nhật Chỉ Mục Được nhập)। Xử lý trong một Giao dịch, Khôi phục tất cả khi Lỗi।                                                                                                                          |
| URI                    | /api/v1/hanbaiten/import                                                                                                                                                                                                                                      |
| Phương thức               | POST                                                                                                                                                                                                                                                          |
| Thân Yêu cầu     | JSON                                                                                                                                                                                                                                                          |
| Tham số Yêu cầu |                                                                                                                                                                                                                                                               |
| Tiêu đề                 | Content-Type: application/json  ※ Thông tin Xác thực được Gửi tự động thông qua HTTP-only Cookie                                                                                                                                                                        |
| Mã Phản hồi HTTP   | 200:Xử lý Nhập khẩu hoàn tất thành công, 400:Nội dung Nhập liệu có Lỗi, 401:Phiên đã hết hạn। Vui lòng Đăng nhập lại, 403:Bạn không có Quyền truy cập Màn hình này, 400:Dữ liệu Nhập khẩu Excel có Lỗi, 400:Dữ liệu Nhập khẩu vượt quá Giới hạn Hàng, 500:Đã xảy ra Lỗi Hệ thống |

## Tham số Yêu cầu

| #   | ID Tham số  | Loại | Lặp lại | Bắt buộc | Độ dài Tối thiểu | Độ dài Tối đa | Mô tả                                                                            |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------- |
| 1   | import_mode     | String | -        | ○   |        |        | Chế độ Nhập khẩu (NEW:Đăng ký Mới, UPDATE_ALL:Cập nhật Toàn bộ, UPDATE_PARTIAL:Cập nhật Một phần) |
| 2   | selected_columns| Array  | ○       | ○   | 1      | 23     | Mảng Cột Nhập khẩu (Tên Cột Vật lý)। hanbaiten_code luôn được Bao gồm।                   |
| 3   | rows            | Array  | ○       | ○   | 1      | 500    | Mảng Hàng Dữ liệu Nhập khẩu                                                              |
| 4   | →hanbaiten_code      | String | -   | ○   | 1      | 10     | Mã Cửa hàng Bán hàng (Bắt buộc trong Hàng, Mục Khóa)                                              |
| 5   | →hanbaiten_name      | String | -   | -    | 1      | 100    | Tên Cửa hàng Bán hàng                                                                        |
| 6   | →hanbaiten_name_kana | String | -   | -    | 1      | 100    | Tên Cửa hàng (Kana)                                                                |
| 7   | →torihikisaki_no     | String | -   | -    | 1      | 20     | Số Người phát hành Hóa đơn                                                        |
| 8   | →yubin_no            | String | -   | -    | 7      | 7      | Mã Bưu chính                                                                        |
| 9   | →address             | String | -   | -    | 1      | 200    | Địa chỉ                                                            |
| 10  | →tel                 | String | -   | -    | 1      | 15     | Số Điện thoại                                                                |
| 11  | →fax                 | String | -   | -    | 1      | 15     | Số Fax                                                                     |
| 12  | →shocho_name         | String | -   | -    | 1      | 50     | Tên Trưởng                                                                          |
| 13  | →itaku_kubun         | Number | -   | -    | -       |        | Phân loại Ủy thác (1:Chuyển khoản, 2:Ủy thác Nhật báo nông nghiệp, 9:Khác)                                        |
| 14  | →haitatsuryo_tanka_code | String | - | -  | 1      | 10     | Mã Đơn giá Phí Giao hàng (Giải quyết bằng tanka_code của m_tanka)                            |
| 15  | →bank_code           | String | -   | -    | 1      | 4      | Mã Tổ chức Tài chính                                                                      |
| 16  | →bank_name           | String | -   | -    | 1      | 100    | Tên Tổ chức Tài chính                                                                          |
| 17  | →haitatsuryo_shiharai_cycle | Number | - | -  | -       |        | Chu kỳ Thanh toán Phí Giao hàng (Số tháng)                                                  |
| 18  | →bank_branch_code    | String | -   | -    | 1      | 3      | Mã Chi nhánh Tài khoản                                                                  |
| 19  | →bank_branch_name    | String | -   | -    | 1      | 100    | Tên Chi nhánh Tài khoản                                                                      |
| 20  | →yokin_shubetsu      | Number | -   | -    | -       |        | Loại Tài khoản (1:Tài khoản Tiết kiệm, 2:Tài khoản Giao dịch)                                                      |
| 21  | →koza_no             | String | -   | -    | 1      | 10     | Số Tài khoản                                                                        |
| 22  | →koza_meigi          | String | -   | -    | 1      | 50     | Tên Chủ Tài khoản                                                                        |
| 23  | →tesuryo_kubun       | Number | -   | -    | -       |        | Phân loại Phí Dịch vụ (1:JA, 2:Cửa hàng Bán hàng)                                                    |
| 24  | →tesuryo_amount      | Number | -   | -    | -       |        | Phí Dịch vụ (≧ 0)                                                                   |
| 25  | →biko                | String | -   | -    | -       |        | Ghi chú                                                                            |
| 26  | →haiten_flg          | Boolean| -   | -    | -       |        | Cờ Cửa hàng Đóng (true:Đóng cửa, false:Hoạt động)                                           |

※ Mỗi Hàng trong Mảng rows chỉ Coi giá trị Hợp lệ cho các Mục được Bao gồm trong selected_columns।
※ Cột Chưa chọn sẽ: được Đặt Giá trị Mặc định trong Chế độ NEW, được Ghi đè bằng NULL/Chuỗi trống trong Chế độ UPDATE_ALL, được Duy trì Giá trị Hiện có trong Chế độ UPDATE_PARTIAL।

## Dữ liệu Phản hồi

| #   | ID Mục             | Loại | Lặp lại | Định dạng | Có thể Null | Mô tả                                  |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------------------- |
| 1   | data               | Object | -        |              | -        | Tóm tắt Kết quả Nhập khẩu                        |
| 2   | →import_mode       | String | -        |              | -        | Chế độ Nhập khẩu được Thực thi                    |
| 3   | →total_rows        | Number | -        |              | -        | Số Hàng Nhập khẩu Đích                          |
| 4   | →created_count     | Number | -        |              | -        | Số lượng Đăng ký Mới                          |
| 5   | →updated_count     | Number | -        |              | -        | Số lượng Cập nhật                              |
| 6   | →skipped_count     | Number | -        |              | -        | Số lượng Bị bỏ qua                          |
| 7   | →imported_at       | String | -        | ISO8601      | -        | Ngày Giờ Hoàn tất Nhập khẩu                          |
| 8   | message            | String | -        |              | -        | Đã nhập thành công।                |

## Ví dụ Yêu cầu

```json
POST /api/v1/hanbaiten/import
Content-Type: application/json

{
  "import_mode": "NEW",
  "selected_columns": [
    "hanbaiten_code",
    "hanbaiten_name",
    "hanbaiten_name_kana",
    "yubin_no",
    "address",
    "tel",
    "itaku_kubun",
    "haitatsuryo_tanka_code",
    "haiten_flg"
  ],
  "rows": [
    {
      "hanbaiten_code": "H001",
      "hanbaiten_name": "Cửa hàng Bán hàng A",
      "hanbaiten_name_kana": "ハンバイテンA",
      "yubin_no": "1000001",
      "address": "1-1-1 Chiyoda-ku, Tokyo",
      "tel": "03-1234-5678",
      "itaku_kubun": 1,
      "haitatsuryo_tanka_code": "T001",
      "haiten_flg": false
    },
    {
      "hanbaiten_code": "H002",
      "hanbaiten_name": "Cửa hàng Bán hàng B",
      "hanbaiten_name_kana": "ハンバイテンB",
      "yubin_no": "1000002",
      "address": "2-2-2 Chiyoda-ku, Tokyo",
      "tel": "03-2345-6789",
      "itaku_kubun": 2,
      "haitatsuryo_tanka_code": "T002",
      "haiten_flg": false
    }
  ]
}
```

## Ví dụ Phản hồi Thành công

```json
{
  "data": {
    "import_mode": "NEW",
    "total_rows": 2,
    "created_count": 2,
    "updated_count": 0,
    "skipped_count": 0,
    "imported_at": "2026-04-22T10:00:00Z"
  },
  "message": "Đã nhập thành công।"
}
```

## Ví dụ Phản hồi Thất bại

### 400 Bad Request (Lỗi Kiểm chứng)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị Nhập liệu không hợp lệ। Vui lòng kiểm tra Trường errors",
  "errors": [
    { "field": "import_mode", "message": "Chế độ Nhập khẩu là Bắt buộc" },
    { "field": "selected_columns", "message": "Vui lòng chọn ít nhất 1 Cột Nhập khẩu" }
  ]
}
```

### 400 Bad Request (Lỗi Kiểm chứng Nhập khẩu — Lỗi theo Hàng)

```json
{
  "error_code": "IMPORT_VALIDATION_ERROR",
  "message": "Dữ liệu Nhập khẩu Excel có Lỗi। Vui lòng kiểm tra Trường errors",
  "errors": [
    { "row": 2, "field": "hanbaiten_code", "message": "Mã Cửa hàng Bán hàng là Bắt buộc" },
    { "row": 3, "field": "hanbaiten_code", "message": "Mã Cửa hàng Bán hàng giống nhau đã được Đăng ký" },
    { "row": 5, "field": "haitatsuryo_tanka_code", "message": "Mã Đơn giá Phí Giao hàng được chỉ định không được Tìm thấy" },
    { "row": 7, "field": "itaku_kubun", "message": "Phân loại Ủy thác phải là 1, 2 hoặc 9" }
  ]
}
```

### 400 Bad Request (Vượt quá Giới hạn Hàng)

```json
{
  "error_code": "ROW_LIMIT_EXCEEDED",
  "message": "Dữ liệu Nhập khẩu vượt quá Giới hạn Hàng (500 hàng)"
}
```

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

> ※ Quy trình sau được Thực thi trong một Giao dịch Đơn nhất (Xử lý Chính + Ghi lại Nhật ký Hoạt động)।
> Nếu xảy ra Lỗi, Khôi phục tất cả।
> Nhật ký Lỗi (log_type=3) trong Xử lý Ngoại lệ được Ghi lại Riêng biệt ngoài Giao dịch।

### 4.1 Kiểm chứng Yêu cầu

- Xác minh Thân Yêu cầu:
  - import_mode：Bắt buộc, `NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL` 
  - selected_columns：Bắt buộc, Mảng, 1 Mục trở lên, Luôn Bao gồm `hanbaiten_code`
  - rows：Bắt buộc, Mảng, 1 Mục trở lên, Tối đa 500 Mục
    - Nếu Vượt quá 500 Mục：HTTP 400 (`ROW_LIMIT_EXCEEDED`)
  - Kiểm chứng mỗi Hàng rows[i]:
    - hanbaiten_code：Bắt buộc, Tối đa 10 Ký tự
    - hanbaiten_name：Nếu Được bao gồm trong selected_columns là Bắt buộc, Tối đa 100 Ký tự
    - torihikisaki_no：Tối đa 20 Ký tự
    - yubin_no：7 Ký tự (Số)
    - address：Tối đa 200 Ký tự
    - fax：Tối đa 15 Ký tự
    - shocho_name：Tối đa 50 Ký tự
    - itaku_kubun：1, 2, 9 
    - haitatsuryo_tanka_code：Tối đa 10 Ký tự
    - haitatsuryo_shiharai_cycle：Kiểm tra Loại Số, ≧ 0
    - bank_code：Tối đa 4 Ký tự
    - bank_name：Tối đa 100 Ký tự
    - bank_branch_code：Tối đa 3 Ký tự
    - bank_branch_name：Tối đa 100 Ký tự
    - yokin_shubetsu：1, 2 
    - koza_no：Tối đa 10 Ký tự
    - koza_meigi：Tối đa 50 Ký tự
    - tesuryo_kubun：1, 2 
    - tesuryo_amount：Kiểm tra Loại Số, ≧ 0
    - haiten_flg：Kiểm tra Loại Boolean
    - Nếu itaku_kubun = 1 (Chuyển khoản)：bank_code, bank_name, bank_branch_code, bank_branch_name, yokin_shubetsu, koza_no là Bắt buộc
- Lỗi Kiểm chứng Cấp cao nhất：HTTP 400 (`VALIDATION_ERROR`) + Mảng errors
- Lỗi Kiểm chứng Cấp Hàng：HTTP 400 (`IMPORT_VALIDATION_ERROR`) + Mảng errors (Bao gồm Số hàng)

### 4.2 Kiểm tra Xác thực + Ủy quyền

- Xác minh Thông tin Xác thực (Phiên HTTP-only Cookie)।
- Nếu Xác thực Thất bại：HTTP 401 (`UNAUTHORIZED`)
- Kiểm tra Quyền hạn：Xác minh Quyền hạn `hanbaiten.import`।
  - Vai trò Đích：NICHINO_STAFF (Nhân viên Nhật báo nông nghiệp), CHUOKAI (Trung ương), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Cửa hàng Quản lý JA)
- Nếu Không có Quyền hạn：HTTP 403 (`FORBIDDEN`)
- DataScope：Lấy `ja_id` của Người dùng Đã đăng nhập। Tất cả Hàng được Coi là Dữ liệu của `ja_id` này।

### 4.3 Kiểm tra Sơ bộ (Trùng lặp + Tính toàn vẹn Tham chiếu)

- Lấy Phạm vi của Người dùng Đã đăng nhập (ja_id)।
- Xác nhận Không có Trùng lặp `hanbaiten_code` trong rows।
- Thực thi Kiểm tra Tính toàn vẹn hàng loạt với DB।

#### 4.3.1 Lấy Mã Cửa hàng Bán hàng Hiện tại

```sql
SELECT hanbaiten_id, hanbaiten_code
FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = ANY(:hanbaiten_codes)
  AND deleted_at IS NULL
```

- Chế độ `NEW`：hanbaiten_code được Tìm thấy là Lỗi "Trùng lặp" → HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors (row, field='hanbaiten_code')
- Chế độ `UPDATE_ALL` / `UPDATE_PARTIAL`：hanbaiten_code Không được Tìm thấy là Lỗi "Không tồn tại" → HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors (row, field='hanbaiten_code')

#### 4.3.2 Giải quyết Mã Đơn giá Phí Giao hàng

```sql
SELECT tanka_id, tanka_code
FROM m_tanka
WHERE ja_id = :ja_id
  AND tanka_code = ANY(:tanka_codes)
  AND tanka_type = 2  -- Phí Giao hàng
  AND deleted_at IS NULL
```

- tanka_code Không được Tìm thấy：`IMPORT_VALIDATION_ERROR` + errors (row, field='haitatsuryo_tanka_code')

- Nếu Tồn tại Lỗi Kiểm tra Sơ bộ：Trả về HTTP 400 (`IMPORT_VALIDATION_ERROR`) + Mảng errors, Ngừng Xử lý tiếp theo।

### 4.4 Thực thi Nhập khẩu Dữ liệu (Giao dịch)

- Bắt đầu Giao dịch DB।
- Nếu Lỗi xảy ra trong Quy trình sau, Khôi phục tất cả Bản ghi।

#### 4.4.1 Chế độ NEW (Đăng ký Mới)

- Thực thi INSERT cho mỗi Hàng।

```sql
INSERT INTO m_hanbaiten (
  ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana, torihikisaki_no,
  yubin_no, address, tel, fax, shocho_name, itaku_kubun,
  haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
  tesuryo_kubun, tesuryo_amount,
  bank_code, bank_name, bank_branch_code, bank_branch_name,
  yokin_shubetsu, koza_no, koza_meigi, haiten_flg, biko,
  created_at, created_by, updated_at, updated_by
)
VALUES (
  :ja_id, :hanbaiten_code, :hanbaiten_name, :hanbaiten_name_kana, :torihikisaki_no,
  :yubin_no, :address, :tel, :fax, :shocho_name, :itaku_kubun,
  :haitatsuryo_tanka_id, :haitatsuryo_shiharai_cycle,
  :tesuryo_kubun, :tesuryo_amount,
  :bank_code, :bank_name, :bank_branch_code, :bank_branch_name,
  :yokin_shubetsu, :koza_no, :koza_meigi, :haiten_flg, :biko,
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

- Cột Không được Bao gồm trong selected_columns được Đặt Giá trị Mặc định (Chuỗi trống / NULL / false)।

#### 4.4.2 Chế độ UPDATE_ALL (Cập nhật Toàn bộ Mục)

- Sau khi Lấy Bản ghi Hiện tại cho mỗi Hàng, Cập nhật bao gồm cả các Mục Ngoài selected_columns (Cột Chưa chọn được Ghi đè bằng NULL / Chuỗi trống)।

```sql
-- Lấy Dữ liệu trước Cập nhật (dùng cho Nhật ký Hoạt động)
SELECT * FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = :hanbaiten_code
  AND deleted_at IS NULL

-- Cập nhật
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
WHERE ja_id = :ja_id
  AND hanbaiten_code = :hanbaiten_code
  AND deleted_at IS NULL
RETURNING *
```

#### 4.4.3 Chế độ UPDATE_PARTIAL (Cập nhật Chỉ Mục Được nhập)

- Chỉ Cập nhật Cột được Bao gồm trong selected_columns। Cột Chưa chọn Duy trì Giá trị Hiện có।
- Xây dựng Động Mệnh đề SET (Mã giả)।

```sql
-- Lấy Dữ liệu trước Cập nhật (dùng cho Nhật ký Hoạt động)
SELECT * FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = :hanbaiten_code
  AND deleted_at IS NULL

-- Cập nhật Động (Chỉ SET các Mục được Bao gồm trong selected_columns)
UPDATE m_hanbaiten
SET {dynamic_set_clause},
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE ja_id = :ja_id
  AND hanbaiten_code = :hanbaiten_code
  AND deleted_at IS NULL
RETURNING *
```

- Nếu xảy ra Vi phạm Ràng buộc DB trong quá trình Thực thi：Khôi phục Giao dịch Ngay lập tức, Trả về HTTP 400 (`IMPORT_VALIDATION_ERROR`) hoặc HTTP 500 (`INTERNAL_SERVER_ERROR`)।

### 4.5 Ghi lại Nhật ký Hoạt động

- Sau khi Hoàn tất Xử lý tất cả Hàng, Ghi lại Nhật ký Hoạt động Phần lớn (Không phải Theo Hàng mà là Theo Lô Nhập khẩu)।

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        'Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng (ACSMS-SCR-019)', :operation_label, 1,
        NULL, 'm_hanbaiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `:operation_label`：`IMPORT_NEW` / `IMPORT_UPDATE_ALL` / `IMPORT_UPDATE_PARTIAL` (Tương ứng với import_mode)
- `before_value`：
  - Chế độ `NEW`：Chuỗi trống
  - Chế độ `UPDATE_ALL` / `UPDATE_PARTIAL`：JSON Tóm tắt Dữ liệu Cập nhật `{ "rows": [{...}, ...] }` (Chứa Trạng thái trước Cập nhật của mỗi Hàng)
- `after_value`：JSON Tóm tắt Kết quả Nhập khẩu `{ "import_mode", "total_rows", "created_count", "updated_count", "created_ids": [...], "updated_ids": [...] }`
- Không Bao gồm Thông tin Nhạy cảm như Mật khẩu।

**Ví dụ after_value:**

```json
{
  "import_mode": "NEW",
  "total_rows": 2,
  "created_count": 2,
  "updated_count": 0,
  "created_ids": [101, 102],
  "updated_ids": []
}
```

### 4.6 Tạo Phản hồi

- Cam kết Giao dịch।
- Trả về Tóm tắt Kết quả Nhập khẩu như Đối tượng data। HTTP 200।
- message: `Đã nhập thành công।` (ACSMS-MSG-007-004)

### 4.7 Xử lý Ngoại lệ

- Nếu xảy ra Lỗi trong quá trình Nhập khẩu, Khôi phục Giao dịch tất cả Bản ghi।
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
        'Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng (ACSMS-SCR-019)', :operation_label, 2,
        NULL, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
