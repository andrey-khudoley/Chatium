# Сценарий A — landing-lead (client1)

## Назначение

`p/units/chatiumclub/client1` реализует **сценарий A** интеграции с GetCourse: посетитель лендинга оставляет лид → приложение через локальный SDK gateway-клиент вызывает `addUser` (и опционально `createDeal`) на gateway → gateway проксирует вызовы к Legacy API GetCourse школы. Heap-таблица `Leads` фиксирует все попытки (успех и ошибка) для счётчиков админки и аудита.

Спецификация: `obsidian://second-brain/03_Projects/active/course-chatium-gc-integration-3fa7c2/docs/specifications/clients/landing-lead/app-scenario-a-landing-lead.md`.

## Поток

1. POST `/api/lead/submit` (анонимно): `{ email, name, phone?, utmSource?, utmCampaign?, landingId?, customFields?, offerCode? }`.
2. `lib/leadFlow.processLead`:
   - валидация (`validateLeadInput`): email формат, имя, телефон;
   - `invoke(ctx, { op: 'addUser', args: buildAddUserArgs(input) })` через `lib/gateway/gatewayClient`;
   - если задан `offerCode` и `addUser.ok` → `invoke(ctx, { op: 'createDeal', args: buildCreateDealArgs(input) })`;
   - запись в Heap-таблицу `Leads` (всегда, даже при ошибке gateway), идентификатор `gatewayRequestId` сохраняется для трассировки.
3. Ответ роуту: `{ success, leadId?, addUser, createDeal, validationErrors? }`.

## Конфигурация

В админке (POST `/api/settings/save`) задаются три gateway-настройки (см. `lib/settings.lib`, ключи `GATEWAY_URL`, `GC_SCHOOL_HOST`, `GC_SCHOOL_API_KEY`):

| Ключ                | Описание                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `gateway_url`       | Базовый URL gateway без хвостового `/`. Пример: `https://s.chtm.khudoley.pro/p/saas/gw/gc`. |
| `gc_school_host`    | Хост школы GC без схемы. Пример: `myschool.getcourse.ru`.                                   |
| `gc_school_api_key` | API-ключ школы (не логируется в открытом виде).                                             |

`getGatewayClientSettings(ctx)` возвращает все три значения; `gatewayClient.invoke` использует их для заголовков `X-Gc-School-Host`, `X-Gc-School-Api-Key`.

## SDK-клиент

`lib/gateway/gatewayClient.ts` — локальная копия тонкого SDK (`p/units/chatiumclub/sdk`) внутри проекта (см. ADR-0004 в gateway). Это обеспечивает изоляцию от соседних приложений и убирает inter-app HTTP-overhead.

Поддерживаемые `op` берутся из `shared/v1OpsList.generated.ts` (синхронизированный с реестром gateway). В client1 используются: `addUser`, `createDeal`.

## Тесты

- `lib/tests/leadFlowSuite.ts` — синхронные юнит-проверки `validateLeadInput`, `buildAddUserArgs`, `buildCreateDealArgs`.
- `api/tests/scenario/index.ts` (GET `/api/tests/scenario`) — раннер сценарных юнит-тестов; на провалы пишет серверные логи severity 3 через `logTestRunFailures`.
- Базовые юнит/интеграционные наборы (templateUnitSuite, integrationSuite) сохраняются — общая инфраструктура шаблона.

## Логирование

- Все ключевые точки (`processLead`, `validateLeadInput`, `invoke addUser`, `invoke createDeal`, exit) пишут в `loggerLib.writeServerLog` с severity 6 (entry/exit), 4 (нештатное), 3 (ошибка).
- В payload не попадают `gc_school_api_key` и сами ответы gateway, кроме `requestId`, `gatewayHttpStatus`, `error.code`.
- Логи доступны в админке `/web/admin` (real-time через WebSocket) и в Heap-таблице `Logs`.

## Допущения и ограничения

- Защита от спама на роуте `submit` (rate-limit, captcha) не реализована — это ответственность лендинга или внешнего фронта.
- `customFields` передаются как есть; ответственность за маппинг ключей на пользовательские поля GC лежит на вызывающей стороне.
- `offerCode` опционален — без него `createDeal` пропускается, лид только регистрируется как пользователь.
