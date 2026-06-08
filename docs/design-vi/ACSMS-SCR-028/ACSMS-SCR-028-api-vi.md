---
customer_name: 日本農業新聞様 (Khách hàng Nông nghiệp Nhật Bản)
system_name: クラウド版購読者管理システム (Hệ thống quản lý độc giả phiên bản Cloud)
document_name: API設計書 (Tài liệu thiết kế API)
screen_id: ACSMS-SCR-028
screen_name: 増減連絡票（販売店）出力画面 (Màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng))
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-31
created_date: 2026/05/31
created_by: Nguyen Truong An
updated_date: 2026/05/31
updated_by: Nguyen Truong An
---

## Lịch sử thay đổi (変更履歴)

| No  | Ngày phát hành | Phiên bản | Người phụ trách  | Nội dung thay đổi        | Người xác nhận | Người phê duyệt |
| --- | -------------- | --------- | ---------------- | ------------------------ | -------------- | --------------- |
| 1   | 2026/05/31     | 1.0       | Nguyen Truong An | Tạo phiên bản đầu tiên   | Nguyen Huy Dat | Nguyen Huy Dat  |

## Tổng quan hệ thống (システム概要)

Hệ thống này là hệ thống quản lý độc giả phiên bản Cloud dành cho JA, cung cấp các chức năng như
quản lý thông tin độc giả, quản lý lịch sử đăng ký độc giả, quản lý dữ liệu chuyển khoản tài khoản, v.v.

Các chức năng chính bao gồm: đăng ký・cập nhật・tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tài khoản,
chức năng tải lên・tải xuống tập tin, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như
quản lý đăng nhập của người dùng, ghi nhận lịch sử đăng nhập,
ghi nhận log thao tác của người dùng.

## Mục đích tài liệu (資料目的)

Đây là tài liệu mô tả chi tiết các API được tạo mới trên hệ thống cho
「Màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng) (ACSMS-SCR-028)」.

Màn hình này cung cấp chức năng tổng hợp phần tăng/giảm độc giả (tăng số bản・giảm số bản) và thay đổi địa chỉ
tại ngày áp dụng được chỉ định, theo đơn vị tổ hợp đại lý bán hàng + chi nhánh quản lý,
hiển thị bản xem trước (preview) trên màn hình (API-028-002), đồng thời tạo và lưu vào S3
dưới dạng chứng từ điện tử (PDF) (API-028-003).
Khi màn hình hiển thị lần đầu, hệ thống lấy danh sách đại lý bán hàng・chi nhánh quản lý có thể chọn
làm điều kiện xuất (API-028-001).

## Tài liệu liên quan (関連資料)

| No  | Mã tài liệu   | Tên tài liệu                                                          |
| --- | ------------- | -------------------------------------------------------------------- |
| 1   | ACSMS-SCR-029 | Tài liệu thiết kế API Màn hình xuất thông báo tăng/giảm (Nông nghiệp Nhật Bản) |

※ Điều kiện xuất của màn hình này (checkbox đại lý bán hàng・chi nhánh quản lý) cần các bộ lọc đặc thù
riêng của màn hình như loại trừ cửa hàng đã đóng (廃店), giới hạn chỉ chi nhánh của chính JA管理支店, v.v.,
nên không sử dụng API dùng chung (ACSMS-API-COMMON-004 / COMMON-007) mà định nghĩa
API lấy điều kiện xuất chuyên dụng (ACSMS-API-028-001).

## Danh sách lỗi (エラー一覧)

| #   | Loại lỗi   | Mã lỗi                | Thông báo lỗi                                                                          | Ghi chú  |
| --- | ---------- | --------------------- | -------------------------------------------------------------------------------------- | -------- |
| 1   | Dùng chung | BAD_REQUEST           | リクエストパラメータが不正です。                                                       | HTTP 400 |
| 2   | Dùng chung | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                                     | HTTP 401 |
| 3   | Dùng chung | FORBIDDEN             | この画面へのアクセス権限がありません。                                                 | HTTP 403 |
| 4   | Dùng chung | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                                               | HTTP 403 |
| 5   | Dùng chung | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。                           | HTTP 400 |
| 6   | Dùng chung | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。                 | HTTP 429 |
| 7   | Dùng chung | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。                     | HTTP 500 |
| 8   | Đặc thù màn hình | NO_TARGET_DATA  | 対象のデータが存在しません。                                                           | HTTP 404 |

※ Vì 日農 管理者 / 日農 担当者 (NICHINO_ADMIN / NICHINO_STAFF) không có quyền `report.export_zougen_hanbaiten`,
các API của màn hình này sẽ trả về HTTP 403 (`FORBIDDEN`). Phía màn hình hiển thị
ACSMS-MSG-028-001「この機能はJAアカウントのみ使用できます。」(Chức năng này chỉ tài khoản JA mới sử dụng được.).

---

# API ACSMS-API-028-001

## Tổng quan (概要)

