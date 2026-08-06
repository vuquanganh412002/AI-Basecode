---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-025
screen_name: アカウントマスタ登録画面
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
| 2 | 2026-08-06 | 1.1 | Tran Duc Tuyen | Đồng bộ với bản tiếng Nhật: tạo カテゴリ8 và bổ sung 2 ca (069〜070). 069＝hủy toàn bộ session khi có thay đổi quan trọng về bảo mật (xử lý cho security review 2026-07): đổi mật khẩu/khóa(true)/đổi role/đổi nơi trực thuộc thì hủy; mở khóa・chỉ đổi họ tên/email/ghi chú・cập nhật mà giá trị không đổi thì không hủy; xóa thì hủy vô điều kiện; Redis lỗi thì cập nhật vẫn thành lập và hiển thị thành công. 070＝kiểm tra tên dành riêng `SYSTEM` cho ID đăng nhập (#55719): từ chối `SYSTEM` đơn lẻ và tiền tố `SYSTEM_` bất kể hoa thường, cho phép `SYSTEMS`/`MYSYSTEM`, phòng thủ ở cả DTO lẫn ràng buộc CHECK của DB |  |  |


## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình đăng ký Master Account (ACSMS-SCR-025)" được tạo mới trên hệ thống.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-025 | Tài liệu thiết kế Màn hình đăng ký Master Account |
| 2 | ACSMS-SCR-025-api | Tài liệu thiết kế API đăng ký Master Account |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation đầu vào — Đăng ký/Chỉnh sửa | 30 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 8 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
| 8 | Hủy session・Kiểm tra tên dành riêng (Session / Reserved-name) | 2 |
|  | Tổng | 70 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-025-001 — NICHINO_ADMIN access vào màn đăng ký Master Account (normal)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `account.view` + `account.create` + `account.update`

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" dưới "管理者機能" trên sidebar

ステップ2：
Click button "新規登録" trên màn chi tiết tìm kiếm Master Account (SCR-024)

ステップ3：
Truy cập trực tiếp URL `/accounts/create`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 1 AND gamen_name LIKE '%アカウントマスタ%' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar hiển thị item "アカウントマスタ" (NICHINO_ADMIN có quyền `account.view`)

ステップ2：
Màn đăng ký Master Account được hiển thị (tiêu đề `アカウントマスタ登録`, tất cả các trường của form đều active)

ステップ3：
Màn hình được render bình thường, không xảy ra lỗi authorization

ステップ4：
Có ≥1 dòng access log của màn hình, `account_id` khớp với test account

補足：
・NICHINO_ADMIN là role duy nhất có thể thao tác trên Master Account
・Cả 3 tầng FE sidebar / FE router guard / BE API guard đều xác nhận quyền

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chỉ NICHINO_ADMIN mới có thể đăng ký · chỉnh sửa Master Account theo thiết kế nghiệp vụ (screen-design.md §アクセス権限).

## ACSMS-TC-025-002 — Cấm truy cập với role NICHINO_STAFF

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/accounts` với request data hợp lệ

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
・Không có row mới được thêm vào `m_account`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

## ACSMS-TC-025-003 — Cấm truy cập với role CHUOKAI

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/accounts` với request data hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (CHUOKAI không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・CHUOKAI có thể chỉnh sửa Master nghiệp vụ như subscriber/hanbaiten v.v., nhưng quản lý account là chức năng riêng của NICHINO_ADMIN

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo thiết kế nghiệp vụ, quyền phát hành account giới hạn cho admin của Báo Nông nghiệp Nhật Bản.

## ACSMS-TC-025-004 — Cấm truy cập với role JA_HONTEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/accounts` với request data hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (JA_HONTEN không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・JA_HONTEN có thể chỉnh sửa subscriber/hanbaiten v.v. trong phạm vi JA của mình, nhưng không có quyền phát hành account

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Theo thiết kế nghiệp vụ, quyền phát hành account giới hạn cho admin của Báo Nông nghiệp Nhật Bản.

## ACSMS-TC-025-005 — Cấm truy cập với role JA_KANRI_SHITEN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / kanri-shiten-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "アカウントマスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/accounts/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/accounts` với request data hợp lệ

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "アカウントマスタ" (JA_KANRI_SHITEN không có quyền `account.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`)

補足：
・JA_KANRI_SHITEN có thể chỉnh sửa subscriber trong phạm vi chi nhánh quản lý của mình, nhưng không có quyền phát hành account

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

Theo thiết kế nghiệp vụ, quyền phát hành account giới hạn cho admin của Báo Nông nghiệp Nhật Bản.

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-025-006 — Hiển thị ban đầu mode đăng ký (tất cả các trường rỗng, role chưa chọn)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Kiểm tra giá trị ban đầu của từng trường nhập ngay sau khi màn hiển thị

ステップ2：
Kiểm tra trạng thái hiển thị/ẩn của trường chọn role, trường tỉnh thành, trường JA, trường kanri_shiten

ステップ3：
Kiểm tra trạng thái active của button "登録", button "前の画面に戻る" phía dưới màn hình

### 期待結果

ステップ1：
login_id, password, account_name, email, sub_email_1〜3, biko ở trạng thái trống, paper_flg · denshi_flg chưa được tick (false)

ステップ2：
Trường chọn role ở trạng thái chưa chọn, trường tỉnh thành/JA/kanri_shiten bị ẩn (do role chưa chọn nên các trường hiển thị có điều kiện không xuất hiện)

ステップ3：
Button "登録" ở trạng thái active, button "前の画面に戻る" ở trạng thái active

補足：
・Lúc hiển thị ban đầu ẩn toàn bộ các trường cascade để đơn giản hóa định hướng nhập trước khi chọn role

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — Lúc hiển thị ban đầu, các trường phụ thuộc role bị ẩn.

## ACSMS-TC-025-007 — Hiển thị ban đầu màn edit và load data cũ

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10` (role_id=5, ja_id=1, kanri_shiten_id=1)

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`

ステップ2：
Kiểm tra response của GET `/api/v1/accounts/10` được phản ánh lên màn hình

ステップ3：
Kiểm tra trạng thái của trường login_id, trường password

### 期待結果

ステップ1：
Tiêu đề màn `アカウントマスタ編集` được hiển thị, form được load data cũ

ステップ2：
login_id, role, tỉnh thành, JA, kanri_shiten, account_name, email, sub_email_1〜3, paper_flg, denshi_flg, biko đều hiển thị giá trị trong DB

ステップ3：
Trường login_id ở trạng thái disable (không thể chỉnh sửa), trường password ở trạng thái trống (spec: khi update để trống = không thay đổi)

補足：
・Ở mode edit, login_id không thể thay đổi (do là khóa duy nhất nghiệp vụ)
・Password ở mode edit khi gửi trống thì giữ giá trị cũ theo thiết kế

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §5.1 — Khi edit login_id không thay đổi, password trống = giữ nguyên.

## ACSMS-TC-025-008 — Xác nhận hiển thị toàn bộ 14 trường nhập của form

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Kiểm tra toàn bộ các trường hiển thị trên form từ trên xuống dưới

ステップ2：
Kiểm tra label, kiểu nhập, dấu required (dấu sao màu đỏ) của từng trường

### 期待結果

ステップ1：
14 trường sau được hiển thị: login_id, password, role, tỉnh thành, JA, kanri_shiten, account_name, email, sub_email_1, sub_email_2, sub_email_3, paper_flg, denshi_flg, biko

ステップ2：
4 trường login_id, password, role, account_name có dấu sao màu đỏ (*); tỉnh thành/JA/kanri_shiten là conditional required theo giá trị role được chọn

補足：
・Trường biko là textarea, các trường flag là dạng radio button
・Dấu required hiển thị bên phải label với màu `text-error`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §項目定義 — Xác nhận thứ tự hiển thị và thuộc tính required của tất cả 14 trường.

## ACSMS-TC-025-009 — Ẩn các trường cascade khi chọn role=1 hoặc 2

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "NICHINO_ADMIN" (role_id=1) ở trường role

ステップ2：
Kiểm tra trạng thái hiển thị của trường tỉnh thành, JA, kanri_shiten

ステップ3：
Chuyển trường role sang "NICHINO_STAFF" (role_id=2)

ステップ4：
Kiểm tra lại trạng thái hiển thị của trường tỉnh thành, JA, kanri_shiten

### 期待結果

ステップ1：
Trường role ở trạng thái đã chọn "NICHINO_ADMIN"

ステップ2：
Trường tỉnh thành/JA/kanri_shiten bị ẩn (vì account nội bộ Báo Nông nghiệp Nhật Bản không liên kết với tổ chức JA)

ステップ3：
Trường role ở trạng thái đã chọn "NICHINO_STAFF"

ステップ4：
Trường tỉnh thành/JA/kanri_shiten tiếp tục bị ẩn

補足：
・role_id ∈ {1, 2} là account nội bộ, theo spec không cần liên kết tổ chức JA

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — role_id ∈ {1,2} không cần liên kết tổ chức.

## ACSMS-TC-025-010 — Hiển thị các trường cascade khi chọn role=3 hoặc 4 (trừ kanri_shiten)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "CHUOKAI" (role_id=3) ở trường role

ステップ2：
Kiểm tra trạng thái hiển thị của trường tỉnh thành, JA, kanri_shiten

ステップ3：
Chuyển trường role sang "JA_HONTEN" (role_id=4)

ステップ4：
Kiểm tra lại trạng thái hiển thị của trường tỉnh thành, JA, kanri_shiten

### 期待結果

ステップ1：
Trường role ở trạng thái đã chọn "CHUOKAI"

ステップ2：
Trường tỉnh thành/JA hiển thị · required (kèm dấu required *), trường kanri_shiten bị ẩn

ステップ3：
Trường role ở trạng thái đã chọn "JA_HONTEN"

ステップ4：
Trường tỉnh thành/JA hiển thị · required, trường kanri_shiten bị ẩn, candidate trong trường JA chỉ hiển thị JA của 単協 với `chuokai_flg=false`

補足：
・Khi chọn CHUOKAI thì candidate JA được lọc theo `chuokai_flg=true`
・Khi chọn JA_HONTEN thì candidate JA được lọc theo `chuokai_flg=false`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — Danh sách JA được lọc theo chuokai_flg.

## ACSMS-TC-025-011 — Hiển thị toàn bộ các trường cascade khi chọn role=5

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "JA_KANRI_SHITEN" (role_id=5) ở trường role

ステップ2：
Kiểm tra trạng thái hiển thị và dấu required của trường tỉnh thành, JA, kanri_shiten

### 期待結果

ステップ1：
Trường role ở trạng thái đã chọn "JA_KANRI_SHITEN"

ステップ2：
Trường tỉnh thành/JA/kanri_shiten đều hiển thị · required (cả 3 trường đều có dấu sao màu đỏ *)

補足：
・JA_KANRI_SHITEN gắn với một kanri_shiten cụ thể nên việc chọn cả 3 cấp đều bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — role_id=5 yêu cầu cả 3 cấp.

## ACSMS-TC-025-012 — Responsive layout của màn hình (tablet/mobile)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Ở chế độ Responsive của DevTools, kiểm tra với chiều rộng 1280px (desktop)

ステップ2：
Chuyển sang chiều rộng 768px (tablet)

ステップ3：
Chuyển sang chiều rộng 375px (mobile)

### 期待結果

ステップ1：
Các trường nhập hiển thị theo layout 2 cột, không xuất hiện horizontal scroll

ステップ2：
Các trường nhập được wrap thành layout 1 cột, không xuất hiện horizontal scroll

ステップ3：
Các trường nhập hiển thị theo layout 1 cột, sidebar được thu vào hamburger menu, không xuất hiện horizontal scroll

補足：
・Layout không bị vỡ theo các responsive breakpoint của design token

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Kiểm tra vỡ layout tại 3 mức chiều rộng.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-025-013 — Hiển thị tiêu đề màn (mode đăng ký/edit)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Truy cập URL `/accounts/create`, kiểm tra tiêu đề ở vùng header

ステップ2：
Truy cập URL `/accounts/10/edit`, kiểm tra tiêu đề ở vùng header

### 期待結果

ステップ1：
Tiêu đề `アカウントマスタ登録` được hiển thị

ステップ2：
Tiêu đề `アカウントマスタ編集` được hiển thị

補足：
・Tiêu đề màn hình được AppHeader của MainLayout tự động render từ `route.meta.breadcrumb`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Tiêu đề được tự render từ route meta.

## ACSMS-TC-025-014 — Hiển thị breadcrumb (3 cấp)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Kiểm tra breadcrumb ở vùng header

ステップ2：
Click link "アカウントマスタ明細検索" giữa breadcrumb

### 期待結果

ステップ1：
Breadcrumb `ホーム > 管理者機能 > アカウントマスタ明細検索 > アカウントマスタ登録` được hiển thị, node cuối (アカウントマスタ登録) không phải link

ステップ2：
Chuyển đến màn chi tiết tìm kiếm Master Account SCR-024 (`/accounts`)

補足：
・Node giữa breadcrumb có thể click chuyển đến màn list
・Node cuối là text (không có link)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Thiết kế phân cấp breadcrumb chèn SCR-024 ở giữa.

## ACSMS-TC-025-015 — Thông tin user · Hoạt động logout của header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN (login_id=admin01)
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Kiểm tra hiển thị thông tin user phía trên bên phải header

ステップ2：
Click vào tên user để mở dropdown menu, chọn "ログアウト"

### 期待結果

ステップ1：
Tên user `admin01` đang login và role `NICHINO_ADMIN` được hiển thị

ステップ2：
POST `/api/v1/auth/logout` được gọi, chuyển đến màn login `/login`, session cookie bị hủy

補足：
・Hoạt động header chung cho tất cả các màn hình

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Header thuộc layout chung nên xác nhận hành vi.

---

# カテゴリ 4: Validation đầu vào — Đăng ký/Chỉnh sửa

## ACSMS-TC-025-016 — Lỗi required — không nhập login_id

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Để trống trường login_id, nhập giá trị hợp lệ vào các trường required khác (password, role, account_name)

ステップ2：
Click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh lên màn hình

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`), dưới trường login_id hiển thị `必須項目です。`, focus chuyển đến trường login_id

補足：
・Trường hợp bị block trước bởi client-side validation của FE thì cũng hiển thị message này
・Sử dụng MSG-025-001

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-001.

## ACSMS-TC-025-017 — Lỗi required — không nhập password (khi đăng ký)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Để trống trường password, nhập giá trị hợp lệ vào các trường required khác

ステップ2：
Click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh lên màn hình

ステップ2：
Trả về HTTP 400, dưới trường password hiển thị `必須項目です。`

補足：
・Khi đăng ký, password là trường required
・Khi edit, để trống = không thay đổi theo spec (xác nhận ở TC khác)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-001 (chỉ khi đăng ký).

## ACSMS-TC-025-018 — Lỗi required — không chọn role

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Để trường role chưa chọn, nhập giá trị hợp lệ vào các trường required khác

ステップ2：
Click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh lên màn hình

ステップ2：
Trả về HTTP 400, dưới trường role hiển thị `必須項目です。`

補足：
・Sử dụng MSG-025-001

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-001.

## ACSMS-TC-025-019 — Lỗi required — không nhập account_name

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Để trống trường account_name, nhập giá trị hợp lệ vào các trường required khác

ステップ2：
Click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh lên màn hình

ステップ2：
Trả về HTTP 400, dưới trường account_name hiển thị `必須項目です。`

補足：
・Sử dụng MSG-025-001

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-001.

## ACSMS-TC-025-020 — Conditional required (CHUOKAI: không chọn tỉnh thành)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "CHUOKAI" ở trường role

ステップ2：
Để trường tỉnh thành chưa chọn, nhập giá trị hợp lệ vào JA và các trường required khác

ステップ3：
Click button "登録"

### 期待結果

ステップ1：
Trường tỉnh thành/JA được hiển thị do chọn role

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 400, dưới trường tỉnh thành hiển thị `必須項目です。`

補足：
・Xác nhận các trường được conditional required hóa theo giá trị role được chọn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — role_id=3 yêu cầu tỉnh thành.

## ACSMS-TC-025-021 — Conditional required (JA_HONTEN: không chọn JA)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "JA_HONTEN" ở trường role, chọn "東京都" ở tỉnh thành

ステップ2：
Để trường JA chưa chọn, nhập giá trị hợp lệ vào các trường required khác

ステップ3：
Click button "登録"

### 期待結果

ステップ1：
Trường JA được hiển thị · conditional required hóa do chọn role · tỉnh thành

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 400, dưới trường JA hiển thị `必須項目です。`

補足：
・Sử dụng MSG-025-001

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — role_id=4 yêu cầu JA.

## ACSMS-TC-025-022 — Conditional required (JA_KANRI_SHITEN: không chọn kanri_shiten)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn "JA_KANRI_SHITEN" ở trường role, chọn tỉnh thành · JA

ステップ2：
Để trường kanri_shiten chưa chọn, nhập giá trị hợp lệ vào các trường required khác

ステップ3：
Click button "登録"

### 期待結果

ステップ1：
Trường tỉnh thành/JA/kanri_shiten được hiển thị do chọn role

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 400, dưới trường kanri_shiten hiển thị `必須項目です。`

補足：
・kanri_shiten chỉ được required hóa khi role_id=5

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

screen-design.md §機能定義 §4.2 — role_id=5 yêu cầu kanri_shiten.

## ACSMS-TC-025-023 — Lỗi format login_id (ký tự full-width)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập ký tự full-width "ＡＢＣ１２３" vào trường login_id

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Ký tự full-width được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường login_id hiển thị `ログインIDは半角英数字のみ入力可能です。`

補足：
・Sử dụng MSG-025-002

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-002.

## ACSMS-TC-025-024 — Lỗi format login_id (xen lẫn ký hiệu)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập chuỗi có xen ký hiệu half-width "user@01" vào trường login_id

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường login_id hiển thị `ログインIDは半角英数字のみ入力可能です。`

補足：
・login_id chỉ cho phép half-width chữ và số, không cho ký hiệu (@_- v.v.)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-002.

## ACSMS-TC-025-025 — login_id số ký tự tối đa (20 ký tự)

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 20 ký tự half-width chữ và số "abcdefghij1234567890" vào trường login_id

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Toàn bộ 20 ký tự được hiển thị

ステップ2：
Trả về HTTP 201, `m_account.login_id` lưu 20 ký tự

補足：
・Sau khi đạt số ký tự tối đa, không thể thêm ký tự vào trường nhập (maxlength=20)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

login_id tối đa 20 ký tự.

## ACSMS-TC-025-026 — login_id vượt quá số ký tự (21 ký tự, test giới hạn màn)

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Dán 21 ký tự half-width chữ và số vào trường login_id

ステップ2：
Kiểm tra giá trị hiển thị trong trường nhập

ステップ3：
Dùng DevTools bypass thuộc tính `maxlength` để gửi POST

### 期待結果

ステップ1：
Từ ký tự thứ 21 trở đi bị cắt, chỉ giữ lại 20 ký tự trong trường nhập

ステップ2：
20 ký tự được hiển thị

ステップ3：
Khi bypass bằng DevTools, trả về HTTP 400 (BE validation độ dài tối đa)

補足：
・FE control trước bằng maxlength, BE phòng vệ đa tầng bằng DTO validation

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Độ dài tối đa được bảo vệ kép FE và BE.

## ACSMS-TC-025-027 — Password thiếu số ký tự (7 ký tự)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 7 ký tự "abc1234" (chữ + số, độ phức tạp 2 loại) vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
7 ký tự được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường password hiển thị `パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。`

補足：
・Sử dụng MSG-025-003, phát hiện thiếu số ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-003.

## ACSMS-TC-025-028 — Password vượt quá số ký tự (33 ký tự)

- 観点ID: VP-B-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 33 ký tự "abcdefghij1234567890abcdefghij123" vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Trường nhập bị cắt theo maxlength=32, chỉ giữ lại 32 ký tự

ステップ2：
Trả về HTTP 201 (vì input đã trong giới hạn 32 ký tự)

補足：
・Khi bypass maxlength bằng DevTools, BE validation trả về 400

### テスト結果（1回目)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Password tối đa 32 ký tự.

## ACSMS-TC-025-029 — Password vi phạm độ phức tạp (chỉ chữ)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 12 ký tự chỉ có chữ "abcdefghijkl" vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
12 ký tự được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường password hiển thị `パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。`

補足：
・MSG-025-003, không pass vì độ phức tạp chỉ 1 loại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-003.

## ACSMS-TC-025-030 — Password vi phạm độ phức tạp (chỉ số)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 10 ký tự chỉ có số "1234567890" vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
10 ký tự được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường password hiển thị `パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。`

補足：
・MSG-025-003, không pass vì độ phức tạp chỉ 1 loại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-003.

## ACSMS-TC-025-031 — Password pass độ phức tạp (chữ + số)

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập chữ + số "abc12345" (8 ký tự, 2 loại xen lẫn) vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
8 ký tự được hiển thị

ステップ2：
Trả về HTTP 201, `m_account.password_hash` lưu giá trị hash bcrypt

補足：
・Pass với độ phức tạp 2 loại (chữ + số), đáp ứng yêu cầu ≥2 trong 3 loại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Pattern pass độ phức tạp password.

## ACSMS-TC-025-032 — Password pass độ phức tạp (chữ + ký hiệu + số)

- 観点ID: VP-B-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập chữ + số + ký hiệu "Pass@2026" (9 ký tự, 3 loại xen lẫn) vào trường password

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
9 ký tự được hiển thị

ステップ2：
Trả về HTTP 201

補足：
・Pass với độ phức tạp 3 loại (chữ + số + ký hiệu)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Pattern password mạnh nhất.

## ACSMS-TC-025-033 — account_name số ký tự tối đa (50 ký tự)

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 50 ký tự full-width "テスト用アカウント名称テスト用アカウント名称テスト用アカウント名称テスト用アカウント名称テスト用アカウン" vào trường account_name

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Toàn bộ 50 ký tự được hiển thị

ステップ2：
Trả về HTTP 201, `m_account.account_name` lưu 50 ký tự

補足：
・Giới hạn 50 ký tự áp dụng chung cho cả full-width · half-width xen lẫn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

account_name tối đa 50 ký tự.

## ACSMS-TC-025-034 — Lỗi format email (thiếu @)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "user.example.com" (thiếu @) vào trường email

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường email hiển thị `正しいメールアドレスを入力してください。`

補足：
・Sử dụng MSG-025-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-005.

## ACSMS-TC-025-035 — Lỗi format email (thiếu domain)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "user@" vào trường email

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường email hiển thị `正しいメールアドレスを入力してください。`

補足：
・MSG-025-005

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-005.

## ACSMS-TC-025-036 — Lỗi format sub_email_1

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "invalid-email" vào trường sub_email_1

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường sub_email_1 hiển thị `正しいメールアドレスを入力してください。`

補足：
・Cùng check format được áp dụng cho cả sub_email_1〜3

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-005.

## ACSMS-TC-025-037 — Lỗi format sub_email_2 / sub_email_3

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "user2@invalid" vào trường sub_email_2, "@example.com" vào trường sub_email_3

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Cả hai giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường sub_email_2 / sub_email_3 mỗi trường hiển thị `正しいメールアドレスを入力してください。`

補足：
・Áp dụng MSG-025-005 cho từng trường sub_email

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-005.

## ACSMS-TC-025-038 — email số ký tự tối đa (100 ký tự)

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập email 100 ký tự format hợp lệ (ví dụ: local part 92 ký tự + `@e.co`) vào trường email

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Toàn bộ 100 ký tự được hiển thị

ステップ2：
Trả về HTTP 201, `m_account.email` lưu 100 ký tự

補足：
・email tối đa 100 ký tự, sub_email_1〜3 cũng vậy

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

email tối đa 100 ký tự.

## ACSMS-TC-025-039 — Nhập chỉ space half/full-width thì account_name bị xem là rỗng

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập 3 ký tự space half-width + 2 ký tự space full-width vào trường account_name

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường account_name hiển thị `必須項目です。` (chỉ space được xử lý như chuỗi rỗng sau khi trim)

補足：
・Nhập chỉ space được coi như chưa nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Chỉ space được coi như chưa nhập.

## ACSMS-TC-025-040 — Gửi giá trị ngoài phạm vi role của m_code (1-5)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/accounts` với data chứa `role_id=99`

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`), trả về message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, chứa `errors[].field=role_id`

補足：
・Giá trị m_code được verify tính nhất quán với bảng `m_roles` ở server-side

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Server-side validation qua DevTools.

## ACSMS-TC-025-041 — Thử đăng ký với login_id trùng (giá trị đã tồn tại)

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `login_id=admin01`
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "admin01" (cùng giá trị với hiện hữu) vào trường login_id

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được hiển thị

ステップ2：
Trả về HTTP 400, dưới trường login_id hiển thị `このログインIDは既に登録されています。`

補足：
・Sử dụng MSG-025-004, verify unique constraint của `m_account.login_id`
・login_id của account đã xóa logic cũng được coi như reserved

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-004, verify unique constraint login_id.

## ACSMS-TC-025-042 — Cascade — đổi tỉnh thành thì JA · kanri_shiten bị reset

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn role "JA_KANRI_SHITEN", chọn tỉnh thành "東京都", JA "ja-001", kanri_shiten "kanri-001" lần lượt

ステップ2：
Đổi tỉnh thành sang "大阪府"

ステップ3：
Kiểm tra trạng thái chọn của trường JA, trường kanri_shiten

### 期待結果

ステップ1：
3 cấp được chọn lần lượt, từng list được lọc đúng theo giá trị cấp trên

ステップ2：
Tỉnh thành được đổi thành "大阪府", JA list dưới tỉnh 大阪府 được load lại ở trường JA

ステップ3：
Trường JA được reset về chưa chọn, trường kanri_shiten cũng được reset về chưa chọn và list rỗng

補足：
・Thiết kế: khi đổi giá trị cấp trên cascade thì tự động clear giá trị cấp dưới, ngăn quan hệ parent-child không hợp lệ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Reset cấp dưới khi đổi cấp trên cascade.

## ACSMS-TC-025-043 — Cascade — đổi JA thì kanri_shiten bị reset

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Chọn role "JA_KANRI_SHITEN", tỉnh thành "東京都", JA "ja-001", kanri_shiten "kanri-001"

ステップ2：
Đổi JA sang "ja-002"

ステップ3：
Kiểm tra trạng thái chọn của trường kanri_shiten

### 期待結果

ステップ1：
3 cấp được chọn

ステップ2：
JA được đổi thành "ja-002", kanri_shiten list dưới ja-002 được load lại ở trường kanri_shiten

ステップ3：
Trường kanri_shiten được reset về chưa chọn

補足：
・Cùng hành vi cascade reset như khi đổi tỉnh thành

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Reset cấp 2 của cascade.

## ACSMS-TC-025-044 — Tấn công XSS (account_name · biko)

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập `<script>alert('xss')</script>` vào trường account_name, `<img src=x onerror=alert(1)>` vào trường biko

ステップ2：
Nhập giá trị hợp lệ vào các trường required khác và click button "登録"

ステップ3：
Sau khi đăng ký xong, kiểm tra hiển thị lại ở màn edit

### 期待結果

ステップ1：
Giá trị nhập được hiển thị nguyên trạng (FE giữ nguyên không escape)

ステップ2：
Trả về HTTP 201, `m_account` lưu chuỗi đã được HTML escape (hoặc lưu raw và escape khi hiển thị ở phía màn)

ステップ3：
Ở màn edit, account_name · biko hiển thị chuỗi gốc dưới dạng plain text, tag script hoặc img không được evaluate trên DOM, dialog alert không xuất hiện

補足：
・Xác nhận XSS defense cho tất cả các trường text input

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Kiểm tra XSS defense.

## ACSMS-TC-025-045 — Dialog confirm khi nhấn button "前の画面に戻る"

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`, đã nhập một phần form

### 手順

ステップ1：
Nhập "testuser" vào trường login_id

ステップ2：
Click button "前の画面に戻る"

ステップ3：
Trên dialog confirm, click "はい"

ステップ4：
Kiểm tra hành vi của flow khác khi click "いいえ"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Dialog confirm được hiển thị, chứa message `入力データが削除されます。よろしいですか？`

ステップ3：
Chuyển đến màn chi tiết tìm kiếm Master Account SCR-024 (`/accounts`), giá trị nhập bị hủy

ステップ4：
Dialog được đóng, ở lại màn hiện tại, giá trị nhập được giữ lại

補足：
・Sử dụng MSG-025-010
・Dialog confirm để bảo vệ khỏi rời đi giữa chừng khi đang nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-010.

---

# カテゴリ 5: Logic nghiệp vụ — Đăng ký (Function — Create)

## ACSMS-TC-025-046 — Happy path (đăng ký account nội bộ với NICHINO_ADMIN role=1)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập login_id "staff01", password "StaffPw@2026", role "NICHINO_ADMIN", account_name "テスト管理者", email "staff01@example.com"

ステップ2：
Click button "登録"

ステップ3：
Kiểm tra DB: `SELECT * FROM m_account WHERE login_id = 'staff01'`

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 'm_account' AND operation = 'CREATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`, chuyển đến màn chi tiết tìm kiếm Master Account SCR-024

ステップ3：
Trả về 1 dòng, `role_id=1`, `ja_id=NULL`, `kanri_shiten_id=NULL`, `password_hash` đúng format bcrypt (`$2b$10$...`), `login_failure_count=0`, `account_lock_flg=false`, `mfa_enable_flg=false`

ステップ4：
Audit log 1 dòng được record, `result_status=1`, `after_value` chứa data đăng ký, `before_value` rỗng

補足：
・Sử dụng MSG-025-007, `登録しました。`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Happy path, phát hành account nội bộ.

## ACSMS-TC-025-047 — Happy path (đăng ký account JA本店 với role=4)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập login_id "ja001hon", password "JaPw@2026", role "JA_HONTEN", tỉnh thành "東京都", JA "ja-001", account_name "JA001本店管理者", email "ja001@example.com", paper_flg=ON, denshi_flg=OFF

ステップ2：
Click button "登録"

ステップ3：
Kiểm tra DB: `SELECT * FROM m_account WHERE login_id = 'ja001hon'`

### 期待結果

ステップ1：
Giá trị nhập được phản ánh, candidate trường JA được lọc theo `chuokai_flg=false`

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

ステップ3：
Trả về 1 dòng, `role_id=4`, `ja_id=1`, `kanri_shiten_id=NULL`, `paper_flg=true`, `denshi_flg=false`

補足：
・Account JA本店 chỉ liên kết `ja_id`, `kanri_shiten_id` là NULL

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Phát hành account JA本店.

## ACSMS-TC-025-048 — Happy path (đăng ký account JA kanri_shiten với role=5)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập login_id "ja001s01", password "Sh1ten@26", role "JA_KANRI_SHITEN", tỉnh thành "東京都", JA "ja-001", kanri_shiten "kanri-001", account_name "ja-001 支店01管理者", email "ja001s01@example.com"

ステップ2：
Click button "登録"

ステップ3：
Kiểm tra DB: `SELECT * FROM m_account WHERE login_id = 'ja001s01'`

### 期待結果

ステップ1：
Cascade 3 cấp hoạt động bình thường

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

ステップ3：
Trả về 1 dòng, `role_id=5`, `ja_id=1`, `kanri_shiten_id=1`

補足：
・Account JA kanri_shiten liên kết 3 cấp `ja_id` + `kanri_shiten_id`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Phát hành account JA kanri_shiten.

## ACSMS-TC-025-049 — Vi phạm unique constraint khi đăng ký login_id trùng

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `login_id=duplicate01`
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập "duplicate01" vào trường login_id, nhập giá trị hợp lệ vào các trường required khác

ステップ2：
Click button "登録"

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_account WHERE login_id = 'duplicate01'`

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Trả về HTTP 400, hiển thị `このログインIDは既に登録されています。` dạng toast hoặc message dưới trường

ステップ3：
Số lượng vẫn là 1 (không có dòng mới được thêm)

補足：
・MSG-025-004, phòng vệ kép unique constraint của DB + check trước ở application layer

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-004, unique constraint.

## ACSMS-TC-025-050 — Verify hash bcrypt của password

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập các trường required bao gồm password "Tes7@Pwd" và click button "登録"

ステップ2：
Kiểm tra DB: `SELECT password_hash FROM m_account WHERE login_id = '<login_id đã đăng ký>'`

ステップ3：
Kiểm tra format giá trị hash và phân bố salt

### 期待結果

ステップ1：
Đăng ký thành công, trả về HTTP 201

ステップ2：
Trả về 1 dòng, `password_hash` đúng format bcrypt (60 ký tự bắt đầu bằng `$2b$10$`)

ステップ3：
Khi đăng ký nhiều account với cùng password thì giá trị hash khác nhau (salt được generate ngẫu nhiên), plain text "Tes7@Pwd" KHÔNG được lưu trên DB

補足：
・bcrypt salt round=10 (security.md §パスワードハッシュ)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Verify password hash.

## ACSMS-TC-025-051 — Verify giá trị khởi tạo (login_failure_count · lock · MFA enable)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập các trường required hợp lệ và click button "登録"

ステップ2：
Kiểm tra DB: `SELECT login_failure_count, account_lock_flg, mfa_enable_flg FROM m_account WHERE login_id = '<login_id đã đăng ký>'`

### 期待結果

ステップ1：
Đăng ký thành công, trả về HTTP 201

ステップ2：
`login_failure_count=0`, `account_lock_flg=false`, `mfa_enable_flg=false` được set

補足：
・Trạng thái khởi tạo của account mới: MFA disable, đã unlock

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Verify giá trị khởi tạo của account mới.

## ACSMS-TC-025-052 — Verify FK integrity (gửi ja_id không hợp lệ)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Dùng DevTools gửi POST `/api/v1/accounts` với data chứa `role_id=4`, `ja_id=99999` (JA không tồn tại)

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`), chứa `errors[].field=ja_id`, không có dòng mới được thêm vào `m_account`

補足：
・FK integrity được verify ở BE side
・Qua FE thường không xảy ra vì chỉ có lựa chọn UI, nhưng thực hiện như verify qua DevTools

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

FK verify phòng vệ đa tầng ở BE.

## ACSMS-TC-025-053 — Verify nội dung after_value của audit log (CREATE)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN (admin01)
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập các trường required hợp lệ (login_id "audit01" v.v.) và click button "登録"

ステップ2：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table='m_account' AND operation='CREATE' ORDER BY log_datetime DESC LIMIT 1`

ステップ3：
Kiểm tra nội dung của `after_value`, `account_id`, `gamen_name`, `ip_address`

### 期待結果

ステップ1：
Đăng ký thành công, trả về HTTP 201

ステップ2：
Trả về 1 dòng, `log_type=1` (user_operation), `result_status=1`, `operation='CREATE'`, `target_table='m_account'`

ステップ3：
`after_value` chứa tất cả các trường đã đăng ký dưới dạng JSON (bao gồm `login_id`, `role_id`, `ja_id` v.v.), tuy nhiên `password_hash` KHÔNG được record, `account_id` là test account, `gamen_name` chứa "アカウントマスタ登録", `ip_address` là IP nguồn truy cập

補足：
・Phương châm: không lưu password hash trong audit log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Verify nội dung audit log, loại trừ password.

---

# カテゴリ 6: Logic nghiệp vụ — Cập nhật (Function — Edit)

## ACSMS-TC-025-054 — Happy path (update thông tin account hiện hữu)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10` (login_id=edit01, role_id=4, ja_id=1)

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`, xác nhận hiển thị giá trị hiện hữu

ステップ2：
Đổi account_name thành "更新後アカウント名", email thành "edit01-new@example.com", để password trống

ステップ3：
Click button "登録"

ステップ4：
Kiểm tra DB: `SELECT account_name, email, password_hash FROM m_account WHERE account_id = 10`

### 期待結果

ステップ1：
Giá trị hiện hữu được phản ánh lên màn hình, trường login_id ở trạng thái disable, trường password ở trạng thái trống

ステップ2：
Các trường được thay đổi phản ánh lên màn hình

ステップ3：
Trả về HTTP 200, hiển thị toast `更新しました。`, chuyển đến màn chi tiết tìm kiếm Master Account SCR-024

ステップ4：
Trả về 1 dòng, `account_name='更新後アカウント名'`, `email='edit01-new@example.com'`, `password_hash` cùng giá trị trước update (không đổi do gửi trống)

補足：
・Khi update, password trống = giữ giá trị cũ theo spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Happy path update, giữ password.

## ACSMS-TC-025-055 — Edit — login_id không thể chỉnh sửa

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10` (login_id=edit01)

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`

ステップ2：
Thử chỉnh sửa trực tiếp trường login_id

ステップ3：
Dùng DevTools gửi PUT `/api/v1/accounts/10` với data chứa `login_id=changed01`

### 期待結果

ステップ1：
Màn edit được hiển thị, trường login_id hiển thị "edit01"

ステップ2：
Trường login_id ở trạng thái disable (thuộc tính disabled), không thể nhập

ステップ3：
Request được gửi đi, bất kể response, `m_account.login_id` vẫn là "edit01" không đổi (BE side bỏ qua trường `login_id` hoặc xử lý như error)

補足：
・login_id là khóa nghiệp vụ vĩnh viễn nên không thể thay đổi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

login_id không thay đổi, phòng vệ kép.

## ACSMS-TC-025-056 — Edit — đổi password (pass độ phức tạp)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10`

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`

ステップ2：
Nhập giá trị mới "NewPw@2026" vào trường password, giữ nguyên các trường khác

ステップ3：
Click button "登録"

ステップ4：
Kiểm tra DB: `SELECT password_hash FROM m_account WHERE account_id = 10`

### 期待結果

ステップ1：
Màn edit được hiển thị

ステップ2：
Giá trị password mới được hiển thị

ステップ3：
Trả về HTTP 200, hiển thị toast `更新しました。`

ステップ4：
`password_hash` được update thành bcrypt hash của giá trị mới, khác với giá trị hash trước update

補足：
・Khi đổi password, hash được generate lại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Re-hash password.

## ACSMS-TC-025-057 — Edit — đổi password (lỗi do vi phạm độ phức tạp)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10`

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`

ステップ2：
Nhập "abcdefgh" (chỉ 8 ký tự chữ, độ phức tạp 1 loại) vào trường password

ステップ3：
Click button "登録"

### 期待結果

ステップ1：
Màn edit được hiển thị

ステップ2：
Giá trị password mới được hiển thị

ステップ3：
Trả về HTTP 400, dưới trường password hiển thị `パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。`, `m_account.password_hash` không được update

補足：
・MSG-025-003, verify độ phức tạp cũng áp dụng khi edit

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-003, verify độ phức tạp khi edit.

## ACSMS-TC-025-058 — Truy cập edit với account_id không tồn tại

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・`account_id=99999` không tồn tại trong DB

### 手順

ステップ1：
Truy cập URL `/accounts/99999/edit`

ステップ2：
Kiểm tra response của GET `/api/v1/accounts/99999`

### 期待結果

ステップ1：
Chuyển màn hình

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`), hiển thị toast `アカウント #99999 が見つかりません。`, quay về màn chi tiết tìm kiếm Master Account SCR-024 hoặc màn ngay trước đó

