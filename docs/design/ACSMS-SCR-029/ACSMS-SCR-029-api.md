---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-029
screen_name: 増減通知（日本農業新聞）出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-05
created_date: 2026/06/05
created_by: Nguyen Truong An
updated_date: 2026/06/05
updated_by: Nguyen Truong An
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者           | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/05 | 1.0  | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/02 | 1.1  | Tran Duc Tuyen | 減部数のマイナス符号「▲」表示を廃止し数値のまま表示（顧客要望）。差異マーク「◆」を行頭列に表示し、履歴の前回値（zenkai_*）と現在値の差（増減あり・販売店変更）で `diff_mark` を判定するよう実装。 | Tran Duc Tuyen | Tran Duc Tuyen |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「増減通知（日本農業新聞）出力画面（ACSMS-SCR-029）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

本画面は、指定した適用日に購読部数の増減があった購読者を抽出し、
管理支店単位でグループ化（管理支店ごとに1枚の帳票）して「委託 / 販売店コード / 販売店名 /
現在部数 / 増部数 / 減部数 / 新部数」のテーブルでプレビュー表示、および日本農業新聞社向けの
電子帳票（PDF）として出力する画面である。出力後はS3保存および日農担当者へのメール自動通知を行う。
日農（NICHINO_ADMIN / NICHINO_STAFF）は本機能を利用できず、JA系ロール（中央会・JA本店・
JA管理支店）のみが利用可能である。

## 関連資料

| No  | 資料コード           | 資料名                                                                                 |
| --- | -------------------- | -------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024 |

※ 本画面の出力条件エリアの「管理支店」チェックボックスは以下の共用APIを使用する（新規APIは作成しない）。

- **管理支店チェックボックス**：`ACSMS-API-COMMON-004`（カスケード絞込み）を呼び出しユーザーの `ja_id` で使用する。
  JA管理支店ロールが自管理支店分のみを対象とする制御は、プレビュー／出力API側のDataScope
  （`r.kanri_shiten_id = :user_kanri_shiten_id`）で**サーバ側で強制**する。未選択の場合はスコープ内の全管理支店を対象とする。

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

※ 対象0件は業務エラーではなく「検索成功・結果なし」として扱う。プレビュー・出力とも
HTTP 200 を返し（プレビュー: `reports:[]`、出力: `{ data: { reports: [] } }`）、FE が画面内に
ACSMS-MSG-029-002「対象のデータが存在しません。」を表示する（トーストではない）。
SCR-026 プレビュー / SCR-028 と方針統一。

※ ACSMS-MSG-029-001「この機能はJAアカウントのみ使用できます。」は、画面ルートガード（FE）で
NICHINO_ADMIN / NICHINO_STAFF をブロックする際に表示するメッセージである。API側は権限
`report.export_zougen_nichino` 不所持のため `FORBIDDEN`（HTTP 403）を返す（多層防御）。

※ ACSMS-MSG-029-004「必須項目です。」は、適用日未入力時の `VALIDATION_ERROR`（`errors[].field = "tekiyo_date"`）として返却する。

※ ACSMS-MSG-029-002「対象のデータが存在しません。」は、対象0件時に HTTP 200 + 空配列で返ったのを
FE が検出して画面内表示するメッセージである（エラーコードではない）。

※ ACSMS-MSG-029-003「システムエラーが発生しました。しばらくしてから再度お試しください。」は `INTERNAL_SERVER_ERROR`（HTTP 500）に対応する。

※ ACSMS-MSG-029-005「増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？」は、電子帳票作成ボタン押下時のFE確認ダイアログのメッセージであり、API側の処理は発生しない。

---

