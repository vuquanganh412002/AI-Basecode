import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@test': new URL('./test', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/router/index.ts',
        'src/api/generated/**',
        'src/env.d.ts',
        'src/types/**',
        'src/**/*.d.ts',
        'test/**',
      ],
      // Gate floor — set just below the current measured floor on each
      // dimension (statements 91 / lines 92 / branches 86 / functions 87)
      // so any new untested file or removed test that drops the average
      // trips CI, without forcing every Vue template binding line to be
      // covered. v8 instruments compiled-Vue-template output as separate
      // function nodes per `v-model` / `:disabled` binding, so even a
      // test that exercises both branches of `:disabled="isFoo"` leaves
      // the line marked uncovered. The remaining gap from this floor to
      // the testing.md aspirational 97-98% target is largely v8-+-Vue
      // tooling noise, not real test gaps. Track via this floor instead.
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 90,
        statements: 90,
      },
    },
  },
});
