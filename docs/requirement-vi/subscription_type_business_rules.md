# Quy tắc nghiệp vụ — Loại đặt báo và Phân loại xử lý

## 1. Loại báo

Hệ thống này xử lý 3 loại báo: báo giấy, báo điện tử và đọc kết hợp (báo giấy + báo điện tử).

## 2. Phân loại xử lý

| Phân loại xử lý | Tổng quan / Cơ chế | Bổ sung / Lưu ý |
| --- | --- | --- |
| JA xử lý | Là độc giả mà "JA đang thu phí đặt báo". Hệ thống này nhằm mục đích JA quản lý phân loại này. JA là chủ thể hợp đồng. JA thu phí đặt báo và Nhật Nông lập hóa đơn giá bán buôn cho JA theo số lượng (từ hệ thống OA). Chênh lệch giữa phí đặt báo và giá bán buôn là hoa hồng của JA. JA đặt hàng báo từ Nhật Nông (thông báo tăng giảm = đơn đặt hàng), Nhật Nông bán buôn cho cửa hàng báo dựa trên đơn đặt hàng đó. | Báo giấy về cơ bản là JA xử lý. Tuy nhiên "khách hàng ngoài phạm vi xử lý của JA (khách hàng không có tài khoản JA, trường hợp JA không thu tiền)" không thuộc JA xử lý (kể cả giao hàng trong địa bàn). Báo điện tử dù thanh toán bằng thẻ tín dụng, nếu khi đăng ký có chọn JA thì vẫn là JA xử lý. |
| Nhật Nông xử lý | Là độc giả mà "Nhật Nông (báo Nông nghiệp Nhật Bản) đang thu phí đặt báo". Hệ thống này không xem xét.<br>Nhật Nông trực tiếp là đầu mối, giao dịch không qua JA. Không thanh toán hoa hồng cho JA. | Trong thanh toán thẻ tín dụng điện tử có 2 mẫu: Nhật Nông thu - thực tích JA và Nhật Nông thu - thực tích Nhật Nông. |
| Cửa hàng xử lý | Là độc giả mà "cửa hàng báo đang thu phí đặt báo". Hệ thống này không xem xét.<br>Cửa hàng báo là chủ thể hợp đồng. Chỉ có báo giấy. | Không tồn tại với báo điện tử và đọc kết hợp. |

## 3. Đối ứng phân loại xử lý

・Loại báo × Phân loại xử lý

| Loại báo | JA xử lý | Nhật Nông xử lý | Cửa hàng xử lý |
| --- | --- | --- | --- |
| Báo giấy | 〇<br>（JA thu tiền, trừ tài khoản） | 〇<br>（Trừ tài khoản） | 〇<br>（Cửa hàng thu tiền, trừ tài khoản, thanh toán thẻ tín dụng） |
| Báo điện tử | 〇<br>（JA thu tiền, trừ tài khoản, hoặc khi đăng ký thẻ tín dụng có chọn JA） | 〇<br>（Chỉ thẻ tín dụng, khi đăng ký không chọn JA） | × |
| Đọc kết hợp (báo giấy + điện tử) | 〇<br>（Chỉ thẻ tín dụng, khi đăng ký có chọn JA） | 〇<br>（Chỉ thẻ tín dụng, khi đăng ký không chọn JA） | × |

Báo giấy… Phân loại xử lý được xác định dựa trên ai đang thu tiền

※Nếu lấy phương thức thanh toán làm trục thì bảng sẽ như sau.

・Phương thức thanh toán × Phân loại xử lý

| Phương thức thanh toán | JA xử lý | Nhật Nông xử lý | Cửa hàng xử lý |
| --- | --- | --- | --- |
| Trừ tài khoản JA | 〇<br>（Báo giấy・Báo điện tử） | × | 〇<br>（Báo giấy） |
| Thanh toán thẻ tín dụng | 〇<br>（Báo điện tử・Đọc kết hợp） | 〇<br>（Báo điện tử・Đọc kết hợp） | 〇<br>（Báo giấy） |
| Khác<br>（Thanh toán hóa đơn, v.v.） | 〇<br>（Báo giấy・Báo điện tử） | 〇<br>（Báo giấy・Báo điện tử） | 〇<br>（Báo giấy） |

Hệ thống này xem xét cột "JA xử lý".

