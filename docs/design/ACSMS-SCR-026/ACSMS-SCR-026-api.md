---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-026
screen_name: 購読者名簿出力画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-05
created_date: 2026/06/05
created_by: Tran Duc Tuyen
updated_date: 2026/08/17
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/06/05 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/06/12 | 1.1  | Tran Duc Tuyen | 画面設計書（画面項目No.5「併読は除外」）に合わせ購読種別フィルタを修正：dokusya_shubetsu は 1/2 のみ許可、併読(3)は常に除外（リクエストパラメータ・4.1/4.3/4.4 SQL） | Nguyen Huy Dat | Nguyen Huy Dat |
| 3  | 2026/08/05 | 1.2  | Tran Duc Tuyen | 顧客要件 2026-08 改訂：管理支店別購読者名簿の「支店」を**必須から任意へ戻す**（未選択＝管理支店配下すべて）。必須にしていた間、`t_dokusya_rireki.shiten_id` が NULL の購読者——電子版連携は常に NULL、紙版も購読者登録で支店は任意——が `shiten_id IN (...)` の NULL 比較で常に対象外となり、支店を全選択しても名簿へ出力できなかった（全選択は実在する支店IDを列挙するだけで NULL は拾えない）。未選択時は支店条件を付けず、支店未設定の購読者も含めて出力する。支店を選択した場合の挙動は従来どおり（指定支店のみ＝支店未設定は対象外）。ACSMS-MSG-026-007 は不要となり削除。 | | |
| 4 | 2026/08/05 | 1.3 | Tran Duc Tuyen | 顧客要件 2026-08（#56597）：①出力条件の「販売店」候補から**電子版ダミー販売店**（hanbaiten_code=9999999999）を除外。ダミーは電子版読者を紐づける受け皿であり実在の販売店ではないため、選んでも結果は0件になる。②**集計対象（購読種別）を帳票種別ごとに分離**した。従来は両種別で「併読を除外し電子版は承認済のみ」という共通条件だったため、販売店別に電子版が混ざり、管理支店別からは対象にすべき併読が落ちていた。<br>・販売店別＝紙版のみ（併読・電子版は有料/無料とも対象外）<br>・管理支店別＝紙版（無条件）＋併読（有料）＋電子版（有料かつ承認済）。無料（`denshi_dokusya_shubetsu = 0`）は併読・電子版とも対象外<br>※確認事項の回答：管理支店別に販売店の絞り込み欄は追加しない／電子版（有料）にも承認済（`denshi_shonin_status = 1`）条件は必要／併読の部数は入力値のまま扱う（1に丸めない）／`denshi_dokusya_shubetsu` は電子版・併読なら必ず値を持ち NULL は紙版のみ | | |
| 5 | 2026/08/16 | 1.4 | Tran Duc Tuyen | **実装追従（コードレビュー）**：4.4 データ取得SQLサンプルが「併読(3)は常に除外」のまま旧版から更新されておらず、4.3（No.4で改訂済みの帳票種別ごとの集計対象）と矛盾していたため `MeiboReportService.applyShubetsuScope()` の実際の分岐に合わせて修正。あわせて実装済みで未反映だった抽出条件を4.3/4.4へ追記：①現在行の判定条件に **部数(`dokusya_busu`) > 0** を追加（解約予約(Phase 1)行は手続種類=新規のまま部数=0で到来日バッチまで残るため、条件が無いと0部の読者が名簿に出てしまう不具合の是正）②**取消済み行（`torikeshi_flg = true`）を候補から除外**③**論理削除済み購読者（`t_dokusya.deleted_at`）を除外**④現在行の判定を単純な `MAX(rireki_no)` ではなく `(joho_henko_tekiyo_date, rireki_no)` の組の最大値に訂正（バックデート反映のため）。 | | |
| 6 | 2026/08/16 | 1.5 | Tran Duc Tuyen | **実装追従（コードレビュー）**：①動的A4ページング（顧客要件2026-07・`buildMeiboDocPages`）に伴い、プレビューAPIのリクエストパラメータへ `page` を追記し、レスポンスへページング関連フィールド（`page_no`/`per_page`/`total_pages`/`total_rows`/`is_last_page`/`group_count`/`group_page_no`/`group_total_pages`、グループの `is_continued`/`show_total`/`show_subtotal`）を追記。あわせて **1レスポンス＝1文書ページ（販売店/管理支店 1件分）** である仕様を明記（旧記載は全グループを1レスポンスで返す想定になっていた）。②Excel出力APIのリクエストパラメータへ `nichino_download_allowed_flg`（日農ダウンロード許可フラグ）を追記。③本画面を含む帳票5画面共通の `ShitenRestrictedGuard`（所属支店設定済アカウントは403）をエラー一覧・4.2へ追記。 | | |
| 7 | 2026/08/17 | 1.6 | Tran Duc Tuyen | **再監査（前回セッションが4.x処理手順の途中で中断したため実装と再照合）**：①DataScopeの記載を実装（`applyBranchScope()`）に合わせて訂正 — JA_KANRI_SHITENは `kanri_shiten_id` のみで絞込み（`ja_id`条件は付与しない）、かつ本画面はスコープ外IDに対して `DATA_SCOPE_VIOLATION`(403) を送出しない（WHERE条件で暗黙的に除外され対象0件として扱われるだけ）ため、誤った403の記載を両APIの4.2から削除。②API-026-002の4.2に、001にのみ記載されていた `ShitenRestrictedGuard`（`ReportController` にコントローラ単位で適用されexportも対象）の記載漏れを追記。③4.4（Excelファイル生成・S3保存）の記載を`FileArchiveService.archive()`実装に合わせて訂正 — ダウンロード名に帳票種別接頭辞（`{販売店別\|管理支店別}`）が抜けていた誤記を修正し、S3保存パスを実際のキー形式 `reports/meibo/{ja_code}/{report_type}/{年}/{ダウンロード名}_{保存日時14桁}.xlsx`（旧記載の `ja-{ja_id}/report/meibo/...` は実装に存在しない誤記）へ訂正。④4.5（ダウンロード履歴記録）のINSERTサンプルに実装（`FileDownload`エンティティ）で書き込まれる `scheduled_delete_date`（登録+5年）・`nichino_download_allowed_flg`（リクエストパラメータを保存）を追記し、`target_month` は本画面では常に`NULL`である旨を明記。⑤4.7（例外処理）のエラーログINSERTサンプルの `target_table` が `'t_file_download'` になっていた誤記を実装の `TABLE_NAME` 定数どおり `'t_dokusya_rireki'` へ訂正。⑥関連資料に支店プルダウン取得API（ACSMS-API-COMMON-006 `GET /api/v1/shiten/dropdown`、`shiten_ids` の候補取得に使用）の記載漏れを追加。⑦販売店プルダウン（ACSMS-API-COMMON-007）の呼出しが実際には `dummy=exclude` で電子版ダミー販売店を除外していたにもかかわらず「含めて返却」と誤記されていた箇所を訂正（No.4の改修意図と矛盾していた）。⑧レスポンス失敗例JSONの `message` 文言に実装（`error-codes.constant.ts` / 各Exceptionクラス）どおりの末尾「。」が欠けていた箇所（401/403/404/500/VALIDATION_ERROR）を追記。 | | |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者名簿出力画面（ACSMS-SCR-026）」において、システム上で新規作成されるAPIの詳細を記述した資料です。
本画面は、適用日時点の購読者スナップショットを基に、販売店別または管理支店別の購読者名簿をプレビュー表示し、Excel形式で出力する。

