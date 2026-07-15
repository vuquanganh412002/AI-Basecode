# Plan implement — Đồng bộ Cloud → Denshiban (chiều RA)

> Nguồn spec: [Display-Rireki-And-Mapping-Denshiban.md](./Display-Rireki-And-Mapping-Denshiban.md)
> Ma trận field: [outbound-field-matrix.md](./outbound-field-matrix.md) ← **contract của Pha 1**
>
> **Phạm vi hiện tại: CHỈ chiều RA (cloud → denshiban).**
> Chiều VÀO (batch `dokusya-sync`: denshiban → cloud) **tạm gác** — xem §5.

Thứ tự làm, đúng 3 pha, mỗi pha chạy/test được độc lập:

```
Pha 1  buildPayload()      — hàm thuần: t_dokusya → props của API updateUserInfo
   ↓                          (không DI, không repo, không HTTP → unit test 100% offline)
Pha 2  triggerDenshibanSync() — hàm gọi buildPayload() + encrypt + POST + đọc statusCode
   ↓                          (chạy tay được bằng 1 script/endpoint dev, chưa đụng nghiệp vụ)
Pha 3  Gắn trigger vào các sự kiện nghiệp vụ (create / update / approve / reject / kaiyaku…)
```

Lý do tách đúng thứ tự này: Pha 1 không phụ thuộc mạng (làm được ngay cả khi chưa thông
denshiban), Pha 2 verify được bằng tay trước khi cắm vào luồng thật, Pha 3 chỉ còn là
"gọi 1 hàm" — nếu có bug thì đã biết chắc không nằm ở mapping hay ở transport.

---r

## 0. Điều kiện tiên quyết (làm trước Pha 2, KHÔNG chặn Pha 1)

### Endpoint & config

Denshiban là **máy chủ độc lập** — stack `denshiban-demo` cố tình **không** join
`agrinews-network`. Docker DNS (`http://denshiban-demo:4000`) **không dùng được** vì
production không bao giờ có chuyện đó. Hai bên chỉ thấy nhau qua **published port trên host**.

| Mục | Giá trị |
| --- | --- |
| `DENSHIBAN_API_URL` — từ **container** backend | `http://host.docker.internal:4000/readermanage/updateUserInfo` |
| `DENSHIBAN_API_URL` — chạy BE **ngoài** container | `http://localhost:4000/readermanage/updateUserInfo` |
| `DENSHIBAN_API_URL` — production | `https://agrinews.co.jp/readermanage/updateUserInfo` (chỉ gọi được từ 2 NAT IP của ECS) |
| Khoá AES-256-GCM | **64 ký tự hex**, phải trùng khít khoá phía denshiban — lệch → `E03` |

**2 việc phải sửa ở cloud:**

1. `apps/docker-compose.yml` → service `backend` thiếu `extra_hosts`. Trên Linux/WSL,
   `host.docker.internal` **không** tự resolve (chỉ Docker Desktop mới có sẵn):
   ```yaml
     backend:
       extra_hosts:
         - "host.docker.internal:host-gateway"
   ```
2. **Tên biến khoá đang lệch.** Cloud đọc `DENSHIBAN_DB_COMMON_KEY`
   ([`configuration.ts`](../../../apps/backend/src/config/configuration.ts) →
   `denshiban.commonKey`), denshiban dùng `DENSHIBAN_API_KEY`.
   → Đổi cloud sang **`DENSHIBAN_API_KEY`** (đây là khoá của **API**, không phải của DB —
   tên cũ gây hiểu nhầm). `resolveKey()` sẵn có đã nhận đúng dạng 64-hex.

### Smoke test thông mạng

```bash
docker exec agrinews-backend-1 node -e "
fetch('http://host.docker.internal:4000/readermanage/updateUserInfo', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ payload: 'x' }),
}).then(r=>r.json()).then(console.log);"
```
Ra `{ statusCode: 'E02' }` = **đúng** (mạng thông, API sống, payload `'x'` cố tình sai base64).
DNS error / timeout → `extra_hosts` chưa thêm.

