# Документация — LifePay payments-gateway (`p/gateways/lifepay`)

Индекс каталога `docs/`. Приложение Chatium — **payments-gateway к LifePay**: публичный контур `bills_v1` (`/v1/createBill`, `/v1/getBillStatus`, `/v1/cancelBill`, `/v1/operations`) с маршрутизацией к LifePay через `@app/request`. На `/` — панель оператора с журналами входящих/исходящих запросов (PII-маска, raw-просмотр) и внутренней системой доступов.

Модуль проекта **«GetCourse платежи» (olga-getcourse-payments-c7d5a1)**. Проектный хаб (бриф, решения, приёмка, база знаний сервисов): [../../../../units/aayakovleva/project-docs/README.md](../../../../units/aayakovleva/project-docs/README.md).

> - Обзор, текущее состояние, деплой, changelog — [../README.md](../README.md).
> - Словарь для LLM (что за проект, где что лежит) — [../.CHATIUM-LLM.md](../.CHATIUM-LLM.md).

## Карта документации

| Файл                               | О чём                                                                                                                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | Роутинг, gateway-слой `lib/gateway/` (общий `handleV1Op.ts`, каталог `operationsCatalog.ts`, клиент LifePay `lifePayClient.ts`, классификация ответов `billsV1Semantic.ts`), панель оператора, наблюдаемость, ограничения платформы.     |
| [api.md](api.md)                   | Публичный gateway-API (`api/v1/*`: формат ответа `TuneHttpHeadersResponse`, заголовки `X-Lp-*`, `X-Gateway-Request-Id`), настройки, raw-журналы (`api/admin/raw/*`), дашборд (`api/admin/dashboard/*`), доступы (`api/access/*`), тесты. |
| [data.md](data.md)                 | Heap-таблицы: `settings`, `logs`, `gatewayRequestLog`, `gatewayUpstreamLog`, `panelAccess`, `panelInvites`.                                                                                                                              |
| [imports.md](imports.md)           | Карта импортов страниц-роутов (TSX entrypoints) и схема зависимостей слоёв.                                                                                                                                                              |

## Каталоги

| Каталог              | Что внутри                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR/](ADR/)         | Журнал архитектурных решений: `0001` базовая структура, `0002` settings в Heap + слоистый API, `0003` выбор API LifePay (контур `bills_v1` основной, `ecom_v1` fallback — проектный ADR 0001).                                                                                                                                                                                                    |
| [gateway/](gateway/) | **SSOT норматива gateway.** `operation-manual.md` (контракты `/v1/{op}`, контур `bills_v1`, секреты, коды ошибок, наблюдаемость; перенесён в модуль 2026-05-24); `implementation-plan.md` (план Прототип → MVP → Прод, вкл. §1.11 внутренние права доступа); `testing-strategy.md`; реестры-указатели `lp-unified-op-registry-v0.md`, `lp-op-http-mapping.json`, `lp-required-fields-by-op.json`. |
| [LLM/](LLM/)         | Хронология рабочих сессий (диалоги, прогоны проверок) по правилам нумерации `NNNN_DD-MM-YYYY_HH-MM.md`.                                                                                                                                                                                                                                                                                           |

## Соглашения

- **SSOT по разработке gateway** — `gateway/operation-manual.md`. При расхождении кода и документа сначала правится manual.
- **ADR** — решения, меняющие контракт или границу, оформляются новым файлом в `ADR/` со ссылкой на предыдущий; сводный реестр проекта — [project-docs/decisions/README.md](../../../../units/aayakovleva/project-docs/decisions/README.md).
- **Ссылки** — относительные, без захардкоженных абсолютных путей.
- При обновлении `shared/redactRaw.ts` синхронизировать с `p/units/yakovleva/pay/shared/redactRaw.ts`.
