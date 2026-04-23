---
documentType: Basic Design
projectName: Hệ Thống Quản Lý Người Đọc Báo Trên Cloud
systemName: クラウド版購読者管理システム
purpose: Thiết kế cơ bản hệ thống quản lý người đọc báo cho Nippon Nōgyō Shimbun (Báo Nông Nghiệp Nhật Bản)
intendedAudience: Đội Kỹ Thuật, Trưởng Nhóm Kỹ Thuật, AI Agents
status: Draft
creationDate: 2026-03-10
version: 1.1.0
lastModified: 2026-03-24
---

# Thiết Kế Cơ Bản — Hệ Thống Quản Lý Người Đọc Báo Trên Cloud

## 1. Tổng Quan Hệ Thống

### 1.1 Mục Đích

Hệ thống **Quản Lý Người Đọc Báo Trên Cloud** (クラウド版購読者管理システム) là ứng dụng web quản lý người đọc Báo Nông Nghiệp Nhật Bản (日本農業新聞), bao gồm:

- Quản lý thông tin người đọc (bản giấy / bản điện tử / đọc cả hai)
- Quản lý đại lý phân phối (販売店)
- Tạo dữ liệu trích nợ ngân hàng (口座振替)
- Xuất thông tin thanh toán phí giao hàng
- Báo cáo danh bạ người đọc, phiếu tăng giảm
- Quản lý dữ liệu chủ (đơn giá, JA, chi nhánh, tài khoản)

### 1.2 Đối Tượng Sử Dụng

| Loại Tài Khoản | Mã quản trị | Mô Tả | Phạm Vi |
|---|---|---|---|
| Tài khoản Nichino (日農アカウント) | 1 | Quản trị viên hệ thống Báo Nông Nghiệp Nhật Bản. 2 loại: **管理者** (quản lý/sửa DB trực tiếp) và **担当者** (nhập thay đại lý, một tài khoản/người phụ trách) | Toàn bộ hệ thống |
| Tài khoản Trung ương hội (中央会アカウント) | 2 | Đóng vai trò JA nhưng còn tổng hợp các JA trong tỉnh. 1 Trung ương hội = 1 tài khoản (hoặc theo từng người phụ trách) | JA quản lý trong tỉnh + nghiệp vụ riêng của Trung ương hội |
| Tài khoản JA Trụ sở chính (JA本店アカウント) | 3 | Tài khoản JA cấp trụ sở chính. 1 JA = 1 tài khoản (hoặc theo từng người phụ trách) | JA của mình + quản lý các 管理支店 trực thuộc |
| Tài khoản JA Chi nhánh quản lý (JA管理支店アカウント) | 4 | Tài khoản chi nhánh quản lý JA. 1 管理支店 = 1 tài khoản (hoặc theo từng người phụ trách) | Chỉ 管理支店 quản lý của mình |

### 1.3 Nguyên Tắc Tài Khoản

- Tài khoản do Nichino (日農) quản lý
- Cho phép đăng nhập đồng thời 1 tài khoản từ nhiều thiết bị
- Nichino không trực tiếp xem thông tin cá nhân người đọc của JA — chỉ xem số lượng bộ (部数) qua phiếu tăng giảm (増減通知書)
- Nichino 担当者 có thể nhập thay (代行入力) thông tin đại lý cho JA trong trường hợp đặc biệt
- Nichino 管理者 có quyền sửa dữ liệu trực tiếp (patch DB) trong trường hợp bất thường
- Mỗi tài khoản có cờ xử lý bản giấy (紙版) và bản điện tử (電子版)
- Tài khoản có bản điện tử (電子版フラグ = true) → sử dụng được chức năng duyệt đăng ký web (Web申込読者承認)
- Tài khoản không có cờ điện tử → không thể đăng ký mới / giải ước / duyệt người đọc bản điện tử
- Trung ương hội: đóng vai trò JA riêng + tổng hợp các JA trong tỉnh. Chỉ xem 管理支店 có mã giữa `3300` (ví dụ: `1AA-3300-BBB`)
- JA本店: quản lý các 管理支店 trực thuộc, có thể nhập thay cho 管理支店
- JA管理支店: mỗi 管理支店 = 1 tài khoản riêng (hoặc nhiều tài khoản theo người phụ trách)

### 1.4 Phân Quyền Theo Loại Tài Khoản

| Chức năng | Nichino Quản lý | Nichino Phụ trách | Trung ương hội | JA Trụ sở | JA Chi nhánh |
|---|---|---|---|---|---|
| Quản lý người đọc | — | — | ✅ (quản lý riêng) | ✅ (JA mình) | ✅ (chi nhánh mình) |
| Quản lý đại lý | — | — | ✅ | ✅ (JA mình) | ✅ (JA mình) |
| Nhập thay đại lý | — | ✅ | — | — | — |
| Tạo dữ liệu | — | — | ✅ | ✅ | ✅ |
| Báo cáo | — | — | ✅ (quản lý riêng) | ✅ (JA mình) | ✅ (chi nhánh mình) |
| Quản lý dữ liệu chủ | — | — | ✅ (quản lý riêng) | ✅ | ✅ |
| Upload/Download file | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem log | ✅ (toàn bộ) | ✅ (toàn bộ) | ✅ (quản lý riêng) | ✅ (JA mình) | ✅ (chi nhánh mình) |
| Quản lý tài khoản | ✅ | — | — | — | — |
| Quản lý thông báo | ✅ | — | — | — | — |
| Quản lý chi nhánh quản lý | ✅ | — | — | — | — |
| Sửa DB trực tiếp (patch) | ✅ | — | — | — | — |

---

## 2. Danh Sách Chức Năng

### 2.1 Đăng Nhập

| Chức năng | Màn hình | Mô tả |
|---|---|---|
| Đăng nhập | Màn hình đăng nhập | Nhập ID/Mật khẩu, xác thực → chuyển đến Menu |

**Chi tiết:**
- Xác thực ID + Mật khẩu → nếu đúng và tài khoản đang hoạt động → chuyển đến màn hình Menu
- Hiển thị thông báo lỗi nếu sai thông tin
- Link đến PDF quy định sử dụng
- Hiển thị thông báo từ Nichino trên màn hình đăng nhập

### 2.2 Menu

| Chức năng | Mô tả |
|---|---|
| Hiển thị giờ deadline | Nguyên tắc 14:00, có thể thay đổi do tình hình giao thông |
| Hiển thị thông báo | Danh sách thông báo với nút xem chi tiết (popup) |
| Điều hướng chức năng | Các nút chuyển đến màn hình chức năng |
| Duyệt đăng ký web | Hiển thị khi có người đọc chờ duyệt (chỉ với tài khoản có bản điện tử) |

### 2.3 Quản Lý Người Đọc

#### 2.3.1 Đăng ký/Sửa thông tin người đọc

