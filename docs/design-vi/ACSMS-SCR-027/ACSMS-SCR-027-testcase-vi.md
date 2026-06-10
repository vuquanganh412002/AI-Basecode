---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-027
screen_name: ロール管理画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình quản lý Role (ACSMS-SCR-027)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-027 | Tài liệu thiết kế Màn hình quản lý Role |
| 2 | ACSMS-SCR-027-api | Tài liệu thiết kế API quản lý Role |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation đầu vào — Màn edit | 13 |
| 5 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 9 |
| 6 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 43 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-027-001 — Cho phép NICHINO_ADMIN truy cập màn quản lý Role

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "ロール管理" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/roles` hoặc click link "ロール管理"

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/roles`

ステップ4：
Click button "編集" của một role bất kỳ (ví dụ role_id=3)

### 期待結果

ステップ1：
Sidebar hiển thị item "ロール管理" (chỉ NICHINO_ADMIN thao tác được)

ステップ2：
Hiển thị màn `/roles`, danh sách hiển thị 5 role (NICHINO_ADMIN/NICHINO_STAFF/CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN)

ステップ3：
Trả về HTTP 200, response dạng JSON (mảng `data` có 5 phần tử)

ステップ4：
Chuyển sang edit mode, panel cấu hình quyền được hiển thị, ロールコード ở trạng thái disable

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều cho phép truy cập
・`t_log` ghi lại log xem nếu cần (theo cấu hình)

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

Chức năng quản lý Role là dành riêng cho NICHINO_ADMIN. Theo `api.md §4.2`, kiểm tra trực tiếp `role_code = 'NICHINO_ADMIN'` thay vì permission_code.

## ACSMS-TC-027-002 — Cấm truy cập màn quản lý Role với role NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "ロール管理" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/roles`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/roles`

ステップ4：
Dùng DevTools gọi PUT `/api/v1/roles/3` với request body hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "ロール管理"

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`), không có update vào `m_roles`, có ghi error log vào `t_log`

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Không có thay đổi vào `m_roles` và `m_roles_permissions`

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

## ACSMS-TC-027-003 — Cấm truy cập màn quản lý Role với role CHUOKAI

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "ロール管理" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/roles`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/permissions`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "ロール管理"

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・Cả 3 tầng đều block
・Không có thay đổi DB, có ghi error log

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

CHUOKAI không có chức năng quản lý role xuyên JA (chỉ quản lý account trong chuokai của mình).

## ACSMS-TC-027-004 — Cấm truy cập màn quản lý Role với role JA_HONTEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "ロール管理" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/roles`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/roles/1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "ロール管理"

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・JA_HONTEN chỉ có quyền quản lý account trong JA của mình, không có quyền sửa định nghĩa role

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

## ACSMS-TC-027-005 — Cấm truy cập màn quản lý Role với role JA_KANRI_SHITEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "ロール管理" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/roles`

