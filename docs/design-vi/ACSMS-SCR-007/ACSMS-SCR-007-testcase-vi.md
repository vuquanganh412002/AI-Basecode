---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-007
screen_name: 支店マスタ登録画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình đăng ký Master Chi nhánh (ACSMS-SCR-007)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).


## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-007 | Tài liệu thiết kế Màn hình đăng ký Master Chi nhánh |
| 2 | ACSMS-SCR-007-api | Tài liệu thiết kế API đăng ký Master Chi nhánh |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 4 |
| 4 | Validation đầu vào — Màn đăng ký | 21 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 9 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 8 |
|  | Tổng | 61 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-007-001 — Cấm truy cập màn đăng ký Master Chi nhánh bởi NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `shiten.view` / `shiten.create` / `shiten.update` (tham khảo ma trận seeder.md §3)

### 手順

ステップ1：
Mở dashboard, kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Nhập `/shiten/create` vào address bar trình duyệt, truy cập trực tiếp

ステップ3：
Từ Console DevTools gửi POST `/api/v1/shiten` với request body hợp lệ

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Item "支店マスタ" không được hiển thị trên sidebar (do không có quyền `shiten.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log được ghi, `account_id` khớp với test account, không có row mới được thêm vào `m_shiten`

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block truy cập
・Theo ma trận seeder.md §3, Master Chi nhánh chỉ CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN thao tác được. NICHINO_ADMIN không thuộc đối tượng.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

## ACSMS-TC-007-002 — Cấm truy cập màn đăng ký Master Chi nhánh bởi NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `shiten.view` / `shiten.create`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Nhập `/shiten/create` vào address bar trình duyệt, truy cập trực tiếp

ステップ3：
Từ Console DevTools gửi POST `/api/v1/shiten` với request body hợp lệ

### 期待結果

ステップ1：
Item "支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo ma trận seeder.md §3, Master Chi nhánh chỉ CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN thao tác được. NICHINO_STAFF không thuộc đối tượng.
・Không thay đổi DB, có ghi error log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-003 — Truy cập màn đăng ký Master Chi nhánh bởi CHUOKAI (Normal)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Click item "支店マスタ", mở màn list `/shiten`

ステップ3：
Click button "新規登録", mở màn `/shiten/create`

ステップ4：
Dùng DevTools gửi POST `/api/v1/shiten` với request body hợp lệ

### 期待結果

ステップ1：
Item "支店マスタ" được hiển thị trên sidebar

ステップ2：
Màn hình tìm kiếm chi tiết Master Chi nhánh được hiển thị (hiển thị record chi nhánh JA dưới chuokai của mình)

ステップ3：
Màn đăng ký Master Chi nhánh được hiển thị (form ở trạng thái có thể nhập)

ステップ4：
Trả về HTTP 201 (`message: 登録しました。`, thêm 1 row vào `m_shiten`)

補足：
・CHUOKAI có thể xem/đăng ký/cập nhật Master Chi nhánh thuộc chuokai của mình
・Data scope bị giới hạn ở JA thuộc chuokai của mình (kiểm soát ở tầng DataScope)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-004 — Truy cập màn đăng ký Master Chi nhánh bởi JA_HONTEN (Normal)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update`

### 手順

ステップ1：
Kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Mở màn `/shiten/create` từ button "新規登録"

ステップ3：
Truy cập trực tiếp `/shiten/1/edit` (record của JA của mình)

ステップ4：
Dùng DevTools gửi PUT `/api/v1/shiten/1` với request body hợp lệ

### 期待結果

ステップ1：
Item "支店マスタ" được hiển thị trên sidebar

ステップ2：
Màn đăng ký Master Chi nhánh được hiển thị (form ở trạng thái có thể nhập)

ステップ3：
Màn cập nhật Master Chi nhánh được hiển thị (giá trị hiện có được phản ánh vào form)

ステップ4：
Trả về HTTP 200 (`message: 更新しました。`, record đối tượng trong `m_shiten` được update)

補足：
・JA_HONTEN có thể xem/đăng ký/cập nhật Master Chi nhánh thuộc JA của mình
・Data scope bị giới hạn ở phạm vi JA của mình

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-005 — Truy cập màn đăng ký Master Chi nhánh bởi JA_KANRI_SHITEN (Normal)

- 観点ID: VP-A-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri_shiten-001)
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `shiten.view` / `shiten.create` / `shiten.update`

### 手順

ステップ1：
Kiểm tra item "支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/shiten/create`

ステップ3：
Truy cập trực tiếp ID record chi nhánh của JA khác (ví dụ `/shiten/999/edit`)

ステップ4：
Gọi trực tiếp GET `/api/v1/shiten/999` từ DevTools

### 期待結果

ステップ1：
Item "支店マスタ" được hiển thị trên sidebar

ステップ2：
Màn đăng ký Master Chi nhánh được hiển thị

ステップ3：
Trả về HTTP 403 hoặc 404, form không được hiển thị, chuyển về `/dashboard` hoặc `/shiten`

ステップ4：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・JA_KANRI_SHITEN có thể xem/đăng ký/cập nhật Master Chi nhánh thuộc JA của mình
・Tấn công truy cập trực tiếp qua URL cũng bị BE DataScope guard block (4.3 §khi ja_id không khớp trả 403)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-007-006 — Layout tổng thể của màn đăng ký khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Trình duyệt: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click "支店マスタ" → button "新規登録"

ステップ2：
So sánh tài liệu thiết kế (screen-design.md / index.html) với màn hình bên cạnh

ステップ3：
Kiểm tra vị trí từng element (title bar, bố trí form, bố trí button)

### 期待結果

ステップ1：
Màn `/shiten/create` được hiển thị

ステップ2：
Màu nền, font, font size, padding/margin, màu button, style ô nhập đều khớp toàn bộ

ステップ3：
Hiển thị theo đúng thiết kế (title "支店情報入力", button 登録 / 前の画面に戻る căn trái phía dưới)

補足：
・Không có khác biệt thị giác so với tài liệu thiết kế
・design tokens (`design-tokens.ts`) được áp dụng (không có hardcode màu)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-007 — Layout tổng thể của màn cập nhật khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Record chi nhánh hiện có `shiten_id = 1` tồn tại thuộc JA của mình

### 手順

ステップ1：
Click cột mã chi nhánh của record hiện có trên màn list

ステップ2：
So sánh với tài liệu thiết kế

### 期待結果

ステップ1：
Màn `/shiten/1/edit` được hiển thị, giá trị hiện có được hiển thị trên form

ステップ2：
Cùng layout với màn đăng ký + trạng thái disable hợp lý (mã chi nhánh bị disable, marker bắt buộc `*` ẩn cạnh label mã chi nhánh)

