# Ma trận trạng thái validate — DokusyaFormView.vue (ACSMS-SCR-011)

> Nguồn: chính xác theo logic `validateClient()` + các binding `:disabled` / `v-if` /
> `v-show` / lọc option trong `apps/frontend/src/views/dokusya/DokusyaFormView.vue`.
> Hàng = tên cột vật lý trong DB (`t_dokusya`).
> Cột = **trạng thái kết hợp của 3 yếu tố chi phối chính**: `dokusya_shubetsu` × `shiharai_hoho` × mode (tạo/sửa).

## Ý nghĩa giá trị trong ô (Legend)

| Giá trị trong ô | Nghĩa đầy đủ |
|---|---|
| bắt buộc | Bắt buộc nhập (kèm format nếu có ghi trong ngoặc) |
| tùy chọn | Tùy chọn (mặc định) |
| ẩn | Ẩn field / section (`v-if` / `v-show`) |
| chỉ đọc | Read-only / disabled (không sửa được) |
| ép =0 | Bị ép giá trị = 0 |
| hạn chế chọn | Hạn chế lựa chọn (loại bớt option) |
| - | Giống cột `base` (không thay đổi) |
| `1,2,3` | Tập **giá trị thô** được phép chọn (field dropdown) |
| ⓜ | Field lấy option từ bảng `m_code` (xem phần "Giá trị m_code") |

## Cột = tổ hợp 3 yếu tố

`base` = quy tắc nền, áp dụng cho mọi cột trừ khi cột ghi đè.

Quy ước tên cột: `Tạo`/`Sửa` (mode) · `sb` = `dokusya_shubetsu` · `hh` = `shiharai_hoho` (giá trị thô — decode ở phần "Giá trị m_code").

| Mã cột | mode | `dokusya_shubetsu` | `shiharai_hoho` |
|---|---|---|---|
| `Tạo·sb1·hh1` | tạo (create) | `1` | `1` |
| `Tạo·sb1·hh≠1` | tạo | `1` | `2,3,4,5,6,9` |
| `Tạo·sb2·hh1` | tạo | `2` | `1` — *isDigitalKozaCreate* |
| `Tạo·sb2·hh≠1` | tạo | `2` | `2,3,4,5,9` (`6` không chọn được) |
| `Sửa·sb1·hh1` | sửa (edit) | `1` | `1` |
| `Sửa·sb1·hh≠1` | sửa | `1` | `2,3,4,5,6,9` |
| `Sửa·sb2·hh1` | sửa | `2` | `1` |
| `Sửa·sb2·hh≠1` | sửa | `2` | `2,3,4,5,9` |

> **Không có cột `Tạo·sb3`**: ở mode tạo, option `dokusya_shubetsu=3` luôn bị disabled → không tạo được.
> **2 trạng thái khóa toàn form** (`Sửa·sb2·hh6` = sửa+`2`+`6`, và `Sửa·sb3` = sửa+`3`) mô tả riêng ở cuối — toàn form `:disabled`, `onSubmit` thoát sớm nên **không chạy validate**.

## Ma trận

