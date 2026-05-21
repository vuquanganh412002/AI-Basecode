# 【Nihon Nogyo Shimbun】VTI Japan_Hệ thống quản lý người đọc bản Cloud_Tài liệu thiết kế màn hình_Màn hình xuất dữ liệu chuyển khoản tài khoản_v1.0


---

## Trang bìa

**Hệ thống quản lý người đọc bản Cloud**

**Màn hình xuất dữ liệu chuyển khoản tài khoản**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No. | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm tra | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/04/09 | 1.0 | Dao Van Thang | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/04/09 | Dao Van Thang |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách các sheet |
| 4.0 | Chuyển màn hình | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện màn hình |
| 6.0 | Định nghĩa các mục trên màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng của màn hình |
| 8.0 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình | 2026/04/09 | Dao Van Thang |


ACSMS-SCR-020_Màn hình xuất dữ liệu chuyển khoản tài khoản_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

ACSMS-SCR-020_Màn hình xuất dữ liệu chuyển khoản tài khoản_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa các mục trên màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

### Form thiết lập xuất dữ liệu

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu | Độ dài tối thiểu | Độ dài tối đa | Căn chữ | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Năm tháng ngày | target_month | Lịch | Nhập | o | Date | — | — | Trái | YYYY/MM/DD | Bảng chuyển khoản tài khoản | t_koza_furikae | Năm tháng ngày | target_month | — | — | Tổng hợp theo năm tháng chỉ định từ t_dokusya・m_hanbaiten・m_tanka tại từng thời điểm |
| 2.0 | Chi nhánh tài khoản | shitenName | Dropdown | Nhập |  | VARCHAR |  | 10.0 | Trái |  | Bảng master chi nhánh | m_shiten | Chi nhánh tài khoản | shiten_name | Luôn hiển thị |  | Danh sách các chi nhánh có cờ chi nhánh tài chính (kinyu_shiten_flg) = true.<br>Có thể chọn nhiều chi nhánh tài khoản (có thể chọn tất cả)<br>Có thể chọn nhiều giá trị (các mã đã chọn được lưu, ngăn cách bằng dấu phẩy) |
| 4.0 | Nơi lưu dữ liệu FD | fdDataPath | Textbox | Nhập | o | VARCHAR |  | 255.0 | Trái |  | — | — | Nơi lưu dữ liệu FD | — | Luôn hiển thị |  | Nơi lưu file dữ liệu FD. Có nút "Tham chiếu" đi kèm |
| 5.0 | Nút tham chiếu | btnBrowse | Lịch | Nhập |  | — |  |  |  |  | — | — | — | — | Luôn hiển thị |  | Hiển thị hộp thoại chọn nơi lưu |
| 5.0 | Ngày trừ tiền | hikiotoshiDate | Lịch | Nhập | o | Date |  | 10 | Trái | YYYY/MM/DD | — | t_koza_furikae | Ngày trừ tiền | furikae_date | Luôn hiển thị |  | Ngày trừ tiền tài khoản |
| 6.0 | Mã người ủy thác | jastemItakushaCode | Textbox | Nhập | o | VARCHAR |  | 10 | Trái |  | — | m_ja | Mã người ủy thác | jastem_itakusha_code | Luôn hiển thị |  | Mã người ủy thác JASTEM. Ký tự chữ số nửa độ rộng |
| 7.0 | Tên người ủy thác | jastemItakushaName | Textbox | Nhập | o | VARCHAR |  | 40 | Trái |  | — | m_ja | Tên người ủy thác | jastem_itakusha_name | Luôn hiển thị |  | Tên người ủy thác JASTEM |
| 8.0 | Số hợp tác xã nông nghiệp | jastemJaCode | Textbox | Nhập | o | VARCHAR |  | 4 | Trái |  | — | m_ja | Số hợp tác xã nông nghiệp | jastem_ja_code | Luôn hiển thị |  | Số hợp tác xã nông nghiệp. Chữ số nửa độ rộng |
| 9.0 | Tên hợp tác xã nông nghiệp | jastemJaName | Textbox | Nhập | o | VARCHAR |  | 15 | Trái |  | — | m_ja | Tên hợp tác xã nông nghiệp | jastem_ja_name | Luôn hiển thị |  | Tên hợp tác xã nông nghiệp |
| 10.0 | Mã cửa hàng xử lý gửi dữ liệu | jastemToriatsukaiTenpoCode | Textbox | Nhập | o | VARCHAR |  | 3 | Trái |  | — | m_ja | Mã cửa hàng xử lý gửi dữ liệu | jastem_toriatsukai_tenpo_code | Luôn hiển thị |  | Mã cửa hàng xử lý gửi dữ liệu. Chữ số nửa độ rộng |
| 11.0 | Tên cửa hàng | jastemTenpoName | Textbox | Nhập | o | VARCHAR |  | 15 | Trái |  | — | m_ja | Tên cửa hàng | jastem_tenpo_name | Luôn hiển thị |  | Tên cửa hàng xử lý gửi dữ liệu |
| 12.0 | Loại tiền gửi | jastemTyokinShubetsu | Select | Nhập | o | INTEGER |  | 1 |  |  | — | m_ja | Loại tiền gửi | jastem_tyokin_shubetsu | Luôn hiển thị | 1 (Tiền gửi thông thường) | 1=Tiền gửi thông thường, 2=Tiền gửi vãng lai, 9=Khác |
| 13.0 | Số tài khoản | jastemKozaNo | Textbox | Nhập | o | VARCHAR |  | 7 | Phải |  | — | m_ja | Số tài khoản | jastem_koza_no | Luôn hiển thị |  | Chữ số nửa độ rộng. Số tài khoản ngân hàng |
| 14.0 | Bắt đầu tạo | btnCreate | Button | Nhập |  | — |  |  |  |  | — | — | Bắt đầu tạo | — | Luôn hiển thị |  | Kiểm tra đầu vào → Lấy dữ liệu → Tạo file CSV → Lưu file CSV đã tạo vào đường dẫn chỉ định ở "Nơi lưu dữ liệu FD" |


