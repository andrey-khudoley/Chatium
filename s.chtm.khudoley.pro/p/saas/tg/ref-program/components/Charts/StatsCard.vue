<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  subtitle?: string
  icon?: string
}>()
</script>

<template>
  <div
    class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-start gap-3"
  >
    <div
      v-if="icon"
      class="w-10 h-10 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center shrink-0"
    >
      <i :class="[icon, 'text-lg']"></i>
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-[var(--color-text-secondary)] text-sm">{{ title }}</p>
      <p class="text-[var(--color-text)] text-xl font-semibold mt-0.5">{{ value }}</p>
      <p v-if="subtitle" class="text-[var(--color-text-tertiary)] text-xs mt-1">{{ subtitle }}</p>
    </div>
  </div>
</template>
