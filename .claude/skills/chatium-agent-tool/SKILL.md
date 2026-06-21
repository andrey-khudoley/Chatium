---
name: chatium-agent-tool
description: Создаёт инструмент (tool) для AI-агента Chatium — app.function, meta, body, handle, регистрация через хук. Использовать при добавлении новых инструментов агента.
---

# chatium-agent-tool

Полная документация по созданию инструментов (tools) для AI-агентов в Chatium. Инструмент — функция, которую может вызвать агент для выполнения действий.

## Шаблон инструмента

```ts
export const myTool = app
  .function('/myToolName')
  .meta({ name: 'myToolName', description: 'Описание для LLM' })
  .body(s => s.object({
    context: s.object({ userId: s.string().optional(), chainId: s.string().optional() }, { additionalProperties: true }),
    input: s.object({ query: s.string() }, { additionalProperties: true })
  }))
  .handle(async (ctx, body) => {
    const { context, input } = body
    // логика инструмента
    return { ok: true, result: '...' }
  })
```

## Регистрация (хук)

Инструменты регистрируются через хук `@start/agent/tools`:

```ts
app.accountHook('@start/agent/tools', async (ctx, params) => {
  // ✅ Проверяем, был ли инструмент уже добавлен
  const hasToolAlready = params?.tools?.some((t) => t.meta?.name === 'my-tool-name')

  if (!hasToolAlready) {
    return myTool
  }

  return null // Не добавляем повторно
})
```

Или явное добавление в `enabledTools` при создании агента:

```ts
const agent = await getOrCreateAgentForWorkspace(ctx, 'assistant', {
  enabledTools: [myTool]
})
```

## Структура инструмента (010-agents.md)

Инструмент состоит из четырёх обязательных частей:

### 1. Path: `app.function('/path')`

- Уникальный путь внутри приложения
- Пример: `/createOrder`, `/searchProducts`

### 2. Metadata: `.meta()`

```ts
.meta({
  name: 'create-order',                                    // Уникальное имя для агента
  description: 'Создание заказа в системе',               // Для человека (UI)
  llmDescription: `Use this tool when user wants to place an order.
Call this ONLY after you have collected all required information...`  // Для AI (детальные инструкции)
})
```

- `name` — уникальный идентификатор инструмента
- `description` — короткое описание для UI
- `llmDescription` — подробные инструкции для AI (когда, как, при каких условиях использовать)

### 3. Body schema: `.body()`

```ts
.body(s => s.object({
  context: s.object({
    userId: s.string().optional(),
    chainId: s.string().optional()
  }, { additionalProperties: true }),
  input: s.object({
    productIds: s.array(s.string()).describe('Array of product IDs'),
    quantities: s.array(s.number()).describe('Quantities for each product'),
    deliveryAddress: s.string().optional().describe('Delivery address')
  }, { additionalProperties: true })
}))
```

**Обязательная структура:**
- `context` — контекст вызова (userId, chainId). Всегда присутствует, может быть пустым: `s.object({}, { additionalProperties: true })`
- `input` — параметры инструмента. Может быть пустым: `s.object({}, { additionalProperties: true })`

### 4. Handler: `.handle()`

```ts
.handle(async (ctx, body) => {
  const { context, input } = body

  // Валидация
  if (!input.productIds || input.productIds.length === 0) {
    return {
      ok: false,
      result: 'Product IDs are required'
    }
  }

  // Логика инструмента
  const order = await OrdersTable.create(ctx, {
    userId: context.userId,
    productIds: input.productIds,
    quantities: input.quantities
  })

  ctx.account.log('Order created by tool', {
    level: 'info',
    json: { orderId: order.id }
  })

  return {
    ok: true,
    result: `Order #${order.id} created successfully`
  }
})
```

## Паттерны и антипаттерны (010-agents.md)

### Регистрация

| Аспект | ❌ Антипаттерн | ✅ Паттерн |
| ------ | -------------- | --------- |
| **Множественная регистрация** | Без проверки `hasToolAlready` в хуке — инструмент добавляется каждый раз | Обязательная проверка: `params?.tools?.some((t) => t.meta?.name === 'tool-name')` перед возвратом |
| **Двойная регистрация** | Инструмент регистрируется и через хук, и в `enabledTools` одновременно | Только один способ: либо хук (для всех агентов), либо `enabledTools` (для конкретного агента) |
| **Веб-инструменты** | Глобальный хук для `sendChatResponse` инструментов | ТОЛЬКО явное добавление в `enabledTools` для веб-инструментов |

### Структура и параметры

| Аспект | ❌ Антипаттерн | ✅ Паттерн |
| ------ | -------------- | --------- |
| **Старый формат** | Отдельная функция `run(ctx, args)` и ручное JSON Schema | `app.function().meta().body().handle()` — цепочка методов |
| **Body параметры** | Пустые объекты `{}` без `{ additionalProperties: true }` | Всегда: `s.object({}, { additionalProperties: true })` если пусто |
| **Формат ответа** | `{ success: true, taskId }` или `{ success: false, error }` | **Стандарт**: `{ ok: true, result: '...' }` или `{ ok: false, result: '...' }` |
| **Идентификация пользователя** | Только `chainId` (Telegram UID) | Поддержка обоих: сначала `userId`, затем `chainId` |

### Метаданные

| Аспект | Рекомендация |
| ------ | ------------ |
| **description** | Краткое, понятное человеку описание (одна строка) |
| **llmDescription** | Подробные инструкции для AI: когда использовать, какие данные нужны, что делать с результатом, ограничения |

## Чеклист

- [ ] `app.function('/name')` с уникальным путём
- [ ] `meta.name` — уникальное имя для агента
- [ ] `meta.description` — описание для человека
- [ ] `meta.llmDescription` — детальные инструкции для AI (когда, как использовать)
- [ ] `.body()` с обязательной структурой: `context` и `input`
- [ ] `context` всегда: `s.object({ userId: s.string().optional(), chainId: s.string().optional() }, { additionalProperties: true })`
- [ ] `input` даже если пусто: `s.object({}, { additionalProperties: true })`
- [ ] `.handle()` с обработкой ошибок
- [ ] Возврат: `{ ok: true, result: '...' }` или `{ ok: false, result: '...' }`
- [ ] Регистрация через хук `@start/agent/tools` с проверкой `hasToolAlready`
- [ ] Если веб-инструмент — ТОЛЬКО явное добавление в `enabledTools`

## Пример: Простой инструмент без параметров

```ts
// tools/getCurrentTime.ts
export const getCurrentTimeTool = app
  .function('/getCurrentTime')
  .meta({
    name: 'get-current-time',
    description: 'Get current date and time',
    llmDescription: `Use this tool to get current Moscow time.
Useful when user asks "what time is it" or "current date".`
  })
  .body((s) =>
    s.object({
      context: s.object({}, { additionalProperties: true }),
      input: s.object({}, { additionalProperties: true })
    }, { additionalProperties: true })
  )
  .handle(async (ctx, body) => {
    const moscowTime = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow'
    })

    return {
      ok: true,
      result: `Current Moscow time: ${moscowTime}`
    }
  })

