---
name: chatium-analytics-traffic
description: Аналитика трафика в Chatium — queryAi, события из access_log, pageview, клики, видео. Использовать для анализа поведения пользователей на сайте через ClickHouse.
---

# chatium-analytics-traffic

Анализ трафика пользователей на сайте: события в ClickHouse (chatium_ai.access_log), запросы через **queryAi** (или gcQueryAi для GetCourse). События: pageview, клики, видео, e-commerce (add_to_cart, checkout, purchase).

## Когда использовать

- Анализ просмотров страниц, кликов, просмотра видео
- Метрики DAU/MAU, Bounce Rate, Session Duration
- E-commerce: корзина, оформление, покупка
- HTTP/HTTPS события группируются по action, а не по URL (см. док)

## Запросы к данным

- **queryAi(ctx, query)** — SQL-запросы к трафику (из `@traffic/sdk` для аккаунта разработчика).
- **gcQueryAi(ctx, query)** — для трафика из настроенного GetCourse аккаунта (из `@gc-mcp-server/sdk`), когда каждый клиент видит свой трафик.

## Типы событий

- 8 базовых + 13 расширенных (pageview, button_click, link_click, video_play, video_pause, video_complete, add_to_cart, checkout, purchase и др.).

## Паттерны

- Проверка настройки GetCourse: integrationIsEnabled(ctx) перед gcQueryAi.
- SQL-примеры и пагинация — в 016-analytics-traffic.md.

## Чеклист

- [ ] Выбор способа: queryAi (@traffic/sdk) или gcQueryAi (настроенный GetCourse)
- [ ] SQL-запросы к chatium_ai.access_log по типам событий
- [ ] Учёт группировки HTTP/HTTPS по action
- [ ] Применение дедупликации для iframe дубликатов
- [ ] Реализация пагинации с фиксацией maxTimestamp (для большого числа событий)

## Ссылки на документацию

- **016-analytics-traffic.md** — Traffic Analytics, queryAi, типы событий (21), SQL-примеры, пагинация, дедупликация
