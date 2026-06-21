# CORS-заголовки в Chatium

Документ описывает, как ограничить доступ к backend-роутам Chatium только для определённых доменов через CORS.

## Краткое резюме

- Встроенного CORS-middleware **нет** — реализуется вручную.
- Управление заголовками ответа: `ctx.resp.setHeader(...)` или возврат `TuneHttpHeadersResponse`.
- **Preflight (OPTIONS) платформа не маршрутизирует в UGC-роуты.** Доступные методы: `get | post | job | function`. Метода `app.options(...)` нет.
- Для запросов, требующих preflight (`Content-Type: application/json`, кастомные заголовки, `Authorization` и т.п.), нужен либо внешний прокси (CF Worker / nginx) который сам отвечает на OPTIONS, либо «simple-request» (POST с `application/x-www-form-urlencoded`, `multipart/form-data` или `text/plain`).

---

## 1. API ответа (подтверждено типизацией `@app/types`)

```ts
interface UgcHttpResponseTuner {
  setHeader(name: string, value: string | string[]): void
  getHeader(name: string): string | string[] | undefined
  hasHeader(name: string): boolean
  removeHeader(name: string): void
  setStatusCode(code: number): void
}

// Декларативный вариант — вернуть из handler:
interface TuneHttpHeadersResponse {
  rawHttpBody: unknown
  headers?: Record<string, string>
  statusCode?: number
}
```

Тип `req.method` — **lowercase**: `'get' | 'post' | 'job' | 'function'`. OPTIONS в этот union не входит и до UGC-кода **не доходит**.

---

## 2. Простой ответ с CORS-заголовками

```ts
// api/data.ts
export const dataRoute = app.get('/').handle(async (ctx, req) => {
  const origin = req.headers?.origin
  const allowed = 'https://mydomain.com'

  if (origin === allowed) {
    ctx.resp.setHeader('Access-Control-Allow-Origin', allowed)
    ctx.resp.setHeader('Vary', 'Origin')
  }

  ctx.resp.setHeader('Access-Control-Allow-Credentials', 'true')

  return { data: 'response' }
})
```

Для нескольких разрешённых доменов:

```ts
const ALLOWED = new Set(['https://app1.com', 'https://app2.com'])

if (origin && ALLOWED.has(origin)) {
  ctx.resp.setHeader('Access-Control-Allow-Origin', origin)
  ctx.resp.setHeader('Vary', 'Origin')
}
```

> Wildcard `*` несовместим с `Access-Control-Allow-Credentials: true`. Если нужны куки — всегда подставляйте конкретный домен.

---

## 3. Декларативный вариант через `TuneHttpHeadersResponse`

```ts
export const dataRoute = app.get('/').handle(async (ctx, req) => {
  const origin = req.headers?.origin
  const allowed = 'https://mydomain.com'

  if (origin && origin !== allowed) {
    return {
      rawHttpBody: { error: 'CORS policy violation' },
      headers: { 'Content-Type': 'application/json' },
      statusCode: 403,
    }
  }

  return {
    rawHttpBody: { data: 'response' },
    headers: {
      'Access-Control-Allow-Origin': allowed,
      'Vary': 'Origin',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json',
    },
    statusCode: 200,
  }
})
```

---

## 4. Переиспользуемый middleware (для ответов, НЕ для preflight)

```ts
// shared/cors.ts
// @shared
const ALLOWED_ORIGINS = new Set(['https://app1.com', 'https://app2.com'])

export function applyCors(ctx: app.Ctx, req: app.Req): void {
  const origin = req.headers?.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    ctx.resp.setHeader('Access-Control-Allow-Origin', origin)
    ctx.resp.setHeader('Vary', 'Origin')
    ctx.resp.setHeader('Access-Control-Allow-Credentials', 'true')
  }
}
```

```ts
// api/data.ts
import { applyCors } from '../shared/cors'

export const dataRoute = app.get('/').handle(async (ctx, req) => {
  applyCors(ctx, req)
  return { data: '...' }
})
```

Использование `app.use(...)` тоже допустимо (сигнатура middleware: `(ctx, req, next) => R | Promise<R>`), но для CORS-ответов хватит обычной функции — это понятнее и не вмешивается в цепочку.

---

## 5. Preflight (OPTIONS) — главное ограничение платформы

**В Chatium нет способа обработать OPTIONS-запрос пользовательским кодом:**

- `app.options(...)` не существует.
- `req.method` не может быть `'options'` (его нет в union).
- Регистрация `app.get('/')` или `app.post('/')` на OPTIONS не сработает — браузер шлёт именно `OPTIONS`, и платформа маршрутизирует только `get/post`.

