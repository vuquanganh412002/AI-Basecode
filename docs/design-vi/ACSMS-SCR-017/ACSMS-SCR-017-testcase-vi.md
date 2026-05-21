---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-017
screen_name: 販売店情報登録画面
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

Tài liệu này mô tả chi tiết test specification cho "Màn hình đăng ký thông tin Hanbaiten (ACSMS-SCR-017)" được tạo mới trên hệ thống.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-017 | Tài liệu thiết kế Màn hình đăng ký thông tin Hanbaiten |
| 2 | ACSMS-SCR-017-api | Tài liệu thiết kế API đăng ký thông tin Hanbaiten |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 3 |
| 4 | Validation đầu vào — Màn đăng ký | 33 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 8 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 70 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-017-001 — Cấm truy cập màn đăng ký thông tin Hanbaiten với role NICHINO_ADMIN

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra item "販売店マスタ" trên sidebar

ステップ2：
Truy cập trực tiếp URL `/hanbaiten/create`

ステップ3：
Dùng DevTools gửi POST `/api/v1/hanbaiten` với request body hợp lệ

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 'm_hanbaiten' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Sidebar KHÔNG hiển thị item "販売店マスタ" (do không có quyền `hanbaiten.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。` + chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
Có ≥1 dòng error log, `account_id` khớp với test account

補足：
・Cả 3 tầng FE menu / FE router guard / BE API guard đều block
・Không có row mới trong `m_hanbaiten`
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

## ACSMS-TC-017-002 — Đăng ký thông tin Hanbaiten bởi NICHINO_STAFF (đại diện nhập liệu)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `hanbaiten.daiko_input`

### 手順

ステップ1：
Kiểm tra item "販売店マスタ" trên sidebar

ステップ2：
Truy cập URL `/hanbaiten/create`, chỉ định JA khác (ja-002) tại trường chọn JA

ステップ3：
Nhập các trường required, click button đăng ký

### 期待結果

ステップ1：
Sidebar hiển thị item "販売店マスタ" (NICHINO_STAFF có quyền `hanbaiten.view`)

ステップ2：
Màn hình đăng ký thông tin Hanbaiten được hiển thị, trường chọn JA ở trạng thái active

ステップ3：
Trả về HTTP 201, hiển thị toast `登録しました。`, dữ liệu được đăng ký vào `m_hanbaiten` với ja_id=2

補足：
・Vì là flow đại diện nhập liệu nên UI chọn JA được hiển thị
・Với role thông thường (CHUOKAI v.v.) thì không thể chọn JA và `session.ja_id` được tự động gán

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

NICHINO_STAFF là role duy nhất có thể đăng ký Hanbaiten thay cho JA bất kỳ qua `hanbaiten.daiko_input`.

## ACSMS-TC-017-003 — Đăng ký thông tin Hanbaiten bởi CHUOKAI — chỉ thao tác trong phạm vi 中央会 quản lý

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・JA quản lý: ja-001, ja-002 (dưới chuokai-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Nhập các trường required, click button đăng ký

ステップ3：
Dùng DevTools gửi POST `/api/v1/hanbaiten` đến JA (ja-099) thuộc 中央会 khác

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị, UI chọn JA không hiển thị (tự động gán JA của user)

ステップ2：
Trả về HTTP 201, dữ liệu được đăng ký vào `m_hanbaiten` với JA trong phạm vi quản lý

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Layer 2 DataScope từ chối đăng ký vào JA ngoài phạm vi quản lý
・Error log được ghi vào `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

CHUOKAI chỉ có thể thao tác Hanbaiten thuộc JA do mình quản lý.

## ACSMS-TC-017-004 — Đăng ký thông tin Hanbaiten bởi JA_HONTEN — chỉ thao tác trong JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Nhập các trường required, click button đăng ký

ステップ3：
Dùng DevTools gửi POST `/api/v1/hanbaiten` đến JA khác (ja-002)

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị, UI chọn JA không hiển thị

ステップ2：
Trả về HTTP 201, dữ liệu được đăng ký vào `m_hanbaiten` với ja_id=1

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`)

補足：
・JA_HONTEN chỉ có thể thao tác Hanbaiten thuộc JA của mình
・Đăng ký vào JA khác bị từ chối bởi Layer 2 DataScope

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-005 — Đăng ký thông tin Hanbaiten bởi JA_KANRI_SHITEN — chỉ thao tác trong JA của mình

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001/kanri_shiten-101)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Nhập các trường required, click button đăng ký

ステップ3：
Dùng DevTools gửi POST `/api/v1/hanbaiten` đến JA khác (ja-099)

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị, UI chọn JA không hiển thị

ステップ2：
Trả về HTTP 201, dữ liệu được đăng ký vào `m_hanbaiten` với ja_id=1

