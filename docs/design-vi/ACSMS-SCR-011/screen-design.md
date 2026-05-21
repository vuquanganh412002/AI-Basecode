# 【Nihon Nogyo Shimbun】VTI Japan_Hệ thống quản lý người đọc bản Cloud_Tài liệu thiết kế màn hình_Màn hình đăng ký thông tin người đọc_v1.1


---

## Trang bìa

**Hệ thống quản lý người đọc bản Cloud**

**Màn hình đăng ký thông tin người đọc**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người kiểm tra | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/31 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/16 | 1.1 | Nguyen Duyen Manh | Phản hồi các điểm chỉ ra<br>※Vị trí chỉnh sửa:<br>1. Sheet "Hình ảnh màn hình"<br>2. Sheet "Định nghĩa các mục trên màn hình": No. 26~33, 39, 41, 55, 56<br>3. Sheet "Định nghĩa chức năng": 10.4, 12.4, 12.9, 12.13, 14.2, 15<br>4. Sheet "Thông tin thông báo": Thông báo No. 13, 15, 16, 17 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/03/31 | Nguyen Duyen Manh |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách các sheet |
| 4.0 | Chuyển màn hình | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện màn hình |
| 6.0 | Định nghĩa các mục trên màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng |
| 8.0 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình | 2026/03/31 | Nguyen Duyen Manh |


ACSMS-SCR-011_Màn hình đăng ký thông tin người đọc_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin người đọc |
| Tên màn hình | Màn hình đăng ký thông tin người đọc | | |

ACSMS-SCR-011_Màn hình đăng ký thông tin người đọc_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem giao diện màn hình.

---

## Định nghĩa các mục trên màn hình

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục trên màn hình | 2026-03-31 00:00:00 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin người đọc |
| Tên màn hình | Màn hình đăng ký thông tin người đọc | | |

### Thông tin quản lý

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 5.0 | Chi nhánh quản lý | o | Trái | Bảng người đọc | kanri_shiten_id |
| 6.0 | Chi nhánh |  | Trái | Bảng người đọc | shiten_id |
| 7.0 | Mã thành viên hợp tác xã |  | Trái | Bảng người đọc | kumiaiin_code |
| 8.0 | Số lịch sử |  | Phải | Bảng lịch sử người đọc | rireki_no |

### Họ tên người đọc

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 9.0 | Họ người đọc | o | Trái | Bảng người đọc | shimei_sei |
| 10.0 | Tên người đọc | o | Trái | Bảng người đọc | shimei_mei |
| 11.0 | Họ người đọc (kana) | o | Trái | Bảng người đọc | shimei_kana_sei |
| 12.0 | Tên người đọc (kana) | o | Trái | Bảng người đọc | shimei_kana_mei |
| 13.0 | Đơn giá báo | o | Trái | Bảng người đọc | tanka_id |
| 14.0 | Số lượng đăng ký | o | Phải | Bảng người đọc | dokusya_busu |
| 15.0 | Mã bưu điện | o | Phải | Bảng người đọc | yubin_no |
| 16.0 | Tỉnh/thành phố | o | Trái | Bảng người đọc | todofuken_code |
| 17.0 | Quận/huyện/thị trấn | o | Trái | Bảng người đọc | shikuchoson |
| 18.0 | Số nhà/địa chỉ | o | Trái | Bảng người đọc | chome_banchi |
| 19.0 | Tên chung cư/căn hộ |  | Trái | Bảng người đọc | tatemono_mei |
| 20.0 | Liên hệ 1 | o | Phải | Bảng người đọc | renrakusaki_1 |
| 21.0 | Liên hệ 2 |  | Phải | Bảng người đọc | renrakusaki_2 |
| 22.0 | Địa chỉ email | △ | Trái | Bảng người đọc | email |
| 23.0 | Bản tin email | △ | Trái | Bảng người đọc | mail_magazine_flg |
| 24.0 | Năm sinh (tây lịch) |  | Phải | Bảng người đọc | birth_year |
| 25.0 | Giới tính |  | Trái | Bảng người đọc | gender |

