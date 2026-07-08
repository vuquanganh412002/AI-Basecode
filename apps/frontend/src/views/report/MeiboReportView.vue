<script setup lang="ts">
// 購読者名簿出力画面 (ACSMS-SCR-026)
// 出力条件 → レポートプレビュー / Excel出力（販売店別・管理支店別）。
import { computed, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewMeibo,
  exportMeibo,
  type MeiboReportQuery,
  type MeiboPreviewData,
} from '@/api/report/report';
import BaseHanbaitenSelect from '@/components/common/BaseHanbaitenSelect.vue';
import BaseKanriShitenSelect from '@/components/common/BaseKanriShitenSelect.vue';
import { formatPostalCode, formatDate } from '@/utils/formatters';
import { nowTokyo } from '@/utils/datetime';
import { meiboRowsPerA4 } from '@/utils/meibo-page';

const authStore = useAuthStore();
const codes = useCodesStore();
const notify = useNotify();

/** report.export_meibo は JAアカウントのみ保持（§1.2）。 */
const canUse = computed(() => authStore.hasPermission('report.export_meibo'));

/** 管理支店プルダウンのスコープ元（NICHINO は ja_id=null → 管理支店別では未対応）。 */
const jaId = computed(() => authStore.user?.ja_id ?? null);

const formState = reactive<{
  tekiyo_date: string;
  report_type: 'hanbaiten' | 'kanri_shiten';
  hanbaiten_ids: number[];
  kanri_shiten_ids: number[];
  dokusya_shubetsu: number | undefined;
  shiharai_hoho: number | undefined;
}>({
  tekiyo_date: '',
  report_type: 'hanbaiten',
  hanbaiten_ids: [],
  kanri_shiten_ids: [],
  dokusya_shubetsu: undefined,
  shiharai_hoho: undefined,
});

const fieldErrors = reactive<{
  tekiyo_date: string;
  hanbaiten_ids: string;
  kanri_shiten_ids: string;
}>({ tekiyo_date: '', hanbaiten_ids: '', kanri_shiten_ids: '' });

const previewData = ref<MeiboPreviewData | null>(null);
const hasSearched = ref(false);

// ─── ページ送り（文書ページ。1ページ=A4 1枚に収まる明細行数を算出）──────
// 帳票種別でヘッダ高が異なるため行数も変わる（meiboRowsPerA4 参照）。
const perPage = computed(() => meiboRowsPerA4(formState.report_type));
const currentPage = ref(1);

// 帳票種別は m_code 非対象（固定UI選択肢）。
const reportTypeOptions: { value: 'hanbaiten' | 'kanri_shiten'; label: string }[] = [
  { value: 'hanbaiten', label: '販売店別購読者名簿' },
  { value: 'kanri_shiten', label: '管理支店別購読者名簿' },
];

// 支払方法は m_code SHIHARAI_HOHO（口座引落 / 現金集金 / 振込集金 / JA施設等 /
// 給与天引き / クレジットカード / その他）。旧「支払区分（支払サイクル固定UI）」から変更。
const shiharaiHohoOptions = computed(() => codes.options('SHIHARAI_HOHO'));

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

/** プレビュー結果に出力対象データがあるか（Excel出力ボタンの活性判定）。 */
const hasReportData = computed(
  () => previewData.value !== null && previewData.value.grand_total_busu > 0,
);

