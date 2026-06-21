# План реализации фичи 3: Визиты и редирект по ссылке

Составлен по [0000-waves.md](./0000-waves.md) (фича 3) с учётом [0000-plan.md](./0000-plan.md).

---

## Цель фичи

Клик по партнёрской ссылке `/r~:linkId` создаёт визит (fingerprint, ref), затем выполняется редирект на целевой URL с подставленным `ref` в query.

**Критерий готовности:** Клик по ссылке → создаётся визит → редирект на целевую страницу с `ref` в URL.

---

## Зависимости

- **Фича 1:** кампании, `campaign_members` — есть.
- **Фича 2:** `pages`, `partner_links`, `pageRepo`, `linkRepo`, `urlBuilder.substituteRef`, `config/routes.getPartnerRedirectUrl` — есть.

---

## 1. Таблица Heap: `visits`

**Файл:** `tables/visits.table.ts`

**Назначение:** Хранение кликов по партнёрским ссылкам.

**Поля (по плану 4.4):**

| Поле             | Тип                     | Описание                                      |
| ---------------- | ----------------------- | --------------------------------------------- |
| campaignId       | RefLink → campaigns     | Кампания                                      |
| partnerLinkId    | RefLink → partner_links | Партнёрская ссылка                            |
| partnerId        | RefLink → partners      | Партнёр                                       |
| pageId           | RefLink → pages         | Целевая страница                              |
| ref              | String                  | Реферальный ID (уникальный в кампании)        |
| fingerprintHash  | String                  | Хеш fingerprint для дедупликации              |
| fingerprintParts | Any                     | Компоненты fingerprint (ip, userAgent и т.д.) |
| clickedAt        | DateTime                | Время клика                                   |
| registeredAt     | DateTime (optional)     | Время регистрации (заполняется в фиче 5)      |

**Реализация:** Создать через Heap API (createOrUpdateHeapTableFile) или вручную по образцу `campaigns.table.ts` / `partner_links.table.ts`. RefLink с `onDelete: 'none'` на все связи.

---

## 2. Либа: `lib/core/fingerprint.ts`

**Назначение:** Генерация fingerprint для дедупликации визитов (один и тот же пользователь по одному партнёру не создаёт дубликаты визитов с новым ref).

**Экспорт:**

- `FingerprintData` — интерфейс: `ip`, `userAgent`, `acceptLanguage`, `platform?`, `timezone?`.
- `FingerprintResult` — интерфейс: `hash: string`, `parts: FingerprintData`.
- `computeFingerprint(req: app.Req): FingerprintResult` — извлекает из `req` IP (X-Forwarded-For / X-Real-IP), user-agent, accept-language, sec-ch-ua-platform, sec-ch-timezone; считает хеш (без crypto — простая хеш-функция, например djb2 или аналог из плана 9.1), возвращает `{ hash, parts }`.

**Важно:** В среде Chatium нет Node.js `crypto` — использовать детерминированную строковую хеш-функцию (например, из 0000-plan.md §9.1).

---

## 3. Репозиторий: `lib/repo/visitRepo.ts`

**Зависимости:** таблица `visits`, `lib/core/fingerprint`, `lib/core/refGenerator` (generateUrlSafeId для ref), типы из `shared/types` при необходимости.

**Функции:**

1. **createVisit(ctx, data): Promise<{ visit: VisitRow; ref: string; isNew: boolean }>**

   - Вход: `campaignId`, `partnerLinkId`, `partnerId`, `pageId`, `fingerprint: FingerprintData`.
   - Логика:
     - Вычислить `fingerprintHash` из `fingerprint` (та же логика, что в fingerprint.ts, либо вызвать хеш по уже собранным parts).
     - Найти существующий визит: `findOneBy(ctx, { fingerprintHash, partnerId })` (опционально: ограничить по времени, если в плане есть «не устарел» — по умолчанию можно не ограничивать для прототипа).
     - Если найден — вернуть `{ visit: existing, ref: existing.ref, isNew: false }`.
     - Если не найден — сгенерировать уникальный `ref` (generateUrlSafeId(8) + проверка уникальности по campaigns + ref в visits, цикл с maxAttempts).
     - Создать запись в `visits`: campaignId, partnerLinkId, partnerId, pageId, ref, fingerprintHash, fingerprintParts, clickedAt = now.
     - Вернуть `{ visit, ref, isNew: true }`.

2. **findVisitByRef(ctx, ref): Promise<VisitRow | null>**

   - `findOneBy(ctx, { ref })`.

3. **markVisitRegistered(ctx, ref): Promise<void>** (для фичи 5)
   - Обновить запись визита: `registeredAt = now`. Реализовать сейчас, чтобы не трогать visitRepo в фиче 5.

**Типы:** VisitRow — из таблицы visits (typeof Visits.T или алиас в shared/types).

---

## 4. Роут: `r.tsx` (редирект по партнёрской ссылке)

**Файл:** `r.tsx` в корне проекта (рядом с `index.tsx`).

