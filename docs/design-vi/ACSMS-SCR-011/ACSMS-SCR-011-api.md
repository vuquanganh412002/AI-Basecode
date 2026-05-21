---
customer_name: Nihon Nogyo Shimbun
system_name: Hệ thống quản lý người đọc bản Cloud
document_name: Tài liệu thiết kế API
screen_id: ACSMS-SCR-011
screen_name: Màn hình đăng ký thông tin người đọc
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-07
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/05/07
updated_by: Tran Duc Tuyen
---

## Lịch sử thay đổi

| No  | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm tra | Người phê duyệt |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/07 | 1.0  | Tran Duc Tuyen | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là hệ thống quản lý người đọc dạng Cloud dành cho JA,
cung cấp các chức năng quản lý thông tin người đọc, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động.

Các chức năng chính bao gồm: đăng ký/cập nhật/tìm kiếm thông tin người đọc,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên/tải xuống file, quản lý thông báo hệ thống.

Ngoài ra, còn hỗ trợ các chức năng bảo mật/kiểm toán như quản lý đăng nhập của người dùng,
ghi lịch sử đăng nhập, ghi log thao tác của người dùng.

## Mục đích tài liệu

Là tài liệu mô tả chi tiết các API được tạo mới trên hệ thống tại "Màn hình đăng ký thông tin người đọc (ACSMS-SCR-011)".

## Tài liệu liên quan

| No  | Mã tài liệu          | Tên tài liệu                          |
| --- | -------------------- | ------------------------------------- |
| 1   | ACSMS-SCR-002        | Tài liệu thiết kế API Màn hình tìm kiếm chi tiết người đọc |
| 2   | ACSMS-API-COMMON-001 | Get Prefecture List (lấy danh sách tỉnh thành) |

※ Dropdown tỉnh thành của màn hình này sử dụng API dùng chung.
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — Định nghĩa gốc: ACSMS-SCR-009

## Danh sách lỗi

| #   | Loại lỗi | Mã lỗi                | Thông báo lỗi                                                          | Ghi chú  |
| --- | -------- | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | Chung    | BAD_REQUEST           | Tham số request không hợp lệ.                                          | HTTP 400 |
| 2   | Chung    | UNAUTHORIZED          | Phiên đã hết hạn. Vui lòng đăng nhập lại.                              | HTTP 401 |
| 3   | Chung    | FORBIDDEN             | Không có quyền truy cập màn hình này.                                  | HTTP 403 |
| 4   | Chung    | DATA_SCOPE_VIOLATION  | Không có quyền truy cập dữ liệu này.                                   | HTTP 403 |
| 5   | Chung    | VALIDATION_ERROR      | Giá trị nhập không hợp lệ. Vui lòng kiểm tra chi tiết tại trường errors. | HTTP 400 |
| 6   | Chung    | TOO_MANY_REQUESTS     | Số lần request đã vượt quá giới hạn. Vui lòng thử lại sau một thời gian. | HTTP 429 |
| 7   | Chung    | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian.            | HTTP 500 |
| 8   | Riêng    | NOT_FOUND             | Không tìm thấy người đọc được chỉ định.                                | HTTP 404 |
| 9   | Riêng    | DUPLICATE_EMAIL       | Địa chỉ email này đã được đăng ký.                                     | HTTP 400 |
| 10  | Riêng    | INVALID_STATUS        | Không phải là người đọc đang chờ phê duyệt.                            | HTTP 400 |

---

# API ACSMS-API-011-001

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Get Dokusya Detail                                                                                                                                                                                               |
| Tổng quan            | Lấy chi tiết người đọc được chỉ định (dùng cho chế độ chỉnh sửa)                                                                                                                                                |
| URI                  | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                     |
| Method               | GET                                                                                                                                                                                                              |
| Request body         | Không có                                                                                                                                                                                                          |
| Request parameter    | dokusya_id (path parameter)                                                                                                                                                                                      |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                       |
| HTTP response code   | 200: Lấy chi tiết người đọc thành công, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy người đọc được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| #   | ID tham số     | Kiểu   | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | dokusya_id đối tượng lấy dữ liệu (path parameter) |

## Dữ liệu response

