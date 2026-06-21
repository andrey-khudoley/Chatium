<script setup lang="ts">
import { onMounted, onUnmounted, ref, withDefaults } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { subscribeBootStaticReady, scheduleHideBootLoader } from '../shared/bootUi'
import { createComponentLogger } from '../shared/logger'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../shared/user-settings-defaults'

const log = createComponentLogger('HomePage')

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
  }
}

const props = withDefaults(
  defineProps<{
    projectName: string
    projectTitle: string
    projectDescription: string
    indexUrl: string
    journalUrl: string
    tasksUrl: string
    toolsUrl: string
    profileUrl: string
    loginUrl: string
    isAuthenticated: boolean
    isAdmin?: boolean
    adminUrl?: string
    testsUrl?: string
    toolsStateUrl: string
    toolsControlUrl: string
    encodedFocusToolsSocketId: string
    timezoneOffsetHours?: number
  }>(),
  { timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
)

const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const bootLoaderDone = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)
const isGlitching = ref(false)

const intervalIds = { title: null as ReturnType<typeof setInterval> | null, desc: null as ReturnType<typeof setInterval> | null }

const onAppLayoutAnimationEnd = (e: AnimationEvent) => {
  if (e.animationName === 'crt-power-on') {
    (e.target as HTMLElement).classList.add('app-layout-appeared')
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
  scheduleHideBootLoader()
  setTimeout(() => typeTextSequence(), 1000)
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
      :timezoneOffsetHours="props.timezoneOffsetHours"
      :enableToolClockWidget="true"
      :toolsStateUrl="props.toolsStateUrl"
      :toolsControlUrl="props.toolsControlUrl"
      :encodedFocusToolsSocketId="props.encodedFocusToolsSocketId"
    />
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <section class="hero-section" :class="{ 'hero-ready': bootLoaderDone }">
          <div class="hero-icon-wrapper" :class="{ 'hero-icon-visible': bootLoaderDone }" @click="triggerGlitch">
            <i class="fas fa-tasks hero-icon"></i>
          </div>
          <h1 class="hero-heading" :class="{ 'show-underline': showTitleUnderline }">
            {{ displayedTitle }}<span v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')" class="typing-cursor">▮</span>
          </h1>
          <p class="hero-description">
            {{ displayedDescription }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor">▮</span>
          </p>
        </section>

        <section v-if="bootLoaderDone" class="home-cards-section" aria-label="Быстрые разделы">
          <a :href="props.journalUrl" class="home-card home-card-link">
            <i class="fas fa-book home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Мой журнал</span>
          </a>
          <a :href="props.tasksUrl" class="home-card home-card-link">
            <i class="fas fa-list-check home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Мои задачи</span>
          </a>
          <button type="button" class="home-card home-card-action" @click="triggerGlitch">
            <i class="fas fa-comments home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Диалоги</span>
          </button>
          <a :href="props.toolsUrl" class="home-card home-card-link">
            <i class="fas fa-screwdriver-wrench home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Инструменты</span>
          </a>
          <button type="button" class="home-card home-card-action" @click="triggerGlitch">
            <i class="fas fa-layer-group home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">PARA</span>
          </button>
          <button type="button" class="home-card home-card-action" @click="triggerGlitch">
            <i class="fas fa-wallet home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Финансы</span>
          </button>
          <button type="button" class="home-card home-card-action" @click="triggerGlitch">
            <i class="fas fa-network-wired home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Сервисы</span>
          </button>
          <button type="button" class="home-card home-card-action" @click="triggerGlitch">
            <i class="fas fa-book-open-reader home-card-icon" aria-hidden="true"></i>
            <span class="home-card-label">Библиотека</span>
          </button>
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
  --color-accent-light: rgba(211, 35, 75, 0.1);
  --color-accent-medium: rgba(211, 35, 75, 0.2);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  background: var(--color-bg);
  letter-spacing: 0.03em;
}

::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.hidden-for-modal {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
}

.content-hidden {
  transition: opacity 0.3s ease;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;
  padding: 3rem 0;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
  position: relative;
  z-index: 10;
}

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  padding: 2rem 0;
  position: relative;
  z-index: 10;
}

.hero-section::before {
  display: none;
}

.hero-icon-wrapper {
  width: 5rem;
  height: 5rem;
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
  margin-bottom: 0.5rem;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
}

.hero-icon-wrapper::before {
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
  z-index: 2;
  animation: scanline-flicker 8s linear infinite;
}

@keyframes scanline-flicker {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.5; }
}

