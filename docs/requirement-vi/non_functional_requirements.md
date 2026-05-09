# Yêu cầu phi chức năng

| Danh mục | Hạng mục | Nội dung yêu cầu | Bổ sung / Căn cứ |
| --- | --- | --- | --- |
| Hiệu năng / Tính sẵn sàng | Tốc độ phản hồi | Hệ thống phải hoạt động bình thường ngay cả trên đường truyền tốc độ thấp (dưới 1Mbps) | Xem xét môi trường đường truyền tốc độ thấp ở các vùng nông thôn JA |
| Hiệu năng / Tính sẵn sàng | Số người dùng đồng thời | Hệ thống phải hoạt động ổn định khi 100 nhân viên JA sử dụng đồng thời | |
| Hiệu năng / Tính sẵn sàng | Khả năng mở rộng | Có thể nâng cấp hoặc hạ cấp cấu hình máy chủ theo sự tăng giảm của số lượng người dùng | Tận dụng tính năng Auto Scaling của AWS |
| Hiệu năng / Tính sẵn sàng | Tính sẵn sàng | Mục tiêu tỷ lệ hoạt động hàng năm đạt 99% trở lên (tổng thời gian downtime trong năm: dưới 87,6 giờ)<br>Phải có cơ chế khắc phục ngay lập tức khi xảy ra sự cố | |
| Bảo mật | Kiểm soát truy cập | Có thể thiết lập quyền truy cập theo vai trò của từng người dùng (Nhật Nông / Hội trung ương / JA bản điếm / Chi nhánh JA) | Tham chiếu tài liệu khái niệm tài khoản |
| Bảo mật | Xác thực | Bắt buộc xác thực bằng ID / mật khẩu, hỗ trợ xác thực đa yếu tố (MFA) khi cần thiết | |
| Bảo mật | Bảo vệ dữ liệu | Thông tin cá nhân như thông tin độc giả, thông tin trừ tiền tài khoản phải được mã hóa khi lưu trữ và truyền tải<br>Thực hiện các biện pháp phòng ngừa truy cập trái phép và rò rỉ thông tin | Tuân thủ Luật bảo vệ thông tin cá nhân |
| Bảo mật | Nhật ký kiểm tra | Ghi lại lịch sử thao tác của người dùng và có thể tham chiếu khi cần | Xử lý qua màn hình xem nhật ký |
| Bảo mật | Tuân thủ pháp luật | Thiết kế và vận hành tuân thủ Luật bảo vệ thông tin cá nhân và các quy định liên quan | |
| Tính mở rộng / Bảo trì | Tính mở rộng | Thiết kế linh hoạt để có thể ứng phó với sự gia tăng số lượng người dùng và bổ sung chức năng trong tương lai | Thiết kế hướng đến phát triển giai đoạn 2 (quản lý đọc kết hợp, v.v.) |
| Tính mở rộng / Bảo trì | Sao lưu | Thực hiện sao lưu dữ liệu hàng ngày, đảm bảo có thể khôi phục dữ liệu kể cả trong trường hợp thảm họa | |
| Tính mở rộng / Bảo trì | Khả năng bảo trì | Xây dựng hệ thống quản lý phiên bản và sao lưu để ứng phó nhanh khi xảy ra sự cố hoặc cập nhật<br>Lập tài liệu hướng dẫn vận hành và bảo trì hệ thống | Bao gồm tài liệu bảo trì trong kết quả bàn giao |
| Tính dễ sử dụng | Tính thao tác | Thiết kế màn hình trực quan, dễ hiểu<br>Có thể sử dụng ngay cả khi kỹ năng số không cao | |
| Tính dễ sử dụng | Chức năng trợ giúp | Có thể tham chiếu tài liệu hướng dẫn thao tác và FAQ từ trong màn hình | |
| Liên kết hệ thống | Liên kết hệ thống OA | Tạo file CSV để liên kết với hệ thống OA trên đám mây<br>Thiết kế chuẩn bị cho liên kết tự động với hệ thống OA trong tương lai | Giai đoạn hiện tại áp dụng phương án điện tử |
| Liên kết hệ thống | Liên kết hệ thống quản lý độc giả điện tử | Có thể liên kết dữ liệu hai chiều với hệ thống quản lý độc giả điện tử<br>Thông báo cảnh báo khi xảy ra lỗi liên kết dữ liệu | |
| Liên kết hệ thống | Xuất dữ liệu trừ tiền tài khoản | Có thể xuất dữ liệu trừ tiền tài khoản dưới dạng văn bản (định dạng Zengin) và file Excel | |
| Liên kết hệ thống | Xuất biểu mẫu | Biểu mẫu có thể xuất dưới dạng PDF và in ra máy in | |
