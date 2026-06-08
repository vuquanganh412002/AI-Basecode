---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-002
screen_name: 単価マスタ明細検索画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-14
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-14 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Master Đơn giá (ACSMS-SCR-002)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-002 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Master Đơn giá |
| 2 | ACSMS-SCR-002-api | Tài liệu thiết kế API tìm kiếm chi tiết Master Đơn giá |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation điều kiện tìm kiếm (Search Filter Validation) | 14 |
| 5 | Tìm kiếm / Sort / Pagination (Search / Sort / Pagination) | 17 |
| 6 | Logic nghiệp vụ (Function — List / Delete) | 13 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 11 |
|  | Tổng | 70 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-002-001 — Cấm NICHINO_ADMIN truy cập màn hình tìm kiếm chi tiết Master Đơn giá

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `tanka.view`

### 手順

ステップ1：
Mở dashboard, kiểm tra hiển thị item "単価マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/tanka`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/tanka`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Item "単価マスタ" không được hiển thị trên sidebar (do không có quyền `tanka.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log được ghi, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block truy cập
・Không phát sinh thay đổi đối với `m_tanka`
・Theo ma trận quyền tại seeder.md §3, NICHINO_ADMIN không có quyền với Master Đơn giá

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

## ACSMS-TC-002-002 — Cấm NICHINO_STAFF truy cập màn hình tìm kiếm chi tiết Master Đơn giá

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `tanka.view`

### 手順

ステップ1：
Mở dashboard, kiểm tra hiển thị item "単価マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/tanka`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/tanka`

### 期待結果

ステップ1：
Item "単価マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Cả 3 tầng đều block truy cập
・Master Đơn giá là đối tượng quản lý phía JA, NICHINO (admin / staff) không thuộc đối tượng truy cập (account_concept.md ※4)

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

## ACSMS-TC-002-003 — Cho phép CHUOKAI xem màn hình tìm kiếm chi tiết Master Đơn giá

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `tanka.view` / `tanka.create` / `tanka.update` / `tanka.delete`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "単価マスタ" trên sidebar

ステップ2：
Click "単価マスタ" trên sidebar, mở URL `/tanka`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/tanka`, kiểm tra response

### 期待結果

ステップ1：
Item "単価マスタ" được hiển thị trên sidebar (do có quyền `tanka.view`)

ステップ2：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị, form search và danh sách đơn giá (updated_at giảm dần) được render

ステップ3：
Trả về HTTP 200, response body chứa mảng `data` và object `meta`

補足：
・Button "新規登録" hiển thị ở trạng thái active (do có quyền `tanka.create`)
・Link "削除" tại cột thao tác hiển thị ở trạng thái active (do có quyền `tanka.delete`)
・Theo data scope, chỉ trả về record của chuokai của mình (account_concept.md ※4)

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

## ACSMS-TC-002-004 — Cho phép JA_HONTEN xem màn hình tìm kiếm chi tiết Master Đơn giá

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `tanka.view` / `tanka.create` / `tanka.update` / `tanka.delete`

### 手順

ステップ1：
Click "単価マスタ" trên sidebar, mở URL `/tanka`

ステップ2：
Dùng DevTools kiểm tra response của GET `/api/v1/tanka`

ステップ3：
Đối với record đơn giá của JA khác (ja-002), dùng DevTools gửi trực tiếp DELETE `/api/v1/tanka/{tanka_id của JA khác}`

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Trả về HTTP 200, mảng `data` chỉ chứa record có ja_id = 1 (chỉ JA của mình)

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された単価が見つかりません。`, trả về 404 thay vì 403 để che giấu sự tồn tại)

補足：
・Theo data scope, chỉ record của JA mình mới được trả về / thao tác được
・Cả link "新規登録" và "削除" đều hiển thị ở trạng thái active

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

## ACSMS-TC-002-005 — Cho phép JA_KANRI_SHITEN xem màn hình tìm kiếm chi tiết Master Đơn giá

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `tanka.view` / `tanka.create` / `tanka.update` / `tanka.delete`

### 手順

ステップ1：
Click "単価マスタ" trên sidebar, mở URL `/tanka`

ステップ2：
Dùng DevTools kiểm tra response của GET `/api/v1/tanka`

ステップ3：
Truy cập trực tiếp URL `/tanka/1/edit`

ステップ4：
Truy cập trực tiếp URL `/tanka/create`

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Trả về HTTP 200, mảng `data` chỉ chứa record có ja_id = 1 (chỉ JA của mình)

ステップ3：
Màn hình đăng ký Master Đơn giá (mode chỉnh sửa) được hiển thị (do có quyền `tanka.update`)

ステップ4：
Màn hình đăng ký Master Đơn giá (mode tạo mới) được hiển thị (do có quyền `tanka.create`)

補足：
・JA_KANRI_SHITEN chỉ tham chiếu được đơn giá theo đơn vị JA của mình (cùng tập quyền với CHUOKAI / JA_HONTEN)
・Data scope áp dụng theo đơn vị ja_id, không filter theo đơn vị kanri_shiten_id

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

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-002-006 — Layout tổng thể màn hình list khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Browser: Chrome (latest), độ phân giải 1920×1080
  - ・Đã đăng ký ≥3 data đơn giá của chuokai mình

### 手順

ステップ1：
Click "単価マスタ" trên sidebar, mở `/tanka`

