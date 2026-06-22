# Spec-as-source: `p/units/neso/meta/interfaces/web`

Статус: scaffold подготовлен, checkout-flow описан, архитектурные пробелы закрыты (rev.2). Runtime-реализация формы, broker-клиента и обработчиков ещё не выполнена.  
Последнее обновление: 2026-06-22.  
Область действия: весь каталог `p/units/neso/meta/interfaces/web`.

> **rev.2 (2026-06-22) — зафиксированы решения перед реализацией:**
>
> 1. **Механизм доставки `payment_ready`** — клиент-драйвен poll: страница после submit поллит `api/checkout/status`, который на сервере claim'ит/обрабатывает доставки брокера и возвращает `paymentUrl`; WebSocket — дублирующий канал. Плюс лёгкая fallback-джоба добивает доставку, если пользователь ушёл со страницы. Обоснование: брокер только poll-based, `notificationMode:'internal'` в ядре недореализован (см. §6.3).
> 2. **Broker-клиент в scaffold отсутствует** — `lib/broker/coreBrokerClient.lib.ts` и `contracts/brokerEvents.ts` создаются с нуля по образцу `p/units/neso/meta/core/sample-module` (см. §6.0).
> 3. **Жизненный цикл `requestKey`** — генерируется на SSR `/`, строка `checkoutRequests` создаётся только на submit, не на каждый GET (см. §7).

Этот файл — источник истины для нового Web Interface модуля NeSo Meta. Код, README и старые документы должны приводиться к этой спецификации, а не наоборот.

## 0.1 Источники сверки

Спецификация сверена с локальной документацией Chatium:

- `inner/docs/002-routing.md` — file-based routing, один route на файл;
- `inner/docs/007-vue.md` — Vue entrypoint, shared imports и `// @shared-route`;
- `inner/docs/014-socket.md` — `subscribeToSocket`/`sendDataToSocket`;
- `inner/docs/025-app-modules.md` и `inner/docs/033-app.md` — app calls между модулями.

Спецификация сверена с GetCourse API:

- `https://getcourse.ru/help/api` — сделки создаются POST-запросом к `/pl/api/deals` с `action=add`, `key` и base64-encoded JSON `params`; для создания заказа достаточно `offer_id + email` или `offer_code/product_title + deal_cost + email`; для получения ссылки на оплату нужен `system.return_payment_link = 1`, в ответе используется `result.payment_link`;
- `https://getcourse.ru/pl/postback/redoc` — заявленный Redoc-источник GetCourse Postback API. Текстовый fetch страницы отдаёт только динамическую оболочку без доступной OpenAPI-схемы, поэтому перед реализацией GetCourse-side подписки/handler нужно перепроверить схему в браузере или другим доступным способом.

## 0.2 Правило предварительной спецификации

Перед любым изменением runtime-кода, UI, API, данных, broker-контрактов, подписок, WebSocket-потока или тестов нужно сначала обновить эту спецификацию.

Если изменение не описано здесь, код не менять. Запросы на проверку/ревью считаются анализом без редактирования.

## 1. Назначение

`p/units/neso/meta/interfaces/web` — публичный web-интерфейс оформления заказа в meta-системе NeSo.

Целевой сценарий:

1. Пользователь открывает страницу модуля.
2. Страница показывает форму с полями, достаточными для создания заказа в GetCourse.
3. После отправки сервер валидирует данные, создаёт локальный checkout request и публикует в core broker событие `web.checkout.submitted@1`.
4. GetCourse interface (`p/units/neso/meta/interfaces/getcourse`) подхватывает событие брокера, вызывает свою операцию `/orders/create`, создаёт сделку в GetCourse и публикует `getcourse.order.created@1`.
5. Web Interface забирает broker-доставку по `getcourse.order.created@1` (механизм триггера — §6.3: клиент-драйвен poll + fallback-джоба), находит локальный checkout request по `event.payload.idempotencyKey`, сохраняет `paymentUrl` и отправляет в WebSocket сообщение `payment_ready`.
6. Клиентская страница получает `paymentUrl` (из HTTP-ответа `api/checkout/status` или из сокета `payment_ready`, §5) и делает redirect на страницу оплаты.

Текущая задача ограничена scaffold и спецификацией. Форма, API `/api/checkout/submit`, broker client, локальные таблицы checkout requests и обработчик broker-доставок будут реализованы отдельным шагом после этой спеки.

## 2. Основа после копирования шаблона

Модуль скопирован из `p/template_project`.

