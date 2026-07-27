# t_dokusya ↔ t_dokusya_rireki — Bảng nghiệp vụ dữ liệu đầy đủ

> Mô tả **toàn bộ** thay đổi dữ liệu của 2 bảng độc giả qua mọi nghiệp vụ:
> tạo / sửa / duyệt / dừng / huỷ lịch sử / xoá (SCR-011, 013, 014, 015, 016),
> đồng bộ điện tử bản (denshiban) 2 chiều, và batch áp dụng theo ngày.
> Chi tiết đến từng cột.
>
> Nguồn: `apps/backend/src/database/entities/dokusya{,-rireki}.entity.ts`,
> `apps/backend/src/modules/dokusya/dokusya-history.{writer,builder,query,constants}.ts`,
> `dokusya.service.ts`, `dokusya-replace.service.ts`, `dokusya-import.service.ts`,
> `apps/backend/src/modules/denshiban/**`, `apps/backend/src/modules/batch/**`,
> `docs/database/database-design.md`.
>
> 📊 **Ma trận trường × mode** (紙版 / 電子版 tách riêng, kèm bảng đồng bộ inbound/outbound):
> [dokusya-change-matrix.md](./dokusya-change-matrix.md)

---

## 0. Mô hình dữ liệu — hai bảng, hai vai trò

| | `t_dokusya` (購読者マスタ) | `t_dokusya_rireki` (購読者履歴) |
|---|---|---|
| Vai trò | **Snapshot phái sinh** — trạng thái *hiện hành* | **Sổ cái append-only (正本)** — nguồn sự thật |
| Ghi | Chỉ ghi bởi `recomputeMaster()` (+ vài cột master-only) | INSERT-only. Không UPDATE nghiệp vụ, không DELETE |
| Xoá | Soft delete (`deleted_at`) | **Không có `deleted_at`** — lịch sử sống sót khi master bị xoá mềm |
| Sửa sai | — | `torikeshi_flg` (赤伝 / phiếu đỏ), không bao giờ xoá vật lý |
| Số cột | 63 | 72 |

### 0.1 Hai trục thời gian (bitemporal)

| Trục | Cột | Ý nghĩa |
|---|---|---|
| **Valid time** (thời gian nghiệp vụ) | `joho_henko_tekiyo_date` (読者情報変更適用日) | Thay đổi *có hiệu lực* từ ngày nào |
| **Transaction time** (thời gian ghi sổ) | `rireki_no` (履歴No) | Thứ tự ghi vào hệ thống |

### 0.2 Định nghĩa "dòng hiệu lực" (有効レコード)

Không phải `MAX(rireki_no)`. Công thức (`loadCurrentLifecycleEffectiveRow`):

```
latestShinki = MAX(joho, rireki_no) WHERE shinki_flg = TRUE AND torikeshi_flg = FALSE
effective    = MAX(joho, rireki_no) WHERE torikeshi_flg = FALSE
                                      AND rireki_no >= latestShinki.rireki_no   ← chỉ trong lifecycle hiện tại
                                      AND joho <= asOf (mặc định = hôm nay JST)
             ?? latestShinki                                                     ← fallback: mọi dòng đều tương lai
```

- **Lifecycle**: mỗi lần 再購読 (tái đăng ký) tạo một dòng `shinki_flg=TRUE` mới → mốc lifecycle mới. Các dòng của lifecycle cũ (kể cả ngày dừng) bị loại khỏi tính toán.
- **Fallback**: độc giả tạo mới với ngày bắt đầu tương lai vẫn hiển thị ngay (master lấy dòng 新規 mới nhất).

### 0.3 Bất biến hệ thống (invariant)

```
t_dokusya  ⇔  đúng 1 dòng t_dokusya_rireki có saishin_data_flg = TRUE
```

`setSaishinFlags()` set `TRUE` cho dòng hiệu lực và `FALSE` cho **mọi** dòng `torikeshi_flg=false` khác, bằng 1 câu UPDATE.

### 0.4 Cấp phát `rireki_no`

`nextRirekiNo = COALESCE(MAX(rireki_no),0)+1`, **đếm cả dòng đã huỷ (torikeshi)** → dòng đối ứng không đụng UNIQUE `(dokusya_id, rireki_no)`.
Mọi luồng UPDATE gọi `lockDokusyaRow(manager, id)` (`SELECT … FOR UPDATE` trên master) trước khi cấp số → chống race 2 request cùng lấy MAX+1.

---

## 1. Đường ghi chung — `applyChange()`

**Mọi** nghiệp vụ ghi (UI create/update, Excel取込, 一括置換, đồng bộ inbound) đều đi qua hàm này. Không luồng nào tự INSERT `t_dokusya_rireki`.

| Bước | Hàm | Việc làm |
|---|---|---|
| 1 | `ensureMaster` / `loadMaster` | CREATE: INSERT vỏ master → lấy `dokusya_id`. UPDATE: đọc snapshot `before` (dùng cho audit) |
| 2 | `findBefore(dokusyaId, joho)` | Lấy **dòng liền trước theo timeline** = dòng hiệu lực tại `joho`. CREATE → `null` |
| 3 | `diffChangedFields(before, values)` | So sánh với dòng liền trước (KHÔNG so với master). Loại `DIFF_EXCLUDE_FIELDS`. So sánh khoan dung số/chuỗi (bigint TypeORM trả về string) |
| 4 | `splitEvents` | **1 lần cập nhật = 1 bản ghi** (bỏ tách theo ngày áp dụng bán hàng từ 2026-07). `changed.length === 0` → **KHÔNG sinh dòng lịch sử nào** |
| 5 | `buildRirekiRow` | Clone dòng trước (carry-forward) → ghi đè giá trị đổi → `fillZenkai` → set cờ |
| 6 | `insertRow` + `recomputeAfterChain` | INSERT; sau đó **chỉ** relink dòng kế tiếp (zenkai_* + zougen), không lan truyền tiếp |
| 7 | `recomputeMaster(dokusyaId, hôm nay)` | `setSaishinFlags` + copy dòng hiệu lực → master + ghi đè ngày dừng đã đặt lịch |

### 1.1 `DIFF_EXCLUDE_FIELDS` — không tính là "thay đổi nghiệp vụ"

`joho_henko_tekiyo_date`, `rireki_no`, `created_at/by`, `updated_at/by`, `dokusya_rireki_id`, `dokusya_id`.

