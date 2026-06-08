/**
 * Global Vitest setup for backend.
 *
 * - Silence Nest's Logger so tests aren't drowned in boot noise.
 * - Default env vars so SessionAuthGuard / ConfigService don't blow up when
 *   a spec forgets to override them.
 */
import { Logger } from '@nestjs/common';

Logger.overrideLogger(false);

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'test-secret-32-bytes-xxxxxxxxxxxx';
process.env.SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? 'session_id';
process.env.SESSION_TTL_SECONDS =
  process.env.SESSION_TTL_SECONDS ?? String(24 * 60 * 60);
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS ?? 'http://localhost';
