<script setup lang="ts">
// 口座振替データ出力画面 (ACSMS-SCR-020)
// 初期表示で JASTEM 委託者情報(m_ja) + 最終使用支店(m_shiten) を読み込み、
// 管理支店/支店/口座支店ドロップダウンを取得する。作成開始 で全銀フォーマット CSV を
// 生成・ダウンロードする。対象0件は BE が 404 (NO_TARGET_DATA) を返すため、wrapper が
// `{ error_code }` に正規化し、ここで MSG-020-002（対象データがありません。）を画面内表示。
// アクセス制御は route guard（meta.permission: 'koza_furikae.export'）が担う。
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import {
  getInitialKozaFurikae,
  exportKozaFurikae,
  type ExportKozaFurikaeBody,
} from '@/api/koza-furikae/koza-furikae';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';
import { getShitenDropdown, getKozaShitenDropdown } from '@/api/shiten/shiten';

const authStore = useAuthStore();
const notify = useNotify();

interface FormState {
  target_month: string | undefined;
  hikiotoshi_date: string | undefined;
  kanri_shiten_ids: number[];
  shiten_ids: number[];
  koza_shiten_ids: number[];
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

const formState = reactive<FormState>({
  target_month: undefined,
  hikiotoshi_date: undefined,
  kanri_shiten_ids: [],
  shiten_ids: [],
  koza_shiten_ids: [],
  jastem_itakusha_code: '',
  jastem_itakusha_name: '',
  jastem_ja_code: '',
  jastem_ja_name: '',
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  jastem_tyokin_shubetsu: '1', // 普通貯金（画面デフォルト）
  jastem_koza_no: '',
});

type FieldKey = Exclude<
  keyof FormState,
  'kanri_shiten_ids' | 'shiten_ids' | 'koza_shiten_ids'
>;
const fieldErrors = reactive<Record<FieldKey, string>>({
  target_month: '',
  hikiotoshi_date: '',
  jastem_itakusha_code: '',
  jastem_itakusha_name: '',
  jastem_ja_code: '',
  jastem_ja_name: '',
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  jastem_tyokin_shubetsu: '',
  jastem_koza_no: '',
});

const submitting = ref(false);

// ── ドロップダウン選択肢 ──
const kanriShitenOptions = ref<Array<{ value: number; label: string }>>([]);
const shitenOptions = ref<Array<{ value: number; label: string }>>([]);
const kozaShitenOptions = ref<Array<{ value: number; label: string }>>([]);

// 貯金種目は JASTEM 固定値（m_code ではない — api.md に m_code 参照記載なし）。
const TYOKIN_SHUBETSU_OPTIONS = [
  { value: '1', label: '普通貯金' },
  { value: '2', label: '当座貯金' },
  { value: '9', label: 'その他' },
];

const REQUIRED_MSG = '必須項目です。'; // ACSMS-MSG-020-004

const FIELD_ORDER: FieldKey[] = [
  'target_month',
  'hikiotoshi_date',
  'jastem_itakusha_code',
  'jastem_itakusha_name',
  'jastem_ja_code',
  'jastem_ja_name',
  'jastem_toriatsukai_tenpo_code',
  'jastem_tenpo_name',
  'jastem_tyokin_shubetsu',
  'jastem_koza_no',
];

onMounted(async () => {
  await Promise.all([loadInitial(), loadDropdowns()]);
});

async function loadInitial(): Promise<void> {
  try {
    const resp = await getInitialKozaFurikae();
    const d = resp.data;
    formState.jastem_itakusha_code = d.jastem_itakusha_code ?? '';
    formState.jastem_itakusha_name = d.jastem_itakusha_name ?? '';
    formState.jastem_ja_code = d.jastem_ja_code ?? '';
    formState.jastem_ja_name = d.jastem_ja_name ?? '';
    formState.jastem_toriatsukai_tenpo_code = d.jastem_toriatsukai_tenpo_code ?? '';
    formState.jastem_tenpo_name = d.jastem_tenpo_name ?? '';
    formState.jastem_tyokin_shubetsu = d.jastem_tyokin_shubetsu || '1';
    formState.jastem_koza_no = d.jastem_koza_no ?? '';
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。初期値のまま継続。
  }
}

async function loadDropdowns(): Promise<void> {
  const jaId = authStore.user?.ja_id ?? 0;
  try {
    const [kanri, shiten, koza] = await Promise.all([
      getKanriShitenDropdown(jaId),
      getShitenDropdown({ kinyu_shiten_flg: undefined }),
      getKozaShitenDropdown(),
    ]);
    kanriShitenOptions.value = kanri.data.map((r) => ({
      value: r.kanri_shiten_id,
      label: r.kanri_shiten_name,
    }));
    shitenOptions.value = shiten.data.map((r) => ({
      value: r.shiten_id,
      label: `${r.shiten_code} - ${r.shiten_name}`,
    }));
    kozaShitenOptions.value = koza.data.map((r) => ({
      value: r.shiten_id,
      label: `${r.shiten_code} - ${r.shiten_name}`,
    }));
  } catch {
    // インターセプタがトースト済み。空のまま継続。
  }
}

function validate(): boolean {
  for (const k of FIELD_ORDER) fieldErrors[k] = '';

  // 必須チェック（クリア可能コントロールは undefined になりうるため ?.trim()）。
  for (const k of FIELD_ORDER) {
    const v = formState[k];
    if (!v?.trim()) fieldErrors[k] = REQUIRED_MSG;
  }

  // 形式チェック（BE DTO のミラー、非空のときのみ）。
  if (!fieldErrors.jastem_itakusha_code && formState.jastem_itakusha_code &&
      !/^[0-9A-Za-z]{1,10}$/.test(formState.jastem_itakusha_code)) {
    fieldErrors.jastem_itakusha_code = '委託者コードは半角英数字10桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_ja_code && formState.jastem_ja_code &&
      !/^\d{1,4}$/.test(formState.jastem_ja_code)) {
    fieldErrors.jastem_ja_code = '農協番号は半角数字4桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_toriatsukai_tenpo_code && formState.jastem_toriatsukai_tenpo_code &&
      !/^\d{1,3}$/.test(formState.jastem_toriatsukai_tenpo_code)) {
    fieldErrors.jastem_toriatsukai_tenpo_code = 'データ送信取扱店舗コードは半角数字3桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_koza_no && formState.jastem_koza_no &&
      !/^\d{1,7}$/.test(formState.jastem_koza_no)) {
    fieldErrors.jastem_koza_no = '口座番号は半角数字7桁以内で入力してください。';
  }

  return FIELD_ORDER.every((k) => !fieldErrors[k]);
}

function buildBody(): ExportKozaFurikaeBody {
  return {
    target_month: formState.target_month as string,
    hikiotoshi_date: formState.hikiotoshi_date as string,
    kanri_shiten_ids: formState.kanri_shiten_ids,
    shiten_ids: formState.shiten_ids,
    koza_shiten_ids: formState.koza_shiten_ids,
    jastem_itakusha_code: formState.jastem_itakusha_code,
    jastem_itakusha_name: formState.jastem_itakusha_name,
    jastem_ja_code: formState.jastem_ja_code,
    jastem_ja_name: formState.jastem_ja_name,
    jastem_toriatsukai_tenpo_code: formState.jastem_toriatsukai_tenpo_code,
    jastem_tenpo_name: formState.jastem_tenpo_name,
    jastem_tyokin_shubetsu: formState.jastem_tyokin_shubetsu,
    jastem_koza_no: formState.jastem_koza_no,
  };
}

async function onCreate(): Promise<void> {
  if (!validate()) return;
  if (submitting.value) return;
  submitting.value = true;
  try {
    const { blob, filename } = await exportKozaFurikae(buildBody());
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // ファイル名はサーバ（ja_code + 引落日）が決めるため Content-Disposition から
    // 受け取る。取得できないときのみ引落日ベースの既定名にフォールバックする。
    const [y, m, d] = (formState.hikiotoshi_date as string).split('-');
    link.download = filename ?? `口座振替データ_${y}年${m}月${d}日.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
    notify.success('口座振替データの作成が完了しました。'); // ACSMS-MSG-020-001
  } catch (err) {
    // 対象0件（NO_TARGET_DATA）は warning トーストで MSG-020-002 を表示。それ以外は
    // 集約インターセプタがトースト済み（MSG-020-003 等）。
    if ((err as { error_code?: string })?.error_code === 'NO_TARGET_DATA') {
      message.warning('対象データがありません。'); // ACSMS-MSG-020-002
    }
  } finally {
    submitting.value = false;
  }
}

defineExpose({ formState });
</script>

<template>
  <a-form
    layout="vertical"
    :model="formState"
    class="space-y-6"
    @keydown="preventEnterImplicitSubmit"
  >
    <!-- ❶ 出力設定（年月日 / 引落日 / 支店絞込） -->
    <section class="bg-surface-card border border-border rounded-ant p-6">
      <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">出力設定</h3>

      <div class="space-y-6">
        <!-- 年月日 / 引落日 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="target_month"
            :validate-status="fieldErrors.target_month ? 'error' : ''"
            :help="fieldErrors.target_month"
          >
            <template #label>
              <span>年月日</span><span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.target_month"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
            />
          </a-form-item>

          <a-form-item
            name="hikiotoshi_date"
            :validate-status="fieldErrors.hikiotoshi_date ? 'error' : ''"
            :help="fieldErrors.hikiotoshi_date"
          >
            <template #label>
              <span>引落日</span><span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.hikiotoshi_date"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- 管理支店 / 支店 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="管理支店" name="kanri_shiten_ids">
            <a-select
              v-model:value="formState.kanri_shiten_ids"
              mode="multiple"
              :options="kanriShitenOptions"
              placeholder="選択してください"
              allow-clear
              class="w-full"
            />
          </a-form-item>

          <a-form-item label="支店" name="shiten_ids">
            <a-select
              v-model:value="formState.shiten_ids"
              mode="multiple"
              :options="shitenOptions"
              placeholder="選択してください"
              allow-clear
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- 口座支店 -->
        <a-form-item label="口座支店" name="koza_shiten_ids">
          <a-select
            v-model:value="formState.koza_shiten_ids"
            mode="multiple"
            :options="kozaShitenOptions"
            placeholder="選択してください"
            allow-clear
            class="w-full"
          />
        </a-form-item>
      </div>
    </section>

    <!-- ❷ JASTEM委託者コード情報 -->
    <section class="bg-surface-card border border-border rounded-ant p-6">
      <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">
        JASTEM委託者コード情報
      </h3>

      <div class="space-y-2">
        <!-- 委託者コード / 委託者名 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            name="jastem_itakusha_code"
            :validate-status="fieldErrors.jastem_itakusha_code ? 'error' : ''"
            :help="fieldErrors.jastem_itakusha_code"
          >
            <template #label>
              <span>委託者コード</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_itakusha_code" maxlength="10" />
          </a-form-item>

          <a-form-item
            name="jastem_itakusha_name"
            :validate-status="fieldErrors.jastem_itakusha_name ? 'error' : ''"
            :help="fieldErrors.jastem_itakusha_name"
          >
            <template #label>
              <span>委託者名</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_itakusha_name" maxlength="40" />
          </a-form-item>
        </div>

        <!-- 農協番号 / 農協名 / データ送信取扱店舗コード -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a-form-item
            name="jastem_ja_code"
            :validate-status="fieldErrors.jastem_ja_code ? 'error' : ''"
            :help="fieldErrors.jastem_ja_code"
          >
            <template #label>
              <span>農協番号</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_ja_code" maxlength="4" />
          </a-form-item>

          <a-form-item
            name="jastem_ja_name"
            :validate-status="fieldErrors.jastem_ja_name ? 'error' : ''"
            :help="fieldErrors.jastem_ja_name"
          >
            <template #label>
              <span>農協名</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_ja_name" maxlength="15" />
          </a-form-item>

          <a-form-item
            name="jastem_toriatsukai_tenpo_code"
            :validate-status="fieldErrors.jastem_toriatsukai_tenpo_code ? 'error' : ''"
            :help="fieldErrors.jastem_toriatsukai_tenpo_code"
          >
            <template #label>
              <span>データ送信取扱店舗コード</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_toriatsukai_tenpo_code" maxlength="3" />
          </a-form-item>
        </div>

        <!-- 貯金種目 / 口座番号 / 店舗名 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a-form-item
            name="jastem_tyokin_shubetsu"
            :validate-status="fieldErrors.jastem_tyokin_shubetsu ? 'error' : ''"
            :help="fieldErrors.jastem_tyokin_shubetsu"
          >
            <template #label>
              <span>貯金種目</span><span class="text-error ml-1">*</span>
            </template>
            <a-select
              v-model:value="formState.jastem_tyokin_shubetsu"
              :options="TYOKIN_SHUBETSU_OPTIONS"
              class="w-full"
            />
          </a-form-item>

          <a-form-item
            name="jastem_koza_no"
            :validate-status="fieldErrors.jastem_koza_no ? 'error' : ''"
            :help="fieldErrors.jastem_koza_no"
          >
            <template #label>
              <span>口座番号</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_koza_no" maxlength="7" />
          </a-form-item>

          <a-form-item
            name="jastem_tenpo_name"
            :validate-status="fieldErrors.jastem_tenpo_name ? 'error' : ''"
            :help="fieldErrors.jastem_tenpo_name"
          >
            <template #label>
              <span>店舗名</span><span class="text-error ml-1">*</span>
            </template>
            <a-input v-model:value="formState.jastem_tenpo_name" maxlength="15" />
          </a-form-item>
        </div>
      </div>
    </section>

    <!-- フッター：作成開始 -->
    <div class="flex items-center justify-start gap-2">
      <a-button
        type="primary"
        :loading="submitting"
        data-test="create-btn"
        @click="onCreate"
      >
        作成開始
      </a-button>
    </div>
  </a-form>
</template>
