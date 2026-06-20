# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_購読者名簿出力画面_v1.3

# 【Khách hàng Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả phiên bản Cloud_Tài liệu thiết kế màn hình_Màn hình xuất danh bạ độc giả_v1.3

---

## Trang bìa (表紙)

**Hệ thống quản lý độc giả phiên bản Cloud (クラウド版購読者管理システム)**

**Màn hình xuất danh bạ độc giả (購読者名簿出力画面)**

**Phiên bản 1.3**

- **Mã định dạng (フォーマットコード)**: 16-BM/PM/VTI
- **Phiên bản định dạng (フォーマットバージョン)**: 2.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi (変更履歴)

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/04/02 | 1.0 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/04/02 | 1.1 | Nguyen Truong An | Xử lý điểm chỉ ra<br>※Vị trí chỉnh sửa:<br>1. Sheet "Hình ảnh màn hình"<br>2. Sheet "Định nghĩa các mục màn hình": No. 1, 3, 5, 6, 10, 11, 19, 27, 30, 31<br>3. Sheet "Định nghĩa chức năng": 1.1, 1.3, 3.1, 4.2 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3 | 2026/06/12 | 1.2 | Tran Duc Tuyen | Sửa lỗi ghi sai tên cột vật lý・tên logic ở sheet "Định nghĩa các mục màn hình":<br>・No.5/No.19 Tên cột (logic) "ID chi nhánh quản lý" → "Loại đặt mua (購読種別)"<br>・No.6 Tên cột (vật lý) "dokusya_shubetsu" → "dokusyaryo_shiharai_cycle"<br>・No.27 Tên logic "Chu kỳ thanh toán phí đặt mua" → "Phương thức thanh toán", tên vật lý "dokusyaryo_shiharai_cycle" → "shiharai_hoho" | Nguyen Huy Dat | Nguyen Huy Dat |
| 4 | 2026/06/12 | 1.3 | Tran Duc Tuyen | No.6 Đổi điều kiện hiển thị của Phân loại thanh toán từ "Loại báo cáo = theo chi nhánh quản lý" → "Luôn hiển thị" (theo hình ảnh màn hình, cho phép lọc theo chu kỳ thanh toán phí đặt mua kể cả khi theo cửa hàng bán) | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục (目次)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

| No | Tên sheet | Mô tả |
| --- | --- | --- |
| 1 | Trang bìa (表紙) | Trang bìa tài liệu |
| 2 | Lịch sử thay đổi (変更履歴) | Lịch sử thay đổi tài liệu |
| 3 | Mục lục (目次) | Danh sách sheet |
| 4 | Luồng chuyển màn hình (画面遷移) | Luồng chuyển màn hình |
| 5 | Hình ảnh màn hình (画面イメージ) | Giao diện màn hình |
| 6 | Định nghĩa các mục màn hình (画面項目定義) | Định nghĩa các mục trên màn hình |
| 7 | Định nghĩa chức năng (機能定義) | Định nghĩa chức năng |
| 8 | Thông tin thông báo (メッセージ情報) | Định nghĩa nội dung thông báo |

---

## Luồng chuyển màn hình (画面遷移)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Luồng chuyển màn hình | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

ACSMS-SCR-026_Màn hình xuất danh bạ độc giả_Luồng chuyển màn hình
Luồng 1: Luồng báo cáo theo cửa hàng bán

> ※ Vui lòng tham khảo sơ đồ luồng chuyển màn hình trong file Excel.

---

## Hình ảnh màn hình (画面イメージ)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

- **Mã màn hình**: ACSMS-SCR-026
- **Tên màn hình**: Màn hình xuất danh bạ độc giả (購読者名簿出力画面)

> ※ Vui lòng tham khảo hình ảnh màn hình trong file Excel.

---

## Định nghĩa các mục màn hình (画面項目定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục màn hình | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

- **Mã màn hình**: ACSMS-SCR-026
- **Tên màn hình**: Màn hình xuất danh bạ độc giả

### Vùng điều kiện xuất (出力条件エリア)

