---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-019
screen_name: 販売店Excelデータ取込画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-04-22
created_date: 2026/04/22
created_by: Tran Duc Tuyen
updated_date: 2026/08/24
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/04/22 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/08/20 | 1.1  | Tran Duc Tuyen | 不具合修正 2026-08（#58485）：①`hanbaiten_code`の重複判定（NEWモード）に論理削除済み行を含めるよう修正（§4.3.1）。`(ja_id, hanbaiten_code)`のDB UNIQUE INDEXは論理削除を除外しないため、従来は削除済みコードとの衝突がpre-checkを素通りしINSERTの生の一意制約違反でHTTP 500になっていた。`IMPORT_VALIDATION_ERROR`（message=「販売店コード「{code}」はすでに登録されています。」）で拒否するよう修正。②`haitatsuryo_tanka_code`の解決に`tanka_type=2`（配達手数料）の絞込を追加（§4.3.2）。従来は種別を見ておらず`tanka_type=1`（購読料）の単価でも保存できてしまっていた。③`haitatsuryo_shiharai_cycle`のバリデーションを0以上から**1〜12の範囲**に厳格化（§4.1）。 | | |
| 3   | 2026/08/20 | 1.2  | Tran Duc Tuyen | 不具合修正 2026-08：監査ログの`operation`ラベルを`IMPORT_UPDATE_PARTIAL`→`IMPORT_UPDATE`に改称（`AuditOperation`enum）。取込モードはNEW/UPDATEの2種類のみで「全列更新(ALL)/一部列更新(PARTIAL)」の区別が実装されたことが無かった（未使用の`IMPORT_UPDATE_ALL`も削除）ため、`_PARTIAL`表記が実態と合わず購読者管理画面（ログ照会）の表示が分かりにくかった。過去にDBへ書き込まれた`IMPORT_UPDATE_PARTIAL`行はそのまま残る（新規書込みのみ新ラベル）。 | | |
| 4   | 2026/08/24 | 1.3  | Tran Duc Tuyen | 顧客CR：都道府県コード（todofuken_code）列をテンプレート/取込対象列に追加（任意項目・列5）。未入力時は呼出者JAの都道府県コードを既定値とし、値が入力された場合は`m_todofuken`存在検証を行う（§4.3.3）。ACSMS-SCR-017（販売店情報登録画面）の都道府県自由選択化と同時対応。列数を23→24に更新。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型購読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「販売店Excelデータ取込画面（ACSMS-SCR-019）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード    | 資料名                           |
| --- | ------------- | -------------------------------- |
| 1   | ACSMS-SCR-017 | 販売店情報登録画面 API設計書     |
| 2   | ACSMS-SCR-018 | 販売店明細検索画面 API設計書     |

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
| 8   | 画面固有     | NOT_FOUND             | 指定された販売店が見つかりません。                                     | HTTP 404 |
| 9   | 画面固有     | DUPLICATE_CODE        | 同一の販売店コードが既に登録されています。                             | HTTP 400 |
| 10  | 画面固有     | IMPORT_VALIDATION_ERROR | Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。 | HTTP 400 |
| 11  | 画面固有     | FILE_FORMAT_ERROR     | Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。 | HTTP 400 |
| 12  | 画面固有     | ROW_LIMIT_EXCEEDED    | 取込データ行数の上限（500行）を超えています。                          | HTTP 400 |

---

# API ACSMS-API-019-001

## 概要

| 項目                   | 内容                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Download Hanbaiten Import Template                                                                                                                                                   |
| 概要                   | 販売店Excelデータ取込用のテンプレートファイル（24列固定）を生成しダウンロードする                                                                                                    |
| URI                    | /api/v1/hanbaiten/import/template                                                                                                                                                    |
| メソッド               | GET                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                 |
| リクエストパラメーター | なし                                                                                                                                                                                 |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                               |
| HTTPレスポンスコード   | 200:正常にテンプレートを生成しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                |

## リクエストパラメータ

なし

## レスポンスデータ

| #   | 項目ID              | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                 |
| --- | ------------------- | ------ | -------- | ------------ | -------- | ---------------------------------------------------- |
| 1   | （バイナリデータ）  | Binary | -        | XLSX         | -        | Excelファイル（MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet） |

### レスポンスヘッダ

| ヘッダ名            | 値                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Content-Type        | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet                          |
| Content-Disposition | attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"                             |

