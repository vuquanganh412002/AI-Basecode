---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-005
screen_name: JAマスタ登録画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-08
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-08 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

Hệ thống này là hệ thống quản lý độc giả phiên bản cloud dành cho JA, cung cấp các chức năng quản lý thông tin độc giả, quản lý lịch sử đặt báo, quản lý dữ liệu chuyển khoản tự động, v.v.
Các chức năng chính bao gồm: đăng ký / cập nhật / tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt báo, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng tải lên / tải xuống file, quản lý thông báo hệ thống.
Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật / kiểm toán như quản lý đăng nhập của user,
ghi lịch sử đăng nhập, ghi log thao tác của user.

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống tại màn hình "JAマスタ登録画面（ACSMS-SCR-005）".
Tài liệu tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau:

- Mỗi testcase được tạo dựa trên một scenario duy nhất (single responsibility).
- Mô tả các bước với mức độ chi tiết có thể tái hiện, làm rõ test data sử dụng.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).
- Thiết lập độ ưu tiên (P0: chặn release / P1: cao / P2: trung bình).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-005 | Tài liệu thiết kế màn hình đăng ký JA Master |
| 2 | ACSMS-SCR-005-api | Tài liệu thiết kế API màn hình đăng ký JA Master |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 6 |
| 3 | Header & Breadcrumb | 4 |
| 4 | Kiểm tra đầu vào — Màn hình đăng ký | 22 |
| 5 | Logic nghiệp vụ — Đăng ký (Function — Create) | 8 |
| 6 | Logic nghiệp vụ — Cập nhật (Function — Edit) | 10 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | 合計 | 62 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-005-001 — Cho phép NICHINO_ADMIN truy cập màn hình đăng ký / chỉnh sửa

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + xác thực MFA
  - ・Quyền: nắm giữ ja.create / ja.view / ja.update

### 手順

ステップ1：
Mở dashboard, kiểm tra mục「JAマスタ」trên sidebar

ステップ2：
Click「JAマスタ」→ click nút「新規登録」trên màn hình danh sách

ステップ3：
Truy cập trực tiếp URL `/ja/{ja_id}/edit` để vào màn hình chỉnh sửa JA hiện có

ステップ4：
Trên DevTools, gửi POST `/api/v1/ja` với request body hợp lệ, sau đó gửi PUT `/api/v1/ja/{ja_id}`

### 期待結果

ステップ1：
Mục「JAマスタ」hiển thị trên sidebar (do nắm giữ quyền `ja.view`)

ステップ2：
Mở màn hình `/ja/create`, form được hiển thị

ステップ3：
Mở màn hình `/ja/{ja_id}/edit`, giá trị hiện có được hiển thị trên form

ステップ4：
Trả về HTTP 201 (đăng ký thành công, HTTP 200 cập nhật thành công)

補足：
・Cả 3 lớp (FE menu, FE router guard, BE API guard) đều cho phép truy cập
・NICHINO_ADMIN nắm giữ quyền đăng ký / chỉnh sửa cho toàn bộ JA
・Có row mới trong `m_ja`, log thành công CREATE / UPDATE được ghi vào `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-002 — Cấm NICHINO_STAFF truy cập màn hình đăng ký / chỉnh sửa

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã đăng nhập + xác thực MFA
  - ・Quyền: không nắm giữ bất kỳ quyền ja.* nào

### 手順

ステップ1：
Kiểm tra mục「JAマスタ」trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja/create`

ステップ3：
Truy cập trực tiếp URL `/ja/1/edit`

ステップ4：
Trên DevTools, gửi POST `/api/v1/ja` với request body hợp lệ

### 期待結果

ステップ1：
Mục「JAマスタ」không hiển thị trên sidebar (NICHINO_STAFF không nắm giữ quyền `ja.view`)

ステップ2：
Toast「アクセス権がありません。」hiển thị
và chuyển về「/dashboard」

ステップ3：
Toast「アクセス権がありません。」hiển thị
và chuyển về「/dashboard」

ステップ4：
HTTP status code: 403
error_code: FORBIDDEN
message:「この画面へのアクセス権限がありません。」

補足：
・Cả 3 lớp (FE menu, FE router guard, BE API guard) đều từ chối truy cập
・Không có row mới trong `m_ja`
・Log lỗi (log_type=3) được ghi vào `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — Nếu fail nghĩa là RBAC bị bypass, xử lý như security incident.

## ACSMS-TC-005-003 — CHUOKAI truy cập màn hình chỉnh sửa — không thể đăng ký, chỉ chỉnh sửa được JA thuộc phạm vi quản lý

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Quyền: chỉ nắm giữ ja.view / ja.update (không nắm giữ ja.create)
  - ・JA thuộc phạm vi quản lý: ja-001 / JA ngoài phạm vi: ja-101 (thuộc chuokai-002)

### 手順

ステップ1：
Kiểm tra mục「JAマスタ」trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja/create`

ステップ3：
Trên DevTools, gửi POST `/api/v1/ja` với request body hợp lệ

ステップ4：
Truy cập trực tiếp URL `/ja/1/edit` (JA thuộc phạm vi quản lý)

ステップ5：
Truy cập trực tiếp URL `/ja/101/edit` (JA ngoài phạm vi), sau đó gửi PUT `/api/v1/ja/101` qua DevTools

### 期待結果

ステップ1：
Mục「JAマスタ」hiển thị trên sidebar (do nắm giữ `ja.view`)

ステップ2：
Toast「アクセス権がありません。」hiển thị
và chuyển về「/dashboard」

ステップ3：
HTTP status code: 403
error_code: FORBIDDEN
message:「この画面へのアクセス権限がありません。」

ステップ4：
Mở màn hình chỉnh sửa, giá trị hiện có được hiển thị (chỉ một số mục có thể chỉnh sửa)

ステップ5：
HTTP status code: 404
error_code: NOT_FOUND
message:「指定されたJAが見つかりません。」

補足：
・CHUOKAI không thể đăng ký mới, chỉ có thể chỉnh sửa JA thuộc phạm vi quản lý
・Truy cập trực tiếp JA ngoài phạm vi trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại
・api.md エラー一覧 định nghĩa DATA_SCOPE_VIOLATION (403), nhưng implementation theo quy tắc `assertJaScope` của security.md, ưu tiên 404 masking

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-004 — JA_HONTEN truy cập màn hình chỉnh sửa — không thể đăng ký, chỉ chỉnh sửa được JA của mình

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Quyền: chỉ nắm giữ ja.view / ja.update (không nắm giữ ja.create)
  - ・JA của mình: ja-001 / JA khác: ja-002

### 手順