ステップ2：
So sánh song song màn hình thực tế với tài liệu thiết kế màn hình (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí của breadcrumb, form search, table list, pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Màu nền, font, font size, padding / margin, màu button, style của input field đều khớp với tài liệu thiết kế màn hình

ステップ3：
Bố cục đúng như tài liệu thiết kế màn hình

補足：
・Không phát sinh sai lệch hiển thị so với tài liệu thiết kế màn hình
・Design token (design-tokens.ts) được áp dụng, không tồn tại màu hardcode

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

## ACSMS-TC-002-007 — Cấu trúc cột của table list khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥3 data đơn giá

### 手順

ステップ1：
Mở `/tanka`, kiểm tra header của table list

ステップ2：
Kiểm tra tên cột, độ rộng, căn lề theo thứ tự từ trái

ステップ3：
Kiểm tra sự có mặt của icon sort

ステップ4：
Kiểm tra nội dung hiển thị của dòng record có 適用終了日 là NULL

### 期待結果

ステップ1：
Table list được hiển thị

ステップ2：
Theo §定義項目画面 của tài liệu thiết kế màn hình, từ trái sang phải hiển thị 10 cột "単価種別" "単価コード" "単価名" "適用開始日" "適用終了日" "有効単価フラグ" "単価（税込）" "単価（税抜）" "税率" "操作", các cột 税込 / 税抜 / 税率 căn phải, 有効単価フラグ / 操作 căn giữa, các cột khác căn trái

ステップ3：
Icon sort được hiển thị tại 4 cột "単価コード" "単価名" "適用開始日" "適用終了日", các cột khác (単価種別 / 有効単価フラグ / 税込 / 税抜 / 税率 / 操作) không hiển thị icon sort

ステップ4：
Cột 適用終了日 hiển thị `-` (gạch nối, NULL = vô thời hạn)

補足：
・Cột 単価種別 hiển thị label TANKA_TYPE của m_code ("新聞購読料" hoặc "配達手数料")
・Cột 有効単価フラグ hiển thị status badge "有効" (tag xanh) hoặc "無効" (tag đỏ)

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

## ACSMS-TC-002-008 — Layout 5 item của form search khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Mở `/tanka`, kiểm tra khu vực form search

ステップ2：
Kiểm tra label, input field, placeholder của từng item search

ステップ3：
Kiểm tra vị trí và màu của button "検索" "検索クリア"

### 期待結果

ステップ1：
Form search được hiển thị

ステップ2：
Hiển thị 5 item "単価種別" "単価名" "適用開始日" "適用終了日" "有効単価フラグ" trong grid 4 cột, các item 単価種別 / 有効単価フラグ là radio button, 単価名 là textbox, 適用開始日 / 適用終了日 là input field ngày

ステップ3：
Button "検索" hiển thị ở trạng thái active với màu của button chính (xanh), button "検索クリア" hiển thị ở trạng thái active với màu của button phụ

補足：
・5 item được bố trí trong grid 4 cột, 有効単価フラグ wrap xuống dòng 2
・Textbox 単価名 hiển thị icon clear `allow-clear`

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

## ACSMS-TC-002-009 — Hiển thị message trạng thái rỗng khi kết quả tìm kiếm 0 dòng

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Data đơn giá khớp với điều kiện là 0 dòng

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Nhập `ZZZZZZ` (giá trị không tồn tại) vào item search "単価名"

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
`ZZZZZZ` được nhập vào 単価名

ステップ3：
Hiển thị 0 kết quả search, trên màn hình hiển thị `検索結果が見つかりませんでした。` (ACSMS-MSG-002-001)

補足：
・Pagination của table list hiển thị "全 0 件"
・API trả về 200, `data: [], meta.total: 0`

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

## ACSMS-TC-002-010 — Hành vi responsive — Breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có thể sử dụng device emulator của Chrome DevTools

### 手順

ステップ1：
Hiển thị `/tanka` ở độ phân giải PC (1920×1080)

ステップ2：
Chuyển sang độ phân giải tablet (768×1024, iPad dọc)

ステップ3：
Chuyển sang độ phân giải mobile (375×667, iPhone SE)

ステップ4：
Kiểm tra hiển thị form search, table list, pagination ở từng độ phân giải

### 期待結果

ステップ1：
Hiển thị layout PC, form search hiển thị 5 item trong grid 4 cột (wrap 2 dòng)

ステップ2：
Chuyển sang layout tablet, các item search được bố trí lại theo chiều dọc

ステップ3：
Chuyển sang layout mobile, table list hiển thị với scroll ngang

ステップ4：
Không vỡ layout, có thể thực hiện mọi thao tác

補足：
・Sidebar chuyển thành hamburger menu khi ở mức tablet trở xuống
・Khi scroll ngang table, cột thao tác không bị vỡ

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

## ACSMS-TC-002-011 — Chuyển focus bằng thao tác keyboard

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Nhấn Tab liên tục, kiểm tra thứ tự chuyển focus

ステップ3：
Nhấn Shift+Tab, kiểm tra chuyển focus theo chiều ngược lại

ステップ4：
Focus vào input field ngày 適用開始日, nhấn Enter để mở date picker

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Focus chuyển theo thứ tự radio 単価種別 → 単価名 → 適用開始日 → 適用終了日 → radio 有効単価フラグ → button 検索 → button 検索クリア → button 新規登録 → sort header → link 削除

ステップ3：
Focus chuyển theo chiều ngược lại

ステップ4：
Date picker được mở, có thể di chuyển lựa chọn ngày bằng phím mũi tên

補足：
・Focus ring được hiển thị trực quan trên mọi element có thể thao tác

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

## ACSMS-TC-002-012 — Kiểm soát hiển thị thao tác "新規登録" "削除" "編集" theo role

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (có quyền `tanka.create` / `tanka.update` / `tanka.delete`)
  - ・Đã đăng ký ≥1 data đơn giá

### 手順

ステップ1：
Đăng nhập CHUOKAI, mở `/tanka`, kiểm tra sự có mặt của link tại button "新規登録", link "削除" cột thao tác, cell 単価コード / 単価名

ステップ2：
(Giả định mở rộng seed quyền trong tương lai chỉ còn quyền view) Đăng nhập lại bằng account chỉ có quyền view, kiểm tra cùng màn hình

### 期待結果

ステップ1：
Button "新規登録" hiển thị ở trạng thái active, link "削除" cột thao tác hiển thị ở trạng thái active, cell 単価コード và 単価名 hiển thị dưới dạng link chuyển đến màn hình chỉnh sửa

ステップ2：
Button "新規登録" hiển thị ở trạng thái disable (do không có quyền `tanka.create`), link "削除" cột thao tác hiển thị ở trạng thái disable (do không có quyền `tanka.delete`), cell 単価コード và 単価名 hiển thị dưới dạng text chỉ đọc, không là link chuyển trang (do không có quyền `tanka.update`)

補足：
・Button ở trạng thái disable thay vì ẩn (UX convention: vẫn cho biết chức năng tồn tại, đồng thời cho biết role hiện tại không sử dụng được)

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

Seed quyền hiện hành cấp đồng loạt 4 quyền tanka.* cho CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN, nên ステップ2 là case ngăn regression khi mở rộng tương lai phát sinh việc cấp quyền một phần.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-002-013 — Kiểm soát chuyển trang của breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login

### 手順

ステップ1：
Mở `/tanka`, kiểm tra breadcrumb

ステップ2：
Click link "ホーム" trên breadcrumb

### 期待結果

ステップ1：
Breadcrumb hiển thị 2 cấp "ホーム > 単価マスタ明細検索画面", cấp cuối không phải link mà là text

ステップ2：
Chuyển về `/dashboard`

補足：
・Breadcrumb đúng theo định nghĩa §1.2 của tài liệu thiết kế màn hình (lược bỏ cấp trung gian マスタ管理, màn hình list là 2 cấp)

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

## ACSMS-TC-002-014 — Hiển thị highlight item trên sidebar menu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Click item "単価マスタ" trên sidebar từ dashboard

ステップ2：
Sau khi chuyển trang, kiểm tra item "単価マスタ" trên sidebar

ステップ3：
Click một item menu khác trên sidebar (ví dụ: "JAマスタ")

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Item "単価マスタ" trên sidebar hiển thị ở trạng thái active (đổi màu nền)

ステップ3：
Chuyển sang màn hình khác, highlight trên sidebar chuyển sang màn hình mới

補足：
・Hiển thị trực quan của item active được áp dụng bằng design token `bg-primary/10` và `text-primary`

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

## ACSMS-TC-002-015 — Hiển thị tên user và thao tác logout

- 観点ID: VP-A-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login (account name "中央会 太郎")

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Kiểm tra khu vực hiển thị tên user góc trên phải header

ステップ3：
Click icon user để mở dropdown, click "ログアウト"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Tên user đã login được hiển thị (ví dụ: `中央会 太郎`)

ステップ3：
Xử lý logout được thực hiện, chuyển về `/login`, truy cập trực tiếp lại `/tanka` thì chuyển về màn hình login

補足：
・Sau khi logout, Redis session bị xóa, HTTP-only Cookie hết hạn

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

# カテゴリ 4: Validation điều kiện tìm kiếm (Search Filter Validation)

## ACSMS-TC-002-016 — Hiển thị trạng thái khởi tạo của form search

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Kiểm tra giá trị khởi tạo và placeholder của từng item search

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Radio 単価種別 hiển thị ở trạng thái chưa chọn, textbox 単価名 hiển thị trống, input field ngày 適用開始日 / 適用終了日 hiển thị trống với placeholder `YYYY/MM/DD`, radio 有効単価フラグ hiển thị ở trạng thái chưa chọn

補足：
・Khi hiển thị lần đầu, lấy toàn bộ dữ liệu (trong data scope) không có điều kiện search
・Điều kiện sort khởi tạo là `updated_at` giảm dần

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

## ACSMS-TC-002-017 — Search khi radio 単価種別 chọn "新聞購読料"

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký lẫn lộn đơn giá 新聞購読料 (tanka_type=1) và 配達手数料 (tanka_type=2) tại chuokai mình

### 手順

ステップ1：
Chọn "新聞購読料" trên radio 単価種別

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra API request đã gửi

### 期待結果

ステップ1：
Radio "新聞購読料" ở trạng thái được chọn

ステップ2：
Chỉ record có tanka_type = 1 được hiển thị

ステップ3：
Gửi GET `/api/v1/tanka?tanka_type=1&page=1&per_page=20&sort_by=updated_at&sort_order=desc`, trả về HTTP 200

補足：
・Giá trị radio 単価種別 (1 / 2) được lấy động từ category TANKA_TYPE của bảng m_code (không hardcode)

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

## ACSMS-TC-002-018 — Search khi radio 単価種別 chọn "配達手数料"

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥1 đơn giá 配達手数料 (tanka_type=2) tại chuokai mình

### 手順

ステップ1：
Chọn "配達手数料" trên radio 単価種別

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Radio "配達手数料" ở trạng thái được chọn

ステップ2：
Chỉ record có tanka_type = 2 được hiển thị, gửi GET `/api/v1/tanka?tanka_type=2&...`

補足：
・Cột 単価種別 hiển thị label "配達手数料"

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

## ACSMS-TC-002-019 — Khi radio 単価種別 chưa chọn thì trả về toàn bộ

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký lẫn lộn đơn giá 新聞購読料 và 配達手数料 tại chuokai mình

### 手順

ステップ1：
Mở `/tanka` (radio 単価種別 ở trạng thái chưa chọn)

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra parameter của API request

### 期待結果

ステップ1：
Radio 単価種別 ở trạng thái chưa chọn

ステップ2：
Record của cả 新聞購読料 và 配達手数料 đều được hiển thị

ステップ3：
API request không chứa parameter `tanka_type` (GET `/api/v1/tanka?page=1&per_page=20&sort_by=updated_at&sort_order=desc`)

補足：
・Khi chưa chọn thì không áp dụng điều kiện (screen-design 定義項目画面 row 1.0)

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

## ACSMS-TC-002-020 — 単価名 search partial match — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký các đơn giá "基本購読料（月額）" "基本配達手数料" "学割購読料"

### 手順

ステップ1：
Nhập `基本` vào input field 単価名

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra response và API request

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ record có 単価名 chứa `基本` được hiển thị ("基本購読料（月額）" "基本配達手数料" thuộc đối tượng)

ステップ3：
Gửi GET `/api/v1/tanka?tanka_name=基本&...`, trả về HTTP 200, BE thực hiện search partial match bằng `ILIKE '%基本%'`

補足：
・Có thể search partial match
・Có thể nhập ký tự full-width

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

## ACSMS-TC-002-021 — 単価名 tối đa 100 ký tự — Boundary

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dán chuỗi 100 ký tự full-width vào input field 単価名

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?tanka_name=(101 ký tự)`

### 期待結果

ステップ1：
Toàn bộ 100 ký tự có thể nhập được

ステップ2：
Trả về HTTP 200

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `単価名は最大100文字で指定してください。`)

補足：
・Lỗi vượt quá số ký tự được phát hiện ở phía BE

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

## ACSMS-TC-002-022 — 単価名 hành vi trim space đầu-cuối

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Nhập `  基本  ` (2 ký tự half-width space trước-sau) vào input field 単価名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra nội dung hiển thị của input field

ステップ4：
Dùng DevTools kiểm tra parameter của API request đã gửi

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên trạng

ステップ2：
Xử lý search được thực hiện

ステップ3：
Giá trị nhập được trim (input field hiển thị cập nhật thành `基本`)

ステップ4：
Gửi GET `/api/v1/tanka?tanka_name=基本&...` (không có space đầu-cuối)

補足：
・Giá trị nhập được trim (vue.md §List view rule 5a — phía FE thực hiện search sau khi đã trim space đầu-cuối)

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

## ACSMS-TC-002-023 — Search khi 適用開始日 chọn từ date picker

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký các record có 適用開始日 lần lượt là `2026-01-01` / `2026-04-01` / `2025-10-01`

### 手順

ステップ1：
Click input field ngày 適用開始日, mở picker

ステップ2：
Chọn `2026/04/01` trên picker

ステップ3：
Click button "検索"

ステップ4：
Kiểm tra response

### 期待結果

ステップ1：
Date picker được mở

ステップ2：
Input field hiển thị `2026/04/01`

ステップ3：
Gửi GET `/api/v1/tanka?tekiyo_start_date=2026-04-01&...`

ステップ4：
Chỉ record có `tekiyo_start_date >= 2026-04-01` được hiển thị (chỉ record bắt đầu từ ngày chỉ định trở đi. `2025-10-01`, `2026-01-01` không thuộc đối tượng)

補足：
・Format hiển thị là `YYYY/MM/DD`, format trên wire là `YYYY-MM-DD` (vue.md date picker convention)

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

## ACSMS-TC-002-024 — Từ chối format không hợp lệ của 適用開始日

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?tekiyo_start_date=2026/04/01` (phân cách bằng slash)

ステップ2：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?tekiyo_start_date=20260401` (không có phân cách)

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?tekiyo_start_date=2026-13-99` (ngày không hợp lệ)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `適用開始日は YYYY-MM-DD 形式で指定してください。`)

