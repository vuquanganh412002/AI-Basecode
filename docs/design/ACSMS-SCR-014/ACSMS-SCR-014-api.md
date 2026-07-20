---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-014
screen_name: 購読者明細検索画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-30
created_date: 2026/05/22
created_by: Nguyen Duyen Manh
updated_date: 2026/05/30
updated_by: Nguyen Duyen Manh
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者            | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | ----------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/22 | 1.0  | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/30 | 1.1  | Nguyen Duyen Manh | 画面設計書 v1.2 / 画面イメージ v1.2 同期：<br>1. リクエストパラメータ：`bank_branch_code` / `bank_branch_name` を `jastem_toriatsukai_tenpo_code` / `jastem_tenpo_name` にリネーム（物理カラム `bank_branch_code` / `bank_branch_name` は不変）<br>2. 期間検索化：`shoki_dokusya_kaishi_date` / `dokusya_chushi_date` / `joho_henko_tekiyo_date` を `_from` / `_to` ペアに分割（相関チェック：from ≦ to）<br>3. 機能定義 2.2 と整合：手続種類・購読種別・電子版承認ステータスを常時表示エリアに配置（API には影響なし、備考のみ更新）<br>4. Excel 出力カラムを画面検索結果テーブル（24-35）に合わせて 12 列に圧縮（かな氏名・購読種別・支払方法を除外） | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/06/16 | 1.2  | Tran Duc Tuyen | 顧客要件 2026-06 反映：<br>1. 検索条件の部分一致対象を拡張：`full_name`＝購読者氏名＋配達先氏名（shimei_sei/mei・haitatsu_shimei_sei/mei）、`full_name_kana`＝同かな4項目、`haitatsu`＝配達先住所4項目＋購読者住所4項目（todofuken_code/shikuchoson/chome_banchi/tatemono_mei）、`renrakusaki_1`＝連絡先１＋配達先連絡先１<br>2. レスポンス／検索結果テーブルに `tetsuzuki_shurui`（手続種類）と `haitatsu_full_name`（配達先氏名）を追加。一覧から 支店・連絡先２ 列を削除し、手続種類・購読種別を購読者名の後、配達先氏名を連絡先１の後、支払方法を販売店名の後に配置<br>3. Excel 出力を上記の新一覧（14 列）に合わせて変更。手続種類・購読種別・支払方法は m_code ラベルを出力 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/07/16 | 1.3  | Tran Duc Tuyen | 顧客要件 2026-07 反映：<br>1. ACSMS-API-014-004（Stop Dokusya＝購読停止・解約予約）を追加。一覧の「購読を停止する」ボタン専用。購読中止日だけを送り Phase 1 の解約予約行を1件挿入する（`POST /api/v1/dokusya/{dokusya_id}/stop`、権限 `dokusya.update`）。<br>2. 紙版はカレンダーで中止日を選択（購読開始日以降・未来日・最終変更適用日より後）。電子版は終了月を選び月末日で停止（当月以降・請求開始月以降。請求開始月未設定なら停止不可）。<br>3. 編集画面（SCR-011）の購読中止日はインライン編集を廃止し読取専用化（停止は本ボタンへ集約） | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/07/17 | 1.4  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：失効単価参照フィルタ `inactive_tanka_flg`（真偽・失効のみ）を **有効単価フラグ `active_tanka_flg`（トライステート：true=有効単価参照のみ / false=失効単価参照のみ / 省略=両方）** へ変更。UI を単価一覧(SCR-006)と同一のラジオ（有効/無効）に統一。SCR-020 の失効単価エラーからの導線(`?inactive_tanka=1`)は「無効(false)」で初期選択。JOIN の active_flg はパラメータバインド。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 6   | 2026/07/17 | 1.5  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：Stop Dokusya（ACSMS-API-014-004）で購読中止日を予約時点に master（t_dokusya.dokusya_chushi_date）へ即時反映する仕様を明記。予約行は未来日で有効行にならないが購読中止日のみ一覧(SCR-014)・詳細(SCR-011)へ直ちに表示。予約行を取消すと購読中止日は自動で null へ戻る（解約フラグ・購読状態の確定は従来どおり到来日バッチ Phase 2）。 | Nguyen Huy Dat | Nguyen Huy Dat |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者明細検索画面（ACSMS-SCR-014）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                                                                                            |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | ACSMS-API-COMMON-004 | Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 定義元: ACSMS-SCR-024                            |
| 2   | ACSMS-API-COMMON-006 | Get Shiten Dropdown (`GET /api/v1/shiten/dropdown`) — 定義元: ACSMS-SCR-015                                        |
| 3   | ACSMS-API-COMMON-007 | Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 定義元: ACSMS-SCR-015                                  |

※ 本画面の検索条件プルダウンは上記の共用APIを使用する（DataScopeは呼び出しアカウントに基づき自動適用）。
※ 「購読者情報登録」ボタンは ACSMS-SCR-005（購読者情報登録画面）へ画面遷移する（本画面ではAPIなし）。

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
| 9   | 画面固有     | CONFLICT              | 関連データが存在するため削除できません。                               | HTTP 409 |
| 10  | 画面固有     | DOKUSYA_READ_ONLY     | この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用） | HTTP 403 |
| 11  | 画面固有     | EXPORT_LIMIT_EXCEEDED | 出力データ件数が30000件を超えています。                                | HTTP 409 |
| 12  | 画面固有     | EXPORT_NO_DATA        | 出力データがありません。                                               | HTTP 404 |

