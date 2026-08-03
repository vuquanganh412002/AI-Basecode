<script setup lang="ts">
// ACSMS-SCR-013 — 購読者履歴情報画面。
//
// 単一購読者の読取専用・ページング履歴一覧。dokusya_id は route param `:id`。
// mount 時に GET /api/v1/dokusya/:id/rireki（履歴番号降順）を取得し履歴一覧を描画。
// m_code 列（mail_magazine_flg / gender / tetsuzuki_shurui /
// hikiotoshi_yokin_shubetsu）は useCodesStore でラベル解決（BE はコード値のみ返す）。
//
// 前の画面に戻る は確認ダイアログ無しで前画面（購読者情報登録画面）へ戻る
// （screen-design 機能定義 2.1）。

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TableColumnsType } from 'ant-design-vue';

import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useCodesStore } from '@/stores/codes.store';
import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import { formatDate, formatYen } from '@/utils/formatters';
import {
  dokusyaSoBunruiLabel,
  nogyosyaBunruiLabel,
} from '@/constants/dokusya-bunrui';
import { denshiShoninStatusLabel } from '@/constants/denshi-shonin-status-labels';
import {
  getDokusyaRirekiList,
  torikeshiDokusyaRireki,
  type DokusyaRirekiItem,
} from '@/api/dokusya/dokusya';

const route = useRoute();
const router = useRouter();
const codes = useCodesStore();
const authStore = useAuthStore();
const notify = useNotify();

// 取消(赤伝)は購読者編集操作 → dokusya.update 権限が必要。無い場合はボタンを
// disable する（BE も PermissionsGuard で再検証）。
const canUpdate = computed(() => authStore.hasPermission('dokusya.update'));

/** route path param `:id` から得る dokusya_id。 */
const dokusyaId = computed(() => Number(route.params.id));

const { state, loading, total, onChange } = useTableQuery<Record<string, never>>(
  {
    defaultFilters: {},
    // 機能定義 1.2 — 履歴番号降順で最新レコードを先頭に表示。
    defaultSortBy: 'rireki_no',
    defaultSortOrder: 'desc',
  },
);

const rows = ref<DokusyaRirekiItem[]>([]);

