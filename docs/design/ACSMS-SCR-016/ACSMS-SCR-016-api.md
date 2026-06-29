---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-016
screen_name: 購読者Excelデータ取込画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-15
created_date: 2026/05/15
created_by: Tran Duc Tuyen
updated_date: 2026/05/15
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/06/16 | 1.1  | Tran Duc Tuyen | 不具合修正：UPDATE_ALL / UPDATE_PARTIAL の更新カラム欠落を修正。`UPDATE_ALL` は §4.4.2 の全項目（email / 郵便番号 / 都道府県 / 住所 / 配達先 / 口座 / 単価・販売店 等）を更新するよう実装を是正（旧実装は7列のみ）。`UPDATE_PARTIAL` の更新可能カラムを取込テンプレート全項目（FKコード列 hanbaiten_code→hanbaiten_id / tanka_code→tanka_id 解決含む）へ拡張。NOT NULL の FK・参照列（管理支店 / 支店 / 販売店 / 単価 / 購読種別 / 手続種類 / 支払方法）は空欄上書きで制約違反にならないよう `COALESCE(:値, 既存値)` で既存値を維持。購読開始日(初回・shoki_dokusya_kaishi_date)は不変のため更新対象外。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/06/25 | 1.2  | Tran Duc Tuyen | 顧客要件 2026-06：(1) **手続種類カラムをテンプレート/取込列から削除**。取込で解約は扱わず、NEW は `tetsuzuki_shurui=1`（新規）固定、UPDATE は手続種類を変更しない（既存値維持）。(2) **販売店適用日カラムを追加**（テンプレート末尾）。(3) UPDATE は読者情報変更適用日が必須、販売店が変わる行は販売店適用日が必須（IMPORT_VALIDATION_ERROR）。(4) **UPDATE で情報変更と販売店変更が同時のとき履歴を2件に分割**（情報イベント: hanbaiten_tekiyo_date=NULL / 販売店イベント: hanbaiten_tekiyo_date=joho_henko=販売店適用日。適用日が早い方を先・遅い方を saishin_data_flg=true。UI 編集 SCR-011/013 §14.3 と同一ロジック）。旧 §4.4.4 一括中止（解約）は廃止。(5) **「購読者情報と同じ」(haitatsu_same_flg) 列を追加**（配達先列の直前）。TRUE なら配達先＝購読者住所で配達先列は空でよい。BE は推論せず列値を採用（列が空欄の行のみ従来の自動判定）。取込列上限は 49→50 に拡張。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者Excelデータ取込画面（ACSMS-SCR-016）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                                 |
| --- | ------------- | -------------------------------------- |
| 1   | ACSMS-SCR-011 | 購読者情報登録画面 API設計書           |
| 2   | ACSMS-SCR-013 | 購読者履歴情報画面 API設計書           |
| 3   | ACSMS-SCR-019 | 販売店Excelデータ取込画面 API設計書    |

## エラー一覧

| #   | エラータイプ | エラーコード              | エラーメッセージ                                                                | 備考     |
| --- | ------------ | ------------------------- | ------------------------------------------------------------------------------- | -------- |
| 1   | 共通         | BAD_REQUEST               | リクエストパラメータが不正です。                                                | HTTP 400 |
| 2   | 共通         | UNAUTHORIZED              | セッションが切れました。再度ログインしてください。                              | HTTP 401 |
| 3   | 共通         | FORBIDDEN                 | この画面へのアクセス権限がありません。                                          | HTTP 403 |
| 4   | 共通         | DATA_SCOPE_VIOLATION      | このデータへのアクセス権限がありません。                                        | HTTP 403 |
| 5   | 共通         | VALIDATION_ERROR          | 入力値が不正です。詳細はerrorsフィールドを確認してください。                    | HTTP 400 |
| 6   | 共通         | TOO_MANY_REQUESTS         | リクエスト回数が上限を超えました。しばらくしてから再度お試しください。          | HTTP 429 |
| 7   | 共通         | INTERNAL_SERVER_ERROR     | システムエラーが発生しました。しばらくしてから再度お試しください。              | HTTP 500 |
| 8   | 画面固有     | IMPORT_VALIDATION_ERROR   | Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。   | HTTP 400 |
| 9   | 画面固有     | FILE_FORMAT_ERROR         | Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。         | HTTP 400 |
| 10  | 画面固有     | ROW_LIMIT_EXCEEDED        | ファイルの行数が上限（30000行）を超えているため、取込みできません。             | HTTP 400 |

---

# API ACSMS-API-016-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Download Dokusya Import Template                                                                                                                                                                      |
| 概要                   | 購読者Excelデータ取込用のテンプレートファイル（49列固定）を生成しダウンロードする。                                                                                                                   |
| URI                    | /api/v1/dokusya/import/template                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                   |
| リクエストボディー     | なし                                                                                                                                                                                                  |
| リクエストパラメーター | なし                                                                                                                                                                                                  |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                |
| HTTPレスポンスコード   | 200:正常にテンプレートを生成しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                  |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID              | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                                       |
| --- | ------------------- | ------ | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | （バイナリデータ）  | Binary | -        | XLSX         | -        | Excelファイル（MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）   |

### レスポンスヘッダ

| ヘッダ名            | 値                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Content-Type        | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet                        |
| Content-Disposition | attachment; filename="購読者Excelデータ取込_テンプレート.xlsx"                          |

### テンプレートファイル仕様

- シート名：`購読者`
- 1行目：ヘッダー行（49列を以下の順序で設定）