### テンプレートファイル仕様

- シート名：`販売店`
- 1行目：ヘッダー行（24列を以下の順序で設定）

| 列 | ヘッダー名             | 論理カラム                 | 物理カラム                 | データ型      | 桁数 |
| -- | ---------------------- | -------------------------- | -------------------------- | ------------- | ---- |
| 1  | 販売店コード           | 販売店コード               | hanbaiten_code             | VARCHAR       | 10   |
| 2  | 販売店名称             | 販売店名                   | hanbaiten_name             | VARCHAR       | 100  |
| 3  | 販売店名称（カナ）     | 販売店名（カナ）           | hanbaiten_name_kana        | VARCHAR       | 100  |
| 4  | インボイス番号         | 適格請求書発行事業者番号   | torihikisaki_no            | VARCHAR       | 20   |
| 5  | 都道府県コード         | 都道府県コード             | todofuken_code             | VARCHAR       | 2    |
| 6  | 郵便番号               | 郵便番号                   | yubin_no                   | VARCHAR       | 7    |
| 7  | 住所                   | 住所                       | address                    | VARCHAR       | 200  |
| 8  | 電話番号               | 電話番号                   | tel                        | VARCHAR       | 15   |
| 9  | FAX番号                | FAX番号                    | fax                        | VARCHAR       | 15   |
| 10 | 所長名                 | 所長名                     | shocho_name                | VARCHAR       | 50   |
| 11 | 委託区分               | 委託区分                   | itaku_kubun                | INTEGER       | -    |
| 12 | 配達手数料単価         | 配達手数料単価コード       | haitatsuryo_tanka_code     | VARCHAR       | 10   |
| 13 | 金融機関コード         | 銀行コード                 | bank_code                  | VARCHAR       | 4    |
| 14 | 金融機関名             | 銀行名                     | bank_name                  | VARCHAR       | 100  |
| 15 | 配達手数料支払サイクル | 配達手数料支払サイクル     | haitatsuryo_shiharai_cycle | INTEGER       | -    |
| 16 | 口座支店コード         | 支店コード                 | bank_branch_code           | VARCHAR       | 3    |
| 17 | 口座支店名             | 支店名                     | bank_branch_name           | VARCHAR       | 100  |
| 18 | 口座種別               | 預金種別                   | yokin_shubetsu             | INTEGER       | -    |
| 19 | 口座番号               | 口座番号                   | koza_no                    | VARCHAR       | 10   |
| 20 | 口座名義               | 口座名義                   | koza_meigi                 | VARCHAR       | 50   |
| 21 | 振込手数料負担区分             | 振込手数料負担区分                 | furikomi_tesuryo_futan_kubun              | INTEGER       | -    |
| 22 | 振込手数料                 | 振込手数料                 | furikomi_tesuryo             | NUMERIC(10,0) | -    |
| 23 | 備考                   | 備考                       | biko                       | TEXT          | -    |
| 24 | 廃店フラグ             | 廃店フラグ                 | haiten_flg                 | BOOLEAN       | -    |

※ 都道府県コード（列5）は任意項目。取込テンプレートは空セルのまま配布し、未入力（列が selected_columns に無い、またはセルが空）の場合は呼出者の所属JAの都道府県コードを既定値とする（顧客CR 2026-08-24）。値を入力する場合は `m_todofuken` に実在する2桁コードであること（§4.3.3参照）。

## リクエスト例

```
GET /api/v1/hanbaiten/import/template
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"

(バイナリデータ)
```