Нормативные identity-значения нового проекта:

| Параметр             | Значение                                  |
| -------------------- | ----------------------------------------- |
| `PROJECT_ROOT`       | `p/units/neso/meta/interfaces/web`        |
| Default title        | `NeSo Meta Web Interface`                 |
| Settings table       | `t__neso_meta_web_iface__setting__7Fk2Qw` |
| Logs table           | `t__neso_meta_web_iface__log__9Xm3Kp`     |
| Admin logs socket id | `admin-logs-neso-meta-web`                |
| Tests SSR marker     | `neso-meta-web-page`                      |

Скопированные template-страницы (`/`, `/web/login`, `/web/profile`, `/web/admin`, `/web/tests`) остаются временным scaffold. При реализации checkout главная `/` должна стать checkout-страницей, а scaffold-тексты должны быть заменены по этой спецификации.

## 3. Роутинг и страницы

Все route-файлы используют путь `'/'`, file-based routing и helpers из `config/routes.tsx`.

Текущие scaffold routes:

| Route          | Файл                    | Доступ   | Статус                                                 |
| -------------- | ----------------------- | -------- | ------------------------------------------------------ |
| `/`            | `index.tsx`             | public   | временная template-страница; целевая checkout-страница |
| `/web/login`   | `web/login/index.tsx`   | public   | scaffold login                                         |
| `/web/profile` | `web/profile/index.tsx` | RealUser | scaffold profile                                       |
| `/web/admin`   | `web/admin/index.tsx`   | Admin    | scaffold admin                                         |
| `/web/tests`   | `web/tests/index.tsx`   | AnyUser  | scaffold tests                                         |

Целевые runtime routes:

| Route                  | Файл                                   | Тип                                 | Назначение                                                                                                                                                                                       |
| ---------------------- | -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                    | `index.tsx` + `pages/CheckoutPage.vue` | `app.html('/')`                     | SSR checkout page, передаёт `requestKey`, `encodedSocketId`, начальные настройки формы                                                                                                           |
| `/api/checkout/submit` | `api/checkout/submit.ts`               | `app.post('/')`, `// @shared-route` | Валидация формы, создание checkout request, публикация `web.checkout.submitted@1`                                                                                                                |
| `/api/checkout/status` | `api/checkout/status.ts`               | `app.post('/')`, `// @shared-route` | **Основной драйвер доставки** (см. §6.3): по `requestKey` поллит/claim'ит доставки брокера, обрабатывает их и возвращает текущий статус + `paymentUrl`. Side-effecting (claim/ack), поэтому POST |
| `/jobs/broker/poll`    | `jobs/broker/poll.ts`                  | `app.job('/broker/poll')`           | **Fallback** (см. §6.3): ограниченная самозавершающаяся poll-петля, добивает доставки, если клиент ушёл со страницы до прихода события                                                           |

> `functions/broker/poll.ts` (`app.function`) в web **не нужен**: poll выполняется в ядре (`core` `/broker/poll`), web лишь вызывает его через broker-клиент (§6.0). Своя app.function-обёртка над чужим poll'ом избыточна.

## 4. Форма checkout

Форма должна собирать все данные, которые нужны GetCourse interface для `/orders/create`, и все заполненные пользователем поля должны попадать в payload broker-события.

Обязательные поля:

| Поле             | Тип    | Назначение                                                                                    |
| ---------------- | ------ | --------------------------------------------------------------------------------------------- |
| `email`          | string | покупатель, обязательный идентификатор GetCourse                                              |
| `offerId`        | string | числовой `offer_id`; если не заполнен, допускается `gc_default_offer_id` на стороне GetCourse |
| `amount`         | number | сумма заказа                                                                                  |
| `currency`       | string | валюта суммы, по умолчанию `RUB`                                                              |
| `requestKey`     | string | локальный ключ checkout request                                                               |
| `idempotencyKey` | string | стабильный ключ `web-checkout:{requestKey}` для GetCourse заказа                              |

Опциональные поля:

| Поле          | Тип    | Назначение                                                                          |
| ------------- | ------ | ----------------------------------------------------------------------------------- |
| `firstName`   | string | имя покупателя                                                                      |
| `lastName`    | string | фамилия                                                                             |
| `phone`       | string | телефон                                                                             |
| `utmSource`   | string | UTM source                                                                          |
| `utmMedium`   | string | UTM medium                                                                          |
| `utmCampaign` | string | UTM campaign                                                                        |
| `utmContent`  | string | UTM content                                                                         |
| `utmTerm`     | string | UTM term                                                                            |
| `comment`     | string | комментарий/контекст заявки; не передавать в GetCourse без отдельной договорённости |
| `sourceUrl`   | string | URL страницы отправки                                                               |
| `returnUrl`   | string | URL возврата после оплаты, если он нужен потребителю                                |