| 列 | ヘッダー名                       | 論理カラム                 | 物理カラム                 | データ型      | 桁数 |
| -- | -------------------------------- | -------------------------- | -------------------------- | ------------- | ---- |
| 1  | ID                               | 購読者ID                   | dokusya_id                 | BIGINT        | -    |
| 2  | 購読種別                         | 購読種別                   | dokusya_shubetsu           | INTEGER       | -    |
| 3  | ~~手続種類~~（**削除** v1.2）    | ~~手続種類~~               | ~~tetsuzuki_shurui~~       | -             | -    |
| 4  | 管理支店                         | 管理支店コード             | kanri_shiten_code          | VARCHAR       | 20   |
| 5  | 支店                             | 支店コード                 | shiten_code                | VARCHAR       | 20   |
| 6  | 組合員コード                     | 組合員コード               | kumiaiin_code              | VARCHAR       | 20   |
| 7  | 購読者苗字（漢字）               | 氏名（姓）                 | shimei_sei                 | VARCHAR       | 50   |
| 8  | 購読者名前（漢字）               | 氏名（名）                 | shimei_mei                 | VARCHAR       | 50   |
| 9  | 購読者苗字（かな）               | 氏名かな（姓）             | shimei_kana_sei            | VARCHAR       | 100  |
| 10 | 購読者名前（かな）               | 氏名かな（名）             | shimei_kana_mei            | VARCHAR       | 100  |
| 11 | 購読部数                         | 購読部数                   | dokusya_busu               | INTEGER       | -    |
| 12 | 新聞単価                         | 単価コード                 | tanka_code                 | VARCHAR       | 10   |
| 13 | メールアドレス                   | メールアドレス             | email                      | VARCHAR       | 100  |
| 14 | メールマガジン                   | メールマガジン             | mail_magazine_flg          | INTEGER       | -    |
| 15 | 生年（西暦）                     | 生年                       | birth_year                 | INTEGER       | 4    |
| 16 | 性別                             | 性別                       | gender                     | INTEGER       | -    |
| 17 | 郵便番号                         | 郵便番号                   | yubin_no                   | VARCHAR       | 7    |
| 18 | 都道府県                         | 都道府県コード             | todofuken_code             | VARCHAR       | 2    |
| 19 | 市町村郡                         | 市町村郡                   | shikuchoson                | VARCHAR       | 100  |
| 20 | 丁目番地                         | 丁目番地                   | chome_banchi               | VARCHAR       | 100  |
| 21 | マンション・アパート名           | マンション名等             | tatemono_mei               | VARCHAR       | 100  |
| 22 | 連絡先１                         | 連絡先１                   | renrakusaki_1              | VARCHAR       | 15   |
| 23 | 連絡先２                         | 連絡先２                   | renrakusaki_2              | VARCHAR       | 15   |
| 23a| 購読者情報と同じ（v1.2 追加）    | 購読者情報と同じ           | haitatsu_same_flg          | BOOLEAN       | -    |
| 24 | 郵便番号(配達先)                 | 配達先郵便番号             | haitatsu_yubin_no          | VARCHAR       | 7    |
| 25 | 都道府県(配達先)                 | 配達先都道府県コード       | haitatsu_todofuken_code    | VARCHAR       | 2    |
| 26 | 市町村郡(配達先)                 | 配達先市町村郡             | haitatsu_shikuchoson       | VARCHAR       | 100  |
| 27 | 丁目番地(配達先)                 | 配達先丁目番地             | haitatsu_chome_banchi      | VARCHAR       | 100  |
| 28 | ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)           | 配達先建物名               | haitatsu_tatemono_mei      | VARCHAR       | 100  |
| 29 | 連絡先１(配達先)                 | 配達先連絡先１             | haitatsu_renrakusaki_1     | VARCHAR       | 15   |
| 30 | 連絡先２(配達先)                 | 配達先連絡先２             | haitatsu_renrakusaki_2     | VARCHAR       | 15   |
| 31 | 配達先苗字（漢字）               | 配達先氏名（姓）           | haitatsu_shimei_sei        | VARCHAR       | 50   |
| 32 | 配達先名前（漢字）               | 配達先氏名（名）           | haitatsu_shimei_mei        | VARCHAR       | 50   |
| 33 | 配達先苗字（かな）               | 配達先氏名かな（姓）       | haitatsu_shimei_kana_sei   | VARCHAR       | 100  |
| 34 | 配達先名前（かな）               | 配達先氏名かな（名）       | haitatsu_shimei_kana_mei   | VARCHAR       | 100  |
| 35 | 販売店コード                     | 販売店コード               | hanbaiten_code             | VARCHAR       | 10   |
| 36 | 郵送区分                         | 郵送区分                   | yubin_kubun                | VARCHAR       | 1    |
| 37 | 支払方法                         | 支払方法                   | shiharai_hoho              | INTEGER       | -    |
| 38 | 購読料支払サイクル（月数）       | 購読料支払サイクル         | dokusyaryo_shiharai_cycle  | INTEGER       | -    |
| 39 | 引落口座貯金種目                 | 引落口座貯金種目           | hikiotoshi_yokin_shubetsu  | INTEGER       | -    |
| 40 | 引落口座支店コード               | 引落口座支店コード         | bank_branch_code           | VARCHAR       | 3    |
| 41 | 引落口座支店名                   | 引落口座支店名             | bank_branch_name           | VARCHAR       | 100  |
| 42 | 引落口座番号                     | 引落口座番号               | hikiotoshi_koza_no         | VARCHAR       | 10   |
| 43 | 引落口座名義                     | 引落口座名義               | hikiotoshi_koza_meigi      | VARCHAR       | 50   |
| 44 | 購読者層分類                     | 購読者層分類               | dokusyaso_bunrui           | VARCHAR       | 50   |
| 45 | 農業者分類                       | 農業者分類                 | nogyosya_bunrui            | VARCHAR       | 50   |
| 46 | 購読開始日                       | 購読開始日                 | dokusya_kaishi_date        | DATE          | -    |
| 47 | 購読中止日                       | 購読中止日                 | dokusya_chushi_date        | DATE          | -    |
| 48 | 備考                             | 備考                       | biko                       | TEXT          | -    |
| 49 | 読者情報変更適用日               | 読者情報変更適用日         | joho_henko_tekiyo_date     | DATE          | -    |
| 50 | 販売店適用日（v1.2 追加）        | 販売店適用日               | hanbaiten_tekiyo_date      | DATE          | -    |

> v1.2（顧客要件 2026-06）: 列3「手続種類」は削除（取込で解約は扱わない。NEW は新規(1)固定・UPDATE は変更不可）。列50「販売店適用日」を追加（販売店が変わる UPDATE 行で必須。履歴の販売店イベント日）。実カラム順の正準は BE `IMPORT_TEMPLATE_HEADERS`。
> **NEW（新規登録）モードでは「読者情報変更適用日」「販売店適用日」は対象外**（履歴の変更イベント日であり新規登録に概念が無いため。取込列パネルでは未チェック＋disable、保存時も NULL）。両列は UPDATE_ALL / UPDATE_PARTIAL でのみ使用する。

