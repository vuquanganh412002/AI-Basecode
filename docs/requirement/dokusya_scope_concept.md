# Dokusya — Phạm vi dữ liệu, Cấu trúc tổ chức và Luồng nghiệp vụ

## 1. Cấu trúc phân cấp tổ chức

```
NICHINO (日農)
└── JA (m_ja)
    ├── chuokai_flg = 1 → CHUOKAI (中央会)
    └── chuokai_flg = 0 → JA_HONTEN (JA本店)
        └── m_kanri_shiten (管理支店) — đơn vị billing/quản lý
            └── m_shiten (支店) — chi nhánh vật lý
                └── t_dokusya_rireki (購読者履歴) — lịch sử subscriber
```

```
JA (m_ja)
└── m_hanbaiten (販売店) — nhà phân phối, phẳng dưới JA (không thuộc kanri_shiten hay shiten)
```

**Lưu ý quan trọng:** `m_hanbaiten` chỉ có `ja_id`, **không có** `kanri_shiten_id` hay `shiten_id`. Đây là master dữ liệu chung cho toàn bộ JA.

---

## 2. Phân biệt kanri_shiten vs shiten vs hanbaiten

| Thuộc tính | kanri_shiten (管理支店) | shiten (支店) | hanbaiten (販売店) |
|---|---|---|---|
| Bảng | `m_kanri_shiten` | `m_shiten` | `m_hanbaiten` |
| Cha | `m_ja` | `m_ja` + `m_kanri_shiten` | `m_ja` |
| Vai trò | Đơn vị billing, gửi báo cáo tăng giảm | Chi nhánh vật lý, nơi dokusya đến giao dịch | Người phân phối báo đến tay khách hàng |
| Scope session | `kanri_shiten_id` trong JWT | N/A | N/A |
| Ảnh hưởng DataScope | JA_KANRI_SHITEN chỉ thấy dokusya cùng `kanri_shiten_id` | Không ảnh hưởng DataScope | Không ảnh hưởng DataScope |

### kanri_shiten_code format

```
1AA - BBBB - CCC
 │      │      └─ số thứ tự
 │      └─ 3300 → CHUOKAI (中央会)
 │         5XXX → JA thường
 └─ 3 ký tự đầu xác định tỉnh/thành
```

---

## 3. Quyền tạo / sửa theo từng role

### kanri_shiten

| Role | Tạo | Sửa (full) | Sửa (một số field) | Xem |
|---|---|---|---|---|
| NICHINO_ADMIN | ✅ | ✅ | ✅ | ✅ |
| NICHINO_STAFF | ❌ | ❌ | ❌ | ❌ |
| CHUOKAI | ❌ | ❌ | ✅ `yubinNo, address, tel, fax, biko` | ✅ (chỉ kanri_shiten của mình) |
| JA_HONTEN | ❌ | ❌ | ✅ `yubinNo, address, tel, fax, biko` | ✅ (chỉ kanri_shiten của JA mình) |
| JA_KANRI_SHITEN | ❌ | ❌ | ✅ `yubinNo, address, tel, fax, biko` | ✅ (chỉ kanri_shiten của mình) |

> NICHINO_ADMIN mới có quyền tạo/xóa kanri_shiten. Các JA role chỉ sửa được một số field hành chính.

### shiten

| Role | Tạo | Sửa (full) | Sửa (một số field) | Xem |
|---|---|---|---|---|
| NICHINO_ADMIN | ✅ | ✅ | ✅ | ✅ |
| NICHINO_STAFF | ❌ | ❌ | ❌ | ❌ |
| CHUOKAI | ❌ | ❌ | ✅ `shitenCode, shitenName, shitenNameKana` | ✅ (chỉ shiten của mình) |
| JA_HONTEN | ❌ | ❌ | ✅ `shitenCode, shitenName, shitenNameKana` | ✅ (chỉ shiten của JA mình) |
| JA_KANRI_SHITEN | ❌ | ❌ | ✅ `shitenCode, shitenName, shitenNameKana` | ✅ (shiten thuộc kanri_shiten của mình) |

> Khi sửa `shitenCode, shitenName, shitenNameKana` — hệ thống phải cập nhật đồng thời tất cả record trong `t_dokusya_rireki` đang dùng shiten đó.

### hanbaiten

| Role | Tạo | Sửa | Xóa | Xem | Daiko input |
|---|---|---|---|---|---|
| NICHINO_ADMIN | ❌ | ❌ | ❌ | ❌ | ❌ |
| NICHINO_STAFF | ❌ | ❌ | ❌ | ❌ | ✅ (thay mặt bất kỳ JA) |
| CHUOKAI | ✅ | ✅ | ✅ | ✅ | ❌ |
| JA_HONTEN | ✅ | ✅ | ✅ | ✅ | ❌ |
| JA_KANRI_SHITEN | ✅ | ✅ | ✅ | ✅ | ❌ |

> Tất cả JA role xem hanbaiten theo `ja_id` — **không bị giới hạn theo kanri_shiten_id**. Hanbaiten là tài sản chung của cả JA.

---

## 4. DataScope khi truy vấn dokusya

| Role | Điều kiện WHERE |
|---|---|
| NICHINO_ADMIN / NICHINO_STAFF | Không giới hạn |
| CHUOKAI | `ja_id = session.ja_id` |
| JA_HONTEN | `ja_id = session.ja_id` |
| JA_KANRI_SHITEN | `ja_id = session.ja_id AND kanri_shiten_id = session.kanri_shiten_id` |

