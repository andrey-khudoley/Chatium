<template>
  <div ref="appRef" class="app">
    <!-- Главный вид: список чатов или выбранный чат -->
    <div v-if="currentView === 'chats'" class="main-view">
      <div 
        ref="sidebarRef"
        class="sidebar-wrapper" 
        :style="{ width: sidebarWidth + 'px' }"
      >
        <!-- Глобальный аудиоплеер в списке чатов -->
        <GlobalAudioPlayer v-if="!selectedChat" />
        <ChatsList
          ref="chatsListRef"
          :chats="chatsList"
          :selected-chat="selectedChat"
          :invites="invites"
          :inbox-badges="inboxBadges"
          :user="currentUser"
          :push-notifications-enabled="pushNotificationsEnabled"
          :push-banner-visible="showPushBanner"
          :app-install-visible="appInstallVisible"
          :app-installed="appInstalled"
          @select-chat="selectChat"
          @show-profile="currentView = 'profile'"
          @show-settings="currentView = 'settings'"
          @create-chat="showCreateModal = true"
          @accept-invite="handleInviteAccepted"
          @decline-invite="handleInviteDeclined"
          @go-to-message="handleGoToMessage"
          @select-user-chat="handleUserChatStart"
          @enable-push="handleEnablePush"
          @install-app="handleInstallApp"
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
        <!-- Кнопка включения уведомлений (поверх контента, не ломает v-if/v-else) -->
        <div v-if="showPushBanner" class="push-banner">
          <div class="push-banner-content">
            <i class="fas fa-bell"></i>
            <span>Включите уведомления, чтобы не пропустить сообщения</span>
          </div>
          <div class="push-banner-actions">
            <button class="push-banner-btn" @click="handleEnablePush">Включить</button>
            <button class="push-banner-close" @click="dismissPushBanner">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Вид профиля -->
    <ProfileView 
      v-else-if="currentView === 'profile'"
      @back="currentView = 'chats'"
    />

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

    <!-- Модалка онбординга для новых пользователей -->
    <OnboardingModal
      v-if="showOnboarding && currentUser"
      :user="currentUser"
      @complete="handleOnboardingComplete"
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
import OnboardingModal from './components/OnboardingModal.vue'
import { apiChatsListRoute } from './api/chats'
import { apiInvitesMyRoute } from './api/invites'
import { apiProfileGetRoute } from './api/profile'
import { useScale } from './composables/useScale'
import { useFaviconBadge } from './composables/useFaviconBadge'
import { apiInboxBadgesGetRoute } from './api/inbox-badges'
import { apiPushSubscribeFCMRoute } from './api/push/subscribe-fcm'
import { apiClientLogRoute } from './api/client-logs'

// Функция для отправки логов на сервер (для отладки с телефона)
async function sendServerLog(type, message, details = null) {
  try {
    await apiClientLogRoute.run(ctx, { type, message, details: details ? JSON.stringify(details) : null })
  } catch (e) {
    console.error('[ServerLog] Failed to send:', e)
  }
}


const props = defineProps({
  userSocketId: String,
})

// Делаем userSocketId доступным через provide для дочерних компонентов
provide('userSocketId', props.userSocketId)

const currentView = ref('chats')
const selectedChat = ref(null)
const targetMessageId = ref(null)
const chatsList = ref([])
const invites = ref([])
const showCreateModal = ref(false)
const showOnboarding = ref(false)
const chatsListRef = ref(null)
const currentUser = ref(null)
const appRef = ref(null)
const inboxBadges = ref(new Map())
const showPushBanner = ref(false)
const pushNotificationsEnabled = ref(false)
const appInstallVisible = ref(false)
const appInstalled = ref(false)
let deferredInstallPrompt = null

function isIOSDevice() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function updateInstallStatus() {
  appInstalled.value = isStandaloneMode()
  appInstallVisible.value = !appInstalled.value
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault()
  deferredInstallPrompt = event
  updateInstallStatus()
  if (!appInstalled.value) {
    appInstallVisible.value = true
  }
}

function handleAppInstalled() {
  deferredInstallPrompt = null
  appInstalled.value = true
  appInstallVisible.value = false
}

function setupAppInstallPrompt() {
  updateInstallStatus()

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
}

