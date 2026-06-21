<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Header from '../shared/Header.vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiGetWebhooksListRoute } from '../api/webhook'
import { extractChatFromUpdate } from '../lib/extract-chat'

declare const ctx: any

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
  encodedSocketId: string
  botId?: string | null // Опциональный фильтр по botId
  chatId?: string | null // Опциональный фильтр по chatId
}>()

const displayedTitle = ref('')
const displayedHelp = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const showWebhooks = ref(false)
const bootLoaderDone = ref(false)
const isGlitching = ref(false)
const cursorPosition = ref<'title' | 'help' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)
const showHelpIcon = ref(false)

const webhooks = ref<
  Array<{
    id?: string
    timestamp: number
    botId?: string
    botName?: string | null
    botUsername?: string | null
    raw: any
  }>
>([])

const loadingWebhooks = ref(false)
let socketSubscription: any = null

// Загрузка последних вебхуков из таблицы
const loadRecentWebhooks = async () => {
  loadingWebhooks.value = true
  try {
    const filterDesc = props.chatId
      ? `для канала ${props.chatId}${props.botId ? ` (бот ${props.botId})` : ''}`
      : props.botId
        ? `для бота ${props.botId}`
        : 'для всех ботов'
    console.log('[WebhooksPage] Загрузка последних вебхуков из таблицы', filterDesc)

    // Формируем query параметры
    const queryParams: any = {}
    if (props.botId) {
      queryParams.botId = props.botId
    }
    if (props.chatId) {
      queryParams.chatId = props.chatId
    }

    // Выполняем запрос с параметрами
    const result =
      Object.keys(queryParams).length > 0
        ? await apiGetWebhooksListRoute.query(queryParams).run(ctx)
        : await apiGetWebhooksListRoute.run(ctx)

    if (result.success && result.webhooks) {
      console.log(`[WebhooksPage] Получено вебхуков: ${result.webhooks.length}`)
      webhooks.value = result.webhooks.map((webhook: any) => ({
        id: webhook.id,
        timestamp: webhook.receivedAt,
        botId: webhook.botId,
        botName: webhook.botName || null,
        botUsername: webhook.botUsername || null,
        raw: webhook.raw
      }))
      console.log('[WebhooksPage] Вебхуки успешно загружены из таблицы')
    } else {
      console.warn('[WebhooksPage] Ошибка при загрузке вебхуков:', result.error)
    }
  } catch (e: any) {
    console.error('[WebhooksPage] Исключение при загрузке вебхуков:', e)
  } finally {
    loadingWebhooks.value = false
  }
}

