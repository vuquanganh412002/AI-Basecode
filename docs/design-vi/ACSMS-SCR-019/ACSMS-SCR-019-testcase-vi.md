---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-019
screen_name: 販売店Excelデータ取込画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-22
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-22 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

Hệ thống này là một hệ thống quản lý độc giả dạng cloud dành cho JA,
cung cấp các chức năng quản lý thông tin độc giả, lịch sử đăng ký,
quản lý dữ liệu chuyển khoản tài khoản, v.v.
Các chức năng chính: đăng ký / cập nhật / tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tài khoản,
chức năng upload / download file, quản lý thông báo của hệ thống.
Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật và giám sát như
quản lý đăng nhập của user, ghi log lịch sử đăng nhập, ghi log thao tác của user.

## 資料目的

Tài liệu mô tả chi tiết Test Specification được tạo mới trên hệ thống cho màn hình "Import dữ liệu Excel Hanbaiten (ACSMS-SCR-019)".

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-019 | Tài liệu thiết kế màn hình Import dữ liệu Excel Hanbaiten |
| 2 | ACSMS-SCR-019-api | Tài liệu thiết kế API Import dữ liệu Excel Hanbaiten |
| 3 | testcase-viewpoints | Danh sách viewpoint test chung cho toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Chức năng chọn file / chọn cột / preview | 9 |
| 5 | Chức năng download template | 3 |
| 6 | Business logic — Xử lý import (chế độ NEW) | 6 |
| 7 | Business logic — Xử lý import (chế độ UPDATE_ALL) | 4 |
| 8 | Business logic — Xử lý import (chế độ UPDATE_PARTIAL) | 3 |
| 9 | Xử lý lỗi chung (Common Error Handling) | 8 |
|  | Tổng | 48 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-019-001 — Cấm truy cập màn hình import dữ liệu Excel Hanbaiten với NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `hanbaiten.import`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "販売店Excelデータ取込" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/hanbaiten/import`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/hanbaiten/import/template`

