---
name: chatium-request
description: HTTP-клиент к внешним API в Chatium — request() из @app/request, GET/POST/PUT/DELETE, headers, обработка ошибок. Использовать при интеграции с внешними API.
---

# chatium-request

Выполнение HTTP-запросов к внешним API через `@app/request`. Использовать при интеграции с внешними сервисами, webhook'ах, получении или отправке данных.

## Когда использовать

- Интеграция с внешними API (REST, webhook)
- Получение данных из сторонних сервисов
- Отправка данных во внешние системы
- Не использовать для вызовов внутри Chatium — там `route.run()`

## Импорт и базовый вызов

```ts
import { request } from '@app/request'

const response = await request({
  url: 'https://api.example.com/data',
  method: 'get',
  responseType: 'json',
  throwHttpErrors: true,
})
// response: { statusCode, body, headers }
```

**Важно:** для исходящих запросов к внешним API из обычных роутов и lib используйте **один аргумент** — объект опций. Вызов `request(ctx, options)` рассчитан на другой контекст и может дать ошибку *«ctx.app is available only in proxy app context»* при outward `httpRequest`.

## Основные параметры request()

- **url** — полный URL (обязательно)
- **method** — 'get' | 'post' | 'put' | 'delete' | 'patch'
- **json** — тело запроса (сериализуется в JSON)
- **form** — FormData (Record<string, any>)
- **searchParams** — query-параметры
- **headers** — заголовки (в т.ч. Authorization)
- **responseType** — 'json' | 'text' | 'buffer'
- **throwHttpErrors** — при true (по умолчанию) при 4xx/5xx бросается ошибка
- **timeout** — таймаут в мс

## Паттерны

- **GET с query:** `searchParams: { page: '1', limit: '10' }`
- **POST с JSON:** `method: 'post', json: { key: 'value' }`
- **Bearer:** `headers: { Authorization: \`Bearer ${token}\` }`
- **Ошибки:** try/catch при throwHttpErrors: true или проверка response.statusCode при false
- **Логирование:** `ctx.account.log()`, не console.log

## Примеры

### GET запрос с параметрами

```ts
const response = await request({
  url: 'https://api.example.com/search',
  method: 'get',
  searchParams: {
    q: 'test',
    page: '1',
    limit: '20'
  },
  responseType: 'json'
})
```

### POST с JSON и авторизацией

```ts
const response = await request({
  url: 'https://api.example.com/users',
  method: 'post',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  json: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  responseType: 'json',
  throwHttpErrors: true
})
```

### Обработка ошибок с try/catch

```ts
try {
  const response = await request({
    url: 'https://api.example.com/data',
    method: 'get',
    responseType: 'json'
  })
  
  ctx.account.log('Success', {
    level: 'info',
    json: { status: response.statusCode }
  })
} catch (error: any) {
  ctx.account.log('Request failed', {
    level: 'error',
    json: { error: error.message }
  })
}
```

### Безопасная обработка с throwHttpErrors: false

```ts
const response = await request({
  url: 'https://api.example.com/data',
  method: 'get',
  responseType: 'json',
  throwHttpErrors: false
})

if (response.statusCode === 200) {
  return response.body
} else if (response.statusCode === 404) {
  ctx.account.log('Not found', { level: 'warn' })
} else {
  ctx.account.log('Error', {
    level: 'error',
    json: { status: response.statusCode }
  })
}
```

## Чеклист

- [ ] Импорт `request` из `@app/request`
- [ ] Указан полный URL и метод
- [ ] При необходимости: headers, searchParams, json/form
- [ ] Обработка ошибок (try/catch или проверка statusCode)
- [ ] Логирование через ctx.account.log()
- [ ] Валидация токенов перед использованием
- [ ] Не логировать чувствительные данные (пароли, токены)

## Ссылки на документацию

- **004-request.md** — исходящий HTTP-клиент, примеры, лучшие практики
