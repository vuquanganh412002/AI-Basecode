---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-030
screen_name: ログ参照画面
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
| 2 | 2026-08-12 | 1.1 | Tran Duc Tuyen | Sửa lỗi thiếu đồng bộ với screen-design.md: chức năng xuất CSV chỉ xuất "trang đang hiển thị" (không xuất toàn bộ) nên không tồn tại kiểm tra giới hạn 5,000 dòng. Đánh dấu ACSMS-TC-030-034 là đã bãi bỏ (giữ nguyên ID, không đánh số lại). Xóa cụm "trong phạm vi 5,000 dòng" khỏi tiền đề/kết quả mong đợi của ACSMS-TC-030-033 | | |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình tham chiếu Log (ACSMS-SCR-030)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-030 | Tài liệu thiết kế Màn hình tham chiếu Log |
| 2 | ACSMS-SCR-030-api | Tài liệu thiết kế API tham chiếu Log |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation đầu vào — Điều kiện tìm kiếm | 8 |
| 5 | Logic nghiệp vụ — Tìm kiếm log (Function — Search) | 10 |
| 6 | Logic nghiệp vụ — Xuất CSV (Function — Export) | 6 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 45 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-030-001 — NICHINO_ADMIN truy cập màn tham chiếu log — xem được log của toàn bộ JA

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sở hữu quyền 「log.view」
  - ・Nhiều JA (ja-001, ja-002, ja-003) đều có data log
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra cột `ja_id` trong danh sách log

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log`

### 期待結果

ステップ1：
Màn `/log` được hiển thị, danh sách log hiển thị theo thứ tự mới nhất, 20 dòng/trang

ステップ2：
Hiển thị xen kẽ log của ja_id = 1 / 2 / 3 (không áp dụng filter DataScope)

ステップ3：
Trả về HTTP 200, Response dạng JSON, bao gồm log của toàn bộ JA

補足：
・NICHINO_ADMIN có thể xem log của toàn bộ JA
・DataScope không được áp dụng

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

## ACSMS-TC-030-002 — NICHINO_STAFF truy cập màn tham chiếu log — xem được log của toàn bộ JA

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Sở hữu quyền 「log.view」
  - ・Nhiều JA đều có data log

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra cột `ja_id` trong danh sách log

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log`

### 期待結果

ステップ1：
Màn `/log` được hiển thị, danh sách log hiển thị theo thứ tự mới nhất, 20 dòng/trang

ステップ2：
Hiển thị xen kẽ log của toàn bộ JA

ステップ3：
Trả về HTTP 200, bao gồm log của toàn bộ JA

補足：
・NICHINO_STAFF có thể xem log của toàn bộ JA
・Scope tương đương với NICHINO_ADMIN

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

