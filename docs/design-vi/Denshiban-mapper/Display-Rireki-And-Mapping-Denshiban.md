# Mapping Denshiban ⇄ Cloud

> Nguồn: `Display-Rireki-And-Mapping-Denshiban.xlsx` — sheet `Mapping Denshiban-Cloud`.

---

## 1. Đồng bộ dữ liệu khởi tạo từ denshiban sang cloud

Bảng đích: `t_dokusya` (cloud).

| No | Cột | Kiểu (size) | NULL | Khóa/Index | Ý nghĩa | Trường denshiban (view) | Quy tắc chuyển đổi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dokusya_id | BIGINT | | PK, IDENTITY | ID độc giả | – | Cloud tự sinh số. |
| 2 | ja_id | BIGINT | | IX2, IX7a, IX8a | ID JA (FK) | – | Dựa vào JACd (kanri_shiten_code) để tìm ra ja_id của hệ thống. |
| 3 | kanri_shiten_id | BIGINT | 〇 | IX3, IX8b | ID quản lý chi nhánh (FK) | JACd (mã nông hiệp) | JACd (mã JA 10 chữ số) của denshiban = kanri_shiten_code của cloud. |
| 4 | shiten_id | BIGINT | 〇 | IX4 | ID chi nhánh (FK) | – | Bản điện tử không có khái niệm chi nhánh → đặt NULL. |
| 5 | kumiaiin_code | VARCHAR(20) | | IX5, IX7b, IX8c | Mã tổ viên (cho phép chuỗi rỗng) | – | Đặt NULL. |
| 6 | denshi_kaiin_id | BIGINT | 〇 | | ID hội viên bản điện tử | id | Lấy nguyên. |
| 7 | dokusya_shubetsu | INTEGER | | | Loại độc giả (1: báo giấy / 2: điện tử / 3: đọc song song) | ※ Xác định qua `paper_permission_dt` (ngày duyệt đọc song song) | Nếu `paper_permission_dt != null` → 3 (đọc song song); nếu `paper_permission_dt = null` → 2 (điện tử). |
| 8 | tetsuzuki_shurui | INTEGER | | | Loại thủ tục (0: hủy / 1: mới) | ※ Xác định qua `status` | `status = 9` (giải ước) → 0 (hủy); `status = 0/1/3` (mới / đọc lại / mới A) → 1 (mới); `status = 2` (thay đổi) → 1 (mới). |
| 9 | denshi_dokusya_shubetsu | INTEGER | 〇 | | Loại độc giả điện tử (0: miễn phí / 1: trả phí) | member_type (loại hội viên) | `member_type` 1 (miễn phí) → 0; 2 (trả phí) → 1. |
| 10 | shimei_sei | VARCHAR(50) | | | Họ | first_name | Lấy nguyên. |
| 11 | shimei_mei | VARCHAR(50) | | | Tên | last_name | Lấy nguyên. |
| 12 | shimei_kana_sei | VARCHAR(100) | | | Họ (kana) | first_kana | Lấy nguyên. |
| 13 | shimei_kana_mei | VARCHAR(100) | | | Tên (kana) | last_kana | Lấy nguyên. |
| 14 | dokusya_busu | INTEGER | | | Số bản đặt | – | View không có số bản. Bản điện tử cố định 1 hợp đồng = 1 bản. |
| 15 | yubin_no | VARCHAR(7) | | | Mã bưu điện | zip1 + zip2 | Nối `zip1` (3 số đầu) + `zip2` (4 số sau). Thống nhất không có dấu gạch ngang. |
| 16 | todofuken_code | VARCHAR(2) | | | Mã tỉnh/thành | pref_id (tỉnh dùng để đặt báo) | Chuyển đổi từ `pref_id` sang mã tỉnh/thành của cloud. |
| 17 | shikuchoson | VARCHAR(100) | | | Thành phố/quận/huyện | addr | Lấy nguyên. |
| 18 | chome_banchi | VARCHAR(100) | | | Số nhà/khu phố | city | Lấy nguyên. |
| 19 | tatemono_mei | VARCHAR(100) | | | Tên tòa nhà (cho phép rỗng) | building | Lấy nguyên. |
| 20 | renrakusaki_1 | VARCHAR(15) | | | Liên lạc 1 (cho phép rỗng) | tel1 | Lấy nguyên. |
| 21 | renrakusaki_2 | VARCHAR(15) | | | Liên lạc 2 (cho phép rỗng) | tel2 | Lấy nguyên. `tel3` không sử dụng. |
| 22 | email | VARCHAR(100) | | | Email (cho phép rỗng) | email | Lấy nguyên. |
| 23 | mail_magazine_flg | INTEGER | | | Mail magazine (0: không gửi / 1: có gửi) | melmaga | `melmaga` 0/1 — giá trị trùng khớp với cloud, không cần đổi. |
| 24 | birth_year | INTEGER | 〇 | | Năm sinh (dương lịch) | birthyear | Lấy nguyên. `birthmonth` / `birthday` không đồng bộ. |
| 25 | gender | INTEGER | 〇 | | Giới tính (1: nam / 2: nữ / 9: không trả lời) | sex | `sex` 0 (nữ) → 2; 1 (nam) → 1; bỏ trống → 9 (không trả lời). |
| 26 | haitatsu_same_flg | BOOLEAN | | | Địa chỉ giao báo (TRUE: giống độc giả) | – | Nếu là điện tử → TRUE; nếu đọc song song → FALSE. |
| 27 | haitatsu_yubin_no | VARCHAR(7) | | | Mã bưu điện giao báo (cho phép rỗng) | paper_zip | TRUE → chuỗi rỗng; FALSE → lấy `paper_zip`. |
| 28 | haitatsu_todofuken_code | VARCHAR(2) | | | Mã tỉnh giao báo (cho phép rỗng) | paper_pref_id | TRUE → chuỗi rỗng; FALSE → lấy `paper_pref_id`, cần chuyển đổi giống `pref_id`. |
| 29 | haitatsu_shikuchoson | VARCHAR(100) | | | TP/quận/huyện giao báo | paper_addr | TRUE → rỗng; FALSE → `paper_addr`. |
| 30 | haitatsu_chome_banchi | VARCHAR(100) | | | Số nhà/khu phố giao báo | paper_city | TRUE → rỗng; FALSE → `paper_city`. |
| 31 | haitatsu_tatemono_mei | VARCHAR(100) | | | Tên tòa nhà giao báo | paper_building | TRUE → rỗng; FALSE → `paper_building`. |
| 32 | haitatsu_renrakusaki_1 | VARCHAR(15) | | | Liên lạc 1 nơi giao báo | – | View không có SĐT giao báo → chuỗi rỗng. |
| 33 | haitatsu_renrakusaki_2 | VARCHAR(15) | | | Liên lạc 2 nơi giao báo | – | Như trên → chuỗi rỗng. |
| 34 | haitatsu_shimei_sei | VARCHAR(50) | | | Họ người nhận báo (kanji) | – | View không có tên người nhận → chuỗi rỗng. |
| 35 | haitatsu_shimei_mei | VARCHAR(50) | | | Tên người nhận báo (kanji) | – | Như trên → chuỗi rỗng. |
| 36 | haitatsu_shimei_kana_sei | VARCHAR(100) | | | Họ người nhận (kana) | – | Như trên → chuỗi rỗng. |
| 37 | haitatsu_shimei_kana_mei | VARCHAR(100) | | | Tên người nhận (kana) | – | Như trên → chuỗi rỗng. |
| 38 | hanbaiten_id | BIGINT | | IX6 | ID đại lý bán báo (FK) | ShopCd ※chỉ đọc song song | `ShopCd` → tra `m_hanbaiten` để đổi ra ID. Chỉ áp dụng cho đọc song song. Điện tử đơn thuần dùng "đại lý giả" (ダミー販売店). |
| 39 | tanka_id | BIGINT | | | ID đơn giá (FK `m_tanka`) — chỉ đơn giá phí đặt báo (`tanka_type=1`) | – | Khi đồng bộ đặt NULL. Nếu là điện tử + phương thức thanh toán là JA thu tiền → bắt buộc đăng ký đơn giá tại màn hình đăng ký thông tin độc giả khi phê duyệt. |
| 40 | yubin_kubun | VARCHAR(1) | | | Phân loại gửi bưu điện (0: không / 1: gửi), DEFAULT 0 | – | Để giá trị là 0 (vì bên denshiban không có trường lưu thông tin này). |
| 41 | shiharai_hoho | INTEGER | | | Phương thức thanh toán (1: rút tài khoản / 2: thu tiền mặt / 3: chuyển khoản / 4: cơ sở JA / 5: trừ lương / 6: thẻ tín dụng / 9: khác) | ※ Xác định qua `payment_id` | Xác định theo `payment_id`: JA thu tiền → 1 (rút tài khoản); miễn phí → 9 (khác); thanh toán thẻ → 6 (thẻ tín dụng). |
| 42 | dokusyaryo_shiharai_cycle | INTEGER | 〇 | | Chu kỳ thanh toán phí đặt báo (số tháng) | payment_cycle | Lấy nguyên. |
| 43 | bank_branch_code | VARCHAR(3) | | | Mã chi nhánh tài khoản rút tiền | – | View không có thông tin tài khoản → chuỗi rỗng. |
| 44 | bank_branch_name | VARCHAR(100) | | | Tên chi nhánh tài khoản rút tiền | – | Như trên → chuỗi rỗng. |
| 45 | hikiotoshi_yokin_shubetsu | INTEGER | 〇 | | Loại tài khoản rút tiền (1: thường / 2: vãng lai) | – | Như trên → NULL. |
| 46 | hikiotoshi_koza_no | VARCHAR(10) | | | Số tài khoản rút tiền | – | Như trên → chuỗi rỗng. |
| 47 | hikiotoshi_koza_meigi | VARCHAR(50) | | | Tên chủ tài khoản rút tiền | – | Như trên → chuỗi rỗng. |
| 48 | dokusyaso_bunrui | VARCHAR(50) | | | Phân loại tầng lớp độc giả (nhiều giá trị, phân tách bằng dấu phẩy) | profession + others_profession | Map `profession` (0: nông dân / 1: cán bộ nhân viên JA / 2: doanh nghiệp・tổ chức / 3: học sinh sinh viên / 999: khác) sang phân loại tầng lớp độc giả. Nếu `others_profession != null` thì có giá trị 999. |
| 49 | nogyosya_bunrui | VARCHAR(50) | | | Phân loại nông dân (nhiều giá trị, phân tách bằng dấu phẩy) | products + others_products | Map `products` (0: gạo / 1: rau / 2: trái cây / 3: hoa / 4: chăn nuôi / 5: bò sữa / 999: khác — nhiều giá trị phân tách bằng dấu phẩy) sang phân loại nông dân. Nếu `others_products != null` thì có giá trị 999. |
| 50 | shoki_dokusya_kaishi_date | DATE | | | Ngày bắt đầu đặt báo lần đầu (giữ nguyên cả khi có thay đổi) | activated_at | Giữ giá trị lần đầu, không cập nhật về sau. |
| 51 | dokusya_kaishi_date | DATE | | | Ngày bắt đầu đặt báo | activated_at | Lấy nguyên. |
| 52 | dokusya_chushi_date | DATE | 〇 | | Ngày dừng đặt báo | deleted_at (ngày xóa) | Đặt khi hủy (`status = 9`). |
| 53 | joho_henko_tekiyo_date | DATE | 〇 | | Ngày áp dụng thay đổi thông tin độc giả | ※ Khi đồng bộ | Lấy bằng ngày hiện tại khi thực hiện đồng bộ. |
| 54 | seikyu_kaishi_month | VARCHAR(6) | | | Tháng bắt đầu tính phí (YYYYMM) | payment_start_ym | `payment_start_ym` (định dạng YYYYMM). |
| 55 | biko | TEXT | | | Ghi chú (cho phép rỗng) | remarks1〜5 | Nối `remarks1`〜`remarks5`, phân tách bằng ký tự xuống dòng. |
| 56 | rireki_no | INTEGER | | | Số lịch sử (số hiệu lịch sử mới nhất) | – | Cloud quản lý lịch sử. Đồng bộ lần đầu = 1; mỗi lần cập nhật +1. |
| 57 | denshi_shonin_status | INTEGER | 〇 | | Trạng thái phê duyệt đăng ký điện tử<br>NULL: ngoài luồng Web (JA đăng ký trực tiếp…)<br>0: chưa duyệt (chờ duyệt)<br>1: đã duyệt<br>2: từ chối | approval | `approval` 0 (chưa duyệt) → 0; 1 (đã duyệt) → 1; 2 (từ chối) → 2; 9 (ngoài đối tượng: nội bộ・thẻ tín dụng・miễn phí) → NULL. |
| 58 | deleted_at | TIMESTAMPTZ | 〇 | | Cờ xóa (DEFAULT NULL) | – | Trường hệ thống (xóa mềm). Khi hủy thì bật cờ xóa. |
| 59 | created_at | TIMESTAMPTZ | | | Ngày giờ tạo | – | Ngày giờ hệ thống lúc đồng bộ. |
| 60 | created_by | VARCHAR(50) | | | Người tạo | – | Đồng bộ = user hệ thống. |
| 61 | updated_at | TIMESTAMPTZ | | | Ngày giờ cập nhật | – | Ngày giờ hệ thống lúc đồng bộ. |
| 62 | updated_by | VARCHAR(50) | | | Người cập nhật | – | Đồng bộ = user hệ thống. |

