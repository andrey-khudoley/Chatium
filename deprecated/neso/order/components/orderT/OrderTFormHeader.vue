<template>
  <div class="order-t-form-header">
    <div class="order-t-icon-wrapper">
      <div class="order-t-icon-container">
        <i class="fas fa-clipboard-list text-3xl" style="color: var(--color-text)"></i>
      </div>
    </div>

    <div class="order-t-header-text">
      <h1 class="order-t-form-title" style="color: var(--color-text)">{{ title }}</h1>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: 'Заказать'
  }
)
</script>

<style scoped>
.order-t-form-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.order-t-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.order-t-icon-container {
  width: 80px;
  height: 80px;
  border-radius: 1rem;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-button-light);
}

.order-t-header-text {
  text-align: center;
}

.order-t-form-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

@media (max-width: 640px) {
  .order-t-form-title {
    font-size: 1.5rem;
  }

  .order-t-icon-container {
    width: 60px;
    height: 60px;
  }
}
</style>
