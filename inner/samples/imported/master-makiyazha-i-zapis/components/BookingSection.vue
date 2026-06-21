<template>
  <section id="booking" class="py-20 bg-white">
    <div class="container mx-auto px-6">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-4xl md:text-5xl font-bold font-heading mb-4">Записаться на прием</h2>
          <p class="text-gray-600 text-lg">
            Заполните форму, и я свяжусь с вами в ближайшее время для подтверждения записи
          </p>
        </div>

        <div class="bg-gradient-to-br from-accent to-white p-8 md:p-12 rounded-3xl shadow-xl">
          <form @submit.prevent="submitForm" class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700">
                  <i class="fas fa-user text-primary mr-2"></i>Ваше имя *
                </label>
                <input
                  v-model="form.clientName"
                  type="text"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
                  placeholder="Анна"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700">
                  <i class="fas fa-phone text-primary mr-2"></i>Телефон *
                </label>
                <input
                  v-model="form.clientPhone"
                  type="tel"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2 text-gray-700">
                <i class="fas fa-palette text-primary mr-2"></i>Выберите услугу *
              </label>
              <select
                v-model="form.service"
                required
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
              >
                <option value="">Выберите услугу</option>
                <option value="Дневной макияж">Дневной макияж (2500 ₽)</option>
                <option value="Вечерний макияж">Вечерний макияж (3500 ₽)</option>
                <option value="Свадебный макияж">Свадебный макияж (5000 ₽)</option>
              </select>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700">
                  <i class="fas fa-calendar text-primary mr-2"></i>Дата *
                </label>
                <input
                  v-model="form.date"
                  type="date"
                  required
                  :min="minDate"
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700">
                  <i class="fas fa-clock text-primary mr-2"></i>Время *
                </label>
                <select
                  v-model="form.time"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Выберите время</option>
                  <option value="10:00">10:00</option>
                  <option value="12:00">12:00</option>
                  <option value="14:00">14:00</option>
                  <option value="16:00">16:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2 text-gray-700">
                <i class="fas fa-comment text-primary mr-2"></i>Комментарий
              </label>
              <textarea
                v-model="form.comment"
                rows="4"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white resize-none"
                placeholder="Расскажите о желаемом образе или особых пожеланиях..."
              ></textarea>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full btn-primary text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fas fa-paper-plane"></i>
              {{ isSubmitting ? 'Отправка...' : 'Отправить заявку' }}
            </button>
          </form>

          <div v-if="showSuccess" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div class="flex items-center gap-3 text-green-800">
              <i class="fas fa-check-circle text-2xl"></i>
              <div>
                <div class="font-semibold">Заявка успешно отправлена!</div>
                <div class="text-sm">
                  Я свяжусь с вами в ближайшее время для подтверждения записи.
                </div>
              </div>
            </div>
          </div>

          <div v-if="showError" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div class="flex items-center gap-3 text-red-800">
              <i class="fas fa-exclamation-circle text-2xl"></i>
              <div>
                <div class="font-semibold">Ошибка при отправке</div>
                <div class="text-sm">{{ errorMessage }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiCreateAppointmentRoute } from '../api/appointments'

const form = ref({
  clientName: '',
  clientPhone: '',
  service: '',
  date: '',
  time: '',
  comment: ''
})

const isSubmitting = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const submitForm = async () => {
  isSubmitting.value = true
  showSuccess.value = false
  showError.value = false

  try {
    await apiCreateAppointmentRoute.run(ctx, form.value)

    showSuccess.value = true
    form.value = {
      clientName: '',
      clientPhone: '',
      service: '',
      date: '',
      time: '',
      comment: ''
    }

    setTimeout(() => {
      showSuccess.value = false
    }, 5000)
  } catch (error) {
    showError.value = true
    errorMessage.value = error.message || 'Произошла ошибка. Попробуйте еще раз.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
