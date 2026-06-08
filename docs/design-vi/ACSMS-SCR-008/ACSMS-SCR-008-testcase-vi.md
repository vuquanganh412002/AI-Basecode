---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-008
screen_name: 管理支店マスタ明細検索画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý (ACSMS-SCR-008)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-008 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý |
| 2 | ACSMS-SCR-008-api | Tài liệu thiết kế API tìm kiếm chi tiết Master Chi nhánh Quản lý |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation điều kiện tìm kiếm (Search Filter Validation) | 14 |
| 5 | Tìm kiếm / Sort / Pagination (Search / Sort / Pagination) | 17 |
| 6 | Logic nghiệp vụ (Function — List / Delete) | 12 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 10 |
|  | Tổng | 68 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-008-001 — Cho phép NICHINO_ADMIN xem màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `kanri_shiten.view`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Click "管理支店マスタ" trên sidebar, mở URL `/kanri-shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/kanri-shiten`, kiểm tra response

### 期待結果

ステップ1：
Item "管理支店マスタ" được hiển thị trên sidebar (do có quyền `kanri_shiten.view`)

ステップ2：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị, form search và danh sách chi nhánh quản lý (updated_at giảm dần) được render

ステップ3：
Trả về HTTP 200, response body chứa mảng `data` và object `meta`

