<template>
  <div class="min-h-screen bg-slate-800 text-white overflow-hidden relative">
    <!-- Контент -->
    <div class="relative z-10">
      <!-- Заголовок -->
      <header class="pt-8 pb-6 text-center px-4" v-if="!selectedCard">
        <div class="animate-fade-in max-w-4xl mx-auto">
          <!-- Декоративная рамка -->
          <div class="relative">
            <div
              class="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
            ></div>

            <div class="mt-8 mb-12">
              <h1
                class="text-6xl md:text-8xl font-serif font-bold mb-6 text-amber-50 tracking-tight"
                style="
                  text-shadow:
                    0 0 40px rgba(251, 191, 36, 0.3),
                    0 2px 4px rgba(0, 0, 0, 0.5);
                "
              >
                Карта Дня Мастера
              </h1>
              <div class="flex items-center justify-center gap-4 mb-8">
                <div class="w-20 h-px bg-gradient-to-r from-transparent to-amber-400/40"></div>
                <div class="text-amber-300/80 text-2xl">✦</div>
                <div class="w-20 h-px bg-gradient-to-l from-transparent to-amber-400/40"></div>
              </div>
              <p
                class="text-xl md:text-2xl text-amber-100/90 font-light tracking-wide leading-relaxed"
              >
                Узнай, что звезды приготовили<br class="hidden md:block" />
                для твоего бизнеса сегодня
              </p>
            </div>

            <div
              class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
            ></div>
          </div>

          <!-- Три ключевых посыла -->
          <div class="max-w-2xl mx-auto mt-16 space-y-6">
            <div
              class="flex items-start gap-4 text-left bg-slate-700 rounded-2xl p-6 border border-amber-500/10 transition-all"
            >
              <div class="text-3xl flex-shrink-0 mt-1">✨</div>
              <div>
                <p class="text-lg text-amber-100/95 leading-relaxed">
                  Вытяни карту и получи персональное послание от звезд
                </p>
              </div>
            </div>
            <div
              class="flex items-start gap-4 text-left bg-slate-700 rounded-2xl p-6 border border-amber-500/10 transition-all"
            >
              <div class="text-3xl flex-shrink-0 mt-1">🔮</div>
              <div>
                <p class="text-lg text-amber-100/95 leading-relaxed">
                  Узнай секрет успешных ТОП-мастеров маникюра
                </p>
              </div>
            </div>
            <div
              class="flex items-start gap-4 text-left bg-slate-700 rounded-2xl p-6 border border-amber-500/10 transition-all"
            >
              <div class="text-3xl flex-shrink-0 mt-1">💫</div>
              <div>
                <p class="text-lg text-amber-100/95 leading-relaxed">
                  Открой путь к изобилию и финансовой свободе
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Колода карт -->
      <div v-if="!selectedCard && !isShuffling" class="container mx-auto px-4 py-8">
        <div class="text-center mb-12 max-w-2xl mx-auto">
          <!-- Декоративное обрамление кнопки -->
          <div class="relative py-12">
            <div
              class="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
            ></div>

            <p class="text-amber-100/90 text-xl mb-8 font-light">
              👇 Нажми на кнопку, чтобы узнать свою карту 👇
            </p>

            <div class="flex justify-center">
              <button
                @click="shuffleCards"
                class="px-12 py-5 bg-gradient-to-r from-amber-500 via-rose-600 to-purple-700 rounded-full text-2xl font-bold hover:scale-105 transition-all duration-300 text-white shadow-2xl whitespace-nowrap text-center"
              >
                ✨ Вытянуть карту дня ✨
              </button>
            </div>

            <p class="text-amber-200/70 text-base mt-8 font-light tracking-wide">
              Колода из 7 мистических карт ждет тебя
            </p>

            <div
              class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
            ></div>
          </div>
        </div>

        <div class="flex justify-center items-center">
          <div class="card-deck">
            <div
              v-for="(card, index) in displayCards"
              :key="card.id"
              class="card-back pointer-events-none"
              :style="{
                transform: `translateX(${index * 2}px) translateY(${index * 2}px) rotate(${index * 0.5}deg)`,
                zIndex: displayCards.length - index
              }"
            >
              <div class="card-pattern"></div>
              <div class="card-back-design">
                <div class="text-6xl mb-4">🌟</div>
                <div class="text-lg font-bold text-white/80">Карта судьбы</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Анимация перетасовки -->
      <div v-if="isShuffling" class="container mx-auto px-4 py-12">
        <div class="flex justify-center items-center min-h-[400px]">
          <div class="card-shuffle-animation">
            <div
              v-for="i in 7"
              :key="i"
              class="shuffle-card"
              :style="{ animationDelay: `${i * 0.1}s` }"
            >
              <div class="card-back">
                <div class="card-pattern"></div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-center text-2xl text-amber-100 mt-8 font-semibold drop-shadow-lg">
          Звезды выбирают твою карту...
        </p>
      </div>

      <!-- Выбранная карта -->
      <div v-if="selectedCard" class="container mx-auto px-4 py-12 max-w-4xl">
        <div class="card-reveal-animation">
          <div class="card-front mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl">
            <div class="relative">
              <img
                :src="selectedCard.imageUrl"
                :alt="selectedCard.title"
                class="w-full h-auto object-cover"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8"
              >
                <div class="text-8xl mb-4 text-center">{{ selectedCard.icon }}</div>
                <h2 class="text-4xl font-bold mb-2 text-white text-center">
                  {{ selectedCard.title }}
                </h2>
                <p class="text-xl text-white/90 text-center">{{ selectedCard.subtitle }}</p>
              </div>
            </div>
          </div>

          <div class="bg-slate-700 rounded-3xl p-8 mb-6 border border-amber-500/20 shadow-2xl">
            <h3 class="text-2xl font-semibold mb-4 text-amber-300">📜 Послание карты:</h3>
            <p class="text-lg text-amber-100/95 mb-6 leading-relaxed">
              {{ selectedCard.description }}
            </p>

            <div
              class="bg-gradient-to-r from-amber-500/20 to-rose-500/20 rounded-2xl p-6 border border-amber-400/40 shadow-xl"
            >
              <h4 class="text-xl font-semibold mb-3 text-rose-300">💡 Инсайт для тебя:</h4>
              <p class="text-lg text-white leading-relaxed font-medium">
                {{ selectedCard.insight }}
              </p>
            </div>
          </div>

          <!-- Маленькая прилегающая кнопка с подарком -->
          <button
            v-if="showGiftPopup && !isRegistered"
            @click="scrollToForm"
            class="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 via-rose-600 to-purple-700 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 animate-scale-in group"
          >
            <span class="text-3xl animate-bounce">🎁</span>
            <span class="font-bold text-white text-lg">Забери подарок</span>
            <span class="text-white text-xl group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <!-- Призыв к действию -->
          <div
            class="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 rounded-3xl p-1 mb-8 shadow-2xl"
          >
            <div class="bg-gradient-to-br from-slate-950 to-indigo-950 rounded-3xl p-8">
              <div class="text-center mb-6">
                <div
                  class="inline-block bg-gradient-to-r from-rose-500 to-purple-600 px-4 py-2 rounded-full text-sm font-semibold mb-3 shadow-lg"
                >
                  📅 11, 12, 13 ноября в 18:00 МСК
                </div>
                <h3 class="text-3xl md:text-4xl font-bold mb-3 text-amber-100">
                  Как стать богатым ТОП-мастером в 2026 году
                </h3>
                <p class="text-lg text-amber-100/90 mb-2">
                  Это не просто марафон — это 3 дня интенсивной практики с мастерами,<br
                    class="hidden md:block"
                  />
                  которые сами выросли до ТОП-уровня
                </p>
                <div class="flex items-center justify-center gap-4 mb-4">
                  <span class="text-xl text-gray-400 line-through">1799 ₽</span>
                  <span class="text-3xl font-bold text-amber-400">БЕСПЛАТНО</span>
                </div>
                <p class="text-sm text-red-400 font-semibold">⚡ Количество мест ограничено!</p>
              </div>

              <!-- Что получишь -->
              <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div class="bg-slate-700 rounded-2xl p-4 border border-amber-500/20">
                  <!-- Картинка мастер-классов -->
                  <img
                    src="https://fs.chatium.io/get/image_gc_c3BS1PR50c.1080x607.jpeg"
                    alt="Мастер-классы практикума"
                    class="w-full rounded-xl mb-4"
                  />
                  <h4 class="font-semibold mb-3 text-amber-300">
                    ⭐ 4 практических мастер-класса:
                  </h4>
                  <ul class="space-y-2 text-sm text-amber-100/90">
                    <li>• Скоростное наращивание без опила</li>
                    <li>• Креативное моделирование (когти - тренд 2026)</li>
                    <li>• Выкладной френч (услуга класса люкс)</li>
                    <li>• Пилочный маникюр (тренд года)</li>
                  </ul>
                </div>
                <div class="bg-slate-700 rounded-2xl p-4 border border-amber-500/20">
                  <h4 class="font-semibold mb-3 text-amber-300">🎁 Бонусы для участников:</h4>
                  <!-- Баннер розыгрыша -->
                  <img
                    src="https://fs.chatium.io/get/image_gc_8THPoWIakn.1080x607.jpeg"
                    alt="Розыгрыш призов"
                    class="w-full rounded-xl mb-4"
                  />
                  <ul class="space-y-2 text-sm text-amber-100/90">
                    <li>• 3 эфира со звездами бьюти-индустрии</li>
                    <li>• Розыгрыш 9 наборов косметики EMI</li>
                    <li>• Розыгрыш Multi LED лампы</li>
                    <li>• Доступ в закрытый тг канал</li>
                    <li>• Именной сертификат участника</li>
                  </ul>
                </div>
              </div>

              <!-- Для кого -->
              <div
                class="bg-gradient-to-r from-amber-500/20 to-rose-500/20 rounded-2xl p-6 border border-amber-400/40 mb-6 shadow-xl"
              >
                <h4 class="text-xl font-semibold mb-3 text-center text-rose-300">
                  💎 Обязательно приходи, если:
                </h4>
                <div class="space-y-2 text-amber-100/95">
                  <p>✓ Чувствуешь застой в деньгах и клиентах</p>
                  <p>✓ Хочешь узнать, на чем будут зарабатывать топы в 2026 году</p>
                  <p>✓ Мечтаешь сделать свой первый миллион</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Форма регистрации GetCourse -->
          <div
            id="registration-form"
            v-if="!isRegistered"
            class="bg-slate-700 rounded-3xl py-8 px-0 border border-amber-500/20 shadow-2xl"
          >
            <iframe
              :src="iframeUrl"
              allowfullscreen="allowfullscreen"
              class="w-full h-[400px] md:h-[368px] border-none overflow-hidden"
            ></iframe>
          </div>

          <!-- Успешная регистрация -->
          <div
            v-else
            class="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl p-8 border border-emerald-400/40 shadow-2xl"
          >
            <div class="text-center">
              <div class="text-6xl mb-4">🎉</div>
              <h4 class="text-3xl font-bold mb-4 text-emerald-300">Вы зарегистрированы!</h4>
              <p class="text-lg text-emerald-100">
                Скоро с вами свяжемся и расскажем все детали практикума.
              </p>
            </div>
          </div>

          <div class="text-center mt-8">
            <button
              @click="resetCard"
              class="text-amber-300/80 hover:text-amber-200 transition-colors duration-300 underline text-lg font-medium"
            >
              Вытянуть другую карту
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { cards } from '../shared/cards'
import { apiRegisterRoute } from '../api/registration'

