---
title: 'LifePay — JS интеграция для GetCourse'
type: reference
tags:
  - topic/lifepay
  - topic/payments
  - topic/javascript
  - topic/getcourse
created: 2026-05-08
updated: 2026-05-08
---

# LifePay — JS интеграция для GetCourse

## Три варианта реализации

| Вариант                                  | API                                         | Кабинет            | Когда применять                                                                        |
| ---------------------------------------- | ------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| **A. Редирект через ECOM**               | `api-ecom.life-pay.ru/v1/invoices/`         | `home.life-pay.ru` | Эквайринг подключён, нужны карты + СБП + Yandex/Mir Pay в одном API                    |
| **B. СБП-ссылка через старый API**       | `api.life-pay.ru/v1/bill` (`method: "sbp"`) | `my.life-pay.ru`   | Эквайринг не подключён, достаточно только СБП. Работает поверх облачной фискализации   |
| **C. Embedded SDK** (`LIFEPAY.checkout`) | ECOM SDK                                    | `home.life-pay.ru` | Встроенная форма прямо на странице с 3DS iframe. Сложнее, под GetCourse редко оправдан |

Развилка по кабинетам и API в [cabinets](cabinets.md). Под текущий статус проекта Ольги (эквайринг ждёт инженеров LifePay) рабочих сценария два: A или B. C обычно не нужен из-за iframe-ограничений GetCourse.

---

## Архитектура варианта A. Редирект через ECOM API

```
Платёжная страница GetCourse
  JS собирает: order_id, amount, name, email, phone
        ↓
  JS → POST /api/payment/lifepay/init (ваш backend)
        ↓
  Backend:
    1. POST https://api-ecom.life-pay.ru/v1/auth  → JWT token (TTL 3 ч.)
    2. POST https://api-ecom.life-pay.ru/v1/invoices/  → { form_link: "..." }
        ↓
  Backend → JS: { formLink: "https://oplata.life-pay.ru/pay/..." }
        ↓
  JS: window.location.href = formLink
        ↓
  Покупатель оплачивает на странице LifePay
        ↓
  LifePay → POST webhook → ваш backend
    Проверить check (MD5), сравнить order_id
    resultStr == "транзакция оплачена полностью" → обновить заказ в GetCourse CRM
        ↓
  LifePay редиректит покупателя на url_success
```

> ⚠️ **Никогда не авторизуйтесь в LifePay из браузера.** `api_key` и `service_id` хранятся только на backend.

---

## Пример JS на странице GetCourse

```javascript
// Вешаем обработчик на кнопку "Оплатить через LifePay"
document.getElementById('pay-lifepay').addEventListener('click', async () => {
  // Получаем данные заказа из контекста GetCourse
  const orderId = getOrderId() // например, из data-атрибута или GC JS API
  const amount = getOrderAmount() // в рублях (float)
  const email = getCustomerEmail()
  const phone = getCustomerPhone()
  const name = getCustomerName()

  const btn = document.getElementById('pay-lifepay')
  btn.disabled = true
  btn.textContent = 'Создаём платёж...'

  try {
    const res = await fetch('/api/payment/lifepay/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount, email, phone, name })
    })

    if (!res.ok) throw new Error('Ошибка сервера: ' + res.status)

    const { formLink, error } = await res.json()

    if (error || !formLink) {
      alert('Не удалось создать платёж: ' + (error || 'неизвестная ошибка'))
      return
    }

    // Редиректим покупателя на страницу оплаты LifePay
    redirectToPayment(formLink)
  } catch (e) {
    console.error('LifePay init error:', e)
    alert('Ошибка при создании платежа. Попробуйте ещё раз.')
  } finally {
    btn.disabled = false
    btn.textContent = 'Оплатить через LifePay'
  }
})

function redirectToPayment(url) {
  try {
    if (window.top && window.top !== window) {
      // Мы в iframe — навигируем родительский фрейм
      window.top.location.href = url
    } else {
      window.location.href = url
    }
  } catch (e) {
    // SecurityError — iframe заблокировал top navigation
    window.open(url, '_blank')
  }
}
```

---

## Пример backend-эндпоинта (Node.js / Express)

