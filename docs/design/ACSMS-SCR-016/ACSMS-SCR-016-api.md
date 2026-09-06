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
updated_date: 2026/08/19
updated_by: Tran Duc Tuyen
---

## 変更履歴

| No  | 発行日     | 版数 | 担当者         | 変更内容 | 確認者         | 承認者         |
| --- | ---------- | ---- | -------------- | -------- | -------------- | -------------- |
| 1   | 2026/05/15 | 1.0  | Tran Duc Tuyen | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2   | 2026/06/16 | 1.1  | Tran Duc Tuyen | 不具合修正：UPDATE_ALL / UPDATE_PARTIAL の更新カラム欠落を修正。`UPDATE_ALL` は §4.4.2 の全項目（email / 郵便番号 / 都道府県 / 住所 / 配達先 / 口座 / 単価・販売店 等）を更新するよう実装を是正（旧実装は7列のみ）。`UPDATE_PARTIAL` の更新可能カラムを取込テンプレート全項目（FKコード列 hanbaiten_code→hanbaiten_id / tanka_code→tanka_id 解決含む）へ拡張。NOT NULL の FK・参照列（管理支店 / 支店 / 販売店 / 単価 / 購読種別 / 手続種類 / 支払方法）は空欄上書きで制約違反にならないよう `COALESCE(:値, 既存値)` で既存値を維持。購読開始日(初回・shoki_dokusya_kaishi_date)は不変のため更新対象外。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 3   | 2026/06/25 | 1.2  | Tran Duc Tuyen | 顧客要件 2026-06：(1) **手続種類カラムをテンプレート/取込列から削除**。取込で解約は扱わず、NEW は `tetsuzuki_shurui=1`（新規）固定、UPDATE は手続種類を変更しない（既存値維持）。(2) **販売店適用日カラムを追加**（テンプレート末尾）。(3) UPDATE は読者情報変更適用日が必須、販売店が変わる行は販売店適用日が必須（IMPORT_VALIDATION_ERROR）。(4) **UPDATE で情報変更と販売店変更が同時のとき履歴を2件に分割**（情報イベント: hanbaiten_tekiyo_date=NULL / 販売店イベント: hanbaiten_tekiyo_date=joho_henko=販売店適用日。適用日が早い方を先・遅い方を saishin_data_flg=true。UI 編集 SCR-011/013 §14.3 と同一ロジック）。旧 §4.4.4 一括中止（解約）は廃止。(5) **「購読者情報と同じ」(haitatsu_same_flg) 列を追加**（配達先列の直前）。TRUE なら配達先＝購読者住所で配達先列は空でよい。BE は推論せず列値を採用（列が空欄の行のみ従来の自動判定）。取込列上限は 49→50 に拡張。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 4   | 2026/07/13 | 1.3  | Tran Duc Tuyen | 顧客要件 2026-07：**販売店適用日カラムを廃止**し、適用日を読者情報変更適用日(joho_henko_tekiyo_date)に統一（販売店・支払方法を含む全変更の唯一の適用日）。取込 UPDATE も **1更新1レコード**（情報+販売店を同時に変えても履歴は1件。UI編集 SCR-011/013・一括置換 SCR-015 と同一ロジックに完全統一）。v1.2 の「2件分割」と「販売店が変わる行は販売店適用日が必須」を撤廃。取込列上限は 50→49、テンプレート・列パネルから販売店適用日を除去。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 5   | 2026/07/18 | 1.4  | Tran Duc Tuyen | 顧客要件 2026-07 改訂：購読種別依存のバリデーションを共通モジュール(`dokusya-shubetsu.rules.ts`)に集約し UI編集(SCR-011)/一括置換(SCR-015)/取込(本画面)で統一。(1) **取込 UPDATE で当日変更を許可**（従来 v1.3 は一律「未来日のみ」）。電子版=当日のみ、紙版=当日/未来だが帳票影響項目(部数/販売店/住所)を当日変更した場合は予約変更（未来日）を要求。(2) **電子版の購読部数=1 を取込でも検証**（従来 未チェックのバグを修正）。(3) 併読・電子版クレカ の取込不可は据え置き（読取専用＝第3システム同期）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 6   | 2026/07/27 | 1.5  | Tran Duc Tuyen | 顧客要件 2026-07：取込を**紙版/電子版の2モードに分離**。(1) 「購読種別」を Excel テンプレート列から**撤去**（49→48列）し、画面ラジオ（紙版/電子版）で選択して全取込行へ一律適用する **top-level パラメータ `dokusya_shubetsu`（1/2、必須・`@IsIn([1,2])`）** に変更（単一ソース。行データ・selected_columns からは除外）。(2) 3:併読はラジオに出さず取込不可（据え置き）。(3) UPDATE では既存購読者の購読種別が選択値と異なる行を `IMPORT_VALIDATION_ERROR`（field=dokusya_shubetsu）で弾く。(4) 電子版クレカ禁止・電子版メール必須/一意 等の種別依存ルールはラジオ値で判定。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 7   | 2026/08/03 | 1.6  | Tran Duc Tuyen | 顧客要件 2026-08：**適用日・中止日を Excel 列から top-level パラメータへ**。(1) `joho_henko_tekiyo_date` / `dokusya_chushi_date` を行データ・テンプレート列から**撤去**し、画面の入力欄で1ファイル1つ指定する top-level パラメータに変更（48→46列）。両者は**排他**で、`NEW` では指定不可、`UPDATE` はどちらか必須（電子版は当日固定のため適用日を省略可）。違反は `VALIDATION_ERROR`（行エラーではなくフォームエラー）。(2) **`dokusya_chushi_date` 指定＝一括中止**（§4.8 新設）。解約予約を1件 append し、`selected_columns` の他列は書かない。確定は到来日バッチ。(3) 電子版の一括中止は同一処理内で `cancel` を push し、1件でも失敗したら全件ロールバック＋送信済み分へ打ち消し（`cancel_ym` 空）。打ち消し失敗分は会員IDをエラーログへ。紙版は連携なし。(4) 電子版の一括中止は500行まで。(5) 旧「一括中止」（組合員コードをキーに手続種類=解約）の記述を概要から削除（v1.2 で廃止済みだが残存していた）。 | Nguyen Huy Dat | Nguyen Huy Dat |
| 8 | 2026/08/05 | 1.7 | Tran Duc Tuyen | 顧客要件 2026-08（#56568）：電子版・併読レコードのメールアドレス重複チェックを **JA 横断** に変更。取込前の既存メール事前ロードから `ja_id` 条件を外し、他 JA の電子版・併読レコードとも突き合わせる（電子版ではメールが会員の同定キー＝ログインIDのため）。同一取込バッチ内の重複検知は従来どおり。紙版は対象外、論理削除済みは再利用可。SCR-011 画面登録と同一ルール。 | | |
| 9 | 2026/08/06 | 1.8 | Tran Duc Tuyen | 記載不整合の是正：テンプレート列数の記述が「46列」のまま残っていた（ACSMS-API-016-001 の §概要・§出力仕様・§4.x）。#56405（購読者層分類の従属4項目追加）で列一覧自体は 50 列へ更新済みだったが、本文の数値だけが v1.6 時点のままで一覧と矛盾していた。3箇所を 50 列へ修正。テンプレートの実装・列順は変更なし（統合テスト `dokusya-import.integration.spec.ts` が 50 列を検証している） | | |
| 10 | 2026/08/17 | 1.9 | Tran Duc Tuyen | 顧客要件 2026-08：電子版は実在の販売店へ配達しないため、部数(`dokusya_busu`)・販売店コード(`hanbaiten_code`)とも行の入力値に関わらず常に単一の固定値（1 / ダミー販売店コード9999999999）へ強制上書きするよう変更。両列は `NEW` モードの必須列からも除外（画面上もチェックボックス無しのグレー表示に変更）。当該JAにダミー販売店（`hanbaiten_code=9999999999`）が未整備の場合、電子版取込は行ループの前に一括で `VALIDATION_ERROR` を返すバリデーションを新設（ACSMS-SCR-011登録/編集・dokusya-syncバッチと同一のダミー販売店運用に統一）。 | | |
| 11 | 2026/08/17 | 1.10 | Tran Duc Tuyen | 顧客要件 2026-08：住所変更と販売店の移動が同一適用日に別々の更新として積み重なると増減連絡票（ACSMS-SCR-028）の同日集計が意図しない出力になるため、**紙版の`UPDATE`モード（joho_henko_tekiyo_dateが未来日）は同一適用日への変更を1回までに制限**（§4.3.5新設）。対象dokusya_idに既にアクティブな履歴行がある場合 `IMPORT_VALIDATION_ERROR`(field=joho_henko_tekiyo_date) を返す。同日にまとめて変更したいときはACSMS-SCR-013で該当履歴を取消してから1回で取込む。当日変更・電子版は対象外。ACSMS-SCR-011・SCR-015にも同一制限を適用（3経路共通ロジック）。 | | |
| 12 | 2026/08/17 | 1.11 | Tran Duc Tuyen | 不具合修正：`NEW`モードの`dokusya_kaishi_date`（購読開始日）が紙版・電子版とも一律「未来日のみ」で検証されており、**電子版で本日の日付を入力しても誤って拒否される**バグを修正。ACSMS-SCR-011登録画面（ラジオボタン「今日から/翌月1日から」）と同じ制約に揃え、**電子版のNEWは購読開始日=本日または翌月1日のみ許可**するよう変更（それ以外はエラー「電子版の購読開始日は本日または翌月1日を指定してください。」）。紙版は「未来日のみ」のまま変更なし。判定ロジックは共通モジュール`dokusya-shubetsu.rules.ts`に追加し、将来ACSMS-SCR-011のBE側にも同一制約を敷けるよう再利用可能にした。 | | |
| 13 | 2026/08/18 | 1.12 | Tran Duc Tuyen | 不具合修正 2026-08：電子版(2)は配達先情報エリアが画面上非活性化される（v1.9の`dokusya_busu`/`hanbaiten_code`と同種の制約）が、配達先情報12項目（`haitatsu_same_flg`＋住所5＋連絡先2＋氏名4）にはこれまでゲートが無く、`selected_columns`に含めて値を送れば電子版でも保存できてしまっていた。`dokusya_busu`/`hanbaiten_code`と同方式（BEが行ごと固定値へ強制上書き）で、電子版は12項目を常に`haitatsu_same_flg=true`・残り11項目=空文字へ強制するよう修正（BE: `buildHaitatsuPayload`。ACSMS-SCR-011登録/編集画面と同一のゲート）。取込列パネル（画面）も電子版選択時はこの12項目をグレー表示＋チェック解除するよう修正。 | | |
| 14 | 2026/08/18 | 1.13 | Tran Duc Tuyen | 不具合修正 2026-08：`UPDATE`モード（一括中止含む）で、`selected_columns`に含まれない列の値が行検証で誤って弾かれるバグを修正。一括中止（`dokusya_id`のみ選択）で取込んだ際、Excelシートに残っていた無関係セル（メールアドレス・メールマガジン・生年等）の値が`selected_columns`対象外にも関わらず`@IsEmail`/`@IsNumber`等の形式チェックへ届き、`IMPORT_VALIDATION_ERROR`で全体が拒否されていた。§4.1にドキュメント済みの「各行の検証はselected_columns対象列のみ」を実装で徹底し、`UPDATE`時は`selected_columns`（＋キー列`dokusya_id`）に無い列をDTO検証前にサーバ側で除去する`stripUnselectedColumns`をBEに追加。FE（`DokusyaImportView.vue`）も送信前に選択解除中の列を行データから除外するよう修正（従来は電子版固定列のみ個別除外していたのを、選択状態(`selected[col]`)に基づく一貫した除外へ統一）。`NEW`モードは対象外（必須列は既定で全選択）。 | | |
| 15 | 2026/08/18 | 1.14 | Tran Duc Tuyen | 顧客要件 2026-08：v1.13の`stripUnselectedColumns`（selected_columns対象外の列を除去）を**`NEW`モードにも拡張**。従来はUPDATEのみ対象だったため、新規登録でチェックを外した任意項目（例: メールアドレス・備考）にExcelセルの値が残っていると、選択解除＝未入力のつもりが誤って検証・登録されていた。除去された列はINSERT時にNULL/空文字（列のNOT NULL制約に従う既定値）になる。あわせて**取込列パネルの「ID」を新規登録モードでは常にグレー表示＋チェック不可**にする（自動採番のため新規登録では無意味な項目のため。dokusya_busu/hanbaiten_code(電子版)と同じ「チェックボックス無し」方式）。 | | |
| 16 | 2026/08/19 | 1.15 | Tran Duc Tuyen | 不具合修正 2026-08：①**組合員コードが同一JA内で重複している場合、`dokusya_id`未指定でのUPDATE/一括中止を拒否**するよう明記（`classifyImportRow`の`isAmbiguousKumiaiinKey`は既存実装だが未文書化だった。§4.1に追記）。②上記ガードの前提として、`kumiaiin_code`は`dokusya_id`と同様UPDATE時の突合フォールバックキーのため`stripUnselectedColumns`が`selected_columns`に無くても常に保持するよう修正（v1.13実装時の回帰 — 保持していなかったため、一括中止で組合員コードのみを指定すると常に「指定された購読者が見つかりません」で失敗していた）。③氏名かな4項目（`shimei_kana_sei`/`shimei_kana_mei`/`haitatsu_shimei_kana_sei`/`haitatsu_shimei_kana_mei`）に全角ひらがなのみ許容するバリデーションを追加（半角カナ・カタカナ・漢字・英数字を拒否。従来は最大100文字チェックのみで書式チェックが無かった）。氏名（漢字）4項目の最大50文字は既存仕様のまま変更なし。 | | |
| 17 | 2026/08/19 | 1.16 | Tran Duc Tuyen | 不具合修正 2026-08：電子版は`joho_henko_tekiyo_date`（読者情報変更適用日）省略を許容し、省略時は書込み側（`DokusyaImportService`）が当日を補って書き込むが、行検証（`validateImportRowTekiyoDates`）の「適用日は購読開始日以降」チェック（`collectTekiyoDateViolations`）は省略値=nullのままこの相対チェックをスキップしていた。購読開始日（`dokusya_kaishi_date`）が翌月1日等まだ到来していない電子版購読者を、適用日欄を空欄にしたままUPDATE取込（再取込含む）すると検証をすり抜け、共通履歴ライタ（`applyChange`の`findBefore`）が「当日時点で有効な直前の履歴行」を見つけられず、直前行なし（`before=null`）起点の不完全な履歴行が余分に作られてしまうバグを修正。行検証も書込み側と同じ既定値（電子版は当日）を用いて相対チェックを行うよう修正し、この組み合わせは`IMPORT_VALIDATION_ERROR`（field=joho_henko_tekiyo_date、§4.1参照）で拒否されるようにした（UI編集SCR-011は元々`assertUpdateDateConsistency`で同じ組み合わせを拒否しており、本画面のみ抜けていた）。 | | |
| 18 | 2026/08/19 | 1.17 | Tran Duc Tuyen | 不具合修正 2026-08（重大・誤更新）：`UPDATE`モード（一括中止含む）の更新対象解決（`resolveImportTargetId`）が`WHERE dokusya_id = :id OR kumiaiin_code = :code`という**OR条件**になっており、「dokusya_id優先・無ければkumiaiin_codeで代替」という設計意図（v1.15の重複防止ガードもこの前提）に反していた。`kumiaiin_code`はUNIQUE制約が無く同一JA内で重複しうるため、同一バッチ内に同じ`kumiaiin_code`を持つ行が2件以上あると、各行が明示的に異なる`dokusya_id`を指定していても、OR条件のもう一方（`kumiaiin_code`一致）で他方の購読者にヒットしうる。実測では`LIMIT 1`（ORDER BY無し）が常に物理的に先頭の行を返すため、**2行の更新が両方とも1人の購読者に誤って適用され、もう一方の購読者は一切更新されないまま**だった（ユーザー報告「Excel再取込で作られた履歴行のデータが一致しない」の実体）。`dokusya_id`が指定されている行は`kumiaiin_code`を一切参照せず`dokusya_id`のみで検索するよう2クエリに分離して修正（§4.3.4参照）。 | | |
| 19 | 2026/08/19 | 1.18 | Tran Duc Tuyen | 不具合修正 2026-08：廃店(`m_hanbaiten.haiten_flg=true`)の販売店・失効(`m_tanka.active_flg=false`)の単価を取込で選択できてしまう不具合を修正。修正前は取込自体が成功し、購読者詳細画面（ACSMS-SCR-011）にも廃店・失効の旨を示す表示が無いため運用が事後に気付けなかった。§4.3.1/§4.3.2のFK解決クエリに`active_flg`/`haiten_flg`を追加し、存在するが廃店/失効している場合は`IMPORT_VALIDATION_ERROR`（field='tanka_code'/'hanbaiten_code', message='指定された新聞単価コードは失効しています。'/'指定された販売店コードは廃店のため選択できません。'）で拒否する。廃店/失効後もレコード自体は過去購読者の履歴参照のため削除されないため、「存在しない」エラーとは区別する。NEW/UPDATE（新規選択・変更時）両方が対象。UI編集画面(SCR-011)にはこの相当チェックが元々無く、本画面で新設した業務ルール（UI側は別途要検討・本対応の範囲外）。 | | |
| 20 | 2026/08/20 | 1.19 | Tran Duc Tuyen | 顧客要件 2026-08：通常更新（`joho_henko_tekiyo_date`指定）と一括中止（`dokusya_chushi_date`指定）で対象購読者の突合キー解決ルールを分離（§4.1/§4.3.1）。①通常更新は`dokusya_id`を必須とし、`kumiaiin_code`（同一JA内で重複しうる）へのフォールバックを廃止 — 未指定行は`IMPORT_VALIDATION_ERROR`（field=dokusya_id, message='IDは必須です。'）。②一括中止は従来どおり`dokusya_id`優先・無ければ`kumiaiin_code`（2件以上ヒットで曖昧エラー）を維持。画面（DokusyaImportView.vue）も追従: 通常更新は`dokusya_id`列を常時チェック済み+編集不可（従来どおり）のまま、一括中止時は列グリッドを`dokusya_id`/`kumiaiin_code`の2列のみへ縮退させ、どちらも編集可能なチェックボックスにする（従来は`dokusya_id`のみに固定・`kumiaiin_code`は選択不可だった）。一括中止で両方未選択のまま送信しようとした場合はクライアント側でも「IDまたは組合員コードのいずれかを選択してください。」のトーストで即時ブロックする（BE側も同条件で最終防御）。 | | |
| 21 | 2026/08/20 | 1.20 | Tran Duc Tuyen | 不具合修正 2026-08：紙版（`dokusya_shubetsu`≠2）のExcel取込で、電子版単独用のダミー販売店（`hanbaiten_code`=`9999999999`）を選択できてしまう不具合を修正（§4.3.1）。ダミー販売店は「配達先の販売店が無い」を意味するため、紙を配る読者に付くと増減連絡票・名簿の配達担当が誤る。`IMPORT_VALIDATION_ERROR`（field='hanbaiten_code', message='販売店コード「9999999999」は電子版専用のダミー販売店のため、紙版では選択できません。'）で拒否する。UI編集画面(SCR-011)は`BaseHanbaitenSelect`が既にダミーを候補から除外しているが、Excel取込は`hanbaiten_code`が自由入力のためこのガードが欠けていた。NEW/UPDATE両方が対象。 | | |
| 22 | 2026/08/20 | 1.21 | Tran Duc Tuyen | 不具合修正 2026-08：購読者氏名・配達先氏名まわりの検証をUI(SCR-011)と揃えた（§4.1）。①`shimei_sei`/`shimei_mei`/`haitatsu_shimei_sei`/`haitatsu_shimei_mei`に漢字・ひらがな・カタカナ・アルファベット・数字のみ許容する書式チェックを追加（従来は最大文字数のみ）。②`shimei_sei`/`shimei_mei`/`shimei_kana_sei`/`shimei_kana_mei`をNEWモードの必須列に追加（UI側`REQUIRED_COLUMNS_NEW`は既に必須扱いだったが、BE側の行内容チェックが抜けており空欄セルでも取込めていた）。③配達先氏名4項目をNEWモードかつ紙版で配達先≠購読者情報のとき必須化（UIの`haitatsuRequired`と同条件）。④`kumiaiin_code`の最大文字数を20→10へ変更（UI`:maxlength="10"`・`screen-design.md`と統一）。 | | |
| 23 | 2026/08/20 | 1.22 | Tran Duc Tuyen | 不具合修正 2026-08：監査ログの`operation`ラベルを`IMPORT_UPDATE_PARTIAL`→`IMPORT_UPDATE`に改称（`AuditOperation`enum。販売店Excel取込 ACSMS-SCR-019 と共通）。取込はNEW/UPDATEの2モードのみで「全列/一部列」の区別が実装されたことが無く、`_PARTIAL`表記が実態と合っていなかったため。未使用の`IMPORT_UPDATE_ALL`も削除。過去ログの表示・検索には影響しない（新規書込みのみ新ラベル）。 | | |

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
| 10  | 画面固有     | ROW_LIMIT_EXCEEDED        | ファイルの行数が上限（5000行）を超えているため、取込みできません。             | HTTP 400 |

