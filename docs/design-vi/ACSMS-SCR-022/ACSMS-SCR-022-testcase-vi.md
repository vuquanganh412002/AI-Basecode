---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-022
screen_name: ファイルダウンロード画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-27
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-05-27 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu này mô tả chi tiết test specification cho "Màn hình File Download (ACSMS-SCR-022)" được tạo mới trên hệ thống.
Tài liệu tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chuẩn chất lượng sau:

- Mỗi test case được thiết kế theo một kịch bản duy nhất (single responsibility).
- Các bước được mô tả ở mức độ có thể tái hiện được, dữ liệu test được nêu rõ.
- Kết quả mong đợi có thể đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-022 | Tài liệu thiết kế Màn hình File Download |
| 2 | ACSMS-SCR-022-api | Tài liệu thiết kế API File Download |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | Phân loại | Số test case |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 6 |
| 2 | Hiển thị màn hình・Responsive (Layout & Responsive) | 6 |
| 3 | Header・Breadcrumb (Header & Breadcrumb) | 3 |
| 4 | Validation đầu vào — Điều kiện tìm kiếm | 8 |
| 5 | Business logic — Tìm kiếm / Danh sách (Function — Search) | 8 |
| 6 | Business logic — Preview (Function — Preview) | 4 |
| 7 | Business logic — Download (Function — Download) | 6 |
| 8 | Xử lý lỗi chung (Common Error Handling) | 8 |
|  | Tổng cộng | 49 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-022-001 — NICHINO_ADMIN truy cập màn hình File Download + tham chiếu toàn bộ

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `file.download`

### 手順

ステップ1：
Mở dashboard, từ sidebar hoặc menu chuyển đến "ファイルダウンロード"

ステップ2：
Truy cập trực tiếp URL `/file-upload`

ステップ3：
Trên tab Network của DevTools, kiểm tra response của GET `/api/v1/file-upload`

ステップ4：
Trên DB, thực thi `SELECT COUNT(*) FROM t_file_upload WHERE deleted_at IS NULL` và kiểm tra số dòng trả về có khớp không

### 期待結果

ステップ1：
Chuyển đến màn hình File Download, tiêu đề màn hình `ファイルダウンロード画面` được hiển thị

ステップ2：
Màn hình được render bình thường, không hiển thị toast từ chối truy cập

ステップ3：
Trả về HTTP 200, array `data` chứa file thuộc nhiều JA khác nhau

ステップ4：
Tổng số dòng trên DB khớp với `meta.total` của response (NICHINO_ADMIN có thể tham chiếu toàn bộ, không có DataScope filter)

補足：
・NICHINO_ADMIN là role có thể tham chiếu toàn bộ dòng trong `t_file_upload`, kể cả file `ja_id IS NULL` (gửi tới toàn bộ JA) và file của JA khác
・Item menu được hiển thị trên sidebar, không bị ẩn nhầm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-002 — NICHINO_STAFF truy cập màn hình File Download + tham chiếu toàn bộ

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Có quyền `file.download`

### 手順

ステップ1：
Truy cập URL `/file-upload`

ステップ2：
Gọi GET `/api/v1/file-upload`, kiểm tra phân bố `data[].ja_id` trong response

### 期待結果

ステップ1：
Màn hình được hiển thị bình thường

ステップ2：
Trả về HTTP 200, response chứa file của nhiều JA và file `ja_id IS NULL` (NICHINO_STAFF cũng tham chiếu được toàn bộ, không có DataScope filter)

補足：
・Có phạm vi tham chiếu tương đương NICHINO_ADMIN

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-003 — Kiểm tra phạm vi tham chiếu DataScope với role CHUOKAI

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Chuokai của user và các JA quản hạt đã được đăng ký sẵn trên DB
  - ・Test data: file của chuokai mình 2 dòng, file của JA quản hạt 2 dòng, file của JA ngoài quản hạt 2 dòng, file gửi toàn bộ JA (`ja_id IS NULL`) 1 dòng

### 手順

ステップ1：
Truy cập URL `/file-upload`

ステップ2：
Gọi GET `/api/v1/file-upload?per_page=100`, kiểm tra giá trị `data[].ja_id`

ステップ3：
Gọi trực tiếp API download GET `/api/v1/file-upload/{file_upload_id}/download` với file của JA ngoài quản hạt (`ja_id` ngoài scope)

### 期待結果

ステップ1：
Màn hình được hiển thị bình thường

ステップ2：
Chỉ trả về file của chuokai mình + file của JA quản hạt + file gửi toàn bộ JA (tổng 5 dòng), KHÔNG chứa file của JA ngoài quản hạt

ステップ3：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`) — khi vi phạm DataScope, trả về 404 theo policy ẩn sự tồn tại

補足：
・Điều kiện tham chiếu: `fu.ja_id IN (:managed_ja_ids) OR fu.ja_id IS NULL`
・Thiết kế trả về 404 thay vì 403 cho truy cập ngoài scope nhằm không tiết lộ sự tồn tại của file ID

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-004 — Kiểm tra phạm vi tham chiếu DataScope với role JA_HONTEN

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Test data: file của JA mình 3 dòng, file của JA khác 2 dòng, file gửi toàn bộ JA 1 dòng

### 手順

ステップ1：
Truy cập URL `/file-upload`, kiểm tra danh sách

ステップ2：
Lấy file ID của JA khác từ DevTools, truyền vào GET `/api/v1/file-upload/{file_upload_id}/preview` và gọi trực tiếp

### 期待結果

ステップ1：
Chỉ hiển thị file của JA mình + file gửi toàn bộ JA (tổng 4 dòng), file của JA khác KHÔNG hiển thị

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`)

