---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: API設計書
screen_id: ACSMS-SCR-011
screen_name: 購読者情報登録画面
format_code: 18-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-05-07
created_date: 2026/05/07
created_by: Tran Duc Tuyen
updated_date: 2026/07/24
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容                                                                                                  | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | --------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1   | 2026/05/07 | 1.0  | Tran Duc Tuyen | 初版作成                                                                                                  | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/05/27 | 1.1  | Tran Duc Tuyen | 画面設計書 v1.1 反映：読者情報変更適用日（joho_henko_tekiyo_date）を入力項目として追加。項目仕様の整合修正 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/05/29 | 1.2  | Tran Duc Tuyen | 画面設計書 v1.1 追加反映：①郵送区分（yubin_kubun）を販売店連動の自動表示から `m_code.code_category='YUBIN_KUBUN'` プルダウン入力項目へ変更（commit e4a3721）、②引落口座支店をテキスト1項目から `bank_shiten_id`（`m_shiten.shiten_id` を `kinyu_shiten_flg=TRUE` で絞り込み）+ 自動表示ラベル（`jastem_toriatsukai_tenpo_code` / `jastem_tenpo_name`）の3項目構成へ分割（commit cdc7ae6）、③機能定義の API パスを `/api/subscribers` から `/api/dokusya` へ統一（commit b2bbe9f）、④画面設計書のマークダウン表構造正規化への追従（commit a3b3204）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/06/16 | 1.3  | Tran Duc Tuyen | 顧客要件 2026-06 反映：更新時の履歴 zenkai_* 退避ルールを変更。`haitatsu_same_flg=TRUE` のときは住所が変更されていなくても購読者住所（todofuken_code / shikuchoson / chome_banchi / tatemono_mei + yubin_no）を常に zenkai_* に格納する。増減報告フラグ（zougen_hokoku_flg）は zenkai_* 退避有無とは独立に、実際の変更（購読部数 / 販売店 / 住所）でのみ判定するよう明確化。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/07/14 | 1.4  | Tran Duc Tuyen | 顧客要件 2026-07：更新(API-011-003)に情報変更モード `change_mode`（'today'当日変更 / 'reserved'予約変更）を追加。当日変更は適用日を本日固定＋紙版の帳票影響項目変更を VALIDATION_ERROR で拒否（電子版は制限なし）。予約変更は適用日必須・未来日のみ・全項目可。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 6   | 2026/07/16 | 1.5  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：購読停止（解約予約）を更新(API-011-003)から分離し、専用エンドポイント `POST /api/v1/dokusya/{dokusya_id}/stop`（ACSMS-API-014-004・購読停止）へ移設。更新APIは `dokusya_chushi_date` を受け付けず、body に含まれると `VALIDATION_ERROR`（@IsEmpty）で 400。当日変更モードの帳票影響項目一覧から `dokusya_chushi_date` を除外。更新画面では購読中止日は読取専用。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 7   | 2026/07/16 | 1.6  | Tran Duc Tuyen | 顧客要件：併読（dokusya_shubetsu=3・紙版＋電子版）は新規登録(API-011-002)不可を明記＋BEガード追加。併読データは電子版読者管理システムがバッチ連携で管理するため、作成は `VALIDATION_ERROR`、編集/停止/削除は `DOKUSYA_READ_ONLY`(403)、Excel取込は取込不可で統一。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 8   | 2026/07/16 | 1.7  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：更新(API-011-003)で **電子版（dokusya_shubetsu=2）は当日変更のみ**とし、`change_mode='reserved'`（予約変更）を `VALIDATION_ERROR`(field=`change_mode`)で拒否（再購読は例外）。紙版のみ当日変更／予約変更の2モードを保持。FEは電子版で編集画面のモードバーを非表示にし当日変更固定で開く。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 9   | 2026/07/17 | 1.8  | Tran Duc Tuyen | 不具合修正（増減報告フラグ）：更新時の `zougen_hokoku_flg` 判定が購読者住所しか見ておらず、`haitatsu_same_flg=FALSE` で別配達先住所を入力しても FALSE のままだった。**実効配達先住所**（same_flg=TRUE→購読者住所 / FALSE→配達先住所）の変更、および `haitatsu_same_flg` の切替を増減トリガに追加し、配達先変更が正しく TRUE になるよう修正（BE: computeZougen）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 10  | 2026/07/17 | 1.9  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：氏名（購読者氏名_氏 `shimei_sei`・購読者氏名_名 `shimei_mei`・配達先氏名 `haitatsu_shimei_sei`/`haitatsu_shimei_mei`）の形式チェックを **漢字のみ → 漢字・ひらがな・カタカナ許容** に緩和（ひらがな/カタカナ表記の氏名の方に対応）。半角カナ・英数字は引き続き不可。形式不正メッセージを「漢字で入力してください。」→「漢字・ひらがな・カタカナで入力してください。」に変更。かな項目（`shimei_kana_*`）の全角ひらがな形式は変更なし。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 11  | 2026/07/23 | 1.10 | Tran Duc Tuyen | 顧客要件 2026-07：氏名4項目（`shimei_sei`/`shimei_mei`/`haitatsu_shimei_sei`/`haitatsu_shimei_mei`）の形式チェックを **漢字・ひらがな・カタカナ → 漢字・ひらがな・カタカナ・アルファベット許容** に拡張（半角A-Za-z・全角Ａ-Ｚ/ａ-ｚ可、半角カナ・数字不可）。メッセージを「漢字・ひらがな・カタカナ・アルファベットで入力してください。」に変更。かな項目は変更なし。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 12  | 2026/07/24 | 1.11 | Tran Duc Tuyen | 顧客要件 2026-07：電子版承認(API-011-004)にリクエストボディ任意 `tanka_id` を追加。承認待ち画面では新聞単価のみ編集可のため、承認時に編集後の単価を保存してから `denshi_shonin_status=1` へ確定する。指定時はテナント跨ぎ FK 検証（`m_tanka` 存在＋自JA）を行う（他JA単価は `DATA_SCOPE_VIOLATION`）。あわせて電子版の編集画面挙動を承認ステータス別に明記：承認待ち(0)=単価のみ編集可＋承認/否認ボタン、承認済(1)=通常編集、否認(2)=全項目読取専用（紙版は本ワークフロー対象外）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 13  | 2026/07/27 | 1.12 | Tran Duc Tuyen | 実装是正：承認(API-011-004)/否認(API-011-005) を §4.4 の**履歴追記方式**（旧 saishin 降格 → rireki_no 採番 → 現行行コピー＋新ステータスで1件 INSERT ＋ 新行を saishin へ昇格し t_dokusya へ即時反映）へ統一。旧実装は t_dokusya と現行履歴行を in-place 更新するだけで履歴が残らなかったため、承認/否認の操作も履歴(t_dokusya_rireki)へ1レコード記録されるよう修正（顧客要件）。承認/否認は電子版(dokusya_shubetsu=2)専用ワークフローであり**電子版は適用日(joho_henko_tekiyo_date)が常に当日**のため、承認/否認イベント行の joho も当日に設定する（現行行の joho を carry-forward しない）。電子版の joho は常に <= 当日なので、当日・最大 rireki_no のこの行が到来日バッチ後も有効行として保たれる。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 14  | 2026/07/31 | 1.13 | Tran Duc Tuyen | 顧客要件 2026-07 改訂（UI統一）：BE仕様は変更なし（電子版の `change_mode='reserved'` 拒否は従来どおり）。FE側の記述のみ更新 — 電子版でもモードバーを表示し「予約変更」ボタンを非活性にする（従来はモードバー自体を非表示にして当日変更固定で開いていた）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 15  | 2026/08/05 | 1.14 | Tran Duc Tuyen | 顧客要件 2026-08（#56524）：電子版の承認/否認画面で編集できる項目に**支払方法 + 引落口座4項目**（`shiharai_hoho` / 引落口座支店 `bank_shiten_id` / 引落口座貯金種目 `hikiotoshi_yokin_shubetsu` / 引落口座番号 `hikiotoshi_koza_no` / 引落口座名義 `hikiotoshi_koza_meigi`）を追加。承認(API-011-004)は `tanka_id` に加えこの5項目を、否認(API-011-005)は5項目を任意で受け取り、ステータス確定と同一トランザクションで保存する（省略したキーは変更しない部分更新）。電子版申込の口座情報は読者本人の自己申告で誤りが多く、従来は承認→再編集の2操作が必要だったため。`bank_shiten_id` は `m_shiten`(自JA・kinyu_shiten_flg=true) の逆引き検証を行い、JA外／非存在は VALIDATION_ERROR(bank_shiten_id)（テナント跨ぎ FK 注入対策）。`shiharai_hoho` は m_code 検証に加え、電子版のクレジットカード(6)指定を拒否し、口座引落(1)へ切り替える際は引落口座支店を必須とする（既存レコードに引落先がある場合は省略可）。 | | |
| 16  | 2026/08/05 | 1.15 | Tran Duc Tuyen | 顧客要件 2026-08（#56568）：電子版読者のメールアドレス重複チェックを **JA 横断** に変更。電子版ではメールアドレスが会員の同定キー（ログインID）のため、他 JA に同じメールの電子版・併読レコードがあれば登録・更新を許可しない。従来は `ja_id = :ja_id` で自 JA 内のみを見ており、別 JA に同一メールの電子版読者を作成できてしまった。判定対象は `dokusya_shubetsu IN (2,3)`（紙版は従来どおり重複可）、論理削除済み（`deleted_at IS NOT NULL`）は対象外でメールを再利用できる。画面登録(API-011-003/004)と Excel 一括取込(SCR-016)の双方に適用。 | | |

## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。

主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。

また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

「購読者情報登録画面（ACSMS-SCR-011）」において、システム上で新規作成されるAPIの詳細を記述した資料です。

## 関連資料

| No  | 資料コード           | 資料名                                |
| --- | -------------------- | ------------------------------------- |
| 1   | ACSMS-SCR-002        | 購読者明細検索画面 API設計書          |
| 2   | ACSMS-API-COMMON-001 | Get Prefecture List（都道府県取得）   |

