<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <i class="fas fa-spa text-primary text-2xl mr-2"></i>
            <span class="text-xl font-display font-bold text-dark">Маникюр & Стиль</span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#services" class="text-gray-700 hover:text-primary transition-colors"
              >Услуги</a
            >
            <a href="#portfolio" class="text-gray-700 hover:text-primary transition-colors"
              >Портфолио</a
            >
            <a href="#about" class="text-gray-700 hover:text-primary transition-colors"
              >О мастере</a
            >
            <a href="#reviews" class="text-gray-700 hover:text-primary transition-colors">Отзывы</a>
            <a
              href="#booking"
              class="bg-primary text-white px-6 py-2 rounded-full hover:bg-accent transition-colors"
            >
              Записаться
            </a>
            <button
              @click="handleChatClick"
              class="text-gray-700 hover:text-primary transition-colors"
              :disabled="isCheckingTransport"
            >
              <i
                :class="[
                  isCheckingTransport ? 'fas fa-spinner fa-spin mr-1' : 'fas fa-comment-dots mr-1'
                ]"
              ></i>
              Чат
            </button>
            <a
              v-if="ctx.user?.is('Admin')"
              :href="adminPageRoute.url()"
              class="text-gray-700 hover:text-primary transition-colors"
              title="Админка"
            >
              <i class="fas fa-user-shield"></i>
            </a>
          </div>
          <button @click="toggleMenu" class="md:hidden text-gray-700">
            <i class="fas fa-bars text-2xl"></i>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="menuOpen" class="md:hidden bg-white border-t">
        <div class="px-4 pt-2 pb-4 space-y-2">
          <a
            href="#services"
            @click="toggleMenu"
            class="block py-2 text-gray-700 hover:text-primary transition-colors"
          >
            Услуги
          </a>
          <a
            href="#portfolio"
            @click="toggleMenu"
            class="block py-2 text-gray-700 hover:text-primary transition-colors"
          >
            Портфолио
          </a>
          <a
            href="#about"
            @click="toggleMenu"
            class="block py-2 text-gray-700 hover:text-primary transition-colors"
          >
            О мастере
          </a>
          <a
            href="#reviews"
            @click="toggleMenu"
            class="block py-2 text-gray-700 hover:text-primary transition-colors"
          >
            Отзывы
          </a>
          <button
            @click="handleChatClick"
            class="block py-2 text-gray-700 hover:text-primary transition-colors text-left w-full"
            :disabled="isCheckingTransport"
          >
            <i
              :class="[
                isCheckingTransport ? 'fas fa-spinner fa-spin mr-1' : 'fas fa-comment-dots mr-1'
              ]"
            ></i>
            Чат с помощником
          </button>
          <a
            v-if="ctx.user?.is('Admin')"
            :href="adminPageRoute.url()"
            class="block py-2 text-gray-700 hover:text-primary transition-colors"
          >
            <i class="fas fa-user-shield mr-1"></i> Админка
          </a>
          <a
            href="#booking"
            @click="toggleMenu"
            class="block py-2 bg-primary text-white text-center rounded-full hover:bg-accent transition-colors"
          >
            Записаться
          </a>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-24 pb-16 bg-gradient-to-br from-secondary via-white to-secondary">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 class="text-5xl md:text-6xl font-display font-bold text-dark mb-6 leading-tight">
              Красивые ногти — это искусство
            </h1>
            <p class="text-xl text-gray-600 mb-8">
              Профессиональный маникюр и педикюр от опытного мастера. Качественные материалы,
              индивидуальный подход к каждому клиенту.
            </p>
            <div class="flex flex-wrap gap-4">
              <a
                href="#booking"
                class="bg-primary text-white px-8 py-4 rounded-full hover:bg-accent transition-all transform hover:scale-105 shadow-lg text-lg font-semibold"
              >
                Записаться на прием
              </a>
              <button
                @click="handleChatClick"
                class="bg-white text-primary border-2 border-primary px-8 py-4 rounded-full hover:bg-secondary transition-all text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isCheckingTransport"
              >
                <i
                  :class="[
                    isCheckingTransport ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-comment-dots mr-2'
                  ]"
                ></i
                >{{ isCheckingTransport ? 'Подготовка...' : 'Спросить AI-помощника' }}
              </button>
            </div>
          </div>
          <div class="relative">
            <div class="rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://msk.cdn-chatium.io/get/image_msk_MY7eSYUaPv.434x650.jpeg"
                alt="Маникюр"
                class="w-full h-auto"
              />
            </div>
            <div class="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl">
              <div class="flex items-center gap-3">
                <i class="fas fa-star text-yellow-400 text-3xl"></i>
                <div>
                  <div class="text-3xl font-bold text-dark">4.9</div>
                  <div class="text-sm text-gray-600">Рейтинг мастера</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark mb-4">Наши услуги</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Широкий спектр услуг для ухода за вашими ногтями
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-if="isLoadingServices" class="col-span-full text-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
            <p class="text-gray-600">Загрузка услуг...</p>
          </div>
          <div
            v-else
            v-for="service in services"
            :key="service.id"
            class="bg-secondary rounded-2xl p-8 hover:shadow-xl transition-all transform hover:-translate-y-2"
          >
            <div
              class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl"
            >
              <i :class="service.icon"></i>
            </div>
            <h3 class="text-2xl font-display font-bold text-dark mb-3">{{ service.title }}</h3>
            <p class="text-gray-600 mb-4">{{ service.description }}</p>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-primary">{{ service.price }}</span>
              <span class="text-gray-500">₽</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portfolio Section -->
    <section id="portfolio" class="py-20 bg-gradient-to-br from-secondary to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark mb-4">Наши работы</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Вдохновитесь нашими работами и выберите свой стиль
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="(work, index) in portfolio"
            :key="index"
            class="relative group overflow-hidden rounded-2xl aspect-square cursor-pointer"
          >
            <img :src="work.url" :alt="work.description" class="w-full h-full object-cover" />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4"
            >
              <p class="text-white text-sm">{{ work.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_Fg0l4yz7b7.940x627.jpeg"
              alt="О мастере"
              class="w-full h-auto"
            />
          </div>
          <div>
            <h2 class="text-4xl md:text-5xl font-display font-bold text-dark mb-6">О мастере</h2>
            <p class="text-lg text-gray-600 mb-6">
              Здравствуйте! Меня зовут Анна, и я профессиональный мастер маникюра с более чем
              7-летним опытом работы.
            </p>
            <p class="text-lg text-gray-600 mb-6">
              Я постоянно совершенствую свои навыки, посещая мастер-классы и курсы повышения
              квалификации. Использую только качественные и безопасные материалы.
            </p>
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div
                  class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-certificate"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-lg text-dark mb-1">Сертифицированный специалист</h4>
                  <p class="text-gray-600">Дипломы и сертификаты международного образца</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div
                  class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-heart"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-lg text-dark mb-1">Индивидуальный подход</h4>
                  <p class="text-gray-600">Учитываю все пожелания и особенности каждого клиента</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div
                  class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-clock"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-lg text-dark mb-1">Удобный график</h4>
                  <p class="text-gray-600">Работаю 7 дней в неделю с 9:00 до 21:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Reviews Section -->
    <section id="reviews" class="py-20 bg-gradient-to-br from-white to-secondary">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark mb-4">
            Отзывы клиентов
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Что говорят о нас наши постоянные клиенты
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div
            v-for="review in reviews"
            :key="review.name"
            class="bg-white rounded-2xl p-8 shadow-lg"
          >
            <div class="flex items-center gap-1 mb-4">
              <i v-for="i in 5" :key="i" class="fas fa-star text-yellow-400"></i>
            </div>
            <p class="text-gray-700 mb-6 italic">"{{ review.text }}"</p>
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold"
              >
                {{ review.name[0] }}
              </div>
              <div>
                <div class="font-semibold text-dark">{{ review.name }}</div>
                <div class="text-sm text-gray-500">{{ review.date }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Booking Section -->
    <section id="booking" class="py-20 bg-white">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark mb-4">
            Записаться на прием
          </h2>
          <p class="text-xl text-gray-600">Заполните форму, и я свяжусь с вами в ближайшее время</p>
        </div>

        <form
          @submit.prevent="submitBooking"
          class="bg-secondary rounded-3xl p-8 md:p-12 shadow-xl"
        >
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-semibold text-dark mb-2">Ваше имя *</label>
              <input
                v-model="form.clientName"
                type="text"
                required
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                placeholder="Анна"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-dark mb-2">Телефон *</label>
              <input
                v-model="form.clientPhone"
                type="tel"
                required
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-dark mb-2">Email</label>
            <input
              v-model="form.clientEmail"
              type="email"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-dark mb-2">Выберите услугу *</label>
            <select
              v-model="form.service"
              required
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Выберите услугу</option>
              <option v-for="service in services" :key="service.id" :value="service.title">
                {{ service.title }} - {{ service.price }} ₽
              </option>
            </select>
          </div>

          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-semibold text-dark mb-2">Дата *</label>
              <input
                v-model="form.date"
                @change="loadTimeSlots(form.date)"
                type="date"
                required
                :min="minDate"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-dark mb-2">Время *</label>
              <select
                v-model="form.time"
                required
                :disabled="!form.date || isLoadingTimeSlots"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {{
                    isLoadingTimeSlots
                      ? 'Загрузка...'
                      : form.date
                        ? 'Выберите время'
                        : 'Сначала выберите дату'
                  }}
                </option>
                <option v-for="time in timeSlots" :key="time" :value="time">{{ time }}</option>
              </select>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-dark mb-2">Комментарий</label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              placeholder="Дополнительные пожелания..."
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full bg-primary text-white py-4 rounded-xl hover:bg-accent transition-all transform hover:scale-105 shadow-lg text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Отправка...' : 'Записаться' }}
          </button>

          <div
            v-if="submitMessage"
            :class="[
              'mt-4 p-4 rounded-xl',
              submitSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ submitMessage }}
          </div>
        </form>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-dark text-white py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div class="flex items-center mb-4">
              <i class="fas fa-spa text-primary text-2xl mr-2"></i>
              <span class="text-xl font-display font-bold">Маникюр & Стиль</span>
            </div>
            <p class="text-gray-400">Профессиональный уход за вашими ногтями</p>
          </div>
          <div>
            <h4 class="font-semibold text-lg mb-4">Контакты</h4>
            <div class="space-y-2 text-gray-400">
              <p><i class="fas fa-phone mr-2"></i>+7 (999) 123-45-67</p>
              <p><i class="fas fa-envelope mr-2"></i>info@nails.com</p>
              <p><i class="fas fa-map-marker-alt mr-2"></i>г. Москва, ул. Примерная, 10</p>
            </div>
          </div>
          <div>
            <h4 class="font-semibold text-lg mb-4">Режим работы</h4>
            <div class="text-gray-400">
              <p>Понедельник - Воскресенье</p>
              <p class="font-semibold text-white">9:00 - 21:00</p>
            </div>
          </div>
        </div>
        <div class="border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Маникюр & Стиль. Все права защищены.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiBookingsCreateRoute } from '../api/bookings'
import { chatPageRoute } from '../chat'
import { adminPageRoute } from '../admin'
import { apiGetServicesRoute, apiGetTimeSlotsRoute } from '../api/config'
import { apiCheckTransportRoute, apiCreateTransportRoute } from '../api/setup'

const menuOpen = ref(false)
const isSubmitting = ref(false)
const submitMessage = ref('')
const submitSuccess = ref(false)

const form = ref({
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  service: '',
  date: '',
  time: '',
  notes: ''
})

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const timeSlots = ref([])
const services = ref([])
const isLoadingServices = ref(true)
const isLoadingTimeSlots = ref(false)
const isCheckingTransport = ref(false)

const serviceIconMap = {
  manicure: 'fas fa-hand-sparkles',
  pedicure: 'fas fa-shoe-prints',
  'manicure-design': 'fas fa-palette',
  'nail-extension': 'fas fa-magic',
  'nail-correction': 'fas fa-cog',
  'nail-strengthening': 'fas fa-paint-brush'
}

const loadServices = async () => {
  try {
    isLoadingServices.value = true
    const servicesData = await apiGetServicesRoute.run(ctx)
    services.value = servicesData.map((service) => ({
      id: service.id,
      title: service.name,
      description: service.description,
      price: service.price,
      icon: serviceIconMap[service.id] || 'fas fa-hand-sparkles',
      duration: service.duration
    }))
  } catch (error) {
    console.error('Failed to load services:', error)
  } finally {
    isLoadingServices.value = false
  }
}

const loadTimeSlots = async (date) => {
  if (!date) {
    timeSlots.value = []
    return
  }

  try {
    isLoadingTimeSlots.value = true
    const slots = await apiGetTimeSlotsRoute({ date }).run(ctx)
    timeSlots.value = slots
  } catch (error) {
    console.error('Failed to load time slots:', error)
    timeSlots.value = []
  } finally {
    isLoadingTimeSlots.value = false
  }
}

onMounted(() => {
  loadServices()
})

const portfolio = [
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_OtNere8158.433x650.jpeg',
    description: 'Яркий дизайн'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_bl6l7talKx.940x629.jpeg',
    description: 'Нежные медузы'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_Dy9YPcu3Yi.433x650.jpeg',
    description: 'Классический красный'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_zZ98Yitz8V.433x650.jpeg',
    description: 'Горошек'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_6U0IaZ1A78.488x650.jpeg',
    description: 'Стильный дизайн'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_LqmACsFu1Y.433x650.jpeg',
    description: 'Пастельные тона'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_GaGoaCKivH.433x650.jpeg',
    description: 'Минимализм'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_BI49qv3JH2.520x650.jpeg',
    description: 'Яркие цвета'
  }
]

