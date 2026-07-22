# ADR-0004: Рукописный каталог, per-op хендлеры и raw-журналы Heap

## Статус

Принято (26-05-2026). Заменяет ADR-0003.

## Контекст

После этапа 1 рефакторинга (ADR-0003) архитектура gateway включала:

- codegen-пайплайн: три скрипта генерировали `*.generated.ts` из `config/gc-op-http-mapping.json` и OpenAPI JSON;
- центральный обработчик `handleV1OpRoute.ts` со встроенным выбором контура (не per-op);
- события workspace через `gatewayWorkspaceEvents.ts` (`@start/sdk`) как механизм наблюдаемости;
- аналитику `api/gateway-analytics/invocations.ts` поверх серверных Heap-логов (in-memory фильтрация).

Задача рефакторинга этапа 2 — привести архитектуру к модели соседнего проекта `p/units/yakovleva/pay` (единая точка отсчёта, принятая командой).

## Решение

### 1. Рукописный каталог вместо codegen

`lib/gateway/operationsCatalog.ts` переписан как статический массив `operationsCatalog: OperationEntry[]` (59 записей). Каждая запись содержит:

- метаданные: `op`, `contour`, `httpMethod`, `pathTemplate`, `availability`, `legacyImportAction`;
- `argsValidator` — объект `s.object(...)` из `@app/schema` для runtime-валидации;
- `argsSchema` — plain-описание полей `fields[]` для отдачи клиентам через `GET /v1/operations`.

Удалены: `scripts/` (4 скрипта), `config/gc-op-http-mapping.json`, `lib/gateway/gcOpHttpMapping.generated.ts`, `lib/gateway/v1OpArgsSchemas.generated.ts`, `shared/v1OpsList.generated.ts`.

**Мотивация:** каталог из 59 фиксированных операций меняется редко; рукописный файл читается и правится без инструментальной цепочки; нет расхождений между источником и артефактом; полная согласованность с моделью lifepay.

### 2. Per-op хендлеры и новый общий обработчик

Введён `lib/gateway/handleV1Op.ts` (`handleV1Op(ctx, req, op, handler)`, `handleV1OpWithGcDiagnostic`) — общий конвейер проверок (catalog → method → availability → body-size → school-headers → devKey → content-type/body → args-schema → path-template → вызов per-op handler → interpretGcContourResponse) + запись raw-журналов в `finally`.

Каждый из 59 файлов `api/v1/{op}.ts` экспортирует `{op}Handler: V1GcHandler` (явный выбор клиента: `invokeNewGcApi` / `invokeLegacyGcImportPost` / `invokeLegacyGcExportGet`) и `{op}Route` (`app.get/post('/')` → `handleV1Op(...)`).

Реестр `lib/gateway/v1OpHandlers.ts` (`V1_OP_HANDLERS: Record<op, V1GcHandler>`, `findV1OpHandler`) — единый путь: и файловые роуты, и тест-раннер используют одни и те же per-op хендлеры.

`lib/gateway/handleV1OpRoute.ts` сведён к совместимостному shim (вызов через реестр → `handleV1Op`), необходим `v1AddUserHandler.ts` и тест-раннеру на период миграции.

**Мотивация:** явный выбор клиента GC в файле роута убирает скрытую маршрутизацию; реестр обеспечивает единый путь исполнения для роутов и тест-раннера; структура 1:1 совпадает с lifepay — упрощает ревью и поддержку.

### 3. Raw-журналы Heap вместо workspace-событий

Удалены: `lib/gateway/gatewayWorkspaceEvents.ts` (`writeWorkspaceEvent` / `getWorkspaceEventUrl` из `@start/sdk`), `api/gateway-analytics/invocations.ts`, `api/gateway-analytics/filter-save.ts`.

Введены две Heap-таблицы:

- `gatewayRequestLog` (UID `t__saas-gw-gc__greq__Gr9Qm2`) — запись на каждый входящий `/v1/{op}`;
- `gatewayUpstreamLog` (UID `t__saas-gw-gc__gups__Up7Mn3`) — запись на каждый исходящий вызов GC.

Связь по `requestId`. PII/секреты маскируются через `shared/redactRaw.ts` (`redactRawDeep`, лимит 64 KiB).

Аналитика: admin-эндпоинты `api/admin/raw/{requests,upstream}/{recent,get}.ts`, `api/admin/dashboard/gatewayCounts.ts`; подсчёт через `countBy`/`where` (не `findAll().length`).

Фильтр по дате перемещён в `api/admin/analytics/filter-save.ts` (прежний путь `gateway-analytics/filter-save` удалён).

**Мотивация:** события workspace через `@start/sdk` — непрямая и менее надёжная зависимость; raw-журналы в Heap дают полный контроль над хранением и запросами; структура аналогична lifepay; аналитика через нативные Heap-примитивы (`countBy`, `where`) без in-memory фильтрации.

### 4. Изменение формата `GET /v1/operations`

Ответ переведён с TypeBox JSON-Schema на plain-массив `fields[]` через `toOperationSummaries()`. Формат описан в `shared/operationsCatalogShared.ts` (`// @shared`, тип `OperationSummary`). UI `pages/TestsPage.vue` получает `operationsList: OperationSummary[]` через SSR-проп из `web/tests/index.tsx`.

**Это изменение публичного контракта** `GET /v1/operations`.

## Последствия

- Каталог правится вручную в `lib/gateway/operationsCatalog.ts`; codegen-пайплайн полностью удалён.
- Тест-раннер (`v1OpsSuiteRunner.ts`) и `v1AddUserHandler.ts` работают через shim (`handleV1OpRoute`) до следующего этапа миграции.
- Потребители `GET /v1/operations` получают `fields[]`, а не TypeBox-схему — несовместимое изменение формата.
- Наблюдаемость полностью переведена на Heap; `@start/sdk` в gateway не используется.
