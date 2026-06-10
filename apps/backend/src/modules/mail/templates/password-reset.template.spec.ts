// Password-reset mail template — covers the expiryMinutes →
// 「N時間」/「N分」 formatter branches.

import { renderPasswordResetMail } from './password-reset.template';

describe('renderPasswordResetMail', () => {
  const baseInput = {
    accountName: '田中太郎',
    resetUrl: 'https://example.com/reset?token=abc',
    expiryMinutes: 30,
  };

  it('should return the customer-confirmed subject literal', () => {
    const { subject } = renderPasswordResetMail(baseInput);
    expect(subject).toBe(
      '【クラウド版購読者管理システム】パスワードリセット',
    );
  });

  it('should include the account name with "様" honorific on the first line', () => {
    const { text } = renderPasswordResetMail(baseInput);
    expect(text.split('\n')[0]).toBe('田中太郎　様');
  });

  it('should include the reset URL on its own line', () => {
    const { text } = renderPasswordResetMail(baseInput);
    expect(text).toContain('https://example.com/reset?token=abc');
  });

  it('should format expiryMinutes < 60 as "N分"', () => {
    const { text } = renderPasswordResetMail({ ...baseInput, expiryMinutes: 30 });
    expect(text).toContain('有効期限: 30分');
  });

  it('should format expiryMinutes equal to 60 as "1時間"', () => {
    const { text } = renderPasswordResetMail({ ...baseInput, expiryMinutes: 60 });
    expect(text).toContain('有効期限: 1時間');
  });

  it('should format an exact multiple of 60 as "N時間" (e.g. 120 → 2時間)', () => {
    const { text } = renderPasswordResetMail({ ...baseInput, expiryMinutes: 120 });
    expect(text).toContain('有効期限: 2時間');
  });

  it('should format a non-multiple > 60 as "N分" (e.g. 90 → 90分)', () => {
    const { text } = renderPasswordResetMail({ ...baseInput, expiryMinutes: 90 });
    expect(text).toContain('有効期限: 90分');
  });

  it('should include the phishing disclaimer footer', () => {
    const { text } = renderPasswordResetMail(baseInput);
    expect(text).toContain('※このメールに心当たりがない場合は無視してください。');
  });
});
