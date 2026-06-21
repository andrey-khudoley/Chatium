<template>
  <div class="live-page">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            class="hidden sm:flex items-center gap-2 px-3 h-7 rounded-full wr-badge-red flex-shrink-0"
          >
            <span class="w-2 h-2 rounded-full wr-dot-red animate-pulse"></span>
            <span class="wr-status-red text-xs font-semibold uppercase tracking-wider">Live</span>
          </div>
          <h1 class="font-semibold text-sm sm:text-base truncate wr-text-primary leading-7">
            {{ autowebinar.title }}
          </h1>
        </div>
        <HeaderActions />
      </div>
    </header>

    <div class="live-content">
      <div class="live-player-area">
        <div class="live-player-wrapper">
          <div v-if="props.nameConfirmed" class="live-player-iframe relative">
            <div id="kinescope-aw-player" style="width: 100%; height: 100%"></div>
            <div v-if="playerLoading" class="live-player-loading">
              <div
                class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            </div>
          </div>
          <div v-else class="live-player-iframe flex items-center justify-center">
            <div class="text-center">
              <div
                class="w-16 h-16 rounded-2xl glass mx-auto mb-4 flex items-center justify-center"
              >
                <i class="fas fa-play text-primary text-2xl"></i>
              </div>
              <p class="wr-text-tertiary text-sm">Подтвердите имя, чтобы начать просмотр</p>
            </div>
          </div>
        </div>

        <FormButtons
          :forms="shownForms"
          :episode-id="autowebinar.id"
          @open-form="(id) => emit('open-form', id)"
        />

        <div class="py-3 px-3 sm:py-4 lg:block">
          <h2 class="font-bold text-base sm:text-lg lg:text-xl mb-1 lg:mb-2 wr-text-primary">
            {{ autowebinar.title }}
          </h2>
          <p
            v-if="autowebinar.description"
            class="text-xs sm:text-sm leading-relaxed line-clamp-2 lg:line-clamp-none wr-text-tertiary"
          >
            {{ autowebinar.description }}
          </p>
        </div>
      </div>

      <!-- Desktop Chat (hybrid: scenario fake messages + real Feed) -->
      <div v-if="!isMobileViewport" class="live-chat-area live-chat-desktop">
        <div class="live-chat-header-bar px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span class="font-semibold text-sm wr-text-primary">Чат вебинара</span>
          <div class="live-online-count">
            <i class="fas fa-eye"></i>
            <span>{{ onlineCount }}</span>
          </div>
        </div>
        <div v-if="chatLoading" class="flex-1 flex items-center justify-center p-6">
          <div
            class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
        <HybridChatScreen
          v-else-if="chatScreen"
          ref="hybridChatRef"
          :screen="chatScreen"
          :scenario-events="scenarioEvents"
          :current-time-seconds="currentElapsedSeconds"
          :chat-access-mode="autowebinar.chatAccessMode"
          :episode-id="autowebinar.id"
          :hide-cta="props.hideCta"
          class="flex-1"
          @open-form="(id) => emit('open-form', id)"
          @new-incoming-message="onNewIncomingMessage"
        />
        <div v-else class="flex-1 flex items-center justify-center p-6">
          <p class="wr-text-tertiary text-sm">Чат недоступен</p>
        </div>
      </div>
    </div>

    <button
      class="mobile-chat-fab"
      @click="openMobileChat"
      :class="{ 'mobile-chat-fab--hidden': mobileChatOpen }"
    >
      <span class="mobile-chat-fab-ring"></span>
      <i class="fas fa-comments"></i>
      <span v-if="unreadCount > 0" class="mobile-chat-fab-badge">{{
        unreadCount > 99 ? '99+' : unreadCount
      }}</span>
    </button>

    <Teleport to="body">
      <Transition name="mobile-chat-overlay">
        <div
          v-if="mobileChatOpen"
          class="mobile-chat-overlay"
          :style="keyboardOffset > 0 ? { paddingBottom: keyboardOffset + 'px' } : {}"
        >
          <div class="mobile-chat-overlay-header">
            <div class="flex items-center gap-3 min-w-0">
              <span class="font-semibold text-sm wr-text-primary">Чат</span>
              <div class="mobile-chat-overlay-online">
                <i class="fas fa-eye"></i>
                <span>{{ onlineCount }}</span>
              </div>
            </div>
            <button class="mobile-chat-overlay-close" @click="closeMobileChat">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <div class="mobile-chat-overlay-body">
            <div v-if="chatLoading" class="flex-1 flex items-center justify-center p-6">
              <div
                class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            </div>

            <HybridChatScreen
              ref="hybridMobileChatRef"
              v-else-if="chatScreen"
              :screen="chatScreen"
              :scenario-events="scenarioEvents"
              :current-time-seconds="currentElapsedSeconds"
              :chat-access-mode="autowebinar.chatAccessMode"
              :episode-id="autowebinar.id"
              :hide-cta="props.hideCta"
              class="flex-1"
              @open-form="(id) => emit('open-form', id)"
              @new-incoming-message="onNewIncomingMessage"
            />

            <div v-else class="flex-1 flex items-center justify-center p-4">
              <p class="wr-text-tertiary text-sm">Чат недоступен</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <FloatingReactions ref="reactionsRef" :episode-id="autowebinar.id" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import HybridChatScreen from './HybridChatScreen.vue'