**Các trường nhập liệu:**
- Loại đăng ký (購読種別): Bản giấy (1) / Bản điện tử (2) / Đọc cả hai (3)
- Loại thủ tục (手続種類): Đăng ký mới (1) / Giải ước (0)
- Loại người đọc điện tử: Trả phí (1) / Miễn phí (0) — chỉ đọc, nhận từ hệ thống điện tử
- Chi nhánh quản lý (管理支店): dropdown
- Chi nhánh (支店): dropdown
- Mã thành viên (組合員コード)
- ID, Số lịch sử (履歴No)
- Thông tin cá nhân: Họ tên (Kanji), Họ tên (Kana), Số bộ đăng ký
- Thông tin liên lạc: Số điện thoại, Fax, Email
- Địa chỉ: Mã bưu chính, Tỉnh/Thành, Quận/Huyện, Số nhà, Tên chung cư
- Địa chỉ giao hàng: tương tự
- Đại lý giao hàng (配達販売店): dropdown
- Thông tin thanh toán: Phương thức thanh toán, Chu kỳ thanh toán, Thông tin tài khoản
- Phân loại người đọc, Phân loại nông dân
- Ngày bắt đầu đọc, Ngày ngừng đọc, Ngày bắt đầu đọc lần đầu
- Nhận bản tin email: có/không
- Phân loại bưu chính: thường / gửi bưu điện (1)
- Giới tính: Nam (1) / Nữ (2) / Không trả lời (9)
- Ghi chú

**Quy tắc nghiệp vụ:**
- Khi thay đổi thông tin → tạo bản ghi mới với số lịch sử tăng 1
- Bản ghi cũ: đặt ngày ngừng đọc = ngày áp dụng thay đổi
- Bản ghi mới: kế thừa ngày bắt đầu đọc lần đầu, đặt cờ dữ liệu mới nhất = 1
- Đại lý lần trước, số bộ lần trước, địa chỉ lần trước = giá trị từ bản ghi trước
- Giải ước → tạo bản ghi mới với loại thủ tục = Giải ước, đặt cờ giải ước = 1
- Từ giải ước sang đăng ký mới → số bộ lần trước = null, đặt cờ đăng ký mới = 1
- Nút "Không duyệt" chỉ hiển thị khi duyệt người đọc điện tử

#### 2.3.2 Lịch sử thông tin người đọc

- Gọi từ: Màn hình đăng ký thông tin người đọc
- Hiển thị toàn bộ lịch sử thay đổi của người đọc theo số lịch sử
- Cho phép xem chi tiết từng bản ghi lịch sử

#### 2.3.3 Import Excel người đọc

- Chọn file Excel, sheet, dòng tiêu đề, cột bắt đầu
- Ánh xạ cột Excel → trường dữ liệu hệ thống
- Hỗ trợ import cả bản giấy và bản điện tử cùng lúc
- Import toàn bộ hoặc toàn bộ lỗi (all-or-nothing)
- Hiển thị dòng lỗi trong popup
- Hỗ trợ cập nhật bằng mã thành viên làm khóa

#### 2.3.4 Tìm kiếm người đọc

**Điều kiện tìm kiếm:**
- Chi nhánh quản lý, Chi nhánh, Mã thành viên, Chi nhánh tài khoản trích nợ
- Họ tên (Kanji), Họ tên (Kana)
- Số liên lạc, Địa chỉ giao hàng (Tỉnh + Quận + Số nhà + Tên chung cư)
- Đại lý giao hàng, Email, Tháng bắt đầu thanh toán
- Ngày bắt đầu đọc (khoảng), Ngày ngừng đọc (khoảng)
- Bộ lọc: Đăng ký mới / Giải ước / Chờ duyệt

**Kết quả:**
- Bảng kết quả với phân trang
- Nhấp đúp → chuyển đến màn hình đăng ký thông tin người đọc
- Điều kiện ngày bắt đầu đọc = ngày bắt đầu đọc lần đầu của dữ liệu

#### 2.3.5 Thay thế đại lý hàng loạt

- Tìm kiếm người đọc theo điều kiện
- Chọn đại lý đích (đại lý thay thế)
- Nhập ngày áp dụng
- Thực hiện: tạo bản ghi giảm (ngày ngừng = ngày áp dụng) cho đại lý cũ + bản ghi tăng (ngày bắt đầu = ngày áp dụng) cho đại lý mới
- Lưu thay đổi như lịch sử

### 2.4 Quản Lý Đại Lý

#### 2.4.1 Đăng ký đại lý

**Các trường nhập liệu:**
- Mã đại lý, Tên đại lý, Số hóa đơn (Invoice)
- Mã bưu chính, Địa chỉ, Số điện thoại, Số fax, Tên giám đốc
- Phương thức ủy thác: Chuyển khoản (1) / Ủy thác qua Nichino (2) / Khác (9)
- Đơn giá phí giao hàng: dropdown (từ bảng đơn giá chủ) — hiển thị thuế tùy JA (thuế gộp / thuế riêng)
- Chu kỳ thanh toán phí giao hàng: Hàng tháng (1) / 3 tháng (2) / 6 tháng (3) / 1 năm (4) / Khác (9)
- Ai chịu phí chuyển khoản: JA (1) / Đại lý (2)
- Thông tin ngân hàng: Mã/tên ngân hàng, Mã/tên chi nhánh, Loại tài khoản, Số tài khoản, Tên chủ tài khoản

**Quy tắc nghiệp vụ:**
- Nếu có số hóa đơn → thuế gộp (内税), không có → thuế riêng (外税)
- Miễn thuế (免税事業者) → trừ thuế tiêu dùng khi thanh toán phí giao hàng
- Đơn giá đặt theo từng đại lý
- Đơn giá phải tồn tại trong bảng đơn giá chủ

#### 2.4.2 Import Excel đại lý

- Tương tự import người đọc
- Hỗ trợ cập nhật theo mã đại lý làm khóa
- Kiểm tra đơn giá trong bảng đơn giá chủ

#### 2.4.3 Tìm kiếm đại lý

- Tìm theo: Tên đại lý, Số điện thoại, Số fax, Địa chỉ, Tên giám đốc
- Kết quả hiển thị: Tên đại lý, Mã bưu chính, Địa chỉ, Số điện thoại, Số fax, Tên giám đốc, Phương thức ủy thác, Chu kỳ thanh toán, Ai chịu phí, Phí giao hàng
- Nhấp đúp → chuyển đến màn hình đăng ký đại lý
- Chọn + nút "Đăng ký đại lý" → hiển thị chi tiết

### 2.5 Tạo Dữ Liệu

#### 2.5.1 Dữ liệu trích nợ ngân hàng

- Chọn: Ngày tháng năm, Chi nhánh tài khoản (checkbox từ danh sách chi nhánh)
- Nhập: Nơi lưu dữ liệu FD, Ngày trích nợ
- Nhập thông tin JASTEM: Mã ủy thác (10 ký tự), Tên ủy thác (40 ký tự kana nửa chiều rộng)
- Nhập: Số nông hiệp (4 ký tự), Tên nông hiệp, Mã cửa hàng gửi dữ liệu, Tên cửa hàng
- Tạo file dữ liệu FD → lưu + tạo bảng kiểm tra

#### 2.5.2 Xuất thông tin thanh toán

- Chọn: Ngày cơ sở
- Logic: Lấy dữ liệu có ngày áp dụng thay đổi ≤ ngày chọn VÀ là bản ghi mới nhất của ID VÀ loại thủ tục = Đăng ký mới
- Tổng hợp theo đại lý: Đơn giá phí giao hàng × Số bộ
- Xuất Excel: Mã đại lý, Tên đại lý, Số bộ tháng này, Số tiền tháng này, Chu kỳ thanh toán, Thông tin ngân hàng, Phí chuyển khoản

### 2.6 Báo Cáo

#### 2.6.1 Danh bạ người đọc

