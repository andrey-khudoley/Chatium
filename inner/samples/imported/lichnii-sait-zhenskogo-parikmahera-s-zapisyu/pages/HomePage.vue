<template>
  <div class="min-h-screen bg-light">
    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center overflow-hidden">
      <div class="absolute inset-0">
        <img :src="heroImage" alt="Салон красоты" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
      </div>

      <div class="relative z-10 text-center text-white container-custom px-6">
        <h1 class="text-5xl lg:text-7xl font-display font-bold mb-6 animate-fade-in">
          Создаём образы,<br />которые вдохновляют
        </h1>
        <p class="text-xl lg:text-2xl mb-8 font-light">Профессиональная забота о ваших волосах</p>
        <button @click="scrollToBooking" class="btn-primary text-lg">Записаться онлайн</button>
      </div>
    </section>

    <!-- About Section -->
    <section class="section-padding bg-white">
      <div class="container-custom">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img :src="aboutImage" alt="О мастере" class="rounded-2xl shadow-2xl" />
          </div>
          <div>
            <h2 class="text-4xl font-display font-bold mb-6 text-secondary">О мастере</h2>
            <p class="text-lg text-gray-700 mb-4 leading-relaxed">
              Добро пожаловать! Я профессиональный парикмахер с более чем 10-летним опытом работы.
            </p>
            <p class="text-lg text-gray-700 mb-6 leading-relaxed">
              Моя страсть — создавать уникальные образы, которые подчёркивают индивидуальность
              каждого клиента. Использую только профессиональную косметику и современные техники
              окрашивания и стрижки.
            </p>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-light rounded-lg">
                <div class="text-3xl font-bold text-primary mb-1">10+</div>
                <div class="text-sm text-gray-600">лет опыта</div>
              </div>
              <div class="text-center p-4 bg-light rounded-lg">
                <div class="text-3xl font-bold text-primary mb-1">2000+</div>
                <div class="text-sm text-gray-600">довольных клиентов</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="section-padding bg-light">
      <div class="container-custom">
        <h2 class="text-4xl lg:text-5xl font-display font-bold text-center mb-4 text-secondary">
          Услуги
        </h2>
        <p class="text-center text-gray-600 mb-12 text-lg">
          Полный спектр парикмахерских услуг для вашей красоты
        </p>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="service in services" :key="service.name" class="service-card">
            <div class="text-4xl mb-4 text-primary">
              <i :class="service.icon"></i>
            </div>
            <h3 class="text-2xl font-display font-semibold mb-3 text-secondary">
              {{ service.name }}
            </h3>
            <p class="text-gray-600 mb-4">
              {{ service.description }}
            </p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-bold text-primary">
                {{ service.price }}
              </span>
              <span class="text-sm text-gray-500">
                {{ service.duration }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Gallery Section -->
    <section class="section-padding bg-white">
      <div class="container-custom">
        <h2 class="text-4xl lg:text-5xl font-display font-bold text-center mb-12 text-secondary">
          Портфолио
        </h2>

        <div class="grid md:grid-cols-3 gap-6">
          <div
            v-for="(image, index) in galleryImages"
            :key="index"
            class="relative overflow-hidden rounded-xl shadow-lg group cursor-pointer"
          >
            <img
              :src="image"
              alt="Работа мастера"
              class="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Booking Section -->
    <section id="booking" class="section-padding bg-light">
      <div class="container-custom max-w-4xl">
        <h2 class="text-4xl lg:text-5xl font-display font-bold text-center mb-4 text-secondary">
          Запись онлайн
        </h2>
        <p class="text-center text-gray-600 mb-12 text-lg">
          Выберите удобное время и запишитесь на услугу
        </p>

        <BookingForm />
      </div>
    </section>

    <!-- Contact Section -->
    <section class="section-padding bg-white">
      <div class="container-custom">
        <div class="grid md:grid-cols-2 gap-12">
          <div>
            <h2 class="text-4xl font-display font-bold mb-6 text-secondary">Контакты</h2>

            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-map-marker-alt text-primary text-xl"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-lg mb-1">Адрес</h3>
                  <p class="text-gray-600">г. Москва, ул. Примерная, д. 123</p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-phone text-primary text-xl"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-lg mb-1">Телефон</h3>
                  <p class="text-gray-600">+7 (999) 123-45-67</p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-clock text-primary text-xl"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-lg mb-1">Время работы</h3>
                  <p class="text-gray-600">Пн-Вс: 9:00 - 20:00</p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-envelope text-primary text-xl"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-lg mb-1">Email</h3>
                  <p class="text-gray-600">info@hair-stylist.ru</p>
                </div>
              </div>
            </div>

            <div class="mt-8 flex gap-4">
              <a
                href="#"
                class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-opacity-90 transition-all"
              >
                <i class="fab fa-instagram text-xl"></i>
              </a>
              <a
                href="#"
                class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-opacity-90 transition-all"
              >
                <i class="fab fa-telegram text-xl"></i>
              </a>
              <a
                href="#"
                class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-opacity-90 transition-all"
              >
                <i class="fab fa-whatsapp text-xl"></i>
              </a>
            </div>
          </div>

          <div class="relative h-96 md:h-full min-h-[400px]">
            <img
              :src="salonImage"
              alt="Салон"
              class="w-full h-full object-cover rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-secondary text-white py-8">
      <div class="container-custom text-center">
        <p>&copy; 2025 Профессиональный парикмахер. Все права защищены.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BookingForm from '../components/BookingForm.vue'

const heroImage = 'https://msk.cdn-chatium.io/get/image_msk_dB5NYbobvp.940x625.jpeg'
const aboutImage = 'https://msk.cdn-chatium.io/get/image_msk_2Ed77l5qGc.433x650.jpeg'
const salonImage = 'https://msk.cdn-chatium.io/get/image_msk_urh2jjVFuQ.940x627.jpeg'

const galleryImages = [
  'https://msk.cdn-chatium.io/get/image_msk_g1sIbfoBMX.433x650.jpeg',
  'https://msk.cdn-chatium.io/get/image_msk_SSuVv9tgUS.433x650.jpeg',
  'https://msk.cdn-chatium.io/get/image_msk_xkOLp12EiD.433x650.jpeg',
  'https://msk.cdn-chatium.io/get/image_msk_WSrUDLy2zo.433x650.jpeg',
  'https://msk.cdn-chatium.io/get/image_msk_1BP4hYk3C1.433x650.jpeg',
  'https://msk.cdn-chatium.io/get/image_msk_lVDKKPMAx9.940x627.jpeg'
]

const services = [
  {
    name: 'Женская стрижка',
    description: 'Современные и классические стрижки с учётом типа лица и структуры волос',
    price: 'от 2500 ₽',
    duration: '60 мин',
    icon: 'fas fa-cut'
  },
  {
    name: 'Мужская стрижка',
    description: 'Стильные мужские стрижки и оформление бороды',
    price: 'от 1500 ₽',
    duration: '45 мин',
    icon: 'fas fa-scissors'
  },
  {
    name: 'Окрашивание',
    description: 'Все виды окрашивания: тонирование, балаяж, омбре, сложные техники',
    price: 'от 4000 ₽',
    duration: '120 мин',
    icon: 'fas fa-palette'
  },
  {
    name: 'Укладка',
    description: 'Профессиональная укладка для любого случая',
    price: 'от 1500 ₽',
    duration: '45 мин',
    icon: 'fas fa-wind'
  },
  {
    name: 'Уход и восстановление',
    description: 'Процедуры для здоровья и красоты ваших волос',
    price: 'от 2000 ₽',
    duration: '60 мин',
    icon: 'fas fa-spa'
  },
  {
    name: 'Свадебная укладка',
    description: 'Создание неповторимого образа для вашего особенного дня',
    price: 'от 5000 ₽',
    duration: '90 мин',
    icon: 'fas fa-crown'
  }
]

function scrollToBooking() {
  const bookingSection = document.getElementById('booking')
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>
