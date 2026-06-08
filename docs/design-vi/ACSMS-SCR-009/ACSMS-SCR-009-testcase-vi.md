---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-009
screen_name: 管理支店マスタ登録画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình đăng ký Master Chi nhánh Quản lý (ACSMS-SCR-009)" được tạo mới trên hệ thống. Tài liệu tham khảo ISTQB và IEEE 829, đảm bảo các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả các bước với độ mịn có thể tái hiện được, chỉ rõ test data.
- Kỳ vọng kết quả phải đo lường được (nội dung message, kết quả query DB, HTTP status code...).
- Đặt mức độ ưu tiên (P0: Release blocker / P1: Cao / P2: Trung bình).


## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-009 | Tài liệu thiết kế Màn hình đăng ký Master Chi nhánh Quản lý |
| 2 | ACSMS-SCR-009-api | Tài liệu thiết kế API đăng ký Chi nhánh Quản lý |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 4 |
| 4 | Validation đầu vào — Màn đăng ký | 32 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 9 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 8 |
|  | Tổng | 72 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-009-001 — Truy cập màn đăng ký Master Chi nhánh Quản lý bởi NICHINO_ADMIN (Normal)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `kanri_shiten.view` / `kanri_shiten.create` / `kanri_shiten.update`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Click item "管理支店マスタ", mở màn list `/kanri-shiten`

ステップ3：
Click button "新規登録", mở màn `/kanri-shiten/create`

ステップ4：
Dùng DevTools gửi POST `/api/v1/kanri-shiten` với request body hợp lệ

### 期待結果

ステップ1：
Item "管理支店マスタ" được hiển thị trên sidebar

ステップ2：
Màn hình tìm kiếm chi tiết Master Chi nhánh Quản lý được hiển thị (hiển thị record chi nhánh quản lý dưới toàn bộ JA)

ステップ3：
Màn đăng ký Master Chi nhánh Quản lý được hiển thị (form ở trạng thái có thể nhập)

ステップ4：
Trả về HTTP 201 (`message: 登録しました。`, thêm 1 row vào `m_kanri_shiten`)

補足：
・NICHINO_ADMIN có thể thực hiện toàn bộ chức năng Master Chi nhánh Quản lý (xem/đăng ký/cập nhật/xóa)
・Không có giới hạn data scope (truy cập được Chi nhánh Quản lý của toàn bộ JA)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-002 — Cấm truy cập màn đăng ký Master Chi nhánh Quản lý bởi NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view` / `kanri_shiten.create`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Nhập `/kanri-shiten/create` vào address bar trình duyệt, truy cập trực tiếp

ステップ3：
Từ Console DevTools gửi POST `/api/v1/kanri-shiten` với request body hợp lệ

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
Có ≥1 dòng error log được ghi, `account_id` khớp với test account, không có row mới được thêm vào `m_kanri_shiten`

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block truy cập
・Theo ma trận account_concept.md, Master Chi nhánh Quản lý chỉ NICHINO_ADMIN thao tác được. NICHINO_STAFF không thuộc đối tượng.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

## ACSMS-TC-009-003 — Cấm truy cập màn đăng ký Master Chi nhánh Quản lý bởi CHUOKAI

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten/create`

ステップ3：
Từ Console DevTools gọi trực tiếp POST `/api/v1/kanri-shiten`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo ma trận account_concept.md, Master Chi nhánh Quản lý chỉ NICHINO_ADMIN thao tác được. CHUOKAI không thuộc đối tượng.
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

(なし)

## ACSMS-TC-009-004 — Cấm truy cập màn đăng ký Master Chi nhánh Quản lý bởi JA_HONTEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Truy cập trực tiếp URL `/kanri-shiten/1/edit` (record của JA khác)

ステップ4：
Từ Console DevTools gọi trực tiếp PUT `/api/v1/kanri-shiten/1`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo ma trận account_concept.md, Master Chi nhánh Quản lý chỉ NICHINO_ADMIN thao tác được. JA_HONTEN không thuộc đối tượng.
・Cả 3 tầng đều block truy cập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-005 — Cấm truy cập màn đăng ký Master Chi nhánh Quản lý bởi JA_KANRI_SHITEN

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền `kanri_shiten.view`

### 手順

ステップ1：
Kiểm tra item "管理支店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/kanri-shiten`

ステップ3：
Truy cập trực tiếp URL `/kanri-shiten/create`

ステップ4：
Từ Console DevTools gọi trực tiếp GET `/api/v1/kanri-shiten`

### 期待結果

ステップ1：
Item "管理支店マスタ" không được hiển thị trên sidebar

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo ma trận account_concept.md, Master Chi nhánh Quản lý chỉ NICHINO_ADMIN thao tác được. JA_KANRI_SHITEN không thuộc đối tượng.
・Đối với tấn công truy cập URL trực tiếp, BE API guard chặn được

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-006 — Layout tổng thể màn đăng ký khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Trình duyệt: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click "管理支店マスタ" → button "新規登録"

ステップ2：
So sánh tài liệu thiết kế (screen-design.md / index.html) với màn hình hiển thị

ステップ3：
Kiểm tra vị trí từng phần tử (title bar, layout form, layout button)

### 期待結果

ステップ1：
Màn `/kanri-shiten/create` được hiển thị

ステップ2：
Màu nền, font, font size, padding/margin, màu button, style ô input đều khớp với thiết kế

ステップ3：
Được hiển thị đúng theo thiết kế

補足：
・Không có sai khác hình ảnh so với thiết kế
・Design tokens (`design-tokens.ts`) được áp dụng (không có màu hardcode)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-007 — Layout tổng thể màn chỉnh sửa khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại record chi nhánh quản lý `kanri_shiten_id = 1`

### 手順

ステップ1：
Tại màn list chi nhánh quản lý, click cột mã chi nhánh quản lý của record

ステップ2：
So sánh với thiết kế

### 期待結果

ステップ1：
Màn `/kanri-shiten/1/edit` được hiển thị, giá trị cũ được hiển thị trên form

ステップ2：
Layout giống màn đăng ký + có trạng thái disable phù hợp (mã chi nhánh quản lý / tên JA bị disable)

補足：
・Màn chỉnh sửa có tính nhất quán hình ảnh tương đương màn đăng ký

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-008 — Responsive — Breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký

### 手順

ステップ1：
Set kích thước cửa sổ thành 1920×1080 (PC)

ステップ2：
Đổi thành 768×1024 (Tablet)

ステップ3：
Đổi thành 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar hiển thị cố định, form được hiển thị với layout 3 cột

ステップ2：
Sidebar gấp gọn, layout form được giữ nguyên

ステップ3：
Sidebar hiển thị overlay, phần tử form xếp dọc, không phát sinh scroll ngang

補足：
・Không vỡ layout ở cả 3 breakpoint, không phát sinh scroll ngang
・Toàn bộ phần tử form đều thao tác được

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-009 — Hiển thị phần tử form — Textbox / Dropdown / Checkbox / Button đúng theo thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký

### 手順

ステップ1：
Kiểm tra placeholder, format, trạng thái (active / focus / disable) của từng textbox

ステップ2：
Kiểm tra hiển thị dropdown tên JA / 都道府県 và checkbox cờ bản giấy / cờ bản điện tử

ステップ3：
Kiểm tra kích thước, vị trí, màu button "登録" / "前の画面に戻る"

### 期待結果

ステップ1：
Đúng theo thiết kế — placeholder khớp, khi focus thì màu viền đổi, khi disable thì hiển thị xám

ステップ2：
Tên JA là dropdown có placeholder "JAを選択してください", 都道府県 là dropdown có placeholder "選択してください" và hiển thị 47 都道府県 làm lựa chọn, cờ bản giấy / điện tử được hiển thị ở trạng thái chưa check

