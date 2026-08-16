// MFA OTP mail template — pure function, no Nest DI / no IO.

import { renderOtpMail } from './otp.template';

describe('renderOtpMail', () => {
  it('should return the customer-confirmed subject literal', () => {
    const { subject } = renderOtpMail({
      accountName: '田中',
      otpCode: '123456',
      otpExpiryMinutes: 5,
    });
    expect(subject).toBe(
      '【クラウド版購読者管理システム】認証コードのお知らせ',
    );
  });

  it('should include the account name with the "様" honorific on the first line', () => {
    const { text } = renderOtpMail({
      accountName: '田中太郎',
      otpCode: '123456',
      otpExpiryMinutes: 5,
    });
    expect(text.split('\n')[0]).toBe('田中太郎　様');
  });

  it('should include the OTP code prefixed by "認証コード: "', () => {
    const { text } = renderOtpMail({
      accountName: '田中',
      otpCode: '987654',
      otpExpiryMinutes: 5,
    });
    expect(text).toContain('認証コード: 987654');
  });

  it('should include the expiry label built from otpExpiryMinutes (regression: was hardcoded "5分")', () => {
    const { text } = renderOtpMail({
      accountName: '田中',
      otpCode: '123456',
      otpExpiryMinutes: 5,
    });
    expect(text).toContain('有効期限: 5分');
  });

  it('should reflect a non-default otpExpiryMinutes in the rendered text', () => {
    const { text } = renderOtpMail({
      accountName: '田中',
      otpCode: '123456',
      otpExpiryMinutes: 10,
    });
    expect(text).toContain('有効期限: 10分');
  });

  it('should include the phishing disclaimer footer', () => {
    const { text } = renderOtpMail({
      accountName: '田中',
      otpCode: '123456',
      otpExpiryMinutes: 5,
    });
    expect(text).toContain('※このメールに心当たりがない場合は無視してください。');
  });
});
