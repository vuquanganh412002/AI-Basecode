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
  return {
    tanka_id: Number(tanka.tankaId),
    ja_id: Number(tanka.jaId),
    tanka_type: Number(tanka.tankaType),
    tanka_code: tanka.tankaCode,
    tanka_name: tanka.tankaName,
    kingaku_zeikomi: Number(tanka.kingakuZeikomi),
    kingaku_zeinuki: Number(tanka.kingakuZeinuki),
    tax_rate: Number(tanka.taxRate),
    tekiyo_start_date:
      typeof tanka.tekiyoStartDate === 'string'
        ? tanka.tekiyoStartDate
        : tanka.tekiyoStartDate
          ? (tanka.tekiyoStartDate as unknown as Date).toISOString().slice(0, 10)
          : '',
    tekiyo_end_date:
      tanka.tekiyoEndDate === null || tanka.tekiyoEndDate === undefined
        ? null
        : typeof tanka.tekiyoEndDate === 'string'
          ? tanka.tekiyoEndDate
          : (tanka.tekiyoEndDate as unknown as Date).toISOString().slice(0, 10),
    biko: tanka.biko ?? '',
    active_flg: Boolean(tanka.activeFlg),
    created_at: tanka.createdAt ? tanka.createdAt.toISOString() : '',
    updated_at: tanka.updatedAt ? tanka.updatedAt.toISOString() : null,
  };
}
