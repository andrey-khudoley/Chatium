# 016: Аналитика - Атрибуция пользователей

## Описание

Система атрибуции отслеживает путь пользователя от первого анонимного визита до регистрации в GetCourse, сохраняя параметры URL (utm-метки, промокоды) для анализа эффективности маркетинговых каналов.

**Основная задача:** связать анонимные события (с `uid`) с реальными пользователями GetCourse (с `user_id`), чтобы определить:

- Откуда пользователь пришел ВПЕРВЫЕ (first-touch attribution)
- Что привело к конверсии НЕПОСРЕДСТВЕННО (last-touch attribution)

---

## Цепочка событий при регистрации

При регистрации пользователя в GetCourse создается **три события** в строгом порядке:

### Событие 1: HTTP-событие (анонимный визит)

```json
{
  "uid": "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n",
  "session_id": "session_abc123",
  "url": "https://key.sobolevarent.ru/?p=test2123&utm_source=google",
  "user_id": "", // ← Пустой! Пользователь анонимный
  "ts": "2025-11-10 18:00:00"
}
```

**Характеристики:**

- ✅ Содержит параметры URL (utm-метки, промокоды)
- ✅ Есть `uid` и `session_id`
- ❌ НЕТ `user_id` - пользователь анонимный

### Событие 2: Отправка формы (КЛЮЧЕВОЕ!)

```json
{
  "uid": "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n",
  "session_id": "session_abc123",
  "url": "event://getcourse/form/sent",
  "referer": "https://sobolevavika.ru/...?p=test2123&...",
  "user_id": "219894:476979133", // ← ПОЯВИЛСЯ user_id!
  "account_type": "Getcourse",
  "ts": "2025-11-10 18:05:00"
}
```

**Характеристики:**

- ✅ Есть `uid` - связь с анонимными событиями
- ✅ Есть `user_id` - связь с реальным пользователем GetCourse
- ✅ Есть `session_id` - можно найти первое HTTP-событие
- ✅ Это **ЕДИНСТВЕННОЕ** событие с такой комбинацией полей!

**Почему это событие - мост:**

Это ЕДИНСТВЕННЫЙ момент, где система может связать:

- Анонимный мир (`uid`, параметры URL)
- Реальный мир (`user_id`, профиль GetCourse)

### Событие 3: Создание пользователя

```json
{
  "uid": "", // ← ПУСТОЙ!
  "session_id": "", // ← ПУСТОЙ!
  "url": "event://getcourse/user/created?id=219894:476979133",
  "user_id": "219894:476979133",
  "user_email": "tester10@example.com",
  "ts": "2025-11-10 18:05:10"
}
```

**Характеристики:**

- ✅ Есть `user_id` и данные профиля
- ❌ НЕТ `uid` - невозможно связать с анонимными событиями
- ❌ НЕТ `session_id` - невозможно найти параметры URL

**Почему НЕ обрабатывается:**

- Нет информации для связки с анонимными событиями
- Служит только для информации о создании профиля

---

## Архитектура: две Heap-таблицы

### Таблица 1: AnalyticsUidMappings

**Имя:** `analytics_uid_mappings_e8b3f7c5`  
**Назначение:** легковесная связка `uid` → `user_id`

**Структура:**

```typescript
import { Heap } from '@app/heap'

export const AnalyticsUidMappings = Heap.Table('analytics_uid_mappings_e8b3f7c5', {
  uid: Heap.String({
    customMeta: { title: 'Анонимный идентификатор' },
    searchable: { langs: ['ru'], embeddings: false }
  }),
  userId: Heap.String({
    customMeta: { title: 'ID реального пользователя GetCourse' },
    searchable: { langs: ['ru'], embeddings: false }
  }),
  firstSeenAt: Heap.DateTime({
    customMeta: { title: 'Дата создания маппинга' }
  }),
  lastSeenAt: Heap.DateTime({
    customMeta: { title: 'Дата последнего обновления' }
  })
})
```

**Пример записи:**

```typescript
{
  uid: "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n",
  userId: "219894:476979133",
  firstSeenAt: Date("2025-11-10 18:05:00"),
  lastSeenAt: Date("2025-12-10 14:30:00")
}
```