※ 本画面の都道府県プルダウンは共用APIを使用する。
- ACSMS-API-COMMON-001: Get Prefecture List (`GET /api/v1/todofuken`) — 定義元: ACSMS-SCR-009

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
| 9   | 画面固有     | DUPLICATE_EMAIL       | このメールアドレスは既に登録されています。                             | HTTP 400 |
| 10  | 画面固有     | INVALID_STATUS        | 承認待ちの読者ではありません。                                         | HTTP 400 |
| 11  | 画面固有     | SHUBETSU_PERMISSION_DENIED | 紙版購読者の登録・編集を行う権限がありません。／電子版購読者の登録・編集・承認を行う権限がありません。 | HTTP 403 |

> ※11 購読種別フラグ判定（account_concept.md §その他）。登録/編集/削除 API は
> 購読種別=紙版(1) に paper_flg、電子版(2) に denshi_flg を要求する。承認/否認
> API は電子版ワークフローのため denshi_flg を要求する。Excel一括取込・販売店
> 一括置換 API は購読種別が混在しうるため「いずれか一方のフラグ」を要求する
> （BE: `assertAnyDokusyaFlag`）。併読(3) は読み取り専用のため対象外。role 権限
> （dokusya.create / update / delete / import / replace_hanbaiten）に追加される
> 判定で、権限とフラグの両方が揃って初めて操作可能。フラグの無いメニューは FE で
> 非活性表示（BE: `DokusyaService.assertShubetsuFlag` / `assertAnyDokusyaFlag`）。

---

# API ACSMS-API-011-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Dokusya Detail                                                                                                                                                                                         |
| 概要                   | 指定した購読者の詳細を取得する（編集モード用）                                                                                                                                                             |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                               |
| メソッド               | GET                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に購読者詳細を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 取得対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | 購読者データ                                                                                                                                                  |
| 2  | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                                                                                                      |
| 3  | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4  | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                                                                                                    |
| 5  | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                                                                                                        |
| 6  | →kumiaiin_code               | String  | -        |              |          | 組合員コード（空文字許容）                                                                                                                                    |
| 7  | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）                                                                            |
| 8  | →tetsuzuki_shurui            | Number  | -        |              | -        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                                     |
| 9  | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | 電子版読者種別 ※m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'を参照（0:無料, 1:有料）                                                                        |
| 10 | →shimei_sei                  | String  | -        |              | -        | 氏名（姓）                                                                                                                                                    |
| 11 | →shimei_mei                  | String  | -        |              | -        | 氏名（名）                                                                                                                                                    |
| 12 | →shimei_kana_sei             | String  | -        |              | -        | 氏名かな（姓）                                                                                                                                                |
| 13 | →shimei_kana_mei             | String  | -        |              | -        | 氏名かな（名）                                                                                                                                                |
| 14 | →dokusya_busu                | Number  | -        |              | -        | 購読部数                                                                                                                                                      |
| 15 | →yubin_no                    | String  | -        |              | -        | 郵便番号                                                                                                                                                      |
| 16 | →todofuken_code              | String  | -        |              | -        | 都道府県コード                                                                                                                                                |
| 17 | →shikuchoson                 | String  | -        |              | -        | 市町村郡                                                                                                                                                      |
| 18 | →chome_banchi                | String  | -        |              | -        | 丁目番地                                                                                                                                                      |
| 19 | →tatemono_mei                | String  | -        |              |          | マンション名等（空文字許容）                                                                                                                                  |
| 20 | →renrakusaki_1               | String  | -        |              |          | 連絡先１（空文字許容）                                                                                                                                        |
| 21 | →renrakusaki_2               | String  | -        |              |          | 連絡先２（空文字許容）                                                                                                                                        |
| 22 | →email                       | String  | -        |              |          | メールアドレス（空文字許容）                                                                                                                                  |
| 23 | →mail_magazine_flg           | Number  | -        |              | -        | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                                                                    |
| 24 | →birth_year                  | Number  | -        |              | 〇       | 生年（西暦）                                                                                                                                                  |
| 25 | →gender                      | Number  | -        |              | 〇       | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）                                                                                     |
| 26 | →haitatsu_same_flg           | Boolean | -        |              | -        | 配達先情報指定（true:購読者と同じ）                                                                                                                           |
| 27 | →haitatsu_yubin_no           | String  | -        |              |          | 配達先郵便番号（空文字許容）                                                                                                                                  |
| 28 | →haitatsu_todofuken_code     | String  | -        |              |          | 配達先都道府県コード（空文字許容）                                                                                                                            |
| 29 | →haitatsu_shikuchoson        | String  | -        |              |          | 配達先市町村郡（空文字許容）                                                                                                                                  |
| 30 | →haitatsu_chome_banchi       | String  | -        |              |          | 配達先丁目番地（空文字許容）                                                                                                                                  |
| 31 | →haitatsu_tatemono_mei       | String  | -        |              |          | 配達先建物名（空文字許容）                                                                                                                                    |
| 32 | →haitatsu_renrakusaki_1      | String  | -        |              |          | 配達先連絡先１（空文字許容）                                                                                                                                  |
| 33 | →haitatsu_renrakusaki_2      | String  | -        |              |          | 配達先連絡先２（空文字許容）                                                                                                                                  |
| 34 | →haitatsu_shimei_sei         | String  | -        |              |          | 配達先氏名（姓・漢字）（空文字許容）                                                                                                                          |
| 35 | →haitatsu_shimei_mei         | String  | -        |              |          | 配達先氏名（名・漢字）（空文字許容）                                                                                                                          |
| 36 | →haitatsu_shimei_kana_sei    | String  | -        |              |          | 配達先氏名かな（姓）（空文字許容）                                                                                                                            |
| 37 | →haitatsu_shimei_kana_mei    | String  | -        |              |          | 配達先氏名かな（名）（空文字許容）                                                                                                                            |
| 38 | →hanbaiten_id                | Number  | -        |              |  〇       | 販売店ID※未設定(NULL)あり                                                                                                                                          |
| 39 | →hanbaiten_name              | String  | -        |              | -        | 販売店名（m_hanbaiten結合取得）                                                                                                                               |
| 40 | →tanka_id                    | Number  | -        |              |  〇       | 単価ID※未設定(NULL)あり                                                                                                                                            |
| 41 | →tanka_name                  | String  | -        |              | -        | 単価名（m_tanka結合取得）                                                                                                                                     |
| 42 | →yubin_kubun                 | String  | -        |              | -        | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）。デフォルト: '0'                                                                           |
| 43 | →shiharai_hoho               | Number  | -        |              | -        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）             |
| 44 | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | 購読料支払サイクル（月数）                                                                                                                                    |
| 45 | →bank_shiten_id              | Number  | -        |              | 〇       | 引落口座支店ID（m_shiten.shiten_id を `kinyu_shiten_flg=TRUE` で絞り込んだ値。プルダウン再ハイドレーション用）。口座引落以外の場合は null                     |
| 46 | →jastem_toriatsukai_tenpo_code | String | -        |              |          | 引落元口座店舗コード（m_shiten結合取得、bank_shiten_id 選択後の自動表示用ラベル、空文字許容）                                                                  |
| 47 | →jastem_tenpo_name           | String  | -        |              |          | 引落元口座店舗名（m_shiten結合取得、bank_shiten_id 選択後の自動表示用ラベル、空文字許容）                                                                      |
| 48 | →bank_branch_code            | String  | -        |              | -        | 引落口座支店コード（t_dokusya 永続列。bank_shiten_id 選択時に m_shiten.jastem_toriatsukai_tenpo_code から非正規化保存）                                        |
| 49 | →bank_branch_name            | String  | -        |              | -        | 引落口座支店名（t_dokusya 永続列。bank_shiten_id 選択時に m_shiten.jastem_tenpo_name から非正規化保存）                                                        |
| 50 | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                                                                               |
| 51 | →hikiotoshi_koza_no          | String  | -        |              |          | 引落口座番号（空文字許容）                                                                                                                                    |
| 52 | →hikiotoshi_koza_meigi       | String  | -        |              |          | 引落口座名義（空文字許容）                                                                                                                                    |
| 53 | →dokusyaso_bunrui            | String  | -        |              |          | 購読者層分類（カンマ区切り、空文字許容）                                                                                                                      |
| 54 | →ja_yakushokuin_flg          | Boolean | -        |              |          | かつJAグループ役職員フラグ（購読種別=電子版/併読 かつ 購読者層分類=0:農業者 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_ja と 1:1） |
| 55 | →nogyo_kankei_flg            | Boolean | -        |              |          | 農業関係フラグ（購読種別=電子版/併読 かつ 購読者層分類=2:企業・団体 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_agri と 1:1） |
| 56 | →dokusyaso_bunrui_sonota     | String  | -        |              |          | 購読者層分類その他（自由記述。購読者層分類=999:その他 のときのみ入力可・空文字許容。電子版 users.others_profession と 1:1） |
| 57 | →nogyosya_bunrui             | String  | -        |              |          | 農業者分類（カンマ区切り、空文字許容）                                                                                                                        |
| 58 | →nogyosya_bunrui_sonota      | String  | -        |              |          | 農業者分類その他（自由記述。農業者分類に 999:その他 を含むときのみ入力可・空文字許容。電子版 users.others_products と 1:1） |
| 59 | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | 初回購読開始日                                                                                                                                                |
| 60 | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                                                                                    |
| 61 | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | 購読中止日                                                                                                                                                    |
| 62 | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | 読者情報変更適用日                                                                                                                                            |
| 63 | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | 請求開始月（空文字許容）                                                                                                                                      |
| 64 | →biko                        | String  | -        |              |          | 備考（空文字許容）                                                                                                                                            |
| 65 | →rireki_no                   | Number  | -        |              | -        | 履歴No（最新の履歴番号）                                                                                                                                      |
| 66 | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子申込承認ステータス（0:承認待ち, 1:承認済み, 2:否認）                                                                                                      |
| 67 | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                                                                                                                                      |
| 68 | →updated_at                  | String  | -        | ISO8601      | -        | 更新日時                                                                                                                                                      |

## リクエスト例

