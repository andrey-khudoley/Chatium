---
title: 'Внешние сервисы проекта: роли и точки интеграции'
type: reference
status: stable
created: 2026-05-14
updated: 2026-05-14
project: '[Бриф проекта](../brief.md)'
tags:
  - note/reference
  - project/olga-getcourse-payments
  - rag/actionable
---

# Внешние сервисы проекта: роли и точки интеграции

Сводка по внешним сервисам, задействованным на странице оплаты школы Яковлевых. Для каждого сервиса зафиксировано: что он делает в проекте, какой канал интеграции, кто отвечает за подключение, ссылки на детальную документацию в `../knowledge/` (база знаний сервисов, перенесённая в воркспэйс). Документ используется при онбординге нового разработчика и для коммуникации с клиентом.

## 1. LifePay

**Роль в проекте.** Приём оплаты СБП с комиссией 0.4%. Автофискализация чека через облачную кассу. Основной канал, ради которого разрабатывается payments-gateway.

**Контур.** `bills_v1` - старый Online API `https://api.life-pay.ru/v1` (см. [ADR 0001](../../../../saas/gw/lifepay/docs/ADR/0003-lifepay-api-choice.md)). Контур `ecom_v1` (через `home.life-pay.ru`) оставлен как резерв, активация - отдельный ADR 0002 при выгодных условиях эквайринга.

**Точка интеграции.** Payments-gateway-приложение `p/saas/gw/lifepay` (см. [operation-manual](../../../../saas/gw/lifepay/docs/gateway/operation-manual.md)) + клиентская панель `p/units/yakovleva/pay` ([implementation-plan §1.8](../../../../saas/gw/lifepay/docs/gateway/implementation-plan.md)) - именно она хранит секреты магазина школы и обращается к gateway HTTP-запросом с заголовками `X-Lp-Apikey` / `X-Lp-Login` (без промежуточного SDK-приложения, [operation-manual §12.1](../../../../saas/gw/lifepay/docs/gateway/operation-manual.md)). Виджет-бандл на странице школы вызывает не gateway, а `POST /api/lp/invoke` этой панели.

**Что подключено у клиента.** Облачная фискализация в кабинете `my.life-pay.ru`. Эквайринг в `home.life-pay.ru` не подключён (для активации `ecom_v1` потребуется заявка, см. [ADR 0001](../../../../saas/gw/lifepay/docs/ADR/0003-lifepay-api-choice.md)).

