/**
 * API version prefix applied via `app.setGlobalPrefix()` in `main.ts`
 * (and mirrored in the integration test boot `createIntegrationTestApp`).
 *
 * Controllers declare unprefixed paths (`@Controller('auth')`,
 * `@Controller('codes')`, …) — Nest prepends the prefix at routing time.
 * The health probe is also served under the prefix at `GET /api/v1/health`
 * so the AWS ECS / ALB target group health check (path `/api/v1/health`)
 * resolves.
 *
 * Bumping the API version (`v1` → `v2`) only requires editing this file
 * + the FE Orval baseUrl. Everything else flows.
 */
export const API_PREFIX = 'api/v1';
