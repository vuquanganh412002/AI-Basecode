# 【Công ty Báo Nông nghiệp Nhật Bản】VTI Nhật Bản_Hệ thống quản lý độc giả đám mây_Tài liệu thiết kế màn hình_Màn hình đăng ký thông tin độc giả_v1.1


---

## Bìa

**Hệ thống quản lý độc giả đám mây**

**Màn hình đăng ký thông tin độc giả**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| Số | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/31 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/16 | 1.1 | Nguyen Duyen Manh | Xử lý chỉnh sửa theo phản hồi<br>※ Vị trí chỉnh sửa：<br>1. Bảng tính「Hình ảnh màn hình」<br>2. Bảng tính「Định nghĩa mục màn hình」：Số 26～33、39、41、55、56<br>3. Bảng tính「Định nghĩa chức năng」：10.4、12.4、12.9、12.13、14.2、15<br>4. Bảng tính「Thông tin thông báo」：Số thông báo 13、15、16、17 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Mục lục | 2026/03/31 | Nguyen Duyen Manh | | |

| Số | Tên bảng tính | Mô tả |
| --- | --- | --- |
| 1.0 | Bìa | Bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách bảng tính |
| 4.0 | Chuyển đổi màn hình | Luồng chuyển đổi màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện người dùng |
| 6.0 | Định nghĩa mục màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng |
| 8.0 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển đổi màn hình

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Chuyển đổi màn hình | 2026/03/31 | Nguyen Duyen Manh | | |

ACSMS-SCR-011_Màn hình đăng ký thông tin độc giả_Chuyển đổi màn hình

---

## Hình ảnh màn hình

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/03/31 | Nguyen Duyen Manh | | |

| ID màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin độc giả |
| Tên màn hình | Màn hình đăng ký thông tin độc giả | | |

ACSMS-SCR-011_Màn hình đăng ký thông tin độc giả_Hình ảnh màn hình

> ※ Hình ảnh màn hình: vui lòng tham khảo hình ảnh trong tệp Excel.

---

## Định nghĩa mục màn hình

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Định nghĩa mục màn hình | 2026-03-31 | Nguyen Duyen Manh | | |

| ID màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin độc giả |
| Tên màn hình | Màn hình đăng ký thông tin độc giả | | |

### Thông tin quản lý

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 5.0 | Chi nhánh quản lý | Nhập | Trái | Bảng độc giả | kanri_shiten_id |
| 6.0 | Chi nhánh | | Trái | Bảng độc giả | shiten_id |
| 7.0 | Mã thành viên tổ hợp tác | | Trái | Bảng độc giả | kumiaiin_code |
| 8.0 | Số lịch sử | | Phải | Bảng lịch sử độc giả | rireki_no |

### Họ tên độc giả

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 9.0 | Họ tên độc giả - Họ | Nhập | Trái | Bảng độc giả | shimei_sei |
| 10.0 | Họ tên độc giả - Tên | Nhập | Trái | Bảng độc giả | shimei_mei |
| 11.0 | Họ tên độc giả (furigana) - Họ | Nhập | Trái | Bảng độc giả | shimei_kana_sei |
| 12.0 | Họ tên độc giả (furigana) - Tên | Nhập | Trái | Bảng độc giả | shimei_kana_mei |
| 13.0 | Đơn giá báo | Nhập | Trái | Bảng độc giả | tanka_id |
| 14.0 | Số lượng đặt báo | Nhập | Phải | Bảng độc giả | dokusya_busu |
| 15.0 | Mã bưu chính | Nhập | Phải | Bảng độc giả | yubin_no |
| 16.0 | Tỉnh/Thành phố | Nhập | Trái | Bảng độc giả | todofuken_code |
| 17.0 | Quận/Huyện/Thị xã | Nhập | Trái | Bảng độc giả | shikuchoson |
| 18.0 | Số nhà/Phố | Nhập | Trái | Bảng độc giả | chome_banchi |
| 19.0 | Tên tòa nhà/Căn hộ | | Trái | Bảng độc giả | tatemono_mei |
| 20.0 | Liên lạc 1 | Nhập | Phải | Bảng độc giả | renrakusaki_1 |
| 21.0 | Liên lạc 2 | | Phải | Bảng độc giả | renrakusaki_2 |
| 22.0 | Địa chỉ email | △ | Trái | Bảng độc giả | email |
| 23.0 | Bản tin email | △ | Trái | Bảng độc giả | mail_magazine_flg |
| 24.0 | Năm sinh (Dương lịch) | | Phải | Bảng độc giả | birth_year |
| 25.0 | Giới tính | | Trái | Bảng độc giả | gender |