> `joho` bị loại có chủ đích: nếu để lại, mỗi lần sửa ngày áp dụng khác nhau sẽ luôn bị coi là "có thay đổi" → sinh dòng lịch sử rác (bug đã sửa 2026-07).

### 1.2 `MASTER_EXCLUDE_FIELDS` — cột KHÔNG copy từ rireki về master

`dokusya_rireki_id`, `henko_riyu`, `saishin_data_flg`, `zougen_hokoku_flg`, `shinki_flg`, `kaiyaku_flg`, `torikeshi_flg`, `zenkai_*` (7 cột), `created_at`, `created_by`, `dokusya_id`.
→ Mọi cột còn lại **được copy toàn bộ** (full recompute, idempotent).

---

## 2. Bảng chi tiết từng trường — 63 cột chung của `t_dokusya`

Ký hiệu cột "Rireki": số thứ tự cột tương ứng trong `t_dokusya_rireki`; `—` = master-only (không có trong lịch sử, **không bị recompute đụng tới**).

| # | Cột DB | 項目名 (JP) | Tiếng Việt | Rireki | Quy tắc ghi theo nghiệp vụ |
|---|---|---|---|---|---|
| 1 | `dokusya_id` | 購読者ID | ID độc giả (PK, IDENTITY) | 2 (FK) | Sinh bởi `ensureMaster` khi CREATE. Bất biến. Body PUT chứa nó → 400 |
| 2 | `ja_id` | JA ID | ID JA (tenant) | 4 | CREATE: **lấy từ session**, body bị bỏ qua (bảo mật). UPDATE: pin theo `before.jaId`. Inbound sync: resolve từ `JACd` chỉ lúc CREATE |
| 3 | `kanri_shiten_id` | 管理支店ID | ID chi nhánh quản lý | 5 | CREATE: `>0` mới ghi, ngược lại **NULL** (không làm tròn 0 → tránh vi phạm FK). UPDATE: **pin bất biến** theo `before` (dù FE gửi lên) |
| 4 | `shiten_id` | 支店ID | ID chi nhánh | 6 | CREATE: ưu tiên `session.shiten_id` > `dto.shiten_id` > NULL |
| 5 | `kumiaiin_code` | 組合員コード | Mã xã viên | 7 | Cho phép chuỗi rỗng. Là **khoá phụ** khi Excel取込 UPDATE dò dòng đích |
| 6 | `dokusya_shubetsu` | 購読種別 | Loại đăng ký (1紙版/2電子版/3併読) | 8 | CREATE: **cấm 3 (併読)** — do hệ thống ngoài quản lý. UPDATE: **pin bất biến** theo `before` |
| 7 | `tetsuzuki_shurui` | 手続種類 | Loại thủ tục (0解約/1新規) | 9 | CREATE: cấm 0. Batch giải ước đặt 0. Tái đăng ký đặt lại 1 |
| 8 | `denshi_dokusya_shubetsu` | 電子版読者種別 | Loại độc giả điện tử (0 miễn phí/1 trả phí) | 10 | CREATE UI: luôn `null`. UPDATE: **giữ nguyên** `before` (không nằm trong form). Chỉ inbound sync đặt (`member_type`) |
| 9 | `shimei_sei` | 氏名（姓） | Họ | 11 | Sửa được ở cả create + update (bỏ name-pin từ 2026-07) |
| 10 | `shimei_mei` | 氏名（名） | Tên | 12 | như trên |
| 11 | `shimei_kana_sei` | 氏名かな（姓） | Họ (kana) | 13 | như trên |
| 12 | `shimei_kana_mei` | 氏名かな（名） | Tên (kana) | 14 | như trên |
| 13 | `dokusya_busu` | 購読部数 | Số bản đăng ký | 15 | `>0` bắt buộc trừ khi 解約. **電子版 cố định = 1**. Dòng đặt lịch dừng + dòng giải ước ép **= 0**. ⚠️ **Trường kích hoạt 増減報告** |
| 14 | `yubin_no` | 郵便番号 | Mã bưu chính | 16 | ⚠️ Địa chỉ độc giả — tính 増減 khi `haitatsu_same_flg=TRUE` |
| 15 | `todofuken_code` | 都道府県コード | Mã tỉnh | 17 | như trên |
| 16 | `shikuchoson` | 市町村郡 | Quận/huyện/thành phố | 18 | như trên |
| 17 | `chome_banchi` | 丁目番地 | Số nhà/đường | 19 | như trên |
| 18 | `tatemono_mei` | マンション名等 | Toà nhà/căn hộ | 20 | như trên |
| 19 | `renrakusaki_1` | 連絡先１ | Liên hệ 1 | 21 | Không ảnh hưởng 増減 |
| 20 | `renrakusaki_2` | 連絡先２ | Liên hệ 2 | 22 | Không ảnh hưởng 増減 |
| 21 | `email` | メールアドレス | Email | 23 | **電子版/併読: bắt buộc + duy nhất** trong phạm vi `ja_id` (loại chính nó khi update). 紙版: tuỳ chọn, cho trùng |
| 22 | `mail_magazine_flg` | メールマガジン | Nhận bản tin (0/1) | 24 | 紙版 không chọn → lưu **NULL** (không làm tròn 0) |
| 23 | `birth_year` | 生年 | Năm sinh | 25 | NULL nếu trống |
| 24 | `gender` | 性別 | Giới tính (1男/2女/9回答しない) | 26 | Inbound: `sex` đảo mã nữ + không rõ → 9 |
| 25 | `haitatsu_same_flg` | 配達先情報指定 | Địa chỉ giao = địa chỉ độc giả | 27 | Quyết định **địa chỉ giao hiệu lực** dùng cho 増減. ⚠️ Đổi cờ này → 増減 = TRUE |
| 26–36 | `haitatsu_*` (11 cột) | 配達先… | Địa chỉ/tên/điện thoại nơi giao | 28–38 | Chỉ 5 cột địa chỉ (`yubin_no`, `todofuken_code`, `shikuchoson`, `chome_banchi`, `tatemono_mei`) tham gia 増減 khi `haitatsu_same_flg=FALSE`. Tên/điện thoại giao **không** được inbound ghi đè (view không có nguồn) |
| 37 | `hanbaiten_id` | 販売店ID | ID cửa hàng phát hành | 39 | ⚠️ **Trường kích hoạt 増減報告**. Là trường **duy nhất** mà 一括置換 (SCR-015) sửa |
| 38 | `tanka_id` | 単価ID | ID đơn giá (chỉ `tanka_type=1`) | 40 | Chỉ sửa được ở luồng **承認** (approve) ngoài create/update. Inbound sync **không** đụng (draft để `null`, nếu diff sẽ ghi đè mất giá trị thật) |
| 39 | `yubin_kubun` | 郵送区分 | Phân loại gửi bưu điện (0/1) | 41 | Mặc định `'0'` |
| 40 | `shiharai_hoho` | 支払方法 | Phương thức thanh toán (1–6, 9) | 42 | `=6` (thẻ tín dụng) + 電子版 → **bản ghi chỉ đọc** (cấm sửa/dừng/xoá/thay thế). Inbound: chỉ ghi khi CREATE |
| 41 | `dokusyaryo_shiharai_cycle` | 購読料支払サイクル | Chu kỳ thanh toán (số tháng) | 43 | NULL nếu trống |
| 42 | `bank_branch_code` | 引落口座支店コード | Mã chi nhánh NH ghi nợ | 44 | **Suy ra ngược** từ `bank_shiten_id` qua `m_shiten` — chỉ khi `shiharai_hoho=1`; không tìm thấy → 400 `bank_shiten_id` |
| 43 | `bank_branch_name` | 引落口座支店名 | Tên chi nhánh NH | 45 | như trên |
| 44 | `hikiotoshi_yokin_shubetsu` | 引落口座貯金種目 | Loại tài khoản (1普通/2当座) | 46 | NULL nếu trống |
| 45 | `hikiotoshi_koza_no` | 引落口座番号 | Số tài khoản | 47 | Cho phép rỗng |
| 46 | `hikiotoshi_koza_meigi` | 引落口座名義 | Chủ tài khoản | 48 | Cho phép rỗng |
| 47 | `dokusyaso_bunrui` | 購読者層分類 | Phân loại tầng độc giả (CSV) | 49 | **電子版/併読: bắt buộc ≥1 giá trị** |
| 48 | `nogyosya_bunrui` | 農業者分類 | Phân loại nông dân (CSV) | 50 | — |
| 49 | `shoki_dokusya_kaishi_date` | 初回購読開始日 | Ngày bắt đầu đăng ký **lần đầu** | 51 | CREATE: `= dokusya_kaishi_date`. **BẤT BIẾN vĩnh viễn** — update pin theo `before`, tái đăng ký cũng giữ nguyên, inbound loại khỏi diff |
| 50 | `dokusya_kaishi_date` | 購読開始日 | Ngày bắt đầu đăng ký (hiện hành) | 52 | CREATE 紙版: **bắt buộc tương lai**; 電子版: cho phép hôm nay. UPDATE: **pin bất biến** — TRỪ 再購読 (bắt buộc tương lai) |
| 51 | `dokusya_chushi_date` | 購読中止日 | Ngày dừng đăng ký | 53 | **PUT /dokusya bị cấm** (`@IsEmpty` → 400). Chỉ đặt qua `POST /dokusya/:id/stop`. `recomputeMaster` **ghi đè riêng** ngày này từ dòng đặt lịch tương lai để hiển thị ngay ở SCR-011/014 |
| 52 | `joho_henko_tekiyo_date` | 読者情報変更適用日 | Ngày áp dụng thay đổi | 54 | CREATE: `= dokusya_kaishi_date`. UPDATE `today`: **ép = hôm nay** (không tin giá trị client). UPDATE `reserved`: bắt buộc **tương lai**. Loại khỏi diff |
| 53 | `seikyu_kaishi_month` | 請求開始月 | Tháng bắt đầu tính phí (YYYYMM) | 55 | Rỗng ⇒ 電子版 **không được đặt lịch dừng** (chưa bắt đầu thu phí) |
| 54 | `biko` | 備考 | Ghi chú | 56 | ⚠️ Khi 取消, `biko` của **dòng bị huỷ** bị **ghi đè bằng lý do huỷ** (`markTorikeshi`) |
| 55 | `rireki_no` | 履歴No | Số hiệu lịch sử hiện hành | 3 | Master trỏ tới dòng lịch sử hiệu lực. CREATE: DB DEFAULT 1 (không nằm trong payload) |
| 56 | `denshi_shonin_status` | 電子申込承認ステータス | Trạng thái duyệt (0待ち/1承認/2否認) | 69 | CREATE: 紙版 → **NULL**; 電子版/併読 → **1 (đã duyệt)** vì là thao tác nhân viên. UPDATE: **giữ nguyên** (bị xoá khỏi payload); 紙版 chuẩn hoá về NULL. Chỉ approve/reject chuyển trạng thái |
| 57 | `denshi_kaiin_id` | 電子版会員ID | ID hội viên bên denshiban | **—** | Master-only. Đặt bởi phản hồi `create` của denshiban (outbound) hoặc khớp inbound. UNIQUE bộ phận (`NOT NULL AND deleted_at IS NULL`) |
| 58 | `honshi_kodoku_flg` | 本紙購読フラグ | Có đăng ký bản giấy | **—** | Master-only. Từ `users.subscribe_flg`. Xem **cảnh báo §10-①** |
| 59 | `deleted_at` | 削除フラグ | Xoá mềm | **—** | Chỉ SCR-014 delete. **Không lan sang lịch sử** |
| 60 | `created_at` | 作成日時 | Thời điểm tạo | 70 (riêng) | Master giữ của riêng; rireki có `created_at` riêng (thời điểm ghi sổ) |
| 61 | `created_by` | 作成者 | Người tạo | 71 (riêng) | `account_id` / `'DENSHIBAN_SYNC'` / `'batch'` |
| 62 | `updated_at` | 更新日時 | Thời điểm cập nhật | **—** | Tự động bởi `@UpdateDateColumn` khi recompute UPDATE master |
| 63 | `updated_by` | 更新者 | Người cập nhật | **—** | **Không** nằm trong recompute → mọi luồng phải `manager.update(Dokusya, …, {updatedBy})` **thủ công** sau `applyChange` |

