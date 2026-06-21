<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    page: number
    total: number
    pageSize: number
  }>(),
  { page: 1, total: 0, pageSize: 20 }
)

const emit = defineEmits<{
  'update:page': [value: number]
}>()

const totalPages = computed(() =>
  props.pageSize > 0 ? Math.max(1, Math.ceil(props.total / props.pageSize)) : 1
)
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

function go(p: number) {
  const next = Math.max(1, Math.min(p, totalPages.value))
  emit('update:page', next)
}
</script>

<template>
  <div
    v-if="totalPages > 1 || total > pageSize"
    class="flex items-center justify-between gap-4 py-3 text-sm text-[var(--color-text-secondary)]"
  >
    <span> Показано {{ from }}–{{ to }} из {{ total }} </span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        :disabled="page <= 1"
        class="px-3 py-1 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
        @click="go(page - 1)"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="px-2"> {{ page }} / {{ totalPages }} </span>
      <button
        type="button"
        :disabled="page >= totalPages"
        class="px-3 py-1 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
        @click="go(page + 1)"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
</template>
