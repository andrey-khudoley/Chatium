<template>
  <section id="services" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <h2 class="section-title">Наши услуги</h2>
      <p class="section-subtitle">Широкий спектр профессиональных косметологических процедур</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="service in services" :key="service.id" class="service-card">
          <div class="text-5xl mb-4 text-primary">
            <i :class="service.icon"></i>
          </div>
          <h3 class="text-2xl font-bold text-dark mb-3">{{ service.title }}</h3>
          <p class="text-gray-600 mb-4 leading-relaxed">{{ service.description }}</p>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-primary">{{ service.price }}</span>
            <a
              href="#contact"
              class="text-accent hover:text-primary transition-colors font-semibold"
            >
              Записаться <i class="fas fa-arrow-right ml-1"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const services = ref([
  {
    id: 1,
    icon: 'fas fa-face-smile-beam',
    title: 'Чистка лица',
    description:
      'Глубокое очищение кожи, удаление загрязнений и комедонов. Подходит для всех типов кожи.',
    price: 'от 3500₽'
  },
  {
    id: 2,
    icon: 'fas fa-syringe',
    title: 'Инъекции красоты',
    description:
      'Биоревитализация, мезотерапия, ботулинотерапия для омоложения и улучшения состояния кожи.',
    price: 'от 8000₽'
  },
  {
    id: 3,
    icon: 'fas fa-hands-bubbles',
    title: 'Массаж лица',
    description: 'Лифтинг-массаж для тонуса кожи, улучшения контура лица и устранения отёчности.',
    price: 'от 2500₽'
  },
  {
    id: 4,
    icon: 'fas fa-wand-magic-sparkles',
    title: 'Пилинги',
    description:
      'Химические пилинги для обновления кожи, выравнивания тона и борьбы с пигментацией.',
    price: 'от 4000₽'
  },
  {
    id: 5,
    icon: 'fas fa-spa',
    title: 'Уход за телом',
    description: 'SPA-процедуры, обёртывания, массажи для красоты и здоровья всего тела.',
    price: 'от 5000₽'
  },
  {
    id: 6,
    icon: 'fas fa-droplet',
    title: 'Увлажнение',
    description: 'Интенсивное увлажнение кожи профессиональными средствами для сияющего вида.',
    price: 'от 3000₽'
  }
])
</script>
