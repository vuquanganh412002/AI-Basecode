---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-014
screen_name: 購読者明細検索画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-03
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-06-03 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |
| 2 | 2026-08-06 | 1.1 | Tran Duc Tuyen | Bổ sung 7 ca kiểm thử (044〜050): thay đổi・hủy bỏ đặt trước ngừng đọc báo của bản điện tử (#56087, 5 ca — đồng bộ với bản tiếng Nhật), hiển thị tổng số bản "全 M 部" bên cạnh "全 N 件" (#56240), và giới hạn chỉ bản giấy mới được xóa (#56422) |  |  |


## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA,
cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đặt mua, quản lý dữ liệu chuyển khoản tự động.
Các chức năng chính bao gồm đăng ký・cập nhật・tìm kiếm thông tin độc giả,
quản lý lịch sử thay đổi nội dung đặt mua, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng upload・download file, quản lý thông báo hệ thống.
Ngoài ra còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của user, ghi lịch sử đăng nhập,
ghi log thao tác của user.

## 資料目的

Đây là tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống cho màn hình「購読者明細検索画面（ACSMS-SCR-014）」.
Tài liệu này tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau.

- Mỗi testcase được tạo dựa trên một kịch bản đơn lẻ (single responsibility).
- Các bước được mô tả ở mức độ có thể tái hiện, nêu rõ test data.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-014 | Tài liệu thiết kế màn hình 購読者明細検索画面 |
| 2 | ACSMS-SCR-014-api | Tài liệu thiết kế API 購読者明細検索 |
| 3 | testcase-viewpoints | Danh sách viewpoint test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình・Responsive (Layout & Responsive) | 7 |
| 3 | Kiểm tra input (Input Validation) | 8 |
| 4 | Logic nghiệp vụ — Tìm kiếm・Xóa・Xuất Excel (Function — Search / Delete / Export) | 16 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
| 6 | Ngừng đọc báo・Hiển thị tổng số bản・Giới hạn xóa (Function — Stop / Total-busu / Delete) | 7 |
|  | 合計 | 50 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-014-001 — Cấm truy cập màn hình 購読者明細検索画面 (NICHINO_ADMIN)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Mở dashboard, kiểm tra mục「購読者明細検索画面」ở section「購読者管理」trên sidebar

ステップ2：
Nhập trực tiếp `/dokusya` vào address bar của browser và truy cập trực tiếp

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya?page=1&per_page=20` qua DevTools

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 't_dokusya' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Mục「購読者明細検索画面」không hiển thị trên sidebar (NICHINO_ADMIN không có quyền `dokusya.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。`, đồng thời chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

ステップ4：
・Có ít nhất 1 error log được ghi
・`account_id` khớp với tài khoản test

補足：
・Theo ma trận quyền `account_concept.md`, chức năng quản lý độc giả nằm ngoài phạm vi của 日農 (管理者・担当者) (×)
・Bị chặn ở cả 3 tầng: FE menu, FE router guard, BE API guard

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — nếu fail nghĩa là bypass RBAC, xử lý như sự cố bảo mật.

## ACSMS-TC-014-002 — Cấm truy cập màn hình 購読者明細検索画面 (NICHINO_STAFF)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra mục「購読者明細検索画面」trên sidebar

ステップ2：
Truy cập trực tiếp URL `/dokusya`

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya?page=1&per_page=20` qua DevTools

### 期待結果

ステップ1：
Mục「購読者明細検索画面」không hiển thị trên sidebar (NICHINO_STAFF không có quyền `dokusya.view`)

ステップ2：
Hiển thị toast `アクセス権がありません。`, đồng thời chuyển về `/dashboard`

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Theo ma trận quyền `account_concept.md`, chức năng quản lý độc giả nằm ngoài phạm vi của 日農 (担当者) (×)
・日農 (担当者) chỉ có thể nhập thay販売店代行入力, không thể tham chiếu・xóa・xuất độc giả

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-003 — Truy cập màn hình 購読者明細検索画面 bởi CHUOKAI (chỉ xem JA quản hạt của trung ương hội mình + được xóa)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001)
  - ・Test data: độc giả của JA quản hạt trung ương hội mình (ja-001), độc giả của JA thuộc trung ương hội khác (ja-101) đã được đăng ký

### 手順

ステップ1：
Kiểm tra mục「購読者明細検索画面」trên sidebar

ステップ2：
Click「購読者明細検索画面」→ kiểm tra nội dung hiển thị màn hình list

ステップ3：
Kiểm tra cột「操作」của bảng list

ステップ4：
Kiểm tra trạng thái button「購読者情報登録」và button「Excel出力」ở góc trên phải màn hình

ステップ5：
Gọi trực tiếp GET `/api/v1/dokusya?page=1&per_page=20` qua DevTools, kiểm tra response

### 期待結果

ステップ1：
Mục「購読者明細検索画面」hiển thị trên sidebar (có quyền `dokusya.view`)

ステップ2：
Màn hình 購読者明細検索画面 hiển thị bình thường. Trong list chỉ hiển thị độc giả của JA quản hạt trung ương hội mình (ja-001), độc giả của ja-101 không hiển thị

ステップ3：
Link「削除」hiển thị ở trạng thái active (có quyền `dokusya.delete`). Tuy nhiên dòng có `is_read_only=true` (người thanh toán thẻ tín dụng bản điện tử・người đọc kép) thì ở trạng thái disable

ステップ4：
Button「購読者情報登録」hiển thị ở trạng thái active (có quyền `dokusya.create`). Button「Excel出力」hiển thị ở trạng thái active (có quyền `dokusya.view`)

ステップ5：
Trả về HTTP 200 (mảng `data` chỉ chứa độc giả của JA quản hạt trung ương hội mình, `meta.total` khớp với số lượng sau khi áp dụng DataScope)

補足：
・CHUOKAI có quyền `dokusya.view` / `dokusya.create` / `dokusya.delete`
・Theo DataScope, chỉ xem được độc giả của JA quản hạt trung ương hội mình (`d.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_id = :user_chuokai_id)`)
・Được cho phép ở cả 3 tầng: FE menu, FE router guard, BE API guard

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-004 — Truy cập màn hình 購読者明細検索画面 bởi JA_HONTEN (chỉ xem JA mình + được xóa)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja-001, JA mình = ja-001)
  - ・Test data: độc giả của JA mình (ja-001), độc giả của JA khác (ja-002) đã được đăng ký

### 手順

ステップ1：
Kiểm tra mục「購読者明細検索画面」trên sidebar

ステップ2：
Click「購読者明細検索画面」→ kiểm tra nội dung hiển thị màn hình list

ステップ3：
Kiểm tra trạng thái link「削除」ở cột「操作」, button「購読者情報登録」, button「Excel出力」

ステップ4：
Gọi trực tiếp GET `/api/v1/dokusya?page=1&per_page=20` qua DevTools

### 期待結果

ステップ1：
Mục「購読者明細検索画面」hiển thị trên sidebar (có quyền `dokusya.view`)

ステップ2：
Chỉ hiển thị độc giả của JA mình (ja-001), độc giả của JA khác (ja-002) không hiển thị

ステップ3：
Link「削除」(dòng `is_read_only=false`), button「購読者情報登録」, button「Excel出力」đều hiển thị ở trạng thái active (có quyền `dokusya.view` / `dokusya.create` / `dokusya.delete`)

ステップ4：
Trả về HTTP 200 (mảng `data` chỉ chứa độc giả của JA mình)

