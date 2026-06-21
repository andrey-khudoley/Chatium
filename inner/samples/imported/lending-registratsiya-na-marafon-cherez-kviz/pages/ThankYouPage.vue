<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-12 px-4">
    <div class="container mx-auto max-w-4xl">
      <!-- Блок с видео подарком -->
      <div class="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
        <div class="flex items-center justify-center mb-6">
          <div
            class="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold"
          >
            🎁 Твой урок готов
          </div>
        </div>

        <!-- Видео -->
        <div class="relative rounded-2xl overflow-hidden shadow-2xl mb-6 bg-black aspect-[16/9]">
          <video
            controls
            playsinline
            webkit-playsinline
            preload="metadata"
            poster="https://fs.chatium.io/get/image_gc_jLroEYIJZB.1650x650.png"
            class="w-full h-full object-cover"
          >
            <source
              src="https://fs.getcourse.ru/fileservice/file/download/a/22751/sc/71/h/1d60472dc4c83676c5c9ce5d51487876.mp4"
              type="video/mp4"
            />
            Ваш браузер не поддерживает видео.
          </video>
        </div>
      </div>

      <!-- Блок с предложением на мастер-классы -->
      <div
        class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 text-white"
      >
        <div class="text-center mb-8">
          <div
            class="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-2 rounded-full text-sm font-bold mb-4 animate-pulse"
          >
            ⚡ Бонус для тебя
          </div>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">Хочешь узнать ещё больше?</h2>
          <p class="text-xl text-gray-300 mb-2">Получи доступ к 4 премиальным техникам</p>
          <p class="text-gray-400">которые окупятся уже на первом клиенте</p>
        </div>

        <!-- Блок розыгрыша -->
        <div
          class="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 mb-8 border-2 border-yellow-400/50"
        >
          <div class="flex flex-col md:flex-row items-center gap-6">
            <img
              src="https://fs.cdn-chatium.io/thumbnail/image_gc_1DlQECIbuA.1080x607.jpeg/s/800x"
              alt="Розыгрыш косметики EMi"
              class="w-full md:w-1/2 rounded-xl shadow-lg"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-gift text-3xl text-yellow-400"></i>
                <h3 class="text-2xl font-bold">Розыгрыш среди участников</h3>
              </div>
              <p class="text-lg mb-3">Разыграем наборы косметики EMi + Multi LED лампы</p>
              <ul class="space-y-2 text-gray-300">
                <li class="flex items-center gap-2">
                  <i class="fas fa-check-circle text-yellow-400"></i>
                  Премиальная косметика EMi для профессионалов
                </li>
                <li class="flex items-center gap-2">
                  <i class="fas fa-check-circle text-yellow-400"></i>
                  Профессиональные Multi LED лампы
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Карточки техник -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div class="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
            <div class="aspect-square overflow-hidden">
              <img
                src="https://fs.cdn-chatium.io/thumbnail/image_gc_l2T0vSjCDQ.1320x2254.jpeg/s/400x"
                alt="Скоростное наращивание"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="p-4">
              <div class="text-2xl mb-2">⚡</div>
              <h3 class="font-bold text-base mb-1">Скоростное наращивание</h3>
              <p class="text-gray-300 text-xs mb-1">Сократи процедуру с 2,5 до 1 часа</p>
              <p class="text-yellow-400 font-semibold text-sm">От 3500₽ у клиента</p>
            </div>
          </div>

          <div class="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
            <div class="aspect-square overflow-hidden">
              <img
                src="https://fs.cdn-chatium.io/thumbnail/image_gc_kqKS8wyhnX.563x986.jpeg/s/400x"
                alt="Креативное моделирование"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="p-4">
              <div class="text-2xl mb-2">💅</div>
              <h3 class="font-bold text-base mb-1">Креативное моделирование</h3>
              <p class="text-gray-300 text-xs mb-1">Эффектный дизайн класса премиум</p>
              <p class="text-yellow-400 font-semibold text-sm">От 5000₽ у клиента</p>
            </div>
          </div>

          <div class="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
            <div class="aspect-square overflow-hidden">
              <img
                src="https://fs.cdn-chatium.io/thumbnail/image_gc_ZhRK0yU95g.heic/s/400x"
                alt="Выкладной френч"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="p-4">
              <div class="text-2xl mb-2">✨</div>
              <h3 class="font-bold text-base mb-1">Выкладной френч</h3>
              <p class="text-gray-300 text-xs mb-1">Идеальная линия улыбки без кисти</p>
              <p class="text-yellow-400 font-semibold text-sm">От 4000₽ у клиента</p>
            </div>
          </div>

          <div class="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
            <div class="aspect-square overflow-hidden">
              <img
                src="https://fs.cdn-chatium.io/thumbnail/image_gc_AxNx58ZskE.2000x2000.png/s/400x"
                alt="Пилочный маникюр"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="p-4">
              <div class="text-2xl mb-2">🔥</div>
              <h3 class="font-bold text-base mb-1">Пилочный маникюр</h3>
              <p class="text-gray-300 text-xs mb-1">Трендовая услуга года</p>
              <p class="text-yellow-400 font-semibold text-sm">От 3000₽ у клиента</p>
            </div>
          </div>
        </div>

        <!-- Преимущества -->
        <div class="bg-white/5 rounded-2xl p-6 mb-8">
          <div class="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <i class="fas fa-hands text-3xl text-pink-400 mb-2"></i>
              <p class="font-semibold">Только практика</p>
              <p class="text-sm text-gray-400">Без воды и теории</p>
            </div>
            <div>
              <i class="fas fa-gem text-3xl text-purple-400 mb-2"></i>
              <p class="font-semibold">Премиум техники</p>
              <p class="text-sm text-gray-400">Топовые услуги</p>
            </div>
            <div>
              <i class="fas fa-gift text-3xl text-yellow-400 mb-2"></i>
              <p class="font-semibold">Бесплатно</p>
              <p class="text-sm text-gray-400">Наш подарок тебе</p>
            </div>
          </div>
        </div>

        <p class="text-center text-gray-400 text-sm">
          <i class="fas fa-users mr-2"></i>
          Уже зарегистрировались 1290 мастеров
        </p>
      </div>

      <!-- Дополнительная информация -->
      <div class="text-center mt-8 text-gray-600">
        <p class="text-sm">Есть вопросы? Напиши нам в поддержку</p>
      </div>
    </div>

    <!-- Прилипающая кнопка внизу -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent p-4 z-40"
    >
      <div class="container mx-auto max-w-4xl">
        <button
          @click="openModal"
          class="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold py-4 px-6 rounded-lg text-center hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
        >
          Участвовать в розыгрыше + 4 МК бесплатно 🎁
        </button>
      </div>
    </div>

    <!-- Модальное окно -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in">
        <!-- Кнопка закрытия -->
        <button
          @click="closeModal"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i class="fas fa-times text-2xl"></i>
        </button>

        <!-- Таймер -->
        <div
          class="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-xl text-center mb-6"
        >
          <div class="flex items-center justify-center gap-2">
            <i class="fas fa-clock animate-pulse"></i>
            <span class="font-bold">Места заканчиваются!</span>
          </div>
          <div class="text-3xl font-bold mt-2">{{ formattedTime }}</div>
        </div>

        <!-- Виджет GetCourse -->
        <iframe
          src="https://emi-courses.ru/pl/lite/widget/widget?id=1512135"
          allowfullscreen="allowfullscreen"
          style="width: 100%; height: 560px; border: none; overflow: hidden"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const timeLeft = ref(120) // 2 минуты = 120 секунд
let timerInterval = null

const form = ref({
  name: '',
  email: '',
  phone: ''
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const openModal = () => {
  isModalOpen.value = true
  timeLeft.value = 120 // Сброс таймера
  startTimer()
}

const closeModal = () => {
  isModalOpen.value = false
  stopTimer()
}

const startTimer = () => {
  stopTimer() // Остановить предыдущий таймер, если был
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      stopTimer()
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const submitForm = async () => {
  isSubmitting.value = true

  try {
    // Здесь можно добавить отправку данных на сервер
    // await apiSubmitPractikumRoute.run(ctx, form.value)

    // Симуляция отправки
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Перенаправление на страницу практикума
    window.open('https://pro.emionline.ru/utm-pro-mk', '_blank')

    // Закрыть модальное окно
    closeModal()

    // Очистить форму
    form.value = {
      name: '',
      email: '',
      phone: ''
    }
  } catch (error) {
    console.error('Ошибка отправки:', error)
    alert('Произошла ошибка. Попробуйте ещё раз.')
  } finally {
    isSubmitting.value = false
  }
}

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out;
}
</style>