補足：
・Sử dụng MSG-025-006

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-006.

## ACSMS-TC-025-059 — Thử edit account đã xóa logic

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・`account_id=20` đã xóa logic (`deleted_at` NOT NULL)

### 手順

ステップ1：
Truy cập URL `/accounts/20/edit`

ステップ2：
Kiểm tra response của GET `/api/v1/accounts/20`

### 期待結果

ステップ1：
Chuyển màn hình

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, các dòng đã xóa logic không hit trong query thông thường), hiển thị toast `アカウント #20 が見つかりません。`

補足：
・Account đã xóa logic không phải đối tượng edit

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Các dòng đã xóa logic không thể edit.

## ACSMS-TC-025-060 — Verify nội dung before/after của audit log (UPDATE)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN (admin01)
  - ・Tồn tại account hiện hữu `account_id=10` (account_name='更新前名')

### 手順

ステップ1：
Truy cập URL `/accounts/10/edit`, đổi account_name từ "更新前名" sang "更新後名"

ステップ2：
Click button "登録"

ステップ3：
Kiểm tra DB: `SELECT before_value, after_value FROM t_log WHERE target_table='m_account' AND operation='UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Thay đổi được phản ánh lên màn hình

ステップ2：
Trả về HTTP 200, hiển thị toast `更新しました。`

ステップ3：
Trả về 1 dòng, `before_value` chứa `account_name: '更新前名'`, `after_value` chứa `account_name: '更新後名'`, cả hai đều không chứa `password_hash`

補足：
・Khi update, record cả before/after, cho phép truy vết diff

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Audit log UPDATE, record diff before/after.

## ACSMS-TC-025-061 — Phát hiện conflict khi edit đồng thời (optimistic lock)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Tồn tại account hiện hữu `account_id=10`
  - ・Đã login 2 session trên trình duyệt A và trình duyệt B

### 手順

ステップ1：
Trên trình duyệt A truy cập URL `/accounts/10/edit`, load data

ステップ2：
Trên trình duyệt B truy cập URL `/accounts/10/edit`, load data

ステップ3：
Trên trình duyệt B, đổi account_name thành "Bによる更新" và click button "登録"

ステップ4：
Trên trình duyệt A, đổi account_name thành "Aによる更新" và click button "登録"

### 期待結果

ステップ1：
Trên trình duyệt A, màn edit được hiển thị

ステップ2：
Trên trình duyệt B, màn edit được hiển thị (cả hai trình duyệt giữ cùng `updated_at`)

ステップ3：
Trên trình duyệt B trả về HTTP 200, `m_account.account_name='Bによる更新'`, `updated_at` được update

ステップ4：
Trên trình duyệt A trả về HTTP 409 hoặc response phát hiện conflict, hiển thị toast thông báo conflict (ví dụ: `他のユーザーが既に更新しています。最新データを再取得してください。`), `account_name` trong DB vẫn là "Bによる更新" không đổi

補足：
・TC xác nhận có/không implement optimistic lock; trường hợp chưa implement thì hành vi "last write wins" cần được xác nhận chấp nhận được trong nghiệp vụ hay không

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Xác nhận implement optimistic lock.

---

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-025-062 — Thao tác sau khi session hết hạn (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`, đã nhập form

