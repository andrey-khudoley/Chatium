---
title: 'Документация проекта: GetCourse платежи (Яковлева / olga-getcourse-payments-c7d5a1)'
type: index
project_hash: c7d5a1
created: 2026-05-24
updated: 2026-05-26
tags:
  - note/index
  - project/olga-getcourse-payments
---

# Документация проекта — GetCourse платежи (школа Яковлевых)

Единая точка входа по проекту «Платёжная страница GetCourse»: интеграция СБП через **LifePay** + кастомная раскладка способов оплаты на странице оплаты школы. Здесь собрана **вся** проектная, инженерная, юридическая и справочная документация — от брифа и договоров до спецификаций gateway и базы знаний по платёжным сервисам. Обращаться к Obsidian-ваулту для понимания проекта не требуется.

Проектный хэш: `c7d5a1`. Заказчик (ИП): Яковлева Анна Андреевна. ЛПР: Николай Яковлев. Оперативный контакт: Ольга Шавковская.

## С чего начать

- **[Бриф проекта](brief.md)** — статус, реквизиты заказчика, согласованный скоуп, коммерческая рамка, полный журнал событий. Главный документ.
- **[Реестр решений (ADR)](decisions/README.md)** — все архитектурные решения и где они лежат.

## Карта размещения (важно)

Проект распределён по **трём** местам воркспэйса. Документация каждого модуля лежит рядом с его кодом; кросс-проектные материалы — в этом хабе.

| Что                              | Где в воркспэйсе                  | Роль                                                                                                                              |
| -------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Проектный хаб** (этот каталог) | `p/units/yakovleva/project-docs/` | Бриф, решения, приёмка, references, коммерция, legal, заметки, отменённый webhook-proxy, база знаний сервисов                     |
| **Gateway (LifePay)**            | `p/saas/gw/lifepay/`              | Серверный шлюз к LifePay: контур `bills_v1`, операции `createBill`/`getBillStatus`/`cancelBill`. SSOT в `docs/gateway/`           |
| **Клиентская панель**            | `p/units/yakovleva/pay/`          | Хранилище секретов магазина, прокладка `POST /api/lp/invoke`, приёмник webhook, виджет-бандл для GC, дашборд. Документы в `docs/` |

> `p/gateways/gc_api` — **отдельный** проект (GetCourse-API gateway), к этой задаче не относится.

## Точки входа по задаче

| Если нужно                                                            | Открывать                                                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Понять проект целиком, статус, журнал                                 | [brief.md](brief.md)                                                                            |
| Понять, как устроен LifePay-gateway (контракты, ошибки, секреты)      | [gateway/operation-manual.md](../../../saas/gw/lifepay/docs/gateway/operation-manual.md) (SSOT) |
| Запустить/продолжить разработку gateway                               | [gateway/implementation-plan.md](../../../saas/gw/lifepay/docs/gateway/implementation-plan.md)  |
| Спроектировать тестовый прогон gateway                                | [gateway/testing-strategy.md](../../../saas/gw/lifepay/docs/gateway/testing-strategy.md)        |
| Понять раскладку способов оплаты на странице школы (правило 50 000 ₽) | [payment-scheme.md](../pay/docs/architecture/payment-scheme.md)                                 |
| Увидеть всю систему на одной диаграмме                                | [architecture/data-flow.md](architecture/data-flow.md)                                          |
| Понять модель доступа к клиентской панели                             | [ADR 0003 — internal-access-control](../pay/docs/ADR/0003-internal-access-control.md)           |
| Найти обоснование «почему bills_v1, а не ECOM»                        | [ADR 0001 — lifepay-api-choice](../../../saas/gw/lifepay/docs/ADR/0003-lifepay-api-choice.md)   |
| Свериться с приёмкой клиента                                          | [testing/acceptance-criteria.md](testing/acceptance-criteria.md)                                |
| Узнать роль каждого внешнего сервиса                                  | [references/external-services-overview.md](references/external-services-overview.md)            |
| Разобраться в API LifePay/ОТП/Т-Банк                                  | [knowledge/](knowledge/)                                                                        |

## Структура хаба

