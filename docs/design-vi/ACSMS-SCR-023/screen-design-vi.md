# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_ファイルアップロード画面_v1.3

# 【Khách hàng Nông nghiệp Nhật Bản】VTI Japan_Hệ thống quản lý độc giả phiên bản Cloud_Tài liệu thiết kế màn hình_Màn hình tải lên file_v1.3

---

## Trang bìa (表紙)

**Hệ thống quản lý độc giả phiên bản Cloud (クラウド版購読者管理システム)**

**Màn hình tải lên file (ファイルアップロード画面)**

**Phiên bản 1.3**

- **Mã định dạng (フォーマットコード)**: 16-BM/PM/VTI
- **Phiên bản định dạng (フォーマットバージョン)**: 2.0
- **Ngày phát hành**: 2019/04/19

---

## Lịch sử thay đổi (変更履歴)

| No | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 2026/03/16 | 1.0 | Nguyen Duyen Manh | Tạo phiên bản đầu tiên | Nguyen Huy Dat | Nguyen Huy Dat |
| 2.0 | 2026/04/10 | 1.1 | Nguyen Duyen Manh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「画面遷移」(Luồng chuyển màn hình): Sửa「10MBを超えるファイルはあるか」(có file vượt quá 10MB không) thành「30MBを超えるファイルはあるか」(có file vượt quá 30MB không)<br>2. Sheet「画面項目定義」(Định nghĩa các mục màn hình): No. 1, 13~16<br>3. Sheet「機能定義」(Định nghĩa chức năng): Bước 6.4, 8 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3.0 | 2026/05/11 | 1.2 | Vu Quang Anh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「画面イメージ」(Hình ảnh màn hình): Thêm「都道府県コード」(mã tỉnh/thành),「都道府県」(tỉnh/thành),「削除予定日」(ngày dự kiến xóa), xóa「JAコード」(mã JA),「参照ボタン」(nút tham chiếu)<br>2. Sheet「画面項目定義」(Định nghĩa các mục màn hình): Thêm「都道府県コード」,「都道府県」,「削除予定日」,「通知ステータス」(trạng thái thông báo), xóa「JAコード」,「参照ボタン」, cập nhật No.3, 6<br>6. Sheet「機能定義」(Định nghĩa chức năng): Bước 2.1, 4.1, 4.2, 6.2, 6.4, 6.5, 6.6 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4.0 | 2026/05/25 | 1.3 | Vu Quang Anh | Xử lý các vấn đề chỉ ra<br>※Vị trí sửa:<br>1. Sheet「機能定義」(Định nghĩa chức năng): Bước 4.1 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## Mục lục (目次)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Mục lục | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

| No | Tên sheet | Mô tả |
| --- | --- | --- |
|  | 2.0 | Lịch sử thay đổi (変更履歴) |
|  | 3.0 | Mục lục (目次) |
|  | 4.0 | Luồng chuyển màn hình (画面遷移) |
|  | 5.0 | Hình ảnh màn hình (画面イメージ) |
|  | 6.0 | Định nghĩa các mục màn hình (画面項目定義) |
|  | 7.0 | Định nghĩa chức năng (機能定義) |
|  | 8.0 | Thông tin thông báo (メッセージ情報) |

---

## Luồng chuyển màn hình (画面遷移)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Luồng chuyển màn hình | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

ACSMS-SCR-023: Màn hình tải lên file — Luồng chuyển màn hình

---

## Hình ảnh màn hình (画面イメージ)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Hình ảnh màn hình | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-023
- **Tên màn hình**: Màn hình tải lên file
- **Tổng quan**: Màn hình tải lên file

ACSMS-SCR-023: Màn hình tải lên file — Hình ảnh màn hình

> ※ Vui lòng tham khảo hình ảnh trong file Excel để xem hình ảnh màn hình.

---