ステップ3：
Đúng theo thiết kế. Button đăng ký là primary (xanh), button quay lại là secondary (trắng), căn trái

補足：
・Toàn bộ phần tử form khớp hoàn toàn với thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-010 — Tab order và thao tác bàn phím (Tab / Enter)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký, focus ở body

### 手順

ステップ1：
Nhấn phím Tab liên tục, kiểm tra focus transition

ステップ2：
Nhấn phím Enter trong textbox

ステップ3：
Double-click / nhấn liên tục button đăng ký

### 期待結果

ステップ1：
Theo thứ tự trên xuống dưới, trái sang phải — Tên JA → Mã chi nhánh quản lý → Tên chi nhánh quản lý → Tên chi nhánh quản lý (kana) → Mã bưu điện → 都道府県 → Địa chỉ → Số điện thoại → FAX → Cờ bản giấy → Cờ bản điện tử → Biko → Button đăng ký → Button quay lại

ステップ2：
Không trigger submit form (`preventEnterImplicitSubmit` utility chặn submit ngầm bằng Enter)

ステップ3：
Lần nhấn đầu tiên bắt đầu submit, trong khi gửi thì button hiển thị disable, các lần nhấn sau bị bỏ qua, chỉ 1 record được đăng ký vào DB

補足：
・Tab order đúng theo thiết kế, toàn bộ có thể thao tác bằng bàn phím
・Theo vue.md §Block Enter implicit submit, form CRUD có ≥4 trường thì chặn submit ngầm bằng Enter

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chống double-submit — đảm bảo disable button khi đang submit là yếu tố cốt lõi của chất lượng UX.

## ACSMS-TC-009-011 — Kiểm tra giá trị default khi hiển thị màn đăng ký lần đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Vừa mở màn đăng ký

### 手順

ステップ1：
Kiểm tra dropdown Tên JA

ステップ2：
Kiểm tra các ô textbox Mã chi nhánh quản lý / Tên chi nhánh quản lý / Tên chi nhánh quản lý (kana) / Mã bưu điện / Địa chỉ / Số điện thoại / FAX / Biko

ステップ3：
Kiểm tra trạng thái check của cờ bản giấy / cờ bản điện tử

ステップ4：
Kiểm tra dropdown 都道府県

### 期待結果

ステップ1：
Chưa chọn (hiển thị placeholder "JAを選択してください")

ステップ2：
Toàn bộ các trường được hiển thị rỗng

ステップ3：
Cả hai được hiển thị ở trạng thái chưa check

ステップ4：
Chưa chọn (hiển thị placeholder "選択してください")

補足：
・Tuân thủ hoàn toàn quy cách giá trị default tại screen-design.md §1.2

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-012 — Hiển thị title header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký hoặc màn chỉnh sửa

### 手順

ステップ1：
Kiểm tra phía trái header phía trên màn hình

### 期待結果

ステップ1：
Chữ "管理支店マスタ登録画面" được hiển thị

補足：
・Chuỗi title được hiển thị đúng literal theo quy cách

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-013 — Hiển thị icon thông báo + menu user

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Kiểm tra phía phải header

ステップ2：
Hover chuột lên icon user

ステップ3：
Click icon user

### 期待結果

ステップ1：
Hiển thị theo thứ tự icon thông báo → icon user → tên login

ステップ2：
Khi hover thì màu nền thay đổi

ステップ3：
Dropdown được mở ra, hiển thị các menu như logout

補足：
・Toàn bộ hover / click interaction hoạt động đúng theo thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-014 — Hiển thị breadcrumb (màn đăng ký)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký

### 手順

ステップ1：
Kiểm tra vùng breadcrumb dưới title màn hình

ステップ2：
So sánh phân cấp breadcrumb với thiết kế

### 期待結果

ステップ1：
Cấp `ホーム / 管理支店マスタ明細検索 / 管理支店マスタ登録画面` được hiển thị

ステップ2：
Ký tự phân cách, text, có / không có link đều khớp (mục giữa "管理支店マスタ明細検索" là link click được, màn hiện tại hiển thị không link)

補足：
・Breadcrumb được hiển thị đúng cấp + đúng theo thiết kế
・Theo vue.md §Project breadcrumb convention, gồm 3 cấp (ホーム → list → đăng ký / chỉnh sửa)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-015 — Hoạt động chuyển trang của từng link trong breadcrumb

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở trạng thái mở màn đăng ký

### 手順

ステップ1：
Click "ホーム" trong breadcrumb

ステップ2：
Quay lại màn đăng ký, click "管理支店マスタ明細検索"

ステップ3：
Quay lại màn đăng ký, click "管理支店マスタ登録画面" (màn hiện tại)

### 期待結果

ステップ1：
Chuyển về `/dashboard`

ステップ2：
Chuyển về màn list `/kanri-shiten`

ステップ3：
Do là màn hiện tại, không có gì xảy ra (không reload)

補足：
・Từng link hoạt động đúng như mong đợi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-016 — Tên JA — Check required

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường ngoài Tên JA đã nhập giá trị hợp lệ
  - ・Test data: mã chi nhánh quản lý `1AA-3300-001`, tên chi nhánh quản lý `テスト管理支店`, 都道府県 東京都

### 手順

ステップ1：
Để dropdown Tên JA chưa chọn, nhấn button đăng ký

ステップ2：
Chọn dropdown Tên JA rồi click × để clear, nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường, submit bị chặn

ステップ2：
Hiển thị `必須項目です。` ngay dưới trường (giá trị `undefined` sau khi click × ở `allow-clear` được check required bằng Number check thay vì `?.trim()`)

補足：
・Giá trị `undefined` khi clear `<a-select allow-clear>` của antd được xử lý đúng thành lỗi required

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-017 — Mã chi nhánh quản lý — Check required (rỗng + chỉ space)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để Mã chi nhánh quản lý rỗng, nhấn button đăng ký

ステップ2：
Nhập 3 space nửa thân → nhấn button đăng ký

ステップ3：
Nhập 3 space toàn thân → nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường, submit bị chặn

ステップ2：
Sau khi BE trim space, được xử lý như rỗng và hiển thị `必須項目です。`

ステップ3：
Space toàn thân cũng thuộc đối tượng trim, hiển thị `必須項目です。`

補足：
・Cả rỗng lẫn chỉ space được xử lý như vi phạm required
・BE trim space xong xử lý như rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-018 — Mã chi nhánh quản lý — Check format (XXX-XXXX-XXX)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `ABC` (chỉ 3 ký tự) vào Mã chi nhánh quản lý → nhấn button đăng ký

ステップ2：
Nhập `113-330-001` (giữa chỉ 3 chữ số) vào Mã chi nhánh quản lý → nhấn button đăng ký

ステップ3：
Nhập `１１３-３３００-００１` (chữ số toàn thân) vào Mã chi nhánh quản lý → nhấn button đăng ký

ステップ4：
Nhập `113_3300_001` (phân cách bằng underscore) vào Mã chi nhánh quản lý → nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị `管理支店コードは「XXX-XXXX-XXX」の形式（半角英数字、特殊文字なし）で入力してください。` ngay dưới trường

ステップ2：
Cùng message như trên

ステップ3：
Cùng message như trên (ký tự toàn thân không phải ký tự half-width nên bị reject)

ステップ4：
Cùng message như trên (chỉ cho phép phân cách bằng dấu gạch ngang)

補足：
・Mã chi nhánh quản lý có dạng 3 ký tự alphanumeric nửa thân + dấu - + 4 ký tự alphanumeric nửa thân + dấu - + 3 ký tự alphanumeric nửa thân (tổng 12 ký tự)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-019 — Mã chi nhánh quản lý — Tự động bổ sung dấu gạch ngang (khi nhập 10 ký tự)

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `1AA3300001` (10 ký tự, không có dấu gạch ngang) vào Mã chi nhánh quản lý, blur focus (@blur)