### 手順

ステップ1：
Xóa session cookie `session_id` bằng DevTools (hoặc để qua 24h)

ステップ2：
Click button "登録"

ステップ3：
Xác nhận chuyển màn

### 期待結果

ステップ1：
Cookie bị xóa

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ3：
Chuyển đến màn login `/login`, có query `?redirect=/accounts/create`, sau khi login quay lại màn ban đầu

補足：
・Hành vi session hết hạn chung của toàn bộ màn hình

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Hành vi UNAUTHORIZED chung.

## ACSMS-TC-025-063 — JSON request không hợp lệ (BAD_REQUEST)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login

### 手順

ステップ1：
Dùng DevTools gửi chuỗi JSON bị lỗi (ví dụ: dấu phẩy cuối, thiếu dấu ngoặc kép) tới POST `/api/v1/accounts`

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
Request được gửi đi

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`), không có dòng mới được thêm vào `m_account`

補足：
・Lỗi chung khi JSON parse fail

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Hành vi BAD_REQUEST chung.

## ACSMS-TC-025-064 — Lỗi validation đồng thời nhiều trường

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Nhập login_id trống, password "abc" (vi phạm độ phức tạp), account_name trống, email "invalid" (vi phạm format)

ステップ2：
Click button "登録"

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`), trả về message `入力値が不正です。詳細はerrorsフィールドを確認してください。`, mảng `errors[]` chứa 4 mục `login_id`, `password`, `account_name`, `email`, dưới từng trường hiển thị message tương ứng, focus chuyển đến trường lỗi đầu tiên (login_id)

