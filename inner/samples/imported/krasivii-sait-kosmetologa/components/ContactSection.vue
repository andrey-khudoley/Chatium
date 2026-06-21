<template>
  <section id="contact" class="py-20 bg-light">
    <div class="container mx-auto px-4">
      <h2 class="section-title">Свяжитесь с нами</h2>
      <p class="section-subtitle">Запишитесь на процедуру или получите консультацию</p>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div class="bg-white rounded-3xl p-8 shadow-xl">
          <h3 class="text-2xl font-bold text-dark mb-6">Форма записи</h3>

          <form @submit.prevent="submitForm" class="space-y-4">
            <div>
              <label class="block text-gray-700 font-medium mb-2">Ваше имя *</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="input-field"
                placeholder="Введите ваше имя"
              />
            </div>

            <div>
              <label class="block text-gray-700 font-medium mb-2">Телефон *</label>
              <input
                v-model="form.phone"
                type="tel"
                required
                class="input-field"
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div>
              <label class="block text-gray-700 font-medium mb-2">Email</label>
              <input
                v-model="form.email"
                type="email"
                class="input-field"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label class="block text-gray-700 font-medium mb-2">Интересующая услуга</label>
              <select v-model="form.service" class="input-field">
                <option value="">Выберите услугу</option>
                <option value="cleaning">Чистка лица</option>
                <option value="injections">Инъекции красоты</option>
                <option value="massage">Массаж лица</option>
                <option value="peeling">Пилинги</option>
                <option value="body">Уход за телом</option>
                <option value="hydration">Увлажнение</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 font-medium mb-2">Комментарий</label>
              <textarea
                v-model="form.message"
                rows="4"
                class="input-field"
                placeholder="Расскажите о ваших пожеланиях..."
              ></textarea>
            </div>

            <button type="submit" class="w-full btn-primary" :disabled="isSubmitting">
              <i class="fas fa-paper-plane mr-2"></i>
              {{ isSubmitting ? 'Отправка...' : 'Отправить заявку' }}
            </button>
          </form>

          <div
            v-if="submitMessage"
            class="mt-4 p-4 rounded-lg"
            :class="submitSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
          >
            <i
              :class="submitSuccess ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"
              class="mr-2"
            ></i>
            {{ submitMessage }}
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-3xl p-8 shadow-xl">
            <h3 class="text-2xl font-bold text-dark mb-6">Контактная информация</h3>

            <div class="space-y-6">
              <div class="flex items-start">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <i class="fas fa-phone text-primary text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-dark mb-1">Телефон</h4>
                  <a
                    href="tel:+79001234567"
                    class="text-gray-600 hover:text-primary transition-colors"
                    >+7 (900) 123-45-67</a
                  >
                </div>
              </div>

              <div class="flex items-start">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <i class="fas fa-envelope text-primary text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-dark mb-1">Email</h4>
                  <a
                    href="mailto:info@beautystudio.ru"
                    class="text-gray-600 hover:text-primary transition-colors"
                    >info@beautystudio.ru</a
                  >
                </div>
              </div>

              <div class="flex items-start">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <i class="fas fa-map-marker-alt text-primary text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-dark mb-1">Адрес</h4>
                  <p class="text-gray-600">г. Москва, ул. Примерная, д. 10</p>
                </div>
              </div>

              <div class="flex items-start">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <i class="fas fa-clock text-primary text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-dark mb-1">Режим работы</h4>
                  <p class="text-gray-600">Пн-Сб: 9:00 - 21:00</p>
                  <p class="text-gray-600">Вс: 10:00 - 18:00</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-8 shadow-xl">
            <h3 class="text-2xl font-bold text-dark mb-6">Мы в соцсетях</h3>
            <div class="flex space-x-4">
              <a
                href="#"
                class="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-200"
              >
                <i class="fab fa-vk"></i>
              </a>
              <a
                href="#"
                class="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-200"
              >
                <i class="fab fa-telegram"></i>
              </a>
              <a
                href="#"
                class="w-14 h-14 bg-green-500 text-white rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-200"
              >
                <i class="fab fa-whatsapp"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { apiCreateLeadRoute } from '../api/leads'

const form = ref({
  name: '',
  phone: '',
  email: '',
  service: '',
  message: ''
})

const isSubmitting = ref(false)
const submitMessage = ref('')
const submitSuccess = ref(false)

const submitForm = async () => {
  isSubmitting.value = true
  submitMessage.value = ''

  try {
    const messageText = form.value.service
      ? `Услуга: ${form.value.service}. ${form.value.message}`
      : form.value.message

    const result = await apiCreateLeadRoute.run(ctx, {
      name: form.value.name,
      phone: form.value.phone,
      email: form.value.email,
      message: messageText
    })

    if (result.success) {
      submitSuccess.value = true
      submitMessage.value = 'Спасибо за заявку! Мы свяжемся с вами в ближайшее время.'

      form.value = {
        name: '',
        phone: '',
        email: '',
        service: '',
        message: ''
      }
    } else {
      submitSuccess.value = false
      submitMessage.value = result.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.'
    }
  } catch (error) {
    submitSuccess.value = false
    submitMessage.value = 'Произошла ошибка. Пожалуйста, попробуйте позже.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
