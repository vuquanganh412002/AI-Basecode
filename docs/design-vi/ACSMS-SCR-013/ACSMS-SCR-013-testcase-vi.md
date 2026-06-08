---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-013
screen_name: 購読者履歴情報画面
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


## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA,
cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đặt báo, quản lý dữ liệu chuyển khoản tự động.
Các chức năng chính gồm: đăng ký・cập nhật・tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt báo, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng upload・download file, quản lý thông báo hệ thống.
Ngoài ra còn hỗ trợ các chức năng bảo mật・audit như quản lý đăng nhập,
ghi lịch sử đăng nhập, ghi log thao tác người dùng.

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống cho「Màn hình thông tin lịch sử độc giả（ACSMS-SCR-013）」.
Tài liệu này tham khảo ISTQB và IEEE 829, thỏa mãn các tiêu chuẩn chất lượng sau:

- Mỗi testcase được tạo dựa trên một scenario duy nhất (single responsibility).
- Thủ tục được mô tả ở mức độ có thể tái hiện, testdata được nêu rõ.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả DB query, HTTP status code v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-013 | Tài liệu thiết kế màn hình thông tin lịch sử độc giả |
| 2 | ACSMS-SCR-013-api | Tài liệu thiết kế API màn hình thông tin lịch sử độc giả |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 7 |
| 2 | Hiển thị màn hình・Responsive (Layout & Responsive) | 6 |
| 3 | Kiểm tra input (Input Validation) | 7 |
| 4 | Logic nghiệp vụ (Function) | 6 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | 合計 | 33 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-013-001 — Cấm truy cập màn hình (NICHINO_ADMIN)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Không có quyền「dokusya.view」(seeder.md §3 ma trận No.2 ×)

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者明細検索」không hiển thị trên sidebar và menu

ステップ2：
Nhập URL màn hình thông tin lịch sử độc giả (`/dokusya/1/rireki`) vào address bar trình duyệt, truy cập trực tiếp

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

### 期待結果

ステップ1：
Menu không hiển thị (do không có quyền `dokusya.view`)

ステップ2：
Toast `アクセス権がありません。` được hiển thị, và chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Cả 3 lớp (menu filter phía frontend, router guard phía frontend, API guard phía backend) đều kiểm soát truy cập

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

Theo ma trận quyền `account_concept.md`, quyền tham chiếu độc giả (dokusya.view) đối với NICHINO_ADMIN là ×.

## ACSMS-TC-013-002 — Cấm truy cập màn hình (NICHINO_STAFF)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Không có quyền「dokusya.view」(seeder.md §3 ma trận No.2 ×)

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者明細検索」không hiển thị trên sidebar và menu

ステップ2：
Nhập URL màn hình thông tin lịch sử độc giả (`/dokusya/1/rireki`) vào address bar trình duyệt, truy cập trực tiếp

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

### 期待結果

ステップ1：
Menu không hiển thị (do không có quyền `dokusya.view`)

ステップ2：
Toast `アクセス権がありません。` được hiển thị, và chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・NICHINO_STAFF không có quyền tham chiếu độc giả nên cả hiển thị màn hình và gọi API đều bị từ chối

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

## ACSMS-TC-013-003 — Cho phép truy cập màn hình (CHUOKAI・scope chuokai của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」(seeder.md §3 ma trận No.2 ○)
  - ・Độc giả (dokusya_id=1) thuộc chuokai của mình (ja_id=100) tồn tại và có từ 1 lịch sử trở lên

### 手順

ステップ1：
Sau khi đăng nhập, từ màn hình đăng ký thông tin độc giả chuyển sang màn hình thông tin lịch sử của độc giả đối tượng (dokusya_id=1)

ステップ2：
Xác nhận URL màn hình thông tin lịch sử độc giả (`/dokusya/1/rireki`)

ステップ3：
Xác nhận response của GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

### 期待結果

ステップ1：
Màn hình thông tin lịch sử độc giả được hiển thị (toast không hiển thị)

ステップ2：
Danh sách lịch sử được hiển thị

ステップ3：
Trả về HTTP 200 (bao gồm mảng `data` và object `meta`)

補足：
・CHUOKAI có quyền tham chiếu độc giả nên có thể xem lịch sử độc giả trong scope chuokai của mình

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

