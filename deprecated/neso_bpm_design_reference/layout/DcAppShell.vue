<script setup lang="ts">
import { DcGlowDots, DcGridLayer, DcPageBackground, DcThemeGlobalStyles } from '../components'
import DcSidebarOverlay from './DcSidebarOverlay.vue'

defineProps<{
  theme?: 'dark' | 'light'
  themePresetId?: string
  ready?: boolean
  sidebarCollapsed?: boolean
  sidebarOpen?: boolean
}>()

defineEmits<{
  closeSidebar: []
}>()
</script>

<template>
  <DcThemeGlobalStyles :theme="theme" :theme-preset-id="themePresetId" />

  <div
    class="dc-app-shell"
    :class="[
      `dc-app-shell--${theme ?? 'dark'}`,
      {
        'dc-app-shell--ready': ready,
        'dc-app-shell--sidebar-collapsed': sidebarCollapsed
      }
    ]"
  >
    <DcPageBackground :theme="theme" />
    <DcGridLayer :theme="theme" />
    <DcGlowDots :theme="theme" />

    <DcSidebarOverlay :visible="!!sidebarOpen" :theme="theme" @close="$emit('closeSidebar')" />

    <slot name="sidebar" />

    <div class="dc-app-shell__content">
      <div v-if="$slots.header" class="dc-app-shell__header-row">
        <slot name="header" />
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dc-app-shell {
  --dc-shell-sidebar-offset: var(--sidebar-width);
  --dc-shell-shift-delay: 0s;
  position: relative;
  display: flex;
  min-height: 100vh;
  color: var(--text-primary);
  font-family: var(--font-sans);
  opacity: 0;
  transition: opacity 0.36s ease;
  isolation: isolate;
}

.dc-app-shell--ready {
  opacity: 1;
}

.dc-app-shell--sidebar-collapsed {
  --dc-shell-sidebar-offset: var(--sidebar-collapsed-width);
  --dc-shell-shift-delay: 0.2s;
}

.dc-app-shell__content {
  position: relative;
  z-index: 12;
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  margin-left: var(--dc-shell-sidebar-offset);
  transition: margin-left 0.4s cubic-bezier(0.33, 1, 0.68, 1) var(--dc-shell-shift-delay);
  will-change: margin-left;
}

.dc-app-shell__header-row {
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 12px 20px 0;
  backdrop-filter: blur(16px);
}

@media (max-width: 980px) {
  .dc-app-shell {
    --dc-shell-sidebar-offset: 0px;
  }

  .dc-app-shell__content {
    margin-left: 0;
  }

  .dc-app-shell__header-row {
    padding: 12px 12px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dc-app-shell,
  .dc-app-shell__content {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
