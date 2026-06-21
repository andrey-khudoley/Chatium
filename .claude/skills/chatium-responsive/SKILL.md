---
name: chatium-responsive
description: Модуль @app/responsive в Chatium — responsiveState для адаптивной вёрстки. Использовать для breakpoints и состояния экрана.
---

# chatium-responsive

Состояние экрана (breakpoints) для адаптивной вёрстки. Модуль `@app/responsive`. Функция **responsiveState(ctx, options?)** возвращает объект ResponsiveState (ширина, тип устройства, isMobile и т.п.).

## Когда использовать

- Выбор раскладки или компонентов в зависимости от ширины/устройства
- Адаптивная вёрстка на сервере (SSR) по контексту
- Условный рендер по breakpoints

## API

- **responsiveState(ctx, options?)** — возвращает ResponsiveState для текущего контекста. Опции: ResponsiveStateOptions.

Точные поля ResponsiveState и ResponsiveStateOptions см. в `node_modules/@app/responsive/index.d.ts`.

## Чеклист

- [ ] Импорт responsiveState из @app/responsive
- [ ] Вызов в роуте или при SSR; передача состояния в Vue при необходимости
- [ ] На клиенте адаптив можно также реализовать через CSS/media или клиентское состояние

## Ссылки на документацию

- **040-responsive.md** — @app/responsive
- **007-vue.md** — Vue и адаптивная вёрстка