---

## 3. 9 cột chỉ có ở `t_dokusya_rireki` — cách tính

| # | Cột | 項目名 | Tiếng Việt | Cách tính |
|---|---|---|---|---|
| 1 | `dokusya_rireki_id` | 購読者履歴ID | PK lịch sử | IDENTITY. `buildRirekiRow` **xoá** PK + `created_at` khỏi bản clone để INSERT (không thành UPDATE) |
| 57 | `henko_riyu` | 変更理由 | Nhãn thao tác | `''` (UI create/update) / `'Excel取込'` / `'販売店一括置換'` / `'電子版連携'` / `'再購読'` / `'取消'`. **Không phải lý do tự do** |
| 58 | `saishin_data_flg` | 最新データフラグ | Cờ dòng hiện hành | Luôn ghi `false` khi build; **chỉ** `recomputeMaster → setSaishinFlags` được quyền set `TRUE` (giữ invariant §0.3) |
| 59 | `zougen_hokoku_flg` | 増減報告フラグ | Cờ đối tượng báo cáo tăng/giảm | `computeZougen`: CREATE → TRUE. UPDATE → TRUE khi đổi **số bản** hoặc **cửa hàng** hoặc **cờ địa chỉ giao** hoặc **địa chỉ giao hiệu lực**. Giải ước/đặt lịch dừng/tái đăng ký → luôn TRUE. Excel取込 có dữ liệu giao → `forceZougen=true` |
| 60 | `shinki_flg` | 新規フラグ | Cờ đăng ký mới | `= !before` (dòng đầu tiên) hoặc dòng 再購読. **Là mốc phân chia lifecycle** (§0.2) |
| 61 | `kaiyaku_flg` | 解約フラグ | Cờ giải ước | **Phase 1 (đặt lịch qua UI) = FALSE**; chỉ **Phase 2 (batch ngày đến hạn)** đặt TRUE. Đây chính là điều kiện kích hoạt của batch |
| 62–68 | `zenkai_*` (7 cột) | 前回… | Giá trị **lần trước** | `fillZenkai(row, before)`: `zenkai_hanbaiten_id`/`zenkai_dokusya_busu` copy trực tiếp; 5 cột địa chỉ lấy **địa chỉ giao hiệu lực của dòng trước** (theo `before.haitatsu_same_flg`). Dòng đầu + dòng 再購読 → **toàn bộ NULL** |
| 72 | `torikeshi_flg` | 取消フラグ | Cờ huỷ (赤伝) | TRUE trên **cả 2 dòng**: dòng sai + dòng đối ứng. Dòng TRUE bị loại khỏi mọi truy vấn: recompute, cascade, báo cáo 増減, tìm kiếm, hiển thị |