@media (min-width: 769px) {
  .hero-icon-wrapper {
    box-shadow:
      0 10px 28px rgba(211, 35, 75, 0.45),
      0 5px 14px rgba(211, 35, 75, 0.35),
      0 0 40px rgba(211, 35, 75, 0.25);
  }
}

.hero-icon-wrapper.hero-icon-visible:hover {
  animation: glitch-icon 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-icon {
  0%, 100% {
    transform: scale(1) translate(0);
    filter: none;
    box-shadow:
      0 8px 24px rgba(211, 35, 75, 0.4),
      0 4px 12px rgba(211, 35, 75, 0.3);
  }
  10% {
    transform: scale(1) translate(-1.5px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  20% {
    transform: scale(1) translate(1.5px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  30% {
    transform: scale(1) translate(-1px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  40% {
    transform: scale(1) translate(1px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  50% {
    transform: scale(1) translate(-1.5px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  60% {
    transform: scale(1) translate(1.5px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  70% {
    transform: scale(1) translate(-1px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  80% {
    transform: scale(1) translate(1px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  90% {
    transform: scale(1) translate(-0.5px, 0);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
}

.hero-icon {
  font-size: 2rem;
  color: white;
  position: relative;
  z-index: 3;
}

.hero-heading {
  font-size: 2.5rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.08em;
  margin: 0;
  margin-bottom: 0.5rem;
  min-height: 3rem;
  color: var(--color-text);
  position: relative;
  z-index: 10;
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.3);
}

.hero-heading::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hero-heading.show-underline::after {
  opacity: 1;
}

.typing-cursor {
  display: inline-block;
  margin-left: 0.25rem;
  animation: terminal-cursor-blink 1s step-end infinite;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.5);
  font-size: 1em;
  line-height: 1;
  vertical-align: baseline;
}

@keyframes terminal-cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  margin-bottom: 2rem;
  min-height: 1.6rem;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

.home-cards-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 0 0.5rem;
}

.home-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  text-align: center;
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
  transition: var(--transition);
}

.home-card-link:hover,
.home-card-action:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(211, 35, 75, 0.25);
}

.home-card-icon {
  font-size: 1.75rem;
  color: var(--color-accent);
}

.home-card-label {
  font-size: 1.06rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (min-width: 1201px) {
  .content-wrapper { padding: 1rem 0; }
  .content-inner { gap: 1.5rem; }
  .hero-section { gap: 0.75rem; padding: 0.5rem 0; }
  .hero-description { margin-bottom: 0.25rem; }
}

@media (max-width: 768px) {
  .content-inner { padding: 0 1rem; gap: 3rem; }
  .content-wrapper { padding: 2rem 0; }
  .hero-section { gap: 1.25rem; padding: 1rem 0; }
  .hero-heading { font-size: 2rem; }
  .hero-description { font-size: 0.9375rem; }
  .home-cards-section {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: 32rem;
  }
}

@media (max-width: 480px) {
  .content-inner { padding: 0 0.75rem; gap: 2.5rem; }
  .content-wrapper { padding: 1.5rem 0; }
  .hero-section { gap: 1rem; }
  .hero-heading { font-size: 1.75rem; letter-spacing: 0.08em; min-height: 2.5rem; }
  .hero-description { font-size: 1rem; line-height: 1.5; }
  .hero-icon-wrapper { width: 4.25rem; height: 4.25rem; }
  .hero-icon { font-size: 1.65rem; }
  .home-card {
    min-height: 3.5rem;
    padding: 1.25rem 0.85rem;
  }
  .home-cards-section {
    grid-template-columns: 1fr;
    max-width: 22rem;
  }
}
</style>
