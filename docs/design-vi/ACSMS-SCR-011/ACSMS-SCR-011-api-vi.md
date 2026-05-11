---
customer_name: Công ty Báo Nông nghiệp Nhật Bản
system_name: Hệ thống quản lý độc giả đám mây
document_name: Tài liệu thiết kế API
screen_id: ACSMS-SCR-011
screen_name: Màn hình đăng ký thông tin độc giả
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-07
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/05/07
updated_by: Tran Duc Tuyen
---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/05/07 | 1.0 | Tran Duc Tuyen | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là hệ thống quản lý độc giả đám mây dành cho JA,
cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu ghi nợ tài khoản v.v.

Các chức năng chính bao gồm đăng ký/cập nhật/tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu ghi nợ tài khoản,
chức năng tải lên/tải xuống tệp, quản lý thông báo hệ thống.

Ngoài ra, hỗ trợ các chức năng bảo mật và kiểm toán như quản lý đăng nhập người dùng,
ghi lại lịch sử đăng nhập, ghi nhật ký thao tác người dùng.

## Mục đích tài liệu

Tài liệu này mô tả chi tiết các API được tạo mới trên hệ thống trong「Màn hình đăng ký thông tin độc giả (ACSMS-SCR-011)」.

## Tài liệu liên quan

| Số | Mã tài liệu | Tên tài liệu |
| --- | --- | --- |
| 1 | ACSMS-SCR-002 | Tài liệu thiết kế API màn hình tìm kiếm chi tiết độc giả |
| 2 | ACSMS-API-COMMON-001 | Get Prefecture List（Lấy danh sách tỉnh/thành）|

※ Dropdown tỉnh/thành trên màn hình này sử dụng API chung.
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — Định nghĩa tại: ACSMS-SCR-009

## Danh sách lỗi

| # | Loại lỗi | Mã lỗi | Thông báo lỗi | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | Chung | BAD_REQUEST | Tham số request không hợp lệ. | HTTP 400 |
| 2 | Chung | UNAUTHORIZED | Phiên đã hết hạn. Vui lòng đăng nhập lại. | HTTP 401 |
| 3 | Chung | FORBIDDEN | Bạn không có quyền truy cập màn hình này. | HTTP 403 |
| 4 | Chung | DATA_SCOPE_VIOLATION | Bạn không có quyền truy cập dữ liệu này. | HTTP 403 |
| 5 | Chung | VALIDATION_ERROR | Giá trị nhập không hợp lệ. Vui lòng kiểm tra trường errors để biết chi tiết. | HTTP 400 |
| 6 | Chung | TOO_MANY_REQUESTS | Số lượng request đã vượt giới hạn. Vui lòng thử lại sau một lúc. | HTTP 429 |
| 7 | Chung | INTERNAL_SERVER_ERROR | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một lúc. | HTTP 500 |
| 8 | Màn hình cụ thể | NOT_FOUND | Không tìm thấy độc giả được chỉ định. | HTTP 404 |
| 9 | Màn hình cụ thể | DUPLICATE_EMAIL | Địa chỉ email này đã được đăng ký. | HTTP 400 |
| 10 | Màn hình cụ thể | INVALID_STATUS | Đây không phải là độc giả đang chờ phê duyệt. | HTTP 400 |

---

# API ACSMS-API-011-001

## Tổng quan

