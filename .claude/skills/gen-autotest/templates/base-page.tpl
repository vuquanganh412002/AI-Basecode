// Playwright base page object — only emit once if missing
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.page.waitForLoadState('networkidle');
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await this.locator('.ant-message').first().waitFor({ state: 'visible' });
  }

  async fillField(name: string, value: string): Promise<void> {
    await this.locator(`[name="${name}"]`).fill(value);
  }

  async clickByTestId(testId: string): Promise<void> {
    await this.locator(`[data-testid="${testId}"]`).click();
  }

  async fieldError(name: string): Promise<string | null> {
    const el = this.locator(`[data-testid="error-${name}"], [name="${name}"] ~ .ant-form-item-explain-error`);
    if (await el.count() === 0) return null;
    return el.first().textContent();
  }
}