// BE のソート許可リスト（api.md §4.1 — {rireki_no, dokusya_kaishi_date,
// joho_henko_tekiyo_date, created_at}）にある列のみ sorter: true。
const columns: TableColumnsType = [
  { title: '履歴番号', dataIndex: 'rireki_no', key: 'rireki_no', sorter: true, width: 90 },
  // 履歴番号 の直後に 購読種別 → 電子版読者種別 → 電子申込承認ステータス の順で
  // 並べ、手続種別 をその後ろへ（顧客要件 SCR-013）。
  { title: '購読種別', key: 'dokusya_shubetsu', width: 110 },
  { title: '電子版読者種別', key: 'denshi_dokusya_shubetsu', width: 140 },
  { title: '電子申込承認ステータス', key: 'denshi_shonin_status', width: 180 },
  { title: '手続種別', key: 'tetsuzuki_shurui', width: 110 },
  { title: '管理支店', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', width: 160 },
  { title: '支店名', dataIndex: 'shiten_name', key: 'shiten_name', width: 140 },
  { title: '組合員コード', dataIndex: 'kumiaiin_code', key: 'kumiaiin_code', width: 140 },
  { title: '購読者名', key: 'full_name', width: 140 },
  { title: '購読者住所', key: 'kodoku_jusho', width: 220 },
  { title: '連絡先１', dataIndex: 'renrakusaki_1', key: 'renrakusaki_1', width: 130 },
  { title: '連絡先２', dataIndex: 'renrakusaki_2', key: 'renrakusaki_2', width: 130 },
  { title: 'メールアドレス', dataIndex: 'email', key: 'email', width: 180 },
  { title: 'メールマガジンフラグ', key: 'mail_magazine_flg', width: 180 },
  { title: '生年', dataIndex: 'birth_year', key: 'birth_year', width: 90 },
  { title: '性別', key: 'gender', width: 90 },
  { title: '購読者層分類', dataIndex: 'dokusyaso_bunrui', key: 'dokusyaso_bunrui', width: 150 },
  { title: '農業者分類', dataIndex: 'nogyosya_bunrui', key: 'nogyosya_bunrui', width: 150 },
  // 新聞単価（単価名 + 半角スペース + 金額）を 購読部数 の前に追加。
  { title: '新聞単価', key: 'tanka', width: 180 },
  { title: '購読部数', dataIndex: 'dokusya_busu', key: 'dokusya_busu', width: 100 },
  { title: '前回購読部数', dataIndex: 'zenkai_dokusya_busu', key: 'zenkai_dokusya_busu', width: 120 },
  { title: '配達先氏名', key: 'haitatsu_shimei', width: 140 },
  { title: '配達先郵便', dataIndex: 'haitatsu_yubin_no', key: 'haitatsu_yubin_no', width: 120 },
  { title: '前回配達先郵便', dataIndex: 'zenkai_yubin_no', key: 'zenkai_yubin_no', width: 130 },
  { title: '配達先住所', key: 'haitatsu_jusho', width: 220 },
  { title: '前回配達先住所', key: 'zenkai_haitatsu_jusho', width: 220 },
  { title: '販売店名', dataIndex: 'hanbaiten_name', key: 'hanbaiten_name', width: 150 },
  { title: '前回販売店名', dataIndex: 'zenkai_hanbaiten_name', key: 'zenkai_hanbaiten_name', width: 150 },
  // 初回購読開始日（shoki）を 前回販売店名 の後・増部日 の前へ移動（旧「購読開始日」を改称）。
  { title: '初回購読開始日', key: 'shoki_dokusya_kaishi_date', width: 130 },
  // 増部日 / 減部日 は 読者情報変更適用日 を条件付きで表示（部数の増減時のみ）。
  { title: '増部日', key: 'zoubu_date', width: 120 },
  { title: '減部日', key: 'genbu_date', width: 120 },
  { title: '購読中止日', key: 'dokusya_chushi_date', width: 120 },
  { title: '変更適用日', key: 'joho_henko_tekiyo_date', sorter: true, width: 120 },
  { title: '最新データフラグ', key: 'saishin_data_flg', width: 130 },
  { title: '増減報告フラグ', key: 'zougen_hokoku_flg', width: 130 },
  { title: '新規フラグ', key: 'shinki_flg', width: 110 },
  { title: '解約フラグ', key: 'kaiyaku_flg', width: 110 },
  { title: '取消フラグ', key: 'torikeshi_flg', width: 110 },
  // 支払い方法 / 郵送区分 / 購読料支払いサイクル を 引落口座貯金種目 の前に追加。
  { title: '支払い方法', key: 'shiharai_hoho', width: 130 },
  { title: '郵送区分', key: 'yubin_kubun', width: 110 },
  { title: '購読料支払いサイクル', dataIndex: 'dokusyaryo_shiharai_cycle', key: 'dokusyaryo_shiharai_cycle', align: 'center', width: 160 },
  { title: '引落口座貯金種目', key: 'hikiotoshi_yokin_shubetsu', width: 140 },
  { title: '引落元口座店舗コード', dataIndex: 'bank_branch_code', key: 'bank_branch_code', width: 170 },
  { title: '引落元口座店舗名', dataIndex: 'bank_branch_name', key: 'bank_branch_name', width: 160 },
  { title: '引落口座番号', dataIndex: 'hikiotoshi_koza_no', key: 'hikiotoshi_koza_no', width: 130 },
  { title: '引落口座名義', dataIndex: 'hikiotoshi_koza_meigi', key: 'hikiotoshi_koza_meigi', width: 150 },
  // 備考 は最終データ列（操作ボタンの前）。
  { title: '備考', dataIndex: 'biko', key: 'biko', width: 200 },
  // 操作列は右端に固定(fixed:'right')— 横スクロールしても常に表示される。
  { title: '操作', key: 'torikeshi_action', width: 100, fixed: 'right', align: 'center' },
];

// ─── Cell formatting helpers ─────────────────────────────────────────

function fullName(r: DokusyaRirekiItem): string {
  return `${r.shimei_sei} ${r.shimei_mei}`.trim();
}

function haitatsuShimei(r: DokusyaRirekiItem): string {
  return `${r.haitatsu_shimei_sei} ${r.haitatsu_shimei_mei}`.trim();
}

function joinAddress(
  todofuken: string | null,
  shikuchoson: string | null,
  chomeBanchi: string | null,
  tatemono: string | null,
): string {
  return `${todofuken ?? ''}${shikuchoson ?? ''}${chomeBanchi ?? ''}${tatemono ?? ''}`;
}

function flagLabel(value: boolean): string {
  return value ? 'はい' : 'いいえ';
}

/** 新聞単価表示: 単価名 + 半角スペース + 金額（金額は BE が JA 税区分で解決済み）。 */
function tankaLabel(r: DokusyaRirekiItem): string {
  return [r.tanka_name, formatYen(r.tanka_kingaku)].filter(Boolean).join(' ');
}

/**
 * 増部日: この行の購読部数が前回より増えたとき、その変更が効く日
 * （t_dokusya_rireki.joho_henko_tekiyo_date）を表示する。前回部数が null
 * （新規作成・再購読の初回行＝0→N の増加）も増部として扱う。それ以外は空欄。
 *
 * 参照するのは購読開始日ではなく**読者情報変更適用日**（顧客要件 2026-08）。
 * 購読開始日は購読者が読み始めた日で、途中の部数変更では動かない。増減が
 * 実際に効くのは変更適用日なので、部数を増やした行でも購読開始日を出すと
 * 「いつ増えたのか」と食い違う。
 */
function zoubuDate(r: DokusyaRirekiItem): string {
  const zenkai = r.zenkai_dokusya_busu;
  if (zenkai == null || r.dokusya_busu > zenkai) {
    return formatDate(r.joho_henko_tekiyo_date);
  }
  return '';
}

/**
 * 減部日: この行の購読部数が前回より減ったとき、その変更が効く日
 * （t_dokusya_rireki.joho_henko_tekiyo_date）を表示する。前回部数が null
 * （新規作成・再購読の初回行）は増部であって減部ではないため空欄にする
 * （顧客要件 SCR-013：新規・再購読は 増部日 のみ表示し、減部日は出さない）。
 */
function genbuDate(r: DokusyaRirekiItem): string {
  const zenkai = r.zenkai_dokusya_busu;
  if (zenkai != null && r.dokusya_busu < zenkai) {
    return formatDate(r.joho_henko_tekiyo_date);
  }
  return '';
}

// ─── Fetch ───────────────────────────────────────────────────────────

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getDokusyaRirekiList(dokusyaId.value, {
      page: state.page,
      per_page: state.per_page,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
    });
    rows.value = res.data;
    total.value = res.meta.total;
  } catch {
    // 想定内・無視: global axios interceptor が FORBIDDEN / 500 /
    // ACSMS-MSG-013-002 をトースト済み。再 throw は onMounted の
    // fire-and-forget で unhandled rejection になる。.claude/rules/vue.md
    // §Error Handling Architecture の「想定内で意図的に無視」ケース。
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchList();
});