| #   | ID mục                       | Kiểu    | Lặp lại  | Định dạng    | Nullable | Mô tả                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | Dữ liệu người đọc                                                                                                                                                  |
| 2   | →dokusya_id                  | Number  | -        |              | -        | ID người đọc                                                                                                                                                      |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | ID chi nhánh quản lý                                                                                                                                                    |
| 5   | →shiten_id                   | Number  | -        |              | 〇       | ID chi nhánh                                                                                                                                                        |
| 6   | →kumiaiin_code               | String  | -        |              |          | Mã thành viên hợp tác xã (cho phép chuỗi rỗng)                                                                                                                                    |
| 7   | →dokusya_shubetsu            | Number  | -        |              | -        | Loại đăng ký ※Tham khảo m_code.code_category='DOKUSYA_SHUBETSU' (1: bản giấy, 2: bản điện tử, 3: đọc song song)                                                                            |
| 8   | →tetsuzuki_shurui            | Number  | -        |              | -        | Loại thủ tục ※Tham khảo m_code.code_category='TETSUZUKI_SHURUI' (0: hủy bỏ, 1: đăng ký mới)                                                                                     |
| 9   | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | Loại người đọc bản điện tử ※Tham khảo m_code.code_category='DENSHI_DOKUSYA_SHUBETSU' (0: miễn phí, 1: trả phí)                                                                        |
| 10  | →shimei_sei                  | String  | -        |              | -        | Họ                                                                                                                                                    |
| 11  | →shimei_mei                  | String  | -        |              | -        | Tên                                                                                                                                                    |
| 12  | →shimei_kana_sei             | String  | -        |              | -        | Họ (kana)                                                                                                                                                |
| 13  | →shimei_kana_mei             | String  | -        |              | -        | Tên (kana)                                                                                                                                                |
| 14  | →dokusya_busu                | Number  | -        |              | -        | Số lượng đăng ký                                                                                                                                                      |
| 15  | →yubin_no                    | String  | -        |              | -        | Mã bưu điện                                                                                                                                                      |
| 16  | →todofuken_code              | String  | -        |              | -        | Mã tỉnh thành                                                                                                                                                |
| 17  | →shikuchoson                 | String  | -        |              | -        | Quận/huyện/thị trấn                                                                                                                                                      |
| 18  | →chome_banchi                | String  | -        |              | -        | Số nhà/địa chỉ                                                                                                                                                      |
| 19  | →tatemono_mei                | String  | -        |              |          | Tên chung cư... (cho phép chuỗi rỗng)                                                                                                                                  |
| 20  | →renrakusaki_1               | String  | -        |              |          | Liên hệ 1 (cho phép chuỗi rỗng)                                                                                                                                        |
| 21  | →renrakusaki_2               | String  | -        |              |          | Liên hệ 2 (cho phép chuỗi rỗng)                                                                                                                                        |
| 22  | →email                       | String  | -        |              |          | Địa chỉ email (cho phép chuỗi rỗng)                                                                                                                                  |
| 23  | →mail_magazine_flg           | Number  | -        |              | -        | Bản tin email ※Tham khảo m_code.code_category='MAIL_MAGAZINE_FLG' (0: không gửi, 1: gửi)                                                                    |
| 24  | →birth_year                  | Number  | -        |              | 〇       | Năm sinh (tây lịch)                                                                                                                                                  |
| 25  | →gender                      | Number  | -        |              | 〇       | Giới tính ※Tham khảo m_code.code_category='GENDER' (1: nam, 2: nữ, 9: không trả lời)                                                                                     |
| 26  | →haitatsu_same_flg           | Boolean | -        |              | -        | Chỉ định thông tin nơi giao (true: giống người đọc)                                                                                                                           |
| 27  | →haitatsu_yubin_no           | String  | -        |              |          | Mã bưu điện nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 28  | →haitatsu_todofuken_code     | String  | -        |              |          | Mã tỉnh thành nơi giao (cho phép chuỗi rỗng)                                                                                                                            |
| 29  | →haitatsu_shikuchoson        | String  | -        |              |          | Quận/huyện/thị trấn nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 30  | →haitatsu_chome_banchi       | String  | -        |              |          | Số nhà/địa chỉ nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 31  | →haitatsu_tatemono_mei       | String  | -        |              |          | Tên tòa nhà nơi giao (cho phép chuỗi rỗng)                                                                                                                                    |
| 32  | →haitatsu_renrakusaki_1      | String  | -        |              |          | Liên hệ 1 nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 33  | →haitatsu_renrakusaki_2      | String  | -        |              |          | Liên hệ 2 nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 34  | →haitatsu_shimei_sei         | String  | -        |              |          | Họ nơi giao (Kanji) (cho phép chuỗi rỗng)                                                                                                                          |
| 35  | →haitatsu_shimei_mei         | String  | -        |              |          | Tên nơi giao (Kanji) (cho phép chuỗi rỗng)                                                                                                                          |
| 36  | →haitatsu_shimei_kana_sei    | String  | -        |              |          | Họ nơi giao (kana) (cho phép chuỗi rỗng)                                                                                                                            |
| 37  | →haitatsu_shimei_kana_mei    | String  | -        |              |          | Tên nơi giao (kana) (cho phép chuỗi rỗng)                                                                                                                            |
| 38  | →hanbaiten_id                | Number  | -        |              | -        | ID cửa hàng bán                                                                                                                                                      |
| 39  | →hanbaiten_name              | String  | -        |              | -        | Tên cửa hàng bán (lấy qua join m_hanbaiten)                                                                                                                               |
| 40  | →tanka_id                    | Number  | -        |              | -        | ID đơn giá                                                                                                                                                        |
| 41  | →tanka_name                  | String  | -        |              | -        | Tên đơn giá (lấy qua join m_tanka)                                                                                                                                     |
| 42  | →yubin_kubun                 | String  | -        |              | -        | Phân loại gửi bưu điện ※Tham khảo m_code.code_category='YUBIN_KUBUN' (0: trống, 1: gửi bưu điện)                                                                                            |
| 43  | →shiharai_hoho               | Number  | -        |              | -        | Phương thức thanh toán ※Tham khảo m_code.code_category='SHIHARAI_HOHO' (1: trừ tài khoản, 2: thu tiền mặt, 3: thu qua chuyển khoản, 4: tại cơ sở JA, 5: trừ lương, 6: thẻ tín dụng, 9: khác) |
| 44  | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | Chu kỳ thanh toán phí đăng ký (tháng)                                                                                                                                    |
| 45  | →bank_branch_code            | String  | -        |              | -        | Mã chi nhánh tài khoản trừ nợ                                                                                                                                            |
| 46  | →bank_branch_name            | String  | -        |              | -        | Tên chi nhánh tài khoản trừ nợ                                                                                                                                                |
| 47  | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | Loại tài khoản trừ nợ ※Tham khảo m_code.code_category='YOKIN_SHUBETSU' (1: thường, 2: vãng lai)                                                                               |
| 48  | →hikiotoshi_koza_no          | String  | -        |              |          | Số tài khoản trừ nợ (cho phép chuỗi rỗng)                                                                                                                                    |
| 49  | →hikiotoshi_koza_meigi       | String  | -        |              |          | Tên chủ tài khoản trừ nợ (cho phép chuỗi rỗng)                                                                                                                                    |
| 50  | →dokusyaso_bunrui            | String  | -        |              |          | Phân loại đối tượng người đọc (phân tách bằng dấu phẩy, cho phép chuỗi rỗng)                                                                                                                      |
| 51  | →nogyosya_bunrui             | String  | -        |              |          | Phân loại nông dân (phân tách bằng dấu phẩy, cho phép chuỗi rỗng)                                                                                                                        |
| 52  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | Ngày bắt đầu đăng ký lần đầu                                                                                                                                                |
| 53  | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | Ngày bắt đầu đăng ký                                                                                                                                                    |
| 54  | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | Ngày kết thúc đăng ký                                                                                                                                                    |
| 55  | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | Ngày áp dụng thay đổi thông tin người đọc                                                                                                                                            |
| 56  | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | Tháng bắt đầu thu phí (cho phép chuỗi rỗng)                                                                                                                                      |
| 57  | →biko                        | String  | -        |              |          | Ghi chú (cho phép chuỗi rỗng)                                                                                                                                            |
| 58  | →rireki_no                   | Number  | -        |              | -        | Số lịch sử (số lịch sử mới nhất)                                                                                                                                      |
| 59  | →denshi_shonin_status        | Number  | -        |              | 〇       | Trạng thái phê duyệt đăng ký bản điện tử (0: chờ phê duyệt, 1: đã phê duyệt, 2: từ chối)                                                                                                      |
| 60  | →created_at                  | String  | -        | ISO8601      | -        | Ngày giờ tạo                                                                                                                                                      |
| 61  | →updated_at                  | String  | -        | ISO8601      | -        | Ngày giờ cập nhật                                                                                                                                                      |

## Ví dụ request

```
GET /api/v1/dokusya/1
```

## Ví dụ response thành công

```json
{
  "data": {
    "dokusya_id": 1,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "hanbaiten_name": "山田販売店",
    "tanka_id": 1,
    "tanka_name": "基本購読料（月額）",
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-01-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-04-01T10:00:00+09:00"
  }
}
```

## Ví dụ response thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy người đọc được chỉ định."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

### 4.1 Validation request

- Kiểm tra path parameter:
  - dokusya_id: kiểm tra kiểu số, kiểm tra bắt buộc
- Nếu tồn tại tham số không hợp lệ:
  - Trả về HTTP 400 (`BAD_REQUEST`).

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.view`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI (Trung ương hội): chỉ tham khảo được trung ương hội của mình (không xem được người đọc của JA thuộc quyền quản lý)
  - JA_HONTEN (Trụ sở chính JA): chỉ tham khảo được JA của mình (`ja_id = user.ja_id`)
  - JA_KANRI_SHITEN (Chi nhánh quản lý JA): chỉ tham khảo được chi nhánh quản lý của mình (`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`)
- Vi phạm DataScope (truy cập bản ghi của JA khác): HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.3 Lấy dữ liệu

- Lấy scope của user đang đăng nhập.
- Thực thi SQL sau để lấy thông tin người đọc (join với tên cửa hàng bán, tên đơn giá).

```sql
SELECT d.*,
       h.hanbaiten_name,
       t.tanka_name
