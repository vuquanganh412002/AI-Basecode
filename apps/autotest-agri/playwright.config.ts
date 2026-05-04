import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : parseInt(process.env.PLAYWRIGHT_RETRIES ?? '1'),
  workers: process.env.CI ? 1 : 2,
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? '30000'),

  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/results/playwright-report', open: 'never' }],
    ['json', { outputFile: './reports/results/e2e-results.json' }],
  ],

  use: {
    // Docker nginx serves the app at https://localhost
    baseURL: process.env.BASE_URL ?? 'https://localhost',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: './reports/results/playwright-artifacts',
});