ステップ4：
Dùng DevTools gửi POST `/api/v1/hanbaiten/import` với request body hợp lệ

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_hanbaiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Item "販売店Excelデータ取込" không hiển thị trên sidebar (do không có quyền `hanbaiten.import`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ5：
Có ghi từ 1 dòng error log trở lên, `account_id` khớp với test account, không có data mới insert vào `m_hanbaiten`

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Có ghi error log vào `t_log`

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

Critical — Nếu fail, đồng nghĩa với việc bypass RBAC, xử lý như security incident.

## ACSMS-TC-019-002 — Import dữ liệu Excel Hanbaiten bởi NICHINO_STAFF — đại diện nhập liệu được

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `hanbaiten.import`
  - ・JA mục tiêu: chuẩn bị file Excel theo template để import dưới ja-002

### 手順

ステップ1：
Kiểm tra item "販売店Excelデータ取込" trên sidebar và truy cập URL `/hanbaiten/import`

ステップ2：
Upload file Excel template của ja-002, chọn chế độ import "新規登録"

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ4：
Kiểm tra DB: `SELECT * FROM m_hanbaiten WHERE ja_id = 2 ORDER BY created_at DESC LIMIT 5`

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị (DataScope toàn JA truy cập được, có quyền đại diện nhập liệu)

ステップ2：
Preview hiển thị nội dung file đã upload, panel cột ở trạng thái mở rộng và tất cả cột đều được tick

ステップ3：
Trả về HTTP 200 (`message: "取り込みました。"`), số bản ghi import được hiển thị qua toast

ステップ4：
Có data mới được đăng ký dưới ja-002, `created_by` khớp với test account của NICHINO_STAFF

補足：
・NICHINO_STAFF có quyền `hanbaiten.daiko_input` nên có thể đại diện nhập liệu cho hanbaiten của các JA khác
・Theo quy định quản lý hanbaiten ※2 của `account_concept.md`

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

NICHINO_STAFF có thể đăng ký mới / chỉnh sửa hanbaiten của các JA thông qua đại diện nhập liệu.

## ACSMS-TC-019-003 — Import dữ liệu Excel Hanbaiten bởi CHUOKAI — chỉ import được trong phạm vi 中央会 quản lý

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・JA quản lý: ja-001, ja-002 (dưới chuokai-001)
  - ・JA của 中央会 khác: ja-099 (dưới chuokai-002)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/import`, upload file Excel template của ja-001, chọn chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ3：
Dùng DevTools gửi POST `/api/v1/hanbaiten/import` với request body chứa hanbaiten_code thuộc ja-099

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị, preview hiển thị bình thường

ステップ2：
Trả về HTTP 200, data được đăng ký mới dưới ja-001, lưu với `m_hanbaiten.ja_id = 1`

ステップ3：
Do data của ja-099 không thuộc ja_id của session CHUOKAI, trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Tầng Layer 2 DataScope từ chối import vào JA ngoài phạm vi quản lý
・Phía server lọc đồng loạt bằng `ja_id` của session, chỉ định `ja_id` của JA khác trong request sẽ bị ignore hoặc error

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

CHUOKAI chỉ chọn được 中央会 của mình (theo `account_concept.md` quản lý hanbaiten ※2).

## ACSMS-TC-019-004 — Import dữ liệu Excel Hanbaiten bởi JA_HONTEN — chỉ import được trong JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/import`, upload file Excel template của ja-001

ステップ2：
Chọn chế độ import "全項目更新", click button 取込開始 → dialog xác nhận chọn "はい"

ステップ3：
Kiểm tra DB: `SELECT ja_id, COUNT(*) FROM m_hanbaiten WHERE updated_at >= NOW() - INTERVAL '5 minutes' GROUP BY ja_id`

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị

ステップ2：
Trả về HTTP 200, chỉ record của ja_id=1 được update

ステップ3：
Chỉ record của ja_id=1 được count, record của các JA khác không bị update

補足：
・JA_HONTEN chỉ có thể import hanbaiten thuộc JA của mình
・Phía server lọc bằng `ja_id = session.ja_id`

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

## ACSMS-TC-019-005 — Import dữ liệu Excel Hanbaiten bởi JA_KANRI_SHITEN — chỉ import được trong JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/import`

ステップ2：
Upload file Excel template của ja-001, chọn chế độ import "入力箇所のみ更新"

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị

ステップ2：
Preview hiển thị bình thường, có thể chọn cột để import từ panel cột

ステップ3：
Trả về HTTP 200, chỉ record của ja_id=1 được update (do hanbaiten quản lý theo đơn vị JA)

補足：
・JA_KANRI_SHITEN có thể import hanbaiten thuộc JA của mình (theo `account_concept.md` quản lý hanbaiten ※2, hanbaiten quản lý theo đơn vị JA)
・Filter theo kanri_shiten không được áp dụng cho master hanbaiten

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


# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-019-006 — Hiển thị ban đầu — kiểm tra trạng thái mặc định

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/import`

ステップ2：
Kiểm tra trạng thái ban đầu của các vùng trên màn hình

ステップ3：
Kiểm tra trạng thái checkbox của panel cột import

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị

ステップ2：
Ô chọn file Excel hiển thị nút "ファイルを選択" và placeholder "ファイルが選択されていません", radio chế độ import đang chọn "新規登録", panel cột import ở trạng thái mở rộng, vùng preview không hiển thị

ステップ3：
Tất cả 23 checkbox đều ở trạng thái đã tick, checkbox của 販売店コード (col_01) bị disable (không thể tương tác) và đã được tick

補足：
・Trạng thái ban đầu: tất cả cột đã tick, cột bắt buộc 販売店コード không thể bỏ chọn

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

## ACSMS-TC-019-007 — Kiểm tra các option của radio group chế độ import

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/import`, kiểm tra radio group chế độ import

ステップ2：
Kiểm tra các option của radio group đang hiển thị

ステップ3：
Lần lượt click từng radio button và kiểm tra trạng thái chọn

### 期待結果

ステップ1：
3 radio button được hiển thị nằm ngang, mặc định "新規登録" đã được tick

ステップ2：
Label của các radio hiển thị theo thứ tự "新規登録"/"全項目更新"/"入力箇所のみ更新"

ステップ3：
Chỉ option được click chuyển sang trạng thái tick (exclusive), các option khác bị bỏ tick, giá trị chọn được lưu trong state (NEW / UPDATE_ALL / UPDATE_PARTIAL)

補足：
・Mapping giữa giá trị chọn và giá trị gửi server: 新規登録→NEW, 全項目更新→UPDATE_ALL, 入力箇所のみ更新→UPDATE_PARTIAL
・Yêu cầu khách hàng 2026-05-27 — chuyển từ `<select>` dropdown sang radio group (chọn nhanh 1 click)

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

## ACSMS-TC-019-008 — Kiểm tra hiển thị 23 cột header trên panel cột import

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, kiểm tra panel cột import

ステップ2：
Kiểm tra label và thứ tự của từng checkbox trên panel

### 期待結果

ステップ1：
Panel cột import được hiển thị, checkbox cho 23 cột được hiển thị

ステップ2：
Label cột được hiển thị theo thứ tự "販売店コード／販売店名称／販売店名称（カナ）／インボイス番号／郵便番号／住所／電話番号／FAX番号／所長名／委託区分／配達手数料単価／金融機関コード／金融機関名／配達手数料支払サイクル／口座支店コード／口座支店名／口座種別／口座番号／口座名義／振込手数料負担区分／手数料／備考／廃店フラグ"

補足：
・Thứ tự cột tuân theo `screen-design.md §画面項目定義` và định nghĩa cột template trong `api.md`
・Checkbox "すべて選択／解除" được hiển thị ở góc phải header panel

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

## ACSMS-TC-019-009 — Kiểm tra panel cột import luôn hiển thị

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, kiểm tra trạng thái hiển thị của panel cột import

ステップ2：
Click vào header của panel cột import (tiêu đề "◆ 取込列")

ステップ3：
Reload màn hình và kiểm tra lại trạng thái panel cột import

### 期待結果

ステップ1：
Panel cột import luôn ở trạng thái mở rộng, 23 checkbox cột đều thấy được

ステップ2：
Click header KHÔNG làm panel thu gọn (tính năng accordion đã bị bỏ)

ステップ3：
Sau reload, panel cột import vẫn ở trạng thái mở rộng

補足：
・Yêu cầu khách hàng 2026-05-27 — bỏ button mở/đóng accordion, panel luôn mở rộng (tăng tính discoverability cho việc chọn cột)

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

## ACSMS-TC-019-010 — Kiểm tra hiển thị các button

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, kiểm tra các button trên màn hình

ステップ2：
Kiểm tra trạng thái active / disable của từng button

### 期待結果

ステップ1：
2 button "テンプレート" và "取込開始" được hiển thị

ステップ2：
Button テンプレート luôn ở trạng thái active có thể click, button 取込開始 ở trạng thái disable khi chưa chọn file

補足：
・Khi click button 取込開始 lúc chưa chọn file, validation error phía client phát sinh trước

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

## ACSMS-TC-019-011 — Responsive — hiển thị ở chiều rộng mobile (375px)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đặt chiều rộng màn hình về 375px (iPhone SE) bằng DevTools

ステップ2：
Hiển thị `/hanbaiten/import`

ステップ3：
Kiểm tra hiển thị panel cột import và vùng preview

### 期待結果

ステップ1：
Chiều rộng màn hình được set về 375px

ステップ2：
Màn import dữ liệu Excel Hanbaiten hiển thị không vỡ layout

ステップ3：
Panel cột import được xếp chồng theo chiều dọc, table preview có thể scroll ngang, các button hiển thị xuống dòng

補足：
・Tất cả chức năng (chọn file / chọn cột / 取込開始) thao tác được ở chiều rộng mobile

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

## ACSMS-TC-019-012 — Kiểm tra accessibility bằng thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`

ステップ2：
Dùng phím Tab để di chuyển focus qua các UI component

ステップ3：
Khi focus vào checkbox, dùng phím Space để toggle

ステップ4：
Khi focus vào button 取込開始, dùng phím Enter để click

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị

ステップ2：
Thứ tự focus đi đúng "button chọn file Excel → radio chế độ import (新規登録／全項目更新／入力箇所のみ更新) → button template → すべて選択／解除 → từng checkbox cột → button 取込開始"

ステップ3：
Phím Space toggle checkbox (checkbox 販売店コード chỉ nhận focus, thao tác bị vô hiệu hóa)

ステップ4：
Button 取込開始 được click, nếu chưa chọn file thì validation error được hiển thị

補足：
・Tất cả chức năng có thể thao tác chỉ bằng bàn phím (yêu cầu A11y)

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


# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-019-013 — Kiểm tra hiển thị title trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`

ステップ2：
Kiểm tra title của tab browser và title của header trang

### 期待結果

ステップ1：
Màn import dữ liệu Excel Hanbaiten được hiển thị

ステップ2：
Title trang hiển thị là "販売店Excelデータ取込", tab browser hiển thị `販売店Excelデータ取込 | クラウド版購読者管理システム`

補足：
・Title khớp với `<title>` và `<h2>` trong `index.html`

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

## ACSMS-TC-019-014 — Kiểm tra hiển thị breadcrumb và thao tác chuyển trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, kiểm tra breadcrumb

ステップ2：
Click "ホーム" trên breadcrumb

ステップ3：
Quay lại `/hanbaiten/import`, click "販売店管理" trên breadcrumb

### 期待結果

ステップ1：
Breadcrumb hiển thị là "ホーム > 販売店管理 > 販売店Excelデータ取込"

ステップ2：
Chuyển về `/dashboard`

ステップ3：
Chuyển về `/hanbaiten` (màn tìm kiếm chi tiết hanbaiten — màn root của section quản lý hanbaiten)

補足：
・Segment cuối của breadcrumb (販売店Excelデータ取込) không thể click (đang ở màn này)

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

## ACSMS-TC-019-015 — Kiểm tra hiển thị bell thông báo và user profile

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Có ít nhất 1 thông báo chưa đọc

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, kiểm tra vùng header phía trên bên phải màn hình

ステップ2：
Kiểm tra dấu chấm thông báo chưa đọc trên icon bell

ステップ3：
Kiểm tra hiển thị profile "admin:日農（管理者）" (tương đương)

### 期待結果

ステップ1：
Bell thông báo và user profile được hiển thị ở header phía trên bên phải

ステップ2：
Khi có thông báo chưa đọc, dấu chấm đỏ unread hiển thị bên phải của bell

ステップ3：
`login_id:tên role` của user đã login được hiển thị (ví dụ: `ja-honten-01:JA本店`)

補足：
・Click bell thông báo hiển thị popover danh sách thông báo (kiểm tra chi tiết ở màn khác)

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


# カテゴリ 4: Chức năng chọn file / chọn cột / preview

## ACSMS-TC-019-016 — Chọn file Excel — parse bình thường và cập nhật preview

- 観点ID: VP-C-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chứa 3 dòng hanbaiten, sheet name "販売店", 23 cột header

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, click button chọn file Excel

ステップ2：
Chọn file test

ステップ3：
Kiểm tra vùng preview

### 期待結果

ステップ1：
Dialog chọn file được hiển thị, filter chỉ chấp nhận `.xlsx, .xls`

ステップ2：
File name được hiển thị, dialog đóng lại

ステップ3：
Vùng preview được hiển thị, cả 3 dòng của file test được hiển thị, header cột chỉ hiển thị các cột đã tick

補足：
・Khi chọn file, lấy sheet đầu tiên, parse dòng 1 là header, từ dòng 2 trở đi là data
・Khi parse fail, hiển thị ACSMS-MSG-007-001 (TC khác)

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

## ACSMS-TC-019-017 — Chọn file Excel — định dạng file không hợp lệ (.csv)

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: định dạng `.csv`

### 手順

ステップ1：
Click button chọn file Excel, chọn file test (có thể đổi extension thành `.csv`)

ステップ2：
Kiểm tra hành vi của màn hình

### 期待結果

ステップ1：
Do filter của dialog file, `.csv` không xuất hiện trong selection hoặc nếu chọn cũng không được chấp nhận

ステップ2：
Hiển thị toast `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。` (ACSMS-MSG-007-001)

補足：
・Filter chỉ nhận `.xlsx, .xls`
・Ngay cả khi extension là `.xlsx` nhưng nội dung bị hỏng, vẫn hiển thị cùng message

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

## ACSMS-TC-019-018 — Chọn file Excel — file trống (0 dòng data)

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chỉ có header, 0 dòng data

### 手順

ステップ1：
Click button chọn file Excel, chọn file test

ステップ2：
Kiểm tra trạng thái vùng preview

ステップ3：
Click button 取込開始

### 期待結果

ステップ1：
File được chọn

ステップ2：
Vùng preview không hiển thị hoặc không có data

ステップ3：
Validation error phía client được hiển thị, request không được gửi đến server

補足：
・Khi 0 dòng data, xử lý 取込開始 không được thực thi (screen-design.md §6.3 điều kiện ẩn)

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

## ACSMS-TC-019-019 — Cột bắt buộc (販売店コード) không thể bỏ chọn

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, thao tác checkbox của 販売店コード (col_01) trên panel cột import

ステップ2：
Kiểm tra HTML attribute trên DevTools

### 期待結果

ステップ1：
Checkbox 販売店コード bị disable (không thể tương tác), khi click trạng thái không thay đổi, luôn ở trạng thái đã tick

ステップ2：
Trên HTML, có attribute `disabled` và `checked` được set

補足：
・販売店コード là key item cho import nên luôn phải có trong selected_columns
・Phía server cũng trả validation error nếu selected_columns không chứa hanbaiten_code

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

## ACSMS-TC-019-020 — Thao tác checkbox "すべて選択／解除"

- 観点ID: VP-C-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, bỏ tick checkbox "すべて選択／解除"

ステップ2：
Kiểm tra checkbox của từng cột

ステップ3：
Tick lại "すべて選択／解除"

### 期待結果

ステップ1：
"すべて選択／解除" trở về trạng thái chưa tick

ステップ2：
Tất cả checkbox cột trừ 販売店コード (bắt buộc) đều ở trạng thái chưa tick, cột bắt buộc vẫn giữ ở trạng thái đã tick

ステップ3：
Tất cả cột (bao gồm cột bắt buộc) trở về trạng thái đã tick

補足：
・"すべて選択／解除" và các cột riêng lẻ đồng bộ 2 chiều
・Yêu cầu khách hàng 2026-05-27 — đổi label checkbox từ "すべて選択" sang "すべて選択／解除" (làm rõ semantic của thao tác bulk)

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

## ACSMS-TC-019-021 — Preview vẽ lại khi thay đổi checkbox cột

- 観点ID: VP-C-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: đã upload `.xlsx` 3 dòng hanbaiten

### 手順

ステップ1：
Xác nhận preview ban đầu hiển thị đủ 23 cột

ステップ2：
Bỏ tick checkbox "住所"/"電話番号"/"FAX番号"

ステップ3：
Kiểm tra preview lại

### 期待結果

ステップ1：
Preview hiển thị header 23 cột và 3 dòng data

ステップ2：
Checkbox được bỏ tick

ステップ3：
3 cột "住所/電話番号/FAX番号" không hiển thị trên preview, chỉ hiển thị header và data của 20 cột

補足：
・Preview vẽ lại tự động khi thay đổi checkbox (screen-design.md §5.2)

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

## ACSMS-TC-019-022 — File có 501 dòng trở lên — validation error phía client

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chứa 501 dòng data

### 手順

ステップ1：
Click button chọn file Excel, chọn file 501 dòng

ステップ2：
Kiểm tra preview

ステップ3：
Click button 取込開始

### 期待結果

ステップ1：
File được chọn

ステップ2：
Preview hiển thị 501 dòng

ステップ3：
Validation error phía client được hiển thị, request không được gửi đến server (do giới hạn 500 dòng)

補足：
・Giới hạn 500 dòng (screen-design.md §7.1)
・Phía client check trước để giảm tải network
・Phía server cũng có giới hạn tương tự (TC khác)

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

## ACSMS-TC-019-023 — Đúng 500 dòng — giá trị biên (import được)

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chứa 500 dòng data

### 手順

ステップ1：
Chọn file 500 dòng

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview hiển thị 500 dòng

ステップ2：
Trả về HTTP 200, kết quả import trả về với `total_rows: 500`, `message: "取り込みました。"`

補足：
・Giá trị biên: 500 dòng import được, 501 dòng không được (điều kiện biên)

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

## ACSMS-TC-019-024 — Button 取込開始 — hiển thị dialog xác nhận

- 観点ID: VP-C-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Đã upload file test (3 dòng)

### 手順

ステップ1：
Click button 取込開始

ステップ2：
Trên dialog xác nhận chọn "いいえ"

ステップ3：
Click lại button 取込開始, chọn "はい"

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị (message `取込処理を開始します。よろしいですか？`, ACSMS-MSG-007-002)

ステップ2：
Dialog đóng lại, xử lý import không được thực thi

ステップ3：
Dialog đóng, POST `/api/v1/hanbaiten/import` được gửi

補足：
・Dialog xác nhận bắt buộc để tránh thao tác nhầm của user

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


# カテゴリ 5: Chức năng download template

## ACSMS-TC-019-025 — Download template — luồng bình thường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten/import`, click button "テンプレート"

ステップ2：
Kiểm tra GET request trên DevTools tab Network

ステップ3：
Mở file Excel đã download

### 期待結果

ステップ1：
Dialog download file được hiển thị, tên file là `販売店Excelデータ取込_テンプレート.xlsx`

ステップ2：
GET `/api/v1/hanbaiten/import/template` được gọi, trả về HTTP 200, có chứa `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"`

ステップ3：
Sheet name là "販売店", dòng 1 chứa 23 cột header

補足：
・Thứ tự cột theo `screen-design.md §3.1` và `api.md §テンプレートファイル仕様`

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

## ACSMS-TC-019-026 — Template — kiểm tra thứ tự header 23 cột

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Đã download template

### 手順

ステップ1：
Mở template đã download, kiểm tra dòng 1

ステップ2：
Kiểm tra chuỗi header của 23 cột

### 期待結果

ステップ1：
Trên sheet "販売店", dòng 1 hiển thị 23 cột header

ステップ2：
Các header xếp theo thứ tự "販売店コード／販売店名称／販売店名称（カナ）／インボイス番号／郵便番号／住所／電話番号／FAX番号／所長名／委託区分／配達手数料単価／金融機関コード／金融機関名／配達手数料支払サイクル／口座支店コード／口座支店名／口座種別／口座番号／口座名義／振込手数料負担区分／手数料／備考／廃店フラグ"

補足：
・Dòng header bold, có set màu nền (api.md §4.3)

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

## ACSMS-TC-019-027 — Template — kiểm soát quyền truy cập với user không có quyền

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (không có quyền `hanbaiten.import`)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/hanbaiten/import/template`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`), file template không được download

補足：
・Template cũng được bảo vệ bằng cùng quyền `hanbaiten.import` như API chính

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


# カテゴリ 6: Business logic — Xử lý import (chế độ NEW)

## ACSMS-TC-019-028 — Chế độ NEW — luồng bình thường (đăng ký mới 3 dòng)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: 3 dòng hanbaiten (H001/H002/H003), các hanbaiten_code chưa đăng ký dưới ja_id=1

### 手順

ステップ1：
Upload file, chế độ import "新規登録", tất cả cột được tick

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ3：
Kiểm tra DB: `SELECT * FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code IN ('H001','H002','H003')`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE gamen_name LIKE '%ACSMS-SCR-019%' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 200, response là `import_mode: "NEW"`, `total_rows: 3`, `created_count: 3`, `updated_count: 0`, `skipped_count: 0`, `message: "取り込みました。"`

ステップ3：
3 record được đăng ký mới, `ja_id = 1`, `created_by` khớp với ID của test account

ステップ4：
Có 1 audit log được record, `operation = 'IMPORT_NEW'`, `result_status = 1`, `after_value` chứa JSON tóm tắt kết quả import

補足：
・Tất cả dòng được INSERT trong 1 transaction
・Số bản ghi import được hiển thị qua toast

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

## ACSMS-TC-019-029 — Chế độ NEW — mã trùng IMPORT_VALIDATION_ERROR

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 2 dòng — H001 (đã tồn tại) / H002 (mới)

