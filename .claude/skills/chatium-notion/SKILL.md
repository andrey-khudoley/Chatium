---
name: chatium-notion
description: Интеграция Notion в Chatium — авторизация, страницы, блоки, базы данных, вебхуки. Использовать с @app/request для Notion API.
---

# chatium-notion

Интеграция с Notion API: страницы (Pages), блоки (Blocks), базы данных (Databases), Data Source, комментарии, вебхуки. Запросы через `@app/request`. Авторизация: Internal Integration Token (Bearer).

## Когда использовать

- Чтение и создание страниц в Notion
- Работа с блоками контента (параграф, заголовок, список)
- Запросы к базам данных (query, filter, sort)
- Синхронизация по вебхукам (события страниц/баз)

## Авторизация

- Создание интеграции в Notion (My Integrations), получение Internal Integration Token.
- Хранение токена в Heap или config (безопасно по правилам проекта).
- Заголовки: `Authorization: Bearer {token}`, `Notion-Version: 2025-09-03` (или актуальная версия).

## Основные операции

- **Страницы:** получение, создание, обновление свойств, архивация.
- **Блоки:** получение блоков страницы, добавление, обновление, удаление.
- **Базы данных:** получение, схема (Data Source), создание, query с filter и sort.
- **Комментарии:** получение, создание, ответ.
- **Поиск:** Search API.
- **Вебхуки:** настройка, обработка событий в роуте.

## Паттерны

- Базовый URL: `https://api.notion.com/v1/`.
- При 401 — проверить токен и права интеграции (Capabilities).
- Логирование через ctx.account.log().
- Использовать `@app/request` для всех HTTP запросов.

## Хранение токена в Heap

```typescript
import { Heap } from '@app/heap'

export const NotionTokens = Heap.Table('notion_tokens', {
  integrationName: Heap.String({
    customMeta: { title: 'Название интеграции' }
  }),
  token: Heap.String({
    customMeta: { title: 'Integration Token' }
  }),
  workspaceName: Heap.String({
    customMeta: { title: 'Workspace' }
  })
})

// Получение токена
async function getNotionToken(ctx, integrationName: string) {
  const record = await NotionTokens.findOneBy(ctx, { integrationName })

  if (!record) {
    return { success: false, error: 'Token not found' }
  }

  return { success: true, token: record.token }
}
```

## Универсальная функция для запросов

```typescript
import { request } from '@app/request'

interface NotionRequestOptions {
  token: string
  endpoint: string
  method: 'get' | 'post' | 'patch' | 'delete'
  data?: any
  params?: Record<string, string>
}

async function notionRequest(ctx, options: NotionRequestOptions) {
  const { token, endpoint, method, data, params } = options

  let url = `https://api.notion.com/v1${endpoint}`

  if (params) {
    const queryString = new URLSearchParams(params).toString()
    url += `?${queryString}`
  }

  try {
    const response = await request({
      url,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      json: data,
      responseType: 'json',
      throwHttpErrors: false
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        success: true,
        data: response.body
      }
    }

    const errorMessage = response.body?.message || 'Notion API error'

    ctx.account.log('Notion API error', {
      level: 'error',
      json: {
        endpoint,
        status: response.statusCode,
        error: errorMessage
      }
    })

    return {
      success: false,
      error: errorMessage,
      statusCode: response.statusCode
    }
  } catch (error) {
    ctx.account.log('Notion request error', {
      level: 'error',
      json: { endpoint, error: error.message }
    })
    return { success: false, error: error.message }
  }
}
```

## Примеры операций

### Получение страницы

```typescript
const result = await notionRequest({
  token: tokenResult.token,
  endpoint: `/pages/${pageId}`,
  method: 'get'
})

if (result.success) {
  return {
    success: true,
    page: {
      id: result.data.id,
      properties: result.data.properties,
      createdTime: result.data.created_time,
      lastEditedTime: result.data.last_edited_time,
      archived: result.data.archived,
      url: result.data.url
    }
  }
}
```

### Создание страницы в базе данных

```typescript
const result = await notionRequest({
  token: tokenResult.token,
  endpoint: '/pages',
  method: 'post',
  data: {
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId
    },
    properties: {
      Name: {
        title: [
          {
            type: 'text',
            text: { content: properties.name }
          }
        ]
      },
      Status: properties.status
        ? {
            status: { name: properties.status }
          }
        : undefined
    }
  }
})
```

### Получение блоков страницы

```typescript
const result = await notionRequest({
  token: tokenResult.token,
  endpoint: `/blocks/${pageId}/children`,
  method: 'get'
})

if (result.success) {
  const blocks = result.data.results || []
  const content = blocks
    .filter((b) => b.type === 'paragraph')
    .map((b) => {
      const richText = b.paragraph?.rich_text || []
      return richText.map((rt) => rt.plain_text).join('')
    })
    .join('\n')
}
```

### Запрос к базе данных (Query)

```typescript
const queryData: any = {}

if (filter) queryData.filter = filter
if (sorts) queryData.sorts = sorts
if (pageSize) queryData.page_size = pageSize

const result = await notionRequest({
  token: tokenResult.token,
  endpoint: `/data_sources/${dataSourceId}/query`,
  method: 'post',
  data: queryData
})

if (result.success) {
  return {
    success: true,
    results: result.data.results || [],
    hasMore: result.data.has_more,
    nextCursor: result.data.next_cursor
  }
}
```

### Обработка вебхуков

```typescript
export const notionWebhookRoute = app.post('/notion/webhook', async (ctx, req) => {
  const payload = req.body

  ctx.account.log('Notion webhook received', {
    level: 'info',
    json: {
      eventType: payload.type,
      objectId: payload.id
    }
  })

  // Обработка различных типов событий
  if (payload.type === 'page.created') {
    await handlePageCreated(ctx, payload)
  }

  if (payload.type === 'page.updated') {
    await handlePageUpdated(ctx, payload)
  }

  if (payload.type === 'comment.created') {
    await handleCommentCreated(ctx, payload)
  }

  // Всегда возвращайте 200
  return { success: true }
})
```

## Чеклист

- [ ] Токен интеграции получен и сохранён в Heap
- [ ] Запросы через request() из @app/request с заголовками Authorization и Notion-Version
- [ ] При работе с базами — query, filter, sort по Notion API
- [ ] Вебхуки: роут для приёма событий, проверка типов событий
- [ ] Обработка ошибок (401, 403, 429) с логированием через ctx.account.log()

## Типы вебхук-событий

- `page.created` — страница создана
- `page.updated` — страница обновлена
- `page.content_updated` — контент изменён
- `page.archived` — страница архивирована
- `page.unarchived` — восстановлена из архива
- `data_source.schema_updated` — изменена схема базы
- `comment.created` — создан комментарий

## Коды ошибок

| Код | Описание            | Действие                        |
| --- | ------------------- | ------------------------------- |
| 200 | Успех               | OK                              |
| 400 | Некорректный запрос | Проверить данные                |
| 401 | Не авторизован      | Проверить токен                 |
| 403 | Доступ запрещён     | Добавить интеграцию на страницу |
| 404 | Не найдено          | Проверить ID                    |
| 429 | Rate limit          | Повторить позже                 |

## Ссылки на документацию

- **E04-notion.md** — Notion API, авторизация, страницы, блоки, базы, вебхуки, примеры
- **004-request.md** — HTTP-клиент для запросов к API через @app/request
- **008-heap.md** — Хранение токенов в базе данных
