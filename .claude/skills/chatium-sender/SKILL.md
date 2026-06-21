---
name: chatium-sender
description: Модуль @sender/sdk в Chatium — каналы, чаты, Person, отправка сообщений, теги, хуки входящих. Использовать при работе с мессенджерами (Telegram, VK, Email), отправке уведомлений, создании ботов.
---

# chatium-sender

Работа с каналами коммуникации: Telegram, VK, Email и др. Отправка сообщений, получение каналов и профилей (Person), теги, обработка входящих сообщений через хуки.

## Когда использовать

- Отправка уведомлений в мессенджеры
- Обработка входящих сообщений (боты)
- Управление чатами и профилями (Person)
- Сегментация по тегам
- Интеграция с Telegram/VK/Email
- Deep links и UTM-атрибуция через бакеты

## Основные сущности

- **Channel** — канал связи (Telegram-бот, VK-группа, email-сервер и т.д.)
- **Chat** — чат с историей сообщений, связан с Person
- **Person** — профиль пользователя канала (свойства, теги, UTM, связь с User)

Типы источников канала (`ChannelSource`):
- `'Telegram'` — личные чаты 1-на-1 (не пишет в группы)
- `'TelegramManager'` — группы и каналы (не отвечает в личных)
- `'Vk'` — VK группы
- `'External'` — универсальный для кастомных интеграций (Email, SMS)
- `'Chatium'` — виджет на сайте

## Импорт

Все функции импортируются из `@sender/sdk`:

```ts
import { sendMessageToChat, getChannels, findPersons } from '@sender/sdk'
```

## Отправка сообщений

### sendMessageToChat — отправка в конкретный чат

```ts
import { sendMessageToChat } from '@sender/sdk'

// Простой текст
await sendMessageToChat(ctx, chatId, { text: 'Привет!' })

// С кнопками (inline в Telegram)
await sendMessageToChat(ctx, chatId, {
  text: 'Выберите действие:',
  buttons: [
    [{ text: 'Кнопка 1', url: 'https://example.com' }],
    [{ text: 'Кнопка 2', url: 'https://example.com/2' }]
  ],
  inlineButtons: true
})

// С файлами
await sendMessageToChat(ctx, chatId, {
  text: 'Вот файл:',
  files: [{ url: 'https://example.com/file.pdf', hash: 'file_hash', name: 'document.pdf' }]
})

// С HTML-форматированием
await sendMessageToChat(ctx, chatId, {
  textHtml: '<b>Жирный</b> и <i>курсив</i>',
  format: 'html'
})

// С originId для последующего удаления
await sendMessageToChat(ctx, chatId, {
  text: 'Уведомление о заказе',
  originId: 'order_123',
  originType: 'order_notification'
})
```

### sendMessageToUser — во все чаты пользователя

```ts
import { sendMessageToUser } from '@sender/sdk'

// Только в определённые каналы (рекомендуется)
await sendMessageToUser(ctx, userId, { text: 'Уведомление' }, ['telegram_channel_id'])

// Во все каналы пользователя (осторожно — отправит везде)
await sendMessageToUser(ctx, userId, { text: 'Важное' })
```

### sendMessageByTypeAndExternalId — по типу канала и внешнему ID

```ts
import { sendMessageByTypeAndExternalId } from '@sender/sdk'

// Telegram по telegram_id
await sendMessageByTypeAndExternalId(ctx, {
  type: 'Telegram',
  id: '123456789',
  channels: ['telegram_channel_id'], // рекомендуется указывать
  message: { text: 'Привет!' },
  createChatParams: { firstName: 'Иван', userId: ctx.user?.id }
})

// Email
await sendMessageByTypeAndExternalId(ctx, {
  type: 'External',
  id: 'user@example.com',
  channels: ['email_channel_id'],
  message: {
    textHtmlEmail: '<h1>Заголовок</h1><p>Текст</p>',
    extra: { subject: 'Тема', from: 'noreply@example.com', senderName: 'Компания' }
  }
})
```

### sendMessageToSession — по UID сессии

```ts
import { sendMessageToSession } from '@sender/sdk'

const result = await sendMessageToSession(ctx, sessionId, { text: 'Для вашей сессии' })
```

## Подписка на входящие сообщения

### Хук @sender/message-received

Адрес хука должен быть **точно** `@sender/message-received`. Работает только для личных чатов 1-на-1 (не групп, не TelegramManager).

