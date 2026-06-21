---
title: 'Обновление заказа GetCourse при оплате через ОТП Банк'
type: reference
tags:
  - topic/getcourse
  - topic/otp-bank
  - topic/payments
  - topic/api
created: 2026-05-08
project: olga-getcourse-payments-c7d5a1
---

# Обновление заказа GetCourse при оплате через ОТП Банк

После получения подтверждения от ОТП Банка (JS callback или webhook) необходимо обновить статус заказа в GetCourse.

**Официальная документация:** https://getcourse.ru/help/api

---

## GetCourse API — базовые параметры

| Параметр           | Значение                                      |
| ------------------ | --------------------------------------------- |
| **Endpoint**       | `https://{account}.getcourse.ru/pl/api/deals` |
| **Метод**          | POST                                          |
| **Content-Type**   | `application/x-www-form-urlencoded`           |
| **Аутентификация** | Параметр `secret_key` в теле запроса          |
| **Действие**       | Параметр `action=add`                         |

`account` — поддомен аккаунта GetCourse (например, `school.getcourse.ru` → account = `school`)  
`secret_key` — API-ключ из настроек GetCourse

---

## Формат запроса для обновления заказа

```http
POST https://{account}.getcourse.ru/pl/api/deals
Content-Type: application/x-www-form-urlencoded

action=add&
secret_key=YOUR_SECRET_KEY&
params[user][email]=buyer@email.com&
params[deal][deal_number]=GC-ORDER-12345&
params[deal][deal_status]=payed&
params[deal][deal_is_paid]=1&
params[deal][payment_type]=otp_bank_credit&
params[deal][payment_status]=paid&
params[deal][deal_comment]=Оплата через ОТП Банк (рассрочка), заявка 123456789
```

---

## Параметры заказа (deal fields)

| Параметр              | Тип       | Описание                             |
| --------------------- | --------- | ------------------------------------ |
| `deal_number`         | string    | Номер заказа в GetCourse             |
| `deal_status`         | string    | Статус заказа (см. ниже)             |
| `deal_is_paid`        | int (0/1) | Оплачен: `1` = да, `0` = нет         |
| `payment_type`        | string    | Тип платежа (произвольная строка)    |
| `payment_status`      | string    | Статус платежа (произвольная строка) |
| `deal_cost`           | number    | Сумма заказа                         |
| `deal_comment`        | string    | Комментарий                          |
| `deal_finished_at`    | string    | Дата оплаты (YYYY-MM-DD HH:MM:SS)    |
| `offer_code`          | string    | Код предложения в GetCourse          |
| `product_title`       | string    | Название продукта                    |
| `product_description` | string    | Описание                             |
| `manager_email`       | string    | Email менеджера                      |
| `deal_created_at`     | string    | Дата создания заказа                 |
| `fields[FIELD_NAME]`  | string    | Дополнительные поля заказа           |

---

## Статусы заказа (deal_status)

| Код                  | Описание           | Когда использовать                                 |
| -------------------- | ------------------ | -------------------------------------------------- |
| `new`                | Новый              | При создании заказа                                |
| `payed`              | Завершён (Оплачен) | ✅ **Использовать при подтверждении от ОТП Банка** |
| `payment_waiting`    | Ожидаем оплаты     | Пока заявка на рассмотрении                        |
| `in_work`            | В работе           | При обработке                                      |
| `part_payed`         | Частично оплачен   | Если есть частичный платёж                         |
| `not_confirmed`      | Не подтверждён     |                                                    |
| `cancelled`          | Отменён            | При отказе от ОТП Банка                            |
| `waiting_for_return` | Ожидаем возврата   |                                                    |
| `false`              | Ложный             |                                                    |

> ⚠️ **Важно:** при изменении статуса на `payed` через API GetCourse автоматически создаёт запись об оплате в заказе — так же, как при передаче `deal_is_paid=1`.

---

## PHP-пример: обновление заказа при webhook ОТП Банка

