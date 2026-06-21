# 15. Порядок реализации

Пошаговый план сборки проекта с нуля. Каждый шаг опирается на предыдущие.

## Шаг 0. Каркас
- Создать каталог приложения. Подготовить `.dir.json`.
- **`config/routes.tsx`** (обязателен): `PROJECT_ROOT`, `ROUTES`, `withProjectRoot`, `withProjectRootAndSubroute` (см. [01-platform.md](01-platform.md)). Все URL — только через них.
- Каталоги по 006-arch: `index.tsx` (корневой роут), `/web/` (браузерные роуты), `/api/` (по одному роуту на файл), `/pages/`, `/components/`, `/composables/`, `/tables/`, `/shared/`, `/lib/`, `/config/`, `/docs/`.
- Базовый Vue-`tsconfig.json` с `extends` на корневой.
- Убедиться, что доступны модули `@app/feed`, `@app/heap`, `@app/sync`, `@app/errors`, `@app/socket`, `@app/auth`, `@app/storage`, `@app/inbox`, `@pay/sdk`, `@ai-agents/sdk`, `@user-notifier/sdk`, `@crm/sdk`, `@start/sdk`, `@app/request`, `@app/html-jsx`.

> **Каждый роут далее — отдельный файл** (`app.get('/')`/`app.post('/')`, путь `'/'`, один `export const ...Route`). Группировка «несколько роутов в одном `*.ts`» (как в sample) не воспроизводится. Клиентские роуты — `// @shared-route`.

## Шаг 1. Данные (см. [02](02-data-model.md))
1. Создать `tables/chats.table.ts`, зафиксировать физ. id `CHATS_ID`.
2. Создать `tables/chat-subscription-plans.table.ts`, зафиксировать `PLANS_ID`.
3. Создать остальные 17 таблиц, подставив `CHATS_ID`/`PLANS_ID` в `RefLink`-поля.

## Шаг 2. shared / lib (см. [03](03-shared-and-lib.md))
- `shared/mentions.ts` (`// @shared`), `shared/subscription-periods.ts` (`// @shared`), `shared/permissions.ts` (без маркера, серверный).
- `lib/jwt-rs256.ts`.

## Шаг 3. Базовые серверные роуты (см. [04](04-api-core-messaging.md))
В порядке зависимостей:
1. `api/system-messages.ts` (экспорт `createSystemMessage` нужен многим).
2. `api/moderation.ts` (экспорт `isUserBanned`), `api/privacy-settings.ts` (экспорт `canSendDirectMessage`).
3. `api/chats.ts`, `api/messages.ts`, `api/participants.ts`.
4. `api/invites.ts`, `api/reactions.ts`, `api/typing.ts`, `api/pinned.ts`, `api/read-receipts.ts`, `api/read-mentions.ts`.
5. `api/files.ts`, `api/search.ts`, `api/chat-search.ts`.

## Шаг 4. Организация (см. [05](05-api-folders-pins.md))
- `api/chat-folders.ts`, `api/pinned-chats.ts`, `api/chat-filter-orders.ts`, `api/inbox-badges.ts`.

## Шаг 5. Пользователи/профиль/блокировки (см. [08](08-api-misc.md))
- `api/profile.ts`, `api/users.ts`, `api/users-list.ts`, `api/blocked-users.ts`, `api/chat-actions.ts`, `api/app-settings.ts`, `api/voice-transcriptions.ts`.

## Шаг 6. Подписки/платежи (см. [06](06-api-subscriptions-payments.md))
- `api/chat-subscription-plans.ts`, затем `api/chat-subscriptions.ts` (роуты + pay-callbacks `app.function` + jobs `app.job`), `api/admin-subscriptions.ts`.

## Шаг 7. Агенты (см. [07](07-api-agents.md))
- `api/agents.ts`, `api/agents-migration.ts`, `api/direct-chats.ts`.
- `tools/replyInGroupChat.ts`, `tools/sendImageToGroupChat.ts`, `agent-tools.ts`.
- Дописать `processMessageWithAgents` в `api/messages.ts` (вызывается из send для групп).

