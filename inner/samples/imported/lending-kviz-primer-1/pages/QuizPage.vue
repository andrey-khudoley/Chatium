<template>
  <div class="min-h-screen gradient-bg py-4 px-4">
    <div class="max-w-3xl mx-auto">
      <!-- Заголовок -->
      <div v-if="!showResult" class="text-center mb-4 animate-fade-in">
        <div
          class="inline-block bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 px-5 py-1.5 rounded-full text-white text-xs font-semibold mb-3 shadow-lg animate-pulse-soft"
        >
          🎁 Подарок для мастеров маникюра и педикюра
        </div>
        <h1 class="text-2xl md:text-3xl font-bold text-white mb-3">
          147-страничное руководство по педикюру
        </h1>
        <div class="inline-block bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl mb-3">
          <p class="text-white/95 text-sm leading-tight">
            ✓ Классификация услуг и техники<br />
            ✓ Анатомия стопы и аппаратные технологии<br />
            ✓ Оснащение рабочего места
          </p>
        </div>
        <p class="text-white/80 text-xs mb-1">
          Ответьте на 5 вопросов — заберите бесплатный гайд от EMI Online
        </p>
      </div>

      <!-- Квиз -->
      <div v-if="!showResult" class="quiz-card p-6 md:p-8">
        <!-- Прогресс бар -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-semibold text-gray-600"
              >Вопрос {{ currentQuestion + 1 }} из {{ questions.length }}</span
            >
            <span class="text-sm font-semibold text-primary"
              >{{ Math.round((currentQuestion / questions.length) * 100) }}%</span
            >
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="progress-bar bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              :style="{ width: (currentQuestion / questions.length) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <!-- Вопрос -->
        <transition name="fade" mode="out-in">
          <div :key="currentQuestion">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-5">
              {{ questions[currentQuestion].question }}
            </h2>

            <!-- Варианты ответов -->
            <div class="space-y-3">
              <div
                v-for="(option, index) in questions[currentQuestion].options"
                :key="index"
                @click="selectAnswer(option)"
                class="answer-option p-4 rounded-xl"
                :class="{ selected: answers[currentQuestion] === option }"
              >
                <div class="flex items-center">
                  <div
                    class="w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0"
                    :class="
                      answers[currentQuestion] === option
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    "
                  >
                    <svg
                      v-if="answers[currentQuestion] === option"
                      class="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <span class="text-base text-gray-700 font-medium">{{ option }}</span>
                </div>
              </div>
            </div>

            <!-- Кнопки навигации -->
            <div class="flex justify-between items-center mt-6 gap-4">
              <button
                v-if="currentQuestion > 0"
                @click="previousQuestion"
                class="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-600 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
              >
                <i class="fas fa-arrow-left"></i>
                <span>Назад</span>
              </button>
              <div v-else></div>

              <button
                v-if="answers[currentQuestion]"
                @click="nextQuestion"
                class="btn-primary flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white"
              >
                <span>{{ currentQuestion < questions.length - 1 ? 'Далее' : 'Завершить' }}</span>
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Результат -->
      <div v-if="showResult" class="quiz-card p-8 md:p-12">
        <div class="text-center mb-8">
          <div
            class="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-4"
          >
            <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Спасибо за ответы! 🎉</h2>
          <p class="text-lg text-gray-600 mb-6">Оставьте свои контакты, чтобы получить подарок</p>
        </div>

        <!-- Форма GetCourse -->
        <div class="max-w-md mx-auto">
          <form
            id="ltForm8532667"
            class="lt-normal-form lt-form-inner lt-form text-center lt-form-horizontal"
            data-id="2189337920"
            action="https://emi-courses.ru/pl/lite/block-public/process-html?id=2189337920"
            method="post"
            data-open-new-window="0"
            data-sequential-request="1"
          >
            <!-- Скрытые поля -->
            <input type="hidden" name="formParams[setted_offer_id]" />
            <input type="hidden" name="formParams[willCreatePaidDeal]" value="" />

            <!-- Видимые поля ввода -->
            <div class="space-y-4 mb-6">
              <!-- Имя -->
              <input
                type="text"
                maxlength="60"
                placeholder="Введите ваше имя"
                name="formParams[first_name]"
                value=""
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
              />

              <!-- Email -->
              <input
                type="text"
                maxlength="60"
                placeholder="Введите ваш e-mail"
                name="formParams[email]"
                value=""
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
              />

              <!-- Телефон -->
              <input
                type="text"
                name="formParams[phone]"
                value=""
                maxlength="60"
                placeholder="Введите ваш телефон"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors inputTwo_phone"
              />
            </div>

            <!-- Скрытые поля для данных -->
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
            <input name="formParams[userCustomFields][1137455]" type="hidden" />
            <input
              type="hidden"
              id="149892968ef7820a3b5a"
              name="__gc__internal__form__helper"
              class="__gc__internal__form__helper"
              value=""
            />
            <input
              type="hidden"
              id="149892968ef7820a3b5aref"
              name="__gc__internal__form__helper_ref"
              class="__gc__internal__form__helper_ref"
              value=""
            />
            <input type="hidden" name="requestTime" value="1760524320" />
            <input
              type="hidden"
              name="requestSimpleSign"
              value="ca69a2ba6c8c105c1a2514b15f20be7c"
            />
            <input type="hidden" name="isHtmlWidget" value="1" />

            <!-- Кнопка отправки -->
            <button
              type="submit"
              id="button8899821"
              onclick="if(window['btnprs68ef7820db0a1']){return false;}window['btnprs68ef7820db0a1']=true;setTimeout(function(){window['btnprs68ef7820db0a1']=false},6000);return true;"
              class="btn-primary w-full px-8 py-4 rounded-xl font-bold text-white text-lg inline-flex items-center justify-center"
            >
              <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              СКАЧАТЬ ПОДАРОК
            </button>

            <p class="text-xs text-gray-500 mt-4 text-center">
              Подарок будет отправлен на вашу почту в течение 5 минут
            </p>
          </form>

          <!-- Контейнер для счетчика -->
          <span id="gccounterImgContainer"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const currentQuestion = ref(0)
const answers = ref({})
const showResult = ref(false)

const questions = ref([
  {
    question: 'Делаете ли вы педикюр в своей практике?',
    options: [
      'Да, педикюр — основная моя услуга',
      'Да, но больше специализируюсь на маникюре',
      'Делаю редко, но хочу развиваться в этом направлении',
      'Пока не делаю, только изучаю'
    ]
  },
  {
    question: 'Какие темы эфиров по педикюру вам наиболее интересны?',
    options: [
      'Профилактика врастания ногтя. Установка Титановой нити',
      'Работа с огрубевшей кожей и трещинами',
      'Техники аппаратного педикюра для начинающих',
      'Коррекция формы ногтей и работа с деформациями'
    ]
  },
  {
    question: 'Какой у вас опыт работы с педикюром?',
    options: ['Менее 6 месяцев', 'От 6 месяцев до 1 года', 'От 1 года до 3 лет', 'Более 3 лет']
  },
  {
    question: 'С какими сложностями вы чаще всего сталкиваетесь в педикюре?',
    options: [
      'Работа с проблемными ногтями (вросшие, деформированные)',
      'Недостаточно знаний по технике безопасности',
      'Сложно подобрать правильные инструменты',
      'Долгая скорость выполнения процедуры'
    ]
  },
  {
    question: 'Что для вас наиболее важно в обучении педикюру?',
    options: [
      'Практические навыки и отработка техники',
      'Понимание анатомии и медицинских аспектов',
      'Увеличение скорости работы',
      'Работа со сложными случаями'
    ]
  }
])

const selectAnswer = (option) => {
  answers.value[currentQuestion.value] = option
}

const nextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++
  } else {
    showResult.value = true
    saveResults()
  }
}

const previousQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--
  }
}

const saveResults = async () => {
  try {
    // Здесь можно сохранить результаты в базу данных
    console.log('Quiz answers:', answers.value)
  } catch (error) {
    console.error('Error saving results:', error)
  }
}

// Функция для установки значений в скрытые поля
function shoveInAllForms(selector, value) {
  document.querySelectorAll(`input[data-id=${selector}]`).forEach((elem) => {
    elem.value = value
    console.log(`Set ${selector} = ${value}`) // Для отладки
  })
}

// Функция для получения GET-параметров
function getGet(name) {
  var s = window.location.search
  s = s.match(new RegExp(name + '=([^&=]+)?'))
  return s ? decodeURI(s[1]) : '(not set)'
}

// Инициализация GetCourse скриптов при показе результата
const initGetCourseScripts = () => {
  // Ждем следующий тик, чтобы форма точно отрендерилась
  nextTick(() => {
    // Заполнение UTM-меток
    const selectorAndUtmRelations = {
      'field-input-1297809': decodeURI(getGet('utm_source')),
      'field-input-1297810': decodeURI(getGet('utm_medium')),
      'field-input-1297811': decodeURI(getGet('utm_campaign')),
      'field-input-1297812': decodeURI(getGet('utm_term')),
      'field-input-1297813': decodeURI(getGet('utm_content'))
    }

    console.log('Filling UTM fields:', selectorAndUtmRelations) // Для отладки

    for (const keyUtm of Object.keys(selectorAndUtmRelations)) {
      shoveInAllForms(keyUtm, selectorAndUtmRelations[keyUtm])
    }

    // Заполнение location и referrer
    let loc = document.getElementById('149892968ef7820a3b5a')
    if (loc) loc.value = window.location.href

    let ref = document.getElementById('149892968ef7820a3b5aref')
    if (ref) ref.value = document.referrer

    // Счетчик GetCourse
    let statUrl =
      'https://emi-courses.ru/stat/counter?ref=' +
      encodeURIComponent(document.referrer) +
      '&loc=' +
      encodeURIComponent(document.location.href)
    const counterContainer = document.getElementById('gccounterImgContainer')
    if (counterContainer) {
      counterContainer.innerHTML =
        "<img width=1 height=1 style='display:none' id='gccounterImg' src='" + statUrl + "'/>"
    }
  })
}

// Отслеживаем показ результата и инициализируем скрипты
watch(showResult, (newValue) => {
  if (newValue) {
    initGetCourseScripts()
  }
})
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.6s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-pulse-soft {
  animation: pulseSoft 2s ease-in-out infinite;
}

@keyframes pulseSoft {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 10px 25px -5px rgba(251, 191, 36, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 15px 35px -5px rgba(251, 191, 36, 0.5);
  }
}
</style>
