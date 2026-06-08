---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-031
screen_name: お知らせ一覧画面
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

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình danh sách お知らせ (ACSMS-SCR-031)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-031 | Tài liệu thiết kế Màn hình danh sách お知らせ |
| 2 | ACSMS-SCR-031-api | Tài liệu thiết kế API お知らせ |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation đầu vào — Form chỉnh sửa お知らせ | 14 |
| 5 | Logic nghiệp vụ — Đăng ký mới (Function — Create) | 6 |
| 6 | Logic nghiệp vụ — Chỉnh sửa・Cập nhật・Xóa (Function — Edit & Delete) | 11 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 52 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-031-001 — Cho phép NICHINO_ADMIN truy cập màn hình danh sách お知らせ

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có quyền `oshirase.view`, `oshirase.create`, `oshirase.update`, `oshirase.delete`
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Click link 「お知らせ管理」 trên sidebar

ステップ2：
Truy cập trực tiếp URL `/oshirase`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase`

### 期待結果

ステップ1：
Sidebar hiển thị item 「お知らせ管理」

ステップ2：
Màn hình `/oshirase` được hiển thị, form ở mode đăng ký mới với các field trống, header form hiển thị text 「新規登録」, danh sách お知らせ hiển thị theo thứ tự giảm dần của created_at với 20 record/trang

ステップ3：
Trả về HTTP 200, response dạng JSON

補足：
・Màn hình này chỉ NICHINO_ADMIN truy cập được
・Cả 3 tầng FE menu / FE router guard / BE API guard đều cho phép truy cập

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

## ACSMS-TC-031-002 — Cấm NICHINO_STAFF truy cập màn hình danh sách お知らせ

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item 「お知らせ管理」 trên sidebar

ステップ2：
Truy cập trực tiếp URL `/oshirase`

ステップ3：
Dùng DevTools gọi POST `/api/v1/oshirase` với request body hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item 「お知らせ管理」

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`), không có dữ liệu mới được đăng ký vào `t_oshirase`, có ghi error log vào `t_log`

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-006

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

Critical — Nếu fail, đồng nghĩa với việc bypass RBAC, xử lý như security incident.

## ACSMS-TC-031-003 — Cấm CHUOKAI truy cập màn hình danh sách お知らせ

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item 「お知らせ管理」 trên sidebar

ステップ2：
Truy cập trực tiếp URL `/oshirase`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase/1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item 「お知らせ管理」

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・Cả 3 tầng đều block

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

## ACSMS-TC-031-004 — Cấm JA_HONTEN truy cập màn hình danh sách お知らせ

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item 「お知らせ管理」 trên sidebar

ステップ2：
Truy cập trực tiếp URL `/oshirase`

ステップ3：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/oshirase/1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item 「お知らせ管理」

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`), không có thay đổi nào trong `t_oshirase`

補足：
・JA_HONTEN không có quyền quản lý お知らせ

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

## ACSMS-TC-031-005 — Cấm JA_KANRI_SHITEN truy cập màn hình danh sách お知らせ

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item 「お知らせ管理」 trên sidebar

ステップ2：
Truy cập trực tiếp URL `/oshirase`

ステップ3：
Dùng DevTools gọi PUT `/api/v1/oshirase/1` với request body hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item 「お知らせ管理」

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`), không có thay đổi nào trong `t_oshirase`

補足：
・JA_KANRI_SHITEN không có quyền quản lý お知らせ

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

## ACSMS-TC-031-006 — Layout tổng thể khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click link 「お知らせ管理」 trên sidebar

ステップ2：
So sánh tài liệu thiết kế (screen-design.md / index.html) song song với màn hình

ステップ3：
Kiểm tra bố cục các phần tử trên màn hình (form chỉnh sửa → danh sách お知らせ → pagination)

### 期待結果

ステップ1：
Màn hình `/oshirase` được hiển thị

ステップ2：
Màu nền, font, font size, padding, màu button, style table đều khớp với thiết kế

ステップ3：
Phía trên là 「form chỉnh sửa (mode đăng ký mới)」, phía dưới là 「bảng danh sách お知らせ + pagination」

補足：
・Design tokens (`design-tokens.ts`) đã được áp dụng
・Header form hiển thị text 「新規登録」

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

## ACSMS-TC-031-007 — Hiển thị các phần tử của form chỉnh sửa

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình (mode đăng ký mới)

### 手順

ステップ1：
Kiểm tra input field của 「お知らせタイトル」 và 「内容」

ステップ2：
Kiểm tra các radio button của 「公開場所」 và 「状態」

ステップ3：
Kiểm tra date-time picker của 「表示開始日時」 và 「表示終了日時」

ステップ4：
Kiểm tra dropdown 「お知らせ種別」, checkbox 「対象管理者区分」, select 「JA名」

ステップ5：
Kiểm tra button 「保存」 và 「クリア」

### 期待結果

ステップ1：
「お知らせタイトル」 là textbox 1 dòng, 「内容」 là textarea, label có đánh dấu bắt buộc (dấu 「*」 màu đỏ) ở cuối

ステップ2：
「公開場所」 là radio 2 lựa chọn 「ログイン画面 / メニュー画面」, 「状態」 là radio 3 lựa chọn 「下書き / 公開 / 非公開」, mặc định 公開場所=1, 状態=1

ステップ3：
Date-time picker hiển thị theo format `YYYY/MM/DD HH:mm`, label 「表示開始日時」 có đánh dấu bắt buộc, label 「表示終了日時」 không có

ステップ4：
Dropdown 「お知らせ種別」 hiển thị 4 lựa chọn 「システム / 重要 / 一般 / 締め切り時間」, 「対象管理者区分」 là 5 checkbox tương ứng 1〜5, 「JA名」 lấy giá trị từ API chung

