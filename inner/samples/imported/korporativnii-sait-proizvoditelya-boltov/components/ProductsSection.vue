<template>
  <section id="products" class="py-20 bg-gray-50">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4 section-title">
          Наша продукция
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mt-8">
          Широкий ассортимент крепежных изделий для любых задач
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden card-hover"
        >
          <div class="h-64 overflow-hidden">
            <img :src="product.image" :alt="product.title" class="w-full h-full object-cover" />
          </div>
          <div class="p-6">
            <div class="text-primary text-3xl mb-4">
              <i :class="product.icon"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ product.title }}</h3>
            <p class="text-gray-600 mb-4">{{ product.description }}</p>
            <ul class="space-y-2 mb-6">
              <li v-for="spec in product.specs" :key="spec" class="text-sm text-gray-500">
                <i class="fas fa-check text-green-500 mr-2"></i>
                {{ spec }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const products = ref([
  {
    id: 1,
    title: 'Болты',
    icon: 'fas fa-bolt',
    image: 'https://msk.cdn-chatium.io/get/image_msk_SytpgWYlNH.940x625.jpeg',
    description: 'Болты различных размеров и классов прочности',
    specs: ['Диаметр: М6 - М48', 'Класс прочности: 4.8 - 12.9', 'Покрытие: оцинковка, без покрытия']
  },
  {
    id: 2,
    title: 'Гайки',
    icon: 'fas fa-nut',
    image: 'https://msk.cdn-chatium.io/get/image_msk_LaoWLCeG35.940x627.jpeg',
    description: 'Гайки шестигранные, квадратные, корончатые',
    specs: ['Размеры: М6 - М48', 'Различные типы резьбы', 'Стандарты: DIN, ГОСТ']
  },
  {
    id: 3,
    title: 'Шпильки и винты',
    icon: 'fas fa-screwdriver',
    image: 'https://msk.cdn-chatium.io/get/image_msk_hXkegNxoXG.433x650.jpeg',
    description: 'Шпильки резьбовые, винты различного назначения',
    specs: [
      'Широкий типоразмерный ряд',
      'Специальные винты под заказ',
      'Высокая точность изготовления'
    ]
  }
])
</script>
