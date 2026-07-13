// Screen: ACSMS-SCR-020 — 口座振替データ出力画面
//
// Validates ExportKozaFurikaeDto — the POST /api/v1/koza-furikae/export body.
// Derived 1-to-1 from api.md §リクエストパラメータ (13 fields) + §4.1 バリデーション.

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExportKozaFurikaeDto } from '@/modules/koza-furikae/dto/export-koza-furikae.dto';
import { buildExportKozaFurikaeQuery } from '@test/fixtures/koza-furikae.factory';

const VALID = buildExportKozaFurikaeQuery();

const hasError = (errors: any[], field: string) =>
  errors.some((e) => e.property === field);

describe('ExportKozaFurikaeDto', () => {
  it('should pass validation when all fields are present and valid', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when optional id arrays are omitted', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, {
      ...VALID,
      kanri_shiten_ids: undefined,
      shiten_ids: undefined,
      koza_shiten_ids: undefined,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ─── target_month (required, YYYY-MM-DD) ──────────────────────────────
  it('should fail when target_month is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, target_month: undefined });
    expect(hasError(await validate(dto), 'target_month')).toBe(true);
  });

  it('should fail when target_month is an empty string', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, target_month: '' });
    expect(hasError(await validate(dto), 'target_month')).toBe(true);
  });

  it('should fail when target_month is not YYYY-MM-DD format', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, target_month: '2026/05/01' });
    expect(hasError(await validate(dto), 'target_month')).toBe(true);
  });

  // ─── hikiotoshi_date (required, YYYY-MM-DD) ───────────────────────────
  it('should fail when hikiotoshi_date is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, hikiotoshi_date: undefined });
    expect(hasError(await validate(dto), 'hikiotoshi_date')).toBe(true);
  });

  it('should fail when hikiotoshi_date is not YYYY-MM-DD format', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, hikiotoshi_date: '20260527' });
    expect(hasError(await validate(dto), 'hikiotoshi_date')).toBe(true);
  });

  // ─── kanri_shiten_ids / shiten_ids / koza_shiten_ids (optional number[]) ──
  it('should pass when kanri_shiten_ids is an empty array', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, kanri_shiten_ids: [] });
    expect(hasError(await validate(dto), 'kanri_shiten_ids')).toBe(false);
  });

  it('should fail when koza_shiten_ids contains a non-numeric element', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, koza_shiten_ids: ['x'] });
    expect(hasError(await validate(dto), 'koza_shiten_ids')).toBe(true);
  });

  // ─── jastem_itakusha_code (required, 半角英数字, max 10) ───────────────
  it('should fail when jastem_itakusha_code is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_itakusha_code: undefined });
    expect(hasError(await validate(dto), 'jastem_itakusha_code')).toBe(true);
  });

  it('should fail when jastem_itakusha_code exceeds 10 chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_itakusha_code: '12345678901' });
    expect(hasError(await validate(dto), 'jastem_itakusha_code')).toBe(true);
  });

  it('should fail when jastem_itakusha_code contains non-alphanumeric chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_itakusha_code: '12-3456' });
    expect(hasError(await validate(dto), 'jastem_itakusha_code')).toBe(true);
  });

  // ─── jastem_itakusha_name (required, max 40) ──────────────────────────
  it('should fail when jastem_itakusha_name is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_itakusha_name: undefined });
    expect(hasError(await validate(dto), 'jastem_itakusha_name')).toBe(true);
  });

  it('should fail when jastem_itakusha_name exceeds 40 chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_itakusha_name: 'あ'.repeat(41) });
    expect(hasError(await validate(dto), 'jastem_itakusha_name')).toBe(true);
  });

  // ─── jastem_ja_code (required, 半角数字, max 4) ────────────────────────
  it('should fail when jastem_ja_code is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_ja_code: undefined });
    expect(hasError(await validate(dto), 'jastem_ja_code')).toBe(true);
  });

  it('should fail when jastem_ja_code contains non-numeric chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_ja_code: '12A4' });
    expect(hasError(await validate(dto), 'jastem_ja_code')).toBe(true);
  });

  it('should fail when jastem_ja_code exceeds 4 digits', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_ja_code: '12345' });
    expect(hasError(await validate(dto), 'jastem_ja_code')).toBe(true);
  });

  // ─── jastem_ja_name (required, max 15) ────────────────────────────────
  it('should fail when jastem_ja_name is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_ja_name: undefined });
    expect(hasError(await validate(dto), 'jastem_ja_name')).toBe(true);
  });

  it('should fail when jastem_ja_name exceeds 15 chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_ja_name: 'あ'.repeat(16) });
    expect(hasError(await validate(dto), 'jastem_ja_name')).toBe(true);
  });

  // ─── jastem_toriatsukai_tenpo_code (required, 半角数字, max 3) ─────────
  it('should fail when jastem_toriatsukai_tenpo_code is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_toriatsukai_tenpo_code: undefined });
    expect(hasError(await validate(dto), 'jastem_toriatsukai_tenpo_code')).toBe(true);
  });

  it('should fail when jastem_toriatsukai_tenpo_code contains non-numeric chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_toriatsukai_tenpo_code: '0A1' });
    expect(hasError(await validate(dto), 'jastem_toriatsukai_tenpo_code')).toBe(true);
  });

  it('should fail when jastem_toriatsukai_tenpo_code exceeds 3 digits', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_toriatsukai_tenpo_code: '0011' });
    expect(hasError(await validate(dto), 'jastem_toriatsukai_tenpo_code')).toBe(true);
  });

  // ─── jastem_tenpo_name (required, max 15) ─────────────────────────────
  it('should fail when jastem_tenpo_name is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_tenpo_name: undefined });
    expect(hasError(await validate(dto), 'jastem_tenpo_name')).toBe(true);
  });

  // ─── jastem_tyokin_shubetsu (required, "1"/"2"/"9") ───────────────────
  it('should fail when jastem_tyokin_shubetsu is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_tyokin_shubetsu: undefined });
    expect(hasError(await validate(dto), 'jastem_tyokin_shubetsu')).toBe(true);
  });

  it('should fail when jastem_tyokin_shubetsu is not one of 1/2/9', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_tyokin_shubetsu: '3' });
    expect(hasError(await validate(dto), 'jastem_tyokin_shubetsu')).toBe(true);
  });

  it('should pass when jastem_tyokin_shubetsu is 9 (その他)', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_tyokin_shubetsu: '9' });
    expect(hasError(await validate(dto), 'jastem_tyokin_shubetsu')).toBe(false);
  });

  // ─── jastem_koza_no (required, 半角数字, max 7) ────────────────────────
  it('should fail when jastem_koza_no is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_koza_no: undefined });
    expect(hasError(await validate(dto), 'jastem_koza_no')).toBe(true);
  });

  it('should fail when jastem_koza_no contains non-numeric chars', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_koza_no: '12345A7' });
    expect(hasError(await validate(dto), 'jastem_koza_no')).toBe(true);
  });

  it('should fail when jastem_koza_no exceeds 7 digits', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, jastem_koza_no: '12345678' });
    expect(hasError(await validate(dto), 'jastem_koza_no')).toBe(true);
  });

  // ─── rows (required, non-empty, edited 金額 per dokusya_id) — v1.1 ──────
  it('should fail when rows is missing', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, rows: undefined });
    expect(hasError(await validate(dto), 'rows')).toBe(true);
  });

  it('should fail when rows is an empty array', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, { ...VALID, rows: [] });
    expect(hasError(await validate(dto), 'rows')).toBe(true);
  });

  it('should fail when a row furikae_kingaku is negative', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, {
      ...VALID,
      rows: [{ dokusya_id: 1, furikae_kingaku: -1 }],
    });
    expect(hasError(await validate(dto), 'rows')).toBe(true);
  });

  it('should fail when a row furikae_kingaku exceeds 10 digits (> 9,999,999,999)', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, {
      ...VALID,
      rows: [{ dokusya_id: 1, furikae_kingaku: 10_000_000_000 }],
    });
    expect(hasError(await validate(dto), 'rows')).toBe(true);
  });

  it('should pass when rows carry valid dokusya_id + 0..9,999,999,999 amounts', async () => {
    const dto = plainToInstance(ExportKozaFurikaeDto, {
      ...VALID,
      rows: [
        { dokusya_id: 1, furikae_kingaku: 0 },
        { dokusya_id: 2, furikae_kingaku: 9_999_999_999 },
      ],
    });
    expect(hasError(await validate(dto), 'rows')).toBe(false);
  });
});
