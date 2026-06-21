<script setup lang="ts">
defineProps<{
  theme?: 'dark' | 'light'
}>()
</script>

<template>
  <div class="dc-glow-dots" aria-hidden="true" />
</template>

<style scoped>
.dc-glow-dots {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

.dc-glow-dots::before,
.dc-glow-dots::after {
  content: '';
  position: absolute;
  inset: 0;
}

.dc-glow-dots::before {
  background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--accent) 8%, transparent) 50%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, var(--status-success) 5%, transparent) 100%
    );
  opacity: 0.72;
}

.dc-glow-dots::after {
  background: repeating-linear-gradient(
      90deg,
      transparent 0 118px,
      color-mix(in srgb, var(--grid-color) 80%, transparent) 118px 119px
    ),
    repeating-linear-gradient(
      180deg,
      transparent 0 118px,
      color-mix(in srgb, var(--grid-color) 80%, transparent) 118px 119px
    );
  opacity: 0.3;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent 88%);
}
</style>
