# 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_購読者履歴情報画面_v1.2

<!--
  This Markdown is a round-trip representation of the screen-design
  Excel. Cell coordinates are embedded as HTML comments (<!--xl ...-->)
  so `screen_md_to_excel.py` can write values back into the *exact* cells
  of the original template, preserving all styles, merges, and images.
  Edit cell values inline; do NOT edit anchor comments.

  Source: 【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_購読者履歴情報画面_v1.2.xlsx
-->

---

## 表紙

<!--xl-sheet 表紙-->
<!--xl B10-->クラウド版購読者管理システム
<!--xl B12-->購読者履歴情報画面
<!--xl S15-->版1.0
<!--xl O20-->フォーマットコード
<!--xl T20-->16-BM/PM/VTI
<!--xl O21-->フォーマットバージョン
<!--xl T21-->1.0
<!--xl O22-->発行日
<!--xl T22-->2019/04/19

---

## 変更履歴

<!--xl-sheet 変更履歴-->
<!--xl-table cols=A,C,H,K,R,W,AB-->
|  No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2-->| 1.0 | 2026/04/01 | 1.0 | Nguyen Duyen Manh | 初版作成 | Nguyen Huy Dat | Nguyen Huy Dat |
<!--xl-row 3-->| 2.0 | 2026/04/17 | 1.1 | Nguyen Duyen Manh | 指摘対応<br>※修正箇所：<br>1.「画面項目定義」シート：No.4、7、8、11～16<br>2.「機能定義」シート：No.1.2 | Nguyen Huy Dat | Nguyen Huy Dat |

---

## 目次

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | 目次 | 2026/04/01 |

<!--xl-sheet 目次-->
<!--xl-table cols=B,D,K-->
| No | シート名 | 説明 |
| --- | --- | --- |

---

## 画面遷移

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | 画面遷移 | 2026/04/01 |

<!--xl-sheet 画面遷移-->
<!--xl B5-->ACSMS-SCR-013_購読者履歴情報画面_画面遷移

> ※ 画面遷移図は Excel 内の図として埋め込まれています (画像はテンプレート側で保持)。

---

## 画面イメージ

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | 画面イメージ | 2026/04/01 |

<!--xl-sheet 画面イメージ-->
| 画面ID | 値 | 概要 | 値 |
| --- | --- | --- | --- |
<!--xl-row 5 cols=B,J,V,X-->| 画面ID | ACSMS-SCR-013 | 購読者履歴情報画面 | 購読者履歴情報画面 |
<!--xl-row 6 cols=B,J-->| 画面名 | 購読者履歴情報画面 |  |  |

<!--xl B8-->ACSMS-SCR-013_購読者履歴情報画面_画面イメージ

> ※ 画面イメージ画像は Excel 内に埋め込まれています (画像はテンプレート側で保持)。

---

## 画面項目定義

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | 画面項目定義 | 2026/04/01 |

<!--xl-sheet 画面項目定義-->
| 画面ID | 値 | 概要 | 値 |
| --- | --- | --- | --- |
<!--xl-row 5 cols=B,J,V,X-->| 画面ID | ACSMS-SCR-013 | 購読者履歴情報画面 | 購読者履歴情報画面 |
<!--xl-row 6 cols=B,J-->| 画面名 | 購読者履歴情報画面 |  |  |