ステップ2：
Kiểm tra giá trị nhập ở bước 1, nhấn button đăng ký

ステップ3：
Sau khi đăng ký, kiểm tra cột `kanri_shiten_code` trong DB

### 期待結果

ステップ1：
Giá trị trong ô input được tự động format thành `1AA-3300-001`

ステップ2：
Được tiếp nhận bình thường, trả về HTTP 201 (`message: 登録しました。`)

ステップ3：
`kanri_shiten_code` trong DB lưu `1AA-3300-001` (đã chèn dấu gạch ngang)

補足：
・Chuẩn hóa 2 tầng: FE `formatKanriShitenCode` utility + BE `normalizeKanriShitenCode` Transform
・Khi nhập 10 ký tự alphanumeric half-width, dấu gạch ngang tự động được chèn tại vị trí 3 / 7

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-020 — Mã chi nhánh quản lý — Số ký tự tối đa (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập `1AA-3300-001` (12 ký tự, format chuẩn) vào Mã chi nhánh quản lý → đăng ký

ステップ2：
Thử nhập ký tự thứ 13 trở đi vào ô Mã chi nhánh quản lý

ステップ3：
Paste "1AA-3300-001-EXTRA" (17 ký tự) vào ô Mã chi nhánh quản lý

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
Input bị block bởi maxlength=12 (không nhập được ký tự thứ 13)

ステップ3：
Bị cắt tại ký tự thứ 12, record đăng ký là 12 ký tự đúng format

補足：
・Giới hạn 12 ký tự được enforce 2 lớp bởi input maxlength và BE @MaxLength

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-021 — Mã chi nhánh quản lý — Lỗi khi trùng (DUPLICATE_CODE)

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=99, kanri_shiten_code='1AA-3300-999'` tồn tại trong DB

### 手順

ステップ1：
Nhập `1AA-3300-999` vào Mã chi nhánh quản lý, các trường khác nhập giá trị hợp lệ → nhấn button đăng ký

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='1AA-3300-999' AND deleted_at IS NULL`

### 期待結果

ステップ1：
Đăng ký thất bại, hiển thị toast

ステップ2：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, message `管理支店コード「1AA-3300-999」はすでに登録されています。`)

ステップ3：
Chỉ 1 record (không bị đăng ký trùng)

補足：
・Tính duy nhất được enforce bởi UNIQUE INDEX `UQ_m_kanri_shiten_code` của DB
・Record đã xóa logical không thuộc đối tượng UNIQUE (có thể tái sử dụng cùng mã)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-022 — Tên chi nhánh quản lý — Check required (rỗng + chỉ space)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để Tên chi nhánh quản lý rỗng, nhấn button đăng ký

ステップ2：
Chỉ nhập space nửa thân / toàn thân → nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường

ステップ2：
Sau khi trim space, được xử lý như rỗng, hiển thị `必須項目です。`

補足：
・Rỗng / chỉ space đều được xử lý như vi phạm required

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-023 — Tên chi nhánh quản lý — Giới hạn tối đa 100 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 100 ký tự (chuỗi mix toàn thân / nửa thân tùy ý) vào Tên chi nhánh quản lý → đăng ký

ステップ2：
Thử nhập ký tự thứ 101 vào Tên chi nhánh quản lý

ステップ3：
Paste chuỗi 110 ký tự vào Tên chi nhánh quản lý

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
Input bị block bởi maxlength (không nhập được ký tự thứ 101)

ステップ3：
Bị cắt tại ký tự thứ 100, record đăng ký là 100 ký tự

補足：
・Giới hạn 100 ký tự được enforce 2 lớp bởi input maxlength và BE @MaxLength

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-024 — Tên chi nhánh quản lý — Xử lý an toàn ký tự đặc biệt / HTML / SQL injection

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập HTML tag `<script>alert(1)</script>` vào Tên chi nhánh quản lý → đăng ký → kiểm tra hiển thị ở màn list

ステップ2：
Nhập SQL injection `テスト'; DROP TABLE m_kanri_shiten; --` vào Tên chi nhánh quản lý → đăng ký

ステップ3：
Kiểm tra stored XSS: sau khi đăng ký, hiển thị lại giá trị tại màn chỉnh sửa

### 期待結果

ステップ1：
Được hiển thị dưới dạng literal text (không bị execute), DB lưu chuỗi literal

ステップ2：
Được đăng ký như tên chi nhánh quản lý bình thường (injection bị vô hiệu bởi parameterized query), bảng `m_kanri_shiten` không bị xóa

ステップ3：
Được hiển thị nguyên dưới dạng literal text, JS không execute

補足：
・Vue auto-escape làm XSS không phát huy tác dụng
・Parameterized query của TypeORM làm SQL injection không phát huy tác dụng
・DB lưu literal (không giữ data đã escape)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Security critical — Nếu fail thì xử lý theo quy trình incident response.

## ACSMS-TC-009-025 — Tên chi nhánh quản lý (kana) — Check katakana nửa thân (pattern hợp lệ)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `ﾄｳｷｮｳﾁｭｳｵｳｼﾃﾝ` (katakana nửa thân) vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ2：
Nhập `ｻｯﾎﾟﾛ ｼﾃﾝ` (katakana nửa thân + space nửa thân) vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ3：
Nhập `ｶﾞｯｺｳ` (katakana nửa thân kèm dakuten / handakuten) vào Tên chi nhánh quản lý (kana) → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công, `kanri_shiten_name_kana` trong DB lưu literal

ステップ2：
Tiếp nhận bình thường, space nửa thân được cho phép bởi `\s` của regex `/^[ｦ-ﾟ\s]+$/u`

ステップ3：
Tiếp nhận bình thường, dakuten `ﾞ` (U+FF9E) / handakuten `ﾟ` (U+FF9F) nằm trong phạm vi

補足：
・Phạm vi katakana nửa thân U+FF66 ｦ – U+FF9F ﾟ đều được cho phép
・Space (U+0020 nửa thân / U+3000 toàn thân) cũng được cover bởi regex `\s`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-026 — Tên chi nhánh quản lý (kana) — Check katakana nửa thân (pattern bị reject)

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `トウキョウ` (katakana toàn thân) vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ2：
Nhập `とうきょう` (hiragana) vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ3：
Nhập `東京` (kanji) vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ4：
Nhập `TOKYO` (chữ và số nửa thân) vào Tên chi nhánh quản lý (kana) → đăng ký

### 期待結果

ステップ1：
Hiển thị `管理支店名(カナ)は半角カタカナで入力してください。` ngay dưới trường

ステップ2：
Cùng message như trên

ステップ3：
Cùng message như trên

ステップ4：
Cùng message như trên

補足：
・Bất cứ gì khác katakana nửa thân đều bị reject
・Regex `/^[ｦ-ﾟ\s]+$/u` validate ở cả 2 tầng FE / BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-027 — Tên chi nhánh quản lý (kana) — Giới hạn tối đa 100 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Nhập 100 ký tự katakana nửa thân vào Tên chi nhánh quản lý (kana) → đăng ký

ステップ2：
Thử nhập ký tự thứ 101 vào Tên chi nhánh quản lý (kana)

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
Input bị block bởi maxlength=100 (không nhập được ký tự thứ 101)

補足：
・Là trường optional, nhưng khi nhập thì áp dụng katakana nửa thân + giới hạn tối đa 100 ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-028 — 都道府県 — Check required

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để dropdown 都道府県 chưa chọn, nhấn button đăng ký

ステップ2：
Chọn 都道府県 rồi click × để clear, nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường

ステップ2：
Hiển thị `必須項目です。` ngay dưới trường

