---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-015
screen_name: 購読者販売店一括置換画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-04
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---

## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-06-04 | 1.0 | Kieu Thi Diem | Tạo bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026-08-06 | 1.1 | Tran Duc Tuyen | Bổ sung 4 ca kiểm thử (047〜050): đánh giá điều kiện có thể thay thế theo as-of ngày áp dụng và loại trừ bản điện tử (2 ca — đồng bộ với bản tiếng Nhật), cửa hàng giao báo đích là điều kiện tìm kiếm bắt buộc kèm loại trừ người đọc đang được cửa hàng đích giao, và cửa hàng giao báo (nguồn) là tùy chọn |  |  |

## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đặt báo, quản lý dữ liệu chuyển khoản tài khoản. Màn hình này cung cấp chức năng chọn nhiều độc giả đã search và thay thế hàng loạt cửa hàng giao báo (販売店).

## 資料目的

Đây là tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống cho「Màn hình thay thế hàng loạt cửa hàng độc giả (ACSMS-SCR-015)」.

- Mỗi test case được tạo dựa trên một kịch bản đơn lẻ (trách nhiệm đơn nhất).
- Các bước được mô tả ở mức độ có thể tái hiện, và chỉ rõ test data.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).
- Mỗi test case được gán observation ID (tham chiếu danh sách quan điểm test).

## 関連資料

| No. | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-015 | Tài liệu thiết kế màn hình thay thế hàng loạt cửa hàng độc giả |
| 2 | ACSMS-SCR-015-api | Tài liệu thiết kế API thay thế hàng loạt cửa hàng độc giả |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 5 |
| 2 | Hiển thị màn hình - Responsive (Layout & Responsive) | 6 |
| 3 | Header - Breadcrumb (Header & Breadcrumb) | 3 |
| 4 | Kiểm tra input (Input Validation) | 10 |
| 5 | Nghiệp vụ - Tìm kiếm (Function — Search) | 6 |
| 6 | Nghiệp vụ - Thay thế (Function — Replace) | 9 |
| 7 | Xử lý lỗi chung (Common Error Handling) | 7 |
| 8 | Nghiệp vụ - Đánh giá as-of・Điều kiện cửa hàng đích (Function — As-of / Destination) | 4 |
| 合計 | | 50 |

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-015-001 — Role NICHINO_ADMIN bị từ chối truy cập

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Role này không được cấp quyền `dokusya.replace_hanbaiten`

### 手順

ステップ1：
Kiểm tra danh sách menu ở sidebar.

ステップ2：
Nhập trực tiếp `/dokusya/replace-hanbaiten` vào thanh URL của trình duyệt và thử chuyển màn hình.

ステップ3：
Gọi trực tiếp `POST /api/v1/dokusya/replace-hanbaiten` từ API client.

### 期待結果

ステップ1：
Mục menu「購読者販売店一括置換」không hiển thị ở sidebar.

ステップ2：
Việc chuyển màn hình bị chặn, hiển thị toast「アクセス権がありません。」, và chuyển đến `/dashboard`.

ステップ3：
Trả về HTTP 403 (error_code: FORBIDDEN, message「この画面へのアクセス権限がありません。」).

補足：
・Không phát sinh bất kỳ thay đổi nào trên `t_dokusya` và `t_dokusya_rireki`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-002 — Role NICHINO_STAFF bị từ chối truy cập

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Role này không được cấp quyền `dokusya.replace_hanbaiten`

### 手順

ステップ1：
Kiểm tra danh sách menu ở sidebar.

ステップ2：
Nhập trực tiếp `/dokusya/replace-hanbaiten` vào thanh URL của trình duyệt và thử chuyển màn hình.

ステップ3：
Gọi trực tiếp `GET /api/v1/dokusya/replace-hanbaiten/search` từ API client.

### 期待結果

ステップ1：
Mục menu「購読者販売店一括置換」không hiển thị ở sidebar.

ステップ2：
Việc chuyển màn hình bị chặn, hiển thị toast「アクセス権がありません。」, và chuyển đến `/dashboard`.

ステップ3：
Trả về HTTP 403 (error_code: FORBIDDEN, message「この画面へのアクセス権限がありません。」).

補足：
・Không phát sinh bất kỳ thao tác tham chiếu hay update dữ liệu nào.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-003 — Role CHUOKAI được cho phép truy cập

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Role này được cấp quyền `dokusya.replace_hanbaiten`

### 手順

ステップ1：
Kiểm tra danh sách menu ở sidebar.

ステップ2：
Click vào mục menu「購読者販売店一括置換」.

### 期待結果

ステップ1：
Mục menu「購読者販売店一括置換」hiển thị ở sidebar.

ステップ2：
Chuyển đến màn hình thay thế hàng loạt cửa hàng độc giả (`/dokusya/replace-hanbaiten`), và không hiển thị toast từ chối truy cập.

補足：
・Theo DataScope, chỉ độc giả thuộc chuokai của mình mới là đối tượng search.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-004 — Role JA_HONTEN được cho phép truy cập

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Role này được cấp quyền `dokusya.replace_hanbaiten`

### 手順

ステップ1：
Kiểm tra danh sách menu ở sidebar.

ステップ2：
Click vào mục menu「購読者販売店一括置換」.

### 期待結果

ステップ1：
Mục menu「購読者販売店一括置換」hiển thị ở sidebar.

ステップ2：
Chuyển đến màn hình thay thế hàng loạt cửa hàng độc giả (`/dokusya/replace-hanbaiten`), và không hiển thị toast từ chối truy cập.

補足：
・Theo DataScope, chỉ độc giả thuộc JA của mình mới là đối tượng search.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-005 — Role JA_KANRI_SHITEN được cho phép truy cập và DataScope được áp dụng

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã login + đã xác thực MFA
  - ・Role này được cấp quyền `dokusya.replace_hanbaiten`
  - ・Tồn tại dữ liệu độc giả thuộc chi nhánh quản lý của mình và thuộc chi nhánh quản lý khác