## 関連資料

| No  | 資料コード           | 資料名                                            |
| --- | -------------------- | ------------------------------------------------- |
| 1   | ACSMS-SCR-026        | 購読者名簿出力画面 画面設計書                      |
| 2   | ACSMS-API-COMMON-004 | 管理支店プルダウン取得 API（定義元: ACSMS-SCR-024）|
| 3   | ACSMS-API-COMMON-006 | 支店プルダウン取得 API（定義元: ACSMS-SCR-011）    |
| 4   | ACSMS-API-COMMON-007 | 販売店プルダウン取得 API（定義元: ACSMS-SCR-015） |

※ 本画面の出力条件エリアのプルダウンは以下の共用APIを使用する。新規定義は行わない。

- ACSMS-API-COMMON-004: Get Kanri Shiten Dropdown (`GET /api/v1/kanri-shiten/dropdown`) — 帳票種別 = 管理支店別 のとき使用。DataScope自動適用（JA管理支店は自支店のみ）。
- ACSMS-API-COMMON-006: Get Shiten Dropdown (`GET /api/v1/shiten/dropdown`) — 帳票種別 = 管理支店別 のとき、選択中の管理支店配下の支店（`shiten_ids` の候補）を絞込むために使用。`kinyu_shiten_flg=false` を指定し金融機関支店を除外する。DataScope自動適用。
- ACSMS-API-COMMON-007: Get Hanbaiten Dropdown (`GET /api/v1/hanbaiten/dropdown`) — 帳票種別 = 販売店別 のとき使用。`dummy=exclude` を指定し電子版ダミー販売店（hanbaiten_code=9999999999）を除外して返却する（顧客要件2026-08 #56597）。DataScope自動適用。

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
| 8   | 画面固有     | REPORT_NO_DATA        | 対象のデータが存在しません。                                           | HTTP 404 |
| 9   | 画面固有     | FORBIDDEN              | 所属支店が設定されたアカウントはこの機能を使用できません。             | HTTP 403 |

※ 日農 管理者 / 日農 担当者（NICHINO_ADMIN / NICHINO_STAFF）は `report.export_meibo` 権限を保持しないため、両APIとも HTTP 403 (`FORBIDDEN`) を返す。FE はこの場合 ACSMS-MSG-026-001「この機能はJAアカウントのみ使用できます。」を表示する。
※ 出力条件の必須・条件付き必須エラー（適用日未入力 = ACSMS-MSG-026-006、販売店未選択 = ACSMS-MSG-026-002、管理支店未選択 = ACSMS-MSG-026-003）は HTTP 400 (`VALIDATION_ERROR`) の `errors[]` で返す。
※ #9：`ShitenRestrictedGuard`（顧客要件 2026-07）— `session.shiten_id` が設定されたアカウント（JA管理支店の中でも特定の支店に紐付くアカウント）は、購読者名簿を含む帳票系5画面（本画面のほか SCR-020/021/028/029）を利用不可。`SessionAuthGuard` → `PermissionsGuard` の後段でコントローラ単位に適用され、権限（`report.export_meibo`）を保持していても本ガードで弾かれる。両APIとも対象。

---

# API ACSMS-API-026-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Preview Subscriber Meibo Report                                                                                                                                                                                                    |
| 概要                   | 適用日時点の最新スナップショットを基に、販売店別または管理支店別の購読者名簿プレビューデータを取得する。グループ化（小計・合計）済みの構造で返却する。                                                                              |
| URI                    | /api/v1/report/meibo/preview                                                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                                                |
| リクエストボディー     | なし                                                                                                                                                                                                                               |
| リクエストパラメーター | クエリパラメータ                                                                                                                                                                                                                  |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常にプレビューデータを取得しました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID  | タイプ   | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                  |
| --- | --------------- | -------- | -------- | ---- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String   | -        | 〇   |        | 10     | 適用日（YYYY-MM-DD）。各 dokusya_id について `joho_henko_tekiyo_date <= tekiyo_date` を満たす行のうち `(joho_henko_tekiyo_date, rireki_no)` が最大の行（現在行）を対象とする。未入力時 ACSMS-MSG-026-006        |
| 2   | report_type     | String   | -        | 〇   |        |        | 帳票種別。`hanbaiten`: 販売店別購読者名簿（照会用、デフォルト）／`kanri_shiten`: 管理支店別購読者名簿                                                  |
| 3   | hanbaiten_ids   | Number[] | 〇       | △    |        |        | 販売店ID（複数選択可）。`report_type=hanbaiten` のとき必須（1件以上）。未選択時 ACSMS-MSG-026-002                                                      |
| 4   | kanri_shiten_ids| Number[] | 〇       | △    |        |        | 管理支店ID（複数選択可）。`report_type=kanri_shiten` のとき必須（1件以上）。未選択時 ACSMS-MSG-026-003                                                 |
| 5   | shiten_ids      | Number[] | 〇       | -    |        |        | 支店ID（配達担当支店・複数選択可）。**任意**（顧客要件2026-08 改訂。一時期必須だったが、支店未設定の購読者が出力できなくなるため戻した）。未指定・空配列なら絞り込まない（＝支店未設定の購読者も出力対象）。指定時は選択した管理支店配下をさらに絞る（`t_dokusya_rireki.shiten_id` が指定値のいずれかに一致）。`report_type=hanbaiten` では帳票に支店列が無いため無視する。画面の候補は金融機関支店以外（`kinyu_shiten_flg=FALSE`）のみ。※**指定した場合のみ**、支店未設定（shiten_id が NULL）の購読者は対象外になる（`NULL IN (...)` は成立しないため）。電子版連携の購読者は常に shiten_id=NULL |
| 6   | dokusya_shubetsu| Number   | -        | -    |        |        | 購読種別フィルタ ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版）。未指定時は紙版＋電子版（両方）を出力。併読(3)は本パラメータでは選択不可（`IsIn` で拒否）。ただし `report_type=kanri_shiten` の集計対象には有料併読が含まれる — 詳細は4.3参照 |
| 7   | shiharai_hoho   | Number   | -        | -    |        |        | 支払方法（m_code SHIHARAI_HOHO: 1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）。`t_dokusya_rireki.shiharai_hoho` で絞込み。両帳票種別で有効（画面項目No.7 常時表示）。未指定の場合すべて出力。旧 `shiharai_cycle`（支払サイクル）から変更 |
| 8   | page            | Number   | -        | -    |        |        | 文書ページ番号（1始まり）。未指定時は1。動的A4ページング（顧客要件2026-07）— 明細の可変高（氏名・住所の折返し）を積算しA4 1ページに収まる範囲で改ページするため、1ページあたりの行数は可変。**1レスポンス＝1文書ページ**（`report_type=hanbaiten` は販売店1件分、`kanri_shiten` は管理支店1件分）を返す。ページ範囲外・省略時は自動的に有効範囲へクランプする |