## ACSMS-TC-030-003 — CHUOKAI truy cập màn tham chiếu log — chỉ xem được log của chuokai mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, được xử lý như ja_id=1)
  - ・Sở hữu quyền 「log.view」
  - ・Có log tồn tại ở cả JA của chuokai mình (ja-001) và JA chuokai khác (ja-002)

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra cột `ja_id` trong danh sách log

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log`

### 期待結果

ステップ1：
Màn `/log` được hiển thị

ステップ2：
Chỉ hiển thị log thuộc ja-001, không hiển thị log của ja-002

ステップ3：
Trả về HTTP 200, mảng `data` trong response chỉ chứa các record có `ja_id = 1`

補足：
・CHUOKAI chỉ tham chiếu được JA thuộc chuokai mình
・DataScope (`l.ja_id = :user_ja_id`) được áp dụng tự động ở backend

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

## ACSMS-TC-030-004 — JA_HONTEN truy cập màn tham chiếu log — chỉ xem được log của JA mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Sở hữu quyền 「log.view」
  - ・Có log tồn tại ở JA mình (ja-001) và JA khác (ja-002)
  - ・Cũng có log ở chi nhánh quản lý (branch-001, branch-002) thuộc JA mình

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra cột `ja_id` trong danh sách log

ステップ3：
Thử lọc tìm kiếm với `account_id` thuộc JA khác (ja-002)

### 期待結果

ステップ1：
Màn `/log` được hiển thị

ステップ2：
Chỉ hiển thị log thuộc ja-001, log của các chi nhánh quản lý cấp dưới (branch-001, branch-002) cũng xem được

ステップ3：
Log của ja-002 không hiển thị, kết quả 0 dòng và hiển thị `検索結果が見つかりませんでした。`

補足：
・JA_HONTEN xem được log của JA mình và các chi nhánh quản lý cấp dưới
・DataScope (`l.ja_id = :user_ja_id`) được áp dụng

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

## ACSMS-TC-030-005 — JA_KANRI_SHITEN truy cập màn tham chiếu log — chỉ xem được log của chi nhánh quản lý mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Có account thuộc chi nhánh quản lý mình (branch-001) và account thuộc chi nhánh quản lý khác (branch-002)

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra account trong danh sách log

ステップ3：
Thử lọc tìm kiếm với account ID của chi nhánh quản lý khác (branch-002)

### 期待結果

ステップ1：
Màn `/log` được hiển thị

ステップ2：
Chỉ hiển thị log của các account thuộc branch-001, log của branch-002 không hiển thị

ステップ3：
Log của branch-002 không hiển thị, kết quả 0 dòng và hiển thị `検索結果が見つかりませんでした。`

補足：
・JA_KANRI_SHITEN chỉ xem được log của các account thuộc chi nhánh quản lý mình
・DataScope (`a.kanri_shiten_id = :user_kanri_shiten_id`) được áp dụng

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

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-030-006 — Layout tổng thể khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
So sánh màn hình với spec thiết kế (screen-design.md / index.html) đặt cạnh nhau

ステップ3：
Kiểm tra bố cục các phần tử trên màn (vùng điều kiện tìm kiếm → vùng danh sách log → phân trang)

### 期待結果

ステップ1：
Màn `/log` được hiển thị

ステップ2：
Màu nền, font, font-size, padding, màu button, style table — tất cả khớp với spec thiết kế

ステップ3：
Từ trên xuống dưới được bố trí theo thứ tự: 「Vùng điều kiện tìm kiếm」「Button xuất CSV + table danh sách log」「Phân trang」

補足：
・design tokens (`design-tokens.ts`) được áp dụng (không có màu hardcode)
・Số dòng log ban đầu hiển thị (tối đa 20 dòng) nằm gọn trong màn

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

## ACSMS-TC-030-007 — Hiển thị các phần tử của form tìm kiếm

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Kiểm tra ô nhập khoảng thời gian (ngày giờ bắt đầu)

ステップ2：
Kiểm tra ô nhập khoảng thời gian (ngày giờ kết thúc)

ステップ3：
Mở dropdown loại log

ステップ4：
Mở select box tên user

ステップ5：
Kiểm tra bố cục button 「検索」「検索クリア」

### 期待結果

ステップ1：
Hiển thị ô nhập dạng lịch, placeholder tương đương「YYYY/MM/DD HH:mm:ss」, giá trị ban đầu rỗng

ステップ2：
Hiển thị ô nhập dạng lịch, placeholder tương đương「YYYY/MM/DD HH:mm:ss」, giá trị ban đầu rỗng

ステップ3：
Dropdown hiển thị 5 item「すべて／ユーザー操作ログ／システムログ／エラーログ／ファイルアップロードログ」, giá trị ban đầu là「すべて」

ステップ4：
Select box hiển thị danh sách account (đã áp dụng DataScope), giá trị ban đầu rỗng

ステップ5：
Button「検索」hiển thị dạng button chính (màu xanh), button「検索クリア」hiển thị dạng button phụ

補足：
・Tất cả các phần tử tuân thủ design tokens
・Select box tên user lấy dữ liệu từ API dùng chung `/api/v1/account/dropdown`

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

## ACSMS-TC-030-008 — Hiển thị table danh sách log (cấu trúc cột, badge kết quả)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có record của từng result_status (1:thành công, 2:thất bại, 3:cảnh báo)

### 手順

ステップ1：
Kiểm tra thứ tự cột của table danh sách log

ステップ2：
Kiểm tra hiển thị badge của cột「結果」

ステップ3：
Kiểm tra format hiển thị của cột「操作」

ステップ4：
Kiểm tra nội dung hiển thị của cột「詳細」

### 期待結果

ステップ1：
Các cột hiển thị theo thứ tự từ trái sang: 「日時 / ユーザーID / 操作 / 結果 / 詳細」

ステップ2：
Record có result_status=1 hiển thị badge màu xanh lá「成功」, result_status=2 hiển thị badge màu đỏ「失敗」, result_status=3 hiển thị badge màu vàng「警告」

ステップ3：
Hiển thị nối chuỗi theo format「{gamen_name} {operation}」 (ví dụ: 「単価マスタ登録画面 (ACSMS-SCR-003) CREATE」)

ステップ4：
JSON của `t_log.after_value` được map trực tiếp và hiển thị

補足：
・Hiển thị theo thứ tự giảm dần từ log mới nhất
・User ID hiển thị bằng font monospace

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

## ACSMS-TC-030-009 — Hiển thị phân trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có hơn 250 record

### 手順

ステップ1：
Kiểm tra control phân trang ở phía dưới màn danh sách log

ステップ2：
Kiểm tra hiển thị tổng số record và tổng số trang

ステップ3：
Click số trang「2」

### 期待結果

ステップ1：
Hiển thị các control「前へ」「次へ」「ページ番号」, mặc định là trang 1 với 20 dòng/trang

ステップ2：
Hiển thị tương đương「全250件 / 13ページ中 1ページ目」 (số thực tế tùy thuộc vào số dòng thực)

ステップ3：
Data của trang 2 được hiển thị, query parameter của URL được cập nhật thành `page=2`

補足：
・Cố định 20 dòng/trang
・Khi số dòng dữ liệu ≤ 20, phân trang ẩn hoặc control bị disable

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

## ACSMS-TC-030-010 — Hoạt động responsive — PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị danh sách log

### 手順

ステップ1：
Đặt kích thước window 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (tablet)

ステップ3：
Đổi sang 375×667 (mobile)

### 期待結果

ステップ1：
Sidebar cố định, 4 mục điều kiện tìm kiếm hiển thị ngang hàng, table danh sách log hiển thị full chiều rộng

ステップ2：
Sidebar gập lại, điều kiện tìm kiếm hiển thị 2 cột, table có thể scroll ngang

ステップ3：
Sidebar overlay, điều kiện tìm kiếm hiển thị dọc, table có thể scroll ngang, không vỡ layout ngoài việc scroll ngang

補足：
・Cả 3 breakpoint đều không vỡ layout
・Toàn bộ phần tử đều thao tác được

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

## ACSMS-TC-030-011 — Thứ tự Tab và thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị danh sách log

### 手順

ステップ1：
Focus vào ô nhập khoảng thời gian (ngày giờ bắt đầu), nhấn liên tục phím Tab

ステップ2：
Nhấn phím Space hoặc Enter trên dropdown loại log

ステップ3：
Chuyển focus sang button「検索」, nhấn phím Enter

### 期待結果

ステップ1：
Thứ tự Tab chạy theo「期間（開始）→ 期間（終了）→ ログ種別 → ユーザー名 → 検索 → 検索クリア → CSV出力 → ページネーション」

ステップ2：
Dropdown mở ra, di chuyển lựa chọn bằng phím mũi tên, xác nhận bằng Enter

ステップ3：
Tìm kiếm được thực hiện (gọi GET `/api/v1/log`)

補足：
・Toàn bộ các mục đều thao tác được chỉ với bàn phím
・focus outline hiển thị rõ ràng có thể nhận biết được

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

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-030-012 — Hiển thị tiêu đề header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở màn `/log`

ステップ2：
Kiểm tra title của tab browser và tiêu đề trang ở phía trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tab browser hiển thị title tương đương「購読者管理システム - ログ参照」, header phía trên màn hiển thị「ログ参照」

補足：
・Tiêu đề trang được `MainLayout > AppHeader` tự động render từ `route.meta.breadcrumb`

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

## ACSMS-TC-030-013 — Hiển thị icon thông báo + menu user

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra icon thông báo ở góc trên phải header

ステップ2：
Click vào menu user (avatar)

ステップ3：
Click link「ログアウト」 trong menu user

### 期待結果

ステップ1：
Icon thông báo được hiển thị, badge thông báo chưa đọc hiển thị chính xác

ステップ2：
Menu user hiển thị dạng dropdown, hiển thị tên user đăng nhập và role name

ステップ3：
Thực hiện xử lý logout, chuyển sang màn `/login`, session bị hủy

補足：
・Các phần tử header hiển thị nhất quán vị trí trên toàn bộ màn hình

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

## ACSMS-TC-030-014 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra breadcrumb của màn `/log`

ステップ2：
Click link「ホーム」 trên breadcrumb

### 期待結果

ステップ1：
Hiển thị 2 cấp dạng「ホーム > ログ参照」

ステップ2：
Chuyển sang `/dashboard`

補足：
・Breadcrumb được tự động render từ `route.meta.breadcrumb`
・Mỗi link breadcrumb hoạt động bình thường

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

---

# カテゴリ 4: Validation đầu vào — Điều kiện tìm kiếm

## ACSMS-TC-030-015 — Khoảng thời gian (ngày giờ bắt đầu) — input tùy chọn (cho phép rỗng)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Để trống khoảng thời gian (ngày giờ bắt đầu) và nhấn button「検索」

ステップ2：
Kiểm tra request GET `/api/v1/log` trên tab Network của DevTools

### 期待結果

ステップ1：
Tìm kiếm thành công, Trả về HTTP 200, không hiển thị lỗi required

ステップ2：
Query parameter không bao gồm `date_from`, hoặc gửi dạng chuỗi rỗng, lấy được log toàn bộ kỳ không có filter ngày giờ bắt đầu

補足：
・Khoảng thời gian (ngày giờ bắt đầu) là mục tùy chọn
・Để trống cũng không phát sinh lỗi validation

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

## ACSMS-TC-030-016 — Khoảng thời gian (ngày giờ kết thúc) — input tùy chọn (cho phép rỗng)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Để trống khoảng thời gian (ngày giờ kết thúc) và nhấn button「検索」

ステップ2：
Kiểm tra request GET `/api/v1/log` trên tab Network của DevTools

### 期待結果

ステップ1：
Tìm kiếm thành công, Trả về HTTP 200, không hiển thị lỗi required

ステップ2：
Query parameter không bao gồm `date_to`, hoặc gửi dạng chuỗi rỗng, lấy được log toàn bộ kỳ không có filter ngày giờ kết thúc

補足：
・Khoảng thời gian (ngày giờ kết thúc) là mục tùy chọn
・Để trống cũng không phát sinh lỗi validation

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

## ACSMS-TC-030-017 — Check tương quan khoảng thời gian — lỗi khi ngày bắt đầu > ngày kết thúc

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Nhập「2026/04/17 00:00:00」vào khoảng thời gian (ngày giờ bắt đầu)

ステップ2：
Nhập「2026/04/10 00:00:00」vào khoảng thời gian (ngày giờ kết thúc)

ステップ3：
Nhấn button「検索」

ステップ4：
Kiểm tra request GET `/api/v1/log` và response trên tab Network của DevTools

### 期待結果

ステップ1：
Giá trị được nhập vào ngày giờ bắt đầu

ステップ2：
Giá trị được nhập vào ngày giờ kết thúc

ステップ3：
Hiển thị toast hoặc dưới mục input message lỗi `「開始日」は「終了日」以前の日付を入力してください。`, kết quả tìm kiếm không được cập nhật

ステップ4：
Trường hợp request được gửi sang backend, Trả về HTTP 400 (`error_code: DATE_RANGE_INVALID`, message `「開始日」は「終了日」以前の日付を入力してください。`)

補足：
・Áp dụng verbatim văn bản của message code ACSMS-MSG-030-001
・Validate trước khi gửi ở phía frontend, kiểm tra lại ở phía backend

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

## ACSMS-TC-030-018 — Check độ dài khoảng thời gian — lỗi vượt quá 365 ngày

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Nhập「2025/01/01 00:00:00」vào khoảng thời gian (ngày giờ bắt đầu)

ステップ2：
Nhập「2026/05/01 00:00:00」vào khoảng thời gian (ngày giờ kết thúc) (khoảng 485 ngày sau)

ステップ3：
Nhấn button「検索」

ステップ4：
Kiểm tra response GET `/api/v1/log` trên tab Network của DevTools

### 期待結果

ステップ1：
Giá trị được nhập vào ngày giờ bắt đầu

ステップ2：
Giá trị được nhập vào ngày giờ kết thúc

ステップ3：
Hiển thị toast hoặc dưới mục input message lỗi `検索期間は1年以内で指定してください。`, kết quả tìm kiếm không được cập nhật

ステップ4：
Trường hợp request được gửi sang backend, Trả về HTTP 400 (`error_code: DATE_RANGE_TOO_LONG`, message `検索期間は1年以内で指定してください。`)

補足：
・Áp dụng verbatim văn bản của message code ACSMS-MSG-030-002
・Khoảng thời gian có thể tìm kiếm tối đa là 365 ngày

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

## ACSMS-TC-030-019 — Khoảng thời gian đúng 365 ngày (giá trị biên)

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Nhập「2025/05/22 00:00:00」vào khoảng thời gian (ngày giờ bắt đầu)

ステップ2：
Nhập「2026/05/22 00:00:00」vào khoảng thời gian (ngày giờ kết thúc) (đúng 365 ngày sau)

ステップ3：
Nhấn button「検索」

ステップ4：
Đổi khoảng thời gian (ngày giờ kết thúc) thành「2026/05/22 00:00:01」và nhấn button「検索」lại

### 期待結果

ステップ1：
Giá trị được nhập vào ngày giờ bắt đầu

ステップ2：
Giá trị được nhập vào ngày giờ kết thúc

ステップ3：
Tìm kiếm thành công, Trả về HTTP 200, không hiển thị lỗi

ステップ4：
Do vượt quá 365 ngày 1 giây, hiển thị message lỗi `検索期間は1年以内で指定してください。`

補足：
・Giá trị biên: đúng 365 ngày OK, 365 ngày + 1 giây NG
・Biên năm nhuận cũng đánh giá theo 365 ngày tương tự

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

## ACSMS-TC-030-020 — Dropdown loại log — kiểm tra hoạt động toàn bộ lựa chọn

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có log của mỗi log_type (1~4)

### 手順

ステップ1：
Mở dropdown loại log

ステップ2：
Chọn「ユーザー操作ログ」 và nhấn button「検索」

ステップ3：
Chọn「すべて」 và nhấn button「検索」

ステップ4：
Lần lượt chọn「エラーログ」「ファイルアップロードログ」 và nhấn button「検索」

### 期待結果

ステップ1：
Hiển thị 5 item「すべて／ユーザー操作ログ／システムログ／エラーログ／ファイルアップロードログ」

ステップ2：
Chỉ hiển thị record có log_type=1, query parameter bao gồm `log_type=1`

ステップ3：
Hiển thị xen kẽ record của toàn bộ log_type, query parameter không bao gồm `log_type`

ステップ4：
Lần lượt chỉ hiển thị record có log_type=3 / log_type=4

補足：
・Mapping số log_type: 1=user thao tác, 2=hệ thống, 3=lỗi, 4=upload file
・Khi chọn「すべて」không filter

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

## ACSMS-TC-030-021 — Select box tên user — phản ánh DataScope

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Có account tồn tại ở chuokai mình và chuokai khác

### 手順

ステップ1：
Mở select box tên user

ステップ2：
Kiểm tra response GET `/api/v1/account/dropdown` trên tab Network của DevTools

ステップ3：
Chọn một account thuộc chuokai mình và nhấn button「検索」

### 期待結果

ステップ1：
Dropdown chỉ hiển thị account thuộc chuokai mình, account của chuokai khác không hiển thị

ステップ2：
Mảng `data` trong response đã áp dụng DataScope (chỉ chuokai mình)

ステップ3：
Chỉ hiển thị log của account đã chọn, query parameter bao gồm `account_id={giá trị đã chọn}`

補足：
・API dùng chung `/api/v1/account/dropdown` tự động áp dụng DataScope
・Logic DataScope tương tự cũng được áp dụng cho role JA_HONTEN / JA_KANRI_SHITEN

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

## ACSMS-TC-030-022 — Từ chối input format không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình

### 手順

ステップ1：
Thử nhập「abcdef」 (chuỗi ký tự không hợp lệ) vào khoảng thời gian (ngày giờ bắt đầu)

ステップ2：
Thử nhập「2026/13/40 99:99:99」 (ngày không hợp lệ) vào khoảng thời gian (ngày giờ bắt đầu)

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?date_from=abc`

