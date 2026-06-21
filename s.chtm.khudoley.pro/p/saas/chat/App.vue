<template>
  <div ref="appRef" class="app">
    <!-- Главный вид: список чатов или выбранный чат -->
    <div v-if="currentView === 'chats'" class="main-view">
      <div ref="sidebarRef" class="sidebar-wrapper" :style="{ width: sidebarWidth + 'px' }">
        <!-- Глобальный аудиоплеер в списке чатов -->
        <GlobalAudioPlayer v-if="!selectedChat" />
        <ChatsList
          ref="chatsListRef"
          :chats="chatsList"
          :selected-chat="selectedChat"
          :invites="invites"
          :inbox-badges="inboxBadges"
          @select-chat="selectChat"
          @show-profile="currentView = 'profile'"
          @show-settings="currentView = 'settings'"
          @create-chat="showCreateModal = true"
          @accept-invite="handleInviteAccepted"
          @decline-invite="handleInviteDeclined"
          @go-to-message="handleGoToMessage"
          @chat-created="handleChatCreated"
        />
        <!-- Resize handle -->
        <div
          class="resize-handle"
          :class="{ resizing: isResizing }"
          @mousedown="startResize"
          title="Изменить ширину"
        >
          <div class="resize-indicator"></div>
        </div>
      </div>

      <!-- Область чата или приветствия -->
      <div :class="['content-area', { 'chat-active': selectedChat }]">
        <!-- Глобальный аудиоплеер в чате -->
        <GlobalAudioPlayer v-if="selectedChat" class="chat-player" />
        <ChatView
          v-if="selectedChat"
          :feed-id="selectedChat"
          :chats-list="chatsList"
          :user-socket-id="userSocketId"
          :target-message-id="targetMessageId"
          @back="closeChat"
          @select-chat="selectChat"
          @profile="currentView = 'profile'"
          @create-chat="showCreateModal = true"
          @message-viewed="targetMessageId = null"
          @chat-deleted="handleChatDeleted"
          @chat-left="handleChatLeft"
          @chat-updated="handleChatUpdated"
          @badge-reset="handleBadgeReset"
        />
        <WelcomeView v-else @create-chat="showCreateModal = true" />
      </div>
    </div>

    <!-- Вид профиля -->
    <ProfileView v-else-if="currentView === 'profile'" @back="currentView = 'chats'" />

    <!-- Вид настроек чатов -->
    <ChatSettings
      v-else-if="currentView === 'settings'"
      :user="currentUser"
      :chats="chatsList"
      @back="currentView = 'chats'"
      @select-chat="selectChatFromSettings"
    />

    <!-- Глобальная модалка создания чата -->
    <CreateChatModal
      v-if="showCreateModal"
      :is-admin="currentUser?.accountRole === 'Owner' || currentUser?.accountRole === 'Admin'"
      :user="currentUser"
      @close="showCreateModal = false"
      @created="onChatCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, computed, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import ChatsList from './components/ChatsList.vue'
import ChatView from './components/ChatView.vue'
import ProfileView from './components/ProfileView.vue'
import ChatSettings from './components/ChatSettings.vue'
import WelcomeView from './components/WelcomeView.vue'
import CreateChatModal from './components/CreateChatModal.vue'
import GlobalAudioPlayer from './components/GlobalAudioPlayer.vue'
import { apiChatsListRoute } from './api/chats'
import { apiInvitesMyRoute } from './api/invites'
import { apiProfileGetRoute } from './api/profile'
import { useScale } from './composables/useScale'
import { apiInboxBadgesGetRoute } from './api/inbox-badges'

const props = defineProps({
  userSocketId: String
})

// Делаем userSocketId доступным через provide для дочерних компонентов
provide('userSocketId', props.userSocketId)

const currentView = ref('chats')
const selectedChat = ref(null)
const targetMessageId = ref(null)
const chatsList = ref([])
const invites = ref([])
const showCreateModal = ref(false)
const chatsListRef = ref(null)
const currentUser = ref(null)
const appRef = ref(null)
const inboxBadges = ref(new Map())

// Масштабирование интерфейса
const { scale, sidebarWidth, setSidebarWidth } = useScale()

