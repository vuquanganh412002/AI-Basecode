// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}
import { test, expect } from '@playwright/test';
import { {{PageClass}} } from '../../src/page-objects/{{screen-slug}}.page';
import { loginAs } from '../../src/utils/auth-helpers';

test.describe('{{SCREEN_NAME}} ({{SCREEN_ID}})', () => {
  let pageObject: {{PageClass}};

  test.beforeEach(async ({ page }) => {
    await loginAs(page, { login_id: 'admin01', password: 'TestPassword123' });
    pageObject = new {{PageClass}}(page);
    await pageObject.goto();
  });

  test('should complete the happy path when valid data is submitted', async ({ page }) => {
    // {{FILL_FORM_BLOCK}}
    await pageObject.submit();

    await expect(page.locator('.ant-message-success')).toContainText('正常に');
  });

  test('should show field error when required field {{field}} is empty', async () => {
    await pageObject.submit();
    expect(await pageObject.fieldError('{{field}}')).toMatch(/必須/);
  });

  test('should display API error toast when server returns 500', async ({ page }) => {
    await page.route('**/api/v1/{{domain}}', (route) => route.fulfill({ status: 500, body: '{"error_code":"INTERNAL_SERVER_ERROR","message":"システムエラーが発生しました"}' }));

    // {{FILL_FORM_BLOCK}}
    await pageObject.submit();

    await expect(page.locator('.ant-message-error')).toContainText('システムエラー');
  });

  test('should redirect to /403 when role lacks {{permission}} permission', async ({ page }) => {
    await page.context().clearCookies();
    await loginAs(page, { login_id: 'chuokai01', password: 'TestPassword123' });
    await page.goto('{{path}}');

    await expect(page).toHaveURL(/\/(403|login)/);
  });

  test('should expose accessible labels and ARIA attributes when rendered', async ({ page }) => {
    const submitBtn = page.locator('[data-testid="submit"]');
    const ariaLabel = await submitBtn.getAttribute('aria-label');
    expect(ariaLabel || (await submitBtn.textContent())).toBeTruthy();
  });
});