**2 loại báo cáo:**
1. **Danh bạ theo đại lý** — dùng để tham khảo
2. **Danh bạ theo chi nhánh quản lý**

**Điều kiện:**
- Chọn: Tháng/Năm, Chu kỳ thanh toán đọc báo
- Chọn: Danh sách đại lý hoặc chi nhánh quản lý (checkbox)
- Xuất: Xem trước báo cáo hoặc Excel

**Logic trích xuất:**
- Theo ID: Ngày áp dụng thay đổi < ngày 1 tháng sau tháng chọn VÀ số lịch sử lớn nhất

**Lưu ý:** Bản điện tử sử dụng đại lý ảo (ダミー販売店)

#### 2.6.2 Phiếu tăng giảm cho đại lý

- Chọn: Ngày áp dụng, Danh sách đại lý và chi nhánh quản lý
- Logic: Trích xuất theo ngày áp dụng thay đổi = ngày áp dụng VÀ cờ báo tăng giảm = 1
- So sánh: Đại lý/đại lý lần trước, Số bộ/số bộ lần trước, Địa chỉ/địa chỉ lần trước → phản ánh vào phiếu
- Xuất: Xem trước báo cáo
- Đại lý ảo của bản điện tử không hiển thị

#### 2.6.3 Thông báo tăng giảm cho Nichino (Báo Nông Nghiệp)

- Chọn: Ngày áp dụng, Ghi chú, Danh sách chi nhánh quản lý
- Xuất theo chi nhánh quản lý
- Logic:
  - Trích xuất: Ngày áp dụng thay đổi = ngày áp dụng VÀ cờ báo tăng giảm = 1
  - **Tính số bộ hiện tại**: Lấy bản ghi mới nhất của mỗi ID có ngày áp dụng thay đổi < ngày áp dụng VÀ loại thủ tục = Đăng ký mới → tổng hợp theo đại lý
  - **Tính số tăng/giảm**: Từ bản ghi có ngày áp dụng thay đổi = ngày áp dụng → so sánh số bộ với số bộ lần trước theo ID → tổng hợp theo đại lý
  - **Số bộ mới** = Số bộ hiện tại + Số tăng - Số giảm
- Dấu ◆: Khi xuất lại cùng ngày áp dụng → đánh dấu ◆ vào vị trí có thay đổi so với lần xuất trước
- Lần xuất đầu tiên: không có ◆
- Lưu kết quả xuất với ngày tạo (chỉ giữ bản mới nhất cho mỗi ngày áp dụng)
- **Tạo biểu mẫu điện tử**: Tạo file điện tử và lưu vào kho file download
- Tên file: `yyyyMMdd_MãJA_TênChiNhánhQuảnLý_PhiếuTăngGiảm`

**Quy trình thực tế hàng tháng:**
- Khoảng ngày 25 hàng tháng → tạo phiếu tăng giảm cho ngày 1 tháng sau
- Nếu có thay đổi giữa tháng → tạo phiếu ngay với ngày áp dụng tương ứng
- Ví dụ: Ngày 26/10 nhận thông báo tăng 1 bộ từ 29/10 → tạo phiếu 29/10 VÀ cập nhật phiếu 1/11

### 2.7 Quản Lý Dữ Liệu Chủ (Master)

#### 2.7.1 Đơn giá

- **Tìm kiếm**: Theo loại đơn giá (Phí đọc báo / Phí giao hàng), Tên đơn giá
- **Đăng ký**: Mã đơn giá, Tên đơn giá, Thuế suất, Đơn giá (đã gồm thuế), Đơn giá (chưa thuế)
- Mỗi JA có bảng đơn giá riêng
- Không tự động tính toán — tất cả nhập tay
- Có thể nhập chỉ giá đã gồm thuế hoặc chỉ giá chưa thuế

#### 2.7.2 JA

- **Tìm kiếm**: Theo mã JA, Tên JA
- **Đăng ký**: Mã JA, Tên JA, Tỉnh/Thành, Mã bưu chính, Địa chỉ, Số điện thoại, Số fax, Email, Tên bộ phận phụ trách, Tên người phụ trách, Loại thuế (thuế gộp / thuế riêng), Ghi chú
- Loại thuế: Thuế gộp (1) — 内税 / Thuế riêng (2) — 外税
- Điều hướng:
  - Từ menu "Đăng ký JA" → nhấp đúp → Màn hình đăng ký JA
  - Từ menu "Nhập thay đại lý" → nhấp đúp → Màn hình tìm kiếm đại lý (của JA đó)

#### 2.7.3 Chi nhánh

- **Tìm kiếm**: Theo tên chi nhánh
- **Đăng ký**: Mã chi nhánh, Tên chi nhánh, Tên chi nhánh (Kana)
- Mỗi JA có danh sách chi nhánh riêng

#### 2.7.4 Chi nhánh quản lý

- **Tìm kiếm**: Theo mã chi nhánh quản lý, Tên chi nhánh quản lý, Số điện thoại, Số fax
- **Đăng ký**: Mã chi nhánh quản lý, Tên chi nhánh quản lý, Tỉnh/Thành, Mã bưu chính, Địa chỉ, Số điện thoại, Số fax, Cờ bản giấy, Cờ bản điện tử, Ghi chú
- Tương ứng với bảng nông hiệp trong hệ thống OA
- Mã: `1AA-3300-BBB` — 3 chữ số đầu xác định tỉnh, 3300 = mã Trung ương hội
- Trung ương hội chỉ xem/chọn chi nhánh quản lý có mã giữa = 3300

### 2.8 Chức Năng Khác

#### 2.8.1 Upload file

- Chọn đối tượng: Gửi cho JA hoặc Gửi cho Báo Nông Nghiệp
- Gửi cho JA: Chọn JA (nhập mã OA = mã chi nhánh quản lý) → thêm vào danh sách → chọn file → upload
- Gửi cho Báo Nông Nghiệp: Chọn file → upload
- 1 JA = 1 thư mục lưu trữ
- Không giới hạn định dạng file
- Hỗ trợ chọn nhiều file
- JA: chỉ dùng được "Gửi cho Báo Nông Nghiệp"
- Nichino: chỉ dùng được "Gửi cho JA"

#### 2.8.2 Download file

- Tìm kiếm: Theo tên file (tìm gần đúng), Tỉnh/Thành
- Hiển thị: Ngày giờ gửi, Người tạo (tên tài khoản), Tên file
- Sắp xếp: Ngày giờ gửi giảm dần (mới nhất trước)
- Chọn file → Xem trước
- Tên file tăng giảm: `yyyyMMdd_MãJA_TênChiNhánhQuảnLý_PhiếuLiênLạcTăngGiảm` hoặc `_PhiếuThôngBáoTăngGiảm`
- Trung ương hội: Xem file của JA trong quản lý + file riêng

### 2.9 Quản Trị

#### 2.9.1 Xem log

- Điều kiện: Khoảng thời gian (range datetime, bao gồm giờ), Loại log, ID người dùng
- Loại log:
  - Log thao tác người dùng (1) — ghi lại thao tác người dùng: đăng ký/sửa người đọc, đại lý, dữ liệu chủ
  - Log hệ thống (2) — log hệ thống: đăng nhập/đăng xuất, batch xử lý
  - Log lỗi (3) — log khi xảy ra lỗi hệ thống
  - Log upload file (4) — ghi lại upload/download file
