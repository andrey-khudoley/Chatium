# chatium.chatium-sync — общий корень

Рабочий корень для двух Chatium-воркспейсов. Делится на два слоя:

- **Общий корень (этот каталог)** — git, агентский тулинг, платформенные доки, архив, состояние синка.
- **Воркспейсы** `s.chtm.khudoley.pro` (dev/stage) и `p.chtm.khudoley.pro` (prod) — собственно код Chatium-проектов.

Правила для ассистентов: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex).

## Структура корня

```
chatium.chatium-sync/
├─ CLAUDE.md             # инструкции Claude Code (наследуются субагентами)
├─ AGENTS.md             # инструкции Codex
├─ README.md             # этот файл — карта расположения
├─ .gitignore            # общий, охватывает оба воркспейса
│
├─ .claude/              # Claude Code: agents/, commands/ (/pp1…/pp10, /pipeline, /check…), skills/, settings
├─ .codex/               # Codex: agents/, skills/ (адаптации ролей и workflow из .claude)
├─ .agents/              # вендор-нейтральные skills: auto-commit, to-prod, to-sync
├─ .codegraph/           # локальный индекс CodeGraph (gitignored)
│
├─ inner/                # платформенные материалы (общие для обоих воркспейсов)
│  ├─ docs/              # документация платформы Chatium (поиск — MCP docs-search; навигатор 000-summ.md)
│  ├─ qna/               # вопросы-ответы по платформе
│  └─ samples/           # эталоны/образцы (new_project и др.)
│
├─ deprecated/           # архив выведенного из работы кода и проектов
├─ configs/              # состояние sync-агента по воркспейсам (gitignored, регенерируется)
│
├─ s.chtm.khudoley.pro/  # DEV/STAGE workspace — здесь весь код проектов
└─ p.chtm.khudoley.pro/  # PROD workspace — только цель синхронизации
```

## Оркестрация конвейера (pp)

- `/pipeline` (`.claude/commands/pipeline.md`) — авто-селектор: квалифицирует задачу и выбирает уровень 1–10.
- `/pp1`…`/pp10` (`.claude/commands/ppN.md`) — конвейер заданного уровня.
- `pp-orchestrator` (`.claude/agents/pp-orchestrator.md`) — плейбук, который исполняет основной чат на выбранном уровне.

Codex-эквиваленты — в `.codex/skills/chatium-workspace/references/workflows/`.

## Воркспейсы

**`s.chtm.khudoley.pro`** — dev/stage. Вся разработка: проекты под `p/units/`, `p/saas/`, dev-скрипты `scripts/` (проверка типов/стиля, `codex-utf8.ps1`), `node_modules`, `tsconfig.json`. Проверки кода (`vue-tsc`, `tsc`, `node scripts/...`) запускаются **из этого каталога**.

**`p.chtm.khudoley.pro`** — prod. Только цель публикации. **Напрямую не редактируется**: изменения делаются в `s`, переносятся через `/to-prod` / `/to-sync` (механические копии committed diff). Подробнее — `CLAUDE.md` §0.

## Поиск по документации (MCP `docs-search`)

Документация платформы `inner/docs/` проиндексирована гибридным поиском [obsidian-hybrid-search](https://github.com/flowing-abyss/obsidian-hybrid-search) (BM25 + семантические эмбеддинги + RRF, локальная модель `Xenova/multilingual-e5-small`, без внешних API). Это предпочтительный способ найти нужную тему по смыслу — лучше grep по ключевым словам.

- **Инструменты MCP:** `mcp__docs-search__search` (гибридный поиск, запрос естественным языком), `mcp__docs-search__read` (документ по vault-relative пути, напр. `003-auth.md`), `mcp__docs-search__status`, `mcp__docs-search__reindex`.
- **Где подключён:** Claude Code — `./.mcp.json` (project scope, включён в `.claude/settings.json` → `enabledMcpjsonServers`); Cursor — `./.cursor/mcp.json` (локальный, gitignored). Имя сервера — `docs-search`.
- **Где индекс:** `inner/docs/.obsidian-hybrid-search.db` (~7 МБ, gitignored + в `inner/docs/.syncignore`, регенерируется per-machine — как `.codegraph`). Сервер кладёт БД жёстко рядом с индексируемыми файлами (путь не настраивается), поэтому она внутри `inner/docs`, а не в отдельной папке у корня.
- **Активация:** после правки `.mcp.json` перезапусти Claude Code; в Cursor — Reload MCP. На старте сервер сам индексирует и поднимает watcher (правки доков подхватываются автоматически).
- **Ручной ребилд** (если индекс отстал или удалён). Флаг `--db` сервером игнорируется — путь БД задаётся только через vault:

  ```powershell
  $env:OBSIDIAN_VAULT_PATH = "$PWD\inner\docs"
  npx -y -p obsidian-hybrid-search@0.13.13 obsidian-hybrid-search reindex
  ```

## Git и синхронизация

- **Git** — общий репозиторий на уровне этого корня, охватывает оба воркспейса. Команды git выполняются из корня.
- **Публикация в Chatium** — через `chatium-sync-agent` (состояние в `configs/`); исключения публикации — `.syncignore` в каждом воркспейсе.

---
_Обновлено: 25-06-2026._
