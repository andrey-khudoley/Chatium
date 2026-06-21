<script setup lang="ts">
import { onMounted, onUnmounted, ref, withDefaults } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { subscribeBootStaticReady, scheduleHideBootLoader } from '../shared/bootUi'
import { createComponentLogger } from '../shared/logger'
import { saveUserSettingsRoute } from '../api/user-settings/save'
import {
  DEFAULT_USER_TIMEZONE_OFFSET_HOURS,
  USER_TIMEZONE_OFFSET_MAX,
  USER_TIMEZONE_OFFSET_MIN,
} from '../shared/user-settings-defaults'

const log = createComponentLogger('ProfilePage')

declare const ctx: app.Ctx

function formatUtcOffsetLabel(h: number): string {
  if (h >= 0) return `UTC+${h}`
  return `UTC${h}`
}

const timezoneOptions = Array.from(
  { length: USER_TIMEZONE_OFFSET_MAX - USER_TIMEZONE_OFFSET_MIN + 1 },
  (_, i) => {
    const h = USER_TIMEZONE_OFFSET_MIN + i
    return { value: h, label: formatUtcOffsetLabel(h) }
  },
)

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
  }
}

const props = withDefaults(
  defineProps<{
    projectTitle: string
    indexUrl: string
    profileUrl: string
    testsUrl?: string
    toolsStateUrl?: string
    toolsControlUrl?: string
    encodedFocusToolsSocketId?: string
    loginUrl: string
    isAuthenticated: boolean
    isAdmin?: boolean
    adminUrl?: string
    user: {
      displayName?: string
      confirmedEmail?: string
      confirmedPhone?: string
    }
    /** Смещение UTC в часах (SSR + сохранение в Heap `user-settings`). */
    timezoneOffsetHours?: number
  }>(),
  {
    timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS,
  },
)

const selectedTimezoneOffset = ref(props.timezoneOffsetHours)
const timezoneSaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

async function onTimezoneChange(): Promise<void> {
  timezoneSaveStatus.value = 'saving'
  try {
    const res = await saveUserSettingsRoute.run(ctx, { timezoneOffsetHours: selectedTimezoneOffset.value })
    if (res.success && typeof res.timezoneOffsetHours === 'number') {
      selectedTimezoneOffset.value = res.timezoneOffsetHours
      timezoneSaveStatus.value = 'saved'
      setTimeout(() => {
        if (timezoneSaveStatus.value === 'saved') timezoneSaveStatus.value = 'idle'
      }, 2000)
    } else {
      timezoneSaveStatus.value = 'error'
    }
  } catch (e) {
    log.error('timezone save failed', { error: String(e) })
    timezoneSaveStatus.value = 'error'
  }
}

const showContent = ref(false)
const bootLoaderDone = ref(false)

// Анимация печатания текста
const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)

const intervalIds = { title: null as ReturnType<typeof setInterval> | null, desc: null as ReturnType<typeof setInterval> | null }

const typeTextSequence = () => {
  log.debug('Profile title animation started')
  const titleText = 'Профиль пользователя'
  cursorPosition.value = 'title'

  let titleIndex = 0
  intervalIds.title = setInterval(() => {
    if (titleIndex < titleText.length) {
      displayedTitle.value = titleText.substring(0, titleIndex + 1)
      titleIndex++
    } else {
      if (intervalIds.title) clearInterval(intervalIds.title)
      intervalIds.title = null
      showTitleUnderline.value = true
      typeDescription()
    }
  }, 15)
}

const typeDescription = () => {
  const descriptionText = 'Информация о вашем аккаунте'
  cursorPosition.value = 'description'
  let descIndex = 0
  intervalIds.desc = setInterval(() => {
    if (descIndex < descriptionText.length) {
      displayedDescription.value = descriptionText.substring(0, descIndex + 1)
      descIndex++
    } else {
      if (intervalIds.desc) clearInterval(intervalIds.desc)
      intervalIds.desc = null
      cursorPosition.value = 'final'
      showContent.value = true
    }
  }, 15)
}

const startAnimations = () => {
  log.info('Boot loader complete, starting profile animations')
  bootLoaderDone.value = true
  showCursor.value = true
  cursorPosition.value = 'title'
  scheduleHideBootLoader()
  setTimeout(() => typeTextSequence(), 200)
}

