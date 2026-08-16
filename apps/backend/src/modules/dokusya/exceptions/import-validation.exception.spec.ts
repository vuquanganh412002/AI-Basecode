// Regression (backend review — exception standard):
// DokusyaImportValidationException used to extend @nestjs/common's
// HttpException directly instead of the project's DomainException base,
// which every business exception must extend.

import { DomainException } from '@/common/exceptions/domain.exception';
import { DokusyaImportValidationException } from './import-validation.exception';

describe('DokusyaImportValidationException', () => {
  it('should extend DomainException', () => {
    const exc = new DokusyaImportValidationException([
      { row: 2, field: 'kanri_shiten_code', message: '管理支店は必須です。' },
    ]);
    expect(exc).toBeInstanceOf(DomainException);
  });

  it('should carry error_code IMPORT_VALIDATION_ERROR and the row-level errors[] in the response body', () => {
    const exc = new DokusyaImportValidationException([
      { row: 2, field: 'kanri_shiten_code', message: '管理支店は必須です。' },
    ]);
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      code: 'IMPORT_VALIDATION_ERROR',
      error_code: 'IMPORT_VALIDATION_ERROR',
      errors: [
        { row: 2, field: 'kanri_shiten_code', message: '管理支店は必須です。' },
      ],
    });
  });

  it('should expose .code as an own instance property (not only response.code)', () => {
    const exc = new DokusyaImportValidationException([]);
    expect(exc.code).toBe('IMPORT_VALIDATION_ERROR');
  });
});
