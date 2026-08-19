---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-028
screen_name: 増減連絡票（販売店）出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-01
created_date: 2026/06/01
created_by: Nguyen Truong An
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者           | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ---------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/01 | 1.0  | Nguyen Truong An | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/06/12 | 1.1  | Tran Duc Tuyen | 画面設計書との整合：住所変更テーブルの住所カラム組（変更前=zenkai_*, 変更後=haitatsu_*）を4.5に明記、システムエラーメッセージ（ACSMS-MSG-028-003）の句点を統一 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/07/14 | 1.2  | Tran Duc Tuyen | 顧客コメント対応：ファイル名をロール別命名（JA本店/中央会 と JA管理支店）に変更。表示名とS3キー(タイムスタンプ)を分離。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4 | 2026/08/05 | 1.3 | Tran Duc Tuyen | 顧客要件 2026-08：出力条件の「販売店」候補から**電子版ダミー販売店**（hanbaiten_code=9999999999）を除外。本帳票の集計対象は紙版のみでダミーに紐づく電子版読者は含まれず、選んでも結果は0件になるため。集計条件そのものは既に紙版限定で変更なし。 | | |
| 5 | 2026/08/14 | 1.4 | Tran Duc Tuyen | 顧客報告 #57976 の不具合修正：廃店(haiten_flg=true)を抽出SQLの行単位で除外していたため、販売店変更で転入先が廃店になった場合、転出元（営業中）側の減部報告まで消えていた。行の取得自体は廃店を問わず行い、報告のグルーピング処理で「廃店を宛先とする報告を作らない」判定に変更（4.3〜4.5）。 | | |
| 6 | 2026/08/16 | 1.5 | Tran Duc Tuyen | 実装コードとの整合監査による修正：①ページングモデルの記述を実態（購読者単位のSQL OFFSET/LIMIT）から**販売店＋管理支店の組み合わせ単位の独立ページング**（顧客要件2026-07・全件取得後にメモリ内で分割）へ全面訂正し、レスポンスに`group_count`/`group_page_no`/`group_total_pages`/`is_continued`を追記（4.4〜4.5）。②`address`/`delivery_name`/`phone`が`haitatsu_same_flg`（配達先情報指定）により購読者本人／配達先を切替えて出力される仕様を明記（4.5）。③抽出SQLに欠けていた`r.torikeshi_flg = false`・`r.dokusya_shubetsu = 1`・論理削除済み購読者除外（`t_dokusya.deleted_at IS NULL`、2026-08-12対応）を反映（4.4）。④DataScopeのWHERE適用を実装どおりロール別（JA_KANRI_SHITENは`kanri_shiten_id`のみ、CHUOKAI/JA_HONTENは`ja_id`のみ）に訂正（4.2〜4.4）。⑤出力APIの「4.5/4.6を単一トランザクションで実行」という記述を撤回（2026-07-01の共通化以降、S3保存・ダウンロード履歴登録・操作ログ記録はトランザクションを組まず順次実行される実装のため）。⑥S3キー例・PDF表示名例・`target_month`・`record_count`の説明を実装に合わせて訂正（4.4〜4.5）。 | | |
| 7 | 2026/08/17 | 1.6 | Tran Duc Tuyen | No.6の監査で未修整だった残存箇所を実装コードと突合して訂正：①ACSMS-API-028-001のリクエストパラメータ表の`page`/`per_page`説明が「購読者単位のSQL OFFSET/LIMIT」のまま取り残されていたのを、No.6で訂正済みのレスポンス側（グループ単位ページング）と整合するよう訂正。②4.4のSQL例に`now_shikuchoson`/`now_chome_banchi`/`now_tatemono_mei`（`CASE WHEN r.haitatsu_same_flg …`のSQL側解決列。`zougen-report.service.ts`の`ZOUGEN_SELECT`実装どおり）を追記し、4.5の現住所切替の説明がSQL側で解決済みである旨を明記。③ACSMS-API-028-002（出力）はプレビュー押下時刻`issued_at`をPDFフッタに使うが、リクエストパラメータ表とリクエスト例に記載が無かったため追加。④VALIDATION_ERROR/UNAUTHORIZED/FORBIDDENのレスポンス例JSONの末尾句点が`ErrorMessage`定数（`error-codes.constant.ts`）と不一致だったため統一。⑤4.5ダウンロード履歴登録のINSERT例に欠けていた`scheduled_delete_date`（作成日+5年。`FileArchiveService.scheduledDeleteDate()`。SCR-029と同仕様）を追加。⑥4.5のページ選択手順にページ範囲外（1未満／`total_pages`超過）のクランプ挙動を明記。 | | |
| 8 | 2026/08/18 | 1.7 | Tran Duc Tuyen | 顧客要件2026-08：販売店の統廃合（合併・閉店による読者の付け替え）で発生する部数変動を本帳票に出したくないため、抽出条件に**`r.hanbaiten_tohaigo_flg = false`**を追加（4.3・4.4のSQL例）。統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面・ACSMS-SCR-015）経由の変更は同フラグ=trueで記録されるため対象外となる。購読者情報登録画面（ACSMS-SCR-011）経由の変更はfalseのため引き続き対象。SCR-029 増減通知（日本農業新聞）は仕様変更なし。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「増減連絡票（販売店）出力画面（ACSMS-SCR-028）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

本画面は、指定した適用日に購読部数や配達先住所の変更があった購読者を抽出し、
販売店＋管理支店の組み合わせごとに「増部」「減部」「住所変更」の3区分でプレビュー表示、
および電子帳票（PDF）として出力する画面である。日農（NICHINO_ADMIN / NICHINO_STAFF）は
本機能を利用できず、JA系ロール（中央会・JA本店・JA管理支店）のみが利用可能である。

## 関連資料

| No  | 資料コード           | 資料名                                                                              |
| --- | -------------------- | ----------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-007 | Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 定義元: ACSMS-SCR-015    |
| 2   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024 |

※ 本画面の出力条件エリアの2つのチェックボックスは以下の共用APIを使用する（新規APIは作成しない）。

