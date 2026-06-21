<template>
  <div class="app-card">
    <div v-if="title" class="app-card-header">
      <i v-if="icon" :class="icon" class="app-card-icon"></i>
      <h4 class="app-card-title">{{ title }}</h4>
    </div>
    <div class="app-card-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  icon: String
})
</script>

<style scoped>
.app-card {
  background: var(--c-surface);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--c-border);
}

.app-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.app-card-icon {
  font-size: 16px;
  color: var(--c-primary);
}

.app-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-secondary);
  margin: 0;
}

.app-card-body {
  margin: 0;
}
</style>
