# chatium-scaffold

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-scaffold/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/006-arch.md; inner/docs/024-project-docs.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-scaffold

## Description

Создаёт каркас нового Chatium-приложения: index.tsx, .workspace.json, .dir.json, структуру каталогов, базовые конфиги. Использовать при создании нового приложения с нуля.

## Обязательная структура нового приложения

- **index.tsx** — точка входа (`app.html('/')` или `app.get('/')`), импорт jsx из `@app/html-jsx`, подключение Tailwind 3.4.16, FontAwesome 6.7.2, метатеги viewport, Clarity
- **.workspace.json** — `{"features":{"tools":["heap"]}}` (если нужен Heap)
- **.dir.json** — описание приложения для IDE
- **.CHATIUM-LLM.md** — словарь для LLM
- **README.md** — описание проекта
- **tsconfig.json** — с `"extends"` на корневой tsconfig
- **Каталоги:** `api/`, `pages/`, `tables/`, `docs/`, `config/`; при необходимости: `components/`, `lib/`, `repos/`, `shared/`, `tests/`, `transport/`, `tools/`

## Шаблон index.tsx

```tsx
import { jsx } from '@app/html-jsx'

export const indexRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
        />
      </head>
      <body>
        <MainPage />
      </body>
    </html>
  )
})
```

## Ссылки на документацию

- **006-arch.md** — структура проекта
- **001-standards.md** — стили, Tailwind, FontAwesome
- **018-preloader.md** — прелоадер

## Примеры

- `inner/samples/new_project/` — полный шаблон с auth, admin, tests
- `inner/samples/design/` — многостраничный шаблон
