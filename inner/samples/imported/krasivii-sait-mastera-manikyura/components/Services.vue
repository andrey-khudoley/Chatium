<template>
  <section id="services" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="section-title">Наши услуги</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto mt-4">
          Полный спектр услуг для красоты ваших ногтей
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="service in services"
          :key="service.title"
          class="bg-gradient-to-br from-secondary to-white p-8 rounded-2xl shadow-lg hover-lift"
        >
          <div class="text-5xl mb-4">{{ service.icon }}</div>
          <h3 class="text-2xl font-bold mb-3">{{ service.title }}</h3>
          <p class="text-gray-600 mb-4">{{ service.description }}</p>
          <p class="text-2xl font-bold text-primary">от {{ service.price }} ₽</p>
          <a
            href="#booking"
            class="inline-block mt-4 text-primary hover:text-accent transition-colors"
          >
            Записаться <i class="fas fa-arrow-right ml-2"></i>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const services = [
  {
    icon: '💅',
    title: 'Классический маникюр',
    description: 'Обработка кутикулы, придание формы, покрытие',
    price: 1500
  },
  {
    icon: '✨',
    title: 'Маникюр с покрытием гель-лак',
    description: 'Долговременное покрытие, стойкость до 3 недель',
    price: 2000
  },
  {
    icon: '🎨',
    title: 'Дизайн ногтей',
    description: 'Художественная роспись, стразы, наклейки',
    price: 500
  },
  {
    icon: '💎',
    title: 'Укрепление ногтей',
    description: 'Гелевое или акриловое укрепление',
    price: 1800
  },
  {
    icon: '🌺',
    title: 'Педикюр',
    description: 'Комплексный уход за стопами и ногтями',
    price: 2500
  },
  {
    icon: '🔧',
    title: 'Коррекция',
    description: 'Коррекция отросших ногтей',
    price: 1200
  }
]
</script>
