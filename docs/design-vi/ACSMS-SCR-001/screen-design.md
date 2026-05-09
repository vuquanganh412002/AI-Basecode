# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_ログイン画面_v1.1


---

## Trang bìa

**Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây**

**Màn Hình Đăng Nhập**

**Phiên Bản 1.1**

| Mã Định Dạng | 16-BM/PM/VTI |
| Phiên Bản Định Dạng | 2.0 |
| Ngày Phát Hành | 2019/04/19 |

---

## Lịch Sử Thay Đổi

| No. | Ngày Phát Hành | Phiên Bản | Người Phụ Trách | Nội Dung Thay Đổi | Người Xác Nhận | Người Phê Duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/03/13 | 1.0 | Nguyen Truong An | Tạo Mới | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/03/20 | 2026-01-01 00:00:00 | Nguyen Truong An | Xử Lý Chỉ Dẫn<br>※ Vị Trí Sửa Đổi：<br>1. "Định Nghĩa Các Mục Màn Hình" Sheet: Số 4 Ô Nhập Mã Xác Thực<br>2. "Định Nghĩa Chức Năng" Sheet: Bước 9.1（87 hàng）<br>3. "Thông Tin Tin Nhắn": hàng 19～21 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục Lục

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Mục Lục | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

| No. | Tên Sheet | Mô Tả |
| --- | --- | --- |
| 1 | Trang Bìa | Trang Bìa Tài Liệu |
| 2 | Lịch Sử Thay Đổi | Lịch Sử Thay Đổi Tài Liệu |
| 3 | Mục Lục | Danh Sách Sheet |
| 4 | Chuyển Tiếp Màn Hình | Sơ Đồ Luồng Chuyển Tiếp |
| 5 | Ảnh Màn Hình | Giao Diện Màn Hình |
| 6 | Định Nghĩa Các Mục Màn Hình | Định Nghĩa Các Mục Trên Màn Hình |
| 7 | Định Nghĩa Chức Năng | Định Nghĩa Chức Năng Của Màn Hình |
| 8 | Thông Tin Tin Nhắn | Định Nghĩa Nội Dung Tin Nhắn |

---

## Chuyển Tiếp Màn Hình

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Chuyển Tiếp Màn Hình | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

> ※ Vui lòng tham khảo sơ đồ chuyển tiếp màn hình trong tệp Excel.

---

## Ảnh Màn Hình

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Ảnh Màn Hình | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

| ID Màn Hình | ACSMS-SCR-001 | Tóm Tắt | Màn Hình Đăng Nhập |
| Tên Màn Hình | Màn Hình Đăng Nhập | | |

ACSMS-SCR-001: Màn Hình Đăng Nhập_Chuyển Tiếp

> ※ Vui lòng tham khảo hình ảnh màn hình trong tệp Excel.

---

## Định Nghĩa Các Mục Màn Hình

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Định Nghĩa Các Mục Màn Hình | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

| ID Màn Hình | ACSMS-SCR-001 | Tóm Tắt | Màn Hình Đăng Nhập |
| Tên Màn Hình | Màn Hình Đăng Nhập | | |

### Mẫu Đăng Nhập — Bước 1

