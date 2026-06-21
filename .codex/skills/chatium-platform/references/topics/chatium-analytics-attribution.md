# chatium-analytics-attribution

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-analytics-attribution/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/016-analytics-attribution.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-analytics-attribution
description: Атрибуция пользователей в Chatium — связка uid с user_id, first-touch/last-touch, AnalyticsUidMappings, parseUrlParams. Использовать для маппинга анонимных посетителей к GetCourse user_id.
---

# chatium-analytics-attribution

Связка анонимного **uid** с реальным **user_id** GetCourse: first-touch и last-touch атрибуция. Таблицы AnalyticsUidMappings, AnalyticsSessionAttribution; событие-мост event://getcourse/form/sent; флаги isFirst/isLast для O(1). API: POST /api/attribution, parseUrlParams для utm и промокодов.

## Когда использовать

- Определение источника регистрации/конверсии (UTM, промокод)
- Маппинг анонимных сессий к пользователям после формы/регистрации GetCourse
- First-touch и last-touch атрибуция

## Основные компоненты

- **AnalyticsUidMappings** — маппинг uid → user_id.
- **AnalyticsSessionAttribution** — сессии и атрибуция.
- **parseUrlParams()** — парсинг utm-меток и промокодов из URL.
- **processAttributionJob** — автоматическая обработка цепочки событий.
- Событие **event://getcourse/form/sent** — мост между анонимным uid и регистрацией.

## Паттерны

- Флаги isFirst/isLast для быстрой проверки без полного пересчёта.
- API POST /api/attribution для получения параметров атрибуции на клиенте или в бэкенде.

## Чеклист

- [ ] Таблицы маппинга и атрибуции (по образцу из доки)
- [ ] Обработка form/sent и сохранение маппинга uid → user_id
- [ ] parseUrlParams при необходимости для UTM/промокодов
- [ ] Job processAttributionJob при автоматической обработке

## Ссылки на документацию

- **016-analytics-attribution.md** — атрибуция, цепочка событий, API, таблицы
