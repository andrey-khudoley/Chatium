# API

## Назначение

Контракт входов/выходов системы: страницы, JSON API и тестовые endpoints.

## Когда обновлять

- При добавлении/удалении маршрутов.
- При изменении параметров запросов или форматов ответов.
- При изменении требований по авторизации.

## Примечание о маршрутизации

В Chatium используется file‑based routing. Фактический URL формируется по пути файла. Ниже приведены **ожидаемые пути** для текущего шаблона. При переносе/переименовании файлов — обновить этот документ.

**⚠️ КРИТИЧЕСКИ ВАЖНО** (обновлено 2026-01-30):

**На серверной стороне:**

- ✅ Используйте **относительные пути**:
  - `./admin` - для файлов на том же уровне
  - `../profile` - для выхода на уровень вверх
- ❌ НЕ используйте `.url()` на сервере (вызывает циклические зависимости)
- ❌ **КРИТИЧЕСКАЯ ОШИБКА**: НЕ используйте абсолютные пути типа `'/admin'` - это путь от корня домена!
  - Если проект в `/p/gc/partnership/`, то `'/admin'` приведёт к `https://domain.com/admin`, а НЕ к `https://domain.com/p/gc/partnership/admin`!

**Пример структуры проекта:**

```
p/gc/partnership/
├── index.tsx    → /p/gc/partnership/
├── admin.tsx    → /p/gc/partnership/admin
├── profile.tsx  → /p/gc/partnership/profile
└── login.tsx    → /p/gc/partnership/login

// Из profile в login (на одном уровне)
ctx.resp.redirect('./login')  // ✅
```

**`.url()` используется ТОЛЬКО когда:**

1. Результат передаётся на **фронтенд** (в Vue компоненты, в JSON API)
2. Это **НЕ вызовет** циклических зависимостей

**При циклических зависимостях:**

- Используйте переменные из `/config/routes.ts` (см. ниже)
- ⚠️ **КРИТИЧЕСКАЯ ОШИБКА**: Хардкодить URL запрещено!

**Структура обязательного файла `/config/routes.ts`:**

```typescript
export const DOMAIN = 's.chtm.aley.pro'
export const PROJECT_ROOT = '/p/gc/partnership'
export const BASE_URL = `https://${DOMAIN}${PROJECT_ROOT}`

export const ROUTES = {
  index: '/',
  admin: '/admin',
  profile: '/profile',
  login: '/login'
  // ...
} as const

export function getFullUrl(path: string): string {
  return `${BASE_URL}${path}`
}
```

**Пример использования:**

```typescript
// admin.tsx
import { getFullUrl, ROUTES } from '../config/routes'