| No. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt Buộc | Kiểu Dữ Liệu Nhập | Chữ Số Tối Thiểu | Chữ Số Tối Đa | Chữ Số Thực | Căn Lề | Định Dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật Lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật Lý) | Điều Kiện Hiển Thị | Giá Trị Mặc Định | Ghi Chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID Người Dùng | loginId | Nhập Văn Bản | Nhập | o | Chuỗi | 1 | 20 | 20 | Trái |  | Bảng Chính Tài Khoản | m_account | ID Đăng Nhập | login_id |  |  | Nhập Bắt Buộc. Chỉ Ký Tự Nửa Chiều Rộng (Chữ Cái, Số, Ký Hiệu) |
| 2 | Mật Khẩu | password | Nhập Mật Khẩu | Nhập | o | Chuỗi | 8 | 32 | 32 | Trái | ●●●● | Bảng Chính Tài Khoản | m_account | Hàm Mã Hóa Mật Khẩu | password_hash |  |  | Xác Thực Bằng bcrypt.compare(nhập_giá_trị, password_hash). Nhập Bắt Buộc. Chỉ Ký Tự Nửa Chiều Rộng. 8～32 Ký Tự. Kết Hợp 2 Loại Trở Lên Trong Số Chữ Cái, Số, Ký Hiệu. Không Thể Giống ID Đăng Nhập. Hiển Thị Che Dấu Khi Nhập |
| 3 | Nút Đăng Nhập | btnLogin | Nút | Nhập |  |  |  |  |  |  |  | — | — | — | — |  |  | Nhãn: Đăng Nhập. Thực Thi Xử Lý Xác Thực |
| 4 | Tin Nhắn Lỗi | alertError | Tin Nhắn | Xuất |  |  |  |  |  |  |  | — | — | — | — | Khi Đăng Nhập Không Thành Công |  | Hiển Thị Khi Xác Thực Không Thành Công |
| 5 | Văn Bản Điều Khoản Sử Dụng | txtTerms | Nhãn | Xuất |  |  |  |  |  |  |  | — | — | — | — |  | "Bằng Cách Đăng Nhập, Bạn Được Coi Là Đã Đồng Ý Với Điều Khoản Sử Dụng." | Liên Kết [Điều Khoản Sử Dụng] Mở PDF |
| 6 | Bản Quyền | txtCopyright |  | Xuất |  |  |  |  |  |  |  | — | — | — | — |  | © 2026 Nhật Báo Nông Nghiệp Nhật Bản |  |

### Mẫu Xác Thực MFA — Bước 2

| No. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt Buộc | Kiểu Dữ Liệu Nhập | Chữ Số Tối Thiểu | Chữ Số Tối Đa | Chữ Số Thực | Căn Lề | Định Dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật Lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật Lý) | Điều Kiện Hiển Thị | Giá Trị Mặc Định | Ghi Chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Biểu Tượng Xác Thực | iconMfa | Biểu Tượng | Xuất |  |  |  |  |  |  |  | — | — | — | — |  |  |  |
| 2 | Tiêu Đề | titleMfa | Nhãn | Xuất |  | Chuỗi |  |  |  |  |  | — | — | — | — |  | Xác Thực Hai Bước |  |
| 3 | Văn Bản Mô Tả | descMfa | Nhãn | Xuất |  | Chuỗi |  |  |  |  |  | — | — | — | — |  |  | Hướng Dẫn Nhập Mã Xác Thực 6 Chữ Số |
| 4 | Ô Nhập Mã Xác Thực | otpCode | Ô Nhập | Nhập | o | Chuỗi | 6 | 6 | 6 |  | Chữ Số Nửa Chiều Rộng | — | — | — | — |  |  | 6 Ô Nhập Riêng Lẻ, Mỗi Ô 1 Chữ Số. Chỉ Nhập Số (0-9). Ánh Xạ Với Bảng t_mfa_otp. |
| 5 | Nút Xác Thực | btnVerify | Nút | Nhập |  |  |  |  |  |  |  | — | — | — | — |  |  | Nhãn: Xác Thực. Vô Hiệu Khi Hết Hạn |
| 6 | Liên Kết Gửi Lại Mã | linkResend | Liên Kết | Nhập |  |  |  |  |  | Giữa |  | — | — | — | — |  |  | Nhãn: "Gửi Lại Mã". Khoảng Thời Gian Gửi Lại 60 Giây. Tối Đa 3 Lần Gửi Lại |
| 7 | Quay Lại Đăng Nhập | linkBack | Liên Kết | Nhập |  |  |  |  |  |  |  | — | — | — | — |  |  | Nhãn: Quay Lại Màn Hình Đăng Nhập, Nhấp Vào Sẽ Quay Lại Màn Hình Đăng Nhập. |
| 8 | Lỗi MFA | alertMfaError | Tin Nhắn | Xuất |  |  |  |  |  |  |  | — | — | — | — | Khi Xác Minh Mã Xác Thực Không Thành Công |  | Hiển Thị Khi Xác Minh Mã Xác Thực Không Thành Công |

### Khu Vực Thông Báo

