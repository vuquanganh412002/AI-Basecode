---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-004
screen_name: JAマスタ明細検索画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-07
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-07 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Master JA (ACSMS-SCR-004)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-004 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Master JA |
| 2 | ACSMS-SCR-004-api | Tài liệu thiết kế API tìm kiếm chi tiết Master JA |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 5 |
| 3 | Header & Breadcrumb | 4 |
| 4 | Tìm kiếm / Sắp xếp / Phân trang (Search / Sort / Pagination) | 13 |
| 5 | Logic nghiệp vụ — Xóa JA (Function — Delete) | 7 |
| 6 | Logic nghiệp vụ — Chuyển màn hình (Function — Navigation) | 3 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 6 |
|  | Tổng | 43 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-004-001 — NICHINO_ADMIN truy cập Màn hình tìm kiếm chi tiết Master JA (xem toàn bộ + xóa được)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: nhiều JA (ja-001, ja-002, ja-101...) đã được đăng ký

### 手順

ステップ1：
Mở dashboard, kiểm tra item "JAマスタ" trong section "マスタ管理" trên sidebar

ステップ2：
Click "JAマスタ" → màn hình URL `/ja` được mở

ステップ3：
Kiểm tra cột "操作" trong bảng list có hiển thị link "削除"

ステップ4：
Kiểm tra nút "新規登録" hiển thị ở góc trên bên phải và đang ở trạng thái enable

ステップ5：
Dùng DevTools gọi trực tiếp GET `/api/v1/ja?page=1&per_page=20`, kiểm tra response

### 期待結果

ステップ1：
Sidebar có hiển thị item "JAマスタ" (do có quyền `ja.view`)

ステップ2：
Màn hình tìm kiếm chi tiết Master JA hiển thị bình thường. Header title "JAマスタ明細検索画面", bảng list hiển thị toàn bộ record JA

ステップ3：
Tất cả các row trong cột "操作" đều hiển thị link "削除" (do có quyền `ja.delete`)

ステップ4：
Nút "新規登録" hiển thị màu xanh (primary button) và có thể click (do có quyền `ja.create`)

ステップ5：
Trả về HTTP 200 (mảng `data` chứa toàn bộ record JA đã đăng ký, `meta.total` khớp với số bản ghi trong DB)

補足：
・NICHINO_ADMIN có toàn bộ quyền `ja.view` / `ja.create` / `ja.update` / `ja.delete`
・Không áp dụng DataScope (do `m_account.ja_id IS NULL` nên lấy toàn bộ JA)
・Cả 3 tầng FE menu / FE router guard / BE API guard đều cho phép

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

NICHINO_ADMIN là role duy nhất có thể đăng ký mới và xóa JA.

## ACSMS-TC-004-002 — Cấm truy cập Màn hình tìm kiếm chi tiết Master JA với role NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "JAマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/ja?page=1&per_page=20`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_ja' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "JAマスタ" (do NICHINO_STAFF không có quyền `ja.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Theo `account_concept.md ※4`, JAマスタ chỉ cho phép NICHINO_ADMIN thao tác, NICHINO_STAFF không thuộc đối tượng
・Không thể xem / cập nhật / xóa `m_ja`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

## ACSMS-TC-004-003 — CHUOKAI truy cập Màn hình tìm kiếm chi tiết Master JA (chỉ xem JA của mình + sửa được một số trường, không xóa được)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, JA của mình = ja-001)
  - ・Test data: ja-001 (JA của mình), ja-101 (thuộc 中央会 khác) đã đăng ký

### 手順

ステップ1：
Kiểm tra item "JAマスタ" trên sidebar

ステップ2：
Click "JAマスタ" → kiểm tra nội dung hiển thị màn list

ステップ3：
Kiểm tra cột "操作" trên bảng list

ステップ4：
Kiểm tra trạng thái nút "新規登録" ở góc trên bên phải

ステップ5：
Truy cập trực tiếp URL chỉnh sửa của JA khác (ja-101) `/ja/{id của ja-101}/edit`

ステップ6：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/ja/{id record của JA mình}`

### 期待結果

ステップ1：
Có hiển thị (do có quyền `ja.view`)

ステップ2：
Màn hình tìm kiếm chi tiết Master JA hiển thị bình thường. List chỉ hiển thị record của JA của mình (ja-001), ja-101 không hiển thị

ステップ3：
Link "削除" KHÔNG hiển thị hoặc ở trạng thái disable (do không có quyền `ja.delete`)

ステップ4：
Nút "新規登録" KHÔNG hiển thị hoặc ở trạng thái disable (do không có quyền `ja.create`)

ステップ5：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。` (DataScope ẩn sự tồn tại))

ステップ6：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・CHUOKAI chỉ có quyền `ja.view` / `ja.update`, không có `ja.create` / `ja.delete`
・DataScope chỉ cho xem record của JA của mình
・Trường có thể chỉnh sửa được giới hạn theo `account_concept.md ※4` (郵便番号、住所、電話番号、FAX番号、メールアドレス、担当部署名、担当者名、税区分、備考)
・Truy cập ngoài scope trả về HTTP 404 để ẩn sự tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-004 — JA_HONTEN truy cập Màn hình tìm kiếm chi tiết Master JA (chỉ xem JA của mình + sửa được một số trường, không xóa được)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001, JA của mình = ja-001)
  - ・Test data: ja-001 (JA của mình), ja-002 (JA khác) đã đăng ký