```ts
app.accountHook('@sender/message-received', async (ctx, params: MessageReceivedParams) => {
  // Фильтрация по каналу — рекомендуется
  if (params.channel.id !== 'your-channel-id') return

  const { chatId, person, user, message, sourcePayload } = params

  ctx.account.log('Входящее сообщение', {
    level: 'info',
    json: { chatId, text: message.text, username: person?.username }
  })

  if (message.text === '/start') {
    await sendMessageToChat(ctx, chatId, { text: 'Привет! Чем могу помочь?' })
  }
})
```

Параметры `MessageReceivedParams`:
- `channel: ChannelDto` — канал, откуда пришло сообщение
- `chatId: string` — ID чата
- `person: PersonDto | null` — профиль пользователя
- `user: UserDto | null` — системный пользователь (если привязан)
- `message: MessageFullData` — полные данные сообщения
- `sourcePayload?: any` — исходный payload от канала

### Собственный endpoint (для групп и событий доставки)

```ts
// Шаг 1: создать POST-роут
const customUpdatesHandlerRoute = app.post(
  '/custom-sender-endpoint',
  async (ctx, req: app.Req<{ channelId: string; sourcePayload: unknown }>) => {
    const { channelId, sourcePayload } = req.body
    ctx.account.log('Обновление', { level: 'info', json: { channelId, sourcePayload } })
    return { success: true }
  }
)

// Шаг 2: установить callback через updateChannel
import { updateChannel } from '@sender/sdk'

await updateChannel(ctx, {
  id: channelId,
  callback: customUpdatesHandlerRoute.url() // null для сброса
})
```

## Работа с каналами

```ts
import { getChannels, createOrUpdateChannelBySecret } from '@sender/sdk'

// Все каналы
const channels = await getChannels(ctx)

// Конкретный канал
const [channel] = await getChannels(ctx, { id: 'channel_abc' })

// Создать/обновить канал по токену
const channel = await createOrUpdateChannelBySecret(ctx, {
  source: 'Telegram',
  secret: 'BOT_TOKEN',
  callback: customUpdatesHandlerRoute.url(),
  setWebhook: true
})
```

## Работа с чатами

```ts
import { findChatById, findChatByExternalId, searchChats, getOrCreateChat } from '@sender/sdk'

// По внутреннему ID (с профилем)
const chat = await findChatById(ctx, chatId, { getPerson: true })

// По внешнему ID (telegram_id)
const chat = await findChatByExternalId(ctx, {
  chatExternalId: '123456789',
  channelId: 'channel_abc',
  getPerson: true
})

// Поиск по строке
const chats = await searchChats(ctx, { search: '12345', channelId: 'channel_abc' })

// Получить или создать чат
const result = await getOrCreateChat(ctx, {
  externalId: '123456789', // telegram_id, email или телефон
  channelId: 'channel_abc',
  userId: ctx.user?.id
})
if (result.success) {
  await sendMessageToChat(ctx, result.chat.id, { text: 'Привет!' })
}
```

## Работа с профилями (Person)

```ts
import { getPersonByChatId, getPersonByExternalId, getPersonsByUserId, findPersons, updatePersonFields } from '@sender/sdk'

// По chatId
const person = await getPersonByChatId(ctx, chatId)

// По внешнему ID (telegram_id, email, телефон)
const person = await getPersonByExternalId(ctx, '123456789')

// Все профили пользователя
const persons = await getPersonsByUserId(ctx, ctx.user.id)
const filtered = await getPersonsByUserId(ctx, ctx.user.id, { channelIds: ['telegram_channel'] })

// Поиск по полям и тегам
const persons = await findPersons(ctx, {
  limit: 100,
  where: { tags: { $in: ['premium', 'active'] } }
})

const persons = await findPersons(ctx, {
  limit: 50,
  where: {
    $and: [
      { $or: [{ email: { $like: '%@gmail.com' } }, { user: userId }] },
      { isBlocked: false }
    ]
  }
})

// Обновление полей
await updatePersonFields(ctx, personId, {
  title: 'Иван Петров',
  firstName: 'Иван',
  email: 'ivan@example.com',
  utmSource: 'google',
  data: { subscription: 'premium' },
  user: ctx.user.id // привязать к User (null — отвязать)
})
```

## Управление тегами

```ts
import { getTags, getOrCreateTag, addTagsToPerson, removeTagsFromPerson } from '@sender/sdk'

// Список тегов
const tags = await getTags(ctx)

// Создать/получить тег
const tag = await getOrCreateTag(ctx, 'premium')

// Добавить теги (по personId, chatId или externalId)
await addTagsToPerson(ctx, { personId: 'person_123', tagIds: ['premium', 'active'] })
await addTagsToPerson(ctx, { chatId: chatId, tagIds: ['active'] })

// Удалить теги
await removeTagsFromPerson(ctx, { personId: 'person_123', tagIds: ['inactive'] })
```

