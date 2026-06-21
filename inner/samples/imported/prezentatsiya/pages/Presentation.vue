<template>
  <div class="deck" @keydown="onKey" tabindex="0" ref="deckEl">
    <div class="ambient-glow"></div>

    <div class="slide-viewport">
      <component :is="currentComponent" :key="current" :active="true" />
    </div>

    <div class="deck-controls">
      <div class="controls-left">
        <span class="slide-counter">
          <span class="counter-current">{{ String(current + 1).padStart(2, '0') }}</span>
          <span class="counter-sep">/</span>
          <span class="counter-total">{{ String(slides.length).padStart(2, '0') }}</span>
        </span>
      </div>

      <div class="controls-center">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          <div
            v-for="(s, i) in slides"
            :key="i"
            class="progress-dot"
            :class="{ active: i === current, passed: i < current }"
            :style="{ left: (i / (slides.length - 1)) * 100 + '%' }"
            @click="goTo(i)"
            :title="s.label"
          ></div>
        </div>
      </div>

      <div class="controls-right">
        <button class="nav-btn" @click="prev" :disabled="current === 0">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="nav-btn" @click="next" :disabled="current === slides.length - 1">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SlideIntro from '../slides/SlideIntro.vue'
import SlideWhatIs from '../slides/SlideWhatIs.vue'
import SlideScale from '../slides/SlideScale.vue'
import SlidePriceCase from '../slides/SlidePriceCase.vue'
import SlidePrinter from '../slides/SlidePrinter.vue'
import SlideDemo from '../slides/SlideDemo.vue'
import SlideInfraIntro from '../slides/SlideInfraIntro.vue'
import SlideChatiumBody from '../slides/SlideChatiumBody.vue'
import SlideModContacts from '../slides/SlideModContacts.vue'
import SlideModSender from '../slides/SlideModSender.vue'
import SlideModAutomations from '../slides/SlideModAutomations.vue'
import SlideModPay from '../slides/SlideModPay.vue'
import SlideModHeapTables from '../slides/SlideModHeapTables.vue'
import SlideModAuth from '../slides/SlideModAuth.vue'
import SlideModAgents from '../slides/SlideModAgents.vue'
import SlideModStart from '../slides/SlideModStart.vue'
import SlideModKinescope from '../slides/SlideModKinescope.vue'
import SlideModStorage from '../slides/SlideModStorage.vue'
import SlideModSocket from '../slides/SlideModSocket.vue'
import SlideModJobs from '../slides/SlideModJobs.vue'
import SlideModTraffic from '../slides/SlideModTraffic.vue'
import SlideModApp from '../slides/SlideModApp.vue'
import SlideModI18n from '../slides/SlideModI18n.vue'
import SlideModPlugins from '../slides/SlideModPlugins.vue'
import SlideModDomains from '../slides/SlideModDomains.vue'
import SlideModVersioning from '../slides/SlideModVersioning.vue'
import SlideTeam from '../slides/SlideTeam.vue'
import SlideReplace from '../slides/SlideReplace.vue'
import SlideSellPrice from '../slides/SlideSellPrice.vue'
import SlideSellAvito from '../slides/SlideSellAvito.vue'
import SlideSellBonus500 from '../slides/SlideSellBonus500.vue'
import SlideSellCommunity from '../slides/SlideSellCommunity.vue'
import SlideBonusRadonets from '../slides/SlideBonusRadonets.vue'
import SlideBonusFanclub from '../slides/SlideBonusFanclub.vue'
import SlideBonusWebinar from '../slides/SlideBonusWebinar.vue'
import SlideSellCTA from '../slides/SlideSellCTA.vue'

