/**
 * API version prefix applied via `app.setGlobalPrefix()` in `main.ts`
 * (and mirrored in the integration test boot `createIntegrationTestApp`).
 *
 * Controllers declare unprefixed paths (`@Controller('auth')`,
 * `@Controller('codes')`, …) — Nest prepends the prefix at routing time.
 * Health probe is excluded so AWS ECS / ALB target group can hit
 * `GET /health` without versioning.
 *
 * Bumping the API version (`v1` → `v2`) only requires editing this file
 * + the FE Orval baseUrl. Everything else flows.
 */
export const API_PREFIX = 'api/v1';
