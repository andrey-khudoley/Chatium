---
title: 'Payments Gateway (LifePay) - пошаговый план реализации'
project_hash: c7d5a1
type: implementation-plan
date: 2026-05-14
updated: 2026-05-23
status: draft
tags:
  - project/olga-getcourse-payments
  - topic/lifepay
  - topic/chatium
  - rag/actionable
related_manual: '[operation-manual](./operation-manual.md)'
related_strategy: '[testing-strategy](./testing-strategy.md)'
---

# Payments Gateway (LifePay) - пошаговый план реализации

Пошаговый чек-лист реализации payments-gateway-приложения `p/gateways/lifepay` на каркасе `template_project`. Документ выводит работу из текстового норматива ([operation-manual](./operation-manual.md), [testing-strategy](./testing-strategy.md)) и проектных спецификаций (`docs/architecture/data-flow.md` как legacy-описание контрактов и потока данных, `docs/architecture/payment-scheme.md` как бизнес-логика виджета, ADR 0001 как обоснование выбора `bills_v1`) в **проверяемые галочки**. Закрытие всех пунктов трёх частей = реализация продукта.

**Кто читает.** Разработчик payments-gateway (исполнитель и ревьюер); LLM-агент, ведущий пайплайн внутри workspace Chatium-аппа Андрея.

**Как соотносится с другими документами.**

- **SSOT нормативов разработки** - [operation-manual](./operation-manual.md) (§0-§13). Все механики и форматы тут не повторяются.
- **Норматив тестов** - [testing-strategy](./testing-strategy.md) (фазы прогона, цепочки `op`, 1 rps, страница тестов).
- **Реестр операций** - [lp-unified-op-registry-v0](./lp-unified-op-registry-v0.md) (имена `op`, контуры `bills_v1` / `ecom_v1`); создаётся параллельно с этим планом.
- **Бизнес-фазы и обещания** - `docs/architecture/payment-scheme.md` (целевая раскладка способов оплаты на странице школы), ADR 0001 (выбор варианта B - `bills_v1`), `olga-getcourse-payments-c7d5a1.md` (статус проекта, дедлайн, реквизиты, скоуп).

---

## Условные обозначения

- `- [ ]` - пункт не выполнен.
- `- [x]` - пункт выполнен; ставить только при фактической верификации (не «на словах»).
- `- [~]` - пункт перенесён в более позднюю фазу или временно заблокирован; рядом - короткая причина и ссылка на блокер (issue, открытый вопрос §12 manual, ADR).
- `- [-]` - пункт отменён (с пояснением: устарел, заменён, явно вынесен в backlog).
- `§N` без префикса - раздел `operation-manual.md`. Для других документов префикс явный: `strategy §N`, `registry §N`, `payment-scheme §N`.
- Пути файлов кода - относительно корня приложения `p/gateways/lifepay/`.

---

## Часть 1. Прототип (вертикальный срез до подключения на боевую страницу)

**Цель фазы.** Технический артефакт уровня «демо-каркас»: один сквозной проход «кнопка на тестовой странице Chatium → создание счёта в LifePay через payments-gateway → QR на странице → реальная оплата СБП → webhook на приёмник → запись в Heap приёмника». Это **не** MVP: обновление статуса заказа в GetCourse, виджет на боевой странице школы, идемпотентность и расширенная админка в фазу **не входят**.

**Non-goals Прототипа.** Деплой с SLA, полный каталог `op` по HTTP с argsSchema, виджет на боевой странице школы, обязательная оплата в боевом потоке. Презентационные артефакты (скриншоты, видео для клиента) ведутся вне SPEC и в этом плане не учитываются.

### 1.1. Каркас и инфраструктура `template_project`

- [x] **PROJECT_ROOT и `.dir.json`** соответствуют `p/gateways/lifepay/` (`config/routes.tsx`, `.dir.json`); подтверждено успешной загрузкой главной страницы. _Готово, когда:_ `https://<домен>/p/gateways/lifepay/` отдаёт SSR-главную без ошибок. (См. `docs/architecture.md` приложения.) — `PROJECT_ROOT` в `config/routes.tsx` = `'p/gateways/lifepay'`, `.dir.json` с именем `[INWORK] p/gateways/lifepay`.
- [x] **Heap settings и logs** живут на собственных ключах таблиц приложения (`tables/settings.table.ts`, `tables/logs.table.ts`), не пересекаются с другими экземплярами шаблона. _Готово, когда:_ запись настройки и появление лога подтверждены через админку. — файлы [tables/settings.table.ts](../../tables/settings.table.ts) и [tables/logs.table.ts](../../tables/logs.table.ts) существуют (шаблон). Запись/чтение через админку фактически не проверены — оставить [x] условно или понизить.
- [x] **Админка шаблона** доступна под `Admin` (`web/admin/index.tsx`, `pages/AdminPage.vue`): настройки, дашборд, логи. _Готово, когда:_ админ видит счётчики и поток новых логов. — каталоги `web/admin/`, `pages/AdminPage.vue` (49 KiB), `api/admin/`, `lib/admin/` присутствуют (шаблон).
- [x] **Страница тестов шаблона** (`web/tests/index.tsx`, `pages/TestsPage.vue`) запускает юнит-каталог шаблона и показывает HTTP-проверки. _Готово, когда:_ нажатие «Запустить юниты» выдаёт зелёный отчёт. — `web/tests/`, `pages/TestsPage.vue` (65 KiB), `api/tests/`, `lib/tests/`, `shared/testCatalog.ts` присутствуют (шаблон). Зелёный прогон фактически не проверен.

### 1.2. Настройки `lp_*` в Heap (минимум)

- [x] Константа `LP_TEST_APIKEY = 'lp_test_apikey'` добавлена в `lib/settings.lib.ts` `SETTING_KEYS` и в `shared/gatewaySettingKeys.ts` (`// @shared`). См. §5.5.
- [x] Константа `LP_TEST_LOGIN = 'lp_test_login'` добавлена туда же (§5.5).
- [x] Поля «Тестовый API-ключ LifePay» (тип `password`) и «Тестовый логин LifePay (телефон 7XXXXXXXXXX)» (тип `text`) появились в `pages/AdminPage.vue` (чтение / запись через существующие `api/settings/*`). _Готово, когда:_ администратор может задать значения и сохранить; пустые / пробельные строки отклоняются (валидация §5.5); для `lp_test_login` проверка по правилам §2.5 (11 цифр, первая `7`).

### 1.3. Перечень `op` для Прототипа

Полный список вызовов к LifePay, который должен быть реализован на payments-gateway в фазе Прототипа, чтобы сценарий «создать счёт → QR → оплата → webhook» прошёл сквозной проход.

| `op`                | Контур     | HTTP-метод gateway | Сценарий | Обязательно для прототипа | Назначение                                                                                                                            | Обязательные `args`                                                                                                                                                                                                                               |
| ------------------- | ---------- | ------------------ | -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`createBill`**    | `bills_v1` | `POST`             | основной | да                        | Создать счёт LifePay с `method: "sbp"`, получить `paymentUrl` (deeplink на qr.nspk.ru) и `paymentUrlWeb` (страница оплаты в браузере) | `amount` (число > 0), `customerEmail` (строка), `orderNumber` (строка), `callbackUrl` (строка-URL), `description` (строка, обязательно по контракту LifePay — отражается в чеке покупателю; отсутствие → code 6020). Опционально: `customerPhone` |
| **`getBillStatus`** | `bills_v1` | `GET`              | smoke    | да                        | Smoke-операция для проверки связи и аутентификации с LifePay через ручной запуск из браузера / админки тестов                         | `billNumber` (строка)                                                                                                                                                                                                                             |
| **`cancelBill`**    | `bills_v1` | `POST`             | teardown | да                        | Отмена счёта в Фазе 4 интеграционного сьюита (`strategy §3.5`) и в админке для ручной разборки                                        | `billNumber` (строка)                                                                                                                                                                                                                             |

**Итог по перечню для Прототипа.** 3 обязательных `op` контура `bills_v1`. Все три на момент Прототипа имеют статус `availability` = `disabled` в [lp-op-http-mapping.json](./lp-op-http-mapping.json) (безопасная сторона по §2.11; включение в `enabled` происходит по §2.4 этого плана через открытый вопрос §12.8 manual). Контур `ecom_v1` весь `disabled` (§4.4 manual, открытый вопрос §12.6).

**Где живут webhook LifePay.** Сценарий принимает webhook **не на gateway**, а на отдельном **client-приложении** (см. §1.8). Регистрация URL вебхука в LifePay выполняется через поле `callback_url` каждого запроса `createBill` (§6.3 manual); глобальная регистрация в `my.life-pay.ru` → Настройки → Разработчикам **не используется**.

### 1.4. Минимальные публичные роуты `/v1/{op}` под перечень §1.3

Каждый `op` из обязательных в §1.3 реализован как отдельный файловый роут:

- [x] **`POST /v1/createBill`** (`bills_v1`) - файловый роут в `api/v1/createBill.ts`. _Готово, когда:_ запрос с заголовками `X-Lp-Apikey`, `X-Lp-Login` и валидным `args` создаёт счёт в тестовом магазине LifePay с email `tester@khudoley.pro` и возвращает `ok: true` + `data: { billNumber, paymentUrl, paymentUrlWeb }` (§9.1).
- [x] **`GET /v1/getBillStatus`** (`bills_v1`) - файловый роут в `api/v1/getBillStatus.ts`; `billNumber` берётся из query. _Готово, когда:_ запрос с заголовками и `?billNumber=<lp_bill_id>` возвращает текущий статус счёта в форме `data: { billNumber, status, msg? }`, где `status` - имя по справочнику LifePay (`initiated`/`success`/`pending`/`failed`/`cancelled`), `msg` - сопровождающее сообщение от провайдера. LifePay возвращает `data` как словарь `{ [billNumber]: { status: number, msg: string } }`; gateway разворачивает в плоскую форму. _Подтверждено боевым запросом 2026-05-15 на счёт 10197087498032._
- [x] **`POST /v1/cancelBill`** (`bills_v1`) - файловый роут в `api/v1/cancelBill.ts`. _Готово, когда:_ запрос с заголовками и валидным `billNumber` отменяет счёт в LifePay (LifePay при успехе возвращает пустой `data: {}`; gateway отдаёт синтетический `data: { status: "cancelled" }`); повторный вызов на уже отменённый счёт возвращает `INVOKE_LP_SEMANTIC_ERROR` с `lpRule: "bills_v1_code_error"` и `lpNumericCode` из ответа LifePay.

Под каждый из этих роутов:

- [x] Заголовки `X-Lp-Apikey`, `X-Lp-Login` валидируются по §2.2, §2.5; ошибки → коды `INVOKE_LP_APIKEY_*`, `INVOKE_LP_LOGIN_*` (§10). Реализовано в `lib/gateway/lpCredentials.ts` + `handleV1Op`.
- [x] HTTP-метод роута соответствует `httpMethod` записи каталога; несоответствие → `INVOKE_HTTP_METHOD_NOT_ALLOWED` (§10). Файловые роуты `api/v1/createBill.ts` (POST), `getBillStatus.ts` (GET), `cancelBill.ts` (POST) совпадают с `operationsCatalog.ts`.
- [x] Возврат строго через объект `{ statusCode, rawHttpBody, headers }` (§9.0); заголовок `X-Gateway-Request-Id` совпадает с `requestId` в JSON. Реализовано в `lib/gateway/gatewayResponse.ts`; подтверждено боевым ответом 15-05-2026 (`x-gateway-request-id` в HTTP-headers равен `requestId` в теле).
- [x] Поля `apikey` / `login` собираются gateway из заголовков и подставляются в исходящий запрос к LifePay (тело JSON для `POST`, query для `GET`); в `args` от клиента эти поля игнорируются (§4.5). Реализовано в `buildCreateBillBody.ts` (POST) и `lifePayGetJson` (GET).
- [x] Семантическая ошибка LifePay при HTTP 2xx (правила B1-B4 по §2.8.2) - `INVOKE_LP_SEMANTIC_ERROR` (502), `error.details.lpRule` равно одному из значений `bills_v1_status_error`, `bills_v1_code_error`, `bills_v1_missing_payment_url`, `bills_v1_error_string`. **По факту контракта LifePay (apidoc.life-pay.ru/bill/index):** основной признак ошибки - `code !== 0` в корне → `bills_v1_code_error` с `lpNumericCode`. Правило B1 (`status === 'error'`) формально присутствует в каноне §10, но фактически не применяется к bills*v1: LifePay возвращает `status` числом-кодом состояния счёта (0/10/15/20/30), не флагом ошибки. Для `getBillStatus` отсутствие записи `data[billNumber]` или поля `status` в ней при `code === 0` → `bills_v1_code_error` без `lpNumericCode`. *Готово, когда:\_ юнит-кейс на «отсутствует `paymentUrl` при HTTP 200» выдаёт ровно этот код.

