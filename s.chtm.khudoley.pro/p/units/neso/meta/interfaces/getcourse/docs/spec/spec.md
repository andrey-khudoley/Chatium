# Спецификация: `p/units/neso/meta/interfaces/getcourse`

> Статус: актуальная spec-as-source после реализации фич 1–4.
> Дата: 22-06-2026.
> Ревизия 5 — добавлена фича 4: broker-подписка на `web.checkout.submitted@1` (см. §6.2, §15 Changelog спеки).

---

## Scope

Спека охватывает модуль `p/units/neso/meta/interfaces/getcourse` — коннектор между
meta-системой NeSo и GetCourse (через гейтвей `p/gateways/getcourse`).

```
PROJECT_ROOT = 'p/units/neso/meta/interfaces/getcourse'  // config/routes.tsx
```

---

## 1. Роль и границы

`meta/interfaces/getcourse` — **interface-модуль** в meta-системе NeSo. Коннектор между двумя
сторонами:

```
┌────────────────────┐   runAppFunction     ┌──────────────────────────┐   HTTP /v1/{op}   ┌──────────────┐
│ другие модули NeSo  │ ───────────────────▶ │  getcourse (коннектор)   │ ────────────────▶ │ GC-гейтвей    │ ──▶ GetCourse
│ (потребители)       │                      │  • offers/list           │                   │ p/gateways/   │     PL/new API
└────────────────────┘                       │  • orders/create         │ ◀──────────────── │ getcourse     │
                                             │  • broker-публикация     │   { ok, data }     └──────────────┘
        GetCourse ──HTTP postback (no auth)──▶ │  • webhook/getcourse     │
                                             └──────────┬───────────────┘
                                                        │ runAppFunction /broker/publish
                                                        ▼
                                               ┌──────────────────┐
                                               │ meta/core (брокер)│
                                               └──────────────────┘
```

**Весь трафик к GetCourse идёт через гейтвей** (а не напрямую), кроме входящего postback —
он приходит в коннектор напрямую (в гейтвее приём GC-постбэков не реализован, см. §12 Вне области).

### Зафиксированные решения

| #   | Решение                 | Значение                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Поверхность API заказа  | **Внутренний сервис**: операции вызываются другими модулями NeSo через `runAppFunction`. Публичный HTTP — только webhook.                                                                                                                                                                                                                                                       |
| 2   | События в ядро          | **Полный набор**: `getcourse.order.created` / `.paid` / `.status_changed` (+ существующий `getcourse.raw_event.accepted`).                                                                                                                                                                                                                                                      |
| 3   | Список офферов          | **Живой запрос** к гейтвею при каждом вызове (без кэш-таблицы).                                                                                                                                                                                                                                                                                                                 |
| 4   | Создание сделки         | **Через гейтвей** `/v1/createDeal`; тело POST = `{ params: { user, deal, system, session } }`; платёжную ссылку парсит сам коннектор из сырого ответа GC.                                                                                                                                                                                                                       |
| 5   | Идентификация оффера    | Работаем **только с `offerId`** (числовой `offer_id` GetCourse). `offerCode` не используем.                                                                                                                                                                                                                                                                                     |
| 6   | Аутентификация webhook  | GC postback **не несёт подписи/секрета** — криптографическую проверку подлинности сделать нельзя (см. §7).                                                                                                                                                                                                                                                                      |
| 7   | Легаси `neso/order`     | Прямую GC-интеграцию `neso/order` **не переносим**, используем только как референс. Реализация пишется заново. Легаси-код выносится в `deprecated/` отдельной задачей.                                                                                                                                                                                                          |
| 8   | Источник заказов из web | **Broker-подписка** (фича 4, §6.2): коннектор подписывается на `web.checkout.submitted@1` от модуля `interfaces/web`, обработчик доставки вызывает существующий `createOrder` и проставляет `correlationId = requestKey`. Триггер обработки — pump от publisher (web дёргает `/checkout/process` после publish), в идиоме ядра (publish → `scheduleJobAsap`), без вечного cron. |

---

## 2. Контракт вызова гейтвея

Источник истины: `p/units/yakovleva/pay/lib/gateway/gcClient.ts` (рабочий потребитель того же
гейтвея) и сам гейтвей `p/gateways/getcourse/lib/gateway/*`.

- **Транспорт:** HTTP через `@app/request`. `runAppFunction` к гейтвею **не применим** —
  операции гейтвея это HTTP-роуты `app.get/post('/')`, не `app.function`.
- **URL:** `${gateway_base_url}/v1/{op}`, где `gateway_base_url` — настройка коннектора. Без хардкода.
- **Метод:** `getOffers` — GET (аргументы в query), `createDeal` — POST.
- **Тело POST `createDeal`** — JSON **`{ params: { … } }`** (объект `params` на верхнем уровне тела).
  Гейтвей читает тело как args и берёт `args.params`
  (`p/gateways/getcourse/lib/gateway/v1IncomingPost.ts:extractJsonObjectArgs`,
  `api/v1/createDeal.ts`); валидатор требует `params` обязательным
  (`lib/gateway/operationsCatalogLegacy.ts`). **Не** оборачивать в `{ args: { params } }`.
- **Заголовки от коннектора:**
  - `X-Gc-School-Host` — хост школы GetCourse (без схемы, напр. `neso.getcourse.ru`);
  - `X-Gc-School-Api-Key` — API-ключ школы;
  - `Content-Type: application/json; charset=utf-8` (для POST).
  - **developer-key коннектор НЕ передаёт** — гейтвей подставляет его из своего Heap
    (`handleV1OpRun.ts` читает `GC_DEVELOPER_API_KEY` гейтвея). ⚠️ Предусловие: dev-key должен быть
    настроен **в админке гейтвея**, иначе гейтвей отклонит **любую** операцию (включая `createDeal`)
    с `GATEWAY_DEV_KEY_NOT_CONFIGURED` ещё до обращения к GC (см. §11 D8).
- **Конверт ответа гейтвея:**
  - успех: `{ ok: true, data: <сырой JSON GetCourse>, requestId, warnings? }`;
  - ошибка: `{ ok: false, error: { code, message, details? }, requestId }`.
