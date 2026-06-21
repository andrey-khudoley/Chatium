<script setup lang="ts">
defineProps<{
  visible: boolean
  theme?: 'dark' | 'light'
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Transition name="dc-sidebar-overlay-fade">
    <div v-if="visible" class="dc-sidebar-overlay" aria-hidden="true" @click="$emit('close')" />
  </Transition>
</template>

<style scoped>
.dc-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 32;
  background: var(--surface-overlay);
  backdrop-filter: blur(2px);
}

.dc-sidebar-overlay-fade-enter-active,
.dc-sidebar-overlay-fade-leave-active {
  transition: opacity 0.22s ease;
}

.dc-sidebar-overlay-fade-enter-from,
.dc-sidebar-overlay-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dc-sidebar-overlay-fade-enter-active,
  .dc-sidebar-overlay-fade-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
