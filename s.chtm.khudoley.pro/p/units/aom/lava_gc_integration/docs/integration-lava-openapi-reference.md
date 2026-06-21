# Справка по Lava.top API (OpenAPI)

Полная машиночитаемая спецификация лежит в репозитории проекта:

- **[reference/lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml)** — OpenAPI 3.0.3, заголовок `lava.top Public API`; актуальная версия указана в `info.version` файла.

Её можно открыть в Swagger UI / Stoplight / IDE с поддержкой OpenAPI. В тексте ниже — **сводка для сценария** «один технический продукт → PATCH цены → POST контракт → webhook», без дублирования всех путей.

## Базовый URL

В самом файле блок `servers` не задан. В примерах Lava фигурирует хост **`https://gate.lava.top`** (см. поле `nextPage` у `GET /api/v2/products`). Фактический base URL нужно подтвердить в кабинете партнёра / документации Lava при настройке `request()` в Chatium.

## Авторизация исходящих запросов (к Lava)

Схема **`ApiKeyAuth`** в `components.securitySchemes`:

- тип: `apiKey`;
- `in: header`;
- имя заголовка: **`X-Api-Key`**.

Совпадает с разделом [integration-lava-api.md](./integration-lava-api.md).

## Пути, критичные для интеграции GetCourse + Chatium

| Операция в нашем ТЗ                   | Метод и путь в OpenAPI                                    | Примечание                                                                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Обновить цену оффера перед контрактом | **`PATCH /api/v2/products/{productId}`**                  | Тело: `ProductUpdateRequest` → массив `offers` с `UpdateOfferRequest` (`id` оффера, `prices` / при необходимости `name`, `description`). В описании метода: можно задать цену в одной валюте или сразу в трёх (`prices`).                                    |
| Создать контракт (актуальный маршрут) | **`POST /api/v3/invoice`**                                | Тело: `CreateInvoiceV3Request` (`email`, `offerId`, `currency`, опционально `paymentProvider`, `paymentMethod`, `buyerLanguage`, `periodicity`, `clientUtm`). Ответ **201**: `InvoicePaymentParamsResponse` — в т.ч. `id` контракта, `paymentUrl`, `status`. |
| Создать контракт (устаревшие)         | `POST /api/v1/invoice`, `POST /api/v2/invoice`            | Помечены `deprecated`; в спецификации указана замена на **`POST /api/v3/invoice`**.                                                                                                                                                                          |
| Служебно: список продуктов            | **`GET /api/v2/products`**                                | Для настройки и диагностики (см. [integration-lava-api.md](./integration-lava-api.md)).                                                                                                                                                                      |
| Служебно: список/детали контрактов    | `GET /api/v2/invoices`, `GET /api/v2/invoices/{id}` и др. | См. тег **Invoices** в YAML.                                                                                                                                                                                                                                 |

Имена полей и enum-ы — только в [lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml) (`components.schemas`).

## Приём webhook от Lava

В OpenAPI контракт приёма описан как пример маршрута:

- **`POST /example-of-webhook-route-contract`** (тег **Webhooks**) — не реальный URL Lava, а **образец** того, каким должен быть ваш endpoint.

**Безопасность входящего webhook** (на стороне получателя):

- `BasicWebhookAuth` — HTTP Basic;
- `ApiKeyWebhookAuth` — заголовок **`X-Api-Key`** (отдельный от ключа исходящего API, настраивается в Lava для webhook).

Тело: схема **`PurchaseWebhookLog`**; в примерах — `eventType` (`payment.success`, `payment.failed`, события подписок и т.д.), `contractId`, `amount`, `currency`, `buyer.email`, `status`, `errorMessage`.

**Повторы доставки:** в описании ответов указано: коды **4xx/5xx** считаются недоставкой; Lava выполняет до **19 повторных попыток** с заданными интервалами (1 s → … → 1 h). Реализация в Chatium должна быстро отвечать **2xx** после надёжной записи payload (см. [integration-idempotency-statuses-webhooks.md](./integration-idempotency-statuses-webhooks.md)).

## Прочие разделы API

В том же файле: **Subscriptions**, **Sales**, **Donate**, устаревший **feed** и др. Для текущей спецификации «динамический одноразовый платёж» они не обязательны, но могут понадобиться при расширении продукта.

## Связь с остальной документацией проекта

| Документ                                                                                 | Роль                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [integration-lava-api.md](./integration-lava-api.md)                                     | Логика вызовов в контексте критической секции и Chatium |
| [integration-http-contracts.md](./integration-http-contracts.md)                         | Контракт GetCourse ↔ Chatium (не путать с Lava API)    |
| [reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md)               | Официальный формат вызовов GetCourse (PL API)           |
| [integration-security-validation-errors.md](./integration-security-validation-errors.md) | Секреты и проверка webhook                              |
