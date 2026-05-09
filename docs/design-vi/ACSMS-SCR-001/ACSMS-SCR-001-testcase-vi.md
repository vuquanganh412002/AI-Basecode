---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-001
screen_name: ログイン画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-08
test_level: 結合テスト
test_environment: Windows 10/11, Chrome
author: Tran Duc Tuyen
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-08 | 1.0 | Tran Duc Tuyen | Tạo mới | Nguyen Huy Dat |  |


## システム概要

Hệ thống này là hệ thống quản lý độc giả phiên bản cloud dành cho JA, cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đặt báo, quản lý dữ liệu chuyển khoản tự động, v.v.
Các chức năng chính bao gồm: đăng ký / cập nhật / tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt báo, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên / tải xuống file, quản lý thông báo hệ thống.
Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật / kiểm toán như quản lý đăng nhập của user,
ghi lịch sử đăng nhập, ghi log thao tác của user.

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống tại màn hình "ログイン画面（ACSMS-SCR-001）".
Tài liệu tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau:

- Mỗi testcase được tạo dựa trên một scenario duy nhất (single responsibility).
- Mô tả các bước với mức độ chi tiết có thể tái hiện, làm rõ test data sử dụng.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).
- Thiết lập độ ưu tiên (P0: chặn release / P1: cao / P2: trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-001 | Tài liệu thiết kế màn hình đăng nhập |
| 2 | ACSMS-SCR-001-api | Tài liệu thiết kế API màn hình đăng nhập |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Footer | 4 |
| 4 | Kiểm tra đầu vào — Màn hình đăng nhập / MFA | 12 |
| 5 | Logic nghiệp vụ — Đăng nhập (Function — Login) | 8 |
| 6 | Logic nghiệp vụ — MFA (Function — MFA) | 10 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | **合計** | **52** |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-001-001 — NICHINO_ADMIN đăng nhập — đường dẫn không yêu cầu MFA

- **観点ID**: VP-A-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account role: NICHINO_ADMIN
  - ・mfa_enable_flg = false
  - ・account_lock_flg = false
  - ・login_failure_count = 0

### 手順

ステップ1：
Mở `/login` trên browser, nhập user ID và password hợp lệ vào form

ステップ2：
Click nút đăng nhập

ステップ3：
Kiểm tra response của POST `/api/v1/auth/login` trên Network tab DevTools

ステップ4：
Kiểm tra Cookie `session_id` trên Application tab DevTools

ステップ5：
Chạy query DB:
```sql
SELECT login_result, account_id, login_id, failure_reason
FROM t_login_log
WHERE login_id = :login_id
ORDER BY login_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
Form đăng nhập hiển thị, ô ID và password rỗng, không có error

ステップ2：
Trong khi xử lý, nút đăng nhập bị vô hiệu

ステップ3：
HTTP status code: 200
Response: `data.mfa_required = false`, `data.user` chứa thông tin user
`data.user.role_code = 'NICHINO_ADMIN'`, `data.user.ja_id = null`, `data.user.kanri_shiten_id = null`
`data.user.permissions` chứa `dokusya.*`, `hanbaiten.*`, `tanka.*`, `account.*`, `oshirase.*`, `log.view`

ステップ4：
Cookie `session_id` được set với attribute HttpOnly + Secure + SameSite=Strict
Max-Age = 86400 (24 giờ)

ステップ5：
1 row, `login_result = 1` (thành công), `failure_reason` rỗng, `account_id` khớp với test account

補足：
・Sau đăng nhập thành công, toast「ログインしました。」hiển thị, redirect về màn hình chính (/dashboard)
・Session lưu vào Redis (key: session:{session_id}, TTL 24 giờ)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-002 — NICHINO_STAFF đăng nhập — Cấp quyền nhập đại diện đại lý

- **観点ID**: VP-A-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account role: NICHINO_STAFF
  - ・mfa_enable_flg = false

### 手順

ステップ1：
Đăng nhập với account NICHINO_STAFF

ステップ2：
Kiểm tra `data.user` của response

ステップ3：
Sau đăng nhập, kiểm tra mục「販売店マスタ」trên sidebar

### 期待結果

ステップ1：
HTTP status code: 200, đăng nhập thành công

ステップ2：
`data.user.role_code = 'NICHINO_STAFF'`, `data.user.ja_id = null`
`data.user.permissions` chứa `hanbaiten.create / view / update / import / daiko_input`, `file.upload`, `file.download`, `log.view`
Không chứa `dokusya.*` và `tanka.*`

ステップ3：
Mục 販売店マスタ hiển thị, các mục「JAマスタ」「単価マスタ」không hiển thị

補足：
・Khớp với matrix quyền theo role tại seeder.md §3
・Quyền nhập đại diện đại lý (`hanbaiten.daiko_input`) chỉ NICHINO_STAFF nắm giữ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-003 — CHUOKAI đăng nhập — MFA bật, kiểm tra scope tự trung ương hội

- **観点ID**: VP-A-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account role: CHUOKAI (thuộc chuokai-001)
  - ・mfa_enable_flg = true
  - ・ja_id, todofuken_code đã được set

### 手順

ステップ1：
Đăng nhập với account CHUOKAI

ステップ2：
Trên màn hình nhập MFA code, nhập 6 số OTP đúng

ステップ3：
Sau khi đăng nhập hoàn tất, kiểm tra `data.user` của response

### 期待結果

ステップ1：
HTTP status code: 200, `data.mfa_required = true`, `data.mfa_token` định dạng UUID, `data.expires_in = 300`
Chuyển sang màn hình xác thực MFA (/mfa-verify), 6 số OTP được gửi qua email

ステップ2：
HTTP status code: 200, xác thực thành công
Cookie `session_id` được set

ステップ3：
`data.user.role_code = 'CHUOKAI'`, `data.user.ja_id` đã set (không NULL)
`data.user.todofuken_code` đã set
`data.user.permissions` chứa `dokusya.*`, `hanbaiten.{create,view,update,delete,import}`, `tanka.*`, `ja.{view,update}`, `shiten.*`, `file.*`, `log.view`, `koza_furikae.export`, `haitatsuryo.export`, `report.*`

補足：
・CHUOKAI nắm giữ scope đối với JA thuộc tự trung ương hội quản lý
・Khớp với matrix quyền theo role tại seeder.md §3

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-004 — JA_HONTEN đăng nhập — Kiểm tra scope tự JA

- **観点ID**: VP-A-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account role: JA_HONTEN (thuộc ja-001)
  - ・mfa_enable_flg = false
  - ・ja_id = 1, kanri_shiten_id = null, todofuken_code = '13'

### 手順

ステップ1：
Đăng nhập với account JA_HONTEN

ステップ2：
Kiểm tra `data.user` của response

### 期待結果

ステップ1：
HTTP status code: 200, đăng nhập thành công

ステップ2：
`data.user.role_code = 'JA_HONTEN'`, `data.user.ja_id = 1`, `data.user.kanri_shiten_id = null`
`data.user.todofuken_code = '13'`
`data.user.permissions` giống 29 quyền của CHUOKAI

補足：
・JA_HONTEN nắm giữ scope đối với độc giả / đại lý / chi nhánh thuộc tự JA
・JA Master nắm giữ `ja.{view,update}` (chỉ một số mục)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-005 — JA_KANRI_SHITEN đăng nhập — Kiểm tra scope tự chi nhánh quản lý

- **観点ID**: VP-A-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・mfa_enable_flg = true
  - ・ja_id = 1, kanri_shiten_id = 1

### 手順

ステップ1：
Đăng nhập với account JA_KANRI_SHITEN

ステップ2：
Trên màn hình nhập MFA code, nhập 6 số OTP đúng

ステップ3：
Kiểm tra `data.user` của response

### 期待結果

ステップ1：
`data.mfa_required = true`, chuyển sang màn hình MFA

ステップ2：
HTTP status code: 200, xác thực thành công

ステップ3：
`data.user.role_code = 'JA_KANRI_SHITEN'`, `data.user.ja_id = 1`, `data.user.kanri_shiten_id = 1`
`data.user.permissions` là 27 quyền của JA_HONTEN trừ `ja.view`, `ja.update`
Không chứa `ja.*`

補足：
・JA_KANRI_SHITEN nắm giữ scope đối với độc giả thuộc tự chi nhánh quản lý
・Không thể truy cập JA Master

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-001-006 — Layout tổng thể màn hình đăng nhập khớp với design spec

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Mở `/login`

ステップ2：
So sánh màn hình với design spec (screen-design.md / index.html) song song

ステップ3：
Kiểm tra bố cục: tiêu đề「日本農業新聞」, phụ đề「クラウド版購読者管理システム」, card form đăng nhập, card thông báo, card thông tin liên hệ

### 期待結果

ステップ1：
Màn hình đăng nhập hiển thị căn giữa

ステップ2：
Màu nền, font, padding/margin, màu button, style ô input đều khớp

ステップ3：
Card width max-w-[400px], khoảng cách space-y-6 giữa các card, tất cả căn giữa

補足：
・design tokens (`design-tokens.ts`) được áp dụng (không có hardcoded color)
・Component AuthLayout được sử dụng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-007 — Layout tổng thể màn hình xác thực MFA khớp với design spec

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Sau đăng nhập với account mfa_enable_flg = true, đã chuyển sang màn hình MFA

### 手順

ステップ1：
So sánh design spec với màn hình MFA

ステップ2：
Kiểm tra: icon xác thực, tiêu đề「2段階認証」, text mô tả, ô nhập 6 số OTP, nút xác thực, link gửi lại, link quay lại

ステップ3：
Kiểm tra format hiển thị countdown

### 期待結果

ステップ1：
Màn hình MFA hiển thị, design tokens được áp dụng

ステップ2：
Icon xác thực (enhanced_encryption), tiêu đề「2段階認証」, text mô tả「セキュリティ保護のため、登録済みのメールに送信された6桁の認証コードを入力してください。」hiển thị
Ô nhập 6 số OTP, nút「認証」(trạng thái ban đầu vô hiệu), link「コードを再送する」, link「ログイン画面に戻る」

ステップ3：
Có hiệu lực hiển thị format「mm:ss」, giảm 1 giây từ 5:00

補足：
・Sử dụng component `MfaInput`, hiển thị 6 số trong các ô độc lập từng số

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-008 — Hoạt động responsive — breakpoint PC / Tablet / Mobile

- **観点ID**: VP-E-02
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập

### 手順

ステップ1：
Đặt window size 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Form đăng nhập căn giữa, card width 400px

ステップ2：
Layout được giữ nguyên

ステップ3：
Card width fit theo bề ngang màn hình, không có scroll ngang

補足：
・Không bị vỡ layout ở cả 3 breakpoint, không phát sinh scroll ngang
・Tất cả phần tử form đều có thể thao tác được

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-009 — Hiển thị phần tử form — ô input / button đúng design spec

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập

### 手順

ステップ1：
Kiểm tra placeholder, prefix icon, maxlength của ô user ID

ステップ2：
Kiểm tra placeholder, prefix icon, hành vi mask, maxlength của ô password

ステップ3：
Kiểm tra size, color, label của nút đăng nhập

ステップ4：
Kiểm tra link「パスワードを忘れた場合」

### 期待結果

ステップ1：
Placeholder「IDを入力してください」, icon person, maxlength=20

ステップ2：
Placeholder「パスワードを入力してください」, icon lock, hiển thị mask ●●●● khi nhập, maxlength=32

ステップ3：
Button màu chính (xanh), label「ログイン」, size=large, hiển thị block

ステップ4：
Link「パスワードを忘れた場合」, có thể chuyển sang `/forgot-password`

補足：
・Tất cả phần tử form khớp hoàn toàn với design spec
・autocomplete=username / autocomplete=current-password được set (liên kết password manager)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-010 — Thứ tự Tab và thao tác bàn phím (Tab / Enter)

- **観点ID**: VP-E-03
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập, focus ở body

### 手順

ステップ1：
Nhấn liên tục phím Tab, kiểm tra tiến trình focus

ステップ2：
Sau khi nhập user ID và password hợp lệ, nhấn phím Enter

ステップ3：
Trên màn hình MFA, kiểm tra ô nhập từ ô 1 đến ô 6, nhấn Backspace ở ô cuối

### 期待結果

ステップ1：
Thứ tự Tab: User ID → Password → Nút đăng nhập → パスワードを忘れた場合 → 利用規約

ステップ2：
Xử lý đăng nhập được thực hiện (form submit)

ステップ3：
Từ ô 1 tự động chuyển focus sang ô tiếp theo, Backspace quay lại ô trước

補足：
・Thứ tự Tab theo đúng design spec, có thể thao tác toàn bộ bằng bàn phím
・Khác với màn hình đăng nhập, màn hình MFA không tự động submit khi Enter (cần click nút「認証」rõ ràng)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-011 — Độ tin cậy thao tác button (double-click / nhấn liên tục)

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đã nhập user ID / password hợp lệ trên màn hình đăng nhập

### 手順

ステップ1：
Double-click nút đăng nhập (trong vòng 200ms)

ステップ2：
Nhấn liên tục nút đăng nhập trong 5 giây

ステップ3：
Kiểm tra `t_login_log` trên DB:
```sql
SELECT COUNT(*) FROM t_login_log
WHERE login_id = :login_id
  AND login_datetime > NOW() - INTERVAL '10 seconds';
```

### 期待結果

ステップ1：
Lần 1 bắt đầu gửi, lần 2 button bị vô hiệu nên bỏ qua

ステップ2：
Trong khi đang xử lý, button bị vô hiệu, không có thử đăng nhập trùng

ステップ3：
Chỉ 1 row (không trùng)

補足：
・Không phát sinh gửi trùng
・Trong khi đang xử lý, button hiển thị ở trạng thái loading

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Phòng chống gửi trùng — Vùng critical (thử đăng nhập liên tục là trigger kích hoạt khóa).

---

# カテゴリ 3: Header & Footer

## ACSMS-TC-001-012 — Hiển thị tiêu đề + phụ đề

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập

### 手順

ステップ1：
Kiểm tra tiêu đề / phụ đề của phần header

### 期待結果

ステップ1：
「日本農業新聞」(h1, font đậm, text-2xl), bên dưới là「クラウド版購読者管理システム」(text-sm, text-text-secondary) hiển thị

補足：
・Chuỗi tiêu đề đúng theo spec literal

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-013 — Hiển thị danh sách thông báo (public API)

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test data có sẵn: chuẩn bị 3 record trong `t_oshirase` với `publish_location=1`, `status=2` (công khai), `publish_start_date <= NOW()`, `publish_end_date IS NULL OR >= NOW()`, `ja_id IS NULL`

### 手順

ステップ1：
Mở `/login`, kiểm tra response của GET `/api/v1/oshirase/public?publish_location=1&limit=10`

ステップ2：
Kiểm tra item hiển thị trên card thông báo

ステップ3：
Đặt test data về 0 record và reload page

### 期待結果

ステップ1：
HTTP status code: 200, array `data` chứa 3 record, sắp xếp giảm dần theo `publish_start_date`

ステップ2：
Mỗi item: ngày (format YYYY.MM.DD) + tiêu đề
Hiển thị tối đa 10 item

ステップ3：
Card thông báo không hiển thị (NoticeList không render gì khi array rỗng)

補足：
・Public API (không cần auth), điều kiện hiển thị màn hình đăng nhập: publish_location=1 (cho màn hình đăng nhập), status=2 (công khai), ja_id IS NULL (cho toàn bộ)
・FE chuyển đổi format từ `2026-04-10` → `2026.04.10` qua `replaceAll('-', '.')`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-014 — Hiển thị link điều khoản sử dụng + bản quyền

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập

### 手順

ステップ1：
Kiểm tra text bên dưới nút đăng nhập

ステップ2：
Click link「利用規約」

### 期待結果

ステップ1：
「ログインすることで利用規約に同意したものとみなされます。」hiển thị
Phần「利用規約」hiển thị ở dạng link màu chính

ステップ2：
File PDF điều khoản sử dụng mở ở tab mới (hoặc chuyển sang trang tương ứng)

補足：
・Chuỗi link đúng theo spec literal

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-015 — Hiển thị card thông tin liên hệ

- **観点ID**: VP-E-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang ở màn hình đăng nhập

### 手順

ステップ1：
Kiểm tra card thông tin liên hệ ở phía dưới màn hình

### 期待結果

ステップ1：
Icon headset_mic, heading「お問い合わせ先」, tên tổ chức「日本農業新聞 協同事業局業務管理部」, số điện thoại「03-6281-5808」, giờ làm việc「（平日 9:30〜17:30）」hiển thị

補足：
・Toàn bộ text đúng theo spec literal
・Số điện thoại hiển thị in đậm để nhấn mạnh

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Kiểm tra đầu vào — Màn hình đăng nhập / MFA

## ACSMS-TC-001-016 — User ID — Kiểm tra bắt buộc (rỗng + ký tự khoảng trắng)

- **観点ID**: VP-B-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, password đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống User ID, nhấn nút đăng nhập

ステップ2：
Nhập 3 ký tự space half-width → nhấn nút đăng nhập

ステップ3：
Nhập 3 ký tự space full-width → nhấn nút đăng nhập

### 期待結果

ステップ1：
Hiển thị「ユーザーIDを入力してください。」ngay dưới mục
Phía FE chặn gửi (không gọi API)

ステップ2：
Phía FE `validateClient` loại bỏ space đầu cuối qua `trim()`, được nhận diện là rỗng
Hiển thị「ユーザーIDを入力してください。」

ステップ3：
Space full-width không phải đối tượng `trim()`, sau khi qua FE thì BE nhận request
Phía BE `@Matches(/^[\x21-\x7E]+$/)` không khớp → HTTP status code: 400
error_code: BAD_REQUEST hoặc VALIDATION_ERROR
errors[] chứa { field: "login_id", message: "ユーザーIDは半角文字のみで入力してください。" }

補足：
・Rỗng / chỉ space half-width → lỗi bắt buộc phía FE, không gọi API
・Chỉ space full-width → qua FE, BE check half-width error
・Tương ứng ACSMS-MSG-001-001

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-017 — User ID — Giới hạn tối đa 20 ký tự (giá trị biên)

- **観点ID**: VP-B-02
- **種類**: Boundary (境界)
- **前提条件**:
  - ・Màn hình đăng nhập

### 手順

ステップ1：
Nhập 20 ký tự (ví dụ: `abcdefghij1234567890`) vào User ID → đăng nhập

ステップ2：
Thử nhập ký tự thứ 21

ステップ3：
Paste「123456789012345678901234」(24 ký tự) vào ô User ID

ステップ4：
Trên DevTools, gửi request axios trực tiếp với `login_id` 25 ký tự

### 期待結果

ステップ1：
Tiếp nhận bình thường, xử lý xác thực được thực hiện (kết quả xác thực sau đó tách riêng)

ステップ2：
input maxlength chặn ký tự thứ 21

ステップ3：
Cắt đến ký tự thứ 20, request được gửi với 20 ký tự

ステップ4：
Phía BE `@MaxLength(20)` từ chối
HTTP status code: 400
errors[] chứa { field: "login_id", message: "ユーザーIDは20文字以内で入力してください。" }

補足：
・Giới hạn 20 ký tự được enforce kép bằng input maxlength và validation BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-018 — User ID — Chỉ tiếp nhận half-width (từ chối full-width)

- **観点ID**: VP-B-04
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, password đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập chữ-số half-width `admin01` → đăng nhập

ステップ2：
Nhập chữ-số full-width `ａｄｍｉｎ０１` → đăng nhập

ステップ3：
Nhập Hiragana `あいう` → đăng nhập

ステップ4：
Nhập ký hiệu half-width `admin@01` → đăng nhập

### 期待結果

ステップ1：
Tiếp nhận bình thường, BE thực hiện xử lý xác thực

ステップ2：
HTTP status code: 400
errors[] chứa { field: "login_id", message: "ユーザーIDは半角文字のみで入力してください。" }

ステップ3：
HTTP status code: 400
errors[] chứa { field: "login_id", message: "ユーザーIDは半角文字のみで入力してください。" }

ステップ4：
Tiếp nhận bình thường (ký hiệu half-width nằm trong khoảng `\x21-\x7E` nên được phép)

補足：
・`@Matches(/^[\x21-\x7E]+$/)` chỉ cho phép half-width (chữ cái / số / ký hiệu)
・Full-width / Hiragana / Katakana / emoji bị từ chối

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-019 — Password — Kiểm tra bắt buộc (rỗng)

- **観点ID**: VP-B-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, User ID đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống password, nhấn nút đăng nhập

ステップ2：
Nhập 1 ký tự space half-width vào ô password → đăng nhập

### 期待結果

ステップ1：
Hiển thị「パスワードを入力してください。」ngay dưới mục
Phía FE chặn gửi

ステップ2：
Phía FE `validateClient` cho qua vì `form.password` không rỗng
Phía BE `@MinLength(8)` không khớp → HTTP status code: 400
errors[] chứa { field: "password", message: "パスワードは8文字以上で入力してください。" }

補足：
・Input rỗng → lỗi bắt buộc phía FE, không gọi API
・Tương ứng ACSMS-MSG-001-002
・Ô password không thực hiện `trim()` (vì space đầu cuối có thể là ký tự password thực)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-020 — Password — Giới hạn 8〜32 ký tự (giá trị biên)

- **観点ID**: VP-B-02
- **種類**: Boundary (境界)
- **前提条件**:
  - ・Màn hình đăng nhập, User ID đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập 8 ký tự (ví dụ: `Admin@01`) vào password → đăng nhập

ステップ2：
Nhập 7 ký tự (ví dụ: `Admin@1`) vào password → đăng nhập

ステップ3：
Nhập 32 ký tự vào password → đăng nhập

ステップ4：
Thử nhập ký tự thứ 33 vào password

### 期待結果

ステップ1：
Tiếp nhận bình thường (giá trị nhỏ nhất), xử lý xác thực được thực hiện

ステップ2：
HTTP status code: 400
errors[] chứa { field: "password", message: "パスワードは8文字以上で入力してください。" }

ステップ3：
Tiếp nhận bình thường (giá trị lớn nhất), xử lý xác thực được thực hiện

ステップ4：
input maxlength chặn ký tự thứ 33

補足：
・Giới hạn 8〜32 ký tự, enforce bằng @MinLength(8) và @MaxLength(32)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-021 — Password — Chỉ tiếp nhận half-width

- **観点ID**: VP-B-04
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, User ID đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập chữ-số-ký hiệu half-width `Admin@1234` → đăng nhập

ステップ2：
Nhập chữ-số full-width `Ａｄｍｉｎ＠１２３４` → đăng nhập

ステップ3：
Nhập ký tự tiếng Nhật `パスワード１２３` → đăng nhập

### 期待結果

ステップ1：
Tiếp nhận bình thường, xử lý xác thực được thực hiện

ステップ2：
HTTP status code: 400
errors[] chứa { field: "password", message: "パスワードは半角文字のみで入力してください。" }

ステップ3：
HTTP status code: 400
errors[] chứa { field: "password", message: "パスワードは半角文字のみで入力してください。" }

補足：
・@Matches(/^[\x21-\x7E]+$/) chỉ cho phép half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-022 — Password — Kiểm tra hiển thị mask

- **観点ID**: VP-A-06
- **種類**: Normal (正常)
- **前提条件**:
  - ・Màn hình đăng nhập

### 手順

ステップ1：
Nhập `Admin@1234` vào ô password

ステップ2：
Quan sát nội dung hiển thị bằng mắt

ステップ3：
Kiểm tra attribute type của DOM element trên DevTools

### 期待結果

ステップ1：
Giá trị input được giữ trong state nội bộ

ステップ2：
Hiển thị trên màn hình là ●●●●●●●●●● (mask)

ステップ3：
Attribute type="password" được set

補足：
・Sử dụng component ant-design `<a-input-password>`
・Password hiển thị mask để phòng người thứ 3 nhìn lén qua vai

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-023 — Mã xác thực — Kiểm tra bắt buộc (rỗng)

- **観点ID**: VP-B-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Đã chuyển sang màn hình MFA (đã có mfa_token)

### 手順

ステップ1：
Để trống ô nhập mã xác thực, kiểm tra nút「認証」

ステップ2：
Chỉ nhập 1〜2 số, kiểm tra nút「認証」

### 期待結果

ステップ1：
Nút xác thực ở trạng thái vô hiệu (do otp.length !== 6), không thể click

ステップ2：
Nút xác thực vẫn vô hiệu, không gọi API

補足：
・Phía FE kiểm soát qua `:disabled="otp.length !== 6 || expired"`
・Không hiển thị message check bắt buộc (vô hiệu nút là UX thay thế)
・ACSMS-MSG-001-003 chuẩn bị làm message ở tầng DTO (chỉ hiển thị khi gọi API trực tiếp)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-024 — Mã xác thực — Cố định 6 chữ số / chỉ số

- **観点ID**: VP-B-03
- **種類**: Boundary (境界)
- **前提条件**:
  - ・Đã chuyển sang màn hình MFA

### 手順

ステップ1：
Nhập 6 chữ số `123456`

ステップ2：
Thử nhập chữ cái `abc123`

ステップ3：
Thử nhập số full-width `１２３４５６`

ステップ4：
Trên DevTools Console chạy `fetch('/api/v1/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ mfa_token: '...', otp_code: '12345' }), headers: { 'Content-Type': 'application/json' } })`

### 期待結果

ステップ1：
Tiếp nhận bình thường, nút xác thực được kích hoạt

ステップ2：
input từ chối ký tự không phải số, không thể nhập chữ cái

ステップ3：
input từ chối số full-width, không thể nhập

ステップ4：
HTTP status code: 400
errors[] chứa { field: "otp_code", message: "otp_code must be 6 digits" }

補足：
・Component FE `MfaInput` chỉ tiếp nhận số (0-9)
・BE `@Length(6, 6)` + `@Matches(/^\d{6}$/)` enforce cố định 6 chữ số + chỉ số

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

「otp_code must be 6 digits」là message tiếng Anh (default implementation). Nếu cần chuyển sang tiếng Nhật, cập nhật message tham số 2 của @Matches trong DTO.

## ACSMS-TC-001-025 — Mã xác thực — Vô hiệu nút xác thực khi dưới 6 chữ số

- **観点ID**: VP-B-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đã chuyển sang màn hình MFA, còn hiệu lực

### 手順

ステップ1：
Nhập 1 chữ số → kiểm tra trạng thái nút xác thực

ステップ2：
Nhập 5 chữ số → kiểm tra trạng thái nút xác thực

ステップ3：
Nhập đủ 6 chữ số → kiểm tra trạng thái nút xác thực

ステップ4：
Xóa chữ số thứ 6 → kiểm tra trạng thái nút xác thực

### 期待結果

ステップ1：
Nút xác thực ở trạng thái vô hiệu, không thể click

ステップ2：
Nút xác thực vẫn ở trạng thái vô hiệu

ステップ3：
Nút xác thực được kích hoạt, có thể click

ステップ4：
Nút xác thực vô hiệu trở lại

補足：
・Kiểm soát qua `:disabled="otp.length !== 6 || expired"`
・Không tự submit (cần click nút xác thực rõ ràng)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-026 — Mã xác thực — Xử lý paste 6 chữ số

- **観点ID**: VP-B-09
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đã chuyển sang màn hình MFA

### 手順

ステップ1：
Đặt focus vào ô nhập đầu tiên

ステップ2：
Paste chuỗi 6 chữ số `123456` từ clipboard

ステップ3：
Paste chuỗi 8 chữ số `12345678`

ステップ4：
Paste chuỗi mix chữ-số `abc123`

### 期待結果

ステップ1：
Ô nhập số 1 ở trạng thái focus

ステップ2：
Tự động phân chia 1 số vào mỗi ô trong 6 ô, nút xác thực được kích hoạt

ステップ3：
Chỉ tiếp nhận 6 chữ số đầu, từ chữ số thứ 7 bị bỏ

ステップ4：
Chữ cái bị từ chối, chỉ tiếp nhận phần số

補足：
・Component `MfaInput` xử lý paste 6 chữ số
・Use case OTP được paste trực tiếp từ email rất phổ biến nên là chức năng bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-027 — User ID / password — Xử lý an toàn SQL injection / XSS

- **観点ID**: VP-A-10
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập

### 手順

ステップ1：
Nhập `admin' OR '1'='1` vào User ID, password giá trị bất kỳ → đăng nhập

ステップ2：
Nhập `admin'; DROP TABLE m_account; --` vào User ID, password giá trị bất kỳ → đăng nhập

ステップ3：
Nhập `<script>alert(1)</script>` vào User ID → đăng nhập

ステップ4：
Kiểm tra bảng `m_account` trên DB không bị xóa

### 期待結果

ステップ1：
HTTP status code: 401 (INVALID_CREDENTIALS) hoặc 400 (vi phạm half-width)
Được xử lý là chuỗi literal, xác thực thất bại
Row không hợp lệ không được xác thực

ステップ2：
HTTP status code: 401 hoặc 400
Bảng `m_account` không bị xóa (parameterized query phòng thủ)

ステップ3：
Script không execute, được xử lý là chuỗi literal
(Tuy nhiên `<` `>` nằm trong khoảng half-width nên được tiếp nhận, qua `@Matches(/^[\x21-\x7E]+$/)`)

ステップ4：
Bảng `m_account` tồn tại bình thường, record test account vẫn còn

補足：
・SQL injection không phát huy do parameterized query của TypeORM
・Stored XSS không phát huy do Vue auto-escape
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

Critical về security — Nếu fail thì xử lý như incident.

---

# カテゴリ 5: Logic nghiệp vụ — Đăng nhập (Function — Login)

## ACSMS-TC-001-028 — Hiển thị ban đầu — Hiển thị form khi chưa đăng nhập

- **観点ID**: VP-C-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Cookie `session_id` chưa được set (trạng thái logout)

### 手順

ステップ1：
Mở `/login` trên browser

ステップ2：
Kiểm tra trạng thái ban đầu của màn hình

### 期待結果

ステップ1：
Form đăng nhập hiển thị

ステップ2：
Ô User ID / password rỗng, không có error message
Card thông báo được load song song (GET `/api/v1/oshirase/public`)

補足：
・Lấy thông báo là async, không block hiển thị form
・FE `onMounted` gọi `fetchPublicOshirase`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-029 — Hiển thị ban đầu — Redirect khi đã đăng nhập

- **観点ID**: VP-C-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đang giữ session cookie hợp lệ (đã đăng nhập)
  - ・User của Pinia auth store đã được set

### 手順

ステップ1：
Truy cập `/login` trên browser

ステップ2：
Kiểm tra chuyển trang màn hình

### 期待結果

ステップ1：
Router guard nhận diện đã đăng nhập

ステップ2：
Tự động redirect về `/dashboard`
Form đăng nhập không hiển thị

補足：
・Trong router beforeEach kiểm tra `authStore.isAuthenticated`
・Phòng thao tác đăng nhập vô ích khi user đã đăng nhập truy cập lại màn hình đăng nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-030 — Đăng nhập thành công (không MFA) — Cookie + log kiểm toán

- **観点ID**: VP-C-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account mfa_enable_flg = false
  - ・User ID / password đúng

### 手順

ステップ1：
Nhập giá trị hợp lệ vào form đăng nhập → đăng nhập

ステップ2：
Kiểm tra `m_account` trên DB:
```sql
SELECT login_failure_count, last_login_at
FROM m_account
WHERE login_id = :login_id;
```

ステップ3：
Kiểm tra `t_login_log` trên DB:
```sql
SELECT login_result, account_id, login_id, failure_reason
FROM t_login_log
WHERE login_id = :login_id
ORDER BY login_datetime DESC
LIMIT 1;
```

ステップ4：
Kiểm tra Cookie browser và Redis session

### 期待結果

ステップ1：
HTTP status code: 200, `data.mfa_required = false`, trả về `data.user`
Toast「ログインしました。」hiển thị, redirect về `/dashboard`

ステップ2：
`login_failure_count = 0`, `last_login_at = thời điểm hiện tại`

ステップ3：
1 row, `login_result = 1` (thành công), `failure_reason` rỗng

ステップ4：
Cookie `session_id` được set với attribute HttpOnly + Secure (production) + SameSite=Strict + signed
Redis lưu session với key `session:{session_id}` TTL 24 giờ

補足：
・Main DML (cập nhật last_login_at) + ghi log đăng nhập thành công thực thi bình thường
・State user của Pinia auth store được cập nhật
・useCodesStore().loadAll() khởi tạo cache mã master

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-031 — Đăng nhập thất bại — Sai thông tin xác thực (INVALID_CREDENTIALS)

- **観点ID**: VP-A-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Test account (account_lock_flg = false)
  - ・login_failure_count = 0

### 手順

ステップ1：
Đăng nhập với User ID đúng + password sai

ステップ2：
Đăng nhập với User ID không tồn tại

ステップ3：
Kiểm tra `m_account.login_failure_count` trên DB

ステップ4：
Kiểm tra `t_login_log` trên DB

### 期待結果

ステップ1：
HTTP status code: 401
error_code: INVALID_CREDENTIALS
message:「ユーザーIDまたはパスワードが正しくありません。」
Toast hiển thị, vẫn ở màn hình đăng nhập

ステップ2：
HTTP status code: 401
error_code: INVALID_CREDENTIALS (không phân biệt account không tồn tại và xác thực thất bại)
Vì lý do security trả về cùng message

ステップ3：
ステップ1の場合：`login_failure_count = 1` (tăng)
ステップ2の場合：account không tồn tại nên không tăng

ステップ4：
ステップ1：`login_result = 2`, `failure_reason = 'invalid_password'`, `account_id` đã set
ステップ2：`login_result = 2`, `failure_reason = 'account_not_found'`, `account_id = NULL`

補足：
・Không phân biệt account không tồn tại và xác thực thất bại (phòng tấn công liệt kê account)
・Tương ứng ACSMS-MSG-001-005
・Log thất bại đăng nhập được ghi cả khi xác thực thất bại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-032 — Đăng nhập thất bại — Khóa khi thất bại liên tục 5 lần

- **観点ID**: VP-A-09
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Test account (account_lock_flg = false)
  - ・login_failure_count = 0

### 手順

ステップ1：
Thử đăng nhập với password sai từ lần 1 đến lần 4 (liên tục 4 lần)

ステップ2：
Thử đăng nhập với password sai lần thứ 5

ステップ3：
Thử đăng nhập lần thứ 6 (kể cả với password đúng)

ステップ4：
Kiểm tra `m_account` trên DB:
```sql
SELECT login_failure_count, account_lock_flg, account_lock_at
FROM m_account
WHERE login_id = :login_id;
```

### 期待結果

ステップ1：
Mỗi lần HTTP status code: 401, INVALID_CREDENTIALS
`login_failure_count` tăng từ 1 → 4

ステップ2：
HTTP status code: 401, **INVALID_CREDENTIALS** (response của lần 5 vẫn là INVALID_CREDENTIALS)
Phía DB: `login_failure_count = 5`, `account_lock_flg = true`, `account_lock_at = NOW()` được set trong cùng query

ステップ3：
HTTP status code: 401, **ACCOUNT_LOCKED**
message:「アカウントがロックされています。管理者へお問い合わせください。」

ステップ4：
`login_failure_count = 5`, `account_lock_flg = true`, `account_lock_at` là thời điểm thử lần 5

補足：
・Implementation: `UPDATE m_account SET login_failure_count = login_failure_count + 1, account_lock_flg = CASE WHEN login_failure_count + 1 >= 5 THEN true ELSE account_lock_flg END, account_lock_at = CASE WHEN login_failure_count + 1 >= 5 THEN NOW() ELSE account_lock_at END`
・Thực thi bằng query đơn để tránh race condition khi request đồng thời
・Response của lần 5 vẫn là INVALID_CREDENTIALS (theo spec), từ lần 6 trở đi mới phát ACCOUNT_LOCKED

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — Đảm bảo implementation của ngưỡng khóa và timing khóa đúng theo spec.

## ACSMS-TC-001-033 — Đăng nhập — Account ở trạng thái khóa (ACCOUNT_LOCKED)

- **観点ID**: VP-A-09
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Test account `account_lock_flg = true`, `login_failure_count = 5`
  - ・Password đúng

### 手順

ステップ1：
Thử đăng nhập với password đúng

ステップ2：
Kiểm tra `m_account` trên DB

ステップ3：
Kiểm tra `t_login_log` trên DB

### 期待結果

ステップ1：
HTTP status code: 401
error_code: ACCOUNT_LOCKED
message:「アカウントがロックされています。管理者へお問い合わせください。」
Toast hiển thị, vẫn ở màn hình đăng nhập

ステップ2：
`account_lock_flg = true` vẫn giữ, từ chối ở bước check khóa trước bcrypt.compare

ステップ3：
`login_result = 2`, `failure_reason = 'account_locked'`

補足：
・Check khóa thực thi trước bcrypt.compare (phòng timing attack)
・Không tự động unlock, chỉ unlock thủ công qua màn hình chỉnh sửa account của admin
・Reset password (SCR-012) không unlock khóa
・Tương ứng ACSMS-MSG-001-013

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-034 — Đăng nhập thành công — Reset failure count + cập nhật last_login_at

- **観点ID**: VP-C-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account `login_failure_count = 3`, `account_lock_flg = false`
  - ・Password đúng

### 手順

ステップ1：
Đăng nhập với thông tin xác thực đúng

ステップ2：
Kiểm tra `m_account` trên DB:
```sql
SELECT login_failure_count, last_login_at
FROM m_account
WHERE login_id = :login_id;
```

### 期待結果

ステップ1：
HTTP status code: 200, đăng nhập thành công

ステップ2：
`login_failure_count = 0` (reset hoàn tất)
`last_login_at = thời điểm hiện tại`

補足：
・Implementation: `UPDATE m_account SET login_failure_count = 0, last_login_at = NOW()`
・Bộ đếm thất bại liên tục bắt buộc reset khi thành công (spec §4.3)
・Ngưỡng khóa là số lần thất bại "liên tục"

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-035 — Đăng nhập — Từ chối account đã xóa

- **観点ID**: VP-A-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Test account `deleted_at = '2026-01-01 00:00:00'` (đã soft delete)
  - ・Password đúng

### 手順

ステップ1：
Đăng nhập với account đã soft delete

ステップ2：
Kiểm tra `t_login_log` trên DB

### 期待結果

ステップ1：
HTTP status code: 401
error_code: INVALID_CREDENTIALS
message:「ユーザーIDまたはパスワードが正しくありません。」
(Ẩn sự tồn tại của account đã xóa, response giống không tồn tại)

ステップ2：
`login_result = 2`, `failure_reason = 'account_not_found'`, `account_id = NULL`

補足：
・Implementation: `accountRepo.findOne({ where: { loginId: dto.login_id, deletedAt: IsNull() } })`
・Account đã soft delete bị loại khỏi findOne result do điều kiện `deletedAt IS NULL`
・Không thể phân biệt với account không tồn tại (phòng rò rỉ thông tin)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 6: Logic nghiệp vụ — MFA (Function — MFA)

## ACSMS-TC-001-036 — MFA — Phát hành OTP + gửi mail

- **観点ID**: VP-D-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Test account `mfa_enable_flg = true`, đã set email hợp lệ

### 手順

ステップ1：
Đăng nhập với thông tin xác thực đúng

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_mfa_otp` trên DB:
```sql
SELECT otp_id, account_id, otp_type, expired_at,
       verify_attempt_count, resend_count, used_flg
FROM t_mfa_otp
WHERE account_id = :account_id
ORDER BY created_at DESC
LIMIT 1;
```

ステップ4：
Kiểm tra mail nhận được

### 期待結果

ステップ1：
HTTP status code: 200

ステップ2：
`data.mfa_required = true`, `data.mfa_token` định dạng UUID, `data.expires_in = 300`
Chuyển sang màn hình MFA (/mfa-verify?mfa_token=...)

ステップ3：
1 row, `otp_type = 1` (MFA), `expired_at = NOW() + 5 phút`, `verify_attempt_count = 0`, `resend_count = 0`, `used_flg = false`, `otp_code_hash` là bcrypt hash

ステップ4：
Mail tiêu đề「【agrinews】ログイン認証コード」được nhận, mã 6 chữ số có trong nội dung

補足：
・OTP code được tạo qua `randomInt(0, 1_000_000).padStart(6, '0')`
・Bcrypt hash hóa và lưu DB (không lưu literal)
・Gửi mail là async, dù gửi thất bại thì OTP vẫn được phát hành (có thể gửi lại)
・OTP chưa sử dụng hiện có (cùng account, otp_type=1) bị invalidate trước

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-037 — MFA — Xác thực thành công → màn hình chính

- **観点ID**: VP-D-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Đã chuyển sang màn hình MFA, đang giữ mfa_token hợp lệ
  - ・Đã lấy 6 số OTP từ mail

### 手順

ステップ1：
Nhập 6 số OTP → click nút xác thực

ステップ2：
Kiểm tra response và Cookie browser

ステップ3：
Kiểm tra `t_mfa_otp` và `t_login_log` trên DB

### 期待結果

ステップ1：
HTTP status code: 200, trả về `data.user`
Toast「ログインしました。」hiển thị, redirect về `/dashboard`

ステップ2：
Cookie `session_id` được set, lưu session vào Redis
Array permissions theo role trong `data.user`

ステップ3：
`t_mfa_otp.used_flg = true` được cập nhật (OTP đã sử dụng)
Thêm record vào `t_login_log` với `login_result = 1`, `failure_reason` rỗng

補足：
・Implementation: bcrypt.compare(otpCode, otp.otpCodeHash) để đối chiếu
・Sau thành công, xóa entry tương ứng khỏi mfaTokenToOtpId Map
・Countdown timer được dừng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-038 — MFA — Mã xác thực sai → tăng số lần thử

- **観点ID**: VP-D-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, mfa_token hợp lệ, `verify_attempt_count = 0`

### 手順

ステップ1：
Nhập OTP sai 6 số `000000` → click nút xác thực

ステップ2：
Kiểm tra response và DB:
```sql
SELECT verify_attempt_count, used_flg
FROM t_mfa_otp
WHERE otp_id = :otp_id;
```

ステップ3：
Thử xác thực lại với OTP đúng

### 期待結果

ステップ1：
HTTP status code: 401
error_code: INVALID_OTP
message:「認証コードが正しくありません。」
Toast hiển thị, vẫn ở màn hình MFA

ステップ2：
`verify_attempt_count = 1`, `used_flg = false` (OTP vẫn có thể sử dụng)

ステップ3：
Xác thực thành công với OTP đúng (trong số lần thử còn lại)

補足：
・Tăng số lần thử thêm 1 với 1 lần sai
・OTP có thể thử tối đa 5 lần, vượt quá 5 lần thì bị invalidate
・Tương ứng ACSMS-MSG-001-006

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-039 — MFA — Thất bại 5 lần → OTP_MAX_ATTEMPTS + invalidate OTP

- **観点ID**: VP-A-09
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, mfa_token hợp lệ, `verify_attempt_count = 0`

### 手順

ステップ1：
Nhập OTP sai từ lần 1 đến lần 4 → click nút xác thực

ステップ2：
Nhập OTP sai lần thứ 5 → click nút xác thực

ステップ3：
Kiểm tra `t_mfa_otp` trên DB

ステップ4：
Thử nhập lần thứ 6 (kể cả OTP đúng)

### 期待結果

ステップ1：
Mỗi lần HTTP status code: 401, INVALID_OTP
`verify_attempt_count` tăng từ 1 → 4

ステップ2：
HTTP status code: 401
error_code: OTP_MAX_ATTEMPTS
message:「認証コードの入力回数が上限に達しました。再度ログインしてください。」

ステップ3：
`verify_attempt_count = 5`, `used_flg = true` (OTP bị invalidate)

ステップ4：
HTTP status code: 401
error_code: INVALID_MFA_TOKEN hoặc OTP_MAX_ATTEMPTS
(Vì entry đã bị xóa khỏi mfaTokenToOtpId Map, lần thử mới được xử lý là token không hợp lệ)

補足：
・5 lần thất bại liên tục thì invalidate OTP, xóa mapping token
・User cần đăng nhập lại để lấy OTP mới
・Tương ứng ACSMS-MSG-001-008

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-040 — MFA — Hết 5 phút → OTP_EXPIRED + vô hiệu nút xác thực

- **観点ID**: VP-D-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, mfa_token hợp lệ
  - ・Đã quá 5 phút từ khi phát hành OTP (`expired_at < NOW()`)

### 手順

ステップ1：
Đợi đến khi countdown về 0:00

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Trên DevTools Console gọi API trực tiếp, thử xác thực

ステップ4：
Kiểm tra `t_mfa_otp.used_flg` trên DB

### 期待結果

ステップ1：
Countdown hiển thị「00:00」

ステップ2：
Nút xác thực bị vô hiệu (`:disabled="otp.length !== 6 || expired"`)
User chỉ có thể「コードを再送する」hoặc「ログイン画面に戻る」thủ công

ステップ3：
HTTP status code: 401
error_code: OTP_EXPIRED
message:「認証コードの有効期限が切れました。再度ログインしてください。」

ステップ4：
`used_flg = true` được cập nhật (OTP invalidate)

補足：
・FE: khi countdown 0 thì `expired = true`, vô hiệu nút xác thực
・BE: exception OTP_EXPIRED khi `expired_at < Date.now()`
・Tương ứng ACSMS-MSG-001-007

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-041 — MFA — Gửi lại (sau 60 giây) → phát hành OTP mới

- **観点ID**: VP-D-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Màn hình MFA, mfa_token hợp lệ
  - ・Đã quá 60 giây từ khi phát hành OTP, `resend_count = 0`

### 手順

ステップ1：
Sau khi đếm 60 giây, click link「コードを再送する」

ステップ2：
Kiểm tra response và DB:
```sql
SELECT otp_id, expired_at, verify_attempt_count, resend_count, used_flg
FROM t_mfa_otp
WHERE account_id = :account_id
ORDER BY created_at DESC
LIMIT 2;
```

ステップ3：
Kiểm tra mail nhận được

ステップ4：
Kiểm tra countdown và trạng thái nút gửi lại trên màn hình

### 期待結果

ステップ1：
HTTP status code: 200
Response: `data.mfa_token` UUID mới, `data.expires_in = 300`, `data.resend_count = 1`, `data.max_resend = 3`
Toast「認証コードを再送しました。」hiển thị

ステップ2：
Row OTP cũ: `used_flg = true` (invalidate)
Row OTP mới: `otp_id` mới, `expired_at = NOW() + 5 phút`, `verify_attempt_count = 0`, `resend_count = 1`, `used_flg = false`

ステップ3：
6 số OTP mới được gửi qua mail

ステップ4：
Countdown reset về 5:00, nút gửi lại bị vô hiệu trong 60 giây

補足：
・Implementation: invalidate OTP cũ → phát hành OTP mới → tạo mfa_token mới → gửi mail
・`verifyAttemptCount` đếm từ 0 với OTP mới
・`resendCount` tích lũy (lần gửi lại tiếp theo là 2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-042 — MFA — Gửi lại dưới 60 giây → OTP_RESEND_COOLDOWN

- **観点ID**: VP-D-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, OTP phát hành chưa quá 60 giây

### 手順

ステップ1：
Kiểm tra trạng thái nút gửi lại trên màn hình

ステップ2：
Trên DevTools Console gọi POST `/api/v1/auth/mfa/resend` trực tiếp

### 期待結果

ステップ1：
Nút gửi lại bị vô hiệu, hiển thị text「再送まで XX 秒」

ステップ2：
HTTP status code: 429
error_code: OTP_RESEND_COOLDOWN
message:「再送間隔が60秒未満です。しばらくしてから再度お試しください。」

補足：
・FE: trong khi countdown 60 giây thì nút gửi lại vô hiệu, không gọi API
・BE: phòng thủ DevTools trực tiếp, từ chối với `(Date.now() - otp.createdAt.getTime()) / 1000 < 60`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-043 — MFA — Vượt giới hạn 3 lần gửi lại → OTP_RESEND_LIMIT

- **観点ID**: VP-A-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, `resend_count = 3` (đã hoàn tất 3 lần gửi lại)
  - ・Đã quá 60 giây

### 手順

ステップ1：
Thử gửi lại lần thứ 4 (click link「コードを再送する」)

ステップ2：
Kiểm tra response và DB

### 期待結果

ステップ1：
HTTP status code: 429
error_code: OTP_RESEND_LIMIT
message:「コードの再送回数が上限に達しました。再度ログインしてください。」

ステップ2：
DB cập nhật `used_flg = true` của OTP hiện tại (invalidate)
User cần đăng nhập lại để lấy OTP mới

補足：
・Số lần gửi lại tối đa: 3 lần (chỉ đếm lần gửi lại trừ lần đầu tiên)
・Khi đạt giới hạn thì invalidate OTP, xóa mapping token
・Tương ứng ACSMS-MSG-001-012

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-044 — MFA — mfa_token không hợp lệ → INVALID_MFA_TOKEN

- **観点ID**: VP-D-01
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA (hoặc DevTools trực tiếp)

### 手順

ステップ1：
Trên DevTools Console chạy POST `/api/v1/auth/mfa/verify` với mfa_token sai
```js
fetch('/api/v1/auth/mfa/verify', {
  method: 'POST',
  body: JSON.stringify({ mfa_token: 'invalid-uuid', otp_code: '123456' }),
  headers: { 'Content-Type': 'application/json' }
});
```

ステップ2：
Kiểm tra response

ステップ3：
Truy cập trực tiếp màn hình MFA với URL query `/mfa-verify?mfa_token=invalid`

### 期待結果

ステップ1：
Bị từ chối vì không tồn tại trong mfaTokenToOtpId Map

ステップ2：
HTTP status code: 401
error_code: INVALID_MFA_TOKEN
message:「MFAトークンが無効です。再度ログインしてください。」

ステップ3：
Màn hình được load nhưng error trên khi thử xác thực, chỉ có link quay lại màn hình đăng nhập hoạt động

補足：
・Mapping mfa_token → otp_id quản lý ở phía server in-memory Map (TTL 5 phút)
・Token hết hạn hoặc không tồn tại bị từ chối ngay

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-045 — MFA — Quay lại màn hình đăng nhập + reset state

- **観点ID**: VP-D-01
- **種類**: Normal (正常)
- **前提条件**:
  - ・Màn hình MFA, mfa_token hợp lệ
  - ・Đã nhập một phần OTP (ví dụ: chỉ `123`)

### 手順

ステップ1：
Click link「ログイン画面に戻る」

ステップ2：
Kiểm tra trạng thái màn hình đăng nhập

ステップ3：
Quay lại màn hình MFA bằng nút back của browser

### 期待結果

ステップ1：
Chuyển về màn hình đăng nhập (/login), countdown timer dừng

ステップ2：
Màn hình đăng nhập ở trạng thái ban đầu (ID và password rỗng)
※ Có thể giá trị lần trước còn lại do autofill của browser

ステップ3：
mfa_token mất khỏi query parameter, onMounted của màn hình MFA redirect về `/login`

補足：
・`onUnmounted` của màn hình MFA `clearInterval` countdownTimer / cooldownTimer
・State MFA không lưu vào localStorage / sessionStorage

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-001-046 — Lỗi chung — TOO_MANY_REQUESTS (login API 10/phút)

- **観点ID**: VP-A-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, script test gửi 11 request POST `/api/v1/auth/login` trong 1 phút

### 手順

ステップ1：
Script gửi request từ 1 đến 10

ステップ2：
Gửi request thứ 11

ステップ3：
Kiểm tra response

### 期待結果

ステップ1：
Mỗi request 200 hoặc 401 phản hồi bình thường

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS
message:「リクエスト回数が上限を超えました。しばらくしてから再度お試しください。」

ステップ3：
Toast hiển thị phía màn hình, nút đăng nhập tạm vô hiệu

補足：
・Implementation: `@Throttle({ default: { ttl: 60000, limit: 10 } })` on login endpoint
・Phòng thủ tấn công brute force
・Tuân thủ quan điểm VP-A-08「レート制限・Throttling」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-047 — Lỗi chung — TOO_MANY_REQUESTS (MFA verify API 20/phút)

- **観点ID**: VP-A-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, script test gửi 21 request POST `/api/v1/auth/mfa/verify` trong 1 phút

### 手順

ステップ1：
Script gửi request từ 1 đến 20

ステップ2：
Gửi request thứ 21

### 期待結果

ステップ1：
Mỗi request 200 hoặc 401 phản hồi bình thường

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS

補足：
・Implementation: `@Throttle({ default: { ttl: 60000, limit: 20 } })` on mfa/verify endpoint
・Phòng thủ tấn công brute force OTP

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-048 — Lỗi chung — TOO_MANY_REQUESTS (MFA resend API 5/phút)

- **観点ID**: VP-A-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình MFA, script test gửi 6 request POST `/api/v1/auth/mfa/resend` trong 1 phút

### 手順

ステップ1：
Script gửi request từ 1 đến 5

ステップ2：
Gửi request thứ 6

### 期待結果

ステップ1：
Mỗi request 200 hoặc 429 (cooldown) phản hồi

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS

補足：
・Implementation: `@Throttle({ default: { ttl: 60000, limit: 5 } })` on mfa/resend endpoint
・Phòng thủ lạm dụng API gửi mail

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-049 — Lỗi chung — BAD_REQUEST — Request parameter không hợp lệ

- **観点ID**: VP-D-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, đã mở DevTools browser

### 手順

ステップ1：
Trên DevTools Console chạy POST `/api/v1/auth/login` với JSON không hợp lệ
```js
fetch('/api/v1/auth/login', {
  method: 'POST',
  body: '{invalid json',
  headers: { 'Content-Type': 'application/json' }
});
```

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra `t_login_log` trên DB

### 期待結果

ステップ1：
Request bị body parser phía BE từ chối

ステップ2：
HTTP status code: 400
error_code: BAD_REQUEST
message:「リクエストパラメータが不正です。」

ステップ3：
Không ghi log đăng nhập (vì bị từ chối ở body parse)

補足：
・JSON parse error, Content-Type không hợp lệ, parameter không xác định v.v. tất cả đều map về BAD_REQUEST

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-050 — Lỗi chung — INTERNAL_SERVER_ERROR — Mô phỏng server crash

- **観点ID**: VP-D-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, đã nhập giá trị hợp lệ
  - ・Cố ý ngắt kết nối DB phía BE (test environment)

### 手順

ステップ1：
Click nút đăng nhập

ステップ2：
Kiểm tra response

ステップ3：
Kiểm tra trạng thái màn hình

ステップ4：
Kiểm tra log lỗi: `SELECT * FROM t_login_log WHERE login_result=2 ORDER BY login_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Phía BE phát sinh exception, xử lý exception ở catch block ngoài

ステップ2：
HTTP status code: 500
error_code: INTERNAL_SERVER_ERROR
message:「システムエラーが発生しました。しばらくしてから再度お試しください。」

ステップ3：
Vẫn ở màn hình đăng nhập, toast hiển thị, giữ nguyên giá trị input

ステップ4：
`login_result = 2`, ghi exception message vào `failure_reason`

補足：
・Không lộ thông tin nội bộ như stack trace ra phía user
・Tương ứng ACSMS-MSG-001-010

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-001-051 — Lỗi chung — Fallback khi lấy thông báo thất bại

- **観点ID**: VP-D-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập
  - ・API thông báo trả về lỗi 500 (set mock trong test environment)

### 手順

ステップ1：
Mở `/login`

ステップ2：
Kiểm tra response của GET `/api/v1/oshirase/public`

ステップ3：
Kiểm tra trạng thái form đăng nhập

### 期待結果

ステップ1：
Màn hình đăng nhập hiển thị bình thường

ステップ2：
HTTP status code: 500, response error

ステップ3：
Card thông báo không hiển thị (NoticeList không render gì với array rỗng)
Form đăng nhập có thể thao tác bình thường

補足：
・Implementation: FE `try/catch` của `onMounted` fallback về array rỗng
・Tuân thủ spec §14.4「エラー → お知らせエリアを非表示、ログインに影響なし」
・Thất bại lấy thông báo không block xử lý đăng nhập

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

## ACSMS-TC-001-052 — Lỗi chung — Hiển thị toast FE khi mất kết nối mạng

- **観点ID**: VP-D-08
- **種類**: Abnormal (異常)
- **前提条件**:
  - ・Màn hình đăng nhập, đã nhập giá trị hợp lệ
  - ・Chuyển Network tab DevTools sang chế độ mất kết nối mạng

### 手順

ステップ1：
Click nút đăng nhập

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Sau khi mạng được phục hồi, click lại nút đăng nhập

### 期待結果

ステップ1：
Toast「ネットワークエラーが発生しました。接続をご確認ください。」hiển thị

ステップ2：
Vẫn ở màn hình đăng nhập, giữ nguyên giá trị input

ステップ3：
Đăng nhập thành công bình thường, HTTP status code: 200

補足：
・Phát hiện network error → thông báo cho user
・Giá trị input được giữ, có thể gửi lại
・axios interceptor xử lý Network Error tập trung

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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