### Thông tin địa chỉ giao báo

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 26.0 | Giống thông tin độc giả | | Trái | Bảng độc giả | haitatsu_same_flg |
| 27.0 | Mã bưu chính địa chỉ giao | △ | Trái | Bảng độc giả | haitatsu_yubin_no |
| 28.0 | Tỉnh/Thành phố địa chỉ giao | △ | Trái | Bảng độc giả | haitatsu_todofuken_code |
| 29.0 | Quận/Huyện địa chỉ giao | △ | Trái | Bảng độc giả | haitatsu_shikuchoson |
| 30.0 | Số nhà/Phố địa chỉ giao | △ | Trái | Bảng độc giả | haitatsu_chome_banchi |
| 31.0 | Tên tòa nhà địa chỉ giao | | Trái | Bảng độc giả | haitatsu_tatemono_mei |
| 32.0 | Liên lạc 1 địa chỉ giao | | Trái | Bảng độc giả | haitatsu_renrakusaki_1 |
| 33.0 | Liên lạc 2 địa chỉ giao | | Trái | Bảng độc giả | haitatsu_renrakusaki_2 |
| 34.0 | Họ người nhận (Kanji) | △ | Trái | Bảng độc giả | haitatsu_shimei_sei |
| 35.0 | Tên người nhận (Kanji) | △ | Trái | Bảng độc giả | haitatsu_shimei_mei |
| 36.0 | Họ người nhận (Kana) | △ | Trái | Bảng độc giả | haitatsu_shimei_kana_sei |
| 37.0 | Tên người nhận (Kana) | △ | Trái | Bảng độc giả | haitatsu_shimei_kana_mei |

### Đại lý / Phân loại gửi bưu điện

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 38.0 | Mã đại lý | Nhập | Trái | Bảng độc giả | hanbaiten_id |
| 39.0 | Tên đại lý | | Trái | Master đại lý | hanbaiten_name |
| 40.0 | Phân loại gửi bưu điện | | Trái | Bảng độc giả | yubin_kubun |

### Phương thức thanh toán

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 41.0 | Phương thức thanh toán | Nhập | Trái | Bảng độc giả | shiharai_hoho |
| 42.0 | Chu kỳ thanh toán phí đăng ký | | Phải | Bảng độc giả | dokusyaryo_shiharai_cycle |
| 43.0 | Chi nhánh tài khoản ghi nợ | — | — | — | — |
| 44.0 | Loại tiết kiệm tài khoản ghi nợ | △ | Trái | Bảng độc giả | hikiotoshi_yokin_shubetsu |
| 45.0 | Số tài khoản ghi nợ | △ | Trái | Bảng độc giả | hikiotoshi_koza_no |
| 46.0 | Tên chủ tài khoản ghi nợ | △ | Trái | Bảng độc giả | hikiotoshi_koza_meigi |
| 47.0 | Mã ngân hàng | △ | Trái | Bảng độc giả | bank_code |
| 48.0 | Tên ngân hàng | △ | Trái | Bảng độc giả | bank_name |
| 49.0 | Mã chi nhánh ngân hàng | △ | Trái | Bảng độc giả | bank_branch_code |
| 50.0 | Tên chi nhánh ngân hàng | △ | Trái | Bảng độc giả | bank_branch_name |

### Phân loại tầng độc giả

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 51.0 | Phân loại tầng độc giả | | Trái | Bảng độc giả | dokusyaso_bunrui |
| 52.0 | Phân loại nông dân | △ | Trái | Bảng độc giả | nogyosya_bunrui |

### Thời hạn đăng ký

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 53.0 | Ngày bắt đầu đăng ký | Nhập | Phải | Bảng độc giả | dokusya_kaishi_date |
| 54.0 | Ngày huỷ đăng ký | | Phải | Bảng độc giả | dokusya_chushi_date |
| 55.0 | Ngày áp dụng thay đổi thông tin độc giả | | Phải | Bảng độc giả | joho_henko_tekiyo_date |
| 56.0 | Tháng bắt đầu lập hóa đơn | △ | Phải | Bảng độc giả | seikyu_kaishi_month |

