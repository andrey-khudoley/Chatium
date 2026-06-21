@chatium

# Toggl Track API: Полное руководство для Chatium

Исчерпывающее руководство по интеграции Toggl Track API v9 в Chatium с примерами на `@app/request`, Heap и планировщике `app.job`.

---

- ## Содержание

- [FAQ](#faq)
- [Связанные документы](#связанные-документы)
- [Версия](#версия)

---

## Введение

**Toggl Track** — сервис трекинга времени. API v9 покрывает организации, рабочие пространства, проекты, задачи, теги и записи времени. Базовый URL: `https://api.track.toggl.com/api/v9`. Официальная документация: https://engineering.toggl.com/docs/.

Типичные задачи в Chatium:

- синхронизация времени с карточками сделок/задач;
- построение отчётов внутри админки;
- автоматизация уведомлений и биллинга;
- реакция на события Toggl через вебхуки.

---

## Авторизация

### Где взять API токен

1. Откройте https://track.toggl.com/profile.
2. В блоке **API Token** нажмите «Reveal».
3. Скопируйте строку токена (32 символа).
4. Передайте токен в Chatium админу workspace.

> Toggl использует Basic Auth: логин — API токен, пароль — `api_token`. OAuth для публичного API v9 недоступен.

### Хранение токена в Heap

```typescript
import { Heap } from '@app/heap'

export const TogglCredentials = Heap.Table('toggl_credentials', {
  accountName: Heap.String({ customMeta: { title: 'Название аккаунта' } }),
  apiToken: Heap.String({ customMeta: { title: 'API токен' } }),
  defaultWorkspaceId: Heap.Number({ customMeta: { title: 'Workspace по умолчанию' } })
})

export async function saveTogglToken(
  ctx,
  accountName: string,
  apiToken: string,
  workspaceId?: number
) {
  await TogglCredentials.createOrUpdateBy(ctx, 'accountName', {
    accountName,
    apiToken,
    defaultWorkspaceId: workspaceId
  })
}
```

Можно хранить токен и в `config.json`, если интеграция одна.

### Проверка доступа

Перед сохранением токена вызовите `/me`, чтобы убедиться в валидности и получить список workspace.

```typescript
import { requireAccountRole } from '@app/auth'

// Файл в дереве api/ (file-based URL); путь к файлу задаёт реальный URL роута.
export const togglSetupRoute = app
  .post('/')
  .body((s) => ({
    accountName: s.string(),
    apiToken: s.string()
  }))
  .handle(async (ctx, req) => {
    await requireAccountRole(ctx, 'Admin')
    const { accountName, apiToken } = req.body

    const profile = await togglRequest({ ctx, apiToken, endpoint: '/me' })

    await saveTogglToken(ctx, accountName, apiToken, profile.default_workspace_id)

    return {
      success: true,
      fullname: profile.fullname,
      workspaces: profile.workspaces.map((w) => ({ id: w.id, name: w.name }))
    }
  })
```

---

## Базовая настройка клиента

```typescript
import { request } from '@app/request'
import { utf8StringToBase64 } from './utf8Base64' // реализацию скопируйте из **047-base64.md** (в UGC нельзя полагаться на base64Encode)

function buildAuthHeader(apiToken: string) {
  return `Basic ${utf8StringToBase64(`${apiToken}:api_token`)}`
}

interface TogglRequestOptions {
  ctx
  endpoint: string
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete'
  query?: Record<string, string | number | boolean>
  json?: any
  apiToken: string
}

export async function togglRequest(options: TogglRequestOptions) {
  const { ctx, endpoint, method = 'get', json, query, apiToken } = options
  const search = query
    ? `?${new URLSearchParams(
        Object.entries(query).reduce(
          (acc, [key, value]) => {
            acc[key] = String(value)
            return acc
          },
          {} as Record<string, string>
        )
      ).toString()}`
    : ''

  const response = await request({
    url: `https://api.track.toggl.com/api/v9${endpoint}${search}`,
    method,
    headers: {
      Authorization: buildAuthHeader(apiToken),
      'Content-Type': 'application/json'
    },
    json,
    responseType: 'json',
    throwHttpErrors: false
  })

  if (response.statusCode >= 400) {
    ctx.account.log('Toggl API error', {
      level: 'error',
      json: { endpoint, status: response.statusCode, body: response.body }
    })
    throw new Error(`Toggl error ${response.statusCode}`)
  }

  return response.body
}
```

---

## Формат API и общие правила

Источник: https://engineering.toggl.com/docs/.

- Формат — JSON. Всегда указывайте `Content-Type: application/json`.
- Время — ISO 8601 / RFC 3339 (UTC). Пользовательская таймзона влияет только на UI, храните UTC в Heap.
- Частичные обновления — отправляйте только изменённые поля, иначе возможен `400 Bad Request` (особенно на Free тарифе).
- Eventual consistency — после создания workspace/project дождитесь 2–5 секунд или проверяйте `/me` на актуальность сессии перед следующими действиями (добавление пользователей, запуск jobs).
- Стандартные ответы: 402 (нужен апгрейд), 410 (эндпоинт устарел), 429 (превышен лимит), 5xx (повторить позже).

```typescript
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

