# 【Kính gửi Báo Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả bản Cloud_Tài liệu thiết kế màn hình_Màn hình xuất phiếu liên lạc tăng giảm (cửa hàng bán)_v1.2


---

## Trang bìa

**Hệ thống quản lý độc giả bản Cloud**

**Màn hình xuất phiếu liên lạc tăng giảm (cửa hàng bán)**

**Phiên bản 1.1**

- **Mã định dạng**: 16-BM/PM/VTI
- **Phiên bản định dạng**: 2.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/04/03 | 1 | Nguyen Truong An | Tạo mới | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Mục lục |  |  |  |  |

| No | Tên sheet | Mô tả |
| --- | --- | --- |
| 1 | Trang bìa | Trang bìa tài liệu |
| 2 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3 | Mục lục | Danh sách sheet |
| 4 | Chuyển màn hình | Luồng chuyển màn hình |
| 5 | Hình ảnh màn hình | Giao diện màn hình |
| 6 | Định nghĩa mục màn hình | Định nghĩa các mục trên màn hình |
| 7 | Định nghĩa chức năng | Định nghĩa chức năng |
| 8 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình |  |  |  |  |

ACSMS-SCR-028_Màn hình xuất phiếu liên lạc tăng giảm (cửa hàng bán)_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 


> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa mục màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa mục màn hình |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

### Khu vực điều kiện xuất

| No | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Số ký tự thực | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ngày áp dụng | tekiyoDate | Lịch (calendar) | Nhập | o | Ngày |  |  |  | Căn trái | YYYY/MM/DD | Bảng lịch sử độc giả | t_dokusya_rireki | Ngày áp dụng thay đổi thông tin độc giả | joho_henko_tekiyo_date | Luôn hiển thị |  |  |
| 2 | Cửa hàng bán | hanbaitenId | Checkbox | Nhập |  | Checkbox |  |  |  | Căn trái |  | Master cửa hàng bán | m_hanbaiten | ID cửa hàng bán | hanbaiten_id | Luôn hiển thị |  |  |
| 3 | Chi nhánh quản lý | kanriShitenId | Checkbox | Nhập |  | Checkbox |  |  |  | Căn trái |  | Master chi nhánh quản lý | m_kanri_shiten | ID chi nhánh quản lý | kanri_shiten_id | Luôn hiển thị |  |  |
| 4 | Xem trước báo cáo | btnPreview | Nút (button) | Nhập |  | — |  |  |  |  |  | — | — | — | — | Luôn hiển thị |  |  |
| 5 | Tạo chứng từ điện tử | btnCreateReport | Nút (button) | Nhập |  | — |  |  |  |  |  | — | — | — | — | Luôn hiển thị |  |  |

### Bảng「Tăng bộ (増部)」