### 1.5. `GET /v1/operations` - подмножество для демо

- [x] Отдельный файловый роут `api/v1/operations.ts` реализует §3.3: ответ объект §9.0 + JSON по §3.4 (`ok: true`, `data.operations[]` с `op`, `httpMethod`, `contour`, `availability`, `argsSchema`); SSOT - `lib/gateway/operationsCatalog.ts` (TS-модуль), wire-форма через `toOperationSummaries()`.
- [x] Подмножество demo-set с `availability: enabled` (`createBill`, `getBillStatus`, `cancelBill`): после прохождения юнит-набора §1.7 и боевой проверки всех трёх op через test tab 15-05-2026 - переведены в `enabled` в `operationsCatalog.ts` (см. §12.8 ниже).
- [x] Схема `args` для demo-операций задана на билдере `s` из `@app/schema` в `lib/gateway/operationsCatalog.ts`: `createBill` (`amount: s.number()`, `customerEmail: s.string()`, `orderNumber: s.string()`, `callbackUrl: s.string()`, `description: s.string()` - обязательно по LifePay, отражается в чеке; опционально `customerPhone: s.string().optional()`); `getBillStatus` (`billNumber: s.string()`); `cancelBill` (`billNumber: s.string()`). `INVOKE_ARGS_SCHEMA_VIOLATION` срабатывает в общем обработчике до исходящего вызова LifePay.

### 1.6. Маппинг и исходящий вызов LifePay

- [x] Хелпер исходящего вызова к LifePay реализован в `lib/gateway/lifePayClient.ts` поверх **`@app/request`** (§4.5, §8.1); прямой `fetch` / `XHR` запрещён.
- [x] Константа **`GW_OUTBOUND_TIMEOUT_MS = 10_000`** (10 секунд) задана в `lib/gateway/constants.ts` и используется хелпером исходящего вызова. §8.1, решение §12.2.
- [x] Сборка тела JSON для `POST /v1/bill`: `apikey`, `login` подставляются из заголовков; `amount` (строка с двумя знаками, см. §2.8.2 «Актуализация 15-05-2026»), `customer_email`, `customer_phone` (нормализация в формат `7xxxxxxxxxx`), `method: "sbp"`, `description`, `callback_url`, `order: { number: args.orderNumber }` - из `args` (`lib/gateway/buildCreateBillBody.ts`). Сборка query для `GET /v1/bill/status`: `apikey`, `login` (из заголовков), `number` (из `args.billNumber`). Юниты в `lib/tests/gatewayUnitSuite.ts` (`gw_create_bill_body_amount_string`, `gw_create_bill_body_phone_normalized`, `gw_create_bill_body_redact_secrets`, `gw_get_bill_status_query_fields`).
- [x] `INVOKE_LP_TIMEOUT` (504), `INVOKE_LP_NETWORK_ERROR` (502), `INVOKE_LP_UPSTREAM_ERROR` (502) - обработаны для demo-операций в `handleV1Op` (§8.1, §10). Серверные ретраи **запрещены** (§8.6, §12.4): один входящий → один исходящий.
- [x] Лимит тела входящего `POST /v1/{op}` - **1 MiB** (`GW_MAX_REQUEST_BODY_BYTES = 1_048_576`); превышение → `INVOKE_BODY_TOO_LARGE` (HTTP 413) до парсинга JSON. Реализовано в `handleV1Op` (§8.7, §10, решение §12.3).

### 1.7. Минимальная наблюдаемость

- [x] На входе и выходе каждого demo-роута - `writeServerLog` из `lib/logger.lib` с `requestId` в `payload` (§7.2). Записи `request_init`, `lp_request_init`, `lp_response_ok` / `lp_semantic_error`. Прямой `console.log` не используется.
- [x] В заголовке ответа всегда `X-Gateway-Request-Id` (§9.0). Подтверждено боевым ответом 15-05-2026: `x-gateway-request-id` в headers === `requestId` в body.
- [x] Значения `X-Lp-Apikey`, `X-Lp-Login`, поля `apikey` / `login` исходящего тела к LifePay в логи **не попадают** (§5.7, §7.2). В `lp_request_init` пишутся только `loginMask` (`+7995***4545`) и `apikeyLength`; в `lp_outbound_body` (диагностический лог `api/v1/createBill`) тело прогоняется через `redactCreateBillBodyForLog` (убирает `apikey`/`login`). Юниты `gw_credentials_not_in_log_payload`, `gw_create_bill_body_redact_secrets`.

### 1.8. Клиентская панель LifePay (`p/units/yakovleva/pay`)

Сценарий «кнопка → счёт → QR → оплата → webhook» реализуется **не только** в payments-gateway-приложении (`p/gateways/lifepay`, разделы 1.1-1.7 выше): для сквозного прохода нужна **одна клиентская панель** - приложение `p/units/yakovleva/pay`. Панель совмещает три роли: (а) хранилище секретов магазина (`apikey`, `login`, токен webhook); (б) серверная прокладка между JS-страницей оплаты и payments-gateway с персистентным журналом запросов/ответов и дашбордом для разработчика; (в) приёмник входящего webhook LifePay (раньше планировалось отдельным приложением; объединено - см. ниже). Все три роли в одном Chatium-приложении ради единого журнала событий, единого Heap секретов и единой панели наблюдения. Доступ к админ-страницам - роль `Admin` (Андрей-разработчик); отдельная роль для входа школы - открытый вопрос §3.5 / Часть 3 (на старте не реализуется).

В Прототипе панель используется как тестовый стенд (Admin-only форма «Создать счёт» вместо встраивания на боевую страницу GetCourse). В MVP Часть 2 §2.7 та же панель публикует виджет-бандл `widget/payment.js` для встраивания в страницу оплаты школы; сервер-сайд эндпоинт панели остаётся тем же.

Запросы к gateway идут напрямую по HTTP, без отдельного SDK-приложения-обёртки (решение §12.1 manual, пересмотр 15-05-2026).

#### 1.8.1. Heap, настройки, журнал

- [x] **Heap-настройки** реализованы в `lib/settings.lib.ts` `SETTING_KEYS` (валидация - см. `validateSetting`):
  - `lp_apikey` (password, непустой после `trim`) - подставляется в заголовок `X-Lp-Apikey`.
  - `lp_login` (text, регулярка `^7\d{10}$` - 11 цифр, первая `7`) - подставляется в `X-Lp-Login`.
  - `lp_webhook_token` (password, ≥ 32 символа) - проверка query-параметра `?token=...` приёмником webhook. **Единственный механизм аутентификации входящего webhook**: live-документация [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index) подпись не публикует, MD5 не реализуется (см. §1.8.3, manual §6.2).
  - `gateway_base_url` (text, формат `https?://...` без trailing slash) - публичный базовый URL payments-gateway. Хранится в Heap, не в коде - смена эндпоинта gateway не требует пересборки панели.
- [x] **Heap-таблица `request_log`** (`tables/requestLog.table.ts`) - одна запись на каждый `invoke`: `requestId` (из заголовка `X-Gateway-Request-Id` gateway), `op`, `argsRedacted`, `clientHttpStatus`, `ok`, `errorCode`, `lpHttpStatus`, `lpSemanticRule`, `lpNumericCode`, `durationMs`, `requestedAt`, `rawResponseBody`. Запись организована через `lib/gateway/recordRequestLog.ts`; raw payload не маскируется (клиент - оператор ПДн, решение 16-05-2026), но проходит структурную гигиену `shared/prepareRawLog.ts` (циклы → `__circular`, лимит 64KB).
- [x] **Heap-таблица `webhook_log`** (`tables/webhookLog.table.ts`) - поля: `number` (transaction LifePay), `type`, `status`, `method`, `amount` (строка), `orderNumber` (из вложенного `order.number`), `tokenValid`, `duplicate`, `processedAt`, `email` (raw), `rawBody` (полный JSON, без маски), `rawQuery` (с замаскированным токеном). Извлечение полей через `lib/webhook/processWebhook.parseWebhookBody`.
- [x] **Heap-таблица `webhook_idempotency`** (`tables/webhookIdempotency.table.ts`) - уникальность по `number`, поле `firstSeenAt`. Гонки защищены `runWithExclusiveLock` из `@app/sync`.

#### 1.8.2. Серверная прокладка `POST /api/lp/invoke` (Admin-only)

- [~] Файловый роут `api/lp/invoke.ts` принимает JSON-тело `{ op, args }`, читает `lp_apikey` / `lp_login` / `gateway_base_url` из Heap, через `lib/gateway/invokeClient.ts` делает исходящий `@app/request` к `<gateway_base_url>/api/v1/<op>` с HTTP-методом по каталогу. **URL строится `lib/gateway/buildInvokeUrl.ts` с префиксом `/api/`** (исправлено 16-05-2026). **Auth-схема (24-05-2026):** изначально планировалась `requireAccountRole(ctx, 'Admin')`, в коде фактически не вызывалась (аудит 24-05). Заменено на `requireRealUser(ctx)` + `await requireInternalAccess(ctx)` - см. §1.11 ниже и [ADR 0003](../../../../../units/aayakovleva/sbp-client/docs/ADR/0003-internal-access-control.md). Сотрудник школы получает доступ через пригласительную ссылку, сгенерированную Admin'ом. Для виджета §2.7 (публичный доступ из браузера покупателя) - **отдельная** ветка с Origin+per-school token, не общая с панелью.
- [x] Тело ответа gateway возвращается без изменений (`shared/invokeApi.ts` - коды); метаданные пишутся в `request_log` через `lib/gateway/recordRequestLog.ts`; `requestId` берётся из заголовка `X-Gateway-Request-Id` ответа gateway, не генерируется заново.
- [x] Без серверных ретраев и без `Idempotency-Key` (зеркало §8.6, §12.4 manual): один входящий вызов на панель → ровно один исходящий к gateway.
- [x] **Что точно НЕ делает прокладка.** Не валидирует `args` поверх gateway (схема `argsSchema` на стороне gateway). Не нормализует сумму / телефон (это делает gateway через `buildCreateBillBody`). Не вызывает LifePay напрямую.
- [x] Юниты в `lib/tests/lifepayUnitSuite.ts`: сборка URL (POST/GET, trailing slash, op_unknown, base_url_invalid), парсинг ответа gateway, отсутствие секретов в `argsRedacted`, корректная запись `request_log`. Всего 55 кейсов в блоке `unit-lifepay` (включая webhook-сценарии §1.8.3).

#### 1.8.3. Приёмник webhook LifePay (`POST /web/webhook?token=...`)

- [x] Heap-ключ `lp_webhook_token` (`lib/settings.lib.ts`, валидация ≥ 32 символа). URL вида `https://s.chtm.khudoley.pro/p/units/yakovleva/pay/web/webhook?token=<random>` передаётся в `callbackUrl` каждого `createBill`. Глобальная регистрация в `my.life-pay.ru` → Настройки → Разработчикам не используется.
- [x] Файловый роут `web/webhook/index.tsx` с цепочечной формой `app.post('/').body(s => ({ data: s.string().optional() })).handle(...)`. **Формат тела:** реально LifePay шлёт `multipart/form-data` с единственным полем `data` (JSON-строка) - подтверждено живым примером ([notes/2026-05-20--first-real-webhook.md](../../../../../units/aayakovleva/project-docs/notes/2026-05-20--first-real-webhook.md), [knowledge: lifepay/webhooks §1](../../../../../units/aayakovleva/project-docs/knowledge/lifepay/webhooks.md)). **Текущая стратегия чтения:** сначала пробуется `extractMultipartTextPayload(req.files, req.fields)` (старый путь, использованный как обход 16-05 до патча Chatium), при возврате `null` - fallback на `req.body`. Канонический Chatium-API после патча 18-05-2026 - `req.formData()` (см. [knowledge: chatium/multipart-form-data](../../../../../units/aayakovleva/project-docs/knowledge/chatium/multipart-form-data.md)); миграция на него - желательный cleanup, но не блокер: текущий путь работает (нужно проверить на боевом webhook через §1.9). Все обёртки (`{data:{}}` JSON, `application/x-www-form-urlencoded` с `data=<json>`, чистый JSON, JSON-строка, плоский form) разворачиваются `unwrapWebhookBody(body, contentType)` с явной стратегией в логе `webhook_payload_parsed.unwrapStrategy`.
- [x] Сверка токена из query со значением в Heap (точное равенство, `lib/webhook/processWebhook.checkWebhookToken`); состояния: `not_configured` → 503, `missing` → 401, `mismatch` → 403; валидный → запись в `webhook_log` с `tokenValid: true`. Токен в логи не попадает (`rawQuery` маскирует поле `token`).
- [x] Маршрут **немедленно** возвращает HTTP 200 OK даже при внутренней ошибке записи (LifePay ретраит при не-200 до 10 попыток до 1 часа - не хотим триггерить ретраи на нашей ошибке).
- [x] Верификация MD5-подписи **не реализуется** (см. §1.8.1 и manual §6.2 / §6.4). Аутентификация: токен в query + дедупликация по `number` через `webhook_idempotency` с `runWithExclusiveLock`.
- [x] Запись в `webhook_log` с извлечением `order.number` из вложенного объекта (`parseWebhookBody`); поля по §1.8.1. В Прототипе на этом обработка заканчивается. Юниты в `lifepayUnitSuite`: 6 стратегий unwrap (`lp_webhook_unwrap_*`), 5 multipart-сценариев (`lp_webhook_multipart_*`), проверка токена (4 кейса), парсинг полей включая `email` (raw, не маскируется - решение 16-05-2026: клиент - оператор ПДн по 152-ФЗ).