ステップ3：
Dùng DevTools gọi PUT `/api/v1/roles/5` với request body hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "ロール管理"

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`), không có thay đổi vào `m_roles_permissions`

補足：
・JA_KANRI_SHITEN chỉ có quyền quản lý độc giả thuộc chi nhánh quản lý của mình
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

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-027-006 — Layout tổng thể màn danh sách Role khớp với spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click link "ロール管理" trên sidebar

ステップ2：
So sánh màn hình với tài liệu thiết kế (screen-design.md / index.html)

ステップ3：
Kiểm tra cấu trúc cột của table danh sách (編集 / ロールコード / ロール名 / 説明)

### 期待結果

ステップ1：
Hiển thị màn `/roles`

ステップ2：
Background color, font, font size, padding, button color, table style — tất cả khớp với spec

ステップ3：
Table hiển thị 4 cột "編集", "ロールコード", "ロール名", "説明", có 5 dòng tương ứng 5 role

補足：
・Design tokens (`design-tokens.ts`) được áp dụng (không có color hard-code)
・Trạng thái khởi tạo là chế độ xem (panel cấu hình quyền bị ẩn)

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

## ACSMS-TC-027-007 — Layout edit mode + hiển thị panel cấu hình quyền

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại role `role_id = 3` (CHUOKAI)

### 手順

ステップ1：
Click button "編集" của row CHUOKAI trong danh sách

ステップ2：
Kiểm tra form nhập thông tin role ở phần trên

ステップ3：
Kiểm tra panel cấu hình quyền ở phần dưới màn hình

ステップ4：
Kiểm tra vị trí button "保存" và "クリア"

### 期待結果

ステップ1：
Chuyển sang edit mode, gọi `GET /api/v1/roles/3`

ステップ2：
ロールコード (disable), ロール名, 説明 hiển thị giá trị hiện tại

ステップ3：
Hiển thị danh sách quyền (43 quyền) dưới dạng checkbox, các quyền đang được gán có checkbox ON, có checkbox "全選択" ở đầu danh sách

ステップ4：
Button "保存" là button chính (xanh) ở bên trái, button "クリア" là button phụ ở bên phải

補足：
・Ô nhập ロールコード ở chế độ read-only (có thuộc tính `disabled`)
・Tuân thủ design tokens, không sai khác visual

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

## ACSMS-TC-027-008 — Responsive — Breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Set kích thước cửa sổ 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (tablet)

ステップ3：
Đổi sang 375×667 (mobile)

### 期待結果

ステップ1：
Sidebar cố định, form thông tin role và panel cấu hình quyền hiển thị theo bố cục thiết kế (ngang hoặc dọc)

ステップ2：
Sidebar gập lại, form giữ nguyên, checkbox quyền tự xuống dòng

ステップ3：
Sidebar overlay, form xếp dọc, không có scroll ngang, checkbox quyền xếp dọc

補足：
・Không vỡ layout ở cả 3 breakpoint
・Tất cả form element vẫn thao tác được

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

## ACSMS-TC-027-009 — Form element — textbox / checkbox / button đúng spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Kiểm tra ô nhập ロール名 (textbox)

ステップ2：
Kiểm tra ô nhập 説明 (textarea)

ステップ3：
Kiểm tra nhóm checkbox quyền

ステップ4：
Kiểm tra checkbox "全選択"

### 期待結果

ステップ1：
ロール名 là textbox 1 dòng, placeholder "ロール名を入力してください" hoặc tương đương, label có dấu required màu đỏ "*" ở cuối

ステップ2：
説明 là textarea nhiều dòng, nếu có counter ký tự thì hiển thị dạng "0/200"

ステップ3：
Mỗi quyền có 1 checkbox, row của quyền đang chọn được highlight

ステップ4：
Checkbox "全選択" ở đầu danh sách quyền, ON chọn tất cả, OFF bỏ chọn tất cả

補足：
・Thứ tự hiển thị element đúng spec
・Focus từ bàn phím hiển thị rõ (focus outline)

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

## ACSMS-TC-027-010 — Tab order và thao tác bằng bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Focus vào ô nhập ロール名, nhấn Tab liên tục

ステップ2：
Trên checkbox quyền, nhấn phím Space

ステップ3：
Trong ô nhập ロール名, nhấn Enter để confirm IME (chế độ nhập tiếng Nhật)

ステップ4：
Focus button "保存", nhấn Enter

### 期待結果

ステップ1：
Tab order chạy tự nhiên từ trên xuống dưới, trái sang phải ("ロール名 → 説明 → 全選択 → từng quyền → 保存 → クリア")

ステップ2：
Checkbox được ON/OFF tương ứng

ステップ3：
Form KHÔNG bị submit (IME confirm Enter được block bởi `preventEnterImplicitSubmit`)

ステップ4：
Form được submit (gọi PUT `/api/v1/roles/{role_id}`)

補足：
・Toàn bộ thao tác làm được chỉ bằng bàn phím
・Focus outline rõ ràng

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

Không submit nhầm khi IME confirm Enter — edge case đặc thù của hệ thống business tiếng Nhật.

## ACSMS-TC-027-011 — Độ tin cậy của button (double-click, click liên tục)

- 観点ID: VP-E-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã thay đổi ロール名 trong edit mode

### 手順

ステップ1：
Double-click button "保存"

ステップ2：
Click button "保存" liên tục 10 lần

ステップ3：
Kiểm tra số lần phát sinh PUT request trong tab Network của DevTools

### 期待結果

ステップ1：
Chỉ phát sinh 1 request (các click thứ 2 trở đi bị vô hiệu)

ステップ2：
Không phát sinh request trùng lặp, button bị disable khi đang xử lý

ステップ3：
Số lần phát sinh request PUT `/api/v1/roles/{role_id}` là 1 lần

補足：
・Không bị submit 2 lần, không bị update 2 lần
・Sau khi xử lý xong, button trở về trạng thái active

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

## ACSMS-TC-027-012 — Hiển thị header title

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Mở màn `/roles`

ステップ2：
Kiểm tra title của browser tab và title trên đầu màn hình

### 期待結果

ステップ1：
Hiển thị màn hình

ステップ2：
Browser tab hiển thị title tương đương "購読者管理システム - ロール管理画面", header phía trên hiển thị "ロール管理画面"

補足：
・Page title được render tự động bởi `MainLayout > AppHeader` từ `route.meta.breadcrumb`
・View không render title trùng lặp

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

## ACSMS-TC-027-013 — Hiển thị icon thông báo + user menu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra icon thông báo ở góc phải trên header

ステップ2：
Click vào user menu (avatar)

ステップ3：
Click link "ログアウト" trong user menu

### 期待結果

ステップ1：
Hiển thị icon thông báo, badge unread hiển thị đúng

ステップ2：
User menu xổ dropdown, hiển thị tên user và tên role đang login

ステップ3：
Thực hiện logout, chuyển về `/login`, session bị hủy

補足：
・Element header hiển thị nhất quán ở mọi màn hình

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

## ACSMS-TC-027-014 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra breadcrumb của màn `/roles`

ステップ2：
Click link "ホーム" trên breadcrumb

ステップ3：
Sau khi vào edit mode, kiểm tra lại cấu trúc breadcrumb

### 期待結果

ステップ1：
Hiển thị 2 cấp dạng "ホーム > ロール管理画面"

ステップ2：
Chuyển về `/dashboard`

ステップ3：
Trong edit mode, breadcrumb vẫn là "ホーム > ロール管理画面" (đổi mode không đổi URL)

補足：
・Các link trên breadcrumb hoạt động bình thường
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

# カテゴリ 4: Validation đầu vào — Màn edit

## ACSMS-TC-027-015 — ロールコード read-only (không edit được)

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3` (CHUOKAI)