補足：
・Button "新規登録" hiển thị ở trạng thái active (do có quyền `kanri_shiten.create`)
・Link "削除" tại cột thao tác hiển thị ở trạng thái active (do có quyền `kanri_shiten.delete`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-002 — Cấm NICHINO_STAFF truy cập màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Mở dashboard, kiểm tra hiển thị item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/kanri-shiten`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_kanri_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar (do không có quyền `kanri_shiten.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log được ghi, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block truy cập
・Không phát sinh thay đổi đối với `m_kanri_shiten`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo ma trận quyền tại `docs/database/seeder.md §3`, `kanri_shiten.view` chỉ cấp cho NICHINO_ADMIN (thiết kế màn hình §1.3 có gợi ý mở rộng sang role khác trong tương lai nhưng seed quyền hiện tại chưa cấp).

## ACSMS-TC-008-003 — Cấm CHUOKAI truy cập màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Kiểm tra hiển thị item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/kanri-shiten`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Cả 3 tầng đều block truy cập
・Theo `account_concept.md ※4` có kế hoạch tương lai cấp quyền edit một phần item cho CHUOKAI, nhưng seed quyền hiện tại (seeder.md §3) chưa cấp ngay cả quyền view

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Khi mở rộng trong tương lai, case này sẽ được phân loại lại thành normal (chỉ xem được chuokai của mình).

## ACSMS-TC-008-004 — Cấm JA_HONTEN truy cập màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Kiểm tra hiển thị item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/kanri-shiten?kanri_shiten_code=013`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・Cả 3 tầng đều block truy cập
・Khi mở rộng trong tương lai, case này sẽ được phân loại lại thành normal (chỉ xem được JA của mình)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-005 — Cấm JA_KANRI_SHITEN truy cập màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Kiểm tra hiển thị item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/kanri-shiten`

ステップ4：
Truy cập trực tiếp URL `/kanri-shiten/1/edit`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

ステップ4：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

補足：
・Tất cả URL truy cập trực tiếp đều bị chặn
・Khi mở rộng trong tương lai, case này sẽ được phân loại lại thành normal (chỉ xem được chi nhánh quản lý của mình)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-008-006 — Layout tổng thể màn list khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trình duyệt: Chrome (latest), độ phân giải 1920×1080
  - ・Có ≥3 record chi nhánh quản lý đã đăng ký

### 手順

ステップ1：
Click "管理支店マスタ" trên sidebar, mở `/kanri-shiten`

ステップ2：
So sánh song song màn hình với tài liệu thiết kế (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí từng phần breadcrumb / form search / table list / pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Màu nền, font, font size, padding/margin, màu button, style ô input tất cả đều khớp với tài liệu thiết kế

ステップ3：
Bố cục đúng theo tài liệu thiết kế

補足：
・Không phát sinh sai lệch về thị giác so với tài liệu thiết kế
・Design token (design-tokens.ts) được áp dụng, không có hardcode color

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-007 — Cấu trúc cột bảng list khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có ≥3 record chi nhánh quản lý đã đăng ký

### 手順

ステップ1：
Mở `/kanri-shiten`, kiểm tra header của table list

ステップ2：
Kiểm tra tên cột, độ rộng và canh lề theo thứ tự từ trái sang phải (管理支店コード / 管理支店名 / 都道府県 / 郵便番号 / 住所 / 電話番号 / FAX / 紙版 / 電子版 / 操作)

ステップ3：
Kiểm tra hiển thị của icon sort

### 期待結果

ステップ1：
Table list được hiển thị

ステップ2：
Theo §定義項目画面 trong tài liệu thiết kế, hiển thị 10 cột từ trái sang phải "管理支店コード" "管理支店名" "都道府県" "郵便番号" "住所" "電話番号" "FAX" "紙版" "電子版" "操作"; 紙版 / 電子版 / 操作 canh giữa, các cột khác canh trái

ステップ3：
3 cột "管理支店コード" "管理支店名" "都道府県" hiển thị icon sort, các cột khác không hiển thị icon sort

補足：
・Header cột FAX hiển thị là `FAX` (không phải `FAX番号`)
・Cột 紙版 / 電子版 chỉ hiển thị icon check khi giá trị ON

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

## ACSMS-TC-008-008 — Layout 5 item của form search khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở `/kanri-shiten`, kiểm tra khu vực form search

ステップ2：
Kiểm tra label, ô input, placeholder của từng item search

ステップ3：
Kiểm tra vị trí và màu của button "検索" "検索クリア"

### 期待結果

ステップ1：
Form search được hiển thị

ステップ2：
5 item "管理支店コード" "管理支店名" "都道府県" "電話番号" "FAX" được hiển thị dạng grid 4 cột; item 都道府県 là dropdown, các item khác là textbox

ステップ3：
Button "検索" hiển thị màu primary (xanh) ở trạng thái active; button "検索クリア" hiển thị màu secondary ở trạng thái active

補足：
・5 item được bố trí trên 2 dòng (wrap)
・Mỗi ô input hiển thị icon clear `allow-clear`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-009 — Hiển thị message empty state khi kết quả search 0 record

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có 0 record chi nhánh quản lý khớp điều kiện

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Nhập `ZZZ-9999-999` (giá trị không tồn tại) vào item search "管理支店コード"

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
`ZZZ-9999-999` được nhập vào 管理支店コード

ステップ3：
Hiển thị 0 kết quả search, trên màn hình hiển thị `検索結果が見つかりませんでした。` (ACSMS-MSG-008-001)

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

## ACSMS-TC-008-010 — Responsive — Breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sử dụng được Chrome DevTools device emulator

### 手順

ステップ1：
Hiển thị `/kanri-shiten` ở độ phân giải PC (1920×1080)

ステップ2：
Chuyển sang độ phân giải tablet (768×1024, iPad dọc)

ステップ3：
Chuyển sang độ phân giải mobile (375×667, iPhone SE)

ステップ4：
Kiểm tra hiển thị form search, table list, pagination ở từng độ phân giải

### 期待結果

ステップ1：
Hiển thị layout PC, form search hiển thị 5 item ngang hàng (wrap 2 dòng)

ステップ2：
Chuyển sang layout tablet, các item search được sắp xếp lại theo chiều dọc

ステップ3：
Chuyển sang layout mobile, table list hiển thị với horizontal scroll

ステップ4：
Không vỡ layout, tất cả thao tác đều khả dụng

補足：
・Sidebar chuyển sang hamburger menu khi <= tablet
・Khi table scroll ngang, cột cố định không vỡ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-011 — Chuyển focus bằng thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Nhấn liên tục phím Tab, kiểm tra thứ tự chuyển focus

ステップ3：
Nhấn Shift+Tab kiểm tra chuyển focus theo chiều ngược lại

ステップ4：
Đưa focus vào dropdown 都道府県, kiểm tra di chuyển lựa chọn bằng phím mũi tên

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Focus chuyển theo thứ tự 管理支店コード → 管理支店名 → 都道府県 → 電話番号 → FAX → button 検索 → button 検索クリア → button 新規登録 → sort header → link 削除

ステップ3：
Focus chuyển theo chiều ngược lại

ステップ4：
Phím mũi tên di chuyển được lựa chọn của 都道府県, phím Enter xác nhận lựa chọn

補足：
・Focus ring được hiển thị thị giác trên mọi phần tử có thể thao tác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-012 — Kiểm soát hiển thị button "新規登録" "削除" theo role

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN (có quyền `kanri_shiten.create` và `kanri_shiten.delete`)
  - ・Có ≥1 record chi nhánh quản lý đã đăng ký

### 手順

ステップ1：
Đăng nhập NICHINO_ADMIN, mở `/kanri-shiten`, kiểm tra trạng thái active của button "新規登録" "削除"

ステップ2：
(Giả định mở rộng tương lai chỉ cấp quyền view cho role khác) Đăng nhập lại bằng role chỉ có quyền view, kiểm tra cùng màn hình

### 期待結果

ステップ1：
Button "新規登録" hiển thị ở trạng thái active, link "削除" tại cột thao tác hiển thị ở trạng thái active

ステップ2：
Button "新規登録" hiển thị ở trạng thái disable (do không có quyền `kanri_shiten.create`), link "削除" tại cột thao tác hiển thị ở trạng thái disable

補足：
・Button ở trạng thái disable chứ không phải hidden (UX convention: vẫn cho thấy chức năng tồn tại, chỉ thông báo role hiện tại không dùng được)
・Cell 管理支店コード hiển thị dạng text chỉ đọc, không phải link chuyển sang màn edit

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

ステップ2 là case giả định khi role khác được cấp quyền view trong mở rộng tương lai. Seed quyền hiện tại chỉ NICHINO_ADMIN xem được nên chỉ thực hiện được ステップ1.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-008-013 — Kiểm soát chuyển trang của breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Mở `/kanri-shiten`, kiểm tra breadcrumb

ステップ2：
Click link "ホーム" của breadcrumb

### 期待結果

ステップ1：
Breadcrumb hiển thị 2 cấp "ホーム > 管理支店マスタ明細検索画面", cấp cuối hiển thị dạng text chứ không phải link

ステップ2：
Chuyển về `/dashboard`

補足：
・Breadcrumb theo đúng định nghĩa tại §1.2 của tài liệu thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-014 — Highlight menu trên sidebar

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Từ dashboard click item "管理支店マスタ" trên sidebar

ステップ2：
Sau khi chuyển màn, kiểm tra item "管理支店マスタ" trên sidebar

ステップ3：
Click item khác trên sidebar (ví dụ: "JAマスタ")

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Item "管理支店マスタ" trên sidebar hiển thị ở trạng thái active (đổi màu nền)

ステップ3：
Chuyển sang màn khác, highlight sidebar chuyển sang màn mới

補足：
・Hiển thị thị giác của item active được áp dụng bằng design token `bg-primary/10` và `text-primary`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-015 — Hiển thị tên user và thao tác logout

- 観点ID: VP-A-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login (account name "日農 太郎")

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Kiểm tra khu vực hiển thị tên user phía trên bên phải header

ステップ3：
Click icon user mở dropdown, click "ログアウト"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Hiển thị tên user đang login (ví dụ: `日農 太郎`)

ステップ3：
Xử lý logout được thực hiện, chuyển về `/login`; truy cập lại trực tiếp `/kanri-shiten` sẽ chuyển về màn login

補足：
・Sau logout, Redis session bị xóa, HTTP-only Cookie hết hạn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-008-016 — Hiển thị trạng thái khởi tạo của form search

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Kiểm tra giá trị khởi tạo và placeholder của từng item search

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Textbox "管理支店コード" "管理支店名" "電話番号" "FAX" hiển thị rỗng, dropdown "都道府県" hiển thị "選択してください", mỗi ô input hiển thị icon `allow-clear`

補足：
・Khi hiển thị khởi tạo, thực hiện lấy toàn bộ record (trong DataScope) không kèm điều kiện search

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-017 — Search partial match 管理支店コード — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 管理支店コード `013-3300-001` và `013-3300-002`

### 手順

ステップ1：
Nhập `013` vào ô input 管理支店コード

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra response và API request bằng DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ các record có 管理支店コード chứa `013` được hiển thị

ステップ3：
GET `/api/v1/kanri-shiten?kanri_shiten_code=013&...` được gửi, trả về HTTP 200, BE thực hiện search partial match bằng `ILIKE '%013%'`

補足：
・Có thể search partial match

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-018 — 管理支店コード — giá trị biên tối đa 15 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập 15 ký tự vào ô input 管理支店コード (ví dụ: `013-3300-001-AB`)

ステップ2：
Click button "検索", kiểm tra API request

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/kanri-shiten?kanri_shiten_code=AAAAAAAAAAAAAAAA` (16 ký tự)

### 期待結果

ステップ1：
Có thể nhập đầy đủ 15 ký tự

ステップ2：
Trả về HTTP 200, hiển thị kết quả search (giả định 0 record)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `管理支店コードは最大15文字で指定してください。`)

