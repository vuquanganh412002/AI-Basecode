# 【Nihon Nogyo Shimbun】VTI Japan_Hệ thống quản lý người đọc bản Cloud_Tài liệu thiết kế màn hình_Màn hình tìm kiếm chi tiết người đọc_v1.1


---

## Trang bìa

**Hệ thống quản lý người đọc bản Cloud**

**Màn hình tìm kiếm chi tiết người đọc**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 1 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm tra | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/03/31 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/04/13 | 1.1 | Nguyen Duyen Manh | Phản hồi các điểm chỉ ra<br>※Vị trí chỉnh sửa:<br>1. Sheet "Chuyển màn hình": Cập nhật UI<br>2. Sheet "Định nghĩa các mục trên màn hình": No.2, 7, 8, 9, 15, 19, 21<br>3. Sheet "Định nghĩa chức năng": Bước 2.2, 8.6, 10<br>4. Sheet "Hiển thị thông báo": Thông báo No.12 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/03/31 | Nguyen Duyen Manh |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| No | Tên sheet | Mô tả |
| 1 | Trang bìa | Trang bìa tài liệu |
| 2 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3 | Mục lục | Danh sách các sheet |
| 4 | Chuyển màn hình | Luồng chuyển màn hình |
| 5 | Hình ảnh màn hình | Giao diện màn hình |
| 6 | Định nghĩa các mục trên màn hình | Định nghĩa các mục trên màn hình |
| 7 | Định nghĩa chức năng | Định nghĩa chức năng |
| 8 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình | 2026/03/31 | Nguyen Duyen Manh |


ACSMS-SCR-014_Màn hình tìm kiếm chi tiết người đọc_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-014 | Tổng quan | Màn hình tìm kiếm chi tiết người đọc |
| Tên màn hình | Màn hình tìm kiếm chi tiết người đọc | | |

ACSMS-SCR-014_Màn hình tìm kiếm chi tiết người đọc_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa các mục trên màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục trên màn hình | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-014 | Tổng quan | Màn hình tìm kiếm chi tiết người đọc |
| Tên màn hình | Màn hình tìm kiếm chi tiết người đọc | | |

### Vùng nhập điều kiện tìm kiếm

| Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu | Độ dài tối thiểu | Độ dài tối đa | Căn chữ | Định dạng | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chi nhánh quản lý | kanri_shiten_id | Dropdown | Nhập | - | BIGINT | - | 15 | Trái | - | Luôn hiển thị | - |  |
| Chi nhánh | shiten_id | Dropdown | Nhập | - | BIGINT | - | 10 | Trái | - | Luôn hiển thị | - |  |
| Mã thành viên hợp tác xã | kumiaiin_code | Textbox | Nhập | - | BIGINT | - | 20 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Mã chi nhánh ngân hàng | bank_branch_code | Textbox | Nhập | - | VARCHAR | - | 100 | Phải | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Tên chi nhánh ngân hàng | bank_branch_name | Textbox | Nhập | - | VARCHAR | - | 100 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Họ tên | full_name | Textbox | Nhập | - | VARCHAR | - | 100 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần. Tổ hợp shimei_sei và shimei_mei |
| Họ tên (Kana) | full_name_kana | Textbox | Nhập | - | VARCHAR | - | 100 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần. Tổ hợp shimei_kana_sei và shimei_kana_mei |
| Liên lạc 1 | renrakusaki_1 | Textbox | Nhập | - | VARCHAR | - | 15 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Địa chỉ giao báo | haitatsu | Textbox | Nhập | - | VARCHAR | - | 50 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần. Tổ hợp tỉnh/thành + quận/huyện + số nhà + tên chung cư/căn hộ của địa chỉ giao báo |
| Đại lý giao báo | hanbaiten_id | Dropdown | Nhập | - | BIGINT | - | - | Trái | - | Luôn hiển thị | - | Hiển thị bằng hanbaiten_name, khóa là hanbaiten_id |
| Email | email | Textbox | Nhập | - | VARCHAR | - | 100 | Trái | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Tháng bắt đầu thanh toán | seikyu_kaishi_month | Textbox | Nhập | - | VARCHAR | - | 6 | Phải | - | Luôn hiển thị | - | Tìm kiếm khớp một phần |
| Ngày bắt đầu đọc báo | shoki_dokusya_kaishi_date | Lịch | Nhập | - | Date | - | - | Phải | - | Luôn hiển thị | - |  |
| Ngày ngừng đọc báo | dokusya_chushi_date | Lịch | Nhập | - | Date | - | - | Phải | - | Luôn hiển thị | - |  |
| Loại đọc báo | dokusya_shubetsu | Radio button | Nhập | - | INTEGER | - | - |  | - | Luôn hiển thị | - | Loại đọc báo (1: Bản giấy, 2: Bản điện tử, 3: Đọc song song) |
| Ngày áp dụng | joho_henko_tekiyo_date | Lịch | Nhập | - | Date | - | - | Phải | - | Luôn hiển thị | - | Nếu ngày áp dụng để trống thì lấy dữ liệu người đọc có cờ dữ liệu mới nhất = 1. Nếu ngày áp dụng được nhập thì lấy dữ liệu người đọc có ngày áp dụng thay đổi <= ngày áp dụng điều kiện màn hình. Lấy dữ liệu người đọc có ngày áp dụng thay đổi trước hoặc bằng ngày áp dụng điều kiện màn hình |
| Phương thức thanh toán | shiharai_hoho | Radio button | Nhập | - | INTEGER | - | - | Trái | - | Luôn hiển thị | - | Phương thức thanh toán (1: Trích tài khoản, 2: Thu tiền mặt, 3: Thu chuyển khoản, 4: Cơ sở JA, 5: Khấu trừ lương, 6: Thẻ tín dụng, 9: Khác) |
| Loại thủ tục | tetsuzuki_shurui | Radio button | Nhập | - | INTEGER | - | - | Trái | - | Luôn hiển thị | - | Loại thủ tục (0: Hủy hợp đồng, 1: Đăng ký mới) |
| Trạng thái phê duyệt bản điện tử | denshi_shonin_status | Radio button | Nhập | - | INTEGER | - | - | Trái | - | Luôn hiển thị | - | NULL = Ngoài đăng ký Web (đăng ký trực tiếp tại JA v.v.)<br>　　0　　= Chưa phê duyệt (chờ phê duyệt)<br>　　1　　= Đã phê duyệt<br>　　2　　= Từ chối (bị bác) |

