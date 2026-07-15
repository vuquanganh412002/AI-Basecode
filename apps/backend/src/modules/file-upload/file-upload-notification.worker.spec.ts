// SCR-023 §6.5 — worker unit tests.
//
// Worker boots without Nest DI — `new FileUploadNotificationWorker(...)`
// with hand-rolled mocks. BullMQ doesn't ship test utilities for
// WorkerHost so the spec drives `worker.process(job)` directly.

import type { Job } from 'bullmq';

import { FileUploadNotificationWorker } from './file-upload-notification.worker';
import type { FileUploadNotificationJob } from './notification-queue.service';

// ─── Test doubles ──────────────────────────────────────────────────────

interface Mocks {
  fileUploadRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  accountRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  jaRepo: {
    findOne: jest.Mock;
  };
  mailService: {
    sendFileUploadNotification: jest.Mock;
  };
  auditLog: {
    logError: jest.Mock;
  };
}

function buildMocks(): Mocks {
  return {
    fileUploadRepo: {
      findOne: jest.fn(),
      update: jest.fn(async () => ({ affected: 1 })),
    },
    accountRepo: {
      find: jest.fn(),
      findOne: jest.fn(),
    },
    jaRepo: {
      findOne: jest.fn(),
    },
    mailService: {
      sendFileUploadNotification: jest.fn(async () => undefined),
    },
    auditLog: {
      logError: jest.fn(async () => undefined),
    },
  };
}

function buildWorker(m: Mocks): FileUploadNotificationWorker {
  return new FileUploadNotificationWorker(
    m.fileUploadRepo as any,
    m.accountRepo as any,
    m.jaRepo as any,
    m.mailService as any,
    m.auditLog as any,
  );
}

function buildJob(
  overrides: Partial<FileUploadNotificationJob> = {},
): Job<FileUploadNotificationJob> {
  return {
    id: 'job-1',
    data: {
      file_upload_id: 101,
      ja_id: 1,
      uploaded_by: 99,
      ...overrides,
    },
  } as Job<FileUploadNotificationJob>;
}

function buildFileUploadRow(overrides: Record<string, unknown> = {}) {
  return {
    fileUploadId: 101,
    jaId: 1,
    fileName: 'zougen_tsuchi_202604.pdf',
    uploadDatetime: new Date('2026-05-07T10:30:00+09:00'),
    notificationStatus: 1,
    deletedAt: null,
    ...overrides,
  };
}

function buildAccount(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 99,
    loginId: 'admin01',
    email: 'admin@example.com',
    subEmail1: '',
    subEmail2: '',
    subEmail3: '',
    ...overrides,
  };
}

function buildJa(overrides: Record<string, unknown> = {}) {
  return {
    jaId: 1,
    jaName: 'JA農業中央',
    deletedAt: null,
    ...overrides,
  };
}

// ─── Specs ─────────────────────────────────────────────────────────────

