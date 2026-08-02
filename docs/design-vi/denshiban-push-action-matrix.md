# Ma trận đồng bộ độc giả điện tử: Cloud → 電子版 (denshiban)

> Nguồn code: [denshiban-push.service.ts](../../apps/backend/src/modules/denshiban/denshiban-push.service.ts),
> [denshiban-push.mapper.ts](../../apps/backend/src/modules/denshiban/denshiban-push.mapper.ts),
> [denshiban-api.service.ts](../../apps/backend/src/modules/denshiban/denshiban-api.service.ts).
> Chiều đi (push) dùng **共通API `updateUserInfo`**, phân biệt thao tác bằng trường `action_kbn`.
> Cơ chế: **Saga đồng bộ** — gọi API ngay trong transaction của cloud; API trả lỗi → throw → cloud rollback (cả 2 bên cùng thành công hoặc cùng huỷ).

---

## 1. Bảng ma trận action — thao tác nào đồng bộ, thao tác nào không

| # | Thao tác phía cloud | Màn hình / Entry point | Đồng bộ? | `action_kbn` gửi đi | Thời điểm gửi |
|---|---|---|---|---|---|
| 1 | Đăng ký độc giả mới (登録) | SCR-011 `POST /dokusya` | ✅ Có | `create` | Ngay trong transaction |
| 2 | Import Excel chế độ 新規登録 | SCR-016 `POST /dokusya/import` | ✅ Có | `create` | Ngay, mỗi dòng 1 lệnh |
| 3 | Cập nhật thông tin, 適用日 = **hôm nay** | SCR-011 `PUT /dokusya/:id` | ✅ Có | `update` | Ngay trong transaction |
| 4 | Import Excel chế độ 更新, 適用日 = **hôm nay** | SCR-016 | ✅ Có | `update` | Ngay, mỗi dòng 1 lệnh |
| 5 | Cập nhật, 適用日 = **ngày tương lai** (予約変更 — chỉ 併読 mới đặt được) | SCR-011 / SCR-016 | ⏸ Hoãn | `update` | Batch `dokusya:apply-due` (recompute) chạy vào đúng ngày hiệu lực |
| 6 | Đặt lại (再購読 / resubscribe), 購読開始日 = **hôm nay** | SCR-011 `PUT /dokusya/:id` | ✅ Có | `reread` | Ngay trong transaction |
| 7 | Đặt lại (再購読), 購読開始日 = **ngày tương lai** | SCR-011 | ⏸ Hoãn | `update` (không phải `reread`) | Batch recompute vào ngày hiệu lực |
| 8 | Duyệt hội viên 承認・登録 | SCR-011 `PUT /dokusya/:id/approve` | ✅ Có | `approve` | Ngay trong transaction |
| 9 | Từ chối 承認しない | SCR-011 `PUT /dokusya/:id/reject` | ✅ Có | `unapprove` | Ngay trong transaction |
| 10 | Đăng ký ngừng đặt báo 購読停止 (解約予約) | SCR-014 `POST /dokusya/:id/stop` | ⏸ Hoãn | `cancel` | **Không gửi lúc bấm nút.** Batch `dokusya:apply-due` (kaiyaku) gửi vào ngày chốt huỷ |
| 11 | Batch chốt huỷ 解約確定 | `dokusya:apply-due` | ✅ Có | `cancel` | Trong batch, kèm `cancel_ym` = YYYYMM của 購読中止日 |
| 12 | **Xoá độc giả (削除)** | SCR-014 `DELETE /dokusya/:id` | ❌ **Không** | — | Chỉ soft-delete ở cloud; bên 電子版 hội viên vẫn còn |
| 13 | Thay thế hàng loạt 販売店一括置換 | SCR-014 `POST /dokusya/replace-hanbaiten` | ❌ Không | — | 販売店 không nằm trong payload của 電子版 |
| 14 | Huỷ dòng lịch sử 履歴取消 (torikeshi) | SCR-013 | ❌ Không | — | Không có lời gọi push |
| 15 | Batch kéo dữ liệu về `dokusya-sync` (電子版 → cloud) | Batch pull | ❌ Không đẩy ngược | — | `source='BATCH'` bị chặn để **chống vòng lặp echo** |

