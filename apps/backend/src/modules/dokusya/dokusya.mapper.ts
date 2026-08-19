import {
  allowsDokusyasoBunruiSonota,
  allowsJaYakushokuinFlg,
  allowsNogyoKankeiFlg,
  allowsNogyosyaBunruiSonota,
} from '@/common/constants/dokusya-bunrui.constant';
import { DokusyaShubetsu, ShiharaiHoho } from '@/common/enums';
import { todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import {
  DokusyaHistoryItemDto,
} from './dto/dokusya-history-response.dto';
import { DokusyaResponseDto } from './dto/dokusya-response.dto';

/**
 * service が JOIN で解決してから mapper に渡す追加項目（api.md §4.3 SELECT）。mapper は
 * JOIN 済みラベル + m_shiten 逆引き結果が揃っている前提 — 自身では IO しない。
 */
export interface DokusyaJoinFields {
  hanbaiten_name: string;
  tanka_name: string;
  bank_shiten_id: number | null;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
}

/**
 * 文字列化されうる BIGINT id を number へ。TypeORM は bigint 列を string で返すが
 * API レスポンスは JSON 契約を numeric に保つ。
 */
function coerceNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function coerceNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** 生 getRawMany() 列が coerce 前に取りうる nullable スカラー型。 */
type RawScalarNullable = number | string | null;

function isoOrEmpty(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Dokusya エンティティ + JOIN 側項目 → GET/POST/PUT 詳細エンドポイントが返す
 * snake_case レスポンス DTO へマップ。
 *
 * 純関数 — Nest DI/repo なし。service が JOIN と m_shiten 逆引きを済ませている前提；
 * この mapper は camelCase → snake_case 変換層のみ。
 *
 * 標準パターンは `apps/backend/src/modules/ja/ja.mapper.ts`（.claude/rules/nestjs.md §mapper）。
 */
/**
 * 履歴メタ（解約予約ガード）。master は未来解約を反映しないため getDetail が履歴から算出して渡す。
 * 省略時は解約予約なし・履歴なし相当（作成/更新レスポンスでは未使用）。
 */
export interface DokusyaHistoryMeta {
  has_active_kaiyaku?: boolean;
  max_joho_date?: string | null;
}

/** buildBunruiPayload の入力（create/update DTO の該当項目だけ）。 */
export interface BunruiDtoFields {
  dokusyaso_bunrui?: string;
  ja_yakushokuin_flg?: boolean;
  nogyo_kankei_flg?: boolean;
  dokusyaso_bunrui_sonota?: string;
  nogyosya_bunrui?: string;
  nogyosya_bunrui_sonota?: string;
}

/**
 * 購読者層分類まわり 6 項目の保存値を組み立てる（顧客DB設計 2026-08）。
 *
 * 従属 4 項目は親の分類が該当コードを含むときだけ値を持てる（列 COMMENT の
 * 「〜の場合のみ設定可 / 入力可」）。画面は選択に応じて入力欄を出し分け、外れた
 * 値をクリアしてから送るが、ここでも同じゲートで落とす。理由は 2 つ:
 *
 *  1. DTO 単体では表現できない項目間の制約なので、API を直接叩けば
 *     「購読者層分類=学生 なのに ja_yakushokuin_flg=true」が保存できてしまう。
 *  2. その組合せは電子版 push で V26〜V30 を踏み、create/update ごと失敗する
 *     （条件付き項目 — denshiban-push.mapper.ts 参照）。保存できてしまうと
 *     「画面では登録できたのに電子版だけ同期されない」形の不整合になる。
 */
export function buildBunruiPayload(dto: BunruiDtoFields): Partial<Dokusya> {
  const dokusyasoBunrui = dto.dokusyaso_bunrui ?? '';
  const nogyosyaBunrui = dto.nogyosya_bunrui ?? '';
  return {
    dokusyasoBunrui,
    jaYakushokuinFlg:
      allowsJaYakushokuinFlg(dokusyasoBunrui) && dto.ja_yakushokuin_flg === true,
    nogyoKankeiFlg:
      allowsNogyoKankeiFlg(dokusyasoBunrui) && dto.nogyo_kankei_flg === true,
    dokusyasoBunruiSonota: allowsDokusyasoBunruiSonota(dokusyasoBunrui)
      ? (dto.dokusyaso_bunrui_sonota ?? '')
      : '',
    nogyosyaBunrui,
    nogyosyaBunruiSonota: allowsNogyosyaBunruiSonota(nogyosyaBunrui)
      ? (dto.nogyosya_bunrui_sonota ?? '')
      : '',
  };
}

/** buildHaitatsuPayload の入力（create/update DTO の該当項目だけ）。 */
export interface HaitatsuDtoFields {
  dokusya_shubetsu?: number;
  haitatsu_same_flg?: boolean;
  haitatsu_yubin_no?: string;
  haitatsu_todofuken_code?: string;
  haitatsu_shikuchoson?: string;
  haitatsu_chome_banchi?: string;
  haitatsu_tatemono_mei?: string;
  haitatsu_renrakusaki_1?: string;
  haitatsu_renrakusaki_2?: string;
  haitatsu_shimei_sei?: string;
  haitatsu_shimei_mei?: string;
  haitatsu_shimei_kana_sei?: string;
  haitatsu_shimei_kana_mei?: string;
}

/**
 * 配達先情報12項目（同一フラグ＋住所5＋連絡先2＋氏名4）の保存値を組み立てる
 * （バグ報告 2026-08）。
 *
 * 電子版(dokusya_shubetsu=2)は配達先情報エリア自体が非活性化される
 * （`DokusyaFormView.vue` §7.5・screen-design.md ACSMS-SCR-011 No.27-38）ため、
 * 配達先情報は一切持てない。画面は種別ラジオを切替えても隠れた入力欄の値を
 * クリアせず送信し得るため、`buildBunruiPayload` と同じ理由でここでも
 * ゲートする:
 *
 *  1. DTO 単体では表現できない項目間の制約なので、API を直接叩けば
 *     「電子版なのに配達先情報あり」が保存できてしまう。
 *  2. 種別を紙版/併読へ戻さない限り画面には出ない列であり、放置すると
 *     「画面には出ないのに DB に残る」不整合データになる。
 *
 * 電子版は `haitatsu_same_flg` を `true`（列の DB default と同値・実質「なし」の
 * 中立値）に固定し、残り11列は空文字にする。紙版/併読は従来どおり dto の値を
 * そのまま保存する（`haitatsu_same_flg=true` 時の空欄化は FE watch + 別経路の
 * 遡及カスケードに委ねる — 本関数のスコープ外）。
 */
export function buildHaitatsuPayload(dto: HaitatsuDtoFields): Partial<Dokusya> {
  if (Number(dto.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL) {
    return {
      haitatsuSameFlg: true,
      haitatsuYubinNo: '',
      haitatsuTodofukenCode: '',
      haitatsuShikuchoson: '',
      haitatsuChomeBanchi: '',
      haitatsuTatemonoMei: '',
      haitatsuRenrakusaki1: '',
      haitatsuRenrakusaki2: '',
      haitatsuShimeiSei: '',
      haitatsuShimeiMei: '',
      haitatsuShimeiKanaSei: '',
      haitatsuShimeiKanaMei: '',
    };
  }
  return {
    haitatsuSameFlg: dto.haitatsu_same_flg,
    haitatsuYubinNo: dto.haitatsu_yubin_no ?? '',
    haitatsuTodofukenCode: dto.haitatsu_todofuken_code ?? '',
    haitatsuShikuchoson: dto.haitatsu_shikuchoson ?? '',
    haitatsuChomeBanchi: dto.haitatsu_chome_banchi ?? '',
    haitatsuTatemonoMei: dto.haitatsu_tatemono_mei ?? '',
    haitatsuRenrakusaki1: dto.haitatsu_renrakusaki_1 ?? '',
    haitatsuRenrakusaki2: dto.haitatsu_renrakusaki_2 ?? '',
    haitatsuShimeiSei: dto.haitatsu_shimei_sei ?? '',
    haitatsuShimeiMei: dto.haitatsu_shimei_mei ?? '',
    haitatsuShimeiKanaSei: dto.haitatsu_shimei_kana_sei ?? '',
    haitatsuShimeiKanaMei: dto.haitatsu_shimei_kana_mei ?? '',
  };
}

export function toDokusyaResponse(
  entity: Dokusya,
  joins: DokusyaJoinFields,
  meta: DokusyaHistoryMeta = {},
): DokusyaResponseDto {
  return {
    dokusya_id: coerceNumber(entity.dokusyaId),
    ja_id: coerceNumber(entity.jaId),
    // kanri_shiten_id / shiten_id は未設定(NULL)のことがある。0 へ丸めると FE が 0 を送り返し、
    // 更新で assertFkScope が「id=0 の管理支店」を探して 400(管理支店IDが存在しません)になる。
    // NULL を保ち一覧マッパー(coerceNullableNumber)と nullable 直列化規約に合わせる。
    kanri_shiten_id: coerceNullableNumber(entity.kanriShitenId),
    shiten_id: coerceNullableNumber(entity.shitenId),
    kumiaiin_code: entity.kumiaiinCode ?? '',
    dokusya_shubetsu: coerceNumber(entity.dokusyaShubetsu),
    tetsuzuki_shurui: coerceNumber(entity.tetsuzukiShurui),
    denshi_dokusya_shubetsu: coerceNullableNumber(entity.denshiDokusyaShubetsu),
    shimei_sei: entity.shimeiSei ?? '',
    shimei_mei: entity.shimeiMei ?? '',
    shimei_kana_sei: entity.shimeiKanaSei ?? '',
    shimei_kana_mei: entity.shimeiKanaMei ?? '',
    dokusya_busu: coerceNumber(entity.dokusyaBusu),
    yubin_no: entity.yubinNo ?? '',
    todofuken_code: entity.todofukenCode ?? '',
    shikuchoson: entity.shikuchoson ?? '',
    chome_banchi: entity.chomeBanchi ?? '',
    tatemono_mei: entity.tatemonoMei ?? '',
    renrakusaki_1: entity.renrakusaki1 ?? '',
    renrakusaki_2: entity.renrakusaki2 ?? '',
    email: entity.email ?? '',
    mail_magazine_flg: coerceNullableNumber(entity.mailMagazineFlg),
    birth_year: coerceNullableNumber(entity.birthYear),
    gender: coerceNullableNumber(entity.gender),
    haitatsu_same_flg: Boolean(entity.haitatsuSameFlg),
    haitatsu_yubin_no: entity.haitatsuYubinNo ?? '',
    haitatsu_todofuken_code: entity.haitatsuTodofukenCode ?? '',
    haitatsu_shikuchoson: entity.haitatsuShikuchoson ?? '',
    haitatsu_chome_banchi: entity.haitatsuChomeBanchi ?? '',
    haitatsu_tatemono_mei: entity.haitatsuTatemonoMei ?? '',
    haitatsu_renrakusaki_1: entity.haitatsuRenrakusaki1 ?? '',
    haitatsu_renrakusaki_2: entity.haitatsuRenrakusaki2 ?? '',
    haitatsu_shimei_sei: entity.haitatsuShimeiSei ?? '',
    haitatsu_shimei_mei: entity.haitatsuShimeiMei ?? '',
    haitatsu_shimei_kana_sei: entity.haitatsuShimeiKanaSei ?? '',
    haitatsu_shimei_kana_mei: entity.haitatsuShimeiKanaMei ?? '',
    // hanbaiten_id / tanka_id も NULL 許容（1783700000000 の DROP NOT NULL）。
    // 上の kanri_shiten_id と同じ理由で 0 へ丸めない — 0 は実在しない ID なので
    // FE が echo すると FK ガードが 400 を返し、画面上も未選択なのに 0 と表示される。
    hanbaiten_id: coerceNullableNumber(entity.hanbaitenId),
    hanbaiten_name: joins.hanbaiten_name,
    tanka_id: coerceNullableNumber(entity.tankaId),
    tanka_name: joins.tanka_name,
    yubin_kubun: entity.yubinKubun ?? '',
    shiharai_hoho: coerceNumber(entity.shiharaiHoho),
    dokusyaryo_shiharai_cycle: coerceNullableNumber(
      entity.dokusyaryoShiharaiCycle,
    ),
    bank_shiten_id: joins.bank_shiten_id,
    jastem_toriatsukai_tenpo_code: joins.jastem_toriatsukai_tenpo_code,
    jastem_tenpo_name: joins.jastem_tenpo_name,
    bank_branch_code: entity.bankBranchCode ?? '',
    bank_branch_name: entity.bankBranchName ?? '',
    hikiotoshi_yokin_shubetsu: coerceNullableNumber(
      entity.hikiotoshiYokinShubetsu,
    ),
    hikiotoshi_koza_no: entity.hikiotoshiKozaNo ?? '',
    hikiotoshi_koza_meigi: entity.hikiotoshiKozaMeigi ?? '',
    dokusyaso_bunrui: entity.dokusyasoBunrui ?? '',
    ja_yakushokuin_flg: entity.jaYakushokuinFlg ?? false,
    nogyo_kankei_flg: entity.nogyoKankeiFlg ?? false,
    dokusyaso_bunrui_sonota: entity.dokusyasoBunruiSonota ?? '',
    nogyosya_bunrui: entity.nogyosyaBunrui ?? '',
    nogyosya_bunrui_sonota: entity.nogyosyaBunruiSonota ?? '',
    shoki_dokusya_kaishi_date: entity.shokiDokusyaKaishiDate ?? '',
    dokusya_kaishi_date: entity.dokusyaKaishiDate ?? '',
    dokusya_chushi_date: entity.dokusyaChushiDate ?? null,
    joho_henko_tekiyo_date: entity.johoHenkoTekiyoDate ?? null,
    seikyu_kaishi_month: entity.seikyuKaishiMonth ?? '',
    biko: entity.biko ?? '',
    rireki_no: coerceNumber(entity.rirekiNo),
    denshi_shonin_status: coerceNullableNumber(entity.denshiShoninStatus),
    denshi_kaiin_id: coerceNullableNumber(entity.denshiKaiinId),
    // DB は NOT NULL DEFAULT FALSE。古い行や部分 select で undefined が来ても
    // false に倒して、画面が「有り」を誤表示しないようにする。
    honshi_kodoku_flg: entity.honshiKodokuFlg ?? false,
    created_at: isoOrEmpty(entity.createdAt),
    updated_at: isoOrEmpty(entity.updatedAt),
    has_active_kaiyaku: meta.has_active_kaiyaku ?? false,
    max_joho_date: meta.max_joho_date ?? null,
  };
}

/**
 * ACSMS-SCR-014 — GET /api/v1/dokusya が返すフラット list item 形
 * （api.md §ACSMS-API-014-001 レスポンスデータ #1-#22 per-row）。
 *
 * 項目は api.md §4.5 の SELECT を反映 + 2つの計算列（full_name / full_name_kana は shimei concat、
 * haitatsu は住所 concat）と BE 側算出の is_read_only フラグ（FE がルールを再導出せず
 * 「編集」/「削除」を disable できる）。
 */
export interface DokusyaListItem {
  dokusya_id: number;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  full_name: string;
  full_name_kana: string;
  /** 手続種類 — m_code TETSUZUKI_SHURUI (0:解約, 1:新規). */
  tetsuzuki_shurui: number;
  renrakusaki_1: string;
  renrakusaki_2: string;
  /** 配送先連絡先１ — haitatsu_renrakusaki_1（空文字許容）. */
  haitatsu_renrakusaki_1: string;
  /** 配達先氏名 — haitatsu_shimei_sei + ' ' + haitatsu_shimei_mei (concat, trimmed). */
  haitatsu_full_name: string;
  haitatsu_yubin_no: string;
  haitatsu: string;
  /** NULL 許容 — 未設定の読者（バッチ取込の電子版単独など）は null。 */
  hanbaiten_id: number | null;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
  denshi_shonin_status: number | null;
  shoki_dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  is_read_only: boolean;
}

/**
 * is_read_only フラグを標準ルール（api.md §4.5 + 顧客要件 2026-08 追補）で算出:
 *   dokusya_shubetsu = 3
 *   OR (dokusya_shubetsu = 2 AND shiharai_hoho = 6)
 *   OR (dokusya_shubetsu = 2 AND denshi_kaiin_id IS NULL AND 単価が campaign でない)
 * 3番目の条件は電子版読者管理システム未連携（denshi_kaiin_id 未設定）の読者を対象とする。
 * ただし campaign 単価の読者はシステム連携前に手動登録される運用のため対象外
 * （顧客要件 2026-08 追補）。denshiKaiinId / tankaCampaignFlg 省略時はこの3番目の
 * 条件を評価しない（呼び出し元が該当情報を持たない箇所向けの後方互換）。
 * service/spec ヘルパが述語を再実装せず短絡できるよう export。
 */
export function isDokusyaReadOnly(
  dokusyaShubetsu: number | null | undefined,
  shiharaiHoho: number | null | undefined,
  denshiKaiinId?: number | null,
  tankaCampaignFlg?: boolean,
): boolean {
  const shubetsu = Number(dokusyaShubetsu);
  const hoho = Number(shiharaiHoho);
  if (shubetsu === DokusyaShubetsu.BOTH) return true;
  if (shubetsu === DokusyaShubetsu.DIGITAL && hoho === ShiharaiHoho.CREDIT_CARD) {
    return true;
  }
  if (
    shubetsu === DokusyaShubetsu.DIGITAL &&
    denshiKaiinId === null &&
    !tankaCampaignFlg
  ) {
    return true;
  }
  return false;
}

/**
 * 生 QueryBuilder 行（getRawMany の snake_case）→ is_read_only 算出済みの
 * フラット DokusyaListItem へマップ。
 *
 * 入力に寛容 — factory `buildDokusyaListRow` が完全な形（api.md §4.5 SELECT を列単位で反映）を
 * 出すため production では部分行分岐は不要。
 */
export function toDokusyaListItem(
  row: Record<string, unknown>,
): DokusyaListItem {
  const dokusyaShubetsu = coerceNumber(row.dokusya_shubetsu as number | string);
  const shiharaiHoho = coerceNumber(row.shiharai_hoho as number | string);
  const isReadOnly =
    row.is_read_only === undefined
      ? isDokusyaReadOnly(dokusyaShubetsu, shiharaiHoho)
      : Boolean(row.is_read_only);
  return {
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    ja_id: coerceNumber(row.ja_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    full_name: stringOrEmpty(row.full_name),
    full_name_kana: stringOrEmpty(row.full_name_kana),
    tetsuzuki_shurui: coerceNumber(row.tetsuzuki_shurui as number | string),
    renrakusaki_1: stringOrEmpty(row.renrakusaki_1),
    renrakusaki_2: stringOrEmpty(row.renrakusaki_2),
    haitatsu_renrakusaki_1: stringOrEmpty(row.haitatsu_renrakusaki_1),
    // 配達先氏名 concat — trim して空なら '' に（孤立スペースを防ぐ）。
    haitatsu_full_name: stringOrEmpty(row.haitatsu_full_name).trim(),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    haitatsu: stringOrEmpty(row.haitatsu),
    hanbaiten_id: coerceNullableNumber(row.hanbaiten_id as number | string),
    hanbaiten_code: stringOrEmpty(row.hanbaiten_code),
    hanbaiten_name: stringOrEmpty(row.hanbaiten_name),
    dokusya_shubetsu: dokusyaShubetsu,
    shiharai_hoho: shiharaiHoho,
    denshi_shonin_status: coerceNullableNumber(
      row.denshi_shonin_status as RawScalarNullable,
    ),
    shoki_dokusya_kaishi_date: stringOrEmpty(row.shoki_dokusya_kaishi_date),
    dokusya_chushi_date: nullableString(row.dokusya_chushi_date),
    is_read_only: isReadOnly,
  };
}

/**
 * Excel エクスポートの標準15列日本語ヘッダ行。ACSMS-SCR-014 検索結果テーブルの列レイアウトを反映
 * （顧客要件2026-06）:
 *   - ID (dokusya_id) を先頭列に追加
 *   - 支店 / 連絡先２ 列を削除
 *   - 手続種類 / 購読種別 を購読者名の後に追加
 *   - 配達先氏名 を連絡先１の後に追加
 *   - 支払方法 を販売店名の後に追加
 * かな氏名 は検索専用（表示/export 列なし）。単一の真実源として spec が assert できるよう export。
 */
export const DOKUSYA_EXPORT_HEADERS: readonly string[] = [
  'ID',
  '管理支店',
  '組合員コード',
  '購読者名',
  '手続種類',
  '購読種別',
  '連絡先１',
  '配達先氏名',
  '配達先郵便',
  '配達先住所',
  '販売店コード',
  '販売店名',
  '支払方法',
  '購読開始日',
  '購読中止日',
] as const;

/**
 * code バインドの3 export 列（手続種類/購読種別/支払方法）の解決済み m_code ラベル。
 * service が mapper 呼出し前に CodeService.getLabel で解決し、Excel が生の数値でなく
 * 顧客向けラベルを表示する。
 */
export interface DokusyaExcelLabels {
  tetsuzuki_shurui: string;
  dokusya_shubetsu: string;
  shiharai_hoho: string;
}

/**
 * DokusyaListItem → Excel ヘッダ順の15セル文字列へ変換。3つの m_code 列は解決済みラベル
 * （service が渡す）、NULL 日付列は '' に。service がこれを ExcelJS worksheet へ流す。
 */
export function toDokusyaExcelRow(
  item: DokusyaListItem,
  labels: DokusyaExcelLabels,
): string[] {
  return [
    String(item.dokusya_id),
    item.kanri_shiten_name ?? '',
    item.kumiaiin_code,
    item.full_name,
    labels.tetsuzuki_shurui,
    labels.dokusya_shubetsu,
    item.renrakusaki_1,
    item.haitatsu_full_name,
    item.haitatsu_yubin_no,
    item.haitatsu,
    item.hanbaiten_code,
    item.hanbaiten_name,
    labels.shiharai_hoho,
    item.shoki_dokusya_kaishi_date,
    item.dokusya_chushi_date ?? '',
  ];
}

/**
 * ACSMS-SCR-013 — 購読者履歴情報画面: `GET /api/v1/dokusya/:dokusya_id/rireki` の1行完全形
 * （api.md §ACSMS-API-013-001 §レスポンスデータ #2-#61）。
 *
 * DokusyaHistoryItemDto（ACSMS-SCR-011 /history — 軽量）とは別物。
 * 本エンドポイントは名称 lookup（管理支店/支店/都道府県×3/販売店×2）を JOIN した完全スナップショットを
 * 返し、nestjs.md §Response serialization + api.md §m_code note に従い CODE 値のみ
 * （*_label なし；FE が useCodesStore で解決）。
 *
 * Nullable は api.md レスポンスデータの "Nullable" 列に一致: 〇 → `… | null`、空 → 非null string/number。
 */
export interface DokusyaRirekiListItem {
  dokusya_rireki_id: number;
  dokusya_id: number;
  rireki_no: number;
  /** m_code.code_category='DOKUSYA_SHUBETSU'（1:紙版, 2:電子版, 3:併読）。ACSMS-SCR-013 一覧。*/
  dokusya_shubetsu: number;
  /**
   * m_code.code_category='DENSHI_DOKUSYA_SHUBETSU'（0:無料, 1:有料）。
   * 紙版は電子版連携が無いため null。ACSMS-SCR-013 一覧（顧客要件 2026-07）。
   */
  denshi_dokusya_shubetsu: number | null;
  /**
   * 電子申込承認ステータス（0:未承認, 1:承認済み, 2:否認）。m_code ではなく
   * 電子版連携で決まる値で、Web申込以外（紙版等）は null。
   * ACSMS-SCR-013 一覧（顧客要件 2026-07）。
   */
  denshi_shonin_status: number | null;
  ja_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei_sei: string;
  shimei_mei: string;
  todofuken_code: string;
  todofuken_name: string | null;
  shikuchoson: string;
  chome_banchi: string;
  tatemono_mei: string;
  renrakusaki_1: string;
  renrakusaki_2: string;
  email: string;
  mail_magazine_flg: number | null;
  birth_year: number | null;
  gender: number | null;
  dokusyaso_bunrui: string;
  nogyosya_bunrui: string;
  /** 新聞単価 (m_tanka.tanka_id)。NULL 許容 — 未設定は null。*/
  tanka_id: number | null;
  /** 新聞単価名 (m_tanka.tanka_name)。単価削除済み等は null。*/
  tanka_name: string | null;
  /** 新聞単価の表示金額。JA の税区分で BE 解決（zei_kubun=1 内税→税込, else 税抜）。*/
  tanka_kingaku: number | null;
  dokusya_busu: number;
  zenkai_dokusya_busu: number | null;
  haitatsu_yubin_no: string;
  zenkai_yubin_no: string | null;
  haitatsu_todofuken_code: string;
  haitatsu_todofuken_name: string | null;
  haitatsu_shikuchoson: string;
  haitatsu_chome_banchi: string;
  haitatsu_tatemono_mei: string;
  haitatsu_shimei_sei: string;
  haitatsu_shimei_mei: string;
  zenkai_todofuken_code: string | null;
  zenkai_todofuken_name: string | null;
  zenkai_shikuchoson: string | null;
  zenkai_chome_banchi: string | null;
  zenkai_tatemono_mei: string | null;
  /** NULL 許容 — 未設定は null（hanbaiten_name と揃える）。 */
  hanbaiten_id: number | null;
  hanbaiten_name: string | null;
  zenkai_hanbaiten_id: number | null;
  zenkai_hanbaiten_name: string | null;
  tetsuzuki_shurui: number;
  shoki_dokusya_kaishi_date: string;
  dokusya_kaishi_date: string;
  dokusya_chushi_date: string | null;
  joho_henko_tekiyo_date: string | null;
  saishin_data_flg: boolean;
  zougen_hokoku_flg: boolean;
  shinki_flg: boolean;
  kaiyaku_flg: boolean;
  /** 取消(赤伝)済みフラグ。対象行・打ち消し行の両方で true。*/
  torikeshi_flg: boolean;
  /** 備考。取消時は取消理由が記録される（顧客要件）。*/
  biko: string;
  /**
   * この行を 取消 できるか（BE の {@link canTorikeshi} と同一条件・顧客要件2026-07）:
   * 紙版(dokusya_shubetsu=1) かつ 新規/取消済でない かつ 適用日が未来(本日<適用日,JST)
   * かつ チェーン末尾(有効レコード) であること。FE のボタン disable 判定に使う
   * （実際の可否は BE エンドポイントが再検証する）。
   */
  can_torikeshi: boolean;
  /** m_code.code_category='SHIHARAI_HOHO'（支払い方法）。*/
  shiharai_hoho: number;
  /** m_code.code_category='YUBIN_KUBUN'（郵送区分・'0':空/'1':郵送）。*/
  yubin_kubun: string;
  /** 購読料支払サイクル（月数 1〜12）。未設定は null。*/
  dokusyaryo_shiharai_cycle: number | null;
  hikiotoshi_yokin_shubetsu: number | null;
  bank_branch_code: string;
  bank_branch_name: string;
  hikiotoshi_koza_no: string;
  hikiotoshi_koza_meigi: string;
  created_at: string;
  created_by: string;
}

/**
 * 生 getRawMany() 列（実行時は常にスカラー）をプリミティブへ narrow し String() が
 * `[object Object]` にならないようにする。`string | number` 受け側が unknown を受けないため assertion が必要。
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

/** null → null、それ以外は文字列形。 */
function nullableString(value: unknown): string | null {
  return value == null ? null : String(asScalar(value));
}

/** null → ''、それ以外は文字列形。 */
function stringOrEmpty(value: unknown): string {
  return value == null ? '' : String(asScalar(value));
}

/**
 * 生 QueryBuilder 行（getRawMany の snake_case alias・api.md §4.5 の SELECT そのまま）→
 * DokusyaRirekiListItem へマップ。
 *
 * 純関数 — service が全 JOIN を解決済み。BIGINT id は TypeORM から string で来るので JSON 契約を
 * numeric に保つため number へ coerce；nullable join（kanri_shiten_name, todofuken_name,
 * zenkai_* …）は null を保ち FE が「absent」と「""」を区別できる。
 */
export function toDokusyaRirekiListItem(
  row: Record<string, unknown>,
  /**
   * チェーン末尾の dokusya_rireki_id（torikeshi_flg=false 行の最大 (joho, rireki_no)）。
   * この行が末尾かつ 新規/取消済 でないとき can_torikeshi=true。null → 取消可能な末尾なし。
   */
  tailRirekiId: number | null = null,
): DokusyaRirekiListItem {
  const shinki = Boolean(row.shinki_flg);
  const torikeshi = Boolean(row.torikeshi_flg);
  const isTail =
    tailRirekiId != null &&
    coerceNumber(row.dokusya_rireki_id as number | string) === tailRirekiId;
  // 顧客要件2026-07（canTorikeshi と同一条件）:
  // 6. 紙版(1)のみ取消可（電子版=2・併読=3 は電子版連携のため不可）。
  const isPaper =
    coerceNumber(row.dokusya_shubetsu as number | string) ===
    DokusyaShubetsu.PAPER;
  // 7. 適用日が未来(本日 < 適用日, JST) でなければ取消不可。DATE の ISO 文字列比較。
  const isFutureJoho =
    typeof row.joho_henko_tekiyo_date === 'string' &&
    row.joho_henko_tekiyo_date > todayIsoJst();
  return {
    dokusya_rireki_id: coerceNumber(row.dokusya_rireki_id as number | string),
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    rireki_no: coerceNumber(row.rireki_no as number | string),
    dokusya_shubetsu: coerceNumber(row.dokusya_shubetsu as number | string),
    denshi_dokusya_shubetsu: coerceNullableNumber(
      row.denshi_dokusya_shubetsu as RawScalarNullable,
    ),
    denshi_shonin_status: coerceNullableNumber(
      row.denshi_shonin_status as RawScalarNullable,
    ),
    ja_id: coerceNumber(row.ja_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    shimei_sei: stringOrEmpty(row.shimei_sei),
    shimei_mei: stringOrEmpty(row.shimei_mei),
    todofuken_code: stringOrEmpty(row.todofuken_code),
    todofuken_name: nullableString(row.todofuken_name),
    shikuchoson: stringOrEmpty(row.shikuchoson),
    chome_banchi: stringOrEmpty(row.chome_banchi),
    tatemono_mei: stringOrEmpty(row.tatemono_mei),
    renrakusaki_1: stringOrEmpty(row.renrakusaki_1),
    renrakusaki_2: stringOrEmpty(row.renrakusaki_2),
    email: stringOrEmpty(row.email),
    mail_magazine_flg: coerceNullableNumber(row.mail_magazine_flg as number | string | null),
    birth_year: coerceNullableNumber(row.birth_year as RawScalarNullable),
    gender: coerceNullableNumber(row.gender as RawScalarNullable),
    dokusyaso_bunrui: stringOrEmpty(row.dokusyaso_bunrui),
    nogyosya_bunrui: stringOrEmpty(row.nogyosya_bunrui),
    tanka_id: coerceNullableNumber(row.tanka_id as number | string),
    tanka_name: nullableString(row.tanka_name),
    tanka_kingaku: coerceNullableNumber(row.tanka_kingaku as RawScalarNullable),
    dokusya_busu: coerceNumber(row.dokusya_busu as number | string),
    zenkai_dokusya_busu: coerceNullableNumber(
      row.zenkai_dokusya_busu as RawScalarNullable,
    ),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    zenkai_yubin_no: nullableString(row.zenkai_yubin_no),
    haitatsu_todofuken_code: stringOrEmpty(row.haitatsu_todofuken_code),
    haitatsu_todofuken_name: nullableString(row.haitatsu_todofuken_name),
    haitatsu_shikuchoson: stringOrEmpty(row.haitatsu_shikuchoson),
    haitatsu_chome_banchi: stringOrEmpty(row.haitatsu_chome_banchi),
    haitatsu_tatemono_mei: stringOrEmpty(row.haitatsu_tatemono_mei),
    haitatsu_shimei_sei: stringOrEmpty(row.haitatsu_shimei_sei),
    haitatsu_shimei_mei: stringOrEmpty(row.haitatsu_shimei_mei),
    zenkai_todofuken_code: nullableString(row.zenkai_todofuken_code),
    zenkai_todofuken_name: nullableString(row.zenkai_todofuken_name),
    zenkai_shikuchoson: nullableString(row.zenkai_shikuchoson),
    zenkai_chome_banchi: nullableString(row.zenkai_chome_banchi),
    zenkai_tatemono_mei: nullableString(row.zenkai_tatemono_mei),
    hanbaiten_id: coerceNullableNumber(row.hanbaiten_id as number | string),
    hanbaiten_name: nullableString(row.hanbaiten_name),
    zenkai_hanbaiten_id: coerceNullableNumber(
      row.zenkai_hanbaiten_id as RawScalarNullable,
    ),
    zenkai_hanbaiten_name: nullableString(row.zenkai_hanbaiten_name),
    tetsuzuki_shurui: coerceNumber(row.tetsuzuki_shurui as number | string),
    shoki_dokusya_kaishi_date: stringOrEmpty(row.shoki_dokusya_kaishi_date),
    dokusya_kaishi_date: stringOrEmpty(row.dokusya_kaishi_date),
    dokusya_chushi_date: nullableString(row.dokusya_chushi_date),
    joho_henko_tekiyo_date: nullableString(row.joho_henko_tekiyo_date),
    saishin_data_flg: Boolean(row.saishin_data_flg),
    zougen_hokoku_flg: Boolean(row.zougen_hokoku_flg),
    shinki_flg: shinki,
    kaiyaku_flg: Boolean(row.kaiyaku_flg),
    torikeshi_flg: torikeshi,
    biko: stringOrEmpty(row.biko),
    can_torikeshi: isPaper && !shinki && !torikeshi && isFutureJoho && isTail,
    shiharai_hoho: coerceNumber(row.shiharai_hoho as number | string),
    yubin_kubun: stringOrEmpty(row.yubin_kubun),
    dokusyaryo_shiharai_cycle: coerceNullableNumber(
      row.dokusyaryo_shiharai_cycle as RawScalarNullable,
    ),
    hikiotoshi_yokin_shubetsu: coerceNullableNumber(
      row.hikiotoshi_yokin_shubetsu as RawScalarNullable,
    ),
    bank_branch_code: stringOrEmpty(row.bank_branch_code),
    bank_branch_name: stringOrEmpty(row.bank_branch_name),
    hikiotoshi_koza_no: stringOrEmpty(row.hikiotoshi_koza_no),
    hikiotoshi_koza_meigi: stringOrEmpty(row.hikiotoshi_koza_meigi),
    created_at: isoOrEmpty(row.created_at as Date | string | null),
    created_by: stringOrEmpty(row.created_by),
  };
}

/** DokusyaRireki エンティティ → history list item へマップ。 */
export function toDokusyaHistoryItem(row: DokusyaRireki): DokusyaHistoryItemDto {
  return {
    dokusya_rireki_id: coerceNumber(row.dokusyaRirekiId),
    dokusya_id: coerceNumber(row.dokusyaId),
    rireki_no: coerceNumber(row.rirekiNo),
    tetsuzuki_shurui: coerceNumber(row.tetsuzukiShurui),
    saishin_data_flg: Boolean(row.saishinDataFlg),
    shinki_flg: Boolean(row.shinkiFlg),
    kaiyaku_flg: Boolean(row.kaiyakuFlg),
    zougen_hokoku_flg: Boolean(row.zougenHokokuFlg),
    denshi_shonin_status: coerceNullableNumber(row.denshiShoninStatus),
    created_at: isoOrEmpty(row.createdAt),
    created_by: row.createdBy ?? '',
  };
}

// ════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-015 — 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面）(replace search row)
// ════════════════════════════════════════════════════════════════════════

/**
 * DokusyaService.searchForReplace が返すフラット snake_case 行（ACSMS-API-015-001
 * §レスポンスデータ）。shimei と haitatsu_address は mapper が算出する concat（api.md §4.6）。
 */
export interface ReplaceSearchItem {
  dokusya_id: number;
  kanri_shiten_id: number | null;
  kanri_shiten_name: string | null;
  shiten_id: number | null;
  shiten_name: string | null;
  kumiaiin_code: string;
  shimei: string;
  haitatsu_yubin_no: string;
  haitatsu_address: string;
  /** NULL 許容 — 未設定は null。 */
  hanbaiten_id: number | null;
  hanbaiten_code: string;
  hanbaiten_name: string;
  dokusya_shubetsu: number;
  shiharai_hoho: number;
}

/**
 * JOIN 済み生行（api.md §4.5 SELECT）→ replace-search レスポンス形へマップ。
 * shimei = shimei_sei + ' ' + shimei_mei；haitatsu_address = todofuken_name +
 * haitatsu_shikuchoson + haitatsu_chome_banchi + haitatsu_tatemono_mei（api.md §4.6）。
 * 生行は getRawMany() 由来なので全値を string から coerce。
 */
export function toReplaceSearchItem(
  row: Record<string, unknown>,
): ReplaceSearchItem {
  const sei = stringOrEmpty(row.shimei_sei);
  const mei = stringOrEmpty(row.shimei_mei);
  const todofuken = stringOrEmpty(row.todofuken_name);
  const shikuchoson = stringOrEmpty(row.haitatsu_shikuchoson);
  const chomeBanchi = stringOrEmpty(row.haitatsu_chome_banchi);
  const tatemono = stringOrEmpty(row.haitatsu_tatemono_mei);
  return {
    dokusya_id: coerceNumber(row.dokusya_id as number | string),
    kanri_shiten_id: coerceNullableNumber(
      row.kanri_shiten_id as RawScalarNullable,
    ),
    kanri_shiten_name: nullableString(row.kanri_shiten_name),
    shiten_id: coerceNullableNumber(row.shiten_id as RawScalarNullable),
    shiten_name: nullableString(row.shiten_name),
    kumiaiin_code: stringOrEmpty(row.kumiaiin_code),
    shimei: `${sei} ${mei}`.trim(),
    haitatsu_yubin_no: stringOrEmpty(row.haitatsu_yubin_no),
    haitatsu_address: `${todofuken}${shikuchoson}${chomeBanchi}${tatemono}`,
    hanbaiten_id: coerceNullableNumber(row.hanbaiten_id as number | string),
    hanbaiten_code: stringOrEmpty(row.hanbaiten_code),
    hanbaiten_name: stringOrEmpty(row.hanbaiten_name),
    dokusya_shubetsu: coerceNumber(row.dokusya_shubetsu as number | string),
    shiharai_hoho: coerceNumber(row.shiharai_hoho as number | string),
  };
}
