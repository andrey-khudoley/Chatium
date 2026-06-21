# 11. Фронтенд — архитектура SPA

> URL и пути — через `config/routes.tsx` (`withProjectRoot`/`withProjectRootAndSubroute`), не хардкод `/tg/...`. Серверные редиректы — относительные `./`, `../`. См. [01-platform.md](01-platform.md).

## index.tsx (HTML-страница, путь `/`)

`app.html('/', async (ctx, req) => {...})`:
1. `if (!ctx.user) return ctx.resp.redirect('/s/auth/signin?back=' + encodeURIComponent(withProjectRoot(indexPageRoute.url())))` (back — относительный путь проекта, не `/tg`).
2. `userSocketId = await genSocketId(ctx, 'user-' + ctx.user.id)`.
3. Вернуть `<html lang="ru">` с:
   - `<head>`: meta (viewport `maximum-scale=1, viewport-fit=cover`, theme-color `#008069`, apple-mobile-web-app-*), `<link rel="manifest" href={withProjectRoot(manifestRoute.url())}>`, apple-touch-icon/favicon (URL `https://fs.chatium.ru/get/image_msk_AaplkedAT7`), Tailwind (`/s/static/lib/tailwind.3.4.16.min.js`), FontAwesome 6.7.2, Cropper.js (CDN), Firebase compat SDK + `firebase-config.js` через `withProjectRoot(...)` (defer).
   - Инлайн-`<style>`: переменные тем (`:root` + `[data-theme="dark"]`), стили чата (`.chat-view`, `.message`, `.message-bubble`, `.input-area`, контекст-меню, эмодзи-пикер, адаптив), стили выбора сообщений. См. [14-design-system.md](14-design-system.md).
   - Инлайн-`<script>`: `tailwind.config` (colors primary `#008069`, secondary `#005c4b`); инициализация `--ui-scale` из `localStorage['chat-ui-scale']` до загрузки Vue.
   - `<body>`: `<App userSocketId={userSocketId} />`.

Прочие серверные страницы: `invite.tsx` (`app.get('/:token')` — страница приёма приглашения, рендерит инфо инвайта и кнопку join/accept), `manifest.json.ts` (`app.get('/')` → `ctx.resp.json(manifest)`, см. [14](14-design-system.md)).

## App.vue — корневой компонент

**Props:** `userSocketId: String` → `provide('userSocketId', props.userSocketId)`.

**Состояние (ref):** `currentView('chats'|'profile'|'settings')`, `selectedChat(feedId|null)`, `targetMessageId`, `chatsList`, `invites`, `showCreateModal`, `showOnboarding`, `chatsListRef`, `currentUser`, `inboxBadges(Map<inboxSubjectId,count>)`, `showPushBanner`, `pushNotificationsEnabled`, `isResizing`; из `useScale`: `scale`, `sidebarWidth`. Не-реактивные `let`: `messaging`, `fcmToken`, `swRegistration`, `fallbackChatsPollTimer`.

**Шаблон:** `v-if currentView==='chats'` → sidebar `ChatsList` (width `sidebarWidth`, drag-resize) + (`selectedChat` ? `ChatView` : `WelcomeView`); `v-else-if 'profile'` → `ProfileView`; `v-else-if 'settings'` → `ChatSettings`. Глобальные `CreateChatModal`, `OnboardingModal`, push-баннер.

**Hash-роутинг:** `#/chat/:feedId`. Читается **один раз в `onMounted`** (нет `hashchange`-слушателя). Пишется императивно в методах (`selectChatFromSettings`, `handleGoToMessage`, `closeChat`). Экраны переключаются через `currentView`/`selectedChat`, не от hash.

**WebSocket:** `setupSocketSubscription()` — напрямую `getOrCreateBrowserSocketClient()`; `subscribeToData(userSocketId)` + `subscribeToData('<userId>/inbox')`. См. [10](10-realtime-websocket.md). Fallback-polling 30 c.

**Push/FCM:** `registerServiceWorker()` (scope = `getAppBasePath()`), `initializeFirebaseMessaging()` (ждёт глобальные `firebase`+`FIREBASE_CONFIG`, `onMessage` → браузерное `Notification` + бейджи), `subscribeToPush()` (`getToken({serviceWorkerRegistration})` → `apiPushSubscribeFCMRoute.run(ctx,{token,deviceInfo})`). Баннер: `checkPushBanner/handleEnablePush/dismissPushBanner` (localStorage `push-banner-dismissed`; iOS — только standalone-PWA).

**Методы:** `selectChat(feedId)`, `selectChatFromSettings`, `closeChat`, `updateChatLastMessage(feedId, message)` (нормализация snake→camel), `handleBadgeReset`, `handleChatDeleted/Left/Updated`, `handleGoToMessage({feedId,messageId,chatTitle})`, `handleUserChatStart(chat)`, `onChatCreated(feedId)`, `loadChats/loadInboxBadges/loadInvites/loadCurrentUser`, `handleInviteAccepted/Declined`, `checkOnboardingNeeded(user)` (нет/короткий username → `showOnboarding`), `handleOnboardingComplete`, `start/stopChatsFallbackPolling`, `startResize(e)` (clamp 280–600).

**Favicon-бейдж:** `useFaviconBadge()` → сумма непрочитанных в `setUnreadCount`; при скрытой вкладке и >0 — `startBlinking()`.

## Паттерн вызова API из Vue

```js
await apiChatsListRoute.run(ctx)                                  // GET без тела
await apiClientLogRoute.run(ctx, { type, message, details })      // POST с телом
const r = await apiChatGetRoute({ feedId }).run(ctx)              // path-параметр
await apiReactionsToggleRoute({ feedId }).run(ctx, { messageId, emoji })  // path + body
apiMessagesListRoute({ feedId }).query({ limit: 50 }).run(ctx)    // + query
```

**MUST:** все вызываемые так роуты помечены `// @shared-route`. Прямой `fetch` с хардкодом URL (как в Subscription*-компонентах sample — `fetch('/tg/api/chats~list')`) **не использовать**: либо `route.run(ctx)`, либо `fetch(withProjectRoot(route.url()))`. `ctx` в браузере глобален (`window.ctx`), для TS — `declare const ctx: any`.

## Файлы и медиа

- URL файла: `https://fs.chatium.ru/get/<hash>`; превью: `https://fs.chatium.ru/thumbnail/<hash>/s/<size>`.
- Upload: `apiFilesGetUploadUrlRoute.run(ctx)` → POST `FormData` (поле `Filedata`) на полученный URL → затем отправка сообщения (`apiFilesUploadRoute` или `apiMessagesSendRoute`) с `files:[{hash,name,size,mimeType,...}]`.

## Аватары-плейсхолдеры

Повторяющийся паттерн (вынести в утилиту): массив `colors`, индекс `name.charCodeAt(0) % colors.length`, градиент + первая буква имени. Применяется во многих компонентах.

## localStorage

`chat-theme`, `chat-ui-scale`, `chat-sidebar-width`, `push-banner-dismissed`.
