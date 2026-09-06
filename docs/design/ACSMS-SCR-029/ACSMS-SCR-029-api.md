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
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者           | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/05 | 1.0  | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/07/02 | 1.1  | Tran Duc Tuyen | 減部数のマイナス符号「▲」表示を廃止し数値のまま表示（顧客要望）。差異マーク「◆」を行頭列に表示し、履歴の前回値（zenkai_*）と現在値の差（増減あり・販売店変更）で `diff_mark` を判定するよう実装。 | Tran Duc Tuyen | Tran Duc Tuyen |
| 3   | 2026/07/14 | 1.2  | Tran Duc Tuyen | 顧客コメント対応：4.4 ファイル名をロール別命名（JA本店/中央会 と JA管理支店）に変更＋表示名とS3キー(タイムスタンプ)を分離、削除予定日＝作成日+5年・日農DL許可フラグ=True を明記。4.5 メール件名/本文に都道府県＋発行アカウント（ログインID+アカウント名）を追記。4.6 INSERT に scheduled_delete_date / nichino_download_allowed_flg を追加。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/07/14 | 1.3  | Tran Duc Tuyen | 顧客コメント対応：減部数（gen_busu）をプレビュー・帳票でマイナス符号「▲」付き表示（例「▲2」）に戻す。値は正の減部数（Number）のまま、▲は表示フォーマット。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/07/15 | 1.4  | Tran Duc Tuyen | 顧客コメント対応：4.5 メールのシステム名【クラウド版購読者管理システム】を件名から外し本文先頭行へ移動。件名は【都道府県】【発行アカウント】+タイトルのみ。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 6 | 2026/08/05 | 1.5 | Tran Duc Tuyen | 顧客要件 2026-08 の確認結果：本画面は集計対象が紙版のみ（併読・電子版は対象外）で既に要件どおり。出力条件に販売店の入力欄が無いため、ダミー販売店の表示制御も対象外。**コード変更なし**（再確認時に調査し直さないための記録）。 | | |
| 7 | 2026/08/14 | 1.6 | Tran Duc Tuyen | 顧客報告 #57976 の不具合修正：抽出SQLが `h.haiten_flg = false` を行単位の除外条件としていたため、廃店に紐づく購読者の増減が日本農業新聞への通知から漏れていた。本帳票は特定販売店を報告の宛先とするものではないため、廃店であっても対象に含めるよう `haiten_flg` 条件を撤廃（4.3〜4.5）。 | | |
| 8 | 2026/08/17 | 1.7 | Tran Duc Tuyen | 実装コードとの整合監査による全面修正：①出力API（ACSMS-API-029-002）の成功レスポンスを「PDFファイルを直接返却」から実態（**PDFはブラウザへ返さずJSON `{ data: { file_name, recipient_count } }` を返す**。S3保存＋日農担当者へのメール通知のみ行う）へ全面訂正（レスポンスデータ／レスポンス成功例／4.8）。②プレビューのページングモデルの記述を実態（購読者単位のSQL OFFSET/LIMIT）から**管理支店単位の独立ページング**（顧客要件2026-07・全件取得後にメモリ内で`paginateNichinoSubscribers`が分割。1ページ=1管理支店、行数が`per_page`を超える管理支店のみ自グループ内で複数ページに続く）へ全面訂正し、レスポンスに`group_count`/`group_page_no`/`group_total_pages`を追記（リクエストパラメータ／レスポンスデータ／4.6）。③1ページの上限行数が`c6b3112a`（2026-07-10）で15→28へ変更されていたのに未反映だった`per_page`既定値・PDF改ページ説明を28へ訂正し、「1ページに複数管理支店が同居する」という誤った改ページ説明（実際は1ページ=1管理支店で他管理支店とは同居しない）を訂正（4.4・PDFレイアウト）。④抽出SQLに欠けていた論理削除済み購読者の除外（`INNER JOIN t_dokusya d ON d.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL`、2026-08-12対応の`f3ea4986`）を反映（4.3〜4.5）。⑤DataScopeのWHERE適用を実装どおりロール別（`JA_KANRI_SHITEN`は`kanri_shiten_id`のみ、`CHUOKAI`/`JA_HONTEN`は`ja_id`のみで、両方を同時に付与する実装ではない）に訂正（4.2・4.5）。⑥出力APIの「4.6/4.7を単一トランザクションで実行」という記述を撤回（S3保存・メール通知・ダウンロード履歴登録・操作ログ記録はトランザクションを組まず順次実行される実装のため）。⑦ダウンロード履歴登録の`target_month`は実装が値を渡さないため常に`NULL`である旨、`record_count`は当該管理支店ではなく**全管理支店合計の生行数**（`rows.length`）である旨を訂正（4.6）。⑧顧客要件2026-07「所属支店設定済アカウントは本機能を使用不可」の`ShitenRestrictedGuard`（403 FORBIDDEN・メッセージ「所属支店が設定されたアカウントはこの機能を使用できません。」）が両APIとも未記載だったため追記（エラー一覧・4.2）。⑨VALIDATION_ERROR/UNAUTHORIZED/FORBIDDEN/INTERNAL_SERVER_ERRORのレスポンス例JSONの末尾句点が`error-codes.constant.ts`の`ErrorMessage`定数と不一致だったため統一。⑩備考(`remarks[].kanri_shiten_id`)がDTO上必須（`@IsInt()`のみ、`@IsOptional()`無し）なのに「必須」列が空欄だったため訂正（4.1）。 | | |
| 9 | 2026/08/18 | 1.8 | Tran Duc Tuyen | 顧客要件2026-08の確認結果：新設された`hanbaiten_tohaigo_flg`（販売店統廃合フラグ）はSCR-028 増減連絡票（販売店）のみを対象とし、本帳票（増減通知・日本農業新聞）は**仕様変更なし**（統廃合か否かに関わらず全件反映）。クエリも別（`nichinoBaseQuery`）のためコード変更なし。§4.3にその旨を明記（再確認時に調査し直さないための記録）。 | Nguyen Huy Dat | Nguyen Huy Dat |

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

