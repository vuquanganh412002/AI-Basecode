import type { CookieOptions } from 'express';

/**
 * Base hardening flags every application cookie MUST inherit:
 * `HttpOnly` + `Secure` + `SameSite=Strict` + `Path=/`.
 *
 * `secure` is ON for every HTTPS environment (dev / staging / prod) and
 * OFF only on `local` (`http://localhost`), where a `Secure` cookie would
 * never be sent back over plain HTTP and would break login. The project
 * runs dev/stg/prod all over HTTPS, so the single carve-out is
 * `nodeEnv === 'local'`.
 *
 * Any future cookie (CSRF token, etc.) MUST build its options from this
 * helper so it inherits the same flags. Override only what genuinely
 * needs to differ for a documented business reason — e.g. a cookie the
 * frontend has to read with `document.cookie` would pass
 * `{ ...baseCookieOptions(env), httpOnly: false }`.
 *
 * @param nodeEnv - normalized `nodeEnv` config value (`local` / `development`
 *                  / `staging` / `production`).
 */
export function baseCookieOptions(nodeEnv: string): CookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnv !== 'local',
    sameSite: 'strict',
    path: '/',
  };
}