---

# API ACSMS-API-014-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Search Dokusya List                                                                                                                                                                                                                   |
| 概要                   | 購読者の明細検索を行う（検索条件・DataScope適用、ページネーション対応）                                                                                                                                                                |
| URI                    | /api/v1/dokusya                                                                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                                                   |
| リクエストボディー     | なし                                                                                                                                                                                                                                  |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                |
| HTTPレスポンスコード   | 200:正常に購読者一覧を取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID            | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                |
| --- | ------------------------- | ------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -        | -    |        |        | 管理支店ID（プルダウン）【常時表示】                                                                |
| 2   | shiten_id                 | Number  | -        | -    |        |        | 支店ID（プルダウン、kanri_shiten_id 配下）【常時表示】                                              |
| 3   | kumiaiin_code             | String  | -        | -    |        | 20     | 組合員コード（部分一致）【常時表示】                                                                |
| 4   | jastem_toriatsukai_tenpo_code | String | -        | -    |        | 3      | 引落元口座支店コード（部分一致）。物理カラムは `bank_branch_code`（レガシー名）【詳細検索】          |
| 5   | jastem_tenpo_name             | String | -        | -    |        | 100    | 引落元口座支店名（部分一致）。物理カラムは `bank_branch_name`（レガシー名）【詳細検索】              |
| 6   | full_name                 | String  | -        | -    |        | 100    | 氏名（部分一致）。`shimei_sei` / `shimei_mei` / `haitatsu_shimei_sei` / `haitatsu_shimei_mei` のいずれかに部分一致（OR）【常時表示】 |
| 7   | full_name_kana            | String  | -        | -    |        | 100    | かな氏名（部分一致）。`shimei_kana_sei` / `shimei_kana_mei` / `haitatsu_shimei_kana_sei` / `haitatsu_shimei_kana_mei` のいずれかに部分一致（OR）【常時表示】 |
| 8   | renrakusaki_1             | String  | -        | -    |        | 15     | 連絡先１（部分一致）。`renrakusaki_1` / `haitatsu_renrakusaki_1` のいずれかに部分一致（OR）【詳細検索】 |
| 9   | haitatsu                  | String  | -        | -    |        | 200    | 配達先住所（部分一致）。配達先住所4項目（`haitatsu_todofuken_code` / `haitatsu_shikuchoson` / `haitatsu_chome_banchi` / `haitatsu_tatemono_mei`）＋購読者住所4項目（`todofuken_code` / `shikuchoson` / `chome_banchi` / `tatemono_mei`）のいずれかに部分一致（OR）【常時表示】 |
| 10  | hanbaiten_id              | Number  | -        | -    |        |        | 配達販売店ID（プルダウン）【常時表示】                                                              |
| 11  | email                     | String  | -        | -    |        | 100    | メールアドレス（部分一致、メール形式チェック）【詳細検索】                                          |
| 12  | seikyu_kaishi_month       | String  | -        | -    |        | 6      | 請求開始月（YYYYMM、部分一致）【詳細検索】                                                          |
| 13  | shoki_dokusya_kaishi_date_from | String | -        | -    |        |        | 購読開始日（範囲開始）YYYY/MM/DD【常時表示】                                                        |
| 14  | shoki_dokusya_kaishi_date_to   | String | -        | -    |        |        | 購読開始日（範囲終了）YYYY/MM/DD ※相関チェック：from ≦ to【常時表示】                               |
| 15  | dokusya_chushi_date_from       | String | -        | -    |        |        | 購読中止日（範囲開始）YYYY/MM/DD【常時表示】                                                        |
| 16  | dokusya_chushi_date_to         | String | -        | -    |        |        | 購読中止日（範囲終了）YYYY/MM/DD ※相関チェック：from ≦ to【常時表示】                               |
| 17  | dokusya_shubetsu               | Number | -        | -    |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）【常時表示】     |
| 18  | denshi_shonin_status           | Number | -        | -    |        |        | 電子版承認ステータス（NULL=Web申込以外, 0:未承認, 1:承認済み, 2:否認）【常時表示】                   |
| 19  | tetsuzuki_shurui               | Number | -        | -    |        |        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）【常時表示】                |
| 20  | joho_henko_tekiyo_date_from    | String | -        | -    |        |        | 適用日（範囲開始）YYYY/MM/DD【詳細検索】                                                            |
| 21  | joho_henko_tekiyo_date_to      | String | -        | -    |        |        | 適用日（範囲終了）YYYY/MM/DD ※相関チェック：from ≦ to。両方空欄=最新データフラグ=1、入力時=変更適用日が範囲内の履歴を抽出【詳細検索】 |
| 22  | shiharai_hoho                  | Number | -        | -    |        |        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）【詳細検索】 |
| 22.5 | active_tanka_flg             | Boolean | -       | -    |        |        | 有効単価フラグ（SCR-020 error gate 連携・顧客要件2026-07 改訂）。単価一覧(SCR-006)と同一のトライステート: `true`=有効単価(active_flg=TRUE)を参照する購読者のみ、`false`=失効単価(active_flg=FALSE)を参照する購読者のみ、省略=両方。参照する購読料単価は tanka_type=1。口座振替出力(SCR-020)の失効単価エラーからは `false`(無効)で初期選択される【詳細検索】 |
| 23  | page                           | Number | -        | -    |        |        | ページ番号（デフォルト: 1）                                                                         |
| 24  | per_page                       | Number | -        | -    |        |        | 1ページの件数（デフォルト: 20、最大: 100）                                                          |
| 25  | sort_by                        | String | -        | -    |        |        | ソートカラム（dokusya_id, kanri_shiten_id, shiten_id, kumiaiin_code, hanbaiten_id, shoki_dokusya_kaishi_date, dokusya_chushi_date）。デフォルト: updated_at |
| 26  | sort_order                     | String | -        | -    |        |        | ソート順（asc / desc、デフォルト: desc）                                                            |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                       |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | -------------------------------------------------------------------------- |
| 1   | data                         | Array   | ○        |              | -        | 購読者一覧                                                                 |
| 2   | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                   |
| 3   | →ja_id                       | Number  | -        |              | -        | JA ID                                                                      |
| 4   | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                 |
| 5   | →kanri_shiten_name           | String  | -        |              | 〇       | 管理支店名                                                                 |
| 6   | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                     |
| 7   | →shiten_name                 | String  | -        |              | 〇       | 支店名                                                                     |
| 8   | →kumiaiin_code               | String  | -        |              | -        | 組合員コード（空文字許容）                                                 |
| 9   | →full_name                   | String  | -        |              | -        | 氏名（shimei_sei + " " + shimei_mei）                                      |
| 10  | →full_name_kana              | String  | -        |              | -        | かな氏名（shimei_kana_sei + " " + shimei_kana_mei）                        |
| 11  | →tetsuzuki_shurui            | Number  | -        |              | -        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）  |
| 12  | →renrakusaki_1               | String  | -        |              | -        | 連絡先１（空文字許容）                                                     |
| 13  | →renrakusaki_2               | String  | -        |              | -        | 連絡先２（空文字許容）                                                     |
| 14  | →haitatsu_full_name          | String  | -        |              | -        | 配達先氏名（haitatsu_shimei_sei + " " + haitatsu_shimei_mei、前後空白トリム） |
| 15  | →haitatsu_yubin_no           | String  | -        |              | -        | 配達先郵便番号（空文字許容）                                               |
| 16  | →haitatsu                    | String  | -        |              | -        | 配達先住所（todofuken_name + shikuchoson + chome_banchi + tatemono_mei）   |
| 17  | →hanbaiten_id                | Number  | -        |              | -        | 販売店ID                                                                   |
| 18  | →hanbaiten_name              | String  | -        |              | -        | 販売店名                                                                   |
| 19  | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読） |
| 20  | →shiharai_hoho               | Number  | -        |              | -        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照                       |
| 21  | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子版承認ステータス（NULL=Web申込以外, 0:未承認, 1:承認済み, 2:否認）     |
| 22  | →shoki_dokusya_kaishi_date   | String  | -        | YYYY/MM/DD   | -        | 初回購読開始日                                                             |
| 23  | →dokusya_chushi_date         | String  | -        | YYYY/MM/DD   | 〇       | 購読中止日                                                                 |
| 24  | →is_read_only                | Boolean | -        |              | -        | 編集・削除不可フラグ（true=電子版クレジットカード決済者または併読者）        |
| 25  | meta                         | Object  | -        |              | -        | ページネーション情報                                                       |
| 26  | →total                       | Number  | -        |              | -        | 総件数                                                                     |
| 27  | →page                        | Number  | -        |              | -        | 現在ページ番号                                                             |
| 28  | →per_page                    | Number  | -        |              | -        | 1ページの件数                                                              |
| 29  | →total_pages                 | Number  | -        |              | -        | 総ページ数                                                                 |

