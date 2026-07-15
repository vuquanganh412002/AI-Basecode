# No58 Chi tiết — Bản dịch tiếng Việt

> Nguồn: sheet `No58詳細` trong `【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_Q&A表.xlsx`

---

## 【1】Về việc kiểm tra hợp lệ (validation) của Ngày ngừng đọc (Chushi_date)

**1-1.** Việc bổ sung validation thì bản thân không có vấn đề gì. Tuy nhiên, dấu bất đẳng thức sẽ khác nhau theo từng phiên bản (bản giấy / bản điện tử), và nguyên tắc thống nhất là **"Ngày áp dụng < Ngày hiệu lực hủy (không cho phép ngày áp dụng từ ngày hiệu lực trở đi)"**. Ngày hiệu lực hủy: bản giấy = ngay chính ngày ngừng đọc, bản điện tử = ngày kế tiếp ngày ngừng đọc (đã được xác định). Điều này có quan hệ mặt-trái-mặt-phải với điều kiện hiệu lực của batch xử lý ngừng (bản giấy: ngày ngừng ≤ ngày xử lý / bản điện tử: ngày ngừng < ngày xử lý). (Xét từ phía "thay đổi": "lấy ngày hiệu lực làm mốc, trước ngày đó thì được sửa, từ ngày đó trở đi thì không được sửa"; xét từ phía "batch": "lấy ngày hiệu lực làm mốc, từ ngày đó trở đi là trạng thái đã hủy" — cả hai cùng chỉ về một đường ranh giới.)

Về hình dung khái niệm: cách chỉ định ngày ngừng đọc và thời điểm hiệu lực khác nhau giữa bản giấy và bản điện tử.

- **Bản giấy**: có thể chỉ định bất kỳ ngày nào từ ngày hôm sau trở đi, theo định dạng ngày (yyyy/MM/dd). Ví dụ: bản giấy vào ngày 7/1 đặt ngày ngừng đọc là 7/2, thì tại thời điểm 7/1 vẫn còn ở trạng thái đang đọc, và đến ngày hiệu lực (ngay chính ngày ngừng đọc) là 7/2 thì chuyển sang trạng thái đã hủy (= ngày đầu tiên báo không còn được giao).
- **Bản điện tử**: chỉ có thể chỉ định theo định dạng "cuối tháng M", và chỉ chọn được cuối tháng từ cuối tháng hiện tại trở đi (kể cả đúng cuối tháng hiện tại cũng được chỉ định). Ví dụ: bản điện tử vào ngày 7/1 đặt ngày ngừng đọc là "cuối tháng 7", thì ngay chính ngày ngừng đọc (7/31) vẫn là trạng thái đang đọc còn xem được bài, và đến ngày hiệu lực (ngày kế tiếp ngày ngừng đọc) là 8/1 thì chuyển sang trạng thái đã hủy.

| Phiên bản | Validation khi đặt ngày ngừng đọc | Ghi chú (kiểm tra hai chiều ở cả phía ngày hiệu lực và phía đăng ký thay đổi) |
|---|---|---|
| Bản giấy | `Chushi_date > Max(joho_henko_tekiyo_date)` ※đúng như đề xuất | Ngày hiệu lực = ngay chính ngày ngừng đọc (ngày đầu ngừng giao). Không cho phép thay đổi vào ngay chính ngày ngừng đọc. Phía đăng ký thay đổi cũng cài cùng điều kiện (kiểm tra hai chiều): **Ngày áp dụng < Ngày ngừng đọc** |
| Bản điện tử | `Chushi_date ≧ Max(joho_henko_tekiyo_date)` | Ngày hiệu lực = ngày kế tiếp ngày ngừng đọc. Ngay chính ngày ngừng đọc là ngày đọc cuối cùng nên vẫn cho phép thay đổi. Phía đăng ký thay đổi cũng cài cùng điều kiện (kiểm tra hai chiều): **Ngày áp dụng ≤ Ngày ngừng đọc** |

**Điều kiện chung:** ① Đối tượng của Max chỉ tính các bản ghi còn hiệu lực (`torikeshi_flg=0`; loại trừ các bản ghi đã bị hủy bỏ). ② So sánh thực hiện theo đơn vị ngày. ③ Dùng kèm với validation cận dưới (bản giấy = hôm nay < ngày ngừng đọc, định dạng yyyy/MM/dd / bản điện tử = định dạng "cuối tháng M", cuối tháng hiện tại ≤ ngày ngừng đọc ⟨kể cả đúng cuối tháng cũng chỉ định được⟩). ④ Bản ghi thay đổi cửa hàng bán (販売店変更) cũng có `joho_henko_tekiyo_date` nên đương nhiên nằm trong đối tượng của Max.