```
GET /api/v1/dokusya/1
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 1,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "hanbaiten_name": "山田販売店",
    "tanka_id": 1,
    "tanka_name": "基本購読料（月額）",
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_shiten_id": 50,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "0",
    "ja_yakushokuin_flg": true,
    "nogyo_kankei_flg": false,
    "dokusyaso_bunrui_sonota": "",
    "nogyosya_bunrui": "0,1",
    "nogyosya_bunrui_sonota": "",
    "shoki_dokusya_kaishi_date": "2026-01-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-04-01T10:00:00+09:00"
  }
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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
  - dokusya_id：数値型チェック、必須チェック
- 不正なパラメータが存在する場合：
  - HTTP 400 (`BAD_REQUEST`) を返却する。

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ参照可能（管轄JAの読者は不可）
  - JA_HONTEN（JA本店）：自JAのみ参照可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ参照可能（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 データ取得

- ログインユーザーのスコープを取得する。
- 以下のSQLを実行して購読者情報を取得する（販売店名・単価名・引落口座支店情報を結合）。
- `bank_shiten_id` は `t_dokusya.bank_branch_code` をキーとして、ログインユーザー所属JA内で `kinyu_shiten_flg = TRUE` の `m_shiten` レコードから逆引きする（プルダウン再ハイドレーション用）。`jastem_toriatsukai_tenpo_code` および `jastem_tenpo_name` も同じ JOIN から取得する。

```sql
SELECT d.*,
       h.hanbaiten_name,
       t.tanka_name,
       bs.shiten_id                       AS bank_shiten_id,
       bs.jastem_toriatsukai_tenpo_code   AS jastem_toriatsukai_tenpo_code,
       bs.jastem_tenpo_name               AS jastem_tenpo_name
FROM t_dokusya d
LEFT JOIN m_hanbaiten h ON h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL
LEFT JOIN m_tanka t ON t.tanka_id = d.tanka_id AND t.deleted_at IS NULL
LEFT JOIN m_shiten bs ON bs.ja_id = d.ja_id
                     AND bs.jastem_toriatsukai_tenpo_code = d.bank_branch_code
                     AND bs.kinyu_shiten_flg = TRUE
                     AND bs.deleted_at IS NULL
WHERE d.dokusya_id = :dokusya_id
  AND d.ja_id = :ja_id
  AND d.deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.4 レスポンス生成

- data オブジェクトを含むJSONを返却する。HTTP 200。

### 4.5 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)

---

# API ACSMS-API-011-002

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Create Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 新しい購読者を登録する（t_dokusya + t_dokusya_rireki を1トランザクションで作成）                                                                                                                                                                           |
| URI                    | /api/v1/dokusya                                                                                                                                                                                                                                            |
| メソッド               | POST                                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                       |
| HTTPレスポンスコード   | 201:正常に購読者を登録しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 400:このメールアドレスは既に登録されています, 500:システムエラーが発生しました                |

## リクエストパラメータ

| #   | パラメーターID            | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                              |
| --- | ------------------------- | ------- | -------- | ---- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | kanri_shiten_id           | Number  | -        | -    |        |        | 管理支店ID                                                                                                                                        |
| 2   | shiten_id                 | Number  | -        | -    |        |        | 支店ID                                                                                                                                            |
| 3   | kumiaiin_code             | String  | -        | -    | 0      | 20     | 組合員コード                                                                                                                                      |
| 4   | dokusya_shubetsu          | Number  | -        | 〇   |        |        | 購読種別 ※m_code.code_category='DOKUSYA_SHUBETSU'を参照（1:紙版, 2:電子版, 3:併読）                                                               |
| 5   | tetsuzuki_shurui          | Number  | -        | 〇   |        |        | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                         |
| 6   | denshi_dokusya_shubetsu   | Number  | -        | -    |        |        | 電子版読者種別 ※m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'を参照（0:無料, 1:有料）                                                            |
| 7   | shimei_sei                | String  | -        | 〇   | 1      | 50     | 氏名（姓）                                                                                                                                        |
| 8   | shimei_mei                | String  | -        | 〇   | 1      | 50     | 氏名（名）                                                                                                                                        |
| 9   | shimei_kana_sei           | String  | -        | 〇   | 1      | 100    | 氏名かな（姓）                                                                                                                                    |
| 10  | shimei_kana_mei           | String  | -        | 〇   | 1      | 100    | 氏名かな（名）                                                                                                                                    |
| 11  | dokusya_busu              | Number  | -        | 〇   |        |        | 購読部数（解約時は0）                                                                                                                             |
| 12  | yubin_no                  | String  | -        | 〇   | 7      | 7      | 郵便番号（半角数字7桁）                                                                                                                           |
| 13  | todofuken_code            | String  | -        | 〇   | 2      | 2      | 都道府県コード                                                                                                                                    |
| 14  | shikuchoson               | String  | -        | 〇   | 1      | 100    | 市町村郡                                                                                                                                          |
| 15  | chome_banchi              | String  | -        | 〇   | 1      | 100    | 丁目番地                                                                                                                                          |
| 16  | tatemono_mei              | String  | -        | -    | 0      | 100    | マンション名等                                                                                                                                    |
| 17  | renrakusaki_1             | String  | -        | 〇   | 1      | 15     | 連絡先１（半角数字）                                                                                                                              |
| 18  | renrakusaki_2             | String  | -        | -    | 0      | 15     | 連絡先２（半角数字）                                                                                                                              |
| 19  | email                     | String  | -        | △   | 0      | 100    | メールアドレス（電子版/併読の場合は必須）                                                                                                         |
| 20  | mail_magazine_flg         | Number  | -        | -    |        |        | メールマガジン ※m_code.code_category='MAIL_MAGAZINE_FLG'を参照（0:配信しない, 1:配信する）                                                        |
| 21  | birth_year                | Number  | -        | -    |        |        | 生年（西暦）                                                                                                                                      |
| 22  | gender                    | Number  | -        | -    |        |        | 性別 ※m_code.code_category='GENDER'を参照（1:男性, 2:女性, 9:回答しない）                                                                         |
| 23  | haitatsu_same_flg         | Boolean | -        | 〇   |        |        | 配達先情報指定（true:購読者と同じ）                                                                                                               |
| 24  | haitatsu_yubin_no         | String  | -        | △   | 0      | 7      | 配達先郵便番号（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 25  | haitatsu_todofuken_code   | String  | -        | △   | 0      | 2      | 配達先都道府県コード（haitatsu_same_flg=falseの場合必須）                                                                                         |
| 26  | haitatsu_shikuchoson      | String  | -        | △   | 0      | 100    | 配達先市町村郡（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 27  | haitatsu_chome_banchi     | String  | -        | △   | 0      | 100    | 配達先丁目番地（haitatsu_same_flg=falseの場合必須）                                                                                               |
| 28  | haitatsu_tatemono_mei     | String  | -        | -    | 0      | 100    | 配達先建物名                                                                                                                                      |
| 29  | haitatsu_renrakusaki_1    | String  | -        | -    | 0      | 15     | 配達先連絡先１                                                                                                                                    |
| 30  | haitatsu_renrakusaki_2    | String  | -        | -    | 0      | 15     | 配達先連絡先２                                                                                                                                    |
| 31  | haitatsu_shimei_sei       | String  | -        | △   | 0      | 50     | 配達先氏名（姓）                                                                                                                                  |
| 32  | haitatsu_shimei_mei       | String  | -        | △   | 0      | 50     | 配達先氏名（名）                                                                                                                                  |
| 33  | haitatsu_shimei_kana_sei  | String  | -        | △   | 0      | 100    | 配達先氏名かな（姓）                                                                                                                              |
| 34  | haitatsu_shimei_kana_mei  | String  | -        | △   | 0      | 100    | 配達先氏名かな（名）                                                                                                                              |
| 35  | hanbaiten_id              | Number  | -        | 〇   |        |        | 販売店ID                                                                                                                                          |
| 36  | tanka_id                  | Number  | -        | 〇   |        |        | 単価ID（tanka_type=1: 購読料）                                                                                                                    |
| 37  | yubin_kubun               | String  | -        | -    | 1      | 1      | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）。プルダウン入力。デフォルト: '0'                                               |
| 38  | shiharai_hoho             | Number  | -        | 〇   |        |        | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他） |
| 39  | dokusyaryo_shiharai_cycle | Number  | -        | -    |        | 2      | 購読料支払サイクル（月数）                                                                                                                        |
| 40  | bank_shiten_id            | Number  | -        | △   |        |        | 引落口座支店ID（口座引落時は必須、他の支払方法では任意）。`m_shiten.shiten_id` を `kinyu_shiten_flg=TRUE` で絞り込んだ値。指定された場合は支払方法を問わずサーバ側で `jastem_toriatsukai_tenpo_code` / `jastem_tenpo_name` を逆引きし `t_dokusya.bank_branch_code` / `bank_branch_name` に非正規化保存する |
| 41  | hikiotoshi_yokin_shubetsu | Number  | -        | △   |        |        | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）                                                                   |
| 42  | hikiotoshi_koza_no        | String  | -        | △   | 0      | 10     | 引落口座番号                                                                                                                                      |
| 43  | hikiotoshi_koza_meigi     | String  | -        | △   | 0      | 50     | 引落口座名義                                                                                                                                      |
| 44  | dokusyaso_bunrui          | String  | -        | -    | 0      | 50     | 購読者層分類（カンマ区切り）。画面は購読種別を問わず単一選択のため通常は 1 コード（顧客要件 2026-08 で紙版も統一）。列は多値を保持できるまま（pull 由来の多値を落とさないため）  |
| 45  | ja_yakushokuin_flg        | Boolean | -        | -    | -      | -      | かつJAグループ役職員フラグ（購読種別=電子版/併読 かつ 購読者層分類=0:農業者 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_ja と 1:1） |
| 46  | nogyo_kankei_flg          | Boolean | -        | -    | -      | -      | 農業関係フラグ（購読種別=電子版/併読 かつ 購読者層分類=2:企業・団体 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_agri と 1:1） |
| 47  | dokusyaso_bunrui_sonota   | String  | -        | -    | 0      | 255    | 購読者層分類その他（自由記述。購読者層分類=999:その他 のときのみ入力可・空文字許容。電子版 users.others_profession と 1:1） |
| 48  | nogyosya_bunrui           | String  | -        | △   | 0      | 50     | 農業者分類（カンマ区切り）。購読者層分類で「農業者」を選択した場合は必須                                                                          |
| 49  | nogyosya_bunrui_sonota    | String  | -        | -    | 0      | 255    | 農業者分類その他（自由記述。農業者分類に 999:その他 を含むときのみ入力可・空文字許容。電子版 users.others_products と 1:1） |
| 50  | dokusya_kaishi_date       | String  | -        | 〇   |        |        | 購読開始日（YYYY-MM-DD）                                                                                                                          |
| 51  | dokusya_chushi_date       | String  | -        | -    |        |        | 購読中止日（YYYY-MM-DD、解約時のみ）                                                                                                              |
| 52  | joho_henko_tekiyo_date    | String  | -        | -    |        |        | 読者情報変更適用日（YYYY-MM-DD）。入力時は未来日であること                                                                                        |
| 53  | seikyu_kaishi_month       | String  | -        | △   | 0      | 6      | 請求開始月（YYYYMM、電子版/併読の場合）                                                                                                           |
| 54  | biko                      | String  | -        | -    | 0      | 500    | 備考                                                                                                                                              |