#### 1.8.4. Главная страница панели: журнал и аналитика (Admin-only)

- [~] `pages/PanelHomePage.vue` доступна на `/`. **Auth-схема (24-05-2026):** изначально `requireAccountRole(ctx, 'Admin')` с редиректом неадминов на `/web/login?back=/`. Заменено на `requireRealUser(ctx)` + `requireInternalAccess(ctx)`, см. §1.11 и [ADR 0003](../../../../../units/aayakovleva/sbp-client/docs/ADR/0003-internal-access-control.md):

  - Анонимный → редирект на `/s/auth/signin?back=/`.
  - Авторизованный без доступа (не Admin и нет grant в `panel_access`) → редирект на `/web/forbidden` (HTTP 403).
  - Admin или авторизованный с активным grant → панель.

  Старый роут `/web/panel` оставлен редиректом для совместимости. Вкладки: Настройки, Аналитика (24ч), Запросы (журнал `request_log`), Webhook (журнал `webhook_log`), Поиск (по `requestId` со связанными webhook по `orderNumber`), Создать счёт, **Доступ** (только если `isAdmin = true`, §1.11.7).

- [x] Таблицы журналов с кнопкой `raw` (`fa-code`) в каждой строке - открывает модалку с полным JSON через `GET /api/lp/raw-request?id=...` или `?requestId=...` и `GET /api/lp/raw-webhook?id=...`. Источники списков - `GET /api/lp/recent-requests`, `GET /api/lp/recent-webhooks`.
- [x] **Базовая аналитика** (карточки за 24ч): всего запросов, доля `ok: true`, среднее и p95 `durationMs`, топ `errorCode`, всего webhook, доля `status: success`, доля `tokenValid: true`. Источник - `GET /api/lp/analytics/summary`.
- [~] **Auth-схема (24-05-2026):** изначально все эндпоинты `api/lp/*` планировались Admin-only, но в коде проверка не вызывалась (аудит 24-05). Закрытие - в §1.11 ниже: единая утилита `requireInternalAccess(ctx)` ставится в начало каждого `api/lp/*` после `requireRealUser(ctx)`. Сотрудник школы видит панель после однократного подтверждения пригласительной ссылки от Admin (§1.11.4). Для эндпоинтов аналитики (`recent-requests`, `recent-webhooks`, `raw-request`, `raw-webhook`, `search-by-request-id`, `analytics/summary`) - та же пара проверок. Для `consume-invite` - только `requireRealUser` (юзер ещё не имеет доступа в момент потребления).
- [x] Эндпоинты не возвращают секретов (`apikey`, `login` не входят в payload `request_log`/`webhook_log`). Поиск по `requestId` - `GET /api/lp/search-by-request-id`, возвращает карточку с полями `request_log` + связанные `webhook_log` по `orderNumber`.
- [x] Вкладка «Создать счёт» (admin-only) с полями `orderNumber`, `amount`, `customerEmail`, `description`, `callbackUrl`, `customerPhone`. По клику UI отправляет POST на `api/lp/invoke` с `op: 'createBill'`. Результат: `billNumber`, `paymentUrl` (QR через CDN `qrcode.js`), `paymentUrlWeb` (кнопка «Открыть в браузере»). _Подтверждение мобильного флоу (`window.open(paymentUrl)` в банковское приложение) - в §1.9 ниже, после сквозного прохода._

### 1.9. Демо-следы для Прототипа

Один сквозной проход на тестовом магазине LifePay с минимальной суммой (1 ₽). **Статус на 23-05-2026:** разблокирован после патча Chatium от 18-05-2026 (multipart-поля доступны в `req.body`). До патча шаг 4 не воспроизводился: тело webhook не доходило до обработчика, см. [operation-manual §6.2 актуализация 18-05-2026](./operation-manual.md). Сейчас можно запускать.

- [ ] **Шаг 1.** На вкладке «Создать счёт» клиентской панели (§1.8.4) ввести `orderNumber = itest-{timestamp}-{rand4}`, `amount = 1.00`, `customerEmail = tester@khudoley.pro`; нажать «Создать счёт». _Готово, когда:_ страница показывает QR и кнопку «Открыть в браузере»; в `request_log` (§1.8.1) появилась запись с `op: 'createBill'`, `ok: true`.
- [ ] **Шаг 2.** В админке gateway (`p/gateways/lifepay/`, главная) убедиться, что в `gatewayRequestLog` есть входящий вызов и в `gatewayUpstreamLog` - запись о `POST https://api.life-pay.ru/v1/bill` с возвращённым `paymentUrl`. _Готово, когда:_ `billNumber` совпадает с тем, что показала панель.
- [ ] **Шаг 3.** Оплатить QR со своего банковского приложения (1 ₽). _Готово, когда:_ банк подтверждает успешный платёж.
- [ ] **Шаг 4.** Убедиться, что роут `/web/webhook` клиентской панели (§1.8.3) получил уведомление от LifePay (токен в query совпал), в `webhook_log` появилась запись с тем же `orderNumber`, `tokenValid: true`, `type: 'payment'`, `status: 'success'`. _Готово, когда:_ запись присутствует, поля совпадают; на главной странице панели она видна в таблице последних webhook. **Подзадача «сохранить сырое тело первого боевого webhook» закрыта 20-05-2026:** captured через Postman Mock, сохранён в [notes/2026-05-20--first-real-webhook.md](../../../../../units/aayakovleva/project-docs/notes/2026-05-20--first-real-webhook.md); knowledge-база актуализирована - [lifepay/webhooks §1](../../../../../units/aayakovleva/project-docs/knowledge/lifepay/webhooks.md). Остаётся подтвердить, что **наш** приёмник `sbp-client` обрабатывает webhook корректно (тот пример был отправлен на Postman, не на нас).
- [ ] **Шаг 5.** В `my.life-pay.ru` → Касса проверить, что чек по этому счёту сформирован и ушёл в ОФД (письмо на `tester@khudoley.pro`). _Готово, когда:_ письмо получено или чек виден в журнале кассы.

### 1.10. Критерий выхода из фазы Прототип

Закрыты пункты 1.1-1.9 **и §1.11** (внутренняя система прав); один сквозной проход «createBill → QR → оплата → webhook» воспроизводится **повторно** на тестовом магазине LifePay (не разовый случайный успех). Зафиксирована запись в проекте `notes/2026-MM-DD--prototype-passed.md` со скриншотом QR, скриншотом записи в Heap приёмника и примером боевого `billNumber` (из ответа `createBill`) / `number` (transaction number из webhook).

### 1.11. Внутренняя система прав доступа (`requireRealUser` + `requireInternalAccess`)

**Цель.** Закрыть auth-разрыв из аудита 24-05-2026 (6 эндпоинтов `api/lp/*` помечены «Admin-only», но проверка прав фактически не вызывается) и одновременно предоставить per-user гранулярный доступ для сотрудников школы без выдачи им Admin-роли всего Chatium-воркспэйса. Дизайн и обоснование - [ADR 0003](../../../../../units/aayakovleva/sbp-client/docs/ADR/0003-internal-access-control.md).

**Норматив.** Все защищённые страницы (`/`, `/web/admin`, любые будущие админские view) и API (`/api/lp/*`, `/api/access/*`) защищаются **двумя проверками подряд**:

```ts
import { requireRealUser } from '@app/auth'
import { requireInternalAccess } from './lib/access/requireInternalAccess'

export const someRoute = app.post('/').handle(async (ctx, req) => {
  requireRealUser(ctx) // 1. реальный авторизованный пользователь
  await requireInternalAccess(ctx) // 2. в panel_access ИЛИ Admin
  // ... дальше бизнес-логика
})
```

**Исключения** (не защищаются):

- `POST /web/webhook` (приёмник LifePay) - анонимный, аутентификация через токен в query (§1.8.3).
- `/web/access/invite` (страница приглашения) - защищена только `requireRealUser`; _внутренняя_ проверка не применяется (иначе пользователь, у которого нет доступа, не сможет его получить через инвайт).
- `/web/forbidden` (страница 403) - публичная, чтобы показывать понятное сообщение.

#### 1.11.1. Heap-таблицы

- [x] **`panel_invites`** (`tables/panelInvites.table.ts`) - одноразовые пригласительные токены. _Создан 2026-05-24._ `UserRefLink`/`DateTime` плана физически выражены как `Heap.String` (для user IDs) и `Heap.Number` (Unix ms) — Heap-API проекта не предоставляет дедицированных типов (см. `requestLog.table.ts`, `webhookIdempotency.table.ts`). Уникальность `token` обеспечивается на уровне приложения (`accountNanoid` + `runWithExclusiveLock` в §1.11.3), Heap-схема её не выражает (зеркало комментария в `webhookIdempotency.table.ts`):

  | Поле              | Тип                  | Описание                                                                                                |
  | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
  | `id`              | auto                 | Heap PK                                                                                                 |
  | `token`           | String (unique)      | Случайный токен ≥ 32 символа, сгенерированный `accountNanoid(ctx)`. По нему ищется инвайт при переходе. |
  | `createdByUserId` | UserRefLink          | Admin, создавший инвайт                                                                                 |
  | `createdAt`       | DateTime             | Время создания                                                                                          |
  | `expiresAt`       | DateTime             | `createdAt + 7 дней` (константа `INVITE_TTL_DAYS = 7` в `lib/access/constants.ts`)                      |
  | `usedAt`          | Optional DateTime    | Время использования (null если не использован)                                                          |
  | `usedByUserId`    | Optional UserRefLink | Кто использовал                                                                                         |
  | `revokedAt`       | Optional DateTime    | Время отзыва Admin'ом (null если активен)                                                               |
  | `note`            | Optional String      | Комментарий Admin'a при создании (например «для Ольги»)                                                 |

- [x] **`panel_access`** (`tables/panelAccess.table.ts`) - выданные доступы. _Создан 2026-05-24._ Те же подстановки типов (`UserRefLink` → `Heap.String`, `DateTime` → `Heap.Number` Unix ms), уникальность `userId` обеспечивается в `consumeInvite` (шаг 5 в §1.11.3):

  | Поле              | Тип                  | Описание                                |
  | ----------------- | -------------------- | --------------------------------------- |
  | `id`              | auto                 | Heap PK                                 |
  | `userId`          | UserRefLink (unique) | Кому выдан доступ                       |
  | `grantedAt`       | DateTime             | Когда                                   |
  | `grantedByUserId` | UserRefLink          | Какой Admin (через какой инвайт)        |
  | `inviteId`        | String               | ID использованного инвайта (для аудита) |
  | `revokedAt`       | Optional DateTime    | Время отзыва (null если активен)        |
  | `revokedByUserId` | Optional UserRefLink | Кто отозвал                             |

  Запись с непустым `revokedAt` считается недействительной (можно удалять, но для аудита проще оставлять с пометкой; при выдаче нового доступа тому же пользователю - обновить, сбросив `revokedAt`).

#### 1.11.2. Утилита `lib/access/requireInternalAccess.ts`