| Mục | Nội dung |
| --- | --- |
| Tên API | Get Dokusya Detail |
| Tổng quan | Lấy chi tiết độc giả được chỉ định (dùng cho chế độ chỉnh sửa) |
| URI | /api/v1/dokusya/{dokusya_id} |
| Phương thức | GET |
| Request Body | Không có |
| Tham số request | dokusya_id（Path parameter）|
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Lấy chi tiết độc giả thành công, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy độc giả được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | Number | - | 〇 | | | dokusya_id cần lấy（Path parameter）|

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | data | Object | - | | - | Dữ liệu độc giả |
| 2 | →dokusya_id | Number | - | | - | ID độc giả |
| 3 | →ja_id | Number | - | | - | JA ID |
| 4 | →kanri_shiten_id | Number | - | | 〇 | ID chi nhánh quản lý |
| 5 | →shiten_id | Number | - | | 〇 | ID chi nhánh |
| 6 | →kumiaiin_code | String | - | | | Mã thành viên tổ hợp tác (cho phép chuỗi rỗng) |
| 7 | →dokusya_shubetsu | Number | - | | - | Loại đăng ký ※ Tham chiếu m_code.code_category='DOKUSYA_SHUBETSU'（1:Bản giấy, 2:Bản điện tử, 3:Đọc kết hợp）|
| 8 | →tetsuzuki_shurui | Number | - | | - | Loại thủ tục ※ Tham chiếu m_code.code_category='TETSUZUKI_SHURUI'（0:Huỷ, 1:Mới）|
| 9 | →denshi_dokusya_shubetsu | Number | - | | 〇 | Loại độc giả bản điện tử ※ Tham chiếu m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'（0:Miễn phí, 1:Trả phí）|
| 10 | →shimei_sei | String | - | | - | Họ |
| 11 | →shimei_mei | String | - | | - | Tên |
| 12 | →shimei_kana_sei | String | - | | - | Họ (kana) |
| 13 | →shimei_kana_mei | String | - | | - | Tên (kana) |
| 14 | →dokusya_busu | Number | - | | - | Số lượng đăng ký |
| 15 | →yubin_no | String | - | | - | Mã bưu chính |
| 16 | →todofuken_code | String | - | | - | Mã tỉnh/thành |
| 17 | →shikuchoson | String | - | | - | Quận/Huyện/Thị xã |
| 18 | →chome_banchi | String | - | | - | Số nhà/Phố |
| 19 | →tatemono_mei | String | - | | | Tên tòa nhà v.v. (cho phép chuỗi rỗng) |
| 20 | →renrakusaki_1 | String | - | | | Liên lạc 1 (cho phép chuỗi rỗng) |
| 21 | →renrakusaki_2 | String | - | | | Liên lạc 2 (cho phép chuỗi rỗng) |
| 22 | →email | String | - | | | Địa chỉ email (cho phép chuỗi rỗng) |
| 23 | →mail_magazine_flg | Number | - | | - | Bản tin email ※ Tham chiếu m_code.code_category='MAIL_MAGAZINE_FLG'（0:Không gửi, 1:Gửi）|
| 24 | →birth_year | Number | - | | 〇 | Năm sinh (Dương lịch) |
| 25 | →gender | Number | - | | 〇 | Giới tính ※ Tham chiếu m_code.code_category='GENDER'（1:Nam, 2:Nữ, 9:Không trả lời）|
| 26 | →haitatsu_same_flg | Boolean | - | | - | Chỉ định địa chỉ giao (true: giống với độc giả) |
| 27 | →haitatsu_yubin_no | String | - | | | Mã bưu chính địa chỉ giao (cho phép chuỗi rỗng) |
| 28 | →haitatsu_todofuken_code | String | - | | | Mã tỉnh/thành địa chỉ giao (cho phép chuỗi rỗng) |
| 29 | →haitatsu_shikuchoson | String | - | | | Quận/Huyện địa chỉ giao (cho phép chuỗi rỗng) |
| 30 | →haitatsu_chome_banchi | String | - | | | Số nhà/Phố địa chỉ giao (cho phép chuỗi rỗng) |
| 31 | →haitatsu_tatemono_mei | String | - | | | Tên tòa nhà địa chỉ giao (cho phép chuỗi rỗng) |
| 32 | →haitatsu_renrakusaki_1 | String | - | | | Liên lạc 1 địa chỉ giao (cho phép chuỗi rỗng) |
| 33 | →haitatsu_renrakusaki_2 | String | - | | | Liên lạc 2 địa chỉ giao (cho phép chuỗi rỗng) |
| 34 | →haitatsu_shimei_sei | String | - | | | Họ người nhận địa chỉ giao (Kanji) (cho phép chuỗi rỗng) |
| 35 | →haitatsu_shimei_mei | String | - | | | Tên người nhận địa chỉ giao (Kanji) (cho phép chuỗi rỗng) |
| 36 | →haitatsu_shimei_kana_sei | String | - | | | Họ người nhận địa chỉ giao (kana) (cho phép chuỗi rỗng) |
| 37 | →haitatsu_shimei_kana_mei | String | - | | | Tên người nhận địa chỉ giao (kana) (cho phép chuỗi rỗng) |
| 38 | →hanbaiten_id | Number | - | | - | ID đại lý |
| 39 | →hanbaiten_name | String | - | | - | Tên đại lý (lấy qua join m_hanbaiten) |
| 40 | →tanka_id | Number | - | | - | ID đơn giá |
| 41 | →tanka_name | String | - | | - | Tên đơn giá (lấy qua join m_tanka) |
| 42 | →yubin_kubun | String | - | | - | Phân loại gửi bưu điện ※ Tham chiếu m_code.code_category='YUBIN_KUBUN'（0:Không, 1:Bưu điện）|
| 43 | →shiharai_hoho | Number | - | | - | Phương thức thanh toán ※ Tham chiếu m_code.code_category='SHIHARAI_HOHO'（1:Ghi nợ tài khoản, 2:Thu tiền mặt, 3:Thu chuyển khoản, 4:Tại cơ sở JA, 5:Trừ lương, 6:Thẻ tín dụng, 9:Khác）|
| 44 | →dokusyaryo_shiharai_cycle | Number | - | | 〇 | Chu kỳ thanh toán phí đăng ký (số tháng) |
| 45 | →bank_branch_code | String | - | | - | Mã chi nhánh ngân hàng tài khoản ghi nợ |
| 46 | →bank_branch_name | String | - | | - | Tên chi nhánh ngân hàng tài khoản ghi nợ |
| 47 | →hikiotoshi_yokin_shubetsu | Number | - | | 〇 | Loại tiết kiệm tài khoản ghi nợ ※ Tham chiếu m_code.code_category='YOKIN_SHUBETSU'（1:Thông thường, 2:Tài khoản vãng lai）|
| 48 | →hikiotoshi_koza_no | String | - | | | Số tài khoản ghi nợ (cho phép chuỗi rỗng) |
| 49 | →hikiotoshi_koza_meigi | String | - | | | Tên chủ tài khoản ghi nợ (cho phép chuỗi rỗng) |
| 50 | →dokusyaso_bunrui | String | - | | | Phân loại tầng độc giả (phân cách bằng dấu phẩy, cho phép chuỗi rỗng) |
| 51 | →nogyosya_bunrui | String | - | | | Phân loại nông dân (phân cách bằng dấu phẩy, cho phép chuỗi rỗng) |
| 52 | →shoki_dokusya_kaishi_date | String | - | YYYY-MM-DD | - | Ngày bắt đầu đăng ký lần đầu |
| 53 | →dokusya_kaishi_date | String | - | YYYY-MM-DD | - | Ngày bắt đầu đăng ký |
| 54 | →dokusya_chushi_date | String | - | YYYY-MM-DD | 〇 | Ngày huỷ đăng ký |
| 55 | →joho_henko_tekiyo_date | String | - | YYYY-MM-DD | 〇 | Ngày áp dụng thay đổi thông tin độc giả |
| 56 | →seikyu_kaishi_month | String | - | YYYYMM | | Tháng bắt đầu lập hóa đơn (cho phép chuỗi rỗng) |
| 57 | →biko | String | - | | | Ghi chú (cho phép chuỗi rỗng) |
| 58 | →rireki_no | Number | - | | - | Số lịch sử (số lịch sử mới nhất) |
| 59 | →denshi_shonin_status | Number | - | | 〇 | Trạng thái phê duyệt đăng ký điện tử (0: Chờ phê duyệt, 1: Đã phê duyệt, 2: Từ chối) |
| 60 | →created_at | String | - | ISO8601 | - | Ngày giờ tạo |
| 61 | →updated_at | String | - | ISO8601 | - | Ngày giờ cập nhật |

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
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

