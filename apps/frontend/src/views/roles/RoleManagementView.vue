<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Modal, type TableColumnsType } from 'ant-design-vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseDataTable from '@/components/common/BaseDataTable.vue';
import BaseActionColumn from '@/components/common/BaseActionColumn.vue';
import { useNotify } from '@/composables/useNotify';
import { useAuthStore } from '@/stores/auth.store';
import {
  getRole,
  listRoles,
  updateRole,
  type RoleListItem,
  type UpdateRoleBody,
} from '@/api/roles/roles';
import {
  listPermissions,
  type PermissionListItem,
} from '@/api/permissions/permissions';
import { RoleCode } from '@/constants/enums';

// ─── Access control ─────────────────────────────────────────────────
// api.md §4.2 — ロール管理画面は role.view 権限保有者のみアクセス可。
// seeder.md §2.14 / §3 — role.view は NICHINO_ADMIN のみに付与されている
// ため、結果として NICHINO_ADMIN-only になる。FE は `hasPermission` で
// 判定しても良いが、画面アクセス可否の最後の確認として `RoleCode` 直接
// チェックも残す（ルーターガードは既に permission ベース）。
// 機能定義 1.2 — 権限なしのアカウントの場合 ACSMS-MSG-027-006 を表示。
const authStore = useAuthStore();
const isAdmin = computed(
  () => authStore.user?.role_code === RoleCode.NICHINO_ADMIN,
);
const ACCESS_DENIED_MSG = 'アクセス権がありません。';

// ─── List state (閲覧モード) ─────────────────────────────────────────
const roles = ref<RoleListItem[]>([]);
const permissions = ref<PermissionListItem[]>([]);
const loading = ref(false);

// ─── Edit-form state (編集モード) ────────────────────────────────────
const editingRoleId = ref<number | null>(null);
const isEditMode = computed(() => editingRoleId.value !== null);
const initialFormSnapshot = ref<string>('');
const formState = ref({
  role_code: '',
  role_name: '',
  description: '',
  permission_ids: [] as number[],
});
// [locked-permissions] チェックボックスを disabled にする ID 群 — BE が削除を
// 拒否するシード基盤権限。編集開始時に getRole().data.locked_permission_ids から設定。
const lockedPermissionIds = ref<number[]>([]);
const fieldErrors = ref<{
  role_name?: string;
  description?: string;
}>({});
const submitting = ref(false);

const notify = useNotify();

// 操作列を先頭に配置（OshiraseManagementView 準拠）。この一覧は編集のみ
// （削除なし）のため、ヘッダーは '操作' ではなく '編集' とする。
const columns: TableColumnsType = [
  { title: '編集', key: 'actions', align: 'center', width: 80 },
  { title: 'ロールコード', dataIndex: 'role_code', key: 'role_code', width: 220 },
  { title: 'ロール名', dataIndex: 'role_name', key: 'role_name', width: 200 },
  { title: '説明', dataIndex: 'description', key: 'description' },
];

