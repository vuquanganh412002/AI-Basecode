---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-011
screen_name: 購読者情報登録画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-03
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-06-03 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |
| 2 | 2026-08-06 | 1.1 | Tran Duc Tuyen | Đồng bộ với bản tiếng Nhật (bổ sung 7 case còn thiếu): TC-011-015-2 kiểm tra họ tên cho phép Kanji/Hiragana/Katakana/Latin, TC-011-047 luồng chỉnh sửa của bản điện tử thuần, TC-011-048 dropdown cửa hàng liên động theo loại người đọc, TC-011-049 sửa phương thức thanh toán và 4 trường tài khoản trước khi duyệt (#56524), TC-011-050 4 trường phụ thuộc của thuộc tính người đọc, TC-011-051 kiểm tra trùng email xuyên JA (#56568), TC-011-052 vùng nơi giao báo hiển thị với loại kết hợp. | | |


## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng
quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động.
Các chức năng chính gồm: đăng ký・cập nhật・tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng upload・download file, quản lý thông báo hệ thống.
Ngoài ra còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của user,
ghi lại lịch sử đăng nhập, ghi lại log thao tác của user.

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống cho「購読者情報登録画面（ACSMS-SCR-011）」.
Tài liệu này tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau.

- Mỗi testcase được tạo dựa trên một kịch bản đơn lẻ (trách nhiệm đơn).
- Các bước thực hiện được mô tả ở mức có thể tái hiện, nêu rõ test data.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-011 | Tài liệu thiết kế màn hình 購読者情報登録画面 |
| 2 | ACSMS-SCR-011-api | Tài liệu thiết kế API 購読者情報登録画面 |
| 3 | testcase-viewpoints | Danh sách quan điểm test dùng chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 6 |
| 2 | Hiển thị màn hình (Layout & Rendering) | 7 |
| 3 | Kiểm tra đầu vào (Input Validation) | 9 |
| 4 | Logic nghiệp vụ đăng ký (Function — Create) | 5 |
| 5 | Logic nghiệp vụ cập nhật (Sửa・Duyệt・Từ chối) | 8 |
| 6 | Xử lý lỗi dùng chung (Common Error Handling) | 11 |
|  | 合計 | 46 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-011-001 — User chưa xác thực truy cập màn hình đăng ký thông tin độc giả bị cấm

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Chưa đăng nhập (không có session Cookie, hoặc đã hết hạn)

### 手順

ステップ1：
Nhập `/dokusya/create` vào thanh địa chỉ trình duyệt, truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/dokusya/1` qua tab Network của DevTools

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả không được hiển thị, chuyển về `/login` (query `?redirect=/dokusya/create` được gắn thêm)

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

補足：
・Màn hình đăng ký thông tin độc giả là màn hình bắt buộc xác thực, khi chưa xác thực sẽ được router guard phía frontend dẫn về màn hình đăng nhập
・Phía backend SessionAuthGuard cũng trả về 401

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-002 — NICHINO_ADMIN truy cập màn hình đăng ký thông tin độc giả bị cấm

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Không có quyền「dokusya.create」「dokusya.view」「dokusya.update」

### 手順

ステップ1：
Mở màn hình menu, xác nhận menu quản lý độc giả không hiển thị

ステップ2：
Nhập `/dokusya/create` vào thanh địa chỉ trình duyệt, truy cập trực tiếp

ステップ3：
Gửi POST `/api/v1/dokusya` với request body hợp lệ qua tab Network của DevTools

ステップ4：
Chạy query sau trong DB và xác nhận log
```sql
SELECT * FROM t_log
WHERE result_status = 2
  AND target_table = 't_dokusya'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Menu quản lý độc giả không hiển thị

ステップ2：
Toast `アクセス権がありません。` được hiển thị, và chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
・Dữ liệu mới không được đăng ký vào t_dokusya
・User không có quyền không thể access

補足：
・Cả 3 lớp menu phía frontend, router guard phía frontend, API guard phía backend đều kiểm soát truy cập
・Theo ma trận quyền `account_concept.md`, NICHINO_ADMIN với quản lý độc giả là ×

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-003 — NICHINO_STAFF truy cập màn hình đăng ký thông tin độc giả bị cấm

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Không có quyền「dokusya.create」「dokusya.view」「dokusya.update」

### 手順

ステップ1：
Nhập `/dokusya/create` vào thanh địa chỉ trình duyệt, truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/dokusya/1` qua tab Network của DevTools

ステップ3：
Gửi POST `/api/v1/dokusya` với request body hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Toast `アクセス権がありません。` được hiển thị, và chuyển về `/dashboard`

ステップ2：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Bản thân NICHINO_STAFF không có `dokusya.create` / `dokusya.view` / `dokusya.update` nên không thể sử dụng trực tiếp màn hình này
・Khi NICHINO_STAFF nhập thay nhà bán thì thao tác bằng cách mượn account của JA, truy cập trực tiếp màn hình này nằm ngoài phạm vi quyền

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-004 — CHUOKAI đăng ký・tham chiếu độc giả (scope tự trung ương hội)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI（chuokai-001 所属, ja_id=100）
  - ・Có quyền「dokusya.create」「dokusya.view」「dokusya.update」
  - ・Tồn tại độc giả của JA thuộc trung ương hội mình (ja_id=100)
  - ・Tồn tại độc giả của JA thuộc trung ương hội khác (ja_id=200)

### 手順

ステップ1：
Sau khi đăng nhập, mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

ステップ2：
Xác nhận các lựa chọn trong dropdown chi nhánh quản lý・nhà bán

ステップ3：
Lấy độc giả của JA thuộc trung ương hội mình (ja_id=100) bằng GET `/api/v1/dokusya/{dokusya_id}`

ステップ4：
Gọi GET `/api/v1/dokusya/{他中央会dokusya_id}` với ID độc giả của JA thuộc trung ương hội khác (ja_id=200)

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị

ステップ2：
Chỉ chi nhánh quản lý・nhà bán thuộc trung ương hội mình được hiển thị trong lựa chọn

ステップ3：
Trả về HTTP 200 (lấy được dữ liệu độc giả của JA thuộc trung ương hội mình)

ステップ4：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`) (record của trung ương hội khác bị ẩn sự tồn tại)

補足：
・CHUOKAI chỉ có thể tham chiếu・đăng ký trong phạm vi tự trung ương hội (vận hành không tham chiếu trực tiếp thông tin cá nhân độc giả của JA quản lý, nhưng scope trên hệ thống giới hạn ở JA thuộc trung ương hội mình)
・Vi phạm DataScope (truy cập tham chiếu record của trung ương hội khác) bị ẩn sự tồn tại bằng 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-005 — JA_HONTEN đăng ký・tham chiếu độc giả (scope tự JA)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Có quyền「dokusya.create」「dokusya.view」「dokusya.update」
  - ・Tồn tại độc giả của JA mình (ja_id=100)
  - ・Tồn tại độc giả của JA khác (ja_id=200)

### 手順

ステップ1：
Sau khi đăng nhập, mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

ステップ2：
Lấy độc giả của JA mình (ja_id=100) bằng GET `/api/v1/dokusya/{dokusya_id}`

ステップ3：
Gọi GET `/api/v1/dokusya/{他JAdokusya_id}` với ID độc giả của JA khác (ja_id=200)

ステップ4：
Chạy query sau trong DB và xác nhận scope của đối tượng lấy
```sql
SELECT dokusya_id, ja_id FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL;
```

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị

ステップ2：
Trả về HTTP 200 (lấy được dữ liệu độc giả của JA mình (ja_id=100))

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`) (record của JA khác bị ẩn sự tồn tại)

ステップ4：
`ja_id` của record đối tượng lấy là 100 (JA mình)

補足：
・JA_HONTEN chỉ có thể tham chiếu・đăng ký trong phạm vi tự JA (`ja_id = user.ja_id`)
・Truy cập tham chiếu record của JA khác (ja_id=200) bị ẩn sự tồn tại bằng 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-006 — JA_KANRI_SHITEN đăng ký・tham chiếu độc giả (scope tự chi nhánh quản lý)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN（ja_id=100 / kanri_shiten_id=10 所属）
  - ・Có quyền「dokusya.create」「dokusya.view」「dokusya.update」
  - ・Tồn tại độc giả của chi nhánh quản lý mình (kanri_shiten_id=10)
  - ・Tồn tại độc giả của chi nhánh quản lý khác (kanri_shiten_id=11, cùng JA)

### 手順

ステップ1：
Sau khi đăng nhập, mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

ステップ2：
Lấy độc giả của chi nhánh quản lý mình (kanri_shiten_id=10) bằng GET `/api/v1/dokusya/{dokusya_id}`

ステップ3：
Gọi GET `/api/v1/dokusya/{他管理支店dokusya_id}` với ID độc giả của chi nhánh quản lý khác (kanri_shiten_id=11)

ステップ4：
Chạy query sau trong DB và xác nhận scope của đối tượng lấy
```sql
SELECT dokusya_id, ja_id, kanri_shiten_id FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL;
```

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị

ステップ2：
Trả về HTTP 200 (lấy được dữ liệu độc giả của chi nhánh quản lý mình (kanri_shiten_id=10))

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`) (record của chi nhánh quản lý khác bị ẩn sự tồn tại)

ステップ4：
`ja_id` của record đối tượng lấy là 100 và `kanri_shiten_id` là 10

補足：
・JA_KANRI_SHITEN chỉ có thể tham chiếu・đăng ký trong phạm vi tự JA và tự chi nhánh quản lý (`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`)
・Truy cập tham chiếu record của chi nhánh quản lý khác (kanri_shiten_id=11) bị ẩn sự tồn tại bằng 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 2: Hiển thị màn hình (Layout & Rendering)

## ACSMS-TC-011-007 — Layout tổng thể chế độ tạo mới khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Trình duyệt: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Sau khi đăng nhập, mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