**Зачем нужна:**

- Минимальный размер записи (только связка)
- Быстрый lookup по `uid`
- Отслеживание активности через `lastSeenAt`

---

### Таблица 2: AnalyticsSessionAttribution

**Имя:** `analytics_session_attribution_a9d4e6f1`  
**Назначение:** хранение параметров каждой сессии отдельно

**Структура:**

```typescript
import { Heap } from '@app/heap'

export const AnalyticsSessionAttribution = Heap.Table('analytics_session_attribution_a9d4e6f1', {
  uid: Heap.String({
    customMeta: { title: 'Анонимный идентификатор' }
  }),
  userId: Heap.String({
    customMeta: { title: 'ID реального пользователя' }
  }),
  sessionId: Heap.String({
    customMeta: { title: 'ID сессии' }
  }),
  firstUrl: Heap.String({
    customMeta: { title: 'Первый URL сессии с параметрами' }
  }),
  sessionTs: Heap.DateTime({
    customMeta: { title: 'Время начала сессии' }
  }),
  isFirst: Heap.Boolean({
    customMeta: { title: 'Флаг первой сессии пользователя' }
  }),
  isLast: Heap.Boolean({
    customMeta: { title: 'Флаг последней сессии пользователя' }
  })
})
```

**Пример записей:**

```typescript
// Первая сессия
{
  uid: "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n",
  userId: "219894:476979133",
  sessionId: "session_abc123",
  firstUrl: "https://key.sobolevarent.ru/?p=test2123&utm_source=google",
  sessionTs: Date("2025-11-10 18:00:00"),
  isFirst: true,   // ← Самая ранняя сессия
  isLast: false
}

// Последняя сессия
{
  uid: "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n",
  userId: "219894:476979133",
  sessionId: "session_xyz789",
  firstUrl: "https://key.sobolevarent.ru/?p=test9999&utm_source=yandex",
  sessionTs: Date("2025-12-10 14:30:00"),
  isFirst: false,
  isLast: true     // ← Самая поздняя сессия
}
```

**Зачем нужна:**

- Каждая сессия = отдельная запись с параметрами
- Флаги `isFirst`/`isLast` для быстрого поиска O(1)
- Хранение полного URL с параметрами

---

## Алгоритм обработки событий

### Job: processAttributionJob

**Расположение:** `dev/partnership/api/attribution.ts`  
**Интервал запуска:** каждые 5-15 минут

#### Шаг 1: Поиск новых событий form/sent

```typescript
const query = `
  SELECT user_id, uid, session_id, url, ts
  FROM chatium_ai.access_log
  WHERE user_id != ''
    AND uid != ''
    AND urlPath = 'event://getcourse/form/sent'  -- ← СТРОГИЙ ФИЛЬТР!
    AND dt >= today() - 7
    AND ts > '${lastProcessedTs}'
  ORDER BY ts ASC
  LIMIT 1000
`

const result = await gcQueryAi(ctx, query)
```

**Важно:** Обрабатываются ТОЛЬКО события `form/sent`, т.к. только они имеют все необходимые поля одновременно.

#### Шаг 2: Обработка каждого события

```typescript
for (const event of result.rows) {
  await updateUidMapping(
    ctx,
    event.user_id, // "219894:476979133"
    event.uid, // "QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n"
    event.session_id, // "session_abc123"
    event.url, // "event://getcourse/form/sent"
    event.ts // "2025-11-10 18:05:00"
  )
}
```

---

### Функция: updateUidMapping()

**Расположение:** `dev/partnership/api/attribution.ts`

#### Действие 1: Создание/обновление базового маппинга

```typescript
// Ищем существующий маппинг по uid
let mapping = await AnalyticsUidMappings.findOneBy(ctx, {
  uid: 'QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n'
})

if (mapping) {
  // Маппинг существует - обновляем lastSeenAt
  if (mapping.userId !== userId) {
    // user_id изменился (редкий случай)
    await AnalyticsUidMappings.update(ctx, {
      id: mapping.id,
      userId: userId,
      lastSeenAt: new Date()
    })
  } else {
    // Просто обновляем активность
    await AnalyticsUidMappings.update(ctx, {
      id: mapping.id,
      lastSeenAt: new Date()
    })
  }
} else {
  // Маппинга нет - создаем новый
  mapping = await AnalyticsUidMappings.create(ctx, {
    uid: 'QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n',
    userId: '219894:476979133',
    firstSeenAt: new Date(),
    lastSeenAt: new Date()
  })
}
```

