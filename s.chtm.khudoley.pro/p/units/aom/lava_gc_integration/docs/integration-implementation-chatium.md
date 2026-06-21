# Реализация в Chatium: слои и модули платформы

## 25. Рекомендуемые компоненты кода

Контракт REST Lava зафиксирован в [reference/lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml) (см. [integration-lava-openapi-reference.md](./integration-lava-openapi-reference.md)).

Вызовы **GetCourse** из Chatium — по формату PL API (`pl/api/deals` и др.): [reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md), указатель [integration-getcourse-api-reference.md](./integration-getcourse-api-reference.md). Реализовать отдельным клиентом (например `GetCoursePlApiClient`): POST form body, Base64-кодирование `params`, разбор вложенного `result.success` / `result.error`.

1. **`LavaApiClient`** — тонкая обёртка над `request()` к Lava (заголовок `X-Api-Key`, базовый URL из настроек, пути как в OpenAPI).
2. **`LavaPaymentService`** (или аналог в `lib/`) — сценарий: подготовка данных → внутри `runWithExclusiveLock` — update offer → create contract → вызов репозитория контракта.
3. **`LavaWebhookService`** — приём payload, дедупликация, маппинг статусов, вызов GetCourse (через PL API или заранее настроенный URL-процесс в GetCourse).

Отдельный модуль для политики lock не обязателен: достаточно обёртки вокруг `runWithExclusiveLock` с единым ключом и таймаутами.

**Обязательно:** `try/finally` (или семантика `@app/sync`) так, чтобы lock снимался при любой ошибке после захвата.

## Платформа Chatium: ограничения

| Область         | Требование                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Роутинг**     | File-based: один файл = один эндпоинт с путём `/`. Ссылки — `withProjectRoot(route.url())` из `config/routes.tsx`.                |
| **Heap**        | Только на сервере (API, `web/*.tsx` SSR). В Vue не импортировать таблицы; данные в браузер — `fetch` к своим API или props с SSR. |
| **Гонки**       | `runWithExclusiveLock` / `tryRunWithExclusiveLock` из `@app/sync`.                                                                |
| **HTTP**        | `@app/request` для Lava и GetCourse.                                                                                              |
| **Валидация**   | `@app/schema`.                                                                                                                    |
| **Ошибки**      | `@app/errors` + единый JSON для внешних клиентов.                                                                                 |
| **Логи**        | `ctx.account.log()` / проектный logger, не `console.log` в проде.                                                                 |
| **Зависимости** | Без npm в рантайме; только модули платформы (`@app/*`, см. `inner/docs/025-app-modules.md`).                                      |

## Целевая раскладка по каталогам

Согласовано с [ADR-0002](./ADR/0002-settings-heap-and-layered-api.md):

| Слой        | Каталог   | Интеграция                                                    |
| ----------- | --------- | ------------------------------------------------------------- |
| Таблицы     | `tables/` | Контракты, webhook-события, опционально lock-log              |
| Репозитории | `repos/`  | CRUD, `where`, `countBy`                                      |
| Логика      | `lib/`    | Lava client, payment flow, webhook, идемпотентность           |
| API         | `api/`    | `integrations/lava/payment-link`, `integrations/lava/webhook` |

Под блокировкой не выполнять долгие вызовы в GetCourse и полную цепочку retry — только Lava + запись в Heap.
