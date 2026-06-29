<script setup lang="ts">
// 増減通知（日本農業新聞）出力画面 (ACSMS-SCR-029)
// 出力条件 → レポートプレビュー（15販売店行/ページのページ送り。各ページを別API
// で再取得）/ 電子帳票作成（全管理支店をプレビューと同じ改ページでまとめた1つのPDF）。
// 管理支店単位で1帳票（委託 / 販売店コード / 販売店名 / 現在部数 / 増部数 /
// 減部数 / 新部数 + 合計）。電子帳票作成は ACSMS-MSG-029-005 の確認ダイアログ
// （日農担当者へメール送信）を挟む。帳票レイアウトは
// docs/design/ACSMS-SCR-029/index.html に準拠。
import { computed, reactive, ref } from 'vue';
import { Modal } from 'ant-design-vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewZougenNichino,
  exportZougenNichino,
  type ZougenNichinoQuery,
  type ZougenNichinoPreviewData,
} from '@/api/report/report';
import BaseKanriShitenSelect from '@/components/common/BaseKanriShitenSelect.vue';

const authStore = useAuthStore();
const notify = useNotify();

/** report.export_zougen_nichino は JAアカウントのみ保持（§1.2）。 */
const canUse = computed(() =>
  authStore.hasPermission('report.export_zougen_nichino'),
);

/** 管理支店プルダウンのスコープ元。JAアカウントのみ本画面に到達する。 */
const jaId = computed(() => authStore.user?.ja_id ?? null);

const formState = reactive<{
  tekiyo_date: string;
  kanri_shiten_id: number[];
}>({
  tekiyo_date: '',
  kanri_shiten_id: [],
});

const fieldErrors = reactive<{ tekiyo_date: string }>({ tekiyo_date: '' });

const previewData = ref<ZougenNichinoPreviewData | null>(null);
/** 対象データなし（BE が 200 + reports:[] を返す）→ ACSMS-MSG-029-002 を表示。 */
const noDataMessage = ref(false);

/** 1ページ=A4 1枚＝15販売店行（SCR-028 と同方針。BEは購読者単位でSQLページング）。 */
const ZOUGEN_NICHINO_PER_PAGE = 15;
const currentPage = ref(1);

/** プレビューで直接入力する管理支店ごとの備考（出力時 remarks に変換）。 */
const remarks = reactive<Record<number, string>>({});

const hasReports = computed(
  () => previewData.value !== null && previewData.value.reports.length > 0,
);

/** 適用日 YYYY-MM-DD → 「YYYY年M月D日より」（帳票の見出し表記）。 */
function formatJpDate(iso: string): string {
  const [y, m, d] = (iso ?? '').split('-');
  if (!y || !m || !d) return iso ?? '';
  return `${y}年${Number(m)}月${Number(d)}日より`;
}

/** 管理支店コード10桁を 3-4-3 のハイフン区切りに整形（例: 1AA3300001 → 1AA-3300-001）。 */
function formatKanriShitenCode(code = ''): string {
  return /^.{10}$/.test(code) ? `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}` : code;
}

/** 組合名：管理支店コード(3-4-3): JA名 + 管理支店名（帳票ヘッダ §2.3）。 */
function kumiaiName(report: ZougenNichinoPreviewData['reports'][number]): string {
  return `${formatKanriShitenCode(report.kanri_shiten_code)}: ${report.ja_name} ${report.kanri_shiten_name}`;
}

/** 減部数は「▲」付きで表示（例: 2部減 → ▲2）。0は「0」。 */
function genDisplay(gen: number): string {
  return gen > 0 ? `▲${gen}` : '0';
}

function validate(): boolean {
  fieldErrors.tekiyo_date = '';
  // ?.trim() — <a-date-picker> の × クリアで undefined になるため。
  if (!formState.tekiyo_date?.trim()) {
    fieldErrors.tekiyo_date = '必須項目です。'; // ACSMS-MSG-029-004
  }
  return !fieldErrors.tekiyo_date;
}

function buildQuery(page?: number): ZougenNichinoQuery {
  const q: ZougenNichinoQuery = { tekiyo_date: formState.tekiyo_date };
  // 未選択（空配列）は全件対象 → パラメータを送らない。
  if (formState.kanri_shiten_id.length > 0) {
    q.kanri_shiten_id = formState.kanri_shiten_id;
  }
  // page 指定時のみページ送りパラメータを送る（export は全件のため付けない）。
  if (page !== undefined) {
    q.page = page;
    q.per_page = ZOUGEN_NICHINO_PER_PAGE;
  }
  return q;
}

