<template>
  <section id="services" class="py-20 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold font-heading mb-4">Услуги</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto">
          Индивидуальный подход к каждому клиенту и профессиональная косметика премиум класса
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="service in services"
          :key="service.title"
          class="bg-gradient-to-br from-accent to-white p-8 rounded-3xl hover-lift border border-primary/20"
        >
          <div
            class="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-6"
          >
            <i :class="service.icon" class="text-2xl text-white"></i>
          </div>
          <h3 class="text-2xl font-bold font-heading mb-3">{{ service.title }}</h3>
          <p class="text-gray-600 mb-4 leading-relaxed">{{ service.description }}</p>
          <div class="flex items-baseline gap-2 mb-4">
            <span class="text-3xl font-bold gradient-text">{{ service.price }}</span>
            <span class="text-gray-500">₽</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="feature in service.features"
              :key="feature"
              class="flex items-center gap-2 text-sm text-gray-600"
            >
              <i class="fas fa-check text-primary"></i>
              {{ feature }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const services = [
  {
    title: 'Дневной макияж',
    description: 'Естественный и свежий образ для повседневной жизни',
    price: '2500',
    icon: 'fas fa-sun',
    features: [
      'Подготовка кожи',
      'Выравнивание тона',
      'Акцент на естественность',
      'Стойкость до 8 часов'
    ]
  },
  {
    title: 'Вечерний макияж',
    description: 'Яркий и выразительный образ для особых событий',
    price: '3500',
    icon: 'fas fa-moon',
    features: [
      'Индивидуальный дизайн',
      'Профессиональная косметика',
      'Акцент на детали',
      'Стойкость до 12 часов'
    ]
  },
  {
    title: 'Свадебный макияж',
    description: 'Безупречный образ для самого важного дня',
    price: '5000',
    icon: 'fas fa-heart',
    features: [
      'Предварительная проба',
      'Стойкость весь день',
      'Коррекция в течение дня',
      'Работа с фотографом'
    ]
  }
]
</script>