### 4.1 Validation request

- Kiểm tra path parameter:
  - dokusya_id：Kiểm tra kiểu số, kiểm tra bắt buộc
- Nếu có tham số không hợp lệ：
  - Trả về HTTP 400 (`BAD_REQUEST`).

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.view`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（Trung ương hội）：Chỉ có thể tham chiếu trung ương hội của mình (không thể xem độc giả của JA trực thuộc)
  - JA_HONTEN（JA bản điếm）：Chỉ có thể tham chiếu JA của mình（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA chi nhánh quản lý）：Chỉ có thể tham chiếu chi nhánh quản lý của mình（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- Nếu vi phạm DataScope（truy cập bản ghi của JA khác）：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）

### 4.3 Lấy dữ liệu

- Lấy scope của người dùng đang đăng nhập.
- Thực thi SQL sau để lấy thông tin độc giả（join tên đại lý・tên đơn giá）.

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

- Nếu không tồn tại bản ghi：HTTP 404 (`NOT_FOUND`)
- Nếu vi phạm DataScope：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）

### 4.4 Tạo response

- Trả về JSON chứa đối tượng data. HTTP 200.

### 4.5 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-011-002

## Tổng quan

| Mục | Nội dung |
| --- | --- |
| Tên API | Create Dokusya |
| Tổng quan | Đăng ký độc giả mới（Tạo t_dokusya + t_dokusya_rireki trong 1 transaction）|
| URI | /api/v1/dokusya |
| Phương thức | POST |
| Request Body | JSON |
| Tham số request | |
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 201: Đăng ký độc giả thành công, 400: Nội dung nhập có lỗi, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 400: Địa chỉ email này đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | kanri_shiten_id | Number | - | - | | | ID chi nhánh quản lý |
| 2 | shiten_id | Number | - | - | | | ID chi nhánh |
| 3 | kumiaiin_code | String | - | - | 0 | 20 | Mã thành viên tổ hợp tác |
| 4 | dokusya_shubetsu | Number | - | 〇 | | | Loại đăng ký ※ Tham chiếu m_code.code_category='DOKUSYA_SHUBETSU'（1:Bản giấy, 2:Bản điện tử, 3:Đọc kết hợp）|
| 5 | tetsuzuki_shurui | Number | - | 〇 | | | Loại thủ tục ※ Tham chiếu m_code.code_category='TETSUZUKI_SHURUI'（0:Huỷ, 1:Mới）|
| 6 | denshi_dokusya_shubetsu | Number | - | - | | | Loại độc giả bản điện tử ※ Tham chiếu m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'（0:Miễn phí, 1:Trả phí）|
| 7 | shimei_sei | String | - | 〇 | 1 | 50 | Họ |
| 8 | shimei_mei | String | - | 〇 | 1 | 50 | Tên |
| 9 | shimei_kana_sei | String | - | 〇 | 1 | 100 | Họ (kana) |
| 10 | shimei_kana_mei | String | - | 〇 | 1 | 100 | Tên (kana) |
| 11 | dokusya_busu | Number | - | 〇 | | | Số lượng đăng ký（0 khi huỷ）|
| 12 | yubin_no | String | - | 〇 | 7 | 7 | Mã bưu chính（7 chữ số nửa độ rộng）|
| 13 | todofuken_code | String | - | 〇 | 2 | 2 | Mã tỉnh/thành |
| 14 | shikuchoson | String | - | 〇 | 1 | 100 | Quận/Huyện/Thị xã |
| 15 | chome_banchi | String | - | 〇 | 1 | 100 | Số nhà/Phố |
| 16 | tatemono_mei | String | - | - | 0 | 100 | Tên tòa nhà v.v. |
| 17 | renrakusaki_1 | String | - | 〇 | 1 | 15 | Liên lạc 1（số nửa độ rộng）|
| 18 | renrakusaki_2 | String | - | - | 0 | 15 | Liên lạc 2（số nửa độ rộng）|
| 19 | email | String | - | △ | 0 | 100 | Địa chỉ email（Bắt buộc nếu là bản điện tử/đọc kết hợp）|
| 20 | mail_magazine_flg | Number | - | - | | | Bản tin email ※ Tham chiếu m_code.code_category='MAIL_MAGAZINE_FLG'（0:Không gửi, 1:Gửi）|
| 21 | birth_year | Number | - | - | | | Năm sinh（Dương lịch）|
| 22 | gender | Number | - | - | | | Giới tính ※ Tham chiếu m_code.code_category='GENDER'（1:Nam, 2:Nữ, 9:Không trả lời）|
| 23 | haitatsu_same_flg | Boolean | - | 〇 | | | Chỉ định địa chỉ giao（true: giống với độc giả）|
| 24 | haitatsu_yubin_no | String | - | △ | 0 | 7 | Mã bưu chính địa chỉ giao（Bắt buộc nếu haitatsu_same_flg=false）|
| 25 | haitatsu_todofuken_code | String | - | △ | 0 | 2 | Mã tỉnh/thành địa chỉ giao（Bắt buộc nếu haitatsu_same_flg=false）|
| 26 | haitatsu_shikuchoson | String | - | △ | 0 | 100 | Quận/Huyện địa chỉ giao（Bắt buộc nếu haitatsu_same_flg=false）|
| 27 | haitatsu_chome_banchi | String | - | △ | 0 | 100 | Số nhà/Phố địa chỉ giao（Bắt buộc nếu haitatsu_same_flg=false）|
| 28 | haitatsu_tatemono_mei | String | - | - | 0 | 100 | Tên tòa nhà địa chỉ giao |
| 29 | haitatsu_renrakusaki_1 | String | - | - | 0 | 15 | Liên lạc 1 địa chỉ giao |
| 30 | haitatsu_renrakusaki_2 | String | - | - | 0 | 15 | Liên lạc 2 địa chỉ giao |
| 31 | haitatsu_shimei_sei | String | - | △ | 0 | 50 | Họ người nhận địa chỉ giao |
| 32 | haitatsu_shimei_mei | String | - | △ | 0 | 50 | Tên người nhận địa chỉ giao |
| 33 | haitatsu_shimei_kana_sei | String | - | △ | 0 | 100 | Họ người nhận địa chỉ giao (kana) |
| 34 | haitatsu_shimei_kana_mei | String | - | △ | 0 | 100 | Tên người nhận địa chỉ giao (kana) |
| 35 | hanbaiten_id | Number | - | 〇 | | | ID đại lý |
| 36 | tanka_id | Number | - | 〇 | | | ID đơn giá（tanka_type=1: Phí đăng ký）|
| 37 | yubin_kubun | String | - | - | 1 | 1 | Phân loại gửi bưu điện ※ Tham chiếu m_code.code_category='YUBIN_KUBUN'（0:Không, 1:Bưu điện）. Mặc định: '0' |
| 38 | shiharai_hoho | Number | - | 〇 | | | Phương thức thanh toán ※ Tham chiếu m_code.code_category='SHIHARAI_HOHO'（1:Ghi nợ tài khoản, 2:Thu tiền mặt, 3:Thu chuyển khoản, 4:Tại cơ sở JA, 5:Trừ lương, 6:Thẻ tín dụng, 9:Khác）|
| 39 | dokusyaryo_shiharai_cycle | Number | - | - | | | Chu kỳ thanh toán phí đăng ký（số tháng）|
| 40 | bank_branch_code | String | - | △ | 0 | 3 | Mã chi nhánh ngân hàng tài khoản ghi nợ（Bắt buộc khi ghi nợ tài khoản）|
| 41 | bank_branch_name | String | - | △ | 0 | 100 | Tên chi nhánh ngân hàng tài khoản ghi nợ |
| 42 | hikiotoshi_yokin_shubetsu | Number | - | △ | | | Loại tiết kiệm tài khoản ghi nợ ※ Tham chiếu m_code.code_category='YOKIN_SHUBETSU'（1:Thông thường, 2:Tài khoản vãng lai）|
| 43 | hikiotoshi_koza_no | String | - | △ | 0 | 10 | Số tài khoản ghi nợ |
| 44 | hikiotoshi_koza_meigi | String | - | △ | 0 | 50 | Tên chủ tài khoản ghi nợ |
| 45 | dokusyaso_bunrui | String | - | - | 0 | 50 | Phân loại tầng độc giả（phân cách bằng dấu phẩy）|
| 46 | nogyosya_bunrui | String | - | - | 0 | 50 | Phân loại nông dân（phân cách bằng dấu phẩy）|
| 47 | dokusya_kaishi_date | String | - | 〇 | | | Ngày bắt đầu đăng ký（YYYY-MM-DD）|
| 48 | dokusya_chushi_date | String | - | - | | | Ngày huỷ đăng ký（YYYY-MM-DD, chỉ khi huỷ）|
| 49 | seikyu_kaishi_month | String | - | △ | 0 | 6 | Tháng bắt đầu lập hóa đơn（YYYYMM, trường hợp bản điện tử/đọc kết hợp）|
| 50 | biko | String | - | - | 0 | 500 | Ghi chú |

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | data | Object | - | | - | Dữ liệu độc giả đã đăng ký |
| 2 | →dokusya_id | Number | - | | - | ID độc giả |
| 3 | →ja_id | Number | - | | - | JA ID |
| 4 | →kanri_shiten_id | Number | - | | 〇 | ID chi nhánh quản lý |
| 5 | →shiten_id | Number | - | | 〇 | ID chi nhánh |
| 6 | →kumiaiin_code | String | - | | | Mã thành viên tổ hợp tác (cho phép chuỗi rỗng) |
| 7 | →dokusya_shubetsu | Number | - | | - | Loại đăng ký |
| 8 | →tetsuzuki_shurui | Number | - | | - | Loại thủ tục |
| 9 | →denshi_dokusya_shubetsu | Number | - | | 〇 | Loại độc giả bản điện tử |
| 10 | →shimei_sei | String | - | | - | Họ |
| 11 | →shimei_mei | String | - | | - | Tên |
| 12 | →shimei_kana_sei | String | - | | - | Họ (kana) |
| 13 | →shimei_kana_mei | String | - | | - | Tên (kana) |
| 14 | →dokusya_busu | Number | - | | - | Số lượng đăng ký |
| 15 | →yubin_no | String | - | | - | Mã bưu chính |
| 16 | →todofuken_code | String | - | | - | Mã tỉnh/thành |
| 17 | →shikuchoson | String | - | | - | Quận/Huyện/Thị xã |
| 18 | →chome_banchi | String | - | | - | Số nhà/Phố |
| 19 | →tatemono_mei | String | - | | | Tên tòa nhà v.v. (cho phép chuỗi rỗng) |
| 20 | →renrakusaki_1 | String | - | | | Liên lạc 1 (cho phép chuỗi rỗng) |
| 21 | →renrakusaki_2 | String | - | | | Liên lạc 2 (cho phép chuỗi rỗng) |
| 22 | →email | String | - | | | Địa chỉ email (cho phép chuỗi rỗng) |
| 23 | →mail_magazine_flg | Number | - | | - | Bản tin email |
| 24 | →birth_year | Number | - | | 〇 | Năm sinh (Dương lịch) |
| 25 | →gender | Number | - | | 〇 | Giới tính |
| 26 | →haitatsu_same_flg | Boolean | - | | - | Chỉ định địa chỉ giao |
| 27 | →haitatsu_yubin_no | String | - | | | Mã bưu chính địa chỉ giao (cho phép chuỗi rỗng) |
| 28 | →haitatsu_todofuken_code | String | - | | | Mã tỉnh/thành địa chỉ giao (cho phép chuỗi rỗng) |
| 29 | →haitatsu_shikuchoson | String | - | | | Quận/Huyện địa chỉ giao (cho phép chuỗi rỗng) |
| 30 | →haitatsu_chome_banchi | String | - | | | Số nhà/Phố địa chỉ giao (cho phép chuỗi rỗng) |
| 31 | →haitatsu_tatemono_mei | String | - | | | Tên tòa nhà địa chỉ giao (cho phép chuỗi rỗng) |
| 32 | →haitatsu_renrakusaki_1 | String | - | | | Liên lạc 1 địa chỉ giao (cho phép chuỗi rỗng) |
| 33 | →haitatsu_renrakusaki_2 | String | - | | | Liên lạc 2 địa chỉ giao (cho phép chuỗi rỗng) |
| 34 | →haitatsu_shimei_sei | String | - | | | Họ người nhận địa chỉ giao (Kanji) (cho phép chuỗi rỗng) |
| 35 | →haitatsu_shimei_mei | String | - | | | Tên người nhận địa chỉ giao (Kanji) (cho phép chuỗi rỗng) |
| 36 | →haitatsu_shimei_kana_sei | String | - | | | Họ người nhận địa chỉ giao (kana) (cho phép chuỗi rỗng) |
| 37 | →haitatsu_shimei_kana_mei | String | - | | | Tên người nhận địa chỉ giao (kana) (cho phép chuỗi rỗng) |
| 38 | →hanbaiten_id | Number | - | | - | ID đại lý |
| 39 | →tanka_id | Number | - | | - | ID đơn giá |
| 40 | →yubin_kubun | String | - | | - | Phân loại gửi bưu điện |
| 41 | →shiharai_hoho | Number | - | | - | Phương thức thanh toán |
| 42 | →dokusyaryo_shiharai_cycle | Number | - | | 〇 | Chu kỳ thanh toán phí đăng ký (số tháng) |
| 43 | →bank_branch_code | String | - | | - | Mã chi nhánh ngân hàng tài khoản ghi nợ |
| 44 | →bank_branch_name | String | - | | - | Tên chi nhánh ngân hàng tài khoản ghi nợ |
| 45 | →hikiotoshi_yokin_shubetsu | Number | - | | 〇 | Loại tiết kiệm tài khoản ghi nợ |
| 46 | →hikiotoshi_koza_no | String | - | | | Số tài khoản ghi nợ (cho phép chuỗi rỗng) |
| 47 | →hikiotoshi_koza_meigi | String | - | | | Tên chủ tài khoản ghi nợ (cho phép chuỗi rỗng) |
| 48 | →dokusyaso_bunrui | String | - | | | Phân loại tầng độc giả (cho phép chuỗi rỗng) |
| 49 | →nogyosya_bunrui | String | - | | | Phân loại nông dân (cho phép chuỗi rỗng) |
| 50 | →shoki_dokusya_kaishi_date | String | - | YYYY-MM-DD | - | Ngày bắt đầu đăng ký lần đầu |
| 51 | →dokusya_kaishi_date | String | - | YYYY-MM-DD | - | Ngày bắt đầu đăng ký |
| 52 | →dokusya_chushi_date | String | - | YYYY-MM-DD | 〇 | Ngày huỷ đăng ký |
| 53 | →joho_henko_tekiyo_date | String | - | YYYY-MM-DD | 〇 | Ngày áp dụng thay đổi thông tin độc giả |
| 54 | →seikyu_kaishi_month | String | - | YYYYMM | | Tháng bắt đầu lập hóa đơn (cho phép chuỗi rỗng) |
| 55 | →biko | String | - | | | Ghi chú (cho phép chuỗi rỗng) |
| 56 | →rireki_no | Number | - | | - | Số lịch sử |
| 57 | →denshi_shonin_status | Number | - | | 〇 | Trạng thái phê duyệt đăng ký điện tử |
| 58 | →created_at | String | - | ISO8601 | - | Ngày giờ tạo |
| 59 | →updated_at | String | - | ISO8601 | - | Ngày giờ cập nhật |

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

### 400 Bad Request（Lỗi validation）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "shimei_sei", "message": "必須項目です。" },
    { "field": "yubin_no", "message": "郵便番号は7桁で入力してください。" }
  ]
}
```

