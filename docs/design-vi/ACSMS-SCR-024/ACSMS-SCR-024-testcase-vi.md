---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-024
screen_name: アカウントマスタ明細検索画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-21
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-21 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình tìm kiếm chi tiết Master Account (ACSMS-SCR-024)" được tạo mới trên hệ thống.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-024 | Tài liệu thiết kế Màn hình tìm kiếm chi tiết Master Account |
| 2 | ACSMS-SCR-024-api | Tài liệu thiết kế API tìm kiếm chi tiết Master Account |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Chức năng tìm kiếm / Sort / Pagination | 20 |
| 5 | Logic nghiệp vụ — Xóa (Function — Delete) | 7 |
| 6 | Logic nghiệp vụ — Chuyển đến chỉnh sửa/đăng ký (Navigation) | 3 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 51 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-024-001 — NICHINO_ADMIN access vào màn tìm kiếm chi tiết Master Account (normal)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `account.view` và `account.delete`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập URL `/accounts`

ステップ3：
Kiểm tra response của GET `/api/v1/accounts` qua DevTools

ステップ4：
Kiểm tra cột thao tác của row bất kỳ trong table kết quả tìm kiếm

### 期待結果

ステップ1：
Sidebar hiển thị item "アカウントマスタ" (do có quyền `account.view`)

ステップ2：
Màn tìm kiếm chi tiết Master Account được hiển thị, form tìm kiếm và table kết quả được render chính xác

ステップ3：
Trả về HTTP 200, danh sách account toàn JA được trả về (DataScope không giới hạn)

ステップ4：
Button xóa được kích hoạt (do có quyền `account.delete`)

補足：
・NICHINO_ADMIN là role duy nhất được phép truy cập màn Master Account
・Có thể xem toàn bộ account của các JA
・Button 新規登録 cũng được kích hoạt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Màn Master Account là màn dành riêng cho NICHINO_ADMIN, các role khác không thể truy cập.

## ACSMS-TC-024-002 — Cấm truy cập với role NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/accounts`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_account' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (do không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Data của `m_account` không được trả về
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

