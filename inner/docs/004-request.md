@chatium

# Исходящий роутинг (HTTP клиент) в Chatium

Исчерпывающее руководство по выполнению HTTP запросов к внешним API через `@app/request`. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Базовое использование](#базовое-использование)
  - [Импорт и структура](#импорт-и-структура)
  - [Параметры request()](#параметры-request)
  - [Структура ответа](#структура-ответа)
- [GET запросы](#get-запросы)
  - [Простой GET](#простой-get)
  - [GET с query параметрами](#get-с-query-параметрами)
  - [GET с заголовками](#get-с-заголовками)
- [POST запросы](#post-запросы)
  - [POST с JSON](#post-с-json)
  - [POST с FormData](#post-с-formdata)
  - [POST с авторизацией](#post-с-авторизацией)
- [Другие HTTP методы](#другие-http-методы)
  - [PUT запросы](#put-запросы)
  - [DELETE запросы](#delete-запросы)
- [Настройка заголовков](#настройка-заголовков)
  - [Базовые заголовки](#базовые-заголовки)
  - [Авторизация Bearer token](#авторизация-bearer-token)
  - [Кастомные заголовки](#кастомные-заголовки)
- [Обработка ошибок](#обработка-ошибок)
  - [С throwHttpErrors: false](#с-throwhttperrors-false)
  - [С try/catch](#с-trycatch)
  - [Логирование ошибок](#логирование-ошибок)
- [Примеры интеграций](#примеры-интеграций)
  - [Notion API](#notion-api)
  - [REST API с пагинацией](#rest-api-с-пагинацией)
  - [Универсальная функция](#универсальная-функция)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Исходящий роутинг** — выполнение HTTP запросов из вашего приложения к внешним API.

### Ключевые понятия

- **@app/request** — модуль для выполнения HTTP запросов
- **request()** — основная функция для всех типов запросов
- **responseType** — формат ответа ('json', 'text', 'buffer')
- **throwHttpErrors** — выбрасывать ли ошибки при HTTP 4xx/5xx

### Когда использовать

- ✅ Интеграция с внешними API
- ✅ Получение данных из сторонних сервисов
- ✅ Отправка данных во внешние системы
- ✅ Webhook запросы
- ❌ Не используйте для запросов внутри Chatium (используйте route.run())

---

## Базовое использование

### Импорт и структура

```typescript
import { request } from '@app/request'

const response = await request({
  url: 'https://api.example.com/data',
  method: 'get',
  responseType: 'json'
})

ctx.account.log('Response received', {
  level: 'info',
  json: {
    statusCode: response.statusCode,
    body: response.body
  }
})
```

### Параметры request()

```typescript
interface RequestOptions {
  url: string // Полный URL запроса (обязательно)
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' // HTTP метод

  // Тело запроса
  json?: any // Автоматически сериализует в JSON
  form?: Record<string, any> // FormData
  body?: string | Buffer // Сырое тело

  // Параметры
  searchParams?: Record<string, string> // Query параметры

  // Заголовки
  headers?: Record<string, string>

  // Настройки ответа
  responseType?: 'json' | 'text' | 'buffer' // По умолчанию 'json'
  throwHttpErrors?: boolean // По умолчанию true

  // Таймауты
  timeout?: number // Таймаут в миллисекундах
}
```

### Структура ответа

```typescript
interface Response {
  statusCode: number // HTTP статус (200, 404, 500, etc.)
  body: any // Parsed JSON, text или buffer
  headers: Record<string, string> // Заголовки ответа
}
```

**Пример**:

```typescript
const response = await request({
  url: 'https://api.example.com/data',
  method: 'get',
  responseType: 'json'
})

ctx.account.log('API response', {
  level: 'info',
  json: {
    status: response.statusCode,
    data: response.body
  }
})
```

---

## GET запросы

### Простой GET

```typescript
import { request } from '@app/request'

async function fetchUserData(userId: string) {
  const response = await request({
    url: `https://api.example.com/users/${userId}`,
    method: 'get',
    responseType: 'json'
  })

  return response.body
}
```

### GET с query параметрами

**Способ 1: через searchParams**:

```typescript
async function searchUsers(query: string, page: number = 1) {
  const response = await request({
    url: 'https://api.example.com/search',
    method: 'get',
    searchParams: {
      q: query,
      page: page.toString(),
      limit: '20'
    },
    responseType: 'json'
  })

  return response.body
}
```

**Способ 2: через URLSearchParams**:

```typescript
async function searchProducts(filters: Record<string, string>) {
  const params = new URLSearchParams(filters)

  const response = await request({
    url: `https://api.example.com/products?${params}`,
    method: 'get',
    responseType: 'json'
  })

  return response.body
}
```

### GET с заголовками

```typescript
async function fetchWithAuth(endpoint: string, token: string) {
  const response = await request({
    url: `https://api.example.com${endpoint}`,
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'MyApp/1.0'
    },
    responseType: 'json'
  })

  return response.body
}
```

---

## POST запросы

### POST с JSON

```typescript
async function createUser(userData: any) {
  const response = await request({
    url: 'https://api.example.com/users',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    json: userData, // Автоматически сериализуется
    responseType: 'json'
  })

  return response.body
}

// Использование
const result = await createUser({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})
```

### POST с FormData

```typescript
async function uploadFile(fileData: any) {
  const response = await request({
    url: 'https://api.example.com/upload',
    method: 'post',
    form: {
      file: fileData,
      title: 'Photo',
      description: 'My photo'
    },
    responseType: 'json'
  })

  return response.body
}
```

### POST с авторизацией

```typescript
async function sendNotification(token: string, message: string) {
  const response = await request({
    url: 'https://api.example.com/notifications',
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    json: {
      message,
      timestamp: new Date().toISOString(),
      priority: 'high'
    },
    responseType: 'json'
  })

  return response.body
}
```

---

## Другие HTTP методы

### PUT запросы

```typescript
async function updateResource(id: string, data: any) {
  const response = await request({
    url: `https://api.example.com/resources/${id}`,
    method: 'put',
    headers: {
      'Content-Type': 'application/json'
    },
    json: data,
    responseType: 'json'
  })

  return response.body
}
```

### DELETE запросы

```typescript
async function deleteResource(id: string, token: string) {
  const response = await request({
    url: `https://api.example.com/resources/${id}`,
    method: 'delete',
    headers: {
      Authorization: `Bearer ${token}`
    },
    responseType: 'json'
  })

  return response.body
}
```

---

## Настройка заголовков

### Базовые заголовки

```typescript
const response = await request({
  url: 'https://api.example.com/data',
  method: 'get',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'MyApp/1.0'
  },
  responseType: 'json'
})
```

### Авторизация Bearer token

```typescript
async function authorizedRequest(token: string, endpoint: string) {
  const response = await request({
    url: `https://api.example.com${endpoint}`,
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    responseType: 'json'
  })

  return response.body
}
```

### Кастомные заголовки

```typescript
async function customHeadersRequest() {
  const response = await request({
    url: 'https://api.example.com/data',
    method: 'post',
    headers: {
      'X-API-Key': 'your-api-key',
      'X-Request-ID': generateUUID(),
      'Content-Type': 'application/json',
      'Accept-Language': 'ru-RU'
    },
    json: { data: 'value' },
    responseType: 'json'
  })

  return response.body
}
```

---

## Обработка ошибок

### С throwHttpErrors: false

Предпочтительный способ для контролируемой обработки ошибок:

```typescript
async function safeRequest(url: string) {
  const response = await request({
    url,
    method: 'get',
    responseType: 'json',
    throwHttpErrors: false // Не выбрасывать исключения
  })

  if (response.statusCode === 200) {
    return { success: true, data: response.body }
  }

  if (response.statusCode === 404) {
    return { success: false, error: 'Not found' }
  }

  if (response.statusCode === 401) {
    return { success: false, error: 'Unauthorized' }
  }

  if (response.statusCode >= 500) {
    return { success: false, error: 'Server error' }
  }

  return {
    success: false,
    error: `HTTP ${response.statusCode}`
  }
}
```

### С try/catch

Используется с throwHttpErrors: true (по умолчанию):

```typescript
async function requestWithErrorHandling(url: string) {
  try {
    const response = await request({
      url,
      method: 'get',
      responseType: 'json'
      // throwHttpErrors: true по умолчанию
    })

    return { success: true, data: response.body }
  } catch (error: any) {
    ctx.account.log('Request failed', {
      level: 'error',
      json: { error: error.message, url }
    })

    if (error.response) {
      // Ошибка с ответом сервера
      return {
        success: false,
        error: error.message,
        statusCode: error.response.statusCode
      }
    }

    // Сетевая ошибка
    return { success: false, error: 'Network error' }
  }
}
```

### Логирование ошибок

```typescript
async function apiRequestWithLogging(endpoint: string) {
  try {
    const response = await request({
      url: `https://api.example.com${endpoint}`,
      method: 'get',
      responseType: 'json'
    })

    ctx.account.log('API request successful', {
      level: 'info',
      json: {
        endpoint,
        status: response.statusCode
      }
    })

    return response.body
  } catch (error: any) {
    ctx.account.log('API request failed', {
      level: 'error',
      json: {
        endpoint,
        error: error.message,
        stack: error.stack
      }
    })

    throw error
  }
}
```

---

## Примеры интеграций

### Notion API

**Валидация токена**:

```typescript
import { request } from '@app/request'

export async function validateNotionToken(token: string) {
  const trimmed = token?.trim()

  if (!trimmed) {
    return { valid: false, error: 'Токен пустой' }
  }

  try {
    const response = await request({
      url: 'https://api.notion.com/v1/users/me',
      method: 'get',
      headers: {
        Authorization: `Bearer ${trimmed}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      responseType: 'json',
      throwHttpErrors: false
    })

    if (response.statusCode === 200 && response.body) {
      const user = response.body as any
      return {
        valid: true,
        user: {
          id: user?.id || '',
          name: user?.name || '',
          type: user?.type || ''
        }
      }
    }

    let errorMessage = 'Неизвестная ошибка'
    if (response.statusCode === 401) {
      errorMessage = 'Неверный токен'
    } else if (response.statusCode === 403) {
      errorMessage = 'Доступ запрещен'
    }

    return { valid: false, error: errorMessage }
  } catch (e: any) {
    ctx.account.log('Notion token validation error', {
      level: 'error',
      json: { error: e.message }
    })
    return { valid: false, error: e.message }
  }
}
```

**Создание страницы**:

```typescript
export async function createNotionPage(
  token: string,
  databaseId: string,
  title: string,
  content: string
) {
  const response = await request({
    url: 'https://api.notion.com/v1/pages',
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    json: {
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [
            {
              type: 'text',
              text: { content: title }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content }
              }
            ]
          }
        }
      ]
    },
    responseType: 'json',
    throwHttpErrors: false
  })

  if (response.statusCode === 200 || response.statusCode === 201) {
    return {
      success: true,
      pageId: response.body.id
    }
  }

  return {
    success: false,
    error: 'Не удалось создать страницу'
  }
}
```

### REST API с пагинацией

```typescript
async function fetchAllPages<T>(baseUrl: string, token: string): Promise<T[]> {
  const allItems: T[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await request({
      url: `${baseUrl}?page=${page}&limit=100`,
      method: 'get',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'json',
      throwHttpErrors: false
    })

    if (response.statusCode !== 200) {
      ctx.account.log('Pagination error', {
        level: 'error',
        json: { page, status: response.statusCode }
      })
      break
    }

    const { items, pagination } = response.body
    allItems.push(...items)

    hasMore = pagination.hasMore
    page++
  }

  return allItems
}
```

### Универсальная функция

```typescript
interface RequestOptions {
  endpoint: string
  method: 'get' | 'post' | 'put' | 'delete'
  token?: string
  data?: any
}

async function apiRequest(options: RequestOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const response = await request({
    url: options.endpoint,
    method: options.method,
    headers,
    json: options.data,
    responseType: 'json',
    throwHttpErrors: false
  })

  const success = response.statusCode >= 200 && response.statusCode < 300

  if (!success) {
    ctx.account.log('API request failed', {
      level: 'warn',
      json: {
        endpoint: options.endpoint,
        method: options.method,
        status: response.statusCode
      }
    })
  }

  return {
    success,
    statusCode: response.statusCode,
    data: response.body
  }
}

// Использование
const result = await apiRequest({
  endpoint: 'https://api.example.com/users',
  method: 'post',
  token: 'your-token',
  data: { name: 'John' }
})
```

---

## Лучшие практики

### Общие рекомендации

✅ **Всегда обрабатывайте ошибки**:

- Используйте `throwHttpErrors: false` для контроля
- Логируйте ошибки через `ctx.account.log()`
- Возвращайте консистентный формат

✅ **Настраивайте таймауты**:

```typescript
const response = await request({
  url: 'https://api.example.com/slow-endpoint',
  method: 'get',
  timeout: 30000, // 30 секунд
  responseType: 'json'
})
```

✅ **Используйте правильный responseType**:

- `'json'` — для JSON API (по умолчанию)
- `'text'` — для текстовых ответов
- `'buffer'` — для бинарных данных

### Логирование

✅ **Правильно**:

```typescript
ctx.account.log('External API call', {
  level: 'info',
  json: {
    url,
    method,
    status: response.statusCode,
    duration: Date.now() - startTime
  }
})
```

❌ **Неправильно**:

```typescript
console.log('API response:', response.body)
```

### Безопасность

✅ **Не логируйте чувствительные данные**:

```typescript
// Плохо
ctx.account.log('Request', {
  level: 'info',
  json: { token, password }
})

// Хорошо
ctx.account.log('Request', {
  level: 'info',
  json: {
    hasToken: !!token,
    endpoint
  }
})
```

✅ **Валидируйте токены перед использованием**:

```typescript
if (!token || token.trim().length === 0) {
  return { success: false, error: 'Token is required' }
}
```

### Повторные попытки

✅ **Реализуйте retry логику для нестабильных API**:

```typescript
async function requestWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await request({
        url,
        method: 'get',
        responseType: 'json',
        throwHttpErrors: false
      })

      if (response.statusCode === 200) {
        return { success: true, data: response.body }
      }

      // Если 5xx, пробуем еще раз
      if (response.statusCode >= 500) {
        lastError = `HTTP ${response.statusCode}`
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }

      // Другие ошибки не retry
      return {
        success: false,
        error: `HTTP ${response.statusCode}`
      }
    } catch (error: any) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Request failed after retries'
  }
}
```

---

## Связанные документы

- **002-routing.md** — Входящий роутинг
- **008-heap.md** — Сохранение ответов API
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.0  
**Дата**: 2025-11-02  
**Последнее обновление**: Создание инструкции по исходящему роутингу
