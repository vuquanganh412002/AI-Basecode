---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-018
screen_name: 販売店明細検索画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-21
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-21 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Hanbaiten (ACSMS-SCR-018)" được tạo mới trên hệ thống.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-018 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Hanbaiten |
| 2 | ACSMS-SCR-018-api | Tài liệu thiết kế API tìm kiếm chi tiết Hanbaiten |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Chức năng tìm kiếm / Sort / Pagination | 20 |
| 5 | Logic nghiệp vụ — Xóa (Function — Delete) | 8 |
| 6 | Logic nghiệp vụ — Chuyển đến chỉnh sửa/đăng ký (Navigation) | 4 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 53 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-018-001 — Cấm truy cập màn tìm kiếm chi tiết Hanbaiten với role NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "販売店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/hanbaiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/hanbaiten`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_hanbaiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "販売店マスタ" (do không có quyền `hanbaiten.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Data của `m_hanbaiten` không được trả về
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

## ACSMS-TC-018-002 — Tìm kiếm chi tiết Hanbaiten bởi NICHINO_STAFF — có thể xem nhưng không thể xóa

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `hanbaiten.view`, KHÔNG có quyền `hanbaiten.delete`

### 手順

ステップ1：
Kiểm tra item "販売店マスタ" trên sidebar và truy cập `/hanbaiten`

ステップ2：
Kiểm tra cột thao tác của row bất kỳ trong table kết quả tìm kiếm

ステップ3：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/hanbaiten/{hanbaiten_id}`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, danh sách Hanbaiten toàn JA được hiển thị (DataScope toàn JA)

ステップ2：
Button xóa bị ẩn hoặc bị disable (do không có quyền `hanbaiten.delete`)

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・NICHINO_STAFF chỉ có thể xem và đại diện nhập liệu, không thể xóa
・Button xóa bị ẩn nhờ field-level restriction Layer 3

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

Theo `account_concept.md`, NICHINO_STAFF chỉ có thể xem và đại diện nhập liệu. Quyền xóa chỉ thuộc về CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN.

## ACSMS-TC-018-003 — Tìm kiếm chi tiết Hanbaiten bởi CHUOKAI — chỉ xem được trong phạm vi 中央会 quản lý

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・JA quản lý: ja-001, ja-002 (dưới chuokai-001)
  - ・JA của 中央会 khác: ja-099 (dưới chuokai-002)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten`

ステップ2：
Kiểm tra response của GET `/api/v1/hanbaiten` qua DevTools

ステップ3：
Dùng DevTools gửi DELETE `/api/v1/hanbaiten/{hanbaiten_id của 中央会 khác}`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, button xóa được active

ステップ2：
Chỉ trả về Hanbaiten của JA quản lý (ja-001, ja-002), Hanbaiten của ja-099 không được trả về

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Nhờ Layer 2 DataScope, Hanbaiten của JA ngoài phạm vi quản lý bị từ chối cả việc xem lẫn xóa
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

CHUOKAI chỉ có thể xem/xóa Hanbaiten dưới các JA mà mình quản lý.

## ACSMS-TC-018-004 — Tìm kiếm chi tiết Hanbaiten bởi JA_HONTEN — chỉ xem được trong phạm vi JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten`

ステップ2：
Kiểm tra response của GET `/api/v1/hanbaiten`

ステップ3：
Dùng DevTools gửi DELETE `/api/v1/hanbaiten/{hanbaiten_id của JA khác}`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, button xóa được active

ステップ2：
Chỉ trả về Hanbaiten của ja_id=1, Hanbaiten của JA khác không được trả về

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`)

補足：
・JA_HONTEN chỉ có thể thao tác Hanbaiten dưới JA của mình
・Data của JA khác bị từ chối bởi Layer 2 DataScope

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

## ACSMS-TC-018-005 — Tìm kiếm chi tiết Hanbaiten bởi JA_KANRI_SHITEN — chỉ xem được trong phạm vi JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten`

ステップ2：
Kiểm tra response của GET `/api/v1/hanbaiten`

ステップ3：
Click button xóa trên row bất kỳ

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, button xóa được active

ステップ2：
Trả về danh sách Hanbaiten của ja_id=1 (do Hanbaiten quản lý theo đơn vị JA nên có thể xem toàn bộ Hanbaiten dưới JA của mình)

ステップ3：
Hiển thị dialog confirm xóa (message `この販売店を削除してもよろしいですか？`)

補足：
・JA_KANRI_SHITEN có thể xem/xóa Hanbaiten dưới JA của mình
・Theo `account_concept.md` ※5, Hanbaiten quản lý theo đơn vị JA

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

## ACSMS-TC-018-006 — Hiển thị ban đầu — form tìm kiếm trống, danh sách default

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại từ 20 bản ghi Hanbaiten trở lên dưới JA của mình

