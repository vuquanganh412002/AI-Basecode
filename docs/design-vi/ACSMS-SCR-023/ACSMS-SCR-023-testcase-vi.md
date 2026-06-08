---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-023
screen_name: ファイルアップロード画面
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

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA,
cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động.
Các chức năng chính bao gồm đăng ký・cập nhật・tìm kiếm thông tin người đăng ký,
quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động,
chức năng upload・download file, quản lý thông báo hệ thống.
Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・audit như quản lý đăng nhập của người dùng, ghi lại lịch sử đăng nhập,
ghi lại log thao tác của người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống đối với "Màn hình Upload file (ACSMS-SCR-023)".
Tài liệu này tham khảo ISTQB và IEEE 829, và phải đáp ứng các tiêu chuẩn chất lượng sau.

- Mỗi test case được tạo dựa trên một kịch bản đơn lẻ (single responsibility).
- Các bước được mô tả ở mức độ có thể tái hiện, và làm rõ dữ liệu test.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả DB query, HTTP status code, v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-023 | Tài liệu thiết kế màn hình Upload file |
| 2 | ACSMS-SCR-023-api | Tài liệu thiết kế API Upload file |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 7 |
| 2 | Hiển thị màn hình & Responsive (Layout & Responsive) | 7 |
| 3 | Header & Breadcrumb (Header & Breadcrumb) | 4 |
| 4 | Kiểm tra dữ liệu nhập (Input Validation) | 12 |
| 5 | Nghiệp vụ — Upload (Function — Upload) | 9 |
| 6 | Nghiệp vụ — Download & Xóa (Function — Download & Delete) | 6 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | Tổng | 52 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-023-001 — NICHINO_ADMIN được phép truy cập màn hình Upload file

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Giữ quyền「file.upload」「file.download」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Click「ファイルアップロード」và chuyển sang URL `/file-upload`

ステップ3：
Xác nhận response của GET `/api/v1/file-upload` ở tab Network của DevTools

### 期待結果

ステップ1：
Mục「ファイルアップロード」được hiển thị trên sidebar (do giữ quyền `file.upload`)

ステップ2：
Màn hình được hiển thị, và toast không được hiển thị

ステップ3：
Trả về HTTP 200, và danh sách file của toàn bộ JA được hiển thị (NICHINO_ADMIN có thể xem toàn bộ)

補足：
・Toàn bộ JA (JA code + JA name) được hiển thị trong select box JA đối tượng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-002 — NICHINO_STAFF được phép truy cập màn hình Upload file

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Giữ quyền「file.upload」「file.download」

### 手順

ステップ1：
Xác nhận mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Chuyển sang URL `/file-upload`

ステップ3：
Xác nhận response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Màn hình được hiển thị, và toast không được hiển thị