describe('FileUploadNotificationWorker', () => {
  let m: Mocks;
  let worker: FileUploadNotificationWorker;

  beforeEach(() => {
    m = buildMocks();
    worker = buildWorker(m);
  });

  describe('idempotency [resume-after-crash]', () => {
    it('should short-circuit when notification_status is already 3 (完了)', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(
        buildFileUploadRow({ notificationStatus: 3 }),
      );
      await worker.process(buildJob());
      expect(m.fileUploadRepo.update).not.toHaveBeenCalled();
      expect(m.mailService.sendFileUploadNotification).not.toHaveBeenCalled();
    });
  });

  describe('row missing', () => {
    it('should ack silently when t_file_upload row is soft-deleted or absent', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(null);
      await expect(worker.process(buildJob())).resolves.toBeUndefined();
      expect(m.mailService.sendFileUploadNotification).not.toHaveBeenCalled();
      expect(m.fileUploadRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('ja missing', () => {
    it('should mark partial-failure and throw so BullMQ retries when m_ja FK is broken', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(null);
      await expect(worker.process(buildJob())).rejects.toThrow(/JA 1 not found/);
      // [status-flip] 2 first (送信中), then 4 (一部失敗 — marker for the
      // operator dashboard while BullMQ retries).
      expect(m.fileUploadRepo.update).toHaveBeenCalledWith(
        { fileUploadId: 101 },
        { notificationStatus: 2 },
      );
      expect(m.fileUploadRepo.update).toHaveBeenCalledWith(
        { fileUploadId: 101 },
        expect.objectContaining({ notificationStatus: 4 }),
      );
    });
  });

  describe('happy path — all recipients ok', () => {
    it('should flip status 1 → 2 → 3 and stamp notified_at', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([
        buildAccount({
          email: 'a@example.com',
          subEmail1: 'a-sub1@example.com',
        }),
        buildAccount({ email: 'b@example.com' }),
      ]);
      m.accountRepo.findOne.mockResolvedValue(buildAccount());

      await worker.process(buildJob());

      // 3 distinct recipients (a, a-sub1, b)
      expect(m.mailService.sendFileUploadNotification).toHaveBeenCalledTimes(3);
      // Final state — 完了 + notified_at.
      const finalCall = m.fileUploadRepo.update.mock.calls.at(-1);
      expect(finalCall?.[0]).toEqual({ fileUploadId: 101 });
      expect(finalCall?.[1].notificationStatus).toBe(3);
      expect(finalCall?.[1].notifiedAt).toBeInstanceOf(Date);
      // No partial-failure audit row in the happy path.
      expect(m.auditLog.logError).not.toHaveBeenCalled();
    });

    it('should dedupe identical emails across primary and sub slots', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([
        buildAccount({
          email: 'shared@example.com',
          subEmail1: 'shared@example.com', // same as email — should dedupe
          subEmail2: 'shared@example.com',
        }),
      ]);
      m.accountRepo.findOne.mockResolvedValue(buildAccount());

      await worker.process(buildJob());

      // 1 unique recipient even though 3 slots had it.
      expect(m.mailService.sendFileUploadNotification).toHaveBeenCalledTimes(1);
    });

    it('should skip blank/whitespace email slots without calling MailService for them', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([
        buildAccount({
          email: 'real@example.com',
          subEmail1: '',
          subEmail2: '   ', // whitespace only
        }),
      ]);
      m.accountRepo.findOne.mockResolvedValue(buildAccount());

      await worker.process(buildJob());

      expect(m.mailService.sendFileUploadNotification).toHaveBeenCalledTimes(1);
      expect(m.mailService.sendFileUploadNotification).toHaveBeenCalledWith(
        'real@example.com',
        expect.any(Object),
      );
    });
  });

  describe('no recipients', () => {
    it('should treat zero-account JA as vacuously complete (status=3)', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([]);

      await worker.process(buildJob());

      expect(m.mailService.sendFileUploadNotification).not.toHaveBeenCalled();
      const finalCall = m.fileUploadRepo.update.mock.calls.at(-1);
      expect(finalCall?.[1].notificationStatus).toBe(3);
      expect(finalCall?.[1].notifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('partial failure', () => {
    it('should flip to status=4 + write audit log when SOME recipients fail', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([
        buildAccount({ email: 'ok@example.com' }),
        buildAccount({ email: 'bad@example.com' }),
      ]);
      m.accountRepo.findOne.mockResolvedValue(buildAccount());
      m.mailService.sendFileUploadNotification.mockImplementation(
        async (email: string) => {
          if (email === 'bad@example.com') throw new Error('SMTP 421');
        },
      );

      await worker.process(buildJob());

      // 2 sends attempted.
      expect(m.mailService.sendFileUploadNotification).toHaveBeenCalledTimes(2);
      // Status moved to 一部失敗.
      const finalCall = m.fileUploadRepo.update.mock.calls.at(-1);
      expect(finalCall?.[1].notificationStatus).toBe(4);
      // Single summary audit row carrying the masked failure list.
      expect(m.auditLog.logError).toHaveBeenCalledTimes(1);
      const [, op, err] = m.auditLog.logError.mock.calls[0];
      expect(op).toBe('SEND_NOTIFICATION');
      expect((err as Error).message).toContain('1/2 recipients failed');
    });
  });

  describe('all-failed', () => {
    it('should throw (no status=4 commit) so BullMQ retries the whole job', async () => {
      m.fileUploadRepo.findOne.mockResolvedValue(buildFileUploadRow());
      m.jaRepo.findOne.mockResolvedValue(buildJa());
      m.accountRepo.find.mockResolvedValue([
        buildAccount({ email: 'x@example.com' }),
        buildAccount({ email: 'y@example.com' }),
      ]);
      m.accountRepo.findOne.mockResolvedValue(buildAccount());
      m.mailService.sendFileUploadNotification.mockRejectedValue(
        new Error('SMTP 421'),
      );

      await expect(worker.process(buildJob())).rejects.toThrow(/All 2/);

      // [status-not-flapped] status stays at 2 (送信中) — we did NOT
      // flip to 4. That keeps the UI badge stable across BullMQ
      // retry attempts. Verify by checking the last update call's
      // payload was still { notificationStatus: 2 } (the initial flip).
      const updates = m.fileUploadRepo.update.mock.calls;
      expect(updates.length).toBeGreaterThanOrEqual(1);
      const lastStatus = updates.at(-1)?.[1].notificationStatus;
      expect(lastStatus).toBe(2);
    });
  });
});
