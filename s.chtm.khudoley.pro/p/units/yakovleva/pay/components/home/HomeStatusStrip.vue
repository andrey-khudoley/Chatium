<template>
  <section class="status-strip" aria-label="Состояние конфигурации">
    <div class="status-chips">
      <span :class="['chip', 'config-status', allConfigured ? 'is-ok' : 'is-warn']" tabindex="0">
        <i class="fas" :class="allConfigured ? 'fa-check' : 'fa-triangle-exclamation'"></i>
        <span>{{ allConfigured ? 'Настройки выполнены успешно' : 'Требуется настройка' }}</span>
        <span v-if="!allConfigured" class="config-status-tooltip" role="tooltip">
          <span class="config-status-tooltip-title">Не хватает для зелёного статуса:</span>
          <ul>
            <li v-for="m in missingConfig" :key="m">{{ m }}</li>
          </ul>
        </span>
      </span>
    </div>
    <div class="status-webhook">
      <span class="status-webhook-label"> <i class="fas fa-link"></i> Base URL </span>
      <code class="status-webhook-url">{{ baseUrl }}</code>
      <button type="button" class="btn-mini" @click="$emit('copy', baseUrl)" title="Скопировать">
        <i class="far fa-copy"></i>
      </button>
    </div>
  </section>
</template>

<script>
// Полоса статуса конфигурации (зелёный/жёлтый чип + Base URL для webhook).
// Все данные — пропами, копирование — emit copy. CSS глобальный (sbpHomeCss*).
export default {
  name: 'HomeStatusStrip',
  props: {
    allConfigured: { type: Boolean, default: false },
    missingConfig: { type: Array, default: () => [] },
    baseUrl: { type: String, default: '' }
  },
  emits: ['copy']
}
</script>
