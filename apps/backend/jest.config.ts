import type { Config } from 'jest';

/**
 * Jest config for the NestJS backend.
 *
 * Why Jest (not Vitest) on the backend:
 *   - NestJS docs / CLI / examples default to Jest — patterns copy-paste
 *   - ts-jest natively emits `design:paramtypes` decorator metadata, so
 *     `Test.createTestingModule({...}).compile()` works without an
 *     additional swc plugin
 *   - Larger ecosystem of NestJS testing utilities aligned with Jest
 *
 * Frontend (Vue 3) stays on Vitest — it's the native choice for Vite/Vue.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // Resolve `@/...` paths matching tsconfig.json `paths`.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage — same per-module gating policy as the previous Vitest config.
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/database/entities/**',
    '!src/**/dto/**/*.dto.ts',
    '!src/database/migrations/**',
    '!src/database/data-source.ts',
    '!src/**/*.constant.ts',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    // Global defaults are 0 so untested modules don't fail the build before
    // their spec suite is written.
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    // Per-module gates — append a new block per module as its spec suite
    // is completed. Branches capped lower because defense-in-depth paths
    // (SQL DataScope filter + in-memory fallback check) are hard to reach
    // in unit tests; raise once specs cover error/rollback branches.
    'src/modules/ja/**/*.ts': {
      // Jest's istanbul instrument counts ~1-2% stricter than Vitest's V8;
      // calibrated against actual measured coverage with this spec suite.
      statements: 97,
      functions: 98,
      lines: 97,
      branches: 73,
    },
    'src/modules/auth/**/*.ts': {
      // Login + MFA verify/resend + refresh + logout. Branches dominated by
      // OTP guard clauses (expiry / max attempts / cooldown / resend cap);
      // calibrated against actual measured coverage with this spec suite.
      statements: 97,
      functions: 98,
      lines: 97,
      branches: 73,
    },
    'src/modules/oshirase/**/*.ts': {
      statements: 97,
      functions: 98,
      lines: 97,
      branches: 73,
    },
    'src/modules/account/**/*.ts': {
      // Self-service MFA toggle. Tiny module — single endpoint + service
      // method + transaction wrapping. Branches dominated by the
      // not-found path and the audit-log rollback catch.
      statements: 97,
      functions: 98,
      lines: 97,
      branches: 73,
    },
  },

  // Avoid hanging on async leaks (Redis / TypeORM connections in tests).
  forceExit: true,
};

export default config;