補足：
・Màn cập nhật có tính nhất quán thị giác tương đương màn đăng ký
・Mã chi nhánh bị disable ở chế độ edit qua `:disabled="isEdit"`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-008 — Responsive — breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Set kích thước cửa sổ 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar fixed, form được hiển thị theo layout 3 cột (管理支店 / 金融機関支店フラグ, 支店コード / 支店名 / 支店名カナ)

ステップ2：
Sidebar thu gọn, layout form được giữ nguyên

ステップ3：
Sidebar hiển thị dạng overlay, các element form xếp dọc, không xuất hiện horizontal scroll

補足：
・Không vỡ layout ở cả 3 breakpoint, không xuất hiện horizontal scroll
・Toàn bộ element form đều thao tác được

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

## ACSMS-TC-007-009 — Hiển thị các element form — textbox / dropdown / checkbox / button

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Kiểm tra placeholder, format, trạng thái (active / focus / disable) của từng textbox (支店コード / 支店名 / 支店名カナ / 備考)

ステップ2：
Kiểm tra hiển thị dropdown 管理支店 và checkbox 金融機関支店フラグ

ステップ3：
Kiểm tra kích thước, vị trí, màu của button 登録 / 前の画面に戻る

### 期待結果

ステップ1：
Theo đúng thiết kế — placeholder "支店コードを入力してください", "支店名を入力してください", màu khung đổi khi focus, hiển thị xám khi disable

ステップ2：
管理支店 là dropdown có placeholder "選択してください", danh sách 管理支店 thuộc JA của mình được hiển thị làm lựa chọn qua ACSMS-API-COMMON-004, 金融機関支店フラグ hiển thị ở trạng thái chưa check

ステップ3：
Theo đúng thiết kế. Button 登録 là button chính (xanh), button 戻る là button phụ (trắng) căn trái

補足：
・Toàn bộ element form khớp hoàn toàn với tài liệu thiết kế
・備考 được hiển thị dạng text area 4 dòng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-010 — Thứ tự Tab và thao tác bàn phím (Tab / Enter)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký, focus ở body

### 手順

ステップ1：
Nhấn phím Tab liên tục, kiểm tra dịch chuyển focus

ステップ2：
Trong textbox nhấn phím Enter

ステップ3：
Thao tác double click / nhấn liên tục button 登録

### 期待結果

ステップ1：
Theo thứ tự trên xuống dưới, trái sang phải — 管理支店 → 金融機関支店フラグ → 支店コード → 支店名 → 支店名カナ → 備考 → button 登録 → button 前の画面に戻る

ステップ2：
Form submit không được trigger (utility `preventEnterImplicitSubmit` chặn implicit submit qua Enter)

ステップ3：
Submit bắt đầu ở lần nhấn đầu tiên, button hiển thị ở trạng thái disable trong khi đang submit, các lần nhấn từ lần thứ 2 trở đi bị ignore, chỉ 1 record được đăng ký vào DB

補足：
・Thứ tự tab theo đúng thiết kế, có thể thao tác toàn bộ bằng bàn phím
・Theo vue.md §Block Enter implicit submit, form CRUD trên 4 mục chặn implicit submit qua Enter

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chống submit 2 lần — disable button trong khi đang submit là yếu tố then chốt của chất lượng UX.

## ACSMS-TC-007-011 — Kiểm tra giá trị mặc định khi mở màn đăng ký lần đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Vừa mở màn đăng ký

### 手順

ステップ1：
Kiểm tra dropdown 管理支店

ステップ2：
Kiểm tra từng ô text 支店コード / 支店名 / 支店名カナ / 備考

ステップ3：
Kiểm tra trạng thái check của 金融機関支店フラグ

### 期待結果

ステップ1：
Chưa chọn (hiển thị placeholder "選択してください")

ステップ2：
Toàn bộ mục được hiển thị ở trạng thái trống

ステップ3：
Hiển thị ở trạng thái chưa check (giá trị mặc định false)

補足：
・Tuân thủ hoàn toàn spec giá trị mặc định ở screen-design.md §1.1 (toàn bộ mục trống)
・Khớp với api.md §request param "`kinyu_shiten_flg` mặc định: false"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-007-012 — Hiển thị title header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký hoặc màn cập nhật

### 手順

ステップ1：
Kiểm tra header bên trái phía trên màn hình (chế độ đăng ký)

ステップ2：
Kiểm tra header tương tự ở chế độ cập nhật

### 期待結果

ステップ1：
Chữ "支店マスタ登録画面" được hiển thị

ステップ2：
Chữ "支店マスタ編集画面" được hiển thị (theo phần tử cuối của mảng meta.breadcrumb trong router.ts)

補足：
・Chuỗi title được hiển thị theo đúng literal trong spec
・Title thay đổi theo chế độ đăng ký / cập nhật

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-013 — Hiển thị icon thông báo + user menu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Kiểm tra header bên phải

ステップ2：
Mouse over lên user icon

ステップ3：
Click user icon

### 期待結果

ステップ1：
Hiển thị theo thứ tự icon thông báo → user icon → tên login

ステップ2：
Khi hover, màu nền đổi

ステップ3：
Dropdown được mở ra, hiển thị menu Logout v.v.

補足：
・Toàn bộ tương tác hover / click hoạt động theo đúng thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-014 — Hiển thị breadcrumb (màn đăng ký / màn cập nhật)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký hoặc màn cập nhật

### 手順

ステップ1：
Kiểm tra vùng breadcrumb dưới title của màn đăng ký

ステップ2：
Kiểm tra vùng breadcrumb của màn cập nhật

ステップ3：
So sánh cấp bậc breadcrumb với tài liệu thiết kế

### 期待結果

ステップ1：
Cấp bậc `ホーム / 支店マスタ明細検索 / 支店マスタ登録画面` được hiển thị

ステップ2：
Cấp bậc `ホーム / 支店マスタ明細検索 / 支店マスタ編集画面` được hiển thị

ステップ3：
Ký tự phân tách, text, có/không có link đều khớp ("支店マスタ明細検索" ở giữa là link click được, màn hiện tại hiển thị không có link)

補足：
・Breadcrumb được hiển thị đúng cấp bậc + theo đúng thiết kế
・Theo vue.md §Project breadcrumb convention, cấu thành 3 cấp (ホーム → 一覧 → 登録 / 編集)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-015 — Hành vi chuyển trang của từng link breadcrumb

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Click "ホーム" trên breadcrumb

ステップ2：
Quay lại màn đăng ký, click "支店マスタ明細検索"

