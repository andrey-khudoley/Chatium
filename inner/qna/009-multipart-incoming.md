# Приём входящих `multipart/form-data` в server-side роуте Chatium

## TL;DR

**Платформа Chatium не парсит входящие запросы с `Content-Type: multipart/form-data` в `app.post(...)`-роутах.**

- На объекте `req` нет ни `files`, ни `fields`, ни `rawHttpBody`, ни `rawBody`, ни стрима.
- Автопарсинг работает только для `application/json` (через `.body(s => ({...}))`) и `application/x-www-form-urlencoded`.
- Доступ к сырому HTTP-телу из обработчика на текущей версии платформы **не предоставлен**.

Если вебхук под вашим контролем — переключите его на `application/json`. Если внешний сервис (как LifePay) жёстко шлёт `multipart/form-data` — нужен прокси-слой вне Chatium (см. §5).

---

## 1. Что реально доступно на `req`

Из типизации `@app/types/internal/index.d.ts`:

```ts
export interface UgcRouteRequest {
  method: 'get' | 'post' | 'job' | 'function'
  path: string
  getSchema?: boolean // флаг, НЕ метод
  query?: ReqQuery
  headers?: Record<string, string | undefined>
  body?: any
}

export interface UgcRouteParsedRequest<Body, PathParams, Query>
  extends Omit<UgcRouteRequest, 'query' | 'body'> {
  body: Body
  params: PathParams
  query: Query
  url: string
}
```

Это ровно то, что вы видите в `Object.keys(req)`:
`['body', 'method', 'path', 'query', 'headers', 'getSchema', 'params', 'url']`.

**Чего нет на `req`:**

- `req.files`
- `req.fields`
- `req.rawBody` / `req.rawHttpBody`
- `req.stream` / `req.buffer`

---

## 2. Что такое `req.getSchema`

Это **не метод**, а **boolean-флаг** на запросе:

```ts
getSchema?: boolean
```

Когда платформа получает запрос с `getSchema: true`, она возвращает схему роута вместо выполнения хендлера. Прочитать тело это не позволяет.

---

## 3. Что такое `rawHttpBody` (и почему он не применим к запросам)

`rawHttpBody` существует только в типах **ответа**, не запроса:

```ts
// Это формат ВОЗВРАЩАЕМОГО значения из handler, не входящего body
export interface TuneHttpHeadersResponse<Body = unknown> {
  rawHttpBody: Body
  headers?: Record<string, string | undefined>
  statusCode?: number
}
```

Этот интерфейс позволяет вам отдать произвольный ответ клиенту, но не прочитать сырое тело входящего запроса.

---

## 4. Почему `.body(s => ({...}))` не помогает

`.body()` использует `@app/schema` и валидирует **JSON**, разобранный платформой. Multipart-парсера в цепочке нет:

```ts
// Этот код НЕ заберёт поле `data` из multipart-тела
app
  .post('/')
  .body((s) => ({ data: s.string() }))
  .handle(async (ctx, req) => {
    // req.body === undefined для Content-Type: multipart/form-data
  })
```

Объявление схемы не «разбудит» multipart-парсер — его на платформе нет.

---

## 5. Что делать с входящим LifePay-вебхуком

LifePay шлёт `multipart/form-data` и это вне вашего контроля. Возможные решения:

### Вариант A. Прокси-слой перед Chatium (рекомендуется)

Поднять минимальный сервис (Cloudflare Worker / любой serverless / nginx-edge), который:

1. Принимает `multipart/form-data` от LifePay.
2. Распаковывает поле `data` (это уже JSON-строка).
3. Делает `POST` в ваш Chatium-роут с `Content-Type: application/json` и телом `{ "data": <JSON-строка> }` (либо сразу распарсенным JSON).

В Chatium останется обычный обработчик:

```ts
// web/webhook/index.tsx
export const webhookRoute = app
  .post('/')
  .query((s) => ({ token: s.string() }))
  .body((s) => ({ data: s.string() })) // или s.object({...}) если прокси уже распарсил
  .handle(async (ctx, req) => {
    if (req.query.token !== expectedToken) {
      return { statusCode: 403, rawHttpBody: 'forbidden', headers: {} }
    }

    const tx = JSON.parse(req.body.data)
    // обработка транзакции...

    return { statusCode: 200, rawHttpBody: 'OK', headers: { 'Content-Type': 'text/plain' } }
  })
```