## レスポンスデータ

※ 動的A4ページング（顧客要件2026-07）— `hanbaiten_groups` / `kanri_shiten_groups` にはページ内に収まる **1グループ分のみ** が入る（複数の販売店/管理支店を1レスポンスに混在させない）。グループが複数ページにまたがる場合、2ページ目以降の見出しには「（続き）」相当の `is_continued` が付与され、小計・合計はグループの最終ページにのみ出力される（`show_total` / `show_subtotal`）。0件時は #43〜50 の下記ページングメタのみ既定値で返し、両グループ配列は空。

| #   | 項目ID                          | タイプ   | 繰り返し | フォーマット | Nullable | 説明                                                                                              |
| --- | ------------------------------- | -------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| 1   | data                            | Object   | -        |              | -        | プレビューデータ                                                                                  |
| 2   | →report_type                    | String   | -        |              | -        | 帳票種別（`hanbaiten` / `kanri_shiten`）                                                          |
| 3   | →tekiyo_date                    | String   | -        | YYYY-MM-DD   | -        | 適用日                                                                                            |
| 3a  | →ja_name                        | String   | -        |              | -        | JA名（帳票ヘッダの組合情報）                                                                       |
| 3b  | →ja_tel                         | String   | -        |              | -        | JA電話番号（帳票ヘッダ）                                                                           |
| 4   | →grand_total_busu               | Number   | -        |              | -        | 全体合計部数                                                                                      |
| 5   | →hanbaiten_groups               | Array    | 〇       |              | -        | 販売店別グループ（`report_type=hanbaiten` のときのみ。それ以外は空配列）                          |
| 6   | →→hanbaiten_id                  | Number   | -        |              | -        | 販売店ID                                                                                          |
| 7   | →→hanbaiten_name                | String   | -        |              | -        | 販売店名                                                                                          |
| 7a  | →→hanbaiten_code                | String   | -        |              | -        | 販売店コード（帳票ヘッダ）                                                                         |
| 7b  | →→hanbaiten_tel                 | String   | -        |              | -        | 販売店電話番号（帳票ヘッダ、空文字許容）                                                           |
| 7c  | →→hanbaiten_fax                 | String   | -        |              | -        | 販売店FAX（帳票ヘッダ、空文字許容）                                                                |
| 8   | →→total_busu                    | Number   | -        |              | -        | 販売店の合計部数（合計行）                                                                        |
| 8d  | →→is_continued                  | Boolean  | -        |              | -        | 動的ページング: 当該販売店グループが前ページから続いているか（省略時 false 相当）                 |
| 8e  | →→show_total                    | Boolean  | -        |              | -        | 動的ページング: このページで合計行(total_busu)を表示するか（グループ最終ページで true）           |
| 9   | →→kanri_shiten_groups           | Array    | 〇       |              | -        | 管理支店別サブグループ                                                                            |
| 10  | →→→kanri_shiten_id              | Number   | -        |              | 〇       | 管理支店ID（未割当の場合 null）                                                                   |
| 11  | →→→kanri_shiten_name            | String   | -        |              | -        | 管理支店名（未割当の場合 `""`）                                                                   |
| 12  | →→→subtotal_busu                | Number   | -        |              | -        | 管理支店の小計部数（小計行）                                                                      |
| 12d | →→→is_continued                 | Boolean  | -        |              | -        | 動的ページング: 当該サブグループが前ページから続いているか                                       |
| 12e | →→→show_subtotal                | Boolean  | -        |              | -        | 動的ページング: このページで小計行(subtotal_busu)を表示するか                                    |
| 13  | →→→rows                         | Array    | 〇       |              | -        | 購読者明細行（管理支店コード, 購読者ID 順）                                                       |
| 14  | →→→→dokusya_id                  | Number   | -        |              | -        | 購読者ID                                                                                          |
| 15  | →→→→shimei                      | String   | -        |              | -        | 配達先氏名（配達先情報指定がTrueの場合は購読者名を使用）                                          |
| 16  | →→→→shimei_kana                 | String   | -        |              | -        | 配達先氏名かな                                                                                    |
| 17  | →→→→haitatsu_address            | String   | -        | 〒{7}+市町村郡+丁目番地+建物名 | - | 配達先住所（郵便番号+市町村郡+丁目番地+建物名）                                          |
| 18  | →→→→kanri_shiten_name           | String   | -        |              | -        | 管理支店名                                                                                        |
| 19  | →→→→haitatsu_tel                | String   | -        |              | -        | 配達先電話番号（配達先連絡先１、空欄は `""`）                                                     |
| 20  | →→→→dokusya_kaishi_date         | String   | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                        |
| 21  | →→→→dokusya_busu                | Number   | -        |              | -        | 購読部数                                                                                          |
| 22  | →kanri_shiten_groups            | Array    | 〇       |              | -        | 管理支店別グループ（`report_type=kanri_shiten` のときのみ。それ以外は空配列）                     |
| 23  | →→kanri_shiten_id               | Number   | -        |              | 〇       | 管理支店ID（未割当の場合 null）                                                                   |
| 24  | →→kanri_shiten_name             | String   | -        |              | -        | 管理支店名                                                                                        |
| 25  | →→subtotal_busu                 | Number   | -        |              | -        | 管理支店の小計部数（小計行）                                                                      |
| 26  | →→total_busu                    | Number   | -        |              | -        | 管理支店の合計部数（合計行）                                                                      |
| 26d | →→is_continued                  | Boolean  | -        |              | -        | 動的ページング: 当該管理支店グループが前ページから続いているか                                   |
| 26e | →→show_subtotal                 | Boolean  | -        |              | -        | 動的ページング: このページで小計行(subtotal_busu)を表示するか                                    |
| 26f | →→show_total                    | Boolean  | -        |              | -        | 動的ページング: このページで合計行(total_busu)を表示するか（グループ最終ページで true）           |
| 27  | →→rows                          | Array    | 〇       |              | -        | 購読者明細行（管理支店コード, 購読者ID 順）                                                       |
| 28  | →→→dokusya_id                   | Number   | -        |              | -        | 購読者ID                                                                                          |
| 29  | →→→dokusya_shubetsu             | Number   | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（ラベルはFE側で `useCodesStore().label('DOKUSYA_SHUBETSU', value)` から取得）|
| 30  | →→→shimei                       | String   | -        |              | -        | 購読者名                                                                                          |
| 31  | →→→shimei_kana                  | String   | -        |              | -        | 購読者かな                                                                                        |
| 32  | →→→kumiaiin_code                | String   | -        |              | -        | 組合員コード（空欄は `""`）                                                                       |
| 33  | →→→haitatsu_tel                 | String   | -        |              | -        | 配達先電話番号（配達先連絡先１、空欄は `""`）                                                     |
| 34  | →→→shiten_name                  | String   | -        |              | -        | 支店名（配達担当支店、未割当は `""`）                                                             |
| 35  | →→→haitatsu_address             | String   | -        | 〒{7}+市町村郡+丁目番地+建物名 | - | 配達先住所                                                                              |
| 36  | →→→dokusya_busu                 | Number   | -        |              | -        | 購読部数                                                                                          |
| 37  | →→→shiharai_hoho                | Number   | -        |              | -        | 支払い方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（ラベルはFE側で `useCodesStore().label('SHIHARAI_HOHO', value)` から取得）|
| 38  | →→→dokusya_kaishi_date          | String   | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                        |
| 39  | →→→hanbaiten_name               | String   | -        |              | -        | 配達担当販売店名                                                                                  |
| 40  | →page_no                        | Number   | -        |              | -        | 動的A4ページング（顧客要件2026-07）。当該レスポンスの文書ページ番号（1始まり）                    |
| 41  | →per_page                       | Number   | -        |              | -        | 1ページあたり行数の名目値（`MEIBO_PREVIEW_PER_PAGE`=15）。実際の改ページはA4高さ基準の動的計算のため参考値 |
| 42  | →total_pages                    | Number   | -        |              | -        | 全文書ページ数（全グループ通算）。ページャの総ページ数として使用                                  |
| 43  | →total_rows                     | Number   | -        |              | -        | 全明細行数（グループ・小計・合計行を除く購読者行の総数）                                          |
| 44  | →is_last_page                   | Boolean  | -        |              | -        | 当該レスポンスが最終文書ページか                                                                  |
| 45  | →group_count                    | Number   | -        |              | -        | 全ページ通算のトップレベルグループ数（販売店別=販売店数／管理支店別=管理支店数）                  |
| 46  | →group_page_no                  | Number   | -        |              | -        | 当該レスポンスが属するグループ内でのページ番号（1始まり）。帳票ヘッダの「ページ数」表示に使用     |
| 47  | →group_total_pages              | Number   | -        |              | -        | 当該レスポンスが属するグループのページ総数                                                        |

