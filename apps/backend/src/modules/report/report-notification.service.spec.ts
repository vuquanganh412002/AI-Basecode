// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// ReportNotificationService unit specs — 出力成功後の日農担当者宛
// メール通知（fire-and-forget / non-fatal）。
//   - 指定ロールのアカウントを論理削除除外で抽出
//   - collectAccountEmails で最大4アドレス/件を union-dedupe
//   - 宛先ごとにループ送信、個別失敗はスキップして継続
//   - 戻り値 = 送信を試みた宛先数（attempted）
//   - 宛先取得失敗・送信失敗いずれも throw しない

import { In, IsNull } from 'typeorm';

import { RoleCode } from '@/common/enums/role-code.enum';
import { ReportNotificationService } from '@/modules/report/report-notification.service';

function acc(
  email: string,
  subEmail1 = '',
  subEmail2 = '',
  subEmail3 = '',
  roleId = 1,
): any {
  return { email, subEmail1, subEmail2, subEmail3, roleId, deletedAt: null };
}

describe('ReportNotificationService', () => {
  let service: ReportNotificationService;
  let accountRepo: any;
  let roleRepo: any;
  let mailService: any;

  beforeEach(() => {
    accountRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ accountName: '' }),
    };
    roleRepo = {
      find: jest.fn().mockResolvedValue([{ roleId: 1 }, { roleId: 2 }]),
    };
    mailService = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    service = new ReportNotificationService(accountRepo, roleRepo, mailService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('queries accounts filtered by role IDs and non-deleted', async () => {
    accountRepo.find.mockResolvedValue([acc('a@x.jp')]);
    await service.notifyRoles([1, 2], { subject: 's', body: 'b' });

    expect(accountRepo.find).toHaveBeenCalledWith({
      where: { roleId: In([1, 2]), deletedAt: IsNull() },
    });
  });

  it('sends to every deduped address (max 4 slots/account) and returns the attempted count', async () => {
    accountRepo.find.mockResolvedValue([
      acc('a@x.jp', 'shared@x.jp', '', 'c@x.jp'),
      acc('b@x.jp', 'shared@x.jp'), // shared@x.jp deduped across accounts
    ]);

    const count = await service.notifyRoles([1, 2], {
      subject: '増減通知',
      body: 'ファイル管理画面からダウンロードできます。',
    });

    // a, shared, c, b → 4 unique recipients
    expect(count).toBe(4);
    expect(mailService.sendNotification).toHaveBeenCalledTimes(4);
    const sentTo = mailService.sendNotification.mock.calls.map((c: any[]) => c[0]);
    expect(new Set(sentTo)).toEqual(
      new Set(['a@x.jp', 'shared@x.jp', 'c@x.jp', 'b@x.jp']),
    );
    // subject + body forwarded to MailService.sendNotification(email, subject, body)
    expect(mailService.sendNotification).toHaveBeenCalledWith(
      'a@x.jp',
      '増減通知',
      'ファイル管理画面からダウンロードできます。',
    );
  });

  it('tolerates a per-recipient send failure and continues with the rest', async () => {
    accountRepo.find.mockResolvedValue([acc('a@x.jp', 'b@x.jp', 'c@x.jp')]);
    mailService.sendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('smtp-down')) // b@x.jp fails
      .mockResolvedValueOnce(undefined);

    const count = await service.notifyRoles([1], { subject: 's', body: 'b' });

    // attempted count includes the failed one; no throw.
    expect(count).toBe(3);
    expect(mailService.sendNotification).toHaveBeenCalledTimes(3);
  });

  it('never throws and returns 0 when account lookup fails', async () => {
    accountRepo.find.mockRejectedValue(new Error('db-down'));

    await expect(
      service.notifyRoles([1, 2], { subject: 's', body: 'b' }),
    ).resolves.toBe(0);
    expect(mailService.sendNotification).not.toHaveBeenCalled();
  });

  it('returns 0 and sends nothing when no account has any address', async () => {
    accountRepo.find.mockResolvedValue([acc('', '', '', '')]);

    const count = await service.notifyRoles([1, 2], { subject: 's', body: 'b' });
    expect(count).toBe(0);
    expect(mailService.sendNotification).not.toHaveBeenCalled();
  });

  // 顧客要件2026-07 — ACSMS-SCR-029 メールレイアウト（都道府県 + 発行アカウント）。
  describe('notifyNichinoExport', () => {
    const baseParams = {
      session: {
        account_id: 12,
        login_id: 'ja_kanri01',
      } as any,
      todofukenName: '東京都',
      tekiyoDate: '2026-03-01',
      fileName: '増減通知_JAテスト_1301002001_20260301.pdf',
      recordCount: 19,
    };

    it('builds subject with 【都道府県】【ログインID アカウント名】 and notifies roles [1,2]', async () => {
      accountRepo.findOne.mockResolvedValue({ accountName: '管理支店 太郎' });
      accountRepo.find.mockResolvedValue([acc('n@x.jp', '', '', '', 1)]);

      const count = await service.notifyNichinoExport(baseParams);

      expect(count).toBe(1);
      expect(accountRepo.find).toHaveBeenCalledWith({
        where: { roleId: In([1, 2]), deletedAt: IsNull() },
      });
      const [, subject] = mailService.sendNotification.mock.calls[0];
      expect(subject).toBe(
        '【東京都】【ja_kanri01 管理支店 太郎】増減通知（日本農業新聞）を出力しました',
      );
    });

    it('resolves NICHINO_ADMIN/NICHINO_STAFF role_ids from m_roles by role_code instead of a hardcoded id (regression: SERIAL採番依存)', async () => {
      // role_id はハードコードせず role_code から都度解決する — m_roles の
      // 採番順（SERIAL）が環境によってずれても正しいロールに通知できることを保証する。
      accountRepo.findOne.mockResolvedValue({ accountName: '管理支店 太郎' });
      roleRepo.find.mockResolvedValue([{ roleId: 7 }, { roleId: 9 }]);
      accountRepo.find.mockResolvedValue([acc('n@x.jp', '', '', '', 7)]);

      await service.notifyNichinoExport(baseParams);

      expect(roleRepo.find).toHaveBeenCalledWith({
        where: {
          roleCode: In([RoleCode.NICHINO_ADMIN, RoleCode.NICHINO_STAFF]),
          deletedAt: IsNull(),
        },
        select: ['roleId'],
      });
      // 解決された role_id ([7, 9])、ハードコード値 [1, 2] ではないことを検証。
      expect(accountRepo.find).toHaveBeenCalledWith({
        where: { roleId: In([7, 9]), deletedAt: IsNull() },
      });
    });

    it('never throws and sends to 0 recipients when role resolution fails', async () => {
      accountRepo.findOne.mockResolvedValue({ accountName: '管理支店 太郎' });
      roleRepo.find.mockRejectedValue(new Error('db-down'));

      await expect(service.notifyNichinoExport(baseParams)).resolves.toBe(0);
      // role 解決失敗時は空配列で継続する（accountRepo.find(roleId: In([])) は
      // 呼ばれるが該当ゼロ件のため送信は発生しない）。
      expect(accountRepo.find).toHaveBeenCalledWith({
        where: { roleId: In([]), deletedAt: IsNull() },
      });
      expect(mailService.sendNotification).not.toHaveBeenCalled();
    });

    it('includes issuer, 適用日(YYYYMMDD), ファイル名, 件数 and the download line in the body', async () => {
      accountRepo.findOne.mockResolvedValue({ accountName: '管理支店 太郎' });
      accountRepo.find.mockResolvedValue([acc('n@x.jp', '', '', '', 1)]);

      await service.notifyNichinoExport(baseParams);

      const [, subject, body] = mailService.sendNotification.mock.calls[0];
      // 顧客要件2026-07: システム名は本文先頭に、件名には含めない。
      expect(body).toContain('【クラウド版購読者管理システム】');
      expect(subject).not.toContain('【クラウド版購読者管理システム】');
      expect(body).toContain('JA名：ja_kanri01 管理支店 太郎');
      expect(body).toContain('適用日：20260301');
      expect(body).toContain('ファイル名：増減通知_JAテスト_1301002001_20260301.pdf');
      expect(body).toContain('件数：19件');
      expect(body).toContain('ファイル管理画面からダウンロードできます。');
    });

    it('falls back to login_id only (trimmed) when account_name resolves empty', async () => {
      accountRepo.findOne.mockResolvedValue({ accountName: '' });
      accountRepo.find.mockResolvedValue([acc('n@x.jp', '', '', '', 1)]);

      await service.notifyNichinoExport(baseParams);

      const [, subject] = mailService.sendNotification.mock.calls[0];
      expect(subject).toBe(
        '【東京都】【ja_kanri01】増減通知（日本農業新聞）を出力しました',
      );
    });

    it('never throws when account_name lookup fails (issuer = login_id only)', async () => {
      accountRepo.findOne.mockRejectedValue(new Error('db-down'));
      accountRepo.find.mockResolvedValue([acc('n@x.jp', '', '', '', 1)]);

      await expect(service.notifyNichinoExport(baseParams)).resolves.toBe(1);
      const [, subject] = mailService.sendNotification.mock.calls[0];
      expect(subject).toContain('【ja_kanri01】');
    });
  });
});