- Phạm vi xem log theo loại tài khoản:
  - Nichino: tất cả log
  - Trung ương hội: log của các 管理支店 trong phạm vi quản lý
  - JA本店: log của toàn bộ JA mình
  - JA管理支店: log của các tài khoản thuộc 管理支店 mình
- Kết quả: Ngày giờ, ID người dùng, Tên người dùng, Tên màn hình, Thao tác, Kết quả
- Nhấp "詳細" → popup chi tiết: IP, User Agent, dữ liệu trước/sau thay đổi, thông báo lỗi
- Xuất CSV (tối đa 10,000 bản ghi)

#### 2.9.2 Quản lý tài khoản

- **Tìm kiếm**: Theo ID đăng nhập, Loại quản trị, JA, Chi nhánh quản lý
- **Kết quả**: ID đăng nhập, Mật khẩu, Loại quản trị, Tỉnh/Thành, JA, Chi nhánh quản lý, Bản giấy, Bản điện tử
- **Đăng ký**: ID đăng nhập, Mật khẩu, Loại quản trị, Tỉnh/Thành, JA, Chi nhánh quản lý, Xử lý bản giấy (checkbox), Xử lý bản điện tử (checkbox)
- Quy tắc nhập theo loại quản trị:
  - Nichino (1): Tỉnh/JA/Chi nhánh không cần
  - Trung ương hội (2): JA/Chi nhánh không cần
  - JA Trụ sở (3): Chi nhánh không cần
  - JA Chi nhánh (4): tất cả bắt buộc

#### 2.9.3 Thông báo

- Tạo/Sửa thông báo: Tiêu đề, Vị trí hiển thị (Màn hình đăng nhập (1) / Màn hình menu (2)), Trạng thái (Nháp (1) / Công khai (2) / Ẩn (3)), Thời gian hiển thị, Nội dung
- Danh sách thông báo với nút Sửa

---

## 3. Mô Hình Dữ Liệu Người Đọc

### 3.1 Cấu Trúc Bản Ghi

Mỗi người đọc có nhiều bản ghi (lịch sử). Khi thay đổi thông tin → tạo bản ghi mới, không sửa bản ghi cũ.

| Trường | Mô tả | Ghi chú |
|---|---|---|
| ID | Mã người đọc | Không đổi qua các lịch sử |
| Số lịch sử (履歴番号) | Số thứ tự lịch sử | Tăng dần |
| Đại lý (販売店) | Đại lý hiện tại | |
| Đại lý lần trước (前回販売店) | Đại lý lần trước | Từ bản ghi có số lịch sử - 1 |
| Số bộ (購読部数) | Số bộ hiện tại | |
| Số bộ lần trước (前回購読部数) | Số bộ lần trước | Null nếu từ giải ước → đăng ký mới |
| Địa chỉ (住所) | Địa chỉ hiện tại | |
| Địa chỉ lần trước (前回住所) | Địa chỉ lần trước | |
| Loại thủ tục (手続種別) | Đăng ký mới (1) / Giải ước (0) | |
| Ngày bắt đầu đọc (購読開始日) | Ngày bắt đầu đọc | Của bản ghi hiện tại |
| Ngày ngừng đọc (購読中止日) | Ngày ngừng đọc | Đặt khi có bản ghi mới hoặc giải ước |
| Ngày đọc lần đầu (初回購読開始日) | Ngày đọc lần đầu tiên | Kế thừa qua các bản ghi, reset khi giải ước → đăng ký mới |
| Ngày áp dụng thay đổi (変更適用日) | Ngày áp dụng thay đổi | |
| Cờ dữ liệu mới nhất (最新データフラグ) | Cờ dữ liệu mới nhất | 1 = bản ghi hiện hành |
| Cờ báo tăng giảm (増減報告フラグ) | Cờ cần báo tăng giảm | 1 = cần báo cáo |
| Cờ đăng ký mới (新規フラグ) | Cờ đăng ký mới | 1 = đăng ký mới hoặc giải ước → đăng ký mới |
| Cờ giải ước (解約フラグ) | Cờ giải ước | 1 = giải ước |

### 3.2 Các Kịch Bản Thay Đổi

1. **Thay đổi thông tin (ví dụ: tài khoản ngân hàng)**
   - Bản ghi cũ: đặt ngày ngừng đọc = ngày áp dụng, cờ dữ liệu mới nhất = 0
   - Bản ghi mới: số lịch sử + 1, ngày bắt đầu đọc = ngày áp dụng, kế thừa ngày đọc lần đầu

2. **Thay đổi đại lý (chuyển nhà)**
   - Tương tự kịch bản 1, nhưng đại lý lần trước = đại lý cũ, cờ báo tăng giảm = 1

3. **Tăng số bộ**
   - Tương tự, số bộ lần trước = số cũ, cờ báo tăng giảm = 1

4. **Giải ước**
   - Bản ghi mới: loại thủ tục = Giải ước, cờ giải ước = 1, cờ báo tăng giảm = 1
   - Khi giải ước, số bộ = 0 (nút giải ước tự động đặt số bộ về 0)

5. **Đăng ký lại sau giải ước**
   - Bản ghi mới: loại thủ tục = Đăng ký mới, cờ đăng ký mới = 1, số bộ lần trước = null
   - Ngày đọc lần đầu = ngày đăng ký mới (không kế thừa)

6. **Hoàn tác**
   - Xóa bản ghi mới nhất (số lịch sử lớn nhất)
   - Bản ghi trước: nếu loại thủ tục = Đăng ký mới → xóa ngày ngừng đọc, đặt cờ dữ liệu mới nhất = 1
   - Nếu loại thủ tục = Giải ước → chỉ đặt cờ dữ liệu mới nhất = 1

7. **Chuyển nhà không đổi đại lý**
   - Tương tự kịch bản 1, nhưng so sánh địa chỉ và địa chỉ lần trước, nếu khác → xuất vào cột thay đổi địa chỉ trong phiếu tăng giảm

8. **Sửa trực tiếp (không tạo lịch sử)**
   - Trường hợp ngày nhập sai → sửa bản ghi hiện tại mà không tăng số lịch sử

### 3.3 Các Mẫu Cần/Không Cần Liên Lạc Đại Lý

**Cần liên lạc đại lý (cờ báo tăng giảm = 1):**
- Thay đổi số bộ
- Thay đổi đại lý (chuyển nhà)
- Thay đổi địa chỉ

**KHÔNG cần liên lạc đại lý:**
- Thay đổi tên (đăng ký lại mới)
- Thay đổi số điện thoại
- Thay đổi thông tin tài khoản ngân hàng

### 3.4 Logic Trích Xuất Cho Báo Cáo

#### Danh bạ người đọc

```
WHERE ngày_áp_dụng_thay_đổi < [tháng chọn + 1]/01
GROUP BY ID → MAX(số_lịch_sử)
```

#### Phiếu tăng giảm đại lý

```
WHERE ngày_áp_dụng_thay_đổi = [ngày_áp_dụng]
  AND cờ_báo_tăng_giảm = 1
→ So sánh: đại_lý/đại_lý_lần_trước, số_bộ/số_bộ_lần_trước, địa_chỉ/địa_chỉ_lần_trước
```

#### Thông báo tăng giảm