## Định nghĩa các mục màn hình (画面項目定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa các mục màn hình | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-023
- **Tên màn hình**: Màn hình tải lên file
- **Tổng quan**: Màn hình tải lên file

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Chọn JA đối tượng (対象JA選択)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0 | Mã tỉnh/thành | todofuken_code | Select box | Ra |  | VARCHAR | — | 2.0 | Trái | — | Master JA | m_ja | Mã tỉnh/thành | todofuken_code | Hiển thị thông thường | — | Tỉnh/thành của JA của người dùng đăng nhập |
| 2.0 | Tên tỉnh/thành | todofuken_name | Select box | Ra |  | VARCHAR | — | 2.0 | Trái | — | Master JA | m_ja | Tên tỉnh/thành | todofuken_name | Hiển thị thông thường | — | Tỉnh/thành của JA của người dùng đăng nhập |
| 3.0 | Mã JA | ja_code | Select box | Vào | ○ | VARCHAR | — | 10.0 | Trái |  | Master JA | m_ja | Mã JA | ja_code | Hiển thị thông thường | — | Hiển thị trong danh sách JA |
| 3.0 | JA đối tượng | ja_id | Select box | Vào | ○ | BIGINT | — | — | Trái | Mã JA + Tên JA | Master JA | m_ja | JA ID | id | Hiển thị thông thường | — | ・Hiển thị Mã JA + Tên JA trong select box. Lấy từ m_ja.<br>・「全JA」(Tất cả JA): Khi chọn tất cả JA thì đăng ký với ja_id=NULL<br>・Cho phép tìm kiếm. |
| 4.0 | Nút thêm | btn_add_ja | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Khi nhấn, thêm JA đã chọn vào danh sách JA. |
| 5.0 | Nút xóa | btn_delete_ja | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Xóa JA khỏi danh sách |

### Chọn file (ファイル選択)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.0 | Vùng chọn file | file_input | File | Vào | ○ | FILE | — | — | — | — | — | — | — | — | — | — | ・Kéo thả hoặc click để hiển thị hộp thoại chọn file.<br>・Cho phép chọn nhiều file. 1 file ≤ 30MB. Không giới hạn định dạng file |
| 7.0 | Nút tham chiếu | btn_browse | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Khi nhấn nút「参照」(Tham chiếu) sẽ hiển thị hộp thoại chọn file |
| 7.0 | Ngày dự kiến xóa | scheduled_delete_date | Calendar | Vào | ○ | DATE | — | — | Phải | — | Bảng tải lên file | t_file_upload | Ngày dự kiến xóa | scheduled_delete_date | Sau khi chọn file | — | ・Hiển thị dưới dạng mục có thể nhập sau khi đã chọn file cần tải lên. Ngày hiển thị theo định dạng yyyymmdd.<br>・Không cho phép chọn ngày trong quá khứ. |
| 8.0 | Tên file | file_name_display | Label | Ra |  | VARCHAR | — | 255 | Trái | — | — | — | — | — | — | — | Hiển thị trong danh sách file. Định dạng tên file:「yyyymmddJaIDRole_tên file」 |
| 9.0 | Kích thước | file_size_display | Label | Ra |  | VARCHAR | — | — | Phải | #,##0 MB | — | — | — | — | — | — | Hiển thị kích thước file |
| 10.0 | Nút xóa | btn_delete_file | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Xóa file khỏi danh sách |

### Nút thao tác (アクションボタン)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11.0 | Thực hiện tải lên | btn_upload | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Tải file lên + thông báo qua email |
| 12.0 | Xóa trắng | btn_clear | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Xóa trắng JA và file đã chọn |

### Danh sách file đã tải lên (アップロードされたファイルのリスト)

| No | Tên mục | Mã mục | Kiểu mục | Vào/Ra | Bắt buộc | Kiểu dữ liệu | Min | Max | Căn lề | Định dạng | Tên bảng (logic) | Tên bảng (vật lý) | Tên cột (logic) | Tên cột (vật lý) | Điều kiện hiển thị | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13.0 | Tên file | file_name_display | Label | Ra |  | VARCHAR | — | 255 | Trái | — | Bảng tải lên file | t_file_upload | Tên file | file_name | — | — | — |
| 14.0 | Kích thước | file_size_display | Label | Ra |  | VARCHAR | — | — | Phải | x.xMB | Bảng tải lên file | t_file_upload | Kích thước file | file_size | — | — | — |
| 15.0 | Trạng thái thông báo | noti_status | Label | Ra |  | NUMBER | — | 1.0 | Phải | — | Bảng tải lên file | t_file_upload | Trạng thái thông báo | noti_status | — | — | Tùy theo trạng thái gửi email thông báo mà hiển thị một trong các trạng thái「未送信」(chưa gửi)・「送信中」(đang gửi)・「完了」(hoàn tất)・「一部失敗」(thất bại một phần). |
| 16.0 | Ngày dự kiến xóa (cột) | scheduled_delete_date | Timestamp | Ra |  | VARCHAR | — | — | Phải | — | Bảng tải lên file | t_file_upload | Ngày dự kiến xóa | scheduled_delete_date | — | — | ・Ngày hiển thị theo định dạng yyyymmdd. |
| 17.0 | Ngày xóa | deleted_at | Timestamp | Ra |  | VARCHAR | — | — | Phải | — | Bảng tải lên file | t_file_upload | Ngày xóa | deleted_at | — | — | Nếu file chưa bị xóa thì hiển thị「-」, nếu file đã bị xóa thì hiển thị ngày theo định dạng yyyymmdd. |
| 18.0 | Nút xóa | btn_delete_file | Button | — | — | — | — | — | — | — | — | — | — | — | — | — | Nếu deleted_at của file là Null thì nút được kích hoạt, nếu deleted_at khác null thì nút bị vô hiệu hóa. Trường hợp NULL nghĩa là file được lưu trữ vĩnh viễn. |