## リクエスト例

```
GET /api/v1/dokusya?kanri_shiten_id=10&shiten_id=21&dokusya_shubetsu=1&shoki_dokusya_kaishi_date_from=2024/01/01&shoki_dokusya_kaishi_date_to=2024/12/31&page=1&per_page=20&sort_by=updated_at&sort_order=desc
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_id": 1001,
      "ja_id": 1,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "中央管理支店",
      "shiten_id": 21,
      "shiten_name": "渋谷支店",
      "kumiaiin_code": "K000001",
      "full_name": "山田 太郎",
      "full_name_kana": "ヤマダ タロウ",
      "tetsuzuki_shurui": 1,
      "renrakusaki_1": "03-1234-5678",
      "renrakusaki_2": "",
      "haitatsu_full_name": "山田 花子",
      "haitatsu_yubin_no": "1500001",
      "haitatsu": "東京都渋谷区神宮前1-1-1 渋谷マンション101",
      "hanbaiten_id": 501,
      "hanbaiten_name": "渋谷販売店",
      "dokusya_shubetsu": 1,
      "shiharai_hoho": 1,
      "denshi_shonin_status": null,
      "shoki_dokusya_kaishi_date": "2024/04/01",
      "dokusya_chushi_date": null,
      "is_read_only": false
    },
    {
      "dokusya_id": 1002,
      "ja_id": 1,
      "kanri_shiten_id": 10,
      "kanri_shiten_name": "中央管理支店",
      "shiten_id": 21,
      "shiten_name": "渋谷支店",
      "kumiaiin_code": "K000002",
      "full_name": "佐藤 花子",
      "full_name_kana": "サトウ ハナコ",
      "tetsuzuki_shurui": 1,
      "renrakusaki_1": "03-9876-5432",
      "renrakusaki_2": "",
      "haitatsu_full_name": "",
      "haitatsu_yubin_no": "1500002",
      "haitatsu": "東京都渋谷区神宮前2-2-2",
      "hanbaiten_id": 502,
      "hanbaiten_name": "原宿販売店",
      "dokusya_shubetsu": 2,
      "shiharai_hoho": 6,
      "denshi_shonin_status": 1,
      "shoki_dokusya_kaishi_date": "2025/01/15",
      "dokusya_chushi_date": null,
      "is_read_only": true
    }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "per_page": 20,
    "total_pages": 13
  }
}
```

