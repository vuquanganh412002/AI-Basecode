# Ma trận mapping dữ liệu — Cloud ⇄ Denshiban

> Bản hợp nhất **2 chiều** cho toàn bộ trường độc giả điện tử. Gom lại từ:
> - Chiều VÀO (denshiban → cloud): [Display-Rireki-And-Mapping-Denshiban.md](./Display-Rireki-And-Mapping-Denshiban.md) §1
> - Chiều RA (cloud → denshiban `updateUserInfo`): [outbound-field-matrix.md](./outbound-field-matrix.md) + code `modules/denshiban/denshiban-payload.builder.ts` / `denshiban-payload.validator.ts`
>
> Tình trạng hiện tại: **chỉ chiều RA đã hiện thực** (qua API `updateUserInfo`).
> Chiều VÀO là đặc tả để đồng bộ khởi tạo; cột `users` chỉ đọc (read-only, cmsDB).

---

## 0. Ba "hệ quy chiếu" của tên trường

Cùng một dữ liệu nhưng có **3 tên khác nhau** tùy nơi — phải phân biệt để khỏi nhầm:

| Hệ | Nơi | Ví dụ | Ghi chú |
| --- | --- | --- | --- |
| **Cloud** | Bảng PostgreSQL `t_dokusya` | `yubin_no`, `renrakusaki_1` | Cột nghiệp vụ cloud (snake_case). Entity TypeORM camelCase: `yubinNo`, `renrakusaki1` |
| **Denshiban DB** | Bảng MySQL `users` (view read-only, 113 cột) | `zip1`+`zip2`, `tel1` | Nguồn chiều VÀO. **Tách trường**: mã bưu điện = `zip1`(3)+`zip2`(4); SĐT = `tel1`/`tel2`/`tel3` |
| **Denshiban API** | Tham số `updateUserInfo` | `zip`, `tel` | Đích chiều RA. **Gộp trường**: `zip` = 7 chữ số liền; chỉ **1** trường `tel` |

⚠️ Điểm dễ sai nhất: `users` (DB) tách `zip1/zip2`, `tel1/tel2` — nhưng API `updateUserInfo` gộp thành `zip`, `tel`. Ma trận dưới ghi rõ cả 3 cột ở mỗi hàng.

---

## 1. Ma trận field-level (toàn bộ trường)

Ký hiệu **Chiều**: `←` VÀO (denshiban→cloud) · `→` RA (cloud→denshiban) · `↔` cả hai.