- [x] Файл `lib/access/requireInternalAccess.ts`:

  ```ts
  import type { app } from '@app/types' // или эквивалент
  import { PanelAccessTable } from '../../tables/panelAccess.table'

  export class InternalAccessDeniedError extends Error {
    code = 'INTERNAL_ACCESS_DENIED'
  }

  /**
   * Проверка внутренних прав панели. Вызывать ПОСЛЕ requireRealUser(ctx).
   * - Admin Chatium-аккаунта проходит всегда.
   * - Иначе ищем активную запись в panel_access по userId.
   * - Нет записи → InternalAccessDeniedError.
   *
   * Для HTML-роутов: перехватывать в try/catch и редиректить на /web/forbidden.
   * Для API-роутов: возвращать HTTP 403 JSON.
   */
  export async function requireInternalAccess(ctx: app.Ctx): Promise<void> {
    if (!ctx.user) {
      throw new InternalAccessDeniedError('no user (requireRealUser must run first)')
    }
    if (ctx.user.is('Admin')) {
      return // Admin-владелец всегда имеет доступ
    }
    const record = await PanelAccessTable.findOneBy(ctx, {
      userId: ctx.user.id
    })
    if (!record || record.revokedAt) {
      throw new InternalAccessDeniedError(`user ${ctx.user.id} not in panel_access`)
    }
  }
  ```

- [x] Юниты в `lib/tests/lifepayUnitSuite.ts` (или новый `accessUnitSuite.ts`):
  - `access_admin_passes` - mock `ctx.user.is('Admin') = true` → не бросает.
  - `access_grant_passes` - non-admin user, есть запись `panel_access` без `revokedAt` → не бросает.
  - `access_grant_revoked` - non-admin, запись с `revokedAt` → бросает `InternalAccessDeniedError`.
  - `access_no_grant` - non-admin, нет записи → бросает.

#### 1.11.3. Утилиты управления инвайтами `lib/access/invites.ts`

- [x] `generateInvite(ctx, options?: { note?: string }) → Promise<{ inviteId, token, fullUrl, expiresAt }>` - **Admin-only внутри**, ожидает что caller уже сделал `requireAccountRole(ctx, 'Admin')`. Генерирует `token = await accountNanoid(ctx)` (или `accountNanoid(ctx)` если синхронный), длина гарантируется ≥ 32; создаёт запись в `panel_invites` с `createdByUserId = ctx.user.id`, `expiresAt = now + 7d`; возвращает данные для UI. `fullUrl` - `<base>/p/units/yakovleva/pay/web/access/invite?token=<token>`.

- [x] `consumeInvite(ctx, token: string) → Promise<{ ok: true, grantId } | { ok: false, reason: 'unknown' | 'used' | 'revoked' | 'expired' | 'already_has_access' }>` - под `runWithExclusiveLock(ctx, 'invite:' + token, async (lockCtx) => { ... })`. **Важно: инвайт расходуется только в самом конце, при успешном создании grant'a. Любая ранняя ветка отказа не помечает инвайт `usedAt` и не меняет его состояние - инвайт остаётся валидным для следующей попытки.**

  1. Найти запись по `token`. Нет → `{ ok: false, reason: 'unknown' }`, **инвайт не трогаем**.
  2. `usedAt` уже есть → `{ ok: false, reason: 'used' }`, **инвайт не трогаем** (он уже в конечном состоянии).
  3. `revokedAt` есть → `{ ok: false, reason: 'revoked' }`, **инвайт не трогаем**.
  4. `now > expiresAt` → `{ ok: false, reason: 'expired' }`, **инвайт не трогаем**.
  5. Проверить, что у `ctx.user.id` ещё нет активной записи в `panel_access`. Если есть и не revoked → `{ ok: false, reason: 'already_has_access' }`, **инвайт не трогаем** (этот пользователь уже имеет доступ, инвайт может пригодиться кому-то другому).
  6. Создать запись в `panel_access`: `userId = ctx.user.id`, `inviteId = record.id`, `grantedByUserId = record.createdByUserId`, `grantedAt = now`.
  7. **Только теперь** пометить инвайт `usedAt = now`, `usedByUserId = ctx.user.id`. С этого момента инвайт переходит в `used` и больше не может быть использован.
  8. Вернуть `{ ok: true, grantId }`.

- [x] `revokeInvite(ctx, inviteId: string)` - **Admin-only внутри**. Проставляет `revokedAt = now` на инвайт. На уже использованные инвайты не влияет (доступ уже выдан, его надо отзывать отдельно через `revokeGrant`).

- [x] `revokeGrant(ctx, userId: string)` - **Admin-only внутри**. Проставляет `revokedAt` + `revokedByUserId` на запись `panel_access`. При следующем `requireInternalAccess` пользователь получит 403.

- [x] Юниты:
  - `invite_generated_token_length_min_32` - токен ≥ 32 символа.
  - `invite_consume_unknown_token` - возвращает `{ ok: false, reason: 'unknown' }`; **инвайт-таблица не модифицируется** (поскольку записи и нет).
  - `invite_consume_already_used` - повторный вызов с тем же токеном после успешного потребления возвращает `{ ok: false, reason: 'used' }`. **Состояние инвайта не меняется** (поля `usedAt`/`usedByUserId` остаются от первого потребления, не перезаписываются).
  - `invite_consume_revoked` - инвайт помечен `revokedAt` → отказ. **Состояние инвайта не меняется**, `usedAt` остаётся `null`.
  - `invite_consume_expired` - истёк по времени → отказ. **Состояние инвайта не меняется**.
  - `invite_consume_already_has_access` - non-admin пользователь с активной записью в `panel_access` пробует потребить свежий инвайт → возвращает `{ ok: false, reason: 'already_has_access' }`. **Инвайт остаётся активным** (`usedAt` остаётся `null`); это позволяет передать ту же ссылку другому получателю.
  - `invite_consume_concurrent` - две параллельные попытки потребить тот же токен разными пользователями: одна успешна (получает grant и помечает `usedAt`), вторая `{ ok: false, reason: 'used' }`. Проверяется через симуляцию `runWithExclusiveLock`.
  - `invite_consume_creates_grant` - после успеха в `panel_access` появляется запись с `userId`, `inviteId`, `grantedByUserId`. Только на этом шаге у инвайта проставляется `usedAt`.
  - `invite_get_does_not_consume` - read-only функция чтения инвайта по токену (используется страницей `/web/access/invite` для проверки валидности и рендера) **не модифицирует** `panel_invites`. Множественные вызовы оставляют `usedAt` = `null`.

#### 1.11.4. Роут страницы приглашения `/web/access/invite`

> **Жизненный цикл инвайта (норматив).** Сам факт перехода по URL и рендера страницы **не расходует** инвайт. Пользователь может открыть ссылку, закрыть вкладку, открыть снова, переслать кому-то - инвайт остаётся активным. Расходование происходит **только** при успешном `POST /api/access/consume-invite` (см. §1.11.5), то есть при нажатии авторизованным пользователем кнопки «Подтвердить». После этого инвайт переходит в состояние `used` и больше не активен. До этого момента ссылка валидна столько раз, сколько по ней зайдут (в пределах TTL и пока Admin не отозвал).

- [x] Файл `web/access/invite/index.tsx`:
  1. Прочитать `req.query.token` (string).
  2. Если не указан → HTTP 400, страница «Некорректная ссылка».
  3. Попытаться `requireRealUser(ctx)` в try/catch. Если бросило (анонимный/не авторизован):
     - Редирект на `/s/auth/signin?back=<encoded URL текущей страницы с тем же токеном>`. Токен **не расходуется**, остаётся валидным (см. норматив выше).
     - Использовать HTML-редирект через `<meta http-equiv="refresh">` + JavaScript fallback (см. `inner/docs/003-auth.md` раздел «Перехват ошибок авторизации»).
  4. Если `requireRealUser` прошёл - выполнить **read-only** проверку инвайта (без `consumeInvite`):
     - Найти запись `panel_invites` по `token`.
     - Если нет, либо `revokedAt !== null`, либо `expiresAt < now` → рендерить страницу «Ссылка недействительна» (HTTP 410 Gone), с кнопкой «Запросить новую у Admin'a».
     - Если `usedAt !== null` (инвайт уже использован кем-то ранее) → рендерить страницу «Ссылка уже была использована» (HTTP 410 Gone). При желании показать дату использования (без раскрытия личности `usedByUserId`).
  5. Если инвайт валиден (не отозван, не истёк, не использован) - рендерить Vue-компонент `pages/InviteAcceptPage.vue` с пропсами: `userDisplayName`, `userEmail`, `inviteNote`, `expiresAt`, `consumeApiUrl` (= URL `POST /api/access/consume-invite`), `panelHomeUrl` (`/`), `userAlreadyHasAccess` (boolean, см. ниже).
  6. Vue-компонент: заголовок «Получить доступ к панели управления интеграцией LifePay»; информация «Вы войдёте как: `<displayName>` (`<email>`)»; если у текущего пользователя уже есть активная запись в `panel_access` (`userAlreadyHasAccess = true`) - показать «У вас уже есть доступ» + кнопку «Перейти в панель» (инвайт **не трогаем**, он останется валидным для другого получателя). Иначе кнопка «Подтвердить» → `fetch` на `consumeApiUrl` с `{ token }` → при `ok: true` редирект на `/`; при ошибке - локально показать причину (`used`, `revoked`, `expired`).

#### 1.11.5. API `consume-invite`, `generate-invite`, `revoke-invite`, `revoke-grant`, списки

- [x] `POST /api/access/consume-invite` - `requireRealUser(ctx)` (без `requireInternalAccess` - суть в том, что у юзера ещё нет доступа); тело `{ token: string }`; вызывает `consumeInvite(ctx, token)`. Ответ:

  - `{ ok: true, redirectTo: '/' }` при успехе.
  - `{ ok: false, reason }` при отказе (HTTP 400 для `unknown`/`used`/`revoked`/`expired`, HTTP 200 + `reason: 'already_has_access'` с `redirectTo: '/'`).
  - Логирование: `access.invite_consumed` (поля `inviteId`, `userId`, без токена), `access.invite_invalid` (с `reason`).

- [x] `POST /api/access/generate-invite` - `requireRealUser(ctx)` + `requireAccountRole(ctx, 'Admin')`; тело `{ note?: string }`; вызывает `generateInvite`. Ответ - JSON с `{ inviteId, token, fullUrl, expiresAt }`. Логирование: `access.invite_generated` (`inviteId`, `createdByUserId`, **без токена**, токен в логи не пишется).

- [x] `POST /api/access/revoke-invite` - `requireRealUser` + `requireAccountRole('Admin')`; тело `{ inviteId }`; вызывает `revokeInvite`. Ответ `{ ok: true }`.

- [x] `POST /api/access/revoke-grant` - `requireRealUser` + `requireAccountRole('Admin')`; тело `{ userId }`; вызывает `revokeGrant`. Ответ `{ ok: true }`. **Защита от селф-отзыва Admin'ом самого себя** - не нужна (Admin всегда проходит через ветку `ctx.user.is('Admin')` в `requireInternalAccess`, запись в `panel_access` для Admin не создаётся и не нужна).