- **Гейтвей сам классифицирует ошибки GC** (таймаут, сеть, upstream, семантические/лимитные
  ошибки GC) и отдаёт их как `ok:false` с конкретным `error.code` и сырым телом GC в `error.details`
  (`handleV1OpHelpers.ts:interpretGcAndBuildResult`). Коннектор обязан:
  1. сначала проверить `ok`; при `ok:false` — **ветвиться по `error.code`** (timeout / network /
     `INVOKE_GC_UPSTREAM_ERROR` / `INVOKE_GC_SEMANTIC_ERROR` / `INVOKE_GC_LIMIT_ERROR` /
     `GATEWAY_DEV_KEY_NOT_CONFIGURED` и пр.), формировать осмысленный `errorMessage` и
     **сохранять сырой `error` в `Orders.rawCreateResponse`** для трассировки;
  2. только при `ok:true` — парсить `data` (см. §6).
- `throwHttpErrors: false`, timeout ≈ 15000 мс, серверные ретраи не делаем.

---

## 3. Реализованные слои и файлы

Каркас (`config/`, `pages/`, `web/`, `pagecss/`, `shared/`, логгер, настройки, тесты,
`lib/broker/coreBrokerClient.lib.ts`, `contracts/brokerEvents.ts`) переиспользуется.

```
contracts/brokerEvents.ts            # + 3 новых контракта событий (→ broker-events.md)
lib/settings.lib.ts                  # + новые SETTING_KEYS и SECRET_SETTING_KEYS (§4)
lib/gateway/gcGatewayClient.lib.ts   # единственный исходящий клиент гейтвея: callGetOffers, callCreateDeal
lib/gateway/parseGcDeals.lib.ts      # разбор ответа createDeal (написан ЗАНОВО; neso/order как референс, §6)
lib/offers/offers.lib.ts             # fetchOffers(ctx), normalizeOffer(raw)
lib/orders/orders.lib.ts             # createOrder(ctx, input): валидация → идемпотентность → гейтвей → Orders → broker
lib/orders/orderStatus.lib.ts        # маппинг GC-статуса/is_payed → внутренний статус
lib/webhook/processWebhook.lib.ts    # разбор тела, корреляция, обновление Orders, broker
repos/orders.repo.ts                 # findByOrderKey, findByIdempotencyKey, findByGcDealId, findByGcDealNumber, upsert
repos/webhookEvents.repo.ts          # findByWebhookId, upsert
tables/orders.table.ts               # Heap-таблица Orders (→ tables.md)
tables/webhookEvents.table.ts        # Heap-таблица WebhookEvents (→ tables.md)
functions/offers/list.ts             # app.function '/offers/list'  (фича 1)
functions/orders/create.ts           # app.function '/orders/create' (фича 2)
functions/orders/get.ts              # app.function '/orders/get' (запрос статуса)
api/webhook/getcourse/index.ts       # public app.post('/') (фича 3)
lib/broker/coreBrokerClient.lib.ts   # + регистрация подписки и poll/ack/fail на web.checkout.* (фича 4, §6.2)
lib/checkout/processCheckoutSubmitted.lib.ts  # парсер payload + handle (→ createOrder) + drain poll-обвязка (фича 4)
functions/checkout/process.ts        # app.function '/checkout/process' — pump-точка обработки доставок (фича 4)
components/admin/AdminSettings.vue   # + карточка «GetCourse» с вводом настроек и секретов (§4.1)
```

**Почему `functions/` для фич 1–2:** потребители зовут коннектор через
`runAppFunction(ctx, 'p/units/neso/meta/interfaces/getcourse', '/offers/list', …)`. Это требует
`app.function`, а не HTTP-роуты. Webhook остаётся HTTP-роутом — его вызывает внешний GetCourse.

HTTP-роуты админки для списка офферов/заказов (`api/admin/offers/list.ts`,
`api/admin/orders/recent.ts`) в текущей реализации отсутствуют и остаются опциональным расширением.

---

## 4. Настройки

Ключи добавлены в `lib/settings.lib.ts`. Значения хранятся в существующей таблице `Settings`
(`t__neso_meta_getcourse__setting__7Fk2Qw`). **Все ключи задаются в админ-панели самого модуля**
(`api/settings/save.ts` + `components/admin/AdminSettings.vue`).

| Ключ                  | Назначение                                                                            | Секрет |
| --------------------- | ------------------------------------------------------------------------------------- | :----: |
| `gateway_base_url`    | Базовый URL GC-гейтвея (до `/v1`)                                                     |   —    |
| `gc_school_host`      | Хост школы GetCourse (без схемы)                                                      |   —    |
| `gc_school_api_key`   | API-ключ школы (`X-Gc-School-Api-Key`)                                                | **да** |
| `webhook_path_token`  | (опц.) статичный токен в URL постбэка — **слабый** фильтр, не аутентификация (см. §7) | **да** |
| `gc_default_offer_id` | (опц.) числовой `offer_id` по умолчанию                                               |   —    |
| `gc_paid_status`      | (опц.) GC-статус как «оплачен» (по умолч. `payed`)                                    |   —    |

- `gc_school_api_key` и `webhook_path_token` добавлены в `SECRET_SETTING_KEYS`; читаются через
  `getRawSecretSettingString`, никогда не возвращаются в `getAllSettings`.
- Опциональные ключи (`gc_default_offer_id`, `gc_paid_status`) — без `DEFAULTS` `getSetting`
  вернёт `null`; для `gc_paid_status` задан `DEFAULTS[gc_paid_status]='payed'`, остальные
  обрабатываются как пустые значения.
- Валидация (формат base URL, host, числовой `offer_id`, длина токена) реализована в `setSetting`
  по образцу существующих веток.

### 4.1. Веб-интерфейс ввода настроек и секретов (M9)

Бэкенд настроек пригоден для секретов: `api/settings/get|save|list`,
`redactSettingValue` (секрет → `{ configured: boolean }`), `getRawSecretSettingString`.
`components/admin/AdminSettings.vue` дополнен карточкой «GetCourse» с полями из таблицы §4:

- несекретные поля (`gateway_base_url`, `gc_school_host`, `gc_default_offer_id`, `gc_paid_status`) —
  обычные `text`-инпуты; значение читать через `api/settings/get`, сохранять через `api/settings/save`
  (с дебаунсом, как у имени проекта);
- **секреты** (`gc_school_api_key`, `webhook_path_token`) — `type="password"`, **write-only**: не
  префиллить, показывать индикатор «задан» по `{ configured }` из `getAllSettings`/`get`; пустой ввод
  не сохранять (не затирать существующий секрет); сохранять только введённое новое значение;
  значение секрета **никогда не возвращать на клиент и не логировать**.

Реализация использует `GC_PLAIN_KEYS` для несекретных полей и `GC_SECRET_KEYS` для write-only
секретов. Для секретов поле не префиллится, пустое значение не сохраняется, после успешного
сохранения ввод очищается, а UI показывает только индикатор `configured`.

---

## 5. Фича 1 — список всех офферов

**Операция:** `app.function('/offers/list', …)` → `lib/offers/offers.lib.ts:fetchOffers`.

**Поток:**

1. `callGetOffers(ctx)` → GET `${gateway_base_url}/v1/getOffers` с заголовками школы (аргументы
   не нужны — у операции `EMPTY_SCHEMA`).
2. При `ok:false` — вернуть `{ ok: false, error }` (ветвление по `error.code`, §2).
3. **Двойная обёртка:** офферы лежат в `data.data` (гейтвей оборачивает сырой ответ GC, GC
   оборачивает массив в `ResultResponse.data`). Извлекать терпимо, по образцу
   `yakovleva/pay/api/widgets/offers.ts:extractGcOffers`.
4. Нормализовать каждый оффер:

   | Поле результата | Источник GC                 | Тип    |
   | --------------- | --------------------------- | ------ |
   | `id`            | `id ?? offer_id ?? offerId` | string |
   | `title`         | `title ?? name`             | string |
   | `price`         | `price`                     | number |
   | `finalPrice`    | `final_price ?? price`      | number |
   | `currency`      | `currency`                  | string |
   | `status`        | `status`                    | string |

5. Вернуть `{ ok: true, offers: NormalizedOffer[] }`.

Без кэша: каждый вызов идёт в гейтвей. Данные в Vue — только через SSR-пропсы или fetch к
админ-роуту (heap на клиенте запрещён).

> `getOfferById` в гейтвее помечен `availability:'disabled'` (503,
> `operationsCatalogNew1.ts:343`). Один оффер — фильтрацией результата `getOffers`.

---

## 6. Фича 2 — создание заказа + платёжная ссылка

**Операция:** `app.function('/orders/create', …)` → `lib/orders/orders.lib.ts:createOrder`.

**Вход (от модуля-потребителя):**

| Поле                               | Обяз. | Примечание                                                                           |
| ---------------------------------- | :---: | ------------------------------------------------------------------------------------ |
| `idempotencyKey`                   |  да   | внешний ключ идемпотентности от потребителя (см. ниже)                               |
| `email`                            |  да   | ключ идентичности пользователя в GetCourse                                           |
| `firstName` / `lastName` / `phone` |  нет  | данные пользователя                                                                  |
| `offerId`                          | да\*  | числовой `offer_id`; \*иначе берётся `gc_default_offer_id`                           |
| `amount`                           |  да   | **сумму задаёт потребитель** — сделка формируется именно с этой суммой (`deal_cost`) |
| `currency`                         |  да   | валюта суммы (`deal_currency`)                                                       |
| `utmSource…utmTerm`                |  нет  | пробрасываются в session/addfields                                                   |

> **Источник истины суммы (реш. M2):** сумму всегда передаёт вызывающий модуль; ответ `createDeal`
> её не возвращает. `Orders.amount` (Money, из `amount`+`currency`) — единственный источник истины;
> события `created` и `paid` берут `amount`/`currency` из `Orders.amount`. Из постбэка `cost` не
> используем как сумму (он лишь индикатор, см. §7).

**Идемпотентность создания (M1).** Потребитель **обязан** передать `idempotencyKey` — стабильный
ключ его бизнес-операции (напр. id заявки). Коннектор:

1. `runWithExclusiveLock(ctx, 'gc-order-create:' + idempotencyKey, …)` — лок по **внешнему** ключу
   (а не по свежесгенерированному `orderKey`, иначе лок бесполезен);
2. внутри лока — `findByIdempotencyKey(ctx, idempotencyKey)`; если заказ уже существует и
   `status !== 'failed'` — **вернуть его** (`paymentUrl`, `dealNumber`, `orderKey`) без повторного
   создания сделки в GC;
3. если найден заказ со `status === 'failed'`, считать это retry транзиентного сбоя: переиспользовать
   существующий `orderKey`, повторить вызов гейтвея и перезаписать результат;
4. иначе — сгенерировать внутренний `orderKey` (`accountNanoid`), создать сделку и сохранить заказ
   с этим `idempotencyKey`.

**Поток (внутри лока, когда нет успешного существующего заказа):**

1. Собрать `params` для GC import-API (**только `offer_id`**):
   ```
   {
     user:   { email, first_name?, last_name?, phone? },
     deal:   { offer_id: <number>, deal_cost: <amount>, deal_currency: <currency>, addfields? },
     system: { refresh_if_exists: 1, multiple_offers: 1, return_payment_link: 1 },
     session: { utm_source?, … }
   }
   ```
   Флаг **`system.return_payment_link: 1`** обязателен — иначе GC не вернёт ссылку.
   `offer_id` передаём **числом** (валидатор гейтвея: `deal.offer_id` — number); `deal_cost` —
   нашей суммой (реш. M2).
2. `callCreateDeal(ctx, params)` → POST `${gateway_base_url}/v1/createDeal`, тело **`{ params }`**.
   Гейтвей кодирует `params` в Base64 и шлёт на `/pl/api/deals`, но **возвращает сырой ответ GC
   в `data` без разбора ссылки**.