## レスポンス失敗例

### 400 Validation Error（メール形式エラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "email", "message": "正しいメール形式を入力してください。" }
  ]
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
  - kanri_shiten_id / shiten_id / hanbaiten_id：数値型チェック
  - kumiaiin_code：最大20文字
  - jastem_toriatsukai_tenpo_code：最大3文字（物理カラム `bank_branch_code` に対する部分一致）
  - jastem_tenpo_name：最大100文字（物理カラム `bank_branch_name` に対する部分一致）
  - full_name / full_name_kana：最大100文字
  - haitatsu：最大200文字
  - renrakusaki_1：最大15文字
  - email：最大100文字、メール形式チェック（不正の場合、`VALIDATION_ERROR` + `errors[]` に `正しいメール形式を入力してください。` を含める）
  - seikyu_kaishi_month：最大6文字
  - shoki_dokusya_kaishi_date_from / shoki_dokusya_kaishi_date_to：有効な日付形式（YYYY/MM/DD）、両方指定時 `from ≦ to`
  - dokusya_chushi_date_from / dokusya_chushi_date_to：有効な日付形式（YYYY/MM/DD）、両方指定時 `from ≦ to`
  - joho_henko_tekiyo_date_from / joho_henko_tekiyo_date_to：有効な日付形式（YYYY/MM/DD）、両方指定時 `from ≦ to`
  - dokusya_shubetsu：1〜3 または未指定
  - shiharai_hoho：1〜6, 9 または未指定
  - tetsuzuki_shurui：0 または 1 または未指定
  - denshi_shonin_status：0〜2 または未指定
  - page：1以上
  - per_page：1〜100
  - sort_by：許可カラム一覧に含まれるか確認（kanri_shiten_id, shiten_id, kumiaiin_code, hanbaiten_id, shoki_dokusya_kaishi_date, dokusya_chushi_date, updated_at）
  - sort_order：`asc` または `desc`
- デフォルト値を設定する（page=1, per_page=20, sort_by=updated_at, sort_order=desc）
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：自中央会管轄JAの購読者のみ参照可能（`d.ja_id IN (SELECT ja_id FROM m_ja WHERE chuokai_id = :user_chuokai_id)`）
  - `JA_HONTEN`：自JAの購読者のみ参照可能（`d.ja_id = :user_ja_id`）
  - `JA_KANRI_SHITEN`：自管理支店の購読者のみ参照可能（`d.ja_id = :user_ja_id AND d.kanri_shiten_id = :user_kanri_shiten_id`）
- DataScope違反（他JA・他管理支店のレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ取得条件の設定

- ログインユーザーのスコープ（role_code, ja_id, kanri_shiten_id, chuokai_id）を取得する。
- DataScope を role_code により適用する（4.2 参照）。
- 検索条件を追加する：
  - kanri_shiten_id 指定時：`d.kanri_shiten_id = :kanri_shiten_id`
  - shiten_id 指定時：`d.shiten_id = :shiten_id`
  - kumiaiin_code 指定時：`d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'`
  - jastem_toriatsukai_tenpo_code 指定時：`d.bank_branch_code ILIKE '%' || :jastem_toriatsukai_tenpo_code || '%'` ※物理カラムは `bank_branch_code`（レガシー名）
  - jastem_tenpo_name 指定時：`d.bank_branch_name ILIKE '%' || :jastem_tenpo_name || '%'` ※物理カラムは `bank_branch_name`（レガシー名）
  - full_name 指定時：`(d.shimei_sei ILIKE '%' || :full_name || '%' OR d.shimei_mei ILIKE '%' || :full_name || '%' OR d.haitatsu_shimei_sei ILIKE '%' || :full_name || '%' OR d.haitatsu_shimei_mei ILIKE '%' || :full_name || '%')`（購読者氏名＋配達先氏名の各カラムに OR 部分一致）
  - full_name_kana 指定時：`(d.shimei_kana_sei ILIKE '%' || :full_name_kana || '%' OR d.shimei_kana_mei ILIKE ... OR d.haitatsu_shimei_kana_sei ILIKE ... OR d.haitatsu_shimei_kana_mei ILIKE ...)`（購読者かな氏名＋配達先かな氏名の各カラムに OR 部分一致）
  - renrakusaki_1 指定時：`(d.renrakusaki_1 ILIKE '%' || :renrakusaki_1 || '%' OR d.haitatsu_renrakusaki_1 ILIKE '%' || :renrakusaki_1 || '%')`（連絡先１＋配達先連絡先１に OR 部分一致）
  - haitatsu 指定時：配達先住所4項目（`haitatsu_todofuken_code` / `haitatsu_shikuchoson` / `haitatsu_chome_banchi` / `haitatsu_tatemono_mei`）＋購読者住所4項目（`todofuken_code` / `shikuchoson` / `chome_banchi` / `tatemono_mei`）の各カラムに OR 部分一致
  - hanbaiten_id 指定時：`d.hanbaiten_id = :hanbaiten_id`
  - email 指定時：部分一致
  - seikyu_kaishi_month 指定時：部分一致
  - shoki_dokusya_kaishi_date_from 指定時：`d.shoki_dokusya_kaishi_date >= :shoki_dokusya_kaishi_date_from`
  - shoki_dokusya_kaishi_date_to 指定時：`d.shoki_dokusya_kaishi_date <= :shoki_dokusya_kaishi_date_to`
  - dokusya_chushi_date_from 指定時：`d.dokusya_chushi_date >= :dokusya_chushi_date_from`
  - dokusya_chushi_date_to 指定時：`d.dokusya_chushi_date <= :dokusya_chushi_date_to`
  - dokusya_shubetsu / shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status 指定時：それぞれ等価条件
  - active_tanka_flg 指定時：`true`=参照購読料単価が有効(active_flg=TRUE)の購読者のみ、`false`=失効(active_flg=FALSE)の購読者のみ抽出（省略時は絞り込まない）。`tanka_id` は m_tanka の PK のため INNER JOIN で行数は増えない（0/1件）。JOIN 条件の active_flg はパラメータ（`:activeTankaFlg`）でバインドする。
    ```sql
    INNER JOIN m_tanka mti
      ON mti.tanka_id = d.tanka_id
     AND mti.tanka_type = 1
     AND mti.deleted_at IS NULL
     AND mti.active_flg = FALSE
    ```
