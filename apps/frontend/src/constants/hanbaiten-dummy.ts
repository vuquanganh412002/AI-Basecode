/**
 * 電子版単独の購読者に割り当てるダミー販売店のコード。
 * BE 側の `apps/backend/src/common/constants/hanbaiten-dummy.constant.ts` と同値。
 *
 * SCR-011 登録/編集の 販売店コード ドロップダウンは購読種別で候補が変わる:
 *   購読種別 = 2:電子版  → このコードの販売店だけ（dropdown へ `dummy=only`）
 *   購読種別 ≠ 2:電子版  → このコードを除外（`dummy=exclude`）
 *
 * 絞り込みは BE の SQL で行うため FE はどちら側かを送るだけ。この定数は
 * 表示・判定（既存の選択が種別に合うか）用。
 */
export const HANBAITEN_DUMMY_CODE = '9999999999';