ステップ1：
Kiểm tra mục「JAマスタ」trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja/create`, sau đó gửi POST `/api/v1/ja` qua DevTools

ステップ3：
Truy cập trực tiếp URL `/ja/1/edit` (JA của mình)

ステップ4：
Truy cập trực tiếp URL `/ja/2/edit` (JA khác), sau đó gửi PUT `/api/v1/ja/2` qua DevTools

### 期待結果

ステップ1：
Mục「JAマスタ」hiển thị trên sidebar (do nắm giữ `ja.view`)

ステップ2：
Toast「アクセス権がありません。」hiển thị + chuyển về `/dashboard`
và API trả về HTTP 403, error_code: FORBIDDEN

ステップ3：
Mở màn hình chỉnh sửa, giá trị hiện có được hiển thị (chỉ một số mục có thể chỉnh sửa)

ステップ4：
HTTP status code: 404
error_code: NOT_FOUND
message:「指定されたJAが見つかりません。」

補足：
・JA_HONTEN không thể đăng ký mới, chỉ có thể chỉnh sửa JA của mình
・Truy cập trực tiếp JA khác trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại
・api.md エラー一覧 định nghĩa DATA_SCOPE_VIOLATION (403), nhưng implementation theo quy tắc `assertJaScope` của security.md, ưu tiên 404 masking

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-005 — Cấm JA_KANRI_SHITEN truy cập màn hình đăng ký / chỉnh sửa

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / branch-001)
  - ・Đã đăng nhập + xác thực MFA
  - ・Quyền: không nắm giữ bất kỳ quyền ja.* nào

### 手順

ステップ1：
Kiểm tra mục「JAマスタ」trên sidebar

ステップ2：
Truy cập trực tiếp URL `/ja/create`

ステップ3：
Truy cập trực tiếp URL `/ja/1/edit`

ステップ4：
Trên DevTools, gửi PUT `/api/v1/ja/1` với request body hợp lệ

### 期待結果

ステップ1：
Mục「JAマスタ」không hiển thị trên sidebar

ステップ2：
Toast「アクセス権がありません。」hiển thị
và chuyển về「/dashboard」

ステップ3：
Toast「アクセス権がありません。」hiển thị
và chuyển về「/dashboard」

ステップ4：
HTTP status code: 403
error_code: FORBIDDEN
message:「この画面へのアクセス権限がありません。」

補足：
・JA_KANRI_SHITEN không thể tham chiếu / đăng ký / chỉnh sửa JA Master
・Cả 3 lớp (FE menu, FE router guard, BE API guard) đều từ chối truy cập
・Không có thay đổi trong `m_ja`, log lỗi (log_type=3) được ghi vào `t_log`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-005-006 — Layout tổng thể màn hình đăng ký khớp với design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click nút「新規登録」trên màn hình danh sách「JAマスタ」

ステップ2：
So sánh màn hình với design spec (screen-design.md / index.html) song song

ステップ3：
Kiểm tra vị trí từng phần tử (vị trí title bar, bố cục form, bố cục button)

### 期待結果

ステップ1：
Mở màn hình `/ja/create`

ステップ2：
Màu nền, font, font size, padding/margin, màu button, style ô input đều khớp

ステップ3：
Theo đúng design spec

補足：
・Không có khác biệt visual với design spec
・design tokens (`design-tokens.ts`) được áp dụng (không có hardcoded color)

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

## ACSMS-TC-005-007 — Layout tổng thể màn hình chỉnh sửa khớp với design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Tồn tại record JA hiện có `ja_id = 1`

### 手順

ステップ1：
Click link「編集」của record hiện có từ danh sách JA

ステップ2：
So sánh với design spec

### 期待結果

ステップ1：
Mở màn hình `/ja/1/edit`, giá trị hiện có được hiển thị trên form

ステップ2：
Layout giống màn hình đăng ký + trạng thái read-only phù hợp (ô JAコード ở trạng thái disabled)

補足：
・Màn hình chỉnh sửa có visual consistency tương đương với màn hình đăng ký
・JAコード là read-only, đối với CHUOKAI / JA_HONTEN, các mục ngoài đối tượng ※4 (JA名, JA名カナ, 都道府県, 中央会フラグ, 金融機関コード, 金融機関名) cũng read-only

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-008 — Hoạt động responsive — breakpoint PC / Tablet / Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký

### 手順

ステップ1：
Đặt window size 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar cố định, form 3 cột grid

ステップ2：
Sidebar gập, form được giữ nguyên

ステップ3：
Sidebar overlay, các phần tử form xếp dọc, không có scroll ngang

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

## ACSMS-TC-005-009 — Hiển thị phần tử form — ô input / dropdown / radio / button đúng design spec

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký

### 手順

ステップ1：
Kiểm tra placeholder, format, trạng thái (enabled / focus / disabled) của từng textbox

ステップ2：
Kiểm tra hiển thị dropdown 都道府県

ステップ3：
Kiểm tra hiển thị radio 中央会フラグ

ステップ4：
Kiểm tra hiển thị radio 税区分

ステップ5：
Kiểm tra size, location, icon, color của button 登録 / 前の画面に戻る

### 期待結果

ステップ1：
Theo design — placeholder khớp, viền focus đổi màu, disabled hiển thị xám

ステップ2：
Dropdown 47 tỉnh hiển thị, giá trị ban đầu chưa chọn

ステップ3：
Lựa chọn:「中央会」(true) /「単協」(false) gồm 2 option, mặc định chưa chọn

ステップ4：
Lựa chọn:「内税」(1) /「外税」(2) gồm 2 option, mặc định chưa chọn

ステップ5：
Theo design. Button đăng ký là 主ボタン (xanh), button quay lại là 副ボタン (trắng)

補足：
・Tất cả phần tử form khớp hoàn toàn với design spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-010 — Thứ tự Tab và thao tác bàn phím (Tab / Enter)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký, focus ở body

### 手順

ステップ1：
Nhấn liên tục phím Tab, kiểm tra tiến trình focus

ステップ2：
Nhấn phím Enter trong textbox

ステップ3：
Nhấn phím Enter trên dropdown

### 期待結果

ステップ1：
Thứ tự Tab theo design spec: JAコード → JA名 → JA名カナ → 都道府県 → 中央会フラグ → 金融機関コード → 金融機関名 → 郵便番号 → 住所 → 電話 → FAX → メール → 担当部署 → 担当者 → 税区分 → 備考 → button đăng ký → button quay lại

ステップ2：
送信 ngầm bằng Enter bị vô hiệu hóa (kiểm soát bởi preventEnterImplicitSubmit)

ステップ3：
Dropdown mở ra, Enter để xác nhận lựa chọn

補足：
・Thứ tự Tab theo đúng design spec, có thể thao tác toàn bộ bằng bàn phím
・Màn hình này có 16 mục form, nên 送信 ngầm bằng Enter bị vô hiệu hóa (theo convention của form CRUD edit)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-011 — Độ tin cậy thao tác button (double-click / nhấn liên tục / Enter)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Màn hình đăng ký với toàn bộ mục đã nhập giá trị hợp lệ
  - ・Test data: JAコード=1301999001, JA名=テストJA, 都道府県=13, 中央会フラグ=false, 金融機関コード=1234, 金融機関名=農林中央金庫, 税区分=1

### 手順

ステップ1：
Double-click button đăng ký (trong vòng 200ms)

ステップ2：
Nhấn liên tục button đăng ký trong 5 giây

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE ja_code='1301999001'`

### 期待結果

ステップ1：
Lần 1 bắt đầu gửi, lần 2 button bị vô hiệu nên bỏ qua

ステップ2：
Trong khi đang gửi, button bị vô hiệu, không có đăng ký trùng

ステップ3：
Chỉ 1 record (không trùng)

補足：
・Không phát sinh đăng ký trùng
・Trong khi đang gửi, button hiển thị ở trạng thái vô hiệu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Phòng chống gửi trùng — Vùng tester thường phát hiện bug.

---

# カテゴリ 3: Header & Breadcrumb

## ACSMS-TC-005-012 — Hiển thị header title

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký hoặc màn hình chỉnh sửa

### 手順

ステップ1：
Kiểm tra phía trái header trên cùng màn hình

### 期待結果

ステップ1：
Hiển thị chữ「JAマスタ登録画面」

補足：
・Chuỗi title literal đúng theo spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-013 — Hiển thị icon thông báo + menu user

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang ở màn hình đăng ký

### 手順

ステップ1：
Kiểm tra phía phải header

ステップ2：
Hover chuột lên icon user

ステップ3：
Click icon user

### 期待結果

ステップ1：
Theo thứ tự: icon thông báo → icon user → tên đăng nhập (ví dụ: 日農（管理者）)

ステップ2：
Khi hover, background đổi màu

ステップ3：
Dropdown mở ra — hiển thị menu logout v.v.

補足：
・Tất cả tương tác hover/click đúng design spec

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-014 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký

### 手順

ステップ1：
Kiểm tra vùng breadcrumb dưới title màn hình

ステップ2：
So sánh các cấp breadcrumb với design spec

### 期待結果

ステップ1：
Hiển thị cấu trúc:「ホーム > JAマスタ一覧 > JAマスタ登録画面」

ステップ2：
Ký tự phân tách, text, có/không link đều khớp