補足：
・Điều kiện tham chiếu: `fu.ja_id = :user_ja_id OR fu.ja_id IS NULL`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-005 — Kiểm tra phạm vi tham chiếu DataScope với role JA_KANRI_SHITEN

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã login + đã xác thực MFA
  - ・Test data: file thuộc kanri-shiten của mình trong JA mình 2 dòng, file thuộc kanri-shiten khác trong JA mình 2 dòng, file của JA khác 2 dòng, file gửi toàn bộ JA 1 dòng

### 手順

ステップ1：
Truy cập URL `/file-upload`, kiểm tra danh sách

ステップ2：
Truyền trực tiếp file ID của JA khác vào GET `/api/v1/file-upload/{file_upload_id}/download` và gọi

### 期待結果

ステップ1：
Hiển thị file của JA mình (kanri-shiten mình + kanri-shiten khác, tổng 4 dòng) + file gửi toàn bộ JA 1 dòng, tổng 5 dòng, file của JA khác KHÔNG hiển thị

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`)

補足：
・Lọc theo đơn vị JA, KHÔNG lọc theo đơn vị kanri-shiten (theo spec)
・Có thể tham chiếu toàn bộ file của các kanri-shiten thuộc JA mình

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-006 — Cấm user chưa xác thực truy cập trực tiếp URL

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Không giữ session (private mode của browser, v.v.)

### 手順

ステップ1：
Nhập trực tiếp `/file-upload` vào address bar của browser và truy cập

ステップ2：
Từ DevTools gọi GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Chuyển về màn login `/login`, query parameter `redirect=/file-upload` được gắn vào URL

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

補足：
・Router guard phát hiện không có session và giữ trang đích sau khi login trên URL query

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-022-007 — Hiển thị tiêu đề màn hình và layout trang ban đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Truy cập URL `/file-upload`

ステップ2：
Kiểm tra trực quan cấu trúc màn hình (tiêu đề, vùng search, danh sách kết quả, pagination)

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Tiêu đề màn hình `ファイルダウンロード画面` được hiển thị ở góc trên bên trái
・Vùng search (ファイル名・都道府県) được hiển thị ở phía trên
・Bảng danh sách kết quả được hiển thị ở giữa
・Pagination được hiển thị ở phía dưới bảng
・Không vỡ layout

補足：
・Layout tuân theo design token (màu sắc, khoảng cách, font)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-008 — Hiển thị item của vùng search và button chính

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Hiển thị màn hình, kiểm tra các thành phần của vùng search

ステップ2：
Kiểm tra label và vị trí của từng button

### 期待結果

ステップ1：
・Textbox ファイル名 được hiển thị (placeholder: tùy ý)
・Dropdown 都道府県 được hiển thị (giữ tất cả 47 lựa chọn tỉnh thành)

ステップ2：
・Button chính `検索` được hiển thị
・Button phụ `検索クリア` được hiển thị
・Button phụ `プレビュー` được hiển thị
・Button chính `ダウンロード実行` được hiển thị trên header của danh sách kết quả

補足：
・Button chính có màu nhấn fill, button phụ chỉ có viền — phân biệt bằng phối màu

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-009 — Thứ tự hiển thị column của bảng danh sách kết quả

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: `t_file_upload` tồn tại ≥ 5 file

### 手順

ステップ1：
Hiển thị màn hình, kiểm tra header của bảng

ステップ2：
Kiểm tra 1 row data được hiển thị với giá trị tương ứng cho từng column

### 期待結果

ステップ1：
Các column được hiển thị từ trái sang phải theo thứ tự `選択（チェックボックス） / アップロード日時 / 作成者 / ファイル名 / サイズ`

ステップ2：
・Column アップロード日時 hiển thị giá trị định dạng `YYYY/MM/DD HH:mm:ss`
・Column 作成者 hiển thị kết quả JOIN từ `m_account.account_name`
・Column ファイル名 hiển thị dạng link với màu nhấn
・Column サイズ hiển thị kích thước dạng human-readable (ví dụ: `1.2 MB`)

補足：
・Khi data nguồn JOIN không tồn tại, 作成者 hiển thị trống

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-010 — Hiển thị pagination và dropdown chọn số dòng

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: `t_file_upload` tồn tại ≥ 100 file

### 手順

ステップ1：
Hiển thị màn hình, kiểm tra các thành phần pagination ở phía dưới bảng

ステップ2：
Lần lượt kiểm tra button số trang và button "次へ" / "前へ"

ステップ3：
Kiểm tra các lựa chọn của dropdown chọn số dòng

### 期待結果

ステップ1：
・Có hiển thị "全 N 件"
・Button số trang (1, 2, 3, ..., cuối) được hiển thị
・Icon button "前へ" / "次へ" được hiển thị

ステップ2：
Trạng thái focus của button đúng (trang hiện tại được fill bằng màu nhấn)

ステップ3：
Dropdown chọn số dòng hiển thị 4 lựa chọn `10 / 頁`, `20 / 頁`, `50 / 頁`, `100 / 頁`, giá trị mặc định là `20 / 頁`

補足：
・Số dòng hiển thị mặc định là 20 dòng/trang (screen-design.md §機能 7)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-011 — Layout responsive (độ rộng tablet)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đổi window size của browser sang độ rộng 768px (tương đương tablet)

ステップ2：
Kiểm tra layout toàn bộ màn hình và hiển thị bảng danh sách kết quả

ステップ3：
Đổi độ rộng browser sang 375px (tương đương mobile) và kiểm tra tương tự

### 期待結果

ステップ1：
Không vỡ layout

ステップ2：
Bảng cho phép scroll ngang, các item trong vùng search xuống nhiều dòng

ステップ3：
Ở độ rộng mobile các phần tử vẫn không đè lên nhau, có thể xem toàn bộ column bằng scroll ngang

補足：
・Lấy breakpoint tablet 768px, breakpoint mobile 375px làm chuẩn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-012 — Di chuyển focus bằng thao tác keyboard

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Hiển thị màn hình, đặt focus vào textbox ファイル名

ステップ2：
Nhấn lần lượt phím Tab, kiểm tra thứ tự focus

ステップ3：
Tại row có checkbox, nhấn phím Space

### 期待結果

ステップ1：
Input focus được đặt vào textbox ファイル名

ステップ2：
Thứ tự focus di chuyển đúng theo `ファイル名 → 都道府県 → 検索 → 検索クリア → プレビュー → checkbox 全選択 → checkbox từng row → link ファイル名 → ダウンロード実行 → pagination → chọn số dòng`

ステップ3：
Checkbox bật/tắt được toggle

補足：
・Có thể thao tác toàn bộ chức năng chỉ bằng keyboard (yêu cầu A11y)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 3: Header・Breadcrumb (Header & Breadcrumb)

## ACSMS-TC-022-013 — Hiển thị phân cấp breadcrumb và chuyển trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Hiển thị màn hình, kiểm tra navigation breadcrumb

ステップ2：
Click "ホーム"

### 期待結果

ステップ1：
Breadcrumb được hiển thị theo phân cấp `ホーム > その他 > ファイルダウンロード`, phần tử cuối `ファイルダウンロード` được hiển thị màu nhấn

ステップ2：
Chuyển đến màn hình dashboard `/dashboard`

補足：
・Phần tử cuối của breadcrumb biểu thị trang hiện tại nên không hoạt động như link

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-014 — Hiển thị tên user đã login trên header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login với login ID `admin01`, display name "日農（管理者）"

### 手順

ステップ1：
Kiểm tra vùng user info ở góc trên bên phải màn hình

### 期待結果

ステップ1：
Tên user đã login được hiển thị theo format `admin01:日農（管理者）`, icon user được hiển thị

補足：
・Format hiển thị `{login_id}:{account_name}` (định nghĩa header chung của screen-design)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-015 — Chuyển đổi dark mode

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhấn button chuyển đổi dark mode ở phía dưới sidebar

ステップ2：
Kiểm tra màu màn hình và độ tương phản các UI element

ステップ3：
Reload màn hình, xác nhận thiết lập theme được giữ lại

### 期待結果

ステップ1：
Background màn hình, màu text, viền bảng v.v. chuyển sang dark theme

ステップ2：
Tỉ lệ tương phản của toàn bộ text và button đạt chuẩn WCAG AA (4.5:1) trở lên, không vỡ layout

ステップ3：
Sau khi reload, dark mode vẫn được giữ (lưu bằng localStorage)

補足：
・Chuyển ngược lại light mode cũng hoạt động tương tự

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 4: Validation đầu vào — Điều kiện tìm kiếm

## ACSMS-TC-022-016 — Nhập bình thường ファイル名 (partial match)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: đã đăng ký 3 file tên `zougen_tsuchi_202604.pdf`, `zougen_renraku_202604.csv`, `kouza_furikae_202604.csv`

### 手順

ステップ1：
Nhập `zougen` vào textbox ファイル名

ステップ2：
Nhấn button 検索, xác nhận GET `/api/v1/file-upload?file_name=zougen`

### 期待結果

ステップ1：
Giá trị nhập được hiển thị nguyên trên textbox (có thể đăng ký trong phạm vi số ký tự cho phép)

ステップ2：
Trả về HTTP 200, chỉ 2 file `zougen_tsuchi_202604.pdf` và `zougen_renraku_202604.csv` được hiển thị trong `data` (có thể search partial match)

補足：
・SQL phát hành `file_name ILIKE '%zougen%'`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-017 — ファイル名 — Tự động trim khoảng trắng trước/sau

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `  zougen  ` (có khoảng trắng half-width trước/sau) vào textbox ファイル名

ステップ2：
Nhấn button 検索, kiểm tra request parameter trong DevTools

### 期待結果

ステップ1：
Giá trị nhập được hiển thị trên textbox

ステップ2：
Khi gửi request, khoảng trắng trước/sau bị loại bỏ, server xử lý là `file_name=zougen`, giá trị nhập được trim

補足：
・Loại bỏ khoảng trắng trước/sau được thực hiện cả phía frontend và phía server, hành vi nhất quán ở cả 2 lớp (api.md §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-018 — ファイル名 — Boundary value số ký tự tối đa 255

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 255 ký tự alphanumeric half-width vào textbox ファイル名 và nhấn button 検索

ステップ2：
Gửi trực tiếp GET `/api/v1/file-upload?file_name={256文字}` qua DevTools

### 期待結果

ステップ1：
Trả về HTTP 200, có thể đăng ký trong phạm vi số ký tự cho phép

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, trong array `errors` có chứa `field: file_name` cùng lỗi vượt quá số ký tự)

補足：
・Phía frontend dùng maxlength=255 để chặn nhập từ ký tự 256 trở đi
・Phía server cũng có validation, không để giá trị bất hợp lệ được đăng ký

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-019 — Dropdown 都道府県 hiển thị 47 dòng và select

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Xác nhận trên DevTools rằng GET `/api/v1/todofuken` được gọi khi hiển thị màn hình

ステップ2：
Mở dropdown 都道府県, kiểm tra số lượng và nội dung lựa chọn

ステップ3：
Chọn "東京都", kiểm tra giá trị đã chọn

### 期待結果

ステップ1：
Trả về HTTP 200, response chứa 47 dòng thông tin tỉnh thành

ステップ2：
Dropdown hiển thị 47 lựa chọn (từ `01:北海道` đến `47:沖縄県`)

ステップ3：
Dropdown hiển thị là `13:東京都`, giá trị đã chọn `todofuken_code = 13` được giữ trong internal state

補足：
・Sử dụng API chung `ACSMS-API-COMMON-001`, không filter theo role

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-020 — Gửi trực tiếp todofuken code format không hợp lệ

- 観点ID: VP-B-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Từ DevTools gửi trực tiếp GET `/api/v1/file-upload?todofuken_code=AB`

ステップ2：
Gửi trực tiếp GET `/api/v1/file-upload?todofuken_code=1`

ステップ3：
Gửi trực tiếp GET `/api/v1/file-upload?todofuken_code=999`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, trong `errors` chứa `field: todofuken_code` cùng message lỗi format `都道府県コードは半角数字2桁で入力してください。`)

ステップ2：
Trả về HTTP 400 (thiếu số ký tự, hiển thị lỗi format)

ステップ3：
Trả về HTTP 400 (vượt số ký tự, hiển thị lỗi format)

補足：
・Validate bằng regex `^\d{2}$` (api.md §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-021 — Boundary value của parameter per_page (1 / 100 / 101)

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gửi GET `/api/v1/file-upload?per_page=1`

ステップ2：
Gửi GET `/api/v1/file-upload?per_page=100`

ステップ3：
Gửi GET `/api/v1/file-upload?per_page=101`

ステップ4：
Gửi GET `/api/v1/file-upload?per_page=0`

### 期待結果

ステップ1：
Trả về HTTP 200, độ dài `data` ≤ 1, `meta.per_page = 1`

ステップ2：
Trả về HTTP 200, `meta.per_page = 100`

ステップ3：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `1ページあたりの件数は1〜100の範囲で指定してください。`)

ステップ4：
Trả về HTTP 400 (vì nhỏ hơn min 1)

補足：
・Phạm vi cho phép `1〜100` (api.md §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-022 — Gửi trực tiếp sort_by với giá trị ngoài allow-list

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Từ DevTools gửi GET `/api/v1/file-upload?sort_by=password`

ステップ2：
Gửi GET `/api/v1/file-upload?sort_by=DROP TABLE`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`) — chỉ cho phép `upload_datetime / file_name / created_by`

