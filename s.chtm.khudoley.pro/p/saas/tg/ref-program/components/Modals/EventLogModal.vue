<script setup lang="ts">
export interface EventLogItem {
  type: 'registration' | 'order' | 'payment'
  id: string
  at: string
  summary: string
  payload?: unknown
}

defineProps<{
  visible: boolean
  title?: string
  refLabel?: string
  events: EventLogItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function formatDatetime(s: string): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function typeLabel(t: EventLogItem['type']): string {
  switch (t) {
    case 'registration':
      return 'Регистрация'
    case 'order':
      return 'Заказ'
    case 'payment':
      return 'Оплата'
    default:
      return t
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    @click.self="emit('close')"
  >
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
    >
      <div
        class="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0"
      >
        <h2 class="text-lg text-[var(--color-text)]">
          {{ title ?? 'Лог событий' }}
          <span v-if="refLabel" class="text-[var(--color-text-secondary)] font-normal">
            — {{ refLabel }}</span
          >
        </h2>
        <button
          type="button"
          class="p-2 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="overflow-y-auto p-4 flex-1 min-h-0">
        <div v-if="loading" class="text-center py-8 text-[var(--color-text-secondary)]">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div
          v-else-if="events.length === 0"
          class="text-center py-8 text-[var(--color-text-secondary)]"
        >
          Нет событий
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="e in events"
            :key="e.id"
            class="rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-sm"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span
                :class="{
                  'bg-green-500/20 text-green-600': e.type === 'registration',
                  'bg-blue-500/20 text-blue-600': e.type === 'order',
                  'bg-amber-500/20 text-amber-600': e.type === 'payment'
                }"
                class="px-2 py-0.5 rounded text-xs font-medium"
              >
                {{ typeLabel(e.type) }}
              </span>
              <span class="text-[var(--color-text-tertiary)]">{{ formatDatetime(e.at) }}</span>
            </div>
            <p class="text-[var(--color-text)] mt-1">{{ e.summary }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
