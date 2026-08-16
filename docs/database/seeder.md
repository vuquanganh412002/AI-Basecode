# Seeder定義書

本ドキュメントはクラウド版購読者管理システムの初期データ（シードデータ）を定義する。

投入順序は外部キー制約を考慮し、以下の順番で実行すること。

## 投入順序

| 順番 | テーブル | 説明 |
| --- | --- | --- |
| 1 | m_roles | ロールマスタ |
| 2 | m_permissions | 権限マスタ |
| 3 | m_roles_permissions | ロール権限紐付け |
| 4 | m_todofuken | 都道府県マスタ |
| 5 | m_code | コードマスタ |
| 6 | m_account | アカウントマスタ（初期管理者） |

---

## 1. m_roles（ロールマスタ）

| role_id | role_code | role_name | description | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | NICHINO_ADMIN | 日農（管理者） | 日本農業新聞 管理者アカウント | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 2 | NICHINO_STAFF | 日農（担当者） | 日本農業新聞 担当者アカウント | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 3 | CHUOKAI | 中央会 | 中央会アカウント | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 4 | JA_HONTEN | JA本店 | JA本店アカウント | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 5 | JA_KANRI_SHITEN | JA管理支店 | JA管理支店アカウント | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

---

## 2. m_permissions（権限マスタ）

権限コードは `model.action` の形式で定義する。

- CRUD: `create`, `view`, `update`, `delete`
- 特殊操作: `import`, `export`, `replace_hanbaiten`

※ データスコープ制御（自JA分のみ等）はアプリケーション層で実装する。permissionはアクション可否のみ管理する。

### 2.1 購読者（dokusya）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 1 | dokusya.create | 購読者登録 | 購読者情報の新規登録 |
| 2 | dokusya.view | 購読者参照 | 購読者明細検索・一覧表示 |
| 3 | dokusya.update | 購読者編集 | 購読者情報の編集 |
| 4 | dokusya.delete | 購読者削除 | 購読者情報の削除 |
| 5 | dokusya.import | 購読者Excelデータ取込 | 購読者情報のExcel一括取込 |
| 6 | dokusya.replace_hanbaiten | 購読者販売店一括置換 | 購読者の販売店を一括置換 |

### 2.2 販売店（hanbaiten）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 7 | hanbaiten.create | 販売店登録 | 販売店情報の新規登録 |
| 8 | hanbaiten.view | 販売店参照 | 販売店明細検索・一覧表示 |
| 9 | hanbaiten.update | 販売店編集 | 販売店情報の編集 |
| 10 | hanbaiten.delete | 販売店削除 | 販売店情報の削除 |
| 11 | hanbaiten.import | 販売店Excelデータ取込 | 販売店情報のExcel一括取込 |
| 45 | hanbaiten.daiko_input | 販売店代行入力 | 日農担当者によるJAの販売店代行入力（account_concept.md ※2 / ACSMS-SCR-010 §3.2） |

### 2.3 単価マスタ（tanka）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 12 | tanka.create | 単価登録 | 単価マスタの新規登録 |
| 13 | tanka.view | 単価参照 | 単価マスタの検索・一覧表示 |
| 14 | tanka.update | 単価編集 | 単価マスタの編集 |
| 15 | tanka.delete | 単価削除 | 単価マスタの削除 |

### 2.4 JAマスタ（ja）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 16 | ja.create | JA登録 | JAマスタの新規登録 |
| 17 | ja.view | JA参照 | JAマスタの参照 |
| 18 | ja.update | JA編集 | JAマスタの編集 |
| 19 | ja.delete | JA削除 | JAマスタの削除 |

### 2.5 支店マスタ（shiten）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 20 | shiten.create | 支店登録 | 支店マスタの新規登録 |
| 21 | shiten.view | 支店参照 | 支店マスタの参照 |
| 22 | shiten.update | 支店編集 | 支店マスタの編集 |
| 23 | shiten.delete | 支店削除 | 支店マスタの削除 |

### 2.6 管理支店マスタ（kanri_shiten）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 24 | kanri_shiten.create | 管理支店登録 | 管理支店マスタの新規登録 |
| 25 | kanri_shiten.view | 管理支店参照 | 管理支店マスタの参照 |
| 26 | kanri_shiten.update | 管理支店編集 | 管理支店マスタの編集 |
| 27 | kanri_shiten.delete | 管理支店削除 | 管理支店マスタの削除 |