async function handleInstallApp() {
  updateInstallStatus()

  if (appInstalled.value) {
    alert('Приложение уже установлено')
    return
  }

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt
    deferredInstallPrompt = null
    promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice?.outcome === 'accepted') {
      appInstallVisible.value = false
    }
    return
  }

  if (isIOSDevice()) {
    alert('Чтобы установить приложение: нажмите «Поделиться» в Safari, затем «На экран Домой».')
    return
  }

  alert('Чтобы установить приложение, откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».')
}

// Обновляем статус уведомлений
function updatePushStatus() {
  if (!('Notification' in window)) {
    pushNotificationsEnabled.value = false
    return
  }
  pushNotificationsEnabled.value = Notification.permission === 'granted'
  console.log('[Push Status] 🔘 Notifications enabled:', pushNotificationsEnabled.value)
}

// Проверяем нужно ли показать баннер
function checkPushBanner() {
  // Сначала обновляем статус
  updatePushStatus()
  
  // Проверяем поддержку Notification API
  if (!('Notification' in window)) {
    console.log('[Push Banner] ❌ Notifications API not supported');
    return;
  }
  
  // Проверяем текущее разрешение
  if (Notification.permission === 'granted') {
    console.log('[Push Banner] ✅ Permission already granted');
    return;
  }
  
  if (Notification.permission === 'denied') {
    console.log('[Push Banner] ⛔ Permission denied');
    return;
  }
  
  // Проверяем не был ли баннер отклонён ранее
  if (localStorage.getItem('push-banner-dismissed')) {
    console.log('[Push Banner] 🚫 Banner was dismissed before');
    return;
  }
  
  // Проверяем iOS: пуши работают ТОЛЬКО если PWA установлено
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (isIOS && !isStandalone) {
    console.log('[Push Banner] 📱 iOS detected, but NOT standalone — push will NOT work!');
    console.log('[Push Banner] 💡 User needs to install PWA first (Add to Home Screen)');
    // На iOS без установки PWA пуши не работают — не показываем баннер
    return;
  }
  
  console.log('[Push Banner] ✅ Showing banner', { isIOS, isStandalone });
  showPushBanner.value = true;
}

// Клик по кнопке "Включить" — iOS требует СИНХРОННЫЙ вызов requestPermission
async function handleEnablePush() {
  console.log('[Push] 🔔 ============================================')
  console.log('[Push] 🔔 ENABLE PUSH BUTTON CLICKED')
  console.log('[Push] 🔔 ============================================')
  
  if (!('Notification' in window)) {
    console.error('[Push] ❌ Notifications API not supported')
    alert('Ваш браузер не поддерживает уведомления')
    return
  }
  
  console.log('[Push] 📱 Current permission:', Notification.permission)
  console.log('[Push] 📱 Firebase ready:', !!messaging)
  console.log('[Push] 📱 SW ready:', !!swRegistration)
  
  // Отправляем статус на сервер
  await sendServerLog('push', '📱 Button clicked - checking state', { 
    permission: Notification.permission,
    firebaseReady: !!messaging,
    swReady: !!swRegistration
  })
  
  try {
    // ВАЖНО: requestPermission должен быть вызван СРАЗУ в обработчике клика (iOS требует)
    console.log('[Push] 🙏 Requesting permission...')
    const permission = await Notification.requestPermission()
    console.log('[Push] 📋 Permission result:', permission)
    
    // Отправляем результат на сервер
    await sendServerLog('push', `📋 Permission result: ${permission}`, { permission })
    
    if (permission !== 'granted') {
      console.warn('[Push] ⚠️ Permission not granted:', permission)
      await sendServerLog('push', `⚠️ Permission not granted: ${permission}`, { permission })
      alert('Разрешение на уведомления не предоставлено')
      return
    }
    
    console.log('[Push] ✅ Permission granted!')
    await sendServerLog('push', '✅ Permission granted!')
    
    // Скрываем баннер
    showPushBanner.value = false
    
    // Теперь ПОСЛЕ получения разрешения можем делать async операции
    console.log('[Push] 📱 Checking Firebase...')
    if (!messaging) {
      console.warn('[Push] ⚠️ Firebase not initialized yet, waiting...')
      await initializeFirebaseMessaging()
      
      if (!messaging) {
        console.error('[Push] ❌ Firebase failed to initialize')
        alert('Не удалось инициализировать Firebase. Попробуйте перезагрузить страницу.')
        return
      }
    }
    
    if (!swRegistration) {
      console.error('[Push] ❌ Service Worker not registered')
      alert('Service Worker не зарегистрирован. Попробуйте перезагрузить страницу.')
      return
    }
    
    console.log('[Push] ✅ All checks passed, subscribing...')
    await subscribeToPush()
    
    // Обновляем статус после успешной подписки
    updatePushStatus()
    
  } catch (error) {
    console.error('[Push] ❌ FATAL ERROR in handleEnablePush:', error)
    console.error('[Push] Stack:', error.stack)
    alert('Ошибка: ' + error.message)
  }
}

