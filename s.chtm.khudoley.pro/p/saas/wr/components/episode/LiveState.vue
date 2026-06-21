<template>
  <div class="live-page">
    <!-- Header -->
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
            {{ episode.title }}
          </h1>
        </div>
        <HeaderActions :episode="episode">
          <button
            class="cinema-mode-btn flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200"
            :class="cinemaMode ? 'bg-primary/20 text-primary' : 'cinema-mode-btn-inactive'"
            @click="cinemaMode = !cinemaMode"
            :title="cinemaMode ? 'Выйти из режима кинотеатра' : 'Режим кинотеатра'"
          >
            <i class="fas" :class="cinemaMode ? 'fa-compress' : 'fa-expand'"></i>
            <span class="text-xs font-medium">{{ cinemaMode ? 'Обычный' : 'Кинотеатр' }}</span>
          </button>
        </HeaderActions>
      </div>
    </header>

    <!-- Main content -->
    <div class="live-content" :class="{ 'live-content--cinema': cinemaMode }">
      <!-- Player area -->
      <div class="live-player-area">
        <!-- Video Player (Kinescope IFrame Player API) -->
        <div class="live-player-wrapper">
          <div v-if="props.nameConfirmed" class="live-player-iframe relative">
            <div id="kinescope-player" style="width: 100%; height: 100%"></div>
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

        <!-- Form buttons under player -->
        <FormButtons
          :forms="shownForms"
          :episode-id="props.episode.id"
          @open-form="(id) => emit('open-form', id)"
        />

        <!-- Episode info under player -->
        <div class="py-3 px-3 sm:py-4 lg:block">
          <h2 class="font-bold text-base sm:text-lg lg:text-xl mb-1 lg:mb-2 wr-text-primary">
            {{ episode.title }}
          </h2>
          <p
            v-if="episode.description"
            class="text-xs sm:text-sm leading-relaxed line-clamp-2 lg:line-clamp-none wr-text-tertiary"
            v-html="linkifyText(episode.description)"
          ></p>
        </div>
      </div>

      <!-- Desktop Chat -->
      <div class="live-chat-area live-chat-desktop">
        <!-- Chat header -->
        <div class="live-chat-header-bar px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span class="font-semibold text-sm wr-text-primary">Чат вебинара</span>
          <div class="live-online-count" :title="`Сейчас смотрят: ${onlineCount}`">
            <i class="fas fa-eye"></i>
            <span>{{ formattedOnlineCount }}</span>
          </div>
        </div>

        <!-- Chat loading -->
        <div v-if="chatLoading" class="flex-1 flex items-center justify-center p-6">
          <div
            class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <!-- Chat -->
        <ChatScreen
          v-else-if="chatScreen"
          :screen="chatScreen"
          :message-grouping="false"
          :is-admin="isAdmin"
          :episode-id="props.episode.id"
          :chat-access-mode="props.episode.chatAccessMode"
          :online-count="onlineCount"
          :hide-cta="props.hideCta"
          :paid-form-ids="props.paidFormIds"
          :enable-replies="true"
          :enable-reactions="true"
          class="flex-1"
          @open-form="(id) => emit('open-form', id)"
          @new-incoming-message="onNewIncomingMessage"
        />

        <!-- Chat unavailable -->
        <div v-else class="flex-1 flex items-center justify-center p-6">
          <div class="text-center">
            <div
              class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <i class="fas fa-comments text-primary text-xl"></i>
            </div>
            <p class="wr-text-tertiary text-sm">Чат недоступен</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Chat FAB -->
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

    <!-- Mobile bottom bar (forms) -->
    <div
      class="mobile-bottom-bar"
      :class="{ 'mobile-bottom-bar--hidden': mobileChatOpen }"
      v-if="mobileForm"
    >
      <button
        v-if="mobileForm"
        :key="mobileForm.id"
        class="mobile-form-btn"
        :style="
          mobileForm.buttonColor
            ? {
                background: `linear-gradient(135deg, ${mobileForm.buttonColor} 0%, ${mobileForm.buttonColor}dd 100%)`
              }
            : {}
        "
        @click.stop="handleMobileFormClick"
      >
        <span class="mobile-form-btn-text">{{ mobileForm.buttonText }}</span>
      </button>
    </div>

    <!-- Mobile Fullscreen Chat Overlay -->
    <Teleport to="body">
      <Transition name="mobile-chat-overlay">
        <div
          v-if="mobileChatOpen"
          class="mobile-chat-overlay"
          :style="keyboardOffset > 0 ? { paddingBottom: keyboardOffset + 'px' } : {}"
        >
          <!-- Overlay header -->
          <div class="mobile-chat-overlay-header">
            <div class="flex items-center gap-3 min-w-0">
              <span class="font-semibold text-sm wr-text-primary">Чат</span>
              <div class="mobile-chat-overlay-online">
                <i class="fas fa-eye"></i>
                <span>{{ formattedOnlineCount }}</span>
              </div>
            </div>
            <button class="mobile-chat-overlay-close" @click="closeMobileChat">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <!-- Chat content -->
          <div class="mobile-chat-overlay-body">
            <div v-if="chatLoading" class="flex-1 flex items-center justify-center p-6">
              <div
                class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            </div>

            <ChatScreen
              ref="mobileChatRef"
              v-else-if="chatScreen"
              :screen="chatScreen"
              :message-grouping="false"
              :is-admin="isAdmin"
              :episode-id="props.episode.id"
              :chat-access-mode="props.episode.chatAccessMode"
              :online-count="onlineCount"
              :hide-cta="props.hideCta"
              :paid-form-ids="props.paidFormIds"
              :enable-replies="true"
              :enable-reactions="true"
              class="flex-1"
              @message-sent="() => {}"
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import ChatScreen from '../ChatScreen/ChatScreen.vue'
import HeaderActions from '../HeaderActions.vue'
import FormButtons from './FormButtons.vue'
import { getEpisodeChatRoute, apiEpisodeGetOnlineCountRoute } from '../../api/episodes'
import { linkifyText } from '../../shared/linkify'
import { useKeyboardOffset } from '../../shared/use-keyboard-offset'
import { usePlayerAnalytics } from '../../shared/use-player-analytics'
import { trackFormOpened } from '../../shared/use-form-analytics'