ステップ2：
Đặt cạnh nhau tài liệu thiết kế (screen-design.md / index.html) và màn hình để so sánh

ステップ3：
Xác nhận bố trí từng section (基本情報・管理情報・購読者氏名・購読者情報・配達先情報・販売店郵送区分・支払方法・購読者層分類・購読期間・その他) và hiển thị từng項目

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị

ステップ2：
Màu nền, font, cỡ font, padding/margin, màu button, style card đều khớp với thiết kế

ステップ3：
Từng section・từng項目 được bố trí đúng theo thiết kế

補足：
・Ở chế độ tạo mới, 電子版読者種別 (denshi_dokusya_shubetsu)・履歴No (rireki_no)・ID (dokusya_rireki_id) bị ẩn
・design tokens (`design-tokens.ts`) được áp dụng (không có màu hardcode)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-008 — Hiển thị header・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận tiêu đề header phía trên màn hình và danh sách breadcrumb

ステップ2：
Click node giữa của breadcrumb (購読者明細検索)

### 期待結果

ステップ1：
Header hiển thị「購読者情報登録画面」, breadcrumb hiển thị「ホーム > 購読者明細検索 > 購読者情報登録画面」

ステップ2：
Chuyển về màn hình 購読者明細検索

補足：
・Node giữa của breadcrumb (購読者明細検索) là link có thể click
・Trang hiện tại (購読者情報登録画面) không phải là link

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-009 — Chuyển đổi hiển thị vùng nhập địa chỉ giao・tài khoản theo loại độc giả・phương thức thanh toán

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Chọn「電子版」ở loại độc giả (dokusya_shubetsu)

ステップ2：
Chọn lại「紙版」ở loại độc giả, và chọn「口座引落」ở phương thức thanh toán (shiharai_hoho)

ステップ3：
Đổi phương thức thanh toán sang「現金集金」

### 期待結果

ステップ1：
Vùng thông tin địa chỉ giao hiển thị ở trạng thái disable, memail (email) hiển thị là項目 bắt buộc

ステップ2：
Vùng thông tin địa chỉ giao hiển thị ở trạng thái active, 引落口座支店 (bank_shiten_id)・引落口座貯金種目 (hikiotoshi_yokin_shubetsu)・引落口座番号 (hikiotoshi_koza_no)・引落口座名義 (hikiotoshi_koza_meigi) hiển thị là項目 bắt buộc

ステップ3：
引落口座支店・引落口座貯金種目・引落口座番号・引落口座名義 hiển thị là項目 tùy chọn

