---
customer_name: 日本農業新聞様 (Khách hàng Nông nghiệp Nhật Bản)
system_name: クラウド版購読者管理システム (Hệ thống quản lý độc giả phiên bản Cloud)
document_name: API設計書 (Tài liệu thiết kế API)
screen_id: ACSMS-SCR-029
screen_name: 増減通知（日本農業新聞）出力画面 (Màn hình xuất thông báo tăng/giảm (Nông nghiệp Nhật Bản))
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-05
created_date: 2026/06/05
created_by: Nguyen Truong An
updated_date: 2026/06/05
updated_by: Nguyen Truong An
---

## Lịch sử thay đổi (変更履歴)

| No  | Ngày phát hành | Phiên bản | Người phụ trách  | Nội dung thay đổi      | Người xác nhận | Người phê duyệt |
| --- | -------------- | --------- | ---------------- | ---------------------- | -------------- | --------------- |
| 1   | 2026/06/05     | 1.0       | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat  |

## Tổng quan hệ thống (システム概要)

Hệ thống này là hệ thống quản lý độc giả phiên bản Cloud dành cho JA, cung cấp các chức năng
quản lý thông tin độc giả, quản lý lịch sử đặt mua, quản lý dữ liệu chuyển khoản tự động (口座振替), v.v.

Các chức năng chính bao gồm: đăng ký・cập nhật・tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt mua, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên・tải xuống tệp, quản lý thông báo của hệ thống, v.v.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của người dùng,
ghi lại lịch sử đăng nhập, ghi lại nhật ký thao tác của người dùng.

## Mục đích tài liệu (資料目的)

Tài liệu mô tả chi tiết các API được tạo mới trên hệ thống tại
「Màn hình xuất thông báo tăng/giảm (Nông nghiệp Nhật Bản) (ACSMS-SCR-029)」.

Màn hình này trích xuất các độc giả có biến động số bộ đặt mua (増減) tại ngày áp dụng (適用日) được chỉ định,
nhóm theo đơn vị chi nhánh quản lý (管理支店 — mỗi chi nhánh quản lý 1 báo cáo), hiển thị xem trước (preview)
dưới dạng bảng「Ủy thác (委託) / Mã cửa hàng / Tên cửa hàng / Số bộ hiện tại / Số bộ tăng / Số bộ giảm / Số bộ mới」,
và xuất thành chứng từ điện tử (PDF) gửi cho Nông nghiệp Nhật Bản. Sau khi xuất, hệ thống lưu lên S3 và
tự động gửi email thông báo cho người phụ trách của Nichino (日農担当者).
Tài khoản Nichino (NICHINO_ADMIN / NICHINO_STAFF) không thể sử dụng chức năng này; chỉ các vai trò thuộc JA
(Trung ương hội・JA bản điếm・JA chi nhánh quản lý) mới được phép sử dụng.

## Tài liệu liên quan (関連資料)

| No  | Mã tài liệu          | Tên tài liệu                                                                                          |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — Nơi định nghĩa: ACSMS-SCR-024       |

※ Checkbox「Chi nhánh quản lý (管理支店)」trong khu vực điều kiện xuất của màn hình này sử dụng API dùng chung sau (không tạo API mới).

- **Checkbox chi nhánh quản lý**: sử dụng `ACSMS-API-COMMON-004` (lọc theo kiểu cascade) với `ja_id` của người dùng đang gọi.
  Việc giới hạn vai trò JA chi nhánh quản lý chỉ thấy phần chi nhánh quản lý của mình được **bắt buộc ở phía server**
  thông qua DataScope của API preview／xuất (`r.kanri_shiten_id = :user_kanri_shiten_id`). Nếu không chọn thì lấy
  toàn bộ chi nhánh quản lý trong phạm vi (scope).

## Danh sách lỗi (エラー一覧)

| #   | Loại lỗi (エラータイプ) | Mã lỗi                | Thông báo lỗi (giữ nguyên chuỗi hệ thống)                              | Ghi chú  |
| --- | ----------------------- | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通 (Chung)            | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通 (Chung)            | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通 (Chung)            | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通 (Chung)            | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通 (Chung)            | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 6   | 共通 (Chung)            | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通 (Chung)            | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 8   | 画面固有 (Riêng màn hình) | NO_REPORT_DATA      | 対象のデータが存在しません。                                           | HTTP 404 |

