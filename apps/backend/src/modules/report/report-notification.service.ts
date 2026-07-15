import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { collectAccountEmails } from '@/common/utils/account-emails';
import { Account } from '@/database/entities/account.entity';
import type { SessionPayload } from '@/modules/auth/session.service';
import { MailService } from '@/modules/mail/mail.service';

/** 増減通知の通知先ロール: NICHINO_ADMIN(1) / NICHINO_STAFF(2)（m_roles SERIAL 順）。 */
const NICHINO_NOTIFY_ROLE_IDS = [1, 2];

/**
 * 帳票出力時に、指定ロールのアカウント宛へ通知メールを自動送信する共通サービス。
 *
 * SCR-029（増減通知）では出力成功後に日農（NICHINO_ADMIN / NICHINO_STAFF）へ
 * 「ファイル管理画面からダウンロードできます」という通知を送る。
 *
 * 設計上の取り扱い（fire-and-forget / non-fatal）:
 * - S3保存・t_file_upload登録・監査ログはメール送信失敗の影響を受けてはならない。
 * - 本メソッドは絶対に throw しない（宛先取得・各送信を try/catch で吸収）。
 *   呼び出し側は await して戻り値（送信を試みた宛先数）を recipient_count に
 *   使ってよいし、`void` で投げっぱなしにしてもよい。
 * - 宛先ごとにループ送信し、ある宛先の失敗はログに残してスキップ、残りは継続する。
 */
@Injectable()
export class ReportNotificationService {
  private readonly logger = new Logger(ReportNotificationService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly mailService: MailService,
  ) {}

  /**
   * 指定ロールの全アカウント（論理削除を除く）に通知メールを送信する。
   *
   * @param roleIds 送信対象ロールID（例: [1, 2] = NICHINO_ADMIN / NICHINO_STAFF）
   * @param mail 件名・本文（本文は HTML、件名は MailService が接頭辞を付与）
   * @returns 送信を試みた宛先数（attempted）。失敗した宛先も含む。
   *          ※「試行数」を返す（成功数ではない）—宛先解決に成功した母数を
   *          recipient_count として返す方が、メール基盤の一時障害で件数が
   *          ブレないため。個別失敗は警告ログで追跡する。
   */
  async notifyRoles(
    roleIds: number[],
    mail: { subject: string; body: string },
  ): Promise<number> {
    let recipients: string[] = [];
    try {
      const accounts = await this.accountRepo.find({
        where: { roleId: In(roleIds), deletedAt: IsNull() },
      });
      recipients = collectAccountEmails(accounts);
    } catch (err) {
      // 宛先取得失敗も non-fatal。警告ログのみ残し、0件として返す。
      this.logger.warn({
        event: 'report.notify.recipients_failed',
        roleIds,
        message: (err as Error).message,
      });
      return 0;
    }

    for (const email of recipients) {
      try {
        await this.mailService.sendNotification(email, mail.subject, mail.body);
      } catch (err) {
        // 宛先単位の失敗はスキップして継続（残りの宛先には送信する）。
        this.logger.warn({
          event: 'report.notify.send_failed',
          email_masked: maskEmail(email),
          message: (err as Error).message,
        });
      }
    }

    this.logger.log({
      event: 'report.notify.completed',
      roleIds,
      recipientCount: recipients.length,
    });
    return recipients.length;
  }

  /**
   * SCR-029 増減通知の出力完了メールを日農担当者（NICHINO_ADMIN/STAFF）へ送信する。
   *
   * 顧客要件2026-07（メールレイアウト）:
   * - 件名: `【{都道府県}】【{ログインID} {アカウント名}】増減通知（日本農業新聞）を出力しました`
   * - 本文: 発行アカウント（ログインID+アカウント名）・適用日・ファイル名・件数を記載。
   *   当社事務担当者が都道府県別に分かれているため、都道府県と出力アカウントを
   *   メール上で特定できるようにする。個人情報（購読者の氏名・住所等）は含めない。
   *
   * account_name は session に無いため m_account を引く（accountRepo）。
   * 都道府県名は呼び出し側が対象データ（管理支店）の都道府県名を渡す。
   */
  async notifyNichinoExport(params: {
    session: SessionPayload;
    todofukenName: string;
    /** 適用日（`YYYY-MM-DD`）。本文には `YYYYMMDD` で表示する。 */
    tekiyoDate: string;
    /** 表示ファイル名（タイムスタンプ無し）。 */
    fileName: string;
    recordCount: number;
  }): Promise<number> {
    const accountName = await this.resolveAccountName(params.session.account_id);
    // 発行アカウント表示: ログインID + アカウント名（運用上 OAコード / OA表示名 に一致）。
    const issuer = `${params.session.login_id} ${accountName}`.trim();
    const ymd = params.tekiyoDate.replaceAll('-', '');
    const subject = `【${params.todofukenName}】【${issuer}】増減通知（日本農業新聞）を出力しました`;
    const body =
      `<p>増減通知（日本農業新聞）を出力しました。</p>` +
      `<p>JA名：${issuer}<br>` +
      `適用日：${ymd}<br>` +
      `ファイル名：${params.fileName}<br>` +
      `件数：${params.recordCount}件</p>` +
      `<p>ファイル管理画面からダウンロードできます。</p>`;
    return this.notifyRoles(NICHINO_NOTIFY_ROLE_IDS, { subject, body });
  }

  /** account_id → account_name（見つからない/削除済みは空文字）。 */
  private async resolveAccountName(accountId: number): Promise<string> {
    try {
      const acc = await this.accountRepo.findOne({
        where: { accountId, deletedAt: IsNull() },
        select: ['accountName'],
      });
      return acc?.accountName ?? '';
    } catch {
      // 宛先解決同様 non-fatal。名前が取れなくてもメール送信は継続する。
      return '';
    }
  }
}

/** ログ用にメールアドレスをマスクする（ローカル部の先頭1文字のみ残す）。 */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  return `${name[0]}***@${domain}`;
}
