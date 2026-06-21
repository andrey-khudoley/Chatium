# chatium-request

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-request/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/004-request.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

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

## Чеклист

- [ ] Импорт `request` из `@app/request`
- [ ] Указан полный URL и метод
- [ ] При необходимости: headers, searchParams, json/form
- [ ] Обработка ошибок (try/catch или проверка statusCode)
- [ ] Логирование через ctx.account.log()

## Ссылки на документацию

- **004-request.md** — исходящий HTTP-клиент, примеры, лучшие практики