### 手順

ステップ1：
Upload file, chế độ import "新規登録", tất cả cột được tick

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code IN ('H001','H002')`

### 期待結果

ステップ1：
Preview hiển thị 2 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`, message `Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。`), mảng `errors` chứa `{ row: 2, field: 'hanbaiten_code', message: '同一の販売店コードが既に登録されています' }`

ステップ3：
H001 (đã tồn tại) giữ nguyên, H002 (mới) không được đăng ký (toàn bộ rollback)

補足：
・Chỉ cần 1 dòng error là toàn bộ rollback (api.md §4.4 transaction constraint)
・Chi tiết error hiển thị phía FE dạng "Dòng 2: 販売店コード — 同一の販売店コードが既に登録されています"

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

## ACSMS-TC-019-030 — Chế độ NEW — mã trùng trong file

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 3 dòng — H100 (xuất hiện 2 lần) / H101 (mới), dòng 2 và 3 cùng hanbaiten_code

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview hiển thị 3 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), error chứa message thể hiện "trùng trong file", toàn bộ rollback và không đăng ký vào DB

補足：
・Trùng hanbaiten_code trong file được phát hiện qua kiểm tra trước (api.md §4.3)

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

## ACSMS-TC-019-031 — Chế độ NEW — cột bắt buộc (販売店コード) bị bỏ trống

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: chứa dòng có 販売店コード trống

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa `{ row: N, field: 'hanbaiten_code', message: '販売店コードは必須です' }`, không đăng ký vào DB

