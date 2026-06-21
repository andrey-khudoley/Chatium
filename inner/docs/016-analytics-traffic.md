@chatium

# Traffic Аналитика - События пользователей на сайте

Руководство по работе с событиями трафика через ClickHouse: просмотры страниц, клики, видео и другие действия пользователей.

## Содержание

- [Основы Traffic Analytics](#основы-traffic-analytics)
- [Два способа работы с данными](#два-способа-работы-с-данными)
- [База данных ClickHouse](#база-данных-clickhouse)
- [Выполнение запросов](#выполнение-запросов)
- [Типы событий трафика (21)](#типы-событий-трафика-21)
- [SQL примеры запросов](#sql-примеры-запросов)
- [TypeScript примеры](#typescript-примеры)
- [Лучшие практики](#лучшие-практики)
- [Пагинация событий](#пагинация-событий) ⭐ NEW
- [Дедупликация событий](#дедупликация-событий) ⭐ NEW

---

## Основы Traffic Analytics

**Traffic Analytics** — система анализа поведения пользователей на вашем сайте через ClickHouse.

### Архитектура

```
Браузер пользователя
     ↓
window.clrtTrack() / автоматические события
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

### 1. Настраиваемый GetCourse MCP Client (для клиентских приложений)

**Использование**: События трафика из настроенного пользователем GetCourse аккаунта.

```typescript
import { gcQueryAi, integrationIsEnabled } from '@gc-mcp-server/sdk'

// Проверка настройки
const isConfigured = await integrationIsEnabled(ctx)

// Выполнение запросов к настроенному аккаунту
const result = await gcQueryAi(ctx, query)
```

**Преимущества**:

- ✅ Каждый пользователь видит трафик своего сайта
- ✅ Изоляция данных между пользователями
- ✅ Подходит для SaaS приложений

**Когда использовать**:

- Приложения для клиентов (каждый анализирует свой трафик)
- Мультиаккаунтные решения
- Агентские инструменты

### 2. Аккаунт разработчика (для внутренних инструментов)

**Использование**: События трафика из фиксированного аккаунта разработчика.

```typescript
import { queryAi } from '@traffic/sdk'

// Выполнение запросов к аккаунту разработчика
const result = await queryAi(ctx, query)
```

**Преимущества**:

- ✅ Не требует настройки
- ✅ Быстрый старт

**Недостатки**:

- ❌ Все видят данные одного аккаунта
- ❌ Нет изоляции данных

**Когда использовать**:

- Внутренние дашборды компании
- Аналитика собственного сайта
- Прототипирование

### Сравнительная таблица

| Аспект              | gcQueryAi (MCP Client)            | queryAi (Traffic SDK)  |
| ------------------- | --------------------------------- | ---------------------- |
| **Источник данных** | Настроенный пользователем аккаунт | Аккаунт разработчика   |
| **Импорт**          | `@gc-mcp-server/sdk`              | `@traffic/sdk`         |
| **Настройка**       | Требуется установка плагина       | Не требуется           |
| **Изоляция**        | Да (каждый видит свои данные)     | Нет (все видят одно)   |
| **Применение**      | SaaS, клиентские приложения       | Внутренние инструменты |

### Ключевые компоненты

| Компонент               | Описание                                    |
| ----------------------- | ------------------------------------------- |
| `@gc-mcp-server/sdk`    | SDK для настраиваемого GetCourse MCP Client |
| `@traffic/sdk`          | SDK для аккаунта разработчика               |
| `gcQueryAi(ctx, query)` | Запросы к настроенному аккаунту             |
| `queryAi(ctx, query)`   | Запросы к аккаунту разработчика             |
| `chatium_ai.access_log` | Таблица событий                             |
| `window.clrtTrack()`    | Клиентская запись событий                   |
| ClickHouse              | База данных                                 |

---

## База данных ClickHouse

### Таблица access_log

События трафика хранятся в той же таблице, что и GetCourse.

#### Ключевые колонки для трафика

```sql
-- Время
ts DateTime              -- Время события UTC
dt Date                  -- Дата события (партиция)
ts64 DateTime64(3)       -- Высокоточное время

-- Событие
urlPath String           -- URL страницы или event://custom/...
action String            -- Название действия (pageview, click, etc.)

-- Пользователь
user_id String           -- ID пользователя
uid String               -- ID сессии браузера (window.clrtUid)
session_id String        -- ID сессии

-- Параметры события
action_param1 String     -- Параметр 1
action_param2 String     -- Параметр 2
action_param3 String     -- Параметр 3

-- Технические данные
referer String           -- Источник перехода
user_agent String        -- User Agent браузера
ip_address String        -- IP адрес
country String           -- Страна
city String              -- Город

-- Заголовок
title String             -- Заголовок страницы

-- GetCourse
gc_visit_id Int64        -- ID визита GetCourse
gc_visitor_id Int64      -- ID посетителя GetCourse
gc_session_id Int64      -- ID сессии GetCourse
```

### Отличие от GetCourse событий

| Аспект       | Traffic                               | GetCourse               |
| ------------ | ------------------------------------- | ----------------------- |
| **urlPath**  | URL страницы или `event://custom/...` | `event://getcourse/...` |
| **action**   | Название действия                     | Не используется         |
| **Источник** | Браузер (window.clrtTrack)            | Сервер GetCourse        |

---

## Выполнение запросов

### Способ 1: gcQueryAi - Настраиваемый аккаунт (для клиентов)

**Рекомендуется для клиентских приложений** - каждый пользователь видит трафик своего сайта.

```typescript
import { gcQueryAi, integrationIsEnabled } from '@gc-mcp-server/sdk'
import { installSupportedApp } from '@store/sdk'

// Проверка настройки
export const indexRoute = app.html('/', async (ctx) => {
  const isConfigured = await integrationIsEnabled(ctx)

  if (!isConfigured) {
    return <SetupPage />  // Форма установки плагина
  }

  return <AnalyticsApp />
})

// Запросы к настроенному аккаунту
export const apiGetPageviewsRoute = app.get('/pageviews', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  const query = `
    SELECT
      COUNT(*) as total_pageviews,
      COUNT(DISTINCT uid) as unique_visitors,
      COUNT(DISTINCT session_id) as sessions
    FROM chatium_ai.access_log
    WHERE action = 'pageview'
      AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  try {
    const result = await gcQueryAi(ctx, query)
    const stats = result.rows?.[0]

    return {
      success: true,
      totalPageviews: stats?.total_pageviews || 0,
      uniqueVisitors: stats?.unique_visitors || 0,
      sessions: stats?.sessions || 0
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

### Способ 2: queryAi - Аккаунт разработчика (для внутренних инструментов)

**Использование для внутренних дашбордов** - данные из фиксированного аккаунта разработчика.

```typescript
import { queryAi } from '@traffic/sdk'

export const apiGetPageviewsRoute = app.get('/pageviews', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  const query = `
    SELECT 
      COUNT(*) as total_pageviews,
      COUNT(DISTINCT uid) as unique_visitors
    FROM chatium_ai.access_log
    WHERE action = 'pageview'
      AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  try {
    // Данные из аккаунта разработчика
    const result = await queryAi(ctx, query)
    const stats = result.rows?.[0]

    return {
      success: true,
      totalPageviews: stats?.total_pageviews || 0,
      uniqueVisitors: stats?.unique_visitors || 0
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
```

**⚠️ Важно**: При использовании `queryAi` все пользователи видят данные трафика одного аккаунта (разработчика).

### Формат ответа (одинаковый для обоих)

```typescript
interface QueryResult {
  rows: Array<Record<string, any>> // Массив строк
}

// Использование
const result = await gcQueryAi(ctx, query) // или queryAi(ctx, query)
const rows = result.rows || []
const firstRow = result.rows?.[0]
```

### Выбор подхода

```typescript
// ✅ Используйте gcQueryAi для:
// - SaaS приложений (каждый клиент видит свой трафик)
// - Мультиаккаунтных решений
// - Агентских инструментов
import { gcQueryAi } from '@gc-mcp-server/sdk'
const result = await gcQueryAi(ctx, query)

// ✅ Используйте queryAi для:
// - Внутренних дашбордов компании
// - Аналитики собственного сайта
// - Быстрого прототипирования
import { queryAi } from '@traffic/sdk'
const result = await queryAi(ctx, query)
```

---

## Типы событий трафика (21)

### Навигация

#### 1. pageview - Просмотр страницы

**Описание**: Фиксирует каждое посещение страницы.

**Поля**:

```
action = 'pageview'
urlPath = 'https://example.com/page'
title = 'Заголовок страницы'
referer = 'https://google.com'
user_agent = 'Mozilla/5.0...'
uid = 'browser_session_id'
```

**SQL пример**:

```sql
SELECT
  urlPath as page_url,
  title as page_title,
  COUNT(*) as views,
  COUNT(DISTINCT uid) as unique_visitors
FROM chatium_ai.access_log
WHERE action = 'pageview'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY urlPath, title
ORDER BY views DESC
LIMIT 20
```

### Взаимодействие

#### 2. registration - Регистрация

**SQL пример**:

```sql
SELECT
  dt as registration_date,
  COUNT(DISTINCT user_id) as new_registrations
FROM chatium_ai.access_log
WHERE action = 'registration'
  AND dt >= today() - 30
GROUP BY dt
ORDER BY dt ASC
```

#### 3. form_submit - Отправка формы

**Поля**:

```
action = 'form_submit'
action_param1 = 'form_id'
action_param2 = 'form_name'
```

**SQL пример**:

```sql
SELECT
  action_param2 as form_name,
  COUNT(*) as submissions,
  COUNT(DISTINCT uid) as unique_users
FROM chatium_ai.access_log
WHERE action = 'form_submit'
  AND dt >= today() - 7
GROUP BY form_name
ORDER BY submissions DESC
```

#### 4. button_click - Клик по кнопке

**Поля**:

```
action = 'button_click'
action_param1 = 'button_id'
action_param2 = 'button_text'
```

**SQL пример**:

```sql
SELECT
  action_param1 as button_id,
  action_param2 as button_text,
  COUNT(*) as clicks,
  COUNT(DISTINCT uid) as unique_clickers
FROM chatium_ai.access_log
WHERE action = 'button_click'
  AND dt >= today() - 7
GROUP BY button_id, button_text
ORDER BY clicks DESC
LIMIT 10
```

#### 5. link_click - Клик по ссылке

**Поля**:

```
action = 'link_click'
action_param1 = 'link_url'
action_param2 = 'link_text'
action_param3 = 'link_type' (internal/external)
```

### Медиа

#### 6-8. Видео (video_play, video_pause, video_complete)

**SQL пример - завершаемость видео**:

```sql
WITH plays AS (
  SELECT
    action_param1 as video_url,
    COUNT(*) as play_count
  FROM chatium_ai.access_log
  WHERE action = 'video_play'
    AND dt >= today() - 7
  GROUP BY video_url
),
completions AS (
  SELECT
    action_param1 as video_url,
    COUNT(*) as complete_count
  FROM chatium_ai.access_log
  WHERE action = 'video_complete'
    AND dt >= today() - 7
  GROUP BY video_url
)
SELECT
  p.video_url,
  p.play_count,
  COALESCE(c.complete_count, 0) as complete_count,
  ROUND((COALESCE(c.complete_count, 0) * 100.0 / p.play_count), 2) as completion_rate
FROM plays p
LEFT JOIN completions c ON p.video_url = c.video_url
ORDER BY p.play_count DESC
```

#### 9. scroll - Прокрутка страницы

**Поля**:

```
action = 'scroll'
action_param1 = 'scroll_depth' (25%, 50%, 75%, 100%)
```

**SQL пример - глубина прокрутки**:

```sql
SELECT
  action_param1 as scroll_depth,
  COUNT(*) as events_count,
  COUNT(DISTINCT uid) as unique_users
FROM chatium_ai.access_log
WHERE action = 'scroll'
  AND dt >= today() - 7
GROUP BY scroll_depth
ORDER BY scroll_depth ASC
```

#### 10. download - Скачивание файла

**Поля**:

```
action = 'download'
action_param1 = 'file_url'
action_param2 = 'file_name'
action_param3 = 'file_type'
```

#### 11. search - Поиск

**Поля**:

```
action = 'search'
action_param1 = 'search_query'
action_param2 = 'search_results_count'
```

**SQL пример - популярные запросы**:

```sql
SELECT
  action_param1 as search_query,
  COUNT(*) as search_count,
  AVG(CAST(action_param2 as Float32)) as avg_results
FROM chatium_ai.access_log
WHERE action = 'search'
  AND dt >= today() - 30
  AND action_param1 != ''
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 20
```

### E-commerce

#### 12-15. Корзина и покупки

**События**:

- `add_to_cart` - Добавление в корзину
- `remove_from_cart` - Удаление из корзины
- `checkout` - Оформление заказа
- `purchase` - Покупка

**SQL пример - воронка покупки**:

```sql
WITH funnel AS (
  SELECT
    SUM(CASE WHEN action = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_cart_count,
    SUM(CASE WHEN action = 'checkout' THEN 1 ELSE 0 END) as checkout_count,
    SUM(CASE WHEN action = 'purchase' THEN 1 ELSE 0 END) as purchase_count
  FROM chatium_ai.access_log
  WHERE action IN ('add_to_cart', 'checkout', 'purchase')
    AND dt >= today() - 30
)
SELECT
  add_to_cart_count,
  checkout_count,
  purchase_count,
  ROUND((checkout_count * 100.0 / GREATEST(add_to_cart_count, 1)), 2) as cart_to_checkout_rate,
  ROUND((purchase_count * 100.0 / GREATEST(checkout_count, 1)), 2) as checkout_to_purchase_rate,
  ROUND((purchase_count * 100.0 / GREATEST(add_to_cart_count, 1)), 2) as overall_conversion
FROM funnel
```

### Аутентификация

#### 16-17. Вход/выход (login, logout)

**SQL пример - активность по часам**:

```sql
SELECT
  toHour(ts) as hour,
  COUNT(CASE WHEN action = 'login' THEN 1 END) as logins,
  COUNT(CASE WHEN action = 'logout' THEN 1 END) as logouts
FROM chatium_ai.access_log
WHERE action IN ('login', 'logout')
  AND dt >= today() - 7
GROUP BY hour
ORDER BY hour ASC
```

### Социальное взаимодействие

#### 18-20. Социальные действия (share, comment, like)

**SQL пример - популярный контент**:

```sql
SELECT
  action_param1 as content_url,
  SUM(CASE WHEN action = 'like' THEN 1 ELSE 0 END) as likes,
  SUM(CASE WHEN action = 'comment' THEN 1 ELSE 0 END) as comments,
  SUM(CASE WHEN action = 'share' THEN 1 ELSE 0 END) as shares,
  SUM(CASE WHEN action IN ('like', 'comment', 'share') THEN 1 ELSE 0 END) as total_engagement
FROM chatium_ai.access_log
WHERE action IN ('like', 'comment', 'share')
  AND dt >= today() - 30
GROUP BY content_url
ORDER BY total_engagement DESC
LIMIT 20
```

#### 21. custom_action - Пользовательское действие

**Гибкое событие для любых кастомных действий**.

---

## SQL примеры запросов

### Базовые метрики

#### DAU/MAU - Активные пользователи

```sql
-- Daily Active Users
SELECT
  dt,
  COUNT(DISTINCT uid) as dau
FROM chatium_ai.access_log
WHERE action = 'pageview'
  AND dt >= today() - 30
GROUP BY dt
ORDER BY dt ASC

-- Monthly Active Users
SELECT
  toStartOfMonth(dt) as month,
  COUNT(DISTINCT uid) as mau
FROM chatium_ai.access_log
WHERE action = 'pageview'
  AND dt >= subtractMonths(today(), 6)
GROUP BY month
ORDER BY month ASC
```

#### Bounce Rate - Показатель отказов

```sql
WITH sessions AS (
  SELECT
    session_id,
    COUNT(*) as pages_viewed
  FROM chatium_ai.access_log
  WHERE action = 'pageview'
    AND dt >= today() - 7
  GROUP BY session_id
)
SELECT
  COUNT(CASE WHEN pages_viewed = 1 THEN 1 END) as bounced_sessions,
  COUNT(*) as total_sessions,
  ROUND((COUNT(CASE WHEN pages_viewed = 1 THEN 1 END) * 100.0 / COUNT(*)), 2) as bounce_rate
FROM sessions
```

#### Session Duration - Длительность сессий

```sql
WITH sessions AS (
  SELECT
    session_id,
    MIN(ts) as session_start,
    MAX(ts) as session_end,
    dateDiff('second', MIN(ts), MAX(ts)) as duration_seconds
  FROM chatium_ai.access_log
  WHERE dt >= today() - 7
  GROUP BY session_id
)
SELECT
  ROUND(AVG(duration_seconds), 2) as avg_duration_seconds,
  ROUND(AVG(duration_seconds) / 60, 2) as avg_duration_minutes,
  COUNT(*) as total_sessions
FROM sessions
WHERE duration_seconds > 0
```

### Продвинутые запросы

#### Conversion Funnel - Воронка конверсии

```sql
WITH pageviews AS (
  SELECT COUNT(DISTINCT uid) as count
  FROM chatium_ai.access_log
  WHERE action = 'pageview' AND dt >= today() - 7
),
registrations AS (
  SELECT COUNT(DISTINCT uid) as count
  FROM chatium_ai.access_log
  WHERE action = 'registration' AND dt >= today() - 7
),
purchases AS (
  SELECT COUNT(DISTINCT uid) as count
  FROM chatium_ai.access_log
  WHERE action = 'purchase' AND dt >= today() - 7
)
SELECT
  p.count as pageviews,
  r.count as registrations,
  pu.count as purchases,
  ROUND((r.count * 100.0 / p.count), 2) as pageview_to_registration,
  ROUND((pu.count * 100.0 / r.count), 2) as registration_to_purchase,
  ROUND((pu.count * 100.0 / p.count), 2) as overall_conversion
FROM pageviews p, registrations r, purchases pu
```

#### User Journey - Путь пользователя

```sql
SELECT
  uid,
  groupArray(action) as user_journey,
  groupArray(ts) as timestamps,
  MIN(ts) as first_action,
  MAX(ts) as last_action
FROM chatium_ai.access_log
WHERE uid = 'specific_user_id'
  AND dt >= today() - 1
GROUP BY uid
ORDER BY first_action ASC
```

#### Cohort Analysis - Когортный анализ

```sql
WITH first_visit AS (
  SELECT
    uid,
    toStartOfMonth(MIN(dt)) as cohort_month
  FROM chatium_ai.access_log
  WHERE action = 'pageview'
  GROUP BY uid
),
monthly_activity AS (
  SELECT
    uid,
    toStartOfMonth(dt) as activity_month
  FROM chatium_ai.access_log
  WHERE action = 'pageview'
  GROUP BY uid, activity_month
)
SELECT
  fv.cohort_month,
  ma.activity_month,
  dateDiff('month', fv.cohort_month, ma.activity_month) as months_since_first_visit,
  COUNT(DISTINCT fv.uid) as cohort_size,
  COUNT(DISTINCT ma.uid) as active_users,
  ROUND((COUNT(DISTINCT ma.uid) * 100.0 / COUNT(DISTINCT fv.uid)), 2) as retention_rate
FROM first_visit fv
LEFT JOIN monthly_activity ma ON fv.uid = ma.uid
WHERE fv.cohort_month >= '2025-01-01'
GROUP BY fv.cohort_month, ma.activity_month
ORDER BY fv.cohort_month, ma.activity_month
```

---

## TypeScript примеры

### Получение статистики трафика (с gcQueryAi)

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

interface TrafficStats {
  total_pageviews: number
  unique_visitors: number
  sessions: number
  avg_session_duration: number
  bounce_rate: number
}

export const apiTrafficStatsRoute = app.get('/traffic-stats', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  const query = `
    WITH pageviews AS (
      SELECT 
        COUNT(*) as pv_count,
        COUNT(DISTINCT uid) as unique_visitors,
        COUNT(DISTINCT session_id) as sessions
      FROM chatium_ai.access_log
      WHERE action = 'pageview'
        AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
    ),
    sessions_duration AS (
      SELECT 
        session_id,
        dateDiff('second', MIN(ts), MAX(ts)) as duration
      FROM chatium_ai.access_log
      WHERE dt BETWEEN '${dateFrom}' AND '${dateTo}'
      GROUP BY session_id
    ),
    bounced_sessions AS (
      SELECT 
        session_id,
        COUNT(*) as page_count
      FROM chatium_ai.access_log
      WHERE action = 'pageview'
        AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
      GROUP BY session_id
      HAVING page_count = 1
    )
    SELECT 
      pv.pv_count as total_pageviews,
      pv.unique_visitors,
      pv.sessions,
      ROUND(AVG(sd.duration), 2) as avg_session_duration,
      ROUND((COUNT(bs.session_id) * 100.0 / pv.sessions), 2) as bounce_rate
    FROM pageviews pv
    CROSS JOIN sessions_duration sd
    LEFT JOIN bounced_sessions bs ON 1=1
    GROUP BY pv.pv_count, pv.unique_visitors, pv.sessions
  `

  try {
    // Используем gcQueryAi для настроенного аккаунта
    const result = await gcQueryAi(ctx, query)
    const stats = result.rows?.[0] as TrafficStats

    return {
      success: true,
      stats: {
        totalPageviews: stats?.total_pageviews || 0,
        uniqueVisitors: stats?.unique_visitors || 0,
        sessions: stats?.sessions || 0,
        avgSessionDuration: stats?.avg_session_duration || 0,
        bounceRate: stats?.bounce_rate || 0
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
```

### Получение статистики трафика (с queryAi)

```typescript
import { queryAi } from '@traffic/sdk'

export const apiTrafficStatsRoute = app.get('/traffic-stats', async (ctx, req) => {
  const { dateFrom = '2025-01-01', dateTo = '2025-01-31' } = req.query

  const query = `
    SELECT 
      COUNT(*) as total_pageviews,
      COUNT(DISTINCT uid) as unique_visitors
    FROM chatium_ai.access_log
    WHERE action = 'pageview'
      AND dt BETWEEN '${dateFrom}' AND '${dateTo}'
  `

  try {
    // Используем queryAi для аккаунта разработчика
    const result = await queryAi(ctx, query)
    const stats = result.rows?.[0]

    return {
      success: true,
      totalPageviews: stats?.total_pageviews || 0,
      uniqueVisitors: stats?.unique_visitors || 0
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
```

### Популярные страницы

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

export const apiTopPagesRoute = app.get('/top-pages', async (ctx, req) => {
  const { limit = 10 } = req.query

  const query = `
    SELECT 
      urlPath as page_url,
      title as page_title,
      COUNT(*) as views,
      COUNT(DISTINCT uid) as unique_visitors,
      AVG(CASE 
        WHEN action = 'scroll' AND action_param1 = '100%' THEN 1 
        ELSE 0 
      END) as scroll_to_bottom_rate
    FROM chatium_ai.access_log
    WHERE action IN ('pageview', 'scroll')
      AND dt >= subtractDays(today(), 30)
      AND startsWith(urlPath, 'https')
    GROUP BY urlPath, title
    ORDER BY views DESC
    LIMIT ${Number(limit)}
  `

  // Можно использовать как gcQueryAi, так и queryAi
  const result = await gcQueryAi(ctx, query)

  return {
    success: true,
    pages: result.rows || []
  }
})
```

### Источники трафика

```typescript
import { queryAi } from '@traffic/sdk'

export const apiTrafficSourcesRoute = app.get('/traffic-sources', async (ctx) => {
  const query = `
    SELECT 
      CASE 
        WHEN referer = '' THEN 'Direct'
        WHEN referer LIKE '%google%' THEN 'Google'
        WHEN referer LIKE '%yandex%' THEN 'Yandex'
        WHEN referer LIKE '%facebook%' THEN 'Facebook'
        WHEN referer LIKE '%vk.com%' THEN 'VK'
        ELSE 'Other'
      END as source,
      COUNT(DISTINCT uid) as visitors,
      COUNT(*) as visits
    FROM chatium_ai.access_log
    WHERE action = 'pageview'
      AND dt >= subtractDays(today(), 7)
    GROUP BY source
    ORDER BY visitors DESC
  `

  // Для внутреннего инструмента можно использовать queryAi
  const result = await queryAi(ctx, query)

  return {
    success: true,
    sources: result.rows || []
  }
})
```

---

## Лучшие практики

### 1. Используйте правильный фильтр

```sql
-- ✅ Для событий трафика
WHERE action = 'pageview'

-- ✅ Для custom событий
WHERE startsWith(urlPath, 'event://custom/')

-- ✅ Для страниц сайта
WHERE startsWith(urlPath, 'https')
```

### 2. Всегда фильтруйте по дате

```sql
-- ✅ Правильно
WHERE action = 'pageview'
  AND dt BETWEEN '2025-01-01' AND '2025-01-31'

-- ❌ Неправильно
WHERE action = 'pageview'
-- Медленно без фильтра по дате!
```

### 3. Используйте uid для уникальных пользователей

```sql
-- ✅ Правильно
COUNT(DISTINCT uid) as unique_visitors

-- ⚠️ user_id может быть NULL для неавторизованных
COUNT(DISTINCT user_id) as logged_in_users
```

### 4. Проверяйте наличие данных

```typescript
const result = await queryAi(ctx, query)

if (!result.rows || result.rows.length === 0) {
  return { success: true, data: [], message: 'No data found' }
}
```

### 5. Логируйте медленные запросы

```typescript
const startTime = Date.now()
const result = await queryAi(ctx, query)
const duration = Date.now() - startTime

if (duration > 3000) {
  ctx.account.log('Slow traffic query', {
    level: 'warn',
    json: { duration, query: query.substring(0, 200) }
  })
}
```

---

## Полный список событий трафика

### ⚠️ Важно: HTTP/HTTPS события

**Все запросы к http:// и https:// URL группируются по полю `action`**, а не по конкретному URL.

**Пример:**

```sql
-- ❌ НЕПРАВИЛЬНО: фильтровать по конкретным URL
WHERE urlPath = 'https://example.com/page1'

-- ✅ ПРАВИЛЬНО: фильтровать по action
WHERE action = 'pageview'
  AND (startsWith(urlPath, 'http://') OR startsWith(urlPath, 'https://'))
```

### Базовые события HTTP трафика (8)

Эти события определены в `shared/eventTypes.ts` и доступны для отслеживания:

| Action           | Описание                | Использование                    |
| ---------------- | ----------------------- | -------------------------------- |
| `pageview`       | Просмотр страницы       | Отслеживание просмотров страниц  |
| `button_click`   | Клик по кнопке          | Клики по интерактивным элементам |
| `link_click`     | Клик по ссылке          | Переходы по ссылкам              |
| `scroll`         | Прокрутка страницы      | Глубина прокрутки контента       |
| `form_submit`    | Отправка формы          | Отправка любых форм на сайте     |
| `video_play`     | Воспроизведение видео   | Начало воспроизведения видео     |
| `video_pause`    | Пауза видео             | Пауза во время просмотра         |
| `video_complete` | Просмотр видео до конца | Завершение просмотра видео       |

**Всего: 8 основных типов событий трафика**

### Расширенные события (опционально)

Эти события можно добавить в `eventTypes.ts` при необходимости:

**Регистрация и действия (5):**

- `registration` - Регистрация
- `download` - Скачивание файла
- `search` - Поиск
- `login` - Вход
- `logout` - Выход

**E-commerce (4):**

- `add_to_cart` - Добавление в корзину
- `remove_from_cart` - Удаление из корзины
- `checkout` - Оформление заказа
- `purchase` - Покупка

**Социальное (3):**

- `share` - Поделиться
- `comment` - Комментарий
- `like` - Лайк

**Прочее (1):**

- `custom_action` - Пользовательское действие

**Расширенный список: до 21 типа событий**

### Комбинирование с событиями GetCourse

**Практический пример: Мониторинг трафика И GetCourse событий одним запросом**

```sql
-- Комбинированный запрос: трафик + GetCourse
SELECT
  urlPath,
  action,
  CASE
    WHEN action IN ('pageview', 'button_click', 'link_click') THEN 'traffic'
    WHEN urlPath LIKE 'event://getcourse/%' THEN 'getcourse'
    WHEN urlPath LIKE 'event://refunnels/%' THEN 'refunnels'
    ELSE 'other'
  END as event_category,
  user_id,
  title,
  dt,
  ts
FROM chatium_ai.access_log
WHERE (
  -- Traffic события
  action IN ('pageview', 'button_click', 'form_submit', 'video_play')
  -- GetCourse события (паттерн)
  OR urlPath LIKE 'event://getcourse/%'
  -- ReFunnels события
  OR urlPath LIKE 'event://refunnels/%'
)
AND dt >= today() - 7
ORDER BY ts DESC
LIMIT 1000
```

**Преимущества:**

- ✅ Один запрос вместо нескольких
- ✅ Все типы событий в едином потоке
- ✅ Категоризация через CASE
- ✅ Оптимальная производительность

**TypeScript пример с динамическим фильтром:**

```typescript
import { EventDefinition } from '../shared/eventTypes'

function buildEventFilter(selectedEvents: EventDefinition[]): string {
  const conditions: string[] = []

  for (const event of selectedEvents) {
    if (event.urlPattern) {
      // Паттерн (категория событий)
      conditions.push(`urlPath LIKE '${event.urlPattern}'`)
    } else if (event.urlPath) {
      // Конкретный путь (GetCourse событие)
      conditions.push(`urlPath = '${event.urlPath}'`)
    } else {
      // HTTP событие (action)
      conditions.push(`action = '${event.name}'`)
    }
  }

  return conditions.length > 0 ? conditions.join(' OR ') : '1=1'
}

// Использование
const whereClause = buildEventFilter(selectedEvents)
const query = `
  SELECT * FROM chatium_ai.access_log
  WHERE (${whereClause}) AND dt >= today() - 1
`
```

---

## Пагинация событий

### Проблема

При работе с большим количеством событий необходимо реализовать постраничную навигацию. Однако простая пагинация через OFFSET может приводить к нестабильным результатам, когда новые события добавляются в процессе просмотра страниц.

### Решение: Пагинация с фиксацией временной точки

**Ключевая идея**: Зафиксировать timestamp первой страницы и использовать его для всех последующих страниц.

### Реализация на бэкенде

```typescript
// Единый API endpoint с двумя режимами работы
export const apiEventsRoute = app
  .body((s) => ({
    mode: s.string().default('list'), // 'list' | 'poll'
    limit: s.number().default(25),
    offset: s.number().default(0),
    sinceTimestamp: s.string().optional(), // Для poll: события ПОСЛЕ
    maxTimestamp: s.string().optional() // Для list: события ДО
  }))
  .post('/events', async (ctx, req) => {
    const { mode, limit, offset, maxTimestamp } = req.body

    if (mode === 'list') {
      // Фильтр по максимальному timestamp (снимок данных)
      const timestampFilter = maxTimestamp ? `AND ts <= '${maxTimestamp.replace(/'/g, "''")}'` : ''

      const query = `
      SELECT 
        ts, urlPath, action, uid, user_id, title
      FROM chatium_ai.access_log
      WHERE dt >= today() - 7
        ${timestampFilter}
      ORDER BY ts DESC, urlPath ASC  -- Стабильная сортировка!
      LIMIT ${limit}
      OFFSET ${offset}
    `

      const result = await gcQueryAi(ctx, query)

      return {
        success: true,
        events: result.rows || [],
        total: result.rows?.length || 0
      }
    }
  })
```

### Реализация на фронтенде

```vue
<script setup>
import { ref } from 'vue'

const events = ref([])
const currentPage = ref(1)
const pageSize = ref(25)
const maxTimestamp = ref(null) // КЛЮЧЕВАЯ переменная!

// Загрузка событий
const loadEvents = async () => {
  const offset = (currentPage.value - 1) * pageSize.value

  const result = await apiEventsRoute.run(ctx, {
    mode: 'list',
    limit: pageSize.value,
    offset: offset,
    maxTimestamp: maxTimestamp.value // Используем зафиксированный timestamp
  })

  if (result.success) {
    events.value = result.events || []

    // На ПЕРВОЙ странице фиксируем maxTimestamp
    if (currentPage.value === 1 && events.value.length > 0) {
      maxTimestamp.value = events.value[0].ts
      console.log('Fixed maxTimestamp:', maxTimestamp.value)
    }
  }
}

// Переход на следующую страницу
const nextPage = async () => {
  currentPage.value++
  await loadEvents()
}

// Переход на предыдущую страницу
const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--
    await loadEvents()
  }
}

// Обновление (сброс на первую страницу)
const refreshEvents = async () => {
  currentPage.value = 1
  maxTimestamp.value = null // Сбрасываем фиксацию
  await loadEvents()
}
</script>
```

### Почему это работает?

1. **Страница 1**: Получаем 25 самых свежих событий
2. **Фиксируем** timestamp первого события: `2025-11-10 18:00:00`
3. **Страница 2**: Запрашиваем события ДО `2025-11-10 18:00:00` с offset 25
4. **Страница 3**: Те же условия, offset 50
5. **Результат**: Стабильная выборка, новые события не влияют на пагинацию

### Стабильная сортировка

```sql
-- ✅ ПРАВИЛЬНО: стабильная сортировка
ORDER BY ts DESC, urlPath ASC

-- ❌ НЕПРАВИЛЬНО: нестабильная сортировка
ORDER BY ts DESC
-- События с одинаковым ts могут менять порядок!
```

**Зачем нужна вторая колонка (`urlPath`)**:

- События могут иметь одинаковый timestamp
- Без второй колонки порядок таких событий недетерминирован
- Это приводит к "прыганию" событий между страницами

### Пример работы

**Исходные данные (в реальном времени добавляются новые):**

```
18:05:00 - event1
18:04:00 - event2
18:03:00 - event3
... (всего 100 событий)
```

**Без фиксации maxTimestamp:**

```
Страница 1 (offset 0):  18:05:00, 18:04:00, 18:03:00 ... (25 событий)
[Новое событие 18:06:00 добавляется]
Страница 2 (offset 25): 18:04:00, 18:03:00, ... ← ДУБЛИКАТ 18:04:00!
```

**С фиксацией maxTimestamp:**

```
Страница 1 (offset 0):             18:05:00, 18:04:00, ... (25)
maxTimestamp = 18:05:00  ← ФИКСИРУЕМ
[Новое событие 18:06:00 НЕ ВЛИЯЕТ на пагинацию]
Страница 2 (offset 25, ts <= 18:05:00): 18:02:00, 18:01:00, ... (25)
Страница 3 (offset 50, ts <= 18:05:00): 17:59:00, 17:58:00, ... (25)
```

---

## Дедупликация событий

### Проблема

При размещении счетчиков в **iframe** на странице одно посещение может генерировать **множественные события**:

```
Пользователь зашел на страницу → страница загрузила 3 iframe со счетчиками:
1. 18:35:58.955 - key.sobolevarent.ru, user1 (основная страница)
2. 18:35:59.123 - key.sobolevarent.ru, user1 (iframe #1)
3. 18:35:59.368 - key.sobolevarent.ru, user1 (iframe #2)
```

Все 3 события имеют одинаковый URL и UID, но разные миллисекунды.

### Решение: Последовательная дедупликация

**Ключевая идея**: Событие считается дубликатом, если оно идет **сразу после** события с тем же `URL + UID` и разница во времени **≤ 5 секунд**.

### Алгоритм дедупликации

```typescript
/**
 * Дедупликация событий - убирает последовательные дубликаты
 * Событие = дубликат если оно идет СРАЗУ после события с тем же URL+UID и разница <= 5 сек
 * @shared
 */
export function deduplicateEvents(events: any[]): any[] {
  if (!events || events.length === 0) {
    return events
  }

  const result: any[] = []
  let lastAddedKey: string | null = null
  let lastAddedTs: number | null = null

  for (const event of events) {
    const urlPath = event.urlPath || ''
    const uid = event.uid || event.user_id || ''
    const key = `${urlPath}:${uid}`
    const eventTs = new Date(event.ts || '').getTime()

    let isDuplicate = false

    // Проверяем только с ПОСЛЕДНИМ ДОБАВЛЕННЫМ событием
    if (lastAddedKey && lastAddedTs) {
      if (key === lastAddedKey) {
        const diffSeconds = Math.abs(eventTs - lastAddedTs) / 1000

        // Если разница <= 5 секунд - это последовательный дубликат
        if (diffSeconds <= 5) {
          isDuplicate = true
        }
      }
    }

    if (!isDuplicate) {
      // Добавляем событие и обновляем "последнее добавленное"
      result.push(event)
      lastAddedKey = key
      lastAddedTs = eventTs
    }
    // Если дубликат - НЕ обновляем "последнее добавленное"
  }

  return result
}
```

### Примеры работы дедупликации

**Пример 1: Iframe дубликаты фильтруются**

```javascript
Входные события (DESC сортировка):
1. 18:35:58.955 - key.sobolevarent.ru, user1 ✅ добавляется
2. 18:35:59.123 - key.sobolevarent.ru, user1 ❌ ДУБЛИКАТ (0.17 сек)
3. 18:35:59.368 - key.sobolevarent.ru, user1 ❌ ДУБЛИКАТ (0.41 сек)

Результат: остается только событие #1
```

**Пример 2: Повторные визиты НЕ фильтруются**

```javascript
Входные события:
1. 18:00:10 - page1, user1 ✅ добавляется
2. 18:00:09 - page1, user1 ❌ дубликат (1 сек)
3. 18:00:02 - page1, user1 ✅ добавляется (8 сек > 5, не дубликат)

Результат: события #1 и #3 (пользователь зашел дважды)
```

**Пример 3: Другой URL сбрасывает последовательность**

```javascript
Входные события:
1. 18:00:10 - page1, user1 ✅ добавляется
2. 18:00:09 - page2, user1 ✅ добавляется (другой URL)
3. 18:00:08 - page1, user1 ✅ добавляется (предыдущий был page2)

Результат: все 3 события сохраняются
```

### Применение дедупликации на бэкенде

#### Режим 1: Первая загрузка (`list`)

```typescript
// Запрашиваем БОЛЬШЕ событий с запасом на дубликаты
const fetchLimit = limit * 3 // 25 → запросим 75

const query = `
  SELECT ts, urlPath, uid, user_id, action, title
  FROM chatium_ai.access_log
  WHERE dt >= today() - 7
  ORDER BY ts DESC, urlPath ASC
  LIMIT ${fetchLimit}
  OFFSET ${offset}
`

const result = await gcQueryAi(ctx, query)
const allEvents = result.rows || []

// Применяем дедупликацию
const deduplicatedEvents = deduplicateEvents(allEvents)

// Берем только нужное количество ПОСЛЕ дедупликации
const events = deduplicatedEvents.slice(0, limit)

return {
  success: true,
  events,
  total: events.length
}
```

**Зачем запрашивать в 3 раза больше?**

- После фильтрации дубликатов может остаться меньше событий
- Запас гарантирует, что мы получим нужные 25 уникальных событий
- Если дубликатов нет - просто обрежем до 25

#### Режим 2: Мониторинг (`poll`)

```typescript
// Получаем НОВЫЕ события после lastProcessedTs
const timestampFilter = sinceTimestamp
  ? `AND ts > '${sinceTimestamp.replace(/'/g, "''")}'`
  : `AND ts >= now() - INTERVAL 30 MINUTE`

const query = `
  SELECT ts, urlPath, uid, user_id, action
  FROM chatium_ai.access_log
  WHERE dt >= today() - 7
    ${timestampFilter}
  ORDER BY ts ASC  -- ASC для мониторинга!
  LIMIT 100
`

const result = await gcQueryAi(ctx, query)
const deduplicatedEvents = deduplicateEvents(result.rows || [])

// Отправляем через WebSocket
await sendDataToSocket(ctx, socketId, {
  type: 'events-update',
  data: deduplicatedEvents
})

return {
  success: true,
  events: deduplicatedEvents,
  latestTimestamp: deduplicatedEvents[deduplicatedEvents.length - 1]?.ts
}
```

### Применение дедупликации на фронтенде

```vue
<script setup>
// WebSocket обработчик с дедупликацией
socketSubscription.value.listen((message) => {
  if (message.type === 'events-update') {
    const incomingEvents = message.data.map((e) => ({ ...e, isNew: true }))

    // Берем первое (самое новое) событие из списка
    let lastAddedKey = null
    let lastAddedTs = null

    if (events.value.length > 0) {
      const firstEvent = events.value[0]
      lastAddedKey = `${firstEvent.urlPath}:${firstEvent.uid || firstEvent.user_id}`
      lastAddedTs = new Date(firstEvent.ts).getTime()
    }

    // Фильтруем последовательные дубликаты
    const newEvents = []

    for (const event of incomingEvents) {
      const key = `${event.urlPath}:${event.uid || event.user_id}`
      const eventTs = new Date(event.ts).getTime()

      let isDuplicate = false

      if (lastAddedKey && lastAddedTs) {
        if (key === lastAddedKey) {
          const diffSeconds = Math.abs(eventTs - lastAddedTs) / 1000

          if (diffSeconds <= 5) {
            isDuplicate = true
          }
        }
      }

      if (!isDuplicate) {
        newEvents.push(event)
        lastAddedKey = key
        lastAddedTs = eventTs
      }
    }

    // Добавляем отфильтрованные события в начало списка
    if (newEvents.length > 0) {
      events.value = [...newEvents, ...events.value]
    }
  }
})
</script>
```

### Запуск мониторинга с правильным lastProcessedTs

```vue
<script setup>
const startMonitoring = async () => {
  // 1. Сначала обновляем список - загружаем свежие данные
  await refreshEvents()

  // 2. Берем timestamp ПОСЛЕДНЕГО загруженного события
  const lastProcessedTs =
    events.value.length > 0 && events.value[0].ts ? events.value[0].ts : new Date().toISOString()

  console.log('Starting monitoring with lastProcessedTs:', lastProcessedTs)

  // 3. Запускаем джобу с этим timestamp
  const result = await apiStartMonitoringRoute.run(ctx, {
    lastProcessedTs
  })

  if (result.success) {
    isMonitoring.value = true
    // Подключаем WebSocket для получения новых событий
    await setupWebSocket()
  }
}
</script>
```

### Джоба мониторинга

```typescript
export const monitorEventsJob = app.job(
  '/monitor-events',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
      lastProcessedTs?: string
    }
  ) => {
    // Проверяем активность мониторинга
    const monitoring = await Monitoring.findOneBy(ctx, {
      userId: params.userId,
      isActive: true
    })

    if (!monitoring) {
      return // Мониторинг остановлен
    }

    // Получаем новые события через API в режиме 'poll'
    const result = await apiEventsRoute.run(ctx, {
      mode: 'poll',
      sinceTimestamp: params.lastProcessedTs
    })

    if (result.success && result.events.length > 0) {
      // Отправляем через WebSocket
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: result.events
      })
    }

    // Планируем следующую проверку через 15 секунд
    const nextTaskId = await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastProcessedTs: result.latestTimestamp || params.lastProcessedTs
    })

    // Обновляем taskId в мониторинге
    await Monitoring.update(ctx, {
      id: monitoring.id,
      taskId: String(nextTaskId)
    })
  }
)
```

### API для запуска мониторинга

```typescript
export const apiStartMonitoringRoute = app.post('/start-monitoring', async (ctx, req) => {
  const userId = ctx.user?.id || 'test-user-' + Date.now()

  // Проверяем существующий мониторинг
  const existing = await Monitoring.findOneBy(ctx, {
    userId,
    isActive: true
  })

  if (existing) {
    return {
      success: true,
      message: 'Мониторинг уже активен',
      alreadyActive: true
    }
  }

  const socketId = `events-monitor-${userId}`

  // ВАЖНО: Используем переданный или текущий timestamp
  const lastProcessedTs = req.body?.lastProcessedTs || new Date().toISOString()

  // Запускаем джобу СРАЗУ (scheduleJobAsap)
  const taskId = await monitorEventsJob.scheduleJobAsap(ctx, {
    userId,
    socketId,
    lastProcessedTs // ← Ключевой параметр!
  })

  // Сохраняем мониторинг
  await Monitoring.create(ctx, {
    userId,
    socketId,
    taskId: String(taskId),
    isActive: true,
    startedAt: new Date()
  })

  const encodedSocketId = await genSocketId(ctx, socketId)

  return {
    success: true,
    socketId: encodedSocketId,
    message: 'Мониторинг запущен'
  }
})
```

### Полный flow работы системы

```
1. ОТКРЫТИЕ СТРАНИЦЫ
   ↓
   loadEvents() → API (mode: list, offset: 0, maxTimestamp: null)
   ↓
   Получаем 25 событий
   ↓
   maxTimestamp = events[0].ts  ← ФИКСИРУЕМ

2. НАЖАТИЕ "НАЧАТЬ МОНИТОРИНГ"
   ↓
   refreshEvents() → обновляем список
   ↓
   lastProcessedTs = events[0].ts  ← берем timestamp последнего
   ↓
   apiStartMonitoring({ lastProcessedTs })
   ↓
   Джоба запускается с lastProcessedTs
   ↓
   Каждые 15 сек: API (mode: poll, sinceTimestamp: lastProcessedTs)
   ↓
   Новые события → WebSocket → фронтенд (с дедупликацией)

3. ПЕРЕХОД НА СТРАНИЦУ 2
   ↓
   currentPage = 2
   ↓
   loadEvents() → API (mode: list, offset: 25, maxTimestamp: ЗАФИКСИРОВАННЫЙ)
   ↓
   Получаем следующие 25 событий из снимка
   ↓
   Мониторинг автоматически останавливается
```

### Метрики и логирование

```typescript
ctx.account.log('Events list executed', {
  level: 'info',
  json: {
    mode,
    limit,
    offset,
    maxTimestamp,
    rowsCount: allEvents.length, // Получено из ClickHouse
    deduplicatedCount: dedupEvents.length, // После дедупликации
    removedDuplicates: allEvents.length - dedupEvents.length,
    returnedCount: events.length // Возвращено клиенту
  }
})
```

### Unit тест дедупликации

```typescript
case 'events_deduplication':
  const testEvents = [
    { ts: '2025-11-09 12:00:20.000', urlPath: 'page1', uid: 'user1' },
    { ts: '2025-11-09 12:00:19.000', urlPath: 'page1', uid: 'user1' }, // Дубликат
    { ts: '2025-11-09 12:00:18.000', urlPath: 'page1', uid: 'user1' }, // Дубликат
    { ts: '2025-11-09 12:00:14.000', urlPath: 'page1', uid: 'user1' }, // НЕ дубликат (6 сек)
    { ts: '2025-11-09 12:00:13.000', urlPath: 'page2', uid: 'user1' }, // НЕ дубликат (другой URL)
    { ts: '2025-11-09 12:00:07.000', urlPath: 'page1', uid: 'user1' }  // НЕ дубликат (предыдущий page2)
  ]

  const result = deduplicateEvents(testEvents)

  // Ожидаем 4 события (убрались #2, #3)
  if (result.length !== 4) {
    throw new Error(`Ожидалось 4, получено ${result.length}`)
  }

  // Проверяем последовательность
  assert(result[0].ts === '2025-11-09 12:00:20.000')
  assert(result[1].ts === '2025-11-09 12:00:14.000')
  assert(result[2].ts === '2025-11-09 12:00:13.000')
  assert(result[3].ts === '2025-11-09 12:00:07.000')
  break
```

### Где применять дедупликацию

| Место              | Применять?     | Причина                                          |
| ------------------ | -------------- | ------------------------------------------------ |
| API режим `list`   | ✅ ДА          | Фильтрует дубликаты при первой загрузке          |
| API режим `poll`   | ✅ ДА          | Фильтрует дубликаты в джобе                      |
| Фронтенд WebSocket | ✅ ДА          | Дополнительная фильтрация перед добавлением в UI |
| Статистика (COUNT) | ❌ НЕТ         | Дедупликация уже в `COUNT(DISTINCT uid)`         |
| Экспорт данных     | ⚠️ ОПЦИОНАЛЬНО | Зависит от требований                            |

### Ключевые моменты

**✅ Правильно:**

- Сравнивать с **последним добавленным** событием
- Проверять временную разницу (≤ 5 секунд)
- НЕ обновлять "последнее" если пропускаем дубликат
- Применять дедупликацию везде: `list`, `poll`, WebSocket

**❌ Неправильно:**

- Сравнивать со ВСЕМИ предыдущими событиями (слишком агрессивно)
- Фильтровать только по одной секунде (пропустит дубликаты в 18:00:01 и 18:00:02)
- Обновлять "последнее" при пропуске дубликата
- Применять дедупликацию только в одном месте

---

## Связанные документы

- **016-analytics-getcourse.md** — События GetCourse и ClickHouse запросы
- **016-analytics-workspace.md** — События workspace (writeWorkspaceEvent)
- **016-analytics-subscriptions.md** — Система подписок на события
- **E01-gc-sdk.md** — GetCourse SDK (методы, настройка MCP Client)
- **014-socket.md** — WebSocket мониторинг
- **008-heap.md** — Heap таблицы
- **Проекты**:
  - `dev/partnership` - партнёрская система с GetCourse и трафиком
  - `dev/events-subscribe` - мониторинг событий
  - `ref/analitika-getkursa-extended` - референс аналитики

---

**Версия**: 3.0  
**Дата создания**: 2025-11-07  
**Последнее обновление**: 2025-11-10  
**Статус**:

- ✅ Добавлена исчерпывающая инструкция по **пагинации с фиксацией timestamp**
- ✅ Добавлена полная инструкция по **последовательной дедупликации**
- ✅ Описан полный flow работы: загрузка → мониторинг → пагинация
- ✅ Примеры кода для бэкенда (API, джоба) и фронтенда (Vue)
- ✅ Unit тесты и метрики логирования
- ✅ Таблица применения дедупликации в разных местах
- Добавлена информация о двух способах работы с трафиком: настраиваемый MCP Client и аккаунт разработчика
- Актуализирован список событий (8 базовых + 13 расширенных = 21 тип)
- Добавлено важное правило: HTTP/HTTPS события группируются по `action`, а не по URL
- Добавлены примеры комбинированных запросов с GetCourse событиями
- Добавлена функция `buildEventFilter()` для динамической фильтрации