補足：
・Breadcrumb hiển thị đúng cấu trúc + đúng design spec
・Node cha của danh sách có thể click (link), màn hình hiện tại không có link

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-015 — Hoạt động chuyển trang của các link breadcrumb

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đang ở màn hình đăng ký

### 手順

ステップ1：
Click「ホーム」trên breadcrumb

ステップ2：
Quay lại màn hình đăng ký, click「JAマスタ一覧」

ステップ3：
Quay lại màn hình đăng ký, click「JAマスタ登録画面」(màn hình hiện tại)

### 期待結果

ステップ1：
Chuyển sang `/dashboard`

ステップ2：
Chuyển sang màn hình danh sách `/ja`

ステップ3：
Vì là màn hình hiện tại, không xảy ra gì (không reload)

補足：
・Mỗi link hoạt động đúng như mong đợi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Kiểm tra đầu vào — Màn hình đăng ký

## ACSMS-TC-005-016 — JAコード — Kiểm tra bắt buộc (rỗng + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ
  - ・Test data: JA名=テストJA, 都道府県=13, 中央会フラグ=false, 金融機関コード=1234, 金融機関名=農林中央金庫, 税区分=1

### 手順

ステップ1：
Để trống JAコード, nhấn button đăng ký

ステップ2：
Nhập 3 ký tự space half-width → nhấn button đăng ký

ステップ3：
Nhập 3 ký tự space full-width → nhấn button đăng ký

### 期待結果

ステップ1：
Hiển thị「必須項目です。」ngay dưới mục
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "ja_code", message: "JAコードを入力してください" }

ステップ2：
Sau khi loại bỏ space đầu cuối ở backend, được nhận diện là rỗng, hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR

ステップ3：
Space full-width cũng là đối tượng loại bỏ space đầu cuối, hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR

補足：
・Cả input rỗng và input chỉ chứa khoảng trắng đều bị xử lý là vi phạm bắt buộc
・Backend loại bỏ space đầu cuối, sau đó nhận diện là rỗng
・Không có row mới trong `m_ja`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-017 — JAコード — Giới hạn tối đa 10 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập 10 ký tự (ví dụ: 1301999001) vào JAコード → đăng ký

ステップ2：
Thử nhập ký tự thứ 11 vào JAコード

ステップ3：
Paste「12345678901234」(14 ký tự) vào ô JAコード

### 期待結果

ステップ1：
Tiếp nhận bình thường, đăng ký thành công

ステップ2：
input maxlength chặn nhập (không nhập được ký tự thứ 11)

ステップ3：
Cắt đến ký tự thứ 10, record đăng ký là 10 ký tự

補足：
・Giới hạn 10 ký tự được enforce kép bằng input maxlength và validation BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-018 — JAコード — Lỗi khi trùng

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: `ja_id=1, ja_code='1301001001'` đã đăng ký

### 手順

ステップ1：
Nhập `1301001001` vào JAコード, các mục khác nhập giá trị hợp lệ rồi đăng ký

ステップ2：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE ja_code = '1301001001' AND deleted_at IS NULL`

ステップ3：
Kiểm tra log kiểm toán: `SELECT * FROM t_log WHERE result_status = 2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
HTTP status code: 400
error_code: DUPLICATE_CODE
message:「JAコード「1301001001」はすでに登録されています。」
Đăng ký thất bại, message hiển thị ngay dưới mục trên màn hình

ステップ2：
Chỉ 1 record (không trùng)

ステップ3：
Log thất bại được ghi (log_type=3)

補足：
・JAコード unique trên toàn hệ thống (UNIQUE đơn, không phải UNIQUE phức hợp)
・Khi phát hiện trùng, từ chối trước khi thực hiện INSERT đăng ký, trước khi bắt đầu transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-019 — JAコード — Xử lý an toàn ký tự đặc biệt / HTML / SQL injection

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các field khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập HTML tag `<script>alert(1)</script>` vào JAコード → đăng ký

ステップ2：
Nhập SQL injection `1301'; DROP TABLE m_ja; --` → đăng ký

ステップ3：
Nếu đăng ký thành công, hiển thị lại giá trị trên màn hình chỉnh sửa

### 期待結果

ステップ1：
Tiếp nhận / từ chối theo spec. Khi tiếp nhận, lưu / hiển thị dưới dạng literal text (JS không execute)

ステップ2：
Lưu literal hoặc từ chối, bảng `m_ja` không bị xóa

ステップ3：
Hiển thị nguyên dạng literal text, JS không execute

補足：
・Stored XSS không phát huy do Vue auto-escape
・SQL injection không phát huy do parameterized query của TypeORM
・Lưu literal trong DB (không giữ data đã escape)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

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

## ACSMS-TC-005-020 — JA名 — Kiểm tra bắt buộc (rỗng + ký tự khoảng trắng)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống JA名, nhấn đăng ký

ステップ2：
Nhập chỉ space half-width / full-width → đăng ký

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "ja_name", message: "JA名を入力してください" }

ステップ2：
Sau khi loại bỏ space đầu cuối, được nhận diện là rỗng, hiển thị「必須項目です。」
HTTP status code: 400

補足：
・Cả input rỗng và input chỉ chứa khoảng trắng đều bị xử lý là vi phạm bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-021 — JA名 — Giới hạn tối đa 200 ký tự (giá trị biên)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký

### 手順

ステップ1：
Nhập 200 ký tự half-width → đăng ký

ステップ2：
Thử nhập ký tự thứ 201 half-width

ステップ3：
Nhập 200 ký tự full-width (Hán tự) → đăng ký

ステップ4：
Nhập mix half-width 100 + full-width 100 → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường

ステップ2：
maxlength chặn ký tự thứ 201

ステップ3：
Tiếp nhận bình thường (đếm ký tự half-width và full-width như nhau)

ステップ4：
Tiếp nhận bình thường

補足：
・Giới hạn 200 ký tự đếm chung cho half-width và full-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-022 — JA名 — Cho phép ký tự full-width (Hán tự / Hiragana / Katakana)

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký

### 手順

ステップ1：
Nhập Hán tự `JA東京中央` → đăng ký

ステップ2：
Nhập Hiragana `じぇいえいとうきょう` → đăng ký

ステップ3：
Nhập Katakana `ジェイエイトウキョウ` → đăng ký

ステップ4：
Nhập Katakana half-width `ｼﾞｪｲｴｲ` → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường, lưu literal trong DB

ステップ2：
Tiếp nhận bình thường

ステップ3：
Tiếp nhận bình thường

ステップ4：
Tiếp nhận bình thường

補足：
・Cho phép tất cả Katakana full-width và half-width

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-023 — JA名（カナ） — Mục tùy chọn / Giới hạn tối đa 200 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục bắt buộc khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống JA名カナ, đăng ký

ステップ2：
Nhập 200 ký tự Katakana → đăng ký

ステップ3：
Thử nhập ký tự thứ 201

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn), DB lưu chuỗi rỗng

ステップ2：
Tiếp nhận bình thường

ステップ3：
maxlength chặn nhập

補足：
・Mục tùy chọn nên có thể đăng ký với rỗng
・Giới hạn 200 ký tự được enforce

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-024 — 都道府県 — Kiểm tra bắt buộc / Giá trị dropdown

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 都道府県 chưa chọn, đăng ký

ステップ2：
Mở dropdown, kiểm tra hiển thị 47 tỉnh

ステップ3：
Chọn một tỉnh bất kỳ (ví dụ: Tokyo = 13) → đăng ký → kiểm tra DB

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "todofuken_code", message: "都道府県を選択してください" }

ステップ2：
Hiển thị toàn bộ 47 tỉnh (Hokkaido ~ Okinawa, mã 01 ~ 47)

ステップ3：
Tiếp nhận bình thường, lưu với `m_ja.todofuken_code = '13'`

補足：
・Lấy từ `m_todofuken` qua API GET `/api/v1/todofuken`
・Mã cố định 2 chữ số (01 ~ 47)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-025 — 都道府県 — Tham chiếu m_todofuken (từ chối mã không hợp lệ)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN

### 手順

ステップ1：
Trên DevTools Console, chạy `fetch('/api/v1/ja', { method: 'POST', body: JSON.stringify({ ja_code: '1399999001', ja_name: 'テスト', todofuken_code: '99', chuokai_flg: false, bank_code: '1234', bank_name: '農林中央金庫', zei_kubun: '1' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ2：
Kiểm tra HTTP status và error_code response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE ja_code = '1399999001'`

### 期待結果

ステップ1：
Backend từ chối qua kiểm tra tồn tại trong `m_todofuken`

ステップ2：
HTTP status code: 400
error_code: VALIDATION_ERROR
message:「指定された都道府県コードは存在しません」

ステップ3：
0 record (không có row mới)

補足：
・Mã tỉnh không tồn tại (≥ 48 hoặc giá trị không hợp lệ) bị backend từ chối
・Dropdown FE lấy từ `m_todofuken`, nên không xảy ra qua UI, nhưng kiểm tra phòng thủ với call API trực tiếp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-026 — 中央会フラグ — Bắt buộc / Lựa chọn radio

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 中央会フラグ chưa chọn, đăng ký

ステップ2：
Chọn `中央会` → đăng ký → kiểm tra DB

ステップ3：
Chọn `単協` → đăng ký → kiểm tra DB

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "chuokai_flg", message: "中央会フラグを選択してください" }

ステップ2：
Tiếp nhận bình thường, lưu với `m_ja.chuokai_flg = true`

ステップ3：
Tiếp nhận bình thường, lưu với `m_ja.chuokai_flg = false`

補足：
・Boolean, không có giá trị mặc định, bắt buộc phải chọn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-027 — 金融機関コード — Kiểm tra bắt buộc

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 金融機関コード, đăng ký

ステップ2：
Nhập chỉ space half-width / full-width → đăng ký

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "bank_code", message: "金融機関コードを入力してください" }

ステップ2：
Sau khi loại bỏ space đầu cuối, được nhận diện là rỗng, hiển thị「必須項目です。」
HTTP status code: 400

補足：
・Cả input rỗng và input chỉ chứa khoảng trắng đều bị xử lý là vi phạm bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-028 — 金融機関コード — Kiểm tra format cố định 4 chữ số

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhập `1234` (4 chữ số) → đăng ký

ステップ2：
Nhập `123` (3 chữ số) → đăng ký

ステップ3：
Thử nhập `12345` (5 chữ số)

ステップ4：
Nhập chữ cái `abcd` → đăng ký

ステップ5：
Nhập số full-width `１２３４` → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường

ステップ2：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "bank_code", message: "金融機関コードは半角数字4桁で入力してください" }

ステップ3：
input maxlength chặn ký tự thứ 5

ステップ4：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "bank_code", message: "金融機関コードは半角数字4桁で入力してください" }

ステップ5：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "bank_code", message: "金融機関コードは半角数字4桁で入力してください" }

補足：
・Cố định 4 chữ số half-width, kiểm tra BE bằng @Matches(/^\d{4}$/)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-029 — 金融機関名 — Kiểm tra bắt buộc / Giới hạn tối đa 100 ký tự

- 観点ID: VP-B-01
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 金融機関名, đăng ký

ステップ2：
Nhập 100 ký tự → đăng ký

ステップ3：
Thử nhập ký tự thứ 101

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "bank_name", message: "金融機関名を入力してください" }

ステップ2：
Tiếp nhận bình thường

ステップ3：
maxlength chặn ký tự thứ 101

補足：
・Mục bắt buộc, tối đa 100 ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-030 — 郵便番号 — Tùy chọn / Kiểm tra format 7 chữ số

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 郵便番号, đăng ký

ステップ2：
Nhập `1000001` (7 chữ số) → đăng ký

ステップ3：
Nhập `100-0001` (có hyphen) → đăng ký

ステップ4：
Nhập `123456` (6 chữ số) → đăng ký

ステップ5：
Nhập số full-width `１２３４５６７` → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn), DB lưu chuỗi rỗng

ステップ2：
Tiếp nhận bình thường, DB lưu `1000001`

ステップ3：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "yubin_no", message: "郵便番号は数字のみ（ハイフンなし）入力可能です。" }

ステップ4：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "yubin_no", message: "郵便番号は数字のみ（ハイフンなし）入力可能です。" }

ステップ5：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "yubin_no", message: "郵便番号は数字のみ（ハイフンなし）入力可能です。" }

補足：
・Cố định 7 chữ số, chỉ số half-width (không có hyphen)
・Tương ứng ACSMS-MSG-005-003 (screen-design.md có typo, test này dùng bản đã sửa)
・Mục tùy chọn nên có thể đăng ký với rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Tham chiếu literal message ACSMS-MSG-005-003 (chuỗi trùng「郵便番号は」ở screen-design.md L113 là typo, dùng bản chính thức đã sửa「郵便番号は数字のみ（ハイフンなし）入力可能です。」). Xác nhận lại sau khi spec được sửa chính thức.

## ACSMS-TC-005-031 — 電話番号 — Chỉ số half-width / Tối đa 15 chữ số

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 電話番号, đăng ký

ステップ2：
Nhập `0312345678` (10 chữ số) → đăng ký

ステップ3：
Nhập `03-1234-5678` (có hyphen) → đăng ký

ステップ4：
Nhập `123456789012345` (15 chữ số) → đăng ký

ステップ5：
Thử nhập chữ số thứ 16

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn)

ステップ2：
Tiếp nhận bình thường, DB lưu `0312345678`

ステップ3：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "tel", message: "電話番号は数字のみ（ハイフンなし）入力可能です。" }

ステップ4：
Tiếp nhận bình thường (giá trị biên độ dài tối đa)

ステップ5：
maxlength chặn chữ số thứ 16

補足：
・Mục tùy chọn, chỉ số half-width (không có hyphen), tối đa 15 chữ số
・Tương ứng ACSMS-MSG-005-006
・Placeholder FE là `0312345678`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-032 — FAX — Chỉ số half-width / Tối đa 15 chữ số

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống FAX, đăng ký

ステップ2：
Nhập `0312345679` (10 chữ số) → đăng ký

ステップ3：
Nhập `03-1234-5679` (có hyphen) → đăng ký

ステップ4：
Nhập chữ cái `abc` → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn)

ステップ2：
Tiếp nhận bình thường, DB lưu `0312345679`

ステップ3：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "fax", message: "FAXは数字のみ（ハイフンなし）入力可能です。" }

ステップ4：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "fax", message: "FAXは数字のみ（ハイフンなし）入力可能です。" }

補足：
・Mục tùy chọn, chỉ số half-width (không có hyphen), tối đa 15 chữ số
・Tương ứng ACSMS-MSG-005-007

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-033 — メールアドレス — Kiểm tra format / Giới hạn tối đa 100 ký tự

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống メールアドレス, đăng ký

ステップ2：
Nhập `info@ja-tokyo.or.jp` → đăng ký

ステップ3：
Nhập `invalid-email` (không có @) → đăng ký

ステップ4：
Nhập `abc@` (không có domain) → đăng ký

ステップ5：
Thử nhập email vượt 100 ký tự

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn)

ステップ2：
Tiếp nhận bình thường, lưu vào DB

ステップ3：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "email", message: "有効なメールアドレスを入力してください。" }

ステップ4：
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "email", message: "有効なメールアドレスを入力してください。" }

ステップ5：
maxlength chặn ký tự thứ 101

補足：
・Tương ứng ACSMS-MSG-005-004
・Mục tùy chọn, tối đa 100 ký tự
・Không dùng type="email" native của browser (quy tắc dự án: vue.md §「NEVER use HTML5 native input types for validation」)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-034 — 住所 — Tùy chọn / Giới hạn tối đa 200 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 住所, đăng ký

ステップ2：
Nhập `東京都千代田区丸の内1-1-1` → đăng ký

ステップ3：
Nhập 200 ký tự → đăng ký

