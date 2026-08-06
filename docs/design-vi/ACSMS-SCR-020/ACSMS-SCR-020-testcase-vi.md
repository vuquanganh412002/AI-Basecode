---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-020
screen_name: 口座振替データ出力画面
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
| 2 | 2026/08/06 | 1.1 | Tran Duc Tuyen | Đồng bộ với bản tiếng Nhật: bổ sung 10 ca kiểm thử. カテゴリ6 (048〜055) preview → sửa số tiền → tạo file của v1.1 vốn chưa được dịch. カテゴリ7 (056〜057) mới: giới hạn đối tượng tổng hợp chỉ gồm bản giấy và bản điện tử đã duyệt・trả phí, loại kết hợp (#56600), và việc chặn xuất file khi có người đọc tham chiếu đơn giá hết hiệu lực (HTTP 409 INACTIVE_TANKA_REFERENCED) |  |  |

## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng như quản lý thông tin người đăng ký, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự khoản (口座振替).

Các chức năng chính bao gồm: đăng ký・cập nhật・tìm kiếm thông tin người đăng ký, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động, chức năng upload・download file, quản lý thông báo hệ thống.

Ngoài ra, hệ thống còn hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập người dùng, ghi lịch sử đăng nhập, ghi log thao tác người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết bản tài liệu test được tạo mới trên hệ thống cho màn hình「口座振替データ出力画面（ACSMS-SCR-020）」.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-020 | 口座振替データ出力画面 設計書 |
| 2 | ACSMS-SCR-020 | 口座振替データ出力画面 API設計書 |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 8 |
| 2 | Hiển thị màn hình (Layout / Rendering) | 6 |
| 3 | Kiểm tra đầu vào (Input Validation) | 13 |
| 4 | Logic nghiệp vụ (Business Logic) | 12 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 8 |
| 6 | v1.1 Preview → Sửa số tiền → Tạo file (Preview / Edit / Make File) | 8 |
| 7 | Giới hạn đối tượng tổng hợp・Chặn xuất file (Scope / Export Gate) | 2 |
| | 合計 | 57 |

---

# カテゴリ1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-020-001 — Cấm truy cập màn hình (NICHINO_ADMIN)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (đã xác thực 2 lớp)
  - ・Không có quyền「koza_furikae.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「口座振替データ出力」không hiển thị trên sidebar

ステップ2：
Nhập「/koza-furikae」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi POST「/api/v1/koza-furikae/export」với request body hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「口座振替データ出力」không hiển thị trên sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Truy cập được kiểm soát tại cả 3 lớp: menu FE, router guard FE, và API guard BE

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-002 — Cấm truy cập màn hình (NICHINO_STAFF)

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_STAFF (đã xác thực 2 lớp)
  - ・Không có quyền「koza_furikae.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「口座振替データ出力」không hiển thị trên sidebar

ステップ2：
Nhập「/koza-furikae」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi POST「/api/v1/koza-furikae/export」với request body hợp lệ qua tab Network của DevTools

### 期待結果

ステップ1：
Mục「口座振替データ出力」không hiển thị trên sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-003 — Cho phép truy cập màn hình (CHUOKAI)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (đã xác thực 2 lớp)
  - ・Có quyền「koza_furikae.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「口座振替データ出力」hiển thị trên sidebar

ステップ2：
Click vào mục「口座振替データ出力」

### 期待結果

ステップ1：
Mục「口座振替データ出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/koza-furikae」và form thiết lập xuất dữ liệu được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-004 — Cho phép truy cập màn hình (JA_HONTEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_HONTEN (đã xác thực 2 lớp)
  - ・Có quyền「koza_furikae.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「口座振替データ出力」hiển thị trên sidebar

ステップ2：
Click vào mục「口座振替データ出力」

### 期待結果

ステップ1：
Mục「口座振替データ出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/koza-furikae」và form thiết lập xuất dữ liệu được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-005 — Cho phép truy cập màn hình (JA_KANRI_SHITEN)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (đã xác thực 2 lớp)
  - ・Có quyền「koza_furikae.export」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「口座振替データ出力」hiển thị trên sidebar

ステップ2：
Click vào mục「口座振替データ出力」

### 期待結果

ステップ1：
Mục「口座振替データ出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/koza-furikae」và form thiết lập xuất dữ liệu được hiển thị

補足：
・Đối tượng xuất chỉ giới hạn ở những người đăng ký thuộc chi nhánh quản lý của chính mình (DataScope `kanri_shiten_id = user.kanri_shiten_id`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-006 — Chỉ định chi nhánh tài khoản của JA khác (CHUOKAI)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (ja_id=1)
  - ・Tồn tại ID chi nhánh tài khoản (ví dụ: 99) thuộc JA khác (ja_id=2)

### 手順

ステップ1：
Nhập các mục bắt buộc trên màn hình xuất dữ liệu chuyển khoản tự khoản

ステップ2：
Gửi POST「/api/v1/koza-furikae/export」với request body chứa `koza_shiten_ids: [99]` thuộc JA khác qua tab Network của DevTools

### 期待結果

ステップ1：
Có thể nhập các mục bắt buộc

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

補足：
・Không tạo ra dữ liệu xuất chứa record của JA khác

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-007 — Chỉ định ngoài chi nhánh quản lý của mình (JA_KANRI_SHITEN)

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN (kanri_shiten_id=10)
  - ・Tồn tại ID chi nhánh quản lý khác (ví dụ: 20) thuộc JA của mình

### 手順

ステップ1：
Nhập các mục bắt buộc trên màn hình xuất dữ liệu chuyển khoản tự khoản

ステップ2：
Gửi POST「/api/v1/koza-furikae/export」với request body chứa `kanri_shiten_ids: [20]` ngoài chi nhánh quản lý của mình qua tab Network của DevTools

### 期待結果

ステップ1：
Có thể nhập các mục bắt buộc

ステップ2：
Trả về HTTP 403 (`error_code: DATA_SCOPE_VIOLATION`, message `このデータへのアクセス権限がありません。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-008 — Truy cập trực tiếp URL (role không có quyền)

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN (không có quyền「koza_furikae.export」)

### 手順

ステップ1：
Nhập trực tiếp「/koza-furikae」vào thanh địa chỉ và truy cập

ステップ2：
Tải lại bằng phím F5 của trình duyệt

### 期待結果

ステップ1：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ2：
Sau khi tải lại màn hình vẫn không hiển thị và chuyển sang「/dashboard」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-020-009 — Hiển thị tiêu đề màn hình・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Xác nhận tiêu đề và breadcrumb ở phần trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tiêu đề màn hình「口座振替データ出力」được hiển thị, và breadcrumb hiển thị「ホーム > 口座振替データ出力」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-010 — Giá trị mặc định khi hiển thị ban đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・JA của mình chưa đăng ký record chi nhánh tài chính (kinyu_shiten_flg=true)

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Xác nhận giá trị ban đầu của từng mục nhập

### 期待結果

ステップ1：
Màn hình được hiển thị (`GET /api/v1/koza-furikae/initial` trả về HTTP 200)

ステップ2：
・Loại tiền gửi được thiết lập ban đầu là「普通貯金」(giá trị `1`)
・Các mục khác như ngày tháng・ngày trừ tiền・số tài khoản v.v. được hiển thị trống

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-011 — Hiển thị ban đầu thông tin JASTEM khi truy cập lần 2

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã từng thực hiện xuất dữ liệu chuyển khoản tự khoản, thông tin JASTEM đã được lưu trong m_ja・m_shiten

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Xác nhận giá trị ban đầu của mã người ủy thác・tên người ủy thác・số JA・tên JA・mã cửa hàng xử lý gửi dữ liệu・tên cửa hàng・số tài khoản

### 期待結果

ステップ1：
Màn hình được hiển thị (`GET /api/v1/koza-furikae/initial` trả về HTTP 200)

ステップ2：
・Mã người ủy thác・tên người ủy thác・số JA・tên JA được hiển thị ban đầu bằng giá trị đã lưu của m_ja
・Mã cửa hàng xử lý gửi dữ liệu・tên cửa hàng・loại tiền gửi・số tài khoản được hiển thị ban đầu bằng giá trị đã lưu của m_shiten được dùng cuối cùng
・Từng mục có thể chỉnh sửa

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-012 — Hiển thị pulldown chi nhánh quản lý・chi nhánh・chi nhánh tài khoản

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・JA của mình đã đăng ký record chi nhánh quản lý・chi nhánh・chi nhánh tài chính

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Mở từng pulldown chi nhánh quản lý・chi nhánh・chi nhánh tài khoản

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Pulldown chi nhánh quản lý hiển thị danh sách chi nhánh quản lý thuộc JA của mình
・Pulldown chi nhánh hiển thị danh sách chi nhánh thuộc JA của mình
・Pulldown chi nhánh tài khoản chỉ hiển thị chi nhánh tài chính (kinyu_shiten_flg=true) (`GET /api/v1/shiten/koza-dropdown` trả về HTTP 200)
・Từng pulldown có thể chọn nhiều

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-013 — Hiển thị button bắt đầu tạo

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Xác nhận trạng thái hiển thị・active của button「作成開始」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Button「作成開始」hiển thị ở trạng thái active

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-014 — Thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/koza-furikae」

ステップ2：
Dùng phím Tab di chuyển lần lượt qua từng mục nhập, xác nhận cuối cùng đến được button「作成開始」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Có thể di chuyển bằng phím Tab theo thứ tự ngày tháng → chi nhánh quản lý → chi nhánh → chi nhánh tài khoản → ngày trừ tiền → mã người ủy thác → … → số tài khoản → bắt đầu tạo
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

## ACSMS-TC-020-015 — Kiểm tra bắt buộc ngày tháng

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống ngày tháng (chưa chọn), nhập các mục bắt buộc khác

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Ngày tháng ở trạng thái chưa chọn

ステップ2：
Hiển thị message「必須項目です。」phía dưới mục ngày tháng (ACSMS-MSG-020-004), và `POST /api/v1/koza-furikae/export` không được gửi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-016 — Kiểm tra bắt buộc ngày trừ tiền

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống ngày trừ tiền (chưa chọn), nhập các mục bắt buộc khác

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Ngày trừ tiền ở trạng thái chưa chọn

ステップ2：
Hiển thị message「必須項目です。」phía dưới mục ngày trừ tiền (ACSMS-MSG-020-004), và `POST /api/v1/koza-furikae/export` không được gửi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-017 — Kiểm tra bắt buộc mã người ủy thác

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống mã người ủy thác, nhập các mục bắt buộc khác

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Mã người ủy thác để trống

ステップ2：
Hiển thị message「必須項目です。」phía dưới mục mã người ủy thác (ACSMS-MSG-020-004)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-018 — Kiểm tra định dạng・số ký tự mã người ủy thác

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập 11 ký tự chữ-số half-width vào mã người ủy thác (vượt quá tối đa 10 ký tự)

ステップ2：
Nhập ký tự full-width「アイウ」vào mã người ủy thác và click「作成開始」

ステップ3：
Nhập 10 ký tự chữ-số half-width (số ký tự tối đa) vào mã người ủy thác, nhập các mục bắt buộc khác và click「作成開始」

### 期待結果

ステップ1：
Ký tự thứ 11 bị chặn nhập (tối đa 10 ký tự)

ステップ2：
Chỉ cho nhập chữ-số half-width (ký tự full-width không được tiếp nhận)

ステップ3：
10 ký tự được tiếp nhận bình thường, và `POST /api/v1/koza-furikae/export` được gửi

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-019 — Kiểm tra bắt buộc・số ký tự tên người ủy thác

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống tên người ủy thác và click「作成開始」

ステップ2：
Nhập 41 ký tự vào tên người ủy thác (vượt quá tối đa 40 ký tự)

ステップ3：
Nhập 40 ký tự (số ký tự tối đa) vào tên người ủy thác

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục tên người ủy thác (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 41 bị chặn nhập (tối đa 40 ký tự)

ステップ3：
40 ký tự được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-020 — Kiểm tra bắt buộc・định dạng số JA

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống số JA và click「作成開始」

ステップ2：
Nhập 5 ký tự vào số JA (vượt quá tối đa 4 ký tự)

ステップ3：
Nhập số full-width「１２３４」vào số JA và click「作成開始」

ステップ4：
Nhập 4 ký tự số half-width (số ký tự tối đa) vào số JA

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục số JA (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 5 bị chặn nhập (tối đa 4 ký tự)

ステップ3：
Chỉ cho nhập số half-width

ステップ4：
4 ký tự số half-width được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-021 — Kiểm tra bắt buộc・số ký tự tên JA

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống tên JA và click「作成開始」

ステップ2：
Nhập 16 ký tự vào tên JA (vượt quá tối đa 15 ký tự)

ステップ3：
Nhập 15 ký tự (số ký tự tối đa) vào tên JA

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục tên JA (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 16 bị chặn nhập (tối đa 15 ký tự)

ステップ3：
15 ký tự được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-022 — Kiểm tra bắt buộc・định dạng mã cửa hàng xử lý gửi dữ liệu

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống mã cửa hàng xử lý gửi dữ liệu và click「作成開始」

ステップ2：
Nhập 4 ký tự vào mã cửa hàng xử lý gửi dữ liệu (vượt quá tối đa 3 ký tự)

ステップ3：
Nhập 3 ký tự số half-width (số ký tự tối đa) vào mã cửa hàng xử lý gửi dữ liệu

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục mã cửa hàng xử lý gửi dữ liệu (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 4 bị chặn nhập (tối đa 3 ký tự)

ステップ3：
3 ký tự số half-width được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-023 — Kiểm tra bắt buộc・số ký tự tên cửa hàng

- 観点ID: VP-B-02
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống tên cửa hàng và click「作成開始」

ステップ2：
Nhập 16 ký tự vào tên cửa hàng (vượt quá tối đa 15 ký tự)

ステップ3：
Nhập 15 ký tự (số ký tự tối đa) vào tên cửa hàng

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục tên cửa hàng (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 16 bị chặn nhập (tối đa 15 ký tự)

ステップ3：
15 ký tự được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-024 — Kiểm tra bắt buộc・giá trị loại tiền gửi

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Xác nhận các lựa chọn của pulldown loại tiền gửi

ステップ2：
Lần lượt chọn「普通貯金」「当座貯金」「その他」ở loại tiền gửi

### 期待結果

ステップ1：
Loại tiền gửi hiển thị「普通貯金」(giá trị `1`)「当座貯金」(giá trị `2`)「その他」(giá trị `9`)

ステップ2：
Giá trị đã chọn được giữ lại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-025 — Kiểm tra bắt buộc・định dạng số tài khoản

- 観点ID: VP-B-03
- 種類: Boundary (境界)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Để trống số tài khoản và click「作成開始」

ステップ2：
Nhập 8 ký tự vào số tài khoản (vượt quá tối đa 7 ký tự)

ステップ3：
Nhập 7 ký tự số half-width (số ký tự tối đa) vào số tài khoản

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」phía dưới mục số tài khoản (ACSMS-MSG-020-004)

ステップ2：
Ký tự thứ 8 bị chặn nhập (tối đa 7 ký tự)

ステップ3：
7 ký tự số half-width được tiếp nhận bình thường

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-026 — Xử lý half-width・full-width (mục số)

- 観点ID: VP-B-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập số full-width vào số JA・mã cửa hàng xử lý gửi dữ liệu・số tài khoản

ステップ2：
Gửi trực tiếp request body chứa số full-width qua tab Network của DevTools

### 期待結果

ステップ1：
Mục số chỉ cho nhập số half-width

ステップ2：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-027 — Gửi tích hợp khi nhiều mục bắt buộc chưa nhập

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi POST「/api/v1/koza-furikae/export」với request body để trống target_month・hikiotoshi_date・jastem_itakusha_code qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`), và mảng `errors` chứa `{ field, message: '必須項目です。' }` của từng mục

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-020-028 — Xuất dữ liệu chuyển khoản tự khoản trường hợp bình thường

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký trừ tiền qua tài khoản (shiharai_hoho=1) thuộc đối tượng tổng hợp trong tháng đối tượng

### 手順

ステップ1：
Nhập ngày tháng・ngày trừ tiền・mã người ủy thác・tên người ủy thác・số JA・tên JA・mã cửa hàng xử lý gửi dữ liệu・tên cửa hàng・loại tiền gửi・số tài khoản

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Có thể nhập tất cả mục bắt buộc

ステップ2：
・Trả về HTTP 200
・File CSV được download (`Content-Type: text/csv; charset=Shift_JIS`, tên file `koza_furikae_YYYYMMDD_HHmmss.csv`)
・Hiển thị toast「口座振替データの作成が完了しました。」(ACSMS-MSG-020-001)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-029 — Đăng ký snapshot t_koza_furikae

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại 2 người đăng ký thuộc đối tượng tổng hợp trong tháng đối tượng

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường

ステップ2：
Thực hiện query sau trên DB và xác nhận nội dung đăng ký
```sql
SELECT dokusya_id, target_month, furikae_date, furikae_kingaku
FROM t_koza_furikae
WHERE ja_id = 1 AND target_month = '2026-05-01'
ORDER BY dokusya_id;
```

### 期待結果

ステップ1：
CSV được download

ステップ2：
・t_koza_furikae được đăng ký 2 bản theo người đăng ký đối tượng × tháng đối tượng
・furikae_date lưu ngày trừ tiền, furikae_kingaku lưu số tiền đã bao gồm thuế của đơn giá

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-030 — Cập nhật thông tin người ủy thác JASTEM của m_ja

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập giá trị mới vào mã người ủy thác・tên người ủy thác・số JA・tên JA và thực hiện「作成開始」

ステップ2：
Thực hiện query sau trên DB và xác nhận nội dung cập nhật
```sql
SELECT jastem_itakusha_code, jastem_itakusha_name, jastem_ja_code, jastem_ja_name
FROM m_ja
WHERE ja_id = 1;
```

### 期待結果

ステップ1：
CSV được download

ステップ2：
jastem_itakusha_code / jastem_itakusha_name / jastem_ja_code / jastem_ja_name của m_ja được cập nhật bằng giá trị nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-031 — Cập nhật thông tin chi nhánh tài chính JASTEM của m_shiten

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chọn 1 chi nhánh tài khoản

### 手順

ステップ1：
Nhập giá trị mới vào mã cửa hàng xử lý gửi dữ liệu・tên cửa hàng・loại tiền gửi・số tài khoản và thực hiện「作成開始」

ステップ2：
Thực hiện query sau trên DB và xác nhận nội dung cập nhật
```sql
SELECT jastem_toriatsukai_tenpo_code, jastem_tenpo_name,
       jastem_tyokin_shubetsu, jastem_koza_no
FROM m_shiten
WHERE ja_id = 1 AND kinyu_shiten_flg = TRUE;
```

### 期待結果

ステップ1：
CSV được download

ステップ2：
jastem_toriatsukai_tenpo_code / jastem_tenpo_name / jastem_tyokin_shubetsu / jastem_koza_no của record m_shiten chi nhánh tài khoản đã chọn được cập nhật bằng giá trị nhập

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-032 — Đăng ký t_file_download

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường

ステップ2：
Thực hiện query sau trên DB và xác nhận lịch sử download
```sql
SELECT download_type, file_name, record_count, target_month
FROM t_file_download
WHERE ja_id = 1
ORDER BY download_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
CSV được download

ステップ2：
t_file_download được đăng ký 1 bản (file_name lưu tên file CSV, record_count lưu số lượng output, target_month lưu tháng đối tượng)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-033 — Ghi log thao tác (t_log)

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường

ステップ2：
Thực hiện query sau trên DB và xác nhận log thao tác
```sql
SELECT log_type, operation, result_status, target_table, after_value
FROM t_log
WHERE ja_id = 1 AND gamen_name = '口座振替データ出力画面 (ACSMS-SCR-020)'
ORDER BY log_datetime DESC
LIMIT 1;
```

### 期待結果

ステップ1：
CSV được download

ステップ2：
・Audit log được ghi 1 bản vào t_log (log_type=1, operation=`CREATE`, result_status=1, target_table=`t_file_download`)
・after_value lưu điều kiện export và số lượng dưới dạng JSON
・Số tài khoản JASTEM được mask

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-034 — Lọc dữ liệu output theo điều kiện lọc

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký thuộc nhiều chi nhánh quản lý・chi nhánh

### 手順

ステップ1：
Chọn giá trị cụ thể ở pulldown chi nhánh quản lý・chi nhánh・chi nhánh tài khoản

ステップ2：
Thực hiện「作成開始」và xác nhận số lượng minh chi tiết của CSV đã download

### 期待結果

ステップ1：
Điều kiện lọc đã chọn được giữ lại

ステップ2：
Chỉ những người đăng ký khớp với chi nhánh quản lý・chi nhánh・chi nhánh tài khoản đã chọn được xuất ra CSV

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-035 — Không có dữ liệu đối tượng

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại người đăng ký thuộc đối tượng tổng hợp với tháng đối tượng・điều kiện lọc đã chỉ định

### 手順

ステップ1：
Nhập tháng・điều kiện không tồn tại đối tượng tổng hợp và thực hiện「作成開始」

### 期待結果

ステップ1：
・Trả về HTTP 404 (`error_code: NO_TARGET_DATA`, message `対象データがありません。`)
・Hiển thị toast「対象データがありません。」(ACSMS-MSG-020-002)
・File CSV không được download

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-036 — Cấu trúc CSV định dạng Zengin (全銀)

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại người đăng ký thuộc đối tượng tổng hợp trong tháng đối tượng

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường và download CSV

ステップ2：
Xác nhận mã ký tự và cấu trúc record của CSV đã download

### 期待結果

ステップ1：
CSV được download

ステップ2：
・Mã ký tự là Shift_JIS
・Cấu trúc theo thứ tự header record (1=ヘッダ), data record (2=データ), trailer record (8=トレーラ), end record (9=エンド)
・Data record được xuất 1 record cho mỗi người đăng ký

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-037 — Độ chính xác tổng hợp của trailer record

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại nhiều người đăng ký thuộc đối tượng tổng hợp trong tháng đối tượng

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường và download CSV

ステップ2：
Đối chiếu số lượng・tổng số tiền của trailer record (8=トレーラ) với minh chi tiết của data record

### 期待結果

ステップ1：
CSV được download

ステップ2：
・Số lượng của trailer record khớp với số lượng data record
・Tổng số tiền của trailer record khớp với tổng số tiền trừ của từng data record

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-038 — Transaction rollback

- 観点ID: VP-C-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh lỗi DB khi đăng ký t_koza_furikae

### 手順

ステップ1：
Thực hiện「作成開始」với điều kiện bình thường (inject lỗi giữa chừng khi cập nhật DB)

ステップ2：
Xác nhận trạng thái của m_ja・m_shiten・t_koza_furikae・t_file_download trên DB

### 期待結果

ステップ1：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ2：
・m_ja・m_shiten・t_koza_furikae・t_file_download đều không được cập nhật・đăng ký (Được rollback)
・Error log được ghi 1 bản vào t_log (log_type=3, result_status=2)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-039 — Xuất lại cùng tháng (cập nhật đăng ký trùng lặp)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã có snapshot được đăng ký trong t_koza_furikae với cùng tháng đối tượng

### 手順

ステップ1：
Thực hiện lại「作成開始」với cùng tháng đối tượng

ステップ2：
Xác nhận số lượng record của người đăng ký tương ứng × tháng đối tượng trong t_koza_furikae trên DB

### 期待結果

ステップ1：
CSV được download

ステップ2：
・Record của người đăng ký × tháng đối tượng không bị đăng ký trùng lặp, được giữ ở 1 bản (được cập nhật)
・furikae_kingaku v.v. được cập nhật bằng giá trị tổng hợp mới nhất

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-020-040 — Tham số request không hợp lệ (BAD_REQUEST)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/shiten/koza-dropdown?kanri_shiten_ids=abc」(chuỗi trong mảng số) qua tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-041 — Hết phiên (UNAUTHORIZED)

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để vô hiệu hóa session bằng công cụ quản trị

### 手順

ステップ1：
Vô hiệu hóa session khi đang mở màn hình xuất dữ liệu chuyển khoản tự khoản

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Màn hình ở trạng thái được hiển thị

ステップ2：
・Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)
・Chuyển sang「/login」(query được gắn thêm `redirect`)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-042 — Hình dạng response lỗi validation (VALIDATION_ERROR)

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi POST「/api/v1/koza-furikae/export」với request body thiếu các mục bắt buộc qua tab Network của DevTools

### 期待結果

ステップ1：
・Trả về HTTP 400 (`error_code: VALIDATION_ERROR`, message `入力値が不正です。詳細はerrorsフィールドを確認してください。`)
・Response chứa mảng `errors`, mỗi phần tử có hình dạng `{ field, message }`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-043 — Vượt giới hạn rate (TOO_MANY_REQUESTS)

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi liên tục request tương đương「作成開始」đến số lần giới hạn

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
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-044 — Lỗi hệ thống (INTERNAL_SERVER_ERROR)

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn để phát sinh exception ở phía server

### 手順

ステップ1：
Thực hiện「作成開始」ở trạng thái đã phát sinh lỗi kết nối DB v.v. ở phía server

### 期待結果

ステップ1：
・Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)
・Hiển thị toast「システムエラーが発生しました。しばらくしてから再度お試しください。」(ACSMS-MSG-020-003)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-045 — Mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chọn「Offline」ở tab Network của DevTools và ngắt kết nối mạng

ステップ2：
Click button「作成開始」

### 期待結果

ステップ1：
Mạng bị ngắt kết nối

ステップ2：
・Toast lỗi mạng được hiển thị
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

## ACSMS-TC-020-046 — An toàn với đầu vào XSS

- 観点ID: VP-A-06
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập script như `<script>alert(1)</script>` vào tên người ủy thác・tên cửa hàng và thực hiện「作成開始」

ステップ2：
Mở lại màn hình và xác nhận mục tương ứng ở hiển thị ban đầu

### 期待結果

ステップ1：
Script được xử lý nguyên dạng như chuỗi và không được thực thi

ステップ2：
Sau khi lưu hiển thị lại script cũng không được thực thi và được hiển thị dưới dạng plain text

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-020-047 — An toàn với đầu vào SQL Injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập `'; DROP TABLE m_ja; --` v.v. vào mã người ủy thác・tên người ủy thác và thực hiện「作成開始」

ステップ2：
Xác nhận bảng m_ja tồn tại trên DB

### 期待結果

ステップ1：
Giá trị đầu vào được xử lý như literal qua parameterized query và không được thực thi như SQL (không trả về HTTP 500)

ステップ2：
Bảng m_ja không bị xóa và vẫn tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

# カテゴリ6: v1.1 Preview → Sửa số tiền → Tạo file (Preview / Edit / Make File)

## ACSMS-TC-020-048 — Bấm "作成開始" hiển thị danh sách preview (không xuất file)

- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Có người đọc thuộc đối tượng tổng hợp trong năm-tháng đối tượng

### Các bước

Bước 1:
Nhập năm-tháng-ngày・ngày trích nợ rồi thực thi "作成開始"

### Kết quả mong đợi

Bước 1:
・POST /api/v1/koza-furikae/preview được gọi và trả về 200 với `{ data, meta }`
・Bảng danh sách preview (tên người gửi tiền／chi nhánh trích nợ／số tài khoản／số tiền) được hiển thị
・Nút "ファイル作成" được hiển thị
・**Tại thời điểm này file không được tải xuống, cũng không lưu S3・không cập nhật t_koza_furikae・không ghi log audit**

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

## ACSMS-TC-020-049 — Preview 0 bản ghi (MSG-020-002)

- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không có đối tượng tổng hợp với điều kiện đã chỉ định

### Các bước

Bước 1:
Thực thi "作成開始" với điều kiện cho ra 0 đối tượng

### Kết quả mong đợi

Bước 1:
・preview trả về 404 (`NO_TARGET_DATA`)
・"対象データがありません。" (ACSMS-MSG-020-002) được hiển thị trong màn hình
・Nút "ファイル作成" không được hiển thị

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

## ACSMS-TC-020-050 — Việc sửa số tiền được phản ánh vào file

- 種類: Normal (正常)
- 前提条件:
  - ・Đã hiển thị preview bằng "作成開始"

### Các bước

Bước 1:
Sửa số tiền của dòng 1 trong bảng preview từ 4900 → 8000

Bước 2:
Thực thi "ファイル作成"

### Kết quả mong đợi

Bước 1:
・Tổng số tiền được cập nhật theo nội dung đã sửa

Bước 2:
・Body của POST /export có chứa `rows: [{ dokusya_id, furikae_kingaku: 8000 }, ...]`
・Số tiền trích nợ ở bản ghi dữ liệu và tổng số tiền ở trailer của CSV Zengin được xuất bằng giá trị đã sửa (8000)
・t_koza_furikae cũng lưu số tiền đã sửa (8000)

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

## ACSMS-TC-020-051 — Tạo file và tải xuống (không có phần mở rộng, ZENOUTFD)

- 種類: Normal (正常)
- 前提条件:
  - ・Đã hiển thị preview・đã thiết lập thông tin JASTEM

### Các bước

Bước 1:
Thực thi "ファイル作成"

### Kết quả mong đợi

Bước 1:
・File độ dài cố định theo định dạng Zengin được tải xuống
・**Tên tải xuống là `ZENOUTFD` (không có phần mở rộng, không kèm .txt/.csv v.v.)**
・Tên lưu trên S3 và t_file_download.file_name cũng không có phần mở rộng
・"口座振替データの作成が完了しました。" (ACSMS-MSG-020-001) được hiển thị

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

## ACSMS-TC-020-052 — Từ chối dokusya_id ngoài phạm vi (bảo mật)

- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI (chỉ JA của mình)

### Các bước

Bước 1:
Gửi request export có trộn vào `rows` một `dokusya_id` ngoài phạm vi JA của mình／không tồn tại (ví dụ: 999) kèm số tiền cực lớn

### Kết quả mong đợi

Bước 1:
・Server đối chiếu với đối tượng đã tổng hợp lại theo phạm vi và **bỏ qua dokusya_id ngoài phạm vi／không hợp lệ**
・File xuất ra và t_koza_furikae không chứa dòng ID giả mạo・số tiền cực lớn đã trộn vào
・Các dòng thực tế trong phạm vi được xuất với số tiền đúng

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

## ACSMS-TC-020-053 — Đổi bộ lọc thì hủy bỏ preview

- 種類: Normal (正常)
- 前提条件:
  - ・Đã hiển thị preview

### Các bước

Bước 1:
Sau khi hiển thị preview, đổi năm-tháng-ngày hoặc bộ lọc chi nhánh quản lý／chi nhánh／chi nhánh tài khoản

### Kết quả mong đợi

Bước 1:
・Preview bị hủy bỏ và nút "ファイル作成" trở nên ẩn
・Không tạo được file cho đến khi bấm "作成開始" lại (không cho xuất bằng preview cũ)

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

## ACSMS-TC-020-054 — Lỗi chưa thiết lập JASTEM thì không xuất được

- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã hiển thị preview
  - ・Thông tin JASTEM (bên ủy thác/hợp tác xã nông nghiệp/cửa hàng/tài khoản) chưa được thiết lập (chưa chọn chi nhánh tài khoản hoặc chưa đăng ký master)

### Các bước

Bước 1:
Thực thi "ファイル作成" ở trạng thái chưa thiết lập thông tin JASTEM

### Kết quả mong đợi

Bước 1:
・Lỗi "JASTEM委託者情報・金融機関支店情報が未設定のため出力できません。…" được hiển thị
・POST /export không được gọi và file không được tải xuống

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

## ACSMS-TC-020-055 — Kiểm tra phạm vi số tiền (0〜10 chữ số)

- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã hiển thị preview

### Các bước

Bước 1:
Nhập số âm (ví dụ: -5) hoặc quá 10 chữ số (ví dụ: 10,000,000,000) vào số tiền rồi thực thi "ファイル作成"

### Kết quả mong đợi

Bước 1:
・Lỗi phạm vi số tiền được hiển thị và POST /export không được gọi
・(Phía FE, a-input-number cũng ràng buộc trong khoảng 0〜9,999,999,999)

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

# カテゴリ7: Giới hạn đối tượng tổng hợp・Chặn xuất file (Scope / Export Gate)

## ACSMS-TC-020-056 — Đối tượng tổng hợp — Giới hạn theo loại đăng ký (chỉ bản giấy và bản điện tử đã duyệt・trả phí／#56600)

- 観点ID: VP-B-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `koza_furikae.export`)
  - ・Tồn tại người đọc có phương thức thanh toán=trích nợ tài khoản・loại thủ tục=đăng ký mới (tiếp tục)・đang đọc báo trong năm-tháng đối tượng xuất như sau
    - ・(a) Bản giấy (dokusya_shubetsu=1) 2 bản ghi
    - ・(b) Bản điện tử (2)・đã duyệt (denshi_shonin_status=1)・trả phí (denshi_dokusya_shubetsu=1) 2 bản ghi
    - ・(c) Bản điện tử (2)・**chưa duyệt** (denshi_shonin_status=0)・trả phí 1 bản ghi
    - ・(d) Bản điện tử (2)・đã duyệt・**miễn phí** (denshi_dokusya_shubetsu=0) 1 bản ghi
    - ・(e) Bản điện tử (2)・**bị từ chối** (denshi_shonin_status=2)・trả phí 1 bản ghi
    - ・(f) Kết hợp (dokusya_shubetsu=3) 1 bản ghi

### Các bước

Bước 1:
Chỉ định năm-tháng đối tượng xuất, bấm "作成開始" và kiểm tra số bản ghi cùng chi tiết của danh sách preview

Bước 2:
Tạo file và kiểm tra số bản ghi dữ liệu cùng tổng số tiền

Bước 3:
Xác nhận người đọc (f) kết hợp không có trong cả preview lẫn file

Bước 4:
Xuất với điều kiện chỉ còn lại (a) 1 bản giấy và (d) 1 bản điện tử miễn phí (lọc theo chi nhánh quản lý v.v.) và xác nhận đối tượng chỉ còn 1 bản giấy

Bước 5:
Đặt một trong (c)(d)(e)(f) ở trạng thái tham chiếu **đơn giá đã hết hiệu lực** rồi xuất

### Kết quả mong đợi

Bước 1:
Chỉ hiển thị **tổng 4 bản ghi** gồm 2 của (a) và 2 của (b). (c)(d)(e)(f) không hiển thị

Bước 2:
Bản ghi dữ liệu là 4. Tổng số tiền khớp với tổng của 4 bản ghi đối tượng

Bước 3:
Kết hợp nằm ngoài đối tượng tổng hợp (trước đây không lọc theo loại đăng ký nên kết hợp cũng có thể trở thành đối tượng trích nợ tài khoản)

Bước 4:
Chỉ 1 bản giấy trở thành đối tượng (bản điện tử miễn phí không phát sinh phí đọc báo nên không có gì để trích nợ)

Bước 5:
Việc xuất **không bị chặn** (không phát sinh INACTIVE_TANKA_REFERENCED). Đơn giá hết hiệu lực mà người đọc ngoài đối tượng tổng hợp tham chiếu không ảnh hưởng đến khả năng xuất

Bổ sung:
・Bản điện tử chỉ là đối tượng khi thỏa mãn **cả hai** điều kiện "đã duyệt và trả phí". Chưa duyệt・bị từ chối・miễn phí đều bị loại (yêu cầu khách hàng 2026-08 / #56600)
・Bước 5 là để xác nhận điều kiện loại đăng ký giống nhau đã được đưa vào **cả hai** SQL tổng hợp và SQL kiểm tra đơn giá hết hiệu lực. Nếu chỉ một bên có thì sẽ xảy ra bất nhất "không xuất được vì lỗi đơn giá hết hiệu lực do người đọc vốn không phải đối tượng trích nợ tham chiếu"
・Giới hạn tương tự ở phiếu liên lạc tăng giảm (SCR-028)・thông báo tăng giảm (SCR-029) theo tiêu chuẩn khác, nên không được dùng lại nguyên điều kiện của màn hình này

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

## ACSMS-TC-020-057 — Chặn xuất file — Khi tồn tại người đọc tham chiếu đơn giá đã hết hiệu lực (INACTIVE_TANKA_REFERENCED)

- 観点ID: VP-D-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `koza_furikae.export`)
  - ・Trong tập đối tượng xuất tồn tại từ 1 người đọc trở lên tham chiếu đơn giá có `active_flg = FALSE`
  - ・Chuẩn bị riêng cả mẫu có từ 20 bản ghi trở lên (để xác nhận việc cắt bớt)

### Các bước

Bước 1:
Bấm "作成開始" ở trạng thái chỉ có 1 người đọc tham chiếu đơn giá hết hiệu lực

Bước 2:
Kiểm tra `error_code`・`message`・`errors[]`・`total` của response

Bước 3:
Thực hiện thao tác tương tự ở trạng thái có 20 bản ghi và kiểm tra số phần tử của `errors[]` cùng `total`

Bước 4:
Kiểm tra hiển thị thông báo trên màn hình và nơi được điều hướng đến

Bước 5:
Đổi đơn giá của người đọc tương ứng sang đơn giá còn hiệu lực rồi bấm "作成開始" lại

Bước 6:
Xuất với người đọc tham chiếu đơn giá có kỳ áp dụng (tekiyo_start / tekiyo_end) nằm ngoài năm-tháng đối tượng xuất nhưng `active_flg = TRUE`

### Kết quả mong đợi

Bước 1:
Việc xuất bị chặn và trả về HTTP status code 409. File không được sinh ra

Bước 2:
`error_code: INACTIVE_TANKA_REFERENCED`, `message` là `失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。`. Mỗi phần tử của `errors[]` có dạng `{ field: "<số dòng>", message: "<tên chủ tài khoản>（単価: <mã đơn giá> <tên đơn giá>）" }`. `total` là tổng số bản ghi tương ứng

Bước 3:
`errors[]` bị **cắt bớt ở 15 phần tử đầu**. `total` vẫn giữ nguyên là 20

Bước 4:
Được tóm tắt là "hiển thị 15 trong số 20 bản ghi tương ứng". Việc xác nhận toàn bộ・đổi đơn giá được điều hướng đến **màn hình tìm kiếm chi tiết người đọc (lọc "tham chiếu đơn giá hết hiệu lực")**

Bước 5:
Xuất thành công

Bước 6:
Xuất thành công (việc đánh giá còn hiệu lực chỉ dựa trên `active_flg`, không đánh giá theo ngày của kỳ áp dụng)

Bổ sung:
・Đây là quy cách cắt bớt để tránh response・DOM phình to khi có nhiều bản ghi tương ứng (nhiều người đọc cùng tham chiếu một đơn giá hết hiệu lực)
・Việc đánh giá hiệu lực của đơn giá chỉ dựa trên `active_flg` là để khớp với vận hành của batch làm hết hiệu lực đơn giá (tài liệu thiết kế API v1.1)
・Người đọc ngoài đối tượng tổng hợp (kết hợp・bản điện tử chưa duyệt/miễn phí bị loại theo #56600) cũng không nằm trong tập của kiểm tra này (xem ACSMS-TC-020-056 Bước 5)

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
