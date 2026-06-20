---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-028
screen_name: 増減連絡票（販売店）出力画面
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

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của người dùng, ghi lịch sử đăng nhập, ghi log thao tác của người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết bản đặc tả kiểm thử được tạo mới trên hệ thống tại「Màn hình xuất Phiếu liên lạc tăng giảm (Cửa hàng bán) (ACSMS-SCR-028)」.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-028 | 増減連絡票（販売店）出力画面 設計書 |
| 2 | ACSMS-SCR-028 | 増減連絡票（販売店）出力画面 API設計書 |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 8 |
| 2 | Hiển thị màn hình (Layout / Rendering) | 7 |
| 3 | Kiểm tra đầu vào (Input Validation) | 4 |
| 4 | Logic nghiệp vụ (Business Logic) | 14 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
| | 合計 | 40 |

---

# カテゴリ1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-028-001 — Cấm truy cập màn hình (NICHINO_ADMIN)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (đã xác thực 2 bước)
  - ・Không có quyền「report.export_zougen_hanbaiten」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減連絡票（販売店）出力」không hiển thị ở sidebar

ステップ2：
Nhập「/report/zougen-hanbaiten」vào thanh địa chỉ của trình duyệt và truy cập trực tiếp

ステップ3：
Tại tab Network của DevTools, gửi GET「/api/v1/report/zougen-hanbaiten/preview」với request parameter hợp lệ

### 期待結果

ステップ1：
Mục「増減連絡票（販売店）出力」không hiển thị ở sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Khi route guard của màn hình này chặn NICHINO_ADMIN / NICHINO_STAFF, hiển thị message「この機能はJAアカウントのみ使用できます。」(ACSMS-MSG-028-001)
・Việc truy cập được kiểm soát ở cả 3 lớp: menu FE, router guard FE, API guard BE

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-002 — Cấm truy cập màn hình (NICHINO_STAFF)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_STAFF (đã xác thực 2 bước)
  - ・Không có quyền「report.export_zougen_hanbaiten」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減連絡票（販売店）出力」không hiển thị ở sidebar

ステップ2：
Nhập「/report/zougen-hanbaiten」vào thanh địa chỉ của trình duyệt và truy cập trực tiếp

ステップ3：
Tại tab Network của DevTools, gửi POST「/api/v1/report/zougen-hanbaiten/export」với request body hợp lệ

### 期待結果

ステップ1：
Mục「増減連絡票（販売店）出力」không hiển thị ở sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Khi route guard của màn hình này chặn NICHINO_ADMIN / NICHINO_STAFF, hiển thị message「この機能はJAアカウントのみ使用できます。」(ACSMS-MSG-028-001)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-003 — Cho phép truy cập màn hình (CHUOKAI)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (đã xác thực 2 bước)
  - ・Có giữ quyền「report.export_zougen_hanbaiten」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減連絡票（販売店）出力」hiển thị ở sidebar

ステップ2：
Click mục「増減連絡票（販売店）出力」

### 期待結果

ステップ1：
Mục「増減連絡票（販売店）出力」được hiển thị ở sidebar

