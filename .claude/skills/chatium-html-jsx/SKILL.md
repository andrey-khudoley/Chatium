---
name: chatium-html-jsx
description: Модули @app/html-jsx и @app/html в Chatium — jsx, renderHtml, portal, бандлы. Использовать для серверных роутов и тестов без Vue.
---

# chatium-html-jsx

Построение JSX и рендер HTML в роутах и тестах. **@app/html-jsx**: функция `jsx`, InitializerComponent, SolidComponent, createClientInitializer. **@app/html**: renderHtml, html-шаблоны, portal, бандлы (css, javascript), htmlEscape, htmlResponse.

## Когда использовать

- app.html-роуты с разметкой без Vue (дерево блоков)
- HTTP-тесты с формированием разметки (020-testing)
- Рендер HTML по пути с пропсами
- Порталы и бандлы стилей/скриптов

## @app/html-jsx

- **jsx(block, props?, ...children)** — создание узлов JSX. Импорт: `import { jsx } from '@app/html-jsx'`.
  - Сигнатура: `jsx(block, props?, ...children)`
  - Используется в app.html-роутах и в HTTP-тестах для формирования разметки без Vue
- **InitializerCtx**, **InitializerComponent** — контекст и компоненты с клиентским инициализатором.
- **createClientInitializer(initializer, exportInfo?)** — создать компонент с клиентским инициализатором (привязка к элементу DOM).
- **SolidComponent<Props>** — Solid-компонент с полями `__solidComponent`, `__exportInfo`.

## @app/html

- **renderHtml(ctx, path, props?)** — отрендерить HTML по пути с пропсами.
- **HtmlString** — класс-наследник String для безопасной HTML-строки.
- **html\`...\`** — теговый шаблон для HTML.
- **portal(name)**, **portalTarget(name)** — порталы для вставки контента в целевой узел.
- **css**, **javascript**, **js**, **cssBundle**, **javascriptBundle**, **jsBundle** — теговые функции для подключения стилей и скриптов.
- **htmlEscape(str)** — экранирование HTML.
- **htmlResponse(...)** — сформировать HTTP-ответ с HTML.
- **getBundle()** — получить бандл (BundleHtmlString).

## Примеры

### Пример 1: Простой jsx в app.html-роуте

```typescript
import { jsx } from '@app/html-jsx'

export const myRoute = app.html('/', async (ctx) => {
  return jsx('div', { class: 'container' },
    jsx('h1', null, 'Заголовок'),
    jsx('p', null, 'Содержание')
  )
})
```

### Пример 2: Рендер HTML по пути с renderHtml

```typescript
import { renderHtml } from '@app/html'

export const myRoute = app.get('/api/page', async (ctx, req) => {
  const data = { title: 'Страница' }
  const html = await renderHtml(ctx, 'path/to/page', data)
  return { html }
})
```

### Пример 3: Использование порталов

```typescript
import { jsx, portal, portalTarget } from '@app/html-jsx'

export const myRoute = app.html('/', async (ctx) => {
  return jsx('div', null,
    portalTarget('header'),
    jsx('main', null, 'Основной контент'),
    portal('header', jsx('header', null, 'Шапка'))
  )
})
```

### Пример 4: Подключение стилей и скриптов

```typescript
import { jsx, css, javascript } from '@app/html-jsx'

export const myRoute = app.html('/', async (ctx) => {
  return jsx('div', null,
    css`
      body { font-family: sans-serif; }
    `,
    javascript`
      console.log('Инициализация');
    `,
    jsx('h1', null, 'Контент')
  )
})
```

## Типизация

Типы находятся в:
- `node_modules/@app/html-jsx/index.d.ts` — типы для jsx, InitializerComponent, SolidComponent
- `node_modules/@app/html/index.d.ts` — типы для renderHtml, portal, бандлы

## Чеклист

- [ ] Импорт jsx из @app/html-jsx для роутов/тестов
- [ ] При рендере по пути — renderHtml из @app/html
- [ ] Типы в index.d.ts обоих модулей
- [ ] Использование HtmlString для безопасных строк
- [ ] Экранирование с htmlEscape при необходимости
- [ ] Правильное использование portalTarget и portal для многоуровневой разметки

## Ссылки на документацию

- **035-html-jsx.md** — @app/html-jsx, @app/html, полный справочник
- **001-standards.md** — стандарты кодирования, примеры jsx
- **007-vue.md** — Vue и серверный рендер (SSR)
- **020-testing.md** — HTTP-тесты с jsx
- **025-app-modules.md** — сводка по модулям @app
