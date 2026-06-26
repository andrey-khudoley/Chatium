<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

interface Segment {
  icon: string
  line1: string
  line2: string
  textColor: string
  isRetry: boolean
  full: string
}

const SEGMENTS: Segment[] = [
  {
    icon: '✦',
    line1: 'Курс',
    line2: 'по лицу',
    textColor: '#1d1607',
    isRetry: false,
    full: 'Курс «Косметолог-эстетист по лицу»'
  },
  {
    icon: '✦',
    line1: 'Курс',
    line2: 'по телу',
    textColor: '#e8cd86',
    isRetry: false,
    full: 'Курс «Косметолог-эстетист по телу»'
  },
  {
    icon: '₽',
    line1: '500',
    line2: 'бонусов',
    textColor: '#1d1607',
    isRetry: false,
    full: '500 бонусных рублей'
  },
  {
    icon: '₽',
    line1: '1000',
    line2: 'бонусов',
    textColor: '#e8cd86',
    isRetry: false,
    full: '1000 бонусных рублей'
  },
  {
    icon: '₽',
    line1: '2000',
    line2: 'бонусов',
    textColor: '#1d1607',
    isRetry: false,
    full: '2000 бонусных рублей'
  },
  {
    icon: '↻',
    line1: 'Ещё',
    line2: 'попытка',
    textColor: '#e8cd86',
    isRetry: true,
    full: 'Ещё одна попытка'
  }
]

const CONFETTI_COLORS = ['#f3dd9b', '#d9b65f', '#b8923f', '#fff4d6', '#e8c87f']

const DIVIDERS = [0, 1, 2, 3, 4, 5].map((i) => i * 60 + 30)

const wheelEl = ref<HTMLDivElement | null>(null)
const isSpinning = ref(false)
const showResult = ref(false)
const showToast = ref(false)
const selectedIndex = ref(0)

let currentRotation = 0
let spinInterval: ReturnType<typeof setInterval> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null
let confettiTimers: ReturnType<typeof setTimeout>[] = []
let confettiEls: HTMLElement[] = []

function spinWheel() {
  if (isSpinning.value || showResult.value) return

  const targetIdx = Math.floor(Math.random() * 6)
  const sectorCenter = targetIdx * 60 + 30
  const toTop = (360 - (sectorCenter % 360) + 360) % 360
  const jitter = (Math.random() - 0.5) * 38
  const targetRotation = currentRotation + 5 * 360 + toTop + jitter

  const startRotation = currentRotation
  const startTime = Date.now()
  const duration = 5200

  isSpinning.value = true

  if (spinInterval) clearInterval(spinInterval)
  spinInterval = setInterval(() => {
    const p = Math.min((Date.now() - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3.6)
    const rotation = startRotation + (targetRotation - startRotation) * eased
    currentRotation = rotation
    if (wheelEl.value) {
      wheelEl.value.style.transform = `rotate(${rotation}deg)`
    }
    if (p >= 1) {
      if (spinInterval) clearInterval(spinInterval)
      spinInterval = null
      isSpinning.value = false
      if (SEGMENTS[targetIdx]?.isRetry) {
        showToast.value = true
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => {
          showToast.value = false
        }, 3200)
      } else {
        selectedIndex.value = targetIdx
        showResult.value = true
        spawnConfetti()
      }
    }
  }, 16)
}

function spawnConfetti() {
  for (let i = 0; i < 110; i++) {
    const el = document.createElement('div')
    const size = 5 + Math.random() * 9
    const dur = 2.6 + Math.random() * 2.2
    const dx = (Math.random() - 0.5) * 160
    el.style.cssText =
      `position:fixed;top:-14px;left:${Math.random() * 100}%;` +
      `width:${size}px;height:${size * 0.55}px;` +
      `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};` +
      `border-radius:1px;opacity:0;--dx:${dx}px;pointer-events:none;z-index:60;` +
      `animation:confetti-fall ${dur}s cubic-bezier(.2,.62,.32,1) ${Math.random() * 0.6}s forwards;`
    document.body.appendChild(el)
    confettiEls.push(el)
    const t = setTimeout(
      () => {
        if (el.parentNode) el.parentNode.removeChild(el)
        confettiEls = confettiEls.filter((e) => e !== el)
        confettiTimers = confettiTimers.filter((id) => id !== t)
      },
      (dur + 0.6 + 0.5) * 1000
    )
    confettiTimers.push(t)
  }
}

