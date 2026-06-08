---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-003
screen_name: 単価マスタ登録画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-27
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-04-21 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình đăng ký Master Đơn giá (ACSMS-SCR-003)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-003 | Tài liệu thiết kế Màn hình đăng ký Master Đơn giá |
| 2 | ACSMS-SCR-003-api | Tài liệu thiết kế API đăng ký Đơn giá |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 4 |
| 4 | Validation đầu vào — Màn đăng ký | 40 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 8 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 6 |
| 8 | Bổ sung cuối tài liệu (sẽ phân loại lại vào カテゴリ 6 ở lần sau) | 1 |
|  | Tổng | 78 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-003-001 — Cấm truy cập màn đăng ký Master Đơn giá với role NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "単価マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/tanka/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/tanka` với request body hợp lệ

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "単価マスタ" (do không có quyền `tanka.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Không có row mới trong `m_tanka`
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

## ACSMS-TC-003-002 — Cấm truy cập màn đăng ký Master Đơn giá với role NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "単価マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/tanka/create`

ステップ3：
Gọi trực tiếp POST `/api/v1/tanka`

### 期待結果

ステップ1：
Sidebar không hiển thị (NICHINO_STAFF không có quyền `tanka.view`)

ステップ2：
Toast `アクセス権がありません。` + redirect `/dashboard`

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

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo `account_concept.md ※4`, 単価マスタ chỉ cho phép CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN thao tác. NICHINO_STAFF không thuộc đối tượng.

## ACSMS-TC-003-003 — Đăng ký Master Đơn giá bởi CHUOKAI — chỉ thao tác trong phạm vi 中央会 quản lý

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・JA quản lý: ja-001, ja-002 (dưới chuokai-001)
  - ・JA ngoài quyền: ja-101 (dưới chuokai-002)

### 手順

ステップ1：
Kiểm tra item "単価マスタ" trên sidebar

ステップ2：
Click "単価マスタ" → mở màn `/tanka`

ステップ3：
Click nút "新規登録"

ステップ4：
Nhập trực tiếp URL chi tiết đơn giá của JA ngoài quyền (ja-101) `/tanka/{id}/edit`

ステップ5：
Dùng DevTools gọi trực tiếp PATCH `/api/v1/tanka/{id_ngoài_quyền}`

### 期待結果

ステップ1：
Hiển thị (có quyền `tanka.view`)

ステップ2：
Hiển thị bình thường. Danh sách chỉ hiển thị các đơn giá thuộc ja-001 / ja-002

ステップ3：
Mở màn form `/tanka/create`

ステップ4：
404 NotFound (DataScope coi như không tồn tại)

ステップ5：
Trả về HTTP 404 (`error_code: NOT_FOUND` (không phải 403 — out-of-scope ẩn sự tồn tại))

補足：
・Có thể xem/tạo/sửa/xóa đơn giá của JA trong phạm vi quản lý
・Truy cập trực tiếp đơn giá của JA ngoài quyền sẽ bị chặn bằng 404
・DataScope policy được áp dụng nhất quán bằng helper `assertJaScope`
・Truy cập out-of-scope được trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại. Trong api.md error list định nghĩa là DATA_SCOPE_VIOLATION (403), nhưng trong implementation theo quy tắc `assertJaScope` của security.md, masking 404 được ưu tiên.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-004 — Đăng ký Master Đơn giá bởi JA_HONTEN — chỉ thao tác trong phạm vi JA của mình

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・JA của mình: ja-001
  - ・JA khác: ja-002

### 手順

ステップ1：
Mở màn danh sách "単価マスタ"

ステップ2：
"新規登録" đơn giá của JA mình

ステップ3：
Truy cập trực tiếp URL chỉnh sửa đơn giá của JA khác (ja-002)

### 期待結果

ステップ1：
Chỉ hiển thị đơn giá thuộc ja-001. Đơn giá của ja-002 không hiển thị

ステップ2：
Đăng ký thành công, record được đăng ký có `ja_id = 1`

ステップ3：
404 NotFound

補足：
・Chỉ có thể tạo/sửa/xóa đơn giá của JA mình
・Truy cập trực tiếp đơn giá của JA khác bị chặn 404
・Truy cập out-of-scope được trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại. Trong api.md error list định nghĩa là DATA_SCOPE_VIOLATION (403), nhưng trong implementation theo quy tắc `assertJaScope` của security.md, masking 404 được ưu tiên.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-005 — Đăng ký Master Đơn giá bởi JA_KANRI_SHITEN — chỉ thao tác trong phạm vi JA và 管理支店 của mình

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・JA của mình: ja-001 / 管理支店 của mình: branch-001
  - ・管理支店 khác: branch-002 (cùng dưới ja-001)

### 手順

ステップ1：
Mở màn danh sách "単価マスタ"

ステップ2：
"新規登録" đơn giá

ステップ3：
Truy cập trực tiếp URL đơn giá của JA khác (ja-002)

### 期待結果

ステップ1：
Hiển thị các đơn giá thuộc ja-001 (gồm branch-001 + branch-002) — đơn giá quản lý theo đơn vị JA chứ không theo chi nhánh

ステップ2：
Đăng ký thành công, `ja_id = 1`

ステップ3：
404 NotFound

補足：
・Chỉ thao tác được đơn giá thuộc JA mình (theo đơn vị JA chứ không theo 管理支店)
・Truy cập đơn giá của JA khác bị chặn 404
・Truy cập out-of-scope được trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại. Trong api.md error list định nghĩa là DATA_SCOPE_VIOLATION (403), nhưng trong implementation theo quy tắc `assertJaScope` của security.md, masking 404 được ưu tiên.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Master Đơn giá quản lý theo đơn vị JA. 管理支店 chỉ phân chia scope ở mức độc giả / hanbaiten.

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-003-006 — Layout tổng thể màn đăng ký khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click nút "単価マスタ" → "新規登録"

ステップ2：
Đặt tài liệu thiết kế (screen-design.md / index.html) cạnh màn hình thực tế để so sánh

ステップ3：
Kiểm tra vị trí từng element (vị trí thanh title, bố cục form, vị trí button)

### 期待結果

ステップ1：
Mở màn `/tanka/create`

ステップ2：
Màu nền, font, font size, padding/margin, màu button, style ô input đều khớp

ステップ3：
Đúng spec thiết kế

補足：
・Không có sai khác visual với spec thiết kế
・Design tokens (`design-tokens.ts`) đã được áp dụng (không có hardcoded color)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-007 — Layout tổng thể màn chỉnh sửa khớp với spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã có record đơn giá `tanka_id = 1`

### 手順

ステップ1：
Click link "編集" của record có sẵn từ danh sách đơn giá

ステップ2：
So sánh với spec thiết kế

### 期待結果

ステップ1：
Mở màn `/tanka/1/edit`, các giá trị có sẵn được hiển thị trong form

ステップ2：
Layout giống màn đăng ký + trạng thái chỉ đọc đúng đắn

補足：
・Màn chỉnh sửa có visual consistency tương đương màn đăng ký

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-008 — Hành vi responsive — breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Đặt kích thước cửa sổ 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar hiển thị cố định, form 1 cột

ステップ2：
Sidebar gập lại, form giữ nguyên

ステップ3：
Sidebar overlay, các element form xếp dọc, không có scroll ngang

補足：
・Không vỡ layout ở cả 3 breakpoint, không phát sinh scroll ngang
・Tất cả element form đều có thể thao tác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-009 — Hiển thị element form — textbox / dropdown / radio / button đúng spec thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Kiểm tra placeholder, format, trạng thái (enabled / focus / disabled) của từng textbox

ステップ2：
Kiểm tra hiển thị radio button 単価種別

ステップ3：
Kiểm tra size, location, icon, color của button 登録 / 前の画面に戻る

### 期待結果

ステップ1：
Đúng spec — placeholder khớp, viền đổi màu khi focus, grey-out khi disabled

ステップ2：
Lựa chọn: `購読料` (1) và `配達手数料` (2), 2 option, mặc định `購読料`

ステップ3：
Đúng spec. Button 登録 là button chính (xanh), button 戻る là button phụ (trắng)

補足：
・Tất cả element form đều khớp hoàn toàn với spec thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-010 — Thứ tự Tab và thao tác bàn phím (Tab / Enter)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký, focus là body

### 手順

ステップ1：
Nhấn phím Tab liên tục, kiểm tra di chuyển focus

ステップ2：
Nhấn phím Enter trong textbox

ステップ3：
Nhấn phím Escape khi modal đang mở

### 期待結果

ステップ1：
Theo thứ tự trên xuống, trái sang phải — 単価種別 → 単価コード → 単価名 → 税率 → 税込 → 税抜 → 開始日 → 終了日 → button 登録 → button 戻る

ステップ2：
Trigger submit form (nhưng validation vẫn chạy)

ステップ3：
Modal đóng

補足：
・Thứ tự tab đúng spec, có thể thao tác toàn bộ bằng bàn phím

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-011 — Độ tin cậy thao tác button (double-click, click liên tục, Enter)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã nhập đầy đủ giá trị hợp lệ trên màn đăng ký
  - ・Test data: 単価種別=購読料 (TANKA_TYPE=1), 単価コード=TEST001, 単価名=テスト単価, 税率=10, 単価税込=4400, 単価税抜=4000, 適用開始日=2026-05-01, 適用終了日=2027-04-30

### 手順

ステップ1：
Double-click button 登録 (trong vòng 200ms)

ステップ2：
Click liên tục button 登録 trong 5 giây

ステップ3：
Submit bằng phím Enter (nhấn liên tục)

### 期待結果

ステップ1：
Lần 1 bắt đầu submit, lần 2 button bị disable nên bỏ qua — DB chỉ có 1 record duy nhất

ステップ2：
Trong khi submit button bị disable, không có đăng ký trùng — DB chỉ có 1 record duy nhất

ステップ3：
Hành vi tương đương double-click

補足：
・Không phát sinh đăng ký trùng
・Khi đang submit button hiển thị trạng thái disabled

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chống double-submit — vùng có tần suất phát hiện bug cao từ tester JA_HONTEN.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-003-012 — Hiển thị tiêu đề header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký hoặc màn chỉnh sửa

### 手順

ステップ1：
Kiểm tra phía bên trái header phía trên màn hình

### 期待結果

ステップ1：
Hiển thị chuỗi "単価マスタ登録画面"

補足：
・Chuỗi tiêu đề đúng literal theo spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-013 — Hiển thị icon thông báo + menu user

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)

