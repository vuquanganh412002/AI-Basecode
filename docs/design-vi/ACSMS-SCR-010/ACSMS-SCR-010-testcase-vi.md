---
customer_name: 日本農業新聞様
system_name: クラウド版購読者管理システム
document_name: テスト仕様書
screen_id: ACSMS-SCR-010
screen_name: メニュー画面
format_code: 16-BM/PM/VTI
format_version: "1.0"
issue_date: 2026-06-03
test_level: 結合テスト
test_environment: Windows 10/11, Chrome, Edge
author: Kieu Thi Diem
reviewer: Nguyen Huy Dat
---


## 変更履歴

| No. | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-06-03 | 1.0 | Kieu Thi Diem | Tạo mới | Nguyen Huy Dat |  |


## システム概要

本システムは、JA向けのクラウド型読者管理システムであり、
購読者情報の管理、購読履歴の管理、口座振替データの管理などの機能を提供する。
主な機能として、購読者情報の登録・更新・検索、
購読内容の変更履歴管理、口座振替データの作成および管理、
ファイルのアップロード・ダウンロード機能、システムのお知らせ管理などを提供する。
また、ユーザーのログイン管理、ログイン履歴の記録、
ユーザー操作ログの記録などのセキュリティ・監査機能をサポートする。

## 資料目的

Tài liệu mô tả chi tiết test specification được tạo mới trên hệ thống cho màn hình「メニュー画面（ACSMS-SCR-010）」.
Tài liệu này tham khảo ISTQB và IEEE 829, đáp ứng các tiêu chí chất lượng sau.

- Mỗi testcase được tạo dựa trên một kịch bản duy nhất (single responsibility).
- Mô tả thủ tục ở mức độ có thể tái hiện, nêu rõ test data.
- Kết quả mong đợi phải đo lường được (nội dung message, kết quả query DB, HTTP status code, v.v.).

## 関連資料

| No | 資料コード | 資料名 |
| --- | --- | --- |
| 1 | ACSMS-SCR-010 | Tài liệu thiết kế màn hình メニュー画面 |
| 2 | ACSMS-SCR-010-api | Tài liệu thiết kế API メニュー画面 |
| 3 | testcase-viewpoints | Danh sách quan điểm test chung toàn hệ thống |


## テストカテゴリ一覧

| # | カテゴリ | テストケース数 |
| --- | --- | --- |
| 1 | Kiểm soát quyền truy cập (Access Control) | 6 |
| 2 | Hiển thị màn hình・Responsive (Layout & Responsive) | 9 |
| 3 | Logic nghiệp vụ (Function) | 7 |
| 4 | Xử lý lỗi chung (Common Error Handling) | 7 |
|  | 合計 | 29 |

---

# カテゴリ 1: Kiểm soát quyền truy cập (Access Control)

## ACSMS-TC-010-001 — Cấm user chưa xác thực truy cập màn hình menu

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・Chưa login (không có session Cookie, hoặc đã hết hạn)

### 手順

ステップ1：
Nhập `/dashboard` vào address bar của browser và truy cập trực tiếp

ステップ2：
Gọi trực tiếp GET `/api/v1/oshirase/menu` từ tab Network của DevTools

### 期待結果

ステップ1：
Màn hình menu không hiển thị, chuyển về `/login` (kèm query `?redirect=/dashboard`)

ステップ2：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

補足：
・Màn hình menu là màn hình bắt buộc xác thực, khi chưa xác thực thì router guard phía frontend dẫn về màn hình login
・Phía backend SessionAuthGuard cũng trả về 401

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-002 — NICHINO_ADMIN hiển thị menu・ẩn khu vực phê duyệt độc giả bản điện tử

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền「dokusya.view」

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
Kiểm tra sự hiện diện của khu vực phê duyệt độc giả bản điện tử (button「Web申込読者承認」)

ステップ3：
Kiểm tra các menu card được hiển thị

ステップ4：
Gọi trực tiếp GET `/api/v1/dokusya/pending-approval/count` từ tab Network của DevTools

### 期待結果

ステップ1：
Màn hình menu được hiển thị (màn hình menu cho phép mọi user đã xác thực truy cập)

ステップ2：
Khu vực phê duyệt độc giả bản điện tử không hiển thị (vì NICHINO_ADMIN không xử lý bản điện tử)