- **販売店チェックボックス**：`ACSMS-API-COMMON-007`（DataScope自動適用）を使用する。
  廃店（`haiten_flg = true`。電子版ダミー販売店を含む）は選択肢一覧から除外する
  （チェックボックス表示も廃店を除いた一覧とする）。
  抽出の正となるプレビュー／出力API（`ACSMS-API-028-001` / `ACSMS-API-028-002`）側では、
  廃店を**行単位でSQL除外しない**（顧客要件 #57976）。販売店変更で「転出元（旧店）→
  転入先（廃店）」となった場合に旧店側の減部報告まで消えてしまうため、行自体は常に
  取得したうえで、増減連絡票の分類処理（グルーピング）にて**店舗単位**で
  「廃店を**宛先**とする報告は作らない」判定を行う——旧店（営業中）には従来どおり
  減部が計上され、転入先の廃店には報告自体が生成されない。詳細は
  `ACSMS-API-028-001` §4.3・§4.4 を参照。
- **管理支店チェックボックス**：`ACSMS-API-COMMON-004`（カスケード絞込み）を呼び出しユーザーの `ja_id` で使用する。
  JA管理支店ロールが自管理支店分のみを対象とする制御は、プレビュー／出力API側のDataScope
  （`r.kanri_shiten_id = :user_kanri_shiten_id`）で**サーバ側で強制**する。

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
ACSMS-MSG-028-002「対象のデータが存在しません。」を表示する（トーストではない）。

※ ACSMS-MSG-028-001「この機能はJAアカウントのみ使用できます。」は、画面ルートガード（FE）で
NICHINO_ADMIN / NICHINO_STAFF をブロックする際に表示するメッセージである。API側は権限
`report.export_zougen_hanbaiten` 不所持のため `FORBIDDEN`（HTTP 403）を返す（多層防御）。

※ ACSMS-MSG-028-004「必須項目です。」は、適用日未入力時の `VALIDATION_ERROR`（`errors[].field = "tekiyo_date"`）として返却する。

---

# API ACSMS-API-028-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Zougen Hanbaiten Report Preview                                                                                                                                                                                                  |
| 概要                   | 指定した適用日・販売店・管理支店の条件で増減対象データを抽出し、販売店＋管理支店の組み合わせごとに「増部」「減部」「住所変更」の3区分でプレビューデータを取得する                                                                       |
| URI                    | /api/v1/report/zougen-hanbaiten/preview                                                                                                                                                                                              |
| メソッド               | GET                                                                                                                                                                                                                                  |
| リクエストボディー     | なし                                                                                                                                                                                                                                |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました（対象0件のときは reports:[]）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                  |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------- |
| 1   | tekiyo_date      | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。`t_dokusya_rireki.joho_henko_tekiyo_date` と一致するレコードを抽出。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-028-004） |
| 2   | hanbaiten_id     | Number | 〇       | -    |        |        | 販売店ID（繰り返し指定可：`hanbaiten_id=200&hanbaiten_id=201`）。未指定の場合は全販売店を対象とする |
| 3   | kanri_shiten_id  | Number | 〇       | -    |        |        | 管理支店ID（繰り返し指定可）。未指定の場合は全管理支店を対象とする                     |
| 4   | page             | Number | -        | -    |        |        | 文書ページ番号（1始まり）。未指定時は1。**グループ単位ページング**（顧客要件2026-07）：販売店＋管理支店の組み合わせ（combo）ごとに独立ページを割り当てた通し番号。SQL OFFSET/LIMITではない（詳細4.4〜4.5） |
| 5   | per_page         | Number | -        | -    |        |        | 1ページに詰める明細行数の上限（1〜500）。未指定時は15。「1ページの購読者数」ではない（詳細4.5）  |
| 6   | issued_at        | String | -        | -    |        |        | 発行日時（`YYYY/MM/DD HH:mm`）。**出力API（028-002）のみ**。プレビュー押下時刻をPDFフッタ右下に印字。形式不正は `VALIDATION_ERROR` |

## レスポンスデータ