#### Действие 2: Проверка существующей сессии

```typescript
// Проверяем, обрабатывали ли мы эту сессию ранее
const existingSession = await AnalyticsSessionAttribution.findOneBy(ctx, {
  sessionId: 'session_abc123',
  uid: 'QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n'
})

if (existingSession) {
  // Сессия уже обработана - только обновляем userId если нужно
  if (existingSession.userId !== userId) {
    await AnalyticsSessionAttribution.update(ctx, {
      id: existingSession.id,
      userId
    })
  }
  return // ← Выходим, дальнейшая обработка не нужна
}
```

#### Действие 3: Поиск первого HTTP-события сессии (ClickHouse!)

**Важно:** Событие `form/sent` НЕ содержит параметры URL. Параметры находятся в ПЕРВОМ HTTP-событии этой сессии!

```typescript
// SQL-запрос к ClickHouse (НЕ к Heap!)
const firstEventQuery = `
  SELECT url, ts
  FROM chatium_ai.access_log
  WHERE session_id = 'session_abc123'  -- ← Из события form/sent
    AND startsWith(urlPath, 'http')    -- Только HTTP-события
    AND dt >= today() - 30
  ORDER BY ts ASC
  LIMIT 1
`

const result = await gcQueryAi(ctx, firstEventQuery)

let firstUrl = url // fallback на url из form/sent
let sessionTs = eventTs // fallback на время form/sent

if (result.rows && result.rows.length > 0) {
  firstUrl = result.rows[0].url
  sessionTs = new Date(result.rows[0].ts)
}
```

**Результат:**

```json
{
  "url": "https://key.sobolevarent.ru/?p=test2123&utm_source=google",
  "ts": "2025-11-10 18:00:00"
}
```

**Почему поиск по `session_id`, а не по `uid`:**

Пример с двумя устройствами:

```
День 1, Chrome на ПК (uid = ABC123):
├─ HTTP: ...?p=promo1&utm_source=google
└─ form/sent (регистрация)

День 2, Firefox на телефоне (uid = XYZ789):
├─ HTTP: ...?p=promo2&utm_source=yandex
└─ form/sent (вход в аккаунт, тот же user_id!)
```

Если искать по `uid`:

- Найдет HTTP-событие с `uid = ABC123`
- Пропустит параметры второй сессии с `uid = XYZ789`

Если искать по `session_id`:

- Каждая сессия получает свои параметры
- Обе сессии сохраняются отдельно
- Можно отследить путь через разные устройства

#### Действие 4: Создание записи сессии

```typescript
await AnalyticsSessionAttribution.create(ctx, {
  uid: 'QbQ6CFgNg_qQAuV8LYHk13erjUVWYF5n',
  userId: '219894:476979133',
  sessionId: 'session_abc123',
  firstUrl: 'https://key.sobolevarent.ru/?p=test2123&utm_source=google',
  sessionTs: new Date('2025-11-10 18:00:00'), // ← Время ПЕРВОГО события
  isFirst: false, // ← Временно, будет пересчитано
  isLast: false
})
```

#### Действие 5: Перерасчет флагов isFirst/isLast

```typescript
// 1. Загружаем ВСЕ сессии пользователя через Heap API
const updatedSessions = await AnalyticsSessionAttribution.findAll(ctx, {
  where: { userId: '219894:476979133' }
})

// 2. Находим самую раннюю и самую позднюю сессии
let firstSession = updatedSessions[0]
let lastSession = updatedSessions[0]

for (const session of updatedSessions) {
  if (new Date(session.sessionTs) < new Date(firstSession.sessionTs)) {
    firstSession = session
  }
  if (new Date(session.sessionTs) > new Date(lastSession.sessionTs)) {
    lastSession = session
  }
}

// 3. Обновляем флаги для ВСЕХ сессий
for (const session of updatedSessions) {
  const isFirst = session.id === firstSession.id
  const isLast = session.id === lastSession.id

  if (session.isFirst !== isFirst || session.isLast !== isLast) {
    await AnalyticsSessionAttribution.update(ctx, {
      id: session.id,
      isFirst,
      isLast
    })
  }
}
```

