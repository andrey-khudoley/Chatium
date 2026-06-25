<template>
  <span class="source-chip">{{ src }}</span>
</template>

<script setup lang="ts">
defineProps<{ src: string }>()
</script>

<style scoped>
.source-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 6px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  letter-spacing: 0.04em;
  flex: none;
}
</style>
