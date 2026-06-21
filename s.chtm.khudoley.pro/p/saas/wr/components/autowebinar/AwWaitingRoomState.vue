<template>
  <div class="wr-page">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            class="hidden sm:flex items-center gap-2 px-3 h-7 rounded-full wr-badge-yellow flex-shrink-0"
          >
            <span class="w-2 h-2 rounded-full wr-dot-yellow animate-pulse"></span>
            <span class="wr-status-yellow text-xs font-semibold uppercase tracking-wider"
              >Скоро начнётся</span
            >
          </div>
          <h1 class="font-semibold text-sm sm:text-base truncate wr-text-primary leading-7">
            {{ autowebinar.title }}
          </h1>
        </div>
        <HeaderActions />
      </div>
    </header>

    <div class="wr-content">
      <div class="wr-player-area">
        <div class="wr-player-wrapper">
          <div class="wr-countdown-box glass flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 pointer-events-none">
              <div
                class="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
              ></div>
              <div
                class="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"
              ></div>
            </div>
            <div class="relative z-10 text-center px-4">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style="background: var(--wr-btn-subtle-bg)"
              >
                <span class="w-1.5 h-1.5 rounded-full wr-dot-yellow animate-pulse"></span>
                <span class="wr-status-yellow text-xs font-medium">Эфир скоро начнётся</span>
              </div>
              <div class="flex items-center justify-center gap-2 sm:gap-4 mb-4">
                <div
                  class="countdown-num-box rounded-xl px-3 sm:px-5 py-3 min-w-[60px] sm:min-w-[80px] text-center"
                >
                  <div class="text-2xl sm:text-3xl font-bold tabular-nums wr-text-primary">
                    {{ countdown.minutes }}
                  </div>
                  <div class="text-[10px] sm:text-xs mt-0.5 wr-text-tertiary">мин</div>
                </div>
                <span class="text-xl font-bold wr-text-muted">:</span>
                <div
                  class="countdown-num-box rounded-xl px-3 sm:px-5 py-3 min-w-[60px] sm:min-w-[80px] text-center"
                >
                  <div class="text-2xl sm:text-3xl font-bold tabular-nums wr-text-primary">
                    {{ countdown.seconds }}
                  </div>
                  <div class="text-[10px] sm:text-xs mt-0.5 wr-text-tertiary">сек</div>
                </div>
              </div>
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
      <div v-if="!isMobileViewport" class="wr-chat-area wr-chat-desktop">
        <div class="wr-chat-header-bar px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span class="font-semibold text-sm wr-text-primary">Чат</span>
          <div class="wr-online-count">
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
          :current-time-seconds="currentWrSeconds"
          :chat-access-mode="autowebinar.chatAccessMode"
          :episode-id="autowebinar.id"
          class="flex-1"
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
              :current-time-seconds="currentWrSeconds"
              :chat-access-mode="autowebinar.chatAccessMode"
              :episode-id="autowebinar.id"
              class="flex-1"
              @new-incoming-message="onNewIncomingMessage"
            />

            <div v-else class="flex-1 flex items-center justify-center p-4">
              <p class="wr-text-tertiary text-sm">Чат недоступен</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import HybridChatScreen from './HybridChatScreen.vue'
import HeaderActions from '../HeaderActions.vue'
import FormButtons from '../episode/FormButtons.vue'
import { apiAutowebinarChatRoute } from '../../api/autowebinar-engine'
import { calculateFakeOnline } from '../../shared/fake-online'
import { useKeyboardOffset } from '../../shared/use-keyboard-offset'

const props = defineProps({
  autowebinar: { type: Object, required: true },
  schedule: { type: Object, required: true },
  scenarioEvents: { type: Array, default: () => [] },
  shownForms: { type: Array, default: () => [] },
  hideCta: { type: Boolean, default: false },
  nameConfirmed: { type: Boolean, default: false }
})

