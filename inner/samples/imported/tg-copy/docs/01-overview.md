# 01. Обзор

## Назначение

`tg-copy` — полнофункциональный мессенджер в стиле Telegram: групповые чаты, каналы, личные чаты, платные чаты с подписками, AI-агенты в чатах, голосовые/видео-сообщения, реакции, упоминания, папки, push-уведомления. Реализован как Single Page Application (Vue 3) с серверным бэкендом на платформе Chatium.

## Технологический стек

| Слой | Технология |
| --- | --- |
| Серверные роуты | Chatium file-based routing (глобальный `app`) |
| Сообщения/участники/фиды | `@app/feed` (Feed API) |
| Метаданные/таблицы | `@app/heap` (Heap-таблицы) |
| Real-time | `@app/socket` (`sendDataToSocket`, `genSocketId`, `getOrCreateBrowserSocketClient`) |
| Авторизация | `@app/auth` (`requireRealUser`, `requireAccountRole`, identities, bot-users) |
| Платежи | `@pay/sdk` (`runAttemptPayment`, `attemptAutoCharge`, `getSavedCards`) |
| AI-агенты | `@ai-agents/sdk/process` (`findAgents`, `pushMessageToChain`) |
| Файлы | `@app/storage` (`obtainStorageFilePutUrl`, `getThumbnailUrl`) |
| Inbox-бейджи | `@app/inbox` (`getInboxData`, `resetInboxBadge`) |
| Уведомления владельцам | `@user-notifier/sdk` (`sendNotificationToAccountOwners`) |
| CRM-события | `@crm/sdk` (`captureCustomerEvent`) |
| Транскрипция аудио | `@start/sdk` (`transcriptAudio`) |
| Push | FCM v1 (JWT RS256 через `jsrsasign`, OAuth2), Service Worker |
| UI | Vue 3 `<script setup>`, Tailwind (CDN), FontAwesome 6, Cropper.js |

Частота использования платформенных модулей (по импортам): `@app/auth` (37), `@app/feed` (24), `@app/heap` (22), `@app/socket` (17).

## Фич-набор (реализовано в коде)

- **Чаты**: группы, каналы (broadcast, пишут только owner/admin), личные (direct), публичные, платные.
- **Сообщения**: текст с markdown, reply, пересылка, редактирование (только автор), удаление, системные сообщения.
- **Вложения**: изображения, видео, файлы, голосовые (waveform + транскрипция), видео-кружки.
- **Реакции**: одна реакция на пользователя на сообщение, пикер эмодзи.
- **Упоминания**: формат `@[Имя](userId)`, пикер, индикатор непрочитанных (таблица `read_mentions`).
- **Real-time**: typing-индикатор, read-receipts, live-доставка через WebSocket.
- **Организация**: кастомные папки, закрепление чатов (drag&drop), фильтры, закреплённые сообщения, inbox-бейджи с изоляцией по `appId: 'tg'`.
- **Приглашения**: по username/email/phone/userId и по инвайт-ссылке (7 дней).
- **Роли**: `owner` / `admin` / `guest` в чате; `Admin` / `Owner` на уровне воркспейса.
- **Модерация**: мьют/бан с длительностью, авто-снятие по таймеру (job).
- **Блокировки**: двусторонний чёрный список для личных чатов, настройки приватности ЛС.
- **AI-агенты**: личный чат с агентом, агент в группе с режимами ответа (all/admins/mention), тулы `replyInGroupChat` / `sendImageToGroupChat`.
- **Платные чаты**: тарифы с периодами (дни/месяцы/годы, календарные кварталы), оплата, автопродление, ручная выдача подписки админом.
- **Профиль**: имя, username, пол, дата рождения, аватар (кроп).
- **Онбординг**: обязательное заполнение имени и username при первом входе.
- **PWA**: манифест, установка на устройство, push-уведомления через FCM.
- **UI**: светлая/тёмная тема, масштаб интерфейса 50–300%, адаптивность.

## Статус подсистем

| Подсистема | Статус |
| --- | --- |
| Чаты/сообщения/участники | ✅ реализовано |
| Реакции, упоминания, reply, пересылка | ✅ реализовано |
| Голосовые/видео/файлы + транскрипция | ✅ реализовано |
| Папки, закрепление, inbox-бейджи | ✅ реализовано |
| Платные подписки (`@pay/sdk`) | ✅ реализовано |
| AI-агенты (`@ai-agents/sdk`) | ✅ реализовано |
| Push (FCM v1) | ✅ реализовано (в коде есть, хотя старая `.CHATIUM-LLM.md` утверждает обратное) |
| Модерация (мьют/бан) | ✅ реализовано |
| **Федеративные чаты** | ❌ **не реализовано** — только спека в [../fed-docs/](../fed-docs/) |

## Что нужно подставить вручную

- `api/push/send-fcm.ts` — `serviceAccount` (project_id, private_key, client_email), плейсхолдеры `YOUR_*`.
- `firebase-config.js` — клиентский Firebase-config, плейсхолдеры `YOUR_*`.