※ 顧客要件2026-07「制限②」：`m_account.shiten_id`（所属支店）が設定されたアカウントは
本画面を含む帳票5画面（購読者名簿・増減連絡票・増減通知・口座振替データ・配達手数料支払
情報）を使用できない。`report.export_zougen_nichino` 権限の有無に関わらず、
`ShitenRestrictedGuard`（`SessionAuthGuard` → `PermissionsGuard` の後段でコントローラ全体に
適用）が `session.shiten_id != null` を検知した時点で `FORBIDDEN`（HTTP 403、メッセージ
「所属支店が設定されたアカウントはこの機能を使用できません。」）を返す。両API共通。

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
| 3   | page            | Number | -        | -    |        |        | ページ番号（1始まり）。未指定時は1。**グループ単位ページング**（顧客要件2026-07）：管理支店ごとに独立ページを割り当てた通し番号。SQL OFFSET/LIMITではない（詳細4.6） |
| 4   | per_page        | Number | -        | -    |        |        | 1ページに詰める明細行数の上限（1〜500）。未指定時は**28**（`ZOUGEN_NICHINO_PER_PAGE`）。「1ページの購読者数」ではない。1管理支店の行数がこれを超える場合のみ自グループ内で複数ページに続く（詳細4.6） |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                              |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                    | Object  | -        |              | -        | プレビュー結果                                                                                    |
| 2   | →tekiyo_date            | String  | -        | YYYY-MM-DD   | -        | 適用日（リクエストのエコーバック）                                                                |
| -   | →page_no                | Number  | -        |              | -        | 現在のページ番号（管理支店単位の通し番号。詳細4.6）                                                |
| -   | →per_page               | Number  | -        |              | -        | 1ページに詰める明細行数の上限（既定28）。「1ページの購読者数」ではない                              |
| -   | →total_pages            | Number  | -        |              | -        | 総ページ数（全管理支店をそれぞれ `per_page` 行ずつに分割した合計ページ数）                          |
| -   | →total_rows             | Number  | -        |              | -        | 対象購読者数（`COUNT(DISTINCT dokusya_id)` 相当）。**ページングの単位ではない**（ページングの単位は管理支店。旧仕様との互換のため保持） |
| -   | →is_last_page           | Boolean | -        |              | -        | 最終ページか                                                                                      |
| -   | →group_count            | Number  | -        |              | -        | 全体の管理支店グループ数（対象データに含まれる管理支店の総数）                                      |
| -   | →group_page_no          | Number  | -        |              | -        | 当該ページが属する**管理支店単位**のページ番号（帳票ヘッダ「ページ数：n/N」表記に使用）。1管理支店の行数が`per_page`を超える場合のみ2以上になる |
| -   | →group_total_pages      | Number  | -        |              | -        | 当該管理支店のページ総数（上記と対）                                                              |
| 3   | →reports                | Array   | 〇       |              | -        | このページの帳票データ。**グループ単位ページングのため常に要素数1**（1ページ=1管理支店。対象0件のときのみ空配列） |
| 4   | →→kanri_shiten_id       | Number  | -        |              | -        | 管理支店ID                                                                                        |
| 5   | →→kanri_shiten_code     | String  | -        |              | -        | 管理支店コード（帳票では10桁を3-4-3でハイフン区切り表示。例: 999-9999-999）                        |
| 6   | →→kanri_shiten_name     | String  | -        |              | -        | 管理支店名称                                                                                      |
| 7   | →→ja_name               | String  | -        |              | -        | JA名称（帳票ヘッダ「組合名」に表示）                                                               |
| 8   | →→todofuken_name        | String  | -        |              | -        | 都道府県名（管理支店の都道府県。帳票ヘッダ「都道府県名」に表示）                                   |
| 9   | →→tanto_busho           | String  | -        |              | -        | 担当部署名（JAの担当部署。空欄は `""`）                                                            |
| 10  | →→tanto_name            | String  | -        |              | -        | 担当者名（JAの担当者。空欄は `""`）                                                                |
| 11  | →→tel                   | String  | -        |              | -        | 電話番号（管理支店TEL。空欄は `""`）                                                               |
| 12  | →→fax                   | String  | -        |              | -        | FAX番号（管理支店FAX。空欄は `""`）                                                                |
| -   | →→group_page_no         | Number  | -        |              | -        | data.group_page_no と同値（reports 要素にも複製される）                                            |
| -   | →→group_total_pages     | Number  | -        |              | -        | data.group_total_pages と同値（reports 要素にも複製される）                                        |
| 13  | →→rows                  | Array   | 〇       |              | -        | 明細行一覧（販売店コード昇順）                                                                     |
| 14  | →→→hanbaiten_id         | Number  | -        |              | -        | 販売店ID                                                                                          |
| 15  | →→→itaku_label          | String  | -        |              | -        | 委託欄表示。委託区分が「日農委託」（`itaku_kubun=2`）の場合「委託」、それ以外（振込/その他）は `""` ※m_code.code_category='ITAKU_KUBUN'を参照（1:振込, 2:日農委託, 9:その他） |
| 16  | →→→hanbaiten_code       | String  | -        |              | -        | 販売店コード                                                                                      |
| 17  | →→→hanbaiten_name       | String  | -        |              | -        | 販売店名（免税販売店＝適格請求書発行事業者番号が空の場合は先頭に「（免）」を付与）                 |
| 18  | →→→genzai_busu          | Number  | -        |              | -        | 現在部数（前回購読部数 `zenkai_dokusya_busu`。NULLは0として扱う）                                  |
| 19  | →→→zou_busu             | Number  | -        |              | -        | 増部数（`dokusya_busu > 現在部数` の場合に `dokusya_busu - 現在部数`、それ以外は0）                |
| 20  | →→→gen_busu             | Number  | -        |              | -        | 減部数（`dokusya_busu < 現在部数` の場合に `現在部数 - dokusya_busu`、それ以外は0）。値は正の減部数（Number）。プレビュー・帳票ではマイナス符号「▲」を付けて表示する（例：`▲2`。0 は「0」・顧客要件2026-07） |
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
    "page_no": 1,
    "per_page": 28,
    "total_pages": 2,
    "total_rows": 4,
    "is_last_page": false,
    "group_count": 2,
    "group_page_no": 1,
    "group_total_pages": 1,
    "reports": [
      {
        "kanri_shiten_id": 20,
        "kanri_shiten_code": "1AA3300001",
        "kanri_shiten_name": "本店管理支店",
        "ja_name": "JA東京中央",
        "todofuken_name": "東京都",
        "tanto_busho": "業務部",
        "tanto_name": "農協 太郎",
        "tel": "03-1234-5678",
        "fax": "03-1234-5679",
        "group_page_no": 1,
        "group_total_pages": 1,
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
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

※ 所属支店（`shiten_id`）が設定されたアカウントの場合は `ShitenRestrictedGuard` により
同じ `error_code: FORBIDDEN` / HTTP 403 だが `message` が
「所属支店が設定されたアカウントはこの機能を使用できません。」に変わる（エラー一覧の脚注参照）。

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
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
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
- **制限②（顧客要件2026-07）**：`session.shiten_id`（所属支店）が設定されたアカウントは
  `ShitenRestrictedGuard` により本機能を使用できない。`session.shiten_id != null` の場合：
  HTTP 403 (`FORBIDDEN`)、メッセージ「所属支店が設定されたアカウントはこの機能を使用できません。」
  （エラー一覧の脚注参照。`report.export_zougen_nichino` の権限有無とは独立したチェック）。
- DataScope（`applyBranchScope` — ロールにより**片方のみ**を付与し、両方を同時に付与する
  実装ではない）：
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`（自JA・自中央会分のみ。`kanri_shiten_id` 条件は付与しない）
  - `JA_KANRI_SHITEN`：`r.kanri_shiten_id = :user_kanri_shiten_id`（自管理支店分のみ。`kanri_shiten_id` は特定のJAに一意に属するため `ja_id` 条件は付与しない）
- DataScope違反（他JA・他管理支店のデータへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

顧客CR #59108（片岡様フィードバック 2026-08-31）: 従来は「その日に部数の動きが
あった販売店のみ」が出力され、動きが無い既存購読者の販売店（現在部数・新部数が
ともに存在するのに増減が無いだけの店舗）が帳票から漏れる不具合があった。要件
定義書どおり「現在部数または新部数がある販売店は全て出力する」ため、抽出は
**2つのクエリの結果を合算**する：

1. **当日の増減報告対象行**（下記・従来どおり `r.joho_henko_tekiyo_date = :tekiyo_date`）
2. **動きの無い既存購読者の基礎行**（新規・`nichinoBaselineQuery`。4.3.1 参照）

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- **クエリ①（当日の増減報告対象行）**の抽出条件を設定する：
  - `r.joho_henko_tekiyo_date = :tekiyo_date`（画面の適用日と一致。その日の変動のみ）
  - `r.zougen_hokoku_flg = true`（増減報告対象の変更）
  - `r.torikeshi_flg = false`（取消(赤伝)行を除外）
  - **論理削除済み購読者を除外する（`t_dokusya.deleted_at IS NULL`。2026-08-12対応）**：
    `t_dokusya_rireki` は購読者の履歴のみを保持し、購読者本体（`t_dokusya`）の論理削除有無を
    自身では確認しない。`DokusyaService.remove()` の FK ブロック対象（`RELATED_TABLES`）は
    `t_koza_furikae` のみで履歴の有無を見ないため、有効な購読履歴（現在行）を持つ紙版購読者
    でも論理削除が可能であり、削除後もその履歴行は「現在行」の条件を満たし続けて帳票に
    出力され続けてしまう。`t_dokusya` を `INNER JOIN` して `deleted_at IS NULL` を確認する。
  - **`r.dokusya_shubetsu = 1`（紙版のみ集計。顧客要件2026-08）**
    本帳票も部数の増減を伝えるもので、電子版・併読は配達を伴わないため対象外
    （SCR-028 増減連絡票と同方針）。従来の「電子版は承認済(`denshi_shonin_status = 1`)
    のみ集計」条件は紙版限定に包含されるため廃止した。
  - **本帳票は`hanbaiten_tohaigo_flg`（販売店統廃合フラグ）の影響を受けない（顧客要件2026-08・
    仕様変更なし）**：SCR-028 増減連絡票（販売店）は統廃合販売店読者移行画面（旧: 購読者
    販売店一括置換画面・ACSMS-SCR-015）経由の変更を集計対象から除外するが、本帳票（日本
    農業新聞への通知）は統廃合か否かに関わらず全ての変更を反映する。クエリも別
    （`nichinoBaseQuery`）のため`zougenBaseQuery`側の除外条件はそもそも適用されない。
  - **`haiten_flg` による除外は行わない（顧客要件 #57976）**：本帳票は日本農業新聞への
    増減通知であり、SCR-028 増減連絡票（販売店）と異なり特定の販売店を報告の宛先に
    するものではないため、現販売店が廃店（`haiten_flg = true`）であっても対象に含める。
    旧仕様（`h.haiten_flg = false` を INNER JOIN の ON 条件に含める）は、廃店に
    紐づく購読者の増減が日本農業新聞への通知から漏れる不具合があったため廃止した。
  - kanri_shiten_id 指定時：`r.kanri_shiten_id = ANY(:kanri_shiten_ids)`
  - DataScope条件（4.2 参照。ロールにより `ja_id` または `kanri_shiten_id` のいずれか一方のみ）を追加する。
  - 並び順は **`r.dokusya_id`, `r.rireki_no` 昇順**（同一購読者の同日複数履歴を累計するため。
    帳票の管理支店/販売店コード順はレスポンス生成側で再整列。SCR-028 と同方針）。
  - **本SQLは全件取得する（OFFSET/LIMITを付与しない）**。ページングはこの後、4.6 のとおり
    メモリ内で行う（購読者単位のSQLページングではない）。

#### 4.3.1 クエリ②（動きの無い既存購読者の基礎行・`nichinoBaselineQuery`）

各購読者の「適用日時点で有効な履歴」= `torikeshi_flg = false` の行のうち
`joho_henko_tekiyo_date` が適用日**以下**で最大（同日は `rireki_no` 最大）の1行
（`t_dokusya_rireki` の現行判定と同じ定義）。この行が当日(=適用日)の増減報告対象
行（クエリ①）であればそちらで計上済みのため、クエリ②では除外する（二重計上防止）。

```sql
SELECT r.dokusya_id, r.hanbaiten_id, r.dokusya_busu, r.kanri_shiten_id, /* … */
FROM t_dokusya_rireki r
/* JOIN群はクエリ①と同一（t_dokusya / m_hanbaiten h / m_kanri_shiten ks / m_ja j /
   m_hanbaiten zh / m_todofuken td） */
WHERE r.torikeshi_flg = false
  AND r.joho_henko_tekiyo_date <= :tekiyo_date
  /* 現在0部の購読者は現在部数=新部数=0となり出力対象外のため事前に除外 */
  AND r.dokusya_busu != 0
  AND r.dokusya_shubetsu = 1
  /* r が「適用日時点で有効な履歴」であること（同一購読者でより新しい
     (joho, rireki_no) の行が存在しない）。IX_t_dokusya_rireki_chain
     (dokusya_id, joho_henko_tekiyo_date, rireki_no) で効率化される。 */
  AND NOT EXISTS (
    SELECT 1 FROM t_dokusya_rireki r2
     WHERE r2.dokusya_id = r.dokusya_id
       AND r2.torikeshi_flg = false
       AND r2.joho_henko_tekiyo_date <= :tekiyo_date
       AND (r2.joho_henko_tekiyo_date > r.joho_henko_tekiyo_date
            OR (r2.joho_henko_tekiyo_date = r.joho_henko_tekiyo_date
                AND r2.rireki_no > r.rireki_no))
  )
  /* 当日の増減報告対象行（クエリ①）がある購読者は除外（二重計上防止） */
  AND NOT EXISTS (
    SELECT 1 FROM t_dokusya_rireki r3
     WHERE r3.dokusya_id = r.dokusya_id
       AND r3.torikeshi_flg = false
       AND r3.joho_henko_tekiyo_date = :tekiyo_date
       AND r3.zougen_hokoku_flg = true
  )
  /* 管理支店フィルタ・DataScopeはクエリ①と同一（4.3参照） */
```

取得した行は、`zenkai_dokusya_busu` = 自身の `dokusya_busu`、`zenkai_hanbaiten_id`
= 自身の `hanbaiten_id`（他の `zenkai_*` 列も現在値で複製）としてクエリ①の行と
同じ形へ変換してから合算する。これにより「現在＝新（変化なし）」を表現し、4.6の
累計・グループ化ロジックはクエリ①・②を区別せず共通処理できる（同一販売店内で
自然に増部数=減部数=0・`diff_mark=false` に分類される）。

### 4.4 データ件数の取得

- 抽出条件に一致する対象レコード件数を取得する。
- 0件の場合：HTTP 200 + `reports:[]`（FE が ACSMS-MSG-029-002「対象のデータが存在しません。」を画面内表示）。

### 4.5 データ取得（クエリ①・当日の増減報告対象行）

クエリ②（動きの無い既存購読者の基礎行）は 4.3.1 参照。両クエリの結果は
（変換後に）1つの配列へ連結し、4.6 の累計・グループ化処理へ渡す。

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
/* 論理削除済み購読者を除外（2026-08-12対応。DokusyaService.remove() は履歴の
   有無を見ずに削除できるため、購読者本体側の削除有無を別途確認する必要がある） */
INNER JOIN t_dokusya d
        ON d.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL
/* #57976: haiten_flg では絞り込まない（廃店の増減も日本農業新聞へ通知する） */
INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
INNER JOIN m_kanri_shiten ks
        ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
INNER JOIN m_ja j
        ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
/* 前回販売店（初回履歴は NULL のため LEFT JOIN） */
LEFT JOIN m_hanbaiten zh
        ON zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL
LEFT JOIN m_todofuken td
        ON td.todofuken_code = ks.todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  AND r.torikeshi_flg = false
  /* 現在部数 = 0 かつ 新部数 = 0 のレコードは除外 */
  AND NOT (COALESCE(r.zenkai_dokusya_busu, 0) = 0 AND r.dokusya_busu = 0)
  /* 紙版のみ集計（顧客要件2026-08） */
  AND r.dokusya_shubetsu = 1
  /* 管理支店フィルタ（任意） */
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* DataScope（applyBranchScope）: ロールにより下記いずれか一方のみが付与される。
     両方が同時に付くことはない。NICHINO_* は本APIの権限を保持しないため到達しない。 */
  AND r.ja_id = :user_ja_id                      -- CHUOKAI / JA_HONTEN のみ
  AND r.kanri_shiten_id = :user_kanri_shiten_id   -- JA_KANRI_SHITEN のみ
/* 同一購読者の同日履歴を累計するため dokusya_id, rireki_no 昇順。OFFSET/LIMITは付与せず全件取得する */
ORDER BY r.dokusya_id ASC, r.rireki_no ASC
```

### 4.6 レスポンス生成

- クエリ①（当日の増減報告対象行）とクエリ②（動きの無い既存購読者の基礎行。4.3.1）
  の結果を連結した行集合に対して以下を行う。両クエリの購読者集合は互いに素
  （クエリ②の `NOT EXISTS` で二重計上を防止済み）。
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
    - **減部数**（`gen_busu`）：`busuAfter < busuBefore` の場合 `busuBefore - busuAfter`、それ以外は 0（JSONの値は正の数。帳票ではマイナス符号「▲」を付けて表示する。`formatGenBusu()`・顧客要件2026-07）
    - **新部数**（`shin_busu`）：日末の現在部数 busuAfter（＝現在部数 ＋ 増部数 － 減部数）
  - **委託欄**（`itaku_label`）：`itaku_kubun = 2`（日農委託）の場合「委託」、それ以外（1:振込 / 9:その他）は `""`
  - **販売店名**（`hanbaiten_name`）：適格請求書発行事業者番号（`torihikisaki_no`）が空文字の場合は免税販売店とみなし、先頭に「（免）」を付与する
  - **差異マーク**（`diff_mark`）：履歴の前回値（`zenkai_dokusya_busu` / `zenkai_hanbaiten_id`）と現在値に差がある行は `true`。具体的には増減あり（`dokusya_busu ≠ zenkai_dokusya_busu`）または販売店変更（旧店・新店の2行）を `true` とし、増減が無い行は `false`
- 各管理支店の `total` に、当該管理支店内の `genzai_busu` / `zou_busu` / `gen_busu` / `shin_busu` の合計を設定する。
- 帳票ヘッダ用に、管理支店コード（`kanri_shiten_code`）、JA名称（`ja_name`）、都道府県名（`todofuken_name`）、担当部署（`tanto_busho`）、担当者名（`tanto_name`）、TEL（管理支店）、FAX（管理支店）を返す。
- **ページ送り（グループ単位ページング。顧客要件2026-07・SCR-026 と同方針）**：
  - 4.5 のSQLは**OFFSET/LIMITを付与せず全件取得**する（購読者単位のSQLページングではない）。
    取得した全行を上記の累計・グループ化処理で `reports`（管理支店ごとの帳票）へ変換した後、
    `paginateNichinoSubscribers()` が**メモリ内で**ページへ分割する（`ZougenReportService`
    はBEが唯一の真実源であり、プレビューとPDF出力が同一関数を共有するためページ構成は必ず
    一致する）。
  - **1ページ＝1管理支店**が原則。各管理支店の明細行を `per_page`（既定 **28**。
    `ZOUGEN_NICHINO_PER_PAGE`）行ずつに分割し、行数が `per_page` を超える管理支店のみ
    自グループ内で複数ページに続く（他の管理支店とは決して同居しない）。ページ番号は
    管理支店ごとに 1..N（`group_page_no` / `group_total_pages`）を採番する。
  - `page`（リクエストパラメータ）は、全管理支店を管理支店コード昇順に並べたときの
    ページ通し番号（1始まり）。範囲外指定（1未満／`total_pages` 超過）は 1 または
    `total_pages` にクランプする。
  - `total_pages`＝全管理支店をそれぞれ `per_page` 行ずつに分割した合計ページ数。
  - `group_count`＝対象データに含まれる管理支店（`kanri_shiten_id`）の総数。
  - `total_rows`＝対象購読者数（`COUNT(DISTINCT dokusya_id)` 相当）。**ページングの単位ではない**
    （ページングの単位は管理支店）。旧仕様（購読者単位SQLページング）との互換のため維持している。
  - `total`（管理支店合計）は、その管理支店の**全行**（ページをまたいでいても全体）から算出し、
    分割された各ページで同じ値を表示する（合計行だけを見ればページに関わらず総数がわかる）。
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
| 概要                   | プレビューと同一条件で増減対象データを抽出し、全管理支店をプレビューと同じ改ページ（既定28行/ページ・1ページ=1管理支店）でまとめた1つの電子帳票PDFを生成してS3に保存し、日農担当者へメール自動通知を行う。**PDFはブラウザへ返さず**、保存ファイル名と通知宛先数をJSONで返却する                                                              |
| URI                    | /api/v1/report/zougen-nichino/export                                                                                                                                                                                                                                |
| メソッド               | POST                                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に電子帳票を出力しました（`{ data: { file_name, recipient_count } }`。対象0件のときは `{ data: { reports: [] } }`）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID  | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                  |
| --- | --------------- | ------ | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-029-004）                               |
| 2   | kanri_shiten_id | Number | 〇       | -    |        |        | 管理支店ID（配列）。未指定の場合はスコープ内の全管理支店を対象とする                                   |
| 3   | remarks         | Array  | 〇       | -    |        |        | プレビューで入力した管理支店ごとの備考。未指定可                                                       |
| 4   | →kanri_shiten_id| Number | -        | 〇   |        |        | 対象の管理支店ID（`remarks` 配列の各要素で必須。`biko` のみ省略可）                                    |
| 5   | →biko           | String | -        | -    | 0      | 1000   | 当該管理支店の帳票「＜備考＞」欄に印字する備考テキスト                                                 |

## レスポンスデータ

**PDFはブラウザへ返さない**（SCR-028 増減連絡票とはここが異なる。ZIPでもない）。
生成したPDF（全管理支店を1つのPDFにまとめたもの）はS3へ保存し、日農担当者へメール通知した
うえで、保存ファイル名と通知宛先数のみを `application/json` で返却する。

| #   | 項目ID          | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                 |
| --- | ---------------- | ------- | -------- | ------------ | -------- | --------------------------------------------------------------------- |
| 1   | data             | Object  | -        |              | -        | 出力結果                                                             |
| 2   | →file_name       | String  | -        |              | -        | S3に保存したPDFの表示ファイル名（タイムスタンプ無し。4.4のロール別命名） |
| 3   | →recipient_count | Number  | -        |              | -        | 通知メールを送信した宛先数（`ReportNotificationService.notifyNichinoExport()` の戻り値。メール送信自体が失敗しても出力は成功扱いのため0になり得る） |

### PDFレイアウト（S3に保存される帳票の内部レイアウト。レスポンスボディの形式ではない）

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
  減部数はマイナス符号「▲」を付けて表示する（例：`▲2`。0 は「0」・顧客要件2026-07）。
  前回値との差異がある行（増減あり・販売店変更）には行頭に「◆」を付与する。
※ 改ページは**プレビューと同じ「1ページ＝1管理支店」単位**（既定 **28** 販売店行/ページ・
  `ZOUGEN_NICHINO_PER_PAGE`）。管理支店をコード昇順・行内を販売店コード昇順に並べ、各管理支店の
  行数が28行を超える場合のみ自グループ内で複数ページに続く。**1ページに複数の管理支店が
  同居することはない**（他の管理支店とは決して同じページに載らず、常にページ先頭から
  改ページする）。PDF の n ページ目 = プレビューの n ページ目。ページ数表記は管理支店ごとに
  「ページ数：group_page_no/group_total_pages」。

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

PDFはブラウザへ返さない。S3保存＋メール通知後、保存ファイル名と通知宛先数のみを返す。

```json
{
  "data": {
    "file_name": "増減通知_JA東京中央_1301002001_20260301.pdf",
    "recipient_count": 2
  }
}
```

## レスポンス失敗例

### 400 Validation Error（適用日未入力）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "tekiyo_date", "message": "必須項目です。" }]
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

※ 所属支店（`shiten_id`）が設定されたアカウントの場合は `ShitenRestrictedGuard` により
同じ `error_code: FORBIDDEN` / HTTP 403 だが `message` が
「所属支店が設定されたアカウントはこの機能を使用できません。」に変わる（エラー一覧の脚注参照）。

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
  "message": "システムエラーが発生しました。しばらくしてから再度お試しください。"
}
```

## 処理手順

> ※ 4.4 PDF生成・S3保存＋ダウンロード履歴登録 → 4.5 メール通知 → 4.7 操作ログ記録は、
> 共通の `FileArchiveService.archive()`（S3保存 + `t_file_download` 登録を1回で行う）→
> `ReportNotificationService.notifyNichinoExport()`（メール送信）→
> `AuditLogService.logExport()`（`t_log` 登録）を**この順に逐次実行**する。
> アーカイブと原子的に対で扱うべきDMLが無いため**単一トランザクションは組まない**
> （標準コネクションでそれぞれ個別にコミットする）。途中で例外が発生した場合、それより
> 前段の書き込み（例：S3保存・`t_file_download`登録・メール送信は成功したが`t_log`登録が
> 失敗）はロールバックされずに残る。メール送信失敗自体は non-fatal（警告ログのみ）で
> 出力処理を止めない。例外処理中のエラーログ（log_type=3）はトランザクション外で別途
> 記録する（4.9）。

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
- **制限②（顧客要件2026-07）**：`session.shiten_id` が設定されたアカウントは
  `ShitenRestrictedGuard` により HTTP 403 (`FORBIDDEN`)、メッセージ「所属支店が設定された
  アカウントはこの機能を使用できません。」（エラー一覧の脚注参照）。
- DataScope（`applyBranchScope` — ロールにより片方のみを付与する）:
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`（`kanri_shiten_id` 条件は付与しない）
  - `JA_KANRI_SHITEN`：`r.kanri_shiten_id = :user_kanri_shiten_id`（`ja_id` 条件は付与しない）
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- `ACSMS-API-029-001` の 4.3 〜 4.5 と同一の抽出条件・SQLでデータを取得する（クエリ①: `joho_henko_tekiyo_date = :tekiyo_date`、`zougen_hokoku_flg = true`、`torikeshi_flg = false`、論理削除済み購読者の除外（`t_dokusya.deleted_at IS NULL`）、`dokusya_shubetsu = 1`（紙版のみ）、`現在部数=0 AND 新部数=0` のレコード除外、DataScope適用。廃店(`haiten_flg`)による除外は行わない — 顧客要件 #57976／クエリ②: 動きの無い既存購読者の基礎行、4.3.1参照。顧客CR #59108）。OFFSET/LIMITは付与せず全件取得する。
- 取得件数が0件の場合：HTTP 200 + `application/json` `{ data: { reports: [] } }`（ファイルは生成しない。FE が ACSMS-MSG-029-002 を画面内表示）。

### 4.4 PDF生成・S3保存

- 取得レコードを管理支店ID単位でグループ化する（管理支店コード昇順）。
- **プレビューと同じ改ページ**（既定28販売店行/ページ・`ZOUGEN_NICHINO_PER_PAGE`。管理支店コード昇順→販売店
  コード昇順→dokusya_id 昇順）で**全管理支店を1つのPDF**にまとめて描画する。**1ページ＝1管理支店**
  が原則で、他の管理支店とは決して同じページに載らない（常にページ先頭から改ページ）。1管理支店の
  行数が28行を超える場合のみ、その管理支店内で複数ページに続く。各
  管理支店ブロックは明細テーブル＋合計行＋備考（PDFレイアウト参照）。
- 委託欄・免税（（免））・差異マーク（◆）の整形は `ACSMS-API-029-001` の 4.6 と同一とする（減部数は帳票上「▲{n}」表示。`formatGenBusu()`・顧客要件2026-07）。
- ヘッダにページ数（`Page: 現在ページ/全体ページ数`）、組合名（管理支店コードを3-4-3でハイフン区切り＋JA名＋管理支店名）、都道府県名、担当部署 ／ 担当者、TEL / FAX を表示する。
- 出力形式：PDF（A4）。pdfmake（document-definition → PDF）で生成する。
- 生成した1つのPDFをS3に保存する。保存先パス：`s3://{bucket}/reports/zougen-nichino/{ja_code}/{適用日の年YYYY}/`。
- **ファイル名（出力アカウントのロール別・顧客要件2026-07）**：
  - JA本店 / 中央会：`増減通知_{JA名}_{JAコード}_{適用日YYYYMMDD}.pdf`
  - JA管理支店：`増減通知_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}.pdf`（自管理支店のみのスコープなので対象データから確定）
  - `t_file_download.file_name`（＝ダウンロード表示名）は上記のタイムスタンプ無し名を保存する。S3オブジェクト名は再出力時の上書き防止のため別途14桁(JST)タイムスタンプを付与して一意化する（file_path）。
- **`scheduled_delete_date` は作成日(JST)から5年後の日付**を登録する（4.6 参照）。
- **`nichino_download_allowed_flg = true`**（日農担当者DL可）で登録する（4.6 参照）。

### 4.5 メール通知（顧客要件2026-07 レイアウト）

- 日農担当者（NICHINO_ADMIN / NICHINO_STAFF のメールアドレス）へ増減通知の作成完了を自動通知する（`ReportNotificationService.notifyNichinoExport` → `MailService.sendNotification`）。
- **システム名 `【クラウド版購読者管理システム】` は件名に含めず、本文の先頭行に置く**（顧客要件2026-07）。件名は `【都道府県】【発行アカウント】+ タイトル` のみ。
- 当社事務担当者が都道府県別に分かれているため、**件名に都道府県および出力したアカウント（ログインID＋アカウント名）を含める**：
  - 件名：`【{都道府県}】【{ログインID} {アカウント名}】増減通知（日本農業新聞）を出力しました`
  - 本文：`【クラウド版購読者管理システム】`（先頭行）/ `増減通知（日本農業新聞）を出力しました。` / `JA名：{ログインID} {アカウント名}` / `適用日：{YYYYMMDD}` / `ファイル名：{4.4のファイル名}` / `件数：{件数}件` / `ファイル管理画面からダウンロードできます。`
- `アカウント名` は session に含まれないため `m_account`（`account_id`）から取得する。都道府県は対象データ（管理支店）の `todofuken_name` を用いる（出力スコープは1JA/1中央会のため単一）。
- 個人情報（購読者の氏名・住所等）は含めないこと。
- メール送信失敗時もPDF出力自体は成功扱いとし、警告ログを記録する（fire-and-forget / non-fatal）。

### 4.6 ダウンロード履歴登録

- 生成した1つのPDFファイルについて、`FileArchiveService.archive()` が以下と同等の内容で
  `t_file_download` へ登録する（ORM経由。SQLは概念表示。全管理支店を1つのPDFにまとめて
  出力するため、このINSERTは出力1回につき1行のみ — 管理支店ごとには発生しない）。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            scheduled_delete_date, nichino_download_allowed_flg,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 4,
        :file_name, :file_path, :file_size,
        :record_count, NULL,
        (CURRENT_DATE + INTERVAL '5 years'), TRUE,
        NOW(), :user_account_id)
