# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_販売店Excelデータ取込画面_v1.0

# 【Khách hàng Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả phiên bản Cloud_Tài liệu thiết kế màn hình_Màn hình nhập dữ liệu Excel cửa hàng bán_v1.0

---

## Trang bìa (表紙)

**Hệ thống quản lý độc giả phiên bản Cloud (クラウド版購読者管理システム)**

**Màn hình nhập dữ liệu Excel cửa hàng bán (販売店Excelデータ取込画面)**

**Phiên bản 1.0**

- **Mã định dạng (フォーマットコード)**: 16-BM/PM/VTI
- **Phiên bản định dạng (フォーマットバージョン)**: 1.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi (変更履歴)

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/27 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục (目次)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

| No | Tên sheet | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa (表紙) | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi (変更履歴) | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục (目次) | Danh sách sheet |
| 4.0 | Luồng chuyển màn hình (画面遷移) | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình (画面イメージ) | Giao diện màn hình |
| 6.0 | Định nghĩa các mục màn hình (画面項目定義) | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng (機能定義) | Định nghĩa chức năng của màn hình |
| 8.0 | Thông tin thông báo (メッセージ情報) |  |

---

## Luồng chuyển màn hình (画面遷移)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

> ※ Vui lòng tham khảo sơ đồ luồng chuyển màn hình trong file Excel.

---

## Hình ảnh màn hình (画面イメージ)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

- **Mã màn hình**: ACSMS-SCR-019
- **Tổng quan**: Màn hình nhập dữ liệu Excel cửa hàng bán
- **Tên màn hình**: Màn hình nhập dữ liệu Excel cửa hàng bán

> ※ Vui lòng tham khảo hình ảnh màn hình trong file Excel.

---

## Định nghĩa các mục màn hình (画面項目定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

- **Mã màn hình**: ACSMS-SCR-019

### Màn hình nhập dữ liệu Excel cửa hàng bán (販売店Excelデータ取込画面)

