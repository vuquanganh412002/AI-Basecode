import type { CookieOptions } from 'express';

/**
 * 全 cookie が継承すべき基本強化フラグ: `HttpOnly` + `Secure` +
 * `SameSite=Strict` + `Path=/`。
 *
 * `secure` を OFF にするのは `local`（`http://localhost`）のみ — `Secure` cookie は
 * 平文 HTTP で送られずログインが壊れるため。dev/stg/prod は全て HTTPS。今後の
 * cookie は必ずこのヘルパーから構築し、文書化された理由があるものだけ上書きすること
 * （例: JS 読取可能 cookie → `{ ...baseCookieOptions(env), httpOnly: false }`）。
 *
 * @param nodeEnv - 正規化済み `nodeEnv`（`local`/`development`/`staging`/`production`）。
 */
export function baseCookieOptions(nodeEnv: string): CookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnv !== 'local',
    sameSite: 'strict',
    path: '/',
  };
}
