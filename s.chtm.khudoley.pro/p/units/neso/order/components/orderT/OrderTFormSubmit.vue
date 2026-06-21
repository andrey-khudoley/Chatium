<template>
  <button type="submit" class="btn btn-primary order-t-submit-button" :disabled="loading">
    <i v-if="loading" class="fas fa-spinner animate-spin mr-3"></i>
    <i v-else class="fas fa-arrow-right mr-3"></i>
    {{ loading ? 'Отправка...' : 'Отправить заявку' }}
  </button>

  <div class="order-t-form-footer">
    <div class="flex items-center justify-center gap-2 text-sm">
      <i class="fas fa-lock" style="color: var(--color-text-secondary)"></i>
      <span style="color: var(--color-text-secondary)">Ваши данные в безопасности</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
}>()
</script>

<style scoped>
.order-t-submit-button {
  width: 100%;
  font-size: 1.125rem;
}

.order-t-form-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .order-t-submit-button {
    font-size: 1rem;
    padding: 1rem 2rem;
  }
}
</style>