---

## Định nghĩa chức năng (機能定義)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Định nghĩa chức năng | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-023
- **Tên màn hình**: Màn hình tải lên file
- **Tổng quan**: Màn hình tải lên file

### A. Danh sách chức năng

| # | Chức năng | Mục | Sự kiện | Mô tả |
| --- | --- | --- | --- | --- |
| 1.0 | Hiển thị màn hình ban đầu | - | Hiển thị màn hình ban đầu | Mặc định hiển thị tất cả các mục ở trạng thái trống (chỉ tài khoản Nichino mới sử dụng màn hình này) |
| 2.0 | Thêm JA | Nút thêm | Click | Chọn JA từ SelectBox và thêm vào danh sách. Có kiểm tra trùng lặp. Vùng tải lên file là 1 thư mục cho mỗi JA. |
| 3.0 | Xóa JA | Nút xóa | Click | Xóa JA đã chọn khỏi danh sách |
| 4.0 | Chọn file | Nút tham chiếu | Click | Hộp thoại chọn file. Cho phép chọn nhiều file. Kiểm tra dung lượng file (trong giới hạn 30MB) |
| 5.0 | Xóa file | Nút xóa | Click | Xóa file khỏi danh sách đã chọn |
| 6.0 | Thực hiện tải lên | Tải lên | Click | Kiểm tra hợp lệ → xác nhận → lưu S3 + đăng ký DB + đưa job thông báo vào hàng đợi → phản hồi tức thì bằng HTTP 202 (việc gửi email được worker nền thực thi bất đồng bộ). Tiến độ gửi được kiểm tra ở cột「Trạng thái thông báo」. |
| 7.0 | Xóa trắng | Xóa trắng | Click | Xóa trắng JA và file đã chọn |
| 8.0 | Xóa file đã tải lên | Nút xóa | Click | Xóa file đang lưu trên S3 và cập nhật bảng t_file_upload. |

### B. Chi tiết chức năng

- **1.0** Hiển thị ban đầu
- **1.1** Chỉ tài khoản Nichino mới sử dụng màn hình này
- **1.2** Breadcrumb: Trang chủ ＞ Tải lên file
- **2.0** Thêm JA
  - 2026-01-02 00:00:00
  - ・2.1.1 Dropdown「都道府県コード」(Mã tỉnh/thành) ở trạng thái ban đầu để trống (chưa chọn).
  - ▸Khi chưa chọn mã tỉnh/thành:「都道府県」(Tỉnh/thành) để trống, select box「対象JA」(JA đối tượng) hiển thị tất cả các JA (Mã JA + Tên JA).
  - ・2.1.2 Gọi API: `GET /api/v1/todofuken` (chung) để lấy danh sách tỉnh/thành.
  - ▸Response: danh sách `[{ todofuken_code, todofuken_name }, ...]`
  - ・2.1.3 Khi nhấn vào select box「都道府県コード」(Mã tỉnh/thành):
  - ▸Hiển thị danh sách mã tỉnh/thành + tên tỉnh/thành.
  - ・2.1.4 Sau khi người dùng chọn 1 mã tỉnh/thành:
  - ▸① Tên tỉnh/thành (todofuken_name) được tự động điền vào「都道府県」(Tỉnh/thành).
  - ▸② Danh sách「Mã JA + Tên JA」tương ứng được hiển thị trong select box「対象JA」(JA đối tượng).