- 適用日（joho_henko_tekiyo_date_from / joho_henko_tekiyo_date_to）の処理：
  - 両方空欄の場合：購読者履歴の最新データフラグ（saishin_data_flg=TRUE）のレコードを抽出
  - いずれか入力されている場合：購読者履歴テーブル（`t_dokusya_rireki`）の変更適用日が `[from, to]` の範囲内のレコードを抽出（from のみ指定 → `>= from`、to のみ指定 → `<= to`、両方 → 範囲内）

### 4.4 データ件数の取得

```sql
SELECT COUNT(*)
FROM t_dokusya d
LEFT JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s ON s.shiten_id = d.shiten_id AND s.deleted_at IS NULL
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
WHERE d.deleted_at IS NULL
  /* DataScope: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN */
  AND d.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
  /* 検索条件 */
  AND (:kanri_shiten_id IS NULL OR d.kanri_shiten_id = :kanri_shiten_id)
  AND (:shiten_id IS NULL OR d.shiten_id = :shiten_id)
  AND (:kumiaiin_code IS NULL OR d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%')
  AND (:full_name IS NULL OR d.shimei_sei ILIKE '%' || :full_name || '%'
                          OR d.shimei_mei ILIKE '%' || :full_name || '%'
                          OR d.haitatsu_shimei_sei ILIKE '%' || :full_name || '%'
                          OR d.haitatsu_shimei_mei ILIKE '%' || :full_name || '%')
  AND (:dokusya_shubetsu IS NULL OR d.dokusya_shubetsu = :dokusya_shubetsu)
  /* ... 他の検索条件は省略 */
```

### 4.5 データ取得

```sql
SELECT d.dokusya_id, d.ja_id,
       d.kanri_shiten_id, ks.kanri_shiten_name,
       d.shiten_id, s.shiten_name,
       d.kumiaiin_code,
       (d.shimei_sei || ' ' || d.shimei_mei) AS full_name,
       (d.shimei_kana_sei || ' ' || d.shimei_kana_mei) AS full_name_kana,
       d.tetsuzuki_shurui,
       d.renrakusaki_1, d.renrakusaki_2,
       (d.haitatsu_shimei_sei || ' ' || d.haitatsu_shimei_mei) AS haitatsu_full_name,
       d.haitatsu_yubin_no,
       (COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) AS haitatsu,
       d.hanbaiten_id, h.hanbaiten_name,
       d.dokusya_shubetsu, d.shiharai_hoho, d.denshi_shonin_status,
       d.shoki_dokusya_kaishi_date, d.dokusya_chushi_date,
       /* is_read_only: 電子版クレジットカード決済者（dokusya_shubetsu=2 AND shiharai_hoho=6）または併読者（dokusya_shubetsu=3） */
       (
         (d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6)
         OR d.dokusya_shubetsu = 3
       ) AS is_read_only
FROM t_dokusya d
LEFT JOIN m_kanri_shiten ks ON ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s ON s.shiten_id = d.shiten_id AND s.deleted_at IS NULL
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_todofuken t ON t.todofuken_code = d.haitatsu_todofuken_code
WHERE d.deleted_at IS NULL
  /* DataScope + 検索条件 は 4.4 と同じ */
ORDER BY :sort_by :sort_order
LIMIT :per_page OFFSET (:page - 1) * :per_page
```

- 適用日（joho_henko_tekiyo_date_from / joho_henko_tekiyo_date_to）が入力されている場合は、`t_dokusya_rireki` から該当範囲内の履歴レコードを取得する（履歴テーブルへの JOIN または CTE で実装）。両方空欄の場合は `saishin_data_flg = TRUE` のレコードを使用する。

### 4.6 レスポンス生成

- 取得結果を data 配列として返却する。
- `meta` オブジェクトにページネーション情報（total / page / per_page / total_pages）を含める。
- `is_read_only` フラグは BE 側で算出し、FE 側で「編集」「削除」ボタンの活性制御に使用する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-014-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Delete Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 指定した購読者を論理削除する                                                                                                                                                                                                                               |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                                                               |
| メソッド               | DELETE                                                                                                                                                                                                                                                     |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:削除しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 403:この購読者は編集・削除できません, 404:指定された購読者が見つかりません, 409:関連データが存在するため削除できません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                       |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------------ |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 削除対象のdokusya_id（パスパラメータ）     |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                 |
| --- | ------- | ------ | -------- | ------------ | -------- | -------------------- |
| 1   | message | String | -        |              | -        | 削除完了メッセージ   |