UI должен:

- использовать Vue Composition API;
- не импортировать `tables/`, `repos/`, `lib/` из Vue;
- отправлять форму через `api/checkout/submitRoute.run(ctx, body)`;
- показывать состояния `idle`, `submitting`, `waiting_payment_url`, `redirecting`, `error`;
- после успешного submit ждать WebSocket `payment_ready`, а не сразу переходить;
- иметь fallback-кнопку/таймер для `api/checkout/status`, если socket не сработал.

## 5. WebSocket

Сервер генерирует стабильный socket id:

```ts
const socketId = `checkout:${requestKey}`
const encodedSocketId = await genSocketId(ctx, socketId)
```

Клиент получает `encodedSocketId` через SSR props и подписывается через `getOrCreateBrowserSocketClient().subscribeToData(encodedSocketId)`.

Сервер отправляет в socket не encoded id, а исходный `socketId`.

Сообщения:

| `type`               | Когда                                              | `data`                                               |
| -------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `checkout_submitted` | submit принят, событие в broker опубликовано       | `{ requestKey }`                                     |
| `payment_ready`      | получен `getcourse.order.created@1` с `paymentUrl` | `{ requestKey, paymentUrl, orderKey, gcDealNumber }` |
| `checkout_failed`    | ошибка публикации или обработки delivery           | `{ requestKey, error }`                              |

WebSocket в выбранной модели (rev.2, клиент-драйвен poll — §6.3) — **дублирующий/ускоряющий канал**, не единственный. `paymentUrl` доходит до клиента двумя путями, что наступит раньше:

1. HTTP-ответ `api/checkout/status` (основной путь — тот же клиентский poll, что и продвигает обработку);
2. WebSocket `payment_ready` — если доставку обработал другой триггер (fallback-джоба или параллельная вкладка) между опросами статуса.

Redirect выполняется по первому полученному `paymentUrl` (из HTTP-ответа `status` или из `payment_ready`). URL в обоих случаях берётся из broker-события GetCourse, не конструируется на клиенте. Сообщение `payment_ready` остаётся в контракте сокета как push-ускоритель.

## 6. Broker integration

Core broker target app: `p/units/neso/meta/core`.

### 6.0 Broker-клиент создаётся с нуля

⚠️ В отличие от `interfaces/getcourse`, web-scaffold **не содержит** broker-инфраструктуры: в каталоге нет ни `contracts/brokerEvents.ts`, ни `lib/broker/`, ни `functions/`. Их нужно создать с нуля по образцу **`p/units/neso/meta/core/sample-module`** (рабочий эталон роли consumer):