ステップ5：
「保存」 là button chính (màu xanh), 「クリア」 là button phụ

補足：
・Field bắt buộc: タイトル, 公開場所, 状態, 表示開始日時, お知らせ種別, 内容

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

## ACSMS-TC-031-008 — Hiển thị bảng danh sách お知らせ (cấu trúc cột・status badge)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・`t_oshirase` có record cho mỗi status (1:下書き, 2:公開, 3:非公開)

### 手順

ステップ1：
Kiểm tra thứ tự cột của bảng danh sách お知らせ

ステップ2：
Kiểm tra badge hiển thị của cột 「状態」

ステップ3：
Kiểm tra format hiển thị của cột 「表示期間」 (bao gồm record có 表示終了日時 NULL)

ステップ4：
Kiểm tra button 「編集」 và 「削除」 trên từng row

### 期待結果

ステップ1：
Cột được hiển thị theo thứ tự từ trái sang 「編集 / 場所 / 状態 / お知らせタイトル / 表示期間 / 削除」

ステップ2：
status=2 (公開) hiển thị badge màu xanh (emerald), status=1 (下書き) hiển thị badge màu xám (slate), status=3 (非公開) hiển thị badge màu đỏ (red)

ステップ3：
Hiển thị theo format `yyyy/MM/dd HH:mm:ss ～ yyyy/MM/dd HH:mm:ss`, record có 表示終了日時 NULL hiển thị là 「無期限」

ステップ4：
Mỗi row hiển thị button 「編集」 và 「削除」, button có thể click được

補足：
・Title quá dài thì truncate

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

## ACSMS-TC-031-009 — Hiển thị pagination

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・`t_oshirase` có hơn 50 record

### 手順

ステップ1：
Kiểm tra control pagination ở phía dưới màn hình danh sách お知らせ

ステップ2：
Click số trang 「2」

ステップ3：
Chuyển sang test data có số lượng dưới 20 record

### 期待結果

ステップ1：
Hiển thị các control 「前へ」「次へ」「số trang」, mặc định là trang 1 với 20 record/trang

ステップ2：
Dữ liệu của trang 2 được hiển thị, query parameter được cập nhật thành `page=2`

ステップ3：
Khi số record dưới 20, pagination ở trạng thái ẩn hoặc disable

補足：
・Mặc định số record/trang là 20, tối đa 100 record/trang
・Khi chuyển trang lúc có dữ liệu chưa lưu thì hiển thị dialog cảnh báo

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

## ACSMS-TC-031-010 — Responsive — PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị danh sách お知らせ

### 手順

ステップ1：
Đặt kích thước cửa sổ thành 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar cố định, form và bảng danh sách hiển thị full width

ステップ2：
Sidebar collapse, các field form xếp thành 2 cột, bảng có thể scroll ngang

ステップ3：
Sidebar overlay, các field form xếp dọc, không vỡ layout ngoài việc scroll ngang

補足：
・Không vỡ layout trên cả 3 breakpoint

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

## ACSMS-TC-031-011 — Thứ tự Tab và thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Đặt focus vào input 「お知らせタイトル」, ấn liên tục Tab

ステップ2：
Tại input 「お知らせタイトル」, ấn Enter để xác nhận IME

ステップ3：
Chuyển focus sang button 「保存」 và ấn Enter

### 期待結果

ステップ1：
Thứ tự Tab chạy theo 「タイトル → 公開場所 → 状態 → 表示開始日時 → 表示終了日時 → JA名 → お知らせ種別 → 対象管理者区分 → 内容 → 保存 → クリア」

ステップ2：
Form không bị submit (Enter xác nhận IME bị block bởi `preventEnterImplicitSubmit`)

ステップ3：
Form được submit (gọi POST `/api/v1/oshirase` hoặc PUT `/api/v1/oshirase/{id}`)

補足：
・Tất cả các item đều thao tác được bằng bàn phím

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

## ACSMS-TC-031-012 — Hiển thị tiêu đề header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở màn hình `/oshirase`

ステップ2：
Kiểm tra tiêu đề tab trình duyệt và tiêu đề trang ở phía trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tab trình duyệt hiển thị tiêu đề tương đương 「購読者管理システム - お知らせ一覧画面」, header phía trên màn hình hiển thị 「お知らせ一覧画面」

補足：
・Tiêu đề trang được render tự động bởi `MainLayout > AppHeader` từ `route.meta.breadcrumb`

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

## ACSMS-TC-031-013 — Hiển thị icon thông báo + user menu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra icon thông báo ở góc trên bên phải của header

ステップ2：
Click vào user menu (avatar)

ステップ3：
Click link 「ログアウト」 trong user menu

### 期待結果

ステップ1：
Icon thông báo được hiển thị, badge chưa đọc hiển thị chính xác

ステップ2：
User menu hiển thị dạng dropdown, hiển thị tên user đăng nhập và tên role

ステップ3：
Xử lý logout được thực thi, chuyển sang màn hình `/login`, session bị hủy

補足：
・Các phần tử header hiển thị ở vị trí nhất quán trên mọi màn hình

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

## ACSMS-TC-031-014 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra breadcrumb của màn hình `/oshirase`

ステップ2：
Click link 「ホーム」 trên breadcrumb

### 期待結果

ステップ1：
Hiển thị 2 cấp dạng 「ホーム > お知らせ一覧画面」

ステップ2：
Chuyển sang `/dashboard`

補足：
・Breadcrumb được render tự động từ `route.meta.breadcrumb`

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

# カテゴリ 4: Validation đầu vào — Form chỉnh sửa お知らせ

