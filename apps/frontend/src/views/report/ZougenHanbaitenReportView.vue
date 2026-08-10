<script setup lang="ts">
// 増減連絡票（販売店）出力画面 (ACSMS-SCR-028)
// 出力条件 → レポートプレビュー / 電子帳票作成（PDF）。販売店＋管理支店の
// 組み合わせごとに「増部 / 減部 / 住所変更」の3区分で1帳票を表示する。
// 帳票レイアウトは docs/design/ACSMS-SCR-028/index.html に準拠。
import { computed, reactive, ref } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewZougenHanbaiten,
  exportZougenHanbaiten,
  type ZougenHanbaitenQuery,
  type ZougenPreviewData,
  type ZougenAddressChangeRow,
} from '@/api/report/report';
import BaseHanbaitenSelect from '@/components/common/BaseHanbaitenSelect.vue';
import BaseKanriShitenSelect from '@/components/common/BaseKanriShitenSelect.vue';
import BaseReportPager from '@/components/common/BaseReportPager.vue';
import { nowTokyo } from '@/utils/datetime';
import { formatJpDate } from '@/utils/formatters';
import { downloadBlob } from '@/utils/download';

const authStore = useAuthStore();
const notify = useNotify();

/** report.export_zougen_hanbaiten は JAアカウントのみ保持（§1.2）。 */
const canUse = computed(() =>
  authStore.hasPermission('report.export_zougen_hanbaiten'),
);

/** 管理支店プルダウンのスコープ元。JAアカウントのみ本画面に到達する。 */
const jaId = computed(() => authStore.user?.ja_id ?? null);

const formState = reactive<{
  tekiyo_date: string;
  hanbaiten_id: number[];
  kanri_shiten_id: number[];
}>({
  tekiyo_date: '',
  hanbaiten_id: [],
  kanri_shiten_id: [],
});

const fieldErrors = reactive<{
  tekiyo_date: string;
  hanbaiten_id: string;
  kanri_shiten_id: string;
}>({ tekiyo_date: '', hanbaiten_id: '', kanri_shiten_id: '' });

const previewData = ref<ZougenPreviewData | null>(null);
/** 対象データなし（BE が 200 + reports:[] を返す）→ ACSMS-MSG-028-002 を表示。 */
const noDataMessage = ref(false);

// ─── ページ送り（文書ページ）──────────────────────────────────────────
// 1ページ = 1販売店+管理支店(combo)。ZOUGEN_PER_PAGE は「1 combo 内で1ページに載せる
// 最大レコード数」で、これを超える大きい combo のみ自 combo 内で複数ページに分かれる
// （BE の per_page として送信）。総ページ数は combo 数で決まる（顧客要件 2026-07）。
const ZOUGEN_PER_PAGE = 15;
const currentPage = ref(1);

/** 発行日時（プレビュー押下時刻 JST。条件エリアのラベル＋帳票フッタに印字）。 */
const issuedAt = ref('');
/** 現在時刻（JST）を `YYYY/MM/DD HH:mm` で返す。 */
const nowIssuedAt = (): string => nowTokyo().format('YYYY/MM/DD HH:mm');

const hasReports = computed(
  () => previewData.value !== null && previewData.value.reports.length > 0,
);

/**
 * 住所変更は1購読者につき [変更前, 変更後] の2行。氏名・配達先・電話・備考は
 * rowspan=2 でまとめるため、フラットな配列を2件ずつのペアに分割する。
 */
function addressChangePairs(
  rows: ZougenAddressChangeRow[],
): { before: ZougenAddressChangeRow; after: ZougenAddressChangeRow | undefined }[] {
  const pairs: {
    before: ZougenAddressChangeRow;
    after: ZougenAddressChangeRow | undefined;
  }[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    pairs.push({ before: rows[i], after: rows[i + 1] });
  }
  return pairs;
}

function validate(): boolean {
  fieldErrors.tekiyo_date = '';
  fieldErrors.hanbaiten_id = '';
  fieldErrors.kanri_shiten_id = '';
  // ?.trim() — <a-date-picker> の × クリアで undefined になるため。
  if (!formState.tekiyo_date?.trim()) {
    fieldErrors.tekiyo_date = '必須項目です。'; // ACSMS-MSG-028-004
  }
  // 販売店・管理支店は必須入力（顧客要件 2026-07）。「全て」選択で全件を選べる。
  if (formState.hanbaiten_id.length === 0) {
    fieldErrors.hanbaiten_id = '販売店を1件以上選択してください。';
  }
  if (formState.kanri_shiten_id.length === 0) {
    fieldErrors.kanri_shiten_id = '管理支店を1件以上選択してください。';
  }
  return (
    !fieldErrors.tekiyo_date &&
    !fieldErrors.hanbaiten_id &&
    !fieldErrors.kanri_shiten_id
  );
}

