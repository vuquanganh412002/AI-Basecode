# 【Kính gửi Báo Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả bản Cloud_Tài liệu thiết kế màn hình_Màn hình xuất thông tin thanh toán phí giao hàng_v1.2


---

## Trang bìa

**Hệ thống quản lý độc giả bản Cloud**

**Màn hình xuất thông tin thanh toán phí giao hàng**

**Phiên bản 1.1**

| Mã định dạng | 16-BM/PM/VTI |
| Phiên bản định dạng | 2.0 |
| Ngày phát hành | 2019/04/19 |

---

## Lịch sử thay đổi

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/31 | 1.0 | Nguyen Duyen Manh | Tạo bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |  |  |  |  |
| 2.0 | 2026/04/17 | 1.1 | Nguyen Duyen Manh | Xử lý góp ý<br>※Vị trí chỉnh sửa:<br>1. Sheet「Định nghĩa mục màn hình」: No.1, 2, 9～16<br>2. Sheet「Định nghĩa chức năng」: No.4 | Nguyen Huy Dat | Nguyen Huy Dat |  |  |  |  |

---

## Mục lục

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/03/31 | Nguyen Duyen Manh |

| No. | Tên sheet | Mô tả |
| --- | --- | --- |
| No | Tên sheet | Mô tả |
| 1.0 | Trang bìa | Trang bìa tài liệu |
| 2.0 | Lịch sử thay đổi | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục | Danh sách sheet |
| 4.0 | Chuyển màn hình | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình | Giao diện màn hình |
| 6.0 | Định nghĩa mục màn hình | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng | Định nghĩa chức năng |
| 8.0 | Thông tin thông báo | Định nghĩa nội dung thông báo |

---

## Chuyển màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Chuyển màn hình | 2026/04/03 | Nguyen Duyen Manh |


ACSMS-SCR-021_Màn hình xuất thông tin thanh toán phí giao hàng_Chuyển màn hình

---

## Hình ảnh màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/04/03 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-021 | Tổng quan | Màn hình xuất thông tin thanh toán phí giao hàng |
| Tên màn hình | Màn hình xuất thông tin thanh toán phí giao hàng | | |

ACSMS-SCR-021_Màn hình xuất thông tin thanh toán phí giao hàng_Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa mục màn hình

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa mục màn hình | 2026/04/03 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-021 | Tổng quan | Màn hình xuất thông tin thanh toán phí giao hàng |
| Tên màn hình | Màn hình xuất thông tin thanh toán phí giao hàng | | |

### Tìm kiếm nhập liệu

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Năm tháng ngày | target_month | Lịch (calendar) | Nhập | o | Calendar | — | — | Trái | YYYY/MM/DD | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Năm tháng ngày | target_month | — | — | Tổng hợp tức thì theo năm tháng chỉ định từ t_dokusya・m_hanbaiten・m_tanka |
| 2.0 | Chu kỳ thanh toán phí giao hàng | dokusyaryo_shiharai_cycle | Textbox | Nhập | o | INTEGER | — | — | Trái | — | Master cửa hàng bán | m_hanbaiten | Chu kỳ thanh toán phí giao hàng | haitatsuryo_shiharaiCycle | — | — | ・Lọc theo dokusyaryo_shiharai_cycle<br>・Chỉ số nửa độ rộng<br>・Đơn vị tháng (1～12) |

