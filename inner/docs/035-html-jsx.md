@chatium

# Модуль @app/html-jsx и @app/html: JSX и рендер

Справочник по модулям `@app/html-jsx` и `@app/html` — построение JSX-дерева для роутов и тестов, рендер HTML. Типизация: `node_modules/@app/html-jsx/index.d.ts`, `node_modules/@app/html/index.d.ts`. В документации (001, 003, 006, 007, 020) часто встречается импорт `import { jsx } from '@app/html-jsx'`.

## Содержание

- [Назначение](#назначение)
- [@app/html-jsx](#apphtml-jsx)
- [@app/html](#apphtml)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/html-jsx** — фасад для построения JSX в серверных роутах и тестах: функция `jsx`, типы компонентов (InitializerComponent, SolidComponent), создание клиентских инициализаторов (createClientInitializer). Используется в app.html-роутах и в HTTP-тестах для формирования разметки без Vue.

**@app/html** — рендер HTML по пути, шаблоны (html\`...\`), порталы (portal, portalTarget), бандлы (css, javascript, js, cssBundle, javascriptBundle, jsBundle), экранирование (htmlEscape), ответы (htmlResponse, getBundle).

---

## @app/html-jsx

- **jsx** — функция для создания узлов JSX (реэкспорт/обёртка над lib/html-jsx). Сигнатура: `jsx(block, props?, ...children)`.
- **InitializerCtx**, **InitializerComponent** — контекст и тип компонента с инициализатором на клиенте.
- **createClientInitializer(initializer, exportInfo?)** — создать компонент с клиентским инициализатором (привязка к элементу DOM).
- **SolidComponent<Props>** — тип Solid-компонента с полями `__solidComponent`, `__exportInfo`.

В роутах и тестах обычно импортируют `jsx` и собирают дерево блоков для ответа (JSON/HTML).

---

## @app/html

- **renderHtml(ctx, path, props?)** — отрендерить HTML по пути с пропсами.
- **HtmlString** — класс-наследник String для безопасной HTML-строки.
- **html(literalSections, ...substs)** — теговый шаблон для HTML.
- **portal(name)**, **portalTarget(name)** — порталы для вставки контента в целевой узел.
- **css**, **javascript**, **js**, **cssBundle**, **javascriptBundle**, **jsBundle** — теговые функции для подключения стилей и скриптов.
- **htmlEscape(str)** — экранирование HTML.
- **htmlResponse(...)** — сформировать HTTP-ответ с HTML.
- **getBundle()** — получить бандл (BundleHtmlString).

---

## Связанные документы

- [001-standards.md](001-standards.md) — примеры импорта jsx
- [007-vue.md](007-vue.md) — Vue и серверный рендер
- [020-testing.md](020-testing.md) — HTTP-тесты с jsx
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/html-jsx/index.d.ts`, `node_modules/@app/html/index.d.ts`
