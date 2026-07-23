<script setup lang="ts">
import StatusPanel from './StatusPanel.vue'
import MetricsPanel from './MetricsPanel.vue'
import LogsPanel from './LogsPanel.vue'

// Панель наблюдаемости (§5.11, волна 2.5) — тонкая обёртка (фикс-цикл разбиения,
// standards, лимит 300-400 строк): заголовок + три панели. Каждая панель сама
// импортирует свои @shared-route роуты, держит свои локальные типы и ведёт свой
// автополлинг — межкомпонентная реактивная прокладка (tick-props) не нужна.

const props = defineProps<{
  encodedLogsSocketId: string
}>()
</script>

<template>
  <div
    style="
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
      font-family: monospace;
      color: #ddd;
      background: #111;
    "
  >
    <header style="margin-bottom: 24px">
      <h1 style="font-size: 20px; margin: 0">broker — Admin</h1>
    </header>

    <StatusPanel />
    <MetricsPanel />
    <LogsPanel :encoded-logs-socket-id="props.encodedLogsSocketId" />
  </div>
</template>
