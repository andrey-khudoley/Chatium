# API — form-gen

File-based роутинг: один файл = один путь. `PROJECT_ROOT = d/units/neso/sys/form-gen` (`config/routes.tsx`). Ссылки внутри воркспейса строятся через `withProjectRoot`/`getFullUrl`; для виджета и `submit`, исполняемых на чужих доменах, — абсолютные URL от `DOMAIN` (`widgetAbsoluteUrl`, `submitAbsoluteUrl`).

## Таблица эндпоинтов

| Method | Path | Файл | Auth | Публичность | Назначение |
|--------|------|------|------|-------------|------------|
| GET | `/` | `index.tsx` | — | публичный | HTML-заглушка со ссылкой на админ-панель |
| GET | `/web/admin` | `web/admin/index.tsx` (`// @shared`) | `requireAccountRole(ctx,'Admin')` | admin | Админ-страница: настройки GC + список форм (SSR-пропсы в `AdminPage.vue`) |
| POST | `/api/admin/save-settings` | `api/admin/save-settings.ts` | `requireAccountRole(ctx,'Admin')` | admin | Сохранение настроек интеграции GC |
| POST | `/api/admin/create-form` | `api/admin/create-form.ts` | `requireAccountRole(ctx,'Admin')` | admin | Создание мультиоффер-формы, генерация slug и сниппетов встраивания |
| POST | `/api/submit` | `api/submit.ts` | — | **публичный, CORS `*`** | Приём заявки с внешнего сайта, создание сделки в GC |
| GET | `/widget?form=<slug>` | `widget/index.ts` | — | публичный | Отдаёт JS-виджет формы с запечённым конфигом |

Admin-эндпоинты (`save-settings`, `create-form`) вызываются из `AdminPage.vue` через `fetch` same-origin (не `.run()`), поэтому `// @shared-route` им не требуется. `submit` и `widget` исполняются на сторонних доменах — URL строятся абсолютными (`widgetAbsoluteUrl`, `submitAbsoluteUrl`), без хардкода.

---

## GET /

Заглушка. Без Heap и авторизации — маркер того, что каталог обслуживается роутингом. Ссылка на `/web/admin` через `withProjectRoot(ROUTES.admin)`.

## GET /web/admin

- Auth: `requireAccountRole(ctx, 'Admin')` первой строкой.
- Вход: нет тела/query.
- SSR-пропсы в `AdminPage.vue`: `initialSettings` (настройки GC), `saveSettingsUrl`, `createFormUrl` (абсолютные от корня домена через `getFullUrl` — не `withProjectRoot`, т.к. `fetch` из Vue резолвит относительный путь от текущего URL страницы), `forms` (до 200 последних, `order: [{createdAt:'desc'}]`).

## POST /api/admin/save-settings

- Auth: Admin.
- Вход (JSON): `{ schoolUrl: string, schoolKey: string, developerKey: string }`.
- Выход: `{ ok: true }`.
- Настройки сохраняются в Heap; значения (URL/ключи) не логируются — только факт сохранения. `developerKey` только хранится, наружу не отдаётся.

## POST /api/admin/create-form

- Auth: Admin.
- Вход (JSON): `{ offers: Array<{ offerId: string, title: string, price: string, currency: string }> }` (мультиоффер).
- Выход при успехе: `{ ok: true, slug, scriptSnippet, divSnippet }` — `scriptSnippet` содержит `widgetAbsoluteUrl(slug)`.
- Ошибка: пустой список валидных офферов (после фильтрации по `offerId`+`title`) → `{ ok: false, error: 'NO_OFFERS' }`.
- Генерирует slug (`generateFormSlug`) и создаёт запись в `FormsTable`.

## POST /api/submit

Публичный эндпоинт, вызывается виджетом с чужого домена.

- Auth: нет.
- CORS: `Access-Control-Allow-Origin: *` — оборачивает **каждый** return (happy-path, все ошибки, тихая деградация) через хелпер `corsJson`; иначе внешний домен не сможет прочитать тело ответа. Заголовок отсутствует только при отказе схемы валидации `.body()` (до входа в handler).
- Вход: `application/x-www-form-urlencoded` (simple request, без preflight) — `slug, offerId, name, email, phone, utmSource, utmMedium, utmCampaign, utmContent, utmTerm`. В схеме все поля `.optional()`, непустота проверяется вручную в handler.
- Выход: JSON `{ ok: true, redirectUrl }` либо `{ ok: false, error }`.

Поток обработки и коды ошибок:

| Шаг | Условие отказа | `error` |
|-----|-----------------|---------|
| Валидация обязательных полей (`slug, offerId, name, email, phone`) | одно из полей пусто | `VALIDATION_FAILED` |
| Поиск формы по `slug` | форма не найдена (удалена/не существует) — тихая деградация | `FORM_NOT_FOUND` |
| Проверка `offerId` среди `form.offers` | offerId не входит в форму | `OFFER_NOT_IN_FORM` |
| Настройки GC (`getGcSettings`) | `schoolUrl`/`schoolKey` не заданы | `SETTINGS_MISSING` |
| Вызов GC `deals/add` (`createDealProto`) | HTTP-ошибка / неожиданный ответ / нет ссылки на оплату | `GC_HTTP_<status>` / `GC_BAD_RESPONSE` / `GC_NO_PAYMENT_LINK` |

При успехе: маппинг параметров (`mapSubmitToParams`) → прямой вызов GC `deals/add` (волна 1, без очереди) → `{ ok: true, redirectUrl }`.

## GET /widget?form=&lt;slug&gt;

- Auth: нет, публичный.
- Query: `form` (slug формы).
- Выход: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache` — тело JS с запечённым конфигом (offers, appearance, `submitUrl`, CSS).
- Тихая деградация: несуществующий/удалённый `slug` → no-op JS (`renderNoopJs`), статус 200 (без явной ошибки на клиенте).
- Каталог назван `widget/` (без `.js` в имени) — sync-агент Chatium отклоняет каталоги с расширением в имени; `.js` в `<script src>` не обязателен, URL-сегмент `widget` резолвится штатно.

---

## Ключи и секреты

`schoolKey`/`developerKey` (интеграция GetCourse) хранятся только на сервере (Heap-настройки) и никогда не отдаются в ответах API или логах.