## リクエスト例

```
DELETE /api/v1/dokusya/1001
```

## レスポンス成功例

```json
{
  "message": "削除しました。"
}
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

### 403 Dokusya Read Only

```json
{
  "error_code": "DOKUSYA_READ_ONLY",
  "message": "この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

### 409 Conflict（関連データあり）

```json
{
  "error_code": "CONFLICT",
  "message": "関連データが存在するため削除できません。"
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

> ※ 4.4 論理削除の実行 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータの検証：
  - dokusya_id：数値型チェック、必須チェック
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.delete`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - `CHUOKAI`：自中央会管轄JAの購読者のみ削除可能
  - `JA_HONTEN`：自JAの購読者のみ削除可能
  - `JA_KANRI_SHITEN`：自管理支店の購読者のみ削除可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽のため404を返却）

### 4.3 対象レコードの存在確認 + 読み取り専用チェック + 関連データ確認

- 対象レコードの存在確認とロール別ルール（電子版クレカ決済者・併読者は削除不可）を確認する。

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id, shiten_id,
       kumiaiin_code, shimei_sei, shimei_mei,
       dokusya_shubetsu, shiharai_hoho,
       hanbaiten_id, tanka_id,
       created_at, updated_at
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- 読み取り専用判定（`(dokusya_shubetsu = 2 AND shiharai_hoho = 6) OR dokusya_shubetsu = 3`）が真の場合：HTTP 403 (`DOKUSYA_READ_ONLY`)
- 関連データの存在確認（将来の拡張に備えた整合性チェック）：関連テーブルに購読者IDが紐づくレコードが存在する場合、削除を拒否する。
  - 関連データが存在する場合：HTTP 409 (`CONFLICT`)

### 4.4 論理削除の実行

```sql
UPDATE t_dokusya
SET deleted_at = NOW(),
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND deleted_at IS NULL
```

### 4.5 操作ログ記録

- 削除前データ（4.3 のSELECT結果）を `before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'DELETE', 1,
        :dokusya_id, 't_dokusya', :before_value_json, '',
        :ip_address, :user_agent)
```

**before_value 例:**

```
`before_value`：削除前のデータをJSON形式で格納する。
`after_value`：DELETE のため空文字列を設定する。

{
  "dokusya_id": 1001,
  "ja_id": 1,
  "kanri_shiten_id": 10,
  "shiten_id": 21,
  "kumiaiin_code": "K000001",
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "dokusya_shubetsu": 1,
  "shiharai_hoho": 1,
  "hanbaiten_id": 501,
  "tanka_id": 1
}
```

### 4.6 レスポンス生成

- 削除完了メッセージを返却する。HTTP 200。

```json
{ "message": "削除しました。" }
```

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'DELETE', 2,
        :dokusya_id, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-014-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Export Dokusya Excel                                                                                                                                                                                                                                       |
| 概要                   | 現在の検索条件で購読者一覧をExcel形式で出力する（最大30,000件、超過時は409エラー）                                                                                                                                                                         |
| URI                    | /api/v1/dokusya/export                                                                                                                                                                                                                                     |
| メソッド               | GET                                                                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                                                                       |
| リクエストパラメーター | クエリパラメータ（ACSMS-API-014-001 と同じ検索条件、page / per_page / sort_by / sort_order は無視）                                                                                                                                                        |
| ヘッダ                 | Content-Type: application/json※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常にExcelをダウンロードしました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:出力データがありません, 409:出力データ件数が30000件を超えています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                       |
| --- | -------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------- |
| 1   | （ACSMS-API-014-001 と同じ検索条件パラメータ。page / per_page / sort_by / sort_order を除く） | | | | | | |

## レスポンスデータ

Excelファイル（`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）

### レスポンスヘッダ

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename*=UTF-8''<URLエンコードした 購読者一覧出力_YYYYMMDD_HHmmss.xlsx>
```

### Excelフォーマット

> 顧客要件 2026-06 の検索結果テーブル（15 列）と完全一致。先頭に ID（dokusya_id）列を追加。支店 / 連絡先２ 列は廃止、手続種類 / 購読種別 / 配達先氏名 / 支払方法 を追加。かな氏名 は検索専用のため含めない。手続種類 / 購読種別 / 支払方法 は m_code（`TETSUZUKI_SHURUI` / `DOKUSYA_SHUBETSU` / `SHIHARAI_HOHO`）のラベルを出力する（`CodeService.getLabel` で解決）。

| 列順 | カラム名         | 説明                                                  |
| ---- | ---------------- | ----------------------------------------------------- |
| 1    | ID               | dokusya_id（プレフィックス無しのDB値）                |
| 2    | 管理支店         | kanri_shiten_name                                     |
| 3    | 組合員コード     | kumiaiin_code                                         |
| 4    | 購読者名         | full_name                                             |
| 5    | 手続種類         | tetsuzuki_shurui（m_code ラベル）                     |
| 6    | 購読種別         | dokusya_shubetsu（m_code ラベル）                     |
| 7    | 連絡先１         | renrakusaki_1                                         |
| 8    | 配達先氏名       | haitatsu_full_name                                    |
| 9    | 配達先郵便       | haitatsu_yubin_no                                     |
| 10   | 配達先住所       | haitatsu                                              |
| 11   | 販売店コード     | hanbaiten_id                                          |
| 12   | 販売店名         | hanbaiten_name                                        |
| 13   | 支払方法         | shiharai_hoho（m_code ラベル）                        |
| 14   | 購読開始日       | shoki_dokusya_kaishi_date                             |
| 15   | 購読中止日       | dokusya_chushi_date                                   |

## リクエスト例

```
GET /api/v1/dokusya/export?kanri_shiten_id=10&dokusya_shubetsu=1
```

## レスポンス成功例

Excelファイル（バイナリ）を返却する。HTTP 200。

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

### 404 Export No Data

```json
{
  "error_code": "EXPORT_NO_DATA",
  "message": "出力データがありません。"
}
```

### 409 Export Limit Exceeded

```json
{
  "error_code": "EXPORT_LIMIT_EXCEEDED",
  "message": "出力データ件数が30000件を超えています。"
}
```

### 500 Internal Server Error

```json
{
  "error_code": "INTERNAL_SERVER_ERROR",
  "message": "Excel出力に失敗しました。"
}
```

## 処理手順

### 4.1 リクエストのバリデーション

- クエリパラメータの検証：ACSMS-API-014-001 と同じ検索条件（page / per_page / sort_by / sort_order は無視）。
- 不正なパラメータの場合：HTTP 400 (`BAD_REQUEST`) または HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: ACSMS-API-014-001 と同じ（CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN 別の範囲制限）
- DataScope違反の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 データ件数チェック（30,000件上限）

- 検索条件で対象件数を先にカウントする（DataScope適用）。

```sql
SELECT COUNT(*)
FROM t_dokusya d
LEFT JOIN m_account a ON a.account_id = d.created_by AND a.deleted_at IS NULL
WHERE d.deleted_at IS NULL
  /* DataScope: 4.2 と同じ */
  AND d.ja_id = :user_ja_id
  AND (:user_kanri_shiten_id IS NULL OR d.kanri_shiten_id = :user_kanri_shiten_id)
  /* 検索条件: ACSMS-API-014-001 4.4 と同じ */
```

- 件数が 0 の場合：HTTP 404 (`EXPORT_NO_DATA`)
- 件数が 30,000 を超える場合：HTTP 409 (`EXPORT_LIMIT_EXCEEDED`)

### 4.4 データ取得

- ACSMS-API-014-001 4.5 と同じ SELECT 文を使用する（pagination なし、LIMIT 30000）。

```sql
SELECT d.dokusya_id, d.ja_id,
       d.kanri_shiten_id, ks.kanri_shiten_name,
       d.shiten_id, s.shiten_name,
       d.kumiaiin_code,
       (d.shimei_sei || ' ' || d.shimei_mei) AS full_name,
       /* ... ACSMS-API-014-001 4.5 と同じ */
FROM t_dokusya d
/* ... 同じ JOIN / WHERE / ORDER BY */
LIMIT 30000
```

### 4.5 Excel生成

- ファイル名：`購読者一覧出力_YYYYMMDD_HHmmss.xlsx`（現在日時、JST）
- 文字コード：UTF-8
- ヘッダー行（検索結果テーブルと一致、15 列）：`ID, 管理支店, 組合員コード, 購読者名, 手続種類, 購読種別, 連絡先１, 配達先氏名, 配達先郵便, 配達先住所, 販売店コード, 販売店名, 支払方法, 購読開始日, 購読中止日`
- 手続種類 / 購読種別 / 支払方法 は m_code ラベルを `CodeService.getLabel` で解決して出力する
- 日付を `YYYY/MM/DD` 形式でフォーマットする（NULL の場合は空文字）

### 4.6 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, before_value, after_value,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'EXPORT_EXCEL', 1,
        NULL, 't_dokusya', '', :after_value_json,
        :ip_address, :user_agent)
