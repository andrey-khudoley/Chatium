<template>
  <section id="reviews" class="py-20 bg-white">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="section-title">Отзывы клиентов</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto mt-4">Что говорят о нас наши клиенты</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div
          v-for="review in reviews"
          :key="review.name"
          class="bg-gradient-to-br from-secondary to-white p-8 rounded-2xl shadow-lg hover-lift"
        >
          <div class="flex items-center mb-4">
            <div
              class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold mr-4"
            >
              {{ review.name[0] }}
            </div>
            <div>
              <h4 class="font-bold text-lg">{{ review.name }}</h4>
              <div class="flex text-yellow-500">
                <i v-for="n in 5" :key="n" class="fas fa-star"></i>
              </div>
            </div>
          </div>
          <p class="text-gray-700 italic">"{{ review.text }}"</p>
          <p class="text-sm text-gray-500 mt-4">{{ review.date }}</p>
        </div>
      </div>

      <div class="text-center mt-12">
        <p class="text-gray-600 mb-4">Оставьте свой отзыв после посещения!</p>
      </div>
    </div>
  </section>
</template>

<script setup>
const reviews = [
  {
    name: 'Анна Петрова',
    text: 'Замечательный мастер! Маникюр держится уже 3 недели, выглядит как только что сделанный. Очень довольна!',
    date: '15 октября 2025'
  },
  {
    name: 'Мария Иванова',
    text: 'Обожаю этого мастера! Всегда креативные идеи, аккуратная работа. Хожу только сюда уже полгода.',
    date: '10 октября 2025'
  },
  {
    name: 'Елена Сидорова',
    text: 'Прекрасная атмосфера, приятное общение, и самое главное - идеальный маникюр! Рекомендую всем подругам.',
    date: '5 октября 2025'
  },
  {
    name: 'Ольга Смирнова',
    text: 'Наконец нашла своего мастера! Профессионально, быстро, красиво. Цены адекватные. Буду приходить ещё!',
    date: '1 октября 2025'
  },
  {
    name: 'Юлия Козлова',
    text: 'Очень внимательный подход к каждой детали. Дизайн получился даже лучше, чем я представляла. Спасибо!',
    date: '28 сентября 2025'
  },
  {
    name: 'Дарья Новикова',
    text: 'Хожу уже год, ни разу не было никаких проблем. Мастер профессионал своего дела. Всем советую!',
    date: '20 сентября 2025'
  }
]
</script>