※ #40〜47 は `report_type` に関わらず常に返す（プレビュー専用。Excel出力は単一ファイルのため付与しない）。0件時は `page_no=1, per_page=15, total_pages=1, total_rows=0, is_last_page=true, group_count=0, group_page_no=1, group_total_pages=1` を返す。

## リクエスト例

```
GET /api/v1/report/meibo/preview?tekiyo_date=2026-04-01&report_type=hanbaiten&hanbaiten_ids=1&hanbaiten_ids=2&dokusya_shubetsu=1
```

## レスポンス成功例

### 販売店別購読者名簿（report_type=hanbaiten）

```json
{
  "data": {
    "report_type": "hanbaiten",
    "tekiyo_date": "2026-04-01",
    "ja_name": "○○農業協同組合",
    "ja_tel": "03-1111-2222",
    "grand_total_busu": 5,
    "hanbaiten_groups": [
      {
        "hanbaiten_id": 1,
        "hanbaiten_name": "東京中央販売店",
        "hanbaiten_code": "0000000001",
        "hanbaiten_tel": "03-2222-3333",
        "hanbaiten_fax": "03-2222-3334",
        "total_busu": 5,
        "is_continued": false,
        "show_total": true,
        "kanri_shiten_groups": [
          {
            "kanri_shiten_id": 10,
            "kanri_shiten_name": "中央管理支店",
            "subtotal_busu": 3,
            "is_continued": false,
            "show_subtotal": true,
            "rows": [
              {
                "dokusya_id": 1001,
                "shimei": "農業 太郎",
                "shimei_kana": "ﾉｳｷﾞｮｳ ﾀﾛｳ",
                "haitatsu_address": "〒1000001東京都千代田区千代田1-1サンプルビル101",
                "kanri_shiten_name": "中央管理支店",
                "haitatsu_tel": "03-1234-5678",
                "dokusya_kaishi_date": "2025-04-01",
                "dokusya_busu": 3
              }
            ]
          }
        ]
      }
    ],
    "kanri_shiten_groups": [],
    "page_no": 1,
    "per_page": 15,
    "total_pages": 1,
    "total_rows": 1,
    "is_last_page": true,
    "group_count": 1,
    "group_page_no": 1,
    "group_total_pages": 1
  }
}
```

※ 1レスポンス＝1文書ページ（1グループ分）。`hanbaiten_ids` に複数の販売店を指定した場合は、`page` を進めて2件目以降の販売店グループを取得する（`total_pages` / `is_last_page` を参照）。

### 管理支店別購読者名簿（report_type=kanri_shiten）