### 手順

ステップ1：
Kiểm tra phía bên phải header

ステップ2：
Hover chuột vào user icon

ステップ3：
Click user icon

### 期待結果

ステップ1：
Theo thứ tự icon thông báo → user icon → tên login (ví dụ: 日裏（管理者）)

ステップ2：
Background đổi màu khi hover

ステップ3：
Dropdown mở ra — hiển thị menu logout v.v.

補足：
・Mọi tương tác hover/click đều đúng spec thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-014 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Kiểm tra vùng breadcrumb dưới tiêu đề màn hình

ステップ2：
So sánh cấu trúc phân cấp breadcrumb với spec thiết kế

### 期待結果

ステップ1：
Hiển thị phân cấp `ホーム / マスタ管理 / 単価マスタ登録画面`

ステップ2：
Ký tự ngăn cách, text, link đều khớp

補足：
・Breadcrumb hiển thị đúng phân cấp + đúng spec thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-015 — Hành vi điều hướng của từng link breadcrumb

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Click "ホーム" trên breadcrumb

ステップ2：
Quay về màn đăng ký, click "マスタ管理"

ステップ3：
Quay về màn đăng ký, click "単価マスタ登録画面" (màn hiện tại)

### 期待結果

ステップ1：
Chuyển sang `/dashboard`

ステップ2：
Chuyển sang trang chủ マスタ管理 / menu (hoặc theo spec hiện tại không xảy ra gì)

ステップ3：
Là màn hiện tại nên không có gì xảy ra (không reload)

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

## ACSMS-TC-003-016 — 単価種別 hiển thị và chọn radio button

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đang mở màn đăng ký

### 手順

ステップ1：
Kiểm tra phần 単価種別

ステップ2：
Chọn `配達手数料` → 登録 → kiểm tra DB

### 期待結果

ステップ1：
Radio 2 option: `購読料` (TANKA_TYPE=1, mặc định chọn) / `配達手数料` (TANKA_TYPE=2)

ステップ2：
Record đã save có `tanka_type = 2`

