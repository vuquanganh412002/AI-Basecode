import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Effective 98% — excludes cover bootstrap, decorator-only files, and
      // generated migrations where branch coverage is meaningless.
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/entities/**',
        'src/**/dto/**/*.dto.ts',
        'src/database/migrations/**',
        'src/database/data-source.ts',
        'src/**/*.constant.ts',
        'src/**/index.ts',
        'test/**',
      ],
      thresholds: {
        branches: 98,
        functions: 98,
        lines: 98,
        statements: 98,
      },
    },
  },
});
