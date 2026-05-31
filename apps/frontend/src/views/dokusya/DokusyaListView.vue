<script setup lang="ts">
// TODO: 購読者明細検索画面 — placeholder until the dedicated SCR ships.
// Real implementation (a CRUD list view paginating GET /api/v1/dokusya)
// will replace this entire file; route name + path stay the same so
// MENU_SECTIONS entries + sidebar / dashboard links keep resolving.
import { useRouter } from 'vue-router';

const router = useRouter();
function goCreate(): void {
  void router.push({ name: 'DokusyaCreate' });
}
</script>

<template>
  <div class="bg-surface-card border border-border rounded-ant shadow-ant-card p-6 max-w-2xl">
    <h3 class="font-bold text-text-main text-lg mb-2">購読者明細検索</h3>
    <p class="text-text-description text-sm mb-4">
      この画面は今後のSCRで実装予定です。現在は購読者情報登録画面への導線のみ提供しています。
    </p>
    <a-button type="primary" @click="goCreate">購読者情報登録画面へ</a-button>
  </div>
</template>