### Nút thao tác

| Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu | Độ dài tối thiểu | Độ dài tối đa | Căn chữ | Định dạng | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tìm kiếm | button_search | Button | Nhập | - | - | - | - | Giữa | - | Luôn hiển thị | - |  |
| Xóa điều kiện tìm kiếm | button_clear | Button | Nhập | - | - | - | - | Giữa | - | Luôn hiển thị | - |  |
| Đăng ký thông tin người đọc | button_create | Button | Nhập | - | - | - | - | Giữa | - | Luôn hiển thị | - | Chuyển đến màn hình đăng ký thông tin người đọc |
| Xuất Excel | export | Button | Nhập | - | - | - | - | Giữa | - | Luôn hiển thị | - |  |

### Bảng kết quả tìm kiếm

| Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu | Độ dài tối thiểu | Độ dài tối đa | Căn chữ | Định dạng | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chi nhánh quản lý | kanri_shiten_id | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Tên người đọc | shiten_id | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Mã thành viên hợp tác xã | kumiaiin_code | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Tên người đọc | full_name | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Liên lạc 1 | renrakusaki_1 | Label | Xuất | - | - | - | - | Trái | - | Luôn hiển thị | - |  |
| Liên lạc 2 | renrakusaki_2 | Label | Xuất | - | - | - | - | Trái | - | Luôn hiển thị | - |  |
| Mã bưu điện địa chỉ giao báo | haitatsu_yubin_no | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Địa chỉ giao báo | haitatsu | Label | Xuất | - | - | - | - | Trái | - | Luôn hiển thị | - |  |
| Mã đại lý | hanbaiten_id | Label | Xuất | - | - | - | - | Trái | - | Luôn hiển thị | - |  |
| Tên đại lý | hanbaiten_name | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Ngày bắt đầu đọc báo | shoki_dokusya_kaishi_date | Label | Xuất | - | - | - | - | Trái | - | Luôn hiển thị | - |  |
| Ngày ngừng đọc báo | dokusya_chushi_date | Label | Xuất | - | - | - | - | Phải | - | Luôn hiển thị | - |  |
| Thao tác (cột) | colActions | Label | Xuất | - | - | - | - | Giữa | - | Luôn hiển thị | - | Khi nhấn "Xóa", hiển thị dialog xác nhận và thực hiện xóa logic (set deleted_at) |
| Phân trang | pagination | Label | Xuất | - | - | - | - | - | - | Khi có kết quả | - | Mặc định 20 bản ghi/trang |


---

## Định nghĩa chức năng

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-014 | Tổng quan | Màn hình tìm kiếm chi tiết người đọc |
| Tên màn hình | Màn hình tìm kiếm chi tiết người đọc | | |


