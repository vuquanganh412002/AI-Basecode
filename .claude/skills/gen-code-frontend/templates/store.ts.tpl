// Screen: __SCREEN_ID__ — __SCREEN__
//
// Pinia Setup Store for __MODULE__. Generate ONLY if the spec
// `src/stores/__tests__/__STORE_FILE__.spec.ts` exists.
//
// Rules:
//   - Composition API style (setup store), NOT Options-style `defineStore({})`
//   - NO session_id / tokens in localStorage — HttpOnly cookie handles auth
//   - API calls via the hand-written wrapper at `@/api/__MODULE__/__MODULE__`

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';

// TODO(/gen-code-frontend): import real API functions from @/api/__MODULE__/__MODULE__
// import { list__ENTITY__, create__ENTITY__, update__ENTITY__, delete__ENTITY__ } from '@/api/__MODULE__/__MODULE__';

export const __STORE__ = defineStore('__MODULE__', () => {
  // ─── State ────────────────────────────────────────────────────────────
  const items = ref<any[]>([]);
  const current = ref<any | null>(null);
  const loading = ref(false);
  const total = ref(0);

  // ─── Getters ──────────────────────────────────────────────────────────
  const isEmpty = computed(() => items.value.length === 0);

  // ─── Actions ──────────────────────────────────────────────────────────
  async function fetchList(query: Record<string, unknown> = {}) {
    loading.value = true;
    try {
      // const res = await list__ENTITY__Api(query);
      // items.value = res.data;
      // total.value = res.meta.total;
    } catch (err) {
      message.error('データの取得に失敗しました');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: number) {
    loading.value = true;
    try {
      // const res = await get__ENTITY__Api(id);
      // current.value = res.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: Record<string, unknown>) {
    loading.value = true;
    try {
      // const res = await create__ENTITY__Api(payload);
      message.success('正常に登録しました');
      // return res.data;
    } catch (err) {
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: number, payload: Record<string, unknown>) {
    loading.value = true;
    try {
      // const res = await update__ENTITY__Api(id, payload);
      message.success('正常に更新しました');
      // return res.data;
    } catch (err) {
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function remove(id: number) {
    loading.value = true;
    try {
      // await delete__ENTITY__Api(id);
      message.success('正常に削除しました');
    } catch (err) {
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    current,
    loading,
    total,
    isEmpty,
    fetchList,
    fetchById,
    create,
    update,
    remove,
  };
});