| No | Tên mục | ID mục | Loại mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn chỉnh chữ | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ngày áp dụng | tekiyoDate | Text | Vào | ○ | Năm tháng |  | 6 | Trái | YYYY/MM/DD | Bảng lịch sử độc giả | t_dokusya_rireki | Ngày áp dụng thay đổi thông tin độc giả | joho_henko_tekiyo_date | Luôn hiển thị |  | ・Bắt buộc chọn<br>・Định dạng năm tháng: YYYY/MM/DD<br>・Số 8 chữ số |
| 2 | Loại báo cáo (loại xuất) | reportType | Dropdown | Vào | ○ | Chuỗi |  |  | Trái |  | — | — | — | — | Luôn hiển thị | Danh bạ độc giả theo cửa hàng bán (dùng để tra cứu) | ・Bắt buộc chọn<br>・Danh bạ độc giả theo cửa hàng bán (tra cứu) / Danh bạ độc giả theo chi nhánh quản lý |
| 3 | Cửa hàng bán | hanbaitenIds | Dropdown | Vào |  | — |  |  | Trái |  | Master cửa hàng bán | m_hanbaiten | ID cửa hàng bán | hanbaiten_id | Loại báo cáo = theo cửa hàng bán |  | ・Có thể chọn nhiều<br>・Chỉ active khi chọn theo cửa hàng bán<br>・Khi active, bắt buộc chọn ≥1 |
| 4 | Chi nhánh quản lý | kanriShitenIds | Dropdown | Vào |  | — |  |  | Trái |  | Master chi nhánh quản lý | m_kanri_shiten | ID chi nhánh quản lý | kanri_shiten_id | Loại báo cáo = theo chi nhánh quản lý |  | ・Có thể chọn nhiều<br>・Chỉ active khi chọn theo chi nhánh quản lý<br>・Khi active, bắt buộc chọn ≥1 |
| 5 | Loại đặt mua | dokusyaShubetsuType | Dropdown | Vào |  | Chuỗi |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Loại đặt mua | dokusya_shubetsu | Luôn hiển thị |  | ・Bản giấy＋bản điện tử / Bản giấy / Bản điện tử (loại trừ song song/併読)<br>・Trường hợp không chọn, xuất tất cả<br>・Khi bao gồm "Bản điện tử" hoặc "Bản giấy＋bản điện tử" thì không thể chọn "Thẻ tín dụng" |
| 6 | Phân loại thanh toán | ShiharaiKubun | Dropdown | Vào |  | Chuỗi |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Chu kỳ thanh toán phí đặt mua | dokusyaryo_shiharai_cycle | Luôn hiển thị |  | ・Hàng tháng/2 tháng/3 tháng/nửa năm/trả theo năm<br>・Cả theo cửa hàng bán／theo chi nhánh quản lý đều có thể lọc theo chu kỳ thanh toán phí đặt mua |
| 7 | Xem trước báo cáo | btnPreview | Button | Vào |  | — |  |  |  | Loại đặt mua | — | — | — | — | Luôn hiển thị |  | Hiển thị xem trước báo cáo |
| 8 | Xuất Excel dữ liệu báo cáo | btnExport | Button | Vào |  | — |  |  |  |  | — | — | — | — | Luôn hiển thị |  | Xuất ra định dạng Excel ＋ lưu lên S3 |

### Bảng "Danh bạ độc giả theo cửa hàng bán" (「販売店別購読者名簿」テーブル)