## リクエスト例

```
GET /api/v1/dokusya/import/template
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="購読者Excelデータ取込_テンプレート.xlsx"

(バイナリデータ)
```

## レスポンス失敗例

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

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- リクエストパラメータなし。特に検証なし。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.import`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: 本APIはマスターデータを返さないため、DataScope違反は発生しない。

### 4.3 テンプレート生成

- ExcelJSライブラリを使用して新規ワークブックを生成する。
- シート名：`購読者`
- 1行目に49列のヘッダー文字列を以下の順序で書き込む。
  - 「ID」「購読種別」「手続種類」「管理支店」「支店」「組合員コード」「購読者苗字（漢字）」「購読者名前（漢字）」「購読者苗字（かな）」「購読者名前（かな）」「購読部数」「新聞単価」「メールアドレス」「メールマガジン」「生年（西暦）」「性別」「郵便番号」「都道府県」「市町村郡」「丁目番地」「マンション・アパート名」「連絡先１」「連絡先２」「郵便番号(配達先)」「都道府県(配達先)」「市町村郡(配達先)」「丁目番地(配達先)」「ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)」「連絡先１(配達先)」「連絡先２(配達先)」「配達先苗字（漢字）」「配達先名前（漢字）」「配達先苗字（かな）」「配達先名前（かな）」「販売店コード」「郵送区分」「支払方法」「購読料支払サイクル（月数）」「引落口座貯金種目」「引落口座支店コード」「引落口座支店名」「引落口座番号」「引落口座名義」「購読者層分類」「農業者分類」「購読開始日」「購読中止日」「備考」「読者情報変更適用日」
- ヘッダー行はボールドスタイル、背景色を設定する。
- 2行目に書式見本となるサンプルデータ行を1行書き込む（紙版(1)/新規(1)、購読部数>0、性別1、かなはひらがな、郵便番号7桁、連絡先は半角数字、支払方法は現金集金(2)で引落口座不要、購読開始日は YYYY-MM-DD）。管理支店・支店・新聞単価・販売店コード等のFKコード列は自組織固有のため空欄とし、備考欄に「インポート前に書き換えてください。」と明記する。
- 各列の幅を項目内容に合わせて自動調整する。
- 数字コードと文言の両方での取込みに対応するため、コードまたは文言のいずれかを入力可能とする旨を備考欄や説明シートで案内してもよい（例: 性別は「1」「男性」のいずれも可）。

### 4.4 レスポンス生成

- 生成したExcelファイルをバイナリデータとしてレスポンスに設定する。
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="購読者Excelデータ取込_テンプレート.xlsx"`
- HTTP 200 で返却する。

### 4.5 例外処理

- ファイル生成エラー、DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-016-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Import Dokusya Excel                                                                                                                                                                                                                                                                                       |
| 概要                   | 購読者Excelデータを一括取込する（新規登録 / 全項目更新 / 入力箇所のみ更新）。1トランザクションで処理し、エラー時は全件ロールバック。一括中止の場合は組合員コードをキーに手続種類＝解約・購読中止日を設定して更新する。取り込みと同件数分のレコードを `t_dokusya_rireki` テーブルに追加する。 |
| URI                    | /api/v1/dokusya/import                                                                                                                                                                                                                                                                                     |
| メソッド               | POST                                                                                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常に取込処理が完了しました, 400:入力内容にエラーがあります, 400:Excel取込データにエラーがあります, 400:取込データ行数の上限を超えています, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                       |

## リクエストパラメータ

