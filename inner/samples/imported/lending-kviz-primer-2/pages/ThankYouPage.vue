<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-3xl">
      <div class="quiz-card p-6 md:p-8 text-center">
        <!-- Иконка подарка -->
        <div class="mb-6">
          <div
            class="inline-block bg-gradient-to-br from-orange-500 to-red-500 rounded-full p-6 shadow-lg pulse-animation"
          >
            <i class="fas fa-gift text-5xl text-white"></i>
          </div>
        </div>

        <!-- Заголовок -->
        <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-3">Поздравляем! 🎉</h1>

        <p class="text-lg text-gray-700 mb-8">Ваш подарок готов к скачиванию</p>

        <!-- Описание бонуса (краткое) -->
        <div
          class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6 text-center border-2 border-amber-200"
        >
          <div class="mb-3">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">
              Профессиональное руководство мастера-педикюра
            </h2>
            <p class="text-orange-600 font-bold text-lg mb-3">147 страниц эксклюзивного контента</p>
          </div>
        </div>

        <!-- Кнопка скачивания -->
        <button
          @click="downloadGift"
          class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-5 rounded-xl text-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 mb-3"
        >
          <i class="fas fa-download mr-3"></i>
          СКАЧАТЬ ПОДАРОК
        </button>

        <p class="text-sm text-gray-600">
          <i class="fas fa-info-circle mr-1"></i>
          Укажите ваши данные верно — именно туда придет подарок
        </p>
      </div>
    </div>

    <!-- Модальное окно с формой GetCourse -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeForm"
    >
      <div class="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Получить подарок</h3>
          <button
            @click="closeForm"
            type="button"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <p class="text-sm text-gray-600 mb-6">
          <i class="fas fa-info-circle text-orange-500 mr-2"></i>
          Укажите ваши данные верно — именно туда придет подарок
        </p>

        <!-- GetCourse форма -->
        <form
          id="ltForm8532667"
          class="lt-normal-form lt-form-inner lt-form text-center lt-form-horizontal"
          data-id="2189337920"
          action="https://emi-courses.ru/pl/lite/block-public/process-html?id=2189337920"
          method="post"
          data-open-new-window="0"
          data-sequential-request="1"
        >
          <input type="hidden" name="formParams[setted_offer_id]" />
          <input type="hidden" name="formParams[willCreatePaidDeal]" value="" />

          <div class="mb-4">
            <input
              type="text"
              maxlength="60"
              placeholder="Введите ваше имя"
              name="formParams[first_name]"
              value=""
              required
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div class="mb-4">
            <input
              type="text"
              maxlength="60"
              placeholder="Введите ваш e-mail"
              name="formParams[email]"
              value=""
              required
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div class="mb-6">
            <input
              type="text"
              name="formParams[phone]"
              value=""
              maxlength="60"
              placeholder="Введите ваш телефон"
              required
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors inputTwo_phone"
            />
          </div>

          <!-- Hidden поля для UTM меток и других параметров -->
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
          <input type="hidden" name="requestSimpleSign" value="ca69a2ba6c8c105c1a2514b15f20be7c" />
          <input type="hidden" name="isHtmlWidget" value="1" />

          <button
            type="submit"
            id="button8899821"
            class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-xl text-lg font-bold hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            @click="handleSubmit"
          >
            <i class="fas fa-paper-plane mr-2"></i>
            Записаться на интенсив
          </button>
        </form>

        <span id="gccounterImgContainer"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showForm = ref(false)

function downloadGift() {
  showForm.value = true

  // Инициализируем скрипты GetCourse после открытия формы
  setTimeout(() => {
    initGetCourseScripts()
  }, 300)
}

function closeForm() {
  showForm.value = false
}

function handleSubmit(event) {
  if (window['btnprs68ef7820db0a1']) {
    event.preventDefault()
    return false
  }
  window['btnprs68ef7820db0a1'] = true
  setTimeout(function () {
    window['btnprs68ef7820db0a1'] = false
  }, 6000)
  return true
}

function initGetCourseScripts() {
  // Функция для работы с UTM метками
  function shoveInAllForms(selector, value) {
    document
      .querySelectorAll(`input[data-id="${selector}"]`)
      .forEach((elem) => (elem.value = value))
  }

  function getGet(name) {
    var s = window.location.search
    s = s.match(new RegExp(name + '=([^&=]+)?'))
    return s ? decodeURI(s[1]) : '(not set)'
  }

  // Заполнение UTM меток
  const selectorAndUtmRelations = {
    'field-input-1297809': decodeURI(getGet('utm_source')),
    'field-input-1297810': decodeURI(getGet('utm_medium')),
    'field-input-1297811': decodeURI(getGet('utm_campaign')),
    'field-input-1297812': decodeURI(getGet('utm_term')),
    'field-input-1297813': decodeURI(getGet('utm_content'))
  }

  for (const keyUtm of Object.keys(selectorAndUtmRelations)) {
    shoveInAllForms(keyUtm, selectorAndUtmRelations[keyUtm])
  }

  // Заполнение location и referrer
  let loc = document.getElementById('149892968ef7820a3b5a')
  if (loc) {
    loc.value = window.location.href
  }

  let ref = document.getElementById('149892968ef7820a3b5aref')
  if (ref) {
    ref.value = document.referrer
  }

  // Статистика GetCourse
  let statUrl =
    'https://emi-courses.ru/stat/counter?ref=' +
    encodeURIComponent(document.referrer) +
    '&loc=' +
    encodeURIComponent(document.location.href)
  let counterContainer = document.getElementById('gccounterImgContainer')
  if (counterContainer) {
    counterContainer.innerHTML =
      "<img width=1 height=1 style='display:none' id='gccounterImg' src='" + statUrl + "'/>"
  }

  // Маска телефона (если доступна функция phoneAutoMask)
  if (typeof phoneAutoMask !== 'undefined') {
    phoneAutoMask('.inputTwo_phone input', {
      fallbackCountry: 'ru',
      l10n: 'ru',
      intlTelInput: {
        preferredCountries: ['ru', 'ua']
      }
    })
  }
}

onMounted(() => {
  // Можно инициализировать общие скрипты при монтировании компонента
})
</script>

<style scoped>
.quiz-card {
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
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
