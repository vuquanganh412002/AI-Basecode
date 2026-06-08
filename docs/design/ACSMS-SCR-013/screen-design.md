# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_購読者履歴情報画面_v1.2


---

## 表紙

**クラウド版購読者管理システム**

**購読者履歴情報画面**

**版1.0**

- **フォーマットコード**: 16-BM/PM/VTI
- **フォーマットバージョン**: 2.0
- **発行日**: 2019/04/19

---

## 変更履歴

| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026/04/01 | 1.0 | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
| 2 | 2026/04/17 | 1.1 | Nguyen Duyen Manh | 指摘対応<br>※修正箇所：<br>1.「画面項目定義」シート：No.4、7、8、11～16<br>2.「機能定義」シート：No.1.2 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## 目次

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | 目次 | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

| No | シート名 | 説明 |
| --- | --- | --- |
| 1 | 表紙 | ドキュメント表紙 |
| 2 | 変更履歴 | ドキュメント変更履歴 |
| 3 | 目次 | シート一覧 |
| 4 | 画面遷移 | 画面遷移フロー |
| 5 | 画面イメージ | 画面のインターフェース |
| 6 | 画面項目定義 | 画面上の項目定義 |
| 7 | 機能定義 | 機能定義 |
| 8 | メッセージ情報 | メッセージ内容の定義 |

---

## 画面遷移

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | 画面遷移 | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

ACSMS-SCR-013_購読者履歴情報画面_画面遷移

---

## 画面イメージ

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | 画面イメージ | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

- **画面ID**: ACSMS-SCR-013
- **画面名**: 購読者履歴情報画面
- **概要**: 購読者履歴情報画面

ACSMS-SCR-013_購読者履歴情報画面_画面イメージ

> ※ 画面イメージはExcelファイル内の画像を参照してください。

---

## 画面項目定義

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | 画面項目定義 | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

- **画面ID**: ACSMS-SCR-013
- **画面名**: 購読者履歴情報画面
- **概要**: 購読者履歴情報画面

### 履歴一覧