<!--xl-table cols=B,C,F,I,L,N,O,R,T,V,X,AB,AE,AH,AK,AO,AR,AW-->
| No | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最小桁数 | 最大桁数 | 文字揃え | フォーマット | テーブル名(論理名) | テーブル名(物理名) | カラム名(論理名) | カラム名(物理名) | 表示条件 | デフォルト値 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 11-->| 1.0 | ID | dokusya_rireki_id | ラベル | 出力 | - | BIGINT | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | ID | ID | 常時表示 | - | 対象購読者のID<br>自動採番 |
<!--xl-row 12-->| 2.0 | 履歴番号 | rireki_no | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 履歴番号 | rireki_no | 常時表示 | - | 履歴ごとの連番<br>自動採番 |
<!--xl-row 13-->| 3.0 | 管理支店 | kanri_shiten_id | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 管理支店ID（外部キー） | kanri_shiten_id | 常時表示 | - |  |
<!--xl-row 14-->| 4.0 | 支店名称 | shiten_name | ラベル | 出力 | - | VARCHAR | - | 100.0 | 右 | - | 支店マスタ | m_shiten | 支店名称 | shiten_name | 常時表示 | - | shiten_id でデータを取得。m_shitenの自JA分を全件出力。 |
<!--xl-row 15-->| 5.0 | 組合員コード | kumiaiin_code | ラベル | 出力 | - | VARCHAR | - | 20.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 組合員コード | kumiaiin_code | 常時表示 | - |  |
<!--xl-row 16-->| 6.0 | 購読者名 | full_name | ラベル | 出力 | - | VARCHAR | - | 100.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者名 | shimei_sei + shimei_mei | 常時表示 | - |  |
<!--xl-row 17-->| 7.0 | 購読者住所 | kodoku_shajusho | ラベル | 出力 | - | VARCHAR | - | 100.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者住所 | todofuken_code を都道府県名に変換したもの + shikuchoson + chome_banchi + tatemono_mei を結合して表示 | 常時表示 | - |  |
<!--xl-row 18-->| 8.0 | 配達先氏名 | haitatsu_shimei | ラベル | 出力 | - | VARCHAR | - | 100.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 口座支店名 | haitatsu_shimei_sei +  haitatsu_shimei_mei | 常時表示 | - |  |
<!--xl-row 19-->| 9.0 | 連絡先１ | renrakusaki_1 | ラベル | 出力 | - | VARCHAR | - | 15.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 連絡先１ | renrakusaki_1 | 常時表示 | - |  |
<!--xl-row 20-->| 10.0 | 連絡先２ | renrakusaki_2 | ラベル | 出力 | - | VARCHAR | - | 15.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 連絡先2 | renrakusaki_2 | 常時表示 | - |  |
<!--xl-row 21-->| 11.0 | メールアドレス | email | ラベル | 出力 | - | VARCHAR | - | 10.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | メールアドレス | email | 常時表示 | - |  |
<!--xl-row 22-->| 12.0 | メールマガジンフラグ（コード名称） | mail_magazine_flg | ラベル | 出力 | - | INTEGER | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | メールマガジンフラグ | mail_magazine_flg | 常時表示 | - | メールマガジン（0:配信しない, 1:配信する） |
<!--xl-row 23-->| 13.0 | 生年 | birth_year | ボタン | 出力 | - | INTEGER | - | - | - | - | 読者履歴テーブル | t_dokusya_rireki | 生年 | birth_year | 常時表示 | - | 生年（西暦） |
<!--xl-row 24-->| 14.0 | 性別 | gender | ラベル | 出力 | - | INTEGER | - | - | - | - | 読者履歴テーブル | t_dokusya_rireki | 性別 | gender | データある場合 | - | 性別（1:男性, 2:女性, 9:回答しない） |
<!--xl-row 25-->| 15.0 | 購読者層分類 | dokusyaso_bunrui | ボタン | 出力 | - | VARCHAR | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読者層分類 | dokusyaso_bunrui | 常時表示 | - | 購読者層分類（複数カンマ区切り）※空文字許容 |
<!--xl-row 26-->| 16.0 | 農業者分類 | nogyosya_bunrui | ラベル | 出力 | - | VARCHAR | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 農業者分類 | nogyosya_bunrui | データある場合 | - | 農業者分類（複数カンマ区切り）※空文字許容 |
<!--xl-row 27-->| 17.0 | 購読部数 | dokusya_busu | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 購読部数 | dokusya_busu | 常時表示 | - |  |
<!--xl-row 28-->| 18.0 | 前回購読部数 | zenkai_dokusya_busu | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 前回購読部数 | zenkai_dokusya_busu | 常時表示 | - |  |
<!--xl-row 29-->| 19.0 | 配達先郵便 | haitatsu_yubin_no | ラベル | 出力 | - | VARCHAR | - | 7.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先郵便 | haitatsu_yubin_no | 常時表示 | - |  |
<!--xl-row 30-->| 20.0 | 前回配達先郵便 | zenkai_yubin_no | ラベル | 出力 | - | VARCHAR | - | 7.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 前回配達先郵便 | zenkai_yubin_no | 常時表示 | - |  |
<!--xl-row 31-->| 21.0 | 配達先住所 | haitatsu | ラベル | 出力 | - | VARCHAR | - | 302.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先住所 | haitatsu_todofuken_code/haitatsu_shikuchoson/haitatsu_chome_banchi/haitatsu_tatemono_mei | 常時表示 | - |  |
<!--xl-row 32-->| 22.0 | 前回配達先住所 | zenkai_haitatsu | ラベル | 出力 | - | VARCHAR | - | 302.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 配達先住所 | zenkai_haitatsu_todofuken_code/zenkai_haitatsu_shikuchoson/zenkai_haitatsu_chome_banchi/zenkai_haitatsu_tatemono_mei | 常時表示 | - |  |
<!--xl-row 33-->| 23.0 | メールアドレス | hikiotoshi_koza_no | ラベル | 出力 | - | VARCHAR | - | 10.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座番号 | hikiotoshi_koza_no | 常時表示 | - |  |
<!--xl-row 34-->| 24.0 | メールマガジンフラグ | hikiotoshi_koza_meigi | ラベル | 出力 | - | VARCHAR | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座名義 | hikiotoshi_koza_meigi | 常時表示 | - |  |
<!--xl-row 35-->| 25.0 | 生年 | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
<!--xl-row 36-->| 26.0 | 性別 | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |
<!--xl-row 37-->| 27.0 | 購読者層分類 | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
<!--xl-row 38-->| 28.0 | 農業者分類 | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |
<!--xl-row 39-->| 29.0 | 販売店名 | hanbaiten_name | ラベル | 出力 | - | VARCHAR | - | 100.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 販売店名 | t_hanbaiten.hanbaiten_name | 常時表示 | - | hanbaiten_idでフォロー |
<!--xl-row 40-->| 30.0 | 前回販売店名 | hanbaiten_name_old | ラベル | 出力 | - | VARCHAR | - | 100.0 | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 前回販売店名 | t_hanbaiten.hanbaiten_name | 常時表示 | - | zenkai_hanbaiten_id をフォローする |
<!--xl-row 41-->| 31.0 | 手続種別 | tetsuzuki_shurui | ラベル | 出力 | - | INTEGER | - | - | 左 | - | 読者履歴テーブル | t_dokusya_rireki | 手続種別 | tetsuzuki_shurui | 常時表示 | - |  |
<!--xl-row 42-->| 32.0 | 購読開始日 | shoki_dokusya_kaishi_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読開始日 | shoki_dokusya_kaishi_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
<!--xl-row 43-->| 33.0 | 購読中止日 | dokusya_chushi_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 購読中止日 | dokusya_chushi_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
<!--xl-row 44-->| 34.0 | 変更適用日 | joho_henko_tekiyo_date | ラベル | 出力 | - | Date | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 変更適用日 | joho_henko_tekiyo_date | 常時表示 | - | 表示形式：YYYY/MM/DD |
<!--xl-row 45-->| 35.0 | 最新データフラグ | saishin_data_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 最新データフラグ | saishin_data_flg | 常時表示 | - | 最新データフラグ（DEFAULT false, TRUE=最新レコード）※アプリ側でトランザクション制御必須 |
<!--xl-row 46-->| 36.0 | 増減報告フラグ | zougen_hokoku_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 増減報告フラグ | zougen_hokoku_flg | 常時表示 | - | 増減報告フラグ（DEFAULT false, TRUE=増減報告対象の変更） |
<!--xl-row 47-->| 37.0 | 新規フラグ | shinki_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 新規フラグ | shinki_flg | 常時表示 | - | 新規フラグ（DEFAULT false, TRUE=新規購読開始/解約→再購読） |
<!--xl-row 48-->| 38.0 | 解約フラグ | kaiyaku_flg | ラベル | 出力 | - | Boolean | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 解約フラグ | kaiyaku_flg | 常時表示 | - | 解約フラグ（DEFAULT false, TRUE=購読→解約） |
<!--xl-row 49-->| 39.0 | 引落口座貯金種目 | hikiotoshi_yokin_shubetsu | ラベル | 出力 | - | INTEGER | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座貯金種目 | hikiotoshi_yokin_shubetsu | 常時表示 | - | 引落口座貯金種目（1:普通, 2:当座） |
<!--xl-row 50-->| 40.0 | 金融機関コード | bank_code | ラベル | 出力 | - | VARCHAR | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 金融機関コード | bank_code | 常時表示 | - |  |
<!--xl-row 51-->| 41.0 | 金融機関名 | bank_name | ラベル | 出力 | - | VARCHAR | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 金融機関名 | bank_name | 常時表示 | - |  |
<!--xl-row 52-->| 42.0 | 口座支店コード | bank_branch_code | ラベル | 出力 | - | VARCHAR | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 口座支店コード | bank_branch_code | 常時表示 | - |  |
<!--xl-row 53-->| 43.0 | 口座支店名 | bank_branch_name | ラベル | 出力 | - | VARCHAR | - | - | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 口座支店名 | bank_branch_name | 常時表示 | - |  |
<!--xl-row 54-->| 44.0 | 引落口座番号 | hikiotoshi_koza_no | ラベル | 出力 | - | VARCHAR | - | 10.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座番号 | hikiotoshi_koza_no | 常時表示 | - |  |
<!--xl-row 55-->| 45.0 | 引落口座名義 | hikiotoshi_koza_meigi | ラベル | 出力 | - | VARCHAR | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座名義 | hikiotoshi_koza_meigi | 常時表示 | - |  |