## ACSMS-TC-031-015 — お知らせタイトル kiểm tra bắt buộc (để trống)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Để trống input 「お知らせタイトル」, nhập các field bắt buộc khác và click button 「保存」

ステップ2：
Nhập input 「お知らせタイトル」 chỉ chứa half-width space (ví dụ: 「   」) và click button 「保存」

### 期待結果

ステップ1：
Hiển thị error bắt buộc `必須項目です。` phía dưới input 「お知らせタイトル」, POST request không được gửi

ステップ2：
Sau khi loại bỏ space đầu cuối thì còn trống, nên hiển thị error bắt buộc `必須項目です。`

補足：
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-011
・Backend cũng phải dùng `@Transform(blankToUndef)` để convert blank thành undefined trước khi check bắt buộc

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

## ACSMS-TC-031-016 — お知らせタイトル giới hạn tối đa 200 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Nhập đúng 200 ký tự vào 「お知らせタイトル」 và click button 「保存」

ステップ2：
Thử nhập 201 ký tự vào 「お知らせタイトル」

ステップ3：
Paste 250 ký tự vào 「お知らせタイトル」

ステップ4：
Dùng DevTools gửi trực tiếp POST `/api/v1/oshirase` với title 201 ký tự

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 201, 200 ký tự được lưu vào DB

ステップ2：
Bị block input (do maxLength=200, từ ký tự thứ 201 trở đi không nhập được)

ステップ3：
Bị cắt xuống 200 ký tự và hiển thị trong input

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, mảng `errors` có chứa error vượt độ dài title)

補足：
・FE dùng attribute `maxLength=200`, backend re-validate bằng `@MaxLength(200)`

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

## ACSMS-TC-031-017 — お知らせタイトル xử lý an toàn ký tự đặc biệt・SQL/XSS injection

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Nhập `<script>alert(1)</script>` vào 「お知らせタイトル」 và click button 「保存」

ステップ2：
Nhập `'; DROP TABLE t_oshirase; --` vào 「お知らせタイトル」 và click button 「保存」

ステップ3：
Sau khi lưu, kiểm tra hiển thị title trên màn hình danh sách

### 期待結果

ステップ1：
Trả về HTTP 201, `<script>alert(1)</script>` được lưu vào DB dưới dạng literal, khi hiển thị lại thì script không được thực thi

ステップ2：
Trả về HTTP 201, được lưu vào DB dưới dạng literal, bảng `t_oshirase` không bị phá hủy

ステップ3：
Cột title hiển thị dạng plain text, HTML tag được escape

補足：
・XSS được tự động escape bởi interpolation `{{ }}` của Vue
・SQL injection được phòng vệ bởi parameterized query của TypeORM

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

Critical — Nếu fail là security incident.

## ACSMS-TC-031-018 — 公開場所 kiểm tra bắt buộc + thao tác lựa chọn

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Kiểm tra trạng thái radio 「公開場所」 khi màn hình hiển thị lần đầu

ステップ2：
Chuyển đổi lần lượt giữa radio 「ログイン画面」「メニュー画面」 và click button 「保存」

ステップ3：
Dùng DevTools gửi trực tiếp POST `/api/v1/oshirase` với publish_location=99 (ngoài phạm vi)

### 期待結果

ステップ1：
Giá trị mặc định 「ログイン画面」 (publish_location=1) được chọn

ステップ2：
Lựa chọn chuyển đổi tương ứng, request body khi gửi có chứa publish_location=1 hoặc 2

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors` chứa error ngoài phạm vi của publish_location)

補足：
・「公開場所」 là field bắt buộc, phạm vi giá trị là 1 hoặc 2
・Backend re-validate bằng `@IsIn([1, 2])`

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

## ACSMS-TC-031-019 — 状態 kiểm tra bắt buộc + thao tác lựa chọn

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Kiểm tra trạng thái radio 「状態」 khi màn hình hiển thị lần đầu

ステップ2：
Chuyển đổi lần lượt giữa radio 「下書き」「公開」「非公開」 và lưu từng cái

### 期待結果

ステップ1：
Giá trị mặc định 「下書き」 (status=1) được chọn

ステップ2：
Lựa chọn chuyển đổi tương ứng, request body chứa một trong status=1, 2, 3, sau khi lưu, danh sách hiển thị badge màu chính xác

補足：
・Phạm vi giá trị của 「状態」 là 1 (下書き) / 2 (公開) / 3 (非公開)

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

## ACSMS-TC-031-020 — 表示開始日時 kiểm tra bắt buộc + không chọn được ngày quá khứ

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Để trống 「表示開始日時」 và click button 「保存」

ステップ2：
Thử chọn ngày quá khứ (ví dụ: ngày hôm qua) trên date-time picker

ステップ3：
Dùng DevTools gửi trực tiếp POST `/api/v1/oshirase` với publish_start_date là ngày quá khứ

### 期待結果

ステップ1：
Hiển thị error bắt buộc `必須項目です。` phía dưới 「表示開始日時」

ステップ2：
Ngày quá khứ hiển thị ở trạng thái không chọn được (bị gray out hoặc disable trên calendar UI)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors` chứa error ngày quá khứ của publish_start_date)

補足：
・Chỉ khi đăng ký mới mới không chọn được ngày quá khứ (xem TC khác cho mode chỉnh sửa)
・Phòng vệ cả 2 tầng frontend (calendar UI) và backend

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

## ACSMS-TC-031-021 — 表示終了日時 tùy chọn + kiểm tra tương quan phải sau ngày bắt đầu

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập 「表示開始日時」 = 「2026/06/01 09:00」

### 手順

ステップ1：
Để trống 「表示終了日時」 và click button 「保存」

