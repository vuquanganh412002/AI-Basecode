# Rules — Thêm/sửa dữ liệu cho `Dokusya_Tracking_Data.md` (giữ nguyên format)

> Bắt buộc tuân thủ khi tạo dữ liệu mới hoặc chỉnh sửa
> [`Dokusya_Tracking_Data.md`](./Dokusya_Tracking_Data.md). Mục tiêu: file luôn
> **round-trip không mất mát** với `Dokusya_Tracking_Data.xlsx` qua bộ chuyển đổi
> [`scripts/styled_xlsx_md.py`](../../../scripts/styled_xlsx_md.py), và giữ đúng
> bố cục/màu/đậm mà file hiện tại đang dùng.

---

## 0. Cơ chế file (đọc trước khi sửa)

File `.md` chứa **một `<table>` HTML** (không phải bảng Markdown thường, vì bảng MD
không lưu được màu chữ/đậm/nền). Mỗi ô `<td>` mang **2 lớp thông tin**:

| Lớp | Thuộc tính | Vai trò |
|---|---|---|
| Hiển thị (preview) | `style="..."` (CSS) | Chỉ để xem màu/đậm trong trình xem MD. **Không bao giờ** được parse ngược. |
| Dữ liệu gốc (authoritative) | `data-*` | Nguồn chân lý để dựng lại `.xlsx`. Bộ parse **chỉ đọc `data-*`**. |

**Hệ quả bắt buộc:** khi thêm/sửa ô, phải set **đồng thời** `data-*` **và** `style`
cho khớp nhau. Nếu chỉ sửa `style`, file vẫn round-trip nhưng **mất** thay đổi
(vì `to-xlsx` bỏ qua CSS). Nếu chỉ sửa `data-*`, preview hiển thị sai màu.

### Bảng `data-*` (toàn bộ khóa converter hiểu)

| `data-*` | Ý nghĩa | Giá trị |
|---|---|---|
| `data-b` | bold | `"1"` nếu đậm; bỏ trống nếu không |
| `data-i` | italic | `"1"` |
| `data-fc` | màu chữ | ARGB 8 ký tự, vd `FFB91C1C` |
| `data-fn` | tên font | vd `Consolas` (mặc định Calibri → bỏ) |
| `data-fs` | cỡ chữ (pt) | vd `13` (mặc định 11 → bỏ) |
| `data-fl` | màu nền (fill) | ARGB, vd `FFFFF7D6` |
| `data-bl/br/bt/bb` | viền trái/phải/trên/dưới | `style|ARGB`, vd `thin|FFCBD5E1` |
| `data-ha` / `data-va` | căn ngang/dọc | `left`/`center` … |
| `data-w` | wrap text | `"1"` |
| `data-nf` | number format | vd `yyyy\-mm\-dd` |
| `data-t` | **kiểu giá trị** | `b`=bool, `n`=số, `d`=datetime, `dd`=date; **vắng = chuỗi** |

**Baseline mặc định** (Calibri 11pt, đen `FF000000`, không đậm/nền/viền): ô đúng
mặc định xuất ra `<td></td>` trống. Đừng thêm `data-*`/`style` thừa cho ô mặc định.

---

## 1. Bố cục bảng (KHÔNG được phá)

Thứ tự hàng cố định:

| Hàng | Nội dung | Style chủ đạo |
|---|---|---|
| 1 | Tiêu đề | đậm, `#1f6feb`, 13pt |
| 2 | **Chú giải màu** (legend) | `#475569`, 9pt — phải cập nhật nếu thêm màu mới |
| 3 | Hàng trống ngăn cách | baseline |
| 4 | **Header** = tên cột DB (66 cột) | nền `#1f6feb`, chữ trắng `#ffffff`; ô `A4` nền `#0f172a` |
| 5… | Các **block kịch bản** | xem §2 |

- **Cột cố định (freeze panes = `D5`)**: 3 cột đầu (A,B,C) + 4 hàng đầu luôn đóng
  băng. Giữ nguyên — chứa diễn giải/nhãn.
- **66 cột (A→BN)** theo đúng thứ tự header hàng 4. **Không** chèn/xóa/đổi thứ tự cột.
  Mọi hàng dữ liệu phải có **đủ 66 `<td>`** (kể cả ô trống `<td></td>`).
- Tên cột (hàng 4) là tên cột DB thật (`dokusya_id`, `hanbaiten_id`, `rireki_no`,
  `zenkai_*`…). Nếu schema DB đổi → sửa hàng 4 trước, rồi mọi hàng dữ liệu theo sau.