---

## 4. Ma trận nghiệp vụ × tác động dữ liệu

| Nghiệp vụ | Màn hình / API | `t_dokusya` | `t_dokusya_rireki` | Đồng bộ denshiban |
|---|---|---|---|---|
| Tạo mới | SCR-011 `POST /dokusya` | INSERT (vỏ) → recompute toàn bộ cột | **+1 dòng** `rireki_no=1`, `shinki=TRUE`, `zougen=TRUE`, `zenkai_*=NULL` | `create` (chỉ 電子版, trong TX) → nhận `denshi_kaiin_id` |
| Sửa thông tin | SCR-011 `PUT /dokusya/:id` | Recompute (chỉ đổi nếu `joho <= hôm nay`) + stamp `updated_by` | **+1 dòng** hoặc **0 dòng** nếu không có thay đổi nghiệp vụ | `update` (diff), fallback `create` nếu chưa có `denshi_kaiin_id` |
| Tái đăng ký | SCR-011 PUT (解約→新規) | Recompute → **về trạng thái đang đăng ký ngay** (fallback lifecycle) | **+1 dòng** `shinki=TRUE`, `kaiyaku=FALSE`, `chushi=NULL`, `zenkai_*=NULL`, `shoki` giữ nguyên | `update` |
| Dừng đăng ký (Phase 1) | SCR-014 `POST /dokusya/:id/stop` | Không đổi trạng thái, **nhưng** `dokusya_chushi_date` được ghi đè hiển thị ngay | **+1 dòng đặt lịch**: `busu=0`, `chushi=ngày dừng`, `joho=ngày dừng` (tương lai), `kaiyaku=FALSE`, `saishin=FALSE`, `zougen=TRUE` | `cancel` với `cancel_ym = YYYYMM` |
| Giải ước (Phase 2) | Batch `dokusya-apply-due` ① | Recompute → sang trạng thái giải ước | **+1 dòng thật**: `tetsuzuki=0`, `kaiyaku=TRUE`, `busu=0`, `zougen=TRUE`, `created_by='batch'`. 電子版 lấy `joho = chushi + 1 ngày` | — |
| Áp dụng đặt lịch | Batch `dokusya-apply-due` ② | Recompute **toàn bộ** độc giả theo ngày hôm nay | Chỉ đổi `saishin_data_flg` — **không thêm dòng** | — |
| Duyệt / Từ chối | SCR-011 `PUT …/approve|reject` | UPDATE trực tiếp `denshi_shonin_status` (+ `tanka_id` khi duyệt) | **UPDATE tại chỗ** dòng `saishin=TRUE` — **không thêm dòng** | `approve` / `unapprove` |
| Huỷ lịch sử (取消) | SCR-013 `POST …/rireki/:id/torikeshi` | Recompute trên các dòng còn lại | Dòng đích: `torikeshi=TRUE` + `biko=lý do`. **+1 dòng đối ứng** hoán đổi giá trị ↔ `zenkai_*`, `torikeshi=TRUE` | — |
| Xoá | SCR-014 `DELETE /dokusya/:id` | `deleted_at = now()` | **Không đụng** — lịch sử tồn tại vĩnh viễn | — |
| Thay thế hàng loạt | SCR-015 `POST /dokusya/replace-hanbaiten` | Recompute từng độc giả + stamp `updated_by` hàng loạt | **+1 dòng / độc giả**, chỉ đổi `hanbaiten_id`, `zougen=TRUE`, `henko_riyu='販売店一括置換'` | — (chỉ 紙版 mới được thay thế) |
| Excel 取込 NEW | SCR-016 `POST /dokusya/import` | như Tạo mới | **+1 dòng**, `joho = ngày bắt đầu thực tế` (không phải hôm nay) | — |
| Excel 取込 UPDATE | SCR-016 | Recompute + stamp `updated_by` | **+1 dòng** chỉ với **cột được chọn** (`selected_columns`); cột không chọn/để trống → giữ giá trị dòng trước | — |
| Đồng bộ inbound | Batch `dokusya-sync` (10 phút/lần) | CREATE: INSERT + stamp `denshi_kaiin_id`. UPDATE: recompute + `updated_by='DENSHIBAN_SYNC'` | **+1 dòng / thay đổi**, `henko_riyu='電子版連携'`, `joho = ngày chạy` | **Không bao giờ gửi ngược** (tránh vòng lặp) |

---