ステップ2：
Trả về HTTP 400, không bị thực thi như SQL injection (bị chặn bằng parameterized query)

補足：
・Dù truyền giá trị ngoài allow-list, phía server vẫn từ chối an toàn (chống SQL injection)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-023 — ファイル名 — An toàn với SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `' OR '1'='1` vào textbox ファイル名 và nhấn button 検索

ステップ2：
Nhập `'; DROP TABLE t_file_upload; --` vào textbox ファイル名 và nhấn button 検索

ステップ3：
Trên DB thực thi `SELECT COUNT(*) FROM t_file_upload`, xác nhận bảng vẫn tồn tại

### 期待結果

ステップ1：
Trả về HTTP 200, giá trị nhập được xử lý an toàn như parameter của ILIKE, kết quả search hiển thị 0 dòng (rỗng)

ステップ2：
Trả về HTTP 200, không thực thi thao tác phá hủy bảng

ステップ3：
Bảng `t_file_upload` vẫn tồn tại (không bị phá hủy), không phát sinh sai lệch dữ liệu

補足：
・Parameterized query (`ILIKE '%' || :file_name || '%'`) chặn SQL injection

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 5: Business logic — Tìm kiếm / Danh sách (Function — Search)

## ACSMS-TC-022-024 — Hiển thị ban đầu — Sort mặc định (upload_datetime DESC)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: `t_file_upload` tồn tại ≥ 5 record với upload_datetime khác nhau

