<template>
  <div class="gradient-bg min-h-screen flex items-center justify-center form-container">
    <!-- Декоративные элементы -->
    <div class="decorative-element decorative-element-1"></div>
    <div class="decorative-element decorative-element-2"></div>

    <div class="form-wrapper">
      <!-- Форма -->
      <div class="card">
        <!-- Шапка формы (иконка и заголовок) -->
        <div class="form-header">
          <!-- Иконка -->
          <div class="icon-wrapper">
            <div class="icon-container">
              <i class="fas fa-video text-3xl" style="color: var(--color-text)"></i>
            </div>
          </div>

          <!-- Заголовки -->
          <div class="header-text">
            <h1 class="form-title" style="color: var(--color-text)">Войти на вебинар</h1>

            <p class="form-subtitle" style="color: var(--color-text-secondary)">
              Внимательно заполняй все данные. Ошибка в одной букве может стоить тебе участия
            </p>
          </div>
        </div>

        <!-- Форма -->
        <form @submit.prevent="handleSubmit" class="form-content">
          <!-- Контейнер для полей ввода -->
          <div class="form-fields">
            <!-- Имя -->
            <div class="form-field">
              <label
                class="block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-user mr-2" style="color: var(--color-text-secondary)"></i>
                Ваше имя
              </label>
              <input
                v-model="form.name"
                type="text"
                class="input"
                placeholder="Например: Анна"
                required
                :disabled="loading"
              />
            </div>

            <!-- Email -->
            <div class="form-field">
              <label
                class="block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-envelope mr-2" style="color: var(--color-text-secondary)"></i>
                Email
              </label>
              <input
                v-model="form.email"
                type="email"
                class="input"
                placeholder="Например: anna@example.com"
                required
                :disabled="loading"
              />
            </div>

            <!-- Телефон -->
            <div class="form-field">
              <label
                class="block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-phone mr-2" style="color: var(--color-text-secondary)"></i>
                Телефон
              </label>

              <input
                ref="phoneInput"
                id="phone"
                type="tel"
                class="input"
                placeholder="Введите номер телефона"
                required
                :disabled="loading"
                @keypress="handlePhoneKeypress"
                @paste="handlePhonePaste"
              />

              <p class="text-xs mt-1.5 ml-1" style="color: #999999">
                Выберите страну и введите номер телефона
              </p>
            </div>
          </div>

          <!-- Сообщение об успехе -->
          <div v-if="success" class="message-box success-message">
            <div class="flex items-center gap-3">
              <i class="fas fa-check-circle text-2xl" style="color: var(--color-success)"></i>
              <div>
                <p class="font-semibold" style="color: var(--color-text)">Отлично!</p>
                <p class="text-sm" style="color: var(--color-text-secondary)">
                  Данные успешно отправлены
                </p>
              </div>
            </div>
          </div>

          <!-- Сообщение об ошибке -->
          <div v-if="error" class="message-box error-message">
            <div class="flex items-center gap-3">
              <i
                class="fas fa-exclamation-triangle text-2xl"
                style="color: var(--color-danger)"
              ></i>
              <div>
                <p class="font-semibold" style="color: var(--color-text)">Ошибка</p>
                <p class="text-sm" style="color: var(--color-text-secondary)">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Кнопка отправки -->
          <button type="submit" class="btn btn-primary submit-button" :disabled="loading">
            <i v-if="loading" class="fas fa-spinner animate-spin mr-3"></i>
            <i v-else class="fas fa-arrow-right mr-3"></i>
            {{ loading ? 'Отправка...' : 'Войти на вебинар' }}
          </button>

          <!-- Дополнительная информация -->
          <div class="form-footer">
            <div class="flex items-center justify-center gap-2 text-sm">
              <i class="fas fa-lock" style="color: var(--color-text-secondary)"></i>
              <span style="color: var(--color-text-secondary)">Ваши данные в безопасности</span>
            </div>
          </div>
        </form>
      </div>

      <!-- Дополнительный текст -->
      <div v-if="ctx.user?.is('Admin')" class="additional-text">
        <p class="text-sm" style="color: var(--color-text-on-dark)">
          <a
            href="/s/auth/signin"
            class="font-semibold hover:underline transition-all"
            style="color: var(--color-primary)"
          >
            Войди в админ-панель
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const form = ref({
  name: '',
  email: ''
})

