<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Шапка с информацией о подарке -->
      <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-6 mb-6">
        <div class="text-center mb-4">
          <div
            class="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold mb-3"
          >
            🎁 Урок из платного курса — БЕСПЛАТНО
          </div>
          <h1 class="text-xl md:text-3xl font-bold text-gray-800 mb-2">
            Работа с травмированными ногтями: скоростная техника наращивания
          </h1>
          <p class="text-pink-600 font-bold text-base md:text-lg mb-3">
            ⚡ Шокирующее ДО и ПОСЛЕ ⚡
          </p>
        </div>

        <!-- Карусель изображений -->
        <div class="relative mb-4">
          <!-- Мобильная версия: карусель -->
          <div class="md:hidden">
            <div class="overflow-hidden rounded-2xl">
              <div
                class="flex transition-transform duration-500 ease-in-out slider-container"
                :style="{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)` }"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
              >
                <img
                  src="https://fs.chatium.io/thumbnail/image_gc_lHPfef9j6k.720x1280.jpeg/s/800x"
                  alt="До"
                  class="w-full h-64 object-cover flex-shrink-0"
                />
                <img
                  src="https://fs.chatium.io/thumbnail/image_gc_DbNXWY1o6q.831x1280.jpeg/s/800x"
                  alt="Процесс"
                  class="w-full h-64 object-cover flex-shrink-0"
                />
                <img
                  src="https://fs.chatium.io/thumbnail/image_gc_ShetQQ1v2E.821x1280.jpeg/s/800x"
                  alt="После"
                  class="w-full h-64 object-cover flex-shrink-0"
                />
              </div>
            </div>

            <!-- Стрелки навигации (только мобайл) -->
            <button
              @click="prevSlide"
              class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              <svg
                class="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>
            <button
              @click="nextSlide"
              class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              <svg
                class="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>

            <!-- Индикаторы (только мобайл) -->
            <div class="flex justify-center gap-2 mt-3">
              <button
                v-for="i in 3"
                :key="i"
                @click="currentSlide = i - 1"
                class="w-2 h-2 rounded-full transition-all"
                :class="currentSlide === i - 1 ? 'bg-pink-500 w-6' : 'bg-gray-300'"
              ></button>
            </div>
          </div>

          <!-- Десктопная версия: все 3 фото в ряд -->
          <div class="hidden md:grid md:grid-cols-3 gap-4">
            <div class="relative group">
              <img
                src="https://fs.chatium.io/thumbnail/image_gc_lHPfef9j6k.720x1280.jpeg/s/800x"
                alt="До"
                class="w-full h-80 object-cover rounded-2xl shadow-lg transition-transform group-hover:scale-105"
              />
              <div
                class="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                До
              </div>
            </div>
            <div class="relative group">
              <img
                src="https://fs.chatium.io/thumbnail/image_gc_DbNXWY1o6q.831x1280.jpeg/s/800x"
                alt="Процесс"
                class="w-full h-80 object-cover rounded-2xl shadow-lg transition-transform group-hover:scale-105"
              />
              <div
                class="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                Процесс
              </div>
            </div>
            <div class="relative group">
              <img
                src="https://fs.chatium.io/thumbnail/image_gc_ShetQQ1v2E.821x1280.jpeg/s/800x"
                alt="После"
                class="w-full h-80 object-cover rounded-2xl shadow-lg transition-transform group-hover:scale-105"
              />
              <div
                class="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                После
              </div>
            </div>
          </div>
        </div>

        <p class="text-center text-sm text-gray-600 mb-3">
          Ответь на 5 вопросов — забери бесплатный урок от EMI Online
        </p>
      </div>

      <!-- Вопросы теста -->
      <div v-if="currentStep <= totalQuestions" class="bg-white rounded-3xl shadow-2xl p-6 md:p-12">
        <div class="mb-6">
          <p class="text-center text-sm text-gray-500 mb-4">
            Вопрос {{ currentStep }} из {{ totalQuestions }}
          </p>
          <h2 class="text-xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8">
            {{ questions[currentStep - 1].question }}
          </h2>
        </div>

        <div class="space-y-3 md:space-y-4">
          <button
            v-for="(option, index) in questions[currentStep - 1].options"
            :key="index"
            @click="selectAnswer(option)"
            class="w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 hover:border-pink-500 hover:shadow-lg"
            :class="selectedAnswer === option ? 'border-pink-500 bg-pink-50' : 'border-gray-200'"
          >
            <div class="flex items-center">
              <div
                class="w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0"
                :class="
                  selectedAnswer === option ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
                "
              >
                <div v-if="selectedAnswer === option" class="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <span class="text-base md:text-lg text-gray-700">{{ option }}</span>
            </div>
          </button>
        </div>

        <button
          v-if="selectedAnswer"
          @click="nextStep"
          class="w-full mt-6 md:mt-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          Далее →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { contactFormRoute } from '../contactForm'

