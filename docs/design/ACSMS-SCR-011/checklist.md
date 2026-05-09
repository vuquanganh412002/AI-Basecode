---
title: SCR-011 API Review Checklist — Chi tiết từng field & API
date: 2026-05-05
author: Claude Code
---

# SCR-011 API Review Checklist — Hướng dẫn chi tiết

## Phần I — Danh sách API và ý nghĩa

### API 1: POST /api/v1/dokusya — Tạo mới bản ghi t_dokusya

| Mục | Nội dung |
|---|---|
| **Chức năng** | Tạo mới một bản ghi t_dokusya (購読者) trong hệ thống |
| **HTTP Method** | POST |
| **URL** | `/api/v1/dokusya` |
| **Yêu cầu quyền** | `dokusya.create` — chỉ CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN có |
| **HTTP Status** | `201 Created` |
| **Request Body** | JSON chứa 40+ trường (xem Phần II) |
| **Response** | Bản ghi vừa tạo, bao gồm `dokusya_id` auto-generate |

#### Luồng xử lý (Processing Steps)

```
1. [Auth] Kiểm tra SessionAuthGuard — session còn hạn?
2. [Auth] Kiểm tra PermissionsGuard — user có `dokusya.create`?
3. [Valid] Validate request body qua CreateDokusyaDto
4. [Valid] Validate m_code fields: dokusya_shubetsu, tetsuzuki_shurui, etc.
5. [Valid] Conditional validation: haitatsu_* khi haitatsu_same_flg=false
6. [Valid] Conditional validation: bank_* khi shiharai_hoho=1
7. [Scope] ja_id lấy từ session.ja_id (KHÔNG từ request)
8. [Scope] Verify kanri_shiten_id / shiten_id / hanbaiten_id thuộc scope
9. [FK] Verify FK references: hanbaiten_id, tanka_id, kanri_shiten_id, shiten_id
10. [Logic] Set rireki_no=1, shoki_dokusya_kaishi_date=dokusya_kaishi_date
11. [DB] INSERT t_dokusya + t_log audit trong 1 transaction
12. [Response] Trả 201 + created record (KHÔNG trả bank account info)
```

#### Thông tin quan trọng API cung cấp

- ✅ `dokusya_id`: ID subscriber vừa tạo — FE dùng để redirect sang màn hình edit (SCR-012)
- ✅ `rireki_no`: Luôn = 1 lần đầu — dùng để theo dõi lịch sử thay đổi
- ✅ `created_at`, `created_by`: Metadata audit trail
- ✅ `shoki_dokusya_kaishi_date`: Ngày đăng ký ban đầu — dùng để tính năm đăng ký
- ❌ KHÔNG trả: `bank_branch_code`, `hikiotoshi_koza_no`, `hikiotoshi_koza_meigi` (nhạy cảm)

---

### API 2: GET /api/v1/kanri-shiten?ja_id={ja_id}

| Mục | Nội dung |
|---|---|
| **Chức năng** | Lấy danh sách quản lý支店 (kanri_shiten) cho một JA — dùng dropdown |
| **HTTP Method** | GET |
| **URL** | `/api/v1/kanri-shiten?ja_id={jaId}` |
| **Query Param** | `ja_id` (REQUIRED) — JA ID từ session |
| **Response** | Array của `{ kanri_shiten_id, kanri_shiten_code, kanri_shiten_name, ... }` |

#### Ý nghĩa & thông tin cung cấp

- **Quản lý支店 là gì?** — Một tổ chức vệ tinh trực thuộc JA, quản lý 1 hoặc nhiều 支店
- **Dùng để**: Dropdown "管理支店" ở Section 1 của form
- **Quên API này → Bug**: User không thể chọn quản lý支店 → form incomplete → không submit được
- **Dữ liệu trả**: `kanri_shiten_id` + `kanri_shiten_code` + `kanri_shiten_name` (ít nhất)

**Note**: Tài liệu API 011 có **TÀI LIỆU CHƯA** định nghĩa API này không? 
→ Nếu chưa, phải **reference** ra SCR-008 (管理支店マスタ明細検索画面) để biết chi tiết.

---

### API 3: GET /api/v1/shiten?kanri_shiten_id={kanri_shiten_id}

| Mục | Nội dung |
|---|---|
| **Chức năng** | Lấy danh sách 支店 phụ thuộc một quản lý支店 — dùng dropdown |
| **HTTP Method** | GET |
| **URL** | `/api/v1/shiten?kanri_shiten_id={kanriShitenId}` |
| **Query Param** | `kanri_shiten_id` (OPTIONAL?) — phụ thuộc kanri_shiten được chọn |
| **Response** | Array của `{ shiten_id, shiten_code, shiten_name, ... }` |

#### Ý nghĩa & thông tin cung cấp

- **支店 là gì?** — Chi nhánh bán hàng của JA, cấp bé hơn quản lý支店
- **Dùng để**: Dropdown "支店" ở Section 1 của form
- **Cascading dropdown**: Khi user chọn kanri_shiten → dropdown 支店 được load từ API này
- **Nếu quên**: User chỉ thấy 支店 của tất cả quản lý支店 → chọn sai → dữ liệu lộn xộn

**Note**: SCR-006 (支店マスタ明細検索画面) đã định nghĩa GET /api/v1/shiten
→ Tài liệu API 011 chỉ cần **reference** SCR-006, không tự định nghĩa lại.

---

### API 4: GET /api/v1/hanbaiten?ja_id={ja_id}

