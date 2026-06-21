---
title: 'Первый боевой webhook LifePay — живой пример (20.05.2026)'
project_hash: c7d5a1
type: note
date: 2026-05-20
tags:
  - project/olga-getcourse-payments
  - topic/lifepay
  - topic/webhook
  - note/evidence
related_plan: '[implementation-plan §1.9](../../../../saas/gw/lifepay/docs/gateway/implementation-plan.md)'
related_reference: '[knowledge: lifepay/webhooks](../knowledge/lifepay/webhooks.md)'
---

# Первый боевой webhook LifePay — живой пример (20.05.2026)

Захват реального webhook от LifePay по тестовому счёту. Получен через Postman Mock Server (host `65698025-a35a-4cf9-9a8a-937f88ff63db.mock.pstmn.io`) для подтверждения фактической схемы — не через боевой `Payments Client`. Эта заметка закрывает обязательство [implementation-plan §1.9 шаг 4](../../../../saas/gw/lifepay/docs/gateway/implementation-plan.md) («сохранить сырое тело первого боевого webhook»).

Канонический разбор формата вынесен в [knowledge-базу](../knowledge/lifepay/webhooks.md) и больше не дублируется в проекте.

## Метаданные доставки

- **Дата/время:** 20.05.2026, 10:15:33 UTC.
- **Путь:** `POST /Default` (Postman mock).
- **`cf-ipcountry`:** `RU`; `cf-connecting-ip`: `51.250.11.94` (исходящий IP LifePay-инфраструктуры — пригодится, если когда-нибудь потребуется allowlist).
- **User-Agent:** `GuzzleHttp/7` (PHP-сервис LifePay шлёт webhook через Guzzle).

## Заголовки запроса

```
POST /Default HTTP/1.1
host: 65698025-a35a-4cf9-9a8a-937f88ff63db.mock.pstmn.io
content-length: 1028
content-type: multipart/form-data; boundary=77637e676339b607d3a5c67d8d0025e8b9ee7f3a
user-agent: GuzzleHttp/7
x-forwarded-proto: https
cf-connecting-ip: 51.250.11.94
cf-ipcountry: RU
x-request-id: 4f7df68a-5861-4dfb-8e7e-311d67284884
accept-encoding: gzip, br
```

**Ключевое:** `content-type: multipart/form-data; boundary=...` — это **факт**, несмотря на то что [официальная live-документация LifePay](https://apidoc.life-pay.ru/notification/index) заявляет JSON-формат. Тело multipart с единственным текстовым полем `data`, содержащим JSON-строку.

## Тело запроса (multipart-поле `data`)

```json
{
  "number": "16035058618014",
  "original_number": null,
  "type": "payment",
  "status": "fail",
  "method": "sbp",
  "terminal_serial": null,
  "recipient_inn": "421404200434",
  "operator_login": "79959234545",
  "operator_name": "Яковлева Анна Андреевна",
  "amount": "1.00",
  "tip_amount": null,
  "discount_amount": null,
  "description": "Тестовый счёт №9",
  "phone": "",
  "email": "tester@khudoley.pro",
  "pan": "",
  "cardholder": null,
  "rrn": null,
  "lat": null,
  "lng": null,
  "created": "2026-05-17T07:15:10+00:00",
  "purchase": [
    {
      "name": "Тестовый счёт №9",
      "quantity": "1.000",
      "unit": "piece",
      "amount": "1.000",
      "ext_id": null,
      "barcode": null
    }
  ],
  "order": null,
  "add_fields": null,
  "original_add_fields": null
}
```

## Что подтвердилось этим примером

1. **Формат тела — `multipart/form-data` с единственным полем `data` (JSON-строка)**, не `application/json` и не `application/x-www-form-urlencoded`. Парсить через `req.formData()` (см. [knowledge: chatium/multipart-form-data](../knowledge/chatium/multipart-form-data.md)).
2. **Нет MD5-подписи.** В теле нет полей `check`/`signature`/`hash`; в заголовках только Cloudflare/Envoy/трассировка. Решение 15.05 «не реализуем MD5» подтверждено фактом.
3. **`order` может быть `null`.** В живом примере счёт создан, по-видимому, через ЛК LifePay вручную (наша `createBill` всегда передаёт `order: { number: args.orderNumber }`). Для нашего боевого потока `order.number` всегда будет заполнен; для счетов из ЛК — нет, `orderNumber` тогда пустая строка, к заказу GC такой webhook привязать нельзя. Парсер `lib/webhook/processWebhook.ts` корректно null-safe.
4. **`status: "fail"`** означает отказ покупки (а не системную ошибку): покупатель попытался оплатить, но банк отклонил. Webhook всё равно приходит — это нормально, LifePay уведомляет об обоих исходах. Условие синхронизации с GetCourse: `type: 'payment'` И `status: 'success'`.
5. **Пустые строки vs null.** `phone`, `pan` — пустая строка (`""`); `terminal_serial`, `cardholder`, `rrn`, `lat`, `lng`, `tip_amount`, `discount_amount`, `add_fields`, `original_add_fields` — `null`. Зависит от способа оплаты (СБП не даёт `pan`/`cardholder`; неэлектронная транзакция не даёт `lat`/`lng`).
6. **Кириллица в строках** (`operator_name`, `description`, `purchase[].name`) приходит UTF-8-эскейпом (`Як...`). После `JSON.parse` декодируется корректно.

## Незавершённые проверки

- Сценарий `type: 'payment'` + `status: 'success'` (наша счастливая ветка). Этот пример — `fail`, формат тех же полей при `success` известен только по [официальной доке](https://apidoc.life-pay.ru/notification/index); первый успешный webhook доловить отдельно и приписать ниже, если поля отличаются.
- Поведение `original_number`: для возвратов (`type: 'refund'`) должно содержать `number` исходного платежа. Этот пример — платёж, поле `null`.
