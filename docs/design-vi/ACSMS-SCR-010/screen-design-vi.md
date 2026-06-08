# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_メニュー管理画面_v1.3

# 【Khách hàng Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả phiên bản Cloud_Tài liệu thiết kế màn hình_Màn hình quản lý menu_v1.3

---

## Trang bìa (表紙)

**Hệ thống quản lý độc giả phiên bản Cloud (クラウド版購読者管理システム)**

**Màn hình menu (メニュー画面)**

**Phiên bản 1.3**

- **Mã định dạng (フォーマットコード)**: 16-BM/PM/VTI
- **Phiên bản định dạng (フォーマットバージョン)**: 2.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi (変更履歴)

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/23 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/03/31 | 1.1 | Nguyen Duyen Manh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「目次」(Mục lục): Phần mô tả định nghĩa màn hình<br>2. Sheet「画面遷移」(Luồng chuyển màn hình): Chỗ「お知らせ5件表示」(hiển thị 5 thông báo)<br>3. Sheet「画面イメージ」(Hình ảnh màn hình): ・Lỗi font chữ trong hình ảnh màn hình<br>　　　　　　　　　　・Nút phê duyệt độc giả bản điện tử<br>　　　　　　　　　　・Nút「締め切り時間」(thời gian deadline)<br>　　　　　　　　　　・Nút「ログアウト」(đăng xuất) (được đặt bên trong vùng「ユーザー情報」(thông tin người dùng))<br>4. Sheet「画面項目定義」(Định nghĩa các mục màn hình): ・No.4 Số lượng chờ phê duyệt<br>　　　　　　　　　　　　　・Vùng thông báo No.1・No.2<br>　　　　　　　　　　　　　・Danh sách quản lý master<br>　　　　　　　　　　　　　・Đổi「支払情報出力」→「配達手数料支払情報出力」(xuất thông tin thanh toán phí giao hàng)<br>5. Sheet「機能定義」(Định nghĩa chức năng): Menu của tài khoản Chuokai・JA Honten・Chi nhánh quản lý | Nguyen Huy Dat | Nguyen Huy Dat |
| 3.0 | 2026/04/16 | 1.2 | Nguyen Duyen Manh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「画面イメージ」(Hình ảnh màn hình): ・Hiển thị「電子版読者承認」(phê duyệt độc giả bản điện tử) và「締め切り時間」(thời gian deadline) ở khung riêng<br>　　　　　　　　　　・Nút phê duyệt độc giả bản điện tử<br>　　　　　　　　　　・Nút「締め切り時間」(thời gian deadline)<br>　　　　　　　　　　・Nút「ログアウト」(đăng xuất) (được đặt bên trong vùng「ユーザー情報」)<br>2. Sheet「画面項目定義」(Định nghĩa các mục màn hình): No.6、7、10、32、33<br>3. Sheet「機能定義」(Định nghĩa chức năng): 3.1 3.2、6.3、8 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4.0 | 2026/04/28 | 1.3 | Nguyen Duyen Manh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「画面イメージ」(Hình ảnh màn hình): ・Hiển thị「電子版読者承認」(phê duyệt độc giả bản điện tử) và「締め切り時間」(thời gian deadline) ở khung riêng<br>　　　　　　　　　　・Nút phê duyệt độc giả bản điện tử<br>　　　　　　　　　　・Nút「締め切り時間」(thời gian deadline)<br>　　　　　　　　　　・Nút「ログアウト」(đăng xuất) (được đặt bên trong vùng「ユーザー情報」)<br>2. Sheet「画面項目定義」(Định nghĩa các mục màn hình): No.6、7、10、32、33<br>3. Sheet「機能定義」(Định nghĩa chức năng): 3.1 3.2、6.3、8 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục (目次)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

| No | Tên sheet | Mô tả |
| --- | --- | --- |
| 1.0 | Trang bìa (表紙) | Thông tin cơ bản tài liệu |
| 2.0 | Lịch sử thay đổi (変更履歴) | Lịch sử thay đổi tài liệu |
| 3.0 | Mục lục (目次) | Danh sách sheet |
| 4.0 | Luồng chuyển màn hình (画面遷移) | Luồng chuyển màn hình |
| 5.0 | Hình ảnh màn hình (画面イメージ) | Wireframe/Mockup |
| 6.0 | Định nghĩa các mục màn hình (画面項目定義) | Định nghĩa các mục trên màn hình |
| 7.0 | Định nghĩa chức năng (機能定義) | Định nghĩa chức năng |
| 8.0 | Thông tin thông báo (メッセージ情報) | Danh sách thông báo・mã lỗi |