| No. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Kiểu Dữ Liệu Nhập | Chữ Số Tối Đa | Chữ Số Thực | Căn Lề | Định Dạng | Tên Bảng (Tên Logic) | Tên Bảng (Tên Vật Lý) | Tên Cột (Tên Logic) | Tên Cột (Tên Vật Lý) | Giá Trị Mặc Định | Ghi Chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Thông Báo (Cho Đăng Nhập) | notifArea | Nhãn | Xuất | Danh Sách |  |  | Trái |  | — | — | — | — | Thông Báo | Hiển Thị Thông Báo Có "Địa Điểm Công Bố=1" Và "Trạng Thái=2(Công Bố)". Dự Kiến Hiển Thị Thông Tin Bảo Trì |
| 2 | Ngày Công Bố | publishDate | Nhãn | Xuất | Chuỗi |  |  | Trái | YYYY.MM.DD | Bảng Thông Báo | t_oshirase | Ngày Bắt Đầu Công Bố | publish_start_date |  |  |
| 3 | Tiêu Đề | title | Nhãn | Xuất | Chuỗi | 200 | 200 | Trái |  | Bảng Thông Báo | t_oshirase | Tiêu Đề | title |  |  |


---

## Định Nghĩa Chức Năng

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Định Nghĩa Chức Năng | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

| ID Màn Hình | ACSMS-SCR-001 | Tóm Tắt | Màn Hình Đăng Nhập |
| Tên Màn Hình | Màn Hình Đăng Nhập | | |

### A. Danh Sách Chức Năng

| # | Chức Năng | Mục | Sự Kiện | Mô Tả |
| --- | --- | --- | --- | --- |
| 1 | Hiển Thị Ban Đầu | Màn Hình | Tải | Khi Truy Cập Trang: Kiểm Tra Trạng Thái Đăng Nhập. Chưa Đăng Nhập → Hiển Thị Mẫu + Tải Thông Báo. Đã Đăng Nhập → Chuyển Đến Màn Hình Chính |
| 2 | Nhập ID Người Dùng | Thao Tác | Nhập | Nhập ID Đăng Nhập. Khi Rời Trường: Kiểm Tra Bắt Buộc, Tối Đa 20 Ký Tự |
| 3 | Nhập Mật Khẩu | Thao Tác | Nhập | Nhập Mật Khẩu (Hiển Thị Che Dấu). Khi Rời Trường: Kiểm Tra Bắt Buộc, 8～32 Ký Tự |
| 4 | Đăng Nhập | Thao Tác | Nhấp/Enter | Kiểm Tra Nhập → Gửi Yêu Cầu Đăng Nhập. Không Cần MFA → Chuyển Đến Màn Hình Chính. Cần MFA → Chuyển Đến Bước 2 |
| 5 | Hiển Thị Mẫu MFA | Hệ Thống | Phản Hồi | Nếu Cần Xác Thực Hai Bước → Hiển Thị Mẫu Nhập Mã Xác Thực, Bắt Đầu Đếm Ngược 5 Phút |
| 6 | Nhập Mã Xác Thực | Thao Tác | Nhập | Nhập OTP 6 Chữ Số. Khi Rời Trường: Kiểm Tra Bắt Buộc, 6 Ký Tự |
| 7 | Xác Minh OTP | Thao Tác | Nhấp | Kiểm Tra Mã → Gửi Yêu Cầu Xác Thực. Thành Công → Chuyển Đến Màn Hình Chính. Thất Bại → Hiển Thị Lỗi |
| 8 | Gửi Lại Mã Xác Thực | linkResend | Nhấp | Vô Hiệu Hóa Mã Cũ → Phát Hành Mã Mới → Đặt Lại Đếm Ngược Thành 5 Phút, Khoảng Thời Gian Gửi Lại 60 Giây, Tối Đa 3 Lần Gửi Lại (Nếu 3 Lần Thất Bại, Quay Lại Màn Hình Đăng Nhập). Đặt Lại Số Lần Thử |
| 9 | Xử Lý Đăng Nhập Thành Công | Hệ Thống | Phản Hồi | Lưu Thông Tin Đăng Nhập Vào Trình Duyệt. Chuyển Đến Màn Hình Chính |
| 10 | Xử Lý Lỗi Đăng Nhập | Hệ Thống | Phản Hồi | Hiển Thị Tin Nhắn Lỗi Tương Ứng. Cho Phép Thử Lại |
| 11 | Xử Lý Lỗi MFA | Hệ Thống | Phản Hồi | Mã Không Đúng → Cho Phép Nhập Lại. Hết Hạn Hoặc Vượt Quá 5 Lần → Quay Lại Bước 1 |
| 12 | Quay Lại Đăng Nhập | Thao Tác | Nhấp | Nhấp Vào Liên Kết Quay Lại → Quay Lại Mẫu Đăng Nhập Bước 1 |
| 13 | Hết Hạn Đếm Ngược | Hệ Thống | Bộ Hẹn Giờ | Đếm Ngược Xuống 0 → Thông Báo Hết Hạn, Vô Hiệu Hóa Nút Xác Thực |
| 14 | Tải Thông Báo | Hệ Thống | Tải | Khi Hiển Thị Trang → Tải Danh Sách Thông Báo Công Khai. Lỗi → Ẩn Khu Vực, Không Ảnh Hưởng Đến Đăng Nhập |
| 15 | Hiển Thị Thông Báo | Màn Hình | Render | Mỗi Mục: Ngày + Tiêu Đề. Sắp Xếp Theo Thứ Tự Mới Nhất. Tối Đa 10 Mục. Nếu Không Có Dữ Liệu Thì Ẩn |