function buildQuery(page?: number): ZougenHanbaitenQuery {
  const q: ZougenHanbaitenQuery = { tekiyo_date: formState.tekiyo_date };
  // 販売店・管理支店は必須（validate 済）。「全て」選択時は全 ID が入るため常に送る。
  if (formState.hanbaiten_id.length > 0) q.hanbaiten_id = formState.hanbaiten_id;
  if (formState.kanri_shiten_id.length > 0) {
    q.kanri_shiten_id = formState.kanri_shiten_id;
  }
  // ページ送り（preview のみ。export では渡さず全件PDF出力）。
  if (page != null) {
    q.page = page;
    q.per_page = ZOUGEN_PER_PAGE;
  }
  return q;
}

/** 指定ページのプレビューを取得（ページ送りで再利用）。 */
async function fetchPage(page: number): Promise<void> {
  noDataMessage.value = false;
  try {
    const resp = await previewZougenHanbaiten(buildQuery(page));
    previewData.value = resp.data;
    currentPage.value = resp.data.page_no ?? page;
    // 対象0件は 200 + reports:[] で返る（業務エラーではない）→ 画面内テキスト。
    if (resp.data.reports.length === 0) noDataMessage.value = true;
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。ローカル状態のみ整理。
    previewData.value = null;
  }
}

async function onPreview(): Promise<void> {
  if (!validate()) return;
  // 発行日時 = プレビュー押下時刻（JST）。条件ラベル＋帳票フッタに表示する。
  issuedAt.value = nowIssuedAt();
  currentPage.value = 1;
  await fetchPage(1);
}

/** ページャ操作 — 当該ページを取得（ブラウザは1ページ分のみ描画）。 */
async function onPageChange(page: number): Promise<void> {
  await fetchPage(page);
}

async function onExport(): Promise<void> {
  if (!validate()) return;
  // プレビュー未実行で直接出力した場合も発行日時を確定させる。
  if (!issuedAt.value) issuedAt.value = nowIssuedAt();
  try {
    const { blob, filename } = await exportZougenHanbaiten({
      ...buildQuery(),
      issued_at: issuedAt.value,
    });
    // 対象0件のとき BE は PDF ではなく application/json を返す。その場合は
    // ダウンロードせず画面内テキスト（対象のデータが存在しません。）を表示。
    if (blob.type.includes('application/json')) {
      previewData.value = null;
      noDataMessage.value = true;
      return;
    }
    // ファイル名はサーバ（権限別）が決めるため Content-Disposition から受け取る。
    // 取得できないときのみ適用日ベースの既定名にフォールバックする。
    const [y, m, d] = formState.tekiyo_date.split('-');
    downloadBlob(blob, filename ?? `増減連絡票_${y}年${m}月${d}日.pdf`);
    notify.downloaded();
  } catch {
    // 403/500 はインターセプタがトースト済み。ローカル状態のみ整理。
  }
}

// 販売店・管理支店の選択肢ロードは BaseHanbaitenSelect / BaseKanriShitenSelect が
// 自前で行う（コード/名称検索・50件ずつ無限スクロール）。

defineExpose({ formState });
</script>