## 5. Chi tiết từng nghiệp vụ

### 5.1 Tạo mới (SCR-011 `POST /api/v1/dokusya`)

**Chuỗi kiểm tra (thứ tự thực thi):**

| # | Kiểm tra | Lỗi |
|---|---|---|
| 1 | `assertCodeMasterValues` — giá trị m_code hợp lệ | VALIDATION_ERROR |
| 2 | `dokusya_shubetsu = 3 (併読)` | Cấm — do hệ thống ngoài quản lý |
| 3 | `tetsuzuki_shurui = 0 (解約)` | Cấm ở màn tạo mới |
| 4 | `dokusya_busu <= 0` | Cấm; 電子版 phải `= 1` |
| 5 | `assertDigitalPaymentMethod` | Phương thức thanh toán hợp lệ cho 電子版 |
| 6 | `joho_henko_tekiyo_date` quá khứ | Cấm |
| 7 | `dokusya_kaishi_date`: 紙版 **> hôm nay**, 電子版 **>= hôm nay** | — |
| 8 | `collectChushiViolations` — ngày dừng >= ngày bắt đầu, không quá khứ | — |
| 9 | `assertShubetsuFlag` — tài khoản phải có `paper_flg` / `denshi_flg` | 403 |
| 10 | `ja_id` từ session ≠ 0 | 400 |
| 11 | `assertFkScope` (Layer 4) — mọi FK trong body thuộc đúng JA | 400/403 |
| 12 | email bắt buộc + duy nhất (電子版/併読); 読者属性 bắt buộc | 400 |
| 13 | `resolveBankBranch` — tra ngược `m_shiten` khi `shiharai_hoho=1` | 400 |

**Giá trị được đặt trong transaction:**

```
joho_henko_tekiyo_date = dokusya_kaishi_date       ← không phải hôm nay
shoki_dokusya_kaishi_date = dokusya_kaishi_date
denshi_shonin_status = NULL (紙版) | 1 承認済 (電子版)
denshi_dokusya_shubetsu = NULL
rireki_no = DB DEFAULT 1
created_by = updated_by = session.account_id
→ applyChange(CREATE) → rireki #1: shinki=TRUE, zougen=TRUE, kaiyaku=FALSE, zenkai_*=NULL
→ syncDenshibanCreate → denshi_kaiin_id (nếu 電子版, không phải đơn giá campaign)
→ auditLog.logCreate (cùng TX)
```

> Ngày bắt đầu tương lai: `recomputeMaster(hôm nay)` không tìm thấy dòng hiệu lực → **fallback về dòng 新規** → master hiển thị ngay, `saishin_data_flg` vẫn TRUE.

### 5.2 Sửa (SCR-011 `PUT /api/v1/dokusya/:id`)

**Hai chế độ (`change_mode`)** — mặc định `reserved` để tương thích ngược:

| Chế độ | `joho` | Giới hạn |
|---|---|---|
| `today` (当日変更) | **Ép = hôm nay** (bỏ qua giá trị client) | 紙版: **cấm** đổi 12 trường ảnh hưởng báo cáo (`REPORT_FIELD_PAIRS`: số bản, cửa hàng, 5 cột địa chỉ độc giả, 5 cột địa chỉ giao) → buộc dùng chế độ đặt lịch. 電子版: cho phép mọi trường |
| `reserved` (予約変更) | Bắt buộc, **phải > hôm nay** | 電子版: **cấm hoàn toàn** (`assertDigitalChangeModeAllowed`) — điện tử luôn phản ánh ngay |

**Các trường bị pin (bất biến, ghi đè giá trị client):**

| Trường | Pin về |
|---|---|
| `dokusya_shubetsu` | `before` — đổi loại là nghiệp vụ chuyển đổi riêng |
| `kanri_shiten_id` | `before` (pin **sau** FK guard để không double-validate) |
| `dokusya_kaishi_date` | `before` — trừ 再購読 |
| `shoki_dokusya_kaishi_date` | `before` |
| `denshi_dokusya_shubetsu` | `before` |
| `denshi_shonin_status` | Bị xoá khỏi payload (giữ nguyên); 紙版 → NULL |
| `dokusya_chushi_date` | Bị DTO chặn (`@IsEmpty`) → 400 |

**Chặn cứng:** bản ghi chỉ đọc = `併読(3)` **hoặc** `電子版(2) + クレカ(6)` → 403 `DOKUSYA_READ_ONLY`.

**Ràng buộc dải ngày:** `dokusya_kaishi_date <= joho <= ngày dừng đã đặt lịch`.
Mốc trên lấy từ **dòng lịch sử liền trước `joho`** (không lấy master) — vì master không mang ngày dừng tương lai, dùng master sẽ để lọt việc chèn thay đổi sau ngày dừng.

**Trường hợp không có thay đổi nghiệp vụ nào:** `diffChangedFields` trả mảng rỗng → `splitEvents` trả `[]` → **không sinh dòng lịch sử**, nhưng `updated_by` vẫn được stamp và audit log vẫn ghi `UPDATE`.

### 5.3 Tái đăng ký 再購読 (nhánh trong PUT)

Kích hoạt khi `before.tetsuzuki_shurui = 0 (解約)` **và** `dto.tetsuzuki_shurui = 1 (新規)`.

```
kaishi mới bắt buộc > hôm nay
joho = kaishi mới
tetsuzuki = 1, kaiyaku_flg = FALSE, shinki_flg = TRUE
dokusya_chushi_date = NULL
zougen_hokoku_flg = TRUE (tái gia nhập = tăng)
shoki_dokusya_kaishi_date = giữ nguyên của before
zenkai_* = TOÀN BỘ NULL  ← cố ý giống hệt dòng tạo mới đầu tiên
```

Dòng này mở **lifecycle mới** → ngày dừng của lifecycle cũ tự động biến mất khỏi master.

### 5.4 Dừng đăng ký — kiến trúc 2 pha

**Phase 1 — UI đặt lịch** (`POST /dokusya/:id/stop`, SCR-014):

| Kiểm tra | 紙版 | 電子版 |
|---|---|---|
| Bản ghi chỉ đọc | 403 | 403 |
| Đã có lịch dừng (`hasActiveKaiyaku`) | Cấm đặt trùng — phải huỷ ở màn lịch sử trước | như trái |
| `seikyu_kaishi_month` rỗng | — | **Cấm** — "chưa bắt đầu thu phí" |
| Ngày dừng | `>= ngày bắt đầu`, `> hôm nay`, `> ngày áp dụng cuối cùng` | Tháng chọn `>= 請求開始月` và `>= tháng hiện tại`; ngày = cuối tháng (FE làm tròn) |