ステップ3：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`)

補足：
・JA_KANRI_SHITEN cũng chỉ có thể thao tác Hanbaiten thuộc JA của mình
・JA khác bị từ chối bởi Layer 2 DataScope

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

## ACSMS-TC-017-006 — Xác nhận hiển thị ban đầu của màn đăng ký

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Xác nhận trực quan từng section trên màn hình

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị

ステップ2：
Tiêu đề trang "販売店情報登録", section thông tin cơ bản (販売店コード, 販売店名, カナ, 都道府県, 適格請求書発行事業者番号), section địa chỉ・liên lạc (郵便番号, 住所, 電話, FAX, 所長名), section thông tin ủy thác (委託区分, 配達料単価, 支払サイクル, 手数料区分, 手数料金額), section tài khoản chuyển khoản (銀行コード, 銀行名, 支店コード, 支店名, 預金種別, 口座番号, 口座名義), khác (廃店フラグ, 備考), button 登録/キャンセル đều được hiển thị

補足：
・Marker required (`*` màu đỏ) được hiển thị bên phải các trường required

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-007 — Hiển thị ban đầu của màn chỉnh sửa và load dữ liệu đã có

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001

### 手順

ステップ1：
Truy cập URL `/hanbaiten/1001/edit`

ステップ2：
Xác nhận giá trị ban đầu của tất cả field

### 期待結果

ステップ1：
Màn hình chỉnh sửa thông tin Hanbaiten được hiển thị, tiêu đề trang "販売店情報編集" được hiển thị

ステップ2：
Tất cả mục trong response GET `/api/v1/hanbaiten/1001` được load vào trường input tương ứng, trường `hanbaiten_code` ở trạng thái disable

補足：
・販売店コード không thể chỉnh sửa (business rule)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-008 — Bố cục button và label tiếng Nhật

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra khu vực button ở phía dưới form

### 期待結果

ステップ1：
Từ trái sang được sắp xếp theo thứ tự "登録" (primary xanh), "前の画面に戻る" (default); tất cả label đều bằng tiếng Nhật

補足：
・Theo convention hệ thống nghiệp vụ tiếng Nhật, primary action đặt ở bên trái

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-009 — Thứ tự focus bằng phím Tab

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Focus vào trường 販売店コード, lần lượt nhấn phím `Tab`

### 期待結果

ステップ1：
Focus ban đầu được đặt vào trường 販売店コード

ステップ2：
Focus di chuyển theo thứ tự hiển thị trên màn hình (販売店コード → 販売店名 → カナ → 都道府県 → … → 備考 → button 登録 → button 戻る)

補足：
・Có thể truy cập tất cả input bằng thao tác bàn phím

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-010 — Chặn submit ngầm bằng phím Enter

- 観点ID: VP-E-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Focus vào trường 販売店名, nhấn phím `Enter`

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị

ステップ2：
Form không được submit, POST `/api/v1/hanbaiten` không được gọi

補足：
・Ngăn submit nhầm bằng Enter trong form nhiều trường
・Implement bằng utility `preventEnterImplicitSubmit`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-011 — Hiển thị responsive (PC / Tablet / Mobile)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra với độ rộng browser 1920px / 1024px / 375px

### 期待結果

ステップ1：
1920px PC layout 2 cột, 1024px Tablet duy trì 2 cột, 375px Mobile tự động chuyển sang layout 1 cột, không xảy ra cuộn ngang

補足：
・Khu vực button luôn được hiển thị kể cả trên mobile

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-017-012 — Hiển thị tiêu đề trang và logo

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra khu vực header

### 期待結果

ステップ1：
Tiêu đề màn hình "販売店情報登録" được hiển thị ở phía trên trang, logo hệ thống "クラウド版購読者管理システム" được hiển thị ở phía bên trái header

補足：
・Trên màn chỉnh sửa thì hiển thị "販売店情報編集"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-013 — Breadcrumb và link quay lại

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra breadcrumb

ステップ2：
Click link "販売店一覧" trong breadcrumb

### 期待結果

ステップ1：
Breadcrumb 3 cấp "ホーム > 販売店一覧 > 販売店情報登録" được hiển thị, node cuối "販売店情報登録" được hiển thị ở dạng không phải link

ステップ2：
Chuyển về màn list Hanbaiten (`/hanbaiten`)

補足：
・Trên màn chỉnh sửa thì cấp thứ 3 là "販売店情報編集"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-014 — Hiển thị thông tin user đang login

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tên user "鈴木 太郎", thuộc ja-001

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra phía bên phải header

ステップ2：
Mở rộng menu user

### 期待結果

ステップ1：
Phía bên phải header hiển thị tên user "鈴木 太郎", tên role "JA本店"

ステップ2：
Hiển thị các mục menu "ログアウト", "パスワード変更"

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-017-015 — Check required `hanbaiten_code`

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Để trống trường 販売店コード, nhập các trường required khác, click button đăng ký

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị

ステップ2：
Hiển thị inline `必須項目です。` dưới trường 販売店コード, POST `/api/v1/hanbaiten` không được gọi

補足：
・FE client-side validation chặn trước

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-016 — Biên số ký tự `hanbaiten_code` (10 ký tự OK)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 10 ký tự (ví dụ: `H123456789`) vào trường 販売店コード

ステップ2：
Nhập các trường required khác, click button đăng ký

### 期待結果

ステップ1：
Có thể nhập 10 ký tự vào trường 販売店コード, không hiển thị lỗi

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

補足：
・Tối đa 10 ký tự được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-017 — Biên số ký tự `hanbaiten_code` (11 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 11 ký tự (ví dụ: `H1234567890`) vào trường 販売店コード

ステップ2：
Click button đăng ký

### 期待結果

ステップ1：
Do giới hạn maxlength của trường 販売店コード nên chỉ nhập được tối đa 10 ký tự, hoặc ký tự từ thứ 11 trở đi bị cắt hiển thị

ステップ2：
Hiển thị lỗi format dưới trường input, POST `/api/v1/hanbaiten` không được gọi

補足：
・Defense kép FE thuộc tính `maxlength=10` + server-side `@MaxLength(10)`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-018 — Check required `hanbaiten_name`

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Để trống trường 販売店名, click button đăng ký

### 期待結果

ステップ1：
Hiển thị inline `必須項目です。` dưới trường 販売店名, POST `/api/v1/hanbaiten` không được gọi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-019 — Biên số ký tự `hanbaiten_name` (100 ký tự OK)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 100 ký tự vào trường 販売店名

ステップ2：
Click button đăng ký

### 期待結果

ステップ1：
Có thể nhập 100 ký tự vào trường 販売店名

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-020 — Biên số ký tự `hanbaiten_name` (101 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Thử nhập 101 ký tự vào trường 販売店名

### 期待結果

ステップ1：
Do giới hạn maxlength nên chỉ nhập được tối đa 100 ký tự

補足：
・Bị chặn vật lý bởi thuộc tính FE `maxlength=100`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-021 — Check format `hanbaiten_name_kana` half-width katakana

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập hiragana (ví dụ: `はんばいてん`) vào trường 販売店名カナ, click button đăng ký

ステップ2：
Nhập half-width katakana (ví dụ: `ﾊﾝﾊﾞｲﾃﾝ`) vào trường 販売店名カナ, click button đăng ký

### 期待結果

ステップ1：
Hiển thị inline lỗi format `販売店名(カナ)は半角カタカナで入力してください。` dưới trường 販売店名カナ

ステップ2：
Không hiển thị lỗi format, trả về HTTP 201

補足：
・Half-width katakana là bắt buộc do compatibility với Zengin / CSV ngân hàng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-022 — Biên số ký tự `hanbaiten_name_kana` (100 ký tự OK / 101 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 100 ký tự (half-width katakana) vào trường 販売店名カナ

ステップ2：
Thử nhập 101 ký tự vào trường 販売店名カナ

### 期待結果

ステップ1：
Đến 100 ký tự được tiếp nhận bình thường

ステップ2：
Do maxlength nên không thể nhập ký tự từ thứ 101 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-023 — Check format `todofuken_code`

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn "東京都" tại trường 都道府県

ステップ2：
Dùng DevTools gửi trực tiếp `todofuken_code: "99"` (mã không tồn tại)

### 期待結果

ステップ1：
Hiển thị giá trị đã chọn, không phát sinh lỗi

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`)

