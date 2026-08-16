<script setup lang="ts">
import BaseCard from './BaseCard.vue';

interface Props {
  loading?: boolean;
  /** 入力グリッドの列数。既定 4（ACSMS-SCR-004 JA一覧）。
      ACSMS-SCR-002 単価一覧は 種別 / 名 / 開始日 / 終了日 / フラグ を収めるため 5 列。 */
  columns?: 1 | 2 | 3 | 4 | 5;
  /**
   * `loading` とは独立に 検索 ボタンを無効化。ACSMS-SCR-015 は一括置換をステージ中（1行以上チェック）に
   * 検索を無効化し、再クエリで選択を失わないようにする。
   */
  disableSubmit?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  columns: 4,
  disableSubmit: false,
});

const emit = defineEmits<{
  search: [];
  clear: [];
}>();

/**
 * 列数はビューポート幅ではなく **カード自身の幅**（`@container`）で決める。
 *
 * ビューポート幅は使えない: サイドバー `w-72`(288px) はレイアウトから引かれるが
 * `lg:` は 1024px の *ビューポート* で発火する。iPad 縦(1024px)＋サイドバー展開だと
 * カード実幅は約 640px しかなく、`@4xl:grid-cols-4` は 1 列 ≈148px になり
 * `<a-select>` が「選…」まで潰れる（実機確認 2026-08）。サイドバーの開閉でも
 * 同じ問題が起きるため、ビューポート基準では原理的に直せない。
 *
 * コンテナ基準なら 1 列あたり ~200px 以上を保証できる:
 *   @lg (512px)  → 2 列 = 各 ~248px
 *   @4xl (896px) → 4 列 = 各 ~212px
 *   @6xl (1152px)→ 5 列 = 各 ~214px
 */
const gridClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @lg:grid-cols-2',
  3: 'grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3',
  4: 'grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4',
  5: 'grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 @6xl:grid-cols-5',
};
</script>

<template>
  <BaseCard>
    <form
      class="@container space-y-4"
      @submit.prevent="emit('search')"
    >
      <!-- items-start（items-center ではない）: セルの高さは中身次第で変わる
           — ラジオが折り返る / インラインバリデーションメッセージが出る /
           チェックボックス1行だけ、など。items-center だと背の低いセルが
           行の高さに合わせて縦中央へ落ち、隣とラベルの高さが食い違って見える
           （顧客指摘 2026-08: 廃店フラグ が 有効単価フラグ とずれる）。
           上端揃えなら全セルのラベルが必ず1行目に並ぶ。 -->
      <div :class="['grid gap-x-4 gap-y-3 items-start', gridClass[props.columns]]">
        <slot />
      </div>

      <div class="flex flex-wrap gap-3">
        <a-button
          type="primary"
          html-type="submit"
          :loading="props.loading"
          :disabled="props.disableSubmit"
          class="font-bold"
        >
          検索
        </a-button>
        <a-button
          html-type="button"
          @click="emit('clear')"
        >
          検索クリア
        </a-button>
        <!-- 追加ボタン（例: CSV出力） -->
        <slot name="extra" />
      </div>
    </form>
  </BaseCard>
</template>