```

- `download_type`：4（増減通知書 ※m_code.code_category='DOWNLOAD_TYPE' を参照。`DownloadType.ZOUGEN_NICHINO`）
- `target_month`：**常に `NULL`**。本画面の出力呼び出しは `targetMonth` を指定しないため
  （`FileArchiveParams.targetMonth` 省略時は `null` がそのまま保存される）。適用日の年月を
  格納する仕様ではない。
- `record_count`：抽出した **`t_dokusya_rireki` の生行数**（全管理支店合計。`rows.length`）。
  当該管理支店だけの明細件数ではない（PDFは全管理支店をまとめた1ファイルのため、
  `t_file_download` 行も1つしか作られない）。同日に複数回変更のあった購読者は4.6
  （プレビューAPI）の集約処理で1件にマージされて出力されるが、この件数自体は集約前の
  行数であり、対象購読者数とは一致しないことがある。
- `file_name`：4.4 のロール別命名（タイムスタンプ無し）。`file_path` はタイムスタンプ付きS3キー。
- `scheduled_delete_date`：作成日(JST)から5年後（`FileArchiveService.scheduledDeleteDate()`。顧客要件2026-07）
- `nichino_download_allowed_flg`：`true`（日農担当者DL可・顧客要件2026-07。SCR-028増減連絡票（販売店）は逆に`false`）

### 4.7 操作ログ記録

- `AuditLogService.logExport()` が以下と同等の内容で `t_log` へ登録する（ORM経由。SQLは概念表示。4.6とは別トランザクション／別コネクションで逐次実行、4章冒頭の注記参照）。

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
  "file_name": "増減通知_JA○○_1301002001_20260301.pdf",
  "recipient_count": 2
}
```

### 4.8 レスポンス生成

- **PDFはレスポンスボディとして返却しない**（SCR-028 増減連絡票（販売店）とはここが異なる）。
  4.4 でS3に保存し、4.5 で日農担当者へメール通知した結果のみを `application/json` で返す。HTTP 200。
  ```json
  {
    "data": {
      "file_name": "増減通知_{JA名}_{JAコード}_{適用日YYYYMMDD}.pdf",
      "recipient_count": 2
    }
  }
  ```
- `file_name` は4.4のロール別命名（表示名。タイムスタンプ無し）。`recipient_count` は4.5で
  メール送信を試みた宛先数（`ReportNotificationService.notifyNichinoExport()` の戻り値。
  `ReportNotificationService` が未注入の場合や宛先ロールが0件の場合は `0`）。

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
