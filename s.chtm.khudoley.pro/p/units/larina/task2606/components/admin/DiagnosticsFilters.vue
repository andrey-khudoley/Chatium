<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'filter', filters: { visitorId: string; ip: string; url: string }): void
  (e: 'reset'): void
}>()

const visitorId = ref('')
const ip = ref('')
const url = ref('')

function applyFilters() {
  emit('filter', {
    visitorId: visitorId.value.trim(),
    ip: ip.value.trim(),
    url: url.value.trim()
  })
}

function resetFilters() {
  visitorId.value = ''
  ip.value = ''
  url.value = ''
  emit('reset')
}
</script>

<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-600">ID визитёра</label>
        <input
          v-model="visitorId"
          type="text"
          placeholder="accountUserId..."
          class="border border-gray-300 rounded px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="applyFilters"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-600">IP</label>
        <input
          v-model="ip"
          type="text"
          placeholder="1.2.3.4"
          class="border border-gray-300 rounded px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="applyFilters"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-600">URL</label>
        <input
          v-model="url"
          type="text"
          placeholder="https://..."
          class="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="applyFilters"
        />
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none"
          @click="applyFilters"
        >
          Применить
        </button>
        <button
          class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 focus:outline-none"
          @click="resetFilters"
        >
          Сбросить
        </button>
      </div>
    </div>
  </div>
</template>