| Mục                          | Nội dung                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                      | Get Zougen Hanbaiten Report Filter Options                                                                                                                   |
| Tổng quan                    | Lấy điều kiện xuất (danh sách checkbox đại lý bán hàng・chi nhánh quản lý) của màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng). Gọi 1 lần khi màn hình hiển thị lần đầu. |
| URI                          | /api/v1/reports/zougen-hanbaiten/filter-options                                                                                                              |
| Phương thức (メソッド)       | GET                                                                                                                                                          |
| Request body                 | Không có                                                                                                                                                     |
| Request parameter            | Không có                                                                                                                                                     |
| Header                       | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie                                                                   |
| Mã phản hồi HTTP             | 200:Lấy điều kiện xuất thành công, 401:Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 500:Lỗi hệ thống |

## Tham số request (リクエストパラメータ)

Không có (tự động lọc dựa trên DataScope của người dùng đăng nhập).

## Dữ liệu phản hồi (レスポンスデータ)

| #   | ID mục              | Kiểu   | Lặp lại | Định dạng | Nullable | Mô tả                                  |
| --- | ------------------- | ------ | ------- | --------- | -------- | -------------------------------------- |
| 1   | data                | Object | -       |           | -        | Đối tượng điều kiện xuất               |
| 2   | →hanbaiten          | Array  | ○       |           | -        | Danh sách checkbox đại lý bán hàng     |
| 3   | →→hanbaiten_id      | Number | -       |           | -        | ID đại lý bán hàng                     |
| 4   | →→hanbaiten_code    | String | -       |           | -        | Mã đại lý bán hàng                     |
| 5   | →→hanbaiten_name    | String | -       |           | -        | Tên đại lý bán hàng                    |
| 6   | →kanri_shiten       | Array  | ○       |           | -        | Danh sách checkbox chi nhánh quản lý   |
| 7   | →→kanri_shiten_id   | Number | -       |           | -        | ID chi nhánh quản lý                   |
| 8   | →→kanri_shiten_code | String | -       |           | -        | Mã chi nhánh quản lý                   |
| 9   | →→kanri_shiten_name | String | -       |           | -        | Tên chi nhánh quản lý                  |

## Ví dụ request (リクエスト例)

```
GET /api/v1/reports/zougen-hanbaiten/filter-options
```

## Ví dụ phản hồi thành công (レスポンス成功例)

```json
{
  "data": {
    "hanbaiten": [
      { "hanbaiten_id": 200, "hanbaiten_code": "H001", "hanbaiten_name": "A新聞店" },
      { "hanbaiten_id": 201, "hanbaiten_code": "H002", "hanbaiten_name": "B新聞店" },
      { "hanbaiten_id": 202, "hanbaiten_code": "H003", "hanbaiten_name": "C新聞店" }
    ],
    "kanri_shiten": [
      { "kanri_shiten_id": 20, "kanri_shiten_code": "113-5001-001", "kanri_shiten_name": "A支所" },
      { "kanri_shiten_id": 21, "kanri_shiten_code": "113-5001-002", "kanri_shiten_name": "B支所" }
    ]
  }
}
```

## Ví dụ phản hồi thất bại (レスポンス失敗例)

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

## Trình tự xử lý (処理手順)

### 4.1 Kiểm tra hợp lệ request (リクエストのバリデーション)

- Không có tham số request.

### 4.2 Kiểm tra xác thực・phân quyền (認証・認可チェック)

- Xác minh thông tin xác thực (phiên HTTP-only Cookie).
- Trường hợp chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `report.export_zougen_hanbaiten`
- Các role có quyền tương ứng: CHUOKAI (Trung ương hội) / JA_HONTEN (JA bản điếm) / JA_KANRI_SHITEN (JA chi nhánh quản lý)
- Trường hợp thiếu quyền: HTTP 403 (`FORBIDDEN`)
  - ※ Vì NICHINO_ADMIN / NICHINO_STAFF không có quyền này nên sẽ trả về 403 tại bước này (màn hình hiển thị ACSMS-MSG-028-001).
- DataScope:
  - Trung ương hội (CHUOKAI): dữ liệu gắn với các JA thuộc trung ương hội của chính mình (`ja_id IN (danh sách JA thuộc trung ương hội)`)
  - JA bản điếm (JA_HONTEN): dữ liệu của JA của chính mình (`ja_id = :user_ja_id`)
  - JA chi nhánh quản lý (JA_KANRI_SHITEN): dữ liệu của JA của chính mình và chỉ chi nhánh quản lý của chính mình (`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`)
- Trường hợp vi phạm DataScope (truy cập bản ghi của JA khác): HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Lấy danh sách đại lý bán hàng (販売店一覧の取得)

- Loại trừ đại lý bán hàng đã đóng cửa (`haiten_flg = true`) và đại lý bán hàng dummy phiên bản điện tử.
- Áp dụng điều kiện DataScope.

