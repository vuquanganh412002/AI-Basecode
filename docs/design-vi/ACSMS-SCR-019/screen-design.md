# 【Công ty Nhật báo Nông nghiệp Nhật Bản】VTIジャパン_Hệ thống Quản lý Thuê bao Đám mây_Tài liệu Thiết kế Màn hình_Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng_v1.0


---

## Trang bìa

**Hệ thống Quản lý Thuê bao Đám mây**

**Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 1.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/27 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Mục lục | 2026/03/27 | Nguyen Truong An |

| Số. | Tên Bảng | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa | Trang bìa Tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi Tài liệu |
| 3.0 | Mục lục | Danh sách Bảng |
| 4.0 | Chuyển đổi Màn hình | Luồng Chuyển đổi Màn hình |
| 5.0 | Hình ảnh Màn hình | Giao diện Màn hình |
| 6.0 | Định nghĩa Trường Màn hình | Định nghĩa Trường trên Màn hình |
| 7.0 | Định nghĩa Chức năng | Định nghĩa Chức năng Màn hình |
| 8.0 | Thông tin Thông báo | Định nghĩa Nội dung Thông báo |

---

## Chuyển đổi Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Chuyển đổi Màn hình | 2026/03/27 | Nguyen Truong An |

> ※ Biểu đồ Chuyển đổi Màn hình được tham chiếu từ biểu đồ trong tệp Excel.

---

## Hình ảnh Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Hình ảnh Màn hình | 2026/03/27 | Nguyen Truong An |

| ID Màn hình | ACSMS-SCR-019 | Tổng quan | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng |
| Tên Màn hình | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng | | |

> ※ Hình ảnh Màn hình được tham chiếu từ hình ảnh trong tệp Excel.

---

## Định nghĩa Trường Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Trường Màn hình | 2026/03/27 | Nguyen Truong An |

| ID Màn hình | ACSMS-SCR-019 | Tổng quan | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng |
| Tên Màn hình | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng | | |

### Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt buộc | Kiểu Dữ liệu Đầu vào | Số chữ số Tối thiểu | Số chữ số Tối đa | Định dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật lý) | Điều kiện Hiển thị |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Chọn Tệp Excel | excelFile | Input | Nhập | ○ | Tệp | | | | | | | | Luôn hiển thị |
| 2.0 | Chế độ Nhập khẩu | importMode | Select | Nhập | ○ | | | | | | | | | Luôn hiển thị |
| 3.0 | Nút Mẫu | btnTemplate | Button | Nhập | | | | | | | | | | Luôn hiển thị |
| 4.0 | Tiêu đề Bảng Chọn Cột | colAccordionHeader | Button | Nhập | | | | | | | | | | Luôn hiển thị |
| 5.0 | Chọn Tất cả | chkSelectAll | Checkbox | Nhập | | Boolean | | | | | | | | Luôn hiển thị |
| 6.0 | Mã Cửa hàng Bán hàng | col_01 | Checkbox | Nhập | ○ | Boolean | | 10 | VARCHAR(10) | Master Cửa hàng Bán hàng | m_hanbaiten | Mã Cửa hàng Bán hàng | hanbaiten_code | Hiển thị khi Bảng được mở |
| 7.0 | Tên Cửa hàng Bán hàng | col_02 | Checkbox | Nhập | | Boolean | | 100 | VARCHAR(100) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Cửa hàng Bán hàng | hanbaiten_name | Hiển thị khi Bảng được mở |
| 8.0 | Tên Cửa hàng Bán hàng (Kana) | col_03 | Checkbox | Nhập | | Boolean | | 100 | VARCHAR(100) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Cửa hàng Kana | hanbaiten_name_kana | Hiển thị khi Bảng được mở |
| 9.0 | Số Hóa đơn | col_04 | Checkbox | Nhập | | Boolean | | 20 | VARCHAR(20) | Master Cửa hàng Bán hàng | m_hanbaiten | Số Hóa đơn | torihikisaki_no | Hiển thị khi Bảng được mở |
| 10.0 | Mã Bưu chính | col_05 | Checkbox | Nhập | | Boolean | 7 | 7 | VARCHAR(7) | Master Cửa hàng Bán hàng | m_hanbaiten | Mã Bưu chính | yubin_no | Hiển thị khi Bảng được mở |
| 11.0 | Địa chỉ | col_06 | Checkbox | Nhập | | Boolean | | 200 | VARCHAR(200) | Master Cửa hàng Bán hàng | m_hanbaiten | Địa chỉ | address | Hiển thị khi Bảng được mở |
| 12.0 | Số Điện thoại | col_07 | Checkbox | Nhập | | Boolean | | 15 | VARCHAR(15) | Master Cửa hàng Bán hàng | m_hanbaiten | Số Điện thoại | tel | Hiển thị khi Bảng được mở |
| 13.0 | Số Fax | col_08 | Checkbox | Nhập | | Boolean | | 15 | VARCHAR(15) | Master Cửa hàng Bán hàng | m_hanbaiten | Số Fax | fax | Hiển thị khi Bảng được mở |
| 14.0 | Tên Trưởng | col_09 | Checkbox | Nhập | | Boolean | | 50 | VARCHAR(50) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Trưởng | shocho_name | Hiển thị khi Bảng được mở |
| 15.0 | Phân loại Ủy thác | col_10 | Checkbox | Nhập | | Boolean | 1 | 1 | INTEGER | Master Cửa hàng Bán hàng | m_hanbaiten | Phân loại Ủy thác | itaku_kubun | Hiển thị khi Bảng được mở |
| 16.0 | Mã Đơn giá Phí Giao hàng | col_11 | Checkbox | Nhập | | Boolean | | 10 | VARCHAR(10)→BIGINT | Master Cửa hàng Bán hàng | m_hanbaiten | Mã Đơn giá Phí Giao hàng | haitatsuryo_tanka_code → haitatsuryo_tanka_id | Hiển thị khi Bảng được mở |
| 17.0 | Mã Tổ chức Tài chính | col_12 | Checkbox | Nhập | | Boolean | | 4 | VARCHAR(4) | Master Cửa hàng Bán hàng | m_hanbaiten | Mã Tổ chức Tài chính | bank_code | Hiển thị khi Bảng được mở |
| 18.0 | Tên Tổ chức Tài chính | col_13 | Checkbox | Nhập | | Boolean | | 100 | VARCHAR(100) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Tổ chức Tài chính | bank_name | Hiển thị khi Bảng được mở |
| 19.0 | Chu kỳ Thanh toán Phí Giao hàng | col_14 | Checkbox | Nhập | | Boolean | | | INTEGER | Master Cửa hàng Bán hàng | m_hanbaiten | Chu kỳ Thanh toán Phí Giao hàng | haitatsuryo_shiharai_cycle | Hiển thị khi Bảng được mở |
| 20.0 | Mã Chi nhánh Tài khoản | col_15 | Checkbox | Nhập | | Boolean | | 3 | VARCHAR(3) | Master Cửa hàng Bán hàng | m_hanbaiten | Mã Chi nhánh Tài khoản | bank_branch_code | Hiển thị khi Bảng được mở |
| 21.0 | Tên Chi nhánh Tài khoản | col_16 | Checkbox | Nhập | | Boolean | | 100 | VARCHAR(100) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Chi nhánh Tài khoản | bank_branch_name | Hiển thị khi Bảng được mở |
| 22.0 | Loại Tài khoản | col_17 | Checkbox | Nhập | | Boolean | 1 | 1 | INTEGER | Master Cửa hàng Bán hàng | m_hanbaiten | Loại Tài khoản | yokin_shubetsu | Hiển thị khi Bảng được mở |
| 23.0 | Số Tài khoản | col_18 | Checkbox | Nhập | | Boolean | | 10 | VARCHAR(10) | Master Cửa hàng Bán hàng | m_hanbaiten | Số Tài khoản | koza_no | Hiển thị khi Bảng được mở |
| 24.0 | Tên Chủ Tài khoản | col_19 | Checkbox | Nhập | | Boolean | | 50 | VARCHAR(50) | Master Cửa hàng Bán hàng | m_hanbaiten | Tên Chủ Tài khoản | koza_meigi | Hiển thị khi Bảng được mở |
| 25.0 | Phân loại Phí Dịch vụ | col_20 | Checkbox | Nhập | | Boolean | 1 | 1 | INTEGER | Master Cửa hàng Bán hàng | m_hanbaiten | Phân loại Phí Dịch vụ | tesuryo_kubun | Hiển thị khi Bảng được mở |
| 26.0 | Phí Dịch vụ | col_21 | Checkbox | Nhập | | Boolean | | 10 | NUMERIC(10,0) | Master Cửa hàng Bán hàng | m_hanbaiten | Phí Dịch vụ | tesuryo_amount | Hiển thị khi Bảng được mở |
| 27.0 | Ghi chú | col_22 | Checkbox | Nhập | | Boolean | | | TEXT | Master Cửa hàng Bán hàng | m_hanbaiten | Ghi chú | biko | Hiển thị khi Bảng được mở |
| 28.0 | Cờ Cửa hàng Đóng | col_23 | Checkbox | Nhập | | Boolean | | | TEXT | Master Cửa hàng Bán hàng | m_hanbaiten | Cờ Cửa hàng Đóng | haiten_flg | Hiển thị khi Bảng được mở |
| 29.0 | Xem trước Dữ liệu Nhập khẩu | previewSection | Label | | | | | | — | | | | | Hiển thị khi Bảng được mở |
| 30.0 | Nút Bắt đầu Nhập khẩu | btnImport | Button | Nhập | | | | | — | | | | | Luôn hiển thị |


