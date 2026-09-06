---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-006
screen_name: 支店マスタ明細検索画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Master Chi nhánh (ACSMS-SCR-006)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-006 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Master Chi nhánh |
| 2 | ACSMS-SCR-006-api | Tài liệu thiết kế API tìm kiếm chi tiết Master Chi nhánh |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation điều kiện tìm kiếm (Search Filter Validation) | 8 |
| 5 | Tìm kiếm / Sort / Pagination (Search / Sort / Pagination) | 15 |
| 6 | Logic nghiệp vụ (Function — List / Delete) | 12 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 10 |
|  | Tổng | 60 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-006-001 — Cho phép NICHINO_ADMIN truy cập màn hình tìm kiếm chi tiết Master Chi nhánh (toàn bộ JA)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` (cấp chính thức theo CR khách hàng 2026-08-24, migration `1787385200000-GrantShitenAllToNichinoAdmin`)
  - ・session.ja_id là null (NICHINO_ADMIN không thuộc JA nào)

### 手順

ステップ1：
Mở dashboard, kiểm tra hiển thị item "支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/shiten`

ステップ4：
Kiểm tra danh sách khi dữ liệu chi nhánh của nhiều JA khác nhau cùng tồn tại

### 期待結果

ステップ1：
Item "支店マスタ" được hiển thị trên sidebar (do có quyền `shiten.view`)

ステップ2：
Màn hình danh sách `/shiten` hiển thị bình thường (không bị redirect về `/dashboard`)

ステップ3：
Trả về HTTP 200, `data` chứa danh sách chi nhánh

ステップ4：
Do session.ja_id là null nên DataScope filter không áp dụng (`applyBranchScope` bypass khi `session.ja_id == null`) — trả về chi nhánh của TẤT CẢ JA. Riêng dropdown filter "管理支店" vẫn rỗng vì API scope theo 1 JA duy nhất (`GET /api/v1/kanri-shiten/dropdown` yêu cầu `ja_id`) — dùng 4 filter còn lại (支店コード／支店名／データ送信取扱店舗コード／金融機関支店フラグ) để thu hẹp kết quả.

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều cho phép truy cập nhất quán
・NICHINO_STAFF không thuộc phạm vi CR này — vẫn không có `shiten.view`, vẫn bị cấm truy cập như ACSMS-TC-006-002

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo ma trận quyền tại `docs/database/seeder.md §3`, `shiten.view` được cấp cho CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN, và kể từ CR khách hàng 2026-08-24 còn được cấp thêm cho NICHINO_ADMIN (role_permission_id 116-119). Hành vi cũ (cấm truy cập) xem lịch sử git tại `docs/requirement/account_concept.md` §198.

## ACSMS-TC-006-002 — Cấm NICHINO_STAFF truy cập màn hình tìm kiếm chi tiết Master Chi nhánh

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `shiten.view`

### 手順

ステップ1：
Kiểm tra hiển thị item "支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/shiten`

### 期待結果

ステップ1：
Item "支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Cả 3 tầng đều block truy cập
・NICHINO_STAFF chỉ giới hạn ở nghiệp vụ nhập thay cho cửa hàng bán, không có quyền tham chiếu / chỉnh sửa Master Chi nhánh

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-003 — Cho phép CHUOKAI xem màn hình tìm kiếm chi tiết Master Chi nhánh

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update` / `shiten.delete`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Click "支店マスタ" trên sidebar, mở URL `/shiten`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/shiten`, kiểm tra response

### 期待結果

ステップ1：
Item "支店マスタ" được hiển thị trên sidebar (do có quyền `shiten.view`)

ステップ2：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị, form search và danh sách chi nhánh được render

ステップ3：
Trả về HTTP 200, response body chứa mảng `data` và object `meta`

補足：
・Button "新規登録" hiển thị ở trạng thái active (do có quyền `shiten.create`)
・Link "削除" tại cột thao tác hiển thị ở trạng thái active (do có quyền `shiten.delete`)
・DataScope giới hạn record thuộc các JA của trung ương sở thuộc

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

## ACSMS-TC-006-004 — Cho phép JA_HONTEN xem màn hình tìm kiếm chi tiết Master Chi nhánh

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update` / `shiten.delete`

### 手順

ステップ1：
Click "支店マスタ" trên sidebar, mở URL `/shiten`

ステップ2：
Dùng DevTools gọi trực tiếp GET `/api/v1/shiten`, kiểm tra response

ステップ3：
Kiểm tra toàn bộ `data[].ja_id` trong response JSON

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị, form search và danh sách chi nhánh được render

ステップ2：
Trả về HTTP 200, response body chứa mảng `data` và object `meta`

ステップ3：
Toàn bộ `ja_id` của các record khớp với JA mà user login thuộc về (ja-001) (DataScope được áp dụng)

補足：
・Button "新規登録" hiển thị ở trạng thái active
・Link "削除" tại cột thao tác hiển thị ở trạng thái active
・Chỉ hiển thị record chi nhánh của JA hiện tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-005 — Cho phép JA_KANRI_SHITEN xem màn hình tìm kiếm chi tiết Master Chi nhánh

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update` / `shiten.delete`

### 手順

ステップ1：
Click "支店マスタ" trên sidebar, mở URL `/shiten`

ステップ2：
Dùng DevTools gọi trực tiếp GET `/api/v1/shiten`