### 手順

ステップ1：
Truy cập URL `/file-upload`

ステップ2：
Kiểm tra thứ tự sắp xếp của column アップロード日時 trong danh sách kết quả

ステップ3：
Kiểm tra response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
アップロード日時 được xếp theo thứ tự mới nhất trước (DESC)

ステップ3：
Array `data` của response được trả về theo `upload_datetime` DESC, `meta.page = 1`, `meta.per_page = 20`

補足：
・Sort order mặc định là `upload_datetime DESC` (api.md §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-025 — Kết hợp search theo ファイル名 + 都道府県

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 3 file gắn JA của 東京都, 2 file gắn JA của 大阪府, 1 file gửi toàn bộ JA (tất cả đều chứa `meibo` trong tên file)

### 手順

ステップ1：
Nhập `meibo` vào ファイル名, chọn "東京都" trong dropdown 都道府県

ステップ2：
Nhấn button 検索, kiểm tra danh sách kết quả và parameter của GET request

### 期待結果

ステップ1：
Giá trị nhập được phản ánh trên màn hình

ステップ2：
Trả về HTTP 200, request được gửi với `?file_name=meibo&todofuken_code=13`, chỉ hiển thị 3 file gắn JA của 東京都 (file gửi toàn bộ JA bị loại khi filter theo todofuken)

補足：
・Đi qua JOIN chain `t_file_upload.ja_id → m_ja.ja_id → m_ja.todofuken_code`
・File `ja_id IS NULL` do LEFT JOIN nên `j.todofuken_code IS NULL`, `NULL = 13` là FALSE nên bị loại (api.md §4.3)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-026 — Khi không chỉ định 都道府県 thì hiển thị file gửi toàn bộ JA

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 2 file `ja_id IS NULL`, 1 file của JA 東京都

### 手順

ステップ1：
Để dropdown 都道府県 chưa chọn, nhấn button 検索

ステップ2：
Kiểm tra phân bố giá trị `ja_id` trong danh sách kết quả

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Hiển thị 2 file `ja_id IS NULL` và 1 file của JA 東京都, tổng 3 dòng (do không filter theo todofuken nên tham chiếu toàn bộ)

補足：
・File gửi toàn bộ JA chỉ hiển thị ở danh sách mặc định không filter theo todofuken

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-027 — Search 0 kết quả — Hiển thị ACSMS-MSG-022-001

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: trong `t_file_upload` không tồn tại file name chứa `'XYZNOTFOUND'`

### 手順

ステップ1：
Nhập `XYZNOTFOUND` vào textbox ファイル名 và nhấn button 検索

### 期待結果

ステップ1：
Trả về HTTP 200, trả về `data: []` + `meta.total: 0`, màn hình hiển thị message `該当するデータがありません。` (ACSMS-MSG-022-001), hiển thị 0 kết quả search

補足：
・Khi 0 dòng vẫn trả về HTTP 200, không xử lý như error

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-028 — Reset điều kiện bằng button クリア và hiển thị lại danh sách mặc định

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập `zougen` vào ファイル名, chọn "東京都" cho 都道府県, nhấn button 検索

ステップ2：
Nhấn button 検索クリア (phía trên)

### 期待結果

ステップ1：
Hiển thị kết quả search với số dòng khớp điều kiện

ステップ2：
・Textbox ファイル名 trở thành rỗng
・Dropdown 都道府県 trở thành chưa chọn
・Danh sách kết quả được hiển thị lại như danh sách mặc định (toàn bộ, `upload_datetime DESC`)
・Điều kiện search được clear

補足：
・Button "クリア" (phía trên) clear cả điều kiện search + danh sách kết quả, trở về trạng thái hiển thị mặc định

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-029 — Pagination — Giữ điều kiện search

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: tồn tại ≥ 25 file chứa `zougen` trong tên file

### 手順

ステップ1：
Nhập `zougen` vào ファイル名, nhấn button 検索 (hiển thị trang 1)

ステップ2：
Trên pagination nhấn trang "2"

ステップ3：
Trên DevTools kiểm tra parameter của GET request được gửi

### 期待結果

ステップ1：
Trang 1 hiển thị danh sách 20 file

ステップ2：
Chuyển sang danh sách file của trang 2, điều kiện search `zougen` được giữ trên textbox

ステップ3：
Request được gửi dưới dạng `?file_name=zougen&page=2&per_page=20&sort_by=upload_datetime&sort_order=desc`, điều kiện search được giữ lại

補足：
・Khi đổi số trang, điều kiện search user đã nhập vẫn được giữ

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-030 — Sort — Chuyển ASC / DESC trên column ファイル名

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: ≥ 5 file có file name khác nhau theo thứ tự alphabet

### 手順

ステップ1：
Click vào header column ファイル名

ステップ2：
Click lại lần nữa vào header column ファイル名

ステップ3：
Click lần thứ 3 vào header column ファイル名

### 期待結果

ステップ1：
Được sắp xếp theo ファイル名 ASC, request được gửi dưới dạng `?sort_by=file_name&sort_order=asc`

ステップ2：
Được sắp xếp theo ファイル名 DESC, request được gửi dưới dạng `?sort_by=file_name&sort_order=desc`

ステップ3：
Trở về trạng thái bỏ sort hoặc mặc định (`upload_datetime DESC`) (phụ thuộc policy FE, Sort order đúng)

補足：
・Có 3 loại column sort được hỗ trợ: `upload_datetime / file_name / created_by` (api.md §4.1)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-031 — Loại file đã xóa logical (deleted_at IS NOT NULL)

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 3 file thông thường, 2 file đã xóa logical (`deleted_at` được set ngày giờ quá khứ)

### 手順

ステップ1：
Truy cập URL `/file-upload`, kiểm tra số dòng trong danh sách kết quả

ステップ2：
Trên DB thực thi `SELECT COUNT(*) FROM t_file_upload WHERE deleted_at IS NULL`

### 期待結果

ステップ1：
Chỉ hiển thị 3 file thông thường, 2 file đã xóa logical KHÔNG hiển thị

ステップ2：
Số dòng valid trên DB là 3, khớp với số dòng hiển thị trên màn hình (dữ liệu đã xóa không hiển thị)

補足：
・WHERE clause bắt buộc chứa `fu.deleted_at IS NULL` (api.md §4.3)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 6: Business logic — Preview (Function — Preview)

## ACSMS-TC-022-032 — Chọn file + プレビュー hiển thị modal presigned URL của S3

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 1 file PDF có thể preview (file thực tồn tại trên S3)

### 手順

ステップ1：
Từ danh sách kết quả, bật checkbox của 1 file PDF

ステップ2：
Nhấn button プレビュー, kiểm tra response của GET `/api/v1/file-upload/{file_upload_id}/preview`

ステップ3：
Xác nhận PDF được render trong modal preview

### 期待結果

ステップ1：
Checkbox được bật, row tương ứng được highlight

ステップ2：
Trả về HTTP 200, `data.preview_url` trong response chứa presigned URL của S3 (có query `X-Amz-Signature`), `data.expires_at` là timestamp ISO 8601 cách thời điểm hiện tại 1 tiếng

ステップ3：
Modal được hiển thị, nội dung PDF được render trong `<iframe>`

補足：
・Thời hạn hiệu lực của S3 presigned URL là 3600 giây (api.md §4.4)
・Có thể đóng modal bằng click ra ngoài modal / button đóng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-033 — Nhấn プレビュー khi chưa chọn file — ACSMS-MSG-022-002

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Để toàn bộ checkbox ở trạng thái chưa chọn

ステップ2：
Nhấn button プレビュー

### 期待結果

ステップ1：
Toàn bộ checkbox đang chưa chọn, highlight của row đã được bỏ

ステップ2：
Hiển thị warning message `ファイルを選択してください。` (ACSMS-MSG-022-002), API preview KHÔNG được gọi

補足：
・Phía frontend phát hiện số file chọn = 0 và không phát hành API request (tránh giao tiếp không cần thiết)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-034 — File preview không tồn tại — ACSMS-MSG-022-003

- 観点ID: VP-D-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 1 file có record trên DB nhưng file thực trên S3 đã bị xóa trước đó, hoặc 1 file mà `deleted_at` trên DB vừa được update bằng NOW()

### 手順

ステップ1：
Bật checkbox của file tương ứng và nhấn button プレビュー

ステップ2：
Kiểm tra response của GET `/api/v1/file-upload/{file_upload_id}/preview`

### 期待結果

ステップ1：
Hiển thị warning message `ファイルが存在していません。` (ACSMS-MSG-022-003), modal KHÔNG mở

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`)

補足：
・FE nhận 404 và map sang ACSMS-MSG-022-003 để hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-035 — Bỏ chọn + đóng modal bằng button クリア ở footer

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Bật checkbox của nhiều row (≥ 2 file), nhấn button プレビュー để hiển thị modal

ステップ2：
Nhấn button "クリア" (phía dưới) ở footer

### 期待結果

ステップ1：
Modal được hiển thị, các row đã chọn ở trạng thái highlight

ステップ2：
Toàn bộ checkbox trở thành chưa chọn, highlight của toàn bộ row được bỏ, modal được đóng

補足：
・Hoạt động của button クリア ở footer (phía dưới) là "bỏ chọn + clear preview" (screen-design.md §機能 6)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 7: Business logic — Download (Function — Download)

## ACSMS-TC-022-036 — Download file đơn thành công + ghi history + audit log

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 1 file PDF gắn JA mình (file thực tồn tại trên S3, tên file `zougen_tsuchi_202604.pdf`)

### 手順

ステップ1：
Từ danh sách kết quả bật checkbox của file tương ứng và nhấn button ダウンロード実行

ステップ2：
Kiểm tra response của GET `/api/v1/file-upload/{file_upload_id}/download`

ステップ3：
Lưu file qua save dialog của browser và xác nhận nội dung đúng

ステップ4：
Trên DB thực thi `SELECT * FROM t_file_download WHERE created_by = :login_id ORDER BY download_datetime DESC LIMIT 1`

ステップ5：
Trên DB thực thi `SELECT * FROM t_log WHERE log_type = 4 AND operation = 'DOWNLOAD' AND target_id = :file_upload_id ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Checkbox được bật, xử lý download bắt đầu

ステップ2：
Trả về HTTP 200, response header set `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="zougen_tsuchi_202604.pdf"; filename*=UTF-8''zougen_tsuchi_202604.pdf`, `Cache-Control: no-store`

ステップ3：
Browser hoàn tất download, hiển thị success message `ダウンロードが完了しました。` (ACSMS-MSG-022-005), file lưu khớp với file thực trên S3

ステップ4：
Download history được insert 1 dòng, được record với giá trị `download_type = 4` (増減通知書, phán đoán từ `zougen_tsuchi`), `ja_id = :user_ja_id`, `file_name = 'zougen_tsuchi_202604.pdf'`

ステップ5：
Audit log được record 1 dòng, `log_type = 4` (file operation), `operation = 'DOWNLOAD'`, `result_status = 1`, `after_value` chứa JSON metadata của file

補足：
・INSERT history + INSERT audit log được thực hiện trong cùng transaction (api.md §4 policy transaction)
・`download_type` được tự động phán đoán từ tên file (4: 増減通知書)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-037 — Thực hiện download khi chọn nhiều file

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 3 file (PDF / CSV / Excel) gắn JA mình

### 手順

ステップ1：
Bật 3 checkbox và nhấn button ダウンロード実行

ステップ2：
Kiểm tra file download trên browser

ステップ3：
Trên DB thực thi `SELECT COUNT(*) FROM t_file_download WHERE created_by = :login_id AND download_datetime >= :test_start_time`

### 期待結果

ステップ1：
Xử lý download bắt đầu

ステップ2：
Toàn bộ 3 file đều được download, hiển thị success message `ダウンロードが完了しました。` (ACSMS-MSG-022-005)

ステップ3：
Download history được record 3 dòng, `t_log` cũng được record 3 dòng `log_type=4`

補足：
・Khi chọn nhiều file, mỗi file phát hành 1 API request riêng và mỗi cái đều record history + log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-038 — Nhấn ダウンロード実行 khi chưa chọn file — ACSMS-MSG-022-002

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Để toàn bộ checkbox ở trạng thái chưa chọn

ステップ2：
Nhấn button ダウンロード実行

### 期待結果

ステップ1：
Toàn bộ checkbox đang chưa chọn

ステップ2：
Hiển thị warning message `ファイルを選択してください。` (ACSMS-MSG-022-002), API download KHÔNG được gọi

補足：
・Phía frontend phát hiện số file chọn = 0 và không phát hành API request

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-039 — Thử download trực tiếp ID vi phạm DataScope — ẩn sự tồn tại bằng 404

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id = 5 của JA mình)
  - ・Đã login + đã xác thực MFA
  - ・Test data: tồn tại file file_upload_id = 999 gắn JA khác (ja_id = 10)

