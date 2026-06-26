<script setup lang="ts">
import type { DiagnosticsItem } from '../../shared/types'

defineProps<{
  rows: DiagnosticsItem[]
  total: number
  limit: number
  offset: number
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select-row', id: string): void
  (e: 'prev-page'): void
  (e: 'next-page'): void
}>()

function formatDate(val: any): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleString('ru-RU')
  } catch {
    return String(val)
  }
}

function trimParams(s: string | undefined): string {
  if (!s) return ''
  return s.length > 80 ? s.slice(0, 80) + '…' : s
}
</script>

<template>
  <div class="bg-white rounded-lg shadow mt-4">
    <!-- Загрузка -->
    <div v-if="loading" class="p-8 text-center text-gray-500">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Загрузка...
    </div>

    <!-- Таблица -->
    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Дата
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Визитёр
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                IP
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                URL
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Параметры
              </th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="rows.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">Записей не найдено</td>
            </tr>
            <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50 cursor-pointer">
              <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {{ formatDate(row.createdAt) }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 font-mono">{{ row.visitorId || '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-700 font-mono whitespace-nowrap">
                {{ row.ip || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" :title="row.url">
                {{ row.url || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 font-mono">
                {{ trimParams(row.params) }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  @click="emit('select-row', row.id)"
                >
                  Открыть
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Пагинация -->
      <div class="px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-500">
          Показано {{ total === 0 ? '0' : offset + 1 + '–' + Math.min(offset + limit, total) }} из
          {{ total }}
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="offset === 0"
            @click="emit('prev-page')"
          >
            Пред
          </button>
          <button
            class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="offset + limit >= total"
            @click="emit('next-page')"
          >
            След
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
