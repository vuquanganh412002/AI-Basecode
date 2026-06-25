# 【Kính gửi Báo Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả bản Cloud_Màn hình xuất dữ liệu chuyển khoản tài khoản_v1.1


---

## Trang bìa

**Hệ thống quản lý độc giả bản Cloud**

**Màn hình xuất dữ liệu chuyển khoản tài khoản**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019-04-19 00:00:00 |

---

## Lịch sử thay đổi

| No. | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/04/09 | 1.0 | Dao Van Thang | Tạo mới | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/04/09 | Dao Van Thang |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách sheet |
| 4.0 | Chuyển màn hình | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện màn hình |
| 6.0 | Định nghĩa mục màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng của màn hình |
| 8.0 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình | 2026/04/09 | Dao Van Thang |


ACSMS-SCR-020_Màn hình xuất dữ liệu chuyển khoản tài khoản_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026-04-09 00:00:00 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

ACSMS-SCR-020_Màn hình xuất dữ liệu chuyển khoản tài khoản_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa mục màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

### Form thiết lập xuất dữ liệu

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Năm tháng ngày | target_month | Lịch (calendar) | Nhập | o | Ngày | — | — | Trái | YYYY/MM/DD | Bảng chuyển khoản tài khoản | t_koza_furikae | Năm tháng ngày | target_month | — | — | Tổng hợp tức thì theo năm tháng chỉ định từ t_dokusya・m_hanbaiten・m_tanka |
| 2.0 | Chi nhánh quản lý | kanriShitenIds | Dropdown | Nhập |  | Chuỗi |  |  | Căn trái |  | Master chi nhánh quản lý | m_kanri_shiten | Tên chi nhánh quản lý | kanri_shiten_name | Luôn hiển thị |  | Danh sách các chi nhánh quản lý thuộc JA của mình.<br>Cho phép chọn nhiều (có thể chọn tất cả, lưu các ID đã chọn ngăn cách bằng dấu phẩy).<br>Lọc dữ liệu xuất theo thông tin độc giả (t_dokusya.kanri_shiten_id) |
| 3.0 | Chi nhánh | shitenIds | Dropdown | Nhập |  | Chuỗi |  |  | Căn trái |  | Master chi nhánh | m_shiten | Tên chi nhánh | shiten_name | Luôn hiển thị |  | Danh sách các chi nhánh thuộc JA của mình.<br>Cho phép chọn nhiều (có thể chọn tất cả, lưu các ID đã chọn ngăn cách bằng dấu phẩy).<br>Lọc dữ liệu xuất theo thông tin độc giả (t_dokusya.shiten_id) |
| 4.0 | Chi nhánh tài khoản | shitenName | Dropdown | Nhập |  | Chuỗi |  | 10.0 | Căn trái |  | Master chi nhánh | m_shiten | Chi nhánh tài khoản | shiten_name | Luôn hiển thị |  | Danh sách các chi nhánh có cờ chi nhánh tài chính (kinyu_shiten_flg) = true.<br>Cho phép chọn nhiều chi nhánh tài khoản (có thể chọn tất cả)<br>Cho phép chọn nhiều (lưu các mã đã chọn ngăn cách bằng dấu phẩy) |
| 7.0 | Ngày trích nợ | hikiotoshiDate | Nhãn (label) | Nhập | o | Ngày |  | 10 | Căn trái | YYYY/MM/DD | — | t_koza_furikae | Master JA | furikae_date | Luôn hiển thị |  | Ngày trích nợ tài khoản |
| 8.0 | Mã người ủy thác | jastemItakushaCode | Nhãn (label) | Nhập | o | Chuỗi |  | 10 | Căn trái |  | — | m_ja | Master JA | jastem_itakusha_code | Luôn hiển thị |  | Mã người ủy thác JASTEM. Chữ và số nửa độ rộng |
| 9.0 | Tên người ủy thác | jastemItakushaName | Nhãn (label) | Nhập | o | Chuỗi |  | 40 | Căn trái |  | — | m_ja | Master JA | jastem_itakusha_name | Luôn hiển thị |  | Tên người ủy thác JASTEM |
| 10.0 | Số hiệu hợp tác xã nông nghiệp | jastemJaCode | Nhãn (label) | Nhập | o | Chuỗi |  | 4 | Căn trái |  | — | m_shiten | Master chi nhánh | jastem_ja_code | Luôn hiển thị |  | Số hiệu HTX nông nghiệp. Số nửa độ rộng |
| 11.0 | Tên hợp tác xã nông nghiệp | jastemJaName | Nhãn (label) | Nhập | o | Chuỗi |  | 15 | Căn trái |  | — | m_shiten | Master chi nhánh | jastem_ja_name | Luôn hiển thị |  | Tên HTX nông nghiệp |
| 12.0 | Mã cửa hàng phụ trách gửi dữ liệu | jastemToriatsukaiTenpoCode | Nhãn (label) | Nhập | o | Chuỗi |  | 3 | Căn trái |  | — | m_shiten | Master chi nhánh | jastem_toriatsukai_tenpo_code | Luôn hiển thị |  | Mã cửa hàng phụ trách gửi dữ liệu. Số nửa độ rộng |
| 13.0 | Tên cửa hàng | jastemTenpoName | Nhãn (label) | Nhập | o | Chuỗi |  | 15 | Căn trái |  | — | m_shiten | Master chi nhánh | jastem_tenpo_name | Luôn hiển thị |  | Tên cửa hàng phụ trách gửi dữ liệu |
| 14.0 | Loại tiền gửi | jastemTyokinShubetsu | Select | Nhập | o | Số nguyên |  | 1 |  |  | — | m_ja | Loại tiền gửi | jastem_tyokin_shubetsu | Luôn hiển thị | 1 (Tiền gửi thông thường) | 1=Tiền gửi thông thường, 2=Tiền gửi vãng lai, 9=Khác |
| 15.0 | Số tài khoản | jastemKozaNo | Text | Nhập | o | Chuỗi |  | 7 | Căn phải |  | — | m_ja | Số tài khoản | jastem_koza_no | Luôn hiển thị |  | Số nửa độ rộng. Số tài khoản ngân hàng |
| 16.0 | Bắt đầu tạo | btnCreate | Nút (button) | Nhập |  | — |  |  |  |  | — | — | Bắt đầu tạo | — | Luôn hiển thị |  | Kiểm tra dữ liệu nhập → Lấy dữ liệu → Tạo file → Lưu file đã tạo lên S3 và thực hiện tải xuống |