function onPageChange(...args: Parameters<typeof onChange>): void {
  onChange(...args);
  void fetchList();
}

function goBack(): void {
  router.back();
}

// ─── 取消(赤伝) ───────────────────────────────────────────────────────
// 対象行を取消できるのは can_torikeshi=true（BE 判定・顧客要件2026-07: 紙版のみ・
// 非新規/非取消済・適用日が未来・チェーン末尾）かつ dokusya.update 権限あり の
// ときのみ。電子版/併読・適用日到来済み・中間レコードは can_torikeshi=false。
// ボタンは常に表示し、条件を満たさない行では disable する（機能を隠さず明示）。

const REASON_REQUIRED_MSG = '取消理由を入力してください。';
const REASON_MAX = 500;
const REASON_MAX_MSG = '取消理由は500文字以内で入力してください。';

const torikeshiTarget = ref<DokusyaRirekiItem | null>(null);
const torikeshiReason = ref('');
const torikeshiError = ref('');
const torikeshiSubmitting = ref(false);
const torikeshiOpen = computed(() => torikeshiTarget.value !== null);

/** この行を取消できるか（BE の can_torikeshi + FE 権限チェック）。*/
function canCancel(r: DokusyaRirekiItem): boolean {
  return r.can_torikeshi && canUpdate.value;
}

/** 取消ボタン押下 → 確認ダイアログを開き、取消理由の入力を促す。*/
function askTorikeshi(r: DokusyaRirekiItem): void {
  if (!canCancel(r)) return;
  torikeshiTarget.value = r;
  torikeshiReason.value = '';
  torikeshiError.value = '';
}

function closeTorikeshi(): void {
  torikeshiTarget.value = null;
  torikeshiReason.value = '';
  torikeshiError.value = '';
}

/** 取消理由の FE 検証（BE の DTO と同一ルール）。*/
function validateReason(): boolean {
  const reason = torikeshiReason.value.trim();
  if (!reason) {
    torikeshiError.value = REASON_REQUIRED_MSG;
    return false;
  }
  if (reason.length > REASON_MAX) {
    torikeshiError.value = REASON_MAX_MSG;
    return false;
  }
  torikeshiError.value = '';
  return true;
}