---

## Định nghĩa chức năng

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị màn hình | — | Hiển thị màn hình | Hiển thị form thiết lập xuất dữ liệu (Hiển thị mặc định: toàn bộ trường trống, Loại tiền gửi = Tiền gửi thông thường) |
| 2.0 | Bắt đầu tạo | Nút "Bắt đầu tạo" | Click | Thiết lập ngày chuẩn để lấy dữ liệu thanh toán |

### B. Chi tiết chức năng


#### 1. Hiển thị màn hình

- **1.1** Khi chọn "Xuất thông tin thanh toán" từ menu sidebar, chuyển đến màn hình "Xuất dữ liệu chuyển khoản tài khoản"
  - ・Trung ương hội: chỉ có thể tạo dữ liệu của trung ương hội của mình
  - ・JA bản điếm/JA chi nhánh quản lý: chỉ có thể tạo dữ liệu của JA của mình
- **1.2** Form hiển thị với các giá trị mặc định sau:
  - ・Loại tiền gửi: Tiền gửi thông thường (1) được chọn
  - ・Các mục khác: trống

#### 2. Bắt đầu tạo

- **2.1** Khi người dùng click nút "Bắt đầu tạo", thực hiện kiểm tra đầu vào như sau.
- **2.2** ・Năm tháng ngày: bắt buộc. Nếu không chọn ngày, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Nơi lưu dữ liệu FD: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
  - ・Ngày trừ tiền: bắt buộc. Nếu không chọn ngày, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Mã người ủy thác: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Tên người ủy thác: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
  - ・Số hợp tác xã nông nghiệp: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
  - ・Tên hợp tác xã nông nghiệp: bắt buộc. Nếu không chọn, hiển thị thông báo ACSMS-MSG-020-004
  - ・Mã cửa hàng xử lý gửi dữ liệu: bắt buộc. Nếu không chọn, hiển thị thông báo ACSMS-MSG-020-004
  - ・Tên cửa hàng: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
  - ・Loại tiền gửi: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
  - ・Số tài khoản: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004
- **2.3** Gửi request API
  - ・Gửi dữ liệu form đến endpoint API chỉ định bằng phương thức POST
  - ・Định dạng response là blob.
  - ・Lần đầu: Người dùng nhập thông tin JASTEM tại màn hình xuất dữ liệu chuyển khoản tài khoản
　　　→ Lưu vào bảng m_ja
  - ・Lần thứ hai trở đi: Nếu m_ja đã có giá trị, hiển thị mặc định lên màn hình
　　　→ Người dùng có thể chỉnh sửa khi cần
- **2.4** Xử lý response
  - ・Trường hợp thành công → Lưu file CSV đã tạo vào đường dẫn chỉ định ở "Nơi lưu dữ liệu FD" → Hiển thị ACSMS-MSG-020-001
  - ・Trường hợp không có dữ liệu → Hiển thị ACSMS-MSG-020-002
  - ・Trường hợp lỗi validation → Hiển thị thông báo lỗi dưới trường tương ứng
  - ・Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-020-003

---

## Thông tin thông báo

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-020-001 | Tạo thông tin thanh toán đã hoàn tất. |
| 2.0 | ACSMS-MSG-020-002 | Không có dữ liệu tương ứng. |
| 5.0 | ACSMS-MSG-020-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. |
| 5.0 | ACSMS-MSG-020-004 | Là mục bắt buộc. |
