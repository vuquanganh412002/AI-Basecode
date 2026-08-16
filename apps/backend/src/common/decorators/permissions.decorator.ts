import { SetMetadata } from '@nestjs/common';

/**
 * `@Permissions()` が付与する reflect-metadata のキー。`PermissionsGuard` が
 * 同じキーで読み出す — 別々の文字列リテラルに分けると、どちらかの typo が
 * コンパイルエラーにならないまま権限チェックを黙って無効化する
 * （`reflector.get()` が undefined を返し `if (!required) return true`）。
 */
export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
