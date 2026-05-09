# Cách quản lý tài khoản (アカウントの考え方について)

## ■ Phương châm cơ bản

- Tài khoản do Nichi-Nō (日農 - Nhật Bản Nông Nghiệp Báo) quản lý
- Cho phép đăng nhập đồng thời trên 1 tài khoản
- Khi cán bộ Nichi-Nō cần đăng ký, chỉnh sửa thông tin người đọc hoặc thực hiện thao tác thay thế cửa hàng phân phối, thì mượn tài khoản của JA
- Bảng đơn giá (単価マスタ), bảng chi nhánh (支店マスタ) do JA quản lý

---

## ・Tài khoản Nichi-Nō (日農アカウント)

- Quản lý các bảng dữ liệu gốc (master) và tài khoản
- Nichi-Nō không trực tiếp xem thông tin cá nhân của người đọc JA → Chỉ cần biết số lượng phát hành của JA (chỉ cần xem được phiếu thông báo tăng/giảm)
- Khi xảy ra trường hợp bất thường, có thể nhập thay thế thông tin cửa hàng phân phối của JA (Nhập thay cửa hàng phân phối - 販売店代行入力)
- Cấp 1 tài khoản cho mỗi cán bộ phụ trách

Chuẩn bị 2 loại theo phân quyền tài khoản Nichi-Nō:

### ① Quản trị viên (管理者)
*(Bộ phận quản lý nghiệp vụ, phòng điều hành, bộ phận hoạch định tổng hợp)*

- Có quyền trực tiếp chỉnh sửa dữ liệu khi xảy ra trường hợp bất thường (vá dữ liệu trực tiếp vào DB)

**Các chức năng có thể sử dụng** *(Xem phân loại menu tại màn hình Menu)*
- Quản lý dữ liệu gốc (JA master, Kanri-Shiten master)
- Chức năng khác
- Chức năng quản trị viên
- Xem log (có thể xem tất cả)

### ② Cán bộ phụ trách (担当者)
*(1 người 1 tài khoản cho mỗi cán bộ phụ trách tăng/giảm; đối với cán bộ phụ trách tỉnh, tạo 1 tài khoản cho 1 chi nhánh và dùng chung)*

**Các chức năng có thể sử dụng**
- Quản lý dữ liệu gốc (JA master, Kanri-Shiten master)
- Chức năng khác
- Nhập thay cửa hàng phân phối
- Xem log (có thể xem tất cả)

---

## ・Tài khoản Trung ương hội (中央会アカウント)

- Trung ương hội vừa có chức năng như 1 JA, vừa có vai trò tổng hợp các JA trong tỉnh/thành phố đó
- Đôi khi trung ương hội cũng xử lý số lượng phát hành → Tuy nhiên không trực tiếp xem thông tin cá nhân người đọc của JA
- Có thể xác nhận log nhập liệu của JA trực thuộc → Có thể dùng chức năng xem log
- Có thể xác nhận số lượng phát hành của JA trực thuộc → Chỉ cần xem được phiếu thông báo tăng/giảm
- Cấp 1 tài khoản cho 1 trung ương hội (nếu có nhiều cán bộ phụ trách thì có thể cấp theo từng cán bộ)
- Quản lý số lượng phát hành của Kanri-Shiten (chi nhánh quản lý) trực thuộc trung ương hội

**Mã chi nhánh quản lý (1AA-3300-BBB)**
Chỉ có thể chọn các Kanri-Shiten có 4 chữ số ở giữa là 3300 (3 chữ số đầu xác định tỉnh/thành phố)

**Các chức năng có thể sử dụng**
- Chức năng quản lý người đọc (chỉ có thể chọn Kanri-Shiten trực thuộc trung ương hội)
- Chức năng quản lý cửa hàng phân phối
- Chức năng tạo dữ liệu
- Chức năng tạo báo cáo (xuất dữ liệu phần Kanri-Shiten trực thuộc trung ương hội)
- Chức năng quản lý dữ liệu gốc (chỉ có thể chọn Kanri-Shiten trực thuộc trung ương hội)
- Tải file xuống (có thể tham chiếu dữ liệu Kanri-Shiten trực thuộc trung ương hội + JA trực thuộc)
- Xem log (chỉ có thể xem Kanri-Shiten trực thuộc trung ương hội)

---

## ・Tài khoản JA Trụ sở chính (JA本店アカウント)

- Quản lý JA tương ứng
- Có thể xác nhận log nhập liệu của Kanri-Shiten trực thuộc
- Có thể xác nhận số lượng phát hành của Kanri-Shiten trực thuộc
- Có thể nhập thay thế cho Kanri-Shiten trực thuộc
- Cấp 1 tài khoản cho 1 JA (nếu có nhiều cán bộ phụ trách thì có thể cấp theo từng cán bộ)