補足：
・Nhiều lỗi được tổng hợp một lượt vào `errors[]`, mapping tương ứng cho từng trường FE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Hiển thị tổng hợp lỗi nhiều trường.

## ACSMS-TC-025-065 — Rate limit (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Gửi liên tục POST `/api/v1/accounts` 101 lần trở lên trong 60 giây

ステップ2：
Kiểm tra response

### 期待結果

ステップ1：
100 request đầu trả về 201 hoặc 400, từ request thứ 101 trở đi bị giới hạn tiếp nhận ở server side

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), toast được hiển thị

補足：
・Giới hạn 100 request/phút (security.md §レート制限)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Verify rate limit.

## ACSMS-TC-025-066 — Lỗi nội bộ server (INTERNAL_SERVER_ERROR 500)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`
  - ・Trong môi trường test, gây lỗi server side có chủ ý (ngắt DB v.v.)

### 手順

ステップ1：
Nhập các trường required hợp lệ

ステップ2：
Trong trạng thái đã gây ngắt DB hoặc lỗi server, click button "登録"

ステップ3：
Kiểm tra response và log

### 期待結果

ステップ1：
Giá trị nhập được phản ánh

ステップ2：
Trả về HTTP 500, hiển thị toast `システムエラーが発生しました。しばらくしてから再度お試しください。`, ở lại màn hình và giá trị nhập được giữ lại

