<script setup lang="ts">
// ACSMS-SCR-013 — 購読者履歴情報画面.
//
// Read-only paginated history list for a single 購読者. The dokusya_id
// comes from the route param `:id`; on mount the view fetches
// GET /api/v1/dokusya/:id/rireki (newest 履歴番号 first) and renders the
// 履歴一覧 table. m_code columns (mail_magazine_flg / gender /
// tetsuzuki_shurui / hikiotoshi_yokin_shubetsu) resolve to labels via
// useCodesStore — the BE returns code values only.
//
// 前の画面に戻る returns to the previous screen (購読者情報登録画面)
// with no confirm dialog (screen-design 機能定義 2.1).

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { TableColumnsType } from 'ant-design-vue';

import BaseDataTable from '@/components/common/BaseDataTable.vue';
import { useTableQuery } from '@/composables/useTableQuery';
import { useCodesStore } from '@/stores/codes.store';
import { formatDate } from '@/utils/formatters';
import {
  getDokusyaRirekiList,
  type DokusyaRirekiItem,
} from '@/api/dokusya/dokusya';

const route = useRoute();
const router = useRouter();
const codes = useCodesStore();

/** dokusya_id from the route path param `:id`. */
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

// Only columns whose key is in the BE sort allow-list
// (api.md §4.1 — {rireki_no, dokusya_kaishi_date, joho_henko_tekiyo_date,
// created_at}) carry `sorter: true`.
const columns: TableColumnsType = [
  { title: '履歴番号', dataIndex: 'rireki_no', key: 'rireki_no', sorter: true, width: 90 },
  { title: '管理支店', dataIndex: 'kanri_shiten_name', key: 'kanri_shiten_name', width: 160 },
  { title: '支店名', dataIndex: 'shiten_name', key: 'shiten_name', width: 140 },
  { title: '組合員コード', dataIndex: 'kumiaiin_code', key: 'kumiaiin_code', width: 140 },
  { title: '購読者名', key: 'full_name', width: 140 },
  { title: '購読者住所', key: 'kodoku_jusho', width: 220 },
  { title: '連絡先１', dataIndex: 'renrakusaki_1', key: 'renrakusaki_1', width: 130 },
  { title: '連絡先２', dataIndex: 'renrakusaki_2', key: 'renrakusaki_2', width: 130 },
  { title: 'メールアドレス', dataIndex: 'email', key: 'email', width: 180 },
  { title: 'メールマガジンフラグ（コード名称）', key: 'mail_magazine_flg', width: 220 },
  { title: '生年', dataIndex: 'birth_year', key: 'birth_year', width: 90 },
  { title: '性別', key: 'gender', width: 90 },
  { title: '購読者層分類', dataIndex: 'dokusyaso_bunrui', key: 'dokusyaso_bunrui', width: 150 },
  { title: '農業者分類', dataIndex: 'nogyosya_bunrui', key: 'nogyosya_bunrui', width: 150 },
  { title: '購読部数', dataIndex: 'dokusya_busu', key: 'dokusya_busu', width: 100 },
  { title: '前回購読部数', dataIndex: 'zenkai_dokusya_busu', key: 'zenkai_dokusya_busu', width: 120 },
  { title: '配達先氏名', key: 'haitatsu_shimei', width: 140 },
  { title: '配達先郵便', dataIndex: 'haitatsu_yubin_no', key: 'haitatsu_yubin_no', width: 120 },
  { title: '前回配達先郵便', dataIndex: 'zenkai_yubin_no', key: 'zenkai_yubin_no', width: 130 },
  { title: '配達先住所', key: 'haitatsu_jusho', width: 220 },
  { title: '前回配達先住所', key: 'zenkai_haitatsu_jusho', width: 220 },
  { title: '販売店名', dataIndex: 'hanbaiten_name', key: 'hanbaiten_name', width: 150 },
  { title: '前回販売店名', dataIndex: 'zenkai_hanbaiten_name', key: 'zenkai_hanbaiten_name', width: 150 },
  { title: '手続種別', key: 'tetsuzuki_shurui', width: 110 },
  { title: '購読開始日', key: 'shoki_dokusya_kaishi_date', width: 120 },
  { title: '購読中止日', key: 'dokusya_chushi_date', width: 120 },
  { title: '変更適用日', key: 'joho_henko_tekiyo_date', sorter: true, width: 120 },
  { title: '最新データフラグ', key: 'saishin_data_flg', width: 130 },
  { title: '増減報告フラグ', key: 'zougen_hokoku_flg', width: 130 },
  { title: '新規フラグ', key: 'shinki_flg', width: 110 },
  { title: '解約フラグ', key: 'kaiyaku_flg', width: 110 },
  { title: '引落口座貯金種目', key: 'hikiotoshi_yokin_shubetsu', width: 140 },
  { title: '引落元口座店舗コード', dataIndex: 'bank_branch_code', key: 'bank_branch_code', width: 170 },
  { title: '引落元口座店舗名', dataIndex: 'bank_branch_name', key: 'bank_branch_name', width: 160 },
  { title: '引落口座番号', dataIndex: 'hikiotoshi_koza_no', key: 'hikiotoshi_koza_no', width: 130 },
  { title: '引落口座名義', dataIndex: 'hikiotoshi_koza_meigi', key: 'hikiotoshi_koza_meigi', width: 150 },
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
    // Expected & ignored: the global axios interceptor in
    // src/api/error-handler.ts already toasted FORBIDDEN / 500 /
    // ACSMS-MSG-013-002. Re-throwing would surface an unhandled
    // rejection in onMounted's fire-and-forget invocation. This is the
    // "expected and intentionally ignored" exception from
    // .claude/rules/vue.md §Error Handling Architecture.
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

    <!-- 機能定義 2.1 — 確認ダイアログ無しで前の画面に戻る。 -->
    <div class="pt-4 mt-4 border-t border-border flex items-center justify-start gap-2">
      <a-button @click="goBack">前の画面に戻る</a-button>
    </div>
  </div>
</template>
