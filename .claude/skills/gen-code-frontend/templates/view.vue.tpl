<!-- Screen: __SCREEN_ID__ — __SCREEN__ -->
<!--
  View for __MODULE__. `<script setup>` only — NO Options API.
  UI primitives: Ant Design Vue (a-table, a-form, a-modal, a-select).
  Layout: Tailwind utility classes only.
-->
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message, type FormInstance } from 'ant-design-vue';
import { useCodesStore } from '@/stores/codes.store';
// TODO: import Pinia store + API client + types from generated client
// import { __STORE__ } from '@/stores/__STORE_FILE__';

const router = useRouter();
const codes = useCodesStore();   // drop if no m_code fields on this screen
// const store = __STORE__();

// ─── Form state (CREATE / UPDATE views) ───────────────────────────────────
const formRef = ref<FormInstance>();
const formState = reactive({
  // TODO: replace with real fields per screen-design.md
  // xxx_code: '',
  // biko: '',
});

const rules = {
  // xxx_code: [{ required: true, message: '必須項目です' }],
};

// ─── List state (LIST views) ──────────────────────────────────────────────
const loading = ref(false);
const rows = ref<any[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const columns = [
  // TODO: columns per screen-design.md table header
  // { title: 'コード', dataIndex: 'xxx_code', key: 'xxx_code' },
  // { title: '備考', dataIndex: 'biko', key: 'biko' },
  // { title: '操作', key: 'action', fixed: 'right', width: 150 },
];

// ─── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchList();
});

// ─── Actions ───────────────────────────────────────────────────────────────
async function fetchList() {
  loading.value = true;
  try {
    // const res = await store.fetchList({
    //   page: pagination.current,
    //   per_page: pagination.pageSize,
    // });
    // rows.value = store.items;
    // pagination.total = store.total;
  } catch {
    message.error('データの取得に失敗しました');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    // await store.create({ ...formState });
    router.back();
  } catch {
    // validation failed — a-form already renders errors
  }
}

function handleTableChange(pag: { current: number; pageSize: number }) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchList();
}

function handleEdit(row: { id: number }) {
  router.push({ name: '__ROUTE_NAME__Edit', params: { id: row.id } });
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-4">__SCREEN__</h1>

    <!-- LIST view template -->
    <section v-if="columns.length > 0">
      <a-table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- Example: render m_code label for a code-category column
          <template v-if="column.key === 'tanka_type'">
            {{ codes.label('TANKA_TYPE', record.tanka_type) }}
          </template>
          -->
          <template v-if="column.key === 'action'">
            <a-button type="link" @click="handleEdit(record)">編集</a-button>
          </template>
        </template>
      </a-table>
    </section>

    <!-- CREATE / UPDATE form template -->
    <section v-else>
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        @finish="handleSubmit"
      >
        <!-- TODO: a-form-item per field from screen-design.md -->
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="loading">
              登録
            </a-button>
            <a-button @click="router.back()">キャンセル</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </section>
  </div>
</template>
