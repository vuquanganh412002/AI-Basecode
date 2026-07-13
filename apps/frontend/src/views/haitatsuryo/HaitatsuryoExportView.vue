<script setup lang="ts">
// 配達手数料支払情報出力画面 (ACSMS-SCR-021)
// 出力条件（年月日 + 配達手数料支払サイクル）→ 検索（販売店ごとの集計プレビュー、
// ページネーション対応）+ Excel出力。対象0件は BE が 200 + data:[] を返すため、
// no-data は業務エラーではなく画面内に ACSMS-MSG-021-003 を表示する。アクセス制御は
// route guard（meta.permission: 'haitatsuryo.export'）が担い、view 内に権限ガードはない。
import { computed, reactive, ref } from 'vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useCodesStore } from '@/stores/codes.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewHaitatsuryo,
  exportHaitatsuryo,
  type HaitatsuryoQuery,
  type HaitatsuryoPreviewData,
  type HaitatsuryoRow,
} from '@/api/haitatsuryo/haitatsuryo';
import { formatYen, formatNumber } from '@/utils/formatters';
import { endOfMonthIsoTokyo } from '@/utils/datetime';
import { downloadBlob } from '@/utils/download';

const codes = useCodesStore();
const notify = useNotify();
// 販売店コードはリンクにせずプレーンテキストで表示する（画面遷移なし）。

const formState = reactive<{
  target_month: string;
  haitatsuryo_shiharai_cycle: number | undefined;
}>({
  // 既定値は当月末日（JST）。共通ヘルパ endOfMonthIsoTokyo を使用（SCR-026 と同一）。
  target_month: endOfMonthIsoTokyo(),
  haitatsuryo_shiharai_cycle: undefined,
});

const fieldErrors = reactive<{ target_month: string }>({ target_month: '' });

const previewData = ref<HaitatsuryoPreviewData | null>(null);
/** 対象データなし（200 + data:[]）→ ACSMS-MSG-021-003 を表示。 */
const noDataMessage = ref(false);

/** ページネーション状態（index.html 全N件 / 20頁 に対応、preview のみ）。 */
const page = ref(1);
const perPage = ref(20);

// 全列に width を明示（BaseDataTable の scroll:{x:'max-content'} で横スクロール）。
// 数値列(当月部数/当月金額/手数料)は右寄せ、支払サイクルは中央寄せ。フォーマット・
// ラベル変換が必要な列は #bodyCell で処理する。
const columns: TableColumnsType = [
  { title: '対象月', dataIndex: 'target_month', key: 'target_month', width: 90 },
  { title: '販売店コード', dataIndex: 'hanbaiten_code', key: 'hanbaiten_code', width: 120 },
  { title: '販売店名', dataIndex: 'hanbaiten_name', key: 'hanbaiten_name', width: 180 },
  { title: '当月部数', dataIndex: 'total_busu', key: 'total_busu', align: 'right', width: 100 },
  { title: '当月金額', dataIndex: 'total_kingaku', key: 'total_kingaku', align: 'right', width: 120 },
  { title: '支払サイクル', dataIndex: 'haitatsuryo_shiharai_cycle', key: 'haitatsuryo_shiharai_cycle', align: 'center', width: 110 },
  { title: '金融機関コード', dataIndex: 'bank_code', key: 'bank_code', width: 120 },
  { title: '金融機関名', dataIndex: 'bank_name', key: 'bank_name', width: 140 },
  { title: '口座支店コード', dataIndex: 'bank_branch_code', key: 'bank_branch_code', width: 120 },
  { title: '口座支店名', dataIndex: 'bank_branch_name', key: 'bank_branch_name', width: 140 },
  { title: '貯金種目', dataIndex: 'yokin_shubetsu', key: 'yokin_shubetsu', width: 100 },
  { title: '口座番号', dataIndex: 'koza_no', key: 'koza_no', width: 120 },
  { title: '口座名義', dataIndex: 'koza_meigi', key: 'koza_meigi', width: 160 },
  { title: '手数料', key: 'furikomi_tesuryo_futan_kubun', align: 'center', width: 100 },
  { title: '備考', dataIndex: 'biko', key: 'biko', width: 140 },
];

const rows = computed<HaitatsuryoRow[]>(() => previewData.value?.data ?? []);

