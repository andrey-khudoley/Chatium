# chatium-analytics-getcourse

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-analytics-getcourse/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/016-analytics-getcourse.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-analytics-getcourse
description: Аналитика GetCourse в Chatium — gcQueryAi, события GetCourse (dealCreated, dealPaid, user/created), SQL к ClickHouse. Использовать для воронок, LTV, когорт.
---

# chatium-analytics-getcourse

Аналитика событий GetCourse через **gcQueryAi** — SQL-запросы к данным GetCourse в ClickHouse. События: dealCreated, dealPaid, user/created, формы, чатботы и др. (34 типа, 5 категорий). Типизация EventDefinition, urlPattern для фильтрации.

## Когда использовать

- Воронки, LTV, когортный анализ
- Связка resolved_user_id и user_id (см. док)
- Запросы к событиям GetCourse по категориям и типам

## API

- **gcQueryAi(ctx, query)** — выполнение SQL к данным GetCourse (импорт из соответствующего SDK, например @gc-mcp-server/sdk или по документации проекта).
- **EventDefinition** — TypeScript-типизация событий.
- **urlPattern** — паттерны LIKE для фильтрации (event://getcourse/%).

## Важно

- **resolved_user_id** vs **user_id** — различать при построении запросов (см. 016-analytics-getcourse.md).

## Чеклист

- [ ] Импорт gcQueryAi из соответствующего SDK
- [ ] SQL-запросы с учётом типов событий и resolved_user_id
- [ ] При необходимости: EventDefinition, urlPattern, категории

## Ссылки на документацию

- **016-analytics-getcourse.md** — gcQueryAi, события GetCourse, SQL-примеры, resolved_user_id
