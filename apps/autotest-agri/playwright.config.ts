import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '.env.test') });

const BASE_URL = process.env.BASE_URL ?? 'https://nginx';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://nginx/api/v1';

export default defineConfig({
  // All tests live inside apps/autotest-agri/ — never in frontend/backend source
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'api/**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : parseInt(process.env.PLAYWRIGHT_RETRIES ?? '1'),
  workers: process.env.CI ? 1 : 2,
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? '30000'),

  reporter: [
    ['list'],
    // HTML report served at http://localhost:9323 via: npx playwright show-report --host 0.0.0.0 --port 9323
    ['html', { outputFolder: './reports/results/playwright-report', open: 'never' }],
    ['json', { outputFile: './reports/results/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    // UI tests — control Chromium browser against the running frontend
    {
      name: 'ui',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // API tests — HTTP requests against the running backend (no browser)
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: {
        baseURL: API_BASE_URL,
        extraHTTPHeaders: { 'Content-Type': 'application/json' },
      },
    },
  ],

  outputDir: './reports/results/playwright-artifacts',
});
