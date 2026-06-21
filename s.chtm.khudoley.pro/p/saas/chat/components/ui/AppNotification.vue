<template>
  <div :class="['app-notification', type]">
    <i v-if="icon" :class="icon" class="app-notification-icon"></i>
    <i v-else class="app-notification-icon" :class="defaultIcon"></i>
    <div class="app-notification-content">
      <p v-if="title" class="app-notification-title">{{ title }}</p>
      <p class="app-notification-message">
        <slot>{{ message }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'error', 'warn'].includes(v)
  },
  title: String,
  message: String,
  icon: String
})

const defaultIcon = computed(() => {
  const map = {
    info: 'fas fa-info-circle',
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warn: 'fas fa-exclamation-triangle'
  }
  return map[props.type] || map.info
})
</script>

<style scoped>
.app-notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
}

.app-notification.info {
  background: rgba(37, 211, 102, 0.1);
  color: var(--c-success);
}

.app-notification.error {
  background: rgba(245, 101, 101, 0.1);
  color: var(--c-danger);
}

.app-notification.warn {
  background: rgba(255, 193, 7, 0.15);
  color: var(--c-warning, #b8860b);
}

.app-notification.success {
  background: rgba(37, 211, 102, 0.1);
  color: var(--c-success);
}

.app-notification-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.app-notification-content {
  flex: 1;
}

.app-notification-title {
  font-weight: 600;
  margin: 0 0 4px;
}

.app-notification-message {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}
</style>
