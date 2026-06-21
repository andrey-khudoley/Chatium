<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Header from '../shared/Header.vue'
import GlobalGlitch from '../shared/GlobalGlitch.vue'

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

const showContent = ref(false)
const bootLoaderDone = ref(false)

// Анимация печатания текста
const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)

onMounted(() => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  // Ждём завершения bootloader
  const startAnimations = () => {
    bootLoaderDone.value = true

    // 1. Короткая задержка перед началом печати
    showCursor.value = true
    cursorPosition.value = 'title'

    setTimeout(() => {
      // 2. Начинаем последовательный набор текста
      typeTextSequence()
    }, 200)
  }

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  const typeTextSequence = () => {
    const titleText = 'Профиль пользователя'
    cursorPosition.value = 'title'

    // Набираем заголовок
    let titleIndex = 0
    const titleInterval = setInterval(() => {
      if (titleIndex < titleText.length) {
        displayedTitle.value = titleText.substring(0, titleIndex + 1)
        titleIndex++
      } else {
        clearInterval(titleInterval)
        // После завершения набора заголовка показываем разделительную черту
        showTitleUnderline.value = true
        // Затем набираем описание
        typeDescription()
      }
    }, 15)
  }

  const typeDescription = () => {
    const descriptionText = 'Информация о вашем аккаунте'
    cursorPosition.value = 'description'
    let descIndex = 0
    const descInterval = setInterval(() => {
      if (descIndex < descriptionText.length) {
        displayedDescription.value = descriptionText.substring(0, descIndex + 1)
        descIndex++
      } else {
        clearInterval(descInterval)
        // После завершения набора всех элементов показываем контент
        cursorPosition.value = 'final'
        showContent.value = true
      }
    }, 15)
  }
})

const openChatiumLink = () => {
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
      pageName="Профиль"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
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
    <footer v-if="bootLoaderDone" class="app-footer">
      <div class="footer-content">
        <div class="footer-left">ИП Худолей Андрей Германович</div>
        <div class="footer-center">Все права сохранены © 2026</div>
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
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
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
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
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
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
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
  font-size: 0.9rem;
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

@media (max-width: 768px) {
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
  .footer-content {
    font-size: 0.75rem;
  }
}
</style>
