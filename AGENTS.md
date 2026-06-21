# AGENTS.md — Chatium Shared Root

Инструкции для Codex в общем корне, который охватывает два Chatium workspace:
stage `s.chtm.khudoley.pro` и prod `p.chtm.khudoley.pro`.

## Codex Skill

Для задач Chatium в этих workspace используй skill:

- `.codex/skills/chatium-workspace/SKILL.md`

Он содержит адаптированные роли и workflow из `.claude/agents` и `.claude/commands`.

Для предметных правил платформы Chatium и бывших Cursor rules/skills используй:

- `.codex/skills/chatium-platform/SKILL.md`

Он содержит `references/rules.md`, индекс предметных тем `references/topic-index.md`, адаптированные `chatium-*` references и LLM logger.

Если пользователь пишет `/check`, `/pipeline`, `/pp`, воспринимай это как обычный запрос Codex и открой соответствующий reference из `.codex/skills/chatium-workspace/references/workflows/`.
Если пользователь пишет `/to-prod` или просит цепочку `auto-commit; to-prod; chatium-sync/chaium-sync`, используй `.agents/skills/to-prod/SKILL.md`.
Если пользователь пишет `/to-sync`, используй цепочку `.agents/skills/auto-commit/SKILL.md`, затем `.agents/skills/to-prod/SKILL.md`.
Если задача затрагивает конкретную подсистему Chatium (Heap, routing, Vue, auth, jobs, request, sender, analytics, payments, testing, AI tools и т.п.), открой `chatium-platform` и сверяйся с соответствующим `inner/docs/...` и CodeGraph.

## Workspaces

- `s.chtm.khudoley.pro` - stage/dev workspace. Прямые изменения кода, документации проектов, тесты и проверки выполняются здесь (git — в общем корне).
- `p.chtm.khudoley.pro` - prod workspace. Это цель публикации/синхронизации, а не место для ручной разработки.
- Напрямую в `p.chtm.khudoley.pro` не работаем. Если задача просит изменить prod, сначала делай изменение в `s.chtm.khudoley.pro`; перенос в `p.chtm.khudoley.pro` выполняй только при явном указании пользователя через `to-prod`/`to-sync` или эквивалентную явную команду.
- Если пользователь просит "поменять в p/проде" без явного разрешения на прямую правку, трактуй это как изменение в `s.chtm.khudoley.pro` с последующим вопросом/ожиданием явного разрешения на перенос.
- В `p.chtm.khudoley.pro` допускаются только механические копирования/удаления из выбранного diff/commit в `s.chtm.khudoley.pro` в рамках `to-prod`; ручные `apply_patch`/редактирование файлов prod запрещены.
- Внутри `s.chtm.khudoley.pro` есть проектный каталог `p/` с приложениями (`p/units/`, `p/saas/` и т.д.). Это часть stage workspace, не prod workspace.

## Инварианты Chatium

- `ctx` и `app` глобальные, не импортировать.
- Логирование: `ctx.account.log()`, не `console.log()`.
- File-based routing: один файл = один роут; предпочтительный путь `'/'`.
- Ссылки на роуты: `withProjectRoot(route.url())` или `withProjectRootAndSubroute(base, '/sub')`, без хардкода URL.
- Heap и таблицы только на сервере. В Vue не импортировать `tables/`, `repos/`, `lib/`; в Vue допустим только `shared/*` с `// @shared`.
- Подсчёт Heap: `countBy`, не `findAll().length`.
- Фильтры Heap: `where`, не `filter`.
- Money: `.add()`, `.subtract()`, `.multiply()`, не обычная арифметика.
- Race conditions: `runWithExclusiveLock`.
- Защищённые эндпоинты: `requireRealUser(ctx)` или `requireAccountRole(ctx, 'admin')` первой строкой обработчика.
- `// @ts-ignore` допустим только для системных модулей Chatium без локальных типов.
- Документация платформы: `inner/docs/`, навигатор `inner/docs/000-summ.md`.
- Предметные Codex references по платформе: `.codex/skills/chatium-platform/references/topic-index.md`.