## ACSMS-TC-013-004 — Cho phép truy cập màn hình (JA_HONTEN・scope JA của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」(seeder.md §3 ma trận No.2 ○)
  - ・Độc giả (dokusya_id=1) thuộc JA của mình (ja_id=100) tồn tại và có từ 1 lịch sử trở lên

### 手順

ステップ1：
Sau khi đăng nhập, từ màn hình đăng ký thông tin độc giả chuyển sang màn hình thông tin lịch sử của độc giả đối tượng (dokusya_id=1)

ステップ2：
Xác nhận URL màn hình thông tin lịch sử độc giả (`/dokusya/1/rireki`)

ステップ3：
Xác nhận response của GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

### 期待結果

ステップ1：
Màn hình thông tin lịch sử độc giả được hiển thị (toast không hiển thị)

ステップ2：
Danh sách lịch sử được hiển thị

ステップ3：
Trả về HTTP 200 (bao gồm mảng `data` và object `meta`)

補足：
・JA_HONTEN có quyền tham chiếu độc giả nên có thể xem lịch sử độc giả trong scope JA của mình

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

## ACSMS-TC-013-005 — Cho phép truy cập màn hình (JA_KANRI_SHITEN・scope chi nhánh quản lý của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja_id=100 / kanri_shiten_id=10)
  - ・Có quyền「dokusya.view」(seeder.md §3 ma trận No.2 ○)
  - ・Độc giả (dokusya_id=1) thuộc chi nhánh quản lý của mình (ja_id=100 / kanri_shiten_id=10) tồn tại và có từ 1 lịch sử trở lên

### 手順

ステップ1：
Sau khi đăng nhập, từ màn hình đăng ký thông tin độc giả chuyển sang màn hình thông tin lịch sử của độc giả đối tượng (dokusya_id=1)

ステップ2：
Xác nhận URL màn hình thông tin lịch sử độc giả (`/dokusya/1/rireki`)

ステップ3：
Xác nhận response của GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

### 期待結果

ステップ1：
Màn hình thông tin lịch sử độc giả được hiển thị (toast không hiển thị)

ステップ2：
Danh sách lịch sử được hiển thị

ステップ3：
Trả về HTTP 200 (bao gồm mảng `data` và object `meta`)

補足：
・JA_KANRI_SHITEN có quyền tham chiếu độc giả nên có thể xem lịch sử độc giả trong scope chi nhánh quản lý của mình

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

## ACSMS-TC-013-006 — Vi phạm DataScope (truy cập lịch sử độc giả của JA khác・chi nhánh quản lý khác)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」
  - ・Độc giả (dokusya_id=999) của JA khác (ja_id=200) tồn tại

### 手順

ステップ1：
Nhập URL màn hình thông tin lịch sử độc giả của JA khác (`/dokusya/999/rireki`) vào address bar, truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/dokusya/999/rireki` bằng tab Network của DevTools

ステップ3：
Xác nhận DB: `SELECT ja_id FROM m_dokusya WHERE dokusya_id = 999`

### 期待結果

ステップ1：
Lịch sử độc giả của JA khác không hiển thị

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

ステップ3：
`ja_id` của độc giả đối tượng (dokusya_id=999) là 200, nằm ngoài scope (ja_id=100) của JA_HONTEN đang đăng nhập

補足：
・Khi truy cập record của JA khác hoặc chi nhánh quản lý khác, phía backend trả về DATA_SCOPE_VIOLATION (HTTP 403) qua kiểm tra DataScope

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

## ACSMS-TC-013-007 — Tấn công truy cập URL trực tiếp (dokusya_id không tồn tại)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」
  - ・Độc giả (dokusya_id=99999) không tồn tại

### 手順

ステップ1：
Nhập URL độc giả không tồn tại (`/dokusya/99999/rireki`) vào address bar, truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/dokusya/99999/rireki` bằng tab Network của DevTools

ステップ3：
Xác nhận DB: `SELECT COUNT(*) FROM m_dokusya WHERE dokusya_id = 99999 AND deleted_at IS NULL`

### 期待結果

