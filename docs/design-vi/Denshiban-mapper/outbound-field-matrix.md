# Ma trận mapping chiều RA — Cloud (`t_dokusya`) → Denshiban (`updateUserInfo`)

> Nguồn: [Display-Rireki-And-Mapping-Denshiban.md](./Display-Rireki-And-Mapping-Denshiban.md) §2, §3
> + [implementation-plan.md](./implementation-plan.md) §2.
> Phạm vi: **chỉ chiều RA**. Chiều VÀO (denshiban → cloud) xem §1 của mapping doc.
>
> Đây là input cho `modules/denshiban/denshiban-payload.builder.ts` (hàm thuần) +
> `assertPayload()`.

---

## A. Ma trận field × mode

Ký hiệu:

| KH | Nghĩa |
| --- | --- |
| ◎ | **Bắt buộc** — luôn gửi, thiếu → mã `V*` của chính field đó |
| ○ | Gửi **khi có giá trị** (create) / **khi giá trị đã đổi** (update・reread) |
| – | **Không gửi key** ở mode này |

6 mode (`action_kbn`): `create` / `update` / `reread` / `cancel` / `approve` / `unapprove`.
`update` ≡ `reread` và `approve` ≡ `unapprove` về chữ ký request — chỉ khác `action_kbn`.

| # | Field denshiban | Nguồn `t_dokusya` | create | update | reread | cancel | approve | unapprove |
| --- | --- | --- | :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | `timestamp` | – (do `send()` đóng dấu) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| 2 | `action_kbn` | – (mode) | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| 3 | `jacd_execute` | `ctx.jacdExecute` | ◎ | ◎ | ◎ | ◎ | ◎ | ◎ |
| 4 | `id` | `denshi_kaiin_id` | – | ◎ | ◎ | ◎ | ◎ | ◎ |
| 5 | `jacd` | `ctx.jacd` | – | ○ | ○ | – | – | – |
| 6 | `notify_flg` | `ctx.notifyFlg` | – | ◎ | ◎ | ◎ | – | – |
| 7 | `cancel_ym` | – (màn hình giải ước) | – | – | – | ◎ | – | – |
| 8 | `payment_start` | `dokusya_kaishi_date` | ◎ | – | – | – | ◎ | ◎ |
| 9 | `first_name` | `shimei_sei` | ◎ | ○ | ○ | – | – | – |
| 10 | `last_name` | `shimei_mei` | ◎ | ○ | ○ | – | – | – |
| 11 | `first_kana` | `shimei_kana_sei` | ◎ | ○ | ○ | – | – | – |
| 12 | `last_kana` | `shimei_kana_mei` | ◎ | ○ | ○ | – | – | – |
| 13 | `zip` | `yubin_no` | ◎ | ○ | ○ | – | – | – |
| 14 | `pref_id` | `todofuken_code` | ◎ | ○ | ○ | – | – | – |
| 15 | `addr` | `shikuchoson` | ◎ | ○ | ○ | – | – | – |
| 16 | `city` | `chome_banchi` | ◎ | ○ | ○ | – | – | – |
| 17 | `building` | `tatemono_mei` | ○ | ○ | ○ | – | – | – |
| 18 | `tel` | `renrakusaki_1` | ◎ | ○ | ○ | – | – | – |
| 19 | `email` | `email` | ◎ | ○ | ○ | – | – | – |
| 20 | `subscribe_flg` | `dokusya_shubetsu` | ◎ | ○ | ○ | – | – | – |
| 21 | `branch` | `ctx.branchCode` ⚠ | ○ | ○ | ○ | – | – | – |
| 22 | `remarks1`〜`remarks5` | `biko` | ○ | ○ | ○ | – | – | – |
| 23 | `melmaga` | `mail_magazine_flg` | ◎ | ○ | ○ | – | – | – |
| 24 | `profession` | `dokusyaso_bunrui` ⚠ | ◎ | ○ | ○ | – | – | – |
| 25 | `profession_and_ja` | – ⚠ | ○ | ○ | ○ | – | – | – |
| 26 | `profession_and_agri` | – ⚠ | ○ | ○ | ○ | – | – | – |
| 27 | `others_profession` | `dokusyaso_bunrui` | ○ | ○ | ○ | – | – | – |
| 28 | `products` | `nogyosya_bunrui` | ○ | ○ | ○ | – | – | – |
| 29 | `others_products` | `nogyosya_bunrui` | ○ | ○ | ○ | – | – | – |
| 30 | `birthyear` | `birth_year` | ○ | ○ | ○ | – | – | – |
| 31 | `sex` | `gender` | ○ | ○ | ○ | – | – | – |

