# Серверный фингерпринт в Chatium

## Что такое серверный фингерпринт?

Уникальный идентификатор клиента на основе данных запроса (IP, User-Agent, язык браузера). Используется для дедупликации кликов на серверной стороне **без загрузки страницы** и без зависимостей от клиентского JavaScript.

## Получение данных из запроса

В обработчике маршрута параметр `req` содержит всю информацию о запросе:

```typescript
app.get('/', async (ctx, req) => {
  const ip = req.ip // IP адрес клиента
  const userAgent = req.headers['user-agent'] // Браузер и ОС
  const acceptLanguage = req.headers['accept-language'] // Язык браузера
  const referer = req.headers['referer'] // Источник перехода
})
```

## Генерация фингерпринта

### ⚠️ Важно: crypto недоступен в Chatium

Стандартный модуль `crypto` недоступен. Используйте простой алгоритм хеширования:

```typescript
// @shared
function generateFingerprint(req: any, linkId: string): string {
  const ip = (req.ip || 'unknown').split(':').pop() || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  const acceptLanguage = req.headers['accept-language'] || 'unknown'

  const fingerprintString = `${linkId}:${ip}:${userAgent}:${acceptLanguage}`

  // Простой хеш (не криптографический, но достаточно для дедупликации)
  let hash = 0
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16)
}
```

## Таблица для хранения

```json
{
  "name": "linkClicks",
  "title": "Клики по ссылкам",
  "fields": [
    {
      "name": "linkId",
      "kind": "RefLinkKind",
      "targetTablePath": "tables/trackingLinks.table",
      "title": "Ссылка"
    },
    {
      "name": "fingerprint",
      "kind": "StringKind",
      "title": "Фингерпринт клиента"
    },
    {
      "name": "clickedAt",
      "kind": "DateKind",
      "title": "Время клика"
    },
    {
      "name": "queryParams",
      "kind": "AnyKind",
      "title": "Query параметры"
    }
  ]
}
```

## Логика дедупликации

```typescript
// @shared-route
export const trackLinkRoute = app.get('/:linkId', async (ctx, req) => {
  const linkId = req.params.linkId
  const fingerprintHash = generateFingerprint(req, linkId)

  // Проверка дубликата за последние 5 секунд
  const existingClick = await LinkClicks.findOneBy(ctx, {
    linkId: linkId,
    fingerprint: fingerprintHash,
    clickedAt: { $gte: new Date(Date.now() - 5000) }
  })

  if (!existingClick) {
    // Новый клик - создаём запись
    await LinkClicks.create(ctx, {
      linkId: linkId,
      fingerprint: fingerprintHash,
      queryParams: req.query || {},
      clickedAt: new Date()
    })
  }

  // Редирект (выполняется в любом случае)
  return ctx.resp.redirect(trackingLink.inviteLink)
})
```

## Хорошие и плохые практики

**✅ Хорошие практики:**

- Нормализуй IP перед хешированием (убери порт)
- Проверяй наличие заголовков перед использованием
- Сохраняй время клика для анализа
- Используй разные окна времени для разных сценариев (5 сек для редиректов, 1 час для аналитики)
- Проверяй на дубликат **перед** созданием записи

**❌ Плохие практики:**

- Использовать только IP (может быть несколько человек за NAT)
- Забывать нормализовать IP адрес
- Сохранять реальные User-Agent строки вместо хеша (проблема приватности)
- Полагаться только на клиентский счётчик без серверной проверки
- Использовать crypto.createHash (недоступен в Chatium)

## Преимущества этого подхода

| Аспект             | Преимущество                         |
| ------------------ | ------------------------------------ |
| Скорость           | Мгновенный редирект, без загрузки JS |
| Надёжность         | Работает при отключённом JS          |
| Производительность | Нет задержек на клиентский счётчик   |
| Простота           | Не требует внешних API               |
| Серверный контроль | Полная уверенность в данных          |