| No | Tên mục | ID mục | Loại mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn chỉnh chữ | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | Ô tích chọn | colCheck | Text | Vào |  | — |  |  | Giữa |  | — | — | — | — | Loại báo cáo = theo cửa hàng bán |  | Tích chọn bằng tay |
| 10 | Tên người nhận giao hàng | colSubscriberName | Label | Ra |  | Chuỗi |  | 100 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ (姓) ＋ Tên (名) | shimei_sei \|\| shimei_mei | Loại báo cáo = theo cửa hàng bán |  | Trường hợp chỉ định thông tin nơi giao hàng = True thì dùng tên・kana của độc giả |
| 11 | Tên người nhận giao hàng (kana) | colSubscriberKana | Label | Ra |  | Chuỗi |  | 200 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ kana (姓) ＋ Tên kana (名) | shimei_kana_sei \|\| shimei_kana_mei | Loại báo cáo = theo cửa hàng bán |  | Trường hợp chỉ định thông tin nơi giao hàng = True thì dùng tên・kana của độc giả |
| 12 | Địa chỉ giao hàng | colDeliveryAddress | Label | Ra |  | Chuỗi |  | 407 | Trái | 〒{7}+{100}+{100}+{100} | Bảng lịch sử độc giả | t_dokusya_rireki | Mã bưu điện nơi giao＋Quận huyện thành phố nơi giao＋Số nhà nơi giao＋Tên tòa nhà nơi giao | haitatsu_yubin_no \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei | Loại báo cáo = theo cửa hàng bán |  |  |
| 13 | Chi nhánh quản lý | colKanriShiten | Label | Ra |  | Chuỗi |  | 100 | Trái |  | Master chi nhánh quản lý | m_kanri_shiten | Tên chi nhánh quản lý | kanri_shiten_name | Loại báo cáo = theo cửa hàng bán |  |  |
| 14 | Số điện thoại nơi giao hàng | colDeliveryPhone | Label | Ra |  | Chuỗi |  | 15 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên hệ nơi giao hàng 1 | haitatsu_renrakusaki_1 | Loại báo cáo = theo cửa hàng bán |  |  |
| 15 | Ngày bắt đầu đặt mua | colStartDate | Label | Ra |  | Ngày |  | 10 | Trái | yyyy/MM/dd | Bảng lịch sử độc giả | t_dokusya_rireki | Ngày bắt đầu đặt mua | dokusya_kaishi_date | Loại báo cáo = theo cửa hàng bán |  |  |
| 16 | Số bản đặt mua | colCopies | Label | Ra |  | Số |  |  | Giữa |  | Bảng lịch sử độc giả | t_dokusya_rireki | Số bản đặt mua | dokusya_busu | Loại báo cáo = theo cửa hàng bán |  |  |
| 17 | Dòng tiểu kết | rowSubtotal | Label | Ra |  | Chuỗi |  |  | Phải |  | — | — | — | — | Loại báo cáo = theo cửa hàng bán |  | Tiểu kết của chi nhánh quản lý. Thứ tự xuất: theo mã chi nhánh quản lý, ID độc giả. Hiển thị tiểu kết của chi nhánh quản lý tại thời điểm chi nhánh quản lý thay đổi |
| 18 | Dòng tổng kết | rowTotal | Label | Ra |  | Chuỗi |  |  | Phải |  | — | — | — | — | Loại báo cáo = theo cửa hàng bán |  | Tổng số bản của cửa hàng bán |

### Bảng "Danh bạ độc giả theo chi nhánh quản lý" (「管理支店別購読者名簿」テーブル)

| No | Tên mục | ID mục | Loại mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu nhập | Số ký tự tối thiểu | Số ký tự tối đa | Căn chỉnh chữ | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | Loại đặt mua | dokusyaShubetsuType | Label | Ra |  | Chuỗi |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Loại đặt mua | dokusya_shubetsu | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 20 | Tên độc giả | colBrSubscriberName | Label | Ra |  | Chuỗi |  | 100 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ (姓) ＋ Tên (名) | shimei_sei \|\| shimei_mei | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 21 | Kana độc giả | colBrSubscriberKana | Label | Ra |  | Chuỗi |  | 200 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ kana (姓) ＋ Tên kana (名) | shimei_kana_sei \|\| shimei_kana_mei | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 22 | Mã thành viên hợp tác xã | colKumiaiinCode | Label | Ra |  | Chuỗi |  | 20 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Mã thành viên hợp tác xã | kumiaiin_code | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 23 | Số điện thoại nơi giao hàng | colBrDeliveryPhone | Label | Ra |  | Chuỗi |  | 15 | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên hệ nơi giao hàng 1 | haitatsu_renrakusaki_1 | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 24 | Chi nhánh | colShiten | Label | Ra |  | Chuỗi |  | 100 | Trái |  | Master chi nhánh | m_shiten | Tên chi nhánh | shiten_name | Loại báo cáo = theo chi nhánh quản lý |  | Chi nhánh phụ trách giao hàng |
| 25 | Địa chỉ giao hàng | colBrDeliveryAddress | Label | Ra |  | Chuỗi |  | 407 | Trái | 〒{7}+{100}+{100}+{100} | Bảng lịch sử độc giả | t_dokusya_rireki | Mã bưu điện nơi giao＋Quận huyện thành phố nơi giao＋Số nhà nơi giao＋Tên tòa nhà nơi giao | haitatsu_yubin_no \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 26 | Số bản đặt mua | colBrCopies | Label | Ra |  | Số |  |  | Giữa |  | Bảng lịch sử độc giả | t_dokusya_rireki | Số bản đặt mua | dokusya_busu | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 27 | Phương thức thanh toán | colShiharaiKubun | Label | Ra |  | Chuỗi |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Phương thức thanh toán | shiharai_hoho | Loại báo cáo = theo chi nhánh quản lý |  | Chuyển khoản tài khoản/Thu tiền mặt/Thu chuyển khoản/Cơ sở JA v.v./Trừ lương/Thẻ tín dụng/Khác |
| 28 | Ngày bắt đầu đặt mua | colBrStartDate | Label | Ra |  | Ngày |  | 10 | Trái | yyyy/MM/dd | Bảng lịch sử độc giả | t_dokusya_rireki | Ngày bắt đầu đặt mua | dokusya_kaishi_date | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 29 | Cửa hàng bán phụ trách giao | colBrHanbaiten | Label | Ra |  | Chuỗi |  | 100 | Trái |  | Master cửa hàng bán | m_hanbaiten | Tên cửa hàng bán | hanbaiten_name | Loại báo cáo = theo chi nhánh quản lý |  |  |
| 30 | Tiểu kết | rowSubtotal | Label | Ra |  | Chuỗi |  |  | Phải |  | — | — | — | — | Loại báo cáo = theo chi nhánh quản lý |  | Tiểu kết của chi nhánh quản lý. Thứ tự xuất: theo mã chi nhánh quản lý, ID độc giả. Hiển thị tiểu kết của chi nhánh quản lý tại thời điểm chi nhánh quản lý thay đổi |
| 31 | Tổng kết | rowBrTotal | Label | Ra |  | Chuỗi |  |  | Phải |  | — | — | — | — | Loại báo cáo = theo chi nhánh quản lý |  | Tổng số bản của chi nhánh quản lý |

