---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: Tài liệu thiết kế cơ sở dữ liệu
format_code: 17-BM/PM/VTI
format_version: "1.0"
issue_date: 2019-02-22
created_date: 2026/03/17
created_by: Tran Duc Tuyen
updated_date: 2026/04/02
updated_by: Tran Duc Tuyen
---

## Lịch sử thay đổi

| STT | Ngày phát hành | Phiên bản | Người phụ trách | Nội dung thay đổi | Người xác nhận | Người phê duyệt |
|---|---|---|---|---|---|---|
| 1 | 2026/03/17 | 1 | Tran Duc Tuyen | Tạo mới | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/03/27 | 1.1 | Tran Duc Tuyen | Tạo mới | Nguyen Huy Dat | Nguyen Huy Dat |
| 3 | 2026/07/14 | 1.12 | Tran Duc Tuyen | Thêm cột shiten_id (ID chi nhánh trực thuộc) và chỉ mục IX_m_account_shiten_id vào m_account. Giới hạn phạm vi người đọc của tài khoản JA chi nhánh quản lý xuống mức chi nhánh (Yêu cầu khách hàng 2026-07) | Nguyen Huy Dat | Nguyen Huy Dat |

## Tổng quan hệ thống

Hệ thống này là hệ thống quản lý người đăng ký dạng đám mây dành cho JA.
Cung cấp các chức năng quản lý thông tin người đăng ký, lịch sử đăng ký, dữ liệu chuyển khoản ngân hàng, v.v.

Các chức năng chính như sau:
   - Đăng ký, cập nhật, tìm kiếm thông tin người đăng ký
   - Quản lý lịch sử thay đổi nội dung đăng ký
   - Tạo và quản lý dữ liệu chuyển khoản ngân hàng
   - Chức năng tải lên/tải xuống tệp
   - Quản lý thông báo hệ thống

Ngoài ra, với vai trò chức năng bảo mật và kiểm toán, hệ thống cung cấp các chức năng sau:
   - Quản lý đăng nhập người dùng
   - Ghi lại lịch sử đăng nhập
   - Ghi lại nhật ký thao tác

## Tổng quan tài liệu

Tài liệu này định nghĩa thiết kế cơ sở dữ liệu của hệ thống.

## Tài liệu liên quan

| STT | Mã tài liệu | Tên tài liệu |
|---|---|---|
| 1 | ACSMS-SCR-XXX | Tài liệu thiết kế màn hình |
| 2 | ACSMS-API-XXX-YYY | Tài liệu thiết kế API |

---

# m_account (Bảng master tài khoản)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | account_id | 〇 | BIGINT |  | 〇 |  | ID tài khoản (IDENTITY) |
| 2 | login_id |  | VARCHAR | 20 |  |  | ID đăng nhập |
| 3 | password_hash |  | VARCHAR | 256 |  |  | Hash mật khẩu |
| 4 | account_name |  | VARCHAR | 50 |  |  | Tên tài khoản |
| 5 | role_id |  | INTEGER |  |  |  | Phân loại quản trị viên. Khóa ngoại tham chiếu m_roles.role_id |
| 6 | ja_id |  | BIGINT |  |  | 〇 | JA ID (Khóa ngoại) Nichino là NULL, Trung ương hội/JA trụ sở chính/JA chi nhánh quản lý là bắt buộc |
| 7 | kanri_shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh quản lý (chỉ dành cho JA chi nhánh quản lý) |
| 8 | shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh trực thuộc (Khóa ngoại → m_shiten.shiten_id). Chỉ role JA chi nhánh quản lý được thiết lập. NULL = không giới hạn theo chi nhánh (hoạt động như cũ). Khác NULL = chỉ được xem/sửa/thêm người đọc của chi nhánh đó (giới hạn ①) + không dùng được 5 màn xuất báo cáo (chuyển khoản/phí giao hàng/danh sách người đọc/phiếu liên lạc tăng giảm/thông báo tăng giảm) (giới hạn ②). Yêu cầu khách hàng 2026-07 |
| 9 | todofuken_code |  | VARCHAR | 2 |  | 〇 | Mã tỉnh/thành phố (bắt buộc với Trung ương hội) ※Cho phép NULL |
| 10 | paper_flg |  | BOOLEAN |  |  |  | Cờ xử lý bản giấy (DEFAULT false) |
| 11 | denshi_flg |  | BOOLEAN |  |  |  | Cờ xử lý bản điện tử (DEFAULT false) ※Liên quan đến kích hoạt chức năng phê duyệt |
| 12 | email |  | VARCHAR | 100 |  |  | Email người nhận thông báo ※Cho phép chuỗi rỗng |
| 13 | sub_email_1 |  | VARCHAR | 100 |  |  | Email phụ người nhận thông báo 1 ※Cho phép chuỗi rỗng |
| 14 | sub_email_2 |  | VARCHAR | 100 |  |  | Email phụ người nhận thông báo 2 ※Cho phép chuỗi rỗng |
| 15 | sub_email_3 |  | VARCHAR | 100 |  |  | Email phụ người nhận thông báo 3 ※Cho phép chuỗi rỗng |
| 16 | password_updated_at |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ cập nhật mật khẩu |
| 17 | last_login_at |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ đăng nhập cuối cùng |
| 18 | login_failure_count |  | INTEGER |  |  |  | Số lần đăng nhập thất bại (DEFAULT 0) |
| 19 | mfa_enable_flg |  | BOOLEAN |  |  |  | Cờ kích hoạt xác thực đa yếu tố (DEFAULT false) |
| 20 | account_lock_flg |  | BOOLEAN |  |  |  | Cờ khóa tài khoản (DEFAULT false) |
| 21 | account_lock_at |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ khóa tài khoản |
| 22 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 23 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 24 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 25 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 26 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 27 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_account | account_id | 〇 |  | Khóa chính |
| 2 | UQ_m_account_login_id | login_id |  | 〇 | Ràng buộc duy nhất cho ID đăng nhập |
| 3 | IX_m_account_ja_id | ja_id |  |  | Tham chiếu bảng master JA (Khóa ngoại) |
| 4 | IX_m_account_kanri_shiten_id | kanri_shiten_id |  |  | Tham chiếu bảng master chi nhánh quản lý (Khóa ngoại) |
| 5 | IX_m_account_shiten_id | shiten_id |  |  | Tham chiếu bảng master chi nhánh (Khóa ngoại). Dùng để lọc phạm vi người đọc theo chi nhánh trực thuộc. Yêu cầu khách hàng 2026-07 |
| 6 | IX_m_account_todofuken_code | todofuken_code |  |  | Tham chiếu bảng master tỉnh/thành phố (Khóa ngoại) |
| 7 | IX_m_account_role_id | role_id |  |  | Tìm kiếm theo vai trò |

---