### Khác

| Số | Tên mục | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- |
| 57.0 | Ghi chú | Trái | Bảng độc giả | biko |
| 58.0 | Tình trạng đăng ký bản giấy | Trái | — | — |

### Nút hành động

| Số | Tên mục | Nhập/Xuất | Căn lề | Tên bảng (tên logic) | Tên cột DB |
| --- | --- | --- | --- | --- | --- |
| 59.0 | Phê duyệt・Đăng ký | — | — | — | — |
| 60.0 | Không phê duyệt | — | — | — | — |
| 61.0 | Hiển thị lịch sử | — | — | — | — |
| 62.0 | Tìm kiếm đại lý | — | — | — | — |
| 63.0 | Quay lại màn hình trước | — | — | — | — |


---

## Định nghĩa chức năng

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/03/31 | Nguyen Duyen Manh | | |

| ID màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin độc giả |
| Tên màn hình | Màn hình đăng ký thông tin độc giả | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị khởi tạo màn hình | - | Hiển thị khởi tạo | Hiển thị biểu mẫu để tạo mới / cập nhật thông tin độc giả. |
| 2.0 | Đăng ký độc giả | Nút | Click | Kiểm tra dữ liệu → Hộp thoại xác nhận → Gọi API đăng ký → Chuyển đến màn hình danh sách |
| 3.0 | Phê duyệt bản điện tử | Nút | Click | Cập nhật bản ghi chờ phê duyệt (status=0) thành đã phê duyệt (status=1) |
| 4.0 | Từ chối bản điện tử | Nút | Click | Xác nhận từ chối → Cập nhật trạng thái thành từ chối (status=2) → Chuyển đến màn hình danh sách |
| 5.0 | Hiển thị lịch sử | Nút | Click | Hiển thị danh sách lịch sử thay đổi từ t_dokusya_rireki |
| 6.0 | Tìm kiếm đại lý | Nút | Click | Mở popup tìm kiếm đại lý → Chọn → Tự động điền mã và tên đại lý |
| 7.0 | Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán | Mục 1 | Thay đổi | Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán: ngày bắt đầu/ngày huỷ/tháng bắt đầu lập hóa đơn/email bắt buộc |
| 8.0 | Thay đổi loại thủ tục | Mục 2 | Thay đổi | Huỷ: số lượng=0 readonly, có thể nhập ngày huỷ. Mới: thông thường |
| 9.0 | Giống thông tin độc giả | Mục 26 | Thay đổi | Nếu tích: Vô hiệu hoá mục 27～37. Nếu bỏ tích: Kích hoạt mục 27～37 |
| 10.0 | Chuyển đổi hiển thị theo phương thức thanh toán | Mục 41 | Thay đổi | Thay đổi hiển thị theo phương thức thanh toán |
| 11.0 | Chuyển đổi hiển thị theo phân loại tầng độc giả | Mục 51 | Thay đổi | Thay đổi hiển thị theo phân loại tầng độc giả |
| 12.0 | Chuyển đổi hiển thị theo loại độc giả | - | Thay đổi | Thay đổi hiển thị theo loại độc giả |
| 13.0 | Chuyển đến màn hình lịch sử | Nút「Hiển thị lịch sử」 | Click | Nhấn nút「Hiển thị lịch sử」→ Chuyển đến màn hình lịch sử |
| 14.0 | Kiểm soát cờ trạng thái | Dữ liệu lịch sử | Khi đăng ký/cập nhật | Đặt các cờ (mới nhất/mới/huỷ/tăng giảm) khi tạo bản ghi lịch sử |
| 15.0 | Cập nhật thông tin độc giả (chế độ chỉnh sửa) | Hàng trong danh sách | Click | Lấy dữ liệu độc giả theo ID và phản ánh vào biểu mẫu. ID độc giả không thể thay đổi |
| 16.0 | Quay lại | Nút「Quay lại màn hình trước」 | Click | Quay lại màn hình tìm kiếm chi tiết độc giả |

### B. Chi tiết chức năng


#### 1. Hiển thị khởi tạo màn hình