ステップ3：
Error log (`log_type=3`, `result_status=2`) được record trong `t_log`, `error_message` chứa nội dung lỗi, `stack_trace` chỉ ở server side và không bị lộ ra FE

補足：
・Sử dụng MSG-025-008, chi tiết lỗi nội bộ không xuất ra bên ngoài

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

MSG-025-008, response khi lỗi 500.

## ACSMS-TC-025-067 — Thứ tự tab và thao tác keyboard (Accessibility)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`

### 手順

ステップ1：
Focus vào trường login_id, nhấn liên tục phím Tab

ステップ2：
Xác nhận thứ tự chuyển focus

ステップ3：
Xác nhận chuyển focus theo chiều ngược bằng Shift+Tab

ステップ4：
Xác nhận phòng tránh submit nhầm bằng phím Enter (Enter trong trường text không kích hoạt button đăng ký)

### 期待結果

ステップ1：
Focus được đặt vào trường login_id

ステップ2：
Chuyển theo thứ tự: login_id → password → role → tỉnh thành (khi hiển thị) → JA (khi hiển thị) → kanri_shiten (khi hiển thị) → account_name → email → sub_email_1 → sub_email_2 → sub_email_3 → paper_flg → denshi_flg → biko → button 登録 → button 前の画面に戻る