補足：
・`todofuken_code` được kiểm tra existence trong m_todofuken

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-024 — Biên số ký tự `torihikisaki_no` (20 ký tự OK / 21 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 20 ký tự vào trường 適格請求書発行事業者番号

ステップ2：
Thử nhập 21 ký tự

### 期待結果

ステップ1：
Đến 20 ký tự có thể nhập, được tiếp nhận bình thường khi đăng ký

ステップ2：
Do maxlength nên không thể nhập ký tự từ thứ 21 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-025 — Check format `yubin_no` (7 ký tự số half-width)

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `123-4567` (có dấu gạch nối) vào trường 郵便番号, click button đăng ký

ステップ2：
Nhập `1234567` (7 ký tự số half-width) vào trường 郵便番号, click button đăng ký

### 期待結果

ステップ1：
Hiển thị lỗi format dưới trường 郵便番号, POST không được gọi

ステップ2：
Không hiển thị lỗi format, trả về HTTP 201

補足：
・Chỉ tiếp nhận 7 ký tự số half-width không có gạch nối

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-026 — Biên số ký tự `address` (200 ký tự OK / 201 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 200 ký tự vào trường 住所

ステップ2：
Thử nhập 201 ký tự

### 期待結果

ステップ1：
Đến 200 ký tự có thể nhập, được tiếp nhận bình thường khi đăng ký

ステップ2：
Do maxlength nên không thể nhập ký tự từ thứ 201 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-027 — Check format `tel`

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `03-1234-5678` vào trường 電話

ステップ2：
Nhập `abc-1234-5678` (có lẫn chữ cái) vào trường 電話, click button đăng ký

### 期待結果

ステップ1：
Không hiển thị lỗi format, được tiếp nhận bình thường khi đăng ký

ステップ2：
Hiển thị lỗi format dưới trường 電話, POST không được gọi

補足：
・Chỉ tiếp nhận chữ số half-width và dấu gạch nối

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-028 — Biên số ký tự `tel` (15 ký tự OK / 16 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 15 ký tự vào trường 電話

ステップ2：
Thử nhập 16 ký tự

### 期待結果

ステップ1：
Đến 15 ký tự có thể nhập, được tiếp nhận bình thường khi đăng ký

ステップ2：
Do maxlength nên không thể nhập ký tự từ thứ 16 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-029 — Check format `fax`

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `03-1234-5678` vào trường FAX

ステップ2：
Nhập `xyz` (có lẫn chữ cái) vào trường FAX, click button đăng ký

### 期待結果

ステップ1：
Không hiển thị lỗi format, được tiếp nhận bình thường khi đăng ký

ステップ2：
Hiển thị lỗi format dưới trường FAX

補足：
・Quy tắc giống `tel` (chữ số half-width + dấu gạch nối)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-030 — Biên số ký tự `shocho_name` (50 ký tự OK / 51 ký tự NG)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 50 ký tự vào trường 所長名

ステップ2：
Thử nhập 51 ký tự

### 期待結果

ステップ1：
Đến 50 ký tự có thể nhập, được tiếp nhận bình thường khi đăng ký

ステップ2：
Do maxlength nên không thể nhập ký tự từ thứ 51 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-031 — Check giá trị mã master `itaku_kubun`

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra danh sách lựa chọn của dropdown 委託区分

ステップ2：
Dùng DevTools gửi trực tiếp `itaku_kubun: 99`

### 期待結果

ステップ1：
Chỉ hiển thị các giá trị thuộc category m_code `ITAKU_KUBUN` (1: 振込, 2: 日農委託, 9: その他) làm lựa chọn

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message chứa `委託区分の値が不正です`)

補足：
・Check tính nhất quán m_code là bắt buộc ở server-side

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-032 — Check FK `haitatsuryo_tanka_id`

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn đơn giá thuộc JA của mình từ dropdown 配達料単価

ステップ2：
Dùng DevTools gửi trực tiếp `haitatsuryo_tanka_id: 99999` (đơn giá thuộc JA khác)

### 期待結果

ステップ1：
Hiển thị giá trị đã chọn, được tiếp nhận bình thường khi đăng ký

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Layer 4 FK scope guard (`fetchFkInJa`) block tham chiếu đơn giá của JA khác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-033 — Check khoảng giá trị số `haitatsuryo_shiharai_cycle`

- 観点ID: VP-B-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `0` vào trường 配達料支払サイクル, click button đăng ký

ステップ2：
Nhập `1` vào trường 配達料支払サイクル, click button đăng ký

### 期待結果

ステップ1：
Hiển thị lỗi format (số nguyên ≥ 1), POST không được gọi

ステップ2：
Được tiếp nhận bình thường, trả về HTTP 201

補足：
・Sycle thanh toán tính theo tháng, ≥ 1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-034 — Check giá trị mã master `tesuryo_kubun`

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra danh sách lựa chọn của dropdown 手数料区分

ステップ2：
Dùng DevTools gửi trực tiếp `tesuryo_kubun: 99`

### 期待結果

ステップ1：
Chỉ hiển thị các giá trị thuộc category m_code `TESURYO_KUBUN` làm lựa chọn

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`)

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-035 — Check khoảng giá trị số `tesuryo_amount` (số âm NG)

- 観点ID: VP-B-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `-100` vào trường 手数料金額, click button đăng ký

ステップ2：
Nhập `0` vào trường 手数料金額, click button đăng ký

### 期待結果

ステップ1：
Hiển thị lỗi format (số nguyên ≥ 0)

ステップ2：
Được tiếp nhận bình thường (0 円 là giá trị hợp lệ biểu thị miễn phí)

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-036 — Check required `bank_code` khi `itaku_kubun`=1 (振込)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn "1: 振込" tại trường 委託区分

ステップ2：
Để trống trường 銀行コード, nhập các trường required khác, click button đăng ký

### 期待結果

ステップ1：
Tất cả mục thuộc section thông tin ngân hàng (`bank_code`, `bank_name`, `bank_branch_code`, `bank_branch_name`, `yokin_shubetsu`, `koza_no`, `koza_meigi`) trở thành required, marker required `*` được hiển thị

ステップ2：
Hiển thị `必須項目です。` dưới trường 銀行コード, POST không được gọi

補足：
・Required có điều kiện chỉ kích hoạt khi `itaku_kubun`=1

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-037 — Check format `bank_code` (4 ký tự số half-width) khi `itaku_kubun`=1

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, nhập `001` (3 ký tự) vào trường 銀行コード, click button đăng ký

ステップ2：
Nhập `0001` vào trường 銀行コード, click button đăng ký

### 期待結果

ステップ1：
Hiển thị lỗi format `銀行コードは半角数字4桁で入力してください。` dưới trường 銀行コード

ステップ2：
Không hiển thị lỗi format, được tiếp nhận bình thường

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-038 — Check format `bank_branch_code` (3 ký tự số half-width) khi `itaku_kubun`=1

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, nhập `12` (2 ký tự) vào trường 支店コード, click button đăng ký

ステップ2：
Nhập `123` vào trường 支店コード, click button đăng ký

### 期待結果

ステップ1：
Hiển thị lỗi format dưới trường 支店コード

ステップ2：
Không hiển thị lỗi format, được tiếp nhận bình thường

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-039 — Check required・số ký tự `bank_name` khi `itaku_kubun`=1

- 観点ID: VP-B-01
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, để trống trường 銀行名, click button đăng ký

ステップ2：
Nhập 100 ký tự vào trường 銀行名, click button đăng ký

ステップ3：
Thử nhập 101 ký tự

### 期待結果

ステップ1：
Hiển thị `必須項目です。` dưới trường 銀行名

ステップ2：
Đến 100 ký tự được tiếp nhận

ステップ3：
Do maxlength nên không thể nhập ký tự từ thứ 101 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-040 — Check required・số ký tự `bank_branch_name` khi `itaku_kubun`=1

- 観点ID: VP-B-01
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, để trống trường 支店名, click button đăng ký

ステップ2：
Nhập 100 ký tự vào trường 支店名

ステップ3：
Thử nhập 101 ký tự

### 期待結果

ステップ1：
Hiển thị `必須項目です。` dưới trường 支店名

ステップ2：
Đến 100 ký tự có thể nhập, được tiếp nhận bình thường

ステップ3：
Do maxlength nên không thể nhập ký tự từ thứ 101 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-041 — Check giá trị mã master `yokin_shubetsu` khi `itaku_kubun`=1

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, kiểm tra dropdown 預金種別

ステップ2：
Dùng DevTools gửi trực tiếp `yokin_shubetsu: 99`

### 期待結果

ステップ1：
Chỉ hiển thị các giá trị thuộc category m_code `YOKIN_SHUBETSU` (1: 普通, 2: 当座) làm lựa chọn

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`)

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-042 — Check format `koza_no` (chữ số half-width tối đa 10 ký tự) khi `itaku_kubun`=1

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, nhập `1234567A` (có lẫn chữ cái) vào trường 口座番号, click button đăng ký

ステップ2：
Nhập 10 ký tự số half-width `1234567890` vào trường 口座番号, click button đăng ký

ステップ3：
Thử nhập 11 ký tự

### 期待結果

ステップ1：
Hiển thị lỗi format dưới trường 口座番号

ステップ2：
Được tiếp nhận bình thường

ステップ3：
Do maxlength nên không thể nhập ký tự từ thứ 11 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-043 — Check required・số ký tự `koza_meigi` khi `itaku_kubun`=1

- 観点ID: VP-B-01
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=1, để trống trường 口座名義, click button đăng ký

ステップ2：
Nhập 50 ký tự vào trường 口座名義

ステップ3：
Thử nhập 51 ký tự

### 期待結果

ステップ1：
Hiển thị `必須項目です。` dưới trường 口座名義

ステップ2：
Đến 50 ký tự có thể nhập, được tiếp nhận bình thường

ステップ3：
Do maxlength nên không thể nhập ký tự từ thứ 51 trở đi

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-044 — Các mục ngân hàng trở thành tùy chọn khi `itaku_kubun`=2 (日農委託)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn "2: 日農委託" tại trường 委託区分

ステップ2：
Để trống toàn bộ các mục ngân hàng, nhập các trường required khác, click button đăng ký

### 期待結果

ステップ1：
Marker required `*` biến mất khỏi các mục ngân hàng

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

補足：
・Với `itaku_kubun`=2/9 thì thông tin ngân hàng là tùy chọn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-045 — Các mục ngân hàng trở thành tùy chọn khi `itaku_kubun`=9 (その他)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn "9: その他" tại trường 委託区分

ステップ2：
Để trống các mục ngân hàng, click button đăng ký

### 期待結果

ステップ1：
Marker required `*` biến mất khỏi các mục ngân hàng

ステップ2：
Trả về HTTP 201

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-046 — Giá trị mặc định và toggle của `haiten_flg`

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, kiểm tra trạng thái ban đầu của `haiten_flg`

ステップ2：
Bật `haiten_flg` ON rồi đăng ký

### 期待結果

ステップ1：
`haiten_flg` được hiển thị ở OFF (false)

ステップ2：
Trả về HTTP 201, được save vào `m_hanbaiten.haiten_flg = true`

補足：
・Mặc định là false (chưa 廃店)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-047 — Trường `biko` tùy chọn・nhập văn bản dài

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đăng ký với trường 備考 trống

ステップ2：
Nhập 1000 ký tự vào trường 備考 rồi đăng ký

### 期待結果

ステップ1：
Trả về HTTP 201 (vì là trường tùy chọn nên trống cũng OK)

ステップ2：
Được tiếp nhận bình thường (備考 là kiểu TEXT, cho phép văn bản dài)

補足：
・`biko` không giới hạn số ký tự, cột TEXT

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-017-048 — Đăng ký bình thường với toàn bộ field (happy path)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Nhập tất cả mục (required + tùy chọn) bằng giá trị hợp lệ

ステップ3：
Click button đăng ký

ステップ4：
Kiểm tra DB: `SELECT * FROM m_hanbaiten WHERE hanbaiten_code = '入力値' ORDER BY hanbaiten_id DESC LIMIT 1`

### 期待結果

ステップ1：
Màn hình đăng ký thông tin Hanbaiten được hiển thị

ステップ2：
Toàn bộ giá trị đã nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 201, hiển thị toast `登録しました。`, chuyển về `/hanbaiten`

ステップ4：
Row mới được đăng ký, `ja_id` là JA của user đang login, `created_at` ở khoảng thời gian hiện tại

補足：
・Full flow toast → chuyển list → kiểm tra DB row

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-049 — Đăng ký bao gồm thông tin ngân hàng khi `itaku_kubun`=1 (振込)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`, chọn `itaku_kubun`=1

ステップ2：
Nhập đầy đủ các mục ngân hàng (`bank_code`, `bank_name`, `bank_branch_code`, `bank_branch_name`, `yokin_shubetsu`, `koza_no`, `koza_meigi`)

ステップ3：
Click button đăng ký

ステップ4：
Kiểm tra DB: `SELECT bank_code, bank_name, koza_no FROM m_hanbaiten WHERE hanbaiten_id = ?`

### 期待結果

ステップ1：
Màn hình được hiển thị, section thông tin ngân hàng có marker required

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 201, hiển thị toast `登録しました。`

ステップ4：
Thông tin ngân hàng được save chính xác

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-050 — Đăng ký không có thông tin ngân hàng khi `itaku_kubun`=2 (日農委託)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Chọn `itaku_kubun`=2, để trống các mục ngân hàng và chỉ nhập các trường required

ステップ2：
Click button đăng ký

ステップ3：
Kiểm tra DB: `SELECT bank_code, bank_name FROM m_hanbaiten WHERE hanbaiten_id = ?`

### 期待結果

ステップ1：
Các mục ngân hàng đã trở thành tùy chọn

ステップ2：
Trả về HTTP 201, hiển thị toast `登録しました。`

ステップ3：
Các cột ngân hàng được save dưới dạng chuỗi rỗng hoặc NULL

補足：
・Verify logic required có điều kiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-051 — Lỗi trùng `hanbaiten_code`

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại Hanbaiten `hanbaiten_code`=`H001` ở ja-001

### 手順

ステップ1：
Nhập `H001` vào trường 販売店コード, nhập các trường required khác

ステップ2：
Click button đăng ký

### 期待結果

ステップ1：
Giá trị nhập được phản ánh lên màn hình

ステップ2：
Trả về HTTP 400 (`error_code: DUPLICATE_CODE`, message `販売店コード「H001」はすでに登録されています。`), hiển thị inline dưới trường 販売店コード

補足：
・Server-side thực hiện check trùng
・Bao gồm cả row đã soft delete (policy reserve mã master)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-052 — Đại diện nhập liệu bởi NICHINO_STAFF (đăng ký vào JA khác)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `hanbaiten.daiko_input`

### 手順

ステップ1：
Truy cập URL `/hanbaiten/create`

ステップ2：
Chọn ja-002 tại trường chọn JA, nhập đầy đủ các trường required

ステップ3：
Click button đăng ký

ステップ4：
Kiểm tra DB: `SELECT ja_id FROM m_hanbaiten WHERE hanbaiten_id = ?`

### 期待結果

ステップ1：
UI chọn JA được hiển thị

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 201, hiển thị toast `登録しました。`

ステップ4：
Được save với `ja_id = 2` (JA đã chỉ định)

補足：
・Phân biệt đại diện nhập liệu trên DB qua `created_by`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-053 — Verify DB persistence và phản ánh tức thời lên list

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đăng ký mới Hanbaiten

ステップ2：
Kiểm tra dòng đầu trên màn list Hanbaiten sau khi đăng ký

ステップ3：
Kiểm tra DB: `SELECT created_at, updated_at FROM m_hanbaiten WHERE hanbaiten_id = ?`

### 期待結果

ステップ1：
Trả về HTTP 201

ステップ2：
Hanbaiten vừa đăng ký được hiển thị trên màn list Hanbaiten

ステップ3：
`created_at` và `updated_at` khớp với thời điểm đăng ký (TIMESTAMPTZ, JST)

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-054 — Verify dòng INSERT audit log (thao tác CREATE)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đăng ký mới Hanbaiten

ステップ2：
Kiểm tra DB: `SELECT log_type, operation, target_table, target_id, account_id, after_value, result_status, log_datetime FROM t_log WHERE target_table='m_hanbaiten' AND operation='CREATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 201

ステップ2：
1 dòng được INSERT vào `t_log` (`log_type=1`, `operation='CREATE'`, `target_table='m_hanbaiten'`, `target_id=hanbaiten_id mới`, `account_id=test account`, `after_value` là JSON nội dung đăng ký, `result_status=1`)

補足：
・DML nghiệp vụ và audit log trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-055 — Chuyển sang màn list và hiển thị toast sau khi đăng ký

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đăng ký mới Hanbaiten

ステップ2：
Kiểm tra URL bar trình duyệt và hiển thị màn hình

### 期待結果

ステップ1：
Trả về HTTP 201

ステップ2：
URL chuyển về `/hanbaiten`, toast `登録しました。` được hiển thị tạm thời ở phía trên màn hình (tự động biến mất sau vài giây)

補足：
・Hiển thị toast được implement bằng `useNotify().created()`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-017-056 — Load dữ liệu đã có bình thường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001 thuộc JA của user

### 手順

ステップ1：
Truy cập URL `/hanbaiten/1001/edit`

ステップ2：
So sánh response của GET `/api/v1/hanbaiten/1001` với giá trị ban đầu trên form

### 期待結果

ステップ1：
Màn hình chỉnh sửa thông tin Hanbaiten được hiển thị, trả về HTTP 200

ステップ2：
Toàn bộ mục được load chính xác vào form, trường `hanbaiten_code` ở trạng thái disable

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-057 — `hanbaiten_code` không thể chỉnh sửa

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001

### 手順

ステップ1：
Truy cập URL `/hanbaiten/1001/edit`

ステップ2：
Dùng DevTools gửi PUT `/api/v1/hanbaiten/1001` bao gồm `hanbaiten_code: "NEW01"`

### 期待結果

ステップ1：
Trường 販売店コード ở trạng thái disable, không thể nhập

ステップ2：
Trả về HTTP 200 nhưng server-side bỏ qua field `hanbaiten_code` (giá trị trên DB không thay đổi)

補足：
・Server-side dùng field allow-list để bỏ qua `hanbaiten_code`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-058 — Cập nhật dữ liệu đã có bình thường (happy path)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001 thuộc JA của user

### 手順

ステップ1：
Truy cập URL `/hanbaiten/1001/edit`

ステップ2：
Thay đổi 販売店名, 電話, 住所 v.v.

ステップ3：
Click button đăng ký

ステップ4：
Kiểm tra DB: `SELECT hanbaiten_name, tel, address, updated_at FROM m_hanbaiten WHERE hanbaiten_id = 1001`

### 期待結果

ステップ1：
Màn chỉnh sửa được hiển thị, dữ liệu đã có được load

ステップ2：
Giá trị nhập được phản ánh lên màn hình

ステップ3：
Trả về HTTP 200, hiển thị toast `更新しました。`, chuyển về `/hanbaiten`

ステップ4：
Nội dung thay đổi được phản ánh trên DB, `updated_at` được cập nhật

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-059 — Thông tin ngân hàng trở thành required khi đổi `itaku_kubun` (2→1)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại Hanbaiten đã có (`itaku_kubun`=2, không có thông tin ngân hàng)

### 手順

ステップ1：
Trên màn chỉnh sửa, đổi `itaku_kubun` sang `1: 振込`

ステップ2：
Để trống thông tin ngân hàng, click button đăng ký

ステップ3：
Nhập đầy đủ thông tin ngân hàng rồi click button đăng ký lần nữa

### 期待結果

ステップ1：
Marker required `*` được hiển thị động trên các mục ngân hàng

ステップ2：
Hiển thị inline `必須項目です。` dưới các mục ngân hàng, PUT không được gọi

ステップ3：
Trả về HTTP 200, hiển thị toast `更新しました。`

補足：
・Required có điều kiện được chuyển đổi động khi đổi `itaku_kubun`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-060 — Truy cập `hanbaiten_id` không tồn tại (NOT_FOUND)

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/99999/edit` (99999 là ID không tồn tại)

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された販売店が見つかりません。`), sau khi hiển thị toast chuyển về `/hanbaiten`