| No | Tên mục | ID mục | Loại mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Chọn file Excel | excelFile | Input | Vào | ○ | File |  |  |  |  |  |  |  | Luôn hiển thị |
| 2.0 | Chế độ nhập | importMode | Select | Vào | ○ |  |  |  |  |  |  |  |  | Luôn hiển thị |
| 3.0 | Nút Template | btnTemplate | Button | Vào |  |  |  |  |  |  |  |  |  | Luôn hiển thị |
| 4.0 | Panel cột nhập | colAccordionHeader | Button | Vào |  |  |  |  |  |  |  |  |  | Luôn hiển thị |
| 5.0 | Chọn tất cả | chkSelectAll | Checkbox | Vào |  | Boolean |  |  |  |  |  |  |  | Luôn hiển thị |
| 6.0 | Mã cửa hàng bán | col_01 | Checkbox | Vào | ○ | Boolean |  | 10 | VARCHAR(10) | Master cửa hàng bán | m_hanbaiten | Mã cửa hàng bán | hanbaiten_code | Khi panel cột đang hiển thị |
| 7.0 | Tên cửa hàng bán | col_02 | Checkbox | Vào |  | Boolean |  | 100 | VARCHAR(100) | Master cửa hàng bán | m_hanbaiten | Tên cửa hàng bán | hanbaiten_name | Khi panel cột đang hiển thị |
| 8.0 | Tên cửa hàng bán (Kana) | col_03 | Checkbox | Vào |  | Boolean |  | 100 | VARCHAR(100) | Master cửa hàng bán | m_hanbaiten | Tên cửa hàng bán Kana | hanbaiten_name_kana | Khi panel cột đang hiển thị |
| 9.0 | Số hóa đơn (Invoice) | col_04 | Checkbox | Vào |  | Boolean |  | 20 | VARCHAR(20) | Master cửa hàng bán | m_hanbaiten | Số hóa đơn (Invoice) | torihikisaki_no | Khi panel cột đang hiển thị |
| 10.0 | Mã bưu điện | col_05 | Checkbox | Vào |  | Boolean | 7 | 7 | VARCHAR(7) | Master cửa hàng bán | m_hanbaiten | Mã bưu điện | yubin_no | Khi panel cột đang hiển thị |
| 11.0 | Địa chỉ | col_06 | Checkbox | Vào |  | Boolean |  | 200 | VARCHAR(200) | Master cửa hàng bán | m_hanbaiten | Địa chỉ | address | Khi panel cột đang hiển thị |
| 12.0 | Số điện thoại | col_07 | Checkbox | Vào |  | Boolean |  | 15 | VARCHAR(15) | Master cửa hàng bán | m_hanbaiten | Số điện thoại | tel | Khi panel cột đang hiển thị |
| 13.0 | Số FAX | col_08 | Checkbox | Vào |  | Boolean |  | 15 | VARCHAR(15) | Master cửa hàng bán | m_hanbaiten | Số FAX | fax | Khi panel cột đang hiển thị |
| 14.0 | Tên trưởng văn phòng | col_09 | Checkbox | Vào |  | Boolean |  | 50 | VARCHAR(50) | Master cửa hàng bán | m_hanbaiten | Tên trưởng văn phòng | shocho_name | Khi panel cột đang hiển thị |
| 15.0 | Phân loại ủy thác | col_10 | Checkbox | Vào |  | Boolean | 1 | 1 | INTEGER | Master cửa hàng bán | m_hanbaiten | Phân loại ủy thác | itaku_kubun | Khi panel cột đang hiển thị |
| 16.0 | Đơn giá phí giao hàng | col_11 | Checkbox | Vào |  | Boolean |  | 10 | VARCHAR(10)→BIGINT | Master cửa hàng bán | m_hanbaiten | Mã đơn giá phí giao hàng | haitatsuryo_tanka_code → haitatsuryo_tanka_id | Khi panel cột đang hiển thị |
| 17.0 | Mã tổ chức tài chính | col_12 | Checkbox | Vào |  | Boolean |  | 4 | VARCHAR(4) | Master cửa hàng bán | m_hanbaiten | Mã tổ chức tài chính | bank_code | Khi panel cột đang hiển thị |
| 18.0 | Tên tổ chức tài chính | col_13 | Checkbox | Vào |  | Boolean |  | 100 | VARCHAR(100) | Master cửa hàng bán | m_hanbaiten | Tên tổ chức tài chính | bank_name | Khi panel cột đang hiển thị |
| 19.0 | Chu kỳ thanh toán phí giao hàng | col_14 | Checkbox | Vào |  | Boolean |  |  | INTEGER | Master cửa hàng bán | m_hanbaiten | Chu kỳ thanh toán phí giao hàng | haitatsuryo_shiharai_cycle | Khi panel cột đang hiển thị |
| 20.0 | Mã chi nhánh tài khoản | col_15 | Checkbox | Vào |  | Boolean |  | 3 | VARCHAR(3) | Master cửa hàng bán | m_hanbaiten | Mã chi nhánh tài khoản | bank_branch_code | Khi panel cột đang hiển thị |
| 21.0 | Tên chi nhánh tài khoản | col_16 | Checkbox | Vào |  | Boolean |  | 100 | VARCHAR(100) | Master cửa hàng bán | m_hanbaiten | Tên chi nhánh tài khoản | bank_branch_name | Khi panel cột đang hiển thị |
| 22.0 | Loại tài khoản | col_17 | Checkbox | Vào |  | Boolean | 1 | 1 | INTEGER | Master cửa hàng bán | m_hanbaiten | Loại tài khoản | yokin_shubetsu | Khi panel cột đang hiển thị |
| 23.0 | Số tài khoản | col_18 | Checkbox | Vào |  | Boolean |  | 10 | VARCHAR(10) | Master cửa hàng bán | m_hanbaiten | Số tài khoản | koza_no | Khi panel cột đang hiển thị |
| 24.0 | Tên chủ tài khoản | col_19 | Checkbox | Vào |  | Boolean |  | 50 | VARCHAR(50) | Master cửa hàng bán | m_hanbaiten | Tên chủ tài khoản | koza_meigi | Khi panel cột đang hiển thị |
| 25.0 | Phân loại chịu phí chuyển khoản | col_20 | Checkbox | Vào |  | Boolean | 1 | 1 | INTEGER | Master cửa hàng bán | m_hanbaiten | Phân loại chịu phí chuyển khoản | furikomi_tesuryo_futan_kubun | Khi panel cột đang hiển thị |
| 26.0 | Phí chuyển khoản | col_21 | Checkbox | Vào |  | Boolean |  | 10 | NUMERIC(10,0) | Master cửa hàng bán | m_hanbaiten | Phí chuyển khoản | furikomi_tesuryo | Khi panel cột đang hiển thị |
| 27.0 | Ghi chú | col_22 | Checkbox | Vào |  | Boolean |  |  | TEXT | Master cửa hàng bán | m_hanbaiten | Ghi chú | biko | Khi panel cột đang hiển thị |
| 28.0 | Cờ đóng cửa hàng | col_23 | Checkbox | Vào |  | Boolean |  |  | TEXT | Master cửa hàng bán | m_hanbaiten | Cờ đóng cửa hàng | haiten_flg | Khi panel cột đang hiển thị |
| 29.0 | Xem trước dữ liệu nhập | previewSection | Label |  |  |  |  |  | — |  |  |  |  | Khi panel cột đang hiển thị |
| 30.0 | Nút bắt đầu nhập | btnImport | Button | Vào |  |  |  |  | — |  |  |  |  | Luôn hiển thị |