ステップ3：
Quay lại màn đăng ký, click "支店マスタ登録画面" (màn hiện tại)

### 期待結果

ステップ1：
Chuyển về `/dashboard`

ステップ2：
Chuyển về màn list `/shiten`

ステップ3：
Vì là màn hiện tại nên không có gì xảy ra (không reload lại)

補足：
・Mỗi link hoạt động đúng kỳ vọng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Validation đầu vào — Màn đăng ký

## ACSMS-TC-007-016 — Check bắt buộc 管理支店

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các mục khác ngoài 管理支店 đã nhập giá trị hợp lệ
  - ・Test data: 支店コード `001`, 支店名 `テスト支店`

### 手順

ステップ1：
Để dropdown 管理支店 chưa chọn, click button 登録

ステップ2：
Chọn dropdown 管理支店 rồi nhấn × để clear, click button 登録

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới mục, submit bị chặn

ステップ2：
Hiển thị `必須項目です。` ngay dưới mục (giá trị `undefined` của antd `<a-select allow-clear>` khi clear được check bắt buộc qua Number)

補足：
・Giá trị `undefined` của antd `<a-select allow-clear>` khi clear được xử lý đúng dưới dạng lỗi required
・FE `validateClient` check bắt buộc qua `!form.kanri_shiten_id || form.kanri_shiten_id === 0`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-017 — Check bắt buộc 支店コード (ô trống + ký tự space)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 支店コード trống, click button 登録

ステップ2：
Nhập 3 ký tự space half-width → click button 登録

ステップ3：
Nhập 3 ký tự space full-width → click button 登録

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới mục, submit bị chặn

ステップ2：
Sau khi FE trim space trước/sau, được xét là trống, hiển thị `必須項目です。`

ステップ3：
Space full-width không thuộc dạng 3 số half-width nên hiển thị `支店コードは半角数字3桁で入力してください。`

補足：
・Ô trống và chỉ nhập space đều được xử lý như vi phạm required
・FE `validateClient` xét qua trim space trước/sau bằng `form.shiten_code?.trim()`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-018 — Check format 支店コード (3 số half-width)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `AB` (2 ký tự chữ half-width) vào 支店コード → click button 登録

ステップ2：
Nhập `12` (2 ký tự) vào 支店コード → click button 登録

ステップ3：
Nhập `１２３` (3 số full-width) vào 支店コード → click button 登録

ステップ4：
Nhập `12A` (lẫn số + chữ) vào 支店コード → click button 登録

### 期待結果

ステップ1：
Hiển thị `支店コードは半角数字3桁で入力してください。` ngay dưới mục

ステップ2：
Hiển thị cùng message như trên (dưới 3 ký tự)

ステップ3：
Hiển thị cùng message như trên (số full-width không phải số half-width nên bị từ chối)

ステップ4：
Hiển thị cùng message như trên (lẫn ký tự không phải số)

補足：
・支店コード cố định 3 số half-width (@Matches(/^\d{3}$/))
・Cùng regex được áp dụng ở cả FE `validateClient` và BE DTO

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-019 — Số ký tự tối đa 支店コード (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `001` (3 số, đúng format chuẩn) vào 支店コード → đăng ký

ステップ2：
Thử nhập ký tự thứ 4 trở đi vào ô 支店コード

ステップ3：
Paste "12345" (5 ký tự) vào ô 支店コード

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ2：
Ký tự từ thứ 4 trở đi bị chặn nhập (do attribute `<a-input maxlength="3">`)

ステップ3：
Ô nhập chỉ giữ 3 ký tự đầu `123`, ký tự từ thứ 4 trở đi bị cắt bỏ

補足：
・支店コード cố định 3 số half-width (max 3 ký tự, min 3 ký tự)
・`<a-input maxlength="3">` giới hạn độ dài nhập từ phía FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-020 — Lỗi khi 支店コード trùng (DUPLICATE_CODE)

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Data có sẵn: `m_shiten` đã có `ja_id=1, shiten_code='999', deleted_at IS NULL`

### 手順

ステップ1：
Nhập `999` vào 支店コード, điền các mục khác bằng giá trị hợp lệ, click button 登録

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_shiten WHERE ja_id=1 AND shiten_code='999' AND deleted_at IS NULL`

ステップ3：
Kiểm tra error log: `SELECT * FROM t_log WHERE target_table='m_shiten' AND result_status=2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, message `同一の支店コードが既に登録されています。`), hiển thị message qua toast

ステップ2：
Giữ nguyên 1 record không đổi (không đăng ký trùng)

ステップ3：
Ghi 1 dòng error log, `log_type=3`, `result_status=2`

補足：
・Trong cùng JA, cấm 支店コード trùng (api.md §4.3 check trùng)
・Ở JA khác cho phép tồn tại 支店コード trùng (do `ja_id` được thêm vào điều kiện WHERE)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-021 — Check bắt buộc 支店名 (ô trống + ký tự space)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 支店名 trống, click button 登録

ステップ2：
Nhập 5 ký tự space half-width → click button 登録

ステップ3：
Nhập 5 ký tự space full-width → click button 登録

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới mục, submit bị chặn

ステップ2：
Sau khi FE trim space trước/sau, được xét là trống, hiển thị `必須項目です。`

ステップ3：
Hiển thị cùng message như trên (space full-width cũng là đối tượng trim)

