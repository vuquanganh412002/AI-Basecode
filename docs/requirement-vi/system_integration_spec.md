# Đặc tả liên kết hệ thống

## ■ Tổng quan hệ thống liên kết

| # | Hệ thống liên kết | Chiều liên kết | Phương thức / Tổng quan liên kết | Giai đoạn xử lý |
| --- | --- | --- | --- | --- |
| 1 | Hệ thống OA<br>（Hệ thống cốt lõi hiện tại） | Hệ thống này → OA | Liên kết với hệ thống OA có 2 phương án: xuất điện tử và nhập tay, hoặc liên kết tự động trong hệ thống. Lần này áp dụng phương án tạo điện tử và nhập tay. Tuy nhiên, để duy trì khả năng chuyển đổi sang liên kết tự động trong tương lai, sẽ thực hiện cả hai: tạo điện tử thông báo tăng giảm (PDF) + xuất file CSV lên đám mây. | Lần này: Phương án điện tử<br>Tương lai: Phương án liên kết tự động |
| 2 | Hệ thống quản lý độc giả điện tử | Hai chiều (⇔) | Hệ thống này ← Điện tử: Nhận và phê duyệt thông tin độc giả đăng ký qua web<br>Hệ thống này → Điện tử: Phản ánh thông tin độc giả đã phê duyệt, liên kết đăng ký trừ tài khoản | Xử lý lần này |
| 3 | Hệ thống trừ tài khoản ngân hàng<br>（Định dạng Zengin） | Hệ thống này → Ngoài | Xuất dữ liệu trừ tài khoản dưới dạng văn bản (định dạng Zengin) hoặc file Excel | Xử lý lần này |

## ■ ① Liên kết hệ thống OA（Áp dụng phương án điện tử）

| # | Hạng mục | Phân loại | Nội dung | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | Chiều liên kết | Hệ thống này → OA | Nhân viên JA nhấn nút để tạo điện tử thông báo tăng giảm trên đám mây và gửi email thông báo đến phụ trách tăng giảm Nhật Nông | Xóa bỏ thao tác thủ công qua FAX |
| 2 | Dữ liệu xuất | Điện tử thông báo tăng giảm (PDF) | ・Số lượng bản xử lý theo cửa hàng báo / theo chi nhánh JA (thông tin tăng giảm)<br>・Số lượng độc giả điện tử<br>・Tăng số dựa trên ngày bắt đầu đặt báo / Giảm số dựa trên ngày kết thúc đặt báo | Phụ trách tăng giảm Nhật Nông xem |
| 3 | Dữ liệu xuất | File CSV liên kết OA | Tạo và lưu file CSV trên đám mây để chuẩn bị cho liên kết tự động hệ thống OA trong tương lai | Giai đoạn hiện tại chưa liên kết tự động<br>※Có thể triển khai sau khi vận hành,<br>mức độ ưu tiên thấp |
| 4 | Thời điểm liên kết | Tùy ý (thủ công) | Nhân viên JA thực hiện bằng cách nhấn nút tại thời điểm tùy ý<br>Thời hạn chốt sổ hàng tháng được hiển thị trên hệ thống (không liên kết với việc chốt sổ thực tế) | |
| 5 | Thông báo | Thông báo email | Gửi email thông báo đến phụ trách tăng giảm Nhật Nông đồng thời với việc tạo điện tử thông báo tăng giảm | |
| 6 | Xử lý tương lai | Liên kết tự động hệ thống OA | Liên kết tự động thông tin tăng giảm số lượng độc giả báo giấy với hệ thống OA<br>Phản ánh thông tin sáp nhập cửa hàng báo vào thông tin cửa hàng báo trong hệ thống này | Xem xét từ phát triển giai đoạn 2 trở đi |

## ■ ② Liên kết hệ thống quản lý độc giả điện tử

| # | Hạng mục | Phân loại | Nội dung | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | Chiều liên kết (Nhận) | Điện tử → Hệ thống này | Nhận thông tin người dùng đã đăng ký qua web từ hệ thống quản lý độc giả điện tử vào hệ thống này<br>Nhân viên JA thực hiện đăng ký mới hoặc phê duyệt trên hệ thống này (đăng ký mới độc giả điện tử + phê duyệt đăng ký web) | |
| 2 | Chiều liên kết (Gửi) | Hệ thống này → Điện tử | Phản ánh thông tin độc giả đã được nhân viên JA phê duyệt vào hệ thống quản lý độc giả điện tử<br>Gửi kết quả phê duyệt của người dùng đã đăng ký bằng trừ tài khoản sang phía điện tử | |
| 3 | Đối tượng độc giả | Độc giả điện tử | Đối tượng: Độc giả có chọn JA trong hệ thống quản lý độc giả điện tử | |
| 4 | Phạm vi dữ liệu | Chỉ JA của mình | Hệ thống phía JA chỉ có thể tham chiếu và thao tác dữ liệu của JA mình<br>Không thể tham chiếu dữ liệu JA khác | |
| 5 | Xử lý lỗi | Thông báo cảnh báo | Khi xảy ra lỗi liên kết dữ liệu với hệ thống quản lý độc giả điện tử, gửi thông báo cảnh báo đến phụ trách | |

## ■ ③ Liên kết hệ thống trừ tài khoản ngân hàng

| # | Hạng mục | Phân loại | Nội dung | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | Chiều liên kết | Hệ thống này → Ngoài | Xuất dữ liệu trừ tài khoản để sử dụng cho việc trừ tiền đặt báo qua tài khoản ngân hàng | |
| 2 | Định dạng xuất | Định dạng Zengin (tiêu chuẩn) | Xuất dữ liệu trừ tài khoản theo định dạng tiêu chuẩn Zengin (văn bản hoặc Excel) | |
| 3 | Điều chỉnh số tiền | Thay đổi bằng nhập tay | Phương châm không lưu đơn giá theo ngày trong hệ thống | |
| 4 | Quản lý nhật ký | Ghi lại lịch sử xuất | Lưu lại nhật ký dữ liệu trừ tài khoản đã xuất để có thể tham chiếu sau | Xử lý qua màn hình xem nhật ký |