| #   | パラメーターID                | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                       |
| --- | ----------------------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | import_mode                   | String  | -        | ○    |        |        | 取込モード（`NEW`:新規登録, `UPDATE_ALL`:全項目更新, `UPDATE_PARTIAL`:入力箇所のみ更新）                                                                  |
| 2   | selected_columns              | Array   | 〇       | ○    | 1      | 49     | 取込対象の列（物理カラム名）配列。新規登録モードでは必須列を必ず含むこと。                                                                                 |
| 3   | rows                          | Array   | 〇       | ○    | 1      | 30000  | 取込データ行の配列。30000件を超える場合は `ROW_LIMIT_EXCEEDED` を返却する。                                                                                |
| 4   | →dokusya_id                   | Number  | -        | -    | -      | -      | 購読者ID。`UPDATE_ALL` / `UPDATE_PARTIAL` モード（組合員コード未指定時）はキー項目として必須。`NEW` モードは無視する。                                     |
| 5   | →dokusya_shubetsu             | Number  | -        | -    | -      | -      | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）。Excel取込みは 1/2 のみ受付。3 はエラー。                              |
| 6   | →tetsuzuki_shurui             | Number  | -        | -    | -      | -      | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                                  |
| 7   | →kanri_shiten_code            | String  | -        | -    | 0      | 20     | 管理支店コード。自JA内の m_kanri_shiten.kanri_shiten_code を解決し t_dokusya.kanri_shiten_id へ保存。`NEW` モードは必須。                                    |
| 8   | →shiten_code                  | String  | -        | -    | 0      | 20     | 支店コード。自JA内の m_shiten.shiten_code を解決し t_dokusya.shiten_id へ保存。                                                                              |
| 9   | →kumiaiin_code                | String  | -        | -    | 0      | 20     | 組合員コード。一括中止時にキー項目として必須。                                                                                                              |
| 10  | →shimei_sei                   | String  | -        | -    | 0      | 50     | 氏名（姓・漢字）                                                                                                                                            |
| 11  | →shimei_mei                   | String  | -        | -    | 0      | 50     | 氏名（名・漢字）                                                                                                                                            |
| 12  | →shimei_kana_sei              | String  | -        | -    | 0      | 100    | 氏名かな（姓）                                                                                                                                              |
| 13  | →shimei_kana_mei              | String  | -        | -    | 0      | 100    | 氏名かな（名）                                                                                                                                              |
| 14  | →dokusya_busu                 | Number  | -        | -    | -      | -      | 購読部数。`NEW`：> 0、解約時：= 0。                                                                                                                          |
| 15  | →tanka_code                   | String  | -        | -    | 0      | 10     | 新聞単価コード（m_tanka の tanka_code・tanka_type=1 で解決）。`NEW` モードは必須。                                                                          |
| 16  | →email                        | String  | -        | -    | 0      | 100    | メールアドレス。メール形式チェック。                                                                                                                        |
| 17  | →mail_magazine_flg            | Number  | -        | -    | -      | -      | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                                                                  |
| 18  | →birth_year                   | Number  | -        | -    | -      | -      | 生年（西暦、1900〜現在年）                                                                                                                                  |
| 19  | →gender                       | Number  | -        | -    | -      | -      | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）。文言（「男性」「女性」「回答しない」）でも取込可。                              |
| 20  | →yubin_no                     | String  | -        | -    | 7      | 7      | 郵便番号（ハイフン除去、7桁固定）。`NEW` モードは必須。                                                                                                     |
| 21  | →todofuken_code               | String  | -        | -    | 2      | 2      | 都道府県コード（2桁）。`NEW` モードは必須。                                                                                                                 |
| 22  | →shikuchoson                  | String  | -        | -    | 0      | 100    | 市町村郡。`NEW` モードは必須。                                                                                                                              |
| 23  | →chome_banchi                 | String  | -        | -    | 0      | 100    | 丁目番地。`NEW` モードは必須。                                                                                                                              |
| 24  | →tatemono_mei                 | String  | -        | -    | 0      | 100    | マンション・アパート名                                                                                                                                      |
| 25  | →renrakusaki_1                | String  | -        | -    | 0      | 15     | 連絡先１（数字のみ保存）。`NEW` モードは必須。                                                                                                              |
| 26  | →renrakusaki_2                | String  | -        | -    | 0      | 15     | 連絡先２（数字のみ保存）                                                                                                                                    |
| 27  | →haitatsu_yubin_no            | String  | -        | -    | 0      | 7      | 配達先郵便番号                                                                                                                                              |
| 28  | →haitatsu_todofuken_code      | String  | -        | -    | 0      | 2      | 配達先都道府県コード                                                                                                                                        |
| 29  | →haitatsu_shikuchoson         | String  | -        | -    | 0      | 100    | 配達先市町村郡                                                                                                                                              |
| 30  | →haitatsu_chome_banchi        | String  | -        | -    | 0      | 100    | 配達先丁目番地                                                                                                                                              |
| 31  | →haitatsu_tatemono_mei        | String  | -        | -    | 0      | 100    | 配達先建物名                                                                                                                                                |
| 32  | →haitatsu_renrakusaki_1       | String  | -        | -    | 0      | 15     | 配達先連絡先１                                                                                                                                              |
| 33  | →haitatsu_renrakusaki_2       | String  | -        | -    | 0      | 15     | 配達先連絡先２                                                                                                                                              |
| 34  | →haitatsu_shimei_sei          | String  | -        | -    | 0      | 50     | 配達先氏名（姓・漢字）                                                                                                                                      |
| 35  | →haitatsu_shimei_mei          | String  | -        | -    | 0      | 50     | 配達先氏名（名・漢字）                                                                                                                                      |
| 36  | →haitatsu_shimei_kana_sei     | String  | -        | -    | 0      | 100    | 配達先氏名かな（姓）                                                                                                                                        |
| 37  | →haitatsu_shimei_kana_mei     | String  | -        | -    | 0      | 100    | 配達先氏名かな（名）                                                                                                                                        |
| 38  | →hanbaiten_code               | String  | -        | -    | 0      | 10     | 販売店コード（m_hanbaiten の hanbaiten_code で解決）。`NEW` モードは必須。                                                                                  |
| 39  | →yubin_kubun                  | String  | -        | -    | 0      | 1      | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）                                                                                          |
| 40  | →shiharai_hoho                | Number  | -        | -    | -      | -      | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）。`NEW` モードは必須。 |
| 41  | →dokusyaryo_shiharai_cycle    | Number  | -        | -    | -      | -      | 購読料支払サイクル（月数）                                                                                                                                  |
| 42  | →hikiotoshi_yokin_shubetsu    | Number  | -        | -    | -      | -      | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）。文言（「普通」「当座」）でも取込可。                                       |
| 43  | →bank_branch_code             | String  | -        | -    | 0      | 3      | 引落口座支店コード                                                                                                                                          |
| 44  | →bank_branch_name             | String  | -        | -    | 0      | 100    | 引落口座支店名                                                                                                                                              |
| 45  | →hikiotoshi_koza_no           | String  | -        | -    | 0      | 10     | 引落口座番号                                                                                                                                                |
| 46  | →hikiotoshi_koza_meigi        | String  | -        | -    | 0      | 50     | 引落口座名義（全角カナ→半角カナに変換して保存）                                                                                                             |
| 47  | →dokusyaso_bunrui             | String  | -        | -    | 0      | 50     | 購読者層分類（カンマ区切り）                                                                                                                                |
| 48  | →nogyosya_bunrui              | String  | -        | -    | 0      | 50     | 農業者分類（カンマ区切り）                                                                                                                                  |
| 49  | →dokusya_kaishi_date          | String  | -        | -    | -      | 10     | 購読開始日（YYYY-MM-DD）。`NEW` モードは必須。                                                                                                              |
| 50  | →dokusya_chushi_date          | String  | -        | -    | -      | 10     | 購読中止日（YYYY-MM-DD）                                                                                                                                    |
| 51  | →biko                         | String  | -        | -    | -      | -      | 備考                                                                                                                                                        |
| 52  | →joho_henko_tekiyo_date       | String  | -        | -    | -      | 10     | 読者情報変更適用日（YYYY-MM-DD）                                                                                                                            |

※ rows 配列内の各行は `selected_columns` に含まれる項目のみ有効値として扱う。
※ 未選択列の扱いは以下のとおり。
- `NEW` モード：デフォルト値（空文字 / NULL / 0）を設定する。
- `UPDATE_ALL` モード：NULL/空文字で上書きする。
- `UPDATE_PARTIAL` モード：既存値を維持する。

## レスポンスデータ