補足：
・Ô trống và chỉ nhập space đều được xử lý như vi phạm required
・FE `validateClient` xét qua trim space trước/sau bằng `form.shiten_name?.trim()`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-022 — Giới hạn tối đa 100 ký tự 支店名 (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập đúng 100 ký tự vào 支店名 → click button 登録

ステップ2：
Thử nhập ký tự thứ 101 trở đi vào ô 支店名

ステップ3：
Paste chuỗi vượt quá 100 ký tự vào 支店名

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ2：
Ký tự từ thứ 101 trở đi bị chặn nhập (do attribute `<a-input maxlength="100">`)

ステップ3：
Ô nhập chỉ giữ 100 ký tự đầu, ký tự từ thứ 101 trở đi bị cắt bỏ

補足：
・支店名 tối đa 100 ký tự (api.md §request param max length 100)
・`<a-input maxlength="100">` giới hạn độ dài nhập từ phía FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-023 — Xử lý an toàn ký tự đặc biệt / HTML / SQL injection 支店名

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `<script>alert('XSS')</script>` vào 支店名 → click button 登録

ステップ2：
Nhập `'; DROP TABLE m_shiten;--` vào 支店名 → click button 登録

ステップ3：
Nhập `テスト'シングル"ダブル&アンド<タグ>` vào 支店名 → click button 登録

ステップ4：
Sau khi đăng ký, kiểm tra hiển thị trên màn list và màn cập nhật

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công. Trên màn list, `<script>alert('XSS')</script>` được escape và hiển thị dạng text, script không bị thực thi

ステップ2：
Được nhận hợp lệ, đăng ký thành công. Lưu vào DB dạng chuỗi, SQL không bị thực thi (chặn qua parameterized query)

ステップ3：
Được nhận hợp lệ, đăng ký thành công. Ký tự đặc biệt được escape và hiển thị

ステップ4：
Trên màn hình, HTML tag không bị render mà hiển thị an toàn dưới dạng text

補足：
・Chuỗi tấn công XSS / SQL injection được xử lý an toàn
・Phòng thủ qua default escape của Vue template + parameterized query của TypeORM

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-024 — Nhập tùy chọn 支店名カナ (cho phép trống)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, mục bắt buộc đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 支店名カナ trống, click button 登録

ステップ2：
Kiểm tra DB: `SELECT shiten_name_kana FROM m_shiten WHERE shiten_id={ID mới}`

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`), không hiển thị message lỗi

ステップ2：
Cột `shiten_name_kana` được lưu là chuỗi rỗng hoặc NULL (`@Transform(blankToUndef)` convert blank → undefined)

補足：
・支店名カナ là nhập tùy chọn (api.md §request param required = −)
・BE DTO `@Transform(blankToUndef)` chuyển chuỗi rỗng thành undefined, `@IsOptional` skip

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-025 — Giới hạn tối đa 100 ký tự 支店名カナ (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập đúng 100 ký tự vào 支店名カナ → click button 登録

ステップ2：
Thử nhập ký tự thứ 101 trở đi vào ô 支店名カナ

ステップ3：
Paste chuỗi vượt quá 100 ký tự vào 支店名カナ

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ2：
Ký tự từ thứ 101 trở đi bị chặn nhập (do attribute `<a-input maxlength="100">`)

ステップ3：
Ô nhập chỉ giữ 100 ký tự đầu, ký tự từ thứ 101 trở đi bị cắt bỏ

補足：
・支店名カナ tối đa 100 ký tự (api.md §request param max length 100)
・`<a-input maxlength="100">` giới hạn độ dài nhập từ phía FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-026 — Chuyển đổi 金融機関支店フラグ (check / chưa check)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Đăng ký với 金融機関支店フラグ chưa check

ステップ2：
Đăng ký với 金融機関支店フラグ ở trạng thái đã check

ステップ3：
Kiểm tra DB cho cả 2 case: `SELECT kinyu_shiten_flg FROM m_shiten WHERE shiten_id={ID mới}`

### 期待結果

ステップ1：
DB lưu `kinyu_shiten_flg = false` (giá trị mặc định)

ステップ2：
DB lưu `kinyu_shiten_flg = true`

ステップ3：
Cả 2 case đều lưu giá trị bool đúng

補足：
・金融機関支店フラグ thể hiện qua checkbox (true / false)
・Khi không chỉ định, mặc định là false (api.md §request param)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-027 — 備考 nhập tùy chọn + giới hạn tối đa 500 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký, mục bắt buộc đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 備考 trống, click button 登録

ステップ2：
Nhập đúng 500 ký tự vào 備考 → đăng ký

ステップ3：
Thử nhập ký tự thứ 501 trở đi vào ô 備考

ステップ4：
Nhập text nhiều dòng có chứa xuống dòng vào 備考 → đăng ký

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công. Cột `biko` trong DB được lưu là chuỗi rỗng hoặc NULL

ステップ2：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ3：
Ký tự từ thứ 501 trở đi bị chặn nhập (do attribute `<a-textarea maxlength="500">`)

ステップ4：
Được lưu bình thường bao gồm cả ký tự xuống dòng

補足：
・備考 nhập tùy chọn + tối đa 500 ký tự (BE DTO `@MaxLength(500)`)
・Cho phép chuỗi rỗng (ghi chú `※空文字許容`, api.md §response data)
・Text area (hiển thị 4 dòng) cho phép nhập xuống dòng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-028 — Check tính nhất quán master 管理支店 (gửi ID không hợp lệ)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・ID 管理支店 thuộc JA khác (ví dụ kanri_shiten_id=999) không tồn tại trong scope JA của mình

### 手順

ステップ1：
Từ Console DevTools gửi POST `/api/v1/shiten` có chứa `kanri_shiten_id: 999` (ID không tồn tại hoặc ID của JA khác)

ステップ2：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_code=:mới` (không được đăng ký)

### 期待結果

ステップ1：
Trả về HTTP 400 hoặc 403 (`error_code: VALIDATION_ERROR` hoặc `DATA_SCOPE_VIOLATION`)

ステップ2：
Không có row mới được thêm

補足：
・ID 管理支店 phải tồn tại trong bảng `m_kanri_shiten` của JA của mình và trong scope
・Tầng DataScope từ chối kanri_shiten_id của JA khác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-029 — Auto focus khi có lỗi nhập (mục lỗi đầu tiên)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, toàn bộ mục trống

### 手順

ステップ1：
Để toàn bộ mục trống, click button 登録

ステップ2：
Kiểm tra vị trí scroll màn hình và auto focus

ステップ3：
Sau khi sửa lỗi đầu tiên, click button 登録 lại

### 期待結果

ステップ1：
Nhiều message lỗi được hiển thị ngay dưới các mục tương ứng

ステップ2：
Auto focus vào mục lỗi đầu tiên theo thứ tự DOM (管理支店), được `scrollIntoView` để hiển thị ở giữa

ステップ3：
Focus dịch chuyển sang mục lỗi tiếp theo (支店コード v.v.)

補足：
・Auto focus + scroll vào mục lỗi đầu tiên giúp user khỏi phải tìm kiếm
・Xác định mục lỗi đầu tiên theo thứ tự mảng `FIELD_ORDER` (管理支店 → 金融機関 → 支店コード → 支店名 → 支店名カナ → 備考)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-030 — Chặn implicit submit qua phím Enter

- 観点ID: VP-E-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, focus trên từng textbox

### 手順

ステップ1：
Nhấn phím Enter ở ô nhập 支店コード

ステップ2：
Nhấn phím Enter ở ô nhập 支店名

ステップ3：
Nhấn phím Enter ở text area 備考 (mục đích xuống dòng)

### 期待結果

ステップ1：
Form submit không được trigger, không phát sinh API call POST `/api/v1/shiten`

ステップ2：
Tương tự, implicit submit bị chặn

ステップ3：
Trong text area có xuống dòng (Enter bên trong `<textarea>` được cho phép)

補足：
・Theo vue.md §Block Enter implicit submit, form CRUD chặn implicit submit qua Enter
・Utility `preventEnterImplicitSubmit` chặn Enter trong `<input>`, giữ xuống dòng trong `<textarea>`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-031 — Tự động loại bỏ space trước/sau 支店コード

- 観点ID: VP-B-09
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập " 001 " (có space half-width trước/sau) vào 支店コード → đăng ký

ステップ2：
Sau khi đăng ký, kiểm tra cột `shiten_code` trong DB

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ2：
`shiten_code` trong DB lưu `001` (không có space trước/sau)

補足：
・Cả FE / BE đều trim space trước/sau
・Giữ chất lượng data ngay cả khi user lỡ nhập kèm space

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-032 — Kiểm tra shape response VALIDATION_ERROR (nhiều mục lỗi cùng lúc)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Có thể gọi API trực tiếp từ Console DevTools

### 手順

ステップ1：
Từ Console DevTools gửi POST `/api/v1/shiten` với `{}` (request body rỗng)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Trả về HTTP 400

ステップ2：
Response dạng JSON, có cấu trúc `{ error_code: 'VALIDATION_ERROR', message: '入力値が不正です。詳細はerrorsフィールドを確認してください。', errors: [{ field, message }, ...] }`, mảng `errors` chứa ít nhất các lỗi required của `shiten_code` / `shiten_name` / `kanri_shiten_id`

補足：
・BE `ValidationPipe` `exceptionFactory` tập hợp các field error
・FE `useApiForm` map `errors[]` sang `fieldErrors`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-033 — Trùng 支店コード (tái sử dụng code của record đã xóa logical)

- 観点ID: VP-B-08
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `ja_id=1, shiten_code='888', deleted_at IS NOT NULL` (đã xóa logical)

### 手順

ステップ1：
Nhập `888` vào 支店コード, điền các mục khác bằng giá trị hợp lệ, click button 登録

ステップ2：
Kiểm tra DB: `SELECT shiten_id, deleted_at FROM m_shiten WHERE ja_id=1 AND shiten_code='888'`

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công (Trả về HTTP 201, `message: 登録しました。`)

ステップ2：
Tồn tại 2 record (record cũ `deleted_at IS NOT NULL`, record mới `deleted_at IS NULL`)

補足：
・Check trùng được thực hiện với điều kiện `deleted_at IS NULL` (api.md §4.3)
・Code của record đã xóa logical có thể tái sử dụng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-034 — Đăng ký với input tối thiểu toàn bộ mục (chỉ mục bắt buộc)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: ID 管理支店=1, 支店コード `010`, 支店名 `最小入力テスト支店`, các mục khác để trống

### 手順

ステップ1：
Chỉ nhập mục bắt buộc → click button 登録

ステップ2：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_code='010'`

### 期待結果

ステップ1：
Trả về HTTP 201 (`message: 登録しました。`), chuyển về màn list `/shiten`

ステップ2：
1 record được INSERT, `shiten_name_kana` / `biko` là chuỗi rỗng hoặc NULL, `kinyu_shiten_flg=false` (mặc định)

補足：
・Có thể đăng ký chỉ với mục bắt buộc (管理支店, 支店コード, 支店名)
・Mục tùy chọn được lưu ở trạng thái trống / giá trị mặc định

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-035 — Đăng ký với input đầy đủ toàn bộ mục

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: ID 管理支店=1, 支店コード `011`, 支店名 `フル入力テスト支店`, 支店名カナ `フルニュウリョクテストシテン`, 金融機関支店フラグ true, 備考 `フル入力テスト用備考`

### 手順

ステップ1：
Nhập giá trị hợp lệ vào toàn bộ mục → click button 登録

ステップ2：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_code='011'`

### 期待結果

ステップ1：
Trả về HTTP 201 (`message: 登録しました。`), chuyển về màn list `/shiten`

ステップ2：
1 record được INSERT, toàn bộ cột được lưu theo đúng giá trị nhập

補足：
・Có thể đăng ký bình thường ngay cả khi nhập toàn bộ mục
・Đảm bảo tính nhất quán giá trị của từng cột

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-036 — Kiểm tra scope dropdown 管理支店

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)