補足：
・Có thể search trong giới hạn số ký tự cho phép
・Lỗi vượt quá số ký tự được phát hiện ở phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-019 — 管理支店コード — hành vi trim space đầu/cuối

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập `  013-3300-001  ` (2 ký tự space half-width đầu và cuối) vào ô input 管理支店コード

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra nội dung hiển thị trong ô input

ステップ4：
Kiểm tra parameter của API request được gửi bằng DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên dạng

ステップ2：
Xử lý search được thực hiện

ステップ3：
Giá trị nhập được trim (hiển thị trong ô input cập nhật thành `013-3300-001`)

ステップ4：
GET `/api/v1/kanri-shiten?kanri_shiten_code=013-3300-001&...` được gửi (không có space đầu/cuối)

補足：
・Giá trị nhập được trim

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-020 — Search partial match 管理支店名 — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 管理支店名 "JA北海道中央管理支店" "JA北海道東部管理支店"

### 手順

ステップ1：
Nhập `北海道` vào ô input 管理支店名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra response

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ các record có 管理支店名 chứa `北海道` được hiển thị

ステップ3：
Có thể search partial match (`ILIKE '%北海道%'`)

補足：
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

## ACSMS-TC-008-021 — 管理支店名 — giá trị biên tối đa 100 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Paste chuỗi 100 ký tự full-width vào ô input 管理支店名

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/kanri-shiten?kanri_shiten_name=(101 ký tự)`

### 期待結果

ステップ1：
Có thể nhập đầy đủ 100 ký tự

ステップ2：
Trả về HTTP 200

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `管理支店名は最大100文字で指定してください。`)

補足：
・Lỗi vượt quá số ký tự được phát hiện ở phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-022 — Chọn dropdown 都道府県

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 47 tỉnh thành trong bảng m_todofuken

### 手順

ステップ1：
Mở dropdown 都道府県

ステップ2：
Kiểm tra số lượng và thứ tự lựa chọn

ステップ3：
Chọn "東京都" (todofuken_code = `13`)

ステップ4：
Click button "検索"

### 期待結果

ステップ1：
Dropdown được mở

ステップ2：
Lựa chọn "すべて" + 47 todofuken hiển thị theo todofuken_code tăng dần của m_todofuken

ステップ3：
"東京都" được chọn và hiển thị

ステップ4：
GET `/api/v1/kanri-shiten?todofuken_code=13&...` được gửi, chỉ hiển thị chi nhánh quản lý có todofuken_code = `13`

補足：
・Data todofuken được lấy bằng JOIN từ master code (không phải hardcoded)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-023 — 都道府県 — hành vi clear dropdown

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Chọn "北海道" trong dropdown 都道府県

ステップ2：
Click icon clear "×" của dropdown

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
"北海道" được chọn

ステップ2：
Lựa chọn được clear, hiển thị "選択してください"

ステップ3：
Thực hiện search toàn bộ record không kèm điều kiện todofuken, API request không chứa parameter `todofuken_code`

補足：
・Điều kiện search được clear

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-024 — Search partial match 電話番号 — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký chi nhánh quản lý có 電話番号 "011-222-3333" "011-333-3333"

### 手順

ステップ1：
Nhập `011` vào ô input 電話番号

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra response

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ các record có 電話番号 chứa `011` được hiển thị

ステップ3：
Có thể search partial match (`ILIKE '%011%'`)

補足：
・Bất kể có hay không hyphen, partial match được thực hiện dưới dạng chuỗi giá trị đã lưu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-025 — 電話番号 — giá trị biên tối đa 15 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập 15 ký tự vào ô input 電話番号 (ví dụ: `090-1234-5678-9`)

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/kanri-shiten?tel=1234567890123456` (16 ký tự)

### 期待結果

ステップ1：
Có thể nhập đầy đủ 15 ký tự

ステップ2：
Trả về HTTP 200

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `電話番号は最大15文字で指定してください。`)

補足：
・Lỗi vượt quá số ký tự được phát hiện ở phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-026 — Search partial match FAX — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký chi nhánh quản lý có FAX "011-222-3334" "011-333-3334"