- **1.1** Biểu mẫu tạo mới / cập nhật độc giả bản giấy.
- **1.2** Trung ương hội (CHUOKAI): Chỉ có thể chọn trung ương hội của mình (không xem được độc giả của các JA trực thuộc). JA bản điếm: Chỉ có thể chọn JA của mình. JA chi nhánh quản lý: Chỉ có thể chọn chi nhánh quản lý của mình. ※ Độc giả thanh toán thẻ tín dụng bản điện tử và độc giả đọc kết hợp không thể chỉnh sửa hoặc xóa.
  - Nếu denshi_shonin_status = 0: JA có thể đăng ký, không thể chỉnh sửa
- **2.0** Đăng ký độc giả
- **2.1** Thực hiện kiểm tra dữ liệu phía client (kiểm tra mục bắt buộc, định dạng, kiểm tra tương quan)
- **2.2** Nếu có lỗi → Hiển thị thông báo tương ứng (ACSMS-MSG-011-001～ACSMS-MSG-011-010) bên dưới mục bị lỗi
- **2.3** Nếu không nhập mục bắt buộc, hiển thị thông báo ACSMS-MSG-011-013
- **2.4** Gọi API POST /api/subscribers
- **2.5** Phía server thực hiện validation, kiểm tra tồn tại master, kiểm tra trùng email
- **2.6** Tạo t_dokusya + t_dokusya_rireki trong 1 transaction
- **2.7** Đăng ký thành công → Hiển thị ACSMS-MSG-011-011 → Chuyển hướng đến /readers
- **2.8** Lỗi hệ thống → Hiển thị ACSMS-MSG-011-012
- **3.0** Phê duyệt bản điện tử
- **3.1** Điều kiện: denshi_shonin_status = 0 (chưa phê duyệt)
- **3.2** Hệ thống này ← Hệ thống quản lý độc giả bản điện tử: Nhận và phê duyệt thông tin độc giả đăng ký qua Web (cập nhật tự động mỗi 10 phút từ bản điện tử)
- **3.3** Nhấn nút「Phê duyệt」, API đặt denshi_shonin_status = 1 (đã phê duyệt), tạo bản ghi lịch sử mới
- **3.4** Hệ thống này → Bản điện tử: Phản ánh thông tin độc giả đã phê duyệt, liên kết đăng ký ghi nợ tài khoản
- **4.0** Từ chối bản điện tử
- **4.1** Hiển thị nút「Không phê duyệt」chỉ khi denshi_shonin_status = 0
  - Hệ thống này ← Hệ thống quản lý độc giả bản điện tử: Nhận và phê duyệt thông tin độc giả đăng ký qua Web
- **4.2** Nhấn nút「Không phê duyệt」→ Hiển thị hộp thoại xác nhận từ chối (ACSMS-MSG-011-014)
- **4.3** Nhấn nút「Có」→ Gọi API PUT /api/subscribers/:id/reject, đặt denshi_shonin_status = 2 (từ chối), tạo bản ghi lịch sử mới
  - Từ chối bản điện tử thành công → Chuyển hướng đến /readers
  - Lỗi hệ thống → Hiển thị ACSMS-MSG-011-012