| No | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最小桁数 | 最大桁数 | 文字揃え | フォーマット | テーブル名（論理名） | テーブル名（物理名） | カラム名（論理名） | カラム名（物理名） | 表示条件 | デフォルト値 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID | dokusya_rireki_id | ラベル | 出力 | - | BIGINT | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | ID | ID | 常時表示 | - | 対象購読者のID<br>自動採番 |
| 2 | 履歴番号 | rireki_no | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 履歴番号 | rireki_no | 常時表示 | - | 自動採番。履歴番号に降順でデータを並べる。 |
| 3 | 管理支店 | kanri_shiten_id | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 管理支店ID（外部キー） | kanri_shiten_id | 常時表示 | - |  |
| 4 | 支店名 | shiten_name | ラベル | 出力 | - | VARCHAR | - | 100 | 右 | - | 支店マスタ | m_shiten | 支店名 | shiten_name | 常時表示 | - | shiten_id でデータを取得する。 |
| 5 | 組合員コード | kumiaiin_code | ラベル | 出力 | - | VARCHAR | - | 20 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 組合員コード | kumiaiin_code | 常時表示 | - |  |
| 6 | 購読者名 | full_name | ラベル | 出力 | - | VARCHAR | - | 100 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者名 | shimei_sei + shimei_mei | 常時表示 | - |  |
| 7 | 購読者住所 | kodoku_shajusho | ラベル | 出力 | - | VARCHAR | - | 100 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者住所 | todofuken_code を都道府県名に変換したもの + shikuchoson + chome_banchi + tatemono_mei | 常時表示 | - |  |
| 9 | 連絡先１ | renrakusaki_1 | ラベル | 出力 | - | VARCHAR | - | 15 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 連絡先１ | renrakusaki_1 | 常時表示 | - |  |
| 10 | 連絡先２ | renrakusaki_2 | ラベル | 出力 | - | VARCHAR | - | 15 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 連絡先2 | renrakusaki_2 | 常時表示 | - |  |
| 11 | メールアドレス | email | ラベル | 出力 | - | VARCHAR | - | 10 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | メールアドレス | email | 常時表示 | - |  |
| 12 | メールマガジンフラグ（コード名称） | mail_magazine_flg | ラベル | 出力 | - | INTEGER | - | 50 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | メールマガジンフラグ | mail_magazine_flg | 常時表示 | - | メールマガジン（0:配信しない, 1:配信する） |
| 13 | 生年 | birth_year | ラベル | 出力 | - | INTEGER | - | - | - | - | 読者履歴テーブル | t_dokusya_rireki | 生年 | birth_year | 常時表示 | - | 生年（西暦） |
| 14 | 性別 | gender | ラベル | 出力 | - | INTEGER | - | - | - | - | 読者履歴テーブル | t_dokusya_rireki | 性別 | gender | データある場合 | - | 性別（1:男性, 2:女性, 9:回答しない） |
| 15 | 購読者層分類 | dokusyaso_bunrui | ラベル | 出力 | - | VARCHAR | - | 50 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者層分類 | dokusyaso_bunrui | 常時表示 | - | 購読者層分類（複数カンマ区切り）※空文字許容 |
| 16 | 農業者分類 | nogyosya_bunrui | ラベル | 出力 | - | VARCHAR | - | 50 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 農業者分類 | nogyosya_bunrui | データある場合 | - | 農業者分類（複数カンマ区切り）※空文字許容 |
| 17 | 購読部数 | dokusya_busu | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 購読部数 | dokusya_busu | 常時表示 | - |  |
| 18 | 前回購読部数 | zenkai_dokusya_busu | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 前回購読部数 | zenkai_dokusya_busu | 常時表示 | - |  |
| 8 | 配達先氏名 | haitatsu_shimei | ラベル | 出力 | - | VARCHAR | - | 100 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先氏名 | haitatsu_shimei_sei +  haitatsu_shimei_mei | 常時表示 | - |  |
| 19 | 配達先郵便 | haitatsu_yubin_no | ラベル | 出力 | - | VARCHAR | - | 7 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先郵便 | haitatsu_yubin_no | 常時表示 | - |  |
| 20 | 前回配達先郵便 | zenkai_yubin_no | ラベル | 出力 | - | VARCHAR | - | 7 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 前回配達先郵便 | zenkai_yubin_no | 常時表示 | - |  |
| 21 | 配達先住所 | haitatsu | ラベル | 出力 | - | VARCHAR | - | 302 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先住所 | haitatsu_todofuken_code/haitatsu_shikuchoson/haitatsu_chome_banchi/haitatsu_tatemono_mei | 常時表示 | - |  |
| 22 | 前回配達先住所 | zenkai_haitatsu | ラベル | 出力 | - | VARCHAR | - | 302 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先住所 | zenkai_haitatsu_todofuken_code/zenkai_haitatsu_shikuchoson/zenkai_haitatsu_chome_banchi/zenkai_haitatsu_tatemono_mei | 常時表示 | - |  |
| 29 | 販売店名 | hanbaiten_name | ラベル | 出力 | - | VARCHAR | - | 100 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 販売店名 | t_hanbaiten.hanbaiten_name | 常時表示 | - | hanbaiten_idでフォロー |
| 30 | 前回販売店名 | hanbaiten_name_old | ラベル | 出力 | - | VARCHAR | - | 100 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 前回販売店名 | t_hanbaiten.hanbaiten_name | 常時表示 | - | zenkai_hanbaiten_id をフォローする |
| 31 | 手続種別 | tetsuzuki_shurui | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 手続種別 | tetsuzuki_shurui | 常時表示 | - |  |
| 32 | 購読開始日 | shoki_dokusya_kaishi_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読開始日 | shoki_dokusya_kaishi_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
| 33 | 購読中止日 | dokusya_chushi_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読中止日 | dokusya_chushi_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
| 34 | 変更適用日 | joho_henko_tekiyo_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 変更適用日 | joho_henko_tekiyo_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
| 35 | 最新データフラグ | saishin_data_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 最新データフラグ | saishin_data_flg | 常時表示 | - | 最新データフラグ（DEFAULT false, TRUE=最新レコード）※アプリ側でトランザクション制御必須 |
| 36 | 増減報告フラグ | zougen_hokoku_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 増減報告フラグ | zougen_hokoku_flg | 常時表示 | - | 増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更） |
| 37 | 新規フラグ | shinki_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 新規フラグ | shinki_flg | 常時表示 | - | 新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読） |
| 38 | 解約フラグ | kaiyaku_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 解約フラグ | kaiyaku_flg | 常時表示 | - | 解約フラグ（DEFAULT false, TRUE=購読→解約） |
| 39 | 引落口座貯金種目 | hikiotoshi_yokin_shubetsu | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座貯金種目 | hikiotoshi_yokin_shubetsu | 常時表示 | - | 引落口座貯金種目（1:普通, 2:当座） |
| 40 | 引落元口座店舗コード | bank_branch_code | ラベル | 出力 | - | VARCHAR | - | 3 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落元口座店舗コード | bank_branch_code | 常時表示 | - |  |
| 41 | 引落元口座店舗名 | bank_branch_name | ラベル | 出力 | - | VARCHAR | - | 15 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落元口座店舗名 | bank_branch_name | 常時表示 | - |  |
| 42 | 引落口座番号 | hikiotoshi_koza_no | ラベル | 出力 | - | VARCHAR | - | 10 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座番号 | hikiotoshi_koza_no | 常時表示 | - |  |
| 43 | 引落口座名義 | hikiotoshi_koza_meigi | ラベル | 出力 | - | VARCHAR | - | 50 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座名義 | hikiotoshi_koza_meigi | 常時表示 | - |  |

