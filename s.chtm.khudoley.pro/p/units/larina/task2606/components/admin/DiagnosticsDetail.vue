<script setup lang="ts">
import type { DiagnosticsDetailItem } from '../../shared/types'

defineProps<{
  row: DiagnosticsDetailItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'delete', id: string): void
}>()

function onDelete(id?: string): void {
  if (!id) return
  if (confirm('Удалить эту запись диагностики? Действие необратимо.')) {
    emit('delete', id)
  }
}

function formatDate(val: any): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleString('ru-RU')
  } catch {
    return String(val)
  }
}
</script>

<template>
  <div
    v-if="row"
    class="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-10 px-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
      <!-- Шапка -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10"
      >
        <h2 class="text-lg font-semibold text-gray-900">Запись диагностики</h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
            @click="onDelete(row?.id)"
          >
            <i class="fas fa-trash mr-1"></i>Удалить
          </button>
          <button class="text-gray-400 hover:text-gray-600 p-1" @click="emit('close')">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>

      <!-- Содержимое -->
      <div class="p-4 space-y-4">
        <!-- Основные поля -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">ID записи</div>
            <div class="text-sm font-mono text-gray-800 break-all">{{ row.id }}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">Дата</div>
            <div class="text-sm text-gray-800">{{ formatDate(row.createdAt) }}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">ID визитёра</div>
            <div class="text-sm font-mono text-gray-800">{{ row.visitorId || '—' }}</div>
          </div>
          <div>
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">IP</div>
            <div class="text-sm font-mono text-gray-800">{{ row.ip || '—' }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">URL</div>
            <div class="text-sm text-gray-800 break-all">{{ row.url || '—' }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500 uppercase mb-1">Query-параметры</div>
            <div class="text-sm font-mono text-gray-800 break-all">{{ row.params || '—' }}</div>
          </div>
        </div>

        <!-- info -->
        <div>
          <div class="text-xs font-medium text-gray-500 uppercase mb-1">
            Прочие переменные (info)
          </div>
          <pre
            class="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 overflow-auto max-h-64"
            >{{ JSON.stringify(row.info, null, 2) }}</pre
          >
        </div>

        <!-- dom -->
        <div>
          <div class="text-xs font-medium text-gray-500 uppercase mb-1">DOM (outerHTML)</div>
          <pre
            class="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 overflow-scroll max-h-96 whitespace-pre-wrap break-all"
            >{{ row.dom || '—' }}</pre
          >
        </div>
      </div>
    </div>
  </div>
</template>
