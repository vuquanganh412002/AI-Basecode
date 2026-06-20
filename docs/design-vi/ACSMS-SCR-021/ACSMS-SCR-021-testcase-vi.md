---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-021
screen_name: 配達手数料支払情報出力画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-17
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/06/17 | 1.0 | Kieu Thi Diem | Tạo bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tài khoản.

Các chức năng chính bao gồm đăng ký・cập nhật・tìm kiếm thông tin người đăng ký, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tài khoản, chức năng upload・download file, quản lý thông báo hệ thống.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của người dùng, ghi lại lịch sử đăng nhập, ghi lại log thao tác của người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết bản đặc tả kiểm thử được tạo mới trên hệ thống tại「Màn hình xuất thông tin thanh toán phí giao hàng（ACSMS-SCR-021）」.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-021 | 配達手数料支払情報出力画面 設計書 |
| 2 | ACSMS-SCR-021 | 配達手数料支払情報出力画面 API設計書 |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 8 |
| 2 | Hiển thị màn hình (Layout / Rendering) | 6 |
| 3 | Kiểm tra đầu vào (Input Validation) | 5 |
| 4 | Logic nghiệp vụ (Business Logic) | 14 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
| | 合計 | 40 |

---

# カテゴリ1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-021-001 — Cấm truy cập màn hình（NICHINO_ADMIN）

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN（đã xác thực 2 bước）
  - ・Không có quyền「haitatsuryo.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「配達手数料支払情報出力」không hiển thị trong sidebar

ステップ2：
Nhập「/haitatsuryo」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi GET「/api/v1/haitatsuryo/preview」với request parameter hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「配達手数料支払情報出力」không hiển thị trong sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403（`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`）

補足：
・Truy cập được kiểm soát ở cả 3 lớp: menu FE, router guard FE, API guard BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-002 — Cấm truy cập màn hình（NICHINO_STAFF）

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_STAFF（đã xác thực 2 bước）
  - ・Không có quyền「haitatsuryo.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「配達手数料支払情報出力」không hiển thị trong sidebar

ステップ2：
Nhập「/haitatsuryo」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi POST「/api/v1/haitatsuryo/export」với request body hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「配達手数料支払情報出力」không hiển thị trong sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403（`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-003 — Cho phép truy cập màn hình（CHUOKAI）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI（đã xác thực 2 bước）
  - ・Có quyền「haitatsuryo.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Click mục「配達手数料支払情報出力」

### 期待結果

ステップ1：
Mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Chuyển sang「/haitatsuryo」và màn hình thiết lập xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-004 — Cho phép truy cập màn hình（JA_HONTEN）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_HONTEN（đã xác thực 2 bước）
  - ・Có quyền「haitatsuryo.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Click mục「配達手数料支払情報出力」

### 期待結果

ステップ1：
Mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Chuyển sang「/haitatsuryo」và màn hình thiết lập xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-005 — Cho phép truy cập màn hình（JA_KANRI_SHITEN）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN（đã xác thực 2 bước）
  - ・Có quyền「haitatsuryo.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Click mục「配達手数料支払情報出力」

### 期待結果

ステップ1：
Mục「配達手数料支払情報出力」được hiển thị trong sidebar

ステップ2：
Chuyển sang「/haitatsuryo」và màn hình thiết lập xuất được hiển thị

補足：
・Đối tượng tổng hợp được giới hạn chỉ trong các người đăng ký thuộc chi nhánh quản lý của chính mình（DataScope `kanri_shiten_id = user.kanri_shiten_id`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-006 — DataScope（CHUOKAI chỉ tổng hợp JA của mình）

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI（ja_id=1）
  - ・Tồn tại người đăng ký là đối tượng tổng hợp ở cả JA của mình（ja_id=1）và JA khác（ja_id=2）

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Xác nhận các販売店 có trong kết quả tổng hợp

### 期待結果

ステップ1：
Trả về HTTP 200

ステップ2：
Chỉ販売店 thuộc JA của mình（ja_id=1）trở thành đối tượng tổng hợp, và販売店 của JA khác（ja_id=2）không bị bao gồm

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-007 — DataScope（JA_KANRI_SHITEN chỉ tổng hợp chi nhánh quản lý của mình）

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN（kanri_shiten_id=10）
  - ・Tồn tại người đăng ký là đối tượng tổng hợp ở cả chi nhánh quản lý của mình（10）và chi nhánh quản lý khác（20）

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Xác nhận các販売店 có trong kết quả tổng hợp

### 期待結果

ステップ1：
Trả về HTTP 200

ステップ2：
Chỉ người đăng ký thuộc chi nhánh quản lý của mình（kanri_shiten_id=10）trở thành đối tượng tổng hợp, và người đăng ký của chi nhánh quản lý khác（20）không bị bao gồm

補足：
・Màn hình này không có mục để chỉ định JA khác／chi nhánh quản lý khác trong request, DataScope được áp dụng bằng việc tự động lọc phía server（mệnh đề WHERE）. Trong trường hợp truy cập ngoài phạm vi ở lớp API thì Trả về HTTP 403（`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-008 — Truy cập URL trực tiếp（role không có quyền）

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN（không có quyền「haitatsuryo.export」）