import HeaderActions from '../HeaderActions.vue'
import FormButtons from '../episode/FormButtons.vue'
import FloatingReactions from '../episode/FloatingReactions.vue'
import { apiAutowebinarChatRoute, apiAutowebinarScenarioRoute } from '../../api/autowebinar-engine'
import { apiFormByIdRoute } from '../../api/forms'
import { trackFormShown } from '../../shared/use-form-analytics'
import { usePlayerAnalytics } from '../../shared/use-player-analytics'
import { calculateFakeOnline } from '../../shared/fake-online'
import { useKeyboardOffset } from '../../shared/use-keyboard-offset'

const props = defineProps({
  autowebinar: { type: Object, required: true },
  schedule: { type: Object, required: true },
  shownForms: { type: Array, default: () => [] },
  hideCta: { type: Boolean, default: false },
  nameConfirmed: { type: Boolean, default: false }
})

const emit = defineEmits(['open-form', 'update-shown-forms', 'hide-form'])
const reactionsRef = ref(null)
const chatLoading = ref(true)
const chatScreen = ref(null)
const hybridChatRef = ref(null)
const hybridMobileChatRef = ref(null)
const mobileChatOpen = ref(false)
const unreadCount = ref(0)
const onlineCount = ref(0)
const playerLoading = ref(false)
const analytics = usePlayerAnalytics(props.autowebinar.id)
const { keyboardOffset } = useKeyboardOffset()
const scenarioEvents = ref([])
const isMobileViewport = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
const now = ref(Date.now())
const startedAtOverride = ref(null)
let timer = null
let kinescopePlayer = null
const processedEventIds = new Set()

// Pagination (только для future-событий)
const allEventsLoaded = ref(false)
const isLoadingMoreEvents = ref(false)
let serverNextOffset = 0

const currentElapsedSeconds = computed(() => {
  if (!props.schedule?.startedAt) return 0
  const startedAt = startedAtOverride.value
    ? startedAtOverride.value.getTime()
    : new Date(props.schedule.startedAt).getTime()
  return Math.max(0, Math.round((now.value - startedAt) / 1000))
})

const playerUrl = computed(() => {
  const videoId = props.autowebinar.kinescopeVideoId
  const playerId = props.autowebinar.kinescopePlayerId
  if (!videoId) return ''
  let url = `https://kinescope.io/${videoId}`
  if (playerId) url += `?player_id=${playerId}`
  return url
})