---

## Pha 1 — `buildPayload()`: sinh props cho `updateUserInfo`

**File mới**: `apps/backend/src/modules/denshiban/denshiban-payload.builder.ts`
**Spec**: `denshiban-payload.builder.spec.ts`
**Contract**: [outbound-field-matrix.md](./outbound-field-matrix.md) — §A ma trận field × mode,
§B quy tắc từng field, §C 4 quy tắc chung. **Builder không được suy diễn ngoài file đó.**

### 1.1. Chữ ký — hàm thuần, không DI

Mọi thứ cần tra DB phải resolve **trước** rồi truyền vào qua `ctx`. Builder không inject
repo, không gọi `CodeService`, và **không đụng đồng hồ** → test offline 100%.

Phép biến đổi duy nhất phụ thuộc thời gian — `payment_start` — được tách sang
`denshiban-payment-start.ts`. Caller gọi `toPaymentStart(d.dokusya_kaishi_date)` rồi
truyền kết quả vào `ctx.paymentStart`.

Nguồn của nó là **`dokusya_kaishi_date` (購読開始日)**: màn đăng ký hội viên điện tử bên
denshiban thu gọn ngày bắt đầu đọc thành 2 lựa chọn — `0` = hôm nay, `1` = ngày 1 tháng
sau. `approve` (duyệt hội viên chờ) dùng **cùng logic** vì duyệt chính là chốt "bắt đầu
đọc từ khi nào".

Lý do tách khỏi builder: payload gửi lên denshiban **chỉ có `0`/`1`, không có ngày**, nên
builder không cần biết hôm nay là ngày nào; và vì denshiban giải nghĩa `0`/`1` theo
**đồng hồ của nó lúc nhận request**, giá trị phải được tính sát thời điểm gửi (job nằm
trong queue vắt qua nửa đêm / mốc cuối tháng sẽ lệch ngày).

```ts
export type DenshibanMode =
  | 'create' | 'update' | 'reread' | 'cancel' | 'approve' | 'unapprove';

export interface BuildCtx {
  /** m_kanri_shiten.kanri_shiten_code của JA đang thao tác (user login, 10 số) */
  jacdExecute: string;
  /** m_kanri_shiten.kanri_shiten_code của record — chỉ update/reread (field `jacd`) */
  jacd?: string;
  /** Cờ thông báo hội viên — required cho update/reread/cancel. Mặc định '0' */
  notifyFlg?: '0' | '1';
  /** YYYYMM — chỉ mode cancel. Không được thuộc quá khứ (P05) */
  cancelYm?: string;
  /**
   * '0'=tháng này / '1'=tháng sau — bắt buộc cho create / approve / unapprove.
   * Caller resolve bằng `toPaymentStart(d.seikyu_kaishi_month)` (file riêng,
   * phụ thuộc đồng hồ). Thiếu → builder throw, không im lặng bỏ qua.
   */
  paymentStart?: '0' | '1';
}

/** create — toàn bộ profile, KHÔNG có id / jacd / notify_flg */
export function buildCreatePayload(d: Dokusya, ctx: BuildCtx): DenshibanPayload;

/** update / reread — chỉ field đã đổi + field bắt buộc */
export function buildUpdatePayload(
  before: Dokusya, after: Dokusya, ctx: BuildCtx, mode: 'update' | 'reread',
): DenshibanPayload;

/**
 * cancel / approve / unapprove — chỉ id + 1-2 field nghiệp vụ, KHÔNG mang profile.
 * Chữ ký chốt theo spec khách (xem outbound-field-matrix §A-2) — mọi field đều bắt buộc:
 *   cancel    → timestamp, action_kbn, jacd_execute, id, cancel_ym, notify_flg
 *   approve   → timestamp, action_kbn, jacd_execute, id, payment_start
 *   unapprove → timestamp, action_kbn, jacd_execute, id, payment_start
 * Lưu ý: `unapprove` VẪN cần payment_start (quirk của API); `approve`/`unapprove`
 * KHÔNG có notify_flg; `cancel` KHÔNG có payment_start.
 */
export function buildCommandPayload(
  d: Dokusya, ctx: BuildCtx, mode: 'cancel' | 'approve' | 'unapprove',
): DenshibanPayload;
```