ステップ2：
Nhập 「表示終了日時」 = 「2026/05/01 09:00」 (trước ngày bắt đầu) và click button 「保存」

ステップ3：
Nhập 「表示終了日時」 = 「2026/06/30 23:59」 (sau ngày bắt đầu) và click button 「保存」

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 201, DB lưu publish_end_date = NULL (vô thời hạn)

ステップ2：
Hiển thị error `終了日は開始日より後にしてください。` phía dưới 「表示終了日時」, POST request không được gửi hoặc backend trả HTTP 400

ステップ3：
Lưu thành công, trả về HTTP 201

補足：
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-008
・表示終了日時 NULL được coi là vô thời hạn

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

## ACSMS-TC-031-022 — お知らせ種別 kiểm tra bắt buộc + thao tác lựa chọn

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Mở dropdown 「お知らせ種別」

ステップ2：
Để 「お知らせ種別」 chưa chọn và click button 「保存」

ステップ3：
Chọn từng lựa chọn và lưu

### 期待結果

ステップ1：
Dropdown hiển thị 4 item 「システム / 重要 / 一般 / 締め切り時間」

ステップ2：
Hiển thị error bắt buộc `必須項目です。` phía dưới 「お知らせ種別」

ステップ3：
Lưu thành công với một trong oshirase_type=1, 2, 3, 4

補足：
・「お知らせ種別」 là field bắt buộc
・Phạm vi giá trị là 1〜4

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

## ACSMS-TC-031-023 — 対象管理者区分 tùy chọn + chọn nhiều + xử lý "chưa chọn = chọn tất cả"

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Kiểm tra checkbox 「対象管理者区分」 (区分1〜5)

ステップ2：
Chọn 区分1 và 区分3 rồi click button 「保存」

ステップ3：
Để tất cả chưa chọn rồi click button 「保存」

### 期待結果

ステップ1：
5 checkbox được hiển thị, trạng thái ban đầu là chưa check

ステップ2：
Lưu thành công, `target_kanri_kubun` trong DB lưu 「1,3」 (phân tách bởi dấu phẩy)

ステップ3：
Lưu thành công, `target_kanri_kubun` trong DB lưu chuỗi rỗng (xử lý như chọn tất cả 区分)

補足：
・「対象管理者区分」 là field tùy chọn, chưa chọn được xử lý như chọn tất cả

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

## ACSMS-TC-031-024 — JA名 tùy chọn + lấy dropdown (API chung)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Mở select box 「JA名」

ステップ2：
Kiểm tra response GET `/api/v1/ja/dropdown` trên tab Network của DevTools

ステップ3：
Lưu mà không chọn 「JA名」

ステップ4：
Chọn 「JA名」 rồi lưu

### 期待結果

ステップ1：
Select box hiển thị danh sách JA và lựa chọn tương đương 「全 JA 向け」

ステップ2：
Danh sách JA được lấy từ API chung `/api/v1/ja/dropdown`, trả về HTTP 200

ステップ3：
Lưu thành công, `ja_id` trong DB lưu NULL (cho toàn bộ JA)

ステップ4：
Lưu thành công, `ja_id` trong DB lưu JA ID đã chọn

補足：
・「JA名」 là field tùy chọn, NULL = cho toàn bộ JA

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

## ACSMS-TC-031-025 — 内容 kiểm tra bắt buộc (để trống)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Để trống input 「内容」 và click button 「保存」

ステップ2：
Nhập chỉ space vào input 「内容」 và click button 「保存」

### 期待結果

ステップ1：
Hiển thị error bắt buộc `必須項目です。` phía dưới input 「内容」

ステップ2：
Sau khi loại bỏ space đầu cuối thì còn trống, nên hiển thị error bắt buộc `必須項目です。`

補足：
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-011

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

## ACSMS-TC-031-026 — 内容 giới hạn tối đa 2000 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Nhập đúng 2000 ký tự vào 「内容」 và click button 「保存」

ステップ2：
Thử nhập 2001 ký tự vào 「内容」

ステップ3：
Paste 2500 ký tự vào 「内容」

ステップ4：
Dùng DevTools gửi trực tiếp POST với content 2001 ký tự

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 201, 2000 ký tự được lưu vào DB

ステップ2：
Bị block input (do maxLength=2000, từ ký tự thứ 2001 trở đi không nhập được)

