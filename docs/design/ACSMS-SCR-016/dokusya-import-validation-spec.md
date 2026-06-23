# Spec validate — 購読者Excelデータ取込画面 (ACSMS-SCR-016)

> Viết lại từ `validateClient()` của SCR-011 ([DokusyaFormView.vue](../../../apps/frontend/src/views/dokusya/DokusyaFormView.vue)),
> điều chỉnh cho ngữ cảnh import Excel (field dùng `*_code`, validate theo từng dòng + 3 mode NEW / UPDATE_ALL / UPDATE_PARTIAL).
> Đối tượng implement: BE `DokusyaService.importExcel` + `validateImportRow*`, FE `validateBeforeSubmit`.
>
> Nhãn cuối dòng: `[CR mới]` = thêm mới theo CR khách hàng (chưa có trong code) ·
> `[GAP]` = kế thừa 011 nhưng code import chưa làm · `[đề xuất]` = message mình đề xuất cho chỗ trước để trống, chờ chốt literal.
> Message required dùng chuẩn duy nhất: `{項目}は必須項目です。`

```
Quyền tài khoản theo 購読種別 (áp cho mọi mode, kiểm theo từng record): [CR mới]
	- Với account có paper_flg = true thì mới được import các record có 購読種別 (dokusya_shubetsu) = 1.
	  Nếu paper_flg = false → báo lỗi dòng, message: "紙版購読者を取り扱う権限がありません。" [đề xuất]
	- Với account có denshi_flg = true thì mới được import các record có 購読種別 (dokusya_shubetsu) = 2.
	  Nếu denshi_flg = false → báo lỗi dòng, message: "電子版購読者を取り扱う権限がありません。" [đề xuất]

Base validate:
	- 購読種別 (dokusya_shubetsu):
		require - message: "購読種別は必須項目です。"
	- 手続種類 (tetsuzuki_shurui):
		require - message: "手続種類は必須項目です。"
		logic: = 0 (解約) → 購読中止日 (dokusya_chushi_date) required - message: "購読中止日は必須項目です。"
		       (đồng thời 購読部数 bị ép = 0; xem mục 購読部数 ở các mode)  [GAP]
	- 管理支店 (kanri_shiten_code):
		require - message: "管理支店は必須項目です。"
		logic: kanri_shiten tồn tại với ja_id = account.ja_id - message: "指定された管理支店が見つかりません。" [đề xuất]
	- 支店 (shiten_code):
		require - message: "支店は必須項目です。"
		logic: shiten tồn tại với ja_id = account.ja_id VÀ kanri_shiten_id = kanri_shiten đã chọn
		       - message: "指定された支店が見つかりません。" [đề xuất] (ràng buộc thuộc đúng kanri_shiten: [GAP])
	- 購読者氏名_氏 (shimei_sei): [GAP]
		require - message: "購読者氏名_氏は必須項目です。"
		string - message: ""
		format: kanji - message: "漢字で入力してください。"
	- 購読者氏名_名 (shimei_mei): [GAP]
		require - message: "購読者氏名_名は必須項目です。"
		string - message: ""
		format: kanji - message: "漢字で入力してください。"
	- 購読者かな_氏 (shimei_kana_sei): [GAP]
		require - message: "購読者かな_氏は必須項目です。"
		string - message: ""
		format: hiragana - message: "ひらがなで入力してください。"
	- 購読者かな_名 (shimei_kana_mei): [GAP]
		require - message: "購読者かな_名は必須項目です。"
		string - message: ""
		format: hiragana - message: "ひらがなで入力してください。"
	- 購読部数 (dokusya_busu):
		require - message: "購読部数は必須項目です。"
		number - message: ""
	- 新聞単価 (tanka_code):
		require - message: "新聞単価は必須項目です。"
		string - message: ""   ← (sửa: là mã chuỗi, KHÔNG phải number)
		logic: tanka tồn tại với ja_id = account.ja_id VÀ tanka_type = 1
		       - message: "指定された新聞単価コードが見つかりません。" [đề xuất]
	- 郵便番号 (yubin_no):
		require - message: "郵便番号は必須項目です。"
		length = 7 (nửa-size số) - message: "郵便番号は半角数字7桁で入力してください。" [GAP]
		string - message: ""
	- 都道府県 (todofuken_code):
		require - message: "都道府県は必須項目です。"
		logic: code tồn tại trong m_todofuken - message: "指定された都道府県コードが存在しません。" [đề xuất] [GAP]
	- 市町村郡 (shikuchoson):
		require - message: "市町村郡は必須項目です。"
	- 丁目番地 (chome_banchi):
		require - message: "丁目番地は必須項目です。"
	- 連絡先1 (renrakusaki_1):
		require - message: "連絡先1は必須項目です。"
	- 販売店コード (hanbaiten_code):
		require - message: "販売店コードは必須項目です。"
		string - message: ""
		logic: hanbaiten tồn tại với ja_id = account.ja_id - message: "指定された販売店コードが見つかりません。" [đề xuất]
	- 支払方法 (shiharai_hoho):
		require - message: "支払方法は必須項目です。"
		string - message: ""
		logic: chỉ chấp nhận tập {1,2,3,4,5,6,9} - message: "支払方法の値が不正です。" [đề xuất] [GAP]
	- 購読開始日 (shoki_dokusya_kaishi_date):
		require - message: "購読開始日は必須項目です。"
		date - message: ""
	- 備考 (biko): [GAP]
		max 500 ký tự - message: "備考は500文字以内で入力してください。"

Mode Create (import_mode = NEW):
	- Base validate.
	- 購読種別 = 3 (併読) → không import được:
		message: "購読種別が3:併読のためExcel取込みできません。"
	- Khối haitatsu_* CHỈ validate khi 購読種別 (dokusya_shubetsu) = 1 VÀ có ≥1 trong các trường dưới
	  mang data → khi đó 8 trường đó required + format y như trường 購読者 cùng tên: [GAP]
		郵便番号(配達先)        — haitatsu_yubin_no        (7 số: "郵便番号は半角数字7桁で入力してください。")
		都道府県(配達先)        — haitatsu_todofuken_code  (tồn tại m_todofuken)
		市町村郡(配達先)        — haitatsu_shikuchoson
		丁目番地(配達先)        — haitatsu_chome_banchi
		配達先苗字（漢字）      — haitatsu_shimei_sei       (kanji)
		配達先名前（漢字）      — haitatsu_shimei_mei       (kanji)
		配達先苗字（かな）      — haitatsu_shimei_kana_sei  (hiragana)
		配達先名前（かな）      — haitatsu_shimei_kana_mei  (hiragana)
	  3 trường LUÔN optional:
		ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先) — haitatsu_tatemono_mei
		連絡先１(配達先)        — haitatsu_renrakusaki_1
		連絡先２(配達先)        — haitatsu_renrakusaki_2
	  (Ghi chú 1: 011 dùng checkbox haitatsu_same_flg; import dùng "có data" làm trigger — cố ý.)
	  (Ghi chú 2: 配達先 苗字/名前 (sei/mei) áp format kanji — NGHIÊM HƠN 011 (011 chỉ required, không
	   check kanji cho 2 trường này); cố ý cho dữ liệu import.)

	- Khi (支払方法) shiharai_hoho = 1 thì các trường sau required — TỔNG 5 trường: [GAP]
		引落元口座店舗コード   - bank_branch_code            - message: "引落元口座店舗コードは必須項目です。"
		引落元口座店舗名       - bank_branch_name            - message: "引落元口座店舗名は必須項目です。"
		引落口座貯金種目       - hikiotoshi_yokin_shubetsu   - message: "引落口座貯金種目は必須項目です。" (chỉ {1,2})
		引落口座番号           - hikiotoshi_koza_no          - message: "引落口座番号は必須項目です。"   ← (THÊM so với spec cũ)
		引落口座名義           - hikiotoshi_koza_meigi       - message: "引落口座名義は必須項目です。"   ← (THÊM so với spec cũ)

	- Khối haitatsu_* khi 購読種別 (dokusya_shubetsu) = 2 sẽ không có dữ liệu, bỏ qua các trường haitatsu_*.

	- メールアドレス (email):
		required khi 購読種別 hiệu lực ∈ {2 電子版, 3 併読}
		       (NEW: lấy 購読種別 của dòng; UPDATE_*: lấy 購読種別 record hiện có vì 購読種別 bất biến)
		       - message: "メールアドレスは電子版・併読の場合は必須です。"
		string
		format: email - ÁP KHI CÓ GIÁ TRỊ (kể cả 紙版) - message: "メールアドレスの形式が不正です。"
		unique giữa các record 電子版/併読 - message: "このメールアドレスは既に登録されています。"

	- 支払方法 (shiharai_hoho) khi 購読種別 = 2 (電子版):
		loại giá trị 6 (クレカ). Nếu = 6 → message: "電子版かつクレジットカード決済の組み合わせは取込みできません。"
		→ tập hợp lệ khi 電子版: {1,2,3,4,5,9}
		(SỬA: 紙版 (1) VẪN cho phép 6 — chỉ cấm 6 khi 電子版.)

	- Các trường còn lại không nhắc đến → không required, giữ logic mặc định.

Mode update 1 phần (import_mode = UPDATE_PARTIAL):
	- Base validate (chỉ áp cho field nằm trong selected_columns).
	- 手続種類 (tetsuzuki_shurui) = 0 → 購読部数 (dokusya_busu) phải = 0
	  ("解約の場合、購読部数は0を指定してください。").
	  手続種類 = 1 → 購読部数 > 0, nhỏ nhất = 1
	  ("新規登録の場合、購読部数は0より大きい値を指定してください。").
		require - message: "手続種類は必須項目です。"
	- Khi thay đổi hanbaiten_code → 適用日 (hanbaiten_tekiyo_date) bị require: [GAP]
		logic: 販売店コード (hanbaiten_code) thay đổi → require - message: "適用日は必須項目です。"
		logic: có giá trị mà < hôm nay (JST) → message: "過去日は指定できません。"
		(SỬA typo: hanbaiten_tekio_date → hanbaiten_tekiyo_date; field này chưa có trong DTO, cần thêm.)
	- 読者情報変更適用日 (joho_henko_tekiyo_date): [GAP]
		logic: khi update bất kể trường nào → require - message: "読者情報変更適用日は必須項目です。"
		logic: < hôm nay (JST) → message: "過去日は指定できません。"

Mode update toàn bộ (import_mode = UPDATE_ALL):
	- Kế thừa toàn bộ logic validate của Base validate và Mode update 1 phần.
	- Required base áp cho TẤT CẢ field (không chỉ field được chọn). [GAP]
	- Các cột bất biến (購読種別 + 4 trường tên + 購読開始日) giữ giá trị cũ (COALESCE).
```

