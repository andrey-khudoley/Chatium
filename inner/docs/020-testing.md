@chatium

# Unit и интеграционное тестирование в Chatium

Исчерпывающее руководство по созданию интерактивной страницы unit и интеграционного тестирования в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Контекст запроса (ctx) и варианты организации тестов](#контекст-запроса-ctx-и-варианты-организации-тестов)
- [Архитектура тестирования](#архитектура-тестирования)
- [Структура проекта](#структура-проекта)
- [Создание страницы тестов](#создание-страницы-тестов)
  - [HTML роут](#html-роут)
  - [Vue компонент](#vue-компонент)
- [API для серверных тестов](#api-для-серверных-тестов)
- [Авторизация в тестах](#авторизация-в-тестах)
- [Безопасность тестов](#безопасность-тестов)
- [Типы тестов](#типы-тестов)
  - [Тесты базы данных](#тесты-базы-данных)
  - [Тесты API](#тесты-api)
  - [Функциональные тесты](#функциональные-тесты)
  - [Интеграционные тесты](#интеграционные-тесты)
- [Структура данных тестов](#структура-данных-тестов)
- [Интерактивный UI](#интерактивный-ui)
- [Запуск тестов](#запуск-тестов)
- [Обработка результатов](#обработка-результатов)
- [Best Practices](#best-practices)
- [Примеры использования](#примеры-использования)

---

## Введение

**Unit и интеграционное тестирование в Chatium** — система интерактивных тестов, выполняемых прямо в браузере, с визуальным отображением результатов.

### Ключевые особенности

- 🎨 **Интерактивный UI** — вся информация отображается на странице
- 🔄 **Real-time обновления** — статусы тестов обновляются в реальном времени
- 📊 **Статистика** — общее количество, пройдено, провалено, время выполнения
- 🎯 **Гранулярный запуск** — можно запустить все тесты, категорию или один тест
- ❌ **Детальные ошибки** — stack trace отображается прямо на странице
- 🔌 **Серверные тесты** — тесты Heap выполняются через API

### Когда использовать

- ✅ Тестирование API endpoints
- ✅ Тестирование базы данных (Heap Tables)
- ✅ Функциональное тестирование компонентов
- ✅ Интеграционное тестирование полных потоков
- ✅ Проверка работы после рефакторинга
- ✅ Regression testing

**Важно**: Система тестирования опциональна. Добавляйте её по необходимости, но если используете — следуйте структуре и правилам ниже.

---

## Контекст запроса (ctx) и варианты организации тестов

### Реальный ctx, не «мок»

В Chatium **контекст запроса не подставляют вручную** как в Jest или Vitest: `ctx` формирует платформа при обработке HTTP-запроса к приложению. Формулировки вроде «смокнутый ctx с ролью Admin» для интерактивных тестов со страницы тестов **некорректны**: при открытии `./web/tests` и вызовах `fetch` с cookie пользователь и права — **реальные** (часто администратор аккаунта).

### Два распространённых контура

1. **Полный шаблон** — `shared/tests/test-definitions.ts`, `api/tests/run-tests/*`, `lib/tests/run-tests.ts`, опционально `./web/tests/ai`. Подробно — в разделах ниже по этому документу.
2. **Облегчённый** — каталог `api/tests/endpoints-check/` (один файл = один роут), реестр в `api/tests/list.ts`, UI на `pages/TestsPage.vue`: клиент вызывает GET/POST с `credentials: 'include'`, на сервер приходит **тот же** реальный `ctx`, что и у любого запроса к приложению. Внутри обработчика при необходимости вызывают целевой бизнес-роут через `otherRoute.run(ctx, …)` — **в том же** `ctx`, без сборки искусственного объекта контекста.

### `route.run` против полноценного HTTP к своему приложению

- **`otherRoute.run(ctx, reqLike)`** — быстрый способ проверить обработчик роута в том же `ctx`, без второго HTTP-раундтрипа и без зависимости от абсолютного URL и заголовков `Host`/`Origin`. Подходит для «юнитов» интеграции в смысле платформы (реальный `ctx`, не мок).
- **Исходящий HTTP** (`request()` из `@app/request` на полный URL своего UGC) — отдельный контур: проверяется, что маршрут доступен по HTTP так же, как для внешнего клиента (GetCourse, скрипты). Для сборки базового URL используют `origin`/`host` из входящего запроса к тестовому роуту или конфигурацию окружения. В документации по исходящему HTTP см. `004-request.md`; вызовы **внутри** одного приложения по возможности остаются на `route.run`, но **проверка «снаружи»** намеренно дублирует путь через HTTP.

### Юнит-проверки чистой логики

Проверки функций без внешней сети (слияние полей, валидация, маппинг DTO) выносят в `lib/*.ts` и отдельный тестовый GET/POST в `api/tests/endpoints-check/*`. Это не «подмена ctx» для предметной логики: контекст запроса всё равно настоящий; изолируется только **объём проверяемого кода** (вызов чистых функций и при необходимости чтение настроек через существующие API).

### Интеграционные проверки и UI

Независимые сценарии (несколько внешних систем, разные ключи Heap) удобно выносить в **отдельные эндпоинты** и **отдельные строки** на странице тестов — так видно, какая сторона упала. Объединённый «комбинированный» эндпоинт допустим для мониторинга или одного запроса из скрипта, но не обязателен для UI.

### Проектная документация

В корне приложения имеет смысл держать краткий `docs/testing.md` с описанием вкладок, эндпоинтов и того, что в **этом** проекте считается юнитом и интеграцией. Пример: `p/units/aom/lava_gc_integration/docs/testing.md`.

---

## Архитектура тестирования

**⚠️ ОЧЕНЬ ВАЖНО**:

- URL всегда **относительный**: используйте `./...` (итогово: `./${PROJECT_ROOT}/...`)
- Если путь внутри файла не `'/'`, URL будет через `~` — избегайте

### Компоненты системы

```
./web/tests/                          # Роуты тестовых страниц
├── index.tsx                        # Интерактивная страница (./web/tests)
└── ai.tsx                           # AI страница (./web/tests/ai) - JSON API

/pages/tests/
└── UnitTestsPage.vue                # Vue компонент с UI тестов

./api/tests/run-tests/                # API для выполнения тестов (1 файл = 1 роут)
├── list.ts                          # ./api/tests/run-tests/list
├── run-single.ts                    # ./api/tests/run-tests/run-single
└── run-all.ts                       # ./api/tests/run-tests/run-all

/shared/tests/
└── test-definitions.ts              # Единый источник истины - список всех тестов

/lib/tests/
└── run-tests.ts                     # Серверная логика выполнения тестов
```

### Единый источник истины

**⚠️ КРИТИЧЕСКИ ВАЖНО**: Все тесты определены в ОДНОМ месте - `shared/tests/test-definitions.ts`

Это гарантирует:

- ✅ Синхронизация между `./web/tests` и `./web/tests/ai`
- ✅ Одинаковое количество и порядок тестов
- ✅ Простота обновления (один файл для изменения)
- ✅ Нет дублирования кода

**Файл**: `shared/tests/test-definitions.ts`

```typescript
// @shared
export const TEST_CATEGORIES = [
  {
    name: 'database',
    title: 'Тесты базы данных (Heap Table)',
    icon: 'fa-database',
    tests: [
      { name: 'table_exists', description: 'Проверка существования таблицы' },
      { name: 'create_message', description: 'Создание нового сообщения' }
      // ... остальные тесты
    ]
  },
  {
    name: 'api',
    title: 'Тесты API endpoints',
    icon: 'fa-code',
    tests: [
      { name: 'get_agents_list', description: 'GET /chat/agents' }
      // ... остальные тесты
    ]
  }
  // ... другие категории
]
```

### Разделение ответственности

**Интерактивная страница (./web/tests):**

- Отображение UI тестов
- Запуск по кнопке
- Real-time статусы
- Детальные ошибки с UI
- Использует: `apiRunSingleTestRoute` - выполняет тесты по одному

**AI страница (./web/tests/ai):**

- Автоматический запуск всех тестов
- Возврат JSON
- Для AI-агентов и мониторинга
- Использует: `apiRunAllTestsRoute` - выполняет все тесты сразу

**API (`api/tests/run-tests/*`):**

- Выполнение тестов на сервере
- Доступ к Heap Tables
- Единая логика для обеих страниц
- Импортирует `TEST_CATEGORIES` из `shared/tests/test-definitions.ts`
- Тонкие обработчики, логика в `/lib/tests/`

### Поток выполнения

```
1. Пользователь нажимает кнопку "Запустить"
   ↓
2. Vue компонент меняет статус теста на "running"
   ↓
3. Вызывается функция теста:
   - Для API: route.run(ctx, params)
   - Для Heap: apiRunDatabaseTestRoute.run(ctx, { testName })
   ↓
4. Получение результата
   ↓
5. Обновление статуса:
   - "passed" (зеленый фон)
   - "failed" (красный фон, ошибка и stack trace)
   ↓
6. Обновление статистики
```

---

## Структура проекта

### Правильная организация тестов

```
project/
├── web/
│   └── tests/
│       ├── index.tsx             # Интерактивная страница → ./${PROJECT_ROOT}/web/tests
│       └── ai.tsx                # AI страница → ./${PROJECT_ROOT}/web/tests/ai
│
├── pages/
│   └── tests/
│       └── UnitTestsPage.vue     # Vue компонент для UI
│
├── api/
│   └── tests/
│       └── run-tests/
│           ├── list.ts           # ./${PROJECT_ROOT}/api/tests/run-tests/list
│           ├── run-single.ts     # ./${PROJECT_ROOT}/api/tests/run-tests/run-single
│           └── run-all.ts        # ./${PROJECT_ROOT}/api/tests/run-tests/run-all
│
├── shared/
│   └── tests/
│       └── test-definitions.ts   # ← ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ для всех тестов
│
├── lib/
│   └── tests/
│       └── run-tests.ts          # Серверная логика выполнения тестов
│
└── tables/
    └── [your_table].table.ts     # Тестируемые таблицы
```

### URL-адреса

- **Интерактивная страница**: `./${PROJECT_ROOT}/web/tests`
- **AI страница (JSON)**: `./${PROJECT_ROOT}/web/tests/ai`
- **API список тестов**: `./${PROJECT_ROOT}/api/tests/run-tests/list`
- **API выполнить один тест**: `./${PROJECT_ROOT}/api/tests/run-tests/run-single`
- **API выполнить все тесты**: `./${PROJECT_ROOT}/api/tests/run-tests/run-all`

**⚠️ ВАЖНО**: Для клиента формируйте пути через `withProjectRoot(route.url())` и `PROJECT_ROOT` из `/config/routes.tsx`. Домен не хардкодим.

### Важные замечания

**⚠️ Страницы тестов НЕ должны быть доступны из меню** - только для разработчиков и AI.

**⚠️ Все тесты определяются в ОДНОМ файле** - `shared/tests/test-definitions.ts`. Это гарантирует полную синхронизацию между интерактивной и AI страницами.

---

## Создание системы тестирования

### Шаг 1: Определение тестов (единый источник истины)

**Файл**: `shared/tests/test-definitions.ts`

```typescript
// @shared
// Единый источник истины для всех тестов проекта

export const TEST_CATEGORIES = [
  {
    name: 'database',
    title: 'Тесты базы данных (Heap Table)',
    icon: 'fa-database',
    tests: [
      { name: 'table_exists', description: 'Проверка существования таблицы' },
      { name: 'create_record', description: 'Создание новой записи' },
      { name: 'find_records', description: 'Поиск записей по фильтрам' },
      { name: 'update_record', description: 'Обновление записи' }
    ]
  },
  {
    name: 'api',
    title: 'Тесты API endpoints',
    icon: 'fa-code',
    tests: [
      { name: 'get_list', description: 'GET ./api/items/list' },
      { name: 'create_item', description: 'POST ./api/items/create' }
    ]
  },
  {
    name: 'functional',
    title: 'Функциональные тесты',
    icon: 'fa-cogs',
    tests: [
      { name: 'key_generation', description: 'Генерация ключей' },
      { name: 'validation', description: 'Валидация данных' }
    ]
  },
  {
    name: 'integration',
    title: 'Интеграционные тесты',
    icon: 'fa-network-wired',
    tests: [
      { name: 'full_flow', description: 'Полный цикл работы' },
      { name: 'data_isolation', description: 'Изоляция данных пользователей' }
    ]
  }
]
```

**Ключевые моменты**:

- ✅ Один файл для ВСЕХ тестов проекта
- ✅ Используется и в `./web/tests` (интерактивная), и в `./web/tests/ai` (JSON)
- ✅ Изменения в одном месте отражаются везде
- ✅ Комментарий `// @shared` для доступа с клиента

### Шаг 2: Создание универсального API

Файлы (один файл = один роут):

- `api/tests/run-tests/list.ts`
- `api/tests/run-tests/run-single.ts`
- `api/tests/run-tests/run-all.ts`

**Пример (run-single)**:

```typescript
// api/tests/run-tests/run-single.ts
// @shared-route
import { requireAnyUser } from '@app/auth'
import { runSingleTest } from '../../../lib/tests/run-tests'

export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const { category, testName } = req.body
  const startTime = Date.now()

  await runSingleTest(ctx, category, testName)

  return {
    success: true,
    duration: Date.now() - startTime
  }
})
```

**Пример (list)**:

```typescript
// api/tests/run-tests/list.ts
// @shared-route
import { TEST_CATEGORIES } from '../../../shared/tests/test-definitions'

export const apiGetTestsListRoute = app.get('/', async () => {
  return {
    success: true,
    categories: TEST_CATEGORIES
  }
})
```

Все обработчики в `./api/` должны быть тонкими: основная логика выполнения тестов находится в `./lib/tests/`.

### Шаг 3: Интерактивная страница

**Файл**: `web/tests/index.tsx`

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import UnitTestsPage from '../../pages/tests/UnitTestsPage.vue'
import { tailwindScript, cssVariables, commonStyles, preloaderStyles } from '../../styles'

export const testsPageRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Unit Tests - Название проекта</title>
        {/* TailwindCSS, FontAwesome, стили */}
      </head>
      <body>
        {/* Прелоадер */}
        <UnitTestsPage />
      </body>
    </html>
  )
})

export default testsPageRoute
```

### Шаг 4: AI страница (JSON)

**Файл**: `web/tests/ai.tsx`

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import { apiRunAllTestsRoute } from '../.../api/tests/run-tests/run-all'

export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  // Вызываем API который выполнит все тесты
  const result = await apiRunAllTestsRoute.run(ctx)

  // Возвращаем JSON как HTML
  return (
    <html>
      <head>
        <title>Unit-AI Tests</title>
        <meta charset="UTF-8" />
        <style>{`
          body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        `}</style>
      </head>
      <body>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </body>
    </html>
  )
})

export default testsAiPageRoute
```

### Шаг 5: Vue компонент

**Файл**: `pages/tests/UnitTestsPage.vue`

```vue
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { apiGetTestsListRoute } from '../api/tests/run-tests/list'
import { apiRunSingleTestRoute } from '../api/tests/run-tests/run-single'

const testCategories = ref([])
const running = ref(false)
const testsCompleted = ref(false)

// Загружаем список тестов при монтировании
onMounted(async () => {
  const result = await apiGetTestsListRoute.run(ctx)
  if (result.success) {
    testCategories.value = result.categories.map((cat) => ({
      ...cat,
      tests: cat.tests.map((t) => ({
        ...t,
        status: 'pending',
        error: '',
        details: '',
        duration: 0
      }))
    }))
  }
})

// Выполнить один тест
async function runTest(categoryName, testName) {
  const category = testCategories.value.find((c) => c.name === categoryName)
  const test = category.tests.find((t) => t.name === testName)

  test.status = 'running'
  const startTime = Date.now()

  try {
    const result = await apiRunSingleTestRoute.run(ctx, {
      category: categoryName,
      testName
    })

    test.status = result.success ? 'passed' : 'failed'
    test.error = result.error || ''
    test.details = result.stack || ''
  } catch (error) {
    test.status = 'failed'
    test.error = error.message
  }

  test.duration = Date.now() - startTime
}
</script>
```

**⚠️ КРИТИЧЕСКИ ВАЖНО**: Vue компонент НЕ импортирует таблицы Heap напрямую! Все тесты выполняются через API.

---

## Преимущества единого источника истины

### Синхронизация между ./web/tests и ./web/tests/ai

**Проблема (старый подход)**:

```
web/tests/index.tsx → 20 тестов (определены в Vue компоненте)
web/tests/ai.tsx → 13 тестов (определены в отдельном файле)
```

❌ Рассинхрон, дублирование, сложность поддержки

**Решение (новый подход)**:

```
shared/tests/test-definitions.ts → 20 тестов (ЕДИНЫЙ источник)
  ↓
web/tests/index.tsx → использует TEST_CATEGORIES
web/tests/ai.tsx → использует TEST_CATEGORIES
api/tests/run-tests/* → использует TEST_CATEGORIES
pages/tests/UnitTestsPage.vue → загружает через API
```

✅ Полная синхронизация, одно место для изменений

### Как добавить новый тест

**Шаг 1**: Добавьте тест в `shared/tests/test-definitions.ts`:

```typescript
{
  name: 'api',
  tests: [
    // ... существующие тесты
    { name: 'new_endpoint', description: 'POST ./api/new-endpoint' }  // ← Новый тест
  ]
}
```

**Шаг 2**: Добавьте реализацию в `lib/tests/run-tests.ts`:

```typescript
async function runApiTest(ctx: any, testName: string) {
  switch (testName) {
    // ... существующие тесты

    case 'new_endpoint': // ← Реализация нового теста
      const result = await apiNewEndpointRoute.run(ctx, { data: 'test' })
      if (!result.success) throw new Error('Endpoint не работает')
      break
  }
}
```

**Шаг 3**: Готово! Тест автоматически появится:

- ✅ На интерактивной странице `./web/tests`
- ✅ На AI странице `./web/tests/ai`
- ✅ В обоих с одинаковым описанием и поведением

---

## API для тестов

### Структура API

Файлы (один файл = один роут):

1. `api/tests/run-tests/list.ts` → **GET `./api/tests/run-tests/list`**
2. `api/tests/run-tests/run-single.ts` → **POST `./api/tests/run-tests/run-single`**
3. `api/tests/run-tests/run-all.ts` → **GET `./api/tests/run-tests/run-all`**

### Реализация тестов

```typescript
// api/tests/run-tests/run-single.ts
// @shared-route
import { requireAnyUser } from '@app/auth'
import YourTable from '../../../tables/your.table'

export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)

    const { testName } = req.body
    const startTime = Date.now()
    let result: any = {}

    switch (testName) {
      case 'table_exists':
        if (!YourTable) {
          throw new Error('Таблица не найдена')
        }
        result.message = 'Таблица успешно загружена'
        break

      case 'create_record':
        const record = await YourTable.create(ctx, {
          field1: 'test value',
          field2: 123
        })

        if (!record || !record.id) {
          throw new Error('Запись не создана')
        }
        result.message = `Запись создана с ID: ${record.id}`
        break

      case 'find_records':
        const records = await YourTable.findAll(ctx, {
          where: { field1: 'test value' }
        })

        if (!records || records.length === 0) {
          throw new Error('Записи не найдены')
        }
        result.message = `Найдено записей: ${records.length}`
        break

      case 'update_record':
        const testRecord = await YourTable.create(ctx, {
          field1: 'original',
          field2: 100
        })

        const updated = await YourTable.update(ctx, {
          id: testRecord.id,
          field1: 'updated'
        })

        if (updated.field1 !== 'updated') {
          throw new Error('Поле не обновлено')
        }
        result.message = 'Запись успешно обновлена'
        break

      default:
        throw new Error(`Неизвестный тест: ${testName}`)
    }

    return {
      success: true,
      message: result.message,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: error.stack || ''
    }
  }
})
```

**Ключевые моменты**:

- ✅ Файл `api/tests/run-tests/run-single.ts` → роут определяется как `app.post('/')`
- ✅ URL будет `./${PROJECT_ROOT}/api/tests/run-tests/run-single`
- ✅ Возвращайте `{ success, message, duration }` или `{ success: false, error, details }`
- ✅ Оборачивайте все в try-catch
- ✅ Используйте `requireAnyUser(ctx)` для авторизации

---

## Авторизация в тестах

### Проблема с авторизацией при внутренних вызовах

**⚠️ КРИТИЧЕСКИ ВАЖНО**: Когда вы тестируете API endpoints через внутренние вызовы `route.run(ctx, params)`, вы можете столкнуться с проблемами авторизации.

**Проблема**:

```typescript
// В вашем API endpoint
export const apiGetItemsRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx) // ← Требует авторизованного пользователя

  const items = await ItemsTable.findAll(ctx)
  return { success: true, items }
})

// В тестах
async function runApiTest(testName: string) {
  switch (testName) {
    case 'get_items':
      // ВНУТРЕННИЙ вызов route.run() может УПАСТЬ из-за requireAnyUser!
      const result = await apiGetItemsRoute.run(ctx)
      // ❌ Ошибка: "User is required"
      break
  }
}
```

**Почему это происходит?**

При внутренних вызовах через `route.run()` контекст (`ctx`) может не содержать полной информации о пользователе, что приводит к ошибкам авторизации, даже если вы авторизованы на странице `./web/tests`.

### Решение: Разделение логики авторизации

**Подход 1: Убрать авторизацию из тестируемых endpoints для внутренних вызовов** ❌

Это ПЛОХОЕ решение, так как снижает безопасность.

**Подход 2: Проверять источник вызова** ⚠️

```typescript
export const apiGetItemsRoute = app.get('/', async (ctx, req) => {
  // Проверяем только если это НЕ внутренний вызов
  if (req.headers && req.headers['user-agent']) {
    requireAnyUser(ctx)
  }

  const items = await ItemsTable.findAll(ctx)
  return { success: true, items }
})
```

Это работает, но не очень чисто.

**Подход 3: Отдельные роуты для тестов** ✅ **РЕКОМЕНДУЕТСЯ**

Создайте отдельные API endpoints специально для тестов, которые не требуют авторизации:

```typescript
// api/items.ts - Основной API с авторизацией
export const apiGetItemsRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx) // Авторизация для внешних вызовов

  const items = await ItemsTable.findAll(ctx)
  return { success: true, items }
})

// api/tests/run-tests/run-single.ts - API для тестов БЕЗ авторизации
export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  // requireAnyUser(ctx) - НЕ проверяем авторизацию здесь!
  // Тесты выполняются через страницу ./web/tests, которая уже защищена

  const { category, testName } = req.body

  // Здесь мы делаем ВНУТРЕННИЕ вызовы к реальным API
  // Эти вызовы НЕ должны блокироваться авторизацией
  switch (testName) {
    case 'get_items':
      // Вызываем РЕАЛЬНУЮ логику, обходя авторизацию
      const items = await ItemsTable.findAll(ctx)
      if (!items || items.length === 0) {
        throw new Error('Элементы не найдены')
      }
      break
  }

  return { success: true }
})
```

**Подход 4: Вызывать бизнес-логику напрямую, минуя API роуты** ✅ **ЛУЧШЕЕ РЕШЕНИЕ**

```typescript
// lib/tests/run-tests.ts
async function runApiTest(ctx: any, testName: string) {
  switch (testName) {
    case 'get_items':
      // ✅ Вызываем таблицу НАПРЯМУЮ, минуя API endpoint с авторизацией
      const items = await ItemsTable.findAll(ctx)

      if (!items || items.length === 0) {
        throw new Error('Элементы не найдены')
      }
      break

    case 'create_item':
      // ✅ Создаём запись НАПРЯМУЮ через таблицу
      const item = await ItemsTable.create(ctx, {
        name: 'Test Item',
        value: 123
      })

      if (!item || !item.id) {
        throw new Error('Элемент не создан')
      }
      break
  }
}
```

### Рекомендованная структура

**Для тестов БЕЗ авторизации внутри тестового API**:

```typescript
// api/tests/run-tests/run-single.ts
export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  try {
    // ❌ НЕ добавляем requireAnyUser(ctx) здесь!
    // Страница ./web/tests уже защищена авторизацией

    const { category, testName } = req.body
    const startTime = Date.now()

    await executeTest(ctx, category, testName)

    return {
      success: true,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack || ''
    }
  }
})
```

**Защита страницы тестов на уровне HTML роута**:

```typescript
// web/tests/index.tsx
import { requireAnyUser } from '@app/auth'

export const testsPageRoute = app.html('/', async (ctx, req) => {
  // ✅ Авторизация на уровне СТРАНИЦЫ, а не API endpoints
  requireAnyUser(ctx)

  return (
    <html>
      {/* ... */}
    </html>
  )
})
```

### Когда использовать авторизацию

**✅ Используйте `requireAnyUser(ctx)` в:**

1. **HTML роутах страниц тестов** (`web/tests/index.tsx`, `web/tests/ai.tsx`)

   ```typescript
   export const testsPageRoute = app.html('/', async (ctx, req) => {
     requireAnyUser(ctx)  // ✅ Защищаем всю страницу
     return <html>...</html>
   })
   ```

2. **Публичных API endpoints** (не для тестов)
   ```typescript
   export const apiGetItemsRoute = app.get('/', async (ctx, req) => {
     requireAnyUser(ctx) // ✅ Защищаем публичный API
     const items = await ItemsTable.findAll(ctx)
     return { success: true, items }
   })
   ```

**❌ НЕ используйте `requireAnyUser(ctx)` в:**

1. **API endpoints для тестов** (`api/tests/run-tests/*`)

   ```typescript
   export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
     // ❌ НЕ добавляем requireAnyUser здесь
     // Страница ./web/tests уже защищена
   })
   ```

2. **Внутренних функциях тестов**
   ```typescript
   async function runDatabaseTest(ctx: any, testName: string) {
     // ❌ НЕ проверяем авторизацию здесь
     switch (testName) {
       case 'create_record':
         const record = await YourTable.create(ctx, { ... })
         break
     }
   }
   ```

### Принцип: Защита на уровне страницы, свобода на уровне тестов

**Правильная архитектура**:

```
1. Пользователь открывает ./web/tests
   ↓
2. testsPageRoute проверяет requireAnyUser(ctx) ✅
   ↓
3. Если авторизован → отображается страница
   ↓
4. Пользователь запускает тест
   ↓
5. Vue вызывает apiRunSingleTestRoute.run(ctx, { testName })
   ↓
6. apiRunSingleTestRoute БЕЗ авторизации (уже проверено на шаге 2)
   ↓
7. Тест вызывает таблицы/API НАПРЯМУЮ, минуя авторизацию
   ↓
8. Возврат результата
```

**Почему это безопасно?**

- ✅ Страница `./web/tests` защищена авторизацией — неавторизованные пользователи не попадут
- ✅ API endpoints `./api/tests/run-tests/*` доступны только с авторизованной страницы
- ✅ Внутренние вызовы `route.run()` не блокируются лишними проверками
- ✅ Безопасность + удобство тестирования

### Пример полной реализации

**Файл**: `web/tests/index.tsx` (с авторизацией)

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import { requireAnyUser } from '@app/auth'
import UnitTestsPage from '../../pages/tests/UnitTestsPage.vue'

export const testsPageRoute = app.html('/', async (ctx, req) => {
  // ✅ Защищаем страницу авторизацией
  requireAnyUser(ctx)

  return (
    <html>
      <head>
        <title>Unit Tests</title>
      </head>
      <body>
        <UnitTestsPage />
      </body>
    </html>
  )
})

export default testsPageRoute
```

**Файл**: `api/tests/run-tests/run-single.ts` (БЕЗ авторизации)

```typescript
// @shared-route
import { TEST_CATEGORIES } from '../../../shared/tests/test-definitions'
import YourTable from '../../../tables/your.table'

// ❌ НЕ импортируем requireAnyUser!

export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  try {
    // ❌ НЕ проверяем авторизацию
    // Страница ./web/tests уже защищена

    const { category, testName } = req.body
    const startTime = Date.now()

    // Вызываем тесты НАПРЯМУЮ
    await executeTest(ctx, category, testName)

    return {
      success: true,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack || ''
    }
  }
})

async function executeTest(ctx: any, category: string, testName: string) {
  switch (category) {
    case 'database':
      await runDatabaseTest(ctx, testName)
      break
    case 'api':
      await runApiTest(ctx, testName)
      break
  }
}

// Тесты вызывают таблицы НАПРЯМУЮ, без авторизации
async function runDatabaseTest(ctx: any, testName: string) {
  switch (testName) {
    case 'create_record':
      // ✅ Прямой вызов таблицы, без авторизации
      const record = await YourTable.create(ctx, {
        field1: 'test',
        field2: 123
      })

      if (!record || !record.id) {
        throw new Error('Запись не создана')
      }
      break
  }
}

export default apiRunSingleTestRoute
```

---

## Безопасность тестов

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Защита от инъекций

**Принцип безопасности**: Клиент передаёт ТОЛЬКО команду на запуск теста. ВСЯ логика и данные должны быть на сервере.

**Проблема - уязвимость к инъекциям**:

```typescript
// ❌ ОПАСНО - клиент передаёт параметры теста
// Vue компонент
async function runTest() {
  const result = await apiRunOrderTestRoute.run(ctx, {
    testName: 'get_order',
    orderId: '12345' // ← Клиент передаёт ID заказа!
  })
}

// API endpoint
export const apiRunOrderTestRoute = app.post('/run-test', async (ctx, req) => {
  const { testName, orderId } = req.body

  // ❌ УЯЗВИМОСТЬ! Злоумышленник может передать любой orderId
  const order = await OrdersTable.findById(ctx, orderId)
  // Может получить доступ к чужим заказам!
})
```

**Атака**:

```javascript
// Злоумышленник в консоли браузера:
apiRunOrderTestRoute.run(ctx, {
  testName: 'get_order',
  orderId: 'другого-пользователя-12345' // ← Инъекция!
})
// Получает доступ к чужим данным!
```

### Правильная архитектура - безопасность

**✅ ПРАВИЛЬНО - клиент передаёт только имя теста**:

```typescript
// ✅ БЕЗОПАСНО - Vue компонент
async function runTest(categoryName, testName) {
  const result = await apiRunSingleTestRoute.run(ctx, {
    category: categoryName, // ← Только имя категории
    testName: testName // ← Только имя теста
  })
  // Никаких параметров от клиента!
}

// ✅ БЕЗОПАСНО - API endpoint
export const apiRunSingleTestRoute = app.post('/run-single', async (ctx, req) => {
  const { category, testName } = req.body

  // Имена тестов - это ФИКСИРОВАННЫЕ значения из кода
  switch (testName) {
    case 'get_order':
      // ✅ ВСЕ параметры генерируются на СЕРВЕРЕ
      const testOrderId = 'test-order-' + Date.now()

      // Создаём тестовый заказ
      const testOrder = await OrdersTable.create(ctx, {
        id: testOrderId,
        userId: ctx.user.id, // ← Берём из контекста сервера
        amount: 100,
        status: 'pending'
      })

      // Проверяем, что можем его найти
      const foundOrder = await OrdersTable.findById(ctx, testOrderId)

      if (!foundOrder || foundOrder.id !== testOrderId) {
        throw new Error('Заказ не найден')
      }

      // Удаляем тестовый заказ
      await OrdersTable.delete(ctx, testOrderId)
      break

    case 'user_isolation':
      // ✅ Тест изоляции данных пользователей
      // Создаём заказ текущего пользователя
      const myOrder = await OrdersTable.create(ctx, {
        userId: ctx.user.id, // ← Текущий пользователь из ctx
        amount: 100
      })

      // Проверяем, что видим только свои заказы
      const myOrders = await OrdersTable.findAll(ctx, {
        where: { userId: ctx.user.id }
      })

      // Все найденные заказы должны принадлежать текущему пользователю
      for (const order of myOrders) {
        if (order.userId !== ctx.user.id) {
          throw new Error('Нарушена изоляция: найден чужой заказ!')
        }
      }
      break
  }

  return { success: true }
})
```

### Ключевые правила безопасности

**✅ ЧТО МОЖНО передавать от клиента:**

1. **Имя категории теста** (из фиксированного списка):

   ```typescript
   category: 'database' | 'api' | 'functional' | 'integration'
   ```

2. **Имя теста** (из фиксированного списка):

   ```typescript
   testName: 'create_order' | 'get_order' | 'user_isolation'
   ```

3. **Флаги выполнения** (опционально):
   ```typescript
   verbose: boolean // Детальный вывод
   cleanup: boolean // Очистить тестовые данные после теста
   ```

**❌ ЧТО НЕЛЬЗЯ передавать от клиента:**

1. ❌ ID записей для чтения/изменения
2. ❌ SQL запросы или части запросов
3. ❌ Пути к таблицам
4. ❌ User ID других пользователей
5. ❌ Любые параметры, которые влияют на бизнес-логику
6. ❌ Параметры фильтрации данных

### Примеры безопасных тестов

**✅ Тест 1: Создание и проверка заказа**

```typescript
case 'create_and_verify_order':
  // Генерируем данные на СЕРВЕРЕ
  const orderId = 'test-order-' + Date.now()
  const userId = ctx.user.id  // Из контекста сервера

  // Создаём
  const order = await OrdersTable.create(ctx, {
    id: orderId,
    userId: userId,
    amount: 100,
    items: ['item1', 'item2']
  })

  // Проверяем
  const found = await OrdersTable.findById(ctx, orderId)
  if (!found) throw new Error('Заказ не создан')

  // Очищаем
  await OrdersTable.delete(ctx, orderId)
  break
```

**✅ Тест 2: Проверка доступа к данным**

```typescript
case 'access_control':
  // Создаём заказ текущего пользователя
  const myOrder = await OrdersTable.create(ctx, {
    userId: ctx.user.id,  // ← Из контекста
    amount: 100
  })

  // Пытаемся получить через API
  const result = await apiGetOrderRoute.run(ctx, {
    orderId: myOrder.id
  })

  // ✅ Должны получить свой заказ
  if (!result.success) throw new Error('Не удалось получить заказ')
  if (result.order.userId !== ctx.user.id) {
    throw new Error('Получен чужой заказ!')
  }

  // Очищаем
  await OrdersTable.delete(ctx, myOrder.id)
  break
```

**✅ Тест 3: Изоляция пользователей**

```typescript
case 'user_isolation':
  const currentUserId = ctx.user.id

  // Создаём тестовые заказы
  const order1 = await OrdersTable.create(ctx, {
    userId: currentUserId,
    amount: 100
  })

  const order2 = await OrdersTable.create(ctx, {
    userId: currentUserId,
    amount: 200
  })

  // Получаем все заказы пользователя
  const userOrders = await OrdersTable.findAll(ctx, {
    where: { userId: currentUserId }
  })

  // Проверяем изоляцию
  for (const order of userOrders) {
    if (order.userId !== currentUserId) {
      throw new Error(`Нарушена изоляция: найден заказ пользователя ${order.userId}`)
    }
  }

  // Очищаем
  await OrdersTable.delete(ctx, order1.id)
  await OrdersTable.delete(ctx, order2.id)
  break
```

### Антипаттерны - чего избегать

**❌ НЕ делайте так:**

```typescript
// ❌ ОПАСНО - принимаем userId от клиента
export const apiRunTestRoute = app.post('/run-test', async (ctx, req) => {
  const { testName, userId, orderId } = req.body

  // Любой может передать любой userId!
  const orders = await OrdersTable.findAll(ctx, {
    where: { userId: userId } // ← Инъекция!
  })
})

// ❌ ОПАСНО - принимаем SQL условия от клиента
export const apiRunTestRoute = app.post('/run-test', async (ctx, req) => {
  const { testName, whereCondition } = req.body

  // Клиент может передать любые условия!
  const items = await ItemsTable.findAll(ctx, {
    where: whereCondition // ← SQL инъекция!
  })
})

// ❌ ОПАСНО - принимаем имя таблицы от клиента
export const apiRunTestRoute = app.post('/run-test', async (ctx, req) => {
  const { testName, tableName } = req.body

  // Клиент может указать любую таблицу!
  const table = tables[tableName] // ← Небезопасно!
  const data = await table.findAll(ctx)
})

// ❌ ОПАСНО - принимаем параметры фильтрации от клиента
export const apiRunTestRoute = app.post('/run-test', async (ctx, req) => {
  const { testName, filters } = req.body

  // Клиент может передать любые фильтры!
  const items = await ItemsTable.findAll(ctx, {
    where: filters // ← Может получить чужие данные!
  })
})
```

### Валидация входных данных

**✅ ПРАВИЛЬНО - строгая валидация**:

```typescript
export const apiRunSingleTestRoute = app.post('/run-single', async (ctx, req) => {
  const { category, testName } = req.body

  // ✅ Валидация категории
  const validCategories = ['database', 'api', 'functional', 'integration']
  if (!validCategories.includes(category)) {
    return {
      success: false,
      error: `Недопустимая категория: ${category}`
    }
  }

  // ✅ Валидация имени теста (проверяем через TEST_CATEGORIES)
  const categoryDef = TEST_CATEGORIES.find((c) => c.name === category)
  if (!categoryDef) {
    return {
      success: false,
      error: `Категория не найдена: ${category}`
    }
  }

  const testDef = categoryDef.tests.find((t) => t.name === testName)
  if (!testDef) {
    return {
      success: false,
      error: `Тест не найден: ${testName}`
    }
  }

  // ✅ Теперь безопасно выполняем тест
  try {
    await executeTest(ctx, category, testName)
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
})
```

### Принцип: Не доверяй клиенту

**Золотое правило безопасности тестов**:

> 🔒 **Клиент говорит "ЧТО" запустить (имя теста), сервер решает "КАК" это сделать и "С КАКИМИ ДАННЫМИ"**

**Схема безопасного взаимодействия**:

```
┌─────────────┐                           ┌──────────────┐
│   Клиент    │                           │   Сервер     │
│  (браузер)  │                           │              │
└─────────────┘                           └──────────────┘
      │                                           │
      │  POST ./api/tests/run-tests/run-single              │
      │  { testName: "create_order" }            │
      │─────────────────────────────────────────>│
      │                                           │
      │                                           │ ✅ Валидирует testName
      │                                           │ ✅ Генерирует данные
      │                                           │ ✅ Выполняет тест
      │                                           │ ✅ Очищает данные
      │                                           │
      │  { success: true, duration: 123 }        │
      │<─────────────────────────────────────────│
      │                                           │
```

**НЕ так**:

```
┌─────────────┐                           ┌──────────────┐
│   Клиент    │                           │   Сервер     │
│  (браузер)  │                           │              │
└─────────────┘                           └──────────────┘
      │                                           │
      │  POST ./api/tests/run-tests/run-single              │
      │  { testName: "get_order",                │
      │    orderId: "ЧУЖОЙ-ЗАКАЗ-123" }  ❌      │
      │─────────────────────────────────────────>│
      │                                           │
      │                                           │ ❌ Использует orderId
      │                                           │    от клиента!
      │                                           │
      │  { success: true, order: {...} }  🔓     │
      │  Утечка чужих данных!                    │
      │<─────────────────────────────────────────│
```

### Чек-лист безопасности тестов

Перед запуском тестов в продакшн проверьте:

- [ ] ✅ Клиент передаёт только имя категории и имя теста
- [ ] ✅ Все ID, параметры и данные генерируются на сервере
- [ ] ✅ Используется `ctx.user.id` из контекста сервера, а не от клиента
- [ ] ✅ Входные данные валидируются (category, testName)
- [ ] ✅ Тесты используют изолированные тестовые данные
- [ ] ✅ Тестовые данные очищаются после выполнения
- [ ] ✅ Тесты не могут получить доступ к чужим данным
- [ ] ❌ Клиент НЕ передаёт ID записей
- [ ] ❌ Клиент НЕ передаёт SQL условия или фильтры
- [ ] ❌ Клиент НЕ передаёт пути к таблицам
- [ ] ❌ Тесты НЕ используют реальные продакшн данные

---

## Типы тестов

### Тесты базы данных

**Что тестировать**:

- Существование таблицы
- Создание записей (create)
- Поиск записей (findAll, findById, findOneBy)
- Обновление записей (update)
- Удаление записей (delete)
- Фильтрация (where)
- Сортировка (order)

**Пример теста**:

```typescript
// В lib/tests/run-tests.ts
case 'create_and_find':
  const created = await YourTable.create(ctx, {
    name: 'Test Item',
    value: 42
  })

  const found = await YourTable.findById(ctx, created.id)

  if (!found || found.name !== 'Test Item') {
    throw new Error('Запись не найдена или поля не совпадают')
  }

  result.message = 'Запись создана и найдена успешно'
  break
```

**В Vue компоненте**:

```javascript
async function runDatabaseTest(testName, test) {
  const result = await apiRunDatabaseTestRoute.run(ctx, { testName })

  if (!result.success) {
    throw new Error(result.error || 'Тест провален')
  }

  test.message = result.message
}
```

### Тесты API

**⚠️ ВАЖНО**: Тестируйте API двумя способами!

**1. Внутренние вызовы (route.run)** - тестируют бизнес-логику:

```javascript
const result = await apiYourRoute.run(ctx, params)
```

**2. HTTP запросы (request)** - тестируют доступность endpoints:

```javascript
const response = await request({
  url: `${baseUrl}/api/your-endpoint`,
  method: 'get'
})
```

**Зачем тестировать через HTTP?**

- ✅ Проверка доступности endpoint (не "упал" ли фронт)
- ✅ Проверка роутинга (правильно ли маппятся URL)
- ✅ Проверка HTTP статусов (200, 404, 500)
- ✅ Проверка CORS и заголовков
- ✅ Полный стек от HTTP до бизнес-логики

**Что тестировать**:

- ✅ GET endpoints (route.run + HTTP request)
- ✅ POST endpoints (route.run + HTTP request)
- ✅ Корректность возвращаемых данных
- ✅ Обработка ошибок
- ✅ Авторизация
- ✅ HTTP статусы

**Пример теста (внутренний вызов)**:

```javascript
async function runApiTest(testName, test) {
  switch (testName) {
    case 'get_items_list':
      const result = await apiGetItemsRoute.run(ctx)

      if (!result.success) {
        throw new Error(result.error || 'API вернул success=false')
      }

      if (!Array.isArray(result.items)) {
        throw new Error('items не является массивом')
      }

      test.message = `Получено элементов: ${result.items.length}`
      break

    case 'create_item':
      const createResult = await apiCreateItemRoute.run(ctx, {
        name: 'Test Item',
        value: 100
      })

      if (!createResult.success || !createResult.item) {
        throw new Error('Элемент не создан')
      }

      test.message = `Элемент создан с ID: ${createResult.item.id}`
      break
  }
}
```

**Пример теста (HTTP запрос)**:

```javascript
import { request } from '@app/request'
import { PROJECT_ROOT } from '../config/routes'

async function runApiHttpTest(testName, test) {
  const baseUrl = ctx.account.url(`./${PROJECT_ROOT}`)

  switch (testName) {
    case 'http_get_items':
      // Делаем реальный HTTP запрос к endpoint
      const response = await request({
        url: `${baseUrl}/api/items/list`,
        method: 'get',
        responseType: 'json',
        throwHttpErrors: false
      })

      // Проверяем HTTP статус
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode} - endpoint недоступен`)
      }

      // Проверяем структуру ответа
      const data = response.body as any
      if (!data.success) {
        throw new Error('API вернул success=false')
      }

      test.message = `HTTP 200 OK, получено элементов: ${data.items?.length || 0}`
      break

    case 'http_post_create':
      const postResponse = await request({
        url: `${baseUrl}/api/items/create`,
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          name: 'HTTP Test Item',
          value: 123
        },
        responseType: 'json',
        throwHttpErrors: false
      })

      if (postResponse.statusCode !== 200) {
        throw new Error(`HTTP ${postResponse.statusCode}`)
      }

      const postData = postResponse.body as any
      if (!postData.success) {
        throw new Error('Создание не удалось')
      }

      test.message = `HTTP 200 OK, элемент создан`
      break
  }
}
```

**Рекомендуемая структура тестов API**:

```typescript
export const TEST_CATEGORIES = [
  {
    name: 'api_internal',
    title: 'Тесты API (внутренние вызовы)',
    icon: 'fa-code',
    tests: [
      { name: 'route_get_items', description: 'GET ./api/items (route.run)' },
      { name: 'route_create_item', description: 'POST ./api/items/create (route.run)' }
    ]
  },
  {
    name: 'api_http',
    title: 'Тесты HTTP доступности',
    icon: 'fa-globe',
    tests: [
      { name: 'http_get_items', description: 'HTTP GET ./api/items' },
      { name: 'http_post_create', description: 'HTTP POST ./api/items/create' }
    ]
  }
]
```

### Функциональные тесты

**Что тестировать**:

- Бизнес-логику
- Генерация ключей
- Форматирование данных
- Валидация

**Пример теста**:

```javascript
async function runFunctionalTest(testName, test) {
  switch (testName) {
    case 'key_generation':
      const userId = ctx.user?.id || 'test-user'
      const itemId = 'item-' + Date.now()
      const key = `${userId}-${itemId}-${Date.now()}`

      if (!key.includes(userId) || !key.includes(itemId)) {
        throw new Error('Ключ не содержит необходимые компоненты')
      }

      test.message = 'Ключ успешно сгенерирован'
      break

    case 'data_formatting':
      const date = new Date()
      const formatted = date.toLocaleString('ru-RU')

      if (!formatted.includes(':')) {
        throw new Error('Дата отформатирована некорректно')
      }

      test.message = 'Форматирование данных работает'
      break
  }
}
```

### Интеграционные тесты

**Что тестировать**:

- Полные потоки (end-to-end)
- Взаимодействие между компонентами
- Изоляция данных пользователей

**Пример теста**:

```javascript
async function runIntegrationTest(testName, test) {
  switch (testName) {
    case 'full_flow':
      // Шаг 1: Создаём элемент
      const createResult = await apiCreateItemRoute.run(ctx, {
        name: 'Integration Test Item'
      })

      if (!createResult.success) {
        throw new Error('Шаг 1: Элемент не создан')
      }

      const itemId = createResult.item.id

      // Шаг 2: Получаем список (должен включать наш элемент)
      const listResult = await apiGetItemsRoute.run(ctx)

      if (!listResult.success) {
        throw new Error('Шаг 2: Не удалось получить список')
      }

      const found = listResult.items.find((i) => i.id === itemId)

      if (!found) {
        throw new Error('Шаг 2: Созданный элемент не найден в списке')
      }

      // Шаг 3: Обновляем элемент
      const updateResult = await apiUpdateItemRoute.run(ctx, {
        id: itemId,
        name: 'Updated Name'
      })

      if (!updateResult.success) {
        throw new Error('Шаг 3: Элемент не обновлён')
      }

      test.message = 'Полный поток выполнен успешно (создание → список → обновление)'
      break
  }
}
```

---

## Структура данных тестов

### Формат категорий

```javascript
const testCategories = ref([
  {
    name: 'database', // Уникальный ключ категории
    title: 'Тесты базы данных', // Отображаемое название
    icon: 'fa-database', // FontAwesome иконка
    tests: [
      // Массив тестов
    ]
  }
  // Другие категории...
])
```

### Формат теста

```javascript
{
  name: 'test_unique_name',              // Уникальное имя теста
  description: 'Описание того, что тестируется',
  status: 'pending',                     // pending|running|passed|failed
  message: '',                           // Сообщение о результате
  error: '',                             // Текст ошибки
  details: '',                           // Stack trace
  duration: 0                            // Время выполнения (мс)
}
```

### Состояния теста

- **pending** (серый фон) — тест ещё не запущен
- **running** (синий фон, spinner) — тест выполняется
- **passed** (зелёный фон, ✓) — тест пройден успешно
- **failed** (красный фон, ✗) — тест провален

---

## Интерактивный UI

### Хедер с кнопкой запуска

```vue
<div class="bg-white shadow-md border-b-4 border-primary">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <i class="fas fa-flask text-primary text-2xl"></i>
        <div>
          <h1 class="text-2xl font-bold text-dark">Unit Tests</h1>
          <p class="text-sm text-gray-600">Комплексное тестирование</p>
        </div>
      </div>

      <button
        @click="runAllTests"
        :disabled="running"
        class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        <i :class="['fas', running ? 'fa-spinner fa-spin' : 'fa-play']"></i>
        <span>{{ running ? 'Выполняется...' : 'Запустить все тесты' }}</span>
      </button>
    </div>
  </div>
</div>
```

### Статистика

```vue
<div v-if="testsCompleted" class="bg-white border-b border-gray-200">
  <div class="container mx-auto px-4 py-4">
    <div class="grid grid-cols-4 gap-4">
      <div class="text-center">
        <div class="text-3xl font-bold text-gray-800">{{ totalTests }}</div>
        <div class="text-sm text-gray-600">Всего тестов</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-green-600">{{ passedTests }}</div>
        <div class="text-sm text-gray-600">Пройдено</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-red-600">{{ failedTests }}</div>
        <div class="text-sm text-gray-600">Провалено</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-gray-600">{{ duration }}мс</div>
        <div class="text-sm text-gray-600">Время выполнения</div>
      </div>
    </div>
  </div>
</div>
```

### Категория тестов

```vue
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <div
    class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
    @click="toggleCategory(category.name)"
  >
    <div class="flex items-center space-x-3">
      <i :class="['fas', category.icon, 'text-primary']"></i>
      <h2 class="text-lg font-semibold text-dark">{{ category.title }}</h2>
      <span class="text-sm text-gray-500">({{ category.tests.length }} тестов)</span>
    </div>

    <div class="flex items-center space-x-4">
      <div v-if="getCategoryStats(category.name).total > 0" class="flex items-center space-x-2 text-sm">
        <span class="text-green-600">
          <i class="fas fa-check-circle"></i> {{ getCategoryStats(category.name).passed }}
        </span>
        <span class="text-red-600">
          <i class="fas fa-times-circle"></i> {{ getCategoryStats(category.name).failed }}
        </span>
      </div>

      <button
        @click.stop="runCategoryTests(category.name)"
        :disabled="running"
        class="px-4 py-1 bg-primary text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
      >
        <i class="fas fa-play mr-1"></i>
        Запустить
      </button>

      <i :class="['fas', expandedCategories[category.name] ? 'fa-chevron-up' : 'fa-chevron-down', 'text-gray-400']"></i>
    </div>
  </div>

  <!-- Тесты внутри категории -->
</div>
```

### Отображение теста

```vue
<div
  :class="[
    'p-4 rounded-lg border-2 transition-all',
    test.status === 'passed' ? 'bg-green-50 border-green-200' :
    test.status === 'failed' ? 'bg-red-50 border-red-200' :
    test.status === 'running' ? 'bg-blue-50 border-blue-200' :
    'bg-gray-50 border-gray-200'
  ]"
>
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <div class="flex items-center space-x-2 mb-1">
        <i
          :class="[
            'fas',
            test.status === 'passed' ? 'fa-check-circle text-green-600' :
            test.status === 'failed' ? 'fa-times-circle text-red-600' :
            test.status === 'running' ? 'fa-spinner fa-spin text-blue-600' :
            'fa-circle text-gray-400'
          ]"
        ></i>
        <h3 class="font-semibold text-dark">{{ test.name }}</h3>
      </div>

      <p class="text-sm text-gray-600 mb-2">{{ test.description }}</p>

      <!-- Успех -->
      <div v-if="test.status === 'passed'" class="text-sm text-green-700">
        <i class="fas fa-info-circle mr-1"></i>
        {{ test.message || 'Тест пройден успешно' }}
        <span v-if="test.duration" class="ml-2 text-gray-500">({{ test.duration }}мс)</span>
      </div>

      <!-- Ошибка -->
      <div v-if="test.status === 'failed'" class="space-y-2">
        <div class="text-sm text-red-700">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          {{ test.error || 'Тест провален' }}
        </div>
        <div v-if="test.details" class="text-xs bg-red-100 p-2 rounded font-mono text-red-800 whitespace-pre-wrap">
          {{ test.details }}
        </div>
      </div>
    </div>

    <button
      @click="runSingleTest(category.name, test.name)"
      :disabled="running || test.status === 'running'"
      class="ml-4 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <i class="fas fa-redo mr-1"></i>
      Повторить
    </button>
  </div>
</div>
```

---

## Запуск тестов

### Проверка TypeScript по всему воркспэйсу

Для агентов обязательность и порядок прогонов зафиксированы в `.cursor/rules/ts-lint.mdc`.

**Суженная проверка (по умолчанию для агентов)** — только проекты, затронутые изменёнными путями:

```bash
npm run ts-lint:touched -- p/приложение/путь/к/файлу.ts
```

Вызывается `scripts/lint-types-touched.sh`: для каждого аргумента находится ближайший `tsconfig.json` при обходе каталогов вверх до корня репозитория, дубликаты конфигов убираются, затем для каждого конфига выполняется `npx -p typescript@5 --yes tsc --noEmit -p <cfg>`.

**Полный прогон по всем конфигам** из корня workspace:

```bash
npm run ts-lint
```

Она вызывает `scripts/lint-types-workspace.sh`. Скрипт:

- собирает список `tsconfig.json` через `git ls-files --cached --others --exclude-standard '*tsconfig.json'` — благодаря этому **уважается `.gitignore`** (всё, что в нём, в проверку не попадает);
- дополнительно отбрасывает пути с `node_modules/` и `.typings/`;
- последовательно выполняет `npx -p typescript@5 --yes tsc --noEmit -p <cfg>` для каждого оставшегося конфига;
- в конце печатает сводку «успешно / с ошибками» и завершается ненулевым кодом, если хоть один проект провалился.

Команда **не падает на первой ошибке**: она проходит до конца, чтобы за один прогон было видно все проблемные проекты.

Корневой `tsconfig.json` в выборку попадает (он не игнорируется git). У него узкий `include` (`inner/`, `zoom-agent-tool/`, `types/**/*.d.ts` и т.д.; каталог `p/` исключён), при этом в `paths` остаются алиасы вроде `@start/*`, `@users/*` на соседние репозитории — в средах без этих деревьев возможны «Cannot find module …». Это особенность корневого конфига; чинить — поправкой `paths`/`include` в `tsconfig.json`.

Рекомендация процесса:

- в типичной работе в одном приложении — `npm run ts-lint:touched -- <изменённые пути>`;
- полный воркспейс — `npm run ts-lint`, когда это уместно (см. `.cursor/rules/ts-lint.mdc`);
- затем — функциональные/интеграционные проверки.

### Запуск всех тестов

```javascript
async function runAllTests() {
  running.value = true
  testsCompleted.value = false
  const startTime = Date.now()

  // Сбрасываем все тесты
  testCategories.value.forEach((category) => {
    category.tests.forEach((test) => {
      test.status = 'pending'
      test.message = ''
      test.error = ''
      test.details = ''
      test.duration = 0
    })
  })

  // Запускаем тесты по категориям
  for (const category of testCategories.value) {
    await runCategoryTests(category.name, false)
  }

  duration.value = Date.now() - startTime
  testsCompleted.value = true
  running.value = false
}
```

### Запуск категории

```javascript
async function runCategoryTests(categoryName, setRunning = true) {
  if (setRunning) running.value = true

  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) {
    if (setRunning) running.value = false
    return
  }

  for (const test of category.tests) {
    await runTest(categoryName, test.name)
  }

  if (setRunning) running.value = false
}
```

### Запуск одного теста

```javascript
async function runSingleTest(categoryName, testName) {
  running.value = true
  await runTest(categoryName, testName)
  running.value = false
}
```

### Выполнение теста

```javascript
async function runTest(categoryName, testName) {
  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) return

  const test = category.tests.find((t) => t.name === testName)
  if (!test) return

  test.status = 'running'
  test.message = ''
  test.error = ''
  test.details = ''

  const startTime = Date.now()

  try {
    // Выполняем тест в зависимости от категории
    switch (categoryName) {
      case 'database':
        await runDatabaseTest(testName, test)
        break
      case 'api':
        await runApiTest(testName, test)
        break
      case 'functional':
        await runFunctionalTest(testName, test)
        break
      case 'integration':
        await runIntegrationTest(testName, test)
        break
    }

    if (test.status !== 'failed') {
      test.status = 'passed'
    }
  } catch (error) {
    test.status = 'failed'
    test.error = error.message
    test.details = error.stack || ''
  }

  test.duration = Date.now() - startTime
}
```

---

## Обработка результатов

### Computed свойства для статистики

```javascript
const totalTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.length, 0)
})

const passedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter((t) => t.status === 'passed').length
  }, 0)
})

const failedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter((t) => t.status === 'failed').length
  }, 0)
})
```

### Статистика категории

```javascript
function getCategoryStats(categoryName) {
  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) return { total: 0, passed: 0, failed: 0 }

  return {
    total: category.tests.length,
    passed: category.tests.filter((t) => t.status === 'passed').length,
    failed: category.tests.filter((t) => t.status === 'failed').length
  }
}
```

### Переключение категорий

```javascript
const expandedCategories = reactive({
  database: true,
  api: true,
  functional: true,
  integration: true
})

function toggleCategory(name) {
  expandedCategories[name] = !expandedCategories[name]
}
```

---

## Best Practices

### Безопасность

✅ **Клиент передаёт ТОЛЬКО имя теста, все данные генерируются на сервере**:

```typescript
// ✅ ПРАВИЛЬНО
const result = await apiRunSingleTestRoute.run(ctx, {
  category: 'database',
  testName: 'create_order' // ← Только имя теста
})

// ❌ НЕПРАВИЛЬНО - клиент передаёт параметры
const result = await apiRunTestRoute.run(ctx, {
  testName: 'get_order',
  orderId: '12345' // ← ОПАСНО! Инъекция!
})
```

✅ **Генерируйте все параметры на сервере**:

```typescript
// ✅ ПРАВИЛЬНО - параметры из контекста сервера
const orderId = 'test-' + Date.now()
const userId = ctx.user.id // ← Из ctx, не от клиента
const order = await OrdersTable.create(ctx, { id: orderId, userId })
```

✅ **Валидируйте входные данные**:

```typescript
// ✅ Проверяем, что testName существует в TEST_CATEGORIES
const validTest = TEST_CATEGORIES.find((c) => c.name === category)?.tests.find(
  (t) => t.name === testName
)

if (!validTest) {
  throw new Error('Недопустимый тест')
}
```

❌ **НЕ передавайте от клиента**:

- ID записей для чтения/изменения
- SQL условия или фильтры
- User ID других пользователей
- Пути к таблицам
- Любые параметры бизнес-логики

**📖 Подробнее**: См. раздел [Безопасность тестов](#безопасность-тестов)

### Авторизация

✅ **Защищайте страницу тестов, а не API endpoints для тестов**:

```typescript
// ✅ ПРАВИЛЬНО - авторизация на уровне страницы
// web/tests/index.tsx
export const testsPageRoute = app.html('/', async (ctx, req) => {
  requireAnyUser(ctx)  // ← Защита страницы
  return <html>...</html>
})

// ✅ ПРАВИЛЬНО - БЕЗ авторизации в API для тестов
// api/tests/run-tests/run-single.ts
export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  // НЕ добавляем requireAnyUser здесь
  // Страница уже защищена
})
```

✅ **Вызывайте таблицы напрямую в тестах**:

```typescript
// ✅ ПРАВИЛЬНО - прямой вызов таблицы
const items = await ItemsTable.findAll(ctx)

// ⚠️ МОЖЕТ НЕ РАБОТАТЬ - вызов через API с авторизацией
const result = await apiGetItemsRoute.run(ctx) // может упасть на requireAnyUser
```

❌ **Не добавляйте requireAnyUser в тестовые API**:

```typescript
// ❌ НЕПРАВИЛЬНО
export const apiRunSingleTestRoute = app.post('/run-single', async (ctx, req) => {
  requireAnyUser(ctx) // ← Будет блокировать внутренние вызовы
})
```

### Организация тестов

✅ **Группируйте по типам**:

- База данных
- API
- Функциональные
- Интеграционные

✅ **Давайте понятные имена**:

```javascript
// Хорошо
{ name: 'create_user_record', description: 'Создание записи пользователя' }

// Плохо
{ name: 'test1', description: 'Тест' }
```

✅ **Пишите детальные описания**:

```javascript
// Хорошо
description: 'Проверка создания записи в таблице users с валидацией обязательных полей'

// Плохо
description: 'Тест создания'
```

### Обработка ошибок

✅ **Возвращайте структурированные результаты**:

```javascript
return {
  success: true,
  message: 'Запись создана успешно',
  duration: Date.now() - startTime
}

// Или при ошибке
return {
  success: false,
  error: error.message,
  details: error.stack
}
```

✅ **Выбрасывайте ошибки с понятными сообщениями**:

```javascript
if (!record) {
  throw new Error('Запись не найдена в базе данных после создания')
}

// Не просто
if (!record) {
  throw new Error('Error')
}
```

### Изоляция тестов

✅ **Используйте уникальные ключи**:

```javascript
const testKey = 'test-' + Date.now()
const chainKey = `test-chain-${Date.now()}`
```

✅ **Очищайте после себя** (опционально):

```javascript
// После теста можно удалить тестовые данные
if (testRecord) {
  await YourTable.delete(ctx, testRecord.id)
}
```

❌ **НЕ влияйте на продакшн данные**:

```javascript
// Плохо
const users = await Users.findAll(ctx, {})
for (const user of users) {
  await Users.delete(ctx, user.id) // Удаляет все!
}

// Хорошо
const testUsers = await Users.findAll(ctx, {
  where: { email: { $like: 'test-%' } }
})
for (const user of testUsers) {
  await Users.delete(ctx, user.id)
}
```

### Производительность

✅ **Запускайте тесты последовательно**:

```javascript
// В одной категории последовательно
for (const test of category.tests) {
  await runTest(categoryName, test.name)
}
```

✅ **Отображайте прогресс**:

```javascript
test.status = 'running' // Сразу показываем spinner
```

✅ **Засекайте время**:

```javascript
const startTime = Date.now()
// ... выполнение теста
test.duration = Date.now() - startTime
```

---

## Примеры использования

### Пример 1: Простой проект с одной таблицей

**Структура**:

```
./web/tests/index.tsx
/pages/tests/UnitTestsPage.vue
./api/tests/run-tests/*
./tables/items.table.ts
```

**Тесты**:

```javascript
const testCategories = ref([
  {
    name: 'database',
    title: 'Тесты базы данных',
    icon: 'fa-database',
    tests: [
      { name: 'table_exists', description: 'Проверка существования таблицы items' },
      { name: 'create_item', description: 'Создание элемента' },
      { name: 'find_items', description: 'Поиск элементов' }
    ]
  },
  {
    name: 'api',
    title: 'Тесты API',
    icon: 'fa-code',
    tests: [
      { name: 'get_items', description: 'GET ./api/items' },
      { name: 'create_item', description: 'POST ./api/items/create' }
    ]
  }
])
```

### Пример 2: Проект с чатом

**Структура**:

```
./web/tests/index.tsx
/pages/tests/UnitTestsPage.vue
./api/tests/run-tests/*
./api/chat.ts
./tables/chat_messages.table.ts
```

**Категории тестов**:

1. База данных (5 тестов)

   - Существование таблицы
   - Создание сообщения
   - Поиск сообщений
   - Обновление видимости
   - Маркеры контекста

2. API (6 тестов)

   - Получение списка агентов
   - Генерация socketId
   - Отправка сообщения
   - Получение истории
   - Очистка чата
   - Сброс контекста

3. Функциональные (5 тестов)

   - Выбор агента
   - Маркер смены агента
   - Персистентность сообщений
   - Функция очистки
   - Сброс контекста

4. Интеграционные (4 теста)
   - Полный цикл диалога
   - Переключение агентов
   - Изоляция пользователей
   - Сохранность после очистки

### Пример 3: E-commerce проект

**Категории тестов**:

1. База данных

   - Товары (products)
   - Заказы (orders)
   - Корзина (cart)

2. API

   - Каталог товаров
   - Добавление в корзину
   - Оформление заказа
   - Платежи

3. Функциональные

   - Подсчёт итоговой суммы
   - Применение скидок
   - Проверка наличия

4. Интеграционные
   - Полный путь покупателя
   - Изоляция корзин пользователей

---

## Частые ошибки

### ❌ Импорт таблиц в Vue

```vue
<!-- НЕПРАВИЛЬНО -->
<script setup>
import UsersTable from '../tables/users.table'
</script>
```

**Ошибка**: `File not found for local dependency`

**Решение**: Используйте API endpoint для серверных тестов.

### ❌ Неправильный роут в API

```typescript
// НЕПРАВИЛЬНО (двойной путь)
// В файле api/tests/run-tests/run-single.ts
export const apiRoute = app.post('/tests/database', ...)
// Результат: ./api/tests/run-tests/run-single~tests/database (ошибка!)
```

**Решение**:

```typescript
// ПРАВИЛЬНО
// В файле api/tests/run-tests/run-single.ts
export const apiRoute = app.post('/', ...)
// Результат: ./api/tests/run-tests/run-single
```

### ❌ Не отображение ошибок

```javascript
// НЕПРАВИЛЬНО
catch (error) {
  test.status = 'failed'
}
```

**Решение**:

```javascript
// ПРАВИЛЬНО
catch (error) {
  test.status = 'failed'
  test.error = error.message
  test.details = error.stack || ''
}
```

### ❌ Блокировка UI

```vue
<!-- НЕПРАВИЛЬНО -->
<button @click="runTest">Запустить</button>
```

**Решение**:

```vue
<!-- ПРАВИЛЬНО -->
<button @click="runTest" :disabled="running">
  Запустить
</button>
```

### ❌ Нестабильность тестов из-за race conditions в БД

**Проблема**: Тест падает периодически (например, на 1 из 5 запусков) из-за race conditions при работе с базой данных.

**Симптомы**:

- Тест проходит в большинстве случаев, но периодически падает
- Ошибки типа "Запись не найдена" или "Значение не обновилось"
- Проблема возникает после операций `createOrUpdateBy` или `update`, когда сразу после них вызывается `findOneBy` или `findById`

**Пример проблемного кода**:

```typescript
// ❌ НЕПРАВИЛЬНО - может упасть из-за race condition
case 'update_and_verify':
  const oldValue = JSON.stringify(['type1', 'type2'])

  // Обновляем запись
  const updated = await SettingsTable.createOrUpdateBy(ctx, 'key', {
    key: 'test-key',
    value: JSON.stringify(['type3', 'type4'])
  })

  // Сразу проверяем - может не успеть обновиться в БД!
  const reloaded = await SettingsTable.findOneBy(ctx, { key: 'test-key' })

  if (reloaded.value === oldValue) {
    throw new Error('Значение не обновилось')  // ← Может упасть!
  }
  break
```

**Причина**: После `createOrUpdateBy` или `update` данные могут быть ещё не видны через `findOneBy` из-за:

- Задержек репликации в БД
- Кэширования на уровне БД
- Транзакций, которые ещё не закоммичены

**Решение**: Добавить retry logic с проверкой фактического обновления:

```typescript
// ✅ ПРАВИЛЬНО - с retry logic
case 'update_and_verify':
  const oldValue = JSON.stringify(['type1', 'type2'])
  const expectedNewValue = JSON.stringify(['type3', 'type4'])

  // Обновляем запись
  const updated = await SettingsTable.createOrUpdateBy(ctx, 'key', {
    key: 'test-key',
    value: expectedNewValue
  })

  // Загружаем с несколькими попытками для обработки race conditions
  let reloaded = null
  let valueToParse = null

  // Делаем до 3 попыток
  for (let attempt = 1; attempt <= 3; attempt++) {
    reloaded = await SettingsTable.findOneBy(ctx, { key: 'test-key' })

    if (reloaded && reloaded.value) {
      valueToParse = reloaded.value
      // Проверяем, что значение действительно обновилось (не равно старому)
      if (valueToParse !== oldValue) {
        Debug.info(ctx, `Значение обновлено (попытка ${attempt})`)
        break
      } else {
        Debug.info(ctx, `Попытка ${attempt}: значение еще не обновилось`)
      }
    } else {
      Debug.info(ctx, `Попытка ${attempt}: запись не найдена`)
    }
  }

  if (!reloaded || !valueToParse) {
    throw new Error('Не удалось загрузить обновлённую запись после всех попыток')
  }

  // ⚠️ КРИТИЧЕСКИ ВАЖНО: Проверяем, что значение действительно обновилось
  // Если значение не обновилось после всех попыток - это ошибка, тест должен упасть!
  if (valueToParse === oldValue) {
    throw new Error(`Значение не обновилось после всех попыток. Ожидалось новое значение, но получено старое: ${valueToParse}`)
  }

  // Парсим и проверяем структуру
  const parsed = JSON.parse(valueToParse)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Обновлённое значение не является массивом или пусто')
  }
  break
```

**Ключевые моменты решения**:

1. ✅ **Retry logic**: До 3 попыток загрузки обновлённой записи для обработки race conditions
2. ✅ **Проверка обновления**: Сравниваем новое значение со старым, чтобы убедиться, что оно действительно изменилось
3. ✅ **Логирование**: Добавляем логи на каждом шаге для диагностики
4. ✅ **Упрощение проверок**: Фокус на базовых CRUD-операциях, убираем избыточные проверки
5. ⚠️ **Критическая проверка**: Если значение не обновилось после всех попыток - тест ДОЛЖЕН упасть! Это не race condition, а реальная ошибка обновления

**Когда использовать retry logic**:

- ✅ После операций `createOrUpdateBy` или `update`, когда сразу проверяете результат через `findOneBy` или `findById`
- ✅ Когда тест периодически падает с ошибками "не найдено" или "не обновилось"
- ✅ При работе с распределёнными БД или БД с репликацией

**Когда НЕ нужен retry logic**:

- ❌ После операций `create` (новая запись должна быть видна сразу)
- ❌ Если тест стабилен и всегда проходит
- ❌ Если проблема не в race conditions, а в логике теста

---

## Чек-лист создания страницы тестов

### 1. Создание файлов

- [ ] Создать `web/tests/index.tsx` и `web/tests/ai.tsx` с HTML роутами
- [ ] Создать `pages/tests/UnitTestsPage.vue`
- [ ] Создать `shared/tests/test-definitions.ts`
- [ ] Создать `api/tests/run-tests/list.ts`, `run-single.ts`, `run-all.ts`
- [ ] Создать `lib/tests/run-tests.ts` для серверной логики

### 2. Настройка API

- [ ] Импортировать `TEST_CATEGORIES` в `api/tests/run-tests/list.ts`
- [ ] Импортировать логику выполнения тестов из `lib/tests/run-tests.ts` в `run-single.ts` и `run-all.ts`
- [ ] ❌ НЕ добавлять `requireAnyUser(ctx)` в API для тестов (только на уровне страницы!)
- [ ] Создать switch с тестами базы данных
- [ ] Возвращать `{ success, message, duration }` или `{ success: false, error, details }`

### 2.1. Безопасность API

- [ ] ✅ API принимает ТОЛЬКО `category` и `testName`
- [ ] ✅ Валидация `category` и `testName` через `TEST_CATEGORIES`
- [ ] ✅ Все ID и параметры генерируются на СЕРВЕРЕ
- [ ] ✅ Используется `ctx.user.id` из контекста, НЕ от клиента
- [ ] ❌ API НЕ принимает ID записей от клиента
- [ ] ❌ API НЕ принимает SQL условия от клиента
- [ ] ❌ API НЕ принимает пути к таблицам от клиента

### 3. Настройка Vue

- [ ] Импортировать API роуты для тестирования
- [ ] Импортировать `apiRunDatabaseTestRoute`
- [ ] Создать `testCategories` с категориями и тестами
- [ ] Добавить computed свойства для статистики
- [ ] Реализовать функции запуска тестов

### 4. UI элементы

- [ ] Хедер с кнопкой "Запустить все"
- [ ] Статистика (всего/пройдено/провалено/время)
- [ ] Категории с иконками и счётчиками
- [ ] Кнопки запуска для каждой категории
- [ ] Отображение тестов с статусами
- [ ] Кнопка "Повторить" для каждого теста
- [ ] Отображение ошибок и stack trace

### 5. Стили

- [ ] Цветовая индикация статусов
- [ ] Spinner для running тестов
- [ ] Disabled состояния кнопок

### 6. Тестирование

- [ ] Проверить доступ к странице `./${PROJECT_ROOT}/web/tests`
- [ ] Запустить все тесты
- [ ] Запустить отдельную категорию
- [ ] Запустить один тест
- [ ] Проверить отображение ошибок
- [ ] Проверить статистику

### 7. Проверка безопасности

- [ ] ✅ Страница `./web/tests` требует авторизации
- [ ] ✅ Vue передаёт только `category` и `testName`
- [ ] ✅ API не принимает ID или параметры от клиента
- [ ] ✅ Все тестовые данные генерируются на сервере
- [ ] ✅ Используется `ctx.user.id`, а не параметр от клиента
- [ ] ✅ Тесты создают изолированные данные
- [ ] ✅ Тестовые данные очищаются после выполнения
- [ ] ❌ Тесты НЕ могут получить чужие данные через инъекции

---

## Связанные документы

- **002-routing.md** — File-based роутинг
- **007-vue.md** — Vue компоненты
- **008-heap.md** — Тестирование Heap Tables
- **003-auth.md** — Авторизация в тестах
- **001-standards.md** — Стандарты кодирования

---

## Примечания

### Почему страница ./web/tests?

Страница `./web/tests` — стандартное название для unit-тестов, её легко запомнить.

### Почему без ссылок в меню?

Страница тестов предназначена только для разработчиков. Обычные пользователи не должны её видеть.

### Можно ли защитить страницу?

Да, добавьте в `unit.tsx`:

```typescript
import { requireAccountRole } from '@app/auth'

export const unitTestsPageRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin') // Только для админов

  return (
    // ...
  )
})
```

---

## Unit-AI: Автоматическое тестирование для AI-агентов

### Что такое Unit-AI

**Unit-AI** — специальная страница для автоматического тестирования, предназначенная для AI-агентов и автоматизированных систем. В отличие от обычной страницы `./web/tests`, которая предназначена для разработчиков с интерактивным UI, страница `./web/tests/ai` возвращает результаты тестов в машино-читаемом формате (JSON) и автоматически запускает все тесты при загрузке.

### Зачем нужен Unit-AI

- 🤖 **Для AI-агентов** — агенты могут проверять состояние системы
- 📊 **Для мониторинга** — автоматическая проверка работоспособности
- 🔄 **Для CI/CD** — интеграция с автоматизированными процессами
- 📈 **Для метрик** — отслеживание качества кода
- ⚠️ **Для алертов** — уведомления о проблемах

### Требования к Unit-AI

⚠️ Если вы используете систему тестирования, поддерживайте страницу `./web/tests/ai` в актуальном состоянии и расширяйте покрытие по мере развития проекта.

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Что тестировать

**Тесты ДОЛЖНЫ тестировать РЕАЛЬНЫЙ код вашего проекта, а не писать тестовый код "от балды"!**

✅ **ПРАВИЛЬНО** — тестируем реальные API и таблицы проекта:

```typescript
// Тестируем РЕАЛЬНЫЙ API endpoint из api/chat.ts
case 'send_message':
  const result = await apiSendMessageRoute.run(ctx, {
    message: 'Тест',
    chainKey: 'test-chain',
    agentId: 'real-agent-id'
  })

  if (!result.success) {
    throw new Error('Реальный API не работает')
  }
  break

// Тестируем РЕАЛЬНУЮ таблицу из tables/chat_messages.table.ts
case 'create_message':
  const msg = await ChatMessagesTable.create(ctx, {
    userId: ctx.user.id,
    chainKey: 'test-chain',
    // ... реальные поля реальной таблицы
  })
```

❌ **НЕПРАВИЛЬНО** — пишем mock/stub код прямо в тестах:

```typescript
// Это НЕ тест, это написание нового кода!
case 'fake_test':
  const fakeFunction = (a, b) => a + b  // ← Новый код в тесте!
  const result = fakeFunction(2, 3)

  if (result !== 5) {
    throw new Error('Fake test failed')
  }
  break
```

**Принцип**: Тесты должны ВЫЗЫВАТЬ и ПРОВЕРЯТЬ код, который УЖЕ существует в проекте (API routes, таблицы Heap, функции из shared/), а не создавать новую логику внутри самих тестов.

---

## Создание страницы ./web/tests/ai

### ⚠️ Проблема циклических зависимостей

**Типичная ошибка**:

```typescript
// web/tests/ai.tsx
import { apiRoute1, apiRoute2 } from './api/chat'

export const unitAiPageRoute = app.get('/', async (ctx, req) => {
  // Попытка использовать импортированные роуты
  await apiRoute1.run(ctx)
})
```

**Ошибка**: `Failed to load route run handler for 'apiRoute1' from module './api/chat'`

**Причина**: Циклические зависимости между файлами. Когда `web/tests/ai.tsx` импортирует из `api/chat.ts`, а `api/chat.ts` может косвенно зависеть от других файлов, которые импортируют `web/tests/ai.tsx`, возникает циклическая зависимость.

**Решение**: Создать отдельный API endpoint `api/tests/run-tests/run-all.ts`, который выполняет все тесты на сервере и возвращает JSON. HTML роут `web/tests/ai.tsx` просто вызывает этот API и отображает результат.

### Правильная структура проекта

```
project/
├── web/
│   └── tests/
│       └── ai.tsx                # Простой HTML роут (вызывает API)
└── api/
    └── tests/
        └── run-tests/
            ├── run-all.ts        # ← Основная логика всех тестов (возвращает JSON)
            └── run-single.ts     # API для отдельных тестов (для ./web/tests страницы)
```

### HTML роут для ./web/tests/ai (простой вариант)

**Файл**: `web/tests/ai.tsx`

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import { apiRunAllTestsRoute } from '../.../api/tests/run-tests/run-all'

export const unitAiPageRoute = app.html('/', async (ctx, req) => {
  // Просто вызываем API который выполнит все тесты и вернёт JSON
  const result = await apiRunAllTestsRoute.run(ctx)

  // Возвращаем JSON как HTML (для отображения в браузере)
  return (
    <html>
      <head>
        <title>Unit-AI Tests</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </body>
    </html>
  )
})

export default unitAiPageRoute
```

**Ключевые моменты**:

- ✅ Минимальный код в `web/tests/ai.tsx`
- ✅ Вся логика в `api/tests/run-tests/run-all.ts`
- ✅ Нет циклических зависимостей
- ✅ JSON отображается в `<pre>` для читаемости

### AI страница для выполнения всех тестов

**Файл**: `web/tests/ai.tsx`

```typescript
// @shared
import { jsx } from "@app/html-jsx"

export const unitAiPageRoute = app.html('/', async (ctx, req) => {
  // Импортируем все API роуты для тестирования
  const {
    apiGetAgentsListRoute,
    apiGetChatHistoryRoute,
    apiSendMessageRoute,
    apiClearChatRoute,
    apiResetContextRoute,
    apiGetSocketIdRoute
  } = await import('./api/chat')

  const { apiRunDatabaseTestRoute } = await import('../api/tests/run-tests/run-single')

    const testCategories = [
    {
      name: 'database',
      title: 'Тесты базы данных (Heap Table)',
      tests: [
        { name: 'table_exists', description: 'Проверка существования таблицы' },
        { name: 'create_message', description: 'Создание нового сообщения' },
        { name: 'find_messages', description: 'Поиск сообщений по фильтрам' },
        { name: 'update_visibility', description: 'Обновление поля isVisible' },
        { name: 'context_reset_marker', description: 'Создание маркера сброса контекста' }
      ]
    },
    {
      name: 'api',
      title: 'Тесты API endpoints',
      tests: [
        { name: 'get_agents_list', description: 'GET /chat/agents' },
        { name: 'get_socket_id', description: 'GET /chat/socket-id' },
        { name: 'send_message', description: 'POST /chat/send' },
        { name: 'get_history', description: 'GET /chat/history' },
        { name: 'clear_chat', description: 'POST /chat/clear' },
        { name: 'reset_context', description: 'POST /chat/reset-context' }
      ]
    },
    {
      name: 'functional',
      title: 'Функциональные тесты',
      tests: [
        { name: 'agent_selection', description: 'Выбор агента и генерация chainKey' },
        { name: 'agent_change_marker', description: 'Создание маркера смены агента' },
        { name: 'message_persistence', description: 'Сохранение и загрузка истории' },
        { name: 'clear_functionality', description: 'Очистка окна чата' },
        { name: 'context_reset', description: 'Сброс контекста' }
      ]
    },
    {
      name: 'integration',
      title: 'Интеграционные тесты',
      tests: [
        { name: 'full_conversation_flow', description: 'Полный цикл диалога' },
        { name: 'agent_switch', description: 'Переключение между агентами' },
        { name: 'multiple_users', description: 'Изоляция сообщений пользователей' },
        { name: 'persistence_after_clear', description: 'Сохранение данных после очистки' }
      ]
    }
  ]

    const results = []
    const startTime = Date.now()

    // Выполняем все тесты автоматически
    for (const category of testCategories) {
      for (const test of category.tests) {
        const testStartTime = Date.now()

        try {
          // Выполняем тест в зависимости от категории
          switch (category.name) {
            case 'database':
              await runDatabaseTest(ctx, test.name)
              break
            case 'api':
              await runApiTest(ctx, test.name)
              break
            case 'functional':
              await runFunctionalTest(ctx, test.name)
              break
            case 'integration':
              await runIntegrationTest(ctx, test.name)
              break
          }

          results.push({
            category: category.name,
            test: test.name,
            description: test.description,
            status: 'passed',
            duration: Date.now() - testStartTime
          })
        } catch (error: any) {
          results.push({
            category: category.name,
            test: test.name,
            description: test.description,
            status: 'failed',
            error: error.message,
            stack: error.stack,
            duration: Date.now() - testStartTime
          })
        }
      }
    }

    const totalDuration = Date.now() - startTime
    const passed = results.filter(r => r.status === 'passed').length
    const failed = results.filter(r => r.status === 'failed').length

    ctx.account.log('Unit-AI tests executed', {
      level: 'info',
      json: { passed, failed, duration: totalDuration, success: failed === 0 }
    })

    // Возвращаем JSON (app.get автоматически сериализует объект)
    return {
      timestamp: new Date().toISOString(),
      project: 'ai-assistent-podolyak',
      summary: {
        total: results.length,
        passed,
        failed,
        duration: totalDuration,
        success: failed === 0
      },
      results
    }
  } catch (error: any) {
    ctx.account.log('Unit-AI execution error', {
      level: 'error',
      json: { error: error.message, stack: error.stack }
    })

    return {
      timestamp: new Date().toISOString(),
      project: 'ai-assistent-podolyak',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        success: false,
        error: error.message
      },
      results: []
    }
  }
})

// === ТЕСТЫ БАЗЫ ДАННЫХ ===
// Тестируем РЕАЛЬНУЮ таблицу ChatMessagesTable из tables/chat_messages.table.ts
async function runDatabaseTest(ctx: any, testName: string) {
  switch (testName) {
    case 'table_exists':
      if (!ChatMessagesTable) {
        throw new Error('Таблица ChatMessagesTable не найдена')
      }
      break

    case 'create_message':
      const msg = await ChatMessagesTable.create(ctx, {
        userId: ctx.user.id,
        chainKey: 'test-chain-' + Date.now(),
        agentId: 'test-agent',
        agentKey: 'test',
        role: 'user',
        content: 'Тестовое сообщение',
        isVisible: true
      })

      if (!msg || !msg.id) {
        throw new Error('Сообщение не создано')
      }
      break

    // ... остальные тесты базы данных
  }
}

// === ТЕСТЫ API ===
// Тестируем РЕАЛЬНЫЕ API endpoints из api/chat.ts
async function runApiTest(ctx: any, testName: string) {
  switch (testName) {
    case 'get_agents_list':
      const agentsResult = await apiGetAgentsListRoute.run(ctx)
      if (!agentsResult.success) {
        throw new Error(agentsResult.error || 'API вернул success=false')
      }
      break

    case 'send_message':
      const agents = await apiGetAgentsListRoute.run(ctx)
      if (!agents.success || !agents.agents || agents.agents.length === 0) {
        throw new Error('Нет доступных агентов для теста')
      }

      // Тестируем РЕАЛЬНЫЙ API отправки сообщений
      const sendResult = await apiSendMessageRoute.run(ctx, {
        message: 'Тестовое сообщение от tests-ai',
        chainKey: 'test-chain-' + Date.now(),
        agentId: agents.agents[0].id,
        agentKey: agents.agents[0].key
      })

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Сообщение не отправлено')
      }
      break

    // ... остальные тесты API
  }
}

// === ФУНКЦИОНАЛЬНЫЕ ТЕСТЫ ===
async function runFunctionalTest(ctx: any, testName: string) {
  // Тестируем РЕАЛЬНУЮ логику проекта
  // ...
}

// === ИНТЕГРАЦИОННЫЕ ТЕСТЫ ===
async function runIntegrationTest(ctx: any, testName: string) {
  // Тестируем РЕАЛЬНЫЕ потоки взаимодействия
  // ...
}

export default apiRunAllTestsRoute
```

### Формат JSON ответа

```json
{
  "timestamp": "2025-11-04T12:34:56.789Z",
  "project": "ai-assistent-podolyak",
  "summary": {
    "total": 20,
    "passed": 18,
    "failed": 2,
    "duration": 5432,
    "success": false
  },
  "results": [
    {
      "category": "database",
      "test": "table_exists",
      "description": "Проверка существования таблицы",
      "status": "passed",
      "duration": 45
    },
    {
      "category": "api",
      "test": "get_agents_list",
      "description": "GET /chat/agents",
      "status": "failed",
      "error": "API вернул success=false",
      "stack": "Error: API вернул success=false\n    at runApiTest...",
      "duration": 123
    }
  ]
}
```

### Использование Unit-AI

**Для AI-агента**:

```
AI: Проверь состояние системы
Agent: GET https://your-domain.com/${PROJECT_ROOT}/web/tests/ai
Response: { "summary": { "success": true, "passed": 20, "failed": 0 } }
Agent: Система работает корректно, все 20 тестов пройдены
```

**Для мониторинга**:

```bash
# Cron job каждый час
0 * * * * curl https://your-domain.com/${PROJECT_ROOT}/web/tests/ai | jq '.summary.success'
```

**Для CI/CD**:

```yaml
test:
  script:
    - response=$(curl https://your-domain.com/${PROJECT_ROOT}/web/tests/ai)
    - success=$(echo $response | jq '.summary.success')
    - if [ "$success" != "true" ]; then exit 1; fi
```

---

## Требования к покрытию тестами

### Обязательные тесты

⚠️ **КРИТИЧЕСКИ ВАЖНО**: Каждый проект ДОЛЖЕН иметь следующие категории тестов:

1. **База данных** — тесты всех таблиц Heap

   - Существование таблицы
   - CRUD операции (create, findAll, update, delete)
   - Фильтрация и поиск
   - Специфичные для таблицы операции

2. **API** — тесты всех API endpoints

   - GET endpoints
   - POST endpoints
   - Обработка ошибок
   - Авторизация

3. **Функциональные** — тесты бизнес-логики

   - Ключевые функции
   - Валидация данных
   - Форматирование

4. **Интеграционные** — тесты полных потоков
   - End-to-end сценарии
   - Взаимодействие компонентов
   - Изоляция данных

### Метрики покрытия

**Минимальные требования**:

- ✅ Покрытие API endpoints: 100%
- ✅ Покрытие таблиц Heap: 100%
- ✅ Покрытие ключевых функций: 80%+
- ✅ Интеграционных тестов: минимум 3

**Идеальные метрики**:

- 🎯 Покрытие API endpoints: 100%
- 🎯 Покрытие таблиц Heap: 100%
- 🎯 Покрытие функций: 90%+
- 🎯 Интеграционных тестов: 5+

### Обновление тестов

**Когда обновлять**:

- ✅ При добавлении новой таблицы → добавить тесты таблицы
- ✅ При создании нового API → добавить тесты API
- ✅ При добавлении функции → добавить функциональные тесты
- ✅ При изменении логики → обновить существующие тесты
- ✅ После багфикса → добавить regression тест

**Как поддерживать**:

```
1. Разработали новый функционал
   ↓
2. Сразу добавили тесты в ./web/tests
   ↓
3. Обновили ./web/tests/ai с новыми тестами
   ↓
4. Проверили, что все тесты проходят
   ↓
5. Деплой
```

---

## Сравнение ./web/tests и ./web/tests/ai

| Характеристика    | ./web/tests         | ./web/tests/ai        |
| ----------------- | ------------------- | --------------------- |
| **Назначение**    | Разработчики        | AI-агенты, мониторинг |
| **UI**            | Интерактивный       | Нет                   |
| **Формат ответа** | HTML                | JSON                  |
| **Запуск**        | По кнопке           | Автоматически         |
| **Статусы**       | Real-time           | Финальные             |
| **Ошибки**        | Детальные с UI      | Stack trace в JSON    |
| **Использование** | Ручное тестирование | Автоматизация         |

### Когда использовать ./web/tests

- 🔨 Разработка новых функций
- 🐛 Отладка проблем
- 🔍 Исследование ошибок
- 📊 Визуальный анализ

### Когда использовать ./web/tests/ai

- 🤖 Проверка AI-агентом
- 📈 Мониторинг системы
- 🔄 CI/CD пайплайны
- ⚠️ Автоматические алерты

---

## Ключевые принципы тестирования

### ⚠️ Тестируйте РЕАЛЬНЫЙ код проекта

**Тесты НЕ должны писать новую логику "от балды"!**

Тесты должны:

- ✅ Вызывать СУЩЕСТВУЮЩИЕ API routes из `/api/`
- ✅ Проверять СУЩЕСТВУЮЩИЕ таблицы Heap из `/tables/`
- ✅ Тестировать СУЩЕСТВУЮЩИЕ функции из `/shared/`
- ✅ Проверять РЕАЛЬНОЕ поведение системы

Тесты НЕ должны:

- ❌ Создавать новые функции внутри тестов
- ❌ Писать mock/stub код вместо вызова реального
- ❌ Тестировать несуществующие endpoints
- ❌ Проверять поля, которых нет в таблицах

**Примеры**:

```typescript
// ✅ ПРАВИЛЬНО - тестируем РЕАЛЬНЫЙ API
case 'send_message':
  // Вызываем СУЩЕСТВУЮЩИЙ apiSendMessageRoute из api/chat.ts
  const result = await apiSendMessageRoute.run(ctx, {
    message: 'Тест',
    chainKey: 'test-chain',
    agentId: realAgentId
  })

  if (!result.success) {
    throw new Error('API не работает')
  }
  break

// ✅ ПРАВИЛЬНО - тестируем РЕАЛЬНУЮ таблицу
case 'create_message':
  // Используем СУЩЕСТВУЮЩУЮ таблицу ChatMessagesTable
  const msg = await ChatMessagesTable.create(ctx, {
    userId: ctx.user.id,  // Реальные поля из схемы таблицы
    chainKey: 'test',
    agentId: 'test',
    agentKey: 'test',
    role: 'user',
    content: 'Тест',
    isVisible: true
  })
  break

// ❌ НЕПРАВИЛЬНО - пишем новую функцию в тесте
case 'fake_calculator':
  // Это НЕ тест существующего кода, это новая логика!
  const add = (a, b) => a + b
  const result = add(2, 3)

  if (result !== 5) {
    throw new Error('Failed')
  }
  break

// ❌ НЕПРАВИЛЬНО - тестируем несуществующий API
case 'nonexistent_api':
  const result = await apiThatDoesNotExist.run(ctx)
  break
```

**Как правильно писать тесты**:

1. **Посмотрите на структуру проекта**:

   - Какие таблицы в `/tables/`?
   - Какие API в `/api/`?
   - Какие функции в `/shared/`?

2. **Для каждой таблицы напишите тесты**:

   - Создание записи
   - Поиск записей
   - Обновление записей
   - Специфичные операции

3. **Для каждого API endpoint напишите тест**:

   - Успешный сценарий
   - Обработка ошибок
   - Валидация параметров

4. **Для ключевой бизнес-логики напишите тесты**:
   - Проверка алгоритмов
   - Валидация данных
   - Форматирование

---

## Best Practices для Unit-AI

### ✅ Делайте

1. **Возвращайте структурированный JSON**:

```json
{
  "summary": { "success": true, "total": 20, "passed": 20 },
  "results": [...]
}
```

2. **Включайте timestamp**:

```json
{
  "timestamp": "2025-11-04T12:34:56.789Z"
}
```

3. **Добавляйте project identifier**:

```json
{
  "project": "your-project-name"
}
```

4. **Логируйте запуски**:

```typescript
ctx.account.log('Unit-AI tests executed', {
  level: 'info',
  json: { passed, failed, duration }
})
```

### ❌ Не делайте

1. **Не возвращайте HTML** — только JSON (кроме wrapper страницы)
2. **Не требуйте взаимодействия** — все автоматически
3. **Не блокируйте выполнение** — быстрые тесты
4. **Не игнорируйте ошибки** — все в JSON
5. **Не пишите тестовый код "от балды"** — тестируйте РЕАЛЬНЫЙ код проекта
6. **Не импортируйте роуты напрямую в web/tests/ai.tsx** — используйте отдельный API файл

### ⚠️ Избегайте циклических зависимостей

**Проблема**:

```
web/tests/ai.tsx
  → импортирует api/chat.ts
    → который импортирует tables/chat.table.ts
      → который может косвенно зависеть от других файлов
        → которые импортируют web/tests/ai.tsx
          → ЦИКЛИЧЕСКАЯ ЗАВИСИМОСТЬ!
```

**Решение**:

```
web/tests/ai.tsx (минимальный)
  → вызывает api/tests/run-tests/run-all.ts
    → который импортирует api/chat.ts и tables/*.table.ts
    → НЕТ циклических зависимостей!
```

**Структура файлов**:

- `web/tests/ai.tsx` — простой wrapper (10-20 строк)
- `api/tests/run-tests/run-all.ts` — вся логика тестов
- `api/tests/run-tests/run-single.ts` — тесты для интерактивной страницы ./web/tests

---

## Асинхронная загрузка AI-страницы с прелоадером

### Проблема с таймаутом

**Типичная проблема**: При запуске всех тестов синхронно на сервере, выполнение может занять 30-60 секунд, что превышает стандартный таймаут HTTP-запроса (20 секунд). Это приводит к ошибке:

```
UGC run exceeded timeout of 20000ms
```

### Решение: Асинхронная загрузка с прелоадером

Вместо синхронного выполнения тестов при загрузке страницы, используйте асинхронный подход:

1. **Страница загружается мгновенно** с прелоадером
2. **JavaScript в браузере** запускает тесты асинхронно
3. **Прогресс отображается** в реальном времени
4. **Результаты показываются** после завершения

### Реализация AI-страницы с прелоадером

**Файл**: `web/tests/ai.tsx`

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import { apiGetTestsListRoute } from './api/tests/run-tests/list'
import { apiRunSingleTestRoute } from './api/tests/run-tests/run-single'

export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Unit-AI Tests - Название проекта</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Стили прелоадера */}
        <style>{`
          body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            margin: 0;
          }

          /* Прелоадер */
          .loading {
            text-align: center;
            padding: 40px;
            font-size: 18px;
          }

          .spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Результаты */
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #404040;
          }

          /* Ошибки */
          .error {
            color: #ff6b6b;
            background: #3d1f1f;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ff6b6b;
            margin: 20px 0;
          }
        `}</style>
      </head>

      <body>
        <div id="content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Выполнение тестов... Это может занять до минуты.</p>
          </div>
        </div>

        {/* Асинхронный запуск тестов в браузере */}
        <script>{`
          async function runTests() {
            try {
              // ✅ Используем withProjectRoot(route.url()) для получения правильных URL
              const response = await fetch('${withProjectRoot(apiGetTestsListRoute.url())}');
              const testsList = await response.json();

              if (!testsList.success) {
                throw new Error('Failed to get tests list');
              }

              const startTime = Date.now();
              const allResults = [];

              // Запускаем каждый тест по отдельности (избегаем таймаута)
              for (const category of testsList.categories) {
                for (const test of category.tests) {
                  const testStartTime = Date.now();

                  try {
                    const testResponse = await fetch('${withProjectRoot(apiRunSingleTestRoute.url())}', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        category: category.name,
                        testName: test.name
                      })
                    });

                    const testResult = await testResponse.json();

                    if (testResult.success) {
                      allResults.push({
                        category: category.name,
                        test: test.name,
                        description: test.description,
                        status: 'passed',
                        duration: testResult.duration || (Date.now() - testStartTime)
                      });
                    } else {
                      allResults.push({
                        category: category.name,
                        test: test.name,
                        description: test.description,
                        status: 'failed',
                        error: testResult.error,
                        duration: testResult.duration || (Date.now() - testStartTime)
                      });
                    }
                  } catch (error) {
                    allResults.push({
                      category: category.name,
                      test: test.name,
                      description: test.description,
                      status: 'failed',
                      error: error.message,
                      duration: Date.now() - testStartTime
                    });
                  }
                }
              }

              const totalDuration = Date.now() - startTime;
              const passed = allResults.filter(r => r.status === 'passed').length;
              const failed = allResults.filter(r => r.status === 'failed').length;

              const finalResult = {
                timestamp: new Date().toISOString(),
                project: 'your-project-name',
                summary: {
                  total: allResults.length,
                  passed,
                  failed,
                  duration: totalDuration,
                  success: failed === 0
                },
                results: allResults
              };

              // Отображаем результаты
              document.getElementById('content').innerHTML = '<pre>' + JSON.stringify(finalResult, null, 2) + '</pre>';
            } catch (error) {
              // Отображение ошибок
              document.getElementById('content').innerHTML = '<div class="error"><h2>Ошибка при выполнении тестов</h2><p>' + error.message + '</p><pre>' + error.stack + '</pre></div>';
            }
          }

          // Запускаем тесты автоматически при загрузке страницы
          runTests();
        `}</script>
      </body>
    </html>
  )
})

export default testsAiPageRoute
```

### Преимущества этого подхода

✅ **Нет таймаутов**:

- Страница загружается мгновенно
- Тесты выполняются асинхронно в браузере
- Каждый тест — отдельный HTTP запрос (не превышает таймаут)

✅ **Результат**:

- Анимированный спиннер при загрузке
- Информативное сообщение "Выполнение тестов..."
- Стилизованное отображение результатов

✅ **Обработка ошибок**:

- Отображение ошибок с stack trace
- Понятные сообщения об ошибках

✅ **Правильный роутинг**:

- Использование `withProjectRoot(route.url())` согласно @002-routing.md
- Импорт роутов из API файлов
- Отсутствие хардкода URL

### Стилизация прелоадера

**CSS для прелоадера** (включён в пример выше):

```css
/* Контейнер прелоадера */
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
}

/* Анимированный спиннер */
.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

### Стилизация результатов

```css
/* JSON результаты */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #2d2d2d;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #404040;
}

/* Ошибки */
.error {
  color: #ff6b6b;
  background: #3d1f1f;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ff6b6b;
  margin: 20px 0;
}
```

### Как работает асинхронная загрузка

**Поток выполнения**:

```
1. Пользователь/AI открывает ./web/tests/ai
   ↓
2. HTML страница загружается мгновенно (< 100ms)
   ↓
3. Отображается прелоадер с анимацией
   ↓
4. JavaScript запускает fetch запросы:
   - GET ./api/tests/run-tests/list → получает список всех тестов
   - POST ./api/tests/run-tests/run-single (для каждого теста)
   ↓
5. Тесты выполняются последовательно
   ↓
6. Результаты агрегируются в браузере
   ↓
7. Финальный JSON отображается на странице
```

### Пример финального JSON

```json
{
  "timestamp": "2025-11-10T00:26:50.309Z",
  "project": "partnership",
  "summary": {
    "total": 37,
    "passed": 37,
    "failed": 0,
    "duration": 29304,
    "success": true
  },
  "results": [
    {
      "category": "database",
      "test": "settings_table_exists",
      "description": "Проверка существования таблицы PartnershipSettings",
      "status": "passed",
      "duration": 285
    },
    {
      "category": "api",
      "test": "get_settings_list",
      "description": "GET ./api/settings/list",
      "status": "passed",
      "duration": 18
    }
  ]
}
```

### Сравнение подходов

| Характеристика        | Старый подход  | Новый подход (с прелоадером) |
| --------------------- | -------------- | ---------------------------- |
| **Загрузка страницы** | 30-60 секунд   | < 100 мс                     |
| **Таймауты**          | ❌ Часто       | ✅ Никогда                   |
| **Загрузка**          | ⚠️ Белый экран | ✅ Прелоадер                 |
| **Ошибки**            | ⚠️ HTTP 500    | ✅ Детальное отображение     |
| **Прогресс**          | ❌ Нет         | ✅ Анимация загрузки         |

### Best Practices для AI-страницы

✅ **Используйте асинхронную загрузку**:

- Страница загружается мгновенно
- Тесты запускаются в JavaScript

✅ **Добавьте прелоадер**:

- Анимированный спиннер
- Информативное сообщение

✅ **Правильный роутинг**:

- Импортируйте роуты: `import { apiGetTestsListRoute } from './api/tests/run-tests/list'`
- Используйте `withProjectRoot(route.url())`: `fetch('${withProjectRoot(apiGetTestsListRoute.url())}')`
- НЕ используйте хардкод URL: ❌ `fetch('./api/tests/run-tests/list')`

✅ **Обработка ошибок**:

- Отображение с деталями
- Stack trace для отладки

✅ **Стилизация**:

- Тёмная тема для JSON
- Подсветка синтаксиса через `<pre>`
- Rounded corners и borders для современного вида

### Пример с расширенным прелоадером

Для отображения прогресса можно добавить процент выполнения:

```typescript
<script>{`
  async function runTests() {
    try {
      const response = await fetch('${withProjectRoot(apiGetTestsListRoute.url())}');
      const testsList = await response.json();

      if (!testsList.success) {
        throw new Error('Failed to get tests list');
      }

      const startTime = Date.now();
      const allResults = [];

      // Подсчитываем общее количество тестов
      const totalTestsCount = testsList.categories.reduce((sum, cat) => sum + cat.tests.length, 0);
      let completedCount = 0;

      // Запускаем каждый тест
      for (const category of testsList.categories) {
        for (const test of category.tests) {
          const testStartTime = Date.now();

          try {
            const testResponse = await fetch('${apiRunSingleTestRoute.url()}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category: category.name,
                testName: test.name
              })
            });

            const testResult = await testResponse.json();

            if (testResult.success) {
              allResults.push({
                category: category.name,
                test: test.name,
                description: test.description,
                status: 'passed',
                duration: testResult.duration || (Date.now() - testStartTime)
              });
            } else {
              allResults.push({
                category: category.name,
                test: test.name,
                description: test.description,
                status: 'failed',
                error: testResult.error,
                duration: testResult.duration || (Date.now() - testStartTime)
              });
            }
          } catch (error) {
            allResults.push({
              category: category.name,
              test: test.name,
              description: test.description,
              status: 'failed',
              error: error.message,
              duration: Date.now() - testStartTime
            });
          }

          // Обновляем прогресс
          completedCount++;
          const progress = Math.round((completedCount / totalTestsCount) * 100);
          document.getElementById('content').innerHTML =
            '<div class="loading"><div class="spinner"></div><p>Выполнение тестов... ' +
            progress + '% (' + completedCount + '/' + totalTestsCount + ')</p></div>';
        }
      }

      const totalDuration = Date.now() - startTime;
      const passed = allResults.filter(r => r.status === 'passed').length;
      const failed = allResults.filter(r => r.status === 'failed').length;

      const finalResult = {
        timestamp: new Date().toISOString(),
        project: 'your-project-name',
        summary: {
          total: allResults.length,
          passed,
          failed,
          duration: totalDuration,
          success: failed === 0
        },
        results: allResults
      };

      // Отображаем финальный результат
      document.getElementById('content').innerHTML = '<pre>' + JSON.stringify(finalResult, null, 2) + '</pre>';
    } catch (error) {
      document.getElementById('content').innerHTML =
        '<div class="error"><h2>Ошибка при выполнении тестов</h2><p>' +
        error.message + '</p><pre>' + error.stack + '</pre></div>';
    }
  }

  // Автоматический запуск при загрузке
  runTests();
`}</script>
      </body>
    </html>
  )
})

export default testsAiPageRoute
```

### Ключевые моменты реализации

1. **Мгновенная загрузка страницы**:

   - Страница отдаёт HTML сразу, без ожидания тестов
   - Прелоадер показывается моментально

2. **Правильное использование роутинга** (согласно @002-routing.md):

   ```typescript
   // ✅ ПРАВИЛЬНО - импортируем роуты
   import { apiGetTestsListRoute } from './api/tests/run-tests/list'
   import { apiRunSingleTestRoute } from './api/tests/run-tests/run-single'

   // ✅ ПРАВИЛЬНО - используем withProjectRoot(route.url())
   fetch('${withProjectRoot(apiGetTestsListRoute.url())}')
   fetch('${apiRunSingleTestRoute.url()}')

   // ❌ НЕПРАВИЛЬНО - хардкод URL
   fetch('./dev/partnership/api/tests/run-tests/list')
   ```

3. **Асинхронное выполнение**:

   - Каждый тест — отдельный POST запрос
   - Не превышает таймаут (каждый тест < 20 секунд)

4. **Обновление прогресса** (опционально):

   - Показывает процент выполнения
   - Отображает количество завершённых тестов

5. **Обработка ошибок**:
   - Try-catch для каждого теста
   - Отображение ошибок

### Визуальные состояния

**1. Начальная загрузка**:

```
┌─────────────────────────────┐
│         ⟳ (spinner)         │
│                             │
│  Выполнение тестов...       │
│  Это может занять до минуты.│
└─────────────────────────────┘
```

**2. В процессе (с прогрессом)**:

```
┌─────────────────────────────┐
│         ⟳ (spinner)         │
│                             │
│  Выполнение тестов...       │
│  45% (17/37)                │
└─────────────────────────────┘
```

**3. Завершение (JSON результаты)**:

```
┌─────────────────────────────┐
│ {                           │
│   "timestamp": "2025-...",  │
│   "summary": {              │
│     "total": 37,            │
│     "passed": 37,           │
│     "failed": 0,            │
│     "success": true         │
│   },                        │
│   "results": [...]          │
│ }                           │
└─────────────────────────────┘
```

**4. Ошибка**:

```
┌─────────────────────────────┐
│ ⚠ Ошибка при выполнении     │
│   тестов                    │
│                             │
│ Failed to get tests list    │
│                             │
│ Error: Failed to get...    │
│    at runTests (ai.tsx:67)  │
└─────────────────────────────┘
```

### Отличия от старого подхода

**Старый подход** (синхронный, с таймаутами):

```typescript
// ❌ ПРОБЛЕМА - синхронное выполнение
export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  const result = await apiRunAllTestsRoute.run(ctx)  // ← 40+ секунд!
  // Timeout error после 20 секунд

  return (
    <html>
      <body>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </body>
    </html>
  )
})
```

**Новый подход** (асинхронный, с прелоадером):

```typescript
// ✅ РЕШЕНИЕ - асинхронная загрузка
export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <body>
        <div id="content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Выполнение тестов...</p>
          </div>
        </div>

        <script>{`
          // Тесты запускаются в браузере асинхронно
          async function runTests() {
            // ... запуск тестов по одному
          }
          runTests();
        `}</script>
      </body>
    </html>
  )
})
```

### Когда использовать этот подход

✅ **Используйте AI-страницу с прелоадером, если**:

- У вас более 20 тестов
- Выполнение всех тестов занимает > 15 секунд
- Вы сталкиваетесь с таймаутами
- Нужен удобный интерфейс для JSON-страницы

⚠️ **Можно использовать простой подход, если**:

- Тестов меньше 10
- Выполнение занимает < 10 секунд
- Таймауты не возникают

### Чек-лист для AI-страницы с прелоадером

- [ ] ✅ Страница загружается мгновенно
- [ ] ✅ Прелоадер отображается сразу
- [ ] ✅ Тесты запускаются асинхронно в JavaScript
- [ ] ✅ Используется `withProjectRoot(route.url())` вместо хардкода
- [ ] ✅ Каждый тест — отдельный HTTP запрос
- [ ] ✅ Обработка ошибок в UI
- [ ] ✅ Финальный JSON правильно форматирован
- [ ] ✅ Опционально: отображение прогресса выполнения

---

**Версия**: 1.4
**Дата**: 2025-11-10
**Последнее обновление**: Добавлен раздел об асинхронной загрузке AI-страницы с прелоадером и правильным использованием роутинга согласно @002-routing.md. Описано решение проблемы таймаутов для JSON-страниц.