⚠ = có blocker, xem §D.

### A-2. Chữ ký chốt của 3 mode command (theo spec khách 2026-07)

3 mode `cancel` / `approve` / `unapprove` **không mang profile** — payload cực gọn,
mọi field đều bắt buộc (〇), và **không có field optional nào**. Builder chỉ cần
1 nhánh chung cho `approve`/`unapprove` + 1 nhánh cho `cancel`.

| Mode | Đối tượng áp dụng | Field (tất cả đều bắt buộc) |
| --- | --- | --- |
| `cancel` | **有料会員** (hội viên trả phí) | `timestamp`, `action_kbn`, `jacd_execute`, `id`, `cancel_ym`, `notify_flg` |
| `approve` | **未承認会員** (hội viên chờ duyệt) | `timestamp`, `action_kbn`, `jacd_execute`, `id`, `payment_start` |
| `unapprove` | **未承認会員** | `timestamp`, `action_kbn`, `jacd_execute`, `id`, `payment_start` |

Validation theo spec:

| Field | Kiểu | Ràng buộc |
| --- | --- | --- |
| `timestamp` | long | nửa chiều rộng, **≤ 10 chữ số** — epoch giây UTC |
| `action_kbn` | String | 1 trong các mode hợp lệ |
| `jacd_execute` | String | nửa chiều rộng, **đúng 10 chữ số** (ví dụ `0000000000`) |
| `id` | String | nửa chiều rộng, chỉ số (ví dụ `12345`) — không nêu giới hạn độ dài |
| `cancel_ym` | String | nửa chiều rộng, **`YYYYMM`** (ví dụ `202605`) |
| `notify_flg` | String | **1 chữ số** — `0` không thông báo / `1` có thông báo |
| `payment_start` | String | **1 chữ số** — `0` hôm nay / `1` ngày 1 tháng sau |

Hai điểm dễ sai:

1. **`unapprove` VẪN bắt buộc `payment_start`** dù về nghiệp vụ "từ chối duyệt" không
   có ngày bắt đầu đọc. Đây là quirk của API — cứ gửi theo spec, thiếu là lỗi `V*`.
   Không suy diễn rằng nó giống `cancel`.
2. **`cancel` không có `payment_start`; `approve`/`unapprove` không có `notify_flg`
   và không có `cancel_ym`.** Ba mode này không chia sẻ chung một khuôn — đừng
   dùng chung một hàm build rồi gắn field theo `if`.

---

## B. Quy tắc chuyển đổi từng field