FROM t_dokusya d
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_tanka t ON t.tanka_id = d.tanka_id AND t.deleted_at IS NULL
WHERE d.dokusya_id = :dokusya_id
  AND d.ja_id = :ja_id
  AND d.deleted_at IS NULL
```

- Khi không tồn tại bản ghi: HTTP 404 (`NOT_FOUND`)
- Khi vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.4 Tạo response

- Trả về JSON chứa object data. HTTP 200.

### 4.5 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-011-002

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Create Dokusya                                                                                                                                                                                                                                             |
| Tổng quan            | Đăng ký người đọc mới (tạo t_dokusya + t_dokusya_rireki trong 1 transaction)                                                                                                                                                                           |
| URI                  | /api/v1/dokusya                                                                                                                                                                                                                                            |
| Method               | POST                                                                                                                                                                                                                                                       |
| Request body         | JSON                                                                                                                                                                                                                                                       |
| Request parameter    |                                                                                                                                                                                                                                                            |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                       |
| HTTP response code   | 201: Đăng ký người đọc thành công, 400: Có lỗi trong nội dung nhập, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 400: Địa chỉ email này đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| #   | ID tham số                | Kiểu    | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                                                                                                                              |
| --- | ------------------------- | ------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -        | -    |        |        | ID chi nhánh quản lý                                                                                                                                        |
| 2   | shiten_id                 | Number  | -        | -    |        |        | ID chi nhánh                                                                                                                                            |
| 3   | kumiaiin_code             | String  | -        | -    | 0      | 20     | Mã thành viên hợp tác xã                                                                                                                                      |
| 4   | dokusya_shubetsu          | Number  | -        | 〇   |        |        | Loại đăng ký ※Tham khảo m_code.code_category='DOKUSYA_SHUBETSU' (1: bản giấy, 2: bản điện tử, 3: đọc song song)                                                                               |
| 5   | tetsuzuki_shurui          | Number  | -        | 〇   |        |        | Loại thủ tục ※Tham khảo m_code.code_category='TETSUZUKI_SHURUI' (0: hủy bỏ, 1: đăng ký mới)                                                                                         |
| 6   | denshi_dokusya_shubetsu   | Number  | -        | -    |        |        | Loại người đọc bản điện tử ※Tham khảo m_code.code_category='DENSHI_DOKUSYA_SHUBETSU' (0: miễn phí, 1: trả phí)                                                                            |
| 7   | shimei_sei                | String  | -        | 〇   | 1      | 50     | Họ                                                                                                                                        |
| 8   | shimei_mei                | String  | -        | 〇   | 1      | 50     | Tên                                                                                                                                        |
| 9   | shimei_kana_sei           | String  | -        | 〇   | 1      | 100    | Họ (kana)                                                                                                                                    |
| 10  | shimei_kana_mei           | String  | -        | 〇   | 1      | 100    | Tên (kana)                                                                                                                                    |
| 11  | dokusya_busu              | Number  | -        | 〇   |        |        | Số lượng đăng ký (khi hủy bỏ là 0)                                                                                                                             |
| 12  | yubin_no                  | String  | -        | 〇   | 7      | 7      | Mã bưu điện (số nửa size 7 ký tự)                                                                                                                           |
| 13  | todofuken_code            | String  | -        | 〇   | 2      | 2      | Mã tỉnh thành                                                                                                                                    |
| 14  | shikuchoson               | String  | -        | 〇   | 1      | 100    | Quận/huyện/thị trấn                                                                                                                                          |
| 15  | chome_banchi              | String  | -        | 〇   | 1      | 100    | Số nhà/địa chỉ                                                                                                                                          |
| 16  | tatemono_mei              | String  | -        | -    | 0      | 100    | Tên chung cư...                                                                                                                                    |
| 17  | renrakusaki_1             | String  | -        | 〇   | 1      | 15     | Liên hệ 1 (số nửa size)                                                                                                                              |
| 18  | renrakusaki_2             | String  | -        | -    | 0      | 15     | Liên hệ 2 (số nửa size)                                                                                                                              |
| 19  | email                     | String  | -        | △   | 0      | 100    | Địa chỉ email (bắt buộc nếu là bản điện tử/đọc song song)                                                                                                         |
| 20  | mail_magazine_flg         | Number  | -        | -    |        |        | Bản tin email ※Tham khảo m_code.code_category='MAIL_MAGAZINE_FLG' (0: không gửi, 1: gửi)                                                        |
| 21  | birth_year                | Number  | -        | -    |        |        | Năm sinh (tây lịch)                                                                                                                                      |
| 22  | gender                    | Number  | -        | -    |        |        | Giới tính ※Tham khảo m_code.code_category='GENDER' (1: nam, 2: nữ, 9: không trả lời)                                                                         |
| 23  | haitatsu_same_flg         | Boolean | -        | 〇   |        |        | Chỉ định thông tin nơi giao (true: giống người đọc)                                                                                                               |
| 24  | haitatsu_yubin_no         | String  | -        | △   | 0      | 7      | Mã bưu điện nơi giao (bắt buộc khi haitatsu_same_flg=false)                                                                                               |
| 25  | haitatsu_todofuken_code   | String  | -        | △   | 0      | 2      | Mã tỉnh thành nơi giao (bắt buộc khi haitatsu_same_flg=false)                                                                                         |
| 26  | haitatsu_shikuchoson      | String  | -        | △   | 0      | 100    | Quận/huyện/thị trấn nơi giao (bắt buộc khi haitatsu_same_flg=false)                                                                                               |
| 27  | haitatsu_chome_banchi     | String  | -        | △   | 0      | 100    | Số nhà/địa chỉ nơi giao (bắt buộc khi haitatsu_same_flg=false)                                                                                               |
| 28  | haitatsu_tatemono_mei     | String  | -        | -    | 0      | 100    | Tên tòa nhà nơi giao                                                                                                                                      |
| 29  | haitatsu_renrakusaki_1    | String  | -        | -    | 0      | 15     | Liên hệ 1 nơi giao                                                                                                                                    |
| 30  | haitatsu_renrakusaki_2    | String  | -        | -    | 0      | 15     | Liên hệ 2 nơi giao                                                                                                                                    |
| 31  | haitatsu_shimei_sei       | String  | -        | △   | 0      | 50     | Họ nơi giao                                                                                                                                  |
| 32  | haitatsu_shimei_mei       | String  | -        | △   | 0      | 50     | Tên nơi giao                                                                                                                                  |
| 33  | haitatsu_shimei_kana_sei  | String  | -        | △   | 0      | 100    | Họ nơi giao (kana)                                                                                                                              |
| 34  | haitatsu_shimei_kana_mei  | String  | -        | △   | 0      | 100    | Tên nơi giao (kana)                                                                                                                              |
| 35  | hanbaiten_id              | Number  | -        | 〇   |        |        | ID cửa hàng bán                                                                                                                                          |
| 36  | tanka_id                  | Number  | -        | 〇   |        |        | ID đơn giá (tanka_type=1: phí đăng ký)                                                                                                                    |
| 37  | yubin_kubun               | String  | -        | -    | 1      | 1      | Phân loại gửi bưu điện ※Tham khảo m_code.code_category='YUBIN_KUBUN' (0: trống, 1: gửi bưu điện). Mặc định: '0'                                                               |
| 38  | shiharai_hoho             | Number  | -        | 〇   |        |        | Phương thức thanh toán ※Tham khảo m_code.code_category='SHIHARAI_HOHO' (1: trừ tài khoản, 2: thu tiền mặt, 3: thu qua chuyển khoản, 4: tại cơ sở JA, 5: trừ lương, 6: thẻ tín dụng, 9: khác) |
| 39  | dokusyaryo_shiharai_cycle | Number  | -        | -    |        |        | Chu kỳ thanh toán phí đăng ký (tháng)                                                                                                                        |
| 40  | bank_branch_code          | String  | -        | △   | 0      | 3      | Mã chi nhánh tài khoản trừ nợ (bắt buộc khi trừ tài khoản)                                                                                                            |
| 41  | bank_branch_name          | String  | -        | △   | 0      | 100    | Tên chi nhánh tài khoản trừ nợ                                                                                                                                    |
| 42  | hikiotoshi_yokin_shubetsu | Number  | -        | △   |        |        | Loại tài khoản trừ nợ ※Tham khảo m_code.code_category='YOKIN_SHUBETSU' (1: thường, 2: vãng lai)                                                                   |
| 43  | hikiotoshi_koza_no        | String  | -        | △   | 0      | 10     | Số tài khoản trừ nợ                                                                                                                                      |
| 44  | hikiotoshi_koza_meigi     | String  | -        | △   | 0      | 50     | Tên chủ tài khoản trừ nợ                                                                                                                                      |
| 45  | dokusyaso_bunrui          | String  | -        | -    | 0      | 50     | Phân loại đối tượng người đọc (phân tách bằng dấu phẩy)                                                                                                                      |
| 46  | nogyosya_bunrui           | String  | -        | -    | 0      | 50     | Phân loại nông dân (phân tách bằng dấu phẩy)                                                                                                                        |
| 47  | dokusya_kaishi_date       | String  | -        | 〇   |        |        | Ngày bắt đầu đăng ký (YYYY-MM-DD)                                                                                                                          |
| 48  | dokusya_chushi_date       | String  | -        | -    |        |        | Ngày kết thúc đăng ký (YYYY-MM-DD, chỉ khi hủy bỏ)                                                                                                              |
| 49  | seikyu_kaishi_month       | String  | -        | △   | 0      | 6      | Tháng bắt đầu thu phí (YYYYMM, khi là bản điện tử/đọc song song)                                                                                                           |
| 50  | biko                      | String  | -        | -    | 0      | 500    | Ghi chú                                                                                                                                              |

## Dữ liệu response

| #   | ID mục                       | Kiểu    | Lặp lại  | Định dạng    | Nullable | Mô tả                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | Dữ liệu người đọc đã đăng ký                                                                                                                                        |
| 2   | →dokusya_id                  | Number  | -        |              | -        | ID người đọc                                                                                                                                                      |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | ID chi nhánh quản lý                                                                                                                                                    |
| 5   | →shiten_id                   | Number  | -        |              | 〇       | ID chi nhánh                                                                                                                                                        |
| 6   | →kumiaiin_code               | String  | -        |              |          | Mã thành viên hợp tác xã (cho phép chuỗi rỗng)                                                                                                                                    |
| 7   | →dokusya_shubetsu            | Number  | -        |              | -        | Loại đăng ký                                                                                                                                                      |
| 8   | →tetsuzuki_shurui            | Number  | -        |              | -        | Loại thủ tục                                                                                                                                                      |
| 9   | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | Loại người đọc bản điện tử                                                                                                                                                |
| 10  | →shimei_sei                  | String  | -        |              | -        | Họ                                                                                                                                                    |
| 11  | →shimei_mei                  | String  | -        |              | -        | Tên                                                                                                                                                    |
| 12  | →shimei_kana_sei             | String  | -        |              | -        | Họ (kana)                                                                                                                                                |
| 13  | →shimei_kana_mei             | String  | -        |              | -        | Tên (kana)                                                                                                                                                |
| 14  | →dokusya_busu                | Number  | -        |              | -        | Số lượng đăng ký                                                                                                                                                      |
| 15  | →yubin_no                    | String  | -        |              | -        | Mã bưu điện                                                                                                                                                      |
| 16  | →todofuken_code              | String  | -        |              | -        | Mã tỉnh thành                                                                                                                                                |
| 17  | →shikuchoson                 | String  | -        |              | -        | Quận/huyện/thị trấn                                                                                                                                                      |
| 18  | →chome_banchi                | String  | -        |              | -        | Số nhà/địa chỉ                                                                                                                                                      |
| 19  | →tatemono_mei                | String  | -        |              |          | Tên chung cư... (cho phép chuỗi rỗng)                                                                                                                                  |
| 20  | →renrakusaki_1               | String  | -        |              |          | Liên hệ 1 (cho phép chuỗi rỗng)                                                                                                                                        |
| 21  | →renrakusaki_2               | String  | -        |              |          | Liên hệ 2 (cho phép chuỗi rỗng)                                                                                                                                        |
| 22  | →email                       | String  | -        |              |          | Địa chỉ email (cho phép chuỗi rỗng)                                                                                                                                  |
| 23  | →mail_magazine_flg           | Number  | -        |              | -        | Bản tin email                                                                                                                                                |
| 24  | →birth_year                  | Number  | -        |              | 〇       | Năm sinh (tây lịch)                                                                                                                                                  |
| 25  | →gender                      | Number  | -        |              | 〇       | Giới tính                                                                                                                                                          |
| 26  | →haitatsu_same_flg           | Boolean | -        |              | -        | Chỉ định thông tin nơi giao                                                                                                                                                |
| 27  | →haitatsu_yubin_no           | String  | -        |              |          | Mã bưu điện nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 28  | →haitatsu_todofuken_code     | String  | -        |              |          | Mã tỉnh thành nơi giao (cho phép chuỗi rỗng)                                                                                                                            |
| 29  | →haitatsu_shikuchoson        | String  | -        |              |          | Quận/huyện/thị trấn nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 30  | →haitatsu_chome_banchi       | String  | -        |              |          | Số nhà/địa chỉ nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 31  | →haitatsu_tatemono_mei       | String  | -        |              |          | Tên tòa nhà nơi giao (cho phép chuỗi rỗng)                                                                                                                                    |
| 32  | →haitatsu_renrakusaki_1      | String  | -        |              |          | Liên hệ 1 nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 33  | →haitatsu_renrakusaki_2      | String  | -        |              |          | Liên hệ 2 nơi giao (cho phép chuỗi rỗng)                                                                                                                                  |
| 34  | →haitatsu_shimei_sei         | String  | -        |              |          | Họ nơi giao (Kanji) (cho phép chuỗi rỗng)                                                                                                                          |
| 35  | →haitatsu_shimei_mei         | String  | -        |              |          | Tên nơi giao (Kanji) (cho phép chuỗi rỗng)                                                                                                                          |
| 36  | →haitatsu_shimei_kana_sei    | String  | -        |              |          | Họ nơi giao (kana) (cho phép chuỗi rỗng)                                                                                                                            |
| 37  | →haitatsu_shimei_kana_mei    | String  | -        |              |          | Tên nơi giao (kana) (cho phép chuỗi rỗng)                                                                                                                            |
| 38  | →hanbaiten_id                | Number  | -        |              | -        | ID cửa hàng bán                                                                                                                                                      |
| 39  | →tanka_id                    | Number  | -        |              | -        | ID đơn giá                                                                                                                                                        |
| 40  | →yubin_kubun                 | String  | -        |              | -        | Phân loại gửi bưu điện                                                                                                                                                      |
| 41  | →shiharai_hoho               | Number  | -        |              | -        | Phương thức thanh toán                                                                                                                                                      |
| 42  | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | Chu kỳ thanh toán phí đăng ký (tháng)                                                                                                                                    |
| 43  | →bank_branch_code            | String  | -        |              | -        | Mã chi nhánh tài khoản trừ nợ                                                                                                                                            |
| 44  | →bank_branch_name            | String  | -        |              | -        | Tên chi nhánh tài khoản trừ nợ                                                                                                                                                |
| 45  | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | Loại tài khoản trừ nợ                                                                                                                                              |
| 46  | →hikiotoshi_koza_no          | String  | -        |              |          | Số tài khoản trừ nợ (cho phép chuỗi rỗng)                                                                                                                                    |
| 47  | →hikiotoshi_koza_meigi       | String  | -        |              |          | Tên chủ tài khoản trừ nợ (cho phép chuỗi rỗng)                                                                                                                                    |
| 48  | →dokusyaso_bunrui            | String  | -        |              |          | Phân loại đối tượng người đọc (cho phép chuỗi rỗng)                                                                                                                                    |
| 49  | →nogyosya_bunrui             | String  | -        |              |          | Phân loại nông dân (cho phép chuỗi rỗng)                                                                                                                                      |
| 50  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | Ngày bắt đầu đăng ký lần đầu                                                                                                                                                |
| 51  | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | Ngày bắt đầu đăng ký                                                                                                                                                    |
| 52  | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | Ngày kết thúc đăng ký                                                                                                                                                    |
| 53  | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | Ngày áp dụng thay đổi thông tin người đọc                                                                                                                                            |
| 54  | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | Tháng bắt đầu thu phí (cho phép chuỗi rỗng)                                                                                                                                      |
| 55  | →biko                        | String  | -        |              |          | Ghi chú (cho phép chuỗi rỗng)                                                                                                                                            |
| 56  | →rireki_no                   | Number  | -        |              | -        | Số lịch sử                                                                                                                                                        |
| 57  | →denshi_shonin_status        | Number  | -        |              | 〇       | Trạng thái phê duyệt đăng ký bản điện tử                                                                                                                                        |
| 58  | →created_at                  | String  | -        | ISO8601      | -        | Ngày giờ tạo                                                                                                                                                      |
| 59  | →updated_at                  | String  | -        | ISO8601      | -        | Ngày giờ cập nhật                                                                                                                                                      |

## Ví dụ request

```json
POST /api/v1/dokusya
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 1,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-1",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_branch_code": "001",
  "bank_branch_name": "本店",
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "農業者",
  "nogyosya_bunrui": "水稲,野菜",
  "dokusya_kaishi_date": "2026-04-01",
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## Ví dụ response thành công

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-05-07T10:00:00+09:00",
    "updated_at": "2026-05-07T10:00:00+09:00"
  }
}
```

## Ví dụ response thất bại

### 400 Bad Request (lỗi validation)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ. Vui lòng kiểm tra chi tiết tại trường errors.",
  "errors": [
    { "field": "shimei_sei", "message": "Là mục bắt buộc." },
    { "field": "yubin_no", "message": "Vui lòng nhập mã bưu điện 7 ký tự." }
  ]
}
```