// Масштабирование интерфейса
// Масштаб инициализируется в useScale.ts и применяется через CSS переменную --ui-scale
// Следим за изменением масштаба для синхронизации
watch(scale, (newScale) => {
  // CSS переменная уже обновлена в setScale() из useScale
  // console.log('Scale changed to:', newScale + '%')
})

const isResizing = ref(false)
const sidebarRef = ref(null)

// Обновление lastMessage для чата при получении нового сообщения
function updateChatLastMessage(feedId, message) {
  const chatIndex = chatsList.value.findIndex((c) => c.feedId === feedId)
  if (chatIndex !== -1) {
    // Нормализуем поля сообщения (WebSocket присылает snake_case)
    const normalizedMessage = {
      ...message,
      createdBy: message.createdBy || message.created_by,
      updatedBy: message.updatedBy || message.updated_by,
      createdAt: message.createdAt || message.created_at,
      updatedAt: message.updatedAt || message.updated_at
    }
    chatsList.value[chatIndex] = {
      ...chatsList.value[chatIndex],
      lastMessage: normalizedMessage,
      updatedAt: normalizedMessage.createdAt
    }
  }
}

function selectChat(feedId) {
  selectedChat.value = feedId
  targetMessageId.value = null
}

function selectChatFromSettings(feedId) {
  currentView.value = 'chats'
  selectedChat.value = feedId
  targetMessageId.value = null
  window.location.hash = `#/chat/${feedId}`
}

function handleBadgeReset() {
  // При сбросе badge перезагружаем inbox
  loadInboxBadges()
}

function closeChat() {
  selectedChat.value = null
  targetMessageId.value = null
  // Очищаем hash
  if (window.location.hash.startsWith('#/chat/')) {
    window.location.hash = ''
  }
}

// Обработка удаления чата
function handleChatDeleted(feedId) {
  // Удаляем чат из списка
  chatsList.value = chatsList.value.filter((c) => c.feedId !== feedId)
  // Закрываем чат (если он ещё открыт)
  if (selectedChat.value === feedId) {
    closeChat()
  }
}

// Обработка выхода из чата/отписки от канала
async function handleChatLeft(feedId) {
  // Удаляем чат из списка
  chatsList.value = chatsList.value.filter((c) => c.feedId !== feedId)
  // Закрываем чат
  if (selectedChat.value === feedId) {
    closeChat()
  }
  // Перезагружаем список чатов с сервера для гарантии
  await loadChats()
}

// Обработка обновления чата (аватарка, название и т.д.)
async function handleChatUpdated(feedId) {
  // Перезагружаем список чатов чтобы обновить аватарку и другие данные
  await loadChats()
}

// Переход к сообщению из поиска
function handleGoToMessage({ feedId, messageId, chatTitle }) {
  selectedChat.value = feedId
  targetMessageId.value = messageId
  // Обновляем hash
  window.location.hash = `#/chat/${feedId}`
}

async function onChatCreated(feedId) {
  showCreateModal.value = false

  // Небольшая задержка, чтобы Feed API успел обновить данные
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Перезагружаем список чатов
  if (chatsListRef.value) {
    await chatsListRef.value.reload()
  }
  await loadChats()
  await loadInvites()
  selectedChat.value = feedId
  targetMessageId.value = null
}

// Обработка создания чата из поиска пользователей
async function handleChatCreated() {
  // Перезагружаем список чатов
  await loadChats()
}

async function loadChats() {
  try {
    const response = await apiChatsListRoute.run(ctx)
    chatsList.value = response.chats

    // Загружаем inbox данные для счетчиков непрочитанных
    await loadInboxBadges()
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error)
  }
}

async function loadInboxBadges() {
  try {
    const response = await apiInboxBadgesGetRoute.run(ctx)
    inboxBadges.value = new Map(Object.entries(response.badges))
  } catch (error) {
    console.error('Ошибка загрузки inbox badges:', error)
  }
}

async function loadInvites() {
  try {
    const response = await apiInvitesMyRoute.run(ctx)
    invites.value = response.invites
  } catch (error) {
    console.error('Ошибка загрузки приглашений:', error)
  }
}

function handleInviteAccepted() {
  // При принятии приглашения обновляем списки
  loadChats()
  loadInvites()
}

function handleInviteDeclined() {
  // При отклонении приглашения обновляем список приглашений
  loadInvites()
}