3. **Обработка конверта гейтвея (§2):** при `ok:false` — ветвление по `error.code`, заказ
   сохраняется со `status:'failed'`, `rawCreateResponse = error`, лог severity 3, выход
   `{ success:false, errorMessage }`.
4. **Разбор `data` коннектором** (`parseGcDeals.lib.ts`, написан заново; референс —
   `neso/order/lib/getcourse.lib.ts:parsePlDealsResponse`): GetCourse отдаёт HTTP 200 даже при
   ошибке; успех = `body.success === true` И `result.success === true`; `result.error === true`
   → ошибка. При успехе: `result.payment_link`, `result.deal_id`, `result.deal_number`,
   `result.user_id`.
5. Записать `Orders` (→ [tables.md](tables.md)) через `createOrUpdateBy(ctx, 'orderKey', { … })`:
   `status: 'new'` (только что созданная сделка ещё не оплачена — это GC-статус `new`, см. §8),
   `paymentUrl`, `gcDealId`, `gcDealNumber`, `amount(Money)`, `idempotencyKey`, `userEmail`,
   `firstName`/`lastName`/`phone`, `utm*`, `offerId`, `rawCreateResponse`.
6. Опубликовать в брокер `getcourse.order.created@1` (→ [broker-events.md](broker-events.md)),
   `idempotencyKey: 'getcourse-order-created:' + orderKey`, **`occurredAt: 0`** (детерминировано;
   у ответа createDeal таймстемпа нет, а ключ уникален per `orderKey` — конфликта отпечатка не будет,
   §10/B2). НЕ `Date.now()`.
7. Вернуть `{ success: true, paymentUrl, dealNumber, orderKey }`.

При ошибке на любом шаге — `{ success: false, errorMessage }`, лог severity 3, заказ
сохраняется со `status: 'failed'` (для трассировки).

> **Инвариант (M3):** «быстрая оплата раньше создания заказа» невозможна. Заказ всегда сначала
> создаётся и сохраняется (на этом шаге выдаётся платёжная ссылка), оплата возможна только по этой
> ссылке. Значит к моменту прихода webhook'а об оплате `Orders`-строка гарантированно существует —
> orphan-корреляции по оплате нет.

### 6.1. Запрос статуса заказа — `/orders/get`

**Операция:** `app.function('/orders/get', …)` → `repos/orders.repo.ts`.

- **Вход:** `{ orderKey }` **или** `{ idempotencyKey }` (одно из двух обязательно).
- **Поток:** `findByOrderKey` / `findByIdempotencyKey`; не найдено → `{ ok: false, error: 'not_found' }`.
- **Выход (снапшот заказа):** `{ ok: true, order: { orderKey, idempotencyKey, status, paymentUrl,
gcDealId, gcDealNumber, offerId, amount, currency, userEmail } }`. `amount`/`currency` — из
  `Orders.amount` (Money). Сырые поля (`rawCreateResponse`/`rawStatus`) наружу не отдаём.

### 6.2. Фича 4 — broker-подписка на `web.checkout.submitted@1`

**Назначение.** Коннектор подписывается на событие веб-формы checkout (`interfaces/web`) и
по доставке создаёт заказ существующей логикой `createOrder` (фича 2). Это вход «из веба через
ядро-брокер» — параллельный прямому `runAppFunction('/orders/create')`.

**Producer:** `p/units/neso/meta/interfaces/web`. **Consumer:** этот модуль.

**Loose coupling (проверено по ядру):** подписку можно зарегистрировать **до** того, как web-модуль
и контракт `web.checkout.submitted@1` появятся в брокере — ядро при регистрации подписки валидирует
только что consumer зарегистрирован и `allowedSubscribeTypes` покрывает тип. Доставки начнут
создаваться, когда web впервые опубликует событие. Поэтому фича 4 реализуется независимо от web.

**Регистрация (ленивая, по образцу фич 1–3 — перед первым poll):**

```ts
// модуль: allowedSubscribeTypes расширяется
allowedSubscribeTypes: ['web.checkout.*']

// подписка
name: 'web-checkout-submitted-listener'
sourceModules: ['p/units/neso/meta/interfaces/web']
eventTypes: ['web.checkout.submitted']
targetedOnly: false
notification: { mode: 'none' }       // ядро доставляет только по poll; mode:'internal' в ядре недореализован
delivery: { maxBatchSize: 10, ackTimeoutMs: 300000 }
```

> ⚠️ **Порядок регистрации (cold-start).** Ядро создаёт доставки только для подписок, существующих
> **на момент публикации** события (ретроактивно доставки не создаются). Поэтому подписка обязана быть
> зарегистрирована **до первой** публикации `web.checkout.submitted`. Регистрация идемпотентна и
> выполняется при первом вызове `/checkout/process` (в т.ч. при пустом poll — `pollCoreBrokerDeliveries`
> сначала `registerCoreBrokerSubscription`, затем poll). **Требование к web-задаче:** при инициализации,
> до первого publish, один раз вызвать getcourse `/checkout/process` (или иной триггер, дергающий
> регистрацию), иначе первое веб-событие не породит доставку. Это согласуется с pump-моделью: web после
> каждого publish и так дёргает `/checkout/process`.

**Контракт входящего payload `web.checkout.submitted@1`** (терпимый парсер — точную форму задаёт
web spec §6.1; поля могут отсутствовать):

| Поле                                  | Req | В `createOrder`                                                   |
| ------------------------------------- | :-: | ----------------------------------------------------------------- |
| `requestKey`                          |  ✓  | → `correlationId` publish-события                                 |
| `idempotencyKey`                      |  ✓  | → `idempotencyKey` (ключ заказа)                                  |
| `email`                               |  ✓  | → `email`                                                         |
| `amount`                              |  ✓  | → `amount`                                                        |
| `currency`                            |  ✓  | → `currency`                                                      |
| `offerId`                             |  —  | → `offerId` (иначе `gc_default_offer_id`)                         |
| `firstName` / `lastName` / `phone`    |  —  | → одноимённые                                                     |
| `utmSource…utmTerm`                   |  —  | → `utmSource…utmTerm`                                             |
| `comment` / `sourceUrl` / `returnUrl` |  —  | **не** передаются в GC (реш. M2-аналог; вне контракта createDeal) |

