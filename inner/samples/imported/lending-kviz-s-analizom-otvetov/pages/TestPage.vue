<template>
  <div class="min-h-screen py-8 px-4">
    <!-- Header -->
    <div class="max-w-4xl mx-auto text-center mb-8">
      <div class="w-full">
        <img
          src="https://fs.cdn-chatium.io/download/image_3ERROdsTyc.1080x244.jpeg"
          srcset="
            https://fs.cdn-chatium.io/thumbnail/image_3ERROdsTyc.1080x244.jpeg/s/480x  480w,
            https://fs.cdn-chatium.io/thumbnail/image_3ERROdsTyc.1080x244.jpeg/s/800x  800w,
            https://fs.cdn-chatium.io/download/image_3ERROdsTyc.1080x244.jpeg         1080w
          "
          sizes="(max-width: 480px) 480px, (max-width: 800px) 800px, 1080px"
          alt="Получи подарок прямо сейчас - Косметичка любителя"
          class="w-full max-w-4xl mx-auto rounded-2xl shadow-lg mb-4"
        />
        <p class="text-lg md:text-xl text-gray-700">Персональный тест от школы EMI Online</p>
      </div>
    </div>

    <!-- Start Screen -->
    <div v-if="currentStep === 'start'" class="max-w-2xl mx-auto">
      <div class="glass-effect rounded-3xl p-8 md:p-12 shadow-2xl question-card">
        <div class="text-center mb-8">
          <div class="text-6xl mb-6">💄</div>
          <h2 class="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            Узнай, какой стиль макияжа подходит именно тебе
          </h2>
          <p class="text-lg text-gray-700 leading-relaxed mb-6">
            Пройдите тест и получите персонализированные рекомендации по макияжу, а также
            <strong class="text-elegant-primary">PDF-гайд «Косметичка любителя»</strong>.
          </p>
          <div
            class="bg-gradient-to-r from-elegant-primary/10 to-elegant-accent/10 rounded-2xl p-6 mb-8"
          >
            <p class="text-gray-700 mb-3">
              <i class="fas fa-clock text-elegant-primary mr-2"></i>
              Время прохождения: 2-3 минуты
            </p>
            <p class="text-gray-700">
              <i class="fas fa-check-circle text-elegant-secondary mr-2"></i>
              7 вопросов о твоих предпочтениях
            </p>
          </div>
        </div>

        <button
          @click="startTest"
          class="w-full elegant-gradient text-white font-bold text-xl py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          Начать тест
        </button>
      </div>
    </div>

    <!-- Questions -->
    <div v-if="currentStep === 'test'" class="max-w-3xl mx-auto">
      <!-- Progress Bar -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-700"
            >Вопрос {{ currentQuestion + 1 }} из {{ questions.length }}</span
          >
          <span class="text-sm font-medium text-elegant-primary"
            >{{ Math.round((currentQuestion / questions.length) * 100) }}%</span
          >
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            class="elegant-gradient h-3 rounded-full transition-all duration-500"
            :style="{ width: (currentQuestion / questions.length) * 100 + '%' }"
          ></div>
        </div>
      </div>

      <!-- Question Card -->
      <div class="glass-effect rounded-3xl p-8 md:p-10 shadow-2xl question-card">
        <div class="mb-8">
          <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {{ questions[currentQuestion].question }}
          </h3>
        </div>

        <div class="space-y-4">
          <div
            v-for="(option, index) in questions[currentQuestion].options"
            :key="index"
            @click="selectAnswer(option.type)"
            class="answer-option border-3 rounded-2xl p-5 cursor-pointer"
            :class="selectedAnswer === option.type ? 'selected' : 'border-gray-200 bg-white'"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1"
                :class="selectedAnswer === option.type ? 'bg-white/20' : 'bg-elegant-primary/10'"
              >
                <span
                  class="text-sm font-bold"
                  :class="selectedAnswer === option.type ? 'text-white' : 'text-elegant-primary'"
                >
                  {{ String.fromCharCode(65 + index) }}
                </span>
              </div>
              <div class="flex-1">
                <p
                  class="font-medium text-lg"
                  :class="selectedAnswer === option.type ? 'text-white' : 'text-gray-800'"
                >
                  {{ option.text }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex gap-4">
          <button
            v-if="currentQuestion > 0"
            @click="prevQuestion"
            class="px-6 py-3 rounded-full border-2 border-elegant-primary text-elegant-primary font-semibold hover:bg-elegant-primary hover:text-white transition-all"
          >
            <i class="fas fa-arrow-left mr-2"></i>
            Назад
          </button>
          <button
            @click="nextQuestion"
            :disabled="!selectedAnswer"
            :class="
              selectedAnswer
                ? 'elegant-gradient text-white hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            "
            class="flex-1 py-3 px-6 rounded-full font-bold text-lg transition-all"
          >
            {{ currentQuestion === questions.length - 1 ? 'Узнать результат' : 'Далее' }}
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Result -->
    <div v-if="currentStep === 'result'" class="max-w-4xl mx-auto">
      <div class="glass-effect rounded-3xl p-8 md:p-12 shadow-2xl">
        <!-- Result Header -->
        <div class="text-center mb-8">
          <div
            class="w-20 h-20 mx-auto mb-6 rounded-full elegant-gradient flex items-center justify-center text-white text-4xl"
          >
            {{ result.emoji }}
          </div>
          <h2
            class="font-display text-3xl md:text-5xl font-bold text-transparent bg-clip-text elegant-gradient mb-4"
          >
            {{ result.title }}
          </h2>
          <p class="text-xl text-gray-700 italic">{{ result.subtitle }}</p>
        </div>

        <!-- Result Description -->
        <div
          class="bg-gradient-to-r from-elegant-primary/10 to-elegant-accent/10 rounded-2xl p-6 md:p-8 mb-8"
        >
          <h3 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-user text-elegant-primary"></i>
            Твой типаж
          </h3>
          <p class="text-lg text-gray-700 leading-relaxed mb-6">
            {{ result.description }}
          </p>

          <h3 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2 mt-8">
            <i class="fas fa-lightbulb text-elegant-secondary"></i>
            Персональные рекомендации
          </h3>
          <ul class="space-y-3">
            <li v-for="(tip, index) in result.tips" :key="index" class="flex items-start gap-3">
              <i class="fas fa-check-circle text-elegant-primary mt-1"></i>
              <span class="text-gray-700">{{ tip }}</span>
            </li>
          </ul>
        </div>

        <!-- CTA Buttons -->
        <div class="space-y-4">
          <a
            href="https://emi-courses.ru/spasibo_makeup"
            target="_blank"
            class="block w-full elegant-gradient text-white font-bold text-xl py-5 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-center"
          >
            <i class="fas fa-gift mr-2"></i>
            Получить PDF-гайд и СУПЕРБОНУС
          </a>

          <button
            @click="restartTest"
            class="w-full border-2 border-elegant-primary text-elegant-primary font-semibold py-3 px-6 rounded-full hover:bg-elegant-primary hover:text-white transition-all"
          >
            <i class="fas fa-redo mr-2"></i>
            Пройти тест заново
          </button>
        </div>

        <!-- Share -->
        <div class="mt-8 text-center">
          <p class="text-gray-600 mb-4">Поделитесь результатом:</p>
          <div class="flex justify-center gap-4">
            <button
              @click="shareResult('telegram')"
              class="w-12 h-12 rounded-full bg-elegant-primary text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <i class="fab fa-telegram"></i>
            </button>
            <button
              @click="shareResult('whatsapp')"
              class="w-12 h-12 rounded-full bg-elegant-secondary text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <i class="fab fa-whatsapp"></i>
            </button>
            <button
              @click="shareResult('vk')"
              class="w-12 h-12 rounded-full bg-elegant-accent text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <i class="fab fa-vk"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const currentStep = ref('start') // 'start', 'test', 'result'
const currentQuestion = ref(0)
const selectedAnswer = ref(null)
const answers = ref([])

const questions = [
  {
    question: 'Сколько времени ты обычно тратишь на макияж в будний день?',
    options: [
      { text: 'Минимум времени — 5-10 минут, только самое необходимое', type: 'minimalist' },
      { text: 'От 30 минут до часа, люблю делать всё качественно', type: 'glam' },
      { text: '15-25 минут, делаю акцент на одной-двух зонах', type: 'romantic' },
      { text: 'По-разному, зависит от настроения и экспериментов', type: 'experimental' }
    ]
  },
  {
    question: 'Какой продукт обязательно должен быть в твоей косметичке?',
    options: [
      { text: 'Увлажняющий тональный крем или BB-крем', type: 'minimalist' },
      { text: 'Палетка теней и контурирующие средства', type: 'glam' },
      { text: 'Нюдовая помада и румяна естественных оттенков', type: 'romantic' },
      {
        text: 'Яркий акцентный продукт — цветная подводка или необычная помада',
        type: 'experimental'
      }
    ]
  },
  {
    question: 'Как ты относишься к трендам в макияже?',
    options: [
      { text: 'Предпочитаю классику, тренды меня не интересуют', type: 'minimalist' },
      { text: 'Слежу за профессиональными техниками и люксовыми новинками', type: 'glam' },
      { text: 'Выбираю мягкие, женственные тренды, которые мне идут', type: 'romantic' },
      { text: 'Люблю пробовать всё новое и необычное', type: 'experimental' }
    ]
  },
  {
    question: 'Твой идеальный вечерний макияж — это:',
    options: [
      { text: 'Чуть ярче дневного — тушь, блеск для губ, легкие румяна', type: 'minimalist' },
      { text: 'Полноценный вечерний образ: смоки, контуринг, яркие губы', type: 'glam' },
      { text: 'Элегантный макияж с акцентом на глаза или губы', type: 'romantic' },
      { text: 'Креативный образ с неожиданными деталями', type: 'experimental' }
    ]
  },
  {
    question: 'Какой результат макияжа тебе ближе всего?',
    options: [
      { text: 'Естественный, будто макияжа нет — эффект "без макияжа"', type: 'minimalist' },
      { text: 'Идеально выполненный, как с обложки журнала', type: 'glam' },
      { text: 'Мягкий, женственный, подчеркивающий достоинства', type: 'romantic' },
      { text: 'Арт-макияж, который привлекает внимание', type: 'experimental' }
    ]
  },
  {
    question: 'Когда ты покупаешь косметику, на что обращаешь внимание в первую очередь?',
    options: [
      { text: 'На простоту использования и универсальность', type: 'minimalist' },
      { text: 'На качество, стойкость и профессиональные характеристики', type: 'glam' },
      { text: 'На естественность оттенков и деликатность формул', type: 'romantic' },
      { text: 'На уникальность продукта и возможности для творчества', type: 'experimental' }
    ]
  },
  {
    question: 'Что для тебя макияж?',
    options: [
      { text: 'Способ выглядеть ухоженной с минимальными усилиями', type: 'minimalist' },
      { text: 'Искусство и возможность выглядеть безупречно', type: 'glam' },
      { text: 'Средство подчеркнуть естественную красоту', type: 'romantic' },
      { text: 'Форма самовыражения и творчества', type: 'experimental' }
    ]
  }
]

const resultTypes = {
  minimalist: {
    title: 'Минималистка',
    subtitle: 'Элегантная простота в каждой детали',
    emoji: '✨',
    description:
      'Ты ценишь естественность и не любишь перегруженность в образе. Твой подход к макияжу основан на заботе о коже и подчёркивании природной красоты. Ты знаешь, что настоящая уверенность идёт изнутри, и косметика — лишь деликатное дополнение. Твой стиль универсален и подходит для любой ситуации.',
    tips: [
      'Используй лёгкие тонирующие средства — BB-кремы, кушоны, тинты для естественного покрытия',
      'Инвестируй в качественный уход за кожей — это твоя лучшая база под макияж',
      'Выбирай нюдовые оттенки помад и блесков, близкие к натуральному цвету губ',
      'Освой технику лёгкого контурирования для деликатной коррекции черт лица',
      'Используй хайлайтер для естественного сияния кожи'
    ]
  },
  glam: {
    title: 'Глэм-леди',
    subtitle: 'Профессиональный подход и безупречное исполнение',
    emoji: '💎',
    description:
      'Ты не представляешь свой образ без качественного макияжа и знаешь толк в профессиональных техниках. Контуринг, smoky eyes, стойкие текстуры — всё это про тебя. Ты следишь за новинками индустрии и умеешь создавать безупречные образы. Твой макияж всегда выглядит как работа визажиста.',
    tips: [
      'Освой профессиональную технику контуринга для идеальной скульптуры лица',
      'Инвестируй в качественные кисти — они решают половину успеха макияжа',
      'Используй праймеры и фиксирующие спреи для стойкости макияжа',
      'Изучи различные техники smoky eyes — от классических до современных',
      'Не бойся ярких акцентов — красная помада, выразительные стрелки'
    ]
  },
  romantic: {
    title: 'Романтичная натура',
    subtitle: 'Женственность и элегантность в каждом штрихе',
    emoji: '🌸',
    description:
      'Ты воплощение нежности и элегантности. Твой макияж всегда гармоничен и изыскан. Ты предпочитаешь мягкие оттенки, деликатные переходы и классические приёмы. Твоя красота утончённа, и ты умеешь подчёркивать свою женственность с помощью правильно подобранной косметики.',
    tips: [
      'Используй персиковые и розовые румяна для свежего, здорового цвета лица',
      'Освой технику мягких переходов в макияже глаз — градиент нюдовых оттенков',
      'Уделяй особое внимание бровям — они создают обрамление лица',
      'Выбирай помады и блески розовых, коралловых, персиковых оттенков',
      'Добавляй деликатный хайлайтер на скулы для мягкого свечения'
    ]
  },
  experimental: {
    title: 'Творческая личность',
    subtitle: 'Смелость, индивидуальность и свобода самовыражения',
    emoji: '🎨',
    description:
      'Ты не боишься экспериментировать и любишь выделяться. Необычные оттенки, креативные техники, смелые сочетания — всё это про твой подход к макияжу. Ты следишь за трендами, но не боишься создавать что-то своё. Макияж для тебя — это способ выразить свою индивидуальность.',
    tips: [
      'Пробуй цветные подводки и тени — синие, зелёные, фиолетовые оттенки',
      'Экспериментируй с текстурами — глиттеры, металлики, необычные финиши',
      'Изучай различные техники — графичный макияж, омбре на губах, неклассические формы',
      'Следи за трендами в социальных сетях и адаптируй их под себя',
      'Не бойся сочетать несочетаемое — создавай уникальные образы'
    ]
  }
}

const result = computed(() => {
  const counts = {
    minimalist: 0,
    glam: 0,
    romantic: 0,
    experimental: 0
  }

  answers.value.forEach((answer) => {
    counts[answer]++
  })

  const maxType = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))

  return resultTypes[maxType]
})