| No | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Số ký tự thực | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | Số bộ | colZouBusu | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái | {trước} → {sau} | Bảng lịch sử độc giả | t_dokusya_rireki | Số bộ đăng ký lần trước→Số bộ đăng ký | zenkai_dokusya_busu → dokusya_busu | Khi có dữ liệu tăng bộ |  |  |
| 7 | Địa chỉ | colZouAddress | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tên tỉnh thành nơi giao + thị trấn quận nơi giao + số nhà địa chỉ nơi giao + tên tòa nhà nơi giao | m_todofuken.todofuken_name \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 8 | Họ tên mới | colZouName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 9 | Tên độc giả nơi giao | colZouDeliveryName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên nơi giao (họ) + họ tên nơi giao (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 10 | Số điện thoại | colZouPhone | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên hệ nơi giao 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu tăng bộ |  |  |
| 11 | Ghi chú | colZouBiko | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | — | — | — | — | Khi có dữ liệu tăng bộ |  |  |

### Bảng「Giảm bộ (減部)」

| No | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Số ký tự thực | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | Số bộ | colGenBusu | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái | {trước} → {sau} | Bảng lịch sử độc giả | t_dokusya_rireki | Số bộ đăng ký lần trước→Số bộ đăng ký | zenkai_dokusya_busu → dokusya_busu | Khi có dữ liệu giảm bộ |  |  |
| 13 | Địa chỉ | colGenAddress | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tên tỉnh thành nơi giao + thị trấn quận nơi giao + số nhà địa chỉ nơi giao + tên tòa nhà nơi giao | m_todofuken.todofuken_name \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 14 | Họ tên ngừng | colGenName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 15 | Tên độc giả nơi giao | colGenDeliveryName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên nơi giao (họ) + họ tên nơi giao (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 16 | Số điện thoại | colGenPhone | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên hệ nơi giao 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu giảm bộ |  |  |
| 17 | Ghi chú | colGenBiko | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | — | — | — | — | Khi có dữ liệu giảm bộ |  |  |

### Bảng「Thay đổi địa chỉ (住所変更)」

| No | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Số ký tự thực | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | Nhãn (trước thay đổi/sau thay đổi) | colAddrLabel | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | — | — | — | — | Khi có dữ liệu thay đổi địa chỉ |  |  |
| 19 | Địa chỉ | colAddrAddress | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tỉnh thành + thị trấn quận + số nhà địa chỉ + tên tòa nhà | haitatsu_todofuken_code \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 20 | Họ tên | colAddrName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 21 | Tên độc giả nơi giao | colAddrDeliveryName | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên nơi giao (họ) + họ tên nơi giao (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 22 | Số điện thoại | colAddrPhone | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên hệ nơi giao 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu thay đổi địa chỉ |  |  |
| 23 | Ghi chú | colAddrBiko | Nhãn (label) | Xuất |  | Chuỗi |  |  |  | Căn trái |  | — | — | — | — | Khi có dữ liệu thay đổi địa chỉ |  |  |

---

## Định nghĩa chức năng

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1 | Hiển thị ban đầu màn hình | — | Hiển thị màn hình | Hiển thị form điều kiện xuất với giá trị mặc định. Khu vực xem trước để trống |
| 2 | Xem trước báo cáo | Xem trước báo cáo | Click | Kiểm tra điều kiện, lấy dữ liệu và hiển thị lên 3 bảng xem trước (Tăng bộ / Giảm bộ / Thay đổi địa chỉ) |
| 3 | Tạo chứng từ điện tử | Tạo chứng từ điện tử | Click | Kiểm tra điều kiện, tạo file chứng từ điện tử (PDF) |

### B. Chi tiết chức năng


#### 1. Hiển thị ban đầu màn hình

- **1.1** Khi truy cập màn hình xuất phiếu liên lạc tăng giảm (cửa hàng bán), mặc định hiển thị như sau:
  - Form điều kiện xuất
  - Ngày áp dụng: chưa chọn
  - Cửa hàng bán: chưa chọn
  - Chi nhánh quản lý: chưa chọn
  - Khu vực xem trước: trống
- **1.2** Kiểm tra quyền:
  - Quản trị viên Nichino / Phụ trách Nichino → Hiển thị ACSMS-MSG-028-001. Không thể truy cập
  - Hội trung ương (Chuokai): chỉ xuất được phần của hội trung ương mình
  - JA bản điếm: chỉ xuất được phần chi nhánh quản lý của JA mình
  - JA chi nhánh quản lý → chỉ xuất được dữ liệu thuộc kanri_shiten_id của tài khoản mình
- **1.3** Danh sách dropdown:
  - Cửa hàng bán: lấy từ m_hanbaiten. Cửa hàng bán giả lập của bản điện tử không hiển thị (loại trừ các cửa hàng đã đóng (haiten_flg = true))
  - Chi nhánh quản lý: lấy từ m_kanri_shiten. JA chi nhánh chỉ hiển thị chi nhánh của mình

#### 2. Xem trước báo cáo

- **2.1** Logic lấy dữ liệu:
  - Trích lọc bản ghi từ bảng t_dokusya_rireki
  - Nếu cửa hàng bán đã được chọn (không phải tất cả), lọc theo cửa hàng bán tương ứng. Nếu chưa chọn, lấy tất cả cửa hàng bán
  - Nếu chi nhánh quản lý đã được chọn (không phải tất cả), lọc theo chi nhánh quản lý tương ứng. Nếu chưa chọn, lấy tất cả chi nhánh quản lý
  - Ngày áp dụng: mục bắt buộc, nếu không nhập: hiển thị thông báo ACSMS-MSG-028-004. Nếu nhập: trích lọc các bản ghi có ngày áp dụng thay đổi của dữ liệu = ngày áp dụng trên màn hình VÀ cờ báo cáo tăng giảm = 1
  - Trường hợp quyền JA chi nhánh quản lý → thêm điều kiện kanri_shiten_id
- **2.2** Nhóm và thứ tự sắp xếp:
  - Nhóm theo tổ hợp cửa hàng bán + chi nhánh quản lý
  - Mỗi tổ hợp xuất 1 tờ chứng từ
  - Chứng từ được tạo theo thứ tự tăng dần mã cửa hàng bán
- **2.3** Hiển thị kết quả:
  - Hiển thị 3 bảng (Tăng bộ / Giảm bộ / Thay đổi địa chỉ) trên khu vực xem trước
  - Mỗi bản ghi được phân loại vào các bảng Tăng bộ／Giảm bộ／Thay đổi địa chỉ dựa trên các điều kiện sau:
  - [Tăng bộ]
  - dokusya_busu > zenkai_dokusya_busu
  - [Giảm bộ]
  - dokusya_busu < zenkai_dokusya_busu
  - [Thay đổi địa chỉ]
  - Địa chỉ nơi giao lần trước và địa chỉ nơi giao hiện tại khác nhau
  - (địa chỉ trước ≠ địa chỉ hiện tại)
  - Thứ tự hiển thị báo cáo và cách hiển thị khi không có mục: ① Hiển thị tất cả các mục theo thứ tự tăng dần. ② Khi hết mục tăng dần thì hiển thị theo thứ tự giảm dần. ③ Khi hết mục giảm dần thì hiển thị các mục có địa chỉ thay đổi. Nếu một danh mục nào đó có 0 mục thì hiển thị tiêu đề và dòng trống.
  - Header chứng từ: hiển thị số trang: Page: trang hiện tại/tổng số
  - TEL và FAX hiển thị thông tin của chi nhánh quản lý
  - Bảng thay đổi địa chỉ hiển thị 2 dòng cho mỗi độc giả (trước thay đổi / sau thay đổi)
- **2.4** Trường hợp không có dữ liệu đối tượng → Hiển thị ACSMS-MSG-028-002
- **2.5** Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-028-003

#### 3. Tạo chứng từ điện tử

- **3.1** Khi click nút「Tạo chứng từ điện tử」, thực hiện lấy dữ liệu giống như 2.1
- **3.2** Nếu dữ liệu hợp lệ, tạo file chứng từ điện tử: (Vì template file chưa được chia sẻ nên sau khi được chia sẻ, nếu có cập nhật sẽ bổ sung thêm)
  - Định dạng xuất: PDF
  - Xử lý sau khi xuất: lưu lên S3
  - Tên file: 増減連絡票_販売店_{YYYY年MM月DD日}.pdf (dựa trên ngày áp dụng)
- **3.3** Trường hợp không có dữ liệu đối tượng → Không xuất file. Hiển thị ACSMS-MSG-028-002
- **3.4** Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-028-003

---

## Thông tin thông báo

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1 | ACSMS-MSG-028-001 | Chức năng này chỉ có thể sử dụng bằng tài khoản JA. |
| 2 | ACSMS-MSG-028-002 | Không tồn tại dữ liệu đối tượng. |
| 3 | ACSMS-MSG-028-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. |
| 4 | ACSMS-MSG-028-004 | Đây là mục bắt buộc. |