```json
{
  "data": {
    "report_type": "kanri_shiten",
    "tekiyo_date": "2026-04-01",
    "ja_name": "○○農業協同組合",
    "ja_tel": "03-1111-2222",
    "grand_total_busu": 2,
    "hanbaiten_groups": [],
    "kanri_shiten_groups": [
      {
        "kanri_shiten_id": 10,
        "kanri_shiten_name": "中央管理支店",
        "subtotal_busu": 2,
        "total_busu": 2,
        "is_continued": false,
        "show_subtotal": true,
        "show_total": true,
        "rows": [
          {
            "dokusya_id": 1001,
            "dokusya_shubetsu": 1,
            "shimei": "農業 太郎",
            "shimei_kana": "ﾉｳｷﾞｮｳ ﾀﾛｳ",
            "kumiaiin_code": "K0001",
            "haitatsu_tel": "03-1234-5678",
            "shiten_name": "千代田支店",
            "haitatsu_address": "〒1000001東京都千代田区千代田1-1サンプルビル101",
            "dokusya_busu": 2,
            "shiharai_hoho": 1,
            "dokusya_kaishi_date": "2025-04-01",
            "hanbaiten_name": "東京中央販売店"
          }
        ]
      }
    ],
    "page_no": 1,
    "per_page": 15,
    "total_pages": 1,
    "total_rows": 1,
    "is_last_page": true,
    "group_count": 1,
    "group_page_no": 1,
    "group_total_pages": 1
  }
}
```

※ 対象データが0件の場合は HTTP 200 で `hanbaiten_groups` / `kanri_shiten_groups` を空配列（`grand_total_busu: 0`）として返す。ページングメタは `page_no=1, per_page=15, total_pages=1, total_rows=0, is_last_page=true, group_count=0, group_page_no=1, group_total_pages=1` の既定値になる。FE は ACSMS-MSG-026-004「対象のデータが存在しません。」を表示する（プレビューでは404を返さない）。

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "tekiyo_date", "message": "必須項目です。" },
    { "field": "hanbaiten_ids", "message": "販売店を1件以上選択してください。" }
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
  - tekiyo_date：必須、有効な日付形式（YYYY-MM-DD）。未入力の場合：`errors[]` に `{ field: "tekiyo_date", message: "必須項目です。" }`（ACSMS-MSG-026-006）
  - report_type：必須、`hanbaiten` または `kanri_shiten`
  - report_type = `hanbaiten` の場合：hanbaiten_ids が1件以上必須。未選択の場合：`{ field: "hanbaiten_ids", message: "販売店を1件以上選択してください。" }`（ACSMS-MSG-026-002）
  - report_type = `kanri_shiten` の場合：kanri_shiten_ids が1件以上必須。未選択の場合：`{ field: "kanri_shiten_ids", message: "管理支店を1件以上選択してください。" }`（ACSMS-MSG-026-003）
  - dokusya_shubetsu：指定時は 1（紙版）または 2（電子版）のみ許可（`@IsIn`）。併読(3)は本パラメータでは選択不可（4.3の集計対象ロジックとは別軸）
  - shiten_ids：任意。未指定・空配列なら絞り込まない（支店未設定の購読者も対象）。`report_type=hanbaiten` では無視する
  - shiharai_hoho：任意。指定時は整数（m_code SHIHARAI_HOHO）※旧記載の `shiharai_cycle` は実装に存在しない誤記のため訂正
  - page：任意。指定時は1以上の整数（未指定時1）。動的A4ページング（顧客要件2026-07）
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_meibo`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（日農 管理者 / 日農 担当者 は本権限を持たないため403。FE は ACSMS-MSG-026-001 を表示）
- `ShitenRestrictedGuard`（顧客要件2026-07）: `session.shiten_id` が設定されたアカウントは権限保持の有無に関わらず HTTP 403 (`FORBIDDEN`)「所属支店が設定されたアカウントはこの機能を使用できません。」（エラー一覧#9）
- DataScope（`applyBranchScope()` によるクエリの WHERE 絞込み。個別の存在検証・例外送出は行わない）:
  - CHUOKAI / JA_HONTEN: `ja_id = user.ja_id`
  - JA_KANRI_SHITEN: `kanri_shiten_id = user.kanri_shiten_id`（`ja_id` 条件は付与しない。管理支店は必ず特定のJAに属するため実質的にJA単位でも絞り込まれる）
- 指定された hanbaiten_ids / kanri_shiten_ids のうちスコープ外のIDは上記WHERE条件で暗黙的に除外される（`DATA_SCOPE_VIOLATION` は返さない）。全指定IDがスコープ外の場合は対象0件として扱われる（本APIはHTTP 200 + 空グループを返す。4.5参照）

### 4.3 データ取得条件の設定

- 各 dokusya_id について `joho_henko_tekiyo_date <= :tekiyo_date` を満たす行のうち、`torikeshi_flg = false`（取消済でない）の中で `(joho_henko_tekiyo_date, rireki_no)` の組が最大の行（現在行 = 適用日時点の最新スナップショット）を対象とする。単純な `MAX(rireki_no)` ではない — バックデート登録時に joho の小さい行を誤選択しないため、まず `joho_henko_tekiyo_date` の最大、同着なら `rireki_no` の最大で決める。
- 抽出条件：
  - `t_dokusya.deleted_at IS NULL`（論理削除済み購読者を除外。削除済み購読者の現在行は `torikeshi_flg=false` のまま残るため、履歴側だけでは除外できない）
  - `torikeshi_flg = false`（取消(赤伝)済みの行は現在行として選ばない）
  - `tetsuzuki_shurui = 1`（新規）のみ。解約（`tetsuzuki_shurui = 0`）は除外
  - `dokusya_busu > 0`（部数0行を除外）。解約予約(Phase 1)行は `tetsuzuki_shurui = 1` のまま `dokusya_busu = 0` で到来日バッチが確定するまで残るため、部数条件が無いと「0部の有効な読者」として名簿に出てしまう不具合があった
  - **集計対象（購読種別）は帳票種別ごとに異なる（顧客要件 2026-08）**:
    - `hanbaiten`（販売店別）: `dokusya_shubetsu = 1`（紙版のみ）。併読・電子版は有料/無料とも対象外
    - `kanri_shiten`（管理支店別）: 紙版(1) は無条件で対象。併読(3) は
      `denshi_dokusya_shubetsu = 1`（有料）のみ対象。電子版(2) は
      `denshi_dokusya_shubetsu = 1`（有料）かつ `denshi_shonin_status = 1`（承認済）
      のみ対象。無料（`denshi_dokusya_shubetsu = 0`）は併読・電子版とも対象外
    - `denshi_dokusya_shubetsu` は電子版・併読なら値を持ち、NULL になるのは紙版のみ
      という前提（顧客確認 2026-08）
  - dokusya_shubetsu 指定時は該当値（1 または 2）で絞込み（帳票種別ごとの集計対象条件に加えて適用）
  - report_type = `hanbaiten`: `hanbaiten_id IN (:hanbaiten_ids)`
  - report_type = `kanri_shiten`: `kanri_shiten_id IN (:kanri_shiten_ids)`
  - report_type = `kanri_shiten` かつ shiten_ids 指定時は `shiten_id IN (:shiten_ids)` を追加（配達担当支店で絞込み）。空配列・未指定なら絞らない。`hanbaiten` では適用しない
  - shiharai_hoho 指定時は `shiharai_hoho = :shiharai_hoho`（両帳票種別で適用）※旧記載の `dokusyaryo_shiharai_cycle` は実装に存在しない誤記のため訂正
  - DataScope 条件を付与
- ページング（プレビューのみ）：抽出結果を report_type に応じてグループ化（4.5）した後、`buildMeiboDocPages` で明細の可変高を積算しA4 1ページに収まる範囲で文書ページへ分割する。`page` に対応する1ページ分のみを応答する。

### 4.4 データ取得

```sql
SELECT r.dokusya_id, r.dokusya_shubetsu,
       r.shimei_sei, r.shimei_mei,
       r.shimei_kana_sei, r.shimei_kana_mei,
       r.haitatsu_same_flg,
       r.haitatsu_shimei_sei, r.haitatsu_shimei_mei,
       r.haitatsu_shimei_kana_sei, r.haitatsu_shimei_kana_mei,
       r.kumiaiin_code,
       r.haitatsu_yubin_no, r.haitatsu_shikuchoson,
       r.haitatsu_chome_banchi, r.haitatsu_tatemono_mei,
       r.haitatsu_renrakusaki_1,
       -- 購読者本人の住所・連絡先（haitatsu_same_flg=TRUE のとき配達先として使用）
       r.yubin_no, r.shikuchoson, r.chome_banchi, r.tatemono_mei, r.renrakusaki_1,
       r.dokusya_kaishi_date, r.dokusya_busu,
       r.shiharai_hoho, r.dokusyaryo_shiharai_cycle,
       r.kanri_shiten_id, ks.kanri_shiten_name,
       r.shiten_id, s.shiten_name,
       r.hanbaiten_id, h.hanbaiten_name, h.hanbaiten_code, h.tel AS hanbaiten_tel, h.fax AS hanbaiten_fax,
       j.ja_name, j.tel AS ja_tel