// ====== ФАЗА 1: Обработка прошедших событий (с сервера приходят БЕЗ реакций) ======
function processPastEvents(pastEvents) {
  for (const evt of pastEvents) {
    processedEventIds.add(evt.id)

    if (evt.eventType === 'show_form' && evt.formId && !props.hideCta) {
      apiFormByIdRoute({ id: evt.formId })
        .run(ctx)
        .then((formData) => {
          const storageKey = `form_shown_${props.autowebinar.id}_${formData.id}`
          if (!localStorage.getItem(storageKey)) {
            trackFormShown(props.autowebinar.id, formData.id, formData.title, formData.submitAction)
            localStorage.setItem(storageKey, 'true')
          }
          emit('update-shown-forms', formData)
        })
        .catch(() => {})
    }

    if (evt.eventType === 'hide_form' && evt.formId) {
      emit('hide-form', evt.formId)
    }
  }
}

// ====== ФАЗА 2: Тик таймера — обрабатывает будущие события (с popup + реакции) ======
function processNewEvents() {
  const elapsed = currentElapsedSeconds.value

  for (const evt of scenarioEvents.value) {
    if (evt.offsetSeconds > elapsed) break
    if (processedEventIds.has(evt.id)) continue

    processedEventIds.add(evt.id)

    switch (evt.eventType) {
      case 'show_form':
        if (evt.formId && !props.hideCta) {
          apiFormByIdRoute({ id: evt.formId })
            .run(ctx)
            .then((formData) => {
              const storageKey = `form_shown_${props.autowebinar.id}_${formData.id}`
              if (!localStorage.getItem(storageKey)) {
                trackFormShown(
                  props.autowebinar.id,
                  formData.id,
                  formData.title,
                  formData.submitAction
                )
                localStorage.setItem(storageKey, 'true')
              }
              emit('update-shown-forms', formData)
              emit('open-form', formData.id)
            })
            .catch(() => {})
        }
        break
      case 'hide_form':
        if (evt.formId) {
          emit('hide-form', evt.formId)
        }
        break
      case 'reaction':
        if (evt.reactionData?.emoji) {
          const count = evt.reactionData.count || 1
          for (let i = 0; i < count; i++) {
            reactionsRef.value?.handleSocketReaction(evt.reactionData.emoji)
          }
        }
        break
    }
  }

  const remainingEvents = scenarioEvents.value.filter(
    (evt) => !processedEventIds.has(evt.id)
  ).length
  if (remainingEvents < 100 && !allEventsLoaded.value && !isLoadingMoreEvents.value) {
    loadMoreEvents()
  }
}

async function loadMoreEvents() {
  if (allEventsLoaded.value || isLoadingMoreEvents.value) return
  isLoadingMoreEvents.value = true
  try {
    const elapsed = currentElapsedSeconds.value
    const scenarioData = await apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinar.id })
      .query({ mode: 'future', elapsedSeconds: String(elapsed), offset: String(serverNextOffset) })
      .run(ctx)
    if (!scenarioData.hasMore) {
      allEventsLoaded.value = true
    }
    serverNextOffset = scenarioData.nextOffset
    scenarioEvents.value.push(...scenarioData.events)
  } catch (e) {
    console.error('Failed to load more events:', e)
  } finally {
    isLoadingMoreEvents.value = false
  }
}

function startTicker() {
  if (timer) return
  timer = setInterval(() => {
    now.value = Date.now()
    processNewEvents()
    updateOnlineCount()
  }, 1000)
}

function initKinescopePlayer() {
  if (!props.nameConfirmed || !props.autowebinar.kinescopeVideoId) return
  playerLoading.value = true

  const tag = document.createElement('script')
  tag.src = 'https://player.kinescope.io/latest/iframe.player.js'
  const first = document.getElementsByTagName('script')[0]
  if (first && first.parentNode) {
    first.parentNode.insertBefore(tag, first)
  } else {
    document.head.appendChild(tag)
  }

  window.onKinescopeIframeAPIReady = (playerFactory) => {
    const container = document.getElementById('kinescope-aw-player')
    if (!container) return
    const currentOffset = currentElapsedSeconds.value

    playerFactory
      .create('kinescope-aw-player', {
        url: playerUrl.value,
        size: { width: '100%', height: '100%' },
        behavior: { autoPlay: true, muted: false }
      })
      .then((player) => {
        kinescopePlayer = player
        analytics.setupPlayer(player)
        player.once('ready', () => {
          playerLoading.value = false
        })
        if (currentOffset > 0) {
          player.seekTo(currentOffset)
        }
      })
      .catch((err) => {
        console.error('Kinescope player creation error:', err)
        playerLoading.value = false
      })
  }
}