---

## Định nghĩa Chức năng

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Chức năng | 2026/03/27 | Nguyen Truong An |

| ID Màn hình | ACSMS-SCR-019 | Tổng quan | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng |
| Tên Màn hình | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng | | |


### B. Chi tiết Chức năng

- **0.0** Hiển thị Màn hình ban đầu
- **0.1** Khi Màn hình được hiển thị, Bảng Chọn Cột ở trạng thái Mở rộng, tất cả các Hộp kiểm được chọn
  - Nhân viên Nhật báo nông nghiệp có thể chỉnh sửa Cửa hàng Bán hàng của mỗi JA từ chức năng Nhập dữ liệu Cửa hàng Bán hàng.
  - Trung ương chỉ có thể chọn của Trung ương của họ.
  - JA Trụ sở chính và Cửa hàng Quản lý JA: chỉ có thể chọn của JA của họ.

#### 1. Chọn Tệp Excel

- **1.1** Nhấn vào "Chọn Tệp Excel" → Cửa sổ thoại được hiển thị với bộ lọc .xlsx/.xls
- **1.2** Xử lý sau khi chọn tệp:
  - ・ Lấy Trang tính đầu tiên
  - ・ Hàng 1 → Danh sách tiêu đề cột trong tệp
  - ・ Các hàng còn lại → Dữ liệu nhập khẩu
  - ・ Nếu nhập không thành công → Hiển thị ACSMS-MSG-007-001
  - ・ Nếu nhập thành công → Cập nhật khu vực Xem trước (xem Chức năng 7)

#### 2. Chọn Chế độ Nhập khẩu

- **2.1** Chọn từ danh sách thả xuống: Đăng ký Mới / Cập nhật Toàn bộ Mục / Cập nhật Chỉ Mục Được nhập
- **2.2** Giá trị mặc định: Đăng ký Mới

#### 3. Tải xuống Mẫu