- **2.2** Chọn JA từ select box (lấy Mã JA - Tên JA từ m_ja)
- **2.3** Nhấn nút「Thêm」
  - ・Gọi API: GET /api/master/ja (lấy danh sách JA cho SelectBox)
  - ・Trường hợp JA bị trùng → ACSMS-MSG-023-004
  - ・Trường hợp JA hợp lệ, thêm vào danh sách JA (Mã JA + Tên JA)
- **2.4** ・Cho phép chọn nhiều JA. 1 JA = 1 bản ghi của t_file_upload
  - ・Khi chọn tất cả JA thì tạo 1 bản ghi có ja_id là NULL (phương châm 1 JA = 1 bản ghi, dành cho tất cả JA là 1 bản ghi NULL)
- **3.0** Xóa JA
- **3.1** Khi nhấn nút xóa, JA bị xóa khỏi danh sách. Không có dialog xác nhận
- **4.0** Chọn file
- **4.1** Kéo thả hoặc click để hiển thị hộp thoại chọn file. (Cho phép chọn nhiều, không giới hạn định dạng)
  - ‣Định dạng hỗ trợ tải lên
  - ・Excel：.xlsx, .xls
  - ・PDF：.pdf
  - ・Hình ảnh：.jpg, .jpeg, .png
  - ・Word：.doc, .docx
  - ・PowerPoint：.pptx, .ppt
  - ・CSV：.csv
  - ・Văn bản：.txt
  - ・File nén：.zip
- **4.2** Có kiểm tra kích thước file, nếu vượt quá 30MB → ACSMS-MSG-023-002
  - ・Trường hợp file hợp lệ, thêm vào danh sách file (định dạng hiển thị trong text box:「Tên file + Kích thước」)
  - ・Giá trị「削除予定日」(Ngày dự kiến xóa) được áp dụng đồng loạt cho tất cả các file tải lên được chọn trong giao dịch đó (không cho phép chọn ngày trong quá khứ).
- **5.0** Xóa file
- **5.1** Khi nhấn nút xóa, file tương ứng bị xóa khỏi danh sách, không có dialog xác nhận
- **6.0** Thực hiện tải lên
- **6.1** Khi nhấn nút「Thực hiện tải lên」, tiến hành kiểm tra hợp lệ
- **6.2** Trường hợp chưa chọn file → hiển thị ACSMS-MSG-023-001.
  - Trường hợp chưa chọn JA → hiển thị ACSMS-MSG-023-001.
  - Trường hợp chưa nhập「削除予定日」(Ngày dự kiến xóa) → hiển thị ACSMS-MSG-023-001.
- **6.3** Hiển thị dialog xác nhận → OK／Hủy → hiển thị ACSMS-MSG-023-008
- **6.4** OK → POST /api/file-upload (multipart/form-data: jaIds[] + files[])
  - ・API thực thi đồng bộ các xử lý sau, sau khi hoàn tất sẽ trả về 「HTTP 202 Accepted」 (không chờ việc gửi email hoàn tất):
  - ▸① Lưu file lên S3 (lưu 1 file cho mỗi JA)
  - ▸② Thêm vào t_file_upload số lượng bản ghi tương ứng với số file đã tải lên (status = 「1: đang xử lý」, noti_status = 「1: chưa gửi」).
  - ▸③ Đưa job thông báo vào hàng đợi (Redis/BullMQ). Job bao gồm danh sách file_upload_id và danh sách ja_id.
  - ・Định nghĩa S3:
  - ▸Tên bucket・cấu trúc đường dẫn (1 thư mục cho mỗi JA + 1 thư mục dành cho tất cả JA)
  - ▸Tên file tải lên: Tên file + timestamp (file trùng tên sẽ được ghi đè khi lưu)
  - ▸Thư mục dành cho tất cả JA có thể được tham chiếu từ mọi JA
  - ・Thời gian lưu trữ file: tự động xóa vào ngày xóa đã chỉ định trên màn hình. (Nếu NULL thì lưu trữ vĩnh viễn)