補足：
・JA_HONTEN có quyền `dokusya.view` / `dokusya.create` / `dokusya.delete`
・Theo DataScope, chỉ xem được độc giả của JA mình (`d.ja_id = :user_ja_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-005 — Truy cập màn hình 購読者明細検索画面 bởi JA_KANRI_SHITEN (chỉ xem chi nhánh quản lý mình + được xóa)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja-001 / chi nhánh quản lý kanri_shiten-001)
  - ・Test data: độc giả của chi nhánh quản lý mình (kanri_shiten-001), độc giả của chi nhánh quản lý khác cùng JA (kanri_shiten-002) đã được đăng ký

### 手順

ステップ1：
Kiểm tra mục「購読者明細検索画面」trên sidebar

ステップ2：
Click「購読者明細検索画面」→ kiểm tra nội dung hiển thị màn hình list

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya?page=1&per_page=20` qua DevTools

ステップ4：
Chỉ định ID độc giả của chi nhánh quản lý khác (kanri_shiten-002), gọi trực tiếp DELETE `/api/v1/dokusya/{id độc giả chi nhánh quản lý khác}` qua DevTools

### 期待結果

ステップ1：
Mục「購読者明細検索画面」hiển thị trên sidebar (có quyền `dokusya.view`)

ステップ2：
Chỉ hiển thị độc giả của chi nhánh quản lý mình (kanri_shiten-001), độc giả của chi nhánh quản lý khác (kanri_shiten-002) không hiển thị

ステップ3：
Trả về HTTP 200 (mảng `data` chỉ chứa độc giả của chi nhánh quản lý mình)

ステップ4：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。` (ẩn sự tồn tại bởi DataScope))

補足：
・JA_KANRI_SHITEN có quyền `dokusya.view` / `dokusya.create` / `dokusya.delete`
・Theo DataScope, chỉ xem được độc giả của chi nhánh quản lý mình (`d.ja_id = :user_ja_id AND d.kanri_shiten_id = :user_kanri_shiten_id`)
・Thao tác xóa record ngoài scope trả về HTTP 404 để ẩn sự tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 2: Hiển thị màn hình・Responsive (Layout & Responsive)

## ACSMS-TC-014-006 — Layout tổng thể màn hình tìm kiếm khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Click「購読者明細検索画面」từ sidebar, mở màn hình `/dokusya`

ステップ2：
So sánh màn hình với tài liệu thiết kế (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí từng section (header, breadcrumb, card form tìm kiếm, card bảng list, pagination)

### 期待結果

ステップ1：
Màn hình 購読者明細検索画面 được hiển thị

ステップ2：
Màu nền, font, cỡ chữ, padding, màu button, style ô input đều khớp

ステップ3：
Đúng theo thiết kế: header phía trên → breadcrumb → card form tìm kiếm → card bảng list (header + data + pagination) theo bố cục dọc

補足：
・Không có sai khác về mặt thị giác so với thiết kế
・design tokens (`design-tokens.ts`) được áp dụng (không có màu hardcode)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-007 — Hiển thị các phần tử form tìm kiếm (vùng hiển thị thường xuyên) đúng thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Kiểm tra các mục input vùng hiển thị thường xuyên (管理支店, 支店, 組合員コード, 氏名, かな氏名, 配達先住所, 配達販売店, 手続種類, 購読開始日, 購読中止日, 購読種別, 電子版承認ステータス)

ステップ2：
Kiểm tra option của mục pulldown (管理支店 / 支店 / 配達販売店), option của mục radio (手続種類 / 購読種別 / 電子版承認ステータス)

ステップ3：
Kiểm tra 2 ô input bắt đầu・kết thúc của mục khoảng ngày (購読開始日 / 購読中止日)

### 期待結果

ステップ1：
Từng mục input hiển thị đúng thiết kế. Placeholder và label đúng theo sheet định nghĩa mục màn hình

ステップ2：
・Radio của 手続種類 hiển thị「解約」「新規」
・Radio của 購読種別 hiển thị「紙版」「電子版」「併読」
・Radio của 電子版承認ステータス hiển thị「Web申込以外」「未承認」「承認済み」「否認」
・Option của pulldown lấy từ `m_code` và API dropdown dùng chung, DataScope được phản ánh

ステップ3：
購読開始日・購読中止日 mỗi mục có 2 ô input「開始日」「終了日」hiển thị nằm ngang phân cách bởi「-」

補足：
・Toàn bộ phần tử form khớp với thiết kế
・Mỗi mục tìm kiếm đều là mục tùy chọn (không có marker bắt buộc `*`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-008 — Mở rộng・thu gọn vùng tìm kiếm chi tiết

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Kiểm tra trạng thái vùng tìm kiếm chi tiết lúc hiển thị ban đầu

ステップ2：
Click button「詳細検索を表示」

ステップ3：
Kiểm tra các mục của vùng tìm kiếm chi tiết được mở rộng (引落元口座支店, 連絡先, メールアドレス, 請求開始月, 適用日, 支払方法, 郵送区分, 新聞単価, 備考)

ステップ4：
Click button「詳細検索を非表示」

### 期待結果

ステップ1：
Vùng tìm kiếm chi tiết ở trạng thái thu gọn (trạng thái ban đầu là ẩn)

ステップ2：
Vùng tìm kiếm chi tiết được mở rộng, label button đổi thành「詳細検索を非表示」

ステップ3：
引落元口座支店, 連絡先, メールアドレス, 請求開始月 (2 ô input bắt đầu・kết thúc・chọn tháng YYYYMM), 適用日 (2 ô input bắt đầu・kết thúc), 支払方法 (radio 7 lựa chọn: 口座引落・現金集金・振込集金・JA施設等・給与天引き・クレジットカード・その他), 郵送区分 (dropdown: 0:空 / 1:郵送), 新聞単価 (dropdown), 備考 (text・partial match) được hiển thị

ステップ4：
Vùng tìm kiếm chi tiết được thu gọn lại, label button trở về「詳細検索を表示」

補足：
・Việc mở rộng・thu gọn tìm kiếm chi tiết chỉ là thay đổi trạng thái màn hình, không kèm gọi API

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-009 — Hiển thị cột bảng kết quả tìm kiếm đúng thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm
  - ・Nhiều record độc giả đã được đăng ký

### 手順

ステップ1：
Kiểm tra dòng header của bảng list

ステップ2：
Kiểm tra hiển thị từng cell của dòng data

ステップ3：
Kiểm tra button「購読者情報登録」ở góc trên phải header card

### 期待結果

ステップ1：
Tiêu đề cột hiển thị từ trái sang「管理支店」「支店」「組合員コード」「購読者名」「連絡先1」「連絡先2」「配達先郵便」「配達先住所」「販売店コード」「販売店名」「購読開始日」「購読中止日」「操作」. Các cột「管理支店」「支店」「組合員コード」「販売店コード」「購読開始日」「購読中止日」có icon sort

ステップ2：
Giá trị từng cột DB hiển thị ở cell tương ứng. Cell「購読者名」hiển thị dạng link màu chủ đạo, click chuyển sang màn hình đăng ký thông tin độc giả (chế độ chỉnh sửa). Cell「操作」có link「削除」(màu đỏ)

ステップ3：
Header card bên trái có tiêu đề「購読者一覧」, bên phải có button「購読者情報登録」

補足：
・Toàn bộ cột khớp với bảng kết quả tìm kiếm thiết kế (mục #24-#37)
・Icon sort ở trạng thái trung lập ban đầu, chỉ hiển thị ▲ (tăng dần) / ▼ (giảm dần) khi áp dụng sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-010 — Hiển thị cột thao tác của độc giả read-only (người thanh toán thẻ tín dụng bản điện tử・người đọc kép)

- 観点ID: VP-C-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: 1 người thanh toán thẻ tín dụng bản điện tử (`dokusya_shubetsu=2 AND shiharai_hoho=6`), 1 người đọc kép (`dokusya_shubetsu=3`), 1 bản giấy (`dokusya_shubetsu=1`) đã được đăng ký

### 手順

ステップ1：
Kiểm tra trạng thái link「削除」ở dòng người thanh toán thẻ tín dụng bản điện tử trong bảng list

ステップ2：
Kiểm tra trạng thái link「削除」ở dòng người đọc kép

ステップ3：
Kiểm tra trạng thái link「削除」ở dòng độc giả bản giấy

### 期待結果

ステップ1：
Dòng người thanh toán thẻ tín dụng bản điện tử hiển thị link「削除」ở trạng thái disable (`is_read_only=true`)

ステップ2：
Dòng người đọc kép hiển thị link「削除」ở trạng thái disable (`is_read_only=true`)

ステップ3：
Dòng độc giả bản giấy hiển thị link「削除」ở trạng thái active (`is_read_only=false`)

補足：
・Flag `is_read_only` được tính ở phía backend và bao gồm trong từng dòng response
・Tuân theo viewpoint VP-C-05「購読者種別ルール（読み取り専用）」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-011 — Hoạt động responsive — breakpoint PC／Tablet／Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Đặt kích thước cửa sổ thành 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar hiển thị cố định, form tìm kiếm nằm ngang, toàn bộ cột bảng list nằm trong bề rộng màn hình

ステップ2：
Sidebar thu gọn, giữ nguyên bố cục form tìm kiếm, bảng có thể scroll ngang

ステップ3：
Sidebar hiển thị dạng overlay, form tìm kiếm xếp dọc, bảng có thể scroll ngang

補足：
・Không vỡ layout ở cả 3 breakpoint
・Bảng có thể xem toàn bộ cột bằng scroll ngang nhờ `overflow-x-auto`
・Các thao tác chính (tìm kiếm, xóa, xuất Excel, chuyển trang) đều thực hiện được ở mọi breakpoint

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-012 — Hiển thị breadcrumb・header và thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Kiểm tra tiêu đề header và vùng breadcrumb ở phía trên màn hình

ステップ2：
Click「ホーム」trên breadcrumb

ステップ3：
Đặt focus vào ô input đầu tiên của form tìm kiếm, dùng phím Tab di chuyển lần lượt qua từng mục

ステップ4：
Kiểm tra chuyển focus của pagination・bảng kết quả tìm kiếm

### 期待結果

ステップ1：
Tiêu đề header「購読者明細検索画面」được hiển thị. Breadcrumb hiển thị theo cấp `ホーム > 購読者管理 > 購読者明細検索画面`, màn hình hiện tại (購読者明細検索画面) không có link

ステップ2：
Chuyển về `/dashboard`

ステップ3：
Thứ tự Tab theo luồng tự nhiên (trên xuống dưới, trái sang phải). Phần tử được focus hiển thị viền (outline)

ステップ4：
Các phần tử thao tác của pagination・bảng có thể tới được bằng bàn phím

補足：
・Mục giữa「購読者管理」của breadcrumb là tên nhóm sidebar, theo quy ước breadcrumb của dự án không xử lý như link chuyển
・Tuân theo viewpoint VP-E-03「キーボード操作」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 3: Kiểm tra input (Input Validation)

## ACSMS-TC-014-013 — Kiểm tra format địa chỉ email

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm và mở rộng vùng tìm kiếm chi tiết

### 手順

ステップ1：
Nhập `test@example.com` vào ô メールアドレス, click「検索」

ステップ2：
Nhập `invalid-email` vào ô メールアドレス, click「検索」

ステップ3：
Kiểm tra response body của bước 2 qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 200, tìm kiếm được thực hiện bình thường

ステップ2：
Hiển thị lỗi format (message `正しいメール形式を入力してください。` dưới mục tương ứng)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors[]` chứa `{ field: 'email', message: '正しいメール形式を入力してください。' }`)

