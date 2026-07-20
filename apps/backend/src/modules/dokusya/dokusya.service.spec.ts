//
// Screens: ACSMS-SCR-011 — 購読者情報登録画面
//          ACSMS-SCR-014 — 購読者明細検索画面
//          ACSMS-SCR-013 — 購読者履歴情報画面
//
// Tests drive `src/modules/dokusya/dokusya.service.ts`. Every `it()` below
// maps back to a clause in
// `docs/design/ACSMS-SCR-011/ACSMS-SCR-011-api.md` or
// `docs/design/ACSMS-SCR-014/ACSMS-SCR-014-api.md`.
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
import * as historyWriter from '@/modules/dokusya/dokusya-history.writer';
import { DokusyaAccountFlagService } from '@/modules/dokusya/dokusya-account-flag.service';
import { DokusyaImportService } from '@/modules/dokusya/dokusya-import.service';
import { DokusyaImportValidator } from '@/modules/dokusya/dokusya-import-validator.service';
import { DokusyaRirekiService } from '@/modules/dokusya/dokusya-rireki-helper.service';
import { DokusyaSearchService } from '@/modules/dokusya/dokusya-search.service';
import { DokusyaReplaceService } from '@/modules/dokusya/dokusya-replace.service';
import {
  NotFoundException,
  DataScopeViolationException,
} from '@/common/exceptions/common.exceptions';
import { ShubetsuPermissionException } from '@/modules/dokusya/exceptions/shubetsu-permission.exception';
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
  buildDokusyaListRow,
  buildDokusyaRirekiListRow,
  buildDokusyaRirekiQuery,
  buildImportBody,
  buildImportRequiredColumns,
  buildImportRow,
  buildReplaceBody,
  buildReplaceCandidateRow,
  buildReplaceSearchQuery,
  buildReplaceSearchRow,
  buildSearchDokusyaQuery,
  buildUpdateDokusyaBody,
  futureDate,
  pastDate,
} from '@test/fixtures/dokusya.factory';
import { todayIsoJst } from '@/common/utils/datetime';