FROM t_dokusya_rireki r
-- 論理削除済み購読者を除外（現在行は購読者削除後も torikeshi_flg=false のまま残るため明示チェックが必要）
INNER JOIN t_dokusya d
  ON d.dokusya_id = r.dokusya_id AND d.deleted_at IS NULL
INNER JOIN m_hanbaiten h
  ON h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL
INNER JOIN m_ja j
  ON j.ja_id = r.ja_id AND j.deleted_at IS NULL
LEFT JOIN m_kanri_shiten ks
  ON ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL
LEFT JOIN m_shiten s
  ON s.shiten_id = r.shiten_id AND s.deleted_at IS NULL
WHERE r.joho_henko_tekiyo_date <= :tekiyo_date
  AND r.torikeshi_flg = false                          -- 取消(赤伝)済み行は現在行として選ばない
  -- 現在行 = (joho_henko_tekiyo_date, rireki_no) の組が最大の行。単純な MAX(rireki_no) だと
  -- バックデート時に joho の小さい行を誤選択するため、相関サブクエリで組の最大値を照合する。
  AND (r.joho_henko_tekiyo_date, r.rireki_no) = (
        SELECT r2.joho_henko_tekiyo_date, r2.rireki_no
        FROM t_dokusya_rireki r2
        WHERE r2.dokusya_id = r.dokusya_id
          AND r2.joho_henko_tekiyo_date <= :tekiyo_date
          AND r2.torikeshi_flg = false
        ORDER BY r2.joho_henko_tekiyo_date DESC, r2.rireki_no DESC
        LIMIT 1
      )
  AND r.tetsuzuki_shurui = 1                            -- 新規のみ（解約=0は除外）
  AND r.dokusya_busu > 0                                -- 解約予約(Phase1)の0部行を除外
  -- 集計対象（購読種別）は帳票種別ごとに異なる（顧客要件2026-08 #56597）
  AND (
    CASE WHEN :report_type = 'hanbaiten' THEN
      r.dokusya_shubetsu = 1                                                     -- 紙版のみ
    ELSE
      r.dokusya_shubetsu = 1                                                     -- 紙版：無条件
      OR (r.dokusya_shubetsu = 3 AND r.denshi_dokusya_shubetsu = 1)              -- 併読：有料のみ
      OR (r.dokusya_shubetsu = 2 AND r.denshi_shonin_status = 1
          AND r.denshi_dokusya_shubetsu = 1)                                     -- 電子版：有料かつ承認済のみ
    END
  )
  AND (:dokusya_shubetsu IS NULL OR r.dokusya_shubetsu = :dokusya_shubetsu)
  /* report_type = hanbaiten */
  AND (:report_type <> 'hanbaiten' OR r.hanbaiten_id = ANY(:hanbaiten_ids))
  /* report_type = kanri_shiten */
  AND (:report_type <> 'kanri_shiten' OR r.kanri_shiten_id = ANY(:kanri_shiten_ids))
  /* 支店（配達担当支店）— 管理支店別のみ・任意。shiten_id は NULL 許容のため、
     指定すると支店未設定の購読者は対象外になる */
  AND (:report_type = 'hanbaiten' OR :shiten_ids IS NULL OR r.shiten_id = ANY(:shiten_ids))
  /* 支払方法（m_code SHIHARAI_HOHO）— 両帳票種別で適用 */
  AND (:shiharai_hoho IS NULL OR r.shiharai_hoho = :shiharai_hoho)
  /* DataScope: CHUOKAI/JA_HONTEN → ja_id、JA_KANRI_SHITEN → kanri_shiten_id */
  AND r.ja_id = :ja_id
  AND (:user_kanri_shiten_id IS NULL OR r.kanri_shiten_id = :user_kanri_shiten_id)
ORDER BY
  /* 販売店別: 販売店 → 管理支店 → 購読者ID */
  /* 管理支店別: 管理支店 → 購読者ID */
  r.hanbaiten_id, r.kanri_shiten_id, r.dokusya_id