# m_roles (Bảng master vai trò)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | role_id | 〇 | BIGINT |  | 〇 |  | ID vai trò (IDENTITY) |
| 2 | role_code |  | VARCHAR | 50 |  |  | Mã vai trò (ví dụ: NICHINO_ADMIN) |
| 3 | role_name |  | VARCHAR | 100 |  |  | Tên vai trò (ví dụ: Nichino) |
| 4 | description |  | TEXT |  |  | 〇 | Mô tả |
| 5 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 6 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 7 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 8 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 9 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_roles | role_id | 〇 |  | Khóa chính |
| 2 | UQ_m_roles_role_code | role_code |  | 〇 | Ràng buộc duy nhất cho mã vai trò |
| 3 | IX_m_roles_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_permissions (Bảng master quyền hạn)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | permission_id | 〇 | BIGINT |  | 〇 |  | ID quyền hạn (IDENTITY) |
| 2 | permission_code |  | VARCHAR | 50 |  |  | Mã quyền hạn (ví dụ: SUBSCRIBER_SEARCH) |
| 3 | permission_name |  | VARCHAR | 100 |  |  | Tên quyền hạn (ví dụ: Tìm kiếm chi tiết người đăng ký) |
| 4 | description |  | TEXT |  |  | 〇 | Mô tả |
| 5 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 6 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 7 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 8 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 9 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_permissions | permission_id | 〇 |  | Khóa chính |
| 2 | UQ_m_permissions_code | permission_code |  | 〇 | Ràng buộc duy nhất cho mã quyền hạn |
| 3 | IX_m_permissions_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_roles_permissions (Bảng liên kết vai trò - quyền hạn)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | role_permission_id | 〇 | BIGINT |  | 〇 |  | ID vai trò - quyền hạn (IDENTITY) |
| 2 | role_id |  | BIGINT |  |  |  | ID vai trò (m_roles.role_id) |
| 3 | permission_id |  | BIGINT |  |  |  | ID quyền hạn (m_permissions.permission_id) |
| 4 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ xóa (soft delete) |
| 5 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 6 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 7 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 8 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_roles_permissions | role_permission_id | 〇 |  | Khóa chính |
| 2 | UQ_m_roles_permissions | role_id, permission_id |  | 〇 | Ràng buộc duy nhất vai trò x quyền hạn |
| 3 | IX_m_roles_permissions_role_id | role_id |  |  | Tìm kiếm theo vai trò (FK) |
| 4 | IX_m_roles_permissions_permission_id | permission_id |  |  | Tìm kiếm theo quyền hạn (FK) |
| 5 | IX_m_roles_permissions_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# t_mfa_otp (Mật khẩu một lần MFA)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | otp_id | 〇 | BIGINT |  | 〇 |  | OTP ID (IDENTITY) |
| 2 | account_id |  | BIGINT |  |  |  | ID tài khoản (Khóa ngoại -> m_account.account_id) |
| 3 | otp_code_hash |  | VARCHAR | 256 |  |  | Hash mã OTP (không lưu bản rõ) |
| 4 | otp_type |  | INTEGER |  |  |  | Loại OTP (1:LOGIN, 2:PASSWORD_RESET) ※tham chiếu m_code.code_category='OTP_TYPE' |
| 5 | expired_at |  | TIMESTAMPTZ |  |  |  | Thời hạn hiệu lực OTP |
| 6 | verify_attempt_count |  | INTEGER |  |  | 〇 | Số lần thử nhập OTP (DEFAULT 0) |
| 7 | resend_count |  | INTEGER |  |  | 〇 | Số lần gửi lại OTP (DEFAULT 0) |
| 8 | used_flg |  | BOOLEAN |  |  | 〇 | Cờ đã sử dụng (DEFAULT false) |
| 9 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_mfa_otp | otp_id | 〇 |  | Khóa chính |
| 2 | IX_t_mfa_otp_account_id | account_id |  |  | Tìm kiếm theo tài khoản (FK) |
| 3 | IX_t_mfa_otp_active | account_id, used_flg, expired_at |  |  | Tìm kiếm OTP còn hiệu lực |
| 4 | IX_t_mfa_otp_expired_at | expired_at |  |  | Xóa dữ liệu hết hạn |

---