補足：
・Row đã soft delete cũng được xử lý là NOT_FOUND

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-061 — Truy cập Hanbaiten thuộc JA khác (DATA_SCOPE_VIOLATION)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại Hanbaiten hanbaiten-9001 thuộc JA khác (dưới ja-099)

### 手順

ステップ1：
Truy cập trực tiếp URL `/hanbaiten/9001/edit`

ステップ2：
Dùng DevTools gửi trực tiếp PUT `/api/v1/hanbaiten/9001`

### 期待結果

ステップ1：
Trả về HTTP 404 (masking để che giấu sự tồn tại của row), chuyển về `/hanbaiten`

ステップ2：
Tương tự, trả về HTTP 404

補足：
・Layer 2 DataScope trả về NotFound thay vì Forbidden để ngăn liệt kê ID

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-062 — Optimistic lock khi chỉnh sửa đồng thời

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001 thuộc JA của user

### 手順

ステップ1：
User A mở màn chỉnh sửa hanbaiten-1001

ステップ2：
User B chỉnh sửa cùng Hanbaiten đó và save trước

ステップ3：
User A save nội dung chỉnh sửa

### 期待結果

ステップ1：
Màn chỉnh sửa được hiển thị

ステップ2：
Update của User B thành công, trả về HTTP 200