const slides = [
  { component: SlideIntro, label: 'Старт' },
  { component: SlideWhatIs, label: 'Что такое Chatium' },
  { component: SlideScale, label: '1000 сотрудников' },
  { component: SlidePriceCase, label: 'Кейс Авито ×25' },
  { component: SlidePrinter, label: 'Печатай под себя' },
  { component: SlideDemo, label: 'Демо — чат → результат' },
  { component: SlideInfraIntro, label: 'Инфраструктура' },
  { component: SlideChatiumBody, label: 'Chatium = мозг + тело' },
  // Клиенты и коммуникации
  { component: SlideModContacts, label: '@contacts — Контакты' },
  { component: SlideModSender, label: '@sender — Рассылки' },
  { component: SlideModAutomations, label: '@automations — Воронки' },
  // Деньги и продажи
  { component: SlideModPay, label: '@pay — Платежи' },
  { component: SlideModHeapTables, label: 'Heap Tables — БД' },
  { component: SlideModAuth, label: '@auth — Авторизация' },
  // ИИ и контент
  { component: SlideModKinescope, label: '@kinescope — Видео' },
  // Под капотом
  { component: SlideModStorage, label: '@storage — Файлы' },
  { component: SlideModSocket, label: '@socket — Realtime' },
  { component: SlideModJobs, label: '@jobs — Задачи' },
  // Аналитика и рост
  { component: SlideModTraffic, label: '@traffic — Аналитика' },
  { component: SlideModApp, label: 'APP — Все платформы' },
  { component: SlideModI18n, label: '@i18n — Языки' },
  // Платформа
  { component: SlideModPlugins, label: 'Плагины и шаблоны' },
  { component: SlideModDomains, label: 'Мультидоменность' },
  { component: SlideModVersioning, label: 'Версии и бекапы' },
  // Основные блоки
  { component: SlideTeam, label: 'Команда' },
  { component: SlideModStart, label: '@start — AI-генерация' },
  { component: SlideModAgents, label: '@ai-agents — Агенты' },
  { component: SlideReplace, label: 'Замена сотрудников' },
  { component: SlideSellPrice, label: 'Цена — 3000 ₽' },
  { component: SlideSellAvito, label: 'Кейс Авито — 40к vs 800к' },
  { component: SlideSellBonus500, label: '500 ₽ в подарок' },
  { component: SlideSellCommunity, label: 'Закрытый чат + комьюнити' },
  { component: SlideBonusRadonets, label: 'Бонус: Курс Радонца' },
  { component: SlideBonusFanclub, label: 'Бонус: Фан-клуб' },
  { component: SlideBonusWebinar, label: 'Бонус: Вебинарная платформа' },
  { component: SlideSellCTA, label: 'Оформить подписку' }
]

const current = ref(0)
const direction = ref(1)
const deckEl = ref(null)

const currentComponent = computed(() => slides[current.value].component)
const progressPercent = computed(() => (current.value / (slides.length - 1)) * 100)

function next() {
  if (current.value < slides.length - 1) {
    direction.value = 1
    current.value++
  }
}

function prev() {
  if (current.value > 0) {
    direction.value = -1
    current.value--
  }
}

function goTo(i) {
  if (i === current.value) return
  direction.value = i > current.value ? 1 : -1
  current.value = i
}

function onKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    prev()
  } else if (e.key === 'Home') {
    e.preventDefault()
    goTo(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    goTo(slides.length - 1)
  }
}

let touchStartX = 0
let touchStartY = 0

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    if (dx < 0) next()
    else prev()
  }
}

onMounted(() => {
  deckEl.value?.focus()
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<style scoped>
.deck {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  outline: none;
  background: var(--bg-void);
}

.ambient-glow {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
      ellipse 80% 50% at 50% -20%,
      rgba(99, 102, 241, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba(6, 182, 212, 0.05) 0%, transparent 40%);
  animation: ambient-pulse 8s ease-in-out infinite;
}

@keyframes ambient-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.slide-viewport {
  position: absolute;
  inset: 0;
  bottom: 56px;
}

.deck-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: rgba(2, 2, 8, 0.9);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
  z-index: 50;
  gap: 20px;
}

.controls-left {
  flex-shrink: 0;
}

.slide-counter {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 1px;
}
.counter-current {
  color: var(--text-primary);
  font-weight: 700;
}
.counter-sep {
  margin: 0 4px;
  opacity: 0.5;
}

.controls-center {
  flex: 1;
  padding: 0 16px;
}

.progress-track {
  position: relative;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
}
.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--gradient-hero);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}
.progress-dot {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 2;
}
.progress-dot:hover {
  border-color: var(--accent-indigo);
  transform: translate(-50%, -50%) scale(1.4);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
}
.progress-dot.passed {
  background: var(--accent-indigo);
  border-color: var(--accent-indigo);
}
.progress-dot.active {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
  transform: translate(-50%, -50%) scale(1.5);
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.6);
  animation: pulse-dot 2s ease infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.8);
  }
}

.controls-right {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}
.nav-btn:hover:not(:disabled) {
  border-color: var(--accent-indigo);
  color: var(--text-primary);
  background: rgba(99, 102, 241, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2);
}
.nav-btn:disabled {
  opacity: 0.2;
  cursor: default;
}

@media (max-width: 768px) {
  .deck-controls {
    padding: 0 12px;
    height: 48px;
    gap: 12px;
  }
  .slide-viewport {
    bottom: 48px;
  }
  .nav-btn {
    width: 36px;
    height: 36px;
  }
  .progress-dot {
    width: 6px;
    height: 6px;
  }
  .slide-counter {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .deck-controls {
    padding: 0 10px;
    height: 44px;
    gap: 8px;
  }
  .slide-viewport {
    bottom: 44px;
  }
  .controls-center {
    padding: 0 8px;
  }
  .progress-dot {
    width: 5px;
    height: 5px;
  }
  .progress-dot.active {
    transform: translate(-50%, -50%) scale(1.3);
  }
  .nav-btn {
    width: 34px;
    height: 34px;
    font-size: 12px;
    border-radius: 8px;
  }
  .slide-counter {
    font-size: 11px;
  }
  .counter-sep {
    margin: 0 2px;
  }
}
</style>
