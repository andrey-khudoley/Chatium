<script setup lang="ts">
defineProps<{
  theme?: 'dark' | 'light'
  title?: string
  breadcrumbs?: string[]
  showMenuToggle?: boolean
}>()

const emit = defineEmits<{ 'menu-toggle': [] }>()
</script>

<template>
  <header class="dc-page-header" :class="`theme-${theme ?? 'dark'}`">
    <button
      v-if="showMenuToggle"
      type="button"
      class="dc-menu-toggle"
      aria-label="Open navigation"
      @click="emit('menu-toggle')"
    >
      <i class="fas fa-bars"></i>
    </button>

    <div class="dc-header-left">
      <p v-if="breadcrumbs?.length" class="dc-page-breadcrumbs">{{ breadcrumbs.join(' / ') }}</p>
      <h1 class="dc-page-title">{{ title ?? 'BPM workspace' }}</h1>
    </div>

    <div v-if="$slots.actions" class="dc-header-actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<style scoped>
.dc-page-header {
  min-height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-strong) 92%, transparent);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(18px);
}

.dc-header-left {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.dc-page-title {
  margin: 0;
  font-size: clamp(1rem, 1vw, 1.14rem);
  letter-spacing: 0;
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dc-page-breadcrumbs {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dc-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.dc-menu-toggle {
  display: none;
  width: var(--control-height);
  height: var(--control-height);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-2) 76%, transparent);
}

@media (max-width: 980px) {
  .dc-menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .dc-header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .dc-page-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .dc-header-left {
    flex-basis: calc(100% - 52px);
  }
}
</style>
