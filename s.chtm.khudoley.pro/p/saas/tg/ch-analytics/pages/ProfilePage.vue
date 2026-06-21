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
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
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

    // 1. Сначала 1 секунда мигает курсор без текста
    showCursor.value = true
    cursorPosition.value = 'title'

    setTimeout(() => {
      // 2. Начинаем последовательный набор текста
      typeTextSequence()
    }, 1000)
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
    }, 30)
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
    }, 30)
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
  max-width: 800px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Profile Section */
.profile-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
}

.profile-section.content-visible {
  opacity: 1;
  transform: translateY(0);
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  position: relative;
}

.profile-header::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(211, 35, 75, 0.05) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
  animation: profile-glow 4s ease-in-out infinite;
}

@keyframes profile-glow {
  0%,
  100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.profile-icon-wrapper {
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
    inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  margin-bottom: 0.5rem;
  transition: transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
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

/* CRT scanlines эффект */
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

.profile-icon-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.8) 20%,
    rgba(255, 255, 255, 1) 50%,
    rgba(255, 255, 255, 0.8) 80%,
    transparent 100%
  );
  box-shadow:
    0 0 8px rgba(255, 255, 255, 0.8),
    0 0 16px rgba(255, 255, 255, 0.4);
  animation: fingerprint-scan 3s ease-in-out 0.5s infinite;
  transform: translateY(-3px);
  opacity: 0;
}

@keyframes fingerprint-scan {
  0% {
    transform: translateY(-3px);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(calc(5rem + 3px));
    opacity: 1;
  }
  60% {
    opacity: 0;
  }
  100% {
    transform: translateY(calc(5rem + 3px));
    opacity: 0;
  }
}

.profile-icon-wrapper:hover {
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
}

.profile-icon {
  font-size: 2.5rem;
  color: white;
  position: relative;
  z-index: 3;
}

.profile-heading {
  font-size: 2rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.08em;
  margin: 0;
  color: var(--color-text);
  position: relative;
  z-index: 1;
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.3);
}

.profile-heading::after {
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

.profile-heading.show-underline::after {
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
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.profile-description {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

/* Profile Card */
.profile-card {
  width: 100%;
  position: relative;
  perspective: 1000px;
}

.profile-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  border-radius: 0;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  transition:
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  position: relative;
  z-index: 1;
  box-shadow:
    0 0 0 0 rgba(0, 0, 0, 0),
    0 0 0 0 rgba(0, 0, 0, 0),
    inset 0 0 0 0 rgba(255, 255, 255, 0);
  overflow: hidden;
  transform-style: preserve-3d;
}

.profile-card-content::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, transparent 40%, rgba(211, 35, 75, 0.03) 50%, transparent 60%);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  animation: corner-glow 3s ease-out infinite;
}

@keyframes corner-glow {
  0%,
  100% {
    opacity: 0;
    transform: translate(0, 0);
  }
  50% {
    opacity: 1;
    transform: translate(10px, -10px);
  }
}

/* Profile Fields */
.profile-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.profile-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.profile-field-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile-field-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border: 2px solid rgba(211, 35, 75, 0.4);
  color: var(--color-accent);
  font-size: 0.875rem;
  transition: var(--transition);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
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

/* CRT scanlines для маленьких иконок */
.profile-field-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.profile-field-icon i {
  position: relative;
  z-index: 2;
}

.profile-field:hover .profile-field-icon {
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.3) 0%, rgba(211, 35, 75, 0.2) 100%);
  border-color: var(--color-accent);
  box-shadow:
    0 4px 8px rgba(211, 35, 75, 0.3),
    0 2px 4px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.profile-field-label {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.profile-field-value {
  font-size: 1.125rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
  padding-left: 2.75rem;
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.2);
  position: relative;
  transition: var(--transition);
}

.profile-field:hover .profile-field-value {
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.3);
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
    gap: 1.5rem;
  }

  .content-wrapper {
    padding: 2rem 0;
  }

  .profile-heading {
    font-size: 1.75rem;
  }

  .profile-card-content {
    padding: 2rem;
  }

  .profile-field-value {
    font-size: 1rem;
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
  }

  .content-wrapper {
    padding: 1.5rem 0;
  }

  .profile-heading {
    font-size: 1.5rem;
  }

  .profile-card-content {
    padding: 1.5rem;
  }

  .profile-field {
    gap: 0.5rem;
    padding-bottom: 1rem;
  }

  .profile-field-value {
    font-size: 0.9375rem;
    padding-left: 2.75rem;
  }

  .footer-content {
    font-size: 0.75rem;
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