---

# API ACSMS-API-016-001

## 概要

| 項目                   | 内容                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API名                  | Download Dokusya Import Template                                                                                                                                                                      |
| 概要                   | 購読者Excelデータ取込用のテンプレートファイル（50列固定）を生成しダウンロードする。                                                                                                                   |
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
- 1行目：ヘッダー行（50列を以下の順序で設定）

| 列 | ヘッダー名                       | 論理カラム                 | 物理カラム                 | データ型      | 桁数 |
| -- | -------------------------------- | -------------------------- | -------------------------- | ------------- | ---- |
| 1  | ID                               | 購読者ID                   | dokusya_id                 | BIGINT        | -    |
| -  | ~~購読種別~~（**列から撤去** v1.5）| ~~購読種別~~              | ~~dokusya_shubetsu~~       | -             | -    |
| 3  | ~~手続種類~~（**削除** v1.2）    | ~~手続種類~~               | ~~tetsuzuki_shurui~~       | -             | -    |
| 4  | 管理支店                         | 管理支店コード             | kanri_shiten_code          | VARCHAR       | 20   |
| 5  | 支店                             | 支店コード                 | shiten_code                | VARCHAR       | 20   |
| 6  | 組合員コード                     | 組合員コード               | kumiaiin_code              | VARCHAR       | 10   |
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
| 45 | かつJAグループ役職員             | かつJAグループ役職員       | ja_yakushokuin_flg         | BOOLEAN       | -    |
| 46 | 農業関係                         | 農業関係                   | nogyo_kankei_flg           | BOOLEAN       | -    |
| 47 | 読者属性（その他の内容）         | 購読者層分類その他         | dokusyaso_bunrui_sonota    | VARCHAR       | 255  |
| 48 | 農業者分類                       | 農業者分類                 | nogyosya_bunrui            | VARCHAR       | 50   |
| 49 | 主な生産物（その他の内容）       | 農業者分類その他           | nogyosya_bunrui_sonota     | VARCHAR       | 255  |
| 50 | 購読開始日                       | 購読開始日                 | dokusya_kaishi_date        | DATE          | -    |
| 51 | 備考                             | 備考                       | biko                       | TEXT          | -    |