### 手順

ステップ1：
Truy cập URL `/hanbaiten`

ステップ2：
Kiểm tra giá trị khởi tạo của 7 mục trên form tìm kiếm

ステップ3：
Kiểm tra số dòng và hiển thị pagination của table kết quả tìm kiếm

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị

ステップ2：
Tất cả `hanbaiten_code`, `hanbaiten_name`, `tel`, `fax`, `address`, `shocho_name`, `haiten_flg` ở trạng thái trống / giá trị khởi tạo (haiten_flg=false)

ステップ3：
GET `/api/v1/hanbaiten` được gọi với tham số default (page=1, per_page=20, sort_by=hanbaiten_code, sort_order=asc, haiten_flg=false), tối đa 20 bản ghi Hanbaiten có deleted_at IS NULL và haiten_flg=false được hiển thị

補足：
・Khi hiển thị ban đầu, row 廃店 (haiten_flg=true) bị ẩn
・Row đã xóa logical (deleted_at IS NOT NULL) cũng bị ẩn

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

## ACSMS-TC-018-007 — Form tìm kiếm — xác nhận render 7 mục

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`, kiểm tra toàn bộ các mục của form tìm kiếm

ステップ2：
Kiểm tra thuộc tính maxlength của từng ô input text qua DevTools

ステップ3：
Kiểm tra trạng thái khởi tạo của checkbox haiten_flg

### 期待結果

ステップ1：
7 mục `hanbaiten_code`, `hanbaiten_name`, `tel`, `fax`, `address`, `shocho_name`, `haiten_flg` được hiển thị trên màn hình

ステップ2：
hanbaiten_code: maxlength=10, hanbaiten_name: 100, tel: 15, fax: 15, address: 200, shocho_name: 50 được set

ステップ3：
Checkbox haiten_flg ở trạng thái chưa check (false), label "廃店を含む" được hiển thị

補足：
・Số ký tự tối đa của từng mục phải khớp với validation của API

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-018-008 — Table kết quả tìm kiếm — xác nhận hiển thị toàn bộ 13 cột + cột thao tác

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Có data Hanbaiten dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten`, kiểm tra header các cột trên table kết quả tìm kiếm

ステップ2：
Kiểm tra thứ tự hiển thị của từng cột

### 期待結果

ステップ1：
13 cột `hanbaiten_code`, `hanbaiten_name`, `todofuken_name`, `yubin_no`, `address`, `tel`, `fax`, `shocho_name`, `itaku_kubun`, `haitatsuryo_shiharai_cycle`, `tesuryo_kubun`, `tesuryo_amount`, 操作 được hiển thị

ステップ2：
Thứ tự cột là 販売店コード → 販売店名 → 都道府県名 → 郵便番号 → 住所 → 電話番号 → FAX番号 → 所長名 → 委託区分 → 配達手数料支払サイクル → 手数料区分 → 手数料金額 → 操作

補足：
・v1.2 thêm cột `todofuken_name`, `haitatsuryo_shiharai_cycle` / `tesuryo_kubun` được rename ở v1.2

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

## ACSMS-TC-018-009 — Nhóm button — xác nhận hiển thị 検索 / 検索クリア / 新規登録

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`, kiểm tra các button phía trên màn hình

ステップ2：
Kiểm tra việc từng button được active

### 期待結果

ステップ1：
3 button "検索" "検索クリア" "新規登録" được hiển thị

ステップ2：
Cả 3 button được active và có thể click (button "新規登録" chỉ active khi có quyền `hanbaiten.create`, ngoài ra bị disable)

補足：
・JA_HONTEN có quyền `hanbaiten.create` nên "新規登録" được active
・NICHINO_STAFF chỉ có quyền view nên việc bị ẩn/disable được verify ở TC riêng

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

## ACSMS-TC-018-010 — Responsive — hiển thị ở khổ mobile (375px)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Set khổ màn hình thành 375px (iPhone SE) qua DevTools

ステップ2：
Hiển thị `/hanbaiten`

ステップ3：
Kiểm tra hiển thị của form tìm kiếm và table kết quả

### 期待結果

ステップ1：
Khổ màn hình được set thành 375px

ステップ2：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị không bị vỡ layout

ステップ3：
Form tìm kiếm được stack theo chiều dọc, table kết quả có thể scroll ngang, pagination được hiển thị wrap

補足：
・Ngay cả ở khổ mobile, toàn bộ chức năng (tìm kiếm / xóa / chuyển sang chỉnh sửa) đều có thể thao tác

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

## ACSMS-TC-018-011 — Xác nhận hiển thị icon sort ▲▼

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`, kiểm tra icon trên header cột `hanbaiten_code` ở trạng thái khởi tạo

ステップ2：
Click header cột `hanbaiten_code`, kiểm tra thay đổi icon