### 期待結果

ステップ1：
Ô nhập dạng lịch chặn việc nhập chuỗi không hợp lệ, hoặc bị clear khi rời focus sau khi nhập

ステップ2：
Bị từ chối vì là ngày không hợp lệ, ô nhập bị clear hoặc hiển thị lỗi

ステップ3：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`, message `リクエストパラメータが不正です。` hoặc tương đương)

補足：
・Format cố định là `YYYY/MM/DD HH:mm:ss`
・Chọn từ date picker để tránh nhập sai

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

---

# カテゴリ 5: Logic nghiệp vụ — Tìm kiếm log (Function — Search)

## ACSMS-TC-030-023 — Hiển thị ban đầu — thứ tự mới nhất + 20 dòng/trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có hơn 250 record

### 手順

ステップ1：
Click link 「ログ参照」 trên sidebar

ステップ2：
Kiểm tra thứ tự hiển thị của danh sách log

ステップ3：
Kiểm tra số dòng hiển thị trên 1 trang

### 期待結果

ステップ1：
Màn `/log` được hiển thị, điều kiện tìm kiếm ở giá trị ban đầu (khoảng thời gian: rỗng, loại log: tất cả, tên user: rỗng)

ステップ2：
Hiển thị theo thứ tự giảm dần log_datetime (thứ tự mới nhất), dòng trên cùng là log mới nhất

ステップ3：
Hiển thị 20 dòng/trang, phân trang hiển thị dạng「1 / 13」 (số thực tế tùy thuộc)

補足：
・DataScope tự động được áp dụng khi hiển thị ban đầu
・Sort mặc định: log_datetime DESC

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

## ACSMS-TC-030-024 — Tìm kiếm — case bình thường (filter với nhiều điều kiện)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong khoảng thời gian đối tượng có record của các log_type đa dạng

### 手順

ステップ1：
Nhập「2026/04/01 00:00:00」vào khoảng thời gian (ngày giờ bắt đầu), nhập「2026/04/30 23:59:59」vào khoảng thời gian (ngày giờ kết thúc)

ステップ2：
Chọn loại log「ユーザー操作ログ」

ステップ3：
Chọn tên user bất kỳ và nhấn button「検索」

ステップ4：
Kiểm tra request GET `/api/v1/log` trên tab Network của DevTools

### 期待結果

ステップ1：
Khoảng thời gian được nhập

ステップ2：
「ユーザー操作ログ」được chọn trong dropdown

ステップ3：
Trả về HTTP 200, chỉ hiển thị data khớp với điều kiện tìm kiếm, chuyển về trang 1

ステップ4：
Query parameter được gửi theo format `date_from=2026/04/01%2000:00:00&date_to=2026/04/30%2023:59:59&log_type=1&account_id={giá trị}&page=1&per_page=20`

補足：
・Toàn bộ điều kiện được kết hợp bằng AND
・Số kết quả tìm kiếm hiển thị ở phía trên danh sách

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

## ACSMS-TC-030-025 — Hiển thị message khi kết quả tìm kiếm 0 dòng

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trạng thái data có kết quả 0 dòng với điều kiện áp dụng

### 手順

ステップ1：
Nhập「2030/01/01 00:00:00」vào khoảng thời gian (ngày giờ bắt đầu), nhập「2030/01/02 00:00:00」vào khoảng thời gian (ngày giờ kết thúc) (ngày tương lai)

ステップ2：
Nhấn button「検索」

ステップ3：
Kiểm tra hiển thị màn hình

### 期待結果

ステップ1：
Khoảng thời gian được nhập

ステップ2：
Trả về HTTP 200, mảng `data` trong response rỗng, `meta.total = 0`

ステップ3：
Hiển thị message `検索結果が見つかりませんでした。`, table danh sách log có hiển thị thể hiện 「Không tồn tại dữ liệu」, phân trang bị ẩn

補足：
・Áp dụng verbatim văn bản của message code ACSMS-MSG-030-003
・0 dòng không phải lỗi mà là response bình thường

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

## ACSMS-TC-030-026 — Xóa điều kiện tìm kiếm — reset toàn bộ điều kiện

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trạng thái sau khi nhập điều kiện tìm kiếm và đã hiển thị danh sách kết quả

### 手順

ステップ1：
Tạo trạng thái đã nhập khoảng thời gian, loại log, tên user

ステップ2：
Nhấn button「検索クリア」

ステップ3：
Kiểm tra trạng thái điều kiện tìm kiếm và danh sách

### 期待結果

ステップ1：
Điều kiện tìm kiếm có giá trị được nhập

ステップ2：
Toàn bộ điều kiện tìm kiếm bị clear (khoảng thời gian: rỗng, loại log: 「すべて」, tên user: rỗng)

ステップ3：
Danh sách log mặc định (thứ tự mới nhất, đã áp dụng DataScope) được hiển thị lại, trang quay về trang 1

補足：
・Điều kiện tìm kiếm được khởi tạo
・Query parameter trên URL được clear

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

## ACSMS-TC-030-027 — Phân trang — trang trước, trang sau, trang chỉ định

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có hơn 250 record

### 手順

ステップ1：
Nhấn button「次へ」

ステップ2：
Click trực tiếp số trang「5」

ステップ3：
Nhấn button「前へ」

ステップ4：
Di chuyển đến trang cuối và thử nhấn「次へ」

### 期待結果

ステップ1：
Data của trang 2 được hiển thị, query parameter được cập nhật thành `page=2`

ステップ2：
Data của trang 5 được hiển thị, query parameter được cập nhật thành `page=5`

ステップ3：
Data của trang 4 được hiển thị

ステップ4：
Button「次へ」hiển thị ở trạng thái disable, không xảy ra chuyển trang

補足：
・Giữ nguyên điều kiện tìm kiếm hiện tại khi chuyển trang
・「前へ」bị disable ở trang đầu, 「次へ」bị disable ở trang cuối

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

## ACSMS-TC-030-028 — Sort — mặc định giảm dần theo ngày giờ + chuyển sort khi click cột

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có nhiều log với log_datetime / log_type / result_status khác nhau

### 手順

ステップ1：
Kiểm tra thứ tự sort của cột「日時」ở trạng thái hiển thị ban đầu

ステップ2：
Click header cột「日時」để chuyển sort

ステップ3：
Click header cột「結果」để sort

### 期待結果

ステップ1：
Hiển thị theo thứ tự giảm dần log_datetime (thứ tự mới nhất), icon sort thể hiện「↓」 (giảm dần)

ステップ2：
Chuyển sang thứ tự tăng dần log_datetime (thứ tự cũ), icon sort thể hiện「↑」 (tăng dần), query parameter chuyển thành `sort_by=log_datetime&sort_order=asc`

ステップ3：
Sort theo cột result_status, query parameter chuyển thành `sort_by=result_status`

補足：
・Các cột sort được phép: log_datetime, log_type, result_status
・Sort theo các cột khác bị backend từ chối

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

## ACSMS-TC-030-029 — DataScope — CHUOKAI chỉ lấy log của chuokai mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, ja_id=1)
  - ・Có log tồn tại ở JA của chuokai mình (ja-001) và JA của chuokai khác (ja-002)

### 手順

ステップ1：
Mở màn danh sách log

ステップ2：
Kiểm tra response JSON của GET `/api/v1/log` trên DevTools

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?account_id={account_id của chuokai khác}`