ステップ4：
Thử nhập ký tự thứ 201

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn)

ステップ2：
Tiếp nhận bình thường

ステップ3：
Tiếp nhận bình thường (giá trị biên)

ステップ4：
maxlength chặn ký tự thứ 201

補足：
・Mục tùy chọn, cho phép full-width / half-width mix, tối đa 200 ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-035 — 担当部署名・担当者名 — Tùy chọn / Giới hạn độ dài tối đa

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 担当部署名 và 担当者名, đăng ký

ステップ2：
Nhập 100 ký tự vào 担当部署名, 50 ký tự vào 担当者名 → đăng ký

ステップ3：
Thử nhập ký tự thứ 101 vào 担当部署名, ký tự thứ 51 vào 担当者名

### 期待結果

ステップ1：
Tiếp nhận bình thường (cả hai đều là mục tùy chọn)

ステップ2：
Tiếp nhận bình thường, lưu vào DB

ステップ3：
maxlength chặn nhập

補足：
・担当部署名: tùy chọn, tối đa 100 ký tự
・担当者名: tùy chọn, tối đa 50 ký tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-036 — 税区分 — Bắt buộc / Giá trị lựa chọn (1: 内税 / 2: 外税)

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để 税区分 chưa chọn, đăng ký

ステップ2：
Chọn `内税` (1) → đăng ký → kiểm tra DB

ステップ3：
Chọn `外税` (2) → đăng ký → kiểm tra DB

ステップ4：
Trên DevTools, gửi POST `/api/v1/ja` với `zei_kubun: '9'`

### 期待結果

ステップ1：
Hiển thị「必須項目です。」
HTTP status code: 400
error_code: VALIDATION_ERROR
errors[] chứa { field: "zei_kubun", message: "税区分を選択してください" }

ステップ2：
Tiếp nhận bình thường, lưu với `m_ja.zei_kubun = '1'`

ステップ3：
Tiếp nhận bình thường, lưu với `m_ja.zei_kubun = '2'`

ステップ4：
HTTP status code: 400
error_code: VALIDATION_ERROR

補足：
・Cố định 1 ký tự, chỉ cho phép `1` hoặc `2`
・Quản lý trong category m_code ZEI_KUBUN, nhưng màn hình này cố định 2 lựa chọn radio

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-037 — 備考 — Tùy chọn / Giới hạn tối đa 500 ký tự

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, các mục khác đã nhập giá trị hợp lệ

### 手順

ステップ1：
Để trống 備考, đăng ký

ステップ2：
Nhập 500 ký tự → đăng ký

ステップ3：
Thử nhập ký tự thứ 501

ステップ4：
Nhập text nhiều dòng có line break → đăng ký

### 期待結果

ステップ1：
Tiếp nhận bình thường (mục tùy chọn)

ステップ2：
Tiếp nhận bình thường (giá trị biên)

ステップ3：
maxlength chặn ký tự thứ 501

ステップ4：
Lưu giữ line break trong DB

補足：
・Mục tùy chọn, tối đa 500 ký tự, cho phép line break
・Hiển thị dưới dạng textarea

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-005-038 — Đăng ký mới — Đăng ký toàn bộ mục normal case (DB + log kiểm toán)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, toàn bộ mục đã nhập giá trị hợp lệ
  - ・Test data: JAコード=1301999001, JA名=JA東京テスト, JA名カナ=ジェイエイトウキョウテスト, 都道府県=13, 中央会フラグ=false, 金融機関コード=1234, 金融機関名=農林中央金庫, 郵便番号=1000001, 住所=東京都千代田区, 電話=0312345678, FAX=0312345679, メール=test@example.jp, 担当部署=総務部, 担当者=田中太郎, 税区分=1, 備考=テスト

### 手順

ステップ1：
Nhập giá trị hợp lệ vào toàn bộ mục → nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT * FROM m_ja WHERE ja_code='1301999001'`

ステップ3：
Kiểm tra log kiểm toán: `SELECT * FROM t_log WHERE target_table='m_ja' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
HTTP status code: 201
message:「登録しました。」
Toast「登録しました。」hiển thị
Redirect về màn hình danh sách `/ja`

ステップ2：
1 row mới trong `m_ja`, toàn bộ column khớp với giá trị input, `created_at` là thời điểm hiện tại, `deleted_at` là NULL

ステップ3：
1 row, log_type=1 (log thao tác), operation='CREATE', result_status=1 (thành công), target_table='m_ja', target_id=ja_id mới, before_value=rỗng, after_value=JSON data đăng ký

補足：
・Persist đúng vào DB
・Log kiểm toán ghi event CREATE (before_value rỗng, after_value JSON đầy đủ)
・Main DML + log kiểm toán commit trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-039 — Đăng ký mới — Đăng ký với chỉ các mục bắt buộc

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký
  - ・Test data (chỉ mục bắt buộc): JAコード=1301999002, JA名=JAテスト最小, 都道府県=13, 中央会フラグ=false, 金融機関コード=1234, 金融機関名=農林中央金庫, 税区分=1

### 手順

ステップ1：
Chỉ nhập các mục bắt buộc, để trống các mục tùy chọn rồi nhấn button đăng ký

ステップ2：
Kiểm tra DB: `SELECT * FROM m_ja WHERE ja_code='1301999002'`

### 期待結果

ステップ1：
HTTP status code: 201
Toast「登録しました。」hiển thị
Redirect về màn hình danh sách `/ja`

ステップ2：
1 row mới, mục bắt buộc đúng giá trị input, mục tùy chọn (JA名カナ, 郵便番号, 住所, 電話, FAX, メール, 担当部署, 担当者, 備考) là chuỗi rỗng hoặc NULL

補足：
・Có thể đăng ký bình thường khi mục tùy chọn để trống
・Mục nullable lưu NULL, mục NOT NULL (biko v.v.) lưu chuỗi rỗng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-040 — Đăng ký mới — Lỗi khi JAコード trùng

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: `ja_code='1301001001'` đã đăng ký (deleted_at IS NULL)

### 手順

ステップ1：
Nhập `1301001001` vào JAコード, các mục khác giá trị hợp lệ rồi đăng ký

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán: `t_log` có log thất bại với `result_status = 2`

### 期待結果

ステップ1：
HTTP status code: 400
error_code: DUPLICATE_CODE
message:「JAコード「1301001001」はすでに登録されています。」
Đăng ký thất bại, message hiển thị ngay dưới mục trên màn hình

ステップ2：
Không có row mới, `1301001001` chỉ có 1 row trong `m_ja`

ステップ3：
Log thất bại được ghi (log_type=3), xác nhận transaction rollback

補足：
・Phát hiện trùng → transaction rollback → log thất bại được ghi
・Tương ứng ACSMS-MSG-005-009

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-041 — Đăng ký mới — Validation tổng hợp khi toàn bộ field chưa nhập

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, toàn bộ field rỗng

### 手順

ステップ1：
Không nhập gì, nhấn button đăng ký

ステップ2：
Kiểm tra error message của từng mục bắt buộc

### 期待結果

ステップ1：
HTTP status code: 400
error_code: VALIDATION_ERROR
Response body chứa array `errors: [{ field, message }]`
Mỗi mục bắt buộc hiển thị「必須項目です。」ngay dưới, gửi bị chặn

ステップ2：
7 mục JAコード, JA名, 都道府県, 中央会フラグ, 金融機関コード, 金融機関名, 税区分 trả về field name và message tương ứng trong array `errors`

補足：
・Gửi thất bại, hiển thị nhiều vi phạm bắt buộc đồng thời
・Không có row mới trong DB
・Mục tùy chọn (JA名カナ, 郵便番号, 住所, 電話, FAX, メール, 担当部署, 担当者, 備考) không phải đối tượng lỗi bắt buộc

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-042 — Đăng ký mới — Xử lý khi system error

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, đã nhập giá trị hợp lệ
  - ・Trigger lỗi nội bộ phía backend (chỉ test environment)

### 手順