const emit = defineEmits(['open-form'])
const chatLoading = ref(true)
const chatScreen = ref(null)
const hybridChatRef = ref(null)
const hybridMobileChatRef = ref(null)
const mobileChatOpen = ref(false)
const unreadCount = ref(0)
const onlineCount = ref(0)
const { keyboardOffset } = useKeyboardOffset()
const isMobileViewport = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
const now = ref(Date.now())
const scheduledDateOverride = ref(null) // For debug seek
let timer = null

// Current elapsed seconds since waiting room started (for scenario WR events)
const currentWrSeconds = computed(() => {
  if (!props.schedule?.scheduledDate) return 0
  const scheduledMs = scheduledDateOverride.value
    ? scheduledDateOverride.value.getTime()
    : new Date(props.schedule.scheduledDate).getTime()
  return Math.max(0, Math.round((now.value - scheduledMs) / 1000))
})

// Countdown to stream start (scheduledDate + waitingRoomDuration)
const countdown = computed(() => {
  const wrDuration = (props.autowebinar.waitingRoomDuration || 0) * 1000
  const scheduledMs = new Date(props.schedule.scheduledDate).getTime()
  const target = scheduledMs + wrDuration
  const diff = Math.max(0, target - now.value)
  const totalSeconds = Math.floor(diff / 1000)
  return {
    minutes: String(Math.floor(totalSeconds / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0')
  }
})

function updateOnlineCount() {
  const currentMinute = Math.floor(currentWrSeconds.value / 60)
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

  timer = setInterval(() => {
    now.value = Date.now()
    updateOnlineCount()
  }, 1000)

  // Load chat (lazy creation)
  try {
    const data = await apiAutowebinarChatRoute({ scheduleId: props.schedule.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {
    console.error('Failed to load chat:', e)
  }
  chatLoading.value = false

  // Init online count
  updateOnlineCount()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportResize)
  }
  if (timer) clearInterval(timer)
  document.body.style.overflow = ''
})

async function reloadChat() {
  chatLoading.value = true
  try {
    const data = await apiAutowebinarChatRoute({ scheduleId: props.schedule.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {}
  chatLoading.value = false
}

function debugSeek(newOffset) {
  // Update scheduledDate so currentWrSeconds matches newOffset
  if (props.schedule?.scheduledDate) {
    const targetScheduledMs = now.value - newOffset * 1000
    scheduledDateOverride.value = new Date(targetScheduledMs)
  }

  // Reset fake messages for waiting room
  hybridChatRef.value?.resetFakeMessages()
}

// currentElapsedSeconds is 0 during waiting room, but expose for debug panel
const currentElapsedSeconds = computed(() => 0)

defineExpose({ reloadChat, debugSeek, currentElapsedSeconds })
</script>

<style scoped>
.wr-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--wr-bg);
}
.wr-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}
@media (min-width: 1024px) {
  .wr-content {
    flex-direction: row;
  }
}
.wr-player-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.wr-player-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
}
.wr-countdown-box {
  position: absolute;
  inset: 0;
}
@media (min-width: 640px) {
  .wr-countdown-box {
    border-radius: 1rem;
    margin: 0.75rem;
  }
}
.countdown-num-box {
  background: var(--wr-countdown-bg);
}
.wr-chat-desktop {
  display: none;
}
@media (min-width: 1024px) {
  .wr-chat-desktop {
    display: flex;
  }
}
.wr-chat-area {
  flex-direction: column;
  border-left: 1px solid var(--wr-border-light);
}
@media (min-width: 1024px) {
  .wr-chat-area {
    width: 380px;
    flex-shrink: 0;
    max-height: 80vh;
  }
}
.wr-chat-header-bar {
  background: var(--wr-chat-header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--wr-border-light);
}
.wr-online-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
}
.wr-online-count i {
  font-size: 11px;
  color: var(--wr-text-tertiary);
}
.wr-online-count span {
  font-size: 12px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  font-feature-settings: 'tnum';
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
