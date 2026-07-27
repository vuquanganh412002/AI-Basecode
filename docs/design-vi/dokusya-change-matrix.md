# Ma trận thay đổi dữ liệu độc giả — MỘT bảng duy nhất

> Bổ sung cho [dokusya-data-lifecycle.md](./dokusya-data-lifecycle.md) (mô hình + quy tắc từng cột).
> **Hàng = 1 trường dữ liệu. Cột = 1 mode. Ô = giá trị thật.**
> Mốc: **hôm nay = `2026-07-26` (JST)**, người thao tác `account_id = 42`.

## Chú giải cột

| Mã | Mode | Chi tiết thao tác |
|---|---|---|
| **Đầu-P** | Trạng thái ban đầu 紙版 | `dokusya_id = 1001` 山田太郎, tạo 2026-06-10, `kaishi = 2026-07-01` |
| **P1** | Tạo mới 紙版 | ngày 2026-06-10 |
| **P2** | Sửa số lượng | `2 → 3`, `reserved`, `joho = 2026-09-01` |
| **P3** | Sửa cửa hàng | `301 → 305`, `reserved`, `joho = 2026-09-01` (giống SCR-015 hàng loạt) |
| **P4** | Sửa đ/c giao, `same=TRUE` | `chome_banchi: 中央通1-2-3 → 大通2-5-1`, `reserved`, `joho = 2026-09-01` |
| **P5** | Sửa đ/c giao, `same=FALSE` | `same_flg: TRUE→FALSE` + `haitatsu_chome_banchi: '' → 紺屋町3-1`, `joho = 2026-09-01` |
| **P6** | Sửa trường khác | `renrakusaki_1: 019-651-0001 → 019-651-9999`, chế độ `today`, `joho = 2026-07-26` |
| **P7** | Chèn **trước** dòng tương lai | đã có `#2@2026-09-01` (P2); nay chèn cửa hàng `301→305` với `joho = 2026-08-15` |
| **P8** | Huỷ lịch sử `取消` | huỷ `#2@2026-09-01`, lý do `'入力誤りのため取消'` |
| **P9** | Dừng thuê bao — Phase 1 | `POST /stop`, `chushi = 2026-10-31` |
| **P10** | Giải ước — Phase 2 (batch) | batch 5:00 ngày 2026-10-31 |
| **P11** | Tái đặt `再購読` | ngày 2026-11-10, `kaishi mới = 2026-12-01`, `busu = 2` |
| **Đầu-D** | Trạng thái ban đầu 電子版 | `dokusya_id = 2002` 佐藤花子, tạo 2026-07-26, `denshi_kaiin_id = 88123` |
| **D1** | Tạo mới 電子版 | ngày 2026-07-26, `kaishi = 2026-07-26` |
| **D2** | Sửa cửa hàng | `301 → 305`, `today` |
| **D3** | Sửa địa chỉ | `chome_banchi: 内丸5-6 → 大通1-1`, `today` |
| **D4** | Sửa trường khác | `email: hanako.sato@ → h.sato@example.jp`, `today` |
| **D5** | Sửa số lượng `1→2` | **✗ chặn** |
| **D6** | Đặt lịch tương lai | **✗ chặn** |
| **D7** | Huỷ lịch sử `取消` | **✗ chặn** |
| **D8** | Dừng thuê bao — Phase 1 | chọn tháng `2026-09` → `chushi = 2026-09-30` |
| **D9** | Giải ước — Phase 2 (batch) | batch ngày 2026-10-01 (`chushi <= hôm qua`) |
| **D10** | Tái đặt | `kaishi mới = 2026-12-01` |
| **D11** | Duyệt | trên `2003` (inbound tạo, `status = 0`), kèm `tanka_id = 91` |
| **D12** | Từ chối | trên `2003` |
| **S1** | Đồng bộ inbound — CREATE | `users.id = 88999` chưa có bên cloud |
| **S2** | Đồng bộ inbound — UPDATE | `users.88123`: `city 盛岡市→花巻市`, `first_name 花子→華子` |

