---
title: 'ОТП Банк — JS-интеграция (b2otp.ru)'
type: reference
tags:
  - topic/otp-bank
  - topic/payments
  - topic/javascript
  - topic/pos-lending
created: 2026-05-08
project: olga-getcourse-payments-c7d5a1
---

# ОТП Банк — JS-интеграция (b2otp.ru)

**Документация:** https://api.b2otp.ru/shop/manual/

Фронтенд-интеграция через подключаемый JS-скрипт. Виджет ОТП Банка открывается прямо на странице магазина, покупатель заполняет заявку, подписывает СМС-кодом.

---

## Подключение скрипта

```html
<head>
  <!-- accessID — идентификатор магазина, получается от банка -->
  <script src="https://api.b2otp.ru/shop/js/[accessID].js"></script>
</head>
```

`accessID` выдаётся менеджером ОТП Банка при подключении к сервису. Без него скрипт не работает.

---

## Инициализация заявки на кредит

После подключения скрипта становится доступен глобальный объект `poscreditServices`.

```javascript
// Шаг 1: Определить callback ДО вызова creditProcess
function poscreditCheckStatus(result) {
  // Вызывается автоматически после завершения заявки
  // result.status — строка с результатом
  // result.orderId — ID заказа, переданный в params
  console.log('Статус заявки:', result.status, 'Заказ:', result.orderId)
}

// Шаг 2: Сформировать данные заказа
var products = [
  {
    name: 'Название курса / товара',
    price: 50000, // уточнить единицы у банка: рубли или копейки
    quantity: 1,
    article: 'COURSE-001'
  }
]

var params = {
  orderId: 'order_12345', // ваш внутренний ID заказа (строка)
  totalAmount: 50000, // полная сумма заказа
  products: products
  // Возможно дополнительные поля — уточнить в документации
}

// Шаг 3: Запустить процесс кредитования
poscreditServices.creditProcess(params)
// → открывается виджет ОТП Банка
// → покупатель заполняет данные
// → при завершении вызывается poscreditCheckStatus(result)
```

---

## Callback poscreditCheckStatus

```javascript
function poscreditCheckStatus(result) {
  if (result.status === 'approved') {
    // Заявка одобрена → обновить статус заказа
    // Отправить запрос в GetCourse API для обновления платежа
    fetch('/api/update-order', {
      method: 'POST',
      body: JSON.stringify({
        orderId: result.orderId,
        status: 'paid',
        source: 'otp-bank'
      })
    })
  } else if (result.status === 'rejected') {
    // Отказ → показать сообщение покупателю
    alert('К сожалению, банк не одобрил заявку.')
  }
  // Полный список статусов — уточнить у банка
}
```

> ⚠️ **Ограничение:** callback срабатывает только пока покупатель на странице. Для надёжного обновления статуса в GetCourse нужен дополнительный серверный механизм — см. [webhooks](webhooks.md).

---

## Кредитный калькулятор (опционально)

Можно встроить калькулятор рассрочки на страницу товара. Покупатель видит ежемесячный платёж ещё до оформления заявки.

```javascript
// Отрисовывает таблицу ежемесячных платежей
poscreditServices.showCalculator({
  amount: 50000, // сумма покупки
  containerId: 'otp-calc' // id div-контейнера
})
```

```html
<div id="otp-calc"></div>
```

---

## Сценарий интеграции в GetCourse

```
[Страница оплаты GetCourse]
│
├── 1. Страница загружается
│      ↳ подключён скрипт api.b2otp.ru/shop/js/[accessID].js
│      ↳ определена функция poscreditCheckStatus
│
├── 2. Покупатель нажимает "Оплатить в рассрочку"
│      ↳ JS вызывает poscreditServices.creditProcess(params)
│      ↳ params содержит orderId из GetCourse + данные корзины
│
├── 3. ОТП Банк отображает виджет
│      ↳ покупатель вводит ФИО, паспорт, телефон (в виджете)
│      ↳ банк принимает решение в реальном времени
│      ↳ покупатель подписывает договор через СМС
│
└── 4. Завершение
       ↳ poscreditCheckStatus(result) вызывается автоматически
       ↳ при result.status === 'approved' → POST на backend
       ↳ backend вызывает GetCourse API → статус заказа "оплачен"
```

---

## Важные нюансы

- Скрипт требует HTTPS на странице магазина
- Виджет открывается в iframe или overlay поверх страницы — может конфликтовать с кастомным дизайном GetCourse
- Покупатель заполняет личные данные в виджете ОТП Банка (не на странице магазина) — это снижает ответственность магазина за обработку ПДн
- Надёжное обновление статуса в GetCourse лучше строить через серверный callback, а не только через JS

---

## Что уточнить у банка по JS-интеграции

- [ ] Точная структура объекта `params` для `creditProcess()`
- [ ] Единицы сумм: рубли или копейки
- [ ] Полный список полей `result` в `poscreditCheckStatus`
- [ ] Все возможные значения `result.status`
- [ ] Есть ли дополнительные события (таймаут, закрытие виджета без ответа)
- [ ] Можно ли кастомизировать внешний вид виджета
