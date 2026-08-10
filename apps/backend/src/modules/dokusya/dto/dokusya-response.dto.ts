import { ApiProperty } from '@nestjs/swagger';

/**
 * `GET /api/v1/dokusya/:dokusya_id` と `POST` / `PUT /:dokusya_id` の `data`
 * フィールドのレスポンス形状 (ACSMS-API-011-001 / 002 / 003)。
 *
 * フィールド名は `t_dokusya` 列の snake_case を反映し、加えてフォームが2回目の
 * 往復なしでドロップダウンを埋めるための JOIN 解決ラベル数点（`hanbaiten_name`・
 * `tanka_name`・`jastem_toriatsukai_tenpo_code`・`jastem_tenpo_name`）を持つ。
 *
 * nullable 列は `T | null`（`T | undefined` は不可）にマップし、クライアントが
 * 安定した JSON 形状を見られるようにする — `.claude/rules/nestjs.md
 * §Nullable field serialization` 参照。
 *
 * **m_code ラベル方針**（`.claude/rules/nestjs.md §m_code response serialization`）:
 * ここに `*_label` フィールドは持たない。FE は自身の m_code キャッシュに対し
 * `useCodesStore().label(category, value)` でラベルを引く。ラベルを埋め込むと
 * リネーム時のランタイム DB 編集と乖離する。
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
  @ApiProperty() ja_yakushokuin_flg: boolean;
  @ApiProperty() nogyo_kankei_flg: boolean;
  @ApiProperty() dokusyaso_bunrui_sonota: string;
  @ApiProperty() nogyosya_bunrui: string;
  @ApiProperty() nogyosya_bunrui_sonota: string;
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
  @ApiProperty({
    description:
      '本紙購読フラグ。電子版読者管理システムの users.subscribe_flg（0:未購読, 1:購読）を連携した値。' +
      '購読種別=電子版のとき、画面に「紙版購読状況　有り」の表示を出すために使う。',
  })
  honshi_kodoku_flg: boolean;
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
 * コントローラ層 Swagger アノテーション用のエンベロープ DTO。
 * プロジェクト規約に従い `{ data: DokusyaResponseDto }`。
 */
export class DokusyaResponseEnvelopeDto {
  @ApiProperty({ type: DokusyaResponseDto }) data: DokusyaResponseDto;
}

/**
 * 更新系エンドポイント（`POST` / `PUT`）用のエンベロープ DTO —
 * レスポンスデータに加えて `message` トースト文字列を持つ。
 */
export class DokusyaMutationResponseDto {
  @ApiProperty({ type: DokusyaResponseDto }) data: DokusyaResponseDto;
  @ApiProperty({
    description: 'Toast literal — verb only (登録 / 更新 / 承認 / 否認 しました。)',
  })
  message: string;
}