## ACSMS-TC-024-003 — Cấm truy cập màn Master Account với role CHUOKAI

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/accounts`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (do không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・CHUOKAI không có quyền truy cập màn Master Account
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

Theo `account_concept.md`, màn Master Account chỉ dành cho NICHINO_ADMIN.

## ACSMS-TC-024-004 — Cấm truy cập màn Master Account với role JA_HONTEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/accounts`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (do không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・JA_HONTEN không có quyền truy cập màn Master Account
・Việc quản lý account dưới JA do phía NICHINO_ADMIN thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-005 — Cấm truy cập màn Master Account với role JA_KANRI_SHITEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts`

ステップ3：
Dùng DevTools gọi trực tiếp GET `/api/v1/accounts`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (do không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・JA_KANRI_SHITEN không có quyền truy cập màn Master Account

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)


# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-024-006 — Hiển thị ban đầu — form tìm kiếm trống, danh sách default

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại ≥20 bản ghi trong `m_account`

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra giá trị khởi tạo của 4 mục trong form tìm kiếm

ステップ3：
Kiểm tra số dòng table kết quả và hiển thị pagination

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Tất cả login_id, role_id, ja_id, kanri_shiten_id đều trống/chưa chọn

ステップ3：
GET `/api/v1/accounts` được gọi với param mặc định (page=1, per_page=20, sort_by=created_at, sort_order=desc), tối đa 20 account có `deleted_at IS NULL` được hiển thị

補足：
・Khi hiển thị ban đầu, các row đã bị xóa logical (deleted_at IS NOT NULL) không được hiển thị
・Thứ tự sắp xếp theo created_at giảm dần

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-007 — Render form tìm kiếm — 4 mục và label

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra label và placeholder của từng input element trong form tìm kiếm

ステップ3：
Mở dropdown ja_id và kiểm tra các tùy chọn

ステップ4：
Mở dropdown kanri_shiten_id và kiểm tra các tùy chọn

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
4 label "ログインID" "ロール" "JA" "管理支店" được hiển thị, login_id là text input, role_id / ja_id / kanri_shiten_id là dropdown

ステップ3：
Toàn bộ JA được hiển thị làm các tùy chọn (NICHINO_ADMIN không có giới hạn DataScope)

ステップ4：
Khi chưa chọn JA, dropdown kanri_shiten bị disable

補足：
・Dropdown role hiển thị 5 bản ghi của `m_roles` (NICHINO_ADMIN, NICHINO_STAFF, CHUOKAI, JA_HONTEN, JA_KANRI_SHITEN)
・Quan hệ cascade (JA → kanri_shiten) hoạt động đúng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-008 — Table kết quả tìm kiếm — cấu trúc cột và nội dung hiển thị

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều bản ghi trong `m_account`

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra header các cột của table kết quả tìm kiếm

ステップ3：
So sánh giá trị của row bất kỳ trong table với giá trị DB

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
8 cột ログインID, ロール名, 都道府県, JA, 管理支店, 紙, 電子, 操作 được hiển thị

ステップ3：
login_id hiển thị dưới dạng link, role_name là `m_roles.role_name`, todofuken là `m_todofuken.todofuken_name`, JA là `m_ja.ja_name`, kanri_shiten là `m_kanri_shiten.kanri_shiten_name`, 紙/電子 hiển thị bằng checkmark (paper_flg / denshi_flg)

補足：
・Cột thao tác chứa button xóa
・Account không thuộc JA (NICHINO_ADMIN / NICHINO_STAFF) thì cột JA / kanri_shiten để trống

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-009 — Button thao tác — 検索 / クリア / 新規登録

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra vị trí và trạng thái kích hoạt của button "検索" "検索クリア" dưới form tìm kiếm

ステップ3：
Kiểm tra vị trí và trạng thái kích hoạt của button "新規登録" ở góc phải trên màn

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Button "検索" "検索クリア" được kích hoạt, được đặt căn trái phía dưới form tìm kiếm

ステップ3：
Button "新規登録" được kích hoạt (do có quyền `account.create`)

補足：
・Mỗi button phản ánh đúng trạng thái kích hoạt/không kích hoạt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-010 — Hiển thị pagination — mặc định 20 record/page

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại 25 bản ghi trong `m_account`

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra vị trí và nội dung của control pagination

ステップ3：
Chuyển sang page 2

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Dưới table có hiển thị "全 25 件中 1-20 件を表示" "ページ 1 / 2", các tùy chọn page size kèm label `/ 頁` được hiển thị

ステップ3：
Chuyển sang page 2, hiển thị bản ghi thứ 21-25 (5 bản ghi)

補足：
・Pagination tuân theo format chuẩn của BaseDataTable (vị trí bottomLeft)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-011 — Responsive — độ rộng tablet / smartphone

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Thay đổi URL `/accounts` về độ rộng 1024px bằng Chrome DevTools

ステップ2：
Đổi sang độ rộng 375px (mobile)

ステップ3：
Kiểm tra hành vi scroll ngang

### 期待結果

ステップ1：
Form tìm kiếm và table kết quả được hiển thị không bị vỡ layout, form được sắp xếp lại theo grid layout

ステップ2：
Ở độ rộng mobile, form tìm kiếm và table kết quả vẫn được hiển thị, table kết quả hỗ trợ scroll ngang

ステップ3：
Table có thể scroll ngang với `scroll: { x: 'max-content' }`

補足：
・Tuân theo hành vi responsive chuẩn của BaseDataTable

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)


# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-024-012 — Hiển thị tiêu đề màn hình

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra tiêu đề ở vùng header trên cùng của màn hình

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Vùng header hiển thị "アカウントマスタ明細検索" (lấy từ route.meta.breadcrumb)

補足：
・Tiêu đề do AppHeader của MainLayout render, View không được render trùng lặp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-013 — Hiển thị breadcrumb — 3 cấp

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra cấp và từng node của breadcrumb

ステップ3：
Click link "ホーム"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Breadcrumb hiển thị 3 cấp "ホーム > 管理者機能 > アカウントマスタ明細検索", node cuối cùng không phải là link

ステップ3：
Chuyển đến dashboard `/dashboard`

補足：
・Chỉ "ホーム" có thể click, "管理者機能" và "アカウントマスタ明細検索" hiển thị dạng text

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-014 — Hiển thị thông tin user

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra vùng thông tin user ở góc phải trên màn hình

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Góc phải trên header hiển thị login_id và role_name (NICHINO_ADMIN) của account đang login, menu đăng xuất có thể sử dụng

補足：
・Hành vi chuẩn của AppHeader trong MainLayout

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)


# カテゴリ 4: Chức năng tìm kiếm / Sort / Pagination

## ACSMS-TC-024-015 — Tìm kiếm partial match theo login_id

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Trong `m_account` có login_id='admin01', 'admin02', 'staff01'

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Nhập "admin" vào ô input ログインID

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
"admin" được nhập vào ô input ログインID

ステップ3：
GET `/api/v1/accounts?login_id=admin` được gọi, 2 bản ghi 'admin01', 'admin02' được trả về (partial match LIKE '%admin%')

補足：
・Việc phân biệt hoa thường tuân theo spec
・'staff01' không được bao gồm trong kết quả

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-016 — Tìm kiếm exact match theo role_id

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Trong `m_account` tồn tại bản ghi của từng role

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Chọn "JA_HONTEN" từ dropdown role

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
"JA_HONTEN" được chọn trong dropdown role

ステップ3：
GET `/api/v1/accounts?role_id=4` được gọi, chỉ trả về các account có role_id=4

補足：
・Lọc theo exact match của role_id

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-017 — Tìm kiếm exact match theo ja_id

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account của nhiều JA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Chọn "東京都" từ dropdown todofuken

ステップ3：
Chọn JA bất kỳ từ dropdown JA

ステップ4：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Sau khi chọn todofuken, dropdown JA được load lại chỉ với các JA thuộc todofuken đã chọn

ステップ3：
Dropdown JA phản ánh giá trị đã chọn

ステップ4：
GET `/api/v1/accounts?ja_id=<id>` được gọi, chỉ trả về các account dưới JA đã chỉ định

補足：
・Cascade todofuken → JA hoạt động đúng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-018 — Tìm kiếm exact match theo kanri_shiten_id

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều kanri_shiten dưới một JA cụ thể

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Chọn JA bất kỳ từ dropdown JA

ステップ3：
Chọn kanri_shiten bất kỳ từ dropdown kanri_shiten

ステップ4：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Sau khi chọn JA, dropdown kanri_shiten được kích hoạt và được load lại chỉ với các kanri_shiten thuộc JA đã chọn

ステップ3：
Dropdown kanri_shiten phản ánh giá trị đã chọn

ステップ4：
GET `/api/v1/accounts?ja_id=<id>&kanri_shiten_id=<id>` được gọi, chỉ trả về các account dưới kanri_shiten đã chỉ định

補足：
・Cascade JA → kanri_shiten hoạt động đúng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-019 — Cascade clear JA → kanri_shiten bị disable

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`, chọn JA và kanri_shiten

ステップ2：
Click button × của dropdown JA để clear JA

ステップ3：
Kiểm tra trạng thái của dropdown kanri_shiten

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị, JA và kanri_shiten đang ở trạng thái đã chọn

ステップ2：
JA được clear

ステップ3：
Pulldown kanri_shiten bị disable, giá trị đã chọn cũng được clear

補足：
・Khi clear JA, kanri_shiten cũng được reset theo

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-020 — Tìm kiếm tổ hợp nhiều điều kiện

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Nhập/chọn ログインID "ja", role "JA_HONTEN", JA "ja-001"

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Cả 3 mục đều phản ánh giá trị đã nhập/chọn

ステップ3：
GET `/api/v1/accounts?login_id=ja&role_id=4&ja_id=1` được gọi, chỉ trả về các account khớp với cả 3 điều kiện (kết hợp AND)

補足：
・Các điều kiện đa dạng được kết hợp bằng AND

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-021 — Tìm kiếm với filter rỗng (hiển thị danh sách ban đầu)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Không nhập điều kiện tìm kiếm nào và click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
GET `/api/v1/accounts` được gọi không kèm filter param, tối đa 20 account có `deleted_at IS NULL` được hiển thị

補足：
・Kết quả trả về tương đương hiển thị ban đầu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-022 — role_id giá trị biên 0 (ngoài phạm vi)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/accounts?role_id=0`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Trường errors chứa lỗi ngoài phạm vi của `role_id`

補足：
・role_id chỉ cho phép trong phạm vi 1-5

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-023 — role_id giá trị biên 1 (min, normal)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có role_id=1

### 手順

ステップ1：
Truy cập URL `/accounts`, chọn "NICHINO_ADMIN" (role_id=1) từ dropdown role

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"NICHINO_ADMIN" được chọn trong dropdown role

ステップ2：
GET `/api/v1/accounts?role_id=1` được gọi, trả về HTTP 200, chỉ các account có role_id=1 được trả về

補足：
・Min 1 được nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-024 — role_id giá trị biên 5 (max, normal)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có role_id=5

### 手順

ステップ1：
Truy cập URL `/accounts`, chọn "JA_KANRI_SHITEN" (role_id=5) từ dropdown role

ステップ2：
Click button "検索"

### 期待結果

ステップ1：
"JA_KANRI_SHITEN" được chọn trong dropdown role

ステップ2：
GET `/api/v1/accounts?role_id=5` được gọi, trả về HTTP 200, chỉ các account có role_id=5 được trả về

補足：
・Max 5 được nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-025 — role_id giá trị biên 6 (ngoài phạm vi)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp GET `/api/v1/accounts?role_id=6`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Trường errors chứa lỗi ngoài phạm vi của `role_id`

補足：
・role_id chỉ cho phép trong phạm vi 1-5

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-026 — login_id max độ dài 20 ký tự (biên, normal)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Nhập 20 ký tự (`a` 20 lần) vào ô input ログインID

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Toàn bộ 20 ký tự được nhập vào ô input (đạt maxlength 20)

ステップ3：
GET `/api/v1/accounts?login_id=aaaaaaaaaaaaaaaaaaaa` được gọi, trả về HTTP 200

補足：
・Max độ dài 20 được nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-027 — login_id không cho nhập ký tự thứ 21 (ngoài biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Thử nhập ký tự thứ 21 vào ô input ログインID

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Do maxlength=20, ký tự thứ 21 không được nhập (dừng ở 20 ký tự)

補足：
・Bị chặn bởi thuộc tính maxlength phía FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-028 — login_id sort 3 trạng thái cycle

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều bản ghi trong `m_account`

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click header cột ログインID (lần 1)

ステップ3：
Click header cột ログインID (lần 2)

ステップ4：
Click header cột ログインID (lần 3)

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
GET `/api/v1/accounts?sort_by=login_id&sort_order=asc` được gọi, hiển thị theo login_id tăng dần

ステップ3：
GET `/api/v1/accounts?sort_by=login_id&sort_order=desc` được gọi, hiển thị theo login_id giảm dần

ステップ4：
Sort được hủy, trở về thứ tự mặc định (created_at desc)

補足：
・3 trạng thái cycle: tăng → giảm → hủy

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-029 — Sort theo role_id

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account của mỗi role

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click header cột role

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
GET `/api/v1/accounts?sort_by=role_id&sort_order=asc` được gọi, hiển thị theo role_id tăng dần (NICHINO_ADMIN → JA_KANRI_SHITEN)

補足：
・Cột role có thể sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-030 — Sort theo created_at (mặc định)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Kiểm tra thứ tự sắp xếp của kết quả tìm kiếm

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
GET `/api/v1/accounts?sort_by=created_at&sort_order=desc` được gọi mặc định, hiển thị theo created_at giảm dần (mới nhất trước)

補足：
・Sort mặc định là created_at giảm dần

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-031 — per_page giá trị biên 100 (max, normal)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại ≥100 bản ghi trong `m_account`

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/accounts?per_page=100`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 200

ステップ2：
Tối đa 100 account được trả về, meta.per_page=100

補足：
・Max 100 được nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-032 — per_page giá trị biên 101 (ngoài phạm vi)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/accounts?per_page=101`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Trường errors chứa lỗi vượt max của `per_page`

補足：
・per_page chỉ cho phép trong phạm vi 1-100

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-033 — Kết quả tìm kiếm 0 bản ghi — hiển thị message

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・login_id='xxxxxxxxxxxxxxx' không tồn tại

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Nhập "xxxxxxxxxxxxxxx" vào ô input ログインID và click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
GET `/api/v1/accounts?login_id=xxxxxxxxxxxxxxx` được gọi, trả về 0 kết quả, màn hiển thị `該当するデータがありません。` (MSG-024-001)

補足：
・Table kết quả tìm kiếm trống, pagination cũng hiển thị 0 bản ghi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-034 — Button クリア — reset điều kiện tìm kiếm

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`, nhập/chọn giá trị vào cả 4 mục của form tìm kiếm

ステップ2：
Click button "検索クリア"

ステップ3：
Kiểm tra nội dung form tìm kiếm và table kết quả

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị, cả 4 mục đều phản ánh giá trị

ステップ2：
Toàn bộ các mục được reset (login_id trống, role_id chưa chọn, ja_id chưa chọn, kanri_shiten_id chưa chọn và bị disable)

ステップ3：
Table kết quả trở về trạng thái hiển thị ban đầu (GET `/api/v1/accounts` không kèm filter)

補足：
・Button クリア chỉ reset form tìm kiếm, table cũng trở về trạng thái ban đầu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)