```

※ 上記は `MeiboReportService.meiboBaseQuery()` / `applyShubetsuScope()` / `applyMeiboOrder()`（`apps/backend/src/modules/report/meibo-report.service.ts`）のロジックを平易なSQLに書き起こしたもの。実装は QueryBuilder（`getRawMany`）で組み立てており、上記は等価な単一クエリでの表現。取得後、report_type に応じてグループ化（4.5）し、`buildMeiboDocPages`（`report.mapper.ts`）でA4文書ページへ分割してから `page` に該当するページのみを返す（プレビュー）。Excel出力（4.3/002）は全件を1ワークブックに出力するためページングしない。

### 4.5 レスポンス生成

- 取得結果を report_type に応じてグループ化する。
  - `hanbaiten`: 販売店 → 管理支店 → 購読者 の順でネスト。管理支店ごとに小計（subtotal_busu）、販売店ごとに合計（total_busu）、全体合計（grand_total_busu）を算出。
  - `kanri_shiten`: 管理支店 → 購読者 の順。管理支店ごとに小計・合計、全体合計を算出。
- ja_name / ja_tel（帳票ヘッダの組合情報）は取得結果の先頭行（全行同一JAスコープ）から取得。0件時は空文字。
- 配達先氏名・かな：`haitatsu_same_flg = TRUE`（購読者と同じ）の場合は購読者名（shimei_sei + shimei_mei）・かなを使用、それ以外は配達先氏名（haitatsu_shimei_*）を使用。
- haitatsu_address：`haitatsu_same_flg = TRUE` の場合は購読者本人の住所（`〒`+yubin_no+shikuchoson+chome_banchi+tatemono_mei）、それ以外は配達先住所（`〒`+haitatsu_yubin_no+haitatsu_shikuchoson+haitatsu_chome_banchi+haitatsu_tatemono_mei）を連結。
- dokusya_shubetsu / shiharai_hoho は m_code の数値コードをそのまま返却し、ラベルはFE側で `useCodesStore().label(...)` から取得する。
- グループ化済みデータを `buildMeiboDocPages`（動的A4ページング・顧客要件2026-07）で文書ページ配列に分割し、`page`（未指定時1、範囲外は有効範囲へクランプ）に対応する1ページ分のみを応答する。0件時はページングをスキップし、空グループ＋既定のページングメタ（`page_no=1` 等）を返す。
- data オブジェクトへページングメタ（page_no/per_page/total_pages/total_rows/is_last_page/group_count/group_page_no/group_total_pages）を付与したJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（FE は ACSMS-MSG-026-005 を表示）

---

# API ACSMS-API-026-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API名                  | Export Subscriber Meibo Excel                                                                                                                                                                                 |
| 概要                   | プレビューと同一条件で購読者名簿を生成し、Excel形式（.xlsx）でダウンロードする。生成ファイルはS3に保存し、ダウンロード履歴（t_file_download）に記録する。                                                       |
| URI                    | /api/v1/report/meibo/export                                                                                                                                                                                   |
| メソッド               | GET                                                                                                                                                                                                           |
| リクエストボディー     | なし                                                                                                                                                                                                          |
| リクエストパラメーター | クエリパラメータ（ACSMS-API-026-001 と共通のDTO。`nichino_download_allowed_flg` を追加で受け付ける。`page` も受理はされるが無視される）                                                                        |
| ヘッダ                 | Content-Type: application/json ※ 認証情報はHTTP-only Cookieにより自動的に送信される。成功時のレスポンスは `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`                                |
| HTTPレスポンスコード   | 200:正常にExcelをダウンロードしました, 400:入力値が不正です, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:対象のデータが存在しません, 500:システムエラーが発生しました |

## リクエストパラメータ

ACSMS-API-026-001（Preview）と共通のDTO（`page` を除く）＋ export 専用の `nichino_download_allowed_flg`。

| #   | パラメーターID  | タイプ   | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                          |
| --- | --------------- | -------- | -------- | ---- | ------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | tekiyo_date     | String   | -        | 〇   |        | 10     | 適用日（YYYY-MM-DD）。ファイル名の対象年月にも使用                                                            |
| 2   | report_type     | String   | -        | 〇   |        |        | 帳票種別（`hanbaiten` / `kanri_shiten`）                                                                     |
| 3   | hanbaiten_ids   | Number[] | 〇       | △    |        |        | 販売店ID（複数選択可）。`report_type=hanbaiten` のとき必須                                                    |
| 4   | kanri_shiten_ids| Number[] | 〇       | △    |        |        | 管理支店ID（複数選択可）。`report_type=kanri_shiten` のとき必須                                               |
| 5   | shiten_ids      | Number[] | 〇       | -    |        |        | 支店ID（配達担当支店・複数選択可）。**任意**（顧客要件2026-08 改訂。一時期必須だったが、支店未設定の購読者が出力できなくなるため戻した）。未指定・空配列なら絞り込まない（＝支店未設定の購読者も出力対象）。指定時は選択した管理支店配下をさらに絞る（`t_dokusya_rireki.shiten_id` が指定値のいずれかに一致）。`report_type=hanbaiten` では帳票に支店列が無いため無視する。画面の候補は金融機関支店以外（`kinyu_shiten_flg=FALSE`）のみ。※**指定した場合のみ**、支店未設定（shiten_id が NULL）の購読者は対象外になる（`NULL IN (...)` は成立しないため）。電子版連携の購読者は常に shiten_id=NULL |
| 6   | dokusya_shubetsu| Number   | -        | -    |        |        | 購読種別フィルタ ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版）。未指定時は紙版＋電子版（両方）を出力。併読(3)は本パラメータでは選択不可（集計対象への含有ロジックは4.3参照） |
| 7   | shiharai_hoho   | Number   | -        | -    |        |        | 支払方法（m_code SHIHARAI_HOHO）。両帳票種別で有効。※旧記載の `shiharai_cycle`（支払サイクル）は実装に存在しない誤記のため訂正 |
| 8   | nichino_download_allowed_flg | Boolean | -  | -    |        |        | 日農ダウンロード許可フラグ（既定 false）。true のとき日農担当者（NICHINO_ADMIN/STAFF）がダウンロード画面（ACSMS-SCR-022）から本ファイルをダウンロード可能になる |

※ `page`（プレビューAPIのページ番号）は共有DTOのため export でも受理される（バリデーションエラーにならない）が、Excel出力は常に全件を1ワークブックへ出力するため無視される。

## レスポンスデータ

成功時はExcelバイナリ（添付ファイル）を返却する。JSONボディは返さない。

| 項目                | 内容                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Content-Type        | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet                                    |
| Content-Disposition | `attachment; filename="{ASCII別名}"; filename*=UTF-8''{URLエンコードした日本語ファイル名}`。日本語名は `{販売店別\|管理支店別}購読者名簿_{YYYY年MM月}.xlsx`（例: 販売店別購読者名簿_2026年04月.xlsx）、ASCII別名は `meibo_{report_type}_{YYYYMM}.xlsx`（例: meibo_hanbaiten_202604.xlsx） |
| シート名            | 購読者名簿                                                                                            |
| データ構成          | プレビューと同一構成の明細（管理支店ごとに小計行のみ。合計行・全体合計行は出力しない）               |

## リクエスト例

```
GET /api/v1/report/meibo/export?tekiyo_date=2026-04-01&report_type=hanbaiten&hanbaiten_ids=1&hanbaiten_ids=2
```

## レスポンス成功例

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="meibo_hanbaiten_202604.xlsx"; filename*=UTF-8''%E8%B2%A9%E5%A3%B2%E5%BA%97%E5%88%A5%E8%B3%BC%E8%AA%AD%E8%80%85%E5%90%8D%E7%B0%BF_2026%E5%B9%B404%E6%9C%88.xlsx

（Excelバイナリデータ）
```