### 手順

ステップ1：
Đặt cursor vào ô ロールコード, thử nhập ký tự

ステップ2：
Chọn ô ロールコード, nhấn Delete

ステップ3：
Dùng DevTools gửi PUT `/api/v1/roles/3` với request body có thêm `role_code: "MODIFIED"`

### 期待結果

ステップ1：
Ô nhập ở trạng thái disable, không nhập được ký tự

ステップ2：
Giá trị hiện tại ("CHUOKAI") không bị xóa

ステップ3：
Trả về HTTP 200 (thành công), nhưng giá trị `m_roles.role_code` vẫn giữ là "CHUOKAI" không bị thay đổi (BE silent drop trường role_code)

補足：
・FE block edit bằng thuộc tính `disabled`
・BE cũng bỏ qua `role_code` (kể cả khi có trong request)
・Read-only được đảm bảo ở cả FE và BE để defense in depth

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

Theo tài liệu API, role_code KHÔNG đưa vào request. Nếu attacker đưa vào thì BE sẽ bỏ qua.

## ACSMS-TC-027-016 — ロール名 — Required check (rỗng + chỉ ký tự space)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Để trống ô ロール名, click button "保存"

ステップ2：
Nhập chỉ space half-width (ví dụ "   ") vào ô ロール名, click button "保存"

ステップ3：
Nhập chỉ space full-width (ví dụ "　　") vào ô ロール名, click button "保存"

### 期待結果

ステップ1：
Hiển thị lỗi required `必須項目です。` dưới ô ロール名, request PUT không được gửi

ステップ2：
Sau khi trim trước/sau thì trở thành rỗng, hiển thị lỗi required `必須項目です。`

ステップ3：
Space full-width cũng được xử lý như blank, hiển thị lỗi required `必須項目です。`

補足：
・Message lỗi hiển thị inline dưới `<a-form-item :help>`
・Không phải toast, hiển thị ngay dưới field
・BE cũng áp dụng `@Transform(blankToUndef)` trước required check để convert blank thành undefined

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

Message code ACSMS-MSG-027-004 (screen-design.md §メッセージ情報).

## ACSMS-TC-027-017 — ロール名 — Giới hạn tối đa 20 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Nhập 1 ký tự (biên dưới) vào ô ロール名, click button "保存"

ステップ2：
Nhập chính xác 20 ký tự (ví dụ "あいうえおかきくけこさしすせそたちつてと"), click button "保存"

ステップ3：
Thử nhập 21 ký tự

ステップ4：
Paste chuỗi 30 ký tự vào ô ロール名

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 200

ステップ2：
Lưu thành công, 20 ký tự được lưu vào DB

ステップ3：
Bị block input (thuộc tính maxLength=20 của input không cho nhập ký tự thứ 21 trở đi)

ステップ4：
Chuỗi bị cắt còn 20 ký tự khi paste

補足：
・FE giới hạn input bằng thuộc tính `maxLength=20`
・BE cũng validate lại bằng `@MaxLength(20)`
・Đếm 20 ký tự không phân biệt half-width/full-width

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

## ACSMS-TC-027-018 — ロール名 — Chấp nhận ký tự half-width (chữ số + ký hiệu)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Nhập "Admin Role" (chữ half-width + space) vào ô ロール名, click button "保存"

ステップ2：
Nhập "Role-001_v2" (alphanumeric half-width + ký hiệu) vào ô ロール名, click button "保存"

### 期待結果

ステップ1：
Lưu thành công, DB lưu giá trị "Admin Role"

ステップ2：
Lưu thành công, DB lưu giá trị "Role-001_v2"