## レスポンスデータ

| #   | 項目ID                       | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                                                                                                                          |
| --- | ---------------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | data                         | Object  | -        |              | -        | 登録された購読者データ                                                                                                                                        |
| 2  | →dokusya_id                  | Number  | -        |              | -        | 購読者ID                                                                                                                                                      |
| 3  | →ja_id                       | Number  | -        |              | -        | JA ID                                                                                                                                                         |
| 4  | →kanri_shiten_id             | Number  | -        |              | 〇       | 管理支店ID                                                                                                                                                    |
| 5  | →shiten_id                   | Number  | -        |              | 〇       | 支店ID                                                                                                                                                        |
| 6  | →kumiaiin_code               | String  | -        |              |          | 組合員コード（空文字許容）                                                                                                                                    |
| 7  | →dokusya_shubetsu            | Number  | -        |              | -        | 購読種別                                                                                                                                                      |
| 8  | →tetsuzuki_shurui            | Number  | -        |              | -        | 手続種類                                                                                                                                                      |
| 9  | →denshi_dokusya_shubetsu     | Number  | -        |              | 〇       | 電子版読者種別                                                                                                                                                |
| 10 | →shimei_sei                  | String  | -        |              | -        | 氏名（姓）                                                                                                                                                    |
| 11 | →shimei_mei                  | String  | -        |              | -        | 氏名（名）                                                                                                                                                    |
| 12 | →shimei_kana_sei             | String  | -        |              | -        | 氏名かな（姓）                                                                                                                                                |
| 13 | →shimei_kana_mei             | String  | -        |              | -        | 氏名かな（名）                                                                                                                                                |
| 14 | →dokusya_busu                | Number  | -        |              | -        | 購読部数                                                                                                                                                      |
| 15 | →yubin_no                    | String  | -        |              | -        | 郵便番号                                                                                                                                                      |
| 16 | →todofuken_code              | String  | -        |              | -        | 都道府県コード                                                                                                                                                |
| 17 | →shikuchoson                 | String  | -        |              | -        | 市町村郡                                                                                                                                                      |
| 18 | →chome_banchi                | String  | -        |              | -        | 丁目番地                                                                                                                                                      |
| 19 | →tatemono_mei                | String  | -        |              |          | マンション名等（空文字許容）                                                                                                                                  |
| 20 | →renrakusaki_1               | String  | -        |              |          | 連絡先１（空文字許容）                                                                                                                                        |
| 21 | →renrakusaki_2               | String  | -        |              |          | 連絡先２（空文字許容）                                                                                                                                        |
| 22 | →email                       | String  | -        |              |          | メールアドレス（空文字許容）                                                                                                                                  |
| 23 | →mail_magazine_flg           | Number  | -        |              | -        | メールマガジン                                                                                                                                                |
| 24 | →birth_year                  | Number  | -        |              | 〇       | 生年（西暦）                                                                                                                                                  |
| 25 | →gender                      | Number  | -        |              | 〇       | 性別                                                                                                                                                          |
| 26 | →haitatsu_same_flg           | Boolean | -        |              | -        | 配達先情報指定                                                                                                                                                |
| 27 | →haitatsu_yubin_no           | String  | -        |              |          | 配達先郵便番号（空文字許容）                                                                                                                                  |
| 28 | →haitatsu_todofuken_code     | String  | -        |              |          | 配達先都道府県コード（空文字許容）                                                                                                                            |
| 29 | →haitatsu_shikuchoson        | String  | -        |              |          | 配達先市町村郡（空文字許容）                                                                                                                                  |
| 30 | →haitatsu_chome_banchi       | String  | -        |              |          | 配達先丁目番地（空文字許容）                                                                                                                                  |
| 31 | →haitatsu_tatemono_mei       | String  | -        |              |          | 配達先建物名（空文字許容）                                                                                                                                    |
| 32 | →haitatsu_renrakusaki_1      | String  | -        |              |          | 配達先連絡先１（空文字許容）                                                                                                                                  |
| 33 | →haitatsu_renrakusaki_2      | String  | -        |              |          | 配達先連絡先２（空文字許容）                                                                                                                                  |
| 34 | →haitatsu_shimei_sei         | String  | -        |              |          | 配達先氏名（姓・漢字）（空文字許容）                                                                                                                          |
| 35 | →haitatsu_shimei_mei         | String  | -        |              |          | 配達先氏名（名・漢字）（空文字許容）                                                                                                                          |
| 36 | →haitatsu_shimei_kana_sei    | String  | -        |              |          | 配達先氏名かな（姓）（空文字許容）                                                                                                                            |
| 37 | →haitatsu_shimei_kana_mei    | String  | -        |              |          | 配達先氏名かな（名）（空文字許容）                                                                                                                            |
| 38 | →hanbaiten_id                | Number  | -        |              |  〇       | 販売店ID※未設定(NULL)あり                                                                                                                                          |
| 39 | →tanka_id                    | Number  | -        |              |  〇       | 単価ID※未設定(NULL)あり                                                                                                                                            |
| 40 | →yubin_kubun                 | String  | -        |              | -        | 郵送区分（0:空, 1:郵送）                                                                                                                                      |
| 41 | →shiharai_hoho               | Number  | -        |              | -        | 支払方法                                                                                                                                                      |
| 42 | →dokusyaryo_shiharai_cycle   | Number  | -        |              | 〇       | 購読料支払サイクル（月数）                                                                                                                                    |
| 43 | →bank_shiten_id              | Number  | -        |              | 〇       | 引落口座支店ID（プルダウン再ハイドレーション用）。口座引落以外の場合は null                                                                                   |
| 44 | →jastem_toriatsukai_tenpo_code | String | -        |              |          | 引落元口座店舗コード（m_shiten結合取得、自動表示ラベル、空文字許容）                                                                                          |
| 45 | →jastem_tenpo_name           | String  | -        |              |          | 引落元口座店舗名（m_shiten結合取得、自動表示ラベル、空文字許容）                                                                                              |
| 46 | →bank_branch_code            | String  | -        |              | -        | 引落口座支店コード（t_dokusya 永続列）                                                                                                                        |
| 47 | →bank_branch_name            | String  | -        |              | -        | 引落口座支店名（t_dokusya 永続列）                                                                                                                            |
| 48 | →hikiotoshi_yokin_shubetsu   | Number  | -        |              | 〇       | 引落口座貯金種目                                                                                                                                              |
| 49 | →hikiotoshi_koza_no          | String  | -        |              |          | 引落口座番号（空文字許容）                                                                                                                                    |
| 50 | →hikiotoshi_koza_meigi       | String  | -        |              |          | 引落口座名義（空文字許容）                                                                                                                                    |
| 51 | →dokusyaso_bunrui            | String  | -        |              |          | 購読者層分類（空文字許容）                                                                                                                                    |
| 52 | →ja_yakushokuin_flg          | Boolean | -        |              |          | かつJAグループ役職員フラグ（購読種別=電子版/併読 かつ 購読者層分類=0:農業者 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_ja と 1:1） |
| 53 | →nogyo_kankei_flg            | Boolean | -        |              |          | 農業関係フラグ（購読種別=電子版/併読 かつ 購読者層分類=2:企業・団体 のときのみ true。画面は紙版で本項目を出さない。電子版 users.profession_and_agri と 1:1） |
| 54 | →dokusyaso_bunrui_sonota     | String  | -        |              |          | 購読者層分類その他（自由記述。購読者層分類=999:その他 のときのみ入力可・空文字許容。電子版 users.others_profession と 1:1） |
| 55 | →nogyosya_bunrui             | String  | -        |              |          | 農業者分類（空文字許容）                                                                                                                                      |
| 56 | →nogyosya_bunrui_sonota      | String  | -        |              |          | 農業者分類その他（自由記述。農業者分類に 999:その他 を含むときのみ入力可・空文字許容。電子版 users.others_products と 1:1） |
| 57 | →shoki_dokusya_kaishi_date   | String  | -        | YYYY-MM-DD   | -        | 初回購読開始日                                                                                                                                                |
| 58 | →dokusya_kaishi_date         | String  | -        | YYYY-MM-DD   | -        | 購読開始日                                                                                                                                                    |
| 59 | →dokusya_chushi_date         | String  | -        | YYYY-MM-DD   | 〇       | 購読中止日                                                                                                                                                    |
| 60 | →joho_henko_tekiyo_date      | String  | -        | YYYY-MM-DD   | 〇       | 読者情報変更適用日                                                                                                                                            |
| 61 | →seikyu_kaishi_month         | String  | -        | YYYYMM       |          | 請求開始月（空文字許容）                                                                                                                                      |
| 62 | →biko                        | String  | -        |              |          | 備考（空文字許容）                                                                                                                                            |
| 63 | →rireki_no                   | Number  | -        |              | -        | 履歴No                                                                                                                                                        |
| 64 | →denshi_shonin_status        | Number  | -        |              | 〇       | 電子申込承認ステータス                                                                                                                                        |
| 65 | →created_at                  | String  | -        | ISO8601      | -        | 作成日時                                                                                                                                                      |
| 66 | →updated_at                  | String  | -        | ISO8601      | -        | 更新日時                                                                                                                                                      |

## リクエスト例

