<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { createComponentLogger } from '../shared/logger'
import { getTheme } from '../config/themes'
import { wheelAuthorizeRoute } from '../api/wheel/authorize'
import { wheelSpinRoute } from '../api/wheel/spin'
import { wheelSegmentsRoute } from '../api/wheel/segments'

// @ts-ignore — ctx — глобальный объект платформы
declare const ctx: app.Ctx

const log = createComponentLogger('WheelPage')

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------
interface EffectiveSegment {
  id?: string
  order: number
  label: string
  weight: number
  isAutoRetry?: true
  redirectUrl?: string
}

// ---------------------------------------------------------------------------
// SSR props
// ---------------------------------------------------------------------------
const props = withDefaults(
  defineProps<{
    segments?: EffectiveSegment[]
    nEff?: number
    segmentsError?: boolean
    segmentsErrorMessage?: string
    themeId?: string
    brandLabel?: string
  }>(),
  {
    segments: () => [],
    nEff: 6,
    segmentsError: false,
    segmentsErrorMessage: '',
    themeId: 'gold',
    brandLabel: ''
  }
)

// ---------------------------------------------------------------------------
// Тема (объект из config/themes по referencу дизайна)
// ---------------------------------------------------------------------------
const t = computed(() => getTheme(props.themeId))
const BODY_FONT = "'Manrope', system-ui, sans-serif"
const g = (a: number) => `rgba(${t.value.glowRgb},${a})`

// ---------------------------------------------------------------------------
// Состояние
// ---------------------------------------------------------------------------
const email = ref<string>('')
const emailLocked = ref<boolean>(false)
const showEmailForm = ref<boolean>(true)

const isSpinning = ref<boolean>(false)
const showResult = ref<boolean>(false)
const showToast = ref<boolean>(false)
const selectedIndex = ref<number>(0)
const spinsRemaining = ref<number>(0)

const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')

const segments = ref<EffectiveSegment[]>(props.segments)
const nEff = ref<number>(props.nEff)

let currentRotation = 0
let spinInterval: ReturnType<typeof setInterval> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null
let confettiTimers: ReturnType<typeof setTimeout>[] = []
let confettiEls: HTMLElement[] = []

const wheelEl = ref<HTMLDivElement | null>(null)
const confettiHost = ref<HTMLDivElement | null>(null)

// ---------------------------------------------------------------------------
// Геометрия колеса (динамическое число секторов 2..8)
// ---------------------------------------------------------------------------
function sectorAngle(): number {
  return 360 / nEff.value
}

// conic-gradient: from -(sa/2), каждый сектор i заполнен segFills[i % len]
const faceBackground = computed(() => {
  const sa = sectorAngle()
  const fills = t.value.segFills
  const stops: string[] = []
  for (let i = 0; i < nEff.value; i++) {
    const c = fills[i % fills.length] ?? fills[0] ?? '#000'
    stops.push(`${c} ${(i * sa).toFixed(3)}deg ${((i + 1) * sa).toFixed(3)}deg`)
  }
  return `conic-gradient(from ${(-sa / 2).toFixed(3)}deg, ${stops.join(', ')})`
})

// Дивайдеры: nEff линий на границах секторов
const dividers = computed(() => {
  const sa = sectorAngle()
  return Array.from({ length: nEff.value }, (_, i) => i * sa + sa / 2)
})

