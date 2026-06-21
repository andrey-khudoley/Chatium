# HTTP-контракты между GetCourse и Chatium

Логические пути ниже маппятся на file-based роуты приложения: один файл под `api/` = один эндпоинт. Фактический префикс URL включает путь проекта в воркспэйсе (см. [api.md](./api.md)).

Обратные вызовы из Chatium в GetCourse по **официальному PL API** (не JSON REST в стиле примеров ниже, а `action` + `key` + Base64 `params`): см. [reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md) и [integration-getcourse-api-reference.md](./integration-getcourse-api-reference.md).

## 11.1. Создание ссылки на оплату

### Endpoint

```http
POST /integrations/lava/payment-link
```

В репозитории проекта ожидается что-то вроде: `api/integrations/lava/payment-link/` (файл с путём `/`).

### Назначение

1. получить данные заказа;
2. захватить блокировку;
3. обновить цену технического оффера;
4. создать контракт;
5. сохранить связь заказа и контракта;
6. вернуть ссылку на оплату.

### Request

Идентификатор заказа: **`gcOrderId`** или **`orderNumber`** (одно из полей непустое после trim). Email: **`buyerEmail`** или **`email`**. **`currency`** — строка, для Lava нормализуется к `RUB` / `USD` / `EUR` (алиас `RUR` → `RUB`). Поля **`offer`** и **`product`** — тексты из GetCourse: сохраняются в Heap; **`product`** дополнительно передаётся в Lava как `offers[].name` при PATCH цены продукта.

Пример в стиле GetCourse:

```json
{
  "orderNumber": "440760671",
  "currency": "RUB",
  "amount": 100,
  "email": "tester@example.com",
  "offer": "Предложение по первому пакету",
  "product": "Тестовый продукт - Первый пакет"
}
```

Эквивалент с прежними именами полей:

```json
{
  "gcOrderId": "order_12345",
  "gcUserId": "user_987",
  "buyerEmail": "client@example.com",
  "amount": 4990.0,
  "currency": "RUB",
  "offer": "Предложение",
  "product": "Название пакета для виджета Lava",
  "description": "Оплата заказа order_12345",
  "paymentProvider": "SMART_GLOCAL",
  "paymentMethod": "CARD",
  "buyerLanguage": "RU",
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc"
  },
  "requestId": "b7d1c87c-0cc8-46d8-a1d8-aabbccddee11"
}
```

Опционально **`integrationTestDryRun`** (`boolean`): при `true` Chatium возвращает успешный ответ **без** вызова Lava и записи в Heap (только для проверок; GetCourse в проде поле не передаёт). См. тесты `payment-link-dry-run-unit` и `payment-link-http-integration`.

Валидация в Chatium — `@app/schema` (`inner/docs` по schema).

### Response при успехе

```json
{
  "success": true,
  "gcOrderId": "order_12345",
  "lavaContractId": "7ea82675-4ded-4133-95a7-a6efbaf165cc",
  "paymentUrl": "https://payment-widget-url",
  "status": "in-progress"
}
```

### Response при ошибке

```json
{
  "success": false,
  "errorCode": "PAYMENT_TEMPLATE_BUSY",
  "message": "Payment template is busy"
}
```

### Возможные `errorCode`

| Код                     | Значение                               |
| ----------------------- | -------------------------------------- |
| `VALIDATION_ERROR`      | Входные данные некорректны             |
| `PAYMENT_TEMPLATE_BUSY` | Шаблонный оффер занят другим запросом  |
| `LAVA_UPDATE_ERROR`     | Не удалось обновить цену в Lava        |
| `LAVA_CONTRACT_ERROR`   | Не удалось создать контракт в Lava     |
| `CONFIG_ERROR`          | Не настроены `productId` или `offerId` |
| `INTERNAL_ERROR`        | Внутренняя ошибка Chatium              |

## 11.2. Callback статуса в GetCourse

### Endpoint (логический контракт)

```http
POST /integrations/lava/payment-status
```

Канал доставки — HTTP `request()` к GetCourse или иной согласованный механизм.

### Payload успешной оплаты

```json
{
  "gcOrderId": "order_12345",
  "lavaContractId": "7ea82675-4ded-4133-95a7-a6efbaf165cc",
  "eventType": "payment.success",
  "status": "completed",
  "amount": 4990.0,
  "currency": "RUB",
  "buyerEmail": "client@example.com",
  "paidAt": "2026-03-27T12:25:30Z"
}
```

### Payload неуспешной оплаты

```json
{
  "gcOrderId": "order_12345",
  "lavaContractId": "7ea82675-4ded-4133-95a7-a6efbaf165cc",
  "eventType": "payment.failed",
  "status": "failed",
  "amount": 4990.0,
  "currency": "RUB",
  "buyerEmail": "client@example.com",
  "failedAt": "2026-03-27T12:25:30Z",
  "errorMessage": "Payment is not completed"
}
```

## Webhook от Lava к Chatium

Маршрут приёма (логический):

```http
POST /integrations/lava/webhook
```

Детали обработки — [integration-idempotency-statuses-webhooks.md](./integration-idempotency-statuses-webhooks.md).