# カテゴリ 5: Logic nghiệp vụ — Xóa (Function — Delete)

## ACSMS-TC-024-035 — Hiển thị dialog confirm xóa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có thể xóa (không có data liên quan)

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button xóa của row bất kỳ

ステップ3：
Kiểm tra nội dung dialog

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Hiển thị dialog confirm xóa

ステップ3：
Trong dialog hiển thị `このアカウントを削除してもよろしいですか？` (MSG-024-004), button "はい" "いいえ" được hiển thị, button "はい" có màu đỏ (danger)

補足：
・Label button của dialog confirm là はい / いいえ (quy tắc dự án)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-036 — Confirm xóa "はい" — thực hiện xóa logical + reload danh sách

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có thể xóa (account_id=999)

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button xóa của row account_id=999, click "はい" trong dialog

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_account WHERE account_id = 999`

ステップ4：
Kiểm tra kết quả reload danh sách trên màn

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
DELETE `/api/v1/accounts/999` được gọi, trả về HTTP 200, hiển thị toast `削除しました。` (MSG-024-005)

ステップ3：
`deleted_at` được update thành NOW() (xóa logical)

ステップ4：
account_id=999 biến mất khỏi danh sách (do filter deleted_at IS NULL)

補足：
・Xóa logical (set deleted_at), không phải xóa vật lý
・Sau khi xóa, danh sách được auto reload

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-037 — Confirm xóa "いいえ" — hủy thao tác

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button xóa của row bất kỳ, click "いいえ" trong dialog

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_account WHERE account_id = <id>`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Dialog đóng, DELETE API không được gọi, trạng thái danh sách không thay đổi

