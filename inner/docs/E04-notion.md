@chatium

# Notion API: Полное руководство для Chatium

Исчерпывающее руководство по интеграции Notion в Chatium. Документ адаптирован для использования с `@app/request` и покрывает все аспекты работы с Notion API.

## Содержание

- [Введение](#введение)
- [Авторизация](#авторизация)
  - [Создание интеграции](#создание-интеграции)
  - [Получение токена](#получение-токена)
  - [Хранение токена в Heap](#хранение-токена-в-heap)
  - [Настройка прав (Capabilities)](#настройка-прав-capabilities)
- [Базовая настройка клиента](#базовая-настройка-клиента)
- [Страницы (Pages)](#страницы-pages)
  - [Получение страницы](#получение-страницы)
  - [Создание страницы](#создание-страницы)
  - [Обновление свойств страницы](#обновление-свойств-страницы)
  - [Архивация страницы](#архивация-страницы)
- [Содержимое страниц (Блоки)](#содержимое-страниц-блоки)
  - [Получение блоков](#получение-блоков)
  - [Добавление блоков](#добавление-блоков)
  - [Обновление блоков](#обновление-блоков)
  - [Удаление блоков](#удаление-блоков)
- [Базы данных (Databases)](#базы-данных-databases)
  - [Получение базы данных](#получение-базы-данных)
  - [Получение схемы (Data Source)](#получение-схемы-data-source)
  - [Создание базы данных](#создание-базы-данных)
  - [Запрос данных (Query)](#запрос-данных-query)
  - [Фильтрация и сортировка](#фильтрация-и-сортировка)
- [Комментарии (Comments)](#комментарии-comments)
  - [Получение комментариев](#получение-комментариев)
  - [Создание комментария](#создание-комментария)
  - [Ответ на комментарий](#ответ-на-комментарий)
- [Файлы и медиа](#файлы-и-медиа)
  - [Добавление изображения по URL](#добавление-изображения-по-url)
  - [Загрузка файла](#загрузка-файла)
- [Поиск (Search)](#поиск-search)
- [Пользователи (Users)](#пользователи-users)
- [Вебхуки (Webhooks)](#вебхуки-webhooks)
  - [Настройка вебхука](#настройка-вебхука)
  - [Обработка событий](#обработка-событий)
- [Обработка ошибок](#обработка-ошибок)
- [Лучшие практики](#лучшие-практики)

---

## Введение

**Notion API** — RESTful API для программного доступа к страницам, базам данных и контенту в Notion.

### Основные концепции

- **Page** — страница или запись в базе данных
- **Block** — блок контента (параграф, заголовок, список)
- **Database** — база данных (таблица)
- **Data Source** — источник данных с схемой свойств
- **Comment** — комментарий к странице
- **Integration** — интеграция (бот) для доступа к API

### API v1

- **Базовый URL**: `https://api.notion.com/v1/`
- **Версия**: `2025-09-03` (указывается в заголовке)
- **Авторизация**: Bearer token
- **Формат**: JSON

---

## Авторизация

### Создание интеграции

1. Перейдите на [My Integrations](https://www.notion.so/my-integrations)
2. Нажмите **+ New integration**
3. Укажите:
   - Название интеграции
   - Рабочую область (Workspace)
   - Права доступа (Capabilities)
4. Получите **Internal Integration Token**

### Получение токена

После создания интеграции скопируйте токен на вкладке **Configuration**.

**Формат токена**: `secret_xxxxxxxxx`

**Важно**: Храните токен в секрете! Не публикуйте его в коде.

### Хранение токена в Heap

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

// Сохранение токена
async function saveNotionToken(ctx, name: string, token: string, workspace: string) {
  await NotionTokens.createOrUpdateBy(ctx, 'integrationName', {
    integrationName: name,
    token,
    workspaceName: workspace
  })

  ctx.account.log('Notion token saved', {
    level: 'info',
    json: { integrationName: name }
  })
}

// Получение токена
async function getNotionToken(ctx, integrationName: string) {
  const record = await NotionTokens.findOneBy(ctx, { integrationName })

  if (!record) {
    return { success: false, error: 'Token not found' }
  }

  return { success: true, token: record.token }
}
```

### Настройка прав (Capabilities)

В настройках интеграции укажите необходимые права:

- ✅ **Read content** — чтение страниц и баз
- ✅ **Update content** — изменение контента
- ✅ **Insert content** — создание нового контента
- ✅ **Read comments** — чтение комментариев
- ✅ **Insert comments** — добавление комментариев
- ✅ **Read user information** — информация о пользователях

**Важно**: После создания интеграции нужно **добавить её на страницы**:

1. Откройте страницу в Notion
2. Нажмите **•••** → **Add connections**
3. Выберите вашу интеграцию

---

## Базовая настройка клиента

Универсальная функция для запросов к Notion API:

```typescript
import { request } from '@app/request'

interface NotionRequestOptions {
  token: string
  endpoint: string
  method: 'get' | 'post' | 'patch' | 'delete'
  data?: any
  params?: Record<string, string>
}

async function notionRequest(options: NotionRequestOptions) {
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

---

## Страницы (Pages)

### Получение страницы

```typescript
export const apiGetNotionPageRoute = app.get('/notion/page/:pageId', async (ctx, req) => {
  const { pageId } = req.params
  const { integrationName } = req.query

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

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

  return result
})
```

### Создание страницы

**В базе данных**:

```typescript
export const apiCreateNotionPageRoute = app.post('/notion/create-page', async (ctx, req) => {
  const { integrationName, dataSourceId, properties } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

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
          // Свойство типа Title
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
        // Добавьте другие свойства по необходимости
      }
    }
  })

  if (result.success) {
    const createdPage = result.data

    ctx.account.log('Notion page created', {
      level: 'info',
      json: { pageId: createdPage.id }
    })

    return {
      success: true,
      page: createdPage
    }
  }

  return result
})
```

**Как подстраница**:

```typescript
const result = await notionRequest({
  token,
  endpoint: '/pages',
  method: 'post',
  data: {
    parent: {
      type: 'page_id',
      page_id: parentPageId
    },
    properties: {
      title: {
        title: [
          {
            type: 'text',
            text: { content: 'Новая подстраница' }
          }
        ]
      }
    }
  }
})
```

### Обновление свойств страницы

```typescript
export const apiUpdateNotionPageRoute = app.post('/notion/update-page', async (ctx, req) => {
  const { integrationName, pageId, properties } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const updateData: any = { properties: {} }

  // Обновление различных типов свойств
  if (properties.name) {
    updateData.properties.Name = {
      title: [
        {
          type: 'text',
          text: { content: properties.name }
        }
      ]
    }
  }

  if (properties.status) {
    updateData.properties.Status = {
      status: { name: properties.status }
    }
  }

  if (properties.date) {
    updateData.properties['Due Date'] = {
      date: { start: properties.date }
    }
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/pages/${pageId}`,
    method: 'patch',
    data: updateData
  })

  if (result.success) {
    ctx.account.log('Notion page updated', {
      level: 'info',
      json: { pageId }
    })
  }

  return result
})
```

### Архивация страницы

```typescript
export const apiArchiveNotionPageRoute = app.post('/notion/archive-page', async (ctx, req) => {
  const { integrationName, pageId } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/pages/${pageId}`,
    method: 'patch',
    data: {
      archived: true
    }
  })

  return result
})
```

---

## Содержимое страниц (Блоки)

### Получение блоков

```typescript
export const apiGetPageContentRoute = app.get('/notion/page-content/:pageId', async (ctx, req) => {
  const { pageId } = req.params
  const { integrationName } = req.query

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/blocks/${pageId}/children`,
    method: 'get'
  })

  if (result.success) {
    const blocks = result.data.results || []

    // Извлечение текста из блоков
    const content = blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) => {
        const richText = b.paragraph?.rich_text || []
        return richText.map((rt) => rt.plain_text).join('')
      })
      .join('\n')

    return {
      success: true,
      blocks,
      content // Весь текст страницы
    }
  }

  return result
})
```

### Добавление блоков

```typescript
export const apiAddNotionBlocksRoute = app.post('/notion/add-blocks', async (ctx, req) => {
  const { integrationName, pageId, blocks } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  // Подготовка блоков для добавления
  const children = []

  // Параграф
  if (blocks.paragraph) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: blocks.paragraph }
          }
        ]
      }
    })
  }

  // Заголовок
  if (blocks.heading) {
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: { content: blocks.heading }
          }
        ]
      }
    })
  }

  // Список задач
  if (blocks.todo) {
    children.push({
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [
          {
            type: 'text',
            text: { content: blocks.todo }
          }
        ],
        checked: false
      }
    })
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/blocks/${pageId}/children`,
    method: 'patch',
    data: { children }
  })

  if (result.success) {
    ctx.account.log('Blocks added to Notion page', {
      level: 'info',
      json: { pageId, blocksCount: children.length }
    })
  }

  return result
})
```

### Обновление блоков

```typescript
export const apiUpdateNotionBlockRoute = app.post('/notion/update-block', async (ctx, req) => {
  const { integrationName, blockId, newText } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/blocks/${blockId}`,
    method: 'patch',
    data: {
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: newText }
          }
        ]
      }
    }
  })

  return result
})
```

### Удаление блоков

```typescript
export const apiDeleteNotionBlockRoute = app.post('/notion/delete-block', async (ctx, req) => {
  const { integrationName, blockId } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/blocks/${blockId}`,
    method: 'delete'
  })

  return result
})
```

---

## Базы данных (Databases)

### Получение базы данных

```typescript
export const apiGetNotionDatabaseRoute = app.get(
  '/notion/database/:databaseId',
  async (ctx, req) => {
    const { databaseId } = req.params
    const { integrationName } = req.query

    const tokenResult = await getNotionToken(ctx, integrationName)
    if (!tokenResult.success) {
      return tokenResult
    }

    const result = await notionRequest({
      token: tokenResult.token,
      endpoint: `/databases/${databaseId}`,
      method: 'get'
    })

    if (result.success) {
      return {
        success: true,
        database: {
          id: result.data.id,
          title: result.data.title,
          dataSources: result.data.data_sources
        }
      }
    }

    return result
  }
)
```

### Получение схемы (Data Source)

```typescript
export const apiGetDataSourceRoute = app.get(
  '/notion/data-source/:dataSourceId',
  async (ctx, req) => {
    const { dataSourceId } = req.params
    const { integrationName } = req.query

    const tokenResult = await getNotionToken(ctx, integrationName)
    if (!tokenResult.success) {
      return tokenResult
    }

    const result = await notionRequest({
      token: tokenResult.token,
      endpoint: `/data_sources/${dataSourceId}`,
      method: 'get'
    })

    if (result.success) {
      return {
        success: true,
        dataSource: {
          id: result.data.id,
          title: result.data.title,
          properties: result.data.properties // Схема полей
        }
      }
    }

    return result
  }
)
```

### Создание базы данных

```typescript
export const apiCreateNotionDatabaseRoute = app.post(
  '/notion/create-database',
  async (ctx, req) => {
    const { integrationName, parentPageId, title, properties } = req.body

    const tokenResult = await getNotionToken(ctx, integrationName)
    if (!tokenResult.success) {
      return tokenResult
    }

    const result = await notionRequest({
      token: tokenResult.token,
      endpoint: '/databases',
      method: 'post',
      data: {
        parent: {
          type: 'page_id',
          page_id: parentPageId
        },
        title: [
          {
            type: 'text',
            text: { content: title }
          }
        ],
        properties: {
          Name: {
            title: {} // Обязательное свойство типа title
          },
          Status: {
            type: 'select',
            select: {
              options: [
                { name: 'To Do', color: 'red' },
                { name: 'In Progress', color: 'yellow' },
                { name: 'Done', color: 'green' }
              ]
            }
          },
          ...properties // Дополнительные свойства
        }
      }
    })

    if (result.success) {
      ctx.account.log('Notion database created', {
        level: 'info',
        json: { databaseId: result.data.id }
      })
    }

    return result
  }
)
```

### Запрос данных (Query)

```typescript
export const apiQueryNotionDatabaseRoute = app.post('/notion/query', async (ctx, req) => {
  const { integrationName, dataSourceId, filter, sorts, pageSize } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

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

  return result
})
```

### Фильтрация и сортировка

**Примеры фильтров**:

```typescript
// Фильтр по статусу
const filter = {
  property: 'Status',
  status: {
    equals: 'Done'
  }
}

// Фильтр по дате
const filter = {
  property: 'Due Date',
  date: {
    after: '2025-01-01'
  }
}

// Комбинированный фильтр
const filter = {
  and: [
    {
      property: 'Status',
      status: { equals: 'In Progress' }
    },
    {
      property: 'Priority',
      select: { equals: 'High' }
    }
  ]
}

// OR условие
const filter = {
  or: [
    { property: 'Status', status: { equals: 'To Do' } },
    { property: 'Status', status: { equals: 'In Progress' } }
  ]
}
```

**Примеры сортировок**:

```typescript
// Сортировка по дате создания
const sorts = [
  {
    timestamp: 'created_time',
    direction: 'descending'
  }
]

// Сортировка по свойству
const sorts = [
  {
    property: 'Due Date',
    direction: 'ascending'
  }
]

// Множественная сортировка
const sorts = [
  { property: 'Priority', direction: 'ascending' },
  { property: 'Due Date', direction: 'ascending' }
]
```

---

## Комментарии (Comments)

### Получение комментариев

```typescript
export const apiGetNotionCommentsRoute = app.get('/notion/comments', async (ctx, req) => {
  const { integrationName, blockId } = req.query

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/comments',
    method: 'get',
    params: { block_id: blockId }
  })

  if (result.success) {
    const comments = result.data.results || []

    return {
      success: true,
      comments: comments.map((c) => ({
        id: c.id,
        text: c.rich_text?.map((rt) => rt.plain_text).join('') || '',
        createdTime: c.created_time,
        createdBy: c.created_by,
        discussionId: c.discussion_id
      }))
    }
  }

  return result
})
```

### Создание комментария

```typescript
export const apiCreateNotionCommentRoute = app.post('/notion/create-comment', async (ctx, req) => {
  const { integrationName, pageId, text } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/comments',
    method: 'post',
    data: {
      parent: {
        page_id: pageId
      },
      rich_text: [
        {
          type: 'text',
          text: { content: text }
        }
      ]
    }
  })

  if (result.success) {
    ctx.account.log('Notion comment created', {
      level: 'info',
      json: { pageId, commentId: result.data.id }
    })
  }

  return result
})
```

### Ответ на комментарий

```typescript
export const apiReplyNotionCommentRoute = app.post('/notion/reply-comment', async (ctx, req) => {
  const { integrationName, discussionId, text } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/comments',
    method: 'post',
    data: {
      discussion_id: discussionId,
      rich_text: [
        {
          type: 'text',
          text: { content: text }
        }
      ]
    }
  })

  return result
})
```

---

## Файлы и медиа

### Добавление изображения по URL

```typescript
export const apiAddNotionImageRoute = app.post('/notion/add-image', async (ctx, req) => {
  const { integrationName, pageId, imageUrl, caption } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: `/blocks/${pageId}/children`,
    method: 'patch',
    data: {
      children: [
        {
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: imageUrl
            },
            caption: caption
              ? [
                  {
                    type: 'text',
                    text: { content: caption }
                  }
                ]
              : []
          }
        }
      ]
    }
  })

  return result
})
```

### Загрузка файла

```typescript
// Загрузка файла в Notion (Direct upload)
export const apiUploadNotionFileRoute = app.post('/notion/upload-file', async (ctx, req) => {
  const { integrationName, fileName, fileData } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  // 1. Создать upload
  const createUploadResult = await notionRequest({
    token: tokenResult.token,
    endpoint: '/uploads',
    method: 'post',
    data: {
      name: fileName,
      size: fileData.length
    }
  })

  if (!createUploadResult.success) {
    return createUploadResult
  }

  const uploadId = createUploadResult.data.id
  const uploadUrl = createUploadResult.data.url

  // 2. Загрузить файл
  // (Для упрощения показан концепт, реальная загрузка multipart)

  // 3. Завершить upload
  const completeResult = await notionRequest({
    token: tokenResult.token,
    endpoint: `/uploads/${uploadId}/complete`,
    method: 'post',
    data: {}
  })

  return completeResult
})
```

---

## Поиск (Search)

```typescript
export const apiSearchNotionRoute = app.post('/notion/search', async (ctx, req) => {
  const { integrationName, query, filter } = req.body

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const searchData: any = {}

  if (query) searchData.query = query
  if (filter) searchData.filter = filter // { value: 'page' } или { value: 'database' }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/search',
    method: 'post',
    data: searchData
  })

  if (result.success) {
    return {
      success: true,
      results: result.data.results || []
    }
  }

  return result
})
```

---

## Пользователи (Users)

```typescript
export const apiGetNotionUsersRoute = app.get('/notion/users', async (ctx, req) => {
  const { integrationName } = req.query

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/users',
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      users: result.data.results || []
    }
  }

  return result
})

// Получить информацию о боте
export const apiGetNotionBotInfoRoute = app.get('/notion/bot-info', async (ctx, req) => {
  const { integrationName } = req.query

  const tokenResult = await getNotionToken(ctx, integrationName)
  if (!tokenResult.success) {
    return tokenResult
  }

  const result = await notionRequest({
    token: tokenResult.token,
    endpoint: '/users/me',
    method: 'get'
  })

  return result
})
```

---

## Вебхуки (Webhooks)

### Настройка вебхука

**Настройка через UI Notion**:

1. Перейдите в **My Integrations** → Ваша интеграция
2. Вкладка **Webhooks** → **Create subscription**
3. Укажите:
   - URL вебхука (HTTPS)
   - Типы событий (page.created, page.updated, etc.)
4. Подтвердите через verification token

### Обработка событий

```typescript
// Роут для приёма вебхуков от Notion
export const notionWebhookRoute = app.post('/notion/webhook', async (ctx, req) => {
  const payload = req.body

  // Проверка подписи (опционально, но рекомендуется)
  const signature = req.headers['x-notion-signature']
  // Проверьте HMAC SHA256 подпись

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

async function handlePageCreated(ctx, payload) {
  const pageId = payload.id

  ctx.account.log('New Notion page created', {
    level: 'info',
    json: { pageId }
  })

  // Получить данные страницы и обработать
  // const page = await notionRequest(...)
}
```

**Типы событий**:

- `page.created` — страница создана
- `page.updated` — страница обновлена
- `page.content_updated` — контент изменён
- `page.archived` — страница архивирована
- `page.unarchived` — восстановлена из архива
- `data_source.schema_updated` — изменена схема базы
- `comment.created` — создан комментарий

---

## Обработка ошибок

### Коды ошибок

| Код | Описание            | Действие                        |
| --- | ------------------- | ------------------------------- |
| 200 | Успех               | OK                              |
| 400 | Некорректный запрос | Проверить данные                |
| 401 | Не авторизован      | Проверить токен                 |
| 403 | Доступ запрещён     | Добавить интеграцию на страницу |
| 404 | Не найдено          | Проверить ID                    |
| 429 | Rate limit          | Повторить позже                 |

### Проверка ошибок

```typescript
if (response.statusCode === 401) {
  return { success: false, error: 'Invalid token' }
}

if (response.statusCode === 403) {
  return {
    success: false,
    error: 'Access denied. Add integration to page in Notion'
  }
}

if (response.statusCode === 429) {
  ctx.account.log('Notion rate limit exceeded', {
    level: 'warn',
    json: { endpoint }
  })
  // Повторить через некоторое время
}
```

---

## Лучшие практики

### Авторизация и безопасность

✅ **Храните токен в Heap**:

```typescript
await NotionTokens.createOrUpdateBy(ctx, 'integrationName', {
  integrationName: 'MyIntegration',
  token: secretToken
})
```

✅ **Не публикуйте токен**:

- Не коммитьте в репозиторий
- Не логируйте токен полностью

### Запросы к API

✅ **Используйте @app/request**:

```typescript
import { request } from '@app/request'
```

✅ **Указывайте версию API**:

```typescript
headers: {
  'Notion-Version': '2025-09-03'
}
```

✅ **Логируйте операции**:

```typescript
ctx.account.log('Notion page created', {
  level: 'info',
  json: { pageId }
})
```

### Вебхуки

✅ **Быстро возвращайте 200**:

```typescript
// Запустите обработку асинхронно
processWebhookAsync(ctx, payload)
return { success: true }
```

✅ **Проверяйте подпись**:

```typescript
const signature = req.headers['x-notion-signature']
// Verify HMAC SHA256
```

### Работа с данными

✅ **Обрабатывайте пагинацию**:

```typescript
let hasMore = true
let cursor = null

while (hasMore) {
  const result = await queryDatabase({ start_cursor: cursor })
  // Обработать results
  hasMore = result.has_more
  cursor = result.next_cursor
}
```

✅ **Проверяйте права доступа**:

- Добавляйте интеграцию на страницы в Notion
- Настраивайте Capabilities правильно

---

## Связанные документы

- **004-request.md** — HTTP запросы через @app/request
- **008-heap.md** — Хранение токенов
- **002-routing.md** — Создание API роутов
- [Официальная документация Notion](https://developers.notion.com/)

---

**Версия**: 1.0  
**Дата**: 2025-11-02  
**Последнее обновление**: Создание документации по Notion для Chatium