onMounted(async () => {
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
    const titleText = 'Вебхуки Telegram'
    cursorPosition.value = 'title'

    // Набираем заголовок
    let titleIndex = 0
    const titleInterval = setInterval(() => {
      if (titleIndex < titleText.length) {
        displayedTitle.value = titleText.substring(0, titleIndex + 1)
        titleIndex++
      } else {
        clearInterval(titleInterval)
        // После завершения набора заголовка показываем разделительную черту и иконку
        showTitleUnderline.value = true
        showHelpIcon.value = true
        // Затем набираем hero-help
        typeHelp()
      }
    }, 30) // Скорость набора текста
  }

  const typeHelp = () => {
    const helpText = 'Сырые данные вебхуков'
    cursorPosition.value = 'help'
    let helpIndex = 0
    const helpInterval = setInterval(() => {
      if (helpIndex < helpText.length) {
        displayedHelp.value = helpText.substring(0, helpIndex + 1)
        helpIndex++
      } else {
        clearInterval(helpInterval)
        // После hero-help набираем hero-description
        typeDescription()
      }
    }, 30)
  }

  const typeDescription = () => {
    const descriptionText = 'Отслеживание входящих вебхуков в реальном времени'
    cursorPosition.value = 'description'
    let descIndex = 0
    const descInterval = setInterval(() => {
      if (descIndex < descriptionText.length) {
        displayedDescription.value = descriptionText.substring(0, descIndex + 1)
        descIndex++
      } else {
        clearInterval(descInterval)
        // После завершения набора всех элементов:
        // Перемещаем курсор в конец заголовка и показываем вебхуки
        cursorPosition.value = 'final'
        showWebhooks.value = true
        loadRecentWebhooks()
        subscribeToWebhooks()
      }
    }, 30)
  }

  async function subscribeToWebhooks() {
    try {
      const socketClient = await getOrCreateBrowserSocketClient()
      socketSubscription = socketClient.subscribeToData(props.encodedSocketId)

      socketSubscription.listen((data: any) => {
        if (data.type === 'webhook') {
          // Фильтруем по botId, если указан
          if (props.botId && data.data.botId !== props.botId) {
            return
          }

          // Фильтруем по chatId, если указан
          if (props.chatId) {
            try {
              const chatInfo = extractChatFromUpdate(data.data.raw)
              if (!chatInfo || !chatInfo.id || String(chatInfo.id) !== props.chatId) {
                return // Пропускаем вебхук, если chatId не совпадает
              }
            } catch (error: any) {
              console.warn('[WebhooksPage] Ошибка фильтрации по chatId:', error)
              return
            }
          }

          // Добавляем вебхук в список, если он прошел все фильтры
          const existingIndex = webhooks.value.findIndex(
            (w) => w.timestamp === data.data.timestamp && w.botId === data.data.botId
          )

          if (existingIndex === -1) {
            webhooks.value.unshift({
              timestamp: data.data.timestamp,
              botId: data.data.botId,
              botName: data.data.botName,
              botUsername: data.data.botUsername,
              raw: data.data.raw
            })

            if (webhooks.value.length > 100) {
              webhooks.value = webhooks.value.slice(0, 100)
            }
          } else {
            console.log('[WebhooksPage] Вебхук уже существует, пропускаем дубликат')
          }
        }
      })

      console.log('[WebhooksPage] Подписка на WebSocket установлена')
    } catch (error: any) {
      console.error('[WebhooksPage] Ошибка подписки на WebSocket:', error)
    }
  }
})

onBeforeUnmount(() => {
  if (socketSubscription) {
    socketSubscription.unsubscribe()
    socketSubscription = null
  }
})

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  })
}

