# Техническая документация проекта `lava_gc_integration`

Единая точка входа в спецификацию приложения Chatium: интеграция **GetCourse + Lava.top** и текущая инфраструктура шаблона (настройки, логи, админка).

## Интеграция GetCourse + Lava (целевой продукт)

**С нуля по потоку оплаты** — сначала [integration-full-flow.md](./integration-full-flow.md) (сквозная логика и ссылки на детали). Ниже — тематические документы; при первом знакомстве или передаче задачи разработчику можно читать в указанном порядке.

| Файл                                                                                                     | Содержание                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [integration-full-flow.md](./integration-full-flow.md)                                                   | Сквозное описание: участники, этапы от `payment-link` до обновления заказа в GC, таблица соответствия входов и модулей кода |
| [integration-overview.md](./integration-overview.md)                                                     | Назначение, бизнес-модель, границы ответственности GC / Chatium / Lava                                                      |
| [integration-architecture-flows.md](./integration-architecture-flows.md)                                 | Сценарии взаимодействия, допущения, ограничения пропускной способности, сущности в Lava                                     |
| [integration-critical-section.md](./integration-critical-section.md)                                     | Критическая секция, гонки, блокировка, привязка к `@app/sync` в Chatium                                                     |
| [integration-lava-api.md](./integration-lava-api.md)                                                     | Вызовы Lava: авторизация, обновление оффера, контракт, диагностика                                                          |
| [integration-lava-openapi-reference.md](./integration-lava-openapi-reference.md)                         | Сводка по OpenAPI Lava: пути, webhook, ссылки на YAML                                                                       |
| [integration-getcourse-api-reference.md](./integration-getcourse-api-reference.md)                       | Указатель на спецификацию GetCourse PL API и связь с потоком оплаты                                                         |
| [integration-http-contracts.md](./integration-http-contracts.md)                                         | HTTP-контракты GetCourse ↔ Chatium (payment-link, payment-status)                                                          |
| [integration-lifecycle.md](./integration-lifecycle.md)                                                   | Пошаговые сценарии: успех, ошибки Lava, параллельные запросы                                                                |
| [integration-data-model.md](./integration-data-model.md)                                                 | Таблицы Heap: контракты, webhook-события, опциональный аудит lock                                                           |
| [integration-idempotency-statuses-webhooks.md](./integration-idempotency-statuses-webhooks.md)           | Идемпотентность, статусы контракта, приём и обработка webhook                                                               |
| [integration-security-validation-errors.md](./integration-security-validation-errors.md)                 | Секреты, аутентификация, валидация входа, коды ошибок и реакция GetCourse                                                   |
| [integration-observability.md](./integration-observability.md)                                           | Метрики, алерты, обязательные поля в логах                                                                                  |
| [integration-nfr-edge-operations.md](./integration-nfr-edge-operations.md)                               | НФТ, согласованность, граничные случаи, эксплуатация и масштабирование                                                      |
| [integration-implementation-chatium.md](./integration-implementation-chatium.md)                         | Слои кода, модули платформы, рекомендуемые сервисы                                                                          |
| [integration-readiness-decisions-open-questions.md](./integration-readiness-decisions-open-questions.md) | Критерии готовности, приёмка, зафиксированные решения, открытые вопросы, следующие шаги                                     |

## Текущее приложение (шаблон и инфраструктура)

| Файл                                                                       | Содержание                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [architecture.md](./architecture.md)                                       | Роутинг, слои API → lib → repos → Heap, план интеграции (кратко)               |
| [testing.md](./testing.md)                                                 | Как устроены тесты в проекте: `ctx`, страница `/web/tests`, юнит vs интеграция |
| [api.md](./api.md)                                                         | Реализованные эндпоинты и планируемые пути интеграции                          |
| [data.md](./data.md)                                                       | Существующие таблицы Heap и планируемые сущности интеграции                    |
| [run.md](./run.md)                                                         | Запуск и деплой                                                                |
| [imports.md](./imports.md)                                                 | Импорты и циклы                                                                |
| [ADR/](./ADR/)                                                             | Архитектурные решения                                                          |
| [reference/lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml)       | Официальная спецификация публичного API Lava.top (OpenAPI 3.0.3)               |
| [reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md) | Спецификация GetCourse Import/PL API для обновления заказов и формата вызовов  |
| [reference/README.md](./reference/README.md)                               | Кратко про внешние спеки в `reference/`                                        |

## Платформа Chatium

Детали API платформы — в `inner/docs` воркспэйса (в т.ч. `008-heap.md`, `028-sync.md`, `004-request.md`, `003-auth.md`, `016-analytics-workspace.md`).
