<script setup lang="ts">
defineProps<{
  theme?: 'dark' | 'light'
}>()
</script>

<template>
  <div
    class="dc-page-background"
    :class="`dc-page-background--${theme ?? 'dark'}`"
    aria-hidden="true"
  >
    <div class="dc-page-bg-base"></div>
    <div class="dc-page-bg-vignette"></div>
  </div>
</template>

<style scoped>
.dc-page-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.dc-page-bg-base,
.dc-page-bg-vignette {
  position: absolute;
  inset: 0;
}

.dc-page-bg-base {
  background: var(--gradient-ambient-top), var(--gradient-ambient-bottom), var(--gradient-app);
}

.dc-page-bg-vignette {
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.18) 100%);
  mix-blend-mode: multiply;
  opacity: 0.5;
}

.dc-page-background--light .dc-page-bg-vignette {
  opacity: 0.22;
}
</style>
