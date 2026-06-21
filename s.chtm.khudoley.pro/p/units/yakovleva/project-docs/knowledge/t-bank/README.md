---
title: 'Т-Банк Интернет-Эквайринг — Индекс'
type: reference
tags:
  - topic/t-bank
  - topic/payments
  - topic/api
  - topic/acquiring
created: 2026-05-08
---

# Т-Банк Интернет-Эквайринг

Платёжный шлюз Т-Банка для приёма онлайн-платежей. Поддерживает картовые платежи, СБП, Т-Пей, рассрочку.

## Содержание раздела

| Файл                                | Что внутри                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| [api-contracts](api-contracts.md)   | Контракты методов: Init, GetState, Cancel, Confirm. Запросы/ответы, поля, токен |
| [webhooks](webhooks.md)             | Формат webhook-уведомлений, статусы, жизненный цикл, верификация                |
| [js-integration](js-integration.md) | JS-скрипт интеграции: paymentStartCallback, виджет, iframe, тестовые данные     |
| [receipt-fz54](receipt-fz54.md)     | Структура объекта Receipt для ФЗ-54: Items, Tax, PaymentMethod, PaymentObject   |
| [error-codes](error-codes.md)       | Коды ошибок API                                                                 |

## Ключевые ссылки на документацию

- [Портал разработчика Т-Банк (T-Bank Dev Portal)](https://developer.tbank.ru/eacq/intro)
- [Способы интеграции](https://developer.tbank.ru/eacq/intro/connection)
- [Скрипт интеграции JS](https://developer.tbank.ru/eacq/intro/developer/setup_js/)
- [Уведомления об операциях (webhooks)](https://developer.tbank.ru/eacq/intro/developer/notification)
- [Метод Init — описание](https://www.tinkoff.ru/kassa/develop/api/payments/init-description/)
- [Метод Init — запрос](https://www.tinkoff.ru/kassa/develop/api/payments/init-request/)
- [Метод Init — ответ](https://www.tinkoff.ru/kassa/develop/api/payments/init-response/)
- [Метод GetState — описание](https://www.tinkoff.ru/kassa/develop/api/payments/getstate-description/)
- [Нотификации (старый домен)](https://www.tinkoff.ru/kassa/develop/api/notifications/)
- [Коды ошибок EACQ](https://www.tinkoff.ru/kassa/develop/api/errorslist/)
- [Инструкция по JS-скрипту интеграции](https://www.tbank.ru/kassa/dev/integrationjs/)
- [Инструкция по виджету](https://www.tbank.ru/kassa/dev/widget/index.html)
- [Примеры на PHP](https://www.tinkoff.ru/kassa/develop/api/examples/)

## Среды

| Среда    | Base URL                               |
| -------- | -------------------------------------- |
| Тест     | `https://rest-api-test.tinkoff.ru/v2/` |
| Продакшн | `https://securepay.tinkoff.ru/v2/`     |

Тестовый TerminalKey начинается с `TinkoffBankTest`.

## Связанные проекты

- [Бриф проекта](../../brief.md)