## Работа с сообщениями

```ts
import { findMessagesByChatId, deleteMessage, deleteMessagesByOrigin } from '@sender/sdk'

// История сообщений
const messages = await findMessagesByChatId(ctx, chatId, {
  limit: 20,
  reverse: true,
  mode: 'tail' // 'head' или 'tail'
})

// Удалить сообщение
await deleteMessage(ctx, chatId, messageId)

// Удалить по origin (предварительно отправить с originId/originType)
await deleteMessagesByOrigin(ctx, chatId, 'order_123', 'order_notification')
```

## Бакеты (deep links и UTM)

Бакеты упаковывают данные в строковый ID для передачи через стартовые параметры бота.

```ts
import { createBucket, findBucketById, updateOrCreateBucket } from '@sender/sdk'

// Создать бакет
const bucket = await createBucket(ctx, {
  uid: clrtUid,        // рекомендуется для связи с сессией
  ref: 'campaign_123',
  promoCode: 'DISCOUNT2024',
  utmSource: 'google',
  utmCampaign: 'spring_sale',
  userId: ctx.user?.id
}, clrtUid)            // key (опционально)

const link = `https://t.me/YourBotUsername?start=bucket-${bucket.id}`

// Обработка в хуке
app.accountHook('@sender/message-received', async (ctx, params) => {
  const startMatch = (params.message.text || '').match(/^\/start\s+bucket-(\w+)/)
  if (startMatch) {
    const bucket = await findBucketById(ctx, startMatch[1])
    if (bucket) {
      await sendMessageToChat(ctx, params.chatId, {
        text: `Ваш промокод: ${bucket.data.promoCode}`
      })
    }
  }
})
```

## Токены привязки чата к User

```ts
import { getOrCreateUserChatLinkToken } from '@sender/sdk'

const token = await getOrCreateUserChatLinkToken(ctx, ctx.user.id, {
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 минут
  callbackUrl: chatLinkProcessedRoute.url()           // опционально
})

const link = `https://t.me/YourBotUsername?start=user-${token}`
```

## Telegram-специфика

```ts
import { runTelegramApi, getTelegramGroups } from '@sender/sdk'

// Прямой вызов Telegram Bot API
const [success, result, error] = (await runTelegramApi(ctx, chatId, 'sendMessage', {
  text: 'Через Telegram API',
  parse_mode: 'HTML'
})) || [false, null, 'No response']

if (!success) {
  ctx.account.log('Ошибка Telegram API', { level: 'error', json: { error } })
}

// Список групп и каналов
const groups = await getTelegramGroups(ctx)
```

## VK-специфика

```ts
import { runVkApi, getOrCreateVkChat, getVkGroupInfo } from '@sender/sdk'

// Прямой вызов VK API
const [success, response, error] = (await runVkApi(ctx, channelId, 'messages.send', {
  peer_id: 123456,
  message: 'Привет из VK!',
  random_id: Math.random()
})) || [false, null, 'No response']

// Создать/получить VK чат
const result = await getOrCreateVkChat(ctx, {
  groupId: 'vk_group_id',
  vkUserId: 12345678,
  userId: ctx.user?.id,
  details: { firstName: 'Иван', email: 'ivan@example.com' }
})
```

## Чеклист

- [ ] Импорт из `@sender/sdk` (не из `@sender`)
- [ ] Логирование через `ctx.account.log()`, не `console.log`
- [ ] `sendMessageToChat(ctx, chatId, { text })` — базовый паттерн отправки
- [ ] Хук `@sender/message-received` — адрес строго такой
- [ ] В хуке — фильтр по `params.channel.id`
- [ ] `sendMessageToUser` — указывать `enabledChannels`, чтобы не слать во все каналы
- [ ] При удалении по origin — при отправке указывать `originId` и `originType`
- [ ] Проверять результат на `null`/`success` перед использованием
- [ ] При больших выборках `findPersons` — использовать пагинацию (`limit`/`offset`)

## Ссылки на документацию

- **012-sender.md** — исчерпывающее руководство: каналы, чаты, Person, теги, Telegram/VK, типы данных
- **002-routing.md** — роуты и хуки
- **005-jobs.md** — отложенная отправка
- **010-agents.md** — интеграция агентов с Sender
