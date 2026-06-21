<script setup lang="ts">
// Дашборд метрик активной вкладки тестов: всего / прошли / ошибки / не запущены.
// CSS глобальный (классы .tp-* инжектятся на странице тестов).
defineProps<{
  total: number
  passed: number
  failed: number
  skipped: number
}>()
</script>

<template>
  <div class="tp-metrics">
    <div class="tp-metric">
      <i class="fas fa-list-ol tp-metric-icon"></i>
      <strong>{{ total }}</strong>
      <span>всего</span>
    </div>
    <div class="tp-metric tp-metric--pass">
      <div class="tp-metric-accent"></div>
      <i class="fas fa-check-circle tp-metric-icon tp-metric-icon--pass"></i>
      <strong>{{ passed }}</strong>
      <span>прошли</span>
    </div>
    <div class="tp-metric tp-metric--fail">
      <div class="tp-metric-accent"></div>
      <i class="fas fa-times-circle tp-metric-icon tp-metric-icon--fail"></i>
      <strong>{{ failed }}</strong>
      <span>ошибки</span>
    </div>
    <div class="tp-metric tp-metric--skip">
      <div class="tp-metric-accent"></div>
      <i class="fas fa-minus-circle tp-metric-icon tp-metric-icon--skip"></i>
      <strong>{{ skipped }}</strong>
      <span>не запущены</span>
    </div>
  </div>
</template>
