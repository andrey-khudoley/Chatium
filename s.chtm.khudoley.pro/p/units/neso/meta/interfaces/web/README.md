# NeSo Meta Web Interface

## Назначение

Публичный web-интерфейс для сценария оформления заказа в NeSo Meta: форма на странице, публикация заполненных данных в core broker, ожидание события от GetCourse interface и редирект пользователя на ссылку оплаты.

## Текущее состояние

Checkout runtime реализован (spec rev.2):

- Главная `/` — checkout-страница: SSR-форма с `requestKey` + `encodedSocketId`, submit отправляет в core broker событие `web.checkout.submitted@1`.
- Пинг `/checkout/process` GetCourse при submit (cold-start ускорение) + планирование fallback-джобы.
- Получение доставки двумя каналами: клиент-драйвен poll (`api/checkout/status`, основной) и self-terminating fallback-джоба; дублирующий WebSocket `payment_ready`.
- Корреляция доставок по `payload.idempotencyKey`; идемпотентность через lock `checkout:{requestKey}` + claim ядра.
- Таблица `checkoutRequests` + репозиторий; broker-клиент; контракт `web.checkout.submitted@1`; `CheckoutPage.vue`; модульные и интеграционные тесты.
- Остаётся: прогон e2e-тестов требует развёрнутого окружения; getcourse-сторона (rev.5) уже готова.

## Документация

- Источник истины: `docs/spec/spec.md`
- API: `docs/api.md`
- Данные: `docs/data.md`
- Импорты: `docs/imports.md`
- ADR: `docs/ADR/`

## Платформенные ограничения

- Chatium runtime предоставляет `app`, `ctx`, routing, Heap, socket и auth.
- В Vue нельзя импортировать `tables/`, `repos/`, `lib/`; только `shared/*` и `// @shared-route`.
- Ссылки строятся через `config/routes.tsx`, без хардкода URL.
- Изменения runtime сначала отражаются в `docs/spec/spec.md`.

## Changelog

- 2026-06-21: создан scaffold модуля `p/units/neso/meta/interfaces/web` и подготовлена spec-as-source для checkout → broker → GetCourse → broker → WebSocket → redirect flow.
- 2026-06-22: реализован checkout runtime (spec rev.2): форма, broker-клиент, submit/status API, таблица checkoutRequests, fallback-джоба, WebSocket payment_ready, тесты.