補足：
・Giá trị mặc định + hành vi chuyển đổi khớp với giá trị seed của bảng m_code

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-017 — 単価コード — Check bắt buộc (rỗng + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ
  - ・Test data: 単価種別=購読料 (TANKA_TYPE=1), 単価コード=TEST001, 単価名=テスト単価, 税率=10, 単価税込=4400, 単価税抜=4000, 適用開始日=2026-05-01, 適用終了日=2027-04-30

### 手順

ステップ1：
Để trống 単価コード rồi nhấn button 登録

ステップ2：
Nhập 3 dấu cách half-width → button 登録

ステップ3：
Nhập 3 dấu cách full-width → button 登録

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường, submit bị block

ステップ2：
Backend trim whitespace 2 đầu rồi xét là rỗng, hiển thị `必須項目です。`

ステップ3：
Full-width space cũng là đối tượng trim, hiển thị `必須項目です。`

補足：
・Rỗng và chỉ chứa whitespace đều bị xem là vi phạm bắt buộc
・Backend trim whitespace 2 đầu rồi xét là rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-018 — 単価コード — Giới hạn 10 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 10 ký tự (ví dụ: TEST123456) vào 単価コード → 登録

ステップ2：
Thử nhập ký tự thứ 11 vào 単価コード

ステップ3：
Paste "TESTTESTTEST123" (15 ký tự) vào ô 単価コード

### 期待結果

ステップ1：
Nhận bình thường, đăng ký thành công

ステップ2：
Bị chặn nhập do input maxLength (không thể nhập ký tự thứ 11)

ステップ3：
Cắt đến ký tự thứ 10, record đăng ký là 10 ký tự

補足：
・Giới hạn 10 ký tự được enforced 2 lớp bằng input maxLength và BE validate

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-019 — 単価コード — Cho phép half-width alphanumeric, kiểm tra phạm vi cho phép các loại ký tự khác

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập half-width alphanumeric `ABC123` → 登録

ステップ2：
Thử nhập hiragana `あいう`

ステップ3：
Thử nhập full-width alphanumeric `ＡＢＣ`

### 期待結果

ステップ1：
Nhận bình thường

ステップ2：
Bị từ chối bởi regex backend, hoặc kiểm soát IME ở frontend

ステップ3：
Hành vi nhận theo spec, tuân thủ document

補足：
・Half-width alphanumeric chắc chắn được nhận
・Full-width / hiragana / katakana hoạt động theo spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-020 — 単価コード — Xử lý an toàn ký tự đặc biệt / emoji / HTML / SQL injection

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập ký hiệu thông thường `!@#$%^&*()_+-=` vào 単価コード → 登録

ステップ2：
Nhập emoji `①②③` và 外字 `๖ۣۜABC` → 登録

ステップ3：
Nhập HTML tag `<script>alert(1)</script>` → 登録 → kiểm tra hiển thị ở màn danh sách

ステップ4：
Nhập SQL injection `T001'; DROP TABLE m_tanka; --` → 登録

ステップ5：
Kiểm tra stored XSS: sau khi đăng ký, mở lại màn chỉnh sửa để hiển thị lại giá trị

### 期待結果

ステップ1：
Nhận theo spec. Khi nhận, lưu literal vào DB, hiển thị màn hình không có escape sai

ステップ2：
Nhận hoặc từ chối theo spec. Nếu từ chối thì hiển thị message

ステップ3：
Hiển thị dưới dạng literal text (không execute). Lưu literal vào DB

ステップ4：
Đăng ký bình thường như 単価コード hợp lệ (parameterized query khiến injection không phát huy). Bảng `m_tanka` không bị xóa

ステップ5：
Hiển thị nguyên dạng literal text, JS không execute

補足：
・Auto-escape của Vue khiến XSS không phát huy
・Parameterized query của TypeORM khiến SQL injection không phát huy
・Lưu literal vào DB (không lưu data đã escape)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical bảo mật — nếu fail thì xử lý như incident.

## ACSMS-TC-003-021 — 単価コード — Tự động trim whitespace 2 đầu

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `  TEST001  ` có dấu cách half-width 2 đầu → 登録

ステップ2：
Nhập `　TEST001　` có dấu cách full-width 2 đầu → 登録

### 期待結果

ステップ1：
Lưu vào DB là `TEST001` (đã trim whitespace 2 đầu)

ステップ2：
Lưu vào DB là `TEST001` (đã trim whitespace 2 đầu)

補足：
・Xử lý trim whitespace 2 đầu được áp dụng nhất quán ở backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-022 — 単価コード — Lỗi khi trùng lặp (không phân biệt hoa thường)

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Pre-data: `tanka_id=99, tanka_code='T001', ja_id=1` đã tồn tại trong DB

### 手順

ステップ1：
Nhập `T001` vào 単価コード → 登録

ステップ2：
Nhập `t001` (chữ thường) vào 単価コード → 登録

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_tanka WHERE tanka_code IN ('T001', 't001') AND ja_id = 1`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, hiển thị message `同一の単価コードが既に登録されています。`, đăng ký thất bại)

ステップ2：
So sánh không phân biệt hoa thường nên phát hiện trùng, message và error_code giống bước trên

ステップ3：
Chỉ có 1 record (không có trùng)

補足：
・DB UNIQUE INDEX được set với collation không phân biệt hoa thường
・Cùng code ở JA khác được cho phép (ja-002 đăng ký `T001` là OK)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-023 — 単価名 — Check bắt buộc (rỗng + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 単価名 rồi nhấn 登録

ステップ2：
Chỉ nhập dấu cách half-width và full-width → 登録

### 期待結果

ステップ1：
Hiển thị `必須項目です。`

ステップ2：
Sau khi trim whitespace 2 đầu, xét là rỗng, hiển thị `必須項目です。`

補足：
・Rỗng / chỉ chứa whitespace đều bị xem là vi phạm bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-024 — 単価名 — Giới hạn 100 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 100 ký tự half-width → 登録

ステップ2：
Thử nhập ký tự half-width thứ 101

ステップ3：
Nhập 100 ký tự full-width (Hán tự) → 登録

ステップ4：
Nhập mix 50 half-width + 50 full-width → 登録

### 期待結果

ステップ1：
Nhận bình thường

ステップ2：
Không thể nhập ký tự thứ 101 do maxLength

ステップ3：
Nhận bình thường (đếm half-width và full-width như nhau)

ステップ4：
Nhận bình thường

補足：
・Giới hạn 100 ký tự đếm chung cho cả half-width và full-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-025 — 単価名 — Cho phép ký tự half-width (alphanumeric + ký hiệu)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập alphanumeric + ký hiệu `Subscription Fee 2026 (Plan-A)` → 登録

### 期待結果

ステップ1：
Nhận bình thường

補足：
・Cho phép tất cả ký tự half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-026 — 単価名 — Cho phép ký tự full-width (Hán tự / hiragana / katakana)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập Hán tự `購読料金 (年間契約)` → 登録

ステップ2：
Nhập hiragana `しんぶんりょうきん` → 登録

ステップ3：
Nhập katakana `スクリプション` → 登録

ステップ4：
Nhập katakana half-width `ｽｸﾘﾌﾟｼｮﾝ` → 登録

### 期待結果

ステップ1：
Nhận bình thường

ステップ2：
Nhận bình thường

ステップ3：
Nhận bình thường

ステップ4：
Nhận bình thường (theo spec)

補足：
・Cho phép cả full-width và half-width katakana

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-027 — 単価名 — Xử lý an toàn ký tự đặc biệt / emoji / HTML / SQL injection

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập ký hiệu thông thường `!@#$%^&*` → 登録 → kiểm tra hiển thị danh sách

ステップ2：
Nhập emoji `🎉` → 登録

ステップ3：
Nhập HTML `<b>BOLD</b>` → 登録 → mở lại màn chỉnh sửa

ステップ4：
Nhập SQL `'; DROP TABLE m_tanka; --` → 登録

### 期待結果

ステップ1：
Hiển thị literal

ステップ2：
Nhận / từ chối theo spec

ステップ3：
Hiển thị dưới dạng literal text (không execute, không in đậm)

ステップ4：
Lưu literal, bảng không bị xóa

補足：
・XSS / SQL injection không phát huy

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-028 — 単価名 — Tự động trim whitespace 2 đầu

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `  テスト単価名  ` có dấu cách 2 đầu → 登録

### 期待結果

ステップ1：
Lưu vào DB là `テスト単価名` (đã trim whitespace 2 đầu)

補足：
・Xử lý trim whitespace 2 đầu được áp dụng nhất quán

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-029 — 税率 — Hiển thị giá trị mặc định 0%

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Mở mới màn đăng ký

### 手順

ステップ1：
Kiểm tra hiển thị ban đầu của ô nhập 税率

### 期待結果

ステップ1：
Hiển thị `0` hoặc `0%`

補足：
・Giá trị mặc định 0 chắc chắn được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-030 — 税率 — Cho phép số half-width, từ chối số full-width

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập số half-width `10` → focus out

ステップ2：
Nhập số full-width `１０` → focus out

### 期待結果

ステップ1：
Nhận, giữ hiển thị `10`

ステップ2：
Từ chối (auto-convert sang half-width hoặc hiển thị error)

補足：
・Chỉ cho phép số half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-031 — 税率 — Từ chối ký tự (chữ cái)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Thử nhập chữ cái `abc`

### 期待結果

ステップ1：
Input từ chối, không thể nhập

補足：
・Từ chối tất cả ký tự ngoài số

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-032 — 税率 — Phạm vi (0〜100)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `0` → 登録

ステップ2：
Nhập `100` → 登録

ステップ3：
Thử nhập `101`

ステップ4：
Thử nhập `-1` (dấu trừ)

### 期待結果

ステップ1：
Nhận bình thường (giá trị min)

ステップ2：
Nhận bình thường (giá trị max)

ステップ3：
Ngoài phạm vi, tự động cắt hoặc hiển thị error

ステップ4：
Từ chối

補足：
・Phạm vi 0〜100 được enforce nghiêm ngặt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-033 — 税率 — Giới hạn độ dài tối đa (5 chữ số)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `99.99` (5 ký tự) → 登録

ステップ2：
Thử nhập `99.999` (ký tự thứ 6)

### 期待結果

ステップ1：
Nhận

ステップ2：
Không thể nhập ký tự thứ 6 do maxLength

補足：
・maxLength=5 được enforce

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-034 — 税率 — Độ chính xác 2 chữ số sau dấu thập phân

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `10.5` → 登録 → kiểm tra DB

ステップ2：
Nhập `10.555` → focus out

### 期待結果

ステップ1：
Lưu vào DB là `10.50` (độ chính xác 2 chữ số)

ステップ2：
Cắt hoặc round thành `10.55` hoặc `10.56` (theo spec)

補足：
・Input vượt độ chính xác 2 chữ số sau thập phân được xử lý theo spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-035 — 税率 — Từ chối ký tự đặc biệt / emoji / số âm

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Thử nhập `!@#`

ステップ2：
Thử nhập emoji `🎉`

ステップ3：
Thử nhập `-5`

### 期待結果

ステップ1：
Từ chối

ステップ2：
Từ chối

ステップ3：
Từ chối

補足：
・Chỉ cho phép số + dấu thập phân

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-036 — 税率 — Tự động trim whitespace 2 đầu

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `  10  ` có dấu cách 2 đầu

### 期待結果

ステップ1：
Sau khi trim whitespace 2 đầu lưu là `10`

補足：
・Xử lý trim whitespace 2 đầu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-037 — 単価税込 — Hiển thị giá trị mặc định ¥0

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Kiểm tra hiển thị ban đầu

### 期待結果

ステップ1：
Hiển thị `¥0` hoặc `0`

補足：
・Hiển thị mặc định 0

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-038 — 単価税込 — Chỉ cho phép số half-width, từ chối full-width / chữ cái / ký hiệu

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập số half-width `4400` → focus out

ステップ2：
Nhập số full-width `４４００`

ステップ3：
Thử nhập chữ cái `abc`

ステップ4：
Thử nhập ký tự đặc biệt `!@#`

### 期待結果

ステップ1：
Nhận, hiển thị format `¥4,400`

ステップ2：
Từ chối hoặc auto-convert

ステップ3：
Từ chối

ステップ4：
Từ chối

補足：
・Chỉ cho phép số half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-039 — 単価税込 — Phạm vi (≥1) + từ chối số âm

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `0` → 登録

ステップ2：
Thử nhập `-100`

ステップ3：
Nhập `1` → 登録

### 期待結果

ステップ1：
Nhận / từ chối theo spec (cần xác nhận spec)

ステップ2：
Từ chối

ステップ3：
Nhận

補足：
・Từ chối hoàn toàn số âm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-040 — 単価税込 — Giới hạn 10 chữ số

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 10 chữ số `1234567890` → 登録

ステップ2：
Thử nhập chữ số thứ 11

### 期待結果

ステップ1：
Nhận

ステップ2：
Không thể nhập do maxLength

補足：
・Giới hạn 10 chữ số được enforce

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-041 — 単価税込 — Hiển thị format ¥ và độc lập với 税抜

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `2426` → focus out

ステップ2：
Nhập `1000000`

ステップ3：
Nhập `12`

ステップ4：
Sau khi nhập 税込, kiểm tra ô nhập 税抜 không thay đổi giá trị

### 期待結果

ステップ1：
Hiển thị format `¥2,426`

ステップ2：
Hiển thị `¥1,000,000` ngăn cách bằng dấu phẩy

ステップ3：
`¥12`

ステップ4：
税抜 = 0 (mặc định) giữ nguyên, không tự động tính từ 税込

補足：
・Format ¥ ngăn cách bằng dấu phẩy
・税込・税抜 hoàn toàn độc lập (không auto-calc) — đã xác nhận spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-042 — 単価税抜 — Hiển thị giá trị mặc định ¥0

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Kiểm tra hiển thị ban đầu

### 期待結果

ステップ1：
Hiển thị `¥0` hoặc `0`

補足：
・Hiển thị mặc định 0

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-043 — 単価税抜 — Chỉ cho phép số half-width, từ chối full-width / chữ cái / ký hiệu

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập số half-width `4000` → focus out

ステップ2：
Nhập số full-width `４０００`

ステップ3：
Nhập chữ cái / ký tự đặc biệt / emoji

### 期待結果

ステップ1：
Hiển thị `¥4,000`

ステップ2：
Từ chối hoặc auto-convert

ステップ3：
Từ chối

補足：
・Chỉ cho phép số half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-044 — 単価税抜 — Phạm vi (≥1) + từ chối số âm

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `0` → 登録

ステップ2：
Thử nhập `-100`

### 期待結果

ステップ1：
Nhận / từ chối theo spec

ステップ2：
Từ chối

補足：
・Từ chối hoàn toàn số âm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-045 — 単価税抜 — Giới hạn 10 chữ số

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 10 chữ số `9999999999` → 登録

ステップ2：
Thử nhập chữ số thứ 11

### 期待結果

ステップ1：
Nhận

ステップ2：
Từ chối

補足：
・Giới hạn 10 chữ số được enforce

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-046 — 単価税抜 — Hiển thị format ¥ và độc lập với 税込

- 観点ID: VP-B-06
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `2426` → focus out

ステップ2：
Sau khi nhập 税抜, kiểm tra ô nhập 税込 không thay đổi giá trị

### 期待結果

ステップ1：
Hiển thị `¥2,426`

ステップ2：
税込 = 0 giữ nguyên, không auto-calc từ 税抜

補足：
・税込・税抜 độc lập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-047 — 適用開始日 — Format hiển thị và placeholder

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Hiển thị ban đầu của ô nhập 適用開始日

ステップ2：
Click date picker

### 期待結果

ステップ1：
Hiển thị placeholder `YYYY-MM-DD`

ステップ2：
Hiển thị calendar UI

補足：
・Format YYYY-MM-DD + date picker UI

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-048 — 適用開始日 — Auto-set khi không nhập (ngày hiện tại)

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 適用開始日 rồi 登録

ステップ2：
Kiểm tra DB: `SELECT tekiyo_start_date FROM m_tanka WHERE tanka_code = 'TEST001'`

### 期待結果

ステップ1：
Lưu vào DB ngày hiện tại (`CURRENT_DATE`)

ステップ2：
Khớp với ngày đăng ký

補足：
・Không nhập → auto-set ngày hiện tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-049 — 適用開始日 — Không thể chọn ngày trong quá khứ

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, giả sử ngày hiện tại là 2026-04-27

### 手順

ステップ1：
Thử chọn `2026-04-26` (hôm trước) bằng date picker

ステップ2：
Nhập trực tiếp text `2026-04-26` → 登録

### 期待結果

ステップ1：
Không thể chọn (grey out)

ステップ2：
Backend từ chối, hiển thị message

補足：
・Từ chối hoàn toàn ngày trong quá khứ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-050 — 適用開始日 — Từ chối input format không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `2026/04/27` (slash) → focus out

ステップ2：
Nhập `27-04-2026` (DMY) → focus out

ステップ3：
Thử nhập `abc`

### 期待結果

ステップ1：
Hiển thị message lỗi format

ステップ2：
Lỗi format

ステップ3：
Từ chối

補足：
・Chỉ nhận format YYYY-MM-DD

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-051 — 適用終了日 — Format hiển thị và placeholder

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Kiểm tra hiển thị ban đầu

### 期待結果

ステップ1：
Placeholder `YYYY-MM-DD`

補足：
・Format khớp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-052 — 適用終了日 — Cho phép nhập rỗng (xem là vô thời hạn)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ cho 単価種別 / 単価コード / 単価名 và các mục bắt buộc khác
  - ・適用開始日 = 2026-05-06 (ngày hiện tại) đã nhập

### 手順

ステップ1：
Để trống 適用終了日 rồi nhấn button "登録"

ステップ2：
Kiểm tra DB: `SELECT tekiyo_end_date FROM m_tanka WHERE tanka_code='T-OPEN'`

ステップ3：
Kiểm tra audit log: `SELECT result_status, after_value FROM t_log WHERE target_table='m_tanka' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Đăng ký thành công, hiển thị toast `登録しました。`, chuyển đến màn tìm kiếm

ステップ2：
Cột `tekiyo_end_date` là `NULL` (xem là vô thời hạn)

ステップ3：
result_status = 1 (thành công), trong JSON after_value key `tekiyo_end_date` là null

補足：
・適用終了日 là trường tùy chọn. Để trống = vô thời hạn, theo screen-design.md L96 "②Trường hợp để trống xem là vô thời hạn"
・Cột DB `tekiyo_end_date` cho phép NULL. Phải xác nhận persist là `NULL` chứ không phải chuỗi rỗng `""`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-053 — 適用終了日 — Chỉ chọn được ngày sau ngày bắt đầu

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, 適用開始日 = 2026-05-05 đã nhập

### 手順

ステップ1：
Chọn `2026-05-05` (cùng ngày) bằng date picker → 登録

ステップ2：
Thử chọn `2026-05-04` (hôm trước ngày bắt đầu) bằng date picker

ステップ3：
Nhập trực tiếp text `2026-05-04` → 登録

### 期待結果

ステップ1：
Nhận bình thường (≥ ngày bắt đầu OK)

ステップ2：
Không thể chọn (grey out)

ステップ3：
Backend từ chối

補足：
・Ngày kết thúc ≥ ngày bắt đầu được enforce

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-054 — 適用終了日 — Từ chối input format không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `2027/04/30` (slash) → focus out

ステップ2：
Thử nhập `abc`

### 期待結果

ステップ1：
Lỗi format

ステップ2：
Từ chối

補足：
・Chỉ nhận format YYYY-MM-DD

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-055 — 適用終了日 — Xác nhận tính nhất quán: ngày bắt đầu < ngày kết thúc

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập ngày bắt đầu `2026-05-01`, ngày kết thúc `2027-04-30` → 登録

ステップ2：
Kiểm tra DB

### 期待結果

ステップ1：
Nhận bình thường

ステップ2：
Thỏa mãn `tekiyo_start_date < tekiyo_end_date`

補足：
・Xác nhận tính nhất quán logic

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-003-056 — Đăng ký mới — Trường hợp normal (persist DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Test data: 単価種別=購読料 (TANKA_TYPE=1), 単価コード=TEST001, 単価名=テスト単価, 税率=10, 単価税込=4400, 単価税抜=4000, 適用開始日=2026-05-01, 適用終了日=2027-04-30

### 手順

ステップ1：
Mở màn đăng ký, nhập tất cả giá trị test data

ステップ2：
Click button 登録

ステップ3：
Kiểm tra DB: `SELECT * FROM m_tanka WHERE tanka_code = 'TEST001' AND ja_id = 1`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 'm_tanka' AND operation = 'CREATE' ORDER BY log_datetime DESC LIMIT 1`

ステップ5：
Chuyển sang màn danh sách, kiểm tra hiển thị đơn giá đã đăng ký

### 期待結果

ステップ1：
Nhận input hoàn tất

ステップ2：
Hiển thị toast thành công `登録しました。` + chuyển về màn danh sách `/tanka`

ステップ3：
1 dòng, tất cả các trường khớp với giá trị input, `deleted_at IS NULL`

ステップ4：
1 dòng, `account_id` khớp test account, `result_status = 1`, JSON `after_value` ghi đầy đủ giá trị đăng ký

ステップ5：
Row mới hiển thị, giá trị khớp

補足：
・Persist đúng vào DB
・Audit log ghi event CREATE (before_value rỗng, after_value JSON đầy đủ)
・Main DML + audit log commit trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-057 — Đăng ký mới — Cho phép cùng code ở JA khác

- 観点ID: VP-B-08
- 種類: Normal (正常)
- 前提条件:
  - ・JA_HONTEN (thuộc ja-002) đã login (đã xác thực MFA)
  - ・Pre-data: ja-001 đã đăng ký `tanka_code='D001'`

### 手順

ステップ1：
Login bằng tài khoản ja-002 → màn đăng ký

ステップ2：
Đăng ký với 単価コード `D001`

ステップ3：
Kiểm tra DB

### 期待結果

ステップ1：
Hiển thị bình thường

ステップ2：
Nhận bình thường (cho phép cùng code ở JA khác)

ステップ3：
Cả ja-001 / ja-002 đều có record `tanka_code='D001'`

補足：
・UNIQUE constraint là composite `(tanka_code, ja_id)` — unique trong JA

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-058 — Đăng ký mới — Validation tích hợp khi tất cả field rỗng

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, tất cả field rỗng

### 手順

ステップ1：
Không nhập gì rồi click button 登録

ステップ2：
Kiểm tra error message của từng mục 単価コード / 単価名

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, response body chứa array `errors: [{ field, message }]`)
Hiển thị `必須項目です。` ngay dưới mỗi mục bắt buộc, submit bị block

