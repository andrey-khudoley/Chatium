# Аналитика в браузере: clrtUid, clrtSid и счётчик Clarity

## Обзор

На страницах Chatium подключён счётчик **Microsoft Clarity** (скрипт `/s/metric/clarity.js`). Он отслеживает поведение пользователей и создаёт две ключевые переменные в браузере для идентификации.

## Переменные счётчика

### clrtUid (Clarity User ID)

- **Назначение**: Уникальный идентификатор браузера/устройства пользователя
- **Тип**: Строка (32 символа, например: `e7hnJ6Uj6FFixmxPvwuFGduj8lVZy1ht`)
- **Область видимости**: Cохраняется между сессиями
- **Для идемпотентности**: ✅ Используй для подсчёта **уникальных пользователей/браузеров**
- **Как задаётся**: Clarity автоматически генерирует при первом визите, сохраняет в localStorage/cookie
- **Реально**: Это поле `uid` в таблице `chatium_ai.access_log`

**Примеры использования в запросах:**

```sql
-- Подсчёт уникальных пользователей/браузеров за период
SELECT COUNT(DISTINCT uid) as unique_users
FROM chatium_ai.access_log
WHERE dt BETWEEN '2025-01-01' AND '2025-01-31'

-- Получить детали по конкретному браузеру
SELECT * FROM chatium_ai.access_log
WHERE uid = 'e7hnJ6Uj6FFixmxPvwuFGduj8lVZy1ht'
```

---

### clrtSid (Clarity Session ID)

- **Назначение**: Уникальный идентификатор текущей сессии браузера
- **Тип**: Строка (формат: `<hash>:<timestamp>`, например: `jGSZMTdVMu_sp2az6FExGIFR4ESAEmwt:1752674350663`)
- **Область видимости**: Сбрасывается при закрытии браузера (или по тайм-ауту ~30 мин неактивности)
- **Для идемпотентности**: ✅ Используй для подсчёта **сессий/визитов**
- **Как задаётся**: Clarity автоматически генерирует новый ID при каждой новой сессии
- **Реально**: Это поле `sid` в таблице `chatium_ai.access_log`

**Примеры использования в запросах:**

```sql
-- Подсчёт сессий (визитов) за период
SELECT COUNT(DISTINCT sid) as sessions_count
FROM chatium_ai.access_log
WHERE dt BETWEEN '2025-01-01' AND '2025-01-31'

-- Проанализировать действия в конкретной сессии
SELECT action, action_param1, ts
FROM chatium_ai.access_log
WHERE sid = 'jGSZMTdVMu_sp2az6FExGIFR4ESAEmwt:1752674350663'
ORDER BY ts
```

---

## Таблица сравнения идентификаторов

| Переменная          | Назначение                    | Диапазон                 | Когда сбрасывается                          | Идемпотентность                |
| ------------------- | ----------------------------- | ------------------------ | ------------------------------------------- | ------------------------------ |
| **clrtUid** / `uid` | Уникальный браузер/устройство | Постоянный (месяцы-годы) | При очистке cookie/localStorage             | Уникальные пользователи        |
| **clrtSid** / `sid` | Сессия браузера               | Сессионный (часы)        | При закрытии вкладки/браузера или тайм-ауте | Сессии/визиты                  |
| `session_id`        | Сессия веб-приложения         | Сессионный               | При выходе из аккаунта                      | Авторизованные сессии          |
| `user_id`           | Пользователь системы          | Постоянный               | Не сбрасывается                             | Авторизованные пользователи    |
| `clrt_run_id`       | ID события для группировки    | Событийный               | После записи события                        | Группировка связанных действий |

---

## Как выбрать для идемпотентности

### Сценарий 1: Подсчёт уникальных посетителей сайта

```sql
SELECT COUNT(DISTINCT uid) as visitors
FROM chatium_ai.access_log
WHERE dt = today()
```

**Отвечает на**: "Сколько разных людей/браузеров заходило на сайт?"
**Используй**: `uid` (clrtUid)

---

### Сценарий 2: Подсчёт визитов (сессий)

```sql
SELECT COUNT(DISTINCT sid) as visits
FROM chatium_ai.access_log
WHERE dt = today()
```

**Отвечает на**: "Сколько раз люди заходили на сайт сегодня?"
**Используй**: `sid` (clrtSid)

---

### Сценарий 3: Избежать дублирования событий при отправке с фронтенда

```javascript
// На фронтенде
async function sendEvent(eventData) {
  const fingerprint = window.clrtUid + '|' + window.clrtSid + '|' + Date.now()

  // Отправить на backend
  await fetch('/api/event', {
    method: 'POST',
    body: JSON.stringify({
      ...eventData,
      idempotencyKey: fingerprint // Сервер использует это для дедупликации
    })
  })
}
```

---

## Другие важные поля в access_log

### Для уникальности пользователя

- **resolved_user_id** — ID авторизованного пользователя системы (если логин)
- **user_id** — ID авторизованного пользователя в момент визита
- **session_email** / **session_phone** — Контакты, введённые в текущей сессии (неавторизованные)