// Текст метки: <br> → перенос строки (\n). Сохраняем переносы для многострочного лейбла.
function segLabelText(seg: EffectiveSegment): string {
  return seg.label
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

function segContainerStyle(i: number): Record<string, string> {
  // Контейнер-луч сектора i: биссектриса направлена вдоль i*sectorAngle.
  return {
    position: 'absolute',
    inset: '0',
    transform: `rotate(${(i * sectorAngle()).toFixed(3)}deg)`
  }
}

/**
 * Горизонтальный лейбл по центру сектора (контр-поворот -i*sa).
 * Многострочный (переносы по <br> + перенос длинных слов), с авто-уменьшением шрифта по объёму
 * текста, чтобы длинная метка вписалась в сектор, а не обрезалась. Надёжно для 2..8 секторов.
 */
function segLabelStyle(i: number): Record<string, string> {
  const sa = sectorAngle()
  const counter = -(i * sa)
  const n = nEff.value

  const seg = segments.value[i]
  const text = seg ? segLabelText(seg) : ''
  const lines = text.split('\n')
  const maxLineLen = Math.max(...lines.map((l) => l.length), 1)
  const numLines = lines.length

  // Радиальная позиция центра текста (% диаметра от верха) и ширина блока (% диаметра ≈ хорда).
  const radialTopPct = n <= 4 ? 19 : n <= 6 ? 14 : 11
  const radialFrac = (50 - radialTopPct) / 50
  const chordPct = radialFrac * Math.sin((sa / 2) * (Math.PI / 180)) * 100 * 0.86
  const widthPct = Math.max(18, Math.min(46, chordPct))

  // Авто-уменьшение шрифта: базовый по числу секторов, ограничен по длине самой длинной
  // строки (ширина) и по числу строк (высота). Длинный текст → мельче, но не меньше 7px.
  const baseFont = n <= 4 ? 15 : n <= 6 ? 13 : 11
  const byWidth = 190 / maxLineLen
  const byHeight = 150 / numLines
  const fontPx = Math.max(7, Math.min(baseFont, byWidth, byHeight))

  return {
    position: 'absolute',
    top: `${radialTopPct}%`,
    left: '50%',
    width: `${widthPct.toFixed(2)}%`,
    transform: `translateX(-50%) rotate(${counter.toFixed(3)}deg)`,
    textAlign: 'center',
    whiteSpace: 'pre-line',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    fontFamily: BODY_FONT,
    fontWeight: '700',
    fontSize: `${fontPx.toFixed(1)}px`,
    lineHeight: '1.12',
    letterSpacing: '.2px',
    color: t.value.segTexts[i % t.value.segTexts.length] ?? t.value.heading,
    textShadow: '0 1px 2px rgba(0,0,0,.28)',
    pointerEvents: 'none',
    userSelect: 'none'
  }
}

// ---------------------------------------------------------------------------
// Инлайн-стили из темы (повторяют дизайн-референс)
// ---------------------------------------------------------------------------
const pageStyle = computed(() => ({
  position: 'relative',
  minHeight: '100svh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '30px 20px 48px',
  background: t.value.pageBg,
  fontFamily: BODY_FONT,
  color: t.value.heading,
  overflow: 'hidden',
  transition: 'background .5s ease'
}))

const brandLabelStyle = computed(() => ({
  fontSize: '11px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  fontWeight: '500',
  color: t.value.brandLabel
}))

const headingStyle = computed(() => ({
  fontFamily: t.value.headFont,
  fontWeight: String(t.value.headW),
  fontSize: 'clamp(32px,8.5vw,44px)',
  lineHeight: '1.05',
  textAlign: 'center',
  margin: '14px 0 8px',
  color: t.value.heading
}))

const subStyle = computed(() => ({
  fontFamily: BODY_FONT,
  textAlign: 'center',
  fontSize: '15px',
  lineHeight: '1.5',
  color: t.value.sub,
  margin: '0 0 18px',
  maxWidth: '300px'
}))

const footerStyle = computed(() => ({
  marginTop: '24px',
  fontSize: '11.5px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: t.value.muted
}))

const glowStyle = computed(() => ({
  position: 'absolute',
  inset: '-16%',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${g(0.3)} 0%, ${g(0)} 62%)`,
  animation: 'spin-glow 4.6s ease-in-out infinite',
  zIndex: '0',
  pointerEvents: 'none'
}))

const rimStyle = computed(() => ({
  position: 'absolute',
  inset: '0',
  borderRadius: '50%',
  background: t.value.rim,
  padding: '9px',
  boxShadow:
    '0 22px 50px rgba(0,0,0,.55), inset 0 2px 6px rgba(255,255,255,.4), inset 0 -3px 8px rgba(0,0,0,.4)',
  zIndex: '1'
}))

const faceWrapStyle = computed(() => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: t.value.faceBg,
  overflow: 'hidden',
  boxShadow: 'inset 0 0 0 3px rgba(0,0,0,.5)'
}))

const faceStyle = computed(() => ({
  position: 'absolute',
  inset: '0',
  borderRadius: '50%',
  background: faceBackground.value
}))

const innerRingStyle = computed(() => ({
  position: 'absolute',
  inset: '3%',
  borderRadius: '50%',
  boxShadow: `inset 0 0 0 2px ${t.value.divider}`,
  pointerEvents: 'none'
}))

const hubStyle = computed(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  width: '27%',
  height: '27%',
  borderRadius: '50%',
  border: `3px solid ${t.value.faceBg}`,
  cursor: isSpinning.value ? 'default' : 'pointer',
  padding: '0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1px',
  background: t.value.hub,
  boxShadow:
    '0 6px 16px rgba(0,0,0,.5), inset 0 2px 4px rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.3)',
  zIndex: '5',
  opacity: isSpinning.value ? '0.85' : '1'
}))

const hubArrowStyle = computed(() => ({
  fontSize: 'clamp(14px,4vw,18px)',
  lineHeight: '1',
  color: t.value.hubText
}))

const hubLabelStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontWeight: '700',
  fontSize: 'clamp(9px,2.4vw,11px)',
  letterSpacing: '.8px',
  textTransform: 'uppercase',
  color: t.value.hubText
}))

const pointerTriStyle = computed(() => ({
  width: '0',
  height: '0',
  borderLeft: '15px solid transparent',
  borderRight: '15px solid transparent',
  borderTop: `26px solid ${t.value.pointer}`
}))

const pointerDotStyle = computed(() => ({
  position: 'absolute',
  top: '-10px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '13px',
  height: '13px',
  borderRadius: '50%',
  background: t.value.pointerDot,
  boxShadow: 'inset 0 1px 2px rgba(255,255,255,.6)'
}))

const buttonStyle = computed(() => ({
  position: 'relative',
  overflow: 'hidden',
  marginTop: '4px',
  width: '100%',
  maxWidth: '320px',
  padding: '19px 24px',
  borderRadius: '100px',
  border: 'none',
  cursor: isSpinning.value ? 'default' : 'pointer',
  fontFamily: BODY_FONT,
  fontWeight: '700',
  fontSize: '16px',
  letterSpacing: '1.4px',
  textTransform: 'uppercase',
  color: t.value.buttonText,
  background: t.value.button,
  boxShadow: `0 14px 34px rgba(${t.value.buttonGlow},.42), inset 0 1px 2px rgba(255,255,255,.5)`,
  opacity: isSpinning.value ? '0.55' : '1',
  transition: 'opacity .3s, transform .15s'
}))

const toastStyle = computed(() => ({
  marginTop: '18px',
  padding: '12px 22px',
  borderRadius: '100px',
  background: g(0.12),
  border: `1px solid ${g(0.4)}`,
  color: t.value.prizeText,
  fontFamily: BODY_FONT,
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '.3px',
  animation: 'toast-in .4s ease-out'
}))

const changeEmailStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontSize: '12.5px',
  color: t.value.sub,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '.3px',
  textDecoration: 'underline',
  padding: '0',
  marginBottom: '14px'
}))

// Email gate
const emailInputStyle = computed(() => ({
  width: '100%',
  padding: '16px 20px',
  borderRadius: '100px',
  border: `1.5px solid ${g(0.4)}`,
  background: g(0.06),
  color: t.value.heading,
  fontFamily: BODY_FONT,
  fontSize: '16px',
  outline: 'none',
  textAlign: 'center'
}))

const emailErrorStyle = {
  fontFamily: BODY_FONT,
  fontSize: '13px',
  color: '#e07070',
  textAlign: 'center' as const,
  margin: '0'
}

// Result
const eyebrowStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontSize: '12px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: t.value.accent,
  fontWeight: '600',
  marginBottom: '12px'
}))

const resultHeadingStyle = computed(() => ({
  fontFamily: t.value.headFont,
  fontWeight: String(t.value.headW),
  fontSize: 'clamp(38px,11vw,54px)',
  lineHeight: '1',
  margin: '0 0 14px',
  color: t.value.heading
}))

const resultGlowStyle = computed(() => ({
  position: 'absolute',
  inset: '-20%',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${g(0.4)} 0%, ${g(0)} 65%)`,
  animation: 'spin-glow 3.4s ease-in-out infinite'
}))

