---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-029
screen_name: 増減通知（日本農業新聞）出力画面
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
| 1 | 2026/06/17 | 1.0 | Kieu Thi Diem | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động.

Các chức năng chính bao gồm đăng ký・cập nhật・tìm kiếm thông tin người đăng ký, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động, chức năng tải lên・tải xuống file, quản lý thông báo hệ thống.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập người dùng, ghi nhận lịch sử đăng nhập, ghi nhận log thao tác người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết bản đặc tả kiểm thử được tạo mới trên hệ thống đối với「増減通知（日本農業新聞）出力画面（ACSMS-SCR-029）」.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-029 | 増減通知（日本農業新聞）出力画面 設計書 |
| 2 | ACSMS-SCR-029 | 増減通知（日本農業新聞）出力画面 API設計書 |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 8 |
| 2 | Hiển thị màn hình (Layout / Rendering) | 7 |
| 3 | Kiểm tra input (Input Validation) | 5 |
| 4 | Logic nghiệp vụ (Business Logic) | 16 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
| | 合計 | 43 |

---

# カテゴリ1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-029-001 — Cấm truy cập màn hình (NICHINO_ADMIN)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (đã xác thực 2 bước)
  - ・Không có quyền「report.export_zougen_nichino」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減通知（日本農業新聞）出力」không được hiển thị trên sidebar

ステップ2：
Nhập「/report/zougen-nichino」vào thanh địa chỉ của trình duyệt và truy cập trực tiếp

ステップ3：
Gửi GET「/api/v1/report/zougen-nichino/preview」với tham số request hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「増減通知（日本農業新聞）出力」không được hiển thị trên sidebar

ステップ2：
Toast「アクセス権がありません。」được hiển thị, và chuyển đến「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Khi route guard của màn hình này chặn NICHINO_ADMIN / NICHINO_STAFF, message「この機能はJAアカウントのみ使用できます。」được hiển thị (ACSMS-MSG-029-001)
・Việc truy cập được kiểm soát ở cả 3 lớp: FE menu, FE router guard, BE API guard

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-002 — Cấm truy cập màn hình (NICHINO_STAFF)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_STAFF (đã xác thực 2 bước)
  - ・Không có quyền「report.export_zougen_nichino」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減通知（日本農業新聞）出力」không được hiển thị trên sidebar

ステップ2：
Nhập「/report/zougen-nichino」vào thanh địa chỉ của trình duyệt và truy cập trực tiếp

ステップ3：
Gửi POST「/api/v1/report/zougen-nichino/export」với request body hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「増減通知（日本農業新聞）出力」không được hiển thị trên sidebar

ステップ2：
Toast「アクセス権がありません。」được hiển thị, và chuyển đến「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Khi route guard của màn hình này chặn NICHINO_ADMIN / NICHINO_STAFF, message「この機能はJAアカウントのみ使用できます。」được hiển thị (ACSMS-MSG-029-001)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-003 — Cho phép truy cập màn hình (CHUOKAI)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (đã xác thực 2 bước)
  - ・Có quyền「report.export_zougen_nichino」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Click mục「増減通知（日本農業新聞）出力」

### 期待結果

