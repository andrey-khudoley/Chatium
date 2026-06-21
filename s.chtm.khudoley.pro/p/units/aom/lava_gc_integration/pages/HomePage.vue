<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('HomePage')

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
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
  /** Ссылка на страницу «Текущие заказы» (только Admin) */
  ordersUrl?: string
}>()

const displayedTitle = ref('')
const showCursor = ref(false)
const bootLoaderDone = ref(false)
const cursorPosition = ref<'title' | 'final'>('title')
const showTitleUnderline = ref(false)
const isGlitching = ref(false)

let titleInterval: ReturnType<typeof setInterval> | null = null

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
  titleInterval = setInterval(() => {
    if (titleIndex < titleText.length) {
      displayedTitle.value = titleText.substring(0, titleIndex + 1)
      titleIndex++
    } else {
      if (titleInterval) clearInterval(titleInterval)
      titleInterval = null
      showTitleUnderline.value = true
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
  log.info('Component mounted')
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
})

onUnmounted(() => {
  log.info('Component unmounted')
  window.removeEventListener('bootloader-complete', startAnimations)
  if (titleInterval) clearInterval(titleInterval)
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
            }}<span v-if="showCursor && cursorPosition === 'title'" class="typing-cursor">▮</span>
          </h1>
          <div
            v-if="showCursor && cursorPosition === 'final'"
            class="hero-final-cursor"
            aria-hidden="true"
          >
            <span class="typing-cursor">▮</span>
          </div>
          <a
            v-if="props.isAdmin && props.ordersUrl"
            :href="props.ordersUrl"
            class="hero-orders-btn"
          >
            <span class="hero-orders-btn__scan" aria-hidden="true" />
            <i class="fas fa-receipt hero-orders-btn__icon" aria-hidden="true" />
            <span class="hero-orders-btn__label">Текущие заказы</span>
            <span class="hero-orders-btn__hint">heap · метрики · фильтры</span>
          </a>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" />
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
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
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
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
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
  0%,
  100% {
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

.hero-final-cursor {
  min-height: 1.25rem;
  margin: -0.5rem 0 0.25rem;
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
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.hero-orders-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding: 1rem 1.75rem 1.1rem;
  min-width: 220px;
  text-decoration: none;
  color: var(--color-text);
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%);
  border: 2px solid var(--color-border);
  clip-path: polygon(
    0 6px,
    6px 6px,
    6px 0,
    calc(100% - 6px) 0,
    calc(100% - 6px) 6px,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    6px calc(100% - 6px),
    0 calc(100% - 6px)
  );
  box-shadow:
    0 0 0 1px rgba(211, 35, 75, 0.15),
    inset 0 0 40px rgba(0, 0, 0, 0.5),
    0 8px 24px rgba(0, 0, 0, 0.45);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  z-index: 10;
}

.hero-orders-btn__scan {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.5;
}

.hero-orders-btn__icon {
  font-size: 1.25rem;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.4);
}

.hero-orders-btn__label {
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
}

.hero-orders-btn__hint {
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.hero-orders-btn:hover {
  border-color: var(--color-accent);
  box-shadow:
    0 0 20px rgba(211, 35, 75, 0.25),
    inset 0 0 0 1px rgba(211, 35, 75, 0.2),
    0 10px 28px rgba(0, 0, 0, 0.5);
  transform: translateY(-2px);
}

.hero-orders-btn:active {
  transform: translateY(0);
}

@media (min-width: 1201px) {
  .content-wrapper {
    padding: 1rem 0;
  }
  .content-inner {
    gap: 1.5rem;
  }
  .hero-section {
    gap: 0.75rem;
    padding: 0.5rem 0;
  }
}

@media (max-width: 768px) {
  .content-inner {
    padding: 0 1rem;
    gap: 3rem;
  }
  .content-wrapper {
    padding: 2rem 0;
  }
  .hero-section {
    gap: 1.25rem;
    padding: 1rem 0;
  }
  .hero-heading {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .content-inner {
    padding: 0 0.75rem;
    gap: 2.5rem;
  }
  .content-wrapper {
    padding: 1.5rem 0;
  }
  .hero-section {
    gap: 1rem;
  }
  .hero-heading {
    font-size: 1.75rem;
    letter-spacing: 0.08em;
  }
  .hero-orders-btn {
    min-width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