| Создать в web                        | Образец в `core/sample-module` | Содержимое                                                                                                                                                                             |
| ------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts/brokerEvents.ts`          | `contracts/brokerEvents.ts`    | контракт `web.checkout.submitted@1` (массив `BROKER_EVENT_CONTRACTS`, §6.1)                                                                                                            |
| `lib/broker/coreBrokerClient.lib.ts` | `lib/coreBrokerClient.lib.ts`  | `registerCoreBrokerModule`, `registerCoreBrokerSubscription`, `publishCoreBrokerEvent`, `poll`/`ack`/`fail` обёртки над `runAppFunction(ctx, 'p/units/neso/meta/core', '/broker/...')` |

Контракты вызовов ядра (проверено по реализации core):

- **`/broker/poll`** — `{ consumerModule, authToken, request: { subscriptionKey?, limit? } }` → `{ success, deliveries: [{ deliveryId, claimToken, subscriptionKey, event: { eventType, eventVersion, payload, occurredAt, publishedAt, contractKey, ... } }] }`. Payload события — в `event.payload`. ⚠️ `correlationId` ядром в poll-доставке **не отдаётся** — корреляцию строить по `event.payload.idempotencyKey` (§6.2).
- **`/broker/ack`** — `{ consumerModule, authToken, request: { deliveryId, claimToken } | { items: [...] } }`.
- **`/broker/fail`** — `{ consumerModule, authToken, request: { deliveryId, claimToken, error } | { items: [...] } }` (ядро применяет retry с backoff и dead-letter по `retryPolicy` подписки).

Web module регистрируется как broker module:

```ts
moduleKey: 'p/units/neso/meta/interfaces/web'
displayName: 'NeSo Meta Web Interface'
kind: 'interface'
allowedPublishTypes: ['web.checkout.*']
allowedSubscribeTypes: ['getcourse.order.*']
authToken: 'neso-meta-web-interface-token'
```

### 6.1 Событие `web.checkout.submitted@1`

Producer: Web Interface.  
Consumer: GetCourse Interface.  
Aggregate: `checkout.request`, `aggregateId = requestKey`.  
Idempotency key: `web-checkout-submitted:{requestKey}`.  
Correlation id: `requestKey`.

Payload:

| Поле             | Req | Тип    | Описание                            |
| ---------------- | :-: | ------ | ----------------------------------- |
| `requestKey`     |  ✓  | string | локальный checkout request          |
| `idempotencyKey` |  ✓  | string | ключ для `/orders/create` GetCourse |
| `email`          |  ✓  | string | покупатель                          |
| `offerId`        |  —  | string | offer id, если выбран на форме      |
| `amount`         |  ✓  | number | сумма                               |
| `currency`       |  ✓  | string | валюта                              |
| `firstName`      |  —  | string | имя                                 |
| `lastName`       |  —  | string | фамилия                             |
| `phone`          |  —  | string | телефон                             |
| `utmSource`      |  —  | string | UTM                                 |
| `utmMedium`      |  —  | string | UTM                                 |
| `utmCampaign`    |  —  | string | UTM                                 |
| `utmContent`     |  —  | string | UTM                                 |
| `utmTerm`        |  —  | string | UTM                                 |
| `comment`        |  —  | string | комментарий заявки                  |
| `sourceUrl`      |  —  | string | URL отправки                        |
| `returnUrl`      |  —  | string | URL возврата                        |

Payload schema должен использовать `json-schema-subset-v1`, `additionalProperties:false`, без `$ref`, `format`, `minLength`.

### 6.2 Подписка на события GetCourse

Web Interface регистрирует broker subscription:

```ts
name: 'getcourse-order-created-listener'
sourceModules: ['p/units/neso/meta/interfaces/getcourse']
eventTypes: ['getcourse.order.created']
targetedOnly: false
notification: { mode: 'none' }   // см. §6.3: internal недореализован в ядре, доставка только poll-based
delivery.maxBatchSize: 10
delivery.ackTimeoutMs: 300000
```

Delivery processing (общая процедура, вызывается и из `api/checkout/status`, и из fallback-джобы — §6.3):

1. Через broker-клиент (§6.0) вызвать ядро `/broker/poll` по `subscriptionKey`, claim'нуть batch доставок.
2. Для каждой claimed delivery взять payload из `event.payload`.
3. **Корреляция** — найти локальный checkout request по `event.payload.idempotencyKey` (равен `web-checkout:{requestKey}`). ⚠️ **Только по payload:** ядро в ответе `/broker/poll` **не отдаёт** `correlationId` на уровне доставки (он есть в типе, но не в маппинге poll-response ядра и в admin-агрегате), поэтому корреляция строится исключительно на `event.payload.idempotencyKey`. GetCourse Interface кладёт переданный web `idempotencyKey` (`web-checkout:{requestKey}`) в payload `getcourse.order.created@1` — этого достаточно. ⚠️ Поле доступно только после доработки GetCourse Interface (§8): до неё доставок `getcourse.order.created`, порождённых web-checkout'ом, не будет.
4. Сохранить в строке checkout request `paymentUrl`, `orderKey`, `gcDealNumber`, статус `payment_ready` (под `runWithExclusiveLock` по `requestKey`; повторная обработка той же delivery — no-op).
5. `sendDataToSocket(ctx, socketId, { type: 'payment_ready', data })` — push-ускоритель (§5).
6. Успех — ack через `/broker/ack`; ошибка обработки — fail через `/broker/fail`.
7. Если delivery не сопоставилась ни с одним локальным checkout — **не** ack'ать вслепую: залогировать и fail/оставить для повторной попытки (orphan-доставка чужого producer'а).

### 6.3 Триггер обработки доставок (клиент-драйвен poll + fallback-джоба)

**Ограничения ядра (проверено по реализации `core`):**

- Доставка **только poll-based**: ядро не пушит payload подписчику; consumer обязан сам вызвать `/broker/poll` (claim) → обработать → `/broker/ack`.
- `notificationMode: 'internal'` в ядре **недореализован**: в `dispatchBrokerNotifications` (`core/lib/broker/notify.lib.ts`) обрабатывается только ветка `'socket'`; для `'internal'` уведомление помечается отправленным, но consumer не вызывается. Полагаться на него нельзя.
- `notificationMode: 'socket'` шлёт `broker.deliveries.available` в **браузерный** сокет — это сигнал клиенту, а не серверный триггер; реальная доставка всё равно идёт через poll.
- Готового автоматического poll-loop в ядре/`sample-module` нет (там только ручной admin-вызов).

**Решение (rev.2): два кооперирующих триггера poll'а, без постоянной фоновой петли.**

1. **Основной — клиент-драйвен poll.** После успешного submit страница периодически (интервал ~1–2 с) вызывает `api/checkout/status.run(ctx, { requestKey })`. На сервере роут выполняет процедуру §6.2 (poll → claim → обработка → ack) и возвращает `{ status, paymentUrl? }`. Как только `paymentUrl` получен — клиент делает redirect. Нагрузка на брокер/Heap возникает **только пока пользователь ждёт ссылку**; при простое модуля поллинга нет.
2. **Fallback — самозавершающаяся джоба `jobs/broker/poll.ts`.** Планируется при submit (`scheduleJobAfter`); выполняет ту же процедуру §6.2 и при наличии delivery шлёт `payment_ready` в сокет — чтобы доставка обработалась, даже если клиент закрыл вкладку до прихода события. Джоба **ограничена** (макс. число итераций / срок жизни) и перепланирует себя только пока соответствующий checkout не в терминальном статусе (`payment_ready` / `redirected` / `failed`) и лимит не исчерпан. Это не бесконечный cron.

**Безопасность параллелизма.** `api/checkout/status` и джоба могут поллить одновременно. Двойная обработка одной delivery исключена: claim в `/broker/poll` эксклюзивен (delivery достаётся одному вызову), а запись результата идёт под `runWithExclusiveLock(ctx, 'checkout:' + requestKey, …)`; повторная обработка — no-op по статусу.

**Параметры** (вынести в константы/настройки модуля, не хардкодить в нескольких местах): интервал клиентского poll, лимит итераций и шаг перепланирования fallback-джобы, `limit` батча poll'а.

## 7. Данные

Текущие таблицы scaffold:

| Таблица                                   | Файл                       | Назначение                  |
| ----------------------------------------- | -------------------------- | --------------------------- |
| `t__neso_meta_web_iface__setting__7Fk2Qw` | `tables/settings.table.ts` | настройки template/scaffold |
| `t__neso_meta_web_iface__log__9Xm3Kp`     | `tables/logs.table.ts`     | серверные логи модуля       |

Целевая таблица для реализации checkout:

`tables/checkoutRequests.table.ts` → `t__neso_meta_web_iface__checkout_requests__rQ8pN4`

Поля:

| Поле             | Тип    | Назначение                                                  |
| ---------------- | ------ | ----------------------------------------------------------- |
| `requestKey`     | String | локальный ключ                                              |
| `idempotencyKey` | String | ключ для GetCourse заказа                                   |
| `socketId`       | String | исходный socket id `checkout:{requestKey}`                  |
| `status`         | Enum   | `new`, `submitted`, `payment_ready`, `redirected`, `failed` |
| `formPayload`    | Any    | все поля формы после нормализации                           |
| `paymentUrl`     | String | ссылка оплаты после GetCourse                               |
| `orderKey`       | String | orderKey GetCourse interface                                |
| `gcDealNumber`   | String | номер сделки                                                |
| `errorMessage`   | String | последняя ошибка                                            |

### 7.1 Жизненный цикл `requestKey` и строки checkout

- `requestKey` **генерируется на SSR `/`** (`accountNanoid`) вместе с `encodedSocketId` и передаётся в props формы. До submit это просто значение в props/форме.
- Строка `checkoutRequests` **создаётся только на submit**, не на каждый GET `/`. Иначе обновления страницы и боты плодили бы мусорные пустые записи.
- Стартовый статус создаваемой строки — `submitted` (создание под `runWithExclusiveLock(ctx, 'checkout:' + requestKey, …)`; повторный submit с тем же `requestKey` идемпотентен — §9). Статус `new` в enum при таком lifecycle фактически не используется (оставлен для совместимости; строки в статусе «до submit» не существует).
- Переходы: `submitted` → `payment_ready` (доставка `getcourse.order.created`, §6.2) → `redirected` (клиент ушёл на оплату); `failed` — ошибка публикации в брокер или обработки доставки.

## 8. Изменения в GetCourse Interface

Для полного end-to-end сценария отдельной задачей нужно обновить spec/code проекта `p/units/neso/meta/interfaces/getcourse`:

- зарегистрировать subscription на `web.checkout.submitted@1`;
- обработчик delivery должен вызывать существующую функцию `/orders/create`;
- `idempotencyKey`, `email`, `offerId`, `amount`, `currency`, `firstName`, `lastName`, `phone`, `utm*` передаются без потерь;
- результатом остаётся существующее событие `getcourse.order.created@1`;
- GetCourse Interface обязан положить переданный web `idempotencyKey` (`web-checkout:{requestKey}`) в payload `getcourse.order.created@1` (поле `payload.idempotencyKey`) — это единственный надёжный ключ корреляции для web (ядро не отдаёт `correlationId` в poll-доставке, §6.2). `correlationId = requestKey` в publish-request полезен для admin-трассировки broker-событий, но web на него не полагается. **Реализовано** в getcourse rev.5 (фича 4).

До выполнения этой задачи Web Interface может публиковать `web.checkout.submitted@1`, но payment link не появится автоматически.

## 9. Тестирование

После реализации checkout обязательны проверки:

- unit: нормализация формы, генерация `requestKey`/`idempotencyKey`, socket message builders, broker payload schema;
- integration: submit route создаёт checkout request и публикует `web.checkout.submitted@1`;
- integration: повторный submit с тем же `requestKey` идемпотентен;
- integration: processing `getcourse.order.created@1` сохраняет `paymentUrl`, отправляет `payment_ready` и ack delivery;
- HTTP/UI: `/` содержит checkout form scaffold, socket wait state и redirect branch;
- legacy template tests должны оставаться зелёными или быть заменены доменными checkout-тестами с обновлением `shared/testCatalog.ts`.

Текущий scaffold должен проходить template route/settings/logs tests после identity-замен.

## 10. Остаточные ограничения

- Checkout runtime ещё не реализован.
- Broker-клиент и контракт событий в scaffold **отсутствуют** — создаются с нуля по `core/sample-module` (§6.0).
- **GetCourse-сторона готова (getcourse rev.5, фича 4):** GetCourse Interface подписан на `web.checkout.submitted@1`, создаёт заказ и кладёт `idempotencyKey` (`web-checkout:{requestKey}`) в payload `getcourse.order.created@1`. Для полного end-to-end остаётся реализовать web-часть (эта задача) и обеспечить cold-start: web после publish должен вызвать getcourse `/checkout/process` (иначе ядро не создаст доставку для подписки, зарегистрированной позже publish). Web-часть реализуема и тестируема изолированно (мок брокера/доставок).
- Core broker delivery processing — **только poll-based**; push-delivery нет. `notificationMode:'internal'` в ядре недореализован, поэтому триггер poll'а web обеспечивает сам (клиент-драйвен poll + fallback-джоба, §6.3).
- WebSocket — **дублирующий** канал доставки `paymentUrl` (push-ускоритель), не единственный; основной путь — HTTP-ответ `api/checkout/status` (§5, §6.3).
- Секреты GetCourse остаются в GetCourse Interface; Web Interface их не хранит и не читает.

## 11. Changelog

- 2026-06-22, rev.2: закрыты архитектурные пробелы перед реализацией. Зафиксирован механизм доставки `payment_ready` — клиент-драйвен poll через `api/checkout/status` + самозавершающаяся fallback-джоба `jobs/broker/poll.ts` (§6.3), вместо несуществующего серверного push (`notificationMode:'internal'` в ядре недореализован). Добавлен §6.0 — broker-клиент и `contracts/brokerEvents.ts` создаются с нуля по `core/sample-module`, с точными контрактами `/broker/poll|ack|fail`. Добавлен §7.1 — жизненный цикл `requestKey` (генерация на SSR, строка checkout создаётся только на submit). Уточнены §3 (routes: `status` как POST-драйвер, `functions/broker/poll` убран, добавлена джоба), §5 (WebSocket — дублирующий канал), §6.2 (корреляция и orphan-доставки), §10. Корреляция и end-to-end остаются заблокированы доработкой GetCourse Interface (§8).
- 2026-06-21, rev.1: создана spec-as-source для нового `p/units/neso/meta/interfaces/web`; зафиксирован checkout → broker → GetCourse → broker → WebSocket → redirect flow; описаны scaffold identity, будущие routes, события, данные и зависимости от GetCourse Interface.