ステップ3：
`deleted_at` vẫn giữ NULL

補足：
・Khi click "いいえ" không có xử lý nào chạy
・`t_log` không ghi log liên quan đến xóa

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-038 — Vi phạm FK constraint — từ chối xóa khi tồn tại data liên quan

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・account_id=500 có liên kết với `t_log` hoặc table liên quan khác

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button xóa của row account_id=500, click "はい" trong dialog

ステップ3：
Kiểm tra nội dung response

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM m_account WHERE account_id = 500`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Dialog confirm xóa được hiển thị, click "はい" thì DELETE `/api/v1/accounts/500` được gọi

ステップ3：
Trả về HTTP 409 (`error_code: CONFLICT`, message `関連データが存在するため削除できません。`), hiển thị toast `このアカウントは関連オブジェクトに紐づいているため削除できません。` (MSG-024-003)

ステップ4：
`deleted_at` vẫn giữ NULL (không bị xóa)

補足：
・Khi tồn tại object liên quan (t_log, t_login_log v.v.), xóa logical cũng bị từ chối

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo spec, account có data liên quan không thể bị xóa.

## ACSMS-TC-024-039 — Thao tác xóa — record audit log

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có thể xóa (account_id=998)

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Xóa row account_id=998, click "はい" trong dialog

ステップ3：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 'm_account' AND target_id = 998 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
DELETE `/api/v1/accounts/998` thành công, hiển thị toast `削除しました。`

ステップ3：
1 dòng được thêm vào `t_log`, operation='DELETE', result_status=1 (thành công), target_table='m_account', target_id=998, `account_id` khớp với test account, before_value lưu data trước khi xóa dưới dạng JSON

補足：
・Main DML và audit log được commit trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-040 — Reload danh sách sau khi xóa — filter deleted_at IS NULL

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Ngay sau khi xóa account_id=997

### 手順

ステップ1：
Truy cập URL `/accounts`, xóa account_id=997

ステップ2：
Kiểm tra response của GET `/api/v1/accounts`

ステップ3：
Dùng DevTools gửi GET `/api/v1/accounts?include_deleted=true` và kiểm tra hành vi

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị, danh sách được fetch lại sau khi xóa hoàn tất

ステップ2：
account_id=997 không có trong kết quả (do deleted_at IS NOT NULL nên bị loại)

ステップ3：
Param ngoài spec bị bỏ qua hoặc trả về HTTP 400 (kiểu whitelist)

補足：
・API thường bắt buộc có filter deleted_at IS NULL

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-041 — Chặn xóa account của chính mình

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・account_id=1 đang login

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button xóa của row account của chính mình (account_id=1), click "はい" trong dialog

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM m_account WHERE account_id = 1`

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Hiển thị error toast từ chối xóa account của chính mình, hoặc button xóa bị disable, `deleted_at` vẫn giữ NULL