const loading = ref(false)
const success = ref(false)
const error = ref(null)
const phoneInput = ref(null)
let iti = null // Экземпляр intl-tel-input

// Инициализация intl-tel-input после монтирования компонента
onMounted(() => {
  if (phoneInput.value && window.intlTelInput) {
    iti = window.intlTelInput(phoneInput.value, {
      initialCountry: 'ru',
      preferredCountries: ['ru', 'kz', 'by', 'ua', 'us'],
      separateDialCode: true,
      autoPlaceholder: 'aggressive',
      formatOnDisplay: true,
      nationalMode: false,
      strictMode: true,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/js/utils.js'
    })

    // Добавляем обработчик для автоматического форматирования
    phoneInput.value.addEventListener('input', handlePhoneInput)
  }
})

// Очистка при размонтировании
onBeforeUnmount(() => {
  if (iti) {
    iti.destroy()
  }
  if (phoneInput.value) {
    phoneInput.value.removeEventListener('input', handlePhoneInput)
  }
})

// Ограничение ввода только цифрами
function handlePhoneKeypress(event) {
  const char = String.fromCharCode(event.keyCode || event.which)
  // Разрешаем только цифры
  if (!/^\d$/.test(char)) {
    event.preventDefault()
  }
}

// Обработка вставки - удаляем все нечисловые символы
function handlePhonePaste(event) {
  event.preventDefault()
  const pastedText = (event.clipboardData || window.clipboardData).getData('text')
  const digitsOnly = pastedText.replace(/\D/g, '')

  if (digitsOnly && phoneInput.value) {
    // Вставляем только цифры
    const input = phoneInput.value
    const start = input.selectionStart
    const end = input.selectionEnd
    const currentValue = input.value

    input.value = currentValue.substring(0, start) + digitsOnly + currentValue.substring(end)

    // Форматируем через intl-tel-input
    if (iti) {
      // Триггерим событие input для автоматического форматирования
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Автоматическое форматирование при вводе
function handlePhoneInput(event) {
  const input = event.target
  let value = input.value.replace(/\D/g, '')

  // Ограничиваем длину в зависимости от страны
  if (iti) {
    const selectedCountryData = iti.getSelectedCountryData()
    // Большинство номеров не длиннее 15 цифр
    const maxLength = 15

    if (value.length > maxLength) {
      value = value.substring(0, maxLength)
      input.value = value
    }
  }
}

// Обработка отправки формы
async function handleSubmit() {
  loading.value = true
  success.value = false
  error.value = null

  try {
    // Валидация
    if (!form.value.name.trim()) {
      throw new Error('Пожалуйста, введите ваше имя')
    }

    if (!form.value.email.trim()) {
      throw new Error('Пожалуйста, введите email')
    }

    // Получаем номер телефона через intl-tel-input
    if (!iti) {
      throw new Error('Ошибка инициализации поля телефона')
    }

    const phoneNumber = iti.getNumber()

    if (!phoneNumber) {
      throw new Error('Пожалуйста, введите телефон')
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      throw new Error('Пожалуйста, введите корректный email')
    }

    // Валидация телефона через intl-tel-input
    if (!iti.isValidNumber()) {
      throw new Error('Пожалуйста, введите корректный номер телефона')
    }

    // Имитация отправки данных
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Здесь будет реальная отправка данных
    console.log('Отправка данных:', {
      name: form.value.name,
      email: form.value.email,
      phone: phoneNumber,
      phoneCountry: iti.getSelectedCountryData()
    })

    success.value = true

    // Очистка формы через 2 секунды
    setTimeout(() => {
      form.value = {
        name: '',
        email: ''
      }
      if (phoneInput.value) {
        phoneInput.value.value = ''
      }
      success.value = false
    }, 2000)
  } catch (e) {
    error.value = e.message
    setTimeout(() => {
      error.value = null
    }, 5000)
  } finally {
    loading.value = false
  }
}
</script>

<style>
/* === АДАПТИВНАЯ ФОРМА === */

/* Общий контейнер формы */
.form-container {
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

/* Декоративные элементы */
.decorative-element {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.decorative-element-1 {
  top: 10%;
  left: 5%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(212, 184, 150, 0.08) 0%, transparent 70%);
}

.decorative-element-2 {
  bottom: 10%;
  right: 5%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(200, 168, 128, 0.06) 0%, transparent 70%);
}

/* Обёртка формы */
.form-wrapper {
  width: 100%;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Шапка формы */
.form-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.icon-container {
  width: 80px;
  height: 80px;
  border-radius: 1rem;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-button-light);
}

.header-text {
  text-align: center;
}

.form-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.form-subtitle {
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 0 0.5rem;
}

/* Контент формы */
.form-content {
  display: flex;
  flex-direction: column;
}

/* Контейнер полей */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.form-field {
  flex: 1;
  min-width: 0;
}

/* Сообщения */
.message-box {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid;
  margin-bottom: 1.25rem;
}

.success-message {
  background: rgba(122, 155, 92, 0.1);
  border-color: var(--color-success);
}

.error-message {
  background: rgba(184, 92, 92, 0.1);
  border-color: var(--color-danger);
}

/* Кнопка отправки */
.submit-button {
  width: 100%;
  font-size: 1.125rem;
}

/* Футер формы */
.form-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

/* Дополнительный текст */
.additional-text {
  margin-top: 1.5rem;
  text-align: center;
}

/* === ПОРТРЕТНАЯ ОРИЕНТАЦИЯ (МОБИЛЬНЫЕ) === */
@media (orientation: portrait) {
  .form-container {
    padding: 0.75rem;
  }

  .form-wrapper {
    max-width: 100%;
    width: 100%;
  }

  .card {
    padding: 2rem 1.5rem !important;
    max-width: 100%;
    width: 100%;
  }

  .form-title {
    font-size: 1.75rem;
  }

  .icon-container {
    width: 70px;
    height: 70px;
  }

  .icon-wrapper {
    margin-bottom: 1.25rem;
  }
}

/* === АЛЬБОМНАЯ ОРИЕНТАЦИЯ (ДЕСКТОП) === */
@media (orientation: landscape) {
  .form-container {
    padding: 2rem;
  }

  .form-wrapper {
    max-width: 1000px;
    width: 100%;
  }

  .card {
    width: 100% !important;
    padding: 3rem !important;
    padding-left: 370px !important;
    padding-right: 3rem !important;
    display: block;
    min-height: 600px;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 340px;
    background:
      linear-gradient(135deg, rgba(212, 184, 150, 0.08) 0%, rgba(245, 229, 208, 0.12) 100%),
      url('https://optim.tildacdn.com/tild6232-3866-4139-a435-383466646164/-/format/webp/721A1826_2_1.png.webp')
        center center / cover no-repeat;
    background-blend-mode: overlay;
    border-radius: 1.5rem 0 0 1.5rem;
  }

  /* Левая декоративная часть */
  .form-header {
    display: none;
  }

  .form-header::before {
    display: none;
  }

  .form-header::after {
    display: none;
  }

  .icon-wrapper {
    display: none;
  }

  .icon-container {
    display: none;
  }

  .icon-container i {
    display: none;
  }

  .header-text {
    display: none;
  }

  .form-title {
    display: none;
  }

  .form-subtitle {
    display: none;
  }

  /* Правая часть с формой */
  .form-content {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    position: relative;
    z-index: 1;
  }

  .form-fields {
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-field {
    flex: none;
  }

  .submit-button {
    width: 100%;
    max-width: none;
  }

  .form-footer {
    margin-top: auto;
    padding-top: 2rem;
  }
}

/* === АДАПТАЦИЯ ПОД МАЛЕНЬКИЕ ЭКРАНЫ === */
@media (max-width: 900px) and (orientation: landscape) {
  .card {
    grid-template-columns: 1fr;
    padding: 2rem 1.5rem !important;
    min-height: auto;
  }

  .form-header {
    border-radius: 0;
    padding: 2rem 1.5rem;
    background: transparent;
  }

  .form-header::before {
    display: none;
  }

  .icon-container {
    width: 70px;
    height: 70px;
  }

  .icon-container i {
    font-size: 2rem !important;
  }

  .form-title {
    font-size: 1.75rem;
  }

  .form-subtitle {
    font-size: 0.875rem;
  }

  .form-content {
    padding: 0;
  }

  .form-fields {
    flex-direction: column;
    gap: 1.25rem;
  }
}

/* === АДАПТАЦИЯ ПОД ОЧЕНЬ МАЛЕНЬКИЕ ЭКРАНЫ === */
@media (max-width: 640px) {
  .form-container {
    padding: 0.5rem;
  }

  .card {
    padding: 1.5rem 1rem !important;
    border-radius: 1.25rem !important;
  }

  .form-title {
    font-size: 1.5rem;
  }

  .form-subtitle {
    font-size: 0.8125rem;
  }

  .icon-container {
    width: 60px;
    height: 60px;
  }

  .form-fields {
    gap: 1rem;
  }

  .submit-button {
    font-size: 1rem;
    padding: 1rem 2rem;
  }
}

/* === АДАПТАЦИЯ ПОД БОЛЬШИЕ ЭКРАНЫ === */
@media (min-width: 1200px) and (orientation: landscape) {
  .form-wrapper {
    max-width: 1100px;
    width: 100%;
  }

  .card {
    width: 100% !important;
    min-height: 650px;
    padding: 3.5rem !important;
    padding-left: 420px !important;
    padding-right: 3.5rem !important;
  }

  .card::before {
    width: 380px;
  }

  .form-fields {
    gap: 1.75rem;
  }
}

/* === СТИЛИЗАЦИЯ intl-tel-input === */
.iti {
  width: 100%;
  position: relative;
  z-index: 1;
}

.iti--allow-dropdown {
  width: 100%;
}

.iti--separate-dial-code {
  width: 100%;
}

.iti.iti--show-flags {
  width: 100%;
}

/* Когда список открыт - увеличиваем z-index */
.iti--container {
  z-index: 9999 !important;
}

.iti__input {
  width: 100%;
  padding: 1rem 1.25rem !important;
  padding-left: 60px !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.75rem !important;
  background: var(--color-bg-card) !important;
  color: var(--color-text) !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  font-size: 1rem !important;
  transition: var(--transition) !important;
  box-shadow: var(--shadow-sm) !important;
  line-height: 1.5 !important;
}

.iti__input:focus {
  outline: none !important;
  border-color: var(--color-primary) !important;
  box-shadow: var(--shadow-md) !important;
}

.iti__input:hover {
  border-color: var(--color-primary-dark) !important;
}

.iti__input::placeholder {
  color: #999999 !important;
}

.iti__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Кнопка выбора страны */
.iti__selected-flag {
  padding: 0 0 0 1rem !important;
  background: transparent !important;
}

.iti__flag-container {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.iti__selected-dial-code {
  color: var(--color-text) !important;
  font-weight: 500;
  margin-left: 0.5rem;
}

/* Выпадающий список стран */
.iti__country-list {
  background: var(--color-bg-card) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.75rem !important;
  box-shadow: var(--shadow-lg) !important;
  max-height: 300px !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  z-index: 9999 !important;
}

.iti__country {
  padding: 0.75rem 1rem !important;
  color: var(--color-text) !important;
  transition: var(--transition) !important;
}

.iti__country:hover {
  background: rgba(212, 184, 150, 0.1) !important;
}

.iti__country.iti__highlight {
  background: rgba(212, 184, 150, 0.15) !important;
}

.iti__dial-code {
  color: var(--color-text-secondary) !important;
}

.iti__country-name {
  color: var(--color-text) !important;
  margin-right: 0.5rem !important;
}

/* Поиск стран */
.iti__search-input {
  padding: 0.75rem 1rem !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.5rem !important;
  background: var(--color-bg-card) !important;
  color: var(--color-text) !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  margin: 0.5rem !important;
  width: calc(100% - 1rem) !important;
}

.iti__search-input:focus {
  outline: none !important;
  border-color: var(--color-primary) !important;
}

/* Стрелка */
.iti__arrow {
  border-top-color: var(--color-text-secondary) !important;
  margin-left: 0.5rem !important;
}

.iti__arrow--up {
  border-bottom-color: var(--color-text-secondary) !important;
}

/* Адаптивность intl-tel-input для мобильных */
@media (max-width: 640px) {
  .iti__input {
    padding: 0.875rem 1rem !important;
    padding-left: 55px !important;
    font-size: 0.9375rem !important;
  }

  .iti__country-list {
    max-height: 250px !important;
  }
}
</style>
