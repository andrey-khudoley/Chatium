<template>
  <section id="advantages" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4 section-title">
          Наши преимущества
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mt-8">
          Почему нас выбирают более 500 компаний
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div
          v-for="advantage in advantages"
          :key="advantage.id"
          class="text-center p-6 rounded-xl hover:bg-gray-50 transition"
        >
          <div
            class="bg-gradient-to-br from-primary to-accent text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-3xl"
          >
            <i :class="advantage.icon"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">{{ advantage.title }}</h3>
          <p class="text-gray-600">{{ advantage.description }}</p>
        </div>
      </div>

      <div class="mt-16 bg-gradient-to-r from-primary to-accent rounded-2xl p-8 md:p-12 text-white">
        <div class="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div class="text-5xl font-bold mb-2">29+</div>
            <div class="text-blue-100">лет на рынке</div>
          </div>
          <div>
            <div class="text-5xl font-bold mb-2">500+</div>
            <div class="text-blue-100">довольных клиентов</div>
          </div>
          <div>
            <div class="text-5xl font-bold mb-2">10000+</div>
            <div class="text-blue-100">наименований продукции</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const advantages = ref([
  {
    id: 1,
    icon: 'fas fa-medal',
    title: 'Высокое качество',
    description: 'Продукция соответствует ГОСТ и международным стандартам'
  },
  {
    id: 2,
    icon: 'fas fa-dollar-sign',
    title: 'Доступные цены',
    description: 'Прямые поставки от производителя без наценок посредников'
  },
  {
    id: 3,
    icon: 'fas fa-warehouse',
    title: 'Большой склад',
    description: 'Постоянное наличие продукции на складе для оперативной отгрузки'
  },
  {
    id: 4,
    icon: 'fas fa-headset',
    title: 'Поддержка 24/7',
    description: 'Консультации специалистов и техническая поддержка в любое время'
  }
])
</script>
