<template>
  <footer class="bg-dark text-white py-12">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <div class="flex items-center space-x-2 mb-4">
            <i class="fas fa-spa text-primary text-3xl"></i>
            <span class="text-2xl font-bold font-serif">Beauty Studio</span>
          </div>
          <p class="text-gray-400 leading-relaxed">
            Профессиональная косметология для вашей красоты и здоровья. Индивидуальный подход и
            забота о каждом клиенте.
          </p>
        </div>

        <div>
          <h4 class="text-xl font-bold mb-4">Быстрые ссылки</h4>
          <ul class="space-y-2">
            <li>
              <a href="#home" class="text-gray-400 hover:text-primary transition-colors">Главная</a>
            </li>
            <li>
              <a href="#services" class="text-gray-400 hover:text-primary transition-colors"
                >Услуги</a
              >
            </li>
            <li>
              <a href="#about" class="text-gray-400 hover:text-primary transition-colors">О нас</a>
            </li>
            <li>
              <a href="#gallery" class="text-gray-400 hover:text-primary transition-colors"
                >Галерея</a
              >
            </li>
            <li>
              <a href="#contact" class="text-gray-400 hover:text-primary transition-colors"
                >Контакты</a
              >
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-xl font-bold mb-4">Контакты</h4>
          <ul class="space-y-3 text-gray-400">
            <li class="flex items-center">
              <i class="fas fa-phone mr-3 text-primary"></i>
              <a href="tel:+79001234567" class="hover:text-primary transition-colors"
                >+7 (900) 123-45-67</a
              >
            </li>
            <li class="flex items-center">
              <i class="fas fa-envelope mr-3 text-primary"></i>
              <a href="mailto:info@beautystudio.ru" class="hover:text-primary transition-colors"
                >info@beautystudio.ru</a
              >
            </li>
            <li class="flex items-start">
              <i class="fas fa-map-marker-alt mr-3 text-primary mt-1"></i>
              <span>г. Москва, ул. Примерная, д. 10</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-700 pt-8 text-center text-gray-400">
        <p>&copy; {{ currentYear }} Beauty Studio. Все права защищены.</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue'

const currentYear = ref(new Date().getFullYear())
</script>