**Chú thích ký hiệu**
- ✅ Có — gọi `updateUserInfo` ngay trong transaction đang ghi.
- ⏸ Hoãn — không gọi tại thời điểm thao tác, để batch gửi vào ngày hiệu lực (tránh phản ánh sớm / gửi 2 lần).
- ❌ Không — không bao giờ gọi sang 電子版.

---

## 2. Bảng điều kiện chặn (guard) — kể cả action ở nhóm ✅ vẫn có thể bị bỏ qua

Thứ tự kiểm tra đúng như trong `DenshibanPushService`. Chỉ cần **một** điều kiện dưới đây khớp là **không gửi** (no-op, không lỗi).

| # | Điều kiện | Kiểm tra ở đâu | Lý do |
|---|---|---|---|
| G1 | `適用日 ≠ hôm nay` (khi có truyền `immediateJohoDate`) | `pushOnWrite` | Nhường cho batch ngày hiệu lực đẩy đi |
| G2 | `source === 'BATCH'` | `isTarget` | Dữ liệu vừa kéo từ 電子版 về — đẩy ngược lại sẽ tạo vòng lặp echo |
| G3 | `DENSHIBAN_PUSH_ENABLED ≠ true` | `isBatchTarget` | Cờ bật/tắt liên kết, mặc định **OFF** |
| G4 | 購読種別 (`dokusya_shubetsu`) không phải 電子版(2) / 併読(3) — tức 紙版(1) | `isBatchTarget` + guard tại mỗi call site | Bản giấy nằm ngoài phạm vi liên kết |
| G5 | 新聞単価 gắn với độc giả có `campaign_flg = ON` | `isBatchTarget` | Đối tượng campaign nằm ngoài phạm vi đồng bộ (yêu cầu khách hàng) |

**Trường hợp gửi thất bại / bỏ qua đặc biệt**

| Tình huống | Hành vi | error_code trả về |
|---|---|---|
| `denshi_kaiin_id = null` khi gửi `approve` / `unapprove` / `cancel` | Bỏ qua, ghi log `warn`, **không chặn** workflow của cloud | — |
| `denshi_kaiin_id = null` khi gửi `update` / `reread` | Tự động **chuyển thành `create`** (fallback cho hội viên tạo trước khi bật liên kết) | — |
| `kanri_shiten_id = null`, hoặc 管理支店コード sau khi bỏ ký tự ≠ 10 chữ số | Throw → rollback cloud. Chưa gọi tới 電子版 | `DENSHIBAN_PUSH_FAILED` (502) |
| 電子版 trả `statusCode ≠ '0'` | Throw → rollback cloud | Chính mã của 電子版 (`E01`…`E05`, `V01`…`V35`, `P01`…`P07`, `P99`) |

---

## 3. Props JSON **trước khi biến đổi** — snapshot `t_dokusya` (after)

Đây là đối tượng đầu vào của mapper (`toCreatePayload` / `toUpdatePayload`). Giá trị lấy từ bản ghi `t_dokusya` sau khi cloud đã ghi xong (chưa qua chuẩn hoá gì).