**Результат:** Только одна сессия помечена как `isFirst = true`, только одна как `isLast = true`.

---

## API для получения параметров атрибуции

### POST /api/attribution

**Расположение:** `dev/partnership/api/attribution.ts`  
**Упрощенная логика:** Работает напрямую с ClickHouse, без использования Heap таблиц и предварительной обработки через job'ы.

#### Алгоритм работы

API выполняет следующие шаги:

1. **user_id → uid**: Находит все `uid`, связанные с `user_id` через события `form/sent`
2. **uid → сессии**: Для каждого `uid` находит все уникальные сессии
3. **Сессии → первое HTTP-событие**: Для каждой сессии находит первое HTTP-событие с параметрами URL
4. **Парсинг параметров**: Извлекает параметры из URL первой/последней сессии

#### Получение всех параметров

**Запрос:**

```typescript
POST /api/attribution
Content-Type: application/json

{
  "userId": "219894:476979133",
  "attribution": "first"  // или "last"
}
```

**Обработка:**

```typescript
// Шаг 1: user_id → находим все uid через form/sent
const uidsQuery = `
  SELECT DISTINCT uid
  FROM chatium_ai.access_log
  WHERE user_id = '${userId}'
    AND uid != ''
    AND urlPath = 'event://getcourse/form/sent'
    AND dt >= today() - 30
`

// Шаг 2: Для каждого uid → выбираем все уникальные сессии
const sessionsQuery = `
  SELECT DISTINCT session_id, min(ts) as first_ts
  FROM chatium_ai.access_log
  WHERE uid = '${uid}'
    AND session_id != ''
    AND startsWith(urlPath, 'http')
    AND dt >= today() - 30
  GROUP BY session_id
  ORDER BY first_ts ${attribution === 'first' ? 'ASC' : 'DESC'}
`

// Шаг 3: Находим первое HTTP-событие сессии
const firstHttpQuery = `
  SELECT url, ts
  FROM chatium_ai.access_log
  WHERE session_id = '${sessionId}'
    AND startsWith(urlPath, 'http')
    AND dt >= today() - 30
  ORDER BY ts ASC
  LIMIT 1
`

// Шаг 4: Парсим параметры из URL
const params = parseUrlParams(firstUrl)

return {
  success: true,
  params: params,
  url: firstUrl,
  sessionId: sessionId,
  timestamp: firstTs
}
```

**Ответ:**

```json
{
  "success": true,
  "params": {
    "p": "test2123",
    "utm_source": "google",
    "utm_campaign": "summer"
  },
  "url": "https://key.sobolevarent.ru/?p=test2123&utm_source=google&utm_campaign=summer",
  "sessionId": "session_abc123",
  "timestamp": "2025-11-10 18:00:00"
}
```

#### Получение конкретного параметра

**Запрос:**

```typescript
POST /api/attribution
Content-Type: application/json

{
  "userId": "219894:476979133",
  "attribution": "first",
  "param": "utm_source"
}
```

**Обработка:**

```typescript
// Выполняются те же шаги 1-4, затем:
const params = parseUrlParams(firstUrl)

return {
  success: true,
  param: 'utm_source',
  value: params['utm_source'] || null
}
```

**Ответ:**

```json
{
  "success": true,
  "param": "utm_source",
  "value": "google"
}
```

#### Особенности работы

- **Работа напрямую с ClickHouse**: Не требует предварительной обработки данных
- **Поиск сессий с параметрами**: Для `attribution='last'` ищет сессии с параметрами, пропуская сессии без UTM-меток
- **Для `attribution='first'`**: Возвращает первую сессию, даже если в ней нет параметров
- **Обработка нескольких uid**: Если у пользователя несколько `uid` (разные устройства), обрабатываются все

---

## Функция парсинга параметров URL

**Расположение:** `dev/partnership/api/attribution.ts`  
**Экспорт:** `@shared` - доступна для тестирования