**Поток обработки одной доставки** (`handleCheckoutSubmittedPayload`, выделен в чистую функцию для
тестов — по образцу `processWebhook`):

1. Распарсить payload (`extractCheckoutPayload`). Нет обязательных полей (`requestKey` /
   `idempotencyKey` / `email` / `amount` / `currency`) → **перманентная** ошибка: лог severity 4,
   вернуть `{ ok:false, permanent:true }` (retry бесполезен).
2. `createOrder(ctx, { idempotencyKey, email, amount, currency, offerId?, firstName?…, utm*?,
correlationId: requestKey })`. `createOrder` уже идемпотентен по `idempotencyKey` и сам публикует
   `getcourse.order.created@1`.
3. `createOrder` success → `{ ok:true, orderKey }`. failure → `{ ok:false, permanent:false }`
   (транзиентный сбой гейтвея — допускается retry доставки).

> **Корреляция для web (закрывает блокер web spec §8):** в `getcourse.order.created@1` > `payload.idempotencyKey` = переданный web `web-checkout:{requestKey}` (createOrder кладёт входной
> ключ в payload), а `correlationId` publish-события = `requestKey`. Web сопоставляет ответ по любому
> из них без чтения чужих таблиц.

**Триггер обработки — pump от publisher (идиома ядра, без вечного cron):**

- Точка входа `functions/checkout/process.ts` → `app.function('/checkout/process')` →
  `processCheckoutSubmittedDeliveries(ctx)`.
- `processCheckoutSubmittedDeliveries`: цикл poll (`/broker/poll` по `subscriptionKey`) → для каждой
  delivery `handleCheckoutSubmittedPayload` → `ok` или `permanent` → **ack**; транзиентная ошибка →
  **fail** (ядро применит retry/backoff/dead-letter). Drain: повторять, пока poll отдаёт полный батч
  (до лимита батчей), затем выход. Возврат `{ processed, failed }`.
- Вызывается: будущим web-модулем сразу после `publish` (push-trigger, как ядро делает
  `scheduleJobAsap` для notifications-dispatch); вручную/из админки; из тестов.
- **Зависимость от web (отмечено как остаточное):** периодический автономный «будильник» не вводим —
  ядро хранит доставки at-least-once, поэтому потерянный push добирается следующим вызовом
  `/checkout/process`; полностью автономный fallback-цикл (самоперепланирующаяся джоба) — опциональное
  расширение, вне этой фичи.

**Идемпотентность доставки (at-least-once).** Повторная доставка того же `web.checkout.submitted`
→ тот же `idempotencyKey` → `createOrder` вернёт существующий заказ (вторая сделка не создаётся),
повторная публикация `getcourse.order.created@1` идемпотентна по ключу `getcourse-order-created:{orderKey}`
(ядро дедуплицирует). Двойная обработка из параллельных вызовов `/checkout/process` исключена
эксклюзивным claim в `/broker/poll` + локом в `createOrder`.

---

## 7. Фича 3 — входящий postback GetCourse → хранение статусов

**Механизм:** GC **postback** (`https://getcourse.ru/pl/postback/redoc`). Регистрируется
управляющим вызовом `/set-uri` с `event_object_id = 2` (Заказы) и `event_id = 2` (смена статуса —
покрывает все переходы; `event_id = 3` «оплачен» — опционально как явный сигнал). GC шлёт
**POST JSON** на зарегистрированный URI при событии по сделке.

> ⚠️ **Регистрация постбэка пока не самообслуживаемая (реш. 1, D10):** операция `setUri` в гейтвее
> сейчас `availability:'disabled'` (503, `operationsCatalogNew1.ts:15`), а devKey для прямого вызова
> GC у коннектора нет. До включения `setUri` в гейтвее URI постбэка регистрируется **внешним/ручным
> шагом**. Спека коннектора это предусловие фиксирует, но саму регистрацию не выполняет.

**Роут:** `api/webhook/getcourse/index.ts` → `app.post('/', …)` — публичный, анонимный
(БЕЗ `requireRealUser`, БЕЗ `// @shared-route`). URL формируется через `withProjectRoot(route.url())`.

**Аутентификация — отсутствует у GC (решение 6).** GC postback **не передаёт подписи, секрета или
токена** в доставке (Bearer `devKey_apiKey` — только для управляющего API регистрации, не для
доставки события). Криптографически проверить подлинность тела **нельзя**.

- Единственный доступный слабый барьер — **статичный токен в самом URI постбэка**
  (`?token=<webhook_path_token>`), который мы задаём при регистрации. Если `webhook_path_token`
  настроен — сверять `req.query.token` строгим равенством и при несовпадении отвечать `403`;
  при отсутствии настройки — приём без проверки. Это **не аутентификация**, а фильтр от случайного
  трафика; в спеке и логах это явно помечаем. Токен никогда не логировать.

**Обработка** (`lib/webhook/processWebhook.lib.ts`):

1. Разобрать тело (POST JSON). Поля сделки GC postback (терпимый парсер; объект может лежать
   в корне или во вложенном `object`/`deal`; **точная форма тела GC не документирована — финализировать
   по живому сэмплу**, D3): `id` (deal_id), `number` (номер заказа), `status`, `is_payed` (boolean),
   `cost`, `currency`, `user_id`, `status_updated_at`. Email в постбэке нет — корреляция по `id`/`number`.
   **Таймстемпы GC — строки** вида `"2026-01-17 03:59:08"` (не Unix) → `status_updated_at` парсим в
   Unix ms (`Date.parse`), это и есть `occurredAt` событий (§10).
2. **`webhookId` для дедупликации** — детерминированный бизнес-ключ
   `` `${deal_id}:${status}:${status_updated_at}` `` (а не `stableHash(body)` — тело может содержать
   изменчивые поля).
