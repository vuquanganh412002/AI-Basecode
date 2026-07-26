/**
 * Default fallback values for OPTIONAL config keys — the single source of
 * truth so the `configuration.ts` factory default and any consumer-side
 * `?? fallback` never drift apart.
 *
 * Consumers fall back to these only when ConfigService can't supply a value
 * (e.g. AuthService injects ConfigService as `@Optional()` for unit tests;
 * MailService reads keys that the factory already defaults). Keeping the
 * literal in ONE place means a change here updates both the factory and the
 * consumer at once.
 */
/** Public base URL of the SPA (Vite dev server origin in local). */
export const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
/** Envelope From address when MAIL_FROM is unset. */
export const DEFAULT_MAIL_FROM = 'noreply@agrinews.jp';
/** Sender display name when MAIL_FROM_NAME is unset. */
export const DEFAULT_MAIL_FROM_NAME = 'AGRINEWS';
/** SMTP host when MAIL_HOST is unset (local Mailhog). */
export const DEFAULT_MAIL_HOST = 'localhost';
/** Session sliding TTL in seconds (24h) when SESSION_TTL_SECONDS is unset. */
export const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;
