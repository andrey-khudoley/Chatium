<template>
  <section id="portfolio" class="py-20 bg-gradient-to-br from-secondary to-white">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="section-title">Портфолио</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto mt-4">Наши работы – наша гордость</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="(image, index) in portfolioImages"
          :key="index"
          class="relative overflow-hidden rounded-xl shadow-lg cursor-pointer hover-lift aspect-square"
          @click="openImage(index)"
        >
          <img :src="image.url" :alt="image.title" class="w-full h-full object-cover" />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"
          >
            <div class="absolute bottom-4 left-4 text-white">
              <p class="font-bold text-sm">{{ image.title }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-12">
        <p class="text-gray-600 mb-4">Больше работ в наших социальных сетях</p>
        <div class="flex justify-center gap-4">
          <a
            href="#"
            class="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <i class="fab fa-instagram"></i>
          </a>
          <a
            href="#"
            class="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <i class="fab fa-vk"></i>
          </a>
          <a
            href="#"
            class="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <i class="fab fa-telegram"></i>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const portfolioImages = [
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_bl6l7talKx.940x629.jpeg',
    title: 'Нежный дизайн'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_oiGZXxICw0.487x650.jpeg',
    title: 'Классический френч'
  },
  { url: 'https://msk.cdn-chatium.io/get/image_msk_akKxCENn7t.433x650.jpeg', title: 'С блестками' },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_6U0IaZ1A78.488x650.jpeg',
    title: 'Пастельные тона'
  },
  { url: 'https://msk.cdn-chatium.io/get/image_msk_LqmACsFu1Y.433x650.jpeg', title: 'Минимализм' },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_f3hm3PL8Fs.433x650.jpeg',
    title: 'Яркий дизайн'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_iLzsDTbjUY.433x650.jpeg',
    title: 'Цветные акценты'
  },
  {
    url: 'https://msk.cdn-chatium.io/get/image_msk_8xRDfN5gft.433x650.jpeg',
    title: 'Красная классика'
  }
]

const openImage = (index) => {
  // Можно добавить модальное окно для просмотра
  console.log('Open image', index)
}
</script>