ステップ3：
Bị cắt xuống 2000 ký tự và hiển thị trong input

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors` có chứa error vượt độ dài content)

補足：
・FE dùng attribute `maxLength=2000`, backend re-validate bằng `@MaxLength(2000)`

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

## ACSMS-TC-031-027 — 内容 chấp nhận xuống dòng・ký tự full-width

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới, đã nhập các field bắt buộc khác

### 手順

ステップ1：
Nhập text nhiều dòng có chứa ký tự xuống dòng vào 「内容」 và click button 「保存」

ステップ2：
Sau khi lưu, mở edit mode và kiểm tra ô 「内容」

ステップ3：
Nhập 「重要なお知らせ：明日メンテナンスを実施します」 (hỗn hợp kanji) vào 「内容」 và lưu

### 期待結果

ステップ1：
Lưu thành công, ký tự xuống dòng (`\n`) được lưu vào DB

ステップ2：
Ký tự xuống dòng được giữ nguyên và hiển thị trong textarea

ステップ3：
Lưu thành công, kanji・hiragana・katakana được lưu và hiển thị chính xác

補足：
・Có thể đăng ký bao gồm cả ký tự xuống dòng
・Ký tự full-width nhập・lưu・hiển thị chính xác

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

## ACSMS-TC-031-028 — Validation tổng hợp khi tất cả field bắt buộc đều chưa nhập

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Để trống tất cả các field của form và click button 「保存」

ステップ2：
Dùng DevTools gửi trực tiếp POST `/api/v1/oshirase` với JSON body rỗng

ステップ3：
Kiểm tra mảng `errors` trong response

### 期待結果

ステップ1：
Hiển thị `必須項目です。` phía dưới tất cả các field bắt buộc (タイトル, 公開場所, 状態, 表示開始日時, お知らせ種別, 内容)

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Mảng `errors` chứa nhiều error theo từng field, tự động focus vào field error đầu tiên

補足：
・Trả về nhiều error trong 1 response

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

# カテゴリ 5: Logic nghiệp vụ — Đăng ký mới (Function — Create)

## ACSMS-TC-031-029 — Đăng ký mới case bình thường (DB persistent + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Sau khi load màn hình ở mode đăng ký mới

### 手順

ステップ1：
Nhập giá trị hợp lệ vào tất cả các field bắt buộc (タイトル, 公開場所=1, 状態=2, 表示開始日時=ngày tương lai, お知らせ種別=1, 内容)

ステップ2：
Click button 「保存」

ステップ3：
Kiểm tra bảng `t_oshirase` trên DB

ステップ4：
Kiểm tra bảng `t_log` trên DB

### 期待結果

ステップ1：
Tất cả các field đều được nhập

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`, danh sách được reload, row đã lưu được highlight, chuyển sang edit mode (hiển thị ID đang chỉnh sửa)

ステップ3：
Record mới được INSERT, `created_at` / `updated_at` / `created_by` / `updated_by` được set chính xác, `deleted_at` là NULL

ステップ4：
`log_type=1`, `operation='CREATE'`, `result_status=1`, `target_table='t_oshirase'`, `target_id={oshirase_id mới}`, `after_value` được record đầy đủ dạng JSON, `gamen_name='お知らせ一覧画面 (ACSMS-SCR-031)'`

補足：
・Xử lý chính và record audit log thực thi trong cùng 1 transaction
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-001

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

## ACSMS-TC-031-030 — Đăng ký mới error trùng lặp 締め切り時間

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã tồn tại record có publish_location=2 (メニュー画面) và oshirase_type=4 (締め切り時間) trong `t_oshirase`

### 手順

ステップ1：
Ở mode đăng ký mới, nhập giá trị hợp lệ vào form (公開場所=メニュー画面, お知らせ種別=締め切り時間)

ステップ2：
Click button 「保存」

ステップ3：
Kiểm tra bảng `t_oshirase` trên DB

### 期待結果

ステップ1：
Giá trị được nhập trong form

ステップ2：
Trả về HTTP 400 (`error_code: DEADLINE_NOTICE_DUPLICATE`, message `公開場所「メニュー画面」かつ種別「締め切り時間」のお知らせが既に存在するため登録できません。`), hiển thị toast error

ステップ3：
Không có dữ liệu mới được đăng ký vào `t_oshirase`

補足：
・Record có 公開場所=2 và お知らせ種別=4 chỉ được phép 1 record duy nhất trên toàn hệ thống
・Nếu record đã tồn tại thì chỉ chỉnh sửa được, không tạo mới được
・Kiểm tra trùng lặp được thực hiện trong transaction

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

## ACSMS-TC-031-031 — Đăng ký mới cho phép tổ hợp khác của 公開場所・種別

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã tồn tại record có publish_location=2 và oshirase_type=4

### 手順

ステップ1：
Ở mode đăng ký mới, nhập 公開場所=1 (ログイン画面), お知らせ種別=4 (締め切り時間)

ステップ2：
Click button 「保存」

ステップ3：
Đăng ký mới riêng với tổ hợp 公開場所=2 (メニュー画面), お知らせ種別=1 (システム)

### 期待結果

ステップ1：
Giá trị được nhập trong form

ステップ2：
Lưu thành công (do 公開場所 khác nhau nên không xử lý là trùng lặp), trả về HTTP 201

ステップ3：
Lưu thành công (do お知らせ種別 khác nhau nên không xử lý là trùng lặp)

補足：
・Kiểm tra trùng lặp chỉ áp dụng cho tổ hợp publish_location=2 AND oshirase_type=4
・Các tổ hợp khác không bị giới hạn

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

## ACSMS-TC-031-032 — Đăng ký mới thao tác button 「クリア」

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập tất cả field của form ở mode đăng ký mới

### 手順

ステップ1：
Nhập giá trị hợp lệ vào tất cả các field

ステップ2：
Click button 「クリア」

ステップ3：
Kiểm tra trạng thái form

### 期待結果

ステップ1：
Giá trị được nhập trong form

ステップ2：
Tất cả các field được reset về giá trị ban đầu, mode đăng ký mới được duy trì

ステップ3：
タイトル・内容 trống, 公開場所=1, 状態=1, 表示開始日時・終了日時・JA名・お知らせ種別・対象管理者区分 ở giá trị ban đầu

補足：
・Button 「クリア」 chỉ hiển thị ở mode đăng ký mới
・Không hiển thị ở mode chỉnh sửa

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

## ACSMS-TC-031-033 — Đăng ký mới rollback transaction khi fail

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ ở mode đăng ký mới
  - ・Môi trường có thể inject error vào audit log INSERT

### 手順

ステップ1：
Inject error để audit log INSERT bị fail

ステップ2：
Click button 「保存」

ステップ3：
Kiểm tra `t_oshirase` và `t_log` trên DB

### 期待結果

ステップ1：
Inject error hoạt động

