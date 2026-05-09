# 【Công ty Nhật báo Nông nghiệp Nhật Bản】VTIジャパン_Hệ thống Quản lý Thuê bao Đám mây_Tài liệu Thiết kế Màn hình_Màn hình Tìm kiếm Chi tiết Master Tài khoản_v1.0


---

## Trang bìa

**Hệ thống Quản lý Thuê bao Đám mây**

**Màn hình Tìm kiếm Chi tiết Master Tài khoản**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 1.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người thực hiện | Nội dung thay đổi | Người xác minh | Người duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026-03-20 00:00:00 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Mục lục | 2026/03/20 | Nguyen Duyen Manh |

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
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Chuyển đổi Màn hình | 2026/03/20 | Nguyen Duyen Manh |

> ※ Biểu đồ Chuyển đổi Màn hình được tham chiếu từ biểu đồ trong tệp Excel.

---

## Hình ảnh Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Hình ảnh Màn hình | 2026/03/20 | Nguyen Duyen Manh |

| ID Màn hình | ACSMS-SCR-024 | Tổng quan | Màn hình Tìm kiếm Chi tiết Master Tài khoản |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Master Tài khoản | | |

> ※ Hình ảnh Màn hình được tham chiếu từ hình ảnh trong tệp Excel.

---

## Định nghĩa Trường Màn hình

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Trường Màn hình | 2026/03/20 | Nguyen Duyen Manh |

| ID Màn hình | ACSMS-SCR-024 | Tổng quan | Màn hình Tìm kiếm Chi tiết Master Tài khoản |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Master Tài khoản | | |

### Điều kiện Tìm kiếm

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt buộc | Số chữ số Tối thiểu | Chiều rộng Thực | Tên Bảng (Tên Vật lý) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | ID Đăng nhập | login_id | Hộp Văn bản | Nhập | VARCHAR | 20 | Ký tự chữ và số | login_id |
| 2.0 | Phân loại Quản trị viên | role_id | Danh sách Thả xuống | Nhập | INTEGER | — | — | role_id |
| 3.0 | JA | ja_id | Danh sách Thả xuống | Nhập | VARCHAR | — | — | ja_id |
| 4.0 | Chi nhánh Quản lý | kanri_shiten_id | Danh sách Thả xuống | Nhập | VARCHAR | — | — | kanri_shiten_id |

### Kết quả Tìm kiếm

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Chiều rộng Thực | Tên Bảng (Tên Vật lý) |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | ID Đăng nhập (Cột) | login_id | Liên kết | Xuất | | login_id |
| 2.0 | Phân loại Quản trị viên (Cột) | role_id | Nhãn | Xuất | — | role_id |
| 3.0 | Tỉnh/Thành phố (Cột) | todofuken_code | Nhãn | Xuất | — | todofuken_name |
| 4.0 | JA (Cột) | ja_id | Nhãn | Xuất | — | ja_name |
| 5.0 | Chi nhánh Quản lý (Cột) | kanri_shiten_id | Nhãn | Xuất | — | kanri_shiten_name |
| 6.0 | Phiên bản Giấy (Cột) | paper_flg | Nhãn | Xuất | — | paper_flg |
| 7.0 | Phiên bản Điện tử (Cột) | denshi_flg | Nhãn | Xuất | — | denshi_flg |

### Nút Hành động

| Số. | Tên Mục | ID Mục | Loại Mục | Nhập/Xuất | Bắt buộc | Số chữ số Tối thiểu | Chiều rộng Thực | Tên Bảng (Tên Vật lý) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Tìm kiếm | btn_search | Nút | — | — | — | — | — |
| 2.0 | Xóa Tìm kiếm | btn_clear | Nút | — | — | — | — | — |
| 3.0 | Đăng ký Mới | btn_create | Nút | — | — | — | — | — |
| 4.0 | Hành động (Cột) | btn_delete | Nút | — | — | — | — | — |

---

## Định nghĩa Chức năng

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Định nghĩa Chức năng | 2026/03/20 | Nguyen Duyen Manh |

| ID Màn hình | ACSMS-SCR-024 | Tổng quan | Màn hình Tìm kiếm Chi tiết Master Tài khoản |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Master Tài khoản | | |