ステップ1：
Danh sách lịch sử không hiển thị

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`)

ステップ3：
Độc giả đối tượng (dokusya_id=99999) không tồn tại trong DB (số lượng bằng 0)

補足：
・Khi truy cập URL trực tiếp với dokusya_id không tồn tại, phía backend trả về NOT_FOUND (HTTP 404)
・Router guard phía frontend không bị bypass bởi việc giả mạo ID trên address bar

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

# カテゴリ 2: Hiển thị màn hình・Responsive (Layout & Responsive)

## ACSMS-TC-013-008 — Layout tổng thể màn hình thông tin lịch sử độc giả khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có nhiều lịch sử tồn tại
  - ・Trình duyệt: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả

ステップ2：
So sánh màn hình với tài liệu thiết kế (screen-design.md / index.html) đặt cạnh nhau

ステップ3：
Xác nhận vị trí từng thành phần (vị trí header, card danh sách lịch sử, button「前の画面に戻る」, pagination)

### 期待結果

ステップ1：
Màn hình thông tin lịch sử độc giả được hiển thị

ステップ2：
Màu nền, font, cỡ chữ, padding/margin, màu button, style card đều khớp với thiết kế

ステップ3：
Từng thành phần được bố trí đúng theo thiết kế

補足：
・Không có khác biệt thị giác so với thiết kế
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

## ACSMS-TC-013-009 — Hiển thị header・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận tiêu đề bên trái header phía trên màn hình

ステップ2：
Xác nhận hiển thị breadcrumb (ホーム > 購読者管理 > 購読者履歴情報)

ステップ3：
Xác nhận hiển thị thông tin account bên phải header

### 期待結果

ステップ1：
Chữ「購読者履歴情報画面」được hiển thị

ステップ2：
Breadcrumb được hiển thị theo thứ tự `ホーム > 購読者管理 > 購読者履歴情報`

ステップ3：
Tên account・label role đang đăng nhập được hiển thị

補足：
・Header và breadcrumb do MainLayout render, không bị render trùng lặp ở phía màn hình

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

## ACSMS-TC-013-010 — Hiển thị các cột bảng danh sách lịch sử

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 1 lịch sử trở lên

### 手順

ステップ1：
Xác nhận tên các cột ở hàng header của bảng danh sách lịch sử

ステップ2：
Xác nhận hiển thị giá trị của từng hàng lịch sử

ステップ3：
Xác nhận hiển thị label của các mục giá trị code (cờ mail magazine・giới tính・loại tiền gửi tài khoản trừ・loại thủ tục)

### 期待結果

ステップ1：
Các cột danh sách lịch sử theo thiết kế (ID / 履歴番号 / 管理支店 / 支店名 / 組合員コード / 購読者名 / 購読者住所 / 連絡先１ / 連絡先２ / メールアドレス / メールマガジンフラグ（コード名称）/ 生年 / 性別 / 購読者層分類 / 農業者分類 / 購読部数 / 前回購読部数 / 配達先氏名 / 配達先郵便 / 前回配達先郵便 / 配達先住所 / 前回配達先住所 / 販売店名 / 前回販売店名 / 手続種別 / 購読開始日 / 購読中止日 / 変更適用日 / 最新データフラグ / 増減報告フラグ / 新規フラグ / 解約フラグ / 引落口座貯金種目 / 引落元口座店舗コード / 引落元口座店舗名 / 引落口座番号 / 引落口座名義) được hiển thị

ステップ2：
Mỗi hàng lịch sử hiển thị các giá trị như `rireki_no`, `shiten_name`, `kumiaiin_code`, `shoki_dokusya_kaishi_date` (định dạng `YYYY/MM/DD`) v.v.

ステップ3：
Các giá trị code (`mail_magazine_flg`, `gender`, `hikiotoshi_yokin_shubetsu`, `tetsuzuki_shurui`) được hiển thị bằng label tiếng Nhật qua `useCodesStore().label()`

補足：
・Label của giá trị code được lấy từ `m_code`, không bị hardcode
・Mục ngày được hiển thị theo định dạng `YYYY/MM/DD`

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

## ACSMS-TC-013-011 — Highlight hàng có cờ dữ liệu mới nhất

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Lịch sử của độc giả đối tượng (dokusya_id=1) có 1 record mới nhất với `saishin_data_flg = true`

### 手順

ステップ1：
Xác nhận hàng đầu tiên (hàng có số lịch sử lớn nhất) của bảng danh sách lịch sử

ステップ2：
Xác nhận hiển thị của cột `saishin_data_flg`

ステップ3：
Xác nhận highlight (màu nền v.v.) của hàng dữ liệu mới nhất

### 期待結果

ステップ1：
Số lịch sử (`rireki_no`) sắp xếp giảm dần, record mới nhất hiển thị ở đầu

ステップ2：
Cờ dữ liệu mới nhất của hàng `saishin_data_flg = true` được hiển thị là TRUE

ステップ3：
Hàng dữ liệu mới nhất được highlight để phân biệt với các hàng khác

補足：
・Record `saishin_data_flg = true` chỉ có 1 record cho mỗi độc giả
・Record mới nhất nằm ở đầu khi sắp xếp số lịch sử giảm dần

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

## ACSMS-TC-013-012 — Hoạt động responsive・horizontal scroll — PC／Tablet／Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn hình thông tin lịch sử độc giả (đang hiển thị danh sách lịch sử)

### 手順

ステップ1：
Đặt kích thước cửa sổ 1920×1080 (PC) và xác nhận hiển thị bảng danh sách lịch sử

ステップ2：
Đổi sang 768×1024 (Tablet) và xác nhận horizontal scroll của bảng

ステップ3：
Đổi sang 375×667 (Mobile) và xác nhận hiển thị bảng và pagination

### 期待結果

ステップ1：
Sidebar hiển thị cố định, bảng danh sách lịch sử hiển thị đầy đủ tất cả các cột

ステップ2：
Do số cột nhiều, horizontal scroll phát sinh trong vùng bảng, horizontal scroll của toàn màn hình không phát sinh

ステップ3：
Có thể horizontal scroll trong vùng bảng, pagination thao tác được, không vỡ layout

補足：
・Cả 3 breakpoint đều không vỡ layout
・Danh sách lịch sử có nhiều cột có thể xem đầy đủ các mục bằng horizontal scroll trong vùng bảng

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

## ACSMS-TC-013-013 — Thao tác bàn phím và thứ tự tab

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn hình thông tin lịch sử độc giả, focus ở body

### 手順

ステップ1：
Nhấn phím Tab liên tục và xác nhận chuyển focus

ステップ2：
Focus vào button「前の画面に戻る」và nhấn phím Enter

ステップ3：
Focus vào button số trang của pagination và nhấn phím Enter

### 期待結果

ステップ1：
Focus chuyển theo thứ tự button「前の画面に戻る」→ pagination

ステップ2：
Xử lý nhấn button「前の画面に戻る」được thực hiện, chuyển sang màn hình đăng ký thông tin độc giả

ステップ3：
Dữ liệu lịch sử của trang tương ứng được lấy・hiển thị

補足：
・Tất cả các phần tử thao tác đều có thể thao tác bằng bàn phím
・Thứ tự tab đúng theo thiết kế

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

# カテゴリ 3: Kiểm tra input (Input Validation)

## ACSMS-TC-013-014 — Giá trị biên của tham số page (giá trị nhỏ nhất・giá trị mặc định)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 21 lịch sử trở lên

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?page=1', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Thực thi GET `/api/v1/dokusya/1/rireki` (bỏ qua `page`) và xác nhận trang mặc định

ステップ3：
Thực thi `fetch('/api/v1/dokusya/1/rireki?page=0', { credentials: 'include' })` từ Console của DevTools (nhỏ hơn giá trị nhỏ nhất)

### 期待結果

ステップ1：
Trả về HTTP 200 (`meta.page = 1`, lịch sử trang đầu được trả về)

ステップ2：
Trả về HTTP 200 (khi bỏ qua `page` thì áp dụng giá trị mặc định `1`, trang đầu được trả về)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, `page` phải `>= 1`)

補足：
・`page` là kiểu số・`>= 1`, mặc định `1` (処理手順 4.1)
・Giá trị từ `0` trở xuống sẽ báo lỗi validation

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

## ACSMS-TC-013-015 — Giá trị biên của tham số per_page (nhỏ nhất 1・lớn nhất 100)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 101 lịch sử trở lên

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?per_page=1', { credentials: 'include' })` từ Console của DevTools (giá trị nhỏ nhất)