**Lý do bản điện tử không thể dùng dấu ">":** Với bản điện tử đã xác định rằng "có thể chỉ định ngày ngừng đọc là cuối tháng hiện tại kể cả vào đúng ngày cuối tháng", "thay đổi thông tin thì mọi mục đều phản ánh ngay trong ngày", và "không dùng được chức năng hủy bỏ lịch sử". Ví dụ: sau khi vào ngày 7/31 (cuối tháng) thay đổi ngay trong ngày địa chỉ email của độc giả bản điện tử (ngày áp dụng = 7/31), rồi tiếp nhận "hủy vào cuối tháng 7"; nếu dùng ">", thì 7/31 > 7/31 là sai nên không chỉ định được cuối tháng 7, mà bản điện tử lại không dùng được hủy bỏ (đỏ) nên không có cách nào vòng tránh, dẫn đến bị buộc kéo dài đến cuối tháng 8. Nếu dùng "≧" thì thay đổi có hiệu lực vào ngày đọc cuối cùng (7/31), còn việc hủy phát sinh hiệu lực vào ngày hôm sau (8/1), khớp nhau.

**1-2. Trường hợp muốn đặt ngày ngừng đọc trước Max(ngày áp dụng):** Đúng vậy, hình dung "hủy bỏ (đỏ) → đặt ngày ngừng đọc" là chính xác. Tuy nhiên bổ sung 2 điểm: ① Vận hành này **chỉ áp dụng cho bản giấy**. Hủy bỏ lịch sử (đỏ) chỉ giới hạn cho bản giấy (bản điện tử có xử lý liên kết sang hệ thống bản điện tử nên không hủy bỏ được), do đó với bản điện tử khi Max là ngày tương lai thì phải chọn ngày ngừng đọc là cuối tháng từ Max trở đi, hoặc chờ đến khi ngày áp dụng đó tới. ② Việc hủy bỏ thực hiện lần lượt từ cuối chuỗi ngày áp dụng (LIFO). Ngoài ra, các bản ghi đã tới (đã đến hạn) thì không hủy bỏ được, nhưng do cận dưới của ngày ngừng đọc (bản giấy = từ ngày hôm sau trở đi) nên luôn thỏa "ngày ngừng đọc > Max đã tới", vì vậy block này chỉ thực sự phát sinh khi tồn tại bản ghi có ngày tương lai.

**1-3. Chặn thao tác ngừng trùng lặp:** Đúng, hãy chặn (hiện trạng "có thể thao tác ngừng liên tiếp" cần được sửa). Trong khi vẫn còn tồn tại thiết lập ngày ngừng đọc còn hiệu lực (chưa bị hủy bỏ), và sau khi việc hủy đã thành lập, thì không cho phép thao tác ngừng mới. "Trùng lặp" đang giả định có 2 pattern sau:

- **Case A (đã có đặt lịch hủy mà lại thao tác ngừng thêm):** Ngày 7/1 đặt cho độc giả X ngày ngừng đọc = 8/1 (lịch hủy đã thành lập). Sau đó ngày 7/10 lại định đặt cho cùng độc giả X ngày ngừng đọc = 9/1. Nếu chỉ nhìn `Chushi_date(9/1) > Max(ngày áp dụng)` thì thỏa điều kiện nên lọt qua, nhưng đã không nhìn thấy trạng thái đã tồn tại ngày ngừng đọc 8/1. Hãy chặn điều này; nếu muốn đổi sang 9/1 thì phải hủy đặt lịch 8/1 (bản giấy: hủy bỏ đỏ) rồi thiết lập lại.
- **Case B (thao tác ngừng thêm sau khi việc hủy đã thành lập):** Ngày 8/1 batch ban đêm đã tạo và phản ánh bản ghi hủy (độc giả X đã hủy). Ở trạng thái đó lại nhầm thực hiện thao tác "ngừng" thêm lần nữa. Thao tác hủy đối với độc giả không còn đọc thì không thành lập nên phải chặn. Nếu muốn khôi phục độc giả thì dùng luồng đọc lại (再購読); nếu bản thân việc hủy là sai thì (khi còn trước lúc thành lập) chỉ có "hủy đặt lịch" mới là biện pháp đúng; còn "thao tác ngừng chồng lên" sau khi đã thành lập thì nghiệp vụ không giả định tới.