// ─── Fetch helpers ──────────────────────────────────────────────────
async function fetchRoles(): Promise<void> {
  loading.value = true;
  try {
    const res = await listRoles();
    roles.value = res.data;
  } catch {
    // 想定内・無視 — global axios interceptor が UNAUTHORIZED / FORBIDDEN / 500 を
    // トースト済み。再 throw は onMounted の fire-and-forget で unhandled rejection になる。
    roles.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchPermissions(): Promise<void> {
  try {
    const res = await listPermissions();
    permissions.value = res.data;
  } catch {
    // fetchRoles と同理由 — interceptor が処理済み。
    permissions.value = [];
  }
}

// ─── Mount: load both lists in parallel (NICHINO_ADMIN only) ─────────
onMounted(() => {
  if (!isAdmin.value) return;
  void fetchRoles();
  void fetchPermissions();
});

// BaseDataTable で編集中の行をハイライトする行クラスフック（フォーム上部・
// 一覧下部パターン）。クラスは bg-surface-active（選択行と同じ意味色）に解決される。
function rowClassForEdit(row: Record<string, unknown>): string {
  return (row as unknown as RoleListItem).role_id === editingRoleId.value
    ? 'role-row-active'
    : '';
}

// ─── 編集 row click handler (機能定義 2.1) ────────────────────────────
// getRole 解決前でもフォームが埋まるよう、行の基本項目を即時反映する。
// 一覧 API-027-001 は role_code / role_name / description を持つため、
// permission_ids のみ API-027-002 で個別取得する。
async function onEdit(row: RoleListItem): Promise<void> {
  formState.value = {
    role_code: row.role_code,
    role_name: row.role_name,
    description: row.description ?? '',
    permission_ids: [],
  };
  editingRoleId.value = row.role_id;
  fieldErrors.value = {};
  lockedPermissionIds.value = [];

  try {
    const res = await getRole(row.role_id);
    formState.value.permission_ids = [...res.data.permission_ids].sort(
      (a, b) => a - b,
    );
    lockedPermissionIds.value = [...res.data.locked_permission_ids];
  } catch {
    // 404 / 500 — interceptor toasts; keep the form open with empty perms.
  } finally {
    initialFormSnapshot.value = JSON.stringify(formState.value);
  }
}

// ─── Permission grid (機能定義 4.x) ──────────────────────────────────
function isPermissionChecked(id: number): boolean {
  return formState.value.permission_ids.includes(id);
}

function isPermissionLocked(id: number): boolean {
  return lockedPermissionIds.value.includes(id);
}

function togglePermission(id: number, checked: boolean): void {
  // [locked-guard] BE はロック権限の解除を拒否する。checkbox は :disabled の
  // ため通常発火しないが、プログラム入力に備えて防御。BE の VALIDATION_ERROR
  // と揃え、トグルを黙って無視する。
  if (isPermissionLocked(id)) return;
  if (checked) {
    if (!formState.value.permission_ids.includes(id)) {
      formState.value.permission_ids = [...formState.value.permission_ids, id].sort(
        (a, b) => a - b,
      );
    }
  } else {
    formState.value.permission_ids = formState.value.permission_ids.filter(
      (v) => v !== id,
    );
  }
}

const allSelected = computed(
  () =>
    permissions.value.length > 0 &&
    formState.value.permission_ids.length === permissions.value.length,
);

function toggleSelectAll(checked: boolean): void {
  if (checked) {
    formState.value.permission_ids = permissions.value
      .map((p) => p.permission_id)
      .sort((a, b) => a - b);
  } else {
    // [locked-guard]「全解除」でもロック権限はチェックのまま残す（削除不可）。
    formState.value.permission_ids = [...lockedPermissionIds.value].sort(
      (a, b) => a - b,
    );
  }
}

// ─── Dirty tracking (機能定義 3.x) ───────────────────────────────────
const isDirty = computed(
  () =>
    isEditMode.value &&
    JSON.stringify(formState.value) !== initialFormSnapshot.value,
);

// ─── Client-side validation (機能定義 2.2) ──────────────────────────
const REQUIRED_MSG = '必須項目です。';
const DESC_LENGTH_MSG = '説明は200文字以内で入力してください。';

function validateClient(): boolean {
  const errs: typeof fieldErrors.value = {};
  // role_name: 必須（最大20）。空も20文字超も同じ ACSMS-MSG-027-004
  //「必須項目です。」を表示（顧客承認仕様。超過は長さ超過ではなく必須形式扱い）。
  // `?.trim()` は将来 clearable 化（undefined v-model）で TypeError にならぬよう。
  const name = formState.value.role_name;
  if (!name?.trim() || name.length > 20) {
    errs.role_name = REQUIRED_MSG;
  }
  // description: 任意・最大200。
  if (formState.value.description && formState.value.description.length > 200) {
    errs.description = DESC_LENGTH_MSG;
  }
  fieldErrors.value = errs;
  return Object.keys(errs).length === 0;
}

// ─── 保存 submit (機能定義 2.3) ──────────────────────────────────────
async function onSubmit(): Promise<void> {
  if (!validateClient()) return;
  const roleId = editingRoleId.value;
  if (roleId === null) return;

  submitting.value = true;
  const body: UpdateRoleBody = {
    role_name: formState.value.role_name,
    description: formState.value.description,
    permission_ids: [...formState.value.permission_ids].sort((a, b) => a - b),
  };
  try {
    await updateRole(roleId, body);
    notify.updated();
    // 機能定義 2.3 — ロール一覧を再読込 + 閲覧モードへ変換.
    await fetchRoles();
    resetForm();
  } catch {
    // interceptor が NOT_FOUND / 500 をトースト。編集モードを維持し、
    // 入力を失わず再試行できるようにする。
  } finally {
    submitting.value = false;
  }
}

// ─── クリア button (機能定義 3.x) ────────────────────────────────────
// 機能定義 3.2/3.3 (v1.3) — 「クリア」は未保存の変更のみを破棄し、編集中
// ロールの保存済みの値に戻す。編集モードは維持し、閲覧モードへは戻らない。
function onClear(): void {
  if (!isEditMode.value) return;
  // 変更なし（3.2）: 破棄すべき変更がないため確認モーダルなし。スナップショット
  // へ戻しても表示は変わらないが、念のため復元して編集モードを維持する。
  if (!isDirty.value) {
    restoreSnapshot();
    return;
  }
  // 変更あり（3.3）: 確認のうえ、保存済みの値へ戻す（編集モードは維持）。
  Modal.confirm({
    title: '確認',
    content: '未保存データがあります。クリアしますか。',
    okText: 'はい',
    cancelText: 'いいえ',
    okType: 'primary',
    onOk: () => {
      restoreSnapshot();
    },
  });
}

// 編集開始時に保存したスナップショット（initialFormSnapshot）へ formState を
// 戻す。editingRoleId / initialFormSnapshot / lockedPermissionIds は保持する
// ため、同じロールを編集したまま画面に留まる。
function restoreSnapshot(): void {
  if (initialFormSnapshot.value) {
    formState.value = JSON.parse(initialFormSnapshot.value) as typeof formState.value;
  }
  fieldErrors.value = {};
}

function resetForm(): void {
  formState.value = {
    role_code: '',
    role_name: '',
    description: '',
    permission_ids: [],
  };
  editingRoleId.value = null;
  initialFormSnapshot.value = '';
  fieldErrors.value = {};
}

// description を入力変更時に再検証し、200文字以内に戻した時点で
// help メッセージを消す（再送信を待たない）。
watch(
  () => formState.value.description,
  (v) => {
    if (fieldErrors.value.description && v.length <= 200) {
      fieldErrors.value = { ...fieldErrors.value, description: undefined };
    }
  },
);
watch(
  () => formState.value.role_name,
  (v) => {
    if (fieldErrors.value.role_name && v?.trim() && v.length <= 20) {
      fieldErrors.value = { ...fieldErrors.value, role_name: undefined };
    }
  },
);
</script>

<template>
  <!-- 機能定義 1.2 — 権限なしのアカウントの場合 ACSMS-MSG-027-006. -->
  <BaseCard v-if="!isAdmin" class="max-w-2xl">
    <p class="text-text-main text-sm">{{ ACCESS_DENIED_MSG }}</p>
  </BaseCard>

  <div v-else class="space-y-6">
    <!-- 編集フォーム + 権限設定 (編集モードのみ表示) -->
    <BaseCard v-if="isEditMode" class="space-y-6">
      <a-form layout="vertical" :model="formState" @finish="onSubmit">
        <!-- 基本情報 grid -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-5">
          <a-form-item name="role_code">
            <template #label>
              <span>ロールコード</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.role_code" disabled />
          </a-form-item>

          <a-form-item
            name="role_name"
            :validate-status="fieldErrors.role_name ? 'error' : ''"
            :help="fieldErrors.role_name"
          >
            <template #label>
              <span>ロール名</span>
              <span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.role_name" :maxlength="20" />
          </a-form-item>

          <a-form-item
            name="description"
            :validate-status="fieldErrors.description ? 'error' : ''"
            :help="fieldErrors.description"
          >
            <template #label>
              <span>説明</span>
            </template>
            <a-input v-model:value="formState.description" :maxlength="200" />
          </a-form-item>
        </div>

        <!-- 権限設定 -->
        <div class="border-t border-border pt-4 mt-2">
          <h3 class="text-sm font-bold text-text-main mb-3">権限設定</h3>
          <div class="border border-border rounded-ant overflow-x-auto">
            <div
              class="grid grid-cols-[44px_1fr_1fr_2fr] min-w-[480px] bg-surface-card-subtle border-b border-border"
            >
              <div class="px-2 py-2.5 flex items-center justify-center">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  aria-label="全選択"
                  title="全選択"
                  class="w-4 h-4 accent-primary"
                  @change="
                    toggleSelectAll(($event.target as HTMLInputElement).checked)
                  "
                />
              </div>
              <div
                class="px-3 py-2.5 text-sm font-bold text-text-main"
              >
                コード
              </div>
              <div
                class="px-3 py-2.5 text-sm font-bold text-text-main"
              >
                権限名
              </div>
              <div
                class="px-3 py-2.5 text-sm font-bold text-text-main"
              >
                説明
              </div>
            </div>
            <label
              v-for="perm in permissions"
              :key="perm.permission_id"
              :class="[
                'grid grid-cols-[44px_1fr_1fr_2fr] min-w-[480px] border-b border-border last:border-b-0',
                isPermissionLocked(perm.permission_id)
                  ? 'cursor-not-allowed bg-surface-card-subtle'
                  : 'cursor-pointer hover:bg-surface-hover',
              ]"
              :title="
                isPermissionLocked(perm.permission_id)
                  ? 'システム必須権限のため変更できません'
                  : ''
              "
            >
              <div class="px-2 py-2 flex items-center justify-center">
                <input
                  type="checkbox"
                  :checked="isPermissionChecked(perm.permission_id)"
                  :disabled="isPermissionLocked(perm.permission_id)"
                  class="w-4 h-4 accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                  data-test="permission-checkbox"
                  @change="
                    togglePermission(
                      perm.permission_id,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                />
              </div>
              <div class="px-3 py-2 text-xs text-info font-mono truncate flex items-center">
                {{ perm.permission_code }}
              </div>
              <div class="px-3 py-2 text-sm text-text-main flex items-center">
                {{ perm.permission_name }}
              </div>
              <div class="px-3 py-2 text-sm text-text-main truncate flex items-center">
                {{ perm.description ?? '' }}
              </div>
            </label>
          </div>
        </div>

        <!-- フッターボタン — 主アクションを左（vue.md §Form footer）。 -->
        <div
          class="pt-4 mt-4 border-t border-border flex items-center flex-wrap justify-start gap-2"
        >
          <a-button type="primary" html-type="submit" :loading="submitting">
            保存
          </a-button>
          <a-button :disabled="submitting" @click="onClear">クリア</a-button>
        </div>
      </a-form>
    </BaseCard>

    <!-- ロール一覧 table（常時表示）。ページング props は BaseDataTable の
         必須項目だが、ロールは seeder §3 の5行に固定のため page/perPage は名目値。 -->
    <BaseDataTable
      title="ロール一覧"
      :columns="columns"
      :rows="roles as unknown as Record<string, unknown>[]"
      :loading="loading"
      :page="1"
      :per-page="20"
      :total="roles.length"
      row-key="role_id"
      :row-class-name="rowClassForEdit"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <BaseActionColumn
            :can-delete="false"
            @edit="onEdit(record as RoleListItem)"
          />
        </template>
      </template>
    </BaseDataTable>
  </div>
</template>

<style scoped>
/* 編集中の行をハイライト。Antd は td 背景（hover/zebra）を自前で塗るため、
   セルを直接 --surface-active トークン（選択行と同じ色）で指定する。 */
:deep(.role-row-active > td) {
  background-color: var(--surface-active) !important;
}
</style>
