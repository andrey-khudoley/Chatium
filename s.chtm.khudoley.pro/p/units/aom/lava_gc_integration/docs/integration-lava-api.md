# Внешние вызовы Lava API

**Источник истины по путям, телам запросов и схемам:** [reference/lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml) и человекочитаемая сводка [integration-lava-openapi-reference.md](./integration-lava-openapi-reference.md).

## 10.1. Авторизация

Запросы к Lava выполняются с API-ключом в заголовке **`X-Api-Key`** (схема `ApiKeyAuth` в OpenAPI).

## 10.2. Обновление продукта или оффера

Runtime: **`PATCH /api/v2/products/{productId}`** с телом **`ProductUpdateRequest`**: массив **`offers`** с элементами **`UpdateOfferRequest`** — идентификатор оффера **`id`**, цены **`prices`** (`UpdatePriceRequest`: `amount`, `currency`), при необходимости **`name`**, **`description`**.

Для входящих запросов из GetCourse сумма сейчас считается как рублёвая (`RUB`) даже при валюте `USD`/`EUR`. Перед `PATCH` выполняется конвертация **RUB → USD/EUR** по актуальному курсу ЦБ из внешнего источника `https://www.cbr-xml-daily.ru/daily_json.js` (зеркало данных ЦБ); в Lava уходит уже сконвертированная сумма целевой валюты. Перед вызовом Lava сумма проверяется на допустимый диапазон для валюты оффера (`lib/lava-amount-limits.lib.ts`): для USD/EUR минимум **5** и максимум **10000** (как в ответе Lava HTTP 400 `allowed limits=(5, 10000) for EUR`); для RUB минимум **50** (как в лайв-тестах проекта). При выходе за пределы клиент получает `success: false`, `errorCode: AMOUNT_OUT_OF_RANGE` и непустой `message` (без запроса PATCH к Lava).

**Назначение:**

1. изменить цену оффера перед созданием контракта;
2. при необходимости изменить название/описание оффера (см. открытые вопросы в [integration-readiness-decisions-open-questions.md](./integration-readiness-decisions-open-questions.md)).

**Рабочая гипотеза:**

1. продукт и оффер остаются теми же сущностями;
2. меняется в первую очередь стоимость;
3. изменение делается непосредственно перед созданием контракта.

Реализация в Chatium — через `request()` из `@app/request` (см. `inner/docs/004-request.md`). Для исходящих вызовов из обычных роутов используйте **`request({ url, method, … })` без первого аргумента `ctx`**; иначе в outward-контексте возможна ошибка про `ctx.app` / proxy app. Обёртки в коде проекта: **`updateOfferPrice`** (`lib/lava-api.client.ts`).

## 10.3. Создание контракта

После успешного обновления цены вызывается **`POST /api/v3/invoice`** (актуальный маршрут; `POST /api/v1/invoice` и `POST /api/v2/invoice` в OpenAPI помечены как устаревшие).

Тело — **`CreateInvoiceV3Request`**: минимум `email`, `offerId`, `currency`; опционально `paymentProvider`, `paymentMethod`, `buyerLanguage`, `periodicity`, `clientUtm` — по согласованию с GetCourse.

Ответ **201** — **`InvoicePaymentParamsResponse`**: идентификатор контракта (`id`), **`paymentUrl`**, **`status`** и др. (полный состав — в YAML).

Контракт создаётся **сразу** после обновления цены и **до** снятия блокировки. Обёртка в коде: **`createContract`** (`lib/lava-api.client.ts`).

## 10.4. Получение списка продуктов

В обычном runtime запрос списка продуктов **не нужен**.

Для служебных сценариев в OpenAPI: **`GET /api/v2/products`** (обновлённая лента продуктов):

1. первичная настройка;
2. диагностика;
3. сверка конфигурации;
4. ручная проверка существования шаблонного продукта.

Для первой страницы ответа без обхода пагинации в проекте: **`getProducts`** (`lib/lava-api.client.ts`); полный каталог для мастера админки — **`fetchLavaProductsCatalog`** (тот же модуль).