function startTest() {
  currentStep.value = 'test'
}

function selectAnswer(type) {
  selectedAnswer.value = type

  // Автоматический переход к следующему вопросу через 500ms
  setTimeout(() => {
    nextQuestion()
  }, 500)
}

function nextQuestion() {
  if (!selectedAnswer.value) return

  answers.value[currentQuestion.value] = selectedAnswer.value

  if (currentQuestion.value < questions.length - 1) {
    currentQuestion.value++
    selectedAnswer.value = answers.value[currentQuestion.value] || null
  } else {
    currentStep.value = 'result'

    // Track event
    if (window.clrtTrack) {
      window.clrtTrack({
        url: 'event://custom/cosmoMakeupTest',
        action: 'test-completed',
        action_param1: result.value.title
      })
    }
  }
}

function prevQuestion() {
  if (currentQuestion.value > 0) {
    currentQuestion.value--
    selectedAnswer.value = answers.value[currentQuestion.value] || null
  }
}

function restartTest() {
  currentStep.value = 'start'
  currentQuestion.value = 0
  selectedAnswer.value = null
  answers.value = []
}

function shareResult(platform) {
  const text = `Мой типаж макияжа — ${result.value.title}! ${result.value.subtitle}`
  const url = window.location.href

  const shareUrls = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
  }

  if (shareUrls[platform]) {
    window.open(shareUrls[platform], '_blank')
  }
}

// Track page view
if (window.clrtTrack) {
  window.clrtTrack({
    url: 'event://custom/cosmoMakeupTest',
    action: 'page-view'
  })
}
</script>