ステップ3：
Chỉ hiển thị menu gắn với quyền đang nắm giữ (マスタ管理：JAマスタ・管理支店マスタ, その他：ファイルアップロード・ファイルダウンロード, 管理者機能：ログ参照・アカウント管理・お知らせ一覧). 単価マスタ・支店マスタ không hiển thị

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Việc phán định hiển thị khu vực phê duyệt độc giả bản điện tử được thực hiện phía frontend dựa trên việc có quyền `dokusya.view` hay không
・API lấy số lượng chờ phê duyệt phía backend cũng trả về 403 khi không có quyền `dokusya.view`

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

Theo bảng quyền `account_concept.md`, màn hình menu là ○ với mọi role. Khu vực phê duyệt độc giả bản điện tử chỉ hiển thị với account xử lý bản điện tử.

## ACSMS-TC-010-003 — NICHINO_STAFF hiển thị menu・ẩn khu vực phê duyệt độc giả bản điện tử

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: NICHINO_STAFF
  - ・Đã login + đã xác thực MFA
  - ・Không có quyền「dokusya.view」

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
Kiểm tra sự hiện diện của khu vực phê duyệt độc giả bản điện tử

ステップ3：
Kiểm tra các menu card được hiển thị

ステップ4：
Gọi trực tiếp GET `/api/v1/dokusya/pending-approval/count` từ tab Network của DevTools

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Khu vực phê duyệt độc giả bản điện tử không hiển thị (vì NICHINO_STAFF không xử lý bản điện tử)

ステップ3：
Chỉ hiển thị menu gắn với quyền đang nắm giữ (その他：ファイルアップロード・ファイルダウンロード, 管理者機能：ログ参照・販売店代行入力). マスタ管理 không hiển thị

ステップ4：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・NICHINO_STAFF không có `dokusya.view` nên API lấy số lượng chờ phê duyệt trả về 403
・Menu 販売店代行入力 chỉ hiển thị với NICHINO_STAFF có quyền `hanbaiten.daiko_input`

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-004 — CHUOKAI hiển thị menu・hiển thị khu vực phê duyệt độc giả bản điện tử (scope chuokai của mình)

- 観点ID: VP-A-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, ja_id=100)
  - ・Có quyền「dokusya.view」
  - ・Flag xử lý bản điện tử `denshi_flg = true`
  - ・Tồn tại từ 1 độc giả chờ phê duyệt (`denshi_shonin_status = 0`) trong chuokai của mình (ja_id=100)

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
Kiểm tra hiển thị khu vực phê duyệt độc giả bản điện tử

ステップ3：
Kiểm tra response của GET `/api/v1/dokusya/pending-approval/count` ở tab Network của DevTools

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE denshi_shonin_status = 0 AND deleted_at IS NULL AND ja_id = 100`

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Khu vực phê duyệt độc giả bản điện tử được hiển thị (hiển thị text「電子版読者承認」＋ message「承認待ちの読者がいます」＋ button「Web申込読者承認」)

ステップ3：
Trả về HTTP 200 (`data.count` là số lượng chờ phê duyệt theo scope chuokai của mình, `data.ja_id` là 100)

ステップ4：
Giá trị `count` trả về ở bước 3 khớp với số lượng tổng hợp từ DB

補足：
・Phán định hiển thị khu vực phê duyệt độc giả bản điện tử chỉ khi thỏa cả quyền `dokusya.view` ＋ `denshi_flg = true`
・API lấy số lượng chờ phê duyệt theo DataScope chỉ tổng hợp data `ja_id = :user_ja_id`

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-005 — JA_HONTEN hiển thị menu・hiển thị khu vực phê duyệt độc giả bản điện tử (scope JA của mình)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」
  - ・Flag xử lý bản điện tử `denshi_flg = true`
  - ・JA khác: ja_id=200 (ngoài JA của mình)

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
Kiểm tra hiển thị khu vực phê duyệt độc giả bản điện tử

ステップ3：
Kiểm tra response của GET `/api/v1/dokusya/pending-approval/count` ở tab Network của DevTools

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE denshi_shonin_status = 0 AND deleted_at IS NULL AND ja_id = 100`

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Khu vực phê duyệt độc giả bản điện tử được hiển thị