### 2.7 アカウント（account）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 28 | account.create | アカウント登録 | アカウントの新規作成 |
| 29 | account.view | アカウント参照 | アカウントの参照 |
| 30 | account.update | アカウント編集 | アカウントの編集 |
| 31 | account.delete | アカウント削除 | アカウントの削除 |

### 2.8 お知らせ（oshirase）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 32 | oshirase.create | お知らせ登録 | お知らせの新規登録 |
| 33 | oshirase.view | お知らせ参照 | お知らせの参照 |
| 34 | oshirase.update | お知らせ編集 | お知らせの編集 |
| 35 | oshirase.delete | お知らせ削除 | お知らせの削除 |

### 2.9 ファイル（file）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 36 | file.upload | ファイルアップロード | ファイルのアップロード |
| 37 | file.download | ファイルダウンロード | ファイルのダウンロード |

### 2.10 ログ（log）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 38 | log.view | ログ参照 | 操作ログの参照 |

### 2.11 口座振替（koza_furikae）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 39 | koza_furikae.export | 口座振替データ出力 | 口座振替データの出力（全銀フォーマット/Excel） |

### 2.12 配達手数料（haitatsuryo）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 40 | haitatsuryo.export | 配達手数料支払情報出力 | 配達手数料支払情報の出力 |

### 2.13 レポート（report）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 41 | report.export_meibo | 購読者名簿出力 | 販売店別・管理支店別購読者名簿の出力 |
| 42 | report.export_zougen_hanbaiten | 増減連絡票（販売店）出力 | 販売店向け増減連絡票の出力 |
| 43 | report.export_zougen_nichino | 増減通知（日本農業新聞）出力 | 日本農業新聞向け増減通知の出力 |

### 2.14 ロール（role）

| permission_id | permission_code | permission_name | description |
| --- | --- | --- | --- |
| 44 | role.view | ロール参照 | ロール・権限マスタの参照 |

### 共通カラム（全レコード共通）

全45件のレコードに以下の値を設定する。

| カラム | 値 |
| --- | --- |
| deleted_at | NULL |
| created_at | 2026-01-01 |
| created_by | SYSTEM_MIGRATION |
| updated_at | 2026-01-01 |
| updated_by | SYSTEM_MIGRATION |

---

## 3. m_roles_permissions（ロール権限紐付け）

権限マトリクス（参照元：アカウントの考え方について）に基づいて紐付けを行う。

### 設計方針

- ○ = 権限あり、× = 権限なし
- データスコープ制御（自JAのみ/自管理支店のみ等）はService層で実装
- 「情報登録」画面 → create + update + delete を付与
- 「明細検索」画面 → view を付与
- 「Excelデータ取込」画面 → import を付与
- JAマスタ：日農管理者のみフルCRUD。中央会・JA本店はview + updateのみ（※4 一部項目の編集が可能）
- 管理支店マスタ：日農管理者のみフルCRUD。中央会・JA本店・JA管理支店は view + update のみ（※4 一部項目の編集が可能、DataScope で 自中央会 / 自JA / 自JA自管理支店 のレコードのみアクセス可）

### 権限マトリクス一覧