ステップ3：
Truy cập trực tiếp URL `/shiten/1/edit`

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị, danh sách chi nhánh của JA hiện tại (ja-001) được render

ステップ2：
Trả về HTTP 200, toàn bộ `ja_id` của các record khớp với JA mà user login thuộc về

ステップ3：
Chuyển về màn hình chỉnh sửa Master Chi nhánh (do có quyền `shiten.update`)

補足：
・JA_KANRI_SHITEN cũng có thể tham chiếu / chỉnh sửa / xóa record của JA hiện tại
・DataScope áp dụng theo `ja_id` (không theo `kanri_shiten_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-006-006 — Layout tổng thể màn hình list khớp thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080
  - ・Có sẵn ≥3 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Click "支店マスタ" trên sidebar, mở `/shiten`

ステップ2：
So sánh song song màn hình với tài liệu thiết kế (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí của breadcrumb, form search, table list, pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Background color, font, font size, padding / margin, button color, style ô input đều khớp với tài liệu thiết kế

ステップ3：
Bố cục giống như tài liệu thiết kế

補足：
・Không phát sinh khác biệt thị giác so với tài liệu thiết kế
・Design token (design-tokens.ts) được áp dụng, không tồn tại color hardcode

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-007 — Cấu trúc column của table list khớp thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥3 record chi nhánh

### 手順

ステップ1：
Mở `/shiten`, kiểm tra header của table list

ステップ2：
Kiểm tra tên column và canh chỉnh theo thứ tự từ trái sang (支店コード / 支店名 / 支店カナ / 金融機関支店フラグ / 操作)

ステップ3：
Kiểm tra hiển thị của icon sort

### 期待結果

ステップ1：
Table list được hiển thị

ステップ2：
Theo §画面項目定義 của tài liệu thiết kế, hiển thị 5 column từ trái sang là "支店コード" / "支店名" / "支店カナ" / "金融機関支店フラグ" / "操作"; "金融機関支店フラグ" và "操作" canh giữa, các column khác canh trái

ステップ3：
Icon sort hiển thị tại 2 column "支店コード" và "支店名"; các column khác không hiển thị icon sort

補足：
・"金融機関支店フラグ" chỉ hiển thị icon check khi giá trị true
・Cell "支店コード" hiển thị dưới dạng link chuyển sang màn hình chỉnh sửa

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-008 — Layout form search khớp thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Mở `/shiten`, kiểm tra khu vực form search

ステップ2：
Kiểm tra label, ô input, placeholder của 支店名

ステップ3：
Kiểm tra vị trí và màu của button "検索" và "検索クリア"

### 期待結果

ステップ1：
Form search được hiển thị

ステップ2：
Item "支店名" được hiển thị, ô input là textbox, có hiển thị icon clear của `allow-clear`

ステップ3：
Button "検索" hiển thị màu primary (xanh) ở trạng thái active, button "検索クリア" hiển thị màu secondary ở trạng thái active

補足：
・Item 支店名 được bố trí với độ rộng 1 cell bên trái của grid 4 column (theo §画面イメージ của tài liệu thiết kế)
・Item 支店名 sắp xếp label + textbox theo chiều ngang với `gap-2`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-009 — Hiển thị message trạng thái rỗng khi search ra 0 kết quả

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Không có record chi nhánh nào khớp điều kiện

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Nhập `ZZZZ存在しない支店` (giá trị không tồn tại) vào item search "支店名"

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Giá trị `ZZZZ存在しない支店` được nhập vào 支店名

ステップ3：
Hiển thị 0 kết quả search, hiển thị `検索結果が見つかりませんでした。` trên màn hình

補足：
・Pagination của table list hiển thị "全 0 件"
・API trả về 200 với `data: [], meta.total: 0`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-010 — Responsive — Breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Sử dụng được Chrome DevTools device emulator

### 手順

ステップ1：
Hiển thị `/shiten` ở độ phân giải PC (1920×1080)

ステップ2：
Chuyển sang độ phân giải tablet (768×1024, iPad dọc)

ステップ3：
Chuyển sang độ phân giải mobile (375×667, iPhone SE)

ステップ4：
Kiểm tra hiển thị form search, table list, pagination ở mỗi độ phân giải

### 期待結果

ステップ1：
Hiển thị theo layout PC, form search hiển thị nằm ngang

ステップ2：
Chuyển sang layout tablet

ステップ3：
Chuyển sang layout mobile, table list hiển thị scroll ngang

ステップ4：
Không vỡ layout, mọi thao tác đều thực hiện được

補足：
・Sidebar chuyển thành hamburger menu ở tablet trở xuống
・Cột cố định không bị vỡ khi table scroll ngang

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-011 — Chuyển focus bằng thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Nhấn phím Tab liên tục, kiểm tra thứ tự chuyển focus

ステップ3：
Kiểm tra chuyển focus theo chiều ngược lại bằng Shift+Tab

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Focus chuyển theo thứ tự 支店名 → button 検索 → button 検索クリア → button 新規登録 → header sort → link 削除

ステップ3：
Focus chuyển theo chiều ngược lại

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

## ACSMS-TC-006-012 — Kiểm soát hiển thị button "新規登録" / "削除" theo role

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `shiten.create` và `shiten.delete`)
  - ・Có sẵn ≥1 record chi nhánh

### 手順

ステップ1：
Login bằng JA_HONTEN, mở `/shiten`, kiểm tra trạng thái active của button "新規登録" và "削除"

ステップ2：
(Giả định tương lai) Login lại bằng role chỉ có quyền view, kiểm tra cùng màn hình

### 期待結果

ステップ1：
Button "新規登録" hiển thị ở trạng thái active, link "削除" tại cột thao tác hiển thị ở trạng thái active

ステップ2：
Button "新規登録" hiển thị ở trạng thái disable (do không có quyền `shiten.create`), link "削除" tại cột thao tác hiển thị ở trạng thái disable

補足：
・Button hiển thị disable thay vì ẩn (theo UX convention: vẫn cho thấy tính năng tồn tại, nhưng truyền tải rằng role hiện tại không dùng được)
・Cell "支店コード" hiển thị dưới dạng link chuyển sang màn hình chỉnh sửa (khi có quyền `shiten.update`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

ステップ2 là case giả định khi tương lai có thêm sub-role chỉ tham chiếu. Hiện tại seed quyền, CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN đều giữ đủ 4 quyền `shiten.*`.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-006-013 — Kiểm soát chuyển trang của breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login

### 手順

ステップ1：
Mở `/shiten`, kiểm tra breadcrumb

ステップ2：
Click link "ホーム" trên breadcrumb

### 期待結果

ステップ1：
Breadcrumb hiển thị 2 cấp "ホーム > 支店マスタ明細検索画面", cấp cuối hiển thị dưới dạng text (không phải link)

ステップ2：
Chuyển về `/dashboard`

補足：
・Breadcrumb dựa trên định nghĩa §1.2 của tài liệu thiết kế (ホーム > マスタ管理 > 支店マスタ明細検索), nhưng để đơn giản hóa navigation thì rút gọn thành 2 cấp
・"マスタ管理" là khái niệm grouping của sidebar, không có trang chuyển độc lập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-014 — Highlight menu sidebar

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Từ dashboard click item "支店マスタ" trên sidebar

ステップ2：
Sau khi chuyển trang, kiểm tra item "支店マスタ" trên sidebar

ステップ3：
Click item menu khác trên sidebar (ví dụ "JAマスタ")

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Item "支店マスタ" trên sidebar hiển thị ở trạng thái active (thay đổi background color)

ステップ3：
Chuyển sang màn hình khác, highlight sidebar chuyển sang màn hình mới

補足：
・Trạng thái active của item được áp dụng bằng design token `bg-primary/10` và `text-primary`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-015 — Hiển thị tên user và thao tác logout

- 観点ID: VP-A-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login (tên account "日農 太郎")

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Kiểm tra khu vực hiển thị tên user ở góc trên bên phải của header

ステップ3：
Click icon user mở dropdown, click "ログアウト"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Tên user login được hiển thị (ví dụ: `日農 太郎`)

ステップ3：
Xử lý logout được thực hiện, chuyển về `/login`, khi truy cập trực tiếp `/shiten` lần nữa thì chuyển về màn hình login

補足：
・Sau khi logout, session Redis bị xóa, Cookie HTTP-only bị hết hạn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-006-016 — Hiển thị trạng thái khởi tạo của form search

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Kiểm tra giá trị mặc định và placeholder của item search

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Textbox "支店名" hiển thị trống, icon `allow-clear` được hiển thị

補足：
・Khi load lần đầu, thực hiện lấy toàn bộ record không có điều kiện search (trong DataScope)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-017 — Search partial match theo 支店名 — Normal

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn các chi nhánh "東京支店" / "東京北支店" / "横浜支店" thuộc JA hiện tại

### 手順

ステップ1：
Nhập `東京` vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra response và API request trên DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Chỉ hiển thị các record có 支店名 chứa `東京` ("東京支店" / "東京北支店")

ステップ3：
GET `/api/v1/shiten?shiten_name=東京&...` được gửi đi, Trả về HTTP 200, backend thực hiện search partial match bằng `ILIKE '%東京%'`

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

## ACSMS-TC-006-018 — 支店名 — Boundary 100 ký tự max

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Paste chuỗi full-width 100 ký tự vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Dùng DevTools gửi trực tiếp GET `/api/v1/shiten?shiten_name=(101 ký tự)`

### 期待結果

ステップ1：
Cho phép nhập đủ 100 ký tự

ステップ2：
Trả về HTTP 200

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `支店名は最大100文字で指定してください。`)

補足：
・Lỗi vượt quá số ký tự được phát hiện ở backend
・Có thể search trong phạm vi số ký tự cho phép nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-019 — 支店名 — Hành vi trim space đầu/cuối

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Nhập `  東京支店  ` (2 ký tự space half-width đầu và cuối) vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra nội dung hiển thị trong ô input

ステップ4：
Kiểm tra parameter API request được gửi đi trên DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên trạng

ステップ2：
Xử lý search được thực hiện

ステップ3：
Giá trị nhập được trim (hiển thị trong ô input chuyển thành `東京支店`)

ステップ4：
GET `/api/v1/shiten?shiten_name=東京支店&...` được gửi đi (không có space đầu/cuối)

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

## ACSMS-TC-006-020 — 支店名 — Nhập hỗn hợp half-width / full-width

- 観点ID: VP-B-09
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn các chi nhánh "ABC東京支店" / "123北海道支店" thuộc JA hiện tại

### 手順

ステップ1：
Nhập `ABC東京` (alphabet half-width + kanji full-width) vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Riêng lẻ, nhập `１２３` (số full-width) vào ô 支店名

ステップ4：
Click button "検索"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
"ABC東京支店" được hiển thị

ステップ3：
Giá trị nhập được phản ánh

ステップ4：
Số full-width `１２３` thực hiện search phân biệt với half-width `123` (không tự chuyển đổi)

補足：
・Có thể nhập ký tự full-width
・Half-width / full-width không tự chuyển đổi, search match chính xác loại ký tự với giá trị đã đăng ký

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-021 — Hành vi button "検索クリア"

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Nhập `東京` vào 支店名

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
Xử lý được thực hiện, hiển thị toast `検索条件をクリアしました。` (ACSMS-MSG-006-002)

ステップ4：
Điều kiện search được clear (textbox 支店名 trống), điều kiện sort cũng quay về giá trị mặc định (shiten_code asc), thực hiện lấy lại toàn bộ record và hiển thị trang đầu tiên

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

## ACSMS-TC-006-022 — Nhập ký tự đặc biệt vào item search — Đối ứng SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Nhập `' OR '1'='1` vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Nhập `; DROP TABLE m_shiten; --` vào ô 支店名

ステップ4：
Click button "検索"

ステップ5：
Kiểm tra trạng thái DB: `SELECT COUNT(*) FROM m_shiten`

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
Table `m_shiten` không bị xóa, số lượng record không thay đổi

補足：
・Bằng parameterized query, ký tự đặc biệt không bị diễn dịch thành SQL injection (sử dụng `setParameters` của TypeORM)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-023 — Nhập ký tự đặc biệt vào item search — Đối ứng XSS

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Nhập `<script>alert(1)</script>` vào ô 支店名

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra hiển thị màn hình và console DevTools

### 期待結果

ステップ1：
Giá trị nhập được phản ánh nguyên trạng

ステップ2：
Hiển thị 0 kết quả search

ステップ3：
JavaScript không được thực thi, dialog `alert(1)` không được hiển thị, không có warning xuất ra console DevTools

補足：
・Auto-escape qua interpolation `{{ }}` của Vue đang hoạt động

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-006-024 — Hiển thị lần đầu — Lấy toàn bộ record không có điều kiện search (trong DataScope)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Có sẵn khoảng 30 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Kiểm tra API request được gửi đi trên DevTools

ステップ3：
Kiểm tra hiển thị của table list

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
GET `/api/v1/shiten?page=1&per_page=20&sort_by=shiten_code&sort_order=asc` được gửi đi

ステップ3：
20 record trang đầu hiển thị theo thứ tự 支店コード tăng dần, pagination hiển thị "全 30 件"

補足：
・Chỉ lấy record chi nhánh của JA hiện tại (ja-001) (DataScope được áp dụng)
・Không bao gồm record chi nhánh của JA khác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-025 — DataScope — Filter theo trung ương sở của CHUOKAI

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, quản lý ja-001 / ja-002)
  - ・Tồn tại record chi nhánh thuộc JA của trung ương sở khác (chuokai-002)

### 手順

ステップ1：
Login bằng CHUOKAI (chuokai-001), mở `/shiten`

ステップ2：
Kiểm tra `data[].ja_id` của response GET `/api/v1/shiten` trên DevTools

ステップ3：
Kiểm tra DB: `SELECT DISTINCT ja_id FROM m_shiten WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Toàn bộ `ja_id` trong response thuộc nhóm JA mà user login quản lý (thuộc chuokai-001)

ステップ3：
Trong DB có tồn tại record chi nhánh của các JA thuộc trung ương sở khác, nhưng không bao gồm trong API response

補足：
・Đảm bảo tính toàn vẹn dữ liệu
・DataScope được áp dụng chính xác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-026 — Sort — 支店コード tăng dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥10 record chi nhánh

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Click header column "支店コード" 1 lần

ステップ3：
Kiểm tra API request và thứ tự hiển thị

### 期待結果

ステップ1：
Trạng thái ban đầu (shiten_code asc) được hiển thị

ステップ2：
Icon sort chuyển sang ▲ (asc)

ステップ3：
GET `/api/v1/shiten?...&sort_by=shiten_code&sort_order=asc` được gửi đi, hiển thị sắp xếp theo 支店コード tăng dần

補足：
・Thứ tự sort chính xác
・Sort được áp dụng trong khi vẫn giữ điều kiện search hiện tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-027 — Sort — 支店コード giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥10 record chi nhánh

### 手順

ステップ1：
Click header column "支店コード" 1 lần (asc)

ステップ2：
Click header column "支店コード" 1 lần nữa (desc)

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (asc), hiển thị theo 支店コード tăng dần

ステップ2：
Icon sort chuyển sang ▼ (desc), GET `/api/v1/shiten?...&sort_by=shiten_code&sort_order=desc` được gửi đi, hiển thị sắp xếp theo 支店コード giảm dần

補足：
・Thứ tự sort chính xác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-028 — Sort — Hủy sort khi click lần thứ 3

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥10 record chi nhánh

### 手順

ステップ1：
Click header column "支店コード" 1 lần (asc)

ステップ2：
Click header column "支店コード" lần thứ 2 (desc)

ステップ3：
Click header column "支店コード" lần thứ 3 (hủy sort)

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (asc)

ステップ2：
Icon sort chuyển sang ▼ (desc)

ステップ3：
Icon sort bị ẩn, điều kiện sort quay về trạng thái ban đầu (shiten_code asc = DTO default)

補足：
・Quy tắc chuyển sort (asc → desc → không sort) được implement đúng theo §8.2 của tài liệu thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-029 — Sort — 支店名 tăng / giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Click header column "支店名" 1 lần

ステップ2：
Kiểm tra API request và thứ tự hiển thị

ステップ3：
Click header column "支店名" 1 lần nữa

### 期待結果

ステップ1：
Icon sort chuyển sang ▲ (asc)

ステップ2：
GET `/api/v1/shiten?...&sort_by=shiten_name&sort_order=asc` được gửi đi, hiển thị sắp xếp theo 支店名 tăng dần

ステップ3：
GET `/api/v1/shiten?...&sort_by=shiten_name&sort_order=desc` được gửi đi, hiển thị sắp xếp theo 支店名 giảm dần

補足：
・Thứ tự sort chính xác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-030 — Sort — Hành vi khi click column không hỗ trợ sort

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Click header column "支店カナ"

ステップ2：
Click header column "金融機関支店フラグ"

ステップ3：
Kiểm tra có phát sinh API request hay không trên DevTools

### 期待結果

ステップ1：
Icon sort không được hiển thị, hiển thị column không thay đổi

ステップ2：
Icon sort không được hiển thị

ステップ3：
Không phát sinh API request mới

補足：
・Theo §8.1 của tài liệu thiết kế, column hỗ trợ sort chỉ gồm "支店コード" và "支店名"
・支店カナ / 金融機関支店フラグ / 操作 không cho phép sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-031 — Sort — Từ chối sort_by ngoài allow-list của backend

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/shiten?sort_by=shiten_name_kana&sort_order=asc`

ステップ2：
Gửi trực tiếp GET `/api/v1/shiten?sort_by=biko;%20DROP%20TABLE&sort_order=asc`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `sort_byは shiten_code / shiten_name / kanri_shiten_name のいずれかで指定してください。`)

ステップ2：
Trả về HTTP 400 (cùng message)

補足：
・Bằng cơ chế allow-list, SQL injection vào `ORDER BY ${sort_by}` được ngăn chặn
・Giá trị cho phép là 3 giá trị `shiten_code` / `shiten_name` / `kanri_shiten_name`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-032 — Sort direction — Từ chối sort_order giá trị không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/shiten?sort_by=shiten_code&sort_order=ascending`

ステップ2：
Gửi GET `/api/v1/shiten?sort_by=shiten_code&sort_order=random`

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

## ACSMS-TC-006-033 — Pagination — Chuyển trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn 124 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Click button "2" trên pagination

ステップ3：
Kiểm tra API request trên DevTools

ステップ4：
Click button "Tiếp (>)"

### 期待結果

ステップ1：
Trang 1 (record 1-20) được hiển thị, pagination hiển thị "全 124 件"

ステップ2：
Trang 2 (record 21-40) được hiển thị, active của pagination chuyển sang "2"

ステップ3：
GET `/api/v1/shiten?...&page=2&per_page=20&...` được gửi đi

ステップ4：
Trang 3 (record 41-60) được hiển thị

補足：
・Điều kiện search / sort được giữ lại ngay cả khi chuyển trang

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-034 — Pagination — Đổi số lượng record hiển thị / trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn 124 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Mở dropdown cạnh pagination

ステップ2：
Kiểm tra các lựa chọn

ステップ3：
Chọn "50 / 頁"

ステップ4：
Chọn "100 / 頁"

### 期待結果

ステップ1：
Dropdown được mở ra

ステップ2：
Hiển thị 4 lựa chọn "10 / 頁" / "20 / 頁" / "50 / 頁" / "100 / 頁", lựa chọn ban đầu là "20 / 頁"

ステップ3：
GET `/api/v1/shiten?...&per_page=50&...` được gửi đi, hiển thị tối đa 50 record trên list, tổng số trang được tính lại

ステップ4：
GET `/api/v1/shiten?...&per_page=100&...` được gửi đi, hiển thị tối đa 100 record trên list

補足：
・Giới hạn trên của per_page là 100 record (DTO constraint)
・Tuân theo §6.1 của tài liệu thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-035 — Pagination — Từ chối khi per_page vượt giới hạn trên

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/shiten?page=1&per_page=101`

ステップ2：
Dùng DevTools gửi GET `/api/v1/shiten?page=1&per_page=0`

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

## ACSMS-TC-006-036 — Pagination — Từ chối khi page ≤ 0

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/shiten?page=0&per_page=20`

ステップ2：
Dùng DevTools gửi GET `/api/v1/shiten?page=-1&per_page=20`

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

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-037 — Giữ điều kiện search / sort giữa các trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥50 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Nhập `東京` vào 支店名, click "検索"

ステップ2：
Click column "支店コード" để sort giảm dần

ステップ3：
Click button "2" trên pagination

ステップ4：
Kiểm tra API request trên DevTools

### 期待結果

ステップ1：
Kết quả đã thu hẹp hiển thị ở trang 1

ステップ2：
Hiển thị sắp xếp theo 支店コード giảm dần

ステップ3：
Chuyển sang trang 2

ステップ4：
GET `/api/v1/shiten?shiten_name=東京&page=2&per_page=20&sort_by=shiten_code&sort_order=desc` được gửi đi

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

## ACSMS-TC-006-038 — Ẩn chi nhánh đã bị xóa

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có ≥1 chi nhánh đã bị xóa logical thuộc JA hiện tại (`deleted_at IS NOT NULL`)

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Search theo tên chi nhánh đã xóa

ステップ3：
Kiểm tra DB: `SELECT shiten_id, shiten_code, deleted_at FROM m_shiten WHERE deleted_at IS NOT NULL`

### 期待結果

ステップ1：
Trên list không hiển thị data đã xóa

ステップ2：
Khi nhập tên chi nhánh đã xóa, vẫn hiển thị 0 kết quả search (`検索結果が見つかりませんでした。`)

ステップ3：
Trong DB vẫn tồn tại record đã xóa (logical delete, không phải physical delete)

補足：
・Data đã xóa không được hiển thị
・SQL của backend áp dụng điều kiện `WHERE deleted_at IS NULL`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-006-039 — Lấy list — Normal

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Có sẵn 3 record chi nhánh thuộc JA hiện tại (東京支店 / 横浜支店 / 大宮支店)

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Kiểm tra response JSON của `/api/v1/shiten` trên Network tab của DevTools

ステップ3：
Đối chiếu các item trong response JSON với hiển thị màn hình

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Trả về HTTP 200, format response body là `{ data: [...], meta: { total, page, per_page, total_pages } }`

ステップ3：
Mỗi record chứa `shiten_id` / `ja_id` / `shiten_code` / `shiten_name` / `shiten_name_kana` / `kinyu_shiten_flg` / `kanri_shiten_id` / `kanri_shiten_name` / `biko` / `created_at` / `updated_at`; `kanri_shiten_name` là giá trị lấy được qua JOIN từ table `m_kanri_shiten`

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

## ACSMS-TC-006-040 — Click button "新規登録" — Chuyển sang màn hình đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có quyền `shiten.create`

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Click button "新規登録"

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Chuyển sang màn hình đăng ký Master Chi nhánh (`/shiten/create`), form hiển thị với giá trị khởi tạo trống

補足：
・Màn hình chuyển đến là ACSMS-SCR-007 (màn hình đăng ký Master Chi nhánh)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-041 — Click link 支店コード — Chuyển sang màn hình chỉnh sửa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã đăng ký 支店コード `T-001` (shiten_id = 1)
  - ・Có quyền `shiten.update`

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Click link `T-001` tại cell 支店コード của list

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Chuyển sang màn hình chỉnh sửa Master Chi nhánh (`/shiten/1/edit`), giá trị hiện có được hiển thị trong form

補足：
・Màn hình chuyển đến là chế độ chỉnh sửa của ACSMS-SCR-007 (màn hình đăng ký Master Chi nhánh)
・Các field có thể chỉnh sửa gồm "支店コード" / "支店名" / "支店カナ" (§1.1 ※ của tài liệu thiết kế)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-042 — Click button xóa — Hiển thị dialog xác nhận

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa "削除対象支店" (shiten_id = 5) đã đăng ký, không có related data
  - ・Có quyền `shiten.delete`

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Click link "削除" tại cột thao tác của record đích

ステップ3：
Kiểm tra nội dung dialog hiển thị

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Hiển thị dialog confirm xóa

ステップ3：
Nội dung dialog hiển thị `この支店を削除してもよろしいですか？` (ACSMS-MSG-006-005), title dialog "削除確認", các button "はい" / "いいえ" được hiển thị, button "はい" là danger (màu đỏ)

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

## ACSMS-TC-006-043 — Thực hiện xóa — Click "はい" — Logical delete + reload list

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa (shiten_id = 5) đã đăng ký, không có related data
  - ・Có quyền `shiten.delete`

### 手順

ステップ1：
Click link "削除", hiển thị dialog xác nhận

ステップ2：
Click button "はい" trên dialog

ステップ3：
Kiểm tra DB: `SELECT shiten_id, deleted_at, updated_by FROM m_shiten WHERE shiten_id = 5`

ステップ4：
Kiểm tra DB: `SELECT log_type, operation, target_id, target_table, result_status, before_value FROM t_log WHERE target_id = 5 AND target_table = 'm_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
DELETE `/api/v1/shiten/5` được gửi đi, Trả về HTTP 200, hiển thị toast `支店を削除しました。` (ACSMS-MSG-006-007), list được lấy lại và record tương ứng bị ẩn

ステップ3：
Data được xóa logical (`deleted_at IS NOT NULL`, `updated_by` là `account_id` của test account)

ステップ4：
Audit log được record (`log_type = 1`, `operation = 'DELETE'`, `target_id = 5`, `target_table = 'm_shiten'`, `result_status = 1`, `before_value` chứa JSON data trước khi xóa)

補足：
・Data bị xóa (logical delete)
・Transaction được commit
・Xử lý business + audit log được thực hiện trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Trong api.md エラー一覧 (success message chung) là `削除しました。` (chỉ động từ). screen-design.md ACSMS-MSG-006-007 là `支店を削除しました。` (có chủ ngữ). Theo quy ước thống nhất của project, toast FE dùng `useNotify().deleted()` hiển thị `削除しました。`. Test case này ghi nhận literal canonical làm kết quả kỳ vọng.

## ACSMS-TC-006-044 — Hủy xóa — Click "いいえ"

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa (shiten_id = 5) đã đăng ký

### 手順

ステップ1：
Click link "削除", hiển thị dialog xác nhận

ステップ2：
Click button "いいえ" trên dialog

ステップ3：
Kiểm tra có phát sinh API request hay không trên DevTools

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM m_shiten WHERE shiten_id = 5`

### 期待結果

ステップ1：
Dialog được hiển thị

ステップ2：
Dialog được đóng, hiển thị list không thay đổi

ステップ3：
Không phát sinh DELETE request

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

## ACSMS-TC-006-045 — Xóa — Lỗi 409 khi có related data (購読者)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa (shiten_id = 6) có ≥1 record purchaser liên quan (`t_dokusya.shiten_id = 6`)

### 手順

ステップ1：
Click link "削除", click "はい" trên dialog xác nhận

ステップ2：
Kiểm tra response và trạng thái DB

### 期待結果

ステップ1：
DELETE `/api/v1/shiten/6` được gửi đi

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`, message màn hình là ACSMS-MSG-006-006 `この支店は関連オブジェクトに紐づいているため削除できません。` được hiển thị qua toast), record đích của `m_shiten` vẫn giữ `deleted_at IS NULL`

補足：
・Related data không bị xóa
・Xử lý xóa được rollback
・Tham chiếu của purchaser (t_dokusya.shiten_id) là yếu tố cản trở xóa chi nhánh

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Trong api.md エラー一覧 (chung) là `関連データが存在するため削除できません。`, message màn hình ACSMS-MSG-006-006 là `この支店は関連オブジェクトに紐づいているため削除できません。`. Phía implement trả về theo literal canonical của api.md.

## ACSMS-TC-006-046 — Xóa — Lỗi 404 với ID không tồn tại

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/shiten/99999` (ID không tồn tại)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された支店が見つかりません。`)

補足：
・Target data không tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-047 — Xóa — Lỗi 404 với ID đã bị xóa (race xóa đồng thời)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh (shiten_id = 8) đã đăng ký

### 手順

ステップ1：
Mở màn hình list trên browser A

ステップ2：
Trên browser B xóa cùng chi nhánh (shiten_id = 8)

ステップ3：
Trên browser A click link "削除" của cùng chi nhánh, click "はい"

### 期待結果

ステップ1：
List được hiển thị

ステップ2：
Browser B xóa thành công

ステップ3：
Với DELETE `/api/v1/shiten/8` gửi từ browser A, Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された支店が見つかりません。`)

