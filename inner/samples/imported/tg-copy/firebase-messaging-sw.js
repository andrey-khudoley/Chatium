// Вычисляем базовый путь из того места, где лежит SW.
// Например: /inner/samples/imported/tg-copy/firebase-messaging-sw.js -> /inner/samples/imported/tg-copy/
var BASE_PATH = (function () {
  try {
    var p = self.location.pathname || '/';
    var i = p.lastIndexOf('/');
    return i >= 0 ? p.slice(0, i + 1) : '/';
  } catch (e) {
    return '/';
  }
})();

// Функция для отправки логов на сервер (для отладки с телефона)
async function sendServerLog(type, message, details = null) {
  try {
    await fetch(BASE_PATH + 'api/client-logs-sw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type || 'sw-log',
        message: String(message).slice(0, 500),
        details: details ? JSON.stringify(details).slice(0, 2000) : null,
        deviceId: 'sw-' + (self.registration?.scope || 'unknown')
      })
    });
  } catch (e) {
    console.error('[SW] Failed to send log:', e);
  }
}

// Firebase Messaging Service Worker для получения background push-уведомлений

const CACHE_NAME = 'tg-chat-v4';
const STATIC_ASSETS = [
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png'
];

// Импортируем Firebase SDK (compat версии для SW)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
} catch (e) {
  console.error('[SW] Failed to load Firebase SDK:', e);
}

// Загружаем конфигурацию
try {
  importScripts(BASE_PATH + 'firebase-config.js');
} catch (e) {
  console.error('[SW] Failed to load firebase-config.js:', e);
}

let messaging = null;
try {
  if (self.FIREBASE_CONFIG && self.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(self.FIREBASE_CONFIG);
    messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging initialized OK');
  } else {
    console.error('[SW] Firebase config not available or has placeholder API key');
  }
} catch (error) {
  console.error('[SW] Firebase init error:', error);
}

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Install v4');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Cache failed:', err))
  );
});

// ============================================
// ACTIVATE
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v4');
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH
// ============================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Игнорируем запросы к Firebase и другим внешним ресурсам
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Не кешируем навигационные запросы (HTML страницы) и API
  if (event.request.mode === 'navigate') return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Не возвращаем кешированную страницу — пусть покажет ошибку сети
            return undefined;
          });
      })
  );
});

// ============================================
// Firebase onBackgroundMessage
// Обрабатывает data-only сообщения от FCM
// ============================================
if (messaging) {
  messaging.onBackgroundMessage(async (payload) => {
    console.log('[SW] onBackgroundMessage received:', JSON.stringify(payload));
    
    // Отправляем лог на сервер
    await sendServerLog('sw-push', 'onBackgroundMessage received', {
      data: payload.data,
      notification: payload.notification,
      messageId: payload.messageId
    });
    
    console.log('[SW] Message data:', JSON.stringify(payload.data));
    console.log('[SW] Message notification:', JSON.stringify(payload.notification));

    // Пробуем получить данные из data или notification
    const notificationTitle = payload.data?.title || payload.notification?.title || 'Новое сообщение';
    const notificationBody = payload.data?.body || payload.notification?.body || '';
    const chatId = payload.data?.chatId || '';
    const url = payload.data?.url || '/tg';

    console.log('[SW] Showing notification:', notificationTitle, notificationBody, 'chatId:', chatId);

    const options = {
      body: notificationBody,
      icon: payload.data?.icon || '/tg/icons/icon-192.png',
      badge: payload.data?.badge || '/tg/icons/icon-192.png',
      data: { 
        url: url, 
        chatId: chatId,
        messageId: payload.data?.messageId || ''
      },
      vibrate: [200, 100, 200],
      tag: chatId ? 'chat-' + chatId : 'push-' + Date.now(),
      requireInteraction: false,
      renotify: true
    };

    console.log('[SW] Notification options:', JSON.stringify(options));
    
    await sendServerLog('sw-push', 'Showing notification', { 
      title: notificationTitle,
      chatId 
    });
    
    return self.registration.showNotification(notificationTitle, options);
  });
  console.log('[SW] onBackgroundMessage handler registered');
} else {
  console.error('[SW] Messaging not available, onBackgroundMessage not registered');
}