### 期待結果

ステップ1：
Chỉ hiển thị log có ja_id=1

ステップ2：
Toàn bộ phần tử trong mảng `data` của response đều có `ja_id = 1`, không bao gồm log của ja-002

ステップ3：
Dù filter bằng account_id của chuokai khác, kết quả là 0 dòng (DataScope filter ở phía backend)

補足：
・DataScope (`l.ja_id = :user_ja_id`) được áp dụng tự động ở backend
・Tính toàn vẹn data được đảm bảo

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

## ACSMS-TC-030-030 — DataScope — JA_HONTEN chỉ lấy log của JA mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Trong JA mình có các chi nhánh quản lý (branch-001, branch-002)
  - ・JA khác (ja-002) cũng có log tồn tại

### 手順

ステップ1：
Mở màn danh sách log

ステップ2：
Kiểm tra account (user ID) của log

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?account_id={account_id của JA khác}`

### 期待結果

ステップ1：
Chỉ hiển thị log có ja_id=1

ステップ2：
Hiển thị log của các account thuộc chi nhánh quản lý (branch-001, branch-002) của JA mình

ステップ3：
Dù filter bằng account_id của JA khác, kết quả là 0 dòng

補足：
・JA_HONTEN xem được log của tất cả chi nhánh quản lý thuộc JA mình
・DataScope (`l.ja_id = :user_ja_id`) được áp dụng

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

## ACSMS-TC-030-031 — DataScope — JA_KANRI_SHITEN chỉ lấy log của chi nhánh quản lý mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Có account và log tồn tại ở cả branch-001 và branch-002

### 手順

ステップ1：
Mở màn danh sách log

ステップ2：
Kiểm tra response JSON của GET `/api/v1/log` trên DevTools

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?account_id={account_id thuộc branch-002}`