### Khu vực「Danh sách thông tin thanh toán」

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3.0 | Tháng đối tượng | koza_furikae.target_month | Text | Xuất | VARCHAR | — | — | Trái | — | Bảng chuyển khoản tài khoản | t_koza_furikae | Năm tháng đối tượng | target_month | — | — |  |
| 4.0 | Mã cửa hàng bán | m_hanbaiten.hanbaiten_code | Text | Xuất | VARCHAR | — | — | Trái | — | Master cửa hàng bán | m_hanbaiten | Mã cửa hàng bán | hanbaiten_code | — | — |  |
| 5.0 | Tên cửa hàng bán | m_hanbaiten.hanbaiten_name | Text | Xuất | VARCHAR | — | — | Trái | — | Master cửa hàng bán | m_hanbaiten | Tên cửa hàng bán | hanbaiten_name | — | — |  |
| 6.0 | Số lượng bộ tháng hiện tại | SUM(t_dokusya.dokusya_busu) | Text | Xuất | INTEGER | — | — | Phải | — | — | — | — | — | — | — | dokusya_busu tổng hợp dựa trên điều kiện tìm kiếm, được nhóm theo từng cửa hàng bán |
| 7.0 | Số tiền tháng hiện tại | total | Text | Xuất | INTEGER | — | — | Phải | — | — | — | — | — | — | — | Tổng số tiền = dokusya_busu × tanka.kingaku_zeikomi (tanka_type=2), được nhóm theo từng cửa hàng bán; không cố định đơn giá đã gồm thuế mà chuyển nguồn tham chiếu theo loại thuế. m_ja.zei_kubun=1 (thuế trong) → tham chiếu m_tanka.kingaku_zeikomi / zei_kubun=2 (thuế ngoài) → tham chiếu m_tanka.kingaku_zeinuki |
| 8.0 | Chu kỳ thanh toán | tetsuzuki_shurui | Text | Xuất | INTEGER | — | — | Trái | — | Bảng độc giả | t_dokusya | Chu kỳ thanh toán phí giao hàng | dokusyaryo_shiharai_cycle | — | — |  |
| 9.0 | Mã tổ chức tài chính | bank_code | Text | Xuất | INTEGER | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Mã tổ chức tài chính | bank_code | — | — |  |
| 10.0 | Tên tổ chức tài chính | bank_name | Text | Xuất | VARCHAR | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Tên tổ chức tài chính | bank_name | — | — |  |
| 11.0 | Mã chi nhánh tài khoản | bank_branch_code | Text | Xuất | VARCHAR | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Mã chi nhánh tài khoản | bank_branch_code | — | — |  |
| 12.0 | Tên chi nhánh tài khoản | bank_branch_name | Text | Xuất | VARCHAR | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Tên chi nhánh tài khoản | bank_branch_name | — | — |  |
| 13.0 | Loại tiền gửi | yokin_shubetsu | Text | Xuất | INTEGER | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Loại tiền gửi | yokin_shubetsu | — | — | Loại tiền gửi (1: thông thường, 2: vãng lai) ※ảnh chụp tại thời điểm xuất |
| 14.0 | Số tài khoản | koza_no | Text | Xuất | INTEGER | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Số tài khoản | koza_no | — | — |  |
| 15.0 | Tên chủ tài khoản | koza_meigi | Text | Xuất | VARCHAR | — | — | Trái | — | t_dokusya (độc giả)・m_hanbaiten (master cửa hàng bán)・m_tanka (master đơn giá) | t_dokusya + m_hanbaiten + m_tanka | Tên chủ tài khoản | koza_meigi | — | — |  |
| 16.0 | Ghi chú | m_hanbaiten.biko | Text | Xuất | VARCHAR | — | — | Trái | — | Master cửa hàng bán | m_hanbaiten | Ghi chú | biko | — | — |  |

### Nút thao tác

| No. | Tên mục | ID mục | Loại mục | Nhập/Xuất | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn lề | Định dạng | Tên bảng (luận lý) | Tên bảng (vật lý) | Tên cột (luận lý) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 17.0 | Xuất Excel | btn_export | Nút (button) | — | — | — | — | — | — | — | — | — | — | — | — | — | Xuất file dữ liệu ra Excel |


---

## Định nghĩa chức năng

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/03 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-021 | Tổng quan | Màn hình xuất thông tin thanh toán phí giao hàng |
| Tên màn hình | Màn hình xuất thông tin thanh toán phí giao hàng | | |

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị ban đầu |  | Hiển thị ban đầu màn hình | Khu vực nhập liệu hiển thị tất cả các mục trống, khu vực lưới (grid) hiển thị ở trạng thái trống |
| 2.0 | Xử lý tìm kiếm・tổng hợp | Lưới (grid) | Nhấn nút tìm kiếm | Thực hiện xử lý tìm kiếm dựa trên logic và thông tin đã nhập |
| 3.0 | Xuất Excel | Nút xuất Excel | Nhấn nút | Tải xuống thông tin thanh toán trong lưới ở định dạng Excel |
| 4.0 | Lưu file | Nút xuất Excel | Thực hiện khi xuất Excel | Lưu file lên S3. |

### B. Chi tiết chức năng


#### 1. Hiển thị ban đầu

- **1.1** Khi truy cập màn hình「Xuất thông tin thanh toán phí giao hàng」, hiển thị như sau:
  - ・Khu vực nhập liệu: tất cả các mục hiển thị ở trạng thái trống
  - ・Khu vực lưới: hiển thị ở trạng thái trống
- **1.2** ・Hội trung ương (Chuokai): chỉ chọn được hội trung ương mình
  - ・JA bản điếm: chỉ chọn được JA mình
  - ・JA chi nhánh quản lý: chỉ chọn được chi nhánh quản lý của mình
