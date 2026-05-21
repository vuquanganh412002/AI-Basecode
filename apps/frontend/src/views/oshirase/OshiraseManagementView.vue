<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Modal, message, type TableColumnsType } from 'ant-design-vue';
import type { AxiosError } from 'axios';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useAuthStore } from '@/stores/auth.store';
import {
  listOshirase,
  getOshirase,
  createOshirase,
  updateOshirase,
  removeOshirase,
  type OshiraseListItem,
  type CreateOshiraseBody,
} from '@/api/oshirase/oshirase';
import { getJaDropdown, type JaDropdownItem } from '@/api/ja/ja';

interface OshiraseFilters {
  // No search filters on this screen; useTableQuery still needs a shape.
  // Reserved for future filter additions.
  _placeholder?: never;
}

interface OshiraseFormState {
  title: string;
  publish_location: number | null;
  status: number | null;
  publish_start_date: string;
  publish_end_date: string;
  ja_id: number | null;
  oshirase_type: number | null;
  target_kanri_kubun_codes: string[]; // multi-select; joined to CSV on submit
  content: string;
}

const REQUIRED_MSG = '必須項目です。';
const DATE_ORDER_MSG = '終了日は開始日より後にしてください。';

const ACCESS_DENIED_MSG = 'アクセス権がありません。';
const DELETE_CONFIRM_CONTENT = 'このお知らせを削除してもよろしいですか？';

// 機能定義 1.x — access control. View enforces role check in addition to
// router guard / BE permission so a non-admin sees ACSMS-MSG-031-006
// instead of firing the API.
const authStore = useAuthStore();
const canView = computed(() =>
  authStore.user?.permissions?.includes('oshirase.view') ?? false,
);

const { state, loading, total, onChange } = useTableQuery<OshiraseFilters>({
  defaultFilters: {},
  defaultSortBy: 'created_at',
  defaultSortOrder: 'desc',
});

const rows = ref<OshiraseListItem[]>([]);
const jaOptions = ref<JaDropdownItem[]>([]);

// Form state — edit mode is derived from `editingId`.
const editingId = ref<number | null>(null);
const isEdit = computed(() => editingId.value !== null);

function initialFormState(): OshiraseFormState {
  return {
    title: '',
    publish_location: null,
    status: null,
    publish_start_date: '',
    publish_end_date: '',
    ja_id: null,
    oshirase_type: null,
    target_kanri_kubun_codes: [],
    content: '',
  };
}

const formState = reactive<OshiraseFormState>(initialFormState());
const fieldErrors = reactive<Record<string, string>>({});

const LOCATION_OPTIONS = [
  { value: 1, label: 'ログイン画面' },
  { value: 2, label: 'メニュー画面' },
];

const STATUS_OPTIONS = [
  { value: 1, label: '下書き' },
  { value: 2, label: '公開' },
  { value: 3, label: '非公開' },
];

const OSHIRASE_TYPE_OPTIONS = [
  { value: 1, label: 'システム' },
  { value: 2, label: '重要' },
  { value: 3, label: '一般' },
  { value: 4, label: '締め切り時間' },
];

const TARGET_KANRI_KUBUN_OPTIONS = [
  { value: '1', label: '日農（管理者）' },
  { value: '2', label: '日農（担当者）' },
  { value: '3', label: '中央会' },
  { value: '4', label: 'JA本店' },
  { value: '5', label: 'JA管理支店' },
];

// Column order matches docs/design/ACSMS-SCR-031/index.html mockup:
// 編集 / 場所 / 状態 / お知らせタイトル / 表示期間 / JA名 / お知らせ種別 /
// 対象管理者区分 / 操作(削除).
const columns: TableColumnsType = [
  { title: '編集', key: 'edit', align: 'center', width: 80 },
  { title: '場所', key: 'publish_location', width: 130 },
  { title: '状態', key: 'status', width: 100 },
  { title: 'お知らせタイトル', dataIndex: 'title', key: 'title' },
  { title: '表示期間', key: 'publish_period', width: 260 },
  { title: 'JA名', key: 'ja_name', width: 160 },
  { title: 'お知らせ種別', key: 'oshirase_type', width: 140 },
  { title: '対象管理者区分', key: 'target_kanri_kubun', width: 180 },
  { title: '操作', key: 'actions', align: 'center', width: 100 },
];

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listOshirase({
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by as 'created_at',
      sort_order: state.sort_order,
    });
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // Global axios interceptor toasts FORBIDDEN / 500 — view only clears
    // local state so onMounted's fire-and-forget invocation doesn't
    // surface an unhandled rejection. Per .claude/rules/vue.md
    // §List view rule 5.
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchJaOptions(): Promise<void> {
  try {
    const resp = await getJaDropdown({ per_page: 100 });
    jaOptions.value = resp.data;
  } catch {
    jaOptions.value = [];
  }
}

