# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_増減連絡票（販売店）出力画面_v1.2

# 【Khách hàng Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả phiên bản Cloud_Tài liệu thiết kế màn hình_Màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng)_v1.2

---

## Trang bìa (表紙)

**Hệ thống quản lý độc giả phiên bản Cloud (クラウド版購読者管理システム)**

**Màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng) (増減連絡票（販売店）出力画面)**

**Phiên bản 1.1**

- **Mã định dạng (フォーマットコード)**: 16-BM/PM/VTI
- **Phiên bản định dạng (フォーマットバージョン)**: 2.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi (変更履歴)

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/04/03 | 1 | Nguyen Truong An | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục (目次)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Mục lục |  |  |  |  |

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
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Luồng chuyển màn hình |  |  |  |  |

ACSMS-SCR-028_Màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng)_Luồng chuyển màn hình

---

## Hình ảnh màn hình (画面イメージ)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 


> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa các mục màn hình (画面項目定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục màn hình |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

> **Chú thích cột**: Vào/Ra (入/出): `入` = Input (nhập), `出` = Output (hiển thị). Bắt buộc (必須): `o` = bắt buộc, để trống = không bắt buộc.

### Vùng điều kiện xuất (出力条件エリア)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Thực tế | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ngày áp dụng (適用日) | tekiyoDate | Lịch (Calendar) | 入 | o | Date |  |  |  | Trái | YYYY/MM/DD | Bảng lịch sử độc giả | t_dokusya_rireki | Ngày áp dụng thay đổi thông tin độc giả | joho_henko_tekiyo_date | Luôn hiển thị |  |  |
| 2 | Đại lý bán hàng (販売店) | hanbaitenId | Checkbox | 入 |  | Checkbox |  |  |  | Trái |  | Master đại lý bán hàng | m_hanbaiten | ID đại lý bán hàng | hanbaiten_id | Luôn hiển thị |  |  |
| 3 | Chi nhánh quản lý (管理支店) | kanriShitenId | Checkbox | 入 |  | Checkbox |  |  |  | Trái |  | Master chi nhánh quản lý | m_kanri_shiten | ID chi nhánh quản lý | kanri_shiten_id | Luôn hiển thị |  |  |
| 4 | Xem trước báo cáo (レポートプレビュー) | btnPreview | Button | 入 |  | — |  |  |  |  |  | — | — | — | — | Luôn hiển thị |  |  |
| 5 | Tạo chứng từ điện tử (電子帳票作成) | btnCreateReport | Button | 入 |  | — |  |  |  |  |  | — | — | — | — | Luôn hiển thị |  |  |

### Bảng "Tăng phần" (「増部」テーブル)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Thực tế | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | Số lượng bản (部数) | colZouBusu | Label | 出 |  | Chuỗi |  |  |  | Trái | {trước} → {sau} | Bảng lịch sử độc giả | t_dokusya_rireki | Số lượng đặt mua trước → Số lượng đặt mua | zenkai_dokusya_busu → dokusya_busu | Khi có dữ liệu tăng phần |  |  |
| 7 | Địa chỉ (住所) | colZouAddress | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tên tỉnh giao hàng + Thành phố/quận giao hàng + Số nhà giao hàng + Tên tòa nhà giao hàng | m_todofuken.todofuken_name \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 8 | Họ tên mới (新規氏名) | colZouName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + Họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 9 | Tên độc giả giao hàng (配達先読者名) | colZouDeliveryName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên người nhận (họ) + Họ tên người nhận (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 10 | Số điện thoại (電話番号) | colZouPhone | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên lạc nơi giao hàng 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu tăng phần |  |  |
| 11 | Ghi chú (備考) | colZouBiko | Label | 出 |  | Chuỗi |  |  |  | Trái |  | — | — | — | — | Khi có dữ liệu tăng phần |  |  |

### Bảng "Giảm phần" (「減部」テーブル)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Thực tế | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | Số lượng bản (部数) | colGenBusu | Label | 出 |  | Chuỗi |  |  |  | Trái | {trước} → {sau} | Bảng lịch sử độc giả | t_dokusya_rireki | Số lượng đặt mua trước → Số lượng đặt mua | zenkai_dokusya_busu → dokusya_busu | Khi có dữ liệu giảm phần |  |  |
| 13 | Địa chỉ (住所) | colGenAddress | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tên tỉnh giao hàng + Thành phố/quận giao hàng + Số nhà giao hàng + Tên tòa nhà giao hàng | m_todofuken.todofuken_name \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 14 | Họ tên hủy (中止氏名) | colGenName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + Họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 15 | Tên độc giả giao hàng (配達先読者名) | colGenDeliveryName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên người nhận (họ) + Họ tên người nhận (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 16 | Số điện thoại (電話番号) | colGenPhone | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên lạc nơi giao hàng 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu giảm phần |  |  |
| 17 | Ghi chú (備考) | colGenBiko | Label | 出 |  | Chuỗi |  |  |  | Trái |  | — | — | — | — | Khi có dữ liệu giảm phần |  |  |

### Bảng "Thay đổi địa chỉ" (「住所変更」テーブル)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Thực tế | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | Nhãn (trước/sau thay đổi) (ラベル（変更前/変更後）) | colAddrLabel | Label | 出 |  | Chuỗi |  |  |  | Trái |  | — | — | — | — | Khi có dữ liệu thay đổi địa chỉ |  |  |
| 19 | Địa chỉ (住所) | colAddrAddress | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Tỉnh + Thành phố/quận + Số nhà + Tên tòa nhà | haitatsu_todofuken_code \|\| haitatsu_shikuchoson \|\| haitatsu_chome_banchi \|\| haitatsu_tatemono_mei |  |  |  |
| 20 | Họ tên (氏名) | colAddrName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên (họ) + Họ tên (tên) | shimei_sei \|\| shimei_mei |  |  |  |
| 21 | Tên độc giả giao hàng (配達先読者名) | colAddrDeliveryName | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Họ tên người nhận (họ) + Họ tên người nhận (tên) | haitatsu_shimei_sei \|\| haitatsu_shimei_mei |  |  |  |
| 22 | Số điện thoại (電話番号) | colAddrPhone | Label | 出 |  | Chuỗi |  |  |  | Trái |  | Bảng lịch sử độc giả | t_dokusya_rireki | Liên lạc nơi giao hàng 1 | haitatsu_renrakusaki_1 | Khi có dữ liệu thay đổi địa chỉ |  |  |
| 23 | Ghi chú (備考) | colAddrBiko | Label | 出 |  | Chuỗi |  |  |  | Trái |  | — | — | — | — | Khi có dữ liệu thay đổi địa chỉ |  |  |

---

## Định nghĩa chức năng (機能定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1 | Hiển thị màn hình ban đầu | — | Hiển thị màn hình | Hiển thị form điều kiện xuất với giá trị mặc định. Vùng preview để trống |
| 2 | Xem trước báo cáo | Xem trước báo cáo | Click | Kiểm tra điều kiện, lấy dữ liệu và hiển thị trong 3 bảng preview (Tăng phần / Giảm phần / Thay đổi địa chỉ) |
| 3 | Tạo chứng từ điện tử | Tạo chứng từ điện tử | Click | Kiểm tra điều kiện, tạo file chứng từ điện tử (PDF) |

### B. Chi tiết chức năng


#### 1. Hiển thị màn hình ban đầu

- **1.1** Khi truy cập màn hình xuất phiếu liên lạc tăng/giảm (đại lý bán hàng), mặc định hiển thị như sau:
  - Form điều kiện xuất
  - Ngày áp dụng: chưa chọn
  - Đại lý bán hàng: chưa chọn
  - Chi nhánh quản lý: chưa chọn
  - Vùng preview: trống
- **1.2** Kiểm tra quyền:
  - Nichino Quản trị viên (日農 管理者) / Nichino Người phụ trách (日農 担当者) → Hiển thị ACSMS-MSG-028-001. Không thể truy cập
  - Trung ương hội (中央会): chỉ có thể xuất phần thuộc trung ương hội của mình
  - JA chi nhánh chính (JA本店): chỉ có thể xuất phần chi nhánh quản lý thuộc JA của mình
  - JA chi nhánh quản lý (JA管理支店) → Chỉ có thể xuất dữ liệu thuộc kanri_shiten_id của tài khoản mình
- **1.3** Pulldown list:
  - Đại lý bán hàng: lấy từ m_hanbaiten. Đại lý bán hàng giả cho bản điện tử không hiển thị (loại trừ đại lý bán hàng đã đóng cửa (haiten_flg = true))
  - Chi nhánh quản lý: lấy từ m_kanri_shiten. JA chi nhánh chỉ hiển thị chi nhánh của mình

#### 2. Xem trước báo cáo

- **2.1** Logic lấy dữ liệu:
  - Trích xuất record từ bảng t_dokusya_rireki
  - Nếu đại lý bán hàng được chọn (không phải tất cả), lọc theo đại lý bán hàng tương ứng. Nếu không chọn, lấy tất cả đại lý bán hàng
  - Nếu chi nhánh quản lý được chọn (không phải tất cả), lọc theo chi nhánh quản lý tương ứng. Nếu không chọn, lấy tất cả chi nhánh quản lý
  - Ngày áp dụng: là mục bắt buộc, nếu không nhập: Hiển thị thông báo ACSMS-MSG-028-004. Nếu nhập: Trích xuất dữ liệu có ngày áp dụng thay đổi = ngày áp dụng trên màn hình VÀ cờ báo cáo tăng/giảm = 1
  - Trường hợp quyền JA chi nhánh quản lý → Thêm điều kiện kanri_shiten_id
- **2.2** Nhóm hóa và thứ tự sắp xếp:
  - Nhóm theo tổ hợp Đại lý bán hàng + Chi nhánh quản lý
  - Xuất một tờ chứng từ cho mỗi tổ hợp
  - Chứng từ được tạo theo thứ tự tăng dần của mã đại lý bán hàng
- **2.3** Hiển thị kết quả:
  - Hiển thị 3 bảng (Tăng phần / Giảm phần / Thay đổi địa chỉ) trong vùng preview
  - Mỗi record được phân loại vào các bảng Tăng phần / Giảm phần / Thay đổi địa chỉ dựa trên các điều kiện sau
  - [Tăng phần]
  - dokusya_busu > zenkai_dokusya_busu
  - [Giảm phần]
  - dokusya_busu < zenkai_dokusya_busu
  - [Thay đổi địa chỉ]
  - Địa chỉ giao hàng trước và địa chỉ giao hàng hiện tại khác nhau
  - (Địa chỉ trước ≠ Địa chỉ hiện tại)
  - Thứ tự hiển thị báo cáo và cách hiển thị khi không có mục: ①Hiển thị tất cả các mục theo thứ tự tăng dần. ②Khi không còn mục theo thứ tự tăng dần, hiển thị theo thứ tự giảm dần. ③Khi không còn mục theo thứ tự giảm dần, hiển thị các mục đã thay đổi địa chỉ. Trong trường hợp số mục bằng 0 ở bất kỳ phân loại nào, hiển thị tiêu đề và dòng trống.
  - Header chứng từ: Hiển thị số trang: Page: Trang hiện tại/Tổng số trang
  - TEL và FAX hiển thị thông tin của chi nhánh quản lý
  - Bảng thay đổi địa chỉ hiển thị 2 dòng cho mỗi độc giả (trước thay đổi / sau thay đổi)
- **2.4** Trường hợp không có dữ liệu đối tượng → Hiển thị ACSMS-MSG-028-002
- **2.5** Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-028-003

#### 3. Tạo chứng từ điện tử

- **3.1** Khi click button "Tạo chứng từ điện tử", thực hiện lấy dữ liệu giống mục 2.1
- **3.2** Nếu dữ liệu hợp lệ, tạo file chứng từ điện tử: (Vì template file chưa được chia sẻ, sẽ bổ sung khi có cập nhật sau khi nhận được chia sẻ)
  - Định dạng xuất: PDF
  - Xử lý sau khi xuất: Lưu vào S3
  - Tên file: 増減連絡票_販売店_{YYYY年MM月DD日}.pdf (Phiếu liên lạc tăng/giảm_Đại lý bán hàng_{YYYY年MM月DD日}.pdf) (dựa trên ngày áp dụng)
- **3.3** Trường hợp không có dữ liệu đối tượng → Không xuất file. Hiển thị ACSMS-MSG-028-002
- **3.4** Trường hợp lỗi hệ thống → Hiển thị ACSMS-MSG-028-003

---

## Thông tin thông báo (メッセージ情報)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo |  |  |  |  |

- **Mã màn hình**: 
- **Tên màn hình**: 
- **Tổng quan**: 

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1 | ACSMS-MSG-028-001 | Chức năng này chỉ có thể sử dụng với tài khoản JA. (この機能はJAアカウントのみ使用できます。) |
| 2 | ACSMS-MSG-028-002 | Không tồn tại dữ liệu đối tượng. (対象のデータが存在しません。) |
| 3 | ACSMS-MSG-028-003 | Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau ít phút. (システムエラーが発生しました。しばらくしてから再度お試しください。) |
| 4 | ACSMS-MSG-028-004 | Là mục bắt buộc. (必須項目です。) |