### Index của `t_dokusya`

| # | Tên index | Cột | Loại | Mục đích |
| --- | --- | --- | --- | --- |
| 1 | PK_t_dokusya | dokusya_id | PK | Khóa chính |
| 2 | IX_t_dokusya_ja_id | ja_id | | Tìm theo JA |
| 3 | IX_t_dokusya_kanri_shiten_id | kanri_shiten_id | | Tìm theo quản lý chi nhánh |
| 4 | IX_t_dokusya_shiten_id | shiten_id | | Tìm theo chi nhánh |
| 5 | IX_t_dokusya_kumiaiin_code | kumiaiin_code | | Tìm theo mã tổ viên |
| 6 | IX_t_dokusya_hanbaiten_id | hanbaiten_id | | Tìm theo đại lý |
| 7 | IX_t_dokusya_ja_kumiaiin | ja_id, kumiaiin_code | | Tìm tổ hợp mã tổ viên |
| 8 | IX_t_dokusya_hierarchy | ja_id, kanri_shiten_id, shiten_id | | Tìm theo phân cấp |

---

## 2. Request CREATE — tạo độc giả điện tử tại cloud và đồng bộ sang denshiban

| Logic | Tên trường (cloud) | Tên trường (denshiban) | Kiểu | Bắt buộc | Validation | Ý nghĩa | Ví dụ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | timestamp | long | 〇 | Số nửa chiều rộng, tối đa 10 chữ số | Số giây trôi qua tính từ 1970/01/01 theo chuẩn UTC (10 chữ số) | 1776852008 |
| | | action_kbn | String | 〇 | Chỉ nhận các phân loại xử lý hợp lệ | Phân loại xử lý (処理区分) | create |
| | kanri_shiten_code | jacd_execute | String | 〇 | Số nửa chiều rộng, đúng 10 chữ số | JA thực hiện (実行JA) | 0 |
| | shimei_sei | first_name | String | 〇 | Tối đa 255 ký tự | Họ (姓) | 山田 |
| | shimei_mei | last_name | String | 〇 | Tối đa 255 ký tự | Tên (名) | 太郎 |
| | shimei_kana_sei | first_kana | String | 〇 | Hiragana, tối đa 255 ký tự | Họ (hiragana) | やまだ |
| | shimei_kana_mei | last_kana | String | 〇 | Hiragana, tối đa 255 ký tự | Tên (hiragana) | たろう |
| | yubin_no | zip | String | 〇 | Số nửa chiều rộng, tối đa 7 chữ số | Mã bưu điện, không có dấu gạch ngang | 1108722 |
| | todofuken_code | pref_id | String | 〇 | Số nửa chiều rộng, tối đa 2 chữ số | Mã tỉnh/thành (tương ứng `cmsDB.areas.id` của tên tỉnh) | 13 ※Tokyo |
| | shikuchoson | addr | String | 〇 | Tối đa 255 ký tự | Thành phố/quận/huyện (市町村郡) | 台東区秋葉原 |
| | chome_banchi | city | String | 〇 | Tối đa 255 ký tự | Khu phố/số nhà (丁目番地) | 3-2 |
| | tatemono_mei | building | String | | Tối đa 255 ký tự | Tên tòa nhà (建物名) | 日本農業新聞社ビル |
| | renrakusaki_1 | tel | String | 〇 | Số nửa chiều rộng, tối đa 13 chữ số | Số điện thoại | 0362815801 |
| | email | email | String | 〇 | Chữ/số/ký hiệu nửa chiều rộng, tối đa 255 ký tự | Địa chỉ email | xxxx@agrinews.co.jp |
| | | subscribe_flg | String | 〇 | Số nửa chiều rộng, 1 chữ số | Tình trạng đặt báo giấy (0: chưa đặt / 1: có đặt) | 0 |
| | | branch | String | | Tối đa 40 ký tự | Chi nhánh・chi sở (支店・支所) | XXX店 |
| biko (dòng 1) | biko | remarks1 | String | | Tối đa 255 ký tự | Ghi chú 1 | (tự do) |
| biko (dòng 2) | biko | remarks2 | String | | Tối đa 255 ký tự | Ghi chú 2 | (tự do) |
| biko (dòng 3) | biko | remarks3 | String | | Tối đa 255 ký tự | Ghi chú 3 | (tự do) |
| biko (dòng 4) | biko | remarks4 | String | | Tối đa 255 ký tự | Ghi chú 4 | (tự do) |
| biko (dòng 5 trở đi) | biko | remarks5 | String | | Tối đa 255 ký tự | Ghi chú 5 | (tự do) |
| | mail_magazine_flg | melmaga | String | 〇 | Số nửa chiều rộng, 1 chữ số | Nhận mail magazine (0: không muốn / 1: có muốn) | 0 |
| | dokusyaso_bunrui | profession | String | 〇 | Số nửa chiều rộng, tối đa 3 chữ số | Nghề nghiệp (0: nông dân / 1: cán bộ nhân viên nhóm JA / 2: doanh nghiệp・tổ chức / 3: học sinh sinh viên / 999: khác) | 0 |
| | | profession_and_ja | String | | Số nửa chiều rộng, 1 chữ số | Cờ "thuộc nhóm JA" (0: không / 1: có)<br>※Chỉ đặt được khi `profession = 0` (nông dân) | 0 |
| | | profession_and_agri | String | | Số nửa chiều rộng, 1 chữ số | Cờ "liên quan nông nghiệp" (0: không / 1: có)<br>※Chỉ đặt được khi `profession = 2` (doanh nghiệp・tổ chức) | 0 |
| (có giá trị là その他) thì truyền lên là 会社員 | dokusyaso_bunrui | others_profession | String | | Tối đa 255 ký tự | Nghề nghiệp khác ※Chỉ đặt được khi `profession = 999` (khác) | 会社員 |
| | nogyosya_bunrui | products | String | | Số nửa chiều rộng, tối đa 3 chữ số | Nông・súc sản phẩm (0: gạo / 1: rau / 2: trái cây / 3: hoa / 4: chăn nuôi / 5: bò sữa / 999: khác).<br>Chọn nhiều thì phân tách bằng dấu phẩy `,`.<br>※Chỉ đặt được khi `profession = 0` (nông dân) | 0,1 |
| (có giá trị là その他) thì truyền lên là その他の農畜産物 | nogyosya_bunrui | others_products | String | | Tối đa 255 ký tự | Nông・súc sản phẩm khác.<br>※Chỉ đặt được khi `products = 999` (khác) | その他の農畜産物 |
| | birth_year | birthyear | String | | Số nửa chiều rộng, đúng 4 chữ số | Năm sinh | 1990 |
| Nếu `gender = 2` (nữ) → 0; `gender = 1` (nam) → 1; `gender = 9` hoặc bỏ trống → 9 (không trả lời). | gender | sex | String | | Số nửa chiều rộng, 1 chữ số | Giới tính (0: nữ / 1: nam / để trống: không trả lời) | 0 |
| định dạng YYYYMM | seikyu_kaishi_month | payment_start | String | 〇 | Số nửa chiều rộng, 1 chữ số | Ngày bắt đầu đặt báo (0: hôm nay / 1: ngày 1 tháng sau) | 0 |