# m_ja (Bảng master JA)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | ja_id | 〇 | BIGINT |  | 〇 |  | JA ID (IDENTITY) |
| 2 | ja_code |  | VARCHAR | 10 |  |  | Mã JA |
| 3 | ja_name |  | VARCHAR | 200 |  |  | Tên JA |
| 4 | ja_name_kana |  | VARCHAR | 200 |  |  | Tên JA (Kana) |
| 5 | todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố |
| 6 | yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện |
| 7 | address |  | VARCHAR | 200 |  |  | Địa chỉ |
| 8 | tel |  | VARCHAR | 15 |  |  | Số điện thoại |
| 9 | fax |  | VARCHAR | 15 |  |  | Số FAX ※Cho phép chuỗi rỗng |
| 10 | email |  | VARCHAR | 100 |  |  | Địa chỉ email ※Cho phép chuỗi rỗng |
| 11 | tanto_busho |  | VARCHAR | 100 |  |  | Tên bộ phận phụ trách ※Cho phép chuỗi rỗng |
| 12 | tanto_name |  | VARCHAR | 50 |  |  | Tên người phụ trách ※Cho phép chuỗi rỗng |
| 13 | jastem_itakusha_code |  | VARCHAR | 10 |  |  | JASTEM_Mã người ủy thác ※Cho phép chuỗi rỗng |
| 14 | jastem_itakusha_name |  | VARCHAR | 40 |  |  | JASTEM_Tên người ủy thác ※Cho phép chuỗi rỗng |
| 15 | jastem_ja_code |  | VARCHAR | 4 |  |  | JASTEM_Số nông hiệp ※Cho phép chuỗi rỗng |
| 16 | jastem_ja_name |  | VARCHAR | 15 |  |  | JASTEM_Tên nông hiệp ※Cho phép chuỗi rỗng |
| 17 | chuokai_flg |  | BOOLEAN |  |  |  | 1=Trung ương hội, 0=Đơn hiệp (DEFAULT 0) |
| 18 | zei_kubun |  | INTEGER |  |  |  | Phân loại thuế (1: Thuế bao gồm, 2: Thuế ngoài) |
| 19 | biko |  | TEXT |  |  |  | Ghi chú |
| 20 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 21 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 22 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 23 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 24 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_ja | ja_id | 〇 |  | Khóa chính |
| 2 | UQ_m_ja_code | ja_code |  | 〇 | Ràng buộc duy nhất cho mã JA |
| 3 | IX_m_ja_todofuken_code | todofuken_code |  |  | Tham chiếu bảng master tỉnh/thành phố (FK) |
| 4 | IX_m_ja_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_kanri_shiten (Bảng master chi nhánh quản lý)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | kanri_shiten_id | 〇 | BIGINT |  | 〇 |  | ID chi nhánh quản lý (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (Khóa ngoại) |
| 3 | kanri_shiten_code |  | VARCHAR | 15 |  |  | Mã chi nhánh quản lý (định dạng 1AA-BBBB-CCC). Ví dụ BBBB=3300 là mã Chuokai, 5XXX là mã JA. Tương ứng với "Mã nông hiệp" trên hệ thống OA. Không phải 1JA=1 mã chi nhánh quản lý, cùng 1 JA có thể có nhiều chi nhánh quản lý nếu chia đơn vị phát hành hóa đơn. |
| 4 | kanri_shiten_name |  | VARCHAR | 100 |  |  | Tên chi nhánh quản lý |
| 5 | kanri_shiten_name_kana |  | VARCHAR | 100 |  |  | Tên chi nhánh quản lý (Kana) |
| 6 | yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện |
| 7 | todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố【Bắt buộc】 |
| 8 | address |  | VARCHAR | 200 |  |  | Địa chỉ |
| 9 | tel |  | VARCHAR | 15 |  |  | Số điện thoại |
| 10 | fax |  | VARCHAR | 15 |  |  | Số FAX |
| 11 | paper_flg |  | BOOLEAN |  |  |  | Cờ xử lý bản giấy (DEFAULT false) |
| 12 | denshi_flg |  | BOOLEAN |  |  |  | Cờ xử lý bản điện tử (DEFAULT false) |
| 13 | biko |  | TEXT |  |  |  | Ghi chú |
| 14 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 16 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 18 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_kanri_shiten | kanri_shiten_id | 〇 |  | Khóa chính |
| 2 | UQ_m_kanri_shiten_code | kanri_shiten_code |  | 〇 | Mã chi nhánh quản lý duy nhất |
| 3 | IX_m_kanri_shiten_ja_id | ja_id |  |  | Tham chiếu bảng master JA (FK) |
| 4 | IX_m_kanri_shiten_todofuken_code | todofuken_code |  |  | Tham chiếu bảng master tỉnh/thành phố (FK) |
| 5 | IX_m_kanri_shiten_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_shiten (Bảng master chi nhánh)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | shiten_id | 〇 | BIGINT |  | 〇 |  | ID chi nhánh (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (Khóa ngoại) |
| 3 | shiten_code |  | VARCHAR | 10 |  |  | Mã chi nhánh |
| 4 | shiten_name |  | VARCHAR | 100 |  |  | Tên chi nhánh |
| 5 | shiten_name_kana |  | VARCHAR | 100 |  |  | Tên chi nhánh (Kana) |
| 6 | kinyu_shiten_flg |  | BOOLEAN |  |  |  | Cờ chi nhánh tổ chức tài chính (DEFAULT false) |
| 7 | jastem_toriatsukai_tenpo_code |  | VARCHAR | 3 |  |  | JASTEM_Mã chi nhánh xử lý gửi dữ liệu※Cho phép chuỗi rỗng |
| 8 | jastem_tenpo_name |  | VARCHAR | 15 |  |  | JASTEM_Tên chi nhánh※Cho phép chuỗi rỗng |
| 9 | jastem_tyokin_shubetsu |  | VARCHAR | 1 |  |  | JASTEM_Loại tiền gửi※Cho phép chuỗi rỗng |
| 10 | jastem_koza_no |  | VARCHAR | 7 |  |  | JASTEM_Số tài khoản※Cho phép chuỗi rỗng |
| 11 | kanri_shiten_id |  | BIGINT |  |  |  | ID chi nhánh quản lý (Khóa ngoại -> m_kanri_shiten.kanri_shiten_id) |
| 12 | biko |  | TEXT |  |  |  | Ghi chú※cho phép chuỗi rỗng |
| 13 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 14 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 15 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 16 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 17 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_shiten | shiten_id | 〇 |  | Khóa chính |
| 2 | UQ_m_shiten_ja_code | ja_id, shiten_code |  | 〇 | Duy nhất trong cùng JA |
| 3 | IX_m_shiten_ja_id | ja_id |  |  | Tham chiếu bảng master JA (FK) |
| 4 | IX_m_shiten_kanri_shiten_id | kanri_shiten_id |  |  | Tham chiếu bảng master chi nhánh quản lý (FK) |
| 5 | IX_m_shiten_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_tanka (Bảng master đơn giá)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | tanka_id | 〇 | BIGINT |  | 〇 |  | ID đơn giá (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (Khóa ngoại) |
| 3 | tanka_code |  | VARCHAR | 10 |  |  | Mã đơn giá |
| 4 | tanka_type |  | INTEGER |  |  |  | Loại đơn giá (1: Phí đăng ký, 2: Phí giao hàng) |
| 5 | tanka_name |  | VARCHAR | 100 |  |  | Tên đơn giá |
| 6 | kingaku_zeikomi |  | NUMERIC | 10 |  |  | Số tiền (đã bao gồm thuế) |
| 7 | kingaku_zeinuki |  | NUMERIC | 10 |  |  | Số tiền (chưa bao gồm thuế) |
| 8 | tax_rate |  | NUMERIC | 5.2 |  |  | Thuế suất (%) ví dụ: 10.00 |
| 9 | tekiyo_start_date |  | DATE |  |  |  | Ngày bắt đầu áp dụng |
| 10 | tekiyo_end_date |  | DATE |  |  | 〇 | Ngày kết thúc áp dụng |
| 11 | active_flg |  | BOOLEAN |  |  |  | Cờ có hiệu lực vận hành (DEFAULT TRUE). Khi FALSE thì không cho phép gán mới. Độc lập với khoảng áp dụng (tekiyo_start_date / tekiyo_end_date) |
| 12 | campaign_flg |  | BOOLEAN |  |  |  | Cờ chiến dịch (TRUE: có hiệu lực, FALSE: không hiệu lực, DEFAULT FALSE, NOT NULL) |
| 13 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 14 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 16 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 18 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_tanka | tanka_id | 〇 |  | Khóa chính |
| 2 | UQ_m_tanka_ja_code | ja_id, tanka_code |  | 〇 | Duy nhất trong cùng JA |
| 3 | IX_m_tanka_ja_id | ja_id |  |  | Tham chiếu bảng master JA (FK) |
| 4 | IX_m_tanka_type_name | tanka_type, tanka_name |  |  | Tìm kiếm đơn giá |
| 5 | IX_m_tanka_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |
| 6 | IX_m_tanka_active_flg_false | active_flg WHERE active_flg = FALSE |  |  | Truy vấn các bản ghi đã tạm dừng (partial index, chỉ index trên thiểu số active_flg=FALSE) |

---

# m_hanbaiten (Bảng master đại lý bán hàng)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | hanbaiten_id | 〇 | BIGINT |  | 〇 |  | ID đại lý bán hàng (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (Khóa ngoại) |
| 3 | hanbaiten_code |  | VARCHAR | 10 |  |  | Mã đại lý bán hàng |
| 4 | hanbaiten_name |  | VARCHAR | 100 |  |  | Tên đại lý bán hàng |
| 5 | hanbaiten_name_kana |  | VARCHAR | 100 |  |  | Tên đại lý bán hàng (Kana) ※Cho phép chuỗi rỗng |
| 6 | torihikisaki_no |  | VARCHAR | 20 |  |  | Số nhà phát hành hóa đơn đủ điều kiện ※Cho phép chuỗi rỗng |
| 7 | todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố |
| 8 | yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện ※Cho phép chuỗi rỗng |
| 9 | address |  | VARCHAR | 200 |  |  | Địa chỉ ※Cho phép chuỗi rỗng |
| 10 | tel |  | VARCHAR | 15 |  |  | Số điện thoại ※Cho phép chuỗi rỗng |
| 11 | fax |  | VARCHAR | 15 |  |  | Số FAX ※Cho phép chuỗi rỗng |
| 12 | shocho_name |  | VARCHAR | 50 |  |  | Tên trưởng chi nhánh ※Cho phép chuỗi rỗng |
| 13 | itaku_kubun |  | INTEGER |  |  | 〇 | Phân loại ủy thác (1: Chuyển khoản, 2: Ủy thác Nichino, 9: Khác) |
| 14 | haitatsuryo_tanka_id |  | BIGINT |  |  | 〇 | ID đơn giá phí giao hàng (FK: m_tanka) |
| 15 | haitatsuryo_shiharai_cycle |  | INTEGER |  |  | 〇 | Chu kỳ thanh toán phí giao hàng (số tháng) |
| 16 | furikomi_tesuryo_futan_kubun |  | INTEGER |  |  | 〇 | Phân loại bên chịu phí chuyển khoản (1: JA, 2: Đại lý bán hàng) |
| 17 | furikomi_tesuryo |  | NUMERIC | 10 |  | 〇 | Phí chuyển khoản |
| 18 | bank_code |  | VARCHAR | 4 |  |  | Mã tổ chức tài chính |
| 19 | bank_name |  | VARCHAR | 100 |  |  | Tên tổ chức tài chính |
| 20 | bank_branch_code |  | VARCHAR | 3 |  |  | Mã chi nhánh tài khoản trích nợ |
| 21 | bank_branch_name |  | VARCHAR | 100 |  |  | Tên chi nhánh tài khoản trích nợ |
| 22 | yokin_shubetsu |  | INTEGER |  |  | 〇 | Loại tiền gửi (1: Thông thường, 2: Vãng lai) |
| 23 | koza_no |  | VARCHAR | 10 |  |  | Số tài khoản ※Cho phép chuỗi rỗng |
| 24 | koza_meigi |  | VARCHAR | 50 |  |  | Tên chủ tài khoản ※Cho phép chuỗi rỗng |
| 25 | haiten_flg |  | BOOLEAN |  |  |  | Cờ ngừng hoạt động (DEFAULT false) |
| 26 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 27 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 28 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 29 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 30 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 31 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_hanbaiten | hanbaiten_id | 〇 |  | Khóa chính |
| 2 | UQ_m_hanbaiten_ja_code | ja_id, hanbaiten_code |  | 〇 | Duy nhất trong cùng JA |
| 3 | IX_m_hanbaiten_ja_id | ja_id |  |  | Tham chiếu bảng master JA (FK) |
| 4 | IX_m_hanbaiten_haitatsuryo_tanka_id | haitatsuryo_tanka_id |  |  | Tham chiếu bảng master đơn giá (FK) |
| 5 | IX_m_hanbaiten_todofuken_code | todofuken_code |  |  | Tham chiếu bảng master tỉnh/thành phố (FK) |
| 6 | IX_m_hanbaiten_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# m_todofuken (Bảng master tỉnh/thành phố)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | todofuken_code | 〇 | VARCHAR | 2 |  |  | Mã tỉnh/thành phố (01~47) |
| 2 | todofuken_name |  | VARCHAR | 10 |  |  | Tên tỉnh/thành phố |
| 3 | todofuken_name_kana |  | VARCHAR | 20 |  |  | Tên tỉnh/thành phố (Kana) |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_todofuken | todofuken_code | 〇 |  | Khóa chính |

---

# m_code (Bảng master mã)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | code_id | 〇 | BIGINT |  | 〇 |  | ID mã (IDENTITY) |
| 2 | code_category |  | VARCHAR | 50 |  |  | Phân loại mã |
| 3 | code_value |  | VARCHAR | 20 |  |  | Giá trị mã |
| 4 | code_name |  | VARCHAR | 100 |  |  | Tên mã |
| 5 | code_name_short |  | VARCHAR | 50 |  |  | Tên mã (viết tắt) ※Cho phép chuỗi rỗng |
| 6 | sort_order |  | INTEGER |  |  | 〇 | Thứ tự hiển thị |
| 7 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 8 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 9 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 10 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 11 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 12 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_m_code | code_id | 〇 | 〇 | Khóa chính |
| 2 | UQ_m_code_category_value | code_category, code_value |  | 〇 | Duy nhất trong cùng phân loại |
| 3 | IX_m_code_sort_order | sort_order |  |  | Sắp xếp |
| 4 | IX_m_code_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# t_file_upload (Bảng tải lên tệp)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | file_upload_id | 〇 | BIGINT |  | 〇 |  | ID tải lên tệp (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  | 〇 | JA ID (FK: m_ja) ※NULL = dành cho tất cả JA |
| 3 | upload_datetime |  | TIMESTAMPTZ |  |  |  | Ngày giờ tải lên |
| 4 | scheduled_delete_date |  | TIMESTAMPTZ |  |  | 〇 | Ngày dự kiến xóa |
| 5 | file_name |  | VARCHAR | 255 |  |  | Tên tệp |
| 6 | file_path |  | VARCHAR | 500 |  |  | Đường dẫn tệp |
| 7 | file_size |  | INTEGER |  |  | 〇 | Kích thước tệp (byte) |
| 8 | record_count |  | INTEGER |  |  | 〇 | Số lượng bản ghi |
| 9 | success_count |  | INTEGER |  |  | 〇 | Số lượng thành công |
| 10 | error_count |  | INTEGER |  |  | 〇 | Số lượng lỗi |
| 11 | status |  | INTEGER |  |  |  | Trạng thái xử lý (1: Đang xử lý, 2: Hoàn thành, 3: Lỗi) |
| 12 | error_file_path |  | VARCHAR | 500 |  |  | Đường dẫn tệp lỗi ※Cho phép chuỗi rỗng |
| 13 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 14 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 15 | created_by |  | VARCHAR | 50 |  |  | Người tạo |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_file_upload | file_upload_id | 〇 |  | Khóa chính |
| 2 | IX_t_file_upload_ja_datetime | ja_id, upload_datetime |  |  | Hiển thị danh sách (quan trọng nhất) |
| 3 | IX_t_file_upload_upload_datetime | upload_datetime |  |  | Tìm kiếm theo khoảng thời gian (tùy chọn) |

---

# t_file_download (Bảng tải xuống tệp)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | file_download_id | 〇 | BIGINT |  | 〇 |  | ID tải xuống tệp (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (FK: m_ja) |
| 3 | download_datetime |  | TIMESTAMPTZ |  |  |  | Ngày giờ tải xuống |
| 4 | download_type |  | INTEGER |  |  |  | Loại tải xuống (1: Chuyển khoản ngân hàng, 2: Khác, 3: Phiếu liên lạc tăng giảm, 4: Thông báo tăng giảm, 5: Danh sách người đăng ký) |
| 5 | scheduled_delete_date |  | TIMESTAMPTZ |  |  | 〇 | Ngày dự kiến xóa |
| 6 | nichino_download_allowed_flg |  | BOOLEAN |  |  |  | Cờ cho phép Nichino tải xuống (TRUE: Cho phép, FALSE: Không cho phép, DEFAULT FALSE, NOT NULL) |
| 7 | file_name |  | VARCHAR | 255 |  |  | Tên tệp |
| 8 | file_path |  | VARCHAR | 500 |  |  | Đường dẫn tệp |
| 9 | file_size |  | INTEGER |  |  |  | Kích thước tệp (byte) |
| 10 | record_count |  | INTEGER |  |  |  | Số lượng bản ghi |
| 11 | target_month |  | VARCHAR | 6 |  | 〇 | Tháng đối tượng (YYYYMM) ※Cho phép chuỗi rỗng |
| 12 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 13 | created_at |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ tạo |
| 14 | created_by |  | VARCHAR | 50 |  |  | Người tạo |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_file_download | file_download_id | 〇 |  | Khóa chính |
| 2 | IX_t_file_download_ja_datetime | ja_id, download_datetime |  |  | Hiển thị danh sách (quan trọng nhất) |

---

# t_oshirase (Bảng thông báo)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | oshirase_id | 〇 | BIGINT |  | 〇 |  | ID thông báo (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  | 〇 | JA ID (FK: m_ja) NULL = dành cho tất cả JA |
| 3 | oshirase_type |  | INTEGER |  |  |  | Loại thông báo (1: Hệ thống, 2: Quan trọng, 3: Thông thường, 4: Hạn chót) |
| 4 | publish_location |  | INTEGER |  |  |  | Vị trí công khai (1: Màn hình đăng nhập, 2: Màn hình menu) |
| 5 | status |  | INTEGER |  |  |  | Trạng thái (1: Bản nháp, 2: Công khai, 3: Không công khai) |
| 6 | title |  | VARCHAR | 200 |  |  | Tiêu đề |
| 7 | content |  | TEXT |  |  |  | Nội dung |
| 8 | publish_start_date |  | TIMESTAMPTZ |  |  |  | Ngày giờ bắt đầu công khai |
| 9 | publish_end_date |  | TIMESTAMPTZ |  |  | 〇 | Ngày giờ kết thúc công khai (NULL = vô thời hạn) |
| 10 | target_kanri_kubun |  | VARCHAR | 20 |  |  | Phân loại quản trị viên đối tượng (phân cách bằng dấu phẩy) ※Cho phép chuỗi rỗng |
| 11 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 12 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 13 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 14 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 15 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_oshirase | oshirase_id | 〇 |  | Khóa chính |
| 2 | IX_t_oshirase_publish | status, publish_location, publish_start_date |  |  | Tìm kiếm đang công khai (quan trọng nhất) |
| 3 | IX_t_oshirase_ja_status | ja_id, status |  |  | Lấy dữ liệu theo JA |
| 4 | IX_t_oshirase_deleted_at | deleted_at |  |  | Loại trừ dữ liệu đã xóa logic |

---

# t_log (Bảng nhật ký thao tác)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | log_id | 〇 | BIGINT |  | 〇 |  | ID nhật ký (IDENTITY) |
| 2 | log_type |  | INTEGER |  |  |  | Loại nhật ký (1: Thao tác người dùng, 2: Hệ thống, 3: Lỗi, 4: Tải lên tệp) |
| 3 | log_datetime |  | TIMESTAMPTZ |  |  |  | Ngày giờ nhật ký |
| 4 | account_id |  | BIGINT |  |  | 〇 | ID tài khoản |
| 5 | ja_id |  | BIGINT |  |  | 〇 | JA ID |
| 6 | gamen_name |  | VARCHAR | 100 |  |  | Tên màn hình ※Cho phép chuỗi rỗng |
| 7 | operation |  | VARCHAR | 100 |  |  | Nội dung thao tác ※Cho phép chuỗi rỗng |
| 8 | result_status |  | INTEGER |  |  |  | Trạng thái kết quả (1: Thành công, 2: Thất bại, 3: Cảnh báo) |
| 9 | target_id |  | BIGINT |  |  | 〇 | ID đối tượng thao tác |
| 10 | target_table |  | VARCHAR | 50 |  |  | Bảng đối tượng thao tác ※Cho phép chuỗi rỗng |
| 11 | before_value |  | TEXT |  |  |  | Giá trị trước khi thay đổi (JSON) ※Cho phép chuỗi rỗng |
| 12 | after_value |  | TEXT |  |  |  | Giá trị sau khi thay đổi (JSON) ※Cho phép chuỗi rỗng |
| 13 | ip_address |  | VARCHAR | 50 |  |  | Địa chỉ IP ※Cho phép chuỗi rỗng |
| 14 | user_agent |  | VARCHAR | 500 |  |  | User Agent ※Cho phép chuỗi rỗng |
| 15 | error_message |  | TEXT |  |  |  | Thông báo lỗi ※Cho phép chuỗi rỗng |
| 16 | stack_trace |  | TEXT |  |  |  | Stack trace ※Cho phép chuỗi rỗng |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_log | log_id | 〇 |  | Khóa chính |
| 2 | IX_t_log_type_datetime | log_type, log_datetime |  |  | Tìm kiếm theo loại nhật ký + ngày giờ |
| 3 | IX_t_log_account_id | ja_id, result_status |  |  | Tìm kiếm theo tài khoản |
| 4 | IX_t_log_ja_id | ja_id |  |  | Lấy dữ liệu theo JA |

---

# t_login_log (Bảng nhật ký đăng nhập)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | login_log_id | 〇 | BIGINT |  | 〇 |  | ID nhật ký đăng nhập (IDENTITY) |
| 2 | login_datetime |  | TIMESTAMPTZ |  |  |  | Ngày giờ đăng nhập |
| 3 | account_id |  | BIGINT |  |  | 〇 | ID tài khoản (FK: m_account) |
| 4 | login_id |  | VARCHAR | 20 |  |  | ID đăng nhập đã nhập |
| 5 | login_result |  | INTEGER |  |  |  | Kết quả đăng nhập (1: Thành công, 2: Thất bại) |
| 6 | failure_reason |  | VARCHAR | 100 |  |  | Lý do thất bại ※Cho phép chuỗi rỗng |
| 7 | ip_address |  | VARCHAR | 50 |  |  | Địa chỉ IP ※Cho phép chuỗi rỗng |
| 8 | user_agent |  | VARCHAR | 500 |  |  | User Agent ※Cho phép chuỗi rỗng |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_login_log | login_log_id | 〇 |  | Khóa chính |
| 2 | IX_t_login_log_datetime | login_datetime |  |  | Tìm kiếm theo ngày giờ đăng nhập |
| 3 | IX_t_login_log_account_id | account_id |  |  | Tìm kiếm theo tài khoản |

---

# t_dokusya (Bảng người đăng ký)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | dokusya_id | 〇 | BIGINT |  | 〇 |  | ID người đăng ký (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (Khóa ngoại) |
| 3 | kanri_shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh quản lý (Khóa ngoại) |
| 4 | shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh (Khóa ngoại) |
| 5 | kumiaiin_code |  | VARCHAR | 20 |  |  | Mã hội viên ※Cho phép chuỗi rỗng |
| 6 | dokusya_shubetsu |  | INTEGER |  |  |  | Loại đăng ký (1: Bản giấy, 2: Bản điện tử, 3: Đọc song song) |
| 7 | tetsuzuki_shurui |  | INTEGER |  |  |  | Loại thủ tục (0: Hủy, 1: Mới) |
| 8 | denshi_dokusya_shubetsu |  | INTEGER |  |  | 〇 | Loại người đọc bản điện tử (0: Miễn phí, 1: Có phí) |
| 9 | shimei_sei |  | VARCHAR | 50 |  |  | Họ |
| 10 | shimei_mei |  | VARCHAR | 50 |  |  | Tên |
| 11 | shimei_kana_sei |  | VARCHAR | 100 |  |  | Họ (Kana) |
| 12 | shimei_kana_mei |  | VARCHAR | 100 |  |  | Tên (Kana) |
| 13 | dokusya_busu |  | INTEGER |  |  |  | Số bản đăng ký |
| 14 | yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện |
| 15 | todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố |
| 16 | shikuchoson |  | VARCHAR | 100 |  |  | Thành phố/quận/huyện |
| 17 | chome_banchi |  | VARCHAR | 100 |  |  | Số nhà/đường |
| 18 | tatemono_mei |  | VARCHAR | 100 |  |  | Tên tòa nhà v.v. ※Cho phép chuỗi rỗng |
| 19 | renrakusaki_1 |  | VARCHAR | 15 |  |  | Liên hệ 1 ※Cho phép chuỗi rỗng |
| 20 | renrakusaki_2 |  | VARCHAR | 15 |  |  | Liên hệ 2 ※Cho phép chuỗi rỗng |
| 21 | email |  | VARCHAR | 100 |  |  | Địa chỉ email ※Cho phép chuỗi rỗng |
| 22 | mail_magazine_flg |  | INTEGER |  |  |  | Bản tin email (0: Không gửi, 1: Gửi) |
| 23 | birth_year |  | INTEGER |  |  | 〇 | Năm sinh (Dương lịch) |
| 24 | gender |  | INTEGER |  |  | 〇 | Giới tính (1: Nam, 2: Nữ, 9: Không trả lời) |
| 25 | haitatsu_same_flg |  | BOOLEAN |  |  |  | Chỉ định thông tin giao hàng (TRUE: Giống người đăng ký) |
| 26 | haitatsu_yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện nơi giao hàng ※Cho phép chuỗi rỗng |
| 27 | haitatsu_todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố nơi giao hàng ※Cho phép chuỗi rỗng |
| 28 | haitatsu_shikuchoson |  | VARCHAR | 100 |  |  | Thành phố/quận/huyện nơi giao hàng ※Cho phép chuỗi rỗng |
| 29 | haitatsu_chome_banchi |  | VARCHAR | 100 |  |  | Số nhà/đường nơi giao hàng ※Cho phép chuỗi rỗng |
| 30 | haitatsu_tatemono_mei |  | VARCHAR | 100 |  |  | Tên tòa nhà nơi giao hàng ※Cho phép chuỗi rỗng |
| 31 | haitatsu_renrakusaki_1 |  | VARCHAR | 15 |  |  | Liên hệ 1 nơi giao hàng ※Cho phép chuỗi rỗng |
| 32 | haitatsu_renrakusaki_2 |  | VARCHAR | 15 |  |  | Liên hệ 2 nơi giao hàng ※Cho phép chuỗi rỗng |
| 33 | haitatsu_shimei_sei |  | VARCHAR | 50 |  |  | Họ nơi giao hàng (Kanji) ※Cho phép chuỗi rỗng |
| 34 | haitatsu_shimei_mei |  | VARCHAR | 50 |  |  | Tên nơi giao hàng (Kanji) ※Cho phép chuỗi rỗng |
| 35 | haitatsu_shimei_kana_sei |  | VARCHAR | 100 |  |  | Họ nơi giao hàng (Kana) ※Cho phép chuỗi rỗng |
| 36 | haitatsu_shimei_kana_mei |  | VARCHAR | 100 |  |  | Tên nơi giao hàng (Kana) ※Cho phép chuỗi rỗng |
| 37 | hanbaiten_id |  | BIGINT |  |  |  | ID đại lý bán hàng (Khóa ngoại) |
| 38 | tanka_id |  | BIGINT |  |  |  | ID đơn giá (FK: m_tanka) ※Chỉ đơn giá phí đăng ký (tanka_type=1) |
| 39 | yubin_kubun |  | VARCHAR | 1 |  |  | Phân loại bưu điện (0: Trống, 1: Gửi bưu điện) DEFAULT 0 |
| 40 | shiharai_hoho |  | INTEGER |  |  |  | Phương thức thanh toán (1: Trích tài khoản, 2: Thu tiền mặt, 3: Thu chuyển khoản, 4: Cơ sở JA v.v., 5: Trừ lương, 6: Thẻ tín dụng, 9: Khác) |
| 41 | dokusyaryo_shiharai_cycle |  | INTEGER |  |  | 〇 | Chu kỳ thanh toán phí đăng ký (số tháng) |
| 42 | bank_branch_code |  | VARCHAR | 3 |  |  | Mã chi nhánh tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 43 | bank_branch_name |  | VARCHAR | 100 |  |  | Tên chi nhánh tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 44 | hikiotoshi_yokin_shubetsu |  | INTEGER |  |  | 〇 | Loại tiền gửi tài khoản trích nợ (1: Thông thường, 2: Vãng lai) |
| 45 | hikiotoshi_koza_no |  | VARCHAR | 10 |  |  | Số tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 46 | hikiotoshi_koza_meigi |  | VARCHAR | 50 |  |  | Tên chủ tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 47 | dokusyaso_bunrui |  | VARCHAR | 50 |  |  | Phân loại tầng lớp người đăng ký (nhiều giá trị phân cách bằng dấu phẩy) ※Cho phép chuỗi rỗng |
| 48 | nogyosya_bunrui |  | VARCHAR | 50 |  |  | Phân loại nông dân (nhiều giá trị phân cách bằng dấu phẩy) ※Cho phép chuỗi rỗng |
| 49 | shoki_dokusya_kaishi_date |  | DATE |  |  |  | Ngày bắt đầu đăng ký lần đầu (giữ nguyên khi thay đổi) |
| 50 | dokusya_kaishi_date |  | DATE |  |  |  | Ngày bắt đầu đăng ký |
| 51 | dokusya_chushi_date |  | DATE |  |  | 〇 | Ngày ngừng đăng ký |
| 52 | joho_henko_tekiyo_date |  | DATE |  |  | 〇 | Ngày áp dụng thay đổi thông tin người đọc |
| 53 | seikyu_kaishi_month |  | VARCHAR | 6 |  |  | Tháng bắt đầu tính phí (YYYYMM) ※Cho phép chuỗi rỗng |
| 54 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 55 | rireki_no |  | INTEGER |  |  |  | Số lịch sử (số lịch sử mới nhất) |
| 56 | deleted_at |  | TIMESTAMPTZ |  |  | 〇 | Cờ xóa (DEFAULT NULL) |
| 57 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 58 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 59 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 60 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |
| 61 | denshi_shonin_status |  | INTEGER |  |  | 〇 | Trạng thái phê duyệt đăng ký điện tử |
| 62 | denshi_kaiin_id |  | BIGINT |  |  | 〇 | ID hội viên bản điện tử (ID hội viên của hệ thống ngoài. Do tính năng liên kết ngoài thiết lập. Duy nhất toàn bộ) |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_dokusya | dokusya_id | 〇 |  | Khóa chính |
| 2 | IX_t_dokusya_ja_id | ja_id |  |  | Tìm kiếm theo JA |
| 3 | IX_t_dokusya_kanri_shiten_id | kanri_shiten_id |  |  | Tìm kiếm theo chi nhánh quản lý |
| 4 | IX_t_dokusya_shiten_id | shiten_id |  |  | Tìm kiếm theo chi nhánh |
| 5 | IX_t_dokusya_kumiaiin_code | kumiaiin_code |  |  | Tìm kiếm theo mã thành viên |
| 6 | IX_t_dokusya_hanbaiten_id | hanbaiten_id |  |  | Tìm kiếm theo cửa hàng |
| 7 | IX_t_dokusya_ja_kumiaiin | ja_id, kumiaiin_code |  |  | Tìm kiếm kết hợp mã thành viên |
| 8 | IX_t_dokusya_hierarchy | ja_id, kanri_shiten_id, shiten_id |  |  | Tìm kiếm phân cấp |
| 9 | UQ_t_dokusya_denshi_kaiin_id | denshi_kaiin_id |  | 〇 | Duy nhất ID hội viên bản điện tử (toàn bộ bản ghi. UNIQUE một phần, loại trừ NULL và đã xóa) |

---

# t_dokusya_rireki (Bảng lịch sử người đăng ký)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | dokusya_rireki_id | 〇 | BIGINT |  | 〇 |  | ID lịch sử người đăng ký (IDENTITY) |
| 2 | dokusya_id |  | BIGINT |  |  |  | ID người đăng ký (Khóa ngoại) |
| 3 | rireki_no |  | INTEGER |  |  |  | Số lịch sử (số thứ tự trong dokusya_id) |
| 4 | ja_id |  | BIGINT |  |  |  | JA ID |
| 5 | kanri_shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh quản lý |
| 6 | shiten_id |  | BIGINT |  |  | 〇 | ID chi nhánh |
| 7 | kumiaiin_code |  | VARCHAR | 20 |  |  | Mã hội viên ※Cho phép chuỗi rỗng |
| 8 | dokusya_shubetsu |  | INTEGER |  |  |  | Loại đăng ký (1: Bản giấy, 2: Bản điện tử, 3: Đọc song song) |
| 9 | tetsuzuki_shurui |  | INTEGER |  |  |  | Loại thủ tục (0: Hủy, 1: Mới) |
| 10 | denshi_dokusya_shubetsu |  | INTEGER |  |  | 〇 | Loại người đọc bản điện tử (0: Miễn phí, 1: Có phí) |
| 11 | shimei_sei |  | VARCHAR | 50 |  |  | Họ |
| 12 | shimei_mei |  | VARCHAR | 50 |  |  | Tên |
| 13 | shimei_kana_sei |  | VARCHAR | 100 |  |  | Họ (Kana) |
| 14 | shimei_kana_mei |  | VARCHAR | 100 |  |  | Tên (Kana) |
| 15 | dokusya_busu |  | INTEGER |  |  |  | Số bản đăng ký |
| 16 | yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện |
| 17 | todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố |
| 18 | shikuchoson |  | VARCHAR | 100 |  |  | Thành phố/quận/huyện |
| 19 | chome_banchi |  | VARCHAR | 100 |  |  | Số nhà/đường |
| 20 | tatemono_mei |  | VARCHAR | 100 |  |  | Tên tòa nhà v.v. ※Cho phép chuỗi rỗng |
| 21 | renrakusaki_1 |  | VARCHAR | 15 |  |  | Liên hệ 1 ※Cho phép chuỗi rỗng |
| 22 | renrakusaki_2 |  | VARCHAR | 15 |  |  | Liên hệ 2 ※Cho phép chuỗi rỗng |
| 23 | email |  | VARCHAR | 100 |  |  | Địa chỉ email ※Cho phép chuỗi rỗng |
| 24 | mail_magazine_flg |  | INTEGER |  |  |  | Bản tin email (0: Không gửi, 1: Gửi) |
| 25 | birth_year |  | INTEGER |  |  | 〇 | Năm sinh (Dương lịch) |
| 26 | gender |  | INTEGER |  |  | 〇 | Giới tính (1: Nam, 2: Nữ, 9: Không trả lời) |
| 27 | haitatsu_same_flg |  | BOOLEAN |  |  |  | Chỉ định thông tin giao hàng (TRUE: Giống người đăng ký) |
| 28 | haitatsu_yubin_no |  | VARCHAR | 7 |  |  | Mã bưu điện nơi giao hàng ※Cho phép chuỗi rỗng |
| 29 | haitatsu_todofuken_code |  | VARCHAR | 2 |  |  | Mã tỉnh/thành phố nơi giao hàng ※Cho phép chuỗi rỗng |
| 30 | haitatsu_shikuchoson |  | VARCHAR | 100 |  |  | Thành phố/quận/huyện nơi giao hàng ※Cho phép chuỗi rỗng |
| 31 | haitatsu_chome_banchi |  | VARCHAR | 100 |  |  | Số nhà/đường nơi giao hàng ※Cho phép chuỗi rỗng |
| 32 | haitatsu_tatemono_mei |  | VARCHAR | 100 |  |  | Tên tòa nhà nơi giao hàng ※Cho phép chuỗi rỗng |
| 33 | haitatsu_renrakusaki_1 |  | VARCHAR | 15 |  |  | Liên hệ 1 nơi giao hàng ※Cho phép chuỗi rỗng |
| 34 | haitatsu_renrakusaki_2 |  | VARCHAR | 15 |  |  | Liên hệ 2 nơi giao hàng ※Cho phép chuỗi rỗng |
| 35 | haitatsu_shimei_sei |  | VARCHAR | 50 |  |  | Họ nơi giao hàng (Kanji) ※Cho phép chuỗi rỗng |
| 36 | haitatsu_shimei_mei |  | VARCHAR | 50 |  |  | Tên nơi giao hàng (Kanji) ※Cho phép chuỗi rỗng |
| 37 | haitatsu_shimei_kana_sei |  | VARCHAR | 100 |  |  | Họ nơi giao hàng (Kana) ※Cho phép chuỗi rỗng |
| 38 | haitatsu_shimei_kana_mei |  | VARCHAR | 100 |  |  | Tên nơi giao hàng (Kana) ※Cho phép chuỗi rỗng |
| 39 | hanbaiten_id |  | BIGINT |  |  |  | ID đại lý bán hàng |
| 40 | tanka_id |  | BIGINT |  |  |  | ID đơn giá (FK: m_tanka) ※Chỉ đơn giá phí đăng ký (tanka_type=1) |
| 41 | yubin_kubun |  | VARCHAR | 1 |  |  | Phân loại bưu điện (0: Trống, 1: Gửi bưu điện) DEFAULT 0 |
| 42 | shiharai_hoho |  | INTEGER |  |  |  | Phương thức thanh toán (1: Trích tài khoản, 2: Thu tiền mặt, 3: Thu chuyển khoản, 4: Cơ sở JA v.v., 5: Trừ lương, 6: Thẻ tín dụng, 9: Khác) |
| 43 | dokusyaryo_shiharai_cycle |  | INTEGER |  |  | 〇 | Chu kỳ thanh toán phí đăng ký (số tháng) |
| 44 | bank_branch_code |  | VARCHAR | 3 |  |  | Mã chi nhánh tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 45 | bank_branch_name |  | VARCHAR | 100 |  |  | Tên chi nhánh tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 46 | hikiotoshi_yokin_shubetsu |  | INTEGER |  |  | 〇 | Loại tiền gửi tài khoản trích nợ (1: Thông thường, 2: Vãng lai) |
| 47 | hikiotoshi_koza_no |  | VARCHAR | 10 |  |  | Số tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 48 | hikiotoshi_koza_meigi |  | VARCHAR | 50 |  |  | Tên chủ tài khoản trích nợ ※Cho phép chuỗi rỗng |
| 49 | dokusyaso_bunrui |  | VARCHAR | 50 |  |  | Phân loại tầng lớp người đăng ký (nhiều giá trị phân cách bằng dấu phẩy) ※Cho phép chuỗi rỗng |
| 50 | nogyosya_bunrui |  | VARCHAR | 50 |  |  | Phân loại nông dân (nhiều giá trị phân cách bằng dấu phẩy) ※Cho phép chuỗi rỗng |
| 51 | shoki_dokusya_kaishi_date |  | DATE |  |  |  | Ngày bắt đầu đăng ký lần đầu (giữ nguyên khi thay đổi) |
| 52 | dokusya_kaishi_date |  | DATE |  |  |  | Ngày bắt đầu đăng ký |
| 53 | dokusya_chushi_date |  | DATE |  |  | 〇 | Ngày ngừng đăng ký |
| 54 | joho_henko_tekiyo_date |  | DATE |  |  | 〇 | Ngày áp dụng thay đổi thông tin người đọc |
| 55 | seikyu_kaishi_month |  | VARCHAR | 6 |  |  | Tháng bắt đầu tính phí (YYYYMM) ※Cho phép chuỗi rỗng |
| 56 | biko |  | TEXT |  |  |  | Ghi chú ※Cho phép chuỗi rỗng |
| 57 | henko_riyu |  | TEXT |  |  |  | Lý do thay đổi ※Cho phép chuỗi rỗng |
| 58 | saishin_data_flg |  | BOOLEAN |  |  |  | Cờ dữ liệu mới nhất (DEFAULT false, TRUE = bản ghi mới nhất) ※Bắt buộc kiểm soát transaction phía ứng dụng |
| 59 | zougen_hokoku_flg |  | BOOLEAN |  |  |  | Cờ báo cáo tăng giảm (DEFAULT false, TRUE = thay đổi thuộc đối tượng báo cáo tăng giảm) |
| 60 | shinki_flg |  | BOOLEAN |  |  |  | Cờ mới (DEFAULT false, TRUE = bắt đầu đăng ký mới/tái đăng ký sau hủy) |
| 61 | kaiyaku_flg |  | BOOLEAN |  |  |  | Cờ hủy (DEFAULT false, TRUE = đăng ký -> hủy) |
| 62 | zenkai_hanbaiten_id |  | BIGINT |  |  | 〇 | ID đại lý bán hàng lần trước (NULL cho lịch sử đầu tiên) |
| 63 | zenkai_dokusya_busu |  | INTEGER |  |  | 〇 | Số bản đăng ký lần trước (NULL cho lịch sử đầu tiên) |
| 64 | zenkai_yubin_no |  | VARCHAR | 7 |  | 〇 | Mã bưu điện lần trước (NULL cho lịch sử đầu tiên) |
| 65 | zenkai_todofuken_code |  | VARCHAR | 2 |  | 〇 | Mã tỉnh/thành phố lần trước (NULL cho lịch sử đầu tiên) |
| 66 | zenkai_shikuchoson |  | VARCHAR | 100 |  | 〇 | Thành phố/quận/huyện lần trước (NULL cho lịch sử đầu tiên) |
| 67 | zenkai_chome_banchi |  | VARCHAR | 100 |  | 〇 | Số nhà/đường lần trước (NULL cho lịch sử đầu tiên) |
| 68 | zenkai_tatemono_mei |  | VARCHAR | 100 |  | 〇 | Tên tòa nhà lần trước (NULL cho lịch sử đầu tiên) |
| 69 | denshi_shonin_status |  | INTEGER |  |  | 〇 | Trạng thái phê duyệt đăng ký điện tử |
| 70 | hanbaiten_tekiyo_date |  | DATE |  |  | 〇 | Ngày áp dụng đại lý bán hàng  |
| 71 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo (ngày giờ đăng ký lịch sử) |
| 72 | created_by |  | VARCHAR | 50 |  |  | Người tạo (người đăng ký lịch sử) |
| 73 | torikeshi_flg |  | BOOLEAN |  |  |  | Cờ hủy (DEFAULT false, TRUE = bản ghi hủy/bút toán đỏ). Khi hủy (取消), gắn cờ cho cả bản ghi sai và bản ghi đối ứng. Loại khỏi báo cáo/tìm kiếm/hiển thị hiện tại, đóng băng giá trị lúc hủy (không tính lại), không xóa vật lý |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_dokusya_rireki | dokusya_rireki_id | 〇 | 〇 | Khóa chính |
| 2 | UQ_t_dokusya_rireki | dokusya_id, rireki_no |  | 〇 | Ràng buộc duy nhất lịch sử |
| 3 | IX_t_dokusya_rireki_dokusya_id | dokusya_id |  |  | Tìm kiếm theo người đăng ký |
| 4 | IX_t_dokusya_rireki_latest | dokusya_id, saishin_data_flg |  |  | Lấy dữ liệu mới nhất |
| 5 | IX_t_dokusya_rireki_ja_id | ja_id |  |  | Tìm kiếm theo JA |
| 6 | IX_t_dokusya_rireki_kanri_shiten_id | kanri_shiten_id |  |  | Tìm kiếm theo chi nhánh quản lý |
| 7 | IX_t_dokusya_rireki_shiten_id | shiten_id |  |  | Tìm kiếm theo chi nhánh bán hàng |
| 8 | IX_t_dokusya_rireki_hanbaiten_id | hanbaiten_id |  |  | Tìm kiếm theo cửa hàng |
| 9 | IX_t_dokusya_rireki_chain | dokusya_id, joho_henko_tekiyo_date, rireki_no |  |  | Tìm chuỗi bitemporal (findBefore/findNext/xác định bản ghi hữu hiệu theo thứ tự ngày áp dụng) |

---

# t_koza_furikae (Bảng dữ liệu chuyển khoản ngân hàng)

| STT | Tên cột | PK | Kiểu dữ liệu | Kích thước | IDENTITY | Cho phép NULL | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | koza_furikae_id | 〇 | BIGINT |  | 〇 |  | ID dữ liệu chuyển khoản (IDENTITY) |
| 2 | ja_id |  | BIGINT |  |  |  | JA ID (FK: m_ja) |
| 3 | dokusya_id |  | BIGINT |  |  |  | ID người đăng ký (FK: t_dokusya) |
| 4 | target_month |  | VARCHAR | 6 |  |  | Tháng đối tượng (YYYYMM) |
| 5 | furikae_date |  | DATE |  |  | 〇 | Ngày chuyển khoản |
| 6 | furikae_kingaku |  | NUMERIC | 10 |  | 〇 | Số tiền chuyển khoản |
| 8 | koza_no |  | VARCHAR | 10 |  |  | Số tài khoản |
| 9 | koza_meigi |  | VARCHAR | 50 |  |  | Tên chủ tài khoản |
| 10 | yokin_shubetsu |  | INTEGER |  |  | 〇 | Loại tiền gửi (1: Thông thường, 2: Vãng lai) ※Snapshot tại thời điểm xuất |
| 11 | bank_code |  | VARCHAR | 4 |  |  | Mã ngân hàng |
| 12 | bank_name |  | VARCHAR | 100 |  |  | Tên ngân hàng |
| 13 | bank_branch_code |  | VARCHAR | 3 |  |  | Mã chi nhánh ngân hàng |
| 14 | bank_branch_name |  | VARCHAR | 100 |  |  | Tên chi nhánh ngân hàng |
| 15 | created_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ tạo |
| 16 | created_by |  | VARCHAR | 50 |  |  | Người tạo |
| 17 | updated_at |  | TIMESTAMPTZ |  |  |  | Ngày giờ cập nhật |
| 18 | updated_by |  | VARCHAR | 50 |  |  | Người cập nhật |

## Chỉ mục

| STT | Tên chỉ mục | Tên cột | Khóa chính | Duy nhất | Ghi chú |
|---|---|---|---|---|---|
| 1 | PK_t_koza_furikae | koza_furikae_id | 〇 | 〇 | Khóa chính |
| 2 | UQ_t_koza_furikae_dokusya_month | dokusya_id, target_month |  | 〇 | Ngăn chặn trùng lặp chuyển khoản hàng tháng |
| 3 | IX_t_koza_furikae_ja_id | ja_id |  |  | Tìm kiếm theo JA |
| 4 | IX_t_koza_furikae_dokusya_id | dokusya_id |  |  | Tìm kiếm theo người đăng ký |
| 5 | IX_t_koza_furikae_target_month | target_month |  |  | Tìm kiếm theo tháng đối tượng |
| 6 | IX_t_koza_furikae_dokusya_month | dokusya_id, target_month |  |  | Tối ưu hóa tìm kiếm chuyển khoản hàng tháng |