ステップ3：
Click thêm 2 lần nữa, kiểm tra thay đổi icon

### 期待結果

ステップ1：
Icon ▲ (ASC) được hiển thị trên cột `hanbaiten_code` (sort mặc định)

ステップ2：
Sau click lần 1, icon đổi thành ▼ (DESC)

ステップ3：
Sau click lần 2, icon biến mất (none); sau click lần 3, icon ▲ được hiển thị trở lại

補足：
・Chu kỳ 3 trạng thái: ASC → DESC → none → ASC ...
・Chỉ 2 cột `hanbaiten_code` và `hanbaiten_name` có thể sort

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

## ACSMS-TC-018-012 — Xác nhận hiển thị tiêu đề trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`

ステップ2：
Kiểm tra tiêu đề của tab trình duyệt và tiêu đề header trang

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị

ステップ2：
Tiêu đề trang hiển thị là "販売店明細検索", tab trình duyệt hiển thị là `販売店明細検索 | クラウド版購読者管理システム`

補足：
・Tiêu đề được lấy từ meta.breadcrumb của router

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

## ACSMS-TC-018-013 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`

ステップ2：
Kiểm tra breadcrumb

ステップ3：
Click breadcrumb "ホーム"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị

ステップ2：
Breadcrumb "ホーム > 販売店明細検索" được hiển thị phía trên màn hình (màn list nên 2 cấp)

ステップ3：
Chuyển sang dashboard (`/dashboard`)

補足：
・Quy ước breadcrumb của project: màn list có 2 cấp (ホーム > XXX一覧)

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

## ACSMS-TC-018-014 — Hiển thị thông tin user đang login

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (login_id=tarou01)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`

ステップ2：
Kiểm tra khu vực thông tin user phía trên bên phải màn hình

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị

ステップ2：
Tên user đang login "tarou01" (hoặc display name), tên JA thuộc về, tên role được hiển thị phía trên bên phải màn hình

補足：
・Là common component của header, hiển thị giống nhau trên toàn bộ màn hình

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


# カテゴリ 4: Chức năng tìm kiếm / Sort / Pagination

## ACSMS-TC-018-015 — Tìm kiếm partial match theo `hanbaiten_code`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại `hanbaiten_code`="HB001", "HB002", "OTHER01" dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten`

ステップ2：
Nhập "HB" vào trường `hanbaiten_code` của form tìm kiếm

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị

ステップ2：
"HB" được nhập vào ô `hanbaiten_code`

ステップ3：
GET `/api/v1/hanbaiten?hanbaiten_code=HB` được gọi, trả về HTTP 200, response chứa HB001, HB002 và không chứa OTHER01 (partial match LIKE '%HB%')

補足：
・Tìm kiếm partial match dùng ILIKE '%keyword%'
・Khoảng trắng đầu/cuối keyword bị trim

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

## ACSMS-TC-018-016 — Tìm kiếm partial match theo `hanbaiten_name`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại `hanbaiten_name`="東京販売店", "東京西販売店", "大阪販売店" dưới JA của mình

### 手順

ステップ1：
Nhập "東京" vào trường `hanbaiten_name` của form tìm kiếm

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"東京" được nhập vào ô `hanbaiten_name`

ステップ2：
GET `/api/v1/hanbaiten?hanbaiten_name=東京` được gọi, response chứa "東京販売店", "東京西販売店" và không chứa "大阪販売店"

補足：
・Partial match với ký tự fullwidth phải hoạt động

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

## ACSMS-TC-018-017 — Tìm kiếm partial match theo `tel`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại `tel`="03-1234-5678", "03-9999-0000", "06-1111-2222" dưới JA của mình

### 手順

ステップ1：
Nhập "03-" vào trường `tel` của form tìm kiếm

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"03-" được nhập vào ô `tel`

ステップ2：
Trả về HTTP 200, response chứa "03-1234-5678", "03-9999-0000" và không chứa "06-1111-2222"

補足：
・Số điện thoại cũng partial match (match chuỗi ký tự bao gồm cả dấu gạch ngang)

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

## ACSMS-TC-018-018 — Tìm kiếm partial match theo `fax`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có data `fax` dưới JA của mình

### 手順

ステップ1：
Nhập "03-1234" vào trường `fax` của form tìm kiếm

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"03-1234" được nhập vào ô `fax`

ステップ2：
Trả về HTTP 200, chỉ trả về các Hanbaiten có `fax` chứa "03-1234"

補足：
・Các giá trị `fax` khác (ví dụ "03-9999") bị loại trừ

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

## ACSMS-TC-018-019 — Tìm kiếm partial match theo `address`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại `address`="東京都千代田区", "東京都新宿区", "大阪府大阪市" dưới JA của mình