```

**after_value 例:**

```
`before_value`：EXPORT のため空文字列を設定する。
`after_value`：エクスポート条件と件数をJSON形式で格納する。

{
  "kanri_shiten_id": 10,
  "shiten_id": null,
  "dokusya_shubetsu": 1,
  "record_count": 250
}
```

### 4.7 レスポンス生成

- Excel ファイルをレスポンスボディとして返却する。HTTP 200。
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename*=UTF-8''<URLエンコードした 購読者一覧出力_YYYYMMDD_HHmmss.xlsx>`

### 4.8 例外処理

- DB接続エラー・Excel生成エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`、メッセージ `Excel出力に失敗しました。`）
- エラー発生時も操作ログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table, error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者明細検索画面 (ACSMS-SCR-014)', 'EXPORT_EXCEL', 2,
        NULL, 't_dokusya', :error_message, :stack_trace,
        :ip_address, :user_agent)
```

# API ACSMS-API-014-004

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Stop Dokusya（購読停止・解約予約）                                                                                                                                                                                                                          |
| 概要                   | 一覧の「購読を停止する」ボタンから、購読中止日（解約予定日）だけを指定して解約予約行を1件挿入する専用API。購読中止日は予約時点で master（t_dokusya.dokusya_chushi_date）へ即時反映し、一覧（SCR-014）・詳細（SCR-011）に直ちに表示する。解約の確定（解約フラグ・購読状態の反映）は到来日バッチ（Phase 2）が行う。予約行を取消すると master の購読中止日は自動で null へ戻る。 |
| URI                    | /api/v1/dokusya/{dokusya_id}/stop                                                                                                                                                                                                                          |
| メソッド               | POST                                                                                                                                                                                                                                                       |
| リクエストボディー     | dokusya_chushi_date（YYYY-MM-DD）                                                                                                                                                                                                                          |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:購読停止を予約しました, 400:バリデーションエラー, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 403:この購読者は編集・削除できません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID     | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                       |
| --- | ------------------ | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | dokusya_id         | Number | -        | 〇   |        |        | 停止対象の dokusya_id（パスパラメータ）                                                                     |
| 2   | dokusya_chushi_date| String | -        | 〇   |        |        | 購読中止日（解約予定日）。紙版はカレンダー選択日、電子版は選択した終了月の月末日。フォーマットは `YYYY-MM-DD`。 |