### Вариант B. Договориться с LifePay о JSON-вебхуке

Если в личном кабинете LifePay есть опция «JSON webhook» / «application/json» — это самый простой путь, без прокси.

### Вариант C. Принять, но не парсить тело

Если транзакцию можно получить отдельным API-вызовом по `transactionId` из query-string (некоторые провайдеры дублируют ID в URL), можно вообще проигнорировать тело и подтянуть данные обратным запросом через `@app/request`:

```ts
import { request } from '@app/request'

export const webhookRoute = app
  .post('/')
  .query((s) => ({ token: s.string(), id: s.string().optional() }))
  .handle(async (ctx, req) => {
    if (!req.query.id) {
      return { statusCode: 400, rawHttpBody: 'missing id', headers: {} }
    }

    const resp = await request({
      url: `https://api.life-pay.ru/v1/bills/${req.query.id}`,
      method: 'get',
      headers: { authorization: `Bearer ${LIFEPAY_TOKEN}` }
    })

    // обработка resp.body...

    return { statusCode: 200, rawHttpBody: 'OK', headers: {} }
  })
```

Если LifePay такой ID в query не передаёт — этот вариант не подходит.

---

## 6. Почему не подойдут привычные подходы из Node.js

| Подход                              | Почему не работает в Chatium                                            |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `busboy`, `formidable`, `multer`    | Нет доступа к request-стриму и нет npm-рантайма в UGC.                  |
| `req.on('data', …)` / `req.pipe(…)` | `req` не Node-стрим, это уже разобранный объект платформы.              |
| Свой парсер из `req.rawBody`        | `rawBody` на входящем запросе отсутствует.                              |
| `Buffer.from(req.body)`             | `Buffer` в UGC не гарантирован; `req.body` для multipart — `undefined`. |

---

## 7. Что использовать для загрузки файлов от своих клиентов

Если речь не про внешний вебхук, а про загрузку файла с вашего же фронта, штатный путь — `@app/storage`:

1. На фронте/бэке получить put-URL: `obtainStorageFilePutUrl(ctx, …)` / `createUploadPutUrl(ctx, …)`.
2. Клиент кладёт файл `PUT`-запросом по этому URL напрямую в стор.
3. Сервер получает обратно хэш (`StorageFile.hash`) и сохраняет в Heap-поле типа `HsFile` / `HsImageFile` и т.п.

Multipart на ваш роут при этой схеме не приходит вообще.

---

## 8. Минимальная диагностическая обвязка (если всё-таки нужно подтвердить факт)

```ts
export const webhookRoute = app.post('/', async (ctx, req) => {
  ctx.account.log('lifepay webhook hit', {
    level: 'info',
    json: {
      method: req.method,
      contentType: req.headers?.['content-type'],
      bodyType: typeof req.body,
      bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
      reqKeys: Object.keys(req as any)
    }
  })

  return { statusCode: 200, rawHttpBody: 'OK', headers: { 'Content-Type': 'text/plain' } }
})
```

Этот лог подтвердит ровно то, что вы и наблюдаете: для `multipart/form-data` `req.body` приходит `undefined`, других источников тела нет.

---

## 9. Итог по вашим вопросам

1. **Штатный способ прочитать multipart в `app.post`** — отсутствует. Платформа парсит только JSON.
2. **Доступа к сырому HTTP-телу** для самостоятельного разбора **нет**.
3. **Способ объявления роута (`app.post('/', handler)` vs цепочечный)** на парсинг multipart **не влияет**: парсера нет ни там, ни там.
4. **`req.getSchema`** — `boolean`-флаг для возврата схемы роута, **не способ** получить тело.
5. **Roadmap**: в публичной типизации `@app/types`/`@start/sdk` поддержки входящего multipart нет. Обходные пути — внешний прокси, переключение вебхука на JSON, или fetch данных обратным запросом по ID.