### 手順

ステップ1：
Nhập "東京都" vào trường `address` của form tìm kiếm

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"東京都" được nhập vào ô `address`

ステップ2：
Trả về HTTP 200, response chứa "東京都千代田区", "東京都新宿区" và không chứa "大阪府大阪市"

補足：
・Địa chỉ cũng partial match (hỗ trợ ký tự fullwidth)

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

## ACSMS-TC-018-020 — Tìm kiếm partial match theo `shocho_name`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại `shocho_name`="山田太郎", "山田次郎", "鈴木花子" dưới JA của mình

### 手順

ステップ1：
Nhập "山田" vào trường `shocho_name` của form tìm kiếm

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"山田" được nhập vào ô `shocho_name`

ステップ2：
Trả về HTTP 200, response chứa "山田太郎", "山田次郎" và không chứa "鈴木花子"

補足：
・Tên 所長 cũng hỗ trợ partial match

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

## ACSMS-TC-018-021 — `haiten_flg` = false (mặc định) — xác nhận loại trừ 廃店

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại Hanbaiten X với `haiten_flg`=true và Hanbaiten Y với `haiten_flg`=false dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten` (checkbox `haiten_flg` chưa được check)

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, checkbox `haiten_flg` chưa được check

ステップ2：
GET `/api/v1/hanbaiten?haiten_flg=false` được gọi, response chứa Hanbaiten Y và không chứa Hanbaiten X

補足：
・Spec v1.2: khi tìm kiếm ban đầu, row 廃店 bị ẩn

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

## ACSMS-TC-018-022 — `haiten_flg` = true — tìm kiếm bao gồm 廃店

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại Hanbaiten X với `haiten_flg`=true và Hanbaiten Y với `haiten_flg`=false dưới JA của mình

### 手順

ステップ1：
Check checkbox `haiten_flg`

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Checkbox `haiten_flg` ở trạng thái đã check

ステップ2：
GET `/api/v1/hanbaiten?haiten_flg=true` được gọi, response chứa cả Hanbaiten X và Y

補足：
・Chỉ khi chỉ định `haiten_flg`=true mới bao gồm row 廃店

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

## ACSMS-TC-018-023 — Tìm kiếm AND nhiều điều kiện

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có nhiều Hanbaiten dưới JA của mình

### 手順

ステップ1：
Nhập "HB" vào `hanbaiten_code`, "山田" vào `shocho_name`

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Giá trị được nhập vào cả 2 ô

ステップ2：
GET `/api/v1/hanbaiten?hanbaiten_code=HB&shocho_name=山田` được gọi, response chỉ trả về Hanbaiten thỏa cả 2 điều kiện (`hanbaiten_code` chứa "HB" VÀ `shocho_name` chứa "山田")

補足：
・Nhiều filter được kết hợp AND
・Row chỉ thỏa 1 điều kiện không được trả về

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

## ACSMS-TC-018-024 — Click "検索" với điều kiện trống — trả về toàn bộ

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có data Hanbaiten dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten`, click button "検索" khi form tìm kiếm để trống

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten?page=1&per_page=20&sort_by=hanbaiten_code&sort_order=asc&haiten_flg=false` được gọi, trả về cùng kết quả với hiển thị ban đầu

補足：
・Khi tất cả filter là undefined, không gắn điều kiện filter (chỉ `haiten_flg` mặc định false)

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

## ACSMS-TC-018-025 — Tìm kiếm `hanbaiten_code` — biên 10 ký tự / 11 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 10 ký tự halfwidth "1234567890" vào `hanbaiten_code` và click "検索"

ステップ2：
Thử nhập 11 ký tự halfwidth "12345678901" vào `hanbaiten_code`

### 期待結果

ステップ1：
Trả về HTTP 200, cho phép 10 ký tự

ステップ2：
Ô input dừng ở 10 ký tự (maxlength=10), hoặc khi gửi 11 ký tự trả về HTTP 400 (`error_code: VALIDATION_ERROR`)

補足：
・FE giới hạn bằng maxlength, BE bảo vệ bằng class-validator

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

## ACSMS-TC-018-026 — Tìm kiếm `address` — biên 200 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 200 ký tự vào ô `address` và click "検索"

ステップ2：
Thử gửi 201 ký tự ở ô `address`

### 期待結果

ステップ1：
Trả về HTTP 200, cho phép 200 ký tự

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`)

補足：
・`address`: gửi vượt quá maxlength=200 thì bị BE từ chối

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

## ACSMS-TC-018-027 — Kết quả tìm kiếm 0 bản ghi — `検索結果が見つかりませんでした。`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Không tồn tại Hanbaiten khớp keyword dưới JA của mình

### 手順

ステップ1：
Nhập "ZZZZZZZZZZ" (code không tồn tại) vào `hanbaiten_code`

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Giá trị được nhập vào ô `hanbaiten_code`