```jsonc
// Snapshot entity Dokusya (camelCase trong code ⇄ snake_case trong DB)
{
  "dokusyaId":        1024,               // 購読者ID          — ID độc giả (PK cloud)
  "kanriShitenId":    7,                  // 管理支店ID        — ID chi nhánh quản lý (dùng để tra ra JACd)
  "denshiKaiinId":    58231,              // 電子版会員ID      — ID hội viên bên 電子版 (null nếu chưa từng đăng ký)
  "dokusyaShubetsu":  2,                  // 購読種別          — Loại đặt báo: 1 giấy / 2 điện tử / 3 cả hai
  "tankaId":          15,                 // 新聞単価ID        — ID đơn giá (dùng để kiểm tra campaign_flg)

  "shimeiSei":        "山田",              // 購読者氏名(氏)    — Họ
  "shimeiMei":        "太郎",              // 購読者氏名(名)    — Tên
  "shimeiKanaSei":    "やまだ",            // 購読者かな(氏)    — Họ (kana)
  "shimeiKanaMei":    "たろう",            // 購読者かな(名)    — Tên (kana)

  "yubinNo":          "100-0001",         // 郵便番号          — Mã bưu điện (CÓ dấu gạch)
  "todofukenCode":    "13",               // 都道府県コード    — Mã tỉnh/phủ
  "shikuchoson":      "千代田区",          // 市町村郡          — Quận/huyện/thành phố
  "chomeBanchi":      "千代田1-1",         // 丁目番地          — Số nhà / khối phố
  "tatemonoMei":      "農業ビル 5F",       // 建物名            — Tên toà nhà (có thể rỗng)
  "renrakusaki1":     "03-1234-5678",     // 連絡先１          — SĐT liên lạc 1 (CÓ dấu gạch)

  "email":            "demo+001@vti.com.vn", // メールアドレス — Email (khoá định danh hội viên bên 電子版)
  "mailMagazineFlg":  1,                  // メールマガジン    — Nhận mail magazine: 0 không / 1 có
  "honshiKodokuFlg":  true,               // 本紙購読フラグ    — Cờ có đặt báo bản chính (boolean)

  "birthYear":        1980,               // 生年              — Năm sinh (number, có thể null)
  "gender":           1,                  // 性別              — Giới tính: 1 nam / 2 nữ / 9 không trả lời

  "dokusyasoBunrui":  "0,1",              // 購読者層分類      — Phân loại tầng độc giả (CSV mã)
  "nogyosyaBunrui":   "0,4",              // 農業者分類        — Phân loại nông nghiệp (CSV mã)

  "biko":             "demo push\nupdate", // 備考             — Ghi chú (text, CÓ THỂ nhiều dòng)
  "dokusyaChushiDate": "2026-08-31"       // 購読中止日        — Ngày ngừng đặt báo (chỉ dùng cho cancel)
}
```

### 3.1 Bảng quy tắc biến đổi (t_dokusya → key của 電子版)

| Cột DB cloud | 日本語 | Tiếng Việt | → Key 電子版 | Quy tắc biến đổi |
|---|---|---|---|---|
| `shimei_sei` | 購読者氏名(氏) | Họ | `first_name` | Gộp xuống dòng thành space, trim, cắt còn 255 ký tự |
| `shimei_mei` | 購読者氏名(名) | Tên | `last_name` | như trên |
| `shimei_kana_sei` | 購読者かな(氏) | Họ (kana) | `first_kana` | như trên (電子版 yêu cầu hiragana) |
| `shimei_kana_mei` | 購読者かな(名) | Tên (kana) | `last_kana` | như trên |
| `yubin_no` | 郵便番号 | Mã bưu điện | `zip` | **Bỏ hết ký tự không phải số** (`100-0001` → `1000001`) |
| `todofuken_code` | 都道府県コード | Mã tỉnh | `pref_id` | Bỏ ký tự không phải số (電子版 chỉ nhận 1–47) |
| `shikuchoson` | 市町村郡 | Quận/huyện | `addr` | trim + cắt 255 |
| `chome_banchi` | 丁目番地 | Số nhà/khối phố | `city` | trim + cắt 255 |
| `tatemono_mei` | 建物名 | Tên toà nhà | `building` | trim + cắt 255. **Rỗng thì bỏ hẳn key** |
| `renrakusaki1` | 連絡先１ | SĐT liên lạc 1 | `tel` | **Bỏ hết ký tự không phải số** (`03-1234-5678` → `0312345678`) |
| `email` | メールアドレス | Email | `email` | trim |
| `honshi_kodoku_flg` | 本紙購読フラグ | Cờ đặt báo bản chính | `subscribe_flg` | boolean → `'1'` / `'0'` |
| `mail_magazine_flg` | メールマガジン | Nhận mail magazine | `melmaga` | `1` → `'1'`, còn lại → `'0'` |
| `dokusyaso_bunrui` | 購読者層分類 | Phân loại tầng độc giả | `profession` | Lọc bỏ mã không hợp lệ, giữ CSV. **Rỗng → `'999'` (その他)** |
| `nogyosya_bunrui` | 農業者分類 | Phân loại nông nghiệp | `products` | Chỉ có giá trị **khi `profession` chứa `'0'` (農業者)**; ngược lại gửi `''`. Key **luôn có mặt** |
| `birth_year` | 生年 | Năm sinh | `birthyear` | Chỉ gửi khi đúng 4 chữ số; ngược lại bỏ key |
| `gender` | 性別 | Giới tính | `sex` | `1`(男)→`'1'`, `2`(女)→**`'0'`**, còn lại→`'9'` ⚠️ **đảo giá trị so với cloud** |
| `biko` | 備考 | Ghi chú | `remarks1` | Gộp xuống dòng thành space, cắt 255. **Rỗng thì bỏ hẳn key** |
| `m_kanri_shiten.kanri_shiten_code` | 管理支店コード | Mã chi nhánh quản lý | `jacd_execute` | Bỏ ký tự không phải số → **bắt buộc đúng 10 chữ số** (`113-9002-001` → `1139002001`) |
| `denshi_kaiin_id` | 電子版会員ID | ID hội viên 電子版 | `id` | `String(...)` |
| `dokusya_chushi_date` | 購読中止日 | Ngày ngừng đặt báo | `cancel_ym` | Chuyển sang `YYYYMM` |
| — | — | — | `payment_start` | Hằng số `'0'` (bắt đầu từ hôm nay) |
| — | — | — | `notify_flg` | Hằng số `'0'` (**không gửi mail thông báo**) trên `update` / `cancel` |