function dismissPushBanner() {
  showPushBanner.value = false
  localStorage.setItem('push-banner-dismissed', 'true')
}

// Динамический favicon с бейджем непрочитанных и миганием
const { setUnreadCount, startBlinking, stopBlinking } = useFaviconBadge()

// Firebase Messaging
let messaging = null
let fcmToken = null
let swRegistration = null

// Вычисляем базовый путь приложения из текущего URL.
// Это нужно потому, что приложение может отдаваться по разным префиксам
// (например, /tg/ или /inner/samples/imported/tg-copy/).
function getAppBasePath() {
  if (typeof window !== 'undefined' && window.APP_BASE_PATH) {
    return window.APP_BASE_PATH
  }
  if (typeof window === 'undefined') return '/'
  let path = window.location.pathname || '/'
  // Убираем хвостовую часть после последнего слеша (это либо файл, либо пустота)
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash >= 0) path = path.slice(0, lastSlash + 1)
  return path || '/'
}

// Регистрация Service Worker (ПЕРЕД инициализацией Firebase)
async function registerServiceWorker() {
  console.log('[SW] 🔧 ============================================')
  console.log('[SW] 🔧 REGISTERING SERVICE WORKER')
  console.log('[SW] 🔧 ============================================')
  
  if (!('serviceWorker' in navigator)) {
    console.error('[SW] ❌ Service Worker не поддерживается')
    return null
  }
  
  try {
    const basePath = getAppBasePath()
    const swUrl = basePath + 'firebase-messaging-sw.js'
    console.log('[SW] 📝 Registering', swUrl, 'with scope', basePath);
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: basePath
    })
    
    console.log('[SW] ✅ SW registered:', registration.scope);
    console.log('[SW] 📱 SW installing:', !!registration.installing);
    console.log('[SW] 📱 SW waiting:', !!registration.waiting);
    console.log('[SW] 📱 SW active:', !!registration.active);
    
    // Ждём активации SW
    if (registration.active) {
      console.log('[SW] ✅ SW already active');
    } else {
      console.log('[SW] ⏳ Waiting for SW to activate...');
      await navigator.serviceWorker.ready;
      console.log('[SW] ✅ SW activated');
    }
    
    // Обработка обновлений SW
    registration.addEventListener('updatefound', () => {
      console.log('[SW] 🔄 Update found');
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('[SW] 🔄 New SW state:', newWorker.state);
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] 🔄 New version available');
            if (confirm('Доступна новая версия! Обновить?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });
    
    console.log('[SW] 🎉 SW REGISTRATION COMPLETE!');
    return registration;
    
  } catch (error) {
    console.error('[SW] ❌ Registration failed:', error);
    console.error('[SW] Stack:', error.stack);
    return null;
  }
}

// Инициализация Firebase Messaging
async function initializeFirebaseMessaging() {
  console.log('[Firebase] ============================================')
  console.log('[Firebase] 🚀 STARTING FIREBASE INITIALIZATION...')
  console.log('[Firebase] ============================================')
  
  // Отправляем лог на сервер
  await sendServerLog('firebase', '🚀 Firebase initialization started', { 
    userAgent: navigator.userAgent,
    url: window.location.href 
  })
  
  // СНАЧАЛА регистрируем Service Worker
  if (!swRegistration) {
    console.log('[Firebase] 📝 Registering Service Worker first...');
    swRegistration = await registerServiceWorker();
    
    if (!swRegistration) {
      console.error('[Firebase] ❌ SW registration failed, cannot init Firebase');
      await sendServerLog('firebase', '❌ SW registration failed');
      return;
    }
  }
  
  // Ждём загрузки Firebase SDK
  let attempts = 0;
  console.log('[Firebase] ⏳ Waiting for Firebase SDK to load...');
  
  while (typeof firebase === 'undefined' && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
    if (attempts % 10 === 0) {
      console.log(`[Firebase] ⏳ Still waiting... attempt ${attempts}/50`);
    }
  }
  
  if (typeof firebase === 'undefined') {
      console.error('[Firebase] ❌ SDK не загружен после 5 секунд ожидания!')
      await sendServerLog('firebase', '❌ SDK not loaded after 5 seconds');
      return
    }
    
    console.log('[Firebase] ✅ SDK loaded successfully!')
    await sendServerLog('firebase', '✅ SDK loaded successfully');
  console.log('[Firebase] 📦 Checking FIREBASE_CONFIG...');
  
  if (typeof FIREBASE_CONFIG === 'undefined') {
    console.error('[Firebase] ❌ FIREBASE_CONFIG is undefined!')
    await sendServerLog('firebase', '❌ FIREBASE_CONFIG undefined');
    return
  }
  
  console.log('[Firebase] ✅ FIREBASE_CONFIG found!')
  await sendServerLog('firebase', '✅ FIREBASE_CONFIG found', { 
    projectId: FIREBASE_CONFIG.projectId,
    messagingSenderId: FIREBASE_CONFIG.messagingSenderId 
  });
  
  // Инициализируем App если ещё не сделано
  console.log('[Firebase] 📱 Checking existing apps:', firebase.apps?.length || 0);
  
  if (!firebase.apps || firebase.apps.length === 0) {
    console.log('[Firebase] 🔄 No existing apps, initializing new app...');
    try {
      firebase.initializeApp(FIREBASE_CONFIG)
      console.log('[Firebase] ✅ App initialized successfully!')
    } catch (initError) {
      console.error('[Firebase] ❌ Failed to initialize app:', initError.message)
      console.error('[Firebase] Stack:', initError.stack)
      return
    }
  } else {
    console.log('[Firebase] ℹ️ App already initialized, using existing');
  }
  
  console.log('[Firebase] 📱 Checking firebase.messaging availability...');
  if (!firebase.messaging) {
    console.warn('[Firebase] ❌ firebase.messaging is not available!')
    console.warn('[Firebase] This usually means:')
    console.warn('  1. firebase-messaging-compat.js failed to load')
    console.warn('  2. Wrong order of script loading')
    console.warn('  3. Version mismatch between app and messaging SDKs')
    return
  }
  
  console.log('[Firebase] ✅ firebase.messaging is available!')
  
  try {
    // Инициализируем Firebase Messaging
    console.log('[Firebase] 🔄 Creating messaging instance...');
    messaging = firebase.messaging()
    console.log('[Firebase] ✅ Messaging instance created!')
    
    // Обработка foreground сообщений (когда приложение открыто)
    console.log('[Firebase] 🔔 Setting up onMessage handler...');
    messaging.onMessage((payload) => {
      console.log('[Firebase] 🔔 Foreground message received:', payload)
      
      const title = payload.data?.title || payload.notification?.title || 'Новое сообщение'
      const body = payload.data?.body || payload.notification?.body || ''
      const chatId = payload.data?.chatId
      
      console.log(`[Firebase] 🔔 Showing foreground notification: ${title} - ${body}`);
      
      // Показываем браузерное уведомление
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/tg/icons/icon-192.png',
          badge: '/tg/icons/icon-192.png',
          tag: chatId || 'default',
          data: { chatId }
        })
        
        notification.onclick = () => {
          window.focus()
          if (chatId) {
            selectedChat.value = chatId
            window.location.hash = `#/chat/${chatId}`
          }
          notification.close()
        }
      }
      
      // Обновляем данные чатов
      loadInboxBadges()
    })
    
    console.log('[Firebase] ✅ onMessage handler registered!')
    console.log('[Firebase] ============================================')
    console.log('[Firebase] 🎉 FIREBASE INITIALIZED SUCCESSFULLY!')
    console.log('[Firebase] ============================================')
  } catch (error) {
    console.error('[Firebase] ❌ Ошибка инициализации:', error)
    console.error('[Firebase] Stack:', error.stack)
  }
}