---

## Luồng chuyển màn hình (画面遷移)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Luồng chuyển màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

ACSMS-SCR-010: Màn hình quản lý menu — Luồng chuyển màn hình

---

## Hình ảnh màn hình (画面イメージ)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-010
- **Tên màn hình**: Màn hình menu
- **Tổng quan**: Màn hình menu

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa các mục màn hình (画面項目定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục màn hình | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-010
- **Tên màn hình**: Màn hình menu
- **Tổng quan**: Màn hình menu

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Vùng thông tin tài khoản đăng nhập (ログインアカウント情報エリア)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Tên tài khoản | account_name | Text box | Ra | - | VARCHAR | - | 50.0 | Phải | - | Master tài khoản | m_account | Tên tài khoản | account_name | Luôn hiển thị | - | Hiển thị ở header. Hiển thị tên tài khoản |
| 2.0 | Đăng xuất | logout | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Khi click「Tên tài khoản」thì nút đăng xuất sẽ hiển thị dạng dropdown |
| 3.0 | Tên quyền tài khoản | role_name | Text box | Ra | - | VARCHAR | - | 100.0 | Phải | - | m_roles | m_roles | Tên role | role_name | Luôn hiển thị | - | Hiển thị ở header. Được lấy từ bảng role thông qua role_id của bảng tài khoản |
| 4.0 | Phê duyệt độc giả đăng ký qua Web | redirect_detail_subscription | Link | Ra | - | - | - | - | - | - | - | - | - | - | - | - | Click để chuyển sang「Màn hình tìm kiếm chi tiết độc giả」<br>(chuyển với điều kiện tìm kiếm đã tích vào「bản điện tử chưa phê duyệt」) |
| 5.0 | Số lượng chờ phê duyệt | pending_count | Text box | Ra | - | VARCHAR | - | - |  | - | Bảng độc giả | t_dokusya | Số lượng chờ phê duyệt | denshi_shonin_status | Luôn hiển thị | - | Đếm số bản ghi có「denshi_shonin_status = 0」 |

### Vùng thông báo (お知らせエリア)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.0 | Tiêu đề thông báo | title | Link | Ra | - | VARCHAR | - | 100.0 | Trái | - | Bảng thông báo | t_oshirase | Tiêu đề thông báo | title | Luôn hiển thị | - |  |
| 7.0 | Ngày | publish_start_date | Text box | Ra | - | TIMESTAMPTZ | - | - | Trái | YYYY/MM/DD | Bảng thông báo | t_oshirase | Ngày giờ bắt đầu công khai | publish_start_date | Luôn hiển thị | - |  |
| 8.0 | Chi tiết | detail_oshirase | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Click để hiển thị dialog/màn hình chi tiết thông báo |
| 9.0 | Icon NEW | new_oshirase | Hình ảnh | - | - | - | - | - | - | - | - | - | - | - | - | - | Hiển thị nếu trong vòng 7 ngày kể từ khi đăng ký |
| 10.0 | Thời gian deadline | oshirase_type | Label | Ra | - | - | - | - | - | - | Bảng thông báo | t_oshirase | Nội dung | content | - | - | Hiển thị khi có bản ghi oshirase_type＝4. Ví dụ hiển thị:「紙版mm月dd日付締め切り　dd日HH時まで」(deadline bản giấy ngày mm/dd　đến HH giờ ngày dd) |

### Quản lý độc giả (購読者管理)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11.0 | Đăng ký thông tin độc giả | Subscriber_registration | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 12.0 | Import dữ liệu Excel độc giả | subcriber_import | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 13.0 | Tìm kiếm chi tiết độc giả | subscriber_detail | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 14.0 | Thay thế hàng loạt cửa hàng bán độc giả | bulk_replace | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Quản lý cửa hàng bán (販売店管理) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 15.0 | Đăng ký thông tin cửa hàng bán | dealer_registration | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 16.0 | Import dữ liệu Excel cửa hàng bán | dealer_import | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 17.0 | Tìm kiếm chi tiết cửa hàng bán | dealer_details | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Tạo dữ liệu (データ作成) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 18.0 | Xuất dữ liệu chuyển khoản tài khoản | bank_transfer_export | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 19.0 | Xuất thông tin thanh toán phí giao hàng | tesuryo_shiharai_export | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Tạo báo cáo (レポート作成) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 20.0 | Danh sách độc giả | subcriber_list | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 21.0 | Phiếu liên lạc tăng giảm (cửa hàng bán) | report | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 22.0 | Thông báo tăng giảm (Nông nghiệp Nhật Bản) | notification | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Quản lý master (マスタ管理) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 23.0 | Đăng ký master đơn giá | unit_price | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 24.0 | Đăng ký master JA | JA_master | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 25.0 | Đăng ký master chi nhánh | branch_master | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Khác (その他) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 26.0 | Tải lên file | file_upload | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 27.0 | Tải xuống file | file_download | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| Chức năng quản trị (管理者機能) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 28.0 | Tham chiếu log | refer_log | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 29.0 | Quản lý tài khoản | accounts | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 30.0 | Danh sách thông báo | notification_list | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 31.0 | Nhập thay (đại lý) cho cửa hàng bán | dealer_proxy | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 32.0 | Đăng ký master chi nhánh quản lý | admin_branch_master | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |
| 33.0 | Quản lý role | role_management | Link | - | - | - | - | - | - | - | - | - | - | - | - | - | Chuyển sang màn hình tương ứng |

---

## Định nghĩa chức năng (機能定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-010
- **Tên màn hình**: Màn hình menu
- **Tổng quan**: Màn hình menu

### A. Danh sách chức năng (機能一覧)

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị tên quyền tài khoản | Header | Khi mở màn hình | Hiển thị tên quyền gắn với tài khoản đang đăng nhập ở bên phải màn hình (hiển thị một trong số: Quản trị viên Nichino・Nhân viên Nichino・Chuokai・JA Honten・JA Chi nhánh quản lý) |
| 2.0 | Kiểm tra chờ phê duyệt bản điện tử | Chờ phê duyệt bản điện tử | Khi mở màn hình | Chỉ thực hiện được với tài khoản xử lý độc giả bản điện tử. Kiểm tra số độc giả đang ở trạng thái chờ phê duyệt (chưa phê duyệt) khi đăng ký qua Web, hiển thị thay đổi theo số lượng độc giả chờ phê duyệt. |
| 3.0 | Chuyển sang phê duyệt độc giả đăng ký qua Web | Nút | Khi click nút | Chỉ hiển thị nút với tài khoản xử lý độc giả bản điện tử. Khi click sẽ chuyển sang màn hình tìm kiếm chi tiết độc giả và hiển thị danh sách đã lọc chỉ những độc giả chờ phê duyệt (chưa phê duyệt). |
| 4.0 | Hiển thị thông báo | Banner | Khi mở màn hình | Lấy thông báo dành cho màn hình menu và hiển thị danh sách 5 mục mỗi lần. Có thể thao tác cuộn bằng nút ▲▼. Khi click nút「Chi tiết」sẽ hiển thị toàn văn thông báo dạng popup. |
| 5.0 | Điều khiển hiển thị menu | Sidebar | Khi mở màn hình | Dựa trên danh sách quyền (bảng m_role・m_permission) gắn với tài khoản đang đăng nhập, chuyển đổi động các menu hiển thị. Chức năng không sử dụng được sẽ bị ẩn (ẩn hoàn toàn chứ không phải làm mờ). |
| 6.0 | Chuyển hướng theo mục menu | Navigation | Khi click nút | Chuyển sang màn hình chức năng tương ứng với nút đã click. Với mục mà tài khoản không có quyền tương ứng thì bản thân nút sẽ không hiển thị, nên không thể chuyển sang màn hình ngoài phạm vi quyền. |
| 7.0 | Chuyển sang nhập thay cho cửa hàng bán | Navigation | Khi click nút | Chỉ hiển thị nút với Quản trị viên Nichino・Nhân viên Nichino (tài khoản có quyền HANBAITEN_PROXY_INPUT). Khi click sẽ chuyển sang màn hình tìm kiếm chi tiết master JA, khi chọn JA đối tượng sẽ chuyển sang màn hình tìm kiếm chi tiết cửa hàng bán của JA đó. |
| 8.0 | Đăng xuất | Nút「ログアウト」(Đăng xuất) | Khi click nút | Thực hiện khi click nút「Đăng xuất」ở header. Hủy thông tin session・token xác thực và redirect về màn hình đăng nhập. |

### B. Chi tiết chức năng (機能詳細)

  - 1   Hiển thị ban đầu (onMounted)
- **1.1** Lấy thông tin tài khoản đang đăng nhập
  - Nội dung lấy: ID tài khoản・Tên tài khoản・Role・
  - JA-ID・ID chi nhánh quản lý・Mã tỉnh thành・Cờ bản điện tử
- **1.2** Hiển thị tên quyền đã lấy ở bên phải màn hình
  - Hiển thị một trong số: Quản trị viên Nichino / Nhân viên Nichino / Chuokai /
  - JA Honten / JA Chi nhánh quản lý
- **1.3** Lấy thông báo dành cho màn hình menu và hiển thị lên bảng
  - ・Hiển thị 5 mục mỗi lần / Có thể cuộn bằng nút ▲▼
  - ・Khi click link chi tiết sẽ hiển thị toàn văn thông báo dạng popup
- **1.4** Chỉ với tài khoản xử lý độc giả bản điện tử mới kiểm tra số lượng chờ phê duyệt
  - ・Trường hợp có từ 1 độc giả chờ phê duyệt (chưa phê duyệt) trở lên
  - → Hiển thị text「Phê duyệt độc giả bản điện tử」＋ thông báo「Có độc giả đang chờ phê duyệt」(chữ đỏ) ＋ nút「Phê duyệt độc giả đăng ký qua Web」
  - ・Trường hợp số lượng chờ phê duyệt là 0
  - → Hiển thị text「Phê duyệt độc giả bản điện tử」＋ nút (ẩn thông báo chờ phê duyệt)
  - ・Trường hợp tài khoản không xử lý bản điện tử
  - → Ẩn toàn bộ vùng phê duyệt độc giả bản điện tử
- **1.5** Dựa trên quyền gắn với tài khoản
  - Quyết định các mục menu hiển thị
  - 2   Chuyển đổi label loại tài khoản (getAccountLabel)
- **2.1** Lấy role gắn với tài khoản đang đăng nhập,
  - chuyển đổi sang label tiếng Nhật như sau và hiển thị ở header
  - NICHINO_ADMIN    → Tài khoản Quản trị viên Nichino
  - NICHINO_STAFF    → Tài khoản Nhân viên Nichino
  - CHUO_KAI         → Tài khoản Chuokai
  - JA_HONTEN        → Tài khoản JA Honten
  - JA_KANRI_SHITEN  → Tài khoản JA Chi nhánh quản lý
  - 3   Điều khiển hiển thị menu (buildMenuItems)
  - ※ Dựa trên quyền (m_role・m_permission) gắn với tài khoản
  - để chuyển đổi động các mục menu hiển thị.
  - Chức năng không sử dụng được sẽ bị ẩn hoàn toàn
  - (ẩn chứ không làm mờ)
- **3.1** Role: NICHINO_ADMIN (Quản trị viên Nichino)
  - 【Menu hiển thị】
  - ・Quản lý master (master JA, master chi nhánh quản lý)
  - ※ Master đơn giá・master chi nhánh bị ẩn
  - ・Khác
  - Tải lên file   (quyền FILE_UPLOAD)
  - Tải xuống file   (quyền FILE_DOWNLOAD)
  - ・Chức năng quản trị
  - Tham chiếu log              (quyền LOG_VIEW)
  - Quản lý role     (quyền ROLE_MANAGEMENT)
  - Quản lý tài khoản         (quyền ACCOUNT_MANAGEMENT)
  - Quản lý thông báo          (quyền OSHIRASE_MANAGEMENT)
- **3.2** Role: NICHINO_STAFF (Nhân viên Nichino)
  - 【Menu hiển thị】
  - ・Quản lý master
  - ※ Nhân viên Nichino không sử dụng được (ẩn menu)
  - ・Khác
  - Tải lên file   (quyền FILE_UPLOAD)
  - Tải xuống file   (quyền FILE_DOWNLOAD)
  - ・Chức năng quản trị
  - Tham chiếu log              (quyền LOG_VIEW)
  - Nhập thay cho cửa hàng bán         (quyền HANBAITEN_PROXY_INPUT) (chỉ cho phép xem và chỉnh sửa, không cho phép tạo và xóa)
- **3.3** Role: CHUO_KAI (Chuokai)
  - 【Menu hiển thị】
  - ・Quản lý độc giả (chỉ chọn được chi nhánh quản lý thuộc Chuokai của mình, không xem được độc giả của JA quản hạt)
  - Đăng ký thông tin độc giả         (quyền DOKUSYA_CREATE)
  - Import dữ liệu Excel độc giả  (quyền DOKUSYA_IMPORT)
  - Tìm kiếm chi tiết độc giả         (quyền DOKUSYA_LIST)
  - Thay thế hàng loạt cửa hàng bán độc giả   (quyền DOKUSYA_REPLACE_HANBAITEN)
  - ・Quản lý cửa hàng bán (chỉ chọn được Chuokai của mình)
  - Đăng ký thông tin cửa hàng bán         (quyền HANBAITEN_CREATE)
  - Import dữ liệu Excel cửa hàng bán  (quyền HANBAITEN_IMPORT)
  - Tìm kiếm chi tiết cửa hàng bán         (quyền HANBAITEN_LIST)
  - ・Tạo dữ liệu
  - Xuất dữ liệu chuyển khoản tài khoản     (quyền BANK_TRANSFER_EXPORT)
  - Xuất thông tin thanh toán phí giao hàng           (quyền TESURYO_SHIHARAI_EXPORT)
  - ・Tạo báo cáo (Chuokai chỉ xuất được phần của Chuokai mình)
  - Danh sách độc giả             (quyền REPORT_DOKUSYA_LIST)
  - Phiếu liên lạc tăng giảm (cửa hàng bán)     (quyền REPORT_INCREASE_DECREASE)
  - Thông báo tăng giảm (Nông nghiệp Nhật Bản) (quyền REPORT_NICHINO)
  - ・Quản lý master (Chuokai chỉ chọn được Chuokai của mình)
  - Đăng ký master đơn giá ※quản lý theo từng JA (quyền MASTER_TANKA)
  - Đăng ký master chi nhánh ※quản lý theo từng JA (quyền MASTER_SHITEN)
  - Đăng ký master JA (Chuokai chỉ chỉnh sửa được một số mục của bản ghi thuộc Chuokai mình. ※Các trường được chỉnh sửa là: Mã bưu điện, địa chỉ, số điện thoại, số FAX, địa chỉ email, tên bộ phận phụ trách, tên người phụ trách, phân loại thuế, ghi chú.)
  - ・Khác
  - Tải lên file   (quyền FILE_UPLOAD)
  - Tải xuống file   (quyền FILE_DOWNLOAD)
  - ・Chức năng quản trị
  - Tham chiếu log (chỉ tham chiếu được Chuokai của mình)              (quyền LOG_VIEW)
- **3.4** Role: JA_HONTEN (JA Honten)
  - 【Menu hiển thị】
  - ・Quản lý độc giả (chỉ chọn được JA của mình)
  - (quyền DOKUSYA_CREATE / IMPORT / LIST / REPLACE_HANBAITEN)
  - ・Quản lý cửa hàng bán (chỉ chọn được JA của mình)
  - (quyền HANBAITEN_CREATE / IMPORT / LIST)
  - ・Tạo dữ liệu
  - (quyền BANK_TRANSFER_EXPORT / TESURYO_SHIHARAI_EXPORT)
  - ・Tạo báo cáo (JA Honten chỉ xuất được phần chi nhánh quản lý của JA mình)
  - (quyền REPORT_DOKUSYA_LIST / INCREASE_DECREASE / NICHINO)
  - ・Quản lý master (chỉ chọn được JA của mình)
  - Đăng ký master đơn giá  (quyền MASTER_TANKA)
  - Đăng ký master chi nhánh (quyền MASTER_SHITEN)
  - Đăng ký master JA (JA Honten chỉ chỉnh sửa được một số mục của bản ghi thuộc JA mình. ※Các trường được chỉnh sửa là: Mã bưu điện, địa chỉ, số điện thoại, số FAX, địa chỉ email, tên bộ phận phụ trách, tên người phụ trách, phân loại thuế, ghi chú.)
  - ・Khác
  - (quyền FILE_UPLOAD / FILE_DOWNLOAD)
  - ・Chức năng quản trị
  - Tham chiếu log (chỉ tham chiếu được chi nhánh quản lý thuộc quản hạt)             (quyền LOG_VIEW)
- **3.5** Role: JA_KANRI_SHITEN (JA Chi nhánh quản lý)
  - 【Menu hiển thị】
  - ・Quản lý độc giả (chỉ chi nhánh quản lý của mình)
  - (quyền DOKUSYA_CREATE / IMPORT / LIST / REPLACE_HANBAITEN)
  - ・Quản lý cửa hàng bán phạm vi (chỉ chọn được JA của mình)
  - (quyền HANBAITEN_CREATE / IMPORT / LIST)
  - ・Tạo dữ liệu
  - (quyền BANK_TRANSFER_EXPORT / TESURYO_SHIHARAI_EXPORT)
  - ・Tạo báo cáo (chỉ xuất được phần chi nhánh quản lý của mình)
  - (quyền REPORT_DOKUSYA_LIST / INCREASE_DECREASE / NICHINO)
  - ・Quản lý master (chỉ chọn được JA của mình)
  - Đăng ký master đơn giá (quyền MASTER_TANKA)
  - Đăng ký master chi nhánh (quyền MASTER_SHITEN)
  - ・Khác
  - (quyền FILE_UPLOAD / FILE_DOWNLOAD)
  - ・Chức năng quản trị
  - Tham chiếu log (chỉ xem được tài khoản của chi nhánh quản lý mình)            (quyền LOG_VIEW)
  - 4   Chuyển sang phê duyệt độc giả đăng ký qua Web (goToApproval)
  - ※ Chỉ hiển thị nút với tài khoản xử lý độc giả bản điện tử
- **4.1** Thực hiện khi click nút「Phê duyệt độc giả đăng ký qua Web」
- **4.2** Chuyển sang màn hình tìm kiếm chi tiết độc giả
- **4.3** Tại màn hình chuyển đến, hiển thị danh sách
  - đã lọc chỉ những độc giả chờ phê duyệt (chưa phê duyệt)
  - 5   Chuyển sang nhập thay cho cửa hàng bán (goToHanbaitenDaikouNyuryoku)
  - ※ Đối tượng: chỉ tài khoản có quyền HANBAITEN_PROXY_INPUT
- **5.1** Thực hiện khi click nút「Nhập thay cho cửa hàng bán」
- **5.2** Chuyển sang màn hình tìm kiếm chi tiết master JA (hiển thị danh sách toàn bộ JA)
  - 6   Lấy・hiển thị thông báo
- **6.1** Tham số nhận: Phân loại vị trí hiển thị (dành cho màn hình menu)
- **6.2** Dữ liệu lấy:
  - ID thông báo・tiêu đề・nội dung・ngày bắt đầu công khai
  - Về việc「Hiển thị các bản ghi có publish_location=2 và oshirase_type=123」, ghi chú rõ rằng oshirase_type=4 là điều kiện của bản ghi lưu thời gian deadline
- **6.3** Điều kiện lọc:
  - ・Là thông báo dành cho màn hình menu
  - ・Ở trạng thái đã công khai
  - ・Chưa bị xóa
  - ・Ngày bắt đầu công khai là trước hoặc bằng thời điểm hiện tại
  - ・Hiển thị các bản ghi có publish_location = 2 và oshirase_type = 4
- **6.4** Trả về theo thứ tự ngày bắt đầu công khai mới nhất
- **6.5** Trường hợp lấy thành công thì trả về dữ liệu danh sách thông báo
- **6.6** Trường hợp không tìm thấy dữ liệu　→　Hiển thị thông báo ACSMS-MSG-010-001
  - 7   Lấy số lượng chờ phê duyệt
- **7.1** Tham số nhận: JA-ID
- **7.2** Dữ liệu đối tượng:
  - Liên kết bảng lịch sử độc giả với bảng độc giả để tổng hợp số lượng
- **7.3** Điều kiện lọc:
  - ・Trạng thái phê duyệt là「Chưa phê duyệt (chờ phê duyệt)」
  - ・Là độc giả gắn với JA-ID được chỉ định
  - ・Là độc giả chưa bị xóa
- **7.4** Trả về số lượng khớp với điều kiện
  - 8   Đăng xuất (logout)
- **8.1** Thực hiện khi click nút「Đăng xuất」
- **8.2** Vô hiệu hóa token xác thực ở phía server
  - ・Vô hiệu hóa Cookie bằng cách trả về Set-Cookie: token=; Max-Age=0; HttpOnly; Secure; SameSite=Strict trong response đăng xuất của backend API
  - → Hiển thị thông báo ACSMS-MSG-010-002
- **8.3** Redirect về màn hình đăng nhập
  - ・Chuyển sang màn hình đăng nhập (ACSMS-SCR-001) thông qua router
  - ・Reset lịch sử để không thể quay lại màn hình đã xác thực bằng nút back của trình duyệt

---

## Thông tin thông báo (メッセージ情報)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/03/06 | Nguyen Duyen Manh | 2026/03/12 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-010
- **Tên màn hình**: Màn hình menu
- **Tổng quan**: Màn hình menu

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-010-001 | Lấy dữ liệu thất bại. (データの取得に失敗しました。) |
| 2.0 | ACSMS-MSG-010-002 | Đã đăng xuất. (ログアウトしました。) |