補足：
・Chỉ tiếp nhận mã tồn tại trong master 47 都道府県 (m_todofuken)
・Giá trị `undefined` khi clear `<a-select allow-clear>` của antd được xử lý như lỗi required

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-029 — 都道府県 — Check tính nhất quán với master (gửi mã không hợp lệ)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Từ Console DevTools gửi POST `/api/v1/kanri-shiten` với `todofuken_code: "99"` (mã không tồn tại)

ステップ2：
Kiểm tra HTTP status của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE todofuken_code='99'`

### 期待結果

ステップ1：
Request bị reject bởi check tính nhất quán với master ở BE

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ3：
0 record (không bị đăng ký)

補足：
・Mã không tồn tại trong master 47 都道府県 (m_todofuken) bị BE §4.3 reject

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-030 — Mã bưu điện — Optional (cho phép rỗng)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, Tên JA / Mã chi nhánh quản lý / Tên chi nhánh quản lý / 都道府県 đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để Mã bưu điện rỗng, nhấn button đăng ký

ステップ2：
Kiểm tra DB

### 期待結果

ステップ1：
Tiếp nhận bình thường, trả về HTTP 201 (`message: 登録しました。`)

ステップ2：
`yubin_no` trong DB lưu chuỗi rỗng (BE @Transform(blankToUndef) chuyển thành `undefined`, column DEFAULT là chuỗi rỗng)

補足：
・Vì là trường optional nên nhập rỗng được cho phép

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-031 — Mã bưu điện — Check 7 chữ số nửa thân

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `1000001` (7 chữ số nửa thân) vào Mã bưu điện → đăng ký

ステップ2：
Nhập `100-0001` (có dấu gạch ngang) vào Mã bưu điện → đăng ký

ステップ3：
Nhập `100000` (6 chữ số) vào Mã bưu điện → đăng ký

ステップ4：
Nhập `１２３４５６７` (chữ số toàn thân) vào Mã bưu điện → đăng ký

ステップ5：
Nhập `ABC1234` (mix chữ cái) vào Mã bưu điện → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
Hiển thị `郵便番号は半角数字のみ（ハイフンなし）入力可能です。` ngay dưới trường

ステップ3：
Cùng message như trên (dưới 7 chữ số)

ステップ4：
Cùng message như trên

ステップ5：
Cùng message như trên

補足：
・Regex `/^\d{7}$/` chỉ cho phép đúng 7 chữ số nửa thân

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-032 — Địa chỉ — Optional + giới hạn tối đa 200 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Để Địa chỉ rỗng và đăng ký → hoàn tất bình thường

ステップ2：
Nhập 200 ký tự (chuỗi mix toàn thân / nửa thân tùy ý) vào Địa chỉ → đăng ký

ステップ3：
Thử nhập ký tự thứ 201 vào Địa chỉ

### 期待結果

ステップ1：
Tiếp nhận bình thường, lưu chuỗi rỗng

ステップ2：
Tiếp nhận bình thường, đăng ký thành công, `address` trong DB lưu 200 ký tự

ステップ3：
Input bị block bởi maxlength=200 (không nhập được ký tự thứ 201)

補足：
・Trường optional nên cho phép rỗng, khi nhập thì áp dụng giới hạn tối đa 200 ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-033 — Số điện thoại — Check chữ số nửa thân + tối đa 15 ký tự

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `0312345678` (10 chữ số nửa thân) vào Số điện thoại → đăng ký

ステップ2：
Nhập `03-1234-5678` (có dấu gạch ngang) vào Số điện thoại → đăng ký

ステップ3：
Nhập `０３１２３４５６７８` (chữ số toàn thân) vào Số điện thoại → đăng ký

ステップ4：
Thử nhập ký tự thứ 16 vào Số điện thoại

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công, `tel` trong DB lưu literal

ステップ2：
Hiển thị `電話番号は半角数字のみ（ハイフンなし）入力可能です。` ngay dưới trường

ステップ3：
Cùng message như trên

ステップ4：
Input bị block bởi maxlength=15

補足：
・Regex `/^\d{1,15}$/` chỉ cho phép tối đa 15 chữ số nửa thân
・Trường optional nên cho phép rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-034 — FAX — Check chữ số nửa thân + tối đa 15 ký tự

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `0312345679` (10 chữ số nửa thân) vào FAX → đăng ký

ステップ2：
Nhập `03-1234-5679` (có dấu gạch ngang) vào FAX → đăng ký

ステップ3：
Nhập `０３１２３４５６７９` (chữ số toàn thân) vào FAX → đăng ký

ステップ4：
Thử nhập ký tự thứ 16 vào FAX

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công, `fax` trong DB lưu literal

ステップ2：
Hiển thị `FAXは半角数字のみ（ハイフンなし）入力可能です。` ngay dưới trường

ステップ3：
Cùng message như trên

ステップ4：
Input bị block bởi maxlength=15

補足：
・Regex `/^\d{1,15}$/` chỉ cho phép tối đa 15 chữ số nửa thân
・Trường optional nên cho phép rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-035 — Cờ bản giấy — Toggle (check / uncheck)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để Cờ bản giấy uncheck rồi đăng ký → kiểm tra DB

ステップ2：
Check Cờ bản giấy → đăng ký → kiểm tra DB

### 期待結果

ステップ1：
Cột `paper_flg` trong DB lưu `false`

ステップ2：
Cột `paper_flg` trong DB lưu `true`

補足：
・Giá trị default là `false` (xem screen-design.md §1.2)
・Được lưu đúng dưới dạng boolean true / false

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-036 — Cờ bản điện tử — Toggle (check / uncheck)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để Cờ bản điện tử uncheck rồi đăng ký → kiểm tra DB

ステップ2：
Check Cờ bản điện tử → đăng ký → kiểm tra DB

### 期待結果

ステップ1：
Cột `denshi_flg` trong DB lưu `false`

ステップ2：
Cột `denshi_flg` trong DB lưu `true`

補足：
・Giá trị default là `false` (xem screen-design.md §1.2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-037 — Biko — Optional + giới hạn tối đa 500 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Để Biko rỗng rồi đăng ký → hoàn tất bình thường

ステップ2：
Nhập 500 ký tự (chuỗi mix toàn thân / nửa thân tùy ý) vào Biko → đăng ký

ステップ3：
Thử nhập ký tự thứ 501 vào Biko

ステップ4：
Nhập text nhiều dòng có chứa xuống dòng vào Biko → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường, lưu chuỗi rỗng

ステップ2：
Tiếp nhận bình thường, đăng ký thành công, `biko` trong DB lưu 500 ký tự

ステップ3：
Input bị block bởi textarea maxlength=500 (không nhập được ký tự thứ 501)

ステップ4：
Đăng ký được bao gồm cả xuống dòng, DB lưu literal

補足：
・Trường optional, giới hạn tối đa 500 ký tự
・Vì là textarea nên có thể đăng ký bao gồm xuống dòng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-038 — Auto-focus khi có lỗi nhập (trường lỗi đầu tiên)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, có nhiều trường chứa giá trị không hợp lệ

### 手順

ステップ1：
Trạng thái Tên JA chưa chọn, Mã chi nhánh quản lý `INVALID`, Tên chi nhánh quản lý rỗng, 都道府県 chưa chọn → nhấn button đăng ký

ステップ2：
Kiểm tra vị trí focus

ステップ3：
Chọn Tên JA rồi nhấn lại button đăng ký

ステップ4：
Kiểm tra vị trí focus

### 期待結果

ステップ1：
Nhiều lỗi được hiển thị

ステップ2：
Focus vào dropdown Tên JA (trường lỗi đầu tiên trong mảng `FIELD_ORDER`)

ステップ3：
Hiển thị lỗi của Mã chi nhánh quản lý, Tên chi nhánh quản lý và 都道府県

ステップ4：
Focus vào ô Mã chi nhánh quản lý (trường lỗi đầu tiên kế tiếp trong FIELD_ORDER)

補足：
・Theo vue.md §Auto-focus the first error on submit, auto-focus vào trường lỗi đầu tiên theo thứ tự template + scrollIntoView

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-039 — Chặn submit ngầm bằng phím Enter

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Đặt focus vào ô Tên chi nhánh quản lý

ステップ2：
Nhấn phím Enter

ステップ3：
Đặt focus vào textarea Biko, nhấn phím Enter

ステップ4：
Đặt focus vào button đăng ký, nhấn phím Enter

### 期待結果

ステップ1：
Trạng thái focus đặt ở ô Tên chi nhánh quản lý

ステップ2：
Không trigger submit form (chặn submit ngầm)

ステップ3：
Trong textarea được xử lý như xuống dòng (không thuộc đối tượng chặn submit ngầm)

ステップ4：
Submit form được thực hiện như là button đăng ký đã bị click (phím Enter trên button submit được giữ lại vì accessibility)

補足：
・Utility preventEnterImplicitSubmit giữ ngoại lệ cho phép Enter qua khi ở trong textarea / trên button submit / trong antd combobox
・Tuân thủ vue.md §Block Enter implicit submit

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-040 — JA ID — Check tính nhất quán với master (gửi JA ID không hợp lệ)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Từ Console DevTools gửi POST `/api/v1/kanri-shiten` với `ja_id: 99999` (ID không tồn tại)

ステップ2：
Kiểm tra HTTP status của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE ja_id=99999`