### Thông tin địa chỉ giao hàng

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 26.0 | Giống thông tin người đọc |  | Trái | Bảng người đọc | haitatsu_same_flg |
| 27.0 | Mã bưu điện nơi giao | △ | Trái | Bảng người đọc | haitatsu_yubin_no |
| 28.0 | Tỉnh/thành phố nơi giao | △ | Trái | Bảng người đọc | haitatsu_todofuken_code |
| 29.0 | Quận/huyện/thị trấn nơi giao | △ | Trái | Bảng người đọc | haitatsu_shikuchoson |
| 30.0 | Số nhà/địa chỉ nơi giao | △ | Trái | Bảng người đọc | haitatsu_chome_banchi |
| 31.0 | Tên chung cư nơi giao |  | Trái | Bảng người đọc | haitatsu_tatemono_mei |
| 32.0 | Liên hệ 1 nơi giao |  | Trái | Bảng người đọc | haitatsu_renrakusaki_1 |
| 33.0 | Liên hệ 2 nơi giao |  | Trái | Bảng người đọc | haitatsu_renrakusaki_2 |
| 34.0 | Họ nơi giao (Kanji) | △ | Trái | Bảng người đọc | haitatsu_shimei_sei |
| 35.0 | Tên nơi giao (Kanji) | △ | Trái | Bảng người đọc | haitatsu_shimei_mei |
| 36.0 | Họ nơi giao (Kana) | △ | Trái | Bảng người đọc | haitatsu_shimei_kana_sei |
| 37.0 | Tên nơi giao (Kana) | △ | Trái | Bảng người đọc | haitatsu_shimei_kana_mei |

### Phân loại cửa hàng/gửi bưu điện

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 38.0 | Mã cửa hàng bán | o | Trái | Bảng người đọc | hanbaiten_id |
| 39.0 | Tên cửa hàng bán |  | Trái | Master cửa hàng bán | hanbaiten_name |
| 40.0 | Phân loại gửi bưu điện |  | Trái | Bảng người đọc | yubin_kubun |

### Phương thức thanh toán

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 41.0 | Phương thức thanh toán | o | Trái | Bảng người đọc | shiharai_hoho |
| 42.0 | Chu kỳ thanh toán phí đăng ký |  | Phải | Bảng người đọc | dokusyaryo_shiharai_cycle |
| 43.0 | Chi nhánh tài khoản trừ nợ | — | — | — | — |
| 44.0 | Loại tài khoản trừ nợ | △ | Trái | Bảng người đọc | hikiotoshi_yokin_shubetsu |
| 45.0 | Số tài khoản trừ nợ | △ | Trái | Bảng người đọc | hikiotoshi_koza_no |
| 46.0 | Tên chủ tài khoản trừ nợ | △ | Trái | Bảng người đọc | hikiotoshi_koza_meigi |
| 47.0 | Mã tổ chức tài chính | △ | Trái | Bảng người đọc | bank_code |
| 48.0 | Tên tổ chức tài chính | △ | Trái | Bảng người đọc | bank_name |
| 49.0 | Mã chi nhánh tài khoản | △ | Trái | Bảng người đọc | bank_branch_code |
| 50.0 | Tên chi nhánh tài khoản | △ | Trái | Bảng người đọc | bank_branch_name |

### Phân loại đối tượng người đọc

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 51.0 | Phân loại đối tượng người đọc |  | Trái | Bảng người đọc | dokusyaso_bunrui |
| 52.0 | Phân loại nông dân | △ | Trái | Bảng người đọc | nogyosya_bunrui |

### Kỳ hạn đăng ký

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 53.0 | Ngày bắt đầu đăng ký | o | Phải | Bảng người đọc | dokusya_kaishi_date |
| 54.0 | Ngày kết thúc đăng ký |  | Phải | Bảng người đọc | dokusya_chushi_date |
| 55.0 | Ngày áp dụng thay đổi thông tin người đọc |  | Phải | Bảng người đọc | joho_henko_tekiyo_date |
| 56.0 | Tháng bắt đầu thu phí | △ | Phải | Bảng người đọc | seikyu_kaishi_month |

### Khác

| No. | Tên mục | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- |
| 57.0 | Ghi chú | Trái | Bảng người đọc | biko |
| 58.0 | Tình trạng đăng ký bản giấy | Trái | — | — |

### Nút thao tác

