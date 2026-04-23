<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';

const { user } = useAuth();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">ダッシュボード</h1>

    <p class="text-gray-600 mb-8">
      ようこそ、{{ user?.loginId ?? 'ユーザー' }} さん
    </p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <a-card title="購読者数" :bordered="false" class="shadow-sm">
        <p class="text-3xl font-bold text-blue-600">--</p>
      </a-card>
      <a-card title="販売店数" :bordered="false" class="shadow-sm">
        <p class="text-3xl font-bold text-green-600">--</p>
      </a-card>
      <a-card title="今月の増減" :bordered="false" class="shadow-sm">
        <p class="text-3xl font-bold text-orange-600">--</p>
      </a-card>
    </div>
  </div>
</template>