const props = defineProps({
  episode: { type: Object, required: true },
  shownForms: { type: Array, default: () => [] },
  hideCta: { type: Boolean, default: false },
  nameConfirmed: { type: Boolean, default: false },
  paidFormIds: { type: Array, default: () => [] }
})

const playerUrl = computed(() => {
  let url = `https://kinescope.io/${props.episode.kinescopeId}`
  if (props.episode.kinescopePlayerId) {
    url += `?player_id=${props.episode.kinescopePlayerId}`
  }
  return url
})

const analytics = usePlayerAnalytics(props.episode.id)
let kinescopePlayer = null

const mobileChatOpen = ref(false)
const cinemaMode = ref(false)
const { keyboardOffset } = useKeyboardOffset()
const mobileChatRef = ref(null)
const chatLoading = ref(true)
const chatScreen = ref(null)
const isAdmin = ctx.user?.is?.('Admin') ?? false
const onlineCount = ref(0)
const unreadCount = ref(0)
const playerLoading = ref(false)
let onlineCountTimer = null

const mobileForm = computed(() => {
  if (props.shownForms.length === 0) return null
  return props.shownForms[props.shownForms.length - 1]
})

const emit = defineEmits(['open-form'])

function openMobileChat() {
  mobileChatOpen.value = true
  unreadCount.value = 0
  document.body.style.overflow = 'hidden'
  nextTick(() => {
    mobileChatRef.value?.scrollToBottom()
  })
}