| No. | Tên mục | Vào/Ra | Số ký tự tối thiểu | Số ký tự thực | Tên bảng (tên logic) |
| --- | --- | --- | --- | --- | --- |
| 59.0 | Phê duyệt/Đăng ký | — | — | — | — |
| 60.0 | Không phê duyệt | — | — | — | — |
| 61.0 | Hiển thị lịch sử | — | — | — | — |
| 62.0 | Tìm kiếm cửa hàng bán | — | — | — | — |
| 63.0 | Quay lại màn trước | — | — | — | — |


---

## Định nghĩa chức năng

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin người đọc |
| Tên màn hình | Màn hình đăng ký thông tin người đọc | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị màn hình ban đầu | - | Hiển thị màn hình ban đầu | Hiển thị form để tạo mới/cập nhật thông tin người đọc. |
| 2.0 | Đăng ký người đọc | Nút | Click | Kiểm tra dữ liệu → Hộp thoại xác nhận → Gọi API đăng ký → Chuyển sang màn hình danh sách |
| 3.0 | Phê duyệt bản điện tử | Nút | Click | Cập nhật bản ghi chờ phê duyệt (status=0) thành đã phê duyệt (status=1) |
| 4.0 | Từ chối bản điện tử | Nút | Click | Xác nhận từ chối → Cập nhật trạng thái thành đã từ chối (status=2) → Chuyển sang màn hình danh sách |
| 5.0 | Hiển thị lịch sử | Nút | Click | Hiển thị danh sách lịch sử thay đổi từ t_dokusya_rireki |
| 6.0 | Tìm kiếm cửa hàng bán | Nút | Click | Mở popup tìm kiếm cửa hàng bán → Chọn → Tự động điền mã và tên cửa hàng |
| 7.0 | Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán | No.1 | Thay đổi | Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán: ngày bắt đầu/ngày kết thúc/tháng bắt đầu thu phí/email bắt buộc |
| 8.0 | Thay đổi loại thủ tục | No.2 | Thay đổi | Hủy bỏ: Số lượng=0 readonly, có thể nhập ngày kết thúc. Đăng ký mới: nhập bình thường |
| 9.0 | Giống thông tin người đọc | No.26 | Thay đổi | Nếu được check: vô hiệu hóa No.27~37. Nếu không check hoặc bỏ check: kích hoạt No.27~37 |
| 10.0 | Chuyển đổi hiển thị theo phương thức thanh toán | No.41 | Thay đổi | Thay đổi hiển thị theo phương thức thanh toán |
| 11.0 | Chuyển đổi hiển thị theo phân loại đối tượng người đọc | No.51 | Thay đổi | Thay đổi hiển thị theo phân loại đối tượng người đọc |
| 12.0 | Chuyển đổi hiển thị theo loại người đọc | - | Thay đổi | Thay đổi hiển thị theo loại người đọc |
| 13.0 | Chuyển sang màn hình lịch sử | Nút "Hiển thị lịch sử" | Click | Khi nhấn nút "Hiển thị lịch sử", chuyển sang màn hình lịch sử |
| 14.0 | Điều khiển cờ trạng thái | Dữ liệu lịch sử | Khi đăng ký/cập nhật | Thiết lập các cờ (mới nhất/đăng ký mới/hủy bỏ/tăng giảm) khi tạo bản ghi lịch sử |
| 15.0 | Cập nhật thông tin người đọc (chế độ chỉnh sửa) | Hàng trong danh sách | Click | Lấy dữ liệu người đọc theo ID và phản ánh lên form. ID người đọc không thể thay đổi |
| 16.0 | Quay lại | Nút "Quay lại màn trước" | Click | Quay lại màn hình tìm kiếm chi tiết người đọc |

### B. Chi tiết chức năng


#### 1. Hiển thị màn hình ban đầu

- **1.1** Form tạo mới/cập nhật người đọc bản giấy.
- **1.2** Trung ương hội: chỉ chọn được trung ương hội của mình. (Không xem được người đọc của JA thuộc quyền quản lý) Trụ sở chính JA: chỉ chọn được JA của mình. Chi nhánh quản lý JA: chỉ chọn được chi nhánh quản lý của mình. ※Người thanh toán bằng thẻ tín dụng bản điện tử/người đọc song song không thể chỉnh sửa/xóa.
  - Trường hợp denshi_shonin_status = 0, JA có thể đăng ký, không thể chỉnh sửa