---

## Định nghĩa chức năng

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị màn hình | — | Hiển thị màn hình | Hiển thị form thiết lập xuất dữ liệu (hiển thị mặc định: tất cả các trường trống, loại tiền gửi = Tiền gửi thông thường) |
| 2.0 | Bắt đầu tạo | Nút「Bắt đầu tạo」 | Click | Thiết lập ngày cơ sở để lấy dữ liệu thanh toán |

### B. Chi tiết chức năng


#### 1. Hiển thị màn hình

- **1.1** Khi chọn「Xuất thông tin thanh toán」từ menu thanh bên, chuyển sang màn hình「Xuất dữ liệu chuyển khoản tài khoản」
  - ・Hội trung ương (Chuokai): chỉ có thể tạo dữ liệu của hội trung ương mình
  - ・JA bản điếm／JA chi nhánh quản lý: chỉ có thể tạo dữ liệu của JA mình
  - ・
- **1.2** Form được hiển thị với các giá trị mặc định như sau:
  - ・Loại tiền gửi: Tiền gửi thông thường (1) đang được chọn
  - ・Các mục khác: trống

#### 2. Bắt đầu tạo

- **2.1** Khi người dùng click nút「Bắt đầu tạo」, thực hiện kiểm tra dữ liệu nhập như sau.
- **2.2** ・Năm tháng ngày: bắt buộc. Nếu chưa chọn ngày, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Ngày trích nợ: bắt buộc, nếu chưa chọn ngày, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Mã người ủy thác: bắt buộc, nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Tên người ủy thác: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Số hiệu HTX nông nghiệp: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Tên HTX nông nghiệp: bắt buộc. Nếu không chọn, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Mã cửa hàng phụ trách gửi dữ liệu: bắt buộc. Nếu không chọn, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Tên cửa hàng: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Loại tiền gửi: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
  - ・Số tài khoản: bắt buộc. Nếu không nhập, hiển thị thông báo ACSMS-MSG-020-004.
- **2.3** Gửi request API
  - ・Gửi dữ liệu form đến API endpoint được chỉ định bằng phương thức POST
  - ・Định dạng phản hồi là blob.
  - ・Thông tin tổ chức tài chính JASTEM (mã người ủy thác／tên người ủy thác／số hiệu HTX nông nghiệp／tên HTX nông nghiệp) được lưu／cập nhật vào m_ja
  - ・Thông tin chi nhánh tổ chức tài chính JASTEM (mã cửa hàng phụ trách gửi dữ liệu／tên cửa hàng／loại tiền gửi／số tài khoản) được lưu／cập nhật vào bản ghi m_shiten tương ứng với mã chi nhánh tài khoản trích nợ đã chọn
  - ・Từ lần truy cập thứ 2 trở đi, lấy từ 2 bảng trên để hiển thị ban đầu và cho phép người dùng chỉnh sửa
- **2.4** Xử lý phản hồi
  - ・Trường hợp thành công → Lưu file đã tạo lên S3 và thực hiện xử lý tải xuống → Hiển thị ACSMS-MSG-020-001
  - ・Trường hợp không có dữ liệu → Hiển thị ACSMS-MSG-020-002
  - ・Trường hợp lỗi validation → Hiển thị thông báo lỗi dưới trường tương ứng
  - ・Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-020-003

---

## Thông tin thông báo

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/04/09 | Dao Van Thang |

| Mã màn hình | ACSMS-SCR-020 | Tổng quan | Màn hình xuất dữ liệu chuyển khoản tài khoản |
| Tên màn hình | Màn hình xuất dữ liệu chuyển khoản tài khoản | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-020-001 | Đã hoàn tất tạo dữ liệu chuyển khoản tài khoản. |
| 2.0 | ACSMS-MSG-020-002 | Không có dữ liệu đối tượng. |
| 3.0 | ACSMS-MSG-020-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. |
| 4.0 | ACSMS-MSG-020-004 | Đây là mục bắt buộc. |
