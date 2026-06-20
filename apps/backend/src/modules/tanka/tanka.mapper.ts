import { Tanka } from '@/database/entities/tanka.entity';
import { dateOnlyIsoJst } from '@/common/utils/datetime';
import { TankaResponseDto } from './dto/tanka-response.dto';

/**
 * Map a `Tanka` entity (camelCase columns) to the snake_case
 * `TankaResponseDto` shape the API serializes.
 *
 * Pure — no Nest DI, no IO. Safe to import from controllers, services,
 * specs, or other mappers.
 */
export function toTankaResponse(tanka: Tanka): TankaResponseDto {
  function tekiyoStartDateIso(): string {
    // DATE 列。文字列('YYYY-MM-DD')はそのまま、Date は JST 暦日へ
    // (toISOString().slice は UTC で早朝に1日ずれるため使わない)。
    return dateOnlyIsoJst(tanka.tekiyoStartDate);
  }

  function tekiyoEndDateIso(): string | null {
    if (tanka.tekiyoEndDate === null || tanka.tekiyoEndDate === undefined) return null;
    return dateOnlyIsoJst(tanka.tekiyoEndDate);
  }

  return {
    tanka_id: Number(tanka.tankaId),
    ja_id: Number(tanka.jaId),
    tanka_type: Number(tanka.tankaType),
    tanka_code: tanka.tankaCode,
    tanka_name: tanka.tankaName,
    kingaku_zeikomi: Number(tanka.kingakuZeikomi),
    kingaku_zeinuki: Number(tanka.kingakuZeinuki),
    tax_rate: Number(tanka.taxRate),
    tekiyo_start_date: tekiyoStartDateIso(),
    tekiyo_end_date: tekiyoEndDateIso(),
    biko: tanka.biko ?? '',
    active_flg: Boolean(tanka.activeFlg),
    campaign_flg: Boolean(tanka.campaignFlg),
    created_at: tanka.createdAt ? tanka.createdAt.toISOString() : '',
    updated_at: tanka.updatedAt ? tanka.updatedAt.toISOString() : null,
  };
}