## レスポンス失敗例

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- リクエストパラメータなし。特に検証なし。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 Unauthorized (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.import` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
    - ※ NICHINO_STAFF / NICHINO_ADMIN は `hanbaiten.import` 非保有（2026-06 剥奪 — migration 1711900900017）。販売店Excelデータ取込は代行入力（`hanbaiten.daiko_input`）の対象外。seeder.md §3 / account_concept.md と整合。
- 権限がない場合：HTTP 403 Forbidden (`FORBIDDEN`)

### 4.3 テンプレート生成

- ExcelJS ライブラリを使用して新規ワークブックを生成する。
- シート名：`販売店`
- 1行目に24列のヘッダー文字列を以下の順序で書き込む。
  - 「販売店コード」「販売店名称」「販売店名称（カナ）」「インボイス番号」「都道府県コード」「郵便番号」「住所」「電話番号」「FAX番号」「所長名」「委託区分」「配達手数料単価」「金融機関コード」「金融機関名」「配達手数料支払サイクル」「口座支店コード」「口座支店名」「口座種別」「口座番号」「口座名義」「振込手数料負担区分」「振込手数料」「備考」「廃店フラグ」
- ヘッダー行はボールドスタイル、背景色を設定する。
- 各列の幅を項目内容に合わせて自動調整する。

### 4.4 レスポンス生成

- 生成したExcelファイルをバイナリデータとしてレスポンスに設定する。
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="販売店Excelデータ取込_テンプレート.xlsx"`
- HTTP 200 で返却する。

### 4.5 例外処理

- ファイル生成エラー、DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-019-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Import Hanbaiten Excel                                                                                                                                                                                                                                        |
| 概要                   | 販売店Excelデータを一括取込する（新規登録 / 更新）。`UPDATE` モードは selected_columns に含まれる列のみ更新し、未選択列は既存値を維持する（全項目更新したい場合は全列を selected_columns に含める。2026-07 顧客要件により旧 `UPDATE_ALL` / `UPDATE_PARTIAL` の2区分は `UPDATE` に統合済み）。1トランザクションで処理し、エラー時は全件ロールバック。                                                                                                                          |
| URI                    | /api/v1/hanbaiten/import                                                                                                                                                                                                                                      |
| メソッド               | POST                                                                                                                                                                                                                                                          |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                          |
| リクエストパラメーター |                                                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                        |
| HTTPレスポンスコード   | 200:正常に取込処理が完了しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:Excel取込データにエラーがあります, 400:取込データ行数の上限を超えています, 429:リクエスト回数が上限を超えました, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                            |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------- |
| 1   | import_mode     | String | -        | 〇   |        |        | 取込モード（`NEW`:新規登録, `UPDATE`:更新。selected_columns に含まれる列のみ更新し未選択列は既存値を維持する） |
| 2   | selected_columns| Array  | 〇       | 〇   | 1      | 24     | 取込対象の列（物理カラム名）配列。hanbaiten_code は常に含む。                   |
| 3   | rows            | Array  | 〇       | 〇   | 1      | 500    | 取込データ行の配列                                                              |
| 4   | →hanbaiten_code      | String | -   | 〇   | 1      | 10     | 販売店コード（行内必須、キー項目）                                              |
| 5   | →hanbaiten_name      | String | -   | -    | 1      | 100    | 販売店名                                                                        |
| 6   | →hanbaiten_name_kana | String | -   | -    | 1      | 100    | 販売店名（カナ）                                                                |
| 7   | →torihikisaki_no     | String | -   | -    | 1      | 20     | 適格請求書発行事業者番号                                                        |
| 8   | →todofuken_code      | String | -   | -    | 2      | 2      | 都道府県コード（任意。m_todofuken に実在する2桁コード。未入力時は§4.4.1/§4.4.2で呼出者JAの都道府県コードを既定値とする） |
| 9   | →yubin_no            | String | -   | -    | 7      | 7      | 郵便番号                                                                        |
| 10  | →address             | String | -   | -    | 1      | 200    | 住所                                                                            |
| 11  | →tel                 | String | -   | -    | 1      | 15     | 電話番号                                                                        |
| 12  | →fax                 | String | -   | -    | 1      | 15     | FAX番号                                                                         |
| 13  | →shocho_name         | String | -   | -    | 1      | 50     | 所長名                                                                          |
| 14  | →itaku_kubun         | Number | -   | -    | -       |        | 委託区分（1:振込, 2:日農委託, 9:その他）                                        |
| 15  | →haitatsuryo_tanka_code | String | - | -  | 1      | 10     | 配達手数料単価コード（m_tanka の tanka_code で解決）                            |
| 16  | →bank_code           | String | -   | -    | 1      | 4      | 銀行コード                                                                      |
| 17  | →bank_name           | String | -   | -    | 1      | 100    | 銀行名                                                                          |
| 18  | →haitatsuryo_shiharai_cycle | Number | - | -  | -       |        | 配達手数料支払サイクル（月数）                                                  |
| 19  | →bank_branch_code    | String | -   | -    | 1      | 3      | 口座支店コード                                                                  |
| 20  | →bank_branch_name    | String | -   | -    | 1      | 100    | 口座支店名                                                                      |
| 21  | →yokin_shubetsu      | Number | -   | -    | -       |        | 口座種別（1:普通, 2:当座）                                                      |
| 22  | →koza_no             | String | -   | -    | 1      | 10     | 口座番号                                                                        |
| 23  | →koza_meigi          | String | -   | -    | 1      | 50     | 口座名義                                                                        |
| 24  | →furikomi_tesuryo_futan_kubun       | Number | -   | -    | -       |        | 振込手数料負担区分（1:JA, 2:販売店）                                                    |
| 25  | →furikomi_tesuryo      | Number | -   | -    | -       |        | 振込手数料（≧ 0）                                                                   |
| 26  | →biko                | String | -   | -    | -       |        | 備考                                                                            |
| 27  | →haiten_flg          | Boolean| -   | -    | -       |        | 廃店フラグ（true:廃店, false:営業中）                                           |

※ rows 配列内の各行は、selected_columns に含まれる項目のみ有効値として扱う。
※ 未選択列は、`NEW` モードではデフォルト値（空文字 / NULL / false）、`UPDATE` モードでは既存値を維持する（selected_columns に含まれる列のみ更新）。todofuken_code のみ例外 — 未選択・空セルとも既定値は空文字ではなく呼出者JAの都道府県コード（NOT NULL・m_todofuken FKのため）。
※ itaku_kubun（委託区分）と furikomi_tesuryo_futan_kubun（振込手数料負担区分）は EFFECTIVE値が必須。EFFECTIVE値は `NEW` モードでは「selected_columns に含まれる場合はセル値、含まれない場合は空」、`UPDATE` モードでは「selected_columns に含まれる場合はセル値、含まれない場合は既存DB値」。省略かつ既存値も空の場合は行エラー（`IMPORT_VALIDATION_ERROR`）となる。

## レスポンスデータ

| #   | 項目ID             | タイプ | 繰り返し | フォーマット | Nullable | 説明                                  |
| --- | ------------------ | ------ | -------- | ------------ | -------- | ------------------------------------- |
| 1   | data               | Object | -        |              | -        | 取込結果サマリ                        |
| 2   | →import_mode       | String | -        |              | -        | 実行した取込モード                    |
| 3   | →total_rows        | Number | -        |              | -        | 取込対象行数                          |
| 4   | →created_count     | Number | -        |              | -        | 新規登録件数                          |
| 5   | →updated_count     | Number | -        |              | -        | 更新件数                              |
| 6   | →skipped_count     | Number | -        |              | -        | スキップ件数                          |
| 7   | →imported_at       | String | -        | ISO8601      | -        | 取込完了日時                          |
| 8   | message            | String | -        |              | -        | 取り込みました。                |

## リクエスト例

```json
POST /api/v1/hanbaiten/import
Content-Type: application/json

{
  "import_mode": "NEW",
  "selected_columns": [
    "hanbaiten_code",
    "hanbaiten_name",
    "hanbaiten_name_kana",
    "yubin_no",
    "address",
    "tel",
    "itaku_kubun",
    "haitatsuryo_tanka_code",
    "haiten_flg"
  ],
  "rows": [
    {
      "hanbaiten_code": "H001",
      "hanbaiten_name": "販売店A",
      "hanbaiten_name_kana": "ハンバイテンA",
      "yubin_no": "1000001",
      "address": "東京都千代田区1-1-1",
      "tel": "03-1234-5678",
      "itaku_kubun": 1,
      "haitatsuryo_tanka_code": "T001",
      "haiten_flg": false
    },
    {
      "hanbaiten_code": "H002",
      "hanbaiten_name": "販売店B",
      "hanbaiten_name_kana": "ハンバイテンB",
      "yubin_no": "1000002",
      "address": "東京都千代田区2-2-2",
      "tel": "03-2345-6789",
      "itaku_kubun": 2,
      "haitatsuryo_tanka_code": "T002",
      "haiten_flg": false
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
    "skipped_count": 0,
    "imported_at": "2026-04-22T10:00:00Z"
  },
  "message": "取り込みました。"
}
```

## レスポンス失敗例

### 400 Bad Request (Validation Error)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "field": "import_mode", "message": "取込モードは必須です" },
    { "field": "selected_columns", "message": "取込対象列を1つ以上選択してください" }
  ]
}
```

### 400 Bad Request (Import Validation Error — 行別エラー)

```json
{
  "error_code": "IMPORT_VALIDATION_ERROR",
  "message": "Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください",
  "errors": [
    { "row": 2, "field": "hanbaiten_code", "message": "販売店コードは必須です" },
    { "row": 3, "field": "hanbaiten_code", "message": "同一の販売店コードが既に登録されています" },
    { "row": 5, "field": "haitatsuryo_tanka_code", "message": "指定された配達手数料単価コードが見つかりません" },
    { "row": 7, "field": "itaku_kubun", "message": "委託区分の値が不正です" }
  ]
}
```

### 400 Bad Request (Row Limit Exceeded)

```json
{
  "error_code": "ROW_LIMIT_EXCEEDED",
  "message": "取込データ行数の上限（500行）を超えています"
}
```

### 401 Unauthorized

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "セッションが切れました。再度ログインしてください"
}
```