※ ACSMS-MSG-029-001「この機能はJAアカウントのみ使用できます。」là thông báo hiển thị khi route guard (FE)
chặn NICHINO_ADMIN / NICHINO_STAFF. Phía API trả về `FORBIDDEN` (HTTP 403) do không sở hữu quyền
`report.export_zougen_nichino` (phòng thủ nhiều lớp).

※ ACSMS-MSG-029-004「必須項目です。」được trả về dưới dạng `VALIDATION_ERROR` (`errors[].field = "tekiyo_date"`) khi không nhập ngày áp dụng.

※ ACSMS-MSG-029-002「対象のデータが存在しません。」tương ứng với `NO_REPORT_DATA` (HTTP 404).

※ ACSMS-MSG-029-003「システムエラーが発生しました。しばらくしてから再度お試しください。」tương ứng với `INTERNAL_SERVER_ERROR` (HTTP 500).

※ ACSMS-MSG-029-005「増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？」là thông báo của hộp thoại xác nhận (FE) khi nhấn nút tạo chứng từ điện tử; không phát sinh xử lý phía API.

---

# API ACSMS-API-029-001

## Tổng quan (概要)

| Mục                       | Nội dung                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                   | Get Zougen Nichino Report Preview                                                                                                                                                                                                        |
| Tổng quan                 | Trích xuất dữ liệu đối tượng tăng/giảm theo điều kiện ngày áp dụng・chi nhánh quản lý được chỉ định, nhóm theo đơn vị chi nhánh quản lý (mỗi chi nhánh 1 báo cáo) và lấy dữ liệu preview cho bảng「委託 / 販売店コード / 販売店名 / 現在部数 / 増部数 / 減部数 / 新部数」 |
| URI                       | /api/v1/report/zougen-nichino/preview                                                                                                                                                                                                    |
| Phương thức (メソッド)    | GET                                                                                                                                                                                                                                      |
| Request body              | Không có                                                                                                                                                                                                                                |
| Request parameter         | Query parameter                                                                                                                                                                                                                          |
| Header (ヘッダ)           | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie                                                                                                                                              |
| Mã HTTP Response          | 200: Lấy dữ liệu preview thành công, 400: Giá trị nhập không hợp lệ, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tồn tại dữ liệu đối tượng, 500: Lỗi hệ thống |

## Request parameter (リクエストパラメータ)

| #   | ID tham số      | Kiểu   | Lặp lại | Bắt buộc | Min | Max | Mô tả                                                                                                                                            |
| --- | --------------- | ------ | ------- | -------- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String | -       | 〇       |     |     | Ngày áp dụng (YYYY-MM-DD). Trích xuất bản ghi khớp với `t_dokusya_rireki.joho_henko_tekiyo_date`. Khi không nhập → `VALIDATION_ERROR` (ACSMS-MSG-029-004) |
| 2   | kanri_shiten_id | Number | 〇      | -        |     |     | ID chi nhánh quản lý (có thể chỉ định lặp: `kanri_shiten_id=20&kanri_shiten_id=21`). Khi không chỉ định → lấy toàn bộ chi nhánh quản lý trong phạm vi |

## Dữ liệu response (レスポンスデータ)