補足：
・ACSMS-MSG-014-008 tương ứng
・メールアドレス là tìm kiếm partial match, nhưng chỉ nhận giá trị qua được kiểm tra format làm điều kiện tìm kiếm
・Không phụ thuộc vào validation chuẩn của browser bằng HTML5 `type="email"`, mà dùng regex của dự án và message tiếng Nhật để phán định

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-014 — Kiểm tra tương quan khoảng 購読開始日 (from ≦ to)

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Nhập ngày bắt đầu `2024/12/31`, ngày kết thúc `2024/01/01` cho 購読開始日, click「検索」 (from > to)

ステップ2：
Nhập ngày bắt đầu `2024/01/01`, ngày kết thúc `2024/12/31` cho 購読開始日, click「検索」 (from ≦ to)

ステップ3：
Kiểm tra response body của bước 1 qua DevTools

### 期待結果

ステップ1：
Hiển thị lỗi format (lỗi tương quan do ngày bắt đầu sau ngày kết thúc)

ステップ2：
Trả về HTTP 200, tìm kiếm được thực hiện bình thường

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors[]` chứa mục `field: shoki_dokusya_kaishi_date_to` (hoặc `shoki_dokusya_kaishi_date_from`))

補足：
・Tuân theo kiểm tra tương quan「処理手順 4.1」của tài liệu API (`shoki_dokusya_kaishi_date_from ≦ shoki_dokusya_kaishi_date_to`)
・Ngày dạng `YYYY/MM/DD`
・Tuân theo viewpoint VP-B-05「日付ロジック」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-015 — Kiểm tra tương quan khoảng 購読中止日・適用日 (from ≦ to)

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm và mở rộng vùng tìm kiếm chi tiết

### 手順

ステップ1：
Nhập ngày bắt đầu `2025/06/30`, ngày kết thúc `2025/01/01` cho 購読中止日, click「検索」 (from > to)

ステップ2：
Nhập ngày bắt đầu `2025/12/31`, ngày kết thúc `2025/01/01` cho 適用日, click「検索」 (from > to)

ステップ3：
Kiểm tra từng response body qua DevTools

### 期待結果

ステップ1：
Hiển thị lỗi format (lỗi tương quan)

ステップ2：
Hiển thị lỗi format (lỗi tương quan)

ステップ3：
Cả hai trường hợp đều trả về HTTP 400 (`error_code: VALIDATION_ERROR`, mảng `errors[]` chứa mục `field: dokusya_chushi_date_to` và `field: joho_henko_tekiyo_date_to` (hoặc `_from` tương ứng))

補足：
・Kiểm tra tương quan áp dụng cho từng mục: 購読中止日 (`dokusya_chushi_date_from ≦ dokusya_chushi_date_to`), 適用日 (`joho_henko_tekiyo_date_from ≦ joho_henko_tekiyo_date_to`)
・Trường hợp 適用日 cả hai đều trống thì trích xuất record có flag dữ liệu mới nhất (`saishin_data_flg=TRUE`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-016 — Giá trị biên độ dài tối đa mục tìm kiếm (組合員コード 20 ký tự, 氏名 100 ký tự)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm

### 手順

ステップ1：
Nhập 20 ký tự vào 組合員コード, click「検索」

ステップ2：
Nhập 21 ký tự vào 組合員コード, click「検索」

ステップ3：
Nhập 100 ký tự vào 氏名, click「検索」

ステップ4：
Nhập 101 ký tự vào 氏名, click「検索」

### 期待結果

ステップ1：
Trả về HTTP 200, tìm kiếm được thực hiện bình thường

ステップ2：
Hiển thị lỗi vượt quá số ký tự (HTTP 400, `error_code: VALIDATION_ERROR`, mảng `errors[]` chứa mục `field: kumiaiin_code`)

ステップ3：
Trả về HTTP 200, tìm kiếm được thực hiện bình thường

ステップ4：
Hiển thị lỗi vượt quá số ký tự (HTTP 400, `error_code: VALIDATION_ERROR`, mảng `errors[]` chứa mục `field: full_name`)

補足：
・組合員コード tối đa 20 ký tự, 氏名 tối đa 100 ký tự (theo request parameter tài liệu API)
・Giá trị tối đa nhận bình thường, tối đa+1 bị từ chối (phân hoạch tương đương / phân tích giá trị biên)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-017 — Giá trị biên độ dài tối đa mục tìm kiếm chi tiết (引落元口座支店 100 ký tự, 請求開始月 (bắt đầu) YYYYMM 6 chữ số, 連絡先 15 ký tự)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm và mở rộng vùng tìm kiếm chi tiết

### 手順

ステップ1：
Nhập 100 ký tự vào 引落元口座支店, click「検索」, tiếp tục nhập 101 ký tự, click「検索」

ステップ2：
Nhập 6 chữ số (YYYYMM) vào 請求開始月 (bắt đầu), click「検索」, tiếp tục nhập 7 chữ số, click「検索」

ステップ3：
Nhập 15 ký tự vào 連絡先, click「検索」, tiếp tục nhập 16 ký tự, click「検索」

### 期待結果

ステップ1：
100 ký tự tìm kiếm bình thường với HTTP 200, 101 ký tự hiển thị lỗi vượt quá số ký tự (`error_code: VALIDATION_ERROR`, `errors[]` có `field: bank_branch`)

ステップ2：
6 chữ số (YYYYMM) tìm kiếm bình thường với HTTP 200, 7 chữ số hiển thị lỗi định dạng (`請求開始月はYYYYMMの形式で指定してください。`) (`errors[]` có `field: seikyu_kaishi_month_from`)

ステップ3：
15 ký tự tìm kiếm bình thường với HTTP 200, 16 ký tự hiển thị lỗi vượt quá số ký tự (`errors[]` có `field: renrakusaki`)

補足：
・引落元口座支店 là OR partial match với cột vật lý `bank_branch_code` / `bank_branch_name` (tối đa 100 ký tự)
・Mỗi độ dài tối đa theo request parameter tài liệu API

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-018 — Giá trị biên page size (per_page 1 / 100 / 101)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang mở Console của DevTools

### 手順

ステップ1：
Chạy `fetch('/api/v1/dokusya?page=1&per_page=1', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Chạy `fetch('/api/v1/dokusya?page=1&per_page=100', { credentials: 'include' })`

ステップ3：
Chạy `fetch('/api/v1/dokusya?page=1&per_page=101', { credentials: 'include' })`

ステップ4：
Chạy `fetch('/api/v1/dokusya?page=1&per_page=0', { credentials: 'include' })`

### 期待結果

ステップ1：
Trả về HTTP 200 (`meta.per_page=1`)

ステップ2：
Trả về HTTP 200 (`meta.per_page=100`)

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`, `per_page` vượt quá giới hạn trên 100)

ステップ4：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`, `per_page` dưới giá trị nhỏ nhất 1)

補足：
・per_page trong khoảng 1〜100 (theo「処理手順 4.1」tài liệu API)
・page từ 1 trở lên

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-019 — Trim trước sau・partial match mục tìm kiếm

- 観点ID: VP-B-09
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: độc giả `kumiaiin_code='K000001'`, `kumiaiin_code='K000010'`, `kumiaiin_code='M000001'` đã được đăng ký

### 手順

ステップ1：
Nhập `  K0000  ` có thêm space trước sau vào 組合員コード, click「検索」

ステップ2：
Kiểm tra request parameter đã gửi qua DevTools

ステップ3：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Giá trị nhập được trim space trước sau, tìm kiếm được thực hiện (ô input cập nhật về dạng đã trim space trước sau)

ステップ2：
Query parameter chứa `kumiaiin_code=K0000` (không có space trước sau)

ステップ3：
Chỉ hiển thị 2 record chứa `K0000` (`K000001`, `K000010`). `M000001` không hiển thị

補足：
・Tìm kiếm partial match (ILIKE '%K0000%')
・Không phân biệt chữ hoa chữ thường
・Space trước sau được trim trước khi tìm kiếm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-020 — An toàn XSS／SQL injection mục tìm kiếm

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: nhiều record độc giả đã được đăng ký

### 手順

ステップ1：
Nhập `<script>alert('XSS')</script>` vào 氏名, click「検索」

ステップ2：
Nhập `' OR '1'='1` vào 組合員コード, click「検索」

ステップ3：
Nhập `'; DROP TABLE t_dokusya; --` vào 氏名, click「検索」

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Trả về HTTP 200 (`data: []` (không có record tương ứng)). Không hiển thị alert JavaScript, ô input hiển thị chuỗi đã escape dưới dạng text an toàn

ステップ2：
Trả về HTTP 200 (`data: []` — payload injection được truyền vào mệnh đề ILIKE dưới dạng chuỗi literal)

ステップ3：
Trả về HTTP 200 (`data: []` — không xảy ra việc xóa bảng)

ステップ4：
Số lượng record độc giả giống như trước khi test (bảng không bị xóa)

