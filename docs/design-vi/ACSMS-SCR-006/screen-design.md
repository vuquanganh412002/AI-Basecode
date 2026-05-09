# 【Công ty Nhật báo Nông nghiệp Nhật Bản】VTIジャパン_Hệ thống Quản lý Thuê bao Đám mây_Tài liệu Thiết kế Màn hình_Màn hình Tìm kiếm Chi tiết Branch Master_v1.2


---

## Trang bìa

**Hệ thống Quản lý Thuê bao Đám mây**

**Màn hình Tìm kiếm Chi tiết Branch Master**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 1.0 |
| Ngày phát hành | 2019-04-19 00:00:00 |

---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026-03-17 00:00:00 | 1.0 | Dao Van Thang | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/01 | 1.1 | Dao Van Thang | Phản hồi các nhận xét<br>※Vị trí sửa đổi:<br>1.Bảng "Định nghĩa Chức năng": Bước 1.1、8 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3.0 | 2026/04/14 | 1.2 | Dao Van Thang | Phản hồi các nhận xét<br>※Vị trí sửa đổi:<br>1.Bảng "Định nghĩa Trường Màn hình": 8 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Mục lục | 2026-03-17 00:00:00 | Dao Van Thang |

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
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Chuyển đổi Màn hình | 2026/03/17 | Dao Van Thang |


ACSMS-SCR-006_Màn hình Tìm kiếm Chi tiết Branch Master_Chuyển đổi Màn hình

---

## Hình ảnh Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Hình ảnh Màn hình | 2026-03-17 00:00:00 | Dao Van Thang |

| ID Màn hình | ACSMS-SCR-006 | Tổng quan | Màn hình Tìm kiếm Chi tiết Branch Master |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Branch Master | | |

ACSMS-SCR-006_Màn hình Tìm kiếm Chi tiết Branch Master_Hình ảnh Màn hình

> ※ Hình ảnh Màn hình được tham chiếu từ hình ảnh trong tệp Excel.

---

## Định nghĩa Trường Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Trường Màn hình | 2026-03-17 00:00:00 | Dao Van Thang |

| ID Màn hình | ACSMS-SCR-006 | Tổng quan | Màn hình Tìm kiếm Chi tiết Branch Master |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Branch Master | | |


### Bảng Kết quả Tìm kiếm

| Số. | Tên Mục | Canh lề Tối thiểu | Chiều rộng Thực | Tên Bảng (Tên Lôgic) |
| --- | --- | --- | --- | --- |
| 5.0 | Mã Branch | Canh trái | Branch Master | shiten_code |
| 6.0 | Tên Branch | Canh trái | Branch Master | shiten_name |
| 7.0 | Tên Branch Kana | Canh trái | Branch Master | shiten_name_kana |
| 8.0 | Cờ Branch Tổ chức Tài chính | Canh trái | Branch Master | kinyu_shiten_flg |
| 9.0 | Hoạt động | Canh giữa | — | — |
| 10.0 | Phân trang | | — | — |


---

## Định nghĩa Chức năng

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Chức năng | 2026-03-17 00:00:00 | Dao Van Thang |

| ID Màn hình | ACSMS-SCR-006 | Tổng quan | Màn hình Tìm kiếm Chi tiết Branch Master |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Branch Master | | |


### B. Chi tiết Chức năng

- **1.0** Hiển thị Màn hình Tìm kiếm ban đầu
- **1.1** Khi truy cập Màn hình Tìm kiếm Branch Master, hiển thị như sau
  - ・Người dùng Chuokai: Chỉ có thể chỉnh sửa Bản ghi của Chuokai của chính mình
  - ・Người dùng Trụ sở chính JA / Người dùng Quản lý Branch JA: Chỉ có thể chỉnh sửa Bản ghi của JA của chính mình।
  - ※Các trường Có thể chỉnh sửa là những mục sau। Mã Branch, Tên Branch, Tên Branch Kana। (Cập nhật đồng thời mã Branch, v.v. được sử dụng trong thông tin Thuê bao)
  - ・Biểu mẫu Tìm kiếm trống
  - ・Danh sách Branch Mặc định (Tự động Lọc Danh sách Branch theo JA của Người dùng đã đăng nhập (ja_id), hiển thị)
- **1.2** Danh sách Breadcrumb: Trang chủ > Quản lý Master > Tìm kiếm Chi tiết Branch Master
- **2.0** Tìm kiếm Branch
- **2.1** Nhập Điều kiện Tìm kiếm và nhấp nút "Tìm kiếm", Tìm kiếm được thực hiện như sau
  - ・Tên Branch: Tìm kiếm Khớp Một phần (LIKE '%keyword%')