```sql
SELECT h.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name
FROM m_hanbaiten h
WHERE h.deleted_at IS NULL
  AND h.haiten_flg = false
  /* DataScope（中央会：ja_id IN(...), JA本店/JA管理支店：ja_id = :user_ja_id） */
  AND h.ja_id = :user_ja_id
ORDER BY h.hanbaiten_code ASC
```

### 4.4 Lấy danh sách chi nhánh quản lý (管理支店一覧の取得)

- Trường hợp role JA chi nhánh quản lý (JA_KANRI_SHITEN), chỉ lấy `kanri_shiten_id` của tài khoản chính mình.

```sql
SELECT ks.kanri_shiten_id, ks.kanri_shiten_code, ks.kanri_shiten_name
FROM m_kanri_shiten ks
WHERE ks.deleted_at IS NULL
  /* DataScope（中央会：ja_id IN(...), JA本店：ja_id = :user_ja_id） */
  AND ks.ja_id = :user_ja_id
  /* JA管理支店ロールのみ付与 */
  AND (:user_kanri_shiten_id IS NULL OR ks.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY ks.kanri_shiten_code ASC
```

### 4.5 Tạo phản hồi (レスポンス生成)

- Trả về đối tượng data chứa mảng `hanbaiten`・mảng `kanri_shiten`. HTTP 200.

### 4.6 Xử lý ngoại lệ (例外処理)

- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-028-002

## Tổng quan (概要)

| Mục                       | Nội dung                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên API                   | Get Zougen Hanbaiten Report Preview                                                                                                                                                                           |
| Tổng quan                 | Với điều kiện ngày áp dụng・đại lý bán hàng・chi nhánh quản lý được chỉ định, trích xuất dữ liệu tăng số bản／giảm số bản／thay đổi địa chỉ, nhóm theo đơn vị tổ hợp đại lý bán hàng + chi nhánh quản lý (đơn vị chứng từ) và lấy dữ liệu để hiển thị xem trước (preview). |
| URI                       | /api/v1/reports/zougen-hanbaiten/preview                                                                                                                                                                     |
| Phương thức (メソッド)    | GET                                                                                                                                                                                                          |
| Request body              | Không có                                                                                                                                                                                                     |
| Request parameter         | Query parameter                                                                                                                                                                                              |
| Header                    | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie                                                                                                                   |
| Mã phản hồi HTTP          | 200:Lấy dữ liệu xem trước thành công, 400:Có lỗi trong nội dung nhập, 401:Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 404:Không tồn tại dữ liệu đối tượng, 500:Lỗi hệ thống |

## Tham số request (リクエストパラメータ)

| #   | ID tham số        | Kiểu   | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                                                              |
| --- | ----------------- | ------ | ------- | -------- | ---------------- | ------------- | ---------------------------------------------------------------------------------- |
| 1   | tekiyo_date       | String | -       | 〇       |                  |               | Ngày áp dụng (YYYY-MM-DD). Trích xuất dữ liệu khớp với `t_dokusya_rireki.joho_henko_tekiyo_date`. Trường hợp chưa nhập → ACSMS-MSG-028-004 |
| 2   | hanbaiten_ids     | String | -       | -        |                  |               | ID đại lý bán hàng (phân tách bằng dấu phẩy. VD:`200,201`). Khi không chỉ định thì lấy toàn bộ đại lý bán hàng trong DataScope |
| 3   | kanri_shiten_ids  | String | -       | -        |                  |               | ID chi nhánh quản lý (phân tách bằng dấu phẩy. VD:`20,21`). Khi không chỉ định thì lấy toàn bộ chi nhánh quản lý trong DataScope |

## Dữ liệu phản hồi (レスポンスデータ)

| #   | ID mục                       | Kiểu    | Lặp lại | Định dạng    | Nullable | Mô tả                                                       |
| --- | ---------------------------- | ------- | ------- | ------------ | -------- | ---------------------------------------------------------- |
| 1   | data                         | Object  | -       |              | -        | Dữ liệu xem trước                                          |
| 2   | →tekiyo_date                 | String  | -       | YYYY-MM-DD   | -        | Ngày áp dụng                                               |
| 3   | →total_pages                 | Number  | -       |              | -        | Tổng số chứng từ (số tổ hợp đại lý bán hàng + chi nhánh quản lý) |
| 4   | →reports                     | Array   | ○       |              | -        | Danh sách chứng từ (mã đại lý bán hàng tăng dần). 1 phần tử = 1 chứng từ |
| 5   | →→page_no                    | Number  | -       |              | -        | Số trang (bắt đầu từ 1)                                    |
| 6   | →→hanbaiten_id               | Number  | -       |              | -        | ID đại lý bán hàng                                         |
| 7   | →→hanbaiten_code             | String  | -       |              | -        | Mã đại lý bán hàng                                         |
| 8   | →→hanbaiten_name             | String  | -       |              | -        | Tên đại lý bán hàng (nơi nhận chứng từ「〇〇〇 新聞販売店 御中」) |
| 9   | →→hanbaiten_tel              | String  | -       |              | -        | Số điện thoại đại lý bán hàng (để trống là `""`)          |
| 10  | →→hanbaiten_fax              | String  | -       |              | -        | Số FAX đại lý bán hàng (để trống là `""`)                 |
| 11  | →→kanri_shiten_id            | Number  | -       |              | -        | ID chi nhánh quản lý                                       |
| 12  | →→kanri_shiten_name          | String  | -       |              | -        | Tên chi nhánh quản lý                                      |
| 13  | →→ja_name                    | String  | -       |              | -        | Tên JA (người gửi chứng từ「JA〇〇 + chi nhánh quản lý」) |
| 14  | →→tanto_name                 | String  | -       |              | -        | Tên người phụ trách (m_ja.tanto_name, để trống là `""`)   |
| 15  | →→tel                        | String  | -       |              | -        | TEL người gửi (số điện thoại chi nhánh quản lý m_kanri_shiten.tel) |
| 16  | →→fax                        | String  | -       |              | -        | FAX người gửi (số FAX chi nhánh quản lý m_kanri_shiten.fax) |
| 17  | →→zoubu                      | Array   | ○       |              | -        | Dữ liệu tăng số bản (`dokusya_busu > zenkai_dokusya_busu`) |
| 18  | →→→busu                      | String  | -       | {trước} → {sau} | -     | Số bản (`zenkai_dokusya_busu → dokusya_busu`)             |
| 19  | →→→address                   | String  | -       |              | -        | Địa chỉ giao hàng (tên tỉnh/thành + quận huyện xã + số nhà + tên tòa nhà) |
| 20  | →→→name                      | String  | -       |              | -        | Họ tên đăng ký mới (`shimei_sei` + `shimei_mei`)          |
| 21  | →→→delivery_name             | String  | -       |              | -        | Tên độc giả nơi giao hàng (`haitatsu_shimei_sei` + `haitatsu_shimei_mei`, để trống là `""`) |
| 22  | →→→phone                     | String  | -       |              | -        | Số điện thoại (`haitatsu_renrakusaki_1`, để trống là `""`) |
| 23  | →→→biko                      | String  | -       |              | -        | Ghi chú (ô nhập tay trên chứng từ. Giá trị mặc định `""`) |
| 24  | →→genbu                      | Array   | ○       |              | -        | Dữ liệu giảm số bản (`dokusya_busu < zenkai_dokusya_busu`) |
| 25  | →→→busu                      | String  | -       | {trước} → {sau} | -     | Số bản (`zenkai_dokusya_busu → dokusya_busu`)             |
| 26  | →→→address                   | String  | -       |              | -        | Địa chỉ giao hàng                                          |
| 27  | →→→name                      | String  | -       |              | -        | Họ tên ngừng đăng ký (`shimei_sei` + `shimei_mei`)        |
| 28  | →→→delivery_name             | String  | -       |              | -        | Tên độc giả nơi giao hàng (để trống là `""`)              |
| 29  | →→→phone                     | String  | -       |              | -        | Số điện thoại (để trống là `""`)                          |
| 30  | →→→biko                      | String  | -       |              | -        | Ghi chú (ô nhập tay. Giá trị mặc định `""`)               |
| 31  | →→address_change             | Array   | ○       |              | -        | Dữ liệu thay đổi địa chỉ (địa chỉ giao hàng lần trước ≠ địa chỉ giao hàng hiện tại) |
| 32  | →→→name                      | String  | -       |              | -        | Họ tên (`shimei_sei` + `shimei_mei`)                      |
| 33  | →→→delivery_name             | String  | -       |              | -        | Tên độc giả nơi giao hàng (để trống là `""`)              |
| 34  | →→→phone                     | String  | -       |              | -        | Số điện thoại (để trống là `""`)                          |
| 35  | →→→before_address            | String  | -       |              | -        | Địa chỉ trước thay đổi (địa chỉ giao hàng lần trước `zenkai_*`) |
| 36  | →→→after_address             | String  | -       |              | -        | Địa chỉ sau thay đổi (địa chỉ giao hàng hiện tại `haitatsu_*`) |
| 37  | →→→biko                      | String  | -       |              | -        | Ghi chú (ô nhập tay. Giá trị mặc định `""`)               |

## Ví dụ request (リクエスト例)

```
GET /api/v1/reports/zougen-hanbaiten/preview?tekiyo_date=2026-04-01&hanbaiten_ids=200,201&kanri_shiten_ids=20
```

## Ví dụ phản hồi thành công (レスポンス成功例)

```json
{
  "data": {
    "tekiyo_date": "2026-04-01",
    "total_pages": 1,
    "reports": [
      {
        "page_no": 1,
        "hanbaiten_id": 200,
        "hanbaiten_code": "H001",
        "hanbaiten_name": "A新聞店",
        "hanbaiten_tel": "09999999999",
        "hanbaiten_fax": "09999999999",
        "kanri_shiten_id": 20,
        "kanri_shiten_name": "A支所",
        "ja_name": "JA東京中央",
        "tanto_name": "農協太郎",
        "tel": "09999999999",
        "fax": "09999999999",
        "zoubu": [
          {
            "busu": "1 → 3",
            "address": "東京都千代田区丸の内1-1-1",
            "name": "農協太郎",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          },
          {
            "busu": "0 → 1",
            "address": "東京都千代田区大手町2-2-2",
            "name": "農協花子",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          }
        ],
        "genbu": [
          {
            "busu": "3 → 2",
            "address": "東京都千代田区神田3-3-3",
            "name": "農協次郎",
            "delivery_name": "",
            "phone": "09999999999",
            "biko": ""
          }
        ],
        "address_change": [
          {
            "name": "農協A郎",
            "delivery_name": "",
            "phone": "9999999999",
            "before_address": "東京都千代田区A町1-1",
            "after_address": "東京都千代田区B町2-2",
            "biko": ""
          }
        ]
      }
    ]
  }
}
```

## Ví dụ phản hồi thất bại (レスポンス失敗例)

### 400 Bad Request (Validation)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" }
  ]
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

### 403 Forbidden (Vi phạm DataScope)

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found (Không có dữ liệu đối tượng)

```json
{
  "error_code": "NO_TARGET_DATA",
  "message": "対象のデータが存在しません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Trình tự xử lý (処理手順)

### 4.1 Kiểm tra hợp lệ request (リクエストのバリデーション)

- Kiểm tra query parameter:
  - tekiyo_date: bắt buộc, định dạng ngày (YYYY-MM-DD). Trường hợp chưa nhập: HTTP 400 (`VALIDATION_ERROR`), thông báo「必須項目です。」(Trường bắt buộc.) (ACSMS-MSG-028-004)
  - hanbaiten_ids: tùy chọn, chuỗi số phân tách bằng dấu phẩy. Mỗi phần tử phải là kiểu số
  - kanri_shiten_ids: tùy chọn, chuỗi số phân tách bằng dấu phẩy. Mỗi phần tử phải là kiểu số
- Trường hợp lỗi validation: HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm tra xác thực・phân quyền (認証・認可チェック)

- Xác minh thông tin xác thực (phiên HTTP-only Cookie).
- Trường hợp chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `report.export_zougen_hanbaiten`
- Các role có quyền tương ứng: CHUOKAI (Trung ương hội) / JA_HONTEN (JA bản điếm) / JA_KANRI_SHITEN (JA chi nhánh quản lý)
- Trường hợp thiếu quyền: HTTP 403 (`FORBIDDEN`) (NICHINO_ADMIN / NICHINO_STAFF trả về 403 tại đây. Màn hình hiển thị ACSMS-MSG-028-001)
- DataScope:
  - Trung ương hội (CHUOKAI): dữ liệu thuộc các JA dưới trung ương hội của chính mình (`ja_id IN (danh sách JA thuộc trung ương hội)`)
  - JA bản điếm (JA_HONTEN): dữ liệu của JA của chính mình (`ja_id = :user_ja_id`)
  - JA chi nhánh quản lý (JA_KANRI_SHITEN): dữ liệu của JA của chính mình và chỉ chi nhánh quản lý của chính mình (`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`)
- Trường hợp `hanbaiten_ids` / `kanri_shiten_ids` được chỉ định có chứa bản ghi ngoài DataScope: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Thiết lập điều kiện lấy dữ liệu (データ取得条件の設定)

- Lấy scope của người dùng đăng nhập (role_code, ja_id, kanri_shiten_id).
- Điều kiện trích xuất:
  - `joho_henko_tekiyo_date = :tekiyo_date` (khớp ngày áp dụng)
  - `zougen_hokoku_flg = true` (cờ báo cáo tăng/giảm)
  - Điều kiện DataScope (như trên)
  - Khi chỉ định `hanbaiten_ids`: `hanbaiten_id IN (:hanbaiten_ids)`. Khi không chỉ định thì không lọc (toàn bộ đại lý bán hàng)
  - Khi chỉ định `kanri_shiten_ids`: `kanri_shiten_id IN (:kanri_shiten_ids)`. Khi không chỉ định thì không lọc (toàn bộ chi nhánh quản lý)
- Tên tỉnh/thành của địa chỉ giao hàng được lấy bằng cách join `m_todofuken` theo `haitatsu_todofuken_code`.

### 4.4 Lấy dữ liệu (データ取得)

```sql
SELECT
  r.dokusya_rireki_id,
  r.dokusya_id,
  r.hanbaiten_id,
  h.hanbaiten_code,
  h.hanbaiten_name,
  h.tel  AS hanbaiten_tel,
  h.fax  AS hanbaiten_fax,
  r.kanri_shiten_id,
  ks.kanri_shiten_name,
  ks.tel AS kanri_shiten_tel,
  ks.fax AS kanri_shiten_fax,
  j.ja_name,
  j.tanto_name,
  r.dokusya_busu,
  r.zenkai_dokusya_busu,
  r.shimei_sei,
  r.shimei_mei,
  r.haitatsu_shimei_sei,
  r.haitatsu_shimei_mei,
  r.haitatsu_renrakusaki_1,
  td.todofuken_name AS haitatsu_todofuken_name,
  r.haitatsu_shikuchoson,
  r.haitatsu_chome_banchi,
  r.haitatsu_tatemono_mei,
  ztd.todofuken_name AS zenkai_todofuken_name,
  r.zenkai_shikuchoson,
  r.zenkai_chome_banchi,
  r.zenkai_tatemono_mei
