<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Header from '../shared/Header.vue'

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  analyticsUrl: string
  channelsUrl: string
  botsUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
}>()

const displayedTitle = ref('')
const showCursor = ref(true)
const showCards = ref(false)
const bootLoaderDone = ref(false)

onMounted(() => {
  // Принудительно устанавливаем тёмную тему
  document.documentElement.classList.add('dark')
  localStorage.setItem('theme', 'dark')

  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  // Ждём завершения bootloader
  const startAnimations = () => {
    bootLoaderDone.value = true
    setTimeout(() => {
      typeTitle()
    }, 100)
  }

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  const typeTitle = () => {
    const fullText = props.projectTitle
    let currentIndex = 0

    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        displayedTitle.value = fullText.substring(0, currentIndex + 1)
        currentIndex++
      } else {
        clearInterval(typeInterval)
        // Показываем карточки после завершения печати
        setTimeout(() => {
          showCards.value = true
        }, 400)
      }
    }, 40) // 40ms на символ
  }
})

const openChatiumLink = () => {
  window.open('https://t.me/ChatiumRuBot?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <Header
      v-if="bootLoaderDone"
      :pageTitle="'A/Ley Services'"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
    />

    <!-- Content -->
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Hero Section -->
        <section
          class="hero-section"
          :class="{ 'hero-ready': bootLoaderDone, 'hero-glow-visible': showCards }"
        >
          <div class="hero-icon-wrapper" :class="{ 'hero-icon-visible': showCards }">
            <i class="fas fa-chart-line hero-icon"></i>
          </div>
          <h1 class="hero-heading">
            {{ displayedTitle }}<span v-if="showCursor" class="typing-cursor">|</span>
          </h1>
          <p class="hero-help">
            <i class="fas fa-question-circle"></i>
            Как это работает
          </p>
          <p class="hero-description">Выберите раздел для управления</p>
        </section>

        <!-- Navigation Cards -->
        <section class="cards-section" :class="{ 'cards-visible': showCards }">
          <div class="cards-grid">
            <!-- Analytics Card -->
            <a :href="props.analyticsUrl" class="nav-card nav-card-analytics">
              <div class="nav-card-content">
                <div class="nav-card-icon nav-card-icon-analytics">
                  <i class="fas fa-chart-line"></i>
                </div>
                <h2 class="nav-card-title">Управлять аналитикой</h2>
                <p class="nav-card-description">
                  Просматривайте статистику переходов, анализируйте источники трафика и создавайте
                  отчёты
                </p>
                <div class="nav-card-arrow">
                  <i class="fas fa-arrow-right"></i>
                </div>
              </div>
            </a>

            <!-- Channels Card -->
            <a :href="props.channelsUrl" class="nav-card nav-card-channels">
              <div class="nav-card-content">
                <div class="nav-card-icon nav-card-icon-channels">
                  <i class="fas fa-broadcast-tower"></i>
                </div>
                <h2 class="nav-card-title">Управлять каналами</h2>
                <p class="nav-card-description">
                  Настройте отслеживание переходов для ваших Telegram-каналов и создавайте
                  отслеживаемые ссылки
                </p>
                <div class="nav-card-arrow">
                  <i class="fas fa-arrow-right"></i>
                </div>
              </div>
            </a>

            <!-- Bots Card -->
            <a :href="props.botsUrl" class="nav-card nav-card-bots">
              <div class="nav-card-content">
                <div class="nav-card-icon nav-card-icon-bots">
                  <i class="fas fa-robot"></i>
                </div>
                <h2 class="nav-card-title">Управлять ботами</h2>
                <p class="nav-card-description">
                  Настройте Telegram-ботов для автоматизации работы с аналитикой и уведомлениями
                </p>
                <div class="nav-card-arrow">
                  <i class="fas fa-arrow-right"></i>
                </div>
              </div>
            </a>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer v-if="bootLoaderDone" class="app-footer">
      <div class="footer-content">
        <div class="footer-left">ИП Худолей Андрей Германович</div>
        <div class="footer-center">Все права сохранены © 2025</div>
        <div class="footer-right">
          <button class="footer-link" @click="openChatiumLink">
            Сделано с <i class="fas fa-heart footer-heart"></i> на Chatium
          </button>
        </div>
      </div>
    </footer>
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

.dark {
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
  background: var(--color-bg);
  position: relative;
}

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;
  padding: 3rem 0;
  animation: content-fade-in 0.6s ease-out;
}

@keyframes content-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

/* Hero Section */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  padding: 2rem 0;
  position: relative;
  opacity: 0;
  transition: opacity 0.6s ease-out;
  z-index: 10;
}