### 手順

ステップ1：
Click vào mục menu「購読者販売店一括置換」để chuyển màn hình.

ステップ2：
Click button「検索」mà không chỉ định điều kiện search.

### 期待結果

ステップ1：
Chuyển đến màn hình thay thế hàng loạt cửa hàng độc giả (`/dokusya/replace-hanbaiten`), và không hiển thị toast từ chối truy cập.

ステップ2：
Danh sách kết quả search chỉ hiển thị độc giả thuộc chi nhánh quản lý của mình, và không hiển thị độc giả thuộc chi nhánh quản lý khác.

補足：
・Theo DataScope, tự động lọc theo chi nhánh quản lý của user đang login.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 2: Hiển thị màn hình - Responsive (Layout & Responsive)

## ACSMS-TC-015-006 — Khi hiển thị ban đầu, form search và table kết quả hiển thị rỗng

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở màn hình thay thế hàng loạt cửa hàng độc giả (`/dokusya/replace-hanbaiten`).

ステップ2：
Mở dropdown「管理支店」「配達販売店」ở khu vực search.

### 期待結果

ステップ1：
Các ô input của form search hiển thị rỗng, và table kết quả không hiển thị row nào.

ステップ2：
Các lựa chọn của dropdown「管理支店」và dropdown「配達販売店」được hiển thị thông qua việc load API.

補足：
・Khi hiển thị ban đầu, không phát sinh lệnh gọi API nào ngoài việc load dropdown.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-007 — Các cột của table kết quả search hiển thị đúng thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại dữ liệu độc giả khớp với điều kiện search

### 手順

ステップ1：
Nhập điều kiện search bất kỳ và click button「検索」.

ステップ2：
Kiểm tra các cột header của table kết quả được hiển thị.

### 期待結果

ステップ1：
Dữ liệu tương ứng được hiển thị trong danh sách kết quả search.

ステップ2：
Các cột của table kết quả hiển thị theo thứ tự「チェックボックス」「すべて選択／解除」「管理支店」「支店」「組合員コード」「購読者名」「配達先郵便番号」「配達先住所」「販売店コード」「販売店名」.

補足：
・Nội dung hiển thị của các cột khớp với dữ liệu độc giả của mỗi row.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-008 — Hiển thị và trạng thái active của các button là chính xác

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Dữ liệu độc giả đang hiển thị trong danh sách kết quả search

### 手順

ステップ1：
Kiểm tra các button ở trạng thái chưa chọn row nào trong danh sách kết quả search.

ステップ2：
Kiểm tra trạng thái active của từng button「検索」「検索クリア」「置換処理実行」.

### 期待結果

ステップ1：
Ở trạng thái chưa chọn row nào, button「置換処理実行」bị disable.

ステップ2：
Button「検索」và button「検索クリア」hiển thị ở trạng thái enable.

補足：
・Label của mỗi button hiển thị là「検索」「検索クリア」「置換処理実行」.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-009 — Khi chọn checkbox thì ngày áp dụng và đích thay thế hiển thị, button search bị disable

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Dữ liệu độc giả đang hiển thị trong danh sách kết quả search

### 手順

ステップ1：
Bật checkbox của một row bất kỳ trong table kết quả.

ステップ2：
Kiểm tra trạng thái hiển thị của màn hình và trạng thái active của button「検索」.

### 期待結果

ステップ1：
Ô input「適用日」và dropdown「置換先配達販売店」được hiển thị, và cả hai đều là mục bắt buộc.

ステップ2：
Ở trạng thái đã chọn từ 1 checkbox trở lên, button「検索」bị disable, và button「置換処理実行」được enable.

補足：
・Khi bỏ chọn tất cả checkbox thì「適用日」「置換先配達販売店」ẩn đi, và button「検索」được enable trở lại.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-010 — Khi hiển thị responsive không phát sinh vỡ layout

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đặt chiều rộng hiển thị của trình duyệt từ 1280px trở lên và hiển thị màn hình.

ステップ2：
Thu nhỏ chiều rộng hiển thị của trình duyệt xuống khoảng 768px và hiển thị màn hình.

### 期待結果

ステップ1：
Form search, button, table kết quả hiển thị không chồng chéo và không bị cắt xén.

ステップ2：
Dù thu nhỏ chiều rộng màn hình thì layout cũng không vỡ, và các phần tử được sắp xếp lại ở dạng đọc được.

補足：
・Thanh scroll ngang không phát sinh ở vị trí không mong muốn.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-011 — Có thể di chuyển focus bằng thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Đặt focus vào ô input đầu tiên ở khu vực search, và nhấn liên tục phím Tab.

ステップ2：
Thao tác button「検索」bằng phím Enter hoặc phím Space.

### 期待結果

ステップ1：
Khi nhấn phím Tab, focus di chuyển một cách logic theo thứ tự điều kiện search rồi đến button.

ステップ2：
Có thể thao tác button「検索」chỉ bằng bàn phím.

補足：
・Có thể hoàn thành thao tác search mà không sử dụng chuột.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 3: Header - Breadcrumb (Header & Breadcrumb)

## ACSMS-TC-015-012 — Tiêu đề trang hiển thị chính xác

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở màn hình thay thế hàng loạt cửa hàng độc giả (`/dokusya/replace-hanbaiten`).

ステップ2：
Kiểm tra hiển thị tiêu đề trang ở phần trên màn hình.

### 期待結果

ステップ1：
Màn hình được hiển thị.

ステップ2：
Tiêu đề trang hiển thị「購読者販売店一括置換」.

補足：
・Tiêu đề trang không bị lẫn với tiêu đề của màn hình khác.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-013 — Breadcrumb hiển thị và có thể chuyển trang khi click

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở màn hình thay thế hàng loạt cửa hàng độc giả, và kiểm tra hiển thị breadcrumb.

