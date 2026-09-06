<script setup lang="ts">
// 購読者名簿出力画面 (ACSMS-SCR-026)
// 出力条件 → レポートプレビュー / Excel出力（販売店別・管理支店別）。
import { computed, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useCodesStore } from '@/stores/codes.store';
import { useNotify } from '@/composables/useNotify';
import { DokusyaShubetsu } from '@/constants/enums';
import {
  previewMeibo,
  exportMeibo,
  type MeiboReportQuery,
  type MeiboPreviewData,
} from '@/api/report/report';
import BaseHanbaitenSelect from '@/components/common/BaseHanbaitenSelect.vue';
import BaseKanriShitenSelect from '@/components/common/BaseKanriShitenSelect.vue';
import BaseShitenSelect from '@/components/common/BaseShitenSelect.vue';
import BaseReportPager from '@/components/common/BaseReportPager.vue';
import { formatPostalCode, formatDate } from '@/utils/formatters';
import { nowTokyo, endOfMonthIsoTokyo } from '@/utils/datetime';
import { downloadBlob } from '@/utils/download';

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
  shiten_ids: number[];
  dokusya_shubetsu: number | undefined;
  shiharai_hoho: number | undefined;
}>({
  // 適用日の既定は当月末日（顧客要件・複数帳票画面で共通）。
  tekiyo_date: endOfMonthIsoTokyo(),
  report_type: 'hanbaiten',
  hanbaiten_ids: [],
  kanri_shiten_ids: [],
  shiten_ids: [],
  dokusya_shubetsu: undefined,
  shiharai_hoho: undefined,
});

const fieldErrors = reactive<{
  tekiyo_date: string;
  hanbaiten_ids: string;
  kanri_shiten_ids: string;
  shiten_ids: string;
}>({ tekiyo_date: '', hanbaiten_ids: '', kanri_shiten_ids: '', shiten_ids: '' });

const previewData = ref<MeiboPreviewData | null>(null);

// ─── ページ送り（文書ページ）──────────────────────────────────────────
// per_page の名目値。BE は明細の高さを積算して A4 1枚ごとに動的分割するため、
// この値はページ数の算出には使われない（BE が返す per_page と同値で、ページャの
// total 算出に使う名目行数のみ）。
const MEIBO_NOMINAL_PER_PAGE = 15;
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
  codes.options('DOKUSYA_SHUBETSU').filter((o) => Number(o.value) !== DokusyaShubetsu.BOTH),
);

// previewData は fetch 成功時のみ設定（帳票種別変更・エラー時は null に戻す）ため、
// 「検索済み」判定は previewData !== null で足りる（別途 hasSearched フラグは不要）。
const isEmptyResult = computed(
  () =>
    previewData.value !== null && previewData.value.grand_total_busu === 0,
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
    currentPage.value = 1;
    fieldErrors.hanbaiten_ids = '';
    fieldErrors.kanri_shiten_ids = '';
    fieldErrors.shiten_ids = '';
  },
);

function validate(): boolean {
  fieldErrors.tekiyo_date = '';
  fieldErrors.hanbaiten_ids = '';
  fieldErrors.kanri_shiten_ids = '';
  fieldErrors.shiten_ids = '';

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
    !fieldErrors.kanri_shiten_ids &&
    !fieldErrors.shiten_ids
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
    // 支店は任意。空配列は送らない — BE で「未指定＝絞らない」と同義だが、
    // `IN ()` を組む余地を作らないため送信段階で落とす。
    if (formState.shiten_ids.length > 0) q.shiten_ids = formState.shiten_ids;
  }
  if (formState.dokusya_shubetsu != null) q.dokusya_shubetsu = formState.dokusya_shubetsu;
  // 支払方法（m_code SHIHARAI_HOHO）は両帳票種別で有効。
  if (formState.shiharai_hoho != null) q.shiharai_hoho = formState.shiharai_hoho;
  // 日農ダウンロード許可フラグは画面から選択させない（顧客要件）。FE は送らず、
  // BE 側で未指定→false に既定化する（service: `?? false`）。
  // ページ送り（preview のみ。export では渡さず全件出力）。per_page は送らない
  // ―― BE は A4 高さ基準で動的分割するため受け付けない（DTO 非対象）。
  if (page != null) {
    q.page = page;
  }
  return q;
}