### Когда preflight НЕ требуется (CORS «simple request»)

Браузер не шлёт preflight, если выполнены **все** условия:

- Метод: `GET`, `HEAD` или `POST`.
- `Content-Type` ∈ `application/x-www-form-urlencoded` | `multipart/form-data` | `text/plain`.
- Нет кастомных заголовков (только CORS-safelisted: `Accept`, `Accept-Language`, `Content-Language`, `Content-Type` с указанными значениями).
- Нет `Authorization`-заголовка.

Если ваш сценарий укладывается — preflight не нужен, и решение из §2/§3 полностью покрывает задачу.

### Когда preflight требуется

- `Content-Type: application/json`
- Любой кастомный заголовок (`X-Request-Id`, `X-Api-Key`, `Authorization` и т.п.)
- Методы `PUT`, `DELETE`, `PATCH` (последние два в Chatium и так нельзя реализовать как UGC-роут)

В этом случае браузер сначала отправит `OPTIONS /…` — и Chatium ответит **без** нужных CORS-заголовков, fetch упадёт ещё до основного запроса.

### Обходные пути

1. **Свести запрос к simple-request.**
   На клиенте использовать `Content-Type: text/plain` или `application/x-www-form-urlencoded` и не слать кастомные заголовки. Тело JSON упаковывать в одно поле формы или сразу в plain text.

2. **Внешний прокси (Cloudflare Worker / nginx / любой edge).**
   Прокси сам отвечает на OPTIONS с правильными CORS-заголовками и пересылает основной запрос в Chatium.

   Пример Cloudflare Worker:
   ```js
   export default {
     async fetch(req, env) {
       const origin = req.headers.get('Origin')
       const allowed = 'https://mydomain.com'

       if (req.method === 'OPTIONS') {
         return new Response(null, {
           status: 204,
           headers: {
             'Access-Control-Allow-Origin': origin === allowed ? allowed : '',
             'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
             'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
             'Access-Control-Allow-Credentials': 'true',
             'Access-Control-Max-Age': '86400',
             'Vary': 'Origin',
           },
         })
       }

       const upstream = await fetch('https://your-account.chatium.io' + new URL(req.url).pathname + new URL(req.url).search, req)
       const resp = new Response(upstream.body, upstream)
       if (origin === allowed) {
         resp.headers.set('Access-Control-Allow-Origin', allowed)
         resp.headers.set('Vary', 'Origin')
       }
       return resp
     }
   }
   ```

3. **Same-origin.**
   Если фронт и Chatium-бэк живут на одном домене (через свой подключённый домен) — CORS вообще не вступает в действие.

---

## 6. Ограничение по Origin как мера безопасности

CORS-заголовки **не запрещают** запрос на стороне сервера — браузер сам блокирует ответ. Server-to-server и curl-запросы CORS не проверяют. Если нужна именно серверная защита по домену — проверяйте `Origin` / `Referer` в начале handler и возвращайте 403:

```ts
export const dataRoute = app.post('/').handle(async (ctx, req) => {
  const origin = req.headers?.origin
  if (origin !== 'https://mydomain.com') {
    ctx.resp.setStatusCode(403)
    return { error: 'forbidden' }
  }
  ctx.resp.setHeader('Access-Control-Allow-Origin', 'https://mydomain.com')
  ctx.resp.setHeader('Vary', 'Origin')

  return { data: '...' }
})
```

Это работает как защита от браузерных запросов с чужих доменов, но не от прямых HTTP-вызовов — для них нужен токен / подпись / другой механизм аутентификации.

---

## Таблица: что доступно и чего нет

| Возможность | Статус |
|---|---|
| `ctx.resp.setHeader / getHeader / hasHeader / removeHeader` | ✅ |
| `ctx.resp.setStatusCode(code)` | ✅ |
| `TuneHttpHeadersResponse { rawHttpBody, headers?, statusCode? }` | ✅ |
| `app.use(middleware)` с цепочкой `(ctx, req, next) => ...` | ✅ |
| Чтение `req.headers?.origin` | ✅ |
| `req.method` lowercase: `'get' / 'post' / 'job' / 'function'` | ✅ |
| `app.options('/')` или обработка `OPTIONS` в UGC | ❌ |
| Встроенный CORS-middleware из `@app/*` | ❌ |

---

## Итог

Для «обычных» ответов CORS легко настраивается через `ctx.resp.setHeader`. Главное ограничение Chatium — **невозможность обработать preflight OPTIONS** в UGC-коде. Если запрос укладывается в «simple-request» — решение полное и одной строки кода достаточно. Иначе нужен внешний прокси перед Chatium.
