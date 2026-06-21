<template>
  <section id="portfolio" class="py-20 bg-gradient-to-br from-light to-accent">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold font-heading mb-4">Портфолио</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto">
          Галерея моих работ – каждый образ уникален и создан с любовью
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
        <div
          v-for="(image, index) in portfolio"
          :key="index"
          class="relative overflow-hidden rounded-2xl hover-lift group cursor-pointer aspect-square"
        >
          <img
            :src="image.url"
            :alt="image.alt"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-dark/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4"
          >
            <p class="text-white font-semibold text-sm">{{ image.alt }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const portfolio = [
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_6orNkpcE0b.488x650.jpeg',
    alt: 'Элегантный вечерний образ'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_BpbfCfeU6o.436x650.jpeg',
    alt: 'Свадебный макияж'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_vtwIrac8G2.433x650.jpeg',
    alt: 'Нежный свадебный образ'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_zAydGDaluI.431x650.jpeg',
    alt: 'Вечерний гламур'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_S8wG05KPQI.520x650.jpeg',
    alt: 'Классический макияж'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_4gc8U7foa0.536x650.jpeg',
    alt: 'Золотой акцент'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_L9GkiOMaqX.650x650.jpeg',
    alt: 'Профессиональный стиль'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_BdlaXR7tjP.434x650.jpeg',
    alt: 'Натуральная красота'
  }
]
</script>
