// Consolidated from the previously duplicated hanbaiten/dokusya module-local
// ImportValidationException / DokusyaImportValidationException specs — both
// asserted identical behavior against an identically-shaped exception.

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

  it('should expose .code as an own instance property (not only response.code)', () => {
    const exc = new ImportValidationException([]);
    expect(exc.code).toBe('IMPORT_VALIDATION_ERROR');
  });

  it('should default the message to ErrorMessage.IMPORT_VALIDATION_ERROR when omitted', () => {
    const exc = new ImportValidationException([]);
    expect((exc.getResponse() as { message: string }).message).toBe(
      'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
    );
  });

  it('should use the caller-supplied message when provided', () => {
    const exc = new ImportValidationException([], 'カスタムメッセージ');
    expect((exc.getResponse() as { message: string }).message).toBe(
      'カスタムメッセージ',
    );
  });
});