補足：
・Tấn công XSS bị vô hiệu hóa nhờ auto-escape của Vue bằng nội suy `{{ }}` (viewpoint VP-A-06)
・SQL injection bị vô hiệu hóa nhờ query tham số hóa của TypeORM (biến bind `:kumiaiin_code`) (viewpoint VP-A-10)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Logic nghiệp vụ — Tìm kiếm・Xóa・Xuất Excel (Function — Search / Delete / Export)

## ACSMS-TC-014-021 — Hiển thị ban đầu — form tìm kiếm trống + list độc giả mặc định (mới nhất trước)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: nhiều record độc giả của JA mình đã được đăng ký

### 手順

ステップ1：
Click「購読者明細検索画面」từ dashboard

ステップ2：
Kiểm tra trạng thái form tìm kiếm của màn hình

ステップ3：
Kiểm tra nội dung bảng list

ステップ4：
Kiểm tra query parameter của GET `/api/v1/dokusya` ở tab Network của DevTools

### 期待結果

ステップ1：
Chuyển về URL `/dokusya`

ステップ2：
Toàn bộ mục tìm kiếm hiển thị trống, vùng tìm kiếm chi tiết ở trạng thái thu gọn

ステップ3：
Record độc giả sau khi áp dụng DataScope hiển thị theo thứ tự mới nhất (`updated_at` giảm dần) tới 20 record. Record đã xóa logical (`deleted_at IS NOT NULL`) không hiển thị

ステップ4：
Query parameter là `?page=1&per_page=20&sort_by=updated_at&sort_order=desc` (giá trị mặc định)

補足：
・Lúc hiển thị ban đầu lấy toàn bộ không có điều kiện tìm kiếm (sau khi áp dụng DataScope)
・Giá trị mặc định per_page là 20, sort_by là `updated_at` giảm dần
・適用日 cả hai đều trống nên trích xuất record có flag dữ liệu mới nhất (`saishin_data_flg=TRUE`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-022 — Tìm kiếm — partial match 組合員コード

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: 3 record `kumiaiin_code='K000001'`, `kumiaiin_code='K000002'`, `kumiaiin_code='M000099'` đã được đăng ký

### 手順

ステップ1：
Nhập `K0000` vào ô 組合員コード

ステップ2：
Click button「検索」

ステップ3：
Kiểm tra request parameter đã gửi qua DevTools

ステップ4：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Nhận input hoàn tất

ステップ2：
Trả về HTTP 200 (điều kiện tìm kiếm được áp dụng và màn hình cập nhật)

ステップ3：
Query parameter chứa `kumiaiin_code=K0000`

ステップ4：
Chỉ hiển thị 2 record chứa `K0000` (`K000001`, `K000002`). `M000099` không hiển thị

補足：
・Tìm kiếm partial match (`d.kumiaiin_code ILIKE '%K0000%'`)
・Không phân biệt chữ hoa chữ thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-023 — Tìm kiếm — partial match 氏名・かな氏名 (nối họ tên)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: 3 record `shimei_sei='山田', shimei_mei='太郎'`, `shimei_sei='山田', shimei_mei='花子'`, `shimei_sei='佐藤', shimei_mei='次郎'` đã được đăng ký

### 手順

ステップ1：
Nhập `山田` vào ô 氏名, click「検索」

ステップ2：
Kiểm tra kết quả bảng list

ステップ3：
Clear 氏名, nhập `ヤマダ` vào ô かな氏名, click「検索」

### 期待結果

ステップ1：
Trả về HTTP 200 (điều kiện tìm kiếm được áp dụng)

ステップ2：
Chỉ hiển thị 2 record chứa `山田` (`山田 太郎`, `山田 花子`). `佐藤 次郎` không hiển thị

ステップ3：
Tìm kiếm partial match theo かな氏名 được thực hiện, độc giả tương ứng được hiển thị

補足：
・氏名 là partial match với chuỗi nối `(d.shimei_sei || ' ' || d.shimei_mei)`
・かな氏名 là partial match với chuỗi nối `(d.shimei_kana_sei || ' ' || d.shimei_kana_mei)`
・Toàn角・hiragana・katakana được đối chiếu nguyên dạng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-024 — Tìm kiếm — kết hợp AND điều kiện pulldown・radio

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: nhiều độc giả khác nhau về 管理支店・支店・購読種別・支払方法 đã được đăng ký

### 手順

ステップ1：
Chọn một 管理支店 bất kỳ ở pulldown 管理支店

ステップ2：
Chọn「紙版」ở radio 購読種別

ステップ3：
Click button「検索」

ステップ4：
Kiểm tra request parameter và kết quả bảng list qua DevTools

### 期待結果

ステップ1：
管理支店 được chọn, option của pulldown「支店」được lọc xuống các 支店 thuộc 管理支店 đã chọn

ステップ2：
購読種別 được chọn

ステップ3：
Trả về HTTP 200 (áp dụng theo điều kiện AND)

ステップ4：
Query parameter chứa `kanri_shiten_id` và `dokusya_shubetsu=1`, chỉ hiển thị độc giả thỏa mãn cả hai điều kiện

補足：
・Nhiều điều kiện tìm kiếm được nối bằng AND
・Mục trống không bao gồm trong query (xử lý như undefined)
・Pulldown 支店 liên động theo giá trị chọn của 管理支店

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-025 — Tìm kiếm — trích xuất lịch sử theo 適用日

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: lịch sử độc giả (`t_dokusya_rireki`) có nhiều record với ngày áp dụng thay đổi khác nhau đã được đăng ký

### 手順

ステップ1：
Để cả hai 適用日 trống, click「検索」

ステップ2：
Kiểm tra kết quả bảng list

ステップ3：
Ở vùng tìm kiếm chi tiết, nhập ngày bắt đầu `2025/01/01`, ngày kết thúc `2025/06/30` cho 適用日, click「検索」

ステップ4：
Kiểm tra kết quả bảng list

### 期待結果

ステップ1：
Trả về HTTP 200

ステップ2：
Record có flag dữ liệu mới nhất của lịch sử độc giả (`saishin_data_flg=TRUE`) được trích xuất

ステップ3：
Trả về HTTP 200

ステップ4：
Record của lịch sử độc giả (`t_dokusya_rireki`) có ngày áp dụng thay đổi nằm trong khoảng `[2025/01/01, 2025/06/30]` được trích xuất

補足：
・Trường hợp 適用日 cả hai đều trống: trích xuất record `saishin_data_flg=TRUE` (theo「処理手順 4.3」tài liệu API)
・Trường hợp 適用日 có nhập: trích xuất record có ngày áp dụng thay đổi của bảng lịch sử nằm trong khoảng (chỉ from → `>= from`, chỉ to → `<= to`, cả hai → trong khoảng)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-026 — Clear tìm kiếm — reset toàn bộ điều kiện và về trang 1

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm
  - ・Đã tìm kiếm với 組合員コード `K0000`, đang hiển thị trang 2, đã áp dụng sort 組合員コード giảm dần

### 手順

ステップ1：
Click button「検索クリア」

ステップ2：
Kiểm tra nội dung form tìm kiếm

ステップ3：
Kiểm tra trạng thái pagination và icon sort

ステップ4：
Kiểm tra nội dung bảng list

### 期待結果

ステップ1：
Điều kiện tìm kiếm được clear, hiển thị toast `検索条件をクリアしました。`

ステップ2：
Toàn bộ mục tìm kiếm được reset về trống

ステップ3：
Về trang 1 (trang hiện tại hiển thị「1」), icon sort về trạng thái ban đầu

ステップ4：
Record độc giả sau khi áp dụng DataScope hiển thị theo thứ tự mặc định (mới nhất trước)

補足：
・ACSMS-MSG-014-004 (検索条件をクリアしました。) tương ứng
・Toàn bộ điều kiện tìm kiếm + sort + trang được reset về trạng thái ban đầu
・Lúc clear tìm kiếm không hiển thị modal xác nhận

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-027 — Không có kết quả tìm kiếm — hiển thị ACSMS-MSG-014-002

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm
  - ・Test data: chưa đăng ký độc giả tương ứng `kumiaiin_code='ZZZ99999'`

### 手順

ステップ1：
Nhập `ZZZ99999` vào 組合員コード, click「検索」

ステップ2：
Kiểm tra hiển thị màn hình

ステップ3：
Kiểm tra vùng bảng list

### 期待結果

ステップ1：
Trả về HTTP 200 (trả về `data: []`, `meta.total: 0`)

ステップ2：
Message không có kết quả tìm kiếm `該当するデータが存在しません。` hiển thị bên ngoài bảng list

ステップ3：
Không hiển thị dòng data, pagination hiển thị「全 0 件」

補足：
・ACSMS-MSG-014-002 tương ứng
・Message trống hiển thị dưới dạng phần tử anh em bên ngoài bảng, không phải slot `#emptyText` của a-table

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-028 — Sort — chuyển đổi 3 trạng thái khi click header cột (giữ điều kiện tìm kiếm)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm
  - ・Test data: nhiều record độc giả đã được đăng ký

### 手順

ステップ1：
Click header cột 組合員コード (lần 1)

ステップ2：
Click header cột 組合員コード (lần 2)

ステップ3：
Click header cột 組合員コード (lần 3)

ステップ4：
Kiểm tra request parameter mỗi lần click qua DevTools

### 期待結果

ステップ1：
Sort tăng dần (ASC), header hiển thị icon ▲ (query parameter `sort_by=kumiaiin_code&sort_order=asc`)

ステップ2：
Sort giảm dần (DESC), header hiển thị icon ▼ (query parameter `sort_by=kumiaiin_code&sort_order=desc`)

ステップ3：
Về không sort (trạng thái ban đầu), icon ẩn (mục liên quan sort bị loại khỏi query parameter)

ステップ4：
Mỗi click thực hiện GET `/api/v1/dokusya`, điều kiện sort được phản ánh. Điều kiện tìm kiếm và page size hiện tại được giữ lại

補足：
・Cột đối tượng sort: 管理支店・支店・組合員コード・販売店コード・購読開始日・購読中止日 (theo sort_by cho phép của tài liệu API)
・Quy tắc chuyển sort: lần 1=tăng dần → lần 2=giảm dần → lần 3=bỏ sort

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-029 — Pagination — chuyển page size và giữ điều kiện tìm kiếm

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đã mở màn hình tìm kiếm
  - ・Test data: đã đăng ký 124 độc giả của JA mình

### 手順

ステップ1：
Nhập `山` vào 氏名, click「検索」

ステップ2：
Chọn「50 / 頁」ở dropdown page size

ステップ3：
Click「2」ở pagination

ステップ4：
Kiểm tra `per_page` và parameter điều kiện tìm kiếm của mỗi request qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 200 (độc giả chứa `山` được hiển thị)

ステップ2：
Số lượng hiển thị chuyển thành 50, về trang 1 (`per_page=50`)

ステップ3：
Hiển thị record thứ 51〜100

ステップ4：
Query parameter chứa toàn bộ `full_name=山&page=2&per_page=50`

補足：
・per_page tối đa là 100 (theo tài liệu API)
・Lúc chuyển per_page về trang 1
・Điều kiện tìm kiếm được giữ lại khi chuyển trang

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-030 — Xóa độc giả — bình thường (xóa logical + audit log)

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: `dokusya_id=1001, kumiaiin_code='K000001', shimei_sei='山田', shimei_mei='太郎', dokusya_shubetsu=1, shiharai_hoho=1` (bản giấy, không có record liên quan)

### 手順

ステップ1：
Click link「削除」ở dòng `dokusya_id=1001` trong bảng list

ステップ2：
Kiểm tra nội dung modal xác nhận

ステップ3：
Click button「はい」

ステップ4：
Kiểm tra DB: `SELECT deleted_at, updated_by FROM t_dokusya WHERE dokusya_id = 1001`

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 't_dokusya' AND target_id = 1001 AND operation = 'DELETE' ORDER BY log_datetime DESC LIMIT 1`

ステップ6：
Kiểm tra bảng list của màn hình

### 期待結果

ステップ1：
Hiển thị dialog confirm xóa

ステップ2：
Modal hiển thị message `この購読者を削除してもよろしいですか？`, button là「はい」(màu đỏ) /「いいえ」

ステップ3：
Trả về HTTP 200 (response `{ "message": "削除しました。" }`, toast `削除しました。`)

ステップ4：
Xác nhận 1 dòng, `deleted_at` được set thời gian hiện tại (NOW()), `updated_by` khớp với `account_id` của tài khoản test

ステップ5：
Xác nhận 1 dòng, `log_type=1`, `gamen_name='購読者明細検索画面 (ACSMS-SCR-014)'`, `account_id` khớp với tài khoản test, `result_status=1`, `before_value` JSON ghi data record trước khi xóa (loại trừ thông tin nhạy cảm như mật khẩu), `after_value` là chuỗi rỗng

ステップ6：
Độc giả đã xóa biến mất khỏi list, list kết quả tìm kiếm được load lại

補足：
・ACSMS-MSG-014-010 (dialog xác nhận), ACSMS-MSG-014-011 (xóa hoàn tất) tương ứng
・DML chính (UPDATE t_dokusya SET deleted_at) + audit log INSERT được commit trong cùng một transaction
・Không phải xóa vật lý mà là xóa logical (set `deleted_at`)
・Tuân theo viewpoint VP-C-03「論理削除 + FK 関連」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-031 — Xóa độc giả — cancel bằng「いいえ」trên modal xác nhận

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: `dokusya_id=1001` (bản giấy, không có record liên quan)

### 手順

ステップ1：
Click link「削除」ở dòng đối tượng trong bảng list

ステップ2：
Click button「いいえ」trên modal xác nhận

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM t_dokusya WHERE dokusya_id = 1001`

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_log WHERE target_id = 1001 AND target_table = 't_dokusya' AND operation = 'DELETE'`

### 期待結果

ステップ1：
Modal xác nhận `この購読者を削除してもよろしいですか？` được hiển thị

ステップ2：
Modal đóng lại, màn hình giữ nguyên (giữ hiển thị list)

ステップ3：
`deleted_at IS NULL` (chưa bị xóa)

ステップ4：
0 dòng (không thêm log DELETE)

補足：
・Thao tác cancel không thay đổi DB, không ghi log
・Lúc cancel không gọi API DELETE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-032 — Xóa độc giả — từ chối xóa khi có data liên quan (CONFLICT)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: `dokusya_id=1005` (bản giấy), có ít nhất 1 record với ID độc giả này trong bảng liên quan

### 手順

ステップ1：
Click link「削除」ở dòng `dokusya_id=1005` trong bảng list

ステップ2：
Click button「はい」trên modal xác nhận

ステップ3：
Kiểm tra hiển thị message của màn hình

ステップ4：
Kiểm tra DB: `SELECT deleted_at FROM t_dokusya WHERE dokusya_id = 1005`

ステップ5：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_id = 1005 AND target_table = 't_dokusya' AND log_type = 3 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Hiển thị dialog confirm xóa

ステップ2：
Request xóa được gửi

ステップ3：
Trả về HTTP 409 (`error_code: CONFLICT`, toast `この購読者は関連オブジェクトに紐づいているため削除できません。`)

ステップ4：
`deleted_at IS NULL` (chưa bị xóa)

ステップ5：
Xác nhận 1 dòng (ghi error log, `log_type=3`, `error_message` chứa lý do CONFLICT)

補足：
・ACSMS-MSG-014-009 tương ứng (message CONFLICT trong エラー一覧 tài liệu API là `関連データが存在するため削除できません。`)
・Trường hợp tồn tại record có dokusya_id đối tượng trong bảng liên quan thì từ chối xóa
・Sau khi rollback transaction, chỉ ghi riêng error log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — kiểm tra quan trọng phòng ngừa hỏng data nghiệp vụ do vi phạm tính toàn vẹn FK.

## ACSMS-TC-014-033 — Xóa độc giả — từ chối xóa độc giả read-only (DOKUSYA_READ_ONLY)

- 観点ID: VP-C-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: người thanh toán thẻ tín dụng bản điện tử (`dokusya_id=1010, dokusya_shubetsu=2, shiharai_hoho=6`), người đọc kép (`dokusya_id=1011, dokusya_shubetsu=3`) đã được đăng ký

### 手順

ステップ1：
Gọi trực tiếp DELETE `/api/v1/dokusya/1010` qua DevTools (người thanh toán thẻ tín dụng bản điện tử)

ステップ2：
Gọi trực tiếp DELETE `/api/v1/dokusya/1011` qua DevTools (người đọc kép)

ステップ3：
Kiểm tra DB: `SELECT deleted_at FROM t_dokusya WHERE dokusya_id IN (1010, 1011)`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: DOKUSYA_READ_ONLY`, message `この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）`)

