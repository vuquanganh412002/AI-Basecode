---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-016
screen_name: 購読者Excelデータ取込画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-04
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-06-04 | 1.0 | Kieu Thi Diem | Tạo bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |


## システム概要

Hệ thống này là một hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tài khoản, v.v. Màn hình này cung cấp chức năng import hàng loạt dữ liệu độc giả từ file Excel (đăng ký mới / cập nhật toàn bộ trường / chỉ cập nhật phần đã nhập).

## 資料目的

Tài liệu mô tả chi tiết Test Specification được tạo mới trên hệ thống cho màn hình "Import dữ liệu Excel độc giả (ACSMS-SCR-016)".

- Xác nhận từng chức năng hoạt động đúng theo spec thiết kế
- Xác nhận kiểm soát quyền truy cập và DataScope được áp dụng đúng
- Xác nhận business logic và kiểm tra giá trị nhập hoạt động đúng
- Xác nhận luồng bất thường / xử lý lỗi chung được xử lý thích hợp

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-016 | Tài liệu thiết kế màn hình Import dữ liệu Excel độc giả |
| 2 | ACSMS-SCR-016-api | Tài liệu thiết kế API Import dữ liệu Excel độc giả |
| 3 | testcase-viewpoints | Danh sách viewpoint test chung cho toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Chức năng chọn file / chọn cột / preview | 9 |
| 5 | Chức năng download template | 3 |
| 6 | Business logic — Xử lý import (chế độ NEW) | 7 |
| 7 | Business logic — Xử lý import (chế độ UPDATE_ALL) | 4 |
| 8 | Business logic — Xử lý import (chế độ UPDATE_PARTIAL) | 3 |
| 9 | Xử lý lỗi chung (Common Error Handling) | 10 |
|  | Tổng | 51 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-016-001 — Cấm truy cập màn hình import dữ liệu Excel độc giả với NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `dokusya.import`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "購読者Excelデータ取込" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/dokusya/import`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/dokusya/import/template`

