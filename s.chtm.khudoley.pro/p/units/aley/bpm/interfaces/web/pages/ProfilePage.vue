<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'

const log = createComponentLogger('ProfilePage')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  testsUrl?: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  user: {
    displayName?: string
    confirmedEmail?: string
    confirmedPhone?: string
  }
}>()

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

const showContent = ref(false)
const bootLoaderDone = ref(false)

// Анимация печатания текста
const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)

const intervalIds = {
  title: null as ReturnType<typeof setInterval> | null,
  desc: null as ReturnType<typeof setInterval> | null
}

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
  log.debug('Profile description animation started')
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
  setTimeout(() => typeTextSequence(), 200)
}

onMounted(() => {
  log.info('Component mounted', {
    projectTitle: props.projectTitle,
    isAuthenticated: props.isAuthenticated,
    isAdmin: props.isAdmin,
    indexUrl: props.indexUrl,
    profileUrl: props.profileUrl,
    loginUrl: props.loginUrl,
    adminUrl: props.adminUrl,
    user: {
      displayName: props.user.displayName,
      hasEmail: !!props.user.confirmedEmail,
      hasPhone: !!props.user.confirmedPhone
    }
  })

  browserRemoteLogger = createBrowserRemoteLogger({
    post: (payload) => postBrowserLogsRoute.run(ctx, payload)
  })
  browserRemoteLogger.installConsoleAndGlobalHandlers()
  setLogSink((entry: LogEntry) => {
    browserRemoteLogger!.pushSinkEntry(entry)
  })
  log.debug('Browser remote logger initialized')

  if (window.hideAppLoader) {
    window.hideAppLoader()
    log.debug('hideAppLoader called')
  }

  const bootReady = !!(window as Window & { bootLoaderComplete?: boolean }).bootLoaderComplete
  log.debug('Boot loader state on mount', { bootLoaderComplete: bootReady })
  if (bootReady) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
})

onBeforeUnmount(() => {
  log.info('onBeforeUnmount: flushing remote logger')
  if (browserRemoteLogger) {
    browserRemoteLogger.flush()
  }
})

onUnmounted(() => {
  log.info('Component unmounted')
  setLogSink(null)
  if (browserRemoteLogger) {
    browserRemoteLogger.teardown()
    browserRemoteLogger = null
  }
  window.removeEventListener('bootloader-complete', startAnimations)
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
              {{ displayedTitle
              }}<span
                v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')"
                class="typing-cursor"
                >▮</span
              >
            </h1>
            <p class="profile-description">
              {{ displayedDescription
              }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor"
                >▮</span
              >
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
        </section>
      </div>
    </main>

    <!-- Footer -->
    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>