ステップ2：
Thực thi `fetch('/api/v1/dokusya/1/rireki?per_page=100', { credentials: 'include' })` từ Console của DevTools (giá trị lớn nhất)

ステップ3：
Thực thi `fetch('/api/v1/dokusya/1/rireki?per_page=101', { credentials: 'include' })` từ Console của DevTools (vượt giá trị lớn nhất)

ステップ4：
Thực thi `fetch('/api/v1/dokusya/1/rireki?per_page=0', { credentials: 'include' })` từ Console của DevTools (nhỏ hơn giá trị nhỏ nhất)

### 期待結果

ステップ1：
Trả về HTTP 200 (`meta.per_page = 1`, chỉ trả về 1 record)

ステップ2：
Trả về HTTP 200 (`meta.per_page = 100`, trả về tối đa 100 record)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, `per_page` phải `1 <= per_page <= 100`)

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・`per_page` là kiểu số・`1 <= per_page <= 100`, mặc định `20` (機能定義 3.1 mặc định 20, lớn nhất 100)
・Giá trị từ `0` trở xuống và từ `101` trở lên sẽ báo lỗi validation

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

## ACSMS-TC-013-016 — Giá trị mặc định của per_page khi bỏ qua (20 record)

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 21 lịch sử trở lên

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/1/rireki` (bỏ qua `per_page`) bằng tab Network của DevTools

ステップ3：
Xác nhận số lượng hiển thị của danh sách lịch sử

### 期待結果

ステップ1：
Danh sách lịch sử được hiển thị

ステップ2：
Trả về HTTP 200 (`meta.per_page = 20`)

ステップ3：
Tối đa 20 record lịch sử hiển thị trên mỗi trang

補足：
・Khi bỏ qua `per_page` thì áp dụng giá trị mặc định `20` (機能定義 3.1)

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

## ACSMS-TC-013-017 — Kiểm tra danh sách cho phép của tham số sort_by

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 1 lịch sử trở lên

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=rireki_no', { credentials: 'include' })` từ Console của DevTools (trong danh sách cho phép)

