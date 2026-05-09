# 【Tờ báo Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý người đăng ký phiên bản đám mây_Bản thiết kế màn hình_Màn hình tìm kiếm chi tiết bảng JA_v1.2


---

## Trang bìa

**Hệ thống quản lý người đăng ký phiên bản đám mây**

**Màn hình tìm kiếm chi tiết bảng JA**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm duyệt | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/06 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/01 | 1.1 | Nguyen Duyen Manh | Xử lý ý kiến<br>※ Vị trí sửa đổi：<br>1. Sheet "Mục lục": Số thứ tự 6 của khu vực tìm kiếm, số thứ tự 9, 10 của khu vực bảng danh sách<br>2. Sheet "Định nghĩa chức năng": Bước 1.1, 2.2, 4.2, 6 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/17 | 1.2 | Nguyen Duyen Manh | Xử lý ý kiến<br>※ Vị trí sửa đổi：<br>1. Sheet "Định nghĩa chức năng": Bước 1.1<br>2. Sheet "Thông tin tin nhắn": Xóa tin nhắn khi xóa tìm kiếm | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Mục lục | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| No | Tên sheet | Mô tả |
| 1.0 | Trang bìa | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách sheet |
| 4.0 | Chuyển đổi màn hình | Luồng chuyển đổi màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện màn hình |
| 6.0 | Định nghĩa mục màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng của màn hình |
| 8.0 | Thông tin tin nhắn | Định nghĩa nội dung tin nhắn |

---

## Chuyển đổi màn hình

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Chuyển đổi màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |


ACSMS-SCR-004: Màn hình tìm kiếm chi tiết bảng JA — Chuyển đổi màn hình

---

## Hình ảnh màn hình

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Hình ảnh màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |

| ID màn hình | ACSMS-SCR-004 | Tổng quan | Màn hình tìm kiếm bảng JA |
| Tên màn hình | Màn hình tìm kiếm bảng JA | | |

ACSMS-SCR-004: Màn hình tìm kiếm chi tiết bảng JA — Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong tệp Excel.

---

## Định nghĩa mục màn hình

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Định nghĩa mục màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |

| ID màn hình | ACSMS-SCR-004 | Tổng quan | Màn hình tìm kiếm bảng JA |
| Tên màn hình | Màn hình tìm kiếm bảng JA | | |

### Khu vực tìm kiếm

| No. | Tên mục | Nhập/Xuất | Căn chỉnh min | Căn chỉnh thực | Tên bảng (Tên logic) |
| --- | --- | --- | --- | --- | --- |
| 1.0 | Mã JA | - | Trái | Bảng JA chính | ja_code |
| 2.0 | Tên JA | - | Trái | Bảng JA chính | ja_name |
| 3.0 | Tìm kiếm | - |  | - |  |
| 4.0 | Xóa tìm kiếm | - |  | - |  |
| 5.0 | Chỉnh sửa | - |  | - |  |
| 6.0 | Đăng ký mới | - |  | - |  |

### Khu vực bảng danh sách

| No. | Tên mục | Nhập/Xuất | Căn chỉnh min | Căn chỉnh thực | Tên bảng (Tên logic) |
| --- | --- | --- | --- | --- | --- |
| 1.0 | Mã JA (Cột) | - | Trái | Bảng JA chính | ja_code |
| 2.0 | Tên JA (Cột) | - | Trái | Bảng JA chính | ja_name |
| 3.0 | Mã bưu chính (Cột) | - | Trái | Bảng JA chính | yubin_no |
| 4.0 | Tỉnh thành phố (Cột) | - | Trái | Bảng JA chính | todofuken_code |
| 5.0 | Địa chỉ (Cột) | - | Trái | Bảng JA chính | address |
| 6.0 | Số điện thoại (Cột) | - | Trái | Bảng JA chính | tel |
| 7.0 | Số FAX (Cột) | - | Trái | Bảng JA chính | fax |
| 8.0 | Thao tác (Cột) | - |  | - | - |
| 9.0 | Cờ Hội trung tâm | - | Giữa | Bảng JA chính | chuokai_flg |
| 10.0 | Phân trang | - |  | - | - |


---

## Định nghĩa chức năng

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Định nghĩa chức năng | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |

| ID màn hình | ACSMS-SCR-004 | Tổng quan | Màn hình tìm kiếm bảng JA |
| Tên màn hình | Màn hình tìm kiếm bảng JA | | |


### B. Chi tiết chức năng


### 1   Hiển thị ban đầu (onMounted)

- **1.1** Kiểm tra loại tài khoản của người dùng đang đăng nhập, hiển thị ban đầu như sau
（Bảng JA chính chỉ người quản trị nông nghiệp có thể vận hành. Hội trung tâm chỉ có thể chỉnh sửa một phần các mục của bản ghi của hội trung tâm của chính họ. JA chính nhánh chỉ có thể chỉnh sửa một phần các mục của bản ghi của JA của chính họ.※Các trường có thể chỉnh sửa như sau。Mã bưu chính, địa chỉ, số điện thoại, số FAX, địa chỉ email, tên phòng ban phụ trách, tên người phụ trách, phân loại thuế, ghi chú）
  - ・Biểu mẫu tìm kiếm để trống
  - ・Danh sách JA mặc định（Tự động lọc danh sách JA theo JA của người dùng đăng nhập（ja_id），hiển thị）
