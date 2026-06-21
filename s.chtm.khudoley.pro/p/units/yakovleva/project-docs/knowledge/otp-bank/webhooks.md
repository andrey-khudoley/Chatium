---
title: 'ОТП Банк — Webhook и уведомления о статусе'
type: reference
tags:
  - topic/otp-bank
  - topic/payments
  - topic/webhook
  - topic/pos-lending
created: 2026-05-08
project: olga-getcourse-payments-c7d5a1
---

# ОТП Банк — Webhook и уведомления о статусе

**Критический пробел:** механизм серверных push-уведомлений ОТП Банка **не раскрыт публично**. Информация ниже основана на открытых источниках и аналогиях с другими POS-кредитными системами. Точный контракт webhook необходимо получать у менеджера банка.

---

## Механизм 1 — JS Callback (b2otp.ru)

**Работает только пока покупатель на странице.**

```javascript
// Определяется ДО вызова creditProcess
function poscreditCheckStatus(result) {
  // Автоматически вызывается банком после завершения заявки

  switch (result.status) {
    case 'approved':
      // Заявка одобрена
      notifyBackend(result.orderId, 'approved')
      break
    case 'rejected':
      // Отказ
      showMessage('Банк отклонил заявку')
      break
    default:
      console.log('Неизвестный статус:', result.status)
  }
}

function notifyBackend(orderId, status) {
  fetch('/api/otp-bank/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status, source: 'otp-bank-js' })
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) window.location.href = '/order/' + orderId + '/success'
    })
}
```

**Ограничения JS callback:**

- Срабатывает только при открытой странице
- Уязвим к закрытию браузера, потере сети
- Не даёт гарантии доставки уведомления в backend
- Для продакшена недостаточен без дополнения серверным механизмом

---

## Механизм 2 — Polling (опрос статуса, b2pos.ru)

Периодический опрос SOAP API для проверки статуса заявки.

```php
// Пример polling-цикла (упрощённо)
$profileId = $loanApplicationClient->newLoanApplicationShort($request);
// Сохранить $profileId в БД рядом с ID заказа

// Cron-задача (например, каждые 30 секунд):
$pendingApplications = db()->query(
    'SELECT profile_id, order_id FROM otp_applications WHERE status = "pending"'
);

foreach ($pendingApplications as $app) {
    $statusResponse = $loanApplicationClient->getLoanApplicationStatus($app->profile_id);

    if ($statusResponse->isApproved()) {
        updateGetCourseOrderStatus($app->order_id, 'paid');
        db()->update('otp_applications', ['status' => 'approved'], $app->profile_id);
    } elseif ($statusResponse->isRejected()) {
        db()->update('otp_applications', ['status' => 'rejected'], $app->profile_id);
    }
}
```

**Плюсы polling:**

- Работает независимо от клиентской части
- Надёжен — не зависит от браузера покупателя

**Минусы:**

- Задержка обновления (время между опросами)
- Нагрузка на API (частые запросы к банку)
- Банк может ограничить rate-limit

---

## Механизм 3 — Серверный Webhook (Push, b2pos.ru)

> ⚠️ **Требует уточнения у банка.** Конкретный контракт не опубликован.

Предположительный механизм по аналогии с другими POS-кредитными системами:

### Регистрация URL

При подключении к сервису менеджер банка регистрирует URL вашего endpoint:

```
https://your-site.ru/api/otp-bank/webhook
```

### Формат входящего webhook (предположительный)

Банк отправляет POST-запрос при изменении статуса заявки:

```http
POST /api/otp-bank/webhook HTTP/1.1
Content-Type: application/json

{
  "profileId": "123456789",
  "orderId": "getcourse-order-789",
  "status": "approved",
  "timestamp": "2026-05-08T10:30:00Z"
}
```

### Обработчик webhook (backend)

```php
// /api/otp-bank/webhook
$payload = json_decode(file_get_contents('php://input'), true);

// 1. Верификация подлинности (уточнить у банка: подпись, IP-whitelist или токен)
if (!verifyOtpSignature($payload, $_SERVER['HTTP_X_OTP_SIGNATURE'])) {
    http_response_code(403);
    die('Invalid signature');
}

// 2. Проверить статус через SOAP API (для защиты от фальсификации)
$actualStatus = $loanApplicationClient->getLoanApplicationStatus($payload['profileId']);

// 3. Обновить заказ в GetCourse
if ($actualStatus->isApproved()) {
    updateGetCourseOrder($payload['orderId'], 'paid');
}

// 4. Ответить 200 OK
http_response_code(200);
echo json_encode(['ok' => true]);
```