### 403 Forbidden

```json
{
  "error_code": "FORBIDDEN",
  "message": "この画面へのアクセス権限がありません"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください"
}
```

## 処理手順

> ※ 以下の処理は単一トランザクション内で実行する（本処理 + 操作ログ記録）。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - import_mode：必須、`NEW` / `UPDATE` のいずれか（2026-07 顧客要件により旧 `UPDATE_ALL` / `UPDATE_PARTIAL` は `UPDATE` に統合済み）
  - selected_columns：必須、配列、1件以上24件以下。`UPDATE` モードは `hanbaiten_code` を必ず含むこと（含まれない場合：HTTP 400 `VALIDATION_ERROR`、field='selected_columns'）
  - rows：必須、配列、1件以上、500件以下
    - 500件を超える場合：HTTP 400 (`ROW_LIMIT_EXCEEDED`)
  - 各行 rows[i] の検証：
    - hanbaiten_code：必須、最大10桁
    - hanbaiten_name：最大100桁（必須項目ではない）
    - torihikisaki_no：最大20桁
    - todofuken_code：任意、2桁固定。`m_todofuken` に実在するコードのみ許可（存在検証は§4.3.3）。未入力（列非選択またはセル空）時は呼出者JAの都道府県コードを既定値とする（顧客CR 2026-08-24）
    - yubin_no：7桁固定（数字書式チェックは行わない）
    - address：最大200桁
    - fax：最大15桁
    - shocho_name：最大50桁
    - itaku_kubun：EFFECTIVE値必須（※リクエストパラメータ節の注記参照）、1, 2, 9 のいずれか
    - haitatsuryo_tanka_code：最大10桁。参照先は `tanka_type=2`（配達手数料）であること（§4.3.2参照。不具合修正2026-08・#58485）
    - haitatsuryo_shiharai_cycle：数値型チェック、**1〜12の範囲**（月数のため。不具合修正2026-08・#58485。従来は0以上のみでチェック上限が無かった）
    - bank_code：最大4桁
    - bank_name：最大100桁
    - bank_branch_code：最大3桁
    - bank_branch_name：最大100桁
    - yokin_shubetsu：1, 2 のいずれか
    - koza_no：最大10桁
    - koza_meigi：最大50桁
    - furikomi_tesuryo_futan_kubun：EFFECTIVE値必須（※リクエストパラメータ節の注記参照）、1, 2 のいずれか
    - furikomi_tesuryo：数値型チェック、≧ 0
    - haiten_flg：Boolean型チェック
    - itaku_kubun = 1（振込）の場合：bank_code, bank_name, bank_branch_code, bank_branch_name, yokin_shubetsu, koza_no は必須