ステップ2：
Click vào「ホーム」trong breadcrumb.

### 期待結果

ステップ1：
Breadcrumb hiển thị「ホーム > 購読者販売店一括置換」.

ステップ2：
Khi click「ホーム」thì chuyển đến màn hình dashboard (`/dashboard`).

補足：
・「購読者販売店一括置換」là vị trí hiện tại nên không được thiết lập link.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-014 — Tên user đang login hiển thị ở header

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Mở màn hình thay thế hàng loạt cửa hàng độc giả.

ステップ2：
Kiểm tra hiển thị thông tin user ở header màn hình.

### 期待結果

ステップ1：
Màn hình được hiển thị.

ステップ2：
Tên user đang login hiển thị ở header.

補足：
・Tên user được hiển thị khớp với account đang login.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 4: Kiểm tra input (Input Validation)

## ACSMS-TC-015-015 — Giá trị biên số ký tự của mã thành viên được xử lý chính xác

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 20 ký tự vào「組合員コード」và click button「検索」.

ステップ2：
Thử nhập từ 21 ký tự trở lên vào「組合員コード」.

### 期待結果

ステップ1：
Có thể nhập đến 20 ký tự, và search được thực thi.

ステップ2：
Không thể nhập từ ký tự thứ 21 trở đi (giới hạn bởi số ký tự tối đa 20 ký tự).

補足：
・Mã thành viên được search theo điều kiện khớp hoàn toàn.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-016 — Giá trị biên số ký tự của họ tên được xử lý chính xác

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 100 ký tự vào「氏名」và click button「検索」.

ステップ2：
Thử nhập từ 101 ký tự trở lên vào「氏名」.

### 期待結果

ステップ1：
Có thể nhập đến 100 ký tự, và search được thực thi.

ステップ2：
Không thể nhập từ ký tự thứ 101 trở đi (giới hạn bởi số ký tự tối đa 100 ký tự).

補足：
・Họ tên được search theo điều kiện khớp một phần (LIKE).

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-017 — Giá trị biên số ký tự của họ tên kana và địa chỉ giao báo được xử lý chính xác

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 200 ký tự vào「かな氏名」, 300 ký tự vào「配達先住所」và click button「検索」.

ステップ2：
Thử nhập từ 201 ký tự trở lên vào「かな氏名」, từ 301 ký tự trở lên vào「配達先住所」.

### 期待結果

ステップ1：
Họ tên kana có thể nhập đến 200 ký tự, địa chỉ giao báo có thể nhập đến 300 ký tự, và search được thực thi.

ステップ2：
Họ tên kana không thể nhập từ ký tự thứ 201 trở đi, địa chỉ giao báo không thể nhập từ ký tự thứ 301 trở đi (giới hạn bởi số ký tự tối đa của mỗi mục).

補足：
・Họ tên kana và địa chỉ giao báo đều được search theo điều kiện khớp một phần.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-018 — Kiểm tra tương quan của ngày bắt đầu đặt báo phát sinh lỗi

- 観点ID: VP-B-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập 2026-06-30 vào「購読開始日FROM」, 2026-06-01 vào「購読開始日TO」.

ステップ2：
Click button「検索」.

### 期待結果

ステップ1：
Giá trị FROM và TO được phản ánh vào ô input.

ステップ2：
Phát sinh lỗi kiểm tra tương quan và hiển thị「「開始日」は「終了日」以前の日付を入力してください。」(error_code: DATE_RANGE_INVALID, HTTP 400).

補足：
・Search không được thực thi, và danh sách kết quả không được cập nhật.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-019 — Giá trị biên giới hạn trên của per_page phát sinh lỗi validation

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gọi `GET /api/v1/dokusya/replace-hanbaiten/search` với `per_page=100` từ API client.

ステップ2：
Gọi cùng API đó với `per_page=101`.

### 期待結果

ステップ1：
Trả về HTTP 200, và có thể lấy tối đa 100 record.

ステップ2：
Trả về HTTP 400 (error_code: VALIDATION_ERROR, trong mảng errors có field: per_page, message「per_pageは1〜100の範囲で指定してください。」).

補足：
・Khi vượt quá giới hạn trên thì không trả về dữ liệu.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-020 — Khi chưa chọn đích thay thế cửa hàng giao báo thì phát sinh lỗi required

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Dữ liệu độc giả đang hiển thị trong danh sách kết quả search

### 手順

ステップ1：
Bật checkbox của một row bất kỳ.

ステップ2：
Click button「置換処理実行」khi vẫn để「置換先配達販売店」chưa chọn.

### 期待結果

ステップ1：
「適用日」「置換先配達販売店」được hiển thị.

ステップ2：
Ô「置換先配達販売店」hiển thị lỗi「必須項目です。」.

補足：
・API thay thế không được gọi, và không phát sinh thay đổi trên `t_dokusya`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-021 — Khi chưa nhập ngày áp dụng thì phát sinh lỗi required

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Dữ liệu độc giả đang hiển thị trong danh sách kết quả search

### 手順

ステップ1：
Bật checkbox của một row bất kỳ, và chọn「置換先配達販売店」.

ステップ2：
Click button「置換処理実行」khi vẫn để「適用日」chưa nhập.

### 期待結果

ステップ1：
「適用日」「置換先配達販売店」được hiển thị, và đích thay thế được chọn.

ステップ2：
Ô「適用日」hiển thị lỗi「必須項目です。」.

補足：
・API thay thế không được gọi, và không phát sinh thay đổi trên `t_dokusya`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-022 — Không thể chỉ định ngày quá khứ cho ngày áp dụng

- 観点ID: VP-B-05
- 種類: Boundary (境界)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Dữ liệu độc giả đang hiển thị trong danh sách kết quả search
  - ・Ngày hiện tại là 2026-06-04

### 手順

ステップ1：
Bật checkbox của một row bất kỳ, và chọn「置換先配達販売店」.