```
-- Tính số bộ hiện tại:
WHERE ngày_áp_dụng_thay_đổi < [ngày_áp_dụng]
  AND loại_thủ_tục = 'đăng_ký_mới'
GROUP BY ID → MAX(số_lịch_sử)
→ SUM(số_bộ) GROUP BY đại_lý

-- Tính tăng giảm:
WHERE ngày_áp_dụng_thay_đổi = [ngày_áp_dụng]
  AND cờ_báo_tăng_giảm = 1
→ Theo ID: (số_bộ - số_bộ_lần_trước) → tổng hợp theo đại_lý
```

---

## 4. Bảng Mã Định Nghĩa

### 4.1 Loại đăng ký (購読種別)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 紙版 | Bản giấy |
| 2 | 電子版 | Bản điện tử |
| 3 | 併読 | Đọc cả hai |

### 4.2 Loại thủ tục (手続種類)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 0 | 解約 | Giải ước |
| 1 | 新規 | Đăng ký mới |

### 4.3 Loại người đọc điện tử (電子版読者種別)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 0 | 無料 | Miễn phí |
| 1 | 有料 | Trả phí |

### 4.4 Bản tin email (メールマガジン)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 0 | 配信しない | Không gửi |
| 1 | 配信する | Gửi |

### 4.5 Giới tính (性別)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 男性 | Nam |
| 2 | 女性 | Nữ |
| 9 | 回答しない | Không trả lời |

### 4.6 Phân loại bưu chính (郵便区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 0 | (trống) | (trống) |
| 1 | 郵送 | Gửi bưu điện |

### 4.7 Phương thức thanh toán (支払方法)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 口座引落 | Trích nợ tài khoản |
| 2 | 現金集金 | Thu tiền mặt |
| 3 | 振込集金 | Chuyển khoản |
| 4 | JA施設等 | Cơ sở JA |
| 5 | 給与天引き | Khấu trừ lương |
| 6 | クレジットカード | Thẻ tín dụng |
| 9 | その他 | Khác |

### 4.8 Chu kỳ thanh toán đọc báo (購読料支払区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 01 | 毎月 | Hàng tháng |
| 02 | ３ヶ月前払 | 3 tháng trả trước |
| 03 | ３ヶ月後払 | 3 tháng trả sau |
| 04 | ６ヶ月前払 | 6 tháng trả trước |
| 05 | ６ヶ月後払 | 6 tháng trả sau |
| 06 | １年前払 | 1 năm trả trước |
| 07 | １年後払 | 1 năm trả sau |
| 08 | 支払除外 | Miễn thanh toán |

### 4.9 Loại tài khoản ngân hàng (引落口座貯金種目)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 普通 | Tài khoản thông thường |
| 2 | 当座 | Tài khoản vãng lai |

### 4.10 Phân loại người đọc (購読者層分類)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 01 | 農業者 | Nông dân |
| 02 | ＪＡグループ役職員 | Nhân viên JA |
| 03 | 企業・団体 | Doanh nghiệp/Tổ chức |
| 04 | 学生 | Sinh viên |
| 99 | その他 | Khác |

### 4.11 Phân loại nông dân (農業者分類)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 01 | 米 | Gạo |
| 02 | 野菜 | Rau |
| 03 | 果実 | Trái cây |
| 04 | 花 | Hoa |
| 05 | 畜産 | Chăn nuôi |
| 06 | 酪農 | Bò sữa |
| 99 | その他 | Khác |

### 4.12 Phương thức ủy thác (委託区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 振込 | Chuyển khoản trực tiếp |
| 2 | 日農への委託 | Ủy thác qua Nichino |
| 9 | その他 | Khác |

### 4.13 Chu kỳ thanh toán phí giao hàng (配達手数料支払区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 毎月 | Hàng tháng |
| 2 | ３ヶ月 | 3 tháng |
| 3 | ６か月 | 6 tháng |
| 4 | １年 | 1 năm |
| 9 | その他 | Khác |

### 4.14 Ai chịu phí chuyển khoản (手数料区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | JA | JA |
| 2 | 販売店 | Đại lý |

### 4.15 Loại quản trị viên (管理者区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 日農アカウント | Tài khoản Nichino |
| 2 | 中央会アカウント | Tài khoản Trung ương hội |
| 3 | JA本店アカウント | Tài khoản JA Trụ sở chính |
| 4 | JA管理支店アカウント | Tài khoản JA Chi nhánh quản lý |

### 4.16 Loại log (ログ種別)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | ユーザー操作ログ | Log thao tác người dùng |
| 2 | システムログ | Log hệ thống |
| 3 | エラーログ | Log lỗi |
| 4 | ファイルアップロード | Log upload file |

### 4.17 Vị trí hiển thị thông báo (公開場所)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | ログイン画面 | Màn hình đăng nhập |
| 2 | メニュー画面 | Màn hình menu |

### 4.18 Trạng thái thông báo (状態)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 下書き | Nháp |
| 2 | 公開 | Công khai |
| 3 | 非公開 | Ẩn |

### 4.19 Phân loại thuế (税区分)

| Giá trị | Tên tiếng Nhật | Tên tiếng Việt |
|---|---|---|
| 1 | 内税 | Thuế gộp (đã bao gồm thuế) |
| 2 | 外税 | Thuế riêng (chưa bao gồm thuế) |

---

## 5. Sơ Đồ Điều Hướng Màn Hình

```
Màn hình đăng nhập
  └──► Màn hình menu
        ├── Quản lý người đọc
        │   ├──► Đăng ký thông tin người đọc ◄──── Tìm kiếm người đọc (nhấp đúp)
        │   │       └──► Lịch sử thông tin người đọc
        │   ├──► Import Excel người đọc
        │   ├──► Tìm kiếm người đọc ◄──── Duyệt đăng ký web
        │   └──► Thay thế đại lý hàng loạt
        │
        ├── Quản lý đại lý
        │   ├──► Đăng ký đại lý ◄──── Tìm kiếm đại lý (nhấp đúp)
        │   ├──► Import Excel đại lý
        │   └──► Tìm kiếm đại lý ◄──── Tìm kiếm JA (nhập thay đại lý)
        │
        ├── Tạo dữ liệu
        │   ├──► Xuất dữ liệu trích nợ ngân hàng
        │   └──► Xuất thông tin thanh toán
        │
        ├── Báo cáo
        │   ├──► Xuất danh bạ người đọc
        │   ├──► Xuất phiếu tăng giảm (đại lý)
        │   └──► Xuất thông báo tăng giảm (Báo Nông Nghiệp)
        │
        ├── Quản lý dữ liệu chủ
        │   ├──► Tìm kiếm đơn giá ──► Đăng ký đơn giá
        │   ├──► Tìm kiếm JA ──► Đăng ký JA
        │   ├──► Tìm kiếm chi nhánh ──► Đăng ký chi nhánh
        │   └──► Tìm kiếm chi nhánh quản lý ──► Đăng ký chi nhánh quản lý
        │
        ├── Chức năng khác
        │   ├──► Upload file
        │   └──► Download file
        │
        └── Quản trị
            ├──► Xem log
            ├──► Tìm kiếm tài khoản ──► Đăng ký tài khoản
            └──► Danh sách thông báo
```

---

## 6. Công Nghệ Sử Dụng