- トップレベルのバリデーションエラー：HTTP 400 (`VALIDATION_ERROR`) + errors配列
- 行レベルのバリデーションエラー：HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors配列（row番号含む）

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 認証失敗の場合：HTTP 401 (`UNAUTHORIZED`)
- 権限チェック：`hanbaiten.import` を保持しているか確認する。
  - 対象ロール：CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
    - ※ NICHINO_STAFF / NICHINO_ADMIN は `hanbaiten.import` 非保有（2026-06 剥奪 — migration 1711900900017）。販売店Excelデータ取込は代行入力（`hanbaiten.daiko_input`）の対象外。seeder.md §3 / account_concept.md と整合。
- 権限がない場合：HTTP 403 (`FORBIDDEN`)
- DataScope：ログインユーザーの `ja_id` を取得する。全行は当該 `ja_id` のデータとして扱う。
- レート制限：`10回/分/IP`（本エンドポイントは大量の自由記述JSON行を送るため CloudFront WAF のボディ検査バイパス対象 — `.claude/rules/nestjs.md §WAF body-inspection bypass`。その分アプリ層で個別スロットリング）。上限超過時：HTTP 429 (`TOO_MANY_REQUESTS`)

### 4.3 事前チェック（重複・参照整合性）

- ログインユーザーのスコープを取得する（ja_id）。
- rows 内の `hanbaiten_code` に重複がないことを確認する。
- DBとの整合性チェックをバッチで実行する。

