# Đặc tả logic ghi lịch sử độc giả (t_dokusya_rireki) — zenkai_* & trị hiệu lực (RD)

> Tài liệu độc lập với code. Mục tiêu: bất kỳ người/AI nào đọc đặc tả này đều
> triển khai ra **cùng một kết quả**. Trình bày theo thuật toán + ví dụ số để tự
> kiểm chứng. Thuật ngữ kèm tiếng Nhật + tên cột DB.

---

## 0. Bối cảnh

Mỗi lần CREATE/UPDATE/承認/否認/取込/一括置換 một độc giả, hệ thống **append**
một (hoặc nhiều) dòng snapshot bất biến vào bảng `t_dokusya_rireki`. Mỗi dòng là
ảnh chụp đầy đủ trạng thái độc giả tại thời điểm đó, cộng thêm các cột `zenkai_*`
(前回値 — "giá trị kỳ trước") phục vụ báo cáo tăng/giảm (増減連絡票).

Khóa: `(dokusya_id, rireki_no)` duy nhất. `rireki_no` tăng dần 1,2,3,…; dòng đầu
tiên (新規) là `rireki_no = 1`.

Mỗi dòng có **2 cột ngày áp dụng**:
- `joho_henko_tekiyo_date` (情報変更適用日) — ngày áp dụng thay đổi **thông tin độc giả**.
- `hanbaiten_tekiyo_date` (販売店適用日) — ngày áp dụng thay đổi **販売店 (cửa hàng)**.

---

## 1. Khái niệm cốt lõi: RD = "record hiệu lực tại ngày D"

Cho một độc giả và một ngày `D`, **RD(D)** = trạng thái độc giả **đang có hiệu lực
tại ngày D**, suy ra từ các dòng lịch sử đã tồn tại.

Thuật toán tính RD(D), giới hạn bởi `ceiling` (chỉ xét các dòng có `rireki_no < ceiling`):

```
applicable_date(r) = (r.joho_henko_tekiyo_date khác rỗng/null)
                     ? r.joho_henko_tekiyo_date
                     : r.dokusya_kaishi_date        // fallback cho bản 新規 chưa có joho

candidates = { r ∈ rireki(dokusya) | r.rireki_no < ceiling
                                    AND applicable_date(r) <= D }
nếu candidates rỗng → RD = null
maxDate = max( applicable_date(r) ) với r ∈ candidates
RHL     = { r ∈ candidates | applicable_date(r) == maxDate }
RD      = phần tử của RHL có rireki_no LỚN NHẤT
```

**"Trị hiệu lực" của RD** = lấy thẳng các trường của dòng RD này (KHÔNG dùng cột
`zenkai_*` của nó). So sánh ngày là so sánh chuỗi `YYYY-MM-DD` (chuẩn ISO ⇒ thứ tự
chuỗi = thứ tự thời gian).

---

## 2. Tập 7 trường "có zenkai" (được theo dõi kỳ trước)

Chỉ 7 trường này có cột `zenkai_*` tương ứng. Mọi quy tắc dưới đây áp dụng cho
chúng:

| Nhóm | Trường hiện hành | Cột zenkai |
|---|---|---|
| 部数 (số lượng) | `dokusya_busu` | `zenkai_dokusya_busu` |
| 販売店 (cửa hàng) | `hanbaiten_id` | `zenkai_hanbaiten_id` |
| 住所 (địa chỉ, 5 trường) | `yubin_no`, `todofuken_code`, `shikuchoson`, `chome_banchi`, `tatemono_mei` | `zenkai_yubin_no`, `zenkai_todofuken_code`, `zenkai_shikuchoson`, `zenkai_chome_banchi`, `zenkai_tatemono_mei` |

**Quy tắc địa chỉ active**: cột `zenkai_<địa chỉ>` lưu địa chỉ **đang được giao
báo tới**, chọn theo cờ `haitatsu_same_flg` (配達先同一フラグ) của dòng mới:
- `haitatsu_same_flg = true` → dùng cụm 購読者住所 (`yubin_no`…).
- `haitatsu_same_flg = false` → dùng cụm 配達先住所 (`haitatsu_yubin_no`…).