3. `runWithExclusiveLock(ctx, 'gc-webhook:' + webhookId, …)`:
   - если событие уже `processed` → 200, без изменений;
   - **корреляция:** найти `Orders` по `gcDealId` (приоритет), затем по `gcDealNumber`;
   - прочитать **текущий** `Orders.status` (это и есть `fromStatus`), затем обновить `status`
     через маппинг (§8). **Регрессии статуса допускаются** (M4) — менеджер GC вправе откатить статус;
     guard монотонности не ставим.
4. Опубликовать в брокер (всё ещё внутри лока):
   - всегда — `getcourse.order.status_changed@1`
     (`idempotencyKey: 'getcourse-status:' + orderKey + ':' + webhookId`, `occurredAt` = Unix ms из
     `status_updated_at`; webhookId уникален per постбэк — исключает fingerprint-конфликт);
   - при переходе в оплату — дополнительно `getcourse.order.paid@1`
     (`idempotencyKey: 'getcourse-order-paid:' + orderKey`, тот же `occurredAt`).
   - `getcourse.raw_event.accepted@1` на постбэк **не публикуем** (реш. 10) — типизированных событий
     достаточно; контракт `raw_event` остаётся только для обратной совместимости.
5. **Сохранение `processed` — только после успешной публикации (реш. M6/4):** `WebhookEvents`
   записывается с `processed: true, orderKey` **после** успешной публикации в брокер. Если публикация
   упала — `processed` не ставим (или `false`), чтобы переотправка/ручной разбор смогли дозалить.
6. **Коды ответа:**
   - валидный приём и успешная обработка → **200**;
   - провал токен-фильтра (если настроен) → **403**;
   - **внутренняя ошибка обработки** (парс/корреляция/публикация в брокер) → **5xx** (M6).
     GC ретраев не делает, но 5xx отдаём корректно (мониторинг/ручной разбор; не маскируем сбой
     под 200). Идемпотентность (`webhookId` + `processed` + детерминированные ключи и `occurredAt`)
     делает любую переотправку безопасной.

---

## 8. Маппинг статусов

| Внутренний `status` | Источник (GC)                                                                           |
| ------------------- | --------------------------------------------------------------------------------------- |
| `new`               | сделка создана в GC, оплата не начата (GC `new`) — начальный статус после `createOrder` |
| `pending`           | ожидаем оплату/в работе (`in_work` / `not_confirmed` / `payment_waiting`)               |
| `part_paid`         | `part_payed`                                                                            |
| `paid`              | `is_payed` истинно или `status = payed` (или значение `gc_paid_status`)                 |
| `cancelled`         | `cancelled` / `waiting_for_return` / `false`                                            |
| `failed`            | ошибка создания/сети (присваивается коннектором, не из GC)                              |

Полный словарь GC-статусов (postback redoc): `new`, `in_work`, `not_confirmed`,
`payment_waiting`, `waiting_for_return`, `part_payed`, `payed`, `cancelled`, `false`.

`is_payed` истинно при значениях: `true`, `1`, `'1'`, `'true'`.

---

## 9. Данные

Коннектор хранит domain-данные сам (ядро персистит только журнал событий и реестр доставок).
Money — только методами `.add()` / `.subtract()` / `.multiply()`, без обычной арифметики.
**`Money` несёт валюту сам** (`@app/heap` `Money`/`Currency`) — отдельной колонки `currency` в
`Orders` нет (валюта берётся из `amount`). Подсчёт — `countBy`; фильтры — `where`;
order — `[{ field: 'asc' | 'desc' }]`.

Схемы таблиц → **[tables.md](tables.md)**.

---

## 10. Broker-контракты

Объявляются в `contracts/brokerEvents.ts` (массив `BROKER_EVENT_CONTRACTS`), регистрируются
при `registerCoreBrokerModule`. Жёсткие правила ядра:

- `sourceRef.path` строго `'contracts/brokerEvents.ts'`, `sourceRef.moduleKey === MODULE_KEY`;
- контракт **иммутабелен** на пару `eventType@eventVersion` — изменение схемы ⇒ bump версии;
- `payloadSchemaFormat: 'json-schema-subset-v1'`; разрешённый набор ключей строго: `type`,
  `required`, `properties`, `items`, `additionalProperties`, `enum`, `const`
  (`schemaValidation.lib.ts:3`; без `$ref`/`format`/`minLength`/nullable — «опциональность» поля
  выражается только его отсутствием в `required`);
- `eventType` под паттерн `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`;
- модуль регистрируется с `allowedPublishTypes: ['getcourse.*']` и (фича 4)
  `allowedSubscribeTypes: ['web.checkout.*']`.
- **`correlationId` (фича 4):** при создании заказа из доставки `web.checkout.submitted@1`
  publish-запрос `getcourse.order.created@1` несёт `correlationId = requestKey` (проброс через
  `createOrder`); это не входит в `payload`-схему контракта (поле конверта события), схему не меняет.
- **Идемпотентность и fingerprint (B2):** `fingerprintPublishRequest`
  (`internalApi.lib.ts:57`) считает отпечаток по `eventType/eventVersion/occurredAt/targetModules/
aggregate*/correlation*/payload`. Тот же `idempotencyKey` + другой отпечаток →
  **жёсткая ошибка** `Idempotency fingerprint conflict`. Поэтому:
  1. **`occurredAt` детерминирован** — `status_changed`/`paid` берут Unix ms из `status_updated_at`
     постбэка (строка `"YYYY-MM-DD HH:MM:SS"` → `Date.parse`); `created` использует `occurredAt: 0`
     (у ответа createDeal таймстемпа нет, ключ уникален per `orderKey`). **Никогда не `Date.now()`**
     (в т.ч. на уровне publish-request в `coreBrokerClient.lib.ts`);
  2. в payload **нет волатильных полей** (убраны `occurredAt`/`paidAt` из тел событий — см.
     broker-events.md); все поля payload детерминированы по сделке.
     Это гарантирует, что повторная публикация того же логического события = чистый no-op, а не конфликт.
- Доставка: at-least-once, poll-based. Ключи детерминированы (§6–7).

Контракты и payload → **[broker-events.md](broker-events.md)**.

---