### 手順

ステップ1：
Nhập `3334` vào ô input FAX

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ các record có FAX chứa `3334` được hiển thị (`ILIKE '%3334%'`)

補足：
・Có thể search partial match

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-027 — FAX — giá trị biên tối đa 15 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập 15 ký tự vào ô input FAX

ステップ2：
Dùng DevTools gửi trực tiếp GET `/api/v1/kanri-shiten?fax=(16 ký tự)`

### 期待結果

ステップ1：
Có thể nhập đầy đủ 15 ký tự, xử lý search được thực hiện

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `FAX番号は最大15文字で指定してください。`)

補足：
・Lỗi vượt quá số ký tự được phát hiện ở phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-028 — Nhập ký tự đặc biệt vào item search — Đối phó SQL Injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập `' OR '1'='1` vào ô input 管理支店コード

ステップ2：
Click button "検索"

ステップ3：
Nhập `; DROP TABLE m_kanri_shiten; --` vào ô input 管理支店名

ステップ4：
Click button "検索"

ステップ5：
Kiểm tra trạng thái DB: `SELECT COUNT(*) FROM m_kanri_shiten`

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên dạng

ステップ2：
Hiển thị 0 kết quả search, hiển thị `検索結果が見つかりませんでした。`

ステップ3：
Giá trị nhập được phản ánh nguyên dạng

ステップ4：
Hiển thị 0 kết quả search

ステップ5：
Bảng `m_kanri_shiten` không bị xóa, số lượng record không thay đổi

補足：
・Nhờ parameterized query, ký tự đặc biệt không được diễn giải như SQL injection (dùng `setParameters` của TypeORM)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-029 — Nhập ký tự đặc biệt vào item search — Đối phó XSS

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập `<script>alert(1)</script>` vào ô input 管理支店名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra hiển thị màn hình và console DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên dạng

ステップ2：
Hiển thị 0 kết quả search

ステップ3：
JavaScript không được thực thi, dialog `alert(1)` không được hiển thị, không có warning được xuất ra trên console DevTools

補足：
・Auto-escape bằng `{{ }}` interpolation của Vue đang hoạt động

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-008-030 — Hiển thị khởi tạo — lấy toàn bộ record không kèm điều kiện search (trong DataScope)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký khoảng 30 record chi nhánh quản lý

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Kiểm tra API request được gửi bằng DevTools

ステップ3：
Kiểm tra hiển thị của table list

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
GET `/api/v1/kanri-shiten?page=1&per_page=20&sort_by=updated_at&sort_order=desc` được gửi

ステップ3：
Hiển thị 20 record của trang đầu theo thứ tự updated_at giảm dần, pagination hiển thị "全 30 件"

補足：
・Record được update mới nhất hiển thị đầu tiên
・NICHINO_ADMIN không nằm trong đối tượng filter data scope bằng ja_id (xuyên toàn bộ JA)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-031 — Search AND-combine nhiều điều kiện

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký khoảng 20 record chi nhánh quản lý

### 手順

ステップ1：
Nhập 管理支店コード `013`, 都道府県 "北海道", 電話番号 `011`

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra API request được gửi bằng DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh trong 3 item

ステップ2：
Chỉ các record khớp toàn bộ 3 điều kiện được hiển thị

ステップ3：
GET `/api/v1/kanri-shiten?kanri_shiten_code=013&todofuken_code=01&tel=011&page=1&per_page=20&sort_by=updated_at&sort_order=desc` được gửi

補足：
・Điều kiện search được áp dụng theo dạng AND-combine (không phải OR)
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

## ACSMS-TC-008-032 — Hành vi của button 検索クリア

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Nhập 管理支店コード `013`, 都道府県 "北海道", FAX `3334`

ステップ2：
Click button "検索", thu hẹp kết quả

ステップ3：
Click button "検索クリア"

ステップ4：
Kiểm tra form search và hiển thị list

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Kết quả đã thu hẹp được hiển thị

ステップ3：
Xử lý được thực hiện

ステップ4：
Điều kiện search được clear (toàn bộ textbox rỗng, 都道府県 "選択してください"), điều kiện sort cũng trở về giá trị khởi tạo (updated_at giảm dần), thực hiện lấy toàn bộ lại và hiển thị trang đầu

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

## ACSMS-TC-008-033 — Sort — 管理支店コード tăng dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký ≥10 record chi nhánh quản lý

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Click 1 lần header cột "管理支店コード"

ステップ3：
Kiểm tra API request và thứ tự hiển thị

### 期待結果

ステップ1：
Hiển thị trạng thái khởi tạo (updated_at giảm dần)

ステップ2：
Icon sort chuyển sang ▲ (tăng dần)

ステップ3：
GET `/api/v1/kanri-shiten?...&sort_by=kanri_shiten_code&sort_order=asc` được gửi, hiển thị sắp xếp theo 管理支店コード tăng dần

補足：
・Thứ tự sort đúng
・Sort được áp dụng vẫn giữ nguyên điều kiện search hiện tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-034 — Sort — 管理支店コード giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký ≥10 record chi nhánh quản lý

### 手順

ステップ1：
Click 1 lần header cột "管理支店コード" (tăng dần)

ステップ2：
Click 1 lần nữa header cột "管理支店コード" (giảm dần)

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (tăng dần), hiển thị theo 管理支店コード tăng dần

ステップ2：
Icon sort chuyển sang ▼ (giảm dần), GET `/api/v1/kanri-shiten?...&sort_by=kanri_shiten_code&sort_order=desc` được gửi, hiển thị sắp xếp theo 管理支店コード giảm dần

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

## ACSMS-TC-008-035 — Sort — 管理支店名 tăng dần / giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Click 1 lần header cột "管理支店名"