ステップ2：
Đối với 2 mục 単価コード / 単価名, error_code: VALIDATION_ERROR trả về tên field tương ứng và message trong array `errors`

補足：
・Submit thất bại, hiển thị đồng thời nhiều vi phạm bắt buộc
・Không có row được thêm vào DB
・適用終了日 là trường tùy chọn (rỗng = vô thời hạn) nên không nằm trong đối tượng bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-059 — Đăng ký mới — Lỗi khi code trùng

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Pre-data: ja-001 đã đăng ký `tanka_code='T001'`
  - ・role: JA_HONTEN (thuộc ja-001)

### 手順

ステップ1：
Nhập `T001` vào 単価コード, các field khác giá trị hợp lệ rồi 登録

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra audit log: `t_log` có `result_status = 2 OR error log`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, hiển thị message `同一の単価コードが既に登録されています。`, đăng ký thất bại)

ステップ2：
Không có row mới, `T001` trong `m_tanka` chỉ có 1 dòng

ステップ3：
Có ghi failure log (log_type=3)

補足：
・Phát hiện trùng → rollback transaction → ghi failure log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-060 — Đăng ký mới — Xử lý khi system error

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ
  - ・Backend trigger internal error có chủ đích (chỉ trên test environment)

### 手順

ステップ1：
Click button 登録 → BE phát sinh 500 error

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Kiểm tra DB