補足：
・販売店コード là key item, không được để trống

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

## ACSMS-TC-019-032 — Chế độ NEW — giá trị 委託区分 không hợp lệ

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: chứa dòng có 委託区分=5 (giá trị không hợp lệ)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa `{ row: N, field: 'itaku_kubun', message: '委託区分は 1, 2, 9 のいずれかを指定してください' }`

補足：
・Giá trị cho phép của 委託区分 là 1 (chuyển khoản), 2 (日農委託), 9 (khác) (database-design.md `m_hanbaiten.itaku_kubun`)

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

## ACSMS-TC-019-033 — Chế độ NEW — mã đơn giá phí giao hàng không tồn tại trong master

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: chứa dòng có haitatsuryo_tanka_code=`T999` (chưa đăng ký trong m_tanka)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa `{ row: N, field: 'haitatsuryo_tanka_code', message: '指定された配達手数料単価コードが見つかりません' }`, toàn bộ rollback và không đăng ký vào DB

補足：
・Mã đơn giá phí giao hàng được kiểm tra đối chiếu với m_tanka trong pre-check (api.md §4.3.2)
・Chỉ hợp lệ khi tanka_type = 2 (phí giao hàng) và thuộc JA của user

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


# カテゴリ 7: Business logic — Xử lý import (chế độ UPDATE_ALL)