補足：
・Khi loại độc giả là「電子版」hoặc「併読」thì vô hiệu hóa vùng thông tin địa chỉ giao (機能定義 §7.5)
・Chỉ khi phương thức thanh toán=口座引落 (shiharai_hoho=1) thì cụm tài khoản rút mới bắt buộc (機能定義 §10.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-010 — Hiển thị cố định số phần đăng ký khi chọn loại thủ tục「解約」

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Chọn「解約」ở loại thủ tục (tetsuzuki_shurui)

ステップ2：
Xác nhận hiển thị・khả năng nhập của số phần đăng ký (dokusya_busu) và ngày dừng đăng ký (dokusya_chushi_date)

ステップ3：
Chọn lại「新規」ở loại thủ tục, xác nhận khả năng nhập của số phần đăng ký

### 期待結果

ステップ1：
Loại thủ tục được chọn là「解約」

ステップ2：
Số phần đăng ký (dokusya_busu) hiển thị là 0 và read-only, ngày dừng đăng ký (dokusya_chushi_date) hiển thị có thể nhập

ステップ3：
Số phần đăng ký (dokusya_busu) hiển thị có thể nhập

補足：
・Khi loại thủ tục=解約 (tetsuzuki_shurui=0) thì cố định số phần đăng ký là 0 (機能定義 §8.1)
・Khi đăng ký giải ước thì kaiyaku_flg=TRUE được thiết lập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-011 — Vô hiệu hóa và clear項目 địa chỉ giao khi check「購読者情報と同じ」

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Loại độc giả=紙版
  - ・Đã nhập giá trị vào các項目 địa chỉ giao (haitatsu_yubin_no v.v.)

### 手順

ステップ1：
Check checkbox「購読者情報と同じ」(haitatsu_same_flg)

ステップ2：
Xác nhận hiển thị・giá trị của 配達先郵便番号 (haitatsu_yubin_no)・配達先都道府県 (haitatsu_todofuken_code)・配達先苗字漢字 (haitatsu_shimei_sei) v.v.

ステップ3：
Bỏ check, xác nhận trạng thái active của từng項目 địa chỉ giao

### 期待結果

ステップ1：
「購読者情報と同じ」ở trạng thái đã check

ステップ2：
Các項目 địa chỉ giao (haitatsu_yubin_no v.v.) hiển thị ở trạng thái disable, giá trị đã nhập bị clear

ステップ3：
Các項目 địa chỉ giao (haitatsu_yubin_no v.v.) hiển thị ở trạng thái active, 配達先郵便番号・都道府県・市町村郡・丁目番地・配達先氏名 (漢字・かな) trở thành項目 bắt buộc

補足：
・Khi check thì vô hiệu hóa các項目 địa chỉ giao và clear dữ liệu đã nhập (機能定義 §9.1)
・Khi không check thì 配達先郵便番号〜丁目番地 và 配達先氏名 (漢字・かな) trở thành bắt buộc (機能定義 §9.2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-012 — Hiển thị phân loại nông dân khi chọn phân loại tầng độc giả「農業者」

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Check「農業者」ở phân loại tầng độc giả (dokusyaso_bunrui)

ステップ2：
Xác nhận hiển thị và lựa chọn của phân loại nông dân (nogyosya_bunrui)

ステップ3：
Bỏ check phân loại tầng độc giả「農業者」, xác nhận hiển thị và giá trị của phân loại nông dân

### 期待結果

ステップ1：
Phân loại tầng độc giả「農業者」ở trạng thái đã check

ステップ2：
Phân loại nông dân (nogyosya_bunrui) được hiển thị (水稲／野菜／果樹／畜産／その他)

ステップ3：
Phân loại nông dân (nogyosya_bunrui) bị ẩn, giá trị đã chọn bị clear

補足：
・Khi chọn「農業者」ở phân loại tầng độc giả thì hiển thị phân loại nông dân (機能定義 §11.1)
・Khi không check hoặc bỏ check「農業者」thì ẩn phân loại nông dân và clear giá trị đã chọn (機能定義 §11.2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-013 — Chế độ sửa hiển thị項目 read-only (電子版読者種別・履歴No・請求開始月)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Tồn tại độc giả có loại độc giả=電子版 và denshi_shonin_status=1 (đã duyệt)
  - ・Giữ dokusya_id của độc giả đối tượng

### 手順

ステップ1：
Click dòng độc giả đối tượng từ danh sách màn hình 購読者明細検索, mở màn hình đăng ký thông tin độc giả ở chế độ sửa

ステップ2：
Xác nhận hiển thị・khả năng nhập của 電子版読者種別 (denshi_dokusya_shubetsu)・履歴No (rireki_no)・ID (dokusya_rireki_id)

ステップ3：
Xác nhận hiển thị・khả năng nhập của 請求開始月 (seikyu_kaishi_month)

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị ở chế độ sửa, dữ liệu hiện có được phản ánh vào form

ステップ2：
電子版読者種別 (denshi_dokusya_shubetsu)・履歴No (rireki_no)・ID (dokusya_rireki_id) hiển thị read-only

ステップ3：
Do loại độc giả=電子版 nên 請求開始月 (seikyu_kaishi_month) hiển thị label read-only

補足：
・電子版読者種別・履歴No・ID không thể nhập, chỉ hiển thị là項目 read-only ở chế độ sửa
・請求開始月 hiển thị read-only khi loại độc giả=電子版 hoặc 併読 (do hệ thống quản lý độc giả bản điện tử quyết định)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 3: Kiểm tra đầu vào (Input Validation)

## ACSMS-TC-011-014 — Cụm họ tên độc giả kiểm tra bắt buộc (để trống + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Để trống 購読者氏名_氏 (shimei_sei)・購読者氏名_名 (shimei_mei)・購読者かな_氏 (shimei_kana_sei)・購読者かな_名 (shimei_kana_mei) rồi click button「承認・登録」

ステップ2：
Nhập chỉ ký tự khoảng trắng (`"   "`) vào 購読者氏名_氏 (shimei_sei), click lại button「承認・登録」

ステップ3：
Nhập 1 ký tự bất kỳ vào từng項目 họ tên, xác nhận hiển thị message

### 期待結果

ステップ1：
Lỗi required hiển thị dưới từng項目 họ tên (message `必須項目です。`)

ステップ2：
Lỗi required hiển thị dưới 購読者氏名_氏 (shimei_sei) (chỉ nhập khoảng trắng được xử lý như để trống)

ステップ3：
Lỗi required của từng項目 họ tên biến mất

補足：
・Khi không nhập項目 bắt buộc thì hiển thị message ACSMS-MSG-011-013 `必須項目です。`
・Nhập chỉ ký tự khoảng trắng được xử lý như để trống sau khi cắt khoảng trắng trước sau

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-015 — Kiểm tra hiragana toàn角 của かな độc giả

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Nhập ký tự latin nửa角「yamada」vào 購読者かな_氏 (shimei_kana_sei), click button「承認・登録」

ステップ2：
Nhập kanji「山田」vào 購読者かな_氏 (shimei_kana_sei), click button「承認・登録」

ステップ3：
Nhập hiragana toàn角「やまだ」vào 購読者かな_氏 (shimei_kana_sei), click button「承認・登録」

### 期待結果

ステップ1：
Hiển thị lỗi format (message `ひらがなで入力してください。`)

ステップ2：
Hiển thị lỗi format (message `ひらがなで入力してください。`)

ステップ3：
Không hiển thị lỗi format (hiragana toàn角 có thể nhập)

補足：
・項目 かな độc giả chỉ cho nhập hiragana toàn角 (đặc tả bản điện tử)
・Khi format sai thì hiển thị message ACSMS-MSG-011-002 `ひらがなで入力してください。`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-015-2 — Kiểm tra họ tên người đọc cho phép Kanji / Hiragana / Katakana (yêu cầu khách hàng 2026-07)

- ID quan điểm: VP-B-04
- Loại: Abnormal (bất thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở màn hình đăng ký thông tin người đọc (chế độ tạo mới)

### Các bước

Bước 1:
Nhập chuỗi nửa chiều rộng có số `Yamada12` vào Họ người đọc (shimei_sei) rồi bấm nút "Duyệt・Đăng ký"

Bước 2:
Nhập Hiragana toàn chiều rộng `やまだ` vào Họ người đọc (shimei_sei) rồi bấm nút "Duyệt・Đăng ký"

Bước 3:
Nhập Katakana toàn chiều rộng `タロウ` vào Tên người đọc (shimei_mei) rồi bấm nút "Duyệt・Đăng ký"

Bước 4:
Nhập Kanji `山田` vào Họ người đọc (shimei_sei) rồi bấm nút "Duyệt・Đăng ký"

### Kết quả mong đợi

Bước 1:
Hiển thị lỗi định dạng (thông báo `漢字・ひらがな・カタカナ・アルファベットで入力してください。`)

Bước 2:
Không hiển thị lỗi định dạng (Hiragana toàn chiều rộng được chấp nhận)

Bước 3:
Không hiển thị lỗi định dạng (Katakana toàn chiều rộng được chấp nhận)

Bước 4:
Không hiển thị lỗi định dạng (Kanji được chấp nhận)

Bổ sung:
・Yêu cầu khách hàng 2026-07: để phục vụ những người có họ tên viết bằng Hiragana/Katakana, trường họ tên (Kanji) chấp nhận thêm Hiragana, Katakana và cả bảng chữ cái Latin
・Áp dụng cho Họ/Tên người đọc (shimei_sei/shimei_mei) và Họ/Tên nơi giao báo (haitatsu_shimei_sei/haitatsu_shimei_mei)
・Katakana nửa chiều rộng và chữ số vẫn không được chấp nhận (chỉ thêm bảng chữ cái Latin). Khi sai định dạng phải hiển thị `漢字・ひらがな・カタカナ・アルファベットで入力してください。`
・Định dạng Hiragana toàn chiều rộng của các trường kana (shimei_kana_*) không thay đổi (xem ACSMS-TC-011-015)

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-016 — Kiểm tra 7 chữ số mã bưu điện

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Nhập「123」(dưới 6 chữ số) vào mã bưu điện (yubin_no), click button「承認・登録」

ステップ2：
Nhập「123-4567」(có dấu gạch ngang) vào mã bưu điện (yubin_no), click button「承認・登録」

ステップ3：
Nhập「1234567」(7 chữ số nửa角) vào mã bưu điện (yubin_no), click button「承認・登録」

### 期待結果

ステップ1：
Hiển thị lỗi format (message `郵便番号は7桁で入力してください。`)

ステップ2：
Hiển thị lỗi format (không cho nhập dấu gạch ngang, message `郵便番号は7桁で入力してください。`)

ステップ3：
Không hiển thị lỗi format mã bưu điện (7 chữ số nửa角 có thể nhập)

補足：
・Mã bưu điện cố định 7 chữ số nửa角, không cho nhập dấu gạch ngang
・Khi số chữ số sai thì hiển thị message ACSMS-MSG-011-004 `郵便番号は7桁で入力してください。`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-017 — Kiểm tra format email

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Nhập「yamada」(không có @) vào email (email), click button「承認・登録」

ステップ2：
Nhập「yamada@」(không có domain) vào email (email), click button「承認・登録」

ステップ3：
Nhập「yamada@example.com」(format đúng) vào email (email), click button「承認・登録」

### 期待結果

ステップ1：
Hiển thị lỗi format (message `正しいメールアドレスを入力してください。`)

ステップ2：
Hiển thị lỗi format (message `正しいメールアドレスを入力してください。`)

ステップ3：
Không hiển thị lỗi format email

補足：
・Email kiểm tra format theo RFC 5322
・Khi format sai thì hiển thị message ACSMS-MSG-011-005 `正しいメールアドレスを入力してください。`
・項目 email dùng `type="text"`, không dùng popup tiếng Anh mặc định của trình duyệt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-018 — Email bắt buộc có điều kiện (電子版・併読)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Chọn「電子版」ở loại độc giả (dokusya_shubetsu), để trống email (email) rồi click button「承認・登録」

ステップ2：
Chọn「併読」ở loại độc giả, để trống email rồi click button「承認・登録」

ステップ3：
Chọn「紙版」ở loại độc giả, để trống email, nhập các項目 bắt buộc khác rồi click button「承認・登録」

### 期待結果

ステップ1：
Lỗi required hiển thị dưới email (email) (message `必須項目です。`)

ステップ2：
Lỗi required hiển thị dưới email (email) (message `必須項目です。`)

ステップ3：
Lỗi required của email (email) không hiển thị (trường hợp 紙版 là tùy chọn)

補足：
・Khi loại độc giả=電子版/併読 thì email bắt buộc (機能定義 §7.1)
・Trường hợp 紙版 thì email là tùy chọn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-019 — Cụm ngân hàng bắt buộc có điều kiện khi 口座引落

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Loại độc giả=紙版
  - ・Đã chọn「口座引落」ở phương thức thanh toán (shiharai_hoho)

### 手順

ステップ1：
Để trống 引落口座支店 (bank_shiten_id)・引落口座貯金種目 (hikiotoshi_yokin_shubetsu)・引落口座番号 (hikiotoshi_koza_no)・引落口座名義 (hikiotoshi_koza_meigi) rồi click button「承認・登録」

ステップ2：
Đổi phương thức thanh toán sang「現金集金」, để trống 4項目 trên rồi click button「承認・登録」

ステップ3：
Xác nhận lựa chọn của dropdown 引落口座支店

### 期待結果

ステップ1：
Lỗi hiển thị dưới 引落口座支店・引落口座貯金種目・引落口座番号・引落口座名義 (message `口座引落の場合、〇〇は必須です。`)

ステップ2：
Lỗi của 4項目 trên không hiển thị (phương thức thanh toán khác 口座引落 là tùy chọn)

ステップ3：
Chỉ chi nhánh có cờ chi nhánh tài chính (kinyu_shiten_flg=TRUE) được hiển thị trong lựa chọn

補足：
・Khi phương thức thanh toán=口座引落 (shiharai_hoho=1) thì cụm tài khoản rút 4項目 bắt buộc (機能定義 §10.1)
・Lỗi bắt buộc 口座引落 hiển thị message ACSMS-MSG-011-006 `口座引落の場合、〇〇は必須です。`
・Dropdown 引落口座支店 chỉ hiển thị những cái có `m_shiten.kinyu_shiten_flg=TRUE`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-020 — Địa chỉ giao bắt buộc có điều kiện (購読者情報と同じ chưa check)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Loại độc giả=紙版
  - ・「購読者情報と同じ」(haitatsu_same_flg) ở trạng thái chưa check

### 手順

ステップ1：
Để trống 配達先郵便番号 (haitatsu_yubin_no)・配達先都道府県 (haitatsu_todofuken_code)・配達先市町村郡 (haitatsu_shikuchoson)・配達先丁目番地 (haitatsu_chome_banchi) rồi click button「承認・登録」

ステップ2：
Để trống 配達先苗字漢字 (haitatsu_shimei_sei)・配達先名前漢字 (haitatsu_shimei_mei)・配達先苗字かな (haitatsu_shimei_kana_sei)・配達先名前かな (haitatsu_shimei_kana_mei) rồi click button「承認・登録」

ステップ3：
Check「購読者情報と同じ」, để trống các項目 địa chỉ giao rồi click button「承認・登録」

### 期待結果

ステップ1：
Lỗi required hiển thị dưới 配達先郵便番号・配達先都道府県・配達先市町村郡・配達先丁目番地 (message `必須項目です。`)

ステップ2：
Lỗi required hiển thị dưới 配達先苗字漢字・配達先名前漢字・配達先苗字かな・配達先名前かな (message `必須項目です。`)

ステップ3：
Lỗi required của các項目 địa chỉ giao không hiển thị (khi check thì copy từ thông tin độc giả nên bỏ qua bắt buộc)

補足：
・Khi「購読者情報と同じ」chưa check thì 配達先郵便番号〜丁目番地 và 配達先氏名 (漢字・かな) bắt buộc (機能定義 §9.2)
・Khi check thì copy từ thông tin độc giả lúc lưu DB (機能定義 §9.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-021 — Kiểm tra số ký tự tối đa 備考・kiểm tra ngày tương lai 読者情報変更適用日

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)
  - ・Hôm nay: 2026-06-03

### 手順

ステップ1：
Nhập 501 ký tự vào 備考 (biko), click button「承認・登録」

ステップ2：
Nhập 500 ký tự vào 備考 (biko), click button「承認・登録」

ステップ3：
Nhập ngày quá khứ (2026-06-02) vào 読者情報変更適用日 (joho_henko_tekiyo_date), click button「承認・登録」

### 期待結果

ステップ1：
Hiển thị lỗi vượt quá số ký tự (message `備考は500文字以内で入力してください。`)

ステップ2：
Lỗi vượt quá số ký tự của 備考 không hiển thị (có thể đăng ký trong 500 ký tự)

ステップ3：
Lỗi hiển thị dưới 読者情報変更適用日 (chỉ cho nhập ngày tương lai)

補足：
・備考 trong 500 ký tự (ACSMS-MSG-011-010 message `備考は500文字以内で入力してください。`)
・読者情報変更適用日 (joho_henko_tekiyo_date) khi nhập thì kiểm tra phải là ngày tương lai

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-022 — Phân loại nông dân bắt buộc có điều kiện (tầng độc giả=農業者)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Check「農業者」ở phân loại tầng độc giả (dokusyaso_bunrui), để trống phân loại nông dân (nogyosya_bunrui) rồi click button「承認・登録」

ステップ2：
Chọn「水稲」ở phân loại nông dân (nogyosya_bunrui), click button「承認・登録」

ステップ3：
Bỏ check「農業者」ở phân loại tầng độc giả, để trống phân loại nông dân rồi click button「承認・登録」

### 期待結果

ステップ1：
Lỗi required hiển thị dưới phân loại nông dân (nogyosya_bunrui) (message `必須項目です。`)

ステップ2：
Lỗi required của phân loại nông dân không hiển thị

ステップ3：
Lỗi required của phân loại nông dân không hiển thị (khi không chọn nông dân là tùy chọn)

補足：
・Khi chọn「農業者」ở phân loại tầng độc giả thì phân loại nông dân (nogyosya_bunrui) bắt buộc (đặc tả request parameter của API)
・Khi không chọn nông dân thì phân loại nông dân là tùy chọn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 4: Logic nghiệp vụ đăng ký (Function — Create)

## ACSMS-TC-011-023 — Đăng ký mới normal (lưu DB + tạo lịch sử + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đã nhập giá trị hợp lệ cho tất cả項目 bắt buộc (loại độc giả=紙版, loại thủ tục=新規, phương thức thanh toán=口座引落)

### 手順

ステップ1：
Nhập tất cả項目 bắt buộc, click button「承認・登録」, click「はい」ở dialog xác nhận

ステップ2：
Xác nhận chuyển màn hình và message

ステップ3：
Chạy query sau trong DB, xác nhận record bản thể・lịch sử
```sql
SELECT dokusya_id, rireki_no, tetsuzuki_shurui, dokusya_busu
FROM t_dokusya
WHERE dokusya_id = :new_dokusya_id;

SELECT rireki_no, saishin_data_flg, shinki_flg, kaiyaku_flg, zougen_hokoku_flg
FROM t_dokusya_rireki
WHERE dokusya_id = :new_dokusya_id;
```

ステップ4：
Chạy query sau trong DB, xác nhận audit log
```sql
SELECT operation, result_status, target_table, ja_id
FROM t_log
WHERE target_table = 't_dokusya' AND target_id = :new_dokusya_id
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị, click「はい」thì xử lý đăng ký được thực hiện

ステップ2：
Trả về HTTP 201, message đăng ký thành công `登録しました。`（ACSMS-MSG-011-011）được hiển thị, chuyển về màn hình 購読者明細検索

ステップ3：
Record mới được đăng ký vào t_dokusya, record lịch sử (rireki_no=1, saishin_data_flg=true, shinki_flg=true, kaiyaku_flg=false, zougen_hokoku_flg=true) được đăng ký vào t_dokusya_rireki

ステップ4：
Record với operation=`CREATE`, result_status=1, target_table=`t_dokusya`, ja_id=100 được ghi vào t_log

補足：
・Tạo t_dokusya + t_dokusya_rireki trong 1 transaction (機能定義 §2.6)
・Khi phương thức thanh toán=口座引落 thì逆引き `m_shiten.jastem_toriatsukai_tenpo_code` / `jastem_tenpo_name` từ bank_shiten_id, lưu phi chuẩn hóa vào `t_dokusya.bank_branch_code` / `bank_branch_name`
・Đăng ký (ghi nghiệp vụ) và audit log được thực hiện trong một transaction duy nhất

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-024 — Đăng ký mới — cố định số phần đăng ký 0 khi loại thủ tục「解約」

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Chọn loại thủ tục (tetsuzuki_shurui)=解約

### 手順

ステップ1：
Chọn「解約」ở loại thủ tục, ở trạng thái đã nhập「5」vào số phần đăng ký (dokusya_busu) rồi click button「承認・登録」

ステップ2：
Chạy query sau trong DB, xác nhận số phần đăng ký và cờ giải ước
```sql
SELECT dokusya_busu FROM t_dokusya WHERE dokusya_id = :new_dokusya_id;

SELECT kaiyaku_flg, shinki_flg
FROM t_dokusya_rireki
WHERE dokusya_id = :new_dokusya_id AND saishin_data_flg = TRUE;
```

### 期待結果

ステップ1：
Xử lý đăng ký được thực hiện, message đăng ký thành công `登録しました。` được hiển thị

ステップ2：
dokusya_busu của t_dokusya được lưu là 0, kaiyaku_flg của t_dokusya_rireki là TRUE, shinki_flg là FALSE

補足：
・Khi đăng ký giải ước thì đặt số phần đăng ký là 0, kaiyaku_flg=TRUE (機能定義 §8.1)
・Để chống tính phí hai lần, số phần đăng ký bị ép buộc về 0 khi giải ước

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-025 — Đăng ký mới — lưu copy khi địa chỉ giao「購読者情報と同じ」

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Loại độc giả=紙版
  - ・Check「購読者情報と同じ」(haitatsu_same_flg)

### 手順

ステップ1：
Nhập họ tên độc giả・địa chỉ v.v., check「購読者情報と同じ」rồi click button「承認・登録」

ステップ2：
Chạy query sau trong DB, xác nhận thông tin địa chỉ giao
```sql
SELECT haitatsu_same_flg, haitatsu_yubin_no, haitatsu_shimei_sei
FROM t_dokusya WHERE dokusya_id = :new_dokusya_id;
```

### 期待結果

ステップ1：
Xử lý đăng ký được thực hiện, message đăng ký thành công `登録しました。` được hiển thị

ステップ2：
haitatsu_same_flg được lưu là true, các項目 địa chỉ giao (haitatsu_yubin_no・haitatsu_shimei_sei v.v.) được lưu giá trị copy từ thông tin độc giả

補足：
・Khi check「購読者情報と同じ」thì copy từ thông tin độc giả lúc lưu DB (機能定義 §9.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-026 — Đăng ký mới — validation tích hợp khi tất cả項目 chưa nhập

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Để trống tất cả項目 rồi click button「承認・登録」

ステップ2：
Xác nhận response của POST `/api/v1/dokusya` qua tab Network của DevTools

### 期待結果

ステップ1：
Lỗi required `必須項目です。` hiển thị dưới từng項目 bắt buộc, xử lý đăng ký không được thực hiện

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, mảng `errors` chứa message từng項目 như shimei_sei・yubin_no)

補足：
・Sau khi kiểm tra dữ liệu phía client (bắt buộc・format・tương quan), phía server cũng validation lại (機能定義 §2.1, §2.5)
・Lỗi validation được trả về theo từng項目 trong mảng `errors`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-027 — Đăng ký mới — hủy bằng button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đã nhập một số項目 ở màn hình đăng ký thông tin độc giả (chế độ tạo mới)

### 手順

ステップ1：
Click button「前の画面に戻る」

ステップ2：
Xác nhận màn hình đích đến và việc lưu dữ liệu đã nhập

### 期待結果

ステップ1：
Chuyển về màn hình 購読者明細検索

ステップ2：
Dữ liệu đã nhập không được lưu (dữ liệu mới không được đăng ký vào t_dokusya)

補足：
・Click button「前の画面に戻る」thì chuyển về màn hình 購読者明細検索 (機能定義 §16)
・Dữ liệu đã nhập vào form không được lưu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 5: Logic nghiệp vụ cập nhật (Sửa・Duyệt・Từ chối)

## ACSMS-TC-011-028 — Chế độ sửa load form (phản ánh dữ liệu hiện có)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Tồn tại độc giả có loại độc giả=紙版 (dokusya_id=100)

### 手順

ステップ1：
Click dòng độc giả đối tượng từ danh sách màn hình 購読者明細検索, mở màn hình đăng ký thông tin độc giả ở chế độ sửa

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/100` qua tab Network của DevTools

ステップ3：
Xác nhận giá trị từng項目 form và hiển thị của 購読者ID (dokusya_id)・履歴No (rireki_no)

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị ở chế độ sửa

ステップ2：
Trả về HTTP 200 (tất cả項目 của độc giả đối tượng được chứa trong `data`, bank_shiten_id được trả về để re-hydration dropdown)

ステップ3：
Dữ liệu hiện có được phản ánh vào từng項目 form, 購読者ID (dokusya_id) hiển thị không thể thay đổi

補足：
・Ở chế độ sửa thì lấy dữ liệu độc giả bằng ID và phản ánh vào form (機能定義 §15.1)
・購読者ID không thể thay đổi
・Khi lấy dữ liệu thất bại thì hiển thị ACSMS-MSG-011-016 `購読者ID #{id} が見つかりません。`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-029 — Cập nhật normal (phương thức追記 lịch sử + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Tồn tại độc giả có loại độc giả=紙版 (dokusya_id=100, rireki_no hiện tại=1)

### 手順

ステップ1：
Mở màn hình đăng ký thông tin độc giả ở chế độ sửa, đổi số phần đăng ký (dokusya_busu) từ 1 sang 2 rồi click button「承認・登録」

ステップ2：
Xác nhận chuyển màn hình và message

ステップ3：
Chạy query sau trong DB, xác nhận record bản thể・lịch sử
```sql
SELECT rireki_no, dokusya_busu FROM t_dokusya WHERE dokusya_id = 100;

SELECT rireki_no, saishin_data_flg, zougen_hokoku_flg
FROM t_dokusya_rireki
WHERE dokusya_id = 100
ORDER BY rireki_no DESC;
```

ステップ4：
Chạy query sau trong DB, xác nhận audit log
```sql
SELECT operation, result_status, before_value, after_value
FROM t_log
WHERE target_table = 't_dokusya' AND target_id = 100
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Xử lý cập nhật được thực hiện

ステップ2：
Trả về HTTP 200, message update thành công `更新しました。`（ACSMS-MSG-011-015）được hiển thị, quay về màn hình 購読者明細検索

ステップ3：
rireki_no của t_dokusya được update thành 2 và dokusya_busu thành 2, lịch sử mới (rireki_no=2, saishin_data_flg=true, zougen_hokoku_flg=true) được追記 vào t_dokusya_rireki, saishin_data_flg của lịch sử cũ (rireki_no=1) được update thành false

ステップ4：
Record với operation=`UPDATE`, result_status=1 được ghi vào t_log, before_value lưu dữ liệu trước update, after_value lưu dữ liệu sau update

補足：
・Cập nhật không phải update vật lý record hiện có mà là追記 record với số lịch sử mới (機能定義 §15.3)
・Update cờ dữ liệu mới nhất của lịch sử cũ thành false, cờ dữ liệu mới nhất của lịch sử mới thành true
・Cập nhật (ghi nghiệp vụ) và audit log được thực hiện trong một transaction duy nhất

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-030 — Kiểm soát read-only của độc giả 純電子版 (thanh toán thẻ tín dụng)・併読

- 観点ID: VP-C-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Tồn tại độc giả loại độc giả=電子版 (thanh toán thẻ tín dụng) (dokusya_id=300)

### 手順

ステップ1：
Click dòng độc giả 電子版 thanh toán thẻ tín dụng từ danh sách màn hình 購読者明細検索, mở màn hình ở chế độ sửa

ステップ2：
Xác nhận khả năng nhập của từng項目 form

ステップ3：
Gửi trực tiếp PUT `/api/v1/dokusya/300` kèm nội dung sửa qua tab Network của DevTools

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả được hiển thị ở chế độ tham chiếu trong chế độ sửa

ステップ2：
購読開始日 (dokusya_kaishi_date)・購読中止日 (dokusya_chushi_date) v.v. hiển thị read-only (dữ liệu liên kết từ hệ thống quản lý độc giả bản điện tử)

ステップ3：
Phía backend từ chối việc sửa độc giả 電子版 thanh toán thẻ tín dụng (không thể sửa theo quy tắc nghiệp vụ)

補足：
・Độc giả 電子版 thuần túy (thanh toán thẻ tín dụng) do quản lý độc giả được chủ đạo phía hệ thống Web bên ngoài nên màn hình này chỉ tham chiếu (read-only) (機能定義 §15.1)
・Độc giả 電子版 thanh toán thẻ tín dụng・併読 không thể sửa・xóa (quy tắc nghiệp vụ, 機能定義 §1.2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-031 — Xung đột sửa đồng thời (optimistic lock)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở độc giả (dokusya_id=100) ở chế độ sửa trên 2 tab trình duyệt

### 手順

ステップ1：
Ở tab A đổi số phần đăng ký (dokusya_busu) rồi click button「承認・登録」(update thành công)

ステップ2：
Ở tab B (giữ dữ liệu trước khi tab A update) đổi 市町村郡 (shikuchoson) rồi click button「承認・登録」

ステップ3：
Chạy query sau trong DB, xác nhận nội dung lịch sử mới nhất
```sql
SELECT rireki_no, dokusya_busu, shikuchoson
FROM t_dokusya_rireki
WHERE dokusya_id = 100 AND saishin_data_flg = TRUE;
```

### 期待結果

ステップ1：
Xử lý update của tab A được thực hiện, message update thành công `更新しました。` được hiển thị

ステップ2：
Xung đột được phát hiện khi update tab B (trường hợp update sau thắng thì thay đổi của tab A không bị mất)

ステップ3：
Đảm bảo tính toàn vẹn dữ liệu, lịch sử có saishin_data_flg=TRUE chỉ có 1 record

補足：
・Bảng lịch sử là追記専用, record có cờ dữ liệu mới nhất (saishin_data_flg) TRUE chỉ có 1 record cho mỗi購読者ID (機能定義 §14.2)
・Việc có/không hiện thực optimistic lock theo thiết kế, nếu chưa hiện thực thì lập bug ticket riêng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Message chuyên dụng khi xung đột optimistic lock chưa được định nghĩa trong thiết kế, TC này chỉ kiểm chứng HTTP code và tính toàn vẹn dữ liệu (message chờ xác nhận thiết kế).

## ACSMS-TC-011-032 — Duyệt bản điện tử normal (denshi_shonin_status 0→1)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属, có cờ xử lý bản điện tử）
  - ・Tồn tại độc giả loại độc giả=電子版 và denshi_shonin_status=0 (chờ duyệt) (dokusya_id=200, rireki_no hiện tại=1)

### 手順

ステップ1：
Mở độc giả chờ duyệt ở chế độ sửa, click button「承認・登録」

ステップ2：
Xác nhận chuyển màn hình và message

ステップ3：
Chạy query sau trong DB, xác nhận status và lịch sử
```sql
SELECT denshi_shonin_status, rireki_no FROM t_dokusya WHERE dokusya_id = 200;

SELECT rireki_no, denshi_shonin_status, saishin_data_flg
FROM t_dokusya_rireki
WHERE dokusya_id = 200
ORDER BY rireki_no DESC;
```

### 期待結果

ステップ1：
Xử lý duyệt được thực hiện

ステップ2：
Trả về HTTP 200 (`data.denshi_shonin_status = 1`), message `承認しました。` được hiển thị

ステップ3：
denshi_shonin_status của t_dokusya được update thành 1, lịch sử mới (denshi_shonin_status=1, saishin_data_flg=true) được追記 vào t_dokusya_rireki

補足：
・Click button「承認」thì API đặt denshi_shonin_status=1 (đã duyệt) và tạo record lịch sử mới (機能定義 §3.3)
・Gọi PUT `/api/v1/dokusya/{dokusya_id}/approve`
・Duyệt (ghi nghiệp vụ) và audit log được thực hiện trong một transaction duy nhất

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-033 — Từ chối bản điện tử normal (xác nhận từ chối + denshi_shonin_status 0→2)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属, có cờ xử lý bản điện tử）
  - ・Tồn tại độc giả loại độc giả=電子版 và denshi_shonin_status=0 (chờ duyệt) (dokusya_id=201)

### 手順

ステップ1：
Mở độc giả chờ duyệt ở chế độ sửa, xác nhận hiển thị của button「承認しない」

ステップ2：
Click button「承認しない」, click「はい」ở dialog xác nhận từ chối

ステップ3：
Xác nhận chuyển màn hình và message

ステップ4：
Chạy query sau trong DB, xác nhận status và lịch sử
```sql
SELECT denshi_shonin_status FROM t_dokusya WHERE dokusya_id = 201;

SELECT denshi_shonin_status
FROM t_dokusya_rireki
WHERE dokusya_id = 201 AND saishin_data_flg = TRUE;
```

### 期待結果

ステップ1：
Do denshi_shonin_status=0 (chờ duyệt) nên button「承認しない」được hiển thị

ステップ2：
Dialog xác nhận từ chối được hiển thị (message `電子版読者の登録を否認します。よろしいですか？`), click「はい」thì xử lý từ chối được thực hiện

ステップ3：
Trả về HTTP 200 (`data.denshi_shonin_status = 2`), message `否認しました。` được hiển thị, chuyển về màn hình 購読者明細検索

ステップ4：
denshi_shonin_status của t_dokusya được update thành 2, lịch sử mới nhất của t_dokusya_rireki ghi denshi_shonin_status=2

補足：
・Chỉ khi denshi_shonin_status=0 mới hiển thị button「承認しない」(機能定義 §4.1)
・Click「承認しない」thì hiển thị dialog xác nhận từ chối (ACSMS-MSG-011-014 `電子版読者の登録を否認します。よろしいですか？`) (機能定義 §4.2)
・Click「はい」thì gọi PUT `/api/v1/dokusya/{dokusya_id}/reject` và đặt denshi_shonin_status=2 (機能定義 §4.3)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-034 — Ngắt xử lý khi click「いいえ」ở dialog xác nhận từ chối

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属, có cờ xử lý bản điện tử）
  - ・Tồn tại độc giả denshi_shonin_status=0 (chờ duyệt) (dokusya_id=202)

### 手順

ステップ1：
Mở độc giả chờ duyệt ở chế độ sửa, click button「承認しない」

ステップ2：
Click「いいえ」ở dialog xác nhận từ chối

ステップ3：
Chạy query sau trong DB, xác nhận status
```sql
SELECT denshi_shonin_status FROM t_dokusya WHERE dokusya_id = 202;
```

### 期待結果

ステップ1：
Dialog xác nhận từ chối được hiển thị

ステップ2：
Xử lý từ chối không được thực hiện, màn hình hiện tại được giữ nguyên

ステップ3：
denshi_shonin_status của t_dokusya giữ nguyên 0 (chờ duyệt) không bị thay đổi

補足：
・Khi click「いいえ」ở dialog xác nhận từ chối thì không làm gì và giữ nguyên màn hình hiện tại (機能定義 §4.4)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-035 — Lấy・hiển thị danh sách lịch sử thay đổi

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Tồn tại từ 2 lịch sử trở lên (rireki_no=1, 2) ở độc giả (dokusya_id=100)

### 手順

ステップ1：
Mở màn hình đăng ký thông tin độc giả ở chế độ sửa, click button「履歴表示」

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/100/history` qua tab Network của DevTools

ステップ3：
Xác nhận thứ tự sắp xếp danh sách lịch sử và項目 từng dòng (rireki_no・tetsuzuki_shurui・saishin_data_flg)

### 期待結果

ステップ1：
Màn hình thông tin lịch sử độc giả (danh sách lịch sử thay đổi) được hiển thị

ステップ2：
Trả về HTTP 200 (mảng `data` chứa record lịch sử)

ステップ3：
Danh sách lịch sử hiển thị theo thứ tự giảm dần của rireki_no, từng dòng hiển thị loại thủ tục (label m_code của tetsuzuki_shurui)・cờ dữ liệu mới nhất (saishin_data_flg)

補足：
・Click button「履歴表示」thì chuyển về màn hình thông tin lịch sử độc giả (ACSMS-SCR-013) (機能定義 §5.1)
・Danh sách lịch sử được lấy theo thứ tự giảm dần rireki_no
・Giá trị tetsuzuki_shurui được mapping sang label (m_code.code_category='TETSUZUKI_SHURUI')

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 6: Xử lý lỗi dùng chung (Common Error Handling)

## ACSMS-TC-011-036 — Lỗi dùng chung — UNAUTHORIZED — xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang hiển thị màn hình đăng ký thông tin độc giả
  - ・Đã quá 24 giờ từ thao tác cuối, Redis session TTL đã hết hạn

### 手順

ステップ1：
Click button「承認・登録」ở màn hình đăng ký thông tin độc giả, gửi request POST `/api/v1/dokusya`

ステップ2：
Xác nhận nội dung response và chuyển màn hình

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Phía frontend state user của Pinia auth store được clear, tự động chuyển về `/login?redirect=...`

補足：
・Khi session hết hạn thì SessionAuthGuard phía backend trả về 401, axios interceptor phía frontend dẫn đồng nhất về màn hình đăng nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-037 — Lỗi dùng chung — FORBIDDEN — gọi trực tiếp API đăng ký khi không có quyền

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Không có quyền「dokusya.create」

### 手順

ステップ1：
Từ Console của DevTools chạy `fetch('/api/v1/dokusya', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })`

ステップ2：
Xác nhận HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối ở kiểm tra quyền phía backend

ステップ2：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Role không có quyền `dokusya.create` dù gọi trực tiếp API đăng ký thì phía backend cũng trả về 403

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-038 — Lỗi dùng chung — DATA_SCOPE_VIOLATION — thử đăng ký với scope JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Giữ管理支店ID・販売店ID thuộc JA khác (ja_id=200)

### 手順

ステップ1：
Từ Console của DevTools chạy POST `/api/v1/dokusya`, chỉ định kanri_shiten_id・hanbaiten_id thuộc JA khác (ja_id=200) trong request body để gửi

ステップ2：
Xác nhận HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối ở kiểm tra DataScope phía backend

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・ja_id khi đăng ký được tự động thiết lập phía server, ja_id trong request body không được tin tưởng
・Đăng ký chỉ định tham chiếu FK (管理支店・販売店) thuộc JA khác bị từ chối bằng DATA_SCOPE_VIOLATION (403)
・Vi phạm DataScope của hệ tham chiếu (lấy chi tiết・lịch sử) bị ẩn sự tồn tại bằng 404, nhưng hệ đăng ký・cập nhật minh thị từ chối truy cập bằng 403

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-039 — Lỗi dùng chung — VALIDATION_ERROR — gửi tích hợp giá trị không hợp lệ

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở tab Network của DevTools

### 手順

ステップ1：
Từ Console của DevTools chạy POST `/api/v1/dokusya`, gửi shimei_sei rỗng・yubin_no là「123」(số chữ số sai)

ステップ2：
Xác nhận HTTP status・error_code・mảng errors của response

### 期待結果

ステップ1：
Request bị từ chối ở validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, mảng `errors` chứa message từng項目 của shimei_sei・yubin_no)

補足：
・Lỗi validation được trả về theo dạng mảng `errors` (field + message)
・Message từng項目 được hiển thị dưới từng項目 phía frontend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-040 — Lỗi dùng chung — NOT_FOUND — lấy độc giả đã xóa／không tồn tại

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・ID độc giả không tồn tại (dokusya_id=999999)

### 手順

ステップ1：
Nhập `/dokusya/999999` vào thanh địa chỉ trình duyệt, truy cập trực tiếp ở chế độ sửa

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/999999` qua tab Network của DevTools

ステップ3：
Xác nhận hiển thị message phía màn hình

### 期待結果

ステップ1：
Màn hình đăng ký thông tin độc giả ở chế độ sửa được mở

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`)

ステップ3：
Message lấy dữ liệu thất bại ACSMS-MSG-011-016 `購読者ID #{id} が見つかりません。` được hiển thị

補足：
・Lấy ID độc giả không tồn tại trả về 404 (NOT_FOUND)
・Khi lấy dữ liệu thất bại thì phía frontend hiển thị ACSMS-MSG-011-016

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-041 — Lỗi dùng chung — DUPLICATE_EMAIL — trùng địa chỉ email

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Trong JA mình đã tồn tại độc giả có email=`existing@example.com`

### 手順

ステップ1：
Chọn loại độc giả=電子版 ở chế độ tạo mới, nhập `existing@example.com` vào email (email), nhập tất cả項目 bắt buộc rồi click button「承認・登録」

ステップ2：
Xác nhận HTTP status và error_code của response

ステップ3：
Xác nhận hiển thị message phía màn hình

### 期待結果

ステップ1：
Xử lý đăng ký bị từ chối

ステップ2：
Trả về HTTP 400 (`error_code: DUPLICATE_EMAIL`, message `このメールアドレスは既に登録されています。`)

ステップ3：
Message `このメールアドレスは既に登録されています。`（ACSMS-MSG-011-009）được hiển thị, dữ liệu trùng không được đăng ký

補足：
・Khi email được nhập thì kiểm tra trùng trong JA mình (`ja_id = :ja_id`, loại trừ chuỗi rỗng) (機能定義 §2.5)
・Khi trùng thì trả về DUPLICATE_EMAIL (400)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-042 — Lỗi dùng chung — INVALID_STATUS — thử duyệt độc giả không phải chờ duyệt

- 観点ID: VP-C-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属, có cờ xử lý bản điện tử）
  - ・Tồn tại độc giả denshi_shonin_status=1 (đã duyệt) (dokusya_id=210)

### 手順

ステップ1：
Từ Console của DevTools chạy PUT `/api/v1/dokusya/210/approve`

ステップ2：
Xác nhận HTTP status và error_code của response

ステップ3：
Từ Console của DevTools chạy PUT `/api/v1/dokusya/210/reject`, xác nhận response

### 期待結果

ステップ1：
Xử lý duyệt bị từ chối

ステップ2：
Trả về HTTP 400 (`error_code: INVALID_STATUS`, message `承認待ちの読者ではありません。`)

ステップ3：
Trả về HTTP 400 (`error_code: INVALID_STATUS`, message `承認待ちの読者ではありません。`)

補足：
・Khi denshi_shonin_status khác 0 thì API duyệt・từ chối trả về INVALID_STATUS (400) (機能定義 §3.1, §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-043 — Lỗi dùng chung — BAD_REQUEST — request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở tab Network của DevTools

### 手順

ステップ1：
Từ Console của DevTools chạy `fetch('/api/v1/dokusya/abc', { credentials: 'include' })` (chỉ định dokusya_id là phi số)

ステップ2：
Xác nhận HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối ở validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

補足：
・dokusya_id path parameter được kiểm tra kiểu số, khi giá trị không hợp lệ thì được map sang BAD_REQUEST

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-044 — Lỗi dùng chung — TOO_MANY_REQUESTS — vượt giới hạn rate

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Dùng script test gửi GET `/api/v1/dokusya/1` vượt giới hạn trong 1 phút

### 手順

ステップ1：
Khởi động script, gửi request tần suất cao tới API lấy độc giả

ステップ2：
Xác nhận HTTP status và error_code của response

ステップ3：
Xác nhận hiển thị toast phía màn hình

### 期待結果

ステップ1：
Đến số lượng giới hạn thì phản hồi bình thường, sau đó trả về 429

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ3：
Toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。` được hiển thị

補足：
・NestJS @Throttle decorator + AWS WAF rate limit block ở cả 2 lớp hạ tầng／ứng dụng
・Tuân thủ quan điểm VP-A-08「レート制限・Throttling」(testcase-viewpoints.md v1.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-045 — Lỗi dùng chung — INTERNAL_SERVER_ERROR — lỗi server

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Trạng thái có thể giả lập sự cố server như lỗi kết nối DB

### 手順

ステップ1：
Ở trạng thái giả lập sự cố server (lỗi kết nối DB v.v.) click button「承認・登録」

ステップ2：
Xác nhận HTTP status và error_code của response POST `/api/v1/dokusya`

ステップ3：
Xác nhận hiển thị message phía màn hình và việc ghi error log

### 期待結果

ステップ1：
Xử lý đăng ký thất bại

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ3：
Message `システムエラーが発生しました。しばらくしてから再度お試しください。`（ACSMS-MSG-011-012）được hiển thị, error log (log_type=3, result_status=2) được ghi vào t_log, stack trace không hiển thị cho người dùng

補足：
・Sự cố server như lỗi kết nối DB được map sang INTERNAL_SERVER_ERROR
・Khi phát sinh lỗi thì ghi error log (log_type=3) ngoài transaction (ghi nghiệp vụ được rollback)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-011-046 — Lỗi dùng chung — xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id=100 所属）
  - ・Đang mở tab Network của DevTools

### 手順

ステップ1：
Thiết lập ngắt mạng (offline) ở tab Network của DevTools

ステップ2：
Click button「承認・登録」, gửi POST `/api/v1/dokusya`

ステップ3：
Xác nhận hiển thị toast phía màn hình

### 期待結果

ステップ1：
Trở thành trạng thái ngắt mạng

ステップ2：
API request trở thành lỗi mạng

ステップ3：
Toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` được hiển thị, nội dung đã nhập được giữ lại

補足：
・Khi mất kết nối mạng thì axios interceptor phía frontend hiển thị toast lỗi mạng
・Không phát sinh lỗi ngoài dự kiến, nội dung đã nhập không bị mất

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Văn bản toast lỗi mạng tuân theo hiện thực của axios interceptor phía frontend.

---

## ACSMS-TC-011-047 — Luồng chỉnh sửa của bản điện tử thuần (mở ở chế độ xem, "Thay đổi hẹn trước" bị vô hiệu)

- ID quan điểm: VP-C-05
- Loại: Normal (bình thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (thuộc ja_id=100, có quyền `dokusya.update`)
  - ・Tồn tại người đọc loại điện tử (thanh toán **không phải** thẻ tín dụng, trạng thái duyệt=1 đã duyệt), dokusya_id=301
  - ・Tồn tại người đọc loại báo giấy (dokusya_id=100) để đối chiếu

### Các bước

Bước 1:
Từ danh sách màn hình tra cứu chi tiết người đọc, bấm vào dòng bản điện tử (dokusya_id=301) để mở màn hình ở chế độ chỉnh sửa

Bước 2:
Kiểm tra trạng thái hai nút "Thay đổi trong ngày" và "Thay đổi hẹn trước" trên thanh chế độ

Bước 3:
Bấm "Thay đổi trong ngày", không sửa dữ liệu nào rồi bấm "Cập nhật"

Bước 4:
Để đối chiếu, mở người đọc báo giấy (dokusya_id=100) ở chế độ chỉnh sửa và kiểm tra trạng thái nút "Thay đổi hẹn trước"

### Kết quả mong đợi

Bước 1:
Hiển thị ở **chế độ xem** (toàn bộ trường read-only) giống báo giấy, và thanh chế độ được hiển thị. Nút cập nhật không hiển thị

Bước 2:
"Thay đổi trong ngày" bấm được, "Thay đổi hẹn trước" hiển thị **bị vô hiệu (làm mờ)**. Nút **không bị ẩn đi**. Đồng thời hiển thị chú thích "電子版は当日変更のみです（予約変更は使用できません）。"

Bước 3:
Chuyển sang chế độ thay đổi trong ngày, ngày áp dụng thay đổi thông tin là ngày hôm nay. Do không sửa trường nghiệp vụ nào nên hiển thị ACSMS-MSG-011-018 (変更がありません。) và không phát sinh cập nhật (PUT) lẫn lịch sử (t_dokusya_rireki)

Bước 4:
Ở báo giấy, "Thay đổi hẹn trước" bấm được (hạn chế chỉ áp dụng cho bản điện tử)

Bổ sung:
・Trước đây riêng bản điện tử không hiển thị thanh chế độ và mở ra là sửa được ngay (cố định thay đổi trong ngày). Cùng một màn hình lại mở ra ở chế độ xem hoặc chỉnh sửa tuỳ loại người đọc nên dễ lưu nhầm, vì vậy đã thống nhất luồng với báo giấy (định nghĩa chức năng §15.0)
・Lý do làm mờ thay vì ẩn "Thay đổi hẹn trước": nếu ẩn, người dùng sẽ hiểu nhầm "màn hình này không có chức năng thay đổi hẹn trước" và khác biệt so với báo giấy không thể hiện được trên màn hình
・Việc làm mờ chỉ là kiểm soát ở UI, nên FE còn chặn chuyển sang chế độ hẹn trước ở phía selectMode, và BE cũng từ chối `change_mode='reserved'` bằng VALIDATION_ERROR (ba lớp phòng vệ)

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-048 — Dropdown cửa hàng liên động theo loại người đọc (lọc cửa hàng dummy)

- ID quan điểm: VP-C-05
- Loại: Normal (bình thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (thuộc ja_id=100, có quyền `dokusya.create` / `dokusya.update`)
  - ・ja_id=100 có 3 cửa hàng: `1000000001` (đang hoạt động), `1000000002` (đang hoạt động), `9999999999` (dummy cho bản điện tử, đang hoạt động)
  - ・Tồn tại người đọc loại điện tử (dokusya_id=301, cửa hàng=`9999999999`)

### Các bước

Bước 1:
Mở màn hình đăng ký thông tin người đọc (tạo mới), giữ nguyên loại người đọc=1:báo giấy (mặc định) rồi mở dropdown mã cửa hàng

Bước 2:
Chọn mã cửa hàng=`1000000001`, sau đó chuyển loại người đọc sang 2:điện tử và kiểm tra hiển thị cùng danh sách gợi ý của mã cửa hàng

Bước 3:
Chuyển loại người đọc sang 3:kết hợp và kiểm tra danh sách gợi ý của mã cửa hàng

Bước 4:
Mở người đọc bản điện tử (dokusya_id=301) ở chế độ chỉnh sửa và kiểm tra hiển thị cùng danh sách gợi ý của mã cửa hàng

### Kết quả mong đợi

Bước 1:
Chỉ `1000000001` và `1000000002` xuất hiện trong danh sách, cửa hàng dummy `9999999999` **không xuất hiện**

Bước 2:
Lựa chọn mã cửa hàng bị **huỷ** (trở về rỗng) và danh sách gợi ý thay thế **chỉ còn 1 mục** là `9999999999`. `1000000001` đã chọn trước đó không còn trong danh sách

Bước 3:
Danh sách quay lại `1000000001` / `1000000002`, `9999999999` không xuất hiện. Do đã đổi loại người đọc nên lựa chọn lại bị huỷ

Bước 4:
Loại người đọc không đổi được khi chỉnh sửa, nên danh sách chỉ có 1 mục `9999999999` và lựa chọn hiện tại `9999999999` được hiển thị nguyên trạng

Bổ sung:
・Bản điện tử không giao báo giấy nên không gắn với cửa hàng có thật, nhưng `t_dokusya.hanbaiten_id` là NOT NULL. Vì vậy mỗi JA chuẩn bị một cửa hàng dummy `hanbaiten_code = 9999999999` làm nơi tiếp nhận, và bản điện tử gắn vào đó (yêu cầu khách hàng 2026-08)
・Việc lọc được thực hiện ở SQL phía BE (`GET /api/v1/hanbaiten/dropdown` với `dummy=only` / `dummy=exclude`), FE chỉ gửi lên là bên nào. Nếu FE lọc mảng gợi ý sau khi nhận thì khi phân trang sẽ trả về trang "0 mục sau khi lọc" và cuộn vô hạn bị dừng
・Lý do huỷ lựa chọn khi chuyển loại: nếu giữ lại, màn hình sẽ hiển thị một mã không có trong danh sách, và nếu cập nhật luôn thì BE sẽ nhận cửa hàng thuộc loại khác
・Độc lập với bộ lọc đang hoạt động (`active_only`). Người đọc đang gắn với cửa hàng đã đóng thì khi chỉnh sửa vẫn khôi phục lựa chọn hiện tại bằng ghim `include_id` như trước

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-049 — Sửa phương thức thanh toán và 4 trường tài khoản rút tiền trước khi duyệt/từ chối (#56524)

- ID quan điểm: VP-C-01
- Loại: Normal (bình thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (thuộc ja_id=100, có cờ xử lý bản điện tử)
  - ・Tồn tại người đọc loại điện tử với denshi_shonin_status=0 (chờ duyệt), dokusya_id=200
  - ・Phương thức thanh toán=rút tài khoản (shiharai_hoho=1), JA của mình có từ 2 chi nhánh ngân hàng (kinyu_shiten_flg=true) trở lên

### Các bước

Bước 1:
Mở người đọc đang chờ duyệt ở chế độ chỉnh sửa và kiểm tra trạng thái hoạt động của từng trường

Bước 2:
Giữ nguyên phương thức thanh toán=rút tài khoản, đổi chi nhánh tài khoản rút tiền sang chi nhánh khác, nhập loại tiền gửi=vãng lai, số tài khoản=`9876543210`, tên chủ tài khoản=`ﾀﾅｶ ﾀﾛｳ` rồi bấm nút "Duyệt・Đăng ký"

Bước 3:
Kiểm tra kết quả lưu trong DB
```sql
SELECT denshi_shonin_status, shiharai_hoho, bank_branch_code, bank_branch_name,
       hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi
FROM t_dokusya WHERE dokusya_id = 200;
```

Bước 4:
Mở một người đọc chờ duyệt khác, để trống số tài khoản rút tiền rồi bấm nút "Duyệt・Đăng ký"

Bước 5:
Mở một người đọc chờ duyệt khác, sửa tên chủ tài khoản rồi bấm nút "Không duyệt", chọn "Có" ở hộp thoại xác nhận

Bước 6:
Mở một người đọc chờ duyệt khác (phương thức thanh toán=thu tiền mặt, chưa có nơi rút tiền), đổi phương thức thanh toán sang rút tài khoản, để trống chi nhánh tài khoản rồi bấm nút "Duyệt・Đăng ký"

### Kết quả mong đợi

Bước 1:
5 trường (phương thức thanh toán, chi nhánh tài khoản rút tiền, loại tiền gửi, số tài khoản, tên chủ tài khoản) cùng đơn giá báo **hoạt động**. Các trường khác (họ tên người đọc, email, mã thành viên...) vẫn **bị vô hiệu**. Trong các lựa chọn phương thức thanh toán, thẻ tín dụng **bị vô hiệu**

Bước 2:
Hiển thị "承認しました。" và chuyển sang màn hình tra cứu chi tiết người đọc

Bước 3:
Ngoài `denshi_shonin_status=1`, 4 trường đã nhập được lưu lại. `bank_branch_code` / `bank_branch_name` là giá trị tra ngược từ chi nhánh đã chọn

Bước 4:
Duyệt vẫn thành công (khi phương thức thanh toán là rút tài khoản, số tài khoản không bắt buộc ở bước duyệt)

Bước 5:
Hiển thị "否認しました。" và cả `denshi_shonin_status=2` lẫn tên chủ tài khoản đã sửa đều được lưu

Bước 6:
API duyệt không được gọi, hiển thị "必須項目です。" ngay dưới chi nhánh tài khoản rút tiền

Bổ sung:
・Phương thức thanh toán và thông tin tài khoản của đơn đăng ký bản điện tử do chính người đọc tự khai nên hay sai. Trước đây màn hình duyệt chỉ sửa được đơn giá báo nên phải làm 2 thao tác "duyệt → sửa lại" (yêu cầu khách hàng 2026-08 / #56524)
・Bản điện tử không chọn được thẻ tín dụng (dành riêng cho liên kết hệ thống quản lý người đọc bản điện tử). Gửi thẳng `shiharai_hoho=6` vào API cũng nhận `VALIDATION_ERROR` (shiharai_hoho)
・Chi nhánh tài khoản rút tiền chỉ chọn được chi nhánh ngân hàng của JA mình. Gửi thẳng ID chi nhánh của JA khác vào API cũng nhận `VALIDATION_ERROR` (bank_shiten_id)
・Khi phương thức thanh toán khác rút tài khoản, 4 trường là tuỳ chọn (để trống vẫn duyệt được)

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-050 — 4 trường phụ thuộc của thuộc tính người đọc (kiêm cán bộ JA / liên quan nông nghiệp / nội dung khác)

- ID quan điểm: VP-B-01
- Loại: Normal (bình thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (ja_id=100, có cờ xử lý bản điện tử)
  - ・Đang mở màn hình đăng ký mới với loại người đọc=điện tử
  - ・Thuộc tính người đọc (dokusyaso_bunrui) là lựa chọn đơn (nông dân / cán bộ nhóm JA / doanh nghiệp・tổ chức / học sinh / khác)

### Các bước

Bước 1:
Chọn "Nông dân" ở thuộc tính người đọc và kiểm tra trạng thái hiển thị của checkbox "Kiêm cán bộ nhóm JA" bên phải

Bước 2:
Tick "Kiêm cán bộ nhóm JA", chọn "Gạo" và "Rau" ở sản phẩm chính rồi đăng ký

Bước 3:
Kiểm tra kết quả lưu trong DB
```sql
SELECT dokusyaso_bunrui, ja_yakushokuin_flg, nogyo_kankei_flg,
       nogyosya_bunrui, dokusyaso_bunrui_sonota, nogyosya_bunrui_sonota
FROM t_dokusya WHERE dokusya_id = :ID vừa tạo;
```

Bước 4:
Ở màn hình đăng ký mới, chọn thuộc tính người đọc "Doanh nghiệp・Tổ chức", kiểm tra hiển thị checkbox "Liên quan nông nghiệp", tick vào rồi đăng ký

Bước 5:
Ở màn hình đăng ký mới, chọn thuộc tính người đọc "Khác", nhập `自営業` vào ô "Nội dung khác" rồi đăng ký

Bước 6:
Ở màn hình đăng ký mới, chọn thuộc tính người đọc "Học sinh" và kiểm tra trạng thái hiển thị của các trường phụ thuộc

Bước 7:
Chọn thuộc tính người đọc "Nông dân" + sản phẩm chính "Khác", nhập `きのこ` vào ô "Sản phẩm chính (nội dung khác)" rồi đăng ký

### Kết quả mong đợi

Bước 1:
Checkbox "Kiêm cán bộ nhóm JA" hiển thị và hoạt động (chỉ khi thuộc tính người đọc=Nông dân)

Bước 2:
Hiển thị "登録しました。" và chuyển sang màn hình tra cứu chi tiết người đọc

Bước 3:
Lưu được `dokusyaso_bunrui='0'`, `ja_yakushokuin_flg=true`, `nogyosya_bunrui='0,1'`. `nogyo_kankei_flg` là false, `dokusyaso_bunrui_sonota` / `nogyosya_bunrui_sonota` là chuỗi rỗng

Bước 4:
Checkbox "Liên quan nông nghiệp" hiển thị và hoạt động (chỉ khi thuộc tính=Doanh nghiệp・Tổ chức), lưu được `nogyo_kankei_flg=true`

Bước 5:
Ô "Nội dung khác" hiển thị và hoạt động (chỉ khi thuộc tính=Khác), lưu được `dokusyaso_bunrui_sonota='自営業'`

Bước 6:
"Kiêm cán bộ nhóm JA", "Liên quan nông nghiệp", "Nội dung khác" đều **không hiển thị** (Học sinh không có trường phụ thuộc)

Bước 7:
Ô "Sản phẩm chính (nội dung khác)" hiển thị và hoạt động (chỉ khi sản phẩm chính có chứa "Khác"), lưu được `nogyosya_bunrui_sonota='きのこ'`

Bổ sung:
・4 trường phụ thuộc chỉ được mang giá trị khi phân loại cha chứa mã tương ứng (thiết kế DB khách hàng 2026-08)
・Nếu gửi giá trị mà không thoả điều kiện của phân loại cha, phía liên kết bản điện tử sẽ chặn cả lệnh create/update bằng validation (V26〜V30), nên cùng một cổng điều kiện được đặt ở cả màn hình lẫn API
・2 trường cờ khi thoả điều kiện thì luôn gửi 0/1 (chưa tick = 0). Nếu bỏ trống, phía bản điện tử hiểu là "không thay đổi" và thao tác bỏ tick sẽ không được phản ánh

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-051 — Kiểm tra trùng email của bản điện tử phải xuyên JA (#56568)

- ID quan điểm: VP-D-01
- Loại: Abnormal (bất thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (ja_id=100)
  - ・Ở **JA khác** (ja_id=200) tồn tại người đọc loại điện tử với email `dup@example.com`
  - ・Ở JA của mình (ja_id=100) tồn tại người đọc loại báo giấy với email `paper@example.com`
  - ・Ở JA khác (ja_id=200) tồn tại người đọc loại điện tử **đã xoá mềm** với email `deleted@example.com`

### Các bước

Bước 1:
Ở JA của mình, đăng ký mới loại điện tử với email `dup@example.com`

Bước 2:
Ở JA của mình, đăng ký mới loại điện tử với email `paper@example.com`

Bước 3:
Ở JA của mình, đăng ký mới loại điện tử với email `deleted@example.com`

Bước 4:
Ở JA của mình, đăng ký mới loại **báo giấy** với email `paper@example.com`

### Kết quả mong đợi

Bước 1:
Trả về HTTP 400 (`error_code: DUPLICATE_EMAIL`) và hiển thị thông báo lỗi ở ô email. **Bản ghi thuộc JA khác vẫn bị coi là trùng**

Bước 2:
Đăng ký thành công (đối tượng kiểm tra trùng chỉ gồm `dokusya_shubetsu IN (2,3)`, không đụng email của báo giấy)

Bước 3:
Đăng ký thành công (bản ghi đã xoá mềm nằm ngoài phạm vi kiểm tra, email được tái sử dụng)

Bước 4:
Đăng ký thành công (báo giấy trùng email với nhau vẫn được chấp nhận như trước)

Bổ sung:
・Ở bản điện tử, email là khoá định danh thành viên (ID đăng nhập) nên phải duy nhất xuyên suốt các JA (yêu cầu khách hàng 2026-08 / #56568)
・Trước đây điều kiện có kèm `ja_id = :ja_id` nên chỉ nhìn trong JA của mình, dẫn tới việc có thể tạo người đọc điện tử trùng email ở JA khác
・Cùng một logic kiểm tra cũng áp dụng cho nhập liệu hàng loạt bằng Excel (SCR-016)

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---

## ACSMS-TC-011-052 — Vùng thông tin nơi giao báo phải hiển thị với loại kết hợp (yêu cầu khách hàng 2026-08)

- ID quan điểm: VP-B-02
- Loại: Normal (bình thường)
- Điều kiện tiên quyết:
  - ・role: JA_HONTEN (ja_id=100)
  - ・Tồn tại người đọc loại **kết hợp** (dokusya_shubetsu=3)
  - ・Người đọc đó được tạo qua batch đồng bộ và có nơi giao báo lấy từ nhóm `paper_*` của bản điện tử
  - ・Tồn tại 1 người đọc loại điện tử (dokusya_shubetsu=2) để đối chiếu

### Các bước

Bước 1:
Mở người đọc loại kết hợp ở màn hình chi tiết và kiểm tra vùng "Thông tin nơi giao báo" có hiển thị không

Bước 2:
Kiểm tra mã bưu chính / tỉnh thành / quận huyện / số nhà của nơi giao báo có khớp với `paper_zip` / `paper_pref_id` / `paper_addr` / `paper_city` bên bản điện tử không
```sql
SELECT haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
       haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei
FROM t_dokusya WHERE dokusya_id = :ID của bản kết hợp;
```

Bước 3:
Kiểm tra các trường nhập trên cùng màn hình có sửa được không

Bước 4:
Mở người đọc loại điện tử (dokusya_shubetsu=2) và kiểm tra vùng "Thông tin nơi giao báo" có hiển thị không

### Kết quả mong đợi

Bước 1:
Vùng "Thông tin nơi giao báo" **được hiển thị** (trước đây bị ẩn vì xử lý chung với bản điện tử)

Bước 2:
`haitatsu_same_flg=false`, và địa chỉ giao báo khớp với giá trị lấy từ `paper_*` của bản điện tử chứ không phải địa chỉ người đọc

Bước 3:
Bản ghi loại kết hợp do hệ thống quản lý người đọc bản điện tử quản lý qua liên kết batch, nên toàn bộ trường **chỉ để xem** (API cập nhật trả `DOKUSYA_READ_ONLY` 403)

Bước 4:
Ở bản điện tử, vùng "Thông tin nơi giao báo" **không hiển thị** (vì không có giao báo)

Bổ sung:
・Loại kết hợp vẫn nhận báo giấy nên nơi giao báo là có thật. Với quy cách cũ (ẩn vùng này), không thể xem được địa chỉ giao báo đã đồng bộ trên màn hình (yêu cầu khách hàng 2026-08)
・Đối tượng bị vô hiệu hoá chỉ còn loại người đọc=điện tử

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---