> Ma trận §A cho thấy 6 mode chỉ cần **3 nhánh build** thật:
> `create` / `update ≡ reread` / `cancel · approve · unapprove` (các mode "lệnh", không profile).
> Trong nhánh lệnh, `cancel` và `approve`/`unapprove` có tập field **khác hẳn nhau** —
> switch theo `mode` rồi trả về đúng tập field, không gắn field theo `if` rời rạc.

`timestamp` **KHÔNG** do builder sinh — xem Pha 2.

### 1.2. Các hàm con — mỗi hàm 1 spec

| Hàm | Logic | Ghi chú |
| --- | --- | --- |
| `toSubscribeFlg` | `dokusya_shubetsu` `3`(併読)→`'1'`, `2`(điện tử)→`'0'` | |
| `toSex` | `gender` `2`(nữ)→`'0'`, `1`(nam)→`'1'`, `9`/NULL→`'9'` | **Đảo ngược** bảng mã so với cloud |
| `toPaymentStart` | So `dokusya_kaishi_date` (YYYY-MM-DD) với **hôm nay theo JST** → `'0'`, với **ngày 1 tháng sau** → `'1'` | **Ở file riêng** `denshiban-payment-start.ts` (hàm duy nhất dùng đồng hồ). Ngày khác 2 mốc đó → **throw**, không gửi bừa. `create` và `approve` dùng chung |
| `toRemarks` | `biko.split('\n')` → dòng 1–4 vào `remarks1..4`, **dòng 5 trở đi gộp** vào `remarks5`; mỗi remark cắt 255 ký tự | |
| `toTel` | `renrakusaki_1`, bỏ `-`, ≤13 số | `renrakusaki_2` **không gửi** — denshiban chỉ có 1 trường `tel` |
| `toBunrui` | `dokusyaso_bunrui` → `profession` (+`others_profession`), `nogyosya_bunrui` → `products` (+`others_products`) | ⚠️ **Blocker cardinality** — xem §4 |

### 1.3. 4 quy tắc chung (ma trận §C — vi phạm là bug)

1. **Mọi field kiểu `String`**, kể cả số.
2. **`null`/`undefined` → bỏ hẳn key**, KHÔNG gửi `''` (denshiban có thể hiểu `''` = "xoá giá trị").
3. **UPDATE chỉ gửi field đã đổi** — diff `before` vs `after`; field bắt buộc
   (`action_kbn`, `jacd_execute`, `id`, `notify_flg`) thì luôn gửi.
4. Ràng buộc điều kiện giữa các field (`products` chỉ khi `profession=0`,
   `others_profession` chỉ khi `profession=999`…) — vi phạm → denshiban trả mã `V` của chính field đó.

### 1.4. Kana — **không convert**

`first_kana` / `last_kana` ← `shimei_kana_sei` / `shimei_kana_mei`: **lấy nguyên**, đúng như
spec mapping ghi. Không viết `kana-convert.ts`, không đụng bảng chữ.

### 1.5. `assertPayload()` — validate ở cloud TRƯỚC khi gửi

Cùng file hoặc `denshiban-payload.validator.ts`. Check độ dài / regex theo đúng cột
"Validation" của ma trận §B. **Lỗi phải hiện ra ở cloud** (message tiếng Nhật, map vào
`<a-form-item>`), không để denshiban trả `V01`–`V35` rồi mới biết — lúc đó job đã nằm trong
queue và user đã rời màn hình.

### 1.6. Điều kiện gửi

Chỉ gửi khi `dokusya_shubetsu = 2` (điện tử thuần — **quyết định khách 2026-07**).
Độc giả đọc hỗn hợp (`3` / 併読) và báo giấy thuần (`1`) → **không** đẩy sang denshiban.
Guard này đặt ở Pha 2 (trigger), không đặt trong builder — builder chỉ biết map, không biết
"có nên gửi hay không".

