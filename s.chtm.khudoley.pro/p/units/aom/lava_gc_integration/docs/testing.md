# Тестирование в проекте `lava_gc_integration`

Как устроены проверки в этом приложении Chatium и чем они **не** похожи на классические юнит-тесты с подменой `ctx`.

## Роль `ctx`

`ctx` — контекст запроса платформы Chatium: пользователь, аккаунт, Heap, логирование и т.д. Он **формируется средой выполнения** при обработке HTTP-запроса к роуту приложения.

- **Нельзя** рассчитывать на «собрать мок `ctx` вручную» как в Jest/Vitest с фиктивным объектом: это не часть стандартного контура приложения.
- В обработчике роута (в т.ч. в `api/tests/endpoints-check/*`) в ход всегда приходит **реальный** `ctx` текущего запроса.

## Админка (`/web/admin`): секрет webhook Lava + поле заказа GetCourse

В блоке «Интеграция Lava.top» поле `lava_webhook_secret`: кнопка «Сгенерировать» (если секрета ещё нет) или «Обновить» (если уже сохранён), «Показать» / «Скрыть» для отображения значения; сохранение только через генератор (`POST /api/settings/save`, 64 hex-символа из `crypto.getRandomValues`).
В блоке GetCourse сохраняется `gc_order_flag_addfield_id` — ID булевого доп.поля заказа; при отправке заказа в GetCourse добавляется `deal.addfields = { [id]: true }` (если ID задан).

## Запуск с страницы тестов (`/web/tests`)

Типичный сценарий:

1. Администратор открывает `./web/tests` (`web/tests/index.tsx`, `TestsPage.vue`).
2. Браузер отправляет **GET** на эндпоинты вида `/api/tests/endpoints-check/...` с `credentials: 'include'`.
3. На сервере выполняется код роута с **`ctx` этого запроса**: пользователь уже аутентифицирован; для проверок, где нужна роль администратора, используется тот же сеанс (например, `requireAccountRole(ctx, 'Admin')` там, где это задано в API).

Итог: **авторизация и `ctx` — боевые**, не подставляются тестовым раннером извне.

## «Юнит»-проверки без сети

В проекте под «юнит» понимаются проверки **чистой логики** без вызовов внешних API и без ручной сборки `ctx`:

- библиотека `lib/settings-save-credentials.lib.ts` (слияние полей ключей для `POST /api/settings/save`);
- GET `api/tests/endpoints-check/settings-save-credentials-unit.ts` вызывает только эти функции с фикстурами; **`ctx` используется лишь для логов (`writeServerLog`) и `requireAnyUser`**, не для подмены данных проверки.

То есть проверяемая логика не зависит от «мокнутого аккаунта»; зависимость от `ctx` минимальна и не относится к сценарию слияния ключей.

**Юнит по страницам (`route.run`):** GET `api/tests/endpoints-check/page-routes-unit.ts` — `requireRealUser(ctx)`; для маршрутов `/`, `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`, `/web/orders` вызывается `route.run(ctx, req)` с подставленным URL под `PROJECT_ROOT` (тот же реальный `ctx`, что у GET к API). Проверяется отсутствие исключений и «приемлемый» ответ (JSX или похожий на редирект). Это не HTTP-интеграция: сеть не используется; полная проверка ответа платформы по HTTP — на вкладке «Интеграция» (`pageRouteProbe`).

## Интеграционные проверки (Heap + внешние API)