function buildExportQuery(): ZougenNichinoQuery {
  const q = buildQuery();
  const entries = Object.entries(remarks)
    .filter(([, biko]) => (biko ?? '').trim() !== '')
    .map(([kanriShitenId, biko]) => ({
      kanri_shiten_id: Number(kanriShitenId),
      biko,
    }));
  if (entries.length > 0) q.remarks = entries;
  return q;
}

async function fetchPage(page: number): Promise<void> {
  try {
    const resp = await previewZougenNichino(buildQuery(page));
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
  noDataMessage.value = false;
  currentPage.value = 1;
  await fetchPage(1);
}

/** ページャでのページ移動：当該ページを別APIで再取得（BEは1ページ分のみロード）。 */
async function onPageChange(page: number): Promise<void> {
  await fetchPage(page);
}

/** 電子帳票作成 — ACSMS-MSG-029-005 の確認後に実行（はい押下時のみ）。 */
function onExport(): void {
  if (!validate()) return;
  Modal.confirm({
    title: '電子帳票作成の確認',
    content:
      '増減通知を作成して日農担当者へメール送信を実行します。よろしいですか？',
    okText: 'はい',
    cancelText: 'いいえ',
    onOk: () => runExport(),
  });
}

async function runExport(): Promise<void> {
  try {
    const result = await exportZougenNichino(buildExportQuery());
    // 対象0件のとき BE は reports:[] を返す。ダウンロードせず画面内テキスト
    // （対象のデータが存在しません。）を表示する。
    if (Array.isArray(result.reports) && result.reports.length === 0) {
      previewData.value = null;
      noDataMessage.value = true;
      return;
    }
    // PDFはブラウザへダウンロードしない。BE が S3 に保存し日農担当者へメール
    // 通知済み。成功トーストのみ表示する。
    notify.success('出力しました。メールを送信しました。');
  } catch {
    // 403/500 はインターセプタがトースト済み。ローカル状態のみ整理。
  }
}

// 管理支店の選択肢ロードは BaseKanriShitenSelect が自前で行う
// （コード/名称検索・50件ずつ無限スクロール）。

defineExpose({ formState });
</script>

<template>
  <div class="space-y-6">
    <!-- 権限なし（日農アカウント）→ ACSMS-MSG-029-001 -->
    <a-alert
      v-if="!canUse"
      type="warning"
      show-icon
      message="この機能はJAアカウントのみ使用できます。"
      data-test="no-permission"
    />

    <!-- 出力条件エリア（適用日 / 管理支店） -->
    <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4">
      <div class="space-y-4">
        <!-- 適用日（単独行）— バリデーションメッセージは直下に表示する -->
        <div>
          <div class="flex items-center gap-2">
            <label for="zn-tekiyo-date" class="text-sm font-medium whitespace-nowrap text-text-main">
              適用日<span class="text-error ml-1">*</span>
            </label>
            <a-date-picker
              id="zn-tekiyo-date"
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

        <!-- 管理支店（任意・複数選択可。未選択＝全件）— マルチセレクトのドロップダウン
             （コード/名称検索、50件ずつ無限スクロール）。 -->
        <div>
          <div class="text-sm font-medium text-text-main mb-2">管理支店</div>
          <BaseKanriShitenSelect
            v-if="jaId != null"
            v-model:value="formState.kanri_shiten_id"
            :ja-id="jaId"
            placeholder="管理支店を選択（未選択＝全件）"
            data-test="kanri-shiten-select"
          />
        </div>
      </div>

      <div class="pt-4 mt-3 flex items-center justify-start gap-2">
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

    <!-- 対象データなし → ACSMS-MSG-029-002 -->
    <p
      v-if="noDataMessage"
      class="text-text-description text-sm"
      data-test="no-data-message"
    >
      対象のデータが存在しません。
    </p>

    <!-- プレビューエリア（管理支店ごとに1帳票） -->
    <div
      v-else-if="hasReports"
      class="bg-surface-card border border-border rounded-ant shadow-ant-card"
      data-test="preview-area"
    >
      <div class="px-6 py-3 border-b border-border font-medium text-text-main">
        日本農業新聞増減通知 プレビュー
      </div>

      <div class="p-6 space-y-8 overflow-x-auto">
        <!-- ＝＝ 1帳票（管理支店） ＝＝ -->
        <div
          v-for="report in previewData?.reports ?? []"
          :key="report.kanri_shiten_id"
          class="mx-auto border border-border-strong bg-surface-card font-display"
          style="max-width: 1000px; padding: 32px 40px"
        >
          <!-- ヘッダ：発行元 + タイトル + Page -->
          <div class="flex justify-between items-start mb-3">
            <div class="text-xs leading-relaxed text-text-description">
              <div>日本農業新聞社 業務管理部</div>
              <div>TEL：03-6281-5800</div>
              <div>FAX：03-3225-6936</div>
            </div>
            <div class="text-center flex-1">
              <h3 class="text-xl font-bold tracking-widest text-text-main">
                日本農業新聞増減通知
              </h3>
            </div>
            <div class="text-xs text-right text-text-description">
              Page：{{ previewData?.page_no ?? 1 }}/{{ previewData?.total_pages ?? 1 }}
            </div>
          </div>

          <!-- 見出し：適用日 / 都道府県 / 組合名 / 担当 -->
          <div class="text-sm mb-4 space-y-0.5 text-text-main">
            <div>適用日：{{ formatJpDate(previewData?.tekiyo_date ?? '') }}</div>
            <div>都道府県名：{{ report.todofuken_name }}</div>
            <div>組合名：{{ kumiaiName(report) }}</div>
            <div>
              担当部署：{{ report.tanto_busho || '-' }}　担当者：{{ report.tanto_name || '-' }}
              　TEL：{{ report.tel || '-' }}　FAX：{{ report.fax || '-' }}
            </div>
          </div>

          <!-- 明細テーブル -->
          <table class="w-full text-xs border-collapse" style="table-layout: fixed">
            <colgroup>
              <col style="width: 8%" /><col style="width: 18%" /><col style="width: 34%" />
              <col style="width: 10%" /><col style="width: 10%" /><col style="width: 10%" /><col style="width: 10%" />
            </colgroup>
            <thead>
              <tr class="bg-surface-card-subtle">
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">委託</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">販売店コード</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">販売店名</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">現在部数</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">増部数</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">減部数</th>
                <th class="border border-border-strong px-2 py-1.5 text-center font-medium">新部数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in report.rows" :key="row.hanbaiten_id">
                <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.itaku_label }}</td>
                <td class="border border-border-strong px-2 py-1.5">{{ row.hanbaiten_code }}</td>
                <td class="border border-border-strong px-2 py-1.5">
                  <span v-if="row.diff_mark" class="text-error mr-1">◆</span>{{ row.hanbaiten_name }}
                </td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.genzai_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.zou_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ genDisplay(row.gen_busu) }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.shin_busu }}</td>
              </tr>
              <!-- 合計行 -->
              <tr class="bg-surface-card-subtle font-semibold">
                <td class="border border-border-strong px-2 py-1.5 text-center" colspan="3">合計</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.genzai_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.zou_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ genDisplay(report.total.gen_busu) }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.shin_busu }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 備考（プレビューで直接入力可能 — 出力時 remarks に変換） -->
          <div class="mt-4">
            <label :for="`zn-remarks-${report.kanri_shiten_id}`" class="text-xs font-medium text-text-description block mb-1">＜備考＞</label>
            <a-textarea
              :id="`zn-remarks-${report.kanri_shiten_id}`"
              v-model:value="remarks[report.kanri_shiten_id]"
              :rows="2"
              :maxlength="1000"
              placeholder="＜備考＞"
            />
          </div>
        </div>

        <!-- ページャ（1ページ=15販売店行。各ページを別APIで再取得） -->
        <div
          v-if="(previewData?.total_pages ?? 1) > 1"
          class="flex items-center justify-center gap-3 pt-2"
          data-test="zougen-nichino-pager"
        >
          <span class="text-text-description text-sm">
            全{{ previewData?.total_rows ?? 0 }}件・{{ previewData?.page_no ?? 1 }}/{{ previewData?.total_pages ?? 1 }}ページ
          </span>
          <a-pagination
            :current="currentPage"
            :total="previewData?.total_rows ?? 0"
            :page-size="previewData?.per_page ?? ZOUGEN_NICHINO_PER_PAGE"
            :show-size-changer="false"
            @change="onPageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
