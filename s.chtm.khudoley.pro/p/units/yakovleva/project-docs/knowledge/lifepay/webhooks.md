---
title: 'LifePay — Webhook-уведомления'
type: reference
tags:
  - topic/lifepay
  - topic/payments
  - topic/webhooks
created: 2026-05-08
updated: 2026-05-23
sources:
  - 'https://apidoc.life-pay.ru/notification/index — официальная live-документация старого API'
  - 'Боевой webhook 2026-05-20 (Postman Mock capture), см. оригинал в 03_Projects/active/olga-getcourse-payments-c7d5a1/notes/2026-05-20--first-real-webhook.md'
  - 'https://docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications — формат ECOM (резерв)'
---

# LifePay — Webhook-уведомления

LifePay имеет два независимых контура webhook в зависимости от того, через какое API создан счёт. Эти контуры используют разные форматы payload, разные кабинеты для настройки URL и разные механизмы аутентификации.

| Источник счёта                                   | Формат                                                              | Кабинет настройки URL                                                           | Документация                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Старый API `POST /v1/bill` (контур `bills_v1`)   | **`multipart/form-data`** с единственным полем `data` (JSON-строка) | `my.life-pay.ru` → Настройки → Разработчикам, или `callback_url` в теле запроса | [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index)                               |
| ECOM API `POST /v1/invoices/` (контур `ecom_v1`) | См. ECOM-доку (резерв; требует подтверждения при активации)         | `home.life-pay.ru` → Настройки магазина                                         | [docs.life-pos.ru webhook_notifications](https://docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications) |

Связь кабинетов и API в [cabinets](cabinets.md).

> **Важная актуализация 2026-05-23.** До этой даты раздел 1 описывал формат `application/x-www-form-urlencoded` с MD5-подписью `check` и полями `tid`/`resultStr`/`order_id` (так значилось в более старой документации LifePay v1.0). По состоянию на 2026-05-23 реальный формат отличается: LifePay шлёт `multipart/form-data` с JSON в поле `data`, подпись отсутствует. Старый раздел сохранён в конце документа в блоке «Архив: формат v1.0 form-encoded с MD5» исключительно для исторической справки — если встретится продукт LifePay, который ещё шлёт старый формат, обработчик можно собрать по нему. **Все новые интеграции — по разделу 1.**

---

## 1. Webhook старого API (контур `bills_v1`)

Webhook от транзакций по счёту, созданному через `POST https://api.life-pay.ru/v1/bill`. Соответствует [apidoc.life-pay.ru/notification/index](https://apidoc.life-pay.ru/notification/index) и подтверждён живым примером 2026-05-20 (см. `sources` в frontmatter).

### 1.1. Транспорт

| Свойство                  | Значение                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| HTTP-метод                | `POST`                                                                                                                             |
| User-Agent                | `GuzzleHttp/7` (PHP-сервис LifePay)                                                                                                |
| Content-Type              | `multipart/form-data; boundary=...`                                                                                                |
| Тело                      | Одно текстовое поле `data` — JSON-строка (в кодировке UTF-8 с `\uXXXX`-эскейпом для не-ASCII)                                      |
| Аутентификация            | **Нет.** Подпись webhook LifePay не публикует и не присылает — нет полей `check`/`signature`/`hash`, алгоритм не описан. См. §1.4. |
| IP-источник (наблюдалось) | `cf-connecting-ip: 51.250.11.94`, `cf-ipcountry: RU` (Cloudflare-фронт LifePay)                                                    |

> **Расхождение с официальной докой.** [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index) указывает `Формат: JSON` — но фактически LifePay присылает multipart с JSON-строкой внутри. Источник истины — живой webhook, не дока.

### 1.2. Расписание повторных попыток

LifePay ждёт HTTP 200 в ответ (тело ответа любое, можно пустое). Если получен не-200 — повторяет:

| Попытка | Задержка   |
| ------- | ---------- |
| 1       | Немедленно |
| 2       | +1 минута  |
| 3       | +3 минуты  |
| 4       | +5 минут   |
| 5       | +10 минут  |
| 6–10    | Каждый час |

**Максимум 10 попыток.** После — уведомление считается недоставленным; восстановить только ручной сверкой через `my.life-pay.ru` или `GET /v1/bill/status`.

**Рекомендация:** возвращать HTTP 200 **всегда**, даже при внутренней ошибке записи в БД. Иначе LifePay будет долбить ретраями и забивать очередь обработки на нашей стороне.

### 1.3. Тело webhook — поля JSON в `data`

Все поля декодируются строкой или числом. `null` встречается часто (см. примечания).

| Поле                                                           | Тип            | Описание                                                                                                                                           | Примечания                                                                                                                                                                              |
| -------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`                                                       | string         | Номер транзакции в LifePay                                                                                                                         | Уникальный, по нему делается дедупликация                                                                                                                                               |
| `original_number`                                              | string \| null | Для возвратов (`type=refund`) — `number` исходного платежа; для платежей — `null`                                                                  |                                                                                                                                                                                         |
| `type`                                                         | string         | `payment` (платёж) или `refund` (возврат)                                                                                                          |                                                                                                                                                                                         |
| `status`                                                       | string         | `success` (успех) или `fail` (отказ)                                                                                                               | **Оба статуса** приходят webhook'ом. Бизнес-обновление — только при `success`.                                                                                                          |
| `method`                                                       | string         | Способ платежа: `card`, `cash`, `recurrent`, `internetAcquiring`, `mobileInternetAcquiring`, `sbp` (последнее замечено фактом, в доке отсутствует) | Для СБП — `sbp`                                                                                                                                                                         |
| `terminal_serial`                                              | string \| null | Серийник терминала (если есть)                                                                                                                     | Для СБП — `null`                                                                                                                                                                        |
| `recipient_inn`                                                | string         | ИНН получателя оплаты                                                                                                                              |                                                                                                                                                                                         |
| `operator_login`                                               | string         | Логин оператора (телефон владельца магазина в формате `7XXXXXXXXXX`)                                                                               |                                                                                                                                                                                         |
| `operator_name`                                                | string         | Имя оператора (ФИО владельца магазина)                                                                                                             | UTF-8 с эскейпом                                                                                                                                                                        |
| `amount`                                                       | string         | Сумма в рублях, два знака после точки, **строкой**                                                                                                 | Например `"1.00"`                                                                                                                                                                       |
| `tip_amount`                                                   | string \| null | Сумма чаевых                                                                                                                                       |                                                                                                                                                                                         |
| `discount_amount`                                              | string \| null | Сумма скидки                                                                                                                                       |                                                                                                                                                                                         |
| `description`                                                  | string         | Описание транзакции (то, что передавалось в `description` при `createBill`)                                                                        |                                                                                                                                                                                         |
| `phone`                                                        | string         | Телефон покупателя                                                                                                                                 | **Может быть пустой строкой** `""`, не `null`                                                                                                                                           |
| `email`                                                        | string         | Email покупателя                                                                                                                                   |                                                                                                                                                                                         |
| `pan`                                                          | string         | Замаскированный номер карты                                                                                                                        | Для СБП — `""`                                                                                                                                                                          |
| `cardholder`                                                   | string \| null | Имя держателя карты                                                                                                                                | Для СБП — `null`                                                                                                                                                                        |
| `rrn`                                                          | string \| null | RRN транзакции                                                                                                                                     |                                                                                                                                                                                         |
| `lat`                                                          | number \| null | Широта точки оплаты                                                                                                                                | Для интернет-эквайринга — `null`                                                                                                                                                        |
| `lng`                                                          | number \| null | Долгота точки оплаты                                                                                                                               |                                                                                                                                                                                         |
| `created`                                                      | string         | Дата транзакции в ISO 8601                                                                                                                         | Например `"2026-05-17T07:15:10+00:00"`                                                                                                                                                  |
| `purchase`                                                     | array          | Массив позиций каталога                                                                                                                            | Поля каждой позиции: `name`, `quantity`, `unit` (`l`/`ml`/`kg`/`g`/`piece`), `amount`, `ext_id` (\| null), `barcode` (\| null, замечено фактом)                                         |
| `order`                                                        | object \| null | Данные о заказе во внешней системе                                                                                                                 | **Может быть `null`** — если счёт создан без поля `order` (например вручную в ЛК LifePay). Для счетов, созданных через `createBill` с переданным `order.number`, объект всегда заполнен |
| `order.ext_id`                                                 | string \| null | ID заказа во внешней системе                                                                                                                       |                                                                                                                                                                                         |
| `order.number`                                                 | string         | Номер заказа во внешней системе                                                                                                                    | ← **именно сюда мы передаём свой `orderNumber` при `createBill`**; именно по этому полю матчим webhook с заказом                                                                        |
| `order.name`                                                   | string \| null | Наименование заказа                                                                                                                                |                                                                                                                                                                                         |
| `order.phone`, `order.email`, `order.comment`, `order.barcode` | string \| null | Опциональные поля заказа                                                                                                                           |                                                                                                                                                                                         |
| `add_fields`                                                   | object \| null | Произвольные поля клиента                                                                                                                          |                                                                                                                                                                                         |
| `original_add_fields`                                          | object \| null | Произвольные поля исходной транзакции (для возвратов)                                                                                              |                                                                                                                                                                                         |

### 1.4. Аутентификация и защита от подделки

**LifePay не подписывает webhook.** Ни заголовков, ни поля в теле — никакого `check`/`signature`/`hash`. Алгоритм MD5 на странице [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index) не описан. Это подтверждено живым захватом 2026-05-20.

Возможные стратегии аутентификации webhook:

1. **Токен в URL** (рекомендуется). При `createBill` передавать `callback_url=https://your.host/webhook?token=<random>`, где `<random>` — длинная случайная строка (≥ 32 символов), сохранённая в нашей системе. На приёмнике сверять `token` из query с ожидаемым значением; расхождение → 401/403, никакой записи. Сам токен не приходит в теле, в логи не пишется.
2. **IP-allowlist** на уровне reverse-proxy. Наблюдаемые IP LifePay-исходящих запросов: `cf-connecting-ip` примера 2026-05-20 — `51.250.11.94`. Полный список — запросить у поддержки.
3. **Дедупликация по `number`.** Идемпотентность достигается уникальным индексом по `number` в нашей БД: повторный webhook с тем же `number` не вызывает повторного обновления.

**Что НЕ работает:**

- Сравнение поля `email` или `phone` с ожидаемыми — эти поля не уникальны и не покрывают весь поток.
- Проверка `recipient_inn` — единственное значение для одного магазина, не отличает свой webhook от подделки.

### 1.5. Пример живого webhook

Полный captured-пример: см. `03_Projects/active/olga-getcourse-payments-c7d5a1/notes/2026-05-20--first-real-webhook.md`. Краткая выжимка тела:

```json
{
  "number": "16035058618014",
  "type": "payment",
  "status": "fail",
  "method": "sbp",
  "amount": "1.00",
  "description": "Тестовый счёт №9",
  "email": "tester@khudoley.pro",
  "phone": "",
  "created": "2026-05-17T07:15:10+00:00",
  "order": null,
  "purchase": [
    { "name": "Тестовый счёт №9", "quantity": "1.000", "unit": "piece", "amount": "1.000" }
  ]
}
```

### 1.6. Как принимать webhook в Chatium

Multipart-парсинг через `req.formData()` — см. отдельную справку [chatium/multipart-form-data](../chatium/multipart-form-data.md).

Минимальный скелет:

```ts
app.post('/webhook', async (ctx, req) => {
  // 1. Проверить токен в query
  const expectedToken = await readSettingFromHeap('lp_webhook_token')
  if (req.query.token !== expectedToken) {
    return ctx.resp.status(401).send('')
  }

  // 2. Прочитать тело
  const form = await req.formData()
  const dataField = form.get('data')
  if (typeof dataField !== 'string') {
    // fallback: LifePay в редких случаях может прислать JSON напрямую — обработать
    return ctx.resp.status(200).send('') // всегда 200, чтобы не ретраил
  }

  // 3. Распарсить JSON
  let payload: unknown
  try {
    payload = JSON.parse(dataField)
  } catch {
    return ctx.resp.status(200).send('')
  }

  // 4. Дедупликация по number (с runWithExclusiveLock из @app/sync)
  // 5. Запись в Heap
  // 6. Бизнес-обновление при type='payment' + status='success'

  return ctx.resp.status(200).send('')
})
```

Реализация в проекте: `p/units/yakovleva/pay/web/webhook/index.tsx` + `lib/webhook/processWebhook.ts`.

### 1.7. Рекомендации по реализации

1. **HTTP 200 — всегда.** Даже при невалидном теле или внутренней ошибке. Иначе LifePay ретраит до 10 раз и засоряет логи.
2. **Дедупликация по `number`.** Уникальный индекс в БД + `runWithExclusiveLock` для защиты от гонок при параллельной доставке.
3. **Сохранять сырое тело.** Поле `rawBody` в журнале — для отладки, расхождений со схемой, восстановления случаев, когда парсер ошибся.
4. **Маппинг с CRM — по `order.number`.** Это поле мы сами заполняем при `createBill`. `null` означает «счёт создан не нами» — такой webhook залогировать, но не пытаться привязать.
5. **Условие бизнес-действия:** `type === 'payment'` AND `status === 'success'`. Любая другая комбинация (refund/fail) — только запись в журнал.

---

## 2. Webhook ECOM API (`api-ecom.life-pay.ru/v1/`)

Это формат для счетов, созданных через `POST /v1/invoices/` в новом ECOM API. Доступен только при подключённом интернет-эквайринге через `home.life-pay.ru`. В рамках текущего проекта olga-getcourse-payments **не используется** — основной путь `bills_v1`, см. ADR 0001 проекта.

### Как настроить

URL для уведомлений задаётся в кабинете эквайринга `home.life-pay.ru` → Настройки магазина. Секретный ключ для проверки подписи там же.

### Источник правды

Полная спецификация (формат payload, структура подписи, статусы, retry-схема) живёт на странице [docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications](https://docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications).

### Что подтвердить при активации

- Точный формат тела webhook (JSON или form-encoded).
- Алгоритм подписи (HMAC, MD5 или другой) и какие поля включаются в строку подписи.
- Поле для сопоставления с заказом в CRM (`order_id` из создания invoice или внутренний `id`/`charge_id`).
- Расписание retry-попыток.
- Статусы платежа в payload.

После получения первого реального webhook от ECOM добавить в этот файл точные параметры по аналогии с разделом 1.

---

## 3. Архив: формат v1.0 form-encoded с MD5 (актуально только для legacy)

> **Не использовать для новых интеграций.** Раздел сохранён исключительно как историческая справка. Старая документация LifePay v1.0 (на 2026-05-08) описывала именно этот формат, но по факту 2026-05-20 LifePay шлёт multipart/JSON без подписи (раздел 1). Если когда-нибудь встретится продукт LifePay со старым form-encoded форматом — обрабатывать по этому разделу.

Формат тела: `application/x-www-form-urlencoded`.

Поля v1.0:

| Параметр       | Описание                                                      |
| -------------- | ------------------------------------------------------------- |
| `tid`          | Идентификатор транзакции LifePay                              |
| `number`       | Номер счёта в LifePay                                         |
| `name`         | Название платежа                                              |
| `comment`      | Комментарий                                                   |
| `partner_id`   | ID партнёра                                                   |
| `service_id`   | ID сервиса                                                    |
| `order_id`     | ID заказа в вашей системе                                     |
| `type`         | Тип транзакции (`ipsp_...`)                                   |
| `cost`         | Сумма транзакции                                              |
| `command`      | Команда (`process`)                                           |
| `phone_number` | Телефон покупателя                                            |
| `email`        | Email покупателя                                              |
| `result`       | Код результата                                                |
| `resultStr`    | Текстовый статус (`транзакция оплачена полностью` для успеха) |
| `date_created` | Дата создания транзакции                                      |
| `version`      | Версия протокола (`1.0` или `2.0`)                            |
| `currency`     | Валюта (`RUB`)                                                |
| `check`        | MD5-подпись для верификации                                   |

Алгоритм подписи `check` (legacy): MD5 от всех параметров уведомления (кроме самого `check`), конкатенированных без разделителей, с добавленным в конце секретным ключом сервиса.

Python (legacy):

```python
import hashlib

def verify_lifepay_webhook(params: dict, secret_key: str) -> bool:
    received_check = params.pop('check', '')
    param_values = ''.join(str(v) for v in params.values())
    expected_check = hashlib.md5((param_values + secret_key).encode()).hexdigest()
    return received_check == expected_check
```

---

## Ссылки

- [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index) — официальная live-документация старого API (источник истины по полям, но формат указан неточно).
- [docs.life-pos.ru webhook_notifications](https://docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications) — ECOM API webhook.
- [cabinets](cabinets.md) — карта кабинетов и API LifePay.
- [chatium/multipart-form-data](../chatium/multipart-form-data.md) — как принимать multipart в Chatium.
- [Боевой webhook 2026-05-20](../../notes/2026-05-20--first-real-webhook.md) — captured-пример (с метаданными доставки, IP, заголовками).