Dòng được ghi (`buildKaiyakuReservationRow`) chỉ ghi đè **tối thiểu** — phần còn lại kế thừa từ dòng trước:
`busu=0`, `chushi=ngày dừng`, `joho=ngày dừng`, `kaiyaku_flg=FALSE`, `saishin=FALSE`, `shinki=FALSE`, `zougen=TRUE`.

> `kaiyaku_flg=FALSE` là **cố ý**: đó chính là điều kiện `!kaiyaku_flg` để batch Phase 2 nhận diện việc cần làm.

**Phase 2 — Batch ngày đến hạn** (`insertKaiyaku`):

```sql
-- điều kiện quét (từ master, vì recompute đã đẩy ngày dừng lên master)
紙版(1)   : dokusya_chushi_date <= hôm nay
電子版(2) : dokusya_chushi_date <= hôm qua AND shiharai_hoho <> 6 (クレカ)
併読(3) / 電子版クレカ : loại trừ
```

Dòng thật: `tetsuzuki=0`, `kaiyaku_flg=TRUE`, `busu=0`, `zougen=TRUE`, `henko_riyu=''`, `created_by='batch'`, `joho = chushi` (紙版) / `chushi + 1` (電子版). Idempotent — bỏ qua nếu đã `kaiyaku_flg`.

### 5.5 Duyệt / Từ chối (SCR-011)

**Ngoại lệ duy nhất không đi qua `applyChange`.**

| | Giá trị |
|---|---|
| Điều kiện | `denshi_shonin_status` phải đang `= 0 (承認待ち)`, nếu không → `InvalidDokusyaStatus` |
| Quyền | Yêu cầu `denshi_flg` trên tài khoản |
| Approve | `denshi_shonin_status = 1`; **được phép sửa `tanka_id`** (qua `fetchFkInJa` kiểm tra cùng JA) |
| Reject | `denshi_shonin_status = 2` |
| Ghi | `UPDATE t_dokusya` + `UPDATE t_dokusya_rireki WHERE saishin_data_flg = TRUE` — **sửa tại chỗ, không thêm dòng lịch sử** |
| Lý do | Trạng thái phê duyệt là chuyển trạng thái quy trình *tức thời*, không phải "thay đổi thông tin có ngày áp dụng" |
| Đồng bộ | `approve` / `unapprove` sang denshiban |

### 5.6 Huỷ lịch sử 取消 (SCR-013)

**Điều kiện được huỷ (`canTorikeshi`) — cả 4 phải đúng:**

1. `dokusya_shubetsu = 1 (紙版)` — điện tử đã đồng bộ tức thời sang hệ ngoài nên không huỷ được
2. `shinki_flg = FALSE` **và** `torikeshi_flg = FALSE`
3. `joho_henko_tekiyo_date > hôm nay (JST)` — đã đến ngày áp dụng thì không huỷ được
4. Là **dòng cuối** của chuỗi `(joho, rireki_no)` trong các dòng chưa huỷ (LIFO)

**Tác động:**

```
dòng đích  : torikeshi_flg = TRUE, biko = lý do huỷ   ← ⚠ ghi đè ghi chú gốc
dòng mới   : buildCounterRow — hoán đổi 7 cặp (giá trị hiện tại ↔ zenkai_*)
             rireki_no = MAX+1, joho = joho của dòng đích, torikeshi_flg = TRUE
             henko_riyu = '取消', biko = lý do, saishin = FALSE
             nếu dòng đích là 解約 → khôi phục tetsuzuki=1, kaiyaku_flg=FALSE
→ recomputeMaster(hôm nay) trên các dòng còn lại
```

### 5.7 Thay thế cửa hàng hàng loạt (SCR-015)

| Bước | Nội dung |
|---|---|
| Quyền | `assertAnyDokusyaFlag` |
| Ngày áp dụng | 紙版: **bắt buộc tương lai**. **電子版: cấm hoàn toàn màn hình này** (`ACSMS-MSG-015-009`) — điện tử không có cửa hàng phát hành |
| Kiểm tra ứng viên | Thiếu id → 404; ngoài phạm vi → **403** (không mask 404 vì id do client chỉ định); đã cùng cửa hàng đích → `SAME_HANBAITEN`; 併読 / 電子版クレカ → `INELIGIBLE_DOKUSYA` (kèm danh sách chi tiết) |
| Ngày áp dụng gộp | `>= ngày bắt đầu muộn nhất` **và** `< ngày dừng sớm nhất` trong toàn bộ ứng viên |
| Cửa hàng đích | Tồn tại + cùng JA (`assertJaScopeViolation`) |
| Ghi | Vòng lặp: `lockDokusyaRow` → `applyChange(UPDATE, values={hanbaitenId}, johoDate=ngày áp dụng, reason='販売店一括置換')`. Một `UPDATE … SET updated_by` hàng loạt ở cuối. Toàn bộ trong **1 transaction** |
| Kết quả | `{ total_count, replaced_count, rireki_count, new_hanbaiten_id, applied_at }` |

Vì chỉ `hanbaiten_id` nằm trong `values`, mỗi dòng lịch sử sinh ra có `zougen_hokoku_flg=TRUE` (cửa hàng là trường kích hoạt) và `zenkai_hanbaiten_id` = cửa hàng cũ → phiếu 増減連絡票 lấy đúng cặp cũ/mới.

### 5.8 Excel 取込 (SCR-016)

| | NEW | UPDATE |
|---|---|---|
| Khoá dò dòng | — | `dokusya_id` **hoặc** `kumiaiin_code` trong cùng `ja_id` |
| `joho` | `= ngày bắt đầu thực tế` trong file (dữ liệu tồn kho), fallback hôm nay | `= joho_henko_tekiyo_date` trong file, fallback hôm nay |
| Cột ghi | Toàn bộ | **Chỉ `selected_columns`**; cột không chọn → bỏ khỏi `values` → carry-forward. FK để trống → giữ giá trị cũ (`optionalFk`) |
| Cột cấm sửa | — | `IMPORT_EDIT_IMMUTABLE_COLUMNS` + `dokusya_id` |
| `haitatsu_same_flg` | Suy ra: có dữ liệu giao → `FALSE` | Ưu tiên cột chỉ định; nếu không có, suy ra từ dữ liệu giao |
| 増減 | mặc định TRUE (dòng mới) | `forceZougen = có dữ liệu giao` |
| `henko_riyu` | `'Excel取込'` | `'Excel取込'` |