ステップ2：
Chỉ định ngày trước ngày hiện tại (2026-06-03) vào「適用日」và click button「置換処理実行」.

### 期待結果

ステップ1：
「適用日」「置換先配達販売店」được hiển thị, và đích thay thế được chọn.

ステップ2：
Không thể chọn ngày quá khứ, hoặc phía server chỉ tiếp nhận từ ngày hiện tại trở đi (ngày áp dụng chỉ từ ngày hiện tại trở đi tekiyo_date >= CURRENT_DATE).

補足：
・Ngày từ ngày hiện tại (2026-06-04) trở đi có thể chỉ định bình thường.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-023 — Khoảng trắng trước sau của text search được loại bỏ rồi search

- 観点ID: VP-B-04
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại dữ liệu độc giả có họ tên「山田太郎」

### 手順

ステップ1：
Nhập vào「氏名」kèm khoảng trắng trước sau như「　山田　」.

ステップ2：
Click button「検索」.

### 期待結果

ステップ1：
Ô input hiển thị giá trị bao gồm khoảng trắng trước sau.

ステップ2：
Search được thực thi với giá trị đã loại bỏ khoảng trắng trước sau, và độc giả「山田太郎」hiển thị trong kết quả search.

補足：
・Số lượng kết quả search không thay đổi dù có hay không có khoảng trắng trước sau.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-024 — Input SQL injection được xử lý an toàn

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập chuỗi nhắm mục đích SQL injection như `' OR '1'='1` vào「氏名」.

ステップ2：
Click button「検索」.

### 期待結果

ステップ1：
Ô input hiển thị nguyên chuỗi đó.

ステップ2：
Chuỗi input được escape an toàn và được xử lý như điều kiện search, không phát sinh hành vi bất thường như lấy toàn bộ record.

補足：
・Không phát sinh lỗi database hay rò rỉ dữ liệu ngoài dự kiến (được vô hiệu hóa bằng parameterized query).

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 5: Nghiệp vụ - Tìm kiếm (Function — Search)

## ACSMS-TC-015-025 — Chỉ độc giả khớp với điều kiện search được hiển thị

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Đã đăng ký nhiều dữ liệu độc giả

### 手順

ステップ1：
Nhập nhiều điều kiện search như「管理支店」「組合員コード」.

ステップ2：
Click button「検索」.

### 期待結果

ステップ1：
Điều kiện search được phản ánh vào từng ô input.

ステップ2：
Chỉ độc giả khớp với điều kiện search được hiển thị trong danh sách kết quả, và độc giả không khớp điều kiện thì không hiển thị.

補足：
・Mã thành viên khớp hoàn toàn, họ tên - họ tên kana - địa chỉ giao báo được lọc theo khớp một phần.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-026 — Khi kết quả search 0 record thì hiển thị message

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Nhập điều kiện search không tồn tại dữ liệu tương ứng (mã thành viên không tồn tại).

ステップ2：
Click button「検索」.

### 期待結果

ステップ1：
Điều kiện search được phản ánh vào ô input.

ステップ2：
Danh sách kết quả là 0 record, và hiển thị「検索結果が見つかりませんでした。」(ACSMS-MSG-015-001).

補足：
・Khi 0 record thì không hiển thị error toast.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-027 — Tự động lọc theo JA của user đang login

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại dữ liệu độc giả của JA mình và JA khác

### 手順

ステップ1：
Click button「検索」mà không chỉ định điều kiện search.

ステップ2：
Kiểm tra JA của các độc giả hiển thị trong danh sách kết quả.

### 期待結果

ステップ1：
Search được thực thi.

ステップ2：
Danh sách kết quả chỉ hiển thị độc giả thuộc JA của mình, và độc giả của JA khác không hiển thị.

補足：
・Theo DataScope, tự động lọc theo JA của user đang login.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-028 — Chỉ độc giả đang đăng ký là đối tượng và dữ liệu đã xóa logic bị loại trừ

- 観点ID: VP-C-03
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả có `tetsuzuki_shurui` = 1 và độc giả khác
  - ・Tồn tại độc giả đã xóa logic có `deleted_at` không phải NULL

### 手順

ステップ1：
Click button「検索」mà không chỉ định điều kiện search.

ステップ2：
Kiểm tra trạng thái của các độc giả hiển thị trong danh sách kết quả.

### 期待結果

ステップ1：
Search được thực thi.

ステップ2：
Chỉ độc giả có `tetsuzuki_shurui` = 1 (đang đăng ký) được hiển thị, và độc giả đã xóa logic có `deleted_at` không phải NULL thì không hiển thị.

補足：
・Phân loại ngoài đối tượng và dữ liệu đã xóa logic hoàn toàn không bao gồm trong danh sách kết quả.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-029 — Pagination hoạt động 20 record mỗi trang

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại từ 21 độc giả trở lên khớp với điều kiện search

### 手順

ステップ1：
Thực thi search, và kiểm tra số record hiển thị ở trang đầu tiên.

ステップ2：
Di chuyển sang trang thứ 2.

### 期待結果

ステップ1：
Trang đầu tiên hiển thị mặc định 20 record.

ステップ2：
Có thể di chuyển sang trang thứ 2, và các độc giả từ record thứ 21 trở đi được hiển thị.

補足：
・Có thể di chuyển trang trong khi vẫn giữ điều kiện search.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-030 — Sort mã cửa hàng hoạt động theo tăng dần - giảm dần

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều độc giả có mã cửa hàng khác nhau trong kết quả search

### 手順

ステップ1：
Thực thi search, và chuyển sort cột「販売店コード」sang tăng dần ▲.

ステップ2：
Chuyển sort của cùng cột sang giảm dần ▼.

### 期待結果

ステップ1：
Mã cửa hàng được sắp xếp tăng dần, và điều kiện search được giữ nguyên.

ステップ2：
Mã cửa hàng được sắp xếp giảm dần, và điều kiện search được giữ nguyên.