### B. Chi Tiết Chức Năng


#### 1. Hiển Thị Ban Đầu

- **1.1** Kiểm Tra Trạng Thái Đăng Nhập
- **1.2** Nếu Đã Đăng Nhập → Chuyển Đến Màn Hình Chính
- **1.3** Nếu Chưa Đăng Nhập → Hiển Thị Mẫu Đăng Nhập
- **1.4** Trạng Thái Ban Đầu: ID Và Mật Khẩu Để Trống, Không Có Lỗi
- **1.5** Tải Thông Báo Song Song (Không Chặn Mẫu Đăng Nhập)

#### 2. Nhập ID Người Dùng

- **2.1** Nhập Bắt Buộc → ACSMS-MSG-001-001
- **2.2** Tối Đa 20 Ký Tự
- **2.3** Khi Rời Trường → Kiểm Tra Ngay Lập Tức
- **2.4** Trường Có Lỗi Hiển Thị Khung Đỏ + Tin Nhắn Ở Bên Dưới

#### 3. Nhập Mật Khẩu

- **3.1** Nhập Bắt Buộc → ACSMS-MSG-001-002
- **3.2** 8～32 Ký Tự
- **3.3** Khi Rời Trường → Kiểm Tra Ngay Lập Tức
- **3.4** Hiển Thị Che Dấu (●●●●)

#### 4. Đăng Nhập

- **4.1** Kiểm Tra Tất Cả Các Trường Bắt Buộc
- **4.2** Nếu Có Lỗi → Hiển Thị Lỗi Trên Trường Tương Ứng, Dừng Xử Lý
- **4.3** Đang Xử Lý: Vô Hiệu Hóa Nút Đăng Nhập, Hiển Thị Trạng Thái Chờ Đợi
- **4.4** Gửi Yêu Cầu Đăng Nhập Với ID Và Mật Khẩu
- **4.5** Hệ Thống Xác Thực Thông Tin Đăng Nhập
- **4.6** Xác Thực Thất Bại (Bất Kỳ Lý Do) → Hiển Thị ACSMS-MSG-001-005 (Tin Nhắn Thống Nhất, Không Phân Biệt Lý Do)
- **4.7** Xác Thực Thành Công, Không Cần Xác Thực Hai Bước → Chuyển Đến Màn Hình Chính (/menu)
- **4.8** Xác Thực Thành Công, Cần Xác Thực Hai Bước → Gửi 6 Chữ Số Mã Xác Thực Qua Email, Chuyển Đến Bước 2
  - ・Nếu Tài Khoản Bị Khóa → Không Thể Đăng Nhập, Hiển Thị ACSMS-MSG-001-005

#### 5. Hiển Thị Mẫu MFA

- **5.1** Chuyển Đến Bước Nhập Mã Xác Thực
- **5.2** Hiển Thị Địa Chỉ Email Nhận Che Dấu (Ví Dụ: t***o@example.com)
- **5.3** Bắt Đầu Đếm Ngược 5 Phút
- **5.4** Hiển Thị ACSMS-MSG-001-011