```json
POST /api/v1/dokusya
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 1,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-1",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_shiten_id": 50,
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "0",
  "ja_yakushokuin_flg": true,
  "nogyo_kankei_flg": false,
  "dokusyaso_bunrui_sonota": "",
  "nogyosya_bunrui": "0,1",
  "nogyosya_bunrui_sonota": "",
  "dokusya_kaishi_date": "2026-04-01",
  "joho_henko_tekiyo_date": null,
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 1,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-1",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_shiten_id": 50,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "0",
    "ja_yakushokuin_flg": true,
    "nogyo_kankei_flg": false,
    "dokusyaso_bunrui_sonota": "",
    "nogyosya_bunrui": "0,1",
    "nogyosya_bunrui_sonota": "",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 1,
    "denshi_shonin_status": null,
    "created_at": "2026-05-07T10:00:00+09:00",
    "updated_at": "2026-05-07T10:00:00+09:00"
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "shimei_sei", "message": "必須項目です。" },
    { "field": "yubin_no", "message": "郵便番号は7桁で入力してください。" }
  ]
}
```

### 400 Bad Request（メールアドレス重複）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
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

> ※ 4.4 データ登録 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- リクエストボディの検証：
  - dokusya_shubetsu：必須。**3:併読（紙版＋電子版）は新規登録不可**（顧客要件）。併読データは外部の電子版読者管理システムがバッチ連携で管理するため、本システムでは作成・編集・停止・削除いずれも不可。作成は `VALIDATION_ERROR`（field=`dokusya_shubetsu`、メッセージ「併読（紙版＋電子版）はバッチ連携で管理されるため、新規登録できません。」）、編集/停止/削除は `DOKUSYA_READ_ONLY`（403）、Excel取込は取込不可。FEは新規作成モードで併読ラジオを非活性化。
  - shimei_sei / shimei_mei：必須、最大50文字、**漢字・ひらがな・カタカナ・アルファベット形式**（半角英字A-Za-z・全角英字Ａ-Ｚ/ａ-ｚ可、半角カナ・数字不可。顧客要件 2026-07 でひらがな/カタカナ/アルファベット表記の氏名に対応）。形式不正時は `VALIDATION_ERROR`（メッセージ「漢字・ひらがな・カタカナ・アルファベットで入力してください。」）
  - haitatsu_shimei_sei / haitatsu_shimei_mei：haitatsu_same_flg=false 時必須、shimei_sei/mei と同じ漢字・ひらがな・カタカナ・アルファベット形式
  - shimei_kana_sei / shimei_kana_mei：必須、最大100文字、ひらがな/カタカナ形式
  - dokusya_busu：必須、半角数字。解約時は0
  - yubin_no：必須、半角数字7桁
  - todofuken_code / shikuchoson / chome_banchi：必須
  - renrakusaki_1：必須、半角数字
  - email：電子版/併読の場合は必須、形式チェック
  - haitatsu_same_flg=falseの場合：haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_shimei_*, haitatsu_shimei_kana_* が必須
  - hanbaiten_id / tanka_id：必須
  - shiharai_hoho：必須。1（口座引落）の場合：bank_shiten_id, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi が必須
  - bank_shiten_id：口座引落時は必須、他の支払方法では任意。指定された場合は `m_shiten` に存在し、かつ ログインユーザー所属JA内（`m_shiten.ja_id = user.ja_id`）かつ `kinyu_shiten_flg = TRUE` であること（不正値は支払方法を問わず VALIDATION_ERROR）
  - yubin_kubun：任意。入力時は `m_code.code_category='YUBIN_KUBUN'`（0:空, 1:郵送）に存在する値であること
  - dokusya_kaishi_date：必須、YYYY-MM-DD
  - joho_henko_tekiyo_date：任意、YYYY-MM-DD。入力時は未来日であること
  - nogyosya_bunrui：購読者層分類で「農業者」を選択した場合は必須
  - seikyu_kaishi_month：電子版/併読の場合、YYYYMM形式
  - biko：500文字以内
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`) + errors配列

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.create`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope: `ja_id = user.ja_id`（サーバ側で自動設定。リクエストボディの ja_id は信頼しない）
- DataScope違反（他JAのレコードへのアクセス）の場合：HTTP 403 (`DATA_SCOPE_VIOLATION`)

### 4.3 重複チェック（メールアドレス）

- メールアドレスが入力されており、かつ購読種別が電子版(2)・併読(3) の場合、以下の条件で重複を確認する。
- **JA を跨いで全件**を対象とする（顧客要件 2026-08 / #56568）。電子版ではメールアドレスが
  会員の同定キー（ログインID）のため、他 JA に同じメールの電子版読者がいれば登録できない。
- 紙版(1)は必須でも一意でもないため対象外。既存行側も `dokusya_shubetsu IN (2,3)` に絞るので、
  同じメールの紙版レコードは衝突扱いしない。
- 論理削除済み（`deleted_at IS NOT NULL`）は対象外 — 削除済みのメールは再利用できる。
- 更新時は自身の行を除外する（`dokusya_id <> :dokusya_id`）。

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND dokusya_shubetsu IN (2, 3)
  AND deleted_at IS NULL
  -- 更新時のみ
  AND dokusya_id <> :dokusya_id
```

- 重複がある場合：HTTP 400 (`DUPLICATE_EMAIL`) — `このメールアドレスは既に登録されています。`

### 4.4 データ登録

- `denshi_shonin_status`（電子申込承認ステータス）の初期値:
  - 紙版（dokusya_shubetsu=1）: `NULL`（承認ワークフロー対象外）。
  - 電子版（2）/ 併読（3）: `1`（承認済）。画面からの新規登録は職員操作のため
    承認待ち(0)ではなく自動承認(1)とする（Excel一括取込と同方針 — 顧客要件）。

- 支払方法=1（口座引落）の場合、`bank_shiten_id` を以下のSQLで解決し、`jastem_toriatsukai_tenpo_code` および `jastem_tenpo_name` を取得して `t_dokusya.bank_branch_code` / `bank_branch_name` に非正規化保存する（画面設計書 機能定義 §10.1）。

```sql
SELECT shiten_id,
       jastem_toriatsukai_tenpo_code,
       jastem_tenpo_name
FROM m_shiten
WHERE shiten_id = :bank_shiten_id
  AND ja_id = :ja_id
  AND kinyu_shiten_flg = TRUE
  AND deleted_at IS NULL
```

- 該当レコードがない場合：HTTP 400 (`VALIDATION_ERROR`)（`field: 'bank_shiten_id'`）。
- 支払方法 ≠ 1 の場合、`bank_branch_code = ''` / `bank_branch_name = ''` を設定する。
- t_dokusya にレコードを INSERT する。
- t_dokusya_rireki に履歴レコードを INSERT する（rireki_no=1, saishin_data_flg=true）。
- フラグ設定ルール：
  - saishin_data_flg = true
  - shinki_flg = (tetsuzuki_shurui=1) ? true : false
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? true : false
  - zougen_hokoku_flg = true（新規登録は増減対象）
- 解約時は dokusya_busu=0 を強制する。

```sql
INSERT INTO t_dokusya (
  ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko, rireki_no,
  denshi_shonin_status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  :joho_henko_tekiyo_date, :seikyu_kaishi_month, :biko, 1,
  :denshi_shonin_status,  -- 紙版:NULL / 電子版・併読:1(承認済)
  NOW(), :user_account_id, NOW(), :user_account_id
)
RETURNING *
```

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status,
  created_at, created_by
) VALUES (
  :dokusya_id, 1, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  :joho_henko_tekiyo_date, :seikyu_kaishi_month, :biko,
  TRUE, TRUE, :shinki_flg, :kaiyaku_flg,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL,
  NOW(), :user_account_id
)
```

### 4.5 操作ログ記録

- 以下のSQLを実行して操作ログを記録する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 1,
        :dokusya_id, 't_dokusya',
        '', :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：INSERT のため空文字列を設定する。
- `after_value`：登録されたデータをJSON形式で格納する。パスワード等の機密情報は含めないこと。

### 4.6 レスポンス生成

- 登録されたデータを data オブジェクトとして返却する。HTTP 201。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'CREATE', 2,
        NULL, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-003

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Update Dokusya                                                                                                                                                                                                                                                                    |
| 概要                   | 指定した購読者を更新する（履歴追記方式：旧履歴の最新フラグfalse化 + 新履歴の追記）                                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}                                                                                                                                                                                                                                                      |
| メソッド               | PUT                                                                                                                                                                                                                                                                               |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                              |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に購読者を更新しました, 400:入力内容にエラーがあります, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 400:このメールアドレスは既に登録されています, 500:システムエラーが発生しました |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 更新対象の dokusya_id（パスパラメータ） |

※ リクエストボディはACSMS-API-011-002と同一構造。dokusya_id は変更不可（URLから取得）。

※ **`dokusya_chushi_date`（購読中止日）は本APIでは受け付けない（顧客要件2026-07 改訂）**。購読停止（解約予約）は専用エンドポイント **`POST /api/v1/dokusya/{dokusya_id}/stop`（ACSMS-API-014-004・購読停止）** へ分離した。本APIの body に `dokusya_chushi_date` が含まれると `VALIDATION_ERROR`（`dokusya_id` と同じ混入防止方針）で 400 を返す。更新画面では購読中止日は読取専用で、情報変更・販売店変更・再購読のみを本APIで扱う。

※ **`change_mode`（情報変更モード・顧客要件2026-07）をボディに追加**：`'today'`（当日変更）／`'reserved'`（予約変更）。未指定は後方互換で `reserved`。