| Папка/файл                                                                           | Что внутри                                                                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [brief.md](brief.md)                                                                 | Проектный бриф: статус, реквизиты, скоуп, коммерческая рамка, журнал.                                                         |
| [decisions/](decisions/README.md)                                                    | Реестр ADR проекта (тела решений — в модулях).                                                                                |
| [architecture/data-flow.md](architecture/data-flow.md)                               | Sequence-диаграмма всей системы, каналы данных, карта секретов.                                                               |
| [testing/acceptance-criteria.md](testing/acceptance-criteria.md)                     | Бизнес-приёмочные критерии заказчика.                                                                                         |
| [references/external-services-overview.md](references/external-services-overview.md) | Обзор внешних сервисов (LifePay, GetCourse, ОТП, Lava Top, Т-Банк, GetCourse Pay).                                            |
| [commercial/](commercial/)                                                           | Коммерческое предложение (черновики + `.docx` + извлечённый текст).                                                           |
| [legal/](legal/)                                                                     | Договор №1, ТЗ №1, NDA (`.docx` + извлечённый текст).                                                                         |
| [notes/](notes/)                                                                     | Переписки, диалог с поддержкой LifePay, первый живой webhook.                                                                 |
| [webhook-proxy/](webhook-proxy/)                                                     | Спецификация и план VDS-прокси — **отменено** (Chatium поддержал multipart нативно 18.05). Хранится как историческая справка. |
| [knowledge/](knowledge/)                                                             | База знаний по платёжным сервисам: `lifepay/`, `otp-bank/`, `t-bank/`, `chatium/multipart-form-data.md`.                      |

## Документация модулей (рядом с кодом)

**Gateway `p/saas/gw/lifepay/docs/`:**

- [docs/README.md](../../../saas/gw/lifepay/docs/README.md) — **индекс документации модуля** (карта `architecture.md`/`api.md`/`data.md`/`imports.md`, ADR, gateway, LLM).
- [gateway/operation-manual.md](../../../saas/gw/lifepay/docs/gateway/operation-manual.md) — SSOT разработки (контракты `/v1/{op}`, секреты, коды ошибок, наблюдаемость).
- [gateway/implementation-plan.md](../../../saas/gw/lifepay/docs/gateway/implementation-plan.md) — план Прототип → MVP → Прод (вкл. §1.11 внутренние права доступа).
- [gateway/testing-strategy.md](../../../saas/gw/lifepay/docs/gateway/testing-strategy.md) — стратегия юнит/интеграционных тестов.
- [ADR 0003 — lifepay-api-choice](../../../saas/gw/lifepay/docs/ADR/0003-lifepay-api-choice.md) — проектный ADR 0001.
- Сопутствующие реестры операций: `gateway/lp-unified-op-registry-v0.md`, `gateway/lp-op-http-mapping.json`, `gateway/lp-required-fields-by-op.json` (стабы-указатели на код-каталог).

**Клиентская панель `p/units/yakovleva/pay/docs/`:**

- [docs/README.md](../pay/docs/README.md) — **индекс документации модуля** (карта `architecture.md`/`api.md`/`data.md`/`imports.md`, ADR, payment-scheme, LLM).
- [architecture/payment-scheme.md](../pay/docs/architecture/payment-scheme.md) — бизнес-логика виджета (раскладка способов, правило 50 000 ₽).
- [ADR 0003 — internal-access-control](../pay/docs/ADR/0003-internal-access-control.md) — проектный ADR 0003.

## Соглашения

- **SSOT по разработке gateway** — `gateway/operation-manual.md`. При расхождении с кодом или другим документом сначала правится manual.
- **ADR** — решения, меняющие границу или контракт, оформляются как ADR в `docs/ADR/` соответствующего модуля; сводный реестр — [decisions/README.md](decisions/README.md).
- **Ссылки** — относительные, без захардкоженных абсолютных путей.

## Происхождение

Перенесено 2026-05-24 из Obsidian-ваулта (`second_brain/03_Projects/active/olga-getcourse-payments-c7d5a1` + связанная база знаний `05_Knowledge/06_services`). Wiki-ссылки конвертированы в относительные markdown-ссылки воркспэйса. Известные пробелы исходника (несозданные реестровые файлы, ссылки на внешний проект `course-chatium-gc-integration-3fa7c2`) отмечены на месте.