ステップ4：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với request body hợp lệ

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 't_dokusya' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Item "購読者Excelデータ取込" không hiển thị trên sidebar (do không có quyền `dokusya.import`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ5：
Có ghi từ 1 dòng error log trở lên, `account_id` khớp với test account, không có data mới insert vào `t_dokusya`

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

## ACSMS-TC-016-002 — Cấm truy cập màn hình import dữ liệu Excel độc giả với NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `dokusya.import`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "購読者Excelデータ取込" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/dokusya/import`

ステップ3：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với request body hợp lệ

### 期待結果

ステップ1：
Item "購読者Excelデータ取込" không hiển thị trên sidebar (do không có quyền `dokusya.import`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・NICHINO_STAFF không có quyền import master độc giả (theo quy định quản lý độc giả của `account_concept.md`)
・Import độc giả chỉ có thể thực hiện bởi CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN

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

## ACSMS-TC-016-003 — Import dữ liệu Excel độc giả bởi CHUOKAI — chỉ import được trong phạm vi 中央会 quản lý

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・JA quản lý: ja-001, ja-002 (dưới chuokai-001)
  - ・JA của 中央会 khác: ja-099 (dưới chuokai-002)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/dokusya/import`, upload file Excel template của ja-001, chọn chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với request body chứa `kanri_shiten_id` thuộc ja-099

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị, preview hiển thị bình thường

ステップ2：
Trả về HTTP 200, data được đăng ký mới dưới ja-001, lưu với `t_dokusya.ja_id = 1`

ステップ3：
Do data của ja-099 không thuộc `ja_id` của session CHUOKAI, trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

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

CHUOKAI chỉ import được độc giả thuộc JA dưới 中央会 của mình (theo `account_concept.md` quản lý độc giả).

## ACSMS-TC-016-004 — Import dữ liệu Excel độc giả bởi JA_HONTEN — chỉ import được trong JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/dokusya/import`, upload file Excel template của ja-001

ステップ2：
Chọn chế độ import "全項目更新", click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra DB: `SELECT ja_id, COUNT(*) FROM t_dokusya WHERE updated_at >= NOW() - INTERVAL '5 minutes' GROUP BY ja_id`

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị

ステップ2：
Trả về HTTP 200, chỉ record của `ja_id=1` được update

ステップ3：
Chỉ record của `ja_id=1` được count, record của các JA khác không bị update

補足：
・JA_HONTEN chỉ có thể import độc giả thuộc JA của mình
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

## ACSMS-TC-016-005 — Import dữ liệu Excel độc giả bởi JA_KANRI_SHITEN — chỉ import được trong 管理支店 của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/dokusya/import`

ステップ2：
Upload file Excel template của ja-001 / kanri_shiten-001, chọn chế độ import "入力箇所のみ更新"

ステップ3：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị

ステップ2：
Preview hiển thị bình thường, có thể chọn cột để import từ panel cột

ステップ3：
Trả về HTTP 200, chỉ record dưới 管理支店 của mình (`kanri_shiten_id`) được update

補足：
・JA_KANRI_SHITEN có thể import độc giả thuộc 管理支店 của mình (theo `account_concept.md` quản lý độc giả)
・Độc giả được lọc theo đơn vị 管理支店 (áp dụng DataScope `kanri_shiten_id`)

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

## ACSMS-TC-016-006 — Hiển thị ban đầu — kiểm tra trạng thái mặc định

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/dokusya/import`

ステップ2：
Kiểm tra trạng thái ban đầu của các vùng trên màn hình

ステップ3：
Kiểm tra trạng thái checkbox của panel cột import

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị

ステップ2：
Ô chọn file Excel hiển thị nút "ファイルを選択" và placeholder "ファイルが選択されていません", radio chế độ import đang chọn "新規登録", button template được hiển thị, panel cột import được hiển thị, vùng preview không hiển thị

ステップ3：
Tất cả 49 checkbox cột được hiển thị, ở chế độ đăng ký mới các cột bắt buộc (`dokusya_shubetsu`／`tetsuzuki_shurui`／`kanri_shiten_id`／`dokusya_busu`／`tanka_id`／`yubin_no`／`todofuken_code`／`shikuchoson`／`chome_banchi`／`renrakusaki_1`／`hanbaiten_id`／`shiharai_hoho`／`dokusya_kaishi_date`) ở trạng thái disable (không thể tương tác) và đã được tick

補足：
・Trạng thái ban đầu là chế độ đăng ký mới, cột bắt buộc luôn đã tick và không thể chọn

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

## ACSMS-TC-016-007 — Kiểm tra các option của radio group chế độ import

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/dokusya/import`, kiểm tra radio group chế độ import

ステップ2：
Kiểm tra các option của radio button đang hiển thị

ステップ3：
Lần lượt click từng radio button và kiểm tra trạng thái chọn

### 期待結果

ステップ1：
3 radio button được hiển thị nằm ngang, mặc định "新規登録" đã được tick

ステップ2：
Label của các radio hiển thị theo thứ tự "新規登録"/"全項目更新"/"入力箇所のみ更新"

ステップ3：
Chỉ option được click chuyển sang trạng thái tick, các option khác bị bỏ tick, giá trị chọn được lưu trong state (NEW / UPDATE_ALL / UPDATE_PARTIAL)

補足：
・Mapping giữa giá trị chọn và giá trị gửi server: 新規登録→NEW, 全項目更新→UPDATE_ALL, 入力箇所のみ更新→UPDATE_PARTIAL
・Chỉ ở chế độ đăng ký mới thì cột bắt buộc mới không thể chọn

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

## ACSMS-TC-016-008 — Panel cột import — kiểm tra hiển thị 49 checkbox cột

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra panel cột import

ステップ2：
Kiểm tra trạng thái checkbox của cột bắt buộc ở chế độ đăng ký mới

ステップ3：
Kiểm tra label và thứ tự của từng checkbox trên panel

### 期待結果

ステップ1：
Panel cột import được hiển thị, checkbox cho cả 49 cột được hiển thị

ステップ2：
Ở chế độ đăng ký mới, các cột bắt buộc (`dokusya_shubetsu`／`tetsuzuki_shurui`／`kanri_shiten_id`／`dokusya_busu`／`tanka_id`／`yubin_no`／`todofuken_code`／`shikuchoson`／`chome_banchi`／`renrakusaki_1`／`hanbaiten_id`／`shiharai_hoho`／`dokusya_kaishi_date`) được hiển thị ở trạng thái disable và đã tick

ステップ3：
Label cột được hiển thị theo thứ tự của `screen-design.md §画面項目定義` và định nghĩa cột template trong `api.md`

補足：
・Thứ tự cột khớp với file template (cố định 49 cột)
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

## ACSMS-TC-016-009 — Kiểm tra vùng preview ẩn ban đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra trạng thái hiển thị của vùng preview

ステップ2：
Kiểm tra phần dưới màn hình ở trạng thái chưa chọn file

### 期待結果

ステップ1：
Khi chưa chọn file, vùng preview không hiển thị

ステップ2：
Table preview không được vẽ, có hiển thị hướng dẫn rằng preview sẽ hiển thị sau khi chọn file

補足：
・Preview chỉ hiển thị các cột đã tick sau khi chọn file

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

## ACSMS-TC-016-010 — Kiểm tra hiển thị nhóm button

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra các button trên màn hình

ステップ2：
Kiểm tra trạng thái active / disable của từng button

### 期待結果

ステップ1：
2 button "テンプレート" và "取込開始" được hiển thị

ステップ2：
Button template luôn ở trạng thái active có thể click, button 取込開始 ở trạng thái disable khi chưa chọn file

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

## ACSMS-TC-016-011 — Responsive — hiển thị ở chiều rộng mobile (375px)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đặt chiều rộng màn hình về 375px (iPhone SE) bằng DevTools

ステップ2：
Hiển thị `/dokusya/import`

ステップ3：
Kiểm tra hiển thị panel cột import và vùng preview

### 期待結果

ステップ1：
Chiều rộng màn hình được set về 375px

ステップ2：
Màn import dữ liệu Excel độc giả hiển thị không vỡ layout

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

## ACSMS-TC-016-012 — Kiểm tra accessibility bằng thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`

ステップ2：
Dùng phím Tab để di chuyển focus qua các UI component

ステップ3：
Khi focus vào checkbox, dùng phím Space để toggle on/off

ステップ4：
Khi focus vào button 取込開始, dùng phím Enter để click

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị

ステップ2：
Thứ tự focus di chuyển đúng theo "button chọn file Excel → radio chế độ import (新規登録／全項目更新／入力箇所のみ更新) → button template → すべて選択／解除 → từng checkbox cột → button 取込開始"

ステップ3：
Nhấn phím Space toggle checkbox (checkbox cột bắt buộc ở chế độ đăng ký mới chỉ nhận focus, thao tác bị vô hiệu hóa)

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

## ACSMS-TC-016-013 — Kiểm tra hiển thị title trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`

ステップ2：
Kiểm tra title của tab browser và title của header trang

### 期待結果

ステップ1：
Màn import dữ liệu Excel độc giả được hiển thị

ステップ2：
Title trang hiển thị là "購読者Excelデータ取込", tab browser hiển thị `購読者Excelデータ取込 | クラウド版購読者管理システム`

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

## ACSMS-TC-016-014 — Kiểm tra hiển thị breadcrumb và thao tác chuyển trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra breadcrumb

ステップ2：
Click "ホーム" trên breadcrumb

ステップ3：
Quay lại `/dokusya/import`, kiểm tra segment cuối của breadcrumb

### 期待結果

ステップ1：
Breadcrumb hiển thị là "ホーム > 購読者Excelデータ取込"

ステップ2：
Chuyển về `/dashboard`

ステップ3：
Segment cuối của breadcrumb (購読者Excelデータ取込) không thể click (màn đang hiển thị)

補足：
・Breadcrumb chuyển trang theo named route

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

## ACSMS-TC-016-015 — Kiểm tra hiển thị tên user đã login trên header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra vùng header phía trên bên phải màn hình

ステップ2：
Kiểm tra hiển thị profile

### 期待結果

ステップ1：
User profile được hiển thị ở phía trên bên phải màn hình

ステップ2：
`login_id:tên role` của user đã login được hiển thị (ví dụ: `ja-honten-01:JA本店`)

補足：
・Vùng header do MainLayout quản lý, các màn không vẽ lặp lại

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

## ACSMS-TC-016-016 — Chọn file Excel — parse bình thường và cập nhật preview

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chứa 3 dòng độc giả, sheet name "購読者", 49 cột header

### 手順

ステップ1：
Truy cập `/dokusya/import`, click button chọn file Excel

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
・Khi parse fail, hiển thị ACSMS-MSG-016-001 (TC khác)

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

## ACSMS-TC-016-017 — Chọn file Excel — định dạng file không hợp lệ (.csv)

- 観点ID: VP-B-03
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
Hiển thị toast `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。` (ACSMS-MSG-016-001)

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

## ACSMS-TC-016-018 — Preview vẽ lại khi thay đổi checkbox cột

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: đã upload `.xlsx` 3 dòng độc giả

### 手順

ステップ1：
Xác nhận preview ban đầu hiển thị đủ 49 cột

ステップ2：
Bỏ tick 3 cột bất kỳ như "住所（市町村郡）"/"連絡先2"/"備考"

ステップ3：
Kiểm tra preview lại

### 期待結果

ステップ1：
Preview hiển thị header 49 cột và 3 dòng data

ステップ2：
Checkbox được bỏ tick

ステップ3：
3 cột bị bỏ tick không hiển thị trên preview, chỉ hiển thị header và data của 46 cột

補足：
・Preview vẽ lại tự động khi thay đổi checkbox
・Cột bắt buộc ở chế độ đăng ký mới không thể bỏ tick, nên đối tượng là cột tùy chọn

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

## ACSMS-TC-016-019 — Chế độ đăng ký mới — không thể bỏ tick cột bắt buộc

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, chọn chế độ import "新規登録"

ステップ2：
Thao tác checkbox của cột bắt buộc như 購読種別 (`dokusya_shubetsu`) trên panel cột import

ステップ3：
Kiểm tra HTML attribute trên DevTools

### 期待結果

ステップ1：
Chế độ import được set về đăng ký mới

ステップ2：
Checkbox của cột bắt buộc ở trạng thái disable, dù click trạng thái cũng không thay đổi, luôn ở trạng thái đã tick

ステップ3：
Checkbox được hiển thị ở trạng thái không thể chọn (disable) và đã tick

補足：
・Cột bắt buộc ở chế độ đăng ký mới: `dokusya_shubetsu`／`tetsuzuki_shurui`／`kanri_shiten_id`／`dokusya_busu`／`tanka_id`／`yubin_no`／`todofuken_code`／`shikuchoson`／`chome_banchi`／`renrakusaki_1`／`hanbaiten_id`／`shiharai_hoho`／`dokusya_kaishi_date`
・Phía server cũng trả validation error nếu `selected_columns` không chứa cột bắt buộc

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

## ACSMS-TC-016-020 — 取込開始 khi chưa chọn file

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Chưa chọn file

### 手順

ステップ1：
Truy cập `/dokusya/import`, kiểm tra trạng thái button 取込開始 khi chưa chọn file

ステップ2：
Trên DevTools gỡ disable của button 取込開始 rồi thử click

### 期待結果

ステップ1：
Khi chưa chọn file, button 取込開始 ở trạng thái disable

ステップ2：
Khi click, hiển thị toast `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。` (ACSMS-MSG-016-001), request không được gửi đến server

補足：
・Khi chưa chọn file, phía client validate trước, xử lý import không được thực thi

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

## ACSMS-TC-016-021 — Data 30001 dòng trở lên — vượt giới hạn số dòng

- 観点ID: VP-D-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: `.xlsx` chứa 30001 dòng data

### 手順

ステップ1：
Click button chọn file Excel, chọn file 30001 dòng

ステップ2：
Kiểm tra preview

ステップ3：
Click button 取込開始

### 期待結果

ステップ1：
File được chọn

ステップ2：
Preview hiển thị 30001 dòng (hoặc hiển thị hướng dẫn vượt giới hạn)

ステップ3：
Hiển thị toast `ファイルの行数が上限（30000行）を超えているため、取込みできません。` (ACSMS-MSG-016-006), request không được gửi đến server

補足：
・Giới hạn 30000 dòng (giá trị biên: 30000 dòng import được, 30001 dòng không được)
・Phía client check trước để giảm tải network
・Phía server cũng trả `ROW_LIMIT_EXCEEDED` (TC khác)

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

## ACSMS-TC-016-022 — Kiểm tra số chữ số mã bưu điện 7 chữ số · mã 都道府県 2 chữ số

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: chứa dòng có `yubin_no`="123" (sai số chữ số), `todofuken_code`="100" (sai số chữ số)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'yubin_no', message: '郵便番号は7桁の半角数字で入力してください' }` và `{ row: N, field: 'todofuken_code', message: '都道府県コードは2桁で指定してください' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005)

補足：
・Mã bưu điện là 7 chữ số sau khi bỏ dấu gạch ngang, 都道府県 là mã 2 chữ số
・Rollback toàn bộ và không đăng ký vào DB

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

## ACSMS-TC-016-023 — 購読種別=3 (đọc kèm) không thể import Excel

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: chứa dòng có `dokusya_shubetsu`=3 (đọc kèm)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'dokusya_shubetsu', message: '併読はExcel取込できません' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005), rollback toàn bộ và không đăng ký vào DB

