# chatium.chatium-sync — общий корень

Рабочий корень Chatium-воркспейса. Делится на два слоя:

- **Общий корень (этот каталог)** — git, агентский тулинг, платформенные доки, архив, состояние синка.
- **Воркспейс** `s.chtm.khudoley.pro` (один аккаунт Chatium) — собственно код проектов; окружения разделяются каталогами `d/` (dev/stage) и `p/` (prod).

Правила для ассистентов: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex).

## Структура корня

```
chatium.chatium-sync/
├─ CLAUDE.md             # инструкции Claude Code (наследуются субагентами)
├─ AGENTS.md             # инструкции Codex
├─ README.md             # этот файл — карта расположения
├─ .gitignore            # общий
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
└─ s.chtm.khudoley.pro/  # единственный workspace: d/ — dev/stage-копии, p/ — prod
```

## Оркестрация конвейера (pp)

- `/pipeline` (`.claude/commands/pipeline.md`) — авто-селектор: квалифицирует задачу и выбирает уровень 1–10.
- `/pp1`…`/pp10` (`.claude/commands/ppN.md`) — конвейер заданного уровня.
- `pp-orchestrator` (`.claude/agents/pp-orchestrator.md`) — плейбук, который исполняет основной чат на выбранном уровне.

Codex-эквиваленты — в `.codex/skills/chatium-workspace/references/workflows/`.

## Воркспейсы

**`s.chtm.khudoley.pro`** — единственный воркспейс (один аккаунт Chatium). Вся разработка здесь: dev/stage-копии проектов в `d/`, боевые проекты в `p/` (`p/units/`, `p/saas/`, `p/system/`, `p/gateways/`), dev-скрипты `scripts/` (проверка типов/стиля, `codex-utf8.ps1`), `node_modules`, `tsconfig.json`. Проверки кода (`vue-tsc`, `tsc`, `node scripts/...`) запускаются **из этого каталога**.

**Каталог `p/` — прод.** У проектов с парой окружений напрямую не редактируется: изменения в `d/`-копии, перенос — `/to-prod` / `/to-sync` (механическая копия committed diff `d/→p/` с двумя трансформациями: `config/routes.tsx` и сегмент id `__stage_`→`__prod_` в `tables/*.table.ts` — `inner/docs/006-arch.md`/`008-heap.md`). Подробнее — `CLAUDE.md` §0.

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

## Поиск по коду и примерам (MCP `codegraph`)

Сверка с документацией — не единственный обязательный шаг. При написании и правке кода **обязательно сверяйся с реальными примерами в кодовой базе через MCP `codegraph`**: как уже реализованы аналогичные роуты, хэндлеры, работа с heap, интеграции — и повторяй существующие идиомы, а не изобретай свои. `codegraph` — это SQLite-граф всех символов, связей и файлов обоих воркспейсов; одна `codegraph_explore` возвращает исходники релевантных символов, сгруппированные по файлам, поэтому это надёжнее и дешевле, чем grep + слепое чтение (десятки чтений против одного-двух вызовов).

- **Инструменты MCP:** `mcp__codegraph__codegraph_explore` (основной — вопрос естественным языком или список символов/файлов → verbatim-исходники по файлам; чаще всего единственный нужный вызов), `codegraph_search` (местоположение символа по имени), `codegraph_callers` / `codegraph_callees` (кто вызывает / что вызывает), `codegraph_impact` (что сломается при изменении символа), `codegraph_files` / `codegraph_node` / `codegraph_status`.
- **Когда:** ПЕРЕД написанием/правкой кода — найти существующий образец и повторить паттерн; ПОСЛЕ — проверить вызывающих через `codegraph_impact`. На архитектурные вопросы («как работает X», «где определён Y», «путь от X к Y») отвечай напрямую одной `codegraph_explore` — не делегируй поиск в субагент и не гоняй свой grep+read цикл, это дублирует уже построенный индекс.
- **Где подключён:** `./.mcp.json` (сервер `codegraph`, команда `codegraph serve --mcp`). Индекс — локальный `.codegraph/` у корня (gitignored, регенерируется per-machine, как индекс `docs-search`), обновляется watcher'ом с лагом ~1 с после записи файлов.
- **Graceful fallback:** `codegraph` — оптимизация, а не жёсткая зависимость. Если сервер недоступен, вернул пусто/нерелевантно или индекс отстал — **не падай**, ищи через `rg`/Grep/Read (та же логика, что и для `docs-search`).

Оба MCP — `docs-search` (что говорит платформа) и `codegraph` (как это уже сделано в коде) — используются вместе: доки для правил и API, codegraph для живых примеров.

## Git и синхронизация

- **Git** — общий репозиторий на уровне этого корня, охватывает оба воркспейса. Команды git выполняются из корня.
- **Публикация в Chatium** — через `chatium-sync-agent` (состояние в `configs/`); исключения публикации — `.syncignore` в каждом воркспейсе.

---
_Обновлено: 01-07-2026._