### 400 Bad Request (trùng địa chỉ email)

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "Địa chỉ email này đã được đăng ký."
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

> ※ 4.4 Đăng ký dữ liệu và 4.5 Ghi log thao tác được thực thi trong cùng một transaction.
> Nếu một trong hai thất bại, toàn bộ phải được rollback.
> Log lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng ngoài transaction.

### 4.1 Validation request

- Kiểm tra request body:
  - shimei_sei / shimei_mei: bắt buộc, tối đa 50 ký tự
  - shimei_kana_sei / shimei_kana_mei: bắt buộc, tối đa 100 ký tự, định dạng hiragana/katakana
  - dokusya_busu: bắt buộc, số nửa size. Khi hủy bỏ là 0
  - yubin_no: bắt buộc, số nửa size 7 ký tự
  - todofuken_code / shikuchoson / chome_banchi: bắt buộc
  - renrakusaki_1: bắt buộc, số nửa size
  - email: bắt buộc khi là bản điện tử/đọc song song, kiểm tra định dạng
  - Khi haitatsu_same_flg=false: haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_shimei_*, haitatsu_shimei_kana_* là bắt buộc
  - hanbaiten_id / tanka_id: bắt buộc
  - shiharai_hoho: bắt buộc. Khi là 1 (trừ tài khoản): bank_branch_code, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi là bắt buộc
  - dokusya_kaishi_date: bắt buộc, YYYY-MM-DD
  - seikyu_kaishi_month: khi là bản điện tử/đọc song song, định dạng YYYYMM
  - biko: trong vòng 500 ký tự