#### 4.3.1 既存販売店コードの取得

```sql
-- UPDATE の存在確認・conditional-required マージ用（有効行のみ）
SELECT hanbaiten_id, hanbaiten_code
FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = ANY(:hanbaiten_codes)
  AND deleted_at IS NULL

-- NEW の重複判定用（論理削除済みも含む・不具合修正2026-08・#58485）
SELECT hanbaiten_code
FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = ANY(:hanbaiten_codes)
```

- `NEW` モード：`(ja_id, hanbaiten_code)` の DB UNIQUE INDEX は論理削除を除外しない（ACSMS-SCR-017 作成画面 `hanbaiten.service.ts` の `repo.count({..., withDeleted: true})` と同一仕様）。**論理削除済みの販売店コードとの衝突も含めて**「重複」エラーとする → HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors（row, field='hanbaiten_code', message=`販売店コード「{code}」はすでに登録されています。`）。従来は有効行のみで判定しており、削除済みコードとの衝突は pre-check を素通りして INSERT が生の一意制約違反（23505）で落ち、HTTP 500（システムエラー）になっていた（不具合修正2026-08・#58485）。
- `UPDATE` モード：有効行にヒットしなかった hanbaiten_code は「存在しない」エラーとする → HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors（row, field='hanbaiten_code', message='指定された販売店コードが存在しません。'）

#### 4.3.2 配達手数料単価コードの解決

```sql
SELECT tanka_id, tanka_code
FROM m_tanka
WHERE ja_id = :ja_id
  AND tanka_code = ANY(:tanka_codes)
  AND tanka_type = 2  -- 配達手数料（不具合修正2026-08・#58485）
  AND deleted_at IS NULL
```

**`tanka_type=2`（配達手数料）のみを対象とする**（不具合修正2026-08・#58485）。従来は種別で絞り込んでおらず、`tanka_type=1`（購読料）の単価コードを指定しても解決に成功し保存できてしまっていた。種別違いは dokusya取込（ACSMS-SCR-016）の `tanka_type` 絞込と同じ考え方で「見つからない」扱いにする（別メッセージは設けない）。

※ ACSMS-SCR-017（販売店情報登録画面）の `haitatsuryo_tanka_id` FKガードは本書執筆時点でこの種別チェックを持たない（同一JA内に存在するかのみ検証）。本画面（Excel取込）とは別対応が必要な既知ギャップ。

- 未ヒットの tanka_code：`IMPORT_VALIDATION_ERROR` + errors（row, field='haitatsuryo_tanka_code'）

#### 4.3.3 都道府県コードの検証（顧客CR 2026-08-24）

- todofuken_code が selected_columns に含まれ、かつセルに値がある行のみを対象に検証する（列非選択・セル空の行は対象外 — §4.4.1/§4.4.2 でJA既定値にフォールバックするため）。

```sql
SELECT todofuken_code
FROM m_todofuken
WHERE todofuken_code = ANY(:todofuken_codes)
```

- 未ヒットの todofuken_code：`IMPORT_VALIDATION_ERROR` + errors（row, field='todofuken_code', message='都道府県コードが存在しません。'）— ACSMS-SCR-017（販売店情報登録画面）の code-master-check と同一メッセージ。

- 事前チェックエラーが存在する場合：HTTP 400 (`IMPORT_VALIDATION_ERROR`) + errors配列を返却し、以降の処理を中断する。

### 4.4 データ取込実行（トランザクション）

- DBトランザクションを開始する。
- 以下の処理中にエラーが発生した場合は全件ロールバックする。

#### 4.4.1 NEW モード（新規登録）

- 各行に対して INSERT を実行する。