| Mục | Nội dung |
|---|---|
| **Chức năng** | Lấy danh sách 販売店 (bán hàng) cho một JA |
| **HTTP Method** | GET |
| **URL** | `/api/v1/hanbaiten?ja_id={jaId}` |
| **Query Param** | `ja_id` (REQUIRED) — JA ID từ session |
| **Response** | Array của `{ hanbaiten_id, hanbaiten_code, hanbaiten_name, ... }` |

#### Ý nghĩa & thông tin cung cấp

- **販売店 là gì?** — Hệ thống cửa hàng / điểm bán hàng của JA
- **Dùng để**: Dropdown "販売店コード" (Section 4 — 販売店・支払方法)
- **Ảnh hưởng đến**: Doanh số bán hàng, theo dõi chi nhánh, phân tích bán hàng
- **Quan trọng**: Mỗi dokusya phải gắn với 1 hanbaiten → không thể bỏ trống

**Note**: API này có thể được định nghĩa ở SCR-009 hoặc SCR-011
→ Cần kiểm tra xem đã có chưa, nếu chưa phải thêm vào.

---

### API 5: GET /api/v1/tanka?tanka_type=1

| Mục | Nội dung |
|---|---|
| **Chức năng** | Lấy danh sách 単価 (đơn giá) cho loại "購読料" (subscription fee) |
| **HTTP Method** | GET |
| **URL** | `/api/v1/tanka?tanka_type=1` |
| **Query Param** | `tanka_type=1` (FIXED) — chỉ lấy `tanka_type=1` (購読料), không phải loại khác |
| **Response** | Array của `{ tanka_id, tanka_type, tanka_name, kingaku, ... }` |

#### Ý nghĩa & thông tin cung cấp

- **単価 là gì?** — Giá đăng ký (hàng ngày/tháng) của tờ báo
- **Tại sao tanka_type=1?** — t_dokusya.tanka_id phải reference `tanka_type=1` **only**
  - `tanka_type=1`: 購読料 (subscription fee) — có thể link từ dokusya
  - `tanka_type=2`: 配達手数料 (delivery fee) — không dùng ở màn hình này
- **Dùng để**: Dropdown "新聞単価" (Section 1)
- **Ảnh hưởng đến**: Tính toán tiền đăng ký hàng tháng, hóa đơn

**Note**: API này được định nghĩa ở SCR-005 (単価マスタ明細検索画面)
→ Tài liệu API 011 reference SCR-005, hoặc tự định nghĩa GET endpoint riêng.

---

## Phần II — Chi tiết từng trường (Form Fields ↔ DB Columns)

### Cách đọc bảng dưới

Mỗi trường gồm các cột:
- **Form Label** — Tên hiển thị trên màn hình
- **DB Column** — Cột trong bảng t_dokusya hoặc bảng liên kết
- **Type** — Kiểu dữ liệu (VARCHAR, INTEGER, DATE, ...)
- **Required** — Bắt buộc hay không
- **Ý nghĩa** — Dữ liệu này dùng để làm gì trong hệ thống
- **Validation** — Quy tắc kiểm tra (format, min/max, ...)
- **m_code?** — Nếu có, phải validate qua CodeService.has(category, value)

---

### SECTION 1 — 購読種別、手続種類、電子版読者種別等

#### Trường 1.1: 購読種別 (Subscription Type)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読種別 |
| **DB Column** | `dokusya_shubetsu` (INTEGER, NOT NULL) |
| **Type** | Radio button — 3 lựa chọn |
| **Lựa chọn** | `1` (紙版), `2` (電子版), `3` (併読) |
| **Required** | ✅ YES — bắt buộc |
| **Ý nghĩa & tác dụng** | Quyết định loại đăng ký: chỉ báo in, chỉ báo điện tử, hay cả hai?<br/>→ Ảnh hưởng đến:<br/>- 配達先情報 (delivery address) — chỉ bắt buộc nếu `dokusya_shubetsu != 2`<br/>- 電子版読者種別 — chỉ hiển thị nếu `dokusya_shubetsu = 2 hoặc 3`<br/>- 請求開始月 (billing start month) — chỉ hiển thị nếu `dokusya_shubetsu = 2 hoặc 3`<br/>→ Dùng tính toán tiền: báo in vs báo điện tử có giá khác |
| **Validation** | `@IsInt()` + `CodeService.has('DOKUSYA_SHUBETSU', value)` |
| **m_code** | ✅ YES — m_code.code_category='DOKUSYA_SHUBETSU' |

---

#### Trường 1.2: 手続種類 (Procedure Type)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 手続種類 |
| **DB Column** | `tetsuzuki_shurui` (INTEGER, NOT NULL) |
| **Type** | Radio button — 2 lựa chọn |
| **Lựa chọn** | `0` (解約 = Cancel), `1` (新規 = New) |
| **Required** | ✅ YES — bắt buộc |
| **Default** | `1` (新規) — default khi form load |
| **Ý nghĩa & tác dụng** | Loại giao dịch: đăng ký mới hay hủy bỏ?<br/>→ Dùng để:<br/>- Định hướng quy trình xử lý (hủy → cleanup, đăng ký → init)<br/>- Tính toán số lượng đăng ký mới vs hủy (báo cáo)<br/>- Logic phê duyệt khác nhau tùy loại giao dịch |
| **Validation** | `@IsInt()` + `CodeService.has('TETSUZUKI_SHURUI', value)` |
| **m_code** | ✅ YES — m_code.code_category='TETSUZUKI_SHURUI' |

---