.hero-section.hero-ready {
  opacity: 1;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(
    ellipse,
    rgba(211, 35, 75, 0.08) 0%,
    rgba(211, 35, 75, 0.04) 40%,
    rgba(211, 35, 75, 0.015) 60%,
    transparent 75%
  );
  border-radius: 50%;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.hero-section.hero-glow-visible::before {
  opacity: 0.6;
}

/* На ПК просто увеличиваем размер, интенсивность та же */
@media (min-width: 769px) {
  .hero-section::before {
    width: 450px;
    height: 450px;
  }
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
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
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

/* CRT scanlines эффект для hero иконки */
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

/* Усиленное свечение иконки на ПК */
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

.hero-icon-wrapper.hero-icon-visible {
  opacity: 1;
  transform: scale(1);
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
  color: var(--color-text);
  position: relative;
  z-index: 1;
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
}

.typing-cursor {
  display: inline-block;
  margin-left: 4px;
  animation: cursor-blink 1s step-end infinite;
  color: var(--color-accent);
  transition: opacity 0.3s ease;
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.hero-help {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-accent);
  font-weight: 400;
  margin: 0;
  letter-spacing: 0.05em;
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.3);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
}

.hero-help:hover {
  animation: glitch-text 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.hero-help::before,
.hero-help::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
}

.hero-help::before {
  color: #ff00ff;
  z-index: -1;
}

.hero-help::after {
  color: #00ffff;
  z-index: -2;
}

.hero-help:hover::before {
  animation: glitch-text-1 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.hero-help:hover::after {
  animation: glitch-text-2 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

@keyframes glitch-text {
  0%,
  100% {
    transform: translate(0);
    text-shadow: 0 0 8px rgba(211, 35, 75, 0.3);
  }
  10% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  20% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  30% {
    transform: translate(-1px, 0);
    text-shadow:
      1.5px 0 #ff00ff,
      -1.5px 0 #00ffff;
  }
  40% {
    transform: translate(1px, 0);
    text-shadow:
      -1.5px 0 #ff00ff,
      1.5px 0 #00ffff;
  }
  50% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  60% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  70% {
    transform: translate(-1px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  80% {
    transform: translate(1px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  90% {
    transform: translate(-0.5px, 0);
    text-shadow:
      0.5px 0 #ff00ff,
      -0.5px 0 #00ffff;
  }
}

@keyframes glitch-text-1 {
  0%,
  100% {
    opacity: 0;
    transform: translate(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    opacity: 0.9;
    transform: translate(-2px, 0);
  }
  20%,
  40%,
  60%,
  80% {
    opacity: 0;
    transform: translate(2px, 0);
  }
}

@keyframes glitch-text-2 {
  0%,
  100% {
    opacity: 0;
    transform: translate(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    opacity: 0.9;
    transform: translate(2px, 0);
  }
  20%,
  40%,
  60%,
  80% {
    opacity: 0;
    transform: translate(-2px, 0);
  }
}

.hero-help i {
  font-size: 1rem;
}

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

/* Cards Section */
.cards-section {
  width: 100%;
  position: relative;
  z-index: 10;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.nav-card {
  opacity: 0;
  transform: translateY(30px);
}

.cards-visible .nav-card {
  animation: card-appear 0.6s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
}

.cards-visible .nav-card:nth-child(1) {
  animation-delay: 0s;
}

.cards-visible .nav-card:nth-child(2) {
  animation-delay: 0.15s;
}

.cards-visible .nav-card:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes card-appear {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Navigation Cards */
.nav-card {
  display: block;
  text-decoration: none;
  color: inherit;
  height: 100%;
  transition: var(--transition);
  position: relative;
  perspective: 1000px;
}

.nav-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  border-radius: 0;
  padding: 2.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    filter 0.3s ease;
  position: relative;
  z-index: 1;
  box-shadow:
    0 0 0 0 rgba(0, 0, 0, 0),
    0 0 0 0 rgba(0, 0, 0, 0),
    inset 0 0 0 0 rgba(255, 255, 255, 0);
  overflow: hidden;
  transform-style: preserve-3d;
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

/* CRT scanlines эффект для карточек */
.nav-card-content::before {
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
  z-index: 10;
  opacity: 0.5;
  animation: scanline-move 8s linear infinite;
}

@keyframes scanline-move {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(4px);
  }
}

/* Эффект мерцания старого монитора */
.nav-card-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(211, 35, 75, 0.02) 0%,
    transparent 50%,
    rgba(211, 35, 75, 0.02) 100%
  );
  pointer-events: none;
  z-index: 9;
  animation: crt-flicker 3s ease-in-out infinite;
  opacity: 0;
}

@keyframes crt-flicker {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
}

.nav-card:hover .nav-card-content::after {
  animation:
    crt-flicker-intense 0.15s ease-in-out infinite,
    crt-flicker 3s ease-in-out infinite;
}

@keyframes crt-flicker-intense {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes corner-glow {
  0% {
    opacity: 0;
    transform: translate(0, 0);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translate(10px, -10px);
  }
}

.nav-card-analytics .nav-card-content,
.nav-card-channels .nav-card-content,
.nav-card-bots .nav-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
}

.nav-card:hover .nav-card-content {
  transform: translateY(-4px) rotateX(0.8deg) rotateY(-0.4deg);
  border-color: var(--color-border-light);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: card-glitch 4s ease-in-out infinite;
}

.nav-card-analytics:hover .nav-card-content,
.nav-card-channels:hover .nav-card-content,
.nav-card-bots:hover .nav-card-content {
  border-color: rgba(211, 35, 75, 0.5);
  box-shadow:
    0 8px 20px rgba(211, 35, 75, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 30px rgba(211, 35, 75, 0.1);
}

/* RGB-разделение и искривление для карточек при hover */
@keyframes card-glitch {
  0%,
  90%,
  100% {
    filter: none;
  }
  91% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.5));
  }
  92% {
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.5));
  }
  93% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.5));
  }
  94%,
  96%,
  98% {
    filter: none;
  }
  95% {
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.4));
  }
  97% {
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.4));
  }
}

