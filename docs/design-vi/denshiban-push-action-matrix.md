# Ma trận đồng bộ độc giả điện tử: Cloud ⇄ 電子版 (denshiban)

| | **[PHẦN A — PUSH](#phần-a--chiều-push-cloud--電子版)** (cloud → 電子版) | **[PHẦN B — PULL](#phần-b--chiều-pull-電子版--cloud)** (電子版 → cloud) |
|---|---|---|
| **Transport** | HTTP 共通API `updateUserInfo` | Đọc thẳng MySQL `cmsDB.users` (**chỉ đọc**) |
| **Nguồn kích hoạt** | Thao tác người dùng ở 購読者情報登録画面 / 購読者明細検索画面 + import ở 購読者Excelデータ取込画面 | Batch `dokusya-sync` chạy theo lịch |
| **Thời điểm** | Ngay trong transaction đang ghi của cloud | EventBridge → ECS RunTask, **10 phút/lần** |
| **Phân biệt thao tác** | Trường `action_kbn` — **6 mode** | Không có `action_kbn`; nhánh suy ra từ trạng thái dòng |
| **Ghi vào đâu** | Bảng `users` của 電子版 | `t_dokusya` + `t_dokusya_rireki` qua `applyChange` (`source='BATCH'`) |
| **Xử lý lỗi** | **Saga đồng bộ** — API lỗi → throw → cloud rollback (cả 2 bên cùng thành công hoặc cùng huỷ) | Mỗi dòng độc lập; dòng không hợp lệ → log `warn` + bỏ qua |
| **Khoá đối chiếu** | `t_dokusya.denshi_kaiin_id` ↔ `users.id` (chung cho cả 2 chiều) | như bên trái |
| **Loại trừ campaign** | Cờ `m_tanka.campaign_flg` (phía cloud) | Cờ `users.Campagna_flg` (phía 電子版) |
| **Chống vòng lặp echo** | `source='BATCH'` bị `isTarget` chặn → dữ liệu vừa pull về **không** bị push lại | — |
| **Bật/tắt** | `DENSHIBAN_PUSH_ENABLED` (mặc định **OFF**) | `DENSHIBAN_DB_ENABLED` (mặc định **ON**) |

**Điều hướng**

- [Phần A — chiều PUSH](#phần-a--chiều-push-cloud--電子版): [A1 ma trận action](#a1-bảng-ma-trận-action--thao-tác-nào-đồng-bộ-thao-tác-nào-không) · [A2 props JSON 6 mode](#a2-props-json--song-song-trước--sau-biến-đổi-đủ-6-mode) · [A3 ma trận key](#a3-ma-trận-key-theo-action_kbn--bảng-tra-nhanh)
- [Phần B — chiều PULL](#phần-b--chiều-pull-電子版--cloud): [B1 cơ chế chạy](#b1-cơ-chế-chạy) · [B2 điều kiện lấy về](#b2-điều-kiện-lấy-về-where-cố-định) · [B3 ba nhánh xử lý](#b3-ba-nhánh-xử-lý-mỗi-dòng) · [B4 cột cloud sở hữu](#b4-cột-do-cloud-sở-hữu--pull-không-ghi-đè) · [B5 bảng ánh xạ](#b5-bảng-ánh-xạ-users--t_dokusya-chiều-ngược-của-khối-profile-bên-push)
- [Phần C — đối chiếu 2 chiều](#phần-c--đối-chiếu-2-chiều-round-trip)

---

# PHẦN A — CHIỀU PUSH: cloud → 電子版

## A1. Bảng ma trận action — thao tác nào đồng bộ, thao tác nào không

| # | Thao tác phía cloud | Màn hình / Entry point | Đồng bộ? | `action_kbn` gửi đi | Thời điểm gửi |
|---|---|---|---|---|---|
| 1 | Đăng ký độc giả mới (登録) | 購読者情報登録画面 `POST /dokusya` | ✅ Có ※ | `create` | Ngay trong transaction. ⚠️ **Không đồng bộ** nếu 新聞単価 của độc giả có `campaign_flg = ON` |
| 2 | Import Excel chế độ 新規登録 | 購読者Excelデータ取込画面 `POST /dokusya/import` | ✅ Có ※ | `create` | Ngay, mỗi dòng 1 lệnh. ⚠️ **Không đồng bộ** nếu 新聞単価 của dòng đó có `campaign_flg = ON` |
| 3 | Cập nhật thông tin, 適用日 = **hôm nay** | 購読者情報登録画面 `PUT /dokusya/:id` | ✅ Có ※ | `update` | Ngay trong transaction. ⚠️ **Không đồng bộ** nếu 新聞単価 của độc giả có `campaign_flg = ON` |
| 4 | Import Excel chế độ 更新, 適用日 = **hôm nay** | 購読者Excelデータ取込画面 | ✅ Có ※ | `update` | Ngay, mỗi dòng 1 lệnh. ⚠️ **Không đồng bộ** nếu 新聞単価 của dòng đó có `campaign_flg = ON` |
| 5 | Cập nhật, 適用日 = **ngày tương lai** (予約変更 — chỉ 紙版 mới đặt được) | 購読者情報登録画面 / 購読者Excelデータ取込画面 | ❌ Không | — | `pushOnWrite` bỏ qua khi `immediateJohoDate ≠ hôm nay`; tới ngày 適用日 thì batch `dokusya:apply-due` chốt thay đổi nhưng batch đó **không gọi API** → thay đổi không bao giờ tới 電子版 |
| 6 | Đặt lại (再購読 / resubscribe), 購読開始日 = **hôm nay** | 購読者情報登録画面 `PUT /dokusya/:id` | ✅ Có | `reread` | Ngay trong transaction |
| 7 | Đặt lại (再購読), 購読開始日 = **ngày tương lai** | 購読者情報登録画面 | ❌ Không | — | `pushOnWrite` bỏ qua vì 適用日 ≠ hôm nay, và batch `dokusya:apply-due` cũng không gọi API để bù |
| 8 | Duyệt hội viên 承認・登録 | 購読者情報登録画面 `PUT /dokusya/:id/approve` | ✅ Có | `approve` | Ngay trong transaction |
| 9 | Từ chối 承認しない | 購読者情報登録画面 `PUT /dokusya/:id/reject` | ✅ Có | `unapprove` | Ngay trong transaction |
| 10 | Đăng ký ngừng đặt báo 購読停止 (解約予約) | 購読者明細検索画面 `POST /dokusya/:id/stop` | ✅ Có | `cancel` | **Ngay lúc bấm nút**, trong transaction, kèm `cancel_ym` = YYYYMM của 購読中止日. Không truyền `immediateJohoDate` nên dù 中止日 ở tương lai vẫn gửi ngay (chờ tới ngày chốt thì 電子版 đã tính cước thêm) |
| 11 | Batch chốt huỷ 解約確定 | `dokusya:apply-due` | ❌ **Không** | — | Batch **không gọi API nào** (顧客要件 2026-07 đã gỡ push khỏi cả 2 giai đoạn kaiyaku / recompute); `cancel` đã được phát từ lúc đăng ký ngừng đặt báo ở 購読者明細検索画面 |
| 12 | **Xoá độc giả (削除)** | 購読者明細検索画面 `DELETE /dokusya/:id` | ❌ **Không** | — | Chỉ soft-delete ở cloud; bên 電子版 hội viên vẫn còn |
| 13 | Thay thế hàng loạt 販売店一括置換 | 購読者明細検索画面 `POST /dokusya/replace-hanbaiten` | ❌ Không | — | 販売店 không nằm trong payload của 電子版 |
| 14 | Huỷ dòng lịch sử 履歴取消 (torikeshi) | 購読者履歴情報画面 | ❌ Không | — | Không có lời gọi push |
| 15 | Batch kéo dữ liệu về `dokusya-sync` (電子版 → cloud) | Batch pull | ❌ Không đẩy ngược | — | `source='BATCH'` bị `isTarget` chặn để **chống vòng lặp echo** — dữ liệu vừa kéo về không bị đẩy ngược sang 電子版 |

**Tên màn hình xuất hiện ở cột "Màn hình / Entry point"**

| Màn hình | Nội dung |
|---|---|
| 購読者情報登録画面 | Đăng ký / sửa thông tin độc giả, đặt lại, duyệt & từ chối hội viên |
| 購読者明細検索画面 | Tìm kiếm chi tiết độc giả, đăng ký ngừng đặt báo, xoá, thay thế 販売店 hàng loạt |
| 購読者Excelデータ取込画面 | Import dữ liệu độc giả từ Excel (2 chế độ 新規登録 / 更新) |
| 購読者履歴情報画面 | Xem & huỷ dòng lịch sử độc giả |

**Chú thích ký hiệu**
- ✅ Có — gọi `updateUserInfo` ngay trong transaction đang ghi.
- ❌ Không — không có lời gọi sang 電子版.
- ※ **Loại trừ campaign**: `isPushTarget` tra `m_tanka.campaign_flg` của 新聞単価 gắn với độc giả; `ON` → bỏ qua (no-op, không lỗi, cloud vẫn ghi bình thường). Độc giả campaign nằm ngoài phạm vi đồng bộ theo yêu cầu khách hàng — chiều pull `dokusya-sync` cũng loại họ khỏi đối tượng lấy về bằng điều kiện `Campagna_flg IS NULL OR Campagna_flg IN ('', '0')`. Điều kiện này áp dụng cho **mọi** action (kể cả `reread` / `approve` / `unapprove` / `cancel`), không riêng create/update.

---

## A2. Props JSON — song song TRƯỚC ↔ SAU biến đổi, đủ 6 mode

Luồng dữ liệu của một lần push:

```
t_dokusya (after snapshot)  →  mapper thuần  →  payload  →  +action_kbn +timestamp  →  JSON gửi đi
  bản ghi cloud vừa ghi       buildProfile()   theo từng     DenshibanApiService
  xong, chưa chuẩn hoá        + trường điều     mode          .updateUserInfo gắn
                              khiển
```

Toàn bộ ví dụ dưới đây dùng **cùng một độc giả mẫu** để các bảng đối chiếu được với nhau.

### A2.1 Đối tượng đầu vào — snapshot `t_dokusya` (after)

Bản ghi `t_dokusya` **sau khi cloud đã ghi xong**, chưa qua chuẩn hoá gì. Đây là tham số `after` của `pushOnWrite`.

```jsonc
// Entity Dokusya (camelCase trong code ⇄ snake_case trong DB)
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

### A2.2 🅿️ Khối profile — 18 key, bảng đối chiếu TRƯỚC ↔ SAU

Dùng **nguyên si** cho 3 mode `create` / `update` / `reread`; 3 mode còn lại (`approve` / `unapprove` / `cancel`) **không có khối này**.

| # | Cột nguồn `t_dokusya` | 日本語 — Tiếng Việt | Giá trị **TRƯỚC** | → Key 電子版 | Giá trị **SAU** | Quy tắc biến đổi |
|---|---|---|---|---|---|---|
| 1 | `shimei_sei` | 購読者氏名(氏) — Họ | `"山田"` | `first_name` | `"山田"` | `clamp`: xuống dòng → space, trim, cắt 255 |
| 2 | `shimei_mei` | 購読者氏名(名) — Tên | `"太郎"` | `last_name` | `"太郎"` | như trên |
| 3 | `shimei_kana_sei` | 購読者かな(氏) — Họ (kana) | `"やまだ"` | `first_kana` | `"やまだ"` | như trên (電子版 yêu cầu hiragana) |
| 4 | `shimei_kana_mei` | 購読者かな(名) — Tên (kana) | `"たろう"` | `last_kana` | `"たろう"` | như trên |
| 5 | `yubin_no` | 郵便番号 — Mã bưu điện | `"100-0001"` | `zip` | `"1000001"` | `digitsOnly`: **bỏ mọi ký tự không phải số** |
| 6 | `todofuken_code` | 都道府県コード — Mã tỉnh | `"13"` | `pref_id` | `"13"` | `digitsOnly` (電子版 chỉ nhận 1–47) |
| 7 | `shikuchoson` | 市町村郡 — Quận/huyện | `"千代田区"` | `addr` | `"千代田区"` | `clamp` 255 |
| 8 | `chome_banchi` | 丁目番地 — Số nhà/khối phố | `"千代田1-1"` | `city` | `"千代田1-1"` | `clamp` 255 ⚠️ **lưu ý ánh xạ chéo**: 市町村郡→`addr`, 丁目番地→`city` |
| 9 | `renrakusaki1` | 連絡先１ — SĐT liên lạc 1 | `"03-1234-5678"` | `tel` | `"0312345678"` | `digitsOnly` |
| 10 | `email` | メールアドレス — Email | `"demo+001@vti.com.vn"` | `email` | `"demo+001@vti.com.vn"` | `trim` |
| 11 | `honshi_kodoku_flg` | 本紙購読フラグ — Cờ đặt báo bản chính | `true` (boolean) | `subscribe_flg` | `"1"` | `true`→`'1'`, `false`→`'0'` |
| 12 | `mail_magazine_flg` | メールマガジン — Nhận mail magazine | `1` (number) | `melmaga` | `"1"` | `1`→`'1'`, **mọi giá trị khác**→`'0'` |
| 13 | `dokusyaso_bunrui` | 購読者層分類 — Phân loại tầng độc giả | `"0,1"` | `profession` | `"0,1"` | Lọc bỏ mã lạ, giữ CSV. **Rỗng → `"999"` (その他)** |
| 14 | `tatemono_mei` | 建物名 — Tên toà nhà | `"農業ビル 5F"` | `building` | `"農業ビル 5F"` | `clamp` 255. **Rỗng → bỏ hẳn key** |
| 15 | `biko` | 備考 — Ghi chú | `"demo push\nupdate"` | `remarks1` | `"demo push update"` | `clamp` 255 (xuống dòng → space). **Rỗng → bỏ hẳn key** |
| 16 | `birth_year` | 生年 — Năm sinh | `1980` (number) | `birthyear` | `"1980"` | Chỉ gửi khi khớp `^\d{4}$`; ngược lại **bỏ key** |
| 17 | `gender` | 性別 — Giới tính | `1` (number) | `sex` | `"1"` | `1`(男)→`'1'`, `2`(女)→**`'0'`**, còn lại→`'9'` ⚠️ **đảo giá trị so với cloud** |
| 18 | `nogyosya_bunrui` | 農業者分類 — Phân loại nông nghiệp | `"0,4"` | `products` | `"0,4"` | Chỉ có giá trị **khi `profession` chứa `"0"` (農業者)**; ngược lại `""`. Key **luôn có mặt** |

**3 key có điều kiện xuất hiện** — `building`, `remarks1`, `birthyear`. Nếu nguồn rỗng/không hợp lệ thì key **biến mất khỏi JSON** (không phải gửi `""`). Ví dụ cùng độc giả trên nhưng `tatemonoMei = ""`, `biko = ""`, `birthYear = null`:

| Giá trị TRƯỚC | Kết quả SAU |
|---|---|
| `"tatemonoMei": ""` | không có key `building` |
| `"biko": ""` | không có key `remarks1` |
| `"birthYear": null` | không có key `birthyear` |
| `"dokusyasoBunrui": ""` | `"profession": "999"`, và `"products": ""` (vì profession không chứa `"0"`) |

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

### A2.3 Trường điều khiển — không thuộc khối profile

| Nguồn | Giá trị **TRƯỚC** | → Key 電子版 | Giá trị **SAU** | Quy tắc biến đổi |
|---|---|---|---|---|
| `m_kanri_shiten.kanri_shiten_code` (tra qua `kanri_shiten_id = 7`) | `"113-9002-001"` | `jacd_execute` | `"1139002001"` | Bỏ ký tự không phải số → **bắt buộc đúng 10 chữ số**, sai thì throw, chưa gọi API |
| `t_dokusya.denshi_kaiin_id` | `58231` (number) | `id` | `"58231"` | `String(...)` |
| `t_dokusya.dokusya_chushi_date` | `"2026-08-31"` | `cancel_ym` | `"202608"` | Bỏ `-` rồi lấy 6 ký tự đầu → `YYYYMM` |
| — (hằng số trong mapper) | — | `payment_start` | `"0"` | `'0'` = bắt đầu tính cước từ hôm nay |
| — (hằng số trong mapper) | — | `notify_flg` | `"0"` | `'0'` = **không gửi mail thông báo** |
| — (tầng API gắn) | tham số `action` | `action_kbn` | `"create"` | `DenshibanApiService.updateUserInfo` |
| — (tầng API gắn) | `Date.now()` | `timestamp` | `1785312000` | `Math.floor(Date.now()/1000)` — **number**, UTC epoch giây |

---

### A2.4 Mode `create` — 登録

**Phát sinh từ**: đăng ký mới, import 新規登録, và fallback khi `update`/`reread` gặp `denshi_kaiin_id = null`.
**Thành phần**: 🅿️ khối profile 18 key + `jacd_execute` + `payment_start`. **Không** có `id` (電子版 cấp về) và **không** có `notify_flg` (→ 電子版 gửi mail chào mừng theo mặc định).

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| 🅿️ `shimei_sei` | `"山田"` | `first_name` | `"山田"` |
| 🅿️ `shimei_mei` | `"太郎"` | `last_name` | `"太郎"` |
| 🅿️ `shimei_kana_sei` | `"やまだ"` | `first_kana` | `"やまだ"` |
| 🅿️ `shimei_kana_mei` | `"たろう"` | `last_kana` | `"たろう"` |
| 🅿️ `yubin_no` | `"100-0001"` | `zip` | `"1000001"` |
| 🅿️ `todofuken_code` | `"13"` | `pref_id` | `"13"` |
| 🅿️ `shikuchoson` | `"千代田区"` | `addr` | `"千代田区"` |
| 🅿️ `chome_banchi` | `"千代田1-1"` | `city` | `"千代田1-1"` |
| 🅿️ `renrakusaki1` | `"03-1234-5678"` | `tel` | `"0312345678"` |
| 🅿️ `email` | `"demo+001@vti.com.vn"` | `email` | `"demo+001@vti.com.vn"` |
| 🅿️ `honshi_kodoku_flg` | `true` | `subscribe_flg` | `"1"` |
| 🅿️ `mail_magazine_flg` | `1` | `melmaga` | `"1"` |
| 🅿️ `dokusyaso_bunrui` | `"0,1"` | `profession` | `"0,1"` |
| 🅿️ `tatemono_mei` | `"農業ビル 5F"` | `building` | `"農業ビル 5F"` (rỗng → bỏ key) |
| 🅿️ `biko` | `"demo push\nupdate"` | `remarks1` | `"demo push update"` (rỗng → bỏ key) |
| 🅿️ `birth_year` | `1980` | `birthyear` | `"1980"` (không phải 4 chữ số → bỏ key) |
| 🅿️ `gender` | `1` | `sex` | `"1"` |
| 🅿️ `nogyosya_bunrui` | `"0,4"` | `products` | `"0,4"` |
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| hằng số | — | `payment_start` | `"0"` |
| tầng API | — | `action_kbn` | `"create"` |
| tầng API | — | `timestamp` | `1785312000` |

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

> Thành công → 電子版 trả `id`, cloud ghi ngược vào `t_dokusya.denshi_kaiin_id` **trong cùng transaction**.

### A2.5 Mode `update` — 情報変更

**Phát sinh từ**: cập nhật thông tin hoặc import 更新, với 適用日 = hôm nay.
**Thành phần**: 🅿️ khối profile 18 key + `jacd_execute` + `id` + `notify_flg`. So với `create`: **bỏ** `payment_start`, **thêm** `id` và `notify_flg`.

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| 🅿️ `shimei_sei` | `"山田"` | `first_name` | `"山田"` |
| 🅿️ `shimei_mei` | `"太郎"` | `last_name` | `"太郎"` |
| 🅿️ `shimei_kana_sei` | `"やまだ"` | `first_kana` | `"やまだ"` |
| 🅿️ `shimei_kana_mei` | `"たろう"` | `last_kana` | `"たろう"` |
| 🅿️ `yubin_no` | `"100-0001"` | `zip` | `"1000001"` |
| 🅿️ `todofuken_code` | `"13"` | `pref_id` | `"13"` |
| 🅿️ `shikuchoson` | `"千代田区"` | `addr` | `"千代田区"` |
| 🅿️ `chome_banchi` | `"千代田1-1"` | `city` | `"千代田1-1"` |
| 🅿️ `renrakusaki1` | `"03-1234-5678"` | `tel` | `"0312345678"` |
| 🅿️ `email` | `"demo+001@vti.com.vn"` | `email` | `"demo+001@vti.com.vn"` |
| 🅿️ `honshi_kodoku_flg` | `true` | `subscribe_flg` | `"1"` |
| 🅿️ `mail_magazine_flg` | `1` | `melmaga` | `"1"` |
| 🅿️ `dokusyaso_bunrui` | `"0,1"` | `profession` | `"0,1"` |
| 🅿️ `tatemono_mei` | `"農業ビル 5F"` | `building` | `"農業ビル 5F"` (rỗng → bỏ key) |
| 🅿️ `biko` | `"demo push\nupdate"` | `remarks1` | `"demo push update"` (rỗng → bỏ key) |
| 🅿️ `birth_year` | `1980` | `birthyear` | `"1980"` (không phải 4 chữ số → bỏ key) |
| 🅿️ `gender` | `1` | `sex` | `"1"` |
| 🅿️ `nogyosya_bunrui` | `"0,4"` | `products` | `"0,4"` |
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| `denshi_kaiin_id` | `58231` | `id` | `"58231"` |
| hằng số | — | `notify_flg` | `"0"` |
| tầng API | — | `action_kbn` | `"update"` |
| tầng API | — | `timestamp` | `1785312000` |

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
  "id": "58231",
  "notify_flg": "0",
  "action_kbn": "update",
  "timestamp": 1785312000
}
```

> Nếu `denshi_kaiin_id = null` (hội viên tạo trước khi bật liên kết) → **tự chuyển sang mode `create`** (payload bỏ `id` + `notify_flg`, thêm `payment_start: "0"`), không gửi `update`.

### A2.6 Mode `reread` — 再購読 (đặt lại)

**Phát sinh từ**: đặt lại (再購読) với 購読開始日 = hôm nay.
**Thành phần**: **giống hệt `update`** — chỉ khác duy nhất giá trị `action_kbn`.

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| 🅿️ `shimei_sei` | `"山田"` | `first_name` | `"山田"` |
| 🅿️ `shimei_mei` | `"太郎"` | `last_name` | `"太郎"` |
| 🅿️ `shimei_kana_sei` | `"やまだ"` | `first_kana` | `"やまだ"` |
| 🅿️ `shimei_kana_mei` | `"たろう"` | `last_kana` | `"たろう"` |
| 🅿️ `yubin_no` | `"100-0001"` | `zip` | `"1000001"` |
| 🅿️ `todofuken_code` | `"13"` | `pref_id` | `"13"` |
| 🅿️ `shikuchoson` | `"千代田区"` | `addr` | `"千代田区"` |
| 🅿️ `chome_banchi` | `"千代田1-1"` | `city` | `"千代田1-1"` |
| 🅿️ `renrakusaki1` | `"03-1234-5678"` | `tel` | `"0312345678"` |
| 🅿️ `email` | `"demo+001@vti.com.vn"` | `email` | `"demo+001@vti.com.vn"` |
| 🅿️ `honshi_kodoku_flg` | `true` | `subscribe_flg` | `"1"` |
| 🅿️ `mail_magazine_flg` | `1` | `melmaga` | `"1"` |
| 🅿️ `dokusyaso_bunrui` | `"0,1"` | `profession` | `"0,1"` |
| 🅿️ `tatemono_mei` | `"農業ビル 5F"` | `building` | `"農業ビル 5F"` (rỗng → bỏ key) |
| 🅿️ `biko` | `"demo push\nupdate"` | `remarks1` | `"demo push update"` (rỗng → bỏ key) |
| 🅿️ `birth_year` | `1980` | `birthyear` | `"1980"` (không phải 4 chữ số → bỏ key) |
| 🅿️ `gender` | `1` | `sex` | `"1"` |
| 🅿️ `nogyosya_bunrui` | `"0,4"` | `products` | `"0,4"` |
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| `denshi_kaiin_id` | `58231` | `id` | `"58231"` |
| hằng số | — | `notify_flg` | `"0"` |
| tầng API | — | `action_kbn` | **`"reread"`** ← khác `update` |
| tầng API | — | `timestamp` | `1785312000` |

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
  "id": "58231",
  "notify_flg": "0",
  "action_kbn": "reread",
  "timestamp": 1785312000
}
```

> Cũng có fallback `denshi_kaiin_id = null` → `create` như `update`.

### A2.7 Mode `approve` — 承認・登録 (duyệt hội viên)

**Phát sinh từ**: duyệt hội viên 承認・登録.
**Thành phần**: **không có khối profile** — chỉ 3 key. 電子版 chỉ đổi trạng thái duyệt, không đụng thông tin cá nhân.

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| `denshi_kaiin_id` | `58231` | `id` | `"58231"` |
| hằng số | — | `payment_start` | `"0"` |
| tầng API | — | `action_kbn` | `"approve"` |
| tầng API | — | `timestamp` | `1785312000` |

```json
{
  "jacd_execute": "1139002001",
  "id": "58231",
  "payment_start": "0",
  "action_kbn": "approve",
  "timestamp": 1785312000
}
```

> `denshi_kaiin_id = null` → **bỏ qua, ghi log `warn`**, workflow duyệt của cloud vẫn chạy tiếp (không throw).

### A2.8 Mode `unapprove` — 承認しない (từ chối)

**Phát sinh từ**: từ chối 承認しない.
**Thành phần**: **giống hệt `approve`** — chỉ khác `action_kbn`.

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| `denshi_kaiin_id` | `58231` | `id` | `"58231"` |
| hằng số | — | `payment_start` | `"0"` |
| tầng API | — | `action_kbn` | **`"unapprove"`** ← khác `approve` |
| tầng API | — | `timestamp` | `1785312000` |

```json
{
  "jacd_execute": "1139002001",
  "id": "58231",
  "payment_start": "0",
  "action_kbn": "unapprove",
  "timestamp": 1785312000
}
```

> `payment_start` vẫn phải gửi dù vô nghĩa về mặt nghiệp vụ: 電子版 **chỉ validate, không lưu** trên nhánh `unapprove`.

### A2.9 Mode `cancel` — 解約 (huỷ đặt báo)

**Phát sinh từ**: đăng ký ngừng đặt báo 購読停止 (解約予約) — **ngay lúc bấm nút**, không phải batch.
**Thành phần**: **không có khối profile** — 4 key, trong đó `cancel_ym` là tháng huỷ.

| Nguồn | Giá trị TRƯỚC | → Key | Giá trị SAU |
|---|---|---|---|
| `kanri_shiten_code` | `"113-9002-001"` | `jacd_execute` | `"1139002001"` |
| `denshi_kaiin_id` | `58231` | `id` | `"58231"` |
| hằng số | — | `notify_flg` | `"0"` |
| `dokusya_chushi_date` | `"2026-08-31"` | `cancel_ym` | `"202608"` |
| tầng API | — | `action_kbn` | `"cancel"` |
| tầng API | — | `timestamp` | `1785312000` |

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

> `denshi_kaiin_id = null` → bỏ qua + log `warn`, **không chặn** việc đặt lịch huỷ ở cloud.

---

## A3. Ma trận key theo `action_kbn` — bảng tra nhanh

Ký hiệu: 🅿️ = khối profile 18 key — `first_name`, `last_name`, `first_kana`, `last_kana`, `zip`, `pref_id`, `addr`, `city`, `tel`, `email`, `subscribe_flg`, `melmaga`, `profession`, `building`, `remarks1`, `birthyear`, `sex`, `products`.

| Key | `create` | `update` | `reread` | `approve` | `unapprove` | `cancel` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| 🅿️ khối profile (18 key) | ✅ | ✅ | ✅ | — | — | — |
| `jacd_execute` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `id` (電子版会員ID) | — (được cấp về) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `payment_start` | `"0"` | — | — | `"0"` | `"0"` | — |
| `notify_flg` | — | `"0"` | `"0"` | — | — | `"0"` |
| `cancel_ym` | — | — | — | — | — | ✅ `YYYYMM` |
| `action_kbn` (tầng API gắn) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `timestamp` (tầng API gắn) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Quan hệ giữa các mode**
- `reread` = `update` + đổi `action_kbn`.
- `unapprove` = `approve` + đổi `action_kbn`.
- `create` **không** truyền `notify_flg` → 電子版 gửi mail chào mừng mặc định; `update`/`reread`/`cancel` truyền `"0"` → **không gửi mail**.

> ⚠️ **Mọi giá trị đều là chuỗi**, trừ `timestamp` (number — UTC epoch giây, 電子版 kiểm `now − timestamp ≤ 300s` để chống replay).

---

# PHẦN B — CHIỀU PULL: 電子版 → cloud

## B1. Cơ chế chạy

| Hạng mục | Giá trị |
|---|---|
| Entry point | `npm run dokusya:sync:prod` → [dokusya-sync.main.ts](../../apps/backend/src/batch/dokusya-sync.main.ts); EventBridge → ECS RunTask, **10 phút/lần** |
| Nguồn dữ liệu | 電子版 MySQL `cmsDB.users` — **chỉ đọc**, mỗi trang mở/đóng 1 kết nối ngắn (`withConnection`) để không giữ idle conn qua NAT/`wait_timeout` |
| Bật/tắt | `DENSHIBAN_DB_ENABLED` (mặc định **ON** — khác `DENSHIBAN_PUSH_ENABLED` mặc định OFF) |
| Chống chạy chồng | PostgreSQL advisory lock key `4210010`; đang chạy → log `dokusya_sync.skip` rồi thoát |
| Khoá đối chiếu | `users.id` ↔ `t_dokusya.denshi_kaiin_id` |
| Ghi vào cloud | Qua `applyChange` với `source='BATCH'`, `johoDate` = **hôm nay** (JST) → sinh dòng `t_dokusya_rireki` + recompute `t_dokusya` |
| Không đẩy ngược | `source='BATCH'` bị `isTarget` chặn → dữ liệu vừa kéo về không push lại (chống vòng lặp echo) |

## B2. Điều kiện lấy về (WHERE cố định)

| Điều kiện | SQL | Ý nghĩa |
|---|---|---|
| Loại trừ campaign | `Campagna_flg IS NULL OR Campagna_flg IN ('', '0')` | Đối xứng với điều kiện `m_tanka.campaign_flg = ON → bỏ qua` của chiều push — độc giả campaign nằm ngoài phạm vi đồng bộ ở **cả hai chiều** |
| Đối tượng hợp lệ | `collecting = 1 OR (treatment = 1 AND payment_id = 6)` | Chỉ hội viên đang thu tiền, hoặc đang xử lý + trả bằng thẻ tín dụng |

## B3. Ba nhánh xử lý mỗi dòng

| Nhánh | Điều kiện | Hành vi ở cloud |
|---|---|---|
| **解約** | `users.status = 9` | `applyChange(UPDATE)` với `dokusya_busu = 0` + `tetsuzuki_shurui = 0`, rồi **soft-delete** `t_dokusya`. Không tồn tại ở cloud → skip |
| **UPDATE** | Đã có dòng khớp `denshi_kaiin_id` | `applyChange(UPDATE)`; không phát sinh thay đổi → đếm `unchanged`, không tạo dòng lịch sử |
| **CREATE** | Chưa có dòng khớp | `applyChange(CREATE)` rồi set `denshi_kaiin_id` vào master (cột này chỉ có ở master, không có trong lịch sử) |

**Các trường hợp bị skip (ghi log `warn`, batch vẫn chạy tiếp các dòng sau):**

| Tình huống | Log event |
|---|---|
| `JACd` (bỏ `-`) không khớp `m_kanri_shiten.kanri_shiten_code` → không xác định được JA | `dokusya_sync.skip_no_ja` |
| CREATE mà `activated_at` / `application_date` / `created_at` đều rỗng → không có 購読開始日 (cột NOT NULL) | `dokusya_sync.skip_no_kaishi_date` |
| `status = 9` nhưng cloud chưa có hội viên đó | (đếm vào `skipped`) |

## B4. Cột do cloud sở hữu — pull KHÔNG ghi đè

| Cột | Quy tắc |
|---|---|
| `tanka_id` | **Luôn giữ** giá trị cloud (đơn giá do màn hình duyệt đăng ký, 電子版 không có khái niệm này) |
| `denshi_shonin_status` | Giữ giá trị cloud khi 電子版 gửi về `0` (chưa duyệt) mà cloud đã `承認(1)` / `否認(2)` — tránh bị đẩy ngược về trạng thái chờ (khách xác nhận 2026-07-27). Các trường hợp khác thì lấy theo 電子版 |

Cách thực hiện: xoá key khỏi `values` trước khi gọi `applyChange` → writer tự carry-forward giá trị của dòng lịch sử liền trước.

## B5. Bảng ánh xạ `users` → `t_dokusya` (chiều ngược của khối profile bên push)

| `users` (電子版) | → cột cloud | Quy tắc biến đổi |
|---|---|---|
| `id` | `denshi_kaiin_id` | Khoá đối chiếu; set trực tiếp vào master sau CREATE |
| `JACd` | `kanri_shiten_id`, `ja_id` | Bỏ `-` rồi tra `m_kanri_shiten.kanri_shiten_code`; không khớp → skip cả dòng |
| `ShopCd` | `hanbaiten_id` | Chỉ với 併読: tra theo key `${ja_id}:${hanbaiten_code}`. 電子版 đơn thuần → `null` |
| `paper_permission_dt` | `dokusya_shubetsu` | Có giá trị → **併読(3)**; rỗng → **電子版(2)**. Đồng thời quyết định `haitatsu_same_flg` (電子版 = TRUE, 併読 = FALSE) |
| `status` | `tetsuzuki_shurui` | `9` → `0` (解約); còn lại (`0/1/2/3`) → `1` (新規) |
| `approval` | `denshi_shonin_status` | `0`→未承認, `1`→承認, `2`→否認, `9`/khác → `null`. **Ngoại lệ**: 電子版 gửi về `0` mà cloud đã 承認(1)/否認(2) → **giữ giá trị cloud**, không ghi đè |
| `member_type` | `denshi_dokusya_shubetsu` | `1`(無料)→`0`, `2`(有料)→`1`, khác → `null` |
| `first_name` / `last_name` | `shimei_sei` / `shimei_mei` | Giữ nguyên (không trim) |
| `first_kana` / `last_kana` | `shimei_kana_sei` / `shimei_kana_mei` | Giữ nguyên |
| `zip1` + `zip2` | `yubin_no` | Nối rồi bỏ ký tự không phải số (7 số, không gạch) |
| `pref_id` | `todofuken_code` | Pad 2 chữ số (`13` → `"13"`, `5` → `"05"`); `≤ 0`/rỗng → `""` |
| `addr` / `city` / `building` | `shikuchoson` / `chome_banchi` / `tatemono_mei` | ⚠️ Ánh xạ chéo giống chiều push: `addr`↔市町村郡, `city`↔丁目番地 |
| `paper_zip` / `paper_pref_id` / `paper_addr` / `paper_city` / `paper_building` | Nhóm `haitatsu_*` | Chỉ dùng khi **併読**; 電子版 đơn thuần thì địa chỉ giao = địa chỉ độc giả |
| `tel1` / `tel2` | `renrakusaki1` / `renrakusaki2` | Giữ nguyên (kể cả dấu gạch) |
| `email` | `email` | Giữ nguyên |
| `melmaga` | `mail_magazine_flg` | Rỗng → `0` |
| `birthyear` | `birth_year` | Không phải số → `null` |
| `sex` | `gender` | `1`→`1`(男), `0`→`2`(女), khác → `9`. Đảo giá trị — đối xứng với hàm `genderToSex` của chiều push (`1`(男)→`'1'`, `2`(女)→`'0'`, khác→`'9'`) |
| `profession` | `dokusyaso_bunrui` | CSV identity + lọc bỏ mã lạ (`0/1/2/3/999`) |
| `products` | `nogyosya_bunrui` | CSV identity + lọc bỏ mã lạ (`0`…`5`,`999`) |
| `remarks1`…`remarks5` | `biko` | Nối bằng **xuống dòng**, bỏ phần rỗng |
| `payment_id` | `shiharai_hoho` | 1:1 nếu là mã hợp lệ; không hợp lệ/rỗng → `9` (その他) |
| `payment_cycle` | `dokusyaryo_shiharai_cycle` | Số hoặc `null` |
| `payment_start_ym` | `seikyu_kaishi_month` | Chuỗi `YYYYMM` |
| `subscribe_flg` | `honshi_kodoku_flg` | `= 1` → `true` |
| `activated_at` → `application_date` → `created_at` | `dokusya_kaishi_date`, `shoki_dokusya_kaishi_date` | Lấy giá trị đầu tiên khác rỗng theo thứ tự đó (dữ liệu thật có hội viên chưa kích hoạt); cả 3 rỗng → skip dòng |
| `deleted_at` | `dokusya_chushi_date` | Ngày (`YYYY-MM-DD`) |
| — (hằng số) | `dokusya_busu` | Luôn `1` (電子版 = 1 hợp đồng 1 bản) |
| — (hằng số) | `shiten_id`, `tanka_id`, `yubin_kubun`, `kumiaiin_code`, nhóm ngân hàng | `null` / giá trị "không có" — 電子版 không cấp các trường này |

---

# PHẦN C — ĐỐI CHIẾU 2 CHIỀU (round-trip)

Phần này áp dụng cho **cả A lẫn B** — những điểm bất đối xứng khiến dữ liệu đi vòng cloud → 電子版 → cloud (hoặc ngược lại) **không quay về nguyên trạng**.

| Trường | Pull (về cloud) | Push (đi 電子版) | Hệ quả |
|---|---|---|---|
| Ghi chú | `remarks1`…`remarks5` nối bằng `\n` | Chỉ gửi lại **`remarks1`**, `\n` → space, cắt 255 ký tự | Sửa 備考 ở cloud rồi đẩy đi sẽ dồn hết vào `remarks1`; `remarks2`…`5` ở 電子版 giữ nguyên giá trị cũ |
| 購読部数 | Luôn ép `1` | Không nằm trong payload | Không có gì để lệch |
| `tanka_id` | Không nhận từ 電子版 | Chỉ dùng để kiểm `campaign_flg`, không gửi đi | Đơn giá thuần tuý thuộc cloud |
| Loại trừ campaign | `users.Campagna_flg` | `m_tanka.campaign_flg` | Hai nguồn cờ khác nhau — lệch cấu hình giữa 2 hệ thống sẽ tạo ra độc giả "chỉ đồng bộ 1 chiều" |
| Giới tính | `sex` `1`→`1`(男), `0`→`2`(女) | `gender` `1`(男)→`'1'`, `2`(女)→`'0'` | Hai hàm đối xứng nhau — round-trip giữ nguyên giá trị |
| Địa chỉ | `addr`→市町村郡, `city`→丁目番地 | 市町村郡→`addr`, 丁目番地→`city` | Ánh xạ chéo nhưng nhất quán 2 chiều — round-trip giữ nguyên |
