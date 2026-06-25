<template>
  <div class="gcard card-base">
    <span class="gut">{{ num }}</span>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{ num: string }>()
</script>

<style scoped>
.card-base {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
</style>