### 5.9 Xoá (SCR-014 `DELETE`)

1. Tồn tại + DataScope (mask 404) → 2. Chặn bản ghi chỉ đọc (403) → 3. `assertShubetsuFlag` → 4. **FK guard**: `SELECT COUNT(*) FROM t_koza_furikae WHERE dokusya_id = $1` > 0 → **409 CONFLICT** → 5. `deleted_at = now()` + `updated_by`, audit `DELETE` cùng TX.

> `t_koza_furikae` **không có** cột `deleted_at` — cố ý không thêm `AND deleted_at IS NULL` (sẽ 500 ở production).
> Lịch sử **không** bị xoá mềm theo.

---

## 6. Đồng bộ denshiban — chiều RA (outbound, cloud → 電子版)

### 6.1 Cổng lọc (gate) — 2 tầng

| Tầng | Điều kiện | Nơi kiểm |
|---|---|---|
| 1 | `dokusya_shubetsu = 2 (電子版 thuần)` — 紙版(1) và 併読(3) **không** gửi | `isDenshibanSubscriber` trong `sendNow` |
| 2 | Đơn giá **không phải campaign** (`m_tanka.campaign_flg`) | `resolveDenshibanSyncGate` trong `DokusyaService.denshibanApiFor` — **chỉ ở đây**, `sendNow` không kiểm lại |

> Mọi caller **bắt buộc** đi qua `denshibanApiFor()`; gọi thẳng `sendNow` sẽ lọt hợp đồng campaign.

### 6.2 Điểm gọi và chế độ

| Nghiệp vụ | `mode` | Tham số thêm |
|---|---|---|
| Tạo mới | `create` | — → phản hồi trả `id` → ghi vào `denshi_kaiin_id` |
| Sửa / Tái đăng ký | `update` | `before` (gửi **diff**). Nếu `denshi_kaiin_id` NULL → **fallback sang `create`** để cấp ID |
| Dừng đăng ký | `cancel` | `cancelYm = YYYYMM` của ngày dừng |
| Duyệt | `approve` | — |
| Từ chối | `unapprove` | — |

### 6.3 Đặc tính giao dịch

- Gọi **bên trong transaction, trước COMMIT**. Denshiban trả `statusCode != '0'` → ném ngoại lệ → **rollback toàn bộ** (dữ liệu bên kia từ chối thì bên này cũng không lưu).
- HTTP **luôn 200** — thành/bại chỉ nằm trong `statusCode` của body.
- Mã hoá AES-256-GCM: `IV(12B) + ciphertext + AuthTag(16B)` → Base64 → `{ "payload": "..." }`. Timeout 15s. Replay window 300s.
- ⚠️ **Dual write, không phải distributed transaction**: nếu COMMIT lỗi *sau khi* denshiban đã trả thành công (`create` không idempotent) → bên kia có hội viên mà cloud không có → phải đối soát tay.

---

## 7. Đồng bộ denshiban — chiều VÀO (inbound, 電子版 → cloud)

Batch `dokusya-sync` (EventBridge → ECS RunTask, 10 phút/lần, single-shot; **không** dùng `@nestjs/schedule`).

### 7.1 Phạm vi lấy dữ liệu

```sql
INCLUDE: collecting = '1'  OR  (treatment = 1 AND payment_id = 6)   -- 口座振替 chưa gắn cờ
EXCLUDE: COALESCE(campagna_flg, 0) = 1                              -- hội viên campaign
-- KHÔNG lọc deleted_at: hội viên đã huỷ (status=9) vẫn phải chảy vào để ghi nhận giải ước
```

> Cột bên denshiban viết là **`campagna_flg`** (không phải `campaign_flg`) — đã xác nhận với khách hàng, **không được "sửa chính tả"**.

### 7.2 Cơ chế

1. Mỗi dòng **1 transaction riêng** → 1 dòng lỗi không chặn cả mẻ (`failed++`, log, tiếp tục).
2. `assemble` → `DokusyaDraft` (cloud-shape) → khớp `t_dokusya` theo **`denshi_kaiin_id`**.
3. `classifyInbound(draft, existing)` → `create` / `update(chỉ cột khác)` / `skip`.
4. Ghi bằng `applyChange` + audit. **Không bao giờ gọi `sendNow`** (tránh vòng lặp).

So sánh thực hiện ở **cloud-shape** (draft vs `t_dokusya`), không phải users-shape — các phép chuyển đổi mất mát (`sex ''↔9`, code↔label) triệt tiêu **đối xứng** ở cả hai vế nên không sinh diff giả.

### 7.3 Cột được so sánh (`COMPARABLE_FIELDS` — 33 cột)

Phân loại, tên, địa chỉ, thuộc tính, địa chỉ giao (chỉ 6 cột), chu kỳ/tháng thu phí, `dokusya_kaishi_date`, `dokusya_chushi_date`, `biko`, `honshi_kodoku_flg`.

### 7.4 Cột **cố ý loại trừ** (nếu đưa vào sẽ **mất dữ liệu**)

| Cột | Lý do loại |
|---|---|
| `ja_id`, `kanri_shiten_id`, `hanbaiten_id` | FK do cloud sở hữu, chỉ resolve lúc CREATE — diff sẽ ghi đè quyền sở hữu tenant mỗi lần chạy |
| `tanka_id` | Draft luôn `null` → diff sẽ **xoá đơn giá thật** |
| `shoki_dokusya_kaishi_date` | Bất biến vĩnh viễn |
| `shiten_id`, `kumiaiin_code`, `dokusya_busu`, `yubin_kubun`, `bank_*`, `hikiotoshi_*` | View không có nguồn / hằng số cloud |
| `haitatsu_shimei_*`, `haitatsu_renrakusaki_*` | View không có tên/điện thoại người nhận → sẽ xoá dữ liệu nhân viên nhập tay |
| `shiharai_hoho` | Chỉ ghi lúc CREATE — `payment_id` rỗng sẽ ghi đè NULL; chính sách còn chờ chốt |
| `rireki_no`, `joho_henko_tekiyo_date`, `denshi_kaiin_id` | Sổ sách của cloud / khoá khớp |

### 7.5 Giá trị hằng khi CREATE từ inbound