function claimPrize() {
  showResult.value = false
}

onBeforeUnmount(() => {
  if (spinInterval) {
    clearInterval(spinInterval)
    spinInterval = null
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  confettiTimers.forEach((t) => clearTimeout(t))
  confettiTimers = []
  confettiEls.forEach((el) => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  confettiEls = []
})
</script>

<template>
  <div class="wheel-page">
    <!-- Brand -->
    <div class="logo-area">
      <div class="logo-circle">АЛ</div>
      <div class="logo-subtitle">Онлайн-школа · Анастасия Ларина</div>
    </div>

    <!-- Wheel state -->
    <template v-if="!showResult">
      <div
        style="
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        <h1 class="wheel-title">Колесо удачи</h1>
        <p class="wheel-subtitle" style="margin-bottom: 26px">
          Крутите колесо и забирайте свой подарок от школы
        </p>

        <div class="wheel-outer">
          <div class="wheel-glow"></div>
          <div class="pointer-wrap">
            <div class="pointer-dot"></div>
            <div class="pointer-triangle"></div>
          </div>
          <div class="wheel-rim">
            <div class="wheel-inner">
              <div class="wheel-face" ref="wheelEl">
                <!-- Dividers -->
                <div class="wheel-dividers">
                  <div
                    v-for="deg in DIVIDERS"
                    :key="deg"
                    class="wheel-divider"
                    :style="{ transform: `rotate(${deg}deg)` }"
                  ></div>
                </div>
                <!-- Segments -->
                <div
                  v-for="(seg, i) in SEGMENTS"
                  :key="i"
                  class="wheel-segment"
                  :style="{ transform: `rotate(${i * 60}deg)` }"
                >
                  <div
                    class="seg-content"
                    :style="{
                      transform: `translateX(-50%) rotate(${-(i * 60)}deg)`,
                      color: seg.textColor
                    }"
                  >
                    <span class="seg-icon">{{ seg.icon }}</span>
                    <span class="seg-label">{{ seg.line1 }}<br />{{ seg.line2 }}</span>
                  </div>
                </div>
                <div class="wheel-rim-dot"></div>
              </div>
              <button class="wheel-hub" @click="spinWheel" :disabled="isSpinning">
                <span class="hub-arrow">↻</span>
                <span class="hub-label">Крутить</span>
              </button>
            </div>
          </div>
        </div>

        <button class="spin-btn" @click="spinWheel" :disabled="isSpinning">
          <span class="btn-sheen" v-if="!isSpinning"></span>
          <span class="btn-label">{{ isSpinning ? 'Крутится…' : 'Крутить колесо' }}</span>
        </button>

        <p class="spin-notice" style="margin-top: 24px">Одна попытка · Розыгрыш призов</p>
      </div>
    </template>

    <!-- Result state -->
    <template v-if="showResult">
      <div class="result-state">
        <div class="result-prize-icon-wrap">
          <div class="result-glow"></div>
          <div class="result-prize-icon-circle">🎁</div>
        </div>
        <div class="result-tag">Розыгрыш завершён</div>
        <h1 class="result-title">Поздравляем</h1>
        <p class="result-subtitle">Вы выиграли приз</p>
        <div class="prize-card">
          <div class="prize-card-label">Ваш выигрыш</div>
          <div class="prize-card-name">{{ SEGMENTS[selectedIndex]?.full }}</div>
        </div>
        <button class="claim-btn" @click="claimPrize">
          <span class="claim-sheen"></span>
          <span class="claim-btn-label">Забрать приз</span>
        </button>
        <p class="result-hint">Менеджер свяжется с вами, чтобы передать подарок</p>
      </div>
    </template>

    <!-- Toast -->
    <div v-if="showToast" class="wheel-toast">Ещё одна попытка — крутите снова!</div>
  </div>
</template>
