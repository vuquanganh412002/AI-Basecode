# 【Công ty Nhật báo Nông nghiệp Nhật Bản】VTIジャパン_Hệ thống Quản lý Thuê bao Đám mây_Tài liệu Thiết kế Màn hình_Đặt lại Mật khẩu_Thay đổi Mật khẩu_v1.0


---

## Trang bìa

**Hệ thống Quản lý Thuê bao Đám mây**

**Đặt lại Mật khẩu・Thay đổi Mật khẩu**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| Số. | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/03/20 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Số. | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/03/20 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

| Số. | Tên Bảng | Mô tả |
| --- | --- | --- |

---

## Chuyển đổi Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Chuyển đổi Màn hình | 2026/03/20 | Nguyen Truong An |


ACSMS-SCR-012_Đặt lại Mật khẩu・Thay đổi Mật khẩu

---

## Hình ảnh Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Hình ảnh Màn hình | 2026/03/20 | Nguyen Truong An |

| ID Màn hình | | Tổng quan | |
| Tên Màn hình | | | |

ACSMS-SCR-012_Đặt lại Mật khẩu_Hình ảnh Màn hình
ACSMS-SCR-012_Thay đổi Mật khẩu_Hình ảnh Màn hình

> ※ Hình ảnh Màn hình được tham chiếu từ hình ảnh trong tệp Excel.

---

## Định nghĩa Trường Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Trường Màn hình | 2026/03/20 | Nguyen Truong An |

| ID Màn hình | | Tổng quan | |
| Tên Màn hình | ACSMS-SCR-012 | | |

### Đặt lại Mật khẩu

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt buộc | Loại Dữ liệu Nhập | Độ dài Tối thiểu | Độ dài Tối đa | Độ dài Thực | Canh lề | Định dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật lý) | Điều kiện Hiển thị | Giá trị Mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Tiêu đề | titleForgot | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Giữa | | — | — | — | — | | Đặt lại Mật khẩu | |
| 2 | Văn bản Mô tả | descForgot | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Giữa | | — | — | — | — | | | Văn bản Hướng dẫn Nhập Địa chỉ Email |
| 3 | Địa chỉ Email | email | Nhập Văn bản | Nhập | o | Chuỗi | 1 | 100 | 100 | Trái | xxx@xx.yy | Master Tài khoản | m_account | Địa chỉ Email | email | | | Nhập Bắt buộc. Kiểm tra Định dạng Email। |
| 4 | Nút Gửi | btnSubmit | Nút | Nhập | | | | | | Giữa | | — | — | — | — | | | Nhãn: "Gửi Email Đặt lại Mật khẩu" |
| 5 | Liên kết Quay lại | linkBack | Liên kết | Nhập | | | | | | Giữa | | — | — | — | — | | | Nhãn: "< Quay lại Màn hình Đăng nhập"। Nhấp sẽ Chuyển đến Màn hình Đăng nhập। |
| 6 | Thông báo Thành công | alertSuccess | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Trái | | — | — | — | — | Khi Gửi Email Thành công | | |
| 7 | Thông báo Lỗi | alertError | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Trái | | — | — | — | — | Khi Xảy ra Lỗi | | |

### Thay đổi Mật khẩu

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt buộc | Loại Dữ liệu Nhập | Độ dài Tối thiểu | Độ dài Tối đa | Độ dài Thực | Canh lề | Định dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật lý) | Điều kiện Hiển thị | Giá trị Mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Tiêu đề | titleReset | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Giữa | | — | — | — | — | | Thay đổi Mật khẩu | |
| 2 | Mật khẩu Mới | newPassword | Nhập Mật khẩu | Nhập | o | Chuỗi | 8 | 32 | 32 | Trái | ●●●● | — | — | — | — | Khi Token Hợp lệ | | Nhập Bắt buộc। Chỉ Ký tự Nửa Độ rộng। 8~32 Ký tự। Kết hợp 2+ Loại trong Số Chữ cái/Số/Ký hiệu। Không thể Giống Tên Đăng nhập। Hiển thị Mặt nạ khi Nhập |
| 3 | Mật khẩu Mới (Xác nhận) | confirmPassword | Nhập Mật khẩu | Nhập | o | Chuỗi | 8 | 32 | 32 | Trái | ●●●● | — | — | — | — | Khi Token Hợp lệ | | Nhập Bắt buộc। Phải Khớp với Mật khẩu Mới। |
| 4 | Nút Cập nhật | btnUpdate | Nút | Nhập | | | | | | Giữa | | — | — | — | — | Khi Token Hợp lệ | | Nhãn: "Cập nhật Mật khẩu" |
| 5 | Liên kết Quay lại | linkBack | Liên kết | Nhập | | | | | | Giữa | | — | — | — | — | | | Nhãn: "< Quay lại Màn hình Đăng nhập"। Nhấp sẽ Chuyển đến Màn hình Đăng nhập। |
| 6 | Thông báo Thành công | alertSuccess | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Trái | | — | — | — | — | Khi Cập nhật Mật khẩu Thành công | | |
| 7 | Thông báo Lỗi Token | alertTokenError | Chỉ Hiển thị | Xuất | | Chuỗi | | | | Trái | | — | — | — | — | Khi Token Không hợp lệ hoặc Hết hạn | | |
| 8 | Đang Tải | spinLoading | Chỉ Hiển thị | Xuất | | | | | | Giữa | | — | — | — | — | Đang Xác thực Token | | |