function updateOnlineCount() {
  const currentMinute = Math.floor(currentElapsedSeconds.value / 60)
  onlineCount.value = calculateFakeOnline(
    currentMinute,
    props.autowebinar.fakeOnlineConfig,
    props.autowebinar.duration
  )
}

function openMobileChat() {
  mobileChatOpen.value = true
  unreadCount.value = 0
  document.body.style.overflow = 'hidden'
  nextTick(() => {
    hybridMobileChatRef.value?.scrollToBottom?.()
  })
}

function closeMobileChat() {
  mobileChatOpen.value = false
  document.body.style.overflow = ''
}

function onNewIncomingMessage() {
  if (!mobileChatOpen.value) {
    unreadCount.value++
  }
}

function handleViewportResize() {
  isMobileViewport.value = window.innerWidth < 1024
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleViewportResize)
  }

  if (props.nameConfirmed) {
    initKinescopePlayer()
  }

  const elapsed = currentElapsedSeconds.value

  // Два параллельных запроса: прошедшие (без реакций) и будущие (все типы)
  const [pastData, futureData] = await Promise.all([
    apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinar.id })
      .query({ mode: 'past', elapsedSeconds: String(elapsed) })
      .run(ctx)
      .catch((e) => {
        console.error('Failed to load past events:', e)
        return null
      }),
    apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinar.id })
      .query({ mode: 'future', elapsedSeconds: String(elapsed) })
      .run(ctx)
      .catch((e) => {
        console.error('Failed to load future events:', e)
        return null
      })
  ])

  // Фаза 1: обработать прошедшие события (кнопки + чат-сообщения, без popup, без реакций)
  if (pastData) {
    processPastEvents(pastData.events)
    // Прошедшие чат-сообщения тоже кладём в scenarioEvents для HybridChatScreen
    scenarioEvents.value.push(...pastData.events)
  }

  // Будущие события — в scenarioEvents для тикера
  if (futureData) {
    scenarioEvents.value.push(...futureData.events)
    serverNextOffset = futureData.nextOffset
    if (!futureData.hasMore) allEventsLoaded.value = true
  }

  // Фаза 2: запускаем тикер — новые события обрабатываются с popup + реакциями
  updateOnlineCount()
  startTicker()

  // Загрузка чата (не блокирует фазы)
  try {
    const data = await apiAutowebinarChatRoute({ scheduleId: props.schedule.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {
    console.error('Failed to load chat:', e)
  }
  chatLoading.value = false
})

watch(
  () => props.nameConfirmed,
  (confirmed) => {
    if (confirmed && !kinescopePlayer) {
      nextTick(() => initKinescopePlayer())
    }
  }
)

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportResize)
  }
  if (timer) clearInterval(timer)
  analytics.destroy()
  kinescopePlayer = null
  document.body.style.overflow = ''
})

function handleReaction(emoji) {
  reactionsRef.value?.handleSocketReaction(emoji)
}