- Khi lỗi validation: HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.create`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope: `ja_id = user.ja_id` (tự động thiết lập phía server. Không tin tưởng ja_id trong request body)
- Vi phạm DataScope (truy cập bản ghi của JA khác): HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Kiểm tra trùng lặp (địa chỉ email)

- Khi có nhập địa chỉ email, kiểm tra trùng lặp với điều kiện sau.

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Khi có trùng lặp: HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 Đăng ký dữ liệu

- INSERT bản ghi vào t_dokusya.
- INSERT bản ghi lịch sử vào t_dokusya_rireki (rireki_no=1, saishin_data_flg=true).
- Quy tắc thiết lập cờ:
  - saishin_data_flg = true
  - shinki_flg = (tetsuzuki_shurui=1) ? true : false
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? true : false
  - zougen_hokoku_flg = true (đăng ký mới là đối tượng tăng giảm)
- Khi hủy bỏ, bắt buộc dokusya_busu=0.

```sql
INSERT INTO t_dokusya (
  ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, rireki_no,
  denshi_shonin_status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  NULL, :seikyu_kaishi_month, :biko, 1,
  NULL,
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, henko_riyu,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status, hanbaiten_tekiyo_date,
  created_at, created_by
) VALUES (
  :dokusya_id, 1, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  NULL, :seikyu_kaishi_month, :biko, '',
  TRUE, TRUE, :shinki_flg, :kaiyaku_flg,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NOW(), :user_account_id
)
```

### 4.5 Ghi log thao tác

- Thực thi SQL sau để ghi log thao tác.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 1,
        :dokusya_id, 't_dokusya',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`: do là INSERT nên thiết lập chuỗi rỗng.
