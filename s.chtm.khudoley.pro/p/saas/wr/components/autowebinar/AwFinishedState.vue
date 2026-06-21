<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden" style="background: var(--wr-bg)">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        <h1 class="font-semibold text-sm sm:text-base truncate wr-text-primary">
          {{ autowebinar.title }}
        </h1>
        <HeaderActions />
      </div>
    </header>

    <div class="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div
          class="absolute bottom-1/3 right-1/3 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"
        ></div>
      </div>

      <div class="relative z-10 text-center max-w-xl w-full">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <i class="fas fa-check-circle text-sm wr-text-tertiary"></i>
          <span class="text-sm font-medium wr-text-tertiary">Эфир завершён</span>
        </div>

        <h1 class="text-3xl sm:text-4xl font-bold mb-4 leading-tight wr-text-primary">
          {{ autowebinar.title }}
        </h1>

        <p class="text-base sm:text-lg mb-10 leading-relaxed max-w-lg mx-auto wr-text-tertiary">
          {{ resultText }}
        </p>

        <a
          v-if="autowebinar.resultUrl"
          :href="autowebinar.resultUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary text-white font-semibold px-10 py-4 rounded-2xl text-lg inline-flex items-center gap-3 glow-primary-sm"
        >
          {{ resultButtonLabel }}
          <i class="fas fa-arrow-right text-sm"></i>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import HeaderActions from '../HeaderActions.vue'

const props = defineProps({
  autowebinar: { type: Object, required: true }
})

const resultText = computed(
  () => props.autowebinar.resultText || 'Спасибо, что были с нами! Следите за обновлениями.'
)
const resultButtonLabel = computed(() => props.autowebinar.resultButtonText || 'Подробнее')
</script>