---

## Định nghĩa Chức năng

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Chức năng | 2026/03/20 | Nguyen Truong An |

| ID Màn hình | | Tổng quan | |
| Tên Màn hình | ACSMS-SCR-012 | | |


### Đặt lại Mật khẩu

### A. Danh sách Chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| # | Chức năng | Mục | Sự kiện | Mô tả |
| 1 | Hiển thị Ban đầu | Màn hình | Tải | Khi Hiển thị Trang: Hiển thị Biểu mẫu Nhập Địa chỉ Email Trống |
| 2 | Nhập Địa chỉ Email | email | Nhập | Nhập Địa chỉ Email। Kiểm tra Bắt buộc, Kiểm tra Định dạng Email |
| 3 | Gửi Email Đặt lại | btnSubmit | Nhấp | Kiểm tra Nhập → Gửi Yêu cầu Đặt lại Mật khẩu → Ẩn Biểu mẫu, Hiển thị Thông báo Tương ứng |
| 4 | Quay lại Đăng nhập | linkBack | Nhấp | Chuyển đến Màn hình Đăng nhập |

### B. Chi tiết Chức năng


#### 1. Hiển thị Ban đầu

- **1.1** Hiển thị Biểu mẫu Đặt lại Mật khẩu
- **1.2** Trường Địa chỉ Email được Hiển thị ở Trạng thái Trống

#### 2. Nhập Địa chỉ Email

- **2.1** Nhập Bắt buộc, Nếu không Nhập → Hiển thị ACSMS-SCR-012-001
- **2.2** Kiểm tra Định dạng Email → Hiển thị ACSMS-SCR-012-002
- **2.3** Khi Xảy ra Lỗi, Hiển thị Khung Đỏ + Thông báo Tương ứng bên dưới Trường

#### 3. Gửi Email Đặt lại

- **3.1** Nhấp Nút "Gửi Email Đặt lại Mật khẩu"
- **3.2** Kiểm tra Nhập:
  - ・Địa chỉ Email Không Nhập → Hiển thị ACSMS-SCR-012-001
  - ・Định dạng Địa chỉ Email Không hợp lệ → Hiển thị ACSMS-SCR-012-002
- **3.3** Nếu Kiểm tra OK → Gửi Yêu cầu Đặt lại Mật khẩu, Ẩn Toàn bộ Biểu mẫu
- **3.4** Nếu Gửi Yêu cầu Thành công, Hiển thị Thông báo ACSMS-SCR-012-003 (Bất kể Địa chỉ Email Có tồn tại hay không)
- **3.5** Nếu Xảy ra Lỗi Hệ thống → Hiển thị ACSMS-SCR-012-004

#### 4. Quay lại Đăng nhập

- **4.1** Nhấp Liên kết "< Quay lại Màn hình Đăng nhập", Chuyển đến Màn hình Đăng nhập
- **4.2** Dữ liệu Đã Nhập được Xóa.

### Thay đổi Mật khẩu

### A. Danh sách Chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| # | Chức năng | Mục | Sự kiện | Mô tả |
| 1 | Hiển thị Ban đầu | Màn hình | Tải | Khi Hiển thị Trang: Lấy Token từ URL → Xác thực Token। Nếu Hợp lệ → Hiển thị Biểu mẫu। Nếu Không hợp lệ → Hiển thị Lỗi |
| 2 | Nhập Mật khẩu Mới | newPassword | Nhập | Nhập Mật khẩu Mới। Bắt buộc, Kiểm tra Định dạng Mật khẩu |
| 3 | Nhập Mật khẩu Xác nhận | confirmPassword | Nhập | Nhập Mật khẩu Xác nhận। Bắt buộc, Kiểm tra Khớp với Mật khẩu Mới |
| 4 | Cập nhật Mật khẩu | btnUpdate | Nhấp | Kiểm tra Nhập → Gửi Yêu cầu Cập nhật Mật khẩu → Hiển thị Thông báo Thành công → Chuyển đến /login |
| 5 | Quay lại Đăng nhập | linkBack | Nhấp | Chuyển đến Màn hình Đăng nhập |

### B. Chi tiết Chức năng


