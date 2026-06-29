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
  let mailService: any;

  beforeEach(() => {
    accountRepo = { find: jest.fn().mockResolvedValue([]) };
    mailService = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    service = new ReportNotificationService(accountRepo, mailService);
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
});