<!--xl-section row=56-->### アクションボタン

<!--xl-table cols=B,C,F,I,L,N,O,R,T,V,X,AB,AE,AH,AK,AO,AR,AW-->
| No | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最小桁数 | 最大桁数 | 文字揃え | フォーマット | テーブル名(論理名) | テーブル名(物理名) | カラム名(論理名) | カラム名(物理名) | 表示条件 | デフォルト値 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 57-->| 46.0 | 前の画面に戻る | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
<!--xl-row 58-->| 47.0 | ページネーション | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |

<!--xl-section row=59-->### 連絡先2

<!--xl-table cols=B,C,F,I,L,N,O,R,T,V,X,AB,AE,AH,AK,AO,AR,AW-->
| No | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最小桁数 | 最大桁数 | 文字揃え | フォーマット | テーブル名(論理名) | テーブル名(物理名) | カラム名(論理名) | カラム名(物理名) | 表示条件 | デフォルト値 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 60-->| 48.0 | メールアドレス | hikiotoshi_koza_no | ラベル | 出力 | - | VARCHAR | - | 10.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座番号 | hikiotoshi_koza_no | 常時表示 | - |  |
<!--xl-row 61-->| 49.0 | メールマガジンフラグ | hikiotoshi_koza_meigi | ラベル | 出力 | - | VARCHAR | - | 50.0 | 右 | - | 読者履歴テーブル | t_dokusya_rireki | 引落口座名義 | hikiotoshi_koza_meigi | 常時表示 | - |  |
<!--xl-row 62-->| 50.0 | 生年 | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
<!--xl-row 63-->| 51.0 | 性別 | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |
<!--xl-row 64-->| 52.0 | 購読者層分類 | button_back | ボタン | - | - | - | - | - | - | - | - | - | - | - | 常時表示 | - | 購読者情報登録画面へ戻る |
<!--xl-row 65-->| 53.0 | 農業者分類 | pagination | ラベル | - | - | - | - | - | - | - | - | - | - | - | データある場合 | - | デフォルト：20件/ページ |