const resultBadgeStyle = computed(() => ({
  position: 'relative',
  width: '96px',
  height: '96px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: t.value.hub,
  boxShadow: `0 14px 34px ${g(0.4)}, inset 0 2px 5px rgba(255,255,255,.45)`
}))

const prizeCardStyle = computed(() => ({
  width: '100%',
  padding: '22px 24px',
  borderRadius: '18px',
  background: `linear-gradient(160deg, ${g(0.14)}, ${g(0.04)})`,
  border: `1px solid ${g(0.32)}`,
  margin: '6px 0 24px',
  boxShadow: '0 16px 40px rgba(0,0,0,.4)'
}))

const cardEyebrowStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontSize: '11px',
  letterSpacing: '2.4px',
  textTransform: 'uppercase',
  color: t.value.muted,
  marginBottom: '10px'
}))

const prizeTextStyle = computed(() => ({
  fontFamily: t.value.headFont,
  fontWeight: String(t.value.headW),
  fontSize: 'clamp(22px,6vw,29px)',
  lineHeight: '1.18',
  color: t.value.prizeText
}))

const claimNoteStyle = computed(() => ({
  fontFamily: BODY_FONT,
  marginTop: '18px',
  fontSize: '12.5px',
  color: t.value.muted,
  lineHeight: '1.5'
}))