## Шаг 8. Push (см. [09](09-api-push.md))
- `api/push/subscribe-fcm.ts`, `api/push/send-fcm.ts`, `api/push/stats.ts`.
- `api/client-logs*.ts`.
- `firebase-config.js`, `firebase-messaging-sw.js`, `manifest.json.ts`.
- Интегрировать вызов `apiPushSendFCMRoute` в `messages/send`.

## Шаг 9. Точка входа (см. [11](11-frontend-architecture.md), [14](14-design-system.md))
- `index.tsx` (HTML + инлайн-CSS + монтирование `<App>`).
- `invite.tsx`.

## Шаг 10. Composables (см. [12](12-composables.md))
- Все 9 файлов `composables/*.ts`.

## Шаг 11. Фронтенд-компоненты (см. [13](13-components.md))
В порядке зависимостей:
1. `components/Modal.vue` (базовая модалка).
2. Элементы сообщения: `MarkdownMessage`, `MessageReactions`, `MessageReply`, `MessageFiles`, `VoiceMessage`, `VideoNote`, `ForwardedFrom`, `ReadReceipts`, `DateDivider`, `TypingIndicator`, `MentionPicker`, `MentionIndicator`, `MessageActionsMenu`, `MediaViewer`, `GlobalAudioPlayer`.
3. Запись медиа: `VoiceRecorder*`, `VideoRecorder*`, `AttachMenu`.
4. Чат: `ChatView.vue`, `ParticipantsPanel`, `PinnedMessage`, `ChatProfileModal`, `ChatSearchPanel`, `ModerationModal`, `InviteModal`, `ChatAgentsModal`, `ForwardMessageModal`, `UserProfileModal`.
5. Сайдбар: `ChatsList.vue`, `ChatFilters`, `FolderModal`, `AddToFolderModal`, `PinnedChatsList`, `InvitesList`, `UsersListModal`, `WelcomeView`, `CreateChatModal`, `OnboardingModal`.
6. Профиль/настройки: `ProfileView`, `PrivacySettings`, `AvatarCropperModal`, `AdminSettings`, `AgentChatsList`, `AgentsSettings`, `ChatSettings`, `SubscriptionPlansSettings`, `SubscriptionModal`, `SubscriptionRequired`, `SubscriptionsList`, `ParticipantDirectChat`.
7. `pages/LandingPage.vue`.
8. `App.vue` (корень — связывает всё).

## Шаг 12. Настройка окружения
- `api/push/send-fcm.ts`: подставить `serviceAccount` Firebase.
- `firebase-config.js`: web-config Firebase.
- Иконки `icons/icon-192.png`, `icons/icon-512.png`.

## Чек-лист приёмки

- [ ] Создание группы/канала/личного чата; отправка/редактирование/удаление сообщений.
- [ ] Реакции (одна на пользователя), reply, пересылка, упоминания, индикатор непрочитанных.
- [ ] Файлы/изображения/голосовые (+транскрипция)/видео-кружки.
- [ ] Real-time: новые сообщения, typing, read-receipts, pinned — без перезагрузки.
- [ ] Приглашения (username/email/phone/ссылка), приём по `/tg/invite~<token>`.
- [ ] Папки, закрепление чатов (drag&drop), фильтры, inbox-бейджи (изоляция `appId:'tg'`).
- [ ] Роли owner/admin/guest, модерация (мьют/бан + авто-снятие), блокировки, приватность ЛС.
- [ ] AI-агент в группе (режимы all/admins/mention) и личный чат с агентом; тулы отвечают.
- [ ] Платный чат: тариф, оплата (paymentLink), активация, автопродление, ручная выдача.
- [ ] Профиль, онбординг, темы, масштаб, PWA-установка, push.