const displayCards = ref([...cards])
const selectedCard = ref(null)
const isShuffling = ref(false)
const isRegistered = ref(false)
const isSubmitting = ref(false)

const formData = ref({
  name: '',
  email: '',
  phone: ''
})

const showGiftPopup = ref(false)

// Получаем UTM метки из URL для передачи в GetCourse
const utmParams = ref({})

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  utmParams.value = {
    utm_source: urlParams.get('utm_source') || '',
    utm_medium: urlParams.get('utm_medium') || '',
    utm_campaign: urlParams.get('utm_campaign') || '',
    utm_content: urlParams.get('utm_content') || '',
    utm_term: urlParams.get('utm_term') || ''
  }
})

// Формируем URL для iframe с UTM метками
const iframeUrl = computed(() => {
  const baseUrl = 'https://emi-courses.ru/pl/lite/widget/widget?id=1508186'
  const params = new URLSearchParams()

  Object.entries(utmParams.value).forEach(([key, value]) => {
    if (value) {
      params.append(key, value)
    }
  })

  const queryString = params.toString()
  return queryString ? `${baseUrl}&${queryString}` : baseUrl
})

// Показываем поп-ап через 3 секунды после раскрытия карты
const showPopupAfterDelay = () => {
  setTimeout(() => {
    if (selectedCard.value && !isRegistered.value) {
      showGiftPopup.value = true
    }
  }, 3000)
}

