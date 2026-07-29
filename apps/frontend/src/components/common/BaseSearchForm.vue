<script setup lang="ts">
import BaseCard from './BaseCard.vue';

interface Props {
  loading?: boolean;
  /** 入力グリッドの列数。既定 4（SCR-004 JA一覧）。
      SCR-002 単価一覧は 種別 / 名 / 開始日 / 終了日 / フラグ を収めるため 5 列。 */
  columns?: 1 | 2 | 3 | 4 | 5;
  /**
   * `loading` とは独立に 検索 ボタンを無効化。SCR-015 は一括置換をステージ中（1行以上チェック）に
   * 検索を無効化し、再クエリで選択を失わないようにする。
   */
  disableSubmit?: boolean;
  /**
   * グリッドセルを縦中央でなく上揃えにする。入力下にインラインバリデーションメッセージを
   * 表示し得るフィールド（例: SCR-015）で使う。既定の `items-center` では 1 セルが
   * メッセージで縦に伸びると兄弟セルが再中央寄せされラベルがずれる。`items-start` は
   * 全ラベルを上段に固定する。
   */
  alignStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  columns: 4,
  disableSubmit: false,
  alignStart: false,
});

const emit = defineEmits<{
  search: [];
  clear: [];
}>();

const gridClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
};
</script>

<template>
  <BaseCard>
    <form
      class="space-y-4"
      @submit.prevent="emit('search')"
    >
      <div :class="['grid gap-x-4 gap-y-3', props.alignStart ? 'items-start' : 'items-center', gridClass[props.columns]]">
        <slot />
      </div>

      <div class="flex gap-3">
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