補足：
・Quản lý chi nhánh - chi nhánh - mã thành viên - mã cửa hàng là đối tượng sort.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 6: Nghiệp vụ - Thay thế (Function — Replace)

## ACSMS-TC-015-031 — Cửa hàng của các độc giả đã chọn nhiều được thay thế hàng loạt

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều độc giả là đối tượng thay thế
  - ・Tồn tại cửa hàng khác là đích thay thế

### 手順

ステップ1：
Thực thi search, và tick nhiều độc giả là đối tượng.

ステップ2：
Chọn ngày từ ngày hiện tại trở đi vào「適用日」, chọn cửa hàng khác với hiện tại vào「置換先配達販売店」, và click button「置換処理実行」.

ステップ3：
Click「実行」trong dialog xác nhận.

### 期待結果

ステップ1：
Số lượng độc giả đã tick chuyển sang trạng thái đã chọn.

ステップ2：
Dialog xác nhận hiển thị「選択した購読者の販売店を置換します。よろしいでしょうか？」(ACSMS-MSG-015-007).

ステップ3：
API thay thế được gọi, và các điều sau được thực thi.
・Hiển thị「置換処理が完了しました。」(ACSMS-MSG-015-008).
・Lựa chọn row được hủy, và danh sách được load lại.

補足：
・Các row đối tượng của `t_dokusya` được UPDATE (hanbaiten_id=cửa hàng mới, rireki_no=rireki_no+1, cập nhật updated_at - updated_by), và thêm 1 row cho mỗi đối tượng vào `t_dokusya_rireki`.
・Log thao tác có operation=UPDATE, result_status=1 được record vào `t_log` trong cùng một transaction.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-032 — Chọn tất cả / hủy chọn hoạt động

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Nhiều độc giả đang hiển thị trong danh sách kết quả search

### 手順

ステップ1：
Bật checkbox「すべて選択／解除」ở header.

ステップ2：
Tắt checkbox đó.

### 期待結果

ステップ1：
Checkbox của tất cả row đang hiển thị được bật, và button「置換処理実行」được enable.

ステップ2：
Checkbox của tất cả row đang hiển thị được tắt, và button「置換処理実行」bị disable.

補足：
・Khi đang chọn tất cả mà bỏ chọn checkbox của một row riêng lẻ, trạng thái của「すべて選択／解除」chuyển sang đang hủy.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-033 — Khi cancel ở dialog xác nhận thì thay thế không được thực thi

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả là đối tượng thay thế

### 手順

ステップ1：
Tick độc giả đối tượng, nhập「適用日」「置換先配達販売店」và click button「置換処理実行」.

ステップ2：
Click「キャンセル」trong dialog xác nhận.

### 期待結果

ステップ1：
Dialog xác nhận hiển thị「選択した購読者の販売店を置換します。よろしいでしょうか？」(ACSMS-MSG-015-007).

ステップ2：
Dialog chỉ đóng lại mà API thay thế không được gọi, và trạng thái lựa chọn được giữ nguyên.

補足：
・Không phát sinh bất kỳ thay đổi nào trên `t_dokusya` - `t_dokusya_rireki` - `t_log`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-034 — Khi chỉ định cùng cửa hàng hiện tại làm đích thay thế thì phát sinh lỗi

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả đã biết rõ cửa hàng hiện tại

### 手順

ステップ1：
Tick độc giả đó, và nhập ngày từ ngày hiện tại trở đi vào「適用日」.

ステップ2：
Chọn cùng cửa hàng với hiện tại vào「置換先配達販売店」, click button「置換処理実行」và「実行」.

### 期待結果

ステップ1：
Tick và ngày áp dụng được phản ánh.

ステップ2：
Hiển thị「現在の販売店と同じ販売店は選択できません。」(ACSMS-MSG-015-005) (error_code: SAME_HANBAITEN, HTTP 400).

補足：
・Thay thế không được thực thi, và không phát sinh thay đổi trên `t_dokusya`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-035 — Khi bao gồm độc giả đọc kèm (併読者) làm đối tượng thì phát sinh lỗi

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả có `dokusya_shubetsu` = 3 (độc giả đọc kèm)

### 手順

ステップ1：
Tick độc giả đọc kèm (`dokusya_shubetsu` = 3), và nhập「適用日」「置換先配達販売店」.

ステップ2：
Click button「置換処理実行」và「実行」.

### 期待結果

ステップ1：
Tick và input được phản ánh.

ステップ2：
Hiển thị「電子版クレカ決済者・併読者は編集・削除できません。」(ACSMS-MSG-015-006) (error_code: INELIGIBLE_DOKUSYA, HTTP 400).

補足：
・Thay thế không được thực thi, và không phát sinh thay đổi trên `t_dokusya` - `t_dokusya_rireki`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-036 — Khi bao gồm độc giả thanh toán thẻ tín dụng bản điện tử làm đối tượng thì phát sinh lỗi

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả có `dokusya_shubetsu` = 2 và `shiharai_hoho` = 6 (độc giả thanh toán thẻ tín dụng bản điện tử)

### 手順

ステップ1：
Tick độc giả thanh toán thẻ tín dụng bản điện tử (`dokusya_shubetsu` = 2 và `shiharai_hoho` = 6), và nhập「適用日」「置換先配達販売店」.

ステップ2：
Click button「置換処理実行」và「実行」.

### 期待結果

ステップ1：
Tick và input được phản ánh.

ステップ2：
Hiển thị「電子版クレカ決済者・併読者は編集・削除できません。」(ACSMS-MSG-015-006) (error_code: INELIGIBLE_DOKUSYA, HTTP 400).

補足：
・Thay thế không được thực thi, và không phát sinh thay đổi trên `t_dokusya` - `t_dokusya_rireki`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-037 — Khi chỉ định ID độc giả không tồn tại thì phát sinh lỗi

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gọi `POST /api/v1/dokusya/replace-hanbaiten` từ API client.