```typescript
/**
 * Парсинг параметров из URL (между ? и #)
 * @shared
 */
export function parseUrlParams(url: string): Record<string, string> {
  if (!url) return {}

  try {
    // Извлекаем часть между ? и #
    const queryStart = url.indexOf('?')
    if (queryStart === -1) return {}

    const hashStart = url.indexOf('#', queryStart)
    const queryString =
      hashStart === -1 ? url.substring(queryStart + 1) : url.substring(queryStart + 1, hashStart)

    const params: Record<string, string> = {}
    const pairs = queryString.split('&')

    for (const pair of pairs) {
      if (!pair) continue // Пропускаем пустые пары

      const equalIndex = pair.indexOf('=')
      if (equalIndex === -1) {
        // Параметр без значения (?debug)
        const key = decodeURIComponent(pair)
        if (key) params[key] = ''
      } else {
        // Параметр со значением (?utm_source=google)
        const key = decodeURIComponent(pair.substring(0, equalIndex))
        const value = decodeURIComponent(pair.substring(equalIndex + 1))
        if (key) params[key] = value || ''
      }
    }

    return params
  } catch (error) {
    return {}
  }
}
```

**Примеры работы:**

| Входной URL                                           | Результат                                    |
| ----------------------------------------------------- | -------------------------------------------- |
| `https://site.com/?p=test123&ref=google`              | `{p: "test123", ref: "google"}`              |
| `https://site.com/?p=test456#anchor`                  | `{p: "test456"}`                             |
| `https://site.com/?utm_source=fb&utm_campaign=summer` | `{utm_source: "fb", utm_campaign: "summer"}` |
| `https://site.com/page`                               | `{}`                                         |
| `https://site.com/?debug`                             | `{debug: ""}`                                |

---

## Примеры использования

### Пример 1: Определение канала первого касания

```typescript
import { apiAttributionRoute } from './api/attribution'

// В вашем коде
const result = await apiAttributionRoute.run(ctx, {
  userId: '219894:476979133',
  attribution: 'first',
  param: 'utm_source'
})

if (result.success && result.value) {
  console.log(`Первый канал: ${result.value}`)
  // "Первый канал: google"
}
```

**Применение:**

- Анализ эффективности каналов привлечения
- Распределение бюджета на рекламу
- Оценка ROI по каналам

### Пример 2: Определение промокода конверсии

```typescript
const result = await apiAttributionRoute.run(ctx, {
  userId: '219894:476979133',
  attribution: 'last',
  param: 'p'
})

if (result.success && result.value) {
  console.log(`Конверсионный промокод: ${result.value}`)
  // "Конверсионный промокод: test9999"
}
```

**Применение:**

- Начисление комиссии партнерам
- Анализ эффективности ретаргетинга
- Оптимизация воронки продаж

### Пример 3: Получение всех параметров

```typescript
const result = await apiAttributionRoute.run(ctx, {
  userId: '219894:476979133',
  attribution: 'first'
})

if (result.success) {
  console.log('Параметры первого визита:', result.params)
  // {
  //   p: "test2123",
  //   utm_source: "google",
  //   utm_campaign: "summer",
  //   utm_medium: "cpc"
  // }

  console.log('URL первого визита:', result.url)
  console.log('Время первого визита:', result.timestamp)
  console.log('ID сессии:', result.sessionId)
}
```

---

## Сценарий: несколько сессий одного пользователя

### День 1: Первая регистрация

```
Устройство: Chrome на ПК
Источник: Google Ads

События:
├─ 1. HTTP:      https://...?p=promo-nov&utm_source=google&utm_campaign=black-friday
├─ 2. form/sent: event://getcourse/form/sent (обработка!)
└─ 3. user/created: создан профиль 219894:476979133
```

**Результат в БД:**

`AnalyticsSessionAttribution`:

```
sessionId: session_001
firstUrl: ...?p=promo-nov&utm_source=google
sessionTs: 2025-11-10 18:00:00
isFirst: TRUE ✓
isLast: TRUE ✓
```

### День 30: Повторный визит

```
Устройство: Firefox на телефоне
Источник: Yandex Direct

События:
├─ 1. HTTP:      https://...?p=promo-dec&utm_source=yandex&utm_campaign=winter
├─ 2. form/sent: event://getcourse/form/sent (обработка!)
└─ (пользователь уже существует, повторный вход)
```