補足：
・Không phát sinh bất đồng bộ dữ liệu
・Khi race xóa đồng thời, request gửi sau cùng sẽ thành 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-048 — Vi phạm DataScope — Thử xóa chi nhánh của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Tồn tại chi nhánh (shiten_id = 50) thuộc JA khác (ja-002)

### 手順

ステップ1：
Login bằng JA_HONTEN (ja-001)

ステップ2：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/shiten/50` (shiten_id của JA khác)

### 期待結果

ステップ1：
Login thành công

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された支店が見つかりません。`, vì lý do che giấu sự tồn tại nên trả 404 thay vì 403)

補足：
・Data của JA khác được đối xử như không tồn tại
・Access trực tiếp URL thì lỗi
・DataScope được áp dụng tại backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-049 — Audit log được record khi lỗi xóa

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa (shiten_id = 9) có related data

### 手順

ステップ1：
Click link "削除", click "はい"

ステップ2：
Kiểm tra DB: `SELECT log_type, operation, result_status, error_message FROM t_log WHERE target_id = 9 AND target_table = 'm_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 409

ステップ2：
Error log được record (`log_type = 3`, `operation = 'DELETE'`, `result_status = 2`, `error_message` chứa chi tiết lỗi)

補足：
・Output error log
・Error log được record ngoài transaction, vẫn còn lại sau khi rollback business

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-050 — Kiểm tra tính đầy đủ của audit log

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Chi nhánh cần xóa (shiten_id = 10) đã đăng ký, không có related data

### 手順

ステップ1：
Thực hiện xóa (click link "削除" → "はい")

ステップ2：
Kiểm tra DB: `SELECT log_type, log_datetime, account_id, gamen_name, operation, result_status, target_id, target_table, before_value, after_value, ip_address, user_agent FROM t_log WHERE target_id = 10 AND target_table = 'm_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Xử lý xóa thành công

