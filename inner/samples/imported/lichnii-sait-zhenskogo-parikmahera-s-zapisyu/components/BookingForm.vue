<template>
  <div class="bg-white rounded-2xl shadow-xl p-8">
    <form @submit.prevent="submitBooking" class="space-y-6">
      <!-- Имя -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Ваше имя * </label>
        <input
          v-model="form.clientName"
          type="text"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="Введите ваше имя"
        />
      </div>

      <!-- Телефон -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Телефон * </label>
        <input
          v-model="form.clientPhone"
          type="tel"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="+7 (999) 123-45-67"
        />
      </div>

      <!-- Email -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Email </label>
        <input
          v-model="form.clientEmail"
          type="email"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="your@email.com"
        />
      </div>

      <!-- Услуга -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Выберите услугу * </label>
        <select
          v-model="form.service"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        >
          <option value="">Выберите услугу</option>
          <option value="Женская стрижка">Женская стрижка</option>
          <option value="Мужская стрижка">Мужская стрижка</option>
          <option value="Окрашивание">Окрашивание</option>
          <option value="Укладка">Укладка</option>
          <option value="Уход и восстановление">Уход и восстановление</option>
          <option value="Свадебная укладка">Свадебная укладка</option>
        </select>
      </div>

      <!-- Дата -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Дата * </label>
        <input
          v-model="form.date"
          type="date"
          required
          :min="minDate"
          @change="loadAvailableTimes"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>

      <!-- Время -->
      <div v-if="form.date">
        <label class="block text-sm font-medium text-gray-700 mb-2"> Время * </label>
        <div v-if="loadingTimes" class="text-center py-4">
          <i class="fas fa-spinner fa-spin text-primary text-2xl"></i>
        </div>
        <div v-else-if="availableTimes.length === 0" class="text-center py-4 text-gray-500">
          На выбранную дату нет свободных слотов
        </div>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            v-for="time in availableTimes"
            :key="time"
            type="button"
            @click="form.time = time"
            :class="[
              'px-4 py-3 rounded-lg font-medium transition-all',
              form.time === time
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ time }}
          </button>
        </div>
      </div>

      <!-- Примечания -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> Примечания </label>
        <textarea
          v-model="form.notes"
          rows="3"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
          placeholder="Дополнительные пожелания или вопросы"
        ></textarea>
      </div>

      <!-- Сообщения -->
      <div
        v-if="successMessage"
        class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
      >
        <i class="fas fa-check-circle mr-2"></i>
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <i class="fas fa-exclamation-circle mr-2"></i>
        {{ errorMessage }}
      </div>

      <!-- Кнопка -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading">
          <i class="fas fa-spinner fa-spin mr-2"></i>
          Отправка...
        </span>
        <span v-else> Записаться </span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiCreateBookingRoute, apiGetAvailableTimesRoute } from '../api/bookings'

const form = ref({
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  service: '',
  date: '',
  time: '',
  notes: ''
})

const loading = ref(false)
const loadingTimes = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const availableTimes = ref([])

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

async function loadAvailableTimes() {
  if (!form.value.date) return

  loadingTimes.value = true
  form.value.time = ''

  try {
    const response = await apiGetAvailableTimesRoute.run(ctx, {
      date: form.value.date
    })

    if (response.success) {
      availableTimes.value = response.availableTimes
    } else {
      errorMessage.value = response.error
    }
  } catch (error) {
    errorMessage.value = 'Ошибка при загрузке доступного времени'
  } finally {
    loadingTimes.value = false
  }
}

async function submitBooking() {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await apiCreateBookingRoute.run(ctx, form.value)

    if (response.success) {
      successMessage.value = 'Спасибо за запись! Мы свяжемся с вами для подтверждения.'

      // Очищаем форму
      form.value = {
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        service: '',
        date: '',
        time: '',
        notes: ''
      }
      availableTimes.value = []

      // Прокручиваем к сообщению об успехе
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }, 100)
    } else {
      errorMessage.value = response.error || 'Произошла ошибка при создании записи'
    }
  } catch (error) {
    errorMessage.value = 'Произошла ошибка. Пожалуйста, попробуйте позже.'
  } finally {
    loading.value = false
  }
}
</script>
