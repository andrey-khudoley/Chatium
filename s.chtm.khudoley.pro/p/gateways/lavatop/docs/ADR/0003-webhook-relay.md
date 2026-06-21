# ADR-0003: Проксирование (relay) вебхуков Lava.Top

Дата: 2026-05-26

## Контекст

Lava.Top доставляет вебхуки (`payment.success`, `payment.failed`, `subscription.*`) на **единый адрес, настроенный на стороне аккаунта** в личном кабинете Lava.Top (раздел Webhooks OpenAPI: «метод, которому должен следовать сервис автора»). Per-invoice callback в API создания счёта не предусмотрен.

Клиентским сервисам gateway нужно получать эти вебхуки на свои адреса (возможно с собственными query-параметрами), без прямой интеграции с Lava.Top. Требуется механизм, при котором gateway принимает вебхук от Lava.Top и пересылает его нужному клиенту.

## Решение

Реализован паттерн **webhook-relay**:

1. **Регистрация адреса.** В ЛК Lava.Top webhook-URL указывает на единый эндпоинт gateway `POST /webhooks` (ручная операция оператора, вне кода).
2. **Маппинг при создании счёта.** Клиент в `POST /v1/createInvoice` передаёт опциональный `callbackUrl` (+ `clientOrderId`). После успешного ответа Lava.Top gateway сохраняет маппинг `contractId → callback_url` в Heap-таблице `lavatopWebhookMapping` (`upsertByContractId` — идемпотентно при retry). `callbackUrl` в тело Lava.Top **не** передаётся.
3. **Приём и форвард.** При вебхуке gateway по `contractId` (для рекуррентных — fallback по `parentContractId`) находит клиентский `callback_url` и пересылает payload целиком через `@app/request` (URL с исходными query-параметрами сохраняется как есть). Результат форварда (`forward_status_code`/`forward_error`) пишется в `lavatopWebhookEvent`.

### Политика ответа эндпоинта вебхука

- Неверный/отсутствующий секрет (`X-Api-Key` или Basic = `lava_webhook_secret`) → **401** (Lava.Top повторит).
- Секрет не задан в настройках → **500** (конфигурация неполная), не 401.
- `contractId` не найден в маппинге → событие сохраняется с `processing_error='contract_not_found'`, ответ **2xx**. Это сознательный выбор: ответ 4xx заставил бы Lava.Top повторять вебхук до 19 раз (1с/5с/15с/16×1м/5×1ч), что для легитимного «callbackUrl не передавался» — бесполезная нагрузка. Повторный вебхук с тем же `dedupe_key` обрабатывается заново (контракт мог появиться позже — гонка createInvoice ↔ webhook).
- Ошибка форварда на клиентский callback (timeout/5xx клиента) → фиксируется в событии, ответ Lava.Top всё равно **2xx** (форвард best-effort, без серверных ретраев — вне scope v1).

### Идемпотентность и гонки

- Дедупликация по `dedupe_key = eventType:contractId:status`.
- Вся цепочка `find → create → mapping → forward` выполняется внутри одного `runWithExclusiveLock(ctx, 'lavatop_webhook:' + dedupeKey, …)` — параллельные вебхуки с одним ключом и двойной форвард исключены.

### Авторизация входящего вебхука

Поддержаны обе схемы OpenAPI Lava.Top: `X-Api-Key: <secret>` (основной путь) и `Authorization: Basic base64(...)` (секрет как user/pass/целиком). Base64 декодируется вручную — `Buffer`/`atob` недоступны на платформе (inner/docs/047-base64.md).

## Последствия

- Новые Heap-таблицы: `lavatopWebhookEvent` (журнал + статус форварда), `lavatopWebhookMapping` (contractId → callback).
- Новые эндпоинты: `POST /webhooks`, `GET /webhooks/status`, `GET /api/admin/webhooks/recent`, `POST /api/admin/webhooks/reforward` (повторный форвард из панели).
- Бизнес-обработка событий (зачисление, активация подписки) в gateway НЕ выполняется — только хранение и форвард.
- Ретрай форварда на недоступный клиентский callback не реализован (best-effort). При необходимости — отдельная задача (очередь повторов).

## Статус

Принято, реализовано для `p/gateways/lavatop`. Портирование идентичного relay в `p/gateways/lifepay` и `p/gateways/getcourse` (со спецификой их upstream-вебхуков) — отдельная задача (Этап B).