- `change_mode = 'today'`（当日変更）：サーバは `joho_henko_tekiyo_date` を**本日に固定**（送信値は無視）。**紙版**は帳票影響項目（`dokusya_busu` / `hanbaiten_id` / 購読者住所 `yubin_no`・`todofuken_code`・`shikuchoson`・`chome_banchi`・`tatemono_mei` / 配達先住所 `haitatsu_*`）を既存値から変更した場合 `VALIDATION_ERROR`（当該フィールド）で弾く。**電子版**は帳票を生成しないため制限なし。
- `change_mode = 'reserved'`（予約変更）：`joho_henko_tekiyo_date` は必須・未来日のみ（当日不可）。全項目変更可。
- **電子版（dokusya_shubetsu=2）は当日変更のみ（顧客要件2026-07 改訂）**：`change_mode='reserved'`（予約変更）は不可で、`VALIDATION_ERROR`（field=`change_mode`、メッセージ「電子版は当日変更のみ可能です。予約変更はできません。」）を返す。電子版は帳票を生成せず即時反映のため、変更は常に本日適用。購読種別は保存値で判定（body の spoof 不可）。例外：再購読（解約済み→新規）は新しい購読を未来開始日で作る別フローのため対象外。**紙版のみ当日変更／予約変更の2モードを持つ**。FEは電子版でも紙版と同じモードバーを表示するが「予約変更」ボタンを非活性にし、当日変更のみ選択可とする（UI統一・2026-07 改訂）。
- 履歴は従来どおり 1更新1レコード。併読／電子版クレカは read-only（403）。

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造。

## リクエスト例

```json
PUT /api/v1/dokusya/100
Content-Type: application/json

{
  "kanri_shiten_id": 10,
  "shiten_id": 100,
  "kumiaiin_code": "K00001",
  "dokusya_shubetsu": 1,
  "tetsuzuki_shurui": 1,
  "shimei_sei": "山田",
  "shimei_mei": "太郎",
  "shimei_kana_sei": "ヤマダ",
  "shimei_kana_mei": "タロウ",
  "dokusya_busu": 2,
  "yubin_no": "1000001",
  "todofuken_code": "13",
  "shikuchoson": "千代田区",
  "chome_banchi": "千代田1-2",
  "tatemono_mei": "",
  "renrakusaki_1": "0312345678",
  "renrakusaki_2": "",
  "email": "yamada@example.com",
  "mail_magazine_flg": 1,
  "birth_year": 1980,
  "gender": 1,
  "haitatsu_same_flg": true,
  "haitatsu_yubin_no": "",
  "haitatsu_todofuken_code": "",
  "haitatsu_shikuchoson": "",
  "haitatsu_chome_banchi": "",
  "haitatsu_tatemono_mei": "",
  "haitatsu_renrakusaki_1": "",
  "haitatsu_renrakusaki_2": "",
  "haitatsu_shimei_sei": "",
  "haitatsu_shimei_mei": "",
  "haitatsu_shimei_kana_sei": "",
  "haitatsu_shimei_kana_mei": "",
  "hanbaiten_id": 5,
  "tanka_id": 1,
  "yubin_kubun": "0",
  "shiharai_hoho": 1,
  "dokusyaryo_shiharai_cycle": 1,
  "bank_shiten_id": 50,
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567",
  "hikiotoshi_koza_meigi": "ヤマダタロウ",
  "dokusyaso_bunrui": "0",
  "ja_yakushokuin_flg": true,
  "nogyo_kankei_flg": false,
  "dokusyaso_bunrui_sonota": "",
  "nogyosya_bunrui": "0,1",
  "nogyosya_bunrui_sonota": "",
  "dokusya_kaishi_date": "2026-04-01",
  "joho_henko_tekiyo_date": null,
  "seikyu_kaishi_month": "",
  "biko": ""
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "kanri_shiten_id": 10,
    "shiten_id": 100,
    "kumiaiin_code": "K00001",
    "dokusya_shubetsu": 1,
    "tetsuzuki_shurui": 1,
    "denshi_dokusya_shubetsu": null,
    "shimei_sei": "山田",
    "shimei_mei": "太郎",
    "shimei_kana_sei": "ヤマダ",
    "shimei_kana_mei": "タロウ",
    "dokusya_busu": 2,
    "yubin_no": "1000001",
    "todofuken_code": "13",
    "shikuchoson": "千代田区",
    "chome_banchi": "千代田1-2",
    "tatemono_mei": "",
    "renrakusaki_1": "0312345678",
    "renrakusaki_2": "",
    "email": "yamada@example.com",
    "mail_magazine_flg": 1,
    "birth_year": 1980,
    "gender": 1,
    "haitatsu_same_flg": true,
    "haitatsu_yubin_no": "",
    "haitatsu_todofuken_code": "",
    "haitatsu_shikuchoson": "",
    "haitatsu_chome_banchi": "",
    "haitatsu_tatemono_mei": "",
    "haitatsu_renrakusaki_1": "",
    "haitatsu_renrakusaki_2": "",
    "haitatsu_shimei_sei": "",
    "haitatsu_shimei_mei": "",
    "haitatsu_shimei_kana_sei": "",
    "haitatsu_shimei_kana_mei": "",
    "hanbaiten_id": 5,
    "tanka_id": 1,
    "yubin_kubun": "0",
    "shiharai_hoho": 1,
    "dokusyaryo_shiharai_cycle": 1,
    "bank_shiten_id": 50,
    "jastem_toriatsukai_tenpo_code": "001",
    "jastem_tenpo_name": "本店",
    "bank_branch_code": "001",
    "bank_branch_name": "本店",
    "hikiotoshi_yokin_shubetsu": 1,
    "hikiotoshi_koza_no": "1234567",
    "hikiotoshi_koza_meigi": "ヤマダタロウ",
    "dokusyaso_bunrui": "0",
    "ja_yakushokuin_flg": true,
    "nogyo_kankei_flg": false,
    "dokusyaso_bunrui_sonota": "",
    "nogyosya_bunrui": "0,1",
    "nogyosya_bunrui_sonota": "",
    "shoki_dokusya_kaishi_date": "2026-04-01",
    "dokusya_kaishi_date": "2026-04-01",
    "dokusya_chushi_date": null,
    "joho_henko_tekiyo_date": null,
    "seikyu_kaishi_month": "",
    "biko": "",
    "rireki_no": 2,
    "denshi_shonin_status": null,
    "created_at": "2026-04-01T10:00:00+09:00",
    "updated_at": "2026-05-07T14:30:00+09:00"
  }
}
```

## レスポンス失敗例

