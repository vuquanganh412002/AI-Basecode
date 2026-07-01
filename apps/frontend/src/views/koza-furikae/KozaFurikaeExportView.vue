<script setup lang="ts">
// 口座振替データ出力画面 (ACSMS-SCR-020)
// 初期表示で JASTEM 委託者情報(m_ja) + 最終使用支店(m_shiten) を読み込み、
// 管理支店/支店/口座支店ドロップダウンを取得する。作成開始 で全銀フォーマット CSV を
// 生成・ダウンロードする。対象0件は BE が 404 (NO_TARGET_DATA) を返すため、wrapper が
// `{ error_code }` に正規化し、ここで MSG-020-002（対象データがありません。）を画面内表示。
// アクセス制御は route guard（meta.permission: 'koza_furikae.export'）が担う。
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import {
  getShitenDropdown,
  getKozaShitenDropdown,
  type KozaShitenDropdownItem,
} from '@/api/shiten/shiten';

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

// 選択した口座支店の JASTEM 金融機関支店情報（全フィールド）。Part B の表に
// 1行ずつ表示する。
const kozaShitenData = ref<KozaShitenDropdownItem[]>([]);
// 選択順に並べた表示用の行（未選択時は空 → 表は空欄）。
const selectedKozaRows = computed(() =>
  formState.koza_shiten_ids
    .map((id) => kozaShitenData.value.find((k) => k.shiten_id === id))
    .filter((k): k is KozaShitenDropdownItem => k != null),
);
// CSV(全銀フォーマット)の受取口座は1件のため、CSV 用の JASTEM 店舗情報は
// 先頭の選択口座支店を採用する。未選択時は空（必須バリデーションで作成不可）。
watch(selectedKozaRows, (rows) => {
  const first = rows[0];
  formState.jastem_toriatsukai_tenpo_code = first?.jastem_toriatsukai_tenpo_code ?? '';
  formState.jastem_tenpo_name = first?.jastem_tenpo_name ?? '';
  formState.jastem_tyokin_shubetsu = first?.jastem_tyokin_shubetsu ?? '1';
  formState.jastem_koza_no = first?.jastem_koza_no ?? '';
});

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
    // Part A（委託者・農協）は m_ja 由来。常に表示する。
    formState.jastem_itakusha_code = d.jastem_itakusha_code ?? '';
    formState.jastem_itakusha_name = d.jastem_itakusha_name ?? '';
    formState.jastem_ja_code = d.jastem_ja_code ?? '';
    formState.jastem_ja_name = d.jastem_ja_name ?? '';
    // Part B（金融機関支店）は選択した口座支店由来のため初期データでは設定しない
    //（未選択時は空 → 表は空欄、CSV 用フィールドも空でバリデーション不可）。
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。初期値のまま継続。
  }
}

async function loadDropdowns(): Promise<void> {
  const jaId = authStore.user?.ja_id ?? 0;
  try {
    const [kanri, shiten, koza] = await Promise.all([
      getKanriShitenDropdown(jaId),
      // 支店絞込は金融機関支店以外（kinyu_shiten_flg=false）のみ。
      // 口座支店ピッカー(kinyu_shiten_flg=true)と相補的に分ける。
      getShitenDropdown({ kinyu_shiten_flg: false }),
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
    kozaShitenData.value = koza.data;
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

      <!--
        顧客要件: JASTEM 情報は readonly 表示のみ（m_ja + 口座支店 m_shiten 由来）。
        値は formState に保持され、作成開始 時に CSV 用にそのまま送信する。
        Part A: 委託者/農協（m_ja）。Part B: 口座支店情報（m_shiten）を表で表示。
      -->
      <!-- Part A: 委託者コード/名・農協番号/名（m_ja） -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">委託者コード</span>
          <div
            class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main"
            data-test="jastem-itakusha-code"
          >
            {{ formState.jastem_itakusha_code || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">委託者名</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_itakusha_name || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">農協番号</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_ja_code || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">農協名</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_ja_name || '—' }}
          </div>
        </div>
      </div>

      <!-- Part B: 口座支店情報（m_shiten）を表で表示 -->
      <div class="mt-5 pt-5 border-t border-border overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-surface-card-subtle">
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">データ送信取扱店舗コード</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">店舗名</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">貯金種目</th>
              <th class="border border-border px-3 py-2 text-right font-medium text-text-main">口座番号</th>
            </tr>
          </thead>
          <tbody>
            <!-- 口座支店 未選択 → 空欄（行なし）。 -->
            <tr v-if="selectedKozaRows.length === 0">
              <td
                colspan="4"
                class="border border-border px-3 py-4 text-center text-text-secondary"
                data-test="koza-empty"
              >
                口座支店を選択してください。
              </td>
            </tr>
            <!-- 選択した口座支店ごとに1行（m_shiten 由来）。 -->
            <tr v-for="row in selectedKozaRows" :key="row.shiten_id">
              <td class="border border-border px-3 py-2 font-medium text-text-main">
                {{ row.jastem_toriatsukai_tenpo_code || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-text-main">
                {{ row.jastem_tenpo_name || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-text-main">
                {{ TYOKIN_SHUBETSU_OPTIONS.find((o) => o.value === row.jastem_tyokin_shubetsu)?.label || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-right text-text-main">
                {{ row.jastem_koza_no || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
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