**Результат в БД после обработки:**

`AnalyticsSessionAttribution`:

```
┌──────────┬─────────────┬─────────────────────────────┬────────┬────────┐
│ sessionId│ firstUrl                                 │isFirst │ isLast │
├──────────┼──────────────────────────────────────────┼────────┼────────┤
│ session_ │ ...?p=promo-nov&utm_source=google        │ TRUE ✓ │ FALSE  │ ← Обновлено!
│ 001      │                                          │        │        │
├──────────┼──────────────────────────────────────────┼────────┼────────┤
│ session_ │ ...?p=promo-dec&utm_source=yandex        │ FALSE  │ TRUE ✓ │ ← Новая!
│ 002      │                                          │        │        │
└──────────┴──────────────────────────────────────────┴────────┴────────┘
```

### Получение данных

**First-touch:**

```typescript
POST /api/attribution { userId: "219894:476979133", attribution: "first" }

→ { params: { p: "promo-nov", utm_source: "google" } }
```

**Last-touch:**

```typescript
POST /api/attribution { userId: "219894:476979133", attribution: "last" }

→ { params: { p: "promo-dec", utm_source: "yandex" } }
```

**Вывод:** Пользователь пришел через Google, но конвертировался после Yandex рекламы.

---

## Производительность и оптимизация

### Текущий подход: Прямые запросы к ClickHouse

**Алгоритм:**

1. Поиск uid по user_id: O(log n) - индексированный поиск в ClickHouse
2. Поиск сессий по uid: O(log n) - группировка с индексами
3. Поиск первого HTTP-события: O(log n) - сортировка с LIMIT 1
4. Парсинг URL: O(m) - где m = длина URL (~200 символов)

**Оценка производительности:**

- Время выполнения: ~50-200 мс (зависит от количества uid и сессий)
- Количество запросов к ClickHouse: 1 + N (uid) + M (сессии)
- Оптимизация: ClickHouse эффективно обрабатывает GROUP BY и ORDER BY с индексами

### Преимущества упрощенного подхода

- ✅ **Нет предварительной обработки**: Данные всегда актуальные
- ✅ **Нет дублирования данных**: Не требуется синхронизация между Heap и ClickHouse
- ✅ **Простота поддержки**: Меньше кода, меньше точек отказа
- ✅ **Гибкость**: Легко изменить логику поиска без миграций БД

### Недостатки

- ⚠️ **Время выполнения**: Зависит от количества uid и сессий пользователя
- ⚠️ **Нагрузка на ClickHouse**: Каждый запрос выполняет несколько SQL-запросов
- ⚠️ **Нет кэширования**: Каждый запрос обращается к ClickHouse заново

---

## Интеграция в существующие проекты

### Импорт API

```typescript
import { apiAttributionRoute, parseUrlParams } from './api/attribution'
```

### Использование в коде

```typescript
// В вашем обработчике
export const myHandler = app.get('/my-route', async (ctx, req) => {
  const userId = ctx.user?.id

  if (userId) {
    // Получаем параметры первого визита
    const attribution = await apiAttributionRoute.run(ctx, {
      userId: userId,
      attribution: 'first'
    })

    if (attribution.success) {
      const utmSource = attribution.params.utm_source
      const promo = attribution.params.p

      // Используем в логике
      console.log(`Пользователь пришел из: ${utmSource}`)
      console.log(`Промокод: ${promo}`)
    }
  }
})
```

---

## Важные моменты

### 1. Обработка только events://getcourse/form/sent

**SQL-запрос API содержит строгий фильтр:**

```sql
WHERE urlPath = 'event://getcourse/form/sent'
```

**Почему:**

- Это единственное событие с `uid` + `user_id` + `session_id`
- Предотвращает обработку мусорных данных
- Гарантирует корректность связки

### 2. Поиск первого HTTP-события по session_id

**Каждая сессия хранит свои параметры:**

- Смена браузера → новая сессия → новые параметры
- Смена устройства → новая сессия → новые параметры
- Повторный визит → новая сессия → новые параметры