## ACSMS-TC-019-034 — Chế độ UPDATE_ALL — luồng bình thường (update toàn bộ field)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・Hanbaiten đang tồn tại: H001 (住所＝"東京都中央区1-1", 電話＝"03-1111-1111")
  - ・File test: chỉ chứa H001, 住所＝"東京都港区3-3", 電話＝"03-3333-3333", tất cả cột được tick

### 手順

ステップ1：
Upload file, chế độ import "全項目更新", tất cả cột được tick

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ3：
Kiểm tra DB: `SELECT address, tel, updated_at, updated_by FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code = 'H001'`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE operation = 'IMPORT_UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Preview hiển thị 1 dòng

ステップ2：
Trả về HTTP 200, `updated_count: 1`, `created_count: 0`, `message: "取り込みました。"`

ステップ3：
住所 của H001 được update thành "東京都港区3-3", 電話 thành "03-3333-3333", `updated_at` là thời gian hiện tại, `updated_by` là ID của test account

ステップ4：
Audit log được record, `before_value` chứa data cũ, `after_value` chứa tóm tắt update

補足：
・Chế độ UPDATE_ALL ghi đè bằng NULL / empty cho cả các cột không thuộc selected_columns (api.md §4.4.2)

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

## ACSMS-TC-019-035 — Chế độ UPDATE_ALL — mã hanbaiten không tồn tại

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 3 dòng có chứa H999 (chưa đăng ký trong DB)

### 手順

ステップ1：
Upload file, chế độ import "全項目更新"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview hiển thị 3 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa `{ row: N, field: 'hanbaiten_code', message: '指定された販売店が見つかりません' }`, toàn bộ rollback và DB không thay đổi

補足：
・Trong chế độ UPDATE, hanbaiten_code chưa đăng ký bị xử lý là error "không tồn tại" (api.md §4.3.1)

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

## ACSMS-TC-019-036 — Chế độ UPDATE_ALL — cột không chọn bị ghi đè bằng empty

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Hanbaiten đang tồn tại: H002 (備考＝"重要顧客", FAX＝"03-2222-2222")
  - ・File test: chỉ H002, selected_columns không chứa "備考/FAX番号"