| ID | permission_code | 日農（管理者） | 日農（担当者） | 中央会 | JA本店 | JA管理支店 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya.create | × | × | ○ | ○ | ○ |
| 2 | dokusya.view | × | × | ○ | ○ | ○ |
| 3 | dokusya.update | × | × | ○ | ○ | ○ |
| 4 | dokusya.delete | × | × | ○ | ○ | ○ |
| 5 | dokusya.import | × | × | ○ | ○ | ○ |
| 6 | dokusya.replace_hanbaiten | × | × | ○ | ○ | ○ |
| 7 | hanbaiten.create | × | ○ | ○ | ○ | ○ |
| 8 | hanbaiten.view | × | ○ | ○ | ○ | ○ |
| 9 | hanbaiten.update | × | ○ | ○ | ○ | ○ |
| 10 | hanbaiten.delete | × | × | ○ | ○ | ○ |
| 11 | hanbaiten.import | × | × | ○ | ○ | ○ |
| 12 | tanka.create | × | × | ○ | ○ | ○ |
| 13 | tanka.view | × | × | ○ | ○ | ○ |
| 14 | tanka.update | × | × | ○ | ○ | ○ |
| 15 | tanka.delete | × | × | ○ | ○ | ○ |
| 16 | ja.create | ○ | × | × | × | × |
| 17 | ja.view | ○ | × | ○ | ○ | × |
| 18 | ja.update | ○ | × | ○ | ○ | × |
| 19 | ja.delete | ○ | × | × | × | × |
| 20 | shiten.create | × | × | ○ | ○ | ○ |
| 21 | shiten.view | × | × | ○ | ○ | ○ |
| 22 | shiten.update | × | × | ○ | ○ | ○ |
| 23 | shiten.delete | × | × | ○ | ○ | ○ |
| 24 | kanri_shiten.create | ○ | × | × | × | × |
| 25 | kanri_shiten.view | ○ | × | ○ | ○ | ○ |
| 26 | kanri_shiten.update | ○ | × | ○ | ○ | ○ |
| 27 | kanri_shiten.delete | ○ | × | × | × | × |
| 28 | account.create | ○ | × | × | × | × |
| 29 | account.view | ○ | × | × | × | × |
| 30 | account.update | ○ | × | × | × | × |
| 31 | account.delete | ○ | × | × | × | × |
| 32 | oshirase.create | ○ | × | × | × | × |
| 33 | oshirase.view | ○ | × | × | × | × |
| 34 | oshirase.update | ○ | × | × | × | × |
| 35 | oshirase.delete | ○ | × | × | × | × |
| 36 | file.upload | ○ | ○ | × | × | × |
| 37 | file.download | ○ | ○ | ○ | ○ | ○ |
| 38 | log.view | ○ | ○ | ○ | ○ | ○ |
| 39 | koza_furikae.export | × | × | ○ | ○ | ○ |
| 40 | haitatsuryo.export | × | × | ○ | ○ | ○ |
| 41 | report.export_meibo | × | × | ○ | ○ | ○ |
| 42 | report.export_zougen_hanbaiten | × | × | ○ | ○ | ○ |
| 43 | report.export_zougen_nichino | × | × | ○ | ○ | ○ |
| 44 | role.view | ○ | × | × | × | × |
| 45 | hanbaiten.daiko_input | × | ○ | × | × | × |

### ロール別権限サマリ

| ロール | role_id | 権限数 | 付与される権限 |
| --- | --- | --- | --- |
| 日農（管理者） | 1 | 20 | ja.*, kanri_shiten.*, account.*, oshirase.*, file.upload, file.download, log.view, role.view |
| 日農（担当者） | 2 | 7 | hanbaiten.{create,view,update,daiko_input}, file.upload, file.download, log.view |
| 中央会 | 3 | 30 | dokusya.*, hanbaiten.{create,view,update,delete,import}, tanka.*, ja.{view,update}, shiten.*, kanri_shiten.{view,update}, file.download, log.view, koza_furikae.export, haitatsuryo.export, report.* |
| JA本店 | 4 | 30 | （中央会と同一） |
| JA管理支店 | 5 | 28 | （JA本店から ja.view, ja.update を除いた権限） |

### 共通カラム（全レコード共通）

| カラム | 値 |
| --- | --- |
| deleted_at | NULL |
| created_at | 2026-01-01 |
| created_by | SYSTEM_MIGRATION |
| updated_at | 2026-01-01 |
| updated_by | SYSTEM_MIGRATION |

### シードデータ

#### role_id=1 日農（管理者）— 20件

| role_permission_id | role_id | permission_id | permission_code |
| --- | --- | --- | --- |
| 1 | 1 | 16 | ja.create |
| 2 | 1 | 17 | ja.view |
| 3 | 1 | 18 | ja.update |
| 4 | 1 | 19 | ja.delete |
| 5 | 1 | 24 | kanri_shiten.create |
| 6 | 1 | 25 | kanri_shiten.view |
| 7 | 1 | 26 | kanri_shiten.update |
| 8 | 1 | 27 | kanri_shiten.delete |
| 9 | 1 | 28 | account.create |
| 10 | 1 | 29 | account.view |
| 11 | 1 | 30 | account.update |
| 12 | 1 | 31 | account.delete |
| 13 | 1 | 32 | oshirase.create |
| 14 | 1 | 33 | oshirase.view |
| 15 | 1 | 34 | oshirase.update |
| 16 | 1 | 35 | oshirase.delete |
| 17 | 1 | 36 | file.upload |
| 18 | 1 | 37 | file.download |
| 19 | 1 | 38 | log.view |
| 114 | 1 | 44 | role.view |