// 帳票種別を切り替えたらプレビューをクリア（機能定義 2.2）。
watch(
  () => formState.report_type,
  () => {
    previewData.value = null;
    hasSearched.value = false;
    currentPage.value = 1;
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

function buildQuery(page?: number): MeiboReportQuery {
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
  // 支払方法（m_code SHIHARAI_HOHO）は両帳票種別で有効。
  if (formState.shiharai_hoho != null) q.shiharai_hoho = formState.shiharai_hoho;
  // 日農ダウンロード許可フラグは画面から選択させない（顧客要件）。FE は送らず、
  // BE 側で未指定→false に既定化する（service: `?? false`）。
  // ページ送り（preview のみ。export では渡さず全件出力）。
  if (page != null) {
    q.page = page;
    q.per_page = perPage.value; // A4 1枚に収まる行数（帳票種別で算出）
  }
  return q;
}

/** 指定ページのプレビューを取得（フィルタ検証済み前提。ページ送りで再利用）。 */
async function fetchPage(page: number): Promise<void> {
  try {
    const resp = await previewMeibo(buildQuery(page));
    previewData.value = resp.data;
    currentPage.value = resp.data.page_no ?? page;
    hasSearched.value = true;
  } catch {
    // 集約 axios インターセプタが 403/500 をトースト済み。ローカル状態のみ整理。
    previewData.value = null;
    hasSearched.value = true;
  }
}

async function onPreview(): Promise<void> {
  if (!validate()) return;
  currentPage.value = 1;
  await fetchPage(1);
}

/** ページャ操作 — 当該ページを取得して再描画（ブラウザは1ページ分のみ保持）。 */
async function onPageChange(page: number): Promise<void> {
  await fetchPage(page);
}

async function onExport(): Promise<void> {
  if (!validate()) return;
  try {
    const blob = await exportMeibo(buildQuery());
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const [y, m] = formState.tekiyo_date.split('-');
    // 帳票種別で接頭辞を切替（hanbaiten=販売店別 / kanri_shiten=管理支店別）。
    // 例: 販売店別購読者名簿_2026年01月.xlsx
    const prefix =
      formState.report_type === 'hanbaiten' ? '販売店別' : '管理支店別';
    link.download = `${prefix}購読者名簿_${y}年${m}月.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
    notify.downloaded();
  } catch {
    // 対象なし(404)/500 はインターセプタがトースト済み。
  }
}

// 販売店・管理支店の選択肢ロードは BaseHanbaitenSelect / BaseKanriShitenSelect が
// 自前で行う（コード/名称検索・50件ずつ無限スクロール）。

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

/** 選択管理支店名（管理支店別ヘッダの「管理支店：」表示用）。 */
const selectedKanriShitenNames = computed(() =>
  previewData.value?.kanri_shiten_groups
    .map((g) => g.kanri_shiten_name || '（未割当）')
    .join('、') ?? '',
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

    <!-- 出力条件エリア — 上段に単一選択フィルタ（適用日 / 購読種別 / 帳票種別 /
         支払区分）、下段に販売店(管理支店)をチェックボックスで複数選択。 -->
    <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <!-- items-start: 適用日 直下にエラーが出ても他フィルタが上下にずれないよう
           上揃えにする（items-center だとエラーで伸びた行に合わせて兄弟が中央寄せ
           されてズレる）。各フィルタ行は flex items-center で入力欄の高さが揃う。 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <!-- 適用日（バリデーションメッセージは直下に表示） -->
        <div>
          <div class="flex items-center gap-2">
            <label for="meibo-tekiyo-date" class="text-sm font-medium whitespace-nowrap text-text-main">
              適用日<span class="text-error ml-1">*</span>
            </label>
            <a-date-picker
              id="meibo-tekiyo-date"
              v-model:value="formState.tekiyo_date"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              class="flex-1"
            />
          </div>
          <p v-if="fieldErrors.tekiyo_date" class="text-error text-sm mt-1">
            {{ fieldErrors.tekiyo_date }}
          </p>
        </div>

        <!-- 購読種別 -->
        <div class="flex items-center gap-2">
          <label for="meibo-shubetsu" class="text-sm font-medium whitespace-nowrap text-text-main">購読種別</label>
          <a-select
            id="meibo-shubetsu"
            v-model:value="formState.dokusya_shubetsu"
            :options="shubetsuOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
          />
        </div>

        <!-- 帳票種別 -->
        <div class="flex items-center gap-2">
          <label for="meibo-report-type" class="text-sm font-medium whitespace-nowrap text-text-main">帳票種別</label>
          <a-select
            id="meibo-report-type"
            v-model:value="formState.report_type"
            :options="reportTypeOptions"
            class="flex-1"
          />
        </div>

        <!-- 支払い方法（常時表示。販売店別・管理支店別とも支払方法で絞込み可。m_code SHIHARAI_HOHO） -->
        <div class="flex items-center gap-2">
          <label for="meibo-shiharai-hoho" class="text-sm font-medium whitespace-nowrap text-text-main">支払い方法</label>
          <a-select
            id="meibo-shiharai-hoho"
            v-model:value="formState.shiharai_hoho"
            :options="shiharaiHohoOptions"
            allow-clear
            placeholder="選択してください"
            class="flex-1"
          />
        </div>
      </div>

      <!-- 販売店（販売店別のみ）— チェックボックスで複数選択。件数が多いため
           複数列に折り返し、高さ上限＋スクロールで間延びを防ぐ。 -->
      <!-- 販売店（販売店別のみ）— マルチセレクトのドロップダウン
           （コード/名称検索、50件ずつ無限スクロール、複数選択可・1件以上必須）。 -->
      <div v-if="formState.report_type === 'hanbaiten'" class="mt-4">
        <div class="text-sm font-medium text-text-main mb-1">
          販売店<span class="text-error ml-1">*</span>
        </div>
        <!-- エラーはラベル直下に表示する -->
        <p v-if="fieldErrors.hanbaiten_ids" class="text-error text-sm mb-2">
          {{ fieldErrors.hanbaiten_ids }}
        </p>
        <BaseHanbaitenSelect
          v-model:value="formState.hanbaiten_ids"
          placeholder="販売店を選択（1件以上）"
          data-test="hanbaiten-select"
        />
      </div>

      <!-- 管理支店（管理支店別のみ）— マルチセレクトのドロップダウン。 -->
      <div v-else class="mt-4">
        <div class="text-sm font-medium text-text-main mb-1">
          管理支店<span class="text-error ml-1">*</span>
        </div>
        <!-- エラーはラベル直下に表示する -->
        <p v-if="fieldErrors.kanri_shiten_ids" class="text-error text-sm mb-2">
          {{ fieldErrors.kanri_shiten_ids }}
        </p>
        <BaseKanriShitenSelect
          v-if="jaId != null"
          v-model:value="formState.kanri_shiten_ids"
          :ja-id="jaId"
          placeholder="管理支店を選択（1件以上）"
          data-test="kanri-shiten-select"
        />
      </div>

      <!-- 日農ダウンロード許可フラグは画面から選択させず常に false（許可しない）で
           出力する（顧客要件）。ラジオは廃止し、export クエリで固定値を送る。 -->

      <div class="pt-4 mt-3 flex items-center justify-start gap-2">
        <a-button
          type="primary"
          :disabled="!canUse"
          data-test="preview-btn"
          @click="onPreview"
        >
          レポートプレビュー
        </a-button>
        <a-button :disabled="!canUse || !hasReportData" data-test="export-btn" @click="onExport">
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
            <!-- チェック日 / 確認印 — 見出し行 + 手書き用の空欄ボックス -->
            <div class="flex justify-end mb-2">
              <div class="border border-border-strong text-xs">
                <!-- 見出し行 -->
                <div class="flex">
                  <div class="w-28 border-r border-b border-border-strong px-4 py-1 text-center">
                    チェック日
                  </div>
                  <div class="w-28 border-b border-border-strong px-4 py-1 text-center">
                    確認印
                  </div>
                </div>
                <!-- 空欄（手書き記入エリア） -->
                <div class="flex">
                  <div class="w-28 h-12 border-r border-border-strong"></div>
                  <div class="w-28 h-12"></div>
                </div>
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
                <div class="text-xs">ページ数：&nbsp;{{ previewData.page_no ?? 1 }}/{{ previewData.total_pages ?? 1 }}</div>
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
                <!-- 販売店ごとにグループ化（販売店 → 管理支店 → 購読者） -->
                <template
                  v-for="hg in previewData.hanbaiten_groups"
                  :key="hg.hanbaiten_id"
                >
                  <!-- 販売店 見出し帯 -->
                  <tr class="bg-surface-active font-bold">
                    <td class="border border-border-strong px-2 py-1.5" colspan="7">
                      {{ hg.hanbaiten_name }}<span v-if="hg.hanbaiten_code">（{{ hg.hanbaiten_code }}）</span><span v-if="hg.is_continued" class="font-normal">（続き）</span>
                    </td>
                  </tr>
                  <template
                    v-for="kg in hg.kanri_shiten_groups"
                    :key="kg.kanri_shiten_id ?? 'none'"
                  >
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
                  </template>
                  <!-- 販売店 小計 — グループがこのページで終わるときのみ表示。 -->
                  <tr v-if="hg.show_total !== false" class="bg-surface-card-subtle font-bold">
                    <td class="border border-border-strong px-2 py-1.5 text-right whitespace-nowrap" colspan="6">小計</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ hg.total_busu }}件</td>
                  </tr>
                </template>
                <!-- 合計 — 複数販売店のとき、最終ページにのみ表示。 -->
                <tr
                  v-if="previewData.is_last_page !== false && (previewData.group_count ?? previewData.hanbaiten_groups.length) > 1"
                  class="bg-surface-active font-bold"
                >
                  <td class="border border-border-strong px-2 py-1.5 text-right whitespace-nowrap" colspan="6">合計</td>
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
            <h3 class="text-center text-xl font-bold tracking-widest mb-1">管理支店別購読者名簿</h3>
            <div class="flex justify-end mb-2">
              <div class="text-right space-y-0.5">
                <div class="flex items-center justify-end gap-8">
                  <span class="text-sm">{{ previewData.ja_name }}</span>
                  <span class="text-xs">TEL：{{ previewData.ja_tel || '-' }}</span>
                </div>
                <div class="text-xs">出力日：{{ outputDate }}</div>
                <div class="text-xs">出力時間：{{ outputTime }}</div>
              </div>
            </div>
            <!-- 管理支店：名（左） / 適用日 現在（中央） / ページ数（右） -->
            <div class="flex justify-between items-start mb-4 text-sm">
              <div><span class="font-semibold">管理支店：</span><span class="font-bold">{{ selectedKanriShitenNames }}</span></div>
              <div class="font-bold">{{ tekiyoLabel }} 現在</div>
              <div class="text-xs">ページ数：&nbsp;{{ previewData.page_no ?? 1 }}/{{ previewData.total_pages ?? 1 }}</div>
            </div>

            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <colgroup>
                <col style="width: 16%" /><col style="width: 13%" /><col style="width: 20%" />
                <col style="width: 8%" /><col style="width: 10%" /><col style="width: 10%" /><col style="width: 23%" />
              </colgroup>
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">配達先氏名<br /><span class="font-normal">配達先氏名かな</span></th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">組合員コード<br /><span class="font-normal">配達先電話番号</span></th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">支店<br /><span class="font-normal">配達先住所</span></th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読部数</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">購読種別</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-semibold">支払方法</th>
                  <th class="border border-border-strong px-2 py-1.5 text-left font-semibold">購読開始日<br /><span class="font-normal">配達担当販売店</span></th>
                </tr>
              </thead>
              <tbody>
                <!-- 管理支店ごとにグループ化 -->
                <template v-for="kg in previewData.kanri_shiten_groups" :key="kg.kanri_shiten_id ?? 'none'">
                  <tr v-for="row in kg.rows" :key="row.dokusya_id">
                    <td class="border border-border-strong px-2 py-1.5">{{ row.shimei }}<br /><span class="text-text-secondary">{{ row.shimei_kana }}</span></td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.kumiaiin_code || '-' }}<br /><span class="text-text-secondary">{{ row.haitatsu_tel }}</span></td>
                    <td class="border border-border-strong px-2 py-1.5">{{ row.shiten_name }}<br /><span class="text-text-secondary">{{ splitAddress(row.haitatsu_address).postal }} {{ splitAddress(row.haitatsu_address).rest }}</span></td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.dokusya_busu }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ codes.label('DOKUSYA_SHUBETSU', row.dokusya_shubetsu) }}</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ codes.label('SHIHARAI_HOHO', row.shiharai_hoho) }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ formatDate(row.dokusya_kaishi_date) }}<br /><span class="text-text-secondary">{{ row.hanbaiten_name }}</span></td>
                  </tr>
                  <!-- 管理支店 小計 — グループがこのページで終わるときのみ表示。 -->
                  <tr v-if="kg.show_subtotal !== false" class="bg-surface-card-subtle font-bold">
                    <td class="border border-border-strong px-2 py-1.5 text-right whitespace-nowrap" colspan="6">小計</td>
                    <td class="border border-border-strong px-2 py-1.5 text-center">{{ kg.subtotal_busu }}件</td>
                  </tr>
                </template>
                <!-- 合計 — 複数管理支店のとき、最終ページにのみ表示。 -->
                <tr
                  v-if="previewData.is_last_page !== false && (previewData.group_count ?? previewData.kanri_shiten_groups.length) > 1"
                  class="bg-surface-active font-bold"
                >
                  <td class="border border-border-strong px-2 py-1.5 text-right whitespace-nowrap" colspan="6">合計</td>
                  <td class="border border-border-strong px-2 py-1.5 text-center">{{ previewData.grand_total_busu }}件</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- ページャ — 文書ページ送り。ブラウザは1ページ分の明細のみ描画する。 -->
      <div
        v-if="(previewData.total_pages ?? 1) > 1"
        class="px-6 py-3 border-t border-border flex items-center justify-between"
        data-test="meibo-pager"
      >
        <span class="text-text-description text-sm">
          全{{ previewData.total_rows ?? 0 }}件・{{ previewData.page_no ?? 1 }}/{{ previewData.total_pages ?? 1 }}ページ
        </span>
        <a-pagination
          :current="currentPage"
          :total="previewData.total_rows ?? 0"
          :page-size="previewData.per_page ?? perPage"
          :show-size-changer="false"
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>