ステップ3：
Trả về HTTP 200 (`data.count` là số lượng chờ phê duyệt theo scope JA của mình (ja_id=100), độc giả JA khác (ja_id=200) không nằm trong tổng hợp)

ステップ4：
Giá trị `count` trả về ở bước 3 khớp với số lượng tổng hợp từ DB

補足：
・JA_HONTEN chỉ tổng hợp data JA của mình (ja_id=100)
・Độc giả chờ phê duyệt của JA khác (ja_id=200) không nằm trong số lượng tổng hợp

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-006 — JA_KANRI_SHITEN hiển thị menu・hiển thị khu vực phê duyệt độc giả bản điện tử (scope chi nhánh quản lý của mình)

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_KANRI_SHITEN (thuộc ja_id=100 / kanri_shiten_id=10)
  - ・Có quyền「dokusya.view」
  - ・Flag xử lý bản điện tử `denshi_flg = true`
  - ・Chi nhánh quản lý khác: kanri_shiten_id=11 (cùng JA)

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
Kiểm tra hiển thị khu vực phê duyệt độc giả bản điện tử

ステップ3：
Kiểm tra response của GET `/api/v1/dokusya/pending-approval/count` ở tab Network của DevTools

ステップ4：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE denshi_shonin_status = 0 AND deleted_at IS NULL AND ja_id = 100 AND kanri_shiten_id = 10`

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Khu vực phê duyệt độc giả bản điện tử được hiển thị

ステップ3：
Trả về HTTP 200 (`data.count` là số lượng chờ phê duyệt theo scope chi nhánh quản lý của mình (ja_id=100 và kanri_shiten_id=10), độc giả chi nhánh quản lý khác (kanri_shiten_id=11) không nằm trong tổng hợp)

ステップ4：
Giá trị `count` trả về ở bước 3 khớp với số lượng tổng hợp từ DB

補足：
・JA_KANRI_SHITEN chỉ tổng hợp data JA của mình và chi nhánh quản lý của mình (ja_id=100 AND kanri_shiten_id=10)
・Độc giả chờ phê duyệt của chi nhánh quản lý khác (kanri_shiten_id=11) không nằm trong số lượng tổng hợp

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

---

# カテゴリ 2: Hiển thị màn hình・Responsive (Layout & Responsive)

## ACSMS-TC-010-007 — Layout tổng thể màn hình menu khớp với thiết kế

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Browser: Chrome (latest), độ phân giải 1920×1080

### 手順

ステップ1：
Sau khi login, mở màn hình menu

ステップ2：
So sánh màn hình với tài liệu thiết kế (screen-design.md / index.html)

ステップ3：
Kiểm tra vị trí từng phần tử (vị trí header, khu vực phê duyệt độc giả bản điện tử, khu vực お知らせ, bố trí menu card)

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Màu nền, font, cỡ font, padding/margin, màu button, style card đều khớp với thiết kế

ステップ3：
Các phần tử được bố trí đúng theo thiết kế

補足：
・Không có khác biệt thị giác so với thiết kế
・design tokens (`design-tokens.ts`) được áp dụng (không có màu hardcode)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-008 — Hiển thị header (title・tên account・tên quyền account)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra title bên trái header phía trên màn hình

ステップ2：
Kiểm tra hiển thị tên account (`account_name`) bên phải header

ステップ3：
Kiểm tra hiển thị tên quyền account (label role)

### 期待結果

ステップ1：
Chữ「メニュー画面」được hiển thị

ステップ2：
Tên account đang login được hiển thị

ステップ3：
Label tiếng Nhật theo role được hiển thị (với JA_HONTEN thì hiển thị「JA本店アカウント」)

補足：
・Chuyển đổi label role: NICHINO_ADMIN→日農管理者アカウント / NICHINO_STAFF→日農担当者アカウント / CHUOKAI→中央会アカウント / JA_HONTEN→JA本店アカウント / JA_KANRI_SHITEN→JA管理支店アカウント

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-009 — Hiển thị danh sách お知らせ và thứ tự sắp xếp

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Tồn tại nhiều お知らせ dành cho màn hình menu (`publish_location = 2`, `status = 2`, `oshirase_type != 4`)

### 手順

ステップ1：
Kiểm tra khu vực お知らせ

ステップ2：
Kiểm tra hiển thị ngày (`publish_start_date`) và title (`title`) của từng dòng お知らせ

ステップ3：
Kiểm tra thứ tự sắp xếp của お知らせ

ステップ4：
Kiểm tra お知らせ trong vòng 7 ngày từ ngày bắt đầu công khai có hiển thị NEWアイコン

### 期待結果

ステップ1：
Danh sách お知らせ được hiển thị

ステップ2：
Mỗi dòng hiển thị ngày (định dạng `YYYY/MM/DD HH:mm`) và title

ステップ3：
Hiển thị theo thứ tự ngày bắt đầu công khai (`publish_start_date`) mới nhất trước (giảm dần)

ステップ4：
お知らせ có `is_new = true` hiển thị NEWアイコン

補足：
・Danh sách お知らせ hiển thị các dòng `oshirase_type != 4` (loại trừ thời gian deadline)
・Hiển thị 5 dòng mỗi lần, scroll để xem phần còn lại

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-010 — Hiển thị chip thời gian deadline (deadline_notice)

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Tồn tại 1 お知らせ thời gian deadline (`publish_location = 2`, `oshirase_type = 4`, `status = 2`)

### 手順

ステップ1：
Kiểm tra bên phải header của khu vực お知らせ

ステップ2：
Kiểm tra hiển thị title của chip thời gian deadline

### 期待結果

ステップ1：
Chip thời gian deadline được hiển thị (khi tồn tại お知らせ `deadline_notice`)

ステップ2：
Title (`title`) của お知らせ thời gian deadline được hiển thị trên chip

補足：
・お知らせ thời gian deadline hiển thị tối đa 1 dòng `oshirase_type = 4` và `publish_location = 2`
・Khi không có record tương ứng (`deadline_notice` là `null`) thì chip không hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-011 — Đóng/mở dialog chi tiết お知らせ

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Trạng thái đang hiển thị từ 1 お知らせ

### 手順

ステップ1：
Click link「詳細」của dòng お知らせ

ステップ2：
Kiểm tra hiển thị title・nội dung (`content`) trong dialog

ステップ3：
Click button đóng dialog

### 期待結果

ステップ1：
Dialog chi tiết お知らせ được hiển thị

ステップ2：
Title và toàn văn nội dung của お知らせ được hiển thị

ステップ3：
Dialog đóng lại, quay về màn hình menu

補足：
・Click link 詳細 thì toàn văn お知らせ hiển thị dạng popup
・Nội dung hiển thị dạng literal text, HTML tag không được thực thi

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-012 — Hiển thị grid menu card

- 観点ID: VP-E-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, ja_id=100)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Kiểm tra grid menu card

ステップ2：
Kiểm tra tiêu đề category và item menu của từng card

ステップ3：
Kiểm tra việc chuyển màn khi click item menu

### 期待結果

ステップ1：
Menu card được hiển thị dạng grid

ステップ2：
Category (購読者管理・販売店管理・データ作成・レポート作成・マスタ管理・その他・管理者機能) và item gắn với quyền đang nắm giữ được hiển thị

ステップ3：
Click item menu thì chuyển về màn hình tương ứng

補足：
・Sidebar và menu card tham chiếu cùng một định nghĩa menu (`MENU_SECTIONS` / `useMenu`), nội dung hiển thị khớp nhau
・Chức năng không sử dụng được thì ẩn hoàn toàn (ẩn chứ không phải làm xám)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-013 — Responsive — breakpoint PC／Tablet／Mobile

- 観点ID: VP-E-02
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đang mở màn hình menu

### 手順

ステップ1：
Đặt kích thước cửa sổ 1920×1080 (PC)

ステップ2：
Đổi sang 768×1024 (Tablet)

ステップ3：
Đổi sang 375×667 (Mobile)

### 期待結果

ステップ1：
Sidebar hiển thị cố định, menu card hiển thị nhiều cột

ステップ2：
Sidebar gập lại, số cột của menu card giảm xuống

ステップ3：
Sidebar dạng overlay, menu card xếp dọc, không phát sinh scroll ngang

補足：
・Cả 3 breakpoint không vỡ layout, không phát sinh scroll ngang
・Khu vực お知らせ・khu vực phê duyệt độc giả bản điện tử đều thao tác được

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-014 — Thao tác bàn phím và thứ tự tab

- 観点ID: VP-E-03
- 種類: Normal (正常)
- 前提条件:
  - ・Trạng thái đang mở màn hình menu, focus ở body

### 手順

ステップ1：
Nhấn phím Tab liên tục, kiểm tra việc chuyển focus

ステップ2：
Focus vào button「Web申込読者承認」và nhấn phím Enter

ステップ3：
Khi dialog chi tiết お知らせ đang mở, nhấn phím Escape

### 期待結果

ステップ1：
Focus chuyển theo thứ tự khu vực phê duyệt độc giả bản điện tử → お知らせ → menu card

ステップ2：
Xử lý click button「Web申込読者承認」được thực hiện

ステップ3：
Dialog đóng lại

補足：
・Mọi phần tử thao tác đều thao tác được bằng bàn phím
・Thứ tự tab đúng theo thiết kế

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

---

# カテゴリ 3: Logic nghiệp vụ (Function)

## ACSMS-TC-010-015 — Lấy お知らせ normal (danh sách + tách thời gian deadline)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Tồn tại nhiều お知らせ dành cho màn hình menu (`publish_location = 2`, `status = 2`, `deleted_at IS NULL`, `publish_start_date <= NOW()`)
  - ・Tồn tại 1 お知らせ thời gian deadline `oshirase_type = 4`

### 手順

ステップ1：
Mở màn hình menu

ステップ2：
Kiểm tra response của GET `/api/v1/oshirase/menu?limit=20` ở tab Network của DevTools

ステップ3：
Kiểm tra `oshirase_type` của từng phần tử trong `data.oshirase_list`

ステップ4：
Kiểm tra nội dung của `data.deadline_notice`

### 期待結果

ステップ1：
Danh sách お知らせ và chip thời gian deadline được hiển thị

ステップ2：
Trả về HTTP 200 (gồm `data.oshirase_list` (mảng) và `data.deadline_notice` (object hoặc null))

ステップ3：
Toàn bộ phần tử của `oshirase_list` là `oshirase_type != 4` (loại trừ thời gian deadline), giảm dần theo `publish_start_date`

ステップ4：
`oshirase_type` của `deadline_notice` là 4

補足：
・Điều kiện lấy: `publish_location = 2` và `status = 2` và `deleted_at IS NULL` và `publish_start_date <= NOW()` và (`publish_end_date IS NULL` hoặc `publish_end_date >= NOW()`) và (`ja_id IS NULL` hoặc `ja_id = :user_ja_id`)
・お知らせ `ja_id IS NULL` (dành cho mọi JA) và dành cho JA của mình (`ja_id = 100`) là đối tượng lấy

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-016 — Lấy お知らせ — không có thời gian deadline (deadline_notice là null)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Không tồn tại お知らせ thời gian deadline `oshirase_type = 4` (hoặc ngoài kỳ công khai)

### 手順

ステップ1：
Mở màn hình menu

ステップ2：
Kiểm tra response của GET `/api/v1/oshirase/menu` ở tab Network của DevTools

ステップ3：
Kiểm tra bên phải header của khu vực お知らせ

### 期待結果

ステップ1：
Danh sách お知らせ được hiển thị

ステップ2：
Trả về HTTP 200 (`data.deadline_notice` là `null`)

ステップ3：
Chip thời gian deadline không hiển thị

補足：
・Khi お知らせ thời gian deadline không tương ứng, `deadline_notice` được set `null`
・`oshirase_list` trả về bình thường không liên quan đến thời gian deadline

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-017 — Lấy お知らせ — trường hợp không tìm thấy dữ liệu

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Không tồn tại お知らせ công khai dành cho màn hình menu

### 手順

ステップ1：
Mở màn hình menu

ステップ2：
Kiểm tra response của GET `/api/v1/oshirase/menu` ở tab Network của DevTools

ステップ3：
Kiểm tra hiển thị khu vực お知らせ

### 期待結果

ステップ1：
Không tồn tại dữ liệu ở khu vực お知らせ

ステップ2：
Trả về HTTP 200 (`data.oshirase_list` là mảng rỗng, `data.deadline_notice` là `null`)

ステップ3：
Không hiển thị ACSMS-MSG-010-001 message `データの取得に失敗しました。`, mà hiển thị nội dung お知らせ là 0 dòng

補足：
・Ngay cả khi お知らせ là 0 dòng vẫn trả về HTTP 200 với mảng rỗng
・Chỉ khi bản thân xử lý lấy thất bại mới hiển thị ACSMS-MSG-010-001 (xem Xử lý lỗi chung)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-018 — Lấy số lượng chờ phê duyệt normal + DataScope

- 観点ID: VP-A-02
- 種類: Normal (正常)
- 前提条件:
  - ・role: CHUOKAI (thuộc chuokai-001, ja_id=100)
  - ・Có quyền「dokusya.view」, `denshi_flg = true`
  - ・Trong scope của mình tồn tại 5 độc giả chờ phê duyệt (`denshi_shonin_status = 0`)
  - ・JA khác (ja_id=200) tồn tại 3 độc giả chờ phê duyệt

### 手順

ステップ1：
Mở màn hình menu

ステップ2：
Kiểm tra response của GET `/api/v1/dokusya/pending-approval/count` ở tab Network của DevTools

ステップ3：
Kiểm tra DB: `SELECT COUNT(*) FROM t_dokusya WHERE denshi_shonin_status = 0 AND deleted_at IS NULL AND ja_id = 100`

### 期待結果

ステップ1：
Số lượng chờ phê duyệt được hiển thị ở khu vực phê duyệt độc giả bản điện tử

ステップ2：
Trả về HTTP 200 (`data.count = 5`, `data.ja_id = 100`, 3 dòng của JA khác (ja_id=200) không nằm trong tổng hợp)

ステップ3：
Số lượng tổng hợp DB là 5 dòng, khớp với `count` của response

補足：
・Lấy số lượng chờ phê duyệt theo DataScope chỉ tổng hợp data trong scope của mình
・Điều kiện lọc: `denshi_shonin_status = 0` và `deleted_at IS NULL`

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-019 — Chuyển Web申込読者承認 (số lượng chờ phê duyệt từ 1 trở lên)

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」, `denshi_flg = true`
  - ・Số lượng chờ phê duyệt từ 1 trở lên

### 手順

ステップ1：
Mở màn hình menu, kiểm tra khu vực phê duyệt độc giả bản điện tử

ステップ2：
Kiểm tra trạng thái của button「Web申込読者承認」

ステップ3：
Click button「Web申込読者承認」

ステップ4：
Kiểm tra trạng thái lọc của màn hình tìm kiếm chi tiết độc giả ở màn chuyển đến

### 期待結果

ステップ1：
Khu vực phê duyệt độc giả bản điện tử được hiển thị

ステップ2：
Button「Web申込読者承認」hiển thị ở trạng thái active (vì chờ phê duyệt từ 1 trở lên)

ステップ3：
Chuyển sang màn hình tìm kiếm chi tiết độc giả (DokusyaList) (kèm query `?denshi_shonin_status=0`)

ステップ4：
Danh sách hiển thị ở trạng thái đã lọc chỉ độc giả chờ phê duyệt (chưa phê duyệt)

補足：
・Click button「Web申込読者承認」chuyển sang màn hình tìm kiếm chi tiết độc giả kèm lọc trạng thái phê duyệt bản điện tử = chưa phê duyệt (`denshi_shonin_status=0`)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-020 — Web申込読者承認 — số lượng chờ phê duyệt 0 thì button disable

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」, `denshi_flg = true`
  - ・Số lượng chờ phê duyệt là 0

### 手順

ステップ1：
Mở màn hình menu, kiểm tra khu vực phê duyệt độc giả bản điện tử

ステップ2：
Kiểm tra sự hiện diện của message「承認待ちの読者がいます」và thông báo về deadline

ステップ3：
Kiểm tra trạng thái của button「Web申込読者承認」

### 期待結果

ステップ1：
Khu vực phê duyệt độc giả bản điện tử (text「電子版読者承認」＋ button) được hiển thị

ステップ2：
Message「承認待ちの読者がいます」và thông báo về deadline không hiển thị (vì chờ phê duyệt là 0)

ステップ3：
Button「Web申込読者承認」hiển thị ở trạng thái disable (vì chờ phê duyệt là 0)

補足：
・Khi chờ phê duyệt là 0, message chờ phê duyệt và thông báo deadline bị ẩn
・Bản thân khu vực phê duyệt độc giả bản điện tử vẫn tiếp tục hiển thị

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-021 — Logout

- 観点ID: VP-C-01
- 種類: Normal (正常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đã login + đã xác thực MFA

### 手順

ステップ1：
Click「ログアウト」ở khu vực thông tin account của header

ステップ2：
Kiểm tra chuyển màn và message

ステップ3：
Kiểm tra session Cookie ở tab Application của DevTools

### 期待結果

ステップ1：
Xử lý logout được thực hiện

ステップ2：
Chuyển sang màn hình login, message `ログアウトしました。` (ACSMS-MSG-010-002) được hiển thị

ステップ3：
Session Cookie đã hết hạn (Redis session đã bị xóa)

補足：
・Logout thì Redis session phía backend bị xóa và Cookie hết hạn

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

---

# カテゴリ 4: Xử lý lỗi chung (Common Error Handling)

## ACSMS-TC-010-022 — Lỗi chung — UNAUTHORIZED — xử lý khi session hết hạn

- 観点ID: VP-A-05
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang hiển thị màn hình menu
  - ・Đã quá 24 giờ từ thao tác cuối, Redis session TTL đã hết hạn

### 手順

ステップ1：
Reload màn hình menu, gửi request GET `/api/v1/oshirase/menu`

ステップ2：
Kiểm tra nội dung response và chuyển màn

### 期待結果

ステップ1：
Trả về HTTP 401 (`error_code: UNAUTHORIZED`, message `セッションが切れました。再度ログインしてください。`)

ステップ2：
Phía frontend trạng thái user của Pinia auth store được clear, tự động chuyển về `/login?redirect=/dashboard`

補足：
・Khi session hết hạn, phía backend SessionAuthGuard trả về 401 và phía frontend axios interceptor dẫn đồng nhất về màn hình login

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-023 — Lỗi chung — FORBIDDEN — lấy số lượng chờ phê duyệt khi không có quyền

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: NICHINO_ADMIN
  - ・Không có quyền「dokusya.view」

### 手順

ステップ1：
Thực thi `fetch('/api/v1/dokusya/pending-approval/count', { credentials: 'include' })` từ Console của DevTools

ステップ2：
Kiểm tra HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối bởi kiểm tra quyền phía backend

ステップ2：
Trả về HTTP 403 (`error_code: FORBIDDEN`, message `この画面へのアクセス権限がありません。`)

補足：
・Role không có quyền `dokusya.view` dù gọi trực tiếp API lấy số lượng chờ phê duyệt thì phía backend vẫn trả về 403

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-024 — Lỗi chung — DENSHI_NOT_ENABLED — account chưa kích hoạt chức năng bản điện tử

- 観点ID: VP-A-01
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Có quyền「dokusya.view」
  - ・Flag xử lý bản điện tử `denshi_flg = false`

### 手順

ステップ1：
Mở màn hình menu

ステップ2：
Thực thi `fetch('/api/v1/dokusya/pending-approval/count', { credentials: 'include' })` từ Console của DevTools

ステップ3：
Kiểm tra hiển thị khu vực phê duyệt độc giả bản điện tử

### 期待結果

ステップ1：
Màn hình menu được hiển thị

ステップ2：
Trả về HTTP 403 (`error_code: DENSHI_NOT_ENABLED`, message `このアカウントでは電子版機能が有効化されていません。`)

ステップ3：
Toàn bộ khu vực phê duyệt độc giả bản điện tử không hiển thị (vì là account không xử lý bản điện tử)

補足：
・Account `denshi_flg = false` thì API lấy số lượng chờ phê duyệt trả về 403 (`DENSHI_NOT_ENABLED`)
・Phía frontend ẩn toàn bộ khu vực phê duyệt độc giả bản điện tử

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-025 — Lỗi chung — BAD_REQUEST — tham số request không hợp lệ

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở tab Network của DevTools

### 手順

ステップ1：
Thực thi `fetch('/api/v1/oshirase/menu?limit=abc', { credentials: 'include' })` từ Console của DevTools (chỉ định limit không phải số)

ステップ2：
Kiểm tra HTTP status và error_code của response

### 期待結果

ステップ1：
Request bị từ chối bởi validation phía backend

ステップ2：
Trả về HTTP 400 (`error_code: BAD_REQUEST`, message `リクエストパラメータが不正です。`)

補足：
・Tham số limit được kiểm tra kiểu số (1〜100), khi giá trị không hợp lệ thì map sang BAD_REQUEST

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-026 — Lỗi chung — TOO_MANY_REQUESTS — vượt rate limit

- 観点ID: VP-A-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Dùng script test gửi GET `/api/v1/oshirase/menu` vượt giới hạn trong 1 phút

### 手順

ステップ1：
Khởi động script, gửi request tần suất cao đến API lấy お知らせ

ステップ2：
Kiểm tra HTTP status và error_code của response

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
Đến giới hạn thì trả về bình thường, sau đó trả về 429

ステップ2：
Trả về HTTP 429 (`error_code: TOO_MANY_REQUESTS`, message `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。`)

ステップ3：
Toast `リクエスト回数が上限を超えました。しばらくしてから再度お試しください。` được hiển thị

補足：
・NestJS @Throttle decorator + AWS WAF rate limit chặn ở cả tầng hạ tầng／ứng dụng
・Tuân thủ quan điểm VP-A-08「レート制限・Throttling」(testcase-viewpoints.md v1.1)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-027 — Lỗi chung — INTERNAL_SERVER_ERROR — lỗi server

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Trạng thái có thể giả lập sự cố server như lỗi kết nối DB

### 手順

ステップ1：
Mở màn hình menu ở trạng thái giả lập sự cố server (lỗi kết nối DB v.v.)

ステップ2：
Kiểm tra HTTP status và error_code của response GET `/api/v1/oshirase/menu`

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
Xử lý lấy お知らせ thất bại

ステップ2：
Trả về HTTP 500 (`error_code: INTERNAL_SERVER_ERROR`, message `システムエラーが発生しました。しばらくしてから再度お試しください。`)

ステップ3：
Toast `システムエラーが発生しました。しばらくしてから再度お試しください。` được hiển thị

補足：
・Sự cố server như lỗi kết nối DB được map sang INTERNAL_SERVER_ERROR
・Dù phát sinh lỗi ngoài dự kiến thì stack trace không hiển thị cho người dùng

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-028 — Lỗi chung — message khi lấy お知らせ thất bại

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Giả lập trạng thái API lấy お知らせ trả về lỗi

### 手順

ステップ1：
Mở màn hình menu ở trạng thái API lấy お知らせ trả về lỗi

ステップ2：
Kiểm tra hiển thị và message của khu vực お知らせ

### 期待結果

ステップ1：
Xử lý lấy お知らせ thất bại

ステップ2：
ACSMS-MSG-010-001 message `データの取得に失敗しました。` được hiển thị

補足：
・Khi lấy お知らせ thất bại, message ACSMS-MSG-010-001 `データの取得に失敗しました。` của định nghĩa item màn hình được hiển thị
・Việc lấy thất bại không cản trở hiển thị toàn bộ màn hình menu (chỉ khu vực お知らせ hiển thị lỗi)

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

(なし)

## ACSMS-TC-010-029 — Lỗi chung — xử lý khi mất kết nối mạng

- 観点ID: VP-D-08
- 種類: Abnormal (異常)
- 前提条件:
  - ・role: JA_HONTEN (thuộc ja_id=100)
  - ・Đang mở tab Network của DevTools

### 手順

ステップ1：
Đặt mất kết nối mạng (offline) ở tab Network của DevTools

ステップ2：
Reload màn hình menu, gửi GET `/api/v1/oshirase/menu`

ステップ3：
Kiểm tra hiển thị toast phía màn hình

### 期待結果

ステップ1：
Trở thành trạng thái mất kết nối mạng

ステップ2：
API request trở thành lỗi mạng

ステップ3：
Toast `ネットワークエラーが発生しました。しばらくしてから再度お試しください。` được hiển thị

補足：
・Khi mất kết nối mạng, phía frontend axios interceptor hiển thị toast lỗi mạng
・Không phát sinh lỗi ngoài dự kiến

### テスト結果（1回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### テスト結果（2回目）

| 項目 | 値 |
| --- | --- |
| 結果 | - |
| 実績／アウトプット | - |
| 担当者 | - |
| 確認日付 | - |
| バグID | - |

### 備考

Văn bản toast lỗi mạng tuân thủ implementation của axios interceptor phía frontend.

---
