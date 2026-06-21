# Сценарий C — payment-reaction (client3)

## Назначение

`p/units/chatiumclub/client3` реализует **сценарий C**: GetCourse отправляет webhook о прошедшей оплате → клиент3 принимает его на собственном эндпоинте `/api/webhook` (по ADR-0004 «токен в URL»), нормализует событие и через локальный SDK gateway-клиент вызывает `addCommentToDialog` на gateway → gateway отправляет комментарий «Леночки» в диалог GetCourse школы.

Спецификация: `obsidian://second-brain/03_Projects/active/course-chatium-gc-integration-3fa7c2/docs/specifications/clients/payment-reaction/app-scenario-c-payment-reaction.md`. Архитектурное уточнение (webhook принимается клиентом, а не gateway): `implementation-plan.md` в `p/saas/gw/gc/docs/gateway/`.

## Поток

1. POST `/api/webhook?token=<webhook_token>` (любой источник, аутентификация через токен в URL):
   - извлекается `req.query.token`, сравнивается с Heap-настройкой `webhook_token` через **константное по времени** `safeEqualToken`;
   - при расхождении/отсутствии — HTTP 401, пустое тело, в Heap-таблицу `WebhookLog` пишется запись `status: invalid_token`.
2. `lib/paymentReaction.normalizePaymentEvent(req.body)` — выделяет `gcEventId`, `email`, `name`, `dealId`, `amount`, `dialogId`, `userId` из произвольного payload (учитывает синонимы Legacy/new).
3. `lib/paymentReaction.processPaymentEvent`:
   - идемпотентность по `gcEventId` через `webhookRepo.findByGcEventId` (повтор → `status: already_processed`);
   - сборка `commentText` через `renderReactionMessage` (шаблон в Heap, ключ `lenochka_message_template`; дефолт — в `DEFAULT_REACTION_TEMPLATE`);
   - если `dialogId`/`userId` отсутствуют и в событии, и в настройках (`lenochka_default_dialog_id`, `lenochka_default_user_id`) — `status: error, errorCode: CLIENT3_MISSING_DIALOG_OR_USER`, без вызова gateway;
   - `invoke(ctx, { op: 'addCommentToDialog', args: { dialogId, userId, transport: 'system', commentText } })`;
   - запись в Heap-таблицу `WebhookLog`: `gcEventId`, `email`, `dealId`, `amount`, `tokenValid: true`, `reactionOk`, `reactionErrorCode`, `gatewayRequestId`, `status`.
4. Ответ GC: всегда HTTP 200 при валидном токене (даже при ошибке внутренней обработки) — чтобы GC не ретраил бесконечно. Подробности — в `WebhookLog`.

## Безопасность

ADR-0004 «токен в URL»:

- Токен — строка ≥ 32 случайных байт; в client3 — 42–64 символа из `accountNanoid` (см. `lib/webhookSecret.lib`).
- Сравнение токена — `safeEqualToken` (по времени, символьное; не зависит от длины первой расходящейся позиции).
- В логи попадают только длина токена и факт совпадения; сам токен — никогда (manual §5.7).
- Ротация: POST `/api/admin/webhook/rotate` (Admin) выдаёт новый токен; старый перестаёт работать.
- Чтение текущего токена — GET `/api/admin/webhook/info` (Admin) возвращает `{ token, webhookUrlSuffix: '/api/webhook?token=...' }`.

## Конфигурация

В админке (POST `/api/settings/save`) задаются:

| Ключ                         | Описание                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `gateway_url`                | Базовый URL gateway без хвостового `/`.                                                                                 |
| `gc_school_host`             | Хост школы GC без схемы.                                                                                                |
| `gc_school_api_key`          | API-ключ школы (не логируется).                                                                                         |
| `webhook_token`              | Текущий webhook-токен (генерируется автоматически при первом обращении к `/api/webhook` или `/api/admin/webhook/info`). |
| `lenochka_message_template`  | Шаблон сообщения; placeholders: `{{name}}`, `{{dealId}}`, `{{amount}}`.                                                 |
| `lenochka_default_dialog_id` | Идентификатор диалога Леночки в GC (если событие не содержит `dialog_id`).                                              |
| `lenochka_default_user_id`   | Идентификатор пользователя GC, от чьего имени отправляется сообщение.                                                   |

## SDK-клиент

`lib/gateway/gatewayClient.ts` — локальная копия SDK; реестр `op` — `shared/v1OpsList.generated.ts`. В client3 используется: `addCommentToDialog`.

## Эндпоинты

| Method | Path                        | Auth                   | Назначение                                                   |
| ------ | --------------------------- | ---------------------- | ------------------------------------------------------------ |
| POST   | `/api/webhook?token=<...>`  | анонимно (token в URL) | Приём webhook GC оплаты. 401 при invalid token.              |
| GET    | `/api/admin/webhook/info`   | Admin                  | Текущий токен и `webhookUrlSuffix`.                          |
| POST   | `/api/admin/webhook/rotate` | Admin                  | Сгенерировать новый токен (старый перестаёт работать).       |
| GET    | `/api/tests/scenario`       | AnyUser                | Сценарные юнит-тесты (нормализация события, токены, шаблон). |

## Тесты

- `lib/tests/paymentReactionSuite.ts` — синхронные юнит-проверки: `safeEqualToken` (равные/разные/пустые/non-strings), `normalizePaymentEvent` (пустой payload, синонимы, синтетический event_id, amount как строка), `renderReactionMessage` (дефолтный шаблон, fallback «участник», заменяет все вхождения).
- `api/tests/scenario/index.ts` — раннер сценарных юнит-тестов; провалы → severity 3.

## Логирование

- Все ключевые точки (приём webhook, валидация токена, нормализация, идемпотентность, invoke, exit) — через `loggerLib.writeServerLog`.
- В payload — длины токенов, ключи тела, `gcEventId`, `email`, `dealId`, `amount`, `requestId`, `gatewayHttpStatus`. Сам токен и тело API-ключа никогда не логируются.
- Логи доступны в админке `/web/admin` и в Heap-таблице `Logs`.

## Допущения и ограничения

- Webhook GC должен быть настроен с URL вида `https://<host>/p/units/chatiumclub/client3/api/webhook?token=<token>`. Получить актуальный URL-suffix — через `/api/admin/webhook/info`.
- Идемпотентность работает только при наличии `gcEventId` (или синтетического `pay_<dealId>_<email>`). Без него повторный webhook создаст вторую реакцию.
- Сценарий «Леночки» работает через `addCommentToDialog` (комментарий в диалог GC). Альтернативный поток через `@app/sender` (Chatium-родной) — в P2.
- Лимит ретраев GC и таймаут response (200 при ошибке внутренней обработки) — стандартные для GC webhook.