// VAPID ключ НЕ нужен при использовании Firebase Cloud Messaging API v1
// (используется только для Web Push API без Firebase)

// Подписка на push через FCM
async function subscribeToPush() {
  console.log('[Push] 📱 ============================================')
  console.log('[Push] 📱 SUBSCRIBE TO PUSH')
  console.log('[Push] 📱 ============================================')
  
  // Отправляем на сервер начало подписки
  await sendServerLog('push', '📱 SUBSCRIBE TO PUSH started', { 
    messagingReady: !!messaging,
    swReady: !!swRegistration
  })
  
  if (!messaging) {
    console.error('[Push] ❌ Messaging не инициализирован')
    await sendServerLog('push', '❌ Messaging not initialized')
    alert('Firebase Messaging не готов')
    return
  }
  
  if (!swRegistration) {
    console.error('[Push] ❌ Service Worker не зарегистрирован')
    await sendServerLog('push', '❌ Service Worker not registered')
    alert('Service Worker не готов')
    return
  }
  
  try {
    console.log('[Push] ✅ Messaging ready:', !!messaging);
    console.log('[Push] ✅ SW registration:', swRegistration.scope);
    console.log('[Push] ✅ SW active:', swRegistration.active ? 'YES' : 'NO');
    console.log('[Push] ✅ SW state:', swRegistration.active?.state);
    
    // Получаем FCM токен (БЕЗ vapidKey для FCM API v1)
    console.log('[Push] 🔑 Getting FCM token...');
    
    const token = await messaging.getToken({
      serviceWorkerRegistration: swRegistration
    })
    
    // Отправляем результат получения токена на сервер
    await sendServerLog('push', token ? '🎉 FCM TOKEN RECEIVED!' : '❌ NO TOKEN RECEIVED!', { 
      tokenReceived: !!token,
      tokenLength: token ? token.length : 0
    })
    
    console.log('[Push] ============================================')
    if (token) {
      console.log('[Push] 🎉 FCM TOKEN RECEIVED!')
      console.log('[Push] 📋 Token:', token.substring(0, 50) + '...')
      console.log('[Push] 📋 Length:', token.length, 'chars')
      fcmToken = token
      
      // Сохраняем токен на сервере
      console.log('[Push] 💾 Saving token to server...');
      const result = await apiPushSubscribeFCMRoute.run(ctx, {
        token,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          swScope: swRegistration?.scope || 'unknown'
        }
      });
      
      console.log('[Push] 💾 Server response:', result);
      
      if (result?.success) {
        console.log('[Push] 🎉 SUBSCRIPTION SAVED!')
        console.log('[Push] 🎉 Push notifications enabled successfully!')
        await sendServerLog('push', '🎉 SUBSCRIPTION SAVED!', { endpoint: result.endpoint })
        
        // Обновляем статус
        updatePushStatus()
        
        alert('✅ Уведомления включены!')
      } else {
        console.error('[Push] ❌ Server error:', result?.error)
        await sendServerLog('push', '❌ Server error', { error: result?.error })
        alert('Ошибка сохранения токена: ' + (result?.error || 'Unknown'))
      }
    } else {
      console.error('[Push] ❌ NO TOKEN RECEIVED!')
      console.error('[Push] ❌ Permission:', Notification.permission)
      console.error('[Push] ❌ Messaging:', !!messaging)
      console.error('[Push] ❌ SW:', !!swRegistration)
      alert('Не удалось получить токен FCM')
    }
    console.log('[Push] ============================================')
  } catch (error) {
    console.error('[Push] ❌ ERROR:', error.message)
    console.error('[Push] ❌ Stack:', error.stack)
    await sendServerLog('push', '❌ ERROR in subscribeToPush', { 
      error: error.message,
      stack: error.stack
    })
    alert('Ошибка подписки: ' + error.message)
  }
}

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
  const chatIndex = chatsList.value.findIndex(c => c.feedId === feedId)
  if (chatIndex !== -1) {
    // Нормализуем поля сообщения (WebSocket присылает snake_case)
    const normalizedMessage = {
      ...message,
      createdBy: message.createdBy || message.created_by,
      updatedBy: message.updatedBy || message.updated_by,
      createdAt: message.createdAt || message.created_at,
      updatedAt: message.updatedAt || message.updated_at,
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
  chatsList.value = chatsList.value.filter(c => c.feedId !== feedId)
  // Закрываем чат (если он ещё открыт)
  if (selectedChat.value === feedId) {
    closeChat()
  }
}

// Обработка выхода из чата/отписки от канала
async function handleChatLeft(feedId) {
  // Удаляем чат из списка
  chatsList.value = chatsList.value.filter(c => c.feedId !== feedId)
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

// Обработка начала чата с пользователем из списка пользователей
async function handleUserChatStart(chat) {
  // Добавляем чат в список, если его еще нет
  const existingChat = chatsList.value.find(c => c.feedId === chat.feedId)
  if (!existingChat) {
    chatsList.value.unshift(chat)
  }
  // Открываем чат
  selectedChat.value = chat.feedId
  window.location.hash = `#/chat/${chat.feedId}`
  // Перезагружаем список чатов
  await loadChats()
}

async function onChatCreated(feedId) {
  showCreateModal.value = false
  
  // Небольшая задержка, чтобы Feed API успел обновить данные
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Перезагружаем список чатов
  if (chatsListRef.value) {
    await chatsListRef.value.reload()
  }
  await loadChats()
  await loadInvites()
  selectedChat.value = feedId
  targetMessageId.value = null
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
    
    // Обновляем favicon badge - суммируем все непрочитанные
    const totalUnread = Object.values(response.badges).reduce((sum, count) => sum + count, 0)
    setUnreadCount(totalUnread)
    
    // Если есть непрочитанные и вкладка не активна - запускаем мигание
    if (totalUnread > 0 && document.visibilityState === 'hidden') {
      startBlinking()
    } else if (totalUnread === 0) {
      stopBlinking()
    }
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
          invites.value = invites.value.filter(i => i.id !== data.inviteId)
        } else if (data.event === 'invite-declined') {
          invites.value = invites.value.filter(i => i.id !== data.inviteId)
        } else if (data.event === 'invite-revoked') {
          invites.value = invites.value.filter(i => i.id !== data.inviteId)
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
    
    // Проверяем, нужно ли показать онбординг (первый вход)
    checkOnboardingNeeded(response.user)
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error)
  }
}