ステップ2：
Trả về HTTP 200, `data: []`, `meta.total: 0`, màn hình hiển thị message `検索結果が見つかりませんでした。` (MSG-018-001)

補足：
・Chỉ hiển thị header table, không hiển thị data row

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

## ACSMS-TC-018-028 — Button "検索クリア" — reset toàn bộ input + reload danh sách

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập giá trị tùy ý vào `hanbaiten_code`, `hanbaiten_name`, `tel`, `fax`, `address`, `shocho_name`, check `haiten_flg`

ステップ2：
Click button "検索クリア"

### 期待結果

ステップ1：
Tất cả ô input có giá trị và `haiten_flg` đã được check

ステップ2：
Cả 6 ô input text trở về trống, `haiten_flg` trở về chưa check, màn hình reload về danh sách ban đầu (GET `/api/v1/hanbaiten` được gọi với tham số default)

補足：
・Sau khi clear, thứ tự sort / số trang cũng được khởi tạo lại

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

## ACSMS-TC-018-029 — Sort `hanbaiten_code` — chu kỳ ASC → DESC → none

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥5 Hanbaiten dưới JA của mình

### 手順

ステップ1：
Ở hiển thị ban đầu của `/hanbaiten`, xác nhận `hanbaiten_code` đang sort ASC

ステップ2：
Click 1 lần header cột `hanbaiten_code`

ステップ3：
Click thêm 1 lần header cột `hanbaiten_code`

ステップ4：
Click thêm 1 lần header cột `hanbaiten_code`

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten?sort_by=hanbaiten_code&sort_order=asc` được gọi, table sắp xếp ASC, icon ▲ được hiển thị

ステップ2：
GET `/api/v1/hanbaiten?sort_by=hanbaiten_code&sort_order=desc` được gọi, table sắp xếp DESC, icon ▼ được hiển thị

ステップ3：
GET không có param sort_order (sort mặc định) được gọi, icon sort biến mất

ステップ4：
Trở về ASC, icon ▲ được hiển thị lại

補足：
・Chu kỳ 3 trạng thái: ASC → DESC → none → ASC

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

## ACSMS-TC-018-030 — Sort `hanbaiten_name`

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥5 Hanbaiten với `hanbaiten_name` khác nhau dưới JA của mình

### 手順

ステップ1：
Click header cột `hanbaiten_name`

ステップ2：
Click thêm header cột `hanbaiten_name`

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten?sort_by=hanbaiten_name&sort_order=asc` được gọi, table sắp xếp ASC theo `hanbaiten_name` (thứ tự あいうえお), icon ▲ được hiển thị

ステップ2：
GET `/api/v1/hanbaiten?sort_by=hanbaiten_name&sort_order=desc` được gọi, table sắp xếp DESC, icon ▼ được hiển thị

補足：
・Ngoài `hanbaiten_code`, cột sort được chỉ có `hanbaiten_name`

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

## ACSMS-TC-018-031 — Pagination — hiển thị 20 record/page

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥25 Hanbaiten dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten` và click "検索"

ステップ2：
Kiểm tra số dòng hiển thị ở page 1

ステップ3：
Kiểm tra hiển thị của control pagination

### 期待結果

ステップ1：
Trả về HTTP 200, được gọi với `per_page=20`

ステップ2：
Page 1 hiển thị tối đa 20 Hanbaiten

ステップ3：
Pagination được hiển thị dạng "1 2 3 ... 次へ", tổng số bản ghi và tổng số page được hiển thị

補足：
・`per_page` mặc định = 20

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

## ACSMS-TC-018-032 — Pagination — chuyển "次へ" / "前へ"

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥25 Hanbaiten dưới JA của mình

### 手順

ステップ1：
Click button "次へ" ở page 1

ステップ2：
Click button "前へ" ở page 2

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten?page=2&per_page=20...` được gọi, data của page 2 được hiển thị

ステップ2：
GET `/api/v1/hanbaiten?page=1&per_page=20...` được gọi, data của page 1 được hiển thị

補足：
・Param URL `page` được lưu vào lịch sử trình duyệt (reload vẫn ở cùng page)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-018-033 — Pagination — biên `per_page`=100

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥100 Hanbaiten dưới JA của mình

### 手順

ステップ1：
Gửi GET `/api/v1/hanbaiten?per_page=100` qua DevTools

ステップ2：
Gửi GET `/api/v1/hanbaiten?per_page=101` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 200, trả về tối đa 100 bản ghi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, `errors[0].field: per_page`)

補足：
・Giới hạn trên của `per_page` là 100 (class-validator `@Max(100)`)

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