---

## 3. Request UPDATE — cập nhật dữ liệu tại cloud và đồng bộ sang denshiban

| Logic | Tên trường (cloud) | Tên trường (denshiban) | Kiểu | Bắt buộc | Validation | Ý nghĩa | Ví dụ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | timestamp | long | 〇 | Số nửa chiều rộng, tối đa 10 chữ số | Số giây trôi qua từ 1970/01/01 theo chuẩn UTC (10 chữ số) | 1776852008 |
| | | action_kbn | String | 〇 | Chỉ nhận phân loại xử lý hợp lệ | Phân loại xử lý (処理区分) | update |
| | | jacd_execute | String | 〇 | Số nửa chiều rộng, đúng 10 chữ số | JA thực hiện (実行JA) | 0 |
| | denshi_kaiin_id | id | String | 〇 | Số nửa chiều rộng | ID hội viên (会員ID) | 12345 |
| | shimei_sei | first_name | String | | Tối đa 255 ký tự | Họ (姓) | 山田 |
| | shimei_mei | last_name | String | | Tối đa 255 ký tự | Tên (名) | 太郎 |
| | shimei_kana_sei | first_kana | String | | Hiragana, tối đa 255 ký tự | Họ (hiragana) | やまだ |
| | shimei_kana_mei | last_kana | String | | Hiragana, tối đa 255 ký tự | Tên (hiragana) | たろう |
| | yubin_no | zip | String | | Số nửa chiều rộng, tối đa 7 chữ số | Mã bưu điện, không có dấu gạch ngang | 1108722 |
| | todofuken_code | pref_id | String | | Số nửa chiều rộng, tối đa 2 chữ số | Mã tỉnh/thành (tương ứng `cmsDB.areas.id` của tên tỉnh) | 13 ※Tokyo |
| | shikuchoson | addr | String | | Tối đa 255 ký tự | Thành phố/quận/huyện (市町村郡) | 台東区秋葉原 |
| | chome_banchi | city | String | | Tối đa 255 ký tự | Khu phố/số nhà (丁目番地) | 3-2 |
| | tatemono_mei | building | String | | Tối đa 255 ký tự | Tên tòa nhà (建物名) | 日本農業新聞社ビル |
| | renrakusaki_1 | tel | String | | Số nửa chiều rộng, tối đa 13 chữ số | Số điện thoại | 0362815801 |
| | email | email | String | | Chữ/số/ký hiệu nửa chiều rộng, tối đa 255 ký tự | Địa chỉ email | xxxx@agrinews.co.jp |
| | | subscribe_flg | String | | Số nửa chiều rộng, 1 chữ số | Tình trạng đặt báo giấy (0: chưa đặt / 1: có đặt) | 0 |
| | kanri_shiten_code | jacd | String | | Số nửa chiều rộng, đúng 10 chữ số | JA trực thuộc (所属JA) | 0 |
| | | branch | String | | Tối đa 40 ký tự | Chi nhánh・chi sở (支店・支所) | XXX店 |
| biko (dòng 1) | biko | remarks1 | String | | Tối đa 255 ký tự | Ghi chú 1 | (tự do) |
| biko (dòng 2) | biko | remarks2 | String | | Tối đa 255 ký tự | Ghi chú 2 | (tự do) |
| biko (dòng 3) | biko | remarks3 | String | | Tối đa 255 ký tự | Ghi chú 3 | (tự do) |
| biko (dòng 4) | biko | remarks4 | String | | Tối đa 255 ký tự | Ghi chú 4 | (tự do) |
| biko (dòng 5 trở đi) | biko | remarks5 | String | | Tối đa 255 ký tự | Ghi chú 5 | (tự do) |
| | mail_magazine_flg | melmaga | String | | Số nửa chiều rộng, 1 chữ số | Nhận mail magazine (0: không muốn / 1: có muốn) | 0 |
| | dokusyaso_bunrui | profession | String | | Số nửa chiều rộng, tối đa 3 chữ số | Nghề nghiệp (0: nông dân / 1: cán bộ nhân viên nhóm JA / 2: doanh nghiệp・tổ chức / 3: học sinh sinh viên / 999: khác) | 0 |
| | | profession_and_ja | String | | Số nửa chiều rộng, 1 chữ số | Cờ "thuộc nhóm JA" (0: không / 1: có)<br>※Chỉ đặt được khi `profession = 0` (nông dân) | 0 |
| | | profession_and_agri | String | | Số nửa chiều rộng, 1 chữ số | Cờ "liên quan nông nghiệp" (0: không / 1: có)<br>※Chỉ đặt được khi `profession = 2` (doanh nghiệp・tổ chức) | 0 |
| (có giá trị là その他) thì truyền lên là 会社員 | dokusyaso_bunrui | others_profession | String | | Tối đa 255 ký tự | Nghề nghiệp khác ※Chỉ đặt được khi `profession = 999` (khác) | 会社員 |
| | nogyosya_bunrui | products | String | | Số nửa chiều rộng, tối đa 3 chữ số | Nông・súc sản phẩm (0: gạo / 1: rau / 2: trái cây / 3: hoa / 4: chăn nuôi / 5: bò sữa / 999: khác)<br>Chọn nhiều thì phân tách bằng dấu phẩy `,`<br>※Chỉ đặt được khi `profession = 0` (nông dân) | 0,1 |
| (có giá trị là その他) thì truyền lên là その他の農畜産物 | nogyosya_bunrui | others_products | String | | Tối đa 255 ký tự | Nông・súc sản phẩm khác<br>※Chỉ đặt được khi `products = 999` (khác) | その他の農畜産物 |
| | birth_year | birthyear | String | | Số nửa chiều rộng, đúng 4 chữ số | Năm sinh | 1990 |
| Nếu `gender = 2` (nữ) → 0; `gender = 1` (nam) → 1; `gender = 9` hoặc bỏ trống → 9 (không trả lời). | gender | sex | String | | Số nửa chiều rộng, 1 chữ số | Giới tính (0: nữ / 1: nam / để trống: không trả lời) | 0 |
| | | notify_flg | String | 〇 | Số nửa chiều rộng, 1 chữ số | Cờ thông báo cho hội viên (0: không thông báo / 1: có thông báo) | 0 |

