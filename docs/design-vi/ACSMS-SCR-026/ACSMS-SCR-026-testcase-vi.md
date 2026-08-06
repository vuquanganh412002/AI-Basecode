---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-026
screen_name: 購読者名簿出力画面
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
| 2 | 2026/08/06 | 1.1 | Tran Duc Tuyen | Đồng bộ với bản tiếng Nhật: tạo カテゴリ6 và bổ sung 3 ca (042〜044). 042＝lọc theo chi nhánh (điều kiện tùy chọn, người đọc có shiten_id NULL — vốn luôn NULL với người nhập từ liên kết bản điện tử — bị loại khi chọn chi nhánh). 043＝tách đối tượng tổng hợp theo loại báo biểu (#56597): theo cửa hàng bán ＝ chỉ bản giấy; theo chi nhánh quản lý ＝ bản giấy (vô điều kiện) ＋ kết hợp (trả phí) ＋ bản điện tử (trả phí và đã duyệt). 044＝loại cửa hàng bán dummy khỏi lựa chọn (`dummy=exclude`) |  |  |

## システム概要

Hệ thống này là hệ thống quản lý độc giả dạng cloud dành cho JA, cung cấp các chức năng như quản lý thông tin độc giả, quản lý lịch sử đăng ký, quản lý dữ liệu chuyển khoản tự động.

Với tư cách là các chức năng chính, hệ thống cung cấp đăng ký・cập nhật・tìm kiếm thông tin độc giả, quản lý lịch sử thay đổi nội dung đăng ký, tạo và quản lý dữ liệu chuyển khoản tự động, chức năng upload・download file, quản lý thông báo của hệ thống.

Ngoài ra, hệ thống hỗ trợ các chức năng bảo mật・kiểm toán như quản lý đăng nhập của người dùng, ghi lại lịch sử đăng nhập, ghi lại log thao tác của người dùng.

## 資料目的

Đây là tài liệu mô tả chi tiết bản đặc tả kiểm thử được tạo mới trên hệ thống đối với「Màn hình xuất danh bạ độc giả（ACSMS-SCR-026）」.

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-026 | 購読者名簿出力画面 設計書 |
| 2 | ACSMS-SCR-026 | 購読者名簿出力画面 API設計書 |

## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 8 |
| 2 | Hiển thị màn hình (Layout / Rendering) | 8 |
| 3 | Kiểm tra đầu vào (Input Validation) | 6 |
| 4 | Logic nghiệp vụ (Business Logic) | 12 |
| 5 | Xử lý lỗi chung (Common Error Handling) | 7 |
| 6 | Đối tượng tổng hợp・Lựa chọn cửa hàng bán (Scope / Hanbaiten Options) | 3 |
| | 合計 | 44 |

---

# カテゴリ1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-026-001 — Cấm truy cập màn hình（NICHINO_ADMIN）

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN（đã xác thực 2 lớp）
  - ・Không có quyền「report.export_meibo」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者名簿出力」không hiển thị trên sidebar

ステップ2：
Nhập「/report/meibo」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi GET「/api/v1/report/meibo/preview」bằng request parameter hợp lệ trên tab Network của DevTools

### 期待結果

ステップ1：
Mục「購読者名簿出力」không hiển thị trên sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403（`error_code: FORBIDDEN`、メッセージ `この画面へのアクセス権限がありません。`）

補足：
・Khi nhận được 403 từ API xuất báo cáo của màn hình này, frontend hiển thị message「この機能はJAアカウントのみ使用できます。」(ACSMS-MSG-026-001)
・Truy cập được kiểm soát ở cả 3 lớp: FE menu, FE router guard, BE API guard

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-002 — Cấm truy cập màn hình（NICHINO_STAFF）

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_STAFF（đã xác thực 2 lớp）
  - ・Không có quyền「report.export_meibo」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者名簿出力」không hiển thị trên sidebar

ステップ2：
Nhập「/report/meibo」vào thanh địa chỉ trình duyệt và truy cập trực tiếp

ステップ3：
Gửi GET「/api/v1/report/meibo/export」bằng request parameter hợp lệ trên tab Network của DevTools

### 期待結果

ステップ1：
Mục「購読者名簿出力」không hiển thị trên sidebar

ステップ2：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ3：
Trả về HTTP 403（`error_code: FORBIDDEN`、メッセージ `この画面へのアクセス権限がありません。`）

補足：
・Khi nhận được 403 từ API xuất báo cáo của màn hình này, frontend hiển thị message「この機能はJAアカウントのみ使用できます。」(ACSMS-MSG-026-001)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-003 — Cho phép truy cập màn hình（CHUOKAI）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI（đã xác thực 2 lớp）
  - ・Giữ quyền「report.export_meibo」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者名簿出力」hiển thị trên sidebar

ステップ2：
Click mục「購読者名簿出力」

### 期待結果

ステップ1：
Mục「購読者名簿出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/report/meibo」và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-004 — Cho phép truy cập màn hình（JA_HONTEN）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_HONTEN（đã xác thực 2 lớp）
  - ・Giữ quyền「report.export_meibo」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者名簿出力」hiển thị trên sidebar

ステップ2：
Click mục「購読者名簿出力」

### 期待結果

ステップ1：
Mục「購読者名簿出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/report/meibo」và màn hình điều kiện xuất được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-005 — Cho phép truy cập màn hình（JA_KANRI_SHITEN）

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN（đã xác thực 2 lớp）
  - ・Giữ quyền「report.export_meibo」

### 手順

ステップ1：
Mở dashboard, xác nhận mục「購読者名簿出力」hiển thị trên sidebar

ステップ2：
Click mục「購読者名簿出力」

### 期待結果

ステップ1：
Mục「購読者名簿出力」được hiển thị trên sidebar

ステップ2：
Chuyển sang「/report/meibo」và màn hình điều kiện xuất được hiển thị

補足：
・Đối tượng xuất chỉ giới hạn ở độc giả thuộc quản lý chi nhánh của chính mình（DataScope `kanri_shiten_id = user.kanri_shiten_id`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-006 — Chỉ định販売店 ngoài scope（CHUOKAI）

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI（ja_id=1）
  - ・Tồn tại ID販売店（ví dụ：99）thuộc JA khác（ja_id=2）

### 手順

ステップ1：
Nhập 帳票種別=販売店別, 適用日

ステップ2：
Gửi GET「/api/v1/report/meibo/preview」kèm `hanbaiten_ids=99` thuộc JA khác trên tab Network của DevTools

### 期待結果

ステップ1：
Có thể nhập điều kiện xuất

ステップ2：
Trả về HTTP 403（`error_code: DATA_SCOPE_VIOLATION`、メッセージ `このデータへのアクセス権限がありません。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-007 — Chỉ định管理支店 ngoài scope（JA_KANRI_SHITEN）

- 観点ID: VP-A-02
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN（kanri_shiten_id=10）
  - ・Tồn tại ID管理支店 khác（ví dụ：20）thuộc JA của chính mình

### 手順

ステップ1：
Nhập 帳票種別=管理支店別, 適用日

ステップ2：
Gửi GET「/api/v1/report/meibo/preview」kèm `kanri_shiten_ids=20` không phải quản lý chi nhánh của chính mình trên tab Network của DevTools

### 期待結果

ステップ1：
Có thể nhập điều kiện xuất

ステップ2：
Trả về HTTP 403（`error_code: DATA_SCOPE_VIOLATION`、メッセージ `このデータへのアクセス権限がありません。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-008 — Truy cập trực tiếp URL（role không có quyền）

- 観点ID: VP-A-04
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng NICHINO_ADMIN（không có quyền「report.export_meibo」）

### 手順

ステップ1：
Nhập trực tiếp「/report/meibo」vào thanh địa chỉ và truy cập

ステップ2：
Tải lại bằng phím F5 của trình duyệt

### 期待結果

ステップ1：
Hiển thị toast「アクセス権がありません。」và chuyển sang「/dashboard」

ステップ2：
Sau khi tải lại, màn hình vẫn không hiển thị và chuyển sang「/dashboard」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-026-009 — Hiển thị tiêu đề màn hình・breadcrumb

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/meibo」

ステップ2：
Xác nhận tiêu đề và breadcrumb ở phần trên màn hình

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Tiêu đề màn hình「購読者名簿出力」được hiển thị, breadcrumb hiển thị「ホーム > 購読者名簿出力」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-010 — Giá trị mặc định khi hiển thị ban đầu

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/meibo」

ステップ2：
Xác nhận trạng thái ban đầu của form điều kiện xuất và vùng preview

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・適用日 được hiển thị ở trạng thái chưa chọn
・帳票種別 được thiết lập ban đầu là「販売店別購読者名簿（照会用）」
・購読種別・販売店 được hiển thị ở trạng thái chưa chọn
・Pulldown 管理支店 ở trạng thái không hiển thị
・Dữ liệu không tồn tại ở vùng preview

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-011 — Chuyển đổi帳票種別

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Dữ liệu đang được hiển thị ở preview

### 手順

ステップ1：
Chọn「管理支店別購読者名簿」ở 帳票種別

ステップ2：
Chọn「販売店別購読者名簿（照会用）」ở 帳票種別

### 期待結果

ステップ1：
・Pulldown 管理支店 được hiển thị・được kích hoạt, pulldown 販売店 không hiển thị・bị vô hiệu hóa
・Dữ liệu preview được clear

ステップ2：
・Pulldown 販売店 được hiển thị・được kích hoạt, pulldown 管理支店 không hiển thị・bị vô hiệu hóa
・Dữ liệu preview được clear

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-012 — Hiển thị pulldown販売店

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đang chọn 帳票種別=販売店別

### 手順

ステップ1：
Mở pulldown 販売店

### 期待結果

ステップ1：
・Danh sách販売店 thuộc JA của chính mình được hiển thị（bao gồm cả販売店 dummy bản điện tử）
・Có thể chọn nhiều

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-013 — Hiển thị pulldown管理支店（DataScope）

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng JA_KANRI_SHITEN
  - ・Đang chọn 帳票種別=管理支店別

### 手順

ステップ1：
Mở pulldown 管理支店

### 期待結果

ステップ1：
・Chỉ quản lý chi nhánh của chính mình được hiển thị（DataScope tự động áp dụng）
・Có thể chọn nhiều

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-014 — Pulldown購読種別・支払区分

- 観点ID: VP-B-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở pulldown 購読種別, xác nhận các lựa chọn

ステップ2：
Mở pulldown 支払区分, xác nhận các lựa chọn

### 期待結果

ステップ1：
購読種別 hiển thị「紙版＋電子版」「紙版」「電子版」, và 併読 không bị bao gồm

ステップ2：
支払区分 hiển thị「毎月」「隔月」「3ヶ月」「半年」「年払い」

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-015 — Hiển thị nút preview・xuất Excel

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/meibo」

ステップ2：
Xác nhận trạng thái hiển thị・kích hoạt của nút「レポートプレビュー」「レポートデータExcel出力」

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
Nút「レポートプレビュー」「レポートデータExcel出力」được hiển thị ở trạng thái kích hoạt

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-016 — Thao tác bàn phím

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Mở「/report/meibo」

ステップ2：
Di chuyển lần lượt qua từng mục điều kiện xuất bằng phím Tab, xác nhận cuối cùng đến được nút

### 期待結果

ステップ1：
Màn hình được hiển thị

ステップ2：
・Có thể di chuyển bằng phím Tab theo thứ tự 適用日 → 帳票種別 → 販売店／管理支店 → 購読種別 → 支払区分 → nút
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

## ACSMS-TC-026-017 — Kiểm tra bắt buộc適用日

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Click nút「レポートプレビュー」khi để 適用日 chưa nhập

### 期待結果

ステップ1：
Hiển thị message「必須項目です。」dưới mục 適用日（ACSMS-MSG-026-006）, và xử lý preview không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-018 — Kiểm tra bắt buộc có điều kiện販売店

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đang chọn 帳票種別=販売店別

### 手順

ステップ1：
Nhập 適用日, click nút「レポートプレビュー」khi để 販売店 chưa chọn

### 期待結果

ステップ1：
Hiển thị message「販売店を1件以上選択してください。」dưới mục 販売店（ACSMS-MSG-026-002）, và xử lý preview không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-019 — Kiểm tra bắt buộc có điều kiện管理支店

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đang chọn 帳票種別=管理支店別

### 手順

ステップ1：
Nhập 適用日, click nút「レポートプレビュー」khi để 管理支店 chưa chọn

### 期待結果

ステップ1：
Hiển thị message「管理支店を1件以上選択してください。」dưới mục 管理支店（ACSMS-MSG-026-003）, và xử lý preview không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-020 — Kiểm tra giá trị購読種別（không cho phép併読）

- 観点ID: VP-B-07
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Xác nhận các lựa chọn của pulldown 購読種別

ステップ2：
Gửi GET「/api/v1/report/meibo/preview」kèm `dokusya_shubetsu=3`（併読）trên tab Network của DevTools

### 期待結果

ステップ1：
「併読」không hiển thị như lựa chọn ở 購読種別

ステップ2：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`、メッセージ `入力値が不正です。詳細はerrorsフィールドを確認してください。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-021 — Chọn ngày適用日

- 観点ID: VP-B-05
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Nhập ngày hợp lệ（định dạng YYYY/MM/DD）vào 適用日

ステップ2：
Nhập chuỗi ký tự có định dạng không hợp lệ và click「レポートプレビュー」

### 期待結果

ステップ1：
適用日 được tiếp nhận bình thường

ステップ2：
Hiển thị lỗi format, và xử lý preview không được thực hiện

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-022 — Gửi tổng hợp khi nhiều mục bắt buộc chưa nhập

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/meibo/preview」với không có tekiyo_date・report_type=hanbaiten・không có hanbaiten_ids trên tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400（`error_code: VALIDATION_ERROR`、メッセージ `入力値が不正です。詳細はerrorsフィールドを確認してください。`）, và mảng `errors` bao gồm `{ field: 'tekiyo_date', message: '必須項目です。' }` và `{ field: 'hanbaiten_ids', message: '販売店を1件以上選択してください。' }`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

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

## ACSMS-TC-026-023 — Preview販売店別 trường hợp bình thường

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại độc giả thuộc đối tượng tổng hợp dưới販売店 đối tượng

### 手順

ステップ1：
Chọn 適用日・帳票種別=販売店別・販売店 và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Trả về HTTP 200
・Danh sách được hiển thị（được group hóa theo thứ tự 販売店 → 管理支店 → 購読者）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-024 — Preview管理支店別 trường hợp bình thường

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại độc giả thuộc đối tượng tổng hợp dưới管理支店 đối tượng

### 手順

ステップ1：
Chọn 適用日・帳票種別=管理支店別・管理支店 và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Trả về HTTP 200
・Danh sách được hiển thị（được group hóa theo thứ tự 管理支店 → 購読者）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-025 — Tính chính xác của tiểu tổng・tổng・tổng toàn bộ

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Nhiều 管理支店・購読者 trở thành đối tượng tổng hợp

### 手順

ステップ1：
Thực hiện preview販売店別

ステップ2：
Đối chiếu tiểu tổng管理支店・tổng販売店・tổng toàn bộ với số phần đăng ký của dòng chi tiết

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
・Tiểu tổng theo từng管理支店（subtotal_busu）khớp với tổng của số phần đăng ký dưới管理支店 đó
・Tổng theo từng販売店（total_busu）khớp với tổng của tiểu tổng từng管理支店
・Tổng toàn bộ（grand_total_busu）khớp với tổng của tổng từng販売店

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-026 — Snapshot mới nhất tại thời điểm適用日

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại nhiều lịch sử có ngày áp dụng thay đổi khác nhau đối với cùng một độc giả

### 手順

ステップ1：
Chỉ định 適用日 và thực hiện「レポートプレビュー」

ステップ2：
Đối chiếu nội dung dòng chi tiết với lịch sử có rireki_no lớn nhất thỏa mãn `joho_henko_tekiyo_date <= 適用日`

### 期待結果

ステップ1：
Danh sách được hiển thị

ステップ2：
Đối với mỗi độc giả, nội dung của rireki_no lớn nhất（snapshot mới nhất）thỏa mãn `joho_henko_tekiyo_date <= 適用日` tại thời điểm 適用日 được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-027 — Loại trừ record hủy đăng ký

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại độc giả hủy đăng ký（tetsuzuki_shurui=0）

### 手順

ステップ1：
Chỉ định 適用日 và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Chỉ độc giả mới（tetsuzuki_shurui=1）được hiển thị
・Độc giả hủy đăng ký（tetsuzuki_shurui=0）không hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-028 — Loại trừ併読

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại độc giả併読（dokusya_shubetsu=3）

### 手順

ステップ1：
Để 購読種別 chưa chọn（紙版＋電子版）và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
・Chỉ độc giả紙版（1）・電子版（2）được hiển thị
・Độc giả併読（3）không hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-029 — Filter購読種別

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Độc giả紙版・電子版 lẫn lộn

### 手順

ステップ1：
Chọn 購読種別=電子版 và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Chỉ độc giả電子版（dokusya_shubetsu=2）được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-030 — Filter支払区分

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Độc giả có chu kỳ thanh toán khác nhau lẫn lộn

### 手順

ステップ1：
Chọn 支払区分=毎月（1）và thực hiện「レポートプレビュー」

### 期待結果

ステップ1：
Chỉ độc giả có chu kỳ thanh toán phí đăng ký là 毎月（dokusyaryo_shiharai_cycle=1）được hiển thị

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-031 — Đối tượng 0 record（preview）

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại độc giả thuộc đối tượng tổng hợp với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「レポートプレビュー」với điều kiện không tồn tại đối tượng tổng hợp

### 期待結果

ステップ1：
・Trả về HTTP 200（mảng group rỗng, `grand_total_busu: 0`）
・Hiển thị message「対象のデータが存在しません。」(ACSMS-MSG-026-004)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-032 — Xuất Excel trường hợp bình thường・nội dung file

- 観点ID: VP-D-07
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Tồn tại độc giả thuộc đối tượng tổng hợp với điều kiện đối tượng

### 手順

ステップ1：
Chọn 適用日・帳票種別・đối tượng và thực hiện「レポートデータExcel出力」

ステップ2：
Mở file Excel đã download, xác nhận tên sheet・cấu trúc dữ liệu

### 期待結果

ステップ1：
・Trả về HTTP 200
・File Excel（`.xlsx`）được download（tên file `購読者名簿_{YYYY年MM月}.xlsx`）

ステップ2：
・Tên sheet là「購読者名簿」
・Cấu trúc dữ liệu giống với bảng preview, bao gồm dòng tiểu tổng・dòng tổng

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-033 — Đăng ký t_file_download

- 観点ID: VP-D-04
- 種類: Normal (正常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Thực hiện「レポートデータExcel出力」

ステップ2：
Thực hiện query dưới đây trên DB, xác nhận lịch sử download
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
1 record được đăng ký vào t_file_download（download_type=5, file_name lưu tên file Excel, record_count lưu số lượng, target_month lưu năm tháng đối tượng）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-034 — Đối tượng 0 record（xuất Excel）

- 観点ID: VP-C-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Không tồn tại độc giả thuộc đối tượng tổng hợp với điều kiện đã chỉ định

### 手順

ステップ1：
Thực hiện「レポートデータExcel出力」với điều kiện không tồn tại đối tượng tổng hợp

ステップ2：
Xác nhận số lượng đăng ký của t_file_download trên DB

### 期待結果

ステップ1：
・Trả về HTTP 404（`error_code: REPORT_NO_DATA`、メッセージ `対象のデータが存在しません。`）
・File Excel không được download
・Hiển thị message「対象のデータが存在しません。」(ACSMS-MSG-026-004)

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

---

# カテゴリ5: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-026-035 — Request parameter không hợp lệ（BAD_REQUEST）

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/meibo/preview?tekiyo_date=2026-04-01&report_type=invalid」（帳票種別 không hợp lệ）trên tab Network của DevTools

### 期待結果

ステップ1：
Trả về HTTP 400（`error_code: BAD_REQUEST`、メッセージ `リクエストパラメータが不正です。` または `error_code: VALIDATION_ERROR`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-036 — Hết session（UNAUTHORIZED）

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn việc làm hết hiệu lực session bằng công cụ quản lý

### 手順

ステップ1：
Làm hết hiệu lực session khi đang mở màn hình xuất danh bạ độc giả

ステップ2：
Click nút「レポートプレビュー」

### 期待結果

ステップ1：
Màn hình ở trạng thái đã được hiển thị

ステップ2：
・Trả về HTTP 401（`error_code: UNAUTHORIZED`、メッセージ `セッションが切れました。再度ログインしてください。`）
・Chuyển sang「/login」（`redirect` được gắn vào query）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-037 — Hình dạng response lỗi validation（VALIDATION_ERROR）

- 観点ID: VP-B-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/meibo/export」với thiếu tekiyo_date trên tab Network của DevTools

### 期待結果

ステップ1：
・Trả về HTTP 400（`error_code: VALIDATION_ERROR`、メッセージ `入力値が不正です。詳細はerrorsフィールドを確認してください。`）
・Response bao gồm mảng `errors`, mỗi phần tử có hình dạng `{ field, message }`

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-038 — Vượt giới hạn rate（TOO_MANY_REQUESTS）

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi liên tục request tương đương preview hoặc xuất Excel đến số lần giới hạn

ステップ2：
Gửi thêm request vượt quá giới hạn

### 期待結果

ステップ1：
Request đến số lần giới hạn được xử lý bình thường

ステップ2：
Trả về HTTP 429（`error_code: TOO_MANY_REQUESTS`、メッセージ `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`）

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-039 — Lỗi hệ thống（INTERNAL_SERVER_ERROR）

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI
  - ・Đã chuẩn bị sẵn việc phát sinh exception ở phía server

### 手順

ステップ1：
Thực hiện「レポートプレビュー」ở trạng thái đã phát sinh lỗi kết nối DB v.v. ở phía server

### 期待結果

ステップ1：
・Trả về HTTP 500（`error_code: INTERNAL_SERVER_ERROR`、メッセージ `システムエラーが発生しました。しばらくしてから再度お試しください。`）
・Hiển thị message「システムエラーが発生しました。しばらくしてから再度お試しください。」(ACSMS-MSG-026-005)

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

## ACSMS-TC-026-040 — Ngắt kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Chọn「Offline」trên tab Network của DevTools, ngắt kết nối mạng

ステップ2：
Click nút「レポートプレビュー」

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

## ACSMS-TC-026-041 — An toàn với đầu vào SQL injection

- 観点ID: VP-A-10
- 種類: Abnormal (異常)
- 前提条件:
  - ・Đã đăng nhập bằng CHUOKAI

### 手順

ステップ1：
Gửi GET「/api/v1/report/meibo/preview」với tekiyo_date được chỉ định `2026-04-01'; DROP TABLE t_dokusya_rireki; --` trên tab Network của DevTools

ステップ2：
Xác nhận bảng t_dokusya_rireki tồn tại trên DB

### 期待結果

ステップ1：
・Giá trị đầu vào được xử lý như literal bởi parameterized query, không được thực thi như SQL
・Trả về HTTP 400（`error_code: VALIDATION_ERROR` または `BAD_REQUEST`）

ステップ2：
Bảng t_dokusya_rireki không bị xóa và tồn tại

### テスト結果（1回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### テスト結果（2回目）

| Mục | Giá trị |
| --- | --- |
| Kết quả | - |
| Thực tế / Output | - |
| Người thực hiện | - |
| Ngày xác nhận | - |
| Bug ID | - |

### 備考

(なし)

# カテゴリ6: Đối tượng tổng hợp・Lựa chọn cửa hàng bán (Scope / Hanbaiten Options)

## ACSMS-TC-026-042 — Lọc theo chi nhánh (chỉ với loại báo biểu theo chi nhánh quản lý・điều kiện tùy chọn)

- 観点ID: VP-C-08
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (ja_id=100・có quyền `report.export_meibo`)
  - ・Dưới chi nhánh quản lý A (kanri_shiten_id=10) có chi nhánh X (shiten_id=21)／chi nhánh Y (shiten_id=22)
  - ・Dưới chi nhánh quản lý B (kanri_shiten_id=11) có chi nhánh Z (shiten_id=31)
  - ・Người đọc còn hiệu lực tại thời điểm ngày áp dụng: chi nhánh X có 3 người, chi nhánh Y có 2 người, chưa đặt chi nhánh (shiten_id là NULL) có 1 người (tất cả đều thuộc chi nhánh quản lý A)

### Các bước

Bước 1:
Ở trạng thái đã chọn loại báo biểu「販売店別購読者名簿」, kiểm tra xem ô nhập chi nhánh có hiển thị không

Bước 2:
Chuyển loại báo biểu sang「管理支店別購読者名簿」, thao tác ô nhập chi nhánh khi chưa chọn chi nhánh quản lý

Bước 3:
Chọn A cho chi nhánh quản lý, mở dropdown chi nhánh và kiểm tra các lựa chọn

Bước 4:
Bấm「レポートプレビュー」mà không chọn chi nhánh

Bước 5:
Chỉ chọn X cho chi nhánh rồi bấm「レポートプレビュー」

Bước 6:
Giữ nguyên chi nhánh đang chọn là X, đổi chi nhánh quản lý từ A sang B

Bước 7:
Bấm「レポートデータExcel出力」với điều kiện chi nhánh quản lý A ＋ chi nhánh X

### Kết quả mong đợi

Bước 1:
Ô nhập chi nhánh không hiển thị (vì báo biểu theo cửa hàng bán không có cột chi nhánh)

Bước 2:
Ô nhập chi nhánh có hiển thị nhưng bị vô hiệu hóa, kèm hướng dẫn「先に管理支店を選択してください」

Bước 3:
Chỉ chi nhánh X và chi nhánh Y xuất hiện trong lựa chọn. Chi nhánh Z thuộc chi nhánh quản lý B không xuất hiện

Bước 4:
Do chi nhánh là điều kiện tùy chọn nên không báo lỗi kiểm tra, và toàn bộ 6 người thuộc chi nhánh quản lý A (bao gồm 1 người chưa đặt chi nhánh) được xuất ra

Bước 5:
Chỉ 3 người của chi nhánh X được xuất ra. **1 người chưa đặt chi nhánh không được bao gồm**

Bước 6:
Lựa chọn chi nhánh tự động bị gỡ (trở về trống) và danh sách lựa chọn đổi thành chi nhánh Z

Bước 7:
Cùng 3 người như preview được xuất ra Excel và được đăng ký vào `t_file_download`

Bổ sung:
・Chi nhánh = chi nhánh phụ trách giao báo (`t_dokusya_rireki.shiten_id`), không phải chi nhánh ngân hàng (`bank_shiten_id`)
・`shiten_id` là mục tùy chọn khi đăng ký người đọc nên có thể NULL. **Người đọc nhập từ liên kết bản điện tử thì luôn NULL** (vì bản điện tử không có khái niệm chi nhánh phụ trách giao báo). Nếu chọn dù chỉ 1 chi nhánh thì người đọc có giá trị NULL sẽ cho kết quả so sánh IN là NULL nên nằm ngoài đối tượng (Bước 5)
・Đã có giai đoạn đặt điều kiện chi nhánh này là bắt buộc, nhưng khi đó người đọc có NULL dù thao tác thế nào cũng không đưa vào danh sách được (chọn「全て」cũng chỉ liệt kê các ID chi nhánh có thật chứ không lấy được NULL) nên đã đưa về tùy chọn (bản sửa đổi yêu cầu khách hàng 2026-08). Bước 4 là kiểm tra hồi quy cho việc này
・Lý do không giữ lại lựa chọn chi nhánh khi đổi chi nhánh quản lý: nếu vẫn lọc bằng chi nhánh không thuộc cấp dưới thì nhìn màn hình không đọc được lý do vì sao kết quả là 0
・Lý do không hiện điều kiện chi nhánh ở báo biểu theo cửa hàng bán: báo biểu không có cột chi nhánh nên không đọc được lý do lọc từ bản in. Phía API cũng bỏ qua `shiten_ids` khi `report_type=hanbaiten`

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

## ACSMS-TC-026-043 — Đối tượng tổng hợp được tách theo loại báo biểu (#56597)

- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `report.export_meibo`)
  - ・Dưới cùng một chi nhánh quản lý・cửa hàng bán có thật, tồn tại người đọc đang đọc báo trong kỳ xuất như sau
    - ・(a) Bản giấy (dokusya_shubetsu=1) 2 người
    - ・(b) Kết hợp (3)・trả phí (denshi_dokusya_shubetsu=1) 1 người
    - ・(c) Kết hợp (3)・miễn phí (denshi_dokusya_shubetsu=0) 1 người
    - ・(d) Bản điện tử (2)・trả phí・đã duyệt (denshi_shonin_status=1) 1 người
    - ・(e) Bản điện tử (2)・trả phí・chưa duyệt 1 người
    - ・(f) Bản điện tử (2)・miễn phí・đã duyệt 1 người
  - ・Số bản đọc của (b) là 2 bản

### Các bước

Bước 1:
Xuất với loại báo biểu ＝ **theo cửa hàng bán** và kiểm tra người đọc có trong danh sách

Bước 2:
Xuất với loại báo biểu ＝ **theo chi nhánh quản lý** và kiểm tra người đọc có trong danh sách

Bước 3:
Kiểm tra số bản của (b) kết hợp trong bản xuất theo chi nhánh quản lý

Bước 4:
Kiểm tra tổng số bản của cả hai loại báo biểu

### Kết quả mong đợi

Bước 1:
**Chỉ (a) bản giấy 2 người** được xuất ra. Kết hợp (b)(c)・bản điện tử (d)(e)(f) đều nằm ngoài đối tượng (vì báo biểu theo cửa hàng bán tổng hợp theo đơn vị "đối giá cho việc giao báo giấy")

Bước 2:
**(a) bản giấy 2 người + (b) kết hợp・trả phí 1 người + (d) bản điện tử・trả phí・đã duyệt 1 người, tổng 4 người** được xuất ra. (c) kết hợp・miễn phí, (e) bản điện tử・chưa duyệt, (f) bản điện tử・miễn phí nằm ngoài đối tượng

Bước 3:
Số bản của kết hợp được xử lý **nguyên giá trị nhập là 2 bản** (không làm tròn về 1)

Bước 4:
Tổng số bản tương ứng với số người thuộc đối tượng của từng loại được xuất ra

Bổ sung:
・Trước đây bất kể loại báo biểu đều dùng **điều kiện chung** "loại trừ kết hợp, bản điện tử chỉ lấy đã duyệt", nên báo biểu theo cửa hàng bán bị lẫn bản điện tử, còn báo biểu theo chi nhánh quản lý lại rớt mất kết hợp vốn phải thuộc đối tượng (yêu cầu khách hàng 2026-08 / #56597)
・Phán định trả phí dùng **đẳng thức** `denshi_dokusya_shubetsu = 1`. Nếu dùng `<> 0` thì NULL cũng lọt qua. Tiền đề là `denshi_dokusya_shubetsu` luôn có giá trị với bản điện tử・kết hợp, chỉ bản giấy mới NULL
・Điều kiện đã duyệt (`denshi_shonin_status = 1`) **chỉ áp cho bản điện tử** (yêu cầu khách hàng không đề cập tới kết hợp nên làm đúng theo văn bản)
・Xuất dữ liệu trích nợ tài khoản (SCR-020)・xuất thông tin thanh toán phí giao báo (SCR-021) còn có điều kiện khác nữa. Đối tượng khác nhau theo từng báo biểu nên không được dùng lại

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

## ACSMS-TC-026-044 — Cửa hàng bán dummy của bản điện tử bị loại khỏi lựa chọn (#56597)

- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (có quyền `report.export_meibo`)
  - ・JA của mình có cửa hàng bán dummy của bản điện tử (`hanbaiten_code = 9999999999`)
  - ・Có người đọc bản điện tử gắn với cửa hàng dummy
  - ・Cũng tồn tại từ 2 cửa hàng bán có thật trở lên

### Các bước

Bước 1:
Chọn loại báo biểu ＝ theo cửa hàng bán và kiểm tra các lựa chọn của dropdown「販売店」

Bước 2:
Kiểm tra tham số request của `GET /api/v1/hanbaiten/dropdown`

Bước 3:
Chuyển loại báo biểu theo chi nhánh quản lý → theo cửa hàng bán và xác nhận danh sách lựa chọn được lấy lại

Bước 4:
Từ DevTools chỉ định trực tiếp `hanbaiten_id` của cửa hàng dummy và gọi API xuất

### Kết quả mong đợi

Bước 1:
Chỉ các cửa hàng bán có thật hiển thị trong lựa chọn, **cửa hàng dummy (9999999999) không xuất hiện**

Bước 2:
Có chỉ định `dummy=exclude`

Bước 3:
Danh sách lựa chọn được lấy lại khi chuyển loại báo biểu (vì giá trị `dummy` đổi thì tập lựa chọn cũng đổi)

Bước 4:
Kết quả là 0 bản ghi (vì người đọc dưới cửa hàng dummy không vào đối tượng tổng hợp, nên dù chọn được cũng chắc chắn ra 0)

Bổ sung:
・Cửa hàng bán dummy của bản điện tử là "nơi hứng để gắn người đọc bản điện tử", không phải cửa hàng bán có thật. Nó tồn tại vì `t_dokusya.hanbaiten_id` là NOT NULL
・Việc loại trừ tương tự cũng áp dụng cho phiếu liên lạc tăng giảm (SCR-028)
・`/hanbaiten/dropdown` phía BE vốn đã nhận `dummy=only|exclude` từ trước, nhưng component dùng chung `BaseHanbaitenSelect` không có prop và chỉ SCR-011 chỉ định trực tiếp. Lần này đã cho cả hai màn truyền `exclude`

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
