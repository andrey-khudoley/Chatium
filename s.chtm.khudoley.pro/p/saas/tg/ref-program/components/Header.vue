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

<style scoped>
.header {
  background: transparent;
  padding: 1.25rem 0;
  position: relative;
  z-index: 200;
  transition: all 0.25s ease;
}

.header-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Скрытие контента при открытии модального окна */
.hidden-for-modal {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
}

.content-hidden {
  transition: opacity 0.3s ease;
}

/* Terminal-style corner brackets for header */
.header::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header::after {
  content: '';
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  position: relative;
}

.header-logo-and-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  text-decoration: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

/* Анимация срабатывает только при ховере на сами элементы (логотип или заголовок) */
.header-logo-and-title:has(.header-logo:hover) .header-logo,
.header-logo-and-title:has(.header-logo:hover) .header-title,
.header-logo-and-title:has(.header-title:hover) .header-logo,
.header-logo-and-title:has(.header-title:hover) .header-title {
  animation: glitch-text 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Основная анимация глитча с RGB-разделением */
@keyframes glitch-text {
  0%,
  100% {
    transform: translate(0);
    filter: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  20% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  30% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1.5px 0 0 #ff00ff) drop-shadow(-1.5px 0 0 #00ffff);
  }
  40% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  50% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  60% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  70% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  80% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  90% {
    transform: translate(-0.5px, 0);
    filter: drop-shadow(0.5px 0 0 #ff00ff) drop-shadow(-0.5px 0 0 #00ffff);
  }
}

.header-logo-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

/* Легкие CRT scanlines для логотипа */
.header-logo-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-logo-link::before {
  opacity: 1;
  animation: scanline-flicker-subtle 4s linear infinite;
}

@keyframes scanline-flicker-subtle {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.4;
  }
}

.header-logo {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
  filter: brightness(0.98) contrast(1.05) drop-shadow(0 0 3px rgba(211, 35, 75, 0.15));
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.header-logo-and-title:hover .header-logo {
  filter: brightness(1.05) contrast(1.1) drop-shadow(0 0 6px rgba(211, 35, 75, 0.3));
  animation: logo-rgb-glitch 3s ease-in-out infinite;
}

/* Периодический тонкий RGB-глитч для логотипа */
@keyframes logo-rgb-glitch {
  0%,
  85%,
  100% {
    filter: brightness(1.05) contrast(1.1);
  }
  86% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4))
      drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.4));
  }
  87% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4))
      drop-shadow(1px 0 0 rgba(0, 255, 255, 0.4));
  }
  88% {
    filter: brightness(1.05) contrast(1.1);
  }
  91% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.3))
      drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.3));
  }
  92% {
    filter: brightness(1.05) contrast(1.1);
  }
}

.header-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.08em;
  text-shadow:
    0 0 8px rgba(232, 232, 232, 0.25),
    0.5px 0 0 rgba(255, 0, 255, 0.08),
    -0.5px 0 0 rgba(0, 255, 255, 0.08);
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Мерцающий курсор после текста - появляется при hover на логотип ИЛИ заголовок */
.header-title::after {
  content: '▮';
  margin-left: 0.25rem;
  opacity: 0;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.5);
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-title::after {
  opacity: 1;
  animation: terminal-cursor-blink 1s step-end infinite;
}

@keyframes terminal-cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.header-clock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.3);
  position: relative;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: all 0.25s ease;
  cursor: default;
  padding: 0.25rem 0.6rem 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 0;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 6px rgba(160, 160, 160, 0.08);
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}

.header-clock i {
  font-size: 0.625rem;
  opacity: 0.7;
}

.clock-time {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.header-clock:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.header-clock:hover i {
  opacity: 1;
  animation: clock-icon-pulse 2s ease-in-out infinite;
}

@keyframes clock-icon-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-action-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.25s ease;
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

/* CRT scanlines для кнопок хедера */
.header-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.header-action-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 2;
}

.header-action-btn i {
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
}

.header-action-btn:hover {
  border-color: var(--color-border-light);
  transform: translateY(-2px);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.header-action-btn:hover::after {
  transform: scaleX(1);
}

.header-action-btn:hover i.fa-times {
  transform: rotate(90deg) scale(1.1);
}

.header-action-btn:hover i.fa-window-maximize {
  transform: scale(1.15);
}

.header-action-btn:hover i.fa-window-minimize {
  transform: translateY(2px) scaleY(0.7);
}

.header-action-btn:hover i.fa-cog {
  transform: rotate(90deg);
}

.header-action-btn:active {
  transform: translateY(0);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.header-action-btn:active i {
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .header {
    padding: 1rem 0;
  }

  .header-title {
    font-size: 1rem;
  }

  .header-clock {
    font-size: 0.8125rem;
    padding: 0.3rem 0.5rem;
    gap: 0.35rem;
  }

  .header-clock i {
    font-size: 0.6875rem;
  }

  .clock-time {
    font-size: 0.8125rem;
  }

  .header-action-btn {
    width: 1.875rem;
    height: 1.875rem;
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .header-clock {
    display: none;
  }
}
</style>