### 手順

ステップ1：
Truyền file ID của JA khác (999) mà user đăng nhập không thấy được, qua DevTools gọi GET `/api/v1/file-upload/999/download`

ステップ2：
Trên DB thực thi `SELECT * FROM t_file_download WHERE file_path LIKE '%999%' AND created_by = :login_id`

ステップ3：
Trên DB thực thi `SELECT * FROM t_log WHERE target_id = 999 AND account_id = :account_id AND log_type = 3`

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`) — vi phạm DataScope trả về 404 theo policy ẩn sự tồn tại

ステップ2：
Download history KHÔNG được record (không có ghi nghiệp vụ phát sinh)

ステップ3：
Error log được record (`log_type = 3`, `result_status = 2`, dùng để theo dõi tấn công URL trực tiếp)

補足：
・Vi phạm DataScope trả về 404 thay vì 403 (ẩn sự tồn tại — api.md §4.2, quy tắc `security.md assertJaScope`)
・Tấn công truy cập URL trực tiếp cũng được record dưới dạng audit log

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-040 — Rollback transaction khi download

- 観点ID: VP-D-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 1 file có thể download bình thường, tạm thời tước quyền INSERT trên bảng `t_log` (cho test)

### 手順

ステップ1：
Chọn file và nhấn button ダウンロード実行

ステップ2：
Trên DB thực thi `SELECT * FROM t_file_download WHERE created_by = :login_id ORDER BY download_datetime DESC LIMIT 1`

ステップ3：
Khôi phục quyền INSERT trên bảng `t_log`, kết thúc test

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), download file KHÔNG diễn ra

ステップ2：
INSERT history được rollback, record không tồn tại (đảm bảo tính toàn vẹn dữ liệu, transaction được rollback)

ステップ3：
Sau khi khôi phục quyền, hoạt động bình thường

補足：
・INSERT history + INSERT audit log là cùng 1 transaction, khi một trong hai fail thì rollback toàn bộ (api.md §4.8)
・Error log (log_type=3) trong khối xử lý exception được record riêng bên ngoài transaction

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-041 — Tự động phán đoán download_type (口座振替 / 増減連絡票 / 増減通知書 / 購読者名簿 / その他)

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: 5 file sau
    - `kouza_furikae_202604.csv` (口座振替)
    - `zougen_renraku_202604.csv` (増減連絡票)
    - `zougen_tsuchi_202604.pdf` (増減通知書)
    - `meibo_202604.pdf` (購読者名簿)
    - `report_misc_202604.pdf` (その他)

### 手順

ステップ1：
Download lần lượt 5 file trên

ステップ2：
Trên DB thực thi `SELECT file_name, download_type FROM t_file_download WHERE created_by = :login_id ORDER BY download_datetime DESC LIMIT 5`

### 期待結果

ステップ1：
Toàn bộ 5 file download thành công

ステップ2：
・`kouza_furikae_202604.csv` → `download_type = 1`
・`zougen_renraku_202604.csv` → `download_type = 3`
・`zougen_tsuchi_202604.pdf` → `download_type = 4`
・`meibo_202604.pdf` → `download_type = 5`
・`report_misc_202604.pdf` → `download_type = 2` (その他)
được record

補足：
・Thứ tự ưu tiên phán đoán là kouza_furikae → zougen_renraku → zougen_tsuchi → meibo / dokusya_meibo → その他 (api.md §4.5)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ 8: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-022-042 — UNAUTHORIZED — Tự động chuyển màn login khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Sau khi hiển thị màn hình, dùng thao tác admin xóa session trên Redis (hoặc update expire time về 0) để giả lập session hết hạn

ステップ2：
Trên màn hình nhấn button 検索

ステップ3：
Trên DevTools kiểm tra response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Session bị vô hiệu hóa

ステップ2：
Chuyển về màn login `/login`, query parameter `redirect=/file-upload` được gắn vào URL

ステップ3：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

補足：
・Phía frontend axios interceptor phát hiện 401 và chuyển redirect sang màn login

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-043 — BAD_REQUEST — Gửi trực tiếp request parameter bất hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Từ DevTools gửi GET `/api/v1/file-upload?page=abc` (page lẽ ra phải là integer)

ステップ2：
Gửi GET `/api/v1/file-upload?per_page=-1`

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST` hoặc `VALIDATION_ERROR`, message `リクエストパラメータが不正です。` hoặc message chi tiết tương đương)