### 400 Bad Request（Trùng địa chỉ email）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

> ※ 4.4 Đăng ký dữ liệu và 4.5 Ghi nhật ký thao tác được thực thi trong một transaction duy nhất.
> Nếu một trong hai thất bại, tất cả phải rollback.
> Nhật ký lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng bên ngoài transaction.

### 4.1 Validation request

- Kiểm tra request body:
  - shimei_sei / shimei_mei：Bắt buộc, tối đa 50 ký tự
  - shimei_kana_sei / shimei_kana_mei：Bắt buộc, tối đa 100 ký tự, định dạng hiragana/katakana
  - dokusya_busu：Bắt buộc, số nửa độ rộng. Là 0 khi huỷ
  - yubin_no：Bắt buộc, 7 chữ số nửa độ rộng
  - todofuken_code / shikuchoson / chome_banchi：Bắt buộc
  - renrakusaki_1：Bắt buộc, số nửa độ rộng
  - email：Bắt buộc nếu là bản điện tử/đọc kết hợp, kiểm tra định dạng
  - Nếu haitatsu_same_flg=false：haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_shimei_*, haitatsu_shimei_kana_* bắt buộc
  - hanbaiten_id / tanka_id：Bắt buộc
  - shiharai_hoho：Bắt buộc. Nếu là 1（Ghi nợ tài khoản）：bank_branch_code, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi bắt buộc
  - dokusya_kaishi_date：Bắt buộc, YYYY-MM-DD
  - seikyu_kaishi_month：Trường hợp bản điện tử/đọc kết hợp, định dạng YYYYMM
  - biko：Trong vòng 500 ký tự