---

## Định nghĩa chức năng (機能定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

- **Mã màn hình**: ACSMS-SCR-019

### A. Danh sách chức năng (機能一覧)

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 0.0 | Hiển thị khởi tạo màn hình | ー | Hiển thị | Màn hình hiển thị ở trạng thái mặc định, panel cột nhập ở trạng thái mở rộng, tất cả các checkbox ở trạng thái đã được chọn |
| 1.0 | Chọn file Excel | Chọn file Excel | Thay đổi | Khi chọn file, phân tích nội dung Excel và cập nhật phần xem trước dữ liệu nhập |
| 2.0 | Chọn chế độ nhập | Chế độ nhập | Thay đổi | Giá trị mặc định là "Đăng ký mới" |
| 3.0 | Tải template | Nút "Template" | Click | Tạo và tải file Excel template cố định 23 cột |
| 4.0 | Thu gọn・mở rộng panel cột nhập | Header accordion cột nhập | Click | Chuyển đổi hiển thị/ẩn vùng chọn cột nhập |
| 5.0 | Thao tác checkbox cột nhập | Mã cửa hàng bán ～ Ghi chú | Thay đổi | Cập nhật trạng thái từng checkbox trong danh sách và vẽ lại phần xem trước (cột bắt buộc luôn được chọn và không thể bỏ chọn) |
| 6.0 | Hiển thị xem trước dữ liệu nhập | Xem trước dữ liệu nhập | (Tự động) | Tự động vẽ lại khi chọn file hoặc thay đổi check cột |
| 7.0 | Thực thi xử lý nhập | Nút bắt đầu nhập | Click | Kiểm tra validation → Hộp thoại xác nhận → Gửi lên server và thực thi xử lý nhập |

### B. Chi tiết chức năng (機能詳細)

- **0.0** Hiển thị khởi tạo
- **0.1** Màn hình hiển thị ở trạng thái mặc định, panel cột nhập ở trạng thái mở rộng, tất cả các checkbox ở trạng thái đã được chọn
  - Nichino (người phụ trách) có thể chỉnh sửa cửa hàng bán của từng JA thông qua nhập thay cửa hàng bán.
  Chuokai chỉ có thể chọn Chuokai của mình. JA bản điếm (Honten) và JA chi nhánh quản lý (Kanri Shiten): chỉ có thể chọn JA của mình.

#### 1. Chọn file Excel

- **1.1** Click nút "Chọn file Excel" → hiển thị hộp thoại có bộ lọc .xlsx/.xls
- **1.2** Xử lý sau khi chọn file:
  - ・ Lấy sheet đầu tiên
  - ・ Dòng 1 → danh sách header cột trong file
  - ・ Các dòng còn lại → dữ liệu nhập
  - ・ Trường hợp nhập thất bại → hiển thị ACSMS-MSG-007-001
  - ・ Nhập thành công → cập nhật vùng xem trước (tham khảo chức năng 7)

