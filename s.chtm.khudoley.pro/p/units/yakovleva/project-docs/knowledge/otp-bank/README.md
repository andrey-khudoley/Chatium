---
title: 'ОТП Банк — POS-кредитование — Индекс'
type: reference
tags:
  - topic/otp-bank
  - topic/payments
  - topic/api
  - topic/pos-lending
  - topic/installment
created: 2026-05-08
project: olga-getcourse-payments-c7d5a1
---

# ОТП Банк — POS-кредитование для интернет-магазинов

> ℹ️ **Справочный материал, вне скоупа текущего проекта.** Автоматизация ОТП → GetCourse в проекте «GetCourse платежи (Яковлева)» **не ведётся** — нет ни спецификации, ни ADR, ни кода. Этот раздел собран как knowledge на случай, если трек откроют отдельным договором/эпиком. Контекст — [бриф проекта](../../brief.md).

Система POS-кредитования ОТП Банка позволяет покупателям оформить рассрочку или кредит прямо на странице оплаты интернет-магазина. Банк одобряет заявку в реальном времени, деньги поступают магазину, покупатель платит банку частями.

**Это НЕ карточный эквайринг** — это потребительское кредитование на точке продажи (POS). Клиент Ольга Шавковская имеет действующий договор с ОТП Банком на этот продукт.

## Содержание раздела

| Файл                                                | Что внутри                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [js-integration](js-integration.md)                 | JS-виджет b2otp.ru: скрипт, accessID, poscreditServices.creditProcess, poscreditCheckStatus |
| [api-contracts](api-contracts.md)                   | SOAP API b2pos.ru: методы, параметры заявки, структуры данных, PHP-клиенты                  |
| [webhooks](webhooks.md)                             | Уведомления о статусе: JS callback, серверный polling, статусы заявки                       |
| [getcourse-order-update](getcourse-order-update.md) | GetCourse API для обновления заказа: endpoint, deal_status, deal_is_paid, PHP+JS примеры    |

## Продукт и условия

- Сумма кредита: **2 000 — 300 000 руб.**
- Первоначальный взнос: **0–90%**
- Срок: **6–36 месяцев**
- Карты: Мир, Visa, MasterCard, UnionPay, JCB
- Решение по заявке: **в реальном времени**

## Две технических системы

| Система    | Назначение         | URL                               |
| ---------- | ------------------ | --------------------------------- |
| `b2otp.ru` | Фронтенд JS-виджет | https://api.b2otp.ru/shop/manual/ |
| `b2pos.ru` | Бэкенд SOAP API    | https://api.b2pos.ru/loan/manual/ |

## Ключевые ссылки

### Официальная документация

- [Документация для интернет-магазинов (JS)](https://api.b2otp.ru/shop/manual/)
- [SOAP API краткая форма v2.4](https://api.b2pos.ru/loan/manual/)
- [SOAP API полная форма v2.7](https://api.b2pos.ru/loan/manual/full/)
- [ОТП Банк — онлайн-продажи (продуктовый лендинг)](https://www.otpbank.ru/onlinesales/)

### PHP-клиенты (open source)

- [vanta/b2pos-soap-client (GitHub)](https://github.com/VantaFinance/b2pos-soap-client) — актуальная, PHP 8.1+
- [AxelPAL/poscredit-php (GitHub)](https://github.com/AxelPAL/poscredit-php) — альтернативная

### Примеры интеграций

- [HelixMedia: RetailCRM + ОТП Банк](https://helixmedia.ru/blogs/manual/instruktsiya-po-integratsii-retailcrm-i-otp-bank-kreditovanie-pokupateley)
- [Robokassa + ОТП Банк рассрочка](https://robokassa.com/blog/news/rassrochka-i-kredit-otp-banka-uzhe-v-robokassa-/)
- [Prodamus + ОТП Банк рассрочка](https://prodamus.ru/blog/rassrochka-ot-otp-banka)
- [OpenCart форум: внедрение POS-CREDIT](https://opencartforum.com/topic/134311-trebuetsya-podskazka-s-vnedreniem-sistemy-pos-credit/)

## Что нужно получить от банка

При подключении через менеджера ОТП Банка запросить:

- `accessID` — для JS-виджета
- `userId` + `userToken` — для SOAP API
- `pointOfSaleId` / Код торговой точки
- Код организации (для CRM-интеграций)
- Контракт webhook-уведомлений (URL, формат POST, верификация)
- Тестовый стенд / sandbox
- Полный список статусов заявки

## Контекст проекта

- Клиент: Ольга Шавковская
- Проект: [Бриф проекта](../../brief.md)
- Задача: интеграция POS-кредита ОТП Банка в платёжную страницу GetCourse
- GetCourse нативно не поддерживает ОТП Банк → нужна кастомная JS + backend интеграция