補足：
・Chấp nhận chữ số half-width và ký hiệu không hạn chế

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

## ACSMS-TC-027-019 — ロール名 — Chấp nhận ký tự full-width (Kanji / Hiragana / Katakana)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Nhập "中央会管理者" (Kanji) vào ô ロール名, click button "保存"

ステップ2：
Nhập "ちゅうおうかい" (Hiragana) vào ô ロール名, click button "保存"

ステップ3：
Nhập "チュウオウカイ" (Katakana) vào ô ロール名, click button "保存"

### 期待結果

ステップ1：
Lưu thành công, DB lưu giá trị "中央会管理者"

ステップ2：
Lưu thành công, DB lưu giá trị "ちゅうおうかい"

ステップ3：
Lưu thành công, DB lưu giá trị "チュウオウカイ"

補足：
・Ký tự full-width (Kanji/Hiragana/Katakana) được nhập, lưu và hiển thị đúng
・Không bị mojibake (lỗi font)

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

## ACSMS-TC-027-020 — ロール名 — Xử lý an toàn ký tự đặc biệt / SQL injection / XSS

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Nhập `<script>alert(1)</script>` vào ô ロール名, click button "保存"

ステップ2：
Nhập `'; DROP TABLE m_roles; --` vào ô ロール名, click button "保存"

ステップ3：
Nhập `<img src=x onerror=alert(1)>` vào ô ロール名, click button "保存"

ステップ4：
Sau khi lưu, mở lại màn danh sách và kiểm tra text hiển thị ở cột ロール名

### 期待結果

ステップ1：
Trả về HTTP 200, DB lưu literal `<script>alert(1)</script>`, khi hiển thị lại KHÔNG thực thi script

ステップ2：
Trả về HTTP 200, DB lưu literal `'; DROP TABLE m_roles; --`, table `m_roles` không bị phá hoại

ステップ3：
Trả về HTTP 200, DB lưu literal `<img src=x onerror=alert(1)>`, khi hiển thị lại KHÔNG load image / thực thi script

ステップ4：
Cột ロール名 hiển thị dạng plain text, các HTML tag được escape

補足：
・XSS được tự động escape bởi `{{ }}` của Vue
・SQL injection được phòng vệ bởi parameterized query của TypeORM
・Không thực thi JS, không phá hoại data

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

## ACSMS-TC-027-021 — ロール名 — Tự động trim space trước/sau

- 観点ID: VP-B-09
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Nhập "  Admin Role  " (có space half-width ở trước/sau) vào ô ロール名, click button "保存"

ステップ2：
Kiểm tra giá trị `m_roles.role_name` trong DB

ステップ3：
Paste "Admin Role" vào ô ロール名, kiểm tra cách xử lý khi IME confirm có thêm space

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 200

ステップ2：
Space trước/sau bị loại bỏ, DB chỉ lưu "Admin Role"

ステップ3：
Space trước/sau khi paste và space khi IME confirm được trim trước submit, giá trị hiển thị trên ô input cũng cập nhật về giá trị đã trim

補足：
・FE thực hiện `value.trim()` trước submit
・Cả khi paste và khi IME confirm Enter đều hoạt động

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

## ACSMS-TC-027-022 — 説明 — Trường tuỳ chọn (cho phép rỗng)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode
  - ・ロール名 đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống ô 説明, click button "保存"

ステップ2：
Kiểm tra giá trị `m_roles.description` trong DB

### 期待結果

ステップ1：
Lưu thành công, trả về HTTP 200, ô 説明 không hiển thị lỗi required

ステップ2：
`description` được lưu vào DB dưới dạng empty string hoặc NULL

補足：
・Label của 説明 KHÔNG có dấu required (đỏ "*")
・Không phát sinh lỗi validation khi để trống

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

## ACSMS-TC-027-023 — 説明 — Giới hạn tối đa 200 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode
  - ・ロール名 đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập đúng 200 ký tự vào ô 説明, click button "保存"

ステップ2：
Thử nhập 201 ký tự

ステップ3：
Paste chuỗi 250 ký tự vào ô 説明

ステップ4：
Gửi trực tiếp PUT request với `description` ≥ 201 ký tự qua DevTools

### 期待結果

ステップ1：
Lưu thành công, 200 ký tự được lưu vào DB

ステップ2：
Bị block input (thuộc tính maxLength=200 không cho nhập ký tự thứ 201 trở đi)

ステップ3：
Chuỗi bị cắt còn 200 ký tự khi paste

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `説明は200文字以内で入力してください。`)

補足：
・FE giới hạn input bằng `maxLength=200`
・BE cũng validate lại bằng `@MaxLength(200)`
・Sử dụng nguyên văn message code ACSMS-MSG-027-007

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

