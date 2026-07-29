/**
 * Default fallbacks for OPTIONAL config keys — single source of truth so the
 * `configuration.ts` factory default and any consumer-side `?? fallback`
 * never drift.
 *
 * Consumers use these only when ConfigService can't supply a value (e.g.
 * AuthService injects ConfigService as `@Optional()` in unit tests;
 * MailService reads factory-defaulted keys). One place = one change.
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
