---
name: chatium-analytics-getcourse
description: Аналитика GetCourse в Chatium — gcQueryAi, события GetCourse (dealCreated, dealPaid, user/created), SQL к ClickHouse. Использовать для воронок, LTV, когорт.
---

# chatium-analytics-getcourse

Аналитика событий GetCourse через **gcQueryAi** — SQL-запросы к данным GetCourse в ClickHouse. События: dealCreated, dealPaid, user/created, формы, чатботы и др. Типизация EventDefinition, urlPattern для фильтрации.

## Когда использовать

- Воронки, LTV, когортный анализ
- Связка resolved_user_id и user_id (см. док)
- Запросы к событиям GetCourse по категориям и типам

## API

### gcQueryAi() — основной метод

**Импорт**:
```typescript
import { gcQueryAi, integrationIsEnabled } from '@gc-mcp-server/sdk'
```

**Сигнатура**:
```typescript
const result = await gcQueryAi(ctx, sqlQuery)
```

**Параметры**:
- `ctx` — контекст запроса
- `sqlQuery` — SQL-запрос к ClickHouse (база `chatium_ai.access_log`)

**Возвращает**: Результат SQL-запроса (массив строк)

**Предусловие**: Проверьте, что интеграция GetCourse настроена:
```typescript
const isConfigured = await integrationIsEnabled(ctx)
if (!isConfigured) {
  throw new Error('GetCourse integration not configured')
}
```

### EventDefinition — типизация событий

Типизация для валидации типов событий GetCourse (34 типа, 5 категорий):

```typescript
type EventDefinition = 
  | 'dealCreated'
  | 'dealPaid'
  | 'user/created'
  | 'user/chatbot/telegram/enabled'
  | 'user/chatbot/vk/enabled'
  | 'form/sent'
  | 'survey/answerCreated'
  | // ... остальные 26 типов
```

### urlPattern — фильтрация событий

Паттерны LIKE для фильтрации в SQL:

```typescript
const pattern = 'event://getcourse/%'  // все GetCourse события
const pattern = 'event://getcourse/deal%'  // события сделок
const pattern = 'event://getcourse/user/%'  // пользовательские события
```

## Важные концепции

### resolved_user_id vs user_id

Критическое различие при работе с данными:

- **resolved_user_id** — реальный ID пользователя GetCourse (рекомендуется для запросов)
- **user_id** — может быть анонимным ID в некоторых контекстах

**Рекомендация**: Всегда используйте `resolved_user_id` при построении SQL для связей между таблицами и анализа поведения.

### SQL примеры для ClickHouse

Воронка регистрация → оплата:

```sql
SELECT 
  COUNT(DISTINCT resolved_user_id) as users,
  SUM(CASE WHEN event = 'dealCreated' THEN 1 ELSE 0 END) as created_deals,
  SUM(CASE WHEN event = 'dealPaid' THEN 1 ELSE 0 END) as paid_deals
FROM chatium_ai.access_log
WHERE workspace_id = 'YOUR_WORKSPACE'
  AND event LIKE 'event://getcourse/%'
```

LTV по когортам:

```sql
SELECT 
  DATE(registered_at) as cohort_date,
  COUNT(DISTINCT resolved_user_id) as users,
  SUM(deal_amount) as total_revenue,
  SUM(deal_amount) / COUNT(DISTINCT resolved_user_id) as ltv
FROM chatium_ai.access_log
WHERE event = 'dealPaid'
GROUP BY cohort_date
ORDER BY cohort_date DESC
```

## Чеклист при использовании

- [ ] Импорт `gcQueryAi` и `integrationIsEnabled` из `@gc-mcp-server/sdk`
- [ ] Проверка `integrationIsEnabled(ctx)` перед выполнением запроса
- [ ] SQL-запросы написаны с учётом типов событий GetCourse
- [ ] Используется `resolved_user_id` при связях данных (не `user_id`)
- [ ] Применены паттерны LIKE `event://getcourse/%` для фильтрации
- [ ] Рассмотрены категории событий (5 основных категорий)
- [ ] При необходимости использована типизация EventDefinition

## Ссылки на документацию

- **Основная документация (переместилась)**: Детали API в `016-analytics-traffic.md` (раздел «Два способа работы с данными», пункт 1)
- **Устаревший документ (архив)**: `deprecated/dev/docs/016-analytics-getcourse.md` содержит исторические примеры
- **Концепции события**: `@app/metric` (038-metric.md) для writeMetricEvent
