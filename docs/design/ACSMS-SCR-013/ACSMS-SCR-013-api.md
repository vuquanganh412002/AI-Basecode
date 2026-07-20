---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-013
screen_name: 購読者履歴情報画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-15
created_date: 2026/05/15
created_by: Nguyen Duyen Manh
updated_date: 2026/05/30
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者            | 変更内容                                                                                                              | 確認者         | 承認者         |
| --- | ---------- | ---- | ----------------- | ------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Nguyen Duyen Manh | 初版作成                                                                                                            | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/30 | 1.1  | Tran Duc Tuyen    | 画面設計書 v1.2 / index.html に整合。`t_dokusya_rireki` に存在しない `bank_code` / `bank_name` をレスポンスから削除し、`bank_branch_code` / `bank_branch_name` を論理名「引落元口座店舗コード／名」に改称（画面項目 No.40・41） | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/07/17 | 1.2  | Tran Duc Tuyen    | 顧客要件（SCR-013 一覧列追加・並べ替え）: レスポンスに `dokusya_shubetsu`（購読種別）・`tanka_id`/`tanka_name`/`tanka_kingaku`（新聞単価。金額は JA 税区分で解決）・`shiharai_hoho`（支払い方法）・`yubin_kubun`（郵送区分）・`dokusyaryo_shiharai_cycle`（購読料支払サイクル）・`biko`（備考）を追加。SELECT に `m_tanka` / `m_ja` を LEFT JOIN。列並び: 履歴番号→購読種別→手続種別、新聞単価は購読部数の前、初回購読開始日（旧「購読開始日」）→増部日→減部日、支払い方法/郵送区分/購読料サイクルは引落口座貯金種目の前、備考は最終データ列。増部日/減部日は部数の増減時のみ `dokusya_kaishi_date` を表示。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者履歴情報画面（ACSMS-SCR-013）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                                 |
| --- | ------------- | -------------------------------------- |
| 1   | ACSMS-SCR-011 | 購読者情報登録画面 API設計書           |

## エラー一覧

| #   | エラータイプ | エラーコード          | エラーメッセージ                                                       | 備考     |
| --- | ------------ | --------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST           | リクエストパラメータが不正です。                                       | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED          | セッションが切れました。再度ログインしてください。                     | HTTP 401 |
| 3   | 共通         | FORBIDDEN             | この画面へのアクセス権限がありません。                                 | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION  | このデータへのアクセス権限がありません。                               | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR      | 入力値が不正です。詳細はerrorsフィールドを確認してください。           | HTTP 400 |
| 6   | 共通         | TOO_MANY_REQUESTS     | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。 | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR | システムエラーが発生しました。しばらくしてから再度お試しください。     | HTTP 500 |
| 8   | 画面固有     | NOT_FOUND             | 指定された購読者が見つかりません。                                     | HTTP 404 |

---

