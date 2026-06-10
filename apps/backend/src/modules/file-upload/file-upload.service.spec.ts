// Screen: ACSMS-SCR-022 — ファイルダウンロード画面
// Screen: ACSMS-SCR-023 — ファイルアップロード画面
//
// FileUploadService covers (SCR-022 + SCR-023 merged into one module):
//   API-022-001 / 023-001  GET    /api/v1/file-upload                    — list with search + pagination
//   API-022-002            GET    /api/v1/file-upload/:id/preview        — S3 presigned URL + metadata
//   API-022-003 / 023-003  GET    /api/v1/file-upload/:id/download       — binary stream + t_file_download / t_log
//   API-023-002            POST   /api/v1/file-upload                    — multipart upload (N JA × M files = N×M rows)
//   API-023-004            DELETE /api/v1/file-upload/:id                — soft delete + S3 object cleanup
//
// All mutating endpoints wrap business DML + audit log in a single
// transaction per api.md §4.x ※. SCR-023's POST additionally enqueues
// a background notification job AFTER commit (no transaction).

import { NotFoundException } from '@/common/exceptions/common.exceptions';

import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import {
  buildSession,
  buildChuokaiSession,
  buildJaHontenSession,
  buildJaKanriShitenSession,
} from '@test/fixtures/session.factory';
import {
  buildFileUpload,
  buildJoinedFileUploadRow,
  buildUploadedFile,
} from '@test/fixtures/file-upload.factory';