ステップ2：
Trả về HTTP 403 (`error_code: DOKUSYA_READ_ONLY`, message `この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）`)

ステップ3：
Cả hai record đều `deleted_at IS NULL` (chưa bị xóa)

補足：
・Phán định read-only: `(dokusya_shubetsu = 2 AND shiharai_hoho = 6) OR dokusya_shubetsu = 3` (theo「処理手順 4.3」tài liệu API)
・Link「削除」bị disable ở phía frontend, nhưng phía backend cũng từ chối khi gọi trực tiếp (viewpoint VP-C-05)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-034 — Xuất Excel — bình thường (download file + audit log)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: nhiều độc giả của JA mình đã được đăng ký

### 手順

ステップ1：
Chọn một 管理支店 bất kỳ ở pulldown 管理支店, click「検索」

ステップ2：
Click button「Excel出力」

ステップ3：
Kiểm tra tên file・format・dòng header đã download

ステップ4：
Kiểm tra DB: `SELECT * FROM t_log WHERE target_table = 't_dokusya' AND operation = 'EXPORT_EXCEL' AND result_status = 1 ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 200 (điều kiện tìm kiếm được áp dụng)

ステップ2：
Trả về HTTP 200, file Excel được download, hiển thị toast `Excel出力が正常に完了しました。`

ステップ3：
Tên file là `購読者一覧出力_YYYYMMDD_HHmmss.xlsx` (JST), `Content-Type` là `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, dòng header là `管理支店, 支店, 組合員コード, 購読者名, 連絡先１, 連絡先２, 配達先郵便, 配達先住所, 販売店コード, 販売店名, 購読開始日, 購読中止日` (12 cột)

ステップ4：
Xác nhận 1 dòng, `log_type=1`, `operation='EXPORT_EXCEL'`, `result_status=1`, `after_value` JSON ghi điều kiện export và số lượng (`record_count`)

補足：
・ACSMS-MSG-014-005 (Excel出力が正常に完了しました。) tương ứng
・Xuất Excel kế thừa điều kiện tìm kiếm hiện tại, bỏ qua page / per_page / sort_by / sort_order
・Ngày được format dạng `YYYY/MM/DD` (trường hợp NULL là chuỗi rỗng)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-035 — Xuất Excel — không có data tương ứng (EXPORT_NO_DATA)

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: chưa đăng ký độc giả tương ứng `kumiaiin_code='ZZZ99999'`