### ✅ Xong Pha 1 khi

`npm test -- denshiban-payload` xanh, không cần Redis / DB / mạng.

---

## Pha 2 — `triggerDenshibanSync()`: hàm gọi mapping + gửi API

### 2.1. Mở rộng `DenshibanApiService.send()`

[`denshiban-api.service.ts`](../../../apps/backend/src/modules/denshiban/denshiban-api.service.ts)
hiện chỉ có `encrypt()` private + boot-ping. Thêm:

```ts
async send(payload: DenshibanPayload): Promise<DenshibanApiResult>;
// DenshibanApiResult = { statusCode: string; id?: string; message: string }
```

- **`timestamp` đóng dấu BÊN TRONG `send()`**, không phải lúc build payload — job nằm trong
  queue > 300s sẽ bị trả `E05`.
- Mã hoá AES-256-GCM → `IV(12B) + Ciphertext + Tag(16B)` → Base64 → body `{ "payload": "…" }`
  (tái dùng `encrypt()` / `resolveKey()` đã có).
- POST tới `configService.get('denshiban.apiUrl')`, timeout 15s.
- Xoá boot-ping tạm (`DENSHIBAN_API_PING`) khi luồng thật đã chạy.

**Response: HTTP LUÔN LÀ 200.** Kết quả nằm ở `statusCode` trong body — tuyệt đối **không**
dùng `res.ok` để phán định thành/bại.

```
statusCode === '0'  → thành công. Với create: `id` = ID hội viên do DENSHIBAN sinh
                       → cloud lưu vào t_dokusya.denshi_kaiin_id
statusCode !== '0'  → throw DenshibanSyncException(statusCode, message)
```

### 2.2. Chính sách retry (quyết định bởi `statusCode`, không phải HTTP)

| Mã | Retry? | Xử lý |
| --- | --- | --- |
| `E05` (quá 300s) | ✅ | Đóng dấu `timestamp` mới rồi gửi lại |
| `P99` (lỗi khác) | ✅ | An toàn để retry |
| `E01`–`E04` | ❌ | **Bug phía cloud** (body/base64/khoá/JSON sai) → alert dev |
| `V01`–`V35` | ❌ | Sai định dạng field → dữ liệu phải sửa, retry vô ích |
| `P01`–`P07` | ❌ | Vi phạm nghiệp vụ (email trùng, không tìm thấy hội viên…) → báo user |

→ `DenshibanSyncException` **phải mang theo `statusCode`** để queue quyết định retry hay ném DLQ.

### 2.3. Trigger — điểm hợp lưu của builder + transport

**File mới**: `apps/backend/src/modules/denshiban/denshiban-sync.service.ts`

Đây là **hàm duy nhất mà nghiệp vụ (Pha 3) gọi**. Nó đứng giữa `DokusyaService` và
`DenshibanApiService`, gánh mọi thứ Pha 3 không nên biết:

```ts
@Injectable()
export class DenshibanSyncService {
  /** Nghiệp vụ chỉ gọi hàm này. Fire-and-forget: enqueue rồi return ngay. */
  async trigger(input: {
    dokusyaId: number;
    mode: DenshibanMode;
    session: SessionPayload;
    cancelYm?: string;
    notifyFlg?: '0' | '1';
  }): Promise<void>;
}
```

Trách nhiệm của `trigger()`:

1. **Guard điều kiện gửi** — `dokusya_shubetsu = 2` (điện tử thuần); hỗn hợp(3)/báo giấy(1) → return, không enqueue.
2. **Enqueue** job vào BullMQ queue `denshiban-sync` (KHÔNG gọi HTTP trực tiếp — xem §2.4).
3. Không throw ra nghiệp vụ. Denshiban chết thì cloud vẫn commit được.

Worker (`denshiban-sync.processor.ts`) mới là nơi chạy thật:

```
1. Load t_dokusya theo dokusyaId (+ before-state nếu mode = update)
2. Nếu mode !== 'create' && denshi_kaiin_id == null
     → job.moveToDelayed(now + 10s), tối đa N lần   ← job create chưa xong
     → vượt N lần → t_log(ERROR) + DLQ
3. Resolve ctx (jacdExecute / jacd từ m_kanri_shiten) — lookup DB ở ĐÂY, không ở builder
4. buildXxxPayload(...) → assertPayload() → api.send()
5. statusCode '0' + mode 'create' → UPDATE t_dokusya SET denshi_kaiin_id = res.id
6. statusCode != '0' → ghi t_log(ERROR) → retry hay DLQ theo bảng §2.2
```

### 2.4. Vì sao bắt buộc qua queue, không gọi HTTP thẳng

**Không đặt lời gọi HTTP trong transaction** — external I/O treo sẽ giữ lock DB.
Dùng BullMQ (`modules/queue` đã có sẵn, thêm `QUEUE_DENSHIBAN_SYNC` vào
[`queue-names.constants.ts`](../../../apps/backend/src/modules/queue/queue-names.constants.ts)):

- Retry backoff mũ **chỉ với `E05` / `P99`**; mã khác → fail thẳng vào DLQ.
- **Concurrency = 1 theo từng `dokusyaId`** (BullMQ job key / `FlowProducer`) — để job `update`
  không bao giờ vượt mặt job `create` của cùng một độc giả. Thứ tự bị đảo thì denshiban nhận
  `update` cho hội viên chưa tồn tại.

### 2.5. Kiểm chứng Pha 2 (trước khi cắm vào nghiệp vụ)

Endpoint dev tạm hoặc script: gọi `trigger({ dokusyaId, mode: 'create' })` trên 1 record
có sẵn, xem CloudWatch/console log ra `statusCode = '0'` + `denshi_kaiin_id` được ghi lại.
Sai ở đâu là biết ngay — vì nghiệp vụ chưa dính vào.

### ✅ Xong Pha 2 khi

Gọi tay `trigger()` → denshiban nhận được record, cloud lưu được `denshi_kaiin_id`.

---

## Pha 3 — Cắm trigger vào các sự kiện đồng bộ

Chỉ còn là thêm **1 dòng** vào mỗi method của
[`DokusyaService`](../../../apps/backend/src/modules/dokusya/dokusya.service.ts).

### 3.1. Bảng sự kiện → mode

| Sự kiện nghiệp vụ | Method hiện có | Mode | Điều kiện |
| --- | --- | --- | --- |
| Tạo độc giả điện tử | `create()` (L329) | `create` | `dokusya_shubetsu = 2` (điện tử thuần; hỗn hợp/giấy không sync) |
| Sửa thông tin | `update()` (L500) | `update` | Có ít nhất 1 field trong ma trận §A đổi |
| Duyệt đăng ký điện tử | `approve()` (L793) | `approve` | `denshi_shonin_status` 0 → 1 |
| Từ chối đăng ký | `reject()` | `unapprove` | `denshi_shonin_status` 0 → 2 |
| Giải ước (解約) | `update()` với `tetsuzuki_shurui = 0` | `cancel` | Hội viên **trả phí**; cần `cancel_ym` |
| Đọc lại | `update()` (khôi phục từ 解約) | `reread` | Hội viên **miễn phí** |
| Xoá mềm | `remove()` (L1737) | `cancel` | ⚠ Xem §4 — chưa chốt |
| Đổi販売店 hàng loạt | `replaceHanbaiten()` | – | Không đụng field nào của denshiban → **không gửi** |

⚠️ `cancel` chỉ dành cho hội viên **trả phí** (nếu không ra `P04`), `reread` chỉ cho hội viên
**miễn phí** (nếu không ra `P03`). → Chọn mode phải nhìn `denshi_dokusya_shubetsu`.

### 3.2. Cách gắn — sau COMMIT, không trong transaction