| #   | ID mục              | Kiểu    | Lặp lại | Định dạng  | Nullable | Mô tả                                                                                                       |
| --- | ------------------- | ------- | ------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | data                | Object  | -       |            | -        | Kết quả preview                                                                                              |
| 2   | →tekiyo_date        | String  | -       | YYYY-MM-DD | -        | Ngày áp dụng (echo lại từ request)                                                                           |
| 3   | →reports            | Array   | 〇      |            | -        | Dữ liệu chứng từ theo từng chi nhánh quản lý (sắp xếp tăng dần theo mã chi nhánh quản lý; mỗi phần tử = 1 báo cáo) |
| 4   | →→kanri_shiten_id   | Number  | -       |            | -        | ID chi nhánh quản lý                                                                                         |
| 5   | →→kanri_shiten_code | String  | -       |            | -        | Mã chi nhánh quản lý (trên chứng từ hiển thị 10 ký tự dạng 3-4-3 ngăn cách bởi dấu gạch ngang. VD: 999-9999-999) |
| 6   | →→kanri_shiten_name | String  | -       |            | -        | Tên chi nhánh quản lý                                                                                        |
| 7   | →→ja_name           | String  | -       |            | -        | Tên JA (hiển thị tại「組合名」trên header chứng từ)                                                          |
| 8   | →→todofuken_name    | String  | -       |            | -        | Tên tỉnh/thành (tỉnh của chi nhánh quản lý. Hiển thị tại「都道府県名」trên header chứng từ)                  |
| 9   | →→tanto_busho       | String  | -       |            | -        | Tên bộ phận phụ trách (của JA. Trống là `""`)                                                                |
| 10  | →→tanto_name        | String  | -       |            | -        | Tên người phụ trách (của JA. Trống là `""`)                                                                  |
| 11  | →→tel               | String  | -       |            | -        | Số điện thoại (TEL chi nhánh quản lý. Trống là `""`)                                                         |
| 12  | →→fax               | String  | -       |            | -        | Số FAX (FAX chi nhánh quản lý. Trống là `""`)                                                                |
| 13  | →→rows              | Array   | 〇      |            | -        | Danh sách dòng chi tiết (sắp xếp tăng dần theo mã cửa hàng)                                                  |
| 14  | →→→hanbaiten_id     | Number  | -       |            | -        | ID cửa hàng bán                                                                                              |
| 15  | →→→itaku_label      | String  | -       |            | -        | Hiển thị cột ủy thác. Nếu phân loại ủy thác là「Ủy thác Nichino」(`itaku_kubun=2`) thì hiển thị「委託」, còn lại (振込/その他) là `""` ※Tham chiếu m_code.code_category='ITAKU_KUBUN' (1:振込, 2:日農委託, 9:その他) |
| 16  | →→→hanbaiten_code   | String  | -       |            | -        | Mã cửa hàng bán                                                                                              |
| 17  | →→→hanbaiten_name   | String  | -       |            | -        | Tên cửa hàng bán (cửa hàng miễn thuế = số đăng ký phát hành hóa đơn đủ điều kiện trống → thêm tiền tố「（免）」) |
| 18  | →→→genzai_busu      | Number  | -       |            | -        | Số bộ hiện tại (số bộ đặt mua lần trước `zenkai_dokusya_busu`. NULL được xử lý như 0)                        |
| 19  | →→→zou_busu         | Number  | -       |            | -        | Số bộ tăng (nếu `dokusya_busu > số bộ hiện tại` thì `dokusya_busu - 現在部数`, ngược lại là 0)              |
| 20  | →→→gen_busu         | Number  | -       |            | -        | Số bộ giảm (nếu `dokusya_busu < số bộ hiện tại` thì `現在部数 - dokusya_busu`, ngược lại là 0). Trên chứng từ thêm「▲」(VD: giảm 2 bộ → ▲2) |
| 21  | →→→shin_busu        | Number  | -       |            | -        | Số bộ mới (số bộ đặt mua `dokusya_busu`. = Số bộ hiện tại + Số bộ tăng − Số bộ giảm)                         |
| 22  | →→→diff_mark        | Boolean | -       |            | -        | Dấu chênh lệch so với lần xuất trước. Dòng có chênh lệch so với giá trị tại thời điểm xuất trước là `true` (trên chứng từ thêm「◆」) |
| 23  | →→total             | Object  | -       |            | -        | Dòng tổng (tổng toàn bộ cửa hàng trong chi nhánh quản lý đó)                                                 |
| 24  | →→→genzai_busu      | Number  | -       |            | -        | Tổng số bộ hiện tại                                                                                          |
| 25  | →→→zou_busu         | Number  | -       |            | -        | Tổng số bộ tăng                                                                                              |
| 26  | →→→gen_busu         | Number  | -       |            | -        | Tổng số bộ giảm                                                                                              |
| 27  | →→→shin_busu        | Number  | -       |            | -        | Tổng số bộ mới                                                                                               |

## Ví dụ request (リクエスト例)

```
GET /api/v1/report/zougen-nichino/preview?tekiyo_date=2026-03-01&kanri_shiten_id=20&kanri_shiten_id=21
```

## Ví dụ response thành công (レスポンス成功例)