### 期待結果

ステップ1：
Chỉ hiển thị log của các account thuộc branch-001

ステップ2：
Toàn bộ account trong mảng `data` của response đều thuộc branch-001

ステップ3：
Dù filter bằng account của branch-002, kết quả là 0 dòng

補足：
・DataScope (`a.kanri_shiten_id = :user_kanri_shiten_id`) được áp dụng tự động ở backend
・Không thể truy cập log của chi nhánh quản lý khác bằng bất cứ cách nào

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

## ACSMS-TC-030-032 — Hiển thị cột kết quả tìm kiếm — badge kết quả + field chi tiết

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong `t_log` có record của mỗi result_status (1, 2, 3)

### 手順

ステップ1：
Mở màn danh sách log

ステップ2：
Kiểm tra cột「結果」「詳細」của record có result_status=1

ステップ3：
Kiểm tra cột「結果」「詳細」của record có result_status=2

ステップ4：
Kiểm tra cột「結果」「詳細」của record có result_status=3

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Cột「結果」hiển thị badge màu xanh lá「成功」, cột「詳細」hiển thị `after_value` (JSON)

ステップ3：
Cột「結果」hiển thị badge màu đỏ「失敗」, cột「詳細」hiển thị `after_value` (khi lỗi thì rỗng)