---

## Định nghĩa chức năng (機能定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

- **Mã màn hình**: ACSMS-SCR-026
- **Tên màn hình**: Màn hình xuất danh bạ độc giả

### A. Danh sách chức năng (機能一覧)

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1 | Hiển thị khởi tạo màn hình | — | Hiển thị màn hình | Hiển thị form điều kiện xuất với giá trị mặc định. Vùng xem trước để trống |
| 2 | Chuyển đổi loại báo cáo | Loại báo cáo | Thay đổi | Khi thay đổi loại báo cáo, chuyển đổi hiển thị dropdown cửa hàng bán (chọn nhiều) hoặc chi nhánh quản lý (chọn nhiều). Xóa dữ liệu xem trước |
| 3 | Xem trước báo cáo | Xem trước báo cáo | Click | Kiểm tra điều kiện, lấy dữ liệu và hiển thị lên bảng xem trước |
| 4 | Xuất Excel | Xuất Excel dữ liệu báo cáo | Click | Kiểm tra điều kiện, tạo file Excel và tải về |

### B. Chi tiết chức năng (機能詳細)

#### 1. Hiển thị khởi tạo màn hình

- **1.1** Khi truy cập màn hình xuất danh bạ độc giả, mặc định hiển thị như sau
  - ・ Form điều kiện xuất
  - ・ Ngày áp dụng: chưa chọn
  - ・ Loại báo cáo: Danh bạ độc giả theo cửa hàng bán (dùng để tra cứu)
  - ・ Loại đặt mua: chưa chọn
  - ・ Cửa hàng bán: chưa chọn
  - ・ Chi nhánh quản lý: ẩn (chỉ active khi chọn theo chi nhánh quản lý)
  - ・ Vùng xem trước: trống
- **1.2** Kiểm tra quyền:
  - ・ Quản trị viên Nichino / Người phụ trách Nichino → Hiển thị ACSMS-MSG-026-001. Không thể truy cập
  - ・ Chuokai: chỉ có thể xuất phần của Chuokai mình
  - ・ JA bản điếm (Honten): chỉ có thể xuất phần chi nhánh quản lý của JA mình
  - ・ JA chi nhánh (Shiten) → chỉ có thể xuất dữ liệu thuộc kanri_shiten_id của tài khoản mình
- **1.3** Danh sách dropdown:
  - ・ Chi nhánh quản lý: lấy từ m_kanri_shiten. JA chi nhánh quản lý chỉ hiển thị chi nhánh của mình
  - ・ Cửa hàng bán: lấy từ m_hanbaiten. Hiển thị cả cửa hàng bán giả lập (dummy) cho bản điện tử

#### 2. Chuyển đổi loại báo cáo

- **2.1** Khi thay đổi loại báo cáo,
  - ・ Chọn "Danh bạ độc giả theo cửa hàng bán" → hiển thị・active dropdown cửa hàng bán (chọn nhiều), ẩn・vô hiệu dropdown chi nhánh quản lý
  - ・ Chọn "Danh bạ độc giả theo chi nhánh quản lý" → hiển thị・active dropdown chi nhánh quản lý (chọn nhiều), ẩn・vô hiệu dropdown cửa hàng bán