### 3 cột nhãn đầu mỗi block

| Cột | Header | Nội dung |
|---|---|---|
| A | `Diễn giải (VN)` | giải thích tiếng Việt (kèm thuật ngữ 日本語 + tên cột khi cần) |
| B | `レコード` | nhãn bản ghi, vd `③ rireki #2 (部数変更)` |
| C | `テーブル` | tên bảng nguồn: `入力(DTO)` / `t_dokusya` / `t_dokusya_rireki` |

---

## 2. Cấu trúc 1 block kịch bản

Mỗi kịch bản (1 thao tác nghiệp vụ) gồm các hàng liên tiếp, rồi **1 hàng trống**
ngăn cách với block kế:

```
① 入力 (CREATE) / ① 入力 (UPDATE)   — dữ liệu nhân viên nhập (DTO)      → nền CAM
② t_dokusya (vN)                    — bản ghi chính sau ghi đè          → nền XANH LÁ
③ rireki #N (...)                   — snapshot lịch sử (1 hoặc 2 hàng)  → nền XANH DƯƠNG
(hàng trống)
```

- Block tạo mới: `① 入力 (CREATE)` → `② t_dokusya (v1)` → `③ rireki #1 (新規)`.
- Block sửa: `① 入力 (UPDATE)` → `② t_dokusya (vN)` → `③ rireki #N (...)`
  (có thể **2 hàng ③** khi split — xem [`t_dokusya_rireki.snapshot-rules.md`](./t_dokusya_rireki.snapshot-rules.md) §split).
- `rireki_no` (cột BA) tăng dần đúng theo logic snapshot. Cột B đánh số `#N` khớp `rireki_no`.

---

## 3. Quy ước MÀU (nền ô = `data-fl` + `style background`)

Giữ đúng bảng màu hiện tại. Khi dùng màu mới phải bổ sung vào **legend hàng 2**.

| Nghĩa | Màu nền | ARGB (`data-fl`) | Dùng cho |
|---|---|---|---|
| Input (nhân viên nhập) | cam nhạt | `FFFFF7E6` | hàng `① 入力` (ô dữ liệu) |
| t_dokusya | xanh lá | `FFE9F7EF` | hàng `② t_dokusya` |
| Lịch sử mới | xanh dương | `FFDDEFFF` | hàng `③ rireki` |
| Thay đổi, **zougen=TRUE** | vàng | `FFFFF7D6` | ô có giá trị đổi & ảnh hưởng tăng/giảm |
| Thay đổi, **zougen=FALSE** | xám | `FFEDEDED` | ô đổi nhưng KHÔNG ảnh hưởng tăng/giảm |
| Thay đổi **đồng thời** | vàng đậm | `FFFFE8B3` | kịch bản 同時 (販売店+情報 cùng lúc) |
| Header | xanh `#1f6feb` | `FF1F6FEB` | hàng 4 |
| Header cột A | navy `#0f172a` | `FF0F172A` | ô `A4` |

## 4. Quy ước CHỮ (màu chữ + đậm)

| Nghĩa | `data-fc` | `data-b` | Ghi chú |
|---|---|---|---|
| Ô đổi giá trị dạng **"cũ → mới"** | `FFB91C1C` (đỏ đậm) | `1` | nội dung literal `cũ → mới`, vd `3 → 4`, `2026-06-29 → 2026-07-05` |
| Đánh dấu đổi cờ/flag | `FFFF0000` (đỏ thuần) | `1` | vd `TRUE → FALSE` |
| Text thường | (bỏ — mặc định đen) | — | |
| Header | `FFFFFFFF` | `1` | chữ trắng trên nền xanh |

**Mẫu ô "đổi giá trị" (copy rồi đổi số):**
```html
<td style="font-weight:bold;color:#b91c1c;background:#fff7d6" data-b="1" data-fc="FFB91C1C" data-fl="FFFFF7D6">3 → 4</td>
```
- Đổi & **ảnh hưởng tăng/giảm** → nền vàng `#fff7d6` / `FFFFF7D6`.
- Đổi & **không** ảnh hưởng → nền xám `#ededed` / `FFEDEDED`.
- Đổi **đồng thời** → nền vàng đậm `#ffe8b3` / `FFFFE8B3`.

---

## 5. Quy ước GIÁ TRỊ ô