### 手順

ステップ1：
Mở dropdown 管理支店 trên màn đăng ký

ステップ2：
Kiểm tra danh sách lựa chọn được hiển thị

ステップ3：
Login lại bằng JA khác (ja-002), kiểm tra cùng dropdown

### 期待結果

ステップ1：
Danh sách 管理支店 thuộc JA của mình lấy qua ACSMS-API-COMMON-004 (GET `/api/v1/kanri-shiten/dropdown`) được hiển thị

ステップ2：
Chỉ 管理支店 thuộc JA của mình (ja-001) hiển thị làm lựa chọn, không bao gồm 管理支店 của JA khác

ステップ3：
Chỉ 管理支店 thuộc JA khác (ja-002) được hiển thị (tách biệt giữa các JA qua tầng DataScope)

補足：
・Dropdown 管理支店 được scope theo ja_id của session (ACSMS-API-COMMON-004)
・Không thể chọn ID 管理支店 của JA khác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 5: Logic nghiệp vụ — Đăng ký (Function — Create)

## ACSMS-TC-007-037 — Đăng ký normal (persist DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Test data: ID 管理支店=1, 支店コード `100`, 支店名 `業務ロジックテスト支店`, các mục tùy chọn khác

### 手順

ステップ1：
Nhập giá trị hợp lệ vào toàn bộ mục → click button 登録

ステップ2：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_code='100' AND ja_id=1`

ステップ3：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_table='m_shiten' AND operation='CREATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 201 (`message: 登録しました。`), hiển thị toast thành công `登録しました。`, chuyển về màn list `/shiten`

ステップ2：
1 record được INSERT, từng cột theo đúng giá trị nhập, `ja_id` là ja_id của session, `created_at` là thời gian hiện tại, `created_by` lưu account_id của user đang login

ステップ3：
Ghi 1 dòng audit log, `log_type=1`, `result_status=1`, `gamen_name='支店マスタ登録画面 (ACSMS-SCR-007)'`, `operation='CREATE'`, `target_id` là `shiten_id` mới, `after_value` chứa JSON của data đăng ký

補足：
・Xử lý chính + audit log được thực hiện trong một transaction (tuân thủ nestjs.md §Audit Log)
・Đảm bảo tính nhất quán

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-038 — Ghi audit log khi đăng ký thất bại (qua đường DUPLICATE_CODE)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `ja_id=1, shiten_code='200', deleted_at IS NULL` đã có

### 手順

ステップ1：
Nhập code trùng `200` vào 支店コード → đăng ký

ステップ2：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_table='m_shiten' AND result_status=2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, message `同一の支店コードが既に登録されています。`), không có row mới được thêm vào `m_shiten`

ステップ2：
Ghi 1 dòng error log, `log_type=3`, `result_status=2`, `error_message` chứa nội dung lỗi DUPLICATE_CODE

補足：
・Error log được ghi tách biệt ngoài transaction của xử lý chính (không bị rollback)
・Tuân thủ nestjs.md §Audit Log "error log (log_type=3) được ghi tách biệt ngoài transaction"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-039 — Biên giới transaction khi đăng ký (DB INSERT + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Setup DB để audit log INSERT thất bại (ví dụ: gài vi phạm constraint NOT NULL vào bảng `t_log`)

### 手順

ステップ1：
Click button 登録 với giá trị hợp lệ

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_shiten WHERE shiten_code='300'`