補足：
・購読種別=3 (đọc kèm) không thuộc đối tượng import từ màn hình (business rule)
・Đăng ký đọc kèm được thực hiện bằng nhập tay ở màn khác

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

## ACSMS-TC-016-024 — Giá trị biên của 購読部数 (mới>0 · hủy=0)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: chứa các dòng có `dokusya_busu`=0 ở dòng đăng ký mới, `dokusya_busu`=0 ở dòng hủy

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra kết quả import của dòng hủy (手続種類＝hủy) và `dokusya_busu`=0

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Với dòng đăng ký mới có `dokusya_busu`=0, trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'dokusya_busu', message: '購読部数は1以上で入力してください' }`

ステップ3：
Dòng hủy có `dokusya_busu`=0 được xử lý như giá trị hợp lệ (điều kiện biên: đăng ký mới `dokusya_busu`>0, hủy `dokusya_busu`=0)

補足：
・Giá trị cho phép của 購読部数: đăng ký mới `dokusya_busu`>0, hủy `dokusya_busu`=0 (business rule)

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

## ACSMS-TC-016-025 — Download template — luồng bình thường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/dokusya/import`, click button "テンプレート"

ステップ2：
Kiểm tra GET request trên DevTools tab Network

ステップ3：
Mở file Excel đã download