function onNewIncomingMessage() {
  if (!mobileChatOpen.value) {
    unreadCount.value++
  }
}

function closeMobileChat() {
  mobileChatOpen.value = false
  document.body.style.overflow = ''
}

async function fetchOnlineCount() {
  try {
    const data = await apiEpisodeGetOnlineCountRoute({ episodeId: props.episode.id }).run(ctx)
    onlineCount.value = data.onlineCount
  } catch (e) {
    console.error('Failed to fetch online count:', e)
  }
}

function initKinescopePlayer() {
  if (!props.nameConfirmed || !props.episode.kinescopeId) return

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
    const container = document.getElementById('kinescope-player')
    if (!container) return

    playerFactory
      .create('kinescope-player', {
        url: playerUrl.value,
        size: { width: '100%', height: '100%' },
        behavior: {
          autoPlay: true,
          muted: false
        }
      })
      .then((player) => {
        kinescopePlayer = player

        // Hide loading overlay when player is ready
        player.once('ready', () => {
          playerLoading.value = false
        })

        analytics.setupPlayer(player)
      })
      .catch((err) => {
        console.error('Kinescope player creation error:', err)
        playerLoading.value = false
      })
  }
}

onMounted(async () => {
  if (props.nameConfirmed) {
    initKinescopePlayer()
  }

  try {
    const data = await getEpisodeChatRoute({ id: props.episode.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {
    console.error('Failed to load chat:', e)
  }
  chatLoading.value = false

  await fetchOnlineCount()
  onlineCountTimer = setInterval(fetchOnlineCount, 10000)
})

watch(
  () => props.nameConfirmed,
  (confirmed) => {
    if (confirmed && !kinescopePlayer) {
      nextTick(() => {
        if (!window.onKinescopeIframeAPIReady) {
          initKinescopePlayer()
        } else {
          const container = document.getElementById('kinescope-player')
          if (container) {
            window.onKinescopeIframeAPIReady.__trigger?.()
          }
        }
      })
    }
  }
)

onUnmounted(() => {
  if (onlineCountTimer) clearInterval(onlineCountTimer)
  document.body.style.overflow = ''
  analytics.destroy()
  kinescopePlayer = null
})

const formattedOnlineCount = computed(() => {
  return onlineCount.value.toLocaleString('ru-RU')
})

function handleMobileFormClick() {
  if (mobileForm.value && props.episode.id) {
    trackFormOpened(
      props.episode.id,
      mobileForm.value.id,
      mobileForm.value.title,
      mobileForm.value.submitAction
    )
  }
  emit('open-form', mobileForm.value.id)
}

async function reloadChat() {
  chatLoading.value = true
  try {
    const data = await getEpisodeChatRoute({ id: props.episode.id }).run(ctx)
    chatScreen.value = data.chat
  } catch (e) {
    console.error('Failed to reload chat:', e)
  }
  chatLoading.value = false
}

async function exitFullscreen() {
  try {
    if (kinescopePlayer && typeof kinescopePlayer.setFullscreen === 'function') {
      await kinescopePlayer.setFullscreen(false)
    }
  } catch (e) {
    console.error('Failed to exit fullscreen:', e)
  }
}

defineExpose({ reloadChat, exitFullscreen })
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
  transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.live-content--cinema {
  max-width: 100%;
}

@media (min-width: 1024px) {
  .live-content {
    flex-direction: row;
    /* height: 80vh;
    max-height: 80vh; */
  }
}

@media (min-width: 3200px) {
  .live-content {
    height: 90vh;
    max-height: 90vh;
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

.inline-form-iframe {
  width: 100%;
  min-height: 800px;
  border: none;
  border-radius: 12px;
  background: inherit;
}

.cinema-mode-btn {
  display: none;
}

.cinema-mode-btn-inactive {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
}
.cinema-mode-btn-inactive:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

@media (min-width: 1300px) {
  .cinema-mode-btn {
    display: flex;
  }
}

/* Desktop chat */
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
  flex-shrink: 0;
  cursor: default;
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

/* ===== Mobile Chat FAB ===== */
.mobile-chat-fab {
  display: none;
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 45;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(216, 28, 81, 0.5);
  background: linear-gradient(135deg, rgba(216, 28, 81, 0.9) 0%, rgba(181, 22, 63, 0.95) 100%);
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  box-shadow:
    0 0 20px rgba(216, 28, 81, 0.3),
    0 4px 24px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1023px) {
  .mobile-chat-fab {
    display: flex;
  }
}

.mobile-chat-fab:active {
  transform: scale(0.9);
}

.mobile-chat-fab--hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.5);
}

.mobile-chat-fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(216, 28, 81, 0.4);
  animation: fab-ring-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes fab-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 0;
  }
}

.mobile-chat-fab-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #d81c51;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* ===== Mobile bottom bar (forms/promo) ===== */
.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 16px;
  right: 80px;
  z-index: 44;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

@media (max-width: 1023px) {
  .mobile-bottom-bar {
    display: flex;
  }
}

.mobile-bottom-bar--hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
}