### 期待結果

ステップ1：
Request bị reject bởi check tính nhất quán với master ở BE

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ3：
0 record (không bị đăng ký)

補足：
・`ja_id` không tồn tại / đã xóa logical trong `m_ja` bị BE §4.4 reject

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-041 — Mã chi nhánh quản lý — Tự động trim space đầu / cuối

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, các trường khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `  1AA-3300-002  ` (space nửa thân ở đầu / cuối) vào Mã chi nhánh quản lý → đăng ký

ステップ2：
Nhập `　1AA-3300-003　` (space toàn thân ở đầu / cuối) vào Mã chi nhánh quản lý → đăng ký

### 期待結果

ステップ1：
DB lưu `1AA-3300-002` (đã trim space đầu / cuối)

ステップ2：
DB lưu `1AA-3300-003` (đã trim space đầu / cuối)

補足：
・Xử lý `trim()` được áp dụng nhất quán ở BE `normalizeKanriShitenCode` Transform

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-042 — Kiểm tra shape response VALIDATION_ERROR (lỗi nhiều trường đồng thời)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, Tên JA / Mã chi nhánh quản lý / Tên chi nhánh quản lý / 都道府県 đều chưa nhập

### 手順

ステップ1：
Trong khi mở tab Network của DevTools, nhấn button đăng ký

ステップ2：
Kiểm tra cấu trúc JSON của response body

ステップ3：
Xác nhận có hiển thị message lỗi dưới từng trường form

### 期待結果

ステップ1：
Gửi request đến BE, trả về HTTP 400

ステップ2：
Response shape có cấu trúc như sau:
`{ error_code: "VALIDATION_ERROR", message: "入力値が不正です。詳細はerrorsフィールドを確認してください", errors: [{ field, message }, …] }`, mảng `errors` chứa các phần tử tương ứng với các trường chưa nhập

ステップ3：
Hiển thị message tương ứng (như `必須項目です。`) ngay dưới từng trường

補足：
・BE GlobalExceptionFilter trả VALIDATION_ERROR theo shape chung
・FE `useApiForm` map `errors[]` vào `fieldErrors`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-043 — Mã chi nhánh quản lý — Trùng (tái sử dụng mã của record đã xóa logical)

- 観点ID: VP-B-08
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=88, kanri_shiten_code='1AA-3300-888', deleted_at IS NOT NULL` (đã xóa logical)

### 手順

ステップ1：
Nhập `1AA-3300-888` vào Mã chi nhánh quản lý, các trường khác nhập giá trị hợp lệ → nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT kanri_shiten_id, kanri_shiten_code, deleted_at FROM m_kanri_shiten WHERE kanri_shiten_code='1AA-3300-888'`

### 期待結果

ステップ1：
Tiếp nhận bình thường, trả về HTTP 201 (`message: 登録しました。`)

ステップ2：
Record với `kanri_shiten_id` mới được thêm (`deleted_at IS NULL`), record cũ đã xóa logical vẫn còn

補足：
・Check tính duy nhất loại trừ record đã xóa logical bằng `WHERE deleted_at IS NULL`
・Mã đã xóa có thể tái sử dụng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-044 — Đăng ký với input tối thiểu toàn trường (chỉ trường required)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký
  - ・Test data: Tên JA `ja-001`, Mã chi nhánh quản lý `1AA-3300-100`, Tên chi nhánh quản lý `テスト管理支店`, 都道府県 `東京都`

### 手順

ステップ1：
Chỉ nhập trường required (các trường optional để rỗng / uncheck) → đăng ký

ステップ2：
Kiểm tra DB

### 期待結果

ステップ1：
Tiếp nhận bình thường, trả về HTTP 201 (`message: 登録しました。`, chuyển về màn list `/kanri-shiten`)

ステップ2：
Record được đăng ký, trường optional được lưu dưới dạng chuỗi rỗng / `false` (boolean)

補足：
・Có thể đăng ký chỉ với trường required, trường optional được lưu giá trị default

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-045 — Đăng ký với input đầy đủ toàn trường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký
  - ・Test data: toàn trường giá trị hợp lệ (Tên JA ja-001, Mã chi nhánh quản lý `1AA-3300-200`, Tên chi nhánh quản lý `フル入力テスト管理支店`, Tên chi nhánh quản lý (kana) `ﾌﾙﾆｭｳﾘｮｸﾃｽﾄ`, 都道府県 東京都, Mã bưu điện `1000001`, Địa chỉ `千代田区千代田1-1-1`, Số điện thoại `0312345678`, FAX `0312345679`, check bản giấy, check bản điện tử, Biko `テスト備考`)

### 手順

ステップ1：
Nhập giá trị hợp lệ vào toàn trường → nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT * FROM m_kanri_shiten WHERE kanri_shiten_code='1AA-3300-200'`

### 期待結果

ステップ1：
Tiếp nhận bình thường, trả về HTTP 201 (`message: 登録しました。`, chuyển về màn list)

ステップ2：
Toàn trường được lưu đúng giá trị nhập, `created_at` ghi thời điểm hiện tại, `created_by` ghi account_id của user đang login

補足：
・Toàn trường được persist chính xác
・Cột timestamp được lưu theo timezone JST

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-046 — Dropdown Tên JA — Hiển thị toàn bộ JA

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký
  - ・Data sẵn có: nhiều record JA tồn tại trong `m_ja` (ja-001, ja-002, ja-003, …)

### 手順

ステップ1：
Click dropdown Tên JA, kiểm tra các lựa chọn

ステップ2：
Kiểm tra format hiển thị

### 期待結果

ステップ1：
Toàn bộ JA (chưa bị xóa logical) được hiển thị

ステップ2：
Được hiển thị theo format `{ja_code} - {ja_name}`

補足：
・NICHINO_ADMIN truy cập được toàn bộ JA, không có giới hạn data scope
・Tối đa lấy 100 dòng (per_page=100)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-047 — Dropdown 都道府県 — Hiển thị 47 dòng

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký

### 手順

ステップ1：
Click dropdown 都道府県

ステップ2：
Kiểm tra thứ tự hiển thị

### 期待結果

ステップ1：
47 都道府県 được hiển thị làm lựa chọn (北海道〜沖縄県)

ステップ2：
Sắp xếp theo `todofuken_code` tăng dần (01〜47)

補足：
・Lấy từ master 都道府県 thông qua API GET `/api/v1/todofuken`
・Hiển thị toàn bộ 47 dòng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-048 — Đăng ký Normal (DB persist + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data: Tên JA ja-001, Mã chi nhánh quản lý `1AA-3300-300`, Tên chi nhánh quản lý `業務ロジックテスト管理支店`, 都道府県 東京都, các trường optional khác

### 手順

ステップ1：
Nhập giá trị hợp lệ vào toàn trường → nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT * FROM m_kanri_shiten WHERE kanri_shiten_code='1AA-3300-300'`