ステップ2：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=dokusya_kaishi_date', { credentials: 'include' })` từ Console của DevTools (trong danh sách cho phép)

ステップ3：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=password_hash', { credentials: 'include' })` từ Console của DevTools (ngoài danh sách cho phép)

### 期待結果

ステップ1：
Trả về HTTP 200 (lịch sử được sắp xếp theo `rireki_no`)

ステップ2：
Trả về HTTP 200 (lịch sử được sắp xếp theo `dokusya_kaishi_date`)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・Danh sách cho phép của `sort_by` là `{rireki_no, dokusya_kaishi_date, joho_henko_tekiyo_date, created_at}` (処理手順 4.1)
・Khi chỉ định tên cột ngoài danh sách cho phép sẽ báo lỗi validation, không thực hiện sort theo cột không hợp lệ

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

## ACSMS-TC-013-018 — Kiểm tra giá trị cho phép của tham số sort_order

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 2 lịch sử trở lên

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_order=asc', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_order=desc', { credentials: 'include' })` từ Console của DevTools

ステップ3：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_order=invalid', { credentials: 'include' })` từ Console của DevTools (ngoài giá trị cho phép)

### 期待結果

ステップ1：
Trả về HTTP 200 (lịch sử được trả về theo thứ tự tăng dần của số lịch sử)

ステップ2：
Trả về HTTP 200 (lịch sử được trả về theo thứ tự giảm dần của số lịch sử)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・Giá trị cho phép của `sort_order` là `{asc, desc}`, mặc định `desc` (機能定義 1.2 record mới nhất ở đầu, 処理手順 4.1)
・Giá trị khác `asc` / `desc` sẽ báo lỗi validation

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

## ACSMS-TC-013-019 — Kiểm tra kiểu của path parameter dokusya_id

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/abc/rireki', { credentials: 'include' })` từ Console của DevTools (không phải kiểu số)

ステップ2：
Xác nhận HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối bởi validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

補足：
・`dokusya_id` là kiểu số・bắt buộc (処理手順 4.1)
・Path parameter không phải kiểu số được map thành BAD_REQUEST

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

## ACSMS-TC-013-020 — Input SQL injection (tham số sort_by)

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 1 lịch sử trở lên

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=rireki_no;DROP TABLE t_dokusya_rireki;--', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Xác nhận HTTP status và error_code của response