# API ACSMS-API-029-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Zougen Nichino Report Preview                                                                                                                                                                                                    |
| 概要                   | 指定した適用日・管理支店の条件で増減対象データを抽出し、管理支店単位でグループ化（管理支店ごとに1枚の帳票）して「委託 / 販売店コード / 販売店名 / 現在部数 / 増部数 / 減部数 / 新部数」のプレビューデータを取得する                       |
| URI                    | /api/v1/report/zougen-nichino/preview                                                                                                                                                                                                |
| メソッド               | GET                                                                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                                                                |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました（対象0件のときは reports:[]）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                          |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。`t_dokusya_rireki.joho_henko_tekiyo_date` と一致するレコードを抽出。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-029-004） |
| 2   | kanri_shiten_id | Number | 〇       | -    |        |        | 管理支店ID（繰り返し指定可：`kanri_shiten_id=20&kanri_shiten_id=21`）。未指定の場合はスコープ内の全管理支店を対象とする                       |
| 3   | page            | Number | -        | -    |        |        | ページ番号（1始まり）。未指定時は1。SQL OFFSET/LIMIT を購読者単位で適用（SCR-028 と同方針）          |
| 4   | per_page        | Number | -        | -    |        |        | 1ページの販売店行数（1〜500。≒購読者数。大半1行/購読者）。未指定時は15                                |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                              |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                    | Object  | -        |              | -        | プレビュー結果                                                                                    |
| 2   | →tekiyo_date            | String  | -        | YYYY-MM-DD   | -        | 適用日（リクエストのエコーバック）                                                                |
| -   | →page_no                | Number  | -        |              | -        | 現在のページ番号                                                                                  |
| -   | →per_page               | Number  | -        |              | -        | 1ページの販売店行数                                                                               |
| -   | →total_pages            | Number  | -        |              | -        | 総ページ数                                                                                        |
| -   | →total_rows             | Number  | -        |              | -        | 対象購読者数（`COUNT(DISTINCT dokusya_id)`。ページングの単位）                                     |
| -   | →is_last_page           | Boolean | -        |              | -        | 最終ページか                                                                                      |
| 3   | →reports                | Array   | 〇       |              | -        | このページの管理支店ごとの帳票データ（管理支店コード昇順）                                          |
| 4   | →→kanri_shiten_id       | Number  | -        |              | -        | 管理支店ID                                                                                        |
| 5   | →→kanri_shiten_code     | String  | -        |              | -        | 管理支店コード（帳票では10桁を3-4-3でハイフン区切り表示。例: 999-9999-999）                        |
| 6   | →→kanri_shiten_name     | String  | -        |              | -        | 管理支店名称                                                                                      |
| 7   | →→ja_name               | String  | -        |              | -        | JA名称（帳票ヘッダ「組合名」に表示）                                                               |
| 8   | →→todofuken_name        | String  | -        |              | -        | 都道府県名（管理支店の都道府県。帳票ヘッダ「都道府県名」に表示）                                   |
| 9   | →→tanto_busho           | String  | -        |              | -        | 担当部署名（JAの担当部署。空欄は `""`）                                                            |
| 10  | →→tanto_name            | String  | -        |              | -        | 担当者名（JAの担当者。空欄は `""`）                                                                |
| 11  | →→tel                   | String  | -        |              | -        | 電話番号（管理支店TEL。空欄は `""`）                                                               |
| 12  | →→fax                   | String  | -        |              | -        | FAX番号（管理支店FAX。空欄は `""`）                                                                |
| 13  | →→rows                  | Array   | 〇       |              | -        | 明細行一覧（販売店コード昇順）                                                                     |
| 14  | →→→hanbaiten_id         | Number  | -        |              | -        | 販売店ID                                                                                          |
| 15  | →→→itaku_label          | String  | -        |              | -        | 委託欄表示。委託区分が「日農委託」（`itaku_kubun=2`）の場合「委託」、それ以外（振込/その他）は `""` ※m_code.code_category='ITAKU_KUBUN'を参照（1:振込, 2:日農委託, 9:その他） |
| 16  | →→→hanbaiten_code       | String  | -        |              | -        | 販売店コード                                                                                      |
| 17  | →→→hanbaiten_name       | String  | -        |              | -        | 販売店名（免税販売店＝適格請求書発行事業者番号が空の場合は先頭に「（免）」を付与）                 |
| 18  | →→→genzai_busu          | Number  | -        |              | -        | 現在部数（前回購読部数 `zenkai_dokusya_busu`。NULLは0として扱う）                                  |
| 19  | →→→zou_busu             | Number  | -        |              | -        | 増部数（`dokusya_busu > 現在部数` の場合に `dokusya_busu - 現在部数`、それ以外は0）                |
| 20  | →→→gen_busu             | Number  | -        |              | -        | 減部数（`dokusya_busu < 現在部数` の場合に `現在部数 - dokusya_busu`、それ以外は0）。帳票では数値のまま表示する（マイナス符号「▲」は付与しない） |
| 21  | →→→shin_busu            | Number  | -        |              | -        | 新部数（購読部数 `dokusya_busu`。＝現在部数 ＋ 増部数 － 減部数）                                  |
| 22  | →→→diff_mark            | Boolean | -        |              | -        | 差異マーク。履歴の前回値（`zenkai_dokusya_busu` / `zenkai_hanbaiten_id`）と現在値に差がある行（増減あり・販売店変更）は `true`（帳票では行頭に「◆」を付与）              |
| 23  | →→total                 | Object  | -        |              | -        | 合計行（当該管理支店内の全販売店合計）                                                             |
| 24  | →→→genzai_busu          | Number  | -        |              | -        | 現在部数の合計                                                                                    |
| 25  | →→→zou_busu             | Number  | -        |              | -        | 増部数の合計                                                                                      |
| 26  | →→→gen_busu             | Number  | -        |              | -        | 減部数の合計                                                                                      |
| 27  | →→→shin_busu            | Number  | -        |              | -        | 新部数の合計                                                                                      |