ステップ2：
Trả về HTTP 400 (cùng message)

ステップ3：
Trả về HTTP 400 (cùng message, regex chỉ match `^\d{4}-\d{2}-\d{2}$`)

補足：
・Format chấp nhận chỉ có `YYYY-MM-DD`
・Date picker phía FE luôn normalize bằng `value-format='YYYY-MM-DD'`

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

## ACSMS-TC-002-025 — Search khi 適用終了日 chọn từ date picker (NULL = vô thời hạn không thuộc đối tượng)

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký các record có 適用終了日 lần lượt là `2026-03-31` / `2026-12-31` / NULL

### 手順

ステップ1：
Chọn `2026/12/31` tại input field ngày 適用終了日

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra response và điều kiện DB

### 期待結果

ステップ1：
Input field hiển thị `2026/12/31`

ステップ2：
Gửi GET `/api/v1/tanka?tekiyo_end_date=2026-12-31&...`

ステップ3：
Chỉ record thỏa `tekiyo_end_date IS NOT NULL AND tekiyo_end_date <= 2026-12-31` được hiển thị (`2026-03-31` / `2026-12-31` thuộc đối tượng, NULL không thuộc đối tượng)

補足：
・適用終了日 NULL (vô thời hạn) không thuộc đối tượng (api.md §4.3)

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