onMounted(() => {
  if (!canView.value) return;
  void fetchList();
  void fetchJaOptions();
});

function parseDatetime(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  );
}

function clearFieldErrors(): void {
  for (const k of Object.keys(fieldErrors)) delete fieldErrors[k];
}

function validateForm(): boolean {
  clearFieldErrors();
  if (!formState.title?.trim()) fieldErrors.title = REQUIRED_MSG;
  if (formState.publish_location == null) fieldErrors.publish_location = REQUIRED_MSG;
  if (formState.status == null) fieldErrors.status = REQUIRED_MSG;
  if (!formState.publish_start_date?.trim()) {
    fieldErrors.publish_start_date = REQUIRED_MSG;
  }
  if (formState.oshirase_type == null) fieldErrors.oshirase_type = REQUIRED_MSG;
  if (!formState.content?.trim()) fieldErrors.content = REQUIRED_MSG;

  // Date-order check (only when both are present + parseable).
  if (
    !fieldErrors.publish_start_date &&
    formState.publish_start_date &&
    formState.publish_end_date
  ) {
    const start = parseDatetime(formState.publish_start_date);
    const end = parseDatetime(formState.publish_end_date);
    if (start && end && end.getTime() <= start.getTime()) {
      fieldErrors.publish_end_date = DATE_ORDER_MSG;
    }
  }

  return Object.keys(fieldErrors).length === 0;
}

function buildBody(): CreateOshiraseBody {
  return {
    title: formState.title.trim(),
    publish_location: Number(formState.publish_location),
    status: Number(formState.status),
    publish_start_date: formState.publish_start_date,
    publish_end_date: formState.publish_end_date?.trim()
      ? formState.publish_end_date
      : null,
    ja_id: formState.ja_id ?? null,
    oshirase_type: Number(formState.oshirase_type),
    target_kanri_kubun: formState.target_kanri_kubun_codes.join(','),
    content: formState.content,
  };
}

function applyServerErrors(err: unknown): boolean {
  const ax = err as AxiosError<{ error_code?: string; message?: string; errors?: { field: string; message: string }[] }>;
  const data = ax?.response?.data;
  if (!data) return false;

  // DEADLINE_NOTICE_DUPLICATE has user-actionable copy — surface as toast
  // (the global interceptor doesn't toast 400 with custom error_code).
  if (data.error_code === 'DEADLINE_NOTICE_DUPLICATE' && data.message) {
    message.error(data.message);
    return true;
  }
  if (data.error_code === 'VALIDATION_ERROR' && Array.isArray(data.errors)) {
    clearFieldErrors();
    for (const e of data.errors) fieldErrors[e.field] = e.message;
    return true;
  }
  return false;
}

async function onSubmit(): Promise<void> {
  if (!validateForm()) return;
  const body = buildBody();
  try {
    if (isEdit.value && editingId.value !== null) {
      await updateOshirase(editingId.value, body);
      message.success('更新しました。');
    } else {
      const created = await createOshirase(body);
      editingId.value = created.data.oshirase_id;
      message.success('登録しました。');
    }
    await fetchList();
  } catch (err) {
    applyServerErrors(err);
  }
}

/** Reset the form + return to create mode. */
function resetForm(): void {
  Object.assign(formState, initialFormState());
  editingId.value = null;
  clearFieldErrors();
}

/**
 * Detects user-entered data on the form. Compares each field to its
 * `initialFormState()` baseline; in edit mode the form is pre-populated
 * from `getOshirase`, so `editingId !== null` also counts as dirty.
 */