### B. Chi tiết chức năng


#### 1. Hiển thị mặc định

- **1.1** Khi truy cập màn hình tìm kiếm người đọc, hiển thị như sau:
  - ・Form tìm kiếm trống
  - ・Danh sách người đọc mặc định (Trung ương hội: chỉ có thể chọn trung ương hội của mình. (Không thể xem người đọc của JA quản lý) JA bản điếm: chỉ có thể chọn JA của mình. JA chi nhánh quản lý: chỉ có thể chọn chi nhánh quản lý của mình. ※Người thanh toán bằng thẻ tín dụng bản điện tử/người đọc song song không thể chỉnh sửa, xóa.)
- **1.2** Breadcrumb: Trang chủ > Quản lý người đọc > Tìm kiếm chi tiết người đọc

#### 2. Tìm kiếm người đọc

- **2.1** Khi nhập điều kiện tìm kiếm và nhấn nút "Tìm kiếm", kiểm tra validation cho từng mục và thực hiện tìm kiếm (loại các bản ghi đã xóa logic khỏi kết quả tìm kiếm)
- **2.2** Mục tìm kiếm (phần text tự do của các mục tìm kiếm là khớp một phần)
‣Luôn hiển thị:
　・Chi nhánh quản lý (kanri_shiten_id)
　・Chi nhánh (shiten_id) (Danh sách giá trị của dropdown "Chi nhánh" được hiển thị theo giá trị đã chọn ở "Chi nhánh quản lý")
　・Mã thành viên hợp tác xã (kumiaiin_code)
　・Họ tên (full_name)
　・Họ tên (Kana) (full_name_kana)
　・Địa chỉ giao báo (haitatsu)
　・Đại lý giao báo (hanbaiten_id)
　・Ngày bắt đầu đọc báo (shoki_dokusya_kaishi_date) (kiểm tra tương quan: Startdate ≦ Enddate)
　・Ngày ngừng đọc báo (dokusya_chushi_date) (kiểm tra tương quan: Startdate ≦ Enddate)
　・Loại đọc báo (dokusya_shubetsu)
　・Trạng thái phê duyệt bản điện tử (denshi_shonin_status)
‣Tìm kiếm chi tiết
　・Mã chi nhánh ngân hàng (bank_branch_code)
　・Tên chi nhánh ngân hàng (bank_branch_name)
　・Liên lạc 1 (renrakusaki_1)
　・Ngày áp dụng (joho_henko_tekiyo_date) (kiểm tra tương quan: Startdate ≦ Enddate)
　・Email (email) (có kiểm tra định dạng). Nếu định dạng email không hợp lệ, hiển thị ACSMS-MSG-014-008
　・Tháng bắt đầu thanh toán (seikyu_kaishi_month)
　・Checkbox trích tài khoản
  - ・Danh sách kết quả tìm kiếm luôn hiển thị theo thứ tự mới nhất
  - ・Nếu không có kết quả tìm kiếm → Hiển thị ACSMS-MSG-014-002
  - ・Nếu tài khoản không có quyền → Hiển thị ACSMS-MSG-014-004
- **2.3** Nếu xảy ra lỗi hệ thống → Hiển thị ACSMS-MSG-014-003

#### 3. Xóa điều kiện tìm kiếm

- **3.1** Khi nhấn nút "Xóa điều kiện tìm kiếm", xóa toàn bộ điều kiện tìm kiếm
  - ・Reset điều kiện tìm kiếm về trống
  - ・Quay về trang đầu (trang 1)
- **3.2** Hiển thị danh sách người đọc mặc định

#### 4. Đăng ký mới

- **4.1** Khi nhấn nút "Đăng ký thông tin người đọc", chuyển đến màn hình đăng ký thông tin người đọc
- **4.2** Mặc định hiển thị form trống tại màn hình đăng ký thông tin người đọc

#### 5. Cập nhật (chế độ chỉnh sửa)

- **5.1** Khi chọn người đọc muốn chỉnh sửa từ danh sách kết quả tìm kiếm, chuyển đến màn hình đăng ký thông tin người đọc (chế độ chỉnh sửa)
- **5.2** Truyền ID sang màn hình đăng ký, lấy dữ liệu đang tồn tại

#### 6. Xóa người đọc