#### 2. Chọn chế độ nhập

- **2.1** Chọn từ dropdown: Đăng ký mới / Cập nhật toàn bộ mục / Chỉ cập nhật phần đã nhập
- **2.2** Giá trị mặc định: Đăng ký mới

#### 3. Tải template

- **3.1** Hệ thống tạo file Excel, tên sheet: "Cửa hàng bán" (販売店), dòng 1 thiết lập 22 cột theo thứ tự sau
  - ・ Mã cửa hàng bán, Tên cửa hàng bán, Tên cửa hàng bán Kana, Số hóa đơn (Invoice), Mã bưu điện, Địa chỉ, Số điện thoại,
  - ・ Số FAX, Tên trưởng văn phòng, Phân loại ủy thác, Đơn giá phí giao hàng, Mã tổ chức tài chính, Tên tổ chức tài chính,
  - ・ Chu kỳ thanh toán phí giao hàng, Mã chi nhánh tài khoản, Tên chi nhánh tài khoản, Loại tài khoản, Số tài khoản,
  - ・ Tên chủ tài khoản, Phân loại chịu phí chuyển khoản, Phí chuyển khoản, Ghi chú, Cờ đóng cửa hàng
- **3.2** Tải về với tên file ＝ 販売店Excelデータ取込_テンプレート.xlsx (Nhập dữ liệu Excel cửa hàng bán_Template.xlsx)

#### 4. Thu gọn・mở rộng panel cột nhập

- **4.1** Khi panel ở trạng thái mở rộng, click vào sẽ thu gọn
- **4.2** Khi panel ở trạng thái thu gọn, click vào sẽ mở rộng

#### 5. Thao tác checkbox cột nhập

- **5.1** Bằng cách tick/bỏ tick checkbox, cập nhật trạng thái từng checkbox; cột bắt buộc luôn được tick và không thể bỏ chọn
- **5.2** Vẽ lại phần xem trước dữ liệu nhập (chỉ hiển thị các cột đã được tick)

#### 6. Hiển thị xem trước dữ liệu nhập

- **6.1** Điều kiện hiển thị: đã chọn file VÀ có từ 1 dòng dữ liệu trở lên
- **6.2** Ánh xạ cột (mapping): ưu tiên khớp hoàn toàn
- **6.3** Điều kiện ẩn: chưa chọn file, hoặc file rỗng

#### 7. Thực thi xử lý nhập

- **7.1** Thực hiện kiểm tra validation phía client (theo thứ tự):
  - ・ Chưa chọn file → lỗi validation, dừng xử lý
  - ・ Số dòng dữ liệu > 500 → lỗi validation, dừng xử lý
- **7.2** Hộp thoại xác nhận ACSMS-MSG-007-002:
  - ・ "Không" (いいえ) → đóng hộp thoại, không xử lý
  - ・ "Có" (はい) → chuyển đổi dữ liệu rồi gửi lên server
- **7.3** Chuyển đổi・gửi dữ liệu: sử dụng dữ liệu đã nhập (không nhập lại), chỉ các cột có tick, chuyển đổi thành danh sách record, tối đa 500 dòng
- **7.4** Xử lý kết quả:
  - ・ Trường hợp nhập thành công (0 lỗi) → hiển thị số lượng đã nhập → hiển thị ACSMS-MSG-007-004
  - ・ Trường hợp có lỗi → rollback toàn bộ, "Dòng {N}: {tên mục} — {lý do lỗi}"
  - ・ Lỗi hệ thống (HTTP 500) → hiển thị ACSMS-MSG-007-003

---

## Thông tin thông báo (メッセージ情報)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |

- **Mã màn hình**: ACSMS-SCR-019

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-007-001 | Nhập file Excel thất bại. Vui lòng kiểm tra định dạng file. (Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。) |
| 2.0 | ACSMS-MSG-007-002 | Bắt đầu xử lý nhập. Bạn có chắc chắn không? (取込処理を開始します。よろしいですか？) |
| 3.0 | ACSMS-MSG-007-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. (システムエラーが発生しました。しばらくしてから再度お試しください。) |
| 4.0 | ACSMS-MSG-007-004 | Đã nhập thành công. (正常に取り込みました。) |