#### 1. Hiển thị Ban đầu

- **1.1** Lấy Token từ Tham số URL (?token=xxx)
- **1.2** Nếu Không có Token → Hiển thị ACSMS-SCR-012-008
- **1.4** Gửi Yêu cầu Xác thực Token
- **1.5** Nếu Token Hợp lệ → Hiển thị Biểu mẫu Thay đổi Mật khẩu
- **1.6** Nếu Token Hết hạn → Hiển thị ACSMS-SCR-012-007
- **1.7** Nếu Token Không hợp lệ → Hiển thị ACSMS-SCR-012-008

#### 2. Nhập Mật khẩu Mới

- **2.1** Nhập Bắt buộc, Nếu không Nhập → Hiển thị ACSMS-SCR-012-005
- **2.2** Nếu Định dạng Mật khẩu Không hợp lệ → Hiển thị ACSMS-SCR-012-006
- **2.3** Kiểm tra Nhập khi Thoát Tiêu điểm
- **2.4** Khi Xảy ra Lỗi, Hiển thị Khung Đỏ + Thông báo Tương ứng bên dưới Trường

#### 3. Nhập Mật khẩu Xác nhận

- **3.1** Nhập Bắt buộc, Nếu không Nhập → Hiển thị ACSMS-SCR-012-009
- **3.2** Phải Khớp với Mật khẩu Mới। Nếu Không Khớp → Hiển thị ACSMS-SCR-012-010
- **3.3** Kiểm tra Nhập khi Thoát Tiêu điểm

#### 4. Cập nhật Mật khẩu

- **4.1** Nhấp Nút "Cập nhật Mật khẩu"
- **4.2** Kiểm tra Nhập:
  - ・Mật khẩu Mới Không Nhập → Hiển thị ACSMS-SCR-012-005
  - ・Định dạng Mật khẩu Không hợp lệ → Hiển thị ACSMS-SCR-012-006
  - ・Mật khẩu Xác nhận Không Nhập → Hiển thị ACSMS-SCR-012-009
  - ・Mật khẩu Không Khớp → Hiển thị ACSMS-SCR-012-010
- **4.3** Nếu Kiểm tra OK → Gửi Yêu cầu Cập nhật Mật khẩu
- **4.4** Nếu Token Hết hạn Trong Quá trình Xử lý → Hiển thị ACSMS-SCR-012-007
- **4.5** Nếu Cập nhật Thành công → Hiển thị ACSMS-SCR-012-011
- **4.6** Sau 3 Giây tự động Chuyển đến Màn hình Đăng nhập
- **4.7** Nếu Xảy ra Lỗi Hệ thống → Hiển thị ACSMS-SCR-012-004

#### 5. Quay lại Đăng nhập

- **5.1** Nhấp Liên kết "< Quay lại Màn hình Đăng nhập", Chuyển đến Màn hình Đăng nhập
- **5.2** Dữ liệu Đã Nhập được Xóa.

---

## Thông tin Thông báo

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Thông tin Thông báo | 2026/03/20 | Nguyen Truong An |

| ID Màn hình | | Tổng quan | |
| Tên Màn hình | ACSMS-SCR-012 | | |

| # | Mã Thông báo | Nội dung Thông báo |
| --- | --- | --- |
| # | Mã Thông báo | Nội dung Thông báo |
| 1 | ACSMS-SCR-012-001 | Vui lòng nhập Địa chỉ Email। |
| 2 | ACSMS-SCR-012-002 | Vui lòng nhập Địa chỉ Email Hợp lệ। |
| 3 | ACSMS-SCR-012-003 | Đã Gửi Email Đặt lại Mật khẩu। Vui lòng Kiểm tra Email। |
| 4 | ACSMS-SCR-012-004 | Đã xảy ra Lỗi Hệ thống।Vui lòng thử lại sau। |
| 5 | ACSMS-SCR-012-005 | Vui lòng nhập Mật khẩu Mới। |
| 6 | ACSMS-SCR-012-006 | Mật khẩu phải từ 8~32 Ký tự và Bao gồm 2+ Loại trong Số Nửa Độ rộng Chữ cái・Số・Ký hiệu। |
| 7 | ACSMS-SCR-012-007 | Liên kết đã Hết hạn Hợp lệ। Vui lòng Thử lại Đặt lại Mật khẩu। |
| 8 | ACSMS-SCR-012-008 | Liên kết Không hợp lệ। |
| 9 | ACSMS-SCR-012-009 | Vui lòng nhập Mật khẩu Xác nhận। |
| 10 | ACSMS-SCR-012-010 | Không Khớp với Mật khẩu Mới। |
| 11 | ACSMS-SCR-012-011 | Đã Cập nhật Mật khẩu।Chuyển đến Màn hình Đăng nhập। |