**Các chức năng có thể sử dụng**
- Chức năng quản lý người đọc (chỉ có thể chọn JA của mình)
- Chức năng quản lý cửa hàng phân phối (chỉ có thể chọn JA của mình)
- Chức năng tạo dữ liệu
- Chức năng tạo báo cáo (xuất dữ liệu phần Kanri-Shiten của JA mình)
- Chức năng quản lý dữ liệu gốc
- Chức năng khác (chỉ tải file xuống)
- Xem log (chỉ có thể chọn JA của mình)

---

## ・Tài khoản JA Kanri-Shiten (JA管理支店アカウント - Chi nhánh quản lý JA)

- Quản lý Kanri-Shiten tương ứng
- Cấp 1 tài khoản cho 1 Kanri-Shiten (nếu có nhiều cán bộ phụ trách thì có thể cấp theo từng cán bộ)

**Các chức năng có thể sử dụng**
- Chức năng quản lý người đọc (chỉ có thể chọn Kanri-Shiten của mình)
- Chức năng quản lý cửa hàng phân phối (chỉ có thể chọn JA của mình)
- Chức năng tạo dữ liệu
- Chức năng tạo báo cáo (chỉ xuất dữ liệu phần Kanri-Shiten của mình)
- Chức năng quản lý dữ liệu gốc
- Chức năng khác (chỉ tải file xuống)
- Xem log (chỉ có thể xem tài khoản của Kanri-Shiten mình)

---

## ・Khác

- Vùng upload file là 1 thư mục cho 1 JA
- Tài khoản có flag về việc có xử lý phiên bản điện tử hay không
- Có xử lý phiên bản điện tử = có Kanri-Shiten
- Nếu có sử dụng phiên bản điện tử, có thể dùng chức năng phê duyệt người đọc đăng ký Web
- Tài khoản không có flag điện tử thì không thể đăng ký mới, hủy hợp đồng, phê duyệt người đọc phiên bản điện tử

---

## ■ Ma trận phân quyền (Phân loại chức năng × Loại tài khoản)

○: Có thể sử dụng　△: Có thể sử dụng có điều kiện (xem ghi chú)　×: Không thể sử dụng

| Phân loại chức năng | Chức năng (Màn hình đại diện) | Nichi-Nō (Quản trị viên) | Nichi-Nō (Cán bộ) | Trung ương hội | JA Trụ sở chính | JA Kanri-Shiten |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Đăng nhập** | Màn hình đăng nhập | ○ | ○ | ○ | ○ | ○ |
| **Menu** | Màn hình menu・Danh sách thông báo | ○ | ○ | ○ | ○ | ○ |
| **Quản lý người đọc** | Đăng ký thông tin người đọc | × | × | ○※1 | ○※1 | ○※1 |
| | Nhập dữ liệu Excel người đọc | × | × | ○※1 | ○※1 | ○※1 |
| | Tìm kiếm chi tiết người đọc | × | × | ○※1 | ○※1 | ○※1 |
| | Thay thế hàng loạt cửa hàng phân phối người đọc | × | × | ○※1 | ○※1 | ○※1 |
| **Quản lý cửa hàng phân phối** | Đăng ký thông tin cửa hàng phân phối | × | ○※2 | ○※2 | ○※2 | ○※2 |
| | Nhập dữ liệu Excel cửa hàng phân phối | × | ○※2 | ○※2 | ○※2 | ○※2 |
| | Tìm kiếm chi tiết cửa hàng phân phối | × | ○※2 | ○※2 | ○※2 | ○※2 |
| **Tạo dữ liệu** | Xuất dữ liệu chuyển khoản ngân hàng | × | × | ○ | ○ | ○ |
| | Xuất thông tin thanh toán phí giao hàng | × | × | ○ | ○ | ○ |
| **Tạo báo cáo** | Xuất danh sách người đọc | × | × | ○※3 | ○※3 | ○※3 |
| | Xuất phiếu thông báo tăng/giảm (cửa hàng phân phối) | × | × | ○※3 | ○※3 | ○※3 |
| | Xuất thông báo tăng/giảm (Nhật Bản Nông Nghiệp Báo) | × | × | ○※3 | ○※3 | ○※3 |
| **Quản lý dữ liệu gốc** | Bảng đơn giá | × | × | ○※4 | ○※4 | ○※4 |
| | JA master | ○※4 | × | ○※4 | ○※4 | × |
| | Bảng chi nhánh | × | × | ○※4 | ○※4 | ○※4 |
| | Kanri-Shiten master | ○※4 | × | × | × | × |
| **Khác** | Upload file | ○※5 | ○※5 | ○※5 | ○※5 | ○※5 |
| | Tải file xuống | ○※5 | ○※5 | ○※5 | ○※5 | ○※5 |
| **Chức năng quản trị** | Xem log | ○※6 | ○※6 | ○※6 | ○※6 | ○※6 |
| | Quản lý tài khoản | ○ | × | × | × | × |
| | Đăng ký・Chỉnh sửa thông báo | ○ | × | × | × | × |