## リクエスト例

```
GET /api/v1/report/zougen-nichino/preview?tekiyo_date=2026-03-01&kanri_shiten_id=20&kanri_shiten_id=21
```

## レスポンス成功例

```json
{
  "data": {
    "tekiyo_date": "2026-03-01",
    "reports": [
      {
        "kanri_shiten_id": 20,
        "kanri_shiten_code": "1AA-3300-001",
        "kanri_shiten_name": "本店管理支店",
        "ja_name": "JA東京中央",
        "todofuken_name": "東京都",
        "tanto_busho": "業務部",
        "tanto_name": "農協 太郎",
        "tel": "03-1234-5678",
        "fax": "03-1234-5679",
        "rows": [
          {
            "hanbaiten_id": 200,
            "itaku_label": "委託",
            "hanbaiten_code": "12345678",
            "hanbaiten_name": "（免）A販売店",
            "genzai_busu": 10,
            "zou_busu": 0,
            "gen_busu": 1,
            "shin_busu": 9,
            "diff_mark": false
          },
          {
            "hanbaiten_id": 201,
            "itaku_label": "委託",
            "hanbaiten_code": "12345679",
            "hanbaiten_name": "A販売店",
            "genzai_busu": 10,
            "zou_busu": 1,
            "gen_busu": 1,
            "shin_busu": 10,
            "diff_mark": true
          },
          {
            "hanbaiten_id": 202,
            "itaku_label": "",
            "hanbaiten_code": "12345680",
            "hanbaiten_name": "B販売店",
            "genzai_busu": 1,
            "zou_busu": 0,
            "gen_busu": 0,
            "shin_busu": 1,
            "diff_mark": false
          }
        ],
        "total": {
          "genzai_busu": 21,
          "zou_busu": 1,
          "gen_busu": 2,
          "shin_busu": 20
        }
      }
    ]
  }
}
```

## レスポンス失敗例

### 400 Validation Error（適用日未入力）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

### 200 OK（対象データなし）