- GET `integration-gc-credentials` и `integration-lava-credentials` читают настройки из Heap через **реальный** `ctx` и выполняют живые запросы к GetCourse / Lava (по одному эндпоинту на интеграцию). На вкладке «Интеграция» страницы `/web/tests` эти проверки показываются **двумя строками**, как отдельные поля в админке.
- GET `integration-gc-order-pl-api` — проба PL API по **введённому** `gcOrderId` (query): опционально `buyerEmail`; если email не передан, подставляется `buyer_email` из контракта Heap (`lava_payment_contract`) с этим `gc_order_id`, если он есть. Реализация: `lib/getcourse-api.client` — `probeGcOrderPlApi` (запрос с `deal_status=in_work`; может изменить заказ в GetCourse). Для `gc_order_id=test` ответ с ошибкой (как у лайва Lava).
- Дополнительно в коде есть GET `integration-credentials-both` (оба чекера в одном ответе) — для API/диагностики; UI вкладки «Интеграция» использует два отдельных GET к Heap **после** блока «Страницы приложения».
- **Страницы (интеграция):** с браузера на `/web/tests` — `fetch` с `credentials: 'include'` и `redirect: 'manual'` по маршрутам `/`, `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`, `/web/orders`; разбор через `shared/pageRouteProbe.ts` (серверный `request()` к тем же URL не подставляет сессию пользователя). См. `inner/docs/048-chatium-http-response-probes.md`.
- Итог зависит от данных в Heap и доступности внешних сервисов.

## `route.run` в серверном коде

В отдельных файлах тестовых роутов (например, проверка `lavaPaymentLinkRoute.run`) вызов делается **внутри обработчика GET**, где уже есть **реальный** `ctx` запроса к тестовому эндпоинту. Это не «подставление искусственного `ctx` в изолированном тесте», а выполнение в том же серверном контексте, что и обычный запрос приложения.

**Юнит роута Lava webhook:** GET `api/tests/endpoints-check/lava-webhook-route.ts` — `lavaWebhookInfoRoute.run(ctx)`; POST с `X-Api-Key` — исходящий **`request()`** на абсолютный URL `…/api/integrations/lava/webhook` (как Lava; `lib/app-public-url.lib.ts`); если URL не собрать — те же кейсы через **`processWebhook`** (как `lava-webhook-service.ts`). Валидация тела — **`lavaWebhookRoute.run`**. Query `testId` — одна проверка. На `/web/tests`, вкладка «Юнит» — карточка «Lava webhook».

## POST `payment-link`: юнит и HTTP-интеграция

- **Юнит (быстро):** GET `api/tests/endpoints-check/payment-link-dry-run-unit.ts` — `lavaPaymentLinkRoute.run(ctx, { gcOrderId, …, integrationTestDryRun: true })` без исходящего HTTP к приложению и без Lava. Поля тела передаются **на верхнем уровне** второго аргумента, не вложенным `{ body: { … } }` (иначе схема видит пустое тело и отвечает 422).
- **Интеграция (внешний вызов эндпоинта):** POST `api/tests/endpoints-check/payment-link-http-integration.ts` — на сервере вызывается `request()` на абсолютный URL того же `POST …/api/integrations/lava/payment-link` с тем же маркером dry-run в JSON. В теле тестового POST опционально **`paymentLinkOverrides`** — частичное переопределение полей тела. Нужны заголовки `Host`/`Origin`, чтобы собрать URL (из браузера на `/web/tests` обычно ок).

### Лайв (без `integrationTestDryRun`): Heap + полный путь Lava

Фиксированные данные: `gcOrderId: "test"`, `buyerEmail: debug@khudoley.pro`, `amount: 50`, `currency: RUB`. Перед полным сценарием **`repos/lava_payment_contract.deactivateActiveContractsForGcOrderId`** переводит все активные контракты с этим `gc_order_id` в `cancelled`, чтобы идемпотентность не возвращала старую ссылку без вызова Lava.

- **Чтение Heap:** GET `api/tests/endpoints-check/payment-link-heap-settings-read.ts` — `lava_api_key` (маска), `lava_base_url`, `lava_product_id`, `lava_offer_id`; успех, если все четыре непустые.
- **Интеграция `route.run`:** GET `api/tests/endpoints-check/payment-link-full-route-run.ts` — после чтения настроек и деактивации контрактов `test` вызывается `lavaPaymentLinkRoute.run` **без** dry-run.
- **Интеграция HTTP:** POST `api/tests/endpoints-check/payment-link-full-http-integration.ts` — то же + исходящий `request()` POST на `…/payment-link` без dry-run; при отсутствии абсолютного URL — `{ skipped: true }` (как у dry-run HTTP).

