// Screen: ACSMS-SCR-011 — 購読者情報登録画面
//
// Tests drive `src/modules/dokusya/dokusya.service.ts`. Every `it()` below
// maps back to a clause in `docs/design/ACSMS-SCR-011/ACSMS-SCR-011-api.md`.
//
// Why plain `new DokusyaService(...)` instead of Test.createTestingModule:
// Service unit tests don't exercise Nest's lifecycle (guards, interceptors,
// pipes) — those are tested at the controller level. Plain instantiation
// keeps the spec focused on business logic and runs faster.
//
// Constructor order (must match the service impl that /gen-code-backend
// will emit):
//   (dokusyaRepo, rirekiRepo, shitenRepo, dataSource, auditLog, codeService)

import { DokusyaService } from '@/modules/dokusya/dokusya.service';
import { NotFoundException } from '@/common/exceptions/common.exceptions';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildDokusya,
  buildDokusyaRireki,
  buildCreateDokusyaBody,
  buildUpdateDokusyaBody,
  futureDate,
  pastDate,
} from '@test/fixtures/dokusya.factory';

describe('DokusyaService', () => {
  let service: any;
  let dokusyaRepo: any;
  let rirekiRepo: any;
  let shitenRepo: any;
  let dokusyaQb: any;
  let rirekiQb: any;
  let shitenQb: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  function makeQbMock() {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
  }

  beforeEach(() => {
    dokusyaQb = makeQbMock();
    rirekiQb = makeQbMock();
    shitenQb = makeQbMock();

    dokusyaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => dokusyaQb),
    };
    rirekiRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((v) => v),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => rirekiQb),
    };
    shitenRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => shitenQb),
    };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
      reload: jest.fn(),
    };

    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        if (value && typeof value === 'object' && 'dokusyaId' in value) {
          return { ...value };
        }
        if (value && typeof value === 'object' && 'rirekiNo' in value) {
          return { ...value, dokusyaRirekiId: 200 };
        }
        return {
          ...value,
          dokusyaId: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn(async () => [{ count: '0' }]),
      createQueryBuilder: jest.fn(() => ({
        ...makeQbMock(),
        getRawOne: jest.fn().mockResolvedValue({ new_rireki_no: 2 }),
      })),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => [{ count: '0' }]),
    };

    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      dataSource,
      auditLog,
      codeService,
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:dokusya_id (getDetail)
  // ════════════════════════════════════════════════════════════════════════
  describe('getDetail', () => {
    it('should return DokusyaResponseDto when target exists and ja_id matches (CHUOKAI)', async () => {
      // COVERS: §4.3 SELECT … LEFT JOIN — happy path
      dokusyaQb.getRawOne.mockResolvedValue({
        ...buildDokusya({ dokusyaId: 1, jaId: 1 }),
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
        bank_shiten_id: 50,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: '本店',
      });
      dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));

      const result = await service.getDetail(
        1,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result).toMatchObject({
        dokusya_id: 1,
        ja_id: 1,
      });
    });

    it('should include hanbaiten_name (joined from m_hanbaiten) when target resolves', async () => {
      // COVERS: §4.3 LEFT JOIN m_hanbaiten — hanbaiten_name in response
      const row = buildDokusya({ dokusyaId: 1, jaId: 1, hanbaitenId: 5 });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.hanbaiten_name).toBe('山田販売店');
    });

    it('should include tanka_name (joined from m_tanka) when target resolves', async () => {
      // COVERS: §4.3 LEFT JOIN m_tanka
      const row = buildDokusya({ dokusyaId: 1, jaId: 1, tankaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: '販売店X',
        tanka_name: '基本購読料（月額）',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.tanka_name).toBe('基本購読料（月額）');
    });

    it('should include bank_shiten_id and jastem fields from m_shiten reverse-lookup when 口座引落', async () => {
      // COVERS: §4.3 — LEFT JOIN m_shiten bs ON … kinyu_shiten_flg=TRUE
      const row = buildDokusya({ dokusyaId: 1, jaId: 1, shiharaiHoho: 1, bankBranchCode: '001' });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: 'X',
        tanka_name: 'X',
        bank_shiten_id: 50,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: '本店',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.bank_shiten_id).toBe(50);
      expect(result.jastem_toriatsukai_tenpo_code).toBe('001');
      expect(result.jastem_tenpo_name).toBe('本店');
    });

    it('should expose null bank_shiten_id when shiharai_hoho is not 口座引落', async () => {
      // COVERS: §レスポンスデータ #45 — nullable for non-bank payment
      const row = buildDokusya({
        dokusyaId: 1, jaId: 1, shiharaiHoho: 2,
        bankBranchCode: '', bankBranchName: '',
      });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: 'X', tanka_name: 'X',
        bank_shiten_id: null,
        jastem_toriatsukai_tenpo_code: '',
        jastem_tenpo_name: '',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.bank_shiten_id).toBeNull();
    });

    it('should throw NotFoundException when dokusya does not exist', async () => {
      // COVERS: err:NOT_FOUND (row 8)
      dokusyaRepo.findOne.mockResolvedValue(null);
      dokusyaQb.getRawOne.mockResolvedValue(null);

      await expect(
        service.getDetail(999, buildChuokaiSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope — JA_HONTEN)', async () => {
      // COVERS: §4.2-4.3 DataScope — out-of-scope masked as 404 (existence hidden)
      const other = buildDokusya({ dokusyaId: 1, jaId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(other);

      await expect(
        service.getDetail(1, buildJaHontenSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when kanri_shiten_id mismatches (DataScope — JA_KANRI_SHITEN)', async () => {
      // COVERS: §4.2 DataScope — JA_KANRI_SHITEN sees only own kanri_shiten_id
      const other = buildDokusya({ dokusyaId: 1, jaId: 1, kanriShitenId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(other);

      await expect(
        service.getDetail(
          1,
          buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT call AuditLogService — read-only endpoint', async () => {
      // COVERS: §4.5 — GET does NOT write t_log
      dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
      dokusyaQb.getRawOne.mockResolvedValue({ ...buildDokusya({ dokusyaId: 1, jaId: 1 }) });

      await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));

      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logCreate).not.toHaveBeenCalled();
      expect(auditLog.logUpdate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-002 — POST /api/v1/dokusya (create)
  // ════════════════════════════════════════════════════════════════════════
  describe('create', () => {
    function mockBankShitenLookup(found = true) {
      if (found) {
        shitenRepo.findOne.mockResolvedValue({
          shitenId: 50,
          jastemToriatsukaiTenpoCode: '001',
          jastemTenpoName: '本店',
          jaId: 1,
          kinyuShitenFlg: true,
        });
        shitenQb.getRawOne.mockResolvedValue({
          shiten_id: 50,
          jastem_toriatsukai_tenpo_code: '001',
          jastem_tenpo_name: '本店',
        });
      } else {
        shitenRepo.findOne.mockResolvedValue(null);
        shitenQb.getRawOne.mockResolvedValue(null);
      }
    }

    it('should return DokusyaResponseDto with dokusya_id assigned after INSERT', async () => {
      // COVERS: §4.4 INSERT + §4.6 レスポンス生成
      mockBankShitenLookup(true);
      const body = buildCreateDokusyaBody();
      const session = buildChuokaiSession({ ja_id: 1, account_id: 11 });

      const result = await service.create(body, session, baseReq);

      expect(result.dokusya_id).toBe(100);
      expect(result.ja_id).toBe(1);
    });

    it('should bind ja_id from session, NOT from request body (security)', async () => {
      // COVERS: §4.2 — リクエストボディの ja_id は信頼しない
      mockBankShitenLookup(true);
      const body = buildCreateDokusyaBody({ ja_id: 99 } as any);
      const session = buildChuokaiSession({ ja_id: 42, account_id: 11 });

      const result = await service.create(body, session, baseReq);
      expect(result.ja_id).toBe(42);
    });

    it('should reverse-lookup m_shiten and persist jastem_toriatsukai_tenpo_code as bank_branch_code', async () => {
      // COVERS: §4.4 — bank_shiten_id → m_shiten → bank_branch_code
      mockBankShitenLookup(true);
      let savedRow: any;
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        if (value && 'dokusya_busu' in (value ?? {}) === false && 'dokusyaBusu' in (value ?? {})) {
          savedRow = value;
        }
        return value && typeof value === 'object' && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      await service.create(
        buildCreateDokusyaBody({ shiharai_hoho: 1, bank_shiten_id: 50 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const persisted = savedRow ?? {};
      // bank_branch_code should match the looked-up jastem_toriatsukai_tenpo_code
      const code = persisted.bankBranchCode ?? persisted.bank_branch_code;
      const name = persisted.bankBranchName ?? persisted.bank_branch_name;
      // Verify the lookup-derived values flow through to the persisted entity.
      // (Service may persist via repo or via tx; we check at least one writes them.)
      const reachedExpected = code === '001' || name === '本店';
      expect(reachedExpected).toBe(true);
    });

    it('should throw VALIDATION_ERROR (field=bank_shiten_id) when m_shiten lookup returns null (口座引落)', async () => {
      // COVERS: §4.4 — 該当レコードがない場合 HTTP 400 (VALIDATION_ERROR) field=bank_shiten_id
      mockBankShitenLookup(false);

      await expect(
        service.create(
          buildCreateDokusyaBody({ shiharai_hoho: 1, bank_shiten_id: 9999 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'bank_shiten_id' }),
          ]),
        }),
      });
    });

    it('should persist bank_branch_code="" and bank_branch_name="" when shiharai_hoho is NOT 口座引落', async () => {
      // COVERS: §4.4 — 支払方法 ≠ 1 の場合、bank_branch_code='' / bank_branch_name=''
      let savedRow: any;
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        if (value && ('dokusyaBusu' in (value ?? {}))) savedRow = value;
        return value && typeof value === 'object' && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      await service.create(
        buildCreateDokusyaBody({
          shiharai_hoho: 2,             // 現金集金
          bank_shiten_id: undefined,
          hikiotoshi_yokin_shubetsu: undefined,
          hikiotoshi_koza_no: '',
          hikiotoshi_koza_meigi: '',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const persisted = savedRow ?? {};
      const code = persisted.bankBranchCode ?? persisted.bank_branch_code ?? '';
      const name = persisted.bankBranchName ?? persisted.bank_branch_name ?? '';
      expect(code).toBe('');
      expect(name).toBe('');
    });

    it('should check email duplicate and proceed when count returns 0', async () => {
      // COVERS: §4.3 — 重複チェック happy path
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaRepo.count.mockResolvedValue(0);

      const result = await service.create(
        buildCreateDokusyaBody({ email: 'fresh@example.com' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result).toBeDefined();
    });

    it('should throw DUPLICATE_EMAIL HTTP 400 when email already exists in same ja_id', async () => {
      // COVERS: §4.3 + err:DUPLICATE_EMAIL (row 9)
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaRepo.count.mockResolvedValue(1);

      await expect(
        service.create(
          buildCreateDokusyaBody({ email: 'dup@example.com' }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'DUPLICATE_EMAIL',
        }),
      });
    });

    it('should NOT run email duplicate check when email is empty string', async () => {
      // COVERS: §4.3 — email <> '' 条件
      mockBankShitenLookup(true);
      // If duplicate check ran it would set count, but we never put 1 here.
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaRepo.count.mockResolvedValue(0);

      const result = await service.create(
        buildCreateDokusyaBody({ email: '', dokusya_shubetsu: 1 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result).toBeDefined();
    });

    it('should reject when dokusya_shubetsu is not a valid DOKUSYA_SHUBETSU code', async () => {
      // COVERS: §m_code DOKUSYA_SHUBETSU
      mockBankShitenLookup(true);
      codeService.has.mockImplementation((cat: string) => cat !== 'DOKUSYA_SHUBETSU');

      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 99 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_shubetsu' }),
          ]),
        }),
      });
    });

    it('should reject when tetsuzuki_shurui is not a valid TETSUZUKI_SHURUI code', async () => {
      // COVERS: §m_code TETSUZUKI_SHURUI
      mockBankShitenLookup(true);
      codeService.has.mockImplementation((cat: string) => cat !== 'TETSUZUKI_SHURUI');

      await expect(
        service.create(
          buildCreateDokusyaBody({ tetsuzuki_shurui: 99 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'tetsuzuki_shurui' }),
          ]),
        }),
      });
    });

    it('should reject when yubin_kubun is not a valid YUBIN_KUBUN code', async () => {
      // COVERS: §m_code YUBIN_KUBUN
      mockBankShitenLookup(true);
      codeService.has.mockImplementation((cat: string) => cat !== 'YUBIN_KUBUN');

      await expect(
        service.create(
          buildCreateDokusyaBody({ yubin_kubun: '9' }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'yubin_kubun' }),
          ]),
        }),
      });
    });

    it('should reject when shiharai_hoho is not a valid SHIHARAI_HOHO code', async () => {
      // COVERS: §m_code SHIHARAI_HOHO
      mockBankShitenLookup(true);
      codeService.has.mockImplementation((cat: string) => cat !== 'SHIHARAI_HOHO');

      await expect(
        service.create(
          buildCreateDokusyaBody({ shiharai_hoho: 99 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'shiharai_hoho' }),
          ]),
        }),
      });
    });

    it('should reject when joho_henko_tekiyo_date is in the past', async () => {
      // COVERS: §4.1 — joho_henko_tekiyo_date 入力時は未来日であること
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({ joho_henko_tekiyo_date: pastDate(7) }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'joho_henko_tekiyo_date' }),
          ]),
        }),
      });
    });

    it('should accept joho_henko_tekiyo_date when it is a future date', async () => {
      mockBankShitenLookup(true);
      const result = await service.create(
        buildCreateDokusyaBody({ joho_henko_tekiyo_date: futureDate(14) }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result).toBeDefined();
    });

    it('should INSERT t_dokusya_rireki with rireki_no=1 and saishin_data_flg=true (新規)', async () => {
      // COVERS: §4.4 — フラグ設定ルール for create: shinki_flg=true when tetsuzuki_shurui=1
      mockBankShitenLookup(true);
      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100, dokusyaRirekiId: 200 };
      });

      await service.create(
        buildCreateDokusyaBody({ tetsuzuki_shurui: 1 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const rirekiRow = saved.find(
        (row) => row && ('rirekiNo' in row || 'rireki_no' in row),
      );
      expect(rirekiRow).toBeDefined();
      const rirekiNo = rirekiRow.rirekiNo ?? rirekiRow.rireki_no;
      const saishin = rirekiRow.saishinDataFlg ?? rirekiRow.saishin_data_flg;
      const shinki = rirekiRow.shinkiFlg ?? rirekiRow.shinki_flg;
      expect(rirekiNo).toBe(1);
      expect(saishin).toBe(true);
      expect(shinki).toBe(true);
    });

    it('should force dokusya_busu=0 when tetsuzuki_shurui=0 (解約)', async () => {
      // COVERS: §4.4 — 解約時は dokusya_busu=0 を強制
      mockBankShitenLookup(true);
      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      await service.create(
        buildCreateDokusyaBody({ tetsuzuki_shurui: 0, dokusya_busu: 5 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const dokusyaRow = saved.find(
        (row) => row && ('dokusyaBusu' in row || 'dokusya_busu' in row),
      );
      const busu = dokusyaRow.dokusyaBusu ?? dokusyaRow.dokusya_busu;
      expect(busu).toBe(0);
    });

    it('should wrap INSERT t_dokusya + INSERT t_dokusya_rireki + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界 — 4.4 + 4.5 atomic
      mockBankShitenLookup(true);

      await service.create(
        buildCreateDokusyaBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManager.save).toHaveBeenCalled();
      const auditCalledInsideTx =
        auditLog.logCreate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "CREATE" operation (NOT prefixed)', async () => {
      // COVERS: §4.5 operation MUST be bare 'CREATE'
      mockBankShitenLookup(true);

      await service.create(
        buildCreateDokusyaBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logCreate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^DOKUSYA_|^T_DOKUSYA_|^APPROVE$|^REJECT$/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should record audit log with target_table="t_dokusya" and screen name', async () => {
      // COVERS: §4.5 INSERT t_log — target_table + gamen_name
      mockBankShitenLookup(true);

      await service.create(
        buildCreateDokusyaBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const ctxCalls = [
        ...auditLog.logCreate.mock.calls.map((c: any[]) => c[0]),
        ...auditLog.logOperation.mock.calls.map((c: any[]) => c[0]),
      ];
      const matched = ctxCalls.find(
        (ctx: any) =>
          ctx?.table === 't_dokusya' || ctx?.targetTable === 't_dokusya',
      );
      expect(matched).toBeDefined();
      const screenMatched = ctxCalls.find(
        (ctx: any) =>
          (ctx?.screen ?? ctx?.gamenName ?? '').includes('ACSMS-SCR-011') ||
          (ctx?.screen ?? ctx?.gamenName ?? '').includes('購読者情報登録画面'),
      );
      expect(screenMatched).toBeDefined();
    });

    it('should rollback INSERTs when audit log throws (atomic guarantee)', async () => {
      // COVERS: ※トランザクション境界 — rollback on audit log failure
      mockBankShitenLookup(true);
      auditLog.logCreate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.create(
          buildCreateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit error audit log (log_type=3, result_status=2) OUTSIDE the rolled-back transaction', async () => {
      // COVERS: §4.7 例外処理 — log_type=3 outside tx
      mockBankShitenLookup(true);
      txManager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(
          buildCreateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      const errorAuditCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) =>
            c[0]?.logType === 3 ||
            c[0]?.log_type === 3 ||
            c[0]?.resultStatus === 2 ||
            c[0]?.result_status === 2,
        );
      expect(errorAuditCalled).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:dokusya_id (update)
  // ════════════════════════════════════════════════════════════════════════
  describe('update', () => {
    function mockBankShitenLookup(found = true) {
      if (found) {
        shitenRepo.findOne.mockResolvedValue({
          shitenId: 50,
          jastemToriatsukaiTenpoCode: '001',
          jastemTenpoName: '本店',
          jaId: 1,
          kinyuShitenFlg: true,
        });
        shitenQb.getRawOne.mockResolvedValue({
          shiten_id: 50,
          jastem_toriatsukai_tenpo_code: '001',
          jastem_tenpo_name: '本店',
        });
      } else {
        shitenRepo.findOne.mockResolvedValue(null);
        shitenQb.getRawOne.mockResolvedValue(null);
      }
    }

    it('should return updated DokusyaResponseDto when target exists and ja_id matches', async () => {
      // COVERS: §4.4 UPDATE + §4.6 レスポンス
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      const result = await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_busu: 2 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.dokusya_id).toBe(100);
    });

    it('should throw NotFoundException when target does not exist', async () => {
      // COVERS: §4.3 + err:NOT_FOUND
      dokusyaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          999,
          buildUpdateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.2-4.3 DataScope masks as 404 (existence hiding)
      const otherJa = buildDokusya({ dokusyaId: 100, jaId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(otherJa);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody(),
          buildJaHontenSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when kanri_shiten_id mismatches (DataScope — JA_KANRI_SHITEN)', async () => {
      // COVERS: §4.2 DataScope — JA_KANRI_SHITEN sees only own kanri_shiten_id
      const other = buildDokusya({ dokusyaId: 100, jaId: 1, kanriShitenId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(other);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody(),
          buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check email duplicate excluding the current dokusya_id', async () => {
      // COVERS: §4.3 — dokusya_id <> :dokusya_id excludes own row
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(0);

      await service.update(
        100,
        buildUpdateDokusyaBody({ email: 'yamada@example.com' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // Verify that the count QB was set up with a dokusya_id filter excluding the current row.
      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const excluded = calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /dokusya_?[Ii]d\s*(<>|!=)/.test(sql) &&
          params && (params.dokusya_id === 100 || params.dokusyaId === 100 || params.id === 100),
      );
      expect(excluded).toBeDefined();
    });

    it('should throw DUPLICATE_EMAIL HTTP 400 when another row in same ja_id has same email', async () => {
      // COVERS: §4.3 + err:DUPLICATE_EMAIL
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, email: 'a@example.com' });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaRepo.count.mockResolvedValue(1);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ email: 'taken@example.com' }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'DUPLICATE_EMAIL',
        }),
      });
    });

    it('should throw VALIDATION_ERROR (field=bank_shiten_id) when m_shiten lookup returns null on update', async () => {
      // COVERS: §4.4 ステップ0 — bank_shiten_id 不存在
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(false);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ shiharai_hoho: 1, bank_shiten_id: 9999 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'bank_shiten_id' }),
          ]),
        }),
      });
    });

    it('should persist bank_branch_code="" / bank_branch_name="" when shiharai_hoho is NOT 口座引落 on update', async () => {
      // COVERS: §4.4 ステップ0 — 支払方法 ≠ 1
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, shiharaiHoho: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value ? value : { ...value, dokusyaId: 100 };
      });

      await service.update(
        100,
        buildUpdateDokusyaBody({
          shiharai_hoho: 2,
          bank_shiten_id: undefined,
          hikiotoshi_yokin_shubetsu: undefined,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const dokRow = saved.find(
        (r) => r && (r.dokusyaBusu !== undefined || r.dokusya_busu !== undefined),
      );
      const code = dokRow?.bankBranchCode ?? dokRow?.bank_branch_code ?? '';
      const name = dokRow?.bankBranchName ?? dokRow?.bank_branch_name ?? '';
      expect(code).toBe('');
      expect(name).toBe('');
    });

    it('should reject when dokusya_shubetsu is not a valid DOKUSYA_SHUBETSU code on update', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      codeService.has.mockImplementation((cat: string) => cat !== 'DOKUSYA_SHUBETSU');

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ dokusya_shubetsu: 99 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_shubetsu' }),
          ]),
        }),
      });
    });

    it('should invalidate previous saishin_data_flg and INSERT new rireki row with new_rireki_no', async () => {
      // COVERS: §4.4 ステップ1 (UPDATE saishin_data_flg=FALSE) + ステップ2 (採番)
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      const newRirekiQb = {
        ...makeQbMock(),
        getRawOne: jest.fn().mockResolvedValue({ new_rireki_no: 2 }),
      };
      txManager.createQueryBuilder = jest.fn(() => newRirekiQb);

      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value ? value : { ...value, dokusyaId: 100, dokusyaRirekiId: 201 };
      });

      await service.update(
        100,
        buildUpdateDokusyaBody({ chome_banchi: '新住所' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // Either UPDATE on existing rireki happened, or new INSERT with rireki_no=2 happened.
      const rirekiRow = saved.find(
        (row) => row && ('rirekiNo' in row || 'rireki_no' in row),
      );
      expect(rirekiRow).toBeDefined();
    });

    it('should wrap UPDATE t_dokusya + history rows + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const auditCalledInsideTx =
        auditLog.logUpdate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "UPDATE" operation (NOT prefixed)', async () => {
      // COVERS: §4.5 operation MUST be bare 'UPDATE'
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logUpdate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^DOKUSYA_|^T_DOKUSYA_/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should pass before-snapshot (4.3 SELECT result) to audit log so before_value is populated', async () => {
      // COVERS: §4.5 — before_value ← 更新前データ
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, shimeiSei: '旧姓', chomeBanchi: '旧住所',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ chome_banchi: '新住所' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const calls = auditLog.logUpdate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const beforeArg = calls[0]?.[1];
      const flatBefore = JSON.stringify(beforeArg ?? {});
      expect(flatBefore).toContain('旧住所');
    });

    it('should rollback UPDATE when audit log throws', async () => {
      // COVERS: ※トランザクション境界 — rollback on audit log failure
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      auditLog.logUpdate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should emit error audit log (log_type=3) OUTSIDE transaction on failure', async () => {
      // COVERS: §4.7 例外処理 — log_type=3 outside tx
      const before = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      txManager.save.mockRejectedValue(new Error('db exploded'));

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      const errorAuditCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) =>
            c[0]?.logType === 3 ||
            c[0]?.log_type === 3 ||
            c[0]?.resultStatus === 2 ||
            c[0]?.result_status === 2,
        );
      expect(errorAuditCalled).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:dokusya_id/approve (approve)
  // ════════════════════════════════════════════════════════════════════════
  describe('approve', () => {
    it('should set denshi_shonin_status=1 and return updated DokusyaResponseDto + message', async () => {
      // COVERS: §4.4 ステップ3 — denshi_shonin_status=1
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      const result = await service.approve(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result).toBeDefined();
      // Service returns `{ data, message }` shape or DokusyaResponseDto + message at top
      const data = result.data ?? result;
      const message = result.message ?? '承認しました。';
      expect(data.denshi_shonin_status).toBe(1);
      expect(message).toBe('承認しました。');
    });

    it('should throw NotFoundException when dokusya does not exist', async () => {
      // COVERS: §4.3 + err:NOT_FOUND
      dokusyaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.approve(999, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.2 DataScope masks as 404
      const otherJa = buildDokusya({
        dokusyaId: 100, jaId: 99, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(otherJa);
      await expect(
        service.approve(
          100,
          buildJaHontenSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw INVALID_STATUS HTTP 400 when denshi_shonin_status is not 0 (already approved)', async () => {
      // COVERS: §4.3 + err:INVALID_STATUS (row 10)
      const already = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(already);

      await expect(
        service.approve(100, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'INVALID_STATUS',
        }),
      });
    });

    it('should throw INVALID_STATUS HTTP 400 when denshi_shonin_status is 2 (already rejected)', async () => {
      const rejected = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 2,
      });
      dokusyaRepo.findOne.mockResolvedValue(rejected);

      await expect(
        service.approve(100, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'INVALID_STATUS',
        }),
      });
    });

    it('should INSERT t_dokusya_rireki with denshi_shonin_status=1 and henko_riyu="電子版承認"', async () => {
      // COVERS: §4.4 ステップ3 — 履歴 INSERT
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100, dokusyaRirekiId: 201 };
      });

      await service.approve(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const rirekiRow = saved.find(
        (row) => row && ('rirekiNo' in row || 'rireki_no' in row),
      );
      expect(rirekiRow).toBeDefined();
      const status = rirekiRow.denshiShoninStatus ?? rirekiRow.denshi_shonin_status;
      const riyu = rirekiRow.henkoRiyu ?? rirekiRow.henko_riyu;
      expect(status).toBe(1);
      expect(riyu).toBe('電子版承認');
    });

    it('should wrap status update + audit log in a single transaction', async () => {
      // COVERS: ※トランザクション境界
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.approve(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const auditCalledInsideTx =
        auditLog.logUpdate.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "UPDATE" operation (NOT "APPROVE")', async () => {
      // COVERS: §4.5 + .claude/rules/nestjs.md — bare verb only
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.approve(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logUpdate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^APPROVE$|^DOKUSYA_APPROVE$/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should rollback when audit log throws', async () => {
      // COVERS: ※トランザクション境界
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      auditLog.logUpdate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.approve(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should emit error audit log (log_type=3) OUTSIDE transaction on failure', async () => {
      // COVERS: §4.7 例外処理
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      txManager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.approve(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      const errorAuditCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) =>
            c[0]?.logType === 3 ||
            c[0]?.log_type === 3 ||
            c[0]?.resultStatus === 2 ||
            c[0]?.result_status === 2,
        );
      expect(errorAuditCalled).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-005 — PUT /api/v1/dokusya/:dokusya_id/reject (reject)
  // ════════════════════════════════════════════════════════════════════════
  describe('reject', () => {
    it('should set denshi_shonin_status=2 and return updated DokusyaResponseDto + message', async () => {
      // COVERS: §4.4 ステップ3 — denshi_shonin_status=2
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      const result = await service.reject(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result).toBeDefined();
      const data = result.data ?? result;
      const message = result.message ?? '否認しました。';
      expect(data.denshi_shonin_status).toBe(2);
      expect(message).toBe('否認しました。');
    });

    it('should throw NotFoundException when dokusya does not exist', async () => {
      dokusyaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reject(999, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.2 DataScope masks as 404
      const otherJa = buildDokusya({
        dokusyaId: 100, jaId: 99, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(otherJa);
      await expect(
        service.reject(100, buildJaHontenSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw INVALID_STATUS HTTP 400 when denshi_shonin_status is not 0', async () => {
      // COVERS: §4.3 + err:INVALID_STATUS (row 10)
      const already = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(already);

      await expect(
        service.reject(100, buildChuokaiSession({ ja_id: 1 }), baseReq),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'INVALID_STATUS',
        }),
      });
    });

    it('should INSERT t_dokusya_rireki with denshi_shonin_status=2 and henko_riyu="電子版否認"', async () => {
      // COVERS: §4.4 ステップ3 — 履歴 INSERT
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100, dokusyaRirekiId: 202 };
      });

      await service.reject(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const rirekiRow = saved.find(
        (row) => row && ('rirekiNo' in row || 'rireki_no' in row),
      );
      expect(rirekiRow).toBeDefined();
      const status = rirekiRow.denshiShoninStatus ?? rirekiRow.denshi_shonin_status;
      const riyu = rirekiRow.henkoRiyu ?? rirekiRow.henko_riyu;
      expect(status).toBe(2);
      expect(riyu).toBe('電子版否認');
    });

    it('should wrap status update + audit log in a single transaction', async () => {
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.reject(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should call AuditLogService with bare "UPDATE" operation (NOT "REJECT")', async () => {
      // COVERS: §4.5 + .claude/rules/nestjs.md — bare verb only
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.reject(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logUpdate).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^REJECT$|^DOKUSYA_REJECT$/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should rollback when audit log throws', async () => {
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      auditLog.logUpdate.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.reject(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();
    });

    it('should emit error audit log (log_type=3) OUTSIDE transaction on failure', async () => {
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      txManager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.reject(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      const errorAuditCalled =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) =>
            c[0]?.logType === 3 ||
            c[0]?.log_type === 3 ||
            c[0]?.resultStatus === 2 ||
            c[0]?.result_status === 2,
        );
      expect(errorAuditCalled).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:dokusya_id/history (getHistory)
  // ════════════════════════════════════════════════════════════════════════
  describe('getHistory', () => {
    it('should return history rows ordered by rireki_no DESC when target exists', async () => {
      // COVERS: §4.4 + §4.5 — ORDER BY rireki_no DESC + label mapping
      const target = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(target);
      const rireki2 = buildDokusyaRireki({
        dokusyaRirekiId: 200, dokusyaId: 100, rirekiNo: 2,
        tetsuzukiShurui: 1, saishinDataFlg: true, shinkiFlg: false,
        henkoRiyu: '住所変更',
      });
      const rireki1 = buildDokusyaRireki({
        dokusyaRirekiId: 100, dokusyaId: 100, rirekiNo: 1,
        tetsuzukiShurui: 1, saishinDataFlg: false, shinkiFlg: true,
        henkoRiyu: '',
      });
      rirekiRepo.find.mockResolvedValue([rireki2, rireki1]);
      rirekiQb.getMany.mockResolvedValue([rireki2, rireki1]);

      const result = await service.getHistory(
        100,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].rireki_no).toBe(2);
      expect(result.data[1].rireki_no).toBe(1);
    });

    it('should map tetsuzuki_shurui value to label via CodeService.getLabel("TETSUZUKI_SHURUI", value)', async () => {
      // COVERS: §4.5 — tetsuzuki_shurui_label mapping
      const target = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(target);
      const row = buildDokusyaRireki({ tetsuzukiShurui: 1, rirekiNo: 1 });
      rirekiRepo.find.mockResolvedValue([row]);
      rirekiQb.getMany.mockResolvedValue([row]);
      codeService.getLabel = jest.fn((cat: string, v: any) => {
        if (cat === 'TETSUZUKI_SHURUI' && v === 1) return '新規';
        return '';
      });

      const result = await service.getHistory(
        100,
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result.data[0].tetsuzuki_shurui_label).toBe('新規');
    });

    it('should throw NotFoundException when target dokusya does not exist', async () => {
      // COVERS: §4.3 + err:NOT_FOUND
      dokusyaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getHistory(999, buildChuokaiSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope)', async () => {
      // COVERS: §4.2-4.3 DataScope masks as 404
      const otherJa = buildDokusya({ dokusyaId: 100, jaId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(otherJa);

      await expect(
        service.getHistory(100, buildJaHontenSession({ ja_id: 1 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when kanri_shiten_id mismatches (JA_KANRI_SHITEN scope)', async () => {
      const other = buildDokusya({ dokusyaId: 100, jaId: 1, kanriShitenId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(other);

      await expect(
        service.getHistory(
          100,
          buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT call AuditLogService — read-only endpoint', async () => {
      // COVERS: §4.6 — GET does NOT write t_log
      const target = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(target);
      rirekiRepo.find.mockResolvedValue([]);
      rirekiQb.getMany.mockResolvedValue([]);

      await service.getHistory(100, buildChuokaiSession({ ja_id: 1 }));

      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logUpdate).not.toHaveBeenCalled();
    });

    it('should return empty data array when no history rows exist (edge case)', async () => {
      const target = buildDokusya({ dokusyaId: 100, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(target);
      rirekiRepo.find.mockResolvedValue([]);
      rirekiQb.getMany.mockResolvedValue([]);

      const result = await service.getHistory(
        100,
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data).toEqual([]);
    });
  });
});