#### 6. Nhập Mã Xác Thực

- **6.1** Nhập Bắt Buộc → ACSMS-MSG-001-003
- **6.2** 6 Chữ Số Bắt Buộc → ACSMS-MSG-001-004
- **6.3** Khi Rời Trường → Kiểm Tra Ngay Lập Tức
- **6.4** Chỉ Có Thể Nhập Số (0-9)

#### 7. Xác Minh Mã Xác Thực

- **7.1** Kiểm Tra Mã Xác Thực Đã Nhập
- **7.2** Nếu Có Lỗi → Hiển Thị Lỗi Trên Trường, Dừng Xử Lý
- **7.3** Đang Xử Lý: Vô Hiệu Hóa Nút Xác Thực
- **7.4** Gửi Yêu Cầu Xác Minh Mã Xác Thực Cho Hệ Thống
- **7.5** Hạn Sử Dụng Của Mã Đã Hết Hoặc Mã Không Hợp Lệ → Hiển Thị ACSMS-MSG-001-007
- **7.6** Nếu Nhập Sai Từ 5 Lần Trở Lên → Vô Hiệu Hóa Mã Hiện Tại, Hiển Thị ACSMS-MSG-001-008, Quay Lại Màn Hình Đăng Nhập (Cần Đăng Nhập Lại Để Lấy Mã Mới)
- **7.7** Mã Không Đúng → Hiển Thị ACSMS-MSG-001-006, Cho Phép Nhập Lại
- **7.8** Mã Đúng → Đăng Nhập Thành Công, Chuyển Đến Màn Hình Chính

#### 8. Gửi Lại Mã Xác Thực

- **8.1** Nhấp Vào Liên Kết "Gửi Lại Mã"
- **8.2** Nếu Chưa Đủ 60 Giây Kể Từ Lần Gửi Trước → Không Thể Gửi Lại, Hiển Thị Số Giây Còn Lại Trên Liên Kết
- **8.3** Nếu Số Lần Gửi Vượt Quá 3 Lần (Bao Gồm Lần Gửi Ban Đầu) → Hiển Thị ACSMS-MSG-001-012, Quay Lại Màn Hình Đăng Nhập
- **8.4** Vô Hiệu Hóa Mã Cũ
- **8.5** Phát Hành Mã Mới 6 Chữ Số
- **8.6** Đặt Lại Số Lần Thất Bại Thành 0 (Đếm Lại Với Mã Mới)
- **8.7** Đặt Lại Đếm Ngược Thành 5 Phút
- **8.8** Bắt Đầu Thời Gian Chờ Lạnh 60 Giây Cho Liên Kết Gửi Lại
- **8.9** Gửi Mã Mới Qua Email
- **8.10** Hiển Thị ACSMS-MSG-001-011
- **8.11** Nếu Xảy Ra Lỗi Hệ Thống → Hiển Thị ACSMS-MSG-001-010

#### 9. Đăng Nhập Thành Công

- **9.1** Lưu Thông Tin Đăng Nhập Vào Trình Duyệt (Lưu Trữ Trong Cookie HttpOnly (Secure + SameSite=Strict), Có Hiệu Lực 24 Giờ.)
- **9.2** Lưu Thông Tin Người Dùng
- **9.3** Dừng Đếm Ngược (Trường Hợp MFA)
- **9.4** Chuyển Đến Màn Hình Chính (/menu)

#### 10. Lỗi Đăng Nhập

- **10.1** Xác Thực Thất Bại (Bất Kỳ Lý Do) → Hiển Thị ACSMS-MSG-001-005
- **10.2** Lỗi Hệ Thống → Hiển Thị ACSMS-MSG-001-010
- **10.3** Cho Phép Thử Lại

#### 11. Lỗi MFA

- **11.1** Mã Không Đúng → Hiển Thị ACSMS-MSG-001-006, Cho Phép Nhập Lại
- **11.2** Mã Hết Hạn → Hiển Thị ACSMS-MSG-001-007, Quay Lại Bước 1
- **11.3** Nhập Sai Từ 5 Lần Trở Lên → Hiển Thị ACSMS-MSG-001-008, Quay Lại Bước 1
- **11.4** Lỗi Hệ Thống → Hiển Thị ACSMS-MSG-001-010