※ role.view は後から追加された権限のため、role_permission_id は連番の末尾（114）になる。

#### role_id=2 日農（担当者）— 7件

※ 販売店代行入力権限。新規登録（代行）・修正・検索が可能。削除・Excel取込は不可（※2）。
※ 2026-06: hanbaiten.import（permission_id=11）は付与しない（当初は付与→剥奪していたが、シードから除外済み）。
   日農担当者は Excel 一括取込不可。サイドバーの「販売店Excelデータ取込」は非表示。

| role_permission_id | role_id | permission_id | permission_code |
| --- | --- | --- | --- |
| 20 | 2 | 7 | hanbaiten.create |
| 21 | 2 | 8 | hanbaiten.view |
| 22 | 2 | 9 | hanbaiten.update |
| 23 | 2 | 36 | file.upload |
| 24 | 2 | 37 | file.download |
| 25 | 2 | 38 | log.view |
| 115 | 2 | 45 | hanbaiten.daiko_input |

※ hanbaiten.daiko_input は後から追加された権限のため、role_permission_id は連番の末尾（115）になる。

#### role_id=3 中央会 — 30件

※ 自中央会のみ選択可（データスコープはService層で制御）
※ 2026-06: file.upload（permission_id=36）は付与しない（当初は付与→剥奪していたが、シードから除外済み）。
   ファイルアップロード画面は日農のみ。サイドバーの「ファイルアップロード」は非表示。

| role_permission_id | role_id | permission_id | permission_code |
| --- | --- | --- | --- |
| 26 | 3 | 1 | dokusya.create |
| 27 | 3 | 2 | dokusya.view |
| 28 | 3 | 3 | dokusya.update |
| 29 | 3 | 4 | dokusya.delete |
| 30 | 3 | 5 | dokusya.import |
| 31 | 3 | 6 | dokusya.replace_hanbaiten |
| 32 | 3 | 7 | hanbaiten.create |
| 33 | 3 | 8 | hanbaiten.view |
| 34 | 3 | 9 | hanbaiten.update |
| 35 | 3 | 10 | hanbaiten.delete |
| 36 | 3 | 11 | hanbaiten.import |
| 37 | 3 | 12 | tanka.create |
| 38 | 3 | 13 | tanka.view |
| 39 | 3 | 14 | tanka.update |
| 40 | 3 | 15 | tanka.delete |
| 41 | 3 | 17 | ja.view |
| 42 | 3 | 18 | ja.update |
| 43 | 3 | 20 | shiten.create |
| 44 | 3 | 21 | shiten.view |
| 45 | 3 | 22 | shiten.update |
| 46 | 3 | 23 | shiten.delete |
| 47 | 3 | 37 | file.download |
| 48 | 3 | 38 | log.view |
| 49 | 3 | 39 | koza_furikae.export |
| 50 | 3 | 40 | haitatsuryo.export |
| 51 | 3 | 41 | report.export_meibo |
| 52 | 3 | 42 | report.export_zougen_hanbaiten |
| 53 | 3 | 43 | report.export_zougen_nichino |
| 54 | 3 | 25 | kanri_shiten.view |
| 55 | 3 | 26 | kanri_shiten.update |

#### role_id=4 JA本店 — 30件

※ 自JAのみ選択可。中央会と同一権限セット。
※ 2026-06: file.upload（permission_id=36）は付与しない（当初は付与→剥奪していたが、シードから除外済み）。
   ファイルアップロード画面は日農のみ。サイドバーの「ファイルアップロード」は非表示。

| role_permission_id | role_id | permission_id | permission_code |
| --- | --- | --- | --- |
| 56 | 4 | 1 | dokusya.create |
| 57 | 4 | 2 | dokusya.view |
| 58 | 4 | 3 | dokusya.update |
| 59 | 4 | 4 | dokusya.delete |
| 60 | 4 | 5 | dokusya.import |
| 61 | 4 | 6 | dokusya.replace_hanbaiten |
| 62 | 4 | 7 | hanbaiten.create |
| 63 | 4 | 8 | hanbaiten.view |
| 64 | 4 | 9 | hanbaiten.update |
| 65 | 4 | 10 | hanbaiten.delete |
| 66 | 4 | 11 | hanbaiten.import |
| 67 | 4 | 12 | tanka.create |
| 68 | 4 | 13 | tanka.view |
| 69 | 4 | 14 | tanka.update |
| 70 | 4 | 15 | tanka.delete |
| 71 | 4 | 17 | ja.view |
| 72 | 4 | 18 | ja.update |
| 73 | 4 | 20 | shiten.create |
| 74 | 4 | 21 | shiten.view |
| 75 | 4 | 22 | shiten.update |
| 76 | 4 | 23 | shiten.delete |
| 77 | 4 | 37 | file.download |
| 78 | 4 | 38 | log.view |
| 79 | 4 | 39 | koza_furikae.export |
| 80 | 4 | 40 | haitatsuryo.export |
| 81 | 4 | 41 | report.export_meibo |
| 82 | 4 | 42 | report.export_zougen_hanbaiten |
| 83 | 4 | 43 | report.export_zougen_nichino |
| 84 | 4 | 25 | kanri_shiten.view |
| 85 | 4 | 26 | kanri_shiten.update |

