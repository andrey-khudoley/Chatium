# Сценарий D — registration-welcome (client4)

## Назначение

`p/units/chatiumclub/client4` реализует **сценарий D**: GetCourse отправляет webhook о регистрации пользователя на активность (training/webinar) → клиент4 принимает его на собственном эндпоинте `/api/webhook` (по ADR-0004 «токен в URL»), нормализует событие и через локальный SDK gateway-клиент вызывает `addCommentToDialog` на gateway → отправляется персональное приветствие.

Спецификация: `obsidian://second-brain/03_Projects/active/course-chatium-gc-integration-3fa7c2/docs/specifications/clients/registration-welcome/app-scenario-d-registration-welcome.md`. Архитектурное уточнение (webhook принимается клиентом, а не gateway): `implementation-plan.md` в `p/saas/gw/gc/docs/gateway/`. Polling-вариант (Б) реализуется на стороне gateway, не в этом приложении.

## Поток

1. POST `/api/webhook?token=<webhook_token>`:
   - извлекается `req.query.token`, сравнивается с Heap-настройкой `webhook_token` через **константное по времени** `safeEqualToken`;
   - при расхождении — HTTP 401, пустое тело, в `WebhookLog` запись `status: invalid_token`.
2. `lib/registrationWelcome.normalizeRegistrationEvent(req.body)` — выделяет `gcEventId`, `email`, `name`, `activityId`, `activityName`, `activityDate`, `dialogId`, `userId` (синонимы `training`/`webinar`/`activity` на корне и в подобъектах).
3. `lib/registrationWelcome.processRegistrationEvent`:
   - идемпотентность по `gcEventId` через `webhookRepo.findByGcEventId` (повтор → `status: already_processed`);
   - сборка `commentText` через `renderWelcomeMessage` (шаблон в Heap, ключ `welcome_message_template`; дефолт — в `DEFAULT_WELCOME_TEMPLATE`); placeholders: `{{name}}` (fallback «участник»), `{{activityName}}` (fallback «мероприятие в GetCourse»), `{{activityDate}}` (с подстановкой ` (...)`);
   - если `dialogId`/`userId` отсутствуют и в событии, и в настройках (`lenochka_default_dialog_id`, `lenochka_default_user_id`) — `status: error, errorCode: CLIENT4_MISSING_DIALOG_OR_USER`, без вызова gateway;
   - `invoke(ctx, { op: 'addCommentToDialog', args: { dialogId, userId, transport: 'system', commentText } })`;
   - запись в Heap-таблицу `WebhookLog`: `gcEventId`, `email`, `activityId`, `activityName`, `tokenValid: true`, `reactionOk`, `reactionErrorCode`, `gatewayRequestId`, `status`.
4. Ответ GC: всегда HTTP 200 при валидном токене.

## Безопасность

ADR-0004 «токен в URL» — идентично client3:

- Токен — 42–64 символа из `accountNanoid` (`lib/webhookSecret.lib`).
- Сравнение через `safeEqualToken` (по времени, символьное).
- В логи попадают только длина токена и факт совпадения; сам токен — никогда.
- Ротация: POST `/api/admin/webhook/rotate` (Admin).
- Чтение текущего токена: GET `/api/admin/webhook/info` (Admin) → `{ token, webhookUrlSuffix: '/api/webhook?token=...' }`.

## Конфигурация

В админке (POST `/api/settings/save`) задаются:

| Ключ                         | Описание                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `gateway_url`                | Базовый URL gateway без хвостового `/`.                                               |
| `gc_school_host`             | Хост школы GC без схемы.                                                              |
| `gc_school_api_key`          | API-ключ школы (не логируется).                                                       |
| `webhook_token`              | Текущий webhook-токен (генерируется автоматически).                                   |
| `welcome_message_template`   | Шаблон приветствия; placeholders: `{{name}}`, `{{activityName}}`, `{{activityDate}}`. |
| `lenochka_default_dialog_id` | Идентификатор диалога Леночки в GC (если событие не содержит `dialog_id`).            |
| `lenochka_default_user_id`   | Идентификатор пользователя GC, от чьего имени отправляется сообщение.                 |

## SDK-клиент

`lib/gateway/gatewayClient.ts` — локальная копия SDK; реестр `op` — `shared/v1OpsList.generated.ts`. В client4 используется: `addCommentToDialog` (как и client3 — единый канал доставки сообщений в диалоги GC).

## Эндпоинты

| Method | Path                        | Auth                   | Назначение                                                   |
| ------ | --------------------------- | ---------------------- | ------------------------------------------------------------ |
| POST   | `/api/webhook?token=<...>`  | анонимно (token в URL) | Приём webhook GC регистрации. 401 при invalid token.         |
| GET    | `/api/admin/webhook/info`   | Admin                  | Текущий токен и `webhookUrlSuffix`.                          |
| POST   | `/api/admin/webhook/rotate` | Admin                  | Сгенерировать новый токен.                                   |
| GET    | `/api/tests/scenario`       | AnyUser                | Сценарные юнит-тесты (нормализация события, токены, шаблон). |

## Тесты

- `lib/tests/registrationWelcomeSuite.ts` — синхронные юнит-проверки: `safeEqualToken` (равные/разные/пустые/non-strings), `normalizeRegistrationEvent` (пустой payload, синонимы training/webinar/root, синтетический event_id), `renderWelcomeMessage` (дефолтный шаблон, fallback «участник», заменяет все вхождения).
- `api/tests/scenario/index.ts` — раннер сценарных юнит-тестов; провалы → severity 3.

## Логирование

- Каждый шаг (webhook entry, валидация токена, нормализация, идемпотентность, invoke, exit) — через `loggerLib.writeServerLog`.
- В payload — длины токенов, ключи тела, `gcEventId`, `email`, `activityId`, `activityName`, `requestId`, `gatewayHttpStatus`. Сам токен и API-ключ никогда не логируются.

## Допущения и ограничения

- Webhook GC должен быть настроен с URL вида `https://<host>/p/units/chatiumclub/client4/api/webhook?token=<token>`. Получить актуальный URL-suffix — через `/api/admin/webhook/info`.
- Идемпотентность работает при наличии `gcEventId` (или синтетического `reg_<email>_<activityId>`). Без обоих повторный webhook создаст вторую реакцию.
- Polling-вариант (если webhook от GC недоступен) — на стороне gateway, не в client4.
- Сценарий приветствия идёт через `addCommentToDialog`. Альтернативный канал через `@app/sender` (личное сообщение в чат Chatium) — P2-расширение.
- Pattern сообщения по умолчанию — однострочный; для онбординг-блоков и интеграции `@app/feed` см. P2-раздел спецификации D §6.
