<script setup lang="ts">
// Тулбар страницы тестов: вкладки (Юнит/Интеграция/HTTP/Тест запроса), время
// последнего прогона и кнопки запуска. Состояние — из useTestSuites через родителя.
// Вкладка «Тест запроса» показывается только админу при непустом каталоге операций.
// CSS глобальный (.tp-*).
const props = defineProps<{
  testsSuiteTab: 'unit' | 'integration' | 'http' | 'request-test'
  lastSuiteRunAt: string | null
  runTabTestsLoading: boolean
  runAllTestsLoading: boolean
  unitLoading: boolean
  integrationLoading: boolean
  httpPagesLoading: boolean
  tabRunButtonIdleLabel: string
  isRequestTestTab: boolean
  showRequestTestTab: boolean
}>()

defineEmits<{
  (e: 'set-tab', tab: 'unit' | 'integration' | 'http' | 'request-test'): void
  (e: 'run-tab'): void
  (e: 'run-all'): void
}>()
</script>

<template>
  <div class="tp-toolbar">
    <div class="tp-toolbar-left">
      <i class="fas fa-flask tp-icon-muted"></i>
      <span class="tp-path">/web/tests</span>
      <div class="tp-tabs">
        <button
          type="button"
          class="tp-tab"
          :class="{ active: props.testsSuiteTab === 'unit' }"
          @click="$emit('set-tab', 'unit')"
        >
          <i class="fas fa-cube tp-icon-tab"></i> Юнит
        </button>
        <button
          type="button"
          class="tp-tab"
          :class="{ active: props.testsSuiteTab === 'integration' }"
          @click="$emit('set-tab', 'integration')"
        >
          <i class="fas fa-network-wired tp-icon-tab"></i> Интеграция
        </button>
        <button
          type="button"
          class="tp-tab"
          :class="{ active: props.testsSuiteTab === 'http' }"
          @click="$emit('set-tab', 'http')"
        >
          <i class="fas fa-globe tp-icon-tab"></i> HTTP
        </button>
        <button
          v-if="props.showRequestTestTab"
          type="button"
          class="tp-tab"
          :class="{ active: props.testsSuiteTab === 'request-test' }"
          @click="$emit('set-tab', 'request-test')"
        >
          <i class="fas fa-paper-plane tp-icon-tab"></i> Тест запроса
        </button>
      </div>
    </div>
    <div class="tp-toolbar-right">
      <span v-if="props.lastSuiteRunAt" class="tp-last-run"
        ><i class="fas fa-clock tp-icon-muted"></i> {{ props.lastSuiteRunAt }}</span
      >
      <button
        v-if="!props.isRequestTestTab"
        type="button"
        class="tp-btn tp-btn--primary"
        :disabled="
          props.runTabTestsLoading ||
          props.runAllTestsLoading ||
          (props.testsSuiteTab === 'unit' && props.unitLoading) ||
          (props.testsSuiteTab === 'integration' && props.integrationLoading) ||
          (props.testsSuiteTab === 'http' && props.httpPagesLoading)
        "
        @click="$emit('run-tab')"
      >
        <i v-if="props.runTabTestsLoading" class="fas fa-circle-notch fa-spin"></i>
        <i v-else class="fas fa-play"></i>
        {{ props.runTabTestsLoading ? 'Запуск...' : props.tabRunButtonIdleLabel }}
      </button>
      <button
        type="button"
        class="tp-btn"
        :disabled="props.runAllTestsLoading || props.runTabTestsLoading"
        @click="$emit('run-all')"
      >
        <i v-if="props.runAllTestsLoading" class="fas fa-circle-notch fa-spin"></i>
        <i v-else class="fas fa-bolt"></i>
        {{ props.runAllTestsLoading ? 'Полный...' : 'Полный прогон' }}
      </button>
    </div>
    <div class="tp-toolbar-sweep"></div>
  </div>
</template>
