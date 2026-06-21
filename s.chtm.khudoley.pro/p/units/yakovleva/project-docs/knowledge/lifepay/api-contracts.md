---
title: 'LifePay — API Контракты'
type: reference
tags:
  - topic/lifepay
  - topic/payments
  - topic/api
created: 2026-05-08
updated: 2026-05-08
---

# LifePay — API Контракты

Два поколения API. Для новых интеграций рекомендован **ECOM API**.

|                            | Старый API                                | Новый ECOM API                           |
| -------------------------- | ----------------------------------------- | ---------------------------------------- |
| Base URL                   | `https://api.life-pay.ru/v1/`             | `https://api-ecom.life-pay.ru/v1/`       |
| Авторизация                | `apikey` + `login` в теле каждого запроса | JWT Bearer (один раз получить, TTL 3 ч.) |
| Создание счёта             | `POST /v1/bill`                           | `POST /v1/invoices/`                     |
| Поле с URL оплаты в ответе | `url` (short link)                        | `form_link`                              |

---

## ECOM API — Авторизация

### Получение JWT-токена

**Endpoint:** `POST https://api-ecom.life-pay.ru/v1/auth`

**Тело запроса:**

```json
{
  "service_id": "{your_service_id}",
  "api_key": "{your_api_key}"
}
```

> `service_id` и `api_key` берутся в кабинете эквайринга `home.life-pay.ru` (Интеграция → Сервисы → иконка 🔑), доступном после подключения интернет-эквайринга отдельной заявкой. Подробно про кабинеты в [cabinets](cabinets.md).

**Ответ:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**TTL токена: 3 часа.** Рекомендация: кешировать токен и обновлять по истечении (или по ответу 401).

**Использование токена в запросах:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