ステップ3：
Kiểm tra audit log

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`)

ステップ2：
0 record (ghi nghiệp vụ được rollback)

ステップ3：
Audit log (log_type=1) không được ghi, error log (log_type=3) được ghi tách biệt ngoài transaction sau khi rollback

補足：
・Khi audit log thất bại → ghi nghiệp vụ rollback để giữ tính nhất quán dữ liệu
・Tuân thủ nestjs.md §Transactions

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Test quan trọng đảm bảo tính nhất quán giữa audit trail và trạng thái DB.

## ACSMS-TC-007-040 — Hành vi khi click button 戻る ở màn đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đang nhập (có giá trị)

### 手順

ステップ1：
Nhập giá trị vào từng mục trên màn đăng ký

ステップ2：
Click button "前の画面に戻る"

ステップ3：
Kiểm tra DB

### 期待結果

ステップ1：
Giá trị nhập được giữ trong trạng thái form

ステップ2：
Chuyển về màn list `/shiten` không qua modal xác nhận (popup xác nhận ở screen-design.md §4 đã được drop trong hiện thực)

ステップ3：
Không được đăng ký (không có record mới trong DB)

補足：
・Khi cancel, không thay đổi DB, không ghi log
・Trong hiện thực không hiển thị dialog xác nhận (function `onBack` của ShitenFormView.vue)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Popup xác nhận ghi ở screen-design.md §4 đã được drop trong hiện thực hiện tại. Đã xác nhận phương châm hiện thực.

## ACSMS-TC-007-041 — Chống submit 2 lần khi đăng ký (click liên tục cùng data)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Click liên tục button 登録 (10 lần trong 5 giây)

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_shiten WHERE shiten_code='400'`

### 期待結果

ステップ1：
Submit bắt đầu ở lần click đầu tiên, button hiển thị ở trạng thái disable trong khi đang submit (`:loading="submitting"`), các lần click từ thứ 2 trở đi bị ignore

ステップ2：
Chỉ 1 record được đăng ký (không trùng)

補足：
・Quản lý state `submitting` của `useApiForm` chặn submit 2 lần
・Trạng thái button trở lại bình thường sau khi submit xong / sau lỗi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-042 — Kiểm tra điểm chuyển trang khi đăng ký thành công

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Click button 登録

ステップ2：
Kiểm tra URL chuyển trang

ステップ3：
Xác nhận record chi nhánh đã đăng ký hiển thị trên màn list

### 期待結果

ステップ1：
Trả về HTTP 201, hiển thị toast thành công `登録しました。`

ステップ2：
Chuyển về màn list `/shiten` (router.push name: 'ShitenList')

ステップ3：
Record mới được hiển thị ở đầu list (sort mặc định `updated_at DESC`)

補足：
・Sau khi đăng ký, record mới hiển thị ở đầu màn list
・Tuân thủ vue.md §default list sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-043 — Kiểm tra timestamp JST khi đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đăng ký trong giờ làm việc JST 9:00 〜 18:00
  - ・Phía server timezone=Asia/Tokyo

### 手順

ステップ1：
Click button 登録

ステップ2：
Kiểm tra DB: `SELECT created_at, updated_at FROM m_shiten WHERE shiten_id={ID mới}`

ステップ3：
Kiểm tra `created_at` trong API response

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công

ステップ2：
`created_at` / `updated_at` được ghi với timezone JST (offset `+09:00`)

ステップ3：
`created_at` trong response được trả về dạng ISO 8601 kèm offset `+09:00` (ví dụ: `2026-05-14T10:00:00+09:00`)

補足：
・Tuân thủ nestjs.md §Timestamp policy
・TIMESTAMPTZ + server TZ=Asia/Tokyo, vận hành nhất quán JST

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-044 — Lưu trữ an toàn thông tin nhạy cảm (before_value/after_value) khi đăng ký

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Click button 登録

ステップ2：
Kiểm tra audit log: `SELECT before_value, after_value FROM t_log WHERE target_id={ID mới} AND operation='CREATE'`

### 期待結果

ステップ1：
Được nhận hợp lệ, đăng ký thành công

ステップ2：
`after_value` chứa JSON của data đăng ký, `before_value` là chuỗi rỗng (do là CREATE), không chứa thông tin nhạy cảm như password

補足：
・Tuân thủ nestjs.md §Audit Log "không bao gồm thông tin nhạy cảm như password"
・before_value set chuỗi rỗng do là INSERT (api.md §4.5)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 6: Logic nghiệp vụ — Cập nhật (Function — Edit)

## ACSMS-TC-007-045 — Hiển thị data có sẵn trên màn cập nhật

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=10, shiten_code='500', ja_id=1` tồn tại

### 手順

ステップ1：
Click cột mã chi nhánh của `shiten_code='500'` trên màn list

ステップ2：
Kiểm tra giá trị khởi tạo của từng field

### 期待結果

ステップ1：
Màn `/shiten/10/edit` được hiển thị

ステップ2：
Khớp hoàn toàn với giá trị DB — 管理支店 / 支店コード / 支店名 / 支店名カナ / 金融機関支店フラグ / 備考 toàn bộ

補足：
・Data lấy qua GET /api/v1/shiten/{id} được phản ánh vào form
・支店コード được hiển thị ở trạng thái disable

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-046 — 支店コード không thể thay đổi trên màn cập nhật (read-only)

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=20, shiten_code='600', ja_id=1`
  - ・Đã hiển thị màn cập nhật `/shiten/20/edit`

### 手順

ステップ1：
Xác nhận trực quan ô nhập "支店コード" bị disable trên màn hình

ステップ2：
Kiểm tra attribute `disabled` của input element qua DevTools