| Tầng | Công nghệ |
|---|---|
| Giao diện (Frontend) | Vue 3 + TypeScript + Ant Design Vue + TailwindCSS + Pinia + Vue Router 4 |
| Máy chủ (Backend) | NestJS + TypeORM + PostgreSQL 16 + JWT |
| Xác thực | JWT Bearer Token, mã hóa mật khẩu bcrypt |
| Lưu trữ file | Hệ thống file phía máy chủ (1 thư mục mỗi JA) |
| Báo cáo | Xuất Excel + Xem trước báo cáo (HTML/PDF) |
| Import | Phân tích file Excel (giao diện ánh xạ cột) |

---

## 7. Lịch Trình Dự Kiến

| Giai đoạn | Thời gian | Chịu trách nhiệm |
|---|---|---|
| Khởi động dự án | Tháng 4/2025 | Bộ phận quản lý nghiệp vụ |
| Khảo sát JA | Tháng 4–6/2025 | Văn phòng ban lãnh đạo, Bộ phận quản lý nghiệp vụ |
| Chỉnh lý yêu cầu | Tháng 6–8/2025 | Văn phòng ban lãnh đạo |
| Chọn nhà cung cấp | Tháng 8–9/2025 | Văn phòng ban lãnh đạo |
| Thiết kế & phát triển | Tháng 9/2025–Tháng 6/2026 | Nhà cung cấp |
| Kiểm thử | Tháng 6–9/2026 | Văn phòng ban lãnh đạo, Bộ phận quản lý nghiệp vụ |
| Vận hành thử (JA mẫu) | Tháng 9/2026–Tháng 3/2027 | JA mẫu |
| Đào tạo | Tháng 12/2026–Tháng 3/2027 | Cục sự nghiệp hợp tác |
| Chạy chính thức | Tháng 4/2027 | Toàn bộ |

---

## 8. Ghi Chú Quan Trọng

1. **Màn hình đã loại bỏ:**
   - Màn hình xử lý xác nhận — đã loại bỏ
   - Màn hình xuất dữ liệu thanh toán — không tạo dữ liệu trích nợ, đã loại bỏ
   - Bảng quản lý theo tháng — đã loại bỏ
   - Hóa đơn — đã loại bỏ

2. **Tích hợp hệ thống điện tử:**
   - Nhận thông tin người đọc bản điện tử từ hệ thống bên ngoài
   - Loại người đọc điện tử chỉ đọc (read-only)
   - Dùng đại lý ảo cho người đọc bản điện tử

3. **Quản lý file:**
   - Upload: 1 JA = 1 thư mục, không giới hạn định dạng
   - Download: Tìm theo tên file, lọc theo tỉnh/thành
   - File tăng giảm được tạo tự động bởi chức năng tạo biểu mẫu điện tử

4. **Đa ngôn ngữ:**
   - Hệ thống sử dụng tiếng Nhật
   - Tài liệu thiết kế: Tiếng Việt (mô tả) + Tiếng Nhật (thuật ngữ nghiệp vụ) + Tiếng Anh (code)

---

## 9. Chức Năng Ngoài Phạm Vi

| Phân loại | Tên chức năng | Mô tả |
|---|---|---|
| Ngoài phạm vi | Quản lý nợ chưa thu | Quản lý nợ chưa thu phí đọc báo nằm ngoài phạm vi hệ thống này |
| Phát triển giai đoạn 2 | Quản lý JA cho người đọc song song | Quản lý phía JA cho người đọc đọc song song bản giấy và bản điện tử hiện đánh giá là khó khăn, xem xét từ giai đoạn 2 |
| Phát triển giai đoạn 2 | Liên kết tự động hệ thống OA | Tự động liên kết thông tin tăng giảm bản giấy với hệ thống OA. Giai đoạn hiện tại áp dụng biểu mẫu điện tử. Thiết kế duy trì khả năng chuyển sang liên kết tự động |

---

## 10. Quy Tắc Nghiệp Vụ — Loại Đọc Báo / Phân Loại Xử Lý

### 10.1 Loại Báo

Hệ thống xử lý 3 loại: **Bản giấy**, **Bản điện tử**, **Đọc song song** (bản giấy + bản điện tử).

### 10.2 Phân Loại Xử Lý

| Phân loại | Tổng quan | Ghi chú |
|---|---|---|
| **JA xử lý** | Người đọc mà JA thu phí đọc báo. Hệ thống này quản lý loại này. JA là chủ thể hợp đồng. JA thu phí đọc, Nichino tính giá sỉ theo số bộ cho JA (từ OA). Chênh lệch = hoa hồng JA. | Bản giấy cơ bản là JA xử lý. Bản điện tử thẻ tín dụng nếu chọn JA khi đăng ký → vẫn là JA xử lý. |
| **Nichino xử lý** | Người đọc mà Nichino thu phí đọc báo. Hệ thống này KHÔNG xử lý. Nichino là cửa sổ trực tiếp, không qua JA. Không trả hoa hồng cho JA. | Bản điện tử thẻ tín dụng: Nichino thu / JA thực tích hoặc Nichino thu / Nichino thực tích. |
| **Cửa hàng xử lý** | Người đọc mà cửa hàng báo thu phí. Hệ thống này KHÔNG xử lý. Chỉ có bản giấy. | Không tồn tại cho bản điện tử và đọc song song. |

### 10.3 Bảng Đối Chiếu Loại Báo × Phân Loại Xử Lý

| Loại báo | JA xử lý | Nichino xử lý | Cửa hàng xử lý |
|---|---|---|---|
| Bản giấy | ○ (JA thu phí, ghi nợ tài khoản) | ○ (Ghi nợ tài khoản) | ○ (Cửa hàng thu, ghi nợ, thẻ tín dụng) |
| Bản điện tử | ○ (JA thu, ghi nợ, hoặc thẻ tín dụng có chọn JA) | ○ (Chỉ thẻ tín dụng, không chọn JA) | × |
| Đọc song song | ○ (Chỉ thẻ tín dụng, có chọn JA) | ○ (Chỉ thẻ tín dụng, không chọn JA) | × |

> Hệ thống này chỉ xử lý cột "JA xử lý". Hàng thẻ tín dụng JA không thể chỉnh sửa.

### 10.4 Mẫu Thanh Toán Bản Điện Tử

| Mẫu | Phương thức thanh toán | Thực tích | Liên kết Cloud |
|---|---|---|---|
| ① | Ghi nợ tài khoản / JA thu | JA thực tích | ○ |
| ② | Thẻ tín dụng / Nichino thu | JA thực tích | ○ |
| ③ | Thẻ tín dụng / Nichino thu | Nichino thực tích | × |
| ④ | Người đọc miễn phí | Có chọn JA | ○ |

> Thực tích quyết định bởi việc chọn JA khi đăng ký.

### 10.5 Xử Lý Đơn Giá Chiến Dịch

- Hệ thống quản lý bản điện tử hiện tại chỉ hỗ trợ 1 đơn giá duy nhất
- Đơn giá chiến dịch hiện được nhập thủ công vào hệ thống OA
- Hệ thống cloud cho phép đăng ký đơn giá chiến dịch, nhưng liên kết tự động với hệ thống điện tử chỉ áp dụng đơn giá thông thường
- Người đọc bản điện tử có đơn giá chiến dịch do Phòng Tổng hợp kế hoạch xử lý vận hành

### 10.6 Chi Tiết Đọc Song Song

- **Giới hạn:** Chỉ thanh toán thẻ tín dụng. JA không thể đăng ký (JA chỉ đăng ký được bản điện tử ghi nợ tài khoản). Người đọc muốn thẻ tín dụng phải tự đăng ký từ trang web chính thức.
- **Đơn giá:** Hiện tại 1 JA = 1 đơn giá. Có thể tăng trong tương lai.
- **Kiểm soát:** Bản điện tử / đọc song song thanh toán thẻ tín dụng → JA không thể đăng ký / chỉnh sửa / xóa