Hàng "Thanh toán thẻ tín dụng" không thể chỉnh sửa từ phía JA.

## 4. Báo điện tử　Mẫu thanh toán và đối tượng liên kết phiên bản đám mây

Báo điện tử có 3 mẫu theo 2 trục: "ai thu tiền (Nhật Nông hay JA)" và "thực tích của ai (Nhật Nông hay JA)". Thực tích liên quan đến việc thanh toán hoa hồng nên cần chú ý đặc biệt.

| Mẫu | Phương thức thanh toán / Thu tiền | Thực tích | Liên kết phiên bản đám mây |
| --- | --- | --- | --- |
| ① | Trừ tài khoản　／　JA thu | Thực tích JA | 〇 |
| ② | Thẻ tín dụng　／　Nhật Nông thu | Thực tích JA | 〇 |
| ③ | Thẻ tín dụng　／　Nhật Nông thu | Thực tích Nhật Nông | × |

※Thực tích thuộc về bên nào phụ thuộc vào trạng thái chọn JA khi đăng ký. Bảng dễ hiểu hơn như sau.

・Mẫu thanh toán báo điện tử và đối tượng liên kết phiên bản đám mây

| Mẫu | Phương thức thanh toán | Chọn JA khi đăng ký | Liên kết phiên bản đám mây |
| --- | --- | --- | --- |
| ① | Trừ tài khoản | Có | 〇 |
| ② | Thẻ tín dụng | Có | 〇 |
| ③ | Thẻ tín dụng | Không | × |
| ④ | Độc giả miễn phí | Có | 〇 |

## 【Xử lý đơn giá chiến dịch】

・Hệ thống quản lý độc giả điện tử hiện tại chỉ hỗ trợ một đơn giá duy nhất. Hệ thống điện tử không có khái niệm giá (chỉ có có phí hoặc miễn phí).

・Hiện tại, đơn giá chiến dịch được xử lý bằng cách nhập tay vào hệ thống OA.

・Phiên bản đám mây cho phép đăng ký đơn giá chiến dịch, nhưng liên kết tự động với hệ thống điện tử chỉ áp dụng cho đơn giá thông thường.

・Đối với độc giả điện tử có đơn giá chiến dịch, bộ phận kế hoạch tổng hợp sẽ xử lý theo quy trình vận hành.

## 5. Chi tiết đọc kết hợp

| Hạng mục | Nội dung |
| --- | --- |
| Ràng buộc | Vì là dịch vụ chỉ dành cho thanh toán thẻ tín dụng, JA không thể đăng ký (JA chỉ có thể đăng ký báo điện tử trừ tài khoản).<br>Ngay cả báo điện tử đơn lẻ, nếu thanh toán thẻ tín dụng thì JA không thể đăng ký.<br>Trường hợp muốn thanh toán thẻ tín dụng, độc giả phải tự đăng ký trực tiếp từ trang chủ chính thức. |
| Đơn giá | Hiện tại mỗi JA có 1 đơn giá. Có khả năng tăng lên trong tương lai. |
| Khả năng thay đổi trong tương lai | Có thể cho phép đăng ký đọc kết hợp bằng trừ tài khoản trong tương lai (hiện tại chỉ thẻ tín dụng). |
| Thủ tục đăng ký<br>（Trường hợp đã có báo giấy JA xử lý） | ※Thông tin tham khảo, hệ thống này không cần kiểm soát đặc biệt<br>①Hủy báo giấy (JA xử lý) hiện tại một lần<br>②Độc giả tự đăng ký trực tiếp từ trang chủ chính thức (thanh toán thẻ tín dụng) |

## 6. Ảnh hưởng và kiểm soát đối với hệ thống phiên bản đám mây

・Cần kiểm soát để JA không thể đăng ký, chỉnh sửa, xóa thanh toán thẻ tín dụng báo điện tử và đọc kết hợp.

・Đối tượng liên kết hệ thống điện tử là 3 loại: Mẫu ①trừ tài khoản / có chọn JA, Mẫu ②thẻ tín dụng / có chọn JA, Mẫu ④độc giả miễn phí / có chọn JA.

・Liên kết tự động với hệ thống điện tử chỉ áp dụng cho đơn giá thông thường (đơn giá chiến dịch không thuộc đối tượng liên kết).

・Xuất dữ liệu trừ tài khoản cũng bao gồm cả đơn giá chiến dịch.