async function confirmTorikeshi(): Promise<void> {
  const target = torikeshiTarget.value;
  if (!target || !validateReason()) return;
  torikeshiSubmitting.value = true;
  try {
    const res = await torikeshiDokusyaRireki(
      dokusyaId.value,
      target.dokusya_rireki_id,
      torikeshiReason.value.trim(),
    );
    notify.success(res.message ?? '取消しました。');
    closeTorikeshi();
    await fetchList();
  } catch {
    // TORIKESHI_NOT_ALLOWED / 404 / 500 は axios インターセプタが既にトースト
    // 済み（.claude/rules/vue.md §Error Handling）。モーダルは開いたままにして
    // ユーザーが理由を修正・再試行できるようにする。
  } finally {
    torikeshiSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- ACSMS-MSG-013-001 — empty-result message rendered separately
         (BaseDataTable's dynamic slot loop can't forward a-table's
         #emptyText slot safely). -->
    <p
      v-if="!loading && total === 0"
      class="text-text-description text-sm"
      data-test="rireki-empty-message"
    >
      履歴データが存在しません。
    </p>

    <BaseDataTable
      title="履歴一覧"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="state.page"
      :per-page="state.per_page"
      :total="total"
      row-key="dokusya_rireki_id"
      @change="onPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'full_name'">
          {{ fullName(record as DokusyaRirekiItem) }}
        </template>
        <template v-else-if="column.key === 'haitatsu_shimei'">
          {{ haitatsuShimei(record as DokusyaRirekiItem) }}
        </template>
        <template v-else-if="column.key === 'kodoku_jusho'">
          {{
            joinAddress(
              (record as DokusyaRirekiItem).todofuken_name,
              (record as DokusyaRirekiItem).shikuchoson,
              (record as DokusyaRirekiItem).chome_banchi,
              (record as DokusyaRirekiItem).tatemono_mei,
            )
          }}
        </template>
        <template v-else-if="column.key === 'haitatsu_jusho'">
          {{
            joinAddress(
              (record as DokusyaRirekiItem).haitatsu_todofuken_name,
              (record as DokusyaRirekiItem).haitatsu_shikuchoson,
              (record as DokusyaRirekiItem).haitatsu_chome_banchi,
              (record as DokusyaRirekiItem).haitatsu_tatemono_mei,
            )
          }}
        </template>
        <template v-else-if="column.key === 'zenkai_haitatsu_jusho'">
          {{
            joinAddress(
              (record as DokusyaRirekiItem).zenkai_todofuken_name,
              (record as DokusyaRirekiItem).zenkai_shikuchoson,
              (record as DokusyaRirekiItem).zenkai_chome_banchi,
              (record as DokusyaRirekiItem).zenkai_tatemono_mei,
            )
          }}
        </template>
        <template v-else-if="column.key === 'mail_magazine_flg'">
          {{ codes.label('MAIL_MAGAZINE_FLG', (record as DokusyaRirekiItem).mail_magazine_flg) }}
        </template>
        <template v-else-if="column.key === 'gender'">
          {{ codes.label('GENDER', (record as DokusyaRirekiItem).gender) }}
        </template>
        <template v-else-if="column.key === 'tetsuzuki_shurui'">
          {{ codes.label('TETSUZUKI_SHURUI', (record as DokusyaRirekiItem).tetsuzuki_shurui) }}
        </template>
        <template v-else-if="column.key === 'dokusya_shubetsu'">
          {{ codes.label('DOKUSYA_SHUBETSU', (record as DokusyaRirekiItem).dokusya_shubetsu) }}
        </template>
        <!-- 電子版読者種別 — 紙版は連携が無いため null（codes.label が '' を返す）。 -->
        <template v-else-if="column.key === 'denshi_dokusya_shubetsu'">
          {{
            codes.label(
              'DENSHI_DOKUSYA_SHUBETSU',
              (record as DokusyaRirekiItem).denshi_dokusya_shubetsu,
            )
          }}
        </template>
        <!-- 電子申込承認ステータス — m_code に無い区分（constants に集約）。 -->
        <template v-else-if="column.key === 'denshi_shonin_status'">
          {{ denshiShoninStatusLabel((record as DokusyaRirekiItem).denshi_shonin_status) }}
        </template>
        <!-- 分類はコード保存 (電子版 profession/products と 1:1) → ラベル表示。 -->
        <template v-else-if="column.key === 'dokusyaso_bunrui'">
          {{ dokusyaSoBunruiLabel((record as DokusyaRirekiItem).dokusyaso_bunrui) }}
        </template>
        <template v-else-if="column.key === 'nogyosya_bunrui'">
          {{ nogyosyaBunruiLabel((record as DokusyaRirekiItem).nogyosya_bunrui) }}
        </template>
        <template v-else-if="column.key === 'tanka'">
          {{ tankaLabel(record as DokusyaRirekiItem) }}
        </template>
        <template v-else-if="column.key === 'zoubu_date'">
          {{ zoubuDate(record as DokusyaRirekiItem) }}
        </template>
        <template v-else-if="column.key === 'genbu_date'">
          {{ genbuDate(record as DokusyaRirekiItem) }}
        </template>
        <template v-else-if="column.key === 'shiharai_hoho'">
          {{ codes.label('SHIHARAI_HOHO', (record as DokusyaRirekiItem).shiharai_hoho) }}
        </template>
        <template v-else-if="column.key === 'yubin_kubun'">
          {{ codes.label('YUBIN_KUBUN', (record as DokusyaRirekiItem).yubin_kubun) }}
        </template>
        <template v-else-if="column.key === 'hikiotoshi_yokin_shubetsu'">
          {{ codes.label('YOKIN_SHUBETSU', (record as DokusyaRirekiItem).hikiotoshi_yokin_shubetsu) }}
        </template>
        <template v-else-if="column.key === 'saishin_data_flg'">
          {{ flagLabel((record as DokusyaRirekiItem).saishin_data_flg) }}
        </template>
        <template v-else-if="column.key === 'zougen_hokoku_flg'">
          {{ flagLabel((record as DokusyaRirekiItem).zougen_hokoku_flg) }}
        </template>
        <template v-else-if="column.key === 'shinki_flg'">
          {{ flagLabel((record as DokusyaRirekiItem).shinki_flg) }}
        </template>
        <template v-else-if="column.key === 'kaiyaku_flg'">
          {{ flagLabel((record as DokusyaRirekiItem).kaiyaku_flg) }}
        </template>
        <template v-else-if="column.key === 'torikeshi_flg'">
          {{ flagLabel((record as DokusyaRirekiItem).torikeshi_flg) }}
        </template>
        <template v-else-if="column.key === 'torikeshi_action'">
          <!-- 取消ボタンは常に表示。can_torikeshi(BE) + dokusya.update 権限を
               満たさない行では disable する（機能を隠さず状態を明示）。 -->
          <a-button
            type="link"
            danger
            size="small"
            :disabled="!canCancel(record as DokusyaRirekiItem)"
            data-test="torikeshi-btn"
            @click="askTorikeshi(record as DokusyaRirekiItem)"
          >
            取消
          </a-button>
        </template>
        <template v-else-if="column.key === 'shoki_dokusya_kaishi_date'">
          {{ formatDate((record as DokusyaRirekiItem).shoki_dokusya_kaishi_date) }}
        </template>
        <template v-else-if="column.key === 'dokusya_chushi_date'">
          {{ formatDate((record as DokusyaRirekiItem).dokusya_chushi_date) }}
        </template>
        <template v-else-if="column.key === 'joho_henko_tekiyo_date'">
          {{ formatDate((record as DokusyaRirekiItem).joho_henko_tekiyo_date) }}
        </template>
      </template>
    </BaseDataTable>

    <!-- 取消(赤伝)確認ダイアログ — 取消理由(必須)を入力して実行する。 -->
    <a-modal
      :open="torikeshiOpen"
      title="履歴の取消（赤伝）"
      ok-text="取消する"
      ok-type="danger"
      cancel-text="キャンセル"
      :confirm-loading="torikeshiSubmitting"
      :mask-closable="false"
      @ok="confirmTorikeshi"
      @cancel="closeTorikeshi"
    >
      <p class="text-text-main mb-2">
        履歴番号
        <span class="font-bold">{{ torikeshiTarget?.rireki_no }}</span>
        を取消します。取消理由を入力してください。
      </p>
      <a-form-item
        :validate-status="torikeshiError ? 'error' : ''"
        :help="torikeshiError"
      >
        <a-textarea
          v-model:value="torikeshiReason"
          :rows="3"
          :maxlength="REASON_MAX"
          placeholder="取消理由を入力してください"
          data-test="torikeshi-reason"
        />
      </a-form-item>
    </a-modal>

    <!-- 機能定義 2.1 — 確認ダイアログ無しで前の画面に戻る。 -->
    <div class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2">
      <a-button @click="goBack">前の画面に戻る</a-button>
    </div>
  </div>
</template>