ステップ3：
`deleted_at` vẫn giữ NULL (account của chính mình không bị xóa)

補足：
・Chặn xóa account của chính mình là yêu cầu bảo mật bắt buộc
・Chi tiết phương pháp chặn (FE disable / BE từ chối) tuân theo spec sau khi xác nhận

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Nếu spec chặn xóa account của chính mình chưa được định nghĩa, sẽ đánh giá lại sau khi xác nhận spec.


# カテゴリ 6: Logic nghiệp vụ — Chuyển đến chỉnh sửa/đăng ký (Navigation)

## ACSMS-TC-024-042 — Button 新規登録 → chuyển sang màn đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `account.create`

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click button "新規登録"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị, button "新規登録" được kích hoạt

ステップ2：
URL chuyển sang `/accounts/create`, hiển thị màn đăng ký Master Account (SCR-025)

補足：
・Việc chuyển trang được thực hiện bằng router.push({ name: 'AccountCreate' })

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-043 — Link login_id → chuyển sang màn chỉnh sửa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại account có account_id=100

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Click link login_id của row account_id=100

ステップ3：
Kiểm tra nội dung hiển thị màn chỉnh sửa

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị, cột login_id hiển thị dạng link

ステップ2：
URL chuyển sang `/accounts/100/edit`, hiển thị màn chỉnh sửa Master Account (SCR-025 mode chỉnh sửa)