- **2.0** Đăng ký người đọc
- **2.1** Thực hiện kiểm tra dữ liệu phía client (kiểm tra các mục bắt buộc, định dạng, tương quan)
- **2.2** Nếu có lỗi → Trường hợp lỗi nhập liệu, hiển thị thông báo tương ứng (ACSMS-MSG-011-001~ACSMS-MSG-011-010) dưới mục bị lỗi
- **2.3** Trường hợp không nhập mục bắt buộc, hiển thị thông báo ACSMS-MSG-011-013
- **2.4** Gọi API POST /api/subscribers
- **2.5** Phía server thực hiện validation, kiểm tra tồn tại master, kiểm tra trùng email
- **2.6** Tạo t_dokusya + t_dokusya_rireki trong 1 transaction
- **2.7** Trường hợp đăng ký thành công → Hiển thị ACSMS-MSG-011-011 → Chuyển hướng tới /readers
- **2.8** Trường hợp lỗi hệ thống, hiển thị ACSMS-MSG-011-012
- **3.0** Phê duyệt bản điện tử
- **3.1** Điều kiện: denshi_shonin_status = 0 (chưa phê duyệt)
- **3.2** Hệ thống này ← Hệ thống quản lý người đọc bản điện tử: Nhận và phê duyệt thông tin người đọc đăng ký qua Web (liên kết bản điện tử cập nhật tự động 10 phút/lần)
- **3.3** Khi nhấn nút "Phê duyệt", API thiết lập denshi_shonin_status = 1 (đã phê duyệt), tạo bản ghi lịch sử mới
- **3.4** Hệ thống này → Bản điện tử: Phản ánh thông tin người đọc đã phê duyệt, liên kết đăng ký chuyển khoản tự động
- **4.0** Từ chối bản điện tử
- **4.1** Chỉ hiển thị nút "Không phê duyệt" khi denshi_shonin_status = 0
  - Hệ thống này ← Hệ thống quản lý người đọc bản điện tử: Nhận và phê duyệt thông tin người đọc đăng ký qua Web
- **4.2** Khi nhấn nút "Không phê duyệt", hiển thị hộp thoại xác nhận từ chối (ACSMS-MSG-011-014)
- **4.3** Khi nhấn nút "Có", gọi API PUT /api/subscribers/:id/reject, thiết lập denshi_shonin_status = 2 (từ chối), tạo bản ghi lịch sử mới
  - Trường hợp từ chối bản điện tử thành công → Chuyển hướng tới /readers
  - Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-011-012