Về cách cài đặt kiểm tra: **tách riêng với** phán định `Chushi_date > Max(ngày áp dụng)` — nếu bản ghi còn hiệu lực hiện tại của độc giả đối tượng (bản cuối cùng có `torikeshi_flg=0`) đã có `chushi_date` được thiết lập, **hoặc** `kaiyaku_flg=TRUE` (đã hủy thành lập), thì hãy báo lỗi và chặn. Khi muốn thay đổi ngày ngừng đọc: bản giấy = hủy đặt lịch (hủy bỏ đỏ bản ghi đã đặt ngày ngừng đọc; được phép cho đến trước khi ngày ngừng đọc tới) → thiết lập lại / bản điện tử = không thể thay đổi (vì đồng thời với việc thiết lập sẽ liên kết ngay lịch hủy tương lai sang hệ thống bản điện tử. Bên trong bản cloud thực sự chuyển sang trạng thái hủy vào batch ban đêm của ngày kế tiếp ngày ngừng đọc — giống như các thay đổi khác — nhưng phía bản điện tử đã tiến hành xử lý như lịch hủy ngay từ thời điểm liên kết, nên không thể chỉ hủy riêng ở bản cloud). Khi muốn trở lại đọc sau khi việc hủy đã thành lập thì xử lý bằng luồng đọc lại. Sau khi đọc lại, do bản ghi cuối cùng mới (bản ghi đọc lại) trở thành còn hiệu lực nên không còn thuộc đối tượng chặn trùng lặp, và thao tác ngừng lại có thể thực hiện.

---

## 【2】Về phương thức tạo bản ghi ngừng độc giả (hủy)

Hãy thống nhất theo **spec của công ty chúng tôi = phương thức batch ban đêm thêm bản ghi**. Phương thức hiện hành của VTI như bảng dưới, có nhiều điểm khác biệt với các nội dung đã xác định, nên **không được áp dụng**.

Về hình dung khái niệm: cách chỉ định ngày ngừng đọc và thời điểm hiệu lực khác nhau giữa bản giấy và bản điện tử.

- **Bản giấy**: có thể chỉ định bất kỳ ngày nào từ ngày hôm sau trở đi, theo định dạng ngày (yyyy/MM/dd). Ví dụ: bản giấy vào ngày 7/1 đặt ngày ngừng đọc là 7/2, thì tại 7/1 vẫn đang đọc, đến ngày hiệu lực (ngay chính ngày ngừng đọc) là 7/2 thì chuyển sang trạng thái đã hủy (= ngày đầu tiên báo không còn được giao).
- **Bản điện tử**: chỉ chỉ định được theo "cuối tháng M", và chỉ chọn được cuối tháng từ cuối tháng hiện tại trở đi (kể cả đúng cuối tháng hiện tại). Ví dụ: bản điện tử vào 7/1 đặt ngày ngừng đọc "cuối tháng 7", thì ngay chính ngày ngừng đọc (7/31) vẫn đang đọc còn xem bài, đến ngày hiệu lực (ngày kế tiếp ngày ngừng đọc) là 8/1 thì chuyển sang trạng thái đã hủy.

Lấy ngày hiệu lực này làm mốc, số bản (部数) trở thành 0 kể từ ngày đó (như bảng dưới). Ngoài ra, loại thủ tục (手続種類) chuyển thành "hủy" **chỉ ở batch ban đêm**. Từ màn hình không thể thay đổi trực tiếp loại thủ tục; chỉ có thể thiết lập ngày ngừng đọc (bản điện tử cũng vậy — việc liên kết ngay sang hệ thống bản điện tử là "thông báo lịch hủy", còn loại thủ tục bên trong bản cloud vẫn là "mới" (新規) cho đến batch ban đêm của ngày kế tiếp ngày ngừng đọc).

| Quan điểm | Phương thức hiện hành VTI (không áp dụng) | Spec áp dụng (spec đã xác định của công ty) |
|---|---|---|
| Thời điểm tạo bản ghi | Tạo ngay bản ghi "đặt lịch ngừng" tại thời điểm thao tác ngừng | Batch ban đêm (xử lý hủy) lúc 0:05 của ngay chính ngày ngừng đọc (bản điện tử là ngày hôm sau) thêm 1 bản ghi hủy |
| `tetsuzuki_shurui` | Thay đổi 1→0 ngay tại thời điểm đăng ký | Vẫn giữ "mới" (1) cho đến khi batch xử lý. Không có chỉ định hủy qua màn hình/nhập Excel |
| `kodoku_busu` (số bản) | 0 | 0 (vì từ ngày hiệu lực batch ban đêm thêm bản ghi hủy, báo không được giao / bài không xem được). Mục này chốt đúng theo phương án VTI |
| Thuộc tính địa chỉ・cửa hàng bán・đơn giá v.v. | (không đề cập) | Kế thừa nguyên giá trị của bản ghi còn hiệu lực ngay trước đó (để xác định trong thông báo tăng giảm rằng việc đọc ở cửa hàng bán / địa chỉ nào đã giảm đi) |
| Ngày áp dụng của bản ghi hủy | Xác định tại thời điểm thao tác ngừng | Ngày hiệu lực (bản giấy = ngay chính ngày ngừng đọc / bản điện tử = ngày kế tiếp ngày ngừng đọc) |
| `kaiyaku_flg` / `zougen_flg` | TRUE / TRUE | Giống vậy (gán vào phía bản ghi hủy do batch sinh ra) |
| Cách biểu thị đặt lịch ngừng | Bản ghi đặt lịch với `tetsuzuki=0` | Bản ghi thông thường đã đặt ngày ngừng đọc (loại thủ tục vẫn giữ "mới"; biểu thị bằng trường ngày ngừng đọc, và phản ánh vào `t_dokusya` như lịch hủy) |