let unsubBootStatic: (() => void) | null = null

onMounted(() => {
  log.info('Component mounted')
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  unsubBootStatic = subscribeBootStaticReady(startAnimations)
})

onUnmounted(() => {
  log.info('Component unmounted')
  unsubBootStatic?.()
  if (intervalIds.title) clearInterval(intervalIds.title)
  if (intervalIds.desc) clearInterval(intervalIds.desc)
})

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <GlobalGlitch />
    <!-- Header -->
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
      :timezoneOffsetHours="selectedTimezoneOffset"
      :enableToolClockWidget="true"
      :toolsStateUrl="props.toolsStateUrl"
      :toolsControlUrl="props.toolsControlUrl"
      :encodedFocusToolsSocketId="props.encodedFocusToolsSocketId"
    />

    <!-- Content -->
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Profile Section -->
        <section class="profile-section" :class="{ 'content-visible': showContent }">
          <div class="profile-header">
            <div class="profile-icon-wrapper">
              <i class="fas fa-fingerprint profile-icon"></i>
            </div>
            <h1 class="profile-heading" :class="{ 'show-underline': showTitleUnderline }">
              {{ displayedTitle }}<span v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')" class="typing-cursor">▮</span>
            </h1>
            <p class="profile-description">
              {{ displayedDescription }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor">▮</span>
            </p>
          </div>

          <!-- Profile Info Card -->
          <div v-if="showContent" class="profile-card">
            <div class="profile-card-content">
              <!-- Display Name -->
              <div class="profile-field">
                <div class="profile-field-header">
                  <div class="profile-field-icon">
                    <i class="fas fa-id-card"></i>
                  </div>
                  <label class="profile-field-label">Имя пользователя</label>
                </div>
                <div class="profile-field-value">
                  {{ props.user.displayName || 'Не указано' }}
                </div>
              </div>

              <!-- Email -->
              <div class="profile-field">
                <div class="profile-field-header">
                  <div class="profile-field-icon">
                    <i class="fas fa-envelope"></i>
                  </div>
                  <label class="profile-field-label">Email адрес</label>
                </div>
                <div class="profile-field-value">
                  {{ props.user.confirmedEmail || 'Не подтвержден' }}
                </div>
              </div>

              <!-- Phone -->
              <div class="profile-field">
                <div class="profile-field-header">
                  <div class="profile-field-icon">
                    <i class="fas fa-phone"></i>
                  </div>
                  <label class="profile-field-label">Телефон</label>
                </div>
                <div class="profile-field-value">
                  {{ props.user.confirmedPhone || 'Не подтвержден' }}
                </div>
              </div>
            </div>
          </div>

          <!-- User settings -->
          <div v-if="showContent" class="profile-card profile-settings-card">
            <h2 class="profile-settings-heading">Настройки</h2>
            <div class="profile-card-content">
              <div class="profile-field">
                <div class="profile-field-header">
                  <div class="profile-field-icon">
                    <i class="fas fa-earth-europe"></i>
                  </div>
                  <label class="profile-field-label" for="profile-timezone-select">Часовой пояс</label>
                </div>
                <div class="profile-field-control">
                  <select
                    id="profile-timezone-select"
                    v-model.number="selectedTimezoneOffset"
                    class="profile-timezone-select"
                    :disabled="timezoneSaveStatus === 'saving'"
                    @change="onTimezoneChange"
                  >
                    <option v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <span v-if="timezoneSaveStatus === 'saving'" class="profile-settings-hint">Сохранение…</span>
                  <span v-else-if="timezoneSaveStatus === 'saved'" class="profile-settings-hint profile-settings-hint--ok"
                    >Сохранено</span
                  >
                  <span v-else-if="timezoneSaveStatus === 'error'" class="profile-settings-hint profile-settings-hint--err"
                    >Ошибка сохранения</span
                  >
                </div>
                <p class="profile-settings-note">
                  По умолчанию {{ formatUtcOffsetLabel(DEFAULT_USER_TIMEZONE_OFFSET_HOURS) }} (Москва). Используется для
                  отображения времени в приложении.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<style>
:root {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.15);
  --color-accent-medium: rgba(211, 35, 75, 0.25);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  background: var(--color-bg);
  letter-spacing: 0.03em;
}

