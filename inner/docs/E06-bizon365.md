@chatium

# Bizon365 API: Полное руководство для Chatium

Исчерпывающее руководство по интеграции Bizon365 API v2.0 в проектах Chatium. Все примеры используют `@app/request`, Heap и `app.job`.

---

## Содержание

- [Введение](#введение)
- [Авторизация](#авторизация)
- [Базовая настройка клиента](#базовая-настройка-клиента)
- [Формат API и общие правила](#формат-api-и-общие-правила)
- [Основные сущности](#основные-сущности)
  - [Проекты и баланс](#проекты-и-баланс)
  - [Вебинары и отчёты](#вебинары-и-отчёты)
  - [Страницы регистрации и подписчики](#страницы-регистрации-и-подписчики)
  - [Касса и заказы](#касса-и-заказы)
  - [Курсы](#курсы)
  - [Ученики и доступы](#ученики-и-доступы)
- [Вебхуки](#вебхуки)
- [Синхронизация и фоновые задачи](#синхронизация-и-фоновые-задачи)
- [Обработка ошибок и тестирование](#обработка-ошибок-и-тестирование)
- [Лучшие практики](#лучшие-практики)
- [Чек-листы](#чек-листы)
- [FAQ](#faq)
- [Связанные документы](#связанные-документы)
- [Версия](#версия)

---

## Введение

Bizon365 — платформа для вебинаров, автоворонок, курсов и онлайн-продаж. API v2.0 (https://blog.bizon365.ru/api/v2/) объединяет доступ к проектам, вебинарным комнатам, страницам регистрации, кассе и курсам. С августа 2025 года API v2.0 — основной, v1.0 постепенно отключается.

**Почему использовать API**

- Автоматизировать загрузку отчётов по вебинарам и кассу.
- Создавать/изменять подписчиков и учеников из сторонних CRM.
- Реализовать гибкую аналитику и оповещения в Chatium.

---

## Авторизация

Источник: https://blog.bizon365.ru/api/v2/avtorizatsiya-v2/

- Bizon использует **токен** уровня Бизон ID. Получить его можно в интерфейсе: `Учетная запись (Бизон ID) → Панель навигации → Безопасность`.
- Для **каждого запроса** передавайте заголовок `X-Token: <ваш токен>`.
- Права пользователя определяют доступ к проектам/модулям. Если токену недоступен модуль (например, “Страницы регистрации и рассылка”), эндпоинт вернёт 403.
- Базовый URL: `https://online.bizon365.ru/api/v2/{PROJECT_ID}/...` (исключение — методы уровня аккаунта, например `user/getProjects`).

---

## Базовая настройка клиента

```typescript
import { request } from '@app/request'

const BIZON_API_BASE = 'https://online.bizon365.ru/api/v2'

interface BizonRequestOptions {
  ctx
  projectId?: string // для /api/v2/{projectId}/...
  endpoint: string // без ведущего слеша: "reports/getlist"
  method?: 'get' | 'post'
  query?: Record<string, string | number | boolean>
  json?: any
  token: string
}

export async function bizonRequest(options: BizonRequestOptions) {
  const { ctx, endpoint, token, projectId, method = 'get', query, json } = options
  const base = projectId ? `${BIZON_API_BASE}/${projectId}` : `${BIZON_API_BASE}`
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
    url: `${base}/${endpoint}${search}`,
    method,
    headers: {
      'X-Token': token,
      'Content-Type': 'application/json'
    },
    json,
    responseType: 'json',
    throwHttpErrors: false
  })

  if (response.statusCode >= 400) {
    ctx.account.log('Bizon API error', {
      level: 'error',
      json: { endpoint, status: response.statusCode, body: response.body }
    })
    throw new Error(`Bizon API error ${response.statusCode}`)
  }

  return response.body
}
```

---

## Формат API и общие правила

- **Методы**: GET и POST. Тело и ответы — JSON (за редким исключением, когда JSON упакован в строку).
- **Проекты**: большинство методов требуют `projectId` в URL (`/api/v2/XXXX/...`). Узнать доступные проектные ID можно через `user/getProjects`.
- **Дата/время**: ISO-8601. По умолчанию сервер использует UTC+3 (московское время).
- **Фильтры**: `skip`/`limit`, диапазоны `minDate/maxDate`, флаги `type`, `paid` и т.п. Указывайте явные лимиты, иначе сервер применит значение по умолчанию.
- **Модули**: некоторые эндпоинты работают только если соответствующая услуга подключена (например, “Страницы регистрации и рассылка”). Без услуги возвращается 403 (https://blog.bizon365.ru/api/v2/webinars-v2/subpages-v2/).
- **Версия v1**: доступна только старым аккаунтам и будет отключена. Планируйте миграцию на v2.

---

## Основные сущности

### Проекты и баланс

Источник: https://blog.bizon365.ru/api/v2/proekty-v2/

- `GET user/getProjects` — список проектов и слотов:
  - Возвращает `projects[]` с полями `id`, `title`, `balance_total`, `balance_rub`, `demo_time`, `deleted`.
  - Также содержит `avail_project_slots` и `max_project_slots`.
- `GET {projectId}/project/getBalance?startDate=&endDate=`:
  - Без параметров отдаёт операции за последние 6 месяцев.
  - Ответ: `general_balance`, `total_balance`, `payments[]` (каждая запись содержит суммы, тип услуги, `newBal/prevBal`, даты).

**Пример использования в Chatium**

```typescript
export async function listProjects(ctx, token: string) {
  const data = await bizonRequest({ ctx, token, endpoint: 'user/getProjects' })
  return data.projects.map((project) => ({
    id: project.id,
    title: project.title,
    balance: project.balance_total,
    isDemo: project.demo_time
  }))
}
```

### Вебинары и отчёты

Источник: https://blog.bizon365.ru/api/v2/webinars-v2/reports-v2/

| Метод                                                            | Описание                                 | Параметры                               |
| ---------------------------------------------------------------- | ---------------------------------------- | --------------------------------------- | ----------------------------------- |
| `GET {projectId}/reports/getlist`                                | Список отчётов                           | `skip`, `limit≤100`, `type=LiveWebinars | AutoWebinars`, `minDate`, `maxDate` |
| `GET {projectId}/reports/get?webinarId=`                         | Детальный отчёт                          | `webinarId` формата `roomId*ISODate`    |
| `GET {projectId}/reports/getviewers?webinarId=&skip=&limit≤1000` | Альтернативный способ выгрузить зрителей | `webinarId`, `skip`, `limit`            |

**Что важно в отчётах**

- `getlist` возвращает общую статистику по каждому вебинару (`count1` — пик зрителей, `count2` — длительность).
- `get` содержит вложенный объект `report` (JSON-строка) с массивами активности (`rating`), картой `usersMeta`, сообщениями чата (`messages`, `messagesTS`), статистикой UTM.
- `getviewers` — готовая таблица зрителей с временными метками (`vi`, `view`, `viewTill`), контактами, UTM и флагами `finished`, `page`, `partner`, `newOrder`.

**Практика**

- Сохраняйте `webinarId` в Heap, чтобы не перезапрашивать `getlist`.
- Разбивайте большие отчёты по `skip/limit` и записывайте курсор `lastDownloadedAt` в таблице `bizon_report_cursors`.

### Страницы регистрации и подписчики

Источник: https://blog.bizon365.ru/api/v2/webinars-v2/subpages-v2/

| Метод                                                | Описание                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET {projectId}/subpages/getSubpages?skip&limit`    | список страниц регистрации и базовые настройки (`room`, `stat`, вебхуки, UTM)                              |
| `GET {projectId}/subpages/getSubscribers?pageId=...` | подписчики страницы, поддерживает фильтры по времени регистрации/сеанса, UTM и произвольным URL-параметрам |
| `POST {projectId}/subpages/addSubscriber`            | регистрация подписчика на конкретный сеанс (режимы с/без подтверждения)                                    |
| `POST {projectId}/subpages/removeSubscriber`         | удаление подписчика                                                                                        |

**Поля подписчика**

`uid`, `email`, `confirmed`, `username`, `phone`, `secret` (для индивидуальных ссылок), `webinarTime`, `registeredTime`, `vizitWebinar`, `vizitWebinarEnd`, `url_marker`, `url_param`, `utm_*`.

**Учёт webhook'ов подписчиков**

- Bizon отправляет POST с JSON: `sublistId`, `room`, `email`, `username`, `webinarTime`, `secret`, `url_marker(_name)`, `url_param(_name)`, `utm_*`.
- Успешным считается ответ 200. В случае другой ошибки Bizon повторяет попытки через 1, 5, 15, 60, 120, 240 и 480 минут. При таймауте на первой попытке повторов не будет.
- Настройка включается в свойствах страницы регистрации.

### Касса и заказы

Источники: https://blog.bizon365.ru/api/v2/kassa-v2/ и https://blog.bizon365.ru/api/v2/kassa-v2/orders-v2/

- `GET {projectId}/orders/getorders`:
  - Фильтры: `skip`, `limit≤100`, `days` (приоритет), `dateBegin`, `dateEnd`, `paid`, `search`.
  - Ответ: `list[]` с десятками полей (контакты, товары, суммы в разных валютах, UTM, партнёрские атрибуты, частичные оплаты).
- **Webhook кассы** (https://blog.bizon365.ru/docs/kassa/nastrojka-kassy/peresylka-uvedomlenij-api/):
  - События: `neworder`, `partialpaidorder`, `paidorder`.
  - Поля: `action`, `orderstatus`, `user`, `orderid`, `email`, `phone`, `amount`, `paid`, `paid_amount`, `items`, `payby`, `utm_*`, `sup`, `accessdata` и пр.
  - Контрольная сумма `hash = md5(action + user + <API-ключ кассы> + orderid)`. Проверяйте её на своей стороне.

### Курсы

Источник: https://blog.bizon365.ru/api/v2/course-v2/

- `GET {projectId}/courses/getlist`:
  - Возвращает `courses[]` с полями `id`, `slug`, `title`, `classCount`.
  - Используйте перед массовой выдачей доступов ученикам.

### Ученики и доступы

Источник: https://blog.bizon365.ru/api/v2/course-v2/student-v2/

- `POST {projectId}/student/grantAccess`
  - Тело: `{ students: [...], autoCreate: true|false, script: [...], callback?: url }`.
  - `students[]` — набор email/phone/username/city. Можно задавать индивидуальные `script`.
  - Команды `script`: `on`, `off`, `off!`, `ma`, `freeze`, `unfreeze`. Доп. параметры `class`, `fl`, `starts`, `starts_in_days`, `expires`.
  - Возвращает `{ status: "queued", task_id }`. Все операции выполняются асинхронно.
- `GET {projectId}/student/checkTaskStatus?task_id=...`
  - Статусы: `in_queue`, `running`, `failed`, `not_found`.
- Поддерживается webhook `callback`: Bizon отправит POST `{ errors: [ { email, error } ] }`.

---

## Вебхуки

### Касса

- Настраивается в “Бизон.Касса → Настройки товара”. Bizon отправляет POST с описанием заказа (см. выше).
- Проверяйте `hash`, отвечайте 200 в течение 5 секунд. В противном случае Bizon повторит запросы по схеме 1–480 минут.
- В Chatium:

```typescript
// Файл api/bizon/kassa/webhook/index.ts (или эквивалент в дереве api/) — URL задаётся путём файла.
export const bizonKassaWebhookRoute = app.post('/', async (ctx, req) => {
  const payload = req.body
  const valid = verifyHash(payload, process.env.BIZON_KASSA_KEY)
  if (!valid) return ctx.resp.status(401).json({ ok: false })
  await scheduleJobAsap(ctx, 'handleBizonOrder', payload)
  return { ok: true }
})
```

Для отложенной обработки предпочтительно объявить задачу через **`app.job`** и вызывать **`job.scheduleJobAsap(ctx, payload)`** — см. **005-jobs.md** (интерфейс глобальных **`scheduleJob*`** может отличаться).

### Подписчики страниц регистрации

- Включается в настройках страницы (`webhook_url`).
- Payload содержит `sublistId`, `room`, контакты, дату сеанса, UTM, `secret`.
- Bizon повторяет запросы при ошибках так же, как в кассе (1→480 минут).

---

## Синхронизация и фоновые задачи

1. **Опорные таблицы Heap**

```typescript
export const BizonProjects = Heap.Table('bizon_projects', {
  projectId: Heap.String({ indexed: true }),
  title: Heap.String(),
  balance: Heap.Number(),
  demo: Heap.Boolean(),
  syncedAt: Heap.DateTime()
})

export const BizonWebinarReports = Heap.Table('bizon_webinar_reports', {
  projectId: Heap.String(),
  webinarId: Heap.String({ indexed: true }),
  type: Heap.String(),
  created: Heap.DateTime(),
  maxViewers: Heap.Number(),
  durationMinutes: Heap.Number()
})
```

2. **Планировщик отчётов**

```typescript
app.job('syncBizonReports').handler(async (ctx, { projectId }) => {
  const cursor = await BizonSyncState.findOneBy(ctx, { projectId }) // хранит minDate
  const reports = await bizonRequest({
    ctx,
    token: await getBizonToken(ctx),
    projectId,
    endpoint: 'reports/getlist',
    query: { minDate: cursor?.since ?? new Date(Date.now() - 7 * 864e5).toISOString() }
  })
  await upsertReports(ctx, projectId, reports.list)
  await BizonSyncState.createOrUpdateBy(ctx, 'projectId', {
    projectId,
    since: new Date().toISOString()
  })
})
```

3. **Очередь по подписчикам**

- Храните `pageId` и `lastDownloadedAt` в `bizon_subpage_cursors`.
- Каждые N минут вызывайте `subpages/getSubscribers` с `registeredTimeMin = cursor`.
- Параллельно обрабатывайте вебхуки — это ускоряет реакцию на новые регистрации.

---

## Обработка ошибок и тестирование

- API возвращает стандартные HTTP коды. Частые кейсы:
  - `401` — неверный `X-Token`.
  - `403` — модуль не подключён или пользователь не имеет прав.
  - `404` — неправильный `projectId` или объект удалён.
  - `429` — Bizon ограничивает интенсивность (особенно при массовых выборках). Используйте экспоненциальный `scheduleJobAfter`.
- Ограничения по лимитам официально не опубликованы, но базовая практика — не превышать 2–3 запросов/секунду и дробить выборки.

**Тесты (см. `020-testing.md`):**

- `./lib/tests/api/bizon-client.test.ts` — проверка заголовков и разбора ошибок.
- `./lib/tests/api/bizon-reports.test.ts` — сценарии курсора `minDate` и дедупликации `webinarId`.
- `./web/tests/ai.tsx` — сценарии “Настроить Bizon”, “Выдать доступ ученику”, “Синхронизировать заказы”.

---

## Лучшие практики

**Рекомендуется**

- Хранить токены в Heap (`bizon_tokens`) и привязывать к конкретным пользователям Bizon ID.
- Разделять сервисные аккаунты: отдельный токен для чтения отчётов, отдельный для кассы (минимизация прав).
- Каждый `webinarId` хранить в нормализованном виде (`roomId*ISODate`), чтобы упрощать повторный запрос `reports/get`.
- При выдаче доступов ученикам сначала выполнять `grantAccess` с `autoCreate=false` и fallback’ом на `true`, чтобы не засорять базу дубликатами.
- Логировать `task_id` из `grantAccess` и регулярно проверять `checkTaskStatus`, чтобы ловить зависшие задачи.
- Для вебхуков: валидировать `hash` (касса) и использовать очередь jobs для любой длинной логики.

**Избегайте**

- Отправлять более 100 запросов подряд без пауз — Bizon может начать отдавать 429/500.
- Сохранять чувствительные данные подписчиков в логах (телефон, email).
- Удалять подписчиков напрямую через API без предварительного бэкапа — восстановить будет сложно.
- Отвечать 200 вебхуку до того, как данные сохранены — в случае ошибки Bizon не перешлёт событие повторно.

---

## Чек-листы

### Включение Bizon API в проекте

1. Получите токен Бизон ID (`Безопасность`).
2. Убедитесь, что пользователь добавлен в нужные проекты и модули.
3. Создайте страницу настроек в Chatium с полями `X-Token`, `projectId`.
4. Настройте таблицы Heap (`bizon_projects`, `bizon_reports`, `bizon_subscribers`, `bizon_orders`, `bizon_students`).
5. Запустите первичную синхронизацию:
   - `user/getProjects`
   - `reports/getlist` последние 30 дней
   - `orders/getorders?days=7`
   - `subpages/getSubpages` → `getSubscribers`
6. Добавьте jobs и webhooks (касса, подписчики).
7. Напишите тесты: API + AI сценарии.

### Настройка кассового webhook’а

1. В карточке товара включите “Отправлять данные в свой обработчик”.
2. Укажите HTTPS URL (например, `https://example.com/api/bizon/kassa`).
3. Добавьте проверку `hash` в обработчике.
4. Логируйте payload и статус (для повторных отправок).
5. Обновите документацию для менеджеров, чтобы они знали о webhook-URL.

### Выдача доступа к курсам

1. Выгрузите `courses/getlist`.
2. Сопоставьте slug/id с внутренними курсами Chatium.
3. Соберите массив `students` с email + нужными `script`.
4. Отправьте `grantAccess`.
5. Отслеживайте `task_id` через `checkTaskStatus`.
6. При необходимости отправьте webhook уведомление менеджеру (через `callback`).

---

## FAQ

**Что использовать для `projectId`?**  
Возьмите поле `id` из `user/getProjects`. В Chatium удобно хранить список проектов, чтобы пользователь выбирал нужный перед запуском синхронизации.

**Как формируется `webinarId`?**  
Это `roomId*ISODate` (например, `12345:test*2025-09-01T15:00:00`). Перед запросом `getviewers` строку нужно URL-экранировать (`encodeURIComponent`).

**Можно ли менять подписчика без подтверждения email?**  
Да, если на странице регистрации отключено подтверждение. Иначе используйте `confirm=true` и ждите, пока пользователь перейдёт по ссылке из письма.

**Где взять секрет для проверки кассового webhook’а?**  
В настройках кассы указан API-ключ. Хэш считается как `md5(action + user + apiKey + orderid)` — без разделителей.

**Что делать, если `grantAccess` завис?**  
Проверьте `checkTaskStatus`. Если `failed` или задача не появляется, повторите запрос с новым `task_id`. Убедитесь, что организм не создаёт более 100 задач в час (рекомендованный лимит).

**Можно ли получить детализацию товаров (SKU) в заказе?**  
Да. Поле `goods` — JSON-строка с массивом `{ _id, price, cnt }`. Распарсьте строку и храните структуры отдельно.

---

## Связанные документы

- `doc/knowledge/004-request.md` — HTTP клиент Chatium.
- `doc/knowledge/005-jobs.md` — планировщик фоновых задач.
- `doc/knowledge/008-heap.md` — создание таблиц и индексов.
- `doc/knowledge/E04-notion.md` и `E05-toggl.md` — эталонный формат @knowledge.

---

## Версия

- **Версия документа:** 1.0
- **Дата обновления:** 2025-11-14
- **Источники:**
  - https://blog.bizon365.ru/api/v2/
  - https://blog.bizon365.ru/api/v2/avtorizatsiya-v2/
  - https://blog.bizon365.ru/api/v2/proekty-v2/
  - https://blog.bizon365.ru/api/v2/webinars-v2/reports-v2/
  - https://blog.bizon365.ru/api/v2/webinars-v2/subpages-v2/
  - https://blog.bizon365.ru/api/v2/kassa-v2/orders-v2/
  - https://blog.bizon365.ru/docs/kassa/nastrojka-kassy/peresylka-uvedomlenij-api/
  - https://blog.bizon365.ru/api/v2/course-v2/
  - https://blog.bizon365.ru/api/v2/course-v2/student-v2/
