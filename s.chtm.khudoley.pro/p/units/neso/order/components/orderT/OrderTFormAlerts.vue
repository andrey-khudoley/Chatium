<template>
  <div v-if="success" class="order-t-message-box order-t-success-message">
    <div class="flex items-center gap-3">
      <i class="fas fa-check-circle text-2xl" style="color: var(--color-success)"></i>
      <div>
        <p class="font-semibold" style="color: var(--color-text)">Отлично!</p>
        <p class="text-sm" style="color: var(--color-text-secondary)">Заявка отправлена</p>
      </div>
    </div>
  </div>

  <div v-if="error" class="order-t-message-box order-t-error-message">
    <div class="flex items-center gap-3">
      <i class="fas fa-exclamation-triangle text-2xl" style="color: var(--color-danger)"></i>
      <div>
        <p class="font-semibold" style="color: var(--color-text)">Ошибка</p>
        <p class="text-sm" style="color: var(--color-text-secondary)">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  success: boolean
  error: string | null
}>()
</script>

<style scoped>
.order-t-message-box {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid;
  margin-bottom: 1.25rem;
}

.order-t-success-message {
  background: rgba(122, 155, 92, 0.1);
  border-color: var(--color-success);
}

.order-t-error-message {
  background: rgba(184, 92, 92, 0.1);
  border-color: var(--color-danger);
}
</style>