- **2.2** Nếu Lấy dữ liệu Thành công, hiển thị Danh sách Branch phù hợp với Điều kiện Tìm kiếm।
- **2.3** Nếu không có Kết quả Tìm kiếm → Hiển thị ACSMS-MSG-006-001।
- **2.4** Nếu Tài khoản không có Quyền → Hiển thị ACSMS-MSG-006-003।
- **3.0** Xóa Điều kiện Tìm kiếm
- **3.1** Nhấp nút "Xóa Điều kiện Tìm kiếm" để Xóa tất cả Điều kiện Tìm kiếm → Hiển thị Thông báo ACSMS-MSG-006-002।
  - ・Tên Branch: Để trống
- **3.2** Hiển thị Danh sách Branch Mặc định
- **4.0** Chỉnh sửa Branch
- **4.1** Chọn Branch bạn muốn Chỉnh sửa từ Danh sách Kết quả Tìm kiếm, Chuyển đến Màn hình Chỉnh sửa Branch।
- **4.2** Chuyển ID đến Màn hình Đăng ký, Lấy Dữ liệu hiện có
- **5.0** Xóa Branch
- **5.1** Nhấp nút "Xóa" ở Cột Hoạt động để Kiểm tra xem Branch Mục tiêu có được Liên kết với Bảng Liên quan không।
- **5.2** Nếu Liên kết → Hiển thị ACSMS-MSG-006-006। Không thể Xóa।
- **5.3** Nếu Không liên kết, Hiển thị Hộp thoại Xác nhận (ACSMS-MSG-006-005)।
- **5.4** Nếu nhấp nút "Có"
  - ・Thực thi Xóa Mềm (deleted_at = NOW())
  - ・Hiển thị Thông báo Thành công (ACSMS-MSG-006-007)
  - ・Tải lại Danh sách Kết quả Tìm kiếm
- **5.5** Nếu nhấp nút "Không" → Đóng Hộp thoại, không làm gì।
- **5.6** Nếu Lỗi Hệ thống → Hiển thị ACSMS-MSG-006-004।
- **6.0** Phân trang
- **6.1** Kết quả Tìm kiếm được Phân trang
  - ・Mặc định: 20 Bản ghi/Trang
  - ・Tối đa: 100 Bản ghi/Trang
- **6.2** Hiển thị Điều hướng Trang: < 1 2 3 ... N >
- **7.0** Đăng ký Mới
- **7.1** Nhấp nút "Đăng ký Mới" để Chuyển đến Màn hình Đăng ký Branch।
- **7.2** Màn hình Đăng ký Hiển thị Biểu mẫu Trống theo Mặc định
- **8.0** Sắp xếp (Sắp xếp lại)
- **8.1** Cột Sắp xếp Mục tiêu:
  - ・Mã Branch
  - ・Tên Branch
- **8.2** Thực hiện khi nhấp Tiêu đề Cột
  - Quy tắc Chuyển đổi Thứ tự Sắp xếp:
  - ・Nhấp lần đầu → Sắp xếp Tăng dần (ASC)
  - ・Nhấp lần thứ 2 → Sắp xếp Giảm dần (DESC)
  - ・Nhấp lần thứ 3 → Quay lại Không sắp xếp (Trạng thái Ban đầu)
- **8.3** Hiển thị Trạng thái Sắp xếp Hiện tại ở Tiêu đề Cột bằng Biểu tượng
  - ・Sắp xếp Tăng dần: ▲ Biểu tượng
  - ・Sắp xếp Giảm dần: ▼ Biểu tượng
  - ・Không sắp xếp: Biểu tượng Ẩn
  - Duy trì Điều kiện Tìm kiếm Hiện tại khi Thực hiện Sắp xếp
  - Duy trì Điều kiện Tìm kiếm Hiện tại khi Chuyển đến Trang khác

---

## Thông tin Thông báo

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Thông tin Thông báo | 2026-03-17 00:00:00 | Dao Van Thang |

| ID Màn hình | ACSMS-SCR-006 | Tổng quan | |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Branch Master | | |

| # | Mã Thông báo | Nội dung Thông báo |
| --- | --- | --- |
| 2.0 | ACSMS-MSG-006-002 | Đã xóa Điều kiện Tìm kiếm। |
| 3.0 | ACSMS-MSG-006-003 | Không có Quyền truy cập। |
| 4 | ACSMS-MSG-006-004 | Đã xảy ra Lỗi Hệ thống।Vui lòng thử lại sau। |
| 5 | ACSMS-MSG-006-005 | Bạn có muốn Xóa Branch này không? |
| 6 | ACSMS-MSG-006-006 | Branch này được Liên kết với Đối tượng Liên quan, không thể Xóa। |
| 7 | ACSMS-MSG-006-007 | Đã Xóa Branch। |