## ACSMS-TC-018-034 — Tìm kiếm với param `sort_by` không hợp lệ

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi GET `/api/v1/hanbaiten?sort_by=invalid_column` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, `errors[0].field: sort_by`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・`sort_by` chỉ cho phép `hanbaiten_code` hoặc `hanbaiten_name`
・Giá trị không hợp lệ bị từ chối bởi `@IsIn([...])` của class-validator

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


# カテゴリ 5: Logic nghiệp vụ — Xóa (Function — Delete)

## ACSMS-TC-018-035 — Hiển thị dialog confirm xóa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có Hanbaiten có thể xóa (id=H1) dưới JA của mình

### 手順

ステップ1：
Tại `/hanbaiten`, click button "削除" trên row của Hanbaiten H1

### 期待結果

ステップ1：
Hiển thị dialog confirm xóa, message dialog là `この販売店を削除してもよろしいですか？` (MSG-018-005), 2 button "はい" "いいえ" được hiển thị

補足：
・Button "はい" có `okType: 'danger'` (màu đỏ)
・Theo quy ước project, dùng "はい / いいえ"

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

## ACSMS-TC-018-036 — Confirm xóa (click "はい") — xóa logical + toast thành công + cập nhật danh sách

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có Hanbaiten H1 không có related object dưới JA của mình

### 手順

ステップ1：
Click button "削除" trên Hanbaiten H1, mở dialog confirm xóa

ステップ2：
Click button "はい"

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H1`

ステップ4：
Kiểm tra table kết quả tìm kiếm trên màn hình

### 期待結果

ステップ1：
Hiển thị dialog confirm xóa

ステップ2：
DELETE `/api/v1/hanbaiten/H1` được gọi, trả về HTTP 200, hiển thị toast `削除しました。` (MSG-018-006)

ステップ3：
`deleted_at` được update với thời gian tương đương NOW() (xóa logical), không bị xóa vật lý

ステップ4：
Hanbaiten H1 bị loại khỏi danh sách (do filter deleted_at IS NULL), danh sách được tự động reload

補足：
・Là xóa logical nên row `m_hanbaiten` vẫn tồn tại vật lý
・Sau khi xóa không thể đăng ký mới với cùng `hanbaiten_code` (master code reserved policy)

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

## ACSMS-TC-018-037 — Cancel xóa (click "いいえ") — giữ nguyên trạng thái

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có Hanbaiten H1 dưới JA của mình

### 手順

ステップ1：
Click button "削除" trên Hanbaiten H1, mở dialog

ステップ2：
Click button "いいえ"

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H1`

### 期待結果

ステップ1：
Hiển thị dialog confirm xóa

ステップ2：
Dialog bị đóng, API DELETE không được gọi, danh sách cũng không thay đổi (Hanbaiten H1 vẫn được hiển thị)

ステップ3：
`deleted_at` vẫn NULL (DB không thay đổi)

補足：
・Khi cancel, không có request nào được gửi đến server

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

## ACSMS-TC-018-038 — Xóa có FK liên quan — `この販売店は関連オブジェクトに紐づいているため削除できません。`

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại Hanbaiten H2 dưới JA của mình, có ≥1 row Dokusya với `t_dokusya.hanbaiten_id` = H2

### 手順

ステップ1：
Click button "削除" trên Hanbaiten H2, click "はい" trong dialog

ステップ2：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H2`

ステップ3：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_hanbaiten' AND target_id = H2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
DELETE `/api/v1/hanbaiten/H2` được gọi, trả về HTTP 409 (`error_code: CONFLICT`, message `この販売店は関連オブジェクトに紐づいているため削除できません。`), hiển thị toast `この販売店は関連オブジェクトに紐づいているため削除できません。` (MSG-018-004)

ステップ2：
`deleted_at` vẫn NULL (xóa bị dừng)

ステップ3：
Có 1 dòng error log được record

補足：
・Bảng FK liên quan: `t_dokusya`, `t_dokusya_history` v.v.
・Tại service layer, `assertNoRelatedRows` trả về CONFLICT

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

## ACSMS-TC-018-039 — Reload danh sách sau khi xóa — xác nhận filter `deleted_at` IS NULL

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại Hanbaiten H3 (deleted_at=NULL), H4 (deleted_at=thời điểm trong quá khứ) dưới JA của mình

### 手順

ステップ1：
Truy cập `/hanbaiten`, click "検索"

ステップ2：
Xóa Hanbaiten H3 (chọn はい)

ステップ3：
Kiểm tra danh sách sau khi xóa hoàn tất

### 期待結果

ステップ1：
H3 nằm trong danh sách, H4 không nằm trong (bị filter `deleted_at` IS NULL loại trừ)

ステップ2：
Trả về HTTP 200, hiển thị toast `削除しました。`

ステップ3：
Khi auto-reload sau xóa, cả H3 và H4 đều không nằm trong danh sách

補足：
・Row đã xóa logical không hiển thị lại (không có chức năng restore)

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

## ACSMS-TC-018-040 — Audit log (`t_log`) record khi xóa

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (login_id=tarou01, account_id=10)
  - ・Có Hanbaiten H5 có thể xóa dưới JA của mình

### 手順

ステップ1：
Xóa Hanbaiten H5 (chọn はい)

ステップ2：
Kiểm tra DB: `SELECT log_type, operation, target_table, target_id, account_id, before_value, result_status FROM t_log WHERE target_table = 'm_hanbaiten' AND target_id = H5 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 200, hiển thị toast `削除しました。`