| #   | 項目ID             | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                                       |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | data               | Object | -        |              | -        | 取込結果サマリ                                                                              |
| 2   | →import_mode       | String | -        |              | -        | 実行した取込モード（`NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL`）                              |
| 3   | →total_rows        | Number | -        |              | -        | 取込対象行数                                                                                |
| 4   | →created_count     | Number | -        |              | -        | 新規登録件数                                                                                |
| 5   | →updated_count     | Number | -        |              | -        | 更新件数                                                                                    |
| 6   | →cancelled_count   | Number | -        |              | -        | 一括中止（解約）件数                                                                        |
| 7   | →skipped_count     | Number | -        |              | -        | スキップ件数                                                                                |
| 8   | →rireki_count      | Number | -        |              | -        | 履歴テーブル（t_dokusya_rireki）への追加件数                                                |
| 9   | →imported_at       | String | -        | ISO8601      | -        | 取込完了日時                                                                                |
| 10  | message            | String | -        |              | -        | 取り込みました。                                                                       |

## リクエスト例

```json
POST /api/v1/dokusya/import
Content-Type: application/json

{
  "import_mode": "NEW",
  "selected_columns": [
    "dokusya_shubetsu",
    "tetsuzuki_shurui",
    "kanri_shiten_code",
    "shiten_code",
    "shimei_sei",
    "shimei_mei",
    "dokusya_busu",
    "tanka_code",
    "yubin_no",
    "todofuken_code",
    "shikuchoson",
    "chome_banchi",
    "renrakusaki_1",
    "hanbaiten_code",
    "shiharai_hoho",
    "dokusya_kaishi_date"
  ],
  "rows": [
    {
      "dokusya_shubetsu": 1,
      "tetsuzuki_shurui": 1,
      "kanri_shiten_code": "KS001",
      "shiten_code": "SH001",
      "shimei_sei": "山田",
      "shimei_mei": "太郎",
      "dokusya_busu": 1,
      "tanka_code": "T001",
      "yubin_no": "1000001",
      "todofuken_code": "13",
      "shikuchoson": "千代田区",
      "chome_banchi": "1-1-1",
      "renrakusaki_1": "0312345678",
      "hanbaiten_code": "H001",
      "shiharai_hoho": 1,
      "dokusya_kaishi_date": "2026-05-01"
    },
    {
      "dokusya_shubetsu": 1,
      "tetsuzuki_shurui": 1,
      "kanri_shiten_code": "KS001",
      "shiten_code": "SH001",
      "shimei_sei": "鈴木",
      "shimei_mei": "花子",
      "dokusya_busu": 1,
      "tanka_code": "T001",
      "yubin_no": "1000002",
      "todofuken_code": "13",
      "shikuchoson": "中央区",
      "chome_banchi": "2-2-2",
      "renrakusaki_1": "0398765432",
      "hanbaiten_code": "H001",
      "shiharai_hoho": 2,
      "dokusya_kaishi_date": "2026-05-01"
    }
  ]
}
```

## レスポンス成功例

```json
{
  "data": {
    "import_mode": "NEW",
    "total_rows": 2,
    "created_count": 2,
    "updated_count": 0,
    "cancelled_count": 0,
    "skipped_count": 0,
    "rireki_count": 2,
    "imported_at": "2026-05-15T10:00:00+09:00"
  },
  "message": "取り込みました。"
}
```