const showSheen = computed(() => !isSpinning.value)

// ---------------------------------------------------------------------------
// Email гейт (§16.5)
// ---------------------------------------------------------------------------
const AUTH_KEY = 'larina-wheel:auth'

interface AuthStorage {
  email: string
  locked: boolean
}

function isValidEmailFormat(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function readAuth(): AuthStorage | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthStorage
    if (typeof parsed.email === 'string' && isValidEmailFormat(parsed.email)) {
      return parsed
    }
  } catch (_) {}
  return null
}

function saveAuth(e: string, locked: boolean) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ email: e, locked }))
  } catch (_) {}
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch (_) {}
}

const emailInput = ref<string>('')
const emailError = ref<string>('')
const emailSubmitting = ref<boolean>(false)

async function submitEmail() {
  const trimmed = emailInput.value.trim()
  if (!isValidEmailFormat(trimmed)) {
    emailError.value = 'Введите корректный email'
    return
  }
  emailError.value = ''
  emailSubmitting.value = true
  try {
    const res = await wheelAuthorizeRoute.run(ctx, { email: trimmed })
    if (res.success) {
      email.value = trimmed
      emailLocked.value = (res as { success: true; locked: boolean }).locked ?? false
      saveAuth(trimmed, emailLocked.value)
      showEmailForm.value = false
    } else {
      emailError.value = (res as { success: false; error: string }).error || 'Ошибка авторизации'
    }
  } catch (_) {
    emailError.value = 'Ошибка сети, попробуйте ещё раз'
  } finally {
    emailSubmitting.value = false
  }
}

function changeEmail() {
  clearAuth()
  email.value = ''
  emailLocked.value = false
  emailInput.value = ''
  emailError.value = ''
  showEmailForm.value = true
}