---

## 5. ja_id trong tạo / sửa dokusya

### Tạo mới (CREATE)

`ja_id` **không phải field user nhập**. Hệ thống tự set từ session:

```
session.ja_id → t_dokusya_rireki.ja_id  (auto, không thể override)
```

API `POST /api/v1/dokusya` nhận body **không có** trường `ja_id`. Service lấy từ `req.user.ja_id`.

### Sửa (UPDATE)

`ja_id` **không thể thay đổi** — immutable suốt vòng đời dokusya.

**Lý do:**
- Dokusya gắn với JA theo địa bàn địa lý
- `hanbaiten` cũng thuộc `ja_id` — nếu đổi `ja_id` thì hanbaiten sẽ thành invalid
- Trường hợp khách hàng chuyển vùng → nghiệp vụ là **kaiyaku (解約)** tại JA cũ, **shinki (新規)** tại JA mới

### Tóm tắt tính bất biến của các field

| Field | Có thể đổi không? | Cơ chế khi đổi |
|---|---|---|
| `ja_id` | ❌ Không bao giờ | Immutable, set từ session lúc CREATE |
| `kanri_shiten_id` | ✅ Có thể | Tạo rireki mới, `zougen_hokoku_flg = 1` |
| `shiten_id` | ✅ Có thể | Tạo rireki mới |
| `hanbaiten_id` | ✅ Có thể | Tạo rireki mới, `zenkai_hanbaiten_id` ghi lại cũ |
| `busu` (部数) | ✅ Có thể | Tạo rireki mới, `zougen_hokoku_flg = 1` |

---

## 6. Luồng nghiệp vụ: Khách hàng đổi hanbaiten

### Tình huống
Khách hàng đang nhận báo từ **A販売店**, muốn chuyển sang **B販売店** từ ngày **10/10**.

### Trước khi đổi

| rireki_no | hanbaiten_id | zenkai_hanbaiten_id | saishin_data_flg | zougen_hokoku_flg | dokusya_chushi_date |
|---|---|---|---|---|---|
| 2 | A販売店 | (lần trước) | `true` | 0 | NULL |

### Khi thực hiện đổi

Hệ thống **không UPDATE record cũ inline**. Thay vào đó dùng pattern append-only:

**Bước 1 — Close record hiện tại (rireki_no=2):**
```
dokusya_chushi_date = 10/10
saishin_data_flg    = false
```

**Bước 2 — Tạo record mới (rireki_no=3):**
```
hanbaiten_id         = B販売店  (mới)
zenkai_hanbaiten_id  = A販売店  (cũ — dùng cho báo cáo tăng giảm)
hanbaiten_tekiyo_date = 10/10
zougen_hokoku_flg    = 1        (cần đưa vào 増減連絡票)
saishin_data_flg     = true
dokusya_chushi_date  = NULL
```

**Toàn bộ wrap trong 1 transaction + ghi audit log vào `t_log`.**

### Báo cáo 増減連絡票（販売店）sau khi đổi

Query: `変更適用日 = 10/10 AND zougen_hokoku_flg = 1`

So sánh `hanbaiten_id` vs `zenkai_hanbaiten_id`:

| 販売店 | 増（新規） | 減（解約） | Net |
|---|---|---|---|
| A販売店 | 0 | 1 | **-1** (mất khách) |
| B販売店 | 1 | 0 | **+1** (có khách mới) |

Cả hai hanbaiten đều nhận được thông báo thay đổi qua report này.

### Ai có quyền thực hiện?

| Role | Điều kiện |
|---|---|
| JA_KANRI_SHITEN | Chỉ với dokusya thuộc `kanri_shiten_id` của mình |
| JA_HONTEN | Tất cả dokusya trong JA của mình |
| CHUOKAI | Tất cả dokusya trong JA (trung ương hội) của mình |

Permission cần: `dokusya.update` (đổi 1 người) | `dokusya.replace_hanbaiten` (đổi hàng loạt)

---

## 7. Luồng nghiệp vụ: Khách hàng đổi kanri_shiten / shiten

Tương tự hanbaiten — cũng dùng append-only rireki pattern. Điểm khác biệt:

- `kanri_shiten_id` thay đổi → `zougen_hokoku_flg = 1` (ảnh hưởng báo cáo tăng giảm của cả JA)
- `shiten_id` thay đổi → có thể có hoặc không có `zougen_hokoku_flg` tùy nghiệp vụ cụ thể
- Không có field `zenkai_kanri_shiten_id` hay `zenkai_shiten_id` — báo cáo tăng giảm theo kanri_shiten chỉ nhìn vào `kanri_shiten_id` của record hiện tại so với kỳ trước

---

## 8. Tóm tắt nhanh

```
┌─────────────────────────────────────────────────────────────┐
│  ja_id      → KHÔNG BAO GIỜ thay đổi (set từ session)      │
│  kanri_shiten_id → Có thể đổi (tạo rireki mới)             │
│  shiten_id  → Có thể đổi (tạo rireki mới)                  │
│  hanbaiten_id → Có thể đổi (tạo rireki mới,                │
│                 zenkai_hanbaiten_id ghi lại cũ)             │
│                                                             │
│  Mọi thay đổi đều APPEND-ONLY vào t_dokusya_rireki         │
│  Không có UPDATE trực tiếp vào record đang active           │
└─────────────────────────────────────────────────────────────┘
```
