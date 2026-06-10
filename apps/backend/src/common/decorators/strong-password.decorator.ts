// Custom class-validator decorator for the project's password policy:
//   - 8〜32 characters
//   - half-width alphabetic / numeric / symbol — at least 2 of the 3
//     character categories present
//
// Used by SCR-001 password reset, SCR-025 account create/update, etc.
// Mirrors the FE regex set in `apps/frontend/src/views/auth/...`.
//
// Reject behaviour: returns false for any value that is not a string,
// whose length is outside [8, 32], or that fails the 2-of-3 check.
// Defaults the validation message to the project's canonical literal —
// callers can override via `validationOptions.message` if a screen
// needs a different wording.
import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

const DEFAULT_MESSAGE =
  'パスワードは8~32文字で、半角英字・数字・記号の3種のうち2種以上を含めて入力してください。';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: { message: DEFAULT_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (value.length < 8 || value.length > 32) return false;
          const hasAlpha = /[A-Za-z]/.test(value);
          const hasDigit = /\d/.test(value);
          const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(value);
          const matched = [hasAlpha, hasDigit, hasSymbol].filter(Boolean).length;
          return matched >= 2;
        },
      },
    });
  };
}