対象0件は業務エラーではないため 200 を返す。FE は `reports.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-029-002「対象のデータが
存在しません。」を表示する。プレビューは `data.tekiyo_date` を併せて返す。

```json
{
  "data": {
    "reports": []
  }
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

- クエリパラメータの検証：
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-029-004）。有効な日付形式（YYYY-MM-DD）
  - kanri_shiten_id：数値型（繰り返し指定可）。未指定可
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_nichino`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。FE側ルートガードは ACSMS-MSG-029-001 を表示する。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：`r.ja_id = :user_ja_id`（自中央会分のみ）
  - `JA_HONTEN`：`r.ja_id = :user_ja_id`（自JA分のみ）
  - `JA_KANRI_SHITEN`：`r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id`（自管理支店分のみ）
- DataScope違反（他JA・他管理支店のデータへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- 抽出条件を設定する：
  - `r.joho_henko_tekiyo_date = :tekiyo_date`（画面の適用日と一致。**`<=` ではない**：その日の変動のみ）
  - `r.zougen_hokoku_flg = true`（増減報告対象の変更）
  - `h.haiten_flg = false`（廃店・電子版ダミー販売店を除外）
  - kanri_shiten_id 指定時：`r.kanri_shiten_id = ANY(:kanri_shiten_ids)`
  - DataScope条件（4.2 参照）を追加する。
  - 並び順は **`r.dokusya_id`, `r.rireki_no` 昇順**（同一購読者の同日複数履歴を累計するため。
    帳票の管理支店/販売店コード順はレスポンス生成側で再整列。SCR-028 と同方針）。

### 4.4 データ件数の取得

- 抽出条件に一致する対象レコード件数を取得する。
- 0件の場合：HTTP 200 + `reports:[]`（FE が ACSMS-MSG-029-002「対象のデータが存在しません。」を画面内表示）。

### 4.5 データ取得

```sql
SELECT r.dokusya_rireki_id, r.dokusya_id,
       r.hanbaiten_id, r.kanri_shiten_id,
       r.zenkai_dokusya_busu, r.dokusya_busu,
       h.hanbaiten_code, h.hanbaiten_name, h.itaku_kubun, h.torihikisaki_no,
       /* 前回販売店（販売店変更の旧店表示・減/増判定用） */
       r.zenkai_hanbaiten_id,
       zh.hanbaiten_code AS zenkai_hanbaiten_code,
       zh.hanbaiten_name AS zenkai_hanbaiten_name,
       zh.itaku_kubun    AS zenkai_itaku_kubun,
       zh.torihikisaki_no AS zenkai_torihikisaki_no,
       ks.kanri_shiten_code, ks.kanri_shiten_name,
       ks.tel AS kanri_shiten_tel, ks.fax AS kanri_shiten_fax,
       td.todofuken_name,
       j.ja_name, j.tanto_busho, j.tanto_name
FROM t_dokusya_rireki r
INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL AND h.haiten_flg = false
/* 前回販売店（初回履歴は NULL のため LEFT JOIN） */
LEFT JOIN m_hanbaiten zh
        ON zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL
INNER JOIN m_kanri_shiten ks
        ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
INNER JOIN m_ja j
        ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
LEFT JOIN m_todofuken td
        ON td.todofuken_code = ks.todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  /* 管理支店フィルタ（任意） */
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* 現在部数 = 0 かつ 新部数 = 0 のレコードは除外 */
  AND NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)
  /* DataScope: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN */
  AND r.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