- Nếu lỗi validation：HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.create`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope: `ja_id = user.ja_id`（Hệ thống tự động đặt phía server. Không tin tưởng ja_id trong request body）
- Nếu vi phạm DataScope：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Kiểm tra trùng lặp（Địa chỉ email）

- Nếu có nhập địa chỉ email, kiểm tra trùng lặp theo điều kiện sau.

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu có trùng lặp：HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 Đăng ký dữ liệu

- INSERT bản ghi vào t_dokusya.
- INSERT bản ghi lịch sử vào t_dokusya_rireki（rireki_no=1, saishin_data_flg=true）.
- Quy tắc đặt cờ：
  - saishin_data_flg = true
  - shinki_flg = (tetsuzuki_shurui=1) ? true : false
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? true : false
  - zougen_hokoku_flg = true（Đăng ký mới là đối tượng tăng giảm）
- Khi huỷ, bắt buộc đặt dokusya_busu=0.

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

### 4.5 Ghi nhật ký thao tác

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

- `before_value`：Là INSERT nên đặt chuỗi rỗng.
- `after_value`：Lưu dữ liệu đã đăng ký dưới dạng JSON. Không được bao gồm thông tin bí mật như mật khẩu.

### 4.6 Tạo response

- Trả về dữ liệu đã đăng ký như đối tượng data. HTTP 201.

### 4.7 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi nhật ký lỗi（`log_type = 3`, ghi bên ngoài transaction）.

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

| Mục | Nội dung |
| --- | --- |
| Tên API | Update Dokusya |
| Tổng quan | Cập nhật độc giả được chỉ định（Phương thức ghi thêm lịch sử: Vô hiệu hoá cờ mới nhất của lịch sử cũ + Ghi thêm lịch sử mới）|
| URI | /api/v1/dokusya/{dokusya_id} |
| Phương thức | PUT |
| Request Body | JSON |
| Tham số request | dokusya_id（Path parameter）|
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Cập nhật độc giả thành công, 400: Nội dung nhập có lỗi, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy độc giả được chỉ định, 400: Địa chỉ email này đã được đăng ký, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | Number | - | 〇 | | | dokusya_id cần cập nhật（Path parameter）|

※ Request body có cùng cấu trúc với ACSMS-API-011-002. dokusya_id không thể thay đổi（Lấy từ URL）.

## Dữ liệu response

Cùng cấu trúc với dữ liệu response của ACSMS-API-011-002.

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
    "dokusya_busu": 2,
    "chome_banchi": "千代田1-2",
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  }
}
```