ステップ3：
Data hiện có của account_id=100 được preload vào từng mục form, login_id không thể chỉnh sửa (disabled)

補足：
・Việc chuyển trang được thực hiện bằng router.push({ name: 'AccountEdit', params: { id: 100 } })
・login_id không thể thay đổi (spec)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-044 — Giữ lại điều kiện tìm kiếm khi chuyển page pagination

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại ≥25 account khớp với login_id='admin'

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Nhập "admin" vào ô input ログインID, click button "検索", chuyển sang page 2

ステップ3：
Kiểm tra request param của page 2

ステップ4：
Kiểm tra trạng thái điều kiện tìm kiếm sau khi quay lại từ page 2

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Kết quả tìm kiếm được hiển thị, có thể chuyển sang page 2

ステップ3：
GET `/api/v1/accounts?login_id=admin&page=2` được gọi, filter login_id được giữ lại

ステップ4：
Giá trị input login_id của form tìm kiếm vẫn giữ "admin"

補足：
・Khi thao tác pagination, điều kiện tìm kiếm / sort không bị reset

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)


# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-024-045 — Session hết hạn — UNAUTHORIZED

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Xóa session tương ứng từ Redis (hoặc chờ 24h)

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Session bị xóa khỏi Redis

ステップ3：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`), chuyển đến `/login?redirect=/accounts`

補足：
・Được xử lý bởi axios interceptor chung phía FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-046 — Param không hợp lệ — BAD_REQUEST

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/accounts?page=abc`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