const shuffleCards = () => {
  isShuffling.value = true

  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * cards.length)
    selectedCard.value = cards[randomIndex]
    isShuffling.value = false
    showPopupAfterDelay()
  }, 2000)
}

const submitRegistration = async () => {
  isSubmitting.value = true

  try {
    await apiRegisterRoute.run(ctx, {
      name: formData.value.name,
      email: formData.value.email,
      phone: formData.value.phone,
      cardId: selectedCard.value.id,
      cardTitle: selectedCard.value.title
    })

    isRegistered.value = true
  } catch (error) {
    console.error('Ошибка регистрации:', error)
    alert('Произошла ошибка. Попробуйте еще раз.')
  } finally {
    isSubmitting.value = false
  }
}

const resetCard = () => {
  selectedCard.value = null
  isRegistered.value = false
  showGiftPopup.value = false
  formData.value = { name: '', email: '', phone: '' }
}

const scrollToForm = () => {
  showGiftPopup.value = false
  const formElement = document.querySelector('#registration-form')
  if (formElement) {
    formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
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
  animation: fade-in 1s ease-out;
}

/* Колода карт */
.card-deck {
  position: relative;
  width: 280px;
  height: 400px;
}

.card-back {
  position: absolute;
  width: 280px;
  height: 400px;
  background: linear-gradient(135deg, #4338ca 0%, #7c3aed 50%, #a855f7 100%);
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(168, 85, 247, 0.5),
    0 0 30px rgba(251, 191, 36, 0.3);
  transition: transform 0.3s ease;
  border: 2px solid rgba(251, 191, 36, 0.3);
}

.card-back-design {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;
  z-index: 2;
}

.card-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.1) 10px,
      rgba(255, 255, 255, 0.1) 20px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.05) 10px,
      rgba(255, 255, 255, 0.05) 20px
    );
  border-radius: 20px;
  z-index: 1;
}

/* Анимация перетасовки */
.card-shuffle-animation {
  position: relative;
  width: 280px;
  height: 400px;
}

.shuffle-card {
  position: absolute;
  width: 280px;
  height: 400px;
  animation: shuffle 2s ease-in-out;
}

@keyframes shuffle {
  0%,
  100% {
    transform: translateX(0) translateY(0) rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: translateX(-200px) translateY(-100px) rotate(-20deg);
    opacity: 0.7;
  }
  50% {
    transform: translateX(200px) translateY(-150px) rotate(20deg);
    opacity: 0.7;
  }
  75% {
    transform: translateX(-100px) translateY(-80px) rotate(-10deg);
    opacity: 0.7;
  }
}

/* Раскрытая карта */
.card-front {
  width: 100%;
  max-width: 500px;
  animation: card-flip 0.8s ease-out;
}

@keyframes card-flip {
  0% {
    transform: rotateY(180deg) scale(0.5);
    opacity: 0;
  }
  100% {
    transform: rotateY(0) scale(1);
    opacity: 1;
  }
}

.card-reveal-animation {
  animation: reveal 0.8s ease-out;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}
</style>