await togglRequest({ ctx, apiToken, endpoint: '/organizations', method: 'post', json: payload })
await delay(3000)
const profile = await togglRequest({ ctx, apiToken, endpoint: '/me' })
```

---

## Основные сущности

| Сущность     | Эндпоинт                                          | Комментарии                                             |
| ------------ | ------------------------------------------------- | ------------------------------------------------------- |
| Пользователь | `GET /me`                                         | Профиль, список организаций/воркспейсов, данные о квоте |
| Организации  | `GET /organizations`                              | Контейнер для workspace                                 |
| Workspace    | `GET /workspaces`, `PUT /workspaces/{id}`         | Настройки тарифа, валюты, задач                         |
| Клиенты      | `/workspaces/{wid}/clients`                       | CRUD по клиентам                                        |
| Проекты      | `/workspaces/{wid}/projects`                      | Привязаны к клиентам, могут быть приватными             |
| Задачи       | `/workspaces/{wid}/tasks`                         | Доступны в Premium workspace                            |
| Теги         | `/workspaces/{wid}/tags`                          | Свободные строки                                        |
| Time entries | `/time_entries`, `/workspaces/{wid}/time_entries` | Записи времени, фильтры по датам/проектам               |

### Пользователь (`/me`)

```typescript
const profile = await togglRequest({ ctx, apiToken, endpoint: '/me' })

return {
  fullname: profile.fullname,
  defaultWorkspaceId: profile.default_workspace_id,
  organizations: profile.organizations.map((org) => ({
    id: org.id,
    name: org.name,
    workspaces: org.workspaces.map((w) => ({ id: w.id, name: w.name }))
  }))
}
```

Используйте `/me` для health-check токена и отображения квот (`profile.api_token.quota_remaining`).

### Организации

```typescript
const organizations = await togglRequest({ ctx, apiToken, endpoint: '/organizations' })
await TogglOrganizations.upsertMany(ctx, organizations)
```

### Рабочие пространства

```typescript
const workspace = await togglRequest({ ctx, apiToken, endpoint: `/workspaces/${workspaceId}` })
await TogglWorkspaces.createOrUpdateBy(ctx, 'workspaceId', {
  workspaceId: workspace.id,
  name: workspace.name,
  isPremium: workspace.premium,
  admin: workspace.admin
})
```

### Клиенты

```typescript
await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/clients`,
  method: 'post',
  json: {
    name: 'ACME LLC',
    notes: '�������� �� Chatium'
  }
})
```

### Проекты

```typescript
await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/projects`,
  method: 'post',
  json: {
    name: '���������',
    client_id: clientId,
    is_private: true,
    billable: true,
    color: '#06AFEB'
  }
})
```

### Задачи

```typescript
await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/tasks`,
  method: 'post',
  json: {
    project_id: projectId,
    name: '������ � ��������',
    estimated_seconds: 1800
  }
})
```

### Теги

```typescript
const tags = await togglRequest({ ctx, apiToken, endpoint: `/workspaces/${workspaceId}/tags` })
```

### Записи времени и таймер

Чтение:

```typescript
const entries = await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/time_entries`,
  query: {
    start_date: startIso,
    end_date: endIso,
    updated_since: cursorIso,
    project_ids: projectIds.join(',')
  }
})
```

Создание:

```typescript
await togglRequest({
  ctx,
  apiToken,
  endpoint: '/time_entries',
  method: 'post',
  json: {
    workspace_id: workspaceId,
    project_id: projectId,
    task_id: taskId,
    start: new Date().toISOString(),
    duration: 3600,
    description: '���� ����������',
    created_with: 'chatium-app',
    tags: ['billed', 'retainer']
  }
})
```

Если запись активна, `duration` будет отрицательной (`-unixTimestamp`). Чтобы остановить таймер, отправьте `PATCH /time_entries/{id}` со значениями `stop` и положительным `duration`.

---

## Настройка интеграции в Chatium

### Конфигурация

| Поле                       | Где хранить                              |
| -------------------------- | ---------------------------------------- |
| `toggl.apiToken`           | `config.json` или `toggl_credentials`    |
| `toggl.defaultWorkspaceId` | `config.json`/Heap                       |
| `toggl.syncSchedule`       | `config.json` (например, каждые 5 минут) |

```typescript
import { readWorkspaceFile, updateWorkspaceFile } from '@app/config'

async function setTogglConfig(ctx, data) {
  const config = await readWorkspaceFile(ctx, 'config.json')
  config.toggl = { ...config.toggl, ...data }
  await updateWorkspaceFile(ctx, 'config.json', config)
}
```

### Таблицы Heap

```typescript
export const TogglWorkspaces = Heap.Table('toggl_workspaces', {
  workspaceId: Heap.Number({ indexed: true }),
  name: Heap.String(),
  isPremium: Heap.Boolean(),
  quotaRemaining: Heap.Number(),
  syncedAt: Heap.DateTime()
})

export const TogglProjects = Heap.Table('toggl_projects', {
  projectId: Heap.Number({ indexed: true }),
  workspaceId: Heap.Number(),
  clientId: Heap.Number(),
  name: Heap.String(),
  color: Heap.String(),
  billable: Heap.Boolean(),
  active: Heap.Boolean()
})

export const TogglTimeEntries = Heap.Table('toggl_time_entries', {
  entryId: Heap.String({ indexed: true }),
  workspaceId: Heap.Number(),
  projectId: Heap.Number(),
  userId: Heap.Number(),
  description: Heap.String(),
  duration: Heap.Number(),
  start: Heap.DateTime(),
  stop: Heap.DateTime(),
  tags: Heap.StringArray()
})
```

---

## Синхронизация и фоновые задачи

### Базовый job

```typescript
import { scheduleJobAfter, scheduleJobAsap } from '@app/jobs'

app.job('syncTogglTimeEntries').handler(async (ctx, { workspaceId }) => {
  const since = await getSyncCursor(ctx, workspaceId)

  const entries = await togglRequest({
    ctx,
    apiToken: await getApiToken(ctx),
    endpoint: `/workspaces/${workspaceId}/time_entries`,
    query: {
      start_date: since.toISOString(),
      end_date: new Date().toISOString()
    }
  })

  await upsertEntriesToHeap(ctx, workspaceId, entries)
  await saveSyncCursor(ctx, workspaceId, entries)
})

scheduleJobAfter(ctx, 5, 'minutes', 'syncTogglTimeEntries', { workspaceId })
```

### Инкрементальный импорт

```typescript
const entries = await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/time_entries`,
  query: {
    updated_since: cursorIso,
    user_ids: userIds.join(',')
  }
})
```

### Двухфазный импорт

1. `scanTogglProjects` ищет проекты, изменённые после курсора.
2. Для каждого проекта запускается `syncTogglProjectEntries`.

```typescript
app.job('scanTogglProjects').handler(async (ctx, { workspaceId }) => {
  const projects = await togglRequest({
    ctx,
    apiToken: await getApiToken(ctx),
    endpoint: `/workspaces/${workspaceId}/projects`,
    query: { updated_since: getProjectCursor(ctx, workspaceId) }
  })

  for (const project of projects) {
    await scheduleJobAsap(ctx, 'syncTogglProjectEntries', { workspaceId, projectId: project.id })
  }
})

app.job('syncTogglProjectEntries').handler(async (ctx, { workspaceId, projectId }) => {
  const entries = await safeTogglRequest({
    ctx,
    apiToken: await getApiToken(ctx),
    endpoint: `/workspaces/${workspaceId}/time_entries`,
    query: { project_ids: projectId, start_date: getWeekStartISO() }
  })
  await upsertEntriesToHeap(ctx, workspaceId, entries)
})
```

---

## Вебхуки

Документация: https://engineering.toggl.com/docs/webhooks_start/index.html.

### Подписка