## Checklist gap cần implement

- [ ] `[CR mới]` Gate `paper_flg`/`denshi_flg` theo từng dòng.
- [ ] `[GAP]` Format kanji (`shimei_sei/mei`) + hiragana (`shimei_kana_*`) + cụm `haitatsu_*`.
- [ ] `[GAP]` `yubin_no` / `haitatsu_yubin_no` đúng 7 chữ số.
- [ ] `[GAP]` `todofuken_code` / `haitatsu_todofuken_code` tồn tại trong `m_todofuken`.
- [ ] `[GAP]` `shiten_code` thuộc đúng `kanri_shiten` đã chọn.
- [ ] `[GAP]` `shiharai_hoho` allow-list {1,2,3,4,5,6,9}.
- [ ] `[GAP]` Conditional-required khối `haitatsu_*` (trigger "có data", chỉ 紙版).
- [ ] `[GAP]` Cụm 口座引落 5 trường khi `shiharai_hoho=1` + `hikiotoshi_yokin_shubetsu ∈ {1,2}`.
- [ ] `[GAP]` Required base áp cho UPDATE_ALL; thêm field `hanbaiten_tekiyo_date` + rule; required `joho_henko_tekiyo_date`.
- [ ] `[GAP]` `biko` ≤ 500 ký tự.
- [ ] `[GAP]` `dokusya_chushi_date` required khi `tetsuzuki_shurui = 0` (解約).
- [ ] `[GAP]` Past-date guard ("過去日は指定できません。") cho `hanbaiten_tekiyo_date` + `joho_henko_tekiyo_date`.
- [ ] `[GAP]` Email required theo 購読種別 hiệu lực ∈ {2,3}; format áp khi có giá trị.
- [ ] Giữ format kanji cho `haitatsu_shimei_sei/mei` (nghiêm hơn 011 — quyết định đã chốt).
- [ ] Đổi wording message required trong code import sang chuẩn `{項目}は必須項目です。`.
- [ ] Chốt literal cho các message `[đề xuất]`.