`kumiaiin_code=''`, `dokusya_busu=1` (1 hợp đồng = 1 bản), `tanka_id=null`, `yubin_kubun='0'`, `shiten_id=null`, ngân hàng để rỗng, `created_by = updated_by = 'DENSHIBAN_SYNC'`, `henko_riyu='電子版連携'`, `joho = ngày chạy batch`.
Sau `applyChange`, `denshi_kaiin_id` được stamp riêng (cột master-only).

---

## 8. Batch — `dokusya-apply-due` (5:00 JST)

Gộp 2 pha **trong 1 batch để đảm bảo thứ tự**:

| Pha | Service | Việc |
|---|---|---|
| ① | `DokusyaKaiyakuService` | Chốt giải ước cho các độc giả đã đến ngày dừng (§5.4 Phase 2) |
| ② | `DokusyaRecomputeService` | `recomputeMaster(mọi độc giả, hôm nay)` — keyset `dokusya_id > cursor`, chunk **500** dòng, mỗi dòng 1 transaction |

Pha ② **không thêm dòng lịch sử nào** — chỉ chuyển `saishin_data_flg` và cập nhật cột master. Đây là cơ chế "thay đổi đặt lịch tự động có hiệu lực khi đến ngày".
Cả 2 pha **idempotent**, lỗi 1 dòng không dừng cả mẻ (`ok`/`ng` được đếm và log).

---

## 9. Bảng ràng buộc chéo (guard) theo vai trò dữ liệu

| Ràng buộc | Giá trị | Áp dụng cho |
|---|---|---|
| **Bản ghi chỉ đọc** | `併読(3)` OR (`電子版(2)` AND `クレカ(6)`) | Sửa, Dừng, Xoá, Thay thế hàng loạt → 403 `DOKUSYA_READ_ONLY` (vẫn cho **xem**) |
| **電子版 chỉ đổi trong ngày** | `change_mode` phải là `today` | PUT (trừ 再購読) |
| **紙版 cấm đổi trường báo cáo trong ngày** | 12 trường `REPORT_FIELD_PAIRS` | PUT chế độ `today` |
| **電子版 số bản = 1** | trừ khi 解約 | Create + Update + Excel取込 |
| **email duy nhất** | phạm vi `ja_id`, chỉ 電子版/併読 | Create + Update |
| **DataScope** | `applyBranchScope` + `applyShitenScope`; ngoài phạm vi → **404 mask** (URL) / **403** (id do client liệt kê) | Mọi truy vấn |
| **Layer-4 FK guard** | `fetchFkInJa` — FK trong body phải cùng JA | Create + Update + Approve |
| **Chống race `rireki_no`** | `lockDokusyaRow` (`FOR UPDATE`) trước khi cấp số | UI update, stop, 取消, 一括置換, Excel取込 UPDATE |
| **Audit + DML cùng TX** | `logCreate/logUpdate/logDelete` nhận `manager` | Mọi ghi |
| **Audit lỗi ngoài TX** | `logError` **không** nhận `manager` | Mọi `catch` |

---

## 10. Điểm cần lưu ý / rủi ro đã phát hiện

**① `honshi_kodoku_flg` có trong diff inbound nhưng KHÔNG phải cột của `t_dokusya_rireki`** — cần xác minh

- `COMPARABLE_FIELDS` liệt kê `honshiKodokuFlg` ([denshiban-inbound-diff.ts:76](apps/backend/src/modules/denshiban/inbound/denshiban-inbound-diff.ts#L76)) và so sánh với **master**.
- Nhưng `t_dokusya_rireki` **không có** cột này → trên nhánh UPDATE, giá trị chỉ chảy vào `applyChange.values` → dòng lịch sử → bị bỏ khi persist → `mapRirekiToMaster` không có gì để ghi ngược về master.
- **Hệ quả nghi ngờ**: nếu `users.subscribe_flg=1` mà `t_dokusya.honshi_kodoku_flg=false`, mỗi lần chạy batch (10 phút) sẽ lại thấy diff → sinh **1 dòng lịch sử mới mỗi lần**, master không bao giờ đổi.
- Nhánh CREATE **không** bị (giá trị đi qua `ensureMaster` → INSERT thẳng vào master).
- Kiểm tra nhanh:
  ```sql
  SELECT dokusya_id, COUNT(*) AS so_dong, MAX(created_at)
    FROM t_dokusya_rireki WHERE created_by = 'DENSHIBAN_SYNC'
   GROUP BY dokusya_id HAVING COUNT(*) > 5 ORDER BY so_dong DESC;
  ```
  Nếu có độc giả tăng dòng đều đặn → đúng giả thuyết. Cách xử lý: hoặc bỏ `honshiKodokuFlg` khỏi `COMPARABLE_FIELDS`, hoặc stamp riêng lên master như cách làm với `denshi_kaiin_id`.

**② 取消 ghi đè `biko` gốc** — `markTorikeshi` set `biko = lý do huỷ` trên dòng đích ([dokusya-history.query.ts:266](apps/backend/src/modules/dokusya/dokusya-history.query.ts#L266)). Ghi chú nghiệp vụ ban đầu của dòng đó **mất**. Đây là yêu cầu khách hàng (lý do huỷ ghi ở cả 2 dòng), nhưng cần biết khi truy vết dữ liệu.

**③ Chèn giữa chuỗi chỉ relink 1 dòng kế tiếp** — chính sách "B-thuần" (khách hàng chốt 2026-07). `recomputeAfterChain` chỉ sửa `zenkai_*` + `zougen_hokoku_flg` của **dòng ngay sau**, **không** đổi giá trị hiện tại của nó và **không** lan tiếp. Hệ quả đã được khách hàng chấp nhận: nếu dòng chèn đổi một giá trị (vd số bản) thì khi dòng sau có hiệu lực, master **quay lại** giá trị của dòng sau.

**④ Sửa mà không đổi gì → không có dòng lịch sử** nhưng audit log vẫn ghi `UPDATE`. Khi đối soát `t_log` với `t_dokusya_rireki` sẽ thấy lệch số lượng — đúng thiết kế.

**⑤ Duyệt/Từ chối sửa tại chỗ dòng `saishin`** — đây là ngoại lệ duy nhất phá vỡ tính append-only của sổ cái. Lịch sử **không** lưu lại thời điểm chuyển trạng thái duyệt (chỉ có `t_log`).

**⑥ `updated_by` không nằm trong recompute** — mọi luồng ghi mới **bắt buộc** tự stamp `manager.update(Dokusya, …, { updatedBy })` sau `applyChange`, nếu quên thì master giữ người sửa của lần trước.
