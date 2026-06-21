<template>
  <section id="contacts" class="py-20 bg-gray-50">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4 section-title">
          Свяжитесь с нами
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mt-8">
          Готовы ответить на все ваши вопросы
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-12">
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h3 class="text-2xl font-bold text-gray-900 mb-6">Контактная информация</h3>

          <div class="space-y-6">
            <div class="flex items-start space-x-4">
              <div
                class="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
              >
                <i class="fas fa-phone"></i>
              </div>
              <div>
                <div class="text-sm text-gray-500 mb-1">Телефон</div>
                <a
                  href="tel:+74951234567"
                  class="text-lg font-semibold text-gray-900 hover:text-primary transition"
                >
                  +7 (495) 123-45-67
                </a>
              </div>
            </div>

            <div class="flex items-start space-x-4">
              <div
                class="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
              >
                <i class="fas fa-envelope"></i>
              </div>
              <div>
                <div class="text-sm text-gray-500 mb-1">Email</div>
                <a
                  href="mailto:info@boltprom.ru"
                  class="text-lg font-semibold text-gray-900 hover:text-primary transition"
                >
                  info@boltprom.ru
                </a>
              </div>
            </div>

            <div class="flex items-start space-x-4">
              <div
                class="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
              >
                <i class="fas fa-map-marker-alt"></i>
              </div>
              <div>
                <div class="text-sm text-gray-500 mb-1">Адрес</div>
                <div class="text-lg font-semibold text-gray-900">
                  г. Москва, ул. Промышленная, д. 25
                </div>
              </div>
            </div>

            <div class="flex items-start space-x-4">
              <div
                class="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
              >
                <i class="fas fa-clock"></i>
              </div>
              <div>
                <div class="text-sm text-gray-500 mb-1">Режим работы</div>
                <div class="text-lg font-semibold text-gray-900">
                  Пн-Пт: 9:00 - 18:00<br />
                  Сб-Вс: выходной
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h3 class="text-2xl font-bold text-gray-900 mb-6">Отправить заявку</h3>

          <form @submit.prevent="submitForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Ваше имя</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
              <input
                v-model="form.phone"
                type="tel"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Сообщение</label>
              <textarea
                v-model="form.message"
                rows="4"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                placeholder="Расскажите о вашем запросе..."
              ></textarea>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn-primary w-full px-8 py-4 rounded-lg text-white font-semibold disabled:opacity-50"
            >
              <i class="fas fa-paper-plane mr-2"></i>
              {{ loading ? 'Отправка...' : 'Отправить заявку' }}
            </button>

            <div v-if="success" class="text-green-600 text-center">
              <i class="fas fa-check-circle mr-2"></i>
              Спасибо! Мы свяжемся с вами в ближайшее время.
            </div>

            <div v-if="error" class="text-red-600 text-center">
              <i class="fas fa-exclamation-circle mr-2"></i>
              {{ error }}
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { apiCreateApplicationRoute } from '../api/applications'

const form = ref({
  name: '',
  phone: '',
  email: '',
  message: ''
})

const loading = ref(false)
const success = ref(false)
const error = ref('')

const submitForm = async () => {
  loading.value = true
  success.value = false
  error.value = ''

  try {
    const result = await apiCreateApplicationRoute.run(ctx, form.value)

    if (result.success) {
      success.value = true
      form.value = {
        name: '',
        phone: '',
        email: '',
        message: ''
      }
    } else {
      error.value = result.error || 'Произошла ошибка при отправке заявки'
    }
  } catch (err) {
    console.error('Ошибка отправки формы:', err)
    error.value = 'Произошла ошибка при отправке заявки'
  } finally {
    loading.value = false
  }
}
</script>