```json
{
  "data": {
    "tekiyo_date": "2026-03-01",
    "reports": [
      {
        "kanri_shiten_id": 20,
        "kanri_shiten_code": "1AA-3300-001",
        "kanri_shiten_name": "本店管理支店",
        "ja_name": "JA東京中央",
        "todofuken_name": "東京都",
        "tanto_busho": "業務部",
        "tanto_name": "農協 太郎",
        "tel": "03-1234-5678",
        "fax": "03-1234-5679",
        "rows": [
          {
            "hanbaiten_id": 200,
            "itaku_label": "委託",
            "hanbaiten_code": "12345678",
            "hanbaiten_name": "（免）A販売店",
            "genzai_busu": 10,
            "zou_busu": 0,
            "gen_busu": 1,
            "shin_busu": 9,
            "diff_mark": false
          },
          {
            "hanbaiten_id": 201,
            "itaku_label": "委託",
            "hanbaiten_code": "12345679",
            "hanbaiten_name": "A販売店",
            "genzai_busu": 10,
            "zou_busu": 1,
            "gen_busu": 1,
            "shin_busu": 10,
            "diff_mark": true
          },
          {
            "hanbaiten_id": 202,
            "itaku_label": "",
            "hanbaiten_code": "12345680",
            "hanbaiten_name": "B販売店",
            "genzai_busu": 1,
            "zou_busu": 0,
            "gen_busu": 0,
            "shin_busu": 1,
            "diff_mark": false
          }
        ],
        "total": {
          "genzai_busu": 21,
          "zou_busu": 1,
          "gen_busu": 2,
          "shin_busu": 20
        }
      }
    ]
  }
}
```

## Ví dụ response thất bại (レスポンス失敗例)

### 400 Validation Error (Chưa nhập ngày áp dụng)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 404 Not Found (Không có dữ liệu đối tượng)

```json
{
  "error_code": "NO_REPORT_DATA",
  "message": "対象のデータが存在しません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Trình tự xử lý (処理手順)

### 4.1 Kiểm tra hợp lệ request (リクエストのバリデーション)

- Kiểm tra query parameter:
  - tekiyo_date: kiểm tra bắt buộc (khi không nhập → HTTP 400 `VALIDATION_ERROR`, `errors[].field = "tekiyo_date"`, thông báo「必須項目です。」= ACSMS-MSG-029-004). Định dạng ngày hợp lệ (YYYY-MM-DD)
  - kanri_shiten_id: kiểu số (có thể chỉ định lặp). Có thể không chỉ định
- Khi tham số không hợp lệ: HTTP 400 (`BAD_REQUEST`) hoặc HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm tra xác thực・phân quyền (認証・認可チェック)

- Xác minh thông tin xác thực (phiên HTTP-only Cookie).
- Nếu chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền yêu cầu: `report.export_zougen_nichino`
- Vai trò sở hữu quyền tương ứng: CHUOKAI (Trung ương hội), JA_HONTEN (JA bản điếm), JA_KANRI_SHITEN (JA chi nhánh quản lý)
  - ※ NICHINO_ADMIN / NICHINO_STAFF không sở hữu quyền này nên trả về HTTP 403 (`FORBIDDEN`). Route guard phía FE hiển thị ACSMS-MSG-029-001.
- Nếu thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`: `r.ja_id = :user_ja_id` (chỉ phần Trung ương hội của mình)
  - `JA_HONTEN`: `r.ja_id = :user_ja_id` (chỉ phần JA của mình)
  - `JA_KANRI_SHITEN`: `r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id` (chỉ phần chi nhánh quản lý của mình)
- Nếu vi phạm DataScope (truy cập dữ liệu của JA khác・chi nhánh quản lý khác): HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Thiết lập điều kiện lấy dữ liệu (データ取得条件の設定)

- Lấy scope của người dùng đăng nhập (role_code, ja_id, kanri_shiten_id).
- Thiết lập điều kiện trích xuất:
  - `r.joho_henko_tekiyo_date = :tekiyo_date` (khớp với ngày áp dụng trên màn hình)
  - `r.zougen_hokoku_flg = true` (thay đổi thuộc đối tượng báo cáo tăng/giảm)
  - `h.haiten_flg = false` (loại trừ cửa hàng đã đóng・cửa hàng giả phiên bản điện tử)
  - Khi chỉ định kanri_shiten_id: `r.kanri_shiten_id = ANY(:kanri_shiten_ids)`
  - Thêm điều kiện DataScope (xem 4.2).

### 4.4 Lấy số lượng dữ liệu (データ件数の取得)

- Lấy số lượng bản ghi đối tượng khớp với điều kiện trích xuất.
- Nếu 0 bản ghi: HTTP 404 (`NO_REPORT_DATA`) (ACSMS-MSG-029-002「対象のデータが存在しません。」).