- **6.1** Khi nhấn nút "Xóa" ở cột thao tác, kiểm tra xem người đọc đối tượng có được liên kết với bảng liên quan không
- **6.2** Nếu được liên kết → Hiển thị ACSMS-MSG-014-009. Không thể xóa
  - Nếu không được liên kết, hiển thị dialog xác nhận (ACSMS-MSG-014-010)
  - Khi nhấn "Có":
  - ・Hệ thống thực hiện xóa logic (deleted_at = NOW())
  - ・Nếu xóa thành công, hiển thị thông báo (ACSMS-MSG-014-011)
  - ・Tải lại danh sách kết quả tìm kiếm
  - Nếu xảy ra lỗi hệ thống → Hiển thị ACSMS-MSG-014-003

#### 7. Phân trang

- **7.1** Danh sách kết quả tìm kiếm được phân trang
- **7.2** Mặc định: 20 bản ghi/trang, tối đa: 100 bản ghi/trang
- **7.3** Hiển thị điều hướng trang (< 1 2 3 ... N >) ở dưới bảng
- **7.4** Giữ nguyên điều kiện tìm kiếm hiện tại khi chuyển trang
- **7.5** Khi điều kiện tìm kiếm thay đổi, tự động quay về trang 1

#### 8. Chức năng xuất Excel

- **8.1** Thực hiện khi nhấn nút "Xuất Excel"
- **8.2** Xuất kết quả tìm kiếm dưới dạng Excel, có thể tải xuống
- **8.3** Nếu xuất Excel thành công → Hiển thị ACSMS-MSG-014-005
- **8.4** Nếu xuất Excel thất bại → Hiển thị ACSMS-MSG-014-007
- **8.5** Nếu không có dữ liệu tương ứng → Hiển thị ACSMS-MSG-014-006
- **8.6** Nếu số lượng xuất vượt quá 30000 bản ghi → Hiển thị ACSMS-MSG-014-012, dừng xử lý

#### 9. Ngày áp dụng

- **9.1** Nếu ngày áp dụng để trống thì lấy dữ liệu người đọc có cờ dữ liệu mới nhất = 1.
- **9.2** Nếu ngày áp dụng được nhập thì lấy dữ liệu người đọc có ngày áp dụng thay đổi <= ngày áp dụng điều kiện màn hình.
  - Lấy dữ liệu người đọc có ngày áp dụng thay đổi trước hoặc bằng ngày áp dụng điều kiện màn hình

#### 10. Chức năng sắp xếp

- **10.1** Cột đối tượng sắp xếp:
  - ・Chi nhánh quản lý
  - ・Chi nhánh
  - ・Mã thành viên hợp tác xã
  - ・Mã đại lý
  - ・Ngày bắt đầu đọc báo
  - ・Ngày ngừng đọc báo
- **10.2** Thực hiện khi nhấn header cột
- **10.3** Quy tắc chuyển đổi thứ tự sắp xếp:
  - ・Lần nhấn đầu tiên → Tăng dần (ASC)
  - ・Lần nhấn thứ hai → Giảm dần (DESC)
  - ・Lần nhấn thứ ba → Không sắp xếp (trạng thái ban đầu)
- **10.4** Hiển thị trạng thái sắp xếp hiện tại bằng icon trên header cột
  - ・Tăng dần: icon ▲
  - ・Giảm dần: icon ▼
  - ・Không sắp xếp: không hiển thị icon
- **10.5** Thực hiện sắp xếp trong khi vẫn giữ nguyên điều kiện tìm kiếm hiện tại

---

## Thông tin thông báo

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-014 | Tổng quan | Màn hình tìm kiếm chi tiết người đọc |
| Tên màn hình | Màn hình tìm kiếm chi tiết người đọc | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1 | ACSMS-MSG-014-001 | Tìm kiếm đã hoàn tất. |
| 2 | ACSMS-MSG-014-002 | Không có dữ liệu tương ứng. |
| 3 | ACSMS-MSG-014-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. |
| 4 | ACSMS-MSG-014-004 | Không có quyền truy cập. |
| 5 | ACSMS-MSG-014-005 | Xuất Excel đã hoàn tất bình thường. |
| 6 | ACSMS-MSG-014-006 | Không có dữ liệu xuất. |
| 7 | ACSMS-MSG-014-007 | Xuất Excel thất bại. |
| 8 | ACSMS-MSG-014-008 | Vui lòng nhập đúng định dạng email. |
| 9 | ACSMS-MSG-014-009 | Không thể xóa người đọc này vì có liên kết với các đối tượng liên quan. |
| 10 | ACSMS-MSG-014-010 | Bạn có chắc chắn muốn xóa người đọc này không? |
| 11 | ACSMS-MSG-014-011 | Đã xóa người đọc. |
| 12 | ACSMS-MSG-014-012 | Số lượng dữ liệu xuất vượt quá 30000 bản ghi. |
