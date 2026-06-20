<script setup lang="ts">
// 増減連絡票（販売店）出力画面 (ACSMS-SCR-028)
// 出力条件 → レポートプレビュー / 電子帳票作成（PDF）。販売店＋管理支店の
// 組み合わせごとに「増部 / 減部 / 住所変更」の3区分で1帳票を表示する。
// 帳票レイアウトは docs/design/ACSMS-SCR-028/index.html に準拠。
import { computed, onMounted, reactive, ref } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import {
  previewZougenHanbaiten,
  exportZougenHanbaiten,
  type ZougenHanbaitenQuery,
  type ZougenPreviewData,
  type ZougenAddressChangeRow,
} from '@/api/report/report';
import { getHanbaitenDropdown } from '@/api/hanbaiten/hanbaiten';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';

interface SelectOption {
  value: number;
  label: string;
}

const authStore = useAuthStore();
const notify = useNotify();

/** report.export_zougen_hanbaiten は JAアカウントのみ保持（§1.2）。 */
const canUse = computed(() =>
  authStore.hasPermission('report.export_zougen_hanbaiten'),
);

const formState = reactive<{
  tekiyo_date: string;
  hanbaiten_id: number[];
  kanri_shiten_id: number[];
}>({
  tekiyo_date: '',
  hanbaiten_id: [],
  kanri_shiten_id: [],
});

const fieldErrors = reactive<{ tekiyo_date: string }>({ tekiyo_date: '' });

const previewData = ref<ZougenPreviewData | null>(null);
/** 対象データなし（BE が 200 + reports:[] を返す）→ ACSMS-MSG-028-002 を表示。 */
const noDataMessage = ref(false);

const hanbaitenOptions = ref<SelectOption[]>([]);
const kanriShitenOptions = ref<SelectOption[]>([]);

const hasReports = computed(
  () => previewData.value !== null && previewData.value.reports.length > 0,
);

/** 適用日 YYYY-MM-DD → 「YYYY年M月D日」（帳票の日付表記）。 */
function formatJpDate(iso: string): string {
  const [y, m, d] = (iso ?? '').split('-');
  if (!y || !m || !d) return iso ?? '';
  return `${y}年${Number(m)}月${Number(d)}日`;
}

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
  // ?.trim() — <a-date-picker> の × クリアで undefined になるため。
  if (!formState.tekiyo_date?.trim()) {
    fieldErrors.tekiyo_date = '必須項目です。'; // ACSMS-MSG-028-004
  }
  return !fieldErrors.tekiyo_date;
}

function buildQuery(): ZougenHanbaitenQuery {
  const q: ZougenHanbaitenQuery = { tekiyo_date: formState.tekiyo_date };
  // 未選択（空配列）は全件対象 → パラメータを送らない。
  if (formState.hanbaiten_id.length > 0) q.hanbaiten_id = formState.hanbaiten_id;
  if (formState.kanri_shiten_id.length > 0) {
    q.kanri_shiten_id = formState.kanri_shiten_id;
  }
  return q;
}

async function onPreview(): Promise<void> {
  if (!validate()) return;
  noDataMessage.value = false;
  try {
    const resp = await previewZougenHanbaiten(buildQuery());
    previewData.value = resp.data;
    // 対象0件は 200 + reports:[] で返る（業務エラーではない）→ 画面内テキスト。
    if (resp.data.reports.length === 0) noDataMessage.value = true;
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。ローカル状態のみ整理。
    previewData.value = null;
  }
}

async function onExport(): Promise<void> {
  if (!validate()) return;
  try {
    const blob = await exportZougenHanbaiten(buildQuery());
    // 対象0件のとき BE は PDF ではなく application/json を返す。その場合は
    // ダウンロードせず画面内テキスト（対象のデータが存在しません。）を表示。
    if (blob.type.includes('application/json')) {
      previewData.value = null;
      noDataMessage.value = true;
      return;
    }
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const [y, m, d] = formState.tekiyo_date.split('-');
    link.download = `増減連絡票_販売店_${y}年${m}月${d}日.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
    notify.downloaded();
  } catch {
    // 403/500 はインターセプタがトースト済み。ローカル状態のみ整理。
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

        <!-- ② 販売店（左 2/3）／③ 管理支店（右 1/3） -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <!-- 販売店（任意・複数選択可。廃店は除外済みの一覧）。件数が多いため
               内側を複数列に折り返し、高さ上限＋スクロールで間延びを防ぐ。 -->
          <div class="md:col-span-2">
            <div class="text-sm font-medium text-text-main mb-2">販売店</div>
            <a-checkbox-group
              v-model:value="formState.hanbaiten_id"
              :options="hanbaitenOptions"
              class="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 max-h-56 overflow-y-auto pr-2"
              data-test="hanbaiten-checkbox"
            />
          </div>

          <!-- 管理支店（任意・複数選択可） -->
          <div>
            <div class="text-sm font-medium text-text-main mb-2">管理支店</div>
            <a-checkbox-group
              v-model:value="formState.kanri_shiten_id"
              :options="kanriShitenOptions"
              class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-2"
              data-test="kanri-shiten-checkbox"
            />
          </div>
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
          v-for="(report, ri) in previewData?.reports ?? []"
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
              <div>Page：{{ ri + 1 }}/{{ previewData?.reports.length ?? 1 }}</div>
            </div>
          </div>

          <!-- 販売店情報 / 管理支店情報 -->
          <div class="flex justify-between items-start mb-1">
            <div class="text-base font-bold mt-4 text-text-main">
              {{ report.hanbaiten_name }}　御中
              <span class="font-normal text-xs ml-2 text-text-description">
                TEL：{{ report.kanri_shiten_tel || '-' }}　　FAX：{{ report.kanri_shiten_fax || '-' }}
              </span>
            </div>
            <div class="text-xs text-right leading-relaxed text-text-description">
              <div>{{ report.kanri_shiten_name || '（管理支店）' }}</div>
              <div>TEL：{{ report.kanri_shiten_tel || '-' }}</div>
              <div>FAX：{{ report.kanri_shiten_fax || '-' }}</div>
            </div>
          </div>

          <!-- 適用日 + 定型文 -->
          <div class="text-sm mb-5 text-text-main">
            <span class="mr-4">{{ formatJpDate(previewData?.tekiyo_date ?? '') }}</span>
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
        </div>
      </div>
    </div>
  </div>
</template>
