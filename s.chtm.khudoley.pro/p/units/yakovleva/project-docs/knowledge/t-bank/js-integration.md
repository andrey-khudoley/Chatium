---
title: 'Т-Банк Эквайринг — JS интеграция'
type: reference
tags:
  - topic/t-bank
  - topic/payments
  - topic/javascript
created: 2026-05-08
---

# Т-Банк Эквайринг — JS интеграция

## Два подхода к JS-интеграции

| Подход                             | Что это                                                                         | Когда использовать                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Integration.js (рекомендуемый)** | Скрипт, встраивающий виджет с кнопками оплаты + открывает форму в iframe/модале | Когда хочется кнопки «Оплатить картой», «T-Pay», «СБП» прямо на странице |
| **Прямой редирект**                | Backend вызывает Init, frontend получает `PaymentURL` и делает редирект         | Кастомный UI, GetCourse custom JS, максимальный контроль                 |

---

## Вариант 1: Integration.js (виджет)

### Подключение скрипта

```html
<script src="https://integrationjs.tbank.ru/integration.js"></script>
```

> Сайт должен работать по **HTTPS**.

### Базовая конфигурация

```javascript
const widget = new TinkoffPay({
  terminalKey: 'ВАШ_TERMINAL_KEY',
  product: 'eacq',
  features: {
    payment: {
      // Callback вызывается при нажатии кнопки "Оплатить"
      paymentStartCallback: async (orderId) => {
        // Вызываем ваш backend, который дёргает v2/Init у Т-Банка
        const response = await fetch('/api/payment/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        })
        const data = await response.json()
        // Возвращаем PaymentURL — виджет откроет его в iframe/модале
        return data.paymentUrl
      }
    }
  }
})

widget.render('#payment-container')
```

### Схема работы с paymentStartCallback

```
Пользователь нажимает кнопку "Оплатить"
        ↓
paymentStartCallback(orderId) вызывается
        ↓
Frontend → POST /api/payment/init (ваш backend)
        ↓
Backend → POST v2/Init (Т-Банк)
        ↓
Т-Банк возвращает { PaymentURL: "https://securepayments.tinkoff.ru/xxx" }
        ↓
Backend → Frontend: { paymentUrl: "..." }
        ↓
paymentStartCallback резолвит Promise с paymentUrl
        ↓
Виджет открывает PaymentURL в iframe/модале
        ↓
Покупатель вводит данные карты
        ↓
Т-Банк отправляет webhook на NotificationURL
        ↓
Backend обновляет статус заказа в CRM
```

### Важные особенности Integration.js

- Функция `paymentStartCallback` должна возвращать **Promise\<string\>**, где string — это `PaymentURL`.
- Виджет сам управляет открытием iframe/модала.
- В `iframe` есть ограничения на мобильных устройствах (не гарантируется корректная работа).
- После успешной оплаты виджет закрывается автоматически.

---

## Вариант 2: Прямой редирект (для GetCourse custom JS)

Это более подходящий сценарий для кастомной платёжной страницы GetCourse, где JS собирает данные и управляет UI.

### Архитектура

```
Платёжная страница GetCourse (JS)
        ↓ (пользователь выбрал способ оплаты «Т-Банк», нажал «Оплатить»)
        ↓
JS → POST /api/payment/tbank/init (ваш backend-эндпоинт)
  body: { orderId, amount, email, ... }
        ↓
Backend → POST https://securepay.tinkoff.ru/v2/Init
  body: { TerminalKey, Amount, OrderId, NotificationURL, Token, ... }
        ↓
Т-Банк → { PaymentURL: "https://securepayments.tinkoff.ru/xxx" }
        ↓
Backend → JS: { paymentUrl: "..." }
        ↓
JS делает: window.location.href = paymentUrl
        (или открывает в новом окне)
        ↓
Покупатель проходит оплату на форме Т-Банка
        ↓
Т-Банк редиректит на SuccessURL или FailURL
        +
Т-Банк отправляет webhook → backend обновляет статус заказа в GC
```

### Пример JS на странице GetCourse

```javascript
// Вешаем на кнопку "Оплатить через Т-Банк"
document.getElementById('pay-tbank').addEventListener('click', async () => {
  const orderId = getOrderId() // из GetCourse context
  const amount = getOrderAmount() // в копейках

  const btn = document.getElementById('pay-tbank')
  btn.disabled = true
  btn.textContent = 'Подождите...'

  try {
    const res = await fetch('/api/payment/tbank/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount })
    })

    if (!res.ok) throw new Error('Ошибка сервера')

    const { paymentUrl, error } = await res.json()

    if (error || !paymentUrl) {
      alert('Не удалось создать платёж: ' + (error || 'неизвестная ошибка'))
      return
    }

    // Редиректим на форму Т-Банка
    window.location.href = paymentUrl
  } catch (e) {
    console.error(e)
    alert('Ошибка при создании платежа')
  } finally {
    btn.disabled = false
    btn.textContent = 'Оплатить через Т-Банк'
  }
})
```

### Пример backend-эндпоинта (Node.js / Express)