#### role_id=5 JA管理支店 — 28件

※ 自管理支店のみ選択可。JA本店から ja.view, ja.update を除いた権限。
※ 2026-06: file.upload（permission_id=36）は付与しない（当初は付与→剥奪していたが、シードから除外済み）。
   ファイルアップロード画面は日農のみ。サイドバーの「ファイルアップロード」は非表示。

| role_permission_id | role_id | permission_id | permission_code |
| --- | --- | --- | --- |
| 86 | 5 | 1 | dokusya.create |
| 87 | 5 | 2 | dokusya.view |
| 88 | 5 | 3 | dokusya.update |
| 89 | 5 | 4 | dokusya.delete |
| 90 | 5 | 5 | dokusya.import |
| 91 | 5 | 6 | dokusya.replace_hanbaiten |
| 92 | 5 | 7 | hanbaiten.create |
| 93 | 5 | 8 | hanbaiten.view |
| 94 | 5 | 9 | hanbaiten.update |
| 95 | 5 | 10 | hanbaiten.delete |
| 96 | 5 | 11 | hanbaiten.import |
| 97 | 5 | 12 | tanka.create |
| 98 | 5 | 13 | tanka.view |
| 99 | 5 | 14 | tanka.update |
| 100 | 5 | 15 | tanka.delete |
| 101 | 5 | 20 | shiten.create |
| 102 | 5 | 21 | shiten.view |
| 103 | 5 | 22 | shiten.update |
| 104 | 5 | 23 | shiten.delete |
| 105 | 5 | 37 | file.download |
| 106 | 5 | 38 | log.view |
| 107 | 5 | 39 | koza_furikae.export |
| 108 | 5 | 40 | haitatsuryo.export |
| 109 | 5 | 41 | report.export_meibo |
| 110 | 5 | 42 | report.export_zougen_hanbaiten |
| 111 | 5 | 43 | report.export_zougen_nichino |
| 112 | 5 | 25 | kanri_shiten.view |
| 113 | 5 | 26 | kanri_shiten.update |

### データスコープ制御（参考：Service層で実装）

権限マトリクス補足（※1〜※6）に基づき、Service層で以下のデータスコープ制御を実装する。

| ロール | dokusya | hanbaiten | tanka/shiten | ja | report | file | log |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 日農（管理者） | − | − | − | 全JA | − | 全JA | 全JA |
| 日農（担当者） | − | 全JA（代行入力） | − | − | − | 全JA | 全JA |
| 中央会 | 自中央会のみ | 自中央会のみ | 自中央会のみ | 自中央会のみ（一部項目） | 自中央会分 | 自中央会＋管轄JA | 自中央会のみ |
| JA本店 | 自JAのみ | 自JAのみ | 自JAのみ | 自JAのみ（一部項目） | 自JA管理支店分 | 自JAのみ | 管轄管理支店 |
| JA管理支店 | 自管理支店のみ | 自JAのみ | 自JAのみ | − | 自管理支店分 | 自JAのみ | 自管理支店のみ |

※ 電子版クレカ決済者・併読者は編集・削除不可（※1）

---

## 4. m_todofuken（都道府県マスタ）