### 手順

ステップ1：
Nhập trực tiếp「/haitatsuryo」vào thanh địa chỉ và truy cập

ステップ2：
Reload bằng phím F5 của trình duyệt

### 期待結果

ステップ1：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ2：
Sau khi reload màn hình vẫn không hiển thị và chuyển sang「/dashboard」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ2: Hiển thị màn hình (Layout / Rendering)

## ACSMS-TC-021-009 — Hiển thị tiêu đề màn hình・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/haitatsuryo」

ステップ2：
Xác nhận tiêu đề và breadcrumb ở phần trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tiêu đề màn hình「配達手数料支払情報出力」được hiển thị, và breadcrumb「ホーム > 配達手数料支払情報出力」được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-010 — Hiển thị ban đầu（đầu vào trống・grid trống）

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/haitatsuryo」

ステップ2：
Xác nhận trạng thái ban đầu của vùng đầu vào và vùng grid

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Vùng đầu vào（năm tháng ngày・chu kỳ thanh toán phí giao hàng）được hiển thị trống
・Không tồn tại dữ liệu trong vùng grid

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-011 — Ô nhập chu kỳ thanh toán phí giao hàng

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/haitatsuryo」

ステップ2：
Xác nhận textbox của chu kỳ thanh toán phí giao hàng

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Textbox của chu kỳ thanh toán phí giao hàng được hiển thị và có thể nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-012 — Hiển thị cột grid sau khi tổng hợp

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại販売店 là đối tượng tổng hợp trong năm tháng đối tượng

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Xác nhận tiêu đề cột và dòng tổng của grid

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Các cột対象月・販売店コード・販売店名・当月部数・当月金額・支払サイクル・金融機関コード・金融機関名・口座支店コード・口座支店名・貯金種目・口座番号・口座名義・備考 được hiển thị
・Cuối cùng dòng tổng（合計部数・合計金額）được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-013 — Hiển thị button xuất Excel

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/haitatsuryo」

ステップ2：
Xác nhận hiển thị・trạng thái active của button「Excel出力」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Button「Excel出力」hiển thị ở trạng thái active

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-014 — Thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/haitatsuryo」

ステップ2：
Xác nhận bằng phím Tab di chuyển theo thứ tự năm tháng ngày → chu kỳ thanh toán phí giao hàng → button Excel出力

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Có thể di chuyển lần lượt từng mục bằng phím Tab, và cuối cùng đến được button「Excel出力」
・Không vỡ layout

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ3: Kiểm tra đầu vào (Input Validation)

## ACSMS-TC-021-015 — Kiểm tra bắt buộc năm tháng ngày（tổng hợp）

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click button「Excel出力」khi chưa chọn năm tháng ngày

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục năm tháng ngày（ACSMS-MSG-021-001）, và xử lý tổng hợp・xuất không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-016 — Kiểm tra bắt buộc năm tháng ngày（API trực tiếp）

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/haitatsuryo/preview」không có target_month qua tab Network của DevTools