### 期待結果

ステップ1：
Dialog download file được hiển thị, tên file là `購読者Excelデータ取込_テンプレート.xlsx`

ステップ2：
GET `/api/v1/dokusya/import/template` được gọi, trả về HTTP 200, có chứa `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="購読者Excelデータ取込_テンプレート.xlsx"`

ステップ3：
Sheet name là "購読者", dòng 1 chứa 49 cột header

補足：
・Thứ tự cột theo `screen-design.md §3.1` và `api.md §テンプレートファイル仕様` (cố định 49 cột)

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

## ACSMS-TC-016-026 — Template — kiểm tra thứ tự · số lượng 49 cột header

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
Kiểm tra chuỗi header và số lượng của 49 cột

### 期待結果

ステップ1：
Trên sheet "購読者", dòng 1 hiển thị 49 cột header

ステップ2：
Các header xếp theo thứ tự định nghĩa của `screen-design.md §画面項目定義` và `api.md §テンプレートファイル仕様`, số cột đúng bằng 49 cột

補足：
・Dòng header bold, có set màu nền (api.md §テンプレートファイル仕様)

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

## ACSMS-TC-016-027 — Template — kiểm soát quyền truy cập với user không có quyền

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (không có quyền `dokusya.import`)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/dokusya/import/template`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`), file template không được download

