// Page object for {{SCREEN_ID}} — {{SCREEN_NAME}}
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class {{PageClass}} extends BasePage {
  path = '{{path}}';

  constructor(page: Page) {
    super(page);
  }

  // {{FIELD_METHODS_LOOP}} → emit one helper per form field
  async fill{{FieldPascal}}(value: string): Promise<void> {
    await this.fillField('{{field_name}}', value);
  }

  async submit(): Promise<void> {
    await this.clickByTestId('submit');
    await this.page.waitForLoadState('networkidle');
  }

  async cancel(): Promise<void> {
    await this.clickByTestId('cancel');
  }

  async openRowAction(rowIndex: number, action: 'edit' | 'delete'): Promise<void> {
    await this.locator(`tbody tr:nth-child(${rowIndex + 1}) [data-testid="${action}"]`).click();
  }

  async resultCount(): Promise<number> {
    return this.locator('tbody tr').count();
  }
}