ステップ3：
Chuyển theo thứ tự ngược lại

ステップ4：
Nhấn phím Enter trong trường text không kích hoạt button đăng ký (phòng tránh submit nhầm), trong textarea thì chèn xuống dòng

補足：
・Thiết kế hoàn thiện chỉ bằng thao tác keyboard (vue.md §Accessibility)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Thứ tự tab và phòng tránh Enter submit nhầm.

## ACSMS-TC-025-068 — Hành vi khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã truy cập URL `/accounts/create`, đã nhập form

### 手順

ステップ1：
Chuyển sang chế độ `Offline` ở tab network của DevTools

ステップ2：
Click button "登録"

ステップ3：
Đưa network về `Online`, click lại button "登録"

### 期待結果

ステップ1：
Trạng thái ngắt kết nối mạng

ステップ2：
Request thất bại, hiển thị toast lỗi mạng (ví dụ: `ネットワークエラーが発生しました。接続を確認してください。`), ở lại màn hình, giá trị nhập được giữ lại

ステップ3：
Request được gửi đi bình thường, trả về HTTP 201

補足：
・Thiết kế cho phép retry khi giao tiếp thất bại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Hành vi khi mất kết nối mạng.

# カテゴリ 8: Hủy session・Kiểm tra tên dành riêng (Session / Reserved-name)

