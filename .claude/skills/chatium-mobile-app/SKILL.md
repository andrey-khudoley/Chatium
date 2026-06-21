---
name: chatium-mobile-app
description: Модуль @app/mobile-app в Chatium — getMobileAppLink, generateMobileAppRunActionUrlPath. Использовать для ссылок на мобильное приложение.
---

# chatium-mobile-app

Интеграция с мобильным приложением Chatium: ссылка для открытия URL в приложении и путь для run action. Модуль `@app/mobile-app`.

## Когда использовать

- Открытие страницы/действия в мобильном приложении по ссылке
- Генерация пути для run action мобильного приложения
- Deep links в мобильное приложение

## API

- **getMobileAppLink(url, options?)** — вернуть ссылку для открытия в мобильном приложении (Promise<string>). Опции: GetMobileAppLinkOptions.
- **generateMobileAppRunActionUrlPath(...)** — сгенерировать путь URL для run action мобильного приложения.

Точные параметры и типы: `node_modules/@app/mobile-app/index.d.ts`.

## Чеклист

- [ ] Импорт из @app/mobile-app
- [ ] URL и опции по контракту платформы
- [ ] Ссылки в роутинге — withProjectRoot при необходимости (002-routing)

## Ссылки на документацию

- **039-mobile-app.md** — @app/mobile-app
- **002-routing.md** — роутинг и URL