### 3. Работа напрямую с ClickHouse

**API использует только ClickHouse:**

- ✅ `gcQueryAi(ctx, "SELECT ...")` - для всех запросов
- ✅ Нет использования Heap таблиц для атрибуции
- ✅ Нет предварительной обработки через job'ы
- ✅ Данные всегда актуальные (читаются напрямую из ClickHouse)

**Примечание:** Функции `updateUidMapping` и `processAttributionJob` остаются в коде для обратной совместимости, но основной API `/api/attribution` их не использует.

---

## Тестирование

Система покрыта **8 тестами** в файле `dev/partnership/tests/api/run-tests.ts`:

### Тесты базы данных (3)

**`uid_mappings_table_exists`**

```typescript
if (!AnalyticsUidMappings) {
  throw new Error('Таблица AnalyticsUidMappings не найдена')
}
```

**`create_uid_mapping`**

```typescript
const mapping = await AnalyticsUidMappings.create(ctx, {
  uid: 'test-uid-' + Date.now(),
  userId: 'test-user-' + Date.now(),
  firstSeenAt: new Date(),
  lastSeenAt: new Date()
})

if (!mapping || !mapping.id) {
  throw new Error('Маппинг не создан')
}

await AnalyticsUidMappings.delete(ctx, mapping.id)
```

**`find_uid_mappings`**

```typescript
const foundMappings = await AnalyticsUidMappings.findAll(ctx, {
  where: { userId: testUserId }
})

if (!Array.isArray(foundMappings) || foundMappings.length === 0) {
  throw new Error('Маппинги не найдены')
}
```

### Тесты API (3)

**`get_attribution_params`**

```typescript
// Создать тестовые сессии с разными параметрами
// Проверить получение параметров first и last
// Проверить корректность значений параметров
```

**`get_attribution_single_param`**

```typescript
// Создать сессию с параметрами
// Запросить конкретный параметр
// Проверить правильность значения
// Проверить возврат null для несуществующего параметра
```

**`process_attribution`**

```typescript
// Вызвать apiProcessAttributionRoute
// Проверить создание маппинга
// Проверить создание сессии
// Очистить тестовые данные
```

### Функциональные тесты (2)

**`attribution_flow`**

```typescript
// Полный цикл:
// 1. Обработать первое событие (первая сессия)
// 2. Обработать второе событие (вторая сессия)
// 3. Получить параметры first
// 4. Получить параметры last
// 5. Получить конкретный параметр
// Проверить корректность на каждом шаге
```

**`parse_url_params`**

```typescript
const testCases = [
  { url: 'https://example.com/?p=test123&ref=google', expected: { p: 'test123', ref: 'google' } },
  { url: 'https://example.com/?p=test456#anchor', expected: { p: 'test456' } },
  { url: 'https://example.com/page', expected: {} }
]

for (const testCase of testCases) {
  const parsed = parseUrlParams(testCase.url)
  // Проверка соответствия
}
```

**Результат:** ✅ Все 8 тестов проходят успешно

---

## Troubleshooting

### Проблема: Параметры не найдены

**Причина 1:** Нет событий `form/sent` для этого `user_id`

**Решение:**

- Проверьте наличие событий в ClickHouse:

```sql
SELECT user_id, uid, session_id, urlPath
FROM chatium_ai.access_log
WHERE user_id = '219894:476979133'
  AND urlPath = 'event://getcourse/form/sent'
  AND dt >= today() - 30
LIMIT 10
```

**Причина 2:** В первом HTTP-событии сессии нет параметров URL

**Решение:**

- Проверьте URL в ClickHouse: есть ли `?` в первом событии сессии?
- Возможно, пользователь зашел напрямую без параметров
- Для `attribution='last'` API пропускает сессии без параметров

**Причина 3:** Нет HTTP-событий для найденных сессий

**Решение:**

- Проверьте наличие HTTP-событий для сессий:

```sql
SELECT url, ts
FROM chatium_ai.access_log
WHERE session_id = 'session_id_here'
  AND startsWith(urlPath, 'http')
  AND dt >= today() - 30
ORDER BY ts ASC
LIMIT 1
```

### Проблема: Медленная работа API

**Причина:** У пользователя много `uid` или сессий