FROM t_dokusya_rireki r
INNER JOIN m_hanbaiten h
  ON h.hanbaiten_id = r.hanbaiten_id
  AND h.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
  ON ks.kanri_shiten_id = r.kanri_shiten_id
  AND ks.deleted_at IS NULL
INNER JOIN m_ja j
  ON j.ja_id = r.ja_id
  AND j.deleted_at IS NULL
LEFT JOIN m_todofuken td
  ON td.todofuken_code = r.haitatsu_todofuken_code
LEFT JOIN m_todofuken ztd
  ON ztd.todofuken_code = r.zenkai_todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  /* DataScope */
  AND r.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
  /* 出力条件（未指定時は条件を付与しない） */
  AND (:hanbaiten_ids IS NULL OR r.hanbaiten_id = ANY(:hanbaiten_ids))
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
ORDER BY h.hanbaiten_code ASC, ks.kanri_shiten_code ASC
```

- Trường hợp số bản ghi lấy được là 0: HTTP 404 (`NO_TARGET_DATA`), thông báo「対象のデータが存在しません。」(Không tồn tại dữ liệu đối tượng.) (ACSMS-MSG-028-002)

### 4.5 Nhóm・phân loại (グループ化・振り分け)

- Nhóm các bản ghi lấy được theo tổ hợp `hanbaiten_id + kanri_shiten_id` (1 nhóm = 1 chứng từ = 1 trang).
- Chứng từ sắp xếp theo mã đại lý bán hàng tăng dần, trong cùng một đại lý bán hàng thì theo mã chi nhánh quản lý tăng dần. Đánh số `page_no` bắt đầu từ 1, `total_pages` là tổng số nhóm.
- Trong mỗi nhóm, phân loại từng bản ghi vào các bảng theo điều kiện sau (cùng một bản ghi có thể đồng thời thuộc cả tăng/giảm số bản và thay đổi địa chỉ):
  - Tăng số bản (zoubu): `dokusya_busu > zenkai_dokusya_busu`
  - Giảm số bản (genbu): `dokusya_busu < zenkai_dokusya_busu`
  - Thay đổi địa chỉ (address_change): địa chỉ giao hàng lần trước (`zenkai_*`) và địa chỉ giao hàng hiện tại (`haitatsu_*`) khác nhau
- Thứ tự sắp xếp: ① hiển thị tăng số bản theo thứ tự tăng dần → ② hiển thị giảm số bản → ③ hiển thị thay đổi địa chỉ. Trường hợp mỗi danh mục có 0 bản ghi thì chỉ hiển thị tiêu đề và dòng trống (render ở phía FE).
- Định dạng:
  - `busu`: chuỗi dạng `{zenkai_dokusya_busu} → {dokusya_busu}`
  - `address` / `before_address` / `after_address`: nối tên tỉnh/thành + quận huyện xã + số nhà + tên tòa nhà
  - `name`: `shimei_sei` + `shimei_mei`
  - `delivery_name`: `haitatsu_shimei_sei` + `haitatsu_shimei_mei`
  - `phone`: `haitatsu_renrakusaki_1`
  - `biko`: luôn là `""` (ô nhập tay trên chứng từ. Không có nguồn dữ liệu)
  - `tel` / `fax` (người gửi): sử dụng giá trị của chi nhánh quản lý (`m_kanri_shiten`)

### 4.6 Tạo phản hồi (レスポンス生成)

- Trả về dữ liệu đã nhóm・định dạng dưới dạng đối tượng data. HTTP 200.
- ※ Vì API này là loại tham chiếu (GET) nên không ghi log thao tác (t_log).

### 4.7 Xử lý ngoại lệ (例外処理)

- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`) (ACSMS-MSG-028-003)

---

# API ACSMS-API-028-003

## Tổng quan (概要)