補足：
・Template cũng được bảo vệ bằng cùng quyền `dokusya.import` như API chính

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

## ACSMS-TC-016-028 — Chế độ NEW — luồng bình thường (đăng ký mới 3 dòng)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: 3 dòng độc giả, độc giả chưa đăng ký dưới ja_id=1

### 手順

ステップ1：
Upload file, chế độ import "新規登録", các cột bắt buộc đã tick

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra DB: `SELECT * FROM t_dokusya WHERE ja_id = 1 ORDER BY created_at DESC LIMIT 3`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_dokusya_rireki ORDER BY created_at DESC LIMIT 3`

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE gamen_name LIKE '%ACSMS-SCR-016%' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Preview được hiển thị, dialog xác nhận `取込処理を開始します。よろしいですか？` được hiển thị (ACSMS-MSG-016-002)

ステップ2：
Trả về HTTP 200, response là `import_mode: "NEW"`, `created_count: 3`, hiển thị toast `取り込みました。` (ACSMS-MSG-016-004), số bản ghi import được hiển thị qua toast

ステップ3：
3 record được đăng ký mới vào `t_dokusya`, `ja_id = 1`, `created_by` khớp với ID của user đã login

ステップ4：
`t_dokusya_rireki` được thêm số record lịch sử bằng số bản ghi import (3 record)

ステップ5：
Có 1 audit log được record, `result_status = 1`, `after_value` chứa JSON tóm tắt kết quả import

補足：
・Tất cả dòng được INSERT vào `t_dokusya` trong 1 transaction, audit log (`result_status=1`) được record trong cùng transaction
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

## ACSMS-TC-016-029 — Chế độ NEW — dialog xác nhận "キャンセル"

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・Đã upload file test (3 dòng)

### 手順

ステップ1：
Click button 取込開始

ステップ2：
Nhấn "キャンセル" trên dialog xác nhận

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE created_at >= NOW() - INTERVAL '5 minutes'`

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị (message `取込処理を開始します。よろしいですか？`, ACSMS-MSG-016-002)

ステップ2：
Dialog đóng lại, xử lý import không được thực thi, POST `/api/v1/dokusya/import` không được gửi

ステップ3：
Không có record mới được đăng ký

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

## ACSMS-TC-016-030 — Chế độ NEW — có data đã tồn tại IMPORT_VALIDATION_ERROR

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 2 dòng — độc giả đã tồn tại (đã đăng ký) / độc giả mới

### 手順

ステップ1：
Upload file, chế độ import "新規登録", các cột bắt buộc đã tick

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE ja_id = 1 AND created_at >= NOW() - INTERVAL '5 minutes'`

### 期待結果

ステップ1：
Preview hiển thị 2 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`, message `Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。`), mảng `errors` chứa lỗi theo từng dòng, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005)

ステップ3：
Data đã tồn tại giữ nguyên, dòng mới cũng không được đăng ký (rollback toàn bộ)

補足：
・Ở chế độ đăng ký mới, dòng có data đã tồn tại được xử lý như lỗi
・Chỉ cần 1 dòng error là rollback toàn bộ (transaction constraint)

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

## ACSMS-TC-016-031 — Chế độ NEW — bản điện tử và thanh toán thẻ tín dụng không thể import

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: chứa dòng có `dokusya_shubetsu`=2 (bản điện tử) và `shiharai_hoho`=thẻ tín dụng

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'shiharai_hoho', message: '電子版かつクレジットカード払いは取込できません' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005), rollback toàn bộ và không đăng ký vào DB

補足：
・購読種別=2 (bản điện tử) và 支払方法=thẻ tín dụng không thuộc đối tượng import (business rule)

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

## ACSMS-TC-016-032 — Chế độ NEW — 新聞単価 không tồn tại trong master

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: chứa dòng có mã 新聞単価 chưa đăng ký trong m_tanka (tanka_type=1)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'tanka_id', message: '指定された新聞単価が見つかりません' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005), rollback toàn bộ và không đăng ký vào DB

補足：
・新聞単価 được kiểm tra bằng đối chiếu với m_tanka (`tanka_type=1`)
・Chỉ đơn giá hợp lệ dưới JA của mình mới là đối tượng đối chiếu

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

## ACSMS-TC-016-033 — Chế độ NEW — giới hạn hiển thị lỗi theo từng dòng (tối đa 10 dòng)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: cả 12 dòng đều chứa lỗi giá trị nhập nào đó

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra số lượng lỗi hiển thị trên màn hình

### 期待結果

ステップ1：
Preview hiển thị 12 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005)

