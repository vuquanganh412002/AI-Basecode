import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for `GET /api/v1/dokusya/:dokusya_id` and the
 * `data` field of `POST` / `PUT /:dokusya_id` (ACSMS-API-011-001 / 002 /
 * 003).
 *
 * Field names mirror `t_dokusya` columns in snake_case + a handful of
 * JOIN-resolved labels (`hanbaiten_name`, `tanka_name`,
 * `jastem_toriatsukai_tenpo_code`, `jastem_tenpo_name`) the form needs
 * to hydrate dropdowns without a second round-trip.
 *
 * Nullable columns map to `T | null` (NEVER `T | undefined`) so the
 * client sees a stable JSON shape — see
 * `.claude/rules/nestjs.md §Nullable field serialization`.
 *
 * **m_code label policy** (per `.claude/rules/nestjs.md §m_code response
 * serialization`): no `*_label` fields here. The FE looks up labels via
 * `useCodesStore().label(category, value)` against its own m_code cache.
 * Embedding labels would diverge from runtime DB edits on rename.
 */
export class DokusyaResponseDto {
  @ApiProperty() dokusya_id: number;
  @ApiProperty() ja_id: number;
  // 任意 (購読者に管理支店/支店が未設定のことがある)。NULL を 0 に丸めない
  // — FE が 0 を送り返すと更新で「管理支店IDが存在しません」400 になるため。
  @ApiProperty({ nullable: true }) kanri_shiten_id: number | null;
  @ApiProperty({ nullable: true }) shiten_id: number | null;
  @ApiProperty() kumiaiin_code: string;
  @ApiProperty() dokusya_shubetsu: number;
  @ApiProperty() tetsuzuki_shurui: number;
  @ApiProperty({ nullable: true }) denshi_dokusya_shubetsu: number | null;
  @ApiProperty() shimei_sei: string;
  @ApiProperty() shimei_mei: string;
  @ApiProperty() shimei_kana_sei: string;
  @ApiProperty() shimei_kana_mei: string;
  @ApiProperty() dokusya_busu: number;
  @ApiProperty() yubin_no: string;
  @ApiProperty() todofuken_code: string;
  @ApiProperty() shikuchoson: string;
  @ApiProperty() chome_banchi: string;
  @ApiProperty() tatemono_mei: string;
  @ApiProperty() renrakusaki_1: string;
  @ApiProperty() renrakusaki_2: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) mail_magazine_flg: number | null;
  @ApiProperty({ nullable: true }) birth_year: number | null;
  @ApiProperty({ nullable: true }) gender: number | null;
  @ApiProperty() haitatsu_same_flg: boolean;
  @ApiProperty() haitatsu_yubin_no: string;
  @ApiProperty() haitatsu_todofuken_code: string;
  @ApiProperty() haitatsu_shikuchoson: string;
  @ApiProperty() haitatsu_chome_banchi: string;
  @ApiProperty() haitatsu_tatemono_mei: string;
  @ApiProperty() haitatsu_renrakusaki_1: string;
  @ApiProperty() haitatsu_renrakusaki_2: string;
  @ApiProperty() haitatsu_shimei_sei: string;
  @ApiProperty() haitatsu_shimei_mei: string;
  @ApiProperty() haitatsu_shimei_kana_sei: string;
  @ApiProperty() haitatsu_shimei_kana_mei: string;
  @ApiProperty({ nullable: true }) hanbaiten_id: number | null;
  @ApiProperty() hanbaiten_name: string;
  @ApiProperty({ nullable: true }) tanka_id: number | null;
  @ApiProperty() tanka_name: string;
  @ApiProperty() yubin_kubun: string;
  @ApiProperty() shiharai_hoho: number;
  @ApiProperty({ nullable: true }) dokusyaryo_shiharai_cycle: number | null;
  @ApiProperty({ nullable: true }) bank_shiten_id: number | null;
  @ApiProperty() jastem_toriatsukai_tenpo_code: string;
  @ApiProperty() jastem_tenpo_name: string;
  @ApiProperty() bank_branch_code: string;
  @ApiProperty() bank_branch_name: string;
  @ApiProperty({ nullable: true }) hikiotoshi_yokin_shubetsu: number | null;
  @ApiProperty() hikiotoshi_koza_no: string;
  @ApiProperty() hikiotoshi_koza_meigi: string;
  @ApiProperty() dokusyaso_bunrui: string;
  @ApiProperty() nogyosya_bunrui: string;
  @ApiProperty() shoki_dokusya_kaishi_date: string;
  @ApiProperty() dokusya_kaishi_date: string;
  @ApiProperty({ nullable: true }) dokusya_chushi_date: string | null;
  @ApiProperty({ nullable: true }) joho_henko_tekiyo_date: string | null;
  @ApiProperty() seikyu_kaishi_month: string;
  @ApiProperty() biko: string;
  @ApiProperty() rireki_no: number;
  @ApiProperty({ nullable: true }) denshi_shonin_status: number | null;
  @ApiProperty({
    nullable: true,
    description:
      '電子版会員ID（外部システムの会員ID）。外部連携機能が設定する読取専用値。',
  })
  denshi_kaiin_id: number | null;
  @ApiProperty() created_at: string;
  @ApiProperty() updated_at: string;

  // ── 履歴メタ（顧客要件 2026-07 — 解約予約ガード用。master は未来解約を反映しない
  //    ため履歴から算出して返す）─────────────────────────────────────────────
  @ApiProperty({
    description:
      '有効な解約予約(kaiyaku_flg=true, 取消除外)が存在するか。true の間は追加の' +
      '解約予約を禁止（変更は履歴画面で当該解約を取消）。編集画面は購読中止日を disabled。',
  })
  has_active_kaiyaku: boolean;
  @ApiProperty({
    nullable: true,
    description:
      '履歴の最終変更適用日(MAX joho・取消除外)。解約予定日はこの日以降のみ指定可' +
      '（編集画面の購読中止日 disabled-date 基準）。履歴なしは null。',
  })
  max_joho_date: string | null;
}

/**
 * Envelope DTO for the controller-level Swagger annotation.
 * `{ data: DokusyaResponseDto }` per project convention.
 */
export class DokusyaResponseEnvelopeDto {
  @ApiProperty({ type: DokusyaResponseDto }) data: DokusyaResponseDto;
}

/**
 * Envelope DTO for mutation endpoints (`POST` / `PUT`) — adds the
 * `message` toast string alongside the response data.
 */
export class DokusyaMutationResponseDto {
  @ApiProperty({ type: DokusyaResponseDto }) data: DokusyaResponseDto;
  @ApiProperty({
    description: 'Toast literal — verb only (登録 / 更新 / 承認 / 否認 しました。)',
  })
  message: string;
}