| #   | 項目ID                  | タイプ | 繰り返し | フォーマット | Nullable | 説明                                                                       |
| --- | ----------------------- | ------ | -------- | ------------ | -------- | -------------------------------------------------------------------------- |
| 1   | data                    | Object | -        |              | -        | プレビュー結果                                                             |
| 2   | →tekiyo_date            | String | -        | YYYY-MM-DD   | -        | 適用日（リクエストのエコーバック）                                         |
| -   | →page_no                | Number | -        |              | -        | 現在の文書ページ番号。**グループ単位ページング**（顧客要件2026-07）：販売店＋管理支店の組み合わせ（combo）ごとに、その combo の明細行数を`per_page`で分割した独立ページ列を割り当てた通し番号。購読者単位のSQL OFFSET/LIMITではない（詳細4.5） |
| -   | →per_page               | Number | -        |              | -        | 1ページの明細行数の上限（既定15）。1つの combo 内で 増部→減部→住所変更 の順に`per_page`件ずつへ分割する際の上限であり、「1ページの購読者数」ではない |
| -   | →total_pages            | Number | -        |              | -        | 総文書ページ数（全 combo をそれぞれ分割した結果の合計ページ数）             |
| -   | →total_rows             | Number | -        |              | -        | 抽出条件に一致した対象購読者数（`COUNT(DISTINCT dokusya_id)`、全ページ合計）。画面の「全N件」表示にのみ使用し、ページングの単位ではない |
| -   | →is_last_page           | Boolean| -        |              | -        | 最終ページか（`page_no >= total_pages`）                                  |
| -   | →group_count            | Number | -        |              | -        | 絞り込み後に実際に出力される独立した販売店（hanbaiten_id）の総数            |
| -   | →group_page_no          | Number | -        |              | -        | 当該ページが属する**販売店単位**のページ番号（帳票ヘッダ「Page：n/N」表記に使用）。1販売店が複数の管理支店を持つ場合、管理支店をまたいで通し番号を振る（例：販売店A×管理支店a→1/2、販売店A×管理支店b→2/2） |
| -   | →group_total_pages      | Number | -        |              | -        | 当該販売店のページ総数（上記と対）                                        |
| 3   | →reports                | Array  | 〇       |              | -        | このページの帳票データ（配列要素は常に1件＝1 combo の1ページ分。販売店コード昇順・管理支店ID昇順） |
| 4   | →→hanbaiten_id          | Number | -        |              | -        | 販売店ID                                                                   |
| 5   | →→hanbaiten_code        | String | -        |              | -        | 販売店コード                                                               |
| 6   | →→hanbaiten_name        | String | -        |              | -        | 販売店名                                                                   |
| 7   | →→kanri_shiten_id       | Number | -        |              | 〇       | 管理支店ID                                                                 |
| 8   | →→kanri_shiten_name     | String | -        |              | 〇       | 管理支店名称                                                               |
| 9   | →→kanri_shiten_tel      | String | -        |              | 〇       | 管理支店電話番号（帳票TEL欄に表示）                                        |
| 10  | →→kanri_shiten_fax      | String | -        |              | 〇       | 管理支店FAX番号（帳票FAX欄に表示）                                         |
| -   | →→is_continued          | Boolean| -        |              | -        | この販売店の2ページ目以降（`group_page_no > 1`）か。true のとき帳票見出しに「（続き）」を付す |
| -   | →→group_page_no         | Number | -        |              | -        | data.group_page_no と同値（reports 要素にも複製される）                    |
| -   | →→group_total_pages     | Number | -        |              | -        | data.group_total_pages と同値（reports 要素にも複製される）                |
| 11  | →→zoubu                 | Array  | 〇       |              | -        | 増部一覧（同日累計後 net 増、または販売店変更の新店分）                     |
| 12  | →→→busu                 | String | -        | {前} → {後}  | -        | 部数（前回購読部数→購読部数）                                              |
| 13  | →→→address              | String | -        |              | -        | 現住所（`haitatsu_same_flg`＝配達先情報指定で切替。true：購読者本人の住所（都道府県名＋市町村郡＋丁目番地＋建物名）／false：配達先住所（`haitatsu_*`）） |
| 14  | →→→name                 | String | -        |              | -        | 新規氏名（氏名（姓）＋氏名（名）。`haitatsu_same_flg`によらず常に購読者本人） |
| 15  | →→→delivery_name        | String | -        |              | -        | 配達先読者名（`haitatsu_same_flg`で切替。true：購読者本人の氏名／false：配達先氏名（姓）＋配達先氏名（名）） |
| 16  | →→→phone                | String | -        |              | -        | 電話番号（`haitatsu_same_flg`で切替。true：購読者本人の連絡先1／false：配達先連絡先１） |
| 17  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |
| 18  | →→genbu                 | Array  | 〇       |              | -        | 減部一覧（同日累計後 net 減・解約、または販売店変更の旧店分）               |
| 19  | →→→busu                 | String | -        | {前} → {後}  | -        | 部数（前回購読部数→購読部数）                                              |
| 20  | →→→address              | String | -        |              | -        | 現住所（`address`と同じ`haitatsu_same_flg`切替ルール）                     |
| 21  | →→→name                 | String | -        |              | -        | 中止氏名（氏名（姓）＋氏名（名））                                         |
| 22  | →→→delivery_name        | String | -        |              | -        | 配達先読者名（`address`と同じ`haitatsu_same_flg`切替ルール）               |
| 23  | →→→phone                | String | -        |              | -        | 電話番号（`address`と同じ`haitatsu_same_flg`切替ルール）                   |
| 24  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |
| 25  | →→address_change        | Array  | 〇       |              | -        | 住所変更一覧（前回住所 ≠ 現住所、前回住所が空の初回は除く）。1購読者2行（変更前／変更後） |
| 26  | →→→label                | String | -        |              | -        | ラベル（`変更前` / `変更後`）                                              |
| 27  | →→→address              | String | -        |              | -        | 住所（変更前＝前回住所（`zenkai_*`。無ければ日初の現住所へフォールバック）、変更後＝現住所（`haitatsu_same_flg`切替ルールは`zoubu`/`genbu`と同じ）） |
| 28  | →→→name                 | String | -        |              | -        | 氏名（氏名（姓）＋氏名（名））                                             |
| 29  | →→→delivery_name        | String | -        |              | -        | 配達先読者名（`haitatsu_same_flg`切替ルールは`zoubu`/`genbu`と同じ）        |
| 30  | →→→phone                | String | -        |              | -        | 電話番号（`haitatsu_same_flg`切替ルールは`zoubu`/`genbu`と同じ）           |
| 31  | →→→biko                 | String | -        |              | -        | 備考（空欄は `""`）                                                        |

## リクエスト例

```
GET /api/v1/report/zougen-hanbaiten/preview?tekiyo_date=2026-05-01&hanbaiten_id=200&hanbaiten_id=201&kanri_shiten_id=20
```

## レスポンス成功例