**Bảng mã `profession` / `products`** — cloud lưu **cùng mã với 電子版** (1:1, không cần bảng chuyển đổi; bảng identity chỉ dùng để lọc mã lạ).

| `profession` (購読者層分類) | | `products` (農業者分類) | |
|---|---|---|---|
| `0` | 農業者 — Nông dân | `0` | 米 — Gạo |
| `1` | JAグループ役職員 — Cán bộ JA | `1` | 野菜 — Rau |
| `2` | 企業・団体 — Doanh nghiệp/tổ chức | `2` | 果実 — Trái cây |
| `3` | 学生 — Học sinh/sinh viên | `3` | 花 — Hoa |
| `999` | その他 — Khác | `4` | 畜産 — Chăn nuôi |
| | | `5` | 酪農 — Bò sữa |
| | | `999` | その他 — Khác |

---

## 4. Payload theo từng `action_kbn` (sau biến đổi, trước khi mã hoá)

Ký hiệu: 🅿️ = khối profile chung (20 key ở bảng §3.1, từ `first_name` đến `products`).

| Key | `create` | `update` | `reread` | `approve` | `unapprove` | `cancel` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| 🅿️ khối profile (first_name … products) | ✅ | ✅ | ✅ | — | — | — |
| `jacd_execute` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `id` (電子版会員ID) | — (được cấp về) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `payment_start` | `'0'` | — | — | `'0'` | `'0'` | — |
| `notify_flg` | — | `'0'` | `'0'` | — | — | `'0'` |
| `cancel_ym` | — | — | — | — | — | ✅ `YYYYMM` |
| `action_kbn` (do tầng API gắn) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `timestamp` (do tầng API gắn) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> `reread` dùng **cùng chữ ký với `update`**, chỉ khác `action_kbn`.
> `unapprove` dùng **cùng chữ ký với `approve`** (`payment_start` bên 電子版 chỉ validate, không lưu).
> `create` **không truyền `notify_flg`** → 電子版 gửi mail chào mừng theo mặc định. `update`/`cancel` truyền `'0'` → **không gửi mail**.

### 4.1 JSON nguyên văn (plaintext) ngay trước khi mã hoá

**`action_kbn = "create"`**

