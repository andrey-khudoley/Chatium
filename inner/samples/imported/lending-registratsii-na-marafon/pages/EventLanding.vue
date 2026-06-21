<template>
  <div class="min-h-screen bg-dark text-white overflow-x-hidden">
    <!-- 1. ПЕРВЫЙ ЭКРАН (HERO) -->
    <section class="relative min-h-screen flex items-center justify-center gradient-bg">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-dark/50 to-dark"></div>

      <div class="container mx-auto px-4 py-20 relative z-10">
        <div class="max-w-5xl mx-auto text-center">
          <div
            class="inline-block mb-6 bg-burgundy/80 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-bold shine-effect"
          >
            <i class="fas fa-calendar-alt mr-2"></i>
            11, 12, 13 ноября в 18:00 МСК
          </div>

          <h1 class="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Как стать <span class="gradient-gold">богатым ТОП-мастером</span> в 2026 году
          </h1>

          <p class="text-xl md:text-2xl text-gray-300 mb-8 font-light">
            Это не просто марафон — это 3 дня интенсивной практики с мастерами, которые сами выросли
            до ТОП-уровня
          </p>

          <div class="flex flex-wrap gap-4 justify-center items-center mb-10">
            <div class="flex items-center gap-2 text-gold">
              <i class="fas fa-star"></i>
              <span>4 практических мастер-класса</span>
            </div>
            <div class="flex items-center gap-2 text-gold">
              <i class="fas fa-users"></i>
              <span>3 эфира со звездами</span>
            </div>
            <div class="flex items-center gap-2 text-gold">
              <i class="fas fa-gift"></i>
              <span>Розыгрыш призов</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              @click="openPopup"
              class="group bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-dark hover:via-gold hover:to-gold-light text-dark font-bold py-5 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-110 shadow-2xl pulse-gold"
            >
              <i class="fas fa-rocket mr-2"></i>
              Занять бесплатное место
            </button>
            <div class="text-gray-300 text-sm">
              <div class="font-bold text-lg line-through text-gray-400">1799 ₽</div>
              <div class="text-gold font-bold text-2xl">БЕСПЛАТНО</div>
            </div>
          </div>

          <p class="mt-6 text-red-500 font-semibold text-lg animate-pulse">
            ⚡ Количество мест ограничено!
          </p>
        </div>
      </div>

      <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <i class="fas fa-chevron-down text-gold text-3xl"></i>
      </div>
    </section>

    <!-- 2. МАСТЕР-КЛАССЫ -->
    <section class="py-12 gradient-bg relative">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-4">
          <span class="gradient-gold">4 мастер-класса</span>
        </h2>
        <p class="text-center text-xl text-gray-300 mb-10">по самым дорогим техникам</p>

        <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div
            class="group overflow-hidden rounded-3xl transform hover:scale-105 transition-all duration-500 bg-dark border-2 border-gold/30"
          >
            <div class="p-6 relative">
              <div
                class="absolute top-4 right-4 bg-burgundy text-white px-4 py-2 rounded-full font-bold text-sm z-10"
              >
                МК #1
              </div>
              <h3 class="text-2xl font-display font-bold text-gold mb-2">
                Скоростное наращивание без опила
              </h3>
              <p class="text-gray-300 mb-4">За 1 час на нижние формы</p>
            </div>
            <img
              :src="getThumbnail('image_gc_6z4F8crNUH.1260x1280.jpeg', 800, 800)"
              alt="Скоростное наращивание"
              class="w-full h-80 object-cover"
            />
          </div>

          <div
            class="group overflow-hidden rounded-3xl transform hover:scale-105 transition-all duration-500 bg-dark border-2 border-gold/30"
          >
            <div class="p-6 relative">
              <div
                class="absolute top-4 right-4 bg-burgundy text-white px-4 py-2 rounded-full font-bold text-sm z-10"
              >
                МК #2
              </div>
              <h3 class="text-2xl font-display font-bold text-gold mb-2">
                Креативное моделирование
              </h3>
              <p class="text-gray-300 mb-4">Когти - тренд 2026</p>
            </div>
            <img
              :src="getThumbnail('image_gc_vpfw9Y2ctf.960x1280.jpeg', 800, 800)"
              alt="Креативное моделирование"
              class="w-full h-80 object-cover object-top"
            />
          </div>

          <div
            class="group overflow-hidden rounded-3xl transform hover:scale-105 transition-all duration-500 bg-dark border-2 border-gold/30"
          >
            <div class="p-6 relative">
              <div
                class="absolute top-4 right-4 bg-burgundy text-white px-4 py-2 rounded-full font-bold text-sm z-10"
              >
                МК #3
              </div>
              <h3 class="text-2xl font-display font-bold text-gold mb-2">Услуга класса люкс</h3>
              <p class="text-gray-300 mb-4">Выкладной френч</p>
            </div>
            <img
              :src="getThumbnail('image_gc_Emk36S3WKs.1280x720.jpeg', 800, 800)"
              alt="Выкладной френч"
              class="w-full h-80 object-cover object-center"
            />
          </div>

          <div
            class="group overflow-hidden rounded-3xl transform hover:scale-105 transition-all duration-500 bg-dark border-2 border-gold/30"
          >
            <div class="p-6 relative">
              <div
                class="absolute top-4 right-4 bg-burgundy text-white px-4 py-2 rounded-full font-bold text-sm z-10"
              >
                МК #4
              </div>
              <h3 class="text-2xl font-display font-bold text-gold mb-2">Тренд года</h3>
              <p class="text-gray-300 mb-4">Пилочный маникюр</p>
            </div>
            <img
              src="https://fs.chatium.io/get/image_gc_6yfqjfgIDc.1260x1280.jpeg"
              alt="Пилочный маникюр"
              class="w-full h-80 object-cover"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 3. РОЗЫГРЫШ -->
    <section class="py-12 bg-dark-light relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-gold rounded-full filter blur-3xl"></div>
        <div
          class="absolute bottom-0 right-0 w-96 h-96 bg-burgundy rounded-full filter blur-3xl"
        ></div>
      </div>

      <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-10">
            <img
              :src="getThumbnail('image_gc_ecxcnMasev.1080x1080.jpeg', 1000)"
              alt="Розыгрыш призов"
              class="rounded-3xl shadow-2xl mx-auto mb-8 transform hover:scale-105 transition-transform duration-500"
            />

            <h2 class="text-4xl md:text-5xl font-display font-bold mb-6">
              <span class="gradient-gold">Розыгрыш призов!</span>
            </h2>

            <p class="text-2xl text-gray-300 mb-8">
              В 3-й день практикума разыграем призы среди всех участников
            </p>

            <div class="bg-dark/50 border border-gold/30 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <p class="text-lg text-gold font-semibold">
                🔥 Это премьера! Обычно такие мероприятия платные
              </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div class="bg-dark border-2 border-gold rounded-2xl p-8 shine-effect">
                <div class="text-5xl mb-4">🎁</div>
                <h3 class="text-2xl font-bold text-gold mb-2">9 наборов косметики</h3>
                <p class="text-gray-400">EMI для маникюра</p>
              </div>

              <div class="bg-dark border-2 border-gold rounded-2xl p-8 shine-effect">
                <div class="text-5xl mb-4">💡</div>
                <h3 class="text-2xl font-bold text-gold mb-2">Multi LED лампа</h3>
                <p class="text-gray-400">Профессиональное оборудование</p>
              </div>
            </div>

            <div class="mt-10 bg-burgundy/20 border-2 border-burgundy rounded-xl p-6 inline-block">
              <p class="text-xl font-semibold">
                <i class="fas fa-info-circle text-burgundy mr-2"></i>
                Для участия в розыгрыше необходимо зарегистрироваться и посетить все 3 дня
                практикума
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. ПРИХОДИ ЕСЛИ -->
    <section class="py-12 bg-dark-light">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-6 gradient-gold">
            Обязательно приходи, если:
          </h2>

          <div class="grid md:grid-cols-3 gap-6 mt-8">
            <div
              class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300 transform hover:scale-105"
            >
              <div class="text-4xl mb-4 text-gold">
                <i class="fas fa-chart-line"></i>
              </div>
              <p class="text-lg">
                Чувствуешь <span class="text-gold font-bold">застой в деньгах</span> и клиентах
              </p>
            </div>

            <div
              class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300 transform hover:scale-105"
            >
              <div class="text-4xl mb-4 text-gold">
                <i class="fas fa-lightbulb"></i>
              </div>
              <p class="text-lg">
                Хочешь узнать, на чем будут
                <span class="text-gold font-bold">зарабатывать топы в 2026</span> году
              </p>
            </div>

            <div
              class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300 transform hover:scale-105"
            >
              <div class="text-4xl mb-4 text-gold">
                <i class="fas fa-gem"></i>
              </div>
              <p class="text-lg">
                Мечтаешь сделать свой <span class="text-gold font-bold">1 000 000+ ₽</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ОСТАЛЬНЫЕ СЕКЦИИ -->
    <section class="py-12 gradient-bg">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-6">
          Ещё на практикуме будет
        </h2>
        <p class="text-center text-xl text-gray-300 mb-10">
          3 живых эфира с ТОП-мастерами бьюти-индустрии
        </p>

        <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <div
            class="bg-dark-light border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300"
          >
            <div class="text-4xl mb-4 text-center">⭐</div>
            <p class="text-center text-lg">Какой бьюти-мастер будет ТОПом</p>
          </div>

          <div
            class="bg-dark-light border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300"
          >
            <div class="text-4xl mb-4 text-center">✨</div>
            <p class="text-center text-lg">
              Креатив и эксклюзив: источники творческого и финансового роста
            </p>
          </div>

          <div
            class="bg-dark-light border-2 border-gold/30 hover:border-gold rounded-2xl p-6 transition-all duration-300"
          >
            <div class="text-4xl mb-4 text-center">💰</div>
            <p class="text-center text-lg">
              Что нужно мастеру, чтобы клиенты сами искали его и много платили
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-12 bg-dark-light">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-10 gradient-gold">
          Звездные эксперты
        </h2>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <div
            class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105"
          >
            <div class="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-gold">
              <img
                :src="getThumbnail('image_gc_XfPXr41PsX.854x1280.jpeg', 200, 200)"
                alt="Анна Околот"
                class="w-full h-full object-cover object-center"
              />
            </div>
            <h3 class="text-xl font-bold text-gold mb-2">Анна Околот</h3>
            <p class="text-sm text-gray-400">Nail Fashion-креатор, блогер</p>
          </div>

          <div
            class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105"
          >
            <div
              class="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-2 border-gold/50"
            >
              <img
                :src="getThumbnail('image_gc_I2buwp23Et.809x1280.jpeg', 200, 200)"
                alt="Татьяна Шинкарева"
                class="w-full h-full object-cover object-center"
              />
            </div>
            <h3 class="text-xl font-bold text-gold mb-2">Татьяна Шинкарева</h3>
            <p class="text-sm text-gray-400">Чемпион бьюти-конкурсов, технолог компании Emi</p>
          </div>

          <div
            class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105"
          >
            <div class="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-gold">
              <img
                :src="getThumbnail('image_gc_JE0BAkJkha.853x1280.jpeg', 200, 200)"
                alt="Наталья Калядина"
                class="w-full h-full object-cover object-center"
              />
            </div>
            <h3 class="text-xl font-bold text-gold mb-2">Наталья Калядина</h3>
            <p class="text-sm text-gray-400">Nail-стилист, Руководитель команды "Неглянец"</p>
          </div>

          <div
            class="bg-dark border-2 border-gold/30 hover:border-gold rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105"
          >
            <div class="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-gold">
              <img
                :src="getThumbnail('image_gc_rtwdRgctbf.853x1280.jpeg', 200, 200)"
                alt="Ирина Дровникова"
                class="w-full h-full object-cover object-center"
              />
            </div>
            <h3 class="text-xl font-bold text-gold mb-2">Ирина Дровникова</h3>
            <p class="text-sm text-gray-400">Владелец сети салонов красоты в Москве</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-12 gradient-bg">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl md:text-5xl font-display font-bold text-center mb-6 gradient-gold">
          Что ты получишь
        </h2>

        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-10">
          <div
            class="bg-dark-light border-2 border-gold/50 rounded-2xl p-8 flex items-start gap-4 hover:border-gold transition-colors"
          >
            <div class="text-3xl text-gold flex-shrink-0">
              <i class="fab fa-telegram"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gold mb-2">Доступ в закрытый тг канал</h3>
              <p class="text-gray-300">Где будут различные гайды, подкасты от спикеров и задания</p>
            </div>
          </div>

          <div
            class="bg-dark-light border-2 border-gold/50 rounded-2xl p-8 flex items-start gap-4 hover:border-gold transition-colors relative"
          >
            <div class="text-3xl text-gold flex-shrink-0">
              <i class="fas fa-hands"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gold mb-2">4 новые дорогие техники</h3>
              <p class="text-gray-300">Которые освоишь на практике + именной сертификат</p>
            </div>
          </div>

          <div
            class="bg-dark-light border-2 border-gold/50 rounded-2xl p-8 flex items-start gap-4 hover:border-gold transition-colors"
          >
            <div class="text-3xl text-gold flex-shrink-0">
              <i class="fas fa-gift"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gold mb-2">Уникальное предложение</h3>
              <p class="text-gray-300">От бренда EMI только для участников</p>
            </div>
          </div>

          <div
            class="bg-dark-light border-2 border-gold/50 rounded-2xl p-8 flex items-start gap-4 hover:border-gold transition-colors"
          >
            <div class="text-3xl text-gold flex-shrink-0">
              <i class="fas fa-fire"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gold mb-2">Мощная перезагрузка</h3>
              <p class="text-gray-300">И мотивация на взрывной рост в профессии</p>
            </div>
          </div>
        </div>

        <div class="max-w-2xl mx-auto mt-12 text-center">
          <img
            :src="getThumbnail('image_gc_kOLW0WGBwY.1920x1357.jpeg', 600)"
            alt="Сертификат участника"
            class="rounded-2xl shadow-2xl mx-auto border-4 border-gold/50 transform hover:scale-105 transition-transform"
          />
          <p class="mt-6 text-gray-400 text-sm">*Пример сертификата участника практикума</p>
        </div>
      </div>
    </section>

    <section class="py-16 bg-dark-light relative overflow-hidden">
      <div class="absolute inset-0">
        <div
          class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-gold/10 via-transparent to-burgundy/10 blur-3xl"
        ></div>
      </div>

      <div class="container mx-auto px-4 relative z-10">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-5xl md:text-6xl font-display font-bold mb-8">
            <span class="gradient-gold">Твой путь к успеху</span>
            <br />
            начинается здесь!
          </h2>

          <p class="text-2xl text-gray-300 mb-6">11, 12 и 13 ноября в 18:00 МСК</p>

          <div
            class="bg-burgundy/20 border-2 border-burgundy rounded-xl px-6 py-4 inline-block mb-8"
          >
            <p class="text-lg font-semibold text-white">
              ⚡ Это премьера! Обычно такие практикумы платные
            </p>
          </div>

          <div
            class="bg-dark border-2 border-blue-500 rounded-2xl px-8 py-6 mb-10 max-w-3xl mx-auto"
          >
            <p class="text-xl font-bold text-white mb-4 text-center">
              <i class="fas fa-exclamation-triangle text-blue-500 mr-2"></i>
              Почему мест действительно ограничено:
            </p>
            <div class="grid md:grid-cols-2 gap-4 text-left">
              <div class="flex items-start gap-3">
                <i class="fas fa-users text-blue-500 mt-1 flex-shrink-0"></i>
                <p class="text-sm text-gray-300">
                  Вебинарная платформа вмещает максимум
                  <span class="text-white font-bold">1000 участников</span>
                </p>
              </div>
              <div class="flex items-start gap-3">
                <i class="fas fa-certificate text-blue-500 mt-1 flex-shrink-0"></i>
                <p class="text-sm text-gray-300">
                  На каждого готовится <span class="text-white font-bold">именной сертификат</span>
                </p>
              </div>
              <div class="flex items-start gap-3">
                <i class="fas fa-gift text-blue-500 mt-1 flex-shrink-0"></i>
                <p class="text-sm text-gray-300">
                  Призов всего <span class="text-white font-bold">10 штук</span> — нужно успеть
                  попасть в розыгрыш
                </p>
              </div>
              <div class="flex items-start gap-3">
                <i class="fas fa-comments text-blue-500 mt-1 flex-shrink-0"></i>
                <p class="text-sm text-gray-300">
                  Эксперты смогут ответить на вопросы только
                  <span class="text-white font-bold">при небольшой группе</span>
                </p>
              </div>
            </div>
          </div>

          <button
            @click="openPopup"
            class="bg-gradient-to-r from-burgundy via-red-700 to-burgundy hover:from-red-800 hover:via-burgundy hover:to-red-800 text-white font-bold py-3 px-6 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-xl inline-block"
          >
            <i class="fas fa-rocket mr-2"></i>
            Зайти на практикум пока еще есть бесплатные места
          </button>

          <div
            class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400"
          >
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle text-gold"></i>
              <span>Бесплатное участие</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle text-gold"></i>
              <span>Сертификат участника</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle text-gold"></i>
              <span>Розыгрыш призов</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="bg-dark py-8 border-t border-gold/20">
      <div class="container mx-auto px-4 text-center text-gray-500 text-sm">
        <p>© 2024 EMI Beauty. Все права защищены.</p>
      </div>
    </footer>

    <FloatingButton @open-popup="openPopup" />
    <RegistrationPopup :is-open="isPopupOpen" @close="closePopup" />

    <!-- Уведомления о регистрациях -->
    <Transition name="slide-fade">
      <div
        v-if="showNotification"
        class="fixed top-6 right-6 bg-dark-light border-2 border-gold/50 rounded-xl px-5 py-4 shadow-2xl z-50 max-w-sm backdrop-blur-md"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0"
          >
            <i class="fas fa-user-check text-gold"></i>
          </div>
          <div class="flex-1">
            <p class="text-white font-semibold text-sm">{{ currentNotification.name }}</p>
            <p class="text-gray-400 text-xs">
              {{ currentNotification.city }} · Только что зарегистрировался
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import FloatingButton from '../components/FloatingButton.vue'
import RegistrationPopup from '../components/RegistrationPopup.vue'