### 4.5 Lấy dữ liệu (データ取得)

```sql
SELECT r.dokusya_rireki_id,
       r.hanbaiten_id, r.kanri_shiten_id,
       COALESCE(r.zenkai_dokusya_busu, 0) AS genzai_busu,
       r.dokusya_busu,
       h.hanbaiten_code, h.hanbaiten_name, h.itaku_kubun, h.torihikisaki_no,
       ks.kanri_shiten_code, ks.kanri_shiten_name,
       ks.tel AS kanri_shiten_tel, ks.fax AS kanri_shiten_fax,
       td.todofuken_name,
       j.ja_name, j.tanto_busho, j.tanto_name
FROM t_dokusya_rireki r
INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
INNER JOIN m_kanri_shiten ks
        ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
INNER JOIN m_ja j
        ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
LEFT JOIN m_todofuken td
        ON td.todofuken_code = ks.todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  AND h.haiten_flg = false
  /* Lọc chi nhánh quản lý (tùy chọn) */
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* Loại trừ bản ghi có Số bộ hiện tại = 0 VÀ Số bộ mới = 0 */
  AND NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)
  /* DataScope: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN */
  AND r.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY ks.kanri_shiten_code ASC, h.hanbaiten_code ASC
```

### 4.6 Tạo response (レスポンス生成)

- Nhóm các bản ghi lấy được theo ID chi nhánh quản lý (mảng `reports`. Sắp xếp tăng dần theo mã chi nhánh quản lý. Mỗi phần tử = 1 báo cáo).
- Định dạng từng dòng chi tiết theo điều kiện sau:
  - **Số bộ hiện tại** (`genzai_busu`): `COALESCE(zenkai_dokusya_busu, 0)`
  - **Số bộ tăng** (`zou_busu`): nếu `dokusya_busu > genzai_busu` thì `dokusya_busu - genzai_busu`, ngược lại là 0
  - **Số bộ giảm** (`gen_busu`): nếu `dokusya_busu < genzai_busu` thì `genzai_busu - dokusya_busu`, ngược lại là 0 (trên chứng từ thêm「▲」)
  - **Số bộ mới** (`shin_busu`): `dokusya_busu` (= Số bộ hiện tại + Số bộ tăng − Số bộ giảm)
  - **Cột ủy thác** (`itaku_label`): nếu `itaku_kubun = 2` (Ủy thác Nichino) thì「委託」, còn lại (1:振込 / 9:その他) là `""`
  - **Tên cửa hàng** (`hanbaiten_name`): nếu số đăng ký phát hành hóa đơn đủ điều kiện (`torihikisaki_no`) là chuỗi trống thì coi là cửa hàng miễn thuế, thêm tiền tố「（免）」
  - **Dấu chênh lệch** (`diff_mark`): dòng có chênh lệch so với lần xuất trước (giá trị của cùng chi nhánh quản lý・cùng cửa hàng trong lịch sử xuất gần nhất) là `true`. Nếu không có lần xuất trước thì `false`
- Thiết lập `total` của từng chi nhánh quản lý bằng tổng `genzai_busu` / `zou_busu` / `gen_busu` / `shin_busu` trong chi nhánh quản lý đó.
- Để dùng cho header chứng từ, trả về: mã chi nhánh quản lý (`kanri_shiten_code`), tên JA (`ja_name`), tên tỉnh/thành (`todofuken_name`), bộ phận phụ trách (`tanto_busho`), người phụ trách (`tanto_name`), TEL (chi nhánh quản lý), FAX (chi nhánh quản lý).
- Trả về JSON chứa object data. HTTP 200.

### 4.7 Xử lý ngoại lệ (例外処理)