#### Trường 1.3: 電子版読者種別 (Digital Reader Type)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 電子版読者種別 |
| **DB Column** | `denshi_dokusya_shubetsu` (INTEGER, **NULL許容**) |
| **Type** | Radio button — 2 lựa chọn |
| **Lựa chọn** | `0` (無料 = Free), `1` (有料 = Paid) |
| **Required** | ❓ **Conditional** — bắt buộc khi `dokusya_shubetsu = 2 hoặc 3`<br/>→ Khi `dokusya_shubetsu = 1` (chỉ báo in) → không thấy field này |
| **Ý nghĩa & tác dụng** | Phân biệt độc giả báo điện tử trả tiền vs miễn phí<br/>→ Dùng:<br/>- Quản lý doanh thu báo điện tử<br/>- Gửi nội dung khác nhau (miễn phí: partial, paid: full)<br/>- Báo cáo số lượng người dùng trả tiền |
| **Validation** | `@IsInt()` + `CodeService.has('DENSHI_DOKUSYA_SHUBETSU', value)` |
| **m_code** | ✅ YES — m_code.code_category='DENSHI_DOKUSYA_SHUBETSU' |
| **Conditional Rule** | `if (!denshi_dokusya_shubetsu && (dokusya_shubetsu === 2 || dokusya_shubetsu === 3)) { throw "電子版読者種別は必須です"; }` |

---

#### Trường 1.4: ID (Dokusya ID — display only)

| Mục | Chi tiết |
|---|---|
| **Form Label** | ID |
| **DB Column** | `dokusya_id` (BIGINT, auto-generate) |
| **Type** | Text input — READ-ONLY (disabled) |
| **Required** | ❌ NO — server tự generate, không nhập |
| **Ý nghĩa & tác dụng** | Hiển thị ID subscriber vừa tạo (phục vụ chỉ tiêu để FE redirect)<br/>→ Form load: để trống (chưa tạo)<br/>→ Submit thành công: display dokusya_id |
| **Server-set** | ✅ YES — auto-generate BIGINT sequence |

---

#### Trường 1.5: 管理支店 (Management Branch)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 管理支店 |
| **DB Column** | `kanri_shiten_id` (BIGINT, **NULL許容 nhưng form yêu cầu**) |
| **Type** | Dropdown select — populated từ API 2 |
| **Required** | ✅ YES — form bắt buộc (nhưng DB nullable, tại sao?) |
| **Ý nghĩa & tác dụng** | Quản lý支店nào quản lý subscriber này?<br/>→ Dùng:<br/>- Phân quyền: JA_KANRI_SHITEN chỉ thấy subscriber của kanri_shiten họ<br/>- Gửi báo cáo: mỗi kanri_shiten nhận báo cáo của họ<br/>- Tính phí quản lý/hỗ trợ |
| **Validation** | `@IsInt()` (required) + FK check: verify `kanri_shiten.ja_id = session.ja_id` |
| **Scope Check** | 🔒 JA_KANRI_SHITEN role: kanri_shiten_id phải = session.kanri_shiten_id |
| **Cascading** | Khi kanri_shiten_id thay đổi → reload dropdown 支店 (API 3) |

---

#### Trường 1.6: 支店 (Branch)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 支店 |
| **DB Column** | `shiten_id` (BIGINT, **NULL許容**) |
| **Type** | Dropdown select — populated từ API 3 (phụ thuộc kanri_shiten_id) |
| **Required** | ❌ NO — optional |
| **Ý nghĩa & tác dụng** | Chi nhánh bán hàng cụ thể quản lý subscriber<br/>→ Dùng:<br/>- Phân tích doanh số theo chi nhánh<br/>- Gửi thông báo chi nhánh cụ thể<br/>- Tính hoa hồng chi nhánh |
| **Validation** | `@IsInt()` (optional) + FK check nếu có: verify `shiten.kanri_shiten_id = kanri_shiten_id` |
| **Scope Check** | Phải thuộc kanri_shiten được chọn (xác minh qua FK) |
| **Cascading** | Dropdown 支店 chỉ show items có `kanri_shiten_id = selected_kanri_shiten_id` |

---

#### Trường 1.7: 組合員コード (Member Code)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 組合員コード |
| **DB Column** | `kumiaiin_code` (VARCHAR 20, **NULL許容**) |
| **Type** | Text input |
| **Required** | ❌ NO — optional |
| **Ý nghĩa & tác dụng** | Mã thành viên cấp bộ (khi subscriber là thành viên JA)<br/>→ Dùng:<br/>- Link đến hệ thống thành viên JA (JASTEM)<br/>- Tính lợi tức, hỗ trợ thành viên<br/>- Báo cáo thành viên |
| **Validation** | Nếu có: max 20 chars, alphanumeric |
| **Uniqueness** | Không unique global, nhưng unique trong 1 JA (có thể) |

---

#### Trường 1.8: 履歴No (History Number)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 履歴No |
| **DB Column** | `rireki_no` (INTEGER, auto-set) |
| **Type** | Text input — READ-ONLY (display) |
| **Required** | ❌ NO — server tự set = 1 |
| **Ý nghĩa & tác dụng** | Số lần thay đổi subscriber này<br/>→ Tạo mới: rireki_no = 1<br/>→ Edit lần 2: rireki_no = 2<br/>→ Dùng để:<br/>- Theo dõi lịch sử thay đổi<br/>- Audit trail: ai sửa lần thứ mấy<br/>- Link sang bảng lịch sử (nếu có) |
| **Server-set** | ✅ YES — luôn = 1 khi tạo mới |

---

### SECTION 2 — 購読者情報 (Subscriber Information)