ステップ2：
Kiểm tra API request và thứ tự hiển thị

ステップ3：
Click 1 lần nữa header cột "管理支店名"

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (tăng dần)

ステップ2：
GET `/api/v1/kanri-shiten?...&sort_by=kanri_shiten_name&sort_order=asc` được gửi, hiển thị sắp xếp theo 管理支店名 tăng dần

ステップ3：
GET `/api/v1/kanri-shiten?...&sort_by=kanri_shiten_name&sort_order=desc` được gửi, hiển thị sắp xếp theo 管理支店名 giảm dần

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

## ACSMS-TC-008-036 — Sort — 都道府県 tăng dần / giảm dần (kiểm tra mapping todofuken_code)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký data chi nhánh quản lý của nhiều todofuken (Hokkaido / Tokyo / Osaka v.v.)

### 手順

ステップ1：
Click 1 lần header cột "都道府県"

ステップ2：
Kiểm tra parameter `sort_by` của API request được gửi bằng DevTools

ステップ3：
Click 1 lần nữa header cột "都道府県"

ステップ4：
Kiểm tra thứ tự hiển thị

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (tăng dần)

ステップ2：
GET `/api/v1/kanri-shiten?...&sort_by=todofuken_code&sort_order=asc` được gửi (không phải `sort_by=todofuken_name`), không trả về HTTP 400

ステップ3：
GET `/api/v1/kanri-shiten?...&sort_by=todofuken_code&sort_order=desc` được gửi

ステップ4：
Hiển thị sắp xếp theo todofuken code (cột hiển thị là todofuken_name nhưng sort dựa trên todofuken_code)

補足：
・dataIndex của cột là `todofuken_name` (dùng để hiển thị) nhưng allow list của backend chỉ chứa `todofuken_code`, nên frontend cần mapping sort key
・Khi request bằng giá trị ngoài allow list (`todofuken_name`), VALIDATION_ERROR sẽ trả về, nên case này là regression prevention

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Case regression prevention cho bug trước đây dataIndex (`todofuken_name`) được gửi nguyên dạng sang BE và gây VALIDATION_ERROR.

## ACSMS-TC-008-037 — Sort — hành vi khi click header cột không phải đối tượng sort

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Click header cột "FAX"

ステップ2：
Click header cột "住所"

ステップ3：
Kiểm tra có phát sinh API request bằng DevTools

### 期待結果

ステップ1：
Icon sort không được hiển thị, hiển thị cột không thay đổi

ステップ2：
Icon sort không được hiển thị

ステップ3：
Không phát sinh API request mới

補足：
・Cột đối tượng sort định nghĩa tại §8.1 của tài liệu thiết kế chỉ có "管理支店コード" "管理支店名" "都道府県"
・FAX / 住所 / 郵便番号 / 電話番号 / 紙版 / 電子版 / 操作 không sort được

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-038 — Sort — backend từ chối sort_by ngoài allow list

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/kanri-shiten?sort_by=fax&sort_order=asc`

ステップ2：
Gửi trực tiếp GET `/api/v1/kanri-shiten?sort_by=address;%20DROP%20TABLE&sort_order=asc`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `sort_byは kanri_shiten_code / kanri_shiten_name / todofuken_code / updated_at のいずれかで指定してください。`)

ステップ2：
Trả về HTTP 400 (cùng message)

補足：
・Bằng phương thức allow list, SQL injection của `ORDER BY ${sort_by}` được ngăn chặn
・Giá trị cho phép là 4 giá trị `kanri_shiten_code` / `kanri_shiten_name` / `todofuken_code` / `updated_at`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-039 — Hướng sort — từ chối giá trị sort_order không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?sort_by=kanri_shiten_code&sort_order=ascending`

ステップ2：
Gửi GET `/api/v1/kanri-shiten?sort_by=kanri_shiten_code&sort_order=random`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `sort_orderは asc または desc で指定してください。`)

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

## ACSMS-TC-008-040 — Pagination — chuyển trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 124 record chi nhánh quản lý

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Click button "2" của pagination

ステップ3：
Kiểm tra API request bằng DevTools

ステップ4：
Click button "次へ (>)"

### 期待結果

ステップ1：
Trang 1 (record 1-20) được hiển thị, pagination hiển thị "全 124 件"

ステップ2：
Trang 2 (record 21-40) được hiển thị, active của pagination chuyển sang "2"

ステップ3：
GET `/api/v1/kanri-shiten?...&page=2&per_page=20&...` được gửi

ステップ4：
Trang 3 (record 41-60) được hiển thị

補足：
・Khi chuyển số trang, điều kiện search / điều kiện sort được giữ lại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-041 — Pagination — chuyển số record hiển thị mỗi trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 124 record chi nhánh quản lý

### 手順

ステップ1：
Mở dropdown bên cạnh pagination

ステップ2：
Kiểm tra lựa chọn

ステップ3：
Chọn "50 / 頁"

ステップ4：
Chọn "100 / 頁"

### 期待結果

ステップ1：
Dropdown được mở

ステップ2：
4 lựa chọn "10 / 頁" "20 / 頁" "50 / 頁" "100 / 頁" được hiển thị, lựa chọn khởi tạo là "20 / 頁"

ステップ3：
GET `/api/v1/kanri-shiten?...&per_page=50&...` được gửi, hiển thị đến 50 record trong list, tổng số trang được tính lại

ステップ4：
GET `/api/v1/kanri-shiten?...&per_page=100&...` được gửi, hiển thị đến 100 record trong list

補足：
・Giới hạn trên của per_page là 100 record (ràng buộc DTO)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-042 — Pagination — từ chối per_page vượt giới hạn trên

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?page=1&per_page=101`

ステップ2：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?page=1&per_page=0`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `per_pageは100以下で指定してください。`)

ステップ2：
Trả về HTTP 400 (message `per_pageは1以上で指定してください。`)