## レスポンスデータ

| #   | 項目ID  | タイプ | 繰り返し | フォーマット | Nullable | 説明                                     |
| --- | ------- | ------ | -------- | ------------ | -------- | ---------------------------------------- |
| 1   | data    | Object | -        |              | -        | 更新後の購読者詳細（ACSMS-API-011-001 と同型） |
| 2   | message | String | -        |              | -        | 「購読停止を予約しました。」             |

## リクエスト例

```
POST /api/v1/dokusya/1001/stop
Content-Type: application/json

{
  "dokusya_chushi_date": "2027-11-30"
}
```

## レスポンス成功例

```json
{
  "data": { "dokusya_id": 1001, "dokusya_chushi_date": "2027-11-30" },
  "message": "購読停止を予約しました。"
}
```

## レスポンス失敗例

### 400 Validation Error（紙版：中止日の相対チェック違反）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です",
  "errors": [
    { "field": "dokusya_chushi_date", "message": "購読中止日は本日より後の日付を指定してください。" }
  ]
}
```

### 400 Validation Error（電子版：請求開始月が未設定）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です",
  "errors": [
    { "field": "dokusya_chushi_date", "message": "この読者料金の徴収はまだ開始されていません。" }
  ]
}
```

### 400 Validation Error（二重解約）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です",
  "errors": [
    { "field": "dokusya_chushi_date", "message": "既に解約予約されています。変更する場合は履歴画面で解約を取消してください。" }
  ]
}
```

### 403 Dokusya Read Only

```json
{
  "error_code": "DOKUSYA_READ_ONLY",
  "message": "この購読者は編集・削除できません。（電子版クレジットカード決済者・併読者は読み取り専用）"
}
```

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
}
```

## 処理手順

> ※ 解約予約行の挿入 と 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id の数値型チェック・必須チェック。
- ボディ：dokusya_chushi_date の必須チェック・`YYYY-MM-DD` フォーマットチェック。
- 不正な場合：HTTP 400（`BAD_REQUEST` / `VALIDATION_ERROR`）。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。未認証：HTTP 401（`UNAUTHORIZED`）。
- 必要権限: `dokusya.update`。権限不足：HTTP 403（`FORBIDDEN`）。
- DataScope（削除と同じ境界）：CHUOKAI=自中央会管轄JA / JA_HONTEN=自JA / JA_KANRI_SHITEN=自管理支店。範囲外は 404 でマスク。

### 4.3 読み取り専用判定

- 併読（dokusya_shubetsu=3）または 電子版クレカ決済者（dokusya_shubetsu=2 かつ shiharai_hoho=6）は編集不可 → HTTP 403（`DOKUSYA_READ_ONLY`）。

### 4.4 停止（解約予約）バリデーション

- 二重解約ガード：有効な解約予約（購読中止日が入った取消されていない履歴行）が既にある場合は 400（`VALIDATION_ERROR` / 既に解約予約されています…）。
- 紙版（dokusya_shubetsu=1）：
  - 解約予定日 >= 購読開始日
  - 解約予定日 > 本日（未来日のみ）
  - 解約予定日 > 最終変更適用日（履歴 MAX joho・同日不可）
- 電子版（dokusya_shubetsu=2）：
  - 請求開始月（seikyu_kaishi_month）が未設定なら停止不可（`この読者料金の徴収はまだ開始されていません。`）。
  - 選択月（中止日の YYYYMM）は 請求開始月以降 かつ 当月以降。中止日は選択月の月末日（FE が丸めて送る）。

### 4.5 解約予約行の挿入

- Phase 1 の予約行を1件挿入する（`insertScheduledKaiyaku`）。最小限のみ override：`部数=0`・`zougen_hokoku_flg=true`・`中止日`・`適用日=中止日`・`kaiyaku_flg=false`・`saishin_data_flg=false`・`shinki_flg=false`・`torikeshi_flg=false`。その他項目は直前行から継承。
- 未来日予約のため当日時点で t_dokusya は未反映（到来日バッチが確定）。

### 4.6 操作ログ記録

- `log_type=1`（USER_OPERATION）、`gamen_name='購読者明細検索画面 (ACSMS-SCR-014)'`、`operation='UPDATE'`、`target_table='t_dokusya'` で記録する（主DMLと同一トランザクション）。

### 4.7 レスポンス生成

- 更新後の購読者詳細（ACSMS-API-011-001 と同型）を `data` に、`message: '購読停止を予約しました。'` を返す。HTTP 200。

### 4.8 例外処理

- DB エラー等の場合：HTTP 500（`INTERNAL_SERVER_ERROR`）。
- エラー発生時も操作ログを記録する（`log_type=3`、トランザクション外）。