ステップ2：
Trả về HTTP 500, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`

ステップ3：
Không có dữ liệu mới được đăng ký vào `t_oshirase` (rollback thành công), `t_log` record 1 dòng `log_type=3` (error log), `result_status=2` (fail)

補足：
・Xử lý chính và record audit log thực thi trong cùng 1 transaction
・Error log được record riêng ngoài transaction
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-007

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

## ACSMS-TC-031-034 — Đăng ký mới chống gửi 2 lần

- 観点ID: VP-E-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ ở mode đăng ký mới

### 手順

ステップ1：
Double click button 「保存」

ステップ2：
Click button 「保存」 liên tục 10 lần

ステップ3：
Kiểm tra số lần gửi POST request trên tab Network của DevTools

ステップ4：
Kiểm tra bảng `t_oshirase` trên DB

### 期待結果

ステップ1：
Chỉ 1 request được gửi

ステップ2：
Không gửi request trùng lặp, button ở trạng thái disable khi đang xử lý

ステップ3：
Số request POST `/api/v1/oshirase` là 1 lần

ステップ4：
Chỉ 1 record mới được INSERT

補足：
・Không gửi 2 lần, không đăng ký 2 lần

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

# カテゴリ 6: Logic nghiệp vụ — Chỉnh sửa・Cập nhật・Xóa (Function — Edit & Delete)

## ACSMS-TC-031-035 — Load chỉnh sửa hiển thị dữ liệu hiện có

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị record `oshirase_id = 1` trên danh sách お知らせ

### 手順

ステップ1：
Click button 「編集」 ở row có `oshirase_id = 1` trên danh sách

ステップ2：
Kiểm tra GET `/api/v1/oshirase/1` trên tab Network của DevTools

ステップ3：
Kiểm tra giá trị được phản ánh trong form

### 期待結果

ステップ1：
Chuyển sang edit mode, row `oshirase_id = 1` được highlight trên danh sách

ステップ2：
Trả về HTTP 200, response dạng JSON, object `data` chứa các giá trị hiện có

ステップ3：
Tất cả các field của form được phản ánh giá trị hiện có, phía trên form chỉnh sửa có hiển thị tương đương 「編集中：お知らせID 1」, button 「クリア」 không hiển thị

補足：
・Khi chuyển sang edit mode thì lấy dữ liệu mới nhất

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

## ACSMS-TC-031-036 — Load chỉnh sửa khi có dữ liệu chưa lưu thì hiển thị dialog cảnh báo

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã thay đổi các field form ở mode đăng ký mới (trạng thái chưa lưu)

### 手順

ステップ1：
Nhập タイトル v.v. ở mode đăng ký mới (trạng thái chưa lưu)

ステップ2：
Click button 「編集」 trên danh sách

ステップ3：
Click 「編集を続行」 trên dialog cảnh báo

ステップ4：
Click button 「編集」 lại, click 「破棄して続行」 trên dialog cảnh báo

### 期待結果

ステップ1：
Trạng thái chưa lưu

ステップ2：
Dialog cảnh báo được hiển thị, hiển thị message `未保存のデータがあります。このまま続けますか？`, hiển thị button 「編集を続行」「破棄して続行」

ステップ3：
Dialog đóng lại, giữ nguyên giá trị input hiện tại và duy trì mode đăng ký mới

ステップ4：
Thay đổi chưa lưu bị hủy bỏ, chuyển sang edit mode, dữ liệu của row được chọn phản ánh vào form

補足：
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-010

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

## ACSMS-TC-031-037 — Chỉnh sửa 表示開始日時 ngày quá khứ chỉ đọc

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại record có 表示開始日時 là ngày quá khứ (ví dụ: publish_start_date = 2026/01/01 09:00)
  - ・Ngày hiện tại là 2026/05/22

### 手順

ステップ1：
Mở edit mode cho record có ngày quá khứ

ステップ2：
Đặt cursor vào input 「表示開始日時」 và thử thay đổi

ステップ3：
Dùng DevTools gửi PUT `/api/v1/oshirase/{id}` với publish_start_date đã thay đổi trong request body

### 期待結果

ステップ1：
Chuyển sang edit mode, 「表示開始日時」 hiển thị giá trị hiện có

ステップ2：
Input ở trạng thái disabled, giá trị không thay đổi được

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, publish_start_date là ngày quá khứ không thay đổi được), giá trị `publish_start_date` trong `t_oshirase` không bị thay đổi

補足：
・Frontend phải dùng attribute `disabled` để không chỉnh sửa được
・Backend cũng phải reject bằng cách detect diff của `publish_start_date` (defense in depth)

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

## ACSMS-TC-031-038 — Chỉnh sửa 表示開始日時 ngày tương lai có thể chỉnh sửa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại record có 表示開始日時 là ngày tương lai (ví dụ: publish_start_date = 2026/12/01 09:00)
  - ・Ngày hiện tại là 2026/05/22

### 手順

ステップ1：
Mở edit mode cho record có ngày tương lai

ステップ2：
Thay đổi 「表示開始日時」 sang ngày tương lai khác (ví dụ: 2026/12/15 09:00)

ステップ3：
Click button 「保存」

### 期待結果

ステップ1：
Chuyển sang edit mode, 「表示開始日時」 ở trạng thái có thể input

ステップ2：
Có thể thay đổi sang ngày từ hôm nay trở đi, ngày quá khứ không chọn được

ステップ3：
Trả về HTTP 200, hiển thị toast `更新しました。`, `publish_start_date` trong DB được update

補足：
・Đối với ngày tương lai, có thể thay đổi sang ngày từ hôm nay trở đi

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

## ACSMS-TC-031-039 — Cập nhật case bình thường (DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang mở `oshirase_id = 1` ở edit mode

### 手順

ステップ1：
Thay đổi タイトル, 内容

ステップ2：
Click button 「保存」

ステップ3：
Kiểm tra bảng `t_oshirase` trên DB

ステップ4：
Kiểm tra bảng `t_log` trên DB

### 期待結果

ステップ1：
Giá trị được thay đổi

ステップ2：
Trả về HTTP 200, hiển thị toast `更新しました。`, danh sách được reload, highlight được duy trì, edit mode được duy trì

ステップ3：
`title`, `content`, `updated_at` của `oshirase_id = 1` được update, `updated_by` khớp với account_id của NICHINO_ADMIN

ステップ4：
`log_type=1`, `operation='UPDATE'`, `result_status=1`, `target_id=1`, `before_value` và `after_value` được record đầy đủ dạng JSON

補足：
・Xử lý chính và record audit log thực thi trong cùng 1 transaction
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-002

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

## ACSMS-TC-031-040 — Cập nhật record đã xóa (NOT_FOUND)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã set `deleted_at` cho record `oshirase_id = 99` để test (đã xóa logical)

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase/99`