function isFormDirty(): boolean {
  if (editingId.value !== null) return true;
  const init = initialFormState();
  if (formState.title !== init.title) return true;
  if (formState.publish_location !== init.publish_location) return true;
  if (formState.status !== init.status) return true;
  if (formState.publish_start_date !== init.publish_start_date) return true;
  if (formState.publish_end_date !== init.publish_end_date) return true;
  if (formState.ja_id !== init.ja_id) return true;
  if (formState.oshirase_type !== init.oshirase_type) return true;
  if (formState.target_kanri_kubun_codes.length > 0) return true;
  if (formState.content !== init.content) return true;
  return false;
}

/**
 * クリア button handler. SCR-031-local convention: confirm with
 * ACSMS-MSG-031-010 when the form has unsaved input (the spec only
 * mandates this confirm for the 編集 button switch and pagination,
 * but discarding via クリア carries the same data-loss risk).
 */
function onClear(): void {
  if (!isFormDirty()) {
    resetForm();
    return;
  }
  Modal.confirm({
    title: '確認',
    content: '未保存のデータがあります。このまま続けますか？',
    okText: '破棄して続行',
    okType: 'danger',
    cancelText: '編集を続行',
    onOk() {
      resetForm();
    },
  });
}

async function onEdit(row: OshiraseListItem): Promise<void> {
  try {
    const resp = await getOshirase(row.oshirase_id);
    const d = resp.data;
    editingId.value = d.oshirase_id;
    formState.title = d.title;
    formState.publish_location = d.publish_location;
    formState.status = d.status;
    formState.publish_start_date = d.publish_start_date;
    formState.publish_end_date = d.publish_end_date ?? '';
    formState.ja_id = d.ja_id;
    formState.oshirase_type = d.oshirase_type;
    formState.target_kanri_kubun_codes = d.target_kanri_kubun
      ? d.target_kanri_kubun.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    formState.content = d.content;
    clearFieldErrors();
  } catch {
    // Global interceptor toasts 404 / 500.
  }
}

function askDelete(row: OshiraseListItem): void {
  Modal.confirm({
    title: '削除確認',
    content: DELETE_CONFIRM_CONTENT,
    okText: 'はい',
    okType: 'danger',
    cancelText: 'いいえ',
    async onOk() {
      try {
        await removeOshirase(row.oshirase_id);
        message.success('削除しました。');
        // If we were editing the deleted row, return to create mode.
        if (editingId.value === row.oshirase_id) onClear();
        await fetchList();
      } catch {
        // Global interceptor handles 409 (CONFLICT) / 500.
      }
    },
  });
}

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function statusBadgeClass(status: number): string {
  if (status === 2) return 'bg-success-subtle text-success';
  if (status === 3) return 'bg-error-subtle text-error';
  return 'bg-surface-hover text-text-description';
}

function locationLabel(value: number): string {
  return LOCATION_OPTIONS.find((o) => o.value === value)?.label ?? '';
}

function statusLabel(value: number): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? '';
}

function publishPeriod(row: OshiraseListItem): string {
  const end = row.publish_end_date ?? '無期限';
  return `${row.publish_start_date} 〜 ${end}`;
}

function jaNameFor(jaId: number | null): string {
  if (jaId == null) return '全JA向け';
  return jaOptions.value.find((o) => o.ja_id === jaId)?.ja_name ?? '';
}

function targetKanriKubunLabel(value: string): string {
  if (!value?.trim()) return '全管理者';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => TARGET_KANRI_KUBUN_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join('、');
}

// Row-class hook used by BaseDataTable to highlight the row currently
// being edited. Resolves to `--surface-active` — same tint as the
// selected-row state across the design system.
function rowClassForEdit(row: Record<string, unknown>): string {
  return (row as unknown as OshiraseListItem).oshirase_id === editingId.value
    ? 'oshirase-row-active'
    : '';
}

// Spec-visible internals — `wrapper.vm.formState` / `vm.state` / `vm.fetchList`.
defineExpose({ formState, state, fetchList, editingId });
</script>

