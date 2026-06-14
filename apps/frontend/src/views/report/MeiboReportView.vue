<script setup lang="ts">
// 購読者名簿出力画面 (ACSMS-SCR-026)
// 出力条件 → レポートプレビュー / Excel出力（販売店別・管理支店別）。
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewMeibo,
  exportMeibo,
  type MeiboReportQuery,
  type MeiboPreviewData,
} from '@/api/report/report';
import { getHanbaitenDropdown } from '@/api/hanbaiten/hanbaiten';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';
import { formatPostalCode, formatDate } from '@/utils/formatters';
import { nowTokyo } from '@/utils/datetime';

interface SelectOption {
  value: number;
  label: string;
}

const authStore = useAuthStore();
const codes = useCodesStore();
const notify = useNotify();

/** report.export_meibo は JAアカウントのみ保持（§1.2）。 */
const canUse = computed(() => authStore.hasPermission('report.export_meibo'));

const formState = reactive<{
  tekiyo_date: string;
  report_type: 'hanbaiten' | 'kanri_shiten';
  hanbaiten_ids: number[];
  kanri_shiten_ids: number[];
  dokusya_shubetsu: number | undefined;
  shiharai_cycle: number | undefined;
}>({
  tekiyo_date: '',
  report_type: 'hanbaiten',
  hanbaiten_ids: [],
  kanri_shiten_ids: [],
  dokusya_shubetsu: undefined,
  shiharai_cycle: undefined,
});

const fieldErrors = reactive<{
  tekiyo_date: string;
  hanbaiten_ids: string;
  kanri_shiten_ids: string;
}>({ tekiyo_date: '', hanbaiten_ids: '', kanri_shiten_ids: '' });

const previewData = ref<MeiboPreviewData | null>(null);
const hasSearched = ref(false);

const hanbaitenOptions = ref<SelectOption[]>([]);
const kanriShitenOptions = ref<SelectOption[]>([]);

// 帳票種別 / 支払区分 は m_code 非対象（固定UI選択肢）。
const reportTypeOptions: { value: 'hanbaiten' | 'kanri_shiten'; label: string }[] = [
  { value: 'hanbaiten', label: '販売店別購読者名簿' },
  { value: 'kanri_shiten', label: '管理支店別購読者名簿' },
];

const cycleOptions: SelectOption[] = [
  { value: 1, label: '毎月' },
  { value: 2, label: '隔月' },
  { value: 3, label: '3ヶ月' },
  { value: 6, label: '半年' },
  { value: 12, label: '年払い' },
];

// 購読種別は m_code DOKUSYA_SHUBETSU。併読(3)は本帳票では除外（画面項目No.5）。
const shubetsuOptions = computed(() =>
  codes.options('DOKUSYA_SHUBETSU').filter((o) => Number(o.value) !== 3),
);

const isEmptyResult = computed(
  () =>
    hasSearched.value &&
    previewData.value !== null &&
    previewData.value.grand_total_busu === 0,
);

// 帳票種別を切り替えたらプレビューをクリア（機能定義 2.2）。
watch(
  () => formState.report_type,
  () => {
    previewData.value = null;
    hasSearched.value = false;
    fieldErrors.hanbaiten_ids = '';
    fieldErrors.kanri_shiten_ids = '';
  },
);

function validate(): boolean {
  fieldErrors.tekiyo_date = '';
  fieldErrors.hanbaiten_ids = '';
  fieldErrors.kanri_shiten_ids = '';

  if (!formState.tekiyo_date?.trim()) {
    fieldErrors.tekiyo_date = '必須項目です。'; // ACSMS-MSG-026-006
  }
  if (formState.report_type === 'hanbaiten' && formState.hanbaiten_ids.length === 0) {
    fieldErrors.hanbaiten_ids = '販売店を1件以上選択してください。'; // 026-002
  }
  if (formState.report_type === 'kanri_shiten' && formState.kanri_shiten_ids.length === 0) {
    fieldErrors.kanri_shiten_ids = '管理支店を1件以上選択してください。'; // 026-003
  }
  return (
    !fieldErrors.tekiyo_date &&
    !fieldErrors.hanbaiten_ids &&
    !fieldErrors.kanri_shiten_ids
  );
}