| Field | Kiểu / Validation (spec) | Logic chuyển đổi |
| --- | --- | --- |
| `timestamp` | số, ≤ 10 chữ số | Epoch giây UTC. **`DenshibanApiService.send()` tự đóng dấu**, builder KHÔNG sinh — job chờ trong queue > 300s sẽ bị trả `E05` |
| `action_kbn` | 1 trong 6 mode | Do caller quyết định theo nghiệp vụ |
| `jacd_execute` | số, **đúng 10 chữ số** | `m_kanri_shiten.kanri_shiten_code` của **JA đang thao tác (user login)**, KHÔNG phải của record. Denshiban dùng làm `WHERE JACd = ?` → sai JA ra `P02` (không tìm thấy hội viên) |
| `jacd` | số, đúng 10 chữ số | JA **trực thuộc của record** — dùng khi chuyển hội viên sang JA khác. `create` không có field này |
| `id` | số | `denshi_kaiin_id` — **do denshiban sinh** lúc `create`, cloud lưu lại từ response. NULL → worker delay + retry (xem plan §2.4b), không build payload |
| `notify_flg` | 1 chữ số, `'0'`/`'1'` | Có thông báo cho hội viên hay không. Mặc định `'0'` (không thông báo) — an toàn, tránh gửi mail nhầm |
| `cancel_ym` | YYYYMM | Tháng giải ước, **không được thuộc quá khứ** (`P05`). Lấy từ màn hình giải ước |
| `payment_start` | 1 chữ số, `'0'`/`'1'` | Nguồn = `dokusya_kaishi_date` (購読開始日). Bên denshiban, màn đăng ký hội viên điện tử **thu gọn 購読開始日 thành 2 lựa chọn**, nên phải đổi ngày tuyệt đối → 2 giá trị tương đối: bằng **hôm nay (JST)** → `'0'`; bằng **ngày 1 tháng sau (JST)** → `'1'`. Ngày khác (hôm qua, ngày kia, 15 tháng sau…) **không biểu diễn được** → throw + log, không gửi bừa. `approve` (duyệt hội viên chờ) dùng **cùng logic này** — duyệt chính là chốt "bắt đầu đọc từ khi nào" |
| `first_name` / `last_name` | ≤ 255 ký tự | `shimei_sei` / `shimei_mei` — lấy nguyên |
| `first_kana` / `last_kana` | ≤ 255 ký tự | `shimei_kana_sei` / `shimei_kana_mei` — **lấy nguyên**, không convert bảng chữ |
| `zip` | số, ≤ 7 chữ số | `yubin_no` — cloud đã lưu không dấu `-`, lấy nguyên |
| `pref_id` | số, ≤ 2 chữ số (1–47) | `todofuken_code` — **gửi nguyên `'01'`**, không strip zero. Denshiban lưu verbatim → round-trip `t_dokusya` ⇄ `users` ổn định |
| `addr` / `city` / `building` | ≤ 255 ký tự | `shikuchoson` / `chome_banchi` / `tatemono_mei` — lấy nguyên. Chú ý ánh xạ **lệch tên**: `addr` ← 市町村郡, `city` ← 丁目番地 |
| `tel` | số, ≤ 13 chữ số | `renrakusaki_1`, bỏ `-`. **`renrakusaki_2` không gửi** — denshiban chỉ có 1 trường `tel` |
| `email` | nửa chiều rộng, ≤ 255 | `email` — lấy nguyên |
| `subscribe_flg` | 1 chữ số | `dokusya_shubetsu`: `2` (điện tử thuần) → `'0'`. Chỉ record `= 2` mới đồng bộ (xem §"Điều kiện gửi") nên thực tế **luôn `'0'`**. Hàm `toSubscribeFlg` vẫn map `3 → '1'` cho đúng ngữ nghĩa nếu tương lai mở lại phạm vi |
| `branch` | ≤ 40 ký tự | `ctx.branchCode` (= `m_shiten.shiten_code`) — ⚠ blocker, hiện `shiten_id` của độc giả điện tử = NULL → **không gửi key** |
| `remarks1..5` | mỗi cái ≤ 255 ký tự | `biko.split('\n')`: dòng 1–4 → `remarks1..4`; **dòng 5 trở đi gộp lại** → `remarks5`. Mỗi remark cắt 255 ký tự |
| `melmaga` | 1 chữ số | `mail_magazine_flg` — giá trị 0/1 trùng nhau, chỉ cần `String(flg)` |
| `profession` | số, ≤ 3 chữ số, **đơn trị** `0/1/2/3/999` | ⚠️ **Sai cardinality** — `dokusyaso_bunrui` bên cloud là **CSV nhiều giá trị**. Xem §D |
| `profession_and_ja` | 1 chữ số | ⚠ Cloud không có cột. Chỉ được gửi khi `profession = 0` → hiện **không gửi key** |
| `profession_and_agri` | 1 chữ số | ⚠ Cloud không có cột. Chỉ được gửi khi `profession = 2` → hiện **không gửi key** |
| `others_profession` | ≤ 255 ký tự | Chỉ gửi khi `profession = 999`. Giá trị `'会社員'` (⚠ QnA 7 — chưa chốt) |
| `products` | CSV, mỗi phần tử `0`–`5`/`999` | `nogyosya_bunrui` — **giữ nguyên CSV**. Chỉ gửi khi `profession = 0` (nông dân) |
| `others_products` | ≤ 255 ký tự | Chỉ gửi khi `products` chứa `999`. Giá trị `'その他の農畜産物'` (⚠ QnA 8 — chưa chốt) |
| `birthyear` | số, **đúng 4 chữ số** | `String(birth_year)`. NULL → **bỏ key** |
| `sex` | 1 chữ số | `gender`: `2` (nữ) → `'0'`; `1` (nam) → `'1'`; `9`/NULL → `'9'`. **Đảo ngược so với cloud** — cloud nữ=2, denshiban nữ=0 |