(Hai cụm 購読者住所 / 配達先住所 vẫn được lưu riêng đầy đủ ở các cột thường; chỉ
phần `zenkai_*` mới chọn 1 trong 2 theo cờ.)

---

## 3. Bốn quy tắc ghi (áp dụng cho dòng có `rireki_no > 1`)

Đặt:
- `before` = trạng thái master **trước** lần sửa (= dòng rireki mới nhất hiện có).
- `after`  = trạng thái master **sau** lần sửa (before + thay đổi từ request).
- `D`      = ngày áp dụng của dòng đang ghi (xem R4).
- `RD`     = RD(D) tính theo §1 với `ceiling = rireki_no của chính dòng đang ghi` (xem §5).

### R1 — zenkai = trị hiệu lực của RD (KHÔNG phải zenkai của RD)
Với mỗi trường X trong 7 trường: `zenkai_X = RD.X` (trị hiện hành của RD, tức trị
đang hiệu lực ngay trước thay đổi). Nếu RD = null (không có dòng nào ≤ D) → fallback
`zenkai_X = before.X`.

### R2 — Nhóm KHÔNG đổi thì trị hiện hành cũng lấy của RD
So sánh từng nhóm giữa `before` ↔ `after`:
- Nếu **nhóm đó không đổi** (request không thay đổi) → ghi **trị hiện hành** của
  nhóm đó vào rireki cũng bằng **RD** (không phải trị request/`after`).
- Nếu **nhóm đó có đổi** → ghi trị mới (`after`) như bình thường.

4 nhóm xét độc lập: `dokusya_busu`; `hanbaiten_id`; cụm 購読者住所 (5 trường, đổi
nếu ≥1 trường khác); cụm 配達先住所 (5 trường). So sánh chuỗi, null/undefined coi như `''`.

### R3 — `rireki_no > 1` thì 7 cột zenkai LUÔN có data
Mọi dòng có `rireki_no > 1` phải điền **đủ cả 7** `zenkai_*`, **kể cả khi không
đổi** (khi đó `zenkai_X = RD.X = trị hiện hành`, không để NULL). Chỉ dòng
`rireki_no = 1` (新規) mới để `zenkai_* = NULL`.

### R4 — Ngày D của một dòng
- Dòng là **sự kiện 販売店** (có thay đổi 販売店, ghi `hanbaiten_tekiyo_date`) →
  `D = hanbaiten_tekiyo_date`.
- Ngược lại (sự kiện thông tin) → `D = joho_henko_tekiyo_date`.
- Công thức gọn: `D = hanbaiten_tekiyo_date ?? joho_henko_tekiyo_date`.

---

## 4. Tách 2 dòng khi đổi đồng thời 販売店 + thông tin (split)

Khi **một request** thay đổi cả 販売店 **và** thông tin (部数 hoặc 住所), và hai
ngày áp dụng có thể khác nhau, lịch sử được **tách thành 2 dòng**, mỗi dòng cho 1
sự kiện với ngày áp dụng riêng.

```
storeChanged = (after.hanbaiten_id != before.hanbaiten_id)
addressChanged = (cụm địa chỉ active theo same_flg đổi giữa before↔after)
busuChanged  = (after.dokusya_busu != before.dokusya_busu)
infoChanged  = addressChanged OR busuChanged

KHÔNG split:
  - chỉ 販売店 đổi      → 1 dòng, D = hanbaiten_tekiyo_date (ghi cả 2 cột ngày = hanbaiten日).
  - chỉ thông tin đổi  → 1 dòng, D = joho_henko_tekiyo_date (hanbaiten_tekiyo_date = NULL).

SPLIT (storeChanged AND infoChanged): tạo 2 dòng, xếp theo NGÀY ÁP DỤNG TĂNG DẦN.
  storeFirst = (hanbaiten_tekiyo_date < joho_henko_tekiyo_date)
  - storeFirst = true (販売店 sớm hơn):
      dòng 1 (rireki_no nhỏ) = sự kiện 販売店, D = hanbaiten日
                              trạng thái = {before + hanbaiten mới}  (部数/住所 = before)
      dòng 2 (rireki_no lớn) = sự kiện 情報,  D = joho日, saishin=true
                              trạng thái = after (đầy đủ)
  - storeFirst = false (情報 sớm hơn hoặc cùng ngày):
      dòng 1 (rireki_no nhỏ) = sự kiện 情報,  D = joho日
                              trạng thái = {after + hanbaiten = before}  (販売店 = cũ)
      dòng 2 (rireki_no lớn) = sự kiện 販売店, D = hanbaiten日, saishin=true
                              trạng thái = after (đầy đủ)
```