### 400 Bad Request（バリデーションエラー）

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [{ "field": "shimei_sei", "message": "必須項目です。" }]
}
```

### 400 Bad Request（メールアドレス重複）

```json
{
  "error_code": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています。"
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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

> ※ 4.4 データ更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- リクエストボディ：ACSMS-API-011-002 と同様
- バリデーションエラーの場合：HTTP 400 (`VALIDATION_ERROR`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ更新可能
  - JA_HONTEN（JA本店）：自JAのみ更新可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ更新可能（`ja_id = user.ja_id AND kanri_shiten_id = user.kanri_shiten_id`）
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）
- ※ 電子版クレカ決済者・併読者は編集不可（業務ルール）。

### 4.3 対象レコードの存在確認 + メール重複チェック

- 対象レコードを取得（更新前データ取得）。

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- メールアドレスが変更されている場合、重複を確認する。

```sql
SELECT COUNT(*) FROM t_dokusya
WHERE email = :email
  AND email <> ''
  AND ja_id = :ja_id
  AND dokusya_id <> :dokusya_id
  AND deleted_at IS NULL
```

- 重複がある場合：HTTP 400 (`DUPLICATE_EMAIL`)

### 4.4 データ更新（履歴追記方式）

機能定義 15.3 に基づく3ステップ処理：

#### ステップ0：引落口座支店の解決（bank_shiten_id 指定時）

- `bank_shiten_id` が指定された場合、支払方法を問わず `m_shiten` を逆引きし、`jastem_toriatsukai_tenpo_code` および `jastem_tenpo_name` を取得して `t_dokusya.bank_branch_code` / `bank_branch_name` に非正規化保存する（画面設計書 機能定義 §10.1 / §10.2、顧客要件 2026-06）。
- 支払方法=1（口座引落）では `bank_shiten_id` 必須（未指定→VALIDATION_ERROR）。他の支払方法では任意で、未指定なら bank_branch_code/name は空で保存する。指定値が不正（非存在 / 他JA / 金融機関支店でない）の場合は支払方法を問わず VALIDATION_ERROR。

```sql
SELECT shiten_id,
       jastem_toriatsukai_tenpo_code,
       jastem_tenpo_name
FROM m_shiten
WHERE shiten_id = :bank_shiten_id
  AND ja_id = :ja_id
  AND kinyu_shiten_flg = TRUE
  AND deleted_at IS NULL
```

- 該当レコードがない場合：HTTP 400 (`VALIDATION_ERROR`)（`field: 'bank_shiten_id'`）。
- 支払方法 ≠ 1 の場合、`bank_branch_code = ''` / `bank_branch_name = ''` を設定する。

#### ステップ1：旧レコードの最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコードの追加 + t_dokusya 本体の更新

- フラグ設定ルール（機能定義 14.2 / 増減報告フラグの正準仕様は
  `docs/requirement/change_notification_concept.md`「購読者登録のレコードの
  考え方」の例示テーブル）：
  - saishin_data_flg = TRUE
  - shinki_flg = (tetsuzuki_shurui=1) ? TRUE : FALSE（再読時もTRUE）
  - kaiyaku_flg = (tetsuzuki_shurui=0) ? TRUE : FALSE
  - zougen_hokoku_flg = 次のいずれかが更新前後で変わったとき TRUE、それ以外の
    項目のみの変更（例：口座情報のみ）なら FALSE：
    - 購読部数（dokusya_busu）
    - 販売店（hanbaiten_id）
    - 配達先同一フラグ（haitatsu_same_flg）の切替（配達先の切替＝配達変更）
    - **実効配達先住所**5項目 — `haitatsu_same_flg=TRUE` なら購読者住所（yubin_no / todofuken_code / shikuchoson / chome_banchi / tatemono_mei）、`FALSE` なら配達先住所（haitatsu_yubin_no / haitatsu_todofuken_code / haitatsu_shikuchoson / haitatsu_chome_banchi / haitatsu_tatemono_mei）。※ `haitatsu_same_flg=FALSE` で別住所を入力して配達先を変えた場合も TRUE（顧客要件）。逆に `FALSE` のとき購読者住所だけを変えても実効配達先（配達先住所）は不変なので FALSE。
    - 解約（tetsuzuki_shurui=0）は購読部数が N→0 になるため上記「購読部数変更」に
      含まれ TRUE（change_notification_concept.md 解約例）。
    （判定は実際の変更有無のみで行う。BE: hasZougenReportableChange。
    change_notification_concept.md の例：口座情報のみ変更=0 / 部数・販売店・
    住所変更=1 と一致）
- zenkai_* 列：更新前の対応する値を格納する（増減比較用）。
  - 住所5項目の zenkai_*（zenkai_yubin_no / zenkai_todofuken_code /
    zenkai_shikuchoson / zenkai_chome_banchi / zenkai_tatemono_mei）の退避ルール
    （顧客要件 2026-06）：
    - `haitatsu_same_flg=TRUE` のとき：住所が変更されていなくても、購読者住所
      （yubin_no / todofuken_code / shikuchoson / chome_banchi / tatemono_mei）
      の値を **常に** zenkai_* に格納する。
    - `haitatsu_same_flg=FALSE` のとき：従来どおり、配達先住所が1項目でも
      変わったときのみ配達先住所5項目を退避する。
  - 購読部数（zenkai_dokusya_busu）・販売店（zenkai_hanbaiten_id）は変更時のみ退避。
  - zenkai_* の退避有無と zougen_hokoku_flg は独立（same_flg=TRUE で住所無変更でも
    zenkai_* は退避するが、増減報告フラグは立てない）。

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id, kumiaiin_code,
  dokusya_shubetsu, tetsuzuki_shurui, denshi_dokusya_shubetsu,
  shimei_sei, shimei_mei, shimei_kana_sei, shimei_kana_mei,
  dokusya_busu, yubin_no, todofuken_code, shikuchoson, chome_banchi,
  tatemono_mei, renrakusaki_1, renrakusaki_2, email,
  mail_magazine_flg, birth_year, gender,
  haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
  haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
  haitatsu_renrakusaki_1, haitatsu_renrakusaki_2,
  haitatsu_shimei_sei, haitatsu_shimei_mei,
  haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei,
  hanbaiten_id, tanka_id, yubin_kubun, shiharai_hoho,
  dokusyaryo_shiharai_cycle, bank_branch_code, bank_branch_name,
  hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no, hikiotoshi_koza_meigi,
  dokusyaso_bunrui, nogyosya_bunrui,
  shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
  joho_henko_tekiyo_date, seikyu_kaishi_month, biko,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi,
  zenkai_tatemono_mei, denshi_shonin_status,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, :kanri_shiten_id, :shiten_id, :kumiaiin_code,
  :dokusya_shubetsu, :tetsuzuki_shurui, :denshi_dokusya_shubetsu,
  :shimei_sei, :shimei_mei, :shimei_kana_sei, :shimei_kana_mei,
  :dokusya_busu, :yubin_no, :todofuken_code, :shikuchoson, :chome_banchi,
  :tatemono_mei, :renrakusaki_1, :renrakusaki_2, :email,
  :mail_magazine_flg, :birth_year, :gender,
  :haitatsu_same_flg, :haitatsu_yubin_no, :haitatsu_todofuken_code,
  :haitatsu_shikuchoson, :haitatsu_chome_banchi, :haitatsu_tatemono_mei,
  :haitatsu_renrakusaki_1, :haitatsu_renrakusaki_2,
  :haitatsu_shimei_sei, :haitatsu_shimei_mei,
  :haitatsu_shimei_kana_sei, :haitatsu_shimei_kana_mei,
  :hanbaiten_id, :tanka_id, :yubin_kubun, :shiharai_hoho,
  :dokusyaryo_shiharai_cycle, :bank_branch_code, :bank_branch_name,
  :hikiotoshi_yokin_shubetsu, :hikiotoshi_koza_no, :hikiotoshi_koza_meigi,
  :dokusyaso_bunrui, :nogyosya_bunrui,
  :shoki_dokusya_kaishi_date, :dokusya_kaishi_date, :dokusya_chushi_date,
  :joho_henko_tekiyo_date, :seikyu_kaishi_month, :biko,
  TRUE, :zougen_hokoku_flg, :shinki_flg, :kaiyaku_flg,
  :zenkai_hanbaiten_id, :zenkai_dokusya_busu, :zenkai_yubin_no,
  :zenkai_todofuken_code, :zenkai_shikuchoson, :zenkai_chome_banchi,
  :zenkai_tatemono_mei, :denshi_shonin_status,
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET kanri_shiten_id = :kanri_shiten_id,
    shiten_id = :shiten_id,
    kumiaiin_code = :kumiaiin_code,
    dokusya_shubetsu = :dokusya_shubetsu,
    tetsuzuki_shurui = :tetsuzuki_shurui,
    denshi_dokusya_shubetsu = :denshi_dokusya_shubetsu,
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
    seikyu_kaishi_month = :seikyu_kaishi_month,
    biko = :biko,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

- 更新前データを取得（4.3 のSELECT結果）し、`before_value` に格納する。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：更新前のデータをJSON形式で格納する。
- `after_value`：更新後のデータをJSON形式で格納する。

### 4.6 レスポンス生成

- 更新されたデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-004

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Approve Denshi Dokusya                                                                                                                                                                                                                                            |
| 概要                   | 電子版申込の購読者を承認する（denshi_shonin_status 0→1）。承認待ち画面で編集した新聞単価（tanka_id）・支払方法・引落口座4項目を任意で同時保存してから承認確定する。                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}/approve                                                                                                                                                                                                                              |
| メソッド               | PUT                                                                                                                                                                                                                                                               |
| リクエストボディー     | JSON（任意）。承認待ち画面で編集可能な新聞単価・支払方法・引落口座4項目を送信する（省略したキーは変更しない）。 |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に承認しました, 400:承認待ちの読者ではありません, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                     |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 承認対象の dokusya_id（パスパラメータ）                                                   |
| 2   | tanka_id       | Number | -        | -    |        |        | 新聞単価ID（リクエストボディ・任意）。指定時のみ承認と同時に単価を更新する。1以上の整数。 |
| 3   | shiharai_hoho  | Number | -        | -    |        |        | 支払方法（m_code.code_category=SHIHARAI_HOHO）。指定時のみ更新。電子版はクレジットカード(6)を指定不可（VALIDATION_ERROR）。口座引落(1)へ切り替える場合は引落口座支店が必須（既存レコードに引落先がある場合は省略可）。 |
| 4   | bank_shiten_id | Number | -        | -    |        |        | 引落口座支店＝銀行支店ID（m_shiten.shiten_id・kinyu_shiten_flg=true）。指定時のみ更新。サーバ側で bank_branch_code / bank_branch_name を逆引きして保存。自JA以外／非存在は VALIDATION_ERROR。 |
| 5   | hikiotoshi_yokin_shubetsu | Number | - | -  |        |        | 引落口座貯金種目（m_code.code_category=YOKIN_SHUBETSU）。指定時のみ更新。                  |
| 6   | hikiotoshi_koza_no | String | -    | -    |        | 10     | 引落口座番号。指定時のみ更新。                                                            |
| 7   | hikiotoshi_koza_meigi | String | - | -    |        | 50     | 引落口座名義。指定時のみ更新。                                                            |

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造（denshi_shonin_status=1 で返却）。

## リクエスト例

```
PUT /api/v1/dokusya/100/approve
Content-Type: application/json

{
  "tanka_id": 5,
  "shiharai_hoho": 1,
  "bank_shiten_id": 7,
  "hikiotoshi_yokin_shubetsu": 1,
  "hikiotoshi_koza_no": "1234567890",
  "hikiotoshi_koza_meigi": "ﾀﾅｶ ﾀﾛｳ"
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 1,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "承認しました。"
}
```

## レスポンス失敗例

### 400 Bad Request（ステータス不正）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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

> ※ 4.4 ステータス更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- リクエストボディ `tanka_id`（任意）：指定時は整数・1以上。形式不正は HTTP 400 (`VALIDATION_ERROR`, field=`tanka_id`)。
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ承認可能
  - JA_HONTEN（JA本店）：自JAのみ承認可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ承認可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 対象レコードの存在確認 + ステータスチェック

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- denshi_shonin_status が 0 でない場合：HTTP 400 (`INVALID_STATUS`)
- リクエストボディに `tanka_id` が指定された場合、承認前にテナント跨ぎ FK 検証を行う（`m_tanka` に存在し、かつ対象レコードの `ja_id` に属すること）。存在しない → HTTP 400、他 JA の単価 → HTTP 403 (`DATA_SCOPE_VIOLATION`)。

### 4.4 ステータス更新（履歴追記方式）

#### ステップ1：旧履歴の最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコード INSERT + t_dokusya UPDATE

- 履歴レコードは現在の購読者情報をコピーし、denshi_shonin_status=1 に設定。saishin_data_flg=TRUE。

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- 4.3 で取得した現データを全コピー
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  1,
  TRUE, FALSE, FALSE, FALSE,
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 1,
    tanka_id = :tanka_id,          -- リクエストボディに tanka_id 指定時のみ更新（未指定は据置）
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

> `tanka_id` はリクエストボディに指定があった場合のみ SET する（現行履歴レコードの
> `tanka_id` も同時に更新）。未指定時は単価を変更しない。

### 4.5 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：承認前のデータ（denshi_shonin_status=0）をJSON形式で格納する。
- `after_value`：承認後のデータ（denshi_shonin_status=1）をJSON形式で格納する。

### 4.6 レスポンス生成

- 承認後のデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-005

## 概要

| 項目                   | 内容                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Reject Denshi Dokusya                                                                                                                                                                                                                                             |
| 概要                   | 電子版申込の購読者を否認する（denshi_shonin_status 0→2）。否認画面で編集した支払方法・引落口座4項目を任意で同時保存する。新規履歴レコードを作成。                                                                                                                                                                                |
| URI                    | /api/v1/dokusya/{dokusya_id}/reject                                                                                                                                                                                                                               |
| メソッド               | PUT                                                                                                                                                                                                                                                               |
| リクエストボディー     | JSON（任意）。否認画面で編集可能な支払方法・引落口座4項目を送信する（省略したキーは変更しない）。                                                                                                                                                                                                                              |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                                                                                      |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                              |
| HTTPレスポンスコード   | 200:正常に否認しました, 400:承認待ちの読者ではありません, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました                                    |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                  |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | ------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 否認対象の dokusya_id（パスパラメータ） |
| 2   | shiharai_hoho  | Number | -        | -    |        |        | 支払方法（m_code.code_category=SHIHARAI_HOHO）。指定時のみ更新。電子版はクレジットカード(6)を指定不可。 |
| 3   | bank_shiten_id | Number | -        | -    |        |        | 引落口座支店＝銀行支店ID（m_shiten.shiten_id・kinyu_shiten_flg=true）。指定時のみ更新。 |
| 4   | hikiotoshi_yokin_shubetsu | Number | - | -  |        |        | 引落口座貯金種目（m_code.code_category=YOKIN_SHUBETSU）。指定時のみ更新。 |
| 5   | hikiotoshi_koza_no | String | -    | -    |        | 10     | 引落口座番号。指定時のみ更新。 |
| 6   | hikiotoshi_koza_meigi | String | - | -    |        | 50     | 引落口座名義。指定時のみ更新。 |

## レスポンスデータ

ACSMS-API-011-002のレスポンスデータと同一構造（denshi_shonin_status=2 で返却）。

## リクエスト例

```
PUT /api/v1/dokusya/100/reject
Content-Type: application/json

{
  "shiharai_hoho": 1,
  "hikiotoshi_koza_no": "1234567890",
  "hikiotoshi_koza_meigi": "ﾀﾅｶ ﾀﾛｳ"
}
```

## レスポンス成功例

```json
{
  "data": {
    "dokusya_id": 100,
    "ja_id": 1,
    "denshi_shonin_status": 2,
    "rireki_no": 2,
    "updated_at": "2026-05-07T14:30:00+09:00"
  },
  "message": "否認しました。"
}
```

## レスポンス失敗例

### 400 Bad Request（ステータス不正）

```json
{
  "error_code": "INVALID_STATUS",
  "message": "承認待ちの読者ではありません。"
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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

> ※ 4.4 ステータス更新 と 4.5 操作ログ記録 は単一トランザクション内で実行する。
> いずれかが失敗した場合は全てロールバックすること。
> 例外処理中のエラーログ（log_type=3）はトランザクション外で別途記録する。

### 4.1 リクエストのバリデーション

- パスパラメータ：dokusya_id 数値型チェック、必須
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.update`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ否認可能
  - JA_HONTEN（JA本店）：自JAのみ否認可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ否認可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 対象レコードの存在確認 + ステータスチェック

```sql
SELECT * FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)
- denshi_shonin_status が 0 でない場合：HTTP 400 (`INVALID_STATUS`)

### 4.4 ステータス更新（履歴追記方式）

#### ステップ1：旧履歴の最新フラグを無効化

```sql
UPDATE t_dokusya_rireki
SET saishin_data_flg = FALSE
WHERE dokusya_id = :dokusya_id
  AND saishin_data_flg = TRUE
```

#### ステップ2：新しい履歴Noを採番

```sql
SELECT COALESCE(MAX(rireki_no), 0) + 1 AS new_rireki_no
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
```

#### ステップ3：新しい履歴レコード INSERT + t_dokusya UPDATE

```sql
INSERT INTO t_dokusya_rireki (
  dokusya_id, rireki_no, ja_id, ...,  -- 4.3 で取得した現データを全コピー
  denshi_shonin_status,
  saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  created_at, created_by
) VALUES (
  :dokusya_id, :new_rireki_no, :ja_id, ...,
  2,
  TRUE, FALSE, FALSE, FALSE,
  NOW(), :user_account_id
)
```

```sql
UPDATE t_dokusya
SET denshi_shonin_status = 2,
    rireki_no = :new_rireki_no,
    updated_at = NOW(),
    updated_by = :user_account_id
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
RETURNING *
```

### 4.5 操作ログ記録

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (1, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 1,
        :dokusya_id, 't_dokusya',
        :before_value_json, :after_value_json,
        '', '',
        :ip_address, :user_agent)
```

- `before_value`：否認前のデータ（denshi_shonin_status=0）をJSON形式で格納する。
- `after_value`：否認後のデータ（denshi_shonin_status=2）をJSON形式で格納する。

### 4.6 レスポンス生成

- 否認後のデータを data オブジェクトとして返却する。HTTP 200。

### 4.7 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
- エラー発生時はエラーログを記録する（`log_type = 3`、トランザクション外で記録）。

```sql
INSERT INTO t_log (log_type, log_datetime, account_id, ja_id,
                   gamen_name, operation, result_status,
                   target_id, target_table,
                   before_value, after_value,
                   error_message, stack_trace,
                   ip_address, user_agent)
VALUES (3, NOW(), :account_id, :ja_id,
        '購読者情報登録画面 (ACSMS-SCR-011)', 'UPDATE', 2,
        :dokusya_id, 't_dokusya',
        '', '',
        :error_message, :stack_trace,
        :ip_address, :user_agent)
```

---

# API ACSMS-API-011-006

## 概要

| 項目                   | 内容                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Get Dokusya History                                                                                                                                                                                        |
| 概要                   | 指定した購読者の変更履歴一覧を取得する（履歴表示モーダル用）                                                                                                                                               |
| URI                    | /api/v1/dokusya/{dokusya_id}/history                                                                                                                                                                       |
| メソッド               | GET                                                                                                                                                                                                        |
| リクエストボディー     | なし                                                                                                                                                                                                       |
| リクエストパラメーター | dokusya_id（パスパラメータ）                                                                                                                                                                               |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                       |
| HTTPレスポンスコード   | 200:正常に履歴を取得しました, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 404:指定された購読者が見つかりません, 500:システムエラーが発生しました       |

## リクエストパラメータ

| #   | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                    |
| --- | -------------- | ------ | -------- | ---- | ------ | ------ | --------------------------------------- |
| 1   | dokusya_id     | Number | -        | 〇   |        |        | 取得対象の dokusya_id（パスパラメータ） |

## レスポンスデータ

| #   | 項目ID                  | タイプ  | 繰り返し | フォーマット | Nullable | 説明                                                          |
| --- | ----------------------- | ------- | -------- | ------------ | -------- | ------------------------------------------------------------- |
| 1   | data                    | Array   | 〇       |              | -        | 履歴一覧（rireki_no DESC）                                    |
| 2  | →dokusya_rireki_id      | Number  | -        |              | -        | 購読者履歴ID                                                  |
| 3  | →dokusya_id             | Number  | -        |              | -        | 購読者ID                                                      |
| 4  | →rireki_no              | Number  | -        |              | -        | 履歴No                                                        |
| 5  | →tetsuzuki_shurui       | Number  | -        |              | -        | 手続種類（0:解約, 1:新規）                                    |
| 6  | →saishin_data_flg       | Boolean | -        |              | -        | 最新データフラグ                                              |
| 7  | →shinki_flg             | Boolean | -        |              | -        | 新規フラグ                                                    |
| 8  | →kaiyaku_flg            | Boolean | -        |              | -        | 解約フラグ                                                    |
| 9  | →zougen_hokoku_flg      | Boolean | -        |              | -        | 増減報告フラグ                                                |
| 10 | →denshi_shonin_status   | Number  | -        |              | 〇       | 電子申込承認ステータス                                        |
| 11 | →created_at             | String  | -        | ISO8601      | -        | 作成日時（履歴登録日時）                                      |
| 12 | →created_by             | String  | -        |              | -        | 作成者（履歴登録者）                                          |

## リクエスト例

```
GET /api/v1/dokusya/100/history
```

## レスポンス成功例

```json
{
  "data": [
    {
      "dokusya_rireki_id": 200,
      "dokusya_id": 100,
      "rireki_no": 2,
      "tetsuzuki_shurui": 1,
      "saishin_data_flg": true,
      "shinki_flg": false,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-05-07T14:30:00+09:00",
      "created_by": "user01"
    },
    {
      "dokusya_rireki_id": 100,
      "dokusya_id": 100,
      "rireki_no": 1,
      "tetsuzuki_shurui": 1,
      "saishin_data_flg": false,
      "shinki_flg": true,
      "kaiyaku_flg": false,
      "zougen_hokoku_flg": true,
      "denshi_shonin_status": null,
      "created_at": "2026-04-01T10:00:00+09:00",
      "created_by": "user01"
    }
  ]
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

### 404 Not Found

```json
{
  "error_code": "NOT_FOUND",
  "message": "指定された購読者が見つかりません。"
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

- パスパラメータ：dokusya_id 数値型チェック、必須
- 不正なパラメータが存在する場合：HTTP 400 (`BAD_REQUEST`)

### 4.2 認証・認可チェック

- 認証情報を検証する（HTTP-only Cookieセッション）。
- 未認証の場合：HTTP 401 (`UNAUTHORIZED`)
- 必要権限: `dokusya.view`
- 該当権限保持ロール: CHUOKAI（中央会）, JA_HONTEN（JA本店）, JA_KANRI_SHITEN（JA管理支店）
- 権限不足の場合：HTTP 403 (`FORBIDDEN`)
- DataScope:
  - CHUOKAI（中央会）：自中央会のみ参照可能
  - JA_HONTEN（JA本店）：自JAのみ参照可能（`ja_id = user.ja_id`）
  - JA_KANRI_SHITEN（JA管理支店）：自管理支店のみ参照可能
- DataScope違反の場合：HTTP 404 (`NOT_FOUND`)（存在隠蔽）

### 4.3 購読者の存在確認

```sql
SELECT dokusya_id, ja_id, kanri_shiten_id
FROM t_dokusya
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
  AND deleted_at IS NULL
```

- レコードが存在しない場合：HTTP 404 (`NOT_FOUND`)

### 4.4 履歴データ取得

```sql
SELECT dokusya_rireki_id, dokusya_id, rireki_no,
       tetsuzuki_shurui,
       saishin_data_flg, shinki_flg, kaiyaku_flg, zougen_hokoku_flg,
       denshi_shonin_status,
       created_at, created_by
FROM t_dokusya_rireki
WHERE dokusya_id = :dokusya_id
  AND ja_id = :ja_id
ORDER BY rireki_no DESC
```

### 4.5 レスポンス生成

- tetsuzuki_shurui 値をラベル（m_code.code_category='TETSUZUKI_SHURUI'）にマッピング。
- data 配列を含むJSONを返却する。HTTP 200。

### 4.6 例外処理

- DB接続エラー等の場合：HTTP 500 (`INTERNAL_SERVER_ERROR`)