**Маршрут:** GET `/r~:linkId` (или эквивалент в file-based роутинге: путь вида `r` с параметром после тильды — уточнить по 002-routing / правилам воркспейса).

**Обработчик:**

1. Получить `linkId` из параметра запроса (например `req.params.linkId` или аналог для пути `r~:linkId`).
2. Найти партнёрскую ссылку: `linkRepo.findLinkByPublicSlug(ctx, linkId)`. Если не найдена — ответ 404 (или короткая HTML-страница «Ссылка не найдена»).
3. Из ссылки взять `campaignId`, `partnerId`, `pageId`, `partnerLinkId` (id записи partner_links).
4. Загрузить страницу: `pageRepo.getPageById(ctx, pageId)`. Если страницы нет или нет `urlTemplate` — 404 или ошибка.
5. Вычислить fingerprint: `computeFingerprint(req)`.
6. Создать визит: `visitRepo.createVisit(ctx, { campaignId, partnerLinkId, partnerId, pageId, fingerprint: result.parts })`. Получить `ref`.
7. Собрать целевой URL: `urlBuilder.substituteRef(page.urlTemplate, ref)`.
8. Редирект: `return ctx.resp.redirect(finalUrl)` (302 или 307 по стандартам проекта).

**Импорты:** `linkRepo`, `pageRepo`, `visitRepo`, `lib/core/fingerprint`, `lib/core/urlBuilder`.

**Регистрация роута:** Уточнить по структуре проекта, как регистрируется GET-обработчик для пути с тильдой (например, файл `r.tsx` в корне или в отдельной папке с указанием пути в конфиге).

---

## 5. Расширение `lib/core/refGenerator.ts` (при необходимости)

В плане 9.2 есть `generateUniqueRef(ctx, campaignId)` с проверкой по таблице visits. В фиче 3 логику уникального ref можно:

- либо вынести в `refGenerator.generateUniqueRef`, импортировать Visits и искать по campaignId + ref;
- либо оставить генерацию ref внутри `visitRepo.createVisit` (generateUrlSafeId(8) + цикл проверки в visits).

Рекомендация: оставить генерацию ref в visitRepo, чтобы не тянуть зависимость refGenerator от таблицы visits (циклические импорты). При желании позже вынести в refGenerator.

---

## 6. Общие типы

- В `shared/types.ts` добавить тип для строки визита (например `VisitRow`) на основе типа из `tables/visits.table.ts`, если нужен общий контракт между репо и API/хуками.

---

## 7. Порядок реализации

| Шаг | Задача                         | Файлы                                 |
| --- | ------------------------------ | ------------------------------------- |
| 1   | Создать таблицу `visits`       | `tables/visits.table.ts`              |
| 2   | Реализовать fingerprint        | `lib/core/fingerprint.ts`             |
| 3   | Реализовать visitRepo          | `lib/repo/visitRepo.ts`               |
| 4   | Добавить типы визита           | `shared/types.ts` (при необходимости) |
| 5   | Реализовать роут редиректа     | `r.tsx`                               |
| 6   | Зарегистрировать роут          | Конфиг/роутинг проекта                |
| 7   | Обновить документацию импортов | `docs/imports.md`                     |

---

## 8. Тестирование

- **Ручная проверка:** Открыть в браузере URL вида `https://s.chtm.aley.pro/p/saas/ref/r~<publicSlug>` для существующей партнёрской ссылки (campaign + partner + page должны быть созданы вручную или через фичу 2). Ожидание: редирект на urlTemplate с подставленным ref; в Heap в таблице visits — новая запись.
- **Повторный клик (тот же fingerprint):** тот же ref, не создаётся второй визит (isNew: false), редирект с тем же ref.
- **Тесты (опционально для прототипа):** endpoint-check для visitRepo.createVisit и для fingerprint (как в фиче 2: api/tests/endpoints-check/visit-repo.ts, fingerprint.ts); при необходимости — интеграционный тест роута r (GET с mock link/page).

---

## 9. Связь с последующими фичами

- **Фича 4 (бот):** Бот будет отдавать ссылку вида `getPartnerRedirectUrl(linkSlug)` — уже есть в config/routes.
- **Фича 5 (рефералы и события):** Webhook’и получают `ref` в query; `visitRepo.findVisitByRef` и `visitRepo.markVisitRegistered` используются в eventRepo/attribution.

---

## Чеклист готовности

- [ ] Таблица `visits` создана и задеплоена.
- [ ] `lib/core/fingerprint.ts` реализован, экспортирует `computeFingerprint`, `FingerprintData`, `FingerprintResult`.
- [ ] `lib/repo/visitRepo.ts` реализован: `createVisit`, `findVisitByRef`, `markVisitRegistered`.
- [ ] Роут `r.tsx` обрабатывает GET `/r~:linkId`, создаёт визит и редиректит на urlTemplate с ref.
- [ ] Роут зарегистрирован и доступен по URL проекта.
- [ ] Ручной сценарий «клик → визит → редирект с ref» выполняется успешно.
- [ ] Документация импортов обновлена.

После выполнения плана можно переходить к фиче 4 (Telegram-бот).