- **4.4** Khi nhấn nút "Không", không thực hiện gì, giữ nguyên màn hình hiện tại
- **5.0** Hiển thị lịch sử
- **5.1** Gọi API GET /api/subscribers/:id/history
- **5.2** Hiển thị modal danh sách lịch sử, sắp xếp theo rireki_no giảm dần
- **5.3** Các mục hiển thị: Số lịch sử, Ngày tạo, Loại thủ tục, Lý do thay đổi
- **6.0** Tìm kiếm cửa hàng bán
- **6.1** Mở popup, chỉ hiển thị các cửa hàng cùng JA đang đăng nhập
- **6.2** Khi chọn cửa hàng đối tượng, tự động điền vào No.38 (mã) và No.39 (tên)
- **7.0** Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán
- **7.1** Khi loại đăng ký = bản điện tử/đọc song song → Địa chỉ email (No.22) là bắt buộc
- **7.2** Bản giấy: Ngày bắt đầu (No.52)=Lịch, Ngày kết thúc (No.53)=Lịch, Tháng bắt đầu thu phí (No.55)=Ẩn
- **7.3** Bản điện tử (chuyển khoản JA): Ngày bắt đầu=Radio button (Hôm nay/Ngày 1 tháng sau), Ngày kết thúc="Kết thúc cuối tháng X", Tháng bắt đầu thu phí=Label chỉ đọc (liên kết bản điện tử)
- **7.4** Bản điện tử (thẻ tín dụng)/đọc song song: Ngày bắt đầu=Chỉ đọc (liên kết bản điện tử), Ngày kết thúc=Chỉ đọc (liên kết bản điện tử), Tháng bắt đầu thu phí=Label chỉ đọc (liên kết bản điện tử)
- **7.5** Khi loại đăng ký là "bản điện tử" hoặc "đọc song song", vô hiệu hóa khu vực thông tin nơi giao (không cần nhập)
- **7.6** "Tháng bắt đầu thu phí": Thêm điều kiện chỉ hiển thị khi là bản điện tử hoặc đọc song song
- **8.0** Thay đổi loại thủ tục
- **8.1** Khi chọn hủy bỏ để đăng ký: Bắt buộc số lượng đăng ký = 0, kaiyaku_flg=TRUE
- **8.2** Khi chọn đăng ký mới để đăng ký: Nhập bình thường, shinki_flg=TRUE
- **9.0** Giống thông tin người đọc
- **9.1** Khi check: Vô hiệu hóa No.27~37 và xóa dữ liệu đã nhập. Khi lưu DB: Sao chép từ thông tin người đọc
- **9.2** Khi không check hoặc bỏ check: Kích hoạt No.27~37, No.27~30, 34~37 là bắt buộc
- **10.0** Chuyển đổi hiển thị theo phương thức thanh toán
- **10.1** Trường hợp 1: Trừ tài khoản → No.41~49 là bắt buộc
- **10.2** Trường hợp 2: Thu tiền mặt, 4: Tại cơ sở JA, 9: Khác → No.42~49 là tùy chọn
- **10.3** Trường hợp 3: Thu qua chuyển khoản, 5: Trừ lương, 6: Thẻ tín dụng → Các mục số 46~49 là bắt buộc
- **10.4** Khi phương thức thanh toán là "Thu qua chuyển khoản", đăng ký 1 bản ghi vào bảng t_koza_furikae khi hoàn tất thu tiền
- **11.0** Chuyển đổi theo phân loại đối tượng người đọc
- **11.1** Khi chọn nông dân → Hiển thị No.51 (Lúa nước/Rau/Trái cây/Chăn nuôi/Khác)
- **11.2** Khi không check hoặc bỏ check nông dân → Ẩn No.51, xóa giá trị đã chọn
- **12.0** Chuyển đổi hiển thị theo loại người đọc
- **12.1** "Ngày bắt đầu đăng ký" hiển thị như sau
- **12.2** Khi loại đăng ký là "bản giấy": Hiển thị lịch, có thể nhập
- **12.3** Khi loại đăng ký là "bản điện tử (chuyển khoản tự động JA)": Hiển thị dạng radio button ("〇Hôm nay　〇Ngày 1 tháng sau")
- **12.4** Khi loại đăng ký là "bản điện tử (thẻ tín dụng)": Hiển thị dạng lịch nhưng không thể nhập, phản ánh nguyên ngày bắt đầu đăng ký từ hệ thống quản lý người đọc bản điện tử.
- **12.5** Khi loại đăng ký là "đọc song song": Dạng lịch, không thể nhập. Phản ánh nguyên ngày đã nhập trong "Ngày bắt đầu đăng ký phía hệ thống quản lý người đọc bản điện tử"
- **12.6** "Ngày kết thúc đăng ký" hiển thị như sau
- **12.7** Khi loại đăng ký là "bản giấy": Hiển thị lịch, có thể nhập
- **12.8** Khi loại đăng ký là "bản điện tử (chuyển khoản tự động JA)": "Kết thúc cuối tháng X", có thể nhập
- **12.9** Khi loại đăng ký là "bản điện tử (thẻ tín dụng)": Hiển thị "Kết thúc cuối tháng X" và không thể nhập, phản ánh nguyên ngày kết thúc đăng ký từ hệ thống quản lý người đọc bản điện tử.
- **12.10** Khi loại đăng ký là "đọc song song": "Kết thúc cuối tháng X", không thể nhập. Phản ánh nguyên ngày đã nhập trong "Ngày kết thúc đăng ký phía hệ thống quản lý người đọc bản điện tử"
- **12.11** "Có tình trạng đăng ký bản giấy" trong thông tin đăng ký bản giấy hiển thị như sau
- **12.12** Khi loại đăng ký là "bản giấy": Không hiển thị
- **12.13** Khi tồn tại cờ có tình trạng đăng ký bản giấy: Hiển thị "Có tình trạng đăng ký bản giấy".
- **12.14** Khi loại đăng ký là "đọc song song": Không hiển thị
- **12.15** "Tháng bắt đầu thu phí" hiển thị như sau
- **12.16** Khi loại đăng ký là "bản giấy": Không hiển thị
- **12.17** Khi loại đăng ký là "bản điện tử": Hiển thị (Tháng bắt đầu thu phí được quyết định bởi hệ thống quản lý người đọc bản điện tử. Sau khi đăng ký tại màn hình này, nhận tháng bắt đầu thu phí đã quyết định từ hệ thống quản lý người đọc bản điện tử)
- **12.18** Khi loại đăng ký là "đọc song song": Hiển thị giống bản điện tử
- **13.0** Chuyển sang màn hình lịch sử
- **13.1** Khi nhấn nút "Hiển thị lịch sử", chuyển sang màn hình lịch sử
- **14.0** Điều khiển cờ trạng thái
- **14.1** Tùy theo các thao tác đăng ký/cập nhật/hủy bỏ thông tin người đọc, thiết lập phù hợp các cờ trạng thái của bảng lịch sử (t_dokusya_rireki)
- **14.2** Quy tắc thiết lập cờ
  - Cờ dữ liệu mới nhất (saishin_data_flg)
  - ・Bản ghi lịch sử tạo mới: thiết lập TRUE
  - ・Bản ghi mới nhất hiện có: cập nhật FALSE
  - ・Chỉ có 1 dokusya_id có giá trị TRUE
  - Cờ đăng ký mới (shinki_flg)
  - ・Khi đăng ký mới: TRUE
  - ・Khi đăng ký lại: TRUE
  - ・Khi cập nhật thông thường: FALSE
  - ・Khi hủy bỏ: FALSE
  - Cờ hủy bỏ (kaiyaku_flg)
  - ・Khi xử lý hủy bỏ: TRUE
  - ・Trường hợp khác: FALSE
  - Cờ báo cáo tăng giảm (zougen_hokoku_flg) (thay đổi cửa hàng/thay đổi địa chỉ/đăng ký mới/hủy bỏ)
  - ・Khi có thay đổi số lượng đăng ký...: TRUE
  - ・Khi không có thay đổi: FALSE
  - Luồng xử lý
  - 1. Lấy bản ghi mới nhất (saishin_data_flg = TRUE)
  - 2. Cập nhật saishin_data_flg của bản ghi hiện có thành FALSE
  - 3. Đánh giá từng cờ tùy theo nội dung nhập và sự kiện nghiệp vụ
  - 4. Tạo bản ghi lịch sử mới (rireki_no +1)
  - 5. Thiết lập và đăng ký các cờ
  - Ví dụ thiết lập cờ theo từng trường hợp
  - ● Đăng ký mới
  - Cờ
  - saishin_data_flg
  - shinki_flg
  - kaiyaku_flg
  - zougen_hokoku_flg
  - ● Cập nhật thông thường
  - Cờ
  - saishin_data_flg
  - shinki_flg
  - kaiyaku_flg
  - zougen_hokoku_flg
  - ● Hủy bỏ
  - Cờ
  - saishin_data_flg
  - shinki_flg
  - kaiyaku_flg
  - zougen_hokoku_flg
  - Bổ sung
  - ・Bảng lịch sử chỉ thêm mới (không UPDATE)
  - ・Cờ phải được thiết lập theo sự kiện nghiệp vụ
  - ・Thực hiện điều khiển transaction để ngăn ngừa không nhất quán