ステップ3：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_table='m_kanri_shiten' AND operation='CREATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 201 (`message: 登録しました。`), hiển thị toast thành công `登録しました。`, chuyển về màn list `/kanri-shiten`

ステップ2：
1 record được INSERT, từng cột đúng giá trị nhập, `created_at` ghi thời điểm hiện tại, `created_by` ghi account_id của user đang login

ステップ3：
1 dòng audit log được ghi, `log_type=1`, `result_status=1`, `gamen_name='管理支店マスタ登録画面(ACSMS-SCR-009)'`, `operation='CREATE'`, `target_id` chứa `kanri_shiten_id` mới, `after_value` chứa JSON data đăng ký

補足：
・Xử lý chính + audit log được thực hiện trong một transaction duy nhất (tuân thủ nestjs.md §Audit Log)
・Tính nhất quán được đảm bảo

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-049 — Đăng ký — Ghi audit log khi thất bại (đường DUPLICATE_CODE)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_code='1AA-3300-999'` đã đăng ký

### 手順

ステップ1：
Nhập mã trùng `1AA-3300-999` vào Mã chi nhánh quản lý → đăng ký

ステップ2：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_table='m_kanri_shiten' AND result_status=2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`), không có row mới được thêm vào `m_kanri_shiten`

ステップ2：
1 dòng error log được ghi, `log_type=3`, `result_status=2`, `error_message` chứa nội dung lỗi DUPLICATE_CODE

補足：
・Error log được ghi ngoài transaction của xử lý chính (không thuộc đối tượng rollback)
・Tuân thủ nestjs.md §Audit Log "Error log (log_type=3) được ghi riêng ngoài transaction"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-050 — Đăng ký — Ranh giới transaction (DB INSERT + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Setup DB sao cho INSERT audit log thất bại (vd: cài đặt vi phạm constraint NOT NULL trên bảng `t_log`)

### 手順

ステップ1：
Nhấn button đăng ký với giá trị hợp lệ

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='トランザクションテスト'`

ステップ3：
Kiểm tra audit log

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`)

ステップ2：
0 record (business write đã được rollback)

ステップ3：
Audit log (log_type=1) không được ghi, error log (log_type=3) được ghi sau rollback ngoài transaction

補足：
・Audit log fail → rollback business write để duy trì data integrity
・Tuân thủ rule `nestjs.md §I/O & External Services / Transaction`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Test quan trọng đảm bảo tính nhất quán giữa audit trail và state DB.

## ACSMS-TC-009-051 — Đăng ký — Hành vi khi nhấn button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đang nhập (có giá trị)

### 手順

ステップ1：
Nhập giá trị vào từng trường tại màn đăng ký

ステップ2：
Nhấn button "前の画面に戻る"

ステップ3：
Kiểm tra DB

### 期待結果

ステップ1：
Giá trị nhập được giữ trong state form

ステップ2：
Chuyển về màn list `/kanri-shiten` mà không có modal xác nhận (popup xác nhận trong screen-design.md §4 đã được drop ở implementation)

ステップ3：
Không bị đăng ký (không có record mới trong DB)

補足：
・Khi cancel không có thay đổi DB, không có ghi log
・Implementation theo phương châm không hiển thị dialog xác nhận

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Popup xác nhận (ACSMS-MSG-009-008) ghi trong screen-design.md §4.1 đã được drop ở implementation hiện hành. Đã xác nhận phương châm implementation.

## ACSMS-TC-009-052 — Đăng ký — Chống double-submit (nhấn liên tục cùng data)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn liên tục button đăng ký (khoảng 10 lần trong 5 giây)

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='連打テスト'`

### 期待結果

ステップ1：
Lần nhấn đầu tiên bắt đầu submit, trong khi gửi thì button hiển thị disable (`:loading="submitting"`), các lần nhấn sau bị bỏ qua

ステップ2：
Chỉ 1 record được đăng ký (không có đăng ký trùng)

補足：
・`submitting` state management của `useApiForm` chặn double-submit
・Sau khi submit hoàn tất / sau khi lỗi, trạng thái button trở lại như cũ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-053 — Đăng ký — Kiểm tra điểm đến khi thành công

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra URL điểm đến

ステップ3：
Xác nhận record chi nhánh quản lý đã đăng ký được hiển thị trên màn list

### 期待結果

ステップ1：
Trả về HTTP 201, hiển thị toast thành công `登録しました。`

ステップ2：
Chuyển về màn list `/kanri-shiten` (router.push name: 'KanriShitenList')

ステップ3：
Record mới được hiển thị ở đầu list (default sort `updated_at DESC`)

補足：
・Sau khi đăng ký, record mới được hiển thị ở đầu màn list
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

## ACSMS-TC-009-054 — Đăng ký — Kiểm tra timestamp JST

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đăng ký trong giờ làm việc JST 9:00 〜 18:00
  - ・Server timezone=Asia/Tokyo

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT created_at, updated_at FROM m_kanri_shiten WHERE kanri_shiten_id={ID mới}`

ステップ3：
Kiểm tra `created_at` trong response API

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
`created_at` / `updated_at` được ghi với timezone JST (offset `+09:00`)

ステップ3：
`created_at` trong response được trả về theo format ISO 8601 kèm offset `+09:00` (vd: `2026-05-14T10:00:00+09:00`)

補足：
・Tuân thủ nestjs.md §Timestamp policy
・Vận hành nhất quán JST với TIMESTAMPTZ + server TZ=Asia/Tokyo

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-055 — Đăng ký — Lưu an toàn thông tin nhạy cảm (before_value/after_value)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra audit log: `SELECT after_value FROM t_log WHERE target_id={ID mới} AND operation='CREATE'`

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
`after_value` chứa JSON data đăng ký, `before_value` là chuỗi rỗng (vì là CREATE), không chứa thông tin nhạy cảm như password

補足：
・Tuân thủ nestjs.md §Audit Log "Không include thông tin nhạy cảm như password"
・before_value được set chuỗi rỗng vì là INSERT

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-056 — Màn chỉnh sửa — Hiển thị data có sẵn

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=10, kanri_shiten_code='1AA-3300-010'` tồn tại

### 手順

ステップ1：
Tại màn list, click cột mã chi nhánh quản lý `1AA-3300-010`

ステップ2：
Kiểm tra giá trị khởi tạo của từng field

### 期待結果

ステップ1：
Màn `/kanri-shiten/10/edit` được hiển thị

ステップ2：
Khớp hoàn toàn với giá trị DB — Tên JA / Mã chi nhánh quản lý / Tên chi nhánh quản lý / Tên chi nhánh quản lý (kana) / 都道府県 / Mã bưu điện / Địa chỉ / Số điện thoại / FAX / Cờ bản giấy / Cờ bản điện tử / Biko đều khớp

補足：
・Data lấy từ GET /api/v1/kanri-shiten/{id} được phản ánh vào form
・Tên 都道府県 lấy từ JOIN cũng được hiển thị kèm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-057 — Màn chỉnh sửa — Mã chi nhánh quản lý không thể thay đổi (read-only)

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=20, kanri_shiten_code='1AA-3300-020', ja_id=1`
  - ・Màn chỉnh sửa `/kanri-shiten/20/edit` đã hiển thị