// ---------------------------------------------------------------------------
// Загрузка сегментов (фоллбэк при отсутствии SSR props)
// ---------------------------------------------------------------------------
async function fetchSegments() {
  try {
    const res = await wheelSegmentsRoute.run(ctx)
    const data = res as {
      success: boolean
      segments?: EffectiveSegment[]
      nEff?: number
      error?: string
    }
    if (data.success && data.segments) {
      segments.value = data.segments
      nEff.value = data.nEff ?? data.segments.length
    } else {
      setError(data.error || 'Колесо временно недоступно')
    }
  } catch (_) {
    setError('Колесо временно недоступно')
  }
}

// ---------------------------------------------------------------------------
// Ошибка
// ---------------------------------------------------------------------------
function setError(msg: string) {
  hasError.value = true
  errorMessage.value = msg
}

function reloadPage() {
  window.location.reload()
}

// ---------------------------------------------------------------------------
// Анимация спина (§6.1)
// ---------------------------------------------------------------------------
async function spinWheel() {
  if (isSpinning.value || showResult.value) return
  if (showEmailForm.value || !email.value) return

  isSpinning.value = true
  showToast.value = false

  try {
    const res = await wheelSpinRoute.run(ctx, { email: email.value })
    const spinData = res as
      | { success: true; targetIdx: number; full: string; spinsRemaining: number; nEff: number }
      | { success: false; error: string }

    if (!spinData.success) {
      isSpinning.value = false
      setError(spinData.error || 'Ошибка при вращении')
      return
    }

    const targetIdx: number = spinData.targetIdx
    spinsRemaining.value = spinData.spinsRemaining ?? 0

    // §6.1: проверка согласованности конфигурации ДО анимации
    const responseNEff: number = spinData.nEff ?? nEff.value
    if (responseNEff !== segments.value.length || segments.value[targetIdx] === undefined) {
      isSpinning.value = false
      setError('Колесо временно недоступно')
      return
    }

    const sa = sectorAngle()
    const desiredMod = (360 - targetIdx * sa + 360) % 360
    const currentMod = ((currentRotation % 360) + 360) % 360
    const delta = (desiredMod - currentMod + 360) % 360
    const jitter = (Math.random() - 0.5) * (sa - 2)
    const targetRotation = currentRotation + 5 * 360 + delta + jitter

    const startRotation = currentRotation
    const startTime = Date.now()
    const duration = 5200

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

        const wonSeg = segments.value[targetIdx]
        if (!wonSeg) {
          setError('Колесо временно недоступно')
          return
        }
        if (wonSeg.isAutoRetry) {
          showToast.value = true
          if (toastTimer) clearTimeout(toastTimer)
          toastTimer = setTimeout(() => {
            showToast.value = false
          }, 3200)
        } else {
          selectedIndex.value = targetIdx
          showResult.value = true
          if (!emailLocked.value) {
            emailLocked.value = true
            saveAuth(email.value, true)
          }
          spawnConfetti()
        }
      }
    }, 16)
  } catch (_) {
    isSpinning.value = false
    setError('Ошибка сети при вращении, попробуйте ещё раз')
  }
}

// ---------------------------------------------------------------------------
// Конфетти (цвета из активной темы)
// ---------------------------------------------------------------------------
function spawnConfetti() {
  const host = confettiHost.value || document.body
  const colors = t.value.confetti
  for (let i = 0; i < 110; i++) {
    const el = document.createElement('div')
    const size = 5 + Math.random() * 9
    const dur = 2.6 + Math.random() * 2.2
    const dx = (Math.random() - 0.5) * 160
    el.style.cssText =
      `position:absolute;top:-14px;left:${Math.random() * 100}%;` +
      `width:${size}px;height:${size * 0.55}px;` +
      `background:${colors[i % colors.length]};` +
      `border-radius:1px;opacity:0;--dx:${dx}px;pointer-events:none;z-index:60;` +
      `animation:confetti-fall ${dur}s cubic-bezier(.2,.62,.32,1) ${Math.random() * 0.6}s forwards;`
    host.appendChild(el)
    confettiEls.push(el)
    const timer = setTimeout(
      () => {
        if (el.parentNode) el.parentNode.removeChild(el)
        confettiEls = confettiEls.filter((e) => e !== el)
        confettiTimers = confettiTimers.filter((id) => id !== timer)
      },
      (dur + 0.6 + 0.5) * 1000
    )
    confettiTimers.push(timer)
  }
}