ステップ2：
Gửi POST「/api/v1/haitatsuryo/export」không có target_month qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`, trong `errors` có chứa `{ field: 'target_month', message: '必須項目です。' }`）

ステップ2：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`, trong `errors` có chứa `{ field: 'target_month', message: '必須項目です。' }`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-017 — Kiểm tra phạm vi chu kỳ thanh toán phí giao hàng

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập「0」（dưới giới hạn dưới）vào chu kỳ thanh toán phí giao hàng và thực hiện tổng hợp

ステップ2：
Nhập「13」（vượt giới hạn trên）vào chu kỳ thanh toán phí giao hàng và thực hiện tổng hợp

ステップ3：
Nhập「1」「12」（giá trị biên）vào chu kỳ thanh toán phí giao hàng và thực hiện tổng hợp

### 期待結果

ステップ1：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`）

ステップ2：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`）

ステップ3：
「1」「12」được tiếp nhận bình thường và Trả về HTTP 200

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-018 — Kiểm tra số half-width chu kỳ thanh toán phí giao hàng

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập số full-width「３」vào chu kỳ thanh toán phí giao hàng

ステップ2：
Nhập ký tự「abc」vào chu kỳ thanh toán phí giao hàng

### 期待結果

ステップ1：
Chỉ cho nhập số half-width（số full-width không được tiếp nhận）

ステップ2：
Chỉ cho nhập số half-width（ký tự không được tiếp nhận）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-019 — Chọn ngày năm tháng ngày

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở calendar của năm tháng ngày và chọn một ngày bất kỳ

ステップ2：
Xác nhận ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### 期待結果

ステップ1：
Calendar được hiển thị và có thể chọn ngày

ステップ2：
Ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ4: Logic nghiệp vụ (Business Logic)

## ACSMS-TC-021-020 — Preview tổng hợp luồng bình thường

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký là đối tượng tổng hợp（loại thủ tục=mới）trong năm tháng đối tượng

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

### 期待結果

ステップ1：
・Trả về HTTP 200
・Danh sách được hiển thị（dòng tổng hợp theo từng販売店 được hiển thị）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-021 — Nhóm theo đơn vị販売店（tổng số部数）

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Nhiều người đăng ký được liên kết với cùng một販売店

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Đối chiếu当月部数 của販売店 cụ thể với tổng `dokusya_busu` của các người đăng ký liên kết với販売店 đó

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
Người đăng ký được nhóm theo từng販売店, và当月部数 khớp với `SUM(t_dokusya.dokusya_busu)` thuộc販売店 đó

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-022 — Tính金額 thuế trong（zei_kubun=1）

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Phân loại thuế của JA trực thuộc là thuế trong（m_ja.zei_kubun=1）

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Đối chiếu当月金額 của販売店 cụ thể với `当月部数 × m_tanka.kingaku_zeikomi`（tanka_type=2）

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
当月金額 được tính bằng `当月部数 × kingaku_zeikomi`（đơn giá thuế trong）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-023 — Tính金額 thuế ngoài（zei_kubun=2）

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Phân loại thuế của JA trực thuộc là thuế ngoài（m_ja.zei_kubun=2）

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Đối chiếu当月金額 của販売店 cụ thể với `当月部数 × m_tanka.kingaku_zeinuki`（tanka_type=2）

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
当月金額 được tính bằng `当月部数 × kingaku_zeinuki`（đơn giá thuế ngoài）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-024 — Tổng toàn bộ販売店（合計部数・合計金額）

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Nhiều販売店 trở thành đối tượng tổng hợp trong năm tháng đối tượng

### 手順

ステップ1：
Nhập năm tháng ngày và thực hiện tổng hợp

ステップ2：
Đối chiếu合計部数・合計金額 của dòng tổng với tổng của当月部数・当月金額 từng dòng販売店

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・合計部数 khớp với tổng当月部数 của từng販売店（grand_total_busu）
・合計金額 khớp với tổng当月金額 của từng販売店（grand_total_kingaku）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-025 — Lọc theo chu kỳ thanh toán phí giao hàng

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại nhiều販売店 có chu kỳ thanh toán khác nhau