> v1.3（顧客要件 2026-07）: 「販売店適用日」列を**廃止**し、適用日は「読者情報変更適用日」(joho_henko_tekiyo_date) に統一（販売店・支払方法を含む全変更の唯一の適用日）。取込 UPDATE も **1更新1レコード**（情報+販売店を同時に変えても履歴は1件。UI編集/一括置換と同一ロジック）。取込列は 50→49。実カラム順の正準は BE `IMPORT_TEMPLATE_HEADERS`。
>
> v1.5（顧客要件 2026-07）: 取込を**紙版/電子版の2モードに分離**。「購読種別」を Excel 列から**撤去**し、画面ラジオ（紙版/電子版）で選択して全取込行へ一律適用する top-level パラメータ `dokusya_shubetsu`（1/2）に変更（単一ソース）。取込列は 49→48。3:併読はラジオに出さず取込不可。UPDATE では既存購読者の購読種別が選択値と異なる行を弾く。
>
> v1.6（顧客要件 2026-08）: 「読者情報変更適用日」「購読中止日」も Excel 列から**撤去**し、画面の入力欄で指定する top-level パラメータへ移行（1ファイル1つ。行ごとの値は持てない）。取込列は 48→46。列に残すと画面と Excel のどちらが勝つのか説明できないため。
> **NEW（新規登録）モードでは「読者情報変更適用日」は対象外**（履歴の変更イベント日であり新規登録に概念が無いため。取込列パネルでは未チェック＋disable、保存時は購読開始日に揃える）。UPDATE でのみ使用する。

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
- 1行目に50列のヘッダー文字列を以下の順序で書き込む（購読種別・読者情報変更適用日・購読中止日は画面で指定する単一ソースのため列に含めない）。
  - 「ID」「管理支店」「支店」「組合員コード」「購読者苗字（漢字）」「購読者名前（漢字）」「購読者苗字（かな）」「購読者名前（かな）」「購読部数」「新聞単価」「メールアドレス」「メールマガジン」「生年（西暦）」「性別」「郵便番号」「都道府県」「市町村郡」「丁目番地」「マンション・アパート名」「連絡先１」「連絡先２」「郵便番号(配達先)」「都道府県(配達先)」「市町村郡(配達先)」「丁目番地(配達先)」「ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)」「連絡先１(配達先)」「連絡先２(配達先)」「配達先苗字（漢字）」「配達先名前（漢字）」「配達先苗字（かな）」「配達先名前（かな）」「販売店コード」「郵送区分」「支払方法」「購読料支払サイクル（月数）」「引落口座貯金種目」「引落口座支店コード」「引落口座支店名」「引落口座番号」「引落口座名義」「購読者層分類」「かつJAグループ役職員」「農業関係」「読者属性（その他の内容）」「農業者分類」「主な生産物（その他の内容）」「購読開始日」「備考」<br>※「購読中止日」「読者情報変更適用日」は画面の入力欄へ移したため列には無い（v1.7）。
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
| 概要                   | 購読者Excelデータを一括取込する（新規登録 / 更新）。1トランザクションで処理し、エラー時は全件ロールバック。`dokusya_chushi_date` を指定した取込は**一括中止**（解約予約の作成）となる（→ §4.8）。取り込みと同件数分のレコードを `t_dokusya_rireki` テーブルに追加する。 |
| URI                    | /api/v1/dokusya/import                                                                                                                                                                                                                                                                                     |
| メソッド               | POST                                                                                                                                                                                                                                                                                                       |
| リクエストボディー     | JSON                                                                                                                                                                                                                                                                                                       |
| リクエストパラメーター |                                                                                                                                                                                                                                                                                                            |
| ヘッダ                 | Content-Type: application/json  ※ 認証情報はHTTP-only Cookieにより自動的に送信される                                                                                                                                                                                                                     |
| HTTPレスポンスコード   | 200:正常に取込処理が完了しました, 400:入力内容にエラーがあります, 400:Excel取込データにエラーがあります, 400:取込データ行数の上限を超えています, 401:セッションが切れました。再度ログインしてください, 403:この画面へのアクセス権限がありません, 500:システムエラーが発生しました                       |