- **2.2** Khi chuyển đổi, xóa dữ liệu xem trước

#### 3. Xem trước báo cáo

- **3.1** Khi click nút "Xem trước báo cáo", kiểm tra như sau
  - ・ Ngày áp dụng: mục bắt buộc, nếu không nhập: hiển thị thông báo ACSMS-MSG-026-006. Nếu có nhập: lấy MAX(rireki_no) của từng dokusya_id theo "joho_henko_tekiyo_date <= ngày áp dụng trên màn hình"
  - ・ Trường hợp loại báo cáo = theo cửa hàng bán: nếu không chọn cửa hàng bán → hiển thị ACSMS-MSG-026-002
  - ・ Trường hợp loại báo cáo = theo chi nhánh quản lý: nếu không chọn chi nhánh quản lý → hiển thị ACSMS-MSG-026-003
- **3.2** Logic lấy dữ liệu:
  - ・ Lấy snapshot mới nhất tại thời điểm ngày áp dụng từ t_dokusya_rireki (bảng lịch sử độc giả)
  - ・ Với mỗi dokusya_id, lấy MAX(rireki_no)
  - ・ Chỉ bản ghi có tetsuzuki_shurui = 1 (Đăng ký mới). Loại trừ hủy (tetsuzuki_shurui = 0)
  - ・ Nếu phân loại thanh toán phí đặt mua được chọn, lọc theo phân loại đó
- **3.3** Hiển thị kết quả:
  - ・ Loại báo cáo = theo cửa hàng bán → hiển thị bảng "Danh bạ độc giả theo cửa hàng bán" (thứ tự nhóm: cửa hàng bán → chi nhánh quản lý → độc giả)
  - ・ Loại báo cáo = theo chi nhánh quản lý → hiển thị bảng B (thứ tự nhóm: chi nhánh quản lý → độc giả)
- **3.4** Trường hợp không có dữ liệu đối tượng → hiển thị ACSMS-MSG-026-004
- **3.5** Trường hợp lỗi hệ thống → hiển thị ACSMS-MSG-026-005

#### 4. Xuất Excel

- **4.1** Khi click nút "Xuất Excel dữ liệu báo cáo", thực hiện kiểm tra điều kiện tương tự 3.1
- **4.2** ・ Nội dung xuất: xuất nguyên nội dung bảng "Danh bạ độc giả theo cửa hàng bán" hoặc "Danh bạ độc giả theo chi nhánh quản lý" ra Excel
  - ・ Tên file: 購読者名簿_{YYYY年MM月}.xlsx (Danh bạ độc giả_{Năm tháng}.xlsx) (dựa trên ngày áp dụng)
  - ・ Tên sheet: 購読者名簿 (Danh bạ độc giả)
  - ・ Cấu trúc dữ liệu: giống bảng xem trước (bao gồm dòng tiểu kết・dòng tổng kết)
  - ・ Xử lý sau khi xuất: lưu lên S3
- **4.3** Trường hợp không có dữ liệu đối tượng → không xuất file Excel. Hiển thị ACSMS-MSG-026-004
- **4.4** Trường hợp lỗi hệ thống → hiển thị ACSMS-MSG-026-005

---

## Thông tin thông báo (メッセージ情報)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/04/02 | Nguyen Truong An | 2026/04/21 | Nguyen Truong An |

- **Mã màn hình**: ACSMS-SCR-026
- **Tên màn hình**: Màn hình xuất danh bạ độc giả

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1 | ACSMS-MSG-026-001 | Chức năng này chỉ có thể sử dụng với tài khoản JA. (この機能はJAアカウントのみ使用できます。) |
| 2 | ACSMS-MSG-026-002 | Vui lòng chọn ít nhất 1 cửa hàng bán. (販売店を1件以上選択してください。) |
| 3 | ACSMS-MSG-026-003 | Vui lòng chọn ít nhất 1 chi nhánh quản lý. (管理支店を1件以上選択してください。) |
| 4 | ACSMS-MSG-026-004 | Không tồn tại dữ liệu đối tượng. (対象のデータが存在しません。) |
| 5 | ACSMS-MSG-026-005 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. (システムエラーが発生しました。しばらくしてから再度お試しください。) |
| 6 | ACSMS-MSG-026-006 | Là mục bắt buộc. (必須項目です。) |