ステップ2：
Gửi kèm ID độc giả không tồn tại trong dokusya_ids.

### 期待結果

ステップ1：
Request được tiếp nhận.

ステップ2：
Trả về HTTP 404 (error_code: NOT_FOUND, message「指定された購読者が見つかりません。」).

補足：
・Thay thế không được thực thi, và toàn bộ được rollback.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-038 — Khi một phần xử lý thay thế thất bại thì toàn bộ được rollback

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại nhiều độc giả là đối tượng thay thế, và có thể tái hiện tình huống một phần phát sinh lỗi update

### 手順

ステップ1：
Chọn nhiều độc giả, nhập「適用日」「置換先配達販売店」và thực thi xử lý thay thế.

ステップ2：
Phát sinh tình huống một phần độc giả update thất bại giữa chừng quá trình update.

### 期待結果

ステップ1：
API thay thế được gọi qua dialog xác nhận (ACSMS-MSG-015-007).

ステップ2：
Xử lý được thực thi trong một transaction đơn nhất, và khi một phần thất bại thì toàn bộ được rollback.
・`t_dokusya` - `t_dokusya_rireki` của các độc giả khác đã thành công cũng trở về trạng thái trước khi thay đổi.
・Error message được hiển thị.

補足：
・Khi phát sinh exception, log có log_type=3 của `t_log` được record bên ngoài transaction.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-039 — DataScope violation khi cố thay thế độc giả thuộc JA khác

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả thuộc JA khác với trung ương hội của mình

### 手順

ステップ1：
Tìm kiếm và hiển thị danh sách độc giả thuộc scope của mình.

ステップ2：
Gửi POST `/api/v1/dokusya/replace-hanbaiten` qua DevTools với `dokusya_ids` chứa `dokusya_id` thuộc JA khác.

ステップ3：
Kiểm tra DB `SELECT hanbaiten_id, rireki_no FROM t_dokusya WHERE dokusya_id = :other_ja_dokusya_id`.

### 期待結果

ステップ2：
Trả về HTTP 403 (error_code: DATA_SCOPE_VIOLATION, message このデータへのアクセス権限がありません。).

ステップ3：
・`hanbaiten_id` của `t_dokusya` không được cập nhật.
・`rireki_no` không bị thay đổi.

補足：
・Việc truy cập record của JA khác bị từ chối bởi kiểm tra DataScope phía server.
・Không có lịch sử được thêm vào `t_dokusya_rireki`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 7: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-015-040 — Khi hết session thì chuyển đến màn hình login

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Có thể tái hiện trạng thái session hết hạn

### 手順

ステップ1：
Click button「検索」ở trạng thái session đã hết hạn.

ステップ2：
Kiểm tra phản hồi từ server.

### 期待結果

ステップ1：
API search được gọi.

ステップ2：
Trả về HTTP 401 (error_code: UNAUTHORIZED, message「セッションが切れました。再度ログインしてください。」), và chuyển đến màn hình login (`/login`).

補足：
・Thông tin user ở local được hủy.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-041 — Khi gửi parameter không hợp lệ thì phát sinh lỗi

- 観点ID: VP-D-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gọi `POST /api/v1/dokusya/replace-hanbaiten` từ API client.

ステップ2：
Thiết lập giá trị không hợp lệ khác số vào new_hanbaiten_id và gửi.

### 期待結果

ステップ1：
Request được gửi.

ステップ2：
Trả về HTTP 400 (error_code: BAD_REQUEST, message「リクエストパラメータが不正です。」).

補足：
・Thay thế không được thực thi, và không phát sinh thay đổi trên `t_dokusya`.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-042 — Khi thiếu mục bắt buộc thì lỗi validation được trả về dưới dạng mảng

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Gọi `POST /api/v1/dokusya/replace-hanbaiten` từ API client.

ステップ2：
Gửi với dokusya_ids - new_hanbaiten_id - joho_henko_tekiyo_date chưa thiết lập.

### 期待結果

ステップ1：
Request được gửi.

ステップ2：
Trả về HTTP 400 (error_code: VALIDATION_ERROR, message「入力値が不正です。詳細はerrorsフィールドを確認してください。」), và field - message của từng mục thiếu được trả về ở dạng mảng trong field errors.

補足：
・Thay thế không được thực thi.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-043 — Khi vượt rate limit thì phát sinh lỗi

- 観点ID: VP-A-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Thực thi liên tục「検索」hoặc「置換処理実行」với số lần vượt giới hạn trên trong thời gian ngắn.

ステップ2：
Kiểm tra phản hồi từ server.

### 期待結果

ステップ1：
API được gọi liên tục.

ステップ2：
Trả về HTTP 429 (error_code: TOO_MANY_REQUESTS, message「リクエスト回数が上限を超えました。しばらくしてから再度お試しください。」).

補足：
・Việc vượt rate limit được thông báo bằng toast.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-044 — Khi lỗi nội bộ server thì hiển thị error message

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Có thể tái hiện tình huống phía server phát sinh lỗi nội bộ

### 手順

ステップ1：
Thực thi「検索」hoặc「置換処理実行」trong tình huống phía server phát sinh lỗi nội bộ.

ステップ2：
Kiểm tra phản hồi từ server.

### 期待結果

ステップ1：
API được gọi.

ステップ2：
Trả về HTTP 500 (error_code: INTERNAL_SERVER_ERROR), và hiển thị「システムエラーが発生しました。しばらくしてから再度お試しください。」(ACSMS-MSG-015-003).

補足：
・Chi tiết lỗi nội bộ hay stack trace không hiển thị ở phía frontend.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-045 — Khi nhắm độc giả đã xóa làm đối tượng thì phát sinh lỗi

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã login + đã xác thực MFA
  - ・Tồn tại độc giả đã xóa logic có `deleted_at` không phải NULL

### 手順

ステップ1：
Gọi API thay thế kèm ID độc giả đã bị xóa logic bằng thao tác khác, trong số các ID độc giả lấy được sau khi search.