- Khi lỗi kết nối DB v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`) (ACSMS-MSG-029-003).
- API này chỉ tham chiếu nên không ghi nhật ký thao tác (t_log).

---

# API ACSMS-API-029-002

## Tổng quan (概要)

| Mục                       | Nội dung                                                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên API                   | Export Zougen Nichino Report (PDF)                                                                                                                                                                                                                 |
| Tổng quan                 | Trích xuất dữ liệu đối tượng tăng/giảm với cùng điều kiện như preview, tạo chứng từ điện tử PDF (mỗi chi nhánh quản lý 1 tờ) lưu lên S3, tự động gửi email thông báo cho người phụ trách Nichino, và trả về tệp tải xuống                            |
| URI                       | /api/v1/report/zougen-nichino/export                                                                                                                                                                                                               |
| Phương thức (メソッド)    | POST                                                                                                                                                                                                                                               |
| Request body              | JSON                                                                                                                                                                                                                                              |
| Request parameter         |                                                                                                                                                                                                                                                   |
| Header (ヘッダ)           | Content-Type: application/json  ※ Thông tin xác thực được gửi tự động qua HTTP-only Cookie                                                                                                                                                        |
| Mã HTTP Response          | 200: Xuất chứng từ điện tử thành công, 400: Giá trị nhập không hợp lệ, 401: Phiên đã hết hạn. Vui lòng đăng nhập lại, 403: Không có quyền truy cập màn hình này, 404: Không tồn tại dữ liệu đối tượng, 500: Lỗi hệ thống |

## Request parameter (リクエストパラメータ)

| #   | ID tham số       | Kiểu   | Lặp lại | Bắt buộc | Min | Max  | Mô tả                                                                                |
| --- | ---------------- | ------ | ------- | -------- | --- | ---- | ----------------------------------------------------------------------------------- |
| 1   | tekiyo_date      | String | -       | 〇       |     |      | Ngày áp dụng (YYYY-MM-DD). Khi không nhập → `VALIDATION_ERROR` (ACSMS-MSG-029-004)   |
| 2   | kanri_shiten_id  | Number | 〇      | -        |     |      | ID chi nhánh quản lý (mảng). Khi không chỉ định → lấy toàn bộ chi nhánh quản lý trong phạm vi |
| 3   | remarks          | Array  | 〇      | -        |     |      | Ghi chú theo từng chi nhánh quản lý đã nhập ở preview. Có thể không chỉ định         |
| 4   | →kanri_shiten_id | Number | -       | -        |     |      | ID chi nhánh quản lý đối tượng                                                       |
| 5   | →biko            | String | -       | -        | 0   | 1000 | Văn bản ghi chú in vào cột「＜備考＞」của chứng từ chi nhánh quản lý đó               |

## Dữ liệu response (レスポンスデータ)

Tệp PDF (`Content-Type: application/pdf`). Khi đối tượng có nhiều chi nhánh quản lý → ZIP gộp PDF của từng chi nhánh (`Content-Type: application/zip`).

### Header response (レスポンスヘッダ)

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_nichino_KANRISHITENCODE_YYYYMMDD.pdf"
```

※ Tên tệp dựa trên mã chi nhánh quản lý・ngày áp dụng (VD: mã chi nhánh quản lý `1AA-3300-001`・ngày áp dụng 2026-03-01 →
  tên hiển thị `増減通知_1AA-3300-001_20260301.pdf`).
  Khi đối tượng chỉ có 1 chi nhánh quản lý → trả về PDF đó; khi có nhiều chi nhánh → trả về ZIP gộp các PDF
  (tên hiển thị `増減通知_20260301.zip`).
  `filename` trong `Content-Disposition` đặt tên thay thế ASCII, `filename*` (RFC 5987) đặt tên tiếng Nhật
  (thực tế là tên ASCII có chứa mã chi nhánh quản lý).

### Bố cục PDF (PDFレイアウト)

| Khu vực            | Nội dung hiển thị                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Header (trái)      | 日本農業新聞社 業務管理部 / TEL / FAX (thông tin đơn vị phát hành cố định)                                               |
| Header (giữa)      | Tiêu đề「日本農業新聞増減通知」                                                                                          |
| Header (phải)      | Ngày giờ xuất / Số trang (`Page: trang hiện tại/tổng số trang`)                                                          |
| Tiêu đề con        | Ngày áp dụng (`YYYY年M月D日より`) / Tên tỉnh thành / Tên tổ hợp (mã chi nhánh quản lý(3-4-3): tên JA＋tên chi nhánh quản lý) / Bộ phận phụ trách ／ Người phụ trách / TEL / FAX |
| Bảng chi tiết      | 委託 / 販売店コード / 販売店名 / 現在部数 / 増部数 / 減部数 / 新部数 (sắp xếp tăng dần theo mã cửa hàng)                  |
| Dòng tổng          | Hiển thị tổng toàn bộ cửa hàng ở cuối bảng                                                                               |
| Ghi chú            | Cột「＜備考＞」(in `remarks` từ request)                                                                                 |