### A. Danh sách Chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị Màn hình ban đầu | | Hiển thị Ban đầu | Hiển thị Biểu mẫu Nhập liệu Trống theo Mặc định và Danh sách Tìm kiếm். Danh sách Kết quả Tìm kiếm Luôn được Hiển thị theo Thứ tự Mới nhất |
| 2.0 | Tìm kiếm Tài khoản | Nút Tìm kiếm | Nhấp | Tìm kiếm Tài khoản với Điều kiện Nhập liệu. Hiển thị Kết quả trong Bảng + Phân trang |
| 3.0 | Xóa Điều kiện Tìm kiếm | Nút Xóa | Nhấp | Đặt lại tất cả Điều kiện Tìm kiếm. Xóa Kết quả Tìm kiếm. Hiển thị Danh sách Tài khoản Mặc định |
| 4.0 | Chỉnh sửa Tài khoản | ID Đăng nhập | Nhấp | Chuyển đến Màn hình Chi tiết/Chỉnh sửa Tài khoản |
| 5.0 | Đăng ký Mới | Nút Đăng ký Mới | Nhấp | Chuyển đến Màn hình Đăng ký Tài khoản (ACSMS-MSG-025) |
| 6.0 | Phân trang | Phân trang | Nhấp | Tải Dữ liệu Trang Trước/Tiếp theo. Duy trì Điều kiện Tìm kiếm |
| 7.0 | Cascade — Chọn Tỉnh/Thành phố | Menu Thả xuống Tỉnh/Thành phố | Thay đổi | Chọn Tỉnh/Thành phố → Tải lại Danh sách JA Kết hợp |
| 8.0 | Cascade JA → Chi nhánh Quản lý | Danh sách Thả xuống JA | Thay đổi | Chọn JA → Tải lại Danh sách Chi nhánh Quản lý Tương ứng। Đặt lại Chi nhánh Quản lý Hiện tại |
| 9.0 | Xóa Tài khoản | Nút Xóa | Thay đổi | Xác minh Tài khoản Đích có được Liên kết với Các bảng Liên quan। Nếu Được Liên kết, không thể Xóa. Nếu Không được Liên kết, Hiển thị Hộp thoại Xác nhận, Thực hiện Xóa Logic (set deleted_at), Tải lại Danh sách। |

### B. Chi tiết Chức năng


#### 1. Hiển thị Màn hình ban đầu

- **1.1** Khi Truy cập Màn hình Đăng ký Master Tài khoản, Hiển thị như sau (Chỉ Quản trị viên Nhật báo nông nghiệp có thể Truy cập)
  - ・Biểu mẫu Tìm kiếm Trống
  - ・Danh sách Tài khoản Mặc định

#### 2. Danh sách Breadcrumb：Trang chủ > Chức năng Quản trị viên > Tìm kiếm Chi tiết Master Tài khoản

- **2.0** Tìm kiếm Tài khoản

#### 3. Nhập Điều kiện Tìm kiếm
  - ・ID Đăng nhập：Tìm kiếm LIKE (Khớp Một phần)। Tùy chọn
  - ・Phân loại Quản trị viên：Chọn 1-5 từ Danh sách Thả xuống। Tùy chọn। Không chọn = Tất cả
  - ・JA：Chọn từ Danh sách Thả xuống m_ja। Tùy chọn
  - ・Chi nhánh Quản lý：Cascade từ JA। Tùy chọn

#### 4. Nhấp Nút Tìm kiếm
  - ・Áp dụng Bộ lọc Phạm vi dựa trên Quyền hạn để Tìm kiếm
  - ・Luôn Lọc bằng deleted_at IS NULL

#### 5. Hiển thị Kết quả
  - ・Nếu Có Kết quả Tìm kiếm → Phản ánh Kết quả vào Bảng, Hiển thị Phân trang (Mặc định 20 Mục/Trang)। Kết quả Tìm kiếm Luôn được Hiển thị theo Thứ tự Mới nhất
  - ・Nếu Không có Kết quả Tìm kiếm → Hiển thị Thông báo ACSMS-MSG-024-001
  - ・Nếu Không có Quyền hạn → Hiển thị ACSMS-MSG-024-006।

#### 6. Nếu Lỗi Hệ thống → Hiển thị Thông báo ACSMS-MSG-024-002

- **3.0** Xóa Điều kiện Tìm kiếm

#### 7. Khi Nhấp "Xóa Điều kiện Tìm kiếm", Tất cả Điều kiện Tìm kiếm và Kết quả Tìm kiếm được Xóa, Danh sách Tài khoản Mặc định được Hiển thị

