import { Account } from '@/database/entities/account.entity';

/**
 * アカウントごとに登録された最大4つのメールアドレス
 * （`email` 通知先 + `sub_email_1/2/3` サブ）を全件横断で収集し、
 * 空白を除去・重複排除した宛先一覧を返す共通ユーティリティ。
 *
 * - 1つの物理メールボックスが複数スロットに重複していても、Set で
 *   一意化するため送信は1回だけになる。
 * - SCR-023 ファイルアップロード通知 / SCR-029 帳票出力通知の双方で利用する。
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