### 手順

ステップ1：
Nhập `ZZZ99999` vào 組合員コード, click「検索」

ステップ2：
Click button「Excel出力」

ステップ3：
Kiểm tra trạng thái màn hình

### 期待結果

ステップ1：
Trả về HTTP 200 (`data: []`, `meta.total: 0`)

ステップ2：
Trả về HTTP 404 (`error_code: EXPORT_NO_DATA`, message `出力データがありません。`)

ステップ3：
Hiển thị toast `出力データがありません。`, file Excel không được download

補足：
・ACSMS-MSG-014-006 tương ứng
・Trường hợp số lượng đối tượng output là 0, theo「処理手順 4.3」tài liệu API trả về HTTP 404 (EXPORT_NO_DATA)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-036 — Xuất Excel — vượt quá 30000 record output (EXPORT_LIMIT_EXCEEDED)

- 観点ID: VP-F-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: tồn tại từ 30.001 độc giả trở lên khớp với điều kiện tìm kiếm

### 手順

ステップ1：
Để điều kiện tìm kiếm trống (hoặc với điều kiện rộng), click「検索」

ステップ2：
Click button「Excel出力」

ステップ3：
Kiểm tra trạng thái màn hình

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Trả về HTTP 200 (kết quả tìm kiếm được hiển thị)

ステップ2：
Trả về HTTP 409 (`error_code: EXPORT_LIMIT_EXCEEDED`, message `出力データ件数が30000件を超えています。`)

ステップ3：
Hiển thị toast `出力データ件数が30000件を超えています。`, file Excel không được download, xử lý dừng lại

ステップ4：
Số lượng đối tượng vượt quá 30.000

補足：
・ACSMS-MSG-014-012 tương ứng
・Trường hợp số lượng output vượt quá 30.000, theo「処理手順 4.3」tài liệu API trả về HTTP 409 (EXPORT_LIMIT_EXCEEDED) ở bước check số lượng, không thực hiện lấy data・tạo Excel
・Tuân theo viewpoint VP-F-02「大量データ表示性能」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 5: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-014-037 — Lỗi chung — UNAUTHORIZED — xử lý khi hết session

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang hiển thị màn hình tìm kiếm
  - ・Đã quá 24 giờ kể từ thao tác cuối, Redis session TTL đã hết hạn (hoặc đã ép hết hạn bằng tool quản trị)

### 手順

ステップ1：
Click button「検索」, gửi API request

ステップ2：
Kiểm tra nội dung response và chuyển màn hình

ステップ3：
Kiểm tra address bar của browser

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Phía frontend trạng thái user của Pinia auth store được clear, tự động chuyển về `/login?redirect=/dokusya`

ステップ3：
URL đã chuyển về `/login` kèm `?redirect=/dokusya`

補足：
・Lúc hết session, phía backend SessionAuthGuard trả về 401, phía frontend axios interceptor điều hướng về màn hình login một cách thống nhất
・Sau khi đăng nhập lại quay về URL của parameter redirect (màn hình tìm kiếm)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-038 — Lỗi chung — BAD_REQUEST — query parameter không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang mở Console của DevTools

### 手順

ステップ1：
Chạy `fetch('/api/v1/dokusya?page=-1&sort_by=evil_column&sort_order=invalid', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Request được gửi, xử lý được thực hiện

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`, message `リクエストパラメータが不正です。` hoặc `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Số lượng record DB không thay đổi

補足：
・Trường hợp page < 1, sort_by ngoài danh sách cho phép, sort_order khác asc/desc đều bị từ chối với 400
・Giá trị sort_by được cho phép: kanri_shiten_id, shiten_id, kumiaiin_code, hanbaiten_id, shoki_dokusya_kaishi_date, dokusya_chushi_date, updated_at

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-039 — Lỗi chung — VALIDATION_ERROR — vi phạm đồng thời nhiều điều kiện tìm kiếm

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang hiển thị màn hình tìm kiếm, đã mở rộng vùng tìm kiếm chi tiết

### 手順

ステップ1：
Nhập 21 ký tự vào 組合員コード, nhập `invalid-email` vào メールアドレス

ステップ2：
Click button「検索」

ステップ3：
Kiểm tra response body

### 期待結果

ステップ1：
Nhận input hoàn tất

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ3：
Mảng `errors` trong response body chứa 2 mục:
・`{ field: 'kumiaiin_code', message: <message độ dài tối đa> }`
・`{ field: 'email', message: '正しいメール形式を入力してください。' }`

補足：
・Lúc vi phạm nhiều mục thì trả về toàn bộ vi phạm trong 1 request
・Mỗi vi phạm hiển thị dưới mục tìm kiếm tương ứng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-040 — Lỗi chung — DATA_SCOPE_VIOLATION — xuất Excel scope khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (chi nhánh quản lý mình = kanri_shiten-001)
  - ・Test data: tồn tại chi nhánh quản lý khác (kanri_shiten-002, trong JA mình)

### 手順

ステップ1：
Gọi trực tiếp GET `/api/v1/dokusya/export?kanri_shiten_id={id của kanri_shiten-002}` qua DevTools

ステップ2：
Kiểm tra response

ステップ3：
Gọi trực tiếp GET `/api/v1/dokusya?kanri_shiten_id={id của kanri_shiten-002}` qua DevTools

### 期待結果

ステップ1：
Request được gửi, xử lý được thực hiện

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

ステップ3：
Tìm kiếm (lấy list) cũng vậy, khi chỉ định chi nhánh quản lý khác thì trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Cả tìm kiếm・xuất Excel đều áp dụng DataScope, khi chỉ định `kanri_shiten_id` ngoài scope mình làm điều kiện thì trả về DATA_SCOPE_VIOLATION (HTTP 403)
・Xóa (DELETE) do ID trên URL chỉ đích danh đối tượng nên truy cập ngoài scope trả về NOT_FOUND ẩn sự tồn tại (HTTP 404), khác với tìm kiếm・output

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-041 — Lỗi chung — NOT_FOUND — xóa ID không tồn tại／đã xóa logical

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Test data: `dokusya_id=99999` chưa đăng ký, `dokusya_id=99998` đã xóa logical (`deleted_at IS NOT NULL`, JA mình)

### 手順

ステップ1：
Gọi trực tiếp DELETE `/api/v1/dokusya/99999` qua DevTools

ステップ2：
Gọi trực tiếp DELETE `/api/v1/dokusya/99998` qua DevTools

ステップ3：
Kiểm tra nội dung từng response

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定された購読者が見つかりません。`)

ステップ3：
Cả hai trường hợp response body cùng định dạng

補足：
・Truy cập resource không tồn tại／đã xóa logical đều trả về NOT_FOUND một cách thống nhất
・Record đã xóa logical bị loại khỏi đối tượng tìm kiếm (filter `deleted_at IS NULL`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-042 — Lỗi chung — INTERNAL_SERVER_ERROR / TOO_MANY_REQUESTS

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang hiển thị màn hình tìm kiếm
  - ・Ở môi trường test cố ý trigger lỗi nội bộ phía backend, chuẩn bị riêng script vượt rate limit

### 手順

ステップ1：
Ở trạng thái đã phát sinh lỗi nội bộ phía backend trong môi trường test, thực hiện「検索」hoặc「Excel出力」

ステップ2：
Kiểm tra DB: `SELECT * FROM t_log WHERE log_type = 3 ORDER BY log_datetime DESC LIMIT 1`

ステップ3：
Gửi GET `/api/v1/dokusya` quá 100 request trong 1 phút bằng script test

ステップ4：
Kiểm tra response và toast lúc vượt rate limit

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, toast `システムエラーが発生しました。しばらくしてから再度お試しください。`). Giữ nguyên màn hình tìm kiếm (không redirect), điều kiện tìm kiếm đã nhập được giữ lại

ステップ2：
Xác nhận 1 dòng, `log_type=3` (error log), `result_status=2`, `error_message` và `stack_trace` ghi chi tiết (không công khai cho client)

