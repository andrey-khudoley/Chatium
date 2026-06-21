# chatium-html-jsx

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-html-jsx/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/035-html-jsx.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

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
- **InitializerComponent**, **createClientInitializer** — компоненты с клиентским инициализатором.
- **SolidComponent** — Solid-компонент с __solidComponent, __exportInfo.

## @app/html

- **renderHtml(ctx, path, props?)** — отрендерить HTML по пути.
- **html`...`** — теговый шаблон для HTML; **HtmlString**.
- **portal(name)**, **portalTarget(name)** — порталы.
- **css**, **javascript**, **js**, **cssBundle**, **javascriptBundle**, **jsBundle** — стили и скрипты.
- **htmlEscape(str)**, **htmlResponse(...)**, **getBundle()**.

## Чеклист

- [ ] Импорт jsx из @app/html-jsx для роутов/тестов
- [ ] При рендере по пути — renderHtml из @app/html
- [ ] Типы в index.d.ts обоих модулей

## Ссылки на документацию

- **035-html-jsx.md** — @app/html-jsx, @app/html
- **001-standards.md**, **007-vue.md**, **020-testing.md**