#### Trường 2.1: 購読者氏名 (Subscriber Name)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読者氏名 |
| **DB Columns** | `shimei_sei` (VARCHAR 50) + `shimei_mei` (VARCHAR 50) |
| **Type** | 2 text inputs (Last name + First name) |
| **Required** | ✅ YES — cả hai bắt buộc |
| **Format** | Kanji (hiragana/katakana có thể nhưng rare) |
| **Validation** | `@IsString()` + `@MinLength(1)` + `@MaxLength(50)` cho mỗi trường |
| **Ý nghĩa & tác dụng** | Tên người đăng ký (người nhận báo)<br/>→ Dùng:<br/>- In áo phiếu, hóa đơn<br/>- Xác minh danh tính<br/>- Lập báo cáo (sắp xếp theo tên) |
| **Trim** | ✅ REQUIRED — trim leading/trailing spaces trước validate |

---

#### Trường 2.2: 購読者かな (Subscriber Name Kana)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読者かな |
| **DB Columns** | `shimei_kana_sei` (VARCHAR 100) + `shimei_kana_mei` (VARCHAR 100) |
| **Type** | 2 text inputs (Last name katakana + First name katakana) |
| **Required** | ✅ YES — cả hai bắt buộc |
| **Format** | Katakana only (ひらがな/漢字 = ERROR) |
| **Validation** | `@Matches(/^[ァ-ヴー々〆〤]*$/)` (katakana only) + max 100 |
| **Ý nghĩa & tác dụng** | Tên Katakana dùng cho:<br/>- In áo phiếu (phần phía dưới)<br/>- Xác minh khi phát hành (reading pronunciation)<br/>- Tương thích với JASTEM (hệ thống bên ngoài) |
| **Trim** | ✅ REQUIRED |

---

#### Trường 2.3: 郵便番号 (Postal Code)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 郵便番号 |
| **DB Column** | `yubin_no` (VARCHAR 7, NOT NULL) |
| **Type** | Text input |
| **Required** | ✅ YES |
| **Format** | Exactly 7 digits: `^\d{7}$` (NO hyphen in DB: `1234567`, not `123-4567`) |
| **Validation** | `@Matches(/^\d{7}$/)` with message "郵便番号は7桁の半角数字で入力してください" |
| **Ý nghĩa & tác dụng** | Mã bưu chính để xác định tỉnh/huyện<br/>→ Dùng:<br/>- Auto-fill prefecture (都道府県) từ first 2 digits<br/>- Tính phí gửi bưu chính<br/>- Gửi bưu kiện hành chính |
| **Trim** | ✅ REQUIRED |
| **Auto-fill** | Khi user blur khỏi field: gọi API để lấy prefecture code từ yubin_no |

---

#### Trường 2.4: 都道府県 (Prefecture)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 都道府県 |
| **DB Column** | `todofuken_code` (VARCHAR 2, NOT NULL) |
| **Type** | Dropdown select — 47 tỉnh Japan |
| **Required** | ✅ YES |
| **Data Source** | Static list (47 prefectures) hoặc m_code category (check seeder.md) |
| **Validation** | `@IsString()` + valid 2-char prefecture code |
| **Ý nghĩa & tác dụng** | Tỉnh/thành phố:<br/>→ Dùng:<br/>- Phân tích doanh số theo vùng<br/>- Quản lý logistics (gửi từ warehouse nào)<br/>- Tính thuế (nếu khác nhau theo tỉnh)<br/>→ Có thể auto-fill từ yubin_no |
| **Mapping** | Postal code `12` → Prefecture code `13` (Tokyo) |

---

#### Trường 2.5: 市町村郡 (Municipality)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 市町村郡 |
| **DB Column** | `shikuchoson` (VARCHAR 100, NOT NULL) |
| **Type** | Text input |
| **Required** | ✅ YES |
| **Format** | Free text (Kanji) |
| **Validation** | `@IsString()` + `@MaxLength(100)` |
| **Ý nghĩa & tác dụng** | Tên thị xã/huyện:<br/>→ Dùng:<br/>- Địa chỉ đầy đủ (khi in)<br/>- Phân tích doanh số địa phương |
| **Trim** | ✅ REQUIRED |

---

#### Trường 2.6: 丁目番地 (Block Number / Street Address)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 丁目番地 |
| **DB Column** | `chome_banchi` (VARCHAR 100, NOT NULL) |
| **Type** | Text input |
| **Required** | ✅ YES |
| **Format** | Free text (e.g., "1-2-3", "10番地") |
| **Validation** | `@IsString()` + `@MaxLength(100)` |
| **Ý nghĩa & tác dụng** | Tên đường/số nhà nhỏ:<br/>→ Dùng:<br/>- Địa chỉ giao hàng<br/>- In trên phong bì bưu kiện |
| **Trim** | ✅ REQUIRED |

---

#### Trường 2.7: マンション・アパート名 (Building Name)

| Mục | Chi tiết |
|---|---|
| **Form Label** | マンション・アパート名 |
| **DB Column** | `tatemono_mei` (VARCHAR 100, **NULL許容**) |
| **Type** | Text input |
| **Required** | ❌ NO — optional (người ở nhà riêng không cần) |
| **Format** | Free text (e.g., "ビル東棟 501号") |
| **Validation** | `@IsString()` + `@MaxLength(100)` (optional) |
| **Ý nghĩa & tác dụng** | Tên chung cư/căn hộ:<br/>→ Dùng:<br/>- Địa chỉ hoàn chỉnh<br/>- Tìm đúng căn hộ (phân biệt nhà cùng tên) |
| **Trim** | ✅ REQUIRED nếu có |

---