ステップ4：
Kiểm tra error log

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
Vẫn ở màn đăng ký, giữ giá trị input

ステップ3：
Không có row được thêm

ステップ4：
`t_log` có ghi log_type=3 (error)

補足：
・Hiển thị error message hướng đến người dùng
・Rollback transaction, duy trì tính toàn vẹn dữ liệu
・Có thể debug qua error log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-061 — Đăng ký mới — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ
  - ・DevTools → Network → chuyển sang chế độ ngắt mạng

### 手順

ステップ1：
Click button 登録

ステップ2：
Trạng thái màn hình

ステップ3：
Bật lại Online rồi click button 登録 lần nữa

### 期待結果

ステップ1：
Hiển thị toast `ネットワークエラーが発生しました。接続をご確認ください。`

ステップ2：
Màn đăng ký, giữ giá trị input

ステップ3：
Đăng ký thành công bình thường

補足：
・Phát hiện network error → thông báo cho user
・Giữ giá trị input, có thể submit lại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-062 — Đăng ký mới — Cancel bằng button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Click button "前の画面に戻る"

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra audit log

### 期待結果

ステップ1：
Chuyển sang màn danh sách `/tanka` không có modal xác nhận

ステップ2：
Không có row được thêm

ステップ3：
Không có log entry (cancel không được ghi log)

