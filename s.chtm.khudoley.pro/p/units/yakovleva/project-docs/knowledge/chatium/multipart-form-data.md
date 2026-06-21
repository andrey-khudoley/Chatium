---
title: 'Chatium — приём multipart/form-data в роутах'
type: reference
tags:
  - topic/chatium
  - topic/http
  - topic/multipart
  - topic/webhooks
created: 2026-05-23
updated: 2026-05-23
sources:
  - 'Сообщение Artur Eshenbrener (Chatium core) в комьюнити 18.05.2026, 20:14'
  - 'Пример кода: https://play-mlncf.chatium.ru/s/ide/index.tsx?purl=%2Findex'
---

# Chatium — приём `multipart/form-data` в роутах

Канонический способ читать тело `multipart/form-data` в Chatium-роутах. Поддерживается нативно с патча от **2026-05-18** (Artur Eshenbrener). До этой даты `multipart/form-data` платформа не парсила — тело не было доступно ни через `req.body`, ни через `req.files`, ни через `req.fields`, поэтому приходилось переключать клиента на `application/json` или ставить multipart→JSON прокси.

> **Когда применять.** Когда внешний сервис (webhook-провайдер, форма с загрузкой файлов) шлёт POST с `Content-Type: multipart/form-data`. Типовые случаи: webhook от LifePay (формат подтверждён, см. [lifepay/webhooks §1](../lifepay/webhooks.md)), загрузка пользовательских файлов в админку, проксирование multipart-форм от GetCourse или другого фронта.

## API: `req.formData()`

Метод возвращает `Promise<FormData>` — стандартный браузерный `FormData`-объект.

| Вызов                               | Возвращает                                   | Зачем                                                                                                                         |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `form.get(key)`                     | `string \| File \| null`                     | Получить значение поля. Если поле — файл, вернётся `File`-like объект. Если поле текстовое — строка. Если ключа нет — `null`. |
| `form.getAll(key)`                  | `Array<string \| File>`                      | Все значения одного ключа (используется, когда форма шлёт `?tag=a&tag=b`).                                                    |
| `form.has(key)`                     | `boolean`                                    | Есть ли такой ключ.                                                                                                           |
| `form.entries()`                    | `IterableIterator<[string, string \| File]>` | Итератор пар.                                                                                                                 |
| `form.keys()`                       | `IterableIterator<string>`                   | Только ключи.                                                                                                                 |
| `form.values()`                     | `IterableIterator<string \| File>`           | Только значения.                                                                                                              |
| `form.forEach((value, key) => ...)` | `void`                                       | Обход.                                                                                                                        |

### File-like объект

Для полей-файлов:

| Свойство/метод | Описание                                            |
| -------------- | --------------------------------------------------- |
| `.name`        | Оригинальное имя файла                              |
| `.type`        | MIME-тип                                            |
| `.text()`      | Возвращает `Promise<string>` — содержимое как текст |

Бинарные методы (`.arrayBuffer()`, `.stream()`) — проверить отдельно при необходимости; в комьюнити подтверждены только `.name`, `.type`, `.text()`.

## Базовый паттерн: текстовые поля

```ts
app.post('/submit', async (ctx, req) => {
  const form = await req.formData()

  const name = form.get('name')
  const tags = form.getAll('tag')
  const hasEmail = form.has('email')

  const entries = [...form.entries()]
  const keys = [...form.keys()]
  const values = [...form.values()]
  const contentType = req.headers['content-type']

  const fields: Record<string, unknown> = {}
  form.forEach((value, key) => {
    fields[key] = value
  })

  return ctx.resp.json({
    contentType,
    name,
    tags,
    hasEmail,
    entries,
    keys,
    values,
    fields
  })
})
```

Тест curl-ом:

```bash
curl -X POST 'https://play-mlncf.chatium.ru/~submit' \
  -F 'name=Ada' \
  -F 'email=ada@example.com' \
  -F 'tag=a' \
  -F 'tag=b'
```

## Базовый паттерн: загрузка файла

```ts
app.post('/file', async (ctx, req) => {
  const form = await req.formData()

  const uploaded = form.get('file')
  const contentType = req.headers['content-type']

  if (!uploaded || typeof uploaded === 'string') {
    return ctx.resp.status(400).json({
      error: 'file field is required',
      contentType
    })
  }

  // uploaded — File-like: name, type, text()
  const text = await uploaded.text()

  return ctx.resp.json({
    contentType,
    file: {
      name: uploaded.name,
      type: uploaded.type,
      text
    }
  })
})
```

## Паттерн: webhook от внешнего сервиса с JSON-строкой в multipart-поле

Частный случай — провайдер шлёт `multipart/form-data` с единственным текстовым полем (например `data`), значение которого — JSON-строка. Так делает LifePay для webhook. См. [lifepay/webhooks](../lifepay/webhooks.md) раздел 1.

```ts
app.post('/webhook', async (ctx, req) => {
  const form = await req.formData()
  const dataField = form.get('data')

  if (typeof dataField !== 'string') {
    // Не multipart, или поле data отсутствует, или содержит файл вместо строки.
    // Внешний провайдер обычно ретраит при не-200, поэтому возвращаем 200 даже при невалидном теле.
    return ctx.resp.status(200).send('')
  }

  let payload: unknown
  try {
    payload = JSON.parse(dataField)
  } catch {
    return ctx.resp.status(200).send('')
  }

  // ...обработка payload, запись в Heap, дедупликация и т.п.

  return ctx.resp.status(200).send('')
})
```

## Что нельзя делать (наблюдения с боевого траблшутинга 16–18.05.2026)

| Антипаттерн                                                         | Почему не работает                                                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `const body = req.body` для multipart                               | До патча 18.05.2026 платформа не парсила multipart и `req.body` был пуст. После патча работает, но `req.formData()` — каноничный API, ему отдают предпочтение.                                                                              |
| `req.files` / `req.fields` для multipart                            | Эти поля не заполнены платформой ни до, ни после патча — это были предполагаемые имена при поиске обходного решения; реально использовать `req.formData()`.                                                                                 |
| Использовать `@app/storage` `createUploadPutUrl` для приёма webhook | `createUploadPutUrl` предназначен только для пользовательских загрузок файлов в файловое хранилище Chatium — он возвращает специальный URL для прямой загрузки в ФХ и не подходит для приёма внешних webhook.                               |
| Прямой `fetch` к произвольному URL для multipart-стрима             | Сервер Chatium не даёт сырого доступа к TCP-соединению; всё идёт через платформенный HTTP-обработчик. Если требуется обработать тело, которое платформа не умеет — единственный вариант это снаружи (прокси на собственной инфраструктуре). |

## История поддержки multipart

| Дата                           | Событие                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| До 2026-05-18                  | `multipart/form-data` платформой не парсился. `req.body`/`req.files`/`req.fields` для multipart были пусты. Единственные поддерживаемые форматы — `application/json` и `application/x-www-form-urlencoded` (оба в `req.body`). |
| 2026-05-18 (Artur Eshenbrener) | Выкатан патч: добавлен `req.formData()`. Multipart-поля и файлы доступны через стандартный `FormData`-API.                                                                                                                     |

## Связанные документы

- [lifepay/webhooks](../lifepay/webhooks.md) — webhook LifePay в формате multipart, реальный пример приёма и парсинга.
- [inner/docs/002-routing](../../../../../../inner/docs/002-routing.md) — общая модель file-based routing в Chatium.
- [inner/docs/009-files](../../../../../../inner/docs/009-files.md) — работа с файлами через `@app/storage` (для загрузок от пользователей, не для webhook).