#### Trường 2.8: 連絡先1 & 2 (Contact Phone 1 & 2)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 連絡先1 / 連絡先2 |
| **DB Columns** | `renrakusaki_1` (VARCHAR 15) / `renrakusaki_2` (VARCHAR 15), both **NULL許容** |
| **Type** | 2 text inputs |
| **Required** | ❌ NO — optional, nhưng nên có ít nhất 1 |
| **Format** | Phone (10-11 digits Nhật) |
| **Validation** | `@Matches(/^\d{10,11}$/)` nếu có |
| **Ý nghĩa & tác dụng** | Số điện thoại liên hệ:<br/>→ Dùng:<br/>- Gọi xác nhận nếu có vấn đề giao hàng<br/>- Gọi để cộng tác, thu phí<br/>→ Có thể gọi trong giờ hành chính |
| **Trim** | ✅ REQUIRED nếu có |
| **Format Note** | Lưu 10-11 ký tự số, không có dấu cách/dấu gạch ngang |

---

#### Trường 2.9: メールアドレス (Email Address)

| Mục | Chi tiết |
|---|---|
| **Form Label** | メールアドレス |
| **DB Column** | `email` (VARCHAR 100, **NULL許容**) |
| **Type** | Text input (type="email") |
| **Required** | ❌ NO — optional |
| **Format** | Valid email format |
| **Validation** | `@IsEmail()` nếu có |
| **Ý nghĩa & tác dụng** | Email liên hệ:<br/>→ Dùng:<br/>- Gửi invoice (PDF)<br/>- Gửi notification (giao hàng delay, ...)<br/>→ Linked với mail_magazine_flg (below) |
| **Trim** | ✅ REQUIRED nếu có |

---

#### Trường 2.10: メールマガジン (Email Magazine Flag)

| Mục | Chi tiết |
|---|---|
| **Form Label** | メールマガジン |
| **DB Column** | `mail_magazine_flg` (INTEGER, NOT NULL) |
| **Type** | Radio button — 2 lựa chọn |
| **Lựa chọn** | `0` (に信しない = No), `1` (に信する = Yes) |
| **Required** | ✅ YES |
| **Default** | `0` (no) — form shows "に信しない" as default |
| **Ý nghĩa & tác dụng** | Đồng ý nhận newsletter qua email?<br/>→ Dùng:<br/>- Comply GDPR/privacy law (Japan: PPC)<br/>- Marketing list: chỉ gửi nếu = 1<br/>→ Đặc biệt: có email nhưng flag=0 → KHÔNG gửi email |
| **Validation** | `@IsInt()` + value in [0, 1] |
| **m_code** | Có thể (kiểm tra seeder.md) |

---

#### Trường 2.11: 生年（西暦）(Birth Year)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 生年（西暦）|
| **DB Column** | `birth_year` (INTEGER, **NULL許容**) |
| **Type** | Text input (4 digits) |
| **Required** | ❌ NO — optional |
| **Format** | 4-digit year (1920-2026) |
| **Validation** | `@IsInt()` + `@Min(1920)` + `@Max(2026)` nếu có |
| **Ý nghĩa & tác dụng** | Năm sinh:<br/>→ Dùng:<br/>- Phân tích độ tuổi (huy động quản lý nông)<br/>- Tính tuổi hưu<br/>→ Không bắt buộc (privacy sensitive) |
| **Trim** | ✅ REQUIRED nếu có |

---

#### Trường 2.12: 性別 (Gender)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 性別 |
| **DB Column** | `gender` (INTEGER, **NULL許容**) |
| **Type** | Radio button — 3 lựa chọn |
| **Lựa chọn** | `1` (男性 = Male), `2` (女性 = Female), `9` (回答しない = No answer) |
| **Required** | ✅ YES — form yêu cầu (DB nullable, nhưng form buộc chọn) |
| **Default** | `9` (no answer) — default chọn "回答しない" |
| **Validation** | `@IsInt()` + `CodeService.has('GENDER', value)` |
| **m_code** | ✅ YES — m_code.code_category='GENDER' |
| **Ý nghĩa & tác dụng** | Giới tính:<br/>→ Dùng:<br/>- Phân tích đối tượng bạn đọc<br/>- Tùy chỉnh nội dung/quảng cáo<br/>- Báo cáo phân bố giới tính |

---

### SECTION 3 — 配達先情報 (Delivery Address Information)

> **Quy tắc hiển thị**: Chỉ hiển thị khi `dokusya_shubetsu = 1` (paper only). Khi `= 2 hoặc 3`, section này disabled.

#### Trường 3.0: 配達先読者情報と同じ (Same as Subscriber Checkbox)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読者情報と同じ |
| **DB Effect** | Nếu checked: tất cả `haitatsu_*` fields = `*` fields ở Section 2 |
| **Type** | Checkbox |
| **Ý nghĩa** | Giao hàng đến địa chỉ giống người đăng ký? |
| **UX Logic** | Khi check: auto-fill `haitatsu_*` từ Section 2 fields<br/>→ Khi uncheck: xóa `haitatsu_*` để user nhập |

---

#### Trường 3.1-3.8: 郵便番号, 都道府県, 市町村郡, 丁目番地, マンション・アパート名, 連絡先1, 連絡先2, 配達先読者氏名, 配達先読者かな

| Mục | Chi tiết |
|---|---|
| **Form Labels** | Các trường `haitatsu_*` (delivery address counterparts) |
| **DB Columns** | `haitatsu_yubin_no`, `haitatsu_todofuken_code`, `haitatsu_shikuchoson`, ..., `haitatsu_shimei_sei`, `haitatsu_shimei_kana_sei`, etc. |
| **Type** | Tương tự Section 2 |
| **Required** | ❓ **Conditional**: Bắt buộc khi `haitatsu_same_flg = false` AND `dokusya_shubetsu != 2` |
| **Ý nghĩa & tác dụng** | Nơi giao hàng (khác địa chỉ người đăng ký)<br/>→ Dùng:<br/>- Giao hàng đúng nơi (ví: công ty khác địa chỉ nhà)<br/>- In phiếu bưu chính cụ thể |
| **Validation** | Same as Section 2, nhưng optional tùy điều kiện |
| **Conditional Rule** | `if (!haitatsu_same_flg && dokusya_shubetsu !== 2) {` <br/>`  if (!haitatsu_yubin_no?.trim()) throw "配達先郵便番号は必須です";`<br/>`  // ... validate other fields`<br/>`}` |