ステップ2：
Trường errors chứa lỗi kiểu dữ liệu của `page`

補足：
・Param sai kiểu được chặn ở cả FE / BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-047 — sort_by giá trị không hợp lệ — VALIDATION_ERROR

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi GET `/api/v1/accounts?sort_by=invalid_column`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Trường errors chứa lỗi giá trị nằm ngoài danh sách cho phép của `sort_by` (giá trị cho phép: login_id, role_id, created_at)

補足：
・sort_by được validate theo kiểu whitelist

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-048 — Rate limit — TOO_MANY_REQUESTS

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi liên tục GET `/api/v1/accounts` ≥100 lần trong 1 phút từ DevTools console

ステップ2：
Kiểm tra response sau khi vượt ngưỡng

### 期待結果

ステップ1：
Vài chục request đầu trả về HTTP 200

ステップ2：
Sau khi vượt ngưỡng, trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

補足：
・Rate limit được thực thi qua API gateway / NestJS Throttler

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-049 — Lỗi server — INTERNAL_SERVER_ERROR

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Cấu hình để chủ động phát sinh exception ở BE

### 手順

ステップ1：
Lock table `m_account` hoặc phát sinh service exception ở BE

ステップ2：
Truy cập URL `/accounts` và click button "検索"

### 期待結果

ステップ1：
BE rơi vào trạng thái phát sinh exception

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。` (MSG-024-002)

補足：
・Stack trace không bị lộ ra màn hình / response
・`t_log` ghi error log (log_type=3)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-050 — Xóa account_id không tồn tại — NOT_FOUND

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・account_id=99999 không tồn tại

### 手順

ステップ1：
Dùng DevTools gửi trực tiếp DELETE `/api/v1/accounts/99999`

ステップ2：
Kiểm tra nội dung response

### 期待結果

ステップ1：
Request DELETE được gửi

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたアカウントが見つかりません。`)

補足：
・DELETE đến account_id không tồn tại trả về 404

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-024-051 — Mất kết nối network — lỗi offline

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/accounts`

ステップ2：
Chuyển sang chế độ "Offline" ở tab Network của DevTools

ステップ3：
Click button "検索"

### 期待結果

ステップ1：
Màn tìm kiếm chi tiết Master Account được hiển thị

ステップ2：
Trạng thái mất kết nối network

ステップ3：
Lỗi network được hiển thị qua toast, màn hình không thay đổi (không rơi vào trạng thái loading vô hạn)

補足：
・Hành vi khi xảy ra axios timeout không làm hỏng UX
・Sau khi khôi phục "Online", hoạt động bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