/** 指定ページのプレビューを取得（フィルタ検証済み前提。ページ送りで再利用）。 */
async function fetchPage(page: number): Promise<void> {
  try {
    const resp = await previewMeibo(buildQuery(page));
    previewData.value = resp.data;
    currentPage.value = resp.data.page_no ?? page;
  } catch {
    // 集約 axios インターセプタが 403/500 をトースト済み。ローカル状態のみ整理。
    previewData.value = null;
  }
}

async function onPreview(): Promise<void> {
  if (!validate()) return;
  // 出力日時 = プレビュー押下時刻（JST）。fetchPage 呼び出し前に確定する。
  stampOutputDatetime();
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
    const [y, m] = formState.tekiyo_date.split('-');
    // 帳票種別で接頭辞を切替（hanbaiten=販売店別 / kanri_shiten=管理支店別）。
    // 例: 販売店別購読者名簿_2026年01月.xlsx
    const prefix =
      formState.report_type === 'hanbaiten' ? '販売店別' : '管理支店別';
    downloadBlob(blob, `${prefix}購読者名簿_${y}年${m}月.xlsx`);
    notify.downloaded();
  } catch {
    // 対象なし(404)/500 はインターセプタがトースト済み。
  }
}

// 販売店・管理支店の選択肢ロードは BaseHanbaitenSelect / BaseKanriShitenSelect が
// 自前で行う（コード/名称検索・50件ずつ無限スクロール）。

// ─── 帳票ヘッダ表示用 ───────────────────────────────────────────────
// [output-datetime-freeze] computed(() => nowTokyo()...) はリアクティブな
// 依存を一切読まないため、Vue は初回アクセス時の値を永久にキャッシュしてしまい
// 2回目以降のプレビューでも出力日時が1回目の時刻のまま固定されていた（報告バグ）。
// ref にして onPreview 押下のたびに明示的にスタンプし直す。
/** 出力日（JST）— 帳票ヘッダの「出力日」。プレビュー押下時刻で確定。 */
const outputDate = ref('');
/** 出力時間（JST）— 帳票ヘッダの「出力時間」。プレビュー押下時刻で確定。 */
const outputTime = ref('');

function stampOutputDatetime(): void {
  const now = nowTokyo();
  outputDate.value = now.format('YYYY/MM/DD');
  outputTime.value = now.format('HH:mm:ss');
}
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