## Codex Tooling

- CodeGraph проинициализирован в общем корне (`.codegraph/`). Для задач на понимание кода, архитектуры, поиска символов, связей вызовов (`callers`/`callees`) и impact analysis сначала используй MCP CodeGraph (`codegraph_explore`, `codegraph_search`, `codegraph_status`, `codegraph_impact`), а `rg` — для простого текстового поиска или проверки конкретных деталей.
- Если CodeGraph сообщает, что проект не проинициализирован, индекс устарел или недоступен, обнови его из общего корня: `codegraph init -i`, затем проверь `codegraph status`.
- Для поиска используй `rg` и `rg --files`.
- Для shell-команд используй `exec_command`.
- Для ручных правок используй `apply_patch`.
- В Windows PowerShell не читай русские/UTF-8 файлы plain `Get-Content`: используй `Get-Content -Encoding UTF8`, `Select-String -Encoding UTF8`, либо сначала подключай `. .\s.chtm.khudoley.pro\scripts\codex-utf8.ps1`.
- Делегирование через `spawn_agent` используй только когда пользователь явно просит subagents, делегирование или параллельных агентов. `/pipeline` и `/pp` считаются такими явными workflow; обычные ревью, проверки и планирование выполняй локально, если пользователь не попросил делегировать.
- Не переноси Claude `tools`, `model`, `allowed-tools`, `subagent_type` буквально: это metadata другого вендора.

## UTF-8 / Encoding-Sensitive Files

Основная кодировка текстовых файлов в workspace - UTF-8.

Windows PowerShell 5.1 может показывать UTF-8 без BOM как mojibake при plain `Get-Content`.
Если видишь `Р...`, `СЃ...`, `вЂ”` и похожие артефакты:

- Сначала перечитай файл через `Get-Content -Encoding UTF8` или подключи `. .\s.chtm.khudoley.pro\scripts\codex-utf8.ps1`.
- Не считай файл испорченным только по выводу plain `Get-Content`.
- Для `Select-String` по русскому тексту используй `-Encoding UTF8`.
- Для записи через PowerShell используй явный `-Encoding UTF8`.

Some legacy files in this workspace may still contain or display real mojibake. When editing them,
prefer ASCII anchors, selectors, function names, line numbers, and very small `apply_patch` hunks.
Do not use broad Cyrillic/garbled comment blocks as required patch context. If a patch fails
unexpectedly, inspect exact numbered lines and retry with narrower ASCII-only context. Do not
rewrite or normalize whole-file encoding unless the user explicitly asks.

## Дата и время

Если в отчёте, changelog, LLM-логе или имени файла нужна текущая дата/время, получай её через shell:

```bash
date "+%d-%m-%Y %H:%M:%S %Z"
date "+%Y-%m-%d"
date "+%y%m%d"
```

## Документация После Изменений

При изменениях в коде проекта-приложения (каталог с `index.tsx` / `index.ts` и собственным `docs/`) проверь необходимость обновить:

- `README.md`
- `.CHATIUM-LLM.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/data.md`
- `docs/LLM/`

Для больших изменений используй reference `docs-keeper` из skill-а.

Документация обычно не нужна для изменений в общих библиотеках, `shared/`, инфраструктуре, `.cursor/`, `.claude/`, `.codex/`, gateway.

## Project Roots

- Корень проекта - каталог с `index.tsx` / `index.ts`, не общий корень и не обязательно корень `s.chtm.khudoley.pro`.
- В stage несколько проектов под `s.chtm.khudoley.pro/p/units/`, `s.chtm.khudoley.pro/p/saas/`.
- Git — общий репозиторий в корне (`chatium.chatium-sync`), охватывает оба воркспейса (`s` и `p`). Команды git выполняй из корня; проверки кода (`scripts/`, `vue-tsc`) — из `s.chtm.khudoley.pro`.

## Стиль Ответа

- Русский язык.
- Кратко и по делу.
- Без вводных вроде «Конечно» и без эмодзи в обычных сообщениях.
- Если задача является формализацией, планированием, ревью или обсуждением, не пиши код без явного запроса.