// ============================================
// Push event — FALLBACK для не-Firebase пушей
// ============================================
self.addEventListener('push', async (event) => {
  console.log('[SW] =========================================');
  console.log('[SW] PUSH EVENT FIRED');
  console.log('[SW] =========================================');
  
  // Отправляем лог на сервер
  await sendServerLog('sw-push', 'Push event fired', {
    hasData: !!event.data,
    dataType: event.data ? typeof event.data : null
  });
  
  console.log('[SW] Event data:', event.data);
  console.log('[SW] Event data type:', event.data ? typeof event.data : 'no data');

  if (!event.data) {
    console.log('[SW] No data in push event, showing default');
    event.waitUntil(
      self.registration.showNotification('Новое сообщение', {
        body: 'Получено уведомление',
        icon: '/tg/icons/icon-192.png',
        badge: '/tg/icons/icon-192.png'
      })
    );
    return;
  }

  // Пробуем распарсить JSON - FCM data-only сообщения
  let payload = null;
  let isJson = false;
  
  try {
    payload = event.data.json();
    isJson = true;
    console.log('[SW] Push data parsed as JSON:', JSON.stringify(payload));
  } catch (e) {
    // Тестовый пуш из Firebase Console - текстовый
    const textData = event.data.text();
    console.log('[SW] Push data is text (not JSON):', textData);
    payload = { notification: { title: 'Тестовое уведомление', body: textData } };
  }

  // Ждем немного чтобы Firebase SDK успел обработать через onBackgroundMessage
  event.waitUntil(
    new Promise((resolve) => {
      setTimeout(resolve, 100);
    }).then(() => {
      return self.registration.getNotifications();
    }).then((notifications) => {
      console.log('[SW] Current notifications count:', notifications.length);
      
      // Если Firebase SDK уже показал уведомление - не дублируем
      if (notifications.length > 0) {
        console.log('[SW] Notification already shown by Firebase SDK, skipping fallback');
        return;
      }

      // Firebase не показал - показываем сами (fallback)
      console.log('[SW] No notifications yet, showing fallback');

      const data = payload.data || {};
      const notification = payload.notification || {};
      
      const title = data.title || notification.title || 'Новое сообщение';
      const body = data.body || notification.body || (isJson ? '' : payload.notification?.body) || '';
      const chatId = data.chatId || '';
      const url = data.url || '/tg';

      console.log('[SW] Fallback notification:', { title, body, chatId, url });

      return self.registration.showNotification(title, {
        body: body,
        icon: data.icon || '/tg/icons/icon-192.png',
        badge: data.badge || '/tg/icons/icon-192.png',
        data: { url, chatId },
        vibrate: [200, 100, 200],
        tag: chatId ? 'chat-' + chatId : 'push-fallback-' + Date.now(),
        requireInteraction: false
      });
    }).catch((err) => {
      console.error('[SW] Error in push handler:', err);
    })
  );
});

// ============================================
// Клик по уведомлению
// ============================================
self.addEventListener('notificationclick', async (event) => {
  console.log('[SW] =========================================');
  console.log('[SW] NOTIFICATION CLICK');
  console.log('[SW] =========================================');
  
  await sendServerLog('sw-push', 'Notification clicked', {
    url: event.notification.data?.url,
    chatId: event.notification.data?.chatId
  });
  
  console.log('[SW] Notification:', event.notification);
  console.log('[SW] Notification data:', event.notification.data);
  
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/tg';
  const chatId = event.notification.data?.chatId;

  console.log('[SW] Opening URL:', urlToOpen, 'chatId:', chatId);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            console.log('[SW] Focusing existing client');
            if (chatId && 'postMessage' in client) {
              client.postMessage({ type: 'navigate-to-chat', chatId });
            }
            return client.focus();
          }
        }
        console.log('[SW] Opening new window');
        return clients.openWindow(urlToOpen);
      })
  );
});