| # | Cloud `t_dokusya` | Ý nghĩa (JP / VN) | Denshiban DB `users` | API `updateUserInfo` | Chiều | Quy tắc chuyển đổi |
| --- | --- | --- | --- | --- | :-: | --- |
| 1 | `denshi_kaiin_id` | 会員ID / ID hội viên điện tử | `id` | `id` | ↔ | Lấy nguyên. Chiều RA: dùng cho update/reread/cancel/approve; do **denshiban sinh** lúc `create`, cloud lưu lại từ response. NULL → chưa đồng bộ, không build được payload update |
| 2 | `kanri_shiten_id` (→ `kanri_shiten_code`) | 管理支店 / mã JA thao tác | `JACd` | `jacd_execute` (JA thực hiện), `jacd` (JA trực thuộc) | ↔ | JACd = `kanri_shiten_code` bỏ hết ký tự không phải số → **đúng 10 chữ số**. `jacd_execute` = JA của **user đang login**; `jacd` = JA của **record** (chỉ gửi khi khác `jacd_execute`, dùng lúc chuyển JA) |
| 3 | `shimei_sei` | 姓 / Họ | `first_name` | `first_name` | ↔ | Lấy nguyên (≤255). ⚠ Chú ý: cloud `sei`(họ)=denshiban `first_name` |
| 4 | `shimei_mei` | 名 / Tên | `last_name` | `last_name` | ↔ | Lấy nguyên (≤255) |
| 5 | `shimei_kana_sei` | 姓カナ / Họ (kana) | `first_kana` | `first_kana` | ↔ | Lấy nguyên, **không convert bảng chữ** (≤255) |
| 6 | `shimei_kana_mei` | 名カナ / Tên (kana) | `last_kana` | `last_kana` | ↔ | Lấy nguyên (≤255) |
| 7 | `yubin_no` | 郵便番号 / Mã bưu điện | `zip1` + `zip2` | `zip` | ↔ | VÀO: nối `zip1`(3)+`zip2`(4). RA: gửi 7 số liền, **không dấu `-`** |
| 8 | `todofuken_code` | 都道府県 / Mã tỉnh | `pref_id` | `pref_id` | ↔ | Map `pref_id` ⇄ mã tỉnh cloud (01–47). RA: **gửi nguyên `'01'`, không strip zero** |
| 9 | `shikuchoson` | 市町村郡 / TP・quận・huyện | `addr` | `addr` | ↔ | Lấy nguyên (≤255). ⚠ **Lệch tên**: cloud `shikuchoson` = denshiban `addr` |
| 10 | `chome_banchi` | 丁目番地 / Số nhà・khu phố | `city` | `city` | ↔ | Lấy nguyên (≤255). ⚠ **Lệch tên**: cloud `chome_banchi` = denshiban `city` |
| 11 | `tatemono_mei` | 建物名 / Tên tòa nhà | `building` | `building` | ↔ | Lấy nguyên (≤255). Optional — rỗng thì bỏ key ở chiều RA |
| 12 | `renrakusaki_1` | 電話 / Liên lạc 1 | `tel1` | `tel` | ↔ | RA: bỏ `-`, ≤13 số. **`renrakusaki_2` KHÔNG gửi RA** (API chỉ có 1 `tel`) |
| 13 | `renrakusaki_2` | 電話2 / Liên lạc 2 | `tel2` | – | ← | Chỉ chiều VÀO (`tel2`). `tel3` không dùng |
| 14 | `email` | メール / Email | `email` | `email` | ↔ | Lấy nguyên. RA: nửa chiều rộng ≤255 (format do DTO `@IsEmail` bảo đảm) |
| 15 | `mail_magazine_flg` | メルマガ / Mail magazine | `melmaga` | `melmaga` | ↔ | 0/1 trùng nghĩa 2 bên, chỉ cần `String(flg)` |
| 16 | `birth_year` | 生年 / Năm sinh | `birthyear` | `birthyear` | ↔ | Lấy nguyên (đúng 4 số). NULL → bỏ key. `birthmonth`/`birthday` không đồng bộ |
| 17 | `gender` | 性別 / Giới tính | `sex` | `sex` | ↔ | **Mã đảo ngược** — xem [§2.3](#23-gender--sex-đảo-ngược) |
| 18 | `dokusya_shubetsu` | 読者種別 / Loại độc giả | (suy từ `paper_permission_dt`) | `subscribe_flg` | ↔ | VÀO: `paper_permission_dt≠null`→3(併読), `=null`→2(điện tử). RA: `subscribe_flg` — xem [§2.1](#21-dokusya_shubetsu--subscribe_flg) |
| 19 | `dokusyaso_bunrui` | 読者層分類 / Tầng lớp độc giả (CSV) | `profession` + `others_profession` | `profession` + `others_profession` | ↔ | **Cardinality mismatch** — xem [§2.4](#24-dokusyaso_bunrui--profession-cardinality) |
| 20 | `nogyosya_bunrui` | 農業者分類 / Phân loại nông dân (CSV) | `products` + `others_products` | `products` + `others_products` | ↔ | Giữ nguyên CSV. Chỉ gửi RA khi `profession=0` — xem [§2.5](#25-nogyosya_bunrui--products) |
| 21 | `biko` | 備考 / Ghi chú | `remarks1`〜`remarks5` | `remarks1`〜`remarks5` | ↔ | `biko.split('\n')`: dòng 1–4→`remarks1..4`; **dòng 5 trở đi gộp**→`remarks5`. Mỗi slot ≤255 |
| 22 | `dokusya_kaishi_date` | 購読開始日 / Ngày bắt đầu đọc | `activated_at` | `payment_start` | ↔ | VÀO: lấy nguyên từ `activated_at`. RA: đổi ngày tuyệt đối → `'0'`/`'1'` — xem [§2.2](#22-dokusya_kaishi_date--payment_start) |
| 23 | `seikyu_kaishi_month` | 課金開始月 / Tháng bắt đầu tính phí | `payment_start_ym` | – | ← | VÀO: lấy `payment_start_ym` (YYYYMM) |
| 24 | `denshi_dokusya_shubetsu` | 電子版種別 / Loại độc giả điện tử | `member_type` | – | ← | `member_type` 1(free)→0, 2(paid)→1 |
| 25 | `tetsuzuki_shurui` | 手続種類 / Loại thủ tục | `status` | – | ← | `status=9`(giải ước)→0(hủy); `0/1/2/3`→1(mới) |
| 26 | `denshi_shonin_status` | 承認状態 / Trạng thái duyệt | `approval` | – | ← | `approval` 0→0(chờ), 1→1(duyệt), 2→2(từ chối), 9→NULL(ngoài luồng) |
| 27 | `shiharai_hoho` | 支払方法 / Phương thức thanh toán | (suy từ `payment_id`) | – | ← | JA thu tiền→1(rút TK); free→9(khác); thẻ→6(thẻ tín dụng) |
| 28 | `dokusyaryo_shiharai_cycle` | 支払周期 / Chu kỳ thanh toán | `payment_cycle` | – | ← | Lấy nguyên (số tháng) |
| 29 | `hanbaiten_id` | 販売店 / ID đại lý | `ShopCd` | – | ← | Chỉ 併読: `ShopCd`→tra `m_hanbaiten`. Điện tử thuần → đại lý giả (ダミー販売店) |
| 30 | `dokusya_chushi_date` | 購読中止日 / Ngày dừng đọc | `deleted_at` | – | ← | Đặt khi hủy (`status=9`) |
| 31 | `haitatsu_*` (giao báo) | 配達先 / Địa chỉ giao báo | `paper_zip`/`paper_pref_id`/`paper_addr`/`paper_city`/`paper_building` | – | ← | Chỉ 併読 (FALSE); điện tử thuần → rỗng. Xem Display §1 dòng 26–37 |
| — | — | 実行タイムスタンプ / Dấu thời gian | – | `timestamp` | → | Epoch giây UTC (≤10 số). **`DenshibanApiService.send()` tự đóng dấu** (builder không sinh) — quá 300s trong queue → `E05` |
| — | — | 処理区分 / Loại xử lý | – | `action_kbn` | → | 1 trong 6 mode: `create`/`update`/`reread`/`cancel`/`approve`/`unapprove` |
| — | — | 通知フラグ / Cờ thông báo | – | `notify_flg` | → | `'0'`(không)/`'1'`(có). Mặc định `'0'`. Bắt buộc ở update/reread/cancel |
| — | — | 解約月 / Tháng giải ước | – | `cancel_ym` | → | `YYYYMM`, **không được quá khứ** (`P05`). Chỉ mode `cancel`, lấy từ màn giải ước |
| — | — | 支店 / Chi nhánh | `branch` | `branch` | ✖ | ⚠ **Blocker**: cloud không có nguồn (`shiten_id` độc giả điện tử = NULL) → không gửi key. Chờ QnA 9 |
| — | — | JAグループ属性 / Thuộc nhóm JA | `profession_and_ja` | `profession_and_ja` | ✖ | ⚠ **Blocker**: cloud không có cột → không gửi key. Chờ QnA 10 |
| — | — | 農業関連属性 / Liên quan nông nghiệp | `profession_and_agri` | `profession_and_agri` | ✖ | ⚠ **Blocker**: cloud không có cột → không gửi key. Chờ QnA 10 |

**Trường cloud KHÔNG map denshiban** (cloud tự quản / không có nguồn): `dokusya_id`(PK tự sinh), `ja_id`(suy từ JACd), `shiten_id`(NULL), `kumiaiin_code`(NULL), `dokusya_busu`(cố định 1), `tanka_id`(NULL, chốt lúc duyệt), `yubin_kubun`(0), `bank_*`/`hikiotoshi_*`(view không có TK ngân hàng → rỗng), `shoki_dokusya_kaishi_date`(giữ lần đầu), `joho_henko_tekiyo_date`(ngày đồng bộ), `rireki_no`(cloud quản lý lịch sử), `created_*`/`updated_*`/`deleted_at`(hệ thống).

---

## 2. Bảng chuyển đổi mã (code conversion)

Nguồn code: `denshiban-payload.builder.ts`. Cloud lưu **nhãn tiếng Nhật/số m_code**, denshiban nhận **mã số**.

### 2.1 `dokusya_shubetsu` → `subscribe_flg`

| Cloud `dokusya_shubetsu` (m_code `DOKUSYA_SHUBETSU`) | → denshiban `subscribe_flg` |
| --- | --- |
| `2` 電子版のみ (điện tử thuần) | `'0'` (chưa đặt báo giấy) |
| `3` 併読 (đọc song song) | `'1'` (có đặt báo giấy) |

> **Điều kiện gửi RA (chốt khách 2026-07)**: chỉ đồng bộ record `dokusya_shubetsu = 2`. Nên thực tế `subscribe_flg` **luôn = `'0'`**, nhưng vẫn giữ trong payload vì denshiban đánh dấu bắt buộc (◎) cho `create`. Hàm `toSubscribeFlg` vẫn map `3→'1'` cho đúng ngữ nghĩa nếu tương lai mở lại phạm vi.

### 2.2 `dokusya_kaishi_date` → `payment_start`

Màn đăng ký hội viên điện tử của denshiban **thu gọn 購読開始日 thành 2 lựa chọn**, nên đổi ngày tuyệt đối → 2 giá trị tương đối (logic trong `denshiban-payment-start.ts`, phụ thuộc **đồng hồ JST tại thời điểm gửi**):

| `dokusya_kaishi_date` | → `payment_start` |
| --- | --- |
| = **hôm nay** (JST) | `'0'` |
| = **ngày 1 tháng sau** (JST) | `'1'` |
| ngày khác (hôm qua, 15 tháng sau…) | **không biểu diễn được** → throw `DenshibanMappingError` + log, KHÔNG gửi bừa |

> `approve`/`unapprove` cũng dùng `payment_start` (cùng logic). `unapprove` VẪN bắt buộc `payment_start` dù nghiệp vụ "từ chối" không có ngày — quirk của API, thiếu là `V*`.

### 2.3 `gender` ↔ `sex` (đảo ngược!)

`GENDER` là m_code Group B (không có TS enum). **Mã nữ bị đảo giữa 2 hệ:**

| Cloud `gender` | Ý nghĩa | ↔ denshiban `sex` |
| --- | --- | --- |
| `1` | 男 nam | `'1'` |
| `2` | 女 nữ | `'0'` ⚠ **đảo** |
| `9` / NULL / khác | 無回答 không trả lời | `'9'` |

### 2.4 `dokusyaso_bunrui` → `profession` (cardinality!)

⚠️ **Sai cardinality**: cloud `dokusyaso_bunrui` là **CSV nhiều giá trị**, denshiban `profession` chỉ nhận **1 giá trị**.

| Nhãn cloud (checkbox SCR-011) | → `profession` |
| --- | --- |
| 農業者 | `'0'` |
| JAグループ役職員 | `'1'` |
| 企業・団体 | `'2'` |
| 学生 | `'3'` |
| その他 | `'999'` → kèm `others_profession = '会社員'` (⚠ QnA 7 chưa chốt) |

- **0 lựa chọn** → throw (profession bắt buộc, không đồng bộ được)
- **≥2 lựa chọn** → **throw** (gửi giá trị đầu tiên sẽ mất dữ liệu âm thầm). Xử lý đề xuất: giới hạn UI cho độc giả điện tử chỉ chọn 1 nghề.

### 2.5 `nogyosya_bunrui` → `products`

`products` **nhận nhiều giá trị** (CSV) trên denshiban → không có vấn đề cardinality như profession.

| Nhãn cloud | → `products` |
| --- | --- |
| 米 | `'0'` |
| 野菜 | `'1'` |
| 果実 | `'2'` |
| 花 | `'3'` |
| 畜産 | `'4'` |
| (酪農 `'5'` — cloud không có checkbox, chỉ xuất hiện chiều VÀO) | `'5'` |
| その他 | `'999'` → kèm `others_products = 'その他の農畜産物'` (⚠ QnA 8 chưa chốt) |

- Chỉ gửi khi `profession = 0` (nông dân). Vi phạm → denshiban trả `V*` của `products`.

---

## 3. Ma trận field × mode (chiều RA)

6 mode `action_kbn`. **◎** bắt buộc (thiếu → `V*`) · **○** gửi khi có/đã đổi · **–** không gửi key.

| API field | Nguồn cloud | create | update | reread | cancel | approve | unapprove |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `timestamp` | (send() đóng dấu) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| `action_kbn` | (mode) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| `jacd_execute` | `kanri_shiten_code` (user login) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| `id` | `denshi_kaiin_id` | – | ◎ | ◎ | ◎ | ◎ | ◎ |
| `jacd` | `kanri_shiten_code` (record) | – | ○ | ○ | – | – | – |
| `notify_flg` | `ctx.notifyFlg` | – | ◎ | ◎ | ◎ | – | – |
| `cancel_ym` | (màn giải ước) | – | – | – | ◎ | – | – |
| `payment_start` | `dokusya_kaishi_date` | ◎ | – | – | – | ◎ | ◎ |
| `first_name`/`last_name` | `shimei_sei`/`shimei_mei` | ◎ | ○ | ○ | – | – | – |
| `first_kana`/`last_kana` | `shimei_kana_sei`/`shimei_kana_mei` | ◎ | ○ | ○ | – | – | – |
| `zip` | `yubin_no` | ◎ | ○ | ○ | – | – | – |
| `pref_id` | `todofuken_code` | ◎ | ○ | ○ | – | – | – |
| `addr`/`city` | `shikuchoson`/`chome_banchi` | ◎ | ○ | ○ | – | – | – |
| `building` | `tatemono_mei` | ○ | ○ | ○ | – | – | – |
| `tel` | `renrakusaki_1` | ◎ | ○ | ○ | – | – | – |
| `email` | `email` | ◎ | ○ | ○ | – | – | – |
| `subscribe_flg` | `dokusya_shubetsu` | ◎ | ○ | ○ | – | – | – |
| `melmaga` | `mail_magazine_flg` | ◎ | ○ | ○ | – | – | – |
| `profession` | `dokusyaso_bunrui` | ◎ | ○ | ○ | – | – | – |
| `products`/`others_*` | `nogyosya_bunrui`/`dokusyaso_bunrui` | ○ | ○ | ○ | – | – | – |
| `birthyear` | `birth_year` | ○ | ○ | ○ | – | – | – |
| `sex` | `gender` | ○ | ○ | ○ | – | – | – |
| `remarks1`〜`5` | `biko` | ○ | ○ | ○ | – | – | – |
| `branch`/`profession_and_*` | (blocker) | ✖ | ✖ | ✖ | – | – | – |

**4 quy tắc build payload** (§C của outbound-matrix): (1) mọi field là `String`; (2) `null`/`''` → bỏ hẳn key (không gửi `''` — denshiban có thể hiểu là "xoá"); (3) update chỉ gửi field đã đổi + các field bắt buộc; (4) validate ở cloud trước (`assertPayload`) — không để denshiban trả `V01`–`V35` rồi mới biết.

---

## 4. Blocker & QnA còn treo

| # | Field | Vấn đề | Xử lý tạm | QnA |
| --- | --- | --- | --- | --- |
| 1 | `profession` | Cloud CSV nhiều giá trị ↔ denshiban đơn trị | throw khi ≥2; đề xuất giới hạn UI 1 nghề | — |
| 2 | `branch` | Cloud không có nguồn (`shiten_id`=NULL) | Optional → không gửi key | QnA 9 |
| 3 | `profession_and_ja` / `profession_and_agri` | Cloud không có cột | Optional → không gửi key | QnA 10 |
| 4 | `others_profession` / `others_products` | Giá trị cố định `'会社員'` / `'その他の農畜産物'` chưa xác nhận | Dùng tạm theo spec | QnA 7/8 |
| 5 | `bank_branch_code` / `bank_branch_name` | View denshiban không có TK ngân hàng | Chiều VÀO → rỗng; cân nhắc bỏ required ở SCR-020 | QnA 3 |
| 6 | `pref_id` ↔ `todofuken_code` | Cách denshiban đánh số tỉnh | Đã xác nhận map đúng 01–47 | QnA 1 (đã chốt) |