ステップ2：
Trả về HTTP 400 (vì nhỏ hơn min 1)

補足：
・Parameter ngoài type/range dự kiến bị validation từ chối chính thức ở phía server, không phát sinh lỗi ngoài dự kiến

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-044 — VALIDATION_ERROR — Cấu trúc array errors và gửi gộp lỗi nhiều field

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Từ DevTools gửi GET `/api/v1/file-upload?todofuken_code=AB&per_page=999&sort_by=password` (gửi đồng thời 3 item với giá trị bất hợp lệ)

ステップ2：
Kiểm tra cấu trúc response JSON

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

ステップ2：
Array `errors` trong response chứa 3 lỗi, mỗi phần tử có format `{ field: string, message: string }`, lần lượt có `todofuken_code` / `per_page` / `sort_by`

補足：
・Lỗi validation nhiều field được gửi gộp trong 1 request, phía frontend map sang hiển thị inline theo từng item

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-045 — TOO_MANY_REQUESTS — Vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Rate limit: 100 request/60 giây (giá trị thiết lập vận hành)

### 手順

ステップ1：
Bằng script, thực thi liên tiếp 101 lần GET `/api/v1/file-upload` trong vòng 60 giây

ステップ2：
Kiểm tra response lần thứ 101

### 期待結果

ステップ1：
Đến lần 100 trả về HTTP 200

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