- **1.2** Đường dẫn breadcrumb: Trang chủ > Quản lý bảng chính > Tìm kiếm chi tiết bảng JA

### 2   Thực hiện tìm kiếm (handleSearch)

- **2.1** Nhập điều kiện tìm kiếm rồi nhấp nút "Tìm kiếm" sẽ thực hiện tìm kiếm như sau
  - ・Mã JA: Tìm kiếm khớp một phần
  - ・Tên JA: Tìm kiếm khớp một phần
- **2.2** Danh sách kết quả tìm kiếm luôn được hiển thị theo thứ tự mới nhất, JA bị xóa logic không được hiển thị trong danh sách
- **2.3** Nếu không có kết quả tìm kiếm → Hiển thị ACSMS-MSG-004-001
- **2.4** Nếu tài khoản không có quyền → Hiển thị ACSMS-MSG-004-002
- **2.5** Nếu xảy ra lỗi hệ thống → Hiển thị ACSMS-MSG-004-005

### 3   Xóa tìm kiếm (handleClear)

- **3.1** Nhấp nút "Xóa tìm kiếm" sẽ xóa tất cả các điều kiện tìm kiếm
- **3.2** Đặt lại các điều kiện tìm kiếm Mã JA và Tên JA thành trống
- **3.3** Quay lại trang đầu tiên (trang 1)
- **3.4** Đặt lại điều kiện sắp xếp thành trạng thái ban đầu (không sắp xếp)
- **3.5** Hiển thị danh sách JA mặc định

### 4   Phân trang

- **4.1** Danh sách kết quả tìm kiếm được chia thành các trang
- **4.2** Mặc định: 20 mục/trang, tối đa: 100 mục/trang
- **4.3** Thanh điều hướng trang （< 1 2 3 ... N >） được hiển thị ở dưới bảng）
- **4.4** Chuyển đổi trang trong khi duy trì các điều kiện tìm kiếm hiện tại
- **4.5** Khi điều kiện tìm kiếm thay đổi, tự động quay lại trang 1

### 5   Xóa JA

- **5.1** Nhấp nút "Xóa" trong cột thao tác, hệ thống sẽ kiểm tra xem JA đích có được liên kết với bảng liên quan không
- **5.2** Nếu có liên kết → Hiển thị ACSMS-MSG-004-003. Không thể xóa
  - Nếu không có liên kết, hiển thị hộp thoại xác nhận (ACSMS-MSG-004-004)
  - Nếu nhấp "Có":
  - ・Hệ thống thực hiện xóa logic (deleted_at = NOW())
  - ・Nếu xóa thành công, hiển thị tin nhắn (ACSMS-MSG-004-006)
  - ・Tải lại danh sách kết quả tìm kiếm
  - Nếu xảy ra lỗi hệ thống → Hiển thị ACSMS-MSG-004-005

### 6  Chức năng sắp xếp

- **6.1** Cột được sắp xếp:
  - ・Mã JA (ja_code)
  - ・Tỉnh thành phố (todofuken_code)
- **6.2** Được thực thi khi nhấp vào tiêu đề cột
- **6.3** Quy tắc chuyển đổi thứ tự sắp xếp:
  - ・Lần đầu nhấp → Sắp xếp tăng dần (ASC)
  - ・Lần thứ hai nhấp → Sắp xếp giảm dần (DESC)
  - ・Lần thứ ba nhấp → Trở lại không sắp xếp (trạng thái ban đầu)
- **6.4** Hiển thị trạng thái sắp xếp hiện tại với biểu tượng trong tiêu đề cột
  - ・Tăng dần: ▲ biểu tượng
  - ・Giảm dần: ▼ biểu tượng
  - ・Không sắp xếp: Biểu tượng ẩn
- **6.5** Thực hiện sắp xếp trong khi duy trì các điều kiện tìm kiếm hiện tại
- **6.6** Chuyển đổi trang trong khi duy trì các điều kiện tìm kiếm hiện tại

### 7  Đăng ký mới

- **7.1** Nhấp nút "Đăng ký mới" sẽ chuyển sang màn hình đăng ký bảng JA chính
- **7.2** Màn hình đăng ký hiển thị biểu mẫu trống theo mặc định

### 8  Chỉnh sửa JA

- **8.1** Chọn JA muốn chỉnh sửa từ danh sách kết quả tìm kiếm sẽ chuyển sang màn hình chỉnh sửa JA
- **8.2** Truyền ID sang màn hình đăng ký, lấy dữ liệu hiện có

---

## Thông tin tin nhắn

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Thông tin tin nhắn | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 |

| ID màn hình | ACSMS-SCR-004 | Tổng quan | Màn hình tìm kiếm bảng JA |
| Tên màn hình | Màn hình tìm kiếm bảng JA | | |

| # | Mã tin nhắn | Nội dung tin nhắn |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-004-001 | Không tìm thấy kết quả tìm kiếm. |
| 2.0 | ACSMS-MSG-004-002 | Không có quyền truy cập. |
| 3.0 | ACSMS-MSG-004-003 | Không thể xóa vì có dữ liệu liên quan. |
| 4.0 | ACSMS-MSG-004-004 | Bạn có chắc chắn muốn xóa JA này không? |
| 5.0 | ACSMS-MSG-004-005 | Đã xảy ra lỗi hệ thống. |
| 6.0 | ACSMS-MSG-004-006 | Đã xóa thành công. |