## リクエストパラメータ

| #   | パラメーターID                | タイプ  | 繰り返し | 必須 | 最小長 | 最大長 | 説明                                                                                                                                                       |
| --- | ----------------------------- | ------- | -------- | ---- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | import_mode                   | String  | -        | ○    |        |        | 取込モード（`NEW`:新規登録, `UPDATE`:更新）                                                                                                                |
| 1a  | dokusya_shubetsu              | Number  | -        | ○    | -      | -      | **購読種別（top-level・v1.5 顧客要件 2026-07）**。画面ラジオで選択し全取込行へ一律適用する単一ソース（Excel の列ではない）。**1:紙版 / 2:電子版 のみ**。3:併読は取込不可（`@IsIn([1,2])`）。 |
| 1b  | joho_henko_tekiyo_date        | String  | -        | -    | -      | 10     | **読者情報変更適用日（top-level・v1.6 顧客要件 2026-08）**。画面の入力欄で指定し全取込行へ一律適用（Excel の列ではない）。`YYYY-MM-DD`。`UPDATE` で必須（電子版は当日固定のため省略可・BE が当日を補う）。`dokusya_chushi_date` とは**排他**。`NEW` では指定不可。 |
| 1c  | dokusya_chushi_date           | String  | -        | -    | -      | 10     | **購読中止日（top-level・v1.6 顧客要件 2026-08）**。指定すると**一括中止**（解約予約の作成）になる（→ §4.8）。`YYYY-MM-DD`。`joho_henko_tekiyo_date` とは**排他**。`NEW` では指定不可。空文字による一括取消は受け付けない。 |
| 2   | selected_columns              | Array   | 〇       | ○    | 1      | 46     | 取込対象の列（物理カラム名）配列。新規登録モードでは必須列を必ず含むこと。一括中止ではキー列（`dokusya_id`）以外は無視される。                             |
| 3   | rows                          | Array   | 〇       | ○    | 1      | 5000  | 取込データ行の配列。5000件を超える場合は `ROW_LIMIT_EXCEEDED` を返却する。                                                                                |
| 4   | →dokusya_id                   | Number  | -        | -    | -      | -      | 購読者ID。`UPDATE` モード（組合員コード未指定時）はキー項目として必須。`NEW` モードは無視する。                                                            |
| 5   | ~~→dokusya_shubetsu~~（**列から撤去** v1.5） | -  | -   | -   | -   | -   | 購読種別は行データではなく top-level `dokusya_shubetsu`（#1a）で一律指定する（画面ラジオの単一ソース）。UPDATE では既存購読者の購読種別が選択値と異なる行を `IMPORT_VALIDATION_ERROR`（field=dokusya_shubetsu）で弾く。 |
| 6   | →tetsuzuki_shurui             | Number  | -        | -    | -      | -      | 手続種類 ※m_code.code_category='TETSUZUKI_SHURUI'を参照（0:解約, 1:新規）                                                                                  |
| 7   | →kanri_shiten_code            | String  | -        | -    | 0      | 20     | 管理支店コード。自JA内の m_kanri_shiten.kanri_shiten_code を解決し t_dokusya.kanri_shiten_id へ保存。`NEW` モードは必須。                                    |
| 8   | →shiten_code                  | String  | -        | -    | 0      | 20     | 支店コード。自JA内の m_shiten.shiten_code を解決し t_dokusya.shiten_id へ保存。                                                                              |
| 9   | →kumiaiin_code                | String  | -        | -    | 0      | 10     | 組合員コード。UPDATE で ID が空のときの代替キー。                                                                                                            |
| 10  | →shimei_sei                   | String  | -        | -    | 0      | 50     | 氏名（姓・漢字）                                                                                                                                            |
| 11  | →shimei_mei                   | String  | -        | -    | 0      | 50     | 氏名（名・漢字）                                                                                                                                            |
| 12  | →shimei_kana_sei              | String  | -        | -    | 0      | 100    | 氏名かな（姓）                                                                                                                                              |
| 13  | →shimei_kana_mei              | String  | -        | -    | 0      | 100    | 氏名かな（名）                                                                                                                                              |
| 14  | →dokusya_busu                 | Number  | -        | -    | -      | -      | 購読部数。`NEW`：> 0、解約時：= 0。**電子版(2)は行の値に関わらず常に 1 へ強制上書き**され、`NEW` モードの必須列からも除外される（v1.9・顧客要件 2026-08 — 電子版は実在の販売店へ配達しないため部数は常に単一固定値）。                                                                        |
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
| 38  | →hanbaiten_code               | String  | -        | -    | 0      | 10     | 販売店コード（m_hanbaiten の hanbaiten_code で解決）。`NEW` モードは必須（紙版のみ）。**電子版(2)は行の値に関わらず常にダミー販売店コード `9999999999`（`HANBAITEN_DUMMY_CODE`）へ強制上書き**され、`NEW` モードの必須列からも除外される（v1.9・顧客要件 2026-08 — 電子版は実在の販売店へ配達しないため受け皿として自JAのダミー販売店に紐づける。ACSMS-SCR-011 登録/編集・dokusya-sync バッチと同一の運用）。当該 JA にダミー販売店（`hanbaiten_code=9999999999`）が未整備の場合、電子版取込は行ループに入る前に `VALIDATION_ERROR`（field=hanbaiten_code）で一括して弾かれる（下記エラー例参照）。                                                                                  |
| 39  | →yubin_kubun                  | String  | -        | -    | 0      | 1      | 郵送区分 ※m_code.code_category='YUBIN_KUBUN'を参照（0:空, 1:郵送）                                                                                          |
| 40  | →shiharai_hoho                | Number  | -        | -    | -      | -      | 支払方法 ※m_code.code_category='SHIHARAI_HOHO'を参照（1:口座引落, 2:現金集金, 3:振込集金, 4:JA施設等, 5:給与天引き, 6:クレジットカード, 9:その他）。`NEW` モードは必須。 |
| 41  | →dokusyaryo_shiharai_cycle    | Number  | -        | -    | -      | -      | 購読料支払サイクル（月数）                                                                                                                                  |
| 42  | →hikiotoshi_yokin_shubetsu    | Number  | -        | -    | -      | -      | 引落口座貯金種目 ※m_code.code_category='YOKIN_SHUBETSU'を参照（1:普通, 2:当座）。文言（「普通」「当座」）でも取込可。                                       |
| 43  | →bank_branch_code             | String  | -        | -    | 0      | 3      | 引落口座支店コード                                                                                                                                          |
| 44  | →bank_branch_name             | String  | -        | -    | 0      | 100    | 引落口座支店名                                                                                                                                              |
| 45  | →hikiotoshi_koza_no           | String  | -        | -    | 0      | 10     | 引落口座番号                                                                                                                                                |
| 46  | →hikiotoshi_koza_meigi        | String  | -        | -    | 0      | 50     | 引落口座名義（全角カナ→半角カナに変換して保存）                                                                                                             |
| 47  | →dokusyaso_bunrui             | String  | -        | -    | 0      | 50     | 購読者層分類（カンマ区切り）                                                                                                                                |
| 48  | →ja_yakushokuin_flg           | Boolean | -        | -    | -      | -      | かつJAグループ役職員。購読者層分類=0:農業者 のときのみ有効。従属項目。購読者層分類が該当コードを含むときのみ有効で、外れる場合はサーバ側で false / 空文字へ落とす（画面 SCR-011 と同じ buildBunruiPayload を通す）。電子版 users.profession_and_* / others_* との連携用 |
| 49  | →nogyo_kankei_flg             | Boolean | -        | -    | -      | -      | 農業関係。購読者層分類=2:企業・団体 のときのみ有効。従属項目。購読者層分類が該当コードを含むときのみ有効で、外れる場合はサーバ側で false / 空文字へ落とす（画面 SCR-011 と同じ buildBunruiPayload を通す）。電子版 users.profession_and_* / others_* との連携用 |
| 50  | →dokusyaso_bunrui_sonota      | String  | -        | -    | 0      | 255    | 読者属性（その他の内容）。購読者層分類=999:その他 のときのみ有効。従属項目。購読者層分類が該当コードを含むときのみ有効で、外れる場合はサーバ側で false / 空文字へ落とす（画面 SCR-011 と同じ buildBunruiPayload を通す）。電子版 users.profession_and_* / others_* との連携用 |
| 51  | →nogyosya_bunrui              | String  | -        | -    | 0      | 50     | 農業者分類（カンマ区切り）                                                                                                                                  |
| 52  | →nogyosya_bunrui_sonota       | String  | -        | -    | 0      | 255    | 主な生産物（その他の内容）。農業者分類に 999:その他 を含むときのみ有効。従属項目。購読者層分類が該当コードを含むときのみ有効で、外れる場合はサーバ側で false / 空文字へ落とす（画面 SCR-011 と同じ buildBunruiPayload を通す）。電子版 users.profession_and_* / others_* との連携用 |
| 53  | →dokusya_kaishi_date          | String  | -        | -    | -      | 10     | 購読開始日（YYYY-MM-DD）。`NEW` モードは必須。                                                                                                              |
| 54  | →biko                         | String  | -        | -    | -      | -      | 備考                                                                                                                                                        |

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
  "dokusya_shubetsu": 1,
  "selected_columns": [
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

### 400 Bad Request (Validation Error — 電子版のダミー販売店未整備・v1.9)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "入力値が不正です。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "field": "hanbaiten_code", "message": "電子版の取込にはダミー販売店（販売店コード:9999999999）の事前登録が必要です。販売店マスタで作成してから再度お試しください。" }
  ]
}
```

### 400 Bad Request (Import Validation Error — 行別エラー)

```json
{
  "error_code": "IMPORT_VALIDATION_ERROR",
  "message": "Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。",
  "errors": [
    { "row": 2, "field": "dokusya_shubetsu", "message": "選択した購読種別と異なる購読者が含まれています。" },
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
  "message": "ファイルの行数が上限（5000行）を超えているため、取込みできません。"
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
    - `NEW` モードでは、新規登録必須項目（kanri_shiten_code, shiten_code, dokusya_busu, tanka_code, yubin_no, todofuken_code, shikuchoson, chome_banchi, renrakusaki_1, hanbaiten_code, shiharai_hoho, dokusya_kaishi_date）を必ず含むこと（手続種類はシステムが新規(1)を設定するため対象外。v1.2。購読種別は top-level `dokusya_shubetsu` で一律指定するため selected_columns 対象外。v1.5）。**電子版(2)は `dokusya_busu` / `hanbaiten_code` を必須列から除外**する（BE が行ごと固定値へ強制するため。v1.9・顧客要件 2026-08）。**`dokusya_id` は `NEW` モードでは選択列の対象外**（自動採番のため送信されても無視される。画面もグレー表示＋選択不可にする。不具合修正 2026-08）
  - `rows`：必須、配列、1件以上、5000件以下
    - 5000件を超える場合：HTTP 400 (`ROW_LIMIT_EXCEEDED`)
    - **`selected_columns` に含まれない列は、行の値がどうであれ DTO 検証前にサーバ側で除去する**（`ImportDokusyaDto` の `stripUnselectedColumns`。不具合修正 2026-08。`NEW`/`UPDATE` 両モード対象 — 当初 `UPDATE` のみだったが、新規登録でチェックを外した任意項目に Excel セルの値が残っていると誤って検証・登録される同種のバグが見つかり `NEW` にも拡張）。`UPDATE` は常にキー列 `dokusya_id` を残す（`NEW` は自動採番のため対象外——画面も新規登録では ID をグレー表示＋選択不可にする）。一括中止（`dokusya_chushi_date` 指定＝`selected_columns` が `dokusya_id` のみ）でも Excel シートに他列（メールアドレス・生年等）のセル値が残っていることがあり、除去しないと選択していない列の形式チェック（`@IsEmail`/`@IsNumber` 等）で無関係に 400 が返っていた。除去された列は `NEW` では INSERT 時に NULL/空文字（列の NOT NULL 制約に従う既定値）、`UPDATE` では既存値を維持する
  - 各行 `rows[i]` の検証（`selected_columns` 対象列のみ）：
    - 文字列項目：最大桁数チェック
    - 数値項目：型チェック、範囲チェック
    - `dokusya_shubetsu`（top-level・画面ラジオの単一ソース・v1.5）：1:紙版 / 2:電子版 のみ受付（`@IsIn([1,2])`）。3:併読はエラー（電子版連携のみで、Excel取込み対象外）。UPDATE では更新対象の既存購読者の購読種別が選択値と異なる行を `IMPORT_VALIDATION_ERROR`（field=dokusya_shubetsu, message=「選択した購読種別と異なる購読者が含まれています。」）で弾く。
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
    - `dokusya_busu`：1 以上（v1.2 — 解約は取込対象外のため 0 入力なし）。**電子版(2)は行の値に関わらず 1 へ強制上書きされる**ため、この検証は紙版の実質的な安全網としてのみ働く（v1.9・顧客要件 2026-08。旧 v1.4 は「1以外はエラー」だったが、必須列から除外し強制上書きへ変更したため実質到達不能）
    - `dokusya_kaishi_date`（NEW モードのみ必須。UPDATE では編集不可・既存値維持）：**日付ルールは購読種別依存**（v1.11・顧客要件 2026-08）。紙版(1)は従来どおり**未来日のみ**（当日・過去日不可、エラー「購読開始日は本日より後の日付を入力してください。」）。電子版(2)は**本日 または 翌月1日のいずれか**のみ許可（ACSMS-SCR-011 登録画面のラジオボタン「今日から/翌月1日から」と同一制約 — 取込画面には日付ピッカーが無く Excel セルの値をそのまま受け取るため BE 側だけで2値を担保する。上記以外の日付はエラー「電子版の購読開始日は本日または翌月1日を指定してください。」field=dokusya_kaishi_date）。旧版はこのルールを紙版・電子版とも「未来日のみ」で統一しており、電子版で当日日付を入れると誤って拒否されるバグがあった。
    - `joho_henko_tekiyo_date`：UPDATE では必須。**日付ルールは購読種別依存（v1.4 改訂・UI編集/一括置換と統一）**：過去日不可（当日以降）。電子版(2)は**当日のみ**（未来 joho は「電子版は当日のみ変更できます。予約変更（未来日）はできません。」エラー）。紙版(1)は**当日変更 + 予約変更（未来日）可**だが、**帳票影響項目（部数/販売店/購読者住所/配達先住所）を当日変更した場合は「帳票に影響する変更は予約変更（未来日を指定）で行ってください。」エラー**（該当項目に付与）。※従来 v1.3 は UPDATE 一律「未来日のみ」だったが、UI と揃えて当日変更を許可。**適用日は既存購読者の購読開始日（`dokusya_kaishi_date`）以降でなければならない**（UI編集 SCR-011 と同一ルール。違反時「情報変更適用日は購読開始日（YYYY/MM/DD）以降の日付を指定してください。」field=joho_henko_tekiyo_date）。電子版で本項目を省略した行は、書込み時にBEが補う「当日」を用いてこのチェックも行う（v1.16・不具合修正2026-08 — 従来は省略値=nullでこの相対チェックがスキップされ、購読開始日が翌月1日等でまだ到来していない電子版購読者を当日付けでUPDATE取込すると、共通ライタが直前の履歴行を見つけられず不完全な履歴行を作ってしまうバグがあった）。
    - `dokusya_kaishi_date` / `dokusya_chushi_date` / `joho_henko_tekiyo_date`：`YYYY-MM-DD` 形式
    - `renrakusaki_1` / `renrakusaki_2`：数字のみ保存
    - `hikiotoshi_koza_meigi`：全角カナ→半角カナ変換
    - **`shimei_sei` / `shimei_mei` / `haitatsu_shimei_sei` / `haitatsu_shimei_mei`：最大50文字、かつ漢字・ひらがな・カタカナ・アルファベット・数字のみ許容**（不具合修正 2026-08 — 従来は最大文字数チェックのみで書式チェックが無かった。UI(`DokusyaFormView.vue`の`KANJI_RE`)/`create-dokusya.dto.ts`の`KANJI_NAME_RE`と同一文字集合。違反時 `VALIDATION_ERROR`（message=「漢字・ひらがな・カタカナ・アルファベット・数字で入力してください。」））
    - **`shimei_kana_sei` / `shimei_kana_mei` / `haitatsu_shimei_kana_sei` / `haitatsu_shimei_kana_mei`：全角ひらがなのみ許容、最大100文字**（不具合修正 2026-08）。半角文字・カタカナ・漢字・英数字は `VALIDATION_ERROR`（message=「ひらがな・数字で入力してください。」）。FE の`HIRAGANA_RE`（`DokusyaFormView.vue`）と同一文字集合
    - **`shimei_sei` / `shimei_mei` / `shimei_kana_sei` / `shimei_kana_mei`：NEW モードは必須**（不具合修正 2026-08 — UI(SCR-011)は常時必須だが、Excel取込のNEWモードはこの4項目を空欄のまま取込めていた。未指定/空欄の行は `IMPORT_VALIDATION_ERROR`（field=各列名, message=「新規登録の場合、{購読者氏名_氏 等}は必須です。」）で拒否する）
    - **`haitatsu_shimei_sei` / `haitatsu_shimei_mei` / `haitatsu_shimei_kana_sei` / `haitatsu_shimei_kana_mei`：NEW モードかつ紙版で配達先≠購読者情報のとき必須**（不具合修正 2026-08 — UI(SCR-011)の`haitatsuRequired = !haitatsu_same_flg && !isDigitalOnly`と同条件。配達先が「購読者情報と同じ」(`haitatsu_same_flg`)は列で明示指定されればそれを、無ければ配達先7項目の入力有無から推論する。未指定/空欄の行は `IMPORT_VALIDATION_ERROR`（field=各列名, message=「新規登録の場合、{配達先苗字（漢字）等}は必須です。」）で拒否する）
    - **`kumiaiin_code`：最大10文字**（不具合修正 2026-08 — 従来20文字だったが、UI(`DokusyaFormView.vue`の`:maxlength="10"`)・`screen-design.md`(ACSMS-SCR-011)と揃えて10文字へ変更。文字種は引き続き制限なし）
- 業務ルールチェック（v1.4 — 共通モジュール `dokusya-shubetsu.rules.ts` に集約し UI/取込/一括置換で統一）：
  - 併読（`dokusya_shubetsu`=3）は取込不可 → エラー「購読種別が3:併読のためExcel取込みできません。」（第3システム同期のため読取専用）
  - 電子版（`dokusya_shubetsu`=2）かつクレジットカード決済（`shiharai_hoho`=6）の組み合わせは取込不可 → エラー（理由：電子版かつクレカ決済取込不可のため。読取専用）
  - 電子版の購読部数=1（上記 `dokusya_busu` 参照）
  - 種別依存の適用日ルール（上記 `joho_henko_tekiyo_date` 参照）
  - **電子版の販売店コード自動解決**（v1.9・顧客要件 2026-08）：電子版は実在の販売店へ配達しないため、行の `hanbaiten_code` に何が入っていても常にログインユーザーの JA が保有するダミー販売店（`hanbaiten_code=9999999999`・`HANBAITEN_DUMMY_CODE`）へ強制解決する。当該 JA にダミー販売店が未整備の場合、行ループへ入る前に一括で `VALIDATION_ERROR`（field=hanbaiten_code, message=「電子版の取込にはダミー販売店（販売店コード:9999999999）の事前登録が必要です。販売店マスタで作成してから再度お試しください。」）を返す（§4.3.2 も参照）。ダミー販売店の運用は ACSMS-SCR-011 登録/編集・dokusya-sync バッチと同一。
  - **電子版の配達先情報12項目を強制空欄化**（v1.12・不具合修正 2026-08）：電子版(2)は配達先情報エリアが画面上非活性化される（ACSMS-SCR-011 §7.5）ため配達先情報を一切持てない。`haitatsu_same_flg` / `haitatsu_yubin_no` / `haitatsu_todofuken_code` / `haitatsu_shikuchoson` / `haitatsu_chome_banchi` / `haitatsu_tatemono_mei` / `haitatsu_renrakusaki_1` / `haitatsu_renrakusaki_2` / `haitatsu_shimei_sei` / `haitatsu_shimei_mei` / `haitatsu_shimei_kana_sei` / `haitatsu_shimei_kana_mei` の12項目は、`selected_columns` の指定や行セルの値に関わらずサーバ側で `haitatsu_same_flg=true`・残り11項目=空文字へ強制する（BE: `dokusya.mapper.ts` の `buildHaitatsuPayload`。ACSMS-SCR-011 登録/編集画面と同一のゲート）。エラーにはせず値を落とすのみ（`dokusya_busu`/`hanbaiten_code` の強制上書きと同方式）。取込列パネル（画面）も電子版選択時はこの12項目をグレー表示＋チェック解除する。
  - **通常更新は`dokusya_id`必須、一括中止は`dokusya_id`または`kumiaiin_code`のいずれか必須**（v1.19・不具合修正 2026-08）：`joho_henko_tekiyo_date` を指定する通常更新は、`dokusya_id` を指定しない行を `IMPORT_VALIDATION_ERROR`（field=dokusya_id, message=「IDは必須です。」）で拒否する — `kumiaiin_code` は同一JA内で重複しうるキーのため、通常更新のキー解決には一切フォールバックしない。一方 `dokusya_chushi_date` を指定する一括中止は、`dokusya_id` を優先し、無ければ `kumiaiin_code` にフォールバックする（従来どおり）。
  - **組合員コード重複時は一括誤解約を防止**（v1.15・不具合修正 2026-08、v1.19で一括中止専用に限定）：一括中止で `dokusya_id` を指定しない行は `kumiaiin_code` が突合フォールバックキーになるが、同コードが同一 JA 内で2件以上ヒットする場合はどちらの読者を解約したいのか一意に決まらない。この場合、行ループへ入る前に一括で `IMPORT_VALIDATION_ERROR`（field=kumiaiin_code, message=「組合員コードが重複しているため、IDを指定してください。」）を返し、DB へは一切書き込まない（`classifyImportRow`の`isAmbiguousKumiaiinKey`。`dokusya_id`が指定されている行はこのチェック自体をスキップする）。※`kumiaiin_code`は`dokusya_id`と同じく一括中止時の突合キーのため、`selected_columns`に含まれていなくてもサーバ側で常に保持する（`stripUnselectedColumns`。含めないと組合員コードのみでの一括中止が常に「指定された購読者が見つかりません」で失敗する）。
  - **`dokusya_id`指定行の更新対象解決から`kumiaiin_code`の巻き込みを排除**（v1.17・不具合修正 2026-08）：上記ガードは`dokusya_id`未指定の行だけを対象にしていたが、実際の更新対象解決（`resolveImportTargetId`）は`WHERE dokusya_id = :id OR kumiaiin_code = :code`という**OR条件を1クエリにまとめた実装**になっており、これは「dokusya_id優先・無ければkumiaiin_codeで代替」ではなく「どちらか一致すればヒット」という別の意味になっていた。同一バッチ内で複数行が同じ`kumiaiin_code`を共有し、各行がそれぞれ異なる`dokusya_id`を明示していても、`LIMIT 1`（ORDER BY無し）は常に物理的に先頭の行を返すため、**2行とも同じ1人の購読者へ誤って書き込まれ、もう一方の購読者は一切更新されないまま**だった（`t_dokusya_rireki`に本来別々の購読者に入るはずの変更が1人分にまとめて積み上がり、データが一致しない不具合の実体）。`dokusya_id`が指定されている行は`kumiaiin_code`を一切参照せず`dokusya_id`のみで検索するよう修正（2クエリに分離）。
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
SELECT tanka_id, tanka_code, active_flg
FROM m_tanka
WHERE ja_id = :ja_id
  AND tanka_code = ANY(:tanka_codes)
  AND tanka_type = 1  -- 購読料
  AND deleted_at IS NULL
```

- 未ヒットの `tanka_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='tanka_code', message='指定された新聞単価コードが見つかりません。'）
- **`active_flg=false`（失効）の `tanka_code` は選択不可**（v1.18・不具合修正 2026-08）：`IMPORT_VALIDATION_ERROR` + errors（row, field='tanka_code', message='指定された新聞単価コードは失効しています。'）。失効単価行は参照整合性のため削除されない（過去購読者の履歴・帳票が単価名を引ける必要がある）ので存在チェック自体は通るが、新規選択・単価変更（selected_columnsに`tanka_code`を含む行）だけを弾く。NEW/UPDATE両方が対象。UI編集(SCR-011)には元々このチェックが無く、本画面で新設した業務ルール。

#### 4.3.2 販売店コードの解決

```sql
SELECT hanbaiten_id, hanbaiten_code, haiten_flg
FROM m_hanbaiten
WHERE ja_id = :ja_id
  AND hanbaiten_code = ANY(:hanbaiten_codes)
  AND deleted_at IS NULL
```

- 未ヒットの `hanbaiten_code`：`IMPORT_VALIDATION_ERROR` + errors（row, field='hanbaiten_code', message='指定された販売店コードが見つかりません。'）
- **電子版(`dokusya_shubetsu`=2)は行ループの前処理でこの検索対象コードが常に `9999999999`（ダミー販売店）へ差し替わる**（v1.9・顧客要件 2026-08）。当該 JA にこのコードの `m_hanbaiten` 行が存在しない場合、上記クエリより前の §4.1 で `VALIDATION_ERROR` として一括検出し、行ごとの「販売店コードが見つかりません」連発は発生させない。
- **`haiten_flg=true`（廃店）の `hanbaiten_code` は選択不可**（v1.18・不具合修正 2026-08）：`IMPORT_VALIDATION_ERROR` + errors（row, field='hanbaiten_code', message='指定された販売店コードは廃店のため選択できません。'）。廃店後も過去購読者の履歴参照のため行は削除されないので存在チェックは通るが、新規選択・販売店変更だけを弾く（tanka_codeの失効チェックと同じ設計）。修正前は取込が成功してしまい、購読者詳細画面（ACSMS-SCR-011）にも廃店・失効の旨を示す表示が無いため運用が事後に気付けなかった。
- **紙版（`dokusya_shubetsu`≠2）は `hanbaiten_code`=`9999999999`（ダミー販売店）を選択不可**（v1.20・不具合修正 2026-08）：`IMPORT_VALIDATION_ERROR` + errors（row, field='hanbaiten_code', message='販売店コード「9999999999」は電子版専用のダミー販売店のため、紙版では選択できません。'）。ダミー販売店は電子版単独購読者の「配達先の販売店が無い」を表す受け皿であり（上記の電子版強制差替と対）、紙を配る読者に付くと増減連絡票・名簿の配達担当が誤る。UI編集画面(SCR-011)は`BaseHanbaitenSelect`が既にダミーを候補から除外しているが、Excel取込は`hanbaiten_code`が自由入力のためこのガードが欠けていた。存在チェック・廃店チェックの後段（`hanbaitenCodeSet`に含まれ`haiten_flg=false`のため両方通過する）で判定する。NEW/UPDATE両方が対象。

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

#### 4.3.5 予約変更（未来日）の同一適用日1回まで制限（v1.9・顧客要件2026-08）

紙版の `UPDATE` モードで `joho_henko_tekiyo_date`（ペイロード直下・全行共通）が未来日（本日超過）の場合、対象の各 `dokusya_id` に、既にアクティブ（非取消・非新規）な履歴行が同じ日付に存在しないかを一括で確認する。住所変更と販売店変更のように別々の取込が同じ適用日に積み重なると、増減連絡票（ACSMS-SCR-028）の同日集計が意図しない出力になるため。当日変更（joho=本日）・電子版は対象外。

```sql
SELECT DISTINCT dokusya_id
FROM t_dokusya_rireki
WHERE dokusya_id = ANY(:dokusya_ids)
  AND joho_henko_tekiyo_date = :joho_henko_tekiyo_date
  AND torikeshi_flg = false
  AND shinki_flg = false
```

- 該当した `dokusya_id` を含む行：`IMPORT_VALIDATION_ERROR` + errors（row, field='joho_henko_tekiyo_date', message='この適用日には既に変更履歴が登録されています。購読者履歴情報画面から該当の変更を取消してから、まとめて更新してください。'）
- 同日に複数項目をまとめて変更したいときは、ACSMS-SCR-013（購読者履歴情報画面）から該当の変更履歴を取消してから、1回の取込でまとめて反映する。
- ACSMS-SCR-011（画面更新）・ACSMS-SCR-015（販売店一括置換）にも同一制限を適用（3経路共通の `dokusya-shubetsu.rules.ts` に集約）。

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
- **v1.3（顧客要件 2026-07）— UPDATE は1更新1レコード**: 販売店適用日を廃止し、適用日は `joho_henko_tekiyo_date` に統一。情報変更（購読部数/住所等）と販売店変更が同一行で同時に起きても履歴は **1件**にまとめる（UI編集 SCR-011/013・一括置換 SCR-015 と同一ロジック・共通実装）。旧 v1.2 の「適用日順に2件分割」は廃止。
  - 追加レコード: `joho_henko_tekiyo_date`=読者情報変更適用日（販売店・支払方法を含む全変更の唯一の適用日。専用の販売店適用日列は持たない）。
  - `saishin_data_flg` は当日基準の再計算（recomputeMaster）で確定。`zenkai_*` / `zougen_hokoku_flg` は直前状態との差分で算出。
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
  seikyu_kaishi_month, biko, saishin_data_flg,
  zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
  zenkai_hanbaiten_id, zenkai_dokusya_busu, zenkai_yubin_no,
  zenkai_todofuken_code, zenkai_shikuchoson, zenkai_chome_banchi, zenkai_tatemono_mei,
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
  :seikyu_kaishi_month, :biko, TRUE,
  :zougen_hokoku_flg, :shinki_flg, :kaiyaku_flg,
  :zenkai_hanbaiten_id, :zenkai_dokusya_busu, :zenkai_yubin_no,
  :zenkai_todofuken_code, :zenkai_shikuchoson, :zenkai_chome_banchi, :zenkai_tatemono_mei,
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

- `operation`：取込モード別の prefixed ラベル（販売店取込 SCR-019 と統一・bare-verb ルールの例外）。取込は`NEW`/`UPDATE`の2モードのみ（不具合修正2026-08 — 従来`operation`に`_ALL`/`_PARTIAL`の区別があったが実装されたことが無く、実態は常に`_PARTIAL`側だったため`IMPORT_UPDATE`へ改称・`IMPORT_UPDATE_ALL`は未使用のため削除）。
  - `NEW` → `'IMPORT_NEW'`
  - `UPDATE`（一括中止含む） → `'IMPORT_UPDATE'`
- `before_value`：
  - `NEW` モード：空文字列
  - `UPDATE` / 一括中止：更新前データのサマリJSON `{ "rows": [{...}, ...] }`（各行の更新前状態を格納、最大100件まで）
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

### 4.8 一括中止（`dokusya_chushi_date` 指定時・v1.6 顧客要件 2026-08）

`dokusya_chushi_date` を指定した取込は、通常の UPDATE ではなく**解約予約の作成**として処理する。
2026-06 に廃止した旧「一括中止」（組合員コードをキーに `tetsuzuki_shurui=0` を立てる方式）とは別物。

#### 4.8.1 書き込み

- 対象は `dokusya_id`（無い行は `kumiaiin_code`）で特定し、行ロックのうえ**解約予約の履歴を1件 append** する。
  `dokusya_busu=0` / `dokusya_chushi_date=指定日` / `joho_henko_tekiyo_date=中止日` / `kaiyaku_flg=false` / `saishin_data_flg=false`。
- **`selected_columns` に他の列が入っていても書き込まない**（画面も列グリッドをキー列へ縮退させるが、直接呼ばれても同じ）。
- 中止日は予約時点で `t_dokusya.dokusya_chushi_date` へ反映し、一覧（SCR-014）・詳細（SCR-011）に即時表示する。
  **解約の確定（`tetsuzuki_shurui=0` / `kaiyaku_flg=true`）は到来日バッチ**が行う。

#### 4.8.2 電子版連携と「1行エラーで全ロールバック」

紙版は外部連携が無いため、従来どおり 1 トランザクションの all-or-nothing で終わる。
電子版は行ごとに `action_kbn=cancel` を送る必要があり、素直に行ループ内で送ると成立しない —
途中で失敗したとき cloud 側はロールバックできるが、**既に送った cancel は取り消せない**
（電子版APIに解約取消の処理区分が無い）。結果は「電子版では解約済み・cloud では購読中」。

そこで3相に分ける:

| Phase | 内容 |
| --- | --- |
| 2 | 全行の cloud 側 DML（この時点では push しない） |
| 3 | DML 完了後にまとめて push。**送れた会員IDをトランザクションの外に控える** |
| 4b | 失敗 → ロールバック後、控えた分へ**打ち消し**（`cancel` + `cancel_ym` 空文字）を送る |

控えをトランザクション外に置くのは、ロールバックと一緒に消えると誰に送ったのか分からなくなるため。
打ち消しは SCR-014 の予約取消と同じ形（顧客判断 2026-08）。

**打ち消し自体が失敗した分は救えない。** 会員IDをエラーログ（`log_type=3`）に記録する
（運用が手で戻すための唯一の手がかり）。打ち消しの失敗で元の例外を差し替えない。

> ⚠️ 未検証の前提: 電子版が空の `cancel_ym` を受理するかは未確認（先方仕様では必須 + `YYYYMM`）。
> 拒否される場合、この打ち消しも SCR-014 の予約取消も成立しない。統合テストの最優先項目。

#### 4.8.3 行数上限

電子版の一括中止のみ **500行**（`VALIDATION_ERROR` / `電子版の一括中止は500件までです。ファイルを分割してください。`）。
1行 = 電子版APIへの1往復で、同期処理のままでは ALB/CloudFront のタイムアウトにかかるため。
紙版は外部連携が無く従来と同じコストなので 5000 行のまま。将来ジョブ化したら撤廃する。

#### 4.8.4 一括取消は無い

取込は解約予約を「設定する」だけで、「取り消す」経路を持たない（中止日は必須・空送信は拒否）。
予約の変更・取消は購読者明細検索画面（SCR-014）の購読中止から1件ずつ行う。
