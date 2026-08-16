// Regression (backend review — exception standard): IneligibleDokusyaException
// used to extend @nestjs/common's HttpException directly instead of the
// project's DomainException base, which every business exception must
// extend.

import { DomainException } from '@/common/exceptions/domain.exception';
import { IneligibleDokusyaException } from './ineligible-dokusya.exception';

describe('IneligibleDokusyaException', () => {
  it('should extend DomainException', () => {
    const exc = new IneligibleDokusyaException([
      { dokusya_id: 1, reason: '併読のため対象外です。' },
    ]);
    expect(exc).toBeInstanceOf(DomainException);
  });

  it('should carry error_code INELIGIBLE_DOKUSYA and the dokusya_id/reason errors[] in the response body', () => {
    const exc = new IneligibleDokusyaException([
      { dokusya_id: 1, reason: '併読のため対象外です。' },
    ]);
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      code: 'INELIGIBLE_DOKUSYA',
      error_code: 'INELIGIBLE_DOKUSYA',
      errors: [{ dokusya_id: 1, reason: '併読のため対象外です。' }],
    });
  });

  it('should expose .code as an own instance property', () => {
    const exc = new IneligibleDokusyaException([]);
    expect(exc.code).toBe('INELIGIBLE_DOKUSYA');
  });
});