ステップ3：
Khi User A update phát hiện không nhất quán `updated_at`, trả về HTTP 409 hoặc lỗi yêu cầu reload

補足：
・Verify optimistic lock control

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-063 — Verify dòng INSERT audit log (thao tác UPDATE, before/after)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại hanbaiten-1001 thuộc JA của user

### 手順

ステップ1：
Truy cập URL `/hanbaiten/1001/edit`, thay đổi 販売店名

ステップ2：
Click button đăng ký

ステップ3：
Kiểm tra DB: `SELECT log_type, operation, target_table, target_id, before_value, after_value, result_status FROM t_log WHERE target_table='m_hanbaiten' AND target_id=1001 AND operation='UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Màn chỉnh sửa được hiển thị, dữ liệu đã có được load

ステップ2：
Trả về HTTP 200, hiển thị toast `更新しました。`

ステップ3：
1 dòng được INSERT vào `t_log` (`log_type=1`, `operation='UPDATE'`, `before_value` là JSON dữ liệu cũ, `after_value` là JSON dữ liệu mới, `result_status=1`)

補足：
・Yêu cầu audit là ghi cả before/after

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-017-064 — Xử lý lỗi khi session hết hạn (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login (tái hiện trạng thái session hết hạn)

### 手順

ステップ1：
Sau khi truy cập URL `/hanbaiten/create`, xóa `session:{sid}` khỏi Redis (hoặc đợi qua 24 giờ)

ステップ2：
Click button đăng ký

### 期待結果

ステップ1：
Màn hình vẫn được hiển thị nguyên trạng

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`), sau khi hiển thị toast chuyển về `/login?redirect=/hanbaiten/create`