ステップ2：
Audit log được record, mỗi column có giá trị như sau:
・log_type = 1 (user_operation)
・gamen_name = `支店マスタ明細検索画面 (ACSMS-SCR-006)`
・operation = `DELETE`
・result_status = 1 (success)
・target_id = 10
・target_table = `m_shiten`
・before_value chứa JSON data trước khi xóa (không bao gồm thông tin nhạy cảm như password)
・after_value là chuỗi rỗng
・ip_address / user_agent được record với giá trị nguồn của request

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

## ACSMS-TC-006-051 — Xử lý 401 khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login, session tồn tại
  - ・Có thể vô hiệu hóa cưỡng bức session Redis bằng tool admin, hoặc test sau khi đã quá 24 giờ

### 手順

ステップ1：
Để nguyên trạng thái mở `/shiten`, vô hiệu hóa cưỡng bức session

ステップ2：
Click button "検索"

ステップ3：
Kiểm tra chuyển trang và hành vi sau khi re-login

### 期待結果

ステップ1：
Màn hình vẫn được hiển thị nguyên trạng

ステップ2：
Với GET `/api/v1/shiten`, Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Chuyển sang `/login?redirect=/shiten`, sau khi re-login quay về URL gốc `/shiten`

補足：
・Session hết hạn thì chuyển login
・`user` trong Pinia store được khởi tạo lại thành null

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-052 — Request parameter không hợp lệ — BAD_REQUEST

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/shiten?page=abc&per_page=xyz`

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`, message `リクエストパラメータが不正です。`, hoặc message chi tiết `pageは整数で指定してください。` / `per_pageは整数で指定してください。`)