// Проверка необходимости показать онбординг
function checkOnboardingNeeded(user) {
  if (!user) return
  
  // Показываем онбординг если не заполнен username
  const hasUsername = user.username && user.username.trim().length >= 3
  
  if (!hasUsername) {
    showOnboarding.value = true
  }
}

// Обработчик завершения онбординга
function handleOnboardingComplete() {
  showOnboarding.value = false
  // Перезагружаем данные пользователя
  loadCurrentUser()
  // Перезагружаем чаты
  loadChats()
}

onMounted(async () => {
  setupAppInstallPrompt()
  console.log('[App] 🚀 ============================================')
  console.log('[App] 🚀 APP MOUNTED')
  console.log('[App] 🚀 ============================================')
  
  // Загружаем данные СНАЧАЛА — это критично, не должно зависеть от Firebase
  console.log('[App] 📊 Loading chats, invites, and user data...');
  await Promise.all([
    loadChats(),
    loadInvites(),
    loadCurrentUser()
  ]);
  console.log('[App] ✅ Data loaded successfully');
  
  // Инициализируем Firebase Messaging ПОСЛЕ загрузки данных (не блокирует UI)
  console.log('[App] 🔥 Starting Firebase initialization...');
  initializeFirebaseMessaging().then(() => {
    console.log('[App] ✅ Firebase ready, messaging:', !!messaging, 'SW:', !!swRegistration);
    
    // Если разрешение УЖЕ дано ранее — автоматически подписываемся
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[App] 🔔 Permission already granted, auto-subscribing...');
      subscribeToPush();
    } else {
      console.log('[App] 🔔 Permission:', Notification.permission);
      // Показываем баннер если разрешение ещё не дано
      checkPushBanner();
    }
  }).catch((err) => {
    console.error('[App] ❌ Firebase initialization failed:', err);
  });
  
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
  
  // Обработка сообщений от Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW Message]', event.data);
      if (event.data?.type === 'navigate-to-chat') {
        const chatId = event.data.chatId
        if (chatId) {
          selectedChat.value = chatId
          window.location.hash = `#/chat/${chatId}`
        }
      }
    })
  }
  
  // Дополнительная синхронизация при возврате на вкладку
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      stopBlinking()
      loadChats()
      loadInvites()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
})

