<script setup lang="ts">
// Карточка «Счётчики» — отображение значений ошибок/предупреждений и кнопка сброса.
// Значения приходят из родителя (обновляются по входящим записям логов).
defineProps<{
  errorCount: number
  warnCount: number
}>()

defineEmits<{ (e: 'reset'): void }>()
</script>

<template>
  <section class="ap-card ap-card--stagger-1">
    <div class="ap-card-hd">
      <h2><i class="fas fa-chart-bar ap-icon-hd"></i> Счётчики</h2>
      <button type="button" class="ap-btn ap-btn--sm" @click="$emit('reset')">
        <i class="fas fa-redo-alt"></i> Сброс
      </button>
    </div>
    <div class="ap-meters">
      <div class="ap-meter ap-meter--err">
        <div class="ap-meter-accent"></div>
        <div class="ap-meter-body">
          <strong>{{ errorCount }}</strong>
          <span><i class="fas fa-times-circle"></i> Ошибки</span>
        </div>
      </div>
      <div class="ap-meter ap-meter--wrn">
        <div class="ap-meter-accent"></div>
        <div class="ap-meter-body">
          <strong>{{ warnCount }}</strong>
          <span><i class="fas fa-exclamation-triangle"></i> Предупреждения</span>
        </div>
      </div>
    </div>
  </section>
</template>