### 手順

ステップ1：
Kiểm tra item "JAマスタ" trên sidebar

ステップ2：
Click "JAマスタ" → kiểm tra nội dung hiển thị màn list

ステップ3：
Kiểm tra trạng thái cột "操作" và nút "新規登録"

ステップ4：
Truy cập trực tiếp URL chỉnh sửa của JA khác (ja-002) `/ja/{id của ja-002}/edit`

ステップ5：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/ja/{id record của JA mình}`

### 期待結果

ステップ1：
Có hiển thị (do có quyền `ja.view`)

ステップ2：
Chỉ hiển thị record của ja-001. ja-002 không hiển thị

ステップ3：
Link "削除" và nút "新規登録" KHÔNG hiển thị hoặc ở trạng thái disable (do không có quyền `ja.delete` / `ja.create`)

ステップ4：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。` (DataScope ẩn sự tồn tại))

ステップ5：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・JA_HONTEN chỉ có quyền `ja.view` / `ja.update`
・DataScope chỉ cho xem record của JA của mình
・Trường có thể chỉnh sửa tương đương với CHUOKAI
・Truy cập trực tiếp URL của JA khác bị block bằng 404 (ẩn sự tồn tại)

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

## ACSMS-TC-004-005 — Cấm truy cập Màn hình tìm kiếm chi tiết Master JA với role JA_KANRI_SHITEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "JAマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/ja?page=1&per_page=20`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "JAマスタ" (do không có quyền `ja.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo `account_concept.md ※4`, JAマスタ ngoài đối tượng thao tác của JA_KANRI_SHITEN
・Là chức năng quản lý cấp JA chứ không phải cấp branch nên role JA_KANRI_SHITEN không có quyền xem

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-004-006 — Layout tổng thể màn search khớp với design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click "JAマスタ" trên sidebar, mở màn `/ja`