### 手順

ステップ1：
Nhập năm tháng ngày và chu kỳ thanh toán phí giao hàng「3」rồi thực hiện tổng hợp

### 期待結果

ステップ1：
Chỉ販売店 có `m_hanbaiten.haitatsuryo_shiharai_cycle = 3` trở thành đối tượng tổng hợp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-026 — Chu kỳ thanh toán phí giao hàng không chỉ định（đối tượng toàn bộ chu kỳ）

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại nhiều販売店 có chu kỳ thanh toán khác nhau

### 手順

ステップ1：
Chỉ nhập năm tháng ngày, để chu kỳ thanh toán phí giao hàng không chỉ định rồi thực hiện tổng hợp

### 期待結果

ステップ1：
販売店 của toàn bộ chu kỳ trở thành đối tượng tổng hợp

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-027 — Đối tượng 0 bản（preview）

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại người đăng ký là đối tượng tổng hợp với năm tháng đối tượng・điều kiện đã chỉ định

### 手順

ステップ1：
Nhập năm tháng・điều kiện không tồn tại đối tượng tổng hợp rồi thực hiện tổng hợp

### 期待結果

ステップ1：
・Trả về HTTP 200（`data:[]`）
・Hiển thị message「該当する支払い情報が存在しません。」trong màn hình（ACSMS-MSG-021-003, không phải toast）
・Dữ liệu không hiển thị trong grid

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-028 — Xuất Excel luồng bình thường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại販売店 là đối tượng tổng hợp trong năm tháng đối tượng

### 手順

ステップ1：
Nhập năm tháng ngày

ステップ2：
Click button「Excel出力」

### 期待結果

ステップ1：
Có thể nhập năm tháng ngày

ステップ2：
・Trả về HTTP 200
・File Excel（`.xlsx`）được download（tên file `配達手数料支払情報出力_{YYYY年MM月}.xlsx`）
・Hiển thị toast「Excelファイルを出力しました。」（ACSMS-MSG-021-004）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-029 — Nội dung file Excel

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại販売店 là đối tượng tổng hợp trong năm tháng đối tượng

### 手順

ステップ1：
Thực hiện「Excel出力」và mở file Excel đã download

ステップ2：
Xác nhận tên sheet・dòng header・dòng dữ liệu・dòng tổng

### 期待結果

ステップ1：
Có thể mở file Excel

ステップ2：
・Tên sheet là「配達手数料支払情報」
・Dòng header hiển thị対象月・販売店コード・販売店名・当月部数・当月金額・支払サイクル・金融機関コード・金融機関名・口座支店コード・口座支店名・貯金種目・口座番号・口座名義・備考
・Cuối cùng dòng tổng（label「合計」＋合計部数＋合計金額）được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-030 — Đăng ký t_file_download

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「Excel出力」

ステップ2：
Thực thi query sau ở DB và xác nhận lịch sử download
```sql
SELECT download_type, file_name, record_count, target_month
FROM t_file_download
WHERE ja_id = 1
ORDER BY download_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
File Excel được download

ステップ2：
t_file_download được đăng ký 1 bản（download_type=2, file_name chứa tên file Excel, record_count chứa số lượng販売店, target_month chứa năm tháng đối tượng）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-031 — Ghi log thao tác（t_log）

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「Excel出力」

ステップ2：
Thực thi query sau ở DB và xác nhận log thao tác
```sql
SELECT log_type, operation, result_status, target_table, after_value
FROM t_log
WHERE ja_id = 1 AND gamen_name = '配達手数料支払情報出力画面 (ACSMS-SCR-021)'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
File Excel được download

