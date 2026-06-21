<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Header from '../shared/Header.vue'
import { apiGetChannelsListRoute } from '../api/channels'

declare global {
  interface Window {
    hideAppLoader?: () => void
  }
}

declare const ctx: any

const props = defineProps<{
  projectTitle: string
  projectId: string // Обязательный параметр projectId
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  projectsPageUrl?: string
}>()

const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const showContent = ref(false)
const showTitleUnderline = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const bootLoaderDone = ref(false)

// Данные каналов
const channels = ref<
  Array<{
    id: string
    chatId: string
    chatType: string | null
    chatTitle: string | null
    chatUsername: string | null
    botStatus: string | null
    firstSeenAt: Date
    lastSeenAt: Date
  }>
>([])

const loading = ref(false)
const error = ref<string | null>(null)

let bootloaderCompleteHandler: (() => void) | null = null

// Загрузка данных каналов
const loadChannels = async () => {
  loading.value = true
  error.value = null

  try {
    // Более строгая проверка с нормализацией
    const projectId = props.projectId?.trim()
    if (!projectId) {
      const errorMsg = 'Для управления каналами необходимо выбрать проект.'
      console.error('[ChannelsPage] projectId не найден в props')
      error.value = errorMsg
      loading.value = false
      // Редирект на страницу проектов если доступна
      if (props.projectsPageUrl) {
        setTimeout(() => {
          window.location.href = props.projectsPageUrl!
        }, 2000) // Даём время увидеть сообщение об ошибке
      }
      return
    }

    console.log('[ChannelsPage] Начало загрузки списка каналов для проекта:', projectId)
    const result = await apiGetChannelsListRoute.query({ projectId: projectId }).run(ctx)
    console.log('[ChannelsPage] Результат запроса:', result)

    if (result.success && result.channels) {
      console.log(`[ChannelsPage] Получено каналов: ${result.channels.length}`)
      channels.value = result.channels.map((channel: any) => ({
        id: channel.id,
        chatId: channel.chatId,
        chatType: channel.chatType || null,
        chatTitle: channel.chatTitle || null,
        chatUsername: channel.chatUsername || null,
        botStatus: channel.botStatus || null,
        firstSeenAt: channel.firstSeenAt,
        lastSeenAt: channel.lastSeenAt
      }))
      console.log('[ChannelsPage] Данные каналов успешно обработаны и установлены')
    } else {
      const errorMsg = result.error || 'Ошибка при получении списка каналов'
      console.warn('[ChannelsPage] Ошибка в ответе API:', errorMsg)
      error.value = errorMsg
    }
  } catch (e: any) {
    const errorMsg = e.message || 'Ошибка при загрузке каналов'
    console.error('[ChannelsPage] Исключение при загрузке каналов:', e)
    console.error('[ChannelsPage] Stack trace:', e.stack)
    error.value = errorMsg
  } finally {
    loading.value = false
    console.log('[ChannelsPage] Загрузка завершена, loading установлен в false')
  }
}

onMounted(() => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  const startAnimations = () => {
    bootLoaderDone.value = true

    showCursor.value = true
    cursorPosition.value = 'title'

    setTimeout(() => {
      typeTextSequence()
    }, 500)
  }

  bootloaderCompleteHandler = startAnimations

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', bootloaderCompleteHandler)
  }

  const typeTextSequence = () => {
    const titleText = 'Управление каналами'
    cursorPosition.value = 'title'

    let titleIndex = 0
    const titleInterval = setInterval(() => {
      if (titleIndex < titleText.length) {
        displayedTitle.value = titleText.substring(0, titleIndex + 1)
        titleIndex++
      } else {
        clearInterval(titleInterval)
        showTitleUnderline.value = true
        typeDescription()
      }
    }, 40)
  }

  const typeDescription = () => {
    const descriptionText =
      'Настройте отслеживание переходов для ваших Telegram-каналов и создавайте отслеживаемые ссылки'
    cursorPosition.value = 'description'
    let descIndex = 0
    const descInterval = setInterval(() => {
      if (descIndex < descriptionText.length) {
        displayedDescription.value = descriptionText.substring(0, descIndex + 1)
        descIndex++
      } else {
        clearInterval(descInterval)
        cursorPosition.value = 'final'
        showContent.value = true
        // Загружаем данные каналов
        loadChannels()
      }
    }, 20)
  }
})

