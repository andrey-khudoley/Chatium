<template>
  <footer class="bg-gray-900 text-white py-12">
    <div class="container mx-auto px-4">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div class="flex items-center space-x-3 mb-4">
            <i class="fas fa-bolt text-3xl text-primary"></i>
            <div>
              <h3 class="text-xl font-bold">БолтПром</h3>
              <p class="text-sm text-gray-400">Производство крепежа</p>
            </div>
          </div>
          <p class="text-gray-400 text-sm">
            Надежный партнер в производстве качественных крепежных изделий с 1995 года
          </p>
        </div>

        <div>
          <h4 class="text-lg font-semibold mb-4">Компания</h4>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li><a href="#about" class="hover:text-white transition">О нас</a></li>
            <li><a href="#products" class="hover:text-white transition">Продукция</a></li>
            <li><a href="#advantages" class="hover:text-white transition">Преимущества</a></li>
            <li><a href="#contacts" class="hover:text-white transition">Контакты</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-lg font-semibold mb-4">Контакты</h4>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>
              <i class="fas fa-phone mr-2"></i>
              +7 (495) 123-45-67
            </li>
            <li>
              <i class="fas fa-envelope mr-2"></i>
              info@boltprom.ru
            </li>
            <li>
              <i class="fas fa-map-marker-alt mr-2"></i>
              г. Москва, ул. Промышленная, 25
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-lg font-semibold mb-4">Режим работы</h4>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>Понедельник - Пятница</li>
            <li class="text-white font-semibold">9:00 - 18:00</li>
            <li class="mt-2">Суббота - Воскресенье</li>
            <li>Выходной</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
        <p>&copy; {{ currentYear }} БолтПром. Все права защищены.</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>
