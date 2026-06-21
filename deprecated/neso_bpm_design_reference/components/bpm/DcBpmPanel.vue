<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
  linkLabel?: string
  linkHref?: string
}>()
</script>

<template>
  <section class="dc-bpm-panel">
    <header class="dc-bpm-panel__header">
      <div>
        <h2 class="dc-bpm-panel__title">{{ title }}</h2>
        <p v-if="hint" class="dc-bpm-panel__hint">{{ hint }}</p>
      </div>

      <a v-if="linkLabel" class="dc-bpm-panel__link" :href="linkHref ?? '#'">
        {{ linkLabel }}
      </a>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.dc-bpm-panel {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.dc-bpm-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.dc-bpm-panel__title {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0;
  font-weight: 800;
}

.dc-bpm-panel__hint {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.dc-bpm-panel__link {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.74rem;
  white-space: nowrap;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-bpm-panel__link:hover {
  border-color: var(--border-accent);
  color: var(--text-primary);
}
</style>