### 手順

ステップ1：
Upload file, chế độ import "全項目更新"

ステップ2：
Trên panel cột import, bỏ tick "備考/FAX番号"

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ4：
Kiểm tra DB: `SELECT biko, fax FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code = 'H002'`

### 期待結果

ステップ1：
Preview hiển thị 1 dòng

ステップ2：
Các cột bị bỏ tick không hiển thị trên preview

ステップ3：
Trả về HTTP 200, `updated_count: 1`

ステップ4：
備考 được ghi đè bằng empty "", FAX được ghi đè bằng empty ""

補足：
・Chế độ UPDATE_ALL ghi đè cả cột không chọn bằng NULL / empty (update phá hủy)
・Về mặt vận hành, nên hiển thị cảnh báo "Chế độ 全項目更新 ghi đè cả cột không chọn" trên màn hình

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

## ACSMS-TC-019-037 — Chế độ UPDATE_ALL — thử update hanbaiten thuộc JA khác — DATA_SCOPE_VIOLATION

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: H777 (thuộc ja_id=2, chưa đăng ký dưới JA của user)

### 手順

ステップ1：
Upload file, chế độ import "全項目更新"

ステップ2：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`, message `指定された販売店が見つかりません`), H777 thuộc ja_id=2 không bị update

補足：
・Phía server thực hiện `SELECT ... WHERE ja_id = 1 AND hanbaiten_code = 'H777'` với ja_id = 1 của session → không hit, trả về error tương đương `NOT_FOUND`
・Tầng Layer 2 DataScope khiến data của JA khác bị xử lý như NOT_FOUND

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


# カテゴリ 8: Business logic — Xử lý import (chế độ UPDATE_PARTIAL)

## ACSMS-TC-019-038 — Chế độ UPDATE_PARTIAL — luồng bình thường (update từng phần)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Hanbaiten đang tồn tại: H003 (住所＝"東京都中央区1-1", 電話＝"03-1111-1111", FAX＝"03-1111-1112", 備考＝"重要顧客")
  - ・File test: H003, 住所＝"東京都港区3-3", 電話＝"03-3333-3333" chỉ với selected_columns chứa "住所/電話番号"

### 手順

ステップ1：
Upload file, chế độ import "入力箇所のみ更新"

ステップ2：
Trên panel cột import, chỉ tick "販売店コード/住所/電話番号", các cột khác bỏ tick

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

ステップ4：
Kiểm tra DB: `SELECT address, tel, fax, biko FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code = 'H003'`

### 期待結果

ステップ1：
Preview hiển thị 1 dòng

ステップ2：
Các cột bị bỏ tick không hiển thị trên preview

ステップ3：
Trả về HTTP 200, `updated_count: 1`

ステップ4：
Chỉ 住所 và 電話 được update, FAX (`03-1111-1112`) và 備考 (`重要顧客`) giá trị cũ được giữ nguyên

補足：
・Chế độ UPDATE_PARTIAL chỉ động UPDATE các cột thuộc selected_columns (api.md §4.4.3)
・Update không phá hủy, giá trị cũ được giữ nguyên

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

## ACSMS-TC-019-039 — Chế độ UPDATE_PARTIAL — selected_columns không chứa hanbaiten_code — VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Dùng DevTools gửi trực tiếp selected_columns không chứa hanbaiten_code

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/hanbaiten/import` với `selected_columns: ['address', 'tel']` (không chứa hanbaiten_code)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, mảng `errors` chứa `{ field: 'selected_columns', message: '販売店コードを必ず含めてください' }` tương đương), DB không thay đổi

補足：
・hanbaiten_code là key item nên luôn phải có trong selected_columns (api.md §リクエストパラメータ)
・Phía FE không thể phát sinh do checkbox bị disable, phía server check phòng thủ

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

## ACSMS-TC-019-040 — Chế độ UPDATE_PARTIAL — kiểm tra item bắt buộc khi itaku_kubun=1 (chuyển khoản)

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Hanbaiten đang tồn tại: H004
  - ・File test: H004, đổi itaku_kubun=1 (chuyển khoản), bank_code v.v. để trống

### 手順

ステップ1：
Upload file, chế độ import "入力箇所のみ更新"

ステップ2：
Trên panel cột import tick "販売店コード/委託区分", các cột liên quan ngân hàng không tick

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trạng thái tick được phản ánh

ステップ3：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa các error required cho `bank_code` / `bank_name` / `bank_branch_code` / `bank_branch_name` / `yokin_shubetsu` / `koza_no`

補足：
・Khi 委託区分＝1 (chuyển khoản), thông tin ngân hàng là bắt buộc (api.md §4.1)
・Khi giá trị cũ trống và chỉ định chuyển khoản thì phát sinh error

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


# カテゴリ 9: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-019-041 — Session hết hạn — UNAUTHORIZED auto logout

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・TTL session cookie đang ở trạng thái 0 thủ công
  - ・Đã upload file test