ステップ2：
So sánh đối chiếu màn hình với tài liệu design spec (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí từng section (header, breadcrumb, form search, bảng list, phân trang)

### 期待結果

ステップ1：
Hiển thị Màn hình tìm kiếm chi tiết Master JA

ステップ2：
Background color, font, font size, padding/margin, button color, style của input đều khớp

ステップ3：
Đúng theo design spec — bố cục dọc: header trên cùng → breadcrumb → card form search → card bảng list (header + data + phân trang)

補足：
・Không có sai lệch visual so với design spec
・Đã apply design tokens (`design-tokens.ts`), không có hardcoded color

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-007 — Hiển thị các phần tử trong form search đúng design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Kiểm tra các item trong form search area (JAコード, JA名)

ステップ2：
Kiểm tra vị trí và màu sắc của nút "検索" và "検索クリア"

ステップ3：
Kiểm tra trạng thái (enable / focus / disable) của từng textbox

### 期待結果

ステップ1：
2 input item hiển thị nằm ngang — bên trái: textbox "JAコード", bên phải: textbox "JA名". Placeholder đúng theo design spec

ステップ2：
Nút "検索" là primary button (màu xanh), nút "検索クリア" là secondary button (màu trắng). Nằm dưới đáy card form, theo thứ tự "検索" → "検索クリア" từ trái qua phải

ステップ3：
Textbox khi focus thì viền chuyển sang primary color (xanh), khi disable thì hiển thị màu xám

補足：
・Tất cả phần tử form khớp hoàn toàn với design spec
・Cả JAコード / JA名 đều là item tùy chọn (không có dấu bắt buộc `*`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-008 — Hiển thị các cột bảng list đúng design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Có nhiều record JA đã đăng ký

### 手順

ステップ1：
Kiểm tra hàng header của bảng list

ステップ2：
Kiểm tra hiển thị từng cell của data row

ステップ3：
Kiểm tra nút "新規登録" ở góc trên bên phải card

### 期待結果

ステップ1：
Header cột hiển thị từ trái qua phải theo thứ tự "JAコード" "JA名" "郵便番号" "都道府県" "電話番号" "住所" "FAX" "操作". Cột "JAコード" và "都道府県" có hiển thị icon sort

ステップ2：
Giá trị từng cột trong DB hiển thị tương ứng trong cell. Cell "JAコード" hiển thị dạng link primary color, click được để chuyển sang màn edit. Cell "操作" có link "削除" (màu đỏ, chỉ khi có quyền)

ステップ3：
Bên trái header card có title "JA一覧", bên phải có nút "新規登録" (chỉ enable khi có quyền `ja.create`)

補足：
・Tất cả các cột khớp với sheet định nghĩa item của design spec
・Icon sort không hiển thị ở trạng thái ban đầu, chỉ hiển thị ▲ (asc) / ▼ (desc) khi áp dụng sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-009 — Responsive — breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Đặt window size 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar fixed, form search nằm ngang, toàn bộ cột bảng list nằm gọn trong width màn hình

ステップ2：
Sidebar thu gọn, form search giữ nguyên bố cục, bảng có thể scroll ngang

ステップ3：
Sidebar overlay, form search xếp dọc, bảng có thể scroll ngang (vẫn duy trì scroll dọc)

補足：
・Cả 3 breakpoint đều không có vỡ layout
・Bảng có `overflow-x-auto` cho phép scroll ngang để xem toàn bộ cột
・Các thao tác chính (tìm kiếm, xóa, chuyển trang) đều thực hiện được ở mọi breakpoint

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-010 — Hiển thị UI phân trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: đã đăng ký 124 record JA (đủ để có nhiều page)

### 手順

ステップ1：
Kiểm tra vùng phân trang dưới bảng list

ステップ2：
Kiểm tra dropdown page size

ステップ3：
Kiểm tra trạng thái các nút page number

### 期待結果

ステップ1：
Từ trái qua phải hiển thị "全 124 件", các nút page number (◀ 1 2 3 ... 7 ▶), dropdown page size

ステップ2：
Các option của dropdown là "10 / 頁" "20 / 頁" "50 / 頁" "100 / 頁", giá trị mặc định là "20 / 頁"

ステップ3：
Page hiện tại (page 1) được highlight với primary color (background xanh + text trắng), các page number khác chỉ có viền. Ở page đầu tiên, ◀ (prev) ở trạng thái disable

補足：
・Vị trí phân trang là `bottomLeft`, label `'/ 頁'` đúng theo định nghĩa item
・Khi số record ≤ per_page, chỉ hiển thị nút page "1"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-004-011 — Hiển thị header title

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Kiểm tra phía trái của header trên cùng màn hình

### 期待結果

ステップ1：
Hiển thị chữ "JAマスタ明細検索画面"

補足：
・Title string đúng literal theo spec
・Title được hiển thị tự động từ giá trị `meta.breadcrumb` của route

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-012 — Hiển thị notification icon + user menu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra phía bên phải header

ステップ2：
Hover chuột lên user icon

ステップ3：
Click user icon

### 期待結果

ステップ1：
Hiển thị theo thứ tự: notification icon → user icon → tên login (ví dụ: admin:日農（管理者）)

ステップ2：
Khi hover, background color thay đổi

ステップ3：
Dropdown bung ra — hiển thị menu logout, etc.

補足：
・Toàn bộ tương tác hover/click đúng theo design spec
・Notification icon có dot màu đỏ thể hiện chưa đọc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-013 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Kiểm tra vùng breadcrumb dưới title màn hình

ステップ2：
So sánh breadcrumb hierarchy với design spec

### 期待結果

ステップ1：
Hiển thị hierarchy `ホーム / マスタ管理 / JAマスタ明細検索画面`

ステップ2：
Separator (`>` hoặc `/`), text, có/không có link đều khớp

補足：
・Breadcrumb hiển thị đúng hierarchy + đúng design spec
・Màn hiện tại (JAマスタ明細検索画面) không có link, các phần còn lại có link

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-014 — Thao tác chuyển trang qua các link breadcrumb

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Click "ホーム" trên breadcrumb

ステップ2：
Quay lại màn search, click "JAマスタ明細検索画面" (màn hiện tại) trên breadcrumb

### 期待結果

ステップ1：
Chuyển sang `/dashboard`

ステップ2：
Là màn hiện tại nên không có gì xảy ra (không reload)

補足：
・Mỗi link hoạt động đúng như mong đợi
・"マスタ管理" là tên group sidebar, theo convention breadcrumb của project sẽ không đưa vào hierarchy trung gian

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Tìm kiếm / Sắp xếp / Phân trang (Search / Sort / Pagination)

## ACSMS-TC-004-015 — Hiển thị ban đầu — form search rỗng + list JA mặc định

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: nhiều record JA đã được đăng ký

### 手順

ステップ1：
Click "JAマスタ" từ dashboard

ステップ2：
Kiểm tra trạng thái form search trên màn hình

ステップ3：
Kiểm tra nội dung bảng list

ステップ4：
Kiểm tra query parameter của GET `/api/v1/ja` trên Network tab DevTools

### 期待結果

ステップ1：
Chuyển sang URL `/ja`

ステップ2：
JAコード và JA名 đều rỗng

ステップ3：
Toàn bộ record JA hiển thị tới 20 record theo sort order mặc định. Record đã xóa logic (`deleted_at IS NOT NULL`) không hiển thị

ステップ4：
Query parameter là `?page=1&per_page=20&sort_by=ja_code&sort_order=asc` (giá trị mặc định)

補足：
・Khi hiển thị ban đầu, lấy toàn bộ record không có điều kiện search (sau khi áp dụng DataScope)
・per_page mặc định là 20, sort_by mặc định là `ja_code` asc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-016 — Search — JAコード partial match

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: 3 record `ja_code='1301001001'`, `ja_code='1301002001'`, `ja_code='2701001001'` đã đăng ký

### 手順

ステップ1：
Nhập `1301` vào input JAコード

ステップ2：
Click nút "検索"

ステップ3：
Kiểm tra request parameter đã gửi trên DevTools

ステップ4：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Nhập input thành công

ステップ2：
Trả về HTTP 200 (search condition được áp dụng và màn hình refresh)

ステップ3：
Query parameter có chứa `ja_code=1301`

ステップ4：
Chỉ hiển thị 2 record (`1301001001`, `1301002001`) chứa `1301`. `2701001001` không hiển thị

補足：
・Search partial match (ILIKE '%1301%')
・Không phân biệt chữ hoa chữ thường
・Khoảng trắng đầu/cuối được loại bỏ trước khi search

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-017 — Search — JA名 partial match

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: 3 record `ja_name='JA東京中央'`, `ja_name='JA東京みらい'`, `ja_name='JA大阪'` đã đăng ký

### 手順

ステップ1：
Nhập `東京` vào input JA名

ステップ2：
Click nút "検索"

ステップ3：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Nhập input thành công

ステップ2：
Trả về HTTP 200 (search condition được áp dụng)

ステップ3：
Chỉ hiển thị 2 record (`JA東京中央`, `JA東京みらい`) chứa `東京`. `JA大阪` không hiển thị

補足：
・Search partial match (ILIKE '%東京%')
・Toàn ký tự, hiragana, katakana đều khớp đúng theo dạng đã nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-018 — Search — kết hợp AND giữa JAコード và JA名

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_code='1301001001', ja_name='JA東京中央'`, `ja_code='1301002001', ja_name='JA東京みらい'`, `ja_code='2701001001', ja_name='JA大阪'` đã đăng ký

### 手順

ステップ1：
Nhập JAコード `1301`, JA名 `中央`

ステップ2：
Click nút "検索"

ステップ3：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Nhập input thành công cho cả 2 trường

ステップ2：
Trả về HTTP 200 (áp dụng theo điều kiện AND)

ステップ3：
Chỉ hiển thị 1 record (`JA東京中央`) thỏa cả 2 điều kiện

補足：
・Nhiều search condition kết hợp bằng AND
・Trường rỗng không được đưa vào query (xử lý như undefined)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-019 — Clear search — reset toàn bộ điều kiện và quay về page 1

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Đã search bằng JAコード `1301`, đang xem page 3, đã apply sort JAコード desc

### 手順

ステップ1：
Click nút "検索クリア"

ステップ2：
Kiểm tra nội dung form search

ステップ3：
Kiểm tra trạng thái phân trang

ステップ4：
Kiểm tra trạng thái icon sort

ステップ5：
Kiểm tra nội dung bảng list

### 期待結果

ステップ1：
Thực hiện clear

ステップ2：
JAコード và JA名 đều reset về rỗng

ステップ3：
Quay về page 1 (page hiện tại hiển thị "1")

ステップ4：
Icon sort về trạng thái không hiển thị (initial state)

ステップ5：
Toàn bộ record JA (sau khi áp dụng DataScope) hiển thị theo thứ tự mặc định

補足：
・Reset toàn bộ search condition + sort + page về initial state
・Khi clear search không hiển thị confirm modal

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-020 — Không có kết quả search — hiển thị ACSMS-MSG-004-001

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: chưa đăng ký record nào ứng với `ja_code='ZZZ99999'`

### 手順

ステップ1：
Nhập `ZZZ99999` vào JAコード và click "検索"

ステップ2：
Kiểm tra hiển thị màn hình

ステップ3：
Kiểm tra vùng bảng list

### 期待結果

ステップ1：
Trả về HTTP 200 (trả về `data: []`, `meta.total: 0`)

ステップ2：
Message không có kết quả `検索結果が見つかりませんでした。` hiển thị bên ngoài bảng list

ステップ3：
Không có data row nào hiển thị, phân trang hiển thị "全 0 件"

補足：
・Tương ứng ACSMS-MSG-004-001
・Message rỗng được hiển thị ở phần tử anh em bên ngoài table chứ không qua slot `#emptyText` của a-table

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-021 — Giá trị biên max length của trường search (JAコード 10 ký tự, JA名 100 ký tự)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Nhập 10 ký tự (ví dụ `1234567890`) vào JAコード và click "検索"

ステップ2：
Nhập 11 ký tự (ví dụ `12345678901`) vào JAコード và click "検索"

ステップ3：
Nhập 100 ký tự (ví dụ `東` × 100) vào JA名 và click "検索"

ステップ4：
Nhập 101 ký tự (ví dụ `東` × 101) vào JA名 và click "検索"

### 期待結果

ステップ1：
Trả về HTTP 200 (search thực hiện bình thường)

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors[]` chứa item `field: ja_code`)

ステップ3：
Trả về HTTP 200 (search thực hiện bình thường)

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors[]` chứa item `field: ja_name`)

補足：
・JAコード max 10 ký tự, JA名 max 100 ký tự (theo request parameter API design)
・Tại max nhận bình thường, max+1 từ chối (đồng vị phân chia / phân tích giá trị biên)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-022 — An toàn XSS / HTML rendering của trường search

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã mở màn search

### 手順

ステップ1：
Nhập `<script>alert('XSS')</script>` vào JA名 và click "検索"

ステップ2：
Nhập `<img src=x onerror=alert(1)>` vào JA名 và click "検索"

ステップ3：
Kiểm tra hành vi browser

ステップ4：
Kiểm tra hiển thị màn hình

### 期待結果

ステップ1：
Trả về HTTP 200 (`data: []` (không có record khớp))

ステップ2：
Trả về HTTP 200 (`data: []`)

ステップ3：
Không xuất hiện JavaScript alert

ステップ4：
Trên ô input hiển thị nguyên chuỗi đã được escape (render an toàn dưới dạng text)

補足：
・XSS attack bị vô hiệu hóa nhờ auto-escape của Vue qua `{{ }}` interpolation
・Mặc dù được truyền vào ILIKE clause như search condition, parameterized query khiến không bị parse như SQL syntax

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-023 — An toàn SQL Injection của trường search

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: nhiều record JA đã đăng ký

### 手順

ステップ1：
Nhập `' OR '1'='1` vào JAコード và click "検索"

ステップ2：
Nhập `'; DROP TABLE m_ja; --` vào JA名 và click "検索"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Trả về HTTP 200 (`data: []` (không có record khớp) — SQL payload được truyền vào ILIKE clause như literal string)

ステップ2：
Trả về HTTP 200 (`data: []` — tương tự, không xảy ra việc xóa table)

ステップ3：
Số record JA giống trước khi test (table không bị xóa)

補足：
・SQL Injection bị vô hiệu hóa nhờ parameterized query của TypeORM (bind variable `:ja_code`)
・Tuân thủ quan điểm VP-A-10 "SQL Injection" (testcase-viewpoints.md v1.1)

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

## ACSMS-TC-004-024 — Sort — chuyển đổi 3 trạng thái khi click header cột JAコード

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: nhiều record JA đã đăng ký

### 手順

ステップ1：
Click header cột JAコード (lần 1)

ステップ2：
Click header cột JAコード (lần 2)

ステップ3：
Click header cột JAコード (lần 3)

ステップ4：
Kiểm tra request parameter ở mỗi lần click trên DevTools

### 期待結果

ステップ1：
Sort asc, header hiển thị icon ▲. Query parameter `sort_by=ja_code&sort_order=asc`

ステップ2：
Sort desc, header hiển thị icon ▼. Query parameter `sort_by=ja_code&sort_order=desc`

ステップ3：
Quay về không sort (initial state), icon không hiển thị. Item liên quan sort bị loại khỏi query parameter

ステップ4：
Mỗi lần click đều thực thi GET `/api/v1/ja`, sort condition được phản ánh

補足：
・Quy tắc chuyển sort: lần 1 = asc → lần 2 = desc → lần 3 = clear
・Search condition và page size hiện tại được giữ nguyên (page quay về page 1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-025 — Sort — chuyển đổi 3 trạng thái khi click header cột 都道府県

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: record JA của nhiều prefecture khác nhau (Tokyo, Osaka, Aichi...) đã đăng ký

### 手順

ステップ1：
Click header cột 都道府県 (asc)

ステップ2：
Click thêm 1 lần nữa (desc)

ステップ3：
Click lần 3 (clear)

### 期待結果

ステップ1：
Sort asc, hiển thị icon ▲, `sort_by=todofuken_code&sort_order=asc`

ステップ2：
Sort desc, hiển thị icon ▼, `sort_by=todofuken_code&sort_order=desc`

ステップ3：
Quay về không sort, icon không hiển thị

補足：
・Đối tượng sort là `todofuken_code` (mã prefecture), không phải `todofuken_name` đang hiển thị
・Theo thứ tự code: 13 (Tokyo) → 23 (Aichi) → 27 (Osaka)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-026 — Phân trang — chuyển page size

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: 124 record JA đã đăng ký

### 手順

ステップ1：
Chọn "10 / 頁" trên dropdown page size

ステップ2：
Chọn "50 / 頁"

ステップ3：
Chọn "100 / 頁"

ステップ4：
Kiểm tra parameter `per_page` ở mỗi request trên DevTools

### 期待結果

ステップ1：
Số record hiển thị là 10 record, tổng số page chuyển sang 13 page, `per_page=10`

ステップ2：
Số record hiển thị là 50 record, tổng số page là 3 page, `per_page=50`

ステップ3：
Số record hiển thị là 100 record, tổng số page là 2 page, `per_page=100`

ステップ4：
Page size được phản ánh ở mỗi request

補足：
・per_page tối đa là 100 (theo API design)
・Khi đổi per_page, quay về page 1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-027 — Phân trang — giữ nguyên search condition và sort condition

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã mở màn search
  - ・Test data: 25 record JA chứa "東京" trong `ja_name` đã đăng ký

### 手順

ステップ1：
Nhập `東京` vào JA名 và click "検索"

ステップ2：
Click header cột JAコード, chuyển sang sort desc

ステップ3：
Click "2" trên phân trang

ステップ4：
Kiểm tra request parameter trên DevTools

### 期待結果

ステップ1：
Trả về HTTP 200 (hiển thị 1〜20 trong 25 record)

ステップ2：
Sắp xếp theo JAコード desc, hiển thị icon ▼

ステップ3：
Hiển thị record 21〜25

ステップ4：
Query parameter chứa toàn bộ `ja_name=東京&page=2&per_page=20&sort_by=ja_code&sort_order=desc`

補足：
・Khi chuyển page, search condition và sort condition vẫn được giữ
・Chỉ khi search condition thay đổi mới tự động quay về page 1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 5: Logic nghiệp vụ — Xóa JA (Function — Delete)

## ACSMS-TC-004-028 — Xóa JA — case bình thường (không có related data, xóa logic + audit log)

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=5, ja_code='1301005001', ja_name='JA削除対象'` (không có related record)

### 手順

ステップ1：
Click link "削除" của row `JA削除対象` trên bảng list

ステップ2：
Kiểm tra nội dung confirm modal

ステップ3：
Click nút "はい"

ステップ4：
Kiểm tra DB: `SELECT deleted_at, updated_by FROM m_ja WHERE ja_id = 5`

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 'm_ja' AND target_id = 5 AND operation = 'DELETE' ORDER BY log_datetime DESC LIMIT 1`

ステップ6：
Kiểm tra bảng list trên màn hình

### 期待結果

ステップ1：
Bắt đầu xử lý xóa

ステップ2：
Modal hiển thị message `このJAを削除してもよろしいですか？`, button là "はい" (màu đỏ, primary button) / "いいえ"

ステップ3：
Trả về HTTP 200 (response `{ "message": "削除しました。" }`, hiển thị toast `削除しました。`)

ステップ4：
1 row xác nhận, `deleted_at` được set bằng thời điểm hiện tại (NOW()), `updated_by` khớp với `account_id` của test account

ステップ5：
1 row xác nhận, `log_type=1`, `account_id` khớp với test account, `result_status=1`, `before_value` JSON ghi nhận data record trước khi xóa (loại trừ thông tin nhạy cảm như password), `after_value` là empty string

ステップ6：
JA đã xóa biến mất khỏi list, kết quả tìm kiếm được reload

補足：
・Tương ứng ACSMS-MSG-004-006
・Main DML (UPDATE m_ja SET deleted_at) + audit log INSERT được commit trong cùng 1 transaction
・Không phải xóa vật lý mà là xóa logic (set deleted_at)
・Tuân thủ quan điểm VP-C-03 "Xóa logic + FK liên quan" (testcase-viewpoints.md v1.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-029 — Xóa JA — Cancel bằng "いいえ" trên confirm modal

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=5, ja_code='1301005001'` (không có related record)

### 手順

ステップ1：
Click link "削除" của row đối tượng trên bảng list

ステップ2：
Click nút "いいえ" trên confirm modal

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_ja WHERE ja_id = 5`

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_log WHERE target_id = 5 AND target_table = 'm_ja' AND operation = 'DELETE'`

### 期待結果

ステップ1：
Hiển thị confirm modal `このJAを削除してもよろしいですか？`

ステップ2：
Modal đóng, màn hình giữ nguyên (vẫn hiển thị list)

ステップ3：
`deleted_at IS NULL` (chưa bị xóa)

ステップ4：
0 row (không thêm DELETE log)

補足：
・Khi cancel không có thay đổi DB, không ghi log
・Khi cancel không gọi DELETE API

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-030 — Xóa JA — bị từ chối khi có related data (CONFLICT)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=1, ja_code='1301001001', ja_name='JA東京中央'`, đã có ≥1 related record trong một trong các bảng `m_kanri_shiten` / `m_shiten` / `m_hanbaiten` / `m_tanka` / `t_dokusya` / `m_account`

### 手順

ステップ1：
Click link "削除" của row `JA東京中央` trên bảng list

ステップ2：
Click nút "はい" trên confirm modal

ステップ3：
Kiểm tra hiển thị message trên màn hình

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM m_ja WHERE ja_id = 1`

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_id = 1 AND target_table = 'm_ja' AND log_type = 3 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Hiển thị confirm modal

ステップ2：
Gửi delete request

ステップ3：
Trả về HTTP 409 (`error_code: CONFLICT`, hiển thị toast message `このJAは関連オブジェクトに紐づいているため削除できません。`)

ステップ4：
`deleted_at IS NULL` (chưa bị xóa)

ステップ5：
1 row xác nhận (ghi error log, `log_type=3`, `error_message` ghi lý do CONFLICT)

補足：
・Tương ứng ACSMS-MSG-004-003
・Bảng liên quan: m_kanri_shiten, m_shiten, m_hanbaiten, m_tanka, t_dokusya, m_account — khi tồn tại record chưa xóa có ja_id đối tượng trong một trong các bảng này
・Sau khi rollback transaction, error log được ghi riêng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — kiểm chứng quan trọng để ngăn việc phá vỡ data nghiệp vụ do vi phạm tính toàn vẹn FK.

## ACSMS-TC-004-031 — Xóa JA — chỉ định ID không tồn tại / đã xóa logic (NOT_FOUND)

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=999` chưa đăng ký, `ja_id=998` đã xóa logic (`deleted_at IS NOT NULL`)

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/ja/999`

ステップ2：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/ja/998`

ステップ3：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。`)

ステップ3：
Cả 2 case đều có format response body giống nhau

補足：
・Truy cập tới resource không tồn tại / đã xóa logic đều trả về NOT_FOUND
・Record đã xóa logic bị loại khỏi đối tượng search (filter `deleted_at IS NULL`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-032 — Xóa JA — ẩn sự tồn tại khi vi phạm DataScope (CHUOKAI delete JA khác)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, JA của mình = ja-001)
  - ・Test data: JA khác `ja_id=101` (thuộc chuokai-002) đã đăng ký

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/ja/101`

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_ja WHERE ja_id = 101`

### 期待結果

ステップ1：
Gửi request thành công

ステップ2：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。` (CHUOKAI không có quyền `ja.delete`))

ステップ3：
`deleted_at IS NULL` (chưa bị xóa)

補足：
・CHUOKAI không có quyền `ja.delete` — bị block ngay ở giai đoạn check permission, trả về 403 (không tới được DataScope check)
・Trong trường hợp NICHINO_ADMIN truy cập sang scope khác, theo quy tắc `assertJaScope` của project sẽ ẩn sự tồn tại bằng 404, nhưng với role này bị chặn ở tầng permission

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-033 — Xóa JA — tính đầy đủ của audit log (kiểm chứng before_value JSON khi success)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=6, ja_code='1301006001', ja_name='ログ検証用JA', yubin_no='100-0001', tel='03-5555-5555'` (không có related record)

### 手順

ステップ1：
Xóa `ログ検証用JA` từ list (xác nhận modal "はい")

ステップ2：
Kiểm tra DB: `SELECT log_type, account_id, ja_id, gamen_name, operation, result_status, target_id, target_table, before_value, after_value FROM t_log WHERE target_id = 6 AND target_table = 'm_ja' ORDER BY log_datetime DESC LIMIT 1`

ステップ3：
Kiểm tra nội dung JSON của `before_value`

### 期待結果

ステップ1：
Xóa thành công, hiển thị toast `削除しました。`

ステップ2：
1 row xác nhận, `log_type=1`, `gamen_name='JAマスタ明細検索画面 (ACSMS-SCR-004)'`, `operation='DELETE'`, `result_status=1`, `target_id=6`, `target_table='m_ja'`, `after_value=''`

ステップ3：
JSON `before_value` chứa data record trước khi xóa (ja_id, ja_code, ja_name, yubin_no, todofuken_code, todofuken_name, tel, address, fax...). Không chứa thông tin nhạy cảm như password

補足：
・Tuân thủ quan điểm VP-D-04 "Tính đầy đủ của audit log"
・before_value là record có thể tái hiện được "ai" "lúc nào" "đã xóa cái gì"
・ip_address, user_agent cũng được ghi lại kèm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-034 — Xóa JA — tính toàn vẹn transaction (rollback khi audit log INSERT fail)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: `ja_id=7, ja_code='1301007001'` (không có related record)
  - ・Test environment: setting mock cho audit log INSERT của BE bị fail

### 手順

ステップ1：
Xóa JA đối tượng từ list (xác nhận modal "はい")

ステップ2：
Kiểm tra DB: `SELECT deleted_at FROM m_ja WHERE ja_id = 7`

ステップ3：
Kiểm tra DB: `SELECT log_type, result_status FROM t_log WHERE target_id = 7 AND target_table = 'm_ja' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
`deleted_at IS NULL` (chưa bị xóa do rollback)

ステップ3：
1 row xác nhận, `log_type=3` (error log), `result_status=2` (ghi ngoài transaction qua outer catch)

補足：
・Main DML + audit log thực thi trong cùng 1 transaction nên nếu một trong hai fail thì cả hai sẽ rollback
・Error log (log_type=3) được ghi riêng ngoài transaction nên không bị ảnh hưởng bởi rollback
・Là kiểm chứng quan trọng để đảm bảo data integrity

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical test đảm bảo tính nhất quán giữa audit trail và DB state.

---

# カテゴリ 6: Logic nghiệp vụ — Chuyển màn hình (Function — Navigation)

## ACSMS-TC-004-035 — Nút "新規登録" → chuyển sang Màn đăng ký Master JA

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở màn search

### 手順

ステップ1：
Click nút "新規登録" ở góc phải header bảng list

ステップ2：
Kiểm tra màn hình sau khi chuyển

### 期待結果

ステップ1：
Chuyển sang URL `/ja/create`

ステップ2：
Màn đăng ký Master JA hiển thị ở trạng thái form rỗng

補足：
・Màn đăng ký mặc định hiển thị form rỗng (không có giá trị có sẵn)
・Khi chuyển trang, history được thêm vào browser history stack

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-036 — Link JAコード → chuyển sang Màn chỉnh sửa Master JA (hiển thị data có sẵn)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Test data: `ja_id=1, ja_code='1301001001', ja_name='JA東京中央'` (JA của mình)

### 手順

ステップ1：
Click link JAコード `1301001001` trên bảng list

ステップ2：
Kiểm tra màn hình sau khi chuyển và giá trị form ban đầu

### 期待結果

ステップ1：
Chuyển sang URL `/ja/1/edit`, hiển thị Màn chỉnh sửa Master JA

ステップ2：
Giá trị trong DB (ja_code, ja_name, yubin_no, todofuken_code, address, tel, fax...) hiển thị khớp hoàn toàn trong form. Một số trường (cờ chuokai, các trường liên quan ngân hàng...) hiển thị ở trạng thái read-only

補足：
・Link cột JAコード chỉ click được với role có quyền `ja.update`
・Giá trị form ban đầu của màn edit lấy từ response của GET `/api/v1/ja/{id}`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-037 — Truy cập trực tiếp URL chỉnh sửa — ẩn sự tồn tại khi vi phạm DataScope (ID JA khác)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001, JA của mình = ja-001)
  - ・Test data: `ja_id=2, ja_code='1301002001'` (JA khác = ja-002)

### 手順

ステップ1：
Nhập trực tiếp `/ja/2/edit` vào address bar browser

ステップ2：
Dùng DevTools gọi trực tiếp GET `/api/v1/ja/2`

ステップ3：
Dùng DevTools gửi PUT `/api/v1/ja/2` với request body hợp lệ

### 期待結果

ステップ1：
Chuyển trang fail, hiển thị toast `指定されたJAが見つかりません。`, vẫn ở màn search hoặc chuyển về `/dashboard`

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。`)

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたJAが見つかりません。`)

