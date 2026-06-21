<template>
  <section id="booking" class="py-20 bg-gradient-to-br from-primary to-accent">
    <div class="container mx-auto px-4">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-12 text-white">
          <h2 class="section-title">Записаться на прием</h2>
          <p class="text-lg mt-4">Заполните форму и мы свяжемся с вами для подтверждения записи</p>
        </div>

        <div v-if="!submitted" class="bg-white rounded-2xl shadow-2xl p-8">
          <form @submit.prevent="submitForm">
            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">
                <i class="fas fa-user mr-2 text-primary"></i>
                Ваше имя *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="Введите ваше имя"
              />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">
                <i class="fas fa-phone mr-2 text-primary"></i>
                Телефон *
              </label>
              <input
                v-model="form.phone"
                type="tel"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">
                <i class="fas fa-hand-sparkles mr-2 text-primary"></i>
                Выберите услугу *
              </label>
              <select
                v-model="form.service"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Выберите услугу</option>
                <option value="Классический маникюр">Классический маникюр</option>
                <option value="Маникюр с гель-лаком">Маникюр с гель-лаком</option>
                <option value="Дизайн ногтей">Дизайн ногтей</option>
                <option value="Укрепление ногтей">Укрепление ногтей</option>
                <option value="Педикюр">Педикюр</option>
                <option value="Коррекция">Коррекция</option>
              </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label class="block text-gray-700 font-medium mb-2">
                  <i class="fas fa-calendar mr-2 text-primary"></i>
                  Дата *
                </label>
                <input
                  v-model="form.date"
                  type="date"
                  required
                  :min="minDate"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label class="block text-gray-700 font-medium mb-2">
                  <i class="fas fa-clock mr-2 text-primary"></i>
                  Время *
                </label>
                <select
                  v-model="form.time"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Выберите время</option>
                  <option v-for="time in availableTimes" :key="time" :value="time">
                    {{ time }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">
                <i class="fas fa-comment mr-2 text-primary"></i>
                Комментарий
              </label>
              <textarea
                v-model="form.comment"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="Дополнительные пожелания или вопросы"
              ></textarea>
            </div>

            <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="!loading" class="fas fa-check mr-2"></i>
              <i v-else class="fas fa-spinner fa-spin mr-2"></i>
              {{ loading ? 'Отправка...' : 'Записаться' }}
            </button>
          </form>
        </div>

        <div v-else class="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div class="text-6xl mb-6">✅</div>
          <h3 class="text-3xl font-bold mb-4 text-primary">Спасибо за запись!</h3>
          <p class="text-gray-600 text-lg mb-6">
            Мы получили вашу заявку и свяжемся с вами в ближайшее время для подтверждения записи.
          </p>
          <button @click="resetForm" class="btn-primary">Записаться ещё раз</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiBookingsCreateRoute } from '../api/bookings'

const form = ref({
  name: '',
  phone: '',
  service: '',
  date: '',
  time: '',
  comment: ''
})

const loading = ref(false)
const error = ref('')
const submitted = ref(false)

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const availableTimes = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00'
]

const submitForm = async () => {
  loading.value = true
  error.value = ''

  try {
    const result = await apiBookingsCreateRoute.run(ctx, {
      name: form.value.name,
      phone: form.value.phone,
      service: form.value.service,
      date: form.value.date,
      time: form.value.time,
      comment: form.value.comment
    })

    if (result.success) {
      submitted.value = true
    } else {
      error.value = result.error || 'Произошла ошибка при отправке формы'
    }
  } catch (e) {
    error.value = 'Произошла ошибка. Пожалуйста, попробуйте позже.'
    console.error('Booking error:', e)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    phone: '',
    service: '',
    date: '',
    time: '',
    comment: ''
  }
  submitted.value = false
  error.value = ''
}
</script>
