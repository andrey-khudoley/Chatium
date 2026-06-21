@chatium

# AmoCRM API v4: Полное руководство для Chatium

Исчерпывающее руководство по интеграции AmoCRM в Chatium. Документ адаптирован для использования с `@app/request` и покрывает все аспекты работы с AmoCRM API v4.

**Источники документации:**

- [Официальная документация AmoCRM API](https://www.amocrm.ru/developers/)
- [AmoCRM API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)

## Содержание

- [Введение](#введение)
- [Авторизация OAuth 2.0](#авторизация-oauth-20)
  - [Регистрация интеграции](#регистрация-интеграции)
  - [Получение токенов](#получение-токенов)
  - [Обновление токенов](#обновление-токенов)
  - [Хранение токенов в Heap](#хранение-токенов-в-heap)
- [Базовая настройка клиента](#базовая-настройка-клиента)
- [Параметры аккаунта](#параметры-аккаунта)
- [Пользователи (Users)](#пользователи-users)
- [Сделки (Leads)](#сделки-leads)
  - [Получение списка сделок](#получение-списка-сделок)
  - [Получение сделки по ID](#получение-сделки-по-id)
  - [Создание сделки](#создание-сделки)
  - [Обновление сделки](#обновление-сделки)
  - [Фильтрация и поиск](#фильтрация-и-поиск-сделок)
- [Контакты (Contacts)](#контакты-contacts)
  - [Получение контактов](#получение-контактов)
  - [Создание контакта](#создание-контакта)
  - [Обновление контакта](#обновление-контакта)
  - [Поиск по запросу](#поиск-контактов-по-запросу)
- [Компании (Companies)](#компании-companies)
- [Воронки и статусы (Pipelines)](#воронки-и-статусы-pipelines)
  - [Получение воронок](#получение-воронок)
  - [Перемещение по воронке](#перемещение-по-воронке)
- [Неразобранное (Unsorted)](#неразобранное-unsorted)
  - [Создание из форм](#создание-из-форм)
  - [Создание из звонков (SIP)](#создание-из-звонков-sip)
  - [Принятие неразобранного](#принятие-неразобранного)
  - [Отклонение неразобранного](#отклонение-неразобранного)
  - [Список неразобранного](#список-неразобранного)
- [Вебхуки (Webhooks)](#вебхуки-webhooks)
  - [Настройка вебхуков](#настройка-вебхуков)
  - [Обработка событий](#обработка-событий)
  - [Типы событий](#типы-событий)
- [Задачи (Tasks)](#задачи-tasks)
  - [Создание задачи](#создание-задачи)
  - [Получение задач](#получение-задач)
  - [Обновление задачи](#обновление-задачи)
  - [Типы задач](#типы-задач)
- [События и Примечания (Events & Notes)](#события-и-примечания-events--notes)
- [Беседы (Talks)](#беседы-talks)
- [Теги (Tags)](#теги-tags)
- [Связи сущностей (Entity Links)](#связи-сущностей-entity-links)
- [Файлы (Files)](#файлы-files)
  - [Получение файлов](#получение-файлов-сущности)
  - [Привязка файла](#привязка-файла-к-сущности)
  - [Загрузка файла](#загрузка-файла-в-amocrm)
- [Каталоги и товары (Catalogs)](#каталоги-и-товары-catalogs)
  - [Получение каталогов](#получение-каталогов)
  - [Получение товаров](#получение-товаров-из-каталога)
  - [Привязка товаров к сделке](#привязка-товаров-к-сделке)
- [Дополнительные поля (Custom Fields)](#дополнительные-поля-custom-fields)
  - [Типы полей](#типы-полей)
  - [Создание полей](#создание-полей)
  - [Обновление полей](#обновление-полей)
  - [Удаление полей](#удаление-полей)
  - [Работа с значениями полей](#работа-с-значениями-полей)
- [Пагинация и лимиты](#пагинация-и-лимиты)
- [Обработка ошибок](#обработка-ошибок)
- [Лучшие практики](#лучшие-практики)

---

## Введение

**AmoCRM (Kommo)** — популярная CRM система для управления продажами и клиентами.

### Основные сущности

- **Сделки (Leads)** — потенциальные продажи
- **Контакты (Contacts)** — клиенты
- **Компании (Companies)** — организации клиентов
- **Задачи (Tasks)** — задачи для менеджеров
- **Воронки (Pipelines)** — последовательности этапов продаж
- **Неразобранное (Unsorted)** — входящие заявки до обработки

### API v4

**⚠️ Важно: Разные URL для разных целей!**

| Цель                  | URL                                                 | Пример                       |
| --------------------- | --------------------------------------------------- | ---------------------------- |
| **Авторизация OAuth** | `https://www.amocrm.ru/oauth`                       | Получение кода авторизации   |
| **API запросы**       | `https://{subdomain}.amocrm.ru/api/v4/...`          | Работа с данными             |
| **Обмен токенов**     | `https://{subdomain}.amocrm.ru/oauth2/access_token` | Получение/обновление токенов |

**Общие параметры:**

- **Авторизация**: OAuth 2.0 (Bearer token)
- **Формат**: JSON (application/json)
- **Документация**: https://www.amocrm.ru/developers/

---

## Авторизация OAuth 2.0

AmoCRM использует OAuth 2.0 по схеме Authorization Code Grant.

### Регистрация интеграции

1. Перейдите в **AmoCRM** → **Настройки** → **API** → **Добавить интеграцию**
2. Получите:
   - `client_id` — идентификатор интеграции
   - `client_secret` — секретный ключ
   - `redirect_uri` — URL обработчика redirect
   - `subdomain` — поддомен аккаунта

### Шаги авторизации

1. Получить `authorization_code` (пользователь авторизует приложение)
2. Обменять `authorization_code` на `access_token` и `refresh_token`
3. Обновлять `access_token` через `refresh_token` каждые 24 часа

### Получение токенов

**⚠️ ВАЖНО: URL для авторизации**

Для получения кода авторизации используйте **www.amocrm.ru**, а НЕ subdomain:

```
✅ ПРАВИЛЬНО: https://www.amocrm.ru/oauth?client_id={CLIENT_ID}&state={STATE}&redirect_uri={REDIRECT_URI}
❌ НЕПРАВИЛЬНО: https://{subdomain}.amocrm.ru/oauth?... (404 ошибка!)
```

**Почему так?**

- **www.amocrm.ru** — единый сервер авторизации для всех аккаунтов
- **{subdomain}.amocrm.ru** — используется только для API запросов (обмен кода, получение данных)

**Формат URL авторизации**:

```
https://www.amocrm.ru/oauth
  ?client_id={CLIENT_ID}
  &state={STATE}
  &mode=post_message
  &redirect_uri={REDIRECT_URI}
```

После успешной авторизации пользователь будет перенаправлен на:

```
{redirect_uri}?code={AUTH_CODE}&state={STATE}
```

**⚠️ Код действителен только 20 минут!** Обменивайте код на токены немедленно.

**Обмен кода на токены**:

```typescript
import { request } from '@app/request'

async function exchangeCodeForTokens(
  ctx,
  subdomain: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
) {
  try {
    // ⚠️ ВАЖНО: Для обмена кода используем subdomain.amocrm.ru!
    const response = await request({
      url: `https://${subdomain}.amocrm.ru/oauth2/access_token`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      json: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      },
      responseType: 'json',
      throwHttpErrors: false
    })

    if (response.statusCode === 200) {
      ctx.account.log('AmoCRM: токены успешно получены', {
        level: 'info',
        json: {
          hasAccessToken: !!response.body.access_token,
          expiresIn: response.body.expires_in
        }
      })

      return {
        success: true,
        accessToken: response.body.access_token,
        refreshToken: response.body.refresh_token,
        expiresIn: response.body.expires_in // 86400 (24 часа)
      }
    }

    ctx.account.log('AmoCRM: ошибка обмена кода на токены', {
      level: 'error',
      json: {
        status: response.statusCode,
        errorBody: response.body
      }
    })

    return {
      success: false,
      error: response.body?.title || 'Token exchange failed'
    }
  } catch (error) {
    ctx.account.log('AmoCRM: исключение при обмене кода', {
      level: 'error',
      json: { error: error.message, stack: error.stack }
    })
    return { success: false, error: error.message }
  }
}
```

### Обновление токенов

`access_token` живёт 24 часа, обновляйте через `refresh_token`:

```typescript
import { request } from '@app/request'

async function refreshAccessToken(
  ctx,
  subdomain: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
) {
  try {
    // ⚠️ ВАЖНО: Для refresh используем subdomain.amocrm.ru (как и для обмена кода)
    const response = await request({
      url: `https://${subdomain}.amocrm.ru/oauth2/access_token`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      json: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      },
      responseType: 'json',
      throwHttpErrors: false
    })

    if (response.statusCode === 200) {
      return {
        success: true,
        accessToken: response.body.access_token,
        refreshToken: response.body.refresh_token,
        expiresIn: response.body.expires_in
      }
    }

    return {
      success: false,
      error: 'Token refresh failed',
      statusCode: response.statusCode
    }
  } catch (error) {
    ctx.account.log('AmoCRM token refresh error', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
}
```

### Хранение токенов в Heap

```typescript
import { Heap } from '@app/heap'

// Таблица для хранения токенов
export const AmoCRMTokens = Heap.Table('amocrm_tokens', {
  accountName: Heap.String({
    customMeta: { title: 'Название аккаунта' }
  }),
  subdomain: Heap.String({
    customMeta: { title: 'Поддомен' }
  }),
  accessToken: Heap.String({
    customMeta: { title: 'Access Token' }
  }),
  refreshToken: Heap.String({
    customMeta: { title: 'Refresh Token' }
  }),
  expiresAt: Heap.DateTime({
    customMeta: { title: 'Срок действия' }
  })
})

// Сохранение токенов
async function saveTokens(ctx, subdomain: string, tokens) {
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn)

  await AmoCRMTokens.createOrUpdateBy(ctx, 'subdomain', {
    subdomain,
    accountName: subdomain,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt
  })

  ctx.account.log('AmoCRM tokens saved', {
    level: 'info',
    json: { subdomain }
  })
}

// Получение актуального токена с автообновлением
async function getValidAccessToken(ctx, subdomain: string, clientId: string, clientSecret: string) {
  const tokenRecord = await AmoCRMTokens.findOneBy(ctx, { subdomain })

  if (!tokenRecord) {
    return { success: false, error: 'Tokens not found' }
  }

  // Проверяем срок действия
  const now = new Date()
  const expiresAt = new Date(tokenRecord.expiresAt)

  // Если токен истёк или истечёт в ближайшие 5 минут — обновляем
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(
      ctx,
      subdomain,
      clientId,
      clientSecret,
      tokenRecord.refreshToken
    )

    if (refreshed.success) {
      await saveTokens(ctx, subdomain, refreshed)
      return { success: true, token: refreshed.accessToken }
    }

    return refreshed
  }

  return { success: true, token: tokenRecord.accessToken }
}
```

---

## Базовая настройка клиента

Создайте универсальную функцию для запросов к AmoCRM:

```typescript
import { request } from '@app/request'

interface AmoCRMRequestOptions {
  subdomain: string
  accessToken: string
  endpoint: string
  method: 'get' | 'post' | 'patch' | 'delete'
  data?: any
  params?: Record<string, any>
}

async function amoCRMRequest(options: AmoCRMRequestOptions) {
  const { subdomain, accessToken, endpoint, method, data, params } = options

  const baseUrl = `https://${subdomain}.amocrm.ru`
  let url = `${baseUrl}${endpoint}`

  // Добавляем query параметры
  if (params) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(`${key}[]`, String(v)))
      } else {
        queryParams.append(key, String(value))
      }
    })
    url += `?${queryParams}`
  }

  try {
    const response = await request({
      url,
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
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

    // Обработка ошибок
    const errorDetail = response.body?.detail || response.body?.title || 'API error'

    ctx.account.log('AmoCRM API error', {
      level: 'error',
      json: {
        endpoint,
        method,
        status: response.statusCode,
        error: errorDetail
      }
    })

    return {
      success: false,
      error: errorDetail,
      statusCode: response.statusCode
    }
  } catch (error) {
    ctx.account.log('AmoCRM request error', {
      level: 'error',
      json: { endpoint, error: error.message }
    })
    return { success: false, error: error.message }
  }
}
```

---

## Параметры аккаунта

Получение информации об аккаунте AmoCRM.

**Эндпоинт**: `GET /api/v4/account`

```typescript
export const apiGetAccountInfoRoute = app.get('/account-info', async (ctx, req) => {
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/account',
    method: 'get',
    params: {
      with: 'users,task_types,pipelines,custom_fields' // Опционально
    }
  })

  if (result.success) {
    const account = result.data

    return {
      success: true,
      account: {
        id: account.id,
        name: account.name,
        subdomain: account.subdomain,
        currency: account.currency,
        timezone: account.timezone,
        dateFormat: account.date_format,
        users: account._embedded?.users || [],
        pipelines: account._embedded?.pipelines || [],
        customFields: account._embedded?.custom_fields || []
      }
    }
  }

  return result
})
```

**Возвращаемые данные:**

- `id` — идентификатор аккаунта
- `name` — название аккаунта
- `subdomain` — поддомен
- `currency` — валюта (RUB, USD, EUR и т.д.)
- `timezone` — часовой пояс
- `current_user` — ID текущего пользователя
- `_embedded.users` — список пользователей (если запрошено)
- `_embedded.pipelines` — список воронок (если запрошено)

---

## Пользователи (Users)

Работа с пользователями AmoCRM.

**Эндпоинт**: `/api/v4/users`

### Структура пользователя

```typescript
interface User {
  id: number
  name: string
  email: string
  lang: string // ru, en
  rights: {
    leads: {
      view: 'A' | 'D' | 'M' // All, Department, My
      edit: 'A' | 'D' | 'M'
      add: 'A' | 'D' | 'M'
      delete: 'A' | 'D' | 'M'
      export: 'A' | 'D' | 'M'
    }
    // ... аналогично для contacts, companies, tasks
  }
}
```

### Получение списка пользователей

```typescript
export const apiGetUsersRoute = app.get('/users', async (ctx, req) => {
  const { subdomain, limit = 50 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/users',
    method: 'get',
    params: {
      limit,
      with: 'role,group' // Дополнительная информация
    }
  })

  if (result.success) {
    return {
      success: true,
      users: result.data._embedded?.users || []
    }
  }

  return result
})
```

### Получение пользователя по ID

```typescript
export const apiGetUserRoute = app.get('/user/:userId', async (ctx, req) => {
  const { userId } = req.params
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/users/${userId}`,
    method: 'get'
  })

  return result
})
```

### Получение текущего пользователя

Для получения данных о пользователе, под которым выполнен вход:

```typescript
// Используйте специальный ID = 0 или endpoint account
const currentUserResult = await amoCRMRequest({
  subdomain,
  accessToken: token.token,
  endpoint: '/api/v4/account',
  method: 'get'
})

const currentUserId = currentUserResult.data.current_user
```

---

## Сделки (Leads)

Сделка — основная сущность CRM, отражающая потенциальную продажу.

### Структура сделки

```typescript
interface Lead {
  id: number
  name: string
  price: number
  status_id: number
  pipeline_id: number
  responsible_user_id: number
  created_by: number
  updated_by: number
  created_at: number // Unix timestamp
  updated_at: number
  custom_fields_values?: CustomFieldValue[]
  _embedded?: {
    contacts?: Array<{ id: number }>
    companies?: Array<{ id: number }>
    tags?: Array<{ id: number; name: string }>
  }
}
```

### Получение списка сделок

```typescript
import { amoCRMRequest } from './amocrmClient'

export const apiGetLeadsRoute = app.get('/leads', async (ctx, req) => {
  const { subdomain, limit = 20, page = 1 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads',
    method: 'get',
    params: {
      limit: parseInt(limit as string),
      page: parseInt(page as string)
    }
  })

  if (result.success) {
    return {
      success: true,
      leads: result.data._embedded?.leads || []
    }
  }

  return result
})
```

### Получение сделки по ID

```typescript
export const apiGetLeadRoute = app.get('/lead/:leadId', async (ctx, req) => {
  const { leadId } = req.params
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/${leadId}`,
    method: 'get'
  })

  return result
})
```

### Создание сделки

```typescript
export const apiCreateLeadRoute = app.post('/create-lead', async (ctx, req) => {
  const { subdomain, lead } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads',
    method: 'post',
    data: [
      {
        name: lead.name,
        price: lead.price,
        pipeline_id: lead.pipelineId,
        status_id: lead.statusId,
        responsible_user_id: lead.responsibleUserId,
        custom_fields_values: lead.customFields || []
      }
    ]
  })

  if (result.success) {
    const createdLead = result.data._embedded?.leads?.[0]

    ctx.account.log('AmoCRM lead created', {
      level: 'info',
      json: { leadId: createdLead?.id }
    })

    return {
      success: true,
      lead: createdLead
    }
  }

  return result
})
```

### Обновление сделки

```typescript
export const apiUpdateLeadRoute = app.post('/update-lead', async (ctx, req) => {
  const { subdomain, leadId, updates } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/${leadId}`,
    method: 'patch',
    data: updates
  })

  if (result.success) {
    ctx.account.log('AmoCRM lead updated', {
      level: 'info',
      json: { leadId }
    })
  }

  return result
})
```

### Фильтрация и поиск сделок

AmoCRM поддерживает мощные возможности фильтрации.

**Доступные фильтры:**

```typescript
export const apiFilterLeadsRoute = app.get('/leads/filter', async (ctx, req) => {
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads',
    method: 'get',
    params: {
      // Фильтр по ID
      'filter[id]': [123, 456, 789],

      // Фильтр по статусу
      'filter[statuses][0][pipeline_id]': 123,
      'filter[statuses][0][status_id]': [456, 789],

      // Фильтр по ответственному
      'filter[responsible_user_id]': [100, 200],

      // Фильтр по дате создания (timestamp)
      'filter[created_at][from]': 1609459200, // с 01.01.2021
      'filter[created_at][to]': 1640995199, // до 31.12.2021

      // Фильтр по дате обновления
      'filter[updated_at][from]': 1609459200,

      // Фильтр по цене
      'filter[price][from]': 1000,
      'filter[price][to]': 10000,

      // Фильтр по дате закрытия
      'filter[closed_at][from]': 1609459200,

      // Сортировка
      'order[created_at]': 'asc', // или 'desc'

      limit: 250, // Максимум 250
      page: 1
    }
  })

  return result
})
```

**Поиск по запросу (Query)**:

```typescript
export const apiSearchLeadsRoute = app.get('/leads/search', async (ctx, req) => {
  const { subdomain, query } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  // Поиск по названию, email, телефону и т.д.
  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads',
    method: 'get',
    params: {
      query, // Поисковый запрос
      limit: 50
    }
  })

  if (result.success) {
    return {
      success: true,
      leads: result.data._embedded?.leads || [],
      total: result.data._page?.total_items
    }
  }

  return result
})
```

**Получение связанных сущностей (with)**:

```typescript
// Получить сделки вместе с контактами, компаниями и тегами
const result = await amoCRMRequest({
  subdomain,
  accessToken: token.token,
  endpoint: '/api/v4/leads',
  method: 'get',
  params: {
    with: 'contacts,catalog_elements,loss_reason,source_id',
    limit: 10
  }
})

// В ответе будет _embedded с запрошенными данными
const leads = result.data._embedded?.leads || []
leads.forEach((lead) => {
  const contacts = lead._embedded?.contacts || []
  const companies = lead._embedded?.companies || []
  const tags = lead._embedded?.tags || []
})
```

---

## Контакты (Contacts)

Контакт — клиент или представитель клиента.

### Структура контакта

```typescript
interface Contact {
  id: number
  name: string
  first_name?: string
  last_name?: string
  responsible_user_id: number
  created_by: number
  created_at: number
  updated_at: number
  custom_fields_values?: Array<{
    field_code?: string // PHONE, EMAIL
    field_id?: number
    values: Array<{
      value: string
      enum_id?: number
    }>
  }>
}
```

### Получение контактов

```typescript
export const apiGetContactsRoute = app.get('/contacts', async (ctx, req) => {
  const { subdomain, limit = 50 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/contacts',
    method: 'get',
    params: { limit }
  })

  if (result.success) {
    return {
      success: true,
      contacts: result.data._embedded?.contacts || []
    }
  }

  return result
})
```

### Создание контакта

```typescript
export const apiCreateContactRoute = app.post('/create-contact', async (ctx, req) => {
  const { subdomain, contact } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/contacts',
    method: 'post',
    data: [
      {
        name: contact.name,
        first_name: contact.firstName,
        last_name: contact.lastName,
        responsible_user_id: contact.responsibleUserId,
        custom_fields_values: [
          {
            field_code: 'PHONE',
            values: [{ value: contact.phone }]
          },
          {
            field_code: 'EMAIL',
            values: [{ value: contact.email }]
          }
        ]
      }
    ]
  })

  if (result.success) {
    const createdContact = result.data._embedded?.contacts?.[0]

    ctx.account.log('AmoCRM contact created', {
      level: 'info',
      json: { contactId: createdContact?.id }
    })

    return {
      success: true,
      contact: createdContact
    }
  }

  return result
})
```

### Обновление контакта

```typescript
export const apiUpdateContactRoute = app.post('/update-contact', async (ctx, req) => {
  const { subdomain, contactId, updates } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/contacts/${contactId}`,
    method: 'patch',
    data: updates
  })

  return result
})
```

### Поиск контактов по запросу

```typescript
export const apiSearchContactsRoute = app.get('/contacts/search', async (ctx, req) => {
  const { subdomain, query } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  // Поиск по имени, email, телефону
  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/contacts',
    method: 'get',
    params: {
      query,
      limit: 250,
      with: 'leads,customers,catalog_elements' // Связанные сущности
    }
  })

  if (result.success) {
    return {
      success: true,
      contacts: result.data._embedded?.contacts || [],
      total: result.data._page?.total_items
    }
  }

  return result
})
```

**Фильтрация контактов:**

```typescript
// Фильтр по ID
params: {
  'filter[id]': [123, 456]
}

// Фильтр по ответственному
params: {
  'filter[responsible_user_id]': 100
}

// Фильтр по дате создания
params: {
  'filter[created_at][from]': 1609459200,
  'filter[created_at][to]': 1640995199
}
```

---

## Компании (Companies)

Компания — организация клиента.

### Создание компании

```typescript
export const apiCreateCompanyRoute = app.post('/create-company', async (ctx, req) => {
  const { subdomain, company } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/companies',
    method: 'post',
    data: [
      {
        name: company.name,
        responsible_user_id: company.responsibleUserId,
        custom_fields_values: company.customFields || []
      }
    ]
  })

  if (result.success) {
    return {
      success: true,
      company: result.data._embedded?.companies?.[0]
    }
  }

  return result
})
```

---

## Воронки и статусы (Pipelines)

Воронка — последовательность стадий сделки.

### Получение воронок

```typescript
export const apiGetPipelinesRoute = app.get('/pipelines', async (ctx, req) => {
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads/pipelines',
    method: 'get'
  })

  if (result.success) {
    const pipelines = result.data._embedded?.pipelines || []

    return {
      success: true,
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        isMain: p.is_main,
        statuses: p._embedded?.statuses || []
      }))
    }
  }

  return result
})
```

### Перемещение по воронке

```typescript
// Изменение статуса сделки
export const apiMoveLeadRoute = app.post('/move-lead', async (ctx, req) => {
  const { subdomain, leadId, statusId, pipelineId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/${leadId}`,
    method: 'patch',
    data: {
      status_id: statusId,
      pipeline_id: pipelineId
    }
  })

  return result
})
```

---

## Неразобранное (Unsorted)

Неразобранное — входящие заявки до обработки менеджером.

### Категории

- **forms** — заявки с форм
- **sip** — входящие звонки
- **chats** — сообщения из чатов
- **mail** — email

**Важно**: Через API создаются только **forms** и **sip**.

### Создание из форм

```typescript
export const apiCreateUnsortedFormRoute = app.post('/unsorted/form', async (ctx, req) => {
  const { subdomain, form } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads/unsorted/forms',
    method: 'post',
    data: [
      {
        source_name: form.sourceName || 'Website Form',
        source_uid: form.sourceUid || `form_${Date.now()}`,
        pipeline_id: form.pipelineId,
        created_at: Math.floor(Date.now() / 1000),
        metadata: {
          form_id: form.formId,
          form_name: form.formName,
          form_page: form.formPage,
          ip: form.ip,
          form_sent_at: Math.floor(Date.now() / 1000),
          referer: form.referer
        },
        _embedded: {
          leads: [
            {
              name: form.leadName || 'Заявка с формы',
              price: form.price || 0
            }
          ],
          contacts: form.contact
            ? [
                {
                  name: form.contact.name,
                  custom_fields_values: [
                    {
                      field_code: 'PHONE',
                      values: [{ value: form.contact.phone }]
                    },
                    {
                      field_code: 'EMAIL',
                      values: [{ value: form.contact.email }]
                    }
                  ]
                }
              ]
            : []
        }
      }
    ]
  })

  if (result.success) {
    ctx.account.log('AmoCRM unsorted form created', {
      level: 'info',
      json: {
        uid: result.data._embedded?.unsorted?.[0]?.uid
      }
    })
  }

  return result
})
```

### Создание из звонков (SIP)

```typescript
export const apiCreateUnsortedSipRoute = app.post('/unsorted/sip', async (ctx, req) => {
  const { subdomain, call } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads/unsorted/sip',
    method: 'post',
    data: [
      {
        source_name: call.sourceName || 'Phone System',
        source_uid: call.sourceUid || `call_${Date.now()}`,
        pipeline_id: call.pipelineId,
        created_at: call.calledAt || Math.floor(Date.now() / 1000),
        metadata: {
          phone: call.phone,
          called_at: call.calledAt,
          duration: call.duration || 0,
          link: call.recordingUrl,
          service_code: call.serviceCode || 'custom_pbx',
          uniq: call.uniq || `call_${Date.now()}_${call.phone}`,
          is_call_event_needed: true
        },
        _embedded: {
          leads: [
            {
              name: `Входящий звонок ${call.phone}`,
              price: 0
            }
          ],
          contacts: [
            {
              name: call.contactName || 'Неизвестный',
              custom_fields_values: [
                {
                  field_code: 'PHONE',
                  values: [{ value: call.phone }]
                }
              ]
            }
          ]
        }
      }
    ]
  })

  if (result.success) {
    ctx.account.log('AmoCRM unsorted call created', {
      level: 'info',
      json: { uid: result.data._embedded?.unsorted?.[0]?.uid }
    })
  }

  return result
})
```

### Принятие неразобранного

```typescript
export const apiAcceptUnsortedRoute = app.post('/accept-unsorted', async (ctx, req) => {
  const { subdomain, uid, userId, statusId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const data: any = {}
  if (userId) data.user_id = userId
  if (statusId) data.status_id = statusId

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/unsorted/${uid}/accept`,
    method: 'post',
    data: Object.keys(data).length > 0 ? data : undefined
  })

  if (result.success) {
    ctx.account.log('AmoCRM unsorted accepted', {
      level: 'info',
      json: { uid }
    })
  }

  return result
})
```

### Отклонение неразобранного

```typescript
export const apiDeclineUnsortedRoute = app.post('/decline-unsorted', async (ctx, req) => {
  const { subdomain, uid, userId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/unsorted/${uid}/decline`,
    method: 'delete',
    data: userId ? { user_id: userId } : undefined
  })

  return result
})
```

### Список неразобранного

```typescript
export const apiGetUnsortedRoute = app.get('/unsorted', async (ctx, req) => {
  const { subdomain, category, limit = 100 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const params: any = { limit }
  if (category) {
    params['filter[category]'] = category // 'forms', 'sip', 'chats', 'mail'
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads/unsorted',
    method: 'get',
    params
  })

  if (result.success) {
    return {
      success: true,
      unsorted: result.data._embedded?.unsorted || []
    }
  }

  return result
})
```

---

## Вебхуки (Webhooks)

Вебхуки — уведомления AmoCRM о событиях.

### Настройка вебхуков

Вебхуки можно настроить двумя способами:

**Способ 1: Через интерфейс AmoCRM**

1. **Настройки** → **Интеграции** → **Ваша интеграция**
2. В разделе "Вебхуки" указать URL и события

**Способ 2: Программно через API**

**Эндпоинт**: `/api/v4/webhooks`

#### Подписка на вебхук (POST)

```typescript
export const apiSubscribeWebhookRoute = app.post('/subscribe-webhook', async (ctx, req) => {
  const { subdomain, destination, settings } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/webhooks',
    method: 'post',
    data: {
      destination: destination, // URL для получения вебхуков
      settings: settings || [
        'add_lead',
        'update_lead',
        'delete_lead',
        'add_contact',
        'update_contact',
        'delete_contact',
        'add_company',
        'update_company',
        'delete_company',
        'add_task',
        'update_task',
        'delete_task',
        'responsible_lead',
        'responsible_contact',
        'responsible_company',
        'responsible_task',
        'status_lead',
        'note_lead',
        'note_contact',
        'note_company'
      ]
    }
  })

  if (result.success) {
    ctx.account.log('AmoCRM webhook subscribed', {
      level: 'info',
      json: {
        destination,
        webhookId: result.data.id
      }
    })
  }

  return result
})
```

#### Получение списка вебхуков (GET)

```typescript
export const apiGetWebhooksRoute = app.get('/webhooks', async (ctx, req) => {
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/webhooks',
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      webhooks: result.data._embedded?.webhooks || []
    }
  }

  return result
})
```

#### Отписка от вебхука (DELETE)

```typescript
export const apiUnsubscribeWebhookRoute = app.post('/unsubscribe-webhook', async (ctx, req) => {
  const { subdomain, destination } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/webhooks',
    method: 'delete',
    data: {
      destination: destination // URL вебхука для удаления
    }
  })

  if (result.success) {
    ctx.account.log('AmoCRM webhook unsubscribed', {
      level: 'info',
      json: { destination }
    })
  }

  return result
})
```

**Доступные события для подписки:**

| Событие               | Описание                             |
| --------------------- | ------------------------------------ |
| `add_lead`            | Создание сделки                      |
| `update_lead`         | Обновление сделки                    |
| `delete_lead`         | Удаление сделки                      |
| `status_lead`         | Изменение статуса сделки             |
| `responsible_lead`    | Изменение ответственного за сделку   |
| `note_lead`           | Добавление примечания к сделке       |
| `add_contact`         | Создание контакта                    |
| `update_contact`      | Обновление контакта                  |
| `delete_contact`      | Удаление контакта                    |
| `responsible_contact` | Изменение ответственного за контакт  |
| `note_contact`        | Добавление примечания к контакту     |
| `add_company`         | Создание компании                    |
| `update_company`      | Обновление компании                  |
| `delete_company`      | Удаление компании                    |
| `responsible_company` | Изменение ответственного за компанию |
| `note_company`        | Добавление примечания к компании     |
| `add_task`            | Создание задачи                      |
| `update_task`         | Обновление задачи                    |
| `delete_task`         | Удаление задачи                      |
| `responsible_task`    | Изменение ответственного за задачу   |

### Обработка событий

```typescript
// Роут для приёма вебхуков
export const amoCRMWebhookRoute = app.post('/webhook', async (ctx, req) => {
  const payload = req.body

  ctx.account.log('AmoCRM webhook received', {
    level: 'info',
    json: { payload }
  })

  // Обработка создания сделок
  if (payload?.leads?.add) {
    for (const lead of payload.leads.add) {
      ctx.account.log('New lead from webhook', {
        level: 'info',
        json: {
          leadId: lead.id,
          name: lead.name,
          status: lead.status_id
        }
      })

      // Ваша логика обработки
      await processNewLead(ctx, lead)
    }
  }

  // Обработка обновления сделок
  if (payload?.leads?.update) {
    for (const lead of payload.leads.update) {
      await processLeadUpdate(ctx, lead)
    }
  }

  // Обработка контактов
  if (payload?.contacts?.add) {
    for (const contact of payload.contacts.add) {
      await processNewContact(ctx, contact)
    }
  }

  // Всегда возвращайте 200
  return { success: true }
})
```

### Типы событий

| Сущность | Событие    | Ключ в payload     |
| -------- | ---------- | ------------------ |
| Сделки   | Создание   | `leads.add`        |
| Сделки   | Обновление | `leads.update`     |
| Контакты | Создание   | `contacts.add`     |
| Контакты | Обновление | `contacts.update`  |
| Компании | Создание   | `companies.add`    |
| Компании | Обновление | `companies.update` |
| Задачи   | Создание   | `tasks.add`        |
| Задачи   | Обновление | `tasks.update`     |

**Формат payload**:

```json
{
  "leads": {
    "add": [
      {
        "id": 999999,
        "name": "Сделка",
        "responsible_user_id": 123,
        "pipeline_id": 222,
        "status_id": 444,
        "created_at": 1681111111,
        "updated_at": 1681111111
      }
    ]
  }
}
```

---

## Задачи (Tasks)

Задачи — напоминания для сотрудников.

### Создание задачи

```typescript
export const apiCreateTaskRoute = app.post('/create-task', async (ctx, req) => {
  const { subdomain, task } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const completeTill = task.completeTill || Math.floor(Date.now() / 1000) + 86400

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/tasks',
    method: 'post',
    data: [
      {
        text: task.text,
        complete_till: completeTill,
        entity_id: task.entityId, // ID сделки/контакта
        entity_type: task.entityType, // 'leads', 'contacts', 'companies'
        responsible_user_id: task.responsibleUserId,
        task_type_id: task.taskTypeId || 1 // 1=звонок, 2=встреча, 3=письмо
      }
    ]
  })

  if (result.success) {
    ctx.account.log('AmoCRM task created', {
      level: 'info',
      json: { taskId: result.data._embedded?.tasks?.[0]?.id }
    })
  }

  return result
})
```

### Получение задач

```typescript
export const apiGetTasksRoute = app.get('/tasks', async (ctx, req) => {
  const { subdomain, limit = 50 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/tasks',
    method: 'get',
    params: {
      limit,
      // Фильтр по выполненным/невыполненным
      'filter[is_completed]': 0, // 0 = не выполнена, 1 = выполнена

      // Фильтр по ответственному
      'filter[responsible_user_id]': 100,

      // Фильтр по сущности
      'filter[entity_type]': 'leads', // leads, contacts, companies
      'filter[entity_id]': 12345
    }
  })

  if (result.success) {
    return {
      success: true,
      tasks: result.data._embedded?.tasks || []
    }
  }

  return result
})
```

### Обновление задачи

```typescript
export const apiUpdateTaskRoute = app.post('/update-task', async (ctx, req) => {
  const { subdomain, taskId, updates } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/tasks/${taskId}`,
    method: 'patch',
    data: {
      text: updates.text,
      complete_till: updates.completeTill,
      is_completed: updates.isCompleted // true для завершения
    }
  })

  return result
})
```

### Типы задач

AmoCRM поддерживает различные типы задач:

| ID  | Название | Описание              |
| --- | -------- | --------------------- |
| 1   | Звонок   | Напоминание позвонить |
| 2   | Встреча  | Запланировать встречу |
| 3   | Письмо   | Написать письмо       |

Получение списка типов задач:

```typescript
const accountInfo = await amoCRMRequest({
  subdomain,
  accessToken: token.token,
  endpoint: '/api/v4/account',
  method: 'get',
  params: {
    with: 'task_types'
  }
})

const taskTypes = accountInfo.data._embedded?.task_types || []
```

---

## События и Примечания (Events & Notes)

События — это записи в истории сделки/контакта/компании.

**Эндпоинт**: `/api/v4/events`

### Получение событий

```typescript
export const apiGetEventsRoute = app.get('/events', async (ctx, req) => {
  const { subdomain, entityType, entityId } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/events',
    method: 'get',
    params: {
      'filter[entity]': entityType, // leads, contacts, companies
      'filter[entity_id]': entityId,
      limit: 100
    }
  })

  if (result.success) {
    return {
      success: true,
      events: result.data._embedded?.events || []
    }
  }

  return result
})
```

### Добавление примечания

**Эндпоинт**: `/api/v4/{entity_type}/{entity_id}/notes`

```typescript
export const apiAddNoteRoute = app.post('/add-note', async (ctx, req) => {
  const { subdomain, entityType, entityId, note } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/${entityId}/notes`,
    method: 'post',
    data: [
      {
        note_type: 'common', // common, call_in, call_out, service_message
        params: {
          text: note.text
        }
      }
    ]
  })

  if (result.success) {
    ctx.account.log('AmoCRM note added', {
      level: 'info',
      json: {
        noteId: result.data._embedded?.notes?.[0]?.id,
        entityType,
        entityId
      }
    })
  }

  return result
})
```

**Типы примечаний:**

- `common` — обычное примечание
- `call_in` — входящий звонок
- `call_out` — исходящий звонок
- `service_message` — системное сообщение
- `mail_message_attachment` — вложение письма

---

## Беседы (Talks)

Беседы — это диалоги с клиентами через различные каналы связи (чаты, мессенджеры).

**Эндпоинт**: `/api/v4/talks`

### Структура беседы

```typescript
interface Talk {
  id: number
  entity_id: number // ID сделки/контакта
  entity_type: string // leads, contacts
  created_by: number
  created_at: number
  updated_at: number
  is_unread: boolean
  _embedded?: {
    messages?: Array<{
      id: string
      author_id: number
      message: {
        type: 'text' | 'picture' | 'file'
        text?: string
      }
      created_at: number
    }>
  }
}
```

### Получение бесед

```typescript
export const apiGetTalksRoute = app.get('/talks', async (ctx, req) => {
  const { subdomain, limit = 50 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/talks',
    method: 'get',
    params: {
      limit,
      'filter[is_unread]': 1 // Только непрочитанные
    }
  })

  if (result.success) {
    return {
      success: true,
      talks: result.data._embedded?.talks || []
    }
  }

  return result
})
```

### Получение истории чата

```typescript
export const apiGetChatHistoryRoute = app.get('/talks/:talkId', async (ctx, req) => {
  const { talkId } = req.params
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/talks/${talkId}`,
    method: 'get'
  })

  return result
})
```

---

## Теги (Tags)

Теги используются для группировки и категоризации сущностей.

**Эндпоинт**: `/api/v4/{entity_type}/tags`

### Получение тегов

```typescript
export const apiGetTagsRoute = app.get('/tags', async (ctx, req) => {
  const { subdomain, entityType = 'leads' } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/tags`, // leads, contacts, companies
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      tags: result.data._embedded?.tags || []
    }
  }

  return result
})
```

### Добавление тега к сущности

```typescript
export const apiAddTagRoute = app.post('/add-tag', async (ctx, req) => {
  const { subdomain, entityType, entityId, tagName } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/${entityId}`,
    method: 'patch',
    data: {
      _embedded: {
        tags: [
          {
            name: tagName
          }
        ]
      }
    }
  })

  if (result.success) {
    ctx.account.log('AmoCRM tag added', {
      level: 'info',
      json: { tagName, entityType, entityId }
    })
  }

  return result
})
```

---

## Связи сущностей (Entity Links)

Связи позволяют связывать сделки, контакты и компании между собой.

**Эндпоинт**: `/api/v4/{entity_type}/{entity_id}/link` и `/api/v4/{entity_type}/{entity_id}/unlink`

### Связать сущности

```typescript
export const apiLinkEntitiesRoute = app.post('/link-entities', async (ctx, req) => {
  const { subdomain, fromType, fromId, toType, toId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${fromType}/${fromId}/link`,
    method: 'post',
    data: [
      {
        to_entity_id: toId,
        to_entity_type: toType // leads, contacts, companies, catalog_elements
      }
    ]
  })

  if (result.success) {
    ctx.account.log('AmoCRM entities linked', {
      level: 'info',
      json: { fromType, fromId, toType, toId }
    })
  }

  return result
})
```

**Примеры связей:**

- Привязать контакт к сделке
- Привязать компанию к контакту
- Привязать сделку к другой сделке

```typescript
// Привязать контакт (ID=100) к сделке (ID=200)
await amoCRMRequest({
  subdomain,
  accessToken: token.token,
  endpoint: '/api/v4/leads/200/link',
  method: 'post',
  data: [
    {
      to_entity_id: 100,
      to_entity_type: 'contacts'
    }
  ]
})
```

### Отвязать сущности

```typescript
export const apiUnlinkEntitiesRoute = app.post('/unlink-entities', async (ctx, req) => {
  const { subdomain, fromType, fromId, toType, toId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${fromType}/${fromId}/unlink`,
    method: 'post',
    data: [
      {
        to_entity_id: toId,
        to_entity_type: toType
      }
    ]
  })

  return result
})
```

---

## Файлы (Files)

Работа с файлами, прикреплёнными к сущностям.

**Эндпоинт**: `/api/v4/{entity_type}/{entity_id}/files`

### Структура файла

```typescript
interface File {
  uuid: string // Уникальный ID файла
  version_uuid: string // ID версии файла
  name: string // Имя файла
  size: number // Размер в байтах
  created_at: number // Unix timestamp
  created_by: number // ID пользователя
  _links: {
    download: {
      href: string // Ссылка для скачивания
    }
  }
}
```

### Получение файлов сущности

```typescript
export const apiGetEntityFilesRoute = app.get('/entity-files', async (ctx, req) => {
  const { subdomain, entityType, entityId } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  // entityType: leads, contacts, companies, customers
  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/${entityId}/files`,
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      files: result.data._embedded?.files || []
    }
  }

  return result
})
```

### Привязка файла к сущности

```typescript
export const apiAttachFileToEntityRoute = app.post('/attach-file', async (ctx, req) => {
  const { subdomain, entityType, entityId, fileUuid, versionUuid } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/${entityId}/files`,
    method: 'put',
    data: {
      uuid: fileUuid,
      version_uuid: versionUuid
    }
  })

  if (result.success) {
    ctx.account.log('AmoCRM file attached', {
      level: 'info',
      json: {
        entityType,
        entityId,
        fileUuid
      }
    })
  }

  return result
})
```

### Загрузка файла в AmoCRM

**Важно**: Сначала файл нужно загрузить в хранилище AmoCRM, затем привязать к сущности.

```typescript
export const apiUploadFileRoute = app.post('/upload-file', async (ctx, req) => {
  const { subdomain, fileName, fileContent, contentType } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  // Шаг 1: Загрузить файл
  const uploadResult = await request({
    url: `https://${subdomain}.amocrm.ru/api/v4/files`,
    method: 'post',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: fileContent, // Buffer или Stream
    responseType: 'json',
    throwHttpErrors: false
  })

  if (uploadResult.statusCode === 200) {
    const fileData = uploadResult.body

    ctx.account.log('AmoCRM file uploaded', {
      level: 'info',
      json: {
        uuid: fileData.uuid,
        name: fileName
      }
    })

    return {
      success: true,
      file: fileData
    }
  }

  return {
    success: false,
    error: 'File upload failed',
    statusCode: uploadResult.statusCode
  }
})
```

### Полный пример: загрузка и привязка файла

```typescript
async function uploadAndAttachFile(ctx, subdomain, entityType, entityId, file) {
  // 1. Загружаем файл в AmoCRM
  const uploadResult = await apiUploadFileRoute(ctx, {
    body: {
      subdomain,
      fileName: file.name,
      fileContent: file.buffer,
      contentType: file.mimeType
    }
  })

  if (!uploadResult.success) {
    return uploadResult
  }

  // 2. Привязываем файл к сущности
  const attachResult = await apiAttachFileToEntityRoute(ctx, {
    body: {
      subdomain,
      entityType,
      entityId,
      fileUuid: uploadResult.file.uuid,
      versionUuid: uploadResult.file.version_uuid
    }
  })

  return attachResult
}
```

**Поддерживаемые типы сущностей:**

- `leads` — сделки
- `contacts` — контакты
- `companies` — компании
- `customers` — покупатели

---

## Каталоги и товары (Catalogs)

Работа с каталогами товаров и привязка их к сделкам.

**Эндпоинт**: `/api/v4/catalogs` и `/api/v4/leads/{lead_id}/link`

### Получение каталогов

```typescript
export const apiGetCatalogsRoute = app.get('/catalogs', async (ctx, req) => {
  const { subdomain } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/catalogs',
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      catalogs: result.data._embedded?.catalogs || []
    }
  }

  return result
})
```

### Получение товаров из каталога

```typescript
export const apiGetCatalogElementsRoute = app.get('/catalog-elements', async (ctx, req) => {
  const { subdomain, catalogId, limit = 250 } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/catalogs/${catalogId}/elements`,
    method: 'get',
    params: { limit }
  })

  if (result.success) {
    return {
      success: true,
      elements: result.data._embedded?.elements || []
    }
  }

  return result
})
```

### Привязка товаров к сделке

```typescript
export const apiLinkProductsToLeadRoute = app.post('/link-products', async (ctx, req) => {
  const { subdomain, leadId, products } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  // products - массив товаров с количеством
  const linksData = products.map((product) => ({
    to_entity_id: product.elementId, // ID товара из каталога
    to_entity_type: 'catalog_elements',
    metadata: {
      catalog_id: product.catalogId, // ID каталога
      quantity: product.quantity || 1, // Количество
      price_id: product.priceId // ID прайса (опционально)
    }
  }))

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/${leadId}/link`,
    method: 'post',
    data: linksData
  })

  if (result.success) {
    ctx.account.log('AmoCRM products linked to lead', {
      level: 'info',
      json: {
        leadId,
        productsCount: products.length
      }
    })
  }

  return result
})
```

**Пример использования:**

```typescript
// Привязываем 2 товара к сделке
await apiLinkProductsToLeadRoute(ctx, {
  body: {
    subdomain: 'mycompany',
    leadId: 12345,
    products: [
      {
        catalogId: 100,
        elementId: 500, // ID товара
        quantity: 2
      },
      {
        catalogId: 100,
        elementId: 501,
        quantity: 1
      }
    ]
  }
})
```

### Получение товаров сделки

```typescript
export const apiGetLeadProductsRoute = app.get('/lead-products', async (ctx, req) => {
  const { subdomain, leadId } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/leads/${leadId}`,
    method: 'get',
    params: {
      with: 'catalog_elements' // Включить товары в ответ
    }
  })

  if (result.success) {
    const lead = result.data
    const products = lead._embedded?.catalog_elements || []

    return {
      success: true,
      leadId: lead.id,
      price: lead.price,
      products
    }
  }

  return result
})
```

---

## Дополнительные поля (Custom Fields)

Дополнительные поля позволяют расширить стандартную структуру сущностей.

**Эндпоинт**: `/api/v4/{entity_type}/custom_fields`

### Типы полей

| Тип             | Описание                     | Значение              |
| --------------- | ---------------------------- | --------------------- |
| `text`          | Текстовое поле               | Строка                |
| `numeric`       | Числовое поле                | Число                 |
| `checkbox`      | Флажок                       | Boolean               |
| `select`        | Список (один выбор)          | ID опции или текст    |
| `multiselect`   | Список (множественный выбор) | Массив ID опций       |
| `date`          | Дата                         | Unix timestamp        |
| `url`           | URL-адрес                    | Строка                |
| `textarea`      | Многострочный текст          | Строка                |
| `radiobutton`   | Радиокнопки                  | ID опции              |
| `streetaddress` | Адрес                        | Строка                |
| `smart_address` | Умный адрес                  | Объект с координатами |
| `birthday`      | День рождения                | Unix timestamp        |
| `legal_entity`  | Юридическое лицо             | Объект                |
| `price`         | Цена                         | Число                 |

### Получение дополнительных полей

```typescript
export const apiGetCustomFieldsRoute = app.get('/custom-fields', async (ctx, req) => {
  const { subdomain, entityType = 'leads' } = req.query

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/custom_fields`,
    method: 'get'
  })

  if (result.success) {
    return {
      success: true,
      customFields: result.data._embedded?.custom_fields || []
    }
  }

  return result
})
```

### Создание дополнительного поля

```typescript
export const apiCreateCustomFieldRoute = app.post('/create-custom-field', async (ctx, req) => {
  const { subdomain, entityType = 'leads', field } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/custom_fields`,
    method: 'post',
    data: [
      {
        name: field.name,
        type: field.type || 'text',
        sort: field.sort || 10,
        is_required: field.isRequired || false,
        is_visible: field.isVisible !== false,
        // Для select/multiselect/radiobutton
        enums: field.options
          ? field.options.map((opt, idx) => ({
              value: opt.value,
              sort: idx + 1
            }))
          : undefined
      }
    ]
  })

  if (result.success) {
    const createdField = result.data._embedded?.custom_fields?.[0]

    ctx.account.log('AmoCRM custom field created', {
      level: 'info',
      json: {
        fieldId: createdField?.id,
        name: field.name,
        type: field.type
      }
    })

    return {
      success: true,
      field: createdField
    }
  }

  return result
})
```

**Пример создания поля типа select:**

```typescript
const field = {
  name: 'Источник трафика',
  type: 'select',
  options: [
    { value: 'Google' },
    { value: 'Яндекс' },
    { value: 'Соцсети' },
    { value: 'Прямой заход' }
  ]
}
```

### Обновление дополнительного поля

```typescript
export const apiUpdateCustomFieldRoute = app.post('/update-custom-field', async (ctx, req) => {
  const { subdomain, entityType = 'leads', fieldId, updates } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/custom_fields/${fieldId}`,
    method: 'patch',
    data: updates
  })

  return result
})
```

### Удаление дополнительного поля

```typescript
export const apiDeleteCustomFieldRoute = app.post('/delete-custom-field', async (ctx, req) => {
  const { subdomain, entityType = 'leads', fieldId } = req.body

  const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)

  if (!token.success) {
    return token
  }

  const result = await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: `/api/v4/${entityType}/custom_fields/${fieldId}`,
    method: 'delete'
  })

  return result
})
```

### Работа с значениями полей

При создании/обновлении сущностей используйте `custom_fields_values`:

```typescript
// Пример с разными типами полей
const customFieldsValues = [
  // Текстовое поле
  {
    field_id: 123,
    values: [
      {
        value: 'Текстовое значение'
      }
    ]
  },

  // Числовое поле
  {
    field_id: 456,
    values: [
      {
        value: 12345
      }
    ]
  },

  // Список (select)
  {
    field_id: 789,
    values: [
      {
        enum_id: 100 // ID опции из списка
      }
    ]
  },

  // Множественный выбор (multiselect)
  {
    field_id: 999,
    values: [{ enum_id: 100 }, { enum_id: 200 }, { enum_id: 300 }]
  },

  // Флажок
  {
    field_id: 111,
    values: [
      {
        value: true
      }
    ]
  },

  // Дата
  {
    field_id: 222,
    values: [
      {
        value: Math.floor(Date.now() / 1000)
      }
    ]
  },

  // Системные поля (PHONE, EMAIL)
  {
    field_code: 'PHONE',
    values: [
      {
        value: '+79991234567',
        enum_code: 'WORK' // WORK, WORKDD, MOB, FAX, HOME, OTHER
      }
    ]
  },

  {
    field_code: 'EMAIL',
    values: [
      {
        value: 'user@example.com',
        enum_code: 'WORK' // WORK, PRIV, OTHER
      }
    ]
  }
]

// Применение при создании сделки
const lead = {
  name: 'Новая сделка',
  price: 50000,
  custom_fields_values: customFieldsValues
}
```

---

## Пагинация и лимиты

### Лимиты запросов

AmoCRM имеет следующие лимиты:

| Параметр                           | Значение                       |
| ---------------------------------- | ------------------------------ |
| Максимальный limit                 | 250 записей за запрос          |
| Rate limit                         | 7 запросов в секунду (базовый) |
| Rate limit (расширенный)           | Зависит от тарифа              |
| Максимум записей в batch-операциях | 50                             |

### Пагинация

AmoCRM использует page-based пагинацию:

```typescript
async function getAllLeads(ctx, subdomain, accessToken) {
  const allLeads = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const result = await amoCRMRequest({
      subdomain,
      accessToken,
      endpoint: '/api/v4/leads',
      method: 'get',
      params: {
        limit: 250,
        page
      }
    })

    if (result.success) {
      const leads = result.data._embedded?.leads || []
      allLeads.push(...leads)

      // Проверяем, есть ли ещё страницы
      const pageInfo = result.data._page
      hasMore = page < pageInfo.total_pages
      page++

      ctx.account.log('AmoCRM leads fetched', {
        level: 'info',
        json: {
          page,
          totalPages: pageInfo.total_pages,
          totalItems: pageInfo.total_items
        }
      })

      // Задержка для соблюдения rate limit
      await new Promise((resolve) => setTimeout(resolve, 150))
    } else {
      hasMore = false
    }
  }

  return allLeads
}
```

**Структура \_page:**

```typescript
{
  "_page": {
    "total_items": 500,  // Всего записей
    "total_pages": 2,    // Всего страниц
    "current_page": 1,   // Текущая страница
    "page_size": 250     // Размер страницы
  }
}
```

---

## Обработка ошибок

### Коды ошибок

| Код     | Описание              | Причина                        | Действие                                    |
| ------- | --------------------- | ------------------------------ | ------------------------------------------- |
| 200-204 | Успех                 | Операция выполнена успешно     | OK                                          |
| 400     | Bad Request           | Некорректные данные            | Проверить payload и параметры               |
| 401     | Unauthorized          | Токен недействителен или истёк | Обновить access_token через refresh_token   |
| 403     | Forbidden             | Недостаточно прав              | Проверить права пользователя в AmoCRM       |
| 404     | Not Found             | Ресурс не найден               | Проверить URL, ID сущности                  |
| 429     | Too Many Requests     | Превышен rate limit            | Подождать и повторить (exponential backoff) |
| 500     | Internal Server Error | Ошибка на стороне AmoCRM       | Повторить позже                             |
| 502     | Bad Gateway           | Проблемы с сервером AmoCRM     | Повторить позже                             |
| 503     | Service Unavailable   | Сервис временно недоступен     | Повторить позже                             |

### Структура ошибок

AmoCRM возвращает ошибки в следующем формате:

```json
{
  "status": 400,
  "title": "Bad Request",
  "detail": "Validation failed: name is required",
  "validation-errors": [
    {
      "request_id": "abc123",
      "code": "required",
      "path": "name",
      "detail": "Field 'name' is required"
    }
  ]
}
```

**Поля ошибки:**

- `status` — HTTP код ошибки
- `title` — краткое описание
- `detail` — подробное описание
- `type` — тип ошибки (опционально)
- `validation-errors` — массив ошибок валидации (для 400)

### Обработка в коде

```typescript
async function amoCRMRequestWithRetry(
  ctx,
  options: AmoCRMRequestOptions,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await amoCRMRequest(options)

    if (result.success) {
      return result
    }

    // Если 429 (rate limit) — ждём и повторяем
    if (result.statusCode === 429) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)

      ctx.account.log('Rate limit, retrying', {
        level: 'warn',
        json: { attempt, delay }
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
      continue
    }

    // Если 401 — пробуем обновить токен
    if (result.statusCode === 401 && attempt < maxRetries) {
      ctx.account.log('Token expired, refreshing', {
        level: 'info',
        json: { attempt }
      })

      // Обновление токена и повтор
      const newToken = await refreshAccessToken(
        ctx,
        options.subdomain,
        clientId,
        clientSecret,
        refreshToken
      )
      if (newToken.success) {
        options.accessToken = newToken.token
        continue
      }
    }

    // Другие ошибки — не повторяем
    return result
  }

  return { success: false, error: 'Max retries exceeded' }
}
```

---

## Лучшие практики

### Авторизация

✅ **Храните токены в Heap**:

```typescript
// Используйте createOrUpdateBy для безопасного обновления
await AmoCRMTokens.createOrUpdateBy(ctx, 'subdomain', {
  subdomain,
  accessToken,
  refreshToken,
  expiresAt
})
```

✅ **Проверяйте срок действия токена**:

```typescript
// Обновляйте токен за 5 минут до истечения
if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
  await refreshAccessToken(ctx, subdomain, clientId, clientSecret, refreshToken)
}
```

✅ **Храните subdomain отдельно**:

```typescript
// Не хардкодите subdomain в коде
const subdomain = await getSubdomainFromSettings(ctx)
```

❌ **НЕ храните токены в переменных окружения**:

```typescript
// ПЛОХО - токены истекают каждые 24 часа
const ACCESS_TOKEN = process.env.AMOCRM_TOKEN

// ХОРОШО - храните в Heap с автообновлением
const token = await getValidAccessToken(ctx, subdomain, clientId, clientSecret)
```

### Запросы к API

✅ **Используйте @app/request**:

```typescript
import { request } from '@app/request'
// НЕ используйте axios, fetch, node-fetch
```

✅ **Логируйте через ctx.account.log()**:

```typescript
ctx.account.log('AmoCRM operation', {
  level: 'info',
  json: { operation, result }
})
```

✅ **Обрабатывайте ошибки**:

```typescript
if (response.statusCode !== 200) {
  ctx.account.log('AmoCRM error', {
    level: 'error',
    json: {
      status: response.statusCode,
      error: response.body,
      endpoint: options.endpoint
    }
  })
}
```

✅ **Используйте `throwHttpErrors: false`**:

```typescript
// Это позволяет обработать ошибки вручную
const response = await request({
  url,
  method: 'post',
  throwHttpErrors: false // ⚠️ Важно!
})

if (response.statusCode >= 400) {
  // Обработка ошибки
}
```

✅ **Соблюдайте rate limits**:

```typescript
// Добавляйте задержки между запросами
await new Promise((resolve) => setTimeout(resolve, 150)) // ~7 запросов/сек
```

### Вебхуки

✅ **Всегда возвращайте 200 немедленно**:

```typescript
export const webhookRoute = app.post('/webhook', async (ctx, req) => {
  // Сохраняем событие для асинхронной обработки
  await WebhookQueue.create(ctx, {
    payload: req.body,
    receivedAt: new Date()
  })

  // Немедленно возвращаем 200
  return { success: true }
})
```

✅ **Делайте обработку идемпотентной**:

```typescript
// Проверяйте, не обработали ли уже это событие
const processed = await EventsTable.findOneBy(ctx, {
  leadId: lead.id,
  eventType: 'lead_created',
  eventTimestamp: lead.updated_at
})

if (processed) {
  ctx.account.log('Event already processed', {
    level: 'info',
    json: { leadId: lead.id }
  })
  return { success: true, message: 'Already processed' }
}

// Обработка события...

// Сохраняем факт обработки
await EventsTable.create(ctx, {
  leadId: lead.id,
  eventType: 'lead_created',
  eventTimestamp: lead.updated_at
})
```

✅ **Обрабатывайте массовые события**:

```typescript
// AmoCRM может отправить несколько сущностей за раз
if (payload?.leads?.add) {
  for (const lead of payload.leads.add) {
    try {
      await processLead(ctx, lead)
    } catch (error) {
      // Логируем ошибку, но продолжаем обработку остальных
      ctx.account.log('Lead processing error', {
        level: 'error',
        json: { leadId: lead.id, error: error.message }
      })
    }
  }
}
```

### Создание сущностей

✅ **Используйте source_uid для дедупликации**:

```typescript
// Уникальный ID для предотвращения дублей
const sourceUid = `form_${formId}_${Date.now()}_${userEmail}`
```

✅ **Добавляйте request_id для отладки**:

```typescript
data: [
  {
    ...leadData,
    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
]
```

✅ **Валидируйте данные перед отправкой**:

```typescript
function validateLead(lead) {
  if (!lead.name || lead.name.trim() === '') {
    throw new Error('Lead name is required')
  }

  if (lead.price && typeof lead.price !== 'number') {
    throw new Error('Lead price must be a number')
  }

  // ... другие проверки
}

// Использование
try {
  validateLead(leadData)
  await createLead(ctx, leadData)
} catch (error) {
  ctx.account.log('Validation error', {
    level: 'error',
    json: { error: error.message, leadData }
  })
}
```

### Производительность

✅ **Кэшируйте редко меняющиеся данные**:

```typescript
// Воронки, пользователи, custom fields редко меняются
const CACHE_TTL = 3600 * 1000 // 1 час

async function getCachedPipelines(ctx, subdomain, accessToken) {
  const cacheKey = `pipelines_${subdomain}`
  const cached = await Cache.get(ctx, cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const pipelines = await fetchPipelines(ctx, subdomain, accessToken)

  await Cache.set(ctx, cacheKey, {
    data: pipelines,
    expiresAt: Date.now() + CACHE_TTL
  })

  return pipelines
}
```

✅ **Используйте пакетные операции**:

```typescript
// Создавайте до 50 сущностей за раз
const leads = [lead1, lead2, lead3 /* ... */]
const batches = []

for (let i = 0; i < leads.length; i += 50) {
  batches.push(leads.slice(i, i + 50))
}

for (const batch of batches) {
  await amoCRMRequest({
    subdomain,
    accessToken: token.token,
    endpoint: '/api/v4/leads',
    method: 'post',
    data: batch
  })

  // Задержка между батчами
  await new Promise((resolve) => setTimeout(resolve, 200))
}
```

✅ **Используйте параллельные запросы с осторожностью**:

```typescript
// Максимум 5-7 параллельных запросов
async function fetchMultipleLeads(leadIds) {
  const chunks = []
  for (let i = 0; i < leadIds.length; i += 5) {
    chunks.push(leadIds.slice(i, i + 5))
  }

  const results = []
  for (const chunk of chunks) {
    const promises = chunk.map((id) => fetchLead(id))
    const chunkResults = await Promise.all(promises)
    results.push(...chunkResults)

    // Задержка между чанками
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return results
}
```

### Безопасность

✅ **Не логируйте sensitive данные**:

```typescript
// ПЛОХО
ctx.account.log('Token received', {
  level: 'info',
  json: { accessToken: token.accessToken } // ❌ Не делайте так!
})

// ХОРОШО
ctx.account.log('Token received', {
  level: 'info',
  json: {
    hasAccessToken: !!token.accessToken,
    expiresIn: token.expiresIn
  }
})
```

✅ **Валидируйте webhook payload**:

```typescript
export const webhookRoute = app.post('/webhook', async (ctx, req) => {
  const payload = req.body

  // Базовая валидация структуры
  if (!payload || typeof payload !== 'object') {
    ctx.account.log('Invalid webhook payload', {
      level: 'warn',
      json: { payload }
    })
    return { success: false, error: 'Invalid payload' }
  }

  // Обработка...
  return { success: true }
})
```

### Отладка

✅ **Логируйте запросы и ответы**:

```typescript
async function amoCRMRequestWithLogging(ctx, options) {
  ctx.account.log('AmoCRM request', {
    level: 'debug',
    json: {
      endpoint: options.endpoint,
      method: options.method,
      params: options.params
    }
  })

  const result = await amoCRMRequest(options)

  ctx.account.log('AmoCRM response', {
    level: result.success ? 'debug' : 'error',
    json: {
      endpoint: options.endpoint,
      success: result.success,
      statusCode: result.statusCode,
      error: result.error
    }
  })

  return result
}
```

✅ **Используйте флаги для debug режима**:

```typescript
const DEBUG = false // Включайте только при отладке

if (DEBUG) {
  ctx.account.log('Full response body', {
    level: 'debug',
    json: response.body
  })
}
```

### Обработка специфичных случаев

✅ **Обработка дублей контактов**:

```typescript
// AmoCRM автоматически ищет дубли по телефону/email
// Если контакт найден, он будет обновлён, а не создан заново

async function createOrUpdateContact(ctx, subdomain, accessToken, contact) {
  // Сначала ищем контакт
  const searchResult = await amoCRMRequest({
    subdomain,
    accessToken,
    endpoint: '/api/v4/contacts',
    method: 'get',
    params: {
      query: contact.phone
    }
  })

  const existingContacts = searchResult.data?._embedded?.contacts || []

  if (existingContacts.length > 0) {
    // Обновляем существующий
    const contactId = existingContacts[0].id
    return await amoCRMRequest({
      subdomain,
      accessToken,
      endpoint: `/api/v4/contacts/${contactId}`,
      method: 'patch',
      data: contact
    })
  } else {
    // Создаём новый
    return await amoCRMRequest({
      subdomain,
      accessToken,
      endpoint: '/api/v4/contacts',
      method: 'post',
      data: [contact]
    })
  }
}
```

✅ **Работа с большими объёмами данных**:

```typescript
// Экспорт всех сделок за период
async function exportLeadsForPeriod(ctx, subdomain, accessToken, fromDate, toDate) {
  const allLeads = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const result = await amoCRMRequest({
        subdomain,
        accessToken,
        endpoint: '/api/v4/leads',
        method: 'get',
        params: {
          'filter[created_at][from]': Math.floor(fromDate.getTime() / 1000),
          'filter[created_at][to]': Math.floor(toDate.getTime() / 1000),
          limit: 250,
          page
        }
      })

      if (!result.success) {
        ctx.account.log('Export error', {
          level: 'error',
          json: { page, error: result.error }
        })
        break
      }

      const leads = result.data._embedded?.leads || []
      allLeads.push(...leads)

      const pageInfo = result.data._page
      hasMore = page < pageInfo.total_pages
      page++

      ctx.account.log('Exported page', {
        level: 'info',
        json: {
          page,
          totalPages: pageInfo.total_pages,
          leadsCount: leads.length,
          totalExported: allLeads.length
        }
      })

      // Обязательная задержка
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      ctx.account.log('Export exception', {
        level: 'error',
        json: { page, error: error.message }
      })
      break
    }
  }

  return allLeads
}
```

---

## 🚨 Типичные ошибки и решения

### Ошибка 1: 404 при авторизации

**Проблема:**

```
URL: https://subdomain.amocrm.ru/oauth?...
Результат: 404 Not Found
```

**Причина:** Неправильный URL авторизации.

**Решение:**

```typescript
// ❌ НЕПРАВИЛЬНО
const authUrl = `https://${subdomain}.amocrm.ru/oauth?...`

// ✅ ПРАВИЛЬНО
const authUrl = `https://www.amocrm.ru/oauth?client_id=...&state=...&redirect_uri=...`
```

### Ошибка 2: "Authorization code has expired"

**Проблема:**

```json
{
  "hint": "Authorization code has expired",
  "status": 400
}
```

**Причина:** Код авторизации действителен только 20 минут.

**Решение:** Автоматически обменивайте код сразу после получения:

```typescript
// В Vue компоненте
onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')

  if (code) {
    // Немедленно обмениваем код на токен!
    await exchangeCodeForTokens(code)
  }
})
```

### Ошибка 3: "fetch is not defined"

**Проблема:**

```
ReferenceError: fetch is not defined
```

**Причина:** В серверном окружении Chatium нет браузерного `fetch`.

**Решение:** Используйте `request` из `@app/request`:

```typescript
// ❌ НЕПРАВИЛЬНО
const response = await fetch(url, { method: 'POST', body: ... })

// ✅ ПРАВИЛЬНО
import { request } from "@app/request"

const response = await request({
  url,
  method: 'post',
  json: data,
  responseType: 'json',
  throwHttpErrors: false
})
```

### Ошибка 4: Интеграция отключена

**Проблема:** 404 при авторизации даже с правильным URL.

**Причина:** Интеграция отключена или не активирована в AmoCRM.

**Решение:**

1. Откройте AmoCRM → Настройки → Интеграции
2. Найдите вашу интеграцию
3. Убедитесь, что статус **"Установлено"** (зелёный)
4. Если отключена — нажмите "Включить"

### Ошибка 5: Неправильный Redirect URI

**Проблема:** Ошибка после авторизации в AmoCRM.

**Причина:** Redirect URI в коде не совпадает с настройками интеграции.

**Решение:** Используйте `.url()` для генерации полного URL:

```typescript
// ❌ НЕПРАВИЛЬНО - хардкод
const redirectUri = '/dev/amocrm-connector/oauthSettings'

// ✅ ПРАВИЛЬНО - полный URL через роут-объект
import { oauthSettingsPageRoute } from './oauthSettings'
const redirectUri = oauthSettingsPageRoute.url()
// Результат: https://s.chtm.khudoley.tech/dev/amocrm-connector/oauthSettings
```

### Ошибка 6: console.log не работает

**Проблема:** Логи не отображаются.

**Причина:** В Chatium нужно использовать `ctx.account.log()`.

**Решение:**

```typescript
// ❌ НЕПРАВИЛЬНО
console.log('Debug info')
console.error('Error:', error)

// ✅ ПРАВИЛЬНО
ctx.account.log('Debug info', {
  level: 'info',
  json: { data }
})

ctx.account.log('Error occurred', {
  level: 'error',
  json: { error: error.message, stack: error.stack }
})
```

---

## Связанные документы

- **004-request.md** — HTTP запросы через @app/request
- **008-heap.md** — Хранение токенов в Heap
- **002-routing.md** — Создание API роутов для AmoCRM
- [Официальная документация AmoCRM](https://www.amocrm.ru/developers/)

---

## Резюме: Быстрый старт

### Минимальная интеграция (5 шагов)

1. **Создайте интеграцию в AmoCRM**:

   - Настройки → API → Добавить интеграцию
   - Получите `client_id`, `client_secret`, `redirect_uri`

2. **Получите токены**:

   ```typescript
   // Авторизация через https://www.amocrm.ru/oauth
   const tokens = await exchangeCodeForTokens(
     ctx,
     subdomain,
     clientId,
     clientSecret,
     code,
     redirectUri
   )
   ```

3. **Сохраните токены в Heap**:

   ```typescript
   await AmoCRMTokens.createOrUpdateBy(ctx, 'subdomain', {
     subdomain,
     accessToken: tokens.accessToken,
     refreshToken: tokens.refreshToken,
     expiresAt: new Date(Date.now() + tokens.expiresIn * 1000)
   })
   ```

4. **Создайте универсальную функцию запросов**:

   ```typescript
   async function amoCRMRequest(options) {
     return await request({
       url: `https://${options.subdomain}.amocrm.ru${options.endpoint}`,
       method: options.method,
       headers: {
         Authorization: `Bearer ${options.accessToken}`,
         'Content-Type': 'application/json'
       },
       json: options.data,
       responseType: 'json',
       throwHttpErrors: false
     })
   }
   ```

5. **Используйте API**:
   ```typescript
   // Создание сделки
   const result = await amoCRMRequest({
     subdomain,
     accessToken: token.token,
     endpoint: '/api/v4/leads',
     method: 'post',
     data: [
       {
         name: 'Новая сделка',
         price: 50000
       }
     ]
   })
   ```

### Ключевые URL

| Назначение        | URL                                                 |
| ----------------- | --------------------------------------------------- |
| **Авторизация**   | `https://www.amocrm.ru/oauth`                       |
| **Обмен токенов** | `https://{subdomain}.amocrm.ru/oauth2/access_token` |
| **API**           | `https://{subdomain}.amocrm.ru/api/v4/...`          |

### Основные эндпоинты

| Сущность     | GET                       | POST                | PATCH                    | DELETE |
| ------------ | ------------------------- | ------------------- | ------------------------ | ------ |
| Сделки       | `/api/v4/leads`           | `/api/v4/leads`     | `/api/v4/leads/{id}`     | -      |
| Контакты     | `/api/v4/contacts`        | `/api/v4/contacts`  | `/api/v4/contacts/{id}`  | -      |
| Компании     | `/api/v4/companies`       | `/api/v4/companies` | `/api/v4/companies/{id}` | -      |
| Задачи       | `/api/v4/tasks`           | `/api/v4/tasks`     | `/api/v4/tasks/{id}`     | -      |
| Воронки      | `/api/v4/leads/pipelines` | -                   | -                        | -      |
| Пользователи | `/api/v4/users`           | -                   | -                        | -      |
| Аккаунт      | `/api/v4/account`         | -                   | -                        | -      |

### Частые проблемы

1. **404 при авторизации** → Используйте `www.amocrm.ru`, а не `{subdomain}.amocrm.ru`
2. **Токен истёк** → Автоматически обновляйте через `refresh_token`
3. **Rate limit** → Добавляйте задержки 150-200ms между запросами
4. **Fetch не работает** → Используйте `@app/request`

### Полезные ссылки

- [Официальная документация](https://www.amocrm.ru/developers/)
- [API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)
- [OAuth 2.0 пошагово](https://www.amocrm.ru/developers/content/oauth/step-by-step)
- [Неразобранное](https://www.amocrm.ru/developers/content/crm_platform/unsorted-api)
- [Вебхуки](https://www.amocrm.ru/developers/content/crm_platform/webhooks-api)

---

**Версия**: 2.1  
**Дата создания**: 2025-11-02  
**Последнее обновление**: 2025-11-03

**Изменения в версии 2.1:**

- 🔧 **ИСПРАВЛЕНО**: URL для обновления токенов (должен быть `subdomain.amocrm.ru`, а не `www.amocrm.ru`)
- ✅ **ДОБАВЛЕНО**: Полный раздел "Файлы (Files)" с загрузкой, привязкой файлов к сущностям
- ✅ **ДОБАВЛЕНО**: Раздел "Каталоги и товары (Catalogs)" с привязкой товаров к сделкам
- ✅ **ДОБАВЛЕНО**: Программная настройка вебхуков через API (POST/GET/DELETE `/api/v4/webhooks`)
- 🔧 Обновлены сигнатуры функций `refreshAccessToken` и `amoCRMRequestWithRetry` для корректной работы

**Изменения в версии 2.0:**

- Добавлены разделы: Параметры аккаунта, Пользователи, События и Примечания, Беседы, Теги, Связи сущностей
- Расширен раздел о дополнительных полях с подробным описанием типов
- Добавлены разделы о фильтрации и поиске
- Подробное описание пагинации и лимитов
- Расширен раздел лучших практик с примерами кэширования, batch-операций, безопасности
- Улучшена структура обработки ошибок
- Добавлен раздел "Резюме: Быстрый старт" для новых разработчиков

**Источники:**

- [AmoCRM API Documentation](https://www.amocrm.ru/developers/)
- [AmoCRM Webhooks API](https://www.amocrm.ru/developers/content/crm_platform/webhooks-api)
- [AmoCRM Files API](https://www.amocrm.ru/developers/content/files/files-api)
- [Техническое саммари AmoCRM API v4](https://chatgpt.com/s/dr_6908eed8e7f88191a2d465689163ed8b)
- [Структурированная документация AmoCRM](https://chatgpt.com/s/dr_6908ecfc622081918925032c6d0db09d)
- Практический опыт интеграции в Chatium