ステップ2：
・Audit log được ghi 1 bản vào t_log（log_type=4, operation=`CREATE`, result_status=1, target_table=`t_file_download`）
・after_value chứa điều kiện export và số lượng theo định dạng JSON

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-032 — Đối tượng 0 bản（xuất Excel）

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại người đăng ký là đối tượng tổng hợp với năm tháng đối tượng・điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「Excel出力」với năm tháng・điều kiện không tồn tại đối tượng tổng hợp

ステップ2：
Xác nhận số lượng bản đăng ký t_file_download ở DB

### 期待結果

ステップ1：
・Trả về HTTP 200（`{ data: [] }` của `application/json`）
・File Excel không được download
・Hiển thị message「該当する支払い情報が存在しません。」trong màn hình（ACSMS-MSG-021-003）

ステップ2：
Record không được đăng ký vào t_file_download

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-033 — Rollback transaction

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh lỗi DB khi đăng ký t_file_download

### 手順

ステップ1：
Thực hiện「Excel出力」（inject lỗi giữa chừng khi đăng ký DB）

ステップ2：
Xác nhận trạng thái của t_file_download・t_log ở DB

### 期待結果

ステップ1：
Trả về HTTP 500（`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`）

ステップ2：
・Cả t_file_download・t_log（log_type=4）đều không được đăng ký（Được rollback）
・Error log được ghi 1 bản vào t_log（log_type=3, result_status=2）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

# カテゴリ5: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-021-034 — Request parameter không hợp lệ（BAD_REQUEST）

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/haitatsuryo/preview?target_month=2026-04-01&haitatsuryo_shiharai_cycle=abc」（chuỗi vào mục số nguyên）qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400（`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-035 — Hết session（UNAUTHORIZED）

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để cưỡng chế hết hạn session bằng công cụ quản lý

### 手順

ステップ1：
Cưỡng chế hết hạn session trong khi đang mở màn hình xuất thông tin thanh toán phí giao hàng

ステップ2：
Click button「Excel出力」

### 期待結果

ステップ1：
Màn hình ở trạng thái được hiển thị

ステップ2：
・Trả về HTTP 401（`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`）
・Chuyển sang「/login」（query có gắn `redirect`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-036 — Hình dạng response lỗi validation（VALIDATION_ERROR）

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi POST「/api/v1/haitatsuryo/export」với request body thiếu target_month qua tab Network của DevTools

### 期待結果

ステップ1：
・Trả về HTTP 400（`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`）
・Response có chứa mảng `errors`, mỗi phần tử có hình dạng `{ field, message }`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-037 — Vượt giới hạn rate limit（TOO_MANY_REQUESTS）

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi liên tục request tương đương「Excel出力」đến số lần giới hạn

ステップ2：
Gửi thêm request vượt quá giới hạn

### 期待結果

ステップ1：
Request đến số lần giới hạn được xử lý bình thường

ステップ2：
Trả về HTTP 429（`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-038 — Lỗi hệ thống（INTERNAL_SERVER_ERROR）

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh exception phía server

### 手順

ステップ1：
Thực hiện「Excel出力」trong trạng thái đã phát sinh lỗi kết nối DB v.v. phía server

### 期待結果

ステップ1：
・Trả về HTTP 500（`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`）
・Hiển thị toast「システムエラーが発生しました。しばらくしてから再度お試しください。」（ACSMS-MSG-021-002）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-039 — Ngắt kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chọn「Offline」ở tab Network của DevTools và ngắt kết nối mạng

ステップ2：
Click button「Excel出力」

### 期待結果

ステップ1：
Mạng được ngắt kết nối

ステップ2：
・Hiển thị toast lỗi mạng
・Không bị terminate bất thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-021-040 — An toàn với đầu vào SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chỉ định `2026-04-01'; DROP TABLE t_dokusya; --` vào target_month của GET「/api/v1/haitatsuryo/preview」và gửi qua tab Network của DevTools

ステップ2：
Xác nhận bảng t_dokusya tồn tại ở DB

### 期待結果

ステップ1：
・Giá trị đầu vào được xử lý như literal bằng parameterized query, không được thực thi như SQL
・Trả về HTTP 400（`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`）

ステップ2：
Bảng t_dokusya không bị xóa và tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