ステップ1：
Nhấn button đăng ký → BE xảy ra lỗi 500

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Kiểm tra DB

ステップ4：
Kiểm tra log lỗi

### 期待結果

ステップ1：
HTTP status code: 500
error_code: INTERNAL_SERVER_ERROR
Toast「システムエラーが発生しました。しばらくしてから再度お試しください。」hiển thị

ステップ2：
Vẫn ở màn hình đăng ký, giữ nguyên giá trị input

ステップ3：
Không có row mới

ステップ4：
Log với log_type=3 (lỗi), result_status=2 được ghi vào `t_log`

補足：
・Hiển thị error message hướng người dùng
・Transaction rollback, duy trì tính toàn vẹn data
・Có thể debug bằng log lỗi (ghi error_message + stack_trace)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-043 — Đăng ký mới — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, đã nhập giá trị hợp lệ
  - ・Chuyển Network tab DevTools sang chế độ mất kết nối mạng

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Sau khi mạng được phục hồi, nhấn lại button đăng ký

### 期待結果

ステップ1：
Toast「ネットワークエラーが発生しました。接続をご確認ください。」hiển thị

ステップ2：
Vẫn ở màn hình đăng ký, giữ nguyên giá trị input

ステップ3：
Đăng ký thành công bình thường, HTTP status code: 201

補足：
・Phát hiện network error → thông báo cho user
・Giá trị input được giữ, có thể gửi lại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-044 — Đăng ký mới — Hủy bằng button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Nhấn button「前の画面に戻る」

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán

### 期待結果

ステップ1：
Khi có thay đổi chưa lưu, hiển thị dialog cảnh báo
Chọn「離れる」→ chuyển về màn hình danh sách `/ja`

ステップ2：
Không có row mới

ステップ3：
Không có log entry (cancel không được ghi log)

補足：
・Hủy không thay đổi DB, không ghi log
・Khi có thay đổi chưa lưu thì hiện cảnh báo `beforeunload`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-045 — Trạng thái DB và log khi đăng ký mới thất bại (phòng commit không hợp lệ)

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Cấu hình mock cho INSERT log kiểm toán phía backend thất bại trong test environment

### 手順

ステップ1：
Nhấn button đăng ký với input bình thường

ステップ2：
Kiểm tra `m_ja`

ステップ3：
Kiểm tra `t_log`

### 期待結果

ステップ1：
INSERT log kiểm toán sau main DML thất bại → transaction rollback

ステップ2：
Không có row mới (rollback hoàn tất)

ステップ3：
Không có log thành công, nhưng có log lỗi (catch ngoài, log_type=3)

補足：
・Log kiểm toán thất bại → 業務 ghi rollback duy trì tính toàn vẹn
・Theo quy tắc `nestjs.md §I/O & External Services / Transaction`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Test critical đảm bảo tính toàn vẹn giữa log kiểm toán và DB state.

---

# カテゴリ 6: Logic nghiệp vụ — Cập nhật (Function — Edit)

## ACSMS-TC-005-046 — Màn hình chỉnh sửa — Hiển thị dữ liệu hiện có

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001)
  - ・Test data có sẵn: `ja_id=1, ja_code='1301001001', ja_name='JA東京中央'` thuộc ja-001

### 手順

ステップ1：
Trên màn hình danh sách JA, click link「編集」của `1301001001`

ステップ2：
Kiểm tra giá trị ban đầu của từng field

### 期待結果

ステップ1：
Mở màn hình `/ja/1/edit`

ステップ2：
Khớp hoàn toàn với giá trị DB — JAコード / JA名 / JA名カナ / 都道府県 / 中央会フラグ / 金融機関コード / 金融機関名 / 郵便番号 / 住所 / 電話 / FAX / メール / 担当部署 / 担当者 / 税区分 / 備考 tất cả

補足：
・Giá trị DB hiển thị đúng trên form qua GET `/api/v1/ja/1`
・Đối với JA_HONTEN, các mục ngoài đối tượng ※4 (JA名, JA名カナ, 都道府県, 中央会フラグ, 金融機関コード, 金融機関名) hiển thị read-only
・JAコード read-only chung cho tất cả role

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-047 — Màn hình chỉnh sửa — JAコード không thể thay đổi (read-only)

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: `ja_id=1, ja_code='1301001001'`
  - ・Màn hình chỉnh sửa `/ja/1/edit` đang hiển thị

### 手順

ステップ1：
Mắt thường xác nhận ô「JAコード」đang ở trạng thái disabled trên màn hình

ステップ2：
Kiểm tra attribute `disabled` và class `ant-input-disabled` của input element bằng DevTools

ステップ3：
Trên DevTools Console, chạy `fetch('/api/v1/ja/1', { method: 'PUT', body: JSON.stringify({ ja_code: 'HACK999999', ja_name: 'JA東京中央', todofuken_code: '13', chuokai_flg: true, bank_code: '1234', bank_name: '農林中央金庫', zei_kubun: '1' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ4：
Kiểm tra DB: `SELECT ja_code FROM m_ja WHERE ja_id=1`

### 期待結果

ステップ1：
Ô JAコード hiển thị ở trạng thái disabled, user không thể chỉnh sửa

ステップ2：
Có attribute `disabled`, class `ant-input-disabled` đã được áp dụng

ステップ3：
HTTP status code: 200 (cập nhật bản thân thành công)

ステップ4：
Column `ja_code` vẫn là `1301001001` (theo allow-list field-level Layer 3 phía backend, thay đổi `ja_code` bị silent drop)

補足：
・api.md「`ja_code` không thể cập nhật (không thể thay đổi sau khi tạo)」+ allow-list field security.md Layer 3, phòng thủ 2 lớp
・`:disabled` phía FE chỉ là UX, ranh giới security thực tế là allow-list phía backend
・Mục khác (JA名 v.v.) cập nhật bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-048 — Chỉnh sửa — NICHINO_ADMIN cập nhật toàn bộ mục thành công

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: `ja_id=1` ở state có thể chỉnh sửa
  - ・Input chỉnh sửa: JA名=JA東京中央（改定）, 住所=東京都千代田区丸の内2-2-2, 税区分=2

### 手順

ステップ1：
Thay đổi giá trị trên màn hình chỉnh sửa → nhấn button cập nhật

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán: `SELECT * FROM t_log WHERE target_id = 1 AND operation = 'UPDATE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
HTTP status code: 200
message:「更新しました。」
Toast「更新しました。」hiển thị
Redirect về màn hình danh sách `/ja`

ステップ2：
`m_ja.ja_name = 'JA東京中央（改定）'`, `address = '東京都千代田区丸の内2-2-2'`, `zei_kubun = '2'`, `updated_at` là thời điểm hiện tại

ステップ3：
1 row, log_type=1, operation='UPDATE', result_status=1, JSON `before_value` chứa giá trị cũ, JSON `after_value` chứa giá trị mới

補足：
・Cập nhật DB thành công, `updated_at` tự động cập nhật
・So sánh hoàn chỉnh trước-sau cập nhật bằng log kiểm toán
・Main DML + log kiểm toán commit trong cùng 1 transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-049 — Chỉnh sửa — CHUOKAI cập nhật mục một phần thành công (chỉ đối tượng ※4)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (JA thuộc phạm vi quản lý: ja-001)
  - ・Test data có sẵn: `ja_id=1` thuộc phạm vi quản lý, ở state có thể chỉnh sửa
  - ・Input chỉnh sửa: 郵便番号=1000002, 住所=東京都千代田区丸の内3-3-3, 電話=0322334455

### 手順

ステップ1：
Chỉ thay đổi giá trị các mục đối tượng ※4 trên màn hình chỉnh sửa → nhấn button cập nhật

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán

### 期待結果

ステップ1：
HTTP status code: 200
Toast「更新しました。」hiển thị
Redirect về màn hình danh sách `/ja`

ステップ2：
Chỉ các mục đối tượng ※4 (郵便番号, 住所, 電話) được cập nhật, các mục khác (JA名, JA名カナ, 都道府県, 中央会フラグ, 金融機関コード, 金融機関名) không thay đổi

