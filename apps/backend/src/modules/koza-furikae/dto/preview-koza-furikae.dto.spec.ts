// Screen: ACSMS-SCR-020 — 口座振替データ出力画面（v1.1 プレビュー）
//
// Validates PreviewKozaFurikaeDto — the POST /api/v1/koza-furikae/preview body.
// 集計フィルタのみ（target_month + hikiotoshi_date + 絞込ID群）。JASTEM / 金額は不要。

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PreviewKozaFurikaeDto } from '@/modules/koza-furikae/dto/preview-koza-furikae.dto';
import { buildPreviewKozaFurikaeQuery } from '@test/fixtures/koza-furikae.factory';

const VALID = buildPreviewKozaFurikaeQuery();

const hasError = (errors: any[], field: string) =>
  errors.some((e) => e.property === field);

describe('PreviewKozaFurikaeDto', () => {
  it('should pass validation when target_month + hikiotoshi_date are present and valid', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, VALID);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should pass when optional id arrays are omitted', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, {
      target_month: '2026-05-01',
      hikiotoshi_date: '2026-05-27',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail when target_month is missing', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, { ...VALID, target_month: undefined });
    expect(hasError(await validate(dto), 'target_month')).toBe(true);
  });

  it('should fail when target_month is not YYYY-MM-DD', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, { ...VALID, target_month: '2026/05/01' });
    expect(hasError(await validate(dto), 'target_month')).toBe(true);
  });

  it('should fail when hikiotoshi_date is missing', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, { ...VALID, hikiotoshi_date: undefined });
    expect(hasError(await validate(dto), 'hikiotoshi_date')).toBe(true);
  });

  it('should fail when koza_shiten_ids contains a non-numeric element', async () => {
    const dto = plainToInstance(PreviewKozaFurikaeDto, { ...VALID, koza_shiten_ids: ['x'] });
    expect(hasError(await validate(dto), 'koza_shiten_ids')).toBe(true);
  });
});
