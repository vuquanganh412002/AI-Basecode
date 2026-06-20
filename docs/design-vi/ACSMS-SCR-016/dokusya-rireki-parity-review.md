# Báo cáo kiểm tra: Logic lưu lịch sử SCR-016 (import hàng loạt) so với SCR-011 (đơn lẻ)

> Ngày: 2026-06-18
> Phạm vi: đối chiếu logic ghi `t_dokusya_rireki` (và các flg) khi SCR-016 tạo/sửa hàng loạt với SCR-011 tạo/sửa đơn lẻ.
> Kết luận: **CHƯA KHỚP** — có 4 sai lệch ở phần lưu lịch sử, trong đó 1 lỗi nghiêm trọng (duplicate-key).

---

## 1. Chuẩn tham chiếu — SCR-011 đặt rireki thế nào

### Khi tạo (`create`) — [dokusya.service.ts:638-646](../../../apps/backend/src/modules/dokusya/dokusya.service.ts#L638-L646)

- `rireki_no` = 1
- `saishin_data_flg` (最新データフラグ / cờ bản ghi mới nhất) = `true`
- `shinki_flg` (新規フラグ / cờ đăng ký mới) = `true` khi `tetsuzuki_shurui===1` (新規)
- `kaiyaku_flg` (解約フラグ / cờ hủy) = `true` khi `tetsuzuki_shurui===0` (解約)
- `zougen_hokoku_flg` (増減報告フラグ / cờ báo cáo tăng-giảm) = **`true`** (mới đăng ký = 増, luôn vào báo cáo)
- `henko_riyu` (変更理由 / lý do thay đổi) = `''`

### Khi sửa (`update`) — [dokusya.service.ts:757-819](../../../apps/backend/src/modules/dokusya/dokusya.service.ts#L757-L819)

- B1: tắt `saishin_data_flg` của các bản ghi cũ → `false`
- B2: `rireki_no` = `MAX+1`, **và master `t_dokusya.rireki_no` cũng được bump** ([buildUpdatePartial:1419](../../../apps/backend/src/modules/dokusya/dokusya.service.ts#L1419))
- `kaiyaku_flg` = `true` khi `tetsuzuki_shurui===0`
- `zougen_hokoku_flg` = `true` chỉ khi địa chỉ (住所5項目) / 購読部数 / 販売店 thay đổi
- Lưu `zenkai_*` (前回値 / giá trị kỳ trước) phục vụ 増減連絡票

---

## 2. SCR-016 thực tế làm gì — [applyImportRow:3402-3469](../../../apps/backend/src/modules/dokusya/dokusya.service.ts#L3402-L3469)

Cả 4 nhánh (`NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL` / 一括中止) đều dùng **chung một câu `INSERT ... SELECT`**, và trong danh sách cột chỉ set rõ:

- `saishin_data_flg` = `true` ✓
- `henko_riyu` = `'Excel取込'`
- `created_by` = `$4`

→ **`shinki_flg`, `kaiyaku_flg`, `zougen_hokoku_flg` KHÔNG có trong danh sách cột**, nên rơi về DEFAULT của DDL = `false` ([CreateTDokusyaRireki:78-80](../../../apps/backend/src/database/migrations/1711900800017-CreateTDokusyaRireki.ts#L78-L80)).
→ `zenkai_*` cũng không được set → `NULL`.

Các câu `UPDATE t_dokusya` ([3346-3399](../../../apps/backend/src/modules/dokusya/dokusya.service.ts#L3346-L3399)) cho UPDATE/中止 **không tăng `rireki_no`**.

---

## 3. Các sai lệch

| # | Vấn đề | SCR-011 | SCR-016 | Mức độ |
|---|--------|---------|---------|--------|
| **A** | Cờ lịch sử khi NEW (tạo nhiều) | `shinki_flg=true` (新規), `zougen_hokoku_flg=true` | cả hai = `false` | **Bug** |
| **B** | `kaiyaku_flg` / `zougen_hokoku_flg` khi UPDATE & 一括中止 | đặt theo 解約 / thay đổi dữ liệu | luôn `false` | **Bug** |
| **C** | `zenkai_*` (前回値 cho 増減連絡票) | lưu khi sửa | không bao giờ lưu | **Bug** |
| **D** | Master `t_dokusya.rireki_no` khi UPDATE/中止 | bump `MAX+1` | **không bump** | **Bug nghiêm trọng** |
| E | `henko_riyu` | `''` | `'Excel取込'` | Khác biệt cố ý, chấp nhận được |

### Mục A — trọng tâm "tạo nhiều" (NEW mode)
Mỗi 購読者 tạo qua import sẽ có `shinki_flg=false` và `zougen_hokoku_flg=false`, nên **không lên báo cáo 増減連絡票** và cờ 新規 sai — khác hẳn SCR-011 tạo đơn lẻ.

### Mục D — lỗi nghiêm trọng (duplicate-key)
Với `UPDATE_ALL` / `UPDATE_PARTIAL` / 一括中止: master `rireki_no` không tăng, sau đó INSERT lịch sử copy `d.rireki_no` (không đổi) → trùng với bản ghi lịch sử cũ → **vi phạm unique index `UQ_t_dokusya_rireki (dokusya_id, rireki_no)`** ([:101](../../../apps/backend/src/database/migrations/1711900800017-CreateTDokusyaRireki.ts#L101)) → crash duplicate-key trên Postgres thật với bất kỳ 購読者 đã có lịch sử.

- Không có DB trigger nào tự tăng `rireki_no` (đã kiểm tra toàn bộ migrations).
- `NEW` mode thì OK vì master mới dùng `DEFAULT 1` và chưa có lịch sử trước đó.

---

## 4. Vì sao chưa bị phát hiện

Toàn bộ test write-path của import đều bị `.skip` vì pg-mem không chạy được `INSERT ... RETURNING` / `ANY()` ([dokusya-import.integration.spec.ts:334,397,408](../../../apps/backend/test/integration/dokusya-import.integration.spec.ts#L334)).

Lần verify thủ công 2026-06-10 chỉ kiểm tra NEW mode trả 200 và "có" bản ghi rireki — **không assert giá trị các flg**, và **không test UPDATE/中止**.

---

## 5. Hướng sửa đề xuất

1. Đưa `shinki_flg`, `kaiyaku_flg`, `zougen_hokoku_flg` vào INSERT lịch sử của `applyImportRow`, tính theo `tetsuzuki_shurui` + chế độ import (giống SCR-011):
   - `NEW` → `shinki_flg=true`, `zougen_hokoku_flg=true`
   - 一括中止 → `kaiyaku_flg=true`, `zougen_hokoku_flg=true`
   - `UPDATE_*` → tính theo thay đổi 購読部数 / 住所 / 販売店
2. `UPDATE_ALL` / `UPDATE_PARTIAL` / 一括中止: thêm `rireki_no = rireki_no + 1` vào SET (hoặc dùng `nextRirekiNo` như SCR-011) để tránh trùng unique index.
3. Cân nhắc lưu `zenkai_*` cho nhánh UPDATE để 増減連絡票 hiển thị đúng giá trị kỳ trước.
4. Thêm integration test (chạy trên Postgres thật, không pg-mem) assert giá trị các flg cho từng mode, đặc biệt re-import UPDATE để bắt lỗi duplicate-key.
