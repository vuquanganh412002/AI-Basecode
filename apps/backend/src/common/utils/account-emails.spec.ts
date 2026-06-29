import { collectAccountEmails } from '@/common/utils/account-emails';
import type { Account } from '@/database/entities/account.entity';

/** テスト用に4メールスロットだけ持つ最小アカウント。 */
function acc(
  email: string,
  subEmail1 = '',
  subEmail2 = '',
  subEmail3 = '',
): Pick<Account, 'email' | 'subEmail1' | 'subEmail2' | 'subEmail3'> {
  return { email, subEmail1, subEmail2, subEmail3 };
}

describe('collectAccountEmails', () => {
  it('collects all four email slots from a single account', () => {
    const result = collectAccountEmails([
      acc('a@x.jp', 'b@x.jp', 'c@x.jp', 'd@x.jp'),
    ]);
    expect(result).toEqual(['a@x.jp', 'b@x.jp', 'c@x.jp', 'd@x.jp']);
  });

  it('drops blank and whitespace-only slots', () => {
    const result = collectAccountEmails([acc('a@x.jp', '', '   ', 'd@x.jp')]);
    expect(result).toEqual(['a@x.jp', 'd@x.jp']);
  });

  it('trims surrounding whitespace before deduping', () => {
    const result = collectAccountEmails([acc(' a@x.jp ', 'a@x.jp')]);
    expect(result).toEqual(['a@x.jp']);
  });

  it('union-dedupes across multiple accounts', () => {
    const result = collectAccountEmails([
      acc('a@x.jp', 'shared@x.jp'),
      acc('b@x.jp', 'shared@x.jp'),
    ]);
    expect(result).toEqual(['a@x.jp', 'shared@x.jp', 'b@x.jp']);
  });

  it('returns an empty array when no account has any address', () => {
    expect(collectAccountEmails([acc('', '', '', '')])).toEqual([]);
    expect(collectAccountEmails([])).toEqual([]);
  });
});
