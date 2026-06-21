# GetCourse Аналитика - ClickHouse запросы

Исчерпывающее руководство по работе с событиями GetCourse через ClickHouse базу данных.

## Содержание

- [Основы работы с GetCourse](#основы-работы-с-getcourse)
- [Два способа работы с данными](#два-способа-работы-с-данными)
- [База данных ClickHouse](#база-данных-clickhouse)
- [Выполнение запросов](#выполнение-запросов)
- [События GetCourse](#события-getcourse)
- [SQL примеры запросов](#sql-примеры-запросов)
- [TypeScript примеры](#typescript-примеры)
- [Оптимизация запросов](#оптимизация-запросов)
- [Лучшие практики](#лучшие-практики)

---

## Основы работы с GetCourse

**GetCourse Аналитика** — система анализа событий образовательной платформы через ClickHouse.

### Архитектура

```
GetCourse Platform
     ↓
Webhooks/Events
     ↓
Chatium Analytics
     ↓
ClickHouse (chatium_ai.access_log)
     ↓
gcQueryAi() / queryAi() - SQL запросы
     ↓
Ваше приложение
```

---

## Два способа работы с данными

### 1. Настраиваемый GetCourse MCP Client (рекомендуется)

**Использование**: Работа с любым аккаунтом GetCourse, который настроит пользователь.

```typescript
import { gcQueryAi, integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installSupportedApp } from '@store/sdk'

// Проверка настройки
const isConfigured = await integrationIsEnabled(ctx)

// Установка плагина
await installSupportedApp(ctx, 'gc-mcp-server')

// Выполнение запросов к настроенному аккаунту
const result = await gcQueryAi(ctx, query)
```

**Преимущества**:

- ✅ Пользователь настраивает свой GetCourse аккаунт
- ✅ Данные из аккаунта пользователя, а не разработчика
- ✅ Каждый пользователь может работать со своим аккаунтом
- ✅ Настройка через веб-интерфейс (адрес сервера + API ключ)

**Когда использовать**:

- Приложение для клиентов (каждый работает со своим GetCourse)
- Мультиаккаунтные приложения
- SaaS решения

### 2. Аккаунт разработчика (быстрый старт)

**Использование**: Работа с фиксированным аккаунтом разработчика.

```typescript
import { queryAi } from '@traffic/sdk'

// Выполнение запросов к аккаунту разработчика
const result = await queryAi(ctx, query)
```

**Преимущества**:

- ✅ Не требует настройки от пользователя
- ✅ Быстрый старт разработки
- ✅ Подходит для внутренних инструментов

**Недостатки**:

- ❌ Все пользователи видят данные одного аккаунта (разработчика)
- ❌ Нет изоляции данных между пользователями

**Когда использовать**:

- Внутренние инструменты для одной компании
- Прототипирование и разработка
- Когда все работают с одним GetCourse аккаунтом

### Сравнительная таблица

| Аспект              | gcQueryAi (MCP Client)             | queryAi (Traffic SDK)  |
| ------------------- | ---------------------------------- | ---------------------- |
| **Источник данных** | Настроенный пользователем аккаунт  | Аккаунт разработчика   |
| **Настройка**       | Требуется установка плагина        | Не требуется           |
| **Изоляция**        | Каждый пользователь - свой аккаунт | Все видят один аккаунт |
| **Импорт**          | `@gc-mcp-server/sdk`               | `@traffic/sdk`         |
| **Использование**   | SaaS, клиентские приложения        | Внутренние инструменты |

### Ключевые компоненты

| Компонент                                   | Описание                                    |
| ------------------------------------------- | ------------------------------------------- |
| `@gc-mcp-server/sdk`                        | SDK для настраиваемого GetCourse MCP Client |
| `@traffic/sdk`                              | SDK для аккаунта разработчика               |
| `gcQueryAi(ctx, query)`                     | Запросы к настроенному аккаунту             |
| `queryAi(ctx, query)`                       | Запросы к аккаунту разработчика             |
| `integrationIsEnabled(ctx)`                 | Проверка настройки MCP Client               |
| `installSupportedApp(ctx, 'gc-mcp-server')` | Установка плагина                           |
| `chatium_ai.access_log`                     | Таблица событий                             |
| ClickHouse                                  | База данных                                 |

---

## База данных ClickHouse

### Таблица access_log

Основная таблица всех событий GetCourse.

#### Ключевые колонки

```sql
-- Время
ts DateTime              -- Время события UTC
dt Date                  -- Дата события (партиция)
ts64 DateTime64(3)       -- Высокоточное время

-- Событие
urlPath String           -- Адрес события (event://getcourse/...)

-- Параметры события (строковые)
action_param1 String     -- Основной параметр (ID заказа, ID пользователя)
action_param2 String     -- Дополнительный параметр
action_param3 String     -- Дополнительный параметр

-- Числовые параметры (целые)
action_param1_int Int32
action_param2_int Int32
action_param3_int Int32

-- Числовые параметры (float)
action_param1_float Float32   -- Числа с плавающей точкой (суммы)
action_param2_float Float32
action_param3_float Float32

-- Массивы
action_param1_arrstr Array(String)  -- Массивы строк (ID предложений)

-- Пользователь
user_id String           -- ID пользователя GetCourse
resolved_user_id String  -- Главный ID пользователя (стабильный)
user_email String        -- Email
user_phone String        -- Телефон
user_first_name String   -- Имя
user_last_name String    -- Фамилия

-- Метаданные
title String             -- Название (предложения, группы)
action_params String     -- JSON параметры

-- GetCourse IDs
gc_visit_id Int64        -- ID визита
gc_visitor_id Int64      -- ID посетителя
gc_session_id Int64      -- ID сессии
```

#### ⚠️ Важно: resolved_user_id vs user_id

GetCourse использует два типа идентификаторов:

- `user_id` — может меняться между сессиями
- `resolved_user_id` — главный, стабильный ID пользователя

**Всегда используйте `COALESCE(resolved_user_id, user_id)`** для точного подсчета:

```sql
-- ✅ Правильно
SELECT COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as users_count
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/created'

-- ❌ Неправильно (может дать неточные результаты)
SELECT COUNT(DISTINCT user_id) as users_count
FROM chatium_ai.access_log
```

---

## Выполнение запросов

### Способ 1: gcQueryAi - Настраиваемый GetCourse (рекомендуется)

**Использование для клиентских приложений** - данные из настроенного пользователем аккаунта.

```typescript
import { gcQueryAi, integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installSupportedApp } from '@store/sdk'

// Проверка настройки
export const indexRoute = app.html('/', async (ctx) => {
  const isConfigured = await integrationIsEnabled(ctx)

  if (!isConfigured) {
    // Показываем форму установки плагина
    return <SetupPage />
  }

  return <MainApp />
})

// Установка плагина
export const installRoute = app.post('/install-plugin', async (ctx) => {
  const result = await installSupportedApp(ctx, 'gc-mcp-server')
  return { success: true, result }
})

// Выполнение запросов
export const apiGetOrdersRoute = app.get('/orders', async (ctx, req) => {
  const result = await gcQueryAi(ctx, sqlQuery)
  return { success: true, data: result.rows }
})
```

**Формат ответа**:

```typescript
interface QueryResult {
  rows: Array<Record<string, any>> // Массив строк результата
}

const result = await gcQueryAi(ctx, query)
const rows = result.rows || []
const firstRow = result.rows?.[0]
```

### Способ 2: queryAi - Аккаунт разработчика

**Использование для внутренних инструментов** - данные из фиксированного аккаунта разработчика.

```typescript
import { queryAi } from '@traffic/sdk'

export const apiGetOrdersRoute = app.get('/orders', async (ctx, req) => {
  // Данные из аккаунта разработчика
  const result = await queryAi(ctx, sqlQuery)
  return { success: true, data: result.rows }
})
```

**⚠️ Важно**: При использовании `queryAi`:

- Все пользователи видят данные одного аккаунта (разработчика)
- Нет настройки и изоляции между пользователями
- Подходит только для внутренних инструментов

### Базовый пример с gcQueryAi

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

export const apiGetOrdersStatsRoute = app.get('/orders-stats', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  const query = `
    SELECT 
      COUNT(DISTINCT action_param1) as total_orders,
      SUM(action_param1_float) as total_amount
    FROM chatium_ai.access_log
    WHERE urlPath = 'event://getcourse/dealCreated'
      AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  try {
    const result = await gcQueryAi(ctx, query)
    const stats = result.rows?.[0]

    return {
      success: true,
      totalOrders: stats?.total_orders || 0,
      totalAmount: stats?.total_amount || 0
    }
  } catch (error: any) {
    ctx.account.log('Query failed', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
```

### Выбор между gcQueryAi и queryAi

```typescript
// ✅ Используйте gcQueryAi для:
// - Клиентских приложений (SaaS)
// - Мультиаккаунтных решений
// - Когда нужна изоляция данных
import { gcQueryAi } from '@gc-mcp-server/sdk'
const result = await gcQueryAi(ctx, query)

// ✅ Используйте queryAi для:
// - Внутренних инструментов компании
// - Быстрого прототипирования
// - Когда все работают с одним аккаунтом
import { queryAi } from '@traffic/sdk'
const result = await queryAi(ctx, query)
```

---

## События GetCourse

### Заказы (Deals)

#### dealCreated - создание заказа

**URL**: `event://getcourse/dealCreated`

**Поля**:

```
action_param1       → deal_id (String)           # ID заказа
action_param1_float → order_amount (Float)       # Сумма заказа
action_param2       → currency (String)          # Валюта (RUB, USD)
action_param3       → status (String)            # Статус
action_param3_int   → order_number (Int)         # Номер заказа
action_param1_arrstr → offer_ids (Array)         # ID предложений
title               → offer_name (String)        # Название предложения
user_email          → email (String)             # Email покупателя
user_first_name     → first_name (String)        # Имя
user_last_name      → last_name (String)         # Фамилия
dt                  → creation_date (Date)       # Дата создания
```

**Статусы**: `new`, `in_work`, `payment_waiting`, `payed`, `cancelled`, `not_confirmed`, `part_payed`, `pending`, `false`

**SQL пример**:

```sql
SELECT
  action_param1 as deal_id,
  action_param3_int as order_number,
  action_param1_float as amount,
  action_param2 as currency,
  action_param3 as status,
  title as offer_name,
  user_email,
  user_first_name,
  user_last_name,
  dt as created_date
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY dt DESC
LIMIT 100
```

#### dealStatusChanged - изменение статуса

**URL**: `event://getcourse/dealStatusChanged`

**SQL пример - последний статус каждого заказа**:

```sql
WITH latest_statuses AS (
  SELECT
    action_param1 as deal_id,
    action_param3 as status,
    dt,
    ROW_NUMBER() OVER (PARTITION BY action_param1 ORDER BY ts DESC) as rn
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealStatusChanged'
)
SELECT deal_id, status, dt
FROM latest_statuses
WHERE rn = 1
ORDER BY dt DESC
```

#### dealPaid - оплата заказа

**URL**: `event://getcourse/dealPaid`

**SQL пример - доход за период**:

```sql
SELECT
  toDate(dt) as payment_date,
  COUNT(DISTINCT action_param1) as orders_paid,
  SUM(action_param2_float) as total_revenue,
  AVG(action_param2_float) as average_payment
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealPaid'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY payment_date
ORDER BY payment_date DESC
```

### Пользователи (Users)

#### user/created - регистрация

**URL**: `event://getcourse/user/created`

**Поля**:

```
user_id            → user_id (String)           # ID пользователя
resolved_user_id   → resolved_id (String)       # Главный ID
user_email         → email (String)             # Email
user_phone         → phone (String)             # Телефон
user_first_name    → first_name (String)        # Имя
user_last_name     → last_name (String)         # Фамилия
dt                 → registration_date (Date)   # Дата регистрации
ts                 → registration_time (DateTime) # Время регистрации
```

**SQL пример - регистрации по дням**:

```sql
SELECT
  dt as registration_date,
  COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as new_users
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/created'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY dt
ORDER BY dt DESC
```

**SQL пример - получение списка пользователей**:

```sql
SELECT
  COALESCE(resolved_user_id, user_id) as user_id,
  anyIf(user_email, user_email IS NOT NULL AND user_email != '') as user_email,
  any(user_first_name) as user_first_name,
  any(user_last_name) as user_last_name,
  any(user_phone) as user_phone,
  min(ts) as registration_time
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/created'
  AND dt >= '2025-10-01'
GROUP BY COALESCE(resolved_user_id, user_id)
ORDER BY registration_time DESC
LIMIT 100
```

#### user/chatbot/\* - привязка мессенджеров

**События**:

- `event://getcourse/user/chatbot/telegram_enabled`
- `event://getcourse/user/chatbot/telegram_disabled`
- `event://getcourse/user/chatbot/vk_enabled`
- `event://getcourse/user/chatbot/vk_disabled`
- `event://getcourse/user/chatbot/whatsapp_enabled`
- `event://getcourse/user/chatbot/whatsapp_disabled`

**SQL пример - пользователи с Telegram**:

```sql
WITH enabled AS (
  SELECT DISTINCT COALESCE(resolved_user_id, user_id) as user_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/user/chatbot/telegram_enabled'
),
disabled AS (
  SELECT DISTINCT COALESCE(resolved_user_id, user_id) as user_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/user/chatbot/telegram_disabled'
)
SELECT
  COUNT(DISTINCT e.user_id) as telegram_connected,
  COUNT(DISTINCT d.user_id) as telegram_disconnected,
  COUNT(DISTINCT e.user_id) - COUNT(DISTINCT d.user_id) as active_telegram
FROM enabled e
LEFT JOIN disabled d ON e.user_id = d.user_id
```

### Группы (Groups)

#### user/group_added - добавление в группу

**URL**: `event://getcourse/user/group_added`

**SQL пример - топ групп по количеству участников**:

```sql
SELECT
  action_param1 as group_id,
  title as group_name,
  COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as members_count
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/group_added'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY group_id, group_name
ORDER BY members_count DESC
LIMIT 20
```

### Коммуникация

#### message/sent - отправка сообщения

**URL**: `event://getcourse/message/sent`

#### message/viewed - просмотр сообщения

**URL**: `event://getcourse/message/viewed`

**SQL пример - открываемость писем**:

```sql
WITH sent AS (
  SELECT
    action_param1 as message_id,
    COUNT(*) as sent_count
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/message/sent'
    AND dt >= today() - 7
  GROUP BY message_id
),
viewed AS (
  SELECT
    action_param1 as message_id,
    COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as viewed_count
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/message/viewed'
    AND dt >= today() - 7
  GROUP BY message_id
)
SELECT
  s.message_id,
  s.sent_count,
  COALESCE(v.viewed_count, 0) as viewed_count,
  ROUND((COALESCE(v.viewed_count, 0) * 100.0 / s.sent_count), 2) as open_rate
FROM sent s
LEFT JOIN viewed v ON s.message_id = v.message_id
ORDER BY s.sent_count DESC
```

---

## SQL примеры запросов

### Базовые запросы

#### Количество заказов за период

```sql
SELECT
  COUNT(DISTINCT action_param1) as total_orders,
  SUM(action_param1_float) as total_amount,
  AVG(action_param1_float) as average_order
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
```

#### Доход по дням

```sql
SELECT
  dt as payment_date,
  COUNT(DISTINCT action_param1) as paid_orders,
  SUM(action_param2_float) as revenue
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealPaid'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY dt
ORDER BY dt ASC
```

#### Регистрации пользователей

```sql
SELECT
  dt,
  COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as new_users
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/created'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY dt
ORDER BY dt ASC
```

### Продвинутые запросы

#### Воронка продаж (конверсия)

```sql
WITH created_deals AS (
  SELECT COUNT(DISTINCT action_param1) as count
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealCreated'
    AND dt BETWEEN '2025-01-01' AND '2025-01-31'
),
paid_deals AS (
  SELECT COUNT(DISTINCT action_param1) as count
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
    AND dt BETWEEN '2025-01-01' AND '2025-01-31'
)
SELECT
  c.count as created,
  p.count as paid,
  ROUND((p.count * 100.0 / c.count), 2) as conversion_percent
FROM created_deals c, paid_deals p
```

#### LTV пользователей (Lifetime Value)

```sql
SELECT
  COALESCE(resolved_user_id, user_id) as user_id,
  any(user_email) as user_email,
  any(user_first_name) as first_name,
  any(user_last_name) as last_name,
  COUNT(DISTINCT action_param1) as total_purchases,
  SUM(action_param2_float) as lifetime_value,
  AVG(action_param2_float) as average_purchase,
  MIN(dt) as first_purchase,
  MAX(dt) as last_purchase,
  dateDiff('day', MIN(dt), MAX(dt)) as customer_lifespan_days
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealPaid'
  AND dt >= '2025-01-01'
GROUP BY COALESCE(resolved_user_id, user_id)
HAVING lifetime_value > 0
ORDER BY lifetime_value DESC
LIMIT 100
```

#### Когортный анализ

```sql
WITH user_cohorts AS (
  SELECT
    COALESCE(resolved_user_id, user_id) as user_id,
    toStartOfMonth(MIN(dt)) as cohort_month
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/user/created'
  GROUP BY COALESCE(resolved_user_id, user_id)
),
monthly_revenue AS (
  SELECT
    COALESCE(resolved_user_id, user_id) as user_id,
    toStartOfMonth(dt) as revenue_month,
    SUM(action_param2_float) as revenue
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
  GROUP BY COALESCE(resolved_user_id, user_id), revenue_month
)
SELECT
  uc.cohort_month,
  mr.revenue_month,
  dateDiff('month', uc.cohort_month, mr.revenue_month) as months_since_registration,
  COUNT(DISTINCT uc.user_id) as cohort_size,
  COUNT(DISTINCT mr.user_id) as active_users,
  SUM(mr.revenue) as cohort_revenue,
  ROUND((COUNT(DISTINCT mr.user_id) * 100.0 / COUNT(DISTINCT uc.user_id)), 2) as retention_percent
FROM user_cohorts uc
LEFT JOIN monthly_revenue mr ON uc.user_id = mr.user_id
WHERE uc.cohort_month >= '2025-01-01'
GROUP BY uc.cohort_month, mr.revenue_month
ORDER BY uc.cohort_month, mr.revenue_month
```

---

## TypeScript примеры

### Получение статистики заказов

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

interface OrderStats {
  total_orders: number
  total_amount: number
  paid_orders: number
  paid_amount: number
  conversion: number
}

export const apiOrderStatsRoute = app.get('/order-stats', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  // Экранируем даты
  const safeDateFrom = String(dateFrom).replace(/'/g, "''")
  const safeDateTo = String(dateTo).replace(/'/g, "''")

  const query = `
    WITH created AS (
      SELECT 
        COUNT(DISTINCT action_param1) as count,
        SUM(action_param1_float) as amount
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealCreated'
        AND dt BETWEEN '${safeDateFrom}' AND '${safeDateTo}'
    ),
    paid AS (
      SELECT 
        COUNT(DISTINCT action_param1) as count,
        SUM(action_param2_float) as amount
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealPaid'
        AND dt BETWEEN '${safeDateFrom}' AND '${safeDateTo}'
    )
    SELECT 
      c.count as total_orders,
      c.amount as total_amount,
      p.count as paid_orders,
      p.amount as paid_amount,
      ROUND((p.count * 100.0 / GREATEST(c.count, 1)), 2) as conversion
    FROM created c, paid p
  `

  try {
    const result = await gcQueryAi(ctx, query)
    const stats = result.rows?.[0] as OrderStats

    return {
      success: true,
      stats: {
        totalOrders: stats?.total_orders || 0,
        totalAmount: stats?.total_amount || 0,
        paidOrders: stats?.paid_orders || 0,
        paidAmount: stats?.paid_amount || 0,
        conversion: stats?.conversion || 0
      }
    }
  } catch (error: any) {
    ctx.account.log('Query failed', {
      level: 'error',
      json: { error: error.message, query: query.substring(0, 200) }
    })
    return { success: false, error: error.message }
  }
})
```

### Топ продуктов по доходу

```typescript
export const apiTopProductsRoute = app.get('/top-products', async (ctx, req) => {
  const { limit = 10 } = req.query

  const query = `
    SELECT 
      title as product_name,
      COUNT(DISTINCT action_param1) as sales_count,
      SUM(action_param2_float) as total_revenue,
      AVG(action_param2_float) as average_price
    FROM chatium_ai.access_log
    WHERE urlPath = 'event://getcourse/dealPaid'
      AND dt >= subtractDays(today(), 30)
      AND title IS NOT NULL
      AND title != ''
    GROUP BY title
    ORDER BY total_revenue DESC
    LIMIT ${Number(limit)}
  `

  const result = await gcQueryAi(ctx, query)

  return {
    success: true,
    products: result.rows || []
  }
})
```

---

## Оптимизация запросов

### 1. Всегда фильтруйте по дате (dt)

✅ **Правильно**:

```sql
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
```

❌ **Неправильно** (медленно):

```sql
WHERE urlPath = 'event://getcourse/dealCreated'
-- Нет фильтра по дате - сканирует всю таблицу!
```

### 2. Используйте COALESCE для resolved_user_id

✅ **Правильно**:

```sql
SELECT COUNT(DISTINCT COALESCE(resolved_user_id, user_id)) as users
```

❌ **Неправильно**:

```sql
SELECT COUNT(DISTINCT user_id) as users  -- Неточные результаты!
```

### 3. Избегайте SELECT \*

✅ **Правильно**:

```sql
SELECT
  action_param1 as deal_id,
  action_param1_float as amount,
  dt
FROM chatium_ai.access_log
```

❌ **Неправильно**:

```sql
SELECT * FROM chatium_ai.access_log  -- Медленно и расточительно
```

### 4. Всегда добавляйте LIMIT

✅ **Правильно**:

```sql
SELECT ...
FROM chatium_ai.access_log
WHERE ...
LIMIT 1000  -- ✅ Ограничиваем результат
```

### 5. Используйте CTE для сложной логики

```sql
WITH created_deals AS (
  SELECT action_param1 as deal_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealCreated'
    AND dt >= '2025-01-01'
),
paid_deals AS (
  SELECT action_param1 as deal_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
    AND dt >= '2025-01-01'
)
SELECT *
FROM created_deals c
JOIN paid_deals p ON c.deal_id = p.deal_id
```

---

## Лучшие практики

### 1. Обработка ошибок

```typescript
export const apiRoute = app.get('/analytics', async (ctx, req) => {
  try {
    const result = await gcQueryAi(ctx, query)
    return { success: true, data: result.rows }
  } catch (error: any) {
    ctx.account.log('Analytics query failed', {
      level: 'error',
      json: {
        query: query.substring(0, 200),
        error: error.message
      }
    })
    return { success: false, error: error.message }
  }
})
```

### 2. Типизация результатов

```typescript
interface DealRow {
  deal_id: string
  amount: number
  status: string
  created_date: string
}

const result = await gcQueryAi(ctx, query)
const deals: DealRow[] = result.rows || []
```

### 3. Валидация параметров

```typescript
export const apiRoute = app.get('/stats', async (ctx, req) => {
  let { dateFrom, dateTo } = req.query

  // Значения по умолчанию
  if (!dateFrom) {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    dateFrom = monthAgo.toISOString().split('T')[0]
  }

  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0]
  }

  const query = `SELECT ... WHERE dt BETWEEN '${dateFrom}' AND '${dateTo}'`
  const result = await gcQueryAi(ctx, query)
  return { success: true, data: result.rows }
})
```

### 4. Экранирование SQL инъекций

```typescript
// ❌ Опасно
const email = req.query.email
const query = `WHERE user_email = '${email}'`

// ✅ Безопаснее
const email = String(req.query.email).replace(/'/g, "''")
const query = `WHERE user_email = '${email}'`

// ✅ Ещё лучше - валидация
const email = req.query.email as string
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return { success: false, error: 'Invalid email' }
}
const escapedEmail = email.replace(/'/g, "''")
const query = `WHERE user_email = '${escapedEmail}'`
```

### 5. Логирование медленных запросов

```typescript
export const apiRoute = app.get('/analytics', async (ctx, req) => {
  const startTime = Date.now()

  try {
    const result = await gcQueryAi(ctx, query)
    const duration = Date.now() - startTime

    if (duration > 5000) {
      ctx.account.log('Slow query detected', {
        level: 'warn',
        json: { duration, query: query.substring(0, 200) }
      })
    }

    return { success: true, data: result.rows }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
```

### 6. Проверка наличия результатов

```typescript
const result = await gcQueryAi(ctx, query)

// ✅ Всегда проверяйте наличие rows
if (!result.rows || result.rows.length === 0) {
  return { success: true, data: [], message: 'No data found' }
}

const firstRow = result.rows[0]
```

---

## Полный список событий GetCourse

### События заказов (6)

- `dealCreated` - Создан заказ
- `dealPaid` - Заказ оплачен
- `dealStatusChanged` - Изменен статус заказа
- `dealPaymentAccepted` - Принят платеж по заказу
- `dealMoneyValuesChanged` - Изменилась сумма заказа
- `dealTagsChanged` - Изменены теги заказа

### События пользователей (13)

- `user/created` - Пользователь зарегистрировался
- `user/group_added` - Пользователь добавлен в группу
- `user/group_removed` - Пользователь удален из группы
- `user/banned` - Пользователь забанен
- `user/unbanned` - Пользователя вернули из бана
- `user/commented` - Оставили комментарий к профилю ученика
- `user/session_link` - Сессия связана с юзером
- `user/chatbot/telegram_enabled` - Привязал Telegram к профилю
- `user/chatbot/telegram_disabled` - Отвязал Telegram от профиля
- `user/chatbot/vk_enabled` - Привязал ВКонтакте к профилю
- `user/chatbot/vk_disabled` - Отвязал ВКонтакте от профиля
- `user/chatbot/whatsapp_enabled` - Привязал WhatsApp к профилю
- `user/chatbot/whatsapp_disabled` - Отвязал WhatsApp от профиля

### События обучения (5)

- `teach/lesson/action` - Действие с уроком (открыл, прошел, ответил)
- `teach/lesson/answerCreated` - Ответил на урок тренинга
- `teach/lesson/answerUpdated` - Изменен статус ответа на урок
- `teach/trainingStarted` - Стартовал прохождение тренинга
- `teach/trainingFinished` - Завершил тренинг

### События сообщений (4)

- `message/sent` - Сообщение отправлено
- `message/viewed` - Просмотрел сообщение
- `message/clicked` - Клик на ссылке в сообщении
- `message/unsubscribed` - Отписался от рассылки

### События форм и анкет (2)

- `form/sent` - Отправлена форма
- `survey/answerCreated` - Добавлен ответ на анкету

### События обращений (3)

- `conversation/addedMessage` - Добавлено сообщение к обращению
- `conversation/responsibilityCreated` - Назначен ответственный или дедлайн по обращению
- `conversation/responsibilityUpdated` - Обновлен ответственный или дедлайн по обращению

### События контактов (2)

- `contact/created` - Создана запись звонка или иного контакта
- `contact/call_file_added` - Добавлен файл звонка

### События ВКонтакте (1)

- `vk/visitSuccess` - Успешный визит ВКонтакте

**Всего: 34 типа событий** (по состоянию на 2025-11-09)

**Источник**: [Официальная документация GetCourse](https://getcourse.chatium.com/docs/events)

### Категории событий (паттерны)

Для гибкой фильтрации всех событий определенного типа используйте **паттерны URL**:

| Категория         | Паттерн               | Описание                                            | Количество |
| ----------------- | --------------------- | --------------------------------------------------- | ---------- |
| **Все GetCourse** | `event://getcourse/%` | Все события GetCourse, включая будущие              | ~34+       |
| **Все ReFunnels** | `event://refunnels/%` | Все события ReFunnels (сценарии автоворонок)        | Динамично  |
| **Все Workspace** | `event://workspace/%` | Все события приложения (регистрация, заявки, квизы) | Динамично  |
| **Все Custom**    | `event://custom/%`    | Все пользовательские события                        | Динамично  |
| **Все event://**  | `event://%`           | ВСЕ события с протоколом event://                   | Все        |

**Фильтрация по паттернам в SQL:**

```sql
-- Все события GetCourse одним запросом
SELECT *
FROM chatium_ai.access_log
WHERE urlPath LIKE 'event://getcourse/%'
  AND dt >= '2025-11-01'
ORDER BY ts DESC
LIMIT 1000

-- Комбинированная фильтрация (паттерны + конкретные события)
SELECT *
FROM chatium_ai.access_log
WHERE (
  urlPath LIKE 'event://getcourse/%'           -- Все GetCourse
  OR urlPath LIKE 'event://refunnels/%'         -- Все ReFunnels
  OR urlPath = 'event://workspace/registration' -- Конкретное событие
  OR action = 'pageview'                        -- HTTP событие
)
AND dt >= '2025-11-01'
ORDER BY ts DESC
LIMIT 1000
```

**Преимущества паттернов:**

- ✅ Один запрос вместо множества
- ✅ Автоматически охватывают новые события
- ✅ Гибкая комбинация фильтров
- ✅ Оптимизированная производительность

### Практика: TypeScript определения событий

**Создайте файл `eventTypes.ts` для типизации событий:**

```typescript
// shared/eventTypes.ts

export interface EventDefinition {
  name: string // Уникальное имя события
  description: string // Описание для UI
  type: 'traffic' | 'workspace' | 'custom' // Тип события
  urlPath?: string // Конкретный путь (для точного совпадения)
  urlPattern?: string // Паттерн URL (для LIKE фильтрации)
}

// HTTP события (Traffic)
export const TRAFFIC_EVENTS: EventDefinition[] = [
  { name: 'pageview', description: 'Просмотр страницы', type: 'traffic' },
  { name: 'button_click', description: 'Клик по кнопке', type: 'traffic' },
  { name: 'link_click', description: 'Клик по ссылке', type: 'traffic' }
  // ... остальные события
]

// GetCourse события (конкретные)
export const GETCOURSE_EVENTS: EventDefinition[] = [
  {
    name: 'dealCreated',
    description: 'Создан заказ',
    type: 'workspace',
    urlPath: 'event://getcourse/dealCreated'
  },
  {
    name: 'dealPaid',
    description: 'Заказ оплачен',
    type: 'workspace',
    urlPath: 'event://getcourse/dealPaid'
  }
  // ... все 34 события
]

// Категории событий (паттерны для гибкости)
export const EVENT_CATEGORIES: EventDefinition[] = [
  {
    name: 'all_getcourse',
    description: 'ВСЕ события GetCourse (любые event://getcourse/*)',
    type: 'workspace',
    urlPattern: 'event://getcourse/%'
  },
  {
    name: 'refunnels_all',
    description: 'ВСЕ события ReFunnels (event://refunnels/*)',
    type: 'workspace',
    urlPattern: 'event://refunnels/%'
  },
  {
    name: 'workspace_all',
    description: 'ВСЕ события приложения (event://workspace/*)',
    type: 'workspace',
    urlPattern: 'event://workspace/%'
  },
  {
    name: 'custom_all',
    description: 'ВСЕ пользовательские события (event://custom/*)',
    type: 'custom',
    urlPattern: 'event://custom/%'
  },
  {
    name: 'all_event_protocol',
    description: 'ВСЕ события с протоколом event:// (любые)',
    type: 'custom',
    urlPattern: 'event://%'
  }
]

// Все события вместе
export function getAllEvents(): EventDefinition[] {
  return [...TRAFFIC_EVENTS, ...GETCOURSE_EVENTS, ...EVENT_CATEGORIES]
}
```

### Практика: Динамическая фильтрация событий

**Job с динамической фильтрацией на основе настроек:**

```typescript
// api/events.ts
import { PartnershipSettings } from '../tables/settings.table'
import {
  getAllEvents,
  TRAFFIC_EVENTS,
  GETCOURSE_EVENTS,
  EVENT_CATEGORIES
} from '../shared/eventTypes'

export const monitorEventsJob = app.job(async (ctx) => {
  // 1. Загрузка фильтра из настроек
  const filterSetting = await PartnershipSettings.findOne(ctx, {
    key: 'events_filter'
  })

  let selectedEventTypes: string[] = []

  if (filterSetting?.value) {
    try {
      selectedEventTypes = JSON.parse(filterSetting.value)
    } catch {}
  }

  // 2. По умолчанию - все события
  if (selectedEventTypes.length === 0) {
    selectedEventTypes = getAllEvents().map((e) => e.name)
  }

  // 3. Построение WHERE условий
  const allEvents = getAllEvents()
  const whereConditions: string[] = []

  for (const eventName of selectedEventTypes) {
    const eventDef = allEvents.find((e) => e.name === eventName)
    if (!eventDef) continue

    if (eventDef.urlPattern) {
      // Паттерн - используем LIKE
      whereConditions.push(`urlPath LIKE '${eventDef.urlPattern}'`)
    } else if (eventDef.urlPath) {
      // Конкретный путь - используем =
      whereConditions.push(`urlPath = '${eventDef.urlPath}'`)
    } else if (eventDef.name) {
      // HTTP событие - используем action
      whereConditions.push(`action = '${eventDef.name}'`)
    }
  }

  // 4. Один запрос для всех событий
  const whereClause = whereConditions.length > 0 ? whereConditions.join(' OR ') : '1=1'

  const query = `
    SELECT 
      urlPath,
      action,
      user_id,
      title,
      dt,
      ts
    FROM chatium_ai.access_log
    WHERE (${whereClause})
      AND dt >= today() - 1
    ORDER BY ts DESC
    LIMIT 100
  `

  // 5. Выполнение запроса
  const result = await gcQueryAi(ctx, query)

  // 6. Обработка результатов
  for (const event of result.rows) {
    // Отправка события через WebSocket
    await sendDataToSocket(ctx, 'events', event)
  }
})
```

**API для сохранения фильтра:**

```typescript
// api/settings.ts
export const apiSaveEventFilterRoute = app.post('/event-filter', async (ctx, req) => {
  const { eventTypes } = req.body

  if (!Array.isArray(eventTypes)) {
    return { success: false, error: 'eventTypes должен быть массивом' }
  }

  // Сохранение в настройки
  await PartnershipSettings.upsert(ctx, {
    key: 'events_filter',
    value: JSON.stringify(eventTypes),
    description: 'Выбранные типы событий для мониторинга'
  })

  return { success: true }
})

export const apiGetEventFilterRoute = app.get('/event-filter', async (ctx, req) => {
  const setting = await PartnershipSettings.findOne(ctx, {
    key: 'events_filter'
  })

  if (!setting?.value) {
    return []
  }

  try {
    return JSON.parse(setting.value)
  } catch {
    return []
  }
})
```

---

## Настройка GetCourse MCP Client

### Проверка и установка

```typescript
import { integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installSupportedApp } from '@store/sdk'

// Проверка настройки
const isConfigured = await integrationIsEnabled(ctx)

// Установка плагина (если не настроен)
if (!isConfigured) {
  await installSupportedApp(ctx, 'gc-mcp-server')
  // После установки пользователь вводит адрес сервера и API ключ
}
```

### Полный пример с проверкой настройки

```typescript
import { jsx } from "@app/html-jsx"
import { requireAccountRole } from '@app/auth'
import { integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installPluginRoute } from './api/install-plugin'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const isConfigured = await integrationIsEnabled(ctx)

  return (
    <html>
      <head>
        <title>{isConfigured ? 'GetCourse Аналитика' : 'Настройка GetCourse'}</title>
      </head>
      <body>
        {isConfigured ? (
          <Analytics />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>GetCourse не настроен</h1>
            <p>Установите и настройте GetCourse MCP Server</p>
            <button onclick={`
              fetch('${installPluginRoute.url()}', { method: 'POST' })
                .then(r => r.json())
                .then(result => {
                  if (result.success) {
                    window.location.href = '${ctx.account.url('/app/gc-mcp-server')}';
                  }
                });
            `}>
              Настроить GetCourse
            </button>
          </div>
        )}
      </body>
    </html>
  )
})
```

---

## Итоговая сводка всех типов событий

### Общая статистика

| Категория                 | Количество | Файл            | Описание                                                                                  |
| ------------------------- | ---------- | --------------- | ----------------------------------------------------------------------------------------- |
| **HTTP Events (Traffic)** | 8          | `eventTypes.ts` | Базовые события трафика (pageview, clicks, video, forms)                                  |
| **GetCourse Events**      | 34         | `eventTypes.ts` | Конкретные события GetCourse из [документации](https://getcourse.chatium.com/docs/events) |
| **Event Categories**      | 5          | `eventTypes.ts` | Паттерны для гибкой фильтрации (`event://*/%`)                                            |
| **ИТОГО**                 | **47**     |                 | Все доступные типы событий для мониторинга                                                |

### HTTP Events (8) - через поле `action`

**⚠️ Важно:** HTTP/HTTPS события группируются по `action`, а не по конкретным URL!

```typescript
// Из TRAFFIC_EVENTS в shared/eventTypes.ts
const actions = [
  'pageview', // Просмотр страницы
  'button_click', // Клик по кнопке
  'link_click', // Клик по ссылке
  'scroll', // Прокрутка страницы
  'form_submit', // Отправка формы
  'video_play', // Воспроизведение видео
  'video_pause', // Пауза видео
  'video_complete' // Просмотр видео до конца
]
```

### GetCourse Events (34) - через `urlPath`

**Заказы (6):**

1. `event://getcourse/dealCreated`
2. `event://getcourse/dealPaid`
3. `event://getcourse/dealStatusChanged`
4. `event://getcourse/dealPaymentAccepted`
5. `event://getcourse/dealMoneyValuesChanged`
6. `event://getcourse/dealTagsChanged`

**Пользователи (13):** 7. `event://getcourse/user/created` 8. `event://getcourse/user/group_added` 9. `event://getcourse/user/group_removed` 10. `event://getcourse/user/banned` 11. `event://getcourse/user/unbanned` 12. `event://getcourse/user/commented` 13. `event://getcourse/user/session_link` 14. `event://getcourse/user/chatbot/telegram_enabled` 15. `event://getcourse/user/chatbot/telegram_disabled` 16. `event://getcourse/user/chatbot/vk_enabled` 17. `event://getcourse/user/chatbot/vk_disabled`

**Обучение (5):** 18. `event://getcourse/teach/lesson/action` 19. `event://getcourse/teach/lesson/answerCreated` 20. `event://getcourse/teach/lesson/answerUpdated` 21. `event://getcourse/teach/trainingStarted` 22. `event://getcourse/teach/trainingFinished`

**Сообщения (4):** 23. `event://getcourse/message/sent` 24. `event://getcourse/message/viewed` 25. `event://getcourse/message/clicked` 26. `event://getcourse/message/unsubscribed`

**Формы и анкеты (2):** 27. `event://getcourse/form/sent` 28. `event://getcourse/survey/answerCreated`

**Обращения (3):** 29. `event://getcourse/conversation/addedMessage` 30. `event://getcourse/conversation/responsibilityCreated` 31. `event://getcourse/conversation/responsibilityUpdated`

**Контакты (2):** 32. `event://getcourse/contact/created` 33. `event://getcourse/contact/call_file_added`

**ВКонтакте (1):** 34. `event://getcourse/vk/visitSuccess`

### Event Categories (5) - паттерны через `urlPattern`

**Для гибкой фильтрации всех событий типа:**

1. `event://getcourse/%` - ВСЕ события GetCourse (включая будущие)
2. `event://refunnels/%` - ВСЕ события ReFunnels (сценарии автоворонок)
3. `event://workspace/%` - ВСЕ события приложения (регистрация, заявки, квизы)
4. `event://custom/%` - ВСЕ пользовательские события
5. `event://%` - ВСЕ события с протоколом event://

### Как использовать в SQL запросах

```sql
-- HTTP события (по action)
WHERE action = 'pageview'

-- Конкретное GetCourse событие (по urlPath)
WHERE urlPath = 'event://getcourse/dealCreated'

-- Все события категории (по LIKE pattern)
WHERE urlPath LIKE 'event://getcourse/%'

-- Комбинированный запрос (все типы)
WHERE (
  action = 'pageview'                            -- HTTP
  OR urlPath = 'event://getcourse/dealCreated'   -- Конкретное GC
  OR urlPath LIKE 'event://refunnels/%'          -- Категория ReFunnels
)
```

---

## Связанные документы

- **E01-gc-sdk.md** — GetCourse SDK (методы, функции)
- **016-analytics-workspace.md** — События workspace (writeWorkspaceEvent)
- **016-analytics-traffic.md** — События трафика
- **016-analytics-subscriptions.md** — Система подписок на события
- **014-socket.md** — WebSocket в Chatium
- **008-heap.md** — Heap таблицы
- **Проекты**:
  - `dev/events-subscribe` - рабочая реализация подписок
  - `dev/partnership` - партнёрская система с GetCourse
  - `ref/analitika-getkursa-extended` - референсный проект аналитики

---

**Версия**: 2.1  
**Дата создания**: 2025-11-07  
**Последнее обновление**: 2025-11-09  
**Статус**:

- Добавлена информация о двух способах работы с GetCourse: настраиваемый MCP Client и аккаунт разработчика
- Актуализирован полный список событий (47 типов: 8 HTTP + 34 GetCourse + 5 категорий)
- Добавлены паттерны фильтрации через `urlPattern` и `LIKE`
- Добавлены практические примеры динамической фильтрации событий
- Добавлена TypeScript типизация событий через `EventDefinition`