ステップ2：
Có 1 dòng log được record (log_type=1, operation=`DELETE`, target_table=`m_hanbaiten`, target_id=H5, account_id=10, before_value chứa nội dung record của H5 (JSON), result_status=1)

補足：
・Audit log được ghi trong cùng transaction với main DML (DELETE)
・Khi xảy ra lỗi, error log với result_status=2 vẫn được lưu lại

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

## ACSMS-TC-018-041 — Xóa Hanbaiten của JA khác — DATA_SCOPE_VIOLATION

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Tồn tại Hanbaiten H99 dưới JA khác (ja-002)

### 手順

ステップ1：
Gửi DELETE `/api/v1/hanbaiten/H99` qua DevTools

ステップ2：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H99`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

ステップ2：
`deleted_at` của H99 vẫn NULL (DB không thay đổi)

補足：
・Layer 2 DataScope từ chối việc xóa Hanbaiten của JA khác
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

(なし)

## ACSMS-TC-018-042 — Gọi trực tiếp DELETE bởi NICHINO_STAFF — bị từ chối

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Có quyền `hanbaiten.view`, KHÔNG có quyền `hanbaiten.delete`
  - ・Tồn tại Hanbaiten H1

### 手順

ステップ1：
Gửi DELETE `/api/v1/hanbaiten/H1` qua DevTools

ステップ2：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H1`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ2：
`deleted_at` của H1 vẫn NULL

補足：
・NICHINO_STAFF không có quyền xóa nên cũng bị từ chối ở API layer
・Ngay cả khi button xóa trên FE bị ẩn/disable, gọi trực tiếp API cũng bị từ chối (defense in depth)

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


# カテゴリ 6: Logic nghiệp vụ — Chuyển đến chỉnh sửa/đăng ký (Navigation)

## ACSMS-TC-018-043 — Click button "新規登録" — chuyển đến `/hanbaiten/create`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có quyền `hanbaiten.create`
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập `/hanbaiten`

ステップ2：
Click button "新規登録"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Hanbaiten được hiển thị, button "新規登録" được active

ステップ2：
URL chuyển sang `/hanbaiten/create` (SCR-017 màn đăng ký thông tin Hanbaiten), tiêu đề màn hình là "販売店情報登録"

補足：
・Chuyển bằng router-link, có thể quay về danh sách bằng nút back của trình duyệt

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

## ACSMS-TC-018-044 — Click row / link chỉnh sửa — chuyển đến `/hanbaiten/:id/edit`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có Hanbaiten H1 dưới JA của mình

### 手順

ステップ1：
Click cell `hanbaiten_code` (hoặc link chỉnh sửa) của Hanbaiten H1

### 期待結果

ステップ1：
URL chuyển sang `/hanbaiten/H1/edit` (SCR-017 mode chỉnh sửa), tiêu đề màn hình là "販売店情報更新", giá trị hiện tại của H1 được preload vào từng ô input

補足：
・Với role không có quyền chỉnh sửa, cell hiển thị dưới dạng `<span>` không active

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

## ACSMS-TC-018-045 — Preload màn chỉnh sửa — gọi GET `/api/v1/hanbaiten/:id`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Tồn tại Hanbaiten H1 (có giá trị toàn bộ cột) dưới JA của mình

### 手順

ステップ1：
Click link chỉnh sửa của H1 từ danh sách

ステップ2：
Kiểm tra API request của màn chỉnh sửa

ステップ3：
Kiểm tra giá trị từng form field

### 期待結果

ステップ1：
URL chuyển sang `/hanbaiten/H1/edit`

ステップ2：
GET `/api/v1/hanbaiten/H1` được gọi, trả về HTTP 200, response chứa toàn bộ cột của H1

ステップ3：
`hanbaiten_code`, `hanbaiten_name`, `todofuken_id`, `yubin_no`, `address`, `tel`, `fax`, `shocho_name`, `itaku_kubun`, `haitatsuryo_shiharai_cycle`, `tesuryo_kubun`, `tesuryo_amount`, `haiten_flg` khớp toàn bộ với giá trị DB

補足：
・Preload màn chỉnh sửa theo spec mode chỉnh sửa của SCR-017

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