onUnmounted(() => {
  stopChatsFallbackPolling()
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
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
  /* Light theme (default) - Telegram Style */
  --bg-primary: #ffffff;
  --bg-secondary: #f0f2f5;
  --bg-tertiary: #e5ddd5;
  --bg-hover: rgba(0, 0, 0, 0.05);
  --bg-active: rgba(0, 0, 0, 0.08);
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
  
  --border-color: #d1d7db;
  --border-light: #e9edef;
  --border-input: #d1d7db;
  
  --accent-primary: #008069;
  --accent-hover: #005c4b;
  --accent-light: rgba(0, 128, 105, 0.15);
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.15);
  
  --menu-bg: #ffffff;
  --menu-hover: #f0f2f5;
  --menu-divider: #e9edef;
  
  --status-online: #00a884;
  --status-typing: #008069;
  
  --danger-color: #ef4444;
  --danger-hover: #dc2626;
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
[data-theme="dark"] {
  --bg-primary: #111b21;
  --bg-secondary: #1f2c33;
  --bg-tertiary: #2a3b45;
  --bg-hover: rgba(255, 255, 255, 0.05);
  --bg-active: rgba(255, 255, 255, 0.08);
  --bg-chat: #0b141a;
  --bg-bubble-own: #005c4b;
  --bg-bubble-other: #1f2c33;
  --bg-input: #2a3b45;
  --bg-modal: #111b21;
  --bg-panel: #1f2c33;
  
  --text-primary: #e9edef;
  --text-secondary: #8696a0;
  --text-muted: #667781;
  --text-link: #00a884;
  --text-inverse: #111b21;
  
  --border-color: #2a3b45;
  --border-light: #374045;
  --border-input: #2a3b45;
  
  --accent-primary: #00a884;
  --accent-hover: #00d68f;
  --accent-light: rgba(0, 168, 132, 0.2);
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.5);
  
  --menu-bg: #1f2c33;
  --menu-hover: #2a3b45;
  --menu-divider: #374045;
  
  --status-online: #00a884;
  --status-typing: #00a884;
  
  --danger-color: #f15c6d;
  --danger-hover: #fa6676;
  --warning-color: #fbbf24;
  --warning-hover: #fcd34d;
  
  --participant-owner-bg: #78350f;
  --participant-owner-text: #fbbf24;
  --participant-admin-bg: #1e3a8a;
  --participant-admin-text: #93c5fd;
  --participant-guest-bg: #374151;
  --participant-guest-text: #9ca3af;
}

html, body {
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

/* Ограничение ширины для десктопа */
@media (min-width: 1200px) {
  .app {
    max-width: 1200px;
    margin: 0 auto;
  }
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
}

.content-area::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: #e5ddd5;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(120, 120, 120, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(120, 120, 120, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(120, 120, 120, 0.02) 0%, transparent 50%);
  opacity: 1;
  pointer-events: none;
  z-index: 0;
}

[data-theme="dark"] .content-area::before {
  background-color: #0b141a;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.01) 0%, transparent 50%);
}

.content-area > * {
  position: relative;
  z-index: 1;
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

.push-banner {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 90%;
  width: 28rem;
}

.push-banner-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  font-size: 0.8125rem;
  color: var(--text-primary);
}

.push-banner-content i {
  color: var(--accent-primary);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.push-banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.push-banner-btn {
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.push-banner-btn:hover {
  background: var(--accent-hover);
}

.push-banner-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.push-banner-close:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .push-banner {
    bottom: 0.75rem;
    width: calc(100% - 1.5rem);
    max-width: none;
  }
}
</style>