ステップ2：
Dùng DevTools gửi PUT `/api/v1/oshirase/99` với request body hợp lệ

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたお知らせが見つかりません。`)

ステップ2：
Trả về HTTP 404, không có thay đổi trong `t_oshirase`

補足：
・Record đã xóa logical bị loại bỏ khỏi đối tượng query bởi filter `deleted_at IS NULL`

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

## ACSMS-TC-031-041 — Cập nhật xử lý conflict khi chỉnh sửa đồng thời

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (cùng 1 account, 2 tab)
  - ・Cả 2 tab đều mở `oshirase_id = 1` ở edit mode

### 手順

ステップ1：
Trên tab A, thay đổi タイトル thành 「タイトルA」 và click 「保存」

ステップ2：
Sau khi tab A lưu xong, trên tab B, thay đổi タイトル thành 「タイトルB」 và click 「保存」

ステップ3：
Kiểm tra bảng `t_oshirase` và `t_log` trên DB

### 期待結果

ステップ1：
Update của tab A thành công, `updated_at` được update

ステップ2：
Update của tab B thành công (last-write-wins), `title` được update thành 「タイトルB」

ステップ3：
`title` mới nhất là 「タイトルB」, `t_log` record 2 lần thao tác UPDATE

補足：
・Optimistic lock chưa được implement ở spec hiện hành. Hoạt động last-write-wins
・Cả 2 thao tác đều được record vào audit log

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

Optimistic lock chưa implement. Hoạt động last-write-wins đã được approve làm spec.

## ACSMS-TC-031-042 — Xóa dialog xác nhận + xóa logical + audit log

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị record `oshirase_id = 1` trên danh sách
  - ・Trạng thái không tồn tại dữ liệu liên quan

### 手順

ステップ1：
Click button 「削除」 ở row có `oshirase_id = 1` trên danh sách

ステップ2：
Kiểm tra dialog xác nhận

ステップ3：
Click button 「はい」

ステップ4：
Kiểm tra bảng `t_oshirase` trên DB

ステップ5：
Kiểm tra bảng `t_log` trên DB

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị

ステップ2：
Hiển thị message `このお知らせを削除してもよろしいですか？`, hiển thị button 「はい」「いいえ」

ステップ3：
Trả về HTTP 200, hiển thị toast `削除しました。`, row tương ứng được loại bỏ khỏi danh sách

ステップ4：
`deleted_at` của `oshirase_id = 1` được set thời gian hiện tại, `updated_at` cũng được update, bị xóa logical

ステップ5：
`log_type=1`, `operation='DELETE'`, `result_status=1`, `target_id=1`, `before_value` record dữ liệu trước khi xóa dạng JSON, `after_value` là chuỗi rỗng

補足：
・Áp dụng verbatim văn án của message code ACSMS-MSG-031-003 (xác nhận) và ACSMS-MSG-031-004 (thành công)
・Là xóa logical (set `deleted_at`), không phải xóa physical

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

## ACSMS-TC-031-043 — Xóa hủy bỏ khi click 「いいえ」 trên dialog xác nhận

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị record `oshirase_id = 1` trên danh sách

### 手順

ステップ1：
Click button 「削除」 ở row có `oshirase_id = 1` trên danh sách

ステップ2：
Click button 「いいえ」 trên dialog xác nhận

ステップ3：
Kiểm tra bảng `t_oshirase` trên DB

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị

ステップ2：
Dialog đóng lại, xử lý xóa không được thực thi, DELETE request không được gửi

ステップ3：
`deleted_at` của `oshirase_id = 1` vẫn là NULL, record không có thay đổi

補足：
・Khi chọn 「いいえ」 thì không làm gì

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

## ACSMS-TC-031-044 — Xóa khi có dữ liệu liên quan (CONFLICT)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Record お知らせ liên kết với object liên quan (cố tình liên kết để test)

### 手順

ステップ1：
Click button 「削除」 của お知らせ có dữ liệu liên quan

ステップ2：
Click 「はい」 trên dialog xác nhận

ステップ3：
Kiểm tra bảng `t_oshirase` trên DB

### 期待結果

ステップ1：
Dialog xác nhận được hiển thị

ステップ2：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`), hiển thị toast error

ステップ3：
`deleted_at` vẫn là NULL, xóa logical không được thực thi

補足：
・Message code ACSMS-MSG-031-005 liên quan đến message CONFLICT của api.md
・DB schema hiện hành không có bảng tham chiếu, đây là kiểm tra integrity cho việc mở rộng tương lai

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

DB schema hiện hành không có bảng tham chiếu liên quan. Ghi nhận như quan điểm phụ thuộc vào bảng sẽ được thêm trong tương lai.