/* 同一購読者の同日履歴を累計するため dokusya_id, rireki_no 昇順 */
ORDER BY r.dokusya_id ASC, r.rireki_no ASC
```

### 4.6 レスポンス生成

- **同一購読者（`dokusya_id`）の同日複数履歴を累計する**（SCR-028 と同方針）：
  - **現在部数 `genzai`** = その日の最小 `rireki_no` レコードの前回部数（日初）
  - **新部数 `shin`** = その日の最大 `rireki_no` レコードの現在部数（日末）
  - 例：同日 1→3→5 は 現在1 / 新5 / 増4 の **1行**、解約 …→0 は 現在n / 新0 / 減n。
- 累計後、各購読者を以下で明細行へ整形し、**管理支店IDでグループ化**する
  （`reports` 配列。管理支店コード昇順。行内は販売店コード昇順）：
  - **販売店変更**（前回販売店 ≠ 現販売店）：旧店・新店の **2行**に分けて計上する。
    - 旧販売店（`zenkai_hanbaiten_id`）：現在部数 = 現在(busuBefore) / 減部数 = busuBefore / 増 0 / 新 0
    - 新販売店（`hanbaiten_id`）：現在部数 = 0 / 増部数 = busuAfter / 減 0 / 新部数 = busuAfter
    - （旧店の管理支店は履歴に保持されないため、暫定的に当日最終レコードの管理支店に計上。SCR-028 と同前提）
  - **同一販売店**：
    - **現在部数**（`genzai_busu`）：日初の前回部数 busuBefore
    - **増部数**（`zou_busu`）：`busuAfter > busuBefore` の場合 `busuAfter - busuBefore`、それ以外は 0
    - **減部数**（`gen_busu`）：`busuAfter < busuBefore` の場合 `busuBefore - busuAfter`、それ以外は 0（帳票では数値のまま。「▲」は付与しない）
    - **新部数**（`shin_busu`）：日末の現在部数 busuAfter（＝現在部数 ＋ 増部数 － 減部数）
  - **委託欄**（`itaku_label`）：`itaku_kubun = 2`（日農委託）の場合「委託」、それ以外（1:振込 / 9:その他）は `""`
  - **販売店名**（`hanbaiten_name`）：適格請求書発行事業者番号（`torihikisaki_no`）が空文字の場合は免税販売店とみなし、先頭に「（免）」を付与する
  - **差異マーク**（`diff_mark`）：履歴の前回値（`zenkai_dokusya_busu` / `zenkai_hanbaiten_id`）と現在値に差がある行は `true`。具体的には増減あり（`dokusya_busu ≠ zenkai_dokusya_busu`）または販売店変更（旧店・新店の2行）を `true` とし、増減が無い行は `false`
- 各管理支店の `total` に、当該管理支店内の `genzai_busu` / `zou_busu` / `gen_busu` / `shin_busu` の合計を設定する。
- 帳票ヘッダ用に、管理支店コード（`kanri_shiten_code`）、JA名称（`ja_name`）、都道府県名（`todofuken_name`）、担当部署（`tanto_busho`）、担当者名（`tanto_name`）、TEL（管理支店）、FAX（管理支店）を返す。
- **ページ送り（SQL OFFSET/LIMIT。購読者単位。SCR-028 と同方針）**：
  - 累計は**同日履歴をまたいで分割できない**ため、`OFFSET/LIMIT` の最小単位は
    **`dokusya_id`（購読者）**であり行/レコード単位ではない。`per_page`（既定15）は
    「1ページの販売店行数（≒購読者数。大半1行/購読者。販売店変更=2行になり得る）」。
  - 処理：① `COUNT(DISTINCT r.dokusya_id)` で対象購読者数 → `total_pages` 算出、②
    `GROUP BY r.dokusya_id ORDER BY MIN(ks.kanri_shiten_code), MIN(h.hanbaiten_code),
    r.dokusya_id OFFSET (page-1)*per_page LIMIT per_page` でページ対象の `dokusya_id` を
    取得、③ その購読者の明細行のみ取得して管理支店ごとに集約。**BEは1ページ分の購読者の
    明細だけをロードする**（メモリ内全件ロードではない）。
  - メタ（`page_no` / `per_page` / `total_pages` / `total_rows`＝購読者数 / `is_last_page`）を返す。
  - `total`（管理支店合計）はそのページの行から算出する（管理支店がページをまたぐ場合は
    ページ内合計）。
- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（ACSMS-MSG-029-003）。
- 本APIは参照のみのため操作ログ（t_log）への記録は行わない。

---

# API ACSMS-API-029-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Zougen Nichino Report (PDF)                                                                                                                                                                                                                                  |
| 概要                   | プレビューと同一条件で増減対象データを抽出し、全管理支店をプレビューと同じ改ページ（15行/ページ）でまとめた1つの電子帳票PDFを生成してS3に保存し、日農担当者へメール自動通知を行い、ダウンロードを返却する                                                              |
| URI                    | /api/v1/report/zougen-nichino/export                                                                                                                                                                                                                                |
| メソッド               | POST                                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に電子帳票を出力しました（対象0件のときは application/json で `{ data: { reports: [] } }`）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                  |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-029-004）                               |
| 2   | kanri_shiten_id | Number | 〇       | -    |        |        | 管理支店ID（配列）。未指定の場合はスコープ内の全管理支店を対象とする                                   |
| 3   | remarks         | Array  | 〇       | -    |        |        | プレビューで入力した管理支店ごとの備考。未指定可                                                       |
| 4   | →kanri_shiten_id| Number | -        | -    |        |        | 対象の管理支店ID                                                                                      |
| 5   | →biko           | String | -        | -    | 0      | 1000   | 当該管理支店の帳票「＜備考＞」欄に印字する備考テキスト                                                 |

## レスポンスデータ

PDFファイル（`Content-Type: application/pdf`）。**全管理支店をプレビューと同じ改ページ
（1ページ=15販売店行・同じ並び）でまとめた1つのPDF**（ZIPではない。SCR-028 と同方針）。

### レスポンスヘッダ

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_nichino_YYYYMMDD.pdf"
```