ステップ3：
Trả về HTTP 200, và danh sách file của toàn bộ JA được hiển thị (NICHINO_STAFF có thể xem toàn bộ)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-003 — CHUOKAI được phép truy cập màn hình Upload file (scope chuokai của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Giữ quyền「file.upload」「file.download」

### 手順

ステップ1：
Xác nhận mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Chuyển sang URL `/file-upload`

ステップ3：
Xác nhận response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Màn hình được hiển thị, và toast không được hiển thị

ステップ3：
Trả về HTTP 200, và chỉ file của chuokai mình + JA quản hạt được hiển thị (DataScope: chuokai mình + JA quản hạt)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-004 — JA_HONTEN được phép truy cập màn hình Upload file (scope JA của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Giữ quyền「file.upload」「file.download」

### 手順

ステップ1：
Xác nhận mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Chuyển sang URL `/file-upload`

ステップ3：
Xác nhận response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Màn hình được hiển thị, và toast không được hiển thị

ステップ3：
Trả về HTTP 200, và chỉ file của JA mình được hiển thị (DataScope: `ja_id = user.ja_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-005 — JA_KANRI_SHITEN được phép truy cập màn hình Upload file (scope JA của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Giữ quyền「file.upload」「file.download」

### 手順

ステップ1：
Xác nhận mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Chuyển sang URL `/file-upload`

ステップ3：
Xác nhận response của GET `/api/v1/file-upload`

### 期待結果

ステップ1：
Mục「ファイルアップロード」được hiển thị trên sidebar

ステップ2：
Màn hình được hiển thị, và toast không được hiển thị

ステップ3：
Trả về HTTP 200, và chỉ file của JA mình được hiển thị (DataScope: `ja_id = user.ja_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-006 — Vi phạm DataScope: JA_HONTEN download file của JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id = 12345）
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file của JA khác（ja_id = 67890）（`file_upload_id = 202`）

### 手順

ステップ1：
Gửi trực tiếp GET `/api/v1/file-upload/202/download` bằng DevTools (file ngoài scope JA của mình)

ステップ2：
Xác nhận DB: `SELECT * FROM t_log WHERE result_status = 2 AND target_table = 't_file_upload' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

ステップ2：
・Có từ 1 error log trở lên được record
・Binary của file không được trả về trong response

補足：
・Truy cập dữ liệu ngoài scope bị chặn bởi guard của BE API

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — khi fail nghĩa là rò rỉ dữ liệu JA khác, xử lý như sự cố bảo mật.

## ACSMS-TC-023-007 — Tấn công trực tiếp URL: JA_HONTEN chỉ định ID của JA khác để upload

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN（ja_id = 12345）
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Gửi trực tiếp POST `/api/v1/file-upload` bằng multipart/form-data qua DevTools. Chỉ định `ja_ids[]=67890`（ngoài scope JA của mình）+ 1 file hợp lệ

ステップ2：
Xác nhận DB: `SELECT COUNT(*) FROM t_file_upload WHERE ja_id = 67890 AND deleted_at IS NULL`（so sánh số lượng trước và sau khi gửi）

### 期待結果

ステップ1：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

ステップ2：
・Record mới hướng tới JA khác（ja_id=67890）không được đăng ký vào `t_file_upload`
・File vật lý không được lưu vào storage

補足：
・ja_ids trong request body được validate bằng DataScope phía server, và ID ngoài scope bị từ chối

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Critical — khi fail nghĩa là ghi dữ liệu trái phép vào JA khác.

---

# カテゴリ 2: Hiển thị màn hình & Responsive (Layout & Responsive)

## ACSMS-TC-023-008 — Hiển thị màn hình ban đầu (toàn bộ mục trống)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chuyển sang URL `/file-upload` và hiển thị màn hình

### 期待結果

ステップ1：
・Màn hình được hiển thị
・Các mục nhập JA đối tượng, chọn file, ngày dự định xóa được hiển thị ở trạng thái ban đầu (trống/chưa chọn)
・Không vỡ layout

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-009 — Hiển thị khu vực chọn JA đối tượng

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận khu vực「対象JA選択」trên màn hình

ステップ2：
Click select box「都道府県コード」, tiếp theo xác nhận select box「対象JA」

### 期待結果

ステップ1：
・Các select box「都道府県コード」「都道府県名」「対象JA」, button「追加」, button「削除」được hiển thị
・「都道府県名」được hiển thị ở dạng read-only

ステップ2：
・Danh sách JA code + JA name được hiển thị trong select box「対象JA」
・Có thể tìm kiếm trong select box「対象JA」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-010 — Hiển thị khu vực chọn file

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận khu vực「ファイル選択」trên màn hình

ステップ2：
Sau khi chọn 1 file, xác nhận mục「削除予定日」

### 期待結果

ステップ1：
・Khu vực chọn file hỗ trợ drag and drop và button「参照」được hiển thị

ステップ2：
・「削除予定日」được hiển thị dưới dạng mục nhập calendar
・File đã chọn được hiển thị trong danh sách theo định dạng「tên file + size」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-011 — Hiển thị action button

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận khu vực action button ở phía dưới màn hình

### 期待結果

ステップ1：
・Button「アップロード実行」và button「クリア」được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-012 — Hiển thị bảng danh sách file đã upload

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại nhiều file đã upload (mỗi loại từ 1 row trở lên: row có `deleted_at` NULL và row có `deleted_at` NOT NULL)

### 手順

ステップ1：
Xác nhận bảng「アップロードされたファイルリスト」ở phía dưới màn hình

ステップ2：
Xác nhận trạng thái của cột「通知ステータス」và button「削除」của từng row

### 期待結果

ステップ1：
・Các cột「ファイル名」「サイズ」「通知ステータス」「削除予定日」「削除日」「操作（削除ボタン）」được hiển thị
・Cột「削除日」hiển thị「-」khi `deleted_at` là NULL, hiển thị theo định dạng yyyymmdd khi NOT NULL

ステップ2：
・Một trong các badge「未送信」「送信中」「完了」「一部失敗」được hiển thị ở cột「通知ステータス」
・Row có `deleted_at` NULL thì button「削除」được hiển thị ở trạng thái active
・Row có `deleted_at` NOT NULL thì button「削除」được hiển thị ở trạng thái disable

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-013 — Hiển thị responsive (không vỡ layout)

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Thay đổi chiều rộng browser sang các breakpoint 1280px / 768px / 375px và xác nhận màn hình

### 期待結果

ステップ1：
・Không vỡ layout ở mỗi breakpoint
・Không phát sinh scroll ngang ngoài ý muốn

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-014 — Thao tác bàn phím (thứ tự Tab)

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Di chuyển lần lượt qua từng mục nhập・button bằng phím Tab

ステップ2：
Focus vào button bằng phím Enter và xác nhận thao tác

### 期待結果

ステップ1：
・Thứ tự Tab tuân theo thứ tự hiển thị của màn hình (JA đối tượng → chọn file → ngày dự định xóa → action button)

ステップ2：
・Button được focus có thể thao tác bằng phím Enter

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 3: Header & Breadcrumb (Header & Breadcrumb)

## ACSMS-TC-023-015 — Hiển thị breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chuyển sang URL `/file-upload` và xác nhận breadcrumb ở phía trên màn hình

### 期待結果

ステップ1：
・Breadcrumb hiển thị「ホーム ＞ ファイルアップロード」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-016 — Click「ホーム」trên breadcrumb để chuyển về dashboard

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Click「ホーム」trên breadcrumb

### 期待結果

ステップ1：
・Chuyển sang `/dashboard`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-017 — Hiển thị tiêu đề trang

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chuyển sang URL `/file-upload` và xác nhận tiêu đề trang

### 期待結果

ステップ1：
・Tiêu đề trang hiển thị「ファイルアップロード画面」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-018 — Tên người dùng đăng nhập được hiển thị trên header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Xác nhận header ở phía trên màn hình

### 期待結果

ステップ1：
・Tên người dùng đăng nhập được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 4: Kiểm tra dữ liệu nhập (Input Validation)

## ACSMS-TC-023-019 — Kiểm tra required khi chưa chọn JA đối tượng

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Không thêm JA đối tượng nào, chỉ nhập file và ngày dự định xóa rồi click「アップロード実行」

ステップ2：
Gửi trực tiếp POST `/api/v1/file-upload` ở trạng thái JA đối tượng để trống bằng DevTools

### 期待結果

ステップ1：
・Hiển thị lỗi required (message `必須項目です。`, ACSMS-MSG-023-001)

ステップ2：
Trả về HTTP 400 (`error_code: TARGET_JA_REQUIRED`, message `対象JAを1つ以上選択してください。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-020 — Kiểm tra thêm trùng cùng một JA

- 観点ID: VP-B-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chọn 1 JA ở JA đối tượng và click button「追加」

ステップ2：
Chọn lại cùng một JA và click button「追加」

### 期待結果

ステップ1：
・JA đã chọn được thêm vào danh sách JA (JA code + JA name)

ステップ2：
・Error message `このJAは既に選択されています。`（ACSMS-MSG-023-004）được hiển thị
・Dữ liệu trùng không được thêm vào danh sách JA

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-021 — Kiểm tra required khi chưa chọn file

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chỉ nhập JA đối tượng và ngày dự định xóa, không chọn file nào rồi click「アップロード実行」

### 期待結果

ステップ1：
・Hiển thị lỗi required (message `必須項目です。`, ACSMS-MSG-023-001)
・Xử lý upload không được thực thi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-022 — Kiểm tra required khi chưa nhập ngày dự định xóa

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chỉ nhập JA đối tượng và file, để trống ngày dự định xóa rồi click「アップロード実行」

### 期待結果

ステップ1：
・Hiển thị lỗi required (message `必須項目です。`, ACSMS-MSG-023-001)
・Xử lý upload không được thực thi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-023 — Chọn ngày quá khứ cho ngày dự định xóa (không cho phép)

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chọn ngày quá khứ (ngày hôm trước) trên calendar ngày dự định xóa

### 期待結果

ステップ1：
・Không thể chọn ngày quá khứ (ngày quá khứ ở trạng thái disable trên calendar, hoặc phát sinh lỗi khi chọn)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-024 — Chọn ngày hôm nay cho ngày dự định xóa (giá trị biên・cho phép)

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chọn ngày hôm nay trên calendar ngày dự định xóa

### 期待結果

ステップ1：
・Có thể chọn ngày hôm nay (được cho phép như giá trị biên)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Giá trị biên của không cho phép ngày quá khứ (ngày hôm nay được cho phép). Cần xác nhận với khách hàng về việc xử lý ngày hôm nay để kiểm tra giá trị biên theo spec.

## ACSMS-TC-023-025 — File size vượt quá 30MB

- 観点ID: VP-D-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị file test có size vượt quá 30MB

### 手順

ステップ1：
Chọn file vượt quá 30MB

ステップ2：
Gửi trực tiếp POST `/api/v1/file-upload` có chứa file vượt quá 30MB bằng DevTools

### 期待結果

ステップ1：
・Error message `ファイルサイズが30MBを超えています。({fileName})`（ACSMS-MSG-023-002）được hiển thị
・File đó không được thêm vào danh sách file

ステップ2：
Trả về HTTP 400 (`error_code: FILE_SIZE_EXCEEDED`, message `ファイルサイズが30MBを超えています。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-026 — File size đúng 30MB (giá trị biên・cho phép)

- 観点ID: VP-D-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị file test có size đúng 30MB (30×1024×1024 byte)

### 手順

ステップ1：
Chọn file đúng 30MB

### 期待結果

ステップ1：
・File được thêm vào danh sách file (được cho phép như giá trị biên)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-027 — Chấp nhận file định dạng được cho phép

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị file test của mỗi extension được cho phép (.xlsx, .xls, .pdf, .jpg, .jpeg, .png, .doc, .docx, .pptx, .ppt, .csv, .txt, .zip)

### 手順

ステップ1：
Chọn lần lượt các file có extension được cho phép

### 期待結果

ステップ1：
・File có extension được cho phép (Excel／PDF／hình ảnh／Word／PowerPoint／CSV／text／nén) được thêm vào danh sách file

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-028 — Từ chối file định dạng không được cho phép

- 観点ID: VP-D-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị file test có extension không được cho phép (.exe)

### 手順

ステップ1：
Chọn file có extension không được cho phép (.exe)

ステップ2：
Gửi trực tiếp POST `/api/v1/file-upload` có chứa file extension không được cho phép bằng DevTools

### 期待結果

ステップ1：
・Error message `許可されていないファイル形式です。({fileName})`（ACSMS-MSG-023-010）được hiển thị
・File đó không được thêm vào danh sách file

ステップ2：
Trả về HTTP 400 (`error_code: FILE_FORMAT_ERROR`, message `許可されていないファイル形式です。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-029 — Chấp nhận extension chữ hoa (phán định bằng chuyển thành chữ thường)

- 観点ID: VP-D-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị file test có extension chữ hoa (`IMG.JPG`)

### 手順

ステップ1：
Chọn file có extension chữ hoa (`IMG.JPG`)

### 期待結果

ステップ1：
・File được thêm vào danh sách file (do extension được phán định sau khi chuyển thành chữ thường, nên `.JPG` cũng được cho phép)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-030 — Chọn nhiều file và hiển thị định dạng tên file

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chọn đồng thời nhiều file

ステップ2：
Sau khi upload, xác nhận định dạng hiển thị tên file của「アップロードされたファイルリスト」

### 期待結果

ステップ1：
・Tất cả nhiều file đều được thêm vào danh sách file (tên file + size)

ステップ2：
・Tên file được hiển thị theo định dạng「yyyymmddJaIDRole_tên file」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 5: Nghiệp vụ — Upload (Function — Upload)

## ACSMS-TC-023-031 — Upload luồng bình thường (1 JA × 1 file)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Thêm 1 JA đối tượng, chọn 1 file định dạng được cho phép, nhập ngày dự định xóa từ hôm nay trở đi

ステップ2：
Click「アップロード実行」

ステップ3：
Click「OK」trên dialog xác nhận

### 期待結果

ステップ1：
・JA đối tượng và file được hiển thị trong danh sách

ステップ2：
・Dialog xác nhận được hiển thị (message `このファイルをアップロードしますか？`, ACSMS-MSG-023-008)

ステップ3：
・Trả về HTTP 202
・Success message `ファイルのアップロードが完了しました。`（ACSMS-MSG-023-006）được hiển thị
・Form (JA đối tượng・file・ngày dự định xóa) được clear

補足：
・「アップロードされたファイルリスト」được fetch lại, và row mới được hiển thị
・Badge「未送信」hoặc「送信中」được hiển thị ở cột「通知ステータス」của row mới

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-032 — Tạo N×M record (nhiều JA × nhiều file)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Thêm 2 JA đối tượng, chọn 2 file định dạng được cho phép, nhập ngày dự định xóa rồi click「アップロード実行」→「OK」

ステップ2：
Xác nhận DB: `SELECT ja_id, file_name FROM t_file_upload WHERE created_by = :account_id ORDER BY file_upload_id DESC LIMIT 4`

### 期待結果

ステップ1：
・Trả về HTTP 202
・Success message `ファイルのアップロードが完了しました。`（ACSMS-MSG-023-006）được hiển thị

ステップ2：
・N×M = 2×2 = 4 record được đăng ký vào `t_file_upload` (tổ hợp của mỗi JA × mỗi file)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-033 — Chọn toàn bộ JA (record có ja_id=NULL)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Chọn「全JA」ở JA đối tượng và thêm vào, chọn 1 file, nhập ngày dự định xóa rồi click「アップロード実行」→「OK」

ステップ2：
Xác nhận DB: `SELECT ja_id FROM t_file_upload WHERE created_by = :account_id ORDER BY file_upload_id DESC LIMIT 1`

### 期待結果

ステップ1：
・Trả về HTTP 202

ステップ2：
・1 record có `ja_id` là NULL được đăng ký vào `t_file_upload`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-034 — Xác nhận persistence DB và status ban đầu

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Thực hiện upload (1 JA × 1 file)

ステップ2：
Xác nhận DB: `SELECT status, notification_status, scheduled_delete_date, error_file_path FROM t_file_upload WHERE file_upload_id = :new_id`

### 期待結果

ステップ1：
・Trả về HTTP 202

ステップ2：
・Dữ liệu được đăng ký (`status = 1`（đang xử lý）, `notification_status = 1`（chưa gửi）, `error_file_path = ""`)
・`scheduled_delete_date` được đăng ký theo ngày dự định xóa đã chỉ định trên màn hình

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-035 — Record audit log (upload)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Thực hiện upload

ステップ2：
Xác nhận DB: `SELECT log_type, operation, result_status, target_table, account_id FROM t_log WHERE target_table = 't_file_upload' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
・Trả về HTTP 202

ステップ2：
・Audit log được record (`log_type = 4`（thao tác file）, `operation = 'CREATE'`, `result_status = 1`, `target_table = 't_file_upload'`)
・`account_id` khớp với account test

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-036 — Chuyển đổi badge trạng thái thông báo (bất đồng bộ)

- 観点ID: VP-D-06
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Địa chỉ email nhận thông báo (`m_account.email` v.v.) đã được thiết lập cho JA đối tượng

### 手順

ステップ1：
Thực hiện upload và xác nhận cột「通知ステータス」của「アップロードされたファイルリスト」

ステップ2：
Sau một khoảng thời gian (sau khi background worker xử lý), reload màn hình và xác nhận lại cột「通知ステータス」

### 期待結果

ステップ1：
・Badge「未送信」hoặc「送信中」được hiển thị ở cột「通知ステータス」

ステップ2：
・Sau khi gửi thành công tới toàn bộ địa chỉ,「通知ステータス」được cập nhật thành badge「完了」(`notification_status = 3`, `notified_at` được record)

補足：
・Do việc gửi email được background worker thực thi bất đồng bộ, nên API trả về HTTP 202 ngay lập tức

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-037 — Gửi email thông báo thất bại tới một phần JA

- 観点ID: VP-D-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Chuẩn bị trạng thái trong nhiều JA có 1 JA có địa chỉ email không hợp lệ

### 手順

ステップ1：
Thực hiện upload nhắm tới nhiều JA (1 JA ở trạng thái gửi thất bại)

ステップ2：
Sau khi background worker xử lý, reload màn hình và xác nhận cột「通知ステータス」

### 期待結果

ステップ1：
・Trả về HTTP 202

ステップ2：
・「通知ステータス」của row JA bị thất bại được hiển thị bằng badge「一部失敗」(`notification_status = 4`)
・Có thể xác nhận message `一部のJAへの通知メール送信に失敗しました。「通知ステータス」が「一部失敗」の行をご確認ください。`（ACSMS-MSG-023-007）
・Chi tiết thất bại được record vào error log (`t_log`, `log_type = 3`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-038 — Cancel dialog xác nhận

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Nhập JA đối tượng, file và ngày dự định xóa rồi click「アップロード実行」

ステップ2：
Click「キャンセル」trên dialog xác nhận (ACSMS-MSG-023-008)

ステップ3：
Xác nhận DB: `SELECT COUNT(*) FROM t_file_upload WHERE created_by = :account_id`（so sánh số lượng trước và sau khi click）

### 期待結果

ステップ1：
・Dialog xác nhận được hiển thị (message `このファイルをアップロードしますか？`)

ステップ2：
・Màn hình hiện tại được giữ nguyên (nội dung nhập được giữ lại)

ステップ3：
・Dữ liệu mới không được đăng ký vào `t_file_upload`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-039 — Hủy chọn bằng button clear

- 観点ID: VP-E-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Click button「クリア」ở trạng thái đã chọn JA đối tượng và file

ステップ2：
Click「OK」trên dialog xác nhận

### 期待結果

ステップ1：
・Dialog xác nhận được hiển thị (message `全てのJAとファイルを削除します。よろしいでしょうか。`, ACSMS-MSG-023-003)

ステップ2：
・Danh sách JA đã chọn và danh sách file được clear

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

Khi chọn「キャンセル」thì không thực hiện xử lý gì.

---

# カテゴリ 6: Nghiệp vụ — Download & Xóa (Function — Download & Delete)

## ACSMS-TC-023-040 — Download file luồng bình thường

- 観点ID: VP-D-05
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đối tượng download (`file_upload_id = 201`)

### 手順

ステップ1：
Thực hiện thao tác download file đối tượng ở「アップロードされたファイルリスト」

ステップ2：
Xác nhận DB: `SELECT download_type FROM t_file_download ORDER BY created_at DESC LIMIT 1` và `SELECT operation FROM t_log WHERE target_table = 't_file_upload' AND operation = 'DOWNLOAD' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
・Trả về HTTP 200 (Content-Disposition: `attachment; filename="..."`, binary của file được download)

ステップ2：
・Lịch sử download được record vào `t_file_download` (`download_type = 2`)
・Audit log được record (`operation = 'DOWNLOAD'`, `log_type = 4`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-041 — Xóa file luồng bình thường (xóa logical + xóa vật lý)

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đối tượng xóa (`deleted_at` là NULL)

### 手順

ステップ1：
Click button「削除」của row đối tượng ở「アップロードされたファイルリスト」

ステップ2：
Xác định xóa trên dialog xác nhận

ステップ3：
Xác nhận DB: `SELECT deleted_at FROM t_file_upload WHERE file_upload_id = :id`

### 期待結果

ステップ1：
・Dialog xác nhận được hiển thị (message `このファイルを削除しますか？`, ACSMS-MSG-023-009)

ステップ2：
・Dữ liệu bị xóa (message `削除しました。`)
・Bảng được cập nhật, và ngày xóa được hiển thị ở cột「削除日」của row đã xóa

ステップ3：
・Bị xóa logical (`deleted_at IS NOT NULL`), và file vật lý bị xóa khỏi storage

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-042 — Record audit log (xóa)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đối tượng xóa

### 手順

ステップ1：
Xóa file

ステップ2：
Xác nhận DB: `SELECT log_type, operation, result_status, before_value FROM t_log WHERE target_table = 't_file_upload' AND operation = 'DELETE' ORDER BY log_datetime DESC LIMIT 1`

### 期待結果

ステップ1：
・Dữ liệu bị xóa (message `削除しました。`)

ステップ2：
・Audit log được record (`log_type = 4`, `operation = 'DELETE'`, `result_status = 1`)
・Dữ liệu trước khi xóa được record dưới dạng JSON ở `before_value`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-043 — Điều khiển active／disable của button xóa

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại từ 1 row trở lên cho mỗi loại: row có `deleted_at` NULL và row có `deleted_at` NOT NULL

### 手順

ステップ1：
Xác nhận trạng thái của button「削除」từng row ở「アップロードされたファイルリスト」

### 期待結果

ステップ1：
・Row có `deleted_at` NULL thì button「削除」được hiển thị ở trạng thái active
・Row có `deleted_at` NOT NULL thì button「削除」được hiển thị ở trạng thái disable

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-044 — Cancel dialog xác nhận xóa

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đối tượng xóa (`deleted_at` là NULL)

### 手順

ステップ1：
Click button「削除」của row đối tượng

ステップ2：
Click「キャンセル」trên dialog xác nhận (ACSMS-MSG-023-009)

ステップ3：
Xác nhận DB: `SELECT deleted_at FROM t_file_upload WHERE file_upload_id = :id`

### 期待結果

ステップ1：
・Dialog xác nhận được hiển thị (message `このファイルを削除しますか？`)

ステップ2：
・Màn hình hiện tại được giữ nguyên

ステップ3：
・Dữ liệu không bị xóa (vẫn ở `deleted_at IS NULL`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-045 — Download file đã xóa (NOT_FOUND)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đã xóa logical (`deleted_at IS NOT NULL`) (`file_upload_id = 301`)

### 手順

ステップ1：
Gửi trực tiếp GET `/api/v1/file-upload/301/download` bằng DevTools

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`)

補足：
・Record đã xóa logical không phải là đối tượng download (bị loại trừ bằng điều kiện `deleted_at IS NULL`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-023-046 — Xử lý 401 khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Trạng thái session đã bị làm hết hạn cưỡng chế

### 手順

ステップ1：
Sau khi session hết hạn, thực hiện thao tác bất kỳ trên màn hình (fetch lại danh sách file v.v.)

### 期待結果

ステップ1：
・Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)
・Khi session hết hạn, chuyển sang màn hình đăng nhập (`/login?redirect=...`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-047 — Gửi request parameter không hợp lệ (BAD_REQUEST)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Gửi query parameter không hợp lệ như GET `/api/v1/file-upload?status=abc&page=-1` bằng DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-048 — Lỗi validation (hình dạng mảng errors)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Gửi POST `/api/v1/file-upload` ở trạng thái chưa chỉ định JA đối tượng (`ja_ids` trống) bằng DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)
・Response chứa mảng `errors`, có hình dạng `{ field, message }` (ví dụ: `field: "ja_ids"`, `message: "対象JAを1つ以上選択してください。"`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-049 — Vượt quá rate limit (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Gửi liên tục số lần request vượt quá giới hạn trong thời gian ngắn

### 期待結果

ステップ1：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-050 — Lỗi server (INTERNAL_SERVER_ERROR)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Trạng thái có thể giả lập ghi storage thất bại

### 手順

ステップ1：
Thực hiện upload ở trạng thái giả lập ghi storage thất bại

ステップ2：
Xác nhận DB: `SELECT COUNT(*) FROM t_file_upload WHERE created_by = :account_id`（so sánh số lượng trước và sau khi thực hiện）

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)
・Message upload thất bại `アップロードに失敗しました。しばらくしてから再度お試しください。`（ACSMS-MSG-023-005）được hiển thị trên màn hình

ステップ2：
・Transaction được rollback, và dữ liệu mới không được đăng ký vào `t_file_upload`
・File vật lý đã được lưu được xóa bù trừ (compensating delete)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-051 — Lấy resource đã xóa (NOT_FOUND)

- 観点ID: VP-C-03
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Tồn tại file đã xóa logical (`file_upload_id = 301`)

### 手順

ステップ1：
Gửi trực tiếp DELETE `/api/v1/file-upload/301` bằng DevTools (record đã bị xóa)

### 期待結果

ステップ1：
Trả về HTTP 404 (`error_code: NOT_FOUND`, message `指定されたファイルが見つかりません。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-023-052 — Xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã đăng nhập + đã xác thực MFA

### 手順

ステップ1：
Click「アップロード実行」ở trạng thái giả lập mất kết nối mạng ở tab Network của DevTools

### 期待結果

ステップ1：
・Toast lỗi mạng được hiển thị ở phía frontend
・Không phát sinh lỗi ngoài dự kiến (màn hình không bị terminate bất thường)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế/Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