## ACSMS-TC-031-045 — Xóa rollback transaction khi fail

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Có record hiện hữu
  - ・Môi trường có thể inject error vào audit log INSERT

### 手順

ステップ1：
Inject error để audit log INSERT bị fail

ステップ2：
Click button 「削除」 và click 「はい」 trên dialog xác nhận

ステップ3：
Kiểm tra `t_oshirase` và `t_log` trên DB

### 期待結果

ステップ1：
Inject error hoạt động

ステップ2：
Trả về HTTP 500, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`

ステップ3：
`deleted_at` vẫn là NULL (rollback thành công), `t_log` record 1 dòng `log_type=3` (error log)

補足：
・Xử lý chính và record audit log thực thi trong cùng 1 transaction
・Nếu một bên nào fail thì toàn bộ rollback

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

## ACSMS-TC-031-046 — Error chung UNAUTHORIZED xử lý khi hết session

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn hình danh sách お知らせ
  - ・Force revoke Redis session bằng admin tool, hoặc đã qua 24h

### 手順

ステップ1：
Force revoke session

ステップ2：
Click button 「保存」 hoặc 「削除」

ステップ3：
Kiểm tra URL sau khi redirect

ステップ4：
Kiểm tra hành vi sau khi đăng nhập lại

### 期待結果

ステップ1：
Session đã hết hạn

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`), `useAuthStore().user` được clear

ステップ3：
Chuyển sang `/login` với query parameter `redirect` dạng `/login?redirect=/oshirase`

ステップ4：
Sau khi đăng nhập lại thành công, quay về màn hình `/oshirase`

補足：
・Trên màn hình login không hiển thị toast 「セッションが切れました…」

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

## ACSMS-TC-031-047 — Error chung BAD_REQUEST request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase/abc` (ID không phải số)

ステップ2：
Dùng DevTools gửi PUT `/api/v1/oshirase/1` với JSON không hợp lệ (`{invalid json}`) trong request body

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase?per_page=999`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`)

ステップ3：
Trả về HTTP 400 (per_page chỉ chấp nhận từ 1〜100)

補足：
・Error đầu vào request như path parameter sai kiểu・JSON parse error・parameter ngoài phạm vi

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

## ACSMS-TC-031-048 — Error chung VALIDATION_ERROR validation tổng hợp

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp POST `/api/v1/oshirase` với body có chứa nhiều field error (title trống・content 2001 ký tự・publish_location=99)

ステップ2：
Kiểm tra mảng `errors` trong response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Mảng `errors` chứa nhiều error theo từng field (title bắt buộc, content vượt độ dài, publish_location ngoài phạm vi)

補足：
・Trả về nhiều error trong 1 response
・Frontend dùng `useApiForm` để map `errors` theo từng field

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

## ACSMS-TC-031-049 — Error chung TOO_MANY_REQUESTS vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Gửi liên tục POST `/api/v1/oshirase` 101 lần trong 1 phút (vượt giới hạn mặc định 100 lần/phút/IP)

ステップ2：
Kiểm tra response từ lần thứ 101 trở đi

### 期待結果

ステップ1：
Đến lần thứ 100 trả về HTTP 200 hoặc 201

ステップ2：
Từ lần thứ 101 trở đi trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), hiển thị toast

補足：
・Decorator `@Throttle` của NestJS (tầng app) hoạt động
・Rate limit AWS WAF (tầng infra) verify riêng trên môi trường staging

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

## ACSMS-TC-031-050 — Error chung INTERNAL_SERVER_ERROR mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Môi trường có thể cố tình trigger DB connection error v.v.

### 手順

ステップ1：
Cắt connection DB hoặc dừng process BE

ステップ2：
Click button 「保存」 hoặc 「削除」

ステップ3：
Sau khi connection DB phục hồi, kiểm tra `t_log`

### 期待結果

ステップ1：
Đã chuyển sang trạng thái lỗi

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), hiển thị toast

ステップ3：
Error log được record (`log_type=3`, `result_status=2`), `error_message` chứa chi tiết lỗi

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

## ACSMS-TC-031-051 — Error chung NOT_FOUND お知らせ ID không tồn tại

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・`oshirase_id = 99999` không tồn tại trong DB

### 手順

ステップ1：
Dùng DevTools gọi trực tiếp GET `/api/v1/oshirase/99999`

ステップ2：
Dùng DevTools gửi PUT `/api/v1/oshirase/99999` với request body hợp lệ

ステップ3：
Dùng DevTools gọi trực tiếp DELETE `/api/v1/oshirase/99999`

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたお知らせが見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`), không có thay đổi trong `t_oshirase`

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`), không có thay đổi trong `t_oshirase`

補足：
・ID không tồn tại và ID đã xóa logical đều trả về cùng HTTP 404
・Khớp với message code ACSMS-MSG-031-009

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

## ACSMS-TC-031-052 — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang hiển thị màn hình danh sách お知らせ, đã nhập trong form

### 手順

ステップ1：
DevTools → Network → chuyển sang mode 「Offline」

ステップ2：
Click button 「保存」

ステップ3：
DevTools → Network → phục hồi mode online

ステップ4：
Click button 「保存」 lại

### 期待結果

ステップ1：
Đã chuyển sang mode offline

ステップ2：
Hiển thị toast `ネットワークエラーが発生しました…`, dữ liệu nhập trong form không bị mất, button quay về trạng thái active

ステップ3：
Đã phục hồi mode online

ステップ4：
Trả về HTTP 201 hoặc 200, hiển thị toast `登録しました。` hoặc `更新しました。`

補足：
・Dữ liệu nhập trong form không bị mất khi network error (UX retry)

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