**Bất biến quan trọng**: trong một split, `rireki_no` tăng ⇔ ngày áp dụng tăng
(dòng ngày sớm luôn có `rireki_no` nhỏ). Đây là nền tảng cho §5.

Mỗi dòng tự áp R1–R4 với `D` và `RD` riêng của nó.

---

## 5. Per-record ceiling — điểm MẤU CHỐT (đừng làm sai)

Khi tính `RD` cho **một dòng cụ thể**, `ceiling` phải = **`rireki_no` của CHÍNH
dòng đó**, KHÔNG phải một hằng số dùng chung cho cả 2 dòng split.

Hệ quả trong split (2 dòng ghi **tuần tự**, dòng ngày sớm ghi trước):
- Dòng ngày **sớm** (rireki_no nhỏ): ceiling nhỏ → RD chỉ dựa trên lịch sử **trước
  lần sửa** → zenkai = trị編集前. Đúng.
- Dòng ngày **muộn** (rireki_no lớn): ceiling lớn hơn → RD **bao gồm cả dòng ngày
  sớm vừa được ghi trong cùng transaction** → zenkai = trị mà sự kiện sớm đã thiết
  lập. Đúng.

Điều kiện kỹ thuật để đúng: dòng sớm phải được **insert xong trước** khi tính RD
của dòng muộn (ghi tuần tự trong **cùng 1 transaction**; truy vấn RD đọc cùng
connection nên thấy bản vừa insert).

**Tại sao đây KHÔNG phải exception mà nhất quán với logic hiệu lực:**
- Sau khi cả 2 dòng tồn tại, chúng chỉ là 2 điểm trên timeline. zenkai của dòng
  muộn = "trị hiệu lực ngay trước ngày của nó" = RD tại ngày đó = đúng công thức §1
  áp lên timeline đã gồm dòng sớm.
- Nhờ bất biến §4 (`rireki_no` tăng ⇔ ngày tăng trong split), "`rireki_no < self`"
  ⟺ "các sự kiện hiệu lực tại/trước dòng này".
- **Bộ lọc ngày `applicable ≤ D` mới là lõi ngữ nghĩa**; `ceiling` chỉ để loại
  CHÍNH dòng đang ghi và các dòng số lớn hơn (mà theo bất biến đều có ngày ≥). Trên
  toàn lịch sử `rireki_no` có thể không tăng theo ngày (request khác nhau tạo bản
  tương lai rồi bản quá khứ) — không sao, bộ lọc ngày vẫn quyết định đúng RD.

---

## 6. Áp dụng cho MỌI đường ghi lịch sử

| Đường ghi | rireki_no | zenkai |
|---|---|---|
| CREATE / 新規 取込 | =1 | NULL (R3) |
| UPDATE (UI sửa đơn lẻ) | >1, có thể split | RD per-record (R1–R5) |
| Excel取込 UPDATE | >1, có thể split | dùng chung hàm split; nếu không cấp bộ giải RD thì `valueBase = before` (vẫn điền đủ 7 theo R3) |
| 承認/否認 (approve/reject) | >1 | không đổi 7 trường ⇒ `zenkai = before` (điền đủ 7, R3) |
| 一括置換 販売店 (replace) | >1 | chỉ đổi 販売店 ⇒ `zenkai_hanbaiten = trị編集前`, 6 cột còn lại = trị hiện hành (điền đủ 7, R3) |

Nguyên tắc: **mọi** dòng `rireki_no>1` đều đi qua cùng một bộ dựng `zenkai_*`
(điền đủ 7). UI UPDATE dùng RD-theo-ngày; các đường còn lại dùng `before` làm
`valueBase` (vì chúng không có khái niệm "ngày D quá khứ" hoặc không đổi nhóm tracked).