| No | Cột DB (t_dokusya) | base | Tạo·sb1·hh1 | Tạo·sb1·hh≠1 | Tạo·sb2·hh1 | Tạo·sb2·hh≠1 | Sửa·sb1·hh1 | Sửa·sb1·hh≠1 | Sửa·sb2·hh1 | Sửa·sb2·hh≠1 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `dokusya_shubetsu` ⓜ | bắt buộc · `1,2,3` | = 1 | = 1 | = 2 | = 2 | = 1 (readonly, require) | = 1 (readonly, require) | = 2 (readonly, require) | = 2 (readonly, require) |
| 2 | `tetsuzuki_shurui` ⓜ | bắt buộc · `0,1` | - | - | - | - | - | - | - | - |
| 3 | `kanri_shiten_id` | bắt buộc¹ | - | - | - | - | - | - | - | - |
| 4 | `shiten_id` | bắt buộc¹ | - | - | - | - | - | - | - | - |
| 5 | `kumiaiin_code` | tùy chọn | - | - | - | - | - | - | - | - |
| 6 | `shimei_sei` | bắt buộc (漢字) | - | - | - | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 7 | `shimei_mei` | bắt buộc (漢字) | - | - | - | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 8 | `shimei_kana_sei` | bắt buộc (ひらがな) | - | - | - | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 9 | `shimei_kana_mei` | bắt buộc (ひらがな) | - | - | - | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 10 | `dokusya_busu` | tùy chọn (mặc định 1)² | - | - | - | - | - | - | - | - |
| 11 | `tanka_id` | bắt buộc | - | - | - | - | - | - | - | - |
| 12 | `denshi_dokusya_shubetsu` ⓜ | ẩn | - | - | - | - | chỉ đọc `0,1` | chỉ đọc `0,1` | chỉ đọc `0,1` | chỉ đọc `0,1` |
| 13 | `rireki_no` | ẩn | - | - | - | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 14 | `yubin_no` | bắt buộc (7 số) | - | - | - | - | - | - | - | - |
| 15 | `todofuken_code` | bắt buộc | - | - | - | - | - | - | - | - |
| 16 | `shikuchoson` | bắt buộc | - | - | - | - | - | - | - | - |
| 17 | `chome_banchi` | bắt buộc | - | - | - | - | - | - | - | - |
| 18 | `tatemono_mei` | tùy chọn | - | - | - | - | - | - | - | - |
| 19 | `renrakusaki_1` | bắt buộc | - | - | - | - | - | - | - | - |
| 20 | `renrakusaki_2` | tùy chọn | - | - | - | - | - | - | - | - |
| 21 | `email` | tùy chọn (format) | - | - | **bắt buộc** | **bắt buộc** | - | - | **bắt buộc** | **bắt buộc** |
| 22 | `mail_magazine_flg` ⓜ | tùy chọn · `0,1` (mặc định `0`) | - | - | - | - | - | - | - | - |
| 23 | `birth_year` | tùy chọn | - | - | - | - | - | - | - | - |
| 24 | `gender` ⓜ | tùy chọn · `1,2,9` | - | - | - | - | - | - | - | - |
| 25 | `yubin_kubun` ⓜ | tùy chọn · `0,1` (mặc định `0`) | - | - | - | - | - | - | - | - |
| 26 | `haitatsu_same_flg` | tùy chọn (mặc định true) | - | - | ẩn | ẩn | - | - | ẩn | ẩn |
| 27 | `haitatsu_yubin_no` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 28 | `haitatsu_todofuken_code` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 29 | `haitatsu_shikuchoson` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 30 | `haitatsu_chome_banchi` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 31 | `haitatsu_tatemono_mei` | tùy chọn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn |
| 32 | `haitatsu_renrakusaki_1` | tùy chọn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn |
| 33 | `haitatsu_renrakusaki_2` | tùy chọn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn | tùy chọn / ẩn | tùy chọn / ẩn | ẩn | ẩn |
| 34 | `haitatsu_shimei_sei` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 35 | `haitatsu_shimei_mei` | tùy chọn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn | bắt buộc³ / ẩn | bắt buộc³ / ẩn | ẩn | ẩn |
| 36 | `haitatsu_shimei_kana_sei` | tùy chọn | bắt buộc³ / ẩn (ひらがな) | bắt buộc³ / ẩn (ひらがな) | ẩn | ẩn | bắt buộc³ / ẩn (ひらがな) | bắt buộc³ / ẩn (ひらがな) | ẩn | ẩn |
| 37 | `haitatsu_shimei_kana_mei` | tùy chọn | bắt buộc³ / ẩn (ひらがな) | bắt buộc³ / ẩn (ひらがな) | ẩn | ẩn | bắt buộc³ / ẩn (ひらがな) | bắt buộc³ / ẩn (ひらがな) | ẩn | ẩn |
| 38 | `hanbaiten_id` | bắt buộc | - | - | - | - | - | - | - | - |
| 39 | `shiharai_hoho` ⓜ | bắt buộc · `1,2,3,4,5,6,9` | = 1 | ∈ {2,3,4,5,6,9} | = 1 | ∈ {2,3,4,5,9}⁴ | = 1 | ∈ {2,3,4,5,6,9} | = 1 | ∈ {2,3,4,5,9} |
| 40 | `dokusyaryo_shiharai_cycle` | tùy chọn | - | - | - | - | - | - | - | - |
| 41 | `bank_shiten_id` | tùy chọn | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - |
| 42 | `hikiotoshi_yokin_shubetsu` ⓜ | tùy chọn · `1,2` | **bắt buộc** `1,2` | - | **bắt buộc** `1,2` | - | **bắt buộc** `1,2` | - | **bắt buộc** `1,2` | - |
| 43 | `hikiotoshi_koza_no` | tùy chọn | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - |
| 44 | `hikiotoshi_koza_meigi` | tùy chọn | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - | **bắt buộc** | - |
| 45 | `dokusyaso_bunrui` | tùy chọn | - | - | - | - | - | - | - | - |
| 46 | `nogyosya_bunrui` | tùy chọn (hiện nếu `dokusyaso_bunrui`⊇`農業者`, else ẩn)⁵ | - | - | - | - | - | - | - | - |
| 47 | `dokusya_kaishi_date` | bắt buộc | - | - | hạn chế chọn⁶ (radio hôm nay/ngày 1 tháng sau) | - | chỉ đọc | chỉ đọc | chỉ đọc | chỉ đọc |
| 48 | `dokusya_chushi_date` | tùy chọn | - | - | chỉ đọc⁶ (null) | - | - | - | - | - |
| 49 | `joho_henko_tekiyo_date` | tùy chọn (chỉ ngày tương lai) | - | - | - | - | - | - | - | - |
| 50 | `seikyu_kaishi_month` | ẩn (khi `dokusya_shubetsu=1`) | - | - | ẩn⁶ | hiện (nhập) | - | - | chỉ đọc (YYYY/MM) | chỉ đọc (YYYY/MM) |
| 51 | `biko` | tùy chọn (≤500 ký tự) | - | - | - | - | - | - | - | - |