const totalQuestions = 5
const currentStep = ref(1) // Начинаем сразу с первого вопроса
const selectedAnswer = ref('')
const answers = ref({})
const currentSlide = ref(0)
let slideInterval = null

// Touch events для свайпа
let touchStartX = 0
let touchEndX = 0
let isSwiping = false

const questions = [
  {
    question: 'Какую премиальную технику хочешь освоить?',
    options: [
      '⚡ Скоростное наращивание',
      '💅 Креативное моделирование',
      '✨ Выкладной френч',
      '🔥 Пилочный маникюр'
    ]
  },
  {
    question: 'Что сейчас важнее всего?',
    options: [
      'Увеличить средний чек',
      'Работать быстрее',
      'Освоить премиальные техники',
      'Больше довольных клиентов'
    ]
  },
  {
    question: 'С какой сложностью сталкиваешься?',
    options: [
      'Процедура занимает много времени',
      'Клиенты не платят больше',
      'Не хватает новых навыков',
      'Сложно выделиться'
    ]
  },
  {
    question: 'Какой результат хочешь получить?',
    options: [
      'Доход 150-300к',
      'Работать меньше, зарабатывать больше',
      'Стать топ-мастером',
      'Открыть студию'
    ]
  },
  {
    question: 'Что останавливает от развития?',
    options: ['Нет времени', 'Дорогое обучение', 'Не знаю, с чего начать', 'Боюсь не получится']
  }
]

function nextStep() {
  if (currentStep.value <= totalQuestions && selectedAnswer.value) {
    answers.value[`question${currentStep.value}`] = selectedAnswer.value
    selectedAnswer.value = ''
  }
  currentStep.value++

  // Если прошли все вопросы — сохраняем ответы и переходим на форму
  if (currentStep.value > totalQuestions) {
    sessionStorage.setItem('quizAnswers', JSON.stringify(answers.value))
    window.location.href = contactFormRoute.url()
  }
}

function selectAnswer(option) {
  selectedAnswer.value = option
}

function nextSlide() {
  if (isSwiping) return
  currentSlide.value = (currentSlide.value + 1) % 3
  resetSlideInterval()
}

function prevSlide() {
  if (isSwiping) return
  currentSlide.value = (currentSlide.value - 1 + 3) % 3
  resetSlideInterval()
}

// Touch handlers для свайпа
function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX
  isSwiping = true
  // Останавливаем автопрокрутку при касании
  if (slideInterval) {
    clearInterval(slideInterval)
  }
}

function handleTouchMove(e) {
  if (!isSwiping) return
  touchEndX = e.touches[0].clientX
}

function handleTouchEnd() {
  if (!isSwiping) return
  isSwiping = false

  const swipeDistance = touchStartX - touchEndX
  const minSwipeDistance = 50 // минимальное расстояние для свайпа

  if (Math.abs(swipeDistance) > minSwipeDistance) {
    if (swipeDistance > 0) {
      // Свайп влево - следующий слайд
      nextSlide()
    } else {
      // Свайп вправо - предыдущий слайд
      prevSlide()
    }
  }

  // Возобновляем автопрокрутку
  resetSlideInterval()
}

function startSlideInterval() {
  slideInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % 3
  }, 3000)
}

function resetSlideInterval() {
  if (slideInterval) {
    clearInterval(slideInterval)
  }
  startSlideInterval()
}

onMounted(() => {
  startSlideInterval()
})

onUnmounted(() => {
  if (slideInterval) {
    clearInterval(slideInterval)
  }
})
</script>

<style scoped>
/* Оптимизация для iOS - GPU acceleration */
.slider-container {
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
  will-change: transform;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-perspective: 1000;
  perspective: 1000;
}

/* Плавные переходы для iOS */
.slider-container {
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  -webkit-transition: -webkit-transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Отключаем выделение текста при свайпе */
.slider-container img {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  pointer-events: none;
}
</style>
