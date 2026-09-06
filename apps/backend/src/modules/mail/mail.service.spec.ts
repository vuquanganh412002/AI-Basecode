// MailService — provider selection (SES vs SMTP) + sendOtp / sendPasswordReset /
// sendNotification. Both provider constructors are mocked so onModuleInit()
// can pick between them without booting AWS / nodemailer.

const sesSendMail = jest.fn();
const smtpSendMail = jest.fn();
const sesCtor = jest.fn();
const smtpCtor = jest.fn();

jest.mock('./providers/ses.provider', () => ({
  SesMailProvider: jest.fn().mockImplementation((cfg) => {
    sesCtor(cfg);
    return { sendMail: sesSendMail };
  }),
}));

jest.mock('./providers/smtp.provider', () => ({
  SmtpMailProvider: jest.fn().mockImplementation((cfg) => {
    smtpCtor(cfg);
    return { sendMail: smtpSendMail };
  }),
}));

import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('MailService', () => {
  beforeEach(() => {
    sesSendMail.mockReset();
    smtpSendMail.mockReset();
    sesCtor.mockReset();
    smtpCtor.mockReset();
  });

  describe('onModuleInit — provider selection', () => {
    it('should pick SesMailProvider when mail.provider="ses"', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'ses',
          'mail.region': 'us-east-1',
          'mail.from': 'noreply@example.com',
        }),
      );

      service.onModuleInit();

      expect(sesCtor).toHaveBeenCalledWith({
        region: 'us-east-1',
        from: '"AGRINEWS" <noreply@example.com>',
        configurationSet: undefined,
      });
      expect(smtpCtor).not.toHaveBeenCalled();
    });

    it('should pass mail.configurationSet through to SesMailProvider', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'ses',
          'mail.region': 'ap-northeast-1',
          'mail.from': 'noreply@example.com',
          'mail.configurationSet': 'agn-dev-ses-config',
        }),
      );

      service.onModuleInit();

      expect(sesCtor).toHaveBeenCalledWith({
        region: 'ap-northeast-1',
        from: '"AGRINEWS" <noreply@example.com>',
        configurationSet: 'agn-dev-ses-config',
      });
    });

    it('should pick SmtpMailProvider when NODE_ENV=local and no explicit provider', () => {
      const service = new MailService(
        buildConfig({
          nodeEnv: 'local',
          'mail.host': 'localhost',
          'mail.port': 1025,
          'mail.user': '',
          'mail.pass': '',
          'mail.from': 'noreply@example.com',
        }),
      );

      service.onModuleInit();

      expect(smtpCtor).toHaveBeenCalledWith({
        host: 'localhost',
        port: 1025,
        user: '',
        pass: '',
        from: '"AGRINEWS" <noreply@example.com>',
      });
      expect(sesCtor).not.toHaveBeenCalled();
    });

    it('should pick SesMailProvider when NODE_ENV is non-local (e.g. production) and no explicit provider', () => {
      const service = new MailService(
        buildConfig({
          nodeEnv: 'production',
          'mail.region': 'ap-northeast-1',
          'mail.from': 'noreply@example.com',
          'mail.configurationSet': 'agn-prod-ses-config',
        }),
      );

      service.onModuleInit();

      expect(sesCtor).toHaveBeenCalledWith({
        region: 'ap-northeast-1',
        from: '"AGRINEWS" <noreply@example.com>',
        configurationSet: 'agn-prod-ses-config',
      });
      expect(smtpCtor).not.toHaveBeenCalled();
    });

    it('should let an explicit MAIL_PROVIDER=smtp override NODE_ENV=production', () => {
      const service = new MailService(
        buildConfig({
          nodeEnv: 'production',
          'mail.provider': 'smtp',
          'mail.host': 'smtp.example.com',
          'mail.port': 587,
          'mail.user': 'u',
          'mail.pass': 'p',
          'mail.from': 'noreply@example.com',
        }),
      );

      service.onModuleInit();

      expect(smtpCtor).toHaveBeenCalled();
      expect(sesCtor).not.toHaveBeenCalled();
    });

    it('should pick SmtpMailProvider when mail.provider="smtp" (explicit)', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'smtp',
          'mail.host': 'smtp.example.com',
          'mail.port': 587,
          'mail.user': 'noreply',
          'mail.pass': 'secret',
          'mail.from': 'noreply@example.com',
        }),
      );

      service.onModuleInit();

      expect(smtpCtor).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        user: 'noreply',
        pass: 'secret',
        from: '"AGRINEWS" <noreply@example.com>',
      });
    });

    it('should fall back to defaults when mail.* configs are missing (smtp.host=localhost, port=1025, region=ap-northeast-1, from=noreply@agrinews.jp)', () => {
      const service = new MailService(buildConfig({ 'mail.provider': 'ses' }));
      service.onModuleInit();
      expect(sesCtor).toHaveBeenCalledWith({
        region: 'ap-northeast-1',
        from: '"AGRINEWS" <noreply@agrinews.jp>',
      });

      sesCtor.mockClear();
      smtpCtor.mockClear();

      const service2 = new MailService(buildConfig({ nodeEnv: 'local' }));
      service2.onModuleInit();
      expect(smtpCtor).toHaveBeenCalledWith({
        host: 'localhost',
        port: 1025,
        user: '',
        pass: '',
        from: '"AGRINEWS" <noreply@agrinews.jp>',
      });
    });

    it('should wrap MAIL_FROM with a custom MAIL_FROM_NAME as the display name', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'ses',
          'mail.from': 'noreply@example.com',
          'mail.fromName': '日本農業新聞',
        }),
      );
      service.onModuleInit();
      expect(sesCtor).toHaveBeenCalledWith(
        expect.objectContaining({ from: '"日本農業新聞" <noreply@example.com>' }),
      );
    });

    it('should send with the address only (no display name) when MAIL_FROM_NAME is empty', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'ses',
          'mail.from': 'noreply@example.com',
          'mail.fromName': '',
        }),
      );
      service.onModuleInit();
      expect(sesCtor).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@example.com' }),
      );
    });

    it('should respect MAIL_FROM already in "Name <addr>" form and not double-wrap', () => {
      const service = new MailService(
        buildConfig({
          'mail.provider': 'ses',
          'mail.from': 'Custom <custom@example.com>',
          'mail.fromName': 'AGRINEWS',
        }),
      );
      service.onModuleInit();
      expect(sesCtor).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Custom <custom@example.com>' }),
      );
    });
  });

  describe('sendOtp', () => {
    it('should delegate to provider.sendMail with the rendered OTP subject/text', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendOtp('user@example.com', '田中太郎', '123456', 5);

      expect(smtpSendMail).toHaveBeenCalledTimes(1);
      const arg = smtpSendMail.mock.calls[0][0];
      expect(arg.to).toBe('user@example.com');
      expect(arg.subject).toBe(
        '【クラウド版購読者管理システム】認証コードのお知らせ',
      );
      expect(arg.text).toContain('田中太郎　様');
      expect(arg.text).toContain('認証コード: 123456');
    });

    it('should reflect the expiryMinutes argument in the rendered text (regression: was hardcoded "5分")', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendOtp('user@example.com', '田中太郎', '123456', 10);

      const arg = smtpSendMail.mock.calls[0][0];
      expect(arg.text).toContain('有効期限: 10分');
    });

    it('should propagate provider errors so the auth service can log/handle', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();
      smtpSendMail.mockRejectedValueOnce(new Error('smtp down'));

      await expect(
        service.sendOtp('user@example.com', '田中', '123456', 5),
      ).rejects.toThrow('smtp down');
    });
  });

  describe('sendPasswordReset', () => {
    it('should delegate to provider.sendMail with the rendered reset subject/text', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendPasswordReset(
        'user@example.com',
        '田中太郎',
        'https://example.com/reset?token=abc',
        30,
      );

      expect(smtpSendMail).toHaveBeenCalledTimes(1);
      const arg = smtpSendMail.mock.calls[0][0];
      expect(arg.to).toBe('user@example.com');
      expect(arg.subject).toBe(
        '【クラウド版購読者管理システム】パスワードリセット',
      );
      expect(arg.text).toContain('田中太郎　様');
      expect(arg.text).toContain('https://example.com/reset?token=abc');
      expect(arg.text).toContain('有効期限: 30分');
    });

    it('should propagate expiryMinutes into the rendered body (60 → 1時間)', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendPasswordReset('u@e.com', '田中', 'http://x', 60);

      const arg = smtpSendMail.mock.calls[0][0];
      expect(arg.text).toContain('有効期限: 1時間');
    });
  });

  describe('sendFileUploadNotification', () => {
    it('should delegate to provider.sendMail with the rendered upload-notification subject/text', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendFileUploadNotification('sub1@example.com', {
        jaName: 'JA東京中央',
        fileName: 'sample.xlsx',
        uploadDatetime: new Date('2026-08-22T03:00:00.000Z'),
        uploaderLoginId: 'ja_honten001',
        uploaderAccountName: '花子',
        downloadUrl: 'https://example.com/file-download?file_name=sample.xlsx',
      });

      expect(smtpSendMail).toHaveBeenCalledTimes(1);
      const arg = smtpSendMail.mock.calls[0][0];
      expect(arg.to).toBe('sub1@example.com');
      expect(arg.subject).toBe(
        '【クラウド版購読者管理システム】【ja_honten001 花子】ファイルアップロードのお知らせ',
      );
      expect(arg.text).toContain('JA東京中央');
      expect(arg.text).toContain('sample.xlsx');
      expect(arg.text).toContain('https://example.com/file-download?file_name=sample.xlsx');
    });

    it('should propagate provider errors so the caller (worker) can log/retry', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();
      smtpSendMail.mockRejectedValueOnce(new Error('smtp down'));

      await expect(
        service.sendFileUploadNotification('sub1@example.com', {
          jaName: 'JA東京中央',
          fileName: 'sample.xlsx',
          uploadDatetime: new Date('2026-08-22T03:00:00.000Z'),
          uploaderLoginId: 'ja_honten001',
          uploaderAccountName: '花子',
          downloadUrl: '',
        }),
      ).rejects.toThrow('smtp down');
    });
  });

  describe('sendNotification', () => {
    it('should send html body with the subject passed through as-is (no prefix)', async () => {
      // 顧客要件2026-07: システム名プレフィックスは付与せず、件名は呼び出し側が
      // 完成形で渡す（ACSMS-SCR-029 は本文先頭に【クラウド版購読者管理システム】を置く）。
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      await service.sendNotification(
        'user@example.com',
        '【東京都】【admin01】お知らせ',
        '<p>本文</p>',
      );

      expect(smtpSendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '【東京都】【admin01】お知らせ',
        html: '<p>本文</p>',
      });
    });
  });

  describe('maskEmail (log redaction)', () => {
    it('should expose the first character only — verified via the success log path', async () => {
      // The mask is private; we observe it indirectly through the logger.
      // Spy on the Nest Logger instance attached to the service.
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      await service.sendOtp('alice@example.com', '田中', '123456', 5);

      // Expect the log payload to carry the masked form 'a***@example.com'.
      const logged = logSpy.mock.calls.find(
        (c) => (c[0] as any)?.event === 'mail.otp.sent',
      );
      expect(logged?.[0]).toMatchObject({ email: 'a***@example.com' });
    });

    it('should fall back to "***" when the email has no @ (defensive)', async () => {
      const service = new MailService(
        buildConfig({ 'mail.provider': 'smtp', 'mail.from': 'a@b.com' }),
      );
      service.onModuleInit();

      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      await service.sendOtp('not-an-email', '田中', '123456', 5);

      const logged = logSpy.mock.calls.find(
        (c) => (c[0] as any)?.event === 'mail.otp.sent',
      );
      expect(logged?.[0]).toMatchObject({ email: '***' });
    });
  });
});