補足：
・FE axios interceptor phát hiện session hết hạn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-065 — Request body không hợp lệ (BAD_REQUEST)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Dùng DevTools gửi chuỗi JSON không hợp lệ qua POST `/api/v1/hanbaiten`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

補足：
・Lỗi JSON parse phát sinh trước ValidationPipe

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-066 — Lỗi validation đồng thời nhiều trường (VALIDATION_ERROR)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Để trống 販売店コード, 販売店名 và toàn bộ thông tin ngân hàng khi `itaku_kubun`=1, click button đăng ký

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`), hiển thị đồng thời inline error dưới nhiều trường, tự động focus vào trường lỗi đầu tiên

補足：
・Hiển thị tập hợp lỗi của nhiều field
・Auto focus theo DOM order vào trường lỗi đầu tiên

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-067 — Vượt rate limit (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi POST `/api/v1/hanbaiten` liên tục ≥ 100 lần trong 1 phút

### 期待結果

ステップ1：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`), hiển thị toast + button đăng ký bị disable tạm thời

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-068 — Lỗi server nội bộ (INTERNAL_SERVER_ERROR)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tái hiện trạng thái server-side phát sinh exception (mất kết nối DB v.v.)

### 手順

ステップ1：
Đăng ký mới Hanbaiten

ステップ2：
Kiểm tra DB: `SELECT * FROM t_log WHERE log_type=3 AND result_status=2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), sau khi hiển thị toast user vẫn ở lại màn hình và có thể thử lại

ステップ2：
Error log được record (persist ngoài transaction nghiệp vụ)

補足：
・Stack trace không được lộ ra cho user

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

## ACSMS-TC-017-069 — Hành vi khi chỉ định ID không tồn tại trong URL chỉnh sửa

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/hanbaiten/0/edit` (ID không thể tồn tại)

ステップ2：
Truy cập URL `/hanbaiten/abc/edit` (ID không phải số)

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された販売店が見つかりません。`), chuyển về `/hanbaiten`

ステップ2：
Trả về HTTP 400 (path parameter không khớp kiểu), hoặc FE router guard chặn chuyển trang

補足：
・(なし)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-017-070 — Xử lý lỗi khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập các trường required trên màn đăng ký thông tin Hanbaiten

ステップ2：
Dùng DevTools chuyển Network sang offline

ステップ3：
Click button đăng ký

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Vào trạng thái offline

ステップ3：
Hiển thị toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。`, user vẫn ở lại màn hình và dữ liệu nhập được giữ lại

補足：
・Có thể gửi lại sau khi network hồi phục

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
