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
import BaseReportPager from '@/components/common/BaseReportPager.vue';
import { formatJpDate } from '@/utils/formatters';

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

const fieldErrors = reactive<{ tekiyo_date: string; kanri_shiten_id: string }>({
  tekiyo_date: '',
  kanri_shiten_id: '',
});

const previewData = ref<ZougenNichinoPreviewData | null>(null);
/** 対象データなし（BE が 200 + reports:[] を返す）→ ACSMS-MSG-029-002 を表示。 */
const noDataMessage = ref(false);

/** 1ページ=A4 1枚＝15販売店行（SCR-028 と同方針。BEは購読者単位でSQLページング）。 */
// 1管理支店あたり1ページの販売店行上限（BE の ZOUGEN_NICHINO_PER_PAGE と一致させる）。
// 行は単一行で均一のため A4 に収まる概算(~33)に対し安全側で 28。
const ZOUGEN_NICHINO_PER_PAGE = 28;
const currentPage = ref(1);

/** プレビューで直接入力する管理支店ごとの備考（出力時 remarks に変換）。 */
const remarks = reactive<Record<number, string>>({});

const hasReports = computed(
  () => previewData.value !== null && previewData.value.reports.length > 0,
);

/**
 * 管理支店コード10桁を 3-4-3 のハイフン区切りに整形（例: 1AA3300001 → 1AA-3300-001）。
 * 本帳票のコードは英数字混在のため任意10文字を分割する。数字専用の
 * `formatters.formatKanriShitenCode`（`/^\d{10}$/` 限定）とは意図的に別物なので
 * 名前を分けて誤importを防ぐ。
 */
function groupKanriShitenCode(code = ''): string {
  return /^.{10}$/.test(code) ? `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}` : code;
}

/** 組合名：管理支店コード(3-4-3): JA名 + 管理支店名（帳票ヘッダ §2.3）。 */
function kumiaiName(report: ZougenNichinoPreviewData['reports'][number]): string {
  return `${groupKanriShitenCode(report.kanri_shiten_code)}: ${report.ja_name} ${report.kanri_shiten_name}`;
}

function validate(): boolean {
  fieldErrors.tekiyo_date = '';
  fieldErrors.kanri_shiten_id = '';
  // ?.trim() — <a-date-picker> の × クリアで undefined になるため。
  if (!formState.tekiyo_date?.trim()) {
    fieldErrors.tekiyo_date = '必須項目です。'; // ACSMS-MSG-029-004
  }
  // 管理支店は必須入力（顧客要件 2026-07）。「全て」選択でスコープ内全件を選べる。
  if (formState.kanri_shiten_id.length === 0) {
    fieldErrors.kanri_shiten_id = '管理支店を1件以上選択してください。';
  }
  return !fieldErrors.tekiyo_date && !fieldErrors.kanri_shiten_id;
}