---

## 【Ghi chú bổ sung】

**※1 Quản lý người đọc:**
Trung ương hội: Chỉ có thể chọn trung ương hội của mình (không xem được người đọc của JA trực thuộc).
JA Trụ sở chính: Chỉ có thể chọn JA của mình.
JA Kanri-Shiten: Chỉ có thể chọn Kanri-Shiten của mình.
※ Người đọc thanh toán thẻ tín dụng phiên bản điện tử・Người đọc kết hợp không thể chỉnh sửa・xóa.

**※2 Quản lý cửa hàng phân phối:**
Nichi-Nō (Cán bộ) có thể đăng ký mới・sửa thông tin cửa hàng phân phối của từng JA qua chức năng nhập thay.
Trung ương hội chỉ có thể chọn trung ương hội của mình.
JA Trụ sở chính và JA Kanri-Shiten: Chỉ có thể chọn JA của mình.

**※3 Tạo báo cáo — Xuất thông báo tăng/giảm (Nhật Bản Nông Nghiệp Báo):**
Trung ương hội xuất phần của trung ương hội mình.
JA Trụ sở chính xuất phần Kanri-Shiten của JA mình.
JA Kanri-Shiten chỉ xuất phần Kanri-Shiten của mình.
Nichi-Nō tham chiếu thông báo tăng/giảm qua chức năng tải file xuống.

**※4 Quản lý dữ liệu gốc:**
- **Bảng đơn giá:** Trung ương hội chỉ có thể chọn trung ương hội của mình. JA Trụ sở chính và JA Kanri-Shiten: Chỉ có thể chọn JA của mình.
- **Bảng chi nhánh:** Trung ương hội chỉ có thể chỉnh sửa bản ghi của trung ương hội mình. JA Trụ sở chính và JA Kanri-Shiten: Chỉ có thể chỉnh sửa bản ghi của JA mình. ※ Các trường có thể chỉnh sửa: Mã chi nhánh, Tên chi nhánh, Tên chi nhánh (katakana). (Đồng thời cập nhật các mã chi nhánh được dùng trong thông tin người đọc)
- **JA master:** Nichi-Nō chỉ quản trị viên mới thao tác được. Trung ương hội chỉ có thể chỉnh sửa một số trường trong bản ghi của trung ương hội mình. JA Trụ sở chính chỉ có thể chỉnh sửa một số trường trong bản ghi của JA mình. ※ Các trường có thể chỉnh sửa: Mã bưu điện, Địa chỉ, Số điện thoại, Số FAX, Địa chỉ email, Tên bộ phận phụ trách, Tên người phụ trách, Phân loại thuế, Ghi chú.
- **Kanri-Shiten master:** Nichi-Nō chỉ quản trị viên mới thao tác được. Trung ương hội chỉ có thể chỉnh sửa một số trường trong bản ghi của trung ương hội mình. JA Trụ sở chính chỉ có thể chỉnh sửa một số trường trong bản ghi của JA mình. JA Kanri-Shiten chỉ có thể chỉnh sửa một số trường trong bản ghi thuộc Kanri-Shiten mình. ※ Các trường có thể chỉnh sửa: Mã bưu điện, Địa chỉ, Số điện thoại, Số FAX, Ghi chú.

**※5 Tải file xuống・Upload file:**
Tải file xuống: Trung ương hội có thể tham chiếu dữ liệu của trung ương hội mình + JA trực thuộc. JA Trụ sở chính và JA Kanri-Shiten: Chỉ có thể tham chiếu dữ liệu JA của mình. Nichi-Nō có thể xem tất cả. Vùng upload file là 1 thư mục cho 1 JA.

**※6 Xem log:**
Nichi-Nō: Có thể xem log của tất cả các JA.
Trung ương hội: Chỉ có thể xem của trung ương hội mình.
JA Trụ sở chính: Chỉ có thể xem Kanri-Shiten trực thuộc.
JA Kanri-Shiten: Chỉ có thể xem tài khoản của Kanri-Shiten mình.
