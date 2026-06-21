<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    @click.self="emit('cancel')"
  >
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 w-full max-w-sm shadow-xl"
    >
      <h2 v-if="title" class="text-lg text-[var(--color-text)] mb-2">{{ title }}</h2>
      <p v-if="message" class="text-[var(--color-text-secondary)] text-sm mb-4">{{ message }}</p>
      <div class="flex gap-2 justify-end">
        <button
          type="button"
          class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
          @click="emit('cancel')"
        >
          {{ cancelLabel ?? 'Отмена' }}
        </button>
        <button
          type="button"
          :class="
            danger
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90'
          "
          class="px-4 py-2 rounded transition"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'ОК' }}
        </button>
      </div>
    </div>
  </div>
</template>
