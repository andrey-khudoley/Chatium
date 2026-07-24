# form-gen

Модуль-конструктор форм заказа для страниц юнита neso и внешних сайтов, наполняемых предложениями GetCourse (GC). Админ создаёт форму и получает сниппеты для встраивания (`<script>` + `<div>`); виджет на целевой странице (в т.ч. на внешнем домене) рендерит форму, посетитель отправляет заявку — прототип создаёт заказ в GC и редиректит на оплату.

## Текущее состояние

**Волна 1 (прототип) — реализована, прошла Runtime Verification на dev.**

Проверено рантаймом: роуты резолвятся; `widget?form=<slug>` отдаёт запечённый JS (мультиофферный select, CSS с префиксом `fg-`, реестр модалки `window.__formGen`); несуществующий `formID` — тихая деградация (no-op JS, без ошибок на странице); `/api/submit` парсит `x-www-form-urlencoded`, CORS `*` на всех ветках ответа; админка создаёт форму и сохраняет настройки GC; логи без PII.

**Не проверено** (нужны креды тестовой школы GC — вводятся пользователем в админке): реальное создание заказа в GC через Legacy-импорт `deals/add` и редирект на страницу оплаты.

Настройки GC (URL школы, ключ школы, ключ разработчика) хранятся в Heap per-environment: dev-копия модуля работает с тестовой школой GC, прод — с боевой. `/to-prod` эти настройки не переносит (вводятся заново в прод-админке).

## Навигация по документации

- [`docs/spec/spec.md`](docs/spec/spec.md) — спецификация модуля, источник истины (волны 1–4, контракты, ограничения).
- [`docs/ADR/0001-client-script-widget.md`](docs/ADR/0001-client-script-widget.md) — решение о клиентском script-виджете для встраивания форм на внешние домены.
- [`docs/architecture.md`](docs/architecture.md) — слои, роутинг, структура каталогов.
- [`docs/api.md`](docs/api.md) — таблица эндпоинтов.
- [`docs/data.md`](docs/data.md) — Heap-таблицы и связи.

## Структура

- `config/` — `routes.tsx` (`PROJECT_ROOT`, `ROUTES`, `withProjectRoot`, абсолютные `widgetAbsoluteUrl`/`submitAbsoluteUrl` для внешних доменов), `constants.ts`.
- `tables/` — Heap-таблицы модуля (настройки GC, формы).
- `lib/` — `settings/gcSettings`, `gc` (временный дубль Legacy-импорта GC, удаляется в MVP), `submit/mapParams`, `widget` (`renderWidgetJs` + стили), `form/slug`.
- `api/` — `submit.ts` (публичный), `admin/save-settings.ts`, `admin/create-form.ts` (Admin).
- `widget/index.ts` — роут `widget?form=<slug>`, отдаёт запечённый JS виджета.
- `web/admin/` + `pages/admin/AdminPage.vue` — админка.

Подробности слоёв и роутинга — в `docs/architecture.md`.

## Волны разработки

1. **Прототип (текущая)** — ручной ввод offerId/мультиоффера в админке, прямой вызов GC Legacy-импорта.
2. **MVP** — переход на getcourse-гейтвей, удаление дубля GC-клиента, генератор форм через `getOffers`, контракт appearance.
3. **Beta** — брокер событий, аналитика, защита от спама.
4. **Полировка.**

Детали по волнам — `docs/spec/spec.md` §0.2.

## TODO

- Проверить реальное создание заказа в GC (Legacy-импорт `deals/add` + `return_payment_link`) и редирект на оплату — нужны креды тестовой школы GC.
- Волна 2 (MVP): переход на getcourse-гейтвей вместо прямого GC-клиента; удалить временный дубль `lib/gc`; генератор форм через `getOffers`; контракт appearance.

## Changelog

- 2026-07-23: волна 1 (прототип) — реализация модуля form-gen (админка, виджет, submit в GC) + Runtime Verification на dev.
