<template>
  <div class="min-h-screen flex items-center justify-center p-4 py-8">
    <div class="w-full max-w-3xl">
      <!-- Вся страница - один экран -->
      <div class="quiz-card p-6 md:p-8">
        <!-- Привлекательный заголовок-плашка -->
        <div class="hero-banner mb-5">
          <p class="text-center text-white text-base md:text-lg font-semibold leading-snug">
            Тест для девушек, которые хотят больше зарабатывать и жить<br class="hidden md:block" />
            в свободном графике в новой бьюти-профессии
          </p>
        </div>

        <!-- Информация про бонус (компактная) -->
        <div
          class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 mb-6 border-2 border-amber-200"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class="bg-gradient-to-br from-orange-500 to-red-500 rounded-full p-2 flex-shrink-0"
            >
              <i class="fas fa-gift text-white text-xl"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800">Ваш подарок за прохождение теста</h3>
              <p class="text-sm text-gray-700">
                <span class="font-bold text-orange-600">147 страниц</span> профессионального
                руководства мастера-педикюра
              </p>
            </div>
          </div>
          <p class="text-xs text-gray-600 pl-12">
            Эксклюзивный материал из платного курса стоимостью
            <span class="font-semibold">15 000 ₽</span> — получите бесплатно!
          </p>
        </div>

        <!-- Прогресс бар -->
        <div v-if="currentStep <= questions.length" class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-semibold text-gray-600">
              Вопрос {{ currentStep }} из {{ questions.length }}
            </span>
            <span class="text-sm font-semibold text-orange-600">
              {{ Math.round((currentStep / questions.length) * 100) }}%
            </span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="progress-bar h-full rounded-full"
              :style="{ width: (currentStep / questions.length) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <!-- Вопросы (плавная смена без перезагрузки) -->
        <transition name="slide-fade" mode="out-in">
          <div :key="currentStep">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-5">
              {{ questions[currentStep - 1].question }}
            </h2>
            <div class="space-y-3 mb-6">
              <button
                v-for="(option, index) in questions[currentStep - 1].options"
                :key="index"
                @click="selectAnswer(index)"
                :class="[
                  'option-button w-full text-left p-4 rounded-xl font-medium transition-all',
                  selectedAnswer === index
                    ? 'bg-orange-100 border-2 border-orange-500 text-gray-800'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
                ]"
              >
                <i
                  :class="[
                    'mr-3',
                    selectedAnswer === index
                      ? 'fas fa-check-circle text-orange-500'
                      : 'far fa-circle text-gray-400'
                  ]"
                ></i>
                {{ option }}
              </button>
            </div>

            <!-- Навигационные кнопки -->
            <div class="flex gap-3">
              <button
                v-if="currentStep > 1"
                @click="prevStep"
                class="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                <i class="fas fa-arrow-left mr-2"></i>
                Назад
              </button>
              <button
                @click="nextStep"
                :disabled="selectedAnswer === null"
                :class="[
                  'flex-1 px-6 py-3 rounded-xl font-semibold transition-all',
                  selectedAnswer !== null
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                ]"
              >
                {{ currentStep === questions.length ? 'Получить подарок' : 'Далее' }}
                <i class="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Нижний текст -->
      <div class="text-center mt-4">
        <p class="text-white text-xs">
          <i class="fas fa-shield-alt mr-1"></i>
          Ваши ответы конфиденциальны
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { thankYouPageRoute } from '../index'

const currentStep = ref(1) // Начинаем сразу с первого вопроса
const answers = ref([])
const selectedAnswer = ref(null)

const questions = [
  {
    question: 'Работаешь ли ты в бьюти-сфере?',
    options: [
      'Да, работаю много лет',
      'Да, я новичок',
      'Только учусь',
      'Нет, но хотела бы попробовать'
    ]
  },
  {
    question: 'Делаешь ли ты педикюр?',
    options: [
      'Делаю только эстетический педикюр',
      'Предоставляю весь комплекс услуг',
      'Нет, я работаю в другой бьюти-сфере',
      'Нет, я пока не в бьюти'
    ]
  },
  {
    question: 'Какой доход ты хотела бы иметь через год?',
    options: [
      'Такой же как сейчас',
      'Хочу вырасти в 2 раза',
      'Хочу вырасти в 3 раза',
      'Хочу вырасти в 5+ раз'
    ]
  },
  {
    question: 'Какое повышение квалификации тебе ближе?',
    options: [
      'Смотреть ролики экспертов в интернете',
      'Проходить периодически профессиональные курсы',
      'Учиться у более опытных коллег',
      'Пока никакое'
    ]
  },
  {
    question: 'Какой мастер-класс ты бы хотела пройти?',
    options: [
      'Аппаратный педикюр дисками + покрытие',
      'Аппаратная обработка трещин',
      'Профилактика врастания ногтя. Установка NiTi',
      'Все варианты интересны'
    ]
  }
]

function selectAnswer(index) {
  selectedAnswer.value = index
}

function nextStep() {
  if (selectedAnswer.value === null) return

  answers.value.push(selectedAnswer.value)

  // Если это последний вопрос - переходим на страницу благодарности
  if (currentStep.value === questions.length) {
    window.location.href = thankYouPageRoute.url()
    return
  }

  selectedAnswer.value = null
  currentStep.value++
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    answers.value.pop()
    selectedAnswer.value = null
  }
}
</script>

<style scoped>
.quiz-card {
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.hero-banner {
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  border-radius: 1rem;
  padding: 0.875rem 1rem;
  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
  margin: -0.5rem -0.5rem 1.5rem -0.5rem;
}

.progress-bar {
  background: linear-gradient(to right, #f97316, #ef4444);
  transition: width 0.5s ease;
}

.option-button {
  transition: all 0.2s ease;
}

/* Плавные переходы между вопросами (без перезагрузки страницы) */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.pulse-animation {
  animation: pulse 2s infinite;
}
</style>