```javascript
const crypto = require('crypto')

// Кеш токена (чтобы не авторизоваться на каждый запрос)
let tokenCache = { token: null, expiresAt: 0 }

async function getLifepayToken() {
  const now = Date.now()
  // Обновляем токен за 5 минут до истечения (TTL = 3 ч = 10800 сек)
  if (tokenCache.token && tokenCache.expiresAt - now > 5 * 60 * 1000) {
    return tokenCache.token
  }

  const res = await fetch('https://api-ecom.life-pay.ru/v1/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.LIFEPAY_SERVICE_ID,
      api_key: process.env.LIFEPAY_API_KEY
    })
  })

  const data = await res.json()
  tokenCache = {
    token: data.token,
    expiresAt: now + 10800 * 1000 // 3 часа
  }
  return data.token
}

app.post('/api/payment/lifepay/init', async (req, res) => {
  const { orderId, amount, email, phone, name } = req.body

  try {
    const token = await getLifepayToken()

    const invoiceRes = await fetch('https://api-ecom.life-pay.ru/v1/invoices/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: parseFloat(amount),
        currency_code: 'RUB',
        service_id: process.env.LIFEPAY_SERVICE_ID,
        name: name,
        email: email,
        phone: phone,
        url_success: `${process.env.BASE_URL}/payment/success?orderId=${orderId}`,
        url_error: `${process.env.BASE_URL}/payment/error?orderId=${orderId}`,
        expire_date: getExpireDate(24), // срок 24 часа
        comment: `GC order ${orderId}`
      })
    })

    const invoice = await invoiceRes.json()

    if (!invoice.form_link) {
      console.error('LifePay invoice error:', invoice)
      return res.json({ error: 'Не удалось создать invoice' })
    }

    res.json({ formLink: invoice.form_link })
  } catch (e) {
    console.error('LifePay init error:', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

function getExpireDate(hoursFromNow) {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}
```

---

## Пример обработчика webhook (Node.js)

```javascript
const crypto = require('crypto')

app.post('/webhook/lifepay', (req, res) => {
  // Сразу возвращаем 200 — иначе LifePay будет повторять
  res.status(200).send('OK')

  const params = { ...req.body }

  // Верификация подписи
  const receivedCheck = params.check
  delete params.check
  const str = Object.values(params).join('') + process.env.LIFEPAY_SECRET_KEY
  const expectedCheck = crypto.createHash('md5').update(str).digest('hex')

  if (receivedCheck !== expectedCheck) {
    console.warn('LifePay webhook: invalid signature')
    return
  }

  const { order_id, resultStr, cost, tid } = params

  if (resultStr === 'транзакция оплачена полностью') {
    // Обновляем статус заказа в GetCourse CRM
    updateOrderStatusInCRM(order_id, 'paid', { tid, cost })
  } else {
    console.log(`LifePay webhook: order ${order_id} status: ${resultStr}`)
  }
})
```

---

## Архитектура варианта B. СБП-ссылка через старый API

```
Платёжная страница GetCourse
  JS собирает: order_id, amount, email, phone
        ↓
  JS → POST /api/payment/lifepay-sbp/init (ваш backend)
        ↓
  Backend:
    POST https://api.life-pay.ru/v1/bill
    {
      apikey, login, amount, customer_email, customer_phone,
      method: "sbp",
      description: "Курс ...",
      callback_url: "https://school.ru/webhook/lifepay-sbp",
      order: { number: "order_12345" }
    }
        ↓
  Ответ:
    {
      number: "lp_bill_id",
      paymentUrl: "https://qr.nspk.ru/...",
      paymentUrlWeb: "https://web.qr.nspk.ru/..."
    }
        ↓
  Backend → JS: { qrUrl, webUrl, billNumber }
        ↓
  JS:
    desktop → показать QR-код на основе qrUrl + кнопку «Открыть в банке»
    mobile  → window.location.href = qrUrl (открытие банковского приложения по deeplink)
        ↓
  Покупатель оплачивает в своём банке через СБП
        ↓
  LifePay → POST webhook (формат /notification/) на ваш backend
    Сопоставить по number, проверить MD5-подпись, статус оплаты
        ↓
  При status = успех:
    1. Чек уйдёт автоматически из my.life-pay.ru (если в ЛК настроена автофискализация)
    2. Backend → GetCourse Sales API: deal_status = paid
```

> ⚠️ Параметры для ответа на /v1/bill, точные имена полей webhook (`status`, `result`, `resultStr`) и поведение автофискализации зависят от настроек в `my.life-pay.ru`. Перед интеграцией проверить на реальном тестовом счёте через `customer_email = ваш email` и сохранить актуальный пример webhook в `webhooks.md`.