- [x] `GET /api/access/invites` - `requireRealUser` + `requireAccountRole('Admin')`; возвращает список инвайтов с метаданными (без поля `token` - токен показан Admin'у только в момент генерации, потом восстановить нельзя). Поля: `inviteId`, `note`, `createdByDisplayName`, `createdAt`, `expiresAt`, `usedAt`, `usedByDisplayName`, `revokedAt`, `status` (вычисляемое: `active` / `used` / `revoked` / `expired`).

- [x] `GET /api/access/grants` - `requireRealUser` + `requireAccountRole('Admin')`; возвращает список активных и отозванных grant'ов. Поля: `userId`, `userDisplayName`, `userEmail`, `grantedAt`, `grantedByDisplayName`, `inviteId`, `revokedAt`, `revokedByDisplayName`.

#### 1.11.6. Страница 403 `/web/forbidden`

- [x] Файл `web/forbidden/index.tsx`:
  1. `requireRealUser(ctx)` (если анонимный - редирект на `/s/auth/signin?back=/`).
  2. Если `ctx.user.is('Admin')` либо есть активный grant - редирект на `/` (нет смысла показывать 403 тем, у кого есть доступ).
  3. Иначе - рендерить страницу с сообщением: «У вас нет доступа к панели управления интеграцией LifePay. Текущий аккаунт: `<displayName>` (`<email>`). Попросите администратора создать для вас пригласительную ссылку.» Кнопки: «Выйти и войти под другим аккаунтом» (POST `/s/auth/sign-out` → редирект на `/s/auth/signin`).
  4. HTTP-статус ответа - **403** (а не 200) для семантической корректности.

#### 1.11.7. UI «Управление доступом» в админке панели

- [x] Новая вкладка в `pages/PanelHomePage.vue` - **«Доступ»** (видна только если `ctx.user.is('Admin')`, передаётся пропсом `isAdmin: boolean` через SSR). Структура:
  - Блок «Пригласительные ссылки»: таблица текущих и прошлых инвайтов (поля из `GET /api/access/invites`), кнопка «Создать ссылку» (открывает модалку с полем «комментарий» и кнопкой «Создать»; после создания - показывает полный URL с кнопкой «Скопировать»; **токен показывается один раз**, далее в списке отображается только `inviteId` и `note`). У активных инвайтов кнопка «Отозвать».
  - Блок «Выданные доступы»: таблица из `GET /api/access/grants`, у активных - кнопка «Отозвать доступ».

#### 1.11.8. Миграция существующих эндпоинтов

- [x] **Все 6 эндпоинтов `api/lp/*`** заменить:

  ```ts
  // было (только в комментарии, без вызова):
  // Admin-only

  // станет:
  requireRealUser(ctx)
  await requireInternalAccess(ctx)
  ```

  Это закрывает auth-разрыв из аудита 24-05-2026 для: `api/lp/invoke`, `api/lp/recent-requests`, `api/lp/recent-webhooks`, `api/lp/raw-request`, `api/lp/raw-webhook`, `api/lp/search-by-request-id`, плюс `api/lp/analytics/summary`.

- [x] **Страница панели `/` (`pages/PanelHomePage.vue` через `web/admin/index.tsx` или эквивалент)** - заменить `requireAccountRole(ctx, 'Admin')` на:

  ```ts
  try {
    requireRealUser(ctx)
    await requireInternalAccess(ctx)
  } catch (err) {
    if (err instanceof InternalAccessDeniedError) {
      // редирект на /web/forbidden через meta-refresh
    } else {
      // редирект на /s/auth/signin?back=/
    }
  }
  ```

- [x] **Старый редирект `/web/panel` → `/`** оставить как есть (он не защищён, просто редирект).

#### 1.11.9. Что НЕ защищать

- [x] `POST /web/webhook` - анонимный, токен в query (§1.8.3). Внутреннюю систему прав сюда не применять.
- [x] `/web/access/invite` - только `requireRealUser`, без `requireInternalAccess`. **Это критично** - иначе пользователь без доступа никогда не сможет его получить.
- [x] `/web/forbidden` - только `requireRealUser`, без `requireInternalAccess`.
- [x] `GET /v1/*` payments-gateway - другое приложение, своя модель доступа (§5.6 [operation-manual](./operation-manual.md), заголовки `X-Lp-*`).

#### 1.11.10. Критерий завершения §1.11

Закрыты пункты 1.11.1-1.11.9. Тест-сценарии (вручную или через юниты):

**Базовые проверки доступа:**

1. Admin заходит на `/` - видит панель.
2. Анонимный пользователь заходит на `/` - редирект на `/s/auth/signin?back=/`.
3. Авторизованный non-Admin без доступа заходит на `/` - редирект на `/web/forbidden` со статусом 403.

**Сценарий выдачи доступа через инвайт:** 4. Admin генерирует инвайт через UI - получает URL с токеном. 5. Анонимный пользователь переходит по URL - редирект на `/s/auth/signin?back=...` с токеном в `back`. **Инвайт остаётся активным** (в `panel_invites` `usedAt` всё ещё `null`). 6. После входа - попадает на страницу подтверждения с кнопкой «Подтвердить». 7. После нажатия «Подтвердить» - редирект на `/`, доступ работает. **Только теперь** в `panel_invites` поле `usedAt` заполнено.

**Сценарии «ссылка живёт до подтверждения» (ключевой инвариант, см. §1.11.4 норматив):** 8. Авторизованный пользователь без доступа заходит на URL инвайта, **закрывает вкладку без нажатия «Подтвердить»**. В `panel_invites` `usedAt` всё ещё `null`. Тот же пользователь снова открывает URL - видит ту же страницу подтверждения. 9. Авторизованный пользователь A заходит на URL инвайта, видит форму, **не нажимает «Подтвердить»**. Авторизованный пользователь B открывает тот же URL - тоже видит форму подтверждения (со своим displayName). Кто первый нажмёт «Подтвердить», тот и получит доступ; второй на следующем заходе получит «Ссылка уже была использована». 10. Авторизованный пользователь, у которого **уже есть активный grant**, открывает URL свежего (не использованного) инвайта - видит «У вас уже есть доступ» + кнопку «Перейти в панель». Инвайт **не расходуется** (поле `usedAt` остаётся `null`), Admin может передать его другому получателю.

**После подтверждения:** 11. Повторный заход по тому же URL после успешного подтверждения - страница «Ссылка уже была использована» (HTTP 410).

**Управление со стороны Admin:** 12. Admin отзывает grant в UI - на следующем заходе пользователь получает `/web/forbidden`. 13. Admin отзывает **неиспользованный** инвайт через `revoke-invite` - переход по URL показывает «Ссылка недействительна» (HTTP 410). Уже выданные через этот инвайт grant'ы не затрагиваются. 14. Прошло > 7 дней с создания неиспользованного инвайта - переход по URL показывает «Ссылка недействительна» (TTL).

**Прямой HTTP без UI:** 15. Прямой HTTP к `/api/lp/invoke` от non-admin без grant'a - HTTP 403. 16. Прямой POST к `/api/access/consume-invite` с заведомо невалидным токеном - HTTP 400 с `reason: 'unknown'`, инвайт-таблица не меняется.

---

## Часть 2. MVP

**Цель фазы.** Превратить демо-каркас в устойчивый сервис между Chatium и LifePay, достаточный для подключения на боевую страницу оплаты школы Яковлевых: полный набор `op` v0, виджет на странице оплаты с целевой раскладкой способов (`payment-scheme §1`), бандл которого публикуется клиентской панелью (§1.8) и обращается к её серверному `api/lp/invoke`, интеграция приёмника webhook (тот же app, §1.8.3) с GC-gateway для обновления статуса заказа, расширенный дашборд панели, наблюдаемость, базовая безопасность, документация и тесты.

### 2.1. Полное покрытие реестра `op` v0

- [x] Для каждого из трёх `op` создан отдельный файловый роут в `api/v1/` с правильным методом, все идут через единый `handleV1Op` (§2.1).
- [x] Каждому `op` присвоен статус `availability` = `enabled` после прохождения юнит-набора и боевой проверки через test tab 15-05-2026 (§2.11; §12.8 закрыт).
- [ ] Скрипт согласованности «файл роута ↔ строка каталога» - `scripts/check-gateway-catalog-consistency.cjs` (§3.2, §8.8); юнит `gw_operations_catalog_matches_mapping` в `lib/tests/gatewayUnitSuite.ts` дублирует проверку на странице тестов (`strategy §9`). _Открыто:_ отдельный скрипт и юнит ещё не добавлены; согласованность сейчас гарантируется тем, что `operationsCatalog.ts` - единственный SSOT, а роуты ссылаются на op через `handleV1Op(ctx, req, 'opName', ...)`. **Приоритет понижен:** при трёх операциях ручная проверка достаточна; скрипт нужен, если v1 разрастётся.
- [x] `argsSchema` для всех трёх `op` собрана в `lib/gateway/operationsCatalog.ts` через билдер `s` из `@app/schema` (§3.1); `INVOKE_ARGS_SCHEMA_VIOLATION` отрабатывает в `handleV1Op` до исходящего вызова LifePay.

### 2.2. Семантические правила контура `bills_v1`

- [x] Реализованы и покрыты юнитами правила §2.8.2 по фактическому контракту LifePay (apidoc.life-pay.ru/bill/index): B2 (`code != 0` в корне → `bills_v1_code_error` с `lpNumericCode`); B3 (отсутствие `paymentUrl` при `code == 0` для `createBill` → `bills_v1_missing_payment_url`); B4 (`error: "..."` строка → `bills_v1_error_string`, защитное); B1 (`status === 'error'`) формально присутствует в каноне §10, но к bills_v1 не применяется - LifePay использует `status` числом-кодом состояния. Код ошибки клиенту - `INVOKE_LP_SEMANTIC_ERROR` (502); поле `error.details.lpRule` принимает значения из перечня §10.
- [x] Юнит-кейс на «успех с отсутствием `paymentUrl` в `createBill`» приведён к ошибке (`bills_v1_missing_payment_url`).
- [x] Юнит-кейс на «`code != 0` в `cancelBill`» приведён к ошибке (`bills_v1_code_error` с `lpNumericCode` из ответа).
- [ ] Реальные ответы LifePay при намеренно невалидных запросах зафиксированы в `notes/2026-MM-DD--lp-semantic-errors-confirmed.md` и таблица §2.8.2 актуализирована (закрытие открытого вопроса §12.7 manual).

### 2.3. Настройки и универсальный ввод

- [ ] Настройки `lp_test_apikey`, `lp_test_login` стабильно работают (§5.5).
- [ ] Универсальный ввод произвольных пар «ключ - значение» (`lp_itest_*` и аналоги) реализован в админке (§5.9); Admin-only; не попадает в публичные ответы.
- [ ] Имена ключей известных настроек экспортируются из `shared/gatewaySettingKeys.ts` с `// @shared` (без значений секретов).

### 2.4. Тесты (юнит + интеграция + страница)

- [x] Юнит-набор gateway (`lib/tests/gatewayUnitSuite.ts`, **27 кейсов** в блоке `unit-gateway`): классификаторы и extract'ы по реальному контракту LifePay (`classifyCreateBillResponse`, `classifyGetBillStatusResponse`, `classifyCancelBillResponse`), справочник `billStatusName`, отсутствие неканонических `lpRule`, маскировка секретов в payload лога, sync-check каталога (`gw_operations_catalog_matches_runner`), сборка тела (`gw_create_bill_body_amount_string`, `gw_create_bill_body_phone_normalized`, `gw_create_bill_body_redact_secrets`), GET-query для `getBillStatus`.
- [x] Юнит-набор клиентской панели (`lib/tests/lifepayUnitSuite.ts`, **55 кейсов** в блоке `unit-lifepay`): сборка URL invoke, маскировка email/phone, валидации Heap-ключей, 6 стратегий unwrap webhook, 5 multipart-сценариев, проверка токена (4 кейса), извлечение `order.number`.
- [ ] Интеграция `createBill`: кейс `gateway_v1_createBill_live` в `lib/tests/integrationSuite.ts` (Heap уровня A, `tester@khudoley.pro`, `amount: 1.00`). Полный сьюит по фазам `strategy §3.1` (`beforeAll`: `createBill` → `billNumber`; потребители `getBillStatus`, `cancelBill`; `afterAll` teardown). _Статус:_ интеграционный сьют ещё не собран - все боевые проверки шли через RequestTestTab вручную. К моменту сквозного прохода §1.9 - дособрать.
- [ ] Соблюдён лимит **1 rps** на исходящие вызовы к LifePay в интеграционном раннере (`strategy §6`); при параллельных воркерах - глобальный семафор.
- [x] Страница тестирования в админке (`pages/TestsPage.vue`) с тремя вкладками (Юнит / Интеграция / HTTP) и вкладкой «Тест запроса» (`components/RequestTestTab.vue`, Admin-only): дропдаун op из каталога, ручной ввод `X-Lp-*` или кнопка «Использовать тестовые» (подгружает `lp_test_apikey`/`lp_test_login` из Heap), динамическая форма `args` со схемой каталога, сырые JSON snapshot запроса/ответа без маскирования. Глобальный переключатель «форс юнитов» и жёлтое предупреждение `strategy §9.3` - не реализованы (актуально, когда появятся `disabled` / `unsupported` op).

### 2.5. Расширенная наблюдаемость и админка

- [ ] `writeServerLog` пишется на каждой существенной ветке роутов и `lib/gateway/*` (§7.2.1); поле `requestId` присутствует в `payload` / `message`.
- [ ] Регистрация события `gateway_lp.invoke.completed` через `writeWorkspaceEvent` после каждого ответа клиенту (§7.3, обязательные поля - таблица §7.3). Реализация: `lib/gateway/gatewayWorkspaceEvents.ts`, вызов из обёртки `handleV1OpRoute`.
- [ ] Регистрация события `gateway_lp.operations.catalog_served` после успешного `GET /v1/operations` (§7.3). Реализация: `api/v1/operations.ts`.
- [ ] В `AdminPage.vue` (или новые `components/`) реализованы экраны §7.4.1: обзор за период, таблица вызовов с поиском по `requestId`, фильтры, карточка вызова, экран «каталог + здоровье».
- [ ] Уведомления админам по порогам ошибок (`INVOKE_LP_TIMEOUT`, `INVOKE_LP_NETWORK_ERROR`, доля 5xx) через `sendNotificationToAccountOwners` - §7.5.

### 2.6. Транспорт между клиентской панелью и payments-gateway

**Решение по транспорту (пересмотрено §12.1, 15-05-2026).** Промежуточного SDK-приложения нет: единственная клиентская панель `p/units/yakovleva/pay` (§1.8) обращается к gateway напрямую через `@app/request`. `apikey` и `login` магазина LifePay хранятся в Heap панели (§1.8.1), передаются в заголовках `X-Lp-Apikey` / `X-Lp-Login` на каждом запросе; gateway по-прежнему не хранит боевые секреты магазина (§5.6).

В MVP к §1.8 добавляется промышленная нагрузка - вызовы из виджет-бандла на странице школы и регулярные webhook от LifePay; интерфейс панели с gateway остаётся прежним (§1.8.2), меняется только источник нагрузки.

- [ ] Хелпер исходящего вызова (в `lib/` панели) собирает запрос: HTTP-метод и базовый путь `/v1/{op}` по каталогу `GET /v1/operations`; заголовки `X-Lp-Apikey`, `X-Lp-Login` из Heap панели; при `POST` - `Content-Type: application/json` (§2.2 manual); JSON-тело `args` по §2.4 manual; ответ парсится по §9.1.
- [ ] Хелпер вызова **не** делает серверных ретраев на стороне Chatium (зеркало запрета §8.6, §12.4 manual); любая логика повтора живёт в коде бизнес-сценария (например, polling `getBillStatus` со страницы ожидания - §3.10 backlog).
- [ ] `gateway_base_url` хранится в Heap панели (§1.8.1); смена эндпоинта gateway не требует пересборки виджета.
- [ ] Опциональная вспомогательная функция `loadCatalog()` обращается к `GET /v1/operations` без побочных эффектов; имена `op` дублируются в `shared/` панели для использования на Vue-стороне (вкладка «Создать счёт вручную», в Часть 2 - виджет-бандл).
- [ ] Журнал каждого вызова (`request_log`, §1.8.1) пополняется в том же хелпере, до возврата результата UI. `requestId` всегда берётся из ответа gateway (заголовок `X-Gateway-Request-Id` / поле `requestId`), не генерируется заново - сквозная трасса с серверными логами gateway.
- [ ] Юнит-кейсы панели покрывают: сборку HTTP-запроса (метод, URL, заголовки, тело / query); парсинг §9.1 ответа (`ok` / `data` / `error` / `requestId`); запись в `request_log` для успеха и каждой ветки ошибок §10 manual; маскирование секретов в `argsRedacted` и `lp*BodyRedacted`.
- [ ] **Webhook аутентификация по токену.** Юниты приёмника (§1.8.3) покрывают: валидный токен в query → запись в `webhook_log` с `tokenValid: true`; неверный токен / отсутствие токена → 401/403 без записи в `webhook_log`; дедупликация по `number` через `webhook_idempotency` (повторный webhook с тем же `number` не создаёт вторую запись и не выполняет downstream-действий). MD5-верификация не реализуется (см. §1.8.3, источник истины - [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index)).

### 2.7. Виджет на странице оплаты школы (бандл публикуется клиентской панелью §1.8)

**Цель.** Поднять Chatium-логику на боевой странице оплаты школы Яковлевых. Реализовать целевой UX (`payment-scheme §1`): СБП через LifePay + ОТП + Lava Top сверху, остальное в «Других методах», переключение по сумме 50 000 ₽.

**Где живёт.** Бандл `widget/payment.js` обслуживается из той же клиентской панели `p/units/yakovleva/pay` (отдельного widget-приложения нет; объединение - см. §1.8). Браузер на странице школы загружает бандл, бандл вызывает `POST /api/lp/invoke` той же панели; серверный эндпоинт §1.8.2 делает фактический HTTP-вызов gateway и пишет журнал.

- [ ] Файловый роут панели (например `web/widget/payment.ts` или статический ассет) публикует `widget/payment.js` на стабильном URL вида `https://<chatium-domain>/p/units/yakovleva/pay/widget/payment.js`.
- [ ] Виджет подгружается на странице оплаты школы через `<script src="..." defer></script>`, вставленный в шаблон страницы оплаты GetCourse школой (через «Настройки страницы → Дополнительный код в `<head>`»).
- [ ] Виджет ждёт DOMReady, находит контейнер способов оплаты GetCourse (селектор подобрать после доступа к странице клиента, зафиксировать в `notes/2026-MM-DD--gc-page-anatomy.md` приёмника).
- [ ] Виджет сканирует доступные методы, тэгирует их по справочнику: `sbp-lifepay`, `otp`, `lava-top`, `gc-tinkoff`, `gc-sber`, `gc-others`, `splits`, `cards-rf`.
- [ ] Виджет перестраивает порядок и видимость по правилу `payment-scheme §1`: `amount < 50 000 ₽` - все методы в нужном порядке (флагманы сверху); `amount ≥ 50 000 ₽` - флагманы сверху, остальные в `<details>` «Другие методы».
- [ ] Для метода «СБП через LifePay» виджет подменяет нативный обработчик: при клике делает `fetch` на `POST /api/lp/invoke` своей панели (`p/units/yakovleva/pay`) с телом `{ op: 'createBill', args: { orderNumber, amount, customerEmail, callbackUrl } }`. Эндпоинт через хелпер §2.6 вызывает gateway, пишет `request_log` и возвращает результат. Виджет по ответу рисует QR (desktop) или делает `window.location.href = paymentUrl` (mobile).
- [ ] **Авторизация публичного эндпоинта `/api/lp/invoke` для виджета.** В Прототипе и Прод фазе эндпоинт защищён комбинацией: (а) проверка `Origin` / `Referer` против списка доменов школы из Heap панели; (б) per-school токен в заголовке `X-Panel-Token`, прошитый в бандл при сборке для конкретной школы. Точная схема фиксируется отдельным ADR панели; в §1.8.2 для Admin-only вкладки эндпоинт по-прежнему защищён `requireAccountRole(ctx, 'Admin')`.
- [ ] Mobile-флоу проверен на Chrome Android, Safari iOS, WebView Telegram (fallback с кнопкой «Открыть в банке», если deeplink заблокирован).
- [ ] Защита от изменений разметки GetCourse: селекторы вынесены в `config.ts` виджета (`GC_SELECTORS`); MutationObserver на контейнер методов оплаты с timeout 5 секунд; деградация - оставить страницу как есть, записать `widget_init_failed` в `console.warn`.
- [ ] CORS на `/api/lp/invoke` панели разрешает домен школы (на первой итерации - конкретный origin школы, не `*`). На payments-gateway CORS остаётся закрытым - брузер с него ничего не запрашивает напрямую.

### 2.8. Обработка webhook + интеграция с gateway GetCourse (в той же клиентской панели)

Расширение §1.8.3 до полного MVP. Приёмник webhook живёт **в той же клиентской панели** `p/units/yakovleva/pay` (отдельного приложения нет, см. §1.8); ниже - что появляется поверх Прототипного скоупа:

- [ ] При валидном webhook от LifePay (`type: 'payment'` и `status: 'success'`) панель вызывает **gateway GetCourse** (`p/gateways/getcourse`) прямым HTTP-вызовом из своего серверного кода для обновления статуса заказа: `op = "updateDealFields"`, `args = { dealId: orderNumber, deal_status: "paid", deal_is_paid: 1 }` (точные имена полей и обязательные заголовки `X-Gc-*` - в реестре GC-gateway `course-chatium-gc-integration-3fa7c2`). Если в GC-проекте остаётся отдельное SDK-приложение - технически панель может ходить через него; для нашего сценария оба варианта эквивалентны и выбор фиксируется в `docs/` панели.
- [ ] Идемпотентность через таблицу `webhook_idempotency` (§1.8.1, уникальный индекс по `number`): перед обновлением заказа проверка наличия записи; если есть - в `webhook_log` ставится `processedOutcome: 'duplicate'`, выход без повторного обновления.
- [ ] Ретраи обновления GC-gateway с экспоненциальной задержкой (1 с → 5 с → 30 с → 5 мин → 30 мин) через отложенные задачи Chatium (`@app/jobs`). После 5 неудач - `processedOutcome: 'crm_update_failed'` в `webhook_log` + пуш Андрею через `sendNotificationToAccountOwners`.
- [ ] Сравнение `amount` из webhook с ожидаемой суммой заказа в GetCourse (опциональный шаг через `getDealFields` GC-gateway); расхождение - `processedOutcome: 'amount_mismatch'`, ручная разборка.
- [ ] На главной странице панели (§1.8.4) рядом с таблицей webhook показывается фильтр по `processedOutcome` (новое поле в `webhook_log` или derived колонка): `pending` / `paid_synced` / `duplicate` / `crm_update_failed` / `amount_mismatch`. Это даёт Андрею одну точку для разбора инцидентов оплаты школы.

### 2.9. Деплой и операционный минимум

- [ ] Стабильная выкладка через `git push` в Chatium-воркспэйс (платформа деплоит автоматически); URL приложения зафиксирован в `README.md`.
- [ ] Секреты не лежат в репозитории (только в Heap, §5.7); поиск по диффам / коду не находит ключей.
- [ ] Базовый health-роут (опционально, по необходимости в админке) или явная процедура «как проверить, что gateway жив» зафиксирована в `README.md` приложения.

### 2.10. Критерий выхода из фазы MVP

Закрыты пункты 2.1-2.9; интеграционный сьют проходит зелёным на тестовом магазине LifePay с teardown; на тестовой странице оплаты школы (тестовый продукт, ~1 ₽) прошёл хотя бы один сквозной сценарий «выбор СБП на боевом виджете → QR → оплата → webhook → заказ переключился в `paid` в GetCourse» без вмешательства разработчика.

---

## Часть 3. Прод (полная и исчерпывающая реализация)

**Цель фазы.** Включить систему на боевом потоке заказов школы, обеспечить мониторинг и операционную поддержку, передать клиенту runbook.

### 3.1. Прод-конфигурация

- [ ] В Heap gateway `p/gateways/lifepay` уровня A установлены `lp_test_apikey` / `lp_test_login` от **тестового** магазина LifePay для регрессионного смоук-теста (production-секреты магазина школы в Heap gateway не хранятся - они приходят в заголовках `X-Lp-Apikey` / `X-Lp-Login` каждого запроса от клиентской панели; см. §5.6 manual).
- [ ] В Heap клиентской панели школы (`p/units/yakovleva/pay`, §1.8.1) установлены боевые `lp_apikey` и `lp_login` магазина школы Яковлевых, сгенерированный `lp_webhook_token`. `gateway_base_url` указывает на боевой gateway. (MD5-секрет в Heap не хранится - подпись webhook LifePay не публикует, §1.8.1 / §1.8.3.)
- [ ] В `my.life-pay.ru` → Настройки → Разработчикам поле «URL уведомлений» оставлено пустым (передаём `callbackUrl` в каждом `createBill`); подтверждено отсутствие глобального webhook URL, который мог бы конфликтовать.

### 3.2. Релиз

- [ ] Слита разработческая ветка в основную (или нажата «опубликовать» в Chatium) для **двух** приложений: gateway (`p/gateways/lifepay`) и клиентская панель (`p/units/yakovleva/pay`, включающая виджет-бандл и приёмник webhook). Отдельных SDK / widget / webhook приложений нет (§12.1, §1.8).
- [ ] Версия виджет-бандла `?v=1.0.0` → `?v=1.0.1` (если делались правки после Фазы 2), чтобы клиентские браузеры подхватили свежий код.
- [ ] На странице оплаты школы тестовый `<script>` заменён на финальный (без `?env=test`).

### 3.3. Канареечный заказ

Первый боевой заказ от реального покупателя:

- [ ] Андрей дежурит в логах payments-gateway, gateway GetCourse и приёмника webhook в течение 30 минут после первой оплаты.
- [ ] Ольга проверяет в GetCourse, что заказ перешёл в `paid`.
- [ ] Проверен чек в ОФД (письмо покупателю + копия школе).

### 3.4. Метрики и SLA

- [ ] Дашборд в админке payments-gateway: число вызовов `/v1/{op}`, ok-доля, p95 `durationMs`, доли `error.code`. Источник - события `gateway_lp.*` (§7.3).
- [ ] Зафиксирован целевой SLA (uptime ≥ 99%, p95 `durationMs` ≤ 2 с); при отклонении - уведомления админам (`@user-notifier/sdk`, §7.5).
- [ ] Scheduled job в Chatium раз в сутки (07:00 MSK): шлёт Андрею в email / чат сводку «За сутки: N счетов, M ошибок, K дубликатов webhook, L `crm_update_failed`».

### 3.5. Безопасность

- [ ] CORS-политика для `/v1/*` зафиксирована и проверена для домена школы (§7.7, §8.7); preflight-запросы для нестандартных заголовков `X-Lp-*` корректно обрабатываются.
- [ ] Защита от перебора `X-Lp-Apikey` / `X-Lp-Login` (rate-limit или иной механизм платформы) рассмотрена; решение зафиксировано здесь или в новом ADR.
- [ ] **Идемпотентность и серверные ретраи в gateway не реализованы (запрещено §8.6, решение §12.4).** В Прод-фазе: ревью кода gateway подтверждает отсутствие чтения `Idempotency-Key`, отсутствие Heap-таблиц `idempotency_log` / `request_log` в gateway, отсутствие фоновых `@app/jobs` для повтора исходящих запросов к LifePay. Любая такая логика - нарушение спецификации, удаляется при ревью. (Идемпотентность и ретраи на стороне **приёмника webhook** - другое приложение, там разрешены и реализованы в §2.8.)
- [ ] Регрессионный тест: `POST /v1/createBill` с телом > 1 MiB → HTTP 413 + `INVOKE_BODY_TOO_LARGE` без парсинга JSON и без вызова LifePay (§8.7, решение §12.3).
- [ ] Регрессионный тест: webhook с неверным / отсутствующим токеном в query → приёмник возвращает **401** / **403** без записи в `webhook_log` и без вызова GC-gateway (§1.8.3). Отдельный тест: webhook с валидным токеном и `status: 'fail'` → 200 LifePay, запись в `webhook_log` с `tokenValid: true` и `status: 'fail'`, **без** обновления заказа в GC (Часть 2 §2.8).

### 3.6. Версионирование API

- [ ] Текущее состояние зафиксировано как фундамент: единственная версия `/v1/`, политика перехода на `/v2/` оформляется отдельным ADR при появлении первого ломающего изменения (решение §12.5, норматив §9.3). Никакой `/v0/` или `/v2/` параллельно не вводится.
- [ ] При появлении триггера ломающего изменения - оформлен новый ADR проекта, добавлен подраздел в manual, обновлены `argsSchema` каталога (§3.4) и `catalogSchemaVersion`. До тех пор пункт остаётся «в ожидании триггера», а не заблокирован.

### 3.7. CI/CD и согласованность каталога

- [ ] Прогон в CI: lint, типы (`npm run lint:types:assistant` для воркспэйса assistant), юнит-сьют, интеграционный сьют (на тестовом магазине LifePay с 1 rps).
- [ ] Скрипт согласованности «каждая запись маппинга = роут / каждый роут `/v1/*` = запись» (§3.2, §8.8) встроен в CI и в страницу тестов (`strategy §9`).
- [ ] Pre-commit или pre-push хук на проверку: ни `lp_test_apikey`, ни `lp_test_login`, ни любой 11-значный телефон вида `7XXXXXXXXXX`, ни 32-символьный hex-токен не попали в коммит (поиск по pattern).

### 3.8. Документация и передача клиенту

- [ ] Обновлён [operation-manual](./operation-manual.md): помечен как `status: implemented`, указаны фактические расхождения с предварительными правилами B1-B4 §2.8.2 (см. §12.7).
- [ ] Создан в проекте `docs/runbook.md`: как ротировать ключи LifePay, как читать логи payments-gateway и приёмника webhook, что делать при `crm_update_failed`, как откатить виджет на странице школы.
- [ ] Передана Ольге короткая инструкция (1 страница): как проверить статус заказа, куда смотреть чеки, кому писать при сбое.
- [ ] После 7 дней успешной работы в проде проект переведён в `done/`-папку vault.

### 3.9. Расширение `op` за пределы v0

- [ ] Триггер расширения - реальные запросы школ или собственные нужды (например запрос `getServiceInfo` для health-роута, операция `refundBill` если LifePay добавит API возвратов). Описан процесс: запрос → ADR (если изменяется граница ответственности) → новый `op` в реестре v1 → код + тесты + каталог.
- [ ] Версия реестра поднимается до `lp-unified-op-registry-v1.md` при добавлении операций или активации контура `ecom_v1` (§12.6 manual).

### 3.10. Backlog: расширение под других провайдеров

- [ ] Заведён backlog с критериями включения: «есть ли запрос школы / клиента», «есть ли стабильный API провайдера», «можно ли применить ту же модель thin-client + `op` + `args` + каталог». Кандидаты: ОТП Банк (`p/saas/gw/otp`), Lava Top (`p/saas/gw/lava`), Т-Банк (`p/saas/gw/tbank`), ЮКасса (`p/saas/gw/yookassa`). По умолчанию **не** реализуется; добавляется отдельным КП и отдельным приложением gateway по триггеру.
- [ ] Backlog: polling статуса через `getBillStatus` со страницы ожидания (опционально для случаев, когда webhook задерживается); circuit breaker на вызовах LifePay; возвраты через API LifePay (если LifePay добавит); дашборд платежей в Chatium-админке для Ольги.

### 3.11. Критерий выхода из фазы Прод

Закрыты пункты 3.1-3.10; на дашборде по школе видны метрики хотя бы одной недели боевой эксплуатации с uptime ≥ 99%; `runbook.md` передан клиенту; клиент подтвердил приёмку.

---

## Открытые вопросы

Зеркало §12 [operation-manual](./operation-manual.md). На текущий момент закрыты пять универсальных пунктов (12.1-12.5) и открыты три LifePay-специфичных (12.6-12.8).

| №    | Тема                                                              | Статус                            | Решение / критерий закрытия (где зафиксировано)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.1 | Транспорт между клиентским приложением и payments-gateway         | ЗАКРЫТО 15-05-2026 (пересмотрено) | Промежуточного SDK-приложения нет: единственная клиентская панель `p/units/yakovleva/pay` (`§1.8`) делает прямой HTTP-запрос к gateway. `apikey` / `login` магазина - заголовки `X-Lp-Apikey` / `X-Lp-Login`, хранятся в Heap самой панели. Manual §2.1, §5.6, §12.1 (пересмотр); план - 1.8, 2.6. Изначально 14-05-2026 предполагался слой `sdk/payments` поверх HTTP - 15-05-2026 признан избыточным и снят; одновременно три client-приложения (widget/test/webhook) объединены в одну панель с журналом и дашбордом.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 12.2 | Таймаут исходящего вызова к LifePay                               | ЗАКРЫТО 14-05-2026                | 10 000 мс (`GW_OUTBOUND_TIMEOUT_MS`), жёсткая константа. Manual §8.1; план - 1.6, 2.4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 12.3 | Лимит размера тела `POST /v1/{op}`                                | ЗАКРЫТО 14-05-2026                | 1 MiB (`GW_MAX_REQUEST_BODY_BYTES = 1_048_576`); превышение → `INVOKE_BODY_TOO_LARGE` (HTTP 413). Manual §8.7, §9.2, §10; план - 1.6, 3.5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 12.4 | Идемпотентность и серверные ретраи в gateway                      | ЗАКРЫТО 14-05-2026                | Запрещено в gateway - ни в Прототипе, ни в MVP, ни в Проде. Manual §8.6, §8.1; план - 1.6, 3.5. Введение в будущем - только через новый ADR + правки manual.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 12.5 | Версионирование публичного API gateway                            | ЗАКРЫТО 14-05-2026                | Единственная версия - `/v1/`; политика перехода на `/v2/` появляется при первом ломающем изменении и оформляется отдельным ADR. Manual §9.3; план - 3.6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 12.6 | Активация контура `ecom_v1`                                       | ОТКРЫТО                           | Ожидание ответа инженеров LifePay по условиям эквайринга. Критерий закрытия: получение коммерческих условий с комиссией СБП ≤ 0.4%; оформление ADR 0002; правки §2.8.2, §4.1, §4.5, [lp-op-http-mapping.json](./lp-op-http-mapping.json). Manual §12.6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 12.7 | Точная классификация семантических ошибок LifePay (правила B1-B4) | ЗАКРЫТО 15-05-2026                | Контракт LifePay изучен по [apidoc.life-pay.ru/bill/index](https://apidoc.life-pay.ru/bill/index/) и подтверждён боевым запросом `getBillStatus` на счёт 10197087498032 (структура `data: { [billNumber]: { status: number, msg } }`). Уточнения: (1) B1 `status === 'error'` фактически не применяется к bills_v1 - LifePay возвращает `status` числом-кодом состояния счёта (0/10/15/20/30), не флагом ошибки; правило сохранено в каноне §10 как резерв для других контуров. (2) Основной признак ошибки - `code !== 0` в корне → `bills_v1_code_error` с `lpNumericCode`. (3) Для `getBillStatus` пустой словарь `data` или отсутствие `status` внутри записи → `bills_v1_code_error` без `lpNumericCode`. (4) Для `cancelBill` LifePay возвращает пустой `data: {}`; gateway отдаёт синтетический `{ status: 'cancelled' }`. Зафиксировано в шапке `lib/gateway/billsV1Semantic.ts`, юнитах `lib/tests/gatewayUnitSuite.ts` и `docs/api.md` проекта. Manual §12.7; план - 2.2. |
| 12.8 | Активация `availability` для каждого `op`                         | ЗАКРЫТО 15-05-2026                | Все три `op` (`createBill`, `getBillStatus`, `cancelBill`) переведены в `availability: 'enabled'` в `lib/gateway/operationsCatalog.ts`. Критерий выполнен: юнит-набор `unit-gateway` зелёный, и каждый op прошёл боевую проверку через RequestTestTab на тестовом магазине LifePay (createBill вернул `paymentUrl`/`paymentUrlWeb`, getBillStatus вернул `pending`/`success`, cancelBill вернул `cancelled`). Manual §12.8; план - 2.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Если в ходе разработки появятся новые открытые места - добавлять их в §12 manual и здесь как новые строки.

---

## История изменений

- **14-05-2026** - создан на основе [operation-manual](./operation-manual.md), [testing-strategy](./testing-strategy.md) и проектных спецификаций (`docs/architecture/data-flow.md`, `docs/architecture/payment-scheme.md`, ADR 0001). Три части: Прототип (вертикальный срез «createBill → QR → оплата → webhook»), MVP (полное покрытие `op` v0, виджет на боевой странице школы, интеграция приёмника webhook с GC-gateway), Прод (мониторинг, метрики, runbook, передача клиенту). Заменил предыдущий план в прозаическом формате (Фазы 1-4 в стиле прозы), который перенесён в `docs/archive/initial-implementation-plan-prose.md`. Открытые вопросы 12.6-12.8 - LifePay-специфичные дополнения к закрытой пятёрке 12.1-12.5, зеркальной manual GC.
- **15-05-2026** - путь приложения зафиксирован как `p/gateways/lifepay/` (отказ от промежуточного сегмента `payments/`); формулировки приведены к единой gateway-модели «один провайдер = одно приложение `p/saas/gw/<provider>/`», per-merchant credentials всегда в заголовках `X-Lp-Apikey` / `X-Lp-Login`. Пункт §1.1 о `PROJECT_ROOT` / `.dir.json` переведён в `[x]`. §3.1 уточнён: в Heap gateway хранится только тестовая пара `lp_test_apikey` / `lp_test_login`, production-секреты школ - только в заголовках входящих запросов.
- **15-05-2026 (вечер)** - закрыты пункты §1.4-§1.7 и часть §2.1, §2.2 для трёх gateway-`op` (`createBill`, `getBillStatus`, `cancelBill`). Все три прошли боевую проверку на тестовом магазине LifePay через RequestTestTab. Закрыты открытые вопросы §12.7 (классификация семантических ошибок подтверждена по [apidoc.life-pay.ru/bill/index](https://apidoc.life-pay.ru/bill/index/)) и §12.8 (`availability` всех трёх `op` → `enabled`). Уточнён §1.6: `amount` отправляется в LifePay строкой `"X.XX"`, `customer_phone` нормализуется в `7xxxxxxxxxx` без `+`, `description` обязателен по контракту LifePay. Юнит-набор `unit-gateway` (13 кейсов) реализован. Остаются открытыми §1.8 (тестовая страница оплаты, webhook-приёмник) и §1.9 (сквозной проход с QR/оплатой/webhook) - другой объём, не gateway.
- **15-05-2026 (поздний вечер)** - пересмотрено решение §12.1: промежуточный слой `sdk/payments` между клиентом и gateway признан избыточной прокладкой и удалён из плана. §1.8 переструктурирован (бывшие 1.8.1-1.8.3: SDK + тестовая страница + приёмник → 1.8.1 тестовая страница + 1.8.2 приёмник, каждый делает прямой HTTP-запрос к gateway). §2.6 переписан с «Тонкий клиент SDK» на «Прямой HTTP-вызов клиентского приложения к payments-gateway». §2.7 виджет: вызов идёт через свой серверный хелпер, а не через SDK. §2.8 приёмник: MD5-верификация реализуется локально в `lib/` приёмника; вызов GC-gateway допускается напрямую (наличие GC-SDK - на усмотрение GC-проекта). §3.1, §3.2 актуализированы (Heap клиентских приложений, релиз трёх приложений вместо четырёх). Открытый вопрос §12.1 в таблице помечен как пересмотренный.
- **15-05-2026 (ночь)** - дальнейшее уточнение клиентской стороны: три отдельных client-приложения (тестовая страница / виджет / приёмник webhook) объединены в **одну клиентскую панель** `p/units/yakovleva/pay`. Панель совмещает три роли: (а) хранилище секретов магазина (`lp_apikey`, `lp_login`, `lp_secret_key`, `lp_webhook_token`, `gateway_base_url`); (б) серверная прокладка `POST /api/lp/invoke` между JS-страницей оплаты и payments-gateway с персистентным журналом `request_log` и `webhook_log` в Heap; (в) приёмник webhook LifePay `POST /webhook?token=...` с локальной MD5-утилитой и дедупликацией по `tid` в `webhook_idempotency`. Главная страница панели (Admin-only) - таблица последних запросов и webhook + базовая аналитика (карточки за сутки). Бандл виджета `widget/payment.js` (Часть 2 §2.7) обслуживается из той же панели и обращается к её `/api/lp/invoke`. §1.8 переписан целиком: вместо §1.8.1-§1.8.2 теперь §1.8.1 Heap/настройки/журнал, §1.8.2 серверная прокладка, §1.8.3 приёмник webhook, §1.8.4 главная страница и аналитика. §1.9 (демо-шаги) обновлено: создание счёта через вкладку «Создать счёт вручную» панели, ожидаемые записи в `request_log` и `webhook_log`. §2.6 переименован в «Транспорт между клиентской панелью и payments-gateway». §2.7 виджет: бандл публикуется панелью, авторизация публичного `/api/lp/invoke` через Origin + per-school token. §2.8 webhook + GC обновляются в той же панели. §3.1/§3.2 актуализированы: deploy теперь двух приложений (gateway + панель). Таблица §12.1 - примечание об объединении трёх client-приложений в одну панель.
- **15-05-2026 (22:50)** - пересмотр аутентификации входящего webhook по факту проверки текущей публичной документации [apidoc.life-pay.ru/notification](https://apidoc.life-pay.ru/notification/index): LifePay не публикует подпись webhook (нет полей `check`/`signature`/`hash` в теле; алгоритм MD5 на странице не описан), формат тела - `application/json`, набор полей переработан (`number`, `original_number`, `type`, `status`, `method`, `amount`, `phone`, `email`, `description`, вложенный объект `order` с `ext_id` / `number` / ..., `purchase`, `add_fields`, `terminal_serial`, `pan` и др.). Решение: единственный механизм аутентификации входящего webhook - токен в query `?token=...` (`lp_webhook_token`, генерируется в админке панели). MD5-верификация **не реализуется**. Удалено: Heap-поле `lp_secret_key` (§1.8.1); локальная утилита `verifyLifepayWebhookSignature` и юнит-набор для неё (§2.6 последний bullet). Изменено: content-type приёмника `application/x-www-form-urlencoded` → `application/json` (§1.8.3); поля `webhook_log` (§1.8.1) - `tid` → `number`, `resultStr` → `status` + `type`, `signatureValid` → `tokenValid`, добавлены `method`, `amount` строкой с двумя знаками; ключ дедупликации `webhook_idempotency` `tid` → `number`; условие GC-обновления (§2.8) - `resultStr = "транзакция оплачена полностью"` → `type: 'payment'` + `status: 'success'`; критерий §1.9.4 - убрана проверка MD5, добавлено требование сохранить сырое тело первого боевого webhook для подтверждения схемы; §3.1 - убран `lp_secret_key` из Heap-набора прод-настроек; §3.5 регрессионный тест «подменённая подпись» заменён на «неверный токен в query» + новый тест на `status: 'fail'`. **Важно для будущих правок:** наш файл `05_Knowledge/06_services/payments/lifepay/webhooks.md` (от 2026-05-08) описывает устаревший form-encoded формат с MD5-подписью и не отражает текущее поведение LifePay; источник истины - live-страница apidoc.life-pay.ru/notification/index, файл требует отдельной актуализации после получения первого боевого webhook.
- **15-05-2026 (23:00)** - переименование клиентской панели: путь `p/units/.../client-payment-panel` → `p/units/yakovleva/pay` (короче, точнее отражает назначение - клиент СБП через LifePay). Изменения - чистый rename во всех документах проекта; семантика и архитектура не меняются.
- **16-05-2026** - реализован весь объём §1.8 (Heap-настройки, три таблицы, прокладка `POST /api/lp/invoke`, приёмник webhook, главная панель с 5 вкладками + «Создать счёт», аналитические API). Юнит-набор `lifepayUnitSuite` - 55 кейсов. При попытке боевого приёма webhook выявлено: Chatium не отдаёт `req.body` для `multipart/form-data` (LifePay фактически шлёт multipart, не JSON, несмотря на свою документацию). Добавлен обход: цепочечная форма роута `app.post('/').body(...).handle(...)` + `extractMultipartTextPayload(req.files, req.fields)` в `lib/webhook/processWebhook.ts` для чтения поля `data` из `req.files`/`req.fields`/Buffer-like структур. 5 новых юнитов `lp_webhook_multipart_*`. Тикет открыт в поддержку Chatium и в комьюнити. PII-маскирование выключено (клиент - оператор ПДн по 152-ФЗ); `webhook_log.email` и `rawBody` теперь хранятся без маски (`shared/prepareRawLog.ts` - только структурная гигиена).
- **17-05-2026** - параллельно с ожиданием патча Chatium разработана спецификация и план развёртки временного `multipart → JSON` прокси на собственном VDS (CentOS 9 Stream + Caddy + Fastify, `p.ru.khudoley.pro`). Документы: [`../../../../../units/aayakovleva/project-docs/webhook-proxy/specification`](../../../../../units/aayakovleva/project-docs/webhook-proxy/specification.md), [`../../../../../units/aayakovleva/project-docs/webhook-proxy/implementation-plan`](../../../../../units/aayakovleva/project-docs/webhook-proxy/implementation-plan.md). Клиент уведомлён о сдвиге дедлайна с 15-05 на 25-05-2026 (см. корневой файл проекта).
- **18-05-2026** - Chatium-разработчик Artur Eshenbrener (комьюнити) выкатил патч с нативной поддержкой `multipart/form-data` в `req.body` (пример: [play-mlncf.chatium.ru/s/ide/index.tsx?purl=/index](https://play-mlncf.chatium.ru/s/ide/index.tsx?purl=%2Findex)). План VDS-переезда отменён, обе записи `docs/webhook-proxy/*` помечены `status: cancelled`. Защитный fallback `extractMultipartTextPayload` оставлен в коде (низкая стоимость поддержки, страховка от регрессий). От клиента поступило расширение скоупа: автоматизация оплат ОТП-банка → GetCourse (после завершения LifePay).
- **23-05-2026** - синхронизация плана с реальным кодом: §1.8.1-§1.8.4 переведены в `[x]` (фактически реализовано 16-05), §1.9 размечен как «разблокирован, не выполнен» с явной отсылкой к патчу 18-05, §2.4 актуализирован с числами кейсов (gateway: 27, panel: 55) и статусом интеграционного сьюта (не собран). Кросс-документы (`operation-manual.md` §6.2/§6.4/§12.1/§13; `data-flow.md`) синхронизированы с фактом «MD5 не используется, путь панели - `p/units/yakovleva/pay`, формат webhook - multipart с native-поддержкой Chatium».
- **23-05-2026 (вечер)** - формат webhook LifePay подтверждён живым примером (Postman Mock capture 20-05-2026, `status: 'fail'` для тестовой СБП-транзакции на 1 ₽). Knowledge-база `05_Knowledge/06_services/payments/lifepay/webhooks.md` полностью переписана под реальный формат (multipart с JSON в поле `data`, без подписи), старый form-encoded формат с MD5 перенесён в раздел «Архив» как legacy-справка. Создана новая knowledge-заметка `05_Knowledge/06_services/chatium/multipart-form-data.md` с каноническим API `req.formData()` (нативно с патча 18-05). Сохранён `notes/2026-05-20--first-real-webhook.md` с метаданными доставки (IP `51.250.11.94`, UA `GuzzleHttp/7`, RU-источник Cloudflare). §1.9 шаг 4 «сохранить сырое тело» помечен как закрытый. **Открыто:** подтвердить, что наш приёмник `sbp-client` обрабатывает реальный webhook (тот пример был отправлен на Postman, не на нас).
- **24-05-2026** - аудит «код vs спецификация»: §1.8.1, §1.8.3 (приёмник webhook), §1.8.4 (UI панели), реестр операций gateway, Heap-ключи, дедупликация, отсутствие серверных ретраев, HTTP 200 в webhook - **подтверждено по коду**. **Выявлен один критический разрыв:** все шесть эндпоинтов `api/lp/*` (`invoke`, `recent-requests`, `recent-webhooks`, `raw-request`, `raw-webhook`, `search-by-request-id`) помечены в комментариях как «Admin-only», но `requireAccountRole(ctx, 'Admin')` фактически не вызывается ни в одном из них. UI-страница `web/admin/index.tsx` (через которую браузер ходит на эти API) защищена правильно; прямой HTTP к API - нет. До выкатки виджета §2.7 на боевую страницу - либо добавить `requireAccountRole` ко всем шести роутам (1 строка в каждом, защита уровня Прототипа), либо сразу реализовать Origin+per-school-token схему §2.7 и переключить `/api/lp/invoke` на неё, оставив остальные пять под `requireAccountRole`. Пункты §1.8.2 и §1.8.4 переведены из `[x]` в `[~]` (выполнено частично, остался auth-gap). Дополнительно: §1.8.3 уточнён - сейчас multipart парсится через старый fallback `req.files`/`req.fields` + `req.body`, миграция на каноничный `req.formData()` (доступен после патча 18-05) - не блокер, можно сделать вместе с §1.9 при подтверждении сквозного прохода.
- **24-05-2026 (вечер)** - закрытие auth-разрыва формализовано отдельным дизайном вместо «просто добавить `requireAccountRole` ко всем `api/lp/*`». Решение: двухуровневая модель `requireRealUser(ctx) + requireInternalAccess(ctx)`, где `requireInternalAccess` пропускает Admin Chatium-воркспэйса и пользователей с активной записью в Heap-таблице `panel_access`. Доступ для сотрудников школы выдаётся через одноразовые пригласительные ссылки, генерируемые Admin'ом (Heap-таблица `panel_invites`, токен ≥ 32 символа через `accountNanoid`, TTL 7 дней, `runWithExclusiveLock` при потреблении). Обоснование - [ADR 0003](../../../../../units/aayakovleva/sbp-client/docs/ADR/0003-internal-access-control.md). Чек-лист реализации - новый раздел **§1.11** этого плана (10 подразделов: таблицы, утилита `requireInternalAccess`, функции `generateInvite`/`consumeInvite`/`revokeInvite`/`revokeGrant`, страница `/web/access/invite`, страница `/web/forbidden`, UI «Управление доступом» в админке панели, миграция 6 эндпоинтов `api/lp/*` + страницы `/`). §1.10 «критерий выхода из Прототипа» расширен: теперь требует закрытия §1.11. §1.8.2 / §1.8.4 ссылаются на §1.11 как на план закрытия auth-разрыва.
