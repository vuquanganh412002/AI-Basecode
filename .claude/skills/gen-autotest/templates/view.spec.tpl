// @ts-nocheck — TDD red phase (/gen-autotest, source not yet implemented)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import {{View}} from '../{{View}}.vue';
import { use{{Entity}}Store } from '@/stores/{{store}}.store';

describe('{{View}} ({{SCREEN_ID}})', () => {
  let router: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/{{domain}}/new', name: '{{Entity}}Create', component: { template: '<div />' } },
        { path: '/{{domain}}/:id/edit', name: '{{Entity}}Edit', component: { template: '<div />' } },
      ],
    });
  });

  function build() {
    return mount({{View}}, {
      global: {
        plugins: [router],
        stubs: ['router-link', 'router-view', 'a-table', 'a-button', 'a-form', 'a-modal'],
      },
    });
  }

  it('should call store.fetchAll with default pagination when component is mounted', async () => {
    const store = use{{Entity}}Store();
    const spy = vi.spyOn(store, 'fetchAll').mockResolvedValue();

    build();
    await router.isReady();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('should re-fetch with new criteria when search form emits update', async () => {
    const store = use{{Entity}}Store();
    const spy = vi.spyOn(store, 'fetchAll').mockResolvedValue();
    const wrapper = build();
    await router.isReady();
    spy.mockClear();

    await wrapper.findComponent({ name: '{{Entity}}SearchForm' }).vm.$emit('search', { code: 'X' });

    expect(spy).toHaveBeenCalled();
  });

  it('should navigate to {{Entity}}Edit route when list emits edit event', async () => {
    const wrapper = build();
    await router.isReady();
    const push = vi.spyOn(router, 'push');

    await wrapper.findComponent({ name: '{{Entity}}List' }).vm.$emit('edit', { id: 7 });

    expect(push).toHaveBeenCalledWith({ name: '{{Entity}}Edit', params: { id: 7 } });
  });
});