`—` không đổi/không áp dụng · `↩` kế thừa nguyên vẹn từ dòng liền trước · `⧗` master **chưa** đổi, chỉ đổi khi batch chạy vào ngày áp dụng · `✗` bị chặn

## Bảng dữ liệu

| Trường | Đầu-P | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | P11 | Đầu-D | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | S1 | S2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Thực hiện được?** | | ✓ | ✓ ⁽ᵃ⁾ | ✓ ⁽ᵃ⁾ | ✓ ⁽ᵃ⁾ | ✓ ⁽ᵃ⁾ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | **✗** ⁽ᵇ⁾ | **✗** ⁽ᶜ⁾ | **✗** ⁽ᵈ⁾ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **━━ `t_dokusya` (master) ━━** | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| `dokusya_id` | 1001 | =1001 | — | — | — | — | — | — | — | — | — | — | 2002 | =2002 | — | — | — | ✗ | ✗ | ✗ | — | — | — | 2003 | 2003 | =2010 | — |
| `dokusya_shubetsu` | 1 | =1 | — | — | — | — | — | — | — | — | — | — | 2 | =2 | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | =2 | ✅ ghi đè |
| `tetsuzuki_shurui` | 1 | =1 | — | — | — | — | — | — | — | **1** ⁽ᵉ⁾ | **1→0** | **0→1** | 1 | =1 | — | — | — | ✗ | ✗ | ✗ | **1** ⁽ᵉ⁾ | **1→0** | **0→1** | — | — | =1 | ✅ |
| `dokusya_busu` | 2 | =2 | ⧗ 2→3 | 2 | 2 | 2 | 2 | ⧗ 2 ⁽ᶠ⁾ | 2 | 2 | **2→0** | →2 | 1 | =1 | 1 | 1 | 1 | ✗ | ✗ | ✗ | 1 | **1→0** | →1 | — | — | =1 | ❌ giữ |
| `hanbaiten_id` | 301 | =301 | 301 | ⧗ 301→305 | 301 | 301 | 301 | ⧗ 301→305 ⁽ᶠ⁾ | 301 | 301 | 301 | 301 | 301 | =301 | **301→305** | 305 | 305 | ✗ | ✗ | ✗ | 305 | 305 | 305 | — | — | resolve từ `ShopCd` | ❌ giữ 305 |
| `yubin_no`/`todofuken`/`shikuchoson`/`chome_banchi`/`tatemono` | 0201234/03/盛岡市/中央通1-2-3/'' | =đầu | — | — | ⧗ chome→大通2-5-1 | — | — | — | — | — | — | — | 0200023/03/盛岡市/内丸5-6/'' | =đầu | — | **chome→大通1-1** | — | ✗ | ✗ | ✗ | — | — | — | — | — | từ view | ✅ 盛岡市→花巻市 |
| `haitatsu_same_flg` | TRUE | =TRUE | — | — | TRUE | ⧗ **TRUE→FALSE** | — | — | — | — | — | — | TRUE | =TRUE | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | TRUE (電子版) | ✅ |
| `haitatsu_yubin_no`…`haitatsu_tatemono_mei` (5) | '' ×5 | ='' | — | — | ⧗ chome→紺屋町3-1 ⁽ᵍ⁾ | ⧗ chome→紺屋町3-1 | — | — | — | — | — | — | '' ×5 | ='' | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | '' | ✅ |
| `haitatsu_shimei_*`/`haitatsu_renrakusaki_*` (6) | '' ×6 | ='' | — | — | — | ⧗ =NEW | — | — | — | — | — | — | '' ×6 | ='' | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | '' | ❌ **không ghi đè** |
| `renrakusaki_1` | 019-651-0001 | =0001 | — | — | — | — | **→019-651-9999** | — | — | — | — | — | 019-651-0002 | =0002 | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | từ `tel1` | ✅ |
| `email` | '' | ='' | — | — | — | — | — | — | — | — | — | — | hanako.sato@… | =hanako.sato@… | — | — | **→h.sato@example.jp** | ✗ | ✗ | ✗ | — | — | — | — | — | bắt buộc | ✅ |
| `tanka_id` | 77 | =77 | — | — | — | — | — | — | — | — | — | — | 91 | =91 | — | — | — | ✗ | ✗ | ✗ | — | — | — | **NULL→91** | — | **NULL** | ❌ **giữ 91** ⁽ʰ⁾ |
| `shiharai_hoho` | 1 | =1 | — | — | — | — | — | — | — | — | — | — | 2 | =2 (cấm 6) | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | từ `payment_id` | ❌ chỉ CREATE |
| `dokusya_kaishi_date` | 2026-07-01 | =2026-07-01 ⁽ⁱ⁾ | pin | pin | pin | pin | pin | pin | — | — | — | **→2026-12-01** | 2026-07-26 | =2026-07-26 ⁽ʲ⁾ | pin | pin | pin | ✗ | ✗ | ✗ | pin | — | **→2026-12-01** | — | — | từ view | ✅ |
| `shoki_dokusya_kaishi_date` | 2026-07-01 | =2026-07-01 | bất biến | bất biến | bất biến | bất biến | bất biến | bất biến | bất biến | bất biến | bất biến | **2026-07-01 giữ** | 2026-07-26 | =2026-07-26 | bất biến | bất biến | bất biến | ✗ | ✗ | ✗ | bất biến | bất biến | **giữ** | — | — | =lần đầu | ❌ **bất biến** |
| `dokusya_chushi_date` | NULL | =NULL | ✗ DTO | ✗ DTO | ✗ DTO | ✗ DTO | ✗ DTO | ✗ DTO | →NULL ⁽ᵏ⁾ | **→2026-10-31 NGAY** | 2026-10-31 | **→NULL** | NULL | =NULL | ✗ DTO | ✗ DTO | ✗ DTO | ✗ | ✗ | ✗ | **→2026-09-30 NGAY** | 2026-09-30 | **→NULL** | — | — | từ view | ✅ |
| `joho_henko_tekiyo_date` | 2026-07-01 | =2026-07-01 | ⧗ →2026-09-01 | ⧗ →2026-09-01 | ⧗ →2026-09-01 | ⧗ →2026-09-01 | **→2026-07-26** | ⧗ →2026-08-15 | tính lại | ⧗ | ⧗ →2026-10-31 | →2026-12-01 | 2026-07-26 | =2026-07-26 | **→2026-07-26** | **→2026-07-26** | **→2026-07-26** | ✗ | ✗ | ✗ | ⧗ | ⧗ →2026-10-01 | →2026-12-01 | — | — | =ngày batch | ✅ =ngày batch |
| `seikyu_kaishi_month` | '202607' | ='202607' | — | — | — | — | — | — | — | — | — | — | '202608' | ='202608' | — | — | — | ✗ | ✗ | ✗ | — ⁽ˡ⁾ | — | — | — | — | từ view | ✅ |
| `rireki_no` | 1 | =1 | ⧗ 1→2 | ⧗ 1→2 | ⧗ 1→2 | ⧗ 1→2 | **1→2** | ⧗ | ⧗ | ⧗ | 2→3 | →4 | 1 | =1 | **1→2** | **2→3** | **3→4** | ✗ | ✗ | ✗ | ⧗ | 2→3 | →4 | **—** | **—** | =1 | ❌ |
| `denshi_shonin_status` | NULL | **=NULL** | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | 1 | **=1** ⁽ᵐ⁾ | 1 | 1 | 1 | ✗ | ✗ | ✗ | 1 | 1 | 1 | **0→1** | **0→2** | từ `approval` | ✅ |
| `denshi_kaiin_id` | NULL | =NULL | — | — | — | — | — | — | — | — | — | — | 88123 | **=88123** ⁽ⁿ⁾ | 88123 | 88123 | 88123 | ✗ | ✗ | ✗ | 88123 | 88123 | 88123 | 88999 | 88999 | **=88999** ⁽ᵒ⁾ | ❌ khoá khớp |
| `honshi_kodoku_flg` | FALSE | =FALSE | — | — | — | — | — | — | — | — | — | — | FALSE | =FALSE | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | =subscribe_flg | ⚠️ xem ⁽ᵖ⁾ |
| `deleted_at` | NULL | =NULL | — | — | — | — | — | — | — | — | — | — | NULL | =NULL | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | NULL | — |
| `created_by` / `created_at` | '42' / 06-10 | ='42' | — | — | — | — | — | — | — | — | — | — | '42' / 07-26 | ='42' | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | **'DENSHIBAN_SYNC'** | — |
| `updated_by` / `updated_at` | '42' / 06-10 | ='42' | '42'/07-26 | '42'/07-26 | '42'/07-26 | '42'/07-26 | '42'/07-26 | '42'/07-26 | — ⁽ᵠ⁾ | '42'/07-26 | auto | '42'/11-10 | '42' / 07-26 | ='42' | '42' | '42' | '42' | ✗ | ✗ | ✗ | '42' | auto | '42' | '42' | '42' | **'DENSHIBAN_SYNC'** | **'DENSHIBAN_SYNC'** |
| **━━ dòng `t_dokusya_rireki` MỚI ━━** | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| **Có sinh dòng?** | (#1) | **Có #1** | **Có #2** | **Có #2** | **Có #2** | **Có #2** | **Có #2** ⁽ʳ⁾ | **Có #3** | **Có #3** (đối ứng) | **Có #2** | **Có #3** | **Có #4** | (#1) | **Có #1** | **Có #2** | **Có #3** | **Có #4** | ✗ | ✗ | ✗ | **Có #2** | **Có #4** | **Có #5** | **KHÔNG** | **KHÔNG** | **Có #1** | **Có** |
| `rireki_no` | 1 | 1 | 2 | 2 | 2 | 2 | 2 | **3** ⁽ᶠ⁾ | 3 | 2 | 3 | 4 | 1 | 1 | 2 | 3 | 4 | ✗ | ✗ | ✗ | 2 | 4 | 5 | — | — | 1 | MAX+1 |
| `joho_henko_tekiyo_date` | 2026-07-01 | 2026-07-01 | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2026-07-26 | **2026-08-15** | 2026-09-01 ⁽ˢ⁾ | 2026-10-31 | 2026-10-31 | 2026-12-01 | 2026-07-26 | 2026-07-26 | 2026-07-26 | 2026-07-26 | 2026-07-26 | ✗ | ✗ | ✗ | 2026-09-30 | **2026-10-01** ⁽ᵗ⁾ | 2026-12-01 | — | — | ngày batch | ngày batch |
| `tetsuzuki_shurui` | 1 | 1 | ↩1 | ↩1 | ↩1 | ↩1 | ↩1 | ↩1 | ↩ | **↩1** ⁽ᵉ⁾ | **0** | **1** | 1 | 1 | ↩1 | ↩1 | ↩1 | ✗ | ✗ | ✗ | **↩1** | **0** | **1** | — | — | 1 | ✅ |
| `dokusya_busu` | 2 | 2 | **3** | ↩2 | ↩2 | ↩2 | ↩2 | **↩2** ⁽ᶠ⁾ | **2** (hoán đổi) | **0** | **0** | 2 | 1 | 1 | ↩1 | ↩1 | ↩1 | ✗ | ✗ | ✗ | **0** | **0** | 1 | — | — | 1 | ❌ |
| `hanbaiten_id` | 301 | 301 | ↩301 | **305** | ↩301 | ↩301 | ↩301 | **305** | 301 | ↩301 | ↩301 | 301 | 301 | 301 | **305** | ↩305 | ↩305 | ✗ | ✗ | ✗ | ↩305 | ↩305 | 305 | — | — | resolve | ❌ |
| `chome_banchi` | 中央通1-2-3 | 中央通1-2-3 | ↩ | ↩ | **大通2-5-1** | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩/NEW | 内丸5-6 | 内丸5-6 | ↩ | **大通1-1** | ↩ | ✗ | ✗ | ✗ | ↩ | ↩ | ↩ | — | — | từ view | ✅ |
| `haitatsu_same_flg` | TRUE | TRUE | ↩ | ↩ | ↩TRUE | **FALSE** | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | TRUE | TRUE | ↩ | ↩ | ↩ | ✗ | ✗ | ✗ | ↩ | ↩ | ↩ | — | — | TRUE | ✅ |
| `dokusya_chushi_date` | NULL | NULL | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | **2026-10-31** | **2026-10-31** | **NULL** | NULL | NULL | ↩ | ↩ | ↩ | ✗ | ✗ | ✗ | **2026-09-30** | **2026-09-30** | **NULL** | — | — | từ view | ✅ |
| `saishin_data_flg` | TRUE | **TRUE** | FALSE | FALSE | FALSE | FALSE | **TRUE** | FALSE | FALSE | FALSE | **TRUE** | **TRUE** ⁽ᵘ⁾ | TRUE | **TRUE** | **TRUE** | **TRUE** | **TRUE** | ✗ | ✗ | ✗ | FALSE | **TRUE** | **TRUE** | — | — | TRUE | TRUE |
| `shinki_flg` | TRUE | **TRUE** | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | ↩ | FALSE | FALSE | **TRUE** | TRUE | **TRUE** | FALSE | FALSE | FALSE | ✗ | ✗ | ✗ | FALSE | FALSE | **TRUE** | — | — | **TRUE** | FALSE |
| `kaiyaku_flg` | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE ⁽ᵛ⁾ | **FALSE** ⁽ᵉ⁾ | **TRUE** | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | ✗ | ✗ | ✗ | **FALSE** | **TRUE** | FALSE | — | — | FALSE | FALSE |
| **`zougen_hokoku_flg`** | TRUE | **TRUE** | **TRUE** | **TRUE** | **TRUE** | **TRUE** | **FALSE** | **TRUE** | ↩ | **TRUE** | **TRUE** | **TRUE** | TRUE | **TRUE** | **TRUE** | **TRUE** | **FALSE** | ✗ | ✗ | ✗ | **TRUE** | **TRUE** | **TRUE** | — | — | TRUE | tuỳ trường |
| `torikeshi_flg` | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | **TRUE** | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | FALSE | ✗ | ✗ | ✗ | FALSE | FALSE | FALSE | — | — | FALSE | FALSE |
| `henko_riyu` | '' | '' | '' | '' ⁽ʷ⁾ | '' | '' | '' | '' | **'取消'** | '' | '' | **'再購読'** | '' | '' | '' | '' | '' | ✗ | ✗ | ✗ | '' | '' | **'再購読'** | — | — | **'電子版連携'** | **'電子版連携'** |
| `biko` | '' | '' | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | **'入力誤りのため取消'** | ↩ | ↩ | ↩ | '' | '' | ↩ | ↩ | ↩ | ✗ | ✗ | ✗ | ↩ | ↩ | ↩ | — | — | từ `remarks1-5` | ✅ |
| `created_by` | '42' | '42' | '42' | '42' | '42' | '42' | '42' | '42' | '42' | '42' | **'batch'** | '42' | '42' | '42' | '42' | '42' | '42' | ✗ | ✗ | ✗ | '42' | **'batch'** | '42' | — | — | **'DENSHIBAN_SYNC'** | **'DENSHIBAN_SYNC'** |
| `zenkai_dokusya_busu` | NULL | **NULL** | **2** | 2 | 2 | 2 | 2 | **2** | **3** (hoán đổi) | 2 | 0 | **NULL** ⁽ˣ⁾ | NULL | **NULL** | 1 | 1 | 1 | ✗ | ✗ | ✗ | 1 | 0 | **NULL** ⁽ˣ⁾ | — | — | **NULL** | dòng trước |
| `zenkai_hanbaiten_id` | NULL | **NULL** | 301 | **301** | 301 | 301 | 301 | **301** | 301 | 301 | 301 | **NULL** ⁽ˣ⁾ | NULL | **NULL** | **301** | 305 | 305 | ✗ | ✗ | ✗ | 305 | 305 | **NULL** ⁽ˣ⁾ | — | — | **NULL** | dòng trước |
| `zenkai_yubin_no`…`zenkai_tatemono_mei` (5) | NULL ×5 | **NULL** | 0201234/03/盛岡市/中央通1-2-3/'' | như trái | như trái ⁽ʸ⁾ | như trái | như trái | như trái | hoán đổi | như trái | như trái | **NULL** ⁽ˣ⁾ | NULL ×5 | **NULL** | 0200023/03/盛岡市/内丸5-6/'' | như trái | như trái | ✗ | ✗ | ✗ | như trái | như trái | **NULL** ⁽ˣ⁾ | — | — | **NULL** | dòng trước |
| `denshi_shonin_status` | NULL | NULL | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | 1 | 1 | ↩1 | ↩1 | ↩1 | ✗ | ✗ | ✗ | ↩1 | ↩1 | ↩1 | **0→1 tại chỗ** ⁽ᶻ⁾ | **0→2 tại chỗ** ⁽ᶻ⁾ | từ `approval` | ✅ |
| Mọi trường nghiệp vụ khác | — | =NEW | ↩ | ↩ | ↩ | ↩ | ↩ | ↩ | copy dòng bị huỷ | ↩ | ↩ | ↩/NEW | — | =NEW | ↩ | ↩ | ↩ | ✗ | ✗ | ✗ | ↩ | ↩ | ↩/NEW | — | — | hằng số | chỉ cột đổi |
| **━━ TÁC ĐỘNG KHÁC ━━** | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| Dòng đang `saishin` | — | — | →FALSE khi đến hạn | như trái | như trái | như trái | **→FALSE ngay** | như trái | — | — | →FALSE | →FALSE | — | — | **→FALSE ngay** | **→FALSE ngay** | **→FALSE ngay** | ✗ | ✗ | ✗ | — | →FALSE | →FALSE | — | — | — | →FALSE |
| Dòng kế tiếp | — | — | — | — | — | — | — | **`#2`: `zenkai_hb 301→305`, `zougen` tính lại; giá trị hiện tại GIỮ NGUYÊN** | — | — | — | — | — | — | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | — | — |
| Dòng bị huỷ | — | — | — | — | — | — | — | — | **`#2`: `torikeshi=TRUE`, `biko='入力誤りのため取消'`** | — | — | — | — | — | — | — | — | ✗ | ✗ | ✗ | — | — | — | — | — | — | — |
| Dòng lifecycle cũ | — | — | — | — | — | — | — | — | — | — | — | **`#1–#3` bị loại (`rireki_no < 4`)** | — | — | — | — | — | ✗ | ✗ | ✗ | — | — | **bị loại** | — | — | — | — |
| **Outbound denshiban** | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅ `create` | ✅ `update` | ✅ `update` | ✅ `update` | ✗ | ✗ | ✗ | ✅ `cancel` `ym=202609` | ❌ **batch không gửi** | ✅ `update` | ✅ `approve` | ✅ `unapprove` | ❌ **không gửi ngược** | ❌ |

### Ghi chú ô

⁽ᵃ⁾ Chỉ chạy được ở chế độ `reserved`. Ở chế độ `today`, 紙版 bị chặn: `帳票に影響する変更は予約変更（未来日を指定）で行ってください。`
⁽ᵇ⁾ `dokusya_busu` — `電子版の購読部数は1で登録してください。`
⁽ᶜ⁾ `change_mode` — `電子版は当日変更のみ可能です。予約変更はできません。`
⁽ᵈ⁾ `canTorikeshi` yêu cầu `dokusya_shubetsu = 1` → 電子版 không bao giờ huỷ lịch sử được.
⁽ᵉ⁾ **Phase 1 KHÔNG đổi `tetsuzuki_shurui`** — dòng đặt lịch kế thừa `= 1` và `kaiyaku_flg = FALSE`; đó chính là điều kiện để batch Phase 2 nhận diện.
⁽ᶠ⁾ Dòng chèn `#3` lấy `busu = 2` **↩ từ `#1`** (dòng liền trước theo `joho`), không phải `3` của `#2`. `rireki_no = 3` lớn nhất dù `joho` nhỏ hơn `#2`. Xem "Timeline P7" bên dưới.
⁽ᵍ⁾ Ghi vào DB nhưng **không dùng để giao** vì `same_flg = TRUE` → `zougen_hokoku_flg = FALSE` (biến thể này khác ô P4 chính, xem "Biến thể P4").
⁽ʰ⁾ Draft inbound luôn `tanka_id = null` → nếu đưa vào diff sẽ **xoá mất đơn giá thật**.
⁽ⁱ⁾ 紙版 bắt buộc `kaishi > hôm nay`.  ⁽ʲ⁾ 電子版 cho phép `kaishi = hôm nay`.
⁽ᵏ⁾ Chỉ khi dòng bị huỷ là dòng đặt lịch dừng.
⁽ˡ⁾ `seikyu_kaishi_month` rỗng ⇒ 電子版 **không đặt lịch dừng được**: `この読者料金の徴収はまだ開始されていません。`
⁽ᵐ⁾ Đăng ký 電子版 qua màn hình = thao tác nhân viên → `1 承認済` luôn (không phải `0`).
⁽ⁿ⁾ Lấy từ phản hồi `create` của denshiban, ghi trong cùng transaction.  ⁽ᵒ⁾ Stamp riêng sau `applyChange` (cột master-only).
⁽ᵖ⁾ `honshi_kodoku_flg` **không phải cột của `t_dokusya_rireki`** → xem cảnh báo ① bên dưới.
⁽ᵠ⁾ `取消` không stamp `updated_by`.
⁽ʳ⁾ Nếu gửi lại đúng giá trị cũ (`019-651-0001`) thì `diffChangedFields` trả `[]` → **0 dòng**, nhưng `updated_by` vẫn stamp và `t_log` vẫn ghi `UPDATE`.
⁽ˢ⁾ Dòng đối ứng dùng **cùng `joho`** với dòng bị huỷ.
⁽ᵗ⁾ 電子版 Phase 2 lấy `joho = chushi + 1 ngày` (紙版 lấy đúng `chushi`).
⁽ᵘ⁾ `TRUE` **ngay** dù `joho = 2026-12-01` còn tương lai — vì `#4` mở lifecycle mới, không có dòng hiệu lực trong lifecycle đó → fallback về chính dòng `新規`.
⁽ᵛ⁾ Nếu dòng bị huỷ là dòng giải ước, dòng đối ứng khôi phục `tetsuzuki = 1`, `kaiyaku_flg = FALSE`.
⁽ʷ⁾ `'販売店一括置換'` nếu thực hiện qua SCR-015.
⁽ˣ⁾ Tái đặt ghi **toàn bộ `zenkai_*` = NULL** — cố ý giống hệt dòng tạo mới đầu tiên.
⁽ʸ⁾ Luôn là **đ/c giao hiệu lực** của dòng trước: `#1.same_flg = TRUE` → lấy địa chỉ độc giả.
⁽ᶻ⁾ Duyệt/Từ chối **không sinh dòng mới** — `UPDATE` thẳng vào dòng đang `saishin_data_flg = TRUE`. Điều kiện: trạng thái hiện tại phải `= 0`.

### Timeline P7 — hệ quả của việc chèn trước dòng tương lai

`t_dokusya` của `1001` biến động theo ngày:

| Ngày | `dokusya_busu` | `hanbaiten_id` | `rireki_no` |
|---|---|---|---|
| 2026-07-26 | 2 | 301 | 1 |
| 2026-08-15 (batch) | 2 | **305** | 3 |
| 2026-09-01 (batch) | **3** | **301 ← quay lại cửa hàng cũ** | 2 |

Dòng `#2` giữ nguyên `hanbaiten_id = 301` (chép từ `#1` lúc tạo) nên khi đến hạn nó **ghi đè** thay đổi cửa hàng của `#3` — chính sách "B-thuần" khách hàng chốt 2026-07. Ngoài ra `#3` **không huỷ được** vì không phải dòng cuối chuỗi (`#2` có `joho` lớn hơn).

### Biến thể P4 — sửa `haitatsu_*` nhưng GIỮ `same_flg = TRUE`

Vẫn sinh dòng `#2` (diff thấy `haitatsu_chome_banchi: '' → 紺屋町3-1`), nhưng `zougen_hokoku_flg = **FALSE**` vì đ/c giao **hiệu lực** vẫn là `中央通1-2-3`. Dữ liệu được lưu nhưng **không vào phiếu 増減連絡票**.

### Ai được đồng bộ chiều nào

| `dokusya_id` | `shubetsu` | `shiharai_hoho` | `tanka.campaign_flg` | `denshi_kaiin_id` | Outbound | Inbound | Lý do |
|---|---|---|---|---|---|---|---|
| `1001` 山田太郎 | 1 紙版 | 1 | — | NULL | ❌ | ❌ | Cổng chỉ nhận `shubetsu = 2` |
| `2002` 佐藤花子 | 2 電子版 | 2 | false | 88123 | ✅ đủ 5 mode | ✅ | Luồng chính |
| `2003` | 2 電子版 | 2 | false | 88999 | ✅ | ✅ | Do inbound tạo |
| `2004` | 2 電子版 | 2 | **true** | 88777 | ❌ chặn ở `denshibanApiFor` | ❌ chặn bởi `campagna_flg=1` | **Vô hình cả 2 chiều** |
| `2005` | 2 電子版 | **6 クレカ** | false | 88555 | ⚠️ chỉ `approve`/`unapprove` lọt | ✅ | create/update/stop đã 403 |
| `3006` | **3 併読** | 2 | — | 88333 | ❌ **không bao giờ** | ✅ **có** | Hệ ngoài là nguồn sự thật cho 併読 |
| `2007` (xoá mềm) | 2 | 2 | false | 88111 | ❌ | ❌ | UNIQUE bộ phận loại `deleted_at IS NOT NULL` |

Điều kiện lấy về phía denshiban (`users`): `collecting='1'` **hoặc** (`treatment=1 AND payment_id=6`), **trừ** `COALESCE(campagna_flg,0)=1`. Không lọc `deleted_at` — hội viên `status=9` (đã huỷ) vẫn lấy để ghi nhận giải ước. ⚠️ Cột bên denshiban viết là **`campagna_flg`**, không phải `campaign_flg` — đã xác nhận với khách hàng, không sửa chính tả.

---

## Cảnh báo

**① `honshi_kodoku_flg` — nghi vấn sinh dòng lịch sử lặp vô hạn (cần xác minh).** Cột nằm trong danh sách so sánh inbound và được so với **master**, nhưng `t_dokusya_rireki` **không có** cột này → nhánh S2 không persist được và không quay về master. Nếu `users.88123.subscribe_flg='1'` mà `2002.honshi_kodoku_flg=FALSE` → mỗi lần batch chạy (10 phút) đều thấy diff → **144 dòng/ngày cho 1 độc giả**, master không bao giờ đổi. Nhánh S1 (CREATE) không bị.
```sql
SELECT dokusya_id, COUNT(*) AS so_dong, MIN(created_at), MAX(created_at)
  FROM t_dokusya_rireki WHERE created_by = 'DENSHIBAN_SYNC'
 GROUP BY dokusya_id HAVING COUNT(*) > 5 ORDER BY so_dong DESC;
```

**② `haitatsu_same_flg` không nằm trong danh sách chặn chế độ `today` của 紙版.** Danh sách chặn có `dokusya_busu`, `hanbaiten_id` và 10 cột địa chỉ, **nhưng thiếu `haitatsu_same_flg`**. Chỉ cần lật `TRUE→FALSE` là sinh được dòng `zougen_hokoku_flg=TRUE` với `joho = hôm nay` — đúng thứ luật "báo cáo phải đặt lịch trước" muốn ngăn. Cần xác nhận cố ý hay thiếu sót.

**③ D11/D12 không kiểm tra bản ghi chỉ đọc, và `Number(NULL) = 0`.** `changeApprovalStatus` không gọi `isDokusyaReadOnly` → `2005` (電子版+クレカ) vẫn duyệt được và kích hoạt outbound. Guard là `Number(before.denshiShoninStatus) !== 0`, mà 紙版 `1001` có `NULL` → `Number(null) = 0` → **`PUT /dokusya/1001/approve` vẫn chạy được** trên một độc giả báo giấy. Màn hình không hiện nút nên chưa lộ.