- **4.4** Nhấn nút「Không」→ Không làm gì, giữ nguyên màn hình hiện tại
- **5.0** Hiển thị lịch sử
- **5.1** Gọi API GET /api/subscribers/:id/history
- **5.2** Hiển thị modal danh sách lịch sử, sắp xếp theo rireki_no giảm dần
- **5.3** Mục hiển thị: Số lịch sử, Ngày tạo, Loại thủ tục, Lý do thay đổi
- **6.0** Tìm kiếm đại lý
- **6.1** Mở popup, chỉ hiển thị đại lý cùng JA với người đang đăng nhập
- **6.2** Chọn đại lý → Tự động điền vào mục 38 (mã) và mục 39 (tên)
- **7.0** Chuyển đổi hiển thị theo loại đăng ký và phương thức thanh toán
- **7.1** Loại đăng ký = Bản điện tử / Đọc kết hợp → Địa chỉ email (mục 22) bắt buộc
- **7.2** Bản giấy: Ngày bắt đầu (mục 52) = Lịch, Ngày huỷ (mục 53) = Lịch, Tháng bắt đầu lập hóa đơn (mục 55) = Ẩn
- **7.3** Bản điện tử (ghi nợ tài khoản JA): Ngày bắt đầu = Nút radio (Hôm nay/Ngày 1 tháng sau), Ngày huỷ = "Kết thúc cuối tháng X", Tháng bắt đầu lập hóa đơn = Nhãn chỉ đọc (liên kết bản điện tử)
- **7.4** Bản điện tử (thẻ tín dụng)/Đọc kết hợp: Ngày bắt đầu = Chỉ đọc (liên kết bản điện tử), Ngày huỷ = Chỉ đọc (liên kết bản điện tử), Tháng bắt đầu lập hóa đơn = Nhãn chỉ đọc (liên kết bản điện tử)
- **7.5** Nếu loại đăng ký là「Bản điện tử」hoặc「Đọc kết hợp」→ Vô hiệu hoá khu vực thông tin địa chỉ giao (không cần nhập)
- **7.6**「Tháng bắt đầu lập hóa đơn」: Thêm điều kiện chỉ hiển thị khi loại đăng ký là bản điện tử hoặc đọc kết hợp
- **8.0** Thay đổi loại thủ tục
- **8.1** Chọn Huỷ và đăng ký: Bắt buộc đặt số lượng đăng ký về 0, kaiyaku_flg=TRUE
- **8.2** Chọn Mới và đăng ký: Nhập bình thường, shinki_flg=TRUE
- **9.0** Giống thông tin độc giả
- **9.1** Nếu tích: Vô hiệu hoá mục 27～37, xóa dữ liệu đã nhập. Khi lưu DB: Sao chép từ thông tin độc giả
- **9.2** Nếu bỏ tích: Kích hoạt mục 27～37, mục 27～30, 34～37 trở thành bắt buộc
- **10.0** Chuyển đổi hiển thị theo phương thức thanh toán
- **10.1** 1: Ghi nợ tài khoản → Mục 41～49 bắt buộc
- **10.2** 2: Thu tiền mặt, 4: Tại cơ sở JA, 9: Khác → Mục 42～49 là tùy chọn
- **10.3** 3: Thu chuyển khoản, 5: Trừ lương, 6: Thẻ tín dụng → Mục 46～49 bắt buộc
- **10.4** Nếu phương thức thanh toán là「Thu chuyển khoản」→ Khi hoàn tất nhận tiền, đăng ký 1 bản ghi vào bảng t_koza_furikae
- **11.0** Chuyển đổi theo phân loại tầng độc giả
- **11.1** Chọn Nông dân → Hiển thị mục 51 (Lúa nước/Rau củ/Cây ăn quả/Chăn nuôi/Khác)
- **11.2** Bỏ tích Nông dân → Ẩn mục 51, xóa giá trị đã chọn
- **12.0** Chuyển đổi hiển thị theo loại độc giả
- **12.1**「Ngày bắt đầu đăng ký」được hiển thị như sau
- **12.2** Nếu loại đăng ký là「Bản giấy」: Hiển thị lịch, có thể nhập
- **12.3** Nếu loại đăng ký là「Bản điện tử (Ghi nợ tài khoản JA)」: Hiển thị dạng nút radio (「○ Hôm nay　○ Ngày 1 tháng sau」)
- **12.4** Nếu loại đăng ký là「Bản điện tử (Thẻ tín dụng)」: Hiển thị dạng lịch nhưng không thể nhập, phản ánh nguyên ngày bắt đầu đăng ký từ hệ thống quản lý độc giả bản điện tử.
- **12.5** Nếu loại đăng ký là「Đọc kết hợp」: Dạng lịch, không thể nhập. Phản ánh nguyên ngày nhập vào「Ngày bắt đầu đăng ký phía hệ thống bản điện tử」
- **12.6**「Ngày huỷ đăng ký」được hiển thị như sau
- **12.7** Nếu loại đăng ký là「Bản giấy」: Hiển thị lịch, có thể nhập
- **12.8** Nếu loại đăng ký là「Bản điện tử (Ghi nợ tài khoản JA)」: 「Kết thúc cuối tháng X」, có thể nhập
- **12.9** Nếu loại đăng ký là「Bản điện tử (Thẻ tín dụng)」: Hiển thị「Kết thúc cuối tháng X」và không thể nhập, phản ánh nguyên ngày huỷ từ hệ thống quản lý độc giả bản điện tử.
- **12.10** Nếu loại đăng ký là「Đọc kết hợp」: 「Kết thúc cuối tháng X」, không thể nhập. Phản ánh nguyên ngày nhập vào「Ngày huỷ đăng ký phía hệ thống bản điện tử」
- **12.11**「Có bản giấy」trong thông tin đăng ký bản giấy được hiển thị như sau
- **12.12** Nếu loại đăng ký là「Bản giấy」: Không hiển thị
- **12.13** Nếu tồn tại cờ có bản giấy: Hiển thị「Có đăng ký bản giấy」
- **12.14** Nếu loại đăng ký là「Đọc kết hợp」: Không hiển thị
- **12.15**「Tháng bắt đầu lập hóa đơn」được hiển thị như sau
- **12.16** Nếu loại đăng ký là「Bản giấy」: Không hiển thị
- **12.17** Nếu loại đăng ký là「Bản điện tử」: Hiển thị (Tháng bắt đầu lập hóa đơn do hệ thống bản điện tử quyết định. Sau khi đăng ký trên màn hình này, nhận tháng bắt đầu lập hóa đơn từ hệ thống bản điện tử)
- **12.18** Nếu loại đăng ký là「Đọc kết hợp」: Hiển thị tương tự bản điện tử
- **13.0** Chuyển đến màn hình lịch sử
- **13.1** Nhấn nút「Hiển thị lịch sử」→ Chuyển đến màn hình lịch sử
- **14.0** Kiểm soát cờ trạng thái
- **14.1** Đặt cờ trạng thái phù hợp cho bảng lịch sử (t_dokusya_rireki) theo các thao tác đăng ký/cập nhật/huỷ thông tin độc giả
- **14.2** Quy tắc đặt cờ
  - Cờ dữ liệu mới nhất (saishin_data_flg)
  - ・Bản ghi lịch sử mới tạo được đặt TRUE
  - ・Bản ghi mới nhất hiện tại được cập nhật thành FALSE
  - ・Chỉ có 1 dokusya_id có giá trị TRUE
  - Cờ mới (shinki_flg)
  - ・Khi đăng ký mới: TRUE
  - ・Khi đọc lại: TRUE
  - ・Khi cập nhật thông thường: FALSE
  - ・Khi huỷ: FALSE
  - Cờ huỷ (kaiyaku_flg)
  - ・Khi xử lý huỷ: TRUE
  - ・Các trường hợp khác: FALSE
  - Cờ báo cáo tăng giảm (zougen_hokoku_flg) (thay đổi đại lý/thay đổi địa chỉ/đăng ký mới/huỷ)
  - ・Khi có thay đổi số lượng đăng ký v.v.: TRUE
  - ・Khi không có thay đổi: FALSE
  - Luồng xử lý
  - 1. Lấy bản ghi mới nhất (saishin_data_flg = TRUE)
  - 2. Cập nhật saishin_data_flg của bản ghi hiện tại thành FALSE
  - 3. Xác định từng cờ theo nội dung nhập và sự kiện nghiệp vụ
  - 4. Tạo bản ghi lịch sử mới (rireki_no +1)
  - 5. Đặt các cờ và đăng ký
  - Ví dụ đặt cờ theo từng trường hợp
  - ● Đăng ký mới: saishin_data_flg=TRUE, shinki_flg=TRUE, kaiyaku_flg=FALSE, zougen_hokoku_flg=TRUE
  - ● Cập nhật thông thường: saishin_data_flg=TRUE, shinki_flg=FALSE, kaiyaku_flg=FALSE, zougen_hokoku_flg=FALSE/TRUE
  - ● Huỷ: saishin_data_flg=TRUE, shinki_flg=FALSE, kaiyaku_flg=TRUE, zougen_hokoku_flg=TRUE
  - Ghi chú
  - ・Bảng lịch sử chỉ ghi thêm (không UPDATE)
  - ・Cờ phải được đặt bắt buộc theo sự kiện nghiệp vụ
  - ・Kiểm soát transaction để tránh mâu thuẫn dữ liệu
