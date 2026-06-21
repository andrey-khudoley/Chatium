<template>
  <span id="gccounterImgContainer"></span>
  <div class="min-h-screen py-12 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Quiz Header (always visible during quiz) -->
      <div v-if="step === 'quiz'" class="card mb-6 text-center">
        <h1 class="text-3xl md:text-4xl font-bold text-dark mb-3">Тест скорости мастера 💅</h1>
        <p class="text-lg text-gray-600 mb-4">
          Узнайте свой реальный
          <span class="text-primary font-bold">потенциал заработка!</span> Получите
          <span class="text-accent font-bold">персональный план развития</span> и
          <span class="text-primary font-bold">эксклюзивный подарок</span> в конце теста.
        </p>
        <div class="flex justify-center gap-6 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <span>5 вопросов</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>~1 минута</span>
          </div>
        </div>
      </div>

      <!-- Quiz Questions -->
      <transition name="fade" mode="out-in">
        <div v-if="step === 'quiz'" :key="'quiz-' + currentQuestion" class="card">
          <!-- Progress Bar -->
          <div class="mb-8">
            <div class="flex justify-between items-center mb-4">
              <span class="text-sm font-semibold text-gray-600"
                >Вопрос {{ currentQuestion + 1 }} из {{ questions.length }}</span
              >
              <span class="text-sm text-gray-500"
                >~{{ Math.ceil((questions.length - currentQuestion) * 12) }} сек</span
              >
            </div>
            <div class="flex gap-2">
              <div
                v-for="(q, idx) in questions"
                :key="idx"
                class="progress-dot"
                :class="{
                  active: idx === currentQuestion,
                  completed: idx < currentQuestion
                }"
              ></div>
            </div>
          </div>

          <!-- Question -->
          <div class="mb-8">
            <h2 class="text-2xl md:text-3xl font-bold text-dark mb-6">
              {{ questions[currentQuestion].question }}
            </h2>

            <div class="space-y-4">
              <div
                v-for="(option, idx) in questions[currentQuestion].options"
                :key="idx"
                class="quiz-option"
                :class="{ selected: selectedAnswer === idx }"
                @click="selectAnswer(idx)"
              >
                <div class="flex items-center">
                  <div
                    class="w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center"
                    :class="
                      selectedAnswer === idx ? 'border-primary bg-primary' : 'border-gray-300'
                    "
                  >
                    <div v-if="selectedAnswer === idx" class="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <span class="text-lg text-dark">{{ option.text }}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            @click="nextQuestion"
            :disabled="selectedAnswer === null"
            class="btn-primary w-full"
            :class="{ 'opacity-50 cursor-not-allowed': selectedAnswer === null }"
          >
            {{ currentQuestion < questions.length - 1 ? 'Следующий вопрос' : 'Узнать результат' }}
          </button>
        </div>

        <!-- Results -->
        <div v-if="step === 'results'" :key="'results'" class="card">
          <div class="text-center mb-8">
            <div class="inline-block p-6 bg-gradient-to-r from-primary to-accent rounded-full mb-6">
              <svg
                class="w-20 h-20 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>

            <h2 class="text-3xl md:text-4xl font-bold text-dark mb-4">Ваш результат</h2>

            <div class="bg-gradient-to-r from-primary to-accent text-white rounded-2xl p-8 mb-6">
              <div class="text-6xl font-bold mb-2">{{ result.score }}%</div>
              <div class="text-2xl font-semibold">{{ result.level }}</div>
            </div>

            <p class="text-lg text-gray-700 mb-6 leading-relaxed">
              {{ result.description }}
            </p>

            <div class="bg-secondary rounded-2xl p-6 mb-8">
              <p class="text-dark font-semibold mb-3">{{ result.insight }}</p>
              <p class="text-gray-700">{{ result.potential }}</p>
            </div>
          </div>

          <!-- Marathon Offer as Gift -->
          <div
            class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8 mb-24 border-2 border-primary shadow-xl"
          >
            <div class="text-center mb-6">
              <span
                class="inline-block bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-full text-sm font-bold mb-4"
                >🎁 ВАШ ПОДАРОК</span
              >
              <h3 class="text-3xl md:text-4xl font-bold text-dark mb-4">
                Марафон "Скоростное наращивание"
              </h3>
              <p class="text-xl text-gray-800 leading-relaxed font-medium">
                Верхние формы — лучшая техника моделирования для быстрого набора клиентов и роста
                дохода. Подходит мастерам любого уровня — от новичков до профи!
              </p>
            </div>

            <!-- Image -->
            <div class="mb-6 -mx-8 rounded-2xl overflow-hidden shadow-lg">
              <img
                src="https://fs.cdn-chatium.io/get/image_gc_eVaIRlzJlG.1080x607.jpeg"
                alt="Верхние формы - техника наращивания"
                class="w-full h-auto"
              />
            </div>

            <div class="bg-white rounded-2xl p-6 mb-5 shadow-md">
              <p class="font-bold text-xl text-dark mb-4">💎 День 1: Основы скоростной техники</p>
              <ul class="space-y-3 text-base text-gray-800">
                <li class="flex items-start">
                  <span class="text-primary mr-2 font-bold">•</span>
                  <span>Преимущества верхних форм: в 2-3 раза быстрее работа</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary mr-2 font-bold">•</span>
                  <span>Идеальная архитектура без опила</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary mr-2 font-bold">•</span>
                  <span>Подходит для любой длины ногтей</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary mr-2 font-bold">•</span>
                  <span
                    ><strong class="text-dark">Мастер-класс:</strong> Выкладной френч в скоростной
                    технике</span
                  >
                </li>
              </ul>
            </div>

            <div class="bg-white rounded-2xl p-6 mb-6 shadow-md">
              <p class="font-bold text-xl text-dark mb-4">✨ День 2: Расширение спектра услуг</p>
              <ul class="space-y-3 text-base text-gray-800">
                <li class="flex items-start">
                  <span class="text-accent mr-2 font-bold">•</span>
                  <span>Ламинирование ногтей полимерными нитями (тренд!)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-accent mr-2 font-bold">•</span>
                  <span>Работа со сложными формами ногтей</span>
                </li>
                <li class="flex items-start">
                  <span class="text-accent mr-2 font-bold">•</span>
                  <span>Как делать тонкие и прочные ногти</span>
                </li>
                <li class="flex items-start">
                  <span class="text-accent mr-2 font-bold">•</span>
                  <span
                    ><strong class="text-dark">Мастер-класс:</strong> Скоростное арочное
                    моделирование на верхние формы + аквариумный дизайн</span
                  >
                </li>
              </ul>
            </div>

            <div class="text-center pt-2">
              <p class="text-2xl font-bold text-dark">🎯 Результат: удвойте скорость и доход!</p>
            </div>
          </div>

          <!-- Sticky Button -->
          <div
            class="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-4 border-primary p-4 z-50"
          >
            <div class="max-w-2xl mx-auto">
              <button
                @click="step = 'registration'"
                class="btn-primary w-full text-xl py-4 font-bold shadow-lg"
              >
                🎁 Забрать подарок
              </button>
            </div>
          </div>
        </div>

        <!-- Registration Form -->
        <div v-if="step === 'registration'" :key="'registration'" class="card relative">
          <!-- Close Button -->
          <button
            @click="step = 'results'"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <h2 class="text-3xl font-bold text-dark mb-4 text-center">Регистрация на марафон</h2>

          <!-- Timer -->
          <div
            class="bg-gradient-to-r from-primary to-accent text-white rounded-xl p-4 mb-6 text-center"
          >
            <div class="flex items-center justify-center gap-2 mb-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="text-sm font-semibold">Предложение действует:</span>
            </div>
            <div class="text-3xl font-bold">{{ formattedTime }}</div>
          </div>

          <form
            id="ltForm8680579"
            class="lt-normal-form lt-form-inner lt-form text-center lt-form-horizontal space-y-6"
            data-id="2190890252"
            action="https://emi-courses.ru/pl/lite/block-public/process-html?id=2190890252"
            method="post"
            data-open-new-window="0"
            data-sequential-request="1"
          >
            <!-- Hidden fields -->
            <input type="hidden" name="formParams[setted_offer_id]" />
            <input type="hidden" name="formParams[willCreatePaidDeal]" value="" />

            <!-- UTM fields -->
            <input
              name="formParams[dealCustomFields][1297809]"
              type="hidden"
              data-id="field-input-1297809"
            />
            <input
              name="formParams[dealCustomFields][1297810]"
              type="hidden"
              data-id="field-input-1297810"
            />
            <input
              name="formParams[dealCustomFields][1297811]"
              type="hidden"
              data-id="field-input-1297811"
            />
            <input
              name="formParams[dealCustomFields][1297812]"
              type="hidden"
              data-id="field-input-1297812"
            />
            <input
              name="formParams[dealCustomFields][1297813]"
              type="hidden"
              data-id="field-input-1297813"
            />

            <!-- Helper fields -->
            <input
              type="hidden"
              id="150339868fa1f6ab38b5"
              name="__gc__internal__form__helper"
              class="__gc__internal__form__helper"
              value=""
            />
            <input
              type="hidden"
              id="150339868fa1f6ab38b5ref"
              name="__gc__internal__form__helper_ref"
              class="__gc__internal__form__helper_ref"
              value=""
            />
            <input type="hidden" name="requestTime" value="1761222506" />
            <input
              type="hidden"
              name="requestSimpleSign"
              value="8777e6cd84e3d26397b30076dab32039"
            />
            <input type="hidden" name="isHtmlWidget" value="1" />

            <div>
              <input
                type="text"
                name="formParams[first_name]"
                maxlength="60"
                value=""
                required
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                placeholder="Введите ваше имя"
              />
            </div>

            <div>
              <input
                type="text"
                name="formParams[phone]"
                maxlength="60"
                value=""
                required
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors inputTwo_phone"
                placeholder="Введите ваш телефон"
              />
            </div>

            <div>
              <input
                type="text"
                name="formParams[email]"
                maxlength="60"
                value=""
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                placeholder="Введите ваш эл. адрес"
              />
            </div>

            <button
              type="submit"
              id="button664591"
              class="btn-primary w-full text-lg"
              style="color: #ffffff; background-color: #bc4f54; border-radius: 6px !important"
              onclick="if(window['btnprs68fa1f6ac47cd']){return false;}window['btnprs68fa1f6ac47cd']=true;setTimeout(function(){window['btnprs68fa1f6ac47cd']=false},6000);return true;"
            >
              Записаться
            </button>
          </form>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const step = ref('quiz')