---

## Статусы заявки

### JS callback (result.status — строки, уточнить у банка)

| Значение   | Описание                       |
| ---------- | ------------------------------ |
| `approved` | Заявка одобрена                |
| `rejected` | Отказ банка                    |
| _другие_   | Уточнить полный список у банка |

### SOAP API — BankDecision enum (числовые коды)

Из исходного кода [BankDecision.php](https://github.com/VantaFinance/b2pos-soap-client/blob/main/src/Client/LoanApplication/Struct/BankDecision.php):

| Код  | Константа                               | Описание            | Действие                 |
| ---- | --------------------------------------- | ------------------- | ------------------------ |
| `-1` | `IN_PROCESSING`                         | На рассмотрении     | Продолжить polling       |
| `0`  | `DENIED`                                | Отказ банка         | Предложить альтернативу  |
| `1`  | `APPROVED`                              | ✅ **Одобрено**     | Обновить заказ → `payed` |
| `2`  | `ERROR`                                 | Ошибка              | Логировать, уведомить    |
| `4`  | `REQUIRED_ADDITIONAL_FILLING_OUT`       | Нужны доп. данные   | Уведомить покупателя     |
| `5`  | `REQUIRED_CORRECTION_DATA_OR_DOCUMENTS` | Нужна корректировка | Уведомить покупателя     |

> Поле `decision` в объекте `ResultFromBank` — один результат на каждый банк-партнёр (b2pos отправляет заявку сразу в несколько банков). Одобрение хотя бы одного — успех.

---

## Рекомендуемая архитектура для GetCourse

```
[Покупатель]
     │
     │ 1. Открывает страницу оплаты GetCourse
     ▼
[GetCourse Payment Page]
     │
     │ 2. JS: poscreditServices.creditProcess(params)
     │     ↳ Виджет ОТП Банка
     │     ↳ Покупатель заполняет заявку
     │     ↳ poscreditCheckStatus(result) → POST /webhook (быстро)
     │
     │ 3. Backend сохраняет profileId + orderId в БД
     │
     │ 4. Параллельно: Polling каждые 30 сек (до 10 минут)
     │    ИЛИ: ОТП Банк шлёт Push webhook на backend
     │
     │ 5. При status=approved:
     │    → GetCourse API: обновить статус заказа на "оплачен"
     │    → Отправить покупателю письмо/доступ к курсу
     ▼
[GetCourse CRM]
     └── Заказ: статус "оплачен" ✓
```

---

## Верификация подписи webhook

Точный механизм не раскрыт публично. Возможные варианты (уточнить у банка):

```php
// Вариант 1: HMAC-подпись
function verifyOtpSignature(array $payload, string $signature): bool {
    $secret = env('OTP_WEBHOOK_SECRET');
    $expected = hash_hmac('sha256', json_encode($payload), $secret);
    return hash_equals($expected, $signature);
}

// Вариант 2: IP whitelist
function verifyOtpIp(): bool {
    $allowedIps = ['185.X.X.X', '195.X.X.X']; // IP банка — уточнить
    return in_array($_SERVER['REMOTE_ADDR'], $allowedIps);
}

// Вариант 3: Статический токен в заголовке
function verifyOtpToken(): bool {
    return $_SERVER['HTTP_X_API_TOKEN'] === env('OTP_WEBHOOK_TOKEN');
}

// Рекомендация: всегда верифицировать через getLoanApplicationStatus()
// даже если подпись верна — защита от replay-атак
```

---

## Открытые вопросы по webhook

- [ ] Есть ли серверный push-webhook или только polling?
- [ ] Точный формат POST-запроса (поля, типы)
- [ ] Механизм верификации (подпись / токен / IP whitelist)
- [ ] IP-адреса ОТП Банка для whitelist
- [ ] Таймаут: через сколько банк прекращает повторные попытки доставки
- [ ] Политика retry при недоступности endpoint
- [ ] Нужно ли возвращать конкретный формат ответа (как в некоторых системах: `OK{orderId}`)