ステップ3：
1 row, operation='UPDATE', result_status=1, `before_value` / `after_value` chỉ ghi diff các mục đã thay đổi

補足：
・Mục có thể cập nhật của CHUOKAI / JA_HONTEN: 郵便番号, 住所, 電話, FAX, メール, 担当部署, 担当者, 税区分, 備考 (※4)
・Các mục ngoài đối tượng ※4 bị silent drop phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-050 — Chỉnh sửa — Field-level restriction khi CHUOKAI cập nhật bao gồm mục bị hạn chế

- 観点ID: VP-A-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI (JA thuộc phạm vi quản lý: ja-001)
  - ・Test data có sẵn: `ja_id=1, ja_name='JA東京中央', bank_code='1234'` thuộc phạm vi quản lý

### 手順

ステップ1：
Mắt thường xác nhận các ô JA名 / JA名カナ / 都道府県 / 中央会フラグ / 金融機関コード / 金融機関名 đang ở trạng thái disabled trên màn hình

ステップ2：
Trên DevTools Console, chạy `fetch('/api/v1/ja/1', { method: 'PUT', body: JSON.stringify({ ja_name: 'HACK名前', bank_code: '9999', address: '正しい住所', zei_kubun: '1' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ3：
Kiểm tra DB: `SELECT ja_name, bank_code, address FROM m_ja WHERE ja_id=1`

### 期待結果

ステップ1：
Toàn bộ mục ngoài đối tượng ※4 có attribute `disabled`, class `ant-input-disabled` đã được áp dụng

ステップ2：
HTTP status code: 200 (cập nhật bản thân thành công)

ステップ3：
`ja_name = 'JA東京中央'` (không thay đổi), `bank_code = '1234'` (không thay đổi), `address = '正しい住所'` (được thay đổi)

補足：
・security.md Layer 3 — allow-list field: CHUOKAI / JA_HONTEN chỉ cập nhật được yubin_no, address, tel, fax, email, tanto_busho, tanto_name, zei_kubun, biko
・Các mục ngoài đối tượng ※4 bị `filterAllowedFields` phía backend silent drop
・`:disabled` của FE chỉ là UX, ranh giới security thực tế là allow-list phía backend

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical về security — Nếu field-level restriction không hoạt động sẽ thành bug leo thang quyền.

## ACSMS-TC-005-051 — Chỉnh sửa — JA_HONTEN cập nhật mục một phần thành công

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (JA của mình: ja-001)
  - ・Test data có sẵn: `ja_id=1` JA của mình, ở state có thể chỉnh sửa
  - ・Input chỉnh sửa: メール=info-new@example.jp, 担当部署=営業部, 担当者=鈴木花子

### 手順

ステップ1：
Chỉ thay đổi giá trị các mục đối tượng ※4 trên màn hình chỉnh sửa → nhấn button cập nhật

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán

### 期待結果

ステップ1：
HTTP status code: 200
Toast「更新しました。」hiển thị
Redirect về màn hình danh sách `/ja`

ステップ2：
Chỉ các mục đối tượng ※4 (メール, 担当部署, 担当者) được cập nhật, các mục khác không thay đổi

ステップ3：
1 row, operation='UPDATE', result_status=1, ghi với `ja_id=1`

補足：
・JA_HONTEN chỉ thao tác được JA của mình, hạn chế ※4 giống CHUOKAI
・updated_at là thời điểm hiện tại, `updated_by` là account_id của test account

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-052 — Chỉnh sửa — Xử lý xung đột khi chỉnh sửa đồng thời (楽観ロック)

- 観点ID: VP-C-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Test data có sẵn: `ja_id=1` tồn tại
  - ・User A: ở browser A đang nhập trên `/ja/1/edit`
  - ・User B: ở browser B chỉnh sửa cùng record, lưu trước

### 手順

ステップ1：
User B nhấn button cập nhật trước với giá trị hợp lệ → thành công

ステップ2：
User A nhấn button cập nhật (với `updated_at` cũ)

ステップ3：
Reload màn hình User A

### 期待結果

ステップ1：
DB `updated_at` được cập nhật, thay đổi của User B được phản ánh

ステップ2：
Phát hiện xung đột, trả về HTTP 409, gửi bị chặn (`error_code` là lỗi xung đột 楽観ロック: spec chưa định nghĩa / TBD)

ステップ3：
Nội dung cập nhật của User B được phản ánh, có thể chỉnh sửa lại

補足：
・楽観ロック phòng chống 更新ロスト
・TBD: error_code và toast literal khi xung đột 楽観ロック chưa được định nghĩa trong api.md / screen-design.md. Cập nhật sau khi spec được xác định.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Phòng chống 更新ロスト — JA Master là parent record của 購読者・販売店 v.v., ảnh hưởng nghiêm trọng đến tính toàn vẹn data.

## ACSMS-TC-005-053 — Chỉnh sửa — Xử lý lỗi system / network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình chỉnh sửa, đã nhập giá trị hợp lệ

### 手順

ステップ1：
Trigger lỗi 500 phía backend → nhấn button cập nhật

ステップ2：
Mất kết nối mạng → nhấn button cập nhật

ステップ3：
Kiểm tra DB từng case

### 期待結果

ステップ1：
Toast「システムエラーが発生しました。しばらくしてから再度お試しください。」hiển thị
Vẫn ở màn hình chỉnh sửa, giữ nguyên giá trị input

ステップ2：
Toast「ネットワークエラーが発生しました。接続をご確認ください。」hiển thị
Giữ nguyên giá trị input

ステップ3：
Không được cập nhật, duy trì tính toàn vẹn

補足：
・Cả 2 case lỗi đều duy trì tính toàn vẹn data
・Log lỗi (log_type=3) được ghi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-054 — Chỉnh sửa — Hủy bằng button quay lại

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình chỉnh sửa, đã thay đổi input

### 手順

ステップ1：
Nhấn button「前の画面に戻る」

ステップ2：
Kiểm tra DB

ステップ3：
Kiểm tra log kiểm toán

### 期待結果

ステップ1：
Khi có thay đổi chưa lưu, hiển thị dialog cảnh báo
Chọn「離れる」→ chuyển về màn hình danh sách `/ja`

ステップ2：
Không được cập nhật, giữ nguyên giá trị cũ

ステップ3：
Không có log UPDATE

補足：
・Hủy không thay đổi DB, không ghi log
・Khi có thay đổi chưa lưu thì hiện cảnh báo `beforeunload`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-055 — Chỉnh sửa — Tính toàn vẹn log kiểm toán trước-sau cập nhật

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: `ja_id=1` đã đăng ký (có log CREATE), chưa chỉnh sửa

### 手順

ステップ1：
Kiểm tra log trước chỉnh sửa: `SELECT * FROM t_log WHERE target_id = 1 AND target_table = 'm_ja' ORDER BY log_datetime ASC`

ステップ2：
Thay đổi JA名 trên màn hình chỉnh sửa → cập nhật

ステップ3：
Kiểm tra log sau chỉnh sửa: query giống trên

ステップ4：
Kiểm tra nội dung JSON `before_value` và `after_value`

### 期待結果

ステップ1：
Chỉ tồn tại 1 row (log CREATE), `before_value` rỗng, `after_value` chứa toàn bộ mục lúc đăng ký

ステップ2：
Cập nhật thành công, Toast「更新しました。」hiển thị

ステップ3：
Tồn tại 2 row (log CREATE + log UPDATE)

ステップ4：
JSON `before_value` của log UPDATE chứa giá trị trước chỉnh sửa, JSON `after_value` chứa giá trị sau chỉnh sửa, diff giữa 2 JSON chỉ là JA名

補足：
・So sánh hoàn chỉnh trước-sau cập nhật bằng log kiểm toán
・Toàn bộ 16 mục (trừ JAコード) được serialize sang JSON

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-005-056 — Lỗi chung — UNAUTHORIZED — Xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ trên màn hình đăng ký
  - ・Đã quá 24 giờ kể từ thao tác cuối, Redis session TTL đã hết hạn

### 手順

ステップ1：
Nhấn button「登録」, gửi API request

ステップ2：
Kiểm tra response và chuyển trang màn hình

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE ja_code='1301999099'`