### Ràng buộc điều kiện giữa các field (vi phạm → mã `V` của chính field đó)

| Field | Chỉ được gửi khi |
| --- | --- |
| `profession_and_ja` | `profession = 0` |
| `profession_and_agri` | `profession = 2` |
| `others_profession` | `profession = 999` |
| `products` | `profession = 0` |
| `others_products` | `products` chứa `999` |

---

## C. 4 quy tắc chung khi build payload

1. **Mọi field đều kiểu `String`** trong spec → `String(...)` toàn bộ, kể cả số.
2. **`null` / `undefined` → bỏ hẳn key**, KHÔNG gửi `''`. Gửi `''` cho field optional có thể bị denshiban hiểu là "xoá giá trị".
3. **UPDATE chỉ gửi field đã đổi** — `buildUpdatePayload(before, after)` diff từng cột; các field bắt buộc (`timestamp`, `action_kbn`, `jacd_execute`, `id`, `notify_flg`) thì **luôn gửi**.
4. **Validate ở cloud trước khi gửi** — `assertPayload()` check độ dài / regex theo cột Validation ở §B. Lỗi phải hiện ra ở cloud (message tiếng Nhật, map vào `<a-form-item>`), **không** để denshiban trả `V01`–`V35` rồi mới biết — lúc đó job đã nằm trong queue, user đã rời màn hình.

### Điều kiện gửi

Chỉ gửi khi `dokusya_shubetsu = 2` (điện tử thuần) — **quyết định khách 2026-07**.
Độc giả đọc hỗn hợp (`3` / 併読) và báo giấy thuần (`1`) → **không** đẩy sang denshiban
(hội viên 併読 được đăng ký ở phía denshiban qua kênh khác).
→ Hệ quả: `subscribe_flg` **luôn = `'0'`** (vì record đồng bộ chỉ còn điện tử thuần), nhưng
vẫn **giữ trong payload** vì denshiban đánh dấu `◎` (bắt buộc) cho `create`.

---

## D. Blocker của riêng chiều RA

| # | Field | Vấn đề | Xử lý tạm |
| --- | --- | --- | --- |
| 1 | `profession` | Cloud `dokusyaso_bunrui` là **CSV nhiều giá trị**; denshiban `profession` chỉ nhận **1 giá trị** → chặn cứng | 2 lựa chọn: (a) giới hạn UI — độc giả điện tử chỉ chọn 1 nghề; (b) gửi giá trị đầu tiên + log cảnh báo. **Đề xuất (a)** — (b) làm mất dữ liệu âm thầm. ⚠️ Đừng nhầm với `products` — field đó **có** nhận CSV |
| 2 | `branch` | Cloud không có nguồn (`shiten_id` của độc giả điện tử = NULL) | Field **optional** → **không gửi key**, không lỗi. Chờ khách chốt (QnA 9: `branch` = `shiten_code`?) |
| 3 | `profession_and_ja` / `profession_and_agri` | Cloud không có cột tương ứng | Cả 2 đều **optional** → **không gửi key**, không lỗi. Bổ sung sau khi khách trả lời (QnA 10) |
| 4 | `others_profession` / `others_products` | Giá trị cố định `'会社員'` / `'その他の農畜産物'` chưa được xác nhận | Dùng tạm theo spec, chờ QnA 7 / 8 |

---

## E. Xử lý response (không phải mapping nhưng builder phải biết)

**HTTP LUÔN LÀ 200** — kết quả nằm ở `statusCode` trong body, tuyệt đối không dùng `res.ok` để phán định.

| `statusCode` | Nghĩa | Retry? |
| --- | --- | --- |
| `'0'` | Thành công. Với `create`: `id` = ID hội viên do **denshiban sinh** → cloud lưu vào `t_dokusya.denshi_kaiin_id` | – |
| `E05` | Quá 300s | ✅ Đóng dấu `timestamp` mới rồi gửi lại |
| `P99` | Lỗi khác | ✅ An toàn để retry |
| `E01`–`E04` | Body / base64 / khoá / JSON sai → **bug phía cloud** | ❌ Alert dev |
| `V01`–`V35` | Sai định dạng field | ❌ Dữ liệu phải sửa, retry vô ích |
| `P01`–`P07` | Vi phạm nghiệp vụ (email trùng, không tìm thấy hội viên…) | ❌ Báo user |