```sql
INSERT INTO m_hanbaiten (
  ja_id, hanbaiten_code, hanbaiten_name, hanbaiten_name_kana, torihikisaki_no,
  todofuken_code, yubin_no, address, tel, fax, shocho_name, itaku_kubun,
  haitatsuryo_tanka_id, haitatsuryo_shiharai_cycle,
  furikomi_tesuryo_futan_kubun, furikomi_tesuryo,
  bank_code, bank_name, bank_branch_code, bank_branch_name,
  yokin_shubetsu, koza_no, koza_meigi, haiten_flg, biko,
  created_at, created_by, updated_at, updated_by
)
VALUES (
  :ja_id, :hanbaiten_code, :hanbaiten_name, :hanbaiten_name_kana, :torihikisaki_no,
  :todofuken_code, :yubin_no, :address, :tel, :fax, :shocho_name, :itaku_kubun,
  :haitatsuryo_tanka_id, :haitatsuryo_shiharai_cycle,
  :furikomi_tesuryo_futan_kubun, :furikomi_tesuryo,
  :bank_code, :bank_name, :bank_branch_code, :bank_branch_name,
  :yokin_shubetsu, :koza_no, :koza_meigi, :haiten_flg, :biko,
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

- selected_columns に含まれない列はデフォルト値（空文字 / NULL / false）を設定する。ただし `:todofuken_code` は例外 — selected_columns に含まれない、またはセルが空の場合は空文字ではなく呼出者JAの都道府県コードを設定する（NOT NULL・m_todofuken FKのため。§4.3.3で存在検証済みの値、またはJA既定値のいずれか）。

#### 4.4.2 UPDATE モード（更新）

- selected_columns に含まれる列のみ更新する（`hanbaiten_code` はキー列のため SET 対象から除外）。未選択列は既存値を維持する。全項目を更新したい場合は全列を selected_columns に含める（2026-07 顧客要件により旧 `UPDATE_ALL` / `UPDATE_PARTIAL` の2区分は本モードに統合済み）。
- 動的に SET 句を構築する（擬似コード）。selected_columns の空セルは列の既定値（空文字 / false。NULL許容の数値・区分列は NULL）にフォールバックする。
- `haitatsuryo_tanka_code` が selected_columns に含まれる場合は 4.3.2 で解決した tanka_id を `haitatsuryo_tanka_id` に設定する。
- `todofuken_code` が selected_columns に含まれる場合：セルに値があればその値を、空セルなら呼出者JAの都道府県コードを `todofuken_code` に設定する（顧客CR 2026-08-24）。

```sql
-- 動的 UPDATE（selected_columns に含まれる項目のみ SET）
UPDATE m_hanbaiten
SET {dynamic_set_clause},
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE hanbaiten_id = :hanbaiten_id
```

- 実行中に DB 制約違反等が発生した場合：トランザクションを即時ロールバックし、HTTP 400 (`IMPORT_VALIDATION_ERROR`) または HTTP 500 (`INTERNAL_SERVER_ERROR`) を返却する。

### 4.5 操作ログ記録

- 全行の処理が完了した後、一括取込操作の操作ログを記録する（行単位ではなく取込バッチ単位で1件記録する）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '販売店Excelデータ取込画面 (ACSMS-SCR-019)', :operation_label, 1,
        NULL, 'm_hanbaiten',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `:operation_label`：`IMPORT_NEW` / `IMPORT_UPDATE` のいずれか（import_mode `NEW` / `UPDATE` に対応）
- `before_value`：
  - `NEW` モード：省略（記録しない）
  - `UPDATE` モード：`{ "import_mode": "UPDATE", "target_codes": [...] }`（取込対象の hanbaiten_code 一覧）
- `after_value`：取込結果サマリJSON `{ "import_mode", "total_rows", "created_count", "updated_count", "created_ids": [...], "imported_at" }`
- パスワード等の機密情報は含めないこと。

**after_value 例:**

```json
{
  "import_mode": "NEW",
  "total_rows": 2,
  "created_count": 2,
  "updated_count": 0,
  "created_ids": [101, 102],
  "imported_at": "2026-04-22T10:00:00.000Z"
}
```

### 4.6 レスポンス生成

- トランザクションをコミットする。
- 取込結果サマリを data オブジェクトとして返却する。HTTP 200。
- message: `取り込みました。`（ACSMS-MSG-007-004）

### 4.7 例外処理

- 取込処理中にエラーが発生した場合、トランザクションを全件ロールバックする。
- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '販売店Excelデータ取込画面 (ACSMS-SCR-019)', :operation_label, 2,
        NULL, 'm_hanbaiten',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
