# 【Tờ báo Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý người đăng ký phiên bản đám mây_Bản thiết kế màn hình_Màn hình đăng ký giá đơn vị_v1.1


---

## Trang bìa

**Hệ thống quản lý người đăng ký phiên bản đám mây**

**Màn hình đăng ký giá đơn vị**

**Phiên bản 1.0**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No. | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm duyệt | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/16 | 1.0 | Nguyen Truong An | Tạo mới | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/03/31 | 2026-01-01 00:00:00 | Nguyen Truong An | Xử lý ý kiến<br>※ Vị trí sửa đổi：<br>1. Mục lục No.6<br>2. Sheet "Định nghĩa mục màn hình": Ngày bắt đầu áp dụng, ngày kết thúc áp dụng<br>3. Sheet "Định nghĩa chức năng": Bước 1.1 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Mục lục | 2026/03/16 | Nguyen Truong An |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
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
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Chuyển đổi màn hình | 2026/03/16 | Nguyen Truong An |


ACSMS-SCR-003_Màn hình đăng ký giá đơn vị_Chuyển đổi màn hình

---

## Hình ảnh màn hình

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Hình ảnh màn hình | 2026/03/16 | Nguyen Truong An |

| ID màn hình |  | Tổng quan |  |
| Tên màn hình | ACSMS-SCR-003 | | |

Tên màn hình
Màn hình đăng ký giá đơn vị
ACSMS-SCR-003_Màn hình đăng ký giá đơn vị_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong tệp Excel.

---

## Định nghĩa mục màn hình

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Định nghĩa mục màn hình | 2026/03/16 | Nguyen Truong An |

| ID màn hình | ACSMS-SCR-003 | Tổng quan | Màn hình đăng ký giá đơn vị |
| Tên màn hình | Màn hình đăng ký giá đơn vị | | |

