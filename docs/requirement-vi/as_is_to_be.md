# Phân tích As-Is / To-Be

## ■ Tổng quan hệ thống

Hệ thống quản lý độc giả phiên bản Excel hiện đang cung cấp cho các JA sẽ được đổi mới, xây dựng hệ thống quản lý độc giả thế hệ tiếp theo trên nền tảng đám mây.
Mục tiêu chính: ①Quản lý tập trung thông tin độc giả (tích hợp báo giấy và báo điện tử)　②Xóa bỏ việc thông báo tăng giảm qua FAX　③Tối ưu hóa nghiệp vụ tạo dữ liệu trừ tiền tài khoản ngân hàng
Ngoài phạm vi hệ thống hóa: Chức năng quản lý công nợ chưa thu

| | Hiện trạng (As-Is) | | Mong muốn (To-Be) |
| --- | --- | --- | --- |
| ①<br>Quản lý độc giả | ・Quản lý độc giả báo giấy và báo điện tử trên hai hệ thống riêng biệt<br>・Chi phí quản lý tăng cao, có nguy cơ không nhất quán thông tin | ➡ | ・Quản lý tập trung báo giấy và báo điện tử trên cùng một hệ thống<br>・Tối ưu hóa việc đăng ký, chỉnh sửa, xóa thông tin độc giả |
| ②<br>Thông báo tăng giảm | ・Thông tin tăng giảm số lượng độc giả được thông báo qua FAX<br>・Gánh nặng hành chính do thao tác thủ công<br>・Có nguy cơ bỏ sót liên lạc và nhập liệu sai | ➡ | ・Tạo phiếu thông báo tăng giảm dưới dạng điện tử<br>・Tự động gửi email thông báo đến Nhật Nông khi nhân viên JA nhấn nút<br>・Xóa bỏ hoàn toàn thao tác thủ công qua FAX |
| ③<br>Liên kết hệ thống ngoài | ・Không có liên kết với hệ thống OA<br>・Không có liên kết với hệ thống quản lý độc giả điện tử<br>・Xảy ra việc sao chép dữ liệu thủ công | ➡ | ・Liên kết hai chiều với hệ thống quản lý độc giả điện tử<br>・Xuất file CSV sang hệ thống OA (chuẩn bị cho liên kết tự động trong tương lai)<br>・Thông báo cảnh báo khi xảy ra lỗi liên kết |
| ④<br>Trừ tiền tài khoản | ・Tạo dữ liệu trừ tiền tài khoản ngân hàng thủ công | ➡ | ・Xuất dữ liệu trừ tiền tài khoản theo định dạng Zengin |
| ⑤<br>Công việc hành chính chung | ・Các thủ tục và công việc liên lạc được thực hiện thủ công<br>・Quản lý thời hạn chốt sổ phụ thuộc vào từng cá nhân | ➡ | ・Tự động hóa và tối ưu hóa các thủ tục<br>・Hiển thị thời hạn chốt sổ tự động trên hệ thống |

## ■ Vấn đề chính và phương hướng xử lý

| # | Vấn đề | Phương hướng xử lý |
| --- | --- | --- |
| 1 | Chưa xác định phương pháp thông báo và phản ánh thông tin sáp nhập cửa hàng báo | Thông báo qua màn hình tải file. Gửi email thông báo đến nhân viên JA, vận hành theo hướng nhân viên JA tự phản ánh vào master |
| 2 | Phương thức liên kết với hệ thống OA | Không liên kết tự động mà nhập tay vào hệ thống OA dựa trên điện tử. Tạo file CSV để liên kết với hệ thống OA trên đám mây (chuẩn bị cho liên kết tự động trong tương lai) |
| 3 | Quản lý đọc kết hợp (báo giấy + điện tử) của độc giả điện tử | Hiện tại xác định việc quản lý kết hợp phía JA là khó khăn. Sẽ xem xét từ phát triển giai đoạn 2 trở đi |
| 4 | Thống nhất định dạng dữ liệu trừ tiền tài khoản | Hỗ trợ theo định dạng Zengin. Đối với các định dạng khác, vận hành phía JA bằng cách cho phép xuất Excel |
| 5 | Xử lý tính toán theo ngày | Phương châm không lưu đơn giá theo ngày trong hệ thống |
| 6 | Nâng cao ý thức về thời hạn chốt sổ phía JA | Hiển thị thời hạn chốt sổ trên hệ thống (không liên kết với việc chốt sổ thực tế) |
| 7 | Nhập dữ liệu ban đầu khi đưa hệ thống mới vào vận hành | Bộ phận quản lý nghiệp vụ sẽ hỗ trợ JA nhập dữ liệu ban đầu.<br>Thông tin độc giả, thông tin cửa hàng báo, v.v. có thể nhập qua chức năng nhập của hệ thống (màn hình nhập dữ liệu Excel độc giả, màn hình nhập dữ liệu Excel cửa hàng báo) sẽ thực hiện qua hệ thống.<br>Thông tin master khó nhập qua hệ thống sẽ do bộ phận quản lý nghiệp vụ hoặc phòng lãnh đạo xử lý riêng từng trường hợp. |