ステップ4：
Cột「結果」hiển thị badge màu vàng「警告」

補足：
・Label result_status: 1=成功, 2=失敗, 3=警告
・Màu sắc sử dụng semantic color của design tokens (success / error / warning)

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

---

# カテゴリ 6: Logic nghiệp vụ — Xuất CSV (Function — Export)

## ACSMS-TC-030-033 — Xuất CSV case bình thường (chỉ trang đang hiển thị + UTF-8 BOM)

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong khoảng thời gian đối tượng có log tồn tại
  - ・Đã set điều kiện tìm kiếm phù hợp (áp dụng cùng điều kiện tìm kiếm/thứ tự sắp xếp/page/per_page với danh sách)

### 手順

ステップ1：
Set điều kiện tìm kiếm và nhấn button「検索」

ステップ2：
Nhấn button「CSV出力」

ステップ3：
Mở file CSV đã download bằng Excel

ステップ4：
Kiểm tra đầu binary của file CSV

### 期待結果

ステップ1：
Kết quả tìm kiếm được hiển thị

ステップ2：
Trả về HTTP 200, header `Content-Type: text/csv; charset=utf-8` được gắn vào, file CSV được download, toast `CSVファイルをダウンロードしました。` được hiển thị

ステップ3：
Tiếng Nhật hiển thị đúng không bị lỗi font, toàn bộ record của trang đang hiển thị đều được bao gồm (không phải xuất toàn bộ)