- **15.0** Cập nhật thông tin độc giả (chế độ chỉnh sửa)
- **15.1** Nhấn vào bất kỳ hàng nào trong danh sách kết quả tìm kiếm → Chuyển đến màn hình đăng ký thông tin độc giả (chế độ chỉnh sửa)
  - Loại đăng ký có thể chỉnh sửa là「Bản giấy」hoặc「Đọc kết hợp (giấy + điện tử)」. ※ Đối với độc giả thuần「Bản điện tử」, nơi quản lý độc giả (thanh toán v.v.) do hệ thống Web bên ngoài (hệ thống bản điện tử) chủ đạo, màn hình này chỉ cho phép xem (Read-only).
  - ・Lấy dữ liệu thành công → Phản ánh dữ liệu vào biểu mẫu
  - ・Lấy dữ liệu thất bại → Hiển thị ACSMS-MSG-011-016
  - ・Tài khoản không có quyền → Hiển thị ACSMS-MSG-011-017
  - ID độc giả không thể thay đổi.
- **15.2** Trước khi xử lý đăng ký, thực hiện kiểm tra nhập liệu và validation.
  - ・Nếu có lỗi, hiển thị thông báo lỗi bên dưới mục tương ứng
  - ・Cập nhật thành công → Hiển thị ACSMS-MSG-011-015, quay lại「Màn hình tìm kiếm chi tiết độc giả」
