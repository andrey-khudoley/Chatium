@chatium

# AI-агенты в Chatium

Исчерпывающее руководство по работе с AI-агентами, ботами и автоматизированными помощниками в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Быстрый старт: Telegram агент](#быстрый-старт-telegram-агент)
- [Создание агента](#создание-агента)
  - [getOrCreateAgentForWorkspace](#getorcreatеagentforworkspace)
  - [Параметры агента](#параметры-агента)
  - [Подключение инструментов](#подключение-инструментов)
  - [Выбор существующего агента](#выбор-существующего-агента)
- [Отправка сообщений агенту](#отправка-сообщений-агенту)
  - [pushMessageToChain](#pushmessagetochain)
  - [Параметры chainKey](#параметры-chainkey)
  - [Параметры wakeAgent](#параметры-wakeagent)
  - [chainParams структура](#chainparams-структура)
- [AI Generation](#ai-generation)
  - [startCompletion](#startcompletion)
  - [Модели](#модели)
  - [Сообщения и контент](#сообщения-и-контент)
  - [Callback функции](#callback-функции)
  - [nativeTools](#nativetools)
- [Создание инструментов (Tools)](#создание-инструментов-tools)
  - [Структура инструмента](#структура-инструмента)
  - [Метаданные инструмента: description vs llmDescription](#метаданные-инструмента-description-vs llmdescription)
  - [Регистрация инструмента](#регистрация-инструмента)
  - [Примеры инструментов](#примеры-инструментов)
- [⚠️ Распространённые ошибки и их решения](#️-распространённые-ошибки-и-их-решения)
  - [Множественная отправка ответов агентом](#множественная-отправка-ответов-агентом)
- [Интеграция с Telegram](#интеграция-с-telegram)
  - [Обработка входящих сообщений](#обработка-входящих-сообщений)
  - [Команда /start](#команда-start)
  - [Обычные сообщения](#обычные-сообщения)
- [Лучшие практики](#лучшие-практики)
- [Отладка и мониторинг](#отладка-и-мониторинг)

---

## Введение

**AI-агенты в Chatium** — автоматизированные помощники на базе LLM, способные общаться с пользователями и выполнять действия.

### Основные концепции

- **Agent** — AI-агент с инструкциями и инструментами
- **Chain** — цепочка сообщений (диалог) с пользователем
- **Tool** — инструмент, который может использовать агент
- **Generation** — процесс генерации ответа через LLM

### Импорты

```typescript
import {
  getOrCreateAgentForWorkspace,
  findAgents,
  pushMessageToChain
} from '@ai-agents/sdk/process'

import { startCompletion, CompletionCompletedBody, CompletionFailedBody } from '@start/sdk'
```

---

## Быстрый старт: Telegram агент

### Создание через UI

1. Перейдите на `{accountDomain}/app/start`
2. Нажмите **"Создать"**
3. Выберите шаблон **"АИ агент в Телеграм-боте с MiniApp"**
4. Создайте workspace
5. Справа выберите **"Начать работать"**
6. Внесите настройки для агента
7. Нажмите **"Подключить телеграм"**

**Видео**: https://muuvee.ru/watch~QDYrVnLUB4b (таймкод 17:17)

---

## Создание агента

### getOrCreateAgentForWorkspace

Создаёт или обновляет агента для текущего workspace:

```typescript
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'

export const createAgentRoute = app.post('/create-agent', async (ctx, req) => {
  try {
    const agent = await getOrCreateAgentForWorkspace(ctx, 'salesman', {
      title: 'Агент-продавец',
      instructions: `Ты агент-продажник, помогаешь пользователю с выбором товаров
Ты умеешь оформлять заказы и искать по товарам
Помогай пользователю решать его задачи`,
      enabledTools: [createOrderTool, searchProductsTool]
    })

    const agentUrl = ctx.account.url(`/app/agent-process/~agent/${agent.id}`)

    ctx.account.log('Agent created', {
      level: 'info',
      json: {
        agentId: agent.id,
        key: 'salesman',
        url: agentUrl
      }
    })

    return {
      success: true,
      agent: {
        id: agent.id,
        url: agentUrl
      }
    }
  } catch (error) {
    ctx.account.log('Agent creation failed', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
```

### Параметры агента

**key** (string):

- Уникальный ключ агента в workspace
- Используется для идемпотентности (повторный вызов обновит агента)
- Примеры: `'salesman'`, `'support'`, `'consultant'`

**title** (string):

- Отображаемое название агента
- Примеры: `'Агент-продавец'`, `'Агент поддержки'`

**instructions** (string):

- Инструкции для агента (2-3 строки)
- Описывают роль и задачи агента
- Влияют на поведение AI

**enabledTools** (array):

- Массив инструментов, доступных агенту
- Каждый инструмент — это `app.function()` с метаданными
- Можно передать пустой массив `[]`

### Подключение инструментов

```typescript
import { createOrderTool } from './tools/createOrder'
import { searchProductsTool } from './tools/searchProducts'
import { getUserInfoTool } from './tools/getUserInfo'

const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  title: 'Универсальный помощник',
  instructions: 'Помогаю пользователям с заказами, поиском товаров и информацией',
  enabledTools: [createOrderTool, searchProductsTool, getUserInfoTool]
})
```

### Выбор существующего агента

Если нужно найти и использовать существующего агента (не создавать нового):

```typescript
import { findAgents } from '@ai-agents/sdk/process'

export const selectAgentRoute = app.get('/select-agent', async (ctx, req) => {
  // Получаем список всех агентов в workspace
  const agents = await findAgents(ctx)

  ctx.account.log('Available agents', {
    level: 'info',
    json: { count: agents.length }
  })

  // Алгоритм выбора агента:
  // 1. Ищем по ключу (key) — самый надёжный способ
  const agentByKey = agents.find((a) => a.key === 'salesman')

  // 2. Или ищем по названию (title)
  const agentByTitle = agents.find((a) => a.title === 'Агент-продавец')

  // 3. Или берём первого активного
  const firstActive = agents[0]

  if (!agentByKey) {
    return {
      success: false,
      error: 'Agent not found',
      availableAgents: agents.map((a) => ({ id: a.id, key: a.key, title: a.title }))
    }
  }

  return {
    success: true,
    agent: {
      id: agentByKey.id,
      key: agentByKey.key,
      title: agentByKey.title
    }
  }
})
```

**Когда использовать `findAgents` vs `getOrCreateAgentForWorkspace`**:

- `getOrCreateAgentForWorkspace` — когда нужно гарантированно получить агента (создаст, если нет)
- `findAgents` — когда нужно выбрать из существующих или проверить наличие перед созданием

---

## Отправка сообщений агенту

### pushMessageToChain

Отправляет сообщение в цепочку диалога с агентом:

```typescript
import { pushMessageToChain } from '@ai-agents/sdk/process'

const result = await pushMessageToChain(ctx, {
  agentId: string
  chainKey: string
  messageText: string
  wakeAgent: boolean
  files?: Array<{ type: 'image', url: string }>
  createChainIfNotExists?: boolean  // default: true
  chainParams?: {
    title?: string
    userId?: string
    uid?: string
    userProfile?: Record<string, string>
    chainMeta?: Record<string, string>
  }
})

// Возвращает
// { chainId: string, chainKey: string }
```

### Параметры chainKey

**Приоритет выбора chainKey**:

1. ✅ `clarity_uid`, `clrtUid` или `uid` (если известны)
2. ✅ `userId` (если доступен)
3. ✅ `chatId` (для чат-систем)
4. ✅ `id` подходящей модели проекта
5. ❌ **НЕ генерируйте случайный ключ!**

**Примеры**:

```typescript
// Из Telegram
chainKey: person.uid

// Из web сессии
chainKey: sessionUid

// Из userId
chainKey: ctx.user.id

// Из chatId
chainKey: chatId
```

### Параметры wakeAgent

**wakeAgent: true** — агент начнёт обработку немедленно:

- ✅ Срочные/важные сообщения
- ✅ Требуется немедленный ответ
- ✅ Инициирование диалога

**wakeAgent: false** — сообщение в очередь:

- ✅ Обогащение контекста
- ✅ Отложенная обработка
- ✅ Фоновая информация

### chainParams структура

**title** — название цепочки:

```typescript
chainParams: {
  title: user?.displayName || person?.title || 'Неизвестный'
}
```

**userId** — ID пользователя SmartUser:

```typescript
chainParams: {
  userId: user?.id // ТОЛЬКО SmartUser id!
}
```

⚠️ **ВНИМАНИЕ!** Передавай `userId` только если точно знаешь ID от SmartUser (ctx.user). Часто это **НЕ** ID текущего пользователя системы, а пользователя, для которого создаётся цепочка! Например, в Telegram-боте это может быть ID пользователя из базы, а не ID оператора.

**uid** — clarity_uid сессии:

```typescript
chainParams: {
  uid: clrtUid || sessionUid
}
```

**userProfile** — данные для агента:

```typescript
chainParams: {
  userProfile: {
    email: user?.confirmedEmail,
    phone: user?.confirmedPhone,
    clarity_uid: uid,
    personTitle: person?.title,
    utmSource: person?.utmSource,
    utmMedium: person?.utmMedium
  }
}
```

**chainMeta** — технические данные (НЕ видны агенту):

```typescript
chainParams: {
  chainMeta: {
    systemUserId: user?.id,
    personId: person?.id,
    telegramId: person?.externalId,
    sessionId: sessionId
  }
}
```

**Важно**:

- `userProfile` — видит агент (для контекста общения)
- `chainMeta` — НЕ видит агент (для аналитики/отладки)

---

## AI Generation

### startCompletion

Выполняет AI-генерацию с использованием LLM:

```typescript
import { startCompletion, CompletionCompletedBody, CompletionFailedBody } from '@start/sdk'

async function performGeneration(ctx: app.Ctx, prompt: string, generationId: string) {
  await startCompletion(ctx, {
    onCompletionCompleted,
    onCompletionFailed,
    system: 'You are helpful assistant',
    model: 'openai/gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ],
    nativeTools: ['crawl'],
    tools: [myCustomTool],
    context: {
      generationId
    }
  })
}
```

**Важно**: `startCompletion` НЕ возвращает результат! Результат приходит в callback `onCompletionCompleted`.

### Модели

Доступные модели:

- `'openai/gpt-4.1-mini'` — быстрая и дешёвая
- `'openai/gpt-4.1-nano'` — самая быстрая
- `'anthropic/claude-3.5-haiku'` — качественная
- `'anthropic/claude-sonnet-4'` — самая качественная

### Сообщения и контент

**Типы контента**:

```typescript
// Текст
{
  type: 'text',
  text: 'Hello, how are you?'
}

// Изображение
{
  type: 'image',
  source: {
    type: 'url',
    url: 'https://example.com/image.jpg'
  }
}

// Аудио
{
  type: 'audio',
  source: {
    type: 'url',
    url: 'https://example.com/audio.mp3'
  }
}
```

**Пример с мультимодальным контентом**:

```typescript
messages: [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Посмотри на это фото и послушай аудио'
      },
      {
        type: 'image',
        source: {
          type: 'url',
          url: imageUrl
        }
      },
      {
        type: 'audio',
        source: {
          type: 'url',
          url: audioUrl
        }
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Отличное фото! Аудио звучит великолепно.'
      }
    ]
  }
]
```

### Callback функции

**onCompletionCompleted** — успешное завершение:

```typescript
const onCompletionCompleted = app
  .function('/onCompletionCompleted')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Проверка вызывающего!
    // Без этой проверки возможны несанкционированные вызовы callback
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { generationId } = body.context ?? {}

    // Извлечение текста из ответа
    const messageTexts: string[] = []
    const latestMessage = body.messages[body.messages.length - 1]!

    for (const block of latestMessage.content) {
      if (block.type === 'text') {
        messageTexts.push(block.text)
      }
    }

    // Сохранение результата
    await Generations.update(ctx, {
      id: generationId,
      response: messageTexts.join('\n')
    })

    ctx.account.log('Generation completed', {
      level: 'info',
      json: { generationId }
    })

    return null
  })
```

**onCompletionFailed** — ошибка генерации:

```typescript
const onCompletionFailed = app
  .function('/onCompletionFailed')
  .body(CompletionFailedBody)
  .handle(async (ctx, body, caller) => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Проверка вызывающего!
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { generationId } = body.context ?? {}

    await Generations.update(ctx, {
      id: generationId,
      error: body.error
    })

    ctx.account.log('Generation failed', {
      level: 'error',
      json: {
        generationId,
        error: body.error
      }
    })

    return null
  })
```

**Важно**: Callback функции должны:

- ✅ Быть определены как `app.function()`
- ✅ Использовать схему body (`CompletionCompletedBody`)
- ✅ **Обязательно проверять caller** — это защита от несанкционированных вызовов!
- ✅ Возвращать `null`

### nativeTools

`nativeTools` — встроенные системные инструменты, доступные без явного создания:

```typescript
await startCompletion(ctx, {
  // ...
  nativeTools: ['crawl', 'search']
  // ...
})
```

**Доступные nativeTools**:

| Инструмент | Описание                                            |
| ---------- | --------------------------------------------------- |
| `'crawl'`  | Веб-скрапинг — извлекает контент со страницы по URL |
| `'search'` | Поиск в интернете — выполняет поисковый запрос      |

**Отличие от `tools`**:

- `nativeTools` — системные инструменты, указываются строками
- `tools` — кастомные инструменты, созданные через `app.function()`

```typescript
await startCompletion(ctx, {
  // ...
  nativeTools: ['crawl'], // Системный инструмент
  tools: [myCustomTool, anotherTool] // Кастомные инструменты
  // ...
})
```

---

## Создание инструментов (Tools)

### Структура инструмента

Инструменты создаются в папке `/tools/` (один файл = один инструмент):

```typescript
// tools/createOrder.ts
import { findUserById } from '@app/auth'

// Регистрация для агента
// ВАЖНО: Добавляем проверку для избежания множественной регистрации
app.accountHook('@start/agent/tools', async (ctx, params) => {
  const hasToolAlready = params?.tools?.some((t) => t.meta?.name === 'create-order')

  if (!hasToolAlready) {
    return createOrderTool
  }

  return null // Инструмент уже добавлен
})

export const createOrderTool = app
  .function('/createOrder')
  .meta({
    name: 'create-order',
    description: `Use this tool to create a new order for the user. 
Provide product IDs and quantities.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            productIds: s.array(s.string()).describe('Array of product IDs'),
            quantities: s.array(s.number()).describe('Quantities for each product'),
            deliveryAddress: s.string().optional().describe('Delivery address')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🛠️ createOrder', { json: body })

    const { userId } = body.context
    const { productIds, quantities, deliveryAddress } = body.input

    // Валидация
    if (!productIds || productIds.length === 0) {
      return {
        ok: false,
        result: 'Product IDs are required'
      }
    }

    if (userId) {
      const user = await findUserById(ctx, userId)
      if (!user) {
        return {
          ok: false,
          result: 'User not found'
        }
      }
    }

    // Создание заказа
    const order = await OrdersTable.create(ctx, {
      userId,
      productIds,
      quantities,
      deliveryAddress: deliveryAddress || 'Самовывоз',
      status: 'new'
    })

    ctx.account.log('Order created by tool', {
      level: 'info',
      json: { orderId: order.id }
    })

    return {
      ok: true,
      result: `Order #${order.id} created successfully. Total items: ${productIds.length}`
    }
  })
```

### Метаданные инструмента: description vs llmDescription

Инструмент поддерживает два типа описаний для разных целей:

```typescript
export const myTool = app
  .function('/myTool')
  .meta({
    name: 'my-awesome-tool',
    description: `Создание заказа в системе`,        // Для человека (UI)
    llmDescription: `Use this tool when user wants to place an order.
Call this ONLY after you have collected all required information:
- Product IDs
- Quantities
- Delivery address (optional)

The tool will create order and return order number.`  // Для AI (prompt)
  })
  .body(...)
  .handle(...)
```

| Параметр         | Для кого | Когда использовать                                       |
| ---------------- | -------- | -------------------------------------------------------- |
| `description`    | Человек  | Краткое описание для UI, интерфейса управления           |
| `llmDescription` | AI       | Детальные инструкции когда и как использовать инструмент |

**Рекомендации**:

- `description` — короткое, понятное человеку описание
- `llmDescription` — подробные инструкции для AI:
  - Когда использовать инструмент
  - Какие данные нужны перед вызовом
  - Что делать с результатом
  - Ограничения и edge cases

### Регистрация инструмента

Инструменты можно регистрировать двумя способами в зависимости от их назначения.

#### 🔧 Вариант A: Обычные инструменты (createOrder, searchProducts, getUserInfo)

Эти инструменты можно регистрировать **глобально через хук** (для всех агентов) ИЛИ **явно в enabledTools** (для конкретного агента).

**Способ 1 — Глобальный хук** (инструмент доступен ВСЕМ агентам в workspace):

⚠️ **ОБЯЗАТЕЛЬНО добавляйте проверку** чтобы избежать множественной регистрации!

```typescript
// tools/createOrder.ts
app.accountHook('@start/agent/tools', async (ctx, params) => {
  // ✅ Проверяем, был ли инструмент уже добавлен
  const hasToolAlready = params?.tools?.some((t) => t.meta?.name === 'create-order')

  if (!hasToolAlready) {
    return createOrderTool
  }

  return null // Не добавляем повторно
})

// api/agent.ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [] // ✅ Пустой массив (инструмент добавится через хук)
})
```

**Способ 2 — Явное добавление** (инструмент только для конкретного агента):

```typescript
// tools/createOrder.ts
// БЕЗ глобального хука!

// api/agent.ts
import { createOrderTool } from '../tools/createOrder'

const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [createOrderTool] // ✅ Только явное добавление
})
```

**Для нескольких инструментов через хук**:

```typescript
app.accountHook('@start/agent/tools', async (ctx, params) => {
  const toolsToAdd = []

  if (!params?.tools?.some((t) => t.meta?.name === 'tool1')) {
    toolsToAdd.push(tool1)
  }
  if (!params?.tools?.some((t) => t.meta?.name === 'tool2')) {
    toolsToAdd.push(tool2)
  }

  return toolsToAdd.length > 0 ? toolsToAdd : null
})
```

#### 🌐 Вариант B: Веб-инструменты для отправки ответов (sendChatResponse)

⚠️ **КРИТИЧЕСКИ ВАЖНО**: Для инструментов отправки ответов в веб-чат используйте **ТОЛЬКО явное добавление**!

**❌ НИКОГДА не используйте глобальный хук для веб-инструментов!**

**Причины**:

1. Глобальный хук добавит инструмент КО ВСЕМ агентам в workspace
2. Если у вас несколько веб-агентов - каждый будет пытаться отправить ответ
3. Инструмент должен быть привязан к конкретному агенту

```typescript
// tools/sendChatResponseProjectName.ts
// ✅ БЕЗ глобального хука!
export const sendChatResponseProjectNameTool = app
  .function('/send-chat-response-project-name')
  .meta({ name: 'sendChatResponseProjectName', ... })
  .handle(async (ctx, body) => {
    // ... реализация
    return ''  // ✅ Возвращаем пустую строку
  })

// api/agent.ts
import { sendChatResponseProjectNameTool } from '../tools/sendChatResponseProjectName'

const agent = await getOrCreateAgentForWorkspace(ctx, 'web-assistant', {
  title: 'Веб-ассистент',
  instructions: '...',
  enabledTools: [sendChatResponseProjectNameTool]  // ✅ ТОЛЬКО явное добавление
})
```

#### ⚖️ Сравнение способов регистрации

| Тип инструмента                               | Глобальный хук         | Явное добавление        | Рекомендация |
| --------------------------------------------- | ---------------------- | ----------------------- | ------------ |
| **Обычные инструменты** (createOrder, search) | ✅ Можно (с проверкой) | ✅ Можно                | Любой способ |
| **Веб-инструменты** (sendChatResponse)        | ❌ НЕЛЬЗЯ              | ✅ Только так           | ТОЛЬКО явное |
| **startCompletion**                           | ❌ Не применимо        | ✅ Через параметр tools | ТОЛЬКО явное |

#### 🎯 Паттерны и антипаттерны при создании инструмента

Используйте этот чек-лист, чтобы инструмент корректно регистрировался и работал. Частые ошибки приводят к тому, что тул «не виден» агенту или возвращает неверный формат.

| Аспект                       | ❌ Антипаттерн                                                                                                                    | ✅ Паттерн                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Регистрация**              | Тул лежит в файле без регистрации; ожидание «автообнаружения» по папке `tools/`                                                   | Обязательная регистрация через `app.accountHook('@start/agent/tools', async (ctx, params) => { ... return tool })`. Без хука агент не узнает о туле.                                     |
| **Структура тула**           | Экспорт констант: `export const key = '...'`, `export const name`, `export const description`, отдельная функция `run(ctx, args)` | Цепочка методов: `app.function('/path').meta({ name, description }).body(s => s.object({...})).handle(async (ctx, body) => {...})`                                                       |
| **Параметры**                | Ручное описание параметров как JSON Schema объект (`export const parameters = { type: 'object', properties: {...} }`)             | Валидация через `.body(s => s.object({ context: s.object({ userId: s.string().optional(), chainId: s.string().optional() }, { additionalProperties: true }), input: s.object({...}) }))` |
| **Пустые параметры**         | Не указывать `input` или `context` если они не нужны                                                                              | **Обязательно** указывать пустые объекты: `input: s.object({}, { additionalProperties: true })`                                                                                          |
| **Формат ответа**            | Возврат `{ success: true, taskId }` или `{ success: false, error: '...' }`                                                        | Стандарт платформы: успех — `return { ok: true, result: 'текст результата' }`, ошибка — `return { ok: false, result: 'текст ошибки' }`                                                   |
| **Определение пользователя** | Только поиск по `chainId` (например, telegramUID), без учёта `userId` из контекста                                                | Поддержка обоих: сначала `userId` из `body.context`, затем при отсутствии — поиск по `chainId` (например, `findByTelegramUID(ctx, chainId)`)                                             |

**Кратко:** тул должен быть зарегистрирован хуком, описан через `app.function().meta().body().handle()`, принимать вход через `.body()`-схему (где `input` и `context` могут быть пустыми объектами), возвращать `{ ok, result }` и учитывать и `userId`, и `chainId` для определения пользователя.

#### 🚫 Что НИКОГДА не делать

❌ **НЕПРАВИЛЬНО** — без проверки в хуке (множественная регистрация):

```typescript
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return myTool // ❌ Будет добавляться каждый раз!
})
```

❌ **НЕПРАВИЛЬНО** — двойная регистрация (хук + enabledTools для одного инструмента):

```typescript
// tools/createOrder.ts
app.accountHook('@start/agent/tools', async () => createOrderTool) // ❌

// api/agent.ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [createOrderTool] // ❌ Дубликат!
})
```

❌ **НЕПРАВИЛЬНО** — глобальный хук для веб-инструмента:

```typescript
// tools/sendChatResponse.ts
app.accountHook('@start/agent/tools', async () => sendChatResponseTool) // ❌ НИКОГДА для веб-инструментов!
```

**Для startCompletion** — передайте в параметре tools:

```typescript
await startCompletion(ctx, {
  // ...
  tools: [myTool1, myTool2]
  // ...
})
```

### Примеры инструментов

**Инструмент без input (пустые context и input)**:

```typescript
// tools/getCurrentTime.ts
export const getCurrentTimeTool = app
  .function('/getCurrentTime')
  .meta({
    name: 'get-current-time',
    description: 'Get current date and time in Moscow timezone',
    llmDescription: `Use this tool to get current Moscow time.
Useful when user asks "what time is it" or "current date".`
  })
  .body((s) =>
    s.object(
      {
        context: s.object({}, { additionalProperties: true }), // ✅ Пустой context
        input: s.object({}, { additionalProperties: true }) // ✅ Пустой input
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const moscowTime = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'full',
      timeStyle: 'long'
    })

    return {
      ok: true,
      result: `Current time in Moscow: ${moscowTime}`
    }
  })
```

**Поиск товаров**:

```typescript
// tools/searchProducts.ts
export const searchProductsTool = app
  .function('/searchProducts')
  .meta({
    name: 'search-products',
    description: 'Search for products by name or category',
    llmDescription: `Search products in catalog.
Supports filtering by name, category, price range.
Returns up to 10 most relevant products.
Use this when user asks about specific products or categories.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object({}, { additionalProperties: true }),
        input: s.object(
          {
            query: s.string().describe('Search query'),
            category: s.string().optional().describe('Product category')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { query, category } = body.input

    const products = await ProductsTable.findAll(ctx, {
      where: category ? { category } : {},
      limit: 10
    })

    const results = products
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .map((p) => `- ${p.name} (${p.price} ₽)`)
      .join('\n')

    return {
      ok: true,
      result: results || 'No products found'
    }
  })
```

**Получение информации о пользователе**:

```typescript
// tools/getUserInfo.ts
export const getUserInfoTool = app
  .function('/getUserInfo')
  .meta({
    name: 'get-user-info',
    description: 'Get information about the current user',
    llmDescription: `Get user profile information including name, email, phone.
Use this when user asks about their account or profile details.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object({}, { additionalProperties: true }) // ✅ Пустой input
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { userId } = body.context

    if (!userId) {
      return {
        ok: false,
        result: 'User ID not provided in context'
      }
    }

    const user = await findUserById(ctx, userId)

    if (!user) {
      return {
        ok: false,
        result: 'User not found'
      }
    }

    return {
      ok: true,
      result: `User: ${user.displayName}
Email: ${user.confirmedEmail || 'Not provided'}
Phone: ${user.confirmedPhone || 'Not provided'}
Role: ${user.accountRole}`
    }
  })
```

**Инструмент для отправки ответа в веб-интерфейс**:

⚠️ **КРИТИЧЕСКИ ВАЖНО ДЛЯ ВЕБ-ИНСТРУМЕНТОВ**:

Этот инструмент предназначен **ТОЛЬКО для веб-чата** и имеет особые требования регистрации:

1. ❌ **НИКОГДА не используйте глобальный хук** `@start/agent/tools` для этого инструмента
2. ✅ **ТОЛЬКО явное добавление** в `enabledTools` при создании агента
3. ✅ **Уникальное имя** для каждого проекта (например, `sendChatResponsePodolyak`)
4. ✅ **Возврат пустой строки** `''` вместо JSON объекта

**Почему нельзя глобальный хук для веб-инструмента?**

- Хук добавит инструмент КО ВСЕМ агентам в workspace
- Если агентов несколько - каждый будет пытаться отправить ответ
- Результат: дубликаты сообщений, конфликты, хаос

**Правильная архитектура:**

```typescript
// ✅ Явное добавление к конкретному агенту
const agent = await getOrCreateAgentForWorkspace(ctx, 'web-chat', {
  enabledTools: [sendChatResponseProjectNameTool] // ← Только так!
})
```

---

```typescript
// tools/sendChatResponseProjectName.ts
import { sendDataToSocket } from '@app/socket'
import ChatMessagesTable from '../tables/chat_messages.table'

/**
 * ⚠️ КРИТИЧЕСКИ ВАЖНО ДЛЯ ВЕБА:
 * Этот инструмент предназначен для отправки ответов агента в веб-чат через WebSocket.
 *
 * ПРАВИЛЬНАЯ АРХИТЕКТУРА:
 * 1. Инструмент ДОБАВЛЯЕТСЯ ЯВНО в enabledTools при создании агента
 * 2. Инструмент возвращает ПУСТУЮ СТРОКУ (не JSON объект!)
 * 3. Вызывается РОВНО ОДИН РАЗ на один запрос пользователя
 *
 * ❌ НЕПРАВИЛЬНО:
 * - Регистрация через глобальный хук @start/agent/tools (провоцирует множественные вызовы)
 * - Возврат JSON объекта {ok: true, ...} (система интерпретирует как новое сообщение)
 *
 * ✅ ПРАВИЛЬНО:
 * - Явное добавление в enabledTools (гарантия одного раза)
 * - Возврат пустой строки '' (сигнал остановки генерации)
 */
export const sendChatResponseProjectNameTool = app
  .function('/send-chat-response-project-name')
  .meta({
    name: 'sendChatResponseProjectName',
    description: `Используй этот инструмент чтобы отправить ответное сообщение пользователю в веб-чат.

КРИТИЧЕСКИ ВАЖНО:
- Ты ДОЛЖЕН использовать этот инструмент для КАЖДОГО ответа пользователю
- Без вызова инструмента пользователь НЕ УВИДИТ твой ответ
- ИСПОЛЬЗУЙ инструмент один раз на один ответ, не вызывай его несколько раз
- Передай текст ответа в параметр message`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            message: s.string().describe('Текст сообщения для отправки пользователю'),
            chainKey: s.string().optional().describe('Ключ цепочки диалога'),
            agentId: s.string().optional().describe('ID агента')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { input, context } = body

    try {
      if (!context.userId) {
        return ''
      }

      if (!input.message || !input.message.trim()) {
        return ''
      }

      const userId = context.userId
      const chainKey =
        input.chainKey ||
        (context as any).chainKey ||
        (context as any).userProfile?.chainKey ||
        'unknown'
      const agentId =
        input.agentId ||
        (context as any).agentId ||
        (context as any).userProfile?.agentId ||
        'unknown'

      const socketId = `chat-${userId}-${chainKey}-${agentId}`

      const savedMessage = await ChatMessagesTable.create(ctx, {
        userId,
        chainKey,
        agentId,
        role: 'assistant',
        content: input.message.trim(),
        isVisible: true
      })

      await sendDataToSocket(ctx, socketId, {
        type: 'assistant-message',
        data: {
          id: savedMessage.id,
          content: input.message.trim(),
          timestamp: new Date()
        }
      })

      // ✅ КРИТИЧЕСКИ ВАЖНО: Возвращаем ПУСТУЮ СТРОКУ!
      // Это сигнал системе: "Работа завершена, агент должен остановиться"
      // ❌ НЕ возвращай: { ok: true, message: '...', stop: true }
      // JSON провоцирует вторую генерацию ответа агентом
      return ''
    } catch (error) {
      ctx.account.log('Error in sendChatResponse', {
        level: 'error',
        err: error,
        json: { input, context }
      })
      return ''
    }
  })
```

**Важные моменты при создании инструмента отправки ответа**:

1. **Регистрация**: ТОЛЬКО явное добавление в `enabledTools` (см. раздел "Регистрация инструмента" выше)

2. **Уникальное имя**: Каждый проект должен иметь уникальное имя инструмента

   - ✅ `sendChatResponsePodolyak`
   - ✅ `sendChatResponseAnalytics`
   - ❌ `sendResponse` (слишком общее)

3. **Возврат пустой строки**: Инструмент ДОЛЖЕН возвращать `''` (пустую строку):

   ```typescript
   return '' // ✅ Сигнал остановки генерации
   ```

   НЕ возвращайте JSON объект:

   ```typescript
   return { ok: true, stop: true } // ❌ Провоцирует вторую генерацию
   ```

4. **Контекст агента**: Инструмент получает `userId` и `chainId` через `context`

   - Передается автоматически через `chainParams.userProfile` и `chainParams.chainMeta`
   - Используйте множественные fallback для надёжности (см. пример инструмента выше)

5. **WebSocket ID**: Формируется по паттерну `chat-${userId}-${chainKey}-${agentId}`

   - Должен совпадать с тем, что используется в `api/chat.ts`

6. **Обязательное использование**: Добавьте в инструкции агента:

   ```typescript
   instructions: `${baseInstructions}
   
   КРИТИЧЕСКИ ВАЖНО:
   После обработки запроса пользователя ты ОБЯЗАТЕЛЬНО ДОЛЖЕН использовать инструмент "sendChatResponseProjectName" для отправки ответа.
   Без вызова этого инструмента пользователь НЕ УВИДИТ твой ответ!
   
   Используй инструмент sendChatResponseProjectName для КАЖДОГО ответа пользователю.`
   ```

7. **Подключение к агенту** (полный пример см. в разделе "🌐 Полная реализация агента в веб-интерфейсе"):

   ```typescript
   import { sendChatResponseProjectNameTool } from '../tools/sendChatResponseProjectName'

   const agent = await getOrCreateAgentForWorkspace(ctx, key, {
     title: 'Агент',
     instructions: instructions,
     enabledTools: [sendChatResponseProjectNameTool] // ✅ Явное добавление
   })
   ```

---

## 🌐 Полная реализация агента в веб-интерфейсе (WebSocket)

### Архитектура (v3 - Правильная)

**Основной поток**:

```
Пользователь отправляет сообщение в чат
        ↓
API сохраняет сообщение в БД (таблица chat_messages)
        ↓
API ставит Job в очередь (асинхронная обработка)
        ↓
Job вызывает агента С инструментом в enabledTools
        ↓
Агент генерирует ответ и вызывает инструмент ОДИН РАЗ
        ↓
Инструмент:
  1. Сохраняет ответ в БД
  2. Отправляет через WebSocket в реальном времени
  3. Возвращает пустую строку ''
        ↓
Агент видит пустой результат и ОСТАНАВЛИВАЕТСЯ
        ↓
Фронтенд получает обновление через WebSocket и показывает ответ
```

### 1. Таблица для сохранения сообщений

```json
// tables/chat_messages.table
{
  "name": "chat_messages",
  "title": "Chat Messages",
  "fields": [
    {
      "name": "userId",
      "kind": "StringKind",
      "title": "User ID"
    },
    {
      "name": "chainKey",
      "kind": "StringKind",
      "title": "Chain Key"
    },
    {
      "name": "agentId",
      "kind": "StringKind",
      "title": "Agent ID"
    },
    {
      "name": "role",
      "kind": "StringKind",
      "title": "Message Role (user/assistant)"
    },
    {
      "name": "content",
      "kind": "StringKind",
      "title": "Message Content"
    },
    {
      "name": "isVisible",
      "kind": "BooleanKind",
      "title": "Is Visible"
    }
  ]
}
```

### 2. API для отправки сообщения (backend)

```typescript
// api/chat.ts
import ChatMessagesTable from '../tables/chat_messages.table'
import { pushMessageToChain } from '@ai-agents/sdk/process'
import { processAgentMessage } from './process-agent-message'

// @shared-route
export const sendChatMessageRoute = app.post('/send-message', async (ctx, req) => {
  requireRealUser(ctx)

  const { message, agentId, chainKey } = req.body

  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty')
  }

  if (!agentId) {
    throw new Error('agentId is required')
  }

  // 1️⃣ Сохраняем сообщение пользователя в БД
  const userMessage = await ChatMessagesTable.create(ctx, {
    userId: ctx.user.id,
    chainKey: chainKey || `${ctx.user.id}-${agentId}`,
    agentId,
    role: 'user',
    content: message.trim(),
    isVisible: true
  })

  // 2️⃣ Ставим Job в очередь для асинхронной обработки
  // Job будет вызван позже и отправит сообщение агенту
  await processAgentMessage.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    agentId,
    chainKey: chainKey || `${ctx.user.id}-${agentId}`,
    message: message.trim(),
    messageId: userMessage.id
  })

  // 3️⃣ Отправляем сообщение пользователя на фронтенд через WebSocket
  const socketId = `chat-${ctx.user.id}-${chainKey}-${agentId}`

  await sendDataToSocket(ctx, socketId, {
    type: 'user-message',
    data: {
      id: userMessage.id,
      content: message.trim(),
      timestamp: new Date()
    }
  })

  return {
    success: true,
    messageId: userMessage.id,
    chainKey: chainKey || `${ctx.user.id}-${agentId}`
  }
})

// @shared-route
export const getChatHistoryRoute = app.get('/history', async (ctx, req) => {
  requireRealUser(ctx)

  const { agentId, chainKey } = req.query

  const messages = await ChatMessagesTable.findAll(ctx, {
    where: {
      userId: ctx.user.id,
      agentId,
      chainKey: chainKey || `${ctx.user.id}-${agentId}`
    },
    order: [{ createdAt: 'asc' }],
    limit: 100
  })

  return messages
})
```

### 3. Job для обработки сообщения (backend)

```typescript
// api/process-agent-message.ts
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'
import { pushMessageToChain } from '@ai-agents/sdk/process'
import ChatMessagesTable from '../tables/chat_messages.table'

export const processAgentMessage = app.job('/process-agent-message', async (ctx, params) => {
  const { userId, agentId, chainKey, message } = params

  ctx.account.log('📨 Processing message from user', {
    json: { userId, agentId, chainKey, messageLength: message.length }
  })

  try {
    // 1️⃣ Получаем или создаём агента
    const agent = await getOrCreateAgentForWorkspace(ctx, agentId, {
      title: 'Chat Agent',
      instructions: `Ты помощник в веб-чате. Помогай пользователям с их вопросами и запросами.
      
КРИТИЧЕСКИ ВАЖНО:
Используй инструмент sendChatResponseProjectName для отправки КАЖДОГО ответа.
Без вызова инструмента пользователь НЕ УВИДИТ твой ответ!`,
      enabledTools: [sendChatResponseProjectNameTool] // ✅ Явное добавление!
    })

    // 2️⃣ Отправляем сообщение агенту для обработки
    // Агент вызовет инструмент sendChatResponseProjectName для отправки ответа
    await pushMessageToChain(ctx, {
      agentId: agent.id,
      chainKey,
      messageText: message,
      wakeAgent: true, // Обработать НЕМЕДЛЕННО
      chainParams: {
        title: `User ${userId}`,
        userId,
        uid: chainKey,
        userProfile: {
          userId,
          chainKey,
          agentId
        },
        chainMeta: {
          systemUserId: userId,
          chainKey,
          agentId
        }
      }
    })

    ctx.account.log('✅ Message sent to agent', {
      json: { agentId: agent.id, chainKey }
    })

    return { success: true }
  } catch (error) {
    ctx.account.log('❌ Error processing message', {
      level: 'error',
      err: error,
      json: { userId, agentId, chainKey }
    })

    // Отправляем сообщение об ошибке пользователю
    const socketId = `chat-${userId}-${chainKey}-${agentId}`

    await sendDataToSocket(ctx, socketId, {
      type: 'error-message',
      data: {
        content: 'Ошибка при обработке сообщения. Пожалуйста, попробуйте позже.',
        timestamp: new Date()
      }
    })

    return { success: false, error: error.message }
  }
})
```

### 4. Инструмент для отправки ответа (backend)

```typescript
// tools/sendChatResponseProjectName.ts
import ChatMessagesTable from '../tables/chat_messages.table'
import { sendDataToSocket } from '@app/socket'

/**
 * ⚠️ КРИТИЧЕСКИ ВАЖНО:
 *
 * Этот инструмент используется ТОЛЬКО для веб-чата!
 * Он отправляет ответ агента пользователю в реальном времени через WebSocket.
 *
 * ПРАВИЛА:
 * 1. Инструмент должен быть ЯВНО добавлен в enabledTools при создании агента
 * 2. НЕ использовать глобальный хук @start/agent/tools для этого инструмента!
 * 3. Инструмент должен возвращать ПУСТУЮ СТРОКУ '' (не JSON)
 * 4. После вызова инструмента агент автоматически ОСТАНОВИТСЯ
 */
export const sendChatResponseProjectNameTool = app
  .function('/send-chat-response-project-name')
  .meta({
    name: 'sendChatResponseProjectName',
    description: 'Send a response message to the user in the web chat'
  })
  .body((s) =>
    s.object(
      {
        context: s.object({}, { additionalProperties: true }),
        input: s.object(
          {
            message: s.string().describe('Message text for the user'),
            chainKey: s.string().optional(),
            agentId: s.string().optional()
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { input, context } = body

    try {
      // Извлекаем параметры из контекста (множественные fallback для надёжности)
      const userId = context.userId || (context as any).systemUserId || 'unknown'
      const chainKey =
        input.chainKey ||
        (context as any).chainKey ||
        (context as any).userProfile?.chainKey ||
        'unknown'
      const agentId =
        input.agentId ||
        (context as any).agentId ||
        (context as any).userProfile?.agentId ||
        'unknown'

      if (!input.message || !input.message.trim()) {
        // ✅ Возвращаем пустую строку (не ошибку)
        return ''
      }

      // 1️⃣ Сохраняем ответ в БД
      const savedMessage = await ChatMessagesTable.create(ctx, {
        userId,
        chainKey,
        agentId,
        role: 'assistant',
        content: input.message.trim(),
        isVisible: true
      })

      // 2️⃣ Отправляем через WebSocket в реальном времени
      const socketId = `chat-${userId}-${chainKey}-${agentId}`

      await sendDataToSocket(ctx, socketId, {
        type: 'assistant-message',
        data: {
          id: savedMessage.id,
          content: input.message.trim(),
          timestamp: new Date()
        }
      })

      // Отправляем событие об окончании печати
      await sendDataToSocket(ctx, socketId, {
        type: 'typing',
        data: {
          isTyping: false
        }
      })

      ctx.account.log('✅ Agent response sent', {
        json: { userId, chainKey, agentId, messageLength: input.message.length }
      })

      // ✅ КРИТИЧЕСКИ ВАЖНО: Возвращаем ПУСТУЮ СТРОКУ!
      // Это сигнал для системы: "Работа инструмента завершена, агент должен остановиться"
      //
      // ❌ НЕПРАВИЛЬНО (провоцирует вторую генерацию):
      // return { ok: true, message: 'Sent', stop: true }
      // JSON объект система интерпретирует как "новое сообщение"
      // Агент видит его и продолжает генерировать
      //
      // ✅ ПРАВИЛЬНО (остановка генерации):
      // return ''
      // Пустой результат это явный сигнал: "Всё сделано, дальше не генерируй"
      return ''
    } catch (error) {
      ctx.account.log('❌ Error in sendChatResponse', {
        level: 'error',
        err: error,
        json: { input, context }
      })

      // ✅ Возвращаем пустую строку даже при ошибке
      return ''
    }
  })
```

### 5. Компонент Vue (фронтенд)

```vue
// pages/ChatPage.vue
<template>
  <div class="chat-container">
    <!-- История сообщений -->
    <div class="messages-list">
      <div v-for="msg in messages" :key="msg.id" :class="['message', msg.role]">
        {{ msg.content }}
      </div>

      <!-- Индикатор печати агента -->
      <div v-if="isAgentTyping" class="message assistant">
        <span class="typing-indicator">●●●</span>
      </div>
    </div>

    <!-- Форма ввода -->
    <form @submit.prevent="sendMessage" class="message-form">
      <input
        v-model="inputMessage"
        type="text"
        placeholder="Напишите сообщение..."
        :disabled="isLoading"
      />
      <button type="submit" :disabled="isLoading">Отправить</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import { getChatHistoryRoute, sendChatMessageRoute } from '../api/chat'

const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isAgentTyping = ref(false)
const agentId = ref('my-agent')
const chainKey = ref('')

let socketSubscription = null

// 1️⃣ Загрузить историю при загрузке
onMounted(async () => {
  chainKey.value = `${ctx.user.id}-${agentId.value}`

  const history = await getChatHistoryRoute
    .query({ agentId: agentId.value, chainKey: chainKey.value })
    .run(ctx)

  messages.value = history || []

  // 2️⃣ Подписаться на обновления через WebSocket
  subscribeToSocket()
})

// 3️⃣ Подписка на WebSocket для получения ответов в реальном времени
async function subscribeToSocket() {
  const socketId = `chat-${ctx.user.id}-${chainKey.value}-${agentId.value}`

  socketSubscription = socketClient.subscribeToData(socketId, (data) => {
    if (data.type === 'user-message') {
      messages.value.push({
        id: data.data.id,
        role: 'user',
        content: data.data.content
      })
    } else if (data.type === 'assistant-message') {
      messages.value.push({
        id: data.data.id,
        role: 'assistant',
        content: data.data.content
      })
      isAgentTyping.value = false
    } else if (data.type === 'typing') {
      isAgentTyping.value = data.data.isTyping
    }
  })
}

// 4️⃣ Отправка сообщения
async function sendMessage() {
  if (!inputMessage.value.trim()) return

  isLoading.value = true
  isAgentTyping.value = true

  try {
    await sendChatMessageRoute.run(ctx, {
      message: inputMessage.value.trim(),
      agentId: agentId.value,
      chainKey: chainKey.value
    })

    inputMessage.value = ''
  } catch (error) {
    console.error('Error sending message:', error)
    alert('Ошибка при отправке сообщения')
    isAgentTyping.value = false
  } finally {
    isLoading.value = false
  }
}

// 5️⃣ Очистка при размонтировании
onBeforeUnmount(() => {
  if (socketSubscription?.unsubscribe) {
    socketSubscription.unsubscribe()
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 1rem;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  max-width: 70%;
}

.message.user {
  background: #007bff;
  color: white;
  align-self: flex-end;
}

.message.assistant {
  background: #e9ecef;
  color: #333;
  align-self: flex-start;
}

.typing-indicator {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.message-form {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
}

.message-form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.message-form button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.message-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

### 6. Полный цикл обработки (диаграмма)

```
ФРОНТЕНД:
1. Пользователь пишет сообщение в input
2. Клик на кнопку "Отправить"
3. Vue компонент отправляет POST на /api/chat~send-message
        ↓
БЕКЕНД (api/chat.ts):
4. Сохраняем сообщение пользователя в БД (таблица chat_messages)
5. Отправляем сообщение пользователя на фронтенд через WebSocket
6. Ставим Job в очередь для асинхронной обработки
        ↓
БЕКЕНД (Job api/process-agent-message.ts):
7. Получаем или создаём агента (с инструментом в enabledTools)
8. Вызываем pushMessageToChain для отправки сообщения агенту
        ↓
AI-АГЕНТ (@ai-agents/sdk):
9. Агент генерирует ответ
10. Агент вызывает инструмент sendChatResponseProjectName с текстом ответа
        ↓
ИНСТРУМЕНТ (tools/sendChatResponseProjectName.ts):
11. Сохраняет ответ в БД (таблица chat_messages)
12. Отправляет через WebSocket на фронтенд
13. Возвращает пустую строку '' (сигнал остановки)
        ↓
AI-АГЕНТ (@ai-agents/sdk):
14. Видит пустой результат инструмента
15. Понимает: "Работа завершена, больше не генерируй"
16. ОСТАНАВЛИВАЕТСЯ
        ↓
ФРОНТЕНД:
17. WebSocket получает обновление
18. Vue компонент добавляет сообщение агента в чат
19. Пользователь видит ответ в реальном времени
```

### Ключевые отличия от неправильных подходов

| Аспект                    | ❌ НЕПРАВИЛЬНО (v3.0)        | ✅ ПРАВИЛЬНО (v3.1-v3.2) |
| ------------------------- | ---------------------------- | ------------------------ |
| Инструмент в enabledTools | Нет                          | ДА                       |
| Регистрация через хук     | Да (множественная)           | Нет (только явное)       |
| Вызовов инструмента       | 0 (агент не может отправить) | РОВНО 1                  |
| Возвращаемое значение     | N/A                          | Пустая строка ''         |
| Второе сообщение          | Нет ответа вообще            | Нет дубликатов           |
| Результат                 | Тайм-аут, пустой чат         | ✅ Один ответ за 2-5 сек |

---

## ⚠️ Распространённые ошибки и их решения

### Множественная отправка ответов агентом

**Симптом**: Агент отправляет одно и то же сообщение несколько раз подряд (2-3 или более копий).

**Причины**:

1. Инструмент регистрируется **ДВАЖДЫ** — через глобальный хук И через явное добавление в `enabledTools`
2. **Хук вызывается МНОЖЕСТВО РАЗ** без проверки уже добавленных инструментов

**Механизм проблемы**:

- Хук `@start/agent/tools` может вызываться несколько раз:
  - При создании агента
  - При пробуждении агента
  - При обработке каждого сообщения
  - При выполнении любой операции с агентом
- Каждый вызов хука возвращает инструмент → инструмент накапливается в списке
- Результат:
  ```
  Запрос 1: enabledTools = [tool] → 1 вызов
  Запрос 2: enabledTools = [tool, tool] → 2 вызова
  Запрос 3: enabledTools = [tool, tool, tool] → 3 вызова
  ```

#### ❌ Неправильно (вызывает дублирование)

```typescript
// tools/sendChatResponse.ts
export const sendChatResponseTool = app
  .function('/send-chat-response')
  .meta({ name: 'sendChatResponse', ... })
  .handle(async (ctx, body) => { ... })

// ❌ ГЛОБАЛЬНАЯ регистрация
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return sendChatResponseTool  // Регистрирует для ВСЕХ агентов
})

// api/agent.ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  title: 'Агент',
  instructions: '...',
  enabledTools: [sendChatResponseTool]  // ❌ Явное добавление (ДУБЛИКАТ!)
})
```

**Что происходит**:

1. Глобальный хук добавляет инструмент ко ВСЕМ агентам workspace
2. Явное добавление в `enabledTools` добавляет инструмент ещё раз
3. Результат: При вызове инструмента система выполняет его **дважды**

```
Сообщение → Агент → Инструмент #1 ✓ (отправляет)
                  ↓
                  Инструмент #2 ✓ (отправляет снова)
```

#### ✅ Правильное решение

**Правило #1: Выбери ОДИН способ регистрации**

**Вариант A — Глобальный хук** (для инструментов, нужных всем агентам):

```typescript
// tools/sendChatResponse.ts
export const sendChatResponseTool = app
  .function('/send-chat-response')
  .meta({ name: 'sendChatResponse', ... })
  .handle(async (ctx, body) => { ... })

// ✅ ОДИН способ регистрации
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return sendChatResponseTool  // Регистрируется глобально для ВСЕХ агентов
})

// api/agent.ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  title: 'Агент',
  instructions: '...',
  enabledTools: []  // ✅ Пустой массив (инструмент добавится через хук)
})
```

**Вариант B — Явное добавление** (для инструментов, специфичных для конкретного агента):

```typescript
// tools/sendChatResponse.ts
export const sendChatResponseTool = app
  .function('/send-chat-response')
  .meta({ name: 'sendChatResponse', ... })
  .handle(async (ctx, body) => { ... })

// ✅ БЕЗ глобального хука!

// api/agent.ts
import { sendChatResponseTool } from '../tools/sendChatResponse'

const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  title: 'Агент',
  instructions: '...',
  enabledTools: [sendChatResponseTool]  // ✅ Только явное добавление
})
```

**Правило #2: Проверяй перед регистрацией** (РЕКОМЕНДУЕТСЯ!)

⭐ **Лучшее решение**: Всегда проверяйте, что инструмент ещё не добавлен:

```typescript
// tools/sendChatResponse.ts
app.accountHook('@start/agent/tools', async (ctx, params) => {
  // ✅ Проверяем, был ли инструмент уже добавлен
  // Хук может вызываться несколько раз - БЕЗ проверки будет множественная регистрация!
  const hasToolAlready = params?.tools?.some((t) => t.meta?.name === 'sendChatResponse')

  if (!hasToolAlready) {
    ctx.account.log('✅ Добавляем инструмент sendChatResponse', {
      level: 'info',
      json: { toolsCount: params?.tools?.length || 0 }
    })
    return sendChatResponseTool
  }

  ctx.account.log('⏭️ Инструмент sendChatResponse уже добавлен, пропускаем', {
    level: 'info',
    json: { toolsCount: params?.tools?.length || 0 }
  })

  return null // Не добавляем повторно
})
```

**Почему это важно**:

- Хук вызывается при каждой операции с агентом
- Без проверки инструмент будет добавляться в список каждый раз
- С проверкой инструмент добавится только один раз при первом вызове
- Логирование помогает отследить, когда и сколько раз вызывается хук

**Правило #3: Документируй способ регистрации**

Добавляйте комментарии, чтобы не забыть, как зарегистрирован инструмент:

```typescript
// tools/sendChatResponse.ts
/**
 * ⚠️ КРИТИЧЕСКИ ВАЖНО:
 * Этот инструмент зарегистрирован ГЛОБАЛЬНО через app.accountHook
 * НЕ добавляй его в enabledTools при создании агента!
 * Иначе будет двойная регистрация и дублирование ответов.
 */
export const sendChatResponseTool = app
  .function('/send-chat-response')
  .meta({ name: 'sendChatResponse', ... })
  .handle(async (ctx, body) => { ... })

// Глобальная регистрация
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return sendChatResponseTool
})

// api/agent.ts
// ✅ Добавляем другие инструменты, но НЕ sendChatResponse!
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [
    searchProductsTool,  // ✅ Другие инструменты
    createOrderTool,     // ✅ Другие инструменты
    // ❌ НЕ добавляем sendChatResponse здесь!
  ]
})
```

#### Практический пример со смешанной регистрацией

```typescript
// tools/sendChatResponse.ts
// Глобально для ВСЕХ агентов
app.accountHook('@start/agent/tools', async () => sendChatResponseTool)

// tools/searchDatabase.ts
// БЕЗ глобальной регистрации
export const searchDatabaseTool = app.function(...)

// api/agent.ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [
    searchDatabaseTool    // ✅ Явное добавление только специфичных инструментов
    // sendChatResponseTool добавится автоматически через хук
  ]
})
```

#### Диагностика проблемы

Если агент дублирует ответы:

1. **Проверьте tools/** — есть ли `app.accountHook('@start/agent/tools')`?
2. **Проверьте api/agent.ts** — есть ли этот же инструмент в `enabledTools`?
3. **Если ДА в обоих местах** — удалите из одного места
4. **Добавьте логирование** для отладки:

```typescript
.handle(async (ctx, body) => {
  ctx.account.log('🛠️ Tool invoked', {
    level: 'info',
    json: {
      toolName: 'sendChatResponse',
      timestamp: Date.now(),
      context: body.context
    }
  })

  // ... логика инструмента
})
```

Если видите несколько логов с одинаковым timestamp — инструмент зарегистрирован дважды.

---

## Интеграция с Telegram

### Обработка входящих сообщений

```typescript
import { pushMessageToChain, findAgents } from '@ai-agents/sdk/process'

app.accountHook('@sender/message-received', async (ctx, params) => {
  const { channel, chatId, message, user, person } = params

  // Только для Telegram
  if (channel.source !== 'Telegram') {
    return
  }

  // Получить список агентов
  const agents = await findAgents(ctx)
  const agent = agents.find((a) => a.key === 'telegram_assistant')

  if (!agent) {
    ctx.account.log('Agent not found', {
      level: 'warn',
      json: { key: 'telegram_assistant' }
    })
    return
  }

  const uid = person.uid
  const messageText = message.text || ''

  try {
    // Проверка на команду /start
    if (messageText.startsWith('/start')) {
      await handleStartCommand(ctx, agent.id, uid, messageText, user, person, chatId, channel)
    } else {
      await handleRegularMessage(
        ctx,
        agent.id,
        uid,
        messageText,
        user,
        person,
        chatId,
        channel,
        message
      )
    }
  } catch (error) {
    ctx.account.log('Error processing Telegram message', {
      level: 'error',
      json: { error: error.message, chatId }
    })
  }
})
```

### Команда /start

```typescript
async function handleStartCommand(
  ctx,
  agentId: string,
  uid: string,
  command: string,
  user,
  person,
  chatId: string,
  channel
) {
  const startParam = command.length > 7 ? command.substring(7) : null

  const result = await pushMessageToChain(ctx, {
    agentId,
    chainKey: uid,
    chainParams: {
      title: user?.displayName || person?.title || chatId || uid,
      chainMeta: {
        systemUserId: user?.id,
        personId: person?.id,
        personUid: person?.uid,
        telegramId: person?.externalId,
        personUsername: person?.username,
        utmSource: person?.utmSource,
        utmMedium: person?.utmMedium
      },
      userProfile: {
        email: user?.confirmedEmail || person?.email,
        phone: user?.confirmedPhone || person?.phone,
        startParam,
        clarity_uid: uid,
        personTitle: person?.title,
        utmSource: person?.utmSource
      },
      uid,
      userId: user?.id
    },
    messageText: `# TELEGRAM ПОДКЛЮЧЕН

**Время:** ${new Date().toISOString()}

Пользователь подключил телеграм.

## Технические данные:
- **chatId:** \`${chatId}\`
- **uid:** \`${uid}\`${startParam ? `\n- **Стартовый параметр:** \`${startParam}\`` : ''}

## Данные пользователя:${user?.displayName ? `\n- **Имя:** ${user.displayName}` : ''}${person?.username ? `\n- **Username:** @${person.username}` : ''}${person?.email || user?.email ? `\n- **Email:** ${person?.email || user?.email}` : ''}${person?.phone || user?.phone ? `\n- **Телефон:** ${person?.phone || user?.phone}` : ''}

## Канал связи:${channel?.title ? `\n- **Название:** ${channel.title}` : ''}

## Инструкция:
Поприветствуй пользователя и начни выполнять свою ключевую задачу`,
    wakeAgent: true
  })

  ctx.account.log('Start command processed', {
    level: 'info',
    json: { chainId: result.chainId, startParam }
  })
}
```

### Обычные сообщения

```typescript
async function handleRegularMessage(
  ctx,
  agentId: string,
  uid: string,
  messageText: string,
  user,
  person,
  chatId: string,
  channel,
  message
) {
  const messageFiles = message.files || []

  const result = await pushMessageToChain(ctx, {
    agentId,
    chainKey: uid,
    chainParams: {
      title: user?.displayName || person?.title || chatId || uid,
      chainMeta: {
        systemUserId: user?.id,
        personId: person?.id,
        telegramId: person?.externalId
      },
      userProfile: {
        email: user?.confirmedEmail || person?.email,
        phone: user?.confirmedPhone || person?.phone,
        clarity_uid: uid
      },
      uid,
      userId: user?.id
    },
    messageText: `# НОВОЕ СООБЩЕНИЕ ОТ ПОЛЬЗОВАТЕЛЯ

**Время:** ${new Date().toISOString()}

## Собеседник:${user?.displayName || person?.title ? `\n- **Имя:** ${user?.displayName || person?.title}` : ''}${person?.username ? `\n- **Username:** @${person.username}` : ''}

## Сообщение:
> ${messageText}${messageFiles.length ? `\n\n## Прикрепленные файлы:\n${messageFiles.map((f) => `- **${f.name}** (${f.mimeType})`).join('\n')}` : ''}`,
    wakeAgent: true,
    files: messageFiles
      .filter((f) => f.mimeType?.startsWith('image/'))
      .map((f) => ({
        type: 'image',
        url: f.url
      }))
  })

  ctx.account.log('Message sent to agent', {
    level: 'info',
    json: { chainId: result.chainId }
  })
}
```

---

## Лучшие практики

### Создание агентов

✅ **Используйте понятные key**:

```typescript
// Хорошо
key: 'salesman', 'support', 'assistant'

// Плохо
key: 'agent1', 'bot', 'ai'
```

✅ **Пишите чёткие инструкции**:

```typescript
// Хорошо
instructions: `Ты агент поддержки
Помогаешь пользователям решать проблемы
Всегда вежлив и терпелив`

// Плохо
instructions: 'Агент'
```

### Отправка сообщений

✅ **Выбирайте правильный chainKey**:

```typescript
// Приоритет: uid > userId > chatId > modelId
const chainKey = person.uid || ctx.user?.id || chatId
```

✅ **Используйте wakeAgent правильно**:

```typescript
// Для немедленного ответа
wakeAgent: true

// Для обогащения контекста
wakeAgent: false
```

✅ **Разделяйте userProfile и chainMeta**:

```typescript
// userProfile — видит агент
userProfile: {
  email: user.email,
  role: user.role
}

// chainMeta — НЕ видит агент (для аналитики)
chainMeta: {
  systemUserId: user.id,
  sessionId: sessionId
}
```

### Инструменты

✅ **Один файл = один инструмент**:

```
tools/
├── createOrder.ts
├── searchProducts.ts
├── getUserInfo.ts
└── sendChatResponseProjectName.ts  // Веб-инструмент
```

⚠️ **КРИТИЧЕСКИ ВАЖНО: Правильная регистрация инструментов**:

**Для ОБЫЧНЫХ инструментов** (createOrder, searchProducts):

```typescript
// ✅ ВАРИАНТ 1: Глобальный хук (для всех агентов)
app.accountHook('@start/agent/tools', async (ctx, params) => {
  // Обязательно с проверкой!
  if (!params?.tools?.some((t) => t.meta?.name === 'create-order')) {
    return createOrderTool
  }
  return null
})
// И НЕ добавляйте в enabledTools!

// ✅ ВАРИАНТ 2: Явное добавление (для конкретного агента)
enabledTools: [createOrderTool, searchProductsTool]
// И НЕ используйте глобальный хук!
```

**Для ВЕБ-ИНСТРУМЕНТОВ** (sendChatResponse):

```typescript
// ✅ ТОЛЬКО явное добавление
enabledTools: [sendChatResponseProjectNameTool]
// ❌ НИКОГДА НЕ используйте глобальный хук для веб-инструментов!
```

❌ **НИКОГДА**:

- Не регистрируйте один инструмент двумя способами одновременно
- Не используйте глобальный хук БЕЗ проверки `params?.tools?.some()`
- Не используйте глобальный хук для веб-инструментов отправки ответов

✅ **Используйте llmDescription для AI**:

```typescript
.meta({
  name: 'search-products',
  description: 'Search for products in catalog',  // Для человека
  llmDescription: `Search products in catalog.
Supports filtering by name, category, price range.
Returns up to 10 most relevant products.
Use this when user asks about specific products.`  // Для AI
})
```

✅ **Валидируйте input**:

```typescript
.handle(async (ctx, body) => {
  if (!body.input.query) {
    return {
      ok: false,
      result: 'Search query is required'
    }
  }

  // Обработка
})
```

✅ **Возвращайте правильный результат**:

Для обычных инструментов:

```typescript
return {
  ok: true,
  result: `Found ${products.length} products:
${products.map((p) => `- ${p.name}: ${p.price} ₽`).join('\n')}`
}
```

Для веб-инструментов:

```typescript
return '' // ✅ Пустая строка = сигнал остановки
```

### AI Generation

✅ **Всегда проверяйте caller**:

```typescript
if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
  throw new Error('Invalid caller')
}
```

✅ **Храните context для идентификации**:

```typescript
context: {
  generationId,
  userId,
  requestId: `gen_${Date.now()}`
}
```

✅ **Логируйте генерации**:

```typescript
ctx.account.log('Generation started', {
  level: 'info',
  json: { generationId, model }
})
```

### Логирование

✅ **Используйте ctx.account.log**:

```typescript
ctx.account.log('Agent message sent', {
  level: 'info',
  json: { chainId, agentId }
})
```

❌ **Не используйте console.log**:

```typescript
// Неправильно
console.log('Message sent')
```

---

## Отладка и мониторинг

### Логирование агентов

```typescript
// Получение списка агентов
const agents = await findAgents(ctx)

ctx.account.log('Available agents', {
  level: 'info',
  json: {
    count: agents.length,
    agents: agents.map((a) => ({
      id: a.id,
      key: a.key,
      title: a.title
    }))
  }
})
```

### Мониторинг цепочек

```typescript
const result = await pushMessageToChain(ctx, params)

ctx.account.log('Message to agent', {
  level: 'info',
  json: {
    chainId: result.chainId,
    chainKey: result.chainKey,
    agentId: params.agentId,
    messageLength: params.messageText.length
  }
})
```

### Отладка инструментов

```typescript
.handle(async (ctx, body) => {
  ctx.account.log('🛠️ Tool called', {
    level: 'info',
    json: {
      toolName: 'create-order',
      input: body.input,
      context: body.context
    }
  })

  // Обработка

  ctx.account.log('🛠️ Tool result', {
    level: 'info',
    json: { ok: true, resultLength: result.length }
  })

  return { ok: true, result }
})
```

---

## Связанные документы

- **005-jobs.md** — Отложенные задачи для агентов
- **002-routing.md** — API роуты для агентов
- **003-auth.md** — Работа с пользователями в инструментах
- **012-sender.md** — Интеграция с мессенджерами

---

## 🎓 Шпаргалка: Когда использовать какой способ регистрации

| Ситуация                        | Решение                         | Пример                          |
| ------------------------------- | ------------------------------- | ------------------------------- |
| Инструмент нужен ВСЕМ агентам   | Глобальный хук (с проверкой)    | `createOrder`, `searchProducts` |
| Инструмент нужен одному агенту  | Явное добавление в enabledTools | Специализированный инструмент   |
| Веб-инструмент отправки ответов | ✅ ТОЛЬКО явное добавление      | `sendChatResponse`              |
| AI generation (startCompletion) | Параметр tools                  | `tools: [tool1, tool2]`         |

**Золотое правило**: Один инструмент = ОДИН способ регистрации!

---

**Версия**: 1.6  
**Дата**: 2025-11-02  
**Последнее обновление**: 2025-11-05

**История изменений**:

- **v1.6** (2025-11-05): Добавлены критически важные аспекты: `llmDescription` для разделения описаний человеку и AI; раздел "Выбор существующего агента" с `findAgents`; предупреждение о правильном использовании `userId` в `chainParams`; объяснение `nativeTools`; явное указание на пустые `input`/`context`; усилена важность проверки `caller` в callback-функциях.
- **v1.5** (2025-11-05): Устранены противоречия в документации. ПОЛНОСТЬЮ ПЕРЕПИСАН раздел "Регистрация инструмента" с разделением на обычные (createOrder, search) и веб-инструменты (sendChatResponse). Добавлены чёткие правила: веб-инструменты ТОЛЬКО через явное добавление в enabledTools, НИКОГДА через глобальный хук. Усилены предупреждения в разделе "Инструмент для отправки ответа в веб-интерфейс". Упрощён раздел "Важные моменты". Обновлён раздел "Лучшие практики - Инструменты" с явным разделением. Добавлена шпаргалка "Когда использовать какой способ регистрации".
- **v1.4** (2025-11-05): КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ для веб-агентов. Добавлен раздел "🌐 Полная реализация агента в веб-интерфейсе (WebSocket)" с правильной архитектурой v3. Обновлен инструмент sendChatResponse: теперь возвращает ПУСТУЮ СТРОКУ вместо JSON объекта, что решает проблему множественных ответов. Удалены устаревшие разделы о глобальной регистрации для веб-инструментов. Добавлены полные примеры: таблицы, API, Job, инструмент, Vue компонент.
- **v1.3** (2025-11-05): Расширен раздел о множественной регистрации инструментов. Добавлена информация о том, что хук `@start/agent/tools` вызывается МНОЖЕСТВО раз (не только дважды), и что обязательно нужно использовать проверку через `params?.tools?.some()` перед добавлением инструмента. Обновлены все примеры регистрации инструментов с добавлением проверки и логирования.
- **v1.2** (2025-11-05): Добавлен раздел "Распространённые ошибки и их решения" с детальным описанием проблемы множественной регистрации инструментов
- **v1.1** (2025-11-04): Добавлен детальный раздел про инструмент отправки ответов в веб-чат
- **v1.0** (2025-11-02): Первая версия документа
