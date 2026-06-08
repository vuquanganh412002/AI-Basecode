import { Tanka } from '@/database/entities/tanka.entity';
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
    if (typeof tanka.tekiyoStartDate === 'string') return tanka.tekiyoStartDate;
    if (tanka.tekiyoStartDate) {
      return (tanka.tekiyoStartDate as unknown as Date).toISOString().slice(0, 10);
    }
    return '';
  }

  function tekiyoEndDateIso(): string | null {
    if (tanka.tekiyoEndDate === null || tanka.tekiyoEndDate === undefined) return null;
    if (typeof tanka.tekiyoEndDate === 'string') return tanka.tekiyoEndDate;
    return (tanka.tekiyoEndDate as unknown as Date).toISOString().slice(0, 10);
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