**Кто получает credentials.** ИП Яковлева Анна Андреевна (владелец магазина LifePay). Поля `apikey`, `login` берутся в `my.life-pay.ru` → Настройки → Разработчикам. **Секретный ключ для MD5-верификации webhook не используется** - LifePay в [live-документации](https://apidoc.life-pay.ru/notification/index) подпись webhook не публикует; аутентификация входящего webhook сводится к случайному токену в URL (`?token=...`), сгенерированному в админке клиентской панели. Решение зафиксировано 15-05-2026, см. [operation-manual §6.2](../../../../saas/gw/lifepay/docs/gateway/operation-manual.md).

**Документация.**

- [knowledge: lifepay/README](../knowledge/lifepay/README.md) - индекс раздела LifePay.
- [knowledge: lifepay/cabinets](../knowledge/lifepay/cabinets.md) - карта трёх кабинетов LifePay и две поверхности API.
- [knowledge: lifepay/api-contracts](../knowledge/lifepay/api-contracts.md) - контракты старого `/v1/bill` и нового ECOM `/v1/invoices`.
- [knowledge: lifepay/webhooks](../knowledge/lifepay/webhooks.md) - канонический формат webhook (актуализирован 23-05-2026 по живому примеру 20-05): multipart/form-data с JSON в поле `data`, без подписи, retry-схема, поля payload, паттерн приёмника на Chatium.
- [knowledge: lifepay/js-integration](../knowledge/lifepay/js-integration.md) - примеры интеграции на JS.
- [knowledge: lifepay/receipt-fz54](../knowledge/lifepay/receipt-fz54.md) - фискализация по 54-ФЗ.
- [knowledge: lifepay/deep-research-2026-05-10](../knowledge/lifepay/deep-research-2026-05-10.md) - сводное deep-research.

## 2. GetCourse

**Роль в проекте.** Платформа школы. Хранит каталог курсов, заказы, пользователей. Отображает страницу оплаты с встроенным JS-виджетом проекта. Принимает обновление статуса заказа после успешной оплаты.

**Канал интеграции.** Два разных канала:

1. **Встраивание виджета.** Через «Настройки страницы → Дополнительный код в `<head>`» добавляется `<script src="https://<chatium-domain>/widget/payment.js">`. Виджет работает на клиентской стороне в браузере покупателя.
2. **Обновление статуса заказа.** Через GC-gateway `p/gateways/getcourse` (отдельное приложение, не входящее в скоуп проекта Ольги, но используемое как готовый сервис). Приёмник webhook LifePay вызывает GC-gateway после подтверждения оплаты.

**Что подключено у клиента.** Полнофункциональный аккаунт школы. На текущий момент работают: GetCourse Pay (карты через Тинькофф и Сбер), интеграция с ОТП Банком, ссылочная оплата через Lava Top.

**Кто получает credentials.** Ольга Шавковская (оперативный контакт от клиента). API-ключ школы - в ЛК GetCourse → Настройки → API. Доступ на `andrey@khudoley.pro` выдан 08.05.2026 в рамках подписания.

**Документация.** Публичные ресурсы [help.getcourse.ru](https://getcourse.ru/help/api), [getcourse.ru/pl/postback/redoc](https://getcourse.ru/pl/postback/redoc). Внутри vault: внешний gateway-проект `course-chatium-gc-integration-3fa7c2` содержит детальную проработку GC-API, доступную как референс.

## 3. ОТП Банк

**Роль в проекте.** POS-кредитование (рассрочка). Уже подключён у клиента до начала проекта. Виджет проекта только перестраивает порядок отображения, флоу выбора ОТП не подменяется.

**Канал интеграции.** Готовый виджет ОТП, встроенный школой ранее (две системы: `b2otp.ru` для заявок, `b2pos.ru` для управления). Виджет проекта не делает прямых вызовов к ОТП API.

**Что нужно проекту.** Сохранить работоспособность существующей интеграции. Никаких новых credentials или настроек.

> **Вне скоупа этого проекта.** Автоматизация передачи оплат ОТП → GetCourse (серверный приёмник, обновление статуса заказа) обсуждалась как возможное расширение, но **в данном проекте не ведётся** — отдельной инженерной работы, спецификации, ADR и кода по ОТП здесь нет. Документы ниже — справочные (knowledge), на случай если трек откроют отдельным договором/эпиком. См. [бриф](../brief.md).

**Документация (справочная, реализации нет).**

- [knowledge: otp-bank/README](../knowledge/otp-bank/README.md) - индекс.
- [knowledge: otp-bank/js-integration](../knowledge/otp-bank/js-integration.md) - JS-виджет, callback `poscreditCheckStatus`.
- [knowledge: otp-bank/api-contracts](../knowledge/otp-bank/api-contracts.md) - SOAP API.
- [knowledge: otp-bank/webhooks](../knowledge/otp-bank/webhooks.md) - уведомления.

## 4. Lava Top

**Роль в проекте.** Оплата картами иностранных банков (для покупателей из-за рубежа). Уже работает у клиента через ссылочную оплату до начала проекта.

**Канал интеграции.** Готовая интеграция школы (детали со стороны клиента). Виджет проекта не делает прямых вызовов к Lava Top.

**Что нужно проекту.** Сохранить работоспособность. Способ «Оплата из-за границы» виден на первом экране при любой сумме (правило раскладки [payment-scheme](../../pay/docs/architecture/payment-scheme.md) §1).

**Документация.** Внешняя [docs.lava.top](https://docs.lava.top). Внутренних заметок в vault нет (не требовалось для скоупа).

## 5. Т-Банк

**Роль в проекте.** Изначально рассматривался как один из платёжных каналов; на созвоне 08.05 выведен из скоупа по решению Николая Яковлева (отдельное КП по запросу клиента в будущем). Сейчас прямая интеграция Т-Банка **не входит** в работу.

**Канал интеграции.** Текущая оплата через Т-Банк идёт через GetCourse Pay (стандартный модуль GetCourse, без вмешательства проекта). Прямая интеграция Т-Банка через `Acquiring API` (Init / Confirm / Cancel) проработана как технический референс, документация в vault.

**Документация (как референс).**

- [knowledge: t-bank/README](../knowledge/t-bank/README.md) - индекс.
- [knowledge: t-bank/api-contracts](../knowledge/t-bank/api-contracts.md) - контракты Init / GetState / Confirm / Cancel.
- [knowledge: t-bank/webhooks](../knowledge/t-bank/webhooks.md) - формат webhook.
- [knowledge: t-bank/js-integration](../knowledge/t-bank/js-integration.md) - Integration.js, paymentStartCallback.
- [knowledge: t-bank/receipt-fz54](../knowledge/t-bank/receipt-fz54.md) - объект Receipt.
- [knowledge: t-bank/error-codes](../knowledge/t-bank/error-codes.md) - коды ошибок.

## 6. GetCourse Pay (стандартный модуль GetCourse)

**Роль в проекте.** Платёжный модуль GetCourse, через который сейчас проходят оплаты картами РФ (Тинькофф, Сбер) и рассрочки. Работает у клиента до начала проекта.

**Канал интеграции.** Встроенный модуль GetCourse, настраивается на стороне школы. Виджет проекта не вмешивается в логику GetCourse Pay; перестраивает только порядок отображения и скрывает / раскрывает блок «Другие методы» по правилу [payment-scheme](../../pay/docs/architecture/payment-scheme.md) §1.

**Что нужно проекту.** Сохранить работоспособность всех каналов оплаты внутри GetCourse Pay.

## 7. ОФД (оператор фискальных данных)

**Роль в проекте.** Получает фискальные чеки от облачной кассы LifePay и отправляет их в ФНС, а также копию покупателю на email/телефон. Не интегрируется проектом напрямую: вся работа с ОФД происходит внутри LifePay по настройкам облачной кассы.

**Что нужно проекту.** Подтвердить у клиента, что в `my.life-pay.ru` → Фискализация включена автофискализация (галочка на сотруднике-владельце) и что данные ОФД корректно прописаны.

## 8. Сводка по credentials, которые нужно получить от клиента

| Credential                                                 | Источник у клиента                                                                                                                                            | Где живёт в системе                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lp_apikey` LifePay                                        | `my.life-pay.ru` → Настройки → Разработчикам                                                                                                                  | Heap клиентской панели `p/units/yakovleva/pay`                                                                                                                       |
| `lp_login` LifePay (телефон владельца, `7XXXXXXXXXX`)      | Регистрационные данные магазина LifePay                                                                                                                       | Heap клиентской панели                                                                                                                                               |
| `lp_webhook_token` (≥ 32 символа)                          | Генерируется в админке клиентской панели                                                                                                                      | Heap клиентской панели; передаётся в URL `callback_url` каждого `createBill` (LifePay не публикует MD5-подпись, токен в query - единственная аутентификация webhook) |
| API-ключ GetCourse школы                                   | ЛК GetCourse → Настройки → API                                                                                                                                | Heap клиентской панели (для вызовов GC-gateway, в MVP)                                                                                                               |
| Тестовая пара `apikey + login` для интеграционных прогонов | Отдельный тестовый магазин LifePay или sandbox-режим (на момент 14-05-2026 sandbox у LifePay отсутствует, используется боевой магазин с минимальными суммами) | Heap payments-gateway (`lp_test_apikey`, `lp_test_login`)                                                                                                            |

## Связанные документы

- [../decisions/0001-lifepay-api-choice](../../../../saas/gw/lifepay/docs/ADR/0003-lifepay-api-choice.md) - выбор контура `bills_v1` LifePay.
- [../gateway/operation-manual](../../../../saas/gw/lifepay/docs/gateway/operation-manual.md) - технический норматив payments-gateway.
- [../architecture/data-flow](../architecture/data-flow.md) - sequence-диаграмма всей системы.
- [../architecture/payment-scheme](../../pay/docs/architecture/payment-scheme.md) - бизнес-логика виджета.
- [../../notes/lifepay-support-2026-05-12](../notes/lifepay-support-2026-05-12.md) - диалог с поддержкой LifePay по разделению кабинетов.
