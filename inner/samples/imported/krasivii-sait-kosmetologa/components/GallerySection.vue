<template>
  <section id="gallery" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <h2 class="section-title">Наши работы</h2>
      <p class="section-subtitle">Результаты, которые говорят сами за себя</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="image in gallery"
          :key="image.id"
          class="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
        >
          <img
            :src="image.url"
            :alt="image.title"
            class="w-full h-80 object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end"
          >
            <div class="p-6 text-white">
              <h4 class="text-xl font-bold mb-2">{{ image.title }}</h4>
              <p class="text-sm text-gray-200">{{ image.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-12">
        <p class="text-gray-600 mb-4">Следите за нашими новыми работами в социальных сетях</p>
        <div class="flex justify-center space-x-4">
          <a
            href="#"
            class="w-12 h-12 bg-primary hover:bg-accent text-white rounded-full flex items-center justify-center text-xl transition-colors duration-200"
          >
            <i class="fab fa-instagram"></i>
          </a>
          <a
            href="#"
            class="w-12 h-12 bg-primary hover:bg-accent text-white rounded-full flex items-center justify-center text-xl transition-colors duration-200"
          >
            <i class="fab fa-vk"></i>
          </a>
          <a
            href="#"
            class="w-12 h-12 bg-primary hover:bg-accent text-white rounded-full flex items-center justify-center text-xl transition-colors duration-200"
          >
            <i class="fab fa-telegram"></i>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const gallery = ref([
  {
    id: 1,
    url: 'https://msk.cdn-chatium.io/get/image_msk_72bZRhs1UE.433x650.jpeg',
    title: 'Чистка лица',
    description: 'Результат после комплексной чистки'
  },
  {
    id: 2,
    url: 'https://msk.cdn-chatium.io/get/image_msk_TFkswOZpfM.463x650.jpeg',
    title: 'Массаж лица',
    description: 'Подтянутый контур лица'
  },
  {
    id: 3,
    url: 'https://msk.cdn-chatium.io/get/image_msk_7qpoEvNGjX.433x650.jpeg',
    title: 'Уход за кожей',
    description: 'Сияющая здоровая кожа'
  },
  {
    id: 4,
    url: 'https://msk.cdn-chatium.io/get/image_msk_RCrAgPNS1a.940x627.jpeg',
    title: 'Уютный кабинет',
    description: 'Комфортная атмосфера'
  },
  {
    id: 5,
    url: 'https://msk.cdn-chatium.io/get/image_msk_aYj3ngatY4.433x650.jpeg',
    title: 'Процедуры',
    description: 'Профессиональный подход'
  },
  {
    id: 6,
    url: 'https://msk.cdn-chatium.io/get/image_msk_MbjLpQfK3Y.940x627.jpeg',
    title: 'Результаты',
    description: 'Забота о вашей красоте'
  }
])
</script>
