# Rules — Tạo bản ghi snapshot vào bảng `t_dokusya_rireki`

> Quy tắc (do / don't) khi **append** dòng lịch sử bất biến vào `t_dokusya_rireki`
> mỗi lần CREATE/UPDATE/承認/否認/取込/一括置換 một độc giả.
>
> Đặc tả thuật toán đầy đủ + ví dụ số nằm ở
> [`dokusya-rireki-zenkai-logic.md`](./dokusya-rireki-zenkai-logic.md) (cùng folder).
> File này là **bộ rule rút gọn**; khi mâu thuẫn, **đặc tả thuật toán thắng**.
> Bộ data minh họa mọi case: [`Dokusya_Tracking_Data.md`](./Dokusya_Tracking_Data.md).

---

## 0. Nguyên tắc nền

- Mỗi thao tác → **append** snapshot (không UPDATE/DELETE dòng cũ). Lịch sử bất biến.
- Khóa duy nhất `(dokusya_id, rireki_no)`. `rireki_no` tăng dần `1,2,3,…`; dòng đầu
  (新規) = `1`.
- Mỗi dòng là ảnh chụp **đầy đủ** trạng thái độc giả tại thời điểm đó **+** các cột
  `zenkai_*` (前回値 = giá trị kỳ trước, phục vụ 増減連絡票).
- **Mọi đường ghi** `rireki_no>1` đi qua **cùng một bộ dựng `zenkai_*`** (điền đủ 7).

## R0 — 2 cột ngày áp dụng (mỗi dòng)

| Cột | 日本語 | Nghĩa |
|---|---|---|
| `joho_henko_tekiyo_date` | 情報変更適用日 | ngày áp dụng đổi **thông tin** độc giả |
| `hanbaiten_tekiyo_date` | 販売店適用日 | ngày áp dụng đổi **販売店 (cửa hàng)** |

Ngày hiệu lực của dòng: **`D = hanbaiten_tekiyo_date ?? joho_henko_tekiyo_date`**
(sự kiện 販売店 dùng ngày 販売店, còn lại dùng ngày 情報).

---

## 1. RD = "record hiệu lực tại ngày D" (lõi tính zenkai)

```
applicable_date(r) = r.joho_henko_tekiyo_date  (nếu rỗng → fallback r.dokusya_kaishi_date)
candidates = { r | r.rireki_no < ceiling  AND  applicable_date(r) <= D }
rỗng → RD = null
maxDate = max applicable_date(candidates)
RD = dòng có applicable_date == maxDate VÀ rireki_no LỚN NHẤT
```
So ngày = so chuỗi ISO `YYYY-MM-DD`. **"Trị hiệu lực của RD"** = lấy thẳng trường
của dòng RD (KHÔNG dùng `zenkai_*` của RD).

---

## 2. Bảy (7) trường "có zenkai" — DO

Chỉ 7 trường này có cột `zenkai_*`. Mọi rule dưới áp cho chúng:

| Nhóm | Trường hiện hành | Cột zenkai |
|---|---|---|
| 部数 | `dokusya_busu` | `zenkai_dokusya_busu` |
| 販売店 | `hanbaiten_id` | `zenkai_hanbaiten_id` |
| 住所 (5) | `yubin_no`,`todofuken_code`,`shikuchoson`,`chome_banchi`,`tatemono_mei` | `zenkai_yubin_no`,`zenkai_todofuken_code`,`zenkai_shikuchoson`,`zenkai_chome_banchi`,`zenkai_tatemono_mei` |

- **Địa chỉ active theo cờ** `haitatsu_same_flg` (配達先同一フラグ) của **dòng mới**:
  - `true` → cụm 購読者住所 (`yubin_no`…).
  - `false` → cụm 配達先住所 (`haitatsu_*`).
  - Hai cụm vẫn lưu đầy đủ ở cột thường; **chỉ `zenkai_*` chọn 1 trong 2** theo cờ.

---

## 3. Bốn rule ghi (cho dòng `rireki_no > 1`)

`before` = trạng thái trước sửa (= dòng rireki mới nhất hiện có).
`after` = trạng thái sau sửa. `D` = ngày áp dụng dòng (R0). `RD` = RD(D) với
**`ceiling = rireki_no của CHÍNH dòng đang ghi`** (xem §5).

- **R1** — `zenkai_X = RD.X` (trị hiệu lực của RD, KHÔNG phải zenkai của RD).
  RD null → fallback `zenkai_X = before.X`.
- **R2** — nhóm **không đổi** giữa before↔after → trị hiện hành của dòng **cũng lấy
  từ RD** (không phải `after`). Nhóm có đổi → ghi `after`. 4 nhóm xét độc lập:
  `dokusya_busu`; `hanbaiten_id`; cụm 購読者住所 (đổi nếu ≥1/5 trường khác); cụm
  配達先住所. So chuỗi, null/undefined coi như `''`.
- **R3** — `rireki_no>1` **LUÔN điền đủ cả 7** `zenkai_*` (kể cả khi không đổi →
  `zenkai_X = RD.X`). Chỉ `rireki_no=1` để `zenkai_* = NULL`.
- **R4** — `D = hanbaiten_tekiyo_date ?? joho_henko_tekiyo_date`.

---

## 4. Split — đổi đồng thời 販売店 + thông tin

```
storeChanged   = after.hanbaiten_id != before.hanbaiten_id
addressChanged = cụm địa chỉ active (theo same_flg) đổi before↔after
busuChanged    = after.dokusya_busu != before.dokusya_busu
infoChanged    = addressChanged OR busuChanged
```

- **Chỉ 販売店 đổi** → 1 dòng, `D=hanbaiten日`, ghi **cả 2 cột ngày = hanbaiten日**.
- **Chỉ thông tin đổi** → 1 dòng, `D=joho日`, `hanbaiten_tekiyo_date = NULL`.
- **storeChanged AND infoChanged → SPLIT 2 dòng**, xếp theo **ngày áp dụng tăng dần**:
  - `storeFirst = hanbaiten日 < joho日`:
    - dòng nhỏ = 販売店 (D=hanbaiten日), trạng thái `{before + hanbaiten mới}` (部数/住所=before)
    - dòng lớn = 情報 (D=joho日, saishin=true), trạng thái `after` đầy đủ
  - `storeFirst = false` (情報 sớm hơn / cùng ngày):
    - dòng nhỏ = 情報 (D=joho日), trạng thái `{after + hanbaiten=before}`
    - dòng lớn = 販売店 (D=hanbaiten日, saishin=true), trạng thái `after` đầy đủ

**Bất biến BẮT BUỘC:** trong split, `rireki_no` tăng ⇔ ngày áp dụng tăng. Mỗi dòng
tự áp R1–R4 với `D`/`RD` riêng.

---

## 5. Per-record ceiling — ĐIỂM MẤU CHỐT (đừng làm sai)

- Tính `RD` cho **một dòng** → `ceiling = rireki_no của CHÍNH dòng đó`, **KHÔNG**
  dùng một hằng chung cho cả 2 dòng split.
- 2 dòng split phải ghi **tuần tự trong cùng 1 transaction**, dòng **ngày sớm insert
  TRƯỚC** → khi tính RD của dòng muộn, truy vấn (cùng connection) **thấy** dòng sớm
  vừa insert → `zenkai` của dòng muộn = trị mà sự kiện sớm vừa thiết lập.
- Bug kinh điển: dùng `newRirekiNo` cố định làm ceiling → `zenkai_busu/hanbaiten`
  của dòng muộn sai. (Xem VD1/VD2 trong đặc tả.)

---

## 6. Áp dụng theo từng đường ghi

| Đường ghi | rireki_no | zenkai |
|---|---|---|
| CREATE / 新規 取込 | `=1` | **NULL** (R3) |
| UPDATE (UI sửa đơn) | `>1`, có thể split | RD per-record (R1–R5) |
| Excel 取込 UPDATE | `>1`, có thể split | dùng chung hàm split; không cấp bộ giải RD → `valueBase = before` (vẫn đủ 7) |
| 承認 / 否認 | `>1` | 7 trường không đổi → `zenkai = before` (đủ 7) |
| 一括置換 販売店 | `>1` | chỉ đổi 販売店 → `zenkai_hanbaiten = trị編集前`, 6 cột còn lại = trị hiện hành (đủ 7) |

Nguyên tắc: UI UPDATE dùng RD-theo-ngày; các đường còn lại dùng `before` làm
`valueBase` (không có khái niệm "ngày D quá khứ" / không đổi nhóm tracked).

---

## 7. Cờ trạng thái dòng (giữ nhất quán với data minh họa)

| Cột | 日本語 | Quy tắc |
|---|---|---|
| `saishin_data_flg` | 最新データ | `true` đúng cho dòng `rireki_no` **lớn nhất** của độc giả; các dòng cũ `false`. Trong split, dòng ngày muộn = `true`. |
| `shinki_flg` | 新規 | `true` chỉ ở `rireki_no=1`. |
| `kaiyaku_flg` | 解約 | `true` khi dòng là sự kiện hủy (set `dokusya_chushi_date`). |
| `zougen_hokoku_flg` | 増減報告 | `true` nếu thay đổi **ảnh hưởng tăng/giảm** (部数/販売店/住所/新規/解約); `false` nếu đổi không ảnh hưởng (vd chỉ đổi số tài khoản 口座). Quyết định màu ô trong file MD (vàng vs xám). |

→ Khớp file `Dokusya_Tracking_Data.md`: `#4 (口座のみ)` có `zougen=FALSE`; mọi case
部数/住所/販売店/新規 có `zougen=TRUE`; case 同時/異日 sinh 2 dòng (#6/#7, #8/#9, #10/#11).

---

## 8. Transaction & audit (BẮT BUỘC)

- Toàn bộ chuỗi ghi của **một** thao tác (1 hoặc 2 dòng rireki + ghi đè `t_dokusya`
  + `AuditLogService.logCreate/logUpdate`) phải nằm trong **một**
  `dataSource.transaction(...)`; truyền `manager` cho cả audit để rollback đồng bộ.
- Dòng split phải insert **tuần tự trong cùng transaction** (điều kiện §5).
- `logError` (log_type=3) chạy **ngoài** transaction (sau rollback) — **không** truyền
  `manager`. (Theo `.claude/rules/nestjs.md §Audit Log` + §Transactions.)

## 9. KHÔNG được (anti-patterns)

```
✗ UPDATE / DELETE dòng rireki cũ (lịch sử phải bất biến)
✗ Để zenkai_* = NULL khi rireki_no > 1 (vi phạm R3)
✗ Dùng zenkai_* của RD làm zenkai dòng mới (R1: phải lấy TRỊ HIỆU LỰC của RD)
✗ ceiling cố định cho cả 2 dòng split (phải per-record = rireki_no chính nó — §5)
✗ Ghi after vào nhóm KHÔNG đổi (R2: nhóm không đổi lấy từ RD)
✗ zenkai địa chỉ lấy sai cụm (phải theo haitatsu_same_flg của dòng MỚI)
✗ Ghi 2 dòng split ngoài cùng transaction / sai thứ tự ngày (phá bất biến §4–§5)
✗ Audit log ngoài transaction cho success path (mất tính nguyên tử)
```

## 10. Checklist khi thêm logic / sửa code ghi rireki

```
[ ] rireki_no liên tục, (dokusya_id, rireki_no) duy nhất
[ ] rireki_no=1: zenkai_* = NULL, shinki_flg=true
[ ] rireki_no>1: đủ 7 zenkai_*, không NULL
[ ] zenkai = TRỊ HIỆU LỰC của RD (per-record ceiling = rireki_no chính nó)
[ ] Nhóm không đổi → trị hiện hành = RD (R2)
[ ] Địa chỉ zenkai chọn cụm theo haitatsu_same_flg dòng mới
[ ] Split: 2 dòng, rireki_no tăng ⇔ ngày tăng, insert tuần tự cùng tx
[ ] D = hanbaiten_tekiyo_date ?? joho_henko_tekiyo_date
[ ] saishin_data_flg đúng dòng mới nhất; zougen_hokoku_flg đúng ảnh hưởng
[ ] Main DML + audit cùng 1 transaction (truyền manager); logError ngoài tx
[ ] Test đối chiếu VD1–VD3 trong dokusya-rireki-zenkai-logic.md
```