const isPopupOpen = ref(false)
const showNotification = ref(false)
const currentNotification = ref({ name: '', city: '' })

const notifications = [
  { name: 'Анна М.', city: 'Москва' },
  { name: 'Елена К.', city: 'Санкт-Петербург' },
  { name: 'Мария С.', city: 'Казань' },
  { name: 'Ольга В.', city: 'Екатеринбург' },
  { name: 'Наталья Р.', city: 'Новосибирск' },
  { name: 'Ирина Л.', city: 'Краснодар' },
  { name: 'Светлана Д.', city: 'Челябинск' },
  { name: 'Татьяна Б.', city: 'Ростов-на-Дону' },
  { name: 'Юлия П.', city: 'Нижний Новгород' },
  { name: 'Алина Г.', city: 'Самара' },
  { name: 'Виктория Н.', city: 'Воронеж' },
  { name: 'Дарья Ж.', city: 'Красноярск' },
  { name: 'Екатерина З.', city: 'Омск' },
  { name: 'Кристина Ш.', city: 'Уфа' },
  { name: 'Людмила Ф.', city: 'Пермь' }
]

let notificationInterval = null

const showRandomNotification = () => {
  const randomIndex = Math.floor(Math.random() * notifications.length)
  currentNotification.value = notifications[randomIndex]
  showNotification.value = true

  // Скрываем уведомление через 5 секунд
  setTimeout(() => {
    showNotification.value = false
  }, 5000)
}

onMounted(() => {
  // Первое уведомление через 5 секунд после загрузки страницы
  setTimeout(() => {
    showRandomNotification()
    // Затем показываем каждые 40 секунд
    notificationInterval = setInterval(showRandomNotification, 40000)
  }, 5000)
})

onUnmounted(() => {
  if (notificationInterval) {
    clearInterval(notificationInterval)
  }
})

const openPopup = () => {
  isPopupOpen.value = true
}

const closePopup = () => {
  isPopupOpen.value = false
}

const getThumbnail = (hash, width, height) => {
  if (height) {
    return `https://fs.chatium.io/thumbnail/${hash}/s/${width}x${height}`
  }
  return `https://fs.chatium.io/thumbnail/${hash}/s/${width}x`
}
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