## Ví dụ response thất bại

### 400 Bad Request（Lỗi validation）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "shimei_sei", "message": "必須項目です。" }]
}
```

### 400 Bad Request（Trùng địa chỉ email）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

> ※ 4.4 Cập nhật dữ liệu và 4.5 Ghi nhật ký thao tác được thực thi trong một transaction duy nhất.
> Nếu một trong hai thất bại, tất cả phải rollback.
> Nhật ký lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng bên ngoài transaction.

### 4.1 Validation request

- Path parameter：Kiểm tra kiểu số dokusya_id, bắt buộc
- Request body：Tương tự ACSMS-API-011-002
- Nếu lỗi validation：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.update`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（Trung ương hội）：Chỉ có thể cập nhật trung ương hội của mình
  - JA_HONTEN（JA bản điếm）：Chỉ có thể cập nhật JA của mình（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA chi nhánh quản lý）：Chỉ có thể cập nhật chi nhánh quản lý của mình（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- Nếu vi phạm DataScope：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）
- ※ Độc giả thanh toán thẻ tín dụng bản điện tử và độc giả đọc kết hợp không thể chỉnh sửa（Quy tắc nghiệp vụ）.

### 4.3 Xác nhận tồn tại bản ghi + Kiểm tra trùng email

- Lấy bản ghi đích（Lấy dữ liệu trước khi cập nhật）.

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu không tồn tại bản ghi：HTTP 404 (`NOT_FOUND`)
- Nếu địa chỉ email thay đổi, kiểm tra trùng lặp.

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND dokusya_id <> :dokusya_id
  AND deleted_at IS NULL