### 手順

ステップ1：
Xác nhận bằng mắt ô input "Mã chi nhánh quản lý" trên màn đang bị disable

ステップ2：
Kiểm tra attribute `disabled` của phần tử input bằng DevTools

ステップ3：
Thực thi `fetch('/api/v1/kanri-shiten/20', { method: 'PUT', body: JSON.stringify({ kanri_shiten_code: '1AA-3300-HACK', kanri_shiten_name: 'XXX', todofuken_code: '13' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })` từ Console DevTools

ステップ4：
Kiểm tra DB: `SELECT kanri_shiten_code FROM m_kanri_shiten WHERE kanri_shiten_id=20`

### 期待結果

ステップ1：
Ô input Mã chi nhánh quản lý hiển thị ở trạng thái disable, user không chỉnh sửa được

ステップ2：
Có attribute `disabled`

ステップ3：
Trả về HTTP 200 (bản thân update vẫn thành công)

ステップ4：
Cột `kanri_shiten_code` vẫn là `1AA-3300-020` (do BE loại `kanri_shiten_code` khỏi update body nên không bị thay đổi)

補足：
・Tuân thủ api.md §ghi chú update body "không include `kanri_shiten_code` và `ja_id` vào update body"
・FE `:disabled="isEdit"` chỉ là UX. Ranh giới security thực sự là thiết kế DTO của BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-058 — Màn chỉnh sửa — Tên JA không thể thay đổi (read-only)

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=21, ja_id=1`
  - ・Màn chỉnh sửa `/kanri-shiten/21/edit` đã hiển thị

### 手順

ステップ1：
Xác nhận bằng mắt dropdown "Tên JA" trên màn đang bị disable

ステップ2：
Thực thi `fetch('/api/v1/kanri-shiten/21', { method: 'PUT', body: JSON.stringify({ ja_id: 99, kanri_shiten_name: 'XXX', todofuken_code: '13' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })` từ Console DevTools

ステップ3：
Kiểm tra DB: `SELECT ja_id FROM m_kanri_shiten WHERE kanri_shiten_id=21`

### 期待結果

ステップ1：
Dropdown Tên JA hiển thị ở trạng thái disable, user không chỉnh sửa được

ステップ2：
Trả về HTTP 200 (bản thân update vẫn thành công)

ステップ3：
Cột `ja_id` vẫn là `1` (do BE loại `ja_id` khỏi update body nên không bị thay đổi)

補足：
・Tên JA không thể thay đổi sau khi đăng ký (JA thuộc của chi nhánh quản lý là cố định)
・Tuân thủ api.md §ghi chú update body

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-059 — Chỉnh sửa Normal update (DB + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=10` ở state có thể chỉnh sửa
  - ・Input chỉnh sửa: Tên chi nhánh quản lý `更新後の名前`, Địa chỉ `更新後の住所`

### 手順

ステップ1：
Tại màn chỉnh sửa thay đổi giá trị → nhấn button update

ステップ2：
Kiểm tra DB: `SELECT kanri_shiten_name, address, updated_at FROM m_kanri_shiten WHERE kanri_shiten_id=10`

ステップ3：
Kiểm tra audit log: `SELECT * FROM t_log WHERE target_id=10 AND operation='UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 200 (`message: 更新しました。`), hiển thị toast thành công `更新しました。`, chuyển về màn list `/kanri-shiten`

ステップ2：
`kanri_shiten_name` là `更新後の名前`, `address` là `更新後の住所`, `updated_at` được update thành thời điểm hiện tại

ステップ3：
1 dòng được ghi, JSON `before_value` chứa giá trị cũ, JSON `after_value` chứa giá trị mới, `log_type=1`, `result_status=1`, `operation='UPDATE'`

補足：
・DB update thành công, `updated_at` tự động update
・Có thể so sánh đầy đủ trước / sau update trong audit log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-060 — Chỉnh sửa — Xử lý conflict khi edit đồng thời (optimistic lock)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Data sẵn có: `kanri_shiten_id=10` tồn tại
  - ・User A: tại trình duyệt A đang mở `/kanri-shiten/10/edit` và nhập
  - ・User B: tại trình duyệt B khác chỉnh sửa cùng record và lưu trước

### 手順

ステップ1：
User B nhấn button update với giá trị hợp lệ trước → thành công

ステップ2：
User A nhấn button update (với `updated_at` cũ)

ステップ3：
User A reload màn hình

### 期待結果

ステップ1：
`updated_at` của DB được update

ステップ2：
Conflict được phát hiện, submit bị chặn (`error_code` cho conflict optimistic lock chưa định nghĩa quy cách (TBD))

ステップ3：
Nội dung update của User B được phản ánh, có thể chỉnh sửa lại

補足：
・Optimistic lock chống mất update
・TBD: error_code và text toast khi conflict optimistic lock chưa định nghĩa trong api.md / screen-design.md. Sẽ update sau khi thiết kế xong.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chống mất update — bắt buộc vì có ảnh hưởng nghiêm trọng đến tính nhất quán của data master quan trọng.

## ACSMS-TC-009-061 — Chỉnh sửa — Hành vi khi nhấn button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn chỉnh sửa, đã nhập thay đổi

### 手順

ステップ1：
Tại màn chỉnh sửa, nhập thay đổi giá trị cho từng trường

ステップ2：
Nhấn button "前の画面に戻る"

ステップ3：
Kiểm tra DB

ステップ4：
Kiểm tra audit log

### 期待結果

ステップ1：
Giá trị nhập được giữ trong state form

ステップ2：
Chuyển về màn list `/kanri-shiten` mà không có modal xác nhận

ステップ3：
Không bị update, giữ nguyên giá trị cũ

ステップ4：
Không có UPDATE log được ghi

補足：
・Khi cancel không có thay đổi DB, không có ghi log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-062 — Chỉnh sửa — Update từng phần (chỉ update trường đã thay đổi)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: `kanri_shiten_id=11` có giá trị cũ

### 手順

ステップ1：
Mở màn chỉnh sửa

ステップ2：
Chỉ thay đổi Số điện thoại thành `0399999999` → nhấn button update

ステップ3：
Kiểm tra DB: `SELECT * FROM m_kanri_shiten WHERE kanri_shiten_id=11`

### 期待結果

ステップ1：
Data sẵn có được hiển thị trên form

ステップ2：
Update thành công, `updated_at` được update thành thời điểm hiện tại

ステップ3：
Chỉ `tel` được đổi thành `0399999999`, các trường khác giữ nguyên giá trị cũ (Tên chi nhánh quản lý / Địa chỉ / Mã bưu điện / FAX / Biko v.v.)

補足：
・Khi update từng phần cũng gửi toàn bộ trường bằng PUT, nhưng nếu không thay đổi thì giá trị DB thực chất không thay đổi
・`updated_by` được update thành account_id của user đang login

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-063 — Chỉnh sửa — Validation đầu vào (thử update với trường required rỗng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn chỉnh sửa, đang hiển thị data sẵn có

### 手順

ステップ1：
Đổi Tên chi nhánh quản lý thành rỗng → nhấn button update

ステップ2：
Clear dropdown 都道府県 bằng × → nhấn button update

ステップ3：
Kiểm tra DB

### 期待結果

ステップ1：
Hiển thị `必須項目です。` ngay dưới trường, submit bị chặn

ステップ2：
Hiển thị `必須項目です。` ngay dưới trường

ステップ3：
Không bị update, giữ nguyên giá trị cũ

補足：
・Màn chỉnh sửa áp dụng check required tương đương màn đăng ký
・BE PUT DTO có `kanri_shiten_name` / `todofuken_code` là required

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-064 — Màn chỉnh sửa — Truy cập trực tiếp record đã xóa (NOT_FOUND)

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: record chi nhánh quản lý (`kanri_shiten_id=999`) đã xóa (hoặc không tồn tại)

### 手順

ステップ1：
Nhập `/kanri-shiten/999/edit` vào address bar trình duyệt, truy cập trực tiếp

ステップ2：
Kiểm tra GET `/api/v1/kanri-shiten/999` trong tab Network của DevTools

### 期待結果

ステップ1：
Chuyển trang thất bại, bị bounce về `/dashboard`

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`)

補足：
・Truy cập đến resource không tồn tại / đã xóa đều trả về NOT_FOUND
・Tương ứng ACSMS-MSG-009-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-009-065 — Lỗi chung UNAUTHORIZED — Xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ tại màn đăng ký
  - ・Đã quá 24h kể từ thao tác cuối, TTL session Redis đã hết hạn

### 手順

ステップ1：
Nhấn button "登録", gửi API request

ステップ2：
Kiểm tra nội dung response và chuyển trang

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='SESSION-TEST'`

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Phía FE state user trong Pinia auth store được clear, tự động chuyển về `/login?redirect=/kanri-shiten/create`

ステップ3：
0 record (không bị đăng ký)

補足：
・Khi session hết hạn, BE SessionAuthGuard trả 401, axios interceptor phía FE thống nhất chuyển về màn login
・Giá trị nhập bị bỏ (cần nhập lại sau khi login lại)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-066 — Lỗi chung BAD_REQUEST — Request param không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang mở tab Network của DevTools trình duyệt

### 手順

ステップ1：
Thực thi `fetch('/api/v1/kanri-shiten', { method: 'POST', body: '{invalid json', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })` từ Console DevTools

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='BAD-REQ-TEST'`

### 期待結果

ステップ1：
Request bị reject bởi body parser của BE

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ3：
0 record (không bị đăng ký)

補足：
・Lỗi parse JSON, Content-Type không hợp lệ, param không xác định đều map vào BAD_REQUEST
・Error log với `log_type=3` được ghi vào `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-067 — Lỗi chung VALIDATION_ERROR — Kiểm tra shape response

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang mở tab Network của DevTools trình duyệt

### 手順

ステップ1：
Tại màn đăng ký, để trống toàn bộ trường required (Tên JA, Mã chi nhánh quản lý, Tên chi nhánh quản lý, 都道府県) rồi nhấn button đăng ký

ステップ2：
Kiểm tra cấu trúc JSON của response body

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください`)

