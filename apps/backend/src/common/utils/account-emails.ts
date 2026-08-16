import { Account } from '@/database/entities/account.entity';

/**
 * 各アカウントの最大4宛先（`email` + `sub_email_1/2/3`）を横断収集し、
 * 空白除去・重複排除した一覧を返す。Set で一意化するため同一メールは1回のみ。
 * ACSMS-SCR-023 アップロード通知 / ACSMS-SCR-029 帳票出力通知で利用。
 */
export function collectAccountEmails(
  accounts: Array<
    Pick<Account, 'email' | 'subEmail1' | 'subEmail2' | 'subEmail3'>
  >,
): string[] {
  const all = accounts.flatMap((a) => [
    a.email,
    a.subEmail1,
    a.subEmail2,
    a.subEmail3,
  ]);
  return Array.from(
    new Set(
      all
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim())
        .filter((e) => e.length > 0),
    ),
  );
}