- `after_value`: lưu dữ liệu đã đăng ký dưới dạng JSON. Không bao gồm thông tin nhạy cảm như mật khẩu...

### 4.6 Tạo response

- Trả về dữ liệu đã đăng ký dưới dạng object data. HTTP 201.

### 4.7 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi log lỗi (`log_type = 3`, ghi ngoài transaction).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 2,
        NULL, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-003

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Update Dokusya                                                                                                                                                                                                                                                                    |
| Tổng quan            | Cập nhật người đọc được chỉ định (phương thức thêm mới lịch sử: vô hiệu hóa cờ mới nhất của lịch sử cũ + thêm bản ghi lịch sử mới)                                                                                                                                                |
| URI                  | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                                                                                      |
| Method               | PUT                                                                                                                                                                                                                                                                               |
| Request body         | JSON                                                                                                                                                                                                                                                                              |
| Request parameter    | dokusya_id (path parameter)                                                                                                                                                                                                                                                      |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                                              |
| HTTP response code   | 200: Cập nhật người đọc thành công, 400: Có lỗi trong nội dung nhập, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy người đọc được chỉ định, 400: Địa chỉ email này đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| #   | ID tham số     | Kiểu   | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | dokusya_id đối tượng cập nhật (path parameter) |

※ Request body có cấu trúc giống ACSMS-API-011-002. dokusya_id không thể thay đổi (lấy từ URL).

## Dữ liệu response

Cấu trúc giống dữ liệu response của ACSMS-API-011-002.

## Ví dụ request

```json
PUT /api/v1/dokusya/100
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 2,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-2",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_branch_code": "001",
  "bank_branch_name": "本店",
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "農業者",
  "nogyosya_bunrui": "水稲,野菜",
  "dokusya_kaishi_date": "2026-04-01",
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## Ví dụ response thành công

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 2,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-2",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "農業者",
    "nogyosya_bunrui": "水稲,野菜",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 2,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-05-07T14:30:00+09:00"
  }
}
```

## Ví dụ response thất bại

### 400 Bad Request (lỗi validation)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Giá trị nhập không hợp lệ. Vui lòng kiểm tra chi tiết tại trường errors.",
  "errors": [{ "field": "shimei_sei", "message": "Là mục bắt buộc." }]
}
```

### 400 Bad Request (trùng địa chỉ email)

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "Địa chỉ email này đã được đăng ký."
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy người đọc được chỉ định."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

> ※ 4.4 Cập nhật dữ liệu và 4.5 Ghi log thao tác được thực thi trong cùng một transaction.
> Nếu một trong hai thất bại, toàn bộ phải được rollback.
> Log lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng ngoài transaction.

### 4.1 Validation request

- Path parameter: dokusya_id kiểm tra kiểu số, bắt buộc
- Request body: tương tự ACSMS-API-011-002
- Khi lỗi validation: HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.update`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI (Trung ương hội): chỉ cập nhật được trung ương hội của mình
  - JA_HONTEN (Trụ sở chính JA): chỉ cập nhật được JA của mình (`ja_id = user.ja_id`)
  - JA_KANRI_SHITEN (Chi nhánh quản lý JA): chỉ cập nhật được chi nhánh quản lý của mình (`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`)
- Khi vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)
- ※ Người thanh toán bằng thẻ tín dụng bản điện tử/người đọc song song không thể chỉnh sửa (quy tắc nghiệp vụ).

### 4.3 Kiểm tra sự tồn tại của bản ghi đối tượng + kiểm tra trùng email

- Lấy bản ghi đối tượng (lấy dữ liệu trước khi cập nhật).

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Khi bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Khi địa chỉ email đã thay đổi, kiểm tra trùng lặp.

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND dokusya_id <> :dokusya_id
  AND deleted_at IS NULL
```

- Khi có trùng lặp: HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 Cập nhật dữ liệu (phương thức thêm mới lịch sử)

Xử lý 3 bước dựa trên định nghĩa chức năng 15.3:

#### Bước 1: Vô hiệu hóa cờ mới nhất của bản ghi cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2: Đánh số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3: Thêm bản ghi lịch sử mới + cập nhật t_dokusya chính

- Quy tắc thiết lập cờ (định nghĩa chức năng 14.2):
  - saishin_data_flg = TRUE
  - shinki_flg = (tetsuzuki_shurui=1) ? TRUE : FALSE (khi đăng ký lại cũng là TRUE)
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? TRUE : FALSE
  - zougen_hokoku_flg = (khi thay đổi số lượng đăng ký/cửa hàng bán/địa chỉ) ? TRUE : FALSE
- Cột zenkai_*: lưu giá trị tương ứng trước khi cập nhật (dùng để so sánh tăng giảm).

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, henko_riyu,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status, hanbaiten_tekiyo_date,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :shoki_dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  :joho_henko_tekiyo_date, :seikyu_kaishi_month, :biko, :henko_riyu,
  TRUE, :zougen_hokoku_flg, :shinki_flg, :kaiyaku_flg,
  :zenkai_hanbaiten_id, :zenkai_dokusya_busu, :zenkai_yubin_no,
  :zenkai_todofuken_code, :zenkai_shikuchoson, :zenkai_chome_banchi,
  :zenkai_tatemono_mei, :denshi_shonin_status, NULL,
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET kanri_shiten_id = :kanri_shiten_id,
    shiten_id = :shiten_id,
    kumiaiin_code = :kumiaiin_code,
    dokusya_shubetsu = :dokusya_shubetsu,
    tetsuzuki_shurui = :tetsuzuki_shurui,
    denshi_dokusya_shubetsu = :denshi_dokusya_shubetsu,
    shimei_sei = :shimei_sei,
    shimei_mei = :shimei_mei,
    shimei_kana_sei = :shimei_kana_sei,
    shimei_kana_mei = :shimei_kana_mei,
    dokusya_busu = :dokusya_busu,
    yubin_no = :yubin_no,
    todofuken_code = :todofuken_code,
    shikuchoson = :shikuchoson,
    chome_banchi = :chome_banchi,
    tatemono_mei = :tatemono_mei,
    renrakusaki_1 = :renrakusaki_1,
    renrakusaki_2 = :renrakusaki_2,
    email = :email,
    mail_magazine_flg = :mail_magazine_flg,
    birth_year = :birth_year,
    gender = :gender,
    haitatsu_same_flg = :haitatsu_same_flg,
    haitatsu_yubin_no = :haitatsu_yubin_no,
    haitatsu_todofuken_code = :haitatsu_todofuken_code,
    haitatsu_shikuchoson = :haitatsu_shikuchoson,
    haitatsu_chome_banchi = :haitatsu_chome_banchi,
    haitatsu_tatemono_mei = :haitatsu_tatemono_mei,
    haitatsu_renrakusaki_1 = :haitatsu_renrakusaki_1,
    haitatsu_renrakusaki_2 = :haitatsu_renrakusaki_2,
    haitatsu_shimei_sei = :haitatsu_shimei_sei,
    haitatsu_shimei_mei = :haitatsu_shimei_mei,
    haitatsu_shimei_kana_sei = :haitatsu_shimei_kana_sei,
    haitatsu_shimei_kana_mei = :haitatsu_shimei_kana_mei,
    hanbaiten_id = :hanbaiten_id,
    tanka_id = :tanka_id,
    yubin_kubun = :yubin_kubun,
    shiharai_hoho = :shiharai_hoho,
    dokusyaryo_shiharai_cycle = :dokusyaryo_shiharai_cycle,
    bank_branch_code = :bank_branch_code,
    bank_branch_name = :bank_branch_name,
    hikiotoshi_yokin_shubetsu = :hikiotoshi_yokin_shubetsu,
    hikiotoshi_koza_no = :hikiotoshi_koza_no,
    hikiotoshi_koza_meigi = :hikiotoshi_koza_meigi,
    dokusyaso_bunrui = :dokusyaso_bunrui,
    nogyosya_bunrui = :nogyosya_bunrui,
    dokusya_kaishi_date = :dokusya_kaishi_date,
    dokusya_chushi_date = :dokusya_chushi_date,
    joho_henko_tekiyo_date = :joho_henko_tekiyo_date,
    seikyu_kaishi_month = :seikyu_kaishi_month,
    biko = :biko,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi log thao tác

- Lấy dữ liệu trước khi cập nhật (kết quả SELECT của 4.3) và lưu vào `before_value`.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`: lưu dữ liệu trước khi cập nhật dưới dạng JSON.
- `after_value`: lưu dữ liệu sau khi cập nhật dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu đã cập nhật dưới dạng object data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi log lỗi (`log_type = 3`, ghi ngoài transaction).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-004

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Approve Denshi Dokusya                                                                                                                                                                                                                                            |
| Tổng quan            | Phê duyệt người đọc đăng ký bản điện tử (denshi_shonin_status 0→1). Tạo bản ghi lịch sử mới.                                                                                                                                |
| URI                  | /api/v1/dokusya/{dokusya_id}/approve                                                                                                                                                                                                                              |
| Method               | PUT                                                                                                                                                                                                                                                               |
| Request body         | Không có                                                                                                                                                                                                                                                              |
| Request parameter    | dokusya_id (path parameter)                                                                                                                                                                                                                                      |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                                              |
| HTTP response code   | 200: Phê duyệt thành công, 400: Không phải là người đọc đang chờ phê duyệt, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy người đọc được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| #   | ID tham số     | Kiểu   | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | dokusya_id đối tượng phê duyệt (path parameter) |