```php
// Функция обновления статуса заказа в GetCourse
function updateGetCourseOrderStatus(
    string $dealNumber,
    string $buyerEmail,
    string $otpProfileId,
    string $gcAccount,
    string $gcSecretKey
): bool {
    $params = [
        'action' => 'add',
        'secret_key' => $gcSecretKey,
        'params' => [
            'user' => [
                'email' => $buyerEmail,
            ],
            'deal' => [
                'deal_number'    => $dealNumber,
                'deal_status'    => 'payed',
                'deal_is_paid'   => 1,
                'payment_type'   => 'otp_bank_credit',
                'payment_status' => 'paid',
                'deal_comment'   => 'ОТП Банк рассрочка, заявка #' . $otpProfileId,
                'deal_finished_at' => date('Y-m-d H:i:s'),
            ],
        ],
    ];

    $ch = curl_init("https://{$gcAccount}.getcourse.ru/pl/api/deals");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    return $httpCode === 200 && ($result['success'] ?? false);
}
```

---

## JS-пример: обновление через fetch при JS callback

```javascript
// Вызывается из poscreditCheckStatus при approved
async function updateGetCourseAfterOtpApproval(orderId, gcDealNumber) {
  try {
    const response = await fetch('/api/otp-webhook-handler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderId,
        gcDealNumber: gcDealNumber,
        status: 'approved',
        source: 'otp-bank-js-callback'
      })
    })

    const data = await response.json()

    if (data.ok) {
      // Редирект на страницу успешной оплаты GetCourse
      window.location.href = '/order/' + gcDealNumber + '/success'
    } else {
      console.error('Ошибка обновления заказа:', data.error)
    }
  } catch (e) {
    console.error('Сетевая ошибка:', e)
  }
}
```

---

## Полная схема интеграции: ОТП Банк → GetCourse

```
[GetCourse Payment Page]
│
├── JS: poscreditServices.creditProcess({ orderId: gcDealNumber, ... })
│
├── Пользователь заполняет заявку в виджете ОТП Банка
│
├── poscreditCheckStatus({ status: 'approved', orderId: gcDealNumber })
│   ├── JS: POST /api/otp-callback → backend
│   └── backend: updateGetCourseOrderStatus(gcDealNumber, status='payed')
│         → GET https://{account}.getcourse.ru/pl/api/deals
│         → deal_status=payed, deal_is_paid=1
│
└── ИЛИ (Webhook от ОТП Банка)
    ├── POST /api/otp-webhook (от банка)
    ├── Верификация подписи
    ├── Проверка статуса через getLoanApplicationStatus()
    └── updateGetCourseOrderStatus(dealNumber, status='payed')
```

---

## Связь orderId ОТП ↔ gcDealNumber GetCourse

```
Как получить gcDealNumber:
1. GetCourse передаёт номер заказа в URL платёжной страницы
2. JS читает его из URL: new URLSearchParams(window.location.search).get('deal')
3. Передаёт в params.orderId при вызове creditProcess()
4. Получает обратно в poscreditCheckStatus → result.orderId

Хранение для webhook:
При создании SOAP-заявки сохранить:
{
  gcDealNumber: '123456',      // GetCourse deal number
  gcBuyerEmail: 'a@b.com',    // Email покупателя (для user.email)
  otpProfileId: '987654321',   // Из newLoanApplicationShort()
  createdAt: '2026-05-08...'  // Время создания
}
```

---

## Ответ GetCourse API

**Успешный ответ:**

```json
{
  "success": true,
  "error_message": null,
  "result": {
    "deal_id": 1234567,
    "deal_number": "GC-ORDER-12345"
  }
}
```

**Ошибка:**

```json
{
  "success": false,
  "error_message": "Ошибка авторизации"
}
```

---

## Настройка GetCourse: получение API ключа

1. Войти в GetCourse → **Настройки** → **Интеграции**
2. Открыть раздел **API**
3. Скопировать **Секретный ключ API**
4. **Account** — поддомен вашего GetCourse (часть URL до `.getcourse.ru`)

---

## SDK библиотеки

```bash
# PHP SDK от GetCourse
composer require getcourse/php-sdk

# Альтернативный клиент
composer require semivan/getcourse-api-client
```

**GitHub SDK:** https://github.com/getcourse-ru/GetCourse-PHP-SDK  
**GitHub клиент:** https://github.com/semivan/getcourse-api-client