※ Cột ủy thác chỉ「委託」với cửa hàng「Ủy thác Nichino」, 振込・その他 để trống. Cửa hàng miễn thuế thêm「（免）」trước tên cửa hàng.
  Số bộ giảm có「▲」, dòng có chênh lệch so với lần xuất trước thêm「◆」. Mỗi chi nhánh quản lý 1 tờ (ngắt trang).

## Ví dụ request (リクエスト例)

```json
POST /api/v1/report/zougen-nichino/export
Content-Type: application/json

{
  "tekiyo_date": "2026-03-01",
  "kanri_shiten_id": [20, 21],
  "remarks": [
    { "kanri_shiten_id": 20, "biko": "3月度分の増減通知です。" }
  ]
}
```

## Ví dụ response thành công (レスポンス成功例)

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_nichino_1AA-3300-001_20260301.pdf"; filename*=UTF-8''zougen_nichino_1AA-3300-001_20260301.pdf

(PDF binary)
```

## Ví dụ response thất bại (レスポンス失敗例)

### 400 Validation Error (Chưa nhập ngày áp dụng)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 404 Not Found (Không có dữ liệu đối tượng)

```json
{
  "error_code": "NO_REPORT_DATA",
  "message": "対象のデータが存在しません。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## Trình tự xử lý (処理手順)

> ※ 4.6 Đăng ký lịch sử tải xuống và 4.7 Ghi nhật ký thao tác được thực hiện trong cùng một transaction.
> Nếu bất kỳ bước nào thất bại thì phải rollback toàn bộ.
> Nhật ký lỗi (log_type=3) trong xử lý ngoại lệ được ghi riêng ngoài transaction.
> Lưu ý: việc lưu PDF lên S3 (4.4) và gửi email thông báo cho người phụ trách Nichino (4.5) là I/O bên ngoài
> nên thực hiện ngoài transaction, hoàn tất trước khi đăng ký DB (4.6/4.7).

### 4.1 Kiểm tra hợp lệ request (リクエストのバリデーション)

- Kiểm tra request body:
  - tekiyo_date: kiểm tra bắt buộc (khi không nhập → HTTP 400 `VALIDATION_ERROR`, `errors[].field = "tekiyo_date"`, thông báo「必須項目です。」= ACSMS-MSG-029-004). Định dạng ngày hợp lệ (YYYY-MM-DD)
  - kanri_shiten_id: mảng số. Có thể không chỉ định
  - remarks: mảng object (`kanri_shiten_id` + `biko`). Có thể không chỉ định. `biko` tối đa 1000 ký tự
- Khi lỗi kiểm tra hợp lệ: HTTP 400 (`VALIDATION_ERROR`)

### 4.2 Kiểm tra xác thực・phân quyền (認証・認可チェック)

- Xác minh thông tin xác thực (phiên HTTP-only Cookie).
- Nếu chưa xác thực: HTTP 401 (`UNAUTHORIZED`)
- Quyền yêu cầu: `report.export_zougen_nichino`
- Vai trò sở hữu quyền tương ứng: CHUOKAI (Trung ương hội), JA_HONTEN (JA bản điếm), JA_KANRI_SHITEN (JA chi nhánh quản lý)
  - ※ NICHINO_ADMIN / NICHINO_STAFF không sở hữu quyền này nên trả về HTTP 403 (`FORBIDDEN`).
- Nếu thiếu quyền: HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI` / `JA_HONTEN`: `r.ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`: `r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id`
- Nếu vi phạm DataScope: HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 Lấy dữ liệu (データ取得)

- Lấy dữ liệu với cùng điều kiện trích xuất・SQL như 4.3 〜 4.5 của `ACSMS-API-029-001` (`joho_henko_tekiyo_date = :tekiyo_date`, `zougen_hokoku_flg = true`, `h.haiten_flg = false`, loại trừ bản ghi `現在部数=0 AND 新部数=0`, áp dụng DataScope).
- Nếu số bản ghi lấy được là 0: HTTP 404 (`NO_REPORT_DATA`) (không tạo tệp. Hiển thị ACSMS-MSG-029-002).

### 4.4 Tạo PDF・lưu S3 (PDF生成・S3保存)

- Nhóm các bản ghi lấy được theo đơn vị ID chi nhánh quản lý (sắp xếp tăng dần theo mã chi nhánh quản lý).
- Vẽ 1 tờ chứng từ cho mỗi chi nhánh quản lý (bảng chi tiết + dòng tổng + ghi chú) (xem Bố cục PDF).
- Việc định dạng cột ủy thác・miễn thuế (（免））・số bộ giảm (▲)・dấu chênh lệch (◆) giống như 4.6 của `ACSMS-API-029-001`.
- Hiển thị trên header số trang (`Page: trang hiện tại/tổng số trang`), tên tổ hợp (mã chi nhánh quản lý ngăn cách 3-4-3 ＋ tên JA ＋ tên chi nhánh quản lý), tên tỉnh thành, bộ phận phụ trách ／ người phụ trách, TEL / FAX.
- Định dạng xuất: PDF (A4). Tạo bằng template (Handlebars) → HTML → Puppeteer.
- Lưu PDF đã tạo lên S3. Đường dẫn lưu: `s3://{bucket}/reports/zogen_notification/{YYYY}/{MM}/{DD}/`, tên tệp: `増減通知_{mã chi nhánh quản lý}_{ngày áp dụng YYYYMMDD}.pdf`.
- Khi đối tượng có nhiều chi nhánh quản lý → tạo・lưu PDF theo từng chi nhánh quản lý.

### 4.5 Thông báo email (メール通知)

- Tự động gửi email thông báo hoàn tất tạo thông báo tăng/giảm cho người phụ trách Nichino (địa chỉ email của NICHINO_ADMIN / NICHINO_STAFF, hoặc địa chỉ nhận đã được cấu hình) (`MailService`. Tiền tố tiêu đề `【AgriNews_ACSMS】`).
- Nội dung email ghi ngày áp dụng・chi nhánh quản lý đối tượng・số lượng. Không bao gồm thông tin cá nhân (tên・địa chỉ của độc giả v.v.).
- Khi gửi email thất bại thì bản thân việc xuất PDF vẫn coi là thành công, và ghi nhật ký cảnh báo (`log_type = 2` v.v.).

### 4.6 Đăng ký lịch sử tải xuống (ダウンロード履歴登録)

- Đăng ký lịch sử tải xuống cho từng tệp PDF đã tạo bằng SQL sau.

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 4,
        :file_name, :file_path, :file_size,
        :record_count, :target_month,
        NOW(), :user_account_id)