## ACSMS-TC-002-026 — Search khi radio 有効単価フラグ chọn "有効"

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký lẫn lộn đơn giá active_flg=true và active_flg=false

### 手順

ステップ1：
Chọn "有効" trên radio 有効単価フラグ

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra parameter của API request

### 期待結果

ステップ1：
Radio "有効" ở trạng thái được chọn

ステップ2：
Chỉ record có active_flg = true được hiển thị

ステップ3：
Gửi GET `/api/v1/tanka?active_flg=true&...`, phía FE normalize string `'1'` thành boolean phía BE để gửi

補足：
・Cột 有効単価フラグ hiển thị "有効" (tag xanh)

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

## ACSMS-TC-002-027 — Search khi radio 有効単価フラグ chọn "無効"

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥1 đơn giá có active_flg=false

### 手順

ステップ1：
Chọn "無効" trên radio 有効単価フラグ

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Radio "無効" ở trạng thái được chọn

ステップ2：
Chỉ record có active_flg = false được hiển thị, gửi GET `/api/v1/tanka?active_flg=false&...`

補足：
・Cột 有効単価フラグ hiển thị "無効" (tag đỏ)

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

## ACSMS-TC-002-028 — Khi radio 有効単価フラグ chưa chọn thì trả về cả hai

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký lẫn lộn đơn giá active_flg=true và active_flg=false

### 手順

ステップ1：
Mở `/tanka` (radio 有効単価フラグ ở trạng thái chưa chọn)

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra parameter của API request

### 期待結果

ステップ1：
Radio 有効単価フラグ ở trạng thái chưa chọn

ステップ2：
Record của cả 有効 và 無効 đều được hiển thị

ステップ3：
API request không chứa parameter `active_flg`

補足：
・Khi chưa chọn (khi lược bỏ) thì trả về cả hai (有効・無効) (api.md §4.3)

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

## ACSMS-TC-002-029 — Nhập ký tự đặc biệt vào item search — Đối sách chống SQL Injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Nhập `' OR '1'='1` vào input field 単価名

ステップ2：
Click button "検索"

ステップ3：
Nhập `; DROP TABLE m_tanka; --` vào input field 単価名

ステップ4：
Click button "検索"

ステップ5：
Kiểm tra trạng thái DB: `SELECT COUNT(*) FROM m_tanka`

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên trạng

ステップ2：
Hiển thị 0 kết quả search, hiển thị `検索結果が見つかりませんでした。`

ステップ3：
Giá trị nhập được phản ánh nguyên trạng

ステップ4：
Hiển thị 0 kết quả search

ステップ5：
Bảng `m_tanka` không bị xóa, số dòng không thay đổi

補足：
・Nhờ parameterized query, ký tự đặc biệt không bị diễn dịch thành SQL injection (sử dụng `setParameters` của TypeORM)

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

# カテゴリ 5: Tìm kiếm / Sort / Pagination (Search / Sort / Pagination)

## ACSMS-TC-002-030 — Hiển thị lần đầu — Lấy toàn bộ không có điều kiện search (trong data scope)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký khoảng 30 data đơn giá của chuokai mình

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Dùng DevTools kiểm tra API request đã gửi

ステップ3：
Kiểm tra hiển thị của table list

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Gửi GET `/api/v1/tanka?page=1&per_page=20&sort_by=updated_at&sort_order=desc`

ステップ3：
Hiển thị 20 dòng trang đầu theo updated_at giảm dần, pagination hiển thị "全 30 件"

補足：
・Record được cập nhật mới nhất hiển thị ở đầu
・Theo data scope, chỉ record của chuokai của mình được trả về
・Điều kiện thời gian áp dụng (`tekiyo_end_date IS NULL OR tekiyo_end_date >= CURRENT_DATE`) được áp dụng

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

## ACSMS-TC-002-031 — Search kết hợp nhiều điều kiện bằng AND

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký khoảng 20 data đơn giá

### 手順

ステップ1：
Lần lượt nhập / chọn 単価種別 "新聞購読料", 単価名 `基本`, 適用開始日 `2026-04-01`, 有効単価フラグ "有効"

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra API request đã gửi

### 期待結果

ステップ1：
Giá trị nhập được phản ánh trên 4 item

ステップ2：
Chỉ record khớp với cả 4 điều kiện được hiển thị

ステップ3：
Gửi GET `/api/v1/tanka?tanka_type=1&tanka_name=基本&tekiyo_start_date=2026-04-01&active_flg=true&page=1&per_page=20&sort_by=updated_at&sort_order=desc`

補足：
・Điều kiện search được áp dụng theo AND (không phải OR)
・Chỉ data khớp điều kiện search được hiển thị

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

## ACSMS-TC-002-032 — Search AND chỉ định khoảng 適用開始日・終了日

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký record có 適用開始日 `2026-04-01` 〜 適用終了日 `2027-03-31`

### 手順

ステップ1：
Nhập 適用開始日 `2026-04-01`, 適用終了日 `2027-03-31`

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools kiểm tra API request

### 期待結果

ステップ1：
Giá trị được phản ánh trên cả hai input field

ステップ2：
Chỉ record thỏa `tekiyo_start_date >= 2026-04-01 AND tekiyo_end_date IS NOT NULL AND tekiyo_end_date <= 2027-03-31` được hiển thị

ステップ3：
Gửi GET `/api/v1/tanka?tekiyo_start_date=2026-04-01&tekiyo_end_date=2027-03-31&...`

補足：
・Record có 適用終了日 NULL (vô thời hạn) không thuộc đối tượng search ở tổ hợp này

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

## ACSMS-TC-002-033 — Hành vi button "検索クリア"

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Nhập 単価種別 "新聞購読料", 単価名 `基本`, 適用開始日 `2026-04-01`, 有効単価フラグ "有効"

ステップ2：
Click button "検索", lọc kết quả

ステップ3：
Click button "検索クリア"

ステップ4：
Kiểm tra form search và hiển thị list

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Kết quả đã lọc được hiển thị

ステップ3：
Xử lý được thực hiện

ステップ4：
Điều kiện search được clear (单价种别 chưa chọn, 単価名 trống, 適用開始日 / 適用終了日 trống, 有効単価フラグ chưa chọn), điều kiện sort cũng quay về giá trị khởi tạo (updated_at giảm dần), lấy lại toàn bộ và hiển thị trang đầu, hiển thị toast `検索条件をクリアしました。` (ACSMS-MSG-002-002)

補足：
・Điều kiện search được clear
・Hiển thị trang đầu tiên

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