---

## 11. Chi Tiết Phân Quyền Tài Khoản

### 11.1 Tài Khoản Nichino — Quản Trị Viên

- Phòng ban: Bộ phận quản lý nghiệp vụ, Văn phòng ban lãnh đạo, Phòng Tổng hợp kế hoạch
- Có quyền chỉnh sửa trực tiếp DB khi sự cố bất thường (patch)
- **Chức năng:** Quản lý master (JA, Chi nhánh quản lý), Chức năng khác, Chức năng quản trị, Xem log (tất cả)

### 11.2 Tài Khoản Nichino — Nhân Viên Phụ Trách

- 1 tài khoản/người phụ trách tăng giảm, tài khoản chia sẻ cho chi nhánh tỉnh
- **Chức năng:** Quản lý master (JA, Chi nhánh quản lý), Chức năng khác, Nhập thay đại lý, Xem log (tất cả)

### 11.3 Tài Khoản Trung Ương Hội

- Trung ương hội = 1 JA + tổng hợp các JA trong tỉnh
- Có thể quản lý số bộ, xem thông báo tăng giảm, xem log của JA trực thuộc
- Phát hành 1 tài khoản/trung ương hội (thêm nếu nhiều nhân viên)
- Chỉ chọn được chi nhánh quản lý có mã giữa = 3300
- **Chức năng:** Quản lý người đọc (riêng), Quản lý đại lý, Tạo dữ liệu, Báo cáo (riêng), Master (riêng), Tải file (riêng + JA trực thuộc), Xem log (riêng)

### 11.4 Tài Khoản JA Trụ Sở

- Quản lý JA đó, xem log/số bộ chi nhánh trực thuộc
- Có thể nhập thay cho chi nhánh trực thuộc
- Phát hành 1 tài khoản/JA
- **Chức năng:** Quản lý người đọc (JA), Quản lý đại lý (JA), Tạo dữ liệu, Báo cáo (JA), Master, Tải file (JA), Xem log (JA)

### 11.5 Tài Khoản JA Chi Nhánh

- Quản lý chi nhánh đó
- Phát hành 1 tài khoản/chi nhánh
- **Chức năng:** Quản lý người đọc (chi nhánh), Quản lý đại lý (JA), Tạo dữ liệu, Báo cáo (chi nhánh), Master, Tải file (JA), Xem log (chi nhánh)

### 11.6 Ma Trận Quyền Hạn Chi Tiết

> ○: Sử dụng được　×: Không sử dụng được

| Phân loại | Chức năng | Nichino QTV | Nichino NV | Trung ương hội | JA Trụ sở | JA Chi nhánh |
|---|---|---|---|---|---|---|
| Đăng nhập | Đăng nhập | ○ | ○ | ○ | ○ | ○ |
| Menu | Menu / Thông báo | ○ | ○ | ○ | ○ | ○ |
| Quản lý người đọc | Đăng ký/Sửa/Import/Tìm kiếm/Thay thế | × | × | ○※1 | ○※1 | ○※1 |
| Quản lý đại lý | Đăng ký/Import/Tìm kiếm | × | ○※2 | ○※2 | ○※2 | ○※2 |
| Tạo dữ liệu | Ghi nợ / Thanh toán | × | × | ○ | ○ | ○ |
| Báo cáo | Danh bạ / Tăng giảm | × | × | ○※3 | ○※3 | ○※3 |
| Quản lý master | Đơn giá / Chi nhánh | × | × | ○※4 | ○※4 | ○※4 |
| Quản lý master | JA / Chi nhánh quản lý | ○※4 | ○※4 | × | × | × |
| Khác | Upload/Download file | ○※5 | ○※5 | ○※5 | ○※5 | ○※5 |
| Quản trị | Xem log | ○※6 | ○※6 | ○※6 | ○※6 | ○※6 |
| Quản trị | Quản lý tài khoản | ○ | × | × | × | × |
| Quản trị | Thông báo | ○ | × | × | × | × |

**Ghi chú:**
- **※1:** Trung ương hội: chỉ chi nhánh quản lý riêng. JA Trụ sở: chỉ JA mình. JA Chi nhánh: chỉ chi nhánh mình. Người đọc bản điện tử thẻ tín dụng / đọc song song không thể chỉnh sửa/xóa.
- **※2:** Nichino Nhân viên sửa đại lý qua chức năng nhập thay. Trung ương hội: chỉ riêng. JA: chỉ JA mình.
- **※3:** Nichino tham khảo thông báo tăng giảm qua tải file xuống. Mỗi loại tài khoản chỉ xuất phần mình.
- **※4:** Đơn giá / Chi nhánh: mỗi loại chỉ quản lý phần mình. JA / Chi nhánh quản lý: chỉ Nichino quản lý.
- **※5:** Tải xuống — Trung ương hội: riêng + JA trực thuộc. JA: chỉ JA mình. Nichino: tất cả. Vùng tải lên: 1 thư mục/JA.
- **※6:** Nichino: tất cả. Trung ương hội: riêng. JA Trụ sở: chi nhánh trực thuộc. JA Chi nhánh: chỉ tài khoản mình.

### 11.7 Lưu Ý Tài Khoản

- Có cờ xử lý bản điện tử → sử dụng được phê duyệt đăng ký Web
- Tài khoản không có cờ bản điện tử → không thể đăng ký mới/hủy/phê duyệt người đọc bản điện tử
- Khi nhân viên Nichino cần đăng ký/sửa người đọc hoặc thay thế đại lý → mượn tài khoản JA

---

## 12. Phân Tích Hiện Trạng / Mục Tiêu (As-Is / To-Be)

### 12.1 Tổng Quan

Đổi mới hệ thống quản lý người đọc phiên bản Excel, xây dựng hệ thống thế hệ mới trên cloud.

**Mục tiêu chính:**
1. Quản lý tập trung thông tin người đọc (tích hợp bản giấy và bản điện tử)
2. Bỏ liên lạc tăng giảm qua FAX
3. Hiệu quả hóa nghiệp vụ tạo dữ liệu ghi nợ tài khoản

### 12.2 Bảng So Sánh

| # | Hiện trạng (As-Is) | → | Mục tiêu (To-Be) |
|---|---|---|---|
| ① Quản lý người đọc | Bản giấy và bản điện tử quản lý bằng hệ thống khác nhau. Chi phí quản lý tăng, rủi ro không nhất quán. | → | Quản lý tập trung trên cùng 1 hệ thống. Hiệu quả hóa đăng ký/sửa/xóa. |
| ② Liên lạc tăng giảm | Liên lạc qua FAX. Gánh nặng thủ công, rủi ro sót/nhập sai. | → | Biểu mẫu điện tử. JA nhấn nút → email tự động thông báo Nichino. Bỏ hoàn toàn FAX. |
| ③ Liên kết hệ thống | Không liên kết với OA và hệ thống điện tử. Sao chép dữ liệu thủ công. | → | Liên kết 2 chiều với hệ thống điện tử. Xuất CSV cho OA (chuẩn bị liên kết tự động tương lai). |
| ④ Ghi nợ tài khoản | Tạo dữ liệu ghi nợ thủ công. | → | Xuất dữ liệu ghi nợ theo định dạng Zengin. |
| ⑤ Công việc hành chính | Thủ tục/liên lạc thủ công. Giờ chốt phụ thuộc cá nhân. | → | Tự động hóa/hiệu quả hóa. Hiển thị giờ chốt trên hệ thống. |