```typescript
import { withProjectRoot } from '../config/routes'
import { apiTogglWebhookRoute } from '../api/toggl/webhook'

const webhookUrl = ctx.account.url(withProjectRoot(apiTogglWebhookRoute.url()))

await togglRequest({
  ctx,
  apiToken,
  endpoint: `/workspaces/${workspaceId}/webhooks`,
  method: 'post',
  json: {
    name: 'chatium-sync',
    url: webhookUrl,
    event_filters: [
      { entity: 'time_entry', action: 'created' },
      { entity: 'time_entry', action: 'updated' },
      { entity: 'time_entry', action: 'deleted' }
    ]
  }
})
```

**⚠️ ВАЖНО**: URL всегда относительный (`./`), домен не хардкодим. Если путь внутри файла не `'/'`, URL будет через `~` — избегайте.

### Валидация и обработка

```typescript
// api/toggl/webhook.ts — см. 005-jobs.md: объявление job через app.job(...) и вызов job.scheduleJobAsap(ctx, params)

const processTogglEventJob = app.job('/toggl/process-event', async (ctx, event: any) => {
  const { workspace_id, event_name, data } = event

  switch (event_name) {
    case 'time_entry.created':
    case 'time_entry.updated':
      await upsertTimeEntry(ctx, workspace_id, data.time_entry_id)
      break
    case 'time_entry.deleted':
      await deleteTimeEntry(ctx, data.time_entry_id)
      break
    default:
      ctx.account.log('Toggl webhook skipped', { level: 'info', json: { event_name } })
  }
})

export const apiTogglWebhookRoute = app.post('/', async (ctx, req) => {
  const requestId = req.headers['toggl-webhook-request-id']

  if (req.method === 'HEAD') {
    return ctx.resp
      .status(200)
      .header('Toggl-Webhook-Response-Id', String(requestId ?? ''))
      .body('')
  }

  const payload = req.body
  await processTogglEventJob.scheduleJobAsap(ctx, payload)

  return ctx.resp
    .status(200)
    .header('Toggl-Webhook-Response-Id', String(requestId ?? ''))
    .json({ ok: true })
})
```

Если три запроса подряд завершатся с ошибкой или превысят 5 секунд, Toggl отключит webhook. Храните `webhook_id`, статус и `lastPingAt` в таблице `toggl_webhook_subscriptions`.

---

## Квоты и rate limits

| Тип запроса                                           | Free   | Starter | Premium |
| ----------------------------------------------------- | ------ | ------- | ------- |
| Organization-specific (проекты, time entries, отчёты) | 30/час | 240/час | 600/час |
| User-specific (`/me`, личные данные)                  | 30/час | 30/час  | 30/час  |

Дополнительно действует leaky bucket (≈1 запрос/секунда). При превышении:

- `429 Too Many Requests` — подождите 1–5 секунд и повторите (до 3 раз).
- `402 Payment Required` — функция недоступна на тарифе (например, вебхуки); повторять нет смысла.
- Заголовки `X-Toggl-Quota-Remaining` и `X-Toggl-Quota-Resets-In` отображают остаток квоты и время сброса.

```typescript
async function safeTogglRequest(options: TogglRequestOptions, retry = 0) {
  try {
    return await togglRequest(options)
  } catch (error) {
    if (/429/.test(error.message) && retry < 3) {
      const delayMs = 1000 + Math.random() * 4000
      await delay(delayMs)
      return safeTogglRequest(options, retry + 1)
    }
    throw error
  }
}
```

---

## Отчёты и аналитика

Пока Reports API v3 не документирован, используйте time entries:

- агрегируйте данные в Heap (`countBy`, `sum`);
- создавайте таблицу `toggl_daily_summary` (workspace + date + seconds);
- экспортируйте в CSV через `ctx.res.csv`;
- для сложных отчётов выгружайте данные в ClickHouse (см. `016-analytics-*`).

```typescript
app.get('api/toggl/report').handler(async (ctx) => {
  await requireAccountRole(ctx, 'Admin')
  const { workspaceId, from, to } = ctx.req.query
  const rows = await TogglTimeEntries.findAll(ctx, {
    where: {
      workspaceId: Number(workspaceId),
      start: Heap.between(new Date(from), new Date(to))
    }
  })

  const grouped = rows.reduce(
    (acc, entry) => {
      const key = `${entry.projectId}:${entry.tags.sort().join(',')}`
      acc[key] = (acc[key] || 0) + entry.duration
      return acc
    },
    {} as Record<string, number>
  )

  return ctx.res.csv(
    Object.entries(grouped).map(([key, seconds]) => ({ bucket: key, hours: seconds / 3600 }))
  )
})
```

---

## Обработка ошибок и тестирование