## ACSMS-TC-018-046 — NICHINO_STAFF đại diện nhập liệu — có thể chuyển sang màn chỉnh sửa của JA khác

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Có quyền `hanbaiten.daiko_input`
  - ・Có Hanbaiten H77 dưới ja-002

### 手順

ステップ1：
Xác nhận danh sách toàn JA được hiển thị tại `/hanbaiten`

ステップ2：
Click link chỉnh sửa của Hanbaiten H77

### 期待結果

ステップ1：
Hanbaiten của toàn JA (ja_id=1, 2 v.v.) được hiển thị (DataScope toàn JA)

ステップ2：
URL chuyển sang `/hanbaiten/H77/edit`, data của H77 được load thành công (nhờ quyền `hanbaiten.daiko_input` mà cũng có thể chỉnh sửa data JA khác)

補足：
・NICHINO_STAFF có thể xem và đại diện nhập liệu (đăng ký / chỉnh sửa) nhưng không có quyền xóa

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


# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-018-047 — Session hết hạn — UNAUTHORIZED tự động logout

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・TTL của session cookie đang ở trạng thái 0 (set thủ công)

### 手順

ステップ1：
Để mở `/hanbaiten` 24 tiếng, rồi click button "検索"

ステップ2：
Kiểm tra hành vi màn hình

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten` trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
State user của Pinia auth store được clear, chuyển sang `/login?redirect=/hanbaiten`, toast message được hiển thị

補足：
・`clearSession()` của auth.store được gọi, Pinia và Redis sessions đều bị xóa

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

## ACSMS-TC-018-048 — Query parameter không hợp lệ — BAD_REQUEST

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi GET `/api/v1/hanbaiten?per_page=abc` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, `errors[0].field: per_page`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・`per_page` từ chối giá trị không convert được sang number (class-validator `@IsInt()`)

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

## ACSMS-TC-018-049 — Giá trị `sort_order` không hợp lệ — VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi GET `/api/v1/hanbaiten?sort_order=invalid` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, `errors[0].field: sort_order`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

補足：
・`sort_order` chỉ cho phép `asc` hoặc `desc` (`@IsIn(['asc', 'desc'])`)

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

## ACSMS-TC-018-050 — Rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi liên tục 101 lần GET `/api/v1/hanbaiten` trong 1 phút

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
100 lần đầu trả về HTTP 200, lần thứ 101 trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ2：
Message được hiển thị qua toast

補足：
・@nestjs/throttler giới hạn 100 req/min

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

## ACSMS-TC-018-051 — Lỗi DB phía server — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Stop PostgreSQL (hoặc reproduce lỗi kết nối DB)

### 手順

ステップ1：
Truy cập `/hanbaiten` và click "検索"

ステップ2：
Kiểm tra hành vi màn hình

### 期待結果

ステップ1：
GET `/api/v1/hanbaiten` trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
Hiển thị toast `システムエラーが発生しました。しばらくしてした再度お試しください。`, table kết quả tìm kiếm vẫn để trống, stack trace phía server không bị leak ra client

補足：
・Chi tiết lỗi được record vào CloudWatch Logs nhưng ẩn đối với client
・Cùng message với MSG-018-003

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

## ACSMS-TC-018-052 — Xóa với `hanbaiten_id` không tồn tại — NOT_FOUND

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・`hanbaiten_id`=99999 không tồn tại

### 手順

ステップ1：
Gửi DELETE `/api/v1/hanbaiten/99999` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された販売店が見つかりません。`)

補足：
・Với id không tồn tại, trả về NOT_FOUND trước cả DataScope check
・Trường hợp đã xóa logical (deleted_at IS NOT NULL) cũng xử lý như NOT_FOUND (ẩn sự tồn tại của row)

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

## ACSMS-TC-018-053 — Thao tác xóa khi mất kết nối mạng — toast lỗi + giữ nguyên trạng thái

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có Hanbaiten H1 dưới JA của mình
  - ・Set `Offline` trong DevTools (mất kết nối mạng)

### 手順

ステップ1：
Click button "削除" trên Hanbaiten H1, click "はい" trong dialog

ステップ2：
Kiểm tra hành vi màn hình

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_hanbaiten WHERE hanbaiten_id = H1`

### 期待結果

ステップ1：
Gửi DELETE `/api/v1/hanbaiten/H1` thất bại (lỗi mạng)

ステップ2：
Hiển thị message lỗi mạng qua toast, button xóa vẫn ở trạng thái active, không xảy ra chuyển màn hình

ステップ3：
`deleted_at` vẫn NULL (DB không thay đổi)

補足：
・Sau khi mạng được khôi phục, có thể thao tác xóa lại
・Không cần các hành vi bổ sung như optimistic lock hay hiển thị confirm lại

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