### 期待結果

ステップ1：
HTTP status code: 401
error_code: UNAUTHORIZED
message:「セッションが切れました。再度ログインしてください。」trả về

ステップ2：
FE clear trạng thái user của Pinia auth store, tự động chuyển về `/login?redirect=/ja/create`

ステップ3：
0 record (không có row mới)

補足：
・Khi session hết hạn, SessionAuthGuard phía backend trả về 401, axios interceptor phía FE đồng nhất chuyển hướng về màn hình login
・Giá trị input bị hủy (cần nhập lại sau khi đăng nhập lại)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-057 — Lỗi chung — TOO_MANY_REQUESTS — Vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã nhập giá trị hợp lệ trên màn hình đăng ký
  - ・Script test gửi POST `/api/v1/ja` vượt 100 request trong 1 phút

### 手順

ステップ1：
Khởi động script, gửi request tần suất cao đến API đăng ký

ステップ2：
Kiểm tra HTTP status và error_code response

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
100 request đầu phản hồi bình thường, sau đó trả về 429

ステップ2：
HTTP status code: 429
error_code: TOO_MANY_REQUESTS
message:「リクエスト回数が上限を超えました。しばらくしてから再度お試しください。」

ステップ3：
Toast「リクエスト回数が上限を超えました。しばらくしてから再度お試しください。」hiển thị, button đăng ký tạm vô hiệu

補足：
・NestJS @Throttle decorator + rate limit AWS WAF chặn ở 2 lớp infra/app
・Tuân thủ quan điểm VP-A-08「レート制限・Throttling」(testcase-viewpoints.md v1.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-058 — Lỗi chung — BAD_REQUEST — Request parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đang mở Network tab DevTools

### 手順

ステップ1：
Trên DevTools Console, chạy `fetch('/api/v1/ja', { method: 'POST', body: '{invalid json', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ2：
Kiểm tra HTTP status và error_code response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM m_ja WHERE ja_code='MAL999'`

### 期待結果

ステップ1：
Request bị body parser phía backend từ chối

ステップ2：
HTTP status code: 400
error_code: BAD_REQUEST
message:「リクエストパラメータが不正です。」

ステップ3：
0 record (không có row mới)

補足：
・JSON parse error, Content-Type không hợp lệ, parameter không xác định v.v. tất cả đều map về BAD_REQUEST
・`t_log` có log lỗi log_type=3 được ghi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-059 — Lỗi chung — VALIDATION_ERROR — Kiểm tra hình dáng array errors[]

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, nhập giá trị không hợp lệ ở nhiều field (JAコード=rỗng, JA名=rỗng, 金融機関コード=`abc`, メール=`invalid`)

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra hình dáng array `errors` của response body

ステップ3：
Kiểm tra hiển thị error message ngay dưới mỗi mục phía màn hình

### 期待結果

ステップ1：
HTTP status code: 400
error_code: VALIDATION_ERROR
message:「入力値が不正です。詳細はerrorsフィールドを確認してください。」

ステップ2：
Array `errors` chứa nhiều entry:
・{ field: "ja_code", message: "JAコードを入力してください" }
・{ field: "ja_name", message: "JA名を入力してください" }
・{ field: "bank_code", message: "金融機関コードは半角数字4桁で入力してください" }
・{ field: "email", message: "有効なメールアドレスを入力してください。" }

ステップ3：
Mỗi mục hiển thị error message tiếng Nhật tương ứng ngay dưới (bind vào `<a-form-item :help>` qua `useApiForm`)

補足：
・Trả về vi phạm của nhiều field cùng lúc trong 1 request
・`useApiForm` chuyển `errors[]` sang `fieldErrors`, hiển thị vào `:help` của từng `<a-form-item>`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-060 — Lỗi chung — INTERNAL_SERVER_ERROR — Mô phỏng server crash

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Màn hình đăng ký, đã nhập giá trị hợp lệ
  - ・Cố ý ngắt kết nối DB phía backend (test environment)

### 手順

ステップ1：
Nhấn button đăng ký

ステップ2：
Kiểm tra HTTP status và error_code response

ステップ3：
Kiểm tra trạng thái màn hình

ステップ4：
Kiểm tra log lỗi: `SELECT * FROM t_log WHERE result_status=2 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Backend phát sinh exception, log lỗi được ghi ở catch block ngoài

ステップ2：
HTTP status code: 500
error_code: INTERNAL_SERVER_ERROR
message:「システムエラーが発生しました。しばらくしてから再度お試しください。」

ステップ3：
Vẫn ở màn hình đăng ký, Toast「システムエラーが発生しました。しばらくしてから再度お試しください。」hiển thị, giữ nguyên giá trị input

ステップ4：
1 row log lỗi với log_type=3, `error_message` chứa exception message, `stack_trace` chứa lịch sử gọi

補足：
・Log lỗi được ghi ngoài transaction (do transaction nghiệp vụ đã rollback)
・Không lộ thông tin nội bộ như stack trace ra phía user

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-061 — Lỗi chung — NOT_FOUND — Xử lý khi truy cập chỉnh sửa JA đã xóa

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Test data có sẵn: record JA (ja_id = 999) đã xóa (hoặc không tồn tại)

### 手順

ステップ1：
Nhập `/ja/999/edit` vào address bar browser, truy cập trực tiếp

ステップ2：
Trên Network tab DevTools, xác nhận GET `/api/v1/ja/999`

### 期待結果

ステップ1：
Chuyển trang thất bại, hiển thị toast lỗi

ステップ2：
HTTP status code: 404
error_code: NOT_FOUND
message:「指定されたJAが見つかりません。」

補足：
・Truy cập tài nguyên không tồn tại / đã xóa (deleted_at IS NOT NULL) đồng nhất trả về NOT_FOUND
・Tương ứng ACSMS-MSG-005-010 (phân biệt với message hiển thị màn hình「JA #{id} が見つかりません。」)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-005-062 — Lỗi chung — DATA_SCOPE_VIOLATION — Xử lý khi truy cập chỉnh sửa JA ngoài scope

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (JA của mình: ja-001)
  - ・Test data có sẵn: record JA khác (ja_id = 2) tồn tại

### 手順

ステップ1：
Nhập `/ja/2/edit` (JA khác) vào address bar browser, truy cập trực tiếp

ステップ2：
Trên Network tab DevTools, xác nhận GET `/api/v1/ja/2`

ステップ3：
Trên DevTools Console, chạy `fetch('/api/v1/ja/2', { method: 'PUT', body: JSON.stringify({ ja_name: 'HACK', todofuken_code: '13', chuokai_flg: false, bank_code: '1234', bank_name: '農林中央金庫', zei_kubun: '1' }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`

ステップ4：
Kiểm tra DB: `SELECT ja_name FROM m_ja WHERE ja_id=2`

### 期待結果

ステップ1：
Chuyển trang thất bại, hiển thị toast lỗi

ステップ2：
HTTP status code: 404
error_code: NOT_FOUND
message:「指定されたJAが見つかりません。」

ステップ3：
HTTP status code: 404
error_code: NOT_FOUND
message:「指定されたJAが見つかりません。」

ステップ4：
Column `ja_name` vẫn là giá trị gốc (không thay đổi)

補足：
・Truy cập trực tiếp ngoài scope trả về HTTP 404 (NOT_FOUND) để ẩn sự tồn tại
・api.md エラー一覧 định nghĩa DATA_SCOPE_VIOLATION (403), nhưng implementation theo quy tắc `assertJaScope` của security.md, ưu tiên 404 masking
・`t_log` có log lỗi (log_type=3) được ghi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical về security — bug bypass DataScope là rủi ro rò rỉ thông tin multi-tenant.

---