ステップ3：
Xác nhận DB: `SELECT COUNT(*) FROM t_dokusya_rireki WHERE dokusya_id = 1`

### 期待結果

ステップ1：
Request bị từ chối bởi validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, do `sort_by` ngoài danh sách cho phép)

ステップ3：
Bảng `t_dokusya_rireki` không bị xóa, số lượng lịch sử của độc giả đối tượng không thay đổi

補足：
・`sort_by` được kiểm tra theo phương thức danh sách cho phép nên giá trị không hợp lệ chứa ký tự meta sẽ báo lỗi validation và không bị diễn giải thành cú pháp SQL
・Tất cả query được thực thi bằng parameterized query của TypeORM (cấm nối chuỗi SQL thô)

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

# カテゴリ 4: Logic nghiệp vụ (Function)

## ACSMS-TC-013-021 — Lấy danh sách lịch sử normal (giảm dần số lịch sử・kiểm tra meta)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có 3 lịch sử (`rireki_no` = 1, 2, 3)

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/1/rireki?page=1&per_page=20&sort_by=rireki_no&sort_order=desc` bằng tab Network của DevTools

ステップ3：
Xác nhận thứ tự `rireki_no` của các phần tử trong mảng `data`

ステップ4：
Xác nhận nội dung object `meta`

### 期待結果

ステップ1：
Danh sách lịch sử được hiển thị

ステップ2：
Trả về HTTP 200 (bao gồm mảng `data` và object `meta`)

ステップ3：
Các phần tử của `data` sắp xếp giảm dần theo `rireki_no` (3, 2, 1), record mới nhất hiển thị ở đầu

ステップ4：
`meta` bao gồm `total = 3`, `page = 1`, `per_page = 20`, `total_pages = 1`

補足：
・Sắp xếp giảm dần theo số lịch sử (`rireki_no`), record mới nhất hiển thị ở đầu (機能定義 1.2)
・API này là API tham chiếu nên không cần ghi log thao tác (`t_log`) (処理手順 4.7)

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

## ACSMS-TC-013-022 — Hiển thị khi lịch sử 0 record (ACSMS-MSG-013-001)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=2) tồn tại nhưng dữ liệu lịch sử là 0 record

### 手順

ステップ1：
Mở màn hình thông tin lịch sử của độc giả không có dữ liệu lịch sử (dokusya_id=2)

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/2/rireki` bằng tab Network của DevTools

ステップ3：
Xác nhận hiển thị message của màn hình

### 期待結果

ステップ1：
Không tồn tại dữ liệu trong danh sách lịch sử

ステップ2：
Trả về HTTP 200 (`data` là mảng rỗng, `meta.total = 0`)

ステップ3：
Message ACSMS-MSG-013-001 `履歴データが存在しません。` được hiển thị

補足：
・Trường hợp 0 record thì trả về `data: []`, frontend hiển thị ACSMS-MSG-013-001 (処理手順 4.6)

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

## ACSMS-TC-013-023 — Lọc dữ liệu theo DataScope (JA_KANRI_SHITEN・chỉ chi nhánh quản lý của mình)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja_id=100 / kanri_shiten_id=10)
  - ・Độc giả đối tượng (dokusya_id=1) thuộc chi nhánh quản lý của mình (ja_id=100 / kanri_shiten_id=10)
  - ・Lịch sử của độc giả đối tượng có nhiều record

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả

ステップ2：
Xác nhận response của GET `/api/v1/dokusya/1/rireki` bằng tab Network của DevTools

ステップ3：
Xác nhận DB: `SELECT COUNT(*) FROM t_dokusya_rireki WHERE dokusya_id = 1 AND ja_id = 100 AND kanri_shiten_id = 10`

### 期待結果

ステップ1：
Danh sách lịch sử được hiển thị

ステップ2：
Trả về HTTP 200 (mỗi phần tử của `data` có `ja_id = 100` và `kanri_shiten_id = 10`)

ステップ3：
Số lượng trả về ở bước 2 khớp với số lượng tổng hợp DB

補足：
・JA_KANRI_SHITEN chỉ lấy dữ liệu `ja_id = :user_ja_id AND kanri_shiten_id = :user_kanri_shiten_id` (処理手順 4.2)
・Record của chi nhánh quản lý khác không nằm trong kết quả lấy

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