---

## 機能定義

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | 機能定義 | 2026/04/01 |

<!--xl-sheet 機能定義-->
| 画面ID | 値 | 概要 | 値 |
| --- | --- | --- | --- |
<!--xl-row 5 cols=B,J,V,X-->| 画面ID | ACSMS-SCR-013 | 購読者履歴情報画面 | 購読者履歴情報画面 |
<!--xl-row 6 cols=B,J-->| 画面名 | 購読者履歴情報画面 |  |  |

<!--xl B9-->A. 機能一覧
<!--xl B10-->#
<!--xl C10-->機能
<!--xl H10-->項目
<!--xl K10-->イベント
<!--xl N10-->説明
<!--xl B11-->1.0
<!--xl C11-->画面初期表示
<!--xl H11-->-
<!--xl K11-->画面初期表示
<!--xl N11-->dokusya_idを受け取り、履歴データを取得
<!--xl B12-->2.0
<!--xl C12-->戻る操作
<!--xl H12-->「前の画面に戻る」ボタン
<!--xl K12-->ボタン押下
<!--xl N12-->購読者情報登録画面へ遷移
<!--xl B13-->3.0
<!--xl C13-->ページネーション
<!--xl H13-->-
<!--xl K13-->-
<!--xl N13-->デフォルト：20件/ページ
<!--xl B16-->B. 機能詳細
<!--xl B17-->1
<!--xl D17-->画面初期表示
<!--xl B18-->1.1
<!--xl D18-->画面表示時に購読者ID（dokusya_id）を受け取り、対象の履歴データを取得。取得した履歴データを一覧形式で表示（中央会：自中央会のみ選択可。（管轄JAの読者は見れない）JA本店：自JAのみ選択可。JA管理支店：自管理支店のみ選択可）
<!--xl A19-->4/17 VTI追記
<!--xl B19-->1.2
<!--xl D19-->対象IDのレコードについて、履歴番号を降順（DESC）でデータを並べ、最新のレコードを先頭に表示。
<!--xl B20-->1.3
<!--xl D20-->・データなしの場合　→　ACSMS-MSG-013-001を表示<br>
<!--xl D21-->・システムエラーの場合　→　ACSMS-MSG-013-002を表示
<!--xl B22-->2.0
<!--xl D22-->戻る操作
<!--xl B23-->2.1
<!--xl D23-->「前の画面に戻る」ボタンを押下すると、購読者情報登録画面に戻る
<!--xl D24-->確認ダイアログ等がない
<!--xl B25-->3.0
<!--xl D25-->ページネーション
<!--xl B26-->3.1
<!--xl D26-->履歴一覧はページネーションされ、別のページを押下すると、そのページのデータを取得して表示
<!--xl D27-->・デフォルト：20件/ページ
<!--xl D28-->・最大：100件/ページ