### Пример backend-эндпоинта (Node.js / Express, вариант B)

```javascript
app.post('/api/payment/lifepay-sbp/init', async (req, res) => {
  const { orderId, amount, email, phone } = req.body

  try {
    const response = await fetch('https://api.life-pay.ru/v1/bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.LIFEPAY_APIKEY,
        login: process.env.LIFEPAY_LOGIN,
        amount: parseFloat(amount),
        customer_email: email,
        customer_phone: phone || null,
        method: 'sbp',
        description: `GetCourse order ${orderId}`,
        callback_url: `${process.env.BASE_URL}/webhook/lifepay-sbp`,
        order: { number: orderId }
      })
    })

    const data = await response.json()

    if (!data.paymentUrl) {
      console.error('LifePay /v1/bill error:', data)
      return res.json({ error: 'Не удалось создать СБП-ссылку' })
    }

    res.json({
      qrUrl: data.paymentUrl, // qr.nspk.ru
      webUrl: data.paymentUrlWeb, // web.qr.nspk.ru
      billNumber: data.number
    })
  } catch (e) {
    console.error('LifePay-SBP init error:', e)
    res.status(500).json({ error: 'Internal error' })
  }
})
```

### Пример отрисовки QR на странице (вариант B)

```javascript
async function startSbpPayment(orderData) {
  const res = await fetch('/api/payment/lifepay-sbp/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
  const { qrUrl, webUrl } = await res.json()

  if (isMobile()) {
    // На мобильном открываем СБП-ссылку напрямую
    window.location.href = qrUrl
  } else {
    // На десктопе показываем QR-код + кнопку «Оплатить в браузере»
    renderQrCode(qrUrl, '#sbp-qr-canvas') // например, через qrcode.js
    document.getElementById('sbp-web-btn').href = webUrl
    document.getElementById('sbp-modal').classList.add('open')
  }
}

function isMobile() {
  return /Android|iPhone|iPad/i.test(navigator.userAgent)
}
```

---

## Сравнение A vs B для проекта Ольги

| Параметр              | A. ECOM                                          | B. /v1/bill (СБП)                                     |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| Способы оплаты        | Карты, СБП, Mir Pay, Yandex Pay                  | Только СБП                                            |
| Подключение           | Заявка на эквайринг через `home.life-pay.ru`     | Включено по умолчанию при облачной кассе              |
| Авторизация           | JWT (TTL 3 ч., кешировать)                       | `apikey + login` в каждом запросе                     |
| Передача суммы        | в `amount`                                       | в `amount`                                            |
| Сопоставление webhook | по `order_id`                                    | по `number` (LifePay) или `order.number` (внутренний) |
| Фискализация          | Через `send_receipt_through` или Cloud Print API | Автоматически при настройке в ЛК (одна позиция)       |
| UX оплаты             | Хостед-форма LifePay                             | QR на сайте + deeplink на мобильном                   |

Решение фиксируется в [ADR проекта](D:\Users\andrey\Documents\Obsidian\main\03_Projects\active\olga-getcourse-payments-c7d5a1\docs\decisions\) после ответа инженеров LifePay по комиссиям эквайринга.

---

## Тестирование

**Тестовый сервис** включён по умолчанию, отдельный `service_id` в ЛК.  
**Тестовый ЛК:** `my-dev.life-pos.ru`

Для переключения тест/прод — передавать нужный `service_id` при создании invoice.

### Тестовые карты

Таблица с конкретными номерами, CVV и датами:  
🔗 **https://docs.life-pos.ru/ipsp/get_started/testing**

Доступные сценарии:

- Успешная оплата без 3DS
- Успешная оплата с 3DS v2.0
- Отказ (недостаточно средств)
- Отказ (карта отклонена банком)

> В тестовом режиме доступны только картовые платежи. СБП, Yandex Pay, Mir Pay — не тестируются.

---

## Ссылки

- [ECOM Checkout SDK](https://docs.life-pos.ru/ipsp/ecom_checkout)
- [Тестовые платежи](https://docs.life-pos.ru/ipsp/get_started/testing)
- [Быстрый старт IPSP](https://docs.life-pos.ru/ipsp/get_started/quickstart)
- [Банковские карты](https://docs.life-pos.ru/ipsp/configure_payment_way/payment_methods/bank_card)