補足：
・Parameter không hợp lệ thì lỗi
・Trường hợp validation error, mảng `errors` chứa lỗi theo từng item

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-053 — Validation error — Cấu trúc mảng VALIDATION_ERROR

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/shiten?shiten_name=(101 ký tự)&per_page=999` (vi phạm nhiều item đồng thời)

ステップ2：
Kiểm tra response JSON

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 400, response body có format `{ error_code: 'VALIDATION_ERROR', message: '入力値が不正です。詳細はerrorsフィールドを確認してください。', errors: [{ field, message }, ...] }`, mảng `errors` chứa cả message vi phạm của `shiten_name` và `per_page`

補足：
・Response dạng JSON
・Message theo từng item vi phạm validation được trả về

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-054 — Vi phạm DataScope — DATA_SCOPE_VIOLATION chung

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Tồn tại chi nhánh (shiten_id = 50) thuộc JA khác (ja-002)

### 手順

ステップ1：
Login bằng JA_HONTEN (ja-001)

ステップ2：
Dùng DevTools gửi DELETE `/api/v1/shiten/50` (shiten_id của JA khác)

### 期待結果

ステップ1：
Login thành công

ステップ2：
Trả về HTTP 404 hoặc 403 (`error_code: NOT_FOUND` hoặc `DATA_SCOPE_VIOLATION`, message `指定された支店が見つかりません。` hoặc `このデータへのアクセス権限がありません。`)

補足：
・Ưu tiên trả về 404 vì lý do che giấu sự tồn tại (theo api.md §4.3)
・DATA_SCOPE_VIOLATION là code chung dùng cho lỗi scope rõ ràng (ví dụ parameter không hợp lệ trong khi listing)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Trong api.md エラー一覧 共通 #4 có định nghĩa DATA_SCOPE_VIOLATION (HTTP 403), nhưng API xóa của màn hình này ưu tiên trả NOT_FOUND (404) vì lý do che giấu sự tồn tại (api.md §4.3). Test case này định vị là case lẫn lộn của 2 error code.

## ACSMS-TC-006-055 — Vượt rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Rate limit: 100 request trong 60 giây thì 429

### 手順

ステップ1：
Dùng DevTools hoặc script gửi hơn 100 request đến `/api/v1/shiten` trong 60 giây

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request liên tục được gửi đi

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

補足：
・Rate limit hoạt động
・Frontend hiển thị message qua toast

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-056 — Server error — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Giả lập DB connection error tại server (dừng DB / cắt network)

### 手順

ステップ1：
Giả lập gây ra DB connection error

ステップ2：
Mở `/shiten`, hoặc click button "検索"

ステップ3：
Kiểm tra response và hiển thị toast

### 期待結果

ステップ1：
Vào trạng thái DB connection error

ステップ2：
Với GET `/api/v1/shiten`, Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`, ACSMS-MSG-006-004)

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