```json
{
  "data": {
    "tekiyo_date": "2026-05-01",
    "reports": [
      {
        "hanbaiten_id": 200,
        "hanbaiten_code": "H001",
        "hanbaiten_name": "千代田販売店",
        "kanri_shiten_id": 20,
        "kanri_shiten_name": "JA東京中央 本店管理支店",
        "kanri_shiten_tel": "03-1234-5678",
        "kanri_shiten_fax": "03-1234-5679",
        "zoubu": [
          {
            "busu": "1 → 2",
            "address": "東京都千代田区神田1-1-1 神田ビル101",
            "name": "農業 太郎",
            "delivery_name": "農業 太郎",
            "phone": "03-1111-2222",
            "biko": ""
          }
        ],
        "genbu": [
          {
            "busu": "3 → 1",
            "address": "東京都千代田区丸の内2-2-2",
            "name": "新聞 次郎",
            "delivery_name": "新聞 次郎",
            "phone": "03-3333-4444",
            "biko": ""
          }
        ],
        "address_change": [
          {
            "label": "変更前",
            "address": "東京都中央区銀座3-3-3",
            "name": "購読 花子",
            "delivery_name": "購読 花子",
            "phone": "03-5555-6666",
            "biko": ""
          },
          {
            "label": "変更後",
            "address": "東京都港区赤坂4-4-4 赤坂タワー505",
            "name": "購読 花子",
            "delivery_name": "購読 花子",
            "phone": "03-5555-6666",
            "biko": ""
          }
        ]
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

### 200 OK（対象データなし）

対象0件は業務エラーではないため 200 を返す。FE は `reports.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-028-002「対象のデータが
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
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-028-004）。有効な日付形式（YYYY-MM-DD）
  - hanbaiten_id：数値型（繰り返し指定可）。未指定可
  - kanri_shiten_id：数値型（繰り返し指定可）。未指定可
  - page：整数・1以上。未指定可（既定1）
  - per_page：整数・1〜500。未指定可（既定15）
  - issued_at：`YYYY/MM/DD HH:mm` 形式。未指定可（本APIでは未使用。028-002の同名パラメータ参照）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。FE側ルートガードは ACSMS-MSG-028-001 を表示する。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`applyBranchScope()` — `@/common/utils/data-scope.ts`）：
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`（自中央会／自JA分のみ）
  - `JA_KANRI_SHITEN`：`r.kanri_shiten_id = :user_kanri_shiten_id`（自管理支店分のみ。`kanri_shiten_id`は特定のJAに一意に属するため`ja_id`条件は付与しない）
- DataScope違反（他JA・他管理支店のデータへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id）を取得する。
- 抽出条件を設定する：
  - `r.joho_henko_tekiyo_date = :tekiyo_date`（画面の適用日と一致。**`<=` ではない**：その日の変動のみを対象とする）
  - `r.zougen_hokoku_flg = true`（増減報告対象の変更）
  - `r.torikeshi_flg = false`（取消(赤伝)行を除外）
  - 論理削除済み購読者を除外する：`INNER JOIN t_dokusya d ON d.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL`
    （2026-08-12対応。`DokusyaService.remove()`のFKブロック対象（`RELATED_TABLES`）は`t_koza_furikae`のみで履歴の有無を見ないため、有効な現在行を持つ紙版購読者でも論理削除可能。削除後もその履歴行は「現在行」の条件を満たし続けるため、`t_dokusya.deleted_at`を明示的に確認しないと削除済み購読者が帳票に出力され続けてしまう）
  - **`r.dokusya_shubetsu = 1`（紙版のみ集計。顧客要件2026-08）**
    本帳票は販売店へ配達部数の増減を伝えるもので、電子版・併読には配達という概念が無い
    （電子版単独はダミー販売店に紐づく）。従来の「電子版は承認済(`denshi_shonin_status = 1`)
    のみ集計」条件は紙版限定に包含されるため廃止した。
    ※ SCR-029 増減通知（日本農業新聞）も同じく紙版限定（同条件を個別に持つ）。
  - **`r.hanbaiten_tohaigo_flg = false`（販売店統廃合フラグ=trueの行を除外。顧客要件2026-08）**
    統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面・ACSMS-SCR-015）経由の変更は
    販売店の統廃合（合併・閉店による読者の付け替え）に伴う付け替えであり、実際の増減として
    販売店へ通知したくないため、本帳票の集計対象から除外する。購読者情報登録画面
    （ACSMS-SCR-011）経由の変更は`hanbaiten_tohaigo_flg = false`のため対象のまま。
    列は`NOT NULL DEFAULT false`のため`IS NULL`考慮は不要。
    ※ SCR-029 増減通知（日本農業新聞）は仕様変更なし（本フラグの影響を受けず全件反映）。
  - 廃店（`haiten_flg = true`。電子版ダミー販売店を含む）を**行単位ではSQL除外しない**
    （顧客要件 #57976）。旧仕様（`h.haiten_flg = false` を INNER JOIN の ON 条件に
    含める）だと、販売店変更で「転出元（旧店・営業中）→転入先（廃店）」となった
    行が丸ごと除外され、旧店側の増減連絡票からも該当購読者の減部が消えるという
    不具合があった。廃店を**宛先**とする報告を作らないという制約は店舗単位の
    ルールであるため、行の取得自体は現販売店の営業状態を問わず行い、4.5の
    グルーピング処理で「報告の宛先となる店舗（現販売店／前回販売店）が廃店なら
    その店の報告だけを生成しない」判定を行う。そのため `h.haiten_flg` /
    `zh.haiten_flg`（前回販売店側）を SELECT で取得する（4.4 参照）。
  - hanbaiten_id 指定時：`EXISTS (dokusya_id, joho_henko_tekiyo_date が同じ行の中に、
    現販売店 OR 前回販売店 が一致するものがあるか)`（顧客要件2026-08改訂）
    行単位で `r.hanbaiten_id = ANY(...) OR r.zenkai_hanbaiten_id = ANY(...)` を直接
    判定すると、同一購読者の同日複数履歴のうち一部の行だけが条件に一致し、
    残りが取得漏れになる（4.5 の日初/日末集約 rmin/rmax が不完全な行集合で
    計算され、選ぶ販売店によって集計結果が食い違うバグの原因だった）。EXISTS で
    (dokusya_id, joho) 単位に「一致する行が同日のどこかにあるか」を判定し、
    一致すればその dokusya_id・その日の全履歴行を取得する。
  - kanri_shiten_id 指定時：`r.kanri_shiten_id = ANY(:kanri_shiten_ids)`
  - DataScope条件（4.2 参照）を追加する。
  - 並び順は **`r.dokusya_id`, `r.rireki_no` 昇順**（同一購読者の同日複数履歴を累計するため。帳票の販売店コード順はレスポンス生成側で再整列）。

### 4.4 データ取得

```sql
SELECT r.dokusya_rireki_id, r.dokusya_id,
       r.hanbaiten_id, h.hanbaiten_code, h.hanbaiten_name,
       h.haiten_flg,                        -- #57976: 現販売店の廃店判定（宛先報告の抑止に使用）
       /* 前回販売店（販売店変更の旧店表示・1減/1増判定用。初回履歴は NULL） */
       r.zenkai_hanbaiten_id,
       zh.hanbaiten_code AS zenkai_hanbaiten_code,
       zh.hanbaiten_name AS zenkai_hanbaiten_name,
       zh.haiten_flg AS zenkai_haiten_flg,  -- #57976: 前回販売店の廃店判定
       r.kanri_shiten_id, ks.kanri_shiten_code,
       ks.kanri_shiten_name, ks.tel AS kanri_shiten_tel, ks.fax AS kanri_shiten_fax,
       r.dokusya_busu, r.zenkai_dokusya_busu,
       r.dokusya_shubetsu,                  -- 紙版限定のため常に 1（住所変更の電子版除外は無効化済み）
       r.shimei_sei, r.shimei_mei,
       r.haitatsu_shimei_sei, r.haitatsu_shimei_mei,
       /* 電話番号: haitatsu_same_flg（配達先情報指定=TRUE:購読者と同じ）で切替 */
       r.renrakusaki_1, r.haitatsu_renrakusaki_1,
       r.haitatsu_same_flg,
       /* 購読者本人の住所（生。haitatsu_same_flg=true のとき現住所として採用） */
       r.yubin_no, r.todofuken_code, r.shikuchoson, r.chome_banchi, r.tatemono_mei,
       /* 配達先住所（生。haitatsu_same_flg=false のとき現住所として採用） */
       r.haitatsu_yubin_no, r.haitatsu_todofuken_code,
       r.haitatsu_shikuchoson, r.haitatsu_chome_banchi, r.haitatsu_tatemono_mei,
       /* 現住所: haitatsu_same_flg=true→購読者住所(shikuchoson等)、false→配達先住所(haitatsu_*)を
          SQL側のCASE WHENで解決し now_* 列として渡す（アプリ層では切替えない）。 */
       td_now.todofuken_name AS now_todofuken_name,
       CASE WHEN r.haitatsu_same_flg THEN r.shikuchoson ELSE r.haitatsu_shikuchoson END AS now_shikuchoson,
       CASE WHEN r.haitatsu_same_flg THEN r.chome_banchi ELSE r.haitatsu_chome_banchi END AS now_chome_banchi,
       CASE WHEN r.haitatsu_same_flg THEN r.tatemono_mei ELSE r.haitatsu_tatemono_mei END AS now_tatemono_mei,
       /* 前回住所（生。住所変更判定・変更前表示用） */
       r.zenkai_yubin_no, r.zenkai_todofuken_code,
       td_zen.todofuken_name AS zen_todofuken_name,
       r.zenkai_shikuchoson, r.zenkai_chome_banchi, r.zenkai_tatemono_mei,
       r.biko