```
create(dto) → tx { INSERT t_dokusya (denshi_kaiin_id = NULL) + rireki + audit } → COMMIT
            → await this.denshibanSync.trigger({ dokusyaId, mode: 'create', session })
            → (worker chạy nền: send → statusCode '0' → UPDATE denshi_kaiin_id = res.id)
```

Trigger nằm **sau** `dataSource.transaction(...)`, không nằm trong. Nghiệp vụ **không** cần
try/catch quanh trigger — nó tự nuốt lỗi và enqueue.

### 3.3. Hệ quả của việc gửi bất đồng bộ — phải xử lý tường minh

> 🚫 **Ràng buộc: KHÔNG thêm cột, KHÔNG thêm bảng.** Chỉ dùng
> `t_dokusya.denshi_kaiin_id`, `t_log`, Redis, BullMQ — tất cả đã có sẵn.

User bấm 登録 → thấy toast `登録しました。` (DB cloud đã commit) → 3 giây sau job fail vì `P01`
(email trùng bên denshiban). User **không biết gì**, cloud có record mà denshiban không có.

3 tầng xử lý, **không cần cột mới**:

| Tầng | Cơ chế |
| --- | --- |
| **1. Cờ trạng thái** | `t_dokusya.denshi_kaiin_id IS NULL` **chính là cờ "chưa đồng bộ"** của mode `create` — cột đã tồn tại. Sync xong thì nó có giá trị |
| **2. Vết lỗi** | Job fail → ghi `t_log` với `logType = ERROR(3)`, `targetTable = 't_dokusya'`, `targetId = dokusyaId`, `errorMessage = '<statusCode> <message>'`. Màn hình tra cứu log **đã có** → tra được record nào fail, vì sao |
| **3. Chạy lại** | BullMQ DLQ giữ job fail. Thêm endpoint admin `POST /dokusya/:id/denshiban-resync` → enqueue lại. FE gắn nút 「再同期」 vào màn chi tiết độc giả |

Hạn chế phải chấp nhận: `update`/`cancel` fail thì **không có cờ trên chính record** (chỉ có
vết ở `t_log`) → màn danh sách không highlight được record lệch. Muốn badge đỏ trên list thì
bắt buộc thêm cột — **ngoài phạm vi task này**, nếu khách cần thì đưa lên như yêu cầu riêng.

→ Worker phải ghi `t_log` cho **mọi** job fail (không chỉ lần retry cuối). `t_log` là nơi duy
nhất truy vết được, **không được bỏ tầng 2**.

### ✅ Xong Pha 3 khi

E2E: tạo độc giả điện tử trên UI → denshiban có record → `denshi_kaiin_id` được ghi ngược về;
sửa → denshiban thấy đúng field đã đổi; duyệt/từ chối → `approve`/`unapprove` chạy.

---

## 4. Blocker — hỏi khách song song, không chặn code

Đọc kèm [outbound-field-matrix.md §D](./outbound-field-matrix.md).

| # | Vấn đề | Chặn gì | Né tạm |
| --- | --- | --- | --- |
| 1 | `profession` — cloud `dokusyaso_bunrui` là **CSV nhiều giá trị**, denshiban chỉ nhận **đơn trị** | **Chặn cứng Pha 1** | 2 lựa chọn: (a) giới hạn UI — độc giả điện tử chỉ chọn 1 nghề; (b) gửi giá trị đầu + log cảnh báo. **Đề xuất (a)** — (b) mất dữ liệu âm thầm. ⚠️ `products` **thì** nhận CSV, đừng nhầm 2 field |
| 2 | `branch` — cloud không có nguồn (`shiten_id` của độc giả điện tử = NULL) | – | Field **optional** → **không gửi key**, không lỗi. Chờ khách chốt (QnA 9) |
| 3 | `profession_and_ja` / `profession_and_agri` — cloud không có cột | – | Cả 2 **optional** → **không gửi key**, không lỗi (QnA 10) |
| 4 | `others_profession` = `'会社員'` / `others_products` = `'その他の農畜産物'` | – | Dùng tạm theo spec, chờ QnA 7/8 |
| 5 | `remove()` (xoá mềm) có tương ứng mode `cancel` không? Nếu là hội viên miễn phí thì gửi gì? | **Pha 3, bảng §3.1** | Tạm **không gửi** khi xoá mềm hội viên miễn phí + ghi `t_log(WARNING)`, chờ khách |
| 6 | `bank_branch_code`/`_name` bỏ required cho độc giả điện tử? | DTO + SCR-020 | Giữ nguyên required tới khi có trả lời (luật DTO, **không** đụng ràng buộc DB) |

