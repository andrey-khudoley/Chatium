---
title: 'LifePay Интернет-Эквайринг — Индекс'
type: reference
tags:
  - topic/lifepay
  - topic/payments
  - topic/api
  - topic/acquiring
created: 2026-05-08
updated: 2026-05-08
project_refs:
  - olga-getcourse-payments-c7d5a1
---

# LifePay — Интернет-Эквайринг

Платёжный шлюз LifePay для приёма онлайн-платежей. Поддерживает картовые платежи, СБП, QR-коды.

## Содержание раздела

| Файл                                                    | Что внутри                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cabinets](cabinets.md)                                 | Карта личных кабинетов: `my.life-pay.ru` (фискализация + СБП-ссылки), `home.life-pay.ru` (эквайринг), `my.life-pos.ru` (POS-устройства). Где какие credentials. Сценарии приёма СБП. Обновлено 13.05.2026 после диалога с поддержкой  |
| [deep-research-2026-05-10](deep-research-2026-05-10.md) | Полный аналитический отчёт по экосистеме LIFE PAY: карта API, endpoint-by-endpoint Online API v1, SBP-links v2, NFC v1, LIFE POS API v6, ECOM Checkout, фискализация, безопасность, чек-лист, план тестирования, пробелы документации |
| [api-contracts](api-contracts.md)                       | Оба API: старый (v1/bill) и новый ECOM (v1/invoices). Авторизация, эндпоинты, запросы/ответы                                                                                                                                          |
| [webhooks](webhooks.md)                                 | Формат уведомлений, параметры, верификация MD5-подписи, расписание повторов                                                                                                                                                           |
| [js-integration](js-integration.md)                     | Сценарий для GetCourse: JS → backend → LifePay → webhook → CRM                                                                                                                                                                        |
| [receipt-fz54](receipt-fz54.md)                         | Фискализация через облачную кассу (54-ФЗ): Cloud Print API, структура чека                                                                                                                                                            |

## Ключевые ссылки на документацию

- [Документация ECOM API (новая)](https://docs.life-pos.ru/)
- [Документация старого API](https://apidoc.life-pay.ru/)
- [Авторизация ECOM API](https://docs.life-pos.ru/docs/api/ipsp_api_v1/auth/)
- [Создание счёта (invoice)](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-invoice)
- [Создание платёжного токена (карта)](https://docs.life-pos.ru/docs/api/ipsp_api_v1/create-payment-token)
- [Webhook-уведомления](https://docs.life-pos.ru/docs/ipsp/interaction/webhook_notifications)
- [ECOM Checkout SDK (JS)](https://docs.life-pos.ru/ipsp/ecom_checkout)
- [Тестовые платежи](https://docs.life-pos.ru/ipsp/get_started/testing)
- [Быстрый старт IPSP](https://docs.life-pos.ru/ipsp/get_started/quickstart)
- [Коды ошибок](https://docs.life-pos.ru/ipsp/old/interaction/error_codes)
- [Выставление счёта (старый API)](https://apidoc.life-pay.ru/bill/index/)
- [Уведомления (старый API)](https://apidoc.life-pay.ru/notification/index)
- [Cloud Print API (касса)](https://apidoc.life-pay.ru/cloud-print/index)
- [База знаний поддержки](https://support.life-pay.ru/ru/knowledge_base/art/201/cat/123/api-life-pay)
- [Ошибки интеграции](https://support.life-pay.ru/knowledge_base/item/161435)

## Среды

| Среда             | Base URL                           |
| ----------------- | ---------------------------------- |
| Тест (ECOM)       | `https://api-ecom.life-pay.ru/v1/` |
| Прод (ECOM)       | `https://api-ecom.life-pay.ru/v1/` |
| Тест (старый API) | `https://api.life-pay.ru/v1/`      |
| Прод (старый API) | `https://api.life-pay.ru/v1/`      |
| Тест ЛК           | `my-dev.life-pos.ru`               |

> Тестовый и боевой сервис разводятся через разные `service_id` в ЛК. Тестовый канал включён по умолчанию.

## Credentials. Где брать

Полная карта кабинетов и credentials в [cabinets](cabinets.md). Краткая выжимка ниже.

| Что                    | Где                                                     | Для какого API                          |
| ---------------------- | ------------------------------------------------------- | --------------------------------------- |
| `apikey` (старый)      | `my.life-pay.ru` → Настройки → Разработчикам            | `POST /v1/bill`, `POST /v1/cloud-print` |
| `login`                | Номер телефона владельца компании, формат `7XXXXXXXXXX` | старый API                              |
| `service_id`           | `home.life-pay.ru` → Интеграция → Сервисы               | ECOM API                                |
| `api_key` (ECOM)       | `home.life-pay.ru` → Интеграция → Сервисы → иконка 🔑   | ECOM API                                |
| Секретный ключ webhook | `home.life-pay.ru` → Настройки магазина                 | ECOM webhook                            |
| URL уведомлений        | `home.life-pay.ru` → Настройки → Разработчикам          | ECOM webhook                            |

> ⚠️ Доступ к `home.life-pay.ru` требует подключения интернет-эквайринга (отдельная заявка). Если у клиента только облачная фискализация, доступен только старый API через `my.life-pay.ru`.

## Связанные проекты

- [Бриф проекта](../../brief.md)