## ACSMS-TC-006-057 — Xử lý khi mất kết nối network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Chọn "Offline" trên Network tab của DevTools (cắt network)

ステップ3：
Click button "検索"

ステップ4：
Kiểm tra trạng thái request trên Network tab của DevTools

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Vào trạng thái cắt network

ステップ3：
Request thất bại, hiển thị toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` hoặc message tương đương

ステップ4：
Sau khi network được kết nối lại, search lại lấy data bình thường

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

Literal toast khi mất kết nối network là giá trị mặc định của axios interceptor (network error). Chưa được làm rõ trong spec, ghi nhận TBD.

## ACSMS-TC-006-058 — Kiểm tra cờ bảo mật Cookie

- 観点ID: VP-A-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Môi trường production / staging (HTTPS)

### 手順

ステップ1：
Truy cập `/shiten`

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
`session_id` không hiển thị trong `document.cookie` (do HttpOnly)

補足：
・Bắt buộc token auth
・Các cờ chuẩn để ngăn rò rỉ session ID được set

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-006-059 — Gọi API trực tiếp không có authentication

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái chưa login (đã xóa Cookie)

### 手順

ステップ1：
Xóa toàn bộ Cookie của browser

ステップ2：
Dùng DevTools hoặc curl gửi trực tiếp GET `/api/v1/shiten`

ステップ3：
Gửi trực tiếp DELETE `/api/v1/shiten/1`

### 期待結果

ステップ1：
Cookie được xóa

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

## ACSMS-TC-006-060 — Hiệu năng hiển thị data lớn

- 観点ID: VP-F-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Có sẵn ≥5000 record chi nhánh thuộc JA hiện tại

### 手順

ステップ1：
Mở `/shiten`

ステップ2：
Đo response time của GET `/api/v1/shiten` trên Network tab của DevTools

ステップ3：
Chuyển đến trang cuối qua pagination

### 期待結果

ステップ1：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị

ステップ2：
Response dưới 3 giây, `meta.total: 5000` trở lên

ステップ3：
Trang cuối được hiển thị trong vòng 3 giây

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
