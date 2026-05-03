// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import {{Component}} from '../{{Component}}.vue';

describe('{{Component}}', () => {
  let wrapper: VueWrapper;

  const defaultProps = {
    // {{COMPONENT_DEFAULT_PROPS}}
  };

  function build(propsOverride: Record<string, unknown> = {}) {
    return mount({{Component}}, {
      props: { ...defaultProps, ...propsOverride },
      global: {
        stubs: ['a-table', 'a-form', 'a-form-item', 'a-input', 'a-button', 'a-pagination', 'a-modal'],
      },
    });
  }

  beforeEach(() => {
    wrapper = build();
  });

  describe('rendering', () => {
    it('should render the expected root element when mounted with default props', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('should display loading state when prop loading is true', async () => {
      await wrapper.setProps({ loading: true });
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);
    });

    it('should display empty state when no data is provided', async () => {
      await wrapper.setProps({ /* empty data prop */ });
      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit "submit" with form payload when submit button is clicked', async () => {
      // arrange — fill form
      await wrapper.find('[data-testid="submit"]').trigger('click');

      expect(wrapper.emitted('submit')).toBeTruthy();
      expect(wrapper.emitted('submit')![0][0]).toMatchObject({ /* expected payload */ });
    });

    it('should emit "cancel" when cancel button is clicked', async () => {
      await wrapper.find('[data-testid="cancel"]').trigger('click');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show field error when required field {{field}} is empty on submit', async () => {
      await wrapper.find('[name="{{field}}"]').setValue('');
      await wrapper.find('form').trigger('submit.prevent');
      expect(wrapper.find('[data-testid="error-{{field}}"]').exists()).toBe(true);
    });

    it('should disable submit button when form is invalid', async () => {
      await wrapper.find('[name="{{field}}"]').setValue('');
      const btn = wrapper.find('[data-testid="submit"]');
      expect(btn.attributes('disabled')).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should expose aria-label on every icon button', () => {
      wrapper.findAll('button[data-icon-only="true"]').forEach((btn) => {
        expect(btn.attributes('aria-label')).toBeTruthy();
      });
    });

    it('should associate labels with form fields by for/id when form fields exist', () => {
      const labels = wrapper.findAll('label[for]');
      labels.forEach((label) => {
        const id = label.attributes('for');
        expect(wrapper.find(`#${id}`).exists()).toBe(true);
      });
    });
  });
});