- **3.1** Hệ thống tạo ra Tệp Excel, tên Trang tính: "Cửa hàng Bán hàng", Hàng 1 chứa 22 cột theo thứ tự sau
  - ・ Mã Cửa hàng Bán hàng, Tên Cửa hàng Bán hàng, Tên Cửa hàng Kana, Số Hóa đơn, Mã Bưu chính, Địa chỉ, Số Điện thoại,
  - ・ Số Fax, Tên Trưởng, Phân loại Ủy thác, Mã Đơn giá Phí Giao hàng, Mã Tổ chức Tài chính, Tên Tổ chức Tài chính,
  - ・ Chu kỳ Thanh toán Phí Giao hàng, Mã Chi nhánh Tài khoản, Tên Chi nhánh Tài khoản, Loại Tài khoản, Số Tài khoản,
  - ・ Tên Chủ Tài khoản, Phân loại Phí Dịch vụ, Phí Dịch vụ, Ghi chú, Cờ Cửa hàng Đóng
- **3.2** Tên tệp = 販売店Excelデータ取込_テンプレート.xlsx để tải xuống

#### 4. Mở rộng / Thu gọn Bảng Chọn Cột

- **4.1** Khi Bảng ở trạng thái Mở rộng, nhấn vào sẽ Thu gọn
- **4.2** Khi Bảng ở trạng thái Thu gọn, nhấn vào sẽ Mở rộng

#### 5. Thao tác Hộp kiểm Chọn Cột

- **5.1** Chọn / Bỏ chọn Hộp kiểm để cập nhật trạng thái của từng Hộp kiểm, Các cột bắt buộc luôn được chọn và không thể thay đổi
- **5.2** Vẽ lại Xem trước Dữ liệu Nhập khẩu (chỉ hiển thị các cột được chọn)

#### 6. Hiển thị Xem trước Dữ liệu Nhập khẩu

- **6.1** Điều kiện Hiển thị: Tệp đã được chọn VÀ Dữ liệu có 1 hàng trở lên
- **6.2** Ánh xạ cột: Phù hợp hoàn hảo là ưu tiên
- **6.3** Điều kiện Ẩn: Tệp chưa được chọn, hoặc Tệp trống

#### 7. Thực hiện Xử lý Nhập khẩu

- **7.1** Thực hiện Kiểm chứng phía máy khách (theo thứ tự):
  - ・ Tệp chưa được chọn → Lỗi Kiểm chứng, dừng xử lý
  - ・ Số hàng Dữ liệu > 500 → Lỗi Kiểm chứng, dừng xử lý
- **7.2** Hộp thoại Xác nhận ACSMS-MSG-007-002:
  - ・ "Không" → Đóng hộp thoại, không xử lý
  - ・ "Có" → Chuyển đổi Dữ liệu và gửi đến Máy chủ
- **7.3** Chuyển đổi Dữ liệu · Gửi：Sử dụng Dữ liệu đã Nhập khẩu (không nhập lại), chỉ các Cột được chọn, chuyển đổi sang Danh sách Bản ghi, tối đa 500 hàng
- **7.4** Xử lý Kết quả:
  - ・ Nếu Nhập khẩu thành công (0 hàng Lỗi) → Hiển thị Số lượng Nhập khẩu → Hiển thị ACSMS-MSG-007-004
  - ・ Nếu có Lỗi → Khôi phục tất cả Bản ghi, "Hàng{N}: {Tên Mục} — {Lý do Lỗi}"
  - ・ Lỗi Hệ thống (HTTP 500) → Hiển thị ACSMS-MSG-007-003

---

## Thông tin Thông báo

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Thông tin Thông báo | 2026/03/27 | Nguyen Truong An |

| ID Màn hình | ACSMS-SCR-019 | Tổng quan | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng |
| Tên Màn hình | Màn hình Nhập dữ liệu Excel Cửa hàng Bán hàng | | |

| # | Mã Thông báo | Nội dung Thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-007-001 | Không thể nhập Tệp Excel. Vui lòng kiểm tra Định dạng Tệp। |
| 2.0 | ACSMS-MSG-007-002 | Bạn có muốn bắt đầu Xử lý Nhập khẩu không? |
| 3.0 | ACSMS-MSG-007-003 | Đã xảy ra Lỗi Hệ thống।Vui lòng thử lại sau। |
| 4.0 | ACSMS-MSG-007-004 | Đã nhập thành công। |