FROM t_dokusya_rireki r
/* 論理削除済み購読者を除外（2026-08-12対応。4.3 参照） */
INNER JOIN t_dokusya d
        ON d.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL
/* #57976: haiten_flg は行単位の除外条件に含めない（4.3 参照） */
INNER JOIN m_hanbaiten h
        ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
/* 前回販売店（初回履歴は NULL のため LEFT JOIN） */
LEFT JOIN m_hanbaiten zh
        ON zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
        ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
/* 現住所の都道府県: haitatsu_same_flg=true→購読者本人の todofuken_code、false→配達先の todofuken_code */
LEFT JOIN m_todofuken td_now
        ON td_now.todofuken_code = CASE WHEN r.haitatsu_same_flg
                                         THEN r.todofuken_code ELSE r.haitatsu_todofuken_code END
LEFT JOIN m_todofuken td_zen
        ON td_zen.todofuken_code = r.zenkai_todofuken_code
WHERE r.joho_henko_tekiyo_date = :tekiyo_date
  AND r.zougen_hokoku_flg = true
  AND r.torikeshi_flg = false
  /* 集計対象は紙版のみ（顧客要件2026-08。電子版・併読は配達という概念が無いため対象外） */
  AND r.dokusya_shubetsu = 1
  /* 販売店統廃合フラグ=trueの行は除外（顧客要件2026-08。統廃合販売店読者移行画面
     経由の変更は実際の増減として販売店へ通知しない） */
  AND r.hanbaiten_tohaigo_flg = false
  /* 販売店フィルタ（任意）：(dokusya_id, joho) 単位で現販売店 OR 前回販売店の
     いずれかが一致する行が同日に存在すれば、その dokusya_id の同日全行を取得する
     （顧客要件2026-08改訂 — 行単位判定だと同日複数履歴の一部が欠落するため） */
  AND (:hanbaiten_ids IS NULL
       OR EXISTS (
            SELECT 1 FROM t_dokusya_rireki r2
             WHERE r2.dokusya_id = r.dokusya_id
               AND r2.joho_henko_tekiyo_date = r.joho_henko_tekiyo_date
               AND r2.torikeshi_flg = false
               AND (r2.hanbaiten_id = ANY(:hanbaiten_ids)
                    OR r2.zenkai_hanbaiten_id = ANY(:hanbaiten_ids))
          ))
  /* 管理支店フィルタ（任意） */
  AND (:kanri_shiten_ids IS NULL OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* DataScope（applyBranchScope）: ロールにより排他的に適用（4.2 参照）。
     CHUOKAI / JA_HONTEN のときのみ ja_id 条件、JA_KANRI_SHITEN のときのみ
     kanri_shiten_id 条件（両方が同時に付くことはない）。NICHINO_* は無条件（DataScope無し）。 */
  AND r.ja_id = :user_ja_id                                     -- CHUOKAI / JA_HONTEN のみ
  AND r.kanri_shiten_id = :user_kanri_shiten_id                 -- JA_KANRI_SHITEN のみ
/* 同一購読者の同日履歴を累計するため dokusya_id, rireki_no 昇順 */
ORDER BY r.dokusya_id ASC, r.rireki_no ASC
```

- 取得件数が0件の場合：HTTP 200 + `reports:[]`（FE が ACSMS-MSG-028-002「対象のデータが存在しません。」を画面内表示）
- 本SQLは**全件取得**する（OFFSET/LIMITを付与しない）。ページングはこの後、4.5 のとおりメモリ内で行う（購読者単位のSQLページングではない）。

### 4.5 レスポンス生成

- **同一購読者（`dokusya_id`）の同日複数履歴を累計する**：その日に複数回変更がある場合
  （例 1→3→5）は2件ではなく **1件**に集約する。
  - **日初の状態** = その日の最小 `rireki_no` レコードの前回値
    （前回部数 `busuBefore` / 前回販売店 `storeBefore` / 前回住所）。
  - **日末の状態** = その日の最大 `rireki_no` レコードの現在値
    （現部数 `busuAfter` / 現販売店 `storeAfter` / 現住所 ＋ 表示用の氏名等）。
  - 例：1→3→5 は **1→5** の1件、解約 …→0 は減として反映。
- 集約結果を 販売店ID＋管理支店ID の組み合わせでグループ化する（`reports` 配列。販売店コード昇順）。
- 各購読者を以下で各区分に振り分ける：
  - **販売店変更**（`storeBefore` ≠ `storeAfter`）：
    - 旧販売店（`zenkai_hanbaiten_id`）の `genbu` に **減 `busuBefore`**（`"{busuBefore} → 0"`）
    - 新販売店（`hanbaiten_id`）の `zoubu` に **増 `busuAfter`**（`"0 → {busuAfter}"`）
    - （前回販売店と販売店を比較し、変わっていれば1減/1増で反映する仕様。
      旧店の管理支店は履歴に保持されないため、暫定的に当日最終レコードの管理支店を用いる。）
  - **同一販売店**：net = `busuAfter − busuBefore`
    - net > 0 → **増部**（`zoubu`）、net < 0 → **減部**（`genbu`）、net = 0 → 出力なし
  - **住所変更**（`address_change`）：日初の前回住所（`zen_*`）と日末の現住所（`haitatsu_*`）が
    異なる場合。1購読者につき `変更前` / `変更後` の2行を生成する。
- **廃店（`haiten_flg = true`）は「宛先」となる報告を作らない（顧客要件 #57976）**：
  上記の各振り分けで報告の宛先となる店舗（`storeBefore` の `genbu` / `storeAfter` の
  `zoubu` ・ 同一販売店の `zoubu`・`genbu` ・ `address_change`）ごとに、その店舗の
  `haiten_flg` を判定し、`true` であればその店舗宛の報告だけを生成しない。
  販売店変更で「転出元（旧店・営業中）→転入先（廃店）」となった場合は、
  旧店には従来どおり **減 `busuBefore`** が計上され（`reports` に旧店の
  グループが現れる）、廃店である転入先には報告そのものが生成されない
  （`reports` にそのグループは現れない）。逆に「転出元（廃店）→転入先（営業中）」
  でも同様に、廃店側の減部は作られず、営業中の転入先の増部のみ計上される。
    **前回住所が空（初回履歴）の場合は出力しない**（新規購読者を住所変更に出さない）。
- **販売店フィルタ（`hanbaiten_id`）指定時、出力を選択した販売店のグループだけに絞る**
  （顧客要件2026-08改訂）。上記の集約（rmin/rmax）自体は 4.4 の EXISTS 判定で取得した
  同日の全履歴を使って必ず正しく行うが、`reports` 配列は `hanbaiten_id ∈ 選択値` の
  グループのみを残す。販売店変更で対になる旧店（`genbu`）・新店（`zoubu`）のうち、
  選択していない側は出力しない —「72を選んだら72だけ、73を選んだら73だけ」。
  未指定時（全店対象）は両方とも出力する。
- 各行の整形：
  - 部数（`busu`）：`"{busuBefore} → {busuAfter}"`（販売店変更時は旧店 `"{busuBefore} → 0"` / 新店 `"0 → {busuAfter}"`）
  - **現住所（増部/減部の `address`、住所変更「変更後」の `address`）は `haitatsu_same_flg`
    （配達先情報指定＝TRUE:購読者と同じ）で参照カラムを切替える。切替自体は 4.4 の SQL側
    （`CASE WHEN r.haitatsu_same_flg THEN … ELSE … END`）で解決済みの `now_shikuchoson` /
    `now_chome_banchi` / `now_tatemono_mei` / `now_todofuken_name` を、マッパーはそのまま
    連結するだけである（アプリ層で `shikuchoson` と `haitatsu_shikuchoson` を都度出し分けて
    いるわけではない）**：
    - `haitatsu_same_flg = true`：購読者本人の住所＝`td_now.todofuken_name` ＋ `shikuchoson` ＋
      `chome_banchi` ＋ `tatemono_mei` を SQL で `now_*` へ採用
    - `haitatsu_same_flg = false`：配達先住所＝`td_now.todofuken_name` ＋ `haitatsu_shikuchoson`
      ＋ `haitatsu_chome_banchi` ＋ `haitatsu_tatemono_mei` を SQL で `now_*` へ採用
    - いずれも `{都道府県名}{市町村郡}{丁目番地}` を連結し、建物名が空でなければ半角スペース区切りで付加する。
  - **住所変更「変更前」**：前回住所＝日初レコードの `zenkai_*` があればそれ
    （`td_zen.todofuken_name` ＋ `zenkai_shikuchoson` ＋ `zenkai_chome_banchi` ＋ `zenkai_tatemono_mei`）、
    無ければ（新規購読者等）日初レコードの現住所文字列へフォールバックする。
  - 氏名（`name`）：`{shimei_sei} {shimei_mei}`（`haitatsu_same_flg` によらず常に購読者本人）
  - **配達先読者名（`delivery_name`）/ 電話番号（`phone`）も `haitatsu_same_flg` で切替える**：
    - `true`：購読者本人＝`delivery_name` は `{shimei_sei} {shimei_mei}`、`phone` は `renrakusaki_1`
    - `false`：配達先＝`delivery_name` は `{haitatsu_shimei_sei} {haitatsu_shimei_mei}`、`phone` は `haitatsu_renrakusaki_1`
  - TEL / FAX は管理支店（`m_kanri_shiten.tel` / `fax`）の情報を返す。
- **ページ送り（グループ単位ページング。顧客要件2026-07・SCR-026/029と同方針）**：
  - 4.4 のSQLは**OFFSET/LIMITを付与せず全件取得**する（購読者単位のSQLページングでは
    ない）。ページングは取得後、BEがメモリ内で以下の手順により行う：
    1. 上記の集約・振り分け処理で、販売店＋管理支店の組み合わせ（**combo**）ごとに1件の
       帳票データ（`zoubu` / `genbu` / `address_change`）を作る（販売店コード昇順・管理支店ID昇順）。
    2. 各 combo を、明細行数（`zoubu.length + genbu.length + address_change.length`）が
       `per_page`（既定15）を超える場合のみ、増部→減部→住所変更の順で `per_page` 件ずつの
       複数ページへ分割する（超えない場合は1ページ）。住所変更は「変更前/変更後」の2行1組
       のため、ページ境界では組を分断せず次ページへ送る。
    3. combo を **販売店（`hanbaiten_id`）単位でグループ化**し、同一販売店に属する combo
       （複数の管理支店にまたがる場合を含む）のページを連結して、販売店内の通し番号
       （`group_page_no` / `group_total_pages`）を採番する（例：販売店A×管理支店a→1/2、
       販売店A×管理支店b→2/2）。
    4. 全 combo のページを**販売店の並び順**に連結したものが文書全体のページ列であり、
       その中の1ページ＝`page_no`。この列の長さが `total_pages`。1ページの `reports`
       配列には常に1件（1 combo の1ページ分）のみが入る。
    5. `page`（リクエストの `page`）でこの列から該当ページを1件選び出して返す。範囲外
       （1未満、または `total_pages` 超過）は `Math.min(Math.max(page, 1), total_pages)`
       で1〜`total_pages`にクランプする（HTTP 400にはしない）。
  - `per_page` は「1ページの購読者数」ではなく「1 combo 内で1ページに詰める明細行数の
    上限」である（大半の購読者は1明細行だが、販売店変更や部数+住所変更が同時発生すると
    1購読者が複数明細行になり得る）。
  - `total_rows`＝`COUNT(DISTINCT dokusya_id)`（全体の対象購読者数）は上記のページング
    単位とは無関係で、画面の「全N件」表示にのみ用いる。
  - `group_count`＝絞り込み後に実際に出力される販売店（`hanbaiten_id`）の総数。
  - `is_continued`：当該 combo が販売店内の2ページ目以降（`group_page_no > 1`）のとき
    `true`。帳票見出しに「（続き）」を付す。
  - export PDF も**プレビューと同じ関数（`paginateZougenSubscribers`）を共有**するため、
    改ページ構成は必ず一致する（§4.4 / API-028-002 参照）。1 combo のページ＝PDF1ページ
    として `pageBreak: 'before'` で区切る。PDF の n ページ目 = プレビューの n ページ目。
    帳票ヘッダの「Page：n/N」は `group_page_no` / `group_total_pages`（販売店単位の通し
    番号）を印字する。
  - **発行日時**：出力APIが受け取った `issued_at`（`YYYY/MM/DD HH:mm`）を、全ページの
    フッタ**右寄せ**に「発行日時：{issued_at}」として印字する（pdfmake の `footer`）。
    `issued_at` 未指定時はフッタを出さない（FEは常にプレビュー押下時刻を送る）。
- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- 本APIは参照のみのため操作ログ（t_log）への記録は行わない。

---

# API ACSMS-API-028-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Zougen Hanbaiten Report (PDF)                                                                                                                                                                                                                                |
| 概要                   | プレビューと同一条件で増減対象データを抽出し、販売店＋管理支店の組み合わせごとに1枚（増部／減部／住所変更）の電子帳票PDFを生成してS3に保存し、ダウンロードを返却する                                                                                                  |
| URI                    | /api/v1/report/zougen-hanbaiten/export                                                                                                                                                                                                                              |
| メソッド               | POST                                                                                                                                                                                                                                                                |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                |
| リクエストパラメーター |                                                                                                                                                                                                                                                                    |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に電子帳票を出力しました（対象0件のときは application/json で `{ data: { reports: [] } }`）, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID   | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                  |
| --- | ---------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------- |
| 1   | tekiyo_date      | String | -        | 〇   |        |        | 適用日（YYYY-MM-DD）。未入力時は `VALIDATION_ERROR`（ACSMS-MSG-028-004）               |
| 2   | hanbaiten_id     | Number | 〇       | -    |        |        | 販売店ID（配列）。未指定の場合は全販売店を対象とする                                   |
| 3   | kanri_shiten_id  | Number | 〇       | -    |        |        | 管理支店ID（配列）。未指定の場合は全管理支店を対象とする                               |
| 4   | issued_at        | String | -        | -    |        |        | 発行日時（`YYYY/MM/DD HH:mm`）。プレビュー押下時刻をPDFフッタ右下に「発行日時：{issued_at}」として印字する（4.4参照）。未指定時はフッタを出さない。形式不正は `VALIDATION_ERROR` |

## レスポンスデータ

PDFファイル（`Content-Type: application/pdf`）

### レスポンスヘッダ

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="zougen_hanbaiten_YYYYMMDD.pdf"
```

※ ファイル名は出力アカウントのロール別（顧客要件2026-07）。適用日は `YYYYMMDD`。
  - JA本店 / 中央会：`増減連絡票_{JA名}_{JAコード}_{適用日YYYYMMDD}.pdf`
  - JA管理支店：`増減連絡票_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}.pdf`
  （中央会は複数管理支店にまたがるため管理支店を含めない。JA管理支店は自管理支店のみのスコープなので対象データから確定）
  `Content-Disposition` の `filename` には ASCII 別名（`zougen_hanbaiten_20260501.pdf`）、
  `filename*`（RFC 5987）には上記の日本語名を設定する。`t_file_download.file_name`（ファイル管理画面の表示名）も上記のタイムスタンプ無し名を保存し、S3オブジェクト名のみ14桁(JST)タイムスタンプを付与して一意化する。

### PDFレイアウト

| 区分        | 表示内容                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| ヘッダ      | 販売店名 / 管理支店名 / TEL / FAX（管理支店情報）/ ページ数（`Page：group_page_no/group_total_pages`）|
| 増部テーブル | 部数（前→後）/ 住所 / 新規氏名 / 配達先読者名 / 電話番号 / 備考                 |
| 減部テーブル | 部数（前→後）/ 住所 / 中止氏名 / 配達先読者名 / 電話番号 / 備考                 |
| 住所変更    | ラベル（変更前/変更後）/ 住所 / 氏名 / 配達先読者名 / 電話番号 / 備考（1購読者2行）|

※ 表示順序：①増部を表示 → ②減部を表示 → ③住所変更を表示。いずれかの区分が0件の場合も
  タイトルと空白行1行を表示する（区分自体は省略しない）。
※ 改ページは**プレビューと同一のグループ単位ページング**（顧客要件2026-07。ACSMS-API-028-001
  §4.5 参照）：1ページ＝販売店＋管理支店の組み合わせ（combo）1件分。1ページに複数販売店が
  混在することはない。combo の明細行数が `per_page`（既定15）を超える場合のみ自 combo 内で
  複数ページに続く。ページ先頭（2ページ目以降）で必ず改ページする。ヘッダの Page表記
  「`group_page_no`/`group_total_pages`」は**販売店単位**の通し番号（管理支店をまたいで採番）。
  PDF の n ページ目 = プレビューの n ページ目。

## リクエスト例

```json
POST /api/v1/report/zougen-hanbaiten/export
Content-Type: application/json

{
  "tekiyo_date": "2026-05-01",
  "hanbaiten_id": [200, 201],
  "kanri_shiten_id": [20],
  "issued_at": "2026/06/25 10:58"
}
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/pdf
# filename* はロール別の日本語名（例は JA本店: 増減連絡票_{JA名}_{JAコード}_20260501.pdf）を URL エンコードして設定する。
Content-Disposition: attachment; filename="zougen_hanbaiten_20260501.pdf"; filename*=UTF-8''<URLエンコードした日本語ファイル名>

（PDFバイナリ）
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

### 200 OK（対象データなし）

対象0件は業務エラーではないため 200 を返す。FE は `reports.length === 0`（出力は
レスポンスが application/json）を検出して画面内に ACSMS-MSG-028-002「対象のデータが
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

> ※ 4.4 PDF生成・S3保存 → 4.5 ダウンロード履歴登録 → 4.6 操作ログ記録は、共通の
> `FileArchiveService.archive()`（S3保存 + `t_file_download` 登録）→
> `AuditLogService.logExport()`（`t_log` 登録）を**この順に逐次実行**する。
> アーカイブと原子的に対で扱うべきDMLが無いため**単一トランザクションは組まない**
> （標準コネクションでそれぞれ個別にコミットする）。途中で例外が発生した場合、
> それより前段の書き込み（例：S3保存・`t_file_download`登録は成功したが`t_log`登録が
> 失敗）はロールバックされずに残る。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する（4.8）。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - tekiyo_date：必須チェック（未入力時は HTTP 400 `VALIDATION_ERROR`、`errors[].field = "tekiyo_date"`、メッセージ「必須項目です。」＝ACSMS-MSG-028-004）。有効な日付形式（YYYY-MM-DD）
  - hanbaiten_id：数値配列。未指定可
  - kanri_shiten_id：数値配列。未指定可
  - issued_at：`YYYY/MM/DD HH:mm` 形式。未指定可（未指定時はPDFフッタの発行日時を出さない）
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_zougen_hanbaiten`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
  - ※ NICHINO_ADMIN / NICHINO_STAFF は本権限を保持しないため HTTP 403 (`FORBIDDEN`)。
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope（`applyBranchScope()`。ACSMS-API-028-001 §4.2 と同一）:
  - `CHUOKAI` / `JA_HONTEN`：`r.ja_id = :user_ja_id`
  - `JA_KANRI_SHITEN`：`r.kanri_shiten_id = :user_kanri_shiten_id`（`ja_id`条件は付与しない。`kanri_shiten_id`が特定のJAに一意に属するため）
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得

- `ACSMS-API-028-001` の 4.3 / 4.4 と同一の抽出条件・SQLでデータを取得する（`joho_henko_tekiyo_date = :tekiyo_date`、`zougen_hokoku_flg = true`、`torikeshi_flg = false`、`dokusya_shubetsu = 1`（紙版限定）、`hanbaiten_tohaigo_flg = false`（販売店統廃合フラグ除外・顧客要件2026-08）、論理削除済み購読者の除外（`t_dokusya.deleted_at IS NULL`）、DataScope適用。廃店は行単位で除外せず、4.5と同じグルーピング処理で店舗単位に抑止する）。OFFSET/LIMITは付与せず全件取得する。
- 取得件数が0件の場合：HTTP 200 + `application/json` `{ data: { reports: [] } }`（ファイルは生成しない。FE が ACSMS-MSG-028-002 を画面内表示）。

### 4.4 PDF生成・S3保存

- 取得レコードを ACSMS-API-028-001 §4.5 と同一のロジック（`groupZougenReports`）で
  販売店ID＋管理支店ID の組み合わせ（combo）ごとにグループ化する（販売店コード昇順・管理支店ID昇順）。
- 各組み合わせを1枚として、増部／減部／住所変更の3テーブルを描画する（PDFレイアウト参照）。改ページ・ページ採番はプレビュー（§4.5）と同じ `paginateZougenSubscribers` を用い、combo が `per_page`（既定15）件を超える場合のみ自 combo 内で複数ページに続く。
- ヘッダにページ数（`Page：group_page_no/group_total_pages` — 販売店単位の通し番号）、管理支店のTEL / FAXを表示する。
- 出力形式：PDF（A4）。**pdfmake**（`TDocumentDefinitions`。日本語フォント IPAexGothic 埋め込み）でサーバ側描画する。Handlebars／HTML／Puppeteerは使用しない。
- 生成したPDFを共通の `FileArchiveService.archive()` 経由でS3に保存する
  （キー：`reports/zougen-hanbaiten/{ja_code}/{適用日の年YYYY}/{baseName}_{JSTタイムスタンプ14桁}.pdf`。
  `ja_code` はJAコード、`baseName` は下記のロール別表示名から拡張子を除いたもの）。
- ファイル名（表示名）：ロール別（顧客要件2026-07）。「レスポンスヘッダ」節を参照：
  - JA本店 / 中央会：`増減連絡票_{JA名}_{JAコード}_{適用日YYYYMMDD}.pdf`
  - JA管理支店：`増減連絡票_{JA名}_{JAコード}_{管理支店名}_{管理支店コード}_{適用日YYYYMMDD}.pdf`

### 4.5 ダウンロード履歴登録

- `FileArchiveService.archive()` が以下と同等の内容で `t_file_download` へ登録する（ORM経由。SQLは概念表示）。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            scheduled_delete_date, nichino_download_allowed_flg,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 3,
        :file_name, :file_path, :file_size,
        :record_count, NULL,
        (CURRENT_DATE + INTERVAL '5 years'), false,
        NOW(), :user_account_id)