## 11. Открытые вопросы

| #   | Риск / ограничение                                                                                        | Влияние на спеку                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Транспорт к гейтвею — **HTTP** (подтверждён по `gcClient.ts`).                                            | Зафиксировано: `@app/request`, не `runAppFunction`.                                                                                                                                                                                          |
| D2  | Гейтвей возвращает сырой ответ GC и **не парсит `payment_link`**.                                         | Разбор на стороне коннектора (`parseGcDeals.lib.ts`). Точный путь поля проверить на живом ответе.                                                                                                                                            |
| D3  | **Точная форма тела доставляемого постбэка GC не опубликована** (redoc описывает только управляющий API). | Парсер терпимый (корень/`object`/`deal`, варианты ключей); ожидаемые поля: `id`, `number`, `status`, `is_payed`, `cost`, `currency`, `user_id`, `status_updated_at`; финализировать по живому сэмплу. Таймстемпы — строки datetime, не Unix. |
| D4  | Import/export API GetCourse требует платного тарифа школы.                                                | Операционное предусловие, не код.                                                                                                                                                                                                            |
| D5  | `getOfferById` в гейтвее `disabled` (503).                                                                | Один оффер — фильтрацией `getOffers`.                                                                                                                                                                                                        |
| D6  | Доки ядра (`core/docs/*`) описывают только settings/logs, не брокер.                                      | Источник истины — `lib/broker/*` и `functions/broker/*`, не доки.                                                                                                                                                                            |
| D7  | Доставка брокера at-least-once; GC postback ретраев не шлёт.                                              | Идемпотентность обязательна: `runWithExclusiveLock` + флаг `processed` + детерминированные `idempotencyKey` + детерминированный `occurredAt`.                                                                                                |
| D8  | Гейтвей требует **свой** `GC_DEVELOPER_API_KEY` до диспетчеризации любой операции.                        | Предусловие: dev-key настроен в админке гейтвея, иначе `createDeal`/`getOffers` падают `GATEWAY_DEV_KEY_NOT_CONFIGURED`.                                                                                                                     |
| D9  | GC postback **без подписи/секрета** — подлинность тела не проверяется.                                    | Только слабый фильтр `webhook_path_token` в URI; явно помечаем как не-аутентификацию (§7).                                                                                                                                                   |
| D10 | Операция `setUri` в гейтвее `disabled` (503) — самостоятельная регистрация постбэка невозможна.           | Регистрация — внешний/ручной шаг до доработки гейтвея (владелец доработает `setUri` позже).                                                                                                                                                  |

---

## 12. Вне области (этап 2)

- Кэш/фоновое обновление офферов.
- Собственная публичная форма/эндпоинт заказа.
- Приём GC-постбэков через гейтвей вместо коннектора.
- Подписки на события **других** модулей, кроме `web.checkout.*` (подписка на web реализована — фича 4, §6.2).
- Полностью автономный периодический fallback-poll (самоперепланирующаяся джоба) для фичи 4 — основной триггер pump от publisher (§6.2).
- Возвраты/частичные оплаты как отдельные бизнес-процессы.

---

## 13. Инварианты и критерии приёмки

**Инварианты платформы:**

- Логирование только через `lib/logger.lib` → `ctx.account.log()`, не `console.log`.
- Защищённые админ-роуты — `requireAccountRole(ctx, 'Admin')` первой строкой; webhook публичный,
  но до обработки тела/данных применяет token-фильтр (если `webhook_path_token` настроен).
- Ссылки на роуты — через `withProjectRoot`/`getFullUrl`, без хардкода URL; роут-файл — путь `'/'`.
- Heap/таблицы — только на сервере; Vue импортирует только `shared/*` с `// @shared`.
- Секреты (`gc_school_api_key`, `webhook_path_token`) — в `SECRET_SETTING_KEYS`, не отдаются наружу,
  не логируются.
- Money — методами, не арифметикой; `countBy`/`where`/`runWithExclusiveLock` по правилам ядра.
- `// @ts-ignore` допустим только для системных модулей (`@app/*` и т.п.), не на своём коде.

**Критерии приёмки:**

1. `runAppFunction(... '/offers/list')` возвращает нормализованный список офферов из гейтвея.
2. `runAppFunction(... '/orders/create', { idempotencyKey, email, offerId })` создаёт сделку в
   GetCourse через гейтвей (тело `{ params }`), возвращает рабочую `paymentUrl`, пишет
   `Orders(status='new')` и публикует `getcourse.order.created@1`. Повторный вызов с тем же
   `idempotencyKey` **не создаёт вторую сделку**, а возвращает существующий заказ.
3. POST на webhook с телом оплаты:
   - находит заказ по `deal_id`/`number`, переводит в `paid`;
   - пишет `WebhookEvents(processed=true, orderKey)`;
   - публикует `getcourse.order.status_changed@1` и `getcourse.order.paid@1`;
   - повторная доставка не создаёт дублей и не публикует повторно (детерминированный отпечаток).
4. Невалидный токен webhook (если `webhook_path_token` настроен) → `403`, данные не меняются.
   Внутренняя ошибка обработки → `5xx` (не `200`).
5. **Фича 4:** `app.function('/checkout/process')` обрабатывает доставки `web.checkout.submitted@1`:
   `handleCheckoutSubmittedPayload` создаёт заказ через `createOrder` с `correlationId = requestKey` и
   `idempotencyKey` из payload; невалидный payload → ack без создания (perm); транзиентный сбой → fail;
   повторная доставка идемпотентна. Подписка регистрируется и при отсутствующем web-модуле.
6. Все ветки серверных обработчиков покрыты логами; типы проходят `vue-tsc`; unit/интеграционные
   тесты фич (§14) зелёные.

---

## 14. План тестирования фич (M8)

Тесты живут в существующем тест-харнесе модуля (`api/tests/*`, `lib/tests/*`,
`components/tests/*`). Живой GC (D4) в тестах не дёргаем — **мокаем гейтвей** на уровне
`gcGatewayClient.lib.ts` (подменяемый transport / фикстуры конвертов `{ ok, data }`).

