<template>
  <div class="min-h-screen flex flex-col" style="background: var(--wr-bg)">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-end">
        <HeaderActions />
      </div>
    </header>

    <div class="flex-1 flex items-center justify-center p-6">
      <div class="text-center max-w-md">
        <div class="w-24 h-24 rounded-3xl glass mx-auto mb-8 flex items-center justify-center">
          <span class="text-5xl font-black text-gradient">404</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-4 wr-text-primary">Страница не найдена</h1>
        <p class="text-lg wr-text-tertiary mb-6">{{ message }}</p>
        <p class="text-sm wr-text-muted">
          Если вы уверены, что ссылка верная — попробуйте обновить страницу или обратитесь к
          организатору мероприятия.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import HeaderActions from '../components/HeaderActions.vue'
import { initThemeWatcher } from '../shared/theme'

const props = defineProps({
  message: {
    type: String,
    default: 'Возможно, вы перешли по неверной ссылке или эфир больше недоступен.'
  }
})

initThemeWatcher()
</script>