## ACSMS-TC-025-069 — Hủy session khi có thay đổi quan trọng về bảo mật (de-provisioning)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN (có quyền `account.update` / `account.delete`)
  - ・Tài khoản đối tượng B (JA_HONTEN) **đang đăng nhập ở trình duyệt khác** (đang giữ session cookie hợp lệ)
  - ・Chuẩn bị cả môi trường có thể tạm dừng Redis (dùng cho Bước 8)

### Các bước

Bước 1:
Quản trị viên buộc reset mật khẩu của B. Sau đó thao tác bất kỳ màn hình nào trên trình duyệt của B

Bước 2:
Cho B đăng nhập lại, rồi quản trị viên đổi phân loại quản trị (role) của B. Sau đó thao tác trên trình duyệt của B

Bước 3:
Cho B đăng nhập lại, rồi quản trị viên đổi nơi trực thuộc của B (một trong JA・chi nhánh quản lý・chi nhánh trực thuộc). Sau đó thao tác trên trình duyệt của B

Bước 4:
Cho B đăng nhập lại, rồi quản trị viên **khóa** B. Sau đó thao tác trên trình duyệt của B

Bước 5:
Cho B đăng nhập lại, rồi quản trị viên **mở khóa** B. Sau đó thao tác trên trình duyệt của B