## ACSMS-TC-002-034 — Sort — 単価コード tăng dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥10 data đơn giá

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Click header cột "単価コード" 1 lần

ステップ3：
Kiểm tra API request và thứ tự hiển thị

### 期待結果

ステップ1：
Hiển thị ở trạng thái khởi tạo (updated_at giảm dần)

ステップ2：
Icon sort chuyển sang ▲ (tăng dần)

ステップ3：
Gửi GET `/api/v1/tanka?...&sort_by=tanka_code&sort_order=asc`, được sắp xếp và hiển thị theo 単価コード tăng dần

補足：
・Thứ tự sort đúng
・Sort được áp dụng trong khi giữ nguyên điều kiện search hiện tại

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

## ACSMS-TC-002-035 — Sort — 単価コード giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥10 data đơn giá

### 手順

ステップ1：
Click header cột "単価コード" 1 lần (tăng dần)

ステップ2：
Click header cột "単価コード" thêm 1 lần (giảm dần)

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (tăng dần), hiển thị theo 単価コード tăng dần

ステップ2：
Icon sort chuyển sang ▼ (giảm dần), gửi GET `/api/v1/tanka?...&sort_by=tanka_code&sort_order=desc`, được sắp xếp và hiển thị theo 単価コード giảm dần

補足：
・Thứ tự sort đúng

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

## ACSMS-TC-002-036 — Sort — 単価名 tăng dần / giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Click header cột "単価名" 1 lần

ステップ2：
Kiểm tra API request và thứ tự hiển thị

ステップ3：
Click header cột "単価名" thêm 1 lần

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (tăng dần)

ステップ2：
Gửi GET `/api/v1/tanka?...&sort_by=tanka_name&sort_order=asc`, được sắp xếp và hiển thị theo 単価名 tăng dần

ステップ3：
Gửi GET `/api/v1/tanka?...&sort_by=tanka_name&sort_order=desc`, được sắp xếp và hiển thị theo 単価名 giảm dần

補足：
・Thứ tự sort đúng

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

## ACSMS-TC-002-037 — Sort — 適用開始日 tăng dần / giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Click header cột "適用開始日" 1 lần

ステップ2：
Click header cột "適用開始日" thêm 1 lần

### 期待結果

ステップ1：
Gửi GET `/api/v1/tanka?...&sort_by=tekiyo_start_date&sort_order=asc`, được sắp xếp và hiển thị theo 適用開始日 tăng dần

ステップ2：
Gửi GET `/api/v1/tanka?...&sort_by=tekiyo_start_date&sort_order=desc`, được sắp xếp và hiển thị theo 適用開始日 giảm dần

補足：
・Thứ tự sort đúng

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

## ACSMS-TC-002-038 — Sort — 適用終了日 tăng dần / giảm dần (thứ tự sort của NULL)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có record có 適用終了日 NULL và record có `2026-12-31` lẫn lộn

### 手順

ステップ1：
Click header cột "適用終了日" 1 lần (tăng dần)

ステップ2：
Kiểm tra thứ tự hiển thị

ステップ3：
Click header cột "適用終了日" thêm 1 lần (giảm dần)

### 期待結果

ステップ1：
Gửi GET `/api/v1/tanka?...&sort_by=tekiyo_end_date&sort_order=asc`

ステップ2：
Được sắp xếp và hiển thị theo 適用終了日 tăng dần, NULL hiển thị ở cuối theo mặc định của PostgreSQL

ステップ3：
Gửi GET `/api/v1/tanka?...&sort_by=tekiyo_end_date&sort_order=desc`, chuyển sang giảm dần

補足：
・Thứ tự sort đúng
・Thứ tự sắp xếp của NULL theo hành vi mặc định `NULLS LAST` của PostgreSQL

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

## ACSMS-TC-002-039 — Sort — Hành vi khi click cột không thuộc đối tượng sort

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Click header cột "単価種別"

ステップ2：
Click header cột "有効単価フラグ"

ステップ3：
Click header cột "単価（税込）" "単価（税抜）" "税率"

ステップ4：
Dùng DevTools kiểm tra sự phát sinh của API request

### 期待結果

ステップ1：
Icon sort không được hiển thị, hiển thị cột không thay đổi

ステップ2：
Icon sort không được hiển thị

ステップ3：
Icon sort không được hiển thị

ステップ4：
Không phát sinh API request mới

補足：
・Cột thuộc đối tượng sort định nghĩa tại §8 của tài liệu thiết kế màn hình chỉ là "単価コード" "単価名" "適用開始日" "適用終了日"
・単価種別 / 有効単価フラグ / 単価（税込）/ 単価（税抜）/ 税率 / 操作 không sort được

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

## ACSMS-TC-002-040 — Sort — Từ chối sort_by ngoài allowlist của BE

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?sort_by=tanka_type&sort_order=asc`

ステップ2：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?sort_by=active_flg&sort_order=asc`

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/tanka?sort_by=tanka_code;%20DROP%20TABLE&sort_order=asc`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `ソート対象カラムが不正です。`)

ステップ2：
Trả về HTTP 400 (cùng message)

ステップ3：
Trả về HTTP 400 (cùng message)

補足：
・Nhờ phương thức allowlist, SQL injection dạng `ORDER BY ${sort_by}` bị từ chối
・Giá trị cho phép là 8 giá trị `tanka_code` / `tanka_name` / `kingaku_zeikomi` / `kingaku_zeinuki` / `tax_rate` / `tekiyo_start_date` / `tekiyo_end_date` / `updated_at` (SearchTankaDto.TANKA_SEARCH_SORT_BY)

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

## ACSMS-TC-002-041 — Chiều sort — Từ chối giá trị sort_order không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/tanka?sort_by=tanka_code&sort_order=ascending`

ステップ2：
Dùng DevTools gửi GET `/api/v1/tanka?sort_by=tanka_code&sort_order=random`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `ソート方向は asc / desc のみ指定可能です。`)

ステップ2：
Trả về HTTP 400 (cùng message)

補足：
・Giá trị cho phép chỉ là `asc` / `desc`

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

## ACSMS-TC-002-042 — Pagination — Chuyển trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký 124 data đơn giá của chuokai mình

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Click button "2" trên pagination

ステップ3：
Dùng DevTools kiểm tra API request

ステップ4：
Click button "次へ (>)"

### 期待結果

ステップ1：
Hiển thị trang 1 (dòng 1-20), pagination hiển thị "全 124 件"

ステップ2：
Hiển thị trang 2 (dòng 21-40), active trên pagination chuyển sang "2"

ステップ3：
Gửi GET `/api/v1/tanka?...&page=2&per_page=20&...`

ステップ4：
Hiển thị trang 3 (dòng 41-60)

補足：
・Khi chuyển số trang, điều kiện search và điều kiện sort được giữ lại

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

## ACSMS-TC-002-043 — Pagination — Chuyển số dòng hiển thị mỗi trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký 124 data đơn giá của chuokai mình

### 手順

ステップ1：
Mở dropdown bên cạnh pagination

ステップ2：
Kiểm tra các option

ステップ3：
Chọn "50 / 頁"

ステップ4：
Chọn "100 / 頁"