## レスポンス失敗例

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "import_mode", "message": "取込モードは必須です。" },
    { "field": "selected_columns", "message": "取込対象列を1つ以上選択してください。" }
  ]
}
```

### 400 Bad Request (Import Validation Error — 行別エラー)

```json
{
  "error_code": "IMPORT_VALIDATION_ERROR",
  "message": "Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "row": 2, "field": "dokusya_shubetsu", "message": "購読種別が3:併読のためExcel取込みできません。" },
    { "row": 3, "field": "shiharai_hoho", "message": "電子版かつクレジットカード決済の組み合わせは取込みできません。" },
    { "row": 5, "field": "tanka_code", "message": "指定された新聞単価コードが見つかりません。" },
    { "row": 7, "field": "dokusya_busu", "message": "新規登録の場合、購読部数は0より大きい値を指定してください。" },
    { "row": 9, "field": "kumiaiin_code", "message": "指定された組合員コードが見つかりません。" }
  ]
}
```

### 400 Bad Request (Row Limit Exceeded)

```json
{
  "error_code": "ROW_LIMIT_EXCEEDED",
  "message": "ファイルの行数が上限（30000行）を超えているため、取込みできません。"
}
```

### 400 Bad Request (File Format Error)

```json
{
  "error_code": "FILE_FORMAT_ERROR",
  "message": "Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。"
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

### 403 Forbidden (DataScope Violation)

```json
{
  "error_code": "DATA_SCOPE_VIOLATION",
  "message": "このデータへのアクセス権限がありません。"
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

> ※ 4.4 データ取込実行 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - `import_mode`：必須、`NEW` / `UPDATE_ALL` / `UPDATE_PARTIAL` のいずれか
  - `selected_columns`：必須、配列、1件以上
    - `NEW` モードでは、新規登録必須項目（dokusya_shubetsu, kanri_shiten_code, shiten_code, dokusya_busu, tanka_code, yubin_no, todofuken_code, shikuchoson, chome_banchi, renrakusaki_1, hanbaiten_code, shiharai_hoho, dokusya_kaishi_date）を必ず含むこと（手続種類はシステムが新規(1)を設定するため対象外。v1.2）
  - `rows`：必須、配列、1件以上、30000件以下
    - 30000件を超える場合：HTTP 400 (`ROW_LIMIT_EXCEEDED`)
  - 各行 `rows[i]` の検証（`selected_columns` 対象列のみ）：
    - 文字列項目：最大桁数チェック
    - 数値項目：型チェック、範囲チェック
    - `dokusya_shubetsu`：1 / 2 のみ受付。3 はエラー（電子版連携のみで、Excel取込み対象外）
    - `tetsuzuki_shurui`：取込対象外（v1.2 — テンプレートから削除。NEW=新規(1)固定・UPDATE=変更不可）
    - `gender`：1 / 2 / 9 のいずれか、または文言「男性」「女性」「回答しない」を数値に変換して取込
    - `hikiotoshi_yokin_shubetsu`：1 / 2 のいずれか、または文言「普通」「当座」を数値に変換して取込
    - `mail_magazine_flg`：0 / 1 のいずれか
    - `yubin_kubun`：`0` / `1` のいずれか
    - `shiharai_hoho`：1 / 2 / 3 / 4 / 5 / 6 / 9 のいずれか
    - `yubin_no` / `haitatsu_yubin_no`：7桁、数字のみ、ハイフン除去
    - `todofuken_code` / `haitatsu_todofuken_code`：2桁の都道府県コード
    - `email`：メールアドレス形式チェック
    - `birth_year`：1900〜現在年
    - `dokusya_busu`：1 以上（v1.2 — 解約は取込対象外のため 0 入力なし）
    - `joho_henko_tekiyo_date`：UPDATE_ALL / UPDATE_PARTIAL では必須（履歴の情報変更イベント日。v1.2）
    - `hanbaiten_tekiyo_date`：UPDATE で販売店が変わる行は必須（履歴の販売店イベント日。v1.2）
    - `dokusya_kaishi_date` / `dokusya_chushi_date` / `joho_henko_tekiyo_date` / `hanbaiten_tekiyo_date`：`YYYY-MM-DD` 形式
    - `renrakusaki_1` / `renrakusaki_2`：数字のみ保存
    - `hikiotoshi_koza_meigi`：全角カナ→半角カナ変換
- 業務ルールチェック：
  - 電子版（`dokusya_shubetsu`=2）かつクレジットカード決済（`shiharai_hoho`=6）の組み合わせは取込不可 → エラー（理由：電子版かつクレカ決済取込不可のため）
- トップレベルのバリデーションエラー：HTTP 400 (`VALIDATION_ERROR`) + errors配列
- 行レベルのバリデーションエラー：HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors配列（row番号含む。最大10件まで返却）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.import`
- 該当権限保持ロール: CHUOKAI（中央会）/ JA_HONTEN（JA本店）/ JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: ログインユーザーの `ja_id`（および JA_KANRI_SHITEN の場合は `kanri_shiten_id`）を取得する。
  - 中央会：自中央会管轄JAのみ取込可能。
  - JA本店：自JAのみ取込可能。
  - JA管理支店：自管理支店配下のみ取込可能。
- DataScope違反（他JA・他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 事前チェック（参照整合性・重複）

- ログインユーザーのスコープを取得する（`ja_id` / `kanri_shiten_id`）。
- DBとの整合性チェックをバッチで実行する。

#### 4.3.1 単価コードの解決（購読料単価）

```sql
SELECT tanka_id, tanka_code
FROM m_tanka
WHERE ja_id = :ja_id
  AND tanka_code = ANY(:tanka_codes)
  AND tanka_type = 1  -- 購読料
  AND deleted_at IS NULL
```

- 未ヒットの `tanka_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='tanka_code'）

#### 4.3.2 販売店コードの解決

```sql
SELECT hanbaiten_id, hanbaiten_code
FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = ANY(:hanbaiten_codes)
  AND deleted_at IS NULL
```

- 未ヒットの `hanbaiten_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='hanbaiten_code'）

#### 4.3.3 管理支店・支店の存在チェック

管理支店・支店はコードで取込み、自JA内で `*_code → *_id` に解決して保存する（hanbaiten_code / tanka_code と同方針）。

```sql
SELECT kanri_shiten_id, kanri_shiten_code
FROM m_kanri_shiten
WHERE ja_id = :ja_id
  AND kanri_shiten_code = ANY(:kanri_shiten_codes)
  AND deleted_at IS NULL

SELECT shiten_id, shiten_code
FROM m_shiten
WHERE ja_id = :ja_id
  AND shiten_code = ANY(:shiten_codes)
  AND deleted_at IS NULL
```

- 未ヒットの `kanri_shiten_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='kanri_shiten_code'）
- 未ヒットの `shiten_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='shiten_code'）

- 未ヒット：`IMPORT_VALIDATION_ERROR` + errors（row, field）
- JA_KANRI_SHITEN の場合、自管理支店 ID と一致しない `kanri_shiten_id` も DataScope 違反とする。

#### 4.3.4 既存購読者の取得（モード別）

```sql
-- UPDATE_ALL / UPDATE_PARTIAL モード（dokusya_id をキー、または kumiaiin_code をキー）
SELECT dokusya_id, kumiaiin_code, ja_id, kanri_shiten_id
FROM t_dokusya
WHERE ja_id = :ja_id
  AND (
    dokusya_id = ANY(:dokusya_ids) OR
    kumiaiin_code = ANY(:kumiaiin_codes)
  )
  AND deleted_at IS NULL
```

- `UPDATE_ALL` / `UPDATE_PARTIAL` モード：未ヒットの行は「存在しない」エラー → `IMPORT_VALIDATION_ERROR` + errors（row, field='dokusya_id' または 'kumiaiin_code'）
- 一括中止（`tetsuzuki_shurui`=0）：`kumiaiin_code` をキーに既存購読者を取得する。未ヒットはエラーとする。
- 取得した既存購読者の `kanri_shiten_id` が JA_KANRI_SHITEN の自管理支店と一致しない場合：DataScope 違反 → HTTP 403 (`DATA_SCOPE_VIOLATION`)

- 事前チェックエラーが存在する場合：HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors配列（最大10件）を返却し、以降の処理を中断する。

### 4.4 データ取込実行（トランザクション）

- DBトランザクションを開始する。
- 取込モードに応じて以下の SQL を行ごとに実行する。
- 1件でもエラーが発生した場合はトランザクションを全件ロールバックする。

#### 4.4.1 NEW モード（新規登録）

```sql
INSERT INTO t_dokusya (
  ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
  renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg,
  haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
  bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date, joho_henko_tekiyo_date,
  seikyu_kaishi_month, biko, rireki_no,
  created_at, created_by, updated_at, updated_by
)
VALUES (
  :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi, :tatemono_mei,
  :renrakusaki_1, :renrakusaki_2, :email, :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg,
  :haitatsu_yubin_no, :haitatsu_todofuken_code, :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei, :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho, :dokusyaryo_shiharai_cycle,
  :bank_branch_code, :bank_branch_name, :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date, :joho_henko_tekiyo_date,
  :seikyu_kaishi_month, :biko, 1,
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

- `selected_columns` に含まれない列はデフォルト値（空文字 / NULL / 0 / false）を設定する。
- `shoki_dokusya_kaishi_date` には `dokusya_kaishi_date` と同じ値を設定する。
- `haitatsu_same_flg`（v1.2 顧客要件 2026-06）：**取込列「購読者情報と同じ」で明示指定された値を採用する**（BE は推論しない）。TRUE のとき配達先項目は未入力でよく、配達先住所は購読者住所を使用する。列が未指定（空欄）の行のみ、従来どおり「配達先項目が全て未入力→TRUE / いずれか入力あり→FALSE」で導出する。

#### 4.4.2 UPDATE_ALL モード（全項目更新）

- 既存購読者を `dokusya_id` または `kumiaiin_code` で検索し、`selected_columns` 対象外の項目も含めて全項目を更新する（未選択列は NULL / 空文字 / 0 で上書き）。
- ただし NOT NULL の FK・参照列（kanri_shiten_id / shiten_id / hanbaiten_id / tanka_id / dokusya_shubetsu / tetsuzuki_shurui / shiharai_hoho）は空欄上書きで制約違反になるため `COALESCE(:値, 既存値)` で既存値を維持する（UPDATE モードでは FK コードは任意入力＝存在時のみ検証）。`dokusya_kaishi_date` も空欄時は既存値を維持。`shoki_dokusya_kaishi_date`（初回購読開始日）は不変のため SET から除外する。FK コード列（kanri_shiten_code / shiten_code / hanbaiten_code / tanka_code）は物理カラム kanri_shiten_id / shiten_id / hanbaiten_id / tanka_id へ解決して書く。

```sql
-- 更新前データ取得（操作ログ用）
SELECT * FROM t_dokusya
WHERE ja_id = :ja_id
  AND dokusya_id = :dokusya_id
  AND deleted_at IS NULL

-- 更新
UPDATE t_dokusya
SET kanri_shiten_id = :kanri_shiten_id,
    shiten_id = :shiten_id,
    kumiaiin_code = :kumiaiin_code,
    dokusya_shubetsu = :dokusya_shubetsu,
    tetsuzuki_shurui = :tetsuzuki_shurui,
    shimei_sei = :shimei_sei,
    shimei_mei = :shimei_mei,
    shimei_kana_sei = :shimei_kana_sei,
    shimei_kana_mei = :shimei_kana_mei,
    dokusya_busu = :dokusya_busu,
    yubin_no = :yubin_no,
    todofuken_code = :todofuken_code,
    shikuchoson = :shikuchoson,
    chome_banchi = :chome_banchi,
    tatemono_mei = :tatemono_mei,
    renrakusaki_1 = :renrakusaki_1,
    renrakusaki_2 = :renrakusaki_2,
    email = :email,
    mail_magazine_flg = :mail_magazine_flg,
    birth_year = :birth_year,
    gender = :gender,
    haitatsu_same_flg = :haitatsu_same_flg,
    haitatsu_yubin_no = :haitatsu_yubin_no,
    haitatsu_todofuken_code = :haitatsu_todofuken_code,
    haitatsu_shikuchoson = :haitatsu_shikuchoson,
    haitatsu_chome_banchi = :haitatsu_chome_banchi,
    haitatsu_tatemono_mei = :haitatsu_tatemono_mei,
    haitatsu_renrakusaki_1 = :haitatsu_renrakusaki_1,
    haitatsu_renrakusaki_2 = :haitatsu_renrakusaki_2,
    haitatsu_shimei_sei = :haitatsu_shimei_sei,
    haitatsu_shimei_mei = :haitatsu_shimei_mei,
    haitatsu_shimei_kana_sei = :haitatsu_shimei_kana_sei,
    haitatsu_shimei_kana_mei = :haitatsu_shimei_kana_mei,
    hanbaiten_id = :hanbaiten_id,
    tanka_id = :tanka_id,
    yubin_kubun = :yubin_kubun,
    shiharai_hoho = :shiharai_hoho,
    dokusyaryo_shiharai_cycle = :dokusyaryo_shiharai_cycle,
    bank_branch_code = :bank_branch_code,
    bank_branch_name = :bank_branch_name,
    hikiotoshi_yokin_shubetsu = :hikiotoshi_yokin_shubetsu,
    hikiotoshi_koza_no = :hikiotoshi_koza_no,
    hikiotoshi_koza_meigi = :hikiotoshi_koza_meigi,
    dokusyaso_bunrui = :dokusyaso_bunrui,
    nogyosya_bunrui = :nogyosya_bunrui,
    dokusya_kaishi_date = :dokusya_kaishi_date,
    dokusya_chushi_date = :dokusya_chushi_date,
    joho_henko_tekiyo_date = :joho_henko_tekiyo_date,
    biko = :biko,
    rireki_no = rireki_no + 1,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE ja_id = :ja_id
  AND dokusya_id = :dokusya_id
  AND deleted_at IS NULL
RETURNING *
```

#### 4.4.3 UPDATE_PARTIAL モード（入力箇所のみ更新）

- `selected_columns` に含まれる列のみ更新する。未選択列は既存値を維持する。
- 更新可能カラムは取込テンプレートの全項目（email / 住所 / 配達先 / 口座 / 単価・販売店 等を含む）。FK コード列（kanri_shiten_code / shiten_code / hanbaiten_code / tanka_code）は物理カラム kanri_shiten_id / shiten_id / hanbaiten_id / tanka_id へ解決して書く。NOT NULL の FK・参照列は `COALESCE(:値, 既存値)` で既存値を維持する。`dokusya_id` はキーのため更新しない。
- 動的に SET 句を構築する（擬似コード）。

```sql
-- 更新前データ取得（操作ログ用）
SELECT * FROM t_dokusya
WHERE ja_id = :ja_id
  AND dokusya_id = :dokusya_id
  AND deleted_at IS NULL

-- 動的 UPDATE（selected_columns に含まれる項目のみ SET）
UPDATE t_dokusya
SET {dynamic_set_clause},
    rireki_no = rireki_no + 1,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE ja_id = :ja_id
  AND dokusya_id = :dokusya_id
  AND deleted_at IS NULL
RETURNING *
```

#### 4.4.4 一括中止処理（廃止 — v1.2 顧客要件 2026-06）

- **本処理は廃止**。手続種類カラムを取込テンプレートから削除し、取込で解約は扱わない。NEW は `tetsuzuki_shurui=1`（新規）固定、UPDATE は手続種類を変更しない（既存値を維持）。
- 解約は SCR-011/013 の編集運用と同じく「解約予定日（購読中止日）」の登録のみとし、実際の解約処理（購読部数=0・解約状態）は日次バッチが担う（バッチ未実装）。

#### 4.4.5 履歴テーブルへの追加

- 取込モードに関わらず、取り込んだデータ件数分のレコードを `t_dokusya_rireki` に追加する。
- 履歴No（`rireki_no`）は `t_dokusya.rireki_no` の値を引き継ぐ。
- `saishin_data_flg` は新規追加レコードのみ TRUE、既存履歴は FALSE に更新する。
- **v1.2（顧客要件 2026-06）— UPDATE での履歴分割**: 情報変更（購読部数/住所等）と販売店変更が同一行で同時に起きた場合は履歴を **2件に分割**する（UI 編集 SCR-011/013 §14.3 と同一ロジック・共通実装）。
  - 情報変更イベント: `hanbaiten_tekiyo_date=NULL`、`joho_henko_tekiyo_date`=読者情報変更適用日。
  - 販売店変更イベント: `hanbaiten_tekiyo_date = joho_henko_tekiyo_date`=販売店適用日。
  - 適用日が早いイベントを先（`rireki_no` 小）、遅い方を後＋`saishin_data_flg=TRUE`。同日は 情報→販売店 の順。各レコードの `zenkai_*` / `zougen_hokoku_flg` は直前状態との差分で算出。
  - 取込で解約は扱わないため `kaiyaku_flg` は常に FALSE。`shinki_flg` は NEW かつ手続種類=新規(1) のときのみ TRUE。

```sql
-- 既存履歴の saishin_data_flg を FALSE に更新
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE

-- 新規履歴INSERT
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi, tatemono_mei,
  renrakusaki_1, renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg,
  haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei, haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
  bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date, joho_henko_tekiyo_date,
  seikyu_kaishi_month, biko, henko_riyu, saishin_data_flg,
  zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi, zenkai_tatemono_mei,
  hanbaiten_tekiyo_date,
  created_at, created_by
)
VALUES (
  :dokusya_id, :rireki_no, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi, :tatemono_mei,
  :renrakusaki_1, :renrakusaki_2, :email, :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg,
  :haitatsu_yubin_no, :haitatsu_todofuken_code, :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei, :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho, :dokusyaryo_shiharai_cycle,
  :bank_branch_code, :bank_branch_name, :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :shoki_dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date, :joho_henko_tekiyo_date,
  :seikyu_kaishi_month, :biko, '', TRUE,
  :zougen_hokoku_flg, :shinki_flg, :kaiyaku_flg,
  :zenkai_hanbaiten_id, :zenkai_dokusya_busu, :zenkai_yubin_no,
  :zenkai_todofuken_code, :zenkai_shikuchoson, :zenkai_chome_banchi, :zenkai_tatemono_mei,
  :hanbaiten_tekiyo_date,
  NOW(), :user_account_id
)
```

- `shinki_flg`：新規購読 / 解約→再購読 の場合 TRUE
- `kaiyaku_flg`：購読中→解約 の場合 TRUE
- `zougen_hokoku_flg`：購読部数や販売店等の増減報告対象項目が変化した場合 TRUE
- `zenkai_*` 項目：UPDATE系の場合、更新前の値を格納する（初回履歴・NEWモードは NULL）。

- 実行中に DB 制約違反等が発生した場合：トランザクションを即時ロールバックし、HTTP 400 (`IMPORT_VALIDATION_ERROR`) または HTTP 500 (`INTERNAL_SERVER_ERROR`) を返却する。

### 4.5 操作ログ記録

- 全行の処理が完了した後、一括取込操作の操作ログを取込バッチ単位で1件記録する（行単位ではない）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者Excelデータ取込画面 (ACSMS-SCR-016)', :operation, 1,
        NULL, 't_dokusya', :before_value_json, :after_value_json,
        :ip_address, :user_agent)
```

