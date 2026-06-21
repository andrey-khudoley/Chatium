<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8">
      <h1 class="text-3xl font-bold mb-8 text-gray-900">Настройки</h1>

      <!-- Создание транспорта -->
      <div class="mb-8">
        <button
          v-if="!currentTransport"
          @click="createTransport"
          :disabled="isCreatingTransport"
          class="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
        >
          {{ isCreatingTransport ? 'Создание...' : 'Создать транспорт' }}
        </button>
        <div v-if="!currentTransport" class="mt-3">
          <p class="text-gray-500 text-xs">
            Создайте транспорт, через который будет общение с агентом.
          </p>
        </div>
        <button
          v-else
          disabled
          class="px-6 py-2.5 bg-blue-100 text-blue-700 font-medium rounded-lg cursor-default"
          v-html="`Транспорт <b>${currentTransport.title}</b> создан`"
        ></button>

        <div v-if="currentTransport" class="mt-3">
          <a
            :href="`/app/sender/v2?tab=apps#/settings/channel/${currentTransport.id}`"
            class="text-blue-500 hover:text-blue-700 font-medium underline text-sm block mb-1"
            target="_blank"
          >
            Управлять транспортом
          </a>
          <p class="text-gray-500 text-xs">
            Перейдите в управление транспортом для настройки подключенных к нему агентов и других
            параметров работы системы.
          </p>
        </div>
      </div>

      <!-- Разделитель -->
      <hr class="my-8 border-gray-200" />

      <!-- Основная кнопка -->
      <div>
        <button
          @click="startUsing"
          :disabled="!currentTransport"
          class="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-100 disabled:text-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
        >
          Начать использовать
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { apiCreateTransportRoute } from '../api/setup'
import { indexPageRoute } from '../index'

// Пропсы
const props = defineProps({
  transport: { type: Object, default: null }
})

const currentTransport = ref(props.transport)

// Состояния загрузки
const isCreatingTransport = ref(false)

// Создание транспорта
async function createTransport() {
  try {
    isCreatingTransport.value = true
    const result = await apiCreateTransportRoute.run(ctx)
    currentTransport.value = result.transport
    console.log('Транспорт создан успешно:', result.transport)
  } catch (error) {
    console.error('Ошибка создания транспорта:', error)
    alert('Ошибка при создании транспорта')
  } finally {
    isCreatingTransport.value = false
  }
}

// Начать использовать
function startUsing() {
  window.location.href = indexPageRoute.url()
}
</script>

<style scoped></style>