ステップ2：
Chuyển sang「/report/zougen-hanbaiten」và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-004 — Cho phép truy cập màn hình (JA_HONTEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_HONTEN (đã xác thực 2 bước)
  - ・Có giữ quyền「report.export_zougen_hanbaiten」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減連絡票（販売店）出力」hiển thị ở sidebar

ステップ2：
Click mục「増減連絡票（販売店）出力」

### 期待結果

ステップ1：
Mục「増減連絡票（販売店）出力」được hiển thị ở sidebar

ステップ2：
Chuyển sang「/report/zougen-hanbaiten」và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-005 — Cho phép truy cập màn hình (JA_KANRI_SHITEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (đã xác thực 2 bước)
  - ・Có giữ quyền「report.export_zougen_hanbaiten」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減連絡票（販売店）出力」hiển thị ở sidebar

ステップ2：
Click mục「増減連絡票（販売店）出力」

### 期待結果

ステップ1：
Mục「増減連絡票（販売店）出力」được hiển thị ở sidebar

ステップ2：
Chuyển sang「/report/zougen-hanbaiten」và màn hình điều kiện xuất được hiển thị

補足：
・Đối tượng trích xuất được giới hạn chỉ trong dữ liệu thuộc chi nhánh quản lý của mình (DataScope `kanri_shiten_id = user.kanri_shiten_id`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-006 — Chỉ định cửa hàng bán ngoài scope (CHUOKAI)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (ja_id=1)
  - ・Tồn tại ID cửa hàng bán (ví dụ: 99) thuộc JA khác (ja_id=2)

### 手順

ステップ1：
Nhập ngày áp dụng

ステップ2：
Tại tab Network của DevTools, gửi GET「/api/v1/report/zougen-hanbaiten/preview」kèm theo `hanbaiten_id=99` thuộc JA khác

### 期待結果

ステップ1：
Có thể nhập ngày áp dụng

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-007 — Chỉ định chi nhánh quản lý ngoài scope (JA_KANRI_SHITEN)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (kanri_shiten_id=10)
  - ・Tồn tại ID chi nhánh quản lý khác (ví dụ: 20) thuộc JA của mình

### 手順

ステップ1：
Nhập ngày áp dụng

ステップ2：
Tại tab Network của DevTools, gửi GET「/api/v1/report/zougen-hanbaiten/preview」kèm theo `kanri_shiten_id=20` không phải chi nhánh quản lý của mình

### 期待結果

ステップ1：
Có thể nhập ngày áp dụng

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-008 — Truy cập trực tiếp URL (role không có quyền)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (không có quyền「report.export_zougen_hanbaiten」)

### 手順

ステップ1：
Nhập trực tiếp「/report/zougen-hanbaiten」vào thanh địa chỉ và truy cập

ステップ2：
Tải lại trang bằng phím F5 của trình duyệt

### 期待結果

ステップ1：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ2：
Sau khi tải lại, màn hình vẫn không hiển thị và chuyển sang「/dashboard」

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
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

## ACSMS-TC-028-009 — Hiển thị tiêu đề màn hình・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-hanbaiten」

ステップ2：
Xác nhận tiêu đề và breadcrumb ở phần trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tiêu đề màn hình「増減連絡票（販売店）出力」được hiển thị, và breadcrumb hiển thị「ホーム > 増減連絡票（販売店）出力」

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-010 — Hiển thị ban đầu (chưa chọn điều kiện xuất・preview trống)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-hanbaiten」

ステップ2：
Xác nhận trạng thái ban đầu của form điều kiện xuất và vùng preview

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Ngày áp dụng được hiển thị ở trạng thái chưa chọn
・Cửa hàng bán・chi nhánh quản lý được hiển thị ở trạng thái chưa chọn
・Dữ liệu không tồn tại ở vùng preview

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-011 — Hiển thị checkbox cửa hàng bán (loại trừ cửa hàng đã đóng)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại cửa hàng bán đã đóng (haiten_flg=true) và cửa hàng bán dummy bản điện tử

### 手順

ステップ1：
Xác nhận danh sách checkbox cửa hàng bán

### 期待結果

ステップ1：
・Chỉ các cửa hàng bán hợp lệ thuộc JA của mình được hiển thị
・Cửa hàng đã đóng (haiten_flg=true) và cửa hàng bán dummy bản điện tử không hiển thị
・Có thể chọn nhiều

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-012 — Hiển thị checkbox chi nhánh quản lý (DataScope)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN

### 手順

ステップ1：
Xác nhận danh sách checkbox chi nhánh quản lý

### 期待結果

ステップ1：
・Chỉ chi nhánh quản lý của mình được hiển thị (DataScope tự động áp dụng)
・Có thể chọn nhiều

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-013 — Hiển thị button preview・tạo phiếu điện tử

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-hanbaiten」

ステップ2：
Xác nhận hiển thị・trạng thái active của button「レポートプレビュー」「電子帳票作成」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Button「レポートプレビュー」「電子帳票作成」hiển thị ở trạng thái active

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-014 — Hiển thị 3 bảng preview

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng 増部・減部・住所変更 ở ngày áp dụng

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận 3 bảng ở vùng preview

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・3 bảng「増部」「減部」「住所変更」được hiển thị
・Các cột số phần・địa chỉ・họ tên・tên độc giả nơi giao・số điện thoại・ghi chú được hiển thị ở mỗi bảng

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-015 — Thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-hanbaiten」

ステップ2：
Di chuyển lần lượt qua từng mục điều kiện xuất bằng phím Tab, xác nhận cuối cùng đến được button

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Có thể di chuyển bằng phím Tab theo thứ tự ngày áp dụng → cửa hàng bán → chi nhánh quản lý → button
・Không vỡ layout

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
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

## ACSMS-TC-028-016 — Kiểm tra bắt buộc ngày áp dụng (preview)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click button「レポートプレビュー」khi vẫn để trống ngày áp dụng

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」dưới mục ngày áp dụng (ACSMS-MSG-028-004), và xử lý preview không được thực hiện

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-017 — Kiểm tra bắt buộc ngày áp dụng (tạo phiếu điện tử)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click button「電子帳票作成」khi vẫn để trống ngày áp dụng

### 期待結果

ステップ1：
・Hiển thị message「必須項目です。」dưới mục ngày áp dụng (ACSMS-MSG-028-004)
・Xử lý tạo PDF không được thực hiện

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-018 — Chọn ngày của ngày áp dụng

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở calendar của ngày áp dụng và chọn một ngày bất kỳ

ステップ2：
Xác nhận ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### 期待結果

ステップ1：
Calendar được hiển thị và có thể chọn ngày

ステップ2：
Ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-019 — Ngày áp dụng chưa nhập (API trực tiếp)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Tại tab Network của DevTools, gửi GET「/api/v1/report/zougen-hanbaiten/preview」không có tekiyo_date

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, trong `errors` có chứa `{ field: 'tekiyo_date', message: '必須項目です。' }`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
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

## ACSMS-TC-028-020 — Preview luồng bình thường

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng báo cáo tăng giảm (zougen_hokoku_flg=true) ở ngày áp dụng

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Trả về HTTP 200
・Danh sách được hiển thị (dữ liệu phiếu được hiển thị theo từng tổ hợp cửa hàng bán＋chi nhánh quản lý)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-021 — Phân loại phân khu tăng phần (増部)

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký có số phần đăng ký tăng so với lần trước

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận nội dung bảng 増部

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Record có `dokusya_busu > zenkai_dokusya_busu` được hiển thị ở bảng 増部
・Số phần được hiển thị theo định dạng「số phần đăng ký lần trước → số phần đăng ký」

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-022 — Phân loại phân khu giảm phần (減部)

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký có số phần đăng ký giảm so với lần trước

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận nội dung bảng 減部

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Record có `dokusya_busu < zenkai_dokusya_busu` được hiển thị ở bảng 減部
・Số phần được hiển thị theo định dạng「số phần đăng ký lần trước → số phần đăng ký」

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-023 — Phân loại phân khu thay đổi địa chỉ (住所変更)

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký có địa chỉ nơi giao lần trước và địa chỉ nơi giao hiện tại khác nhau

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận nội dung bảng 住所変更

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Record có địa chỉ nơi giao lần trước và địa chỉ nơi giao hiện tại khác nhau được hiển thị ở bảng 住所変更
・Mỗi người đăng ký được hiển thị thành 2 dòng「変更前」「変更後」(変更前＝địa chỉ lần trước, 変更後＝địa chỉ hiện tại)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-024 — Group hóa theo cửa hàng bán＋chi nhánh quản lý

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng cho nhiều tổ hợp cửa hàng bán・chi nhánh quản lý

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận thứ tự xuất của phiếu

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Dữ liệu phiếu được group hóa theo từng tổ hợp ID cửa hàng bán＋ID chi nhánh quản lý
・Được hiển thị theo thứ tự tăng dần của mã cửa hàng bán

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-025 — Trích xuất theo cờ báo cáo tăng giảm＋khớp ngày áp dụng

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại lịch sử khớp với ngày áp dụng, và lịch sử ngoài đối tượng báo cáo tăng giảm (zougen_hokoku_flg=false)

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Chỉ record có `joho_henko_tekiyo_date = ngày áp dụng` và `zougen_hokoku_flg = true` được trích xuất
・Record không khớp ngày áp dụng, hoặc ngoài đối tượng báo cáo tăng giảm không hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-026 — Loại trừ cửa hàng đã đóng

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại lịch sử gắn với cửa hàng đã đóng (haiten_flg=true)

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Record gắn với cửa hàng đã đóng (haiten_flg=true) không được trích xuất

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-027 — Filter cửa hàng bán

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở nhiều cửa hàng bán

### 手順

ステップ1：
Chọn ngày áp dụng và cửa hàng bán cụ thể, thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Chỉ record gắn với cửa hàng bán đã chọn được trích xuất

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-028 — Filter chi nhánh quản lý

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở nhiều chi nhánh quản lý

### 手順

ステップ1：
Chọn ngày áp dụng và chi nhánh quản lý cụ thể, thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Chỉ record gắn với chi nhánh quản lý đã chọn được trích xuất

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-029 — Đối tượng 0 bản (preview)

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại dữ liệu đối tượng với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「レポートプレビュー」với ngày áp dụng・điều kiện không có đối tượng

### 期待結果

ステップ1：
・Trả về HTTP 200 (`reports:[]`)
・Hiển thị message「対象のデータが存在しません。」(ACSMS-MSG-028-002, không phải toast)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-030 — Xuất phiếu điện tử (PDF) luồng bình thường・nội dung

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở ngày áp dụng

### 手順

ステップ1：
Chọn ngày áp dụng・cửa hàng bán・chi nhánh quản lý và thực hiện「電子帳票作成」

ステップ2：
Mở PDF đã download và xác nhận nội dung

### 期待結果

ステップ1：
・Trả về HTTP 200
・File PDF được download (tên file `増減連絡票_販売店_{YYYY年MM月DD日}.pdf`)

ステップ2：
・Xuất 1 trang theo từng tổ hợp cửa hàng bán＋chi nhánh quản lý, được ngắt trang theo thứ tự tăng dần của mã cửa hàng bán
・Tên cửa hàng bán・tên chi nhánh quản lý・TEL/FAX của chi nhánh quản lý・số trang được hiển thị ở header
・3 bảng 増部／減部／住所変更 được hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-031 — Ghi lịch sử download・log thao tác

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「電子帳票作成」

ステップ2：
Thực hiện query sau ở DB, xác nhận lịch sử download và log thao tác
```sql
SELECT download_type, file_name, record_count, target_month
FROM t_file_download
WHERE ja_id = 1
ORDER BY download_datetime DESC
LIMIT 1;

SELECT log_type, operation, result_status, target_table
FROM t_log
WHERE ja_id = 1 AND gamen_name = '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
File PDF được download

ステップ2：
・t_file_download được đăng ký 1 bản (download_type=3, file_name là tên file PDF, record_count là số bản đối tượng, target_month là năm tháng của ngày áp dụng)
・Audit log được ghi 1 bản ở t_log (log_type=1, operation=`EXPORT_PDF`, result_status=1, target_table=`t_file_download`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-032 — Rollback transaction

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị để phát sinh lỗi DB khi đăng ký lịch sử download

### 手順

ステップ1：
Thực hiện「電子帳票作成」(inject lỗi giữa chừng khi đăng ký DB)

ステップ2：
Xác nhận trạng thái t_file_download・t_log ở DB

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
・Cả t_file_download・t_log (log_type=1) đều không được đăng ký (được rollback)
・Error log được ghi 1 bản ở t_log (log_type=3, result_status=2)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-033 — Đối tượng 0 bản (tạo phiếu điện tử)

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại dữ liệu đối tượng với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「電子帳票作成」với ngày áp dụng・điều kiện không có đối tượng

ステップ2：
Xác nhận số bản đăng ký của t_file_download ở DB

### 期待結果

ステップ1：
・Trả về HTTP 200 (`{ data: { reports: [] } }` của `application/json`)
・File PDF không được download
・Hiển thị message「対象のデータが存在しません。」(ACSMS-MSG-028-002)

ステップ2：
Record không được đăng ký ở t_file_download

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
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

## ACSMS-TC-028-034 — Request parameter không hợp lệ (BAD_REQUEST)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Tại tab Network của DevTools, gửi GET「/api/v1/report/zougen-hanbaiten/preview?tekiyo_date=2026-05-01&hanbaiten_id=abc」(chuỗi ký tự ở mục số)

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。` hoặc `error_code: VALIDATION_ERROR`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-035 — Hết session (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị để cưỡng chế làm hết hiệu lực session bằng công cụ quản lý

### 手順

ステップ1：
Cưỡng chế làm hết hiệu lực session khi đang mở màn hình xuất Phiếu liên lạc tăng giảm (Cửa hàng bán)

ステップ2：
Click button「レポートプレビュー」

### 期待結果

ステップ1：
Màn hình đang ở trạng thái được hiển thị

ステップ2：
・Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)
・Chuyển sang「/login」(query được gắn thêm `redirect`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-036 — Hình dạng response lỗi validation (VALIDATION_ERROR)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Tại tab Network của DevTools, gửi POST「/api/v1/report/zougen-hanbaiten/export」với request body thiếu tekiyo_date

### 期待結果

ステップ1：
・Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)
・Response có chứa mảng `errors`, mỗi phần tử có hình dạng `{ field, message }`

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-037 — Vượt giới hạn rate (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi liên tục request tương đương preview hoặc tạo phiếu điện tử đến số lần giới hạn

ステップ2：
Gửi thêm request vượt quá giới hạn

### 期待結果

ステップ1：
Request đến số lần giới hạn được xử lý bình thường

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-038 — Lỗi hệ thống (INTERNAL_SERVER_ERROR)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị để phát sinh exception phía server

### 手順

ステップ1：
Thực hiện「レポートプレビュー」trong trạng thái đã phát sinh lỗi kết nối DB v.v. phía server

### 期待結果

ステップ1：
・Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)
・Hiển thị message「システムエラーが発生しました。しばらくしてから再度お試しください。」(ACSMS-MSG-028-003)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-039 — Ngắt kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chọn「Offline」tại tab Network của DevTools và ngắt kết nối mạng

ステップ2：
Click button「レポートプレビュー」

### 期待結果

ステップ1：
Mạng được ngắt kết nối

ステップ2：
・Toast lỗi mạng được hiển thị
・Không bị terminate bất thường

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-028-040 — An toàn với đầu vào SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Tại tab Network của DevTools, chỉ định tekiyo_date của GET「/api/v1/report/zougen-hanbaiten/preview」là `2026-05-01'; DROP TABLE t_dokusya_rireki; --` và gửi

ステップ2：
Xác nhận bảng t_dokusya_rireki tồn tại ở DB

### 期待結果

ステップ1：
・Giá trị đầu vào được xử lý như literal bởi parameterized query, không được thực thi như SQL
・Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`)

ステップ2：
Bảng t_dokusya_rireki không bị xóa và vẫn tồn tại

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
