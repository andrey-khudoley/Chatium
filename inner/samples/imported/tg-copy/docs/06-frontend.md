# 06. Фронтенд (SPA)

Детальные спецификации компонентов и composables — в [spec/11](spec/11-frontend-architecture.md)…[spec/13](spec/13-components.md).

## App.vue — корень

- **Props:** `userSocketId` (прокидывается через `provide('userSocketId', ...)`).
- **Экраны** (по `currentView` + `selectedChat`): `chats` (сайдбар `ChatsList` + `ChatView`/`WelcomeView`), `profile` (`ProfileView`), `settings` (`ChatSettings`).
- **Hash-роутинг** минимальный: `#/chat/:feedId` читается один раз в `onMounted`, далее пишется императивно. Слушателя `hashchange` нет — экраны переключаются через состояние, не от hash.
- **WebSocket:** напрямую `getOrCreateBrowserSocketClient()` → `subscribeToData(userSocketId)` (invite/chat-события) и `subscribeToData('<userId>/inbox')` (→ `loadInboxBadges`). Fallback-polling чатов каждые 30 с.
- **Push (FCM):** `registerServiceWorker` → `initializeFirebaseMessaging` → `subscribeToPush` (`getToken` → `apiPushSubscribeFCMRoute`). Баннер включения push (на iOS — только в standalone-PWA).
- **Favicon-бейдж:** `useFaviconBadge`; сумма непрочитанных → `setUnreadCount`; при скрытой вкладке мигает.
- **Онбординг:** `checkOnboardingNeeded(user)` — если нет/короткий username → `OnboardingModal`.

## Паттерн вызова API из Vue

```js
await apiChatsListRoute.run(ctx)                                   // без тела
await apiChatGetRoute({ feedId }).run(ctx)                         // path-параметр
await apiReactionsToggleRoute({ feedId }).run(ctx, { messageId })  // path + body
apiMessagesListRoute({ feedId }).query({ limit: 50 }).run(ctx)     // + query
// либо прямой fetch (часть Subscription*-компонентов):
await fetch('/tg/api/chats~list').then(r => r.json())
```

## Composables (`composables/*.ts`, все `// @shared`)

| Composable | Назначение |
| --- | --- |
| `useChatSocket(userSocketId)` | WS с авто-реконнектом (3 c, до 10 попыток) и heartbeat (30 c); `{ socketData, isConnected, isReconnecting, reconnect }` |
| `useChatAccess()` | проверка доступа к платному чату; `{ accessCheck, checkAccess, reset }` |
| `useMessageSync(...)` | догрузка пропущенных сообщений при возврате на вкладку/online |
| `useGlobalAudioPlayer()` | singleton-плеер голосовых/аудио (один `<audio>`, скорости 1–2×) |
| `useFaviconBadge()` | динамический favicon с бейджем + мигание (canvas 64×64) |
| `useTheme()` | тема light/dark (singleton, localStorage `chat-theme`, `data-theme`) |
| `useScale()` | масштаб UI 50–300% + ширина сайдбара (localStorage; `setScale` делает reload) |
| `useSmartPosition()` | позиционирование поповеров/меню в пределах viewport |
| `useClientLogger()` | буферизованная отправка клиентских логов (debounce 1 c) |

## Ключевые компоненты

| Компонент | Роль |
| --- | --- |
| `ChatsList.vue` | сайдбар: список чатов, поиск, фильтры/папки, закреплённые, приглашения, меню профиля |
| `ChatView.vue` | главный экран чата (самый крупный): сообщения, ввод, реакции, reply, файлы, голос/видео, выбор, контекст-меню, упоминания, модерация |
| `ProfileView.vue` | профиль: вкладки (основное/контакты/безопасность/чёрный список/приватность/агенты/настройки) |
| `ChatSettings.vue` | глобальные настройки: мои подписки / тарифы / управление тарифами / агенты |
| `MessageFiles.vue` / `VoiceMessage.vue` / `VideoNote.vue` | рендер вложений |
| `MessageReactions.vue`, `MarkdownMessage.vue`, `MentionPicker.vue` | элементы сообщения |
| `CreateChatModal.vue`, `InviteModal.vue`, `ForwardMessageModal.vue` | модалки |
| `SubscriptionModal.vue`, `SubscriptionRequired.vue`, `SubscriptionPlansSettings.vue` | подписки |
| `VoiceRecorder*`, `VideoRecorder*` | запись медиа |

Полный каталог (~57 компонентов) с props/emits — в [spec/13-components.md](spec/13-components.md).

## Файлы и медиа

- URL файла: `https://fs.chatium.ru/get/<hash>`; превью: `https://fs.chatium.ru/thumbnail/<hash>/s/<size>`.
- Upload: `apiFilesGetUploadUrlRoute` → POST `FormData` (поле `Filedata`) напрямую в storage → отправка сообщения с `files[]`.

## localStorage-ключи

`chat-theme`, `chat-ui-scale`, `chat-sidebar-width`, `push-banner-dismissed`.