# API ACSMS-API-013-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Dokusya History List                                                                                                                                                                                                                                                                            |
| 概要                   | 指定した購読者（dokusya_id）の履歴データ一覧を取得する（最新履歴を先頭に降順表示）                                                                                                                                                                                                                  |
| URI                    | /api/v1/dokusya/{dokusya_id}/rireki                                                                                                                                                                                                                                                                 |
| メソッド               | GET                                                                                                                                                                                                                                                                                                 |
| リクエストボディー     | なし                                                                                                                                                                                                                                                                                                |
| リクエストパラメーター | dokusya_id（パスパラメータ）、page / per_page / sort_by / sort_order（クエリパラメータ）                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に履歴一覧を取得しました, 400:リクエストパラメータが不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 429:リクエスト回数が上限を超えました, 500:システムエラーが発生しました                  |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                       |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | -------------------------------------------------------------------------- |
| 1   | dokusya_id     | Number  | -        | 〇   |        |        | 取得対象の dokusya_id（パスパラメータ）                                    |
| 2   | page           | Number  | -        | -    |        |        | ページ番号（1始まり）。省略時 1                                            |
| 3   | per_page       | Number  | -        | -    |        |        | 1ページあたりの件数。省略時 20。最大 100（機能定義 3.1）                   |
| 4   | sort_by        | String  | -        | -    |        |        | ソート対象カラム。省略時 `rireki_no`                                       |
| 5   | sort_order     | String  | -        | -    |        |        | ソート順（`asc` / `desc`）。省略時 `desc`（機能定義 1.2 履歴番号降順）     |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Array   | ○        |              | -        | 履歴データ一覧（rireki_no 降順）                                                                              |
| 2   | →dokusya_rireki_id           | Number  | -        |              | -        | 購読者履歴ID                                                                                                  |
| 3   | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                                                      |
| 4   | →rireki_no                   | Number  | -        |              | -        | 履歴番号（dokusya_id 内の連番）                                                                               |
| 5   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                         |
| 6   | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                                                    |
| 7   | →kanri_shiten_name           | String  | -        |              | 〇       | 管理支店名称（m_kanri_shiten 結合、kanri_shiten_id が null の場合 null）                                       |
| 8   | →shiten_id                   | Number  | -        |              | 〇       | 販売支店ID                                                                                                    |
| 9   | →shiten_name                 | String  | -        |              | 〇       | 販売支店名称（m_shiten 結合、shiten_id が null の場合 null）                                                  |
| 10  | →kumiaiin_code               | String  | -        |              |          | 組合員コード（空文字許容）                                                                                    |
| 11  | →shimei_sei                  | String  | -        |              |          | 氏名（姓）                                                                                                    |
| 12  | →shimei_mei                  | String  | -        |              |          | 氏名（名）                                                                                                    |
| 13  | →todofuken_code              | String  | -        |              |          | 都道府県コード                                                                                                |
| 14  | →todofuken_name              | String  | -        |              | 〇       | 都道府県名（m_todofuken 結合）                                                                                |
| 15  | →shikuchoson                 | String  | -        |              |          | 市町村郡                                                                                                      |
| 16  | →chome_banchi                | String  | -        |              |          | 丁目番地                                                                                                      |
| 17  | →tatemono_mei                | String  | -        |              |          | 建物名（空文字許容）                                                                                          |
| 18  | →renrakusaki_1               | String  | -        |              |          | 連絡先１（空文字許容）                                                                                        |
| 19  | →renrakusaki_2               | String  | -        |              |          | 連絡先２（空文字許容）                                                                                        |
| 20  | →email                       | String  | -        |              |          | メールアドレス（空文字許容）                                                                                  |
| 21  | →mail_magazine_flg           | Number  | -        |              |          | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                    |
| 22  | →birth_year                  | Number  | -        |              | 〇       | 生年（西暦）                                                                                                  |
| 23  | →gender                      | Number  | -        |              | 〇       | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）                                     |
| 24  | →dokusyaso_bunrui            | String  | -        |              |          | 購読者層分類（複数カンマ区切り、空文字許容）                                                                  |
| 25  | →nogyosya_bunrui             | String  | -        |              |          | 農業者分類（複数カンマ区切り、空文字許容）                                                                    |
| 26  | →dokusya_busu                | Number  | -        |              |          | 購読部数                                                                                                      |
| 27  | →zenkai_dokusya_busu         | Number  | -        |              | 〇       | 前回購読部数（初回履歴は null）                                                                               |
| 28  | →haitatsu_yubin_no           | String  | -        |              |          | 配達先郵便番号（空文字許容）                                                                                  |
| 29  | →zenkai_yubin_no             | String  | -        |              | 〇       | 前回郵便番号（初回履歴は null）                                                                               |
| 30  | →haitatsu_todofuken_code     | String  | -        |              |          | 配達先都道府県コード（空文字許容）                                                                            |
| 31  | →haitatsu_todofuken_name     | String  | -        |              | 〇       | 配達先都道府県名（m_todofuken 結合、コード未設定の場合 null）                                                 |
| 32  | →haitatsu_shikuchoson        | String  | -        |              |          | 配達先市町村郡（空文字許容）                                                                                  |
| 33  | →haitatsu_chome_banchi       | String  | -        |              |          | 配達先丁目番地（空文字許容）                                                                                  |
| 34  | →haitatsu_tatemono_mei       | String  | -        |              |          | 配達先建物名（空文字許容）                                                                                    |
| 35  | →haitatsu_shimei_sei         | String  | -        |              |          | 配達先氏名（姓・空文字許容）                                                                                  |
| 36  | →haitatsu_shimei_mei         | String  | -        |              |          | 配達先氏名（名・空文字許容）                                                                                  |
| 37  | →zenkai_todofuken_code       | String  | -        |              | 〇       | 前回都道府県コード（初回履歴は null）                                                                         |
| 38  | →zenkai_todofuken_name       | String  | -        |              | 〇       | 前回都道府県名（m_todofuken 結合、初回履歴は null）                                                           |
| 39  | →zenkai_shikuchoson          | String  | -        |              | 〇       | 前回市町村郡（初回履歴は null）                                                                               |
| 40  | →zenkai_chome_banchi         | String  | -        |              | 〇       | 前回丁目番地（初回履歴は null）                                                                               |
| 41  | →zenkai_tatemono_mei         | String  | -        |              | 〇       | 前回建物名（初回履歴は null）                                                                                 |
| 42  | →hanbaiten_id                | Number  | -        |              |          | 販売店ID                                                                                                      |
| 43  | →hanbaiten_name              | String  | -        |              | 〇       | 販売店名（m_hanbaiten 結合）                                                                                  |
| 44  | →zenkai_hanbaiten_id         | Number  | -        |              | 〇       | 前回販売店ID（初回履歴は null）                                                                               |
| 45  | →zenkai_hanbaiten_name       | String  | -        |              | 〇       | 前回販売店名（m_hanbaiten 結合、初回履歴は null）                                                             |
| 46  | →tetsuzuki_shurui            | Number  | -        |              |          | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                     |
| 47  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   |          | 初回購読開始日                                                                                                |
| 48  | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   |          | 購読開始日                                                                                                    |
| 49  | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | 購読中止日                                                                                                    |
| 50  | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | 読者情報変更適用日                                                                                            |
| 51  | →saishin_data_flg            | Boolean | -        |              |          | 最新データフラグ（DEFAULT false, TRUE=最新レコード）                                                          |
| 52  | →zougen_hokoku_flg           | Boolean | -        |              |          | 増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更）                                                      |
| 53  | →shinki_flg                  | Boolean | -        |              |          | 新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読）                                                    |
| 54  | →kaiyaku_flg                 | Boolean | -        |              |          | 解約フラグ（DEFAULT false, TRUE=購読→解約）                                                                   |
| 55  | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                               |
| 56  | →bank_branch_code            | String  | -        |              |          | 引落元口座店舗コード（最大3桁）                                                                               |
| 57  | →bank_branch_name            | String  | -        |              |          | 引落元口座店舗名                                                                                              |
| 58  | →hikiotoshi_koza_no          | String  | -        |              |          | 引落口座番号（空文字許容）                                                                                    |
| 59  | →hikiotoshi_koza_meigi       | String  | -        |              |          | 引落口座名義（空文字許容）                                                                                    |
| 60  | →created_at                  | String  | -        | ISO8601      |          | 履歴作成日時                                                                                                  |
| 61  | →created_by                  | String  | -        |              |          | 履歴作成者                                                                                                    |
| 62  | →dokusya_shubetsu            | Number  | -        |              |          | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）。SCR-013 一覧の 履歴番号 直後に表示 |
| 63  | →tanka_id                    | Number  | -        |              |          | 新聞単価ID（m_tanka）                                                                                          |
| 64  | →tanka_name                  | String  | -        |              | 〇       | 新聞単価名（m_tanka 結合、単価削除済み等は null）。一覧は「単価名 + 半角スペース + 金額」で表示                 |
| 65  | →tanka_kingaku               | Number  | -        |              | 〇       | 新聞単価の表示金額。JA の税区分(m_ja.zei_kubun)で解決（1:内税→税込 / それ以外→税抜）。単価削除済み等は null    |
| 66  | →shiharai_hoho               | Number  | -        |              |          | 支払い方法 ※m_code.code_category='SHIHARAI_HOHO'を参照                                                        |
| 67  | →yubin_kubun                 | String  | -        |              |          | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）                                            |
| 68  | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | 購読料支払サイクル（月数 1〜12、未設定は null）                                                                |
| 69  | →biko                        | String  | -        |              |          | 備考（取消時は取消理由を記録・空文字許容）。一覧の最終データ列                                                 |
| 70  | meta                         | Object  | -        |              | -        | ページネーション情報                                                                                          |
| 71  | →total                       | Number  | -        |              | -        | 該当件数（履歴データ全体）                                                                                    |
| 72  | →page                        | Number  | -        |              | -        | 現在のページ                                                                                                  |
| 73  | →per_page                    | Number  | -        |              | -        | 1ページあたりの件数                                                                                           |
| 74  | →total_pages                 | Number  | -        |              | -        | 総ページ数                                                                                                    |