補足：
・per_page là số nguyên từ 1 đến 100

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-043 — Pagination — từ chối page ≤ 0

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?page=0&per_page=20`

ステップ2：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?page=-1&per_page=20`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `pageは1以上で指定してください。`)

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

## ACSMS-TC-008-044 — Giữ điều kiện search / sort khi chuyển trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký ≥50 record chi nhánh quản lý

### 手順

ステップ1：
Nhập `北海道` vào 管理支店名, click "検索"

ステップ2：
Click cột "管理支店コード" sort tăng dần

ステップ3：
Click button "2" của pagination

ステップ4：
Kiểm tra API request bằng DevTools

### 期待結果

ステップ1：
Kết quả đã thu hẹp được hiển thị ở trang 1

ステップ2：
Hiển thị sắp xếp theo 管理支店コード tăng dần

ステップ3：
Chuyển sang trang 2

ステップ4：
GET `/api/v1/kanri-shiten?kanri_shiten_name=北海道&page=2&per_page=20&sort_by=kanri_shiten_code&sort_order=asc` được gửi

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

## ACSMS-TC-008-045 — Không hiển thị chi nhánh quản lý đã xóa

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có ≥1 chi nhánh quản lý đã xóa logical (`deleted_at IS NOT NULL`)

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Search bằng code của chi nhánh quản lý đã xóa

ステップ3：
Kiểm tra DB: `SELECT kanri_shiten_id, kanri_shiten_code, deleted_at FROM m_kanri_shiten WHERE deleted_at IS NOT NULL`

### 期待結果

ステップ1：
Data đã xóa không được hiển thị trong list

ステップ2：
Dù nhập code của chi nhánh quản lý đã xóa, kết quả search cũng hiển thị 0 record (`検索結果が見つかりませんでした。`)

ステップ3：
Record đã xóa vẫn còn trong DB (xóa logical chứ không phải xóa vật lý)

補足：
・Data đã xóa không được hiển thị
・SQL của BE áp dụng điều kiện `WHERE deleted_at IS NULL`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-046 — Performance hiển thị data số lượng lớn

- 観点ID: VP-F-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký ≥5000 record chi nhánh quản lý

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Đo thời gian response GET `/api/v1/kanri-shiten` bằng tab Network của DevTools

ステップ3：
Chuyển sang trang cuối bằng pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Response dưới 3 giây, `meta.total: 5000` trở lên

ステップ3：
Trang cuối được hiển thị dưới 3 giây

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

---

# カテゴリ 6: Logic nghiệp vụ (Function — List / Delete)

## ACSMS-TC-008-047 — Lấy list — Normal

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 3 record chi nhánh quản lý (Hokkaido, Tokyo, Osaka)

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Kiểm tra response JSON của `/api/v1/kanri-shiten` bằng tab Network của DevTools

ステップ3：
Đối chiếu từng item của response JSON với hiển thị màn hình

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Trả về HTTP 200, response body có format `{ data: [...], meta: { total, page, per_page, total_pages } }`

ステップ3：
Mỗi record chứa `kanri_shiten_id` / `ja_id` / `kanri_shiten_code` / `kanri_shiten_name` / `yubin_no` / `todofuken_code` / `todofuken_name` / `address` / `tel` / `fax` / `paper_flg` / `denshi_flg`; `todofuken_name` là giá trị được lấy bằng JOIN từ bảng `m_todofuken`

補足：
・Đảm bảo tính toàn vẹn dữ liệu
・Output normal log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-048 — Click button 新規登録 — Chuyển sang màn đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có quyền `kanri_shiten.create`

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Click button "新規登録"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Chuyển sang màn đăng ký Master Chi nhánh Quản lý (`/kanri-shiten/create`), form hiển thị với giá trị khởi tạo rỗng

補足：
・Màn chuyển đến là ACSMS-SCR-009 (Màn đăng ký Master Chi nhánh Quản lý)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-049 — Click link 管理支店コード — Chuyển sang màn edit

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng ký 管理支店コード `013-3300-001` (kanri_shiten_id = 1)
  - ・Có quyền `kanri_shiten.update`

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Click link của cell 管理支店コード `013-3300-001` trong list

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Chuyển sang màn edit Master Chi nhánh Quản lý (`/kanri-shiten/1/edit`), giá trị hiện tại được hiển thị trong form

補足：
・Màn chuyển đến là chế độ edit của ACSMS-SCR-009 (Màn đăng ký Master Chi nhánh Quản lý)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-050 — Click button 削除 — Hiển thị dialog confirm

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý đối tượng xóa "JA削除対象管理支店" (kanri_shiten_id = 5) đã đăng ký, không có data liên quan
  - ・Có quyền `kanri_shiten.delete`

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Click link "削除" tại cột thao tác của record đối tượng

ステップ3：
Kiểm tra nội dung dialog được hiển thị

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị

ステップ2：
Dialog confirm xóa được hiển thị

ステップ3：
Body dialog hiển thị `この管理支店を削除してもよろしいですか？` (ACSMS-MSG-008-005), title dialog "削除確認", button "はい" "いいえ" được hiển thị, button "はい" có dạng danger (màu đỏ)

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

## ACSMS-TC-008-051 — Thực hiện xóa — Click "はい" — Xóa logical + load lại list

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 5) đã đăng ký, không có data liên quan
  - ・Có quyền `kanri_shiten.delete`

### 手順

ステップ1：
Click link "削除", hiển thị dialog confirm

ステップ2：
Click button "はい" của dialog

ステップ3：
Kiểm tra DB: `SELECT kanri_shiten_id, deleted_at, updated_by FROM m_kanri_shiten WHERE kanri_shiten_id = 5`