| todofuken_code | todofuken_name | todofuken_name_kana |
| --- | --- | --- |
| 01 | 北海道 | ホッカイドウ |
| 02 | 青森県 | アオモリケン |
| 03 | 岩手県 | イワテケン |
| 04 | 宮城県 | ミヤギケン |
| 05 | 秋田県 | アキタケン |
| 06 | 山形県 | ヤマガタケン |
| 07 | 福島県 | フクシマケン |
| 08 | 茨城県 | イバラキケン |
| 09 | 栃木県 | トチギケン |
| 10 | 群馬県 | グンマケン |
| 11 | 埼玉県 | サイタマケン |
| 12 | 千葉県 | チバケン |
| 13 | 東京都 | トウキョウト |
| 14 | 神奈川県 | カナガワケン |
| 15 | 新潟県 | ニイガタケン |
| 16 | 富山県 | トヤマケン |
| 17 | 石川県 | イシカワケン |
| 18 | 福井県 | フクイケン |
| 19 | 山梨県 | ヤマナシケン |
| 20 | 長野県 | ナガノケン |
| 21 | 岐阜県 | ギフケン |
| 22 | 静岡県 | シズオカケン |
| 23 | 愛知県 | アイチケン |
| 24 | 三重県 | ミエケン |
| 25 | 滋賀県 | シガケン |
| 26 | 京都府 | キョウトフ |
| 27 | 大阪府 | オオサカフ |
| 28 | 兵庫県 | ヒョウゴケン |
| 29 | 奈良県 | ナラケン |
| 30 | 和歌山県 | ワカヤマケン |
| 31 | 鳥取県 | トットリケン |
| 32 | 島根県 | シマネケン |
| 33 | 岡山県 | オカヤマケン |
| 34 | 広島県 | ヒロシマケン |
| 35 | 山口県 | ヤマグチケン |
| 36 | 徳島県 | トクシマケン |
| 37 | 香川県 | カガワケン |
| 38 | 愛媛県 | エヒメケン |
| 39 | 高知県 | コウチケン |
| 40 | 福岡県 | フクオカケン |
| 41 | 佐賀県 | サガケン |
| 42 | 長崎県 | ナガサキケン |
| 43 | 熊本県 | クマモトケン |
| 44 | 大分県 | オオイタケン |
| 45 | 宮崎県 | ミヤザキケン |
| 46 | 鹿児島県 | カゴシマケン |
| 47 | 沖縄県 | オキナワケン |

---

## 5. m_code（コードマスタ）

