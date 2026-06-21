# Architecture

## Назначение

`p/units/yakovleva/pay` — клиентская панель Payments Client (implementation-plan §1.8). Одно Chatium-приложение совмещает три роли:

1. **Хранилище секретов магазина** (`lp_apikey`, `lp_login`, `lp_webhook_token` и optional gateway URL override'ы) в Heap-настройках.
2. **Серверная прокладка** `POST /api/gateways/invoke` между UI и payments-gateway с журналом запросов в Heap.
3. **Приёмник webhook LifePay** `POST /webhooks/lifepay?token=...` с журналом и дедупликацией.

Запросы к gateway идут напрямую по HTTP, без отдельного SDK-приложения (решение §12.1 manual, пересмотр 15-05-2026). Внутренние gateway roots и `GATEWAY_API_PREFIX` задаются в `config/gatewayUrls.ts`; пустые `gateway_base_url`, `lava_base_url`, `gc_base_url` означают auto-URL текущего workspace.

## Ограничения платформы

- Серверная инфраструктура — Chatium.
- Нельзя менять стек и зависимости (`@app/*`, `@pay/sdk` и т.п.).
- Деплой — автоматически при пуше.
- npm недоступен. QR-код во вкладке «Создать запрос» — через CDN `cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js` (UMD-сборка node-qrcode v1.5.1, выставляет `window.QRCode.toCanvas`). Загрузка при mount; при недоступности UI деградирует к текстовому отображению paymentUrl. QR рисуется только для операций, чей descriptor задаёт `paymentUrlPath`.

## Роли и сценарии

- **Admin** (Андрей-разработчик) — полный доступ ко всем `/api/gateways/*`, `/api/access/*`, `/`, `/web/admin`, `/web/tests`. Проходит `requireInternalAccess` без записи в `panel_access`.
- **Сотрудник школы (не-Admin)** — доступ к `/` и `api/gateways/*` при наличии активной записи в `panel_access`. Запись создаётся через одноразовую пригласительную ссылку (ADR 0003 / §1.11, реализовано 2026-05-24).
- **Анонимный + token-в-query** — только `POST /webhooks/lifepay` (LifePay).
- **Авторизованный без гранта** — попадает на `/web/forbidden` (403); может получить доступ через инвайт-ссылку `/web/access/invite?token=`.

Основные сценарии:

- Открыть `/web/admin` или `Настройки -> Плагины`, заполнить секреты LifePay/Lava.Top/GetCourse. Gateway base URL заполняется только как внешний override; пустое значение использует gateway текущего workspace.
- На вкладке «Создать запрос» выбрать операцию из дропдауна (группы — по подключённым гейтвеям LifePay / Lava.Top / GetCourse), заполнить динамическую форму, отправить запрос. Для операций, возвращающих `paymentUrl` (`LifePay.createBill`, `Lava.Top.createInvoice`), на странице сразу отрисуется QR-код. Для GC-операций форма перестраивается из `argsSchema.fields` ответа гейтвея.
- На вкладке «Формат запросов» — контракты `POST /api/gateways/invoke` (LifePay createBill, Lava.Top createInvoice) и подписка на socket уведомлений об оплате (`POST /api/gateways/payment-socket` + `@app/socket`) в виде атомарных копируемых сниппетов. Источник истины — `shared/requestFormatSamples.ts` (`buildRequestFormatSamples({ invokeUrl, paymentSocketUrl })`); рендер — `components/home/HomeRequestFormatTab.vue` (декларативный, без бизнес-логики).
- Оплатить QR со смартфона, получить webhook от LifePay, увидеть запись в журнале.

## Контур интеграции с payments-gateway

```
[ Admin UI (pages/HomePage.vue → компонент ClientHomePage) ]
            |
            | fetch POST /api/gateways/invoke { gatewayId, op, args, httpMethod? }
            v
[ api/gateways/invoke.ts (guardInternalApi) ]
            |
            | invokeByGateway(ctx, gatewayId, op, args, meta?)
            | — LifePay:  читает lp_apikey/lp_login + gateway_base_url/auto; X-Lp-Apikey/X-Lp-Login
            | — Lava.Top: читает lava_test_apikey + lava_base_url/auto; X-Lava-Apikey
            | — GC:       читает gc_base_url/auto + gc_test_school_api_key/gc_test_school_host;
            |             X-Gc-School-Api-Key/X-Gc-School-Host; httpMethod обязателен
            v
[ gateway URL resolver (config/gatewayUrls.ts) -> selected gateway endpoint ]
            |
            v
[ LifePay / Lava.Top / GetCourse HTTP API ]

Ответ gateway (с заголовком X-Gateway-Request-Id) → возвращается клиенту без изменений,
параллельно пишется в Heap-таблицу request_log с gatewayId.
```

## Роутинг

File-based, один файл = один роут с путём `/`:

- `index.tsx` — главная `/` (requireRealUser + requireInternalAccess; аноним → /s/auth/signin, без гранта → /web/forbidden; SSR-пропсы для `pages/HomePage.vue`, компонент `ClientHomePage`). Загружает в т.ч. виджет-настройки (`initialWidgetSettings`), `anchorBaseUrl` и `initialGcEnabled` — для вкладки «Настройки» главной. Инжект CSS: `pagecss/sbpHomeCss1..4.ts` + `pagecss/sbpAdminCss1..4.ts` + `pagecss/sbpWidgetsCss1.ts` + `pagecss/sbpSettingsCss1.ts`. Вкладка «Настройки» переехала на собственный визуальный язык в стиле главной (`.panel-section`, `.prompt`, `.st-*`); `.ap-*` / `.aw-*` оставлены для обратной совместимости форм submit, но новая разметка их больше не использует.
- `web/admin/index.tsx` — системные настройки `/web/admin` (**только Admin** — `requireAccountRole(ctx, 'Admin')`). Загружает только инфра/секреты: `initialSettings` (LifePay), `initialLavatopSettings`, `initialGcSettings`. Operational-настройки (gc_enabled, виджеты) сюда **не** попадают — они на главной. Инжект CSS из `pagecss/sbpAdminCss1..4.ts`.
- `web/profile/index.tsx`, `web/login/index.tsx`, `web/tests/index.tsx` — шаблонные.
- `web/panel/index.tsx` — редирект на `/` (легаси-совместимость).
- `webhooks/lifepay/index.tsx` — приёмник webhook LifePay (POST, анонимный + токен).
- `web/access/invite/index.tsx` — страница инвайта `/web/access/invite?token=` (requireRealUser; не расходует инвайт). (ADR 0003.)
- `web/forbidden/index.tsx` — страница 403 `/web/forbidden` (requireRealUser). (ADR 0003.)
- `api/gateways/invoke.ts` — POST прокладка к gateway (requireRealUser + requireInternalAccess).
- `api/gateways/recent-requests.ts`, `api/gateways/recent-webhooks.ts` — GET журналы (requireRealUser + requireInternalAccess).
- `api/gateways/analytics/summary.ts` — GET карточки аналитики (requireRealUser + requireInternalAccess).
- `api/gateways/analytics/filter-save.ts` — POST сохранение/сброс глобального фильтра панели (requireRealUser + requireInternalAccess).
- `api/gateways/search-by-request-id.ts` — GET поиск (requireRealUser + requireInternalAccess).
- `api/gateways/raw-request.ts`, `api/gateways/raw-webhook.ts` — GET raw-записи (requireRealUser + requireInternalAccess).
- `api/gateways/payment-socket.ts` — POST выдача `encodedSocketId` для подписки на канал уведомлений об оплате (requireRealUser + requireInternalAccess). Имя канала — `pay-payment-<correlationId>` (`shared/paymentSocket.ts`); сервер публикует сообщения в канал из webhook-приёмников через `sendDataToSocket`.
- `api/access/consume-invite.ts` — POST потребление инвайта (requireRealUser). (ADR 0003.)
- `api/access/generate-invite.ts`, `api/access/revoke-invite.ts`, `api/access/revoke-grant.ts` — POST Admin-управление. (ADR 0003.)
- `api/access/invites.ts`, `api/access/grants.ts` — GET списки для Admin. (ADR 0003.)
- `api/settings/*`, `api/logger/*`, `api/admin/*`, `api/tests/*` — без изменений (шаблон).

Все ссылки и редиректы — через `withProjectRoot` / `withProjectRootAndSubroute` (хардкод URL запрещён).

## Разделение слоёв

| Слой              | Каталог                     | Ответственность                                                                                                                               |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Таблицы**       | `tables/`                   | Схемы Heap (поля, типы)                                                                                                                       |
| **Репозитории**   | `repos/`                    | Работа с БД (Heap-операции)                                                                                                                   |
| **Бизнес-логика** | `lib/`                      | Правила, дефолты, валидации, gateway-клиент, webhook-обработка, SSR-хелперы                                                                   |
| **API**           | `api/`, `webhooks/lifepay/` | HTTP-эндпоинты, парсинг, авторизация                                                                                                          |
| **Pages**         | `pages/`                    | Vue (SSR + клиент); без импортов tables/repos/lib. Страницы — оркестраторы над подкомпонентами                                                |
| **Components**    | `components/`               | Переиспользуемые Vue-компоненты. Подкаталоги: `home/`, `admin/`, `tests/`; корень: Header, LogStreamPanel, AppFooter и др.                    |
| **pagecss/**      | `pagecss/`                  | CSS-модули (строковые константы), импортируются только в TSX-роутах через `<style>{...}</style>`. Vue-компоненты не содержат `<style scoped>` |
| **Web (SSR)**     | `web/`                      | Файловые роуты страниц                                                                                                                        |

Поток данных:
`HTTP → API → lib → repos → Heap` (никаких прямых импортов `tables/` из API).

**Перенос SSR-хелперов в `lib/` (2026-05-26):** `shared/preloader.ts` и `shared/logLevel.ts` перенесены в `lib/preloader.ts` и `lib/logLevel.ts`. Оба являются серверными SSR-вспомогательными модулями (используются только в TSX-роутах), импорт из `.vue` запрещён. Перенос устранил нарушение слоёв: серверный код не должен лежать в `shared/`.

**Общий компонент `components/LogStreamPanel.vue` (2026-05-26):** визуальная лог-панель с загрузкой, фильтрами, отображением и разворачиванием записей. Используется в `pages/AdminPage.vue` (expand-all выключен) и `pages/TestsPage.vue` (expand-all включён). Socket-lifecycle, счётчики, sink и дедупликация остаются на страницах; записи форвардятся в панель через `pushEntry`, первая загрузка — `loadRecent` (контракт через `defineExpose`).

## Стратегия логирования

Без изменений из шаблона: syslog RFC 5424, `lib/logger.lib.ts`, ключ `log_level` (Debug / Info / Warn / Error / Disable). Секреты (`apikey`, `login`, `lp_webhook_token`) **никогда** не пишутся в `writeServerLog.payload`. `argsRedacted` и `rawResponseBody` в `request_log`, а также `rawBody`/`rawQuery`/`email` в `webhook_log` хранятся **сырыми** — клиент является оператором персональных данных по 152-ФЗ и имеет полный доступ к данным платежей. Структурная гигиена (циклы/несериализуемое/усечение по 64KB) — через `shared/prepareRawLog.ts`. Маскирующие утилиты `shared/redact.ts` / `shared/redactRaw.ts` оставлены в коде с их юнит-тестами, но в production-пути не используются.

**Уровни логирования в цепочке виджета (`POST /api/widgets/config`):**

- **Info (severity 6):** запись `success` — итог запроса с агрегатными флагами (`positionsCount`, `*OfferOk`, `*AmountOk`). Массив id офферов из соображений приватности и объёма не включается.
- **Debug (severity 7):** полная трассировка цепочки — `positions_parsed` (сырые id офферов), `amount_resolve_start`, `amount_resolved` (кэш/GC), `decision` (решение per-метод: все входные параметры и финальный `enabled`). В `resolveGcDealAmount` (`lib/gateway/gcDealResolver.ts`) — `entry` и `fields_extracted`.
- **Warning (severity 4):** `body_invalid` — невалидный запрос (3 точки вызова: тело не парсится, `dealId` отсутствует, `dealId` невалиден при наличии проверки суммы).

Для диагностики решений о доступности виджета включить `log_level=Debug` в `/web/admin`. При Info поток содержит только `success` и `body_invalid` (warnings).

**Уровни логирования в gateway-слое (`lib/gateway/`) — расширено 2026-06-02:**

Все публичные функции gateway-слоя покрыты структурированными логами через `loggerLib.writeServerLog`. Семантика уровней:

- **Debug (severity 7):** сырые данные, промежуточные вычисления, выбор ветки — `argsKeys`, age кэша, выбор конкретного gateway в switch `invokeDispatcher`, cache hit/miss/set в `gcDealCache`. Примеры: запись `cache_hit` с полем `ageMs`; запись `cache_miss` с полем `reason` (`expired` или `no_entry`); запись `gateway_selected` с полем `gatewayId`.
- **Info (severity 6):** точки входа в публичные функции с ключевыми параметрами — `gatewayId`, `op` — без сырых аргументов и тела ответа. Пример: запись `invoke_entry` в `invokeByGateway`.
- **Warning (severity 4):** потенциально значимые события, не блокирующие выполнение — cache miss как информация об отсутствии записи, `delete_stale_error`, `event_not_found` в webhook.
- **Error (severity 3):** ситуации, требующие вмешательства разработчика — `parse_error`, `write_error` при сбое записи в Heap.

**Fail-open паттерн в catch-блоках:** все вызовы `writeServerLog`, расположенные внутри catch-блоков, дополнительно обёрнуты в собственный try/catch. Это исключает ситуацию, при которой сбой самого логирования прерывал бы основной поток или маскировал исходную ошибку. Реализовано в `gcDealCache.ts` (catch-блоки set/delete) и применяется как стандарт для всех новых catch-обработчиков в `lib/gateway/`.

## Интеграции

- **LifePay gateway** — контракт: `POST/GET <GATEWAY_API_PREFIX>/<op>`, заголовки `X-Lp-Apikey`, `X-Lp-Login`, ответ `X-Gateway-Request-Id`. Без ретраев. Таймаут 15 секунд. Webhook от LifePay приходит на `/webhooks/lifepay?token=...&correlationId=<uuid>`.
- **Lava.Top gateway** — контракт: `POST/GET <GATEWAY_API_PREFIX>/<op>`, заголовок `X-Lava-Apikey`, ответ `X-Gateway-Request-Id`. Без ретраев. Webhook от Lava.Top — на `/webhooks/lavatop`.
- **GetCourse gateway** — контракт: `POST/GET <GATEWAY_API_PREFIX>/<op>`, заголовки `X-Gc-School-Api-Key`, `X-Gc-School-Host`, ответ `X-Gateway-Request-Id`. Без ретраев. Каталог enabled-операций читается SSR-функцией `fetchGcOperations(ctx)` через operations endpoint с graceful degradation (при недоступности gateway группа GC в UI не отображается). Webhook от GC не реализован (MVP).

Base URL каждого gateway резолвится через `lib/settings.lib.resolveGatewayBaseUrl`: непустая системная настройка используется как override, пустая собирается из `ctx.account.host` и `config/gatewayUrls.ts`.

## Механизм correlationId-связки и верификации вебхуков (обновлено 2026-06-01)

**Проблема:** LifePay в SBP-webhook возвращает `order.number = null`, `orderNumber = ""`, поэтому связать входящий webhook с исходным `createBill` по `orderNumber` невозможно.

**Решение — сквозной correlationId:**

```
[ pages/HomePage.vue (submitRequest, компонент HomeCreateRequestTab) ]
  1. generateCorrelationId()  →  uuid
  2. callbackUrl += ?correlationId=<uuid>   (shared/correlation.appendCorrelationId)
  3. args.correlationId = uuid
  4. POST /api/gateways/invoke { gatewayId, op, args, httpMethod? }
                |
[ api/gateways/invoke.ts ]
  5. extractCorrelationId(args) → сохраняет в request_log.correlationId
  6. удаляет correlationId из args перед invokeGateway (gateway его не ждёт)
                |
[ LifePay → webhook → /webhooks/lifepay?token=...&correlationId=<uuid> ]
  7. extractCorrelationId(req.query) → пишет в webhook_log.correlationId

[ api/gateways/search-by-request-id ]
  8. Параллельный поиск: findByOrderNumberInRange + findByCorrelationIdInRange
  9. mergeWebhooksById — объединение без дублей (id-ключ), сортировка по processedAt desc
```

Модуль `shared/correlation.ts` (`// @shared`) — чистые функции без Heap/ctx: доступны на клиенте (Vue), сервере (api/gateways) и в юнит-наборе. Поле `correlationId` в обеих таблицах — `Heap.Optional String` без `searchable` (точный `where`-матч не требует searchable, ср. фильтры по `status`/`tokenValid`).

**Guard «legacy-strict» — верификация происхождения вебхука (2026-06-01):**

`correlationId` используется не только для связки записей, но и как механизм верификации: вебхук без известного `correlationId` не обрабатывается. Guard расположен в `webhooks/lifepay/index.tsx` после проверки токена, до чтения тела:

```
POST /webhooks/lifepay?token=...&correlationId=<id>
  → validateToken (403/401/503 при ошибке)
  → guard «legacy-strict»:
      нет correlationId в query → 200 OK, без записи, reason=correlationId_missing
      есть correlationId → countCreateBillByCorrelationId(ctx, correlationId)
        count = 0 → 200 OK, без записи, reason=correlationId_not_found
        сбой БД  → 200 OK, без записи (строгая политика, severity 2)
        count > 0 → продолжить обработку
  → unwrapWebhookBody / parseWebhookBody / запись в webhook_log / дедупликация / socket
```

Цель: принимать только вебхуки по заказам, явно созданным через панель (`invokeByGateway('lifepay','createBill')` из `intent-by-deal` или `api/gateways/invoke`). Осознанный риск: при затяжном сбое Heap вебхук потеряется (guard строгий, не пропускает при неопределённости).

## Внутренняя авторизация (ADR 0003 / §1.11, реализовано 2026-05-24)

Двухуровневая модель доступа для всех защищённых роутов (`/`, `api/gateways/*`):

```
requireRealUser(ctx)           — реальный авторизованный пользователь
guardInternalApi(ctx)          — requireRealUser + requireInternalAccess:
                                   Admin → проход всегда
                                   не-Admin → активная запись в panel_access, иначе HTTP 403
```

Поток выдачи доступа:

1. Admin генерирует инвайт (`api/access/generate-invite`) → получает одноразовый URL `/web/access/invite?token=`.
2. Сотрудник переходит по ссылке → страница подтверждения (`pages/InviteAcceptPage.vue`).
3. Сотрудник нажимает «Подтвердить» → `POST /api/access/consume-invite` под `runWithExclusiveLock` → запись в `panel_access`, инвайт помечается `usedAt`.
4. На последующих заходах сотрудник проходит `requireInternalAccess` через `repos/panelAccess.repo.ts`.

Admin может отозвать инвайт (`revoke-invite`) или грант (`revoke-grant`). Ключевой инвариант: переход по URL инвайта не расходует его — расход только при нажатии «Подтвердить».

## Декомпозиция страниц (реализовано 2026-05-28)

Страницы переведены в паттерн «оркестратор + подкомпоненты». Вся CSS вынесена в `pagecss/`.

### `pages/HomePage.vue` (компонент `ClientHomePage`)

Оркестратор главной панели. Подкомпоненты в `components/home/`:

- `HomeStatusStrip.vue` — полоска статуса конфигурации (read-only).
- `HomeToolbar.vue` — трёхрядный sticky-тулбар: первичные разделы + вторичные вкладки активного раздела + инструменты (фильтр дат / LIVE / поиск; показываются только для раздела «Мониторинг»).
- `HomeSearchResult.vue` — результат поиска по requestId.
- `HomeOverviewTab.vue` — вкладка «Обзор» (аналитические карточки).
- `HomeRequestsTab.vue` — вкладка «Запросы» (журнал `request_log`).
- `HomeWebhooksTab.vue` — вкладка «Webhook» (журнал `webhook_log`).
- `HomeCreateRequestTab.vue` — универсальная вкладка «Создать запрос». Дропдаун операций сгруппирован `optgroup`'ами по гейтвеям (LifePay / Lava.Top / GetCourse); форма перестраивается из `shared/operationsClientCatalog.ts` (типы + операции) и `shared/operationsClientForm.ts` (валидация, сборка `args`, начальное состояние). Для GC-операций ветка `v-if="isGcOp"` рендерит `<HomeGcRequestForm/>` вместо стандартной формы. QR рендерится только если у операции задан `paymentUrlPath` и в ответе он есть.
- `HomeGcRequestForm.vue` — Options API компонент иерархической формы GC-операций. Принимает пропы `gcFormRows` (`FormRow[]`), `gcRootKind`, `gcArgsValues`, `gcErrors`. Группы (`FormGroup`) рендерятся как `fieldset` с отступом; листья (`FormLeaf`) — как поля `LeafInput`. Корневой не-object тип → единый `__root__` textarea. Не содержит бизнес-логики — только рендер.
- `HomeSettingsTab.vue` — вкладка «Настройки» (доступ — сотрудник + Admin через `requireInternalAccess`, реализовано 2026-05-29). Контейнер для operational/business-настроек. Содержит две карточки:
  1. **GetCourse** (`gc_enabled`) — единственное локальное поле. SSR-проп `initialGcEnabled: boolean`. Сохранение через `saveOperationalSettingRoute.run(ctx, ...)` (whitelist в endpoint-е допускает только operational-ключи, `guardInternalApi`).
  2. **Виджеты оплаты** (`HomeWidgetSettings`) — карточка с виджет-ключами (enabled/min/max/offer-фильтр для LifePay и Lava.Top), перенесена из `/web/admin`. Сохранение через `widgetSettingsSaveRoute.run(ctx, ...)` (whitelist `WIDGET_SETTING_KEYS`, `guardInternalApi`).
     Стили карточек используют `ap-*` / `aw-*` (admin/widget CSS) — `index.tsx` главной инжектит `sbpAdminCss1..4` + `sbpWidgetsCss1` дополнительно к `sbpHomeCss1..4`.
- `HomeWidgetSettings.vue` — карточка виджетов на главной (`<script setup lang="ts">`). Loader офферов — `widgetOffersRoute.run(ctx)` (`guardInternalApi`). Использует `HomeWidgetOfferList.vue` для секции фильтра офферов.
- `HomeWidgetOfferList.vue` — переиспользуемая секция фильтра офферов (whitelist/blacklist + поиск + чекбоксы). Loader передаётся пропом из родителя.
- `HomeAccessTab.vue` — вкладка «Доступ» (Admin: инвайты и гранты).
- `HomeRawModal.vue` — модалка raw-данных.
- `HomeCreateInviteModal.vue` — модалка создания инвайта.

Логика (Options API mixin): `pages/sbpHomePageMixin.ts`. Форматтеры, helpers и разделы навигации (чистые, без Heap/ctx): `shared/sbpHomeFormat.ts` — содержит `sbpHomeTabs()`, `sbpHomeSections()`, `sbpSectionForTab()`, тип `SbpHomeTabGroup` (`'monitoring'|'tools'|'config'|'access'`). CSS: `pagecss/sbpHomeCss1.ts`..`sbpHomeCss4.ts`.

**Иерархическая форма GC (реализовано 2026-05-29):**

`sbpHomePageMixin.ts` содержит computed-блок для GC-ветки:

- `isGcOp` — true, если выбранная операция принадлежит гейтвею `'gc'`.
- `gcEntry` — `GcOperationEntry` из `shared/operationsClientCatalog.ts`; поле `argsTree?: ArgsTreeNode` добавлено к типу записи.
- `gcFormRows` — `FormRow[]`; вычисляется через `buildFormRows(gcEntry.argsTree)` из `shared/gcArgsForm.ts`. Единственный источник истины для структуры иерархии.
- `gcRootKind` — `'object' | 'scalar'`; определяет, рендерить ли отдельные поля или `__root__` textarea.
- `prepareGcSubmit(gcArgsValues, gcErrors)` — валидация через `buildFieldErrors` (из `shared/gcArgsForm.ts`) и сборка `args` через `buildArgsObject`; для `__root__` — `JSON.parse`. Возвращает `{ args, errors }`.

`shared/gcArgsForm.ts` — локальные wire-типы `ArgsTreeNode` / `ArgsTreeField` и чистые хелперы формы (`buildFormRows`, `buildArgsObject`, `buildFieldErrors`, `jsonPlaceholder`, `FormRow`, `FormGroup`, `FormLeaf`, `LeafInput`). Кросс-проектных импортов нет: published-проект собирается внутри собственного project root.

`lib/gateway/gcOperationsLoader.ts` — парсит `argsTree` из ответа `GET /v1/operations` GC-гейтвея в `normalizeEntry`. При изменении схемы полей на стороне `p/gateways/getcourse` клиент правок не требует.

### `pages/AdminPage.vue`

Оркестратор системной страницы настроек (**только Admin**, `requireAccountRole('Admin')`). Подкомпоненты в `components/admin/`: `AdminCounters.vue`, `AdminProjectSettings.vue`, `AdminLogLevel.vue`, `AdminLifePaySettings.vue`, `AdminLavatopSettings.vue`, `AdminGcSettings.vue` (карточка настроек GetCourse: 3 поля — base URL, school api key, school host). Здесь живут только секреты, URL/host и инфраструктурные/debug-настройки. Operational/business-настройки (флаг активации GC, виджеты оплаты) переехали на вкладку «Настройки» главной панели — их редактируют сотрудники. Composable WebSocket-потока логов: `shared/useLogsSocket.ts`. CSS: `pagecss/sbpAdminCss1.ts`..`sbpAdminCss4.ts`. SSR-роут `web/admin/index.tsx` читает только LP/Lava/GC настройки.

### Разделение «системные / operational» настройки

Принципиальное разграничение (введено 2026-05-29):

- **Системные** (`/web/admin`, **только Admin**, `requireAccountRole('Admin')`): счётчики дашборда, project_name, log_level, секреты LP (`lp_apikey`, `lp_login`, `lp_webhook_token`, optional `gateway_base_url`), секреты Lava.Top (`lava_test_apikey`, optional `lava_base_url`, `lava_webhook_secret`), секреты GC (optional `gc_base_url`, `gc_test_school_api_key`, `gc_test_school_host`).
- **Operational** (главная панель → вкладка «Настройки», **сотрудник + Admin** через `guardInternalApi`): `gc_enabled` (флаг активации GC), виджет-ключи (`widget_lifepay_*`, `widget_lavatop_*` — enabled, min/max, offer-фильтр).

Auth-разделение на уровне save-эндпоинтов:

- `api/settings/save.ts` — общий `setSetting`, `requireAccountRole('Admin')` (для LP/Lava/GC карточек админки).
- `api/settings/save-operational.ts` — whitelist `[gc_enabled]`, `guardInternalApi` (для `HomeSettingsTab`).
- `api/widgets/settings-save.ts` — whitelist `WIDGET_SETTING_KEYS`, `guardInternalApi` (для `HomeWidgetSettings`).
- `api/widgets/settings-get.ts`, `api/widgets/offers.ts` — `guardInternalApi`.

### `pages/TestsPage.vue`

Оркестратор. Подкомпоненты в `components/tests/`: `TestsToolbar.vue`, `TestsMetrics.vue`, `TestSuiteTab.vue`. Composable управления наборами тестов: `shared/useTestSuites.ts`. Чистые хелперы: `shared/testSuiteHelpers.ts`. CSS: `pagecss/sbpTestsCss1.ts`..`sbpTestsCss3.ts`.

### Прочие CSS-модули

- `pagecss/sbpProfileCss1.ts` — ProfilePage.
- `pagecss/sbpHeaderCss1.ts`, `sbpHeaderCss2.ts` — Header.vue.
- `pagecss/sbpLogStreamCss1.ts`, `sbpLogStreamCss2.ts` — LogStreamPanel.vue.

CSS-файлы содержат именованные строковые константы с уже неймспейснутыми классами (`home-`, `ap-`, `tp-`, `lsp-`). Импортировать только в TSX-роутах; в `.vue`-файлы запрещено.

## Паттерн автосохранения настроек главной панели

Вкладки «Настройки», «Виджеты оплаты» и «Страница оплаты» используют единый паттерн автосохранения — по образцу системной админки `/web/admin`.

### Composable `shared/useSettingsAutoSave.ts`

Реализует debounced-очередь сохранений. Принимает функцию сохранения одной пары `{key, value}` (через `route.run`); внутри ведёт карту debounce-таймеров — по одному на каждый ключ настройки.

**Публичный интерфейс:**

- `queue(key, value)` — поставить сохранение в очередь с debounce (не ждёт результата).
- `flush(key, value)` — немедленное сохранение; возвращает `Promise<boolean>` (успех). Используется для тумблеров — при ошибке вызывающий компонент откатывает UI-состояние.
- `saving` / `saveStatus` / `error` — реактивные состояния для UI-индикации.
- Счётчик параллельных сохранений; очистка таймеров в `onBeforeUnmount`.

### Использование в компонентах

| Компонент                                | Применение                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/home/HomeSettingsTab.vue`    | Тумблер `gc_enabled` → `flush` с откатом при ошибке                                                                                                                                                                                                                                                                                                                                                            |
| `components/home/HomeWidgetSettings.vue` | По одному экземпляру composable на секцию (LifePay/Lava.Top); тумблер `enabled` → `flush`; текстовые/числовые поля → `watch` + `queue` (debounce); инвариант: пустой список офферов принудительно переводит `listType` в `'off'` до вызова `queue`                                                                                                                                                             |
| `components/home/HomePaymentPageTab.vue` | Общие настройки (`GENERAL`): `enabled` → `flush`, `accentColor`/`calloutHtml` → `queue` (невалидный hex не отправляется); методы (`METHODS`): deep-watch + debounced bulk-update ключа; создание/удаление методов — отдельные роуты без composable. Гонка create↔bulk-autosave подавлена флагом: при создании нового метода deep-watch временно не запускает autosave, чтобы не отправить неполное состояние. |

### Контракт API (не изменился)

Все три эндпоинта принимают `{key, value}`:

- `api/settings/save-operational.ts` — whitelist `[gc_enabled]`
- `api/widgets/settings-save.ts` — whitelist виджет-ключей
- `api/payment-page/settings-save.ts` — METHODS bulk-update

Composable не знает о конкретном эндпоинте — сохраняющая функция передаётся параметром при создании экземпляра.

## Раскладка главной страницы (pages/HomePage.vue)

Тулбар главной страницы реализован в `components/home/HomeToolbar.vue` как трёхрядная sticky-полоска (`.panel-toolbar`, `flex-direction: column`):

- **Строка A** (`.panel-sections`): первичные разделы — 3 для сотрудника («Мониторинг», «Инструменты», «Настройки»), 4 для Admin (добавляется «Доступ»). Каждая кнопка — `.section-tab`. Пропсы: `sections`, `activeSection`; emit `set-section`.
- **Строка B** (`.toolbar-row--tabs`): вторичные вкладки активного раздела (`.panel-tabs`). Скрыта, если вкладка в разделе одна (раздел «Доступ»). Пропсы: `tabs`, `activeTab`; emit `set-tab`.
- **Строка C** (`.toolbar-row--tools`): фильтр дат (`.date-filter`), LIVE-переключатель (`.live-toggle`), поиск по requestId (`.quick-search`). Показывается только для вкладок раздела «Мониторинг» (`monitoring`). Отделена разделителем `border-top: 1px solid var(--color-border-light)`.

**Группировка 8 вкладок по разделам** (определена в `shared/sbpHomeFormat.ts`):

| Раздел      | SbpHomeTabGroup | Вкладки                         |
| ----------- | --------------- | ------------------------------- |
| Мониторинг  | `'monitoring'`  | Обзор, Запросы, Webhook         |
| Инструменты | `'tools'`       | Создать запрос, Формат запросов |
| Настройки   | `'config'`      | Настройки, Страница оплаты      |
| Доступ      | `'access'`      | Доступ (Admin-only)             |

Функции `sbpHomeSections()` и `sbpSectionForTab()` в `shared/sbpHomeFormat.ts` — источник истины для списка разделов и принадлежности вкладки разделу.

`pages/HomePage.vue` хранит `activeSection` и `sections` в state; computed `visibleSections` (зависит от роли) и `secondaryTabs` (вкладки активного раздела); методы `setSection` и `setTab` (смена раздела автоматически переключает activeTab на первую вкладку раздела).

**Удалены из `HomeToolbar.vue`:** пропсы `groupedTabs` / `GROUP_ORDER`; классы `.tab-group*` в `pagecss/sbpHomeCss1.ts`.

Адаптивность:

- На ≤760px тулбар переходит из `position: sticky` в `position: static`.
- На ≤480px фильтр дат раскладывается вертикально, поля на полную ширину, разделитель «—» скрыт. `.section-tab` адаптируются в `pagecss/sbpHomeCss4.ts`.

CRT/терминальная эстетика (clip-path-углы, monospace, uppercase, акцент `#d3234b`, анимации live-pulse) сохранена. Логика, API, таблицы, роутинг — не затронуты.

CSS-стили тулбара и всей главной страницы: `pagecss/sbpHomeCss1.ts`..`sbpHomeCss4.ts`.

## Глобальный фильтр панели (panel_date_filter)

Вкладка «Обзор» `PanelHomePage.vue` поддерживает персистентный фильтр по дате/времени `[from?, to?]` (Unix ms). Граница клиент/сервер:

- **Сервер**: `getPanelDateFilter(ctx)` в `lib/settings.lib.ts` читает ключ `panel_date_filter` из Heap. Вызывается в каждом из эндпоинтов (`summary`, `recent-requests`, `recent-webhooks`, `search-by-request-id`) и при SSR в `index.tsx` (проп `initialDateFilter` → `PanelHomePage.vue`).
- **Клиент**: Vue получает фильтр пропсом при первой загрузке, хранит состояние локально. Изменение фильтра → `POST /api/gateways/analytics/filter-save`; ответ сервера подтверждает сохранённое значение.
- Фильтр глобальный: общий для всех пользователей и сессий. Менять может любой пользователь с активным доступом к панели (guardInternalApi).
- При отсутствии фильтра показываются все данные (до кэпа `ANALYTICS_SCAN_LIMIT = 5000` через cursor-пагинацию ≤ 1000 записей на запрос).

## Публичные виджеты оплаты (реализовано 2026-05-29)

Каталог `userscripts/` содержит файлы для встраивания на сторонние страницы магазина. Виджеты обращаются к публичным эндпоинтам `api/widgets/` напрямую из браузера покупателя.

### Поток: userscript → config → intent → gateway (offer-поток)

С 2026-06-01 `/api/widgets/config` переведён с GET на POST: виджет передаёт `{ dealId, positions }` в теле, сервер самостоятельно определяет `enabled` для каждого метода.

```
[ Браузер покупателя (страница магазина) ]
            |
            | POST /api/widgets/config  (Content-Type: text/plain, тело — JSON-строка)
            |   { dealId, positions: [{id}] }
            v
[ api/widgets/config.ts — публичный, без авторизации ]
            | CORS: Access-Control-Allow-Origin: * (без whitelist доменов)
            | 400 WIDGET_BODY_INVALID — dealId невалиден при наличии minAmount/maxAmount
            |
            | Для каждого метода m:
            |   enabled = settings.<m>Enabled
            |           AND areAllOffersAllowed(positions из тела, settings)
            |           AND amountOk (если minAmount>0 || maxAmount>0)
            |
            | amountOk: resolveGcDealAmount(ctx, dealId)
            |   → сначала GcDealCache (TTL=60с, tables/gcDealCache.table.ts)
            |   → при miss: getDealFields через GC-гейтвей → setCachedGcDealAmount
            |       (устаревшие записи кэша удаляются при чтении — lazy eviction)
            |   → конвертация суммы заказа в рубли через convertToRub (lib/rates/):
            |       RUB → без изменений
            |       USD/EUR → ручной курс (widget_lavatop_manual_rate_usd/eur),
            |                  при отсутствии → курс ЦБ РФ (cbr-xml-daily.ru)
            |   → недоступен курс → fail-closed (enabled:false)
            |   → при ошибке резолвинга: enabled=false, ok:true (fail-closed)
            |
            | Ответ: { ok, config: { lifepay: { enabled }, lavatop: { enabled } } }
            |         (WidgetAvailabilityConfig, shared/widgetSettingsTypes.ts)
            v
[ Виджет выбирает gateway по конфигу ]
            |
            | POST /api/widgets/intent-lifepay  (Content-Type: text/plain, тело — JSON-строка)
            | POST /api/widgets/intent-lavatop  (аналогично)
            v
[ api/widgets/intent-lifepay.ts | api/widgets/intent-lavatop.ts ]
            | CORS: Access-Control-Allow-Origin: * (без whitelist доменов)
            | parseBody(req) — ручной разбор text/plain без preflight
            | Серверный hard-limit: WIDGET_INTENT_HARD_LIMIT_RUB = 500_000 ₽
            | (применяется до пользовательского per-user-max из настроек)
            | invokeByGateway('lifepay'|'lavatop', 'createBill'|'createInvoice')
            | Audit-лог через loggerLib.writeServerLog
            v
[ p/gateways/lifepay | p/gateways/lavatop ]
            v
[ LifePay / Lava.Top HTTP API ]
            |
            v
[ Ответ → виджет → QR-модалка (LifePay) | редирект на форму (Lava.Top) ]
```

### Поток: deal-поток по GetCourse deal id (реализовано 2026-05-31)

Userscript на странице GetCourse извлекает deal id из URL, затем запрашивает сервер, который резолвит сумму/email через GC-гейтвей и создаёт счёт LifePay или инвойс Lava.Top.

```
[ Браузер покупателя (страница GC — /sales/shop/dealPay/id/<id>/... или ?id=<id>&...) ]
            |
            | userscripts/common.js — extractDealIdFromUrl()
            |   парсит оба формата URL; path-формат приоритетнее; null → тихий выход
            v
[ userscripts/lifepay-widget.user.js     | userscripts/lavatop-widget.user.js ]
  postWidgetIntentByDeal({ dealId,          postWidgetIntentByDeal({ dealId,
    method: 'lifepay' })                      method: 'lavatop', currency })
  POST /api/widgets/intent-by-deal            (3 кнопки: RUB / USD / EUR)
            |                                          |
            v                                          v
[ api/widgets/intent-by-deal.ts — ветвление по method ]
            |
            +-- method: 'lifepay' --------------------------+
            |   idempotentBillCache.lookup (TTL 30 мин)     |
            |     → кэш-попадание: вернуть paymentUrl       |
            |     → промах: resolveGcDeal → только RUB      |
            |   runWithExclusiveLock(                        |
            |     'yakovleva-pay:bill-idempotency:lifepay:...'  |
            |     BILL_LOCK_WAIT_MS/MAX_DURATION_MS=20s)     |
            |     → LockAcquisitionError: 503 GC_BUSY        |
            |   повторный lookup внутри лока                 |
            |   invokeByGateway('lifepay','createBill')      |
            |   recordRequestLog                             |
            |   → { ok, paymentUrl, orderNumber,            |
            |        correlationId, requestId }             |
            |                                               |
            +-- method: 'lavatop' --------------------------+
                idempotentBillCache.lookup (TTL 30 мин)
                  → кэш-попадание: вернуть paymentUrl
                  → промах: resolveGcDeal → остаток к оплате (RUB), email
                handleLavatopDealIntent (lib/gateway/lavatopDealIntent.ts):
                  фильтр суммы (hard-limit + widget_lavatop_min/max)
                  convertRubTo(amount, currency)  (lib/rates/currencyConverter.ts)
                    RUB → тождество
                    USD/EUR → ручной курс (widget_lavatop_manual_rate_usd/eur)
                             или курс ЦБ РФ (cbr-xml-daily.ru / @app/request)
                  проверка лимитов Lava.Top (RUB >= 50, USD/EUR >= 5)
                  runWithExclusiveLock('lavatop-offer:'+offerId,
                    LAVATOP_LOCK_WAIT_MS/MAX_DURATION_MS=35s):
                    → LockAcquisitionError: 503 LAVATOP_BUSY
                    повторный lookup внутри лока
                    updateOfferPrice(offerId, productId, amount, currency)
                    createInvoice(offerId, email, currency,
                                  clientOrderId='{dealId}')  // числовой, без префикса
                    recordRequestLog  // с 2026-06-01: Lava.Top теперь пишет в request_log
                → { ok, paymentUrl, ... } → редирект браузера

[ Общий инвариант: resolveGcDeal ]
    invokeByGateway(ctx,'gc','getDealFields',{dealId},{httpMethod:'GET'})
    invokeByGateway(ctx,'gc','getUserFields',{userId},{httpMethod:'GET'})
    извлекает из responseBody.data.data: cost, payed_value, user_payed_money_value,
      currency, user_id, title, is_payed
    amount = cost - max(user_payed_money_value, payed_value), округление до копеек
    email из getUserFields; email в логи НЕ пишется (PII)
    возвращает { ok, amount, currency, email, title, userId }
              или { ok: false, code: WIDGET_GC_* }
```

**Архитектурные решения deal-потока:**

- **(A1) Единый deal-поток для обоих гейтвеев.** LifePay и Lava.Top работают через один эндпоинт `intent-by-deal`, ветвление по `method`. `intent-lavatop.ts` (offer-поток) помечен deprecated, код не изменён.
- **(A2) LifePay — только RUB.** `createBill` не принимает параметр валюты. При `currency != 'RUB'` в сделке GC — `WIDGET_GC_CURRENCY_UNSUPPORTED`.
- **(A3) Lava.Top — конвертация RUB→валюта оплаты.** `createInvoice` не принимает `amount` (берёт из оффера). Поэтому поток: рублёвый остаток к оплате → конвертация → `updateOfferPrice` → `createInvoice`. Лок `runWithExclusiveLock` защищает от гонок при одновременных заявках на один оффер. `clientOrderId = '{dealId}'` (числовой dealId без префикса) обеспечивает связку webhook → request_log.
- **(A4) Единый продукт Lava.Top.** Один `offerId` + `productId` из настроек (`widget_lavatop_offer_id`, `widget_lavatop_product_id`) для всех заказов. Маппинг GC-оффер → Lava.Top-оффер не нужен. Offer-фильтр (`widget_lavatop_offer_ids`) в deal-потоке Lava.Top **не** применяется.
- **(A5) Данные только из GC.** Сумма, валюта и email берутся из GetCourse, а не из DOM/data-атрибутов страницы.
- **(A6) Предусловие оператора.** GC-настройки заполнены, `gc_enabled=true`; для Lava.Top задан единый `offerId` + `productId`.

### CORS-стратегия

Chatium не поддерживает `app.options`, поэтому preflight-запросы (`OPTIONS`) невозможны. Виджеты отправляют **simple-request** с `Content-Type: text/plain` и JSON-строкой в теле. Сервер читает и парсит тело вручную через `parseBody(req)` и возвращает `Access-Control-Allow-Origin: *`. Проверка Origin/домена отключена с 2026-06-13: ключи `widget_lifepay_domains`/`widget_lavatop_domains` и `shared/widgetCorsCheck.ts` удалены из runtime.

### Offer-фильтр виджетов (двухуровневая модель, реализовано 2026-06-01)

Фильтр виджетов по позициям заказа работает на двух независимых уровнях.

**Уровень 1 — клиент (показ виджета, `userscripts/common.js`):**

```
[ Страница GC — DOM-блок .deal-positions ]
  <li class="offer-position-{posId}" data-offer-id="{offerId}">
    <span class="position-actual-title">{title}</span>

  extractDealPositions() → [{id}]
  areAllPositionsAllowed(positions, offerListType, offers)
    → true: все разрешены → рендерить виджет
    → false: хотя бы одна запрещена → тихий выход
```

**Уровень 2 — сервер (допуск к intent, `api/widgets/intent-by-deal.ts`):**

```
  lib/gateway/gcDealResolver.ts — getDealFields → positions[]{id} из GC
  shared/widgetSettingsTypes.ts — areAllOffersAllowed(positions, settings)
    → true: продолжить поток (LifePay / Lava.Top)
    → false: 403 WIDGET_OFFER_NOT_ALLOWED
```

**Формат хранения офферов:**

- Новые ключи: `widget_lifepay_offers` / `widget_lavatop_offers` — JSON-массив `{id,title}[]` (`AllowedOffer[]`).
- Legacy fallback: `widget_offer_ids` — старый comma-separated список строк; `parseAllowedOffers` поддерживает оба формата при чтении. `lib/widget/widgetSettings.lib.ts` читает новый ключ с fallback на legacy.

**Семантика проверки** (синхронизирована между `shared/widgetSettingsTypes.ts` и `userscripts/common.js`, помечена якорями «СИНХРОНИЗИРОВАНО»):

- Сверка **только по `id`**. `title` в настройках — лишь подпись для админки, в сравнении не участвует.
- `'off'`: фильтр не применяется — `isOfferAllowed` / `areAllOffersAllowed` возвращают `true` без проверки списка. Это единственный режим, при котором виджет и платёж работают при пустом списке офферов. **Дефолт**: несохранённый ключ `widget_lifepay_offer_list_type` / `widget_lavatop_offer_list_type` интерпретируется как `'off'` (DEFAULTS в `lib/settings.lib.ts`). Применяется одинаково на уровне config-эндпоинта (показ) и intent-эндпоинтов (авторизация платежа) — единый источник правды `areAllOffersAllowed`.
- `'whitelist'`: позиция разрешена, если её `id` есть в списке.
- `'blacklist'`: позиция разрешена, если её `id` нет в списке.
- Режим «Выключен» в веб-панели эмитит `listType='off'`. **Инвариант**: пустой список офферов при сохранении принудительно переводится в `'off'` — нельзя сохранить `whitelist`/`blacklist` без офферов; нормализует и legacy-записи. `areAllPositionsAllowed` в `userscripts/common.js` при `'off'` → `true` (синхронизировано с сервером).

**Удалённый мёртвый код:**

- `isOfferMatched`, `extractOrderAmount`, `isAmountInRange`, `postWidgetIntent` — удалены из `userscripts/common.js`.
- `data-offer-id` на якоре виджета — удалён из сниппетов (`components/home/HomeWidgetSettings.vue`, `HomeWidgetOfferList.vue`).
- Старый серверный offer-фильтр по одному `offerId` — удалён из `intent-by-deal`, `intent-lifepay`, `intent-lavatop` (в `intent-lavatop` `offerId` как продуктовый параметр `createInvoice` сохранён).

### Файлы виджетного слоя

| Файл                                                  | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userscripts/common.js`                               | Shared-утилиты в `window.GwWidgetCommon`: DOM-ожидание, `fetchWidgetConfig` (**с 2026-06-01: POST** вместо GET, передаёт `{ dealId, positions }` в теле), `postWidgetIntentByDeal`, `extractDealIdFromUrl`, постинг intent, модалка, фильтры суммы/офферов. `extractDealPositions`, `areAllPositionsAllowed` (клиентский DOM-фильтр позиций; **помечена @deprecated** после переноса логики на сервер). Ранний выход `if(!dealId) return` сохранён.                                                                                                                                                                                       |
| `userscripts/lifepay-widget.user.js`                  | Виджет LifePay: deal id из URL → `fetchWidgetConfig(dealId, positions)` → если `config.lifepay.enabled` — `postWidgetIntentByDeal` → QR-модалка. Клиентский offer-гейт убран (решение принимает сервер). `data-offer-id` на якоре удалён.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `userscripts/lavatop-widget.user.js`                  | Виджет Lava.Top: deal id из URL → `fetchWidgetConfig(dealId, positions)` → если `config.lavatop.enabled` — 3 кнопки валют (RUB/USD/EUR) → `postWidgetIntentByDeal({method:'lavatop', currency})` → редирект. Клиентский offer-гейт убран.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `lib/rates/currencyConverter.ts`                      | `convertRubTo(amount, currency)` — конвертация RUB в RUB (тождество) / USD / EUR. `convertToRub(amount, currency)` — обратная конвертация: валюта → рубли (умножение на курс); используется в `resolveGcDealAmount` для приведения суммы non-RUB заказов к рублям перед сравнением с диапазоном. Приватный `getRubForOne(currency)` — единый источник курса для обоих направлений: ручной курс (`widget_lavatop_manual_rate_*`) → курс ЦБ РФ (cbr-xml-daily.ru / `@app/request`). Результат: `{ok, amount, rate, source:'identity'\|'manual'\|'cbr'}` или `{ok:false, code:'RATE_UNAVAILABLE'}`. `roundToCents` — округление до 2 знаков. |
| `lib/gateway/lavatopDealIntent.ts`                    | `handleLavatopDealIntent(ctx, {offerId, productId, gcDeal, currency})` — оркестратор Lava.Top deal-потока. **С 2026-06-01:** включает кэш-lookup идемпотентности и `recordRequestLog` после `createInvoice` (ранее не писал в `request_log`). Вызывается после серверной проверки `areAllOffersAllowed` в `intent-by-deal`.                                                                                                                                                                                                                                                                                                               |
| `lib/gateway/idempotentBillCache.ts`                  | **Новый (2026-06-01).** Кэш-lookup идемпотентности создания счёта. Ищет в `request_log` последнюю успешную запись `createBill`/`createInvoice` по `op+gatewayId+orderNumber` в окне TTL 30 минут. Ключ LifePay: `orderNumber+amount`; Lava.Top: `orderNumber+currency+amount`. Сверка `amount`/`currency` в памяти (поля в `argsRedacted`). Статус счёта в gateway не проверяется.                                                                                                                                                                                                                                                        |
| `lib/gateway/dealResolveCache.ts`                     | **Новый (2026-06-02).** `lookupDealResolve(ctx, correlationId)` — persist-first стратегия для webhook шага 5a: читает последнюю `createBill`-запись по `correlationId` через `findLatestCreateBillByCorrelationId`, валидирует `dealNumber`/`email`/`amount`, возвращает `{ok:true, dealNumber, email, amount}` или `{ok:false}`. При `ok:false` — webhook-приёмник переходит к fallback `resolveGcDeal`.                                                                                                                                                                                                                                 |
| `lib/gateway/gcDealResolver.ts`                       | `resolveGcDeal(ctx, dealId, correlationId?)` — резолвинг сделки GC: getDealFields → getUserFields. **С 2026-06-02:** возвращает `dealNumber` (GC поле `number`) наряду с `amount/currency/email/title/userId/positions`; `amount` — остаток к оплате (`cost - max(user_payed_money_value, payed_value)`), а не полный `cost`; при пустом `number` от GC — `dealNumber` отсутствует без hard-fail; после каждого вызова GC-гейтвея пишет `recordRequestLog` (try/catch, gatewayId='gc', correlationId для связки). Email в логи не пишется (PII).                                                                                          |
| `api/widgets/intent-by-deal.ts`                       | POST /api/widgets/intent-by-deal — ветвление по `method`. **С 2026-06-01:** серверная проверка `areAllOffersAllowed(positions, settings)` до запуска платёжного потока; 403 `WIDGET_OFFER_NOT_ALLOWED` при запрещённой позиции.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `api/widgets/intent-lavatop.ts`                       | POST /api/widgets/intent-lavatop — **deprecated** (offer-поток Lava.Top). `offerId` как продуктовый параметр `createInvoice` сохранён.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `shared/widgetSettingsTypes.ts`                       | **С 2026-06-01:** `AllowedOffer{id,title}`; `offers` вместо `offerIds` в `WidgetSettingsData`/`WidgetPublicConfig`; `parseAllowedOffers` (поддержка нового формата + legacy); `isOfferAllowed`/`areAllOffersAllowed` — серверные чистые функции; ключи `WIDGET_LIFEPAY_OFFERS`, `WIDGET_LAVATOP_OFFERS`. **С 2026-06-13:** доменные поля удалены из `WidgetSettingsData`.                                                                                                                                                                                                                                                                 |
| `lib/widget/widgetSettings.lib.ts`                    | `getWidgetSettings(ctx)` — параллельное чтение виджет-ключей; с 2026-06-01 читает `widget_lifepay_offers`/`widget_lavatop_offers` с fallback на legacy `widget_offer_ids`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `api/widgets/config.ts`                               | **POST** /api/widgets/config — публичный; с 2026-06-01 метод изменён с GET на POST. Принимает `{ dealId, positions }`, возвращает `WidgetAvailabilityConfig { config: { lifepay: {enabled}, lavatop: {enabled} } }`. Решение о `enabled` принимается на сервере: offer-фильтр + проверка суммы через `resolveGcDealAmount` + `GcDealCache`.                                                                                                                                                                                                                                                                                               |
| `lib/gateway/gcDealResolver.ts` (resolveGcDealAmount) | `resolveGcDealAmount(ctx, dealId)` — лёгкий резолвер **только суммы** (один вызов `getDealFields`, без getUserFields/email/валюты). Оплаченная сделка или нулевой остаток → `ok:false`. Используется только в config-эндпоинте. В отличие от `resolveGcDeal` (intent-поток), не запрашивает email и не возвращает positions.                                                                                                                                                                                                                                                                                                              |
| `lib/gateway/gcDealCache.ts`                          | `getCachedGcDealAmount` / `setCachedGcDealAmount` — TTL-кэш суммы GC-сделки (TTL=60с). Таблица `GcDealCache` (`tables/gcDealCache.table.ts`). Без `runWithExclusiveLock` — гонка при параллельных запросах безвредна (перезапись той же суммы). Поле `amount` = рублёвый эквивалент остатка к оплате. Устаревшие записи удаляются при чтении (lazy eviction при cache miss).                                                                                                                                                                                                                                                              |
| `api/widgets/intent-lifepay.ts`                       | POST /api/widgets/intent-lifepay — публичный intent LifePay (offer-поток). Старый одиночный offer-фильтр удалён.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `api/widgets/settings-get.ts`                         | GET настроек виджетов (`guardInternalApi`, `// @shared-route`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `api/widgets/settings-save.ts`                        | POST сохранения настроек виджетов (`guardInternalApi`, `// @shared-route`, whitelist ключей)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `api/widgets/offers.ts`                               | GET офферов GetCourse (`guardInternalApi`, `// @shared-route`, проксирует `getOffers`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `api/settings/save-operational.ts`                    | POST сохранения operational-настроек (`guardInternalApi`, `// @shared-route`, whitelist `gc_enabled`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `components/home/HomeWidgetSettings.vue`              | Карточка настроек виджетов: с 2026-06-01 хранит `{id,title}[]`; режим «Выключен»=blacklist+[]; сниппеты без `data-offer-id`/`data-email`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `components/home/HomeWidgetOfferList.vue`             | Переиспользуемая секция фильтра офферов (whitelist/blacklist + поиск + чекбоксы); с 2026-06-01 оперирует `{id,title}[]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pagecss/sbpWidgetsCss1.ts`                           | CSS виджет-карточки, классы `.aw-*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Роутинг виджетных эндпоинтов (config/routes.tsx)

7 записей в `ROUTES` и `ROUTE_PATHS`: `widgetConfig`, `widgetIntentLifepay`, `widgetIntentLavatop`, `widgetIntentByDeal`, `widgetSettingsGet`, `widgetSettingsSave`, `widgetOffers`.

## Downstream-вызов GC createDeal из webhook LifePay (реализовано 2026-06-01)

При успешной оплате LifePay webhook-приёмник вызывает downstream-операцию `createDeal` в GetCourse-гейтвее — обновляет заказ (статус из настройки `gc_deal_status`, по умолчанию `payed`, признак оплаты управляется настройкой `gc_create_payment`).

### Поток шага 5a в `webhooks/lifepay/index.tsx` (актуально с 2026-06-02)

```
POST /webhooks/lifepay?token=...&correlationId=<id>
  → validateToken                        (шаги 1–2: токен)
  → guard «legacy-strict»                (шаг 3: correlationId + request_log lookup)
  → unwrapWebhookBody / parseWebhookBody (шаг 4: разбор тела)
  → запись в webhook_log + дедупликация  (шаг 5: dedupeResult = 'first' | 'duplicate')
  → socket-публикация                    (если не дубль)
  → шаг 5a: downstream createDeal
      только при dedupeResult === 'first'
         AND isSuccessfulPayment         (type='payment', status='success')
      → числовой ли correlationId?
           нет (UUID) → skip, reason=non_numeric_correlationId (sev6)
           да → dealId = correlationId
      → lookupDealResolve(ctx, correlationId)       (persist-first, lib/gateway/dealResolveCache.ts)
           → findLatestCreateBillByCorrelationId → валидация dealNumber/email/amount
           → ok: true  → dealNumber, email, amount (без новых GC-вызовов)
           → ok: false → fallback: resolveGcDeal (только при числовом correlationId)
      → resolveGcDeal(ctx, dealId, correlationId)   (fallback)
           → invokeByGateway('gc','getDealFields') → recordRequestLog (try/catch)
           → invokeByGateway('gc','getUserFields') → recordRequestLog (try/catch)
           → код WIDGET_GC_ALREADY_PAID → skip, reason=already_paid (sev6)
           → иная ошибка → gc_resolve_failed (sev4), downstream не выполняется
      → нет dealNumber или email → fail-closed (sev3, createDeal не вызывается, 200 OK)
      → updateGcDealOnPayment(ctx, input)
           buildCreateDealArgs({ dealNumber, email, amount?, dealStatus })
              deal_number = dealNumber (GC поле number, НЕ correlationId/id)
           invokeByGateway('gc','createDeal',{...},{httpMethod:'POST'})
           → recordRequestLog (try/catch)
           success → severity 6 (info)
           INVOKE_GC_LIMIT_ERROR → severity 4 (warn, gc_deal_update_limit_error)
           иная ошибка → severity 3 (error), не бросает
      → обёрнут в try/catch, гарантирует 200 при любом исходе
  → ответ 200 OK
```

### Ключевые файлы

| Файл                                    | Роль                                                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/webhook/gcDealUpdate.ts`           | `buildCreateDealArgs({ dealNumber, email, amount?, dealStatus? })` (pure) + `updateGcDealOnPayment` (вызов gateway + `recordRequestLog`). `deal_number` = GC поле `number`, не correlationId. |
| `lib/gateway/dealResolveCache.ts`       | `lookupDealResolve(ctx, correlationId)` — persist-first: читает `createBill`-запись по correlationId, возвращает `{ dealNumber, email, amount }` без GC-вызовов                               |
| `lib/gateway/gcDealResolver.ts`         | `resolveGcDeal(ctx, dealId, correlationId?)` — fallback: getDealFields → getUserFields; возвращает `dealNumber` (GC поле `number`) и остаток к оплате; записывает вызовы в `request_log`      |
| `webhooks/lifepay/index.tsx`            | Шаг 5a: persist-first (lookupDealResolve) → fallback (resolveGcDeal) → fail-closed → createDeal                                                                                               |
| `lib/tests/lifepayUnitPhase4Webhook.ts` | Юнит-тесты `calculateGcDealPayableAmount` и `buildCreateDealArgs` (чистые функции)                                                                                                            |

### Идемпотентность и ограничения

- Downstream выполняется **только при `dedupeResult==='first'`** — дедупликация на стороне `webhook_idempotency` гарантирует однократность при повторных ретраях LifePay.
- **Нет авто-ретрая при сбое createDeal.** Если gateway GC ответил ошибкой, вторичный ретрай LifePay придёт как `duplicate` → downstream не повторится. Осознанное ограничение MVP.
- PII (email) логируется только через `hasEmail: true/false`; в тело запроса к GC-гейтвею email передаётся без логирования.
- `deal_status` берётся из `gc_deal_status` (fallback `payed`); `deal_is_paid` — строка `'1'`/`'0'` (требование валидатора gateway GC); `deal_cost` — число или отсутствует.

### Внешняя зависимость

Контракт операции `createDeal` (поля `deal_number`, `deal_status`, `deal_is_paid`, `deal_cost`) определён в `p/gateways/getcourse/lib/gateway/operationsCatalogLegacy.ts`. Base64-кодирование `params` выполняет сам gateway, клиент передаёт только `{params}`. Изменение контракта на стороне gateway сломает downstream-вызов здесь — синхронизация ответственности изменяющего gateway.

## Идемпотентность создания счёта (реализовано 2026-06-01)

Повторный вызов `POST /api/widgets/intent-by-deal` на тот же заказ в окне 30 минут не создаёт новый счёт в платёжном gateway, а возвращает ранее созданную `paymentUrl`.

### Механизм

```
POST /api/widgets/intent-by-deal { dealId, method }
  → idempotentBillCache.lookup(ctx, gatewayId, orderNumber, amount, currency?)
      → findLatestOkForIdempotency(op, gatewayId, orderNumber, since=now-30min)
          → request_log: ok:true, op='createBill'|'createInvoice',
                         gatewayId, orderNumber, requestedAt≥since
      → сверка amount (+ currency для Lava.Top) из argsRedacted в памяти
      → кэш-попадание: вернуть paymentUrl из rawResponseBody
  → (при промахе) resolveGcDeal → проверки → захват лока
      → повторный lookup внутри лока (защита от гонки)
      → invokeByGateway → recordRequestLog
```

### Ключи идемпотентности

| Gateway  | op              | Ключ поиска                        | Сверка в памяти     |
| -------- | --------------- | ---------------------------------- | ------------------- |
| LifePay  | `createBill`    | `gatewayId + orderNumber`          | `amount`            |
| Lava.Top | `createInvoice` | `gatewayId + orderNumber(=dealId)` | `currency + amount` |

### Ограничения

- Статус счёта в gateway не проверяется: если счёт истёк или был отменён, кэшированная ссылка отдаётся как есть. Клиент может получить неоплачиваемый URL до истечения TTL 30 минут.
- TTL — жёсткий, не сбрасывается при повторных вызовах.
- Источник кэша — `request_log`. Если `recordRequestLog` упал (try/catch), запись могла не попасть в журнал — кэша нет, следующий запрос снова пойдёт к gateway.

## Страница оплаты GetCourse (реализовано 2026-06-06)

Подсистема кастомизации страницы оплаты GetCourse (dealPay). Архитектурный принцип: школа подключает **один скрипт-loader**; обновления конфигурации и ресурсов катятся с сервера централизованно без изменения кода на стороне GC.

Архитектурный вердикт о разделении ответственности: `payment_page_*`-ключи = единый источник **отображения** методов на странице оплаты; `widget_*`-ключи (lifepay/lavatop) = единый источник **платёжного допуска** (intent). Две подсистемы не дублируют друг друга — переиспользуют только общие типы и паттерны (`success`-обёртка, `offerListType`/`AllowedOffer`). Подробнее: `docs/architecture/payment-scheme.md`.

### Слои подсистемы

```
[ Школа (GC-домен) ]
  <script src="userscripts/pp-loader.js"></script>  ← один тег

[ pp-loader.js (клиент, исполняется на GC-домене) ]
  ?editMode=1 (конструктор GC) → ранний return: лоадер полностью отключён
    (нет конфига, стилей, скриптов, прелоадера — кастомизация не мешает редактору)
  вычисляет URL конфига из <script src>
  POST /api/payment-page/config  (таймаут 5 с)
    success:true  → window.__PP_CONFIG__ + инжект CSS-текста + последовательная загрузка 13 скриптов
    success:false / ошибка / таймаут → оверлей «Ошибка рендеринга страницы оплаты»
    general.enabled:false → нативная страница без оверлея
  прелоадер #pp-preloader: showPreloader() создаёт оверлей, если его ещё нет в DOM
    (если школа вставила пример прелоадера в HTML — переиспользует его, без дубля);
    hidePreloaderAfterPageLoad() прячет #pp-preloader после загрузки страницы и скриптов / при enabled:false

[ api/payment-page/config.ts ]
  POST, без auth, CORS *
  success:false с HTTP 200 при внутренней ошибке
  тело ответа не содержит accountId/секретов

[ lib/paymentPage/paymentPageSettings.lib.ts ]
  getPaymentPageGeneral(ctx) → { enabled, accentColor, calloutHtml, logoUrl, logoWidth, defaultMethod }
  parsePaymentPageGeneral() — парсит ключ GENERAL; `defaultMethod` = methodKey выделенного
    по умолчанию метода или '' (ни один); пустая строка = не задан
  getPaymentPageMethods(ctx, opts?: { seed?: boolean }) → PaymentPageMethodRecord[]
    (сортировка: section→order→createdAt)
    seed=true (default): при первом вызове ensureSeeded(ctx) — идемпотентный reconcile
      29 системных методов под write-локом yakovleva-pay:pp-method-write.
      Fast-path по countSystem (isSystem=true), а не по countAll — кастомные методы
      не маскируют недосев.
    seed=false: только чтение, ensureSeeded не вызывается (используется в config-эндпоинте).

[ repos/paymentPageMethods.repo.ts → tables/paymentPageMethods.table.ts → Heap ]
  PaymentPageMethods: строка = один метод оплаты (isSystem, methodKey, section, order, resolver,
    hideOnPartialPayment…)
  CRUD: list / getByMethodKey / countAll / countSystem / create / updateByMethodKey / deleteByMethodKey
  countSystem() — countBy({ isSystem: true }); используется fast-path seed'а.
  list() логирует дубликаты methodKey (severity 3) при обнаружении.
  все мутации сериализованы единым write-локом yakovleva-pay:pp-method-write

[ repos/settings → Heap ]
  ключи: payment_page_general (enabled, accentColor, calloutHtml, logoUrl, logoWidth, defaultMethod)
  ключ payment_page_methods — deprecated, не читается (миграция = сброс)

[ userscripts/ — ассеты (плоские файлы) ]
  pp-loader.js        — точка входа
  pp-style.css        — конкатенация main.css + payment-page.css
                        (loader тянет как текст, инжектит <style>)
  pp-script-01..13.js — скрипты кастомизации
                        (11/13 читают __PP_CONFIG__ с fallback — инвариант «не теряем метод»)
                        pp-script-05.js: управление выделением метода по умолчанию.
                          normalizeDefaultSelection() — вызывается в конце wire() на всех
                          проходах (ready/load/1600/3600): снимает любое навязанное GC
                          выделение .picked (в т.ч. штатный sber-pay) и проставляет .picked
                          методу из general.defaultMethod через resolveDefaultEl()
                          (resolver из конфига → fallback по methodKey; скрытые методы
                          через isHidden отсеиваются). После ручного клика покупателя
                          флаг userHasPicked=true — нормализация становится no-op
                          (не перетирает выбор покупателя на поздних ретраях).
                          Исправленный баг: GC помечал #sber-pay классом .picked при рендере
                          dealPay → метод выглядел выбранным, хотя покупатель его не трогал.
                        pp-script-11.js: section-driven раскладка методов по конфигу
                          (с 2026-06-07): el.style.setProperty('order', sectionIndex*1000+order, 'important')
                          инлайн !important побеждает !important из pp-style.css;
                          методы раскладываются динамически по Object.keys(cfg.methods);
                          каждый метод несёт resolver {type:'id'|'class', value} — единый
                          источник адресации DOM-элемента (заменил конвенцию id-или-класс);
                          для системных методов resolver задаётся в seed-записи
                          (lib/paymentPage/paymentPageMethodSeed.ts) — большинство по id=methodKey,
                          исключения (напр. sberbank-auto-acquiring-block) по классу;
                          поле resolver хранится в таблице, но скрыто из UI панели;
                          для кастомных методов resolver={type:'id', value:methodKey};
                          ensureCustomContainer(cfg, methodKey, methodCfg) — для методов
                          с isSystem===false создаёт div id=methodKey (data-pp-custom,
                          .pp-custom-method) в .xdget-payform; контейнер несёт: изображение
                          (imageUrl, идемпотентно через data-pp-img-src), radio-меню
                          .pp-custom-menu из menuItems (name=pp-menu-<id>, первый checked;
                          идемпотентность по data-pp-menu-src — выбор не сбрасывается на
                          ретраях build 0/1600/3600/load) и кнопку .pp-custom-btn.btn;
                          осиротевшие контейнеры (data-pp-custom, ключа нет в cfg.methods)
                          удаляются; после создания контейнер проходит общий поток
                          applyMethodConfig наравне с системными методами;
                          runCustomScript(container, id) — читает выбранный radio-пункт
                          (input[name=pp-menu-<id>]:checked.value), исполняет customScript
                          через new Function('selectedMenuValue', script)(value) в try/catch;
                          re-entrancy guard data-pp-running; актуальный конфиг читается
                          с container.__ppCfg (защита от stale-замыкания);
                          две точки запуска кастомного скрипта: клик .pp-custom-btn
                          и штатная кнопка GC «Оформить заказ» — pp-script-05 при клике
                          делает $('.picked .btn').click(); .pp-custom-btn имеет класс .btn,
                          а контейнер получает .picked штатным механизмом GC;
                          capture-guard не используется (платёжный поток системных методов
                          не перехватывается);
                          fallback: при отсутствии resolver — старая конвенция id/class по имени;
                          hideOnPartialPayment — при URL с параметром paymentValue метод
                          скрывается (display:none!important, data-pp-hidden=partial);
                          hideOnTopUpPayment — если публичный конфиг вернул
                          deal.hasTopUpPayment=true (по getDealFields alreadyPaid>0),
                          метод скрывается (display:none!important, data-pp-hidden=topup);
                          applyConfigDrivenLabels() — метки секций добавляются только для
                          секций с видимыми методами, пустые секции скрываются;
                          маппинг 7 секций→метки: recommended/pay/cards_rf/cards_world/
                          installments/payparts/noncash;
                          fallback при отсутствии window.__PP_CONFIG__ — прежнее поведение
                          (hasAny-метки + DOM-перенос creditIds/payPartsIds);
                          applyCallout() — инжектит div.pp-callout в .xdget-payform
                          при непустом general.calloutHtml; CSS order:-13 ставит блок выше
                          секции «Рекомендуемые способы оплаты» (.label-recommended, order:-12);
                          upsert по data-pp-callout-src — не пересоздаёт DOM на ретраях build;
                          селектор .pp-callout:not(.pp-callout-crm) — не трогает админский блок;
                          applyCrmCallout() — админская ссылка «Карточка заказа в CRM» (штатная
                          фича GC, в DOM только у админов, в блоках .xdget-dealInfo) собирается в
                          один коллаут div.pp-callout.pp-callout-crm (тот же стиль, order:-14 —
                          ВЫШЕ пользовательского коллаута); исходные строки прячутся display:none;
                          ГЕЙТ: блок создаётся строго при наличии исходной ссылки → только админам;
                          содержимое строится безопасно (createElement+textContent+href, без innerHTML);
                          applyMethodCaption(el, caption) — рендерит подпись метода:
                          upsert блока .pp-method-caption последним потомком карточки метода
                          (через textContent, без HTML-инъекций); вешает на карточку класс
                          .pp-has-caption; пустая строка caption удаляет блок и класс;
                          идемпотентно — вызывается на каждом build();
                          caption (methodCfg.caption) проходит сервер→публичный конфиг→скрипт;
                          разграничение: label = текст кнопки метода,
                          caption = описательная подпись под методом (взамен системных текстов GC);
                          геометрия кредитных карточек (.gc-payment-method-credit) с подписью —
                          всё инлайн-!important (конкурирует с ID-правилами GC):
                          (1) логотип height:34px + object-fit:contain (зоны лого равны → лого
                          по верху); (2) justify-content:space-between (контент верх, подпись низ);
                          (3) у подписи margin:0 — снимает навязанный GC отступ по ID
                          (#method div{margin-bottom:20px}) → подписи выровнены по низу;
                          (4) min-height:0 (снимает ID-floor ~240px) + CSS-ужатие нижнего отступа
                          контент-блока (margin-bottom:6px !important перебивает инлайн GC) —
                          короткие карточки ужимаются под контент, сокращая зазор кнопка→подпись
                          с сохранением нижнего выравнивания.
                          Итог: лого и подписи выровнены попиксельно; кнопки следуют за контентом
                          (число вариантов рассрочки/класс кнопки GC — неустранимая переменная);

[ Зеркало клиентских исходников ]
  obsidian vault: payment-page/
  constructor-export.json — встраивает loader + прелоадер как 1 виджет вместо 13 тегов
```

### Панель управления (вкладка «Страница оплаты»)

Вкладка зарегистрирована в `shared/sbpHomeFormat.ts` (массив `sbpHomeTabs`, group `'config'`, icon `fa-credit-card`). Отображается в разделе «Настройки» двухуровневой навигации. Смонтирована в `pages/HomePage.vue` по условию `activeTab === 'paymentPage'`. SSR-пропсы из `index.tsx`: `initialPaymentPageGeneral`, `initialPaymentPageMethods`, `initialPaymentPageLoaderUrl`, `anchorBaseUrl`.

Компонент: `components/home/HomePaymentPageTab.vue`. Содержит:

- Карточку **общих настроек** (`enabled`, `accentColor`, `logoUrl`, `logoWidth`, `defaultMethod`). Select «метод по умолчанию» предлагает только включённые (`enabled=true`) методы, сгруппированные по секциям; значение `''` = не задан (нативное поведение GC без принудительного выделения). Логотип загружается через `@app/storage`, сохраняется как публичный thumbnail URL и показывается над заголовком «Оплата заказа» с настраиваемой шириной.
- **WYSIWYG-редактор коллаут-блока** (`calloutHtml`): поле `contenteditable` с `document.execCommand` (npm недоступен). Хранится в `payment_page_general`. Отдаётся клиенту через `POST /api/payment-page/config` в `general.calloutHtml`. `pp-script-11.js` (`applyCallout()`) инжектит `div.pp-callout` в `.xdget-payform` при непустом значении; блок позиционируется выше секции «Рекомендуемые способы оплаты» (`order:-13`, рекомендуемые — `order:-12`). HTML авторский (staff/admin), без серверной санитизации — доверенная модель. Пустое поле → блок не отображается, отдельного тумблера нет.
- **Аккордеон-группировку 21 метода** по 7 секциям (`PAYMENT_PAGE_SECTIONS`: `recommended`, `pay`, `cards_rf`, `cards_world`, `installments`, `payparts`, `noncash`). Группы вычисляются динамически через `computed methodsBySection` по полю `section` каждого метода; сортировка внутри группы — `order` + индекс. Пустые группы скрываются. Заголовок группы: chevron + название + счётчик «N вкл / M всего»; клик — `toggleGroup`. Кнопка «Свернуть/Развернуть все» в шапке секции. При смене секции метода через select группа-назначение авто-раскрывается. Стили аккордеона (`.pp-group-*`) и строк методов (`.st-method-*`) определены в `pagecss/sbpSettingsCss1.ts`; компонент не содержит `<style scoped>`. **Порядок полей в раскрытой карточке метода (актуально с 2026-06-17):** (1) Название метода — поле `name`, редактируемое для кастомных методов, `disabled` для системных (`isSystem=true`); (2) URL изображения (`imageUrl`); (3) Подпись под методом (`caption`); (4) Текст кнопки (`label`). Ниже пунктирного разделителя (`.st-dashed-sep`) сгруппированы условия показа: чекбоксы «Скрывать при частичной оплате» (`hideOnPartialPayment`) и «Скрывать при доплате» (`hideOnTopUpPayment`), «Мин. сумма» и «Макс. сумма» вместе с блоком «Фильтр офферов». Собственная граница `.st-offer-block` убрана (не дублирует общий разделитель). Обработчик `onMethodTextInput` расширен на ключ `'name'`; добавлен стиль `.st-input:disabled`.
- **Drag-and-drop управление секцией и порядком методов** (с 2026-06-07): нативный HTML5 DnD — перетаскивание метода между секциями-группами и переупорядочивание внутри секции; DnD-рукоятка (`.pp-dnd-handle`), классы состояния `.is-dragging` и `.pp-group.is-dnd-over`. При drop записывается последовательный `order` по позиции в группе. Мобайл-fallback: кнопки ↑/↓ и select «Переместить в секцию» (`.pp-mobile-actions`, `.pp-mobile-btn`) — доступны на устройствах без pointer. Поля select «Секция» и числовое «Порядок» удалены из деталей метода — секция и порядок задаются только DnD/кнопками. Атомарное обновление `methods.value` одним присваиванием (без мутаций по элементу). DnD-стили добавлены в `pagecss/sbpSettingsCss1.ts`.
- Сниппет встраивания: `<script src>` с `loaderUrl` из SSR-пропа (хардкод пути запрещён) + пример прелоадера-оверлея с `id="pp-preloader"` (полноэкранный fixed-оверлей со спиннером; вставляется в HTML страницы заказа — показывается мгновенно и перекрывает «сырую» страницу; лоадер использует тот же id: не дублирует и скрывает его после загрузки страницы и скриптов). Сниппет прелоадера несёт встроенный inline-`<script>`, который сам прячет оверлей при `?editMode=1` и после `window.load`, если `pp-loader.js` не стартовал (иначе прелоадер навсегда перекрыл бы редактор конструктора GC или страницу при сбое загрузки loader-а).

Vue-компонент импортирует только `shared/*`, роуты и `@app/storage` для загрузки логотипа.

### Публичный конфиг-эндпоинт

`POST /api/payment-page/config` — публичный (без auth, `Access-Control-Allow-Origin: *`).

Ответ: `{ success: boolean, general: { enabled, accentColor, calloutHtml, logoUrl, logoWidth, defaultMethod }, methods: Record<methodKey, PaymentPageMethodPublic>, deal: { hasTopUpPayment } }`.
Поле `methods` — объект с ключами-methodKey; каждый элемент несёт `resolver {type, value}`, `section`, `order`, `enabled`, `hideOnPartialPayment`, `hideOnTopUpPayment`.
Если хотя бы один метод настроен с `hideOnTopUpPayment=true`, loader передаёт `dealId`, а сервер вызывает `resolveGcDealAmount(ctx, dealId)` и выставляет `deal.hasTopUpPayment=true` при `alreadyPaid > 0`.
При `success: false` — HTTP 200 (fail-soft, loader показывает оверлей).  
Тело не содержит `accountId` или секретных ключей.

### Статика (userscripts/)

Платформа отдаёт `userscripts/*.js` с `Content-Type: application/javascript` и `CORS *` — аналогично существующему `userscripts/common.js`. CSS (`pp-style.css`) loader тянет как текст через `fetch` и инжектит `<style>`-тегом — `Content-Type` сервера нерелевантен, достаточно CORS.

### Поведение loader'а при сбоях

| Ситуация                                        | Поведение                                           |
| ----------------------------------------------- | --------------------------------------------------- |
| `success: true`                                 | Применяет конфиг, загружает скрипты последовательно |
| `success: false` / сетевая ошибка / таймаут 5 с | Непрозрачный оверлей поверх всего контента          |
| `general.enabled: false`                        | Нативная страница GC без вмешательства              |

Скрипты 5, 11 и 13 читают `window.__PP_CONFIG__` с fallback-значениями — инвариант: метод не скрывается без явного `enabled: false`, `hideOnPartialPayment` при URL с `paymentValue`, `hideOnTopUpPayment` при `deal.hasTopUpPayment=true`, выхода суммы за диапазон или попадания в offer-исключение. `pp-script-05.js` читает `general.defaultMethod` из конфига для нормализации начального выделения; `pp-script-11.js` читает `general.logoUrl/logoWidth` для блока `.pp-page-logo` над заголовком «Оплата заказа». При отсутствии конфига — не трогает DOM.

### Файлы подсистемы

| Файл                                         | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/home/HomePaymentPageTab.vue`     | Vue-компонент вкладки панели управления; источник методов — SSR-пропс (массив записей); select «метод по умолчанию» в общих настройках — только включённые методы, сгруппированные по секциям. В деталях метода есть чекбоксы `hideOnPartialPayment` для скрытия при URL с `paymentValue` и `hideOnTopUpPayment` для скрытия при доплате по уже частично оплаченному заказу. `copySnippet` корректно обрабатывает отказ Clipboard API (permission denied) без падения. |
| `api/payment-page/config.ts`                 | Публичный конфиг-эндпоинт (POST, CORS \*); собирает `Record<methodKey, PaymentPageMethodPublic>` (с resolver) из repo, принимает optional `dealId` и возвращает `deal.hasTopUpPayment` для логики доплаты.                                                                                                                                                                                                                                                             |
| `api/payment-page/settings-get.ts`           | Отдаёт массив записей `PaymentPageMethodRecord[]` для панели (guardInternalApi)                                                                                                                                                                                                                                                                                                                                                                                        |
| `api/payment-page/settings-save.ts`          | METHODS bulk-update через repo (guardInternalApi). Отсутствующий `methodKey` пропускается (`skipped`), обновляются только найденные строки. Ответ: `{ success:true, updated, skipped, notFound }` — всегда успех, даже если часть ключей не найдена (рассинхрон вкладок).                                                                                                                                                                                              |
| `api/payment-page/method-create.ts`          | POST создание нового метода (guardInternalApi; fail-closed). Новый метод получает `order = max(order в секции) + 1`, т.е. добавляется в конец своей секции.                                                                                                                                                                                                                                                                                                            |
| `api/payment-page/method-delete.ts`          | POST удаление метода (guardInternalApi; запрет удаления системного isSystem=true)                                                                                                                                                                                                                                                                                                                                                                                      |
| `api/payment-page/method-rename.ts`          | POST переименование id кастомного метода (guardInternalApi). `repo.renameMethodKey` обновляет поля `methodKey` и `resolverValue` у существующей строки — rowId сохраняется, без create+delete и осиротевших записей. Под локом `yakovleva-pay:pp-method-write`. Перед rename панель сбрасывает (flush) pending-правки autosave — защита от потери caption/label/customScript при смене ключа.                                                                          |
| `lib/paymentPage/paymentPageSettings.lib.ts` | `getPaymentPageMethods(ctx, opts?)` — читает из repo, seed=true (default) вызывает ensureSeeded; seed=false — только чтение (используется config-эндпоинтом); `getPaymentPageGeneral(ctx)` — возвращает `{ enabled, accentColor, calloutHtml, logoUrl, logoWidth, defaultMethod }`                                                                                                                                                                                     |
| `lib/paymentPage/paymentPageMethodSeed.ts`   | `ensureSeeded(ctx)` — идемпотентный reconcile 29 системных методов под write-локом; fast-path по countSystem, а не countAll                                                                                                                                                                                                                                                                                                                                            |
| `tables/paymentPageMethods.table.ts`         | Heap-схема таблицы `PaymentPageMethods`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `repos/paymentPageMethods.repo.ts`           | CRUD над `PaymentPageMethods`: list/getByMethodKey/countAll/countSystem/create/updateByMethodKey/deleteByMethodKey. `deleteByMethodKey` удаляет **все** строки с данным `methodKey` (защита от дубликатов — Heap не имеет уникального ограничения на уровне схемы). `list()` логирует дубликаты methodKey (severity 3). Heap-таблица импортируется именованным импортом (соответствие платформенному правилу 008-heap.md §6).                                          |
| `shared/paymentPageTypes.ts`                 | Общие типы `PaymentPageMethodRecord`, `PaymentPageMethodPublic`, `PaymentPageResolver`, `PaymentPageGeneral` (вкл. `logoUrl`, `logoWidth`, `defaultMethod`) (`// @shared`)                                                                                                                                                                                                                                                                                             |
| `userscripts/pp-loader.js`                   | Клиентский loader (исполняется на GC-домене)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `userscripts/pp-style.css`                   | Стили (main.css + payment-page.css). `.pp-has-caption` переводит flex-карточку метода в колоночную раскладку (лого сверху, подпись снизу); карточные методы фикс-высоты 200px ограничивают лого (max-height:88px), кредитные/рассрочечные блоки растут (height:auto). `.pp-method-caption` — приглушённый центрированный текст с 2-строчным -webkit-line-clamp.                                                                                                        |
| `userscripts/pp-script-01..13.js`            | Скрипты кастомизации dealPay                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Кастомные методы оплаты (обновлено 2026-06-07)

Кастомный метод — самостоятельный контейнер, который `pp-script-11.js` создаёт на странице dealPay сам, а не привязка к существующему DOM-элементу GC.

**Резолвер кастомных методов.** Поля `resolverType`/`resolverValue` убраны из UI панели управления, но остаются внутренним полем таблицы `PaymentPageMethods`. Для системных методов resolver задаётся seed-файлом (`lib/paymentPage/paymentPageMethodSeed.ts`); для кастомных фиксировано `{type:'id', value:methodKey}`. Публичный конфиг (`POST /api/payment-page/config`) несёт resolver для каждого метода — скрипт использует его для адресации DOM.

**Создание контейнера (`ensureCustomContainer` в `pp-script-11.js`).** При `isSystem===false` скрипт создаёт `div id=methodKey` с атрибутом `data-pp-custom` и классом `.pp-custom-method` внутри `.xdget-payform`. Контейнер идемпотентен: изображение обновляется только при смене `imageUrl` (атрибут `data-pp-img-src`), radio-меню — только при смене набора пунктов (`data-pp-menu-src`); выбор пользователя не сбрасывается на ретраях build. После создания контейнер проходит общий поток `applyMethodConfig` (enabled/caption/amount/offer-фильтры, section/order через CSS order, метки секций) наравне с системными методами. Осиротевшие контейнеры (ключ отсутствует в `cfg.methods`) удаляются.

**Обработчик (`runCustomScript`).** Читает выбранный пункт radio-меню (`input[name=pp-menu-<id>]:checked.value`) и исполняет `customScript` через `new Function('selectedMenuValue', script)(value)` в try/catch (warn в console при ошибке). Re-entrancy guard (`data-pp-running`) предотвращает одновременный запуск. Актуальный конфиг читается с `container.__ppCfg` — не из замыкания build-функции (защита от stale-данных при ретраях).

**Две точки запуска.** (1) Клик по кнопке `.pp-custom-btn` самого контейнера. (2) Штатная кнопка GC «Оформить заказ» — `pp-script-05` при клике выполняет `$('.picked .btn').click()`; поскольку `.pp-custom-btn` имеет класс `.btn`, а контейнер получает `.picked` штатным механизмом GC (прямой потомок `.xdget-payform`), клик доходит до того же обработчика. Capture-guard не используется: платёжный поток системных методов не перехватывается.

**Rename id (in-place).** Роут `api/payment-page/method-rename` обновляет `methodKey` и `resolverValue` у существующей строки без create+delete (`rowId` сохраняется). Панель управления перед rename делает flush pending-правок autosave — защита от потери `caption`/`label`/`customScript`. Под локом `yakovleva-pay:pp-method-write`.

**Инвариант fallback.** При отсутствии `window.__PP_CONFIG__` поведение `pp-script-11.js` не меняется. Кастомные контейнеры и `customScript` требуют ручного деплоя `pp-script-11.js` и `pp-style.css` на GC.

## Безопасность

- `requireRealUser(ctx)` + `requireInternalAccess(ctx)` (через `guardInternalApi`) — все `/api/gateways/*` и главный роут `/`. Реализовано 2026-05-24 (закрыт auth-разрыв аудита).
- Webhook — анонимный, но с обязательной сверкой токена.
- MD5-подпись webhook **не** проверяется: LifePay её не публикует (нет полей `check`/`signature`/`hash` в теле, нет описания алгоритма на apidoc.life-pay.ru/notification). Если LifePay в будущем добавит подпись — вернуться к этому пункту.
- Дедупликация webhook через `runWithExclusiveLock` из `@app/sync` + `findByField` + create в `webhook_idempotency` (Heap-схема не выражает unique constraint напрямую).
- Уникальность токена инвайта и userId гранта — на уровне приложения (`accountNanoid` + `runWithExclusiveLock`), Heap-схема unique constraint не выражает.

## Payment Plugin Settings (2026-06-09)

Gateway-specific settings are now configured from manifests, not from hard-coded admin cards.

- Plugin folders: `plugins/lifepay`, `plugins/lavatop`, `plugins/getcourse`.
- Manifest registry: `lib/plugins/pluginRegistry.lib.ts`.
- Safe settings facade: `lib/plugins/pluginSettings.lib.ts`.
- Shared DTO contract: `shared/pluginManifestTypes.ts`.
- UI: `Настройки -> Плагины` in `pages/HomePage.vue`, rendered by `components/home/HomePluginsTab.vue` and `PluginManifestForm.vue`.
- API: `GET /api/plugins/settings-get`, `POST /api/plugins/settings-save`, `GET /api/plugins/lavatop-catalog`, all Admin-only.
- Portable JSON backup: `GET /api/settings/export`, `POST /api/settings/import`, backed by `lib/settingsBackup.lib.ts`. The backup includes plugin secrets, widget settings and payment-page methods, but excludes `/web/admin` operational settings (`project_name`, `log_level`, dashboard/log controls).

Secret fields are write-only in public DTOs: the client receives `hasValue` and `maskedValue`, never the raw `value`. `lp_login` is treated as confidential and masked too. New gateway integration should add a plugin folder with a manifest and register it in `paymentPluginManifests`; Vue must not import plugin or lib modules directly.

Legacy widget settings (`widget_*`, min/max amounts, legacy offer filters, third-party widget toggles) are no longer rendered in the main settings tab. The two payment-method toggles `widget_lifepay_enabled` and `widget_lavatop_enabled` are migrated into the LifePay/Lava.Top plugin manifests. Runtime enables a method only when the corresponding plugin is configured; if the toggle row is absent in Heap, configured plugins default to enabled, while an explicit `false` disables the public widget intents. Payment-page configuration remains in `payment_page_*`; old widget settings read/write endpoints must not drive the new payment page.

LifePay webhook callback URLs are assembled on the server in `api/gateways/invoke.ts` for `lifepay/createBill`; the browser receives only status/masked plugin DTOs and never receives `lp_webhook_token`.

Lava.Top has a plugin-specific deal setup block. `api/plugins/lavatop-catalog.ts` calls the Lava.Top gateway operation `listProducts`, follows pagination, and returns normalized products with nested offers. `PluginManifestForm.vue` renders dependent dropdowns: product selection unlocks the offer dropdown; changing product clears the saved offer. The block also shows a limits callout (`50 RUB`, `5 USD`, `5 EUR` minimums). Hidden required manifest fields `widget_lavatop_product_id` and `widget_lavatop_offer_id` make `configured` false until both ids are saved.
