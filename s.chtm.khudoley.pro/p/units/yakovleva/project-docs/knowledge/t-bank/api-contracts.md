---
title: 'Т-Банк Эквайринг — API Контракты'
type: reference
tags:
  - topic/t-bank
  - topic/payments
  - topic/api
created: 2026-05-08
---

# Т-Банк Эквайринг — API Контракты

## Общие сведения

**Протокол:** HTTPS POST, Content-Type: application/json  
**Base URL (тест):** `https://rest-api-test.tinkoff.ru/v2/`  
**Base URL (прод):** `https://securepay.tinkoff.ru/v2/`

Каждый запрос должен содержать поле `Token` — подпись запроса (см. раздел «Генерация токена»).

---

## Генерация токена (подпись запроса)

Токен = SHA-256 от конкатенации значений параметров, отсортированных по **ключу** в алфавитном порядке, с добавленным `Password`.

**Алгоритм:**

1. Взять все параметры запроса (кроме `Token`, `Receipt`, `DATA`).
2. Добавить пару `Password` → значение пароля из ЛК.
3. Отсортировать пары по ключу (алфавитно).
4. Конкатенировать только **значения** (не ключи) в одну строку.
5. Вычислить SHA-256 от полученной строки.

**Пример (PHP):**

```php
function generateToken(array $params, string $password): string {
    $params['Password'] = $password;
    ksort($params);
    $str = implode('', array_values($params));
    return hash('sha256', $str);
}
```

> ⚠️ Поля `Receipt` и `DATA` (вложенные объекты) в токен **не включаются**.

**Где взять TerminalKey и Password:** ЛК интернет-эквайринга → Магазины → Терминалы → Настроить.

---

## Метод Init — Инициация платежа

**Endpoint:** `POST /v2/Init`

Основной метод. Создаёт платёж и возвращает `PaymentURL` — ссылку на платёжную форму.

### Запрос

| Поле              | Тип     | Обяз. | Описание                                                                      |
| ----------------- | ------- | ----- | ----------------------------------------------------------------------------- |
| `TerminalKey`     | string  | ✅    | Ключ терминала из ЛК                                                          |
| `Amount`          | integer | ✅    | Сумма в **копейках** (100 руб = 10000)                                        |
| `OrderId`         | string  | ✅    | ID заказа в системе мерчанта (уникальный)                                     |
| `Token`           | string  | ✅    | Подпись запроса (SHA-256)                                                     |
| `Description`     | string  | ❌    | Описание заказа (до 140 символов)                                             |
| `CustomerKey`     | string  | ❌    | ID покупателя в системе мерчанта                                              |
| `Recurrent`       | string  | ❌    | `Y` — зарегистрировать рекуррентный платёж                                    |
| `PayType`         | string  | ❌    | `O` — одностадийный, `T` — двухстадийный (по умолчанию из настроек терминала) |
| `Language`        | string  | ❌    | `ru` или `en`                                                                 |
| `NotificationURL` | string  | ❌    | URL для получения webhook-уведомлений (переопределяет настройку терминала)    |
| `SuccessURL`      | string  | ❌    | Редирект при успешной оплате                                                  |
| `FailURL`         | string  | ❌    | Редирект при ошибке/отмене                                                    |
| `RedirectDueDate` | string  | ❌    | Срок действия ссылки: `YYYY-MM-DDTHH:mm:ssZ` (от 1 мин до 90 дней)            |
| `DATA`            | object  | ❌    | Доп. параметры (ключ/значение, до 20 пар, 128 символов каждый)                |
| `Receipt`         | object  | ❌    | Данные фискального чека (ФЗ-54)                                               |
| `ClientIP`        | string  | ❌    | IP покупателя                                                                 |

**Пример запроса:**

```json
{
  "TerminalKey": "TinkoffBankTest",
  "Amount": 149900,
  "OrderId": "order_42",
  "Description": "Оплата курса по программированию",
  "NotificationURL": "https://example.com/webhook/tbank",
  "SuccessURL": "https://example.com/success",
  "FailURL": "https://example.com/fail",
  "DATA": {
    "Email": "user@example.com",
    "Phone": "+79001234567"
  },
  "Token": "<sha256-hash>"
}
```

### Ответ