<template>
  <div class="space-y-6">
    <!-- 権限なし（日農アカウント）→ ACSMS-MSG-028-001 -->
    <a-alert
      v-if="!canUse"
      type="warning"
      show-icon
      message="この機能はJAアカウントのみ使用できます。"
      data-test="no-permission"
    />

    <!-- 出力条件エリア（適用日 / 販売店 / 管理支店）— index.html 準拠：
         販売店・管理支店はチェックボックス（複数選択可、未選択＝全件）。 -->
    <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <div class="space-y-4">
        <!-- ① 適用日（単独行）— バリデーションメッセージは直下に表示する -->
        <div>
          <div class="flex items-center gap-2">
            <label for="zh-tekiyo-date" class="text-sm font-medium whitespace-nowrap text-text-main">
              適用日<span class="text-error ml-1">*</span>
            </label>
            <a-date-picker
              id="zh-tekiyo-date"
              v-model:value="formState.tekiyo_date"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              style="width: 200px"
            />
          </div>
          <p v-if="fieldErrors.tekiyo_date" class="text-error text-sm mt-1">
            {{ fieldErrors.tekiyo_date }}
          </p>
        </div>

        <!-- ② 販売店（左 2/3）／③ 管理支店（右 1/3）— 必須（顧客要件 2026-07）。
             マルチセレクトのドロップダウン（コード・名称で検索、50件ずつ無限スクロール）。
             ドロップダウン先頭の「全て」で全件選択＝入力欄に「全て」タグ表示。 -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-6 items-start">
          <div class="@lg:col-span-2">
            <div class="text-sm font-medium text-text-main mb-2">
              販売店<span class="text-error ml-1">*</span>
            </div>
            <!-- 電子版ダミー販売店は候補に出さない（顧客要件 2026-08）。本帳票の
                 集計対象は紙版のみで、ダミーに紐づく電子版読者は入らないため、
                 選ばせると必ず0件になる。 -->
            <BaseHanbaitenSelect
              v-model:value="formState.hanbaiten_id"
              placeholder="販売店を選択（「全て」で全件）"
              allow-select-all
              dummy="exclude"
              data-test="hanbaiten-select"
            />
            <!-- エラーは入力欄の下に表示（ラベル直下だと右列とベースラインがずれるため）。 -->
            <p v-if="fieldErrors.hanbaiten_id" class="text-error text-sm mt-1">
              {{ fieldErrors.hanbaiten_id }}
            </p>
          </div>

          <div>
            <div class="text-sm font-medium text-text-main mb-2">
              管理支店<span class="text-error ml-1">*</span>
            </div>
            <BaseKanriShitenSelect
              v-if="jaId != null"
              v-model:value="formState.kanri_shiten_id"
              :ja-id="jaId"
              placeholder="管理支店を選択（「全て」で全件）"
              allow-select-all
              data-test="kanri-shiten-select"
            />
            <p v-if="fieldErrors.kanri_shiten_id" class="text-error text-sm mt-1">
              {{ fieldErrors.kanri_shiten_id }}
            </p>
          </div>
        </div>

        <!-- ④ 発行日時（ラベル）— プレビュー押下時に確定。押下前は非表示。帳票フッタにも印字。 -->
        <div v-if="issuedAt" class="flex items-center gap-2">
          <span class="text-sm font-medium whitespace-nowrap text-text-main">発行日時</span>
          <span class="text-sm text-text-main" data-test="issued-at">{{ issuedAt }}</span>
        </div>
      </div>

      <div class="pt-4 mt-3 flex items-center flex-wrap justify-start gap-2">
        <a-button
          type="primary"
          :disabled="!canUse"
          data-test="preview-btn"
          @click="onPreview"
        >
          レポートプレビュー
        </a-button>
        <a-button :disabled="!canUse || !hasReports" data-test="export-btn" @click="onExport">
          電子帳票作成
        </a-button>
      </div>
    </div>

    <!-- 対象データなし → ACSMS-MSG-028-002 -->
    <p
      v-if="noDataMessage"
      class="text-text-description text-sm"
      data-test="no-data-message"
    >
      対象のデータが存在しません。
    </p>

    <!-- プレビューエリア（販売店＋管理支店の組み合わせごとに改ページ＝1帳票） -->
    <div
      v-else-if="hasReports"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card"
      data-test="preview-area"
    >
      <div class="px-6 py-3 border-b border-border font-medium text-text-main">
        日本農業新聞増減連絡票 プレビュー
      </div>

      <div class="p-6 space-y-8 overflow-x-auto">
        <!-- ＝＝ 1帳票（販売店＋管理支店） ＝＝ -->
        <div
          v-for="report in previewData?.reports ?? []"
          :key="`${report.hanbaiten_id}-${report.kanri_shiten_id ?? 'none'}`"
          class="mx-auto border border-border-strong bg-surface-card font-display"
          style="max-width: 960px; padding: 40px 48px"
        >
          <!-- ヘッダ：タイトル + Page -->
          <div class="flex justify-between items-start mb-2">
            <div class="invisible text-xs">spacer</div>
            <div class="text-center flex-1">
              <h3 class="text-2xl font-bold tracking-widest text-text-main">
                日本農業新聞増減連絡票
              </h3>
            </div>
            <div class="text-xs text-right leading-relaxed text-text-description">
              <!-- ページ数は販売店ごとに採番（1ページ=1販売店+管理支店・顧客要件 2026-07）。 -->
              <div>ページ数：{{ previewData?.group_page_no ?? 1 }}/{{ previewData?.group_total_pages ?? 1 }}</div>
            </div>
          </div>

          <!-- 販売店情報 / 管理支店情報 -->
          <div class="flex justify-between items-start mb-1">
            <div>
              <div class="text-base font-bold text-text-main">
                {{ report.hanbaiten_name }}<span v-if="report.is_continued" class="font-normal text-xs">（続き）</span>　御中
              </div>
              <!-- TEL/FAX は販売店名の下に、それぞれ別行で表示する。 -->
              <div class="font-normal text-xs mt-0.5 text-text-description">
                <div>TEL：{{ report.kanri_shiten_tel || '-' }}</div>
                <div>FAX：{{ report.kanri_shiten_fax || '-' }}</div>
              </div>
            </div>
            <div class="text-xs text-left leading-relaxed text-text-description">
              <div>{{ report.kanri_shiten_name || '（管理支店）' }}</div>
              <!-- 部署／担当者は帳票上で手書き記入する空欄（下線）。 -->
              <div>＿＿＿＿＿＿ 部／ 担当：＿＿＿＿＿＿</div>
              <div>TEL：{{ report.kanri_shiten_tel || '-' }}</div>
              <div>FAX：{{ report.kanri_shiten_fax || '-' }}</div>
            </div>
          </div>

          <!-- 適用日 + 定型文 -->
          <div class="text-sm mb-5 text-text-main">
            <span class="mr-4">適用日：{{ formatJpDate(previewData?.tekiyo_date ?? '') }}</span>
            <span>下記の通り購読者が変更になりますのでお知らせします</span>
          </div>

          <!-- ── 増部 ── -->
          <div class="mb-5">
            <div class="font-bold text-sm mb-0.5 text-text-main">増部</div>
            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <colgroup>
                <col style="width: 7%" /><col style="width: 28%" /><col style="width: 16%" />
                <col style="width: 16%" /><col style="width: 16%" /><col style="width: 17%" />
              </colgroup>
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">部数</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">住所</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">新規氏名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">配達先読者名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">電話番号</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in report.zoubu" :key="`z-${i}`">
                  <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.busu }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.address }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.name }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.delivery_name }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.phone }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.biko }}</td>
                </tr>
                <!-- 末尾の空行（帳票フォーマット） -->
                <tr>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ── 減部 ── -->
          <div class="mb-5">
            <div class="font-bold text-sm mb-0.5 text-text-main">減部</div>
            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <colgroup>
                <col style="width: 7%" /><col style="width: 28%" /><col style="width: 16%" />
                <col style="width: 16%" /><col style="width: 16%" /><col style="width: 17%" />
              </colgroup>
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">部数</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">住所</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">中止氏名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">配達先読者名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">電話番号</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in report.genbu" :key="`g-${i}`">
                  <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.busu }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.address }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.name }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.delivery_name }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.phone }}</td>
                  <td class="border border-border-strong px-2 py-1.5">{{ row.biko }}</td>
                </tr>
                <tr>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ── 住所変更（1購読者2行：変更前 / 変更後） ── -->
          <div>
            <div class="font-bold text-sm mb-0.5 text-text-main">住所変更</div>
            <table class="w-full text-xs border-collapse" style="table-layout: fixed">
              <colgroup>
                <col style="width: 7%" /><col style="width: 28%" /><col style="width: 16%" />
                <col style="width: 16%" /><col style="width: 16%" /><col style="width: 17%" />
              </colgroup>
              <thead>
                <tr class="bg-surface-card-subtle">
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium"></th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">住所</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">氏名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">配達先読者名</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">電話番号</th>
                  <th class="border border-border-strong px-2 py-1.5 text-center font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="(pair, i) in addressChangePairs(report.address_change)"
                  :key="`a-${i}`"
                >
                  <tr>
                    <td class="border border-border-strong px-2 py-1.5 text-center font-semibold">{{ pair.before.label }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ pair.before.address }}</td>
                    <td class="border border-border-strong px-2 py-1.5" rowspan="2">{{ pair.before.name }}</td>
                    <td class="border border-border-strong px-2 py-1.5" rowspan="2">{{ pair.before.delivery_name }}</td>
                    <td class="border border-border-strong px-2 py-1.5" rowspan="2">{{ pair.before.phone }}</td>
                    <td class="border border-border-strong px-2 py-1.5" rowspan="2">{{ pair.before.biko }}</td>
                  </tr>
                  <tr>
                    <td class="border border-border-strong px-2 py-1.5 text-center font-semibold">{{ pair.after?.label ?? '変更後' }}</td>
                    <td class="border border-border-strong px-2 py-1.5">{{ pair.after?.address ?? '' }}</td>
                  </tr>
                </template>
                <tr>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                  <td class="border border-border-strong px-2 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 発行日時（フッタ右寄せ） -->
          <div
            class="mt-3 text-right text-xs text-text-description"
            data-test="issued-at-footer"
          >
            発行日時：{{ issuedAt }}
          </div>
        </div>
      </div>

      <!-- ページャ — 文書ページ送り（1ページ=1販売店+管理支店）— 共通 BaseReportPager
           で SCR-026/029 と統一。 -->
      <BaseReportPager
        :current="currentPage"
        :page-no="previewData?.page_no ?? 1"
        :total-pages="previewData?.total_pages ?? 1"
        :per-page="previewData?.per_page ?? ZOUGEN_PER_PAGE"
        :total-rows="previewData?.total_rows ?? 0"
        data-test="zougen-pager"
        @change="onPageChange"
      />
    </div>
  </div>
</template>