補足：
・Hành vi cancel không thay đổi DB, không ghi log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-063 — Trạng thái DB và log khi đăng ký mới thất bại (chống commit không hợp lệ)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trên test environment, mock cho audit log INSERT của backend bị fail

### 手順

ステップ1：
Click button 登録 với input hợp lệ

ステップ2：
Kiểm tra `m_tanka`

ステップ3：
Kiểm tra `t_log`

### 期待結果

ステップ1：
Audit log INSERT sau main DML fail → rollback transaction

ステップ2：
Không có row được thêm (rollback hoàn tất)

ステップ3：
Không có success log, nhưng có error log (catch ngoài)

補足：
・Audit log fail → rollback business write để duy trì nhất quán
・Theo rule `nestjs.md §I/O & External Services / Transaction`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

# カテゴリ 6: Logic nghiệp vụ — Cập nhật (Function — Edit)

## ACSMS-TC-003-064 — Màn chỉnh sửa — Hiển thị data đã có

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Pre-data: `tanka_id=10, tanka_code='OLD001'` đã tồn tại dưới ja-001

### 手順

ステップ1：
Click link "編集" của `OLD001` từ màn danh sách

ステップ2：
Kiểm tra giá trị ban đầu của từng field

### 期待結果

ステップ1：
Mở màn `/tanka/10/edit`