.nav-card-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: var(--color-text);
  font-size: 1.25rem;
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  transition:
    transform 0.5s ease-out,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
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

/* CRT scanlines для навигационных иконок */
.nav-card-icon::before {
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

.nav-card-icon i {
  position: relative;
  z-index: 2;
}

.nav-card-icon::after {
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

.nav-card:hover .nav-card-icon::after {
  transform: scaleX(1);
}

/* Цветные иконки для карточек - красный акцент с разной интенсивностью */
.nav-card-icon-analytics {
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border-color: rgba(211, 35, 75, 0.4);
  color: var(--color-accent);
}

.nav-card-icon-channels {
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border-color: rgba(211, 35, 75, 0.35);
  color: var(--color-accent);
}

.nav-card-icon-bots {
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border-color: rgba(211, 35, 75, 0.3);
  color: var(--color-accent);
}

.nav-card:hover .nav-card-icon {
  border-color: var(--color-border-light);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

.nav-card-analytics:hover .nav-card-icon-analytics,
.nav-card-channels:hover .nav-card-icon-channels,
.nav-card-bots:hover .nav-card-icon-bots {
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.3) 0%, rgba(211, 35, 75, 0.2) 100%);
  border-color: var(--color-accent);
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 2px 6px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.nav-card-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  letter-spacing: 0.03em;
  position: relative;
  z-index: 1;
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.2);
}

.nav-card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex-grow: 1;
  margin: 0 0 1.5rem 0;
  position: relative;
  z-index: 1;
  letter-spacing: 0.02em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.nav-card-arrow {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--color-text-tertiary);
  font-size: 1rem;
  transition:
    transform 0.5s ease-out,
    color 0.25s ease;
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.nav-card:hover .nav-card-arrow {
  transform: translateX(4px);
  color: var(--color-accent);
}

/* Footer */
.app-footer {
  background: transparent;
  padding: 1.5rem 0;
  flex-shrink: 0;
  position: relative;
  z-index: 200;
}