#### 12. Quay Lại Đăng Nhập

- **12.1** Nhấp Vào Liên Kết Quay Lại
- **12.2** Đặt Lại Trạng Thái Xác Thực Hai Bước
- **12.3** Dừng Đếm Ngược
- **12.4** Hiển Thị Lại Mẫu Đăng Nhập Bước 1

#### 13. Hết Hạn Đếm Ngược

- **13.1** Đếm Ngược Mỗi Giây
- **13.2** Khi Bằng 0 → Hiển Thị Hết Hạn
- **13.3** Vô Hiệu Hóa Nút Xác Thực
- **13.4** Chỉ Cho Phép Nhấp Quay Lại

#### 14. Tải Thông Báo

- **14.1** Lấy Danh Sách Thông Báo Công Khai (Không Cần Đăng Nhập)
- **14.2** Điều Kiện: Cho Màn Hình Đăng Nhập, Đang Công Bố, Trong Thời Gian Hiệu Lực, Tối Đa 10 Mục
- **14.3** Thành Công → Hiển Thị Danh Sách
- **14.4** Lỗi → Ẩn Khu Vực Thông Báo, Không Ảnh Hưởng Đến Đăng Nhập

#### 15. Hiển Thị Thông Báo

- **15.1** Có Thông Báo → Hiển Thị Khu Vực Thông Báo
- **15.2** Không Có Thông Báo → Ẩn Khu Vực
- **15.3** Hiển Thị Mỗi Mục: Ngày (YYYY.MM.DD) + Tiêu Đề
- **15.4** Sắp Xếp Theo Thứ Tự Mới Nhất

---

## Thông Tin Tin Nhắn

| Tên Ứng Dụng/Hệ Thống | Tài Liệu | Tên Sheet | Ngày Tạo | Người Tạo | Ngày Cập Nhật | Người Cập Nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ Thống Quản Lý Người Đăng Ký Phiên Bản Điện Toán Đám Mây | Tài Liệu Thiết Kế Màn Hình | Thông Tin Tin Nhắn | 2026/03/13 | Nguyen Truong An | 2026/03/20 |

| ID Màn Hình | ACSMS-SCR-001 | Tóm Tắt | Màn Hình Đăng Nhập |
| Tên Màn Hình | Màn Hình Đăng Nhập | | |

| # | Mã Tin Nhắn | Nội Dung Tin Nhắn |
| --- | --- | --- |
| 1 | ACSMS-MSG-001-001 | Vui Lòng Nhập ID Người Dùng. |
| 2 | ACSMS-MSG-001-002 | Vui Lòng Nhập Mật Khẩu. |
| 3 | ACSMS-MSG-001-003 | Vui Lòng Nhập Mã Xác Thực. |
| 4 | ACSMS-MSG-001-004 | Mã Xác Thực Phải Là 6 Chữ Số. |
| 5 | ACSMS-MSG-001-005 | ID Người Dùng Hoặc Mật Khẩu Không Đúng. |
| 6 | ACSMS-MSG-001-006 | Mã Xác Thực Không Đúng. |
| 7 | ACSMS-MSG-001-007 | Mã Xác Thực Đã Hết Hạn. Vui Lòng Đăng Nhập Lại. |
| 8 | ACSMS-MSG-001-008 | Số Lần Nhập Mã Xác Thực Đã Đạt Tối Đa. Vui Lòng Đăng Nhập Lại. |
| 9 | ACSMS-MSG-001-009 | Yêu Cầu Xác Thực. Vui Lòng Đăng Nhập Lại. |
| 10 | ACSMS-MSG-001-010 | Đã Xảy Ra Lỗi Hệ Thống. Vui Lòng Thử Lại Sau. |
| 11 | ACSMS-MSG-001-011 | Mã Xác Thực Đã Được Gửi Qua Email. Vui Lòng Kiểm Tra. |
| 12 | ACSMS-MSG-001-012 | Số Lần Gửi Lại Mã Đã Đạt Tối Đa. Vui Lòng Đăng Nhập Lại. |