ステップ2：
Khớp hoàn toàn giá trị DB — đầy đủ 単価種別 / コード / 名前 / 税率 / 税込 / 税抜 / 開始日 / 終了日

補足：
・Form load hiển thị đúng giá trị DB

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-065 — Màn chỉnh sửa — Kiểm tra trạng thái log trước khi chỉnh sửa (audit trước update)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Pre-data: `tanka_id=10` đã đăng ký (có CREATE log), chưa chỉnh sửa

### 手順

ステップ1：
Kiểm tra log trước khi chỉnh sửa: `SELECT * FROM t_log WHERE target_id = 10 AND target_table = 'm_tanka'`

### 期待結果

ステップ1：
Chỉ tồn tại 1 dòng (CREATE log)

補足：
・Trước khi chỉnh sửa chỉ có CREATE log, không có UPDATE log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-066 — Màn chỉnh sửa — 適用開始日 với ngày trong quá khứ chỉ đọc

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・Pre-data: record có `tekiyo_start_date = 2025-01-01` (ngày trong quá khứ)

### 手順

ステップ1：
Mở màn chỉnh sửa

ステップ2：
Thử sửa trực tiếp text

ステップ3：
Dùng DevTools gửi PATCH `/api/v1/tanka/{id}` với body có chứa `tekiyo_start_date`

### 期待結果

ステップ1：
Ô nhập 適用開始日 ở trạng thái disabled (chỉ đọc), hiển thị grey-out

ステップ2：
Input không nhận

ステップ3：
Backend từ chối — lỗi field-level restriction

補足：
・Cả FE / BE đều enforce chỉ đọc cho ngày trong quá khứ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-067 — Màn chỉnh sửa — 適用開始日 với ngày trong tương lai có thể sửa

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Pre-data: record có `tekiyo_start_date = 2027-01-01` (ngày trong tương lai)

### 手順

ステップ1：
Mở màn chỉnh sửa

ステップ2：
Đổi sang `2027-02-01` → button cập nhật

### 期待結果

ステップ1：
Input 適用開始日 enabled

ステップ2：
Nhận bình thường, DB cập nhật