// ─── 販売店別ヘッダ表示用 ─────────────────────────────────────────────
/** 選択販売店名（ヘッダ・合計行表示用）。 */
const selectedHanbaitenNames = computed(() =>
  previewData.value?.hanbaiten_groups.map((g) => g.hanbaiten_name).join('、') ?? '',
);
/** ヘッダの販売店情報は先頭販売店を代表として表示。 */
const headerHanbaiten = computed(() => previewData.value?.hanbaiten_groups[0]);

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
    <div class="@container bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <!-- items-start: 適用日 直下にエラーが出ても他フィルタが上下にずれないよう
           上揃えにする（items-center だとエラーで伸びた行に合わせて兄弟が中央寄せ
           されてズレる）。各フィルタ行は flex items-center で入力欄の高さが揃う。 -->
      <div class="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4 items-start">
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
              class="flex-1 min-w-0"
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
            class="flex-1 min-w-0"
          />
        </div>

        <!-- 帳票種別 -->
        <div class="flex items-center gap-2">
          <label for="meibo-report-type" class="text-sm font-medium whitespace-nowrap text-text-main">帳票種別</label>
          <a-select
            id="meibo-report-type"
            v-model:value="formState.report_type"
            :options="reportTypeOptions"
            class="flex-1 min-w-0"
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
            class="flex-1 min-w-0"
          />
        </div>
      </div>

      <!-- 販売店（販売店別のみ）— チェックボックスで複数選択。件数が多いため
           複数列に折り返し、高さ上限＋スクロールで間延びを防ぐ。 -->
      <!-- 販売店（販売店別のみ）— マルチセレクトのドロップダウン
           （コード/名称検索、50件ずつ無限スクロール、複数選択可・1件以上必須）。 -->
      <!-- v-show（v-if ではない）: 帳票種別を切り替えても選択コンポーネントを remount
           しないため、「全て」選択(allIds キャッシュ)が保持され、戻ったときに個別タグに
           バラけず「全て」タグのまま表示される（顧客要件 2026-07）。 -->
      <div v-show="formState.report_type === 'hanbaiten'" class="mt-4">
        <label for="meibo-hanbaiten-select" class="block text-sm font-medium text-text-main mb-1">
          販売店<span class="text-error ml-1">*</span>
        </label>
        <!-- エラーはラベル直下に表示する -->
        <p v-if="fieldErrors.hanbaiten_ids" class="text-error text-sm mb-2">
          {{ fieldErrors.hanbaiten_ids }}
        </p>
        <!-- 電子版ダミー販売店は候補に出さない（顧客要件 2026-08）。ダミーは
             電子版読者の受け皿であって実在の販売店ではなく、販売店別名簿の
             集計対象（紙版のみ）にも入らないため、選ばせると必ず0件になる。
             廃店（haiten_flg=true）も候補から除外する（顧客要件 2026-08-26）。 -->
        <BaseHanbaitenSelect
          id="meibo-hanbaiten-select"
          v-model:value="formState.hanbaiten_ids"
          placeholder="販売店を選択（1件以上）"
          allow-select-all
          dummy="exclude"
          active-only
          data-test="hanbaiten-select"
        />
      </div>

      <!-- 管理支店 + 支店（管理支店別のみ）— 親子関係の条件なので横1行に並べる。
           支店は管理支店の配下だけを候補にする。販売店別に出さないのは、帳票に
           支店列が無く「絞ったのに理由が紙面から読めない」状態になるため
           （顧客要件2026-08）。
           v-show は2つを束ねる外側に置く — 個別に付けると片方だけ消えた時に
           グリッドの列が詰まって幅が変わる。 -->
      <div
        v-show="formState.report_type !== 'hanbaiten'"
        class="mt-4 grid grid-cols-1 @lg:grid-cols-2 gap-4"
      >
        <div>
          <label for="meibo-kanri-shiten-select" class="block text-sm font-medium text-text-main mb-1">
            管理支店<span class="text-error ml-1">*</span>
          </label>
          <BaseKanriShitenSelect
            v-if="jaId != null"
            id="meibo-kanri-shiten-select"
            v-model:value="formState.kanri_shiten_ids"
            :ja-id="jaId"
            placeholder="管理支店を選択（1件以上）"
            allow-select-all
            data-test="kanri-shiten-select"
          />
          <!-- エラーはコントロールの下。横並びにした都合上、ラベル直下に出すと
               エラー表示時だけ左列が下へ伸び、右の支店セレクトと高さがずれる。
               適用日のエラーも同じくコントロール下なので表示位置も揃う。 -->
          <p v-if="fieldErrors.kanri_shiten_ids" class="text-error text-sm mt-1">
            {{ fieldErrors.kanri_shiten_ids }}
          </p>
        </div>

        <div>
          <label for="meibo-shiten-select" class="block text-sm font-medium text-text-main mb-1">支店</label>
          <!-- 候補は金融機関支店以外のみ（顧客要件 2026-08）。ここの支店は
               配達担当支店（t_dokusya_rireki.shiten_id）で、金融機関支店は
               引落口座の紐付け先なので購読者の配達先にはならない。
               任意条件 — 未選択なら支店未設定(NULL)の購読者も含めて出力する。 -->
          <BaseShitenSelect
            id="meibo-shiten-select"
            v-model:value="formState.shiten_ids"
            :kanri-shiten-ids="formState.kanri_shiten_ids"
            :ja-id="jaId"
            :kinyu-shiten-flg="false"
            :disabled="formState.kanri_shiten_ids.length === 0"
            :placeholder="
              formState.kanri_shiten_ids.length === 0
                ? '先に管理支店を選択してください'
                : '支店を選択（未選択＝支店未設定を含むすべて）'
            "
            allow-select-all
            data-test="shiten-select"
          />
          <p v-if="fieldErrors.shiten_ids" class="text-error text-sm mt-1">
            {{ fieldErrors.shiten_ids }}
          </p>
        </div>
      </div>

      <!-- 日農ダウンロード許可フラグは画面から選択させず常に false（許可しない）で
           出力する（顧客要件）。ラジオは廃止し、export クエリで固定値を送る。 -->

      <!-- スマホ幅でも2ボタンを1行に並べる（顧客要望 2026-08）。
           自然幅では「レポートプレビュー」≈158px +「レポートデータExcel出力」
           ≈198px + gap で ≈364px 必要だが、スマホは
           コンテナ358px - カード p-4 = 326px しかなく flex-wrap で縦積みになる。
           @max-lg（コンテナ512px未満）に限り 2 ボタンを flex-1 で等分し、
           入りきらないラベルはボタン内で折り返させる（!h-auto + !whitespace-normal。
           antd は .ant-btn に固定高さと nowrap を当てるので `!` が要る）。
           items-stretch で折り返した側に高さを揃える。
           @lg 以上は従来どおり内容幅のまま。 -->
      <div class="pt-4 mt-3 flex items-center @max-lg:items-stretch flex-wrap justify-start gap-2">
        <a-button
          type="primary"
          class="@max-lg:flex-1 @max-lg:min-w-0 @max-lg:!h-auto @max-lg:!whitespace-normal"
          :disabled="!canUse"
          data-test="preview-btn"
          @click="onPreview"
        >
          レポートプレビュー
        </a-button>
        <a-button
          class="@max-lg:flex-1 @max-lg:min-w-0 @max-lg:!h-auto @max-lg:!whitespace-normal"
          :disabled="!canUse || !hasReportData"
          data-test="export-btn"
          @click="onExport"
        >
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
                <!-- 名称(右寄せ) / TEL(左寄せ・固定列) の2列グリッド。TEL の値有無に
                     関わらず「TEL：」の開始位置を揃える（顧客要件 2026-07）。
                     販売店別は1ページに複数の管理支店(支所)が載りうるため、代表1件を
                     ヘッダに出すのは誤解を招く → 支所行は表示しない（顧客要件 2026-07）。 -->
                <div class="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 w-max ml-auto items-center">
                  <span class="text-sm text-right">{{ previewData.ja_name }}</span>
                  <span class="text-xs text-left whitespace-nowrap">TEL：{{ previewData.ja_tel || '-' }}</span>
                </div>
                <div class="text-xs pt-1">出力日：{{ outputDate }}</div>
                <div class="text-xs">出力時間：{{ outputTime }}</div>
                <!-- ページ数は販売店/管理支店ごとに 1..N（顧客要件 2026-07）。 -->
              <div class="text-xs">ページ数：&nbsp;{{ previewData.group_page_no ?? 1 }}/{{ previewData.group_total_pages ?? 1 }}</div>
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
                  <!-- 販売店見出し帯は廃止（グループ単位ページングで各販売店が独立
                       ページ・ヘッダに販売店コード/名を表示するため冗長・顧客要件 2026-07）。 -->
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
                <!-- 全体合計行は廃止（各販売店が独立ページ・小計のみ・顧客要件 2026-07）。 -->
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
              <!-- ページ数は販売店/管理支店ごとに 1..N（顧客要件 2026-07）。 -->
              <div class="text-xs">ページ数：&nbsp;{{ previewData.group_page_no ?? 1 }}/{{ previewData.group_total_pages ?? 1 }}</div>
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
                <!-- 全体合計行は廃止（各管理支店が独立ページ・小計のみ・顧客要件 2026-07）。 -->
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- ページャ — 文書ページ送り（共通 BaseReportPager）。ブラウザは1ページ分のみ描画。 -->
      <BaseReportPager
        :current="currentPage"
        :page-no="previewData.page_no ?? 1"
        :total-pages="previewData.total_pages ?? 1"
        :per-page="previewData.per_page ?? MEIBO_NOMINAL_PER_PAGE"
        :total-rows="previewData.total_rows ?? 0"
        data-test="meibo-pager"
        @change="onPageChange"
      />
    </div>
  </div>
</template>
