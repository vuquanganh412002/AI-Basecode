// パスワードポリシー: 8〜32文字 かつ 半角英字/数字/記号の3種のうち2種以上。
// ACSMS-SCR-001 パスワードリセット, ACSMS-SCR-025 アカウント作成/更新等で使用。
// FE regex (`apps/frontend/src/views/auth/...`) と一致。
// 非文字列・長さ外・2-of-3 未満は false。message は既定の正規文言、
// `validationOptions.message` で上書き可。
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