📄 [Документация авторизации](https://docs.life-pos.ru/docs/api/ipsp_api_v1/auth/)

---

## ECOM API — Создание счёта (invoice)

**Endpoint:** `POST https://api-ecom.life-pay.ru/v1/invoices/`

### Запрос

| Поле                   | Тип    | Обяз. | Описание                                                        |
| ---------------------- | ------ | ----- | --------------------------------------------------------------- |
| `order_id`             | string | ✅    | ID заказа в вашей системе (используется для матчинга в webhook) |
| `amount`               | float  | ✅    | Сумма в рублях                                                  |
| `currency_code`        | string | ✅    | Валюта: `RUB`                                                   |
| `service_id`           | string | ✅    | ID сервиса из ЛК                                                |
| `name`                 | string | ✅    | Имя покупателя                                                  |
| `email`                | string | рек.  | Email покупателя                                                |
| `phone`                | string | рек.  | Телефон покупателя                                              |
| `url_success`          | string | ❌    | Редирект после успешной оплаты                                  |
| `url_error`            | string | ❌    | Редирект после ошибки                                           |
| `expire_date`          | string | ❌    | Срок действия: `"2026-05-15 23:59:59"`                          |
| `comment`              | string | ❌    | Внутренний комментарий (не виден покупателю)                    |
| `is_recurrent`         | bool   | ❌    | Флаг рекуррентного платежа                                      |
| `recurrent_schedule`   | object | ❌    | Расписание рекуррентных платежей                                |
| `send_receipt_through` | string | ❌    | Канал отправки чека: `"email"` / `"phone"`                      |
| `split_data`           | object | ❌    | Сплитование платежа                                             |

**Пример запроса:**

```json
{
  "order_id": "order_12345",
  "amount": 5000.0,
  "currency_code": "RUB",
  "service_id": "87875",
  "name": "Иван Иванов",
  "email": "client@example.com",
  "phone": "79161234567",
  "url_success": "https://school.ru/payment/success",
  "url_error": "https://school.ru/payment/error",
  "expire_date": "2026-05-15 23:59:59",
  "comment": "GetCourse order_12345"
}
```

### Ответ

Ключевое поле с URL платёжной страницы — **`form_link`**.

```json
{
  "id": "...",
  "short_id": "...",
  "order_id": "order_12345",
  "amount": 5000.0,
  "currency_code": "RUB",
  "service_id": "87875",
  "status": "...",
  "form_link": "https://oplata.life-pay.ru/pay/...",
  "url_success": "https://school.ru/payment/success",
  "url_error": "https://school.ru/payment/error",
  "expire_date": "2026-05-15 23:59:59"
}
```

> Редиректить покупателя нужно на значение поля **`form_link`**.

📄 [Документация create-invoice](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-invoice)

---

## ECOM API — Дополнительные методы

| Метод                              | Endpoint                            | Описание                        |
| ---------------------------------- | ----------------------------------- | ------------------------------- |
| Статус оплаты                      | `GET /v1/charges/{charge_id}`       | Получить текущий статус платежа |
| Создание платёжного токена (карта) | `POST /v1/payment-tokens/`          | Для встроенной формы (SDK)      |
| Статус платёжного токена           | `GET /v1/payment-tokens/{token_id}` | Проверить статус 3DS            |
| Возврат                            | `POST /v1/refunds/`                 | Создать возврат по invoice      |
| QR-код (СБП)                       | `POST /v1/qr-codes/`                | Сгенерировать QR для СБП        |

---

## Старый API — Выставление счёта

**Endpoint:** `POST https://api.life-pay.ru/v1/bill`

Авторизация — `apikey` + `login` прямо в теле каждого запроса (JWT не нужен).

> Документация: [apidoc.life-pay.ru/bill/index/](https://apidoc.life-pay.ru/bill/index/). Это рабочий API для кабинета `my.life-pay.ru` (фискализация + СБП-ссылки), подходит как fallback или альтернатива ECOM.

### Запрос

| Поле             | Тип          | Описание                                                                 |
| ---------------- | ------------ | ------------------------------------------------------------------------ |
| `apikey`         | string       | API-ключ из ЛК (`my.life-pay.ru` → Настройки → Разработчикам)            |
| `login`          | string       | Логин (номер телефона в формате `7XXXXXXXXXX`)                           |
| `amount`         | float        | Сумма в рублях                                                           |
| `customer_phone` | string\|null | Телефон покупателя                                                       |
| `customer_email` | string       | Email покупателя                                                         |
| `method`         | string       | `"sbp"` (по умолчанию), `"internetAcquiring"`, `"mobileCommerce"`        |
| `description`    | string       | Описание товара/услуги                                                   |
| `callback_url`   | string       | URL для webhook-уведомления по этому счёту (можно задать глобально в ЛК) |
| `order`          | object       | Данные заказа (number, items)                                            |

**Пример запроса (СБП):**

```json
{
  "apikey": "{your_apikey}",
  "login": "{your_login}",
  "amount": 5000.0,
  "customer_phone": null,
  "customer_email": "client@example.com",
  "method": "sbp",
  "description": "Курс «Имя продукта»",
  "callback_url": "https://school.ru/webhook/lifepay"
}
```

**Ответ при `method: "sbp"`** содержит две ссылки:

| Поле            | Описание                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `paymentUrl`    | Ссылка на `qr.nspk.ru` — для генерации QR или редиректа в банковское приложение |
| `paymentUrlWeb` | Ссылка на `web.qr.nspk.ru` — веб-страница СБП с выбором банка                   |
| `number`        | ID счёта в LifePay (используется для матчинга в webhook)                        |

**Ответ при `method: "internetAcquiring"`** содержит поле `url` с короткой ссылкой на платёжную форму.

**Проверка статуса:** `GET https://api.life-pay.ru/v1/bill/status`

**Отмена счёта:** `POST https://api.life-pay.ru/v1/bill/cancellation`

**Webhook:** общий механизм нотификаций транзакций. URL берётся из `callback_url` запроса или из глобальной настройки ЛК. Формат, статусы, retry-схема — в разделе [`/notification/`](https://apidoc.life-pay.ru/notification/index). Сопоставление с заказом по полю `number`.

**Пример (PHP):**

```php
$data = [
    'apikey'          => '{your_apikey}',
    'login'           => '{your_login}',
    'amount'          => 5000.00,
    'customer_phone'  => null,
    'customer_email'  => 'client@example.com',
    'method'          => 'internetAcquiring',
    'description'     => 'Курс «Имя продукта»',
];
$ch = curl_init('https://api.life-pay.ru/v1/bill');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($data),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
]);
$result = json_decode(curl_exec($ch));
curl_close($ch);
// $result->url — ссылка для редиректа
```

📄 [Документация bill API](https://apidoc.life-pay.ru/bill/index/)

---

## Короткая платёжная ссылка (Short Link)

Быстрое создание ссылки без полного invoice-цикла.

**Endpoint:** `POST https://partner.life-pay.ru/alba/build_link/input_short/`

Передать параметры платежа. Ответ при успехе:

```json
{ "status": "ok", "url": "https://url.life-pay.ru/{short_code}" }
```

> Параметр `key` не должен содержать `+`. При проблемах — обновить страницу в ЛК.

📄 [Документация short link](https://docs.life-pay.ru/ipsp/old/configure_payment_way/init_transactions/short_link/)

---

## Ссылки

- [Обзор ECOM API](https://docs.life-pos.ru/docs/api/ipsp_api_v1/life-pay-api-ecom)
- [Авторизация](https://docs.life-pos.ru/docs/api/ipsp_api_v1/auth/)
- [Создание счёта](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-invoice)
- [Создание платёжного токена](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-payment-token)
- [Статус оплаты](https://docs.life-pos.ru/docs/api/ipsp_api_v1/get-charge-by-id)
- [Возврат](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-refund)
- [Старый bill API](https://apidoc.life-pay.ru/bill/index/)
- [Коды ошибок](https://docs.life-pos.ru/ipsp/old/interaction/error_codes)