/* Стилизация выделения текста */
::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

/* App Layout */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
  margin: 0;
  padding-top: 0;
}

/* Content Wrapper */
.content-wrapper {
  position: relative;
  z-index: 10;
}

.content-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 768px) {
  .content-inner {
    padding: 1.5rem 1rem;
  }
}

/* Profile Section */
.profile-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.profile-section.content-visible {
  opacity: 1;
  transform: translateY(0);
}

.profile-header {
  text-align: center;
  margin-bottom: 3rem;
}

.profile-icon-wrapper {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1.5rem;
  border-radius: 0;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 24px rgba(211, 35, 75, 0.4),
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 0 30px rgba(211, 35, 75, 0.2),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
}

.profile-icon-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
  animation: scanline-flicker 8s linear infinite;
}

.profile-icon-wrapper::after {
  content: '';
  position: absolute;
  left: -10%;
  width: 120%;
  height: 22%;
  top: -30%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  animation: fingerprint-scan 3.6s ease-in-out infinite;
}

@keyframes scanline-flicker {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.5; }
}

@keyframes fingerprint-scan {
  0% {
    transform: translateY(-140%);
    opacity: 0;
  }
  15% {
    opacity: 0.12;
  }
  50% {
    opacity: 0.18;
  }
  85% {
    opacity: 0.1;
  }
  100% {
    transform: translateY(140%);
    opacity: 0;
  }
}

@media (min-width: 769px) {
  .profile-icon-wrapper {
    box-shadow:
      0 10px 28px rgba(211, 35, 75, 0.45),
      0 5px 14px rgba(211, 35, 75, 0.35),
      0 0 40px rgba(211, 35, 75, 0.25);
  }
}

.profile-icon {
  font-size: 2rem;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
  position: relative;
  z-index: 3;
}

.profile-heading {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 1rem 0;
  position: relative;
  display: inline-block;
}

.profile-heading.show-underline::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 100px;
  height: 2px;
  background: var(--color-accent);
  box-shadow: 0 0 10px var(--color-accent);
}

.profile-description {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  margin: 0;
  min-height: 1.5rem;
}

.typing-cursor {
  display: inline-block;
  color: var(--color-accent);
  animation: cursor-blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Profile Card */
.profile-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
}

.profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.profile-card-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-field {
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border-light);
  transition: var(--transition);
}

.profile-field:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(211, 35, 75, 0.1);
}

.profile-field-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.profile-field-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--color-accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.profile-field-label {
  color: var(--color-text-secondary);
  font-size: 1.02rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}

.profile-field-value {
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
  padding-left: 2.75rem;
}

.profile-settings-card {
  margin-top: 1.75rem;
}

.profile-settings-heading {
  margin: 0 0 1.25rem 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.profile-field-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding-left: 2.75rem;
}

.profile-timezone-select {
  flex: 1;
  min-width: 12rem;
  max-width: 22rem;
  padding: 0.6rem 0.85rem;
  font-family: inherit;
  font-size: 1rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
}

.profile-timezone-select:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.profile-timezone-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.profile-timezone-select:disabled {
  opacity: 0.6;
  cursor: wait;
}

.profile-settings-hint {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.profile-settings-hint--ok {
  color: #7dffb8;
}

.profile-settings-hint--err {
  color: var(--color-accent-hover);
}

.profile-settings-note {
  margin: 0.75rem 0 0 2.75rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .profile-heading {
    font-size: 2rem;
  }

  .profile-card {
    padding: 1.5rem;
  }

  .profile-field-value {
    padding-left: 0;
  }

  .profile-field-control,
  .profile-settings-note {
    padding-left: 0;
  }
}

@media (max-width: 480px) {
  .content-inner {
    padding: 1.25rem 0.75rem;
  }

  .profile-heading {
    font-size: 1.65rem;
  }

  .profile-description {
    font-size: 1rem;
  }

  .profile-card {
    padding: 1.25rem;
    border-radius: 8px;
  }

  .profile-field {
    padding: 0.85rem;
  }
}

</style>