## ACSMS-TC-027-024 — 説明 — Chấp nhận newline / ký tự full-width

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode
  - ・ロール名 đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập text nhiều dòng (có newline) vào ô 説明, click button "保存"

ステップ2：
Sau khi lưu, mở lại edit mode và kiểm tra ô 説明

ステップ3：
Nhập "中央会管理者ロール" (mix Kanji) vào ô 説明, click button "保存"

### 期待結果

ステップ1：
Lưu thành công, ký tự newline (`\n`) được lưu nguyên trong DB

ステップ2：
Newline được giữ nguyên khi hiển thị lại trong textarea

ステップ3：
Lưu thành công, Kanji/Hiragana/Katakana được lưu và hiển thị đúng

補足：
・Có thể đăng ký bao gồm cả newline
・Ký tự full-width được nhập, lưu và hiển thị đúng

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

## ACSMS-TC-027-025 — Checkbox quyền — Tick / bỏ tick từng quyền

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3` (CHUOKAI)
  - ・Ban đầu quyền `dokusya.create` đang được gán

### 手順

ステップ1：
Đổi checkbox của quyền "`dokusya.create`" sang OFF

ステップ2：
Đổi checkbox của quyền "`dokusya.delete`" (ban đầu OFF) sang ON

ステップ3：
Click button "保存"

ステップ4：
Kiểm tra table `m_roles_permissions` trong DB

### 期待結果

ステップ1：
Checkbox bị bỏ tick, highlight của row tương ứng bị bỏ

ステップ2：
Checkbox được tick, row tương ứng được highlight

ステップ3：
Lưu thành công, trả về HTTP 200, hiển thị toast `更新しました。`

ステップ4：
Trong các row thuộc `role_id=3`: row của `dokusya.create` có `deleted_at IS NOT NULL` (logical delete), row của `dokusya.delete` được INSERT mới

補足：
・Update chạy trong transaction theo thứ tự "logical delete quyền cũ → INSERT quyền mới"
・Row của quyền đang chọn được highlight

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

## ACSMS-TC-027-026 — Checkbox quyền — Chọn tất cả / bỏ chọn tất cả

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 5` (JA_KANRI_SHITEN)

### 手順

ステップ1：
Đổi checkbox "全選択" sang ON

ステップ2：
Đổi vài checkbox quyền cụ thể sang OFF

ステップ3：
Đổi checkbox "全選択" sang OFF

ステップ4：
Sau khi đổi "全選択" về ON, click button "保存"

### 期待結果

ステップ1：
Tất cả checkbox quyền cụ thể tự động chuyển ON

ステップ2：
Chỉ các quyền OFF mới bị bỏ tick, checkbox "全選択" chuyển trạng thái indeterminate (chọn 1 phần)

ステップ3：
Tất cả checkbox quyền cụ thể tự động chuyển OFF

ステップ4：
Trả về HTTP 200, `m_roles_permissions` đăng ký đủ 43 quyền

補足：
・"全選択" thao tác hàng loạt theo trạng thái ON/OFF
・Trạng thái chọn 1 phần (indeterminate) phải hiển thị dễ nhận biết

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

## ACSMS-TC-027-027 — Checkbox quyền — Validation khi gửi permission_id không hợp lệ

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3`

### 手順

ステップ1：
Dùng DevTools gửi PUT `/api/v1/roles/3` với request body chứa `permission_ids: [1, 2, 99999]` (99999 không tồn tại)

ステップ2：
Dùng DevTools gửi PUT `/api/v1/roles/3` với request body chứa `permission_ids: "not-an-array"` (không phải mảng)

ステップ3：
Dùng DevTools gửi PUT `/api/v1/roles/3` với request body chứa `permission_ids: [1, "abc"]` (có phần tử không phải số)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors` chứa "指定された権限が見つかりません"), `m_roles_permissions` không có thay đổi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message thông báo `permission_ids` phải là mảng)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message thông báo mỗi phần tử phải là số)

補足：
・BE check sự tồn tại bằng cách query table `m_permissions`
・Nếu có ít nhất 1 permission_id không tồn tại thì reject toàn bộ transaction

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

# カテゴリ 5: Logic nghiệp vụ — Cập nhật (Function — Edit)

## ACSMS-TC-027-028 — Click button 編集 — Load data + chuyển edit mode

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang ở chế độ xem (chế độ list)

### 手順

ステップ1：
Click button "編集" của `role_id = 3` (CHUOKAI) trong danh sách

ステップ2：
Kiểm tra các API request trong tab Network của DevTools

ステップ3：
Kiểm tra giá trị hiển thị ở edit mode

### 期待結果

ステップ1：
Chuyển sang edit mode, form thông tin role và panel cấu hình quyền được hiển thị