/* Terminal-style corner brackets for footer */
.app-footer::before {
  content: '';
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.app-footer::after {
  content: '';
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.footer-content {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  position: relative;
}

.footer-left:hover,
.footer-center:hover {
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-footer {
  0%,
  100% {
    transform: translate(0);
    text-shadow: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  20% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  30% {
    transform: translate(-1px, 0);
    text-shadow:
      1.5px 0 #ff00ff,
      -1.5px 0 #00ffff;
  }
  40% {
    transform: translate(1px, 0);
    text-shadow:
      -1.5px 0 #ff00ff,
      1.5px 0 #00ffff;
  }
  50% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  60% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  70% {
    transform: translate(-1px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  80% {
    transform: translate(1px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  90% {
    transform: translate(-0.5px, 0);
    text-shadow:
      0.5px 0 #ff00ff,
      -0.5px 0 #00ffff;
  }
}

.footer-left {
  flex: 1;
  text-align: left;
  color: var(--color-text-secondary);
}

.footer-center {
  flex: 0 0 auto;
  text-align: center;
  color: var(--color-text-secondary);
}

.footer-right {
  flex: 1;
  text-align: right;
}

.footer-link {
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.25s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
  z-index: 10;
}

.footer-link:hover {
  color: var(--color-text);
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.footer-heart {
  color: #dd3057;
  font-size: 0.875rem;
}

/* Responsive Design */
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

  .hero-description {
    font-size: 0.9375rem;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .nav-card-content {
    padding: 2rem;
  }

  .nav-card-icon {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1.125rem;
    margin-bottom: 1.25rem;
  }

  .nav-card-title {
    font-size: 1rem;
  }

  .nav-card-description {
    font-size: 0.8125rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }

  .footer-left,
  .footer-center,
  .footer-right {
    text-align: center;
    flex: none;
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

  .hero-description {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .nav-card-content {
    padding: 1.75rem;
  }

  .footer-content {
    font-size: 0.75rem;
  }
}

/* Глобальные анимации глитча */
@keyframes glitch-skew {
  0%,
  100% {
    transform: translate(0) skew(0deg);
  }
  10% {
    transform: translate(-2px, 0) skew(-1deg);
  }
  20% {
    transform: translate(2px, 0) skew(1deg);
  }
  30% {
    transform: translate(-1px, 0) skew(0.5deg);
  }
  40% {
    transform: translate(1px, 0) skew(-0.5deg);
  }
  50% {
    transform: translate(-2px, 0) skew(1deg);
  }
  60% {
    transform: translate(2px, 0) skew(-1deg);
  }
  70% {
    transform: translate(-1px, 0) skew(0.5deg);
  }
  80% {
    transform: translate(1px, 0) skew(-0.5deg);
  }
  90% {
    transform: translate(-2px, 0) skew(0deg);
  }
}

@keyframes glitch-anim-1 {
  0%,
  100% {
    opacity: 0;
    transform: translate(0);
  }
  10% {
    opacity: 0.8;
    transform: translate(-2px, -2px);
  }
  20% {
    opacity: 0;
    transform: translate(2px, 2px);
  }
  30% {
    opacity: 0.8;
    transform: translate(-2px, -2px);
  }
  40% {
    opacity: 0;
    transform: translate(2px, 2px);
  }
  50% {
    opacity: 0.8;
    transform: translate(-2px, 0);
  }
  60% {
    opacity: 0;
    transform: translate(2px, 0);
  }
  70% {
    opacity: 0.8;
    transform: translate(0, -2px);
  }
  80% {
    opacity: 0;
    transform: translate(0, 2px);
  }
  90% {
    opacity: 0.8;
    transform: translate(-2px, 0);
  }
}

@keyframes glitch-anim-2 {
  0%,
  100% {
    opacity: 0;
    transform: translate(0);
  }
  10% {
    opacity: 0.8;
    transform: translate(2px, 2px);
  }
  20% {
    opacity: 0;
    transform: translate(-2px, -2px);
  }
  30% {
    opacity: 0.8;
    transform: translate(2px, 2px);
  }
  40% {
    opacity: 0;
    transform: translate(-2px, -2px);
  }
  50% {
    opacity: 0.8;
    transform: translate(2px, 0);
  }
  60% {
    opacity: 0;
    transform: translate(-2px, 0);
  }
  70% {
    opacity: 0.8;
    transform: translate(0, 2px);
  }
  80% {
    opacity: 0;
    transform: translate(0, -2px);
  }
  90% {
    opacity: 0.8;
    transform: translate(2px, 0);
  }
}

/* Глобальный эффект глитча для всей страницы */
.global-glitch-active {
  animation: global-page-glitch 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important;
}

@keyframes global-page-glitch {
  0%,
  100% {
    transform: translate(0) skew(0deg);
    filter: none;
  }
  10% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(90deg);
  }
  20% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(-90deg);
  }
  30% {
    transform: translate(-2px, 0) skew(-0.3deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.8))
      brightness(1.2);
  }
  40% {
    transform: translate(2px, 0) skew(0.3deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.8))
      contrast(1.3);
  }
  50% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      saturate(2);
  }
  60% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      invert(0.1);
  }
  70% {
    transform: translate(-2px, 0) skew(-0.2deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.6))
      brightness(1.1);
  }
  80% {
    transform: translate(2px, 0) skew(0.2deg);
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.6))
      contrast(1.2);
  }
  90% {
    transform: translate(-1px, 0) skew(0deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.5))
      brightness(1.05);
  }
}

.global-glitch-active * {
  pointer-events: none !important;
}
</style>