const currentQuestion = ref(0)
const selectedAnswer = ref(null)
const answers = ref([])
const timeLeft = ref(300) // 5 minutes in seconds
let timerInterval = null

const questions = ref([
  {
    question: 'Сколько времени у вас занимает классический маникюр с покрытием?',
    options: [
      { text: 'Менее 1 часа', score: 20 },
      { text: '1 - 1.5 часа', score: 15 },
      { text: '1.5 - 2 часа', score: 10 },
      { text: 'Более 2 часов', score: 5 }
    ]
  },
  {
    question: 'Как часто вы успеваете обработать все 10 пальцев за 30 минут?',
    options: [
      { text: 'Всегда или почти всегда', score: 20 },
      { text: 'Иногда получается', score: 15 },
      { text: 'Редко', score: 10 },
      { text: 'Никогда', score: 5 }
    ]
  },
  {
    question: 'Сколько клиентов вы принимаете в день?',
    options: [
      { text: '5 и более', score: 20 },
      { text: '3-4 клиента', score: 15 },
      { text: '2 клиента', score: 10 },
      { text: '1 клиент', score: 5 }
    ]
  },
  {
    question: 'Как быстро вы делаете наращивание ногтей?',
    options: [
      { text: 'Менее 1.5 часов', score: 20 },
      { text: '1.5 - 2 часа', score: 15 },
      { text: '2 - 3 часа', score: 10 },
      { text: 'Более 3 часов или не делаю', score: 5 }
    ]
  },
  {
    question: 'Используете ли вы техники для ускорения работы?',
    options: [
      { text: 'Да, постоянно применяю', score: 20 },
      { text: 'Знаю некоторые, использую иногда', score: 15 },
      { text: 'Слышала, но не применяю', score: 10 },
      { text: 'Не знаю таких техник', score: 5 }
    ]
  }
])