補足：
・Giá trị rate limit thay đổi theo thiết lập hạ tầng, do đó ngưỡng cho phép cần xác nhận theo từng môi trường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-046 — INTERNAL_SERVER_ERROR — Giả lập sự cố kết nối DB

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Môi trường test có thể tạm thời ngắt kết nối DB

### 手順

ステップ1：
Ngắt kết nối DB (hoặc từ BE process từ chối truy cập bảng `t_file_upload`)

ステップ2：
Trên màn hình nhấn button 検索

ステップ3：
Khôi phục kết nối DB

### 期待結果

ステップ1：
Kết nối DB bị vô hiệu hóa

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`), trên màn hình hiển thị toast với message tương đương ACSMS-MSG-022-004

ステップ3：
Sau khi khôi phục, search hoạt động bình thường

補足：
・Khi lỗi phía server cũng record `t_log` (log_type=3, error log)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-047 — NOT_FOUND — Chỉ định file_upload_id không tồn tại

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Từ DevTools gửi GET `/api/v1/file-upload/9999999/preview` (ID không tồn tại trên DB)

ステップ2：
Gửi GET `/api/v1/file-upload/9999999/download`

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`)

ステップ2：
Trả về HTTP 404 (`error_code: NOT_FOUND`), xử lý download KHÔNG được thực thi