На вкладке «Интеграция» страницы `/web/tests` — отдельная карточка «Лайв: payment-link» и кнопка «Запустить лайв-триаду».

### Лайв: webhook после оплаты

После успешного `route.run` или HTTP лайва страница сохраняет последний `lava_contract_id` и `payment_url`. Карточка «Лайв: webhook после оплаты» показывает абсолютный URL `POST …/api/integrations/lava/webhook` (из GET `webhook-live-test-status`) и ссылку на оплату. Кнопка «Вооружить проверку» вызывает POST `webhook-live-test-arm` с ожидаемым контрактом; при входе реального webhook на боевой эндпоинт `lib/webhook-live-test.lib.ts` фиксирует первый успешный `payment.success` + `completed` по этому `contractId` или складывает прочие события в `otherEvents`. В `lava-webhook.service` обрабатывается только успешный webhook оплаты; при обработке заказ в GetCourse переводится в `in_work` для любых `gc_order_id` (включая тестовые).

См. также общий гайд платформы: `inner/docs/020-testing.md` (интерактивные тесты в браузере; различие `route.run` и HTTP).

## Каталог и документация эндпоинтов

- Список категорий тестов: `GET /api/tests/list` (`api/tests/list.ts`).
- Таблица путей и ответов: `docs/api.md`, раздел «Тесты».

## Временные HTTP-пробы (`temp/`)

Для настройки интеграционных проверок маршрутов (серверный `request` и разбор ответа) иногда нужно увидеть, **как именно** Chatium отдаёт статус и тело при 3xx/4xx/5xx или при «логической» ошибке в JSON при HTTP 200.

В корне проекта добавлен каталог **`temp/`** (только диагностика, не прод):

| Маршрут (относительно `PROJECT_ROOT`) | Смысл                                |
| ------------------------------------- | ------------------------------------ |
| `./temp`                              | HTML-оглавление со ссылками на пробы |
| `./temp/http-200`                     | Обычная HTML-страница (`app.html`)   |
| `./temp/http-200-json-error`          | JSON, HTTP 200, в теле `ok: false`   |
| `./temp/http-301`                     | 301 + `Location` на `../http-200`    |
| `./temp/http-302`                     | `ctx.resp.redirect` (обычно 302)     |
| `./temp/http-400` … `./temp/http-403` | `ctx.resp.json(..., код)`            |
| `./temp/http-404`, `./temp/http-500`  | HTML через `rawHttpBody` + статус    |
| `./temp/throws-error`                 | Намеренный `throw` в обработчике     |

Полный URL в браузере: `https://<домен-воркспейса>/p/units/aom/lava_gc_integration/temp` и далее сегменты из таблицы.

Эмпирически зафиксированные форматы ответов (в т.ч. случай **HTTP 200** при `ctx.resp.json(..., 4xx)`) описаны в **`inner/docs/048-chatium-http-response-probes.md`** — использовать при интеграционных проверках маршрутов.

## Связанные файлы

| Назначение                                                            | Путь                                              |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| Страница тестов (UI)                                                  | `web/tests/index.tsx`, `pages/TestsPage.vue`      |
| Каталог тестов (API)                                                  | `api/tests/list.ts`                               |
| Проверки эндпоинтов                                                   | `api/tests/endpoints-check/*.ts`                  |
| Живые проверки учётных из Heap                                        | `lib/integration-credentials.lib.ts`              |
| HTTP-пробы (форматы ответов)                                          | `temp/*/index.tsx`, `temp/index.tsx`              |
| Разбор ответа страниц в UI                                            | `shared/pageRouteProbe.ts`                        |
| Юнит страниц (`route.run`)                                            | `api/tests/endpoints-check/page-routes-unit.ts`   |
| Юнит роута Lava webhook (`lavaWebhookInfoRoute` / `lavaWebhookRoute`) | `api/tests/endpoints-check/lava-webhook-route.ts` |