---

### SECTION 4 — 販売店・支払方法 (Sales Shop & Payment Method)

#### Trường 4.1: 販売店コード (Sales Shop Code)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 販売店コード |
| **DB Column** | `hanbaiten_id` (BIGINT, NOT NULL) — **Lưu ID, không phải code** |
| **Type** | Dropdown select (populated từ API 4) — or text input (code) + auto-lookup |
| **Required** | ✅ YES |
| **Ý nghĩa & tác dụng** | Chọn cửa hàng/điểm bán quản lý subscriber<br/>→ Dùng:<br/>- Phân tích bán hàng theo điểm bán<br/>- Gửi commission/hoa hồng<br/>- Phân tích ROI từng điểm |
| **Validation** | `@IsInt()` + FK check: `hanbaiten.ja_id = session.ja_id` |
| **Scope** | Chỉ show hanbaiten thuộc JA của session |

---

#### Trường 4.2: 販売店名 (Sales Shop Name)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 販売店名 |
| **DB Column** | N/A — auto-fetch từ hanbaiten table (read-only display) |
| **Type** | Text display (read-only) |
| **Ý nghĩa & tác dụng** | Hiển thị tên cửa hàng vừa chọn (confirm) |

---

#### Trường 4.3: 郵便区分 (Postal Classification)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 郵便区分 |
| **DB Column** | `yubin_kubun` (VARCHAR 1, NOT NULL) |
| **Type** | Dropdown select |
| **Lựa chọn** | `'0'` (なし = None), `'1'` (郵便 = Mail) |
| **Default** | `'0'` |
| **Validation** | value in ['0', '1'] |
| **Ý nghĩa & tác dụng** | Giao hàng bằng bưu chính Nhật Bản?<br/>→ Dùng:<br/>- Tính phí bưu chính<br/>- Chuẩn bị dữ liệu để gửi đơn vị bưu chính<br/>- Theo dõi tình trạng giao hàng |
| **m_code?** | Có thể (check seeder.md) hay hardcode [0, 1] |

---

#### Trường 4.4: 支払方法 (Payment Method)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 支払方法 |
| **DB Column** | `shiharai_hoho` (INTEGER, NOT NULL) |
| **Type** | Dropdown select |
| **Lựa chọn** | `1` (口座振替 = Bank transfer), `2` (現金集金 = Cash collection), `3` (送金 = Transfer), `4` (JA施設 = JA facility), `5` (給与控除 = Salary deduction), `6` (クレジットカード = Credit card), `9` (その他 = Other) |
| **Required** | ✅ YES |
| **Validation** | `@IsInt()` + `CodeService.has('SHIHARAI_HOHO', value)` |
| **m_code** | ✅ YES — m_code.code_category='SHIHARAI_HOHO' |
| **Ý nghĩa & tác dụng** | Cách thanh toán:<br/>→ Dùng:<br/>- Quyết định qui trình thu tiền (bank auto-debit vs staff collection)<br/>- Tính ngày thanh toán<br/>→ **Ảnh hưởng visibility**: nếu = 1 → show bank fields (4.5-4.8), else hide |
| **Conditional Fields** | Khi shiharai_hoho = 1: show + require bank account fields<br/>Else: hide bank fields |

---

#### Trường 4.5: 購読料支払サイクル (Subscription Fee Payment Cycle)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読料支払サイクル |
| **DB Column** | `dokusyaryo_shiharai_cycle` (INTEGER, **NULL許容**) |
| **Type** | Text input (number) |
| **Required** | ❌ NO — optional |
| **Unit** | Tháng (months) |
| **Format** | Integer 1-12 (thường) |
| **Validation** | `@IsInt()` + `@Min(1)` + `@Max(24)` nếu có |
| **Ý nghĩa & tác dụng** | Tần suất thu tiền (hàng tháng, hàng quý, hàng năm)<br/>→ Dùng:<br/>- Lên lịch thu tiền (billing schedule)<br/>- Tính ngày hạn kỳ thanh toán |

---

#### Trường 4.6-4.9: 引落口座 Fields (Bank Account Fields)

