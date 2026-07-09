# Seed dữ liệu ja_id=108 (portable, INSERT-ONLY)

Bộ dump toàn bộ dữ liệu của `ja_id = 108` để mang sang máy khác seed lại,
**chỉ thêm dữ liệu ja_108, không đụng chạm dữ liệu khác** trên máy đích.

## Files

| File | Vai trò |
|---|---|
| `seed-ja108-full.sql` | **File mang đi** — chạy `psql -f` trên máy đích. 161 câu `INSERT ... ON CONFLICT DO NOTHING`. |
| `gen-seed-ja108.sh` | Generator — chạy lại trên máy nguồn để cập nhật file khi dữ liệu đổi. |

## Đảm bảo AN TOÀN với dữ liệu khác

- **Chỉ INSERT** các row `ja_id=108` — KHÔNG có `DELETE`/`UPDATE` bất kỳ bảng nào.
- **`ON CONFLICT DO NOTHING`** → row đã tồn tại thì bỏ qua, không ghi đè; dữ liệu
  các JA khác không bị chạm. Chạy lại nhiều lần an toàn (idempotent).
- **Thứ tự INSERT theo FK (cha → con)** → không cần tắt FK, không cần superuser,
  chạy bằng user thường.
- **1 transaction** (`BEGIN`/`COMMIT`) → lỗi giữa chừng thì rollback toàn bộ,
  DB không bị nửa vời.
- Cuối file có `setval` đẩy sequence identity tới `MAX(id)` của **toàn bảng**
  (đã gồm dữ liệu máy đích) → chỉ chỉnh bộ đếm sequence, KHÔNG sửa/xóa row nào,
  và luôn đúng để app không cấp trùng id về sau.

Đã **kiểm thử cô lập**: xóa sạch ja_108 rồi nạp lại với FK bật → 161/161 row vào
đúng; chạy lại khi đã có dữ liệu → 161/161 bỏ qua, không lỗi.

## Bảng được dump (thứ tự load: cha → con)

`m_ja` (1) → `m_kanri_shiten` (2) → `m_shiten` (4) → `m_tanka` (12) →
`m_hanbaiten` (13) → `m_account` (3) → `t_dokusya` (36) → `t_dokusya_rireki` (66) →
`t_koza_furikae` (3) → `t_log` (20) → `t_file_download` (1) = **161 row**.

> `m_tanka` đặt trước `m_hanbaiten` vì `m_hanbaiten.haitatsuryo_tanka_id → m_tanka`.

## ⚠️ Điều kiện tiên quyết trên máy đích

1. **Schema đã tạo** (đã chạy migration): `npm run migration:run`.
2. **Base seed / reference data toàn cục đã có**: `m_code`, `m_todofuken`,
   `m_roles`, `m_permissions` và các **account NICHINO gốc**. File này KHÔNG chứa
   chúng (không thuộc ja_id=108). Các bảng `m_*` tham chiếu `m_todofuken`;
   `t_log` có thể tham chiếu account_id gốc; `m_account` tham chiếu `m_roles`.

Không cần superuser, không cần tắt FK.

## Load trên máy đích

```bash
# Docker:
docker exec -i <postgres_container> psql -U <user> -d <db> \
  -v ON_ERROR_STOP=1 < seed-ja108-full.sql

# psql cài sẵn:
psql -U <user> -d <db> -v ON_ERROR_STOP=1 -f seed-ja108-full.sql
```

> Lưu ý: file chèn id tường minh (ja_id=108, dokusya_id, hanbaiten_id…). Nếu máy
> đích **đã có JA khác chiếm đúng các id đó**, câu tương ứng sẽ bị `ON CONFLICT`
> bỏ qua (dữ liệu ja_108 khi đó không vào trọn vẹn). Với DB dev sạch/tương đương
> thì các id trùng khớp nên nạp đủ.

## Tạo lại file seed (máy nguồn)

```bash
cd docs/seed-ja108
./gen-seed-ja108.sh                      # dùng docker container mặc định
# hoặc trỏ psql khác:
PSQL="psql -U postgres -d agrinews_dev" ./gen-seed-ja108.sh
```