// Регистрация
app.accountHook('@start/agent/tools', async (ctx, params) => {
  if (!params?.tools?.some((t) => t.meta?.name === 'get-current-time')) {
    return getCurrentTimeTool
  }
  return null
})
```

## Пример: Сложный инструмент с валидацией

```ts
// tools/createOrder.ts
export const createOrderTool = app
  .function('/createOrder')
  .meta({
    name: 'create-order',
    description: 'Создание заказа в системе',
    llmDescription: `Use this tool to create a new order for the user.
Provide product IDs and quantities.
Call this ONLY after collecting all required information:
- Product IDs
- Quantities
- Delivery address (optional)`
  })
  .body((s) =>
    s.object({
      context: s.object({
        userId: s.string().optional(),
        chainId: s.string().optional()
      }, { additionalProperties: true }),
      input: s.object({
        productIds: s.array(s.string()).describe('Array of product IDs'),
        quantities: s.array(s.number()).describe('Quantities for each product'),
        deliveryAddress: s.string().optional().describe('Delivery address')
      }, { additionalProperties: true })
    }, { additionalProperties: true })
  )
  .handle(async (ctx, body) => {
    const { userId, chainId } = body.context
    const { productIds, quantities, deliveryAddress } = body.input

    // Валидация
    if (!productIds || productIds.length === 0) {
      return {
        ok: false,
        result: 'Product IDs are required'
      }
    }

    // Поиск пользователя: сначала по userId, затем по chainId
    let user
    if (userId) {
      user = await findUserById(ctx, userId)
    } else if (chainId) {
      user = await findByTelegramUID(ctx, chainId)
    }

    if (!user) {
      return {
        ok: false,
        result: 'User not found'
      }
    }

    // Создание заказа
    const order = await OrdersTable.create(ctx, {
      userId: user.id,
      productIds,
      quantities,
      deliveryAddress: deliveryAddress || 'Самовывоз'
    })

    ctx.account.log('Order created by tool', {
      level: 'info',
      json: { orderId: order.id, userId: user.id }
    })

    return {
      ok: true,
      result: `Order #${order.id} created successfully. Total items: ${productIds.length}`
    }
  })
```

## Ссылки

- **010-agents.md** — полная документация по агентам и инструментам
  - Раздел "Создание инструментов (Tools)"
  - Раздел "Паттерны и антипаттерны при создании инструмента"
  - Раздел "Регистрация инструмента"
- **034-hooks.md** — API хуков, runHook, execHook
- **041-schema.md** — модуль @app/schema для валидации параметров

## Примеры в репозитории

- `inner/samples/imported/instrument-dlya-ii-agenta-proverka-podpiski-na-kanal/` — инструмент проверки подписки
- `inner/samples/imported/instrument-ii-otpravka-v-chat-tg/` — инструмент отправки в Telegram
- `inner/samples/imported/sendposttochannel/` — инструмент отправки поста

## Важные замечания

**Импорты**:
```ts
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'
```

**Логирование**:
- ВСЕГДА используйте `ctx.account.log()`, никогда не используйте `console.log()`

**Возвращаемое значение**:
- ✅ `{ ok: true, result: 'текст результата' }`
- ✅ `{ ok: false, result: 'текст ошибки' }`
- ❌ НЕ используйте `success`, только `ok`

**Обработка ошибок**:
- Всегда проверяйте входные параметры
- Не бросайте необработанные исключения
- Возвращайте `{ ok: false, result: 'сообщение об ошибке' }`