- **4.0** Chỉnh sửa Tài khoản

#### 8. Khi Nhấp vào ID Đăng nhập, Chuyển đến Màn hình Đăng ký Master Tài khoản (Chế độ Chỉnh sửa)
  - ・Truyền account_id như Tham số Đường dẫn, Lấy Dữ liệu Hiện tại
  - ・ID Đăng nhập Không thể Chỉnh sửa

- **5.0** Đăng ký Mới

#### 9. Khi Nhấp Nút "Đăng ký Mới", Chuyển đến Màn hình Đăng ký Tài khoản
  - ・Màn hình Đăng ký Hiển thị Biểu mẫu Trống theo Mặc định।

- **6.0** Phân trang

#### 10. Kết quả Tìm kiếm được Phân trang. Khi Nhấp Trang Khác, Tải Dữ liệu của Trang đó
  - ・Mặc định：20 Mục/Trang
  - ・Tối đa：100 Mục/Trang

#### 7. Cascade — Chọn Tỉnh/Thành phố

#### 11. Mỗi khi Chọn Tỉnh/Thành phố, Danh sách JA · Chi nhánh Quản lý được Tải lại
  - Phân loại Quản trị viên = 3, Lấy Danh sách JA Tương ứng bằng Mã Tỉnh/Thành phố + Mã "3300"
  - Phân loại Quản trị viên = 4, Lấy Danh sách JA Tương ứng bằng Mã Tỉnh/Thành phố + Mã "5BBB"
  - Phân loại Quản trị viên = 5, Lấy Danh sách JA Tương ứng bằng Mã Tỉnh/Thành phố + Mã "5BBB"

- **8.0** Cascade JA → Chi nhánh Quản lý

#### 12. Mỗi khi Chọn JA → Tải lại Danh sách Chi nhánh Quản lý Tương ứng। Đặt lại Chi nhánh Quản lý Hiện tại

#### 13. JA Không được Chọn → Đặt lại Chi nhánh Quản lý & Vô hiệu hóa Danh sách Thả xuống

- **9.0** Xóa Tài khoản

#### 14. Khi Nhấp Nút "Xóa" trong Cột Hành động, Xác minh Tài khoản Đích có Liên kết với Các bảng Liên quan।

#### 15. Nếu Liên kết → Hiển thị ACSMS-MSG-024-003। Không thể Xóa।

#### 16. Nếu Không Liên kết, Hiển thị Hộp thoại Xác nhận (ACSMS-MSG-024-004)।

#### 17. Khi Nhấp "Có"：
  - ・Hệ thống Thực hiện Xóa Logic (deleted_at = NOW())
  - ・Hiển thị Thông báo Thành công (ACSMS-MSG-024-005)
  - ・Tải lại Danh sách Kết quả Tìm kiếm, Tài khoản Đã xóa Không được Hiển thị trong Danh sách

#### 18. Khi Nhấp "Không" → Đóng Hộp thoại, Không làm gì।

#### 19. Nếu Lỗi Hệ thống → Hiển thị ACSMS-MSG-024-002।

---

## Thông tin Thông báo

| Tên Hệ thống/Ứng dụng | Tài liệu | Tên Bảng | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống Quản lý Thuê bao Đám mây | Tài liệu Thiết kế Màn hình | Thông tin Thông báo | 2026/03/20 | Nguyen Duyen Manh |

| ID Màn hình | ACSMS-SCR-024 | Tổng quan | Màn hình Tìm kiếm Chi tiết Master Tài khoản |
| Tên Màn hình | Màn hình Tìm kiếm Chi tiết Master Tài khoản | | |

| # | Mã Thông báo | Nội dung Thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-024-001 | Không có Dữ liệu Tương ứng। |
| 2.0 | ACSMS-MSG-024-002 | Đã xảy ra Lỗi Hệ thống।Vui lòng thử lại sau। |
| 3.0 | ACSMS-MSG-024-003 | Tài khoản này được Liên kết với Các đối tượng Liên quan, không thể Xóa। |
| 4.0 | ACSMS-MSG-024-004 | Bạn có muốn Xóa Tài khoản này không? |
| 5.0 | ACSMS-MSG-024-005 | Đã Xóa Tài khoản। |
| 6.0 | ACSMS-MSG-024-006 | Bạn không có Quyền truy cập। |