## レスポンス失敗例

### 400 Bad Request（バリデーション）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "kanri_shiten_ids", "message": "管理支店を1件以上選択してください。" }]
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

### 404 Not Found（対象データなし）

```json
{
  "error_code": "REPORT_NO_DATA",
  "message": "対象のデータが存在しません。"
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

> ※ 4.5 ファイルダウンロード履歴の記録は、S3保存が成功した後に実行する。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- ACSMS-API-026-001 の 4.1 と同一。
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `report.export_meibo`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)（FE は ACSMS-MSG-026-001 を表示）
- `ShitenRestrictedGuard`（顧客要件2026-07）: `session.shiten_id` が設定されたアカウントは権限保持の有無に関わらず HTTP 403 (`FORBIDDEN`)「所属支店が設定されたアカウントはこの機能を使用できません。」（エラー一覧#9。`ReportController` にコントローラ単位で適用されるため export も対象）
- DataScope（`applyBranchScope()` によるクエリの WHERE 絞込み。個別の存在検証・例外送出は行わない）:
  - CHUOKAI / JA_HONTEN: `ja_id = user.ja_id`
  - JA_KANRI_SHITEN: `kanri_shiten_id = user.kanri_shiten_id`（`ja_id` 条件は付与しない）
- 指定された hanbaiten_ids / kanri_shiten_ids のうちスコープ外のIDは上記WHERE条件で暗黙的に除外される（`DATA_SCOPE_VIOLATION` は返さない）。全指定IDがスコープ外の場合は対象0件として扱われる（Excelは生成せずHTTP 404 `REPORT_NO_DATA`。4.3参照）

### 4.3 データ取得

- ACSMS-API-026-001 の 4.3 / 4.4 と同一のSQLでデータを取得し、report_type に応じてグループ化（小計・合計を含む）する。
- 取得結果が0件の場合：HTTP 404 (`REPORT_NO_DATA`)（Excelファイルは生成しない。FE は ACSMS-MSG-026-004 を表示）

### 4.4 Excelファイル生成・S3保存

- グループ化済みデータ（小計行を含む。合計行・全体合計行は出力しない）を Excel（.xlsx）に出力する（`MeiboReportService.buildExcelBuffer()`）。
  - シート名：購読者名簿
  - ダウンロード名（Content-Disposition用・タイムスタンプ無し）：`{販売店別|管理支店別}購読者名簿_{YYYY年MM月}.xlsx`（適用日 tekiyo_date に基づく。例：販売店別購読者名簿_2026年04月.xlsx）
- 生成した Excel は帳票出力5画面共通の `FileArchiveService.archive()` で S3 保存＋`t_file_download` 登録を1呼び出しで行う（4.5参照）。
  - S3キー：`reports/meibo/{ja_code}/{report_type}/{tekiyo_dateの年}/{ダウンロード名の拡張子無し部分}_{保存日時14桁(JST, yyyyMMddHHmmss)}.xlsx`。例：`reports/meibo/JA0001/hanbaiten/2026/販売店別購読者名簿_2026年04月_20260805153000.xlsx`。S3キーはタイムスタンプ付きで一意化するため、ダウンロード名（4.4冒頭・レスポンスのfilename）とは異なる文字列になる。
  - `ja_code` は出力者の `session.ja_id` から `m_ja` を解決（見つからない場合は `ja_id` の文字列、`ja_id` が null の場合は `unknown`。本画面は権限上 `ja_id` が必ず設定されるため到達しない）。

### 4.5 ファイルダウンロード履歴の記録

- `FileArchiveService.archive()` が S3 保存に続けて以下のとおり `t_file_download` へ1行登録する（download_type = 5: 購読者名簿）。TypeORM の `repository.save()` 経由のため、下記は等価な INSERT 相当。

```sql
INSERT INTO t_file_download (ja_id, download_datetime, download_type,
                            scheduled_delete_date, nichino_download_allowed_flg,
                            file_name, file_path, file_size,
                            record_count, target_month,
                            created_at, created_by)
VALUES (:ja_id, NOW(), 5,
        NOW() + INTERVAL '5 years', :nichino_download_allowed_flg,
        :file_name, :file_path, :file_size,
        :record_count, NULL,
        NOW(), :user_account_id)
```

- `file_name`：ダウンロード名（4.4冒頭、タイムスタンプ無し）。`file_path`：4.4のS3キー（タイムスタンプ付き）。
- `record_count`：抽出した購読者明細行数（4.3で取得した行数。小計行は含まない）。
- `target_month`：本画面では設定しない（常に `NULL`）。
- `scheduled_delete_date`：登録日時 + 5年（帳票アーカイブの共通保管期間）。
- `nichino_download_allowed_flg`：リクエストパラメータ `nichino_download_allowed_flg`（既定 `false`）をそのまま保存。`true` の場合、日農担当者（NICHINO_ADMIN/STAFF）がダウンロード画面（ACSMS-SCR-022）からこのファイルをダウンロード可能になる。
- `created_by`：出力者の `account_id` を文字列化した値（列は `varchar(50)`）。

### 4.6 レスポンス生成

- Content-Type / Content-Disposition を設定し、Excelバイナリを返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー・S3保存エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)（FE は ACSMS-MSG-026-005 を表示）
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者名簿出力画面 (ACSMS-SCR-026)', 'EXPORT', 2,
        NULL, 't_dokusya_rireki',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

※ `target_table` は `MeiboReportService` の `TABLE_NAME` 定数（`t_dokusya_rireki`）。エラーは4.3のデータ取得（DB接続エラー等）やS3保存（4.4）で発生しうるが、監査ログ上のエンティティ文脈は本画面が扱う集計対象テーブルで統一している。`target_id` は集計処理のため常に `NULL`。