const openChatiumLink = () => {
  window.open('https://t.me/ChatiumRuBot?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

const triggerGlitch = () => {
  if (isGlitching.value) return

  isGlitching.value = true

  // Добавляем глитч эффект ко всей странице
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')

    setTimeout(() => {
      appLayout.classList.remove('global-glitch-active')
      isGlitching.value = false
    }, 500)
  }
}

const handleHelpClick = () => {
  triggerGlitch()
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
          :class="{ 'hero-ready': bootLoaderDone, 'hero-glow-visible': showWebhooks }"
        >
          <div class="hero-icon-wrapper" :class="{ 'hero-icon-visible': showWebhooks }">
            <i class="fas fa-code hero-icon"></i>
          </div>
          <h1 class="hero-heading" :class="{ 'show-underline': showTitleUnderline }">
            {{ displayedTitle
            }}<span
              v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')"
              class="typing-cursor"
              >▮</span
            >
          </h1>
          <p class="hero-help" @click="handleHelpClick">
            <i v-if="showHelpIcon" class="fas fa-question-circle"></i>
            {{ displayedHelp
            }}<span v-if="showCursor && cursorPosition === 'help'" class="typing-cursor">▮</span>
          </p>
          <p class="hero-description">
            {{ displayedDescription
            }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor"
              >▮</span
            >
          </p>
        </section>

        <!-- Webhooks Section -->
        <section class="webhooks-section" :class="{ 'webhooks-visible': showWebhooks }">
          <div v-if="webhooks.length === 0 && !loadingWebhooks" class="empty-state">
            <p>Нет вебхуков</p>
          </div>
          <div v-else-if="loadingWebhooks" class="loading-state">
            <p>Загрузка вебхуков...</p>
          </div>
          <div v-else class="webhooks-list">
            <div
              v-for="(webhook, index) in webhooks"
              :key="`webhook-${webhook.timestamp}-${webhook.botId}-${index}`"
              class="webhook-item"
            >
              <div class="webhook-content-wrapper">
                <div class="webhook-header">
                  <span class="webhook-timestamp">{{ formatTimestamp(webhook.timestamp) }}</span>
                  <div v-if="webhook.botName || webhook.botUsername" class="webhook-bot-info">
                    <span v-if="webhook.botName" class="bot-name">{{ webhook.botName }}</span>
                    <span v-if="webhook.botUsername" class="bot-username"
                      >@{{ webhook.botUsername }}</span
                    >
                  </div>
                </div>
                <div class="webhook-content">
                  <pre class="webhook-json">{{ JSON.stringify(webhook.raw, null, 2) }}</pre>
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
/* Глобальное правило: скрываем курсор на странице вебхуков при hover на хедер */
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
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;
  padding: 3rem 0;
  /* Анимация появления уже применяется к .app-layout в webhooks.tsx */
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

/* Hero Section */
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
  /* Элемент виден, когда развёртка дошла до него */
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
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  min-height: 1.5rem;
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
  margin-bottom: 2rem;
  min-height: 1.6rem;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
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

  .hero-description {
    margin-bottom: 0.25rem;
  }

  .webhooks-section {
    padding-bottom: 0.5rem;
    padding-top: 0;
    min-height: auto;
  }

  .app-footer {
    padding: 1rem 0;
  }
}

/* Webhooks Section */
.webhooks-section {
  width: 100%;
  min-height: 400px;
  position: relative;
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transform: scaleY(0.01);
  transform-origin: center;
  transition: opacity 0.1s;
  overflow: visible;
  filter: brightness(0.8);
  padding-bottom: 2rem;
  padding-top: 4px;
  display: block;
}

.webhooks-section.webhooks-visible {
  opacity: 1;
  pointer-events: auto;
  animation: crt-tv-webhooks-power-on 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  transform-style: preserve-3d;
}

@keyframes crt-tv-webhooks-power-on {
  /* Мгновенное появление яркой полосы */
  0% {
    transform: scaleY(0.01) perspective(600px) rotateX(0deg);
    filter: brightness(1.5) contrast(1.3);
    clip-path: polygon(0 50%, 100% 50%, 100% 50%, 0 50%);
    opacity: 1;
  }
  /* Плавное начало развертки */
  0.5% {
    transform: scaleY(0.03) perspective(590px) rotateX(0.5deg);
    filter: brightness(1.45) contrast(1.32) drop-shadow(0.5px 0 0 rgba(255, 0, 0, 0.15))
      drop-shadow(-0.5px 0 0 rgba(0, 0, 255, 0.15));
    clip-path: polygon(0 49%, 100% 49.5%, 100% 50.5%, 0 51%);
    opacity: 1;
  }
  1.5% {
    transform: scaleY(0.08) perspective(570px) rotateX(1.2deg);
    filter: brightness(1.38) contrast(1.36) drop-shadow(1.2px 0 0 rgba(255, 0, 0, 0.22))
      drop-shadow(-1.2px 0 0 rgba(0, 0, 255, 0.22));
    clip-path: polygon(0 47%, 100% 48%, 100% 52%, 0 53%);
    opacity: 1;
  }
  2.5% {
    transform: scaleY(0.12) perspective(560px) rotateX(1.6deg);
    filter: brightness(1.32) contrast(1.38) drop-shadow(1.6px 0 0 rgba(255, 0, 0, 0.27))
      drop-shadow(-1.6px 0 0 rgba(0, 0, 255, 0.27));
    clip-path: polygon(0 46%, 100% 47.5%, 100% 52.5%, 0 54%);
    opacity: 1;
  }
  4.5% {
    transform: scaleY(0.2) perspective(525px) rotateX(2.4deg) scaleX(1.015);
    filter: brightness(1.25) blur(0.4px) contrast(1.42) drop-shadow(2.2px 0 0 rgba(255, 0, 0, 0.31))
      drop-shadow(-2.2px 0 0 rgba(0, 0, 255, 0.31));
    clip-path: polygon(0 42%, 100% 44.5%, 100% 55.5%, 0 58%);
    opacity: 0.99;
  }
  8% {
    transform: scaleY(0.32) perspective(475px) rotateX(2.9deg) scaleX(1.04);
    filter: brightness(1.15) blur(1px) contrast(1.48) drop-shadow(3px 0 0 rgba(255, 0, 0, 0.34))
      drop-shadow(-3px 0 0 rgba(0, 0, 255, 0.34));
    clip-path: polygon(0 37%, 100% 40.5%, 100% 59.5%, 0 63%);
    opacity: 0.97;
  }
  /* Плавное продолжение развертки */
  13% {
    transform: scaleY(0.47) perspective(425px) rotateX(-1.2deg) scaleX(0.995);
    filter: brightness(1.05) blur(1.05px) contrast(1.47)
      drop-shadow(-2.6px 0 0 rgba(255, 0, 0, 0.33)) drop-shadow(2.6px 0 0 rgba(0, 0, 255, 0.33));
    clip-path: polygon(0 32%, 100% 35.5%, 100% 64.5%, 0 68%);
    opacity: 0.95;
  }
  17.5% {
    transform: scaleY(0.62) perspective(380px) rotateX(0.8deg) scaleX(1.015);
    filter: brightness(0.96) blur(0.95px) contrast(1.38)
      drop-shadow(2.1px 0 0 rgba(255, 0, 0, 0.29)) drop-shadow(-2.1px 0 0 rgba(0, 0, 255, 0.29));
    clip-path: polygon(0 26%, 100% 29.5%, 100% 70.5%, 0 74%);
    opacity: 0.935;
  }
  24% {
    transform: scaleY(0.77) perspective(340px) rotateX(-0.3deg) scaleX(1.01);
    filter: brightness(0.9) blur(0.8px) contrast(1.32) drop-shadow(-1.9px 0 0 rgba(255, 0, 0, 0.25))
      drop-shadow(1.9px 0 0 rgba(0, 0, 255, 0.25));
    clip-path: polygon(0 18.5%, 100% 21.5%, 100% 78.5%, 0 81.5%);
    opacity: 0.94;
  }
  31.5% {
    transform: scaleY(0.88) perspective(300px) rotateX(0.1deg) scaleX(1.003);
    filter: brightness(0.91) blur(0.6px) contrast(1.27) drop-shadow(1.4px 0 0 rgba(255, 0, 0, 0.21))
      drop-shadow(-1.4px 0 0 rgba(0, 0, 255, 0.21));
    clip-path: polygon(0 12.5%, 100% 14.5%, 100% 85.5%, 0 87.5%);
    opacity: 0.95;
  }
  40% {
    transform: scaleY(0.94) perspective(260px) rotateX(-0.1deg) scaleX(1.001);
    filter: brightness(0.94) blur(0.45px) contrast(1.22) drop-shadow(-1px 0 0 rgba(255, 0, 0, 0.19))
      drop-shadow(1px 0 0 rgba(0, 0, 255, 0.19));
    clip-path: polygon(0 8%, 100% 9.5%, 100% 90.5%, 0 91%);
    opacity: 0.965;
  }
  /* Плавная стабилизация */
  50% {
    transform: scaleY(0.97) perspective(220px) rotateX(0.08deg) scaleX(1.001);
    filter: brightness(1) blur(0.35px) contrast(1.12) drop-shadow(0.8px 0 0 rgba(255, 0, 0, 0.16))
      drop-shadow(-0.8px 0 0 rgba(0, 0, 255, 0.16));
    clip-path: polygon(0 4.5%, 100% 5.5%, 100% 94.5%, 0 95.5%);
    opacity: 0.98;
  }
  62.5% {
    transform: scaleY(0.985) perspective(175px) rotateX(0.04deg) scaleX(1);
    filter: brightness(1.01) blur(0.22px) contrast(1.08)
      drop-shadow(0.55px 0 0 rgba(255, 0, 0, 0.12)) drop-shadow(-0.55px 0 0 rgba(0, 0, 255, 0.12));
    clip-path: polygon(0 2.2%, 100% 2.8%, 100% 97.2%, 0 97.8%);
    opacity: 0.995;
  }
  77.5% {
    transform: scaleY(0.995) perspective(115px) rotateX(0.02deg) scaleX(1);
    filter: brightness(1) blur(0.12px) contrast(1.05) drop-shadow(0.35px 0 0 rgba(255, 0, 0, 0.09))
      drop-shadow(-0.35px 0 0 rgba(0, 0, 255, 0.09));
    clip-path: polygon(0 1.1%, 100% 1.4%, 100% 98.6%, 0 98.9%);
    opacity: 1;
  }
  92.5% {
    transform: scaleY(1) perspective(40px) rotateX(0.01deg) scaleX(1);
    filter: brightness(1) blur(0.04px) contrast(1.015) drop-shadow(0.2px 0 0 rgba(255, 0, 0, 0.05))
      drop-shadow(-0.2px 0 0 rgba(0, 0, 255, 0.05));
    clip-path: polygon(0 0.4%, 100% 0.5%, 100% 99.5%, 0 99.6%);
    opacity: 1;
  }
  100% {
    transform: scaleY(1) perspective(0) rotateX(0deg) scaleX(1);
    filter: brightness(1) blur(0) contrast(1);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    opacity: 1;
  }
}

.webhooks-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.webhook-item {
  position: relative;
  z-index: 10;
  opacity: 0;
  transform: scaleY(0.01);
  transform-origin: center;
  filter: brightness(0.8);
  animation: crt-tv-webhook-power-on 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.webhook-item:nth-child(1) {
  animation-delay: 0.1s;
}

.webhook-item:nth-child(2) {
  animation-delay: 0.15s;
}

.webhook-item:nth-child(3) {
  animation-delay: 0.2s;
}

.webhook-item:nth-child(n + 4) {
  animation-delay: 0.25s;
}

@keyframes crt-tv-webhook-power-on {
  /* Мгновенное появление яркой полосы */
  0% {
    opacity: 0;
    transform: scaleY(0.01) perspective(500px) rotateX(0deg);
    filter: brightness(1.5) contrast(1.3);
    clip-path: polygon(0 50%, 100% 50%, 100% 50%, 0 50%);
  }
  /* Плавное начало развертки */
  1% {
    opacity: 0.6;
    transform: scaleY(0.04) perspective(490px) rotateX(0.8deg);
    filter: brightness(1.45) contrast(1.32) drop-shadow(0.8px 0 0 rgba(255, 0, 0, 0.2))
      drop-shadow(-0.8px 0 0 rgba(0, 0, 255, 0.2));
    clip-path: polygon(0 48%, 100% 49%, 100% 51%, 0 52%);
  }
  3.5% {
    opacity: 0.76;
    transform: scaleY(0.14) perspective(460px) rotateX(2deg);
    filter: brightness(1.35) contrast(1.37) drop-shadow(2px 0 0 rgba(255, 0, 0, 0.3))
      drop-shadow(-2px 0 0 rgba(0, 0, 255, 0.3));
    clip-path: polygon(0 44%, 100% 46%, 100% 54%, 0 56%);
  }
  /* Плавное расширение с искажениями */
  7.5% {
    opacity: 0.85;
    transform: scaleY(0.28) perspective(420px) rotateX(2.65deg) scaleX(1.015);
    filter: brightness(1.25) blur(0.5px) contrast(1.43) drop-shadow(2.7px 0 0 rgba(255, 0, 0, 0.36))
      drop-shadow(-2.7px 0 0 rgba(0, 0, 255, 0.36));
    clip-path: polygon(0 38%, 100% 41.5%, 100% 58.5%, 0 62%);
  }
  12.5% {
    opacity: 0.89;
    transform: scaleY(0.42) perspective(385px) rotateX(-1.5deg) scaleX(0.992);
    filter: brightness(1.08) blur(1.05px) contrast(1.47)
      drop-shadow(-2.7px 0 0 rgba(255, 0, 0, 0.34)) drop-shadow(2.7px 0 0 rgba(0, 0, 255, 0.34));
    clip-path: polygon(0 32%, 100% 35.5%, 100% 64.5%, 0 68%);
  }
  /* Плавное продолжение развертки */
  18.5% {
    opacity: 0.905;
    transform: scaleY(0.57) perspective(355px) rotateX(1.1deg) scaleX(1.015);
    filter: brightness(0.94) blur(0.95px) contrast(1.38)
      drop-shadow(2.15px 0 0 rgba(255, 0, 0, 0.3)) drop-shadow(-2.15px 0 0 rgba(0, 0, 255, 0.3));
    clip-path: polygon(0 26%, 100% 29.5%, 100% 70.5%, 0 74%);
  }
  26% {
    opacity: 0.92;
    transform: scaleY(0.71) perspective(325px) rotateX(-0.5deg) scaleX(1.01);
    filter: brightness(0.89) blur(0.75px) contrast(1.31)
      drop-shadow(-1.85px 0 0 rgba(255, 0, 0, 0.26)) drop-shadow(1.85px 0 0 rgba(0, 0, 255, 0.26));
    clip-path: polygon(0 20%, 100% 23%, 100% 77%, 0 80%);
  }
  /* Плавное разворачивание */
  35% {
    opacity: 0.94;
    transform: scaleY(0.83) perspective(290px) rotateX(0.3deg) scaleX(1.003);
    filter: brightness(0.9) blur(0.6px) contrast(1.28) drop-shadow(1.3px 0 0 rgba(255, 0, 0, 0.23))
      drop-shadow(-1.3px 0 0 rgba(0, 0, 255, 0.23));
    clip-path: polygon(0 14%, 100% 16.5%, 100% 83.5%, 0 86%);
  }
  45% {
    opacity: 0.955;
    transform: scaleY(0.91) perspective(250px) rotateX(-0.2deg) scaleX(1.001);
    filter: brightness(0.93) blur(0.47px) contrast(1.23)
      drop-shadow(-0.95px 0 0 rgba(255, 0, 0, 0.2)) drop-shadow(0.95px 0 0 rgba(0, 0, 255, 0.2));
    clip-path: polygon(0 10%, 100% 11.5%, 100% 88.5%, 0 89%);
  }
  /* Плавная стабилизация */
  55% {
    opacity: 0.97;
    transform: scaleY(0.96) perspective(215px) rotateX(0.1deg) scaleX(1.001);
    filter: brightness(0.98) blur(0.35px) contrast(1.17)
      drop-shadow(0.75px 0 0 rgba(255, 0, 0, 0.16)) drop-shadow(-0.75px 0 0 rgba(0, 0, 255, 0.16));
    clip-path: polygon(0 6.5%, 100% 7.5%, 100% 92.5%, 0 93.5%);
  }
  67.5% {
    opacity: 0.985;
    transform: scaleY(0.98) perspective(160px) rotateX(0.05deg) scaleX(1);
    filter: brightness(1.01) blur(0.22px) contrast(1.11)
      drop-shadow(0.55px 0 0 rgba(255, 0, 0, 0.13)) drop-shadow(-0.55px 0 0 rgba(0, 0, 255, 0.13));
    clip-path: polygon(0 3.5%, 100% 4.5%, 100% 95.5%, 0 96.5%);
  }
  81.5% {
    opacity: 0.995;
    transform: scaleY(0.995) perspective(90px) rotateX(0.02deg) scaleX(1);
    filter: brightness(1) blur(0.12px) contrast(1.06) drop-shadow(0.32px 0 0 rgba(255, 0, 0, 0.09))
      drop-shadow(-0.32px 0 0 rgba(0, 0, 255, 0.09));
    clip-path: polygon(0 1.4%, 100% 1.8%, 100% 98.2%, 0 98.6%);
  }
  /* Финальная стабилизация */
  94% {
    opacity: 1;
    transform: scaleY(1) perspective(30px) rotateX(0.01deg) scaleX(1);
    filter: brightness(1) blur(0.04px) contrast(1.02) drop-shadow(0.15px 0 0 rgba(255, 0, 0, 0.05))
      drop-shadow(-0.15px 0 0 rgba(0, 0, 255, 0.05));
    clip-path: polygon(0 0.5%, 100% 0.6%, 100% 99.4%, 0 99.5%);
  }
  100% {
    opacity: 1;
    transform: scaleY(1) perspective(0) rotateX(0deg) scaleX(1);
    filter: brightness(1) blur(0) contrast(1);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

.webhook-item {
  display: block;
  color: inherit;
  transition: var(--transition);
  position: relative;
  z-index: 10;
  cursor: pointer;
  overflow: visible;
  padding-top: 4px;
  padding-bottom: 0;
  margin-bottom: 0;
}

.webhook-content-wrapper {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  border-radius: 0;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    filter 0.3s ease;
  position: relative;
  z-index: 11;
  box-shadow:
    0 0 0 0 rgba(0, 0, 0, 0),
    0 0 0 0 rgba(0, 0, 0, 0),
    inset 0 0 0 0 rgba(255, 255, 255, 0);
  overflow: hidden;
  transform-style: preserve-3d;
  cursor: pointer;
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

/* CRT scanlines эффект для вебхуков */
.webhook-content-wrapper::before {
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
.webhook-content-wrapper::after {
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

.webhook-item:hover .webhook-content-wrapper::after {
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

.webhook-item:hover .webhook-content-wrapper {
  border-color: rgba(211, 35, 75, 0.5);
  box-shadow:
    0 8px 20px rgba(211, 35, 75, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 30px rgba(211, 35, 75, 0.1);
  animation: webhook-glitch 4s ease-in-out infinite;
}

/* RGB-разделение и искривление для вебхуков при hover */
@keyframes webhook-glitch {
  0%,
  90%,
  100% {
    filter: none;
  }
  91% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.5));
  }
  92% {
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(2px 0 0 rgba(0, 0, 255, 0.5));
  }
  93% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 0, 255, 0.5));
  }
  94%,
  96%,
  98% {
    filter: none;
  }
  95% {
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(-1px 0 0 rgba(0, 0, 255, 0.4));
  }
  97% {
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(1px 0 0 rgba(0, 0, 255, 0.4));
  }
}

.webhook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
  position: relative;
  z-index: 3;
}

.webhook-timestamp {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.webhook-bot-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
}

.webhook-bot-info .bot-name {
  font-weight: bold;
  color: var(--color-accent);
  text-shadow: 0 0 6px rgba(211, 35, 75, 0.3);
}

.webhook-bot-info .bot-username {
  color: var(--color-text-secondary);
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.webhook-content {
  margin-top: 1rem;
  position: relative;
  z-index: 3;
}

.webhook-json {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
  letter-spacing: 0.02em;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
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

  .webhooks-list {
    gap: 1.5rem;
  }

  .webhook-content-wrapper {
    padding: 2rem;
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

  .webhook-content-wrapper {
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
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 0, 255, 0.7))
      hue-rotate(-90deg);
  }
  30% {
    transform: translate(-2px, 0) skew(-0.3deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.8))
      brightness(1.2);
  }
  40% {
    transform: translate(2px, 0) skew(0.3deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(2px 0 0 rgba(0, 0, 255, 0.8))
      contrast(1.3);
  }
  50% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 0, 255, 0.7))
      saturate(2);
  }
  60% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 0, 255, 0.7))
      invert(0.1);
  }
  70% {
    transform: translate(-2px, 0) skew(-0.2deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(-1px 0 0 rgba(0, 0, 255, 0.6))
      brightness(1.1);
  }
  80% {
    transform: translate(2px, 0) skew(0.2deg);
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(1px 0 0 rgba(0, 0, 255, 0.6))
      contrast(1.2);
  }
  90% {
    transform: translate(-1px, 0) skew(0deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-1px 0 0 rgba(0, 0, 255, 0.5))
      brightness(1.05);
  }
}

.global-glitch-active * {
  pointer-events: none !important;
}
</style>