```javascript
app.post('/api/payment/tbank/init', async (req, res) => {
  const { orderId, amount } = req.body

  const params = {
    TerminalKey: process.env.TBANK_TERMINAL_KEY,
    Amount: amount, // в копейках
    OrderId: orderId,
    Description: `Заказ ${orderId}`,
    NotificationURL: `${BASE_URL}/webhook/tbank`,
    SuccessURL: `${BASE_URL}/payment/success?orderId=${orderId}`,
    FailURL: `${BASE_URL}/payment/fail?orderId=${orderId}`
  }

  params.Token = generateToken(params, process.env.TBANK_PASSWORD)

  const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  const data = await response.json()

  if (!data.Success) {
    return res.json({ error: data.Message || 'Init failed' })
  }

  res.json({ paymentUrl: data.PaymentURL })
})

function generateToken(params, password) {
  const filtered = { ...params }
  // Убираем вложенные объекты (Receipt, DATA) — они не входят в токен
  delete filtered.Receipt
  delete filtered.DATA
  filtered.Password = password

  const sorted = Object.keys(filtered).sort()
  const str = sorted.map((k) => filtered[k]).join('')

  const crypto = require('crypto')
  return crypto.createHash('sha256').update(str).digest('hex')
}
```

---

## Тестовые данные

**Тестовый TerminalKey:** `TinkoffBankTest`  
**Тестовый Password:** `TinkoffBankTest`  
**Тестовый URL:** `https://rest-api-test.tinkoff.ru/v2/`

### Тестовые карты (основные)

| Номер карты        | Результат        |
| ------------------ | ---------------- |
| `4300000000000777` | Успешная оплата  |
| `4300000000000885` | Отклонена банком |

CVV: любые 3 цифры. Срок: любой в будущем.

> ⚠️ Полный список тестовых карт (включая 3DS-сценарии, «недостаточно средств», «карта заблокирована») — на официальной странице:  
> [Тестовая среда — T-Bank Dev Portal](https://developer.tbank.ru/eacq/intro/errors/test)  
> [Тест-кейсы — T-Bank Dev Portal](https://developer.tbank.ru/eacq/intro/errors/test-cases)

### Как тестировать через DEMO-терминал

1. В ЛК интернет-эквайринга: Магазины → Терминалы → вкладка «Тестовый» → Тест.
2. Выбрать тест-кейс (успешная оплата, 3DS, отказ и т.д.) — система покажет нужные данные карты.
3. Для DEMO-терминала запросы идут на **продакшн-URL** `https://securepay.tinkoff.ru/v2/` с TerminalKey вида `DEMO_...`.

---

## Ограничения iframe в GetCourse

Кастомная страница оплаты в GetCourse рендерится как страница сайта (не iframe). Однако JS-код может работать в контексте ограничений:

### Как работает страница оплаты в GetCourse

GetCourse строит системную страницу оплаты, куда можно добавить кастомный HTML/JS-блок. Эта страница **не является** iframe — это полноценная страница. Поэтому `window.location.href = paymentUrl` работает нормально.

### Если форма оказывается в iframe (например, виджет GetCourse на стороннем сайте)

Тогда возникают ограничения атрибута `sandbox`:

| Сценарий                                      | Что делать                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| iframe без `sandbox`                          | `window.top.location.href = paymentUrl` — навигирует родителя             |
| iframe с `sandbox="allow-top-navigation"`     | `window.top.location.href` работает                                       |
| iframe с `sandbox` без `allow-top-navigation` | `window.top` заблокирован — только `window.open(paymentUrl, '_blank')`    |
| iOS Safari + iframe + 3DS                     | 3DS-редирект внутри iframe может не работать; рекомендуется `window.open` |

### Рекомендуемая стратегия для GetCourse

```javascript
function redirectToPayment(paymentUrl) {
  try {
    // Пробуем навигировать родительский фрейм (если есть)
    if (window.top && window.top !== window) {
      window.top.location.href = paymentUrl
    } else {
      // Мы не в iframe — стандартный редирект
      window.location.href = paymentUrl
    }
  } catch (e) {
    // SecurityError — iframe заблокировал top navigation
    // Открываем в новой вкладке как fallback
    window.open(paymentUrl, '_blank')
  }
}
```

### Встраивание формы Т-Банка в iframe — не рекомендуется

Нельзя встроить `PaymentURL` в `<iframe src="...">` на вашей странице:

- Т-Банк выставляет заголовок `X-Frame-Options: SAMEORIGIN` или CSP `frame-ancestors 'self'`.
- Это значит, что форма Т-Банка откажется загружаться в чужом iframe.
- Единственный способ — редирект или новое окно.

---

## Ссылки

- [Скрипт интеграции (новый портал)](https://developer.tbank.ru/eacq/intro/developer/setup_js/)
- [Инструкция по настройке скрипта Integration.js](https://www.tbank.ru/kassa/dev/integrationjs/)
- [Инструкция по виджету (старая документация)](https://www.tbank.ru/kassa/dev/widget/index.html)
- [Кнопки быстрой оплаты (T-Pay, СБП)](https://developer.tbank.ru/eacq/intro/developer/setup_js/setup_speedpay/)
- [npm: @jfkz/tinkoff-payment-sdk (TypeScript)](https://www.npmjs.com/package/@jfkz/tinkoff-payment-sdk)
- [npm: @codex-team/tinkoff-api (Node.js)](https://github.com/codex-team/tinkoff-api)