※ ファイル名は適用日に基づく（例：適用日 2026-03-01 → 表示名 `増減通知_20260301.pdf`、
  ASCII別名 `zougen_nichino_20260301.pdf`）。
  `Content-Disposition` の `filename` には ASCII 別名、`filename*`（RFC 5987）には日本語名を設定する。

### PDFレイアウト

| 区分         | 表示内容                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| ヘッダ（左） | 日本農業新聞社 業務管理部 / TEL / FAX（固定の発行元情報）                                              |
| ヘッダ（中） | タイトル「日本農業新聞増減通知」                                                                       |
| ヘッダ（右） | 出力日時 / ページ数（`Page: 現在ページ/全体ページ数`）                                                 |
| 見出し       | 適用日（`YYYY年M月D日より`）/ 都道府県名 / 組合名（管理支店コード(3-4-3): JA名＋管理支店名）/ 担当部署 ／ 担当者 / TEL / FAX |
| 明細テーブル | 委託 / 販売店コード / 販売店名 / 現在部数 / 増部数 / 減部数 / 新部数（販売店コード昇順）               |
| 合計行       | テーブル末尾に全販売店の合計を表示                                                                     |
| 備考         | 「＜備考＞」欄（リクエストの `remarks` を印字）                                                        |

※ 委託欄は「日農委託」の販売店のみ「委託」、振込・その他は空欄。免税販売店は販売店名の前に「（免）」。
  減部数は数値のまま表示する（「▲」は付与しない）。前回出力との差異がある行には「◆」を付与する。
※ 改ページは**プレビューと同じ1ページ=15販売店行単位**（購読者を管理支店コード昇順・販売店
  コード昇順・dokusya_id 昇順に並べ15行ずつ）。1ページに複数管理支店が載る場合は各管理支店
  ブロックを続けて積み、ページ先頭でのみ改ページする。PDF の n ページ目 = プレビューの n
  ページ目。Page表記は「ページ番号/総ページ数」。

## リクエスト例

```json
POST /api/v1/report/zougen-nichino/export
Content-Type: application/json

{
  "tekiyo_date": "2026-03-01",
  "kanri_shiten_id": [20, 21],
  "remarks": [
    { "kanri_shiten_id": 20, "biko": "3月度分の増減通知です。" }
  ]
}
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_nichino_1AA-3300-001_20260301.pdf"; filename*=UTF-8''zougen_nichino_1AA-3300-001_20260301.pdf

（PDFバイナリ）
```

## レスポンス失敗例

### 400 Validation Error（適用日未入力）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

### 200 OK（対象データなし）