---

## 5. Chiều VÀO — TẠM GÁC

Batch `dokusya-sync` (denshiban → cloud): đọc `cmsDB.users` → map 62 cột → upsert `t_dokusya`
+ ghi `t_dokusya_rireki`. **Chưa làm ở đợt này.**

Những gì đã có sẵn khi quay lại làm:
- Kết nối đọc MySQL: `modules/denshiban/denshiban-db.service.ts` — `withConnection(fn)` ✅
- `modules/batch/dokusya-sync/dokusya-sync.service.ts` — `run()` còn là TODO rỗng
- Ghi lịch sử: `modules/dokusya/dokusya-history.writer.ts` ✅

Những gì Pha 1 làm sẵn và chiều VÀO sẽ tái dùng:
- Bảng bảng-mã (`sex`, `member_type`, `approval`…) — đảo chiều lại

Blocker riêng của chiều VÀO (chưa cần giải bây giờ): bảng giá trị `payment_id` ↔ `shiharai_hoho`,
mã ダミー販売店, mốc diff lưu ở Redis key `sync:dokusya:last_synced_at`.

---

## 6. Checklist thứ tự thực hiện

| # | Việc | Pha | Phụ thuộc |
| --- | --- | --- | --- |
| 1 | `denshiban-payload.builder.ts` (3 nhánh / 6 mode) + spec | 1 | — |
| 2 | `assertPayload()` + spec | 1 | 1 |
| 3 | `extra_hosts` + đổi `DENSHIBAN_DB_COMMON_KEY` → `DENSHIBAN_API_KEY` → smoke test ra `E02` | 0 | — |
| 4 | `DenshibanApiService.send()` + `DenshibanSyncException(statusCode)` | 2 | 2, 3 |
| 5 | Queue `denshiban-sync` + `DenshibanSyncService.trigger()` + processor | 2 | 4 |
| 6 | Kiểm chứng tay: gọi `trigger()` trên 1 record → denshiban nhận, ghi ngược `denshi_kaiin_id` | 2 | 5 |
| 7 | Gắn trigger vào `create` / `update` / `approve` / `reject` / 解約 / 読み直し | 3 | 6 |
| 8 | Endpoint `POST /dokusya/:id/denshiban-resync` + nút 「再同期」 | 3 | 7 |
| 9 | E2E từ UI | 3 | 7 |

- **Bước 1–2 làm được ngay**, không cần mạng, không cần khách trả lời (trừ blocker #1).
- **Bước 3 phải xong trước bước 4** — chưa thông mạng thì không verify được gì ở Pha 2.
- Gửi QnA §4 cho khách **song song với bước 1**, đừng chờ.

### 🚫 Ràng buộc xuyên suốt: KHÔNG đụng database

Plan này **không có migration nào**.

| Thứ cần | Giải bằng | Thay vì |
| --- | --- | --- |
| Cờ "chưa đồng bộ" | Cột `denshi_kaiin_id` **đã có** (NULL = chưa sync) | ~~cột `denshi_sync_status`~~ |
| Vết lỗi đồng bộ | Bảng `t_log` **đã có** (`logType = ERROR`) | ~~cột `denshi_sync_error`~~ |
| Trạng thái duyệt điện tử | Cột `denshi_shonin_status` **đã có** | — |

Phát sinh nhu cầu thêm cột/bảng → **dừng lại và hỏi**, không tự ý migration.