| Mục                       | Nội dung                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                   | Create Zougen Hanbaiten Report (PDF)                                                                                                                                                                                             |
| Tổng quan                 | Với điều kiện được chỉ định, tạo phiếu liên lạc tăng/giảm (đại lý bán hàng) dưới dạng chứng từ điện tử (PDF) và lưu vào S3. Đăng ký lịch sử tải xuống (t_file_download) và ghi log thao tác (t_log).                              |
| URI                       | /api/v1/reports/zougen-hanbaiten/export                                                                                                                                                                                          |
| Phương thức (メソッド)    | POST                                                                                                                                                                                                                            |
| Request body              | JSON                                                                                                                                                                                                                            |
| Request parameter         |                                                                                                                                                                                                                                 |
| Header                    | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie                                                                                                                                       |
| Mã phản hồi HTTP          | 201:Tạo chứng từ điện tử thành công, 400:Có lỗi trong nội dung nhập, 401:Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại, 403:Không có quyền truy cập màn hình này, 404:Không tồn tại dữ liệu đối tượng, 500:Lỗi hệ thống |

## Tham số request (リクエストパラメータ)

| #   | ID tham số        | Kiểu  | Lặp lại | Bắt buộc | Độ dài tối thiểu | Độ dài tối đa | Mô tả                                                                 |
| --- | ----------------- | ----- | ------- | -------- | ---------------- | ------------- | --------------------------------------------------------------------- |
| 1   | tekiyo_date       | String | -      | 〇       |                  |               | Ngày áp dụng (YYYY-MM-DD). Trường hợp chưa nhập → ACSMS-MSG-028-004    |
| 2   | hanbaiten_ids     | Array  | ○      | -        |                  |               | Mảng ID đại lý bán hàng. Khi không chỉ định thì lấy toàn bộ đại lý bán hàng trong DataScope |
| 3   | kanri_shiten_ids  | Array  | ○      | -        |                  |               | Mảng ID chi nhánh quản lý. Khi không chỉ định thì lấy toàn bộ chi nhánh quản lý trong DataScope |

## Dữ liệu phản hồi (レスポンスデータ)

| #   | ID mục            | Kiểu   | Lặp lại | Định dạng | Nullable | Mô tả                                      |
| --- | ----------------- | ------ | ------- | --------- | -------- | ------------------------------------------ |
| 1   | data              | Object | -       |           | -        | Thông tin chứng từ điện tử đã tạo          |
| 2   | →file_download_id | Number | -       |           | -        | ID tải xuống tập tin                       |
| 3   | →file_name        | String | -       |           | -        | Tên tập tin (増減連絡票_販売店_{YYYY年MM月DD日}.pdf) |
| 4   | →download_type    | Number | -       |           | -        | Loại tải xuống ※ Tham chiếu m_code.code_category='DOWNLOAD_TYPE' (3:phiếu liên lạc tăng/giảm) |
| 5   | →record_count     | Number | -       |           | -        | Số bản ghi đối tượng                       |
| 6   | →file_size        | Number | -       |           | -        | Kích thước tập tin (byte)                  |
| 7   | →download_url     | String | -       |           | -        | URL có chữ ký để tải xuống (hiệu lực 1 giờ) |
| 8   | →created_at       | String | -       | ISO8601   | -        | Ngày giờ tạo                               |

## Ví dụ request (リクエスト例)

```json
POST /api/v1/reports/zougen-hanbaiten/export
Content-Type: application/json

{
  "tekiyo_date": "2026-04-01",
  "hanbaiten_ids": [200, 201],
  "kanri_shiten_ids": [20]
}
```

## Ví dụ phản hồi thành công (レスポンス成功例)

```json
{
  "data": {
    "file_download_id": 5001,
    "file_name": "増減連絡票_販売店_2026年04月01日.pdf",
    "download_type": 3,
    "record_count": 4,
    "file_size": 245760,
    "download_url": "https://s3.ap-northeast-1.amazonaws.com/agrinews-prod/reports/ja-1/zougen_hanbaiten_20260401_103000.pdf?X-Amz-Signature=...",
    "created_at": "2026-04-01T10:30:00+09:00"
  }
}
```

## Ví dụ phản hồi thất bại (レスポンス失敗例)

### 400 Bad Request (Validation)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" }
  ]
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

### 403 Forbidden (Vi phạm DataScope)

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found (Không có dữ liệu đối tượng)