// Подписка на вебсокет-события с fallback polling
let fallbackChatsPollTimer = null

function startChatsFallbackPolling() {
  if (fallbackChatsPollTimer) clearInterval(fallbackChatsPollTimer)
  fallbackChatsPollTimer = setInterval(async () => {
    // Просто перезагружаем список чатов каждые 30 секунд если WebSocket неактивен
    await loadChats()
    await loadInvites()
  }, 30000)
}

function stopChatsFallbackPolling() {
  if (fallbackChatsPollTimer) {
    clearInterval(fallbackChatsPollTimer)
    fallbackChatsPollTimer = null
  }
}

async function setupSocketSubscription() {
  if (!props.userSocketId) return

  try {
    const socketClient = await getOrCreateBrowserSocketClient()

    // Подписка на события пользователя
    const userSubscription = socketClient.subscribeToData(props.userSocketId)

    userSubscription.listen((data) => {
      if (data.type === 'invite-event') {
        if (data.event === 'new-invite') {
          invites.value.unshift(data.invite)
        } else if (data.event === 'invite-accepted') {
          loadChats()
          invites.value = invites.value.filter((i) => i.id !== data.inviteId)
        } else if (data.event === 'invite-declined') {
          invites.value = invites.value.filter((i) => i.id !== data.inviteId)
        } else if (data.event === 'invite-revoked') {
          invites.value = invites.value.filter((i) => i.id !== data.inviteId)
        }
      } else if (data.type === 'chat-event') {
        if (data.event === 'new-message') {
          updateChatLastMessage(data.feedId, data.message)
          // Перезагружаем badges если сообщение не в открытом чате
          if (data.feedId !== selectedChat.value) {
            loadInboxBadges()
          }
        } else if (data.event === 'new-participant') {
          loadChats()
        }
      } else if (data.type === 'inbox-update') {
        loadInboxBadges()
      }
    })

    // Подписка на inbox события
    const inboxSocketId = `${ctx.user.id}/inbox`
    const inboxSubscription = socketClient.subscribeToData(inboxSocketId)

    inboxSubscription.listen(() => {
      // Любое обновление inbox - перезагружаем badges
      loadInboxBadges()
    })

    // Запускаем fallback polling для списка чатов
    startChatsFallbackPolling()

    return () => {
      userSubscription.unsubscribe()
      inboxSubscription.unsubscribe()
      stopChatsFallbackPolling()
    }
  } catch (error) {
    console.error('Ошибка подписки на вебсокет:', error)
    // При ошибке запускаем fallback polling
    startChatsFallbackPolling()
  }
}

async function loadCurrentUser() {
  try {
    const response = await apiProfileGetRoute.run(ctx)
    currentUser.value = response.user
    // console.log('Loaded user:', response.user, 'accountRole:', response.user?.accountRole)
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error)
  }
}

onMounted(() => {
  loadChats()
  loadInvites()
  loadCurrentUser()

  // Проверяем hash для прямой ссылки на чат
  const hash = window.location.hash
  if (hash.startsWith('#/chat/')) {
    const feedId = hash.replace('#/chat/', '')
    if (feedId) {
      selectedChat.value = feedId
    }
  }

  // Подписываемся на вебсокет-события
  setupSocketSubscription()

  // Дополнительная синхронизация при возврате на вкладку
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      // При возврате на вкладку всегда обновляем данные
      loadChats()
      loadInvites()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
})

onUnmounted(() => {
  stopChatsFallbackPolling()
})

// Resize sidebar functionality
function startResize(e) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function handleMouseMove(e) {
    if (!isResizing.value) return
    const diff = e.clientX - startX
    const newWidth = Math.max(280, Math.min(600, startWidth + diff))
    setSidebarWidth(newWidth)
  }

  function handleMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* CSS Variables for theming */
:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f0f2f5;
  --bg-tertiary: #f5f6f8;
  --bg-hover: #f5f6f8;
  --bg-active: #e3f2fd;
  --bg-chat: #e5ddd5;
  --bg-bubble-own: #d9fdd3;
  --bg-bubble-other: #ffffff;
  --bg-input: #ffffff;
  --bg-modal: #ffffff;
  --bg-panel: #ffffff;

  --text-primary: #111b21;
  --text-secondary: #667781;
  --text-muted: #8696a0;
  --text-link: #008069;
  --text-inverse: #ffffff;

  --border-color: #e0e0e0;
  --border-light: #d1d7db;
  --border-input: #d1d7db;

  --accent-primary: #008069;
  --accent-hover: #007a62;
  --accent-light: #e3f2fd;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.15);

  --menu-bg: #ffffff;
  --menu-hover: #f5f6f8;
  --menu-divider: #e0e0e0;

  --status-online: #008069;
  --status-typing: #008069;

  --danger-color: #e74c3c;
  --danger-hover: #c0392b;
  --warning-color: #f59e0b;
  --warning-hover: #d97706;

  --participant-owner-bg: #fef3c7;
  --participant-owner-text: #92400e;
  --participant-admin-bg: #dbeafe;
  --participant-admin-text: #1e40af;
  --participant-guest-bg: #f3f4f6;
  --participant-guest-text: #6b7280;
}

/* Dark theme */
[data-theme='dark'] {
  --bg-primary: #111b21;
  --bg-secondary: #1f2c33;
  --bg-tertiary: #2a3942;
  --bg-hover: #2a3942;
  --bg-active: #005c4b;
  --bg-chat: #0b141a;
  --bg-bubble-own: #005c4b;
  --bg-bubble-other: #202c33;
  --bg-input: #2a3942;
  --bg-modal: #111b21;
  --bg-panel: #1f2c33;

  --text-primary: #e9edef;
  --text-secondary: #8696a0;
  --text-muted: #667781;
  --text-link: #00a884;
  --text-inverse: #111b21;

  --border-color: #2a3942;
  --border-light: #374045;
  --border-input: #374045;

  --accent-primary: #00a884;
  --accent-hover: #00c298;
  --accent-light: #005c4b;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.5);

  --menu-bg: #233138;
  --menu-hover: #2a3942;
  --menu-divider: #374045;

  --status-online: #00a884;
  --status-typing: #00a884;

  --danger-color: #ef4444;
  --danger-hover: #dc2626;
  --warning-color: #fbbf24;
  --warning-hover: #f59e0b;

  --participant-owner-bg: #78350f;
  --participant-owner-text: #fbbf24;
  --participant-admin-bg: #1e3a8a;
  --participant-admin-text: #93c5fd;
  --participant-guest-bg: #374151;
  --participant-guest-text: #9ca3af;
}

html,
body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  /* Базовый размер 16px, масштабируется через JS */
  font-size: calc(16px * var(--ui-scale, 1));
}

/* CSS переменная для масштаба - применяется через calc() к размерам */
:root {
  --ui-scale: 1;
}

.app {
  overflow: hidden;
  background: var(--bg-secondary);
  width: 100%;
  height: 100dvh;
  /* Масштабирование применяется через CSS переменную --ui-scale */
}

.main-view {
  display: flex;
  height: 100vh;
  height: 100dvh;
}

/* Sidebar wrapper with resize handle */
.sidebar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
}

/* Глобальный аудиоплеер в sidebar */
.sidebar-wrapper > .global-audio-player {
  flex-shrink: 0;
  z-index: 10;
}

/* Глобальный аудиоплеер в чате - в потоке документа */
.content-area > .global-audio-player {
  flex-shrink: 0;
  z-index: 50;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle.resizing {
  background: var(--accent-primary);
}

.resize-indicator {
  width: 2px;
  height: 32px;
  background: var(--border-light);
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-handle:hover .resize-indicator,
.resize-handle.resizing .resize-indicator {
  opacity: 1;
  background: white;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: var(--bg-chat);
  position: relative;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
}

[data-theme='dark'] .content-area {
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
}

/* Адаптивность */
@media (max-width: 768px) {
  .main-view {
    flex-direction: column;
  }

  .sidebar-wrapper {
    width: 100% !important;
  }

  .resize-handle {
    display: none;
  }

  .content-area {
    position: fixed;
    inset: 0;
    z-index: 100;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    height: 100dvh;
  }

  .content-area.chat-active {
    transform: translateX(0);
  }

  /* Аудиоплеер в чате на мобильных - тоже в потоке */
  .chat-player {
    flex-shrink: 0;
  }

  .app,
  .main-view {
    height: 100dvh;
  }
}
</style>