## Modifiers độc lập (orthogonal — chồng lên mọi cột)

3 trigger sau **không** phụ thuộc 3 yếu tố chính, áp dụng thêm trên bất kỳ cột nào:

| Trigger (giá trị thô) | Field bị ảnh hưởng | Hiệu lực |
|---|---|---|
| `tetsuzuki_shurui = 0` | `dokusya_busu` | ép =0 + chỉ đọc (watcher ép `0`; `tetsuzuki_shurui=1` ép về `1`) |
| `haitatsu_same_flg = false` | cluster `haitatsu_*` | Chuyển tùy chọn → **bắt buộc** (chỉ khi `dokusya_shubetsu=1`; xem ³). `=true` → `v-show` ẩn + xóa toàn bộ `haitatsu_*` |
| `dokusyaso_bunrui` ⊇ `農業者` | `nogyosya_bunrui` | `v-if` hiện field (else ẩn + xóa) |

> Trong ma trận, giá trị `bắt buộc³ / ẩn` ở cluster `haitatsu_*` đã gộp sẵn modifier `haitatsu_same_flg`: **bắt buộc** khi `=false`, **ẩn** khi `=true` (chỉ áp dụng ở cột `sb1`; cột `sb2` luôn ẩn cả section).

## Ghi chú (Footnotes)

1. **bắt buộc¹** — Cả `kanri_shiten_id` và `shiten_id` đều có dấu `*` (required) trên UI. `validateClient` chỉ check trực tiếp `shiten_id` required, nhưng `kanri_shiten_id` bắt buộc trên thực tế: `shiten_id` bị disabled tới khi chọn `kanri_shiten_id` → không thể submit nếu bỏ trống `kanri_shiten_id`. Đổi `kanri_shiten_id` → reset `shiten_id=null`.
2. **²** — Xem modifier `tetsuzuki_shurui=0`.
3. **bắt buộc³** — Cluster `haitatsu_*` thành required khi `haitatsuRequired = (haitatsu_same_flg=false) && dokusya_shubetsu=1`. `haitatsu_tatemono_mei`/`haitatsu_renrakusaki_1`/`haitatsu_renrakusaki_2` vẫn tùy chọn (giá trị `tùy chọn / ẩn`).
4. **⁴** — mode tạo + `dokusya_shubetsu=2`: danh sách option `shiharai_hoho` loại `6` (nên tập chọn được của cột `hh≠1` là `{2,3,4,5,9}`); đang chọn `6` thì watcher reset `null`.
5. **⁵** — `nogyosya_bunrui` chỉ hiện khi `dokusyaso_bunrui` chứa giá trị thô `農業者`.
6. **hạn chế chọn⁶ / chỉ đọc⁶ / ẩn⁶** — mode tạo + `dokusya_shubetsu=2` + `shiharai_hoho=1` (`isDigitalKozaCreate`): `dokusya_kaishi_date` → radio (hôm nay / ngày 1 tháng sau), tự xác định, không nhập tay; `dokusya_chushi_date` chỉ đọc =`null`; `seikyu_kaishi_month` ẩn (gửi rỗng).