### 5.1 購読種別 (DOKUSYA_SHUBETSU)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | DOKUSYA_SHUBETSU | 1 | 紙版 | 紙版 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 2 | DOKUSYA_SHUBETSU | 2 | 電子版 | 電子版 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 3 | DOKUSYA_SHUBETSU | 3 | 併読（紙版＋電子版） | 併読 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.2 手続種類 (TETSUZUKI_SHURUI)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | TETSUZUKI_SHURUI | 0 | 解約 | 解約 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 5 | TETSUZUKI_SHURUI | 1 | 新規 | 新規 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.3 電子版読者種別 (DENSHI_DOKUSYA_SHUBETSU)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | DENSHI_DOKUSYA_SHUBETSU | 0 | 無料 | 無料 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 7 | DENSHI_DOKUSYA_SHUBETSU | 1 | 有料 | 有料 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.4 支払方法 (SHIHARAI_HOHO)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | SHIHARAI_HOHO | 1 | 口座引落 | 口座引落 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 9 | SHIHARAI_HOHO | 2 | 現金集金 | 現金集金 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 10 | SHIHARAI_HOHO | 3 | 振込集金 | 振込集金 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 11 | SHIHARAI_HOHO | 4 | JA施設等 | JA施設等 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 12 | SHIHARAI_HOHO | 5 | 給与天引き | 給与天引き | 5 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 13 | SHIHARAI_HOHO | 6 | クレジットカード | クレカ | 6 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 14 | SHIHARAI_HOHO | 9 | その他 | その他 | 7 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.5 性別 (GENDER)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | GENDER | 1 | 男性 | 男性 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 16 | GENDER | 2 | 女性 | 女性 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 17 | GENDER | 9 | 回答しない | 未回答 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.6 預金種別 (YOKIN_SHUBETSU)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | YOKIN_SHUBETSU | 1 | 普通 | 普通 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 19 | YOKIN_SHUBETSU | 2 | 当座 | 当座 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.7 税区分 (ZEI_KUBUN)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | ZEI_KUBUN | 1 | 内税 | 内税 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 21 | ZEI_KUBUN | 2 | 外税 | 外税 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.8 単価種類 (TANKA_TYPE)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | TANKA_TYPE | 1 | 購読料 | 購読料 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 23 | TANKA_TYPE | 2 | 配達手数料 | 配達手数料 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.9 委託区分 (ITAKU_KUBUN)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | ITAKU_KUBUN | 1 | 振込 | 振込 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 25 | ITAKU_KUBUN | 2 | 日農委託 | 日農委託 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 26 | ITAKU_KUBUN | 9 | その他 | その他 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.10 手数料区分 (TESURYO_KUBUN)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | TESURYO_KUBUN | 1 | JA | JA | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 28 | TESURYO_KUBUN | 2 | 販売店 | 販売店 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.11 郵送区分 (YUBIN_KUBUN)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 29 | YUBIN_KUBUN | 0 | 空 | 空 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 30 | YUBIN_KUBUN | 1 | 郵送 | 郵送 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.12 メールマガジン (MAIL_MAGAZINE_FLG)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 31 | MAIL_MAGAZINE_FLG | 0 | 配信しない | 配信しない | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 32 | MAIL_MAGAZINE_FLG | 1 | 配信する | 配信する | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.13 お知らせ種別 (OSHIRASE_TYPE)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | OSHIRASE_TYPE | 1 | システム | システム | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 34 | OSHIRASE_TYPE | 2 | 重要 | 重要 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 35 | OSHIRASE_TYPE | 3 | 一般 | 一般 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 36 | OSHIRASE_TYPE | 4 | 締め切り時間 | 締切時間 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.14 お知らせ公開場所 (PUBLISH_LOCATION)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 37 | PUBLISH_LOCATION | 1 | ログイン画面 | ログイン画面 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 38 | PUBLISH_LOCATION | 2 | メニュー画面 | メニュー画面 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 39 | PUBLISH_LOCATION | 3 | メニュー画面（締め切り時間） | 締切時間 | 3 | お知らせ種別=4 (締め切り時間) 専用枠。1件のみ運用される。 | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.15 お知らせ状態 (OSHIRASE_STATUS)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 40 | OSHIRASE_STATUS | 1 | 下書き | 下書き | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 41 | OSHIRASE_STATUS | 2 | 公開 | 公開 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 42 | OSHIRASE_STATUS | 3 | 非公開 | 非公開 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.16 ログ種別 (LOG_TYPE)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 43 | LOG_TYPE | 1 | ユーザー操作 | ユーザー操作 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 44 | LOG_TYPE | 2 | システム | システム | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 45 | LOG_TYPE | 3 | エラー | エラー | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 46 | LOG_TYPE | 4 | ファイルアップロード | ファイルUP | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.17 結果ステータス (RESULT_STATUS)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 47 | RESULT_STATUS | 1 | 成功 | 成功 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 48 | RESULT_STATUS | 2 | 失敗 | 失敗 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 49 | RESULT_STATUS | 3 | 警告 | 警告 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.18 ファイルアップロードステータス (FILE_UPLOAD_STATUS)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | FILE_UPLOAD_STATUS | 1 | 処理中 | 処理中 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 51 | FILE_UPLOAD_STATUS | 2 | 完了 | 完了 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 52 | FILE_UPLOAD_STATUS | 3 | エラー | エラー | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.19 ダウンロード種別 (DOWNLOAD_TYPE)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | DOWNLOAD_TYPE | 1 | 口座振替 | 口座振替 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 54 | DOWNLOAD_TYPE | 2 | その他 | その他 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 55 | DOWNLOAD_TYPE | 3 | 増減連絡票 | 増減連絡票 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 56 | DOWNLOAD_TYPE | 4 | 増減通知書 | 増減通知書 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 57 | DOWNLOAD_TYPE | 5 | 購読者名簿 | 購読者名簿 | 5 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.20 ログイン結果 (LOGIN_RESULT)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 58 | LOGIN_RESULT | 1 | 成功 | 成功 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 59 | LOGIN_RESULT | 2 | 失敗 | 失敗 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.21 OTP種別 (OTP_TYPE)

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 60 | OTP_TYPE | 1 | ログイン | ログイン | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 61 | OTP_TYPE | 2 | パスワードリセット | PW変更 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.22 通知ステータス (NOTIFICATION_STATUS)