ステップ2：
Gọi GET `/api/v1/roles/3` và GET `/api/v1/permissions`, cả 2 đều trả về HTTP 200

ステップ3：
ロールコード "CHUOKAI" (disable), ロール名 "中央会", 説明 "中央会アカウント" được hiển thị, tất cả checkbox của quyền đang gán đều ON

補足：
・Lấy data mới nhất khi chuyển sang edit mode
・Phản ánh quyền hiện tại lên panel cấu hình quyền

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

## ACSMS-TC-027-029 — Cập nhật chính thường (lưu DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3` (CHUOKAI)

### 手順

ステップ1：
Đổi ロール名 thành "中央会（更新後）", 説明 thành "中央会アカウント（更新）", thêm 1 quyền, click button "保存"

ステップ2：
Kiểm tra table `m_roles` trong DB

ステップ3：
Kiểm tra table `m_roles_permissions` trong DB

ステップ4：
Kiểm tra table `t_log` trong DB

### 期待結果

ステップ1：
Trả về HTTP 200, hiển thị toast `更新しました。`, tự chuyển về chế độ xem, danh sách role được reload

ステップ2：
`role_name` của `role_id = 3` thành "中央会（更新後）", `description` thành "中央会アカウント（更新）", `updated_at` đổi sang thời điểm update, `updated_by` khớp với account_id của NICHINO_ADMIN

ステップ3：
Tất cả quyền cũ có `deleted_at IS NOT NULL` (logical delete), quyền mới được INSERT

ステップ4：
`log_type=1`, `operation='UPDATE'`, `result_status=1`, `target_table='m_roles'`, `target_id=3`, `before_value` và `after_value` được ghi đầy đủ dạng JSON, `gamen_name='ロール管理画面 (ACSMS-SCR-027)'`

補足：
・Xử lý chính và audit log được thực hiện trong cùng 1 transaction
・Sử dụng nguyên văn message code ACSMS-MSG-027-001

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

## ACSMS-TC-027-030 — Cập nhật — Bỏ tất cả quyền (cho phép cập nhật bằng mảng rỗng)

- 観点ID: VP-C-01
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 5` (JA_KANRI_SHITEN)

### 手順

ステップ1：
Đổi checkbox "全選択" sang OFF, bỏ tick tất cả quyền

ステップ2：
Click button "保存"

ステップ3：
Kiểm tra table `m_roles_permissions` trong DB

### 期待結果

ステップ1：
Tất cả checkbox quyền cụ thể chuyển OFF

ステップ2：
Trả về HTTP 200, request gửi với `permission_ids: []` (mảng rỗng), hiển thị toast `更新しました。`

ステップ3：
Tất cả quyền cũ có `deleted_at IS NOT NULL`, không có INSERT mới, số quyền active thuộc `role_id = 5` là 0

補足：
・Cập nhật với mảng rỗng là thao tác hợp lệ "bỏ tất cả quyền" theo API spec §4.4.3
・User thuộc role này sẽ ở trạng thái không có quyền, cần lưu ý vận hành

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

## ACSMS-TC-027-031 — Cập nhật — Xử lý xung đột khi edit đồng thời

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (cùng 1 account với 2 tab)
  - ・Cả 2 tab đều mở edit mode `role_id = 3` (CHUOKAI)

### 手順

ステップ1：
Trên tab A đổi ロール名 thành "中央会A版", click button "保存"

ステップ2：
Sau khi tab A lưu xong, trên tab B đổi ロール名 thành "中央会B版", click button "保存"

ステップ3：
Kiểm tra table `m_roles` và `t_log` trong DB

### 期待結果

ステップ1：
Tab A update thành công, trả về HTTP 200, `updated_at` được cập nhật

ステップ2：
Tab B update cũng thành công (after-write wins), trả về HTTP 200, `role_name` được cập nhật thành "中央会B版"

ステップ3：
`role_name` mới nhất là "中央会B版", `t_log` ghi nhận 2 thao tác UPDATE

補足：
・Optimistic lock hiện chưa được implement. Hành vi after-write wins
・Cả 2 thao tác đều được ghi audit log
・Spec này là đối tượng để xem xét implement optimistic lock trong tương lai

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

Optimistic lock chưa implement. Hành vi after-write wins đã được approve là spec.

## ACSMS-TC-027-032 — Cập nhật — Role đã bị xóa (NOT_FOUND)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã set sẵn `deleted_at` cho record `role_id = 99` (đã logical delete) phục vụ test

### 手順

ステップ1：
Dùng DevTools gọi GET `/api/v1/roles/99`

ステップ2：
Dùng DevTools gọi PUT `/api/v1/roles/99` với request body hợp lệ

ステップ3：
Thử thao tác edit role 99 trên UI (truy cập trực tiếp URL `/roles?edit=99`...)

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたロールが見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`), `m_roles` không có thay đổi