```json
{
  "first_name": "山田",
  "last_name": "太郎",
  "first_kana": "やまだ",
  "last_kana": "たろう",
  "zip": "1000001",
  "pref_id": "13",
  "addr": "千代田区",
  "city": "千代田1-1",
  "tel": "0312345678",
  "email": "demo+001@vti.com.vn",
  "subscribe_flg": "1",
  "melmaga": "1",
  "profession": "0,1",
  "building": "農業ビル 5F",
  "remarks1": "demo push update",
  "birthyear": "1980",
  "sex": "1",
  "products": "0,4",
  "jacd_execute": "1139002001",
  "payment_start": "0",
  "action_kbn": "create",
  "timestamp": 1785312000
}
```

**`action_kbn = "update"` / `"reread"`** — như trên, bỏ `payment_start`, thêm:

```json
{
  "...": "🅿️ toàn bộ khối profile giống create",
  "jacd_execute": "1139002001",
  "id": "58231",
  "notify_flg": "0",
  "action_kbn": "update",
  "timestamp": 1785312000
}
```

**`action_kbn = "approve"` / `"unapprove"`**

```json
{
  "jacd_execute": "1139002001",
  "id": "58231",
  "payment_start": "0",
  "action_kbn": "approve",
  "timestamp": 1785312000
}
```

**`action_kbn = "cancel"`**

```json
{
  "jacd_execute": "1139002001",
  "id": "58231",
  "notify_flg": "0",
  "cancel_ym": "202608",
  "action_kbn": "cancel",
  "timestamp": 1785312000
}
```

> ⚠️ **Mọi giá trị đều là chuỗi**, trừ `timestamp` (number — UTC epoch giây, 電子版 kiểm `now − timestamp ≤ 300s` để chống replay).

---

## 5. Đóng gói & mã hoá trước khi gửi

```
JSON plaintext (§4.1)
   │  UTF-8
   ▼
AES-256-GCM, khoá chung (DENSHIBAN_COMMON_KEY: 64 ký tự hex hoặc 32 byte raw)
   │  IV = 12 byte ngẫu nhiên mỗi lần gọi
   ▼
gói = IV(12B) ‖ Ciphertext ‖ AuthTag(16B)
   │  Base64
   ▼
HTTP POST  Content-Type: application/json; charset=UTF-8   (timeout 15s)
Body:
```

```json
{ "payload": "<chuỗi Base64 của gói trên>" }
```

### 5.1 Response

電子版 **luôn trả HTTP 200**, thành/bại nằm ở mã trạng thái trong body:

```json
{ "satusCd": "0", "id": "58231", "message": "" }
```

| Trường | Ý nghĩa |
|---|---|
| `satusCd` | Mã trạng thái **thực tế server trả** (thiếu chữ `t`). `'0'` = thành công |
| `statusCode` | Tên key theo **tài liệu đặc tả** — cloud đọc `satusCd` trước, fallback `statusCode` |
| `id` | ID hội viên được cấp khi `create` thành công (các action khác trả rỗng) |
| `message` | Lý do lỗi do 電子版 trả về — được ưu tiên hiển thị cho người dùng |

Với `create` thành công, cloud ghi ngược `id` vào `t_dokusya.denshi_kaiin_id` **trong cùng transaction**.

### 5.2 Che thông tin cá nhân khi ghi log

Chỉ ghi log khi `satusCd ≠ '0'`. Payload gửi đi được che trước khi ghi CloudWatch: các trường cá nhân thay bằng `<len:N>` (hoặc `<empty>`).

| Bị che (thay bằng `<len:N>`) | Vẫn ghi nguyên giá trị |
|---|---|
| `first_name`, `last_name`, `first_kana`, `last_kana`, `zip`, `addr`, `city`, `building`, `tel`, `email`, `branch`, `remarks1`–`remarks5`, `others_profession`, `others_products` | `jacd_execute`, `action_kbn`, `timestamp`, `id`, `pref_id`, `profession`, `products`, `subscribe_flg`, `melmaga`, `sex`, `payment_start`, `birthyear`, `notify_flg`, `cancel_ym` |