Bước 6:
Cho B đăng nhập lại, rồi quản trị viên **chỉ đổi họ tên・địa chỉ email・ghi chú** của B. Sau đó thao tác trên trình duyệt của B

Bước 7:
Cho B đăng nhập lại, rồi quản trị viên **xóa** B. Sau đó thao tác trên trình duyệt của B

Bước 8:
Ở trạng thái đã dừng Redis, quản trị viên đổi role của B

Bước 9:
Thực hiện cập nhật mà nơi trực thuộc "không thay đổi" (gửi lại cùng giá trị)

### Kết quả mong đợi

Bước 1:
Session của B bị hủy, chuyển sang 401 → màn hình đăng nhập (bắt buộc đăng nhập lại)

Bước 2:
Session cũng bị hủy tương tự. **Quyền của role cũ không còn sót lại** (payload của session được cố định lúc đăng nhập, nên nếu không hủy thì việc giáng quyền không được phản ánh)

Bước 3:
Session cũng bị hủy tương tự (`ja_id` / `kanri_shiten_id` / `shiten_id` cũng được cố định lúc đăng nhập)

Bước 4:
Session bị hủy và từ đó B cũng không đăng nhập được nữa

Bước 5:
**Session không bị hủy**. Vì thao tác mở khóa không được phép cắt session của chính quản trị viên

Bước 6:
**Session không bị hủy** (thay đổi không nhạy cảm)

Bước 7:
Session bị hủy (xóa thì hủy vô điều kiện)

Bước 8:
Bản thân việc cập nhật vẫn thành công và màn hình hiển thị thông báo thành công. Log phía server xuất ra cảnh báo hủy session thất bại (việc hủy là best-effort sau khi commit. Ghi nghiệp vụ đã thành lập và session sẽ hết hạn trong TTL 24 giờ)

Bước 9:
Session không bị hủy (chuẩn hóa `undefined` ＝ không nằm trong nội dung cập nhật và `null` ＝ không có phạm vi; **chỉ coi là thay đổi khi giá trị thực sự chuyển đổi**)

Bổ sung:
・Đây là xử lý cho security review 2026-07. `SessionAuthGuard` chỉ truy vấn session trên Redis mà không kiểm tra lại DB, nên nếu không hủy thì người đã nghỉ việc・tài khoản bị vô hiệu vẫn giữ nguyên quyền cũ bằng cookie (de-provisioning bypass)
・Bước 5・6・9 là để xác nhận "không hủy quá mức". Nếu hủy quá tay thì quản trị viên tự cắt session của mình／người dùng bị đá ra mỗi lần có thay đổi vặt

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

## ACSMS-TC-025-070 — Kiểm tra tên dành riêng SYSTEM cho ID đăng nhập (#55719)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN (có quyền `account.create`)
  - ・Đang mở màn hình đăng ký tài khoản (chế độ tạo mới)

### Các bước

Bước 1:
Nhập `SYSTEM` vào ID đăng nhập rồi đăng ký

Bước 2:
Nhập `system` (chữ thường) vào ID đăng nhập rồi đăng ký

Bước 3:
Nhập `SYSTEM_DENSHI_SYNC` vào ID đăng nhập rồi đăng ký

Bước 4:
Nhập `System_batch` vào ID đăng nhập rồi đăng ký

Bước 5:
Nhập `SYSTEMS` (bắt đầu bằng `SYSTEM` nhưng không phải `SYSTEM_`) vào ID đăng nhập rồi đăng ký

Bước 6:
Nhập `MYSYSTEM` (kết thúc bằng SYSTEM) vào ID đăng nhập rồi đăng ký

Bước 7:
Từ DevTools gửi request tương đương INSERT trực tiếp, vòng qua DTO (để kiểm tra ràng buộc CHECK của DB)

### Kết quả mong đợi

Bước 1:
Báo lỗi nhập liệu và không đăng ký được

Bước 2:
Báo lỗi nhập liệu (**không phân biệt chữ hoa chữ thường**)

Bước 3:
Báo lỗi nhập liệu (chuỗi bắt đầu bằng `SYSTEM_` là dành riêng)

Bước 4:
Báo lỗi nhập liệu (không phân biệt hoa thường và phán định là bắt đầu bằng `SYSTEM_`)

Bước 5:
Đăng ký được (không phải `SYSTEM` đơn lẻ, cũng không bắt đầu bằng `SYSTEM_`)

Bước 6:
Đăng ký được (chỉ cấm khớp tiền tố)

Bước 7:
Bị từ chối bởi ràng buộc CHECK `ck_m_account_login_id_not_reserved` của DB (phòng thủ ở **cả hai** phía DTO và DB)

Bổ sung:
・Nếu trùng với tên người thực thi batch (`SYSTEM_DENSHI_SYNC` v.v.) thì việc phán định "xuất phát từ đồng bộ bản điện tử hay từ thao tác màn hình" dựa trên `t_dokusya_rireki.created_by` sẽ hỏng (#55719)
・Ở danh sách lịch sử của SCR-013, việc hiển thị được phân biệt theo `created_by` có phải `SYSTEM_*` hay không (xem ACSMS-TC-013-040)

### Kết quả kiểm thử (lần 1)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Kết quả kiểm thử (lần 2)

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Đầu ra | - |
| Người phụ trách | - |
| Ngày xác nhận | - |
| ID lỗi | - |

### Ghi chú

(không có)

---