---

## 4. QnA / Vấn đề tồn đọng

### Hiển thị

**1. Thông báo 紙版購読状況　有り (có đăng ký đọc báo giấy)**

- Hiện tại hệ thống cloud không có trường nào lưu thông tin của `subscribe_flg`.
- **QnA**: Chúng tôi đang hiểu với 1 record của độc giả đọc báo điện tử mà có hiển thị 紙版購読状況　有り thì chứng tỏ trong `t_dokusya` có 1 record khác lưu thông tin độc giả này đăng ký đọc báo giấy, như vậy là có 2 bản ghi (1 đọc báo giấy, 1 đọc báo điện tử) có đúng không? Nếu đúng như vậy thì dựa vào trường nào trong `t_dokusya` để phán định logic này? Nếu không đúng thì vui lòng cung cấp thêm thông tin về logic này.

### Đồng bộ

**1. `pref_id` → `todofuken_code`**

- **QnA**: Hiện tại ở cloud `todofuken_code` đang được lưu đánh số từ 01 → 47. Do vậy ở bên denshiban đang được lưu `pref_id` như thế nào đối với mỗi tỉnh? *(đã map đúng)*

**2. `payment_id`**

- **QnA**: Hiện tại ở hệ thống denshiban đang lưu các giá trị của `payment_id` như thế nào ứng với mỗi phương thức thanh toán?