## Trạng thái khóa toàn form (override — đè mọi ô)

`isRecordReadOnly` = mode sửa **VÀ** (`dokusya_shubetsu=3` **HOẶC** (`dokusya_shubetsu=2` & `shiharai_hoho=6`)):

| Mã cột | Tổ hợp | Hiệu lực |
|---|---|---|
| `Sửa·sb2·hh6` | sửa + `dokusya_shubetsu=2` + `shiharai_hoho=6` | Toàn `<a-form :disabled>`, nút lưu disabled, `onSubmit` thoát sớm → **không validate**. Mọi field giữ giá trị hiện có, hiển thị chỉ đọc. |
| `Sửa·sb3` | sửa + `dokusya_shubetsu=3` (mọi `shiharai_hoho`) | Như trên. |

mode sửa + `denshi_shonin_status=0`: nút submit đổi thành **承認** (`approveDokusya`) thay vì cập nhật, kèm nút **否認** (`rejectDokusya`) — hành vi nút bấm, không phải validate field.

## Giá trị m_code (decode giá trị thô trong ô)

Field đánh dấu ⓜ lấy option từ `m_code` (qua `useCodesStore().options(category)`). Nhãn khách hàng sửa được runtime, **giá trị thô cố định** (theo `docs/database/seeder.md §5`):

| Cột DB | category `m_code` | Giá trị thô → nhãn |
|---|---|---|
| `dokusya_shubetsu` | `DOKUSYA_SHUBETSU` | `1`=紙版, `2`=電子版, `3`=併読 |
| `tetsuzuki_shurui` | `TETSUZUKI_SHURUI` | `0`=解約, `1`=新規 |
| `denshi_dokusya_shubetsu` | `DENSHI_DOKUSYA_SHUBETSU` | `0`=無料, `1`=有料 |
| `shiharai_hoho` | `SHIHARAI_HOHO` | `1`=口座引落, `2`=現金集金, `3`=振込集金, `4`=JA施設等, `5`=給与天引き, `6`=クレジットカード, `9`=その他 |
| `gender` | `GENDER` | `1`=男性, `2`=女性, `9`=回答しない |
| `hikiotoshi_yokin_shubetsu` | `YOKIN_SHUBETSU` | `1`=普通, `2`=当座 |
| `yubin_kubun` | `YUBIN_KUBUN` | `0`=空, `1`=郵送 |
| `mail_magazine_flg` | `MAIL_MAGAZINE_FLG` | `0`=配信しない, `1`=配信する |

## Dropdown KHÔNG lấy từ m_code (chỉ để phân biệt)

Option **không** từ `m_code` (giá trị thô là khóa ngoại / mã động, phụ thuộc dữ liệu) → không điền tập giá trị cố định:

| Cột DB | Nguồn option | Ghi chú |
|---|---|---|
| `kanri_shiten_id` | API `getKanriShitenDropdown(ja_id)` | FK `m_kanri_shiten` |
| `shiten_id` | API `getShitenDropdown` (lọc theo `kanri_shiten_id`, bỏ `kinyu_shiten_flg=true`) | FK `m_shiten` |
| `bank_shiten_id` | API `getShitenDropdown` (chỉ `kinyu_shiten_flg=true`) | FK `m_shiten` |
| `hanbaiten_id` | API `getHanbaitenDropdown` | FK `m_hanbaiten` |
| `tanka_id` | API `getTankaDropdown(tanka_type=1)` | FK `m_tanka` |
| `todofuken_code` | API `getTodofukenList` | mã `m_todofuken` |

Hai field multi-select dùng option **hardcode trong component** (không phải `m_code`), lưu chuỗi VARCHAR phân tách dấu phẩy:

- `dokusyaso_bunrui`: `農業者`, `企業・団体`, `その他`, `JAグループ役職員`, `学生`
- `nogyosya_bunrui`: `米`, `野菜`, `果実`, `花`, `畜産`, `その他`
