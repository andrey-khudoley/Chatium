<template>
  <div class="min-h-screen flex flex-col" style="background: var(--wr-bg)">
    <!-- Header -->
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-end">
        <HeaderActions />
      </div>
    </header>

    <!-- Error message -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="text-center max-w-md">
        <div class="w-24 h-24 rounded-3xl glass mx-auto mb-8 flex items-center justify-center">
          <i class="fas fa-exclamation-triangle text-yellow-500 text-4xl"></i>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-4 wr-text-primary">Неправильная ссылка</h1>
        <p class="text-lg wr-text-tertiary mb-6">
          Похоже, вы перешли по неправильной ссылке. Чтобы попасть на вебинар, используйте прямую
          ссылку на эфир.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import HeaderActions from '../components/HeaderActions.vue'
import { initThemeWatcher } from '../shared/theme'

initThemeWatcher()
</script>