```

- `download_type`：3（増減連絡票 ※m_code.code_category='DOWNLOAD_TYPE' を参照。`DownloadType.ZOUGEN`）
- `target_month`：**常に `NULL`**。本画面の出力呼び出しは `targetMonth` を指定しないため（`FileArchiveParams.targetMonth` 省略時は `null` がそのまま保存される）。適用日の年月を格納する仕様ではない。
- `record_count`：抽出した **`t_dokusya_rireki` の生行数**（`rows.length`）。同日に複数回変更のあった購読者は4.5（プレビューAPI）の集約処理で1件にマージされて出力されるが、この件数自体は集約前の行数であり、対象**購読者数**（`total_rows`）とは一致しないことがある。
- `scheduled_delete_date`：作成日(JST)から5年後（`FileArchiveService.scheduledDeleteDate()`。SCR-029と共通仕様）。
- `nichino_download_allowed_flg`：`false`（増減連絡票（販売店）は日農担当者からのダウンロード対象外。増減通知（日本農業新聞・SCR-029）とは異なる）。

### 4.6 操作ログ記録

- `AuditLogService.logExport()` が以下と同等の内容で `t_log` へ登録する（ORM経由。SQLは概念表示。4.5とは別トランザクション／別コネクションで逐次実行、4章冒頭の注記参照）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'EXPORT_PDF', 1,
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
  "tekiyo_date": "2026-05-01",
  "hanbaiten_id": [200, 201],
  "kanri_shiten_id": [20],
  "report_count": 1,
  "record_count": 3,
  "file_name": "増減連絡票_東京JA_1301002001_20260501.pdf"
}
```

`file_name` はロール別命名（4.4 参照）。`record_count` は抽出した `t_dokusya_rireki` の生行数（`rows.length`）。`report_count` は分類・販売店フィルタ適用後に実際に出力される帳票（combo）数（`reports.length`）。

### 4.7 レスポンス生成

- 生成したPDFファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="zougen_hanbaiten_YYYYMMDD.pdf"; filename*=UTF-8''{URLエンコードした日本語ファイル名}`

### 4.8 例外処理

- DB接続エラー・PDF生成エラー・S3保存エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '増減連絡票（販売店）出力画面 (ACSMS-SCR-028)', 'EXPORT_PDF', 2,
        NULL, 't_file_download',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```