function buildQuery(page?: number): ZougenNichinoQuery {
  const q: ZougenNichinoQuery = { tekiyo_date: formState.tekiyo_date };
  // 管理支店は必須（validate 済）。「全て選択」時は全 ID が入るため常に送る。
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
  // 先頭でリセット（ページ移動・再取得時に前回の「対象なし」表示が残らないよう、
  // ZougenHanbaiten と同じく fetchPage 側で必ずクリアする）。
  noDataMessage.value = false;
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

        <!-- 管理支店（必須・複数選択可）— マルチセレクトのドロップダウン
             （コード/名称検索、50件ずつ無限スクロール）。ドロップダウン内の
             「全て選択」でスコープ内の全管理支店を一括選択＝全件出力（顧客要件 2026-07）。 -->
        <div>
          <div class="text-sm font-medium text-text-main mb-2">
            管理支店<span class="text-error ml-1">*</span>
          </div>
          <p v-if="fieldErrors.kanri_shiten_id" class="text-error text-sm mb-2">
            {{ fieldErrors.kanri_shiten_id }}
          </p>
          <BaseKanriShitenSelect
            v-if="jaId != null"
            v-model:value="formState.kanri_shiten_id"
            :ja-id="jaId"
            placeholder="管理支店を選択（「全て選択」で全件）"
            allow-select-all
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
              <!-- ページ数は管理支店ごとに採番（1ページ=1管理支店・顧客要件 2026-07）。 -->
              ページ数：{{ previewData?.group_page_no ?? 1 }}/{{ previewData?.group_total_pages ?? 1 }}
            </div>
          </div>

          <!-- 発行元ヘッダと見出しの区切り線（index.html 準拠）。 -->
          <div class="border-t border-border my-3"></div>

          <!-- 見出し：適用日（左） / 都道府県名（右）。index.html 準拠。 -->
          <div class="grid grid-cols-2 gap-12 text-sm text-text-main mb-1">
            <div>適用日：{{ formatJpDate(previewData?.tekiyo_date ?? '') }}</div>
            <div>都道府県名：{{ report.todofuken_name }}</div>
          </div>
          <!-- 組合名 + 担当情報（右カラムのみ）。 -->
          <div class="grid grid-cols-2 gap-12 mb-4 text-text-main">
            <div class="col-start-2">
              <div class="text-sm mb-1 font-bold">組合名：{{ kumiaiName(report) }}</div>
              <!-- 部署／担当者は帳票上で手書き記入する空欄（下線）。「____ 部／ ____」形式。
                   固定幅の下線で左寄せし、組合名・TEL・FAX と行頭を揃える。 -->
              <div class="text-sm mb-1 whitespace-nowrap">
                <span class="inline-block w-24 border-b border-border-strong align-bottom">&nbsp;</span>
                <span class="px-1">部／ 担当：</span>
                <span class="inline-block w-24 border-b border-border-strong align-bottom">&nbsp;</span>
              </div>
              <div class="text-xs">TEL：{{ report.tel || '-' }}</div>
              <div class="text-xs">FAX：{{ report.fax || '-' }}</div>
            </div>
          </div>

          <!-- 明細テーブル -->
          <table class="w-full text-xs border-collapse" style="table-layout: fixed">
            <colgroup>
              <col style="width: 4%" /><col style="width: 8%" /><col style="width: 16%" /><col style="width: 32%" />
              <col style="width: 10%" /><col style="width: 10%" /><col style="width: 10%" /><col style="width: 10%" />
            </colgroup>
            <thead>
              <tr class="bg-surface-card-subtle">
                <!-- 増減マーカー（◆）用の先頭列（他列と同じ枠線）。 -->
                <th class="border border-border-strong px-2 py-1.5"></th>
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
                <!-- 増減マーカー（◆）は行頭のセルに表示する（他列と同じ枠線）。 -->
                <td class="border border-border-strong px-2 py-1.5 text-center font-bold">
                  <span v-if="row.diff_mark">◆</span>
                </td>
                <td class="border border-border-strong px-2 py-1.5 text-center">{{ row.itaku_label }}</td>
                <td class="border border-border-strong px-2 py-1.5">{{ row.hanbaiten_code }}</td>
                <td class="border border-border-strong px-2 py-1.5">{{ row.hanbaiten_name }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.genzai_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.zou_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.gen_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ row.shin_busu }}</td>
              </tr>
              <!-- 合計行 -->
              <tr class="bg-surface-card-subtle font-semibold">
                <td class="border border-border-strong px-2 py-1.5"></td>
                <td class="border border-border-strong px-2 py-1.5 text-center" colspan="3">合計</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.genzai_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.zou_busu }}</td>
                <td class="border border-border-strong px-2 py-1.5 text-right">{{ report.total.gen_busu }}</td>
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

        <!-- ページャ（1ページ=1管理支店。各ページを別APIで再取得）— 共通 BaseReportPager
             で SCR-026 と統一。 -->
        <BaseReportPager
          :current="currentPage"
          :page-no="previewData?.page_no ?? 1"
          :total-pages="previewData?.total_pages ?? 1"
          :per-page="previewData?.per_page ?? ZOUGEN_NICHINO_PER_PAGE"
          :total-rows="previewData?.total_rows ?? 0"
          data-test="zougen-nichino-pager"
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>