/* ===== Mobile Fullscreen Chat Overlay ===== */
.mobile-chat-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: var(--wr-bg);
}

@media (min-width: 1024px) {
  .mobile-chat-overlay {
    display: none !important;
  }
}

.mobile-chat-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: var(--wr-chat-header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--wr-border);
  flex-shrink: 0;
}

.mobile-chat-overlay-online {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
}

.mobile-chat-overlay-online i {
  font-size: 10px;
  color: var(--wr-text-tertiary);
}

.mobile-chat-overlay-online span {
  font-size: 11px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  font-feature-settings: 'tnum';
}

.mobile-chat-overlay-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--wr-border);
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-chat-overlay-close:active {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
  transform: scale(0.9);
}

.mobile-chat-overlay-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Overlay transition */
.mobile-chat-overlay-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.mobile-chat-overlay-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.mobile-chat-overlay-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.mobile-chat-overlay-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* Mobile form buttons */
.mobile-form-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  min-height: 44px;
  box-sizing: border-box;
  border-radius: 22px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  line-height: 1.3;
  white-space: normal;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  flex-shrink: 1;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: visible;
  background: linear-gradient(135deg, #d81c51 0%, #b5163f 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(216, 28, 81, 0.3);
  animation: mobile-form-pulse 2s ease-in-out infinite;
}

.mobile-form-btn::before,
.mobile-form-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 22px;
  border: 2px solid rgba(216, 28, 81, 0.6);
  pointer-events: none;
  animation: mobile-form-wave 2.5s ease-out infinite;
}

.mobile-form-btn::after {
  animation-delay: 1s;
}

@keyframes mobile-form-wave {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  70% {
    opacity: 0;
    transform: scale(1.15, 1.6);
  }
  100% {
    opacity: 0;
    transform: scale(1.15, 1.6);
  }
}

.mobile-form-btn-text {
  flex-shrink: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-form-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 6px rgba(216, 28, 81, 0.3);
}

.mobile-form-btn:active::before,
.mobile-form-btn:active::after {
  animation: none;
  opacity: 0;
}

@keyframes mobile-form-pulse {
  0%,
  100% {
    box-shadow: 0 2px 12px rgba(216, 28, 81, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(216, 28, 81, 0.5);
  }
}

:global(.theme-light) .mobile-chat-fab {
  background: linear-gradient(135deg, rgba(216, 28, 81, 0.95) 0%, rgba(181, 22, 63, 1) 100%);
  border-color: rgba(216, 28, 81, 0.6);
  box-shadow:
    0 0 20px rgba(216, 28, 81, 0.4),
    0 4px 24px rgba(0, 0, 0, 0.15);
}
</style>