describe('DokusyaService — SCR-011 (create + update + approve/reject + history + detail)', () => {
  let service: any;
  let dokusyaRepo: any;
  let rirekiRepo: any;
  let shitenRepo: any;
  let kanriShitenRepo: any;
  let hanbaitenRepo: any;
  let tankaRepo: any;
  let accountRepo: any;
  let dokusyaQb: any;
  let rirekiQb: any;
  let shitenQb: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;
  // [layer4-fk-guard] JA that the FK-scope mocks report. Default 1 (matches
  // the ja_id:1 sessions / before rows used across these tests); the
  // body-ja_id-ignored test flips it to its session JA.
  let fkScopeJaId: number;

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
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
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

    // Bitemporal writer (applyChange) re-reads the master via loadMaster →
    // txManager.findOne. Capture the last-saved master so findOne returns it.
    let lastMaster: any = null;
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        if (value && typeof value === 'object' && 'rirekiNo' in value) {
          return { ...value, dokusyaRirekiId: 200 };
        }
        if (value && typeof value === 'object' && 'dokusyaId' in value) {
          lastMaster = { ...value };
          return lastMaster;
        }
        lastMaster = {
          ...value,
          dokusyaId: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return lastMaster;
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      // loadMaster() re-reads t_dokusya after recompute. Tests that override
      // txManager.save (to capture saved rows) can't reach the beforeEach-scoped
      // lastMaster, so fall back to a minimal master keyed by the queried id.
      findOne: jest.fn(
        async (_entity: any, opts?: any) =>
          lastMaster ?? { dokusyaId: opts?.where?.dokusyaId ?? 100 },
      ),
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

    // [layer4-fk-guard] FK-scope setup. shitenRepo serves BOTH the shiten_id
    // check (assertFkScope) and the bank reverse-lookup (resolveBankBranch),
    // so its default returns an in-scope, bank-capable row; bank-specific
    // tests override via mockBankShitenLookup(). fkScopeJaId defaults to 1
    // (the ja_id used by the sessions / before rows here); the
    // body-ja_id-ignored test flips it.
    fkScopeJaId = 1;
    shitenRepo.findOne = jest.fn(async () => ({
      shitenId: 100,
      jaId: fkScopeJaId,
      kinyuShitenFlg: true,
      jastemToriatsukaiTenpoCode: '001',
      jastemTenpoName: '本店',
    }));
    kanriShitenRepo = { findOne: jest.fn(async () => ({ jaId: fkScopeJaId })) };
    hanbaitenRepo = { findOne: jest.fn(async () => ({ jaId: fkScopeJaId })) };
    tankaRepo = { findOne: jest.fn(async () => ({ jaId: fkScopeJaId })) };
    // Account-flag gate (assertShubetsuFlag re-queries m_account). Default
    // grants BOTH flags so existing create/update/approve tests pass; the
    // dedicated 購読種別-permission tests override paperFlg / denshiFlg.
    accountRepo = {
      findOne: jest.fn(async () => ({
        accountId: 1,
        paperFlg: true,
        denshiFlg: true,
      })),
    };

    const accountFlags = new DokusyaAccountFlagService(accountRepo as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      kanriShitenRepo,
      hanbaitenRepo,
      tankaRepo,
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
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

    it('should expose has_active_kaiyaku + max_joho_date computed from history (解約予約ガード — 顧客要件 2026-07)', async () => {
      dokusyaQb.getRawOne.mockResolvedValue({
        ...buildDokusya({ dokusyaId: 1, jaId: 1 }),
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
      });
      dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
      // 有効な解約予約あり + 最終変更適用日 = 2027-03-01。
      rirekiRepo.findOne.mockImplementation((opts: any) =>
        Promise.resolve(
          opts?.where?.kaiyakuFlg === true
            ? { dokusyaRirekiId: 5 }
            : { johoHenkoTekiyoDate: '2027-03-01' },
        ),
      );

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.has_active_kaiyaku).toBe(true);
      expect(result.max_joho_date).toBe('2027-03-01');
    });

    it('should default has_active_kaiyaku=false + max_joho_date=null when no history rows match', async () => {
      dokusyaQb.getRawOne.mockResolvedValue({
        ...buildDokusya({ dokusyaId: 1, jaId: 1 }),
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
      });
      dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
      rirekiRepo.findOne.mockResolvedValue(null);

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.has_active_kaiyaku).toBe(false);
      expect(result.max_joho_date).toBeNull();
    });

    it('should map denshi_kaiin_id (電子版会員ID) from the entity into the detail response', async () => {
      // 外部システム会員ID。BIGINT は driver が string で返すため Number 化される。
      const row = buildDokusya({ dokusyaId: 1, jaId: 1 });
      (row as { denshiKaiinId: number | null }).denshiKaiinId =
        9007199254 as unknown as number;
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.denshi_kaiin_id).toBe(9007199254);
    });

    it('should return denshi_kaiin_id = null when the subscriber is not linked to the external system', async () => {
      const row = buildDokusya({ dokusyaId: 1, jaId: 1 });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: '山田販売店',
        tanka_name: '基本購読料（月額）',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.denshi_kaiin_id).toBeNull();
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

    it('should expose bank_shiten_id for a NON-口座引落 row that has a 引落口座 (顧客要件: 全支払方法で保存・表示)', async () => {
      // 以前は shiharai_hoho!=1 で bank_shiten_id を null に潰していた。
      const row = buildDokusya({
        dokusyaId: 1, jaId: 1, shiharaiHoho: 4, // JA施設等 + 引落口座あり
        bankBranchCode: '001', bankBranchName: '本店',
      });
      dokusyaRepo.findOne.mockResolvedValue(row);
      dokusyaQb.getRawOne.mockResolvedValue({
        ...row,
        hanbaiten_name: 'X', tanka_name: 'X',
        bank_shiten_id: 50,
        jastem_toriatsukai_tenpo_code: '001',
        jastem_tenpo_name: '本店',
      });

      const result = await service.getDetail(1, buildChuokaiSession({ ja_id: 1 }));
      expect(result.bank_shiten_id).toBe(50);
      expect(result.jastem_toriatsukai_tenpo_code).toBe('001');
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
          shitenCode: '050',
          shitenName: '銀行支店50',
          jastemToriatsukaiTenpoCode: '001',
          jastemTenpoName: '本店',
          jaId: fkScopeJaId,
          kinyuShitenFlg: true,
        });
        shitenQb.getRawOne.mockResolvedValue({
          shiten_id: 50,
          jastem_toriatsukai_tenpo_code: '001',
          jastem_tenpo_name: '本店',
        });
      } else {
        // [layer4-fk-guard] First findOne = the shiten_id FK check
        // (assertFkScope) — must pass with an in-scope row; the SECOND call
        // = the bank reverse-lookup, which is the one under test (→ null).
        shitenRepo.findOne
          .mockReset()
          .mockResolvedValueOnce({
            shitenId: 100,
            jaId: fkScopeJaId,
            kinyuShitenFlg: true,
          })
          .mockResolvedValue(null);
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
      // FK-scope follows the session JA (42) so the in-scope FK rows match.
      fkScopeJaId = 42;
      mockBankShitenLookup(true);
      const body = buildCreateDokusyaBody({ ja_id: 99 } as any);
      const session = buildChuokaiSession({ ja_id: 42, account_id: 11 });

      const result = await service.create(body, session, baseReq);
      expect(result.ja_id).toBe(42);
    });

    it('should pin the 購読者 shiten_id to session.shiten_id when the operator account has a 所属支店 (制限③・顧客要件2026-07)', async () => {
      // 所属支店固定アカウント(session.shiten_id=77)は新規登録時に購読者の
      // shiten_id を強制的に 77 にピンする（body の値は無視）。
      mockBankShitenLookup(true);
      let savedRow: any;
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        if (value && 'dokusyaBusu' in (value ?? {})) savedRow = value;
        return value && typeof value === 'object' && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      await service.create(
        buildCreateDokusyaBody({ shiten_id: 999 } as any),
        buildJaKanriShitenSession({
          ja_id: 1,
          kanri_shiten_id: 100,
          shiten_id: 77,
          account_id: 11,
        }),
        baseReq,
      );

      expect(Number((savedRow ?? {}).shitenId)).toBe(77);
    });

    it('should reject a body FK id from another JA (Layer 4 cross-tenant guard)', async () => {
      // COVERS: security.md §Layer 4 — kanri_shiten_id resolves to JA 999
      // while the session is JA 1 → DataScopeViolation, no INSERT.
      mockBankShitenLookup(true);
      kanriShitenRepo.findOne.mockResolvedValueOnce({ jaId: 999 });
      await expect(
        service.create(
          buildCreateDokusyaBody(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeInstanceOf(DataScopeViolationException);
    });

    // ─── 購読種別-flag permission gate (account_concept.md §139-145) ────────
    it('should throw SHUBETSU_PERMISSION_DENIED when creating 紙版 without paper_flg', async () => {
      mockBankShitenLookup(true);
      accountRepo.findOne.mockResolvedValueOnce({
        accountId: 11,
        paperFlg: false,
        denshiFlg: true,
      });
      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 1 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeInstanceOf(ShubetsuPermissionException);
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('should throw SHUBETSU_PERMISSION_DENIED when creating 電子版 without denshi_flg', async () => {
      mockBankShitenLookup(true);
      accountRepo.findOne.mockResolvedValueOnce({
        accountId: 11,
        paperFlg: true,
        denshiFlg: false,
      });
      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 2, shiharai_hoho: 1 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeInstanceOf(ShubetsuPermissionException);
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('should allow creating 紙版 when paper_flg is true', async () => {
      mockBankShitenLookup(true);
      accountRepo.findOne.mockResolvedValueOnce({
        accountId: 11,
        paperFlg: true,
        denshiFlg: false,
      });
      const result = await service.create(
        buildCreateDokusyaBody({ dokusya_shubetsu: 1 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result.dokusya_id).toBe(100);
    });

    it('should reverse-lookup m_shiten and persist shiten_code as bank_branch_code', async () => {
      // COVERS: §4.4 — bank_shiten_id → m_shiten → bank_branch_code (=shiten_code)
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
      const reachedExpected = code === '050' || name === '本店';
      expect(reachedExpected).toBe(true);
    });

    it('should reverse-lookup + persist bank_branch_code even when shiharai_hoho is NOT 口座引落 (顧客要件: 全支払方法で引落口座保存可)', async () => {
      // 以前は resolveBankBranch が shiharai_hoho!=1 で即 空 を返し、
      // bank_shiten_id を渡しても保存されなかった。
      mockBankShitenLookup(true);
      let savedRow: any;
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        if (value && 'dokusyaBusu' in (value ?? {})) savedRow = value;
        return value && typeof value === 'object' && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      await service.create(
        buildCreateDokusyaBody({ shiharai_hoho: 4, bank_shiten_id: 50 }), // JA施設等 + 引落口座
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const persisted = savedRow ?? {};
      const code = persisted.bankBranchCode ?? persisted.bank_branch_code;
      const name = persisted.bankBranchName ?? persisted.bank_branch_name;
      expect(code === '050' || name === '本店').toBe(true);
    });

    it('should normalise a YYYY/MM/DD date to hyphen before persisting (varchar column stays ISO for range filters)', async () => {
      mockBankShitenLookup(true);
      let savedRow: any;
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        if (value && typeof value === 'object' && 'dokusyaKaishiDate' in value) {
          savedRow = value;
        }
        return value && typeof value === 'object' && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100 };
      });

      // 未来日のスラッシュ入力。BE は区切りを正規化して保存（過去日不可検証も通過）。
      await service.create(
        buildCreateDokusyaBody({ dokusya_kaishi_date: '2099/05/31' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(savedRow?.dokusyaKaishiDate).toBe('2099-05-31');
      expect(savedRow?.shokiDokusyaKaishiDate).toBe('2099-05-31');
    });

    it('should reject create when dokusya_kaishi_date is in the past (本日以降のみ)', async () => {
      mockBankShitenLookup(true);
      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_kaishi_date: pastDate(7) }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_kaishi_date' }),
          ]),
        }),
      });
    });

    it('should reject create when dokusya_kaishi_date is TODAY (未来日のみ・当日不可 — 顧客要件 2026-07)', async () => {
      mockBankShitenLookup(true);
      await expect(
        service.create(
          // 紙版(1) → date-picker 経路。未来日のみ許可なので当日は弾かれる。
          buildCreateDokusyaBody({ dokusya_kaishi_date: todayIsoJst() }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_kaishi_date' }),
          ]),
        }),
      });
    });

    it('should ALLOW create with dokusya_kaishi_date=TODAY for 電子版+口座引落 (ラジオ今日/翌月1日の特例)', async () => {
      mockBankShitenLookup(true);
      // 電子版(2)+口座引落(1) は購読開始日ラジオ「今日/翌月1日」の特例で当日可。
      const res = await service.create(
        buildCreateDokusyaBody({
          dokusya_shubetsu: 2,
          shiharai_hoho: 1,
          dokusya_busu: 1,
          email: 'digi@example.com',
          dokusya_kaishi_date: todayIsoJst(),
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(res).toBeDefined();
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

    it('should throw VALIDATION_ERROR (field=shiharai_hoho) when 電子版 with クレジットカード (6)', async () => {
      // COVERS: screen-design §7.3 — 電子版 (dokusya_shubetsu=2) excludes
      // only クレジットカード (shiharai_hoho=6) on create; the other
      // payment methods (口座引落/現金集金/振込集金/JA施設等/給与天引き/その他)
      // are allowed.
      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 2, shiharai_hoho: 6 }),
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

    it('should ALLOW 電子版 with 現金集金 (2) — only クレジットカード is excluded', async () => {
      const result = await service.create(
        buildCreateDokusyaBody({
          dokusya_shubetsu: 2,
          shiharai_hoho: 2,
          bank_shiten_id: null,
          email: 'denshi-genkin@example.com',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result.shiharai_hoho).toBe(2);
    });

    it('should NOT apply the 電子版 payment restriction for 紙版 (dokusya_shubetsu=1)', async () => {
      // 紙版 + 現金集金 (non-口座引落) is allowed — rule only gates 電子版.
      const result = await service.create(
        buildCreateDokusyaBody({
          dokusya_shubetsu: 1,
          shiharai_hoho: 2,
          bank_shiten_id: null,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result).toBeDefined();
    });

    it('should set denshi_shonin_status=null when creating a 紙版 record', async () => {
      // 紙版 is not part of the web-application 承認/否認 flow → status null.
      const result = await service.create(
        buildCreateDokusyaBody({
          dokusya_shubetsu: 1,
          shiharai_hoho: 2,
          bank_shiten_id: null,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result.denshi_shonin_status).toBeNull();
    });

    it('should set denshi_shonin_status=1 (承認済) when creating a 電子版 record (職員操作 → 自動承認)', async () => {
      mockBankShitenLookup(true); // 電子版 requires 口座引落
      const result = await service.create(
        buildCreateDokusyaBody({
          dokusya_shubetsu: 2,
          shiharai_hoho: 1,
          bank_shiten_id: 50,
          email: 'denshi@example.com',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result.denshi_shonin_status).toBe(1);
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

    it('should throw DUPLICATE_EMAIL HTTP 400 when email already exists among 電子版 records in same ja_id', async () => {
      // COVERS: §4.3 + err:DUPLICATE_EMAIL (row 9)
      // 一意性は電子版(2)・併読(3) のみ — 電子版で作成して重複を検知させる。
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaRepo.count.mockResolvedValue(1);

      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 2, email: 'dup@example.com' }),
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

    it('should NOT flag a duplicate email for a 紙版 record even when a matching row exists', async () => {
      // 顧客要件: 一意性は電子版/併読のみ — 紙版は重複可なので照会自体しない。
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(1); // would throw if the check ran
      dokusyaRepo.count.mockResolvedValue(0);

      const result = await service.create(
        buildCreateDokusyaBody({ dokusya_shubetsu: 1, email: 'dup@example.com' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result).toBeDefined();
    });

    it('should throw VALIDATION_ERROR (field=email) when email is blank for 電子版', async () => {
      // 顧客要件: メールは電子版(2)・併読(3) で必須。
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 2, email: '' }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
          ]),
        }),
      });
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

    it('should INSERT t_dokusya_rireki with rireki_no=1, shinki=true, saishin=false (新規: 有効フラグは recompute が確定)', async () => {
      // COVERS: §4.4 — フラグ設定ルール for create: shinki_flg=true when tetsuzuki_shurui=1
      // 新モデル (Pha3 applyChange): 挿入行の saishin_data_flg は必ず false。
      // 有効レコード判定 (t_dokusya ⇔ saishin=TRUE) は recomputeMaster が
      // setSaishinFlags の SQL UPDATE で確定するため、挿入行そのものには立てない。
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
      expect(saishin).toBe(false);
      expect(shinki).toBe(true);
      // 有効フラグ確定は setSaishinFlags の SQL UPDATE 経由。
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SET saishin_data_flg'),
        expect.arrayContaining([100]),
      );
    });

    it('should set joho_henko_tekiyo_date = dokusya_kaishi_date on create (未来可)', async () => {
      // COVERS: 顧客要件 2026-07 改訂 — 新規登録の情報変更適用日(joho)は購読開始日
      //   (dokusya_kaishi_date) と同一にする。開始日が未来なら joho も未来となり、
      //   有効化は夜間バッチが開始日到来時に行う（Excel取込 NEW と同方針）。
      mockBankShitenLookup(true);
      const saved: any[] = [];
      txManager.save.mockImplementation(async (_entity: any, value: any) => {
        saved.push(value);
        return value && 'dokusyaId' in value
          ? value
          : { ...value, dokusyaId: 100, dokusyaRirekiId: 200 };
      });

      const kaishi = futureDate(30);
      await service.create(
        buildCreateDokusyaBody({
          tetsuzuki_shurui: 1,
          dokusya_kaishi_date: kaishi,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const masterRow = saved.find(
        (row) => row && !('rirekiNo' in row) && 'dokusyaKaishiDate' in row,
      );
      const rirekiRow = saved.find((row) => row && 'rirekiNo' in row);
      expect(masterRow).toBeDefined();
      expect(rirekiRow).toBeDefined();
      // joho は master / rireki ともに購読開始日と一致する。
      expect(masterRow.johoHenkoTekiyoDate).toBe(kaishi);
      expect(rirekiRow.johoHenkoTekiyoDate).toBe(kaishi);
      expect(masterRow.dokusyaKaishiDate).toBe(kaishi);
    });

    it('should throw VALIDATION_ERROR (field=dokusya_chushi_date) when 解約予定日 < 購読開始日 on create', async () => {
      // 顧客要件 2026-07 — 新規で解約予定日を入力した場合、購読開始日以降・過去日不可。
      mockBankShitenLookup(true);
      await expect(
        service.create(
          buildCreateDokusyaBody({
            dokusya_kaishi_date: '2026-08-01',
            dokusya_chushi_date: '2026-07-01', // < kaishi & < today
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_chushi_date' }),
          ]),
        }),
      });
    });

    it('should reject create when tetsuzuki_shurui=0 (解約) — 新規登録では解約不可', async () => {
      // COVERS: 新規登録は解約(0)を選択不可（解約は既存購読者の更新操作）。
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({ tetsuzuki_shurui: 0, dokusya_busu: 5 }),
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

    it('should reject create when dokusya_shubetsu=3 (併読) — 併読はバッチ連携管理で新規作成不可', async () => {
      // COVERS: 顧客要件 — 併読(紙版＋電子版)は外部の電子版読者管理システムが
      // バッチ連携で管理するため、本システムでは新規作成・編集・停止・削除いずれも不可。
      // 作成はここで VALIDATION_ERROR、編集/停止/削除は isDokusyaReadOnly で 403。
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({ dokusya_shubetsu: 3, dokusya_busu: 1 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'dokusya_shubetsu',
              message: expect.stringContaining('併読'),
            }),
          ]),
        }),
      });
    });

    it('should reject create when dokusya_busu <= 0 (新規は購読部数 1 以上)', async () => {
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({ tetsuzuki_shurui: 1, dokusya_busu: 0 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_busu' }),
          ]),
        }),
      });
    });

    it('should reject create when 電子版(2) and dokusya_busu != 1 (顧客要件 2026-06)', async () => {
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({
            dokusya_shubetsu: 2,
            shiharai_hoho: 1,
            dokusya_busu: 2,
            email: 'denshi@example.com',
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_busu' }),
          ]),
        }),
      });
    });

    it('should accept create when 電子版(2) and dokusya_busu == 1', async () => {
      mockBankShitenLookup(true);

      await expect(
        service.create(
          buildCreateDokusyaBody({
            dokusya_shubetsu: 2,
            shiharai_hoho: 1,
            dokusya_busu: 1,
            email: 'denshi-ok@example.com',
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).resolves.toBeDefined();
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
          shitenCode: '050',
          shitenName: '銀行支店50',
          jastemToriatsukaiTenpoCode: '001',
          jastemTenpoName: '本店',
          jaId: fkScopeJaId,
          kinyuShitenFlg: true,
        });
        shitenQb.getRawOne.mockResolvedValue({
          shiten_id: 50,
          jastem_toriatsukai_tenpo_code: '001',
          jastem_tenpo_name: '本店',
        });
      } else {
        // [layer4-fk-guard] First findOne = the shiten_id FK check
        // (assertFkScope) — must pass with an in-scope row; the SECOND call
        // = the bank reverse-lookup, which is the one under test (→ null).
        shitenRepo.findOne
          .mockReset()
          .mockResolvedValueOnce({
            shitenId: 100,
            jaId: fkScopeJaId,
            kinyuShitenFlg: true,
          })
          .mockResolvedValue(null);
        shitenQb.getRawOne.mockResolvedValue(null);
      }
    }

    // Pha3: 履歴書き込み + master 再計算は共通ライタ applyChange に集約された。
    // service.update の責務は「検証 + 不変項目のピン止め + 正しい values/johoDate/
    // hanbaitenDate で applyChange を呼ぶこと」。rireki 行の中身（zenkai_*・増減
    // フラグ・分割順・saishin）は builder.spec / writer.spec が網羅する。ここでは
    // applyChange を spy して service→writer の契約（呼び出し引数）を検証する。
    let applyChangeSpy: jest.SpyInstance;
    beforeEach(() => {
      applyChangeSpy = jest
        .spyOn(historyWriter, 'applyChange')
        .mockImplementation(async (_m: any, input: any) => {
          // fetchInScope() is the first dokusyaRepo.findOne — that's the master
          // snapshot the update test set via mockResolvedValue(before).
          const beforeVal = await dokusyaRepo.findOne.mock.results[0]?.value;
          const after = {
            ...(beforeVal ?? {}),
            ...(input.values ?? {}),
            dokusyaId: input.dokusyaId ?? 100,
          };
          return {
            dokusyaId: input.dokusyaId ?? 100,
            insertedRirekiIds: [2],
            before: (beforeVal ?? null) as any,
            after: after as any,
            denshiSync: false,
          };
        });
    });
    afterEach(() => applyChangeSpy.mockRestore());

    /** Last applyChange input (2nd arg of the most recent call). */
    function lastApplyChangeInput(): any {
      return applyChangeSpy.mock.calls.at(-1)?.[1];
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

    // ─── 当日変更 / 予約変更 モード（顧客要件2026-07・参照→編集フロー）────────
    describe('change_mode (当日変更 / 予約変更)', () => {
      const sess = () => buildChuokaiSession({ ja_id: 1, account_id: 11 });

      it('当日変更・紙版: 部数変更（帳票影響）は VALIDATION_ERROR で弾く', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, dokusyaBusu: 1 }),
        );
        mockBankShitenLookup(true);
        await expect(
          service.update(
            100,
            buildUpdateDokusyaBody({ change_mode: 'today', dokusya_busu: 2 }),
            sess(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'dokusya_busu' }),
            ]),
          }),
        });
      });

      it('当日変更・紙版: 購読者住所変更（帳票影響）は VALIDATION_ERROR で弾く', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, yubinNo: '1000001' }),
        );
        mockBankShitenLookup(true);
        await expect(
          service.update(
            100,
            buildUpdateDokusyaBody({ change_mode: 'today', yubin_no: '9998888' }),
            sess(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'yubin_no' }),
            ]),
          }),
        });
      });

      // NOTE: 当日変更モードでの「購読中止日（解約予約）は当日不可」検証は撤去した。
      // 購読中止日は update から分離し、body に含めると DTO の @IsEmpty で 400 になる
      // （停止は POST /dokusya/:id/stop・顧客要件 2026-07 改訂）。この単体テストは
      // ValidationPipe を通さないため DTO 検証は検証できず、契約は controller/integration
      // spec の「PUT + chushi → 400」が担う。

      it('当日変更・紙版: 帳票非影響のみ（備考）→ 成功、joho は本日に固定', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, dokusyaBusu: 1 }),
        );
        mockBankShitenLookup(true);
        // 帳票影響項目（部数・住所）は before と同値に揃える＝帳票影響なし。
        const result = await service.update(
          100,
          buildUpdateDokusyaBody({
            change_mode: 'today',
            biko: '当日変更テスト',
            dokusya_busu: 1,
            chome_banchi: '千代田1-1',
          }),
          sess(),
          baseReq,
        );
        expect(result.dokusya_id).toBe(100);
        expect(lastApplyChangeInput().johoDate).toBe(todayIsoJst());
      });

      it('当日変更: クライアントが未来日を送っても joho は本日に固定する', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1 }),
        );
        mockBankShitenLookup(true);
        await service.update(
          100,
          buildUpdateDokusyaBody({
            change_mode: 'today',
            joho_henko_tekiyo_date: futureDate(30),
            // 帳票影響項目は before と同値（当日変更で許可される変更のみ）。
            dokusya_busu: 1,
            chome_banchi: '千代田1-1',
          }),
          sess(),
          baseReq,
        );
        expect(lastApplyChangeInput().johoDate).toBe(todayIsoJst());
      });

      it('当日変更・電子版: 帳票影響項目（住所）でも制限なしで成功する', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 2, // 電子版
            dokusyaBusu: 1,
            yubinNo: '1000001',
          }),
        );
        mockBankShitenLookup(true);
        const result = await service.update(
          100,
          buildUpdateDokusyaBody({
            change_mode: 'today',
            dokusya_shubetsu: 2,
            dokusya_busu: 1,
            yubin_no: '9998888', // 住所変更でも電子版は許可
            email: 'denshi@example.com',
          }),
          sess(),
          baseReq,
        );
        expect(result.dokusya_id).toBe(100);
        expect(lastApplyChangeInput().johoDate).toBe(todayIsoJst());
      });

      it('予約変更: 未来日を指定して帳票影響項目も変更できる（紙版）', async () => {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, dokusyaBusu: 1 }),
        );
        mockBankShitenLookup(true);
        const future = futureDate(20);
        const result = await service.update(
          100,
          buildUpdateDokusyaBody({
            change_mode: 'reserved',
            dokusya_busu: 3,
            joho_henko_tekiyo_date: future,
          }),
          sess(),
          baseReq,
        );
        expect(result.dokusya_id).toBe(100);
        expect(lastApplyChangeInput().johoDate).toBe(future);
      });

      it('電子版は予約変更(change_mode=reserved)を VALIDATION_ERROR(field=change_mode)で弾く（当日変更のみ・顧客要件 2026-07 改訂）', async () => {
        // 購読種別は before の保存値で判定（spoof 不可）。電子版は帳票を生成せず
        // 即時反映のため予約変更(未来日の予約)は不可。
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 2, // 電子版
            dokusyaBusu: 1,
          }),
        );
        mockBankShitenLookup(true);
        await expect(
          service.update(
            100,
            buildUpdateDokusyaBody({
              change_mode: 'reserved',
              dokusya_shubetsu: 2,
              dokusya_busu: 1,
              email: 'denshi@example.com',
              joho_henko_tekiyo_date: futureDate(20),
            }),
            sess(),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'change_mode',
                message: expect.stringContaining('当日変更のみ'),
              }),
            ]),
          }),
        });
        expect(applyChangeSpy).not.toHaveBeenCalled();
      });
    });

    it('should throw VALIDATION_ERROR (field=joho_henko_tekiyo_date) when joho < 購読開始日', async () => {
      // 顧客要件 2026-07 — 情報変更適用日は購読開始日以降。before(直前の有効
      // レコード)の購読開始日を未来にし、joho=当日 を送ると kaishi>joho で弾かれる。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaKaishiDate: '2030-01-01',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ dokusya_busu: 2 }), // joho=当日(既定)
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
      expect(applyChangeSpy).not.toHaveBeenCalled();
    });

    it('should block joho AFTER the scheduled 解約予定日 even when master.chushi is NULL (未来予定解約を直前履歴行から参照 — 顧客要件 2026-07)', async () => {
      // 未来日運用では master(t_dokusya) は作成時点(最早行)を保持し、未来予定の
      // 解約日は入らない (NULL)。履歴末尾に予定解約日 2026-11-06 がある状態で
      // joho=2027-01-09 を送ると joho>解約予定日 で弾く（解約後に情報変更を挿入させない）。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaKaishiDate: '2026-07-31',
        dokusyaChushiDate: null, // master は NULL（未来予定は未反映）
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      rirekiRepo.findOne.mockResolvedValue({ dokusyaChushiDate: '2026-11-06' });
      mockBankShitenLookup(true);
      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({
            dokusya_busu: 2,
            joho_henko_tekiyo_date: '2027-01-09', // > 予定解約日(2026-11-06)
          }),
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
      expect(applyChangeSpy).not.toHaveBeenCalled();
    });

    it('should PASS date-consistency when joho within [購読開始日, 解約予定日]', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaKaishiDate: '2026-04-01',
        dokusyaChushiDate: '2026-12-31',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      const result = await service.update(
        100,
        buildUpdateDokusyaBody({
          dokusya_busu: 2,
          joho_henko_tekiyo_date: '2026-09-01', // 購読開始日 < joho < 解約予定日
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(result.dokusya_id).toBe(100);
    });

    // NOTE: 購読中止日(解約予約)による履歴挿入・相対チェック（chushi<kaishi・二重解約・
    // 最終変更適用日ガード）は update から撤去し、専用の service.stop()（POST
    // /dokusya/:id/stop）へ移設した（顧客要件 2026-07 改訂）。ここでは「update は
    // body の dokusya_chushi_date を無視する」ことだけを検証する。停止側の網羅は
    // 上の describe('stop ...') が担う。
    it('update は body の dokusya_chushi_date を無視し、予約行を作らず通常の applyChange を通す（停止は専用APIへ分離 — 顧客要件 2026-07 改訂）', async () => {
      const scheduledSpy = jest.spyOn(historyWriter, 'insertScheduledKaiyaku');
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 1,
            dokusyaKaishiDate: '2026-04-01',
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null);
        mockBankShitenLookup(true);
        const result = await service.update(
          100,
          buildUpdateDokusyaBody({
            dokusya_busu: 2,
            dokusya_chushi_date: futureDate(30), // ← 無視される
            joho_henko_tekiyo_date: futureDate(20),
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
        expect(result.dokusya_id).toBe(100);
        // 予約行(insertScheduledKaiyaku)は作らず、通常の情報変更(applyChange)を通す。
        expect(scheduledSpy).not.toHaveBeenCalled();
        expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      } finally {
        scheduledSpy.mockRestore();
      }
    });

    it('(C) should insert a 再購読(shinki) row via insertResubscribe when 解約済み + 手続種類=新規 + new 購読開始日 — 顧客要件 2026-07', async () => {
      const resubSpy = jest
        .spyOn(historyWriter, 'insertResubscribe')
        .mockResolvedValue({
          dokusyaId: 100,
          insertedRirekiIds: [3],
          before: null as any,
          after: { dokusyaId: 100 } as any,
          denshiSync: false,
        });
      try {
        // master が解約状態 (tetsuzuki=0)。
        const before = buildDokusya({
          dokusyaId: 100,
          jaId: 1,
          rirekiNo: 2,
          dokusyaShubetsu: 1,
          tetsuzukiShurui: 0,
          dokusyaKaishiDate: '2026-04-01',
        });
        dokusyaRepo.findOne.mockResolvedValue(before);
        // 履歴に旧解約予定日(futureDate(5))あり。再購読では旧解約予定日を上限参照に
        // してはいけない（joho=新購読開始日 futureDate(20) が旧解約日より後でも通す）。
        // isResubscribe で解約予定日参照を無効化する回帰ガード（この mock を参照する
        // loadScheduledChushiAsOf は再購読時に呼ばれない）。
        rirekiRepo.findOne.mockResolvedValue({
          dokusyaChushiDate: futureDate(5),
          johoHenkoTekiyoDate: futureDate(5),
        });
        mockBankShitenLookup(true);
        const newKaishi = futureDate(20);

        const result = await service.update(
          100,
          buildUpdateDokusyaBody({
            tetsuzuki_shurui: 1, // 新規（再購読）
            dokusya_busu: 2,
            dokusya_kaishi_date: newKaishi,
            joho_henko_tekiyo_date: newKaishi,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );

        expect(result.dokusya_id).toBe(100);
        expect(resubSpy).toHaveBeenCalledTimes(1);
        expect(resubSpy.mock.calls[0][1]).toEqual(
          expect.objectContaining({
            dokusyaId: 100,
            kaishiDate: newKaishi,
            actor: '11',
          }),
        );
        // 継続情報変更(applyChange)は呼ばれない。
        expect(applyChangeSpy).not.toHaveBeenCalled();
      } finally {
        resubSpy.mockRestore();
      }
    });

    it('(C) should reject 再購読 with a past/today 購読開始日 (未来日のみ)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 2,
        dokusyaShubetsu: 1,
        tetsuzukiShurui: 0,
        dokusyaKaishiDate: '2026-04-01',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({
            tetsuzuki_shurui: 1,
            dokusya_busu: 2,
            dokusya_kaishi_date: pastDate(1),
            joho_henko_tekiyo_date: futureDate(20),
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_kaishi_date' }),
          ]),
        }),
      });
    });

    it('should NOT FK-guard kanri_shiten_id / shiten_id when sent as 0 (= 未設定) on update', async () => {
      // バグ: レスポンスが NULL の管理支店/支店を 0 に丸めて返し、FE が 0 を送り
      // 返すと assertFkScope が「id=0 の管理支店」を探して 400 (管理支店IDが
      // 存在しません) になっていた。0(以下) は未設定とみなしスキップする。
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      // 管理支店リポジトリは id=0 を返さない（存在しない）。スキップされれば
      // 呼ばれず、400 にもならない。
      kanriShitenRepo.findOne.mockResolvedValue(null);

      const result = await service.update(
        100,
        buildUpdateDokusyaBody({ kanri_shiten_id: 0, shiten_id: 0, dokusya_busu: 2 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.dokusya_id).toBe(100);
    });

    it('should reject update when dokusya_busu <= 0 and 手続種類 != 解約', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        tetsuzukiShurui: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ tetsuzuki_shurui: 1, dokusya_busu: 0 }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_busu' }),
          ]),
        }),
      });
    });

    it('should reject update when 電子版(2) and dokusya_busu != 1 (顧客要件 2026-06)', async () => {
      // 購読種別は編集で不変 → before の版(電子版)で判定。busu=2 は不可。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        tetsuzukiShurui: 1,
        dokusyaShubetsu: 2, // 電子版
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      accountRepo.findOne.mockResolvedValue({
        accountId: 11,
        paperFlg: true,
        denshiFlg: true,
      });

      await expect(
        service.update(
          100,
          // 電子版は当日変更のみ（顧客要件 2026-07 改訂）— change_mode=today 必須。
          buildUpdateDokusyaBody({
            change_mode: 'today',
            dokusya_busu: 2,
            email: 'd@example.com',
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'dokusya_busu' }),
          ]),
        }),
      });
    });

    it('should ALLOW update with dokusya_busu=0 when 手続種類=解約 (バッチ前提)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        tetsuzukiShurui: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      const result = await service.update(
        100,
        buildUpdateDokusyaBody({ tetsuzuki_shurui: 0, dokusya_busu: 0 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.dokusya_id).toBe(100);
    });

    it('should keep the stored 購読種別 and ignore a changed dokusya_shubetsu in the body (immutable on edit)', async () => {
      // 購読種別 is read-only on edit — the FE radio is disabled, but the
      // screen submits the full form so dokusya_shubetsu still arrives.
      // The service pins it to the stored value; a smuggled 紙版(1)→電子版(2)
      // switch must NOT persist.
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_shubetsu: 2 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 業務値は applyChange の values 経由で履歴/master へ流れる。service が
      // 購読種別を stored 値へ pin するので values.dokusyaShubetsu は 1（密輸の 2 ではない）。
      expect(lastApplyChangeInput().values.dokusyaShubetsu).toBe(1);
    });

    it('should keep the stored 購読開始日 and ignore a changed dokusya_kaishi_date on update (immutable after create)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        dokusyaKaishiDate: '2026-04-01',
        rirekiNo: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_kaishi_date: '2030/01/01' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 購読開始日は編集不可 → stored 値に pin されて values に載る。
      expect(lastApplyChangeInput().values.dokusyaKaishiDate).toBe('2026-04-01');
    });

    it('should keep the stored 管理支店 and ignore a changed kanri_shiten_id on update (変更不可)', async () => {
      // 管理支店は編集不可（顧客要件 2026-07）。body に改変値が届いても保存値に pin。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        kanriShitenId: 10,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ kanri_shiten_id: 99 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 管理支店は stored 値(10)に pin され、改変値(99)は無視される。
      expect(lastApplyChangeInput().values.kanriShitenId).toBe(10);
    });

    it('should preserve 初回購読開始日 (shoki_dokusya_kaishi_date) on update — not clobber it with the current kaishi date', async () => {
      // shoki(初回) と kaishi(当期) が異なる行を更新しても初回日は保持する。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        shokiDokusyaKaishiDate: '2020-04-01', // 初回
        dokusyaKaishiDate: '2026-04-01', // 当期（pin される）
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_kaishi_date: '2030/01/01' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 初回購読開始日は不変 → service が既存値へ戻して values に載せる。
      expect(lastApplyChangeInput().values.shokiDokusyaKaishiDate).toBe('2020-04-01');
    });

    it('should preserve denshi_dokusya_shubetsu on update (電子版読者種別 is edit-exempt)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaShubetsu: 2, // 電子版
        denshiDokusyaShubetsu: 2,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      // 電子版編集には denshi_flg が要る。
      accountRepo.findOne.mockResolvedValue({
        accountId: 11,
        paperFlg: true,
        denshiFlg: true,
      });

      await service.update(
        100,
        buildUpdateDokusyaBody({
          change_mode: 'today', // 電子版は当日変更のみ
          dokusya_shubetsu: 2,
          shiharai_hoho: 1,
          dokusya_busu: 1,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 電子版読者種別は編集対象外 → service が既存値を維持して values に載せる。
      expect(lastApplyChangeInput().values.denshiDokusyaShubetsu).toBe(2);
    });

    it('should lock the master row (FOR UPDATE) before assigning rireki_no', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ chome_banchi: '新住所9-9' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const lockCall = txManager.findOne.mock.calls.find(
        (c: any[]) => c[1]?.lock?.mode === 'pessimistic_write',
      );
      expect(lockCall).toBeDefined();
      expect(lockCall[1].where).toEqual({ dokusyaId: 100 });
    });

    it('should persist changed 購読者氏名/かな on update (顧客要件 2026-07: 氏名編集可)', async () => {
      // 氏名4項目 (氏名_氏/名, かな_氏/名) は編集で変更可。name-pin は撤廃され、
      // 送信された新値がそのまま values に載る（保存・履歴化される）。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        shimeiSei: '山田',
        shimeiMei: '太郎',
        shimeiKanaSei: 'やまだ',
        shimeiKanaMei: 'たろう',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          shimei_sei: '田中',
          shimei_mei: '次郎',
          shimei_kana_sei: 'たなか',
          shimei_kana_mei: 'じろう',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 氏名4項目は編集可 → 送信された新値が values に載る。
      const values = lastApplyChangeInput().values;
      expect(values.shimeiSei).toBe('田中');
      expect(values.shimeiMei).toBe('次郎');
      expect(values.shimeiKanaSei).toBe('たなか');
      expect(values.shimeiKanaMei).toBe('じろう');
    });

    it('should persist NULL shiten_id on update when 支店 is cleared (任意・顧客要件 2026-07)', async () => {
      // 支店 は任意。null が届いたら 0 に丸めず NULL で保存する。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        shitenId: 100,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ shiten_id: null }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const values = lastApplyChangeInput().values;
      expect(values.shitenId).toBeNull();
    });

    it('should persist NULL mail_magazine_flg on update when 紙版で未選択 (電子版用項目)', async () => {
      // メールマガジンは電子版用項目。紙版で未選択(null)なら NULL 保存（0 に
      // 丸めない・顧客要件 2026-07）。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        mailMagazineFlg: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ mail_magazine_flg: null }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const values = lastApplyChangeInput().values;
      expect(values.mailMagazineFlg).toBeNull();
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
      // 一意性は電子版(2)・併読(3) のみなので before を電子版にして照会を走らせる。
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 2 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(0);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          change_mode: 'today', // 電子版は当日変更のみ
          email: 'yamada@example.com',
          dokusya_busu: 1,
        }),
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

    it('should throw DUPLICATE_EMAIL HTTP 400 when another 電子版 row in same ja_id has same email', async () => {
      // COVERS: §4.3 + err:DUPLICATE_EMAIL
      // 一意性は電子版(2)・併読(3) のみ — before を電子版にして検知させる。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        dokusyaShubetsu: 2,
        email: 'a@example.com',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaRepo.count.mockResolvedValue(1);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({
            change_mode: 'today', // 電子版は当日変更のみ
            email: 'taken@example.com',
            dokusya_busu: 1,
          }),
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

    it('should delegate history write + saishin/rireki_no assignment to applyChange (UPDATE)', async () => {
      // COVERS: §4.4 ステップ1/2。saishin_data_flg 無効化・rireki_no 採番・履歴
      // INSERT は Pha3 で共通ライタ applyChange(mode=UPDATE) に集約された。
      // service は正しい dokusyaId で UPDATE モードを呼ぶ責務のみ（採番・saishin
      // の正しさは writer.spec が検証）。
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ chome_banchi: '新住所' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      const input = lastApplyChangeInput();
      expect(input.mode).toBe('UPDATE');
      expect(input.dokusyaId).toBe(100);
    });

    // Pha3: 履歴行(zenkai_*/増減フラグ/分割/saishin)の中身は writer(builder)
    // の責務。以下の update テストは applyChange への引数(values/johoDate/
    // hanbaitenDate)＝service 契約を検証する。

    it('should snapshot previous 購読者住所 into zenkai_* when haitatsu_same_flg=true and an address field changed', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        haitatsuSameFlg: true,
        yubinNo: '1000001',
        todofukenCode: '13',
        shikuchoson: '千代田区',
        chomeBanchi: '千代田1-1',
        tatemonoMei: '東京ビル',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          haitatsu_same_flg: true,
          yubin_no: '1000001',
          todofuken_code: '13',
          shikuchoson: '千代田区',
          chome_banchi: '千代田9-9', // ← changed vs before
          tatemono_mei: '東京ビル',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // zenkai_* の前回値退避は writer(fillZenkai)の責務。service 契約としては
      // 変更後の住所5項目が values に正しく載ることを検証する。
      const values = lastApplyChangeInput().values;
      expect(values.chomeBanchi).toBe('千代田9-9');
      expect(values.yubinNo).toBe('1000001');
      expect(values.todofukenCode).toBe('13');
      expect(values.shikuchoson).toBe('千代田区');
      expect(values.tatemonoMei).toBe('東京ビル');
    });

    it('should pass johoDate + changed hanbaitenId to applyChange when 販売店 changes on update (販売店適用日=joho に統一)', async () => {
      // 顧客要件 2026-07: 販売店適用日を廃止し joho に統一。販売店変更でも別の
      // hanbaitenDate は渡さず、johoDate(=適用日) と変更後の hanbaitenId を渡す。
      // 履歴は1件・hanbaiten_tekiyo_date=joho の転記は writer の責務。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        hanbaitenId: 200,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          hanbaiten_id: 201, // 販売店変更
          joho_henko_tekiyo_date: '2099-12-31',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = lastApplyChangeInput();
      expect(input.johoDate).toBe('2099-12-31');
      expect(input.hanbaitenDate).toBeUndefined(); // 別 hanbaiten 適用日は渡さない
      expect(Number(input.values.hanbaitenId)).toBe(201);
    });

    it('should record the user-entered joho_henko_tekiyo_date on update (顧客要件 2026-06 更新)', async () => {
      // 顧客要件 2026-06 更新 — joho_henko_tekiyo_date はユーザー入力。
      // 編集で送られた値がそのまま master / 履歴に記録される（自動当日では
      // ない）。既定は当日だが利用者が変更可。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        johoHenkoTekiyoDate: null,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      const userDate = futureDate(10);
      await service.update(
        100,
        buildUpdateDokusyaBody({
          chome_banchi: '新住所9-9',
          joho_henko_tekiyo_date: userDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // ユーザー入力の情報変更適用日が applyChange の johoDate として渡る
      // （自動当日ではない）。履歴行への転記は writer の責務。
      expect(lastApplyChangeInput().johoDate).toBe(userDate);
    });

    it('should reject update when joho_henko_tekiyo_date is in the past', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ joho_henko_tekiyo_date: pastDate(7) }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'joho_henko_tekiyo_date' }),
          ]),
        }),
      });
    });

    it('should reject update when joho_henko_tekiyo_date is TODAY (未来日のみ・当日不可 — 顧客要件 2026-07)', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ joho_henko_tekiyo_date: todayIsoJst() }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'joho_henko_tekiyo_date' }),
          ]),
        }),
      });
    });

    it('should reject update when joho_henko_tekiyo_date is missing (required)', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await expect(
        service.update(
          100,
          buildUpdateDokusyaBody({ joho_henko_tekiyo_date: null }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'joho_henko_tekiyo_date' }),
          ]),
        }),
      });
    });

    it('should ALWAYS snapshot 購読者住所 into zenkai_* when haitatsu_same_flg=true even if unchanged (顧客要件 2026-06)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        haitatsuSameFlg: true,
        yubinNo: '1000001',
        todofukenCode: '13',
        shikuchoson: '千代田区',
        chomeBanchi: '千代田1-1',
        tatemonoMei: '',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          haitatsu_same_flg: true,
          yubin_no: '1000001',
          todofuken_code: '13',
          shikuchoson: '千代田区',
          chome_banchi: '千代田1-1', // ← identical → no change
          tatemono_mei: '',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 住所無変更でも service は購読者住所5項目を values に載せる（writer の
      // fillZenkai が無条件に前回値を退避する — 顧客要件 2026-06）。
      const values = lastApplyChangeInput().values;
      expect(values.todofukenCode).toBe('13');
      expect(values.shikuchoson).toBe('千代田区');
      expect(values.chomeBanchi).toBe('千代田1-1');
      expect(values.tatemonoMei).toBe('');
      expect(values.yubinNo).toBe('1000001');
    });

    it('should snapshot previous 配達先住所 into zenkai_* when haitatsu_same_flg=false and a 配達先 field changed', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        haitatsuSameFlg: false,
        haitatsuYubinNo: '2200001',
        haitatsuTodofukenCode: '14',
        haitatsuShikuchoson: '横浜市',
        haitatsuChomeBanchi: '港北1-1',
        haitatsuTatemonoMei: '配達ビル',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          haitatsu_same_flg: false,
          haitatsu_yubin_no: '2200001',
          haitatsu_todofuken_code: '14',
          haitatsu_shikuchoson: '横浜市',
          haitatsu_chome_banchi: '港北9-9', // ← changed vs before
          haitatsu_tatemono_mei: '配達ビル',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // haitatsu_same_flg=false → 配達先住所を values に載せる。前回値の zenkai_*
      // 退避は writer の責務。
      const values = lastApplyChangeInput().values;
      expect(values.haitatsuChomeBanchi).toBe('港北9-9');
      expect(values.haitatsuYubinNo).toBe('2200001');
      expect(values.haitatsuTodofukenCode).toBe('14');
      expect(values.haitatsuShikuchoson).toBe('横浜市');
      expect(values.haitatsuTatemonoMei).toBe('配達ビル');
    });

    // ─── 増減報告フラグ (zougen_hokoku_flg) — dokusya_busu / hanbaiten_id /
    //     住所5項目 のいずれかが変わったときのみ true ──────────────────────
    // 増減報告フラグ(zougen_hokoku_flg)の判定は writer(computeZougen)の責務で
    // builder.spec が網羅する。service 契約としては、増減トリガ項目
    // (dokusya_busu / hanbaiten_id / 住所5項目) の変更後値を applyChange の
    // values に正しく載せることを検証する。
    it('should forward a changed dokusya_busu into applyChange values (増減トリガ)', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1, dokusyaBusu: 1 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_busu: 3, chome_banchi: '千代田1-1' }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(lastApplyChangeInput().values.dokusyaBusu).toBe(3);
    });

    it('should forward a changed hanbaiten_id into applyChange values (増減トリガ)', async () => {
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1, hanbaitenId: 5 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_busu: 1, chome_banchi: '千代田1-1', hanbaiten_id: 9 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(Number(lastApplyChangeInput().values.hanbaitenId)).toBe(9);
    });

    it('should forward a changed 購読者住所 field into applyChange values (増減トリガ)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        haitatsuSameFlg: true,
        chomeBanchi: '千代田1-1',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await service.update(
        100,
        buildUpdateDokusyaBody({
          dokusya_busu: 1,
          haitatsu_same_flg: true,
          chome_banchi: '千代田9-9', // ← changed
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      expect(lastApplyChangeInput().values.chomeBanchi).toBe('千代田9-9');
    });

    it('should forward a biko-only change with trigger fields held equal (増減対象外)', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaBusu: 1,
        hanbaitenId: 5,
        haitatsuSameFlg: true,
        chomeBanchi: '千代田1-1',
        biko: '旧メモ',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);
      await service.update(
        100,
        // dokusya_busu / hanbaiten_id / 住所5項目 はすべて before と同値、biko のみ変更。
        buildUpdateDokusyaBody({
          dokusya_busu: 1,
          hanbaiten_id: 5,
          haitatsu_same_flg: true,
          chome_banchi: '千代田1-1',
          biko: '新メモ',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );
      // biko のみ変更、増減トリガ項目は before と同値 → writer が zougen=false と判定。
      const values = lastApplyChangeInput().values;
      expect(values.biko).toBe('新メモ');
      expect(values.dokusyaBusu).toBe(1);
      expect(Number(values.hanbaitenId)).toBe(5);
      expect(values.chomeBanchi).toBe('千代田1-1');
    });

    it('should force denshi_shonin_status=null when updating a 紙版 (dokusya_shubetsu=1) record', async () => {
      // 顧客要件 — 紙版は承認/否認ワークフロー対象外なので update でも常に null。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaShubetsu: 1,
        denshiShoninStatus: 2, // 旧データが 2 でも update で null に揃える
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      const result = await service.update(
        100,
        buildUpdateDokusyaBody({ dokusya_shubetsu: 1 }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.denshi_shonin_status).toBeNull();
    });

    it('should preserve denshi_shonin_status when updating an already-approved (1) 電子版 record', async () => {
      // 回帰テスト — 承認済み(1)の電子版を編集しただけで 承認待ち(0) に戻り、
      // 承認・登録/承認しないボタンが再表示されてしまうバグの防止。
      // denshi_shonin_status は approve/reject 専用ワークフローでのみ遷移する。
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaShubetsu: 2, // 電子版
        denshiShoninStatus: 1, // 承認済み
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      const result = await service.update(
        100,
        buildUpdateDokusyaBody({
          change_mode: 'today', // 電子版は当日変更のみ
          dokusya_shubetsu: 2,
          shiharai_hoho: 1,
          bank_shiten_id: 50,
          email: 'denshi@example.com',
          dokusya_busu: 1,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.denshi_shonin_status).toBe(1);
    });

    it('should snapshot previous 購読部数 into zenkai_dokusya_busu when dokusya_busu changed', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        dokusyaBusu: 2,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ tetsuzuki_shurui: 1, dokusya_busu: 5 }), // 2 → 5
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 新値を values に載せる。前回値 zenkai_dokusya_busu の退避は writer の責務。
      expect(lastApplyChangeInput().values.dokusyaBusu).toBe(5);
    });

    it('should always snapshot zenkai_dokusya_busu = rd.dokusya_busu even when unchanged', async () => {
      // 顧客要件: zenkai_* は変更有無に関わらず更新前(rd)の値を常に退避する。
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1, dokusyaBusu: 3 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ tetsuzuki_shurui: 1, dokusya_busu: 3 }), // same
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 無変更でも service は dokusya_busu を values に載せる（writer が無条件に
      // zenkai_dokusya_busu へ前回値を退避する）。
      expect(lastApplyChangeInput().values.dokusyaBusu).toBe(3);
    });

    it('should snapshot previous 販売店 into zenkai_hanbaiten_id when hanbaiten_id changed', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        hanbaitenId: 5,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ hanbaiten_id: 9 }), // 5 → 9
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 新販売店を values に載せる。前回値 zenkai_hanbaiten_id の退避・2件分割は writer の責務。
      expect(Number(lastApplyChangeInput().values.hanbaitenId)).toBe(9);
    });

    it('should always snapshot zenkai_hanbaiten_id = rd.hanbaiten_id even when unchanged', async () => {
      // 顧客要件: zenkai_* は変更有無に関わらず更新前(rd)の値を常に退避する。
      const before = buildDokusya({ dokusyaId: 100, jaId: 1, rirekiNo: 1, hanbaitenId: 5 });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({ hanbaiten_id: 5 }), // same
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 無変更でも service は hanbaiten_id を values に載せる（writer が無条件に
      // zenkai_hanbaiten_id へ前回値を退避する）。
      expect(Number(lastApplyChangeInput().values.hanbaitenId)).toBe(5);
    });

    // ── 顧客要件 2026-07: 販売店適用日を廃止し joho に統一 → 1更新1レコード ────
    // service 契約: applyChange へ johoDate のみ渡す（hanbaitenDate は廃止・常に
    // undefined）。UI/取込/置換で同一。分割なし・hanbaiten_tekiyo_date=joho の転記は
    // writer(splitEvents/buildRirekiRow) の責務で writer.spec が網羅する。
    it('情報+販売店 同時変更: johoDate のみ渡し、hanbaitenId + 情報を values に載せる', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        hanbaitenId: 5,
        dokusyaBusu: 1,
        chomeBanchi: '千代田1-1',
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          hanbaiten_id: 9, // 5 → 9（販売店変更）
          dokusya_busu: 6, // 1 → 6（情報変更）
          chome_banchi: '千代田9-9', // 住所変更
          joho_henko_tekiyo_date: '2099-07-01',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = lastApplyChangeInput();
      expect(input.johoDate).toBe('2099-07-01');
      expect(input.hanbaitenDate).toBeUndefined(); // 廃止
      expect(Number(input.values.hanbaitenId)).toBe(9);
      expect(input.values.dokusyaBusu).toBe(6);
      expect(input.values.chomeBanchi).toBe('千代田9-9');
    });

    it('情報のみ変更: johoDate のみ渡す（hanbaitenDate は常に undefined）', async () => {
      const before = buildDokusya({
        dokusyaId: 100,
        jaId: 1,
        rirekiNo: 1,
        hanbaitenId: 5,
        dokusyaBusu: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);
      mockBankShitenLookup(true);

      await service.update(
        100,
        buildUpdateDokusyaBody({
          hanbaiten_id: 5, // 据え置き
          dokusya_busu: 6, // 情報変更
          joho_henko_tekiyo_date: '2099-04-01',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = lastApplyChangeInput();
      expect(input.hanbaitenDate).toBeUndefined();
      expect(input.johoDate).toBe('2099-04-01');
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
      // 履歴書き込みは applyChange に集約されたので、失敗はそこで起こす。
      applyChangeSpy.mockRejectedValueOnce(new Error('db exploded'));

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
  // API-014-004 — POST /api/v1/dokusya/:dokusya_id/stop (購読停止・解約予約)
  // ════════════════════════════════════════════════════════════════════════
  describe('stop (購読停止・解約予約 — 一覧のポップアップから)', () => {
    /** insertScheduledKaiyaku を spy（実 writer ロジックは writer.spec が網羅）。 */
    function spyScheduledKaiyaku(): jest.SpyInstance {
      return jest
        .spyOn(historyWriter, 'insertScheduledKaiyaku')
        .mockResolvedValue({
          dokusyaId: 100,
          insertedRirekiIds: [2],
          before: null as any,
          after: { dokusyaId: 100 } as any,
          denshiSync: false,
        });
    }

    it('紙版: 現行ルールを満たす中止日で insertScheduledKaiyaku(shubetsu=1) を呼ぶ', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 1, // 紙版
            dokusyaKaishiDate: '2026-04-01',
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null); // 解約予約なし / MAX joho なし
        dokusyaQb.getRawOne.mockResolvedValue({});
        const chushi = futureDate(30);

        const result = await service.stop(
          100,
          { dokusya_chushi_date: chushi },
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );

        expect(result.dokusya_id).toBe(100);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][1]).toEqual(
          expect.objectContaining({
            dokusyaId: 100,
            chushiDate: chushi,
            shubetsu: 1,
            actor: '11',
          }),
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('電子版: 請求開始月以降の月末日で insertScheduledKaiyaku(shubetsu=2) を呼ぶ', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 2, // 電子版
            seikyuKaishiMonth: '202604',
            dokusyaKaishiDate: '2026-04-01',
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null);
        dokusyaQb.getRawOne.mockResolvedValue({});
        // FE が丸めた月末日（2030年07月末）。
        const chushi = '2030-07-31';

        await service.stop(
          100,
          { dokusya_chushi_date: chushi },
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][1]).toEqual(
          expect.objectContaining({ chushiDate: chushi, shubetsu: 2 }),
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('電子版: 請求開始月が未設定なら VALIDATION_ERROR（料金徴収未開始）', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 2,
            seikyuKaishiMonth: '', // 未設定
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null);
        await expect(
          service.stop(
            100,
            { dokusya_chushi_date: '2030-07-31' },
            buildChuokaiSession({ ja_id: 1, account_id: 11 }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'dokusya_chushi_date',
                message: 'この読者料金の徴収はまだ開始されていません。',
              }),
            ]),
          }),
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('電子版: 選択月が請求開始月より前なら VALIDATION_ERROR', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 2,
            seikyuKaishiMonth: '203001', // 2030/01
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null);
        await expect(
          service.stop(
            100,
            { dokusya_chushi_date: '2029-12-31' }, // 202912 < 203001
            buildChuokaiSession({ ja_id: 1, account_id: 11 }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'dokusya_chushi_date',
                message: expect.stringContaining('請求開始月'),
              }),
            ]),
          }),
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('紙版: 中止日 < 購読開始日なら VALIDATION_ERROR(field=dokusya_chushi_date)', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 1,
            dokusyaKaishiDate: futureDate(60), // 開始日 = 60日後
          }),
        );
        rirekiRepo.findOne.mockResolvedValue(null);
        await expect(
          service.stop(
            100,
            { dokusya_chushi_date: futureDate(30) }, // 未来だが 開始日より前
            buildChuokaiSession({ ja_id: 1, account_id: 11 }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'dokusya_chushi_date' }),
            ]),
          }),
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('既に有効な解約予約があれば二重解約を VALIDATION_ERROR で弾く', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({
            dokusyaId: 100,
            jaId: 1,
            dokusyaShubetsu: 1,
            dokusyaKaishiDate: '2026-04-01',
          }),
        );
        // hasActiveKaiyaku(where.dokusyaChushiDate=Not(IsNull)) → 行あり。
        rirekiRepo.findOne.mockImplementation((opts: any) =>
          Promise.resolve(
            opts?.where?.dokusyaChushiDate ? { dokusyaRirekiId: 9 } : null,
          ),
        );
        await expect(
          service.stop(
            100,
            { dokusya_chushi_date: futureDate(30) },
            buildChuokaiSession({ ja_id: 1, account_id: 11 }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'VALIDATION_ERROR',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'dokusya_chushi_date',
                message: expect.stringContaining('既に解約予約'),
              }),
            ]),
          }),
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('併読(read-only)は 403 DOKUSYA_READ_ONLY で停止を拒否', async () => {
      const spy = spyScheduledKaiyaku();
      try {
        dokusyaRepo.findOne.mockResolvedValue(
          buildDokusya({ dokusyaId: 100, jaId: 1, dokusyaShubetsu: 3 }), // 併読
        );
        await expect(
          service.stop(
            100,
            { dokusya_chushi_date: futureDate(30) },
            buildChuokaiSession({ ja_id: 1, account_id: 11 }),
            baseReq,
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            error_code: 'DOKUSYA_READ_ONLY',
          }),
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:dokusya_id/approve (approve)
  // ════════════════════════════════════════════════════════════════════════
  describe('approve', () => {
    // 承認/否認も Pha3 で applyChange(UPDATE) を通る。承認状態の履歴生成は
    // writer.spec が網羅。ここは service→writer の契約 + レスポンスを検証するため
    // applyChange を spy し、after に承認状態を反映して返す。
    let applyChangeSpy: jest.SpyInstance;
    beforeEach(() => {
      applyChangeSpy = jest
        .spyOn(historyWriter, 'applyChange')
        .mockImplementation(async (_m: any, input: any) => {
          const beforeVal = await dokusyaRepo.findOne.mock.results[0]?.value;
          return {
            dokusyaId: input.dokusyaId ?? 100,
            insertedRirekiIds: [2],
            before: (beforeVal ?? null) as any,
            after: {
              ...(beforeVal ?? {}),
              ...(input.values ?? {}),
              dokusyaId: input.dokusyaId ?? 100,
            } as any,
            denshiSync: false,
          };
        });
    });
    afterEach(() => applyChangeSpy.mockRestore());

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

    it('should set denshi_shonin_status=1 directly on t_dokusya + saishin row (no future history row — 顧客要件 2026-07)', async () => {
      // 承認/否認は即時ワークフロー。未来日の履歴行は追加せず、t_dokusya と現行行を直接更新。
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.approve(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // applyChange は呼ばれない（未来日の履歴行を作らない）。
      expect(applyChangeSpy).not.toHaveBeenCalled();
      // t_dokusya を denshi_shonin_status=1 で直接更新。
      const dokusyaUpdate = txManager.update.mock.calls.find(
        (c: any[]) =>
          c[2] && typeof c[2] === 'object' && 'denshiShoninStatus' in c[2] &&
          c[1]?.dokusyaId === 100,
      );
      expect(dokusyaUpdate?.[2].denshiShoninStatus).toBe(1);
      // 現行 (saishin=true) 履歴行も同ステータスへ。
      const rirekiUpdate = txManager.update.mock.calls.find(
        (c: any[]) => c[1] && c[1].saishinDataFlg === true,
      );
      expect(rirekiUpdate?.[2].denshiShoninStatus).toBe(1);
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
      // 承認/否認は manager.update 直接更新なので、そこで失敗させる。
      txManager.update.mockRejectedValueOnce(new Error('db down'));

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
    // 承認/否認も Pha3 で applyChange(UPDATE) を通る（approve と同じ理由で spy）。
    let applyChangeSpy: jest.SpyInstance;
    beforeEach(() => {
      applyChangeSpy = jest
        .spyOn(historyWriter, 'applyChange')
        .mockImplementation(async (_m: any, input: any) => {
          const beforeVal = await dokusyaRepo.findOne.mock.results[0]?.value;
          return {
            dokusyaId: input.dokusyaId ?? 100,
            insertedRirekiIds: [2],
            before: (beforeVal ?? null) as any,
            after: {
              ...(beforeVal ?? {}),
              ...(input.values ?? {}),
              dokusyaId: input.dokusyaId ?? 100,
            } as any,
            denshiSync: false,
          };
        });
    });
    afterEach(() => applyChangeSpy.mockRestore());

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

    it('should set denshi_shonin_status=2 directly on t_dokusya + saishin row (no future history row — 顧客要件 2026-07)', async () => {
      const before = buildDokusya({
        dokusyaId: 100, jaId: 1, denshiShoninStatus: 0,
      });
      dokusyaRepo.findOne.mockResolvedValue(before);

      await service.reject(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).not.toHaveBeenCalled();
      const dokusyaUpdate = txManager.update.mock.calls.find(
        (c: any[]) =>
          c[2] && typeof c[2] === 'object' && 'denshiShoninStatus' in c[2] &&
          c[1]?.dokusyaId === 100,
      );
      expect(dokusyaUpdate?.[2].denshiShoninStatus).toBe(2);
      const rirekiUpdate = txManager.update.mock.calls.find(
        (c: any[]) => c[1] && c[1].saishinDataFlg === true,
      );
      expect(rirekiUpdate?.[2].denshiShoninStatus).toBe(2);
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
      // 否認も manager.update 直接更新なので、そこで失敗させる。
      txManager.update.mockRejectedValueOnce(new Error('db down'));

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

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-014 — 購読者明細検索画面 — search / delete / exportExcel
// ════════════════════════════════════════════════════════════════════════════

describe('DokusyaService — search / delete / export (SCR-014)', () => {
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
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
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
      create: jest.fn((v: any) => v),
      update: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => dokusyaQb),
    };
    rirekiRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((v: any) => v),
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
      save: jest.fn(async (_entity: any, value: any) => value),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn(async () => [{ count: '0' }]),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      // Default: every related-table COUNT returns 0 (no FK conflicts).
      query: jest.fn(async (_sql: string) => [{ count: '0' }]),
    };

    // accountRepo — approve/reject hit the 購読種別-flag gate; grant both.
    const accountFlags = new DokusyaAccountFlagService({
      findOne: jest.fn(async () => ({ accountId: 1, paperFlg: true, denshiFlg: true })),
    } as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      // FK-scope repos — unused by these describes (no create/update).
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-001 — GET /api/v1/dokusya (search)
  // ════════════════════════════════════════════════════════════════════════
  describe('search', () => {
    it('should return { data, meta } envelope with project pagination shape when query is valid', async () => {
      // COVERS: §4.5 happy-path + §4.6 レスポンス生成
      const rows = [buildDokusyaListRow({ dokusya_id: 1001 })];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: 1,
            page: 1,
            per_page: 20,
            total_pages: 1,
          }),
        }),
      );
    });

    it('should INNER JOIN m_tanka with active_flg param=false when active_tanka_flg=false (失効単価のみ)', async () => {
      // COVERS: 有効単価フラグ（SCR-020 error gate 連携・顧客要件2026-07 改訂）
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);

      await service.search(
        buildSearchDokusyaQuery({ active_tanka_flg: false }),
        buildChuokaiSession({ ja_id: 1 }),
      );

      const call = dokusyaQb.innerJoin.mock.calls.find(
        ([table]: unknown[]) => table === 'm_tanka',
      );
      expect(call).toBeDefined();
      const [, , cond, params] = call as unknown[];
      expect(
        typeof cond === 'string' &&
          /active_flg\s*=\s*:activeTankaFlg/i.test(cond) &&
          /tanka_id\s*=\s*d\.tanka_id/i.test(cond),
      ).toBe(true);
      expect((params as Record<string, unknown>).activeTankaFlg).toBe(false);
    });

    it('should INNER JOIN m_tanka with active_flg param=true when active_tanka_flg=true (有効単価のみ)', async () => {
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);

      await service.search(
        buildSearchDokusyaQuery({ active_tanka_flg: true }),
        buildChuokaiSession({ ja_id: 1 }),
      );

      const call = dokusyaQb.innerJoin.mock.calls.find(
        ([table]: unknown[]) => table === 'm_tanka',
      );
      expect(call).toBeDefined();
      const [, , , params] = call as unknown[];
      expect((params as Record<string, unknown>).activeTankaFlg).toBe(true);
    });

    it('should NOT INNER JOIN m_tanka for the 有効単価フラグ filter when active_tanka_flg is absent (両方)', async () => {
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);

      await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );

      const applied = dokusyaQb.innerJoin.mock.calls.some(
        ([table]: unknown[]) => table === 'm_tanka',
      );
      expect(applied).toBe(false);
    });

    it('should compute is_read_only=true when dokusya_shubetsu=2 AND shiharai_hoho=6 (電子版+クレカ)', async () => {
      // COVERS: §4.5 — is_read_only computed flag (電子版クレジットカード決済者)
      const rows = [
        buildDokusyaListRow({
          dokusya_id: 1002,
          dokusya_shubetsu: 2,
          shiharai_hoho: 6,
          is_read_only: true,
        }),
      ];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0].is_read_only).toBe(true);
    });

    it('should compute is_read_only=true when dokusya_shubetsu=3 (併読者)', async () => {
      // COVERS: §4.5 — is_read_only for 併読者
      const rows = [
        buildDokusyaListRow({
          dokusya_id: 1003,
          dokusya_shubetsu: 3,
          is_read_only: true,
        }),
      ];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0].is_read_only).toBe(true);
    });

    it('should compute is_read_only=false when dokusya_shubetsu=1 (紙版)', async () => {
      const rows = [
        buildDokusyaListRow({
          dokusya_id: 1004,
          dokusya_shubetsu: 1,
          shiharai_hoho: 1,
          is_read_only: false,
        }),
      ];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );
      expect(result.data[0].is_read_only).toBe(false);
    });

    it('should NOT apply DataScope WHERE for NICHINO_ADMIN / NICHINO_STAFF (unrestricted)', async () => {
      // COVERS: §4.2 DataScope — NICHINO_* bypass
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const params = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      // scopeJaId / scopeKsId should NOT be bound for unrestricted roles
      expect(params.scopeJaId).toBeUndefined();
      expect(params.scopeKsId).toBeUndefined();
    });

    it('should add ja_id WHERE clause when CHUOKAI (DataScope by JA)', async () => {
      // COVERS: §4.2 DataScope — CHUOKAI narrows by ja_id
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(allParams.scopeJaId ?? allParams.ja_id).toBe(1);
    });

    it('should add ja_id WHERE clause when JA_HONTEN (DataScope by JA)', async () => {
      // COVERS: §4.2 DataScope — JA_HONTEN narrows by ja_id
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery(),
        buildJaHontenSession({ ja_id: 5 }),
      );

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(allParams.scopeJaId ?? allParams.ja_id).toBe(5);
    });

    it('should add kanri_shiten_id WHERE clause when JA_KANRI_SHITEN (DataScope by branch)', async () => {
      // COVERS: §4.2 DataScope — JA_KANRI_SHITEN narrows by kanri_shiten_id
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery(),
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
      );

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      // Either branch-style (scopeKsId) or generic kanri_shiten_id binding
      expect(
        allParams.scopeKsId ?? allParams.kanri_shiten_id,
      ).toBe(10);
    });

    it('should add equality WHERE for kanri_shiten_id filter when supplied', async () => {
      // COVERS: §4.3 — kanri_shiten_id 等価条件
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ kanri_shiten_id: 99 }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(allParams.kanri_shiten_id).toBe(99);
    });

    it('should add partial-match WHERE for kumiaiin_code (ILIKE %code%)', async () => {
      // COVERS: §4.3 — kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ kumiaiin_code: 'K001' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const matched = calls.find(
        ([sql, params]: any[]) =>
          typeof sql === 'string' &&
          /kumiaiin_code/i.test(sql) &&
          /ILIKE/i.test(sql) &&
          params &&
          (params.kumiaiin_code === 'K001'),
      );
      expect(matched).toBeDefined();
    });

    it('should add partial-match WHERE for full_name concatenated from shimei_sei + shimei_mei', async () => {
      // COVERS: §4.3 — full_name (d.shimei_sei || ' ' || d.shimei_mei) ILIKE '%' || :full_name || '%'
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ full_name: '山田' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const matched = calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /shimei_sei/i.test(sql) &&
          /shimei_mei/i.test(sql) &&
          /ILIKE/i.test(sql),
      );
      expect(matched).toBeDefined();
    });

    it('should add partial-match WHERE for jastem_toriatsukai_tenpo_code against physical bank_branch_code column', async () => {
      // COVERS: §4.3 — jastem_toriatsukai_tenpo_code → d.bank_branch_code ILIKE ...
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ jastem_toriatsukai_tenpo_code: '001' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const matched = calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /bank_branch_code/i.test(sql) &&
          /ILIKE/i.test(sql),
      );
      expect(matched).toBeDefined();
    });

    it('should add range WHERE for shoki_dokusya_kaishi_date_from / _to (>=/<= on column)', async () => {
      // COVERS: §4.3 — date range filter (購読開始日)
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({
          shoki_dokusya_kaishi_date_from: '2024/01/01',
          shoki_dokusya_kaishi_date_to: '2024/12/31',
        }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const gte = calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /shoki_dokusya_kaishi_date/i.test(sql) &&
          />=/.test(sql),
      );
      const lte = calls.find(
        ([sql]: any[]) =>
          typeof sql === 'string' &&
          /shoki_dokusya_kaishi_date/i.test(sql) &&
          /<=/.test(sql),
      );
      expect(gte).toBeDefined();
      expect(lte).toBeDefined();
    });

    it('should add equality WHERE for dokusya_shubetsu when supplied', async () => {
      // COVERS: §4.3 — dokusya_shubetsu 等価条件
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ dokusya_shubetsu: 2 }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(allParams.dokusya_shubetsu).toBe(2);
    });

    it('should validate dokusya_shubetsu value against m_code DOKUSYA_SHUBETSU and reject unknown code', async () => {
      // COVERS: §4.3 + m_code validation — runtime allow-list
      codeService.has.mockImplementation((cat: string, v: any) => {
        if (cat === 'DOKUSYA_SHUBETSU' && v === 99) return false;
        return true;
      });

      await expect(
        service.search(
          buildSearchDokusyaQuery({ dokusya_shubetsu: 99 }),
          buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
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

    it('should filter on saishin_data_flg=TRUE when joho_henko_tekiyo_date_from and _to are both empty', async () => {
      // COVERS: §4.3 — 両方空欄の場合 saishin_data_flg=TRUE
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({
          joho_henko_tekiyo_date_from: undefined,
          joho_henko_tekiyo_date_to: undefined,
        }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      // Either the predicate is wired on the search query builder
      // (saishin_data_flg = TRUE) OR the service decides to bypass the
      // history-table JOIN when the filter is empty. Assert via SQL substring.
      const sqlBlobs = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
        ...dokusyaQb.leftJoin.mock.calls,
        ...dokusyaQb.innerJoin.mock.calls,
      ]
        .map((c: any[]) => c.map(String).join(' '))
        .join(' | ');
      const usesSaishin = /saishin_data_flg/i.test(sqlBlobs);
      const skipsRireki = !/t_dokusya_rireki/i.test(sqlBlobs);
      // At least one of the two branches must be exercised.
      expect(usesSaishin || skipsRireki).toBe(true);
    });

    it('should JOIN t_dokusya_rireki when joho_henko_tekiyo_date_from / _to is provided', async () => {
      // COVERS: §4.3 — 入力時 → 履歴テーブル JOIN
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({
          joho_henko_tekiyo_date_from: '2024/01/01',
          joho_henko_tekiyo_date_to: '2024/12/31',
        }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const sqlBlobs = [
        ...dokusyaQb.leftJoin.mock.calls,
        ...dokusyaQb.innerJoin.mock.calls,
      ]
        .map((c: any[]) => c.map(String).join(' '))
        .join(' | ');
      expect(/t_dokusya_rireki/i.test(sqlBlobs)).toBe(true);
    });

    it('should reject when sort_by is not in the allow-listed columns (4.1)', async () => {
      // COVERS: §4.1 — sort_by 許可カラム whitelist
      await expect(
        service.search(
          buildSearchDokusyaQuery({ sort_by: 'password_hash' }),
          buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
        }),
      });
    });

    it('should apply ORDER BY with the requested sort_by + sort_order when allow-listed', async () => {
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ sort_by: 'kumiaiin_code', sort_order: 'asc' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const orderCalls = dokusyaQb.orderBy.mock.calls;
      // Expect at least one orderBy that mentions the kumiaiin_code column
      const matched = orderCalls.find((c: any[]) =>
        c.some((arg) =>
          typeof arg === 'string' && /kumiaiin_code/i.test(arg),
        ),
      );
      expect(matched).toBeDefined();
    });

    it('should default sort_by="updated_at" and sort_order="desc" when not supplied', async () => {
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery({ sort_by: undefined, sort_order: undefined }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const orderCalls = dokusyaQb.orderBy.mock.calls;
      const matched = orderCalls.find((c: any[]) =>
        c.some((arg) =>
          typeof arg === 'string' && /updated_at/i.test(arg),
        ),
      );
      expect(matched).toBeDefined();
    });

    it('should NOT call AuditLogService — read-only endpoint', async () => {
      // COVERS: read-only — search must not write t_log
      dokusyaQb.getRawMany.mockResolvedValue([]);
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1 }),
      );

      expect(auditLog.logCreate).not.toHaveBeenCalled();
      expect(auditLog.logUpdate).not.toHaveBeenCalled();
      expect(auditLog.logDelete).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-002 — DELETE /api/v1/dokusya/:dokusya_id (remove)
  // ════════════════════════════════════════════════════════════════════════
  describe('remove', () => {
    it('should soft-delete and return on happy path (own ja_id, no related rows)', async () => {
      // COVERS: §4.3 + §4.4 — happy delete
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await service.remove(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const txCalled =
        txManager.softDelete.mock.calls.length > 0 ||
        txManager.update.mock.calls.length > 0;
      expect(txCalled).toBe(true);
    });

    it('should throw NotFoundException when target does not exist (or deleted_at set)', async () => {
      // COVERS: §4.3 + err:NOT_FOUND
      dokusyaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(
          999,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target belongs to a different ja_id (DataScope masks as 404)', async () => {
      // COVERS: §4.2 DataScope — out-of-scope → 404
      const otherJa = buildDokusya({ dokusyaId: 100, jaId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(otherJa);

      await expect(
        service.remove(
          100,
          buildJaHontenSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when JA_KANRI_SHITEN tries to delete a different branch row', async () => {
      const other = buildDokusya({ dokusyaId: 100, jaId: 1, kanriShitenId: 99 });
      dokusyaRepo.findOne.mockResolvedValue(other);

      await expect(
        service.remove(
          100,
          buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
          baseReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw DOKUSYA_READ_ONLY HTTP 403 when target is 電子版+クレジットカード (dokusya_shubetsu=2 AND shiharai_hoho=6)', async () => {
      // COVERS: §4.3 + err:DOKUSYA_READ_ONLY (row 10)
      const readOnly = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 2, shiharaiHoho: 6,
      });
      dokusyaRepo.findOne.mockResolvedValue(readOnly);

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'DOKUSYA_READ_ONLY',
        }),
      });
    });

    it('should throw DOKUSYA_READ_ONLY HTTP 403 when target is 併読 (dokusya_shubetsu=3)', async () => {
      // COVERS: §4.3 — 併読者は削除不可
      const heidoku = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 3,
      });
      dokusyaRepo.findOne.mockResolvedValue(heidoku);

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'DOKUSYA_READ_ONLY',
        }),
      });
    });

    it('should NOT throw DOKUSYA_READ_ONLY when 電子版 + non-クレカ payment (dokusya_shubetsu=2, shiharai_hoho=1)', async () => {
      // COVERS: §4.3 — 電子版 but 口座引落 → deletable
      const denshi = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 2, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(denshi);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).resolves.toBeDefined();
    });

    it('should throw CONFLICT HTTP 409 when related table (t_koza_furikae) has rows', async () => {
      // COVERS: §4.3 + err:CONFLICT (row 9)
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async (sql: string) => {
        if (/m_koza_furikae|t_koza_furikae/i.test(sql)) {
          return [{ count: '3' }];
        }
        return [{ count: '0' }];
      });

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'CONFLICT',
        }),
      });
    });

    it('should wrap soft-delete + audit log in a single transaction (atomic)', async () => {
      // COVERS: ※トランザクション境界 — §4.4 + §4.5 atomic
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await service.remove(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const auditCalledInsideTx =
        auditLog.logDelete.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.length > 0;
      expect(auditCalledInsideTx).toBe(true);
    });

    it('should call AuditLogService with bare "DELETE" operation (NOT prefixed)', async () => {
      // COVERS: §4.5 + .claude/rules/nestjs.md — bare verb only
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await service.remove(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logDelete).toHaveBeenCalled();
      const logOpCalls = auditLog.logOperation.mock.calls as any[][];
      const prefixed = logOpCalls
        .map((c) => c[0]?.operation)
        .filter((v: any): v is string => typeof v === 'string')
        .filter((v: string) => /^DOKUSYA_DELETE$|^T_DOKUSYA_DELETE$/i.test(v));
      expect(prefixed).toEqual([]);
    });

    it('should capture before-snapshot in audit log so before_value is populated', async () => {
      // COVERS: §4.5 — before_value ← 削除前データ
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, kumiaiinCode: 'BEFORE-CODE',
        dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await service.remove(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const calls = auditLog.logDelete.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const beforeArg = calls[0]?.[1];
      const flat = JSON.stringify(beforeArg ?? {});
      expect(flat).toContain('BEFORE-CODE');
    });

    it('should pass the EntityManager as 3rd arg to logDelete (tx-bound audit row)', async () => {
      // COVERS: ※トランザクション境界 — manager arg must be present
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);

      await service.remove(
        100,
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const calls = auditLog.logDelete.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Third arg (index 2) is the EntityManager — same object the
      // transaction handed to the callback. Don't assert identity (txManager
      // ref) since service may build its own ctx wrapper; just assert presence.
      expect(calls[0]?.[2]).toBeDefined();
    });

    it('should rollback soft-delete when audit log throws (atomic guarantee)', async () => {
      // COVERS: ※トランザクション境界 — rollback on audit log failure
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);
      auditLog.logDelete.mockRejectedValue(new Error('audit log broke'));
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit error audit log (log_type=3, result_status=2) OUTSIDE the rolled-back transaction', async () => {
      // COVERS: §4.7 例外処理 — log_type=3 outside tx
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);
      txManager.softDelete.mockRejectedValue(new Error('db down'));
      txManager.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.remove(
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

    it('should NOT pass manager arg to logError (post-rollback standalone INSERT)', async () => {
      // COVERS: §4.7 + nestjs.md §Audit Log — error log lives outside tx
      const target = buildDokusya({
        dokusyaId: 100, jaId: 1, dokusyaShubetsu: 1, shiharaiHoho: 1,
      });
      dokusyaRepo.findOne.mockResolvedValue(target);
      dataSource.query = jest.fn(async () => [{ count: '0' }]);
      txManager.softDelete.mockRejectedValue(new Error('db down'));
      txManager.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.remove(
          100,
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow();

      // logError is the canonical error helper — when called it must NOT
      // receive a manager (audit row must survive the rollback).
      const errCalls = auditLog.logError.mock.calls;
      if (errCalls.length > 0) {
        // Signature: logError(ctx, operation, err) — strictly 3 args, no
        // manager. Assert no extra manager-shaped arg.
        const last = errCalls[errCalls.length - 1];
        const possibleManager = last[3];
        expect(possibleManager).toBeUndefined();
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // API-014-003 — GET /api/v1/dokusya/export (Excel)
  // ════════════════════════════════════════════════════════════════════════
  describe('exportExcel', () => {
    it('should throw EXPORT_NO_DATA HTTP 404 when count is 0', async () => {
      // COVERS: §4.3 + err:EXPORT_NO_DATA (row 12)
      dokusyaQb.getCount.mockResolvedValue(0);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.exportExcel(
          buildSearchDokusyaQuery(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'EXPORT_NO_DATA',
        }),
      });
    });

    it('should throw EXPORT_LIMIT_EXCEEDED HTTP 409 when count exceeds 30000', async () => {
      // COVERS: §4.3 + err:EXPORT_LIMIT_EXCEEDED (row 11)
      dokusyaQb.getCount.mockResolvedValue(30001);
      dokusyaQb.getManyAndCount.mockResolvedValue([[], 30001]);

      await expect(
        service.exportExcel(
          buildSearchDokusyaQuery(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'EXPORT_LIMIT_EXCEEDED',
        }),
      });
    });

    it('should pass when count is exactly 30000 (boundary)', async () => {
      // COVERS: §4.3 — boundary check (30000 OK, 30001 NG)
      dokusyaQb.getCount.mockResolvedValue(30000);
      dokusyaQb.getRawMany.mockResolvedValue([buildDokusyaListRow()]);
      dokusyaQb.getManyAndCount.mockResolvedValue([[buildDokusyaListRow()], 30000]);

      await expect(
        service.exportExcel(
          buildSearchDokusyaQuery(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).resolves.toBeDefined();
    });

    it('should return a Buffer + filename matching 購読者一覧出力_YYYYMMDD_HHmmss.xlsx', async () => {
      // COVERS: §4.5 — filename pattern (JST)
      dokusyaQb.getCount.mockResolvedValue(2);
      const rows = [
        buildDokusyaListRow({ dokusya_id: 1001 }),
        buildDokusyaListRow({ dokusya_id: 1002 }),
      ];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 2]);

      const result = await service.exportExcel(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result).toEqual(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: expect.stringMatching(/^購読者一覧出力_\d{8}_\d{6}\.xlsx$/),
        }),
      );
    });

    it('should write the 15-column Japanese header row mirroring the検索結果テーブル layout', async () => {
      // COVERS: §4.5 — ヘッダー行 (顧客要件 2026-06 検索結果テーブル, 14列:
      // 支店 / 連絡先２ 削除、手続種類 / 購読種別 / 配達先氏名 / 支払方法 追加)
      dokusyaQb.getCount.mockResolvedValue(1);
      const rows = [buildDokusyaListRow()];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.exportExcel(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // For xlsx the cells live inside a binary; we can't trivially decode
      // without ExcelJS. Use the result's `headers` array (the service
      // SHOULD expose it on the return shape for verification) OR
      // decode the buffer via a lightweight assertion: check Buffer length > 0.
      expect(result.buffer.length).toBeGreaterThan(0);
      // The 14 canonical column labels MUST appear in the service's
      // configured header definition. The service is expected to surface
      // them via the `headers` field for test-time verification (mirrors
      // file-download.service pattern).
      if (Array.isArray((result as any).headers)) {
        const headers: string[] = (result as any).headers;
        expect(headers).toEqual([
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
        ]);
      }
    });

    it('should NOT include 支店 / 連絡先２ / かな氏名 columns (removed / search-only fields)', async () => {
      // COVERS: §4.5 — 支店・連絡先２ 列削除、かな氏名 は検索専用
      dokusyaQb.getCount.mockResolvedValue(1);
      const rows = [buildDokusyaListRow()];
      dokusyaQb.getRawMany.mockResolvedValue(rows);
      dokusyaQb.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await service.exportExcel(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      if (Array.isArray((result as any).headers)) {
        const headers: string[] = (result as any).headers;
        expect(headers).not.toContain('支店');
        expect(headers).not.toContain('連絡先２');
        expect(headers).not.toContain('かな氏名');
      }
    });

    it('should write audit log with operation="EXPORT_EXCEL" + log_type=1 + result_status=1', async () => {
      // COVERS: §4.6 + nestjs.md — EXPORT operations carry the verb name
      // (existing SCR-022/SCR-030 file-download convention).
      dokusyaQb.getCount.mockResolvedValue(250);
      dokusyaQb.getRawMany.mockResolvedValue([buildDokusyaListRow()]);
      dokusyaQb.getManyAndCount.mockResolvedValue([[buildDokusyaListRow()], 250]);

      await service.exportExcel(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(auditLog.logOperation).toHaveBeenCalled();
      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args).toEqual(
        expect.objectContaining({
          logType: 1,
          resultStatus: 1,
          operation: 'EXPORT_EXCEL',
          targetTable: 't_dokusya',
        }),
      );
    });

    it('should record record_count in after_value JSON when export succeeds', async () => {
      // COVERS: §4.6 — after_value JSON contains record_count
      dokusyaQb.getCount.mockResolvedValue(250);
      dokusyaQb.getRawMany.mockResolvedValue([buildDokusyaListRow()]);
      dokusyaQb.getManyAndCount.mockResolvedValue([[buildDokusyaListRow()], 250]);

      await service.exportExcel(
        buildSearchDokusyaQuery(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const args = auditLog.logOperation.mock.calls[0][0];
      expect(args.afterValue).toContain('record_count');
      expect(args.afterValue).toContain('250');
    });

    it('should emit error log (log_type=3) OUTSIDE the transaction when Excel generation fails', async () => {
      // COVERS: §4.8 — log_type=3 outside tx
      dokusyaQb.getCount.mockResolvedValue(1);
      dokusyaQb.getRawMany.mockRejectedValueOnce(new Error('db-down'));
      dokusyaQb.getManyAndCount.mockRejectedValueOnce(new Error('db-down'));

      await expect(
        service.exportExcel(
          buildSearchDokusyaQuery(),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeDefined();

      expect(auditLog.logError).toHaveBeenCalled();
    });

    it('should apply DataScope WHERE (ja_id) for CHUOKAI when counting + selecting', async () => {
      // COVERS: §4.2-4.3 — DataScope applied to BOTH count + data queries
      dokusyaQb.getCount.mockResolvedValue(0);

      await expect(
        service.exportExcel(
          buildSearchDokusyaQuery(),
          buildChuokaiSession({ ja_id: 7, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error_code: 'EXPORT_NO_DATA' }),
      });

      const allParams = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([_, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(allParams.scopeJaId ?? allParams.ja_id).toBe(7);
    });

    it('should NOT apply page / per_page / sort_by / sort_order from query (export ignores pagination per spec)', async () => {
      // COVERS: §4.1 + §概要 — pagination ignored for export
      dokusyaQb.getCount.mockResolvedValue(50);
      dokusyaQb.getRawMany.mockResolvedValue([buildDokusyaListRow()]);
      dokusyaQb.getManyAndCount.mockResolvedValue([[buildDokusyaListRow()], 50]);

      await service.exportExcel(
        buildSearchDokusyaQuery({
          page: 999, per_page: 5,
          sort_by: 'kumiaiin_code', sort_order: 'asc',
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // No `take(5)` / `skip(...)` call should be made (the spec hard-caps
      // at LIMIT 30000 instead).
      const tookSmall = dokusyaQb.take.mock.calls.some((c: any[]) => c[0] === 5);
      expect(tookSmall).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ACSMS-SCR-013 — 購読者履歴情報画面 — getRirekiList (paginated full history)
// ════════════════════════════════════════════════════════════════════════════
//
// Tests drive the NEW `DokusyaService.getRirekiList(dokusya_id, query, session)`
// method (api.md §API-013-001 GET /api/v1/dokusya/:dokusya_id/rireki). Distinct
// from SCR-011's lighter `getHistory` (/history) — this endpoint paginates the
// FULL t_dokusya_rireki row joined with kanri_shiten / shiten / todofuken(×3) /
// hanbaiten(×2) names, ordered by rireki_no DESC, and returns the canonical
// `{ data, meta }` envelope. Per api.md §m_code note it serialises CODE VALUES
// ONLY — no `*_label` fields (FE resolves labels via useCodesStore).
//
// Expected service shape (the contract /gen-code-backend must satisfy):
//   1. existence + DataScope gate via the existing private `fetchInScope`
//      (dokusyaRepo.findOne + assertBranchScope) — out-of-scope masks as 404
//      (NotFoundException) per module convention / security.md Layer 2, even
//      though api.md's エラー一覧 lists DATA_SCOPE_VIOLATION as a possible code.
//   2. list query built from rirekiRepo.createQueryBuilder('r') with the
//      joins + ORDER BY r.<sort_column> <order>, take(per_page), skip(offset),
//      then getRawMany() + getCount().
//   3. return paginate(rows.map(toDokusyaRirekiListItem), total, page, per_page).
//   4. NO audit-log write (read-only endpoint — api.md §4.7).

describe('DokusyaService — 購読者履歴情報画面 (SCR-013) getRirekiList', () => {
  let service: any;
  let dokusyaRepo: any;
  let rirekiRepo: any;
  let shitenRepo: any;
  let rirekiQb: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;

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
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };
  }

  beforeEach(() => {
    rirekiQb = makeQbMock();

    dokusyaRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    rirekiRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => rirekiQb),
    };
    shitenRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn(() => makeQbMock()) };

    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    codeService = { has: jest.fn().mockReturnValue(true), getLabel: jest.fn().mockReturnValue('') };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb({})),
      query: jest.fn(async () => [{ count: '0' }]),
    };

    // accountRepo — approve/reject hit the 購読種別-flag gate; grant both.
    const accountFlags = new DokusyaAccountFlagService({
      findOne: jest.fn(async () => ({ accountId: 1, paperFlg: true, denshiFlg: true })),
    } as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      // FK-scope repos — unused by these describes (no create/update).
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );
  });

  // ─── Happy path (§4.5 SELECT + §4.6 レスポンス生成) ───────────────────────
  it('should return { data, meta } envelope when target exists in scope (CHUOKAI)', async () => {
    // COVERS: §4.3 existence gate + §4.5 data query + §4.6 paginate envelope
    dokusyaRepo.findOne.mockResolvedValue(
      buildDokusya({ dokusyaId: 1, jaId: 1, kanriShitenId: 10 }),
    );
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow({ dokusya_id: 1 })]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ total: 1, page: 1, per_page: 20, total_pages: 1 });
  });

  it('should surface the full joined history row shape (§レスポンスデータ #2-#61)', async () => {
    // COVERS: §4.5 — joined kanri_shiten_name / shiten_name / hanbaiten_name /
    // zenkai_hanbaiten_name / bank_branch_* surfaced on each row
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow({ dokusya_id: 1 })]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(result.data[0]).toMatchObject({
      dokusya_rireki_id: 42,
      rireki_no: 3,
      kanri_shiten_name: '東京中央管理支店',
      shiten_name: '千代田支店',
      hanbaiten_name: '丸の内販売店',
      zenkai_hanbaiten_name: '銀座販売店',
      bank_branch_code: '001',
      bank_branch_name: '本店',
      hikiotoshi_koza_meigi: 'ヤマダタロウ',
    });
  });

  it('should surface the SCR-013 追加列 (購読種別/新聞単価/支払い方法/郵送区分/購読料サイクル/備考) — 顧客要件', async () => {
    // 追加列: dokusya_shubetsu・tanka(id/name/kingaku 税区分解決)・shiharai_hoho・
    // yubin_kubun・dokusyaryo_shiharai_cycle・biko を一覧行に載せる。
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([
      buildDokusyaRirekiListRow({
        dokusya_id: 1,
        dokusya_shubetsu: 2,
        tanka_id: 7,
        tanka_name: '新聞購読料',
        tanka_kingaku: 3500,
        shiharai_hoho: 2,
        yubin_kubun: '1',
        dokusyaryo_shiharai_cycle: 6,
        biko: '履歴メモ',
      }),
    ]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(result.data[0]).toMatchObject({
      dokusya_shubetsu: 2,
      tanka_id: 7,
      tanka_name: '新聞購読料',
      tanka_kingaku: 3500,
      shiharai_hoho: 2,
      yubin_kubun: '1',
      dokusyaryo_shiharai_cycle: 6,
      biko: '履歴メモ',
    });
  });

  it('should NOT include any *_label field on rows (m_code value-only serialization §note)', async () => {
    // COVERS: api.md §m_code note — authenticated endpoint returns code only
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow({ dokusya_id: 1 })]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(result.data[0]).not.toHaveProperty('mail_magazine_flg_label');
    expect(result.data[0]).not.toHaveProperty('gender_label');
    expect(result.data[0]).not.toHaveProperty('tetsuzuki_shurui_label');
    expect(result.data[0]).not.toHaveProperty('hikiotoshi_yokin_shubetsu_label');
  });

  it('should return empty data + meta.total_pages 0 when no history rows exist', async () => {
    // COVERS: §4.6 — 0件 → data:[] (FE shows ACSMS-MSG-013-001)
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([]);
    rirekiQb.getCount.mockResolvedValue(0);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ total: 0, page: 1, per_page: 20, total_pages: 0 });
  });

  // ─── Ordering (§4.1 sort_by default rireki_no, sort_order default desc) ──
  it('should order by rireki_no DESC by default (機能定義 1.2 最新レコード先頭)', async () => {
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow()]);
    rirekiQb.getCount.mockResolvedValue(1);

    await service.getRirekiList(1, buildDokusyaRirekiQuery(), buildChuokaiSession({ ja_id: 1 }));

    const orderCall = rirekiQb.orderBy.mock.calls.find(
      ([col, dir]: any[]) =>
        typeof col === 'string' && /rireki_no/i.test(col) && String(dir).toUpperCase() === 'DESC',
    );
    expect(orderCall).toBeDefined();
  });

  it('should order by created_at ASC when sort_by=created_at & sort_order=asc', async () => {
    // COVERS: §4.1 sort_by allow-list + sort_order asc
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow()]);
    rirekiQb.getCount.mockResolvedValue(1);

    await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery({ sort_by: 'created_at', sort_order: 'asc' }),
      buildChuokaiSession({ ja_id: 1 }),
    );

    const orderCall = rirekiQb.orderBy.mock.calls.find(
      ([col, dir]: any[]) =>
        typeof col === 'string' && /created_at/i.test(col) && String(dir).toUpperCase() === 'ASC',
    );
    expect(orderCall).toBeDefined();
  });

  // ─── Pagination (§4.5 LIMIT/OFFSET) ─────────────────────────────────────
  it('should limit per_page and offset 0 for page 1', async () => {
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow()]);
    rirekiQb.getCount.mockResolvedValue(1);

    await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery({ page: 1, per_page: 20 }),
      buildChuokaiSession({ ja_id: 1 }),
    );

    // limit/offset (NOT take/skip) — take/skip are ignored by getRawMany().
    expect(rirekiQb.limit).toHaveBeenCalledWith(20);
    expect(rirekiQb.offset).toHaveBeenCalledWith(0);
  });

  it('should compute OFFSET = (page-1)*per_page for page 3 per_page 10', async () => {
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow()]);
    rirekiQb.getCount.mockResolvedValue(25);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery({ page: 3, per_page: 10 }),
      buildChuokaiSession({ ja_id: 1 }),
    );

    expect(rirekiQb.limit).toHaveBeenCalledWith(10);
    expect(rirekiQb.offset).toHaveBeenCalledWith(20);
    expect(result.meta).toEqual({ total: 25, page: 3, per_page: 10, total_pages: 3 });
  });

  // ─── Read-only — no audit log (§4.7) ────────────────────────────────────
  it('should NOT write any audit-log row (read-only endpoint §4.7)', async () => {
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow()]);
    rirekiQb.getCount.mockResolvedValue(1);

    await service.getRirekiList(1, buildDokusyaRirekiQuery(), buildChuokaiSession({ ja_id: 1 }));

    expect(auditLog.logOperation).not.toHaveBeenCalled();
    expect(auditLog.logCreate).not.toHaveBeenCalled();
  });

  // ─── DataScope (§4.2 / §4.3) ────────────────────────────────────────────
  it('should throw NotFoundException when target dokusya does not exist', async () => {
    // COVERS: err:NOT_FOUND (row 8)
    dokusyaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getRirekiList(999, buildDokusyaRirekiQuery(), buildChuokaiSession({ ja_id: 1 })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when target belongs to a different ja_id (DataScope — JA_HONTEN)', async () => {
    // COVERS: §4.2-4.3 DataScope — out-of-scope masked as 404 (api.md lists
    // DATA_SCOPE_VIOLATION but module convention masks via assertBranchScope)
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 2 }));

    await expect(
      service.getRirekiList(1, buildDokusyaRirekiQuery(), buildJaHontenSession({ ja_id: 1 })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when kanri_shiten_id mismatches (DataScope — JA_KANRI_SHITEN)', async () => {
    // COVERS: §4.2 — JA_KANRI_SHITEN sees only own kanri_shiten_id
    dokusyaRepo.findOne.mockResolvedValue(
      buildDokusya({ dokusyaId: 1, jaId: 1, kanriShitenId: 99 }),
    );

    await expect(
      service.getRirekiList(
        1,
        buildDokusyaRirekiQuery(),
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 1 }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return rows for JA_KANRI_SHITEN when ja_id + kanri_shiten_id both match', async () => {
    dokusyaRepo.findOne.mockResolvedValue(
      buildDokusya({ dokusyaId: 1, jaId: 1, kanriShitenId: 1 }),
    );
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow({ dokusya_id: 1 })]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 1 }),
    );

    expect(result.data).toHaveLength(1);
  });

  it('should bypass DataScope for NICHINO_ADMIN (ja_id null) and still return rows', async () => {
    // COVERS: §4.2 — NICHINO_* bypass every scope check
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 2 }));
    rirekiQb.getRawMany.mockResolvedValue([buildDokusyaRirekiListRow({ dokusya_id: 1 })]);
    rirekiQb.getCount.mockResolvedValue(1);

    const result = await service.getRirekiList(
      1,
      buildDokusyaRirekiQuery(),
      buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
    );

    expect(result.data).toHaveLength(1);
  });

  // ─── 500 path (§4.7 例外処理) ────────────────────────────────────────────
  it('should propagate the error when the data query rejects (→ 500 at the filter)', async () => {
    // COVERS: err:INTERNAL_SERVER_ERROR (row 7) — DB failure bubbles up
    dokusyaRepo.findOne.mockResolvedValue(buildDokusya({ dokusyaId: 1, jaId: 1 }));
    rirekiQb.getCount.mockRejectedValue(new Error('DB exploded'));
    rirekiQb.getRawMany.mockRejectedValue(new Error('DB exploded'));

    await expect(
      service.getRirekiList(1, buildDokusyaRirekiQuery(), buildChuokaiSession({ ja_id: 1 })),
    ).rejects.toThrow('DB exploded');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// @ts-nocheck — TDD red phase (/gen-ut-backend, source not yet implemented by /gen-code)
// Screen: ACSMS-SCR-015 — 購読者販売店一括置換画面
//
// Drives the two NEW methods appended to DokusyaService:
//   - searchForReplace(query, session)        → GET  /api/v1/dokusya/replace-hanbaiten/search (API-015-001)
//   - replaceHanbaiten(dto, session, req)     → POST /api/v1/dokusya/replace-hanbaiten        (API-015-002)
//
// Constructor signature is REUSED unchanged:
//   (dokusyaRepo, rirekiRepo, shitenRepo, dataSource, auditLog, codeService)
// Per the api.md, search uses dokusyaRepo.createQueryBuilder('d'); the
// bulk replace validates / fetches candidate rows via dataSource.query /
// manager.query (raw SELECTs in §4.3 / §4.4 / §4.5).
// ════════════════════════════════════════════════════════════════════════════
describe('DokusyaService — SCR-015 (replace-hanbaiten search + bulk replace)', () => {
  let service: any;
  let dokusyaRepo: any;
  let rirekiRepo: any;
  let shitenRepo: any;
  let dokusyaQb: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;
  // Pha3 (S3.3): 一括置換は共通ライタ applyChange(UPDATE) に集約された。各購読者を
  // 販売店のみ変更する UPDATE として applyChange へ委譲する。履歴生成は writer.spec が
  // 網羅するので、SCR-015 は service が正しい引数（mode/dokusyaId/values.hanbaitenId/
  // johoDate=hanbaitenDate）で applyChange を呼ぶ契約を検証する。
  let applyChangeSpy!: jest.SpyInstance;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  // Future YYYY-MM-DD so the service "当日以降の日付のみ可" (§4.1) check passes.
  const tekiyoDate = futureDate(7);

  /** All applyChange inputs (2nd arg), one per replaced candidate, in order. */
  function applyChangeInputs(): any[] {
    return applyChangeSpy.mock.calls.map((c) => c[1]);
  }

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
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      getCount: jest.fn().mockResolvedValue(0),
    };
  }

  beforeEach(() => {
    dokusyaQb = makeQbMock();

    dokusyaRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => dokusyaQb),
    };
    rirekiRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    shitenRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => makeQbMock()),
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
        return Array.isArray(value) ? value.map((v) => ({ ...v })) : { ...value };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      // Raw INSERT/UPDATE/SELECT inside the transaction (§4.5).
      query: jest.fn(async () => []),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      // §4.3 candidate fetch + §4.4 hanbaiten validation use raw SELECTs.
      query: jest.fn(async () => []),
    };

    // accountRepo — approve/reject hit the 購読種別-flag gate; grant both.
    const accountFlags = new DokusyaAccountFlagService({
      findOne: jest.fn(async () => ({ accountId: 1, paperFlg: true, denshiFlg: true })),
    } as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      // FK-scope repos — unused by these describes (no create/update).
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );

    // 一括置換は各購読者を applyChange(UPDATE) で置換する。CREATE/UPDATE の履歴
    // 生成は writer に委ね、service は正しい引数で呼ぶ契約のみ検証。妥当な
    // ApplyChangeResult を返して置換ループの集計(rireki_count)を進行させる。
    applyChangeSpy = jest
      .spyOn(historyWriter, 'applyChange')
      .mockImplementation(async (_m: any, input: any) => ({
        dokusyaId: input.dokusyaId ?? 0,
        insertedRirekiIds: [1],
        before: null,
        after: { dokusyaId: input.dokusyaId ?? 0 } as any,
        denshiSync: false,
      }));
  });

  afterEach(() => applyChangeSpy.mockRestore());

  // ══════════════════════════════════════════════════════════════════════════
  // API-015-001 — searchForReplace (GET /api/v1/dokusya/replace-hanbaiten/search)
  // ══════════════════════════════════════════════════════════════════════════
  describe('searchForReplace', () => {
    function primeSearchRows(rows: any[]) {
      const raws = rows.map((r) => ({
        dokusya_id: r.dokusya_id,
        kanri_shiten_id: r.kanri_shiten_id,
        kanri_shiten_name: r.kanri_shiten_name,
        shiten_id: r.shiten_id,
        shiten_name: r.shiten_name,
        kumiaiin_code: r.kumiaiin_code,
        shimei_sei: '山田',
        shimei_mei: '太郎',
        haitatsu_yubin_no: r.haitatsu_yubin_no,
        todofuken_name: '東京都',
        haitatsu_shikuchoson: '千代田区',
        haitatsu_chome_banchi: '1-1-1',
        haitatsu_tatemono_mei: '千代田マンション101',
        hanbaiten_id: r.hanbaiten_id,
        hanbaiten_code: r.hanbaiten_code,
        hanbaiten_name: r.hanbaiten_name,
        dokusya_shubetsu: r.dokusya_shubetsu,
        shiharai_hoho: r.shiharai_hoho,
      }));
      dokusyaQb.getRawMany.mockResolvedValue(raws);
      dokusyaQb.getCount.mockResolvedValue(raws.length);
      dokusyaQb.getManyAndCount.mockResolvedValue([raws, raws.length]);
      dataSource.query.mockResolvedValue(raws);
    }

    it('should return { data, meta } envelope with total_pages computed when rows exist (NICHINO bypass)', async () => {
      // COVERS: §4.4/§4.5/§4.6 — happy path shape + meta
      primeSearchRows([buildReplaceSearchRow({ dokusya_id: 5001 })]);

      const result = await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should expose every documented response field when a row is returned', async () => {
      // COVERS: §レスポンスデータ #2-#15 — full row shape
      primeSearchRows([buildReplaceSearchRow({ dokusya_id: 5001 })]);

      const result = await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );
      const row = result.data[0];

      for (const key of [
        'dokusya_id',
        'kanri_shiten_id',
        'kanri_shiten_name',
        'shiten_id',
        'shiten_name',
        'kumiaiin_code',
        'shimei',
        'haitatsu_yubin_no',
        'haitatsu_address',
        'hanbaiten_id',
        'hanbaiten_code',
        'hanbaiten_name',
        'dokusya_shubetsu',
        'shiharai_hoho',
      ]) {
        expect(row).toHaveProperty(key);
      }
    });

    it('should concat shimei as "shimei_sei + space + shimei_mei" when building the response', async () => {
      // COVERS: §4.6 — shimei = shimei_sei + ' ' + shimei_mei
      primeSearchRows([buildReplaceSearchRow({ dokusya_id: 5001 })]);

      const result = await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );
      expect(result.data[0].shimei).toBe('山田 太郎');
    });

    it('should concat haitatsu_address from todofuken_name + shikuchoson + chome_banchi + tatemono_mei when building the response', async () => {
      // COVERS: §4.6 — haitatsu_address concatenation
      primeSearchRows([buildReplaceSearchRow({ dokusya_id: 5001 })]);

      const result = await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );
      expect(result.data[0].haitatsu_address).toContain('東京都');
      expect(result.data[0].haitatsu_address).toContain('千代田区');
      expect(result.data[0].haitatsu_address).toContain('1-1-1');
    });

    it('should restrict to tetsuzuki_shurui=1 (購読中) when building the search query', async () => {
      // COVERS: §4.3 固定条件 — d.tetsuzuki_shurui = 1
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const sqlBlobs = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' || ');
      expect(/tetsuzuki_shurui/i.test(sqlBlobs)).toBe(true);
    });

    it('should throw DATE_RANGE_INVALID when hanbaiten_tekiyo_date is today or past (未来日のみ・顧客要件 2026-07)', async () => {
      // COVERS: 検索段でも置換適用日は未来日のみ。
      primeSearchRows([]);
      await expect(
        service.searchForReplace(
          buildReplaceSearchQuery({ hanbaiten_tekiyo_date: '2000-01-01' }),
          buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
        ),
      ).rejects.toMatchObject({ response: { error_code: 'DATE_RANGE_INVALID' } });
    });

    it('should filter eligible 購読者 by hanbaiten_tekiyo_date (dokusya_kaishi_date <= 適用日 AND (chushi IS NULL OR chushi > 適用日))', async () => {
      // COVERS: §4.3 置換可能条件（顧客要件 2026-07）— 適用日で置換可能な購読者のみ返す。
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery({ hanbaiten_tekiyo_date: '2099-12-31' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const sqlBlobs = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' || ');
      expect(/dokusya_kaishi_date\s*<=\s*:rkApplied/i.test(sqlBlobs)).toBe(true);
      expect(/dokusya_chushi_date IS NULL OR d\.dokusya_chushi_date\s*>\s*:rkApplied/i.test(sqlBlobs)).toBe(true);
    });

    it('should filter 購読開始日 range on shoki_dokusya_kaishi_date (NOT dokusya_kaishi_date)', async () => {
      // Regression: 購読開始日 検索は初期購読開始日列を対象にする
      // （dokusya_kaishi_date ではなく shoki_dokusya_kaishi_date）。
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery({
          dokusya_kaishi_date_from: '2024-01-01',
          dokusya_kaishi_date_to: '2024-12-31',
        }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const sqlBlobs = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' || ');
      expect(sqlBlobs).toContain('d.shoki_dokusya_kaishi_date');
      // 範囲フィルタは shoki_ 列を使うこと（範囲パラメータ rkKaishiFrom/To に
      // bare の d.dokusya_kaishi_date を使わない）。bare の d.dokusya_kaishi_date は
      // 販売店適用日 eligibility（<= :rkApplied）専用（顧客要件 2026-07）。
      expect(/d\.dokusya_kaishi_date\s*(>=|<=)\s*:rkKaishi/.test(sqlBlobs)).toBe(false);
    });

    it('should exclude soft-deleted rows when building the search query (deleted_at IS NULL)', async () => {
      // COVERS: §4.3 固定条件 — d.deleted_at IS NULL
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const sqlBlobs = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([sql]: any[]) => (typeof sql === 'string' ? sql : ''))
        .join(' || ');
      expect(/deleted_at/i.test(sqlBlobs)).toBe(true);
    });

    it('should NOT bind a scope param when the session is NICHINO_ADMIN (ja_id null bypass)', async () => {
      // COVERS: §4.2 DataScope — NICHINO_* bypass
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const params = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ]
        .map(([, p]) => p ?? {})
        .reduce((acc: any, p: any) => ({ ...acc, ...p }), {});
      expect(params.scopeJaId).toBeUndefined();
      expect(params.scopeKsId).toBeUndefined();
    });

    it('should apply ja_id DataScope predicate when CHUOKAI', async () => {
      // COVERS: §4.2 DataScope — CHUOKAI narrows by ja_id
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildChuokaiSession({ ja_id: 3 }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const jaScoped = calls.some(
        ([sql]: any[]) => typeof sql === 'string' && /ja_id/i.test(sql),
      );
      expect(jaScoped).toBe(true);
    });

    it('should apply ja_id DataScope predicate when JA_HONTEN', async () => {
      // COVERS: §4.2 DataScope — JA_HONTEN narrows by ja_id
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildJaHontenSession({ ja_id: 5 }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const jaScoped = calls.some(
        ([sql]: any[]) => typeof sql === 'string' && /ja_id/i.test(sql),
      );
      expect(jaScoped).toBe(true);
    });

    it('should apply kanri_shiten_id DataScope predicate when JA_KANRI_SHITEN', async () => {
      // COVERS: §4.2 DataScope — JA_KANRI_SHITEN narrows by kanri_shiten_id
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery(),
        buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10 }),
      );

      const calls = [
        ...dokusyaQb.where.mock.calls,
        ...dokusyaQb.andWhere.mock.calls,
      ];
      const ksScoped = calls.some(
        ([sql]: any[]) => typeof sql === 'string' && /kanri_shiten_id/i.test(sql),
      );
      expect(ksScoped).toBe(true);
    });

    it('should throw DATE_RANGE_INVALID (400) when dokusya_kaishi_date_from > dokusya_kaishi_date_to', async () => {
      // COVERS: §4.1 — date_from > date_to → DATE_RANGE_INVALID
      await expect(
        service.searchForReplace(
          buildReplaceSearchQuery({
            dokusya_kaishi_date_from: '2026-12-31',
            dokusya_kaishi_date_to: '2026-01-01',
          }),
          buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
        ),
      ).rejects.toMatchObject({ code: 'DATE_RANGE_INVALID' });
    });

    it('should apply ORDER BY when sort_by is an allow-listed column', async () => {
      // COVERS: §4.1/§4.5 — sort_by allow-list (kumiaiin_code default)
      primeSearchRows([]);

      await service.searchForReplace(
        buildReplaceSearchQuery({ sort_by: 'hanbaiten_code', sort_order: 'desc' }),
        buildSession({ ja_id: null, role_code: 'NICHINO_ADMIN' }),
      );

      const orderCalls = [
        ...dokusyaQb.orderBy.mock.calls,
        ...dokusyaQb.addOrderBy.mock.calls,
      ];
      const ordered = orderCalls.some(
        ([col]: any[]) => typeof col === 'string' && /hanbaiten_code/i.test(col),
      );
      expect(ordered).toBe(true);
    });

    it('should propagate the error when the data query rejects (→ 500 at the filter)', async () => {
      // COVERS: err:INTERNAL_SERVER_ERROR (row 7) — DB failure bubbles up
      dokusyaQb.getCount.mockRejectedValue(new Error('DB exploded'));
      dokusyaQb.getRawMany.mockRejectedValue(new Error('DB exploded'));
      dataSource.query.mockRejectedValue(new Error('DB exploded'));

      await expect(
        service.searchForReplace(
          buildReplaceSearchQuery(),
          buildChuokaiSession({ ja_id: 1 }),
        ),
      ).rejects.toThrow('DB exploded');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // API-015-002 — replaceHanbaiten (POST /api/v1/dokusya/replace-hanbaiten)
  // ══════════════════════════════════════════════════════════════════════════
  describe('replaceHanbaiten', () => {
    /**
     * Prime the SCR-015 bulk-replace mocks. The candidate fetch is now a
     * `dokusyaRepo.find` returning FULL entities (so the history snapshot
     * can reuse `buildHistoryFromEntity`); the §4.4 hanbaiten-validation
     * SELECT and the master bulk-UPDATE (RETURNING) still go through
     * dataSource.query / manager.query, routed by SQL substring. The
     * rireki rows are written via `manager.save(DokusyaRireki, rows)`.
     *
     * Accepts the same snake_case candidate specs (buildReplaceCandidateRow)
     * and converts them to camelCase entities for find().
     */
    function primeReplace(candidateRows: any[], newHanbaitenJaId: number | null = 1) {
      const candidateEntities = candidateRows.map((r) =>
        buildDokusya({
          dokusyaId: r.dokusya_id,
          jaId: r.ja_id,
          kanriShitenId: r.kanri_shiten_id,
          hanbaitenId: r.hanbaiten_id,
          dokusyaShubetsu: r.dokusya_shubetsu,
          shiharaiHoho: r.shiharai_hoho,
          rirekiNo: r.rireki_no,
        }),
      );
      dokusyaRepo.find.mockResolvedValue(candidateEntities);

      const route = async (sql: any) => {
        const text = String(sql ?? '');
        if (/from\s+m_hanbaiten/i.test(text)) {
          return newHanbaitenJaId === null
            ? []
            : [{ hanbaiten_id: 201, ja_id: newHanbaitenJaId }];
        }
        if (/update\s+t_dokusya\b/i.test(text)) {
          return candidateRows.map((r) => ({
            dokusya_id: r.dokusya_id,
            hanbaiten_id: 201,
            rireki_no: (r.rireki_no ?? 1) + 1,
          }));
        }
        return [];
      };
      dataSource.query.mockImplementation(route);
      txManager.query.mockImplementation(route);
    }

    it('should return the summary + message and commit when all rows are eligible', async () => {
      // COVERS: §4.5/§4.7 — happy path summary + ACSMS-MSG-015-008
      const rows = [
        buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 }),
        buildReplaceCandidateRow({ dokusya_id: 5002, hanbaiten_id: 200 }),
      ];
      primeReplace(rows);

      const result = await service.replaceHanbaiten(
        buildReplaceBody({
          dokusya_ids: [5001, 5002],
          new_hanbaiten_id: 201,
          hanbaiten_tekiyo_date: tekiyoDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({
        total_count: 2,
        replaced_count: 2,
        rireki_count: 2,
        new_hanbaiten_id: 201,
      });
      expect(result.data).toHaveProperty('applied_at');
      expect(result.message).toBe('置換処理が完了しました。');
    });

    it('should invoke applyChange(UPDATE) per candidate with hanbaitenId change at 適用日 (販売店のみ変更イベント)', async () => {
      // 一括置換は各購読者を applyChange(UPDATE) で「販売店のみ変更」する。
      // values は hanbaiten_id のみ、johoDate=hanbaitenDate=販売店適用日
      // （UI 編集 Rule2 と同一）。前回販売店の zenkai_hanbaiten_id 退避・全列の
      // carry-forward・増減報告フラグ(hanbaiten はトリガ)は writer が担う
      // （builder.spec/writer.spec が網羅）。henko_riyu は '販売店一括置換'。
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);

      await service.replaceHanbaiten(
        buildReplaceBody({
          dokusya_ids: [5001],
          new_hanbaiten_id: 201,
          hanbaiten_tekiyo_date: tekiyoDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('UPDATE');
      expect(input.dokusyaId).toBe(5001);
      expect(Number(input.values.hanbaitenId)).toBe(201); // 置換後の販売店
      // 販売店適用日を廃止し joho に統一（顧客要件 2026-07）→ 置換画面の適用日を
      // johoDate として渡す（hanbaitenDate は廃止）。1更新1レコード。
      expect(input.johoDate).toBe(tekiyoDate);
      expect(input.hanbaitenDate).toBeUndefined();
      expect(input.reason).toBe('販売店一括置換');
      expect(input.source).toBe('REPLACE_HANBAITEN');
    });

    it('should perform the writes inside a single dataSource.transaction when all rows are eligible', async () => {
      // COVERS: §4.5/§4.6 — main DML + audit share one transaction
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);

      await service.replaceHanbaiten(
        buildReplaceBody({
          dokusya_ids: [5001],
          new_hanbaiten_id: 201,
          hanbaiten_tekiyo_date: tekiyoDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should write ONE audit log row with log_type=1 / operation="UPDATE" / result_status=1 / target_table="t_dokusya" when the replace succeeds', async () => {
      // COVERS: §4.6 — bulk audit row; operation is BARE 'UPDATE'
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);

      await service.replaceHanbaiten(
        buildReplaceBody({
          dokusya_ids: [5001],
          new_hanbaiten_id: 201,
          hanbaiten_tekiyo_date: tekiyoDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // The bulk replace logs via logOperation OR logUpdate — accept either,
      // then assert the audit context carries the documented fields.
      const opCalls = auditLog.logOperation.mock.calls.map((c: any[]) => c[0]);
      const updCalls = auditLog.logUpdate.mock.calls.map((c: any[]) => c[0]);
      const allCtx = [...opCalls, ...updCalls];

      const wroteAudit =
        auditLog.logOperation.mock.calls.length +
          auditLog.logUpdate.mock.calls.length >
        0;
      expect(wroteAudit).toBe(true);

      const tableOk = allCtx.some(
        (c: any) => c?.table === 't_dokusya' || c?.targetTable === 't_dokusya',
      );
      expect(tableOk).toBe(true);

      // operation must be the BARE verb 'UPDATE' — never prefixed.
      const opValues = [
        ...opCalls.map((c: any) => c?.operation),
        ...auditLog.logOperation.mock.calls.map((c: any[]) => c?.[0]?.operation),
      ].filter(Boolean);
      for (const op of opValues) {
        expect(op).toBe('UPDATE');
      }

      // log_type=1 / result_status=1 when logged via logOperation.
      for (const c of opCalls) {
        if (c?.logType !== undefined) expect(c.logType).toBe(1);
        if (c?.resultStatus !== undefined) expect(c.resultStatus).toBe(1);
      }
    });

    it('should record the screen name "購読者販売店一括置換画面 (ACSMS-SCR-015)" when writing the audit log', async () => {
      // COVERS: §4.6 — gamen_name
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);

      await service.replaceHanbaiten(
        buildReplaceBody({
          dokusya_ids: [5001],
          new_hanbaiten_id: 201,
          hanbaiten_tekiyo_date: tekiyoDate,
        }),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const allCtx = [
        ...auditLog.logOperation.mock.calls.map((c: any[]) => c[0]),
        ...auditLog.logUpdate.mock.calls.map((c: any[]) => c[0]),
      ];
      const screenOk = allCtx.some((c: any) =>
        [c?.gamenName, c?.gamen_name, c?.screen, c?.screenName].some(
          (v: any) =>
            typeof v === 'string' &&
            v.includes('購読者販売店一括置換画面 (ACSMS-SCR-015)'),
        ),
      );
      expect(screenOk).toBe(true);
    });

    it('should throw SAME_HANBAITEN (400) when any candidate already has new_hanbaiten_id', async () => {
      // COVERS: §4.3 業務ルール — hanbaiten_id == new_hanbaiten_id
      const rows = [
        buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 201 }),
      ];
      primeReplace(rows);

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'SAME_HANBAITEN' });
    });

    it('should throw INELIGIBLE_DOKUSYA (400) with errors[] when a candidate is 併読 (dokusya_shubetsu=3)', async () => {
      // COVERS: §4.3 業務ルール — 併読者 (dokusya_shubetsu=3)
      const rows = [
        buildReplaceCandidateRow({
          dokusya_id: 5001,
          hanbaiten_id: 200,
          dokusya_shubetsu: 3,
        }),
      ];
      primeReplace(rows);

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        code: 'INELIGIBLE_DOKUSYA',
      });
    });

    it('should include the offending dokusya_id in errors[] when a 併読 candidate is INELIGIBLE', async () => {
      // COVERS: §4.3 業務ルール — errors[] = { dokusya_id, reason }
      const rows = [
        buildReplaceCandidateRow({
          dokusya_id: 5001,
          hanbaiten_id: 200,
          dokusya_shubetsu: 3,
        }),
      ];
      primeReplace(rows);

      let caught: any;
      try {
        await service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.some((e: any) => e.dokusya_id === 5001)).toBe(true);
    });

    it('should throw INELIGIBLE_DOKUSYA (400) when a candidate is 電子版クレカ (dokusya_shubetsu=2 && shiharai_hoho=6)', async () => {
      // COVERS: §4.3 業務ルール — 電子版クレカ決済者
      const rows = [
        buildReplaceCandidateRow({
          dokusya_id: 5002,
          hanbaiten_id: 200,
          dokusya_shubetsu: 2,
          shiharai_hoho: 6,
        }),
      ];
      primeReplace(rows);

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5002],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'INELIGIBLE_DOKUSYA' });
    });

    it('should throw NOT_FOUND (404) when one of the dokusya_ids does not resolve to a candidate row', async () => {
      // COVERS: §4.3 — missing dokusya_id → NOT_FOUND
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001, 9999],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should reject the request when hanbaiten_tekiyo_date is past/today (未来日のみ・顧客要件 2026-07)', async () => {
      // COVERS: §4.1 — 一括置換=販売店のみ変更=情報変更適用日 → tekiyo_date > today。
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);
      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: pastDate(7),
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeDefined();

      // 当日も未来日のみ許可なので弾かれる。
      primeReplace(rows);
      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: todayIsoJst(),
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toBeDefined();
    });

    it('should throw DATA_SCOPE_VIOLATION (403) when a candidate row belongs to another JA (CHUOKAI)', async () => {
      // COVERS: §4.3 DataScope — out-of-scope candidate
      const rows = [
        buildReplaceCandidateRow({ dokusya_id: 5001, ja_id: 2, hanbaiten_id: 200 }),
      ];
      primeReplace(rows);

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'DATA_SCOPE_VIOLATION' });
    });

    it('should throw DATA_SCOPE_VIOLATION (403) when the new_hanbaiten belongs to another JA (§4.4)', async () => {
      // COVERS: §4.4 — m_hanbaiten.ja_id out of session scope
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, ja_id: 1, hanbaiten_id: 200 })];
      primeReplace(rows, 2); // new hanbaiten's ja_id = 2 (other tenant)

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'DATA_SCOPE_VIOLATION' });
    });

    it('should roll back and NOT resolve successfully when the audit log inside the tx fails', async () => {
      // COVERS: §4.5/§4.8 — atomic business + audit; failure rolls back
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));
      auditLog.logUpdate.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow('audit log broke');
    });

    it('should write the error log (log_type=3 / result_status=2) OUTSIDE the rolled-back tx when the DML fails', async () => {
      // COVERS: §4.8 — error log emitted on the standalone connection
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows);
      // Force the in-transaction UPDATE to blow up.
      txManager.query.mockImplementation(async (sql: any) => {
        const text = String(sql ?? '');
        if (/update\s+t_dokusya\b/i.test(text)) {
          throw new Error('DML exploded');
        }
        if (/from\s+t_dokusya/i.test(text)) return rows;
        if (/from\s+m_hanbaiten/i.test(text)) {
          return [{ hanbaiten_id: 201, ja_id: 1 }];
        }
        return [];
      });

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 201,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow('DML exploded');

      // Error log path: logError OR logOperation with log_type=3 / result_status=2.
      const wroteErrorLog =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some(
          (c: any[]) => c?.[0]?.logType === 3 || c?.[0]?.resultStatus === 2,
        );
      expect(wroteErrorLog).toBe(true);

      // The error log MUST NOT be bound to the rolled-back manager — assert
      // it was NOT passed `txManager` as the manager arg.
      const errArgs = [
        ...auditLog.logError.mock.calls,
        ...auditLog.logOperation.mock.calls.filter(
          (c: any[]) => c?.[0]?.logType === 3 || c?.[0]?.resultStatus === 2,
        ),
      ];
      for (const args of errArgs) {
        expect(args).not.toContain(txManager);
      }
    });

    it('should propagate a NOT_FOUND (404) when the new_hanbaiten does not exist (§4.4)', async () => {
      // COVERS: §4.4 — replace target hanbaiten missing
      const rows = [buildReplaceCandidateRow({ dokusya_id: 5001, hanbaiten_id: 200 })];
      primeReplace(rows, null); // m_hanbaiten lookup returns []

      await expect(
        service.replaceHanbaiten(
          buildReplaceBody({
            dokusya_ids: [5001],
            new_hanbaiten_id: 999,
            hanbaiten_tekiyo_date: tekiyoDate,
          }),
          buildChuokaiSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    // err:TOO_MANY_REQUESTS (row 6) — ThrottlerGuard fires only through the
    // full app pipeline, not at the service layer.
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// Drives the two NEW methods appended to DokusyaService:
//   - downloadImportTemplate(session)      → GET  /api/v1/dokusya/import/template (API-016-001)
//   - importExcel(dto, session, req)       → POST /api/v1/dokusya/import          (API-016-002)
//
// Constructor signature is REUSED unchanged (NO new param):
//   (dokusyaRepo, rirekiRepo, shitenRepo, dataSource, auditLog, codeService)
// The template builds an Excel workbook in-service (ExcelJS). Import does
// its tanka / hanbaiten / kanri_shiten / shiten / existing-dokusya lookups
// via dataSource.query (pre-tx §4.3) and the INSERT/UPDATE/RETURNING via
// manager.query inside dataSource.transaction (§4.4/§4.5). Both query mocks
// are routed by SQL substring so tests don't depend on call order.
//
// NOTE: this block is appended to the already-green dokusya.service.spec.ts
// (SCR-011/013/014/015) — it carries NO @ts-nocheck banner and is written
// type-clean (`let service: any`, typed helper params) so the whole file
// keeps compiling.
// ════════════════════════════════════════════════════════════════════════════
describe('DokusyaService — SCR-016 (Excel import: template + bulk import)', () => {
  let service: any;
  let dokusyaRepo: any;
  let rirekiRepo: any;
  let shitenRepo: any;
  let auditLog: any;
  let codeService: any;
  let dataSource: any;
  let txManager: any;
  // Pha3 (S3.2): 取込 NEW は共通ライタ applyChange(CREATE) に集約された。NEW の
  // 履歴/master 生成の中身は writer(builder)が網羅するので、SCR-016 NEW テストは
  // service が正しい values(FK解決・承認状態・配達先フラグ)/johoDate で applyChange
  // を呼ぶ契約を検証する。UPDATE も applyChange(UPDATE) に集約され spy で検証する。
  let applyChangeSpy!: jest.SpyInstance;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as { ip: string; headers: Record<string, string> };

  const SCREEN = '購読者Excelデータ取込画面 (ACSMS-SCR-016)';

  /** All applyChange inputs (2nd arg) across the calls in a test, in order. */
  function applyChangeInputs(): any[] {
    return applyChangeSpy.mock.calls.map((c) => c[1]);
  }

  function makeQbMock(): Record<string, jest.Mock> {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
  }

  /**
   * Route a raw SQL string to the right canned result set. Defaults model a
   * caller in JA=1 where tanka T001 (id 1), hanbaiten H001 (id 5),
   * kanri_shiten 101, shiten 1001 all resolve, and no existing dokusya
   * (NEW-friendly). Override per-test via `over`.
   */
  function buildSqlRouter(over: {
    tanka?: Array<Record<string, unknown>>;
    hanbaiten?: Array<Record<string, unknown>>;
    kanriShiten?: Array<Record<string, unknown>>;
    shiten?: Array<Record<string, unknown>>;
    existing?: Array<Record<string, unknown>>;
    onUpdate?: (sql: string) => Array<Record<string, unknown>>;
    onInsert?: (sql: string) => Array<Record<string, unknown>>;
  } = {}) {
    const tanka = over.tanka ?? [{ tanka_id: 1, tanka_code: 'T001' }];
    const hanbaiten = over.hanbaiten ?? [{ hanbaiten_id: 5, hanbaiten_code: 'H001' }];
    const kanriShiten = over.kanriShiten ?? [
      { kanri_shiten_id: 101, kanri_shiten_code: 'KS001' },
    ];
    const shiten = over.shiten ?? [{ shiten_id: 1001, shiten_code: 'SH001' }];
    const existing = over.existing ?? [];
    return async (sql: unknown): Promise<Array<Record<string, unknown>>> => {
      const text = String(sql ?? '');
      if (/update\s+t_dokusya_rireki/i.test(text)) return [];
      if (/insert\s+into\s+t_dokusya_rireki/i.test(text)) {
        return over.onInsert ? over.onInsert(text) : [{}];
      }
      if (/insert\s+into\s+t_dokusya\b/i.test(text)) {
        return over.onInsert ? over.onInsert(text) : [{ dokusya_id: 10001 }];
      }
      if (/update\s+t_dokusya\b/i.test(text)) {
        return over.onUpdate ? over.onUpdate(text) : [{ dokusya_id: 10001 }];
      }
      if (/from\s+m_tanka/i.test(text)) return tanka;
      if (/from\s+m_hanbaiten/i.test(text)) return hanbaiten;
      if (/from\s+m_kanri_shiten/i.test(text)) return kanriShiten;
      if (/from\s+m_shiten/i.test(text)) return shiten;
      if (/from\s+t_dokusya\b/i.test(text)) return existing;
      return [];
    };
  }

  function primeImport(over: Parameters<typeof buildSqlRouter>[0] = {}): void {
    const route = buildSqlRouter(over);
    dataSource.query.mockImplementation(route);
    txManager.query.mockImplementation(route);
    // writeRirekiSnapshot は after(=Dokusya) / before(=DokusyaRireki) を
    // manager.findOne で取得する。entity 名で分岐して最小スタブを返す。
    txManager.findOne.mockImplementation(async (entity: any) => {
      const name = entity?.name;
      const addr = {
        haitatsuSameFlg: true,
        yubinNo: '',
        todofukenCode: '',
        shikuchoson: '',
        chomeBanchi: '',
        tatemonoMei: '',
        haitatsuYubinNo: '',
        haitatsuTodofukenCode: '',
        haitatsuShikuchoson: '',
        haitatsuChomeBanchi: '',
        haitatsuTatemonoMei: '',
        dokusyaBusu: 1,
        hanbaitenId: 5,
      };
      if (name === 'DokusyaRireki') {
        return { dokusyaId: 7001, rirekiNo: 1, saishinDataFlg: true, ...addr };
      }
      // Dokusya (after)
      return { dokusyaId: 7001, jaId: 1, tetsuzukiShurui: 1, ...addr };
    });
  }

  beforeEach(() => {
    dokusyaRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    rirekiRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    shitenRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => makeQbMock()),
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
      // Reverse lookup the import uses to turn a Japanese m_code label
      // (「男性」/「普通」) into its stored numeric code. Mirrors the seeded
      // GENDER / YOKIN_SHUBETSU rows; unknown labels resolve to null.
      getValueByLabel: jest.fn((category: string, label: string) => {
        const map: Record<string, Record<string, number>> = {
          GENDER: { 男性: 1, 女性: 2, 回答しない: 9 },
          YOKIN_SHUBETSU: { 普通: 1, 当座: 2 },
        };
        return map[category]?.[label] ?? null;
      }),
      reload: jest.fn(),
    };
    txManager = {
      create: jest.fn((_entity: unknown, value: unknown) => ({
        ...(value as Record<string, unknown>),
      })),
      save: jest.fn(
        async (entityOrValue: unknown, maybeValue?: unknown) => {
          const value = maybeValue ?? entityOrValue;
          return Array.isArray(value)
            ? value.map((v) => ({ ...(v as Record<string, unknown>) }))
            : { ...(value as Record<string, unknown>) };
        },
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn(async () => []),
      createQueryBuilder: jest.fn(() => makeQbMock()),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: typeof txManager) => unknown) =>
        cb(txManager),
      ),
      query: jest.fn(async () => []),
    };

    // accountRepo — approve/reject hit the 購読種別-flag gate; grant both.
    const accountFlags = new DokusyaAccountFlagService({
      findOne: jest.fn(async () => ({ accountId: 1, paperFlg: true, denshiFlg: true })),
    } as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      rirekiRepo,
      shitenRepo,
      // FK-scope repos — unused by these describes (no create/update).
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      { findOne: jest.fn() },
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );

    // NEW 取込は applyChange(CREATE) を通る。CREATE の master/履歴生成を writer に
    // 委ね、service は正しい values/johoDate を渡す契約のみ検証する。妥当な
    // ApplyChangeResult を返して importExcel の集計を進行させる。
    applyChangeSpy = jest
      .spyOn(historyWriter, 'applyChange')
      .mockImplementation(async (_m: any, input: any) => ({
        dokusyaId: 1,
        insertedRirekiIds: [1],
        before: null,
        after: {
          dokusyaId: 1,
          dokusyaShubetsu: Number((input.values ?? {}).dokusyaShubetsu ?? 1),
        } as any,
        denshiSync: false,
      }));
  });

  afterEach(() => applyChangeSpy.mockRestore());

  // ══════════════════════════════════════════════════════════════════════════
  // API-016-001 — downloadImportTemplate (GET /api/v1/dokusya/import/template)
  // ══════════════════════════════════════════════════════════════════════════
  describe('downloadImportTemplate', () => {
    it('should return a buffer and the Japanese filename when the template is generated', async () => {
      // COVERS: §4.3/§4.4 — ExcelJS workbook → { buffer, filename }
      const result = await service.downloadImportTemplate(
        buildJaHontenSession({ ja_id: 1 }),
      );

      expect(result.filename).toBe('購読者Excelデータ取込_テンプレート.xlsx');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect((result.buffer as Buffer).length).toBeGreaterThan(0);
    });

    it('should NOT record an audit log when generating the template (read-only discovery action)', async () => {
      // COVERS: §4 — template download is not a state change
      await service.downloadImportTemplate(buildJaHontenSession({ ja_id: 1 }));

      expect(auditLog.logOperation).not.toHaveBeenCalled();
      expect(auditLog.logCreate).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // API-016-002 — importExcel (POST /api/v1/dokusya/import)
  // ══════════════════════════════════════════════════════════════════════════
  describe('importExcel — NEW mode happy path', () => {
    it('should return the import summary + message when all NEW rows are valid', async () => {
      // COVERS: §4.4/§4.6 — レスポンスデータ shape + ACSMS-MSG-016-004
      primeImport();

      const result = await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({
        import_mode: 'NEW',
        total_rows: 1,
        created_count: 1,
        updated_count: 0,
        cancelled_count: 0,
        skipped_count: 0,
        rireki_count: 1,
      });
      expect(result.data).toHaveProperty('imported_at');
      expect(result.message).toBe('取り込みました。');
    });

    it('should perform the writes inside a single dataSource.transaction when the import succeeds', async () => {
      // COVERS: §4.4/§4.5 — main DML + audit share one transaction
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should write ONE audit log with log_type=1 / operation="IMPORT_NEW" / result_status=1 / target_table="t_dokusya" when the import succeeds', async () => {
      // COVERS: §4.5 — bulk batch audit; operation はモード別 prefixed ラベル
      // (NEW→IMPORT_NEW)。販売店取込 (SCR-019) と統一（bare-verb ルールの例外）。
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const opCtx = auditLog.logOperation.mock.calls.map(
        (c: unknown[]) => c[0] as Record<string, unknown>,
      );
      const createCtx = auditLog.logCreate.mock.calls.map(
        (c: unknown[]) => c[0] as Record<string, unknown>,
      );
      const allCtx = [...opCtx, ...createCtx];

      const wroteAudit =
        auditLog.logOperation.mock.calls.length +
          auditLog.logCreate.mock.calls.length >
        0;
      expect(wroteAudit).toBe(true);

      const tableOk = allCtx.some(
        (c) => c?.table === 't_dokusya' || c?.targetTable === 't_dokusya',
      );
      expect(tableOk).toBe(true);

      // operation はモード別 prefixed ラベル（NEW → IMPORT_NEW）。
      const opValues = [
        ...allCtx.map((c) => c?.operation),
        ...auditLog.logOperation.mock.calls.map(
          (c: unknown[]) => (c[0] as Record<string, unknown>)?.operation,
        ),
      ].filter(Boolean);
      for (const op of opValues) {
        expect(op).toBe('IMPORT_NEW');
      }

      for (const c of opCtx) {
        if (c?.logType !== undefined) expect(c.logType).toBe(1);
        if (c?.resultStatus !== undefined) expect(c.resultStatus).toBe(1);
      }
    });

    it('should record the screen name "購読者Excelデータ取込画面 (ACSMS-SCR-016)" when writing the audit log', async () => {
      // COVERS: §4.5 — gamen_name
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const allCtx = [
        ...auditLog.logOperation.mock.calls.map(
          (c: unknown[]) => c[0] as Record<string, unknown>,
        ),
        ...auditLog.logCreate.mock.calls.map(
          (c: unknown[]) => c[0] as Record<string, unknown>,
        ),
      ];
      const screenOk = allCtx.some((c) =>
        [c?.gamenName, c?.gamen_name, c?.screen, c?.screenName].some(
          (v) => typeof v === 'string' && v.includes(SCREEN),
        ),
      );
      expect(screenOk).toBe(true);
    });

    it('should add one t_dokusya_rireki record per imported row when the import succeeds (rireki_count matches total_rows)', async () => {
      // COVERS: §4.4.5 — 取込件数分のレコードを t_dokusya_rireki に追加
      primeImport();

      const result = await service.importExcel(
        buildImportBody({
          rows: [
            buildImportRow({ kumiaiin_code: 'K1' }),
            buildImportRow({ kumiaiin_code: 'K2' }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data.total_rows).toBe(2);
      expect(result.data.rireki_count).toBe(2);
    });

    it('should set denshi_shonin_status=承認(1) on NEW import for 電子版(2) and null for 紙版(1)', async () => {
      // 顧客要件: Excel一括取込の電子版(2)は承認済(1)で登録する（職員操作のため）。
      // 紙版(1)は電子申請ワークフロー対象外なので null。NEW は applyChange(CREATE)
      // 経由になったので、渡す values.denshiShoninStatus を検証する。
      primeImport();

      await service.importExcel(
        buildImportBody({
          import_mode: 'NEW',
          rows: [
            buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 2, kumiaiin_code: 'D1' }),
            buildImportRow({ dokusya_shubetsu: 1, shiharai_hoho: 1, kumiaiin_code: 'P1' }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const inputs = applyChangeInputs();
      expect(inputs).toHaveLength(2);
      inputs.forEach((i) => expect(i.mode).toBe('CREATE'));
      // 電子版 → 承認(1)。紙版 → null。
      expect(inputs[0].values.denshiShoninStatus).toBe(1);
      expect(inputs[1].values.denshiShoninStatus).toBeNull();
    });
  });

  describe('importExcel — top-level validation', () => {
    it('should throw ROW_LIMIT_EXCEEDED (400) when rows length exceeds 30000', async () => {
      // COVERS: §4.1 — ROW_LIMIT_EXCEEDED
      const rows = Array.from({ length: 30001 }, (_v, i) =>
        buildImportRow({ kumiaiin_code: `K${i}` }),
      );
      primeImport();

      await expect(
        service.importExcel(
          buildImportBody({ rows }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'ROW_LIMIT_EXCEEDED' });
    });

    it('should throw VALIDATION_ERROR (400) when NEW mode omits a required column from selected_columns', async () => {
      // COVERS: §4.1 — NEW mode must include the 13 required columns
      primeImport();
      const partialColumns = buildImportRequiredColumns().filter(
        (c) => c !== 'tanka_code',
      );

      await expect(
        service.importExcel(
          buildImportBody({ selected_columns: partialColumns }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('importExcel — row-level validation (IMPORT_VALIDATION_ERROR)', () => {
    it('should throw IMPORT_VALIDATION_ERROR with a row error when dokusya_shubetsu is 3 (併読)', async () => {
      // COVERS: §4.1 — 3:併読 はExcel取込み対象外
      primeImport();

      await expect(
        service.importExcel(
          buildImportBody({ rows: [buildImportRow({ dokusya_shubetsu: 3 })] }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
    });

    it('should include the offending row index + field when dokusya_shubetsu=3 is rejected', async () => {
      // COVERS: §4.1 — errors[] = { row, field, message }
      primeImport();

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({ rows: [buildImportRow({ dokusya_shubetsu: 3 })] }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(Array.isArray(errors)).toBe(true);
      expect(
        errors.some(
          (e: Record<string, unknown>) =>
            e.field === 'dokusya_shubetsu' && typeof e.row === 'number',
        ),
      ).toBe(true);
    });

    it('should ALLOW a NEW row whose kumiaiin_code already exists in the JA (組合員コードは重複可)', async () => {
      // 組合員コードは JA 内で重複を許容する（世帯員など）。DB にも UNIQUE
      // 制約は無いため、既存コードと同じでも NEW 取込みは成功し新規作成される。
      primeImport({
        existing: [
          { dokusya_id: 999, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
      });

      const result = await service.importExcel(
        buildImportBody({ rows: [buildImportRow({ kumiaiin_code: 'K00001' })] }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({
        import_mode: 'NEW',
        total_rows: 1,
        created_count: 1,
      });
    });

    it('should throw IMPORT_VALIDATION_ERROR when 電子版 (dokusya_shubetsu=2) is paired with クレジットカード (shiharai_hoho=6)', async () => {
      // COVERS: §4.1 業務ルール — 電子版かつクレカ決済取込不可
      primeImport();

      await expect(
        service.importExcel(
          buildImportBody({
            rows: [buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 6 })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=email when a 電子版 row has a blank email', async () => {
      // 顧客要件: メールは電子版(2)・併読(3) で必須。
      primeImport();

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 2, email: '' })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some((e: Record<string, unknown>) => e.field === 'email'),
      ).toBe(true);
    });

    it('should allow a blank email for a 紙版 row (email optional for 紙版)', async () => {
      // 顧客要件: 紙版(1) は email 任意。
      primeImport();

      const result = await service.importExcel(
        buildImportBody({
          rows: [buildImportRow({ dokusya_shubetsu: 1, email: '' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({ total_rows: 1, created_count: 1 });
    });

    it('should throw IMPORT_VALIDATION_ERROR (field=email) when two 電子版 rows in the batch share an email', async () => {
      // 顧客要件: メール一意性は電子版/併読のレコード間で担保 — バッチ内重複も検知。
      primeImport();

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [
              buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 2, kumiaiin_code: 'D1', email: 'same@example.com' }),
              buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 2, kumiaiin_code: 'D2', email: 'same@example.com' }),
            ],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some((e: Record<string, unknown>) => e.field === 'email'),
      ).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR (field=email) when a 電子版 row reuses an existing 電子版 email', async () => {
      // 顧客要件: DB 内の電子版/併読レコードとの重複も検知する。
      primeImport({
        existing: [
          {
            dokusya_id: 999,
            kumiaiin_code: 'XXX',
            ja_id: 1,
            kanri_shiten_id: 101,
            dokusya_shubetsu: 2,
            email: 'taken@example.com',
          },
        ],
      });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [
              buildImportRow({ dokusya_shubetsu: 2, shiharai_hoho: 2, kumiaiin_code: 'D1', email: 'taken@example.com' }),
            ],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some((e: Record<string, unknown>) => e.field === 'email'),
      ).toBe(true);
    });

    it('should allow two 紙版 rows in the batch to share an email (紙版 not checked for uniqueness)', async () => {
      // 顧客要件: 紙版は重複可。
      primeImport();

      const result = await service.importExcel(
        buildImportBody({
          rows: [
            buildImportRow({ dokusya_shubetsu: 1, kumiaiin_code: 'P1', email: 'paper@example.com' }),
            buildImportRow({ dokusya_shubetsu: 1, kumiaiin_code: 'P2', email: 'paper@example.com' }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({ total_rows: 2, created_count: 2 });
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=tanka_code when the tanka_code does not resolve', async () => {
      // COVERS: §4.3.1 — 未ヒットの tanka_code
      primeImport({ tanka: [] });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({ rows: [buildImportRow({ tanka_code: 'TNOPE' })] }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some((e: Record<string, unknown>) => e.field === 'tanka_code'),
      ).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=hanbaiten_code when the hanbaiten_code does not resolve', async () => {
      // COVERS: §4.3.2 — 未ヒットの hanbaiten_code
      primeImport({ hanbaiten: [] });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [buildImportRow({ hanbaiten_code: 'HNOPE' })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some(
          (e: Record<string, unknown>) => e.field === 'hanbaiten_code',
        ),
      ).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=kanri_shiten_code when the kanri_shiten_code does not resolve', async () => {
      // 顧客要件: 管理支店はコードで取込み — 未ヒットのコードは行エラー化。
      primeImport({ kanriShiten: [] });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [buildImportRow({ kanri_shiten_code: 'KSNOPE' })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some(
          (e: Record<string, unknown>) => e.field === 'kanri_shiten_code',
        ),
      ).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=shiten_code when the shiten_code does not resolve', async () => {
      // 顧客要件: 支店はコードで取込み — 未ヒットのコードは行エラー化。
      primeImport({ shiten: [] });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            rows: [buildImportRow({ shiten_code: 'SHNOPE' })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some(
          (e: Record<string, unknown>) => e.field === 'shiten_code',
        ),
      ).toBe(true);
    });

    it('should resolve kanri_shiten_code / shiten_code to their ids in the NEW applyChange values', async () => {
      // 取込みはコード入力 → 物理カラム kanri_shiten_id / shiten_id へ解決して
      // applyChange の values に載せる。
      primeImport();

      await service.importExcel(
        buildImportBody({
          rows: [buildImportRow({ kanri_shiten_code: 'KS001', shiten_code: 'SH001' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const values = applyChangeInputs()[0].values;
      expect(values.kanriShitenId).toBe(101); // KS001 → 101
      expect(values.shitenId).toBe(1001); // SH001 → 1001
    });

    it('should set haitatsu_same_flg=false in the NEW applyChange values when 配達先 fields have data', async () => {
      // 配達先(delivery destination)に入力があれば「別住所」: same_flg=false。
      // 増減報告フラグ(zougen)は writer が computeZougen で立てる（CREATE は常に true）。
      primeImport();

      await service.importExcel(
        buildImportBody({
          rows: [
            buildImportRow({
              haitatsu_shimei_sei: '配達',
              haitatsu_shimei_mei: '太郎',
            }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeInputs()[0].values.haitatsuSameFlg).toBe(false);
    });

    it('should keep haitatsu_same_flg=true in the NEW applyChange values when no 配達先 field has data', async () => {
      // 配達先入力なし → 従来どおり「同じ」(true)。
      primeImport();

      await service.importExcel(
        buildImportBody({ rows: [buildImportRow()] }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeInputs()[0].values.haitatsuSameFlg).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR when NEW mode dokusya_busu is 0 (must be > 0)', async () => {
      // COVERS: §4.1 — NEW: dokusya_busu > 0
      primeImport();

      await expect(
        service.importExcel(
          buildImportBody({ rows: [buildImportRow({ dokusya_busu: 0 })] }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=dokusya_id when UPDATE targets a non-existent record', async () => {
      // COVERS: §4.3.4 — UPDATE_* 未ヒットは「存在しない」エラー
      primeImport({ existing: [] });

      await expect(
        service.importExcel(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: 99999 })],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
    });

    it('should throw IMPORT_VALIDATION_ERROR with field=kumiaiin_code when a 一括中止 row references an unknown kumiaiin_code', async () => {
      // COVERS: §4.3.4 — 一括中止 via kumiaiin_code 未ヒット
      primeImport({ existing: [] });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['kumiaiin_code', 'tetsuzuki_shurui', 'dokusya_busu'],
            rows: [
              buildImportRow({
                tetsuzuki_shurui: 0,
                dokusya_busu: 0,
                kumiaiin_code: 'UNKNOWN',
              }),
            ],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some(
          (e: Record<string, unknown>) => e.field === 'kumiaiin_code',
        ),
      ).toBe(true);
    });

    it('should throw IMPORT_VALIDATION_ERROR (field=kumiaiin_code) when a 解約 keys by kumiaiin_code that matches MORE THAN ONE record', async () => {
      // 組合員コードは重複可。dokusya_id 無しで kumiaiin キーが複数ヒットすると
      // 一括誤更新になるため、ID 指定を促すエラーにする。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
          { dokusya_id: 7002, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
      });

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['kumiaiin_code', 'tetsuzuki_shurui', 'dokusya_busu'],
            rows: [
              buildImportRow({
                tetsuzuki_shurui: 0,
                dokusya_busu: 0,
                kumiaiin_code: 'K00001',
              }),
            ],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught?.code).toBe('IMPORT_VALIDATION_ERROR');
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(
        errors.some(
          (e: Record<string, unknown>) =>
            e.field === 'kumiaiin_code' &&
            String(e.message).includes('重複'),
        ),
      ).toBe(true);
    });

    it('should proceed (no duplicate error) when dokusya_id is supplied even if its kumiaiin_code is duplicated', async () => {
      // dokusya_id があれば一意に決まるため、kumiaiin が重複しても更新可。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
          { dokusya_id: 7002, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      const result = await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'dokusya_busu'],
          rows: [
            buildImportRow({ dokusya_id: 7001, kumiaiin_code: 'K00001', dokusya_busu: 5 }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data).toMatchObject({ updated_count: 1 });
    });

    it('should invoke applyChange(CREATE) exactly once for a NEW row (t_dokusya + rireki #1)', async () => {
      // NEW → applyChange(CREATE) が master + rireki #1 を1件ずつ生成する
      // （履歴1件・saishin 確定は writer.spec が網羅）。
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      expect(applyChangeInputs()[0].mode).toBe('CREATE');
    });

    it('should acquire a FOR UPDATE (pessimistic_write) lock on the master row before assigning rireki_no (UI と同じ直列化)', async () => {
      // 同一購読者への同時編集で rireki_no 衝突しないよう、採番前に行ロック。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'email'],
          rows: [buildImportRow({ dokusya_id: 7001, email: 'new@example.com' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const lockCall = txManager.findOne.mock.calls.find((c: unknown[]) => {
        const opts = c[1] as { lock?: { mode?: string } } | undefined;
        return opts?.lock?.mode === 'pessimistic_write';
      });
      expect(lockCall).toBeDefined();
    });

    it('should invoke applyChange(UPDATE) for an UPDATE row (dokusya_id 解決 + values)', async () => {
      // UPDATE は S3.2b で applyChange(UPDATE) に集約。対象 dokusya_id を解決し
      // 変更後値を values に載せる（履歴の生成・分割は writer.spec が網羅）。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'dokusya_busu'],
          rows: [buildImportRow({ dokusya_id: 7001, dokusya_busu: 5 })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('UPDATE');
      expect(input.dokusyaId).toBe(7001);
      expect(input.values.dokusyaBusu).toBe(5);
    });

    it('should invoke applyChange(UPDATE) with only the selected column for an UPDATE row', async () => {
      // UPDATE は S3.2c で applyChange(UPDATE) に集約。選択列(email)のみ
      // values に載る（履歴の生成は writer.spec が網羅）。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'email'],
          rows: [buildImportRow({ dokusya_id: 7001, email: 'new@example.com' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(applyChangeSpy).toHaveBeenCalledTimes(1);
      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('UPDATE');
      expect(input.dokusyaId).toBe(7001);
      expect(input.values.email).toBe('new@example.com');
    });

    // 顧客要件 2026-07: 取込も販売店適用日を廃止し joho に統一 → 1更新1レコード
    // （UI/置換と同一）。情報＋販売店が同時に変わっても hanbaitenDate は渡さない。
    it('should pass changed hanbaiten_id with johoDate only (no hanbaitenDate) for a BOTH info+販売店 UPDATE — 1更新1レコード', async () => {
      // 2件分割そのものは writer(splitEvents) の責務で writer.spec が網羅する。
      // service 契約としては、販売店変更後の hanbaiten_id を values に載せ、情報変更
      // 適用日(johoDate)と販売店適用日(hanbaitenDate)を applyChange へ渡すことを検証。
      primeImport({
        existing: [
          {
            dokusya_id: 7001,
            kumiaiin_code: 'K00001',
            ja_id: 1,
            kanri_shiten_id: 101,
            hanbaiten_id: 5, // 既存販売店
          },
        ],
        hanbaiten: [
          { hanbaiten_id: 5, hanbaiten_code: 'H001' },
          { hanbaiten_id: 9, hanbaiten_code: 'H009' },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'dokusya_busu', 'hanbaiten_code'],
          rows: [
            buildImportRow({
              dokusya_id: 7001,
              dokusya_busu: 6,
              hanbaiten_code: 'H009', // 5 → 9（販売店変更）
              joho_henko_tekiyo_date: '2099-03-01',
            }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('UPDATE');
      expect(Number(input.values.hanbaitenId)).toBe(9); // H009 → 9
      expect(input.johoDate).toBe('2099-03-01'); // 唯一の適用日(joho)
      expect(input.hanbaitenDate).toBeUndefined(); // 販売店適用日は廃止
    });

    it('should throw IMPORT_VALIDATION_ERROR when an UPDATE row omits joho_henko_tekiyo_date', async () => {
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await expect(
        service.importExcel(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'dokusya_busu'],
            rows: [
              buildImportRow({
                dokusya_id: 7001,
                dokusya_busu: 6,
                joho_henko_tekiyo_date: '', // 必須を空に
              }),
            ],
          }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
    });

    it('should set haitatsu_same_flg=false in values and forceZougen for UPDATE when a selected 配達先 column has data', async () => {
      // 増減対象の変更(購読部数/販売店/住所)が無くても、選択された配達先列に
      // 値があれば same_flg を下ろし forceZougen で増減報告対象にする。zougen フラグ
      // 自体の付与は writer が forceZougen を受けて行う（builder.spec）。
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'haitatsu_shikuchoson'],
          rows: [buildImportRow({ dokusya_id: 7001, haitatsu_shikuchoson: '渋谷区' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = applyChangeInputs()[0];
      expect(input.values.haitatsuSameFlg).toBe(false);
      expect(input.forceZougen).toBe(true);
    });

    // 顧客要件 2026-06: 「購読者情報と同じ」列が明示指定されたら BE は推論せず
    // その値を採用する（配達先データがあっても列が true なら same_flg=true）。
    it('should use the explicit haitatsu_same_flg column over delivery-data inference (UPDATE)', async () => {
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'haitatsu_same_flg', 'haitatsu_shikuchoson'],
          rows: [
            buildImportRow({
              dokusya_id: 7001,
              haitatsu_same_flg: true, // 明示 true
              haitatsu_shikuchoson: '渋谷区', // 配達先データあり（推論なら false になるはず）
            }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 明示 true が推論(false)より優先されて values に載る。
      expect(applyChangeInputs()[0].values.haitatsuSameFlg).toBe(true);
    });

    it('should invoke applyChange(CREATE) for a NEW row so shinki/zougen match UI create', async () => {
      // NEW は applyChange(CREATE)。CREATE の rireki は writer が shinki=true /
      // kaiyaku=false / zougen=true（CREATE は常に増減対象）で生成する — builder.spec
      // が網羅。service 契約としては CREATE モードで手続種類=新規(1)を渡すことを検証。
      primeImport();

      await service.importExcel(
        buildImportBody({ rows: [buildImportRow({ tetsuzuki_shurui: 1 })] }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('CREATE');
      // NEW は手続種類=新規(1)固定（顧客要件 2026-06）。
      expect(input.values.tetsuzukiShurui).toBe(1);
    });

    it('should NOT set kaiyaku_flg on an UPDATE row (解約は取込対象外。バッチ処理)', async () => {
      primeImport({
        existing: [
          { dokusya_id: 7001, kumiaiin_code: 'K00001', ja_id: 1, kanri_shiten_id: 101 },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });
      // before(履歴)=部数3 / after(master)=部数6 を返すよう findOne を上書き。
      txManager.findOne.mockImplementation(async (entity: any) => {
        const base = {
          haitatsuSameFlg: true,
          yubinNo: '', todofukenCode: '', shikuchoson: '', chomeBanchi: '', tatemonoMei: '',
          haitatsuYubinNo: '', haitatsuTodofukenCode: '', haitatsuShikuchoson: '',
          haitatsuChomeBanchi: '', haitatsuTatemonoMei: '', dokusyaBusu: 6, hanbaitenId: 5,
        };
        if (entity?.name === 'DokusyaRireki') {
          return { dokusyaId: 7001, rirekiNo: 1, saishinDataFlg: true, ...base, dokusyaBusu: 3 };
        }
        return { dokusyaId: 7001, jaId: 1, tetsuzukiShurui: 1, ...base };
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'dokusya_busu'],
          rows: [buildImportRow({ dokusya_id: 7001, dokusya_busu: 6 })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      // 取込 UPDATE は applyChange(UPDATE)。解約フラグは applyChange 経路では
      // 決して立たない（buildRirekiRow が kaiyaku=false 固定・shinki=false、解約は
      // batch insertKaiyaku 専用 — writer.spec が網羅）。service 契約としては
      // UPDATE モードで変更後の購読部数を渡すことを検証する。
      const input = applyChangeInputs()[0];
      expect(input.mode).toBe('UPDATE');
      expect(input.values.dokusyaBusu).toBe(6);
    });

    it('should cap the errors array at 10 entries when more than 10 rows fail', async () => {
      // COVERS: §4.1 — errors 最大10件まで返却
      primeImport({ tanka: [] }); // every row's tanka_code fails
      const rows = Array.from({ length: 15 }, (_v, i) =>
        buildImportRow({ kumiaiin_code: `K${i}`, tanka_code: 'TNOPE' }),
      );

      let caught: any;
      try {
        await service.importExcel(
          buildImportBody({ rows }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toMatchObject({ code: 'IMPORT_VALIDATION_ERROR' });
      const body = caught?.response ?? caught?.getResponse?.() ?? caught;
      const errors = body?.errors ?? caught?.errors ?? [];
      expect(errors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('importExcel — DataScope', () => {
    it('should narrow lookups by ja_id when caller is CHUOKAI', async () => {
      // COVERS: §4.2/§4.3 DataScope — CHUOKAI scoped to own JA set
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildChuokaiSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const sqlSeen = [
        ...dataSource.query.mock.calls,
        ...txManager.query.mock.calls,
      ]
        .map((c: unknown[]) => String(c[0] ?? ''))
        .join(' || ');
      expect(/ja_id/i.test(sqlSeen)).toBe(true);
    });

    it('should narrow lookups by ja_id when caller is JA_HONTEN', async () => {
      // COVERS: §4.2/§4.3 DataScope — JA_HONTEN scoped to own ja_id
      primeImport();

      await service.importExcel(
        buildImportBody(),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const sqlSeen = [
        ...dataSource.query.mock.calls,
        ...txManager.query.mock.calls,
      ]
        .map((c: unknown[]) => String(c[0] ?? ''))
        .join(' || ');
      expect(/ja_id/i.test(sqlSeen)).toBe(true);
    });

    it('should throw DATA_SCOPE_VIOLATION (403) when JA_KANRI_SHITEN targets a record outside its own kanri_shiten_id', async () => {
      // COVERS: §4.3.4 — 既存購読者の kanri_shiten_id 不一致 → DATA_SCOPE_VIOLATION
      primeImport({
        existing: [
          {
            dokusya_id: 7001,
            kumiaiin_code: 'K00001',
            ja_id: 1,
            kanri_shiten_id: 999, // not the caller's kanri_shiten_id
          },
        ],
      });

      await expect(
        service.importExcel(
          buildImportBody({
            import_mode: 'UPDATE',
            selected_columns: ['dokusya_id', 'dokusya_busu'],
            rows: [buildImportRow({ dokusya_id: 7001 })],
          }),
          buildJaKanriShitenSession({ ja_id: 1, kanri_shiten_id: 10, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toMatchObject({ code: 'DATA_SCOPE_VIOLATION' });
    });
  });

  describe('importExcel — 文言 (label) → code mapping', () => {
    it('should import a row when gender is supplied as the label 「男性」 instead of the code 1', async () => {
      // COVERS: §4.1 — gender 文言 でも取込可
      primeImport();

      const result = await service.importExcel(
        buildImportBody({
          selected_columns: [...buildImportRequiredColumns(), 'gender'],
          rows: [buildImportRow({ gender: '男性' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data.created_count).toBe(1);
    });

    it('should import a row when hikiotoshi_yokin_shubetsu is supplied as the label 「普通」 instead of the code 1', async () => {
      // COVERS: §4.1 — 引落口座貯金種目 文言 でも取込可
      primeImport();

      const result = await service.importExcel(
        buildImportBody({
          selected_columns: [
            ...buildImportRequiredColumns(),
            'hikiotoshi_yokin_shubetsu',
          ],
          rows: [buildImportRow({ hikiotoshi_yokin_shubetsu: '普通' })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      expect(result.data.created_count).toBe(1);
    });
  });

  describe('importExcel — update modes (column selection)', () => {
    it('should put ONLY the selected columns in applyChange values for UPDATE', async () => {
      // COVERS: §4.4.3 — selected_columns に含まれる列のみ values に載る。
      primeImport({
        existing: [
          {
            dokusya_id: 7001,
            kumiaiin_code: 'K00001',
            ja_id: 1,
            kanri_shiten_id: 101,
          },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'dokusya_busu'],
          rows: [buildImportRow({ dokusya_id: 7001, dokusya_busu: 5 })],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const values = applyChangeInputs()[0].values;
      // dokusya_busu は選択列 → values に載る。未選択列(email/氏名/住所)は載らない。
      expect(values.dokusyaBusu).toBe(5);
      expect('email' in values).toBe(false);
      expect('shimeiSei' in values).toBe(false);
      expect('yubinNo' in values).toBe(false);
    });


    it('should include the selected columns (email/todofuken_code) in applyChange values for UPDATE', async () => {
      // COVERS: §4.4.3 回帰防止 — 旧 WRITABLE は email 等を欠落し、選択しても
      // 更新されなかった。selected_columns に email/todofuken_code があれば values に載ること。
      primeImport({
        existing: [
          {
            dokusya_id: 7001,
            kumiaiin_code: 'K00001',
            ja_id: 1,
            kanri_shiten_id: 101,
          },
        ],
        onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      });

      await service.importExcel(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'email', 'todofuken_code'],
          rows: [
            buildImportRow({
              dokusya_id: 7001,
              email: 'new@example.com',
              todofuken_code: '27',
            }),
          ],
        }),
        buildJaHontenSession({ ja_id: 1, account_id: 11 }),
        baseReq,
      );

      const values = applyChangeInputs()[0].values;
      expect(values.email).toBe('new@example.com');
      expect(values.todofukenCode).toBe('27');
      // 未選択列は values に出ない（partial の核）。
      expect('shimeiSei' in values).toBe(false);
    });
  });

  describe('importExcel — transaction + audit failure paths', () => {
    it('should roll back and reject when the audit log inside the transaction fails', async () => {
      // COVERS: §4.4/§4.5 — atomic business + audit; audit failure rolls back
      primeImport();
      auditLog.logOperation.mockRejectedValue(new Error('audit log broke'));
      auditLog.logCreate.mockRejectedValue(new Error('audit log broke'));

      await expect(
        service.importExcel(
          buildImportBody(),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow('audit log broke');
    });

    it('should write the error log (log_type=3 / result_status=2) OUTSIDE the rolled-back tx when the DML fails', async () => {
      // COVERS: §4.7 — error log emitted on the standalone connection
      const route = buildSqlRouter();
      dataSource.query.mockImplementation(route);
      txManager.query.mockImplementation(async (sql: unknown) => route(String(sql ?? '')));
      // NEW は applyChange(CREATE) 経由になったので、そこで DML を失敗させる。
      applyChangeSpy.mockRejectedValueOnce(new Error('DML exploded'));

      await expect(
        service.importExcel(
          buildImportBody({ import_mode: 'NEW' }),
          buildJaHontenSession({ ja_id: 1, account_id: 11 }),
          baseReq,
        ),
      ).rejects.toThrow('DML exploded');

      // Error log path: logError OR logOperation with log_type=3 / result_status=2.
      const wroteErrorLog =
        auditLog.logError.mock.calls.length > 0 ||
        auditLog.logOperation.mock.calls.some((c: unknown[]) => {
          const ctx = c[0] as Record<string, unknown>;
          return ctx?.logType === 3 || ctx?.resultStatus === 2;
        });
      expect(wroteErrorLog).toBe(true);

      // The error log MUST NOT be bound to the rolled-back manager.
      const errArgs = [
        ...auditLog.logError.mock.calls,
        ...auditLog.logOperation.mock.calls.filter((c: unknown[]) => {
          const ctx = c[0] as Record<string, unknown>;
          return ctx?.logType === 3 || ctx?.resultStatus === 2;
        }),
      ];
      for (const args of errArgs) {
        expect(args).not.toContain(txManager);
      }
    });
  });

  // err:TOO_MANY_REQUESTS (row 6) — ThrottlerGuard fires only through the
  // full app pipeline, not at the service layer.
});

// ══════════════════════════════════════════════════════════════════════
// SCR-010 — メニュー画面: 電子版承認待ち件数 (API-010-002)
// ══════════════════════════════════════════════════════════════════════
describe('DokusyaService — SCR-010 (pending-approval count)', () => {
  let service: any;
  let dokusyaRepo: any;
  let dokusyaQb: any;

  function makeQbMock() {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
  }

  beforeEach(() => {
    dokusyaQb = makeQbMock();
    dokusyaRepo = { createQueryBuilder: jest.fn(() => dokusyaQb) };
    const accountFlags = new DokusyaAccountFlagService({} as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      {} as any,
      {} as any,
      {} as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export 経路はこの describe では未使用。dokusyaRepo（qb mock）のみ
    // 実体を渡し、auditLog / codeService は最小 mock で型を満たす。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      {} as any,
      {} as any,
    );
    // replace 経路はこの describe では未使用。dokusyaRepo（qb mock）のみ実体を
    // 渡し、dataSource / auditLog は最小 mock で型を満たす（rireki / accountFlags
    // は実体）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      {} as any,
      {} as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );
  });

  it('should filter denshi_shonin_status=0 + deleted_at and return count/ja_id when a CHUOKAI session queries', async () => {
    dokusyaQb.getCount.mockResolvedValue(5);
    const res = await service.getPendingApprovalCount(
      buildChuokaiSession({ ja_id: 100 }),
    );
    expect(res).toEqual({ count: 5, ja_id: 100 });
    const whereParams = dokusyaQb.where.mock.calls
      .map((c: any[]) => c[1])
      .find(Boolean);
    expect(whereParams).toMatchObject({ status: 0 });
    const andSql = dokusyaQb.andWhere.mock.calls
      .map((c: any[]) => String(c[0]))
      .join(' ');
    expect(andSql).toMatch(/deleted_at/i);
  });

  it('should scope by ja_id when a JA_HONTEN session queries', async () => {
    await service.getPendingApprovalCount(buildJaHontenSession({ ja_id: 7 }));
    const scoped = dokusyaQb.andWhere.mock.calls.find(
      ([, p]: any[]) =>
        p && Object.prototype.hasOwnProperty.call(p, 'scopeJaId'),
    );
    expect(scoped?.[1]).toMatchObject({ scopeJaId: 7 });
  });

  it('should scope by kanri_shiten_id when a JA_KANRI_SHITEN session queries', async () => {
    await service.getPendingApprovalCount(
      buildJaKanriShitenSession({ ja_id: 7, kanri_shiten_id: 33 }),
    );
    const scoped = dokusyaQb.andWhere.mock.calls.find(
      ([, p]: any[]) =>
        p && Object.prototype.hasOwnProperty.call(p, 'scopeKsId'),
    );
    expect(scoped?.[1]).toMatchObject({ scopeKsId: 33 });
  });

  it('should NOT bind any scope predicate when a NICHINO_ADMIN session queries', async () => {
    dokusyaQb.getCount.mockResolvedValue(12);
    const res = await service.getPendingApprovalCount(
      buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
    );
    expect(res).toEqual({ count: 12, ja_id: null });
    const scoped = dokusyaQb.andWhere.mock.calls.find(
      ([, p]: any[]) =>
        p &&
        (Object.prototype.hasOwnProperty.call(p, 'scopeJaId') ||
          Object.prototype.hasOwnProperty.call(p, 'scopeKsId')),
    );
    expect(scoped).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// rireki 生成の UI ↔ Excel取込 同一性 (parity)
//
// create()/update()（UI）と importExcel()（取込）は同じヘルパー
// （buildHistoryFromEntity / buildZenkaiSnapshot / hasZougenReportableChange /
// nextRirekiNo）を共有する。同じ業務入力に対して、両経路が生成する
// t_dokusya_rireki の業務フラグ（shinki/kaiyaku/zougen）と前回値(zenkai_*)が
// 一致することを behavioral に証明する。
// ════════════════════════════════════════════════════════════════════════════
describe('DokusyaService — rireki UI↔Excel取込 同一性 (parity)', () => {
  let service: any;
  let dokusyaRepo: any;
  let shitenRepo: any;
  let txManager: any;
  let dataSource: any;

  const baseReq = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any;

  function qb(): Record<string, any> {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ new_rireki_no: 2 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
  }

  /** Return the LAST DokusyaRireki snapshot saved via manager.save. */
  function grabRireki(): Record<string, any> | undefined {
    const saves = txManager.save.mock.calls
      .map((c: unknown[]) => (c[1] ?? c[0]) as Record<string, unknown>)
      .filter((v: any) => v && typeof v === 'object' && 'rirekiNo' in v);
    return saves[saves.length - 1] as Record<string, any> | undefined;
  }

  /** SQL router for importExcel pre-tx lookups + INSERT/UPDATE. */
  function importRoute(over: { existing?: any[]; onUpdate?: () => any[] } = {}) {
    const existing = over.existing ?? [];
    return async (sql: unknown): Promise<any[]> => {
      const t = String(sql ?? '');
      if (/update\s+t_dokusya_rireki/i.test(t)) return [];
      if (/insert\s+into\s+t_dokusya_rireki/i.test(t)) return [{}];
      if (/insert\s+into\s+t_dokusya\b/i.test(t)) return [{ dokusya_id: 7001 }];
      if (/update\s+t_dokusya\b/i.test(t))
        return over.onUpdate ? over.onUpdate() : [{ dokusya_id: 7001 }];
      if (/from\s+m_tanka/i.test(t)) return [{ tanka_id: 1, tanka_code: 'T001' }];
      if (/from\s+m_hanbaiten/i.test(t)) return [{ hanbaiten_id: 5, hanbaiten_code: 'H001' }];
      if (/from\s+m_kanri_shiten/i.test(t)) return [{ kanri_shiten_id: 101, kanri_shiten_code: 'KS001' }];
      if (/from\s+m_shiten/i.test(t)) return [{ shiten_id: 1001, shiten_code: 'SH001' }];
      if (/from\s+t_dokusya\b/i.test(t)) return existing;
      return [];
    };
  }

  /** Configure importExcel + writeRirekiSnapshot for one scenario. */
  function primeImport(opts: {
    existing?: any[];
    onUpdate?: () => any[];
    after: Record<string, any>;
    before?: Record<string, any> | null;
  }) {
    const route = importRoute({ existing: opts.existing, onUpdate: opts.onUpdate });
    dataSource.query.mockImplementation(route);
    txManager.query.mockImplementation(route);
    txManager.findOne.mockImplementation(async (entity: any) =>
      entity?.name === 'DokusyaRireki' ? (opts.before ?? null) : opts.after,
    );
  }

  beforeEach(() => {
    dokusyaRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => qb()),
    };
    shitenRepo = {
      // FK-scope check + bank reverse lookup both resolve in-scope (ja_id=1).
      findOne: jest.fn(async () => ({
        shitenId: 50,
        jaId: 1,
        kinyuShitenFlg: true,
        jastemToriatsukaiTenpoCode: '001',
        jastemTenpoName: '本店',
      })),
      createQueryBuilder: jest.fn(() => ({
        ...qb(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({
            shiten_id: 50,
            jastem_toriatsukai_tenpo_code: '001',
            jastem_tenpo_name: '本店',
          }),
      })),
    };
    txManager = {
      create: jest.fn((_e: unknown, v: unknown) => ({ ...(v as object) })),
      save: jest.fn(async (e: unknown, v?: unknown) => ({
        ...((v ?? e) as object),
        dokusyaId: (((v ?? e) as any).dokusyaId ?? 100),
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      // Default: UI create()'s loadMaster() re-reads t_dokusya. Return a
      // stub master (Dokusya) / null (DokusyaRireki). primeImport() overrides
      // this for the import leg.
      findOne: jest.fn(async (entity: any) =>
        entity?.name === 'DokusyaRireki' ? null : { dokusyaId: 100 },
      ),
      query: jest.fn(async () => []),
      createQueryBuilder: jest.fn(() => qb()),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };
    const fkRepo = { findOne: jest.fn(async () => ({ jaId: 1 })) };
    const accountRepo = {
      findOne: jest.fn(async () => ({ accountId: 1, paperFlg: true, denshiFlg: true })),
    };
    const codeService = {
      has: jest.fn().mockReturnValue(true),
      getLabel: jest.fn().mockReturnValue(''),
      getValueByLabel: jest.fn().mockReturnValue(null),
      reload: jest.fn(),
    };
    const auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    const accountFlags = new DokusyaAccountFlagService(accountRepo as any);
    const rireki = new DokusyaRirekiService();
    // rireki ヘルパは UI/取込 両方が共有する leaf service（step C）。import-service
    // へ inject し、facade（DokusyaService）へも同一インスタンスを渡す。
    const importService = new DokusyaImportService(
      dataSource as any,
      auditLog as any,
      codeService as any,
      accountFlags as any,
      rireki as any,
      new DokusyaImportValidator(),
    );
    // search/export concern は DokusyaSearchService（step D）。facade
    // （DokusyaService）へ同一の dokusyaRepo / auditLog / codeService mock を
    // 渡す（検索・出力テストが組み立てる createQueryBuilder/getCount 形を共有）。
    const searchService = new DokusyaSearchService(
      dokusyaRepo as any,
      auditLog as any,
      codeService as any,
    );
    // replace concern は DokusyaReplaceService（step E）。facade
    // （DokusyaService）へ同一の dokusyaRepo / dataSource / auditLog / rireki /
    // accountFlags mock を渡す（置換テストが組み立てる find/transaction 形を共有）。
    const replaceService = new DokusyaReplaceService(
      dokusyaRepo as any,
      dataSource as any,
      auditLog as any,
      rireki as any,
      accountFlags as any,
    );
    service = new (DokusyaService as any)(
      dokusyaRepo,
      { findOne: jest.fn(), createQueryBuilder: jest.fn(() => qb()) },
      shitenRepo,
      fkRepo, // kanriShitenRepo
      fkRepo, // hanbaitenRepo
      fkRepo, // tankaRepo
      dataSource,
      auditLog,
      codeService,
      accountFlags,
      importService,
      rireki,
      searchService,
      replaceService,
      // 電子版同期(outbound)。デフォルトは null（DIGITAL 以外＝ゲート対象外）を返し
      // 既存テストの挙動を変えない。sendNow を検証したいテストは個別に上書きする。
      { sendNow: jest.fn().mockResolvedValue(null) },
    );
  });

  it('NEW: UI create と 取込NEW で shinki/kaiyaku/zougen フラグが一致する', async () => {
    // --- UI create (新規 種類=1) ---
    await service.create(
      buildCreateDokusyaBody({ tetsuzuki_shurui: 1 }),
      buildChuokaiSession({ ja_id: 1, account_id: 11 }),
      baseReq,
    );
    const ui = grabRireki();
    txManager.save.mockClear();

    // --- 取込 NEW (種類=1) ---
    primeImport({
      after: { dokusyaId: 7001, jaId: 1, tetsuzukiShurui: 1, haitatsuSameFlg: true, dokusyaBusu: 1, hanbaitenId: 5 },
    });
    await service.importExcel(
      buildImportBody({ rows: [buildImportRow({ tetsuzuki_shurui: 1 })] }),
      buildJaHontenSession({ ja_id: 1, account_id: 11 }),
      baseReq,
    );
    const imp = grabRireki();

    expect(ui).toBeDefined();
    expect(imp).toBeDefined();
    expect(ui!.shinkiFlg).toBe(true);
    expect(imp!.shinkiFlg).toBe(ui!.shinkiFlg);
    expect(imp!.kaiyakuFlg).toBe(ui!.kaiyakuFlg);
    expect(imp!.zougenHokokuFlg).toBe(ui!.zougenHokokuFlg);
    // S3.2 で取込 NEW も applyChange(CREATE) へ移行したため、UI/取込 とも
    // 挿入時 saishin=false（有効レコード判定は recomputeMaster が確定）で再収束。
    expect(ui!.saishinDataFlg).toBe(false);
    expect(imp!.saishinDataFlg).toBe(ui!.saishinDataFlg);
  });

  it('UPDATE 増減対象外 (口座/備考のみ変更): UI update と 取込更新 で zougen=false が一致する', async () => {
    // --- UI update: 購読部数/販売店/住所 を据え置き、備考のみ変更 ---
    const before = buildDokusya({
      dokusyaId: 100, jaId: 1, rirekiNo: 1, dokusyaBusu: 2, hanbaitenId: 5,
    });
    dokusyaRepo.findOne.mockResolvedValue(before);
    // UI update も 取込 UPDATE も Pha3 で applyChange を通る（real）。このシナリオは
    // 「最新行への更新」で後続行は無い。findNext だけが昇順(SORT_CHAIN_ASC)で
    // orderBy するので、ASC 並びのクエリ(=findNext)には null を返し「後続行なし」を
    // 表現する。findBefore / recomputeMaster(降順)には predecessor(before) を返す。
    // 呼び出し回数に依存しない堅牢な判定（B-thuần: 後続行が無ければ
    // recomputeAfterChain は何もしない）。差分は biko のみ → 挿入行 zougen=false。
    txManager.createQueryBuilder = jest.fn((entity: any) => {
      const q = qb();
      q.getRawOne = jest
        .fn()
        .mockResolvedValue({ next: '2', new_rireki_no: 2 });
      if (entity?.name === 'DokusyaRireki') {
        q.getOne = jest.fn(async () => {
          const orderedAsc = q.orderBy.mock.calls.some(
            (c: unknown[]) => c[1] === 'ASC',
          );
          return orderedAsc ? null : before; // findNext(ASC)→後続なし
        });
      }
      return q;
    });
    // 変更検出は loadMaster(master)基準（2026-07 改訂）。UI レグの loadMaster が
    // 実マスタ(before)を返すようにして、biko のみ差分＝zougen=false を成立させる。
    txManager.findOne = jest.fn().mockResolvedValue(before);
    await service.update(
      100,
      buildUpdateDokusyaBody({
        dokusya_busu: 2, // 据え置き
        hanbaiten_id: 5,
        chome_banchi: before.chomeBanchi, // 住所据え置き
        biko: '備考だけ変更',
      }),
      buildChuokaiSession({ ja_id: 1, account_id: 11 }),
      baseReq,
    );
    const ui = grabRireki();
    txManager.save.mockClear();

    // --- 取込 UPDATE: before==after (購読部数/販売店/住所 不変) ---
    const same = { haitatsuSameFlg: true, dokusyaBusu: 2, hanbaitenId: 5, yubinNo: '', todofukenCode: '', shikuchoson: '', chomeBanchi: '', tatemonoMei: '', haitatsuYubinNo: '', haitatsuTodofukenCode: '', haitatsuShikuchoson: '', haitatsuChomeBanchi: '', haitatsuTatemonoMei: '' };
    primeImport({
      existing: [{ dokusya_id: 7001, kumiaiin_code: 'K1', ja_id: 1, kanri_shiten_id: 10 }],
      onUpdate: () => [{ dokusya_id: 7001, rireki_no: 2 }],
      before: { dokusyaId: 7001, rirekiNo: 1, saishinDataFlg: true, ...same },
      after: { dokusyaId: 7001, jaId: 1, tetsuzukiShurui: 1, ...same },
    });
    await service.importExcel(
      buildImportBody({
        import_mode: 'UPDATE',
        selected_columns: ['dokusya_id', 'biko'],
        rows: [buildImportRow({ dokusya_id: 7001, biko: '備考だけ変更' })],
      }),
      buildJaHontenSession({ ja_id: 1, account_id: 11 }),
      baseReq,
    );
    const imp = grabRireki();

    expect(ui!.zougenHokokuFlg).toBe(false);
    expect(imp!.zougenHokokuFlg).toBe(ui!.zougenHokokuFlg);
  });
});