対象0件は業務エラーではないため 200 を返す。FE は `reports.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-029-002「対象のデータが
存在しません。」を表示する。プレビューは `data.tekiyo_date` を併せて返す。

```json
{
  "data": {
    "reports": []
  }
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

> ※ 4.6 ダウンロード履歴登録 と 4.7 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。
> なお、S3へのPDF保存（4.4）および日農担当者へのメール通知（4.5）は外部I/Oのためトランザクション外で実行し、
> DB登録（4.6/4.7）の前に完了させる。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-029-004）。有効な日付形式（YYYY-MM-DD）
  - kanri_shiten_id：数値配列。未指定可
  - remarks：オブジェクト配列（`kanri_shiten_id` + `biko`）。未指定可。`biko` は最大1000文字
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_nichino`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`：`r.ja_id = :user_ja_id AND r.kanri_shiten_id = :user_kanri_shiten_id`
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- `ACSMS-API-029-001` の 4.3 〜 4.5 と同一の抽出条件・SQLでデータを取得する（`joho_henko_tekiyo_date = :tekiyo_date`、`zougen_hokoku_flg = true`、`h.haiten_flg = false`、`現在部数=0 AND 新部数=0` のレコード除外、DataScope適用）。
- 取得件数が0件の場合：HTTP 200 + `application/json` `{ data: { reports: [] } }`（ファイルは生成しない。FE が ACSMS-MSG-029-002 を画面内表示）。

### 4.4 PDF生成・S3保存

- 取得レコードを管理支店ID単位でグループ化する（管理支店コード昇順）。
- **プレビューと同じ改ページ**（1ページ=15販売店行・購読者単位。管理支店コード昇順→販売店
  コード昇順→dokusya_id 昇順）で**全管理支店を1つのPDF**にまとめて描画する。1ページに複数
  管理支店が載る場合は各管理支店ブロックを続けて積み、ページ先頭でのみ改ページする。各
  管理支店ブロックは明細テーブル＋合計行＋備考（PDFレイアウト参照）。
- 委託欄・免税（（免））・差異マーク（◆）の整形は `ACSMS-API-029-001` の 4.6 と同一とする（減部数は数値のまま。「▲」は付与しない）。
- ヘッダにページ数（`Page: 現在ページ/全体ページ数`）、組合名（管理支店コードを3-4-3でハイフン区切り＋JA名＋管理支店名）、都道府県名、担当部署 ／ 担当者、TEL / FAX を表示する。
- 出力形式：PDF（A4）。テンプレート（Handlebars）→ HTML → Puppeteer で生成する。
- 生成した1つのPDFをS3に保存する。保存先パス：`s3://{bucket}/ja-{ja_id}/report/`、ファイル名：`zougen_nichino_{適用日YYYYMMDD}_{timestamp}.pdf`。

### 4.5 メール通知

- 日農担当者（NICHINO_ADMIN / NICHINO_STAFF のメールアドレス、または設定済み通知先）へ増減通知の作成完了をメールで自動通知する（`MailService`。件名プレフィックス `【AgriNews_ACSMS】`）。
- メール本文には適用日・対象管理支店・件数を記載する。個人情報（購読者の氏名・住所等）は含めないこと。
- メール送信失敗時もPDF出力自体は成功扱いとし、警告ログ（`log_type = 2` 等）を記録する。

### 4.6 ダウンロード履歴登録

- 生成したPDFファイルごとに、以下のSQLでダウンロード履歴を登録する。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 4,
        :file_name, :file_path, :file_size,
        :record_count, :target_month,
        NOW(), :user_account_id)
```

- `download_type`：4（増減通知書 ※m_code.code_category='DOWNLOAD_TYPE' を参照）
- `target_month`：適用日の年月（YYYYMM）
- `record_count`：当該管理支店の対象明細件数

### 4.7 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)', 'EXPORT_PDF', 1,
        :file_download_id, 't_file_download',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：出力条件と件数をJSON形式で格納する。個人情報（氏名・住所等）は含めないこと。

{
  "tekiyo_date": "2026-03-01",
  "kanri_shiten_id": [20, 21],
  "report_count": 2,
  "record_count": 5,
  "file_names": [
    "増減通知_1AA-3300-001_20260301.pdf",
    "増減通知_1AA-3300-002_20260301.pdf"
  ]
}
```

### 4.8 レスポンス生成

- 全管理支店をまとめた**1つのPDF**をレスポンスボディとして返却する。HTTP 200。
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="zougen_nichino_{YYYYMMDD}.pdf"; filename*=UTF-8''{URLエンコードしたファイル名}`
- ダウンロード時の表示名は `増減通知_{YYYYMMDD}.pdf`。

### 4.9 例外処理

- DB接続エラー・PDF生成エラー・S3保存エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（ACSMS-MSG-029-003）。
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)', 'EXPORT_PDF', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