onUnmounted(() => {
  // Cleanup обработчика bootloader-complete
  if (bootloaderCompleteHandler) {
    window.removeEventListener('bootloader-complete', bootloaderCompleteHandler)
    bootloaderCompleteHandler = null
  }
})
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <Header
      :pageTitle="'A/Ley Services'"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
    />

    <!-- Content -->
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Page Title -->
        <section class="page-header">
          <div class="page-header-icon">
            <i class="fas fa-broadcast-tower"></i>
          </div>
          <h1 class="page-title" :class="{ 'show-underline': showTitleUnderline }">
            {{ displayedTitle
            }}<span
              v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')"
              class="typing-cursor"
              >▮</span
            >
          </h1>
          <div v-if="showContent" class="project-name-badge">
            <i class="fas fa-folder"></i>
            <span>{{ props.projectTitle }}</span>
          </div>
          <p class="page-description">
            {{ displayedDescription
            }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor"
              >▮</span
            >
          </p>
        </section>

        <!-- Content Section -->
        <section class="content-section" :class="{ 'content-visible': showContent }">
          <div v-if="loading" class="empty-state" :class="{ 'content-visible': showContent }">
            <i class="fas fa-spinner fa-spin empty-icon"></i>
            <p class="empty-text">Загрузка каналов...</p>
          </div>

          <div v-else-if="error" class="empty-state" :class="{ 'content-visible': showContent }">
            <i class="fas fa-exclamation-triangle empty-icon"></i>
            <p class="empty-text">Ошибка загрузки</p>
            <p class="empty-subtext">{{ error }}</p>
            <a
              v-if="props.projectsPageUrl && props.projectsPageUrl.trim()"
              :href="props.projectsPageUrl.trim()"
              class="btn btn-primary mt-4"
            >
              <i class="fas fa-folder-open"></i>
              Перейти к проектам
            </a>
          </div>

          <div
            v-else-if="channels.length === 0"
            class="empty-state"
            :class="{ 'content-visible': showContent }"
          >
            <i class="fas fa-broadcast-tower empty-icon"></i>
            <p class="empty-text">Нет каналов</p>
            <p class="empty-subtext">
              Каналы появятся здесь после того, как бот начнёт получать вебхуки от Telegram
            </p>
          </div>

          <div v-else class="channels-list" :class="{ 'content-visible': showContent }">
            <div
              v-for="(channel, index) in channels"
              :key="channel.id"
              class="channel-card"
              :style="{ '--delay': Number(index) * 0.1 + 's' }"
            >
              <div class="channel-card-content">
                <div class="channel-card-header">
                  <div class="channel-card-icon">
                    <i class="fas fa-broadcast-tower"></i>
                  </div>
                  <div class="channel-card-title-section">
                    <h3 class="channel-card-title">
                      {{ channel.chatTitle || 'Канал без названия' }}
                    </h3>
                    <div v-if="channel.chatUsername" class="channel-card-username">
                      <span class="username-label">Username:</span>
                      <span class="username-value">@{{ channel.chatUsername }}</span>
                    </div>
                    <div class="channel-card-id">
                      <span class="id-label">Chat ID:</span>
                      <span class="id-value">{{ channel.chatId }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">ИП Худолей Андрей Германович</div>
        <div class="footer-center">Все права сохранены © 2025</div>
        <div class="footer-right">
          <button class="footer-link">
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
  align-items: flex-start;
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
  gap: 2.5rem;
}

/* Page Header */
.page-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 2rem 0;
  position: relative;
}

.page-header-icon {
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

.page-header-icon::before {
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

.page-header-icon i {
  font-size: 2rem;
  color: white;
  position: relative;
  z-index: 3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.05em;
  text-shadow:
    0 0 10px rgba(232, 232, 232, 0.3),
    0 0 20px rgba(211, 35, 75, 0.2);
  position: relative;
}

.page-title.show-underline::after {
  content: '';
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  animation: underline-expand 0.6s ease-out 0.3s forwards;
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.5);
}

@keyframes underline-expand {
  to {
    width: 100%;
  }
}

.typing-cursor {
  color: var(--color-accent);
  animation: cursor-blink 1s step-end infinite;
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.8);
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

.page-description {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 600px;
  line-height: 1.6;
  letter-spacing: 0.02em;
}

.project-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  background: rgba(211, 35, 75, 0.1);
  border: 1px solid rgba(211, 35, 75, 0.3);
  color: var(--color-accent);
  font-size: 0.875rem;
  letter-spacing: 0.03em;
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

.project-name-badge i {
  font-size: 0.75rem;
}

/* Content Section */
.content-section {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
}

.content-section.content-visible {
  opacity: 1;
  transform: translateY(0);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 1rem;
  min-height: 200px;
}

.empty-icon {
  font-size: 4rem;
  color: var(--color-text-tertiary);
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.empty-subtext {
  font-size: 0.9375rem;
  color: var(--color-text-tertiary);
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  border: 2px solid var(--color-accent);
  color: white;
  font-size: 0.9375rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  cursor: pointer;
  text-decoration: none;
  transition: var(--transition);
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

.btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 2px 6px rgba(211, 35, 75, 0.2);
}

.channels-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.channel-card {
  display: block;
  min-height: 150px;
  transition: var(--transition);
  position: relative;
  opacity: 0;
  animation: fade-in 0.4s ease-out forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.channel-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: var(--transition);
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

.channel-card:hover .channel-card-content {
  transform: translateY(-4px);
  border-color: var(--color-border-light);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.3);
}

.channel-card-header {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  position: relative;
}

.channel-card-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border: 2px solid rgba(211, 35, 75, 0.3);
  color: var(--color-accent);
  font-size: 1.25rem;
  flex-shrink: 0;
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

.channel-card-title-section {
  flex: 1;
  min-width: 0;
}

.channel-card-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0 0 1rem 0;
  line-height: 1.4;
  letter-spacing: 0.03em;
}

.channel-card-username,
.channel-card-id {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.username-label,
.id-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.02em;
}

.username-value {
  font-size: 0.8125rem;
  color: var(--color-accent);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

.id-value {
  font-size: 0.8125rem;
  color: var(--color-text);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

/* Footer */
.app-footer {
  background: transparent;
  border-top: 1px solid var(--color-border);
  padding: 2rem 0;
  margin-top: auto;
  position: relative;
  z-index: 100;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.02em;
}

.footer-left,
.footer-center,
.footer-right {
  flex: 1;
  text-align: center;
}

.footer-left {
  text-align: left;
}

.footer-right {
  text-align: right;
}

.footer-link {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  transition: color 0.25s ease;
  padding: 0;
}

.footer-link:hover {
  color: var(--color-text-secondary);
}

.footer-heart {
  color: var(--color-accent);
  margin: 0 0.25rem;
  animation: heart-beat 2s ease-in-out infinite;
}

@keyframes heart-beat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .page-description {
    font-size: 1rem;
  }

  .footer-content {
    flex-direction: column;
    text-align: center;
  }

  .footer-left,
  .footer-right {
    text-align: center;
  }
}
</style>