補足：
・Ngày trong tương lai có thể thay đổi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-068 — Chỉnh sửa — Cập nhật trường hợp normal (DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Pre-data: `tanka_id=10` ở state có thể chỉnh sửa
  - ・Input chỉnh sửa: 単価名 `更新後の名前`, 税率 `8`

### 手順

ステップ1：
Đổi giá trị ở màn chỉnh sửa → button cập nhật

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_id = 10 AND operation = 'UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Hiển thị toast thành công `更新しました。` + chuyển về danh sách `/tanka`

ステップ2：
`tanka_name = '更新後の名前'`, `tax_rate = 8`, `updated_at` là thời gian hiện tại

ステップ3：
1 dòng, JSON `before_value` chứa giá trị cũ, JSON `after_value` chứa giá trị mới

補足：
・Cập nhật DB thành công, `updated_at` tự động update
・Có thể so sánh đầy đủ trước/sau update qua audit log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-069 — Chỉnh sửa — Xử lý xung đột khi chỉnh sửa đồng thời (optimistic lock)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Pre-data: `tanka_id=10` đã tồn tại
  - ・User A: mở `/tanka/10/edit` ở browser A và đang nhập
  - ・User B: chỉnh sửa cùng record ở browser B khác, lưu trước

### 手順

ステップ1：
User B click button cập nhật với giá trị hợp lệ trước → thành công

ステップ2：
User A click button cập nhật (với `updated_at` cũ)

ステップ3：
Reload màn của User A

### 期待結果

ステップ1：
DB `updated_at` được update

ステップ2：
Phát hiện conflict, trả về HTTP 409, block submit (`error_code` của optimistic lock conflict (chưa định nghĩa spec / TBD))

ステップ3：
Nội dung update của User B được phản ánh, có thể chỉnh sửa lại

補足：
・Ngăn lost update bằng optimistic lock
・TBD: error_code và toast text khi optimistic lock conflict chưa được định nghĩa trong api.md / screen-design.md. Sẽ update sau khi spec confirmed.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Ngăn lost update — bắt buộc do ảnh hưởng nghiêm trọng đến tính nhất quán dữ liệu tiền.

## ACSMS-TC-003-070 — Chỉnh sửa — Xử lý system / network error

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn chỉnh sửa, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Backend trigger 500 error có chủ đích → button cập nhật

ステップ2：
Ngắt mạng → button cập nhật

ステップ3：
Kiểm tra DB từng trường hợp

### 期待結果

ステップ1：
Toast `システムエラーが発生しました。…`, vẫn ở màn chỉnh sửa, giữ giá trị input

ステップ2：
Hiển thị toast `ネットワークエラーが発生しました。接続をご確認ください。`, giữ giá trị input

ステップ3：
Không update, duy trì tính nhất quán

補足：
・Cả 2 trường hợp error đều duy trì data integrity

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-071 — Chỉnh sửa — Cancel bằng button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn chỉnh sửa, đã nhập thay đổi

### 手順

ステップ1：
Click button "前の画面に戻る"

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra audit log

### 期待結果

ステップ1：
Chuyển về `/tanka` không có modal xác nhận

ステップ2：
Không update, giữ nguyên giá trị cũ

ステップ3：
Không ghi UPDATE log

補足：
・Cancel không thay đổi DB, không ghi log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-003-072 — Lỗi chung — UNAUTHORIZED — Xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã nhập giá trị hợp lệ ở màn đăng ký
  - ・Đã quá 24 giờ kể từ thao tác cuối, Redis session TTL đã hết

### 手順

ステップ1：
Nhấn button "登録", gửi API request

ステップ2：
Kiểm tra nội dung response và chuyển màn

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_tanka WHERE tanka_code='T-EXP'`

### 期待結果

ステップ1：
Trả về HTTP 401, `error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`

ステップ2：
Frontend clear trạng thái user của Pinia auth store, tự động chuyển sang `/login?redirect=/tanka/create`

ステップ3：
0 record (không có row được thêm)

補足：
・Khi session hết hạn, SessionAuthGuard ở backend trả 401, axios interceptor ở frontend dẫn đồng nhất về màn login
・Giá trị input bị hủy (cần nhập lại sau khi login lại)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-073 — Lỗi chung — TOO_MANY_REQUESTS — Vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã nhập giá trị hợp lệ ở màn đăng ký
  - ・Dùng test script gửi POST `/api/v1/tanka` quá 100 request trong 1 phút

### 手順

ステップ1：
Khởi động script, gửi request tần số cao đến API đăng ký

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
100 request đầu tiên response bình thường, sau đó trả về 429

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ3：
Hiển thị toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`, button 登録 tạm thời disabled

補足：
・@Throttle decorator của NestJS + AWS WAF rate limit block ở cả 2 tầng infra/app
・Tuân thủ quan điểm VP-A-08 "Rate limit / Throttling" (testcase-viewpoints.md v1.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-074 — Lỗi chung — BAD_REQUEST — Request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang mở tab Network của browser DevTools

### 手順

ステップ1：
Trong Console của DevTools chạy `fetch('/api/v1/tanka', { method: 'POST', body: '{invalid json', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_tanka WHERE tanka_code='T-MAL'`

### 期待結果

ステップ1：
Request bị từ chối bởi body parser của backend

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ3：
0 record (không có row được thêm)

補足：
・JSON parse error, Content-Type không hợp lệ, parameter không xác định v.v. đều được map về BAD_REQUEST
・Có ghi error log log_type=3 trong `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-075 — Chỉnh sửa — 単価コード không thể thay đổi (chỉ đọc)

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Pre-data: `tanka_id=20, tanka_code='T020', ja_id=1`
  - ・Đã hiển thị màn chỉnh sửa `/tanka/20/edit`

### 手順

ステップ1：
Kiểm tra bằng mắt thường rằng ô nhập "単価コード" trên màn hình bị disabled

ステップ2：
Trong DevTools kiểm tra thuộc tính `disabled` và class `ant-input-disabled` của input element

ステップ3：
Trong Console của DevTools chạy `fetch('/api/v1/tanka/20', { method: 'PUT', body: JSON.stringify({ tanka_code: 'T020-HACK', tanka_name: 'XXX', tanka_type: 1 }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ4：
Kiểm tra DB: `SELECT tanka_code FROM m_tanka WHERE tanka_id=20`

### 期待結果

ステップ1：
Ô nhập 単価コード hiển thị ở trạng thái disabled, người dùng không thể chỉnh sửa

ステップ2：
Có thuộc tính `disabled`, áp dụng class `ant-input-disabled`

ステップ3：
Trả về HTTP 200 (update tự nó thành công)

ステップ4：
Cột `tanka_code` vẫn là `T020` (Layer 3 field-level allow-list của backend silent drop thay đổi `tanka_code`)

補足：
・Phòng vệ 2 lớp: screen-design.md L90 "Khi update không thể thay đổi" + security.md Layer 3 field allow-list
・FE `:disabled` chỉ là UX. Ranh giới bảo mật thực sự là allow-list của backend
・Các mục khác (単価名 v.v.) update bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-076 — Màn chỉnh sửa — Cảnh báo unsaved changes khi nhấn back của browser

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Pre-data: `tanka_id=21` đã tồn tại
  - ・Đã hiển thị màn chỉnh sửa `/tanka/21/edit`

### 手順

ステップ1：
Đổi giá trị field 単価名, đưa form về trạng thái đang chỉnh sửa

ステップ2：
Nhấn button back của browser, hoặc đóng tab

ステップ3：
Chọn "キャンセル" trong dialog cảnh báo, ở lại màn chỉnh sửa

ステップ4：
Lại nhấn button back của browser, chọn "離れる" trong dialog cảnh báo

### 期待結果

ステップ1：
Trạng thái form của màn chỉnh sửa được ghi nhận là dirty (đang chỉnh sửa)

ステップ2：
Dialog cảnh báo chuẩn của browser được hiển thị bằng event `beforeunload`
(ví dụ: "Bạn có muốn rời site này? Các thay đổi đã thực hiện có thể không được lưu.")

ステップ3：
Ở lại màn chỉnh sửa, giữ giá trị input

ステップ4：
Dialog cảnh báo biến mất, chuyển sang màn tìm kiếm `/tanka`, nội dung thay đổi bị hủy

補足：
・Chỉ cảnh báo bằng handler `beforeunload` khi có unsaved changes
・Khi không có thay đổi thì chuyển không cảnh báo

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Tuân thủ quan điểm VP-E-07 "Unsaved changes guard / Browser leave" (testcase-viewpoints.md v1.1).

## ACSMS-TC-003-077 — Lỗi chung — NOT_FOUND — Xử lý khi truy cập chỉnh sửa đơn giá đã xóa

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・JA_HONTEN (thuộc ja-001) đã login (đã xác thực MFA)
  - ・Pre-data: record đơn giá (tanka_id = 999) đã xóa (hoặc không tồn tại)

### 手順

ステップ1：
Nhập "/tanka/999/edit" vào address bar của browser, truy cập trực tiếp

ステップ2：
Kiểm tra GET "/api/v1/tanka/999" ở tab Network của DevTools

### 期待結果

ステップ1：
Chuyển màn thất bại, hiển thị toast error

ステップ2：
Trả về HTTP 404, `error_code: NOT_FOUND`, message `指定された単価が見つかりません。`

補足：
・Truy cập đến resource không tồn tại / đã xóa đều trả về NOT_FOUND
・Thuộc ACSMS-MSG-003-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-003-078 — Chỉnh sửa — Trường hợp 適用終了日 là ngày trong quá khứ thì chỉ đọc

- 観点ID: VP-A-03
- 種類: Normal (正常)
- 前提条件:
  - ・JA_HONTEN (thuộc ja-001) đã login (đã xác thực MFA)
  - ・Pre-data: record đơn giá (tekiyo_end_date = 2025-12-31, ngày trong quá khứ)

### 手順

ステップ1：
Mở màn chỉnh sửa, kiểm tra ô nhập 適用終了日

ステップ2：
Trong DevTools kiểm tra thuộc tính disabled của input element 適用終了日

ステップ3：
Dùng DevTools gửi PATCH "/api/v1/tanka/{id}" có kèm thay đổi tekiyo_end_date

### 期待結果

ステップ1：
Ô nhập 適用終了日 hiển thị ở trạng thái chỉ đọc (disabled)

ステップ2：
Thuộc tính disabled được set là true

ステップ3：
Trả về HTTP 200, nhưng giá trị tekiyo_end_date trong DB không thay đổi (silent drop ở backend)

補足：
・Tuân thủ screen-design.md §定義項目màn hình L96④
・Cùng pattern với security.md Layer 3 — field-level restriction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Vốn thuộc カテゴリ 6 (Logic nghiệp vụ — Cập nhật) nhưng do thêm về sau nên đặt cuối. Sẽ phân loại lại ở lần rewrite testcase tổng thể tiếp theo.

---