const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const result = computed(() => {
  const totalScore = answers.value.reduce((sum, answer) => sum + answer.score, 0)
  const maxScore = questions.value.length * 20
  const percentage = Math.round((totalScore / maxScore) * 100)

  let level = ''
  let description = ''
  let insight = ''
  let potential = ''

  if (percentage >= 80) {
    level = 'Мастер-профи'
    description =
      'Вы работаете очень быстро! У вас отличная техника и организация рабочего процесса.'
    insight = '💎 Ваш потенциал дохода: до 200 000 ₽/мес'
    potential =
      'При вашей скорости вы можете масштабировать бизнес: обучать других мастеров или открыть свою студию.'
  } else if (percentage >= 60) {
    level = 'Опытный мастер'
    description =
      'У вас хорошая скорость работы, но есть куда расти. С правильными техниками вы можете увеличить доход.'
    insight = '⭐ Ваш потенциал дохода: до 150 000 ₽/мес'
    potential =
      'Ускорив работу на 30-40%, вы сможете принимать на 2-3 клиента больше в день - это +40 000₽ к доходу!'
  } else if (percentage >= 40) {
    level = 'Развивающийся мастер'
    description =
      'Вы на правильном пути! Освоение техник скоростной работы поможет вам выйти на новый уровень.'
    insight = '🌟 Ваш потенциал дохода: до 100 000 ₽/мес'
    potential = 'Увеличив скорость вдвое, вы сможете удвоить количество клиентов и свой доход!'
  } else {
    level = 'Начинающий мастер'
    description =
      'У вас большой потенциал для роста! Правильные техники помогут вам работать в 2-3 раза быстрее.'
    insight = '🚀 Ваш потенциал дохода: до 120 000 ₽/мес'
    potential =
      'Освоив скоростные техники, вы сможете работать быстрее и зарабатывать больше уже через месяц!'
  }

  return { score: percentage, level, description, insight, potential }
})