```

- Nếu có trùng lặp：HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 Cập nhật dữ liệu（Phương thức ghi thêm lịch sử）

Xử lý 3 bước theo định nghĩa chức năng 15.3：

#### Bước 1：Vô hiệu hoá cờ mới nhất của lịch sử cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2：Cấp số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3：Thêm bản ghi lịch sử mới + Cập nhật t_dokusya

- Quy tắc đặt cờ（Định nghĩa chức năng 14.2）：
  - saishin_data_flg = TRUE
  - shinki_flg = (tetsuzuki_shurui=1) ? TRUE : FALSE（Khi đọc lại cũng là TRUE）
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? TRUE : FALSE
  - zougen_hokoku_flg = (Khi thay đổi số lượng đăng ký/đại lý/địa chỉ) ? TRUE : FALSE
- Cột zenkai_*：Lưu giá trị tương ứng trước khi cập nhật（Dùng để so sánh tăng giảm）.

### 4.5 Ghi nhật ký thao tác

- Lấy dữ liệu trước cập nhật（Kết quả SELECT của 4.3）và lưu vào `before_value`.

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

- `before_value`：Lưu dữ liệu trước khi cập nhật dưới dạng JSON.
- `after_value`：Lưu dữ liệu sau khi cập nhật dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu đã cập nhật như đối tượng data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi nhật ký lỗi（`log_type = 3`, ghi bên ngoài transaction）.

---

# API ACSMS-API-011-004

## Tổng quan

| Mục | Nội dung |
| --- | --- |
| Tên API | Approve Denshi Dokusya |
| Tổng quan | Phê duyệt độc giả đăng ký bản điện tử（denshi_shonin_status 0→1）. Tạo bản ghi lịch sử mới. |
| URI | /api/v1/dokusya/{dokusya_id}/approve |
| Phương thức | PUT |
| Request Body | Không có |
| Tham số request | dokusya_id（Path parameter）|
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Phê duyệt thành công, 400: Đây không phải là độc giả đang chờ phê duyệt, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy độc giả được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | Number | - | 〇 | | | dokusya_id cần phê duyệt（Path parameter）|

## Dữ liệu response

Cùng cấu trúc với dữ liệu response của ACSMS-API-011-002（Trả về với denshi_shonin_status=1）.

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
  "message": "承認しました。"
}
```

## Ví dụ response thất bại

### 400 Bad Request（Trạng thái không hợp lệ）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

> ※ 4.4 Cập nhật trạng thái và 4.5 Ghi nhật ký thao tác được thực thi trong một transaction duy nhất.
> Nếu một trong hai thất bại, tất cả phải rollback.
> Nhật ký lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng bên ngoài transaction.

### 4.1 Validation request

- Path parameter：Kiểm tra kiểu số dokusya_id, bắt buộc
- Nếu có tham số không hợp lệ：HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.update`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（Trung ương hội）：Chỉ có thể phê duyệt trung ương hội của mình
  - JA_HONTEN（JA bản điếm）：Chỉ có thể phê duyệt JA của mình（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA chi nhánh quản lý）：Chỉ có thể phê duyệt chi nhánh quản lý của mình
- Nếu vi phạm DataScope：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）

### 4.3 Xác nhận tồn tại bản ghi + Kiểm tra trạng thái

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu không tồn tại bản ghi：HTTP 404 (`NOT_FOUND`)
- Nếu denshi_shonin_status không phải 0：HTTP 400 (`INVALID_STATUS`)

### 4.4 Cập nhật trạng thái（Phương thức ghi thêm lịch sử）

#### Bước 1：Vô hiệu hoá cờ mới nhất của lịch sử cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2：Cấp số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3：INSERT bản ghi lịch sử mới + UPDATE t_dokusya

- Bản ghi lịch sử sao chép thông tin độc giả hiện tại, đặt denshi_shonin_status=1. saishin_data_flg=TRUE.

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

### 4.5 Ghi nhật ký thao tác

- `before_value`：Lưu dữ liệu trước phê duyệt（denshi_shonin_status=0）dưới dạng JSON.
- `after_value`：Lưu dữ liệu sau phê duyệt（denshi_shonin_status=1）dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu sau phê duyệt như đối tượng data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi nhật ký lỗi（`log_type = 3`, ghi bên ngoài transaction）.

---

# API ACSMS-API-011-005

## Tổng quan

| Mục | Nội dung |
| --- | --- |
| Tên API | Reject Denshi Dokusya |
| Tổng quan | Từ chối độc giả đăng ký bản điện tử（denshi_shonin_status 0→2）. Tạo bản ghi lịch sử mới. |
| URI | /api/v1/dokusya/{dokusya_id}/reject |
| Phương thức | PUT |
| Request Body | Không có |
| Tham số request | dokusya_id（Path parameter）|
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Từ chối thành công, 400: Đây không phải là độc giả đang chờ phê duyệt, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy độc giả được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | Number | - | 〇 | | | dokusya_id cần từ chối（Path parameter）|

## Dữ liệu response

Cùng cấu trúc với dữ liệu response của ACSMS-API-011-002（Trả về với denshi_shonin_status=2）.

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
  "message": "否認しました。"
}
```

## Ví dụ response thất bại

### 400 Bad Request（Trạng thái không hợp lệ）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

> ※ 4.4 Cập nhật trạng thái và 4.5 Ghi nhật ký thao tác được thực thi trong một transaction duy nhất.
> Nếu một trong hai thất bại, tất cả phải rollback.
> Nhật ký lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng bên ngoài transaction.

### 4.1 Validation request

