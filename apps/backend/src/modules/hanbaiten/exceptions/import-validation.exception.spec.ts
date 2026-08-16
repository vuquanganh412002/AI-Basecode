// Regression (backend review — exception standard): ImportValidationException
// used to extend @nestjs/common's HttpException directly instead of the
// project's DomainException base, which every business exception must
// extend.

import { DomainException } from '@/common/exceptions/domain.exception';
import { ImportValidationException } from './import-validation.exception';

describe('ImportValidationException', () => {
  it('should extend DomainException', () => {
    const exc = new ImportValidationException([
      { row: 2, field: 'hanbaiten_code', message: '必須です。' },
    ]);
    expect(exc).toBeInstanceOf(DomainException);
  });

  it('should carry error_code IMPORT_VALIDATION_ERROR and the row-level errors[] in the response body', () => {
    const exc = new ImportValidationException([
      { row: 2, field: 'hanbaiten_code', message: '必須です。' },
      { row: 3, field: 'itaku_kubun', message: '委託区分の値が不正です。' },
    ]);
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      code: 'IMPORT_VALIDATION_ERROR',
      error_code: 'IMPORT_VALIDATION_ERROR',
      errors: [
        { row: 2, field: 'hanbaiten_code', message: '必須です。' },
        { row: 3, field: 'itaku_kubun', message: '委託区分の値が不正です。' },
      ],
    });
  });

  it('should expose .code as an own instance property', () => {
    const exc = new ImportValidationException([]);
    expect(exc.code).toBe('IMPORT_VALIDATION_ERROR');
  });
});