**3. `bank_branch_code` và `bank_branch_name`**

- **QnA**: Hiện tại ở hệ thống cloud khi tạo thông tin độc giả đọc báo giấy với phương thức thanh toán là 1:口座引落 (rút tài khoản), ứng với `payment_id` là JA thu tiền. Hai trường trên chúng tôi đang thực hiện required. Nhưng các trường ở bảng `User` của denshiban đang không có trường nào lưu thông tin ứng với 2 trường này. Do vậy có phải 2 trường này đối với độc giả đọc báo điện tử và phương thức thanh toán là 1:口座引落 thì chúng tôi sửa lại thành không require đúng không? (Điều này sẽ ảnh hưởng đến màn hình SCR-020, vì 2 trường này không có giá trị thì sẽ không có thông tin thanh toán đối với từng `bank_shiten`.)

**4. `created_by` và `updated_by`**

- Đồng bộ = user hệ thống???
- Nhiều người cùng đăng nhập thì ai là người đồng bộ? (Ghi là `SYSTEM`??)

**6. Ở request create**

- Có trường `branch` cần truyền dữ liệu. Trường này lấy từ đâu??

**7.** `dokusyaso_bunrui` (có giá trị là その他) thì truyền lên `others_profession = 会社員` có đúng không khi tạo create request đồng bộ từ cloud sang denshiban?