ステップ3：
Lỗi theo từng dòng hiển thị trên màn hình tối đa 10 dòng, rollback toàn bộ và không đăng ký vào DB

補足：
・Lỗi theo từng dòng hiển thị tối đa 10 dòng trên màn hình (đảm bảo tính dễ nhìn khi có nhiều lỗi)

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

## ACSMS-TC-016-034 — Chế độ NEW — rollback toàn bộ khi có lỗi một phần

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 3 dòng (dòng 1 · dòng 2 bình thường, dòng 3 có lỗi giá trị nhập)

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE ja_id = 1 AND created_at >= NOW() - INTERVAL '5 minutes'`

### 期待結果

ステップ1：
Preview hiển thị 3 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa lỗi của dòng 3, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005)

ステップ3：
Kể cả dòng 1 · dòng 2 bình thường cũng không có dòng nào được đăng ký (số bản ghi import=0, rollback toàn bộ)

補足：
・Chỉ cần 1 dòng error là rollback toàn bộ (không import từng phần)
・`t_dokusya_rireki` cũng không được thêm lịch sử

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

## ACSMS-TC-016-035 — Chế độ UPDATE_ALL — luồng bình thường (cập nhật toàn bộ trường · ô trống→NULL)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・Độc giả đã tồn tại: 連絡先2="03-2222-2222", 備考="重要顧客"
  - ・File test: cùng độc giả, 連絡先2 và 備考 để trống, tất cả cột đã tick

### 手順

ステップ1：
Upload file, chế độ import "全項目更新", tất cả cột đã tick

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra DB: `SELECT renrakusaki_2, biko, updated_at, updated_by FROM t_dokusya WHERE ja_id = 1 ORDER BY updated_at DESC LIMIT 1`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_dokusya_rireki ORDER BY created_at DESC LIMIT 1`

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 200, `import_mode: "UPDATE_ALL"`, `updated_count: 1`, hiển thị toast `取り込みました。` (ACSMS-MSG-016-004)

ステップ3：
連絡先2 và 備考 được ghi đè bằng ô trống (NULL hoặc chuỗi rỗng), `updated_at` là thời gian hiện tại, `updated_by` là ID của user đã login

ステップ4：
`t_dokusya_rireki` được thêm record lịch sử

補足：
・Chế độ UPDATE_ALL cập nhật toàn bộ trường, là cập nhật phá hủy ghi đè trường để trống trong Excel bằng NULL (hoặc chuỗi rỗng)

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

## ACSMS-TC-016-036 — Chế độ UPDATE_ALL — không tồn tại IMPORT_VALIDATION_ERROR

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 3 dòng chứa độc giả chưa đăng ký trong DB

### 手順

ステップ1：
Upload file, chế độ import "全項目更新"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview hiển thị 3 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'dokusya', message: '指定された購読者が見つかりません' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005), rollback toàn bộ và DB không thay đổi

補足：
・Ở chế độ UPDATE, dòng không tồn tại được xử lý như lỗi "không tồn tại"

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

## ACSMS-TC-016-037 — Chế độ UPDATE_ALL — hiển thị dialog xác nhận

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã upload file test (1 dòng độc giả đã tồn tại)

### 手順

ステップ1：
Chọn chế độ import "全項目更新", click button 取込開始

ステップ2：
Nhấn "キャンセル" trên dialog xác nhận

ステップ3：
Click lại button 取込開始, nhấn "実行"

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị (message `取込処理を開始します。よろしいですか？`, ACSMS-MSG-016-002)

ステップ2：
Dialog đóng lại, xử lý import không được thực thi

ステップ3：
Dialog đóng, POST `/api/v1/dokusya/import` được gửi với `import_mode: "UPDATE_ALL"`

補足：
・Cập nhật toàn bộ trường là cập nhật phá hủy nên dialog xác nhận đặc biệt quan trọng

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

## ACSMS-TC-016-038 — Chế độ UPDATE_ALL — kiểm tra record audit log

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã upload file test cập nhật 1 dòng độc giả đã tồn tại

### 手順

ステップ1：
Chế độ import "全項目更新", click button 取込開始 → dialog xác nhận "実行"