- **2.0** Xử lý tìm kiếm・tổng hợp
- **2.1** Khi nhấn nút「Xuất Excel」, thực hiện kiểm tra validation và xử lý sau:
- **2.2** ・Mục「Năm tháng ngày」: mục bắt buộc. Nếu không nhập → Hiển thị thông báo ACSMS-MSG-021-001
- **2.3** ・Điều kiện trích lọc: target_month = năm tháng của Năm tháng ngày. Đồng thời, ngày áp dụng thay đổi <= Năm tháng ngày VÀ loại thủ tục =「Mới (新規)」, xác định 1 bản ghi mới nhất theo từng độc giả
- **2.4** ・Tổng hợp: Nhóm theo đơn vị mã cửa hàng bán, tính tổng số lượng bộ và số tiền (số bộ × đơn giá)
- **2.5** ・Trường hợp dữ liệu tương ứng là 0 bản ghi → Hiển thị ACSMS-MSG-021-003, không hiển thị gì trên lưới
  - 【Bổ sung: Thứ tự ưu tiên trích lọc dữ liệu】
- **2.6** Trong xử lý tìm kiếm, khi xác định「dữ liệu mới nhất tại thời điểm năm tháng」, sắp xếp theo thứ tự ưu tiên sau và lấy 1 bản ghi ở vị trí cao nhất:
  - Ngày áp dụng thay đổi (giảm dần - DESC): ngày gần nhất trước Năm tháng ngày
  - Thời điểm tạo (created_at) (giảm dần - DESC): nếu cùng ngày có nhiều thay đổi, lấy bản được tạo cuối cùng
- **2.7** 【Bổ sung: Quy cách tính số tiền】
  - Công thức tính:
  - Chuyển đổi đơn giá để tính theo loại thuế (m_ja.zei_kubun)
  - ・Trường hợp thuế trong (=1): Σ (dokusya_busu × kingaku_zeikomi)
  - ・Trường hợp thuế ngoài (=2): Σ (dokusya_busu × kingaku_zeinuki)
  - Lấy đơn giá:
  - Từ bảng m_tanka, lấy bản ghi có tanka_type = 2 (đơn giá phí giao hàng)
  - theo khóa tanka_id
- **3.0** Xuất Excel
- **3.1** ・Khi click nút「Xuất Excel」, thực hiện kiểm tra điều kiện giống như 2.2
- **3.2** ・Trường hợp không có vấn đề, tạo file Excel từ dữ liệu tổng hợp đang hiển thị trên lưới → Hiển thị ACSMS-MSG-021-004
- **3.3** ・Vận hành: Trường hợp cộng gộp nhiều tháng, người dùng xuất riêng từng tháng và cộng gộp thủ công.
  - ・Tên file: 配達手数料支払情報出力_{YYYY年MM月}.xlsx (dựa trên Năm tháng ngày)
  - ・Cấu trúc dữ liệu: giống với bảng xem trước (preview)
  - ・Xử lý sau khi xuất: tải xuống về máy cục bộ
- **3.4** Trường hợp không có dữ liệu đối tượng → Không xuất file Excel. Hiển thị ACSMS-MSG-021-003
- **3.5** Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-021-002
- **4.0** Lưu file
- **4.1** Xuất kết quả tìm kiếm ra file Excel, lưu lên S3 đồng thời đăng ký vào bảng t_file_download
- **4.2** Quy tắc đặt tên file (để lưu lên S3)
  - 配達手数料支払情報出力_{targetmonth}_{timestamp}.xlsx
  - Ví dụ:
  - 配達手数料支払情報出力_202604_20260417103000.xlsx
- **4.3** Đường dẫn lưu trữ
  - {s3_bucket}/delivery_fee/{YYYY}/{MM}/
  - Ví dụ:
  - s3://example-bucket/delivery_fee/2026/04/xxx.xlsx
- **4.4** Ngay cả khi xuất nhiều lần với cùng điều kiện, file không bị ghi đè mà được lưu thành file riêng
- **4.5** Đăng ký bảng t_file_download
  - Đối với file Excel đã xuất, đăng ký các thông tin sau để có thể xuất lại từ màn hình tải file:
  - ・Tên file
  - ・Đường dẫn lưu S3
  - ・Điều kiện xuất (targetmonth, v.v.)
  - ・Thời điểm xuất
  - ・Người dùng xuất

---

## Thông tin thông báo

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/04/03 | Nguyen Duyen Manh |

| Mã màn hình | ACSMS-SCR-021 | Tổng quan | Màn hình xuất thông tin thanh toán phí giao hàng |
| Tên màn hình | Màn hình xuất thông tin thanh toán phí giao hàng | | |

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-021-001 | Đây là mục bắt buộc. |
| 2.0 | ACSMS-MSG-021-002 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. |
| 3.0 | ACSMS-MSG-021-003 | Không tồn tại thông tin thanh toán tương ứng. |
| 4.0 | ACSMS-MSG-021-004 | Đã xuất file Excel. |