| Mục | Chi tiết |
|---|---|
| **Form Labels** | 引落口座支店, 引落口座貯金種目, 引落口座番号, 引落口座名義 |
| **DB Columns** | `bank_branch_code`, `bank_branch_name`, `hikiotoshi_yokin_shubetsu`, `hikiotoshi_koza_no`, `hikiotoshi_koza_meigi` |
| **Type** | Dropdown (支店), Dropdown (種目), Text (account #), Text (account name) |
| **Required** | ❓ **Conditional**: Bắt buộc khi `shiharai_hoho = 1` |
| **Validation** | Các rule phức tạp cho tài khoản ngân hàng |
| **🔐 Security** | **KHÔNG trả trong response 201** — sensitive banking data |
| **Conditional Rule** | `if (shiharai_hoho === 1) {`<br/>`  require bank_branch_code, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi`<br/>`}` |
| **Ý nghĩa** | Thông tin tài khoản ngân hàng để auto-debit tiền subscription |

---

### SECTION 5 — 購読者層分類 (Subscriber Classification)

#### Trường 5.1: 読者属性 (Reader Attribute) — Checkboxes

| Mục | Chi tiết |
|---|---|
| **Form Label** | 読者属性 |
| **DB Column** | `dokusyaso_bunrui` (TEXT, nullable) — comma-separated string |
| **Type** | Checkboxes — multi-select |
| **Lựa chọn** | 農業者, 企業・団体, その他, JAグループ役職員, 学生 |
| **Required** | ❌ NO — optional |
| **Format in DB** | Comma-separated: `"農業者,企業・団体"` |
| **Validation** | Validate each selected item (if validation needed) |
| **Ý nghĩa & tác dụng** | Phân loại subscriber theo tập hợp chuyên đề<br/>→ Dùng:<br/>- Phân tích đối tượng bạn đọc<br/>- Tùy chỉnh nội dung theo segment<br/>→ Có thể multi-select (farmer + JA staff cùng lúc) |

---

#### Trường 5.2: 主な生産物 (Main Agricultural Products) — Checkboxes

| Mục | Chi tiết |
|---|---|
| **Form Label** | 主な生産物（農業者の場合） |
| **DB Column** | `nogyosya_bunrui` (TEXT, nullable) — comma-separated string |
| **Type** | Checkboxes — multi-select |
| **Lựa chọn** | 米, 野菜, 果実, 花, 畜産, 畜産(?), その他 |
| **Required** | ❌ NO — optional (chỉ ý nghĩa nếu reader = 農業者) |
| **Format in DB** | Comma-separated: `"米,野菜"` |
| **Ý nghĩa & tác dụng** | Phân loại subscriber theo sản phẩm nông<br/>→ Dùng:<br/>- Phân tích nhu cầu nội dung theo sản phẩm<br/>- Gửi promotion liên quan đến sản phẩm<br/>→ Conditional relevance: chỉ meaningful nếu dokusyaso_bunrui contains "農業者" |

---

### SECTION 6 — 購読開始日、中止日 (Subscription Start/Stop Dates)

#### Trường 6.1: 購読開始日 (Subscription Start Date)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読開始日 |
| **DB Columns** | `shoki_dokusya_kaishi_date` (DATE), `dokusya_kaishi_date` (DATE) |
| **Type** | Date input (HTML5 `<input type="date">`) |
| **Required** | ✅ YES |
| **Format** | YYYY-MM-DD (ISO 8601) |
| **Default** | Today's date (khi form load) |
| **Validation** | `@IsDate()` + not future date (hiện tại hoặc quá khứ) |
| **Server Logic** | `shoki_dokusya_kaishi_date = dokusya_kaishi_date` (khi create lần đầu) |
| **Ý nghĩa & tác dụng** | Ngày bắt đầu đăng ký:<br/>→ Dùng:<br/>- Tính ngày bắt đầu gửi báo<br/>- Tính ngày hạn thanh toán<br/>- Báo cáo: subscriber mới từ ngày nào<br/>→ `shoki_dokusya_kaishi_date`: date ghi nhận lần đầu (immutable, dùng để tính kỳ hạn gốc) |

---

#### Trường 6.2: 購読中止日 (Subscription Stop Date)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 購読中止日 |
| **DB Column** | `dokusya_chushi_date` (DATE, **NULL許容**) |
| **Type** | Date input (optional) |
| **Required** | ❌ NO — optional (chỉ cần nếu hủy) |
| **Format** | YYYY-MM-DD |
| **Validation** | Nếu có: `@IsDate()` + >= dokusya_kaishi_date |
| **Ý nghĩa & tác dụng** | Ngày dừng đăng ký (khi hủy):<br/>→ Dùng:<br/>- Tính ngày phát hành cuối cùng<br/>- Tính tiền lệ phí đến ngày hủy<br/>→ Khi tạo mới (新規): để trống<br/>→ Khi hủy (解約): phải nhập |

---

#### Trường 6.3: 請求開始月 (Billing Start Month)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 請求開始月 |
| **DB Column** | `seikyu_kaishi_month` (VARCHAR 6, nullable) — YYYYMM format |
| **Type** | Dropdown month (1-12) or month picker |
| **Required** | ❓ **Conditional**: Hiển thị chỉ khi `dokusya_shubetsu = 2 hoặc 3` (digital) |
| **Format** | YYYYMM (e.g., "202605" = May 2026) |
| **Validation** | `@Matches(/^\d{6}$/)` nếu có + month 01-12 valid |
| **Ý nghĩa & tác dụng** | Tháng bắt đầu tính tiền báo điện tử<br/>→ Dùng:<br/>- Báo điện tử có chu kỳ billing khác báo in (có thể start 1 tháng sau)<br/>- Lên lịch gửi hóa đơn điện tử<br/>→ Điển hình: start billing từ tháng sau (if dokusya_kaishi_date = 5/15, seikyu_kaishi_month = 202606) |

---

### SECTION 7 — 備考 (Remarks)

#### Trường 7.1: 備考 (Remarks / Notes)

| Mục | Chi tiết |
|---|---|
| **Form Label** | 備考 |
| **DB Column** | `biko` (TEXT, **NULL許容**) |
| **Type** | Textarea (6 rows) |
| **Required** | ❌ NO — optional |
| **Format** | Free text (no length limit, nhưng recommend < 1000 chars) |
| **Validation** | `@IsString()` + `@MaxLength(1000)` (tùy policy) |
| **Ý nghĩa & tác dụng** | Ghi chú tự do cho subscriber:<br/>→ Dùng:<br/>- Ghi lưu ý từ staff (vd: "người nhận hay thay đổi")<br/>- Điều kiện đặc biệt (vd: "giao hàng sáng sớm thôi")<br/>- Thông tin liên hệ khác (vd: "chỉ gọi từ 14h-16h") |

---

## Phần III — Quy tắc validation Conditional

### Quy tắc 1: Hiển thị & bắt buộc dựa trên `dokusya_shubetsu`

```typescript
// Khi dokusya_shubetsu = 1 (紙版 — Paper only)
- 配達先情報: ENABLED + REQUIRED (必須)
- 電子版読者種別: HIDDEN
- 請求開始月: HIDDEN

// Khi dokusya_shubetsu = 2 (電子版 — Digital only)
- 配達先情報: DISABLED (greyed out, user cannot edit)
- 電子版読者種別: ENABLED + REQUIRED (必須)
- 請求開始月: ENABLED + OPTIONAL

// Khi dokusya_shubetsu = 3 (併読 — Both)
- 配達先情報: ENABLED + REQUIRED
- 電子版読者種別: ENABLED + REQUIRED
- 請求開始月: ENABLED + OPTIONAL
```

### Quy tắc 2: Bắt buộc haitatsu_* fields dựa trên haitatsu_same_flg

```typescript
// Khi haitatsu_same_flg = true (same as subscriber address)
- haitatsu_yubin_no, haitatsu_todofuken_code, ...: HIDDEN (không hiển thị)
- Client tự fill bằng giá trị từ Section 2

// Khi haitatsu_same_flg = false (different address)
- haitatsu_*: ENABLED + REQUIRED (user phải nhập)
- Validation: REQUIRED nếu dokusya_shubetsu !== 2 (vì digital không giao vật lý)
```

### Quy tắc 3: Bắt buộc bank fields dựa trên shiharai_hoho

```typescript
// Khi shiharai_hoho = 1 (口座振替 — Bank auto-debit)
- bank_branch_code: REQUIRED
- bank_branch_name: REQUIRED
- hikiotoshi_yokin_shubetsu: REQUIRED
- hikiotoshi_koza_no: REQUIRED
- hikiotoshi_koza_meigi: REQUIRED

// Khi shiharai_hoho = 2-9 (other methods)
- bank_* fields: HIDDEN (không hiển thị, không bắt buộc)
```

### Quy tắc 4: Ngày hạn

```typescript
if (dokusya_chushi_date && dokusya_kaishi_date) {
  if (dokusya_chushi_date < dokusya_kaishi_date) {
    throw "購読中止日は購読開始日より後の日付で入力してください";
  }
}
```

---

## Phần IV — Server-set vs Client-send Summary

### Server-set (KHÔNG trong request body)

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `ja_id` | Từ `session.ja_id` | **SECURITY**: không nhận từ client |
| `dokusya_id` | Auto-generate BIGINT | Display after success |
| `rireki_no` | Always = 1 | First version |
| `shoki_dokusya_kaishi_date` | = `dokusya_kaishi_date` | Immutable, for original term tracking |
| `created_at`, `created_by` | Timestamp, user | Audit trail |
| `updated_at`, `updated_by` | Timestamp, user | Audit trail |
| `deleted_at` | NULL | Soft delete flag |

### Client MUST send

```json
// Bắt buộc
dokusya_shubetsu, tetsuzuki_shurui,
shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
dokusya_busu,
yubin_no, todofuken_code, shikuchoson, chome_banchi,
mail_magazine_flg, gender,
hanbaiten_id, tanka_id, shiharai_hoho,
dokusya_kaishi_date,
kanri_shiten_id,

// Conditional (tuỳ dokusya_shubetsu / haitatsu_same_flg / shiharai_hoho)
denshi_dokusya_shubetsu,
haitatsu_*, bank_*,

// Optional
kumiaiin_code,
shiten_id,
renrakusaki_1, renrakusaki_2,
email,
birth_year,
tatemono_mei,
haitatsu_*,
dokusyaryo_shiharai_cycle,
dokusya_chushi_date,
joho_henko_tekiyo_date,
seikyu_kaishi_month,
dokusyaso_bunrui, nogyosya_bunrui,
biko
```

---

## Phần V — Error Code Reference

| Error | HTTP | Khi nào | Message ví dụ |
|---|---|---|---|
| VALIDATION_ERROR | 400 | Field invalid | `{ "errors": [{ "field": "yubin_no", "message": "郵便番号は7桁の半角数字で入力してください" }] }` |
| UNAUTHORIZED | 401 | Session expired | "セッションが切れました。再度ログインしてください" |
| FORBIDDEN | 403 | No `dokusya.create` | "この画面へのアクセス権限がありません" |
| DATA_SCOPE_VIOLATION | 403 | hanbaiten/kanri_shiten out of scope | "このデータへのアクセス権限がありません" |
| NOT_FOUND | 404 | hanbaiten_id not exist or out of scope | "指定された販売店が見つかりません" |
| INTERNAL_SERVER_ERROR | 500 | Lỗi hệ thống | "システムエラーが発生しました。しばらくしてから再度お試しください" |

---

## Phần VI — Testing Checklist

- [ ] API 011-001 tạo subscriber với hết tất cả required fields
- [ ] API 011-001 reject khi thiếu field bắt buộc (validation_error)
- [ ] Conditional validation: haitatsu_* when haitatsu_same_flg=false
- [ ] Conditional validation: denshi_dokusya_shubetsu when dokusya_shubetsu=2 or 3
- [ ] Conditional validation: bank_* when shiharai_hoho=1
- [ ] DataScope: JA_KANRI_SHITEN cannot create for other kanri_shiten
- [ ] FK check: hanbaiten_id, tanka_id, kanri_shiten_id verify
- [ ] Audit log: t_log record created with correct values
- [ ] Response does NOT include bank account info
- [ ] Response includes dokusya_id, rireki_no, created_at
- [ ] Timezone: created_at is TIMESTAMPTZ (Asia/Tokyo)