ステップ3：
Từ Console DevTools thực thi `fetch('/api/v1/shiten/20', { method: 'PUT', body: JSON.stringify({ shiten_code: '999', shiten_name: 'XXX', kanri_shiten_id: 1 }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ4：
Kiểm tra DB: `SELECT shiten_code FROM m_shiten WHERE shiten_id=20`

### 期待結果

ステップ1：
Ô nhập 支店コード hiển thị ở trạng thái disable, user không thể edit

ステップ2：
Attribute `disabled` được gắn

ステップ3：
Trả về HTTP 200 (việc update bản thân thành công)

ステップ4：
Cột `shiten_code` giữ nguyên `600` (do BE `shiten_code` không nằm trong UpdateShitenDto nên không thay đổi)

補足：
・Tuân thủ api.md §body update ghi chú "`shiten_code` không thể update (disabled phía screen). Không bao gồm trong request"
・FE `:disabled="isEdit"` chỉ để UX. Biên giới security thực sự là thiết kế BE DTO

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-047 — Cập nhật normal (DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=10` ở state có thể edit
  - ・Input edit: 支店名 `更新後の支店名`, 備考 `更新後の備考`

### 手順

ステップ1：
Đổi giá trị trên màn cập nhật → click button 更新

ステップ2：
Kiểm tra DB: `SELECT shiten_name, biko, updated_at FROM m_shiten WHERE shiten_id=10`

ステップ3：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_id=10 AND operation='UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 200 (`message: 更新しました。`), hiển thị toast thành công `更新しました。`, chuyển về màn list `/shiten`

ステップ2：
`shiten_name` là `更新後の支店名`, `biko` là `更新後の備考`, `updated_at` được update sang thời gian hiện tại

ステップ3：
Ghi 1 dòng, `before_value` JSON là giá trị cũ, `after_value` JSON là giá trị mới, `log_type=1`, `result_status=1`, `operation='UPDATE'`

補足：
・Update DB thành công, `updated_at` tự động update
・Audit log cho phép so sánh trước/sau update đầy đủ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-048 — Cập nhật liên động t_dokusya khi đổi 支店名

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=10, shiten_name='旧支店名'`, `t_dokusya` có nhiều record subscriber tham chiếu chi nhánh này

### 手順

ステップ1：
Đổi 支店名 thành `新支店名` trên màn cập nhật → click button 更新

ステップ2：
Kiểm tra DB: `SELECT shiten_name FROM m_shiten WHERE shiten_id=10`

ステップ3：
Kiểm tra DB: `SELECT DISTINCT shiten_name FROM t_dokusya WHERE shiten_id=10`

### 期待結果

ステップ1：
Trả về HTTP 200 (`message: 更新しました。`)

ステップ2：
`m_shiten.shiten_name` được update thành `新支店名`

ステップ3：
`shiten_name` của các record liên quan trong `t_dokusya` cũng được update đồng thời thành `新支店名`

補足：
・Tuân thủ screen-design.md §3.4 "khi đổi 支店名, cũng update 支店名 trong bảng t_dokusya liên quan"
・Trong cùng một transaction thực hiện `m_shiten` UPDATE + `t_dokusya` UPDATE + INSERT audit log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Test quan trọng về tính nhất quán dữ liệu — 支店名 cũng được dùng để hiển thị trên list subscriber.

## ACSMS-TC-007-049 — Xử lý xung đột khi edit đồng thời (optimistic lock)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Data có sẵn: `shiten_id=10` tồn tại
  - ・User A: mở `/shiten/10/edit` trên trình duyệt A và đang nhập
  - ・User B: edit cùng record trên trình duyệt B khác, save trước

### 手順

ステップ1：
User B click button 更新 với giá trị hợp lệ trước → thành công

ステップ2：
User A click button 更新 (với `updated_at` cũ)

ステップ3：
Kiểm tra DB: `SELECT updated_at, shiten_name FROM m_shiten WHERE shiten_id=10`

### 期待結果

ステップ1：
Trả về HTTP 200, thay đổi của User B được phản ánh vào DB

ステップ2：
Trả về HTTP status code (HTTP status của lỗi xung đột optimistic lock), thay đổi của User A bị từ chối

ステップ3：
Giữ giá trị của User B (chặn ghi đè của User A)

補足：
・Xác nhận sự tồn tại của hiện thực optimistic lock — message chi tiết chưa được fix spec, tham khảo phần 備考
・Chống lost update data

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

HTTP status code và message lỗi khi xung đột optimistic lock chưa được định nghĩa trong danh sách lỗi api.md. Bổ sung sau khi xác nhận spec (TBD).

## ACSMS-TC-007-050 — Hành vi khi click button 戻る ở màn cập nhật

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn cập nhật, đang nhập (có thay đổi giá trị cũ)

### 手順

ステップ1：
Đổi giá trị trên màn cập nhật

ステップ2：
Click button "前の画面に戻る"

ステップ3：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_id=10`

### 期待結果

ステップ1：
Giá trị nhập được giữ trong trạng thái form

ステップ2：
Chuyển về màn list `/shiten` không qua modal xác nhận

ステップ3：
Giá trị DB không thay đổi (giữ giá trị cũ)

補足：
・Khi cancel edit, không thay đổi DB, không ghi log
・Trong hiện thực không hiển thị dialog xác nhận

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-051 — Update bộ phận khi cập nhật (chỉ update mục đã thay đổi)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=10`, toàn bộ mục đã set giá trị hợp lệ
  - ・Input edit: chỉ đổi 備考, các mục khác không đổi

### 手順

ステップ1：
Chỉ đổi 備考 trên màn cập nhật → click button 更新

ステップ2：
Kiểm tra DB: `SELECT * FROM m_shiten WHERE shiten_id=10`

ステップ3：
So sánh `before_value` / `after_value` của audit log

### 期待結果

ステップ1：
Trả về HTTP 200 (`message: 更新しました。`)

ステップ2：
Chỉ `biko` là giá trị mới, các mục khác giữ giá trị cũ, chỉ `updated_at` được update

ステップ3：
JSON `before_value` và JSON `after_value` chỉ có khác biệt ở `biko`

補足：
・Khi update bộ phận, toàn bộ field cũng nằm trong câu UPDATE nhưng giá trị giống nhau nên kết quả giữ giá trị cũ
・Không ảnh hưởng các mục khác

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

## ACSMS-TC-007-052 — Validation đầu vào khi cập nhật (thử update với mục bắt buộc trống)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã hiển thị màn cập nhật `/shiten/10/edit`, có giá trị sẵn

### 手順

ステップ1：
Để 支店名 trống rồi click button 更新

ステップ2：
Bỏ chọn (× clear) 管理支店 rồi click button 更新

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới mục, submit bị chặn

ステップ2：
Hiển thị `必須項目です。` ngay dưới mục, submit bị chặn

補足：
・Khi update cũng áp dụng quy tắc validation giống khi đăng ký
・Sau khi chặn submit, giá trị DB không thay đổi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-053 — Truy cập trực tiếp record đã xóa trên màn cập nhật (NOT_FOUND)

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Data có sẵn: `shiten_id=99, deleted_at IS NOT NULL` (đã xóa logical)

### 手順

ステップ1：
Truy cập trực tiếp URL `/shiten/99/edit`

ステップ2：
Kiểm tra GET `/api/v1/shiten/99` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 404, chuyển về `/dashboard` hoặc `/shiten`

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された支店が見つかりません。`)