**Unit (чистые функции — без сети, детерминированно):**

- `parseGcDeals`: success (`body.success` + `result.success`), `result.error`, `top_only`,
  невалидное тело; извлечение `payment_link`/`deal_id`/`deal_number`/`user_id`.
- `normalizeOffer`: разные формы оффера (`id`/`offer_id`, `title`/`name`, `price`/`final_price`),
  «двойная обёртка» `data.data`, пустой/битый список.
- `orderStatus` маппинг: каждый GC-статус → внутренний; `is_payed` в разных представлениях;
  `gc_paid_status`.
- webhook-парсер: объект в корне vs во вложенном `object`; вычисление `webhookId`
  (`deal_id:status:status_updated_at`).
- `extractCheckoutPayload` (фича 4): payload в корне/вложенном; варианты ключей; отсутствие
  обязательных (`requestKey`/`idempotencyKey`/`email`/`amount`/`currency`) → невалидно; нормализация UTM.

**Integration (роуты/функции с моком гейтвея и брокера):**

- `createOrder`: happy-path (создаёт заказ, ссылка, публикация `created`); идемпотентность по
  `idempotencyKey` (повтор → тот же заказ, одна сделка); ветки `ok:false` гейтвея по `error.code`
  → `status:'failed'`; разбор `result.error` GC.
- webhook: токен-фильтр (нет токена/верный/неверный → 200/200/403); корреляция по `deal_id` и по
  `number`; переход в `paid` публикует `status_changed` + `paid`; повторная доставка того же
  `webhookId` → no-op (один `processed`, без повторной публикации); внутренняя ошибка → 5xx.
- broker: фикстура `publishCoreBrokerEvent` проверяет детерминированность `occurredAt` и отсутствие
  fingerprint-конфликта при повторной публикации идентичного события.
- `handleCheckoutSubmittedPayload` (фича 4, мок гейтвея): happy-path (создаёт заказ, `correlationId` =
  `requestKey` в publish-запросе); невалидный payload → `{ ok:false, permanent:true }` без создания;
  идемпотентность (повтор с тем же `idempotencyKey` → один заказ).
- `processCheckoutSubmittedDeliveries` (фича 4, мок broker-transport): poll отдаёт батч → каждая
  delivery обработана и ack'нута; транзиентный сбой → fail; пустой poll → `processed:0` без ошибок.

**Фикстуры:** тела GC postback по сделке (created/paid/cancelled) и сырые ответы createDeal/getOffers
GC — в `lib/tests/` как константы.

**Реализация тест-харнеса:** GetCourse unit-suite подключён в `api/tests/unit/index.ts` через
`runGetCourseUnitChecks`; integration-suite подключён в `lib/tests/integrationSuite.ts` через
`runGetCourseIntegrationChecks`; каталог UI-тестов расширен блоками `unit-getcourse` и
`int-getcourse` в `shared/testCatalog.ts`.

---

## 15. Changelog спеки

- **22-06-2026, ревизия 5** — добавлена **фича 4: broker-подписка на `web.checkout.submitted@1`**
  (§6.2). Коннектор подписывается на событие веб-формы checkout, обработчик доставки создаёт заказ
  через существующий `createOrder` с пробросом `correlationId = requestKey` (закрывает блокер
  корреляции web spec §8). Триггер обработки — pump от publisher (`/checkout/process`), в идиоме ядра,
  без вечного cron. Подписка регистрируется независимо от наличия web-модуля (loose coupling ядра).
  Обновлены §1 (реш. 8), §3 (новые файлы), §10 (`allowedSubscribeTypes`/`correlationId`), §12, §13
  (критерий 5), §14 (unit `extractCheckoutPayload`, integration handle/process). Реализация:
  `lib/broker/coreBrokerClient.lib.ts` (+подписка/poll/ack/fail), `lib/checkout/processCheckoutSubmitted.lib.ts`,
  `functions/checkout/process.ts`, `lib/orders/orders.lib.ts` (+`correlationId`).
- **21-06-2026, ревизия 4** — спека приведена в соответствие с фактической реализацией: статус
  изменён с черновика на актуальную spec-as-source; §4.1 описывает уже реализованную карточку
  GetCourse-настроек и write-only секреты; §6 фиксирует retry заказа со `status:'failed'` с
  переиспользованием `orderKey`; §13 уточняет публичный webhook с token-фильтром до обработки
  данных; §14 фиксирует подключение GetCourse unit/integration suites и тест-каталога.
- **21-06-2026, ревизия 3** — по итогам решений по остаточным вопросам: тело createDeal `{ params }`
  подтверждено; сумму задаёт потребитель (`amount`/`currency` обязательны, источник истины
  `Orders.amount`); `occurredAt` — `0` для `created`, Unix ms из `status_updated_at` (строка datetime)
  для `status_changed`/`paid`; `processed` ставится только после успешной публикации (M6/M4);
  `raw_event.accepted` на постбэк не публикуется; постбэк по `event_object_id=2`, `event_id=2`;
  регистрация `setUri` пока недоступна (op `disabled`) — внешний шаг (D10); добавлен §4.1 — описание
  работ по веб-интерфейсу ввода секретов (M9).
- **21-06-2026, ревизия 2** — по итогам ревью полноты: тело `createDeal` исправлено на `{ params }`
  (B1); детерминированный `occurredAt` + удаление волатильных полей payload (B2); входной
  `idempotencyKey` создания (M1); статусы через GC postback и `status_updated_at` (M2/M5);
  снят race по «быстрой оплате» (M3, инвариант); регрессии статуса допускаются (M4); webhook
  отдаёт 5xx на внутренней ошибке (M6); легаси `neso/order` — только референс, реализация заново
  - вынос в `deprecated` отдельной задачей (M7); добавлен план тестирования (M8); работа только с
    `offerId`; убрана колонка `currency` (Money несёт валюту); добавлены недостающие поля `Orders`;
    webhook без аутентификации (только слабый URL-токен); `Heap.Enum` сигнатура уточнена; добавлены
    предусловия D8/D9.
- **21-06-2026, ревизия 1** — первичный черновик.