```

- `download_type`: 4 (Chứng từ thông báo tăng/giảm 増減通知書 ※Tham chiếu m_code.code_category='DOWNLOAD_TYPE')
- `target_month`: năm tháng của ngày áp dụng (YYYYMM)
- `record_count`: số dòng chi tiết đối tượng của chi nhánh quản lý đó

### 4.7 Ghi nhật ký thao tác (操作ログ記録)

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)', 'EXPORT_PDF', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**Ví dụ after_value:**

```
`before_value`: với EXPORT thì đặt chuỗi trống.
`after_value`: lưu điều kiện xuất và số lượng dưới dạng JSON. Không bao gồm thông tin cá nhân (tên・địa chỉ v.v.).

{
  "tekiyo_date": "2026-03-01",
  "kanri_shiten_id": [20, 21],
  "report_count": 2,
  "record_count": 5,
  "file_names": [
    "増減通知_1AA-3300-001_20260301.pdf",
    "増減通知_1AA-3300-002_20260301.pdf"
  ]
}
```

### 4.8 Tạo response (レスポンス生成)

- Khi đối tượng có 1 chi nhánh quản lý: trả về tệp PDF đã tạo làm response body. HTTP 200.
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="zougen_nichino_{mã chi nhánh quản lý}_{YYYYMMDD}.pdf"; filename*=UTF-8''{tên tệp đã URL-encode}`
- Khi đối tượng có nhiều chi nhánh quản lý: trả về ZIP gộp các PDF. HTTP 200.
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="zougen_nichino_{YYYYMMDD}.zip"`
- Tên hiển thị khi tải xuống sử dụng nguyên tên tệp đã lưu trên S3.

### 4.9 Xử lý ngoại lệ (例外処理)

- Khi lỗi kết nối DB・lỗi tạo PDF・lỗi lưu S3 v.v.: HTTP 500 (`INTERNAL_SERVER_ERROR`) (ACSMS-MSG-029-003).
- Khi phát sinh lỗi vẫn ghi nhật ký thao tác (`log_type = 3`, ghi ngoài transaction).

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)', 'EXPORT_PDF', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