ステップ4：
Kiểm tra DB: `SELECT log_type, operation, target_id, target_table, result_status, before_value FROM t_log WHERE target_id = 5 AND target_table = 'm_kanri_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
DELETE `/api/v1/kanri-shiten/5` được gửi, trả về HTTP 200, hiển thị toast `削除しました。` (ACSMS-MSG-008-006), list được lấy lại và record tương ứng không hiển thị nữa

ステップ3：
Data bị xóa logical (`deleted_at IS NOT NULL`, `updated_by` là `account_id` của test account)

ステップ4：
Audit log được record (`log_type = 1`, `operation = 'DELETE'`, `target_id = 5`, `target_table = 'm_kanri_shiten'`, `result_status = 1`, `before_value` chứa JSON data trước khi xóa)

補足：
・Data bị xóa (xóa logical)
・Transaction được commit
・Xử lý chính + audit log được thực hiện trong cùng một transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-052 — Hủy xóa — Click "いいえ"

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 5) đã đăng ký

### 手順

ステップ1：
Click link "削除", hiển thị dialog confirm

ステップ2：
Click button "いいえ" của dialog

ステップ3：
Kiểm tra có phát sinh API request bằng DevTools

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM m_kanri_shiten WHERE kanri_shiten_id = 5`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
Dialog đóng lại, hiển thị list không thay đổi

ステップ3：
DELETE request không phát sinh

ステップ4：
Vẫn ở trạng thái `deleted_at IS NULL` (không bị xóa)

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

## ACSMS-TC-008-053 — Xóa — lỗi 409 khi có data liên quan (master chi nhánh)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại ≥1 record chi nhánh liên quan (`m_shiten.kanri_shiten_id = 5`) đến chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 5)

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog confirm

ステップ2：
Kiểm tra response và trạng thái DB

### 期待結果

ステップ1：
DELETE `/api/v1/kanri-shiten/5` được gửi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `この管理支店は関連オブジェクトに紐づいているため削除できません。` (ACSMS-MSG-008-004) hoặc `関連データが存在するため削除できません。`), sau khi toast hiển thị record đối tượng trong `m_kanri_shiten` vẫn ở `deleted_at IS NULL`

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

Trong danh sách error api.md (common) là `関連データが存在するため削除できません。`, message màn hình ACSMS-MSG-008-004 là `この管理支店は関連オブジェクトに紐づいているため削除できません。`. Phía implement trả về văn bản của api.md như canonical.

## ACSMS-TC-008-054 — Xóa — lỗi 409 khi có data liên quan (purchaser)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại ≥1 record purchaser liên quan (`t_dokusya.kanri_shiten_id = 6`) đến chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 6)

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog confirm

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
DELETE `/api/v1/kanri-shiten/6` được gửi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`), không bị xóa logical

補足：
・Data liên quan không bị xóa
・Tham chiếu purchaser cũng là yếu tố cản trở xóa tương đương m_shiten

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-055 — Xóa — lỗi 409 khi có data liên quan (account)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại ≥1 record account liên quan (`m_account.kanri_shiten_id = 7`) đến chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 7)

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog confirm

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
DELETE `/api/v1/kanri-shiten/7` được gửi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`)

補足：
・Data liên quan không bị xóa
・Trả về 409 khi 1 trong 3 bảng liên quan (m_shiten, t_dokusya, m_account) tương ứng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-056 — Xóa — lỗi 404 khi ID không tồn tại

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/kanri-shiten/99999` (ID không tồn tại)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`)

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

## ACSMS-TC-008-057 — Xóa — lỗi 404 khi ID đã bị xóa (race xóa đồng thời)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý (kanri_shiten_id = 8) đã đăng ký

### 手順

ステップ1：
Mở màn list ở browser A

ステップ2：
Xóa cùng chi nhánh quản lý (kanri_shiten_id = 8) ở browser B

ステップ3：
Click link "削除" của cùng chi nhánh quản lý ở browser A, click "はい"

### 期待結果

ステップ1：
List được hiển thị

ステップ2：
Xóa thành công ở browser B

ステップ3：
DELETE `/api/v1/kanri-shiten/8` được gửi từ browser A trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`)

補足：
・Không phát sinh bất đồng bộ dữ liệu
・Khi race xóa đồng thời, request đến sau cùng sẽ là 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-058 — Record audit log khi lỗi xóa

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 9) có data liên quan

### 手順

ステップ1：
Click link "削除", click "はい"

ステップ2：
Kiểm tra DB: `SELECT log_type, operation, result_status, error_message FROM t_log WHERE target_id = 9 AND target_table = 'm_kanri_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 409

ステップ2：
Error log được record (`log_type = 3`, `operation = 'DELETE'`, `result_status = 2`, `error_message` chứa chi tiết lỗi)

補足：
・Output error log
・Error log được record ngoài transaction, nên vẫn còn sau khi xử lý nghiệp vụ rollback

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-008-059 — Xử lý 401 khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login, tồn tại session
  - ・Có thể cưỡng chế hết hạn Redis session bằng công cụ admin, hoặc test sau khi quá 24 giờ

### 手順

ステップ1：
Trong khi đang mở `/kanri-shiten`, cưỡng chế hết hạn session

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra chuyển màn và hành vi sau khi đăng nhập lại

### 期待結果

ステップ1：
Màn hình vẫn được hiển thị nguyên trạng

ステップ2：
GET `/api/v1/kanri-shiten` trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Chuyển về `/login?redirect=/kanri-shiten`, sau khi đăng nhập lại quay về URL ban đầu `/kanri-shiten`

補足：
・Khi session hết hạn, chuyển về màn login
・`user` của Pinia store được khởi tạo về null

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-060 — Request parameter không hợp lệ — BAD_REQUEST

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?page=abc&per_page=xyz`

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`, message `リクエストパラメータが不正です。`, hoặc message chi tiết `pageは整数で指定してください。` / `per_pageは整数で指定してください。`)