### 期待結果

ステップ1：
Dropdown được mở

ステップ2：
Hiển thị 4 option "10 / 頁" "20 / 頁" "50 / 頁" "100 / 頁", lựa chọn khởi tạo là "20 / 頁"

ステップ3：
Gửi GET `/api/v1/tanka?...&per_page=50&...`, hiển thị tối đa 50 dòng trong list, tổng số trang được tính lại

ステップ4：
Gửi GET `/api/v1/tanka?...&per_page=100&...`, hiển thị tối đa 100 dòng trong list

補足：
・Giới hạn trên của per_page là 100 dòng (ràng buộc DTO `@Max(100)`)

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

## ACSMS-TC-002-044 — Pagination — Từ chối per_page vượt giới hạn trên

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/tanka?page=1&per_page=101`

ステップ2：
Dùng DevTools gửi GET `/api/v1/tanka?page=1&per_page=0`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `1ページの件数は最大100件です。`)

ステップ2：
Trả về HTTP 400 (message `1ページの件数は1以上で指定してください。`)

補足：
・per_page là số nguyên trong khoảng 1 đến 100

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

## ACSMS-TC-002-045 — Pagination — Từ chối page ≤ 0

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/tanka?page=0&per_page=20`

ステップ2：
Dùng DevTools gửi GET `/api/v1/tanka?page=-1&per_page=20`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `ページ番号は1以上で指定してください。`)

ステップ2：
Trả về HTTP 400 (cùng message)

補足：
・page là số nguyên ≥ 1

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

## ACSMS-TC-002-046 — Kế thừa điều kiện search・sort giữa các trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥50 data đơn giá

### 手順

ステップ1：
Nhập `基本` vào 単価名, click "検索"

ステップ2：
Click cột "単価コード", sort tăng dần

ステップ3：
Click button "2" trên pagination

ステップ4：
Dùng DevTools kiểm tra API request

### 期待結果

ステップ1：
Kết quả đã lọc được hiển thị tại trang 1

ステップ2：
Được sắp xếp và hiển thị theo 単価コード tăng dần

ステップ3：
Chuyển sang trang 2

ステップ4：
Gửi GET `/api/v1/tanka?tanka_name=基本&page=2&per_page=20&sort_by=tanka_code&sort_order=asc`

補足：
・Điều kiện search được giữ lại
・Điều kiện sort được giữ lại

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

# カテゴリ 6: Logic nghiệp vụ (Function — List / Delete)

## ACSMS-TC-002-047 — Lấy list — Normal

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký 3 data đơn giá của chuokai mình (1 新聞購読料, 2 配達手数料)

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Tại tab Network của DevTools, kiểm tra response JSON của `/api/v1/tanka`

ステップ3：
Đối chiếu từng item của response JSON với hiển thị trên màn hình

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Trả về HTTP 200, format của response body là `{ data: [...], meta: { total, page, per_page, total_pages } }`

ステップ3：
Mỗi record chứa `tanka_id` / `tanka_type` / `tanka_code` / `tanka_name` / `tekiyo_start_date` / `tekiyo_end_date` / `kingaku_zeikomi` / `kingaku_zeinuki` / `tax_rate` / `active_flg`, `tanka_type` là số (1 hoặc 2), `tekiyo_end_date` là YYYY-MM-DD hoặc null, `active_flg` là boolean

補足：
・Đảm bảo tính toàn vẹn dữ liệu
・Output normal log
・Field label dạng `tanka_type_label` v.v. không được chứa (phía FE lấy từ m_code)

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

## ACSMS-TC-002-048 — Filter thời gian áp dụng (chỉ hiển thị từ CURRENT_DATE trở đi)

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có lẫn lộn record có 適用終了日 `2025-12-31` (quá khứ) và NULL (vô thời hạn)

### 手順

ステップ1：
Mở `/tanka` (không chỉ định điều kiện search)

ステップ2：
Kiểm tra nội dung hiển thị của table list

ステップ3：
Kiểm tra DB: `SELECT tanka_id, tekiyo_end_date FROM m_tanka WHERE ja_id = :ja_id AND deleted_at IS NULL`

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Record có 適用終了日 `2025-12-31` (quá khứ) không được hiển thị, chỉ record có NULL (vô thời hạn) và `>= CURRENT_DATE` được hiển thị

ステップ3：
Trong DB record quá khứ vẫn còn lưu lại (không bị xóa logical), nhưng bị loại trừ khỏi list bởi SQL của API `WHERE (tekiyo_end_date IS NULL OR tekiyo_end_date >= CURRENT_DATE)`

補足：
・Điều kiện thời gian áp dụng được áp dụng (api.md §4.3 điều kiện cơ bản)

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

## ACSMS-TC-002-049 — Click button "新規登録" — Chuyển sang màn hình đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có quyền `tanka.create`

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Click button "新規登録"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Chuyển sang màn hình đăng ký Master Đơn giá (`/tanka/create`), form hiển thị với giá trị khởi tạo trống

補足：
・Đích chuyển trang là ACSMS-SCR-003 (màn hình đăng ký Master Đơn giá)
・Breadcrumb hiển thị 3 cấp "ホーム > 単価マスタ明細検索画面 > 単価マスタ登録画面"

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

## ACSMS-TC-002-050 — Click link 単価コード / 単価名 — Chuyển sang màn hình chỉnh sửa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký 単価コード `T001` (tanka_id = 1)
  - ・Có quyền `tanka.update`

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Click link cell 単価コード `T001` trong list

ステップ3：
Quay lại list bằng browser back, click link cell 単価名

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Chuyển sang màn hình chỉnh sửa Master Đơn giá (`/tanka/1/edit`), giá trị hiện có hiển thị trên form

ステップ3：
Cell 単価名 cũng chuyển sang màn hình chỉnh sửa (`/tanka/1/edit`) (cùng đường dẫn chỉnh sửa đến cùng record)

補足：
・Đích chuyển trang là mode chỉnh sửa của ACSMS-SCR-003 (màn hình đăng ký Master Đơn giá)

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

## ACSMS-TC-002-051 — Click button 削除 — Hiển thị dialog confirm

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký đơn giá đối tượng xóa "削除対象単価" (tanka_id = 5), không có data liên quan
  - ・Có quyền `tanka.delete`

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Click link "削除" cột thao tác của record đối tượng

ステップ3：
Kiểm tra nội dung dialog được hiển thị

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Hiển thị dialog confirm xóa

ステップ3：
Body dialog hiển thị `この単価を削除してもよろしいですか？` (ACSMS-MSG-002-005), title dialog "削除確認", button "はい" "いいえ" được hiển thị, button "はい" có dạng danger (màu đỏ)

補足：
・Hiển thị dialog confirm xóa
・Tại thời điểm này không phát sinh API request

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

## ACSMS-TC-002-052 — Thực hiện xóa — Click "はい" — Xóa logical + reload list

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký đơn giá đối tượng xóa (tanka_id = 5), không có data liên quan
  - ・Có quyền `tanka.delete`

### 手順

ステップ1：
Click link "削除", hiển thị dialog confirm

ステップ2：
Click button "はい" trên dialog

