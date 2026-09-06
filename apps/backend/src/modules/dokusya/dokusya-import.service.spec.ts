// resolveImportTargetId（DokusyaImportService の private ヘルパ）の多層防御を
// 検証する。§4.3.4 — 通常更新は dokusya_id 必須・kumiaiin_code フォールバック
// 廃止（不具合修正2026-08）。この不変条件は validator（classifyImportRow）が
// 一次防御だが、書込み層自身も独立に守ることで validator 呼び出し漏れ・改修
// ミスに対する多層防御にする（ユーザー要望 2026-08）。

import { DokusyaImportService } from './dokusya-import.service';
import type { ImportDokusyaRowDto } from './dto/import-dokusya.dto';

/** 直接呼び出すための private メソッドの型（テスト専用キャスト）。 */
type ResolveImportTargetId = (
  manager: { query: (...args: unknown[]) => Promise<unknown> },
  jaId: number,
  row: ImportDokusyaRowDto,
  isBulkStop: boolean,
) => Promise<number | null>;

describe('DokusyaImportService — resolveImportTargetId (多層防御・不具合修正2026-08)', () => {
  let service: DokusyaImportService;
  let queryMock: jest.Mock;
  let manager: { query: jest.Mock };

  beforeEach(() => {
    // resolveImportTargetId は manager.query しか使わないため、コンストラクタの
    // 他の依存（auditLog/codeService 等）はこのテストでは未使用でよい。
    service = new DokusyaImportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    queryMock = jest.fn();
    manager = { query: queryMock };
  });

  function resolve(
    row: ImportDokusyaRowDto,
    isBulkStop: boolean,
  ): Promise<number | null> {
    const fn = (service as unknown as { resolveImportTargetId: ResolveImportTargetId })
      .resolveImportTargetId;
    return fn.call(service, manager, 1, row, isBulkStop);
  }

  it('should resolve by dokusya_id (normal update, isBulkStop=false) without touching kumiaiin_code at all', async () => {
    queryMock.mockResolvedValueOnce([{ dokusya_id: 100 }]);
    const id = await resolve(
      { dokusya_id: 100, kumiaiin_code: 'K0001' } as unknown as ImportDokusyaRowDto,
      false,
    );
    expect(id).toBe(100);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('dokusya_id = $2::bigint');
    expect(queryMock.mock.calls[0][0]).not.toContain('kumiaiin_code');
  });

  it('should return null for a normal update row (isBulkStop=false) with NO dokusya_id — even when kumiaiin_code would have matched a real row (書込み層自身の多層防御)', async () => {
    // 通常更新で dokusya_id が無い行は validator が先に「IDは必須です。」で
    // 弾くはずだが、万一ここに到達しても kumiaiin_code へフォールバックせず
    // null を返す（＝何も更新しない）ことを確認する。
    const id = await resolve(
      { kumiaiin_code: 'K0001' } as unknown as ImportDokusyaRowDto,
      false,
    );
    expect(id).toBeNull();
    // kumiaiin_code での検索クエリは一切発行されない。
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('should fall back to kumiaiin_code when isBulkStop=true and dokusya_id is absent', async () => {
    queryMock.mockResolvedValueOnce([{ dokusya_id: 200 }]);
    const id = await resolve(
      { kumiaiin_code: 'K0002' } as unknown as ImportDokusyaRowDto,
      true,
    );
    expect(id).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('kumiaiin_code = $2');
  });

  it('should resolve by dokusya_id even when isBulkStop=true (ID always takes priority)', async () => {
    queryMock.mockResolvedValueOnce([{ dokusya_id: 300 }]);
    const id = await resolve(
      { dokusya_id: 300, kumiaiin_code: 'K0003' } as unknown as ImportDokusyaRowDto,
      true,
    );
    expect(id).toBe(300);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('dokusya_id = $2::bigint');
  });

  it('should return null when isBulkStop=true, no dokusya_id, and no kumiaiin_code either', async () => {
    const id = await resolve({} as unknown as ImportDokusyaRowDto, true);
    expect(id).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