- **NULL trong DB** → text literal `NULL` (chuỗi, **không** set `data-t`).
- **Không áp dụng / ô trống ngữ nghĩa** → text literal `—` (em dash).
- **Ngày** → `data-t="d"` (datetime) hoặc `data-t="dd"` (date) + `data-nf` đúng
  (`yyyy\-mm\-dd` hoặc `yyyy\-mm\-dd hh:mm:ss`). Hiển thị ISO `YYYY-MM-DD`.
- **Số** (id, busu, code…) → `data-t="n"`. **Boolean** (`haitatsu_same_flg`…) →
  `data-t="b"`, text `True`/`False`.
- Giữ **đúng kiểu** như cột DB: `dokusya_id`,`rireki_no` là số; `shimei_sei` là chuỗi.
- Escape HTML trong nội dung (`&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`). Bộ `to-md` tự
  escape; khi gõ tay phải tự escape.
- Cột `zenkai_*` (BJ→BN…): điền theo logic snapshot — xem file rules số 2. Hàng
  `rireki_no=1` để `NULL`; `rireki_no>1` điền đủ.

---

## 6. Metadata sheet (dòng `<!--XLSX-META ...-->`)

Ngay trên `<table>` có 1 comment JSON giữ: `sheet` (tên sheet), `min/max_row`,
`min/max_col`, `freeze_panes`, `column_widths`, `row_heights`, `merged_cells`.

- **Thêm hàng** → cập nhật `max_row`. **Thêm cột** → cập nhật `max_col` (tránh — xem §1).
- Giữ `freeze_panes: "D5"` và `column_widths` hiện có (A rộng 44.63 cho cột diễn giải).
- **Không merge ô** (file hiện tại `merged_cells: []`). Nếu buộc phải merge, thêm
  range vào đây thì converter mới dựng lại đúng.

---

## 7. Quy trình sửa (BẮT BUỘC chọn 1 trong 2)

**Cách A — sửa trong Excel rồi sinh lại MD (khuyến nghị khi đổi nhiều):**
```bash
# sửa Dokusya_Tracking_Data.xlsx trong Excel → rồi:
python3 scripts/styled_xlsx_md.py to-md \
  "docs/zougen-028-029-and-validate-scr-016/Dokusya_Tracking_Data.xlsx"
```
`data-*` + `style` tự sinh đúng. **Cách an toàn nhất** để không sai lớp.

**Cách B — sửa trực tiếp MD rồi build ngược (khi đổi ít ô):**
```bash
python3 scripts/styled_xlsx_md.py to-xlsx \
  "docs/zougen-028-029-and-validate-scr-016/Dokusya_Tracking_Data.md"
```
Khi gõ tay: set **đồng thời** `data-*` và `style` (§0).

### Kiểm chứng round-trip (luôn chạy sau khi sửa)
```bash
python3 scripts/styled_xlsx_md.py to-xlsx "....md" /tmp/check.xlsx
python3 scripts/styled_xlsx_md.py to-md   /tmp/check.xlsx /tmp/check.md
# so body <table> của /tmp/check.md với bản .md đang sửa → phải giống hệt (idempotent)
```
Tiêu chí đạt: số ô, giá trị, `data-b/i/fc/fn/fs/fl/border/ha/va/w/nf/t`, freeze,
column_widths, tên sheet **khớp 100%** (như lần verify gốc: 2244 ô, 0 khác biệt).

---

## 8. Checklist trước khi commit

```
[ ] Mỗi hàng dữ liệu có đủ 66 <td> (kể cả <td></td>)
[ ] data-* và style khớp nhau trên mọi ô vừa sửa
[ ] Block theo đúng thứ tự ① 入力 → ② t_dokusya → ③ rireki + hàng trống ngăn cách
[ ] rireki_no (BA) & nhãn "#N" cột B khớp logic snapshot (file rules #2)
[ ] Ô đổi dùng đúng màu: vàng=zougen TRUE / xám=zougen FALSE / vàng đậm=đồng thời
[ ] Ô "cũ → mới" đậm đỏ FFB91C1C (hoặc FFFF0000 cho flag)
[ ] Ngày có data-t + data-nf đúng; số data-t="n"; bool data-t="b"
[ ] Màu mới (nếu có) đã thêm vào legend hàng 2
[ ] XLSX-META: max_row/max_col cập nhật, freeze=D5 giữ nguyên
[ ] Round-trip to-xlsx → to-md idempotent (0 khác biệt)
```