補足：
・Tuân thủ quan điểm VP-A-04 "URL trực tiếp access attack"
・Truy cập ngoài scope trả về HTTP 404 để ẩn sự tồn tại (không phải 403)
・Truy cập từ bookmark cũ / F5 reload cũng có hành vi tương tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-004-038 — Common Error — UNAUTHORIZED — xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn search
  - ・Đã 24 giờ trở lên kể từ thao tác cuối cùng, Redis session TTL đã hết hạn (hoặc đã bị admin tool revoke)

### 手順

ステップ1：
Click nút "検索", gửi API request

ステップ2：
Kiểm tra nội dung response và chuyển trang

ステップ3：
Kiểm tra address bar browser

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
FE clear user state của Pinia auth store, tự động chuyển sang `/login?redirect=/ja`

ステップ3：
URL có gắn `?redirect=/ja` và đã chuyển sang `/login`

補足：
・Khi session hết hạn, BE SessionAuthGuard trả về 401, và axios interceptor của FE đồng nhất điều hướng về màn login
・Sau khi login lại, sẽ quay về URL của redirect parameter (màn search)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-039 — Common Error — BAD_REQUEST — query parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở Network tab trên DevTools

### 手順

ステップ1：
Trên Console DevTools chạy `fetch('/api/v1/ja?page=-1&per_page=999&sort_by=evil_column&sort_order=invalid', { credentials: 'include' })`

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Gửi request thành công

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`, message `リクエストパラメータが不正です。` hoặc `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Số record DB không thay đổi