const reviews = [
  {
    name: 'Елена Смирнова',
    text: 'Анна - настоящий профессионал! Маникюр держится идеально, дизайн превосходит все ожидания. Обязательно вернусь снова!',
    date: '15 января 2025'
  },
  {
    name: 'Мария Петрова',
    text: 'Очень довольна результатом! Уютная атмосфера, приятное общение и красивые ногти. Рекомендую всем своим подругам!',
    date: '10 января 2025'
  },
  {
    name: 'Ольга Иванова',
    text: 'Хожу к Анне уже больше года. Всегда качественная работа, индивидуальный подход и отличное настроение после визита!',
    date: '5 января 2025'
  }
]

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const handleChatClick = async () => {
  try {
    isCheckingTransport.value = true

    // Проверяем наличие транспорта
    const checkResult = await apiCheckTransportRoute.run(ctx)

    if (!checkResult.exists) {
      // Транспорта нет - создаем
      console.log('Транспорт не найден, создаю...')
      const createResult = await apiCreateTransportRoute.run(ctx)

      if (!createResult.success) {
        console.error('Ошибка создания транспорта:', createResult)
        alert('Ошибка при создании транспорта')
        return
      }

      console.log('Транспорт создан успешно')
    }

    // Переходим на страницу чата
    window.location.href = chatPageRoute.url()
  } catch (error) {
    console.error('Ошибка при подготовке чата:', error)
    alert('Ошибка при подготовке чата')
  } finally {
    isCheckingTransport.value = false
  }
}

const submitBooking = async () => {
  isSubmitting.value = true
  submitMessage.value = ''
  submitSuccess.value = false

  try {
    const response = await apiBookingsCreateRoute.run(ctx, form.value)

    if (response.success) {
      submitSuccess.value = true
      submitMessage.value =
        'Спасибо за запись! Я свяжусь с вами в ближайшее время для подтверждения.'
      form.value = {
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        service: '',
        date: '',
        time: '',
        notes: ''
      }
    } else {
      submitMessage.value = 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.'
    }
  } catch (error) {
    console.error('Booking error:', error)
    submitMessage.value = 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>