ステップ3：
Hiển thị error toast (ví dụ `ロール #99 が見つかりません` hoặc tương đương), quay về màn danh sách

補足：
・Record đã logical delete bị loại trừ bằng filter `deleted_at IS NULL`
・Sử dụng nguyên văn message code ACSMS-MSG-027-002

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

Message code ACSMS-MSG-027-002 dưới dạng `ロール #{id} が見つかりません` nhưng trong api.md エラー一覧 đã thống nhất `指定されたロールが見つかりません。`. Qua API thì bản này là chính thức.

## ACSMS-TC-027-033 — Trạng thái DB và log khi cập nhật fail (rollback transaction)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3`
  - ・Có môi trường để chủ động trigger lỗi kết nối DB

### 手順

ステップ1：
Inject lỗi vào audit log INSERT

ステップ2：
Click button "保存" với input hợp lệ

ステップ3：
Kiểm tra `m_roles`, `m_roles_permissions`, `t_log` trong DB

### 期待結果

ステップ1：
Inject error đã có hiệu lực

ステップ2：
Trả về HTTP 500, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`

ステップ3：
Giá trị `m_roles` giữ nguyên giá trị trước update (rollback thành công), `m_roles_permissions` cũng giữ nguyên, `t_log` có 1 row với `log_type=3` (error log), `result_status=2` (fail)

補足：
・Xử lý chính và audit log record chạy trong cùng 1 transaction
・Nếu 1 trong 2 fail thì rollback toàn bộ
・Error log (log_type=3) được ghi separately ngoài transaction
・Sử dụng nguyên văn message code ACSMS-MSG-027-003

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

Tính toàn vẹn của audit log là yêu cầu pháp lý. Critical.

## ACSMS-TC-027-034 — クリア — Khi không có thay đổi (không hiển thị modal confirm)

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3`
  - ・Chưa thay đổi giá trị form

### 手順

ステップ1：
Ngay sau khi vào edit mode, không thay đổi gì, click button "クリア"

ステップ2：
Kiểm tra trạng thái form

### 期待結果

ステップ1：
Không hiển thị modal confirm, form được reset về trạng thái ban đầu (chế độ xem)

ステップ2：
Ô nhập thông tin role rỗng hoặc giá trị khởi tạo, panel cấu hình quyền bị ẩn, chuyển về chế độ xem

補足：
・Logic check thay đổi được implement bằng cách "so sánh giá trị lấy ban đầu với giá trị form hiện tại"
・Khi không có thay đổi thì click クリア không hiển thị cảnh báo

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

## ACSMS-TC-027-035 — クリア — Khi có thay đổi (hiển thị modal confirm)

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode với `role_id = 3`

### 手順

ステップ1：
Đổi ロール名 thành "中央会X" (tạo trạng thái có thay đổi)

ステップ2：
Click button "クリア"

ステップ3：
Click button "いいえ" trên modal confirm

ステップ4：
Click lại button "クリア", click button "はい" trên modal confirm

### 期待結果

ステップ1：
Ô nhập ロール名 hiển thị "中央会X"

ステップ2：
Modal confirm được hiển thị, hiển thị message `未保存データがあります。クリアしますか。`, có button "はい" và "いいえ"

ステップ3：
Không có gì xảy ra, giữ nguyên màn hình hiện tại (edit mode có thay đổi), ô ロール名 vẫn là "中央会X"

ステップ4：
Tất cả input/lựa chọn bị clear, quay về chế độ xem, panel cấu hình quyền bị ẩn

補足：
・Sử dụng nguyên văn message code ACSMS-MSG-027-005
・Modal confirm được implement bằng `BaseConfirmModal` hoặc `Modal.confirm`
・Label "はい"/"いいえ" theo project convention

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

## ACSMS-TC-027-036 — Reload màn danh sách phản ánh nội dung update

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đổi ロール名 trong edit mode của `role_id = 3`

### 手順

ステップ1：
Click button "保存", đợi update thành công

ステップ2：
Sau khi quay về chế độ xem, kiểm tra table danh sách

ステップ3：
Reload browser (F5) và hiển thị lại danh sách

### 期待結果

ステップ1：
Trả về HTTP 200, hiển thị toast `更新しました。`

ステップ2：
Danh sách role tự reload, row của `role_id = 3` hiển thị ロール名 mới

ステップ3：
Sau khi reload browser, row của `role_id = 3` vẫn hiển thị ロール名 mới (khớp với DB)

補足：
・Sau update thành công, reload danh sách role để phản ánh thay đổi
・Tự chuyển về chế độ xem

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

# カテゴリ 6: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-027-037 — Lỗi chung UNAUTHORIZED — Xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode
  - ・Session ở Redis đã bị revoke bằng admin tool hoặc đã quá 24h