補足：
・Vi phạm DataScope và không tồn tại vật lý trả về cùng response (404), không tiết lộ internal state

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-048 — NOT_FOUND — Truy cập trực tiếp file đã xóa logical (ACSMS-MSG-022-003)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Test data: file ID = 500 tồn tại đến trước đó được xóa logical bằng `UPDATE t_file_upload SET deleted_at = NOW() WHERE file_upload_id = 500`

### 手順

ステップ1：
Ở trạng thái cache trước khi refresh màn hình, check file ID = 500 và thực thi download

ステップ2：
Sau khi xác nhận response, kiểm tra nội dung toast phía frontend

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`), xử lý download KHÔNG được thực thi

ステップ2：
Màn hình hiển thị message `ファイルが存在していません。` (ACSMS-MSG-022-003)

補足：
・FE map 404 (NOT_FOUND) sang ACSMS-MSG-022-003 để hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-022-049 — Xử lý lỗi FE khi mất kết nối network

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Trên tab Network của DevTools, set ngắt kết nối network (chế độ Offline)

ステップ2：
Trên màn hình nhấn button 検索

ステップ3：
Khôi phục network và nhấn lại button 検索

### 期待結果

ステップ1：
Ở trạng thái mất kết nối network

ステップ2：
Phía frontend phát hiện lỗi network, hiển thị toast lỗi `システムエラーが発生しました。しばらくしてから再度お試しください。` (tương đương ACSMS-MSG-022-004), không vỡ layout, không phát sinh lỗi ngoài dự kiến

ステップ3：
Sau khi khôi phục network, search hoạt động bình thường, không ảnh hưởng nghiệp vụ

補足：
・Phía frontend axios interceptor bắt lỗi network và hiển thị message chung cho user

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