補足：
・Báo lỗi với parameter không hợp lệ
・Trong trường hợp validation error, mỗi error item được lưu trong mảng `errors`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-061 — Validation error — Cấu trúc mảng VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/kanri-shiten?kanri_shiten_code=(16 ký tự)&kanri_shiten_name=(101 ký tự)` (vi phạm nhiều item đồng thời)

ステップ2：
Kiểm tra response JSON

### 期待結果

ステップ1：
Request được gửi

ステップ2：
Trả về HTTP 400, response body có format `{ error_code: 'VALIDATION_ERROR', message: '入力値が不正です。詳細はerrorsフィールドを確認してください。', errors: [{ field, message }, ...] }`, mảng `errors` chứa cả message vi phạm của `kanri_shiten_code` và `kanri_shiten_name`

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

## ACSMS-TC-008-062 — Vượt rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Rate limit: 429 khi vượt 100 request trong 60 giây

### 手順

ステップ1：
Bằng DevTools hoặc script, gửi >100 request đến `/api/v1/kanri-shiten` trong 60 giây

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request liên tục được gửi

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

補足：
・Rate limit hoạt động
・Frontend hiển thị message bằng toast

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-063 — Lỗi server — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Mô phỏng phát sinh sự cố kết nối DB phía server (dừng DB / ngắt network)

### 手順

ステップ1：
Mô phỏng phát sinh sự cố kết nối DB

ステップ2：
Mở `/kanri-shiten` hoặc click button "検索"

ステップ3：
Kiểm tra response và hiển thị toast

### 期待結果

ステップ1：
Vào trạng thái sự cố kết nối DB

ステップ2：
GET `/api/v1/kanri-shiten` trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`, ACSMS-MSG-008-003)

ステップ3：
Hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`, list hiển thị trống

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

## ACSMS-TC-008-064 — Xử lý khi mất kết nối network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở `/kanri-shiten`

ステップ2：
Chọn "Offline" trên tab Network của DevTools (ngắt network)

ステップ3：
Click button "検索"

ステップ4：
Kiểm tra trạng thái request trên tab network của DevTools

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Vào trạng thái ngắt network

ステップ3：
Request thất bại, hiển thị toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` hoặc message tương đương

ステップ4：
Sau khi kết nối lại network, search lại thì lấy được bình thường

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

Văn bản toast khi mất kết nối network là default của axios interceptor (lỗi network). Vì chưa được spec hóa rõ ràng nên ghi nhận TBD.

## ACSMS-TC-008-065 — Kiểm tra security flag của Cookie

- 観点ID: VP-A-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Môi trường production / staging (HTTPS)

### 手順

ステップ1：
Truy cập `/kanri-shiten`

ステップ2：
Kiểm tra Cookie `session_id` tại DevTools → Application → Cookies

ステップ3：
Thực thi `document.cookie` trên JavaScript console

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Cookie `session_id` được set đầy đủ `HttpOnly` / `Secure` / `SameSite=Strict` / `Path=/` / `Max-Age=86400`

ステップ3：
`session_id` không được hiển thị trong `document.cookie` (do HttpOnly)

補足：
・Bắt buộc token auth
・Flag tiêu chuẩn ngăn rò rỉ session ID được set

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-008-066 — Gọi API trực tiếp khi không có auth

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái chưa login (Cookie đã xóa)

### 手順

ステップ1：
Xóa toàn bộ Cookie của trình duyệt

ステップ2：
Bằng DevTools hoặc curl gửi trực tiếp GET `/api/v1/kanri-shiten`

ステップ3：
Gửi trực tiếp DELETE `/api/v1/kanri-shiten/1`

### 期待結果

ステップ1：
Cookie bị xóa

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Trả về HTTP 401 (cùng trên)

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

## ACSMS-TC-008-067 — Vi phạm DataScope — Thử xóa record của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (theo seed hiện tại, master chi nhánh quản lý chỉ NICHINO_ADMIN access được, giả định khi mở rộng cho role khác trong tương lai)
  - ・Giả định JA_HONTEN (ja-001) tương lai được cấp quyền view

### 手順

ステップ1：
(Giả định tương lai) Login bằng JA_HONTEN (thuộc ja-001)

ステップ2：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/kanri-shiten/{ID của JA khác}`

### 期待結果

ステップ1：
Login thành công

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`, trả về 404 thay vì 403 để che giấu sự tồn tại)

補足：
・Data của JA khác được đối xử như không tồn tại
・Access trực tiếp URL thì lỗi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo seed quyền hiện tại chỉ NICHINO_ADMIN có kanri_shiten.* và role khác không access được. Case này được định vị là regression test sau khi mở rộng tương lai tại §1.3 của tài liệu thiết kế (cấp quyền view cho CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN) đã được implement.

## ACSMS-TC-008-068 — Kiểm tra tính toàn vẹn của audit log

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Chi nhánh quản lý đối tượng xóa (kanri_shiten_id = 10) đã đăng ký, không có data liên quan

### 手順

ステップ1：
Thực hiện xóa (link "削除" → "はい")

ステップ2：
Kiểm tra DB: `SELECT log_type, log_datetime, account_id, gamen_name, operation, result_status, target_id, target_table, before_value, after_value, ip_address, user_agent FROM t_log WHERE target_id = 10 AND target_table = 'm_kanri_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Xử lý xóa thành công

ステップ2：
Audit log được record, mỗi cột có giá trị như sau:
・log_type = 1 (user_operation)
・gamen_name = `管理支店マスタ明細検索画面 (ACSMS-SCR-008)`
・operation = `DELETE`
・result_status = 1 (success)
・target_id = 10
・target_table = `m_kanri_shiten`
・before_value chứa JSON data trước khi xóa (không chứa thông tin nhạy cảm như password)
・after_value là chuỗi rỗng
・ip_address / user_agent được record là giá trị nguồn của request

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