// ---------------------------------------------------------------------------
// Экран результата
// ---------------------------------------------------------------------------
function spinAgain() {
  showResult.value = false
}

function claimPrize() {
  const seg = segments.value[selectedIndex.value]
  if (seg?.redirectUrl) {
    window.location.href = seg.redirectUrl
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(async () => {
  log.debug('mount')

  if (props.segmentsError) {
    setError(props.segmentsErrorMessage || 'Колесо временно недоступно')
    return
  }

  if (props.segments.length === 0) {
    await fetchSegments()
  }

  const auth = readAuth()
  if (auth) {
    email.value = auth.email
    emailLocked.value = auth.locked
    showEmailForm.value = false
    log.debug('email восстановлен из localStorage', { locked: auth.locked })
  }
})

onBeforeUnmount(() => {
  log.debug('unmount')
  if (spinInterval) {
    clearInterval(spinInterval)
    spinInterval = null
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  confettiTimers.forEach((timer) => clearTimeout(timer))
  confettiTimers = []
  confettiEls.forEach((el) => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  confettiEls = []
})
</script>

<template>
  <div :style="pageStyle" :class="{ 'wheel-error-state': hasError }">
    <!-- Хост конфетти -->
    <div
      ref="confettiHost"
      style="position: fixed; inset: 0; pointer-events: none; z-index: 60; overflow: hidden"
    ></div>

    <!-- Brand label (настраивается в админке; логотип убран) -->
    <div
      v-if="brandLabel"
      style="display: flex; flex-direction: column; align-items: center; margin-bottom: 16px"
    >
      <div :style="brandLabelStyle">{{ brandLabel }}</div>
    </div>

    <!-- Оверлей ошибки (filter:none — выведен из-под grayscale) -->
    <div v-if="hasError" class="wheel-error-overlay">
      <div class="wheel-error-box">
        <div class="wheel-error-icon">⚠</div>
        <h2 class="wheel-error-title">Что-то пошло не так</h2>
        <p class="wheel-error-message">{{ errorMessage || 'Колесо временно недоступно' }}</p>
        <button class="wheel-error-reload-btn" @click="reloadPage">Перезагрузить колесо</button>
      </div>
    </div>

    <!-- Email-гейт (§16.5) -->
    <div
      v-if="!hasError && showEmailForm"
      style="
        width: 100%;
        max-width: 380px;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <h1 :style="headingStyle">Колесо удачи</h1>
      <p :style="subStyle">Введите ваш email, чтобы принять участие в розыгрыше</p>
      <form
        style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 14px"
        @submit.prevent="submitEmail"
      >
        <input
          v-model="emailInput"
          type="email"
          :style="emailInputStyle"
          placeholder="your@email.com"
          autocomplete="email"
          :disabled="emailSubmitting"
        />
        <p v-if="emailError" :style="emailErrorStyle">{{ emailError }}</p>
        <button type="submit" :style="buttonStyle" :disabled="emailSubmitting">
          <span style="position: relative; z-index: 2">{{
            emailSubmitting ? 'Проверяем…' : 'Продолжить'
          }}</span>
        </button>
      </form>
    </div>

    <!-- Колесо (основное состояние) -->
    <div
      v-if="!hasError && !showEmailForm && !showResult"
      style="
        width: 100%;
        max-width: 440px;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <h1 :style="headingStyle">Колесо удачи</h1>
      <p :style="subStyle">Крутите колесо и забирайте свой подарок от школы</p>

      <!-- Кнопка смены email (только при locked===false) -->
      <button v-if="!emailLocked" :style="changeEmailStyle" @click="changeEmail">
        {{ email }} · Сменить email
      </button>

      <!-- Wheel assembly -->
      <div
        style="position: relative; width: min(82vw, 358px); aspect-ratio: 1; margin-top: 34px; margin-bottom: 30px"
      >
        <!-- ambient glow -->
        <div :style="glowStyle"></div>

        <!-- outer rim -->
        <div :style="rimStyle">
          <div :style="faceWrapStyle">
            <!-- spinning wheel face -->
            <div ref="wheelEl" :style="faceStyle">
              <!-- divider lines -->
              <div
                v-for="(deg, idx) in dividers"
                :key="'d' + idx"
                :style="{
                  position: 'absolute',
                  left: '50%',
                  top: '0',
                  width: '1.5px',
                  height: '50%',
                  background: t.divider,
                  transformOrigin: 'bottom center',
                  transform: `rotate(${deg}deg)`
                }"
              ></div>

              <!-- labels -->
              <div v-for="(seg, i) in segments" :key="'s' + i" :style="segContainerStyle(i)">
                <div :style="segLabelStyle(i)">{{ segLabelText(seg) }}</div>
              </div>

              <!-- inner ring -->
              <div :style="innerRingStyle"></div>
            </div>

            <!-- center hub -->
            <button :style="hubStyle" :disabled="isSpinning || showResult" @click="spinWheel">
              <span :style="hubArrowStyle">↻</span>
              <span :style="hubLabelStyle">Крутить</span>
            </button>
          </div>
        </div>

        <!-- pointer -->
        <div
          style="
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 8;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
            animation: pointer-nudge 2.4s ease-in-out infinite;
          "
        >
          <div :style="pointerTriStyle"></div>
          <div :style="pointerDotStyle"></div>
        </div>
      </div>

      <!-- spin button -->
      <button :style="buttonStyle" :disabled="isSpinning || showResult" @click="spinWheel">
        <span style="position: relative; z-index: 2">{{
          isSpinning ? 'Крутится…' : 'Крутить колесо'
        }}</span>
        <span
          v-if="showSheen"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 40%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
            animation: sheen 2.6s ease-in-out infinite;
            z-index: 1;
          "
        ></span>
      </button>

      <!-- retry toast -->
      <div v-if="showToast" :style="toastStyle">Ещё одна попытка — крутите снова!</div>

      <p :style="footerStyle">Одна попытка · Розыгрыш призов</p>
    </div>

    <!-- Экран результата -->
    <div
      v-if="!hasError && showResult"
      style="
        width: 100%;
        max-width: 420px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-top: 18px;
        animation: rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1);
      "
    >
      <div style="position: relative; width: 96px; height: 96px; margin-bottom: 26px">
        <div :style="resultGlowStyle"></div>
        <div :style="resultBadgeStyle"><span style="font-size: 44px; line-height: 1">🎁</span></div>
      </div>

      <div :style="eyebrowStyle">Розыгрыш завершён</div>
      <h1 :style="resultHeadingStyle">Поздравляем</h1>
      <p :style="subStyle">Вы выиграли приз</p>

      <div :style="prizeCardStyle">
        <div :style="cardEyebrowStyle">Ваш выигрыш</div>
        <div :style="prizeTextStyle" v-html="segments[selectedIndex]?.label ?? ''"></div>
      </div>

      <!-- «Крутить ещё» — только если spinsRemaining > 0 -->
      <button
        v-if="spinsRemaining > 0"
        :style="buttonStyle"
        style="margin-bottom: 12px"
        @click="spinAgain"
      >
        <span style="position: relative; z-index: 2">Крутить ещё</span>
      </button>

      <!-- «Забрать приз» — только если у сегмента задан redirectUrl -->
      <button v-if="segments[selectedIndex]?.redirectUrl" :style="buttonStyle" @click="claimPrize">
        <span style="position: relative; z-index: 2">Забрать приз</span>
        <span
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 40%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
            animation: sheen 2.8s ease-in-out infinite;
            z-index: 1;
          "
        ></span>
      </button>

      <p :style="claimNoteStyle">Менеджер свяжется с вами, чтобы передать подарок</p>
    </div>
  </div>
</template>