ステップ2：
Response shape có chứa mảng `errors` như sau:
`{ error_code: "VALIDATION_ERROR", message: "...", errors: [{ field: "ja_id", message: "JAを選択してください。" }, { field: "kanri_shiten_code", message: "管理支店コードを入力してください。" }, …] }`

補足：
・ValidationPipe + GlobalExceptionFilter phía BE trả VALIDATION_ERROR theo shape chung
・`useApiForm` phía FE map `errors[]` vào `<a-form-item :help>`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-068 — Lỗi chung TOO_MANY_REQUESTS — Vượt quá rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ tại màn đăng ký
  - ・Script test gửi >100 request POST `/api/v1/kanri-shiten` trong 1 phút

### 手順

ステップ1：
Khởi chạy script, gửi request tần suất cao đến API đăng ký

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
100 request đầu response bình thường, từ đó trở đi trả về 429

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ3：
Hiển thị toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`, button đăng ký bị tạm disable

補足：
・NestJS @Throttle decorator + AWS WAF rate limit block ở cả tầng infra / app
・Tuân thủ quan điểm VP-A-08 "Rate limit / Throttling"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-069 — Lỗi chung INTERNAL_SERVER_ERROR — Giả lập server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ tại màn đăng ký
  - ・Phía BE cố tình ngắt kết nối DB hoặc throw exception

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra hiển thị toast phía màn hình

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM m_kanri_shiten WHERE kanri_shiten_code='SERVER-ERR-TEST'`

ステップ5：
Kiểm tra error log: `SELECT * FROM t_log WHERE log_type=3 AND target_table='m_kanri_shiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 500

ステップ2：
`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`

ステップ3：
Hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`, vẫn ở màn đăng ký, giá trị nhập được giữ lại

ステップ4：
0 record (đã rollback)

ステップ5：
1 dòng error log được ghi, `log_type=3`, `result_status=2`, `error_message` chứa nội dung exception, `stack_trace` chứa stack trace

補足：
・Cả hai trường hợp lỗi đều duy trì data integrity
・Error log được ghi riêng ngoài transaction của xử lý chính nên vẫn còn sau khi rollback

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-070 — Lỗi chung NOT_FOUND — Truy cập chỉnh sửa record đã xóa

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Data sẵn có: record chi nhánh quản lý (`kanri_shiten_id=999`) đã xóa (hoặc không tồn tại)

### 手順

ステップ1：
Nhập `/kanri-shiten/999/edit` vào address bar trình duyệt, truy cập trực tiếp

ステップ2：
Kiểm tra GET `/api/v1/kanri-shiten/999` trong tab Network của DevTools

ステップ3：
Thực thi `fetch('/api/v1/kanri-shiten/999', { method: 'PUT', body: JSON.stringify({ kanri_shiten_name: 'X', todofuken_code: '13' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })` từ Console DevTools

### 期待結果

ステップ1：
Chuyển trang thất bại, hiển thị toast lỗi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`)

ステップ3：
Trả về HTTP 404 (cùng error_code và message như trên)

補足：
・Truy cập đến resource không tồn tại / đã xóa đều trả về NOT_FOUND
・Tương ứng ACSMS-MSG-009-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-071 — Lỗi chung — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ tại màn đăng ký
  - ・Set Throttling tab Network của DevTools thành "Offline"

### 手順

ステップ1：
Nhấn button đăng ký khi mạng đang ngắt

ステップ2：
Kiểm tra hiển thị toast phía màn hình

ステップ3：
Kiểm tra trạng thái giá trị nhập

### 期待結果

ステップ1：
Request thất bại do không tới được network

ステップ2：
Hiển thị toast `ネットワークエラーが発生しました。接続をご確認ください。`

ステップ3：
Giá trị nhập được giữ lại (form không bị clear)

補足：
・Axios interceptor detect network error và hiển thị toast
・Vẫn ở màn đăng ký, có thể retry

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-009-072 — Lỗi chung DATA_SCOPE_VIOLATION — Thử truy cập record của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (không giới hạn data scope, kiểm tra tham khảo)
  - ・Kịch bản tham khảo cho trường hợp tương lai CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN cũng được cấp quyền chỉnh sửa

### 手順

ステップ1：
Giả định CHUOKAI (thuộc chuokai-001) login và truy cập trực tiếp record chi nhánh quản lý `kanri_shiten_id=50` thuộc chuokai khác qua `/kanri-shiten/50/edit`

ステップ2：
Thực thi GET `/api/v1/kanri-shiten/50` từ Console DevTools

### 期待結果

ステップ1：
Chuyển trang thất bại, bị bounce về `/dashboard`, hiển thị toast `アクセス権がありません。` hoặc NOT_FOUND

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された管理支店が見つかりません。`)

補足：
・Vi phạm data scope được trả về dưới dạng HTTP 404 (NOT_FOUND) để che giấu sự tồn tại (không leak việc có row hay không)
・Trong danh sách lỗi của api.md định nghĩa là DATA_SCOPE_VIOLATION (403), nhưng implementation tuân thủ rule `assertJaScope` của security.md, ưu tiên masking 404
・Seed hiện hành chỉ NICHINO_ADMIN thao tác được, nhưng TC này giữ lại để kiểm tra cho trường hợp tương lai non-NICHINO_ADMIN được cấp quyền chỉnh sửa

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

TC tham khảo cho mở rộng tương lai. Implementation hiện hành theo ma trận account_concept.md chỉ NICHINO_ADMIN thao tác được.