※ `mail_magazine_flg` / `gender` / `tetsuzuki_shurui` / `dokusya_shubetsu` / `shiharai_hoho` / `yubin_kubun` / `hikiotoshi_yokin_shubetsu` はコード値のみ返却し、ラベルはFE側で `useCodesStore().label('CATEGORY', value)` から取得する（`.claude/rules/nestjs.md §Response serialization` 参照）。

※ 新聞単価金額(`tanka_kingaku`)は JA の税区分で BE 解決する（単価ドロップダウン・haitatsuryo と同一方式）。`tanka_name` と併せ、一覧では「単価名 + 半角スペース + 金額」で表示する。

※ SCR-013 一覧の列並び（顧客要件 2026-07）: 履歴番号 → **購読種別** → 手続種別（購読種別の直後へ移動）→ … → **新聞単価**（購読部数の前）→ 購読部数 → … → 前回販売店名 → **初回購読開始日** → **増部日** → **減部日** → … → **支払い方法 / 郵送区分 / 購読料支払いサイクル**（引落口座貯金種目の前）→ 引落口座貯金種目 → … → **備考**（最終データ列）→ 操作。増部日/減部日は `dokusya_kaishi_date` を条件付き表示: 増部日は `dokusya_busu > zenkai_dokusya_busu` または `zenkai_dokusya_busu` が null のとき、減部日は `dokusya_busu < zenkai_dokusya_busu` または null のとき表示（それ以外は空欄）。