**Lý do không áp dụng:** Phương thức VTI vi phạm các nội dung đã xác định sau. ① Loại thủ tục vẫn giữ "mới" cho đến khi xử lý hủy (batch) (không có chỉ định hủy qua màn hình/nhập). ② Việc hủy theo phương thức batch thêm 1 bản ghi hủy vào bản chính (`t_dokusya_rireki`) (không phải cập nhật bản ghi hiện có, cũng không phải tạo tại thời điểm thao tác ngừng). ③ Thuộc tính của bản ghi hủy (địa chỉ・cửa hàng bán・đơn giá v.v.) kế thừa từ bản ghi còn hiệu lực ngay trước, nhưng số bản trở thành 0 tại thời điểm batch ban đêm chạy (ngày hiệu lực). Hơn nữa, ở phương thức VTI, bản chính sẽ tồn tại bản ghi `tetsuzuki=0` với ngày áp dụng tương lai, khiến các tiền đề sau đều sụp đổ: điều kiện kích hoạt hủy bỏ lịch sử (bản ghi hủy tại thời điểm sinh ra đã là "đã tới" = không hủy bỏ được / việc hủy đặt lịch là hủy bỏ bản ghi đã đặt ngày ngừng đọc), validation ngày áp dụng (hủy thì không nhập ngày áp dụng), và logic biểu mẫu (帳票).

**Bổ sung:** Việc phản ánh bản thân bản ghi đặt ngày ngừng đọc là phản ánh trong ngày tại thời điểm lưu (vì không thuộc các mục ảnh hưởng biểu mẫu ⟨tăng bản・giảm bản・địa chỉ・cửa hàng bán⟩ nên kể cả bản giấy cũng phản ánh trong ngày. Việc liên kết ngay của bản điện tử cũng lấy điều này làm tiền đề). Bù lại, **chỉ riêng** khả năng hủy bỏ của việc "hủy đặt lịch" thì ngoại lệ được phán định không phải theo "ngày áp dụng" mà theo "cho đến trước khi ngày ngừng đọc tới".

---

## 【3】Về đề xuất tách màn hình cho xử lý ngừng độc giả (hủy)

Chúng tôi chấp nhận đề xuất. Đúng như chỉ ra, nếu gộp "thay đổi" và "ngừng" vào cùng một thao tác chỉnh sửa thì việc kiểm tra tính nhất quán ở 【1】 sẽ phức tạp. Nếu tách ra, phán định "`Chushi_date ≧ (bản giấy là >) Max`" trở thành kiểm tra đơn giản đối với bản ghi còn hiệu lực hiện có, giảm sai sót cả về mặt cài đặt lẫn vận hành. Điều này cũng đồng bộ với pattern thiết kế màn hình hiện có (nút xóa chỉ đặt ở màn hình danh sách), và bằng cách biến thao tác ngừng thành dialog chuyên dụng, sẽ dễ cài đặt UI theo phiên bản (bản giấy = nhập ngày yyyy/MM/dd / bản điện tử = chọn "cuối tháng M") cũng như thông điệp xác nhận.

**Điều kiện・điểm cần xác nhận khi chấp nhận:**

1. Từ màn hình chỉnh sửa độc giả, gỡ bỏ phần nhập ngày ngừng đọc, nhưng vẫn giữ phần hiển thị lịch hủy (chỉ đọc).
2. Validation ở 【1】 và việc chặn ngừng trùng lặp được thực hiện tại dialog ngừng ở phía danh sách.
3. Việc hủy đặt lịch (hủy bỏ đỏ) vẫn thực hiện bằng chức năng hủy bỏ ở màn hình thông tin lịch sử độc giả như cũ (không đổi).
4. "Thay đổi + ngừng cùng ngày" (chỉ bản điện tử mới cùng ngày được) có thể thực hiện bằng 2 thao tác "thay đổi ở màn hình chỉnh sửa → ngừng ở màn hình danh sách", nên không thiếu chức năng.
5. Cột ngày ngừng đọc của template nhập Excel (No52) vẫn tồn tại độc lập với việc tách màn hình.
6. Cần chỉnh sửa (cập nhật phiên bản) tài liệu thiết kế màn hình của danh sách độc giả và chỉnh sửa độc giả.
