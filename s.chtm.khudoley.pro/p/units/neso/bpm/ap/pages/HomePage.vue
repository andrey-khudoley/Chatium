<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'

const log = createComponentLogger('HomePage')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectName: string
  projectTitle: string
  projectDescription: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const bootLoaderDone = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)
const isGlitching = ref(false)

const intervalIds = {
  title: null as ReturnType<typeof setInterval> | null,
  desc: null as ReturnType<typeof setInterval> | null
}

const onAppLayoutAnimationEnd = (e: AnimationEvent) => {
  if (e.animationName === 'crt-power-on') {
    ;(e.target as HTMLElement).classList.add('app-layout-appeared')
    log.debug('App layout animation completed')
  }
}

const typeTextSequence = () => {
  log.debug('Typing title animation started')
  const titleText = props.projectName
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
  }, 30)
}

const typeDescription = () => {
  log.debug('Typing description animation started')
  const descriptionText = props.projectDescription
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
    }
  }, 30)
}

const startAnimations = () => {
  log.info('Boot loader complete, starting animations')
  bootLoaderDone.value = true
  showCursor.value = true
  cursorPosition.value = 'title'
  setTimeout(() => typeTextSequence(), 1000)
}

onMounted(() => {
  log.info('Component mounted', {
    projectName: props.projectName,
    projectTitle: props.projectTitle,
    isAuthenticated: props.isAuthenticated,
    isAdmin: props.isAdmin,
    indexUrl: props.indexUrl,
    profileUrl: props.profileUrl,
    loginUrl: props.loginUrl,
    adminUrl: props.adminUrl,
    testsUrl: props.testsUrl
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
  const bootReady = !!window.bootLoaderComplete
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

const triggerGlitch = () => {
  if (isGlitching.value) return
  log.notice('Global glitch effect triggered')
  isGlitching.value = true

  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')
    setTimeout(() => {
      appLayout.classList.remove('global-glitch-active')
      isGlitching.value = false
    }, 500)
  } else {
    log.warning('App layout element not found for glitch')
    isGlitching.value = false
  }
}

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  triggerGlitch()
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}
</script>

<template>
  <div
    class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col"
    @animationend="onAppLayoutAnimationEnd"
  >
    <GlobalGlitch />
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
        <!-- Hero Section -->
        <section class="hero-section" :class="{ 'hero-ready': bootLoaderDone }">
          <div
            class="hero-icon-wrapper"
            :class="{ 'hero-icon-visible': bootLoaderDone }"
            @click="triggerGlitch"
          >
            <i class="fas fa-tasks hero-icon"></i>
          </div>
          <h1 class="hero-heading" :class="{ 'show-underline': showTitleUnderline }">
            {{ displayedTitle
            }}<span
              v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')"
              class="typing-cursor"
              >▮</span
            >
          </h1>
          <p class="hero-description">
            {{ displayedDescription
            }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor"
              >▮</span
            >
          </p>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<style>
/* Глобальное правило: скрываем курсор на главной странице при hover на хедер */
.app-layout:has(.header-title-section:hover) .typing-cursor {
  opacity: 0 !important;
}
</style>