### 手順

ステップ1：
Để màn hình `/hanbaiten/import` mở 24h, sau đó click button 取込開始 → dialog xác nhận chọn "はい"

ステップ2：
Kiểm tra hành vi của màn hình

### 期待結果

ステップ1：
POST `/api/v1/hanbaiten/import` trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
State user của Pinia auth store được clear, chuyển về `/login?redirect=/hanbaiten/import`, toast hiển thị message

補足：
・`clearSession()` của auth.store được gọi, cả Pinia và Redis sessions đều bị xóa

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

## ACSMS-TC-019-042 — Giá trị import_mode không hợp lệ — VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/hanbaiten/import` với `import_mode: 'INVALID'`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, `errors[0].field: 'import_mode'`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・import_mode chỉ chấp nhận `NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL` (class-validator `@IsIn(['NEW', 'UPDATE_ALL', 'UPDATE_PARTIAL'])`)

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

## ACSMS-TC-019-043 — Phía server ROW_LIMIT_EXCEEDED — gửi 501 dòng

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/hanbaiten/import` với `rows: [...501 items...]`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: ROW_LIMIT_EXCEEDED`, message `取込データ行数の上限（500行）を超えています。`), DB không thay đổi

補足：
・Phía server check lại giới hạn 500 dòng (chống bypass phía client, api.md §4.1)

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

## ACSMS-TC-019-044 — FILE_FORMAT_ERROR — upload file Excel bị hỏng

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: extension là `.xlsx` nhưng nội dung là file text bị hỏng

### 手順

ステップ1：
Chọn file bị hỏng, chế độ import "新規登録"

ステップ2：
Kiểm tra hành vi của màn hình

### 期待結果

ステップ1：
File bị parse fail phía FE, hiển thị toast `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。` (ACSMS-MSG-007-001)

ステップ2：
Vùng preview vẫn ẩn, request không được gửi đến server

補足：
・Excel parser phía FE (SheetJS v.v.) ném exception thì phát sinh
・Phía server cũng validation, trả về `FILE_FORMAT_ERROR` khi gửi dữ liệu dòng không hợp lệ

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

## ACSMS-TC-019-045 — Rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi liên tiếp 101 lần POST `/api/v1/hanbaiten/import` trong vòng 1 phút

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
100 lần đầu trả về HTTP 200 hoặc 400, lần thứ 101 trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ2：
Toast hiển thị message

補足：
・Giới hạn 100 req/min bằng @nestjs/throttler

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

## ACSMS-TC-019-046 — Server DB error — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: 3 dòng hanbaiten

### 手順

ステップ1：
Gửi POST `/api/v1/hanbaiten/import` trong trạng thái DB bị disconnect (DB stopped)

ステップ2：
Kiểm tra màn hình và DB log

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), toast hiển thị cùng message

ステップ2：
Transaction được rollback, không có record mới insert vào `m_hanbaiten`, error log (`log_type=3`, `result_status=2`) được record vào `t_log` (record ngoài transaction)

補足：
・Server record error log ngoài transaction, nên dù business processing bị rollback, audit log lỗi vẫn được giữ lại (api.md §4.7)

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

## ACSMS-TC-019-047 — Xử lý phía FE khi network bị ngắt

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Upload file test trên `/hanbaiten/import`

ステップ2：
Chọn "Offline" trên DevTools tab Network

ステップ3：
Click button 取込開始 → dialog xác nhận chọn "はい"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Network ở trạng thái bị ngắt

ステップ3：
Network error được catch phía FE, hiển thị toast `ネットワークエラーが発生しました。接続を確認してください。`, trạng thái màn hình không chuyển và button 取込開始 có thể click lại

補足：
・axios error.code === 'ERR_NETWORK' được detect bởi error-handler.ts
・DB không thay đổi

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

Message network error được quản lý bởi handler chung trong `src/api/error-handler.ts`.

## ACSMS-TC-019-048 — Import đồng thời 2 màn hình — kiểm tra hành vi race condition

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Browser/tab khác login cùng account (cùng session)
  - ・Cả 2 màn hình đã upload file chứa cùng hanbaiten_code H005 (chưa đăng ký trong DB)

### 手順

ステップ1：
Click button 取込開始 trên màn A → dialog xác nhận chọn "はい"

ステップ2：
Ngay sau khi A hoàn tất, click button 取込開始 trên màn B → dialog xác nhận chọn "はい"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_hanbaiten WHERE ja_id = 1 AND hanbaiten_code = 'H005'`

### 期待結果

ステップ1：
Màn A trả về HTTP 200, `created_count: 1`

ステップ2：
Màn B trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`, `errors[0].message: '同一の販売店コードが既に登録されています'`)

ステップ3：
H005 chỉ được đăng ký 1 lần (chống đăng ký 2 lần)

補足：
・Phía server xử lý theo thứ tự "check trùng → INSERT" trong transaction
・Request song song được chặn bởi unique constraint DB `UQ_m_hanbaiten_ja_code`

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