ステップ2：
Kiểm tra phản hồi từ server.

### 期待結果

ステップ1：
Request được gửi.

ステップ2：
Trả về HTTP 404 (error_code: NOT_FOUND, message「指定された購読者が見つかりません。」).

補足：
・Thay thế đối với dữ liệu đã xóa không được thực thi, và toàn bộ được rollback.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-015-046 — Khi mất kết nối mạng thì hiển thị toast

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã login + đã xác thực MFA
  - ・Có thể đặt Network của DevTools sang offline

### 手順

ステップ1：
Đặt Network của DevTools sang offline.

ステップ2：
Thực thi「検索」hoặc「置換処理実行」.

### 期待結果

ステップ1：
Mạng chuyển sang trạng thái mất kết nối.

ステップ2：
Lỗi giao tiếp được bắt ở phía frontend, và toast lỗi mạng được hiển thị.

補足：
・Sau khi giao tiếp khôi phục thì có thể thao tác lại.

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

# カテゴリ 8: Logic nghiệp vụ — Đánh giá as-of・Điều kiện cửa hàng đích (Function — As-of / Destination)

## ACSMS-TC-015-047 — Chỉ những người đọc có thể thay thế tại thời điểm ngày áp dụng mới hiển thị trong kết quả tìm kiếm

- 観点ID: VP-F-07
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Người đọc A: ngày bắt đầu đọc báo=2026-05-01, ngày dự kiến hủy=không có
  - ・Người đọc B: ngày bắt đầu đọc báo=2026-05-01, ngày dự kiến hủy=2026-08-01
  - ・Người đọc C: ngày bắt đầu đọc báo=2026-10-01 (bắt đầu ở tương lai), ngày dự kiến hủy=không có

### Các bước

Bước 1:
Chỉ định "Ngày áp dụng" là 2026-07-01 rồi bấm nút "検索".

Bước 2:
Chỉ định "Ngày áp dụng" là 2026-09-01 rồi bấm nút "検索".

### Kết quả mong đợi

Bước 1:
Người đọc A・B được hiển thị, người đọc C (ngày bắt đầu đọc báo sau ngày áp dụng) không hiển thị (điều kiện có thể thay thế: ngày bắt đầu đọc báo <= ngày áp dụng).

Bước 2:
Người đọc A được hiển thị; người đọc B (ngày dự kiến hủy 2026-08-01 <= ngày áp dụng 2026-09-01) không hiển thị. Người đọc C (ngày bắt đầu đọc báo 2026-10-01 > ngày áp dụng) cũng không hiển thị (điều kiện có thể thay thế: không có ngày dự kiến hủy hoặc ngày dự kiến hủy sau ngày áp dụng).

Bổ sung:
・Điều kiện có thể thay thế dùng chung một tiêu chuẩn cho cả tìm kiếm và thực thi thay thế. Mỗi dòng trả về ở đây đều có thể thay thế độc lập theo ngày áp dụng, nên chọn tập con bất kỳ để thực thi thay thế vẫn qua được kiểm tra lúc thực thi (yêu cầu khách hàng 2026-07).

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

## ACSMS-TC-015-048 — Khi chọn bản điện tử ở loại đăng ký thì hiển thị thông báo ngoài phạm vi và không tìm kiếm được

- 観点ID: VP-B-06
- 種類: Normal (chính thường・yêu cầu khách hàng bản sửa đổi 2026-07)
- 前提条件:
  - ・role: JA_HONTEN
  - ・Đã đăng nhập + đã xác thực MFA
  - ・Radio loại đăng ký hiển thị "紙版" (bản giấy) và "電子版" (bản điện tử) (không hiển thị 併読 - kết hợp)

### Các bước

Bước 1:
Chọn radio "電子版" ở loại đăng ký.

Bước 2:
(Vẫn giữ bản điện tử đang chọn) Kiểm tra trạng thái của nút "検索".

Bước 3:
Chuyển loại đăng ký sang "紙版".

### Kết quả mong đợi

Bước 1:
Toast hiển thị "電子版は本画面では対象外です。" (ACSMS-MSG-015-009) (không hiển thị thông báo inline trong form). Ngày áp dụng bị xóa trống và vẫn ở trạng thái không nhập được (bị vô hiệu hóa).

Bước 2:
Nút "検索" bị vô hiệu hóa (disabled) và API tìm kiếm người đọc không được gọi. Nếu gọi trực tiếp API thì phía server trả về 400 (`VALIDATION_ERROR`, errors=[{ field: "dokusya_shubetsu", message: "電子版は本画面では対象外です。" }]) (chốt chặn phòng thủ phía server).

Bước 3:
Thông báo "電子版は本画面では対象外です。" biến mất, ngày áp dụng nhập được bằng lịch (được kích hoạt), và nút "検索" được kích hoạt trở lại.

Bổ sung:
・Bản điện tử = phân phối điện tử nên không có cửa hàng bán, vì vậy nằm ngoài phạm vi thay thế hàng loạt (bản sửa đổi yêu cầu khách hàng 2026-07 đã rút lại "bản điện tử = thay thế trong ngày"). Bản thân radio vẫn chọn được, khi chọn thì thông báo ngoài phạm vi bằng toast (không hiện thông báo inline). Cả API tìm kiếm và API thực thi thay thế đều từ chối `dokusya_shubetsu=2` bất kể ngày tháng.

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

## ACSMS-TC-015-049 — Cửa hàng giao báo đích là điều kiện tìm kiếm (bắt buộc) và loại trừ người đọc đang được cửa hàng đích giao

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `dokusya.replace_hanbaiten`)
  - ・Tồn tại người đọc loại đăng ký=bản giấy・đang đọc báo như sau (ngày áp dụng là 2030/09/01)
    - ・(a) 3 người có cửa hàng giao báo của lịch sử hiệu lực tại ngày áp dụng = cửa hàng A (nguồn thay thế)
    - ・(b) 2 người có cửa hàng giao báo của lịch sử hiệu lực tại ngày áp dụng = cửa hàng B (đích thay thế)
    - ・(c) 2 người có cửa hàng giao báo của lịch sử hiệu lực tại ngày áp dụng = cửa hàng C (không phải A cũng không phải B)