ステップ4：
3 byte đầu của file là UTF-8 BOM (`EF BB BF`)

補足：
・Áp dụng verbatim văn bản của message code ACSMS-MSG-030-004
・UTF-8 BOM là bắt buộc để tương thích với Excel tiếng Nhật

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

## ACSMS-TC-030-034 — 【廃止】Lỗi xuất CSV khi vượt quá 5,000 dòng

**Test case này đã bị bãi bỏ. Không cần thực hiện.**

Theo screen-design.md §4 Xuất CSV (bản sửa 2026-08), chức năng xuất CSV được đổi thành chỉ
xuất "trang đang hiển thị" (cùng điều kiện tìm kiếm/thứ tự sắp xếp/page/per_page với danh
sách, tối đa 100 dòng). Vì 1 trang luôn nằm trong per_page (tối đa 100 dòng), tình huống vượt
quá 5,000 dòng không còn xảy ra nữa, nên kiểm tra giới hạn số dòng (ACSMS-MSG-030-005) và test
case này không còn áp dụng.

`ExportLimitExceededException` tương ứng (chưa từng được implement thực sự ở backend) và unit
test dựa trên nó cũng đã được xóa (backend code review finding #19).

Giữ nguyên ID (không đánh số lại) để đảm bảo có thể truy vết lý do xóa; các ID tiếp theo từ
TC-030-035 không bị dịch số.

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

## ACSMS-TC-030-035 — Format tên file xuất CSV

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong khoảng thời gian đối tượng có log trong phạm vi 5,000 dòng

### 手順

ステップ1：
Nhấn button「CSV出力」

ステップ2：
Kiểm tra tên file đã download

ステップ3：
Kiểm tra response header `Content-Disposition` trên tab Network của DevTools

### 期待結果

ステップ1：
File CSV được download

ステップ2：
Tên file theo format `log_export_YYYYMMDD_HHmmss.csv` (ví dụ: `log_export_20260522_143025.csv`)

ステップ3：
`Content-Disposition: attachment; filename="log_export_YYYYMMDD_HHmmss.csv"` được gắn vào

補足：
・Ngày giờ trong tên file dùng thời điểm hiện tại ở phía server
・Timezone là JST (Asia/Tokyo)

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

## ACSMS-TC-030-036 — Thứ tự cột và xử lý escape khi xuất CSV

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có record log có chứa dấu phẩy, dấu nháy kép, xuống dòng trong「画面名」

### 手順

ステップ1：
Nhấn button「CSV出力」

ステップ2：
Mở file CSV đã download bằng text editor

ステップ3：
Kiểm tra thứ tự cột của dòng header

ステップ4：
Kiểm tra escape của record có chứa ký tự đặc biệt

### 期待結果

ステップ1：
File CSV được download

ステップ2：
Có thể xem được nội dung file

ステップ3：
Dòng header theo thứ tự「ログID, ログ種別, 日時, ユーザーID, JA ID, 画面名, 操作内容, 結果, 対象ID, 対象テーブル, IPアドレス」

ステップ4：
Giá trị có chứa dấu phẩy, dấu nháy kép, xuống dòng được bao bởi dấu nháy kép (`"`), dấu nháy kép được escape thành `""`

補足：
・Toàn bộ 11 cột được output đúng theo thứ tự spec
・Quy tắc escape CSV: tuân thủ RFC 4180

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

## ACSMS-TC-030-037 — Ghi log thao tác khi xuất CSV

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trong khoảng thời gian đối tượng có log

### 手順

ステップ1：
Set điều kiện tìm kiếm (khoảng thời gian + loại log)

ステップ2：
Nhấn button「CSV出力」

ステップ3：
Sau khi download hoàn tất, kiểm tra table `t_log` trong DB

```sql
SELECT * FROM t_log
WHERE operation = 'EXPORT_CSV'
  AND target_table = 't_log'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Điều kiện tìm kiếm được set

ステップ2：
CSV được download

ステップ3：
Audit log được record 1 dòng, `log_type=1` (user thao tác), `operation='EXPORT_CSV'`, `result_status=1` (thành công), `gamen_name='ログ参照画面 (ACSMS-SCR-030)'`, `account_id` khớp với account test, `after_value` được record dạng JSON với điều kiện export và số dòng (`date_from`, `date_to`, `log_type`, `record_count`)

補足：
・before_value là chuỗi rỗng
・Audit log là yêu cầu pháp lý, phải được record mỗi lần xuất CSV

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

## ACSMS-TC-030-038 — Ghi error log khi xuất CSV thất bại

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Môi trường có thể chủ động trigger lỗi kết nối DB

### 手順

ステップ1：
Gây lỗi kết nối DB hoặc lỗi ghi disk trong khi sinh CSV

ステップ2：
Nhấn button「CSV出力」

ステップ3：
Kiểm tra table `t_log` trong DB

```sql
SELECT * FROM t_log
WHERE operation = 'EXPORT_CSV'
  AND result_status = 2
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Việc inject lỗi hoạt động

ステップ2：
Trả về HTTP 500, hiển thị toast `システムエラーが発生しました。管理者にお問い合わせください。`, CSV không được download

ステップ3：
Error log được record, `log_type=3` (lỗi), `operation='EXPORT_CSV'`, `result_status=2` (thất bại), `error_message` chứa chi tiết lỗi, `stack_trace` chứa stack trace

補足：
・Áp dụng verbatim văn bản của message code ACSMS-MSG-030-006
・Error log được record riêng ngoài transaction

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

---

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-030-039 — Lỗi chung UNAUTHORIZED xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn tham chiếu log
  - ・Force revoke Redis session bằng admin tool, hoặc đã qua 24h

### 手順

ステップ1：
Force revoke session

ステップ2：
Nhấn button「検索」

ステップ3：
Kiểm tra URL sau khi redirect

ステップ4：
Kiểm tra behavior sau khi đăng nhập lại

### 期待結果

ステップ1：
Session đã bị hết hạn

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`), `useAuthStore().user` bị clear

ステップ3：
Chuyển sang `/login` kèm query parameter `redirect`, dạng như `/login?redirect=/log`

ステップ4：
Sau khi đăng nhập lại thành công, quay về màn `/log`

補足：
・Không hiển thị toast「セッションが切れました…」trên màn login (form login đã thể hiện trạng thái)

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

## ACSMS-TC-030-040 — Lỗi chung BAD_REQUEST request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?per_page=999` (vượt quá tối đa 100)

ステップ2：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?sort_by=invalid_column`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?log_type=99`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`, message `リクエストパラメータが不正です。`)

ステップ2：
Trả về HTTP 400 (cột sort không được phép)

ステップ3：
Trả về HTTP 400 (log_type chỉ cho phép 1~4)

補足：
・Cột được phép: log_datetime, log_type, result_status
・Phạm vi log_type: 1~4
・Phạm vi per_page: 1~100

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

## ACSMS-TC-030-041 — Lỗi chung VALIDATION_ERROR lỗi validation gộp

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?date_from=invalid&page=-1&per_page=0`

ステップ2：
Kiểm tra mảng `errors` trong response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Mảng `errors` chứa nhiều lỗi theo từng mục (lỗi format `date_from`, ngoài phạm vi `page`, ngoài phạm vi `per_page`)

補足：
・Trả về nhiều lỗi mục trong 1 response
・Phía frontend `useApiForm` map `errors` theo từng mục

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

## ACSMS-TC-030-042 — Lỗi chung TOO_MANY_REQUESTS vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Gửi liên tục 101 lần GET `/api/v1/log` trong 1 phút (vượt giới hạn 100 lần/phút/IP mặc định)

ステップ2：
Kiểm tra response từ lần thứ 101 trở đi

### 期待結果

ステップ1：
100 lần đầu tiên Trả về HTTP 200

ステップ2：
Từ lần thứ 101 trở đi Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), toast được hiển thị