ステップ2：
Kiểm tra DB: `SELECT * FROM t_log WHERE gamen_name LIKE '%ACSMS-SCR-016%' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 200, `updated_count: 1`, hiển thị toast `取り込みました。` (ACSMS-MSG-016-004)

ステップ2：
Audit log được record, `result_status = 1`, `before_value` chứa data cũ, `after_value` chứa JSON tóm tắt cập nhật, `ja_id = 1` được record

補足：
・Xử lý import và record audit log được thực thi trong cùng 1 transaction

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

## ACSMS-TC-016-039 — Chế độ UPDATE_PARTIAL — luồng bình thường (cập nhật một phần)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Độc giả đã tồn tại: 連絡先1="03-1111-1111", 連絡先2="03-1111-1112", 備考="重要顧客"
  - ・File test: cùng độc giả, chỉ 連絡先1="03-3333-3333", `selected_columns` chỉ tick "連絡先1"

### 手順

ステップ1：
Upload file, chế độ import "入力箇所のみ更新"

ステップ2：
Trên panel cột import chỉ tick item key bắt buộc và "連絡先1", bỏ tick các cột khác

ステップ3：
Click button 取込開始 → dialog xác nhận "実行"

ステップ4：
Kiểm tra DB: `SELECT renrakusaki_1, renrakusaki_2, biko FROM t_dokusya WHERE ja_id = 1 ORDER BY updated_at DESC LIMIT 1`

### 期待結果

ステップ1：
Preview hiển thị 1 dòng

ステップ2：
Các cột bị bỏ tick không hiển thị trên preview

ステップ3：
Trả về HTTP 200, `import_mode: "UPDATE_PARTIAL"`, `updated_count: 1`, hiển thị toast `取り込みました。` (ACSMS-MSG-016-004)

ステップ4：
Chỉ 連絡先1 được update thành "03-3333-3333", 連絡先2 (`03-1111-1112`) và 備考 (`重要顧客`) giữ nguyên giá trị đã tồn tại

補足：
・Chế độ UPDATE_PARTIAL chỉ cập nhật các cột có trong `selected_columns`, là cập nhật không phá hủy
・Trường để trống không được cập nhật (giữ giá trị đã tồn tại)

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

## ACSMS-TC-016-040 — Chế độ UPDATE_PARTIAL — không tồn tại IMPORT_VALIDATION_ERROR

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・File test: 3 dòng chứa độc giả chưa đăng ký trong DB

### 手順

ステップ1：
Upload file, chế độ import "入力箇所のみ更新"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview hiển thị 3 dòng

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`), mảng `errors` chứa tương đương `{ row: N, field: 'dokusya', message: '指定された購読者が見つかりません' }`, hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005), rollback toàn bộ và DB không thay đổi

補足：
・Kể cả ở chế độ chỉ cập nhật phần đã nhập, dòng không tồn tại vẫn được xử lý như lỗi

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

## ACSMS-TC-016-041 — Chế độ UPDATE_PARTIAL — trường chưa thay đổi được giữ nguyên

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Độc giả đã tồn tại: 連絡先2="03-2222-2222", 備考="重要顧客", 購読部数=2
  - ・File test: cùng độc giả, chỉ nhập 連絡先1, các trường khác để trống

### 手順

ステップ1：
Upload file, chế độ import "入力箇所のみ更新"

ステップ2：
Trên panel cột import chỉ tick item key bắt buộc và "連絡先1"

ステップ3：
Click button 取込開始 → dialog xác nhận "実行"

ステップ4：
Kiểm tra DB: `SELECT renrakusaki_2, biko, dokusya_busu FROM t_dokusya WHERE ja_id = 1 ORDER BY updated_at DESC LIMIT 1`

### 期待結果

ステップ1：
Preview hiển thị 1 dòng

ステップ2：
Trạng thái tick được phản ánh

ステップ3：
Trả về HTTP 200, `updated_count: 1`, hiển thị toast `取り込みました。` (ACSMS-MSG-016-004)

ステップ4：
連絡先2 (`03-2222-2222`), 備考 (`重要顧客`), 購読部数 (`2`) được giữ nguyên giá trị đã tồn tại (trường để trống không được cập nhật)

補足：
・Chế độ UPDATE_PARTIAL không ghi đè trường để trống bằng NULL, giữ giá trị đã tồn tại

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

## ACSMS-TC-016-042 — Session hết hạn — UNAUTHORIZED tự động logout

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・TTL của session cookie đã được set thủ công về 0
  - ・Đã upload file test

### 手順

ステップ1：
Để màn `/dokusya/import` đang mở 24 giờ, sau đó click button 取込開始 → dialog xác nhận "実行"

ステップ2：
Kiểm tra hành vi của màn hình

### 期待結果

ステップ1：
POST `/api/v1/dokusya/import` trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Trạng thái user của Pinia auth store được clear, chuyển sang `/login?redirect=/dokusya/import`, message được hiển thị qua toast

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

## ACSMS-TC-016-043 — Request parameter không hợp lệ — BAD_REQUEST

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với cấu trúc không hợp lệ không chứa `rows`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`), message tương tự được hiển thị qua toast, DB không thay đổi

補足：
・Cấu trúc sai của các parameter bắt buộc (`import_mode` / `selected_columns` / `rows`) được phát hiện phía server

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

## ACSMS-TC-016-044 — Thiếu parameter bắt buộc — VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với `import_mode` không chỉ định và `selected_columns: []` (mảng rỗng)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`), mảng `errors` chứa `{ field: 'import_mode', message: '取込モードは必須です。' }` và `{ field: 'selected_columns', message: '取込対象列を1つ以上選択してください。' }`, DB không thay đổi

補足：
・`import_mode` chỉ cho phép `NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL`, `selected_columns` là mảng tên cột vật lý 1〜49 và bắt buộc

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