### アクションボタン

| No | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最小桁数 | 最大桁数 | 文字揃え | フォーマット | テーブル名（論理名） | テーブル名（物理名） | カラム名（論理名） | カラム名（物理名） | 表示条件 | デフォルト値 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 44 | 前の画面に戻る | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
| 45 | ページネーション | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |

---

## 機能定義

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | 機能定義 | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

- **画面ID**: ACSMS-SCR-013
- **画面名**: 購読者履歴情報画面
- **概要**: 購読者履歴情報画面

### A. 機能一覧

| # | 機能 | 項目 | イベント | 説明 |
| --- | --- | --- | --- | --- |
| 1 | 画面初期表示 | - | 画面初期表示 | dokusya_idを受け取り、履歴データを取得 |
| 2 | 戻る操作 | 「前の画面に戻る」ボタン | ボタン押下 | 購読者情報登録画面へ遷移 |
| 3 | ページネーション | - | - | デフォルト：20件/ページ |

### B. 機能詳細


#### 1. 画面初期表示

- **1.1** 画面表示時に購読者ID（dokusya_id）を受け取り、対象の履歴データを取得する。取得した履歴データを一覧形式で表示する（中央会：自中央会のみ選択可。（管轄JAの読者は見れない）JA本店：自JAのみ選択可。JA管理支店：自管理支店のみ選択可）。
- **1.2** 対象IDのレコードについて、履歴番号を降順でデータを並べ、最新のレコードを先頭に表示する。
- **1.3** ・データなしの場合　→　ACSMS-MSG-013-001を表示する。
  - ・システムエラーの場合　→　ACSMS-MSG-013-002を表示する。

#### 2. 戻る操作

- **2.1** 「前の画面に戻る」ボタンを押下すると、確認ダイアログ無しで購読者情報登録画面に戻る。

#### 3. ページネーション

- **3.1** 履歴一覧はページネーションされ、別のページを押下すると、そのページのデータを取得して表示する。
  - ・デフォルト：20件/ページ
  - ・最大：100件/ページ

---

## メッセージ情報

| システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
| --- | --- | --- | --- | --- | --- | --- |
| クラウド版購読者管理システム | 画面設計書 | メッセージ情報 | 2026/04/01 | Nguyen Duyen Manh | 2026/04/01 | Nguyen Duyen Manh |

- **画面ID**: ACSMS-SCR-013
- **画面名**: 購読者履歴情報画面
- **概要**: 購読者履歴情報画面

| # | メッセージコード | メッセージ内容 |
| --- | --- | --- |
| 1 | ACSMS-MSG-013-001 | 履歴データが存在しません。 |
| 2 | ACSMS-MSG-013-002 | システムエラーが発生しました。しばらくしてから再度お試しください。 |
