<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center text-white overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img
          src="https://msk.cdn-chatium.io/get/image_msk_VMS5Dc99wb.433x650.jpeg"
          alt="Стилист за работой"
          class="w-full h-full object-cover"
        />
        <div class="hero-overlay absolute inset-0"></div>
      </div>

      <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 class="text-5xl md:text-7xl font-bold mb-6 font-serif animate-fade-in">Анна Стилист</h1>
        <p class="text-xl md:text-2xl mb-8 font-light">
          Создаю уникальные образы и помогаю раскрыть вашу индивидуальность
        </p>
        <button @click="scrollToBooking" class="btn-primary text-lg">
          Записаться на консультацию
        </button>
      </div>

      <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <i class="fas fa-chevron-down text-3xl text-white opacity-70"></i>
      </div>
    </section>

    <!-- About Section -->
    <section class="py-20 px-4">
      <div class="max-w-6xl mx-auto">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="section-title gradient-text">Обо мне</h2>
            <p class="text-gray-700 text-lg leading-relaxed mb-6">
              Я профессиональный стилист с 10-летним опытом работы. Моя миссия — помочь каждому
              найти свой уникальный стиль, который подчеркнет индивидуальность и придаст
              уверенности.
            </p>
            <p class="text-gray-700 text-lg leading-relaxed mb-6">
              Работаю с образами любой сложности: от повседневных луков до торжественных
              мероприятий. Использую индивидуальный подход к каждому клиенту.
            </p>
            <div class="flex gap-4 mt-8">
              <div class="text-center">
                <div class="text-4xl font-bold text-primary">500+</div>
                <div class="text-gray-600">Довольных клиентов</div>
              </div>
              <div class="text-center">
                <div class="text-4xl font-bold text-primary">10</div>
                <div class="text-gray-600">Лет опыта</div>
              </div>
            </div>
          </div>
          <div class="relative">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_kcHWvKURcC.433x650.jpeg"
              alt="Стилист"
              class="rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="py-20 px-4 bg-accent">
      <div class="max-w-6xl mx-auto">
        <h2 class="section-title text-center gradient-text mb-16">Мои услуги</h2>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-user-tie"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">Разбор гардероба</h3>
            <p class="text-gray-600 mb-4">
              Анализ существующего гардероба, рекомендации по оптимизации и составлению базового
              гардероба
            </p>
            <div class="text-primary font-semibold text-xl">от 5000 ₽</div>
          </div>

          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-shopping-bag"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">Шоппинг-сопровождение</h3>
            <p class="text-gray-600 mb-4">
              Персональный шоппинг с учетом вашего стиля, бюджета и предпочтений
            </p>
            <div class="text-primary font-semibold text-xl">от 7000 ₽</div>
          </div>

          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-palette"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">Подбор образа</h3>
            <p class="text-gray-600 mb-4">
              Создание полного образа для мероприятия или повседневной жизни
            </p>
            <div class="text-primary font-semibold text-xl">от 4000 ₽</div>
          </div>

          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-tshirt"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">Капсульный гардероб</h3>
            <p class="text-gray-600 mb-4">Создание универсального капсульного гардероба на сезон</p>
            <div class="text-primary font-semibold text-xl">от 12000 ₽</div>
          </div>

          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-comments"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">Онлайн-консультация</h3>
            <p class="text-gray-600 mb-4">
              Консультация по стилю онлайн с разбором ваших фотографий
            </p>
            <div class="text-primary font-semibold text-xl">от 3000 ₽</div>
          </div>

          <div class="service-card">
            <div class="text-primary text-5xl mb-4">
              <i class="fas fa-star"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-4 text-secondary">VIP пакет</h3>
            <p class="text-gray-600 mb-4">
              Полное стилистическое сопровождение: от анализа до шоппинга
            </p>
            <div class="text-primary font-semibold text-xl">от 25000 ₽</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portfolio Section -->
    <section class="py-20 px-4">
      <div class="max-w-6xl mx-auto">
        <h2 class="section-title text-center gradient-text mb-16">Портфолио</h2>

        <div class="grid md:grid-cols-3 gap-6">
          <div class="relative overflow-hidden rounded-xl shadow-lg group cursor-pointer">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_10DaFsFpyP.940x627.jpeg"
              alt="Работа 1"
              class="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-300"
            ></div>
          </div>

          <div class="relative overflow-hidden rounded-xl shadow-lg group cursor-pointer">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_q7avVbG0oc.940x627.jpeg"
              alt="Работа 2"
              class="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-300"
            ></div>
          </div>

          <div class="relative overflow-hidden rounded-xl shadow-lg group cursor-pointer">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_aNI3NbTKzB.940x627.jpeg"
              alt="Работа 3"
              class="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-300"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Booking Section -->
    <section id="booking" class="py-20 px-4 bg-gradient-to-br from-accent via-white to-white">
      <div class="max-w-2xl mx-auto">
        <h2 class="section-title text-center gradient-text mb-4">Записаться на консультацию</h2>
        <p class="text-center text-gray-600 mb-12 text-lg">
          Заполните форму, и я свяжусь с вами в ближайшее время
        </p>

        <div class="card">
          <form @submit.prevent="submitBooking">
            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">Ваше имя *</label>
              <input
                v-model="form.clientName"
                type="text"
                placeholder="Введите ваше имя"
                required
              />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">Телефон *</label>
              <input v-model="form.phone" type="tel" placeholder="+7 (___) ___-__-__" required />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">Email</label>
              <input v-model="form.email" type="email" placeholder="your@email.com" />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">Выберите услугу *</label>
              <select v-model="form.service" required>
                <option value="">Выберите услугу</option>
                <option value="Разбор гардероба">Разбор гардероба</option>
                <option value="Шоппинг-сопровождение">Шоппинг-сопровождение</option>
                <option value="Подбор образа">Подбор образа</option>
                <option value="Капсульный гардероб">Капсульный гардероб</option>
                <option value="Онлайн-консультация">Онлайн-консультация</option>
                <option value="VIP пакет">VIP пакет</option>
              </select>
            </div>

            <div class="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label class="block text-gray-700 font-medium mb-2">Предпочтительная дата *</label>
                <input v-model="form.date" type="date" :min="minDate" required />
              </div>

              <div>
                <label class="block text-gray-700 font-medium mb-2">Предпочтительное время *</label>
                <select v-model="form.time" required>
                  <option value="">Выберите время</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="12:00">12:00</option>
                  <option value="13:00">13:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 font-medium mb-2">Комментарий</label>
              <textarea
                v-model="form.comment"
                rows="4"
                placeholder="Расскажите о ваших пожеланиях..."
              ></textarea>
            </div>

            <button type="submit" class="btn-primary w-full text-lg" :disabled="isSubmitting">
              <span v-if="!isSubmitting">Отправить заявку</span>
              <span v-else>Отправка...</span>
            </button>

            <div v-if="successMessage" class="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {{ successMessage }}
            </div>

            <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {{ errorMessage }}
            </div>
          </form>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="py-20 px-4 bg-dark text-white">
      <div class="max-w-6xl mx-auto text-center">
        <h2 class="text-4xl font-bold mb-8 font-serif">Контакты</h2>

        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div>
            <i class="fas fa-phone text-4xl text-primary mb-4"></i>
            <p class="text-xl">+7 (999) 123-45-67</p>
          </div>

          <div>
            <i class="fas fa-envelope text-4xl text-primary mb-4"></i>
            <p class="text-xl">anna@stylist.ru</p>
          </div>

          <div>
            <i class="fas fa-map-marker-alt text-4xl text-primary mb-4"></i>
            <p class="text-xl">Москва, ул. Примерная, 1</p>
          </div>
        </div>

        <div class="flex justify-center gap-6">
          <a href="#" class="text-3xl hover:text-primary transition-colors">
            <i class="fab fa-instagram"></i>
          </a>
          <a href="#" class="text-3xl hover:text-primary transition-colors">
            <i class="fab fa-telegram"></i>
          </a>
          <a href="#" class="text-3xl hover:text-primary transition-colors">
            <i class="fab fa-whatsapp"></i>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiCreateAppointmentRoute } from '../api/appointments'

const form = ref({
  clientName: '',
  phone: '',
  email: '',
  service: '',
  date: '',
  time: '',
  comment: ''
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

function scrollToBooking() {
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' })
}

async function submitBooking() {
  isSubmitting.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const result = await apiCreateAppointmentRoute.run(ctx, form.value)

    if (result.success) {
      successMessage.value = 'Спасибо! Ваша заявка отправлена. Я свяжусь с вами в ближайшее время.'
      form.value = {
        clientName: '',
        phone: '',
        email: '',
        service: '',
        date: '',
        time: '',
        comment: ''
      }
    } else {
      errorMessage.value = result.error || 'Произошла ошибка. Попробуйте еще раз.'
    }
  } catch (error) {
    errorMessage.value = 'Произошла ошибка при отправке. Попробуйте еще раз.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