// Timer functions
function startTimer() {
  stopTimer() // Clear any existing timer
  timeLeft.value = 300 // Reset to 5 minutes

  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      stopTimer()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// Fill UTM parameters function
function fillUtmParameters() {
  function getGet(name) {
    var s = window.location.search
    s = s.match(new RegExp(name + '=([^&=]+)?'))
    return s ? decodeURI(s[1]) : '(not set)'
  }

  const selectorAndUtmRelations = {
    'field-input-1297809': decodeURI(getGet('utm_source')),
    'field-input-1297810': decodeURI(getGet('utm_medium')),
    'field-input-1297811': decodeURI(getGet('utm_campaign')),
    'field-input-1297812': decodeURI(getGet('utm_term')),
    'field-input-1297813': decodeURI(getGet('utm_content'))
  }

  for (const keyUtm of Object.keys(selectorAndUtmRelations)) {
    const elements = document.querySelectorAll(`input[data-id=${keyUtm}]`)
    elements.forEach((elem) => (elem.value = selectorAndUtmRelations[keyUtm]))
  }
}

// Watch step changes to start/stop timer
watch(step, async (newStep, oldStep) => {
  if (newStep === 'registration') {
    startTimer()
    // Ждем полного рендеринга формы Vue, потом заполняем UTM
    await nextTick()
    setTimeout(fillUtmParameters, 100)
  } else if (oldStep === 'registration') {
    stopTimer()
  }
})

// Clean up on component unmount
onUnmounted(() => {
  stopTimer()
})

function selectAnswer(index) {
  selectedAnswer.value = index
}

function nextQuestion() {
  if (selectedAnswer.value === null) return

  answers.value.push({
    question: currentQuestion.value,
    answer: selectedAnswer.value,
    score: questions.value[currentQuestion.value].options[selectedAnswer.value].score
  })

  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++
    selectedAnswer.value = null
  } else {
    step.value = 'results'
  }
}

function retakeTest() {
  step.value = 'quiz'
  currentQuestion.value = 0
  answers.value = []
  selectedAnswer.value = null
}
</script>

<script>
// GetCourse tracking scripts
window.addEventListener('load', function () {
  let loc = document.getElementById('150339868fa1f6ab38b5')
  if (loc) {
    loc.value = window.location.href
  }
  let ref = document.getElementById('150339868fa1f6ab38b5ref')
  if (ref) {
    ref.value = document.referrer
  }

  let statUrl =
    'https://emi-courses.ru/stat/counter?ref=' +
    encodeURIComponent(document.referrer) +
    '&loc=' +
    encodeURIComponent(document.location.href)
  document.getElementById('gccounterImgContainer').innerHTML =
    "<img width=1 height=1 style='display:none' id='gccounterImg' src='" + statUrl + "'/>"
})
</script>