ステップ3：
Kiểm tra DB: `SELECT tanka_id, deleted_at, updated_by FROM m_tanka WHERE tanka_id = 5`

ステップ4：
Kiểm tra DB: `SELECT log_type, operation, target_id, target_table, result_status, before_value FROM t_log WHERE target_id = 5 AND target_table = 'm_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
DELETE `/api/v1/tanka/5` được gửi, trả về HTTP 200, hiển thị toast `削除しました。` (ACSMS-MSG-002-007), list được lấy lại và record tương ứng không hiển thị nữa

ステップ3：
Data bị xóa logical (`deleted_at IS NOT NULL`, `updated_by` là `account_id` của test account)

ステップ4：
Audit log được record (`log_type = 1`, `gamen_name = '単価マスタ明細検索画面 (ACSMS-SCR-002)'`, `operation = 'DELETE'`, `target_id = 5`, `target_table = 'm_tanka'`, `result_status = 1`, `before_value` chứa JSON data trước khi xóa, `after_value` là chuỗi rỗng)

補足：
・Data bị xóa (xóa logical)
・Transaction được commit
・Xử lý chính + audit log được thực hiện trong 1 transaction (nestjs.md §Audit Log)

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

## ACSMS-TC-002-053 — Hủy xóa — Click "いいえ"

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký đơn giá đối tượng xóa (tanka_id = 5)

### 手順

ステップ1：
Click link "削除", hiển thị dialog confirm

ステップ2：
Click button "いいえ" trên dialog

ステップ3：
Dùng DevTools kiểm tra sự phát sinh của API request

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM m_tanka WHERE tanka_id = 5`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
Dialog đóng, hiển thị list không thay đổi

ステップ3：
DELETE request không phát sinh

ステップ4：
Vẫn giữ `deleted_at IS NULL` (không bị xóa)

補足：
・Xử lý không được thực hiện
・Không ảnh hưởng item khác

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

## ACSMS-TC-002-054 — Xóa — Lỗi 409 khi có data liên quan (販売店 tham chiếu 配達手数料単価)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Tồn tại ≥1 record 販売店 liên quan đến đơn giá đối tượng xóa (tanka_id = 5, 配達手数料): `m_hanbaiten.haitatsuryo_tanka_id = 5`

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog confirm

ステップ2：
Kiểm tra response và trạng thái DB

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_tanka WHERE tanka_id = 5`

### 期待結果

ステップ1：
DELETE `/api/v1/tanka/5` được gửi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`), hiển thị toast message `この単価は関連オブジェクトに紐づいているため削除できません。` (ACSMS-MSG-002-006)

ステップ3：
Record đối tượng trong `m_tanka` vẫn ở `deleted_at IS NULL`

補足：
・Data liên quan không bị xóa
・Xử lý xóa được rollback

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

Trong danh sách error api.md (common) là `関連データが存在するため削除できません。`, message màn hình ACSMS-MSG-002-006 là `この単価は関連オブジェクトに紐づいているため削除できません。`. Phía implement trả về văn bản của api.md như canonical.

## ACSMS-TC-002-055 — Xóa — Lỗi 409 khi có data liên quan (購読者 tham chiếu đơn giá)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Tồn tại ≥1 record 購読者 liên quan đến đơn giá đối tượng xóa (tanka_id = 6, 新聞購読料): `t_dokusya.tanka_id = 6`

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog confirm

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
DELETE `/api/v1/tanka/6` được gửi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`), không bị xóa logical

補足：
・Data liên quan không bị xóa
・Tham chiếu từ 購読者 cũng là yếu tố chặn xóa tương đương m_hanbaiten (api.md §4.4)

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

## ACSMS-TC-002-056 — Xóa — Lỗi 404 khi ID không tồn tại

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/tanka/99999` (ID không tồn tại)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された単価が見つかりません。`)

補足：
・Data đối tượng không tồn tại

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

## ACSMS-TC-002-057 — Xóa — Lỗi 404 khi ID đã bị xóa (race condition xóa đồng thời)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký đơn giá (tanka_id = 8)

### 手順

ステップ1：
Mở màn hình list trên browser A

ステップ2：
Xóa cùng đơn giá (tanka_id = 8) trên browser B

ステップ3：
Click link "削除" của cùng đơn giá ở browser A, click "はい"

### 期待結果

ステップ1：
List được hiển thị

ステップ2：
Xóa thành công ở browser B

ステップ3：
DELETE `/api/v1/tanka/8` gửi từ browser A, trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された単価が見つかりません。`)

補足：
・Không phát sinh bất đồng bộ dữ liệu
・Khi race condition xóa đồng thời, request đến sau cùng trả về 404

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

## ACSMS-TC-002-058 — Ghi audit log khi xóa lỗi

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có data liên quan đối với đơn giá đối tượng xóa (tanka_id = 9)

### 手順

ステップ1：
Click link "削除", click "はい"

ステップ2：
Kiểm tra DB: `SELECT log_type, operation, result_status, error_message FROM t_log WHERE target_id = 9 AND target_table = 'm_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 409

ステップ2：
Error log được record (`log_type = 3`, `operation = 'DELETE'`, `result_status = 2`, `error_message` chứa chi tiết lỗi)

補足：
・Output error log
・Error log được record ngoài transaction, nên vẫn tồn tại sau khi xử lý nghiệp vụ bị rollback (nestjs.md §Audit Log)

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

## ACSMS-TC-002-059 — Kiểm chứng tính hoàn chỉnh của audit log (khi xóa thành công)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký đơn giá đối tượng xóa (tanka_id = 10), không có data liên quan

### 手順

ステップ1：
Thực hiện xóa (link "削除" → "はい")

ステップ2：
Kiểm tra DB: `SELECT log_type, log_datetime, account_id, gamen_name, operation, result_status, target_id, target_table, before_value, after_value, ip_address, user_agent FROM t_log WHERE target_id = 10 AND target_table = 'm_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Xử lý xóa thành công

ステップ2：
Audit log được record, từng cột có giá trị như sau:
・log_type = 1 (user_operation)
・gamen_name = `単価マスタ明細検索画面 (ACSMS-SCR-002)`
・operation = `DELETE`
・result_status = 1 (success)
・target_id = 10
・target_table = `m_tanka`
・before_value chứa data trước khi xóa dạng JSON (chứa tanka_id / ja_id / tanka_type / tanka_code / tanka_name / kingaku_zeikomi / kingaku_zeinuki / tax_rate / tekiyo_start_date / tekiyo_end_date)
・after_value là chuỗi rỗng
・ip_address / user_agent được record bằng giá trị nguồn request

補足：
・Audit log được record
・Đảm bảo tính toàn vẹn dữ liệu

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

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-002-060 — Xử lý 401 khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login, session tồn tại
  - ・Có thể force-expire Redis session bằng tool quản trị, hoặc test sau 24h

### 手順

ステップ1：
Trong khi đang mở `/tanka`, force-expire session

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra chuyển trang và hành vi sau khi re-login

### 期待結果

ステップ1：
Màn hình vẫn được hiển thị nguyên trạng