- **15.0** Cập nhật thông tin người đọc (chế độ chỉnh sửa)
- **15.1** Khi click bất kỳ hàng nào trong danh sách kết quả tìm kiếm, chuyển sang màn hình đăng ký thông tin người đọc (chế độ chỉnh sửa)
  - Loại đăng ký có thể chỉnh sửa phải là "bản giấy" hoặc "đọc song song (giấy + điện tử)". ※Với người đọc thuần "bản điện tử", do quản lý người đọc (thông tin thanh toán...) được điều hướng bởi hệ thống Web bên ngoài (hệ thống bản điện tử), tại màn hình này chỉ tham khảo (Read-only).
  - ・Khi lấy dữ liệu thành công → Phản ánh dữ liệu lên form
  - ・Khi lấy dữ liệu thất bại → Hiển thị ACSMS-MSG-011-016
  - ・Khi tài khoản không có quyền → Hiển thị ACSMS-MSG-011-017
  - ID người đọc không thể thay đổi.
- **15.2** Trước khi xử lý đăng ký, thực hiện kiểm tra nhập liệu và validation.
  - ・Khi có lỗi, hiển thị thông báo lỗi dưới mục tương ứng
  - ・Khi cập nhật thành công, hiển thị ACSMS-MSG-011-015 và quay lại "Màn hình tìm kiếm chi tiết người đọc"