function buildQuery(): MeiboReportQuery {
  const q: MeiboReportQuery = {
    tekiyo_date: formState.tekiyo_date,
    report_type: formState.report_type,
  };
  if (formState.report_type === 'hanbaiten') {
    q.hanbaiten_ids = formState.hanbaiten_ids;
  } else {
    q.kanri_shiten_ids = formState.kanri_shiten_ids;
  }
  if (formState.dokusya_shubetsu != null) q.dokusya_shubetsu = formState.dokusya_shubetsu;
  // 支払区分（購読料支払サイクル）は両帳票種別で有効。
  if (formState.shiharai_cycle != null) q.shiharai_cycle = formState.shiharai_cycle;
  return q;
}

async function onPreview(): Promise<void> {
  if (!validate()) return;
  try {
    const resp = await previewMeibo(buildQuery());
    previewData.value = resp.data;
    hasSearched.value = true;
  } catch {
    // 集約 axios インターセプタが 403/500 をトースト済み。ローカル状態のみ整理。
    previewData.value = null;
    hasSearched.value = true;
  }
}

async function onExport(): Promise<void> {
  if (!validate()) return;
  try {
    const blob = await exportMeibo(buildQuery());
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const [y, m] = formState.tekiyo_date.split('-');
    link.download = `購読者名簿_${y}年${m}月.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
    notify.downloaded();
  } catch {
    // 対象なし(404)/500 はインターセプタがトースト済み。
  }
}

onMounted(async () => {
  if (!canUse.value) return;
  try {
    const hb = await getHanbaitenDropdown();
    hanbaitenOptions.value = hb.data.map((h) => ({
      value: h.hanbaiten_id,
      label: h.hanbaiten_name,
    }));
  } catch {
    hanbaitenOptions.value = [];
  }
  const jaId = authStore.user?.ja_id;
  if (jaId != null) {
    try {
      const ks = await getKanriShitenDropdown(jaId);
      kanriShitenOptions.value = ks.data.map((k) => ({
        value: k.kanri_shiten_id,
        label: k.kanri_shiten_name,
      }));
    } catch {
      kanriShitenOptions.value = [];
    }
  }
});

// ─── 帳票ヘッダ表示用 ───────────────────────────────────────────────
/** 出力日（JST）— 帳票ヘッダの「出力日」。 */
const outputDate = computed(() => nowTokyo().format('YYYY/MM/DD'));
/** 出力時間（JST）— 帳票ヘッダの「出力時間」。 */
const outputTime = computed(() => nowTokyo().format('HH:mm:ss'));
/** 適用日（YYYY-MM-DD）を「YYYY/MM/DD 現在」表示用にフォーマット。 */
const tekiyoLabel = computed(() =>
  previewData.value ? formatDate(previewData.value.tekiyo_date) : '',
);

/**
 * `haitatsu_address` は `〒{7桁}{住所}` 連結文字列。帳票は郵便番号と住所を
 * 2行で表示するため、〒+7桁を `〒XXX-XXXX` に整形し残りを住所として分離する。
 */
function splitAddress(addr: string): { postal: string; rest: string } {
  const m = /^〒(\d{7})(.*)$/.exec(addr ?? '');
  if (!m) return { postal: '', rest: addr ?? '' };
  return { postal: `〒${formatPostalCode(m[1])}`, rest: m[2] };
}

// ─── 販売店別：選択した複数販売店を1帳票に統合（管理支店でグループ化） ──────
interface MergedKanriGroup {
  kanri_shiten_id: number | null;
  kanri_shiten_name: string;
  subtotal_busu: number;
  rows: import('@/api/report/report').HanbaitenReportRow[];
}
/** 選択した全販売店の購読者を管理支店(支所)単位でまとめる。 */
const mergedKanriGroups = computed<MergedKanriGroup[]>(() => {
  const pd = previewData.value;
  if (!pd || pd.report_type !== 'hanbaiten') return [];
  const map = new Map<string, MergedKanriGroup>();
  for (const hg of pd.hanbaiten_groups) {
    for (const sg of hg.kanri_shiten_groups) {
      const key = sg.kanri_shiten_id == null ? 'none' : String(sg.kanri_shiten_id);
      const ex = map.get(key);
      if (ex) {
        ex.subtotal_busu += sg.subtotal_busu;
        ex.rows.push(...sg.rows);
      } else {
        map.set(key, {
          kanri_shiten_id: sg.kanri_shiten_id,
          kanri_shiten_name: sg.kanri_shiten_name,
          subtotal_busu: sg.subtotal_busu,
          rows: [...sg.rows],
        });
      }
    }
  }
  return [...map.values()];
});
/** 選択販売店名（ヘッダ・合計行表示用）。 */
const selectedHanbaitenNames = computed(() =>
  previewData.value?.hanbaiten_groups.map((g) => g.hanbaiten_name).join('、') ?? '',
);
/** ヘッダの販売店情報は先頭販売店を代表として表示。 */
const headerHanbaiten = computed(() => previewData.value?.hanbaiten_groups[0]);
/** ヘッダの支所（代表 = 先頭の管理支店グループ）。 */
const headerShisho = computed(() => mergedKanriGroups.value[0]?.kanri_shiten_name ?? '');

// ─── 管理支店別：選択した複数管理支店を1帳票に統合 ─────────────────────
/** 選択管理支店名（ヘッダ・合計行表示用）。 */
const selectedKanriShitenNames = computed(() =>
  previewData.value?.kanri_shiten_groups.map((g) => g.kanri_shiten_name || '（未割当）').join('、') ?? '',
);

defineExpose({ formState });
</script>

<template>
  <div class="space-y-6">
    <!-- 権限なし（日農アカウント）→ ACSMS-MSG-026-001 -->
    <a-alert
      v-if="!canUse"
      type="warning"
      show-icon
      message="この機能はJAアカウントのみ使用できます。"
      data-test="no-permission"
    />

    <!-- 出力条件エリア — index.html と同じ 5列1行レイアウト
         （適用日 / 購読種別 / 帳票種別 / 販売店(管理支店) / 支払区分）。 -->
    <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
        <!-- 適用日 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">
            適用日<span class="text-error ml-1">*</span>
          </label>
          <a-date-picker
            v-model:value="formState.tekiyo_date"
            value-format="YYYY-MM-DD"
            format="YYYY/MM/DD"
            placeholder="YYYY/MM/DD"
            class="flex-1"
          />
        </div>

        <!-- 購読種別 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">購読種別</label>
          <a-select
            v-model:value="formState.dokusya_shubetsu"
            :options="shubetsuOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
          />
        </div>

        <!-- 帳票種別 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">帳票種別</label>
          <a-select
            v-model:value="formState.report_type"
            :options="reportTypeOptions"
            class="flex-1"
          />
        </div>

        <!-- 販売店（販売店別のみ） -->
        <div v-if="formState.report_type === 'hanbaiten'" class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">
            販売店<span class="text-error ml-1">*</span>
          </label>
          <a-select
            v-model:value="formState.hanbaiten_ids"
            mode="multiple"
            :options="hanbaitenOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
            data-test="hanbaiten-select"
          />
        </div>

        <!-- 管理支店（管理支店別のみ） -->
        <div v-else class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">
            管理支店<span class="text-error ml-1">*</span>
          </label>
          <a-select
            v-model:value="formState.kanri_shiten_ids"
            mode="multiple"
            :options="kanriShitenOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
            data-test="kanri-shiten-select"
          />
        </div>

        <!-- 支払区分（常時表示。販売店別・管理支店別とも購読料支払サイクルで絞込み可） -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium whitespace-nowrap text-text-main">支払区分</label>
          <a-select
            v-model:value="formState.shiharai_cycle"
            :options="cycleOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
          />
        </div>
      </div>

      <!-- バリデーションメッセージ -->
      <div
        v-if="fieldErrors.tekiyo_date || fieldErrors.hanbaiten_ids || fieldErrors.kanri_shiten_ids"
        class="mt-2 space-y-1"
      >
        <p v-if="fieldErrors.tekiyo_date" class="text-error text-sm">{{ fieldErrors.tekiyo_date }}</p>
        <p v-if="fieldErrors.hanbaiten_ids" class="text-error text-sm">{{ fieldErrors.hanbaiten_ids }}</p>
        <p v-if="fieldErrors.kanri_shiten_ids" class="text-error text-sm">{{ fieldErrors.kanri_shiten_ids }}</p>
      </div>

      <div class="pt-4 mt-3 border-t border-border flex items-center justify-start gap-2">
        <a-button
          type="primary"
          :disabled="!canUse"
          data-test="preview-btn"
          @click="onPreview"
        >
          レポートプレビュー
        </a-button>
        <a-button :disabled="!canUse" data-test="export-btn" @click="onExport">
          レポートデータExcel出力
        </a-button>
      </div>
    </div>

    <!-- プレビューエリア -->
    <p
      v-if="isEmptyResult"
      class="text-text-description text-sm"
      data-test="no-data-message"
    >
      対象のデータが存在しません。
    </p>

    <div
      v-else-if="previewData && previewData.grand_total_busu > 0"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card"
      data-test="preview-area"
    >
      <div class="px-6 py-3 border-b border-border font-medium text-text-main">
        {{ previewData.report_type === 'hanbaiten' ? '販売店別購読者名簿' : '管理支店別購読者名簿' }}
        プレビュー
      </div>

      <div class="p-6 overflow-x-auto">
        <!-- ═══ 販売店別購読者名簿（選択した全販売店を1帳票に統合） ═══ -->
        <template v-if="previewData.report_type === 'hanbaiten'">
          <div
            class="mx-auto border border-border-strong bg-surface-card px-12 py-10 font-display"
            style="max-width: 960px"
          >
            <!-- チェック日 / 確認印 -->
            <div class="flex justify-end mb-2">
              <div class="border border-border-strong flex text-xs">
                <div class="border-r border-border-strong px-4 py-2">チェック日</div>
                <div class="px-4 py-2">確認印</div>
              </div>
            </div>

            <h3 class="text-center text-xl font-bold tracking-widest mb-4">販売店別購読者名簿</h3>

            <!-- 販売店情報 / 組合情報 -->
            <div class="flex justify-between items-start mb-4">
              <div>
                <div class="text-sm mb-1">販売店コード：{{ headerHanbaiten?.hanbaiten_code }}</div>
                <div class="text-base mb-2">{{ selectedHanbaitenNames }} &nbsp;&nbsp;&nbsp; 御中</div>
                <div class="text-xs mb-0.5">TEL：{{ headerHanbaiten?.hanbaiten_tel || '-' }}</div>
                <div class="text-xs mb-3">FAX：{{ headerHanbaiten?.hanbaiten_fax || '-' }}</div>
                <div class="text-xs">{{ tekiyoLabel }} 現在</div>
              </div>
              <div class="text-right space-y-1">
                <div class="flex items-center justify-end gap-8">
                  <span class="text-sm">{{ previewData.ja_name }}</span>
                  <span class="text-xs">TEL：{{ previewData.ja_tel || '-' }}</span>
                </div>
                <div class="flex items-center justify-end gap-8">
                  <span class="text-sm">{{ headerShisho || '（未割当）支所' }}</span>
                  <span class="text-xs">TEL：-</span>
                </div>
                <div class="text-xs pt-1">出力日：{{ outputDate }}</div>
                <div class="text-xs">出力時間：{{ outputTime }}</div>
                <div class="text-xs">ページ数：&nbsp;1/1</div>
              </div>
            </div>

            <!-- データ表（管理支店でグループ化） -->
            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <colgroup>
                <col style="width: 6%" /><col style="width: 18%" /><col style="width: 24%" />
                <col style="width: 12%" /><col style="width: 16%" /><col style="width: 13%" /><col style="width: 11%" />
              </colgroup>
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">チェック欄</th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">配達先氏名<br /><span class="font-normal">配達先氏名かな</span></th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">配達先住所</th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">管理支店</th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">配達先電話番号</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読開始日</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読部数</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="kg in mergedKanriGroups" :key="kg.kanri_shiten_id ?? 'none'">
                  <tr v-for="row in kg.rows" :key="row.dokusya_id">
                    <td class="border border-border-strong px-2 py-3 text-center">
                      <div class="w-5 h-5 border border-border-strong mx-auto"></div>
                    </td>
                    <td class="border border-border-strong px-2 py-1.5">
                      {{ row.shimei }}<br /><span class="text-text-secondary">{{ row.shimei_kana }}</span>
                    </td>
                    <td class="border border-border-strong px-2 py-1.5">
                      {{ splitAddress(row.haitatsu_address).postal }}<br />{{ splitAddress(row.haitatsu_address).rest }}
                    </td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.kanri_shiten_name }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.haitatsu_tel }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ formatDate(row.dokusya_kaishi_date) }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.dokusya_busu }}</td>
                  </tr>
                  <!-- 管理支店 小計 -->
                  <tr class="bg-surface-card-subtle font-semibold">
                    <td class="border border-border-strong px-2 py-1.5" colspan="5"></td>
                    <td class="border border-border-strong px-2 py-1.5 text-right">{{ kg.kanri_shiten_name || '（未割当）' }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ kg.subtotal_busu }}件</td>
                  </tr>
                </template>
                <!-- 全体 合計 -->
                <tr class="bg-surface-card-subtle font-bold">
                  <td class="border border-border-strong px-2 py-1.5" colspan="5"></td>
                  <td class="border border-border-strong px-2 py-1.5 text-right">{{ selectedHanbaitenNames }}</td>
                  <td class="border border-border-strong px-2 py-1.5 text-center">{{ previewData.grand_total_busu }}件</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- ═══ 管理支店別購読者名簿（選択した全管理支店を1帳票に統合） ═══ -->
        <template v-else>
          <div
            class="mx-auto border border-border-strong bg-surface-card px-12 py-10 font-display"
            style="max-width: 1100px"
          >
            <h3 class="text-center text-xl font-bold tracking-widest mb-4">管理支店別購読者名簿</h3>
            <div class="flex justify-between items-start mb-4">
              <div>
                <div class="text-base mb-2">{{ selectedKanriShitenNames }} &nbsp;&nbsp;&nbsp; 御中</div>
                <div class="text-xs">{{ tekiyoLabel }} 現在</div>
              </div>
              <div class="text-right space-y-1">
                <div class="flex items-center justify-end gap-8">
                  <span class="text-sm">{{ previewData.ja_name }}</span>
                  <span class="text-xs">TEL：{{ previewData.ja_tel || '-' }}</span>
                </div>
                <div class="text-xs pt-1">出力日：{{ outputDate }}</div>
                <div class="text-xs">出力時間：{{ outputTime }}</div>
                <div class="text-xs">ページ数：&nbsp;1/1</div>
              </div>
            </div>

            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">管理支店</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">購読種別</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">購読者名<br /><span class="font-normal">購読者かな</span></th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">組合員コード</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">配達先電話番号</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">支店</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">配達先住所</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読部数</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">支払い方法</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読開始日</th>
                  <th class="border border-border-strong px-2 py-1.5 font-semibold">配達担当販売店</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="kg in previewData.kanri_shiten_groups" :key="kg.kanri_shiten_id ?? 'none'">
                  <tr v-for="row in kg.rows" :key="row.dokusya_id">
                    <td class="border border-border-strong px-2 py-1.5">{{ kg.kanri_shiten_name || '（未割当）' }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ codes.label('DOKUSYA_SHUBETSU', row.dokusya_shubetsu) }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.shimei }}<br /><span class="text-text-secondary">{{ row.shimei_kana }}</span></td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.kumiaiin_code }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.haitatsu_tel }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.shiten_name }}</td>
                    <td class="border border-border-strong px-2 py-1.5">
                      {{ splitAddress(row.haitatsu_address).postal }}<br />{{ splitAddress(row.haitatsu_address).rest }}
                    </td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.dokusya_busu }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ codes.label('SHIHARAI_HOHO', row.shiharai_hoho) }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ formatDate(row.dokusya_kaishi_date) }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.hanbaiten_name }}</td>
                  </tr>
                  <!-- 管理支店 小計 -->
                  <tr class="bg-surface-card-subtle font-semibold">
                    <td class="border border-border-strong px-2 py-1.5 text-right" colspan="7">{{ kg.kanri_shiten_name || '（未割当）' }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ kg.subtotal_busu }}件</td>
                    <td class="border border-border-strong px-2 py-1.5" colspan="3"></td>
                  </tr>
                </template>
                <!-- 全体 合計 -->
                <tr class="bg-surface-card-subtle font-bold">
                  <td class="border border-border-strong px-2 py-1.5 text-right" colspan="7">合計</td>
                  <td class="border border-border-strong px-2 py-1.5 text-center">{{ previewData.grand_total_busu }}件</td>
                  <td class="border border-border-strong px-2 py-1.5" colspan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