ステップ2：
Đối với GET `/api/v1/tanka`, trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Chuyển về `/login?redirect=/tanka`, sau khi re-login quay lại URL gốc `/tanka`

補足：
・Khi session hết hạn, chuyển về màn hình login
・`user` của Pinia store được khởi tạo lại thành null

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

## ACSMS-TC-002-061 — Parameter request không hợp lệ — BAD_REQUEST

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/tanka?page=abc&per_page=xyz`

ステップ2：
Dùng DevTools gửi GET `/api/v1/tanka?tanka_type=abc` (không phải số)

ステップ3：
Kiểm tra response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `単価種別は数値で指定してください。`)

ステップ3：
Response body chứa `error_code` và `message`

補足：
・Lỗi khi parameter không hợp lệ
・Khi là lỗi validation, mảng `errors` chứa lỗi theo từng item

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

## ACSMS-TC-002-062 — Lỗi validation — VALIDATION_ERROR shape mảng

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/tanka?tanka_name=(101 ký tự)&tekiyo_start_date=invalid&sort_by=evil` (vi phạm nhiều item đồng thời)

ステップ2：
Kiểm tra response JSON

### 期待結果

ステップ1：
Request được gửi

ステップ2：
Trả về HTTP 400, response body có format `{ error_code: 'VALIDATION_ERROR', message: '入力値が不正です。詳細はerrorsフィールドを確認してください。', errors: [{ field, message }, ...] }`, mảng `errors` lần lượt chứa message vi phạm của `tanka_name` / `tekiyo_start_date` / `sort_by`

補足：
・Response dạng JSON
・Message được trả về theo từng item vi phạm validation

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

## ACSMS-TC-002-063 — Vượt rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Rate limit: ≥100 request trong 60 giây thì 429

### 手順

ステップ1：
Dùng DevTools hoặc script gửi quá 100 request đến `/api/v1/tanka` trong 60 giây

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request liên tiếp được gửi

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

補足：
・Rate limit hoạt động
・Phía FE hiển thị message bằng toast

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

## ACSMS-TC-002-064 — Lỗi server — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Giả lập lỗi kết nối DB phía server (dừng DB / cắt network)

### 手順

ステップ1：
Giả lập phát sinh lỗi kết nối DB

ステップ2：
Mở `/tanka` hoặc click button "検索"

ステップ3：
Kiểm tra response và hiển thị toast

### 期待結果

ステップ1：
Ở trạng thái lỗi kết nối DB

ステップ2：
Đối với GET `/api/v1/tanka`, trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`, ACSMS-MSG-002-004)

ステップ3：
Hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`, list hiển thị rỗng

補足：
・Không phát sinh lỗi ngoài dự kiến
・Không bị terminate bất thường
・Output error log

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

## ACSMS-TC-002-065 — Xử lý khi ngắt kết nối network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Tại tab Network của DevTools, chọn "Offline" (ngắt network)

ステップ3：
Click button "検索"

ステップ4：
Kiểm tra trạng thái request tại tab Network của DevTools

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Ở trạng thái ngắt network

ステップ3：
Request thất bại, hiển thị toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` hoặc message tương đương

ステップ4：
Sau khi reconnect network, search lại lấy được bình thường

補足：
・Không phát sinh lỗi ngoài dự kiến
・Không ảnh hưởng chức năng cũ

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

Văn bản toast khi ngắt network là giá trị mặc định của axios interceptor (network error). Chưa được spec hóa rõ ràng, ghi nhận là TBD.

## ACSMS-TC-002-066 — Kiểm tra cờ bảo mật Cookie

- 観点ID: VP-A-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Môi trường production / staging (HTTPS)

### 手順

ステップ1：
Truy cập `/tanka`

ステップ2：
DevTools → Application → Cookies → kiểm tra Cookie `session_id`

ステップ3：
Thực thi `document.cookie` trên JavaScript console

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Cookie `session_id` được set đầy đủ các cờ `HttpOnly` / `Secure` / `SameSite=Strict` / `Path=/` / `Max-Age=86400`

ステップ3：
`session_id` không hiển thị trong `document.cookie` (do là HttpOnly)

補足：
・Bắt buộc token auth
・Các cờ chuẩn để chống rò rỉ session ID được set

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

## ACSMS-TC-002-067 — Gọi trực tiếp API khi chưa xác thực

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái chưa login (Cookie đã xóa)

### 手順

ステップ1：
Xóa toàn bộ Cookie của browser

ステップ2：
Dùng DevTools hoặc curl gửi trực tiếp GET `/api/v1/tanka`

ステップ3：
Gửi trực tiếp DELETE `/api/v1/tanka/1`

### 期待結果

ステップ1：
Cookie bị xóa

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Trả về HTTP 401 (như trên)

補足：
・Access trực tiếp URL thì lỗi
・Bắt buộc token auth

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

## ACSMS-TC-002-068 — Vi phạm DataScope — Thử xóa record của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・JA khác (ja-002) có record đơn giá (tanka_id = 100)

### 手順

ステップ1：
Login bằng JA_HONTEN thuộc ja-001

ステップ2：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/tanka/100` (ID của JA khác)

ステップ3：
Dùng DevTools gửi GET `/api/v1/tanka`, kiểm tra data response

### 期待結果

ステップ1：
Login thành công

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された単価が見つかりません。`, trả về 404 thay vì 403 để che giấu sự tồn tại)

ステップ3：
Mảng `data` của response chỉ chứa record có ja_id = 1, không chứa record có tanka_id = 100

補足：
・Data của JA khác được coi như không tồn tại
・Access trực tiếp URL thì lỗi
・Theo data scope, record của JA khác không được trả về kể cả với GET

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

## ACSMS-TC-002-069 — Đơn giá đã xóa không hiển thị

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Có ≥1 đơn giá đã bị xóa logical (`deleted_at IS NOT NULL`)

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Search bằng 単価名 của đơn giá đã xóa

ステップ3：
Kiểm tra DB: `SELECT tanka_id, tanka_code, deleted_at FROM m_tanka WHERE deleted_at IS NOT NULL`

### 期待結果

ステップ1：
Data đã xóa không hiển thị trong list

ステップ2：
Khi nhập 単価名 của đơn giá đã xóa cũng hiển thị 0 kết quả search (`検索結果が見つかりませんでした。`)

ステップ3：
Trong DB record đã xóa vẫn còn lưu lại (xóa logical chứ không phải xóa vật lý)

補足：
・Data đã xóa không hiển thị
・Điều kiện `WHERE deleted_at IS NULL` được áp dụng trong SQL của BE

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

## ACSMS-TC-002-070 — Performance hiển thị data lớn

- 観点ID: VP-F-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng ký ≥5000 data đơn giá của chuokai mình

### 手順

ステップ1：
Mở `/tanka`

ステップ2：
Tại tab Network của DevTools, đo response time của GET `/api/v1/tanka`

ステップ3：
Chuyển đến trang cuối bằng pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Đơn giá được hiển thị

ステップ2：
Response time dưới 3 giây, `meta.total: 5000` trở lên

ステップ3：
Trang cuối hiển thị trong vòng 3 giây

補足：
・Không bị timeout
・Đảm bảo tính toàn vẹn dữ liệu

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