### Các bước

Bước 1:
Kiểm tra bố cục các mục trong khu vực tìm kiếm (có "置換先配達販売店" ngay sau ngày áp dụng)

Bước 2:
Bấm "検索" khi chưa chọn cửa hàng giao báo đích

Bước 3:
Tìm kiếm với loại đăng ký=bản giấy・ngày áp dụng=2030/09/01・cửa hàng giao báo=cửa hàng A・cửa hàng giao báo đích=cửa hàng B

Bước 4:
Tìm kiếm với cửa hàng giao báo=cửa hàng B・cửa hàng giao báo đích=cửa hàng B

Bước 5:
Chọn kết quả tìm kiếm, thực thi "置換" và xác nhận đích thay thế là cửa hàng B đã chọn trong điều kiện tìm kiếm

### Kết quả mong đợi

Bước 1:
"置換先配達販売店" luôn hiển thị ngay sau ngày áp dụng trong khu vực tìm kiếm. Ô nhập đích thay thế từng hiển thị sau khi chọn kết quả tìm kiếm không còn tồn tại (đã bỏ theo yêu cầu khách hàng 2026-07)

Bước 2:
ACSMS-MSG-015-010 `置換先配達販売店を選択してください。` hiển thị ngay dưới trường đích thay thế và API không được gọi

Bước 3:
Chỉ 3 bản ghi của (a) được hiển thị. 2 bản ghi của (b) bị **loại trừ** bởi `eff.hanbaiten_id <> :new_hanbaiten_id`. 2 bản ghi của (c) nằm ngoài phạm vi do bộ lọc cửa hàng giao báo

Bước 4:
ACSMS-MSG-015-011 `配達販売店と置換先配達販売店が同じです。異なる販売店を選択してください。` được hiển thị và API không được gọi. Nếu gọi trực tiếp API thì trả về 0 bản ghi (vì `eff.hanbaiten_id = B` và `eff.hanbaiten_id <> B` không thể đồng thời thỏa mãn)

Bước 5:
Đích thay thế đã chọn trong điều kiện tìm kiếm (cửa hàng B) trở thành mục tiêu thực thi thay thế. Sau khi thay thế hiển thị ACSMS-MSG-015-008 `置換処理が完了しました。`

Bổ sung:
・Đưa đích thay thế vào điều kiện tìm kiếm và dùng chính giá trị đó làm mục tiêu thay thế (yêu cầu khách hàng 2026-07・tài liệu thiết kế API v1.7). Ở quy cách cũ khi "tập hợp đã tìm" và "đích thay thế" là hai ô nhập riêng, vẫn còn khả năng đổi đích sau khi tìm kiếm rồi thay thế trong khi tập hợp còn chứa người đọc vốn đã được cửa hàng đó giao
・Điều kiện loại trừ được đánh giá theo **dòng lịch sử hiệu lực tại thời điểm ngày áp dụng**, không phải master (kể cả ngày áp dụng ở tương lai vẫn trả về tập hợp đúng)

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

## ACSMS-TC-015-050 — Cửa hàng giao báo (nguồn thay thế) là tùy chọn, khi không chỉ định thì đối tượng là toàn bộ cửa hàng trừ cửa hàng đích

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `dokusya.replace_hanbaiten`)
  - ・Dữ liệu giống ACSMS-TC-015-049 (cửa hàng A 3 bản ghi・cửa hàng B 2 bản ghi・cửa hàng C 2 bản ghi)

### Các bước

Bước 1:
Kiểm tra nhãn và sự tồn tại của dấu bắt buộc ở "配達販売店" trong khu vực tìm kiếm

Bước 2:
Để **trống** cửa hàng giao báo và tìm kiếm với loại đăng ký=bản giấy・ngày áp dụng=2030/09/01・cửa hàng giao báo đích=cửa hàng B

Bước 3:
Chỉ định cửa hàng giao báo=cửa hàng A và tìm kiếm với cùng điều kiện, đối chiếu khác biệt với Bước 2

Bước 4:
Chọn toàn bộ kết quả tìm kiếm khi để trống cửa hàng giao báo rồi thực thi thay thế

### Kết quả mong đợi

Bước 1:
Nhãn là "配達販売店" (không phải "置換元配達販売店") và không có dấu bắt buộc (`*`) (bản sửa đổi yêu cầu khách hàng 2026-07 đã đưa từ bắt buộc trở lại tùy chọn)

Bước 2:
Hiển thị 3 bản ghi của cửa hàng A và 2 bản ghi của cửa hàng C, tổng 5 bản ghi (đối tượng là toàn bộ cửa hàng trừ cửa hàng đích B). 2 bản ghi của cửa hàng B bị loại trừ

Bước 3:
Chỉ hiển thị 3 bản ghi của cửa hàng A (điều kiện `eff.hanbaiten_id = :hanbaiten_id` có thêm hiệu lực)

Bước 4:
Người đọc của cửa hàng A・cửa hàng C được thay thế đồng loạt sang cửa hàng B

Bổ sung:
・Cửa hàng giao báo là điều kiện "chỉ lọc khi có chỉ định". Kể cả khi để trống thì `≠ cửa hàng đích` vẫn luôn được áp dụng nên người đọc đang được cửa hàng đích giao không thể lọt vào (tài liệu thiết kế API v1.8・§4.3)
・Đây là bản sửa đổi phục vụ nghiệp vụ gom nhiều cửa hàng nguồn về một cửa hàng đích. Nếu giữ bắt buộc thì phải lặp lại việc tìm kiếm・thay thế cho từng cửa hàng

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