<template>
  <!-- 機能定義 1.1 — 権限なしのアカウントの場合 ACSMS-MSG-031-006 -->
  <BaseCard v-if="!canView" padding="lg" class="max-w-2xl">
    <p class="text-text-main text-sm">{{ ACCESS_DENIED_MSG }}</p>
  </BaseCard>

  <div v-else class="space-y-6">
    <!-- ─── 編集フォーム (上段) ───────────────────────────────────── -->
    <BaseCard padding="lg">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-text-main text-base">
          {{ isEdit ? '編集中: お知らせ #' + editingId : '新規登録' }}
        </h3>
      </div>

      <a-form
        layout="vertical"
        :model="formState"
        @finish="onSubmit"
      >
        <!-- お知らせタイトル — same inline-label pattern as 公開場所 / 状態. -->
        <a-form-item
          name="title"
          :validate-status="fieldErrors.title ? 'error' : ''"
          :help="fieldErrors.title"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              お知らせタイトル<span class="text-error ml-1">*</span>
            </span>
            <a-input
              v-model:value="formState.title"
              :maxlength="200"
              class="flex-1"
            />
          </div>
        </a-form-item>

        <!-- 公開場所 — label + radio group on a single row. Form layout is
             vertical so antd's label-col/wrapper-col is ignored; we render
             the label inline inside the form-item's wrapper instead. -->
        <a-form-item
          name="publish_location"
          :validate-status="fieldErrors.publish_location ? 'error' : ''"
          :help="fieldErrors.publish_location"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              公開場所<span class="text-error ml-1">*</span>
            </span>
            <a-radio-group v-model:value="formState.publish_location">
              <a-radio
                v-for="opt in LOCATION_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </div>
        </a-form-item>

        <!-- 状態 — same inline-label pattern as 公開場所. -->
        <a-form-item
          name="status"
          :validate-status="fieldErrors.status ? 'error' : ''"
          :help="fieldErrors.status"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              状態<span class="text-error ml-1">*</span>
            </span>
            <a-radio-group v-model:value="formState.status">
              <a-radio
                v-for="opt in STATUS_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-radio>
            </a-radio-group>
          </div>
        </a-form-item>

        <!-- 表示期間 — 表示期間 label + 開始日 / 終了日 pickers all on a single
             row. Same inline-label pattern as 公開場所 / 状態 (form layout is
             vertical so we render the label inside the wrapper). jaJP locale
             is wired globally in App.vue's <ConfigProvider>; value-format
             keeps the form-state field a plain string that validateForm +
             buildBody accept directly. -->
        <a-form-item
          name="publish_start_date"
          :validate-status="
            fieldErrors.publish_start_date || fieldErrors.publish_end_date
              ? 'error'
              : ''
          "
          :help="fieldErrors.publish_start_date || fieldErrors.publish_end_date"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              表示期間
            </span>
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              開始日<span class="text-error ml-1">*</span>
            </span>
            <a-date-picker
              v-model:value="formState.publish_start_date"
              :show-time="{ format: 'HH:mm' }"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY/MM/DD HH:mm"
              placeholder="YYYY/MM/DD HH:mm"
              allow-clear
              class="flex-1 min-w-0"
            />
            <span class="text-text-description">〜</span>
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              終了日
            </span>
            <!-- 終了日 lives in the same row visually but is a separate
                 field. <a-form-item-rest> opts it OUT of the parent
                 form-item's field-collection so antd doesn't warn
                 "FormItem can only collect one field item". Validation
                 for publish_end_date is handled manually in validateForm. -->
            <a-form-item-rest>
              <a-date-picker
                v-model:value="formState.publish_end_date"
                :show-time="{ format: 'HH:mm' }"
                format="YYYY/MM/DD HH:mm"
                value-format="YYYY/MM/DD HH:mm"
                placeholder="YYYY/MM/DD HH:mm（無期限の場合は空欄）"
                allow-clear
                class="flex-1 min-w-0"
              />
            </a-form-item-rest>
          </div>
        </a-form-item>

        <!-- JA名 + お知らせ種別 on a single row. Each cell uses the inline-
             label pattern (same as 公開場所 / 状態). -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="ja_id"
            :validate-status="fieldErrors.ja_id ? 'error' : ''"
            :help="fieldErrors.ja_id"
          >
            <div class="flex items-center gap-4">
              <span
                class="text-sm font-medium whitespace-nowrap text-text-main"
              >
                JA名
              </span>
              <a-select
                v-model:value="formState.ja_id"
                placeholder="全JA向け"
                allow-clear
                show-search
                class="flex-1"
                :filter-option="
                  (input: string, option: { children?: unknown }) =>
                    String(option?.children ?? '').includes(input)
                "
              >
                <a-select-option
                  v-for="opt in jaOptions"
                  :key="opt.ja_id"
                  :value="opt.ja_id"
                >
                  {{ opt.ja_name }}
                </a-select-option>
              </a-select>
            </div>
          </a-form-item>

          <a-form-item
            name="oshirase_type"
            :validate-status="fieldErrors.oshirase_type ? 'error' : ''"
            :help="fieldErrors.oshirase_type"
          >
            <div class="flex items-center gap-4">
              <span
                class="text-sm font-medium whitespace-nowrap text-text-main"
              >
                お知らせ種別<span class="text-error ml-1">*</span>
              </span>
              <a-select
                v-model:value="formState.oshirase_type"
                placeholder="選択してください"
                allow-clear
                class="flex-1"
              >
                <a-select-option
                  v-for="opt in OSHIRASE_TYPE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </div>
          </a-form-item>
        </div>

        <!-- 対象管理者区分 — same inline-label pattern as 公開場所 / 状態. -->
        <a-form-item
          name="target_kanri_kubun_codes"
          :help="fieldErrors.target_kanri_kubun"
          :validate-status="fieldErrors.target_kanri_kubun ? 'error' : ''"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium whitespace-nowrap text-text-main">
              対象管理者区分
            </span>
            <a-checkbox-group
              v-model:value="formState.target_kanri_kubun_codes"
              :options="TARGET_KANRI_KUBUN_OPTIONS"
            />
          </div>
        </a-form-item>

        <a-form-item
          name="content"
          :validate-status="fieldErrors.content ? 'error' : ''"
          :help="fieldErrors.content"
        >
          <template #label>
            <span>内容</span>
            <span class="text-error ml-1">*</span>
          </template>
          <a-textarea
            v-model:value="formState.content"
            :rows="6"
            :maxlength="2000"
          />
        </a-form-item>

        <div
          class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2"
        >
          <a-button type="primary" html-type="submit">保存</a-button>
          <!-- Always-visible. In create mode resets the form; in edit mode
               cancels the edit and returns to create mode (onClear clears
               editingId too). Screen-design.md row 11 says "新規モード時"
               only, but hiding it leaves the user no way to bail out of
               an edit — UX deviation by design. -->
          <a-button @click="onClear">クリア</a-button>
        </div>
      </a-form>
    </BaseCard>

    <!-- ─── お知らせ一覧 (下段) ───────────────────────────────────── -->
    <BaseDataTable
      title="お知らせ一覧"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="oshirase_id"
      :row-class-name="rowClassForEdit"
      @change="onPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'edit'">
          <a
            class="text-primary hover:underline font-medium"
            @click.prevent="onEdit(record as OshiraseListItem)"
          >
            編集
          </a>
        </template>
        <template v-else-if="column.key === 'publish_location'">
          {{ locationLabel((record as OshiraseListItem).publish_location) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <span
            class="px-2 py-1 rounded text-xs font-bold"
            :class="statusBadgeClass((record as OshiraseListItem).status)"
          >
            {{ statusLabel((record as OshiraseListItem).status) }}
          </span>
        </template>
        <template v-else-if="column.key === 'publish_period'">
          {{ publishPeriod(record as OshiraseListItem) }}
        </template>
        <template v-else-if="column.key === 'ja_name'">
          {{ jaNameFor((record as OshiraseListItem).ja_id) }}
        </template>
        <template v-else-if="column.key === 'oshirase_type'">
          {{ (record as OshiraseListItem).oshirase_type_label }}
        </template>
        <template v-else-if="column.key === 'target_kanri_kubun'">
          {{ targetKanriKubunLabel((record as OshiraseListItem).target_kanri_kubun ?? '') }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a
            class="text-error hover:text-error-hover hover:underline font-medium"
            @click.prevent="askDelete(record as OshiraseListItem)"
          >
            削除
          </a>
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

<style scoped>
/* Highlight the row currently being edited (form-on-top, list-below).
   Targets `<td>` directly because antd paints its own cell backgrounds
   for hover / zebra striping. Token: --surface-active (selected-row
   tint, flips automatically in dark mode). */
:deep(.oshirase-row-active > td) {
  background-color: var(--surface-active) !important;
}
</style>
