<template>
  <div class="app-section">
    <div v-if="title || $slots.icon" class="section-header">
      <slot name="icon">
        <i v-if="icon" :class="icon" class="section-icon"></i>
      </slot>
      <h3 v-if="title" class="section-title">{{ title }}</h3>
    </div>
    <p v-if="description" class="section-description">{{ description }}</p>
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  icon: String
})
</script>

<style scoped>
.app-section {
  background: var(--c-surface);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--c-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 20px;
  color: var(--c-primary);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0;
}

.section-description {
  color: var(--c-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.section-content {
  margin-top: 0;
}
</style>