ステップ1：
Mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Chuyển đến「/report/zougen-nichino」, và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-004 — Cho phép truy cập màn hình (JA_HONTEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_HONTEN (đã xác thực 2 bước)
  - ・Có quyền「report.export_zougen_nichino」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Click mục「増減通知（日本農業新聞）出力」

### 期待結果

ステップ1：
Mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Chuyển đến「/report/zougen-nichino」, và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-005 — Cho phép truy cập màn hình (JA_KANRI_SHITEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (đã xác thực 2 bước)
  - ・Có quyền「report.export_zougen_nichino」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Click mục「増減通知（日本農業新聞）出力」

### 期待結果

ステップ1：
Mục「増減通知（日本農業新聞）出力」được hiển thị trên sidebar

ステップ2：
Chuyển đến「/report/zougen-nichino」, và màn hình điều kiện xuất được hiển thị

補足：
・Đối tượng trích xuất chỉ giới hạn ở dữ liệu thuộc chi nhánh quản lý của chính mình (DataScope `kanri_shiten_id = user.kanri_shiten_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-006 — Chỉ định chi nhánh quản lý ngoài phạm vi (CHUOKAI)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (ja_id=1)
  - ・Tồn tại ID chi nhánh quản lý (ví dụ: 99) thuộc JA khác (ja_id=2)

### 手順

ステップ1：
Nhập ngày áp dụng

ステップ2：
Gửi GET「/api/v1/report/zougen-nichino/preview」kèm `kanri_shiten_id=99` thuộc JA khác qua tab Network của DevTools

### 期待結果

ステップ1：
Ngày áp dụng có thể nhập được

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-007 — Chỉ định chi nhánh quản lý ngoài phạm vi (JA_KANRI_SHITEN)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (kanri_shiten_id=10)
  - ・Tồn tại ID chi nhánh quản lý khác (ví dụ: 20) thuộc JA của chính mình

### 手順

ステップ1：
Nhập ngày áp dụng

ステップ2：
Gửi GET「/api/v1/report/zougen-nichino/preview」kèm `kanri_shiten_id=20` ngoài chi nhánh quản lý của chính mình qua tab Network của DevTools

### 期待結果

ステップ1：
Ngày áp dụng có thể nhập được

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-008 — Truy cập trực tiếp URL (role không có quyền)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (không có quyền「report.export_zougen_nichino」)

### 手順

ステップ1：
Nhập trực tiếp「/report/zougen-nichino」vào thanh địa chỉ và truy cập

ステップ2：
Tải lại trang bằng phím F5 của trình duyệt

### 期待結果

ステップ1：
Toast「アクセス権がありません。」được hiển thị, và chuyển đến「/dashboard」

ステップ2：
Sau khi tải lại, màn hình vẫn không được hiển thị, và chuyển đến「/dashboard」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ2: Hiển thị màn hình (Layout / Rendering)

## ACSMS-TC-029-009 — Hiển thị tiêu đề màn hình・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-nichino」

ステップ2：
Xác nhận tiêu đề và breadcrumb ở phần trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tiêu đề màn hình「増減通知（日本農業新聞）出力」được hiển thị, và breadcrumb hiển thị「ホーム > 増減通知（日本農業新聞）出力」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-010 — Hiển thị ban đầu (chưa chọn điều kiện xuất・preview rỗng)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-nichino」

ステップ2：
Xác nhận trạng thái ban đầu của form điều kiện xuất và vùng preview

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Ngày áp dụng được hiển thị ở trạng thái chưa chọn
・Chi nhánh quản lý được hiển thị ở trạng thái chưa chọn
・Không có dữ liệu trong vùng preview

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-011 — Hiển thị checkbox chi nhánh quản lý (DataScope)

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN

### 手順

ステップ1：
Xác nhận danh sách checkbox chi nhánh quản lý

### 期待結果

ステップ1：
・Chỉ chi nhánh quản lý của chính mình được hiển thị (DataScope tự động áp dụng)
・Có thể chọn nhiều mục

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-012 — Hiển thị nút preview・電子帳票作成

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-nichino」

ステップ2：
Xác nhận trạng thái hiển thị・kích hoạt của nút「レポートプレビュー」「電子帳票作成」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Nút「レポートプレビュー」「電子帳票作成」được hiển thị ở trạng thái kích hoạt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-013 — Hiển thị cột của bảng thông báo

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở ngày áp dụng

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận tiêu đề cột và 合計行 của bảng thông báo

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Các cột 委託・販売店コード・販売店名・現在部数・増部数・減部数・新部数 được hiển thị
・合計行 được hiển thị ở cuối bảng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-014 — Chỉnh sửa trực tiếp 備考 trên preview

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Báo cáo theo từng chi nhánh quản lý đang được hiển thị trên preview

### 手順

ステップ1：
Nhập văn bản tùy ý vào textbox 備考 theo từng chi nhánh quản lý

### 期待結果

ステップ1：
・Có thể nhập vào textbox 備考
・备考 đã nhập được lưu giữ gắn với báo cáo của chi nhánh quản lý tương ứng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-015 — Thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/zougen-nichino」

ステップ2：
Di chuyển lần lượt qua từng mục điều kiện xuất bằng phím Tab, xác nhận cuối cùng đến được nút

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Có thể di chuyển theo thứ tự 適用日 → 管理支店 → nút bằng phím Tab
・Không xảy ra vỡ layout

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ3: Kiểm tra input (Input Validation)

## ACSMS-TC-029-016 — Kiểm tra bắt buộc 適用日 (preview)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click nút「レポートプレビュー」khi để trống 適用日

### 期待結果

ステップ1：
Message「必須項目です。」được hiển thị bên dưới mục 適用日 (ACSMS-MSG-029-004), và xử lý preview không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-017 — Kiểm tra bắt buộc 適用日 (電子帳票作成)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click nút「電子帳票作成」khi để trống 適用日

### 期待結果

ステップ1：
・Message「必須項目です。」được hiển thị bên dưới mục 適用日 (ACSMS-MSG-029-004)
・Việc hiển thị dialog xác nhận và xử lý tạo PDF không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-018 — Chọn ngày của 適用日

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở lịch của 適用日 và chọn một ngày tùy ý

ステップ2：
Xác nhận ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### 期待結果

ステップ1：
Lịch được hiển thị, và có thể chọn ngày

ステップ2：
Ngày đã chọn được hiển thị theo định dạng YYYY/MM/DD

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-019 — Kiểm tra số ký tự 備考

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Báo cáo theo từng chi nhánh quản lý đang được hiển thị trên preview

### 手順

ステップ1：
Nhập 1000 ký tự (số ký tự tối đa) vào 備考 và thực hiện「電子帳票作成」

ステップ2：
Gửi POST「/api/v1/report/zougen-nichino/export」kèm `biko` 1001 ký tự qua tab Network của DevTools

### 期待結果

ステップ1：
備考 1000 ký tự được tiếp nhận bình thường

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-020 — 適用日 chưa nhập (API trực tiếp)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/zougen-nichino/preview」không có tekiyo_date qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, trong `errors` có chứa `{ field: 'tekiyo_date', message: '必須項目です。' }`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ4: Logic nghiệp vụ (Business Logic)

## ACSMS-TC-029-021 — Preview luồng bình thường

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
・Danh sách được hiển thị (dữ liệu báo cáo được hiển thị theo từng chi nhánh quản lý)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-022 — Nhóm theo đơn vị chi nhánh quản lý

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở nhiều chi nhánh quản lý

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận thứ tự xuất của báo cáo

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Dữ liệu báo cáo được nhóm theo từng kanri_shiten_id (mỗi chi nhánh quản lý ＝ 1 tờ báo cáo)
・Hiển thị theo thứ tự tăng dần của mã chi nhánh quản lý, dòng chi tiết hiển thị theo thứ tự tăng dần của 販売店コード

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-023 — Tính toán 増部数・減部数・新部数

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại 販売店 có số phần tăng・số phần giảm

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận 現在部数・増部数・減部数・新部数 của dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・現在部数 được hiển thị bằng `COALESCE(zenkai_dokusya_busu, 0)`
・増部数 hiển thị `dokusya_busu - 現在部数` khi `dokusya_busu > 現在部数`, còn lại là 0
・減部数 hiển thị `現在部数 - dokusya_busu` khi `dokusya_busu < 現在部数`, còn lại là 0, và trong báo cáo hiển thị kèm「▲」
・新部数 được hiển thị bằng `現在部数 ＋ 増部数 － 減部数`（＝`dokusya_busu`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-024 — Hiển thị cột 委託

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại 販売店 có 委託区分 là 日農委託・振込・その他

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận cột 委託 của dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・販売店 có 委託区分 là 日農委託（`itaku_kubun=2`）hiển thị「委託」ở cột 委託
・販売店 có 委託区分 là 振込（1）・その他（9）hiển thị cột 委託 để trống

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-025 — Hiển thị 販売店 miễn thuế

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại 販売店 có số đăng ký doanh nghiệp phát hành hóa đơn hợp lệ để trống

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận 販売店名 của dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
販売店 có số đăng ký doanh nghiệp phát hành hóa đơn hợp lệ（`torihikisaki_no`）để trống được hiển thị với「（免）」gắn vào đầu 販売店名

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-026 — Dấu khác biệt so với lần xuất trước

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại 販売店 có giá trị khác với thời điểm xuất lần trước

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận dấu khác biệt của dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
Dòng có chênh lệch so với giá trị tại thời điểm xuất lần trước được hiển thị kèm dấu khác biệt (`diff_mark=true`, trong báo cáo là「◆」)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-027 — Loại trừ bản ghi có 現在部数 0 và 新部数 0

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại lịch sử có 現在部数=0 và 新部数=0

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Bản ghi có 現在部数=0 và 新部数=0（`COALESCE(zenkai_dokusya_busu,0)=0 AND dokusya_busu=0`）không được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-028 — Loại trừ 廃店

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại lịch sử của 廃店（haiten_flg=true）・販売店 dummy bản điện tử

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Bản ghi gắn với 廃店（haiten_flg=true）・販売店 dummy bản điện tử không được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-029 — Tổng hợp 合計行

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại nhiều 販売店 trong 1 chi nhánh quản lý

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Đối chiếu 合計行 và dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
現在部数・増部数・減部数・新部数 của 合計行 khớp với tổng của từng dòng chi tiết trong chi nhánh quản lý tương ứng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-030 — Hiển thị mã chi nhánh quản lý phân cách bằng dấu gạch ngang

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại chi nhánh quản lý có mã chi nhánh quản lý 10 chữ số

### 手順

ステップ1：
Nhập ngày áp dụng và thực hiện「レポートプレビュー」

ステップ2：
Xác nhận hiển thị mã chi nhánh quản lý ở header của báo cáo

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
Mã chi nhánh quản lý 10 chữ số được hiển thị phân cách bằng dấu gạch ngang theo dạng 3-4-3 (ví dụ: 1AA-3300-001)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-031 — Đối tượng 0 bản ghi (preview)

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại dữ liệu đối tượng với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「レポートプレビュー」với 適用日・điều kiện không tồn tại đối tượng

### 期待結果

ステップ1：
・Trả về HTTP 200 (`reports:[]`)
・Message「対象のデータが存在しません。」được hiển thị (ACSMS-MSG-029-002, không phải toast)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-032 — Dialog xác nhận trước khi 電子帳票作成

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại dữ liệu đối tượng ở ngày áp dụng

### 手順

ステップ1：
Nhập ngày áp dụng và click nút「電子帳票作成」

ステップ2：
Click「いいえ」trên dialog xác nhận

### 期待結果

ステップ1：
Message xác nhận được hiển thị (message「増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？」＝ACSMS-MSG-029-005)

ステップ2：
Xử lý bị hủy, và việc tạo PDF・gửi mail không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-033 — Xuất 電子帳票 (PDF)・lưu S3・thông báo mail (chi nhánh quản lý đơn lẻ)

- 観点ID: VP-D-06
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・適用日・điều kiện chỉ tương ứng 1 chi nhánh quản lý đối tượng

### 手順

ステップ1：
Chọn 適用日・管理支店 và thực hiện「電子帳票作成」, click「はい」trên dialog xác nhận

### 期待結果

ステップ1：
・Trả về HTTP 200
・File PDF được tải xuống (`Content-Type: application/pdf`, tên file `増減通知_{管理支店コード}_{適用日YYYYMMDD}.pdf`)

補足：
・PDF đã tạo được lưu vào S3
・Mail hoàn tất tạo 増減通知 được gửi đến người phụ trách 日農 (tiền tố tiêu đề `【AgriNews_ACSMS】`, nội dung không chứa thông tin cá nhân)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-034 — Xuất ZIP nhiều chi nhánh quản lý・lịch sử・log thao tác

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・適用日・điều kiện tương ứng nhiều chi nhánh quản lý đối tượng

### 手順

ステップ1：
Chọn 適用日・nhiều 管理支店 và thực hiện「電子帳票作成」, click「はい」trên dialog xác nhận

ステップ2：
Thực hiện query sau trên DB, xác nhận lịch sử tải xuống và log thao tác
```sql
SELECT download_type, file_name, record_count, target_month
FROM t_file_download
WHERE ja_id = 1
ORDER BY download_datetime DESC;

SELECT log_type, operation, result_status, target_table
FROM t_log
WHERE ja_id = 1 AND gamen_name = '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
・File ZIP gộp PDF của từng chi nhánh quản lý được tải xuống (`Content-Type: application/zip`, tên file `増減通知_{適用日YYYYMMDD}.zip`)

ステップ2：
・Lịch sử được đăng ký vào t_file_download theo từng file PDF (download_type=4, target_month là năm tháng của ngày áp dụng)
・1 bản ghi audit log được ghi vào t_log (log_type=1, operation=`EXPORT_PDF`, result_status=1, target_table=`t_file_download`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-035 — Đối tượng 0 bản ghi (電子帳票作成)

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại dữ liệu đối tượng với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「電子帳票作成」với 適用日・điều kiện không tồn tại đối tượng, click「はい」trên dialog xác nhận

ステップ2：
Xác nhận số bản ghi đăng ký của t_file_download trên DB

### 期待結果

ステップ1：
・Trả về HTTP 200 (`{ data: { reports: [] } }` của `application/json`)
・File PDF／ZIP không được tải xuống
・Message「対象のデータが存在しません。」được hiển thị (ACSMS-MSG-029-002)

ステップ2：
Bản ghi không được đăng ký vào t_file_download

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-036 — Rollback transaction

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh lỗi DB khi đăng ký lịch sử tải xuống

### 手順

ステップ1：
Thực hiện「電子帳票作成」(inject lỗi giữa chừng quá trình đăng ký DB)

ステップ2：
Xác nhận trạng thái của t_file_download・t_log trên DB

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
・Cả t_file_download・t_log（log_type=1）đều không được đăng ký (được rollback)
・1 bản ghi error log được ghi vào t_log (log_type=3, result_status=2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

---

# カテゴリ5: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-029-037 — Tham số request không hợp lệ (BAD_REQUEST)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/zougen-nichino/preview?tekiyo_date=2026-03-01&kanri_shiten_id=abc」(chuỗi ký tự ở mục số) qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。` hoặc `error_code: VALIDATION_ERROR`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-038 — Session hết hạn (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để buộc hết hạn session bằng công cụ quản trị

### 手順

ステップ1：
Buộc hết hạn session khi đang mở màn hình 増減通知（日本農業新聞）出力

ステップ2：
Click nút「レポートプレビュー」

### 期待結果

ステップ1：
Màn hình đang ở trạng thái được hiển thị

ステップ2：
・Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)
・Chuyển đến「/login」(có gắn `redirect` vào query)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-039 — Hình dạng response lỗi validation (VALIDATION_ERROR)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi POST「/api/v1/report/zougen-nichino/export」với request body thiếu tekiyo_date qua tab Network của DevTools

### 期待結果

ステップ1：
・Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)
・Response có chứa mảng `errors`, và mỗi phần tử có hình dạng `{ field, message }`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-040 — Vượt giới hạn rate (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi liên tục request tương đương preview hoặc 電子帳票作成 đến số lần giới hạn

ステップ2：
Gửi thêm request vượt quá giới hạn

### 期待結果

ステップ1：
Các request đến số lần giới hạn được xử lý bình thường

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-041 — Lỗi hệ thống (INTERNAL_SERVER_ERROR)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh exception ở phía server

### 手順

ステップ1：
Thực hiện「レポートプレビュー」ở trạng thái đã phát sinh lỗi kết nối DB v.v. ở phía server

### 期待結果

ステップ1：
・Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)
・Message「システムエラーが発生しました。しばらくしてから再度お試しください。」được hiển thị (ACSMS-MSG-029-003)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-042 — Ngắt kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chọn「Offline」ở tab Network của DevTools và ngắt kết nối mạng

ステップ2：
Click nút「レポートプレビュー」

### 期待結果

ステップ1：
Mạng bị ngắt kết nối

ステップ2：
・Toast lỗi mạng được hiển thị
・Không kết thúc bất thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-029-043 — An toàn với input SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/zougen-nichino/preview」với tekiyo_date chỉ định `2026-03-01'; DROP TABLE t_dokusya_rireki; --` qua tab Network của DevTools

ステップ2：
Xác nhận bảng t_dokusya_rireki tồn tại trên DB

### 期待結果

ステップ1：
・Giá trị input được xử lý như literal bởi parameterized query, và không được thực thi như SQL
・Trả về HTTP 400 (`error_code: VALIDATION_ERROR` hoặc `BAD_REQUEST`)

ステップ2：
Bảng t_dokusya_rireki không bị xóa và tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế／Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)