補足：
・page < 1, per_page > 100, sort_by ngoài allow list, sort_order khác asc/desc đều bị từ chối với HTTP 400
・sort_by allow list: ja_code, ja_name, yubin_no, todofuken_name, tel, address, fax

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-040 — Common Error — VALIDATION_ERROR — vi phạm max length của search condition

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn search

### 手順

ステップ1：
Nhập 11 ký tự (ví dụ `12345678901`) vào JAコード, 101 ký tự (ví dụ `東` × 101) vào JA名

ステップ2：
Click nút "検索"

ステップ3：
Kiểm tra response body

### 期待結果

ステップ1：
Nhập input thành công

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Mảng `errors` trong response body chứa 2 item:
・`{ field: 'ja_code', message: <max length message> }`
・`{ field: 'ja_name', message: <max length message> }`

補足：
・Class-validator decorator `@MaxLength` đã được apply lên request DTO
・Khi vi phạm nhiều item thì trả về toàn bộ vi phạm trong 1 request

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-041 — Common Error — TOO_MANY_REQUESTS — vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Dùng test script gửi GET `/api/v1/ja` với hơn 100 request trong 1 phút

### 手順

ステップ1：
Khởi chạy script, gửi request tần suất cao tới search API

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra hiển thị toast bên màn hình