ステップ3：
100 request đầu phản hồi bình thường, sau đó trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ4：
Hiển thị toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`

補足：
・ACSMS-MSG-014-003 (lỗi hệ thống) tương ứng
・Message lỗi cho người dùng không chứa chi tiết mà là văn bản chung, stack trace không bao gồm trong response body
・Rate limit bị chặn ở hai tầng: NestJS `@Throttle` decorator + AWS WAF rate limit

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-014-043 — Lỗi chung — xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đang hiển thị màn hình tìm kiếm
  - ・DevTools → Network → chuyển sang chế độ ngắt kết nối mạng

### 手順

ステップ1：
Click button「検索」

ステップ2：
Kiểm tra trạng thái màn hình

ステップ3：
Đưa mạng về online và click lại button「検索」

### 期待結果

ステップ1：
Hiển thị toast `ネットワークエラーが発生しました。接続をご確認ください。`

ステップ2：
Giữ nguyên màn hình tìm kiếm, giá trị nhập và data list hiện tại được giữ lại

ステップ3：
Kết quả tìm kiếm được hiển thị bình thường

補足：
・Phát hiện lỗi mạng → thông báo cho người dùng
・Giá trị nhập được giữ lại, có thể gửi lại
・Lỗi mạng không có HTTP status code nên được xử lý toast riêng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

# カテゴリ 6: Ngừng đọc báo・Hiển thị tổng số bản・Giới hạn xóa (Function — Stop / Total-busu / Delete)

## ACSMS-TC-014-044 — Ngừng đọc báo — Bản điện tử: tháng kết thúc đang đặt trước được khôi phục trong popup

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Dữ liệu chuẩn bị: người đọc bản điện tử (`dokusya_id=1020, dokusya_shubetsu=2, shiharai_hoho≠6, seikyu_kaishi_month='202604'`) đã đăng ký đặt trước hủy vào 2030/07 (batch ngày đến hạn chưa chạy ＝ `kaiyaku_flg=false`)

### Các bước

Bước 1:
Tại màn hình tìm kiếm chi tiết người đọc, bấm liên kết "購読中止" trên dòng tương ứng

Bước 2:
Kiểm tra ô "購読中止日" trong popup

Bước 3:
Kiểm tra hiển thị của thông báo hướng dẫn

### Kết quả mong đợi

Bước 1:
Popup "購読中止" được hiển thị (không hiển thị cảnh báo `既に解約予約されています。…` như trước, mà mở popup)

Bước 2:
Bộ chọn tháng kết thúc được thiết lập là `2030/07` (năm-tháng của ngày ngừng đọc báo đang đặt trước 2030-07-31). Nút xóa (×) được hiển thị

Bước 3:
Hiển thị ACSMS-MSG-014-016 `解約予約中です。終了月を選び直すと予約を変更し、空にすると予約を取り消します。`

Bổ sung:
・Dòng đặt trước có ngày ở tương lai nên không trở thành dòng hiệu lực, nhưng riêng ngày ngừng đọc báo được phản ánh vào `t_dokusya.dokusya_chushi_date` ngay tại thời điểm đặt trước nên có thể khôi phục từ giá trị của API lấy chi tiết (tài liệu thiết kế API v1.5)
・Bản giấy (loại đăng ký=1) vẫn không mở popup như trước và hiển thị ACSMS-MSG-014-014

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

## ACSMS-TC-014-045 — Ngừng đọc báo — Bản điện tử: chọn lại tháng kết thúc để thay đổi đặt trước

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Dữ liệu chuẩn bị: giống ACSMS-TC-014-044 (có đặt trước hủy 2030/07)
  - ・Liên kết bản điện tử (DENSHIBAN_PUSH_ENABLED=true) đang bật

### Các bước

Bước 1:
Trong popup "購読中止", đổi tháng kết thúc thành `2030/09` rồi bấm "確認"

Bước 2:
Kiểm tra DB: `SELECT rireki_no, dokusya_chushi_date, torikeshi_flg, kaiyaku_flg FROM t_dokusya_rireki WHERE dokusya_id = 1020 ORDER BY rireki_no`

Bước 3:
Kiểm tra DB: `SELECT dokusya_chushi_date FROM t_dokusya WHERE dokusya_id = 1020`

Bước 4:
Kiểm tra log liên kết bản điện tử

Bước 5:
Kiểm tra DB: `SELECT gamen_name, operation, target_table FROM t_log WHERE target_id = 1020 ORDER BY log_id DESC LIMIT 1`

### Kết quả mong đợi

Bước 1:
Hiển thị toast ACSMS-MSG-014-018 `購読停止を予約しました。`, popup đóng lại và danh sách được lấy lại

Bước 2:
Dòng đặt trước cũ có `torikeshi_flg` thành `true` và thêm 1 dòng đỏ (`torikeshi_flg=true`). Ngoài ra thêm 1 dòng đặt trước mới với `dokusya_chushi_date='2030-09-30'`・`kaiyaku_flg=false`・`torikeshi_flg=false`

Bước 3:
`dokusya_chushi_date` được cập nhật thành `2030-09-30`

Bước 4:
Đã liên kết sang bản điện tử với `action_kbn=cancel`・`cancel_ym=203009` (chỉ 1 lần)

Bước 5:
Ghi log thao tác với `gamen_name='購読者明細検索画面 (ACSMS-SCR-014)'`・`operation='UPDATE'`・`target_table='t_dokusya'`

Bổ sung:
・Việc vô hiệu hóa đặt trước cũ, chèn đặt trước mới, liên kết bản điện tử và log thao tác nằm trong một transaction duy nhất (theo tài liệu thiết kế API "処理手順 4.5／4.5.1")
・Nếu bấm "確認" khi vẫn giữ nguyên tháng kết thúc đang đặt trước thì hiển thị ACSMS-MSG-014-017 `変更がありません。` và không gọi API

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

## ACSMS-TC-014-046 — Ngừng đọc báo — Bản điện tử: xóa trống tháng kết thúc để hủy đặt trước

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Dữ liệu chuẩn bị: giống ACSMS-TC-014-044 (có đặt trước hủy 2030/07)
  - ・Liên kết bản điện tử (DENSHIBAN_PUSH_ENABLED=true) đang bật

### Các bước

Bước 1:
Trong popup "購読中止", bấm nút xóa (×) của tháng kết thúc để ô trống rồi bấm "確認"

Bước 2:
Kiểm tra DB: `SELECT rireki_no, dokusya_chushi_date, torikeshi_flg FROM t_dokusya_rireki WHERE dokusya_id = 1020 ORDER BY rireki_no`

Bước 3:
Kiểm tra DB: `SELECT dokusya_chushi_date, tetsuzuki_shurui FROM t_dokusya WHERE dokusya_id = 1020`

Bước 4:
Kiểm tra log liên kết bản điện tử

Bước 5:
Kiểm tra cột "購読中止日" trên danh sách

### Kết quả mong đợi

Bước 1:
Hiển thị toast ACSMS-MSG-014-019 `購読中止を取り消しました。`, popup đóng lại và danh sách được lấy lại

Bước 2:
Dòng đặt trước cũ có `torikeshi_flg` thành `true` và thêm 1 dòng đỏ (`torikeshi_flg=true`). Không thêm dòng đặt trước mới

Bước 3:
`dokusya_chushi_date` trở lại `NULL`, `tetsuzuki_shurui` vẫn giữ nguyên `1` (đăng ký mới ＝ đang đọc báo)

Bước 4:
Đã liên kết sang bản điện tử với `action_kbn=cancel`・`cancel_ym=` (chuỗi rỗng)

Bước 5:
Cột "購読中止日" của dòng tương ứng để trống

Bổ sung:
・Do API bản điện tử không có mã xử lý riêng cho việc hủy bỏ đặt trước, nên gửi `cancel` kèm `cancel_ym` rỗng (quyết định của khách hàng 2026-08)
・Nếu bản điện tử từ chối request đó thì lịch sử・master・log thao tác đều được rollback, và lý do bản điện tử trả về được hiển thị trong popup (không để riêng phía cloud ở trạng thái đã hủy)
・Nếu bấm "確認" khi ô trống mà không có đặt trước nào thì trả về ACSMS-MSG-014-020

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

## ACSMS-TC-014-047 — Ngừng đọc báo — Sau khi hủy đăng ký đã xác định thì không thể thay đổi・hủy bỏ

- 観点ID: VP-C-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Dữ liệu chuẩn bị: người đọc bản điện tử (`dokusya_id=1021, dokusya_shubetsu=2`) đã có việc hủy đăng ký được batch ngày đến hạn xác định (có dòng hủy thực tế với `kaiyaku_flg=true`・`tetsuzuki_shurui=0`)

### Các bước

Bước 1:
Kiểm tra trạng thái liên kết "購読中止" trên dòng tương ứng trong kết quả tìm kiếm

Bước 2:
Dùng DevTools gọi trực tiếp POST `/api/v1/dokusya/1021/stop` (body: `{"dokusya_chushi_date": "2030-09-30"}`)

Bước 3:
Dùng DevTools gọi trực tiếp POST `/api/v1/dokusya/1021/stop` (body: `{"dokusya_chushi_date": ""}`)

Bước 4:
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya_rireki WHERE dokusya_id = 1021`

### Kết quả mong đợi

Bước 1:
Liên kết "購読中止" bị vô hiệu hóa (do loại thủ tục=0: đã hủy đăng ký)

Bước 2:
Trả về HTTP status code 400 (`error_code: VALIDATION_ERROR`, `errors[0].message` là ACSMS-MSG-014-015 `解約が確定済みのため変更できません。再購読は購読者編集画面から行ってください。`)

Bước 3:
Trả về lỗi 400 giống Bước 2

Bước 4:
Số lượng lịch sử không thay đổi trước và sau khi gọi (không thêm・không hủy dòng nào)

Bổ sung:
・Việc xác định "đã hoàn tất hủy" dựa trên sự tồn tại của dòng hủy thực tế có `kaiyaku_flg=true`, không phải dòng đặt trước hủy (theo tài liệu thiết kế API "処理手順 4.4")
・Việc khôi phục được thực hiện bằng chức năng đăng ký lại tại màn hình chỉnh sửa người đọc (SCR-011)
・Phía frontend liên kết bị vô hiệu hóa, nhưng phía backend cũng phải từ chối lời gọi trực tiếp (quan điểm VP-C-05)

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