| Код | Значение             | Действие                                  |
| --- | -------------------- | ----------------------------------------- |
| 400 | Некорректный payload | Проверить поля, тариф                     |
| 401 | Неверный токен       | Попросить пользователя обновить токен     |
| 402 | Функция недоступна   | Сообщить о необходимости апгрейда         |
| 404 | Сущность удалена     | Удалить запись из Heap, не ретраить       |
| 410 | Эндпоинт устарел     | Обновить интеграцию до v9                 |
| 429 | Rate limit           | `safeTogglRequest` или `scheduleJobAfter` |
| 5xx | Ошибка сервера       | Повторить через 1–5 секунд (до 3 раз)     |

**Тесты (см. `020-testing.md`):**

- `./lib/tests/api/toggl-client.test.ts` — мок `@app/request`, проверка заголовков и ошибок.
- `./lib/tests/api/toggl-sync.test.ts` — логика курсора `updated_since`.
- `./web/tests/ai.tsx` — сценарии настройки, проверки токена, запуска job.

---

## Лучшие практики

### Рекомендуется

- Хранить токен только на сервере, не прокидывать во Vue.
- Использовать `withProjectRoot(route.url())` + `ctx.account.url(...)` для webhook URL (см. `002-routing.md`).
- Логировать `Toggl-Webhook-Request-Id` вместе с телом события.
- Всегда задавать `created_with: "chatium-{project}"` при создании записи времени.
- Делить импорт на страницы по 50 элементов и вести курсор `updated_since`.
- Уведомлять админов через `sendNotificationToAccountOwners`, если sync падает.

### Избегайте

- Запускать запросы из Vue компонентов.
- Хранить данные Toggl в одном большом JSON без нормализации.
- Игнорировать 429/402 — это ведёт к блокировке токена.
- Обрабатывать webhook синхронно в HTTP-роуте (используйте job).

---

## Чек-листы

### Настройка интеграции

1. Создайте Vue-страницу настроек (API Token, Workspace).
2. Проверяйте роль через `requireAccountRole(ctx, "Admin")`.
3. Вызовите `/me`, покажите имя пользователя и список workspace.
4. Сохраните токен и workspace в `config` или Heap.
5. Создайте таблицы `toggl_workspaces`, `toggl_projects`, `toggl_time_entries`.
6. Запланируйте job `syncTogglTimeEntries` (например, каждые 5 минут).
7. Добавьте тесты (API + AI).

### Подключение вебхуков

1. Убедитесь, что workspace на Premium.
2. Создайте `app.post("api/togglWebhook")`.
3. Ответьте на `HEAD` запрос с заголовком `Toggl-Webhook-Response-Id`.
4. Сохраните `webhook_id`, статус, `lastPingAt`.
5. Отправляйте payload в job `processTogglEvent`.

### Отладка квот

1. Логируйте `X-Toggl-Quota-Remaining`.
2. Сохраняйте значение в `toggl_workspaces.quotaRemaining`.
3. Показывайте предупреждение в UI, если остаток < 10%.
4. При 402 сообщайте, что нужна подписка Starter/Premium.

---

## FAQ

**Можно ли подключить несколько токенов?**  
Да. Сохраняйте несколько записей в `toggl_credentials` и добавьте селектор аккаунта в UI.

**Как связать пользователей Toggl и Chatium?**  
Используйте email из time entry (`user_id` + `user_email`). Сохраняйте `togglUserId` в Heap таблице пользователей.

**Почему webhook отключился?**  
Toggl деактивирует подписку после трёх неудачных доставок или медленного ответа (>5 секунд). Проверяйте логи и запускайте повторную регистрацию.

**Можно ли получать отчёты без ClickHouse?**  
Да, агрегируйте данные в Heap или выгружайте CSV прямо из Chatium. Для больших объёмов используйте ClickHouse.

**Где смотреть логи интеграции?**  
На странице `https://{project-host}/s/dev/logs`. Если нужна авторизация, выполните команду `pause` и дождитесь подтверждения.

---

## Связанные документы

- `doc/knowledge/002-routing.md`
- `doc/knowledge/004-request.md`
- `doc/knowledge/005-jobs.md`
- `doc/knowledge/008-heap.md`
- `doc/knowledge/015-notifications.md`
- `doc/knowledge/020-testing.md`

---

## Версия

- **Версия документа:** 1.0
- **Дата обновления:** 2025-11-14
- **Источник:** https://engineering.toggl.com/docs/