- Path parameter：Kiểm tra kiểu số dokusya_id, bắt buộc
- Nếu có tham số không hợp lệ：HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.update`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（Trung ương hội）：Chỉ có thể từ chối trung ương hội của mình
  - JA_HONTEN（JA bản điếm）：Chỉ có thể từ chối JA của mình（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA chi nhánh quản lý）：Chỉ có thể từ chối chi nhánh quản lý của mình
- Nếu vi phạm DataScope：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）

### 4.3 Xác nhận tồn tại bản ghi + Kiểm tra trạng thái

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu không tồn tại bản ghi：HTTP 404 (`NOT_FOUND`)
- Nếu denshi_shonin_status không phải 0：HTTP 400 (`INVALID_STATUS`)

### 4.4 Cập nhật trạng thái（Phương thức ghi thêm lịch sử）

#### Bước 1：Vô hiệu hoá cờ mới nhất của lịch sử cũ

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### Bước 2：Cấp số lịch sử mới

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### Bước 3：INSERT bản ghi lịch sử mới + UPDATE t_dokusya

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

### 4.5 Ghi nhật ký thao tác

- `before_value`：Lưu dữ liệu trước từ chối（denshi_shonin_status=0）dưới dạng JSON.
- `after_value`：Lưu dữ liệu sau từ chối（denshi_shonin_status=2）dưới dạng JSON.

### 4.6 Tạo response

- Trả về dữ liệu sau từ chối như đối tượng data. HTTP 200.

### 4.7 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- Khi xảy ra lỗi, ghi nhật ký lỗi（`log_type = 3`, ghi bên ngoài transaction）.

---

# API ACSMS-API-011-006

## Tổng quan

| Mục | Nội dung |
| --- | --- |
| Tên API | Get Dokusya History |
| Tổng quan | Lấy danh sách lịch sử thay đổi của độc giả được chỉ định（Dùng cho modal hiển thị lịch sử）|
| URI | /api/v1/dokusya/{dokusya_id}/history |
| Phương thức | GET |
| Request Body | Không có |
| Tham số request | dokusya_id（Path parameter）|
| Header | Content-Type: application/json　※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie |
| HTTP Response Code | 200: Lấy lịch sử thành công, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Bạn không có quyền truy cập màn hình này, 404: Không tìm thấy độc giả được chỉ định, 500: Đã xảy ra lỗi hệ thống |

## Tham số request

| # | ID tham số | Kiểu | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | Number | - | 〇 | | | dokusya_id cần lấy（Path parameter）|

## Dữ liệu response

| # | ID mục | Kiểu | Lặp lại | Định dạng | Nullable | Mô tả |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | data | Array | 〇 | | - | Danh sách lịch sử（rireki_no DESC）|
| 2 | →dokusya_rireki_id | Number | - | | - | ID lịch sử độc giả |
| 3 | →dokusya_id | Number | - | | - | ID độc giả |
| 4 | →rireki_no | Number | - | | - | Số lịch sử |
| 5 | →tetsuzuki_shurui | Number | - | | - | Loại thủ tục（0:Huỷ, 1:Mới）|
| 6 | →tetsuzuki_shurui_label | String | - | | - | Nhãn loại thủ tục |
| 7 | →henko_riyu | String | - | | | Lý do thay đổi（cho phép chuỗi rỗng）|
| 8 | →saishin_data_flg | Boolean | - | | - | Cờ dữ liệu mới nhất |
| 9 | →shinki_flg | Boolean | - | | - | Cờ mới |
| 10 | →kaiyaku_flg | Boolean | - | | - | Cờ huỷ |
| 11 | →zougen_hokoku_flg | Boolean | - | | - | Cờ báo cáo tăng giảm |
| 12 | →denshi_shonin_status | Number | - | | 〇 | Trạng thái phê duyệt đăng ký điện tử |
| 13 | →created_at | String | - | ISO8601 | - | Ngày giờ tạo（Ngày giờ đăng ký lịch sử）|
| 14 | →created_by | String | - | | - | Người tạo（Người đăng ký lịch sử）|

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
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Quy trình xử lý

### 4.1 Validation request

- Path parameter：Kiểm tra kiểu số dokusya_id, bắt buộc
- Nếu có tham số không hợp lệ：HTTP 400 (`BAD_REQUEST`)

### 4.2 Kiểm tra xác thực・phân quyền

- Xác minh thông tin xác thực（Session HTTP-only Cookie）.
- Chưa xác thực：HTTP 401 (`UNAUTHORIZED`)
- Quyền cần có: `dokusya.view`
- Role có quyền tương ứng: CHUOKAI（Trung ương hội）, JA_HONTEN（JA bản điếm）, JA_KANRI_SHITEN（JA chi nhánh quản lý）
- Không đủ quyền：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（Trung ương hội）：Chỉ có thể tham chiếu trung ương hội của mình
  - JA_HONTEN（JA bản điếm）：Chỉ có thể tham chiếu JA của mình（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA chi nhánh quản lý）：Chỉ có thể tham chiếu chi nhánh quản lý của mình
- Nếu vi phạm DataScope：HTTP 404 (`NOT_FOUND`)（ẩn sự tồn tại）

### 4.3 Xác nhận tồn tại độc giả

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- Nếu không tồn tại bản ghi：HTTP 404 (`NOT_FOUND`)

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

- Map giá trị tetsuzuki_shurui thành nhãn（m_code.code_category='TETSUZUKI_SHURUI'）.
- Trả về JSON chứa mảng data. HTTP 200.

### 4.6 Xử lý ngoại lệ

- Nếu lỗi kết nối DB v.v.：HTTP 500 (`INTERNAL_SERVER_ERROR`)