### 手順

ステップ1：
Revoke session

ステップ2：
Click button "保存" ở edit mode

ステップ3：
Kiểm tra URL sau khi redirect

ステップ4：
Sau khi login lại, kiểm tra hành vi

### 期待結果

ステップ1：
Session đã hết hạn

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`), `useAuthStore().user` được clear

ステップ3：
Chuyển sang `/login` với query parameter `redirect` (ví dụ `/login?redirect=/roles`)

ステップ4：
Sau khi login lại thành công, quay lại màn `/roles`

補足：
・Trên màn login không hiển thị toast "セッションが切れました…" (form login đã thể hiện trạng thái)
・Spec hiện tại không giữ lại data input đang edit (đã ghi rõ trong UX guide)

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

## ACSMS-TC-027-038 — Lỗi chung BAD_REQUEST — Request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gọi GET `/api/v1/roles/abc` (ID không phải số)

ステップ2：
Dùng DevTools gọi PUT `/api/v1/roles/3` với JSON không hợp lệ (`{invalid json}`)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`)

補足：
・Lỗi đầu vào như sai type path parameter / JSON parse error
・Không leak chi tiết lỗi từ server

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

## ACSMS-TC-027-039 — Lỗi chung VALIDATION_ERROR — Gửi gộp các trường thiếu required

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Dùng DevTools gửi PUT `/api/v1/roles/3` với request body `{ "role_name": "", "description": "..." 300 ký tự, "permission_ids": [] }` (nhiều trường lỗi)

ステップ2：
Kiểm tra mảng `errors` trong response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Mảng `errors` chứa lỗi từng trường (`role_name: 必須項目です。`, `description: 説明は200文字以内で入力してください。`...)

補足：
・Trả về nhiều lỗi của nhiều field trong 1 response
・`useApiForm` của FE map `errors` về `<a-form-item :help>` theo từng field

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

## ACSMS-TC-027-040 — Lỗi chung TOO_MANY_REQUESTS — Vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode

### 手順

ステップ1：
Gửi PUT `/api/v1/roles/3` 101 lần liên tục trong 1 phút (vượt rate limit default 100 req/phút/IP)

ステップ2：
Kiểm tra response từ lần thứ 101 trở đi

### 期待結果

ステップ1：
Từ lần thứ 1 đến lần thứ 100 trả về HTTP 200

ステップ2：
Từ lần thứ 101 trở đi trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), hiển thị toast

補足：
・NestJS `@Throttle` decorator (tầng application) đang hoạt động
・Rate limit của AWS WAF (tầng infrastructure) test riêng ở staging
・Button bị tạm thời vô hiệu

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

## ACSMS-TC-027-041 — Lỗi chung INTERNAL_SERVER_ERROR — Mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã mở edit mode
  - ・Có môi trường để chủ động trigger lỗi kết nối DB

### 手順

ステップ1：
Ngắt kết nối DB hoặc dừng BE process

ステップ2：
Click button "保存" ở edit mode

ステップ3：
Sau khi khôi phục kết nối DB, kiểm tra `t_log`

### 期待結果

ステップ1：
Đã chuyển sang trạng thái sự cố

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), hiển thị toast

ステップ3：
Có ghi error log (`log_type=3`, `result_status=2`), `error_message` chứa chi tiết lỗi

補足：
・Stack trace không leak ra client
・Server log ghi stack trace chi tiết
・Khớp với message code ACSMS-MSG-027-003

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

## ACSMS-TC-027-042 — Lỗi chung NOT_FOUND — Role ID không tồn tại

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login
  - ・`role_id = 99999` không tồn tại trong DB

### 手順

ステップ1：
Dùng DevTools gọi GET `/api/v1/roles/99999`

ステップ2：
Dùng DevTools gọi PUT `/api/v1/roles/99999` với request body hợp lệ

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたロールが見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`), `m_roles` không có thay đổi

補足：
・ID không tồn tại và ID đã logical delete đều trả về cùng 404
・Khớp với message code ACSMS-MSG-027-002

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

## ACSMS-TC-027-043 — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập trong edit mode

### 手順

ステップ1：
DevTools → Network → chuyển sang chế độ "Offline"

ステップ2：
Click button "保存"

ステップ3：
DevTools → Network → khôi phục online

ステップ4：
Click lại button "保存"

### 期待結果

ステップ1：
Đã chuyển sang offline mode

ステップ2：
Hiển thị toast `ネットワークエラーが発生しました…`, data nhập trong form không bị mất, button trở về trạng thái active

ステップ3：
Đã khôi phục online

ステップ4：
Trả về HTTP 200, hiển thị toast `更新しました。`

補足：
・Data form không bị mất khi có lỗi network (UX retry)
・Toast sử dụng message lỗi mạng chung của app

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