/** 配達手数料支払サイクル選択肢（月数 1〜12）。 */
const cycleOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}か月`,
}));

// 出力ボタン活性判定は「全件で1件以上あるか」（meta.total）で見る。
// ページ送りで現在ページの data が空でも、データ自体はあるので活性のまま。
const hasRows = computed(
  () => previewData.value !== null && previewData.value.meta.total > 0,
);

/** 適用税区分ラベル（内税 / 外税）— m_code ZEI_KUBUN。 */
const zeiKubunLabel = computed(() =>
  previewData.value
    ? codes.label('ZEI_KUBUN', previewData.value.meta.zei_kubun)
    : '',
);

function validate(): boolean {
  fieldErrors.target_month = '';
  // ?.trim() — <a-date-picker> の × クリアで undefined になるため。
  if (!formState.target_month?.trim()) {
    fieldErrors.target_month = '必須項目です。'; // ACSMS-MSG-021-001
  }
  return !fieldErrors.target_month;
}

function buildQuery(): HaitatsuryoQuery {
  const q: HaitatsuryoQuery = { target_month: formState.target_month };
  if (formState.haitatsuryo_shiharai_cycle != null) {
    q.haitatsuryo_shiharai_cycle = formState.haitatsuryo_shiharai_cycle;
  }
  return q;
}

/** 現在の page / per_page で集計プレビューを取得する（preview 共通処理）。 */
async function fetchPreview(): Promise<void> {
  noDataMessage.value = false;
  try {
    const resp = await previewHaitatsuryo({
      ...buildQuery(),
      page: page.value,
      per_page: perPage.value,
    });
    previewData.value = resp;
    // 対象0件は 200 + data:[] で返る（業務エラーではない）→ 画面内テキスト。
    // 全件数(meta.total)で判定（ページ送りで data が空でも対象なしではない）。
    if (resp.meta.total === 0) noDataMessage.value = true;
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。ローカル状態のみ整理。
    previewData.value = null;
  }
}

/** 検索ボタン：バリデーション後、1ページ目から再検索する。 */
async function onPreview(): Promise<void> {
  if (!validate()) return;
  page.value = 1;
  await fetchPreview();
}

/** ページ／件数変更（共通）。 */
function onPageChange(nextPage: number, nextPerPage: number): void {
  page.value = nextPage;
  perPage.value = nextPerPage;
  void fetchPreview();
}

/** BaseDataTable の @change(pagination, filters, sorter) アダプタ。 */
function onTableChange(pagination: TablePaginationConfig): void {
  onPageChange(pagination.current ?? 1, pagination.pageSize ?? perPage.value);
}

async function onExport(): Promise<void> {
  if (!validate()) return;
  noDataMessage.value = false;
  try {
    const blob = await exportHaitatsuryo(buildQuery());
    // 対象0件のとき BE は Excel ではなく application/json を返す。その場合は
    // ダウンロードせず画面内テキスト（該当する支払い情報が存在しません。）を表示。
    if (blob.type.includes('application/json')) {
      previewData.value = null;
      noDataMessage.value = true;
      return;
    }
    const [y, m] = formState.target_month.split('-');
    downloadBlob(blob, `配達手数料支払情報出力_${y}年${m}月.xlsx`);
    notify.downloaded();
  } catch {
    // 403/500 はインターセプタがトースト済み。ローカル状態のみ整理。
  }
}

defineExpose({ formState, page, perPage, onPageChange });
</script>

<template>
  <div class="space-y-6">
    <!-- 出力条件エリア（年月日 / 配達手数料支払サイクル） -->
    <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <!-- items-start: 年月日 直下にエラーが出ても配達サイクルが上下にずれない。 -->
      <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
        <!-- 年月日 -->
        <div>
          <div class="flex items-center gap-2">
            <label for="haitatsuryo-target-month" class="text-sm font-medium whitespace-nowrap text-text-main">
              年月日<span class="text-error ml-1">*</span>
            </label>
            <a-date-picker
              id="haitatsuryo-target-month"
              v-model:value="formState.target_month"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              style="width: 180px"
            />
          </div>
          <p v-if="fieldErrors.target_month" class="text-error text-sm mt-1">
            {{ fieldErrors.target_month }}
          </p>
        </div>

        <!-- 配達手数料支払サイクル（任意） -->
        <div class="flex items-center gap-2">
          <label for="haitatsuryo-cycle" class="text-sm font-medium whitespace-nowrap text-text-main">
            配達手数料支払サイクル
          </label>
          <a-select
            id="haitatsuryo-cycle"
            v-model:value="formState.haitatsuryo_shiharai_cycle"
            :options="cycleOptions"
            allow-clear
            placeholder="全サイクル"
            style="width: 140px"
            data-test="cycle-select"
          />
        </div>
      </div>

      <div class="pt-4 mt-3 flex items-center justify-start gap-2">
        <a-button type="primary" data-test="preview-btn" @click="onPreview">
          検索
        </a-button>
        <!-- プレビュー結果が無い間（初期表示・検索結果0件）は Excel出力 を無効化。 -->
        <a-button
          :disabled="!hasRows"
          data-test="export-btn"
          @click="onExport"
        >
          Excel出力
        </a-button>
      </div>
    </div>

    <!-- 対象データなし → ACSMS-MSG-021-003 -->
    <p
      v-if="noDataMessage"
      class="text-text-description text-sm"
      data-test="no-data-message"
    >
      該当する支払い情報が存在しません。
    </p>

    <!-- 支払い情報一覧（プレビュー）— 一覧画面と同じ BaseDataTable を使用。
         ページネーション（bottomLeft / 全N件 / 件数切替）は BaseDataTable 内蔵。
         合計行は #summary（ページ非依存の固定フッタ）で表示する。 -->
    <BaseDataTable
      v-else-if="hasRows"
      data-test="preview-area"
      title="配達手数料支払情報"
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      row-key="hanbaiten_id"
      :page="previewData?.meta.page ?? page"
      :per-page="previewData?.meta.per_page ?? perPage"
      :total="previewData?.meta.total ?? 0"
      @change="onTableChange"
    >
      <template #headerActions>
        <span class="text-sm text-text-description">税区分：{{ zeiKubunLabel }}</span>
      </template>

      <template #bodyCell="{ column, record, text }">
        <template v-if="column.key === 'hanbaiten_code'">
          {{ (record as HaitatsuryoRow).hanbaiten_code }}
        </template>
        <template v-else-if="column.key === 'total_busu'">
          {{ formatNumber((record as HaitatsuryoRow).total_busu) }}
        </template>
        <template v-else-if="column.key === 'total_kingaku'">
          {{ formatYen((record as HaitatsuryoRow).total_kingaku) }}
        </template>
        <template v-else-if="column.key === 'furikomi_tesuryo_futan_kubun'">
          {{
            (record as HaitatsuryoRow).furikomi_tesuryo_futan_kubun == null
              ? ''
              : codes.label(
                  'TESURYO_KUBUN',
                  (record as HaitatsuryoRow).furikomi_tesuryo_futan_kubun as number,
                )
          }}
        </template>
        <template v-else-if="column.key === 'haitatsuryo_shiharai_cycle'">
          {{ (record as HaitatsuryoRow).haitatsuryo_shiharai_cycle ?? '' }}
        </template>
        <template v-else-if="column.key === 'yokin_shubetsu'">
          {{
            (record as HaitatsuryoRow).yokin_shubetsu == null
              ? ''
              : codes.label('YOKIN_SHUBETSU', (record as HaitatsuryoRow).yokin_shubetsu as number)
          }}
        </template>
        <template v-else>{{ text }}</template>
      </template>

      <!-- 合計行（全販売店通算・ページ非依存の固定フッタ） -->
      <template #summary>
        <a-table-summary fixed>
          <a-table-summary-row class="bg-surface-card-subtle font-semibold">
            <a-table-summary-cell :index="0" :col-span="3" align="center">合計</a-table-summary-cell>
            <a-table-summary-cell :index="3" align="right">
              {{ formatNumber(previewData?.meta.grand_total_busu ?? 0) }}
            </a-table-summary-cell>
            <a-table-summary-cell :index="4" align="right">
              {{ formatYen(previewData?.meta.grand_total_kingaku ?? 0) }}
            </a-table-summary-cell>
            <a-table-summary-cell :index="5" :col-span="10" />
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </BaseDataTable>
  </div>
</template>