```json
{
  "error_code": "NO_TARGET_DATA",
  "message": "対象のデータが存在しません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## Trình tự xử lý (処理手順)

> ※ Bước 4.5 Đăng ký lịch sử tải xuống và bước 4.6 Ghi log thao tác được thực hiện trong cùng một transaction.
> Nếu bất kỳ bước nào thất bại thì rollback toàn bộ.
> Log lỗi trong quá trình xử lý ngoại lệ (log_type=3) được ghi riêng bên ngoài transaction.
> ※ Việc tải tập tin lên S3 (4.4) phải hoàn tất trước khi bắt đầu transaction, và nếu đăng ký DB thất bại thì
> phải xóa object đã tải lên (xử lý bù trừ / compensation).

### 4.1 Kiểm tra hợp lệ request (リクエストのバリデーション)

- Kiểm tra request body:
  - tekiyo_date: bắt buộc, định dạng ngày (YYYY-MM-DD). Trường hợp chưa nhập: HTTP 400 (`VALIDATION_ERROR`), thông báo「必須項目です。」(Trường bắt buộc.) (ACSMS-MSG-028-004)
  - hanbaiten_ids: tùy chọn, mảng số
  - kanri_shiten_ids: tùy chọn, mảng số
- Trường hợp lỗi validation: HTTP 400 (`VALIDATION_ERROR`) + mảng errors

### 4.2 Kiểm tra xác thực・phân quyền (認証・認可チェック)

- Xác minh thông tin xác thực (phiên HTTP-only Cookie).
- Trường hợp chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền cần thiết: `report.export_zougen_hanbaiten`
- Các role có quyền tương ứng: CHUOKAI (Trung ương hội) / JA_HONTEN (JA bản điếm) / JA_KANRI_SHITEN (JA chi nhánh quản lý)
- Trường hợp thiếu quyền: HTTP 403 (`FORBIDDEN`) (NICHINO_ADMIN / NICHINO_STAFF trả về 403 tại đây. Màn hình hiển thị ACSMS-MSG-028-001)
- DataScope:
  - Trung ương hội (CHUOKAI): dữ liệu thuộc các JA dưới trung ương hội của chính mình (`ja_id IN (danh sách JA thuộc trung ương hội)`)
  - JA bản điếm (JA_HONTEN): dữ liệu của JA của chính mình (`ja_id = :user_ja_id`)
  - JA chi nhánh quản lý (JA_KANRI_SHITEN): dữ liệu của JA của chính mình và chỉ chi nhánh quản lý của chính mình (`ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id`)
- Trường hợp `hanbaiten_ids` / `kanri_shiten_ids` được chỉ định có chứa bản ghi ngoài DataScope: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Lấy dữ liệu (データ取得)

- Trích xuất・nhóm・định dạng dữ liệu theo cùng logic với「4.3 〜 4.5」của API-028-002.
- Trường hợp số bản ghi lấy được là 0: HTTP 404 (`NO_TARGET_DATA`) (ACSMS-MSG-028-002). Không tạo tập tin.

### 4.4 Tạo chứng từ điện tử (PDF)・lưu S3 (電子帳票（PDF）生成・S3保存)

- Tạo PDF khổ A4 từ dữ liệu đã nhóm bằng Handlebars template → HTML → Puppeteer (1 nhóm = 1 trang, header có `Page：trang hiện tại/tổng số`).
- Tên tập tin: `増減連絡票_販売店_{YYYY年MM月DD日}.pdf` (dựa trên `tekiyo_date`)
- Lưu vào S3 (key: `reports/ja-{ja_id}/zougen_hanbaiten_{YYYYMMDD_HHmmss}.pdf`).
- Lưu giữ file_size (số byte), record_count (số bản ghi đối tượng).

### 4.5 Đăng ký lịch sử tải xuống (ダウンロード履歴登録)

- Thực thi SQL sau để đăng ký vào `t_file_download`.

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size, record_count,
                            target_month, created_at, created_by)
VALUES (:ja_id, NOW(), 3,
        :file_name, :file_path, :file_size, :record_count,
        :target_month, NOW(), :user_account_id)
RETURNING *
```

- `download_type = 3` (phiếu liên lạc tăng/giảm ※ m_code.code_category='DOWNLOAD_TYPE')
- `target_month`: thiết lập năm tháng của ngày áp dụng (YYYYMM).

### 4.6 Ghi log thao tác (操作ログ記録)

- Thực thi SQL sau để ghi log thao tác.

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (4, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'CREATE', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `log_type = 4` (thao tác tập tin ※ m_code.code_category='LOG_TYPE')
- `operation`: `'CREATE'` (tạo mới tập tin chứng từ)

**Ví dụ after_value:**

```json
`before_value`：新規生成のため空文字列を設定する。
`after_value`：登録されたダウンロード履歴をJSON形式で格納する。機密情報は含めないこと。

{
  "file_download_id": 5001,
  "ja_id": 1,
  "download_type": 3,
  "file_name": "増減連絡票_販売店_2026年04月01日.pdf",
  "file_size": 245760,
  "record_count": 4,
  "target_month": "202604"
}
```

> Diễn giải: `before_value` → thiết lập chuỗi rỗng vì là tạo mới. `after_value` → lưu lịch sử tải xuống đã đăng ký dưới dạng JSON. Không bao gồm thông tin nhạy cảm.

### 4.7 Tạo phản hồi (レスポンス生成)

- Tạo URL có chữ ký của S3 (hiệu lực 1 giờ) và trả về thông tin chứng từ điện tử đã đăng ký dưới dạng đối tượng data. HTTP 201.

### 4.8 Xử lý ngoại lệ (例外処理)

- Trường hợp lỗi kết nối DB, v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`) (ACSMS-MSG-028-003)
- Khi xảy ra lỗi cũng ghi log thao tác (`log_type = 3`, ghi bên ngoài transaction).
- Trường hợp đã tải lên S3 nhưng đăng ký DB thất bại thì xóa object đã tải lên (xử lý bù trừ / compensation).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'CREATE', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
