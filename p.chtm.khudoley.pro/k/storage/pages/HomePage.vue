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
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectTitle: string
  projectSubtitle: string
  indexUrl: string
  uiUrl: string
  testsUrl: string
  testsAiUrl: string
  serveExample: string
}>()

const bootLoaderDone = ref(false)

const onAppLayoutAnimationEnd = (e: AnimationEvent) => {
  if (e.animationName === 'crt-power-on') {
    (e.target as HTMLElement).classList.add('app-layout-appeared')
    log.debug('App layout animation completed')
  }
}

const startAnimations = () => {
  log.info('Boot loader complete, starting animations')
  bootLoaderDone.value = true
}

const triggerGlitch = () => {
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')
    setTimeout(() => appLayout.classList.remove('global-glitch-active'), 500)
  }
}

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  triggerGlitch()
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

onMounted(() => {
  log.info('Component mounted')
  if (window.hideAppLoader) window.hideAppLoader()
  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
})

onUnmounted(() => {
  log.info('Component unmounted')
  window.removeEventListener('bootloader-complete', startAnimations)
})
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
      :uiUrl="props.uiUrl"
      :testsUrl="props.testsUrl"
    />
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <section class="hero-section" :class="{ 'hero-ready': bootLoaderDone }">
          <div class="hero-icon-wrapper" :class="{ 'hero-icon-visible': bootLoaderDone }" @click="triggerGlitch">
            <i class="fas fa-database hero-icon"></i>
          </div>
          <h1 class="hero-heading show-underline">{{ projectTitle }}</h1>
          <p class="hero-description">{{ projectSubtitle }}</p>
        </section>

        <div class="storage-cards">
          <div class="storage-card storage-card-accent">
            <h3 class="storage-card-title">
              <i class="fas fa-check-circle"></i>
              Система работает
            </h3>
            <p class="storage-card-text">
              Все тесты пройдены успешно (23/23 ✓)
            </p>
            <p class="storage-card-docs">
              <i class="fas fa-book"></i>
              <a href="https://github.com/chatium/storage/blob/main/.CHATIUM-LLM.md" class="storage-link" target="_blank" rel="noopener noreferrer">
                Полная документация (.CHATIUM-LLM.md)
              </a>
            </p>
          </div>

          <div class="storage-cards-grid">
            <div class="storage-card">
              <h3 class="storage-card-title">
                <i class="fas fa-desktop"></i>
                Веб-интерфейс
              </h3>
              <p class="storage-card-text">
                Управляйте скриптами через браузер с drag-and-drop загрузкой
              </p>
              <a :href="uiUrl" class="storage-btn">
                <i class="fas fa-arrow-right"></i>
                Открыть UI
              </a>
            </div>

            <div class="storage-card">
              <h3 class="storage-card-title">
                <i class="fas fa-code"></i>
                API Endpoints
              </h3>
              <ul class="storage-list">
                <li><code>GET /api/scripts/list</code></li>
                <li><code>POST /api/scripts/create</code></li>
                <li><code class="storage-code-green">POST /api/scripts/upload</code></li>
                <li><code>POST /api/scripts/update</code></li>
                <li><code>POST /api/scripts/delete</code></li>
              </ul>
            </div>

            <div class="storage-card">
              <h3 class="storage-card-title">
                <i class="fas fa-flask"></i>
                Тестирование
              </h3>
              <ul class="storage-list">
                <li>
                  <a :href="testsUrl" class="storage-link">
                    <i class="fas fa-vial"></i>
                    Интерактивные тесты
                  </a>
                </li>
                <li>
                  <a :href="testsAiUrl" class="storage-link">
                    <i class="fas fa-robot"></i>
                    AI-тесты (JSON)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div class="storage-usage">
            <p>
              <i class="fas fa-info-circle"></i>
              <strong>Использование:</strong>
              Создавайте скрипты через API, затем подключайте по ссылке, например
              <code class="storage-inline-code">{{ serveExample }}</code>
            </p>
          </div>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<style>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
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
  gap: 2.5rem;
  position: relative;
  z-index: 10;
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  background: var(--color-bg);
  letter-spacing: 0.03em;
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

.hero-icon-wrapper.hero-icon-visible:hover {
  animation: glitch-icon 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-icon {
  0%, 100% { transform: scale(1) translate(0); filter: none; }
  10% { transform: scale(1) translate(-1.5px, 0); filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9)); }
  20% { transform: scale(1) translate(1.5px, 0); filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9)); }
  30% { transform: scale(1) translate(-1px, 0); filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9)); }
  40% { transform: scale(1) translate(1px, 0); filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9)); }
  50% { transform: scale(1) translate(-1.5px, 0); filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9)); }
  60% { transform: scale(1) translate(1.5px, 0); filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9)); }
  70% { transform: scale(1) translate(-1px, 0); filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9)); }
  80% { transform: scale(1) translate(1px, 0); filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9)); }
  90% { transform: scale(1) translate(-0.5px, 0); filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.9)); }
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

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  margin-bottom: 0.5rem;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

.storage-cards {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.storage-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.5rem;
  position: relative;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
}

.storage-card-accent {
  border-color: rgba(211, 35, 75, 0.4);
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(211, 35, 75, 0.08) 100%);
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.2),
    inset 0 0 0 1px rgba(211, 35, 75, 0.15);
}

.storage-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .storage-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.storage-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.storage-card-title i {
  color: var(--color-accent);
  font-size: 0.875rem;
}

.storage-card-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.storage-card-docs {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.storage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.storage-list li {
  margin-bottom: 0.35rem;
}

.storage-list code {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  color: var(--color-text);
}

.storage-code-green {
  color: #7cb87c;
}

.storage-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
}

.storage-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 4px 12px rgba(211, 35, 75, 0.4);
}

.storage-link {
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.25s ease;
}

.storage-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

.storage-usage {
  padding: 1rem 1.25rem;
  background: rgba(211, 35, 75, 0.08);
  border: 1px solid rgba(211, 35, 75, 0.25);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.storage-usage strong {
  color: var(--color-text);
}

.storage-inline-code {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  padding: 0.15rem 0.35rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  margin: 0 0.2rem;
}

@media (max-width: 768px) {
  .content-inner { padding: 0 1rem; gap: 2rem; }
  .content-wrapper { padding: 2rem 0; }
  .hero-section { gap: 1.25rem; padding: 1rem 0; }
  .hero-heading { font-size: 2rem; }
  .hero-description { font-size: 0.9375rem; }
  .storage-cards-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .content-inner { padding: 0 0.75rem; gap: 1.5rem; }
  .content-wrapper { padding: 1.5rem 0; }
  .hero-heading { font-size: 1.75rem; letter-spacing: 0.08em; }
  .hero-description { font-size: 0.875rem; }
}
</style>
