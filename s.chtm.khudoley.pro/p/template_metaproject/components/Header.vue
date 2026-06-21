<template>
  <LogoutModal :visible="showLogoutModal" @confirm="confirmLogout" @cancel="cancelLogout" />
  <header class="header" :class="{ 'header-hidden': showLogoutModal }">
    <div class="container mx-auto px-4 max-w-6xl header-content">
      <div class="header-title-section">
        <a :href="props.indexUrl" class="header-logo-and-title">
          <div class="header-logo-link">
            <img
              src="https://fs-thb03.getcourse.ru/fileservice/file/thumbnail/h/246c9167ba22ef571b50a2a795ee1186.png/s/300x/a/565681/sc/95"
              alt="Логотип"
              class="header-logo"
            />
          </div>
          <h1 class="header-title">{{ projectTitle }}</h1>
        </a>
      </div>
      <div class="header-right">
        <span class="header-clock">
          <i class="fas fa-clock"></i>
          <span class="clock-time">{{ currentTime }}</span>
        </span>
        <div class="header-actions">
          <a
            v-if="props.isAdmin && props.adminUrl"
            :href="props.adminUrl"
            class="header-action-btn"
            title="Настройки админа"
          >
            <i class="fas fa-cog"></i>
          </a>
          <a v-if="props.testsUrl" :href="props.testsUrl" class="header-action-btn" title="Тесты">
            <i class="fas fa-flask"></i>
          </a>
          <button @click="triggerGlitch" class="header-action-btn">
            <i class="fas fa-window-minimize"></i>
          </button>
          <a
            v-if="props.isAuthenticated"
            :href="props.profileUrl"
            class="header-action-btn"
            title="Профиль пользователя"
          >
            <i class="fas fa-window-maximize"></i>
          </a>
          <a v-else :href="props.loginUrl" class="header-action-btn" title="Войти в систему">
            <i class="fas fa-window-maximize"></i>
          </a>
          <button @click="handleCloseClick" class="header-action-btn" title="Закрыть">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LogoutModal from './LogoutModal.vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('Header')

const props = defineProps<{
  projectTitle: string
  pageName?: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()

const isGlitching = ref(false)
const showLogoutModal = ref(false)
const currentTime = ref('')

// Функция для форматирования времени
const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
}

let timeInterval: number | null = null
let escHandler: ((e: KeyboardEvent) => void) | null = null

onMounted(() => {
  log.info('Component mounted, clock started')
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)

  // Обработчик Esc для закрытия модального окна выхода
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showLogoutModal.value) {
      cancelLogout()
    }
  }

  window.addEventListener('keydown', escHandler)
})

onUnmounted(() => {
  log.info('Component unmounted')
  if (timeInterval) {
    clearInterval(timeInterval)
  }

  // Удаляем обработчик Esc при размонтировании
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
  }
})

const triggerGlitch = () => {
  if (isGlitching.value) return
  log.notice('Header glitch triggered')

  isGlitching.value = true

  // Добавляем глитч эффект ко всей странице
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')

    setTimeout(() => {
      appLayout.classList.remove('global-glitch-active')
      isGlitching.value = false
    }, 500)
  }
}

const handleCloseClick = () => {
  if (props.isAuthenticated) {
    log.notice('Logout modal opened')
    // Показываем модальное окно для авторизованных
    showLogoutModal.value = true
    // Скрываем весь контент страницы
    const appLayout = document.querySelector('.app-layout')
    const contentWrapper = document.querySelector('.content-wrapper')
    const footer = document.querySelector('.app-footer')

    if (appLayout) appLayout.classList.add('content-hidden')
    if (contentWrapper) contentWrapper.classList.add('hidden-for-modal')
    if (footer) footer.classList.add('hidden-for-modal')
  } else {
    log.debug('Close button clicked (guest), triggering glitch')
    // Глитч эффект для неавторизованных
    triggerGlitch()
  }
}

const confirmLogout = () => {
  log.critical('User confirmed logout')
  window.location.href = '/s/logout'
}

const cancelLogout = () => {
  log.info('Logout cancelled')
  showLogoutModal.value = false
  // Восстанавливаем видимость контента
  const appLayout = document.querySelector('.app-layout')
  const contentWrapper = document.querySelector('.content-wrapper')
  const footer = document.querySelector('.app-footer')

  if (appLayout) appLayout.classList.remove('content-hidden')
  if (contentWrapper) contentWrapper.classList.remove('hidden-for-modal')
  if (footer) footer.classList.remove('hidden-for-modal')
}
</script>