### 期待結果

ステップ1：
100 request đầu tiên trả về bình thường, từ đó về sau trả 429

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ3：
Hiển thị toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`, nút search bị disable tạm thời

補足：
・NestJS @Throttle decorator + AWS WAF rate limit cùng block ở 2 tầng infra/app
・Tuân thủ quan điểm VP-A-08 "Rate Limit / Throttling"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-042 — Common Error — INTERNAL_SERVER_ERROR — lỗi nội bộ server

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test environment: BE chủ ý trigger lỗi nội bộ (ví dụ: ngắt kết nối DB, raise exception không catch)

### 手順

ステップ1：
Click nút "検索", hoặc thực hiện thao tác "削除"

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Kiểm tra DB: `SELECT * FROM t_log WHERE log_type = 3 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
Vẫn ở màn search (không redirect), search condition đã nhập được giữ nguyên

ステップ3：
1 row xác nhận, `log_type=3` (error log), `error_message` và `stack_trace` được ghi chi tiết (không public ra client)

補足：
・Error message hướng người dùng không chứa chi tiết, là wording chung chung
・Stack trace chỉ được ghi log nội bộ, không nằm trong response body
・Tương ứng ACSMS-MSG-004-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-004-043 — Common Error — xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn search
  - ・DevTools → Network → chuyển sang chế độ ngắt kết nối mạng

### 手順

ステップ1：
Click nút "検索"

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Đưa mạng về online và click "検索" lại

### 期待結果

ステップ1：
Hiển thị toast `ネットワークエラーが発生しました。接続をご確認ください。`

ステップ2：
Vẫn ở màn search, giá trị nhập và data list hiện tại được giữ nguyên

ステップ3：
Hiển thị kết quả search bình thường

補足：
・Khi phát hiện network error → thông báo cho người dùng
・Giá trị nhập được giữ, có thể gửi lại
・Network error của axios không có HTTP status code nên xử lý toast riêng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
