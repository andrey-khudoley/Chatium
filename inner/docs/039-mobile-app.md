@chatium

# Модуль @app/mobile-app: Ссылки и действия мобильного приложения

Краткий справочник по модулю `@app/mobile-app` — генерация ссылок на мобильное приложение и URL для run action. Типизация: `node_modules/@app/mobile-app/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Экспорты](#экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/mobile-app** — API для интеграции с мобильным приложением Chatium: получение ссылки на открытие URL в мобильном приложении (getMobileAppLink) и генерация пути для run action (generateMobileAppRunActionUrlPath). Опции передаются через GetMobileAppLinkOptions.

---

## Экспорты

- **getMobileAppLink(url, options?)** — вернуть ссылку для открытия в мобильном приложении (Promise<string>).
- **generateMobileAppRunActionUrlPath(...)** — сгенерировать путь URL для run action мобильного приложения.

Точные параметры и типы см. в `node_modules/@app/mobile-app/index.d.ts`.

---

## Связанные документы

- [002-routing.md](002-routing.md) — роутинг и URL
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/mobile-app/index.d.ts`