## ACSMS-TC-014-048 — Ngừng đọc báo — Hộp thoại xác nhận cuối cùng (Có／Không)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Dữ liệu chuẩn bị: người đọc bản giấy (`dokusya_id=1022, dokusya_shubetsu=1`／không có đặt trước hủy), người đọc bản điện tử (`dokusya_id=1020, dokusya_shubetsu=2, seikyu_kaishi_month='202604'`／có đặt trước hủy 2030/07)

### Các bước

Bước 1:
Trong popup "購読中止" của bản giấy (1022), chọn ngày ngừng đọc báo là `2030/09/15` rồi bấm "確認"

Bước 2:
Bấm "いいえ" trong hộp thoại xác nhận

Bước 3:
Bấm "確認" lại rồi bấm "はい" trong hộp thoại xác nhận

Bước 4:
Trong popup "購読中止" của bản điện tử (1020), đổi tháng kết thúc thành `2030/09` rồi bấm "確認"

Bước 5:
Trong popup "購読中止" của bản điện tử (1020), xóa trống tháng kết thúc rồi bấm "確認"

Bước 6:
Trong popup "購読中止" của bản điện tử (1020), giữ nguyên tháng kết thúc đang đặt trước rồi bấm "確認"

### Kết quả mong đợi

Bước 1:
Hiển thị hộp thoại xác nhận "購読中止確認". Nội dung là ACSMS-MSG-014-021 `2030/09/15で購読を中止します。よろしいですか？`, các nút là "はい" (màu đỏ)／"いいえ"

Bước 2:
API không được gọi. Popup ngừng đọc báo hiển thị lại và giữ nguyên giá trị `2030/09/15` đã chọn (trong lúc hộp thoại xác nhận hiển thị thì popup bị ẩn)

Bước 3:
API được gọi, hiển thị ACSMS-MSG-014-018 và popup đóng lại

Bước 4:
Nội dung là ACSMS-MSG-014-022 `購読中止日を2030/09の月末（2030/09/30）に変更します。よろしいですか？` (bản điện tử phải nêu cả tháng đã chọn và ngày thực tế dừng)

Bước 5:
Nội dung là ACSMS-MSG-014-023 `購読中止の予約を取り消します。よろしいですか？`

Bước 6:
Hộp thoại xác nhận không hiển thị. ACSMS-MSG-014-017 `変更がありません。` hiển thị trong popup và API cũng không được gọi

Bổ sung:
・Hộp thoại xác nhận chỉ hiển thị sau khi đã qua kiểm tra input (phạm vi chọn・không có thay đổi). Sau khi bấm "はい" không được bị chặn bởi lỗi form
・Trong lúc hộp thoại xác nhận hiển thị thì ẩn popup ngừng đọc báo. Dù bấm "いいえ", "✕", "ESC" hay click vào lớp phủ đều phải hiển thị lại popup với nội dung đã chọn được giữ nguyên
・Kể cả khi API trả về lỗi, popup ngừng đọc báo cũng hiển thị lại và nội dung lỗi được hiển thị
・Nhãn nút dùng はい／いいえ chung của dự án (ý định phá hủy được thể hiện bằng nút màu đỏ・`.claude/rules/vue.md §Modal Confirmation`)

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

## ACSMS-TC-014-049 — Kết quả tìm kiếm — Hiển thị tổng số bản đọc "全 M 部" bên cạnh "全 N 件" (#56240)

- 観点ID: VP-B-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・JA của mình có từ 25 người đọc trở lên, và tổng `dokusya_busu` khác với tổng của 1 trang (ví dụ: 25 bản ghi・tổng 40 bản, tổng của 20 bản ghi ở trang 1 là 32 bản)
  - ・Trong đó có người đọc sở hữu nhiều dòng lịch sử (dùng để kiểm chứng trùng lặp khi lọc theo ngày áp dụng)

### Các bước

Bước 1:
Tìm kiếm không chỉ định điều kiện và kiểm tra hiển thị ở phần phân trang

Bước 2:
Kiểm tra `meta` trong response của API
```
GET /api/v1/dokusya?page=1&per_page=20
```

Bước 3:
Chuyển sang trang 2 và xác nhận giá trị "全 M 部" không thay đổi

Bước 4:
Chỉ định điều kiện tìm kiếm (ví dụ: chi nhánh quản lý) để lọc và kiểm tra giá trị "全 N 件"・"全 M 部"

Bước 5:
Tìm kiếm có chỉ định **ngày áp dụng** (điều kiện có INNER JOIN `t_dokusya_rireki`) và đối chiếu tổng số bản với giá trị thực trong DB
```sql
SELECT COALESCE(SUM(t.dokusya_busu), 0) FROM (
  SELECT DISTINCT d.dokusya_id, d.dokusya_busu
  FROM t_dokusya d /* cùng điều kiện lọc với màn hình */
) t;
```

Bước 6:
Tìm kiếm với điều kiện cho ra 0 kết quả và kiểm tra hiển thị

### Kết quả mong đợi

Bước 1:
"全 M 部" được hiển thị bên cạnh "全 N 件" ở phần phân trang

Bước 2:
`meta` có chứa `total_busu`, giá trị là tổng `dokusya_busu` của toàn bộ bản ghi (ví dụ: 40). **Không phải** tổng của 20 bản ghi đang hiển thị ở trang 1 (ví dụ: 32)

Bước 3:
Giá trị "全 M 部" không đổi khi chuyển trang (không bị ảnh hưởng bởi phân trang)

Bước 4:
Cả số bản ghi và số bản sau khi lọc đều được tính lại trên toàn bộ bản ghi khớp điều kiện

Bước 5:
Dù có người đọc sở hữu nhiều dòng lịch sử, số bản cũng không bị thổi phồng và khớp với giá trị thực trong DB

Bước 6:
Hiển thị "全 0 件　全 0 部"

Bổ sung:
・Không dùng được `SUM(d.dokusya_busu)` thuần: khi lọc theo ngày áp dụng sẽ INNER JOIN `t_dokusya_rireki` khiến 1 người đọc bị lặp theo số dòng lịch sử và số bản bị thổi phồng. Phía số bản ghi dùng `COUNT(DISTINCT)` nên không bị ảnh hưởng, **chỉ riêng tổng bị lệch** nên rất khó phát hiện (tài liệu thiết kế API §4.4.1)
・Bước 5 là kiểm tra hồi quy để phát hiện sự lệch này. Chỉ với người đọc có 1 dòng lịch sử thì không thể phát hiện, nên bắt buộc phải có người đọc sở hữu nhiều dòng lịch sử

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

## ACSMS-TC-014-050 — Xóa — Chỉ bản giấy mới được xóa (#56422)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100, có quyền `dokusya.delete`)
  - ・JA của mình có các người đọc sau:
    - ・(a) Bản giấy (dokusya_shubetsu=1)
    - ・(b) Bản điện tử・phương thức thanh toán=trích nợ tài khoản (không phải thẻ tín dụng)
    - ・(c) Bản điện tử・thanh toán bằng thẻ tín dụng
    - ・(d) Kết hợp (dokusya_shubetsu=3)

### Các bước

Bước 1:
Kiểm tra trạng thái kích hoạt của nút "削除" cho (a)〜(d) trong danh sách kết quả tìm kiếm

Bước 2:
Kiểm tra `is_read_only` trong response của API
```
GET /api/v1/dokusya
```

Bước 3:
Gọi trực tiếp API xóa cho người đọc (b) bản điện tử・trích nợ tài khoản
```
DELETE /api/v1/dokusya/{dokusya_id}
```

Bước 4:
Gọi trực tiếp API xóa cho (c) bản điện tử・thẻ tín dụng và (d) kết hợp

Bước 5:
Thực hiện xóa người đọc (a) bản giấy

Bước 6:
Sau khi thực hiện, kiểm tra trạng thái xóa logic trong DB
```sql
SELECT dokusya_id, dokusya_shubetsu, deleted_at FROM t_dokusya WHERE dokusya_id IN (...);
```

### Kết quả mong đợi

Bước 1:
Chỉ (a) có nút "削除" được kích hoạt. (b)(c)(d) bị vô hiệu hóa

Bước 2:
(c) người thanh toán thẻ tín dụng và (d) người đọc kết hợp có `is_read_only: true`. (b) bản điện tử・trích nợ tài khoản có `is_read_only: false` nhưng nút xóa vẫn bị vô hiệu hóa theo điều kiện `dokusya_shubetsu = 1`

Bước 3:
Trả về HTTP status code 400 (`error_code: VALIDATION_ERROR`), trong `errors` có `{"field": "dokusya_shubetsu", "message": "紙版の購読者のみ削除できます。"}`. Do `is_read_only` chỉ chặn người đọc kết hợp và bản điện tử thẻ tín dụng, trường hợp này lần đầu bị từ chối tại đây

Bước 4:
Tất cả đều bị từ chối xóa

Bước 5:
Xóa thành công và hiển thị `削除しました。`

Bước 6:
Chỉ (a) có `deleted_at` được thiết lập, (b)(c)(d) vẫn giữ `deleted_at IS NULL`

Bổ sung:
・Hội viên bản điện tử・kết hợp lấy hệ thống quản lý người đọc bản điện tử làm chuẩn; nếu xóa dòng ở phía cloud thì bản ghi sẽ sống lại khi đồng bộ hoặc phá vỡ tính nhất quán với hệ thống đối tác (yêu cầu khách hàng 2026-08)
・Việc ngừng đọc báo (đặt trước hủy) vẫn thực hiện được với bản điện tử. Thứ không xóa được là **dòng dữ liệu**, không phải việc ngừng đọc báo

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
