# chatium-notion

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-notion/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/E04-notion.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-notion
description: Интеграция Notion в Chatium — авторизация, страницы, блоки, базы данных, вебхуки. Использовать с @app/request для Notion API.
---

# chatium-notion

Интеграция с Notion API: страницы (Pages), блоки (Blocks), базы данных (Databases), Data Source, комментарии, вебхуки. Запросы через `@app/request`. Авторизация: Internal Integration Token (Bearer).

## Когда использовать

- Чтение и создание страниц в Notion
- Работа с блоками контента (параграф, заголовок, список)
- Запросы к базам данных (query, filter, sort)
- Синхронизация по вебхукам (события страниц/баз)

## Авторизация

- Создание интеграции в Notion (My Integrations), получение Internal Integration Token.
- Хранение токена в Heap или config (безопасно по правилам проекта).
- Заголовки: `Authorization: Bearer {token}`, `Notion-Version: 2022-06-28` (или актуальная версия по доке).

## Основные операции

- **Страницы:** получение, создание, обновление свойств, архивация.
- **Блоки:** получение блоков страницы, добавление, обновление, удаление.
- **Базы данных:** получение, схема (Data Source), создание, query с filter и sort.
- **Комментарии:** получение, создание, ответ.
- **Поиск:** Search API.
- **Вебхуки:** настройка, обработка событий в роуте.

## Паттерны

- Базовый URL: `https://api.notion.com/v1/`.
- При 401 — проверить токен и права интеграции (Capabilities).
- Логирование через ctx.account.log().

## Чеклист

- [ ] Токен интеграции получен и сохранён
- [ ] Запросы через request() из @app/request; заголовки Authorization и Notion-Version
- [ ] При работе с базами — query, filter, sort по Notion API
- [ ] Вебхуки: роут для приёма событий, верификация при необходимости

## Ссылки на документацию

- **E04-notion.md** — Notion API, авторизация, страницы, блоки, базы, вебхуки
- **004-request.md** — HTTP-клиент для запросов к API