---

## メッセージ情報

<!--xl-header-->
| システム・アプリケーション名 | システム・アプリケーション名 | ドキュメント | ドキュメント | ドキュメント | シート名 | 作成日 |
| --- | --- | --- | --- | --- | --- | --- |
<!--xl-row 2 cols=B,F,J,M,P,U,X-->| クラウド版購読者管理システム | クラウド版購読者管理システム | 画面設計書 | 画面設計書 | 画面設計書 | メッセージ情報 | 2026/04/01 |

<!--xl-sheet メッセージ情報-->
| 画面ID | 値 | 概要 | 値 |
| --- | --- | --- | --- |
<!--xl-row 5 cols=B,J,V,X-->| 画面ID | ACSMS-SCR-013 | 購読者履歴情報画面 | 購読者履歴情報画面 |
<!--xl-row 6 cols=B,J-->| 画面名 | 購読者履歴情報画面 |  |  |

<!--xl-table cols=B,C,G-->
| # | メッセージコード | メッセージ内容 |
| --- | --- | --- |
<!--xl-row 10-->| 1.0 | ACSMS-MSG-013-001 | 履歴データが存在しません。 |
<!--xl-row 11-->| 2.0 | ACSMS-MSG-013-002 | システムエラーが発生しました。しばらくしてから再度お試しください。 |