export const adminRoute = app.get('/', async (ctx) => {
  // ✅ Используем переменные, а не хардкод
  const indexUrl = getFullUrl(ROUTES.index)
  return ctx.resp.redirect(indexUrl)
})
```

**Для вызова API:**

- Используйте `route.run(ctx, data)`, а не `fetch()` (см. 002-routing.md)

## HTML‑страницы

| Метод | Путь       | Назначение       | Авторизация            |
| ----- | ---------- | ---------------- | ---------------------- |
| GET   | `/`        | Главная страница | Нет                    |
| GET   | `/login`   | Вход             | Нет                    |
| GET   | `/profile` | Профиль          | Требуется пользователь |
| GET   | `/admin`   | Админ‑панель     | Требуется роль Admin   |
| GET   | `/tests`   | UI для тестов    | Требуется пользователь |

## JSON API (основное)

### POST `/api/auth-telegram` (файл: `./api/auth-telegram.ts`)

- Назначение: получить Telegram OAuth URL.
- Тело запроса: `{ back?: string }`
- Ответ: `string` (oauthUrl)
- Ошибки: стандартные ошибки платформы.

### POST `/api/auth-password` (файл: `./api/auth-password.ts`)

- Назначение: получить хеш пароля (helper для формы входа).
- Тело запроса: `{ it: string, ik: string, pwd: string }`
- Ответ: `{ success: true, hash: string }`
- Ошибки: `{ success: false, error: string }` (missing params, auth not available, internal errors).

### GET `/api/admin-settings` (файл: `./api/admin-settings.ts`)

- Назначение: получить настройки проекта.
- Авторизация: роль Admin.
- Ответ: `{ success: true, settings: Record<string, any> }`
- Ошибки: `{ success: false, error: string }`

### POST `/api/admin-settings` (файл: `./api/admin-settings.ts`)

- Назначение: обновить настройки проекта.
- Авторизация: роль Admin.
- Тело запроса (частично):
  - `project_name?: string`
  - `project_title?: string`
  - `project_description?: string`
  - `log_level?: 'info' | 'warn' | 'error'`
- Ответ: `{ success: true, settings: Record<string, any> }`
- Ошибки: `{ success: false, error: string }`

### POST `/api/admin-logs` (файл: `./api/admin-logs.ts`)

- Назначение: получить логи с фильтрацией и пагинацией.
- Авторизация: роль Admin.
- Тело запроса:
  - `level?: 'info' | 'warn' | 'error'`
  - `limit?: number` (1..1000, default 50)
  - `offset?: number`
  - `before?: ISO string`
- Ответ: `{ success: true, logs: Log[], count: number, offset: number, limit: number }`
- Ошибки: `{ success: false, error: string }`

### GET `/api/admin-logs/counts` (файл: `./api/admin-logs.ts`)

- Назначение: счётчики логов по уровням.
- Авторизация: роль Admin.
- Ответ: `{ success: true, counts: {info, warn, error}, accumulatedCounts: {error, warn} }`

### POST `/api/admin-logs/reset-counters` (файл: `./api/admin-logs.ts`)

- Назначение: сброс счётчиков ошибок/предупреждений.
- Авторизация: роль Admin.
- Ответ: `{ success: true, message: string }`

### GET `/api/admin-logs/socket-id` (файл: `./api/admin-logs.ts`)

- Назначение: получить `encodedSocketId` для WebSocket подписки.
- Авторизация: роль Admin.
- Ответ: `{ success: true, encodedSocketId: string }`

### POST `/api/admin-logs/test-error` (файл: `./api/admin-logs.ts`)

- Назначение: создать тестовую ошибку.
- Авторизация: роль Admin.
- Ответ: `{ success: true, message: string }`

### POST `/api/admin-logs/test-warning` (файл: `./api/admin-logs.ts`)

- Назначение: создать тестовое предупреждение.
- Авторизация: роль Admin.
- Ответ: `{ success: true, message: string }`

### GET `/api/admin-logs/test-callbacks` (файл: `./api/admin-logs.ts`)

- Назначение: проверить, установлены ли callbacks логирования.
- Авторизация: роль Admin.
- Ответ: `{ success: true, status: { errorCallbackSet: boolean, warnCallbackSet: boolean } }`

## JSON API (тестовый контур)

> Используется для smoke‑проверки и встроенного тестового UI. Обычно не экспонируется внешним клиентам.

**⚠️ ВАЖНО**: Согласно стандартам Chatium (документация 020-testing.md), КАЖДЫЙ проект ОБЯЗАН иметь:

1. Папку `/tests/` с unit и интеграционными тестами
2. Интерактивную страницу `/tests` для разработчиков
3. JSON API `/tests/ai` для AI-агентов и автоматических проверок
4. Единый источник истины для всех тестов в `tests/shared/test-definitions.ts`

### GET `/tests/ai` (файл: `./tests/ai.tsx`)

- Назначение: запуск всех тестов, вернуть JSON‑результат.
- Авторизация: требуется пользователь (`requireAnyUser`).
- Формат ответа: JSON с результатами всех тестов (см. 020-testing.md).

### Базовый путь `tests/api/start-tests` (файл: `./tests/api/start-tests.ts`)

Соответствует 020-testing.md: единый список тестов, run-single для одного теста, run-all для всех.

- GET `/list`

  - Назначение: список всех тестов (единый источник истины с test-definitions.ts).
  - Ответ: `{ success: true, categories: TestCategory[] }`

- GET `/run-all`

  - Назначение: запуск всех тестов (для AI страницы и интерактивного UI).
  - Ответ: `{ success: true, results: TestResult[] }`

- POST `/run-single`

  - Назначение: запуск одного теста (для интерактивной страницы).
  - Тело запроса: `{ category: string, test: string }`
  - Ответ: `{ success: true, result: TestResult }`

- GET `/get-manual-socket-id`
  - Назначение: socketId для live‑логов тестов.
  - Ответ: `{ success: true, encodedSocketId: string, socketId: string }`

**Типы тестов** (согласно 020-testing.md):

- `database` — тесты работы с Heap таблицами
- `api_internal` — тесты внутренних API через `route.run()`
- `api_http` — тесты HTTP доступности endpoints через `request()`

## Важные ошибки и ответы

- `success: false` + `error` — основная форма ошибок для JSON API.
- Для admin‑маршрутов обязательно требование роли Admin (`requireAccountRole(ctx, 'Admin')`).

## Связанные документы платформы

- **002-routing.md** — Входящий роутинг, file-based архитектура, использование `.url()` и `.run()`
- **003-auth.md** — Авторизация и проверка прав (`requireAccountRole`, `requireRealUser`, `requireAnyUser`)
- **008-heap.md** — Работа с Heap таблицами (CRUD, фильтрация, поиск)
- **014-socket.md** — WebSocket для live-обновлений
- **020-testing.md** — Обязательная структура тестирования для всех проектов