### Biểu mẫu đăng ký giá đơn vị

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu đầu vào | Số chữ số tối đa | Căn chỉnh | Định dạng | Tên bảng (Tên logic) | Tên bảng (Tên vật lý) | Tên cột (Tên logic) | Tên cột (Tên vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Loại giá đơn vị | tankaType | Nút radio | Nhập | o | Chuỗi | 1 |  |  | Bảng giá chính | m_tanka | Loại giá đơn vị | tanka_type | Luôn hiển thị | 1 (Phí đăng ký tờ báo) | Giá trị: 1=Phí đăng ký tờ báo, 2=Phí giao hàng. Bắt buộc lựa chọn |
| 2.0 | Mã giá đơn vị | tankaCode | Hộp văn bản | Nhập | o | Chuỗi | 10 | Căn trái |  | Bảng giá chính | m_tanka | Mã giá đơn vị | tanka_code | Luôn hiển thị |  | Bắt buộc nhập. Nếu tồn tại sẽ cập nhật. Không thể thay đổi khi chỉnh sửa. Mỗi JA sở hữu giá đơn vị. Không thể nhập vượt quá số chữ số tối đa. |
| 3.0 | Tên giá đơn vị | tankaName | Hộp văn bản | Nhập | o | Chuỗi | 100 | Căn trái |  | Bảng giá chính | m_tanka | Tên giá đơn vị | tanka_name | Luôn hiển thị |  | Bắt buộc nhập. Ký tự bán và toàn chiều. Không thể nhập vượt quá số chữ số tối đa. |
| 4.0 | Suất thuế (%) | taxRate | Hộp văn bản | Nhập |  | Số | 5.0 | Căn phải | x.xx% | Bảng giá chính | m_tanka | Suất thuế | tax_rate | Luôn hiển thị | 0.0 | Chỉ ký tự số bán. Đơn vị %. Phạm vi nhập có thể: 0～100. Định dạng hiển thị: 2 chữ số thập phân. Không thể nhập vượt quá số chữ số tối đa. |
| 5.0 | Giá (Tính thuế) | kingakuZeikomi | Hộp văn bản | Nhập |  | Số | 10 | Căn phải | ¥x,xxx | Bảng giá chính | m_tanka | Giá (Tính thuế) | kingaku_zeikomi | Luôn hiển thị | ¥ 0 | Chỉ ký tự số bán. Không thể nhập số âm (≧0). Chỉ cần nhập giá tính thuế hoặc chỉ cần nhập giá không tính thuế. Không tính toán tự động giá, tất cả đều nhập thủ công. Định dạng hiển thị: Hỗ trợ phân cách 3 chữ số (Ví dụ: ¥2,426) |
| 6.0 | Giá (Không tính thuế) | kingakuZeinuki | Hộp văn bản | Nhập |  | Số | 10 | Căn phải | ¥x,xxx | Bảng giá chính | m_tanka | Giá (Không tính thuế) | kingaku_zeinuki | Luôn hiển thị | ¥ 0 | Chỉ ký tự số bán. Không thể nhập số âm (≧0). Chỉ cần nhập giá tính thuế hoặc chỉ cần nhập giá không tính thuế. Không tính toán tự động giá, tất cả đều nhập thủ công. Định dạng hiển thị: Hỗ trợ phân cách 3 chữ số (Ví dụ: ¥2,426) |
| 7.0 | Ngày bắt đầu áp dụng | tekiyoStartDate | Lịch | Nhập |  | Ngày | 10 | Căn trái | YYYY-MM-DD | Bảng giá chính | m_tanka | Ngày bắt đầu áp dụng | tekiyo_start_date | Luôn hiển thị |  | ①Định dạng ngày: YYYY-MM-DD ②Nếu để trống sẽ tự động đặt ngày hiện tại khi đăng ký (áp dụng ngay lập tức) ③Khi đăng ký mới không thể chọn ngày quá khứ ④Khi ở chế độ chỉnh sửa, nếu ngày bắt đầu áp dụng là ngày quá khứ sẽ hiển thị không thể thay đổi (chỉ đọc) ⑤Nếu ngày bắt đầu áp dụng là ngày trong tương lai có thể thay đổi thành ngày từ hôm nay trở đi |
| 8.0 | Ngày kết thúc áp dụng | tekiyoEndDate | Lịch | Nhập |  | Ngày | 10 | Căn trái | YYYY-MM-DD | Bảng giá chính | m_tanka | Ngày kết thúc áp dụng | tekiyo_end_date | Luôn hiển thị |  | ①Định dạng ngày: YYYY-MM-DD ②Nếu để trống sẽ không giới hạn ③Chỉ có thể chọn ngày từ ngày bắt đầu áp dụng trở đi ④Khi ở chế độ chỉnh sửa, nếu ngày kết thúc áp dụng là ngày quá khứ sẽ hiển thị không thể thay đổi (đã kết thúc) ⑤Nếu ngày kết thúc áp dụng là ngày trong tương lai hoặc để trống (không giới hạn) có thể thay đổi |
| 9.0 | Đăng ký | btnCreate | Nút | Nhập |  | — |  |  |  | — | — | — | — | Luôn hiển thị |  | Thực hiện kiểm tra nhập liệu, sau đó thực hiện xử lý đăng ký/cập nhật |
| 10.0 | Quay lại màn hình trước | btnBack | Nút | Nhập |  | — |  |  |  | — | — | — | — | Luôn hiển thị |  | Chuyển đổi sang màn hình tìm kiếm chi tiết bảng giá chính |

---

## Định nghĩa chức năng

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Định nghĩa chức năng | 2026/03/16 | Nguyen Truong An |

| ID màn hình | ACSMS-SCR-003 | Tổng quan | Màn hình đăng ký giá đơn vị |
| Tên màn hình | Màn hình đăng ký giá đơn vị | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị ban đầu màn hình đăng ký mới | — | Hiển thị màn hình ban đầu | Hiển thị biểu mẫu ở trạng thái mặc định (Giá trị mặc định: Loại giá đơn vị = "Phí đăng ký tờ báo", suất thuế = "0%", giá (tính thuế) = "¥ 0", giá (không tính thuế) = "¥ 0") |
| 2.0 | Màn hình cập nhật (Chế độ chỉnh sửa) | — | Hiển thị màn hình (chỉ định theo ID) | Lấy dữ liệu giá đơn vị theo ID, phản ánh vào biểu mẫu. Mã giá đơn vị không thể thay đổi |
| 3.0 | Chọn loại giá đơn vị | Loại giá đơn vị | Chọn radio | Chọn giá trị loại giá đơn vị (Phí đăng ký tờ báo hoặc Phí giao hàng) |
| 4.0 | Đăng ký/Cập nhật | Nút "Đăng ký" | Nhấp | Kiểm tra nhập liệu → Thực hiện xử lý đăng ký hoặc cập nhật → Hiển thị tin nhắn thành công → Chuyển đổi sang màn hình tìm kiếm |
| 5.0 | Quay lại | Nút "Quay lại màn hình trước" | Nhấp | Quay lại màn hình tìm kiếm chi tiết bảng giá chính |

### B. Chi tiết chức năng

#### 1. Hiển thị ban đầu màn hình đăng ký mới

- **1.1** Nhấp nút "Đăng ký mới" từ màn hình tìm kiếm sẽ chuyển sang màn hình đăng ký giá đơn vị (Tài khoản nông nghiệp không thể vận hành (chỉ sử dụng bởi phía JA))
- **1.2** Biểu mẫu được hiển thị với các giá trị mặc định sau
  - ・Loại giá đơn vị: Nút radio Phí đăng ký tờ báo được chọn
  - ・Suất thuế (%): 0%
  - ・Giá (tính thuế): ¥0
  - ・Giá (không tính thuế): ¥0
  - ・Các mục khác: Để trống

#### 2. Màn hình cập nhật (Chế độ chỉnh sửa)

- **2.1** Nhấp vào dòng bất kỳ trong danh sách kết quả tìm kiếm sẽ chuyển sang màn hình đăng ký giá đơn vị (Chế độ chỉnh sửa)
- **2.2** Hệ thống lấy dữ liệu giá đơn vị theo ID.
  - ・Nếu lấy dữ liệu thành công → Phản ánh dữ liệu vào biểu mẫu
  - ・Nếu lấy dữ liệu thất bại → Hiển thị ACSMS-MSG-003-005
  - ・Nếu tài khoản không có quyền → Hiển thị ACSMS-MSG-003-006
- **2.3** Mục mã giá đơn vị không thể thay đổi (disabled)

#### 3. Chọn loại giá đơn vị

- **3.1** Người dùng chọn một trong hai loại sau
  - ・1 = Phí đăng ký tờ báo
  - ・2 = Phí giao hàng

#### 4. Đăng ký/Cập nhật

- **4.1** Nhấp nút "Đăng ký" sẽ thực hiện kiểm tra nhập liệu
  - ・Mã giá đơn vị: Bắt buộc, tối đa 10 chữ số. Nếu không nhập sẽ hiển thị tin nhắn ACSMS-MSG-003-003.
  - ・Loại giá đơn vị: Bắt buộc, 1 hoặc 2
  - ・Tên giá đơn vị: Bắt buộc, tối đa 100 chữ số. Nếu không nhập sẽ hiển thị tin nhắn ACSMS-MSG-003-003.
  - ・Suất thuế: 0～100, 2 chữ số thập phân
  - ・Giá (tính thuế): ≥ 0, số
  - ・Giá (không tính thuế): ≥ 0, số
  - ・Ngày bắt đầu áp dụng: Định dạng ngày hợp lệ
  - ・Ngày kết thúc áp dụng: Định dạng ngày hợp lệ, chỉ có thể chọn từ ngày bắt đầu trở đi
- **4.2** Nếu kiểm tra nhập liệu không hợp lệ → Hiển thị tin nhắn lỗi tương ứng dưới mục tương ứng
- **4.3** Nếu kiểm tra nhập liệu hợp lệ, thực hiện xử lý đăng ký mới hoặc cập nhật
- **4.4** Kết quả xử lý:
  - ・Thành công (Đăng ký mới) → Hiển thị ACSMS-MSG-003-001 và chuyển sang màn hình tìm kiếm
  - ・Thành công (Cập nhật) → Hiển thị ACSMS-MSG-003-002 và chuyển sang màn hình tìm kiếm
  - ・Mã giá đơn vị trùng lặp → Hiển thị ACSMS-MSG-003-004
  - ・Không tìm thấy thông tin mã giá đơn vị → Hiển thị ACSMS-MSG-003-005
  - ・Nếu tài khoản không có quyền → Hiển thị ACSMS-MSG-003-006
  - ・Lỗi hệ thống → Hiển thị ACSMS-MSG-003-007

#### 5. Quay lại màn hình trước

- **5.1** Nhấp nút "Quay lại màn hình trước" sẽ chuyển sang màn hình tìm kiếm chi tiết bảng giá chính
- **5.2** Dữ liệu nhập vào biểu mẫu sẽ không được lưu.

---

## Thông tin tin nhắn

| Tên hệ thống / ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đăng ký phiên bản đám mây | Bản thiết kế màn hình | Thông tin tin nhắn | 2026/03/16 | Nguyen Truong An |

| ID màn hình | ACSMS-SCR-003 | Tổng quan | Màn hình đăng ký giá đơn vị |
| Tên màn hình | Màn hình đăng ký giá đơn vị | | |

| # | Mã tin nhắn | Nội dung tin nhắn |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-003-001 | Đã đăng ký. |
| 2.0 | ACSMS-MSG-003-002 | Đã cập nhật. |
| 3.0 | ACSMS-MSG-003-003 | Đây là mục bắt buộc. |
| 4.0 | ACSMS-MSG-003-004 | Mã giá đơn vị "{code}" đã được đăng ký. |
| 5.0 | ACSMS-MSG-003-005 | Không tìm thấy giá đơn vị #{id}. |
| 6.0 | ACSMS-MSG-003-006 | Không có quyền truy cập. |
| 7.0 | ACSMS-MSG-003-007 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau. |
