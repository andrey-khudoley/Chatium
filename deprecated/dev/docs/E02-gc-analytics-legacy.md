# GetCourse Аналитика

Исчерпывающее руководство по работе с аналитикой GetCourse в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Архитектура аналитики](#архитектура-аналитики)
- [База данных ClickHouse](#база-данных-clickhouse)
  - [Таблица access_log](#таблица-access_log)
  - [Таблица behaviour2_log](#таблица-behaviour2_log)
- [Выполнение запросов](#выполнение-запросов)
  - [gcQueryAi - основная функция](#gcqueryai---основная-функция)
  - [Формат ответа](#формат-ответа)
- [События GetCourse](#события-getcourse)
  - [Заказы (Deals)](#заказы-deals)
  - [Пользователи (Users)](#пользователи-users)
  - [Группы (Groups)](#группы-groups)
  - [Платежи (Payments)](#платежи-payments)
  - [Коммуникация](#коммуникация)
- [SQL примеры запросов](#sql-примеры-запросов)
  - [Базовые запросы](#базовые-запросы)
  - [Продвинутые запросы](#продвинутые-запросы)
  - [Аналитические отчёты](#аналитические-отчёты)
- [TypeScript примеры](#typescript-примеры)
- [Оптимизация запросов](#оптимизация-запросов)
- [Лучшие практики](#лучшие-практики)

---

## Введение

**GetCourse Аналитика** — система анализа всех событий, происходящих в аккаунте GetCourse через ClickHouse базу данных.

### Что можно анализировать

- ✅ **Заказы**: создание, изменение статуса, оплаты
- ✅ **Пользователи**: регистрация, действия, поведение
- ✅ **Группы**: добавление/удаление участников
- ✅ **Платежи**: оплаты, возвраты, суммы
- ✅ **Коммуникация**: сообщения, письма
- ✅ **Интеграции**: Telegram, VK, другие мессенджеры

### Ключевые компоненты

| Компонент                   | Описание                   |
| --------------------------- | -------------------------- |
| `@gc-mcp-server/sdk`        | SDK для работы с GetCourse |
| `gcQueryAi(ctx, query)`     | Выполнение SQL запросов    |
| `chatium_ai.access_log`     | Таблица событий            |
| `chatium_ai.behaviour2_log` | Таблица поведения          |
| ClickHouse                  | База данных                |

---

## Архитектура аналитики

```
GetCourse Events
     ↓
Chatium Analytics
     ↓
ClickHouse Database
  ├─ access_log (события)
  └─ behaviour2_log (поведение)
     ↓
gcQueryAi() / SQL
     ↓
Аналитические данные
```

### Поток данных

1. **GetCourse** отправляет события через webhook
2. **Chatium** обрабатывает и нормализует
3. **ClickHouse** сохраняет в access_log
4. **Разработчик** делает SQL запросы через gcQueryAi()
5. **Отчёты** отображают результаты

---

## База данных ClickHouse

### Таблица access_log

Основная таблица всех событий GetCourse и системы.

**Ключевые колонки**:

```sql
-- Время
ts DateTime              -- Время события UTC
dt Date                  -- Дата события
ts64 DateTime64(3)       -- Высокоточное время

-- Событие
urlPath String           -- Адрес события (event://getcourse/...)

-- Параметры события
action_param1 String     -- Основной параметр (ID заказа, ID пользователя)
action_param2 String     -- Дополнительный параметр
action_param3 String     -- Дополнительный параметр

-- Числовые параметры
action_param1_float Float32   -- Числа с плавающей точкой (суммы)
action_param2_float Float32
action_param1_int Int32       -- Целые числа
action_param2_int Int32

-- Массивы
action_param1_arrstr Array(String)  -- Массивы строк (ID предложений)

-- Пользователь
user_id String           -- ID пользователя GetCourse
user_email String        -- Email
user_phone String        -- Телефон
user_first_name String   -- Имя
user_last_name String    -- Фамилия

-- Метаданные
title String             -- Название (предложения, группы)
action_params String     -- JSON параметры

-- GetCourse ID
gc_visit_id Int64        -- ID визита
gc_visitor_id Int64      -- ID посетителя
gc_session_id Int64      -- ID сессии
```

### Таблица behaviour2_log

Анализ поведения пользователей на сайте.

```sql
-- Идентификация
uid String               -- ID браузера
url String               -- URL страницы
user_id String           -- ID пользователя

-- Поведение
view_focused_duration UInt32    -- Время фокуса (ms)
view_total_duration UInt32      -- Общее время (ms)
mouse_distance UInt32    -- Движение мыши
scroll_distance UInt32   -- Прокрутка
click_counter UInt32     -- Количество кликов

-- GetCourse
gc_visit_id Int64
gc_visitor_id Int64
gc_session_id Int64
```

---

## Выполнение запросов

### gcQueryAi - основная функция

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

const result = await gcQueryAi(ctx, sqlQuery)
```

**Базовый пример**:

```typescript
export const apiStatsRoute = app.get('/stats', async (ctx, req) => {
  const { dateFrom, dateTo } = req.query

  const query = `
    SELECT 
      COUNT(DISTINCT action_param1) as total_orders
    FROM chatium_ai.access_log
    WHERE urlPath = 'event://getcourse/dealCreated'
      AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  const result = await gcQueryAi(ctx, query)

  return {
    success: true,
    totalOrders: result.rows?.[0]?.total_orders || 0
  }
})
```

### Формат ответа

```typescript
interface QueryResult {
  rows: Array<Record<string, any>> // Массив строк результата
}

// Пример
const result = await gcQueryAi(ctx, query)
// result.rows = [{ column1: value1, column2: value2 }, ...]
```

**Важно**: Всегда проверяйте `result.rows` на существование!

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
  dt as created_date
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY dt DESC
LIMIT 100
```

#### dealStatusChanged - изменение статуса

**URL**: `event://getcourse/dealStatusChanged`

**Поля**:

```
action_param1 → deal_id (String)      # ID заказа
action_param3 → status (String)       # Новый статус
dt            → change_date (Date)    # Дата изменения
ts            → change_time (DateTime) # Время изменения
```

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
SELECT
  deal_id,
  status,
  dt
FROM latest_statuses
WHERE rn = 1
ORDER BY dt DESC
```

#### dealPaid - оплата заказа

**URL**: `event://getcourse/dealPaid`

**Поля**:

```
action_param1       → deal_id (String)           # ID заказа
action_param2_float → payment_amount (Float)     # Сумма оплаты
action_param2       → currency (String)          # Валюта
title               → offer_name (String)        # Название
dt                  → payment_date (Date)        # Дата оплаты
```

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

#### dealMoneyValuesChanged - изменение суммы

**URL**: `event://getcourse/dealMoneyValuesChanged`

**Поля**:

```
action_param1       → deal_id (String)      # ID заказа
action_param1_float → new_amount (Float)    # Новая сумма
action_param2_float → price_change (Float)  # Изменение
```

### Пользователи (Users)

#### user/created - регистрация

**URL**: `event://getcourse/user/created`

**Поля**:

```
user_id         → user_id (String)       # ID пользователя
user_email      → email (String)         # Email
user_phone      → phone (String)         # Телефон
user_first_name → first_name (String)    # Имя
user_last_name  → last_name (String)     # Фамилия
dt              → registration_date (Date) # Дата регистрации
```

**SQL пример - регистрации по дням**:

```sql
SELECT
  dt as registration_date,
  COUNT(DISTINCT user_id) as new_users
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/created'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY dt
ORDER BY dt DESC
```

#### user/chatbot/telegram_enabled - подключение Telegram

**URL**: `event://getcourse/user/chatbot/telegram_enabled`

**Поля**:

```
user_id → user_id (String)          # ID пользователя
dt      → connection_date (Date)    # Дата подключения
```

#### user/chatbot/telegram_disabled - отключение Telegram

**URL**: `event://getcourse/user/chatbot/telegram_disabled`

#### user/chatbot/vk_enabled - подключение VK

**URL**: `event://getcourse/user/chatbot/vk_enabled`

#### user/chatbot/vk_disabled - отключение VK

**URL**: `event://getcourse/user/chatbot/vk_disabled`

### Группы (Groups)

#### user/group_added - добавление в группу

**URL**: `event://getcourse/user/group_added`

**Поля**:

```
user_id       → user_id (String)    # ID пользователя
action_param1 → group_id (String)   # ID группы
dt            → added_date (Date)   # Дата добавления
```

**SQL пример - топ групп**:

```sql
SELECT
  action_param1 as group_id,
  COUNT(DISTINCT user_id) as members_count
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/user/group_added'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY group_id
ORDER BY members_count DESC
LIMIT 20
```

#### user/group_removed - удаление из группы

**URL**: `event://getcourse/user/group_removed`

### Платежи (Payments)

#### payment/initiated - инициирован платёж

**URL**: `event://getcourse/payment/initiated`

**Поля**:

```
action_param1       → deal_id (String)           # ID заказа
action_param1_float → amount (Float)             # Сумма
action_param2       → payment_method (String)    # Способ оплаты
```

#### payment/completed - платёж завершён

**URL**: `event://getcourse/payment/completed`

#### payment/failed - платёж отклонён

**URL**: `event://getcourse/payment/failed`

### Коммуникация

#### message/incoming - входящее сообщение

**URL**: `event://getcourse/message/incoming`

**Поля**:

```
user_id       → user_id (String)        # ID пользователя
action_param1 → message_id (String)     # ID сообщения
action_param2 → channel (String)        # Канал (telegram, email)
action_param3 → message_text (String)   # Текст
dt            → message_date (Date)     # Дата
```

#### message/outgoing - исходящее сообщение

**URL**: `event://getcourse/message/outgoing`

#### email/sent - письмо отправлено

**URL**: `event://getcourse/email/sent`

#### email/opened - письмо открыто

**URL**: `event://getcourse/email/opened`

#### email/clicked - клик по ссылке

**URL**: `event://getcourse/email/clicked`

---

## SQL примеры запросов

### Базовые запросы

#### Количество заказов за период

```sql
SELECT
  COUNT(DISTINCT action_param1) as total_orders,
  SUM(action_param1_float) as total_amount
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
```

#### Доход за период

```sql
SELECT
  COUNT(DISTINCT action_param1) as paid_orders,
  SUM(action_param2_float) as total_revenue,
  AVG(action_param2_float) as average_payment
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealPaid'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
```

#### Регистрации по дням

```sql
SELECT
  dt as registration_date,
  COUNT(DISTINCT user_id) as new_users
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
  SELECT
    COUNT(DISTINCT action_param1) as count
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealCreated'
    AND dt BETWEEN '2025-01-01' AND '2025-01-31'
),
paid_deals AS (
  SELECT
    COUNT(DISTINCT action_param1) as count
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

#### Текущий статус каждого заказа

```sql
WITH latest_order_statuses AS (
  SELECT
    action_param1 as deal_id,
    action_param3 as status,
    dt,
    ROW_NUMBER() OVER (PARTITION BY action_param1 ORDER BY ts DESC) as rn
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealStatusChanged'
),
order_creations AS (
  SELECT
    action_param1 as deal_id,
    action_param3 as initial_status,
    dt as creation_date
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealCreated'
),
paid_orders AS (
  SELECT
    DISTINCT action_param1 as deal_id,
    'payed' as paid_status
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
)
SELECT
  COALESCE(c.deal_id, s.deal_id, p.deal_id) as deal_id,
  COALESCE(c.creation_date, s.dt) as date,
  CASE
    WHEN p.paid_status IS NOT NULL THEN 'payed'
    WHEN s.status IS NOT NULL THEN s.status
    ELSE COALESCE(c.initial_status, 'new')
  END as current_status
FROM order_creations c
FULL OUTER JOIN (
  SELECT * FROM latest_order_statuses WHERE rn = 1
) s ON c.deal_id = s.deal_id
FULL OUTER JOIN paid_orders p ON COALESCE(c.deal_id, s.deal_id) = p.deal_id
ORDER BY date DESC
```

#### LTV пользователей (Lifetime Value)

```sql
SELECT
  user_id,
  user_email,
  user_first_name,
  user_last_name,
  COUNT(DISTINCT action_param1) as total_purchases,
  SUM(action_param2_float) as lifetime_value,
  AVG(action_param2_float) as average_purchase,
  MIN(dt) as first_purchase,
  MAX(dt) as last_purchase,
  dateDiff('day', MIN(dt), MAX(dt)) as customer_lifespan_days
FROM chatium_ai.access_log
WHERE urlPath = 'event://getcourse/dealPaid'
  AND dt BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY user_id, user_email, user_first_name, user_last_name
HAVING lifetime_value > 0
ORDER BY lifetime_value DESC
LIMIT 100
```

### Аналитические отчёты

#### Динамика продаж по дням

```sql
SELECT
  toDate(dt) as sale_date,
  COUNT(DISTINCT action_param1) as orders_count,
  SUM(action_param1_float) as orders_amount,
  COUNT(DISTINCT
    CASE WHEN urlPath = 'event://getcourse/dealPaid'
    THEN action_param1 END
  ) as paid_count,
  SUM(
    CASE WHEN urlPath = 'event://getcourse/dealPaid'
    THEN action_param2_float ELSE 0 END
  ) as paid_amount
FROM chatium_ai.access_log
WHERE urlPath IN ('event://getcourse/dealCreated', 'event://getcourse/dealPaid')
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY sale_date
ORDER BY sale_date ASC
```

#### Когортный анализ

```sql
WITH user_cohorts AS (
  SELECT
    user_id,
    toStartOfMonth(MIN(dt)) as cohort_month
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/user/created'
  GROUP BY user_id
),
monthly_revenue AS (
  SELECT
    user_id,
    toStartOfMonth(dt) as revenue_month,
    SUM(action_param2_float) as revenue
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
  GROUP BY user_id, revenue_month
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

  const query = `
    WITH created AS (
      SELECT 
        COUNT(DISTINCT action_param1) as count,
        SUM(action_param1_float) as amount
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealCreated'
        AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
    ),
    paid AS (
      SELECT 
        COUNT(DISTINCT action_param1) as count,
        SUM(action_param2_float) as amount
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/dealPaid'
        AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
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
  } catch (error) {
    ctx.account.log('Query failed', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
```

### Пользователи с Telegram

```typescript
export const apiTelegramUsersRoute = app.get('/telegram-users', async (ctx, req) => {
  const { dateFrom, dateTo } = req.query

  const query = `
    WITH all_users AS (
      SELECT DISTINCT user_id
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/user/created'
        AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
    ),
    telegram_enabled AS (
      SELECT DISTINCT user_id
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/user/chatbot/telegram_enabled'
    ),
    telegram_disabled AS (
      SELECT DISTINCT user_id
      FROM chatium_ai.access_log
      WHERE urlPath = 'event://getcourse/user/chatbot/telegram_disabled'
    )
    SELECT 
      COUNT(DISTINCT au.user_id) as total_users,
      COUNT(DISTINCT te.user_id) as telegram_connected,
      COUNT(DISTINCT td.user_id) as telegram_disconnected,
      COUNT(DISTINCT te.user_id) - COUNT(DISTINCT td.user_id) as active_telegram
    FROM all_users au
    LEFT JOIN telegram_enabled te ON au.user_id = te.user_id
    LEFT JOIN telegram_disabled td ON au.user_id = td.user_id
  `

  const result = await gcQueryAi(ctx, query)
  return { success: true, stats: result.rows?.[0] }
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
    LIMIT ${limit}
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

### Используйте фильтры по дате

✅ **Правильно**:

```sql
WHERE urlPath = 'event://getcourse/dealCreated'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
```

❌ **Неправильно** (медленно):

```sql
WHERE urlPath = 'event://getcourse/dealCreated'
-- Нет фильтра по дате!
```

### Используйте CTE для сложной логики

✅ **Правильно**:

```sql
WITH created_deals AS (
  SELECT action_param1 as deal_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealCreated'
),
paid_deals AS (
  SELECT action_param1 as deal_id
  FROM chatium_ai.access_log
  WHERE urlPath = 'event://getcourse/dealPaid'
)
SELECT * FROM created_deals JOIN paid_deals USING (deal_id)
```

### Избегайте SELECT \*

✅ **Правильно**:

```sql
SELECT
  action_param1 as deal_id,
  action_param1_float as amount
FROM chatium_ai.access_log
```

❌ **Неправильно**:

```sql
SELECT * FROM chatium_ai.access_log
```

### Используйте LIMIT

✅ **Всегда добавляйте LIMIT**:

```sql
SELECT ... FROM chatium_ai.access_log
WHERE ...
LIMIT 1000
```

---

## Лучшие практики

### Обработка ошибок

✅ **Всегда оборачивайте в try/catch**:

```typescript
export const apiRoute = app.get('/analytics', async (ctx, req) => {
  try {
    const result = await gcQueryAi(ctx, query)
    return { success: true, data: result.rows }
  } catch (error) {
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

### Типизация

✅ **Определяйте интерфейсы результатов**:

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

### Валидация параметров

✅ **Проверяйте даты**:

```typescript
export const apiRoute = app.get('/stats', async (ctx, req) => {
  let { dateFrom, dateTo } = req.query

  // Значения по умолчанию
  if (!dateFrom) {
    dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }

  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0]
  }

  const query = `
    SELECT ... 
    WHERE dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  const result = await gcQueryAi(ctx, query)
  return { success: true, data: result.rows }
})
```

### Логирование медленных запросов

✅ **Мониторьте производительность**:

```typescript
export const apiRoute = app.get('/analytics', async (ctx, req) => {
  const startTime = Date.now()

  try {
    const result = await gcQueryAi(ctx, query)
    const duration = Date.now() - startTime

    if (duration > 5000) {
      ctx.account.log('Slow query detected', {
        level: 'warn',
        json: {
          duration,
          query: query.substring(0, 200)
        }
      })
    }

    return { success: true, data: result.rows }
  } catch (error) {
    ctx.account.log('Query error', {
      level: 'error',
      json: {
        duration: Date.now() - startTime,
        error: error.message
      }
    })
    return { success: false, error: error.message }
  }
})
```

### Избегайте SQL инъекций

✅ **Экранируйте пользовательский ввод**:

```typescript
// ❌ Опасно
const query = `
  WHERE user_email = '${req.query.email}'
`

// ✅ Безопаснее (но все равно будьте осторожны)
const email = (req.query.email as string).replace(/'/g, "''")
const query = `
  WHERE user_email = '${email}'
`

// ✅ Ещё лучше - используйте фильтры
const email = req.query.email as string
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return { success: false, error: 'Invalid email' }
}
```

---

## Связанные документы

- **E01-gc-sdk.md** — GetCourse SDK методы
- **008-heap.md** — Сохранение результатов в Heap
- **002-routing.md** — API роуты для аналитики
- [Документация GetCourse](https://getcourse.chatium.com/docs/sdk)

---

**Версия**: 1.0  
**Дата**: 2025-11-02  
**Последнее обновление**: Создание документации по GetCourse аналитике