### 12.3 Vấn Đề Chính

| # | Vấn đề | Phương hướng |
|---|---|---|
| 1 | Chưa xác định cách thông báo sáp nhập cửa hàng báo | Thông báo qua tải file lên. Gửi email cho JA, JA tự phản ánh vào master. |
| 2 | Phương thức liên kết OA | Không liên kết tự động. Xem biểu mẫu điện tử → nhập thủ công vào OA. Tạo CSV trên cloud chuẩn bị cho tương lai. |
| 3 | Quản lý đọc song song | Hiện đánh giá khó khăn. Xem xét từ giai đoạn 2. |
| 4 | Thống nhất định dạng ghi nợ | Định dạng Zengin. Định dạng khác → xuất Excel để JA tự xử lý. |
| 5 | Hỗ trợ tính theo ngày | Hệ thống không lưu đơn giá theo ngày. |
| 6 | Nhận thức giờ chốt phía JA | Hiển thị giờ chốt trên hệ thống (không liên kết với giờ chốt thực tế). |
| 7 | Nhập dữ liệu ban đầu | Bộ phận quản lý nghiệp vụ hỗ trợ JA nhập dữ liệu ban đầu qua chức năng import. Master khó nhập qua hệ thống → xử lý riêng. |

---

## 13. Yêu Cầu Phi Chức Năng

| Danh mục | Hạng mục | Nội dung yêu cầu |
|---|---|---|
| **Hiệu năng** | Tốc độ phản hồi | Hoạt động bình thường trên đường truyền chậm (dưới 1Mbps) — xét đến vùng nông thôn JA |
| | Số người dùng đồng thời | Ổn định khi 100 nhân viên JA sử dụng đồng thời |
| | Khả năng mở rộng | Nâng/hạ cấu hình server theo số người dùng (AWS Auto Scaling) |
| | Khả dụng | Uptime mục tiêu 99%+/năm (downtime tối đa 87.6 giờ/năm). Sẵn sàng khôi phục khi sự cố. |
| **Bảo mật** | Kiểm soát truy cập | Quyền theo vai trò (Nichino / Trung ương hội / JA Trụ sở / JA Chi nhánh) |
| | Xác thực | ID/Mật khẩu bắt buộc. Hỗ trợ MFA khi cần. |
| | Bảo vệ dữ liệu | Mã hóa lưu trữ/truyền tải thông tin cá nhân. Chống truy cập trái phép/rò rỉ. Tuân thủ Luật bảo vệ thông tin cá nhân. |
| | Log kiểm toán | Ghi lịch sử thao tác người dùng, có thể tham khảo |
| **Mở rộng / Bảo trì** | Khả năng mở rộng | Thiết kế linh hoạt cho thêm chức năng tương lai (giai đoạn 2: quản lý đọc song song, v.v.) |
| | Sao lưu | Sao lưu hàng ngày, đảm bảo khôi phục khi thảm họa |
| | Bảo trì | Quản lý phiên bản/sao lưu, tài liệu vận hành/bảo trì |
| **Thao tác** | Giao diện | Thiết kế trực quan, dễ hiểu. Người không thành thạo kỹ thuật số cũng sử dụng được. |
| | Trợ giúp | Xem hướng dẫn sử dụng và FAQ từ trong màn hình |
| **Liên kết** | Hệ thống OA | Tạo CSV trên cloud. Thiết kế sẵn cho liên kết tự động tương lai. |
| | Hệ thống điện tử | Liên kết dữ liệu 2 chiều. Thông báo cảnh báo khi lỗi liên kết. |
| | Ghi nợ tài khoản | Xuất dạng text (Zengin) và Excel |
| | Biểu mẫu | Xuất PDF, có thể in |

---

## 14. Đặc Tả Liên Kết Hệ Thống

### 14.1 Tổng Quan

| # | Hệ thống liên kết | Hướng | Phương thức | Giai đoạn |
|---|---|---|---|---|
| 1 | Hệ thống OA | Hệ thống này → OA | Biểu mẫu điện tử PDF + CSV trên cloud | Hiện tại: biểu mẫu. Tương lai: tự động |
| 2 | Hệ thống quản lý bản điện tử | 2 chiều (⇔) | Nhận/phê duyệt đăng ký Web ← Điện tử. Phản ánh phê duyệt → Điện tử. | Giai đoạn này |
| 3 | Ghi nợ tài khoản (Zengin) | Hệ thống này → Bên ngoài | Xuất text (Zengin) hoặc Excel | Giai đoạn này |

### 14.2 Liên Kết Hệ Thống OA

| # | Hạng mục | Nội dung |
|---|---|---|
| 1 | Hướng | Hệ thống này → OA. JA nhấn nút → tạo biểu mẫu điện tử tăng giảm → email thông báo Nichino. Bỏ FAX thủ công. |
| 2 | Dữ liệu xuất | Biểu mẫu điện tử tăng giảm (PDF): số bộ theo cửa hàng/chi nhánh, số người đọc bản điện tử, số tăng/giảm |
| 3 | CSV | Tạo/lưu CSV trên cloud chuẩn bị liên kết tự động OA tương lai (ưu tiên thấp giai đoạn này) |
| 4 | Thời điểm | Tùy ý (thủ công). JA nhấn nút tùy lúc. Giờ chốt hiển thị trên hệ thống (không liên kết thực tế). |
| 5 | Thông báo | Gửi email cho nhân viên tăng giảm Nichino cùng lúc tạo biểu mẫu |
| 6 | Tương lai | Tự động liên kết tăng giảm bản giấy với OA. Phản ánh sáp nhập cửa hàng báo. Xem xét từ giai đoạn 2. |

### 14.3 Liên Kết Hệ Thống Quản Lý Bản Điện Tử

| # | Hạng mục | Nội dung |
|---|---|---|
| 1 | Hướng nhận (← Điện tử) | Nhận thông tin người dùng đăng ký Web. JA đăng ký mới hoặc phê duyệt trên hệ thống này. |
| 2 | Hướng gửi (→ Điện tử) | Phản ánh thông tin người đọc đã phê duyệt. Gửi kết quả phê duyệt cho người đăng ký ghi nợ. |
| 3 | Đối tượng | Người đọc bản điện tử có chọn JA trên hệ thống điện tử |
| 4 | Phạm vi | JA chỉ tham khảo/thao tác dữ liệu JA mình |
| 5 | Xử lý lỗi | Thông báo cảnh báo cho nhân viên phụ trách khi lỗi liên kết |

### 14.4 Liên Kết Ghi Nợ Tài Khoản (Zengin)

| # | Hạng mục | Nội dung |
|---|---|---|
| 1 | Hướng | Hệ thống này → Bên ngoài (xuất dữ liệu ghi nợ phí đọc báo) |
| 2 | Định dạng | Zengin tiêu chuẩn (text hoặc Excel) |
| 3 | Điều chỉnh số tiền | Nhập thủ công (hệ thống không lưu đơn giá theo ngày) |
| 4 | Quản lý log | Lưu lịch sử xuất, có thể tham khảo qua màn hình xem log |