補足：
・Decorator `@Throttle` của NestJS (tầng app) đang hoạt động
・Rate limit AWS WAF (tầng infra) sẽ verify riêng ở môi trường staging

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

## ACSMS-TC-030-043 — Lỗi chung INTERNAL_SERVER_ERROR mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Môi trường có thể chủ động trigger lỗi kết nối DB

### 手順

ステップ1：
Ngắt kết nối DB hoặc dừng BE process

ステップ2：
Nhấn button「検索」

ステップ3：
Sau khi DB phục hồi, kiểm tra `t_log`

### 期待結果

ステップ1：
Đã chuyển sang trạng thái sự cố

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), toast được hiển thị

ステップ3：
Error log (`log_type=3`, `result_status=2`) được record, `error_message` chứa chi tiết lỗi

補足：
・Stack trace không bị leak ra client
・Server log có record stack trace chi tiết

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

## ACSMS-TC-030-044 — Lỗi chung DATA_SCOPE_VIOLATION truy cập ngoài scope

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã nắm được account_id và log_id tồn tại trong chuokai khác (thuộc chuokai-002)

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/log?account_id={account_id của chuokai khác}`

ステップ2：
Dùng DevTools gọi trực tiếp GET `/api/v1/log/export?account_id={account_id của chuokai khác}`

### 期待結果

ステップ1：
Trả về HTTP 200, mảng `data` rỗng (filter bằng DataScope, trả về 0 dòng theo cách che giấu tồn tại)

ステップ2：
Trả về HTTP 200 hoặc 409, không bao gồm data ngoài scope

補足：
・Truy cập ngoài scope không trả 403 mà trả kết quả rỗng theo thiết kế che giấu tồn tại
・Danh sách lỗi trong api.md định nghĩa `DATA_SCOPE_VIOLATION（403）` nhưng trong implement có khả năng ưu tiên kết quả rỗng theo policy của helper `assertJaScope`
・Sau khi xác nhận behavior khi test, chốt spec để tránh tranh cãi

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

Vi phạm DataScope được xử lý dưới dạng kết quả rỗng theo thiết kế, nhưng cũng có lựa chọn implement trả về 403 rõ ràng. Khi thực hiện test cần xác nhận policy implement.

## ACSMS-TC-030-045 — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn tham chiếu log

### 手順

ステップ1：
DevTools → Network → chuyển sang chế độ「Offline」

ステップ2：
Nhấn button「検索」

ステップ3：
DevTools → Network → khôi phục về chế độ online

ステップ4：
Nhấn lại button「検索」

### 期待結果

ステップ1：
Đã chuyển sang chế độ offline

ステップ2：
Toast `ネットワークエラーが発生しました…` được hiển thị, giá trị nhập điều kiện tìm kiếm không bị mất, button quay về trạng thái active

ステップ3：
Đã khôi phục về chế độ online

ステップ4：
Trả về HTTP 200, kết quả tìm kiếm được hiển thị

補足：
・Giá trị nhập điều kiện tìm kiếm không bị mất khi lỗi network (UX retry)
・Toast sử dụng message lỗi network chung của app

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