`t_file_upload.notification_status` の値域。アップロード API は HTTP 202 を即座に返却し、メール通知はバックグラウンドワーカーが非同期実行する設計（ACSMS-SCR-023 v1.3）。本テーブルで進捗を管理し、画面の「通知ステータス」列に表示する。code_id は migration `1779172466000-AddNotificationStatusToTFileUpload` 実行時に採番される（既存値との衝突なし）。

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 62 | NOTIFICATION_STATUS | 1 | 未送信 | 未送信 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 63 | NOTIFICATION_STATUS | 2 | 送信中 | 送信中 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 64 | NOTIFICATION_STATUS | 3 | 完了 | 完了 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 65 | NOTIFICATION_STATUS | 4 | 一部失敗 | 一部失敗 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.23 購読者層分類 (DOKUSYASO_BUNRUI)

`t_dokusya.dokusyaso_bunrui` / `t_dokusya_rireki.dokusyaso_bunrui` の値域（**単一選択**）。電子版読者管理システムの `users.profession` と 1:1（顧客DB設計 2026-08）。`0:農業者` を選んだときのみ `ja_yakushokuin_flg`、`2:企業・団体` のときのみ `nogyo_kankei_flg`、`999:その他` のときのみ `dokusyaso_bunrui_sonota` を設定できる。

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 66 | DOKUSYASO_BUNRUI | 0 | 農業者 | 農業者 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 67 | DOKUSYASO_BUNRUI | 1 | JAグループ役職員 | JA役職員 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 68 | DOKUSYASO_BUNRUI | 2 | 企業・団体 | 企業・団体 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 69 | DOKUSYASO_BUNRUI | 3 | 学生 | 学生 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 70 | DOKUSYASO_BUNRUI | 999 | その他 | その他 | 5 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

### 5.24 農業者分類 (NOGYOSYA_BUNRUI)

`t_dokusya.nogyosya_bunrui` / `t_dokusya_rireki.nogyosya_bunrui` の値域（**複数選択・カンマ区切り**）。電子版読者管理システムの `users.products` と 1:1（顧客DB設計 2026-08）。`999:その他` を含むときのみ `nogyosya_bunrui_sonota` を設定できる。

| code_id | code_category | code_value | code_name | code_name_short | sort_order | biko | deleted_at | created_at | created_by | updated_at | updated_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 71 | NOGYOSYA_BUNRUI | 0 | 米 | 米 | 1 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 72 | NOGYOSYA_BUNRUI | 1 | 野菜 | 野菜 | 2 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 73 | NOGYOSYA_BUNRUI | 2 | 果実 | 果実 | 3 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 74 | NOGYOSYA_BUNRUI | 3 | 花 | 花 | 4 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 75 | NOGYOSYA_BUNRUI | 4 | 畜産 | 畜産 | 5 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 76 | NOGYOSYA_BUNRUI | 5 | 酪農 | 酪農 | 6 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |
| 77 | NOGYOSYA_BUNRUI | 999 | その他 | その他 | 7 | | NULL | 2026-01-01 | SYSTEM_MIGRATION | 2026-01-01 | SYSTEM_MIGRATION |

---

## 6. m_account（アカウントマスタ）

初期管理者アカウント（日農管理者）を1件登録する。

### 設計方針

- `role_id = 1`（NICHINO_ADMIN）の管理者アカウントを1件作成
- 日農アカウントのため `ja_id`, `kanri_shiten_id`, `todofuken_code` は `NULL`
- パスワードは bcrypt（cost=10）でハッシュ化して保存
- **初回ログイン時にパスワード変更を必須とする**運用ルール
- MFA は初期設定では無効（`mfa_enable_flg = false`）

### 初期管理者

| account_id | login_id | password_hash | account_name | role_id | ja_id | kanri_shiten_id | todofuken_code | paper_flg | denshi_flg | email | password_updated_at | last_login_at | login_failure_count | account_lock_flg | account_lock_at | biko | mfa_enable_flg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | admin | <BCRYPT_HASH_OF_INITIAL_PASSWORD> | 日農 管理者 | 1 | NULL | NULL | NULL | false | false | admin@agrinews.jp | 2026-01-01 | NULL | 0 | false | NULL | 初期管理者アカウント | false |

### 初期パスワード

- パスワード平文: `Admin@1234`
- ハッシュは seeder 実行時に `bcrypt.hash('Admin@1234', 10)` で生成する
- セキュリティ要件：初回ログイン時に必ず変更すること

### 共通カラム（全レコード共通）

| カラム | 値 |
| --- | --- |
| deleted_at | NULL |
| created_at | 2026-01-01 |
| created_by | SYSTEM_MIGRATION |
| updated_at | 2026-01-01 |
| updated_by | SYSTEM_MIGRATION |