- **6.5** Gửi email thông báo bởi worker nền (bất đồng bộ)
  - ・Worker lấy job từ hàng đợi và xử lý gửi email tuần tự theo từng JA (để tránh throttle của AWS SES + để 1 JA thất bại không ảnh hưởng đến các JA khác).
  - ・Địa chỉ đối tượng: m_account.email cùng sub_mail_1 / sub_mail_2 / sub_mail_3 gắn với JA đối tượng.
  - ・Chỉ gửi 1 lần đến cùng một địa chỉ email (loại bỏ trùng lặp).
  - ・t_file_upload.noti_status = 「1: chưa gửi」: Trạng thái ngay sau khi file được lưu và job thông báo được đưa vào hàng đợi. Đang chờ worker nền xử lý.
  - ・Khi bắt đầu xử lý: cập nhật t_file_upload.noti_status = 「2: đang gửi」.
  - ・Gửi thành công đến tất cả địa chỉ: noti_status = 「3: hoàn tất」, ghi lại notified_at.
  - ・Thất bại ở một số JA: noti_status = 「4: thất bại một phần」, ghi lại danh sách JA thất bại vào failed_ja_ids (JSONB). Ghi chi tiết vào log lỗi (t_log, log_type=3).
- **6.6** Hiển thị màn hình
  - ・Khi nhận được response của POST, hiển thị ngay toast thành công ACSMS-MSG-023-006 và xóa trắng form.
  - ・Lấy lại「Danh sách file đã tải lên」và hiển thị badge (chưa gửi／đang gửi／hoàn tất／thất bại một phần) ở cột「Trạng thái thông báo」.
  - ・Chỉ khi API lỗi (lưu S3／đăng ký DB／đưa vào hàng đợi thất bại) → hiển thị ACSMS-MSG-023-005.
  - ・Đối với các dòng có trạng thái thông báo được đặt là「4: thất bại một phần」, ghi chi tiết vào log.
- **7.0** Nút「Xóa trắng」
- **7.1** Khi nhấn nút「Xóa trắng」, hiển thị dialog xác nhận (ACSMS-MSG-023-003)
  - Khi chọn「OK」, xóa trắng danh sách JA và danh sách file đã chọn
  - Khi chọn「Hủy」, không thực hiện xử lý gì
- **8.0** Xóa file đã tải lên
- **8.1** Khi nhấn nút「Xóa」ở cột thao tác, hiển thị popup xác nhận (ACSMS-MSG-023-009)
- **8.2** Khi xác nhận xóa, bảng được cập nhật và file trên S3 bị xóa

---

## Thông tin thông báo (メッセージ情報)

| Tên hệ thống・ứng dụng | Tài liệu | Tên sheet | Ngày tạo | Người tạo | Ngày cập nhật | Người cập nhật |
| --- | --- | --- | --- | --- | --- | --- |
| Hệ thống quản lý độc giả phiên bản Cloud | Tài liệu thiết kế màn hình | Thông tin thông báo | 2026/03/24 | Nguyen Duyen Manh | 2026/03/24 | Nguyen Duyen Manh |

- **Mã màn hình**: ACSMS-SCR-023
- **Tên màn hình**: Màn hình tải lên file
- **Tổng quan**: Màn hình tải lên file

| # | Mã thông báo | Nội dung thông báo |
| --- | --- | --- |
| 1.0 | ACSMS-MSG-023-001 | 必須項目です。<br>(Đây là mục bắt buộc.) |
| 2.0 | ACSMS-MSG-023-002 | ファイルサイズが30MBを超えています。({fileName})<br>(Kích thước file vượt quá 30MB. ({fileName})) |
| 3.0 | ACSMS-MSG-023-003 | 全てのJAとファイルを削除します。よろしいでしょうか。<br>(Sẽ xóa tất cả JA và file. Bạn có chắc chắn không?) |
| 4.0 | ACSMS-MSG-023-004 | このJAは既に選択されています。<br>(JA này đã được chọn rồi.) |
| 5.0 | ACSMS-MSG-023-005 | アップロードに失敗しました。しばらくしてから再度お試しください。<br>(Tải lên thất bại. Vui lòng thử lại sau ít phút.) |
| 6.0 | ACSMS-MSG-023-006 | ファイルのアップロードが完了しました。<br>(Đã hoàn tất tải lên file.) |
| 7.0 | ACSMS-MSG-023-007 | ファイルのアップロードは成功しましたが、メール通知の送信に失敗しました。<br>(Tải lên file thành công nhưng gửi email thông báo thất bại.) |
| 8.0 | ACSMS-MSG-023-008 | このファイルをアップロードしますか？<br>(Bạn có muốn tải lên file này không?) |
| 9.0 | ACSMS-MSG-023-009 | このファイルを削除しますか？<br>(Bạn có muốn xóa file này không?) |