---

## 7. Bản đồ thuật toán → hàm (gợi ý, không bắt buộc tên)

1. `fetchEffectiveBeforeChange(dokusyaId, D, ceiling) → RD | null` — §1, đọc trong
   cùng transaction để thấy bản vừa insert.
2. `buildZenkaiSnapshot(before, after, valueBase=before) → {7 zenkai}` — §3 R1+R3:
   luôn điền cả 7 từ `valueBase`; địa chỉ chọn cụm theo `after.haitatsu_same_flg`.
3. `applyUnchangedTrackedFromRd(curState, before, after, RD) → curState'` — §3 R2:
   nhóm không đổi (before↔after) thì ghi đè trị hiện hành bằng RD.
4. `writeRirekiSplit(before, after, startRirekiNo, opts)` — §4: quyết định 1/2 dòng
   và thứ tự; mỗi `saveOne(…, rirekiNo, …)`:
   - `D = hanbaiten_tekiyo_date ?? joho_henko_tekiyo_date`
   - `valueBase = resolveZenkaiBase(D, dokusyaId, rirekiNo)`  ← **ceiling = rirekiNo (§5)**
   - `curForHistory = applyUnchangedTrackedFromRd(curState, before, after, valueBase)`
   - ghi `buildHistoryFromEntity(curForHistory) + buildZenkaiSnapshot(prevState, curState, valueBase) + {2 cột ngày}`
5. Wiring UI UPDATE: `resolveZenkaiBase = (D, id, ceiling) ⇒ fetchEffectiveBeforeChange(id, D, ceiling)`.

---

## 8. Ví dụ kiểm chứng (số cụ thể — dùng để tự test)

Giả định trước khi sửa: độc giả có `rireki_no=1` (busu=3, hanbaiten=300, chome='A',
joho='2026-01-01'). Lần sửa tạo `rireki_no=2,3` (newRirekiNo=2).

### VD1 — split, 情報 sớm hơn 販売店 (storeFirst=false)
Request: busu 3→4, hanbaiten 300→201, chome 'A'→'B', joho=07-15, hanbaiten=08-01.
Kết quả:
- `rireki_no=2` (情報, 07-15): busu=4, chome='B', hanbaiten=300(giữ),
  `zenkai_busu=3`, `zenkai_chome='A'`, `zenkai_hanbaiten=300`.
- `rireki_no=3` (販売店, 08-01): hanbaiten=201, busu=4, chome='B',
  `zenkai_hanbaiten=300`, **`zenkai_busu=4`** (08-01 直前 = busu của rireki_no=2,
  KHÔNG phải 3), **`zenkai_chome='B'`**.

### VD2 — split, 販売店 sớm hơn 情報 (storeFirst=true)
Request: busu 3→4, hanbaiten 300→24, hanbaiten=07-10, joho=07-20.
Kết quả:
- `rireki_no=2` (販売店, 07-10): hanbaiten=24, busu=3(giữ), `zenkai_hanbaiten=300`.
- `rireki_no=3` (情報, 07-20): busu=4, **hanbaiten=24** (trị hiệu lực), **`zenkai_hanbaiten=24`**
  (07-20 直前 = hanbaiten của rireki_no=2, KHÔNG phải 300), `zenkai_busu=3`.

### VD3 — có bản đặt lịch tương lai (RD ≠ master)
Đã có `rireki_no=2` joho='2099-01-01' (tương lai), hanbaiten=300. Sửa chỉ thông tin,
joho='2030-01-01'. Khi tính RD(2030, ceiling=3): bản 2099 bị loại bởi
`applicable ≤ 2030` → RD = `rireki_no=1` → zenkai theo trị tại 2030, không lấy trị
tương lai của master.

---

## 9. Lưu ý dữ liệu cũ

Bản vá per-record-ceiling (§5) chỉ ảnh hưởng các lần **ghi mới**. Các dòng
`rireki_no>1` đã ghi **trước** khi có quy tắc này có thể giữ `zenkai_*` cũ/sai
trong DB; muốn sửa phải **tính lại** (recompute) bằng SQL theo đúng §1–§5, hoặc
ghi đè bằng cách thực hiện lại thao tác sửa.
