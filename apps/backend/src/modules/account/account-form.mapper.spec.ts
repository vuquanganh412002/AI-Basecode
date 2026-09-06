import { toAccountDetail, type AccountDetailRow } from './account-form.mapper';

function buildRow(overrides: Partial<AccountDetailRow> = {}): AccountDetailRow {
  return {
    account_id: 1,
    login_id: 'admin01',
    account_name: '管理者',
    role_id: 1,
    role_name: 'NICHINO_ADMIN',
    todofuken_code: '13',
    todofuken_name: '東京都',
    ja_id: null,
    ja_name: null,
    kanri_shiten_id: null,
    kanri_shiten_name: null,
    shiten_id: null,
    shiten_name: null,
    email: 'admin01@example.com',
    sub_email_1: '',
    sub_email_2: '',
    sub_email_3: '',
    paper_flg: true,
    denshi_flg: true,
    account_lock_flg: false,
    biko: '',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  };
}

describe('toAccountDetail', () => {
  it('maps a fully-populated row to the response shape', () => {
    const out = toAccountDetail(buildRow({ email: 'a@example.com', biko: '備考' }));
    expect(out.email).toBe('a@example.com');
    expect(out.biko).toBe('備考');
  });

  it('falls back email/sub_email_*/biko to "" when the driver returns null despite the string type (defensive — actual DB row can carry NULL)', () => {
    const row = buildRow({
      email: null as unknown as string,
      sub_email_1: null as unknown as string,
      sub_email_2: null as unknown as string,
      sub_email_3: null as unknown as string,
      biko: null as unknown as string,
    });

    const out = toAccountDetail(row);

    expect(out.email).toBe('');
    expect(out.sub_email_1).toBe('');
    expect(out.sub_email_2).toBe('');
    expect(out.sub_email_3).toBe('');
    expect(out.biko).toBe('');
  });
});
