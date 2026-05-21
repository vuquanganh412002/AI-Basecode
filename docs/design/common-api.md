# Danh sách Common API — ACSMS

Các API dùng chung giữa nhiều màn hình. Chi tiết xem tại file API gốc (定義元).

| API ID                | API名                     | メソッド | URI                           | 概要                                               | 定義元    | 使用画面                          |
| --------------------- | ------------------------- | -------- | ----------------------------- | -------------------------------------------------- | --------- | --------------------------------- |
| ACSMS-API-COMMON-001  | Get Prefecture List       | GET      | /api/v1/todofuken             | 都道府県プルダウンリストを取得する                   | SCR-009   | SCR-005, SCR-009, SCR-011, SCR-022, SCR-023, SCR-024, SCR-025 |
| ACSMS-API-COMMON-002  | Get Roles Dropdown        | GET      | /api/v1/roles/dropdown        | 管理者区分（ロール）プルダウンリストを取得する        | SCR-024   | SCR-024, SCR-025                  |
| ACSMS-API-COMMON-003  | Get JA Dropdown           | GET      | /api/v1/ja/dropdown           | JAプルダウンリストを取得する（ページング+フリーテキスト検索／カスケード絞込み） | SCR-024   | SCR-009, SCR-023, SCR-024, SCR-025, SCR-031 |
| ACSMS-API-COMMON-004  | Get Kanri Shiten Dropdown | GET      | /api/v1/kanri-shiten/dropdown | 管理支店プルダウンリストを取得する（カスケード絞込み） | SCR-024   | SCR-007, SCR-024, SCR-025         |
| ACSMS-API-COMMON-005  | Get Account Dropdown      | GET      | /api/v1/account/dropdown      | アカウントプルダウンリストを取得する（DataScope自動適用） | SCR-030   | SCR-030                           |
| ACSMS-API-COMMON-006  | Get Shiten Dropdown       | GET      | /api/v1/shiten/dropdown       | 支店プルダウンリストを取得する（管理支店IDで絞込み、DataScope自動適用） | SCR-015   | SCR-015                           |
| ACSMS-API-COMMON-007  | Get Hanbaiten Dropdown    | GET      | /api/v1/hanbaiten/dropdown    | 販売店プルダウンリストを取得する（DataScope自動適用） | SCR-015   | SCR-015                           |