### Для отслеживания событий

- **clrt_run_id** (UInt32) — ID события, используется для группировки связанных действий одного пользователя
- **action** — Название действия (if triggered via `writeWorkspaceEvent`)
- **action_param1, action_param2, action_param3** — Параметры действия
- **param_clrt** — Дополнительные параметры Clarity (JSON)

### Для диагностики

- **inferred_uid** (Bool) — `true` если uid был выведен (не установлен явно)
- **inferred_sid** (Bool) — `true` если sid была выведена (не установлена явно)

---

## Практические примеры аналитики

### Пример 1: Уникальные посетители по дням за месяц

```sql
SELECT
  dt,
  COUNT(DISTINCT uid) as unique_visitors,
  COUNT(DISTINCT sid) as total_sessions
FROM chatium_ai.access_log
WHERE dt BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY dt
ORDER BY dt
```

### Пример 2: Вернулись ли пользователи (repeat visitors)

```sql
SELECT
  uid,
  COUNT(DISTINCT DATE(ts)) as days_visited,
  COUNT(DISTINCT sid) as sessions_count,
  MIN(ts) as first_visit,
  MAX(ts) as last_visit
FROM chatium_ai.access_log
WHERE dt BETWEEN subtractDays(today(), 30) AND today()
GROUP BY uid
HAVING days_visited > 1  -- Посещали больше одного дня
ORDER BY sessions_count DESC
```

### Пример 3: Конверсия визит → регистрация (без дублей)

```sql
SELECT
  COUNT(DISTINCT sid) as total_sessions,
  COUNT(DISTINCT CASE WHEN action = 'registration' THEN sid END) as registrations,
  ROUND(
    COUNT(DISTINCT CASE WHEN action = 'registration' THEN sid END) * 100 /
    COUNT(DISTINCT sid), 2
  ) as conversion_rate_percent
FROM chatium_ai.access_log
WHERE dt = today()
```

### Пример 4: Путь пользователя в сессии (последовательность действий)

```sql
SELECT
  ts,
  action,
  action_param1,
  url,
  COALESCE(user_first_name, 'гость') || ' ' || COALESCE(user_last_name, '') as user_name
FROM chatium_ai.access_log
WHERE sid = 'YOUR_SESSION_ID_HERE'
ORDER BY ts
```

---

## Как работает счётчик (кратко)

1. **На первом визите**: Clarity генерирует уникальный `uid` → сохраняет в браузер
2. **При каждом новом визите**: Clarity создаёт новый `sid` на основе текущего времени + браузера
3. **Во время сессии**: Все события отправляются с текущими `uid` + `sid`
4. **При закрытии браузера**: `sid` сбрасывается, следующий визит получит новый `sid`
5. **Через месяцы**: Пользователь вернулся → `uid` остался тот же (если cookie/localStorage не очищены), но `sid` новый

---

## Рекомендации

### ✅ ДЕЛай

- Используй `uid` для COUNT(DISTINCT uid) при подсчёте уникальных пользователей
- Используй `sid` для COUNT(DISTINCT sid) при подсчёте сессий/визитов
- Используй `resolved_user_id` для авторизованных пользователей системы
- Сохраняй fingerprint (`uid + sid + timestamp`) для идемпотентности API вызовов

### ❌ НЕ ДЕЛай

- Не полагайся на `session_id` для аналитики (это внутренний ID веб-приложения, не Clarity)
- Не используй обычный COUNT() без DISTINCT при подсчёте уникальности
- Не путай `uid` и `user_id` (первый — браузер, второй — авторизованный пользователь)
- Не трюкуй с Clarity скриптом — он работает автоматически, ручная установка `clrtUid` может привести к ошибкам

---

## Доступ к переменным из JavaScript

```javascript
// Если нужно получить эти значения на фронтенде (редко, Clarity это делает сам)
if (window.clarity) {
  // Clarity обычно скрывает прямой доступ к uid/sid
  // Но данные отправляются в каждом событии
  console.log('Clarity ID отправляются автоматически на серверы Microsoft')
}

// Правильный способ — получить из параметров события (если пишешь свой tracking)
const getUserFingerprint = () => {
  return {
    uid: localStorage.getItem('clarity_uid') || 'unknown',
    sessionId: sessionStorage.getItem('clarity_sid') || 'unknown'
  }
}
```

**Внимание**: Clarity не предоставляет прямого доступа к `clrtUid` и `clrtSid` из JavaScript в целях безопасности. Данные отправляются на серверы автоматически. Для получения этих значений нужно получить их из логов `chatium_ai.access_log` после того как событие было записано.

---

## Заключение

Для обеспечения **идемпотентности визитов**:

- **Выбирай `uid` (clrtUid)** если нужна идентификация на уровне браузера/устройства
- **Выбирай `sid` (clrtSid)** если нужна идентификация на уровне сессии
- **Комбинируй `uid + sid + timestamp`** для максимальной надёжности дедупликации API вызовов
