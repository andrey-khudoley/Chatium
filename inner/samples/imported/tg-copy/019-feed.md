@chatium
# Модуль @app/feed: Фиды и чаты в Chatium

Исчерпывающее руководство по работе с модулем `@app/feed` для создания лент сообщений (фидов), чатов и омниканальной переписки в Chatium. Документ опирается на типизацию `node_modules/@app/feed/index.d.ts` и стиль документации платформы.

## Содержание

- [Основные концепции](#основные-концепции)
- [Сущности модуля](#сущности-модуля)
  - [Feed (фид)](#feed-фид)
  - [Message (сообщение)](#message-сообщение)
  - [Participant (участник)](#participant-участник)
- [Работа с фидами](#работа-с-фидами)
  - [getFeedById](#getfeedbyid)
  - [createFeed](#createfeed)
  - [updateFeed](#updatefeed)
  - [deleteFeed](#deletefeed)
  - [getChat](#getchat)
- [Работа с участниками](#работа-с-участниками)
  - [getOrCreateParticipant](#getorcreateparticipant)
  - [createOrUpdateFeedParticipant](#createorupdatefeedparticipant)
  - [deleteFeedParticipant](#deletefeedparticipant)
  - [findFeedParticipants](#findfeedparticipants)
  - [getFeedParticipantsCount](#getfeedparticipantscount)
- [Работа с сообщениями](#работа-с-сообщениями)
  - [createFeedMessage](#createfeedmessage)
  - [findFeedMessageById](#findfeedmessagebyid)
  - [findMessagesByExternalId](#findmessagesbyexternalid)
  - [findMessagesByOriginIdType](#findmessagesbyoriginidtype)
  - [findFeedMessages](#findfeedmessages)
  - [updateFeedMessage](#updatefeedmessage)
  - [deleteFeedMessage](#deletefeedmessage)
  - [setFeedPinnedMessage](#setfeedpinnedmessage)
- [HTTP-обработчики для чата](#http-обработчики-для-чата)
- [Внешние ID и омниканальность](#внешние-id-и-омниканальность)
- [Inbox и хуки фида](#inbox-и-хуки-фида)
- [Типы данных](#типы-данных)
- [Связь с @sender и другими каналами](#связь-с-sender-и-другими-каналами)
- [Лучшие практики](#лучшие-практики)
- [Связанные документы](#связанные-документы)

---

## Основные концепции

**@app/feed** — модуль для работы с лентами сообщений (фидами) и чатами внутри Chatium. Фиды хранят сообщения, участников и метаданные диалога; доступ к ним возможен через серверный API и через HTTP-эндпоинты для веб-клиента.

### Ключевые возможности

- **Единое хранилище диалогов** — фид как канонический источник правды по переписке
- **Участники (Participant)** — привязка пользователей (User) к фиду с ролями и настройками
- **Сообщения с внешними ID** — поля `external_id`, `origin_id`, `origin_type` для связи с Telegram и другими каналами
- **getChat** — получение конфигурации чата для веб-клиента (URL для получения/добавления сообщений и подписки на изменения)
- **Омниканальность** — один фид может быть представлен в веб-интерфейсе и в мессенджерах; идентификатором везде служит ID сообщения в фиде

### Когда использовать

- ✅ Чаты в веб-приложении (лента сообщений)
- ✅ Омниканальная переписка (веб + Telegram и др.) с единой историей в фиде
- ✅ Inbox-лента диалогов с кастомным отображением (хуки getInboxInfo / getParticipantInboxInfo)
- ✅ Связь сообщений мессенджеров с внутренней историей через external_id / origin_*

---

## Сущности модуля

### Feed (фид)

Фид — лента/чат: хранит метаданные (заголовок, иконка, закреплённое сообщение, последнее сообщение), ссылку на «субъект» для inbox (`model_id` / inboxSubjectId) и опциональные хуки для inbox.

**Публичные поля (UgcFeed):**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | UID фида (основной идентификатор для API) |
| `title` | string \| null | Заголовок |
| `pinnedMessageId` | string \| null | ID закреплённого сообщения |
| `lastMessageId` | string \| null | ID последнего сообщения |
| `createdAt` | Date | Дата создания |
| `updatedAt` | Date | Дата обновления |
| `inboxSubjectId` | string | Идентификатор субъекта для inbox (обновление элемента ленты при изменении фида) |
| `inboxUrl` | string \| null | URL перехода из inbox |
| `inboxExtraData` | object \| null | Дополнительные данные для отображения в inbox |
| `hooks` | FeedHooks \| null | Хуки getInboxInfo, getParticipantInboxInfo |

### Message (сообщение)

Сообщение в фиде. Может быть текстовым, системным, с блоками или историческим (Change). Поддерживает связь с внешними системами.

**Основные поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный ID сообщения в фиде (канонический идентификатор) |
| `feed_id` | number | ID фида (внутренний) |
| `external_id` | string \| null | ID сообщения во внешней системе (например, Telegram message_id) |
| `origin_id` | string \| null | Идентификатор источника (например, chat_id в Telegram) |
| `origin_type` | string \| null | Тип источника (например, `'telegram'`) |
| `type` | MessageType | `'Message'` \| `'System'` \| `'Change'` \| `'Blocks'` |
| `text` | string \| null | Текст сообщения |
| `as_feed` | boolean | Отображать как ленту (например, пересланное) |
| `reply_to` | string \| null | ID сообщения, на которое отвечаем |
| `files` | MessageFile[] \| null | Вложения |
| `sticker` | MessageSticker \| null | Стикер |
| `data` | object \| null | Произвольные данные или блоки (`blocks`) |
| `reactions` | Record<string, { user_id: HeapId }[]> \| null | Реакции по эмодзи |
| `created_at` | Date | Время создания |
| `updated_at` | Date | Время обновления |
| `created_by` | string | ID автора (User) |
| `is_deleted` | boolean | Признак удаления |

**MessageFile:**

```typescript
type MessageFile = {
  url: string
  hash: string
  meta: {
    mime: string
    size: number
    width?: number
    height?: number
    duration?: number
    name?: string
    extra?: string
  }
}
```

**MessageSticker:**

```typescript
type MessageSticker = {
  url: string
  previewUrl?: string
  emoji?: string[]
}
```

### Participant (участник)

Участник фида — привязка пользователя (User) к фиду с настройками уведомлений и отображения в inbox.

**Поля (UgcParticipant):**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID участника |
| `userId` | HeapId | ID пользователя (User) |
| `muted` | boolean | Отключить уведомления |
| `inboxDisabled` | boolean | Скрыть в inbox |
| `inboxExtraData` | object \| null | Доп. данные для inbox |
| `createdAt` | string | Дата добавления |
| `updatedAt` | string | Дата обновления |

---

## Работа с фидами

Контекст везде — `RichUgcCtx` (стандартный `ctx` в роутах и джобах Chatium). Фиды можно передавать по `id` (uid), по объекту `Feed` или `UgcFeed`.

### getFeedById

Получение фида по UID.

```typescript
import { getFeedById } from '@app/feed'

const feed = await getFeedById(ctx, feedUid)
// feed: UgcFeed
```

### createFeed

Создание нового фида.

```typescript
import { createFeed } from '@app/feed'

const feed = await createFeed(ctx, {
  title: 'Чат поддержки',
  inboxSubjectId: 'support_chat_1',  // для связи с элементом inbox
  inboxUrl: '/chat/support',
  inboxExtraData: { priority: 'high' },
  hooks: {
    getInboxInfo: '~/api/jobs/feed-inbox-info',
    getParticipantInboxInfo: '~/api/jobs/participant-inbox-info'
  }
})
```

**UgcCreateFeedProps** — все поля опциональны: `title`, `hooks`, `inboxSubjectId`, `inboxUrl`, `inboxExtraData`.

### updateFeed

Обновление фида. В параметрах обязателен `id` (uid фида).

```typescript
import { updateFeed } from '@app/feed'

const updated = await updateFeed(ctx, {
  id: feed.id,
  title: 'Новое название',
  inboxUrl: '/chat/support-v2'
})
```

### deleteFeed

Удаление фида. Принимает uid или объект фида.

```typescript
import { deleteFeed } from '@app/feed'

const deleted = await deleteFeed(ctx, feed.id)
// deleted: UgcFeed | null
```

### getChat

Получение конфигурации чата для веб-клиента: сообщения, URL для загрузки сообщений, подписки на изменения и отправки.

```typescript
import { getChat } from '@app/feed'

const chatProps = await getChat(ctx, feedOrUid, {
  useAppAccount: true,
  messagesGetUrl: myMessagesGetRoute.url(),
  messagesChangesUrl: myMessagesChangesRoute.url(),
  messagesAddUrl: myMessagesAddRoute.url()
})
// chatProps: ChatProps (lib/chatium-json) — передаётся на клиент для отображения чата
```

Если не передавать опции, используются стандартные URL приложения. Второй аргумент может быть `boolean` (useAppAccount).

---

## Работа с участниками

### getOrCreateParticipant

Получение или создание участника фида по пользователю.

```typescript
import { getOrCreateParticipant } from '@app/feed'

const participant = await getOrCreateParticipant(ctx, feedOrUid, ctx.user.id, {
  role: 'member',
  muted: false,
  inboxDisabled: false,
  silent: false
})
```

**CreateParticipantOptions:** `role`, `muted`, `data`, `hooks`, `silent`, `inboxDisabled`.

### createOrUpdateFeedParticipant

Создание или обновление участника (по сути то же, что getOrCreateParticipant, с явным акцентом на обновление).

```typescript
import { createOrUpdateFeedParticipant } from '@app/feed'

const participant = await createOrUpdateFeedParticipant(
  ctx,
  feedOrUid,
  userId,
  { muted: true }
)
```

### deleteFeedParticipant

Удаление участника из фида.

```typescript
import { deleteFeedParticipant } from '@app/feed'

await deleteFeedParticipant(ctx, feedOrUid, participantOrId)
```

### findFeedParticipants

Поиск участников фида с пагинацией и сортировкой.

```typescript
import { findFeedParticipants } from '@app/feed'

const participants = await findFeedParticipants(ctx, feedOrUid, {
  limit: 50,
  offset: 0,
  order: { createdAt: 'desc' }
})
```

### getFeedParticipantsCount

Подсчёт числа участников.

```typescript
import { getFeedParticipantsCount } from '@app/feed'

const count = await getFeedParticipantsCount(ctx, feedOrUid)
```

---

## Работа с сообщениями

### createFeedMessage

Создание сообщения в фиде. Автор задаётся пользователем (User) или HeapId.

```typescript
import { createFeedMessage } from '@app/feed'

// Простое текстовое сообщение
const msg = await createFeedMessage(ctx, feedOrUid, ctx.user.id, {
  text: 'Привет!'
})

// С внешним ID (например, из Telegram)
const msgFromTg = await createFeedMessage(ctx, feedOrUid, authorUserId, {
  text: 'Сообщение из Telegram',
  external_id: String(telegramMessageId),
  origin_id: String(telegramChatId),
  origin_type: 'telegram'
}, { sendPush: true })
```

**MessageData** может быть:

- строка — эквивалент `{ text: string }`;
- объект с `type?: 'Message'`, `text`, опционально `files`, `data`, а также полями из MessageDataCommon: `as_feed`, `reply_to`, `external_id`, `origin_id`, `origin_type`;
- объект с `type: 'System'` и `text`;
- объект с `type: 'Blocks'` и `data: { blocks: unknown[] }`;
- объект с `type: 'Change'` и `data: ChangeMessageData` (история изменений).

**CreateFeedMessageOptions:** `sendPush?: boolean`.

### findFeedMessageById

Поиск одного сообщения по ID.

```typescript
import { findFeedMessageById } from '@app/feed'

const message = await findFeedMessageById(ctx, feedOrUid, messageId)
// message: Message | null
```

### findMessagesByExternalId

Поиск сообщений по внешнему идентификатору (например, ID сообщения в Telegram). Используется для дедупликации и обновления по событиям из мессенджера.

```typescript
import { findMessagesByExternalId } from '@app/feed'

const messages = await findMessagesByExternalId(ctx, feedOrUid, String(telegramMessageId))
```

### findMessagesByOriginIdType

Поиск по паре origin_id и origin_type (например, чат и тип канала).

```typescript
import { findMessagesByOriginIdType } from '@app/feed'

const messages = await findMessagesByOriginIdType(
  ctx,
  feedOrUid,
  String(chatId),
  'telegram'
)
```

### findFeedMessages

Получение списка сообщений с пагинацией в трёх режимах: с начала (head), с конца (tail), вокруг сообщения (around).

```typescript
import { findFeedMessages } from '@app/feed'

// Последние 50 сообщений
const tail = await findFeedMessages(ctx, feedOrUid, {
  mode: 'tail',
  limit: 50,
  reverse: true
})

// Вокруг конкретного сообщения (например, для скролла в истории)
const around = await findFeedMessages(ctx, feedOrUid, {
  mode: 'around',
  messageId: someMessageId,
  limitTotal: 100,
  limitBefore: 50,
  limitAfter: 50,
  reverse: false
})
```

Ограничение: не более 1000 сообщений за один запрос; при большем `limit` выбрасывается ошибка.

### updateFeedMessage

Обновление сообщения (частичное). Позволяет, в частности, проставить `external_id` после отправки в мессенджер.

```typescript
import { updateFeedMessage } from '@app/feed'

const updated = await updateFeedMessage(ctx, feedOrUid, messageId, {
  text: 'Обновлённый текст',
  external_id: String(telegramMessageId)
})
```

### deleteFeedMessage

Удаление сообщения по ID.

```typescript
import { deleteFeedMessage } from '@app/feed'

await deleteFeedMessage(ctx, feedOrUid, messageId)
```

### setFeedPinnedMessage

Установка или сброс закреплённого сообщения.

```typescript
import { setFeedPinnedMessage } from '@app/feed'

await setFeedPinnedMessage(ctx, feedOrUid, messageId)   // закрепить
await setFeedPinnedMessage(ctx, feedOrUid, null)        // открепить
```

---

## HTTP-обработчики для чата

Модуль предоставляет готовые обработчики для организации API чата (получение списка сообщений, подписка на изменения, отправка нового сообщения, прочтение). Их можно вызывать из своих роутов.

### feedMessagesGetHandler

Обработка GET-запроса списка сообщений (query-параметры задают режим и пагинацию).

```typescript
import { feedMessagesGetHandler } from '@app/feed'

// В роуте
const result = await feedMessagesGetHandler(ctx, feedOrUid, req.query as Record<string, string>, true)
// result: FeedMessagesJson
```

### feedMessagesChangesHandler

Обработка запроса на получение изменений (long polling / изменения после указанного момента).

```typescript
import { feedMessagesChangesHandler } from '@app/feed'

const changes = await feedMessagesChangesHandler(ctx, feedOrUid, req.query as Record<string, string>)
// changes: FeedChangesJson
```

### feedMessagesAddHandler

Обработка POST-запроса на добавление сообщения (тело запроса — данные сообщения).

```typescript
import { feedMessagesAddHandler } from '@app/feed'

const result = await feedMessagesAddHandler(ctx, feedOrUid, req.body)
// result: { success: true, data: { added: ChatMessage } }
```

### feedParticipantsMarkAsReadHandler

Отметка прочтения для участника (тело запроса — параметры прочтения).

```typescript
import { feedParticipantsMarkAsReadHandler } from '@app/feed'

await feedParticipantsMarkAsReadHandler(ctx, feedOrUid, ctx.user.id, req.body)
```

### feedParticipantsLastReadHandler

Получение времени последнего прочтения для участника.

```typescript
import { feedParticipantsLastReadHandler } from '@app/feed'

const result = await feedParticipantsLastReadHandler(ctx, feedOrUid, ctx.user.id)
// result: { success: true, data: { lastReadAt: number } }
```

### feedParticipantsLastRead

Получение времени последнего прочтения для одного или нескольких пользователей (по userId).

```typescript
import { feedParticipantsLastRead } from '@app/feed'

const lastReadAt = await feedParticipantsLastRead(ctx, feedOrUid, userId)
// или для нескольких:
const lastReadAt = await feedParticipantsLastRead(ctx, feedOrUid, [id1, id2])
```

---

## Внешние ID и омниканальность

Для омниканальной переписки (веб + Telegram и др.) принято считать **каноническим идентификатором сообщения** его **id в фиде**. В мессенджерах хранится соответствие «id в канале ↔ id в фиде».

- **Веб:** клиент работает только с id сообщений фида (через getChat и обработчики сообщений).
- **Входящее из Telegram:** при получении сообщения создаётся запись в фиде через `createFeedMessage` с `external_id = String(telegramMessageId)`, `origin_type = 'telegram'`, при необходимости `origin_id = String(chatId)`. Дальше в логике везде используется возвращённый feed message `id`.
- **Исходящее в Telegram:** после создания сообщения в фиде и отправки в Telegram вызывается `updateFeedMessage`, чтобы записать в сообщение `external_id` ответа Telegram — тогда по событиям из Telegram можно найти сообщение через `findMessagesByExternalId` и оперировать его feed message id.
- **Единая передача ID:** между слоями приложения и при отображении в разных каналах передаётся только feed message `id`; при обращении к конкретному каналу (редактирование/удаление в Telegram) по этому id читается `external_id` (или отдельная таблица маппинга, если у одного сообщения несколько каналов).

Если один и тот же фид отображается в нескольких каналах и нужно хранить несколько внешних id на сообщение, можно завести отдельную таблицу маппинга (feed_message_id, channel_type, channel_message_id) или хранить объект канал→id в поле `data` сообщения.

---

## Inbox и хуки фида

Фид может быть элементом inbox (ленты диалогов). В `Feed.hooks` задаются джобы:

- **getInboxInfo** — возвращает данные для отображения элемента в ленте (заголовок, описание, иконка, бейдж, URL, subjectId и т.д.) при событиях: `messagePosted`, `participantAdded`, `participantRemove`, `markAsRead`.
- **getParticipantInboxInfo** — то же с учётом участника (персональное отображение).

Параметры хука (GetInboxInfoHookParams): `feed` (id, inboxExtraData), `lastMessage` (часть полей сообщения), `event`. Для getParticipantInboxInfo добавляется `participant`. Возвращаемый тип — **InboxInfo**: `title`, `description`, `icon`, `badge`, `subjectId`, `url`, `updatedAt`, `status`, `data`.

Типы экспортируются из `@app/feed`: `GetInboxInfoHookParams`, `GetParticipantInboxInfoHookParams`.

---

## Типы данных

### FeedMessage (экспорт для списков)

Интерфейс сообщения в формате, возвращаемом из `findFeedMessages` (camelCase):

```typescript
interface FeedMessage {
  id: string
  externalId?: string
  originId?: string
  originType?: string
  type: 'Message' | 'System' | 'Blocks'
  text?: string
  asFeed: boolean
  replyTo?: string
  files?: MessageFile[]
  sticker?: MessageSticker
  data?: JSONInputObject | { blocks: JSONValue[] } | ChangeMessageData
  reactions?: Record<string, HeapId[]>
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

### Экспорты модуля

Модуль реэкспортирует для удобства:

- **MessageData** как **FeedMessageData**
- **UgcFeed** как **Feed**
- **UgcParticipant** как **Participant**

Импорт:

```typescript
import {
  getFeedById,
  createFeed,
  createFeedMessage,
  findMessagesByExternalId,
  type Feed,
  type Participant,
  type FeedMessageData
} from '@app/feed'
```

---

## Связь с @sender и другими каналами

- **@app/feed** — хранилище диалогов и сообщений; единый источник правды по истории переписки. Не отправляет сообщения во внешние каналы.
- **@sender** (см. **012-sender.md**) — отправка в мессенджеры (Telegram, VK, Email и т.д.), приём входящих, управление чатами и профилями каналов.

Сценарий омниканальности:

1. Создать или получить фид (один фид на диалог).
2. При входящем сообщении из Telegram (хук @sender или свой endpoint): определить фид и автора (User по привязке Telegram), вызвать `createFeedMessage` с `external_id` / `origin_type` / `origin_id`.
3. При отправке в Telegram: создать сообщение в фиде через `createFeedMessage`, отправить контент через `sendMessageToChat` (или другой транспорт), при необходимости обновить сообщение фида полем `external_id` ответа Telegram.
4. В веб-интерфейсе использовать `getChat` и обработчики сообщений фида; идентификаторы — только feed message id.

Таким образом, фид и сендер дополняют друг друга: фид — хранилище и API чата, сендер — доставка в каналы и приём из них.

---

## Лучшие практики

- **Всегда использовать feed message id** как единый идентификатор сообщения в приложении и при обмене между вебом и мессенджерами.
- **Заполнять external_id и origin_*** при интеграции с внешними каналами — это нужно для дедупликации, редактирования и удаления по событиям из мессенджера.
- **Проверять доступ** к фиду перед отдачей данных клиенту; при использовании `feedMessagesGetHandler` передавать `checkAccess: true` при необходимости.
- **Ограничивать объём выборки** в findFeedMessages (лимит 1000 сообщений за запрос); для длинных историй использовать режим `around` и пагинацию на клиенте.
- **Логировать важные действия** через `ctx.account.log()` (создание/удаление фидов, ошибки при создании сообщений из вебхуков мессенджеров).

---

## Связанные документы

- **012-sender.md** — отправка в мессенджеры, приём входящих, каналы и чаты сендера
- **010-agents.md** — интеграция агентов с чатами и мессенджерами
- **014-socket.md** — real-time обновления (можно комбинировать с фидом для живого чата)
- **008-heap.md** — работа с данными; участники и привязки пользователей часто опираются на Heap-таблицы
- **002-routing.md** — организация роутов для getChat и обработчиков сообщений

---

**Версия:** 1.0  
**Дата:** 2026-02-28  
**Источник типов:** `node_modules/@app/feed/index.d.ts`