## ACSMS-TC-013-024 — Lấy lại dữ liệu khi đổi trang pagination

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có từ 21 lịch sử trở lên (per_page=20 nên có từ 2 trang trở lên)

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả và xác nhận lịch sử trang 1

ステップ2：
Nhấn trang「2」của pagination

ステップ3：
Xác nhận response của GET `/api/v1/dokusya/1/rireki?page=2&per_page=20` bằng tab Network của DevTools

### 期待結果

ステップ1：
Lịch sử trang 1 (tối đa 20 record) được hiển thị

ステップ2：
Dữ liệu trang 2 được lấy và hiển thị

ステップ3：
Trả về HTTP 200 (`meta.page = 2`, lịch sử trang 2 được trả về)

補足：
・Khi nhấn trang khác thì lấy dữ liệu của trang đó và hiển thị (機能定義 3.1)

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

## ACSMS-TC-013-025 — Sort theo chỉ định sort_order (chuyển đổi tăng dần・giảm dần)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả đối tượng (dokusya_id=1) có 3 lịch sử (`rireki_no` = 1, 2, 3)

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=rireki_no&sort_order=desc', { credentials: 'include' })` từ Console của DevTools và xác nhận thứ tự `data`

ステップ2：
Thực thi `fetch('/api/v1/dokusya/1/rireki?sort_by=rireki_no&sort_order=asc', { credentials: 'include' })` từ Console của DevTools và xác nhận thứ tự `data`

ステップ3：
So sánh thứ tự `rireki_no` của hai response

### 期待結果

ステップ1：
Trả về HTTP 200 (`data` giảm dần theo `rireki_no` (3, 2, 1))

ステップ2：
Trả về HTTP 200 (`data` tăng dần theo `rireki_no` (1, 2, 3))

ステップ3：
Thứ tự sort được chuyển đổi đúng theo chỉ định `sort_order`

補足：
・Sort hoạt động đúng với tổ hợp cột (`sort_by`) trong danh sách cho phép và giá trị (`sort_order`) cho phép

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

## ACSMS-TC-013-026 — Chuyển màn hình của button「前の画面に戻る」

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đã chuyển từ màn hình đăng ký thông tin độc giả sang màn hình thông tin lịch sử độc giả

### 手順

ステップ1：
Xác nhận button「前の画面に戻る」trên màn hình thông tin lịch sử độc giả

ステップ2：
Nhấn button「前の画面に戻る」

ステップ3：
Xác nhận màn hình chuyển đến

### 期待結果

ステップ1：
Button「前の画面に戻る」hiển thị ở trạng thái active

ステップ2：
Xử lý chuyển màn hình được thực hiện mà không hiển thị dialog xác nhận

ステップ3：
Chuyển sang màn hình đăng ký thông tin độc giả

補足：
・Khi nhấn button「前の画面に戻る」thì quay lại màn hình đăng ký thông tin độc giả mà không có dialog xác nhận (機能定義 2.1)

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

# カテゴリ 5: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-013-027 — Lỗi chung — UNAUTHORIZED — Xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang hiển thị màn hình thông tin lịch sử độc giả
  - ・Đã quá 24 giờ kể từ thao tác cuối, Redis session TTL đã hết hạn

### 手順

ステップ1：
Reload màn hình thông tin lịch sử độc giả và gửi request GET `/api/v1/dokusya/1/rireki`

ステップ2：
Xác nhận nội dung response và chuyển màn hình

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Phía frontend, trạng thái user của Pinia auth store được clear và tự động chuyển về `/login` (query `?redirect=...` được thêm vào)

補足：
・Khi session hết hạn, SessionAuthGuard phía backend trả về 401, axios interceptor phía frontend đồng nhất điều hướng về màn hình đăng nhập

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

## ACSMS-TC-013-028 — Lỗi chung — BAD_REQUEST — Tham số request không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở tab Network của DevTools trình duyệt

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?page=abc', { credentials: 'include' })` từ Console của DevTools (chỉ định page không phải số)

ステップ2：
Xác nhận HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối bởi validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

補足：
・Khi kiểu của query parameter không hợp lệ thì được map thành BAD_REQUEST

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

