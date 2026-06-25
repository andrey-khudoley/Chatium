<template>
  <div class="progress-track">
    <div
      class="progress-fill"
      :style="{ width: clamp + '%', background: color || 'var(--accent)' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value: number; color?: string }>()
const clamp = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<style scoped>
.progress-track {
  height: 7px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
</style>