補足：
・Record đã xóa logical không thể lấy qua API (api.md §4.3 `WHERE deleted_at IS NULL`)
・Tấn công truy cập trực tiếp qua URL cũng bị BE block

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-007-054 — Lỗi chung — xử lý khi session hết hạn (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đang nhập trên màn đăng ký
  - ・Session đã hết hạn (qua 24h hoặc phía server thực thi `DEL session:{sid}`)

### 手順

ステップ1：
Click button 登録

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra chuyển trang

### 期待結果

ステップ1：
Request POST `/api/v1/shiten` được gửi

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Session bị clear, chuyển về màn `/login` (kèm query `?redirect=/shiten/create`), hiển thị message qua toast

補足：
・Axios interceptor bắt UNAUTHORIZED, clear auth store + chuyển về màn login
・Tuân thủ vue.md §Error Handling Architecture Layer 1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-055 — Lỗi chung BAD_REQUEST — request param không hợp lệ

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, thao tác được DevTools

### 手順

ステップ1：
Từ Console DevTools gửi trực tiếp POST `/api/v1/shiten` với JSON không hợp lệ (ví dụ: chuỗi `'invalid-json'`)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Trả về HTTP 400

ステップ2：
Response: `{ error_code: 'BAD_REQUEST', message: 'リクエストパラメータが不正です。' }`

補足：
・Xác nhận hành vi khi lỗi parse JSON request body
・Xử lý BAD_REQUEST của vue.md §Error Handling Architecture Layer 1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-056 — Lỗi chung VALIDATION_ERROR — kiểm tra shape response

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Có thể gọi API trực tiếp từ Console DevTools

### 手順

ステップ1：
Từ Console DevTools gửi POST `/api/v1/shiten` thiếu nhiều mục bắt buộc

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Trả về HTTP 400

ステップ2：
Response: `{ error_code: 'VALIDATION_ERROR', message: '入力値が不正です。詳細はerrorsフィールドを確認してください。', errors: [...] }`, mảng `errors` chứa nhiều field error

補足：
・BE `ValidationPipe` `exceptionFactory` tập hợp các field error
・FE `useApiForm` map `errors[]` sang `fieldErrors`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-057 — Lỗi chung TOO_MANY_REQUESTS — vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, rate limit đang được bật (ví dụ: 100 lần/phút)

### 手順

ステップ1：
Gửi POST `/api/v1/shiten` liên tục trên 100 lần trong thời gian ngắn qua DevTools

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
N lần đầu phản hồi bình thường (hoặc lỗi code trùng)

ステップ2：
Sau khi vượt rate limit, trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), hiển thị message qua toast

補足：
・Tuân thủ nestjs.md §Rate Limiting
・Xác nhận phòng thủ cơ bản đối với tấn công liên tiếp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-058 — Lỗi chung INTERNAL_SERVER_ERROR — mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đang nhập
  - ・Điều kiện phía server phát sinh lỗi ngoài dự kiến (mất kết nối DB, internal error v.v.)

### 手順

ステップ1：
Cố tình ngắt kết nối DB phía server (hoặc throw lỗi ngoài dự kiến)

ステップ2：
Click button 登録

ステップ3：
Kiểm tra hiển thị màn hình

### 期待結果

ステップ1：
Trạng thái mất kết nối DB

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ3：
Hiển thị message qua toast, màn hình giữ nguyên ở màn đăng ký

補足：
・Server error log (log_type=3) được ghi
・Tuân thủ nestjs.md §Error Handling

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-059 — Lỗi chung NOT_FOUND — truy cập ID không tồn tại trên màn cập nhật

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN

### 手順

ステップ1：
Truy cập trực tiếp URL `/shiten/9999999/edit` (ID không tồn tại)

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra chuyển trang

### 期待結果

ステップ1：
Request GET `/api/v1/shiten/9999999` được gửi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された支店が見つかりません。`)

ステップ3：
Hiển thị message qua toast, chuyển về `/dashboard` (đường `catch` của ShitenFormView.vue)

補足：
・Khi thử edit ID không tồn tại, hiển thị message + chuyển về list / dashboard
・Tuân thủ vue.md §No standalone error pages (không có trang 404)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-060 — Lỗi chung — xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đang nhập

### 手順

ステップ1：
Chuyển sang trạng thái mất mạng ở tab Network của DevTools (chế độ Offline)

ステップ2：
Click button 登録

ステップ3：
Kiểm tra hiển thị màn hình

### 期待結果

ステップ1：
Trạng thái mất mạng

ステップ2：
Request thất bại, hiển thị message `ネットワークエラーが発生しました。接続を確認してください。` qua toast

ステップ3：
Màn hình giữ nguyên ở màn đăng ký, giá trị nhập cũng được giữ

補足：
・Tuân thủ vue.md §Error Handling Architecture Layer 1 xử lý lỗi mạng
・Không cản trở công việc của user

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-007-061 — Lỗi chung DATA_SCOPE_VIOLATION — thử truy cập record JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Data có sẵn: `shiten_id=500, ja_id=2` (record chi nhánh của JA khác)

### 手順

ステップ1：
Truy cập trực tiếp URL `/shiten/500/edit`

ステップ2：
Gọi trực tiếp GET `/api/v1/shiten/500` qua DevTools

ステップ3：
Gọi PUT `/api/v1/shiten/500` qua DevTools

### 期待結果

ステップ1：
Màn hình không được hiển thị, chuyển về `/dashboard`

ステップ2：
Trả về HTTP 403 hoặc 404 (`error_code: DATA_SCOPE_VIOLATION` hoặc `NOT_FOUND`, message `このデータへのアクセス権限がありません。`)

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Tầng DataScope block truy cập record JA khác
・Tuân thủ api.md §4.3 "khi `ja_id` không khớp: HTTP 403 (`DATA_SCOPE_VIOLATION`)"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — Nếu fail, đồng nghĩa với việc bypass DataScope, xử lý như security incident.
