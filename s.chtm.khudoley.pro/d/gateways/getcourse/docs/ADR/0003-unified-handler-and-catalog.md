# ADR-0003: Общий обработчик `/v1/{op}` и каталог операций

## Статус

~~Принято (06-05-2026).~~ **Пересмотрено / Superseded** — заменено ADR-0004 (26-05-2026): codegen-слой упразднён, обработчик перемещён в `handleV1Op.ts` с per-op хендлерами, события workspace удалены в пользу raw-журналов Heap.

## Контекст

Публичный gateway GetCourse должен обслуживать десятки операций с единым контрактом ошибок, заголовков школы, проверкой `gc_developer_api_key`, контурами Legacy/new и каталогом `GET /v1/operations` без дублирования логики в каждом файле роута.

## Решение

1. **Единый обработчик** `lib/gateway/handleV1OpRoute.ts`: для каждого `op` выполняются проверки manual §2–§3, выбор клиента (`legacyGcImportClient`, `legacyGcExportGet`, `newGcApiClient`), интерпретация ответа `interpretGcContourResponse`, предупреждения для `availability: beta`, событие workspace `gateway_gc.invoke.completed` после формирования ответа клиенту.

2. **Каталог HTTP и метаданные** — `lib/gateway/gcOpHttpMapping.generated.ts` (генерация `node scripts/gen-gc-op-http-mapping.cjs` из `config/gc-op-http-mapping.json`).

3. **Схемы `args`** — `lib/gateway/v1OpArgsSchemas.generated.ts` (генерация `node scripts/gen-v1-op-args-schemas.cjs` из OpenAPI + overrides), переопределение строгой схемы `addUser` в `lib/gateway/operationsCatalog.ts`.

4. **Один файл — один роут**: `api/v1/{op}.ts` содержит только вызов `handleV1OpRoute(ctx, '<op>', req)` (генерация `node scripts/gen-api-v1-routes.cjs`). Отдельно `api/v1/operations.ts` для `GET /v1/operations`.

5. **Согласованность файлов и реестра**: `node scripts/check-gateway-catalog-consistency.cjs`.

## Последствия

- Изменение списка `op` требует обновления JSON, перегенерации скриптов и коммита артефактов.
- Логика изменяется преимущественно в `handleV1OpRoute` и клиентах GC, а не в 59 копиях.