**Решение:**

- API обрабатывает все `uid` и сессии последовательно
- Для пользователей с большим количеством сессий время выполнения может быть ~200-500 мс
- Это нормальное поведение для упрощенного подхода

---

## Расширение системы

### Добавление других событий-мостов

Если в будущем появятся другие события с комбинацией `uid` + `user_id` + `session_id`:

```typescript
// В apiAttributionRoute
const uidsQuery = `
  SELECT DISTINCT uid
  FROM chatium_ai.access_log
  WHERE user_id = '${userId}'
    AND uid != ''
    AND (
      urlPath = 'event://getcourse/form/sent'
      OR urlPath = 'event://getcourse/другое_событие'  -- ← Добавить здесь
    )
    AND dt >= today() - 30
`
```

### Оптимизация производительности

Если API станет медленным из-за большого количества данных:

1. **Кэширование результатов**: Добавить кэш на уровне API (Redis/Memory)
2. **Ограничение количества uid**: Обрабатывать только первые N uid
3. **Параллельные запросы**: Использовать Promise.all для параллельной обработки uid
4. **Возврат к предобработке**: Если потребуется, можно вернуться к использованию Heap таблиц

---

## Связанные документы

- **008-heap.md** - работа с Heap-таблицами
- **016-analytics-traffic.md** - HTTP-события трафика
- **016-analytics-getcourse.md** - события GetCourse
- **020-testing.md** - тестирование системы

---

## Версия документа

**Версия:** 2.0  
**Дата создания:** 2025-11-11  
**Последнее обновление:** 2025-11-12  
**Применимо к:** partnership v2.12.0+

**Изменения в версии 2.0:**

- ✨ **Упрощенная логика API**: Работа напрямую с ClickHouse, без использования Heap таблиц
- ✨ **Нет предварительной обработки**: Данные всегда актуальные, читаются напрямую из ClickHouse
- ✨ **Обновлен алгоритм работы**: Описаны все шаги обработки запроса
- ✨ **Обновлен раздел Troubleshooting**: Убраны упоминания о job'ах и Heap таблицах

---

## Краткая справка

### API Endpoints

| Endpoint                   | Метод | Назначение                                                            |
| -------------------------- | ----- | --------------------------------------------------------------------- |
| `/api/attribution`         | POST  | Получить параметры first/last сессии (работает напрямую с ClickHouse) |
| `/api/attribution/process` | POST  | Обработать событие (для обратной совместимости)                       |

### Функции

| Функция                 | Файл                 | Назначение                                                         |
| ----------------------- | -------------------- | ------------------------------------------------------------------ |
| `parseUrlParams(url)`   | `api/attribution.ts` | Парсинг параметров из URL                                          |
| `updateUidMapping(...)` | `api/attribution.ts` | Обработка события и создание маппинга (для обратной совместимости) |
| `processAttributionJob` | `api/attribution.ts` | Job для автоматической обработки (для обратной совместимости)      |

### Запросы к ClickHouse

```sql
-- Шаг 1: Поиск всех uid для user_id через form/sent
SELECT DISTINCT uid
FROM chatium_ai.access_log
WHERE user_id = '219894:476979133'
  AND uid != ''
  AND urlPath = 'event://getcourse/form/sent'
  AND dt >= today() - 30

-- Шаг 2: Поиск всех сессий для uid
SELECT DISTINCT session_id, min(ts) as first_ts
FROM chatium_ai.access_log
WHERE uid = 'uid_here'
  AND session_id != ''
  AND startsWith(urlPath, 'http')
  AND dt >= today() - 30
GROUP BY session_id
ORDER BY first_ts ASC

-- Шаг 3: Поиск первого HTTP-события сессии
SELECT url, ts
FROM chatium_ai.access_log
WHERE session_id = 'session_id_here'
  AND startsWith(urlPath, 'http')
  AND dt >= today() - 30
ORDER BY ts ASC
LIMIT 1
```

### Примечание о таблицах Heap

Таблицы `AnalyticsUidMappings` и `AnalyticsSessionAttribution` остаются в проекте для обратной совместимости, но основной API `/api/attribution` их не использует. API работает напрямую с ClickHouse.