## リクエスト例

```
GET /api/v1/dokusya/1/rireki?page=1&per_page=20&sort_by=rireki_no&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_rireki_id": 42,
      "dokusya_id": 1,
      "rireki_no": 3,
      "ja_id": 1,
      "kanri_shiten_id": 5,
      "kanri_shiten_name": "東京中央管理支店",
      "shiten_id": 12,
      "shiten_name": "千代田支店",
      "kumiaiin_code": "K00012345",
      "shimei_sei": "山田",
      "shimei_mei": "太郎",
      "todofuken_code": "13",
      "todofuken_name": "東京都",
      "shikuchoson": "千代田区",
      "chome_banchi": "丸の内1-1-1",
      "tatemono_mei": "",
      "renrakusaki_1": "0312345678",
      "renrakusaki_2": "",
      "email": "yamada@example.com",
      "mail_magazine_flg": 1,
      "birth_year": 1980,
      "gender": 1,
      "dokusyaso_bunrui": "一般,個人",
      "nogyosya_bunrui": "",
      "dokusya_shubetsu": 1,
      "tanka_id": 1,
      "tanka_name": "新聞購読料",
      "tanka_kingaku": 3500,
      "dokusya_busu": 2,
      "zenkai_dokusya_busu": 1,
      "haitatsu_yubin_no": "1000001",
      "zenkai_yubin_no": "1000005",
      "haitatsu_todofuken_code": "13",
      "haitatsu_todofuken_name": "東京都",
      "haitatsu_shikuchoson": "千代田区",
      "haitatsu_chome_banchi": "丸の内1-1-1",
      "haitatsu_tatemono_mei": "",
      "haitatsu_shimei_sei": "",
      "haitatsu_shimei_mei": "",
      "zenkai_todofuken_code": "13",
      "zenkai_todofuken_name": "東京都",
      "zenkai_shikuchoson": "中央区",
      "zenkai_chome_banchi": "銀座1-1-1",
      "zenkai_tatemono_mei": "",
      "hanbaiten_id": 100,
      "hanbaiten_name": "丸の内販売店",
      "zenkai_hanbaiten_id": 99,
      "zenkai_hanbaiten_name": "銀座販売店",
      "tetsuzuki_shurui": 1,
      "shoki_dokusya_kaishi_date": "2024-04-01",
      "dokusya_kaishi_date": "2026-04-01",
      "dokusya_chushi_date": null,
      "joho_henko_tekiyo_date": "2026-04-01",
      "saishin_data_flg": true,
      "zougen_hokoku_flg": true,
      "shinki_flg": false,
      "kaiyaku_flg": false,
      "biko": "",
      "shiharai_hoho": 1,
      "yubin_kubun": "0",
      "dokusyaryo_shiharai_cycle": 1,
      "hikiotoshi_yokin_shubetsu": 1,
      "bank_branch_code": "001",
      "bank_branch_name": "本店",
      "hikiotoshi_koza_no": "1234567",
      "hikiotoshi_koza_meigi": "ヤマダタロウ",
      "created_at": "2026-04-01T10:00:00Z",
      "created_by": "ja_honten01"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

## レスポンス失敗例

### 400 Bad Request

```json
{
  "error_code": "BAD_REQUEST",
  "message": "リクエストパラメータが不正です。"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください。"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません。"
}
```

### 403 Data Scope Violation

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 429 Too Many Requests

```json
{
  "error_code": "TOO_MANY_REQUESTS",
  "message": "リクエスト回数が上限を超えました。しばらくしてから再度お試しください。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - `dokusya_id`：数値型、必須。
- クエリパラメータの検証：
  - `page`：数値型、`>= 1`。省略時 `1`。
  - `per_page`：数値型、`1 <= per_page <= 100`。省略時 `20`（機能定義 3.1 デフォルト 20、最大 100）。
  - `sort_by`：許可リスト = `{rireki_no, dokusya_kaishi_date, joho_henko_tekiyo_date, created_at}`。省略時 `rireki_no`。許可リスト外の値はバリデーションエラー。
  - `sort_order`：許可リスト = `{asc, desc}`。省略時 `desc`（機能定義 1.2 最新レコードを先頭）。
- バリデーション失敗時：HTTP 400 (`BAD_REQUEST` / `VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN（seeder.md §3 マトリクス No.2）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（account_concept.md ※1）:
  - CHUOKAI: `ja_id = user.ja_id`（自中央会のレコードのみ。管轄JAの読者は閲覧不可）
  - JA_HONTEN: `ja_id = user.ja_id`（自JAのみ）
  - JA_KANRI_SHITEN: `ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`（自管理支店のみ）
- DataScope違反（他JAまたは他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- 対象購読者の存在確認（DataScope内）:

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id
FROM m_dokusya
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL
  AND ja_id = :user_ja_id
  /* JA_KANRI_SHITEN の場合のみ追加 */
  AND (:user_kanri_shiten_id IS NULL OR kanri_shiten_id = :user_kanri_shiten_id)
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- ja_id / kanri_shiten_id が DataScope と一致しない場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.4 データ件数の取得

```sql
SELECT COUNT(*) AS total
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
  AND ja_id = :user_ja_id
  /* JA_KANRI_SHITEN の場合のみ追加 */
  AND (:user_kanri_shiten_id IS NULL OR kanri_shiten_id = :user_kanri_shiten_id)
```

### 4.5 データ取得

```sql
SELECT
  r.dokusya_rireki_id, r.dokusya_id, r.rireki_no,
  r.ja_id, r.kanri_shiten_id, ks.kanri_shiten_name,
  r.shiten_id, s.shiten_name,
  r.kumiaiin_code, r.shimei_sei, r.shimei_mei,
  r.todofuken_code, td.todofuken_name AS todofuken_name,
  r.shikuchoson, r.chome_banchi, r.tatemono_mei,
  r.renrakusaki_1, r.renrakusaki_2, r.email,
  r.mail_magazine_flg, r.birth_year, r.gender,
  r.dokusya_shubetsu,
  r.dokusyaso_bunrui, r.nogyosya_bunrui,
  r.tanka_id, t.tanka_name,
  /* 金額は JA の税区分で解決（zei_kubun=1 内税→税込、それ以外→税抜） */
  CASE WHEN ja.zei_kubun = 1 THEN t.kingaku_zeikomi ELSE t.kingaku_zeinuki END AS tanka_kingaku,
  r.dokusya_busu, r.zenkai_dokusya_busu,
  r.haitatsu_yubin_no, r.zenkai_yubin_no,
  r.haitatsu_todofuken_code, ht.todofuken_name AS haitatsu_todofuken_name,
  r.haitatsu_shikuchoson, r.haitatsu_chome_banchi, r.haitatsu_tatemono_mei,
  r.haitatsu_shimei_sei, r.haitatsu_shimei_mei,
  r.zenkai_todofuken_code, zt.todofuken_name AS zenkai_todofuken_name,
  r.zenkai_shikuchoson, r.zenkai_chome_banchi, r.zenkai_tatemono_mei,
  r.hanbaiten_id, h.hanbaiten_name,
  r.zenkai_hanbaiten_id, zh.hanbaiten_name AS zenkai_hanbaiten_name,
  r.tetsuzuki_shurui,
  r.shoki_dokusya_kaishi_date, r.dokusya_kaishi_date,
  r.dokusya_chushi_date, r.joho_henko_tekiyo_date,
  r.saishin_data_flg, r.zougen_hokoku_flg, r.shinki_flg, r.kaiyaku_flg,
  r.biko,
  r.shiharai_hoho, r.yubin_kubun, r.dokusyaryo_shiharai_cycle,
  r.hikiotoshi_yokin_shubetsu,
  r.bank_branch_code, r.bank_branch_name,
  r.hikiotoshi_koza_no, r.hikiotoshi_koza_meigi,
  r.created_at, r.created_by
FROM t_dokusya_rireki r
LEFT JOIN m_kanri_shiten ks ON r.kanri_shiten_id = ks.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten        s  ON r.shiten_id        = s.shiten_id        AND s.deleted_at IS NULL
LEFT JOIN m_todofuken     td ON r.todofuken_code   = td.todofuken_code
LEFT JOIN m_todofuken     ht ON r.haitatsu_todofuken_code = ht.todofuken_code
LEFT JOIN m_todofuken     zt ON r.zenkai_todofuken_code   = zt.todofuken_code
LEFT JOIN m_hanbaiten     h  ON r.hanbaiten_id        = h.hanbaiten_id        AND h.deleted_at IS NULL
LEFT JOIN m_hanbaiten     zh ON r.zenkai_hanbaiten_id = zh.hanbaiten_id        AND zh.deleted_at IS NULL
/* 新聞単価（名称）と、金額を税区分で解決するための JA を結合 */
LEFT JOIN m_tanka         t  ON r.tanka_id = t.tanka_id
LEFT JOIN m_ja            ja ON r.ja_id    = ja.ja_id
WHERE r.dokusya_id = :dokusya_id
  AND r.ja_id = :user_ja_id
  /* JA_KANRI_SHITEN の場合のみ追加 */
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY r.:sort_by :sort_order
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

※ `t_dokusya_rireki` には `deleted_at` カラムが存在しない（履歴テーブルは挿入専用・物理削除なし）。

### 4.6 レスポンス生成

- 取得結果を `data` 配列、件数情報を `meta` オブジェクトとして返却する。HTTP 200。
- 0件の場合は `data: []` を返し、フロントエンドが ACSMS-MSG-013-001「履歴データが存在しません。」を表示する。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- 本APIは参照系のため操作ログ（`t_log`）の記録は不要。ただしエラー発生時はアプリケーションロガーへ出力する（log_type=3 相当）。