| Поле          | Тип     | Описание                                                    |
| ------------- | ------- | ----------------------------------------------------------- |
| `Success`     | boolean | `true` если запрос принят                                   |
| `ErrorCode`   | string  | `0` при успехе, иначе код ошибки                            |
| `TerminalKey` | string  | Ключ терминала                                              |
| `Status`      | string  | Статус платежа (`NEW`)                                      |
| `PaymentId`   | string  | ID платежа в системе банка (нужен для дальнейших запросов)  |
| `OrderId`     | string  | ID заказа мерчанта                                          |
| `Amount`      | integer | Сумма в копейках                                            |
| `PaymentURL`  | string  | **Ссылка на платёжную форму** — сюда редиректить покупателя |
| `Message`     | string  | Сообщение об ошибке (если есть)                             |
| `Details`     | string  | Детали ошибки (если есть)                                   |

**Пример ответа:**

```json
{
  "Success": true,
  "ErrorCode": "0",
  "TerminalKey": "TinkoffBankTest",
  "Status": "NEW",
  "PaymentId": "13660038",
  "OrderId": "order_42",
  "Amount": 149900,
  "PaymentURL": "https://securepayments.tinkoff.ru/FDajd97a"
}
```

---

## Метод GetState — Получение статуса платежа

**Endpoint:** `POST /v2/GetState`

Позволяет проактивно запросить текущий статус платежа (polling).

### Запрос

| Поле          | Тип    | Обяз. | Описание                  |
| ------------- | ------ | ----- | ------------------------- |
| `TerminalKey` | string | ✅    | Ключ терминала            |
| `PaymentId`   | string | ✅    | ID платежа из ответа Init |
| `Token`       | string | ✅    | Подпись                   |

### Ответ

Аналогичен ответу Init плюс поля `Pan` (маскированный номер карты), `ExpDate`, `CardId`.

---

## Метод Confirm — Подтверждение платежа (для двухстадийных)

**Endpoint:** `POST /v2/Confirm`

Применяется только при `PayType=T`. Списывает зафиксированные средства.

| Поле          | Тип     | Обяз. | Описание                                                  |
| ------------- | ------- | ----- | --------------------------------------------------------- |
| `TerminalKey` | string  | ✅    |                                                           |
| `PaymentId`   | string  | ✅    | ID из Init                                                |
| `Amount`      | integer | ❌    | Можно подтвердить меньшую сумму (частичное подтверждение) |
| `Token`       | string  | ✅    |                                                           |

---

## Метод Cancel — Отмена/возврат

**Endpoint:** `POST /v2/Cancel`

| Поле          | Тип     | Обяз. | Описание                                    |
| ------------- | ------- | ----- | ------------------------------------------- |
| `TerminalKey` | string  | ✅    |                                             |
| `PaymentId`   | string  | ✅    |                                             |
| `Amount`      | integer | ❌    | Частичный возврат (если не указан — полный) |
| `Token`       | string  | ✅    |                                             |

---

## Одностадийный vs Двухстадийный платёж

|                    | Одностадийный (`PayType=O`) | Двухстадийный (`PayType=T`)              |
| ------------------ | --------------------------- | ---------------------------------------- |
| Этапы              | Сразу списание              | Резервирование → Подтверждение (Confirm) |
| Статус при оплате  | `CONFIRMED`                 | `AUTHORIZED` → затем `CONFIRMED`         |
| Применение         | Цифровые товары, услуги     | Физические товары, предзаказы            |
| Webhook при успехе | `AUTHORIZED` + `CONFIRMED`  | `AUTHORIZED`, потом `CONFIRMED`          |

> Для большинства онлайн-сервисов (курсы, подписки) подходит **одностадийный** платёж.

---

## Параметр DATA — доп. данные

Передаётся как flat-объект строк. Полезен для передачи CRM-данных и настройки видимости методов оплаты:

```json
"DATA": {
  "Email": "user@example.com",
  "Phone": "+79001234567",
  "connection_type": "osmp"
}
```

---

## Ссылки

- [Описание метода Init](https://www.tinkoff.ru/kassa/develop/api/payments/init-description/)
- [Init — запрос](https://www.tinkoff.ru/kassa/develop/api/payments/init-request/)
- [Init — ответ](https://www.tinkoff.ru/kassa/develop/api/payments/init-response/)
- [GetState — описание](https://www.tinkoff.ru/kassa/develop/api/payments/getstate-description/)
- [Confirm — описание](https://www.tinkoff.ru/kassa/develop/api/payments/confirm-description/)
- [Все методы API](https://www.tinkoff.ru/kassa/develop/api/payments/)
- [Примеры PHP](https://www.tinkoff.ru/kassa/develop/api/examples/)
- [GitHub API ASDK (неофициальная документация)](https://tinkoff.github.io/api_asdk/)