- `operation`：取込モード別の prefixed ラベル（販売店取込 SCR-019 と統一・bare-verb ルールの例外）。
  - `NEW` → `'IMPORT_NEW'`
  - `UPDATE_ALL` → `'IMPORT_UPDATE_ALL'`
  - `UPDATE_PARTIAL` → `'IMPORT_UPDATE_PARTIAL'`
- `before_value`：
  - `NEW` モード：空文字列
  - `UPDATE_ALL` / `UPDATE_PARTIAL` / 一括中止：更新前データのサマリJSON `{ "rows": [{...}, ...] }`（各行の更新前状態を格納、最大100件まで）
- `after_value`：取込結果サマリJSON `{ "import_mode", "total_rows", "created_count", "updated_count", "cancelled_count", "created_ids": [...], "updated_ids": [...] }`
- パスワード等の機密情報は含めないこと。

**after_value 例:**

```json
{
  "import_mode": "NEW",
  "total_rows": 2,
  "created_count": 2,
  "updated_count": 0,
  "cancelled_count": 0,
  "rireki_count": 2,
  "created_ids": [10001, 10002],
  "updated_ids": []
}
```

### 4.6 レスポンス生成

- トランザクションをコミットする。
- 取込結果サマリを `data` オブジェクトとして返却する。HTTP 200。
- `message`：`取り込みました。`（ACSMS-MSG-016-004）

### 4.7 例外処理

- 取込処理中にエラーが発生した場合、トランザクションを全件ロールバックする。
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時もエラーログを記録する（`log_type = 3`）。**トランザクション外で別途記録する**。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者Excelデータ取込画面 (ACSMS-SCR-016)', :operation, 2,
        NULL, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```