- **15.3** Logic cập nhật dữ liệu
  - Không ghi đè bản ghi hiện tại (cập nhật vật lý) mà thêm bản ghi với số lịch sử mới.
  - ・Bước 1: Vô hiệu hoá bản ghi cũ
  - ‣ Cập nhật cờ của bản ghi hiện tại có「cờ dữ liệu mới nhất = true」liên kết với ID độc giả đích thành false
  - ・Bước 2: Cấp số lịch sử
  - ‣ Lấy số lịch sử lớn nhất của ID độc giả đích, lấy giá trị đó cộng thêm「1」làm số lịch sử mới
  - ・Bước 3: Chèn bản ghi mới
  - ‣ Chèn thông tin mới nhất đã chỉnh sửa trên màn hình vào bảng như bản ghi mới
  - ‣ Lúc đó, các mục sau được hệ thống tự động đặt:
  - ▼ Số lịch sử: Giá trị đã cấp ở bước 2
  - ▼ Cờ dữ liệu mới nhất: true
  - ▼ ID người dùng: ID người dùng đang đăng nhập
  - ▼ Ngày giờ cập nhật: Giờ hệ thống (hiện tại)
- **16.0** Quay lại

#### 16.1 Nhấn nút「Quay lại màn hình trước」→ Chuyển đến màn hình tìm kiếm chi tiết độc giả


#### 16.2 Dữ liệu đã nhập vào biểu mẫu sẽ không được lưu


---

## Thông tin thông báo

| Tên hệ thống / Ứng dụng | Tài liệu | Tên bảng tính | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả đám mây | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/03/31 | Nguyen Duyen Manh | | |

| ID màn hình | ACSMS-SCR-011 | Tổng quan | Màn hình đăng ký thông tin độc giả |
| Tên màn hình | Màn hình đăng ký thông tin độc giả | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-011-001 | Vui lòng nhập 〇〇. |
| 2.0 | ACSMS-MSG-011-002 | Vui lòng nhập bằng hiragana. |
| 3.0 | ACSMS-MSG-011-003 | Vui lòng nhập bằng số nửa độ rộng. |
| 4.0 | ACSMS-MSG-011-004 | Vui lòng nhập mã bưu chính 7 chữ số. |
| 5.0 | ACSMS-MSG-011-005 | Vui lòng nhập địa chỉ email hợp lệ. |
| 6.0 | ACSMS-MSG-011-006 | Trong trường hợp ghi nợ tài khoản, 〇〇 là bắt buộc. |
| 7.0 | ACSMS-MSG-011-007 | Vui lòng nhập theo định dạng năm/tháng (YYYYMM). |
| 8.0 | ACSMS-MSG-011-008 | 〇〇 được chỉ định không tồn tại. |
| 9.0 | ACSMS-MSG-011-009 | Địa chỉ email này đã được đăng ký. |
| 10.0 | ACSMS-MSG-011-010 | Vui lòng nhập ghi chú trong vòng 500 ký tự. |
| 11.0 | ACSMS-MSG-011-011 | Đã đăng ký. |
| 12.0 | ACSMS-MSG-011-012 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau một lúc. |
| 13.0 | ACSMS-MSG-011-013 | Đây là mục bắt buộc. |
| 14.0 | ACSMS-MSG-011-014 | Từ chối đăng ký độc giả bản điện tử. Bạn có chắc chắn không? |
| 15.0 | ACSMS-MSG-011-015 | Đã cập nhật. |
| 16.0 | ACSMS-MSG-011-016 | Không tìm thấy ID độc giả #{id}. |
| 17.0 | ACSMS-MSG-011-017 | Bạn không có quyền truy cập. |