## ACSMS-TC-016-045 — Rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi liên tục POST `/api/v1/dokusya/import` 101 lần trong 1 phút

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
100 lần đầu trả về HTTP 200 hoặc 400, lần thứ 101 trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ2：
Message được hiển thị qua toast

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

## ACSMS-TC-016-046 — Lỗi DB phía server — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: 3 dòng độc giả

### 手順

ステップ1：
Gửi POST `/api/v1/dokusya/import` ở trạng thái mất kết nối DB (DB dừng)

ステップ2：
Kiểm tra màn hình và DB log

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。` (ACSMS-MSG-016-003)

ステップ2：
Transaction được rollback, không có record mới được đăng ký vào `t_dokusya`, error log (`log_type=3`, `result_status=2`) được record ngoài transaction vào `t_log`

補足：
・Phía server record error log ngoài transaction, nên dù business logic bị rollback thì audit log lỗi vẫn được giữ lại

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

## ACSMS-TC-016-047 — FILE_FORMAT_ERROR — upload file Excel hỏng

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・File test: file hỏng có extension `.xlsx` nhưng nội dung là text file

### 手順

ステップ1：
Chọn file hỏng, chế độ import "新規登録"

ステップ2：
Kiểm tra hành vi của màn hình

### 期待結果

ステップ1：
File parse fail phía frontend, hiển thị toast `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。` (ACSMS-MSG-016-001)

ステップ2：
Vùng preview vẫn ẩn, request không được gửi đến server, nếu được gửi đến server thì trả về HTTP 400 (`error_code: FILE_FORMAT_ERROR`, message `Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。`)

補足：
・Phát sinh khi Excel parser phía frontend ném exception
・Phía server cũng kiểm tra tương tự, khi gửi dữ liệu dòng không hợp lệ trả về `FILE_FORMAT_ERROR`

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

## ACSMS-TC-016-048 — Phía server ROW_LIMIT_EXCEEDED — gửi 30001 dòng

- 観点ID: VP-D-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với `rows: [...30001 items...]`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: ROW_LIMIT_EXCEEDED`, message `ファイルの行数が上限（30000行）を超えているため、取込みできません。`), DB không thay đổi

補足：
・Phía server check lại giới hạn 30000 dòng (ngăn việc bypass phía client)
・Giá trị biên: 30000 dòng import được, 30001 dòng không được

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

## ACSMS-TC-016-049 — IMPORT_VALIDATION_ERROR — kiểm tra mảng lỗi theo từng dòng

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: dòng 2 sai số chữ số mã bưu điện, dòng 3 chứa 新聞単価 chưa đăng ký

### 手順

ステップ1：
Upload file, chế độ import "新規登録"

ステップ2：
Click button 取込開始 → dialog xác nhận "実行"

ステップ3：
Kiểm tra cấu trúc mảng `errors` của response

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trả về HTTP 400 (`error_code: IMPORT_VALIDATION_ERROR`, message `Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。`), hiển thị toast `取込み処理にエラーが発生しました。「行{N}: {項目名} — {エラー理由}」` (ACSMS-MSG-016-005)

ステップ3：
Mảng `errors` chứa lỗi có kèm số dòng (`{ row: 2, field: 'yubin_no', message: ... }`, `{ row: 3, field: 'tanka_id', message: ... }`), rollback toàn bộ và không đăng ký vào DB

補足：
・Lỗi theo từng dòng được trả về dạng mảng có `row`／`field`／`message`
・Phía frontend format thành dạng "行2: 郵便番号 — …" để hiển thị

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

## ACSMS-TC-016-050 — DATA_SCOPE_VIOLATION — thử import data của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=1)
  - ・Đã login + đã xác thực MFA
  - ・File test: chứa dòng có `kanri_shiten_id` / `hanbaiten_id` thuộc ja_id=2

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/dokusya/import` với request body chứa `kanri_shiten_id` thuộc JA khác (ja_id=2)

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`), data thuộc ja_id=2 không được import, DB không thay đổi

補足：
・Phía server lọc đồng loạt bằng `ja_id` của session, khi FK reference trong request (`kanri_shiten_id` / `hanbaiten_id`) thuộc JA khác thì từ chối (Layer 4 FK reference guard)

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

## ACSMS-TC-016-051 — Xử lý phía frontend khi mất kết nối network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Upload file test tại `/dokusya/import`

ステップ2：
Chọn "Offline" trên DevTools tab Network

ステップ3：
Click button 取込開始 → dialog xác nhận "実行"

### 期待結果

ステップ1：
Preview được hiển thị

ステップ2：
Trạng thái mất kết nối network

ステップ3：
Network error được catch phía frontend, hiển thị toast `ネットワークエラーが発生しました。接続を確認してください。`, trạng thái màn hình không chuyển và button 取込開始 có thể click lại

補足：
・Phát hiện `error.code === 'ERR_NETWORK'` của axios trong error-handler.ts
・DB không bị thay đổi

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

Message lỗi network được quản lý bởi handler chung trong `src/api/error-handler.ts`.
