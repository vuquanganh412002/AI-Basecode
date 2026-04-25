// @ts-nocheck — TDD red phase (/gen-ut-frontend, source not yet implemented by /gen-code)
// Screen: __SCREEN_ID__ — __SCREEN__
//
// Placeholders:
//   __VIEW__     = Vue component name (e.g. "TankaListView")
//   __VIEW_FILE__ = file basename without .vue (e.g. "TankaListView")
//   __MODULE__   = feature folder (e.g. "tanka")

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import Antd from 'ant-design-vue';
import __VIEW__ from '../__VIEW_FILE__.vue';

// Mock the API layer so no real network requests fire.
vi.mock('@/api/__MODULE__/__MODULE__', () => ({
  // list: vi.fn(),
  // getById: vi.fn(),
  // create: vi.fn(),
  // update: vi.fn(),
  // remove: vi.fn(),
}));

function renderView(props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/__MODULE__', name: '__MODULE__List', component: { template: '<div />' } },
      { path: '/__MODULE__/create', name: '__MODULE__Create', component: { template: '<div />' } },
    ],
  });
  return mount(__VIEW__, {
    props,
    global: {
      plugins: [router, createTestingPinia({ createSpy: vi.fn }), Antd],
      stubs: {},
    },
  });
}

describe('__VIEW__', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // it('should render the page title from breadcrumb when mounted', async () => {
  //   const wrapper = renderView();
  //   await flushPromises();
  //   expect(wrapper.text()).toContain('__SCREEN__');
  // });
  //
  // it('should emit search when 検索 button clicked', async () => {
  //   const wrapper = renderView();
  //   await wrapper.find('[data-test="btn-search"]').trigger('click');
  //   expect(wrapper.emitted('search')).toBeTruthy();
  // });
  //
  // it('should show error toast when API returns BAD_REQUEST', async () => {
  //   // Mock api.list to reject with { error_code: 'BAD_REQUEST' }
  // });
});