- **15.3** Logic cập nhật dữ liệu
  - Thay vì ghi đè bản ghi hiện có (cập nhật vật lý), thực hiện thêm bản ghi với số lịch sử mới.
  - ・Bước 1: Vô hiệu hóa bản ghi cũ
  - ‣Cập nhật cờ của bản ghi hiện có đang là "cờ dữ liệu mới nhất = true" liên kết với ID người đọc đối tượng thành false
  - ・Bước 2: Đánh số lịch sử
  - ‣Lấy số lịch sử lớn nhất của ID người đọc đối tượng và cộng "1" làm số lịch sử mới
  - ・Bước 3: Chèn bản ghi mới
  - ‣Chèn thông tin mới nhất đã chỉnh sửa trên màn hình làm bản ghi mới vào bảng
  - ‣Khi đó, các mục sau được tự động thiết lập bởi hệ thống:
  - ▼Số lịch sử: Giá trị đã đánh số ở Bước 2
  - ▼Cờ dữ liệu mới nhất: true
  - ▼ID người dùng: ID người dùng đang đăng nhập
  - ▼Ngày giờ cập nhật: Giờ hệ thống (hiện tại)
- **16.0** Quay lại

#### 2026-01-16 00:00:00. Khi click nút "Quay lại màn trước", chuyển sang màn hình tìm kiếm chi tiết người đọc


#### 2026-02-16 00:00:00. Dữ liệu đã nhập trên form không được lưu


---

## Thông tin thông báo

| Tên hệ thống/ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý người đọc bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/03/31 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin người đọc |
| Tên màn hình | Màn hình đăng ký thông tin người đọc | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-011-001 | Vui lòng nhập 〇〇. |
| 2.0 | ACSMS-MSG-011-002 | Vui lòng nhập bằng hiragana. |
| 3.0 | ACSMS-MSG-011-003 | Vui lòng nhập bằng số nửa size. |
| 4.0 | ACSMS-MSG-011-004 | Vui lòng nhập mã bưu điện 7 ký tự. |
| 5.0 | ACSMS-MSG-011-005 | Vui lòng nhập địa chỉ email đúng. |
| 6.0 | ACSMS-MSG-011-006 | Trường hợp trừ tài khoản, 〇〇 là bắt buộc. |
| 7.0 | ACSMS-MSG-011-007 | Vui lòng nhập theo định dạng năm tháng (YYYYMM). |
| 8.0 | ACSMS-MSG-011-008 | 〇〇 được chỉ định không tồn tại. |
| 9.0 | ACSMS-MSG-011-009 | Địa chỉ email này đã được đăng ký. |
| 10.0 | ACSMS-MSG-011-010 | Vui lòng nhập ghi chú trong vòng 500 ký tự. |
| 11.0 | ACSMS-MSG-011-011 | Đã đăng ký. |
| 12.0 | ACSMS-MSG-011-012 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một thời gian. |
| 13.0 | ACSMS-MSG-011-013 | Là mục bắt buộc. |
| 14.0 | ACSMS-MSG-011-014 | Từ chối đăng ký người đọc bản điện tử. Bạn có chắc chắn không? |
| 15.0 | ACSMS-MSG-011-015 | Đã cập nhật. |
| 16.0 | ACSMS-MSG-011-016 | Không tìm thấy ID người đọc #{id}. |
| 17.0 | ACSMS-MSG-011-017 | Không có quyền truy cập. |