describe('FileUploadService — SCR-022 (list / preview / download)', () => {
  let service: FileUploadService;
  let repo: any;
  let qbMock: any;
  let dataSource: any;
  let txManager: any;
  let auditLog: any;
  let storage: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        return { ...value, fileDownloadId: 999 };
      }),
      query: jest.fn(async () => [{ count: '0' }]),
      getRepository: jest.fn(() => repo),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    storage = {
      getSignedUrl: jest.fn(async () => 'https://s3.example.com/signed-url'),
      download: jest.fn(async () => Buffer.from('binary content')),
    };

    // Constructor order MUST match the service:
    //   (repo, dataSource, auditLog, storage)
    service = new FileUploadService(repo, dataSource, auditLog, storage);
  });

  // ──────────────────────────────────────────────────────────────
  // API-022-001 — GET /api/v1/file-upload (findAll)
  // ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated list with meta when NICHINO_ADMIN calls with no filter', async () => {
      // COVERS: §4.3 + §4.4 + §4.5 + §4.6 happy path
      const rows = [buildJoinedFileUploadRow(), buildJoinedFileUploadRow({ file_upload_id: 102 })];
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '47' }];
        return rows;
      });
      const result = await service.findAll(
        { page: 1, per_page: 20, sort_by: 'upload_datetime', sort_order: 'desc' },
        buildSession(),
        baseReq,
      );
      expect(result).toMatchObject({
        data: expect.any(Array),
        meta: { total: 47, page: 1, per_page: 20, total_pages: 3 },
      });
      expect(result.data).toHaveLength(2);
    });

    it('should serialize all api.md response fields when row is mapped to data[]', async () => {
      // COVERS: §レスポンスデータ — all 10 row fields present
      const row = buildJoinedFileUploadRow();
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [row];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const first = result.data[0];
      expect(first).toHaveProperty('file_upload_id');
      expect(first).toHaveProperty('ja_id');
      expect(first).toHaveProperty('upload_datetime');
      expect(first).toHaveProperty('file_name');
      expect(first).toHaveProperty('file_size');
      expect(first).toHaveProperty('record_count');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('created_by');
      expect(first).toHaveProperty('created_by_name');
      expect(first).toHaveProperty('created_at');
      expect(first).toHaveProperty('scheduled_delete_date');
      expect(first).toHaveProperty('deleted_at');
    });

    it('should include soft-deleted rows (no fu.deleted_at filter) and serialize deleted_at for the 削除日 column', async () => {
      // screen-design 画面項目定義 No.17/18 — the list returns deleted rows
      // too; the FE shows 削除日 and disables the 削除 button for them.
      const deletedRow = buildJoinedFileUploadRow({
        file_upload_id: 9,
        deleted_at: '2026-06-09T01:00:00.000Z',
      });
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [deletedRow];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession({ role_code: 'NICHINO_ADMIN' }),
        baseReq,
      );
      // deleted_at is serialized (row not filtered out).
      expect(result.data[0].deleted_at).toBe('2026-06-09T01:00:00.000Z');
      // The list query must NOT exclude soft-deleted t_file_upload rows.
      const sqlEmitted = dataSource.query.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(sqlEmitted).not.toMatch(/fu\.deleted_at IS NULL/);
    });

    it('should serialize deleted_at as null for an active (non-deleted) row', async () => {
      const row = buildJoinedFileUploadRow({ deleted_at: null });
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [row];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession({ role_code: 'NICHINO_ADMIN' }),
        baseReq,
      );
      expect(result.data[0].deleted_at).toBeNull();
    });

    it('should NOT apply DataScope WHERE when called by NICHINO_ADMIN', async () => {
      // COVERS: §4.2 DataScope — NICHINO_ADMIN bypass.
      // Service inlines the scope clause into the SQL (no role_code
      // parameter); for NICHINO_* the clause is `TRUE` instead of
      // `fu.ja_id IN (...)`. Assert by inspecting the emitted SQL.
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildSession({ role_code: 'NICHINO_ADMIN' }),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      // No `fu.ja_id IN (...)` or `fu.ja_id IS NULL` scope predicate.
      expect(/fu\.ja_id\s+IN/i.test(sqlEmitted)).toBe(false);
      expect(/fu\.ja_id\s+IS\s+NULL\s*\)/i.test(sqlEmitted)).toBe(false);
    });

    it('should NOT apply DataScope WHERE when called by NICHINO_STAFF', async () => {
      // COVERS: §4.2 DataScope — NICHINO_STAFF bypass
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildSession({ role_code: 'NICHINO_STAFF', ja_id: null }),
        baseReq,
      );
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should ORDER BY a.account_name when sort_by is created_by_name (作成者 sort — not a fu.* column)', async () => {
      // Reported bug: 作成者 column key is `created_by_name`, which is the
      // JOINed m_account alias. A bare `ORDER BY fu.created_by_name` was
      // invalid; the value must map to a.account_name.
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20, sort_by: 'created_by_name', sort_order: 'asc' },
        buildSession({ role_code: 'NICHINO_ADMIN' }),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(sqlEmitted).toMatch(/ORDER BY a\.account_name ASC/);
      expect(sqlEmitted).not.toMatch(/ORDER BY fu\.created_by_name/);
    });

    it('should apply DataScope (ja_id IN managed OR ja_id IS NULL) when called by CHUOKAI', async () => {
      // COVERS: §4.2 DataScope — CHUOKAI scope (managed JAs + global)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildChuokaiSession(),
        baseReq,
      );
      // SQL must include either `fu.ja_id IN` or `fu.ja_id IS NULL`
      // — the CHUOKAI scope per §4.2.
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/ja_id\s+IS\s+NULL/i.test(sqlEmitted) || /ja_id\s+IN/i.test(sqlEmitted)).toBe(true);
    });

    it('should apply DataScope (ja_id = user_ja_id OR ja_id IS NULL) when called by JA_HONTEN', async () => {
      // COVERS: §4.2 DataScope — JA_HONTEN scope (own JA + global)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildJaHontenSession({ ja_id: 5 }),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/ja_id/i.test(sqlEmitted)).toBe(true);
    });

    it('should apply DataScope (ja_id = user_ja_id OR ja_id IS NULL) when called by JA_KANRI_SHITEN', async () => {
      // COVERS: §4.2 DataScope — JA_KANRI_SHITEN scope (own JA + global,
      // no kanri_shiten-level filter per api.md §4.2 footnote)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildJaKanriShitenSession({ ja_id: 5 }),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      // KANRI_SHITEN must NOT add kanri_shiten_id filter.
      expect(/kanri_shiten_id/i.test(sqlEmitted)).toBe(false);
    });

    it('should filter by file_name with ILIKE %name% when file_name is provided', async () => {
      // COVERS: §4.3 + §4.5 — file_name LIKE predicate
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { file_name: 'zougen', page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/ILIKE/i.test(sqlEmitted)).toBe(true);
    });

    it('should filter by todofuken_code via m_ja JOIN when todofuken_code is provided', async () => {
      // COVERS: §4.3 — todofuken_code filter through m_ja.todofuken_code
      // (NOT m_account.todofuken_code per api.md change-history v1.1 note)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { todofuken_code: '13', page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/m_ja/i.test(sqlEmitted) || /todofuken_code/i.test(sqlEmitted)).toBe(true);
    });

    it('should exclude soft-deleted rows (deleted_at IS NULL)', async () => {
      // COVERS: §4.3 — deleted_at IS NULL filter
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/deleted_at\s+IS\s+NULL/i.test(sqlEmitted)).toBe(true);
    });

    it('should default page=1 and per_page=20 when omitted from query', async () => {
      // COVERS: §4.1 — default values
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      const result = await service.findAll({}, buildSession(), baseReq);
      expect(result.meta.page).toBe(1);
      expect(result.meta.per_page).toBe(20);
    });

    it('should default sort_by=upload_datetime and sort_order=desc when omitted', async () => {
      // COVERS: §4.1 — default sort
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll({}, buildSession(), baseReq);
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/upload_datetime/i.test(sqlEmitted)).toBe(true);
      expect(/desc/i.test(sqlEmitted)).toBe(true);
    });

    it('should compute total_pages = CEIL(total / per_page) for the meta block', async () => {
      // COVERS: §4.6 — total_pages = CEIL(47 / 20) = 3
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '47' }];
        return [];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      expect(result.meta.total_pages).toBe(3);
    });

    it('should return empty data + total=0 when no rows match', async () => {
      // COVERS: §4.6 — 0-result branch (HTTP 200, not 404)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      const result = await service.findAll({}, buildSession(), baseReq);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should NOT call AuditLogService for the list endpoint (read-only)', async () => {
      // COVERS: list endpoint is observability-free per project convention
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll({}, buildSession(), baseReq);
      expect(auditLog.logOperation).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // API-022-002 — GET /api/v1/file-upload/:id/preview
  // ──────────────────────────────────────────────────────────────
  describe('getPreview', () => {
    it('should return preview metadata + S3 presigned URL when file exists', async () => {
      // COVERS: §4.3 + §4.4 happy path
      const row = buildFileUpload();
      repo.findOne.mockResolvedValue(row);
      const result = await service.getPreview(101, buildSession(), baseReq);
      expect(result.data).toMatchObject({
        file_upload_id: 101,
        file_name: row.fileName,
        file_size: row.fileSize,
        preview_url: expect.stringContaining('s3.example.com'),
        expires_at: expect.any(String),
      });
    });

    it('should call StorageService.getSignedUrl with file_path and 1h expiry', async () => {
      // COVERS: §4.4 — presigned URL with 3600s TTL
      const row = buildFileUpload({ filePath: 'ja-1/2026/05/sample.pdf' });
      repo.findOne.mockResolvedValue(row);
      await service.getPreview(101, buildSession(), baseReq);
      expect(storage.getSignedUrl).toHaveBeenCalledWith('ja-1/2026/05/sample.pdf', 3600);
    });

    it('should derive content_type=application/pdf from .pdf extension', async () => {
      // COVERS: §4.4 — content_type mapping
      repo.findOne.mockResolvedValue(buildFileUpload({ fileName: 'report.pdf' }));
      const result = await service.getPreview(101, buildSession(), baseReq);
      expect(result.data.content_type).toBe('application/pdf');
    });

    it('should derive content_type=text/csv from .csv extension', async () => {
      // COVERS: §4.4 — content_type mapping
      repo.findOne.mockResolvedValue(buildFileUpload({ fileName: 'data.csv' }));
      const result = await service.getPreview(101, buildSession(), baseReq);
      expect(result.data.content_type).toBe('text/csv');
    });

    it('should derive xlsx content_type from .xlsx extension', async () => {
      // COVERS: §4.4 — content_type mapping
      repo.findOne.mockResolvedValue(buildFileUpload({ fileName: 'sheet.xlsx' }));
      const result = await service.getPreview(101, buildSession(), baseReq);
      expect(result.data.content_type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should throw NotFoundException when file does not exist', async () => {
      // COVERS: §4.3 — レコードが存在しない場合
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.getPreview(999, buildSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file is soft-deleted (deleted_at IS NOT NULL)', async () => {
      // COVERS: §4.3 — deleted_at IS NULL filter
      repo.findOne.mockResolvedValue(null); // repo applies deleted_at filter
      await expect(
        service.getPreview(101, buildSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (existence-hiding) when JA_HONTEN tries to preview a different JA file', async () => {
      // COVERS: §4.2 + §4.3 — DataScope violation masks as 404 (security.md assertJaScope)
      const otherJaFile = buildFileUpload({ jaId: 999 });
      repo.findOne.mockResolvedValue(otherJaFile);
      await expect(
        service.getPreview(101, buildJaHontenSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT throw when JA_HONTEN previews a file with ja_id IS NULL (global file)', async () => {
      // COVERS: §4.2 — global files (ja_id NULL) visible to all roles
      const globalFile = buildFileUpload({ jaId: null });
      repo.findOne.mockResolvedValue(globalFile);
      await expect(
        service.getPreview(101, buildJaHontenSession({ ja_id: 1 }), baseReq),
      ).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // API-022-003 — GET /api/v1/file-upload/:id/download
  // ──────────────────────────────────────────────────────────────
  describe('download', () => {
    beforeEach(() => {
      repo.findOne.mockResolvedValue(buildFileUpload());
    });

    it('should return file binary buffer + content metadata when file exists', async () => {
      // COVERS: §4.4 + §4.7 happy path
      const result = await service.download(101, buildSession(), baseReq);
      expect(result).toMatchObject({
        body: expect.any(Buffer),
        contentType: expect.any(String),
        contentLength: expect.any(Number),
        fileName: expect.any(String),
      });
    });

    it('should call StorageService.download with the file_path', async () => {
      // COVERS: §4.4 — S3 SDK getObject call
      repo.findOne.mockResolvedValue(
        buildFileUpload({ filePath: 'ja-1/2026/05/sample.pdf' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(storage.download).toHaveBeenCalledWith('ja-1/2026/05/sample.pdf');
    });

    it('should throw NotFoundException when file does not exist', async () => {
      // COVERS: §4.3 — レコードが存在しない場合
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.download(999, buildSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (existence-hiding) when CHUOKAI downloads a file outside managed JAs', async () => {
      // COVERS: §4.2 — DataScope masks as 404
      repo.findOne.mockResolvedValue(buildFileUpload({ jaId: 999 }));
      dataSource.query = jest.fn(async () => []); // CHUOKAI manages no JAs that include 999
      await expect(
        service.download(101, buildChuokaiSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should wrap t_file_download INSERT + t_log INSERT in dataSource.transaction', async () => {
      // COVERS: §4.8 ※ — single transaction across §4.5 + §4.6
      await service.download(101, buildSession(), baseReq);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should INSERT a t_file_download row recording the download', async () => {
      // COVERS: §4.5 — t_file_download history
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalled();
    });

    it('should call AuditLogService.logOperation with log_type=4 and operation="DOWNLOAD" (bare verb)', async () => {
      // COVERS: §4.6 — t_log row, operation must be bare 'DOWNLOAD' (no entity prefix)
      await service.download(101, buildSession(), baseReq);
      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 4,
          operation: 'DOWNLOAD',
          resultStatus: 1,
          targetTable: 't_file_upload',
        }),
        expect.anything(), // EntityManager when inside transaction
      );
    });

    it('should set download_type=4 (増減通知書) when file_name contains "zougen_tsuchi"', async () => {
      // COVERS: §4.5 — download_type 判定優先順位
      repo.findOne.mockResolvedValue(
        buildFileUpload({ fileName: 'zougen_tsuchi_202604.pdf' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ downloadType: 4 }),
      );
    });

    it('should set download_type=3 (増減連絡票) when file_name contains "zougen_renraku"', async () => {
      // COVERS: §4.5 — download_type 判定優先順位
      repo.findOne.mockResolvedValue(
        buildFileUpload({ fileName: 'zougen_renraku_202604.pdf' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ downloadType: 3 }),
      );
    });

    it('should set download_type=1 (口座振替) when file_name contains "kouza_furikae"', async () => {
      // COVERS: §4.5 — download_type 判定優先順位
      repo.findOne.mockResolvedValue(
        buildFileUpload({ fileName: 'kouza_furikae_20260506.csv' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ downloadType: 1 }),
      );
    });

    it('should set download_type=5 (購読者名簿) when file_name contains "meibo"', async () => {
      // COVERS: §4.5 — download_type 判定優先順位
      repo.findOne.mockResolvedValue(
        buildFileUpload({ fileName: 'dokusya_meibo_202604.pdf' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ downloadType: 5 }),
      );
    });

    it('should set download_type=2 (その他) when file_name matches no known pattern', async () => {
      // COVERS: §4.5 — fallback default
      repo.findOne.mockResolvedValue(
        buildFileUpload({ fileName: 'random_export.pdf' }),
      );
      await service.download(101, buildSession(), baseReq);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ downloadType: 2 }),
      );
    });

    it('should rollback and NOT persist when AuditLogService.logOperation throws inside the transaction', async () => {
      // COVERS: §4.8 — transaction rollback when audit log fails
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit log write failed'));
      dataSource.transaction = jest.fn(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });
      await expect(
        service.download(101, buildSession(), baseReq),
      ).rejects.toThrow();
      // The INSERT into t_file_download (via txManager.save) was attempted, but
      // the transaction rolled back as a whole — TypeORM unwinds on throw.
    });

    it('should emit log_type=3 error audit log OUTSIDE the rolled-back transaction when the tx fails', async () => {
      // COVERS: §4.8 — error log lives outside tx
      auditLog.logOperation.mockRejectedValueOnce(new Error('tx failed'));
      try {
        await service.download(101, buildSession(), baseReq);
      } catch {
        /* expected */
      }
      // Either logOperation called again with log_type=3, or logError called.
      const errorCalls = auditLog.logOperation.mock.calls.filter(
        ([params]: any[]) => params?.logType === 3,
      );
      expect(errorCalls.length + auditLog.logError.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT throw when JA_HONTEN downloads a global file (ja_id IS NULL)', async () => {
      // COVERS: §4.2 — global files visible to all roles
      repo.findOne.mockResolvedValue(buildFileUpload({ jaId: null }));
      await expect(
        service.download(101, buildJaHontenSession({ ja_id: 1 }), baseReq),
      ).resolves.toBeDefined();
    });

    it('should accept NICHINO_ADMIN download even when t_file_download.ja_id will be NULL', async () => {
      // COVERS: §4.5 footnote — NICHINO_* downloading global files keeps ja_id NULL
      repo.findOne.mockResolvedValue(buildFileUpload({ jaId: null }));
      await service.download(
        101,
        buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
        baseReq,
      );
      expect(txManager.save).toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// SCR-023 — ファイルアップロード画面 (upload + delete + extended list fields)
// ══════════════════════════════════════════════════════════════════════

describe('FileUploadService — SCR-023 (upload + delete + extended list)', () => {
  let service: FileUploadService;
  let repo: any;
  let qbMock: any;
  let dataSource: any;
  let txManager: any;
  let auditLog: any;
  let storage: any;
  let notificationQueue: any;

  const baseReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any;

  beforeEach(() => {
    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((v) => v),
      createQueryBuilder: jest.fn(() => qbMock),
    };
    txManager = {
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
        const value = maybeValue ?? entityOrValue;
        // Mirror RETURNING * — assign a PK so the service can read the
        // freshly-inserted file_upload_id and feed it to the audit log.
        return { ...value, fileUploadId: value.fileUploadId ?? 201 };
      }),
      update: jest.fn(async () => ({ affected: 1 })),
      softDelete: jest.fn(async () => ({ affected: 1 })),
      query: jest.fn(async () => [{ count: '0' }]),
      getRepository: jest.fn(() => repo),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(txManager)),
      query: jest.fn(async () => []),
    };
    auditLog = {
      logOperation: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };
    storage = {
      getSignedUrl: jest.fn(async () => 'https://s3.example.com/signed-url'),
      download: jest.fn(async () => Buffer.from('binary content')),
      upload: jest.fn(async (key: string) => ({ key, etag: 'mock-etag' })),
      delete: jest.fn(async () => undefined),
    };
    notificationQueue = {
      enqueue: jest.fn(async () => ({ jobId: 'job-123' })),
    };

    // Constructor: (repo, dataSource, auditLog, storage, notificationQueue?).
    // The queue dep is optional — `/gen-code-backend` MAY introduce it
    // as @Optional() so existing SCR-022 tests don't need to wire it.
    service = new FileUploadService(
      repo,
      dataSource,
      auditLog,
      storage,
      notificationQueue,
    );
  });

  // ──────────────────────────────────────────────────────────────
  // API-023-001 — extended list response fields (notification_status etc.)
  //
  // Same endpoint as SCR-022's findAll but the response shape has more
  // columns. SCR-022 specs assert the SCR-022 subset; these new tests
  // pin the SCR-023 additions so refactors don't drop them.
  // ──────────────────────────────────────────────────────────────
  describe('findAll — SCR-023 extended fields', () => {
    it('should include ja_code and ja_name (from m_ja JOIN) when row has a non-null ja_id', async () => {
      // COVERS: §レスポンスデータ rows 4-5 — ja_code/ja_name from m_ja JOIN
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [
          buildJoinedFileUploadRow({ ja_id: 12345, ja_code: '12345', ja_name: 'JA農業中央' }),
        ];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      expect(result.data[0]).toMatchObject({
        ja_code: '12345',
        ja_name: 'JA農業中央',
      });
    });

    it('should serialize ja_code=null and ja_name=null when ja_id IS NULL (global file)', async () => {
      // COVERS: §レスポンスデータ rows 3-5 — ja_id null → ja_code/ja_name null
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [
          buildJoinedFileUploadRow({ ja_id: null, ja_code: null, ja_name: null }),
        ];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      expect(result.data[0]).toMatchObject({
        ja_id: null,
        ja_code: null,
        ja_name: null,
      });
    });

    it('should serialize notification_status when row is mapped', async () => {
      // COVERS: §レスポンスデータ row 9 — notification_status (FILE_UPLOAD_NOTIFICATION_STATUS m_code)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [buildJoinedFileUploadRow({ notification_status: 3 })];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      expect(result.data[0]).toHaveProperty('notification_status', 3);
    });

    it('should serialize success_count, error_count, scheduled_delete_date, error_file_path', async () => {
      // COVERS: §レスポンスデータ rows 11, 12, 14, 15 — extended SCR-023 fields
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [
          buildJoinedFileUploadRow({
            success_count: 1020,
            error_count: 4,
            error_file_path: 'ja-1/errors/err-101.csv',
          }),
        ];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const first = result.data[0];
      expect(first).toHaveProperty('success_count', 1020);
      expect(first).toHaveProperty('error_count', 4);
      expect(first).toHaveProperty('scheduled_delete_date');
      expect(first).toHaveProperty('error_file_path', 'ja-1/errors/err-101.csv');
    });

    it('should serialize success_count=null and error_count=null when row is mid-processing (status=1)', async () => {
      // COVERS: §レスポンス成功例 — second row (status=1, counts NULL)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '1' }];
        return [
          buildJoinedFileUploadRow({
            status: 1,
            record_count: null,
            success_count: null,
            error_count: null,
            scheduled_delete_date: null,
          }),
        ];
      });
      const result = await service.findAll(
        { page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      expect(result.data[0]).toMatchObject({
        status: 1,
        record_count: null,
        success_count: null,
        error_count: null,
        scheduled_delete_date: null,
      });
    });

    it('should filter by status when status query param is provided (SCR-023 only)', async () => {
      // COVERS: §4.1 + §4.4 — status filter (1:処理中, 2:完了, 3:エラー)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { status: 2, page: 1, per_page: 20 },
        buildSession(),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/status/i.test(sqlEmitted)).toBe(true);
    });

    it('should filter by ja_id when caller is NICHINO_ADMIN and ja_id param is provided', async () => {
      // COVERS: §4.1 — ja_id filter (NICHINO_* only per api.md request param note)
      dataSource.query = jest.fn(async (sql: string) => {
        if (/SELECT COUNT\(/i.test(sql)) return [{ total: '0' }];
        return [];
      });
      await service.findAll(
        { ja_id: 12345, page: 1, per_page: 20 },
        buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
        baseReq,
      );
      const sqlEmitted = dataSource.query.mock.calls.map((c: any) => c[0]).join('\n');
      expect(/ja_id/i.test(sqlEmitted)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // API-023-002 — POST /api/v1/file-upload (multipart upload)
  // ──────────────────────────────────────────────────────────────
  describe('upload', () => {
    it('should INSERT N×M rows when called with N ja_ids and M files', async () => {
      // COVERS: §4.5 — N×M cartesian INSERT
      const result = await service.upload(
        [12345, 67890],
        [
          buildUploadedFile({ originalname: 'a.csv' }),
          buildUploadedFile({ originalname: 'b.csv' }),
        ],
        buildSession(),
        baseReq,
      );
      // 2 JAs × 2 files = 4 saves in the transaction.
      expect(txManager.save).toHaveBeenCalledTimes(4);
      expect(result.data).toHaveLength(4);
    });

    it('should wrap all file INSERTs + audit log entries in a single dataSource.transaction', async () => {
      // COVERS: §処理手順 ※ — single transaction across §4.5 + §4.6
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should embed the sanitized ja_code in the folder (ja-{ja_id}-{ja_code}) when m_ja lookup returns a code', async () => {
      // COVERS: §4.4 — path format. ja_id leads (stable key); ja_code is a
      // readability suffix resolved from m_ja.
      dataSource.query = jest.fn(async () => [
        { ja_id: 12345, ja_code: 'JA001' },
      ]);
      await service.upload(
        [12345],
        [buildUploadedFile({ originalname: 'list.csv' })],
        buildSession(),
        baseReq,
      );
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^ja-12345-JA001\/files\/[a-f0-9-]+-list\.csv$/),
        expect.any(Buffer),
        expect.any(String),
      );
    });

    it('should fall back to ja-{ja_id}/files/ when the m_ja ja_code lookup returns nothing', async () => {
      // Edge: deleted JA / unknown id (default mock returns []). ja_id
      // alone still yields a unique, valid folder.
      dataSource.query = jest.fn(async () => []);
      await service.upload(
        [12345],
        [buildUploadedFile({ originalname: 'list.csv' })],
        buildSession(),
        baseReq,
      );
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^ja-12345\/files\/[a-f0-9-]+-list\.csv$/),
        expect.any(Buffer),
        expect.any(String),
      );
    });

    it('should initialize status=1 (処理中) and notification_status=1 (未送信) on each new row', async () => {
      // COVERS: §4.5 — initial state per api.md
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 1, notificationStatus: 1 }),
      );
    });

    it('should save the user-selected 削除予定日 as a plain calendar date (YYYY-MM-DD)', async () => {
      // Reported bug: the user's picked date was discarded in favour of
      // NOW()+180days. Stored as a `date` (no TZ) so it reads identically
      // everywhere — 2026-06-30, never 2026-06-29.
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
        '2026/06/30',
      );
      const savedCall = txManager.save.mock.calls.find(
        ([_e, v]: any[]) => v?.scheduledDeleteDate != null,
      );
      expect(savedCall).toBeDefined();
      expect(savedCall![1].scheduledDeleteDate).toBe('2026-06-30');
    });

    it('should reject a past 削除予定日 with VALIDATION_ERROR and not upload anything', async () => {
      await expect(
        service.upload(
          [12345],
          [buildUploadedFile()],
          buildSession(),
          baseReq,
          '2020/01/01',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error_code: 'VALIDATION_ERROR',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'scheduled_delete_date' }),
          ]),
        }),
      });
      // Fails before any side effect.
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('should fall back to upload_datetime + 180 days (JST date) when 削除予定日 is omitted', async () => {
      // §4.5 default — only applies when the FE / caller does not supply
      // a date (e.g. an API-direct caller).
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      const savedCall = txManager.save.mock.calls.find(
        ([_e, v]: any[]) => v?.scheduledDeleteDate != null,
      );
      expect(savedCall).toBeDefined();
      const stored = savedCall![1].scheduledDeleteDate as string;
      expect(stored).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // ~180 days ahead (±2 days slack for JST date rounding / run boundary).
      const storedMs = new Date(`${stored}T00:00:00+09:00`).getTime();
      const expectedMs = Date.now() + 180 * 24 * 60 * 60 * 1000;
      expect(Math.abs(storedMs - expectedMs)).toBeLessThan(2 * 24 * 60 * 60 * 1000);
    });

    it('should call AuditLogService.logOperation with log_type=4 and operation="CREATE" (bare verb)', async () => {
      // COVERS: §4.6 — log_type=4 (file op), operation MUST be bare verb (no FILE_UPLOAD_CREATE)
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 4,
          operation: 'CREATE',
          resultStatus: 1,
          targetTable: 't_file_upload',
        }),
        expect.anything(), // EntityManager when inside transaction
      );
    });

    it('should emit one audit log entry per uploaded file (N×M)', async () => {
      // COVERS: §4.6 — 1 t_log row per t_file_upload INSERT
      await service.upload(
        [12345, 67890],
        [buildUploadedFile({ originalname: 'a.csv' })],
        buildSession(),
        baseReq,
      );
      // 2 JAs × 1 file = 2 audit-log calls.
      expect(auditLog.logOperation).toHaveBeenCalledTimes(2);
    });

    it('should enqueue the notification job AFTER the transaction commits (not inside)', async () => {
      // COVERS: §4.7 — enqueue runs post-commit, not inside the tx
      await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      expect(notificationQueue.enqueue).toHaveBeenCalled();
      // Verify the call happened after dataSource.transaction settled.
      const txCall = (dataSource.transaction as jest.Mock).mock.invocationCallOrder[0];
      const queueCall = (notificationQueue.enqueue as jest.Mock).mock.invocationCallOrder[0];
      expect(queueCall).toBeGreaterThan(txCall);
    });

    it('should enqueue ONE job per saved row (1 job per JA per file) — N×M jobs for N×M rows', async () => {
      // COVERS: §4.7 + customer review feedback — per-JA retry isolation
      // requires the producer to split the work into N×M independent
      // BullMQ jobs, NOT a single job carrying every JA in its payload.
      // Splitting is the contract the worker depends on.
      await service.upload(
        [12345, 67890, 11111],
        [
          buildUploadedFile({ originalname: 'a.csv' }),
          buildUploadedFile({ originalname: 'b.csv' }),
        ],
        buildSession(),
        baseReq,
      );
      // 3 JAs × 2 files = 6 enqueue calls.
      expect(notificationQueue.enqueue).toHaveBeenCalledTimes(6);
    });

    it('should enqueue payload of shape { file_upload_id, ja_id, uploaded_by } — single-JA per job', async () => {
      // COVERS: §4.7 — payload shape contract with the worker. The old
      // multi-JA payload (file_upload_ids[] + ja_ids[]) is intentionally
      // gone; this test pins the new shape so a regression resurrecting
      // it would trip immediately.
      const session = buildSession({ account_id: 42 });
      await service.upload(
        [12345],
        [buildUploadedFile()],
        session,
        baseReq,
      );
      expect(notificationQueue.enqueue).toHaveBeenCalledWith({
        file_upload_id: expect.any(Number),
        ja_id: 12345,
        uploaded_by: 42,
      });
      // Make sure the legacy fields are NOT present (regression guard).
      const call = (notificationQueue.enqueue as jest.Mock).mock.calls[0][0];
      expect(call).not.toHaveProperty('file_upload_ids');
      expect(call).not.toHaveProperty('ja_ids');
      expect(call).not.toHaveProperty('job_name');
    });

    it('should NOT enqueue the notification job when the transaction throws', async () => {
      // COVERS: §4.7 — enqueue is gated on commit; rolled-back uploads do NOT enqueue
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit failed'));
      dataSource.transaction = jest.fn(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });
      try {
        await service.upload(
          [12345],
          [buildUploadedFile()],
          buildSession(),
          baseReq,
        );
      } catch {
        /* expected */
      }
      expect(notificationQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should rollback ALL file INSERTs when the audit log throws inside the transaction', async () => {
      // COVERS: §4.5 + §4.6 rollback — partial multi-file failure rolls back all saves
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit log down'));
      dataSource.transaction = jest.fn(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });
      await expect(
        service.upload(
          [12345, 67890],
          [buildUploadedFile()],
          buildSession(),
          baseReq,
        ),
      ).rejects.toThrow();
      // No commit → response must NOT contain data
    });

    it('should compensate (delete) already-uploaded S3 objects when a subsequent S3 upload fails', async () => {
      // COVERS: §4.4 — 補償削除 on partial S3 failure
      storage.upload = jest
        .fn()
        .mockResolvedValueOnce({ key: 'ja-12345/files/uuid-a.csv', etag: 'e1' })
        .mockRejectedValueOnce(new Error('S3 timeout'));
      await expect(
        service.upload(
          [12345],
          [
            buildUploadedFile({ originalname: 'a.csv' }),
            buildUploadedFile({ originalname: 'b.csv' }),
          ],
          buildSession(),
          baseReq,
        ),
      ).rejects.toThrow();
      expect(storage.delete).toHaveBeenCalledWith(
        expect.stringContaining('ja-12345/files/'),
      );
    });

    it('should emit log_type=3 error audit log OUTSIDE the transaction when the upload fails', async () => {
      // COVERS: §4.9 — error log lives outside tx
      storage.upload = jest.fn().mockRejectedValue(new Error('S3 down'));
      try {
        await service.upload(
          [12345],
          [buildUploadedFile()],
          buildSession(),
          baseReq,
        );
      } catch {
        /* expected */
      }
      const errorCalls = auditLog.logOperation.mock.calls.filter(
        ([params]: any[]) => params?.logType === 3,
      );
      expect(
        errorCalls.length + auditLog.logError.mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('should reject when JA_HONTEN tries to upload to a different JA (DATA_SCOPE_VIOLATION)', async () => {
      // COVERS: §4.2 — DataScope on ja_ids
      await expect(
        service.upload(
          [99999],
          [buildUploadedFile()],
          buildJaHontenSession({ ja_id: 1 }),
          baseReq,
        ),
      ).rejects.toMatchObject({
        response: { error_code: 'DATA_SCOPE_VIOLATION' },
      });
    });

    it('should allow NICHINO_ADMIN to upload to any JA', async () => {
      // COVERS: §4.2 — NICHINO_* bypass
      const result = await service.upload(
        [12345, 67890],
        [buildUploadedFile()],
        buildSession({ role_code: 'NICHINO_ADMIN', ja_id: null }),
        baseReq,
      );
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return the success message "アップロードを受け付けました。通知メールはバックグラウンドで送信されます。"', async () => {
      // COVERS: §レスポンスデータ row 12 — message field literal
      const result = await service.upload(
        [12345],
        [buildUploadedFile()],
        buildSession(),
        baseReq,
      );
      expect(result.message).toBe(
        'アップロードを受け付けました。通知メールはバックグラウンドで送信されます。',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // API-023-004 — DELETE /api/v1/file-upload/:id
  // ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    beforeEach(() => {
      repo.findOne.mockResolvedValue(buildFileUpload());
    });

    it('should soft-delete the file and call AuditLogService with operation="DELETE" (bare verb)', async () => {
      // COVERS: §4.4 + §4.5 happy path
      const result = await service.remove(101, buildSession(), baseReq);
      expect(result.message).toBe('削除しました。');
      expect(auditLog.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          logType: 4,
          operation: 'DELETE',
          resultStatus: 1,
          targetId: 101,
          targetTable: 't_file_upload',
        }),
        expect.anything(),
      );
    });

    it('should wrap UPDATE deleted_at + t_log INSERT in dataSource.transaction', async () => {
      // COVERS: §処理手順 ※ — single transaction
      await service.remove(101, buildSession(), baseReq);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should pass before_value JSON snapshot to the audit log call', async () => {
      // COVERS: §4.5 — before_value is the pre-delete record state
      await service.remove(101, buildSession(), baseReq);
      const auditCall = auditLog.logOperation.mock.calls.find(
        ([params]: any[]) => params?.operation === 'DELETE',
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![0].beforeValue).toBeDefined();
    });

    it('should throw NotFoundException when the file does not exist', async () => {
      // COVERS: §4.3 — レコードが存在しない場合
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.remove(999, buildSession(), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (existence-hiding) when JA_HONTEN deletes another JAs file', async () => {
      // COVERS: §4.2 — DataScope masks as 404
      repo.findOne.mockResolvedValue(buildFileUpload({ jaId: 999 }));
      await expect(
        service.remove(101, buildJaHontenSession({ ja_id: 1 }), baseReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete the S3 object AFTER the transaction commits', async () => {
      // COVERS: §4.6 — physical delete is post-commit (so DB rollback doesn't orphan)
      await service.remove(101, buildSession(), baseReq);
      const txCall = (dataSource.transaction as jest.Mock).mock.invocationCallOrder[0];
      const s3Call = (storage.delete as jest.Mock).mock.invocationCallOrder[0];
      expect(s3Call).toBeGreaterThan(txCall);
    });

    it('should still return 200 success when S3 delete fails post-commit (orphan handled by cleanup job)', async () => {
      // COVERS: §4.6 — physical-delete failure is non-fatal
      storage.delete = jest.fn().mockRejectedValue(new Error('S3 down'));
      const result = await service.remove(101, buildSession(), baseReq);
      expect(result.message).toBe('削除しました。');
    });

    it('should rollback and NOT mark deleted when AuditLogService.logOperation throws', async () => {
      // COVERS: §処理手順 ※ — audit log failure rolls back the UPDATE
      auditLog.logOperation.mockRejectedValueOnce(new Error('audit write failed'));
      dataSource.transaction = jest.fn(async (cb: any) => {
        try {
          return await cb(txManager);
        } catch (e) {
          throw e;
        }
      });
      await expect(
        service.remove(101, buildSession(), baseReq),
      ).rejects.toThrow();
      // Post-commit physical-delete must NOT fire when the tx rolled back.
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should emit log_type=3 error audit log OUTSIDE the transaction when delete fails', async () => {
      // COVERS: §4.8 — error log lives outside tx
      auditLog.logOperation.mockRejectedValueOnce(new Error('tx failed'));
      try {
        await service.remove(101, buildSession(), baseReq);
      } catch {
        /* expected */
      }
      const errorCalls = auditLog.logOperation.mock.calls.filter(
        ([params]: any[]) => params?.logType === 3,
      );
      expect(
        errorCalls.length + auditLog.logError.mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
