<script setup lang="ts">
defineProps<{
  enabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', newVal: boolean): void
}>()
</script>

<template>
  <div
    class="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm"
  >
    <span class="text-sm font-medium text-gray-700">Приём диагностики:</span>
    <span class="text-sm font-semibold" :class="enabled ? 'text-green-600' : 'text-gray-400'">
      {{ enabled ? 'Включён' : 'Выключен' }}
    </span>
    <button
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
      :class="enabled ? 'bg-green-500' : 'bg-gray-300'"
      :title="enabled ? 'Выключить приём' : 'Включить приём'"
      @click="emit('toggle', !enabled)"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        :class="enabled ? 'translate-x-6' : 'translate-x-1'"
      ></span>
    </button>
  </div>
</template>