## Dữ liệu response

Cấu trúc giống dữ liệu response của ACSMS-API-011-002 (trả về với denshi_shonin_status=1).

## Ví dụ request

```
PUT /api/v1/dokusya/100/approve
```

## Ví dụ response thành công

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 1,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "Đã phê duyệt."
}
```

## Ví dụ response thất bại

### 400 Bad Request (trạng thái không hợp lệ)

```json
{
  "error_code": "INVALID_STATUS",
  "message": "Không phải là người đọc đang chờ phê duyệt."
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy người đọc được chỉ định."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

> ※ 4.4 Cập nhật trạng thái và 4.5 Ghi log thao tác được thực thi trong cùng một transaction.
> Nếu một trong hai thất bại, toàn bộ phải được rollback.
> Log lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng ngoài transaction.

### 4.1 Validation request

- Path parameter: dokusya_id kiểm tra kiểu số, bắt buộc
- Khi tồn tại tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.update`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI (Trung ương hội): chỉ phê duyệt được trung ương hội của mình
  - JA_HONTEN (Trụ sở chính JA): chỉ phê duyệt được JA của mình (`ja_id = user.ja_id`)
  - JA_KANRI_SHITEN (Chi nhánh quản lý JA): chỉ phê duyệt được chi nhánh quản lý của mình
- Khi vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.3 Kiểm tra sự tồn tại của bản ghi đối tượng + kiểm tra trạng thái

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Khi bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Khi denshi_shonin_status khác 0: HTTP 400 (`INVALID_STATUS`)

### 4.4 Cập nhật trạng thái (phương thức thêm mới lịch sử)

#### Bước 1: Vô hiệu hóa cờ mới nhất của lịch sử cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2: Đánh số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3: INSERT bản ghi lịch sử mới + UPDATE t_dokusya

- Bản ghi lịch sử sao chép thông tin người đọc hiện tại, thiết lập denshi_shonin_status=1. saishin_data_flg=TRUE.

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- Sao chép toàn bộ dữ liệu hiện tại lấy ở 4.3
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  henko_riyu,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  1,
  TRUE, FALSE, FALSE, FALSE,
  '電子版承認',
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 1,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi log thao tác

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`: lưu dữ liệu trước khi phê duyệt (denshi_shonin_status=0) dưới dạng JSON.
- `after_value`: lưu dữ liệu sau khi phê duyệt (denshi_shonin_status=1) dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu sau khi phê duyệt dưới dạng object data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi log lỗi (`log_type = 3`, ghi ngoài transaction).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-005

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Reject Denshi Dokusya                                                                                                                                                                                                                                             |
| Tổng quan            | Từ chối người đọc đăng ký bản điện tử (denshi_shonin_status 0→2). Tạo bản ghi lịch sử mới.                                                                                                                                |
| URI                  | /api/v1/dokusya/{dokusya_id}/reject                                                                                                                                                                                                                               |
| Method               | PUT                                                                                                                                                                                                                                                               |
| Request body         | Không có                                                                                                                                                                                                                                                              |
| Request parameter    | dokusya_id (path parameter)                                                                                                                                                                                                                                      |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                                                              |
| HTTP response code   | 200: Từ chối thành công, 400: Không phải là người đọc đang chờ phê duyệt, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy người đọc được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| #   | ID tham số     | Kiểu   | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | dokusya_id đối tượng từ chối (path parameter) |

## Dữ liệu response

Cấu trúc giống dữ liệu response của ACSMS-API-011-002 (trả về với denshi_shonin_status=2).

## Ví dụ request

```
PUT /api/v1/dokusya/100/reject
```

## Ví dụ response thành công

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 2,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "Đã từ chối."
}
```

## Ví dụ response thất bại

### 400 Bad Request (trạng thái không hợp lệ)

```json
{
  "error_code": "INVALID_STATUS",
  "message": "Không phải là người đọc đang chờ phê duyệt."
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy người đọc được chỉ định."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

> ※ 4.4 Cập nhật trạng thái và 4.5 Ghi log thao tác được thực thi trong cùng một transaction.
> Nếu một trong hai thất bại, toàn bộ phải được rollback.
> Log lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng ngoài transaction.

### 4.1 Validation request

- Path parameter: dokusya_id kiểm tra kiểu số, bắt buộc
- Khi tồn tại tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.update`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI (Trung ương hội): chỉ từ chối được trung ương hội của mình
  - JA_HONTEN (Trụ sở chính JA): chỉ từ chối được JA của mình (`ja_id = user.ja_id`)
  - JA_KANRI_SHITEN (Chi nhánh quản lý JA): chỉ từ chối được chi nhánh quản lý của mình
- Khi vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.3 Kiểm tra sự tồn tại của bản ghi đối tượng + kiểm tra trạng thái

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Khi bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)
- Khi denshi_shonin_status khác 0: HTTP 400 (`INVALID_STATUS`)

### 4.4 Cập nhật trạng thái (phương thức thêm mới lịch sử)

#### Bước 1: Vô hiệu hóa cờ mới nhất của lịch sử cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2: Đánh số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3: INSERT bản ghi lịch sử mới + UPDATE t_dokusya

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- Sao chép toàn bộ dữ liệu hiện tại lấy ở 4.3
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  henko_riyu,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  2,
  TRUE, FALSE, FALSE, FALSE,
  '電子版否認',
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 2,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 Ghi log thao tác

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`: lưu dữ liệu trước khi từ chối (denshi_shonin_status=0) dưới dạng JSON.
- `after_value`: lưu dữ liệu sau khi từ chối (denshi_shonin_status=2) dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu sau khi từ chối dưới dạng object data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi log lỗi (`log_type = 3`, ghi ngoài transaction).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-006

## Tổng quan

| Mục                  | Nội dung                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API              | Get Dokusya History                                                                                                                                                                                              |
| Tổng quan            | Lấy danh sách lịch sử thay đổi của người đọc được chỉ định (dùng cho modal hiển thị lịch sử)                                                                                                                    |
| URI                  | /api/v1/dokusya/{dokusya_id}/history                                                                                                                                                                             |
| Method               | GET                                                                                                                                                                                                              |
| Request body         | Không có                                                                                                                                                                                                          |
| Request parameter    | dokusya_id (path parameter)                                                                                                                                                                                      |
| Header               | Content-Type: application/json  ※ Thông tin xác thực được tự động gửi qua HTTP-only Cookie                                                                                                                       |
| HTTP response code   | 200: Lấy lịch sử thành công, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tìm thấy người đọc được chỉ định, 500: Đã xảy ra lỗi hệ thống       |

## Tham số request

| #   | ID tham số     | Kiểu   | Lặp lại  | Bắt buộc | Min  | Max  | Mô tả                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | dokusya_id đối tượng lấy dữ liệu (path parameter) |

## Dữ liệu response

| #   | ID mục                  | Kiểu    | Lặp lại  | Định dạng    | Nullable | Mô tả                                                          |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------- |
| 1   | data                    | Array   | 〇       |              | -        | Danh sách lịch sử (rireki_no DESC)                                    |
| 2   | →dokusya_rireki_id      | Number  | -        |              | -        | ID lịch sử người đọc                                                  |
| 3   | →dokusya_id             | Number  | -        |              | -        | ID người đọc                                                      |
| 4   | →rireki_no              | Number  | -        |              | -        | Số lịch sử                                                        |
| 5   | →tetsuzuki_shurui       | Number  | -        |              | -        | Loại thủ tục (0: hủy bỏ, 1: đăng ký mới)                                    |
| 6   | →tetsuzuki_shurui_label | String  | -        |              | -        | Label loại thủ tục                                                |
| 7   | →henko_riyu             | String  | -        |              |          | Lý do thay đổi (cho phép chuỗi rỗng)                                        |
| 8   | →saishin_data_flg       | Boolean | -        |              | -        | Cờ dữ liệu mới nhất                                              |
| 9   | →shinki_flg             | Boolean | -        |              | -        | Cờ đăng ký mới                                                    |
| 10  | →kaiyaku_flg            | Boolean | -        |              | -        | Cờ hủy bỏ                                                    |
| 11  | →zougen_hokoku_flg      | Boolean | -        |              | -        | Cờ báo cáo tăng giảm                                                |
| 12  | →denshi_shonin_status   | Number  | -        |              | 〇       | Trạng thái phê duyệt đăng ký bản điện tử                                        |
| 13  | →created_at             | String  | -        | ISO8601      | -        | Ngày giờ tạo (ngày giờ đăng ký lịch sử)                                      |
| 14  | →created_by             | String  | -        |              | -        | Người tạo (người đăng ký lịch sử)                                          |

## Ví dụ request

```
GET /api/v1/dokusya/100/history
```

## Ví dụ response thành công

```json
{
  "data": [
    {
      "dokusya_rireki_id": 200,
      "dokusya_id": 100,
      "rireki_no": 2,
      "tetsuzuki_shurui": 1,
      "tetsuzuki_shurui_label": "新規",
      "henko_riyu": "住所変更",
      "saishin_data_flg": true,
      "shinki_flg": false,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-05-07T14:30:00+09:00",
      "created_by": "user01"
    },
    {
      "dokusya_rireki_id": 100,
      "dokusya_id": 100,
      "rireki_no": 1,
      "tetsuzuki_shurui": 1,
      "tetsuzuki_shurui_label": "新規",
      "henko_riyu": "",
      "saishin_data_flg": false,
      "shinki_flg": true,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-04-01T10:00:00+09:00",
      "created_by": "user01"
    }
  ]
}
```

## Ví dụ response thất bại

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Phiên đã hết hạn. Vui lòng đăng nhập lại."
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "Không có quyền truy cập màn hình này."
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "Không tìm thấy người đọc được chỉ định."
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian."
}
```

## Trình tự xử lý

### 4.1 Validation request

- Path parameter: dokusya_id kiểm tra kiểu số, bắt buộc
- Khi tồn tại tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực/phân quyền

- Xác thực thông tin xác thực (HTTP-only Cookie session).
- Khi chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `dokusya.view`
- Role có quyền: CHUOKAI (Trung ương hội), JA_HONTEN (Trụ sở chính JA), JA_KANRI_SHITEN (Chi nhánh quản lý JA)
- Khi thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI (Trung ương hội): chỉ tham khảo được trung ương hội của mình
  - JA_HONTEN (Trụ sở chính JA): chỉ tham khảo được JA của mình (`ja_id = user.ja_id`)
  - JA_KANRI_SHITEN (Chi nhánh quản lý JA): chỉ tham khảo được chi nhánh quản lý của mình
- Khi vi phạm DataScope: HTTP 404 (`NOT_FOUND`) (ẩn sự tồn tại)

### 4.3 Kiểm tra sự tồn tại của người đọc

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Khi bản ghi không tồn tại: HTTP 404 (`NOT_FOUND`)

### 4.4 Lấy dữ liệu lịch sử

```sql
SELECT dokusya_rireki_id, dokusya_id, rireki_no,
       tetsuzuki_shurui, henko_riyu,
       saishin_data_flg, shinki_flg, kaiyaku_flg, zougen_hokoku_flg,
       denshi_shonin_status,
       created_at, created_by
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
ORDER BY rireki_no DESC
```

### 4.5 Tạo response

- Map giá trị tetsuzuki_shurui sang label (m_code.code_category='TETSUZUKI_SHURUI').
- Trả về JSON chứa mảng data. HTTP 200.

### 4.6 Xử lý ngoại lệ

- Khi lỗi kết nối DB...: HTTP 500 (`INTERNAL_SERVER_ERROR`)