## ACSMS-TC-013-029 — Lỗi chung — VALIDATION_ERROR — Kiểm tra hình dạng mảng errors

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở tab Network của DevTools trình duyệt

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/1/rireki?per_page=999&sort_by=invalid_col', { credentials: 'include' })` từ Console của DevTools (chỉ định nhiều tham số không hợp lệ)

ステップ2：
Xác nhận HTTP status và error_code của response

ステップ3：
Xác nhận cấu trúc mảng `errors` của response body

### 期待結果

ステップ1：
Request bị từ chối bởi validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Response body bao gồm mảng `errors`, mỗi phần tử có `field` (tên mục) và `message` (message)

補足：
・Khi có nhiều tham số không hợp lệ, mảng `errors` bao gồm chi tiết lỗi cho từng mục tương ứng
・Hình dạng mảng `errors` ở dạng mà `useApiForm` phía frontend có thể map thành hiển thị lỗi theo từng mục

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

## ACSMS-TC-013-030 — Lỗi chung — NOT_FOUND — Lấy lịch sử của độc giả đã bị xóa

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Độc giả (dokusya_id=3) đã bị xóa logical (`deleted_at IS NOT NULL`)

### 手順

ステップ1：
Nhập URL độc giả đã bị xóa (`/dokusya/3/rireki`) vào address bar, truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/dokusya/3/rireki` bằng tab Network của DevTools

ステップ3：
Xác nhận DB: `SELECT deleted_at FROM m_dokusya WHERE dokusya_id = 3`

### 期待結果

ステップ1：
Danh sách lịch sử không hiển thị

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`)

ステップ3：
`deleted_at` của độc giả đối tượng (dokusya_id=3) không phải NULL (đã bị xóa logical)

補足：
・Khi độc giả đối tượng đã bị xóa logical (`deleted_at IS NOT NULL`), query xác nhận tồn tại không khớp nên trả về NOT_FOUND (HTTP 404) (処理手順 4.3)

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

## ACSMS-TC-013-031 — Lỗi chung — TOO_MANY_REQUESTS — Vượt giới hạn rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Dùng script test gửi GET `/api/v1/dokusya/1/rireki` vượt giới hạn trong 1 phút

### 手順

ステップ1：
Khởi động script, gửi request tần suất cao đến API lấy danh sách lịch sử

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
・NestJS @Throttle decorator + AWS WAF rate limit block ở cả hai lớp hạ tầng／ứng dụng
・Tuân thủ quan điểm VP-A-08「Rate limit・Throttling」(testcase-viewpoints.md v1.1)

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

## ACSMS-TC-013-032 — Lỗi chung — INTERNAL_SERVER_ERROR — Lỗi server

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Trạng thái có thể giả lập sự cố server như lỗi kết nối DB

### 手順

ステップ1：
Mở màn hình thông tin lịch sử độc giả ở trạng thái giả lập sự cố server (lỗi kết nối DB v.v.)

ステップ2：
Xác nhận HTTP status và error_code của response GET `/api/v1/dokusya/1/rireki`

ステップ3：
Xác nhận hiển thị toast phía màn hình

### 期待結果

ステップ1：
Xử lý lấy danh sách lịch sử thất bại

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ3：
Toast `システムエラーが発生しました。しばらくしてから再度お試しください。` được hiển thị

補足：
・Sự cố server như lỗi kết nối DB được map thành INTERNAL_SERVER_ERROR (処理手順 4.7)
・Dù phát sinh lỗi ngoài dự kiến thì stack trace cũng không hiển thị cho người dùng

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

## ACSMS-TC-013-033 — Lỗi chung — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở tab Network của DevTools trình duyệt

### 手順

ステップ1：
Thiết lập ngắt kết nối mạng (offline) ở tab Network của DevTools

ステップ2：
Reload màn hình thông tin lịch sử độc giả và gửi GET `/api/v1/dokusya/1/rireki`

ステップ3：
Xác nhận hiển thị toast phía màn hình

### 期待結果

ステップ1：
Trạng thái mất kết nối mạng

ステップ2：
Request API trở thành lỗi mạng

ステップ3：
Toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` được hiển thị

補足：
・Khi mất kết nối mạng, axios interceptor phía frontend hiển thị toast lỗi mạng
・Không phát sinh lỗi ngoài dự kiến

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

Văn bản toast lỗi mạng tuân theo implementation của axios interceptor phía frontend.

---
