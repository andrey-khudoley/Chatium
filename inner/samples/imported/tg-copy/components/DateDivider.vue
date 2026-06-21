<template>
  <div class="date-divider">
    <span class="date-divider-label">{{ formattedDate }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  date: {
    type: [Date, String],
    required: true
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.date)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // Сегодня
  if (date.toDateString() === now.toDateString()) {
    return 'Сегодня'
  }
  
  // Вчера
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера'
  }
  
  // Этот год — показываем день и месяц
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    })
  }
  
  // Другой год — показываем полную дату
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})
</script>

<style scoped>
.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
  position: relative;
}

.date-divider-label {
  background: var(--date-divider-bg, rgba(0, 0, 0, 0.1));
  color: var(--date-divider-text, var(--text-secondary));
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.875rem;
  border-radius: 1rem;
  text-transform: capitalize;
}

/* Тёмная тема */
:root[data-theme="dark"] .date-divider-label,
.dark .date-divider-label {
  background: var(--date-divider-bg, rgba(255, 255, 255, 0.1));
}
</style>