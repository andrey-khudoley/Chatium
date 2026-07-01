@chatium

# Модуль @sender: Работа с каналами коммуникации

Исчерпывающее руководство по работе с модулем `@sender` для управления мессенджерами, чатами, сообщениями и каналами связи в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Архитектура модуля](#архитектура-модуля)
- [Подписка на обновления](#подписка-на-обновления)
  - [Хук message-received](#хук-message-received)
  - [Собственный endpoint](#собственный-endpoint)
- [Работа с сообщениями](#работа-с-сообщениями)
- [Работа с чатами](#работа-с-чатами)
- [Работа с профилями (Person)](#работа-с-профилями-person)
- [Управление тегами](#управление-тегами)
- [Отправка сообщений](#отправка-сообщений)
- [Работа с каналами](#работа-с-каналами)
- [Работа с файлами](#работа-с-файлами)
- [Бакеты и стартовые параметры](#бакеты-и-стартовые-параметры)
- [Токены связи](#токены-связи)
- [Telegram специфичные методы](#telegram-специфичные-методы)
- [VK специфичные методы](#vk-специфичные-методы)
- [Типы данных](#типы-данных)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**@sender** — модуль для работы с любыми каналами коммуникации: Telegram, VK, Email, Viber, Wazzup24, Gmail, SMS и другими.

### Ключевые возможности

- **Мультиканальность** — единый API для всех мессенджеров
- **Чаты и профили** — управление переписками и пользователями
- **Теги и сегментация** — классификация пользователей
- **Метрики и UTM** — отслеживание источников переходов
- **Хуки и события** — реакция на входящие сообщения

### Когда использовать

- ✅ Отправка уведомлений в мессенджеры
- ✅ Обработка входящих сообщений
- ✅ Управление чатами и профилями
- ✅ Сегментация пользователей по тегам
- ✅ Интеграция с Telegram/VK/Email
- ✅ Создание ботов с deep links

---

## Архитектура модуля

Модуль состоит из четырёх основных частей:

### 1. Каналы связи (Channel)

Настройка источников коммуникации:

- Telegram боты
- VK группы
- Email сервера
- SMS провайдеры
- Другие мессенджеры

### 2. Чаты (Chat)

Основная сущность для переписки:

- Хранение истории сообщений
- Связь с Person (профилем)
- Поиск по внутренним и внешним ID

### 3. Профили (Person)

Дополнительная информация о пользователе:

- Свойства и поля
- Теги
- UTM метки
- Связь с системным User

### 4. Метрики (Metrics)

Система отслеживания:

- UTM параметры
- Стартовые параметры
- Короткие ссылки для запуска ботов

---

## Подписка на обновления

Есть два способа получать обновления от каналов связи.

### Хук message-received

Для обработки входящих сообщений в личных чатах 1-на-1.

**⚠️ Важно**: Адрес хука должен быть точно `@sender/message-received`!

```typescript
app.accountHook('@sender/message-received', async (ctx, params: MessageReceivedParams) => {
  const { channel, chatId, person, user, message, sourcePayload } = params

  // Фильтрация по каналу (рекомендуется)
  if (channel.id !== 'your-channel-id') {
    return
  }

  ctx.account.log('Входящее сообщение', {
    level: 'info',
    json: {
      chatId,
      text: message.text,
      username: person?.username
    }
  })

  // Обработка сообщения
  if (message.text === '/start') {
    await sendMessageToChat(ctx, chatId, {
      text: 'Привет! Чем могу помочь?'
    })
  }
})
```

**Тип MessageReceivedParams**:

```typescript
type MessageReceivedParams = {
  channel: ChannelDto // Канал, откуда пришло сообщение
  chatId: string // ID чата
  person: PersonDto | null // Профиль пользователя
  user: UserDto | null // Системный пользователь (если привязан)
  message: MessageFullData // Полные данные сообщения
  sourcePayload?: any // Исходный payload от канала (не у всех)
}
```

**Ограничения**:

- ❌ Не работает с групповыми чатами и каналами
- ❌ Не работает с транспортом TelegramManager

### Собственный endpoint

Для получения всех типов обновлений (доставка, прочтение, события в группах).

**Шаг 1**: Создайте POST роут:

```typescript
const customUpdatesHandlerRoute = app.post(
  '/custom-sender-endpoint',
  async (ctx, req: app.Req<{ channelId: string; sourcePayload: unknown }>) => {
    const { channelId, sourcePayload } = req.body

    ctx.account.log('Обновление от канала', {
      level: 'info',
      json: { channelId, sourcePayload }
    })

    // Исходные данные от канала связи
    const originalUpdateData = sourcePayload

    // Обработка по документации конкретного канала
    // ...

    return { success: true }
  }
)
```

**Шаг 2**: Установите endpoint через `updateChannel`:

```typescript
import { updateChannel } from '@sender/sdk'
import { customUpdatesHandlerRoute } from './routes/sender'

async function setupChannelCallback(ctx: app.Ctx, channelId: string) {
  try {
    await updateChannel(ctx, {
      id: channelId,
      callback: customUpdatesHandlerRoute.url() // null для сброса
    })

    ctx.account.log('Callback установлен', {
      level: 'info',
      json: { channelId }
    })
  } catch (error: any) {
    ctx.account.log('Ошибка установки callback', {
      level: 'error',
      json: { channelId, error: error.message }
    })
  }
}
```

---

## Работа с сообщениями

### findMessagesByChatId

Получение истории сообщений в чате.

```typescript
import { findMessagesByChatId } from '@sender/sdk'

const messages = await findMessagesByChatId(ctx, chatId, {
  limit: 50, // Лимит сообщений (по умолчанию 100)
  offset: 0, // Смещение для пагинации
  reverse: true, // Обратный порядок (новые первыми)
  mode: 'tail' // 'head' (начало) или 'tail' (конец)
})
```

**Пример: Последние 20 сообщений**:

```typescript
export const getChatHistoryRoute = app.get('/chat-history', async (ctx, req) => {
  const { chatId } = req.query

  const messages = await findMessagesByChatId(ctx, chatId, {
    limit: 20,
    reverse: true,
    mode: 'tail'
  })

  return { success: true, messages }
})
```

### deleteMessage

Удаление конкретного сообщения.

```typescript
import { deleteMessage } from '@sender/sdk'

const result = await deleteMessage(ctx, chatId, messageId)

if (result?.success) {
  ctx.account.log('Сообщение удалено')
} else {
  ctx.account.log('Ошибка удаления', { level: 'warn', json: { reason: result?.reason } })
}
```

### deleteMessagesByOrigin

Удаление сообщений по источнику.

**⚠️ Важно**: При отправке нужно указывать `originId` и `originType`.

```typescript
import { deleteMessagesByOrigin } from '@sender/sdk'

// Отправка с origin
await sendMessageToChat(ctx, chatId, {
  text: 'Уведомление о заказе',
  originId: 'order_123',
  originType: 'order_notification'
})

// Удаление всех сообщений по origin
const result = await deleteMessagesByOrigin(ctx, chatId, 'order_123', 'order_notification')
```

---

## Работа с чатами

### findChatById

Поиск чата по внутреннему ID.

```typescript
import { findChatById } from '@sender/sdk'

// Базовый вариант
const chat = await findChatById(ctx, chatId)

// С данными профиля
const chatWithPerson = await findChatById(ctx, chatId, { getPerson: true })

if (chatWithPerson) {
  ctx.account.log('Чат найден', {
    json: {
      chatId: chatWithPerson.id,
      username: chatWithPerson.person.username
    }
  })
}
```

### findChatByExternalId

Поиск чата по внешнему ID (например, telegram_id).

```typescript
import { findChatByExternalId } from '@sender/sdk'

// По channelId
const chat = await findChatByExternalId(ctx, {
  chatExternalId: '123456789', // telegram_id
  channelId: 'channel_abc',
  getPerson: true
})

// По channelExternalId
const chat2 = await findChatByExternalId(ctx, {
  chatExternalId: '123456789',
  channelExternalId: 'bot_token_hash',
  getPerson: true
})
```

### searchChats

Поиск чатов по ID или externalId.

```typescript
import { searchChats } from '@sender/sdk'

const chats = await searchChats(ctx, {
  search: '12345', // Поисковая строка
  channelId: 'channel_abc' // ID канала
})

for (const chat of chats) {
  ctx.account.log('Чат', {
    json: {
      chatId: chat.id,
      externalId: chat.externalId,
      username: chat.person.username
    }
  })
}
```

### getOrCreateChat

Получение существующего чата или создание нового.

```typescript
import { getOrCreateChat } from '@sender/sdk'

const result = await getOrCreateChat(ctx, {
  externalId: '123456789', // telegram_id, email, phone
  channelId: 'channel_abc',
  userId: ctx.user?.id // Опционально: привязка к системному User
})

if (result.success) {
  const { chat, person, message } = result

  await sendMessageToChat(ctx, chat.id, {
    text: 'Привет! Рады видеть вас!'
  })
}
```

---

## Работа с профилями (Person)

### getPersonByChatId

Получение профиля по ID чата.

```typescript
import { getPersonByChatId } from '@sender/sdk'

const person = await getPersonByChatId(ctx, chatId)

if (person) {
  ctx.account.log('Профиль', {
    json: {
      username: person.username,
      email: person.email,
      phone: person.phone,
      tags: person.tags
    }
  })
}
```

### getPersonByExternalId

Получение профиля по внешнему ID.

```typescript
import { getPersonByExternalId } from '@sender/sdk'

// Telegram ID
const person = await getPersonByExternalId(ctx, '123456789')

// Email
const person2 = await getPersonByExternalId(ctx, 'user@example.com')

// Phone
const person3 = await getPersonByExternalId(ctx, '+79991234567')
```

### getPersonsByUserId

Получение всех профилей системного пользователя.

```typescript
import { getPersonsByUserId } from '@sender/sdk'

// Все профили пользователя
const persons = await getPersonsByUserId(ctx, ctx.user.id)

// Только для определённых каналов
const personsFiltered = await getPersonsByUserId(ctx, ctx.user.id, {
  channelIds: ['telegram_channel', 'vk_channel']
})
```

### getPersonsByUid

Получение профилей по UID сессии (window.clrtUid).

```typescript
import { getPersonsByUid } from '@sender/sdk'

const persons = await getPersonsByUid(ctx, uid, {
  channelIds: ['telegram_channel']
})

for (const person of persons) {
  await sendMessageToChat(ctx, person.chat, {
    text: 'Уведомление для вашей сессии'
  })
}
```

### findPersons

Универсальный поиск профилей.

```typescript
import { findPersons } from '@sender/sdk'

// Поиск по username в Telegram
const [person] = await findPersons(ctx, {
  where: {
    username: 'chatium'
  }
})

// Поиск по тегам
const persons = await findPersons(ctx, {
  limit: 100,
  where: {
    tags: { $in: ['premium', 'active'] }
  }
})

// Сложный поиск
const personsComplex = await findPersons(ctx, {
  limit: 50,
  where: {
    $and: [
      {
        $or: [
          { externalId: { $ilike: '%@gmail.com' } },
          { email: { $like: '%@gmail.com' } },
          { user: userId },
          { title: { $like: '%John%' } }
        ]
      },
      { isBlocked: false }
    ]
  }
})
```

### updatePersonFields

Обновление полей профиля.

```typescript
import { updatePersonFields } from '@sender/sdk'

await updatePersonFields(ctx, personId, {
  title: 'Иван Петров',
  firstName: 'Иван',
  lastName: 'Петров',
  email: 'ivan@example.com',
  phone: '+79991234567',
  description: 'VIP клиент',
  utmSource: 'google',
  utmMedium: 'cpc',
  utmCampaign: 'spring_2024',
  data: {
    subscription: 'premium',
    orderCount: 5
  },
  user: ctx.user.id // Привязка к системному User (null для отвязки)
})
```

---

## Управление тегами

### getTags

Получение списка всех тегов.

```typescript
import { getTags } from '@sender/sdk'

const tags = await getTags(ctx)

for (const tag of tags) {
  ctx.account.log('Тег', {
    json: {
      id: tag.id,
      title: tag.title,
      color: tag.color,
      personsCount: tag.personsCount
    }
  })
}
```

### createTag (getOrCreateTag)

Создание нового тега.

```typescript
import { getOrCreateTag } from '@sender/sdk'

const tag = await getOrCreateTag(ctx, 'premium')

ctx.account.log('Тег создан', {
  json: { tagId: tag.id, title: tag.title }
})
```

### addTagsToPerson

Добавление тегов профилю.

```typescript
import { addTagsToPerson } from '@sender/sdk'

// По personId
await addTagsToPerson(ctx, {
  personId: 'person_123',
  tagIds: ['tag1', 'tag2']
})

// По chatId
await addTagsToPerson(ctx, {
  chatId: chatId,
  tagIds: ['active', 'premium']
})

// По externalId
await addTagsToPerson(ctx, {
  externalId: '123456789',
  tagIds: ['telegram']
})
```

### removeTagsFromPerson

Удаление тегов у профиля.

```typescript
import { removeTagsFromPerson } from '@sender/sdk'

await removeTagsFromPerson(ctx, {
  personId: 'person_123',
  tagIds: ['inactive', 'test']
})
```

---

## Отправка сообщений

### Лимит отправки (тариф «Бизнес»)

Платформенный лимит (не API-ограничение `@sender`, а тариф аккаунта): **до 10 000 сообщений в сутки** в любой транспорт на тарифе «Бизнес» (используется в этом workspace). Превышение списывается платными токенами — **0.02 токена за сообщение**.

### sendMessageToChat

Отправка сообщения в конкретный чат.

```typescript
import { sendMessageToChat } from '@sender/sdk'

const result = await sendMessageToChat(ctx, chatId, {
  text: 'Простое текстовое сообщение'
})

// С кнопками
await sendMessageToChat(ctx, chatId, {
  text: 'Выберите действие:',
  buttons: [
    [
      { text: 'Кнопка 1', url: 'https://example.com' },
      { text: 'Кнопка 2', url: 'https://example.com/2' }
    ],
    [{ text: 'Кнопка 3' }]
  ],
  inlineButtons: true // Inline кнопки в Telegram
})

// С файлами
await sendMessageToChat(ctx, chatId, {
  text: 'Вот ваш файл:',
  files: [
    {
      url: 'https://example.com/file.pdf',
      hash: 'file_hash',
      name: 'document.pdf'
    }
  ]
})

// С HTML форматированием
await sendMessageToChat(ctx, chatId, {
  textHtml: '<b>Жирный текст</b> и <i>курсив</i>',
  format: 'html'
})
```

### sendMessageToUser

Отправка во все чаты пользователя.

**⚠️ Внимание**: Сообщение отправится во ВСЕ каналы пользователя!

```typescript
import { sendMessageToUser } from '@sender/sdk'

// Со всеми каналами (опасно!)
await sendMessageToUser(ctx, userId, {
  text: 'Важное уведомление'
})

// Только определённые каналы
await sendMessageToUser(
  ctx,
  userId,
  {
    text: 'Уведомление в Telegram'
  },
  ['telegram_channel_id'] // enabledChannels
)
```

### sendMessageToSession

Отправка сообщения в сессию (по window.clrtUid).

```typescript
import { sendMessageToSession } from '@sender/sdk'

const result = await sendMessageToSession(ctx, sessionId, {
  text: 'Уведомление для вашей сессии'
})

if (result[0]?.success) {
  ctx.account.log('Отправлено', {
    json: { sentToChatIds: result[0].sentToChatIds }
  })
}
```

### sendMessageByTypeAndExternalId

Универсальная отправка по типу канала и внешнему ID.

```typescript
import { sendMessageByTypeAndExternalId } from '@sender/sdk'

// Отправка в Telegram
const result = await sendMessageByTypeAndExternalId(ctx, {
  type: 'Telegram',
  id: '123456789', // telegram_id
  channels: ['telegram_channel_id'], // Рекомендуется!
  message: {
    text: 'Привет из Chatium!'
  },
  createChatParams: {
    firstName: 'Иван',
    lastName: 'Петров',
    userId: ctx.user?.id // Привязка к User
  },
  wrapLinks: true, // Обернуть ссылки для отслеживания кликов
  addLinksParams: {
    utm_source: 'bot',
    utm_medium: 'notification'
  }
})

// Отправка Email
await sendMessageByTypeAndExternalId(ctx, {
  type: 'External',
  id: 'user@example.com',
  channels: ['email_channel_id'],
  message: {
    textHtmlEmail: '<h1>Заголовок</h1><p>Текст письма</p>',
    extra: {
      subject: 'Тема письма',
      from: 'noreply@example.com',
      senderName: 'Моя Компания'
    }
  }
})
```

---

## Работа с каналами

### getChannels

Получение списка каналов.

```typescript
import { getChannels } from '@sender/sdk'

// Все каналы
const channels = await getChannels(ctx)

for (const channel of channels) {
  ctx.account.log('Канал', {
    json: {
      id: channel.id,
      title: channel.title,
      source: channel.source,
      active: channel.active
    }
  })
}

// Конкретный канал
const [channel] = await getChannels(ctx, { id: 'channel_abc' })
```

**Выбор канала по запросу пользователя**:

```typescript
async function selectChannel(ctx: app.Ctx, userRequest: string) {
  const channels = await getChannels(ctx)

  // Поиск подходящего канала
  const telegramChannel = channels.find((c) => c.source === 'Telegram')
  const vkChannel = channels.find((c) => c.source === 'Vk')
  const emailChannel = channels.find((c) => c.source === 'External' && c.title.includes('Email'))

  // Если не уверены - спросите пользователя
  return { telegram: telegramChannel, vk: vkChannel, email: emailChannel }
}
```

### createOrUpdateChannelBySecret

Создание или обновление канала по токену.

```typescript
import { createOrUpdateChannelBySecret } from '@sender/sdk'

const channel = await createOrUpdateChannelBySecret(ctx, {
  source: 'Telegram',
  secret: 'YOUR_BOT_TOKEN',
  callback: customUpdatesHandlerRoute.url(), // null для сброса
  setWebhook: true // Установить webhook автоматически
})

ctx.account.log('Канал создан', {
  json: {
    channelId: channel.id,
    title: channel.title
  }
})
```

---

## Работа с файлами

Файлы в Sender нужны для отправки по ID, так как многие каналы ограничивают размер файлов по URL.

### getFiles

Получение списка файлов.

```typescript
import { getFiles } from '@sender/sdk'

// Все файлы
const files = await getFiles(ctx)

// Только изображения
const images = await getFiles(ctx, {
  type: 'Image'
})

// По каналу
const telegramFiles = await getFiles(ctx, {
  channel: 'telegram_channel_id'
})

for (const file of files) {
  ctx.account.log('Файл', {
    json: {
      id: file.id,
      title: file.title,
      type: file.type,
      externalId: file.externalId, // file_id в Telegram
      hash: file.hash
    }
  })
}
```

**Типы файлов**:

- `Document` — документы
- `Image` — изображения
- `Video` — видео
- `Audio` — аудио
- `VideoNote` — видео-сообщения
- `AudioNote` — голосовые сообщения

**Отправка файла по ID**:

```typescript
const files = await getFiles(ctx, { type: 'Image' })
const firstImage = files[0]

await sendMessageToChat(ctx, chatId, {
  text: 'Изображение из библиотеки:',
  files: [
    {
      url: '', // Можно оставить пустым
      hash: firstImage.hash,
      extra: {
        type: 'Image',
        channels: {
          [channelId]: {
            externalId: firstImage.externalId
          }
        }
      }
    }
  ]
})
```

---

## Бакеты и стартовые параметры

Бакеты позволяют "упаковать" данные в строковый ID для передачи через стартовые параметры бота.

### createBucket

Создание бакета с данными.

```typescript
import { createBucket } from '@sender/sdk'

const bucket = await createBucket(
  ctx,
  {
    uid: clrtUid, // Рекомендуется! Для связи с сессией
    ref: 'campaign_123',
    promoCode: 'DISCOUNT2024',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'spring_sale',
    userProfileId: 'user_456',
    userId: ctx.user?.id // Для связи с системным User
  },
  clrtUid
) // key (опционально)

return {
  success: true,
  // Ссылка для запуска бота
  link: `https://t.me/YourBotUsername?start=bucket-${bucket.id}`
}
```

### findBucketById

Получение данных из бакета.

```typescript
import { findBucketById } from '@sender/sdk'

app.accountHook('@sender/message-received', async (ctx, params) => {
  const messageText = params.message.text || ''

  // Проверка команды /start с параметром
  const startMatch = messageText.match(/^\/start\s+bucket-(\w+)/)

  if (startMatch) {
    const bucketId = startMatch[1]
    const bucket = await findBucketById(ctx, bucketId)

    if (bucket) {
      const { promoCode, ref, utmSource, userProfileId } = bucket.data

      ctx.account.log('Бакет обработан', {
        json: { bucketId, data: bucket.data }
      })

      await sendMessageToChat(ctx, params.chatId, {
        text: `Привет! Ваш промокод: ${promoCode}`
      })
    }
  }
})
```

### updateOrCreateBucket

Обновление или создание бакета.

```typescript
import { updateOrCreateBucket } from '@sender/sdk'

const bucket = await updateOrCreateBucket(ctx, bucketId, {
  ...existingData,
  visited: true,
  visitedAt: new Date().toISOString()
})
```

---

## Токены связи

### getOrCreateUserChatLinkToken

Создание токена для привязки User к чату.

```typescript
import { getOrCreateUserChatLinkToken } from '@sender/sdk'

const token = await getOrCreateUserChatLinkToken(ctx, ctx.user.id, {
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 минут
  callbackUrl: chatLinkProcessedRoute.url() // Опционально
})

return {
  success: true,
  // Ссылка для привязки
  link: `https://t.me/YourBotUsername?start=user-${token}`
}
```

**Обработка привязки**:

```typescript
app.accountHook('@sender/message-received', async (ctx, params) => {
  const messageText = params.message.text || ''
  const userMatch = messageText.match(/^\/start\s+user-(\w+)/)

  if (userMatch) {
    // Привязка произойдёт автоматически
    await sendMessageToChat(ctx, params.chatId, {
      text: 'Чат успешно привязан к вашему аккаунту!'
    })
  }
})
```

---

## Telegram специфичные методы

### runTelegramApi

Прямой вызов Telegram Bot API.

```typescript
import { runTelegramApi } from '@sender/sdk'

const [success, result, error] = (await runTelegramApi(ctx, chatId, 'sendMessage', {
  text: 'Сообщение через Telegram API',
  parse_mode: 'HTML'
})) || [false, null, 'No response']

if (success) {
  ctx.account.log('Отправлено', { json: result })
} else {
  ctx.account.log('Ошибка', { level: 'error', json: { error } })
}
```

### getTelegramGroups

Получение Telegram групп и каналов.

```typescript
import { getTelegramGroups } from '@sender/sdk'

const groups = await getTelegramGroups(ctx)

for (const group of groups) {
  ctx.account.log('Группа', {
    json: {
      id: group.id,
      title: group.title,
      username: group.username,
      active: group.active
    }
  })
}
```

### getLastActiveGroupsForTgManager

Получение активных групп для Telegram Manager.

```typescript
import { getLastActiveGroupsForTgManager } from '@sender/sdk'

const groupIds = await getLastActiveGroupsForTgManager(ctx, tgManagerId)

ctx.account.log('Активные группы', { json: { count: groupIds.length } })
```

---

## VK специфичные методы

### runVkApi

Прямой вызов VK API.

```typescript
import { runVkApi } from '@sender/sdk'

const [success, response, error] = (await runVkApi(ctx, channelId, 'messages.send', {
  peer_id: 123456,
  message: 'Привет из VK!',
  random_id: Math.random()
})) || [false, null, 'No response']
```

### getOrCreateVkChat

Создание или получение VK чата.

```typescript
import { getOrCreateVkChat } from '@sender/sdk'

const result = await getOrCreateVkChat(ctx, {
  groupId: 'vk_group_id',
  vkUserId: 12345678,
  userId: ctx.user?.id,
  details: {
    firstName: 'Иван',
    lastName: 'Петров',
    email: 'ivan@example.com',
    phone: '+79991234567'
  }
})

if (result?.success) {
  await sendMessageToChat(ctx, result.chat.id, {
    text: 'Добро пожаловать в VK чат!'
  })
}
```

### getVkGroupInfo

Получение информации о VK группе.

```typescript
import { getVkGroupInfo } from '@sender/sdk'

const groupInfo = await getVkGroupInfo(ctx, channelId)

ctx.account.log('Группа VK', { json: groupInfo })
```

---

## Типы данных

### ChannelDto

```typescript
type ChannelDto = {
  id: string
  externalId: string | null
  title: string
  source: ChannelSource
  photo: string | { hash: string; size: number; name: string; type: string } | null
  description: string | null
  username: string | null
  active: boolean
  externalKey: string | null
  confirm: string | null
  callback: string | null
  options: any
}

type ChannelSource =
  | 'Chatium' // Виджет на сайт
  | 'Telegram' // Общение 1-на-1, не пишет в группы
  | 'TelegramManager' // Для групп и каналов, не отвечает в личных
  | 'Viber'
  | 'Vk'
  | 'External' // Универсальный для кастомных интеграций
```

### ChatDto

```typescript
type ChatDto = {
  id: string
  channel: string
  person: string
  externalId: string
  unreadCount: number
  lastMessageText: string | null
  hidden: boolean | null
  isBlocked: boolean
  createdAt: string
  updatedAt: string
}
```

### PersonDto

```typescript
type PersonDto = {
  id: string
  channel: string
  chat: string | null
  uid: string | null // ID сессии (window.clrtUid)
  externalId: string // telegram_id, email, phone
  title: string
  firstName: string | null
  lastName: string | null
  description: string | null
  username: string | null
  email: string | null
  phone: string | null
  notes: string | null
  icon: { name: string[] }
  photo: string | null
  originalPhoto: string | null
  user: string | undefined // Системный User ID
  lastSeenUrl: string | null
  data: any
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  mailings: string[]
  tags: string[]
  createdAt: string
}
```

### SendMessageInfo

```typescript
interface SendMessageInfo {
  text?: string | null
  textHtml?: string | null
  textHtmlEmail?: string | null
  textHtmlTelegram?: string | null
  textMarkdown?: string | null
  format?: 'plain' | 'html' | 'markdown'
  buttons?: MessageButton[][]
  inlineButtons?: boolean
  isPersistentKeyboard?: boolean
  mailingId?: string
  mailingScheduleId?: string
  extra?: any
  files?: Array<FileInfo>
  originId?: string
  originType?: string
  linkPreviewOptions?: {
    isDisabled?: boolean
    url?: string
    showAboveText?: boolean
  }
  protectContent?: boolean
}
```

---

## Лучшие практики

### Логирование

✅ **Всегда логируйте важные события**:

```typescript
app.accountHook('@sender/message-received', async (ctx, params) => {
  ctx.account.log('Входящее сообщение', {
    level: 'info',
    json: {
      chatId: params.chatId,
      text: params.message.text,
      channel: params.channel.title
    }
  })

  // Обработка
})
```

### Обработка ошибок

✅ **Проверяйте результаты**:

```typescript
try {
  const result = await runTelegramApi(ctx, chatId, 'sendMessage', { text: 'Test' })

  if (result) {
    const [success, data, error] = result
    if (!success) {
      ctx.account.log('Ошибка Telegram API', {
        level: 'error',
        json: { error }
      })
    }
  }
} catch (error: any) {
  ctx.account.log('Системная ошибка', {
    level: 'error',
    json: { error: error.message }
  })
}
```

### Фильтрация по каналу

✅ **Фильтруйте сообщения по каналу**:

```typescript
app.accountHook('@sender/message-received', async (ctx, params) => {
  // Обрабатываем только сообщения из определённого канала
  if (params.channel.id !== 'your-telegram-channel') {
    return
  }

  // Обработка
})
```

### Проверка null

✅ **Проверяйте на null**:

```typescript
const chat = await findChatById(ctx, chatId)

if (!chat) {
  return { success: false, error: 'Чат не найден' }
}

// Работа с chat
```

### Пагинация

✅ **Используйте пагинацию для больших выборок**:

```typescript
async function getAllPersons(ctx: app.Ctx) {
  const allPersons = []
  let offset = 0
  const limit = 100

  while (true) {
    const persons = await findPersons(ctx, {
      limit,
      offset,
      where: { isBlocked: false }
    })

    if (persons.length === 0) break

    allPersons.push(...persons)
    offset += limit
  }

  return allPersons
}
```

---

## Связанные документы

- **002-routing.md** — Роуты и хуки
- **010-agents.md** — Интеграция агентов с Sender
- **005-jobs.md** — Отложенная отправка сообщений
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.0  
**Дата**: 2025-11-03  
**Последнее обновление**: Создание исчерпывающей инструкции по модулю @sender