async function reloadChat() {
  chatLoading.value = true
  try {
    const data = await apiAutowebinarChatRoute({ scheduleId: props.schedule.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {}
  chatLoading.value = false
}

async function exitFullscreen() {
  try {
    if (kinescopePlayer && typeof kinescopePlayer.setFullscreen === 'function') {
      await kinescopePlayer.setFullscreen(false)
    }
  } catch (e) {}
}

async function debugSeek(newOffset) {
  if (props.schedule?.startedAt) {
    const targetStartedAt = now.value - newOffset * 1000
    startedAtOverride.value = new Date(targetStartedAt)
  }

  if (kinescopePlayer && typeof kinescopePlayer.seekTo === 'function') {
    kinescopePlayer.seekTo(newOffset)
  }

  if (timer) {
    clearInterval(timer)
    timer = null
  }
  processedEventIds.clear()
  serverNextOffset = 0
  allEventsLoaded.value = false

  const elapsed = Math.max(0, newOffset)

  const [pastData, futureData] = await Promise.all([
    apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinar.id })
      .query({ mode: 'past', elapsedSeconds: String(elapsed) })
      .run(ctx)
      .catch(() => null),
    apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinar.id })
      .query({ mode: 'future', elapsedSeconds: String(elapsed) })
      .run(ctx)
      .catch(() => null)
  ])

  // Собираем новые события ДО сброса — чтобы сразу заменить, не мерцая
  const newEvents = []
  if (pastData) {
    processPastEvents(pastData.events)
    newEvents.push(...pastData.events)
  }
  if (futureData) {
    newEvents.push(...futureData.events)
    serverNextOffset = futureData.nextOffset
    if (!futureData.hasMore) allEventsLoaded.value = true
  }

  // Атомарная замена: сброс фейков + новые события + явная пересинхронизация
  scenarioEvents.value = newEvents
  hybridChatRef.value?.resetFakeMessages()

  // Ждём обновления computed currentElapsedSeconds и затем пересинхронизируем фейки
  await nextTick()
  hybridChatRef.value?.syncFakeMessages()

  startTicker()
}

defineExpose({ reloadChat, exitFullscreen, handleReaction, debugSeek, currentElapsedSeconds })
</script>

<style scoped>
.live-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--wr-bg);
}
.live-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}
@media (min-width: 1024px) {
  .live-content {
    flex-direction: row;
  }
}
.live-player-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: visible;
}
.live-player-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
}
@media (min-width: 640px) {
  .live-player-wrapper {
    margin: 0.75rem;
    width: calc(100% - 1.5rem);
  }
}
.live-player-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
@media (min-width: 640px) {
  .live-player-iframe {
    border-radius: 1rem;
  }
}
.live-chat-desktop {
  display: none;
}
@media (min-width: 1024px) {
  .live-chat-desktop {
    display: flex;
  }
}
.live-chat-area {
  flex-direction: column;
  border-left: 1px solid var(--wr-border-light);
}
@media (min-width: 1024px) {
  .live-chat-area {
    width: 380px;
    flex-shrink: 0;
    max-height: 80vh;
  }
}
.live-chat-header-bar {
  background: var(--wr-chat-header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--wr-border-light);
}
.live-online-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
}
.live-online-count i {
  font-size: 11px;
  color: var(--wr-text-tertiary);
}
.live-online-count span {
  font-size: 12px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  font-feature-settings: 'tnum';
}
.live-player-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wr-bg);
  z-index: 10;
}

.mobile-chat-fab {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
  width: 58px;
  height: 58px;
  border-radius: 9999px;
  background: var(--primary-color, #6366f1);
  color: #fff;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 55;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
@media (min-width: 1024px) {
  .mobile-chat-fab {
    display: none;
  }
}
.mobile-chat-fab--hidden {
  opacity: 0;
  pointer-events: none;
}
.mobile-chat-fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
}
.mobile-chat-fab-badge {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  border-radius: 9999px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  background: #ef4444;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-chat-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--wr-bg);
  display: flex;
  flex-direction: column;
}
@media (min-width: 1024px) {
  .mobile-chat-overlay {
    display: none;
  }
}
.mobile-chat-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--wr-border-light);
  background: var(--wr-chat-header-bg);
}
.mobile-chat-overlay-online {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
  font-size: 12px;
}
.mobile-chat-overlay-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 0;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-primary);
}
.mobile-chat-overlay-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.mobile-chat-overlay-enter-active,
.mobile-chat-overlay-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}
.mobile-chat-overlay-enter-from,
.mobile-chat-overlay-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