**8.** `nogyosya_bunrui` (có giá trị là その他) thì truyền lên `others_products = 会社員` có đúng không khi tạo create request đồng bộ từ cloud sang denshiban?

**9.** Hiện tại `branch` của denshiban sẽ ứng với `shiten_id` (suy ra từ `branch = shiten_code`) có đúng không?

**10. `profession_and_ja` và `profession_and_agri`**

- Về 2 trường dữ liệu này khi thực hiện đồng bộ dữ liệu từ cloud sang denshiban hiện tại chúng tôi chưa có thông tin gì về logic dữ liệu của 2 trường này và trong bảng `t_dokusya` cũng chưa có trường nào lưu dữ liệu của 2 trường với ý nghĩa tương ứng. Chúng tôi nên dựa vào trường dữ liệu nào và logic là gì để quyết định dữ liệu được truyền lên?

**11.** Khi độc giả điện tử được tạo ra ở cloud và thực hiện đồng bộ sang denshiban, trường `denshi_kaiin_id` của `t_dokusya` sẽ chưa có dữ liệu, do đó khi nhận dữ liệu về sẽ không thể biết chính xác bản ghi nào để thực hiện chỉnh sửa dữ liệu. Do đó chúng tôi có thể thực hiện khởi tạo dữ liệu của `denshi_kaiin_id` từ phía cloud và gửi sang denshiban có được không?
