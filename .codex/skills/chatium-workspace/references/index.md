# Chatium Workspace References

Codex adapter index for roles and workflows migrated from `.claude`. The stage `.claude` files are the historical source; files referenced here are synchronized Codex wrappers or format conversions.

## Workspace Layout

- `s.chtm.khudoley.pro` - stage/dev workspace. Implement, test, document, and commit project changes there.
- `p.chtm.khudoley.pro` - prod workspace. Do not edit it directly.
- Promotion to prod is allowed only by explicit user request via `/to-prod`, `/to-sync`, or equivalent wording, and must use the mechanical `to-prod` copy/delete workflow.
- `s.chtm.khudoley.pro/p/` is a stage project directory, not the prod workspace.

## Roles

- `chatium-platform-checker` -> `references/roles/chatium-platform-checker.md` - Выделенный гейт соответствия платформе Chatium по документации inner/docs. Сопоставляет задачу с релевантными темами (по навигатору 000-summ.md), читает их и проверяет глубокое соответствие платформенным API и паттернам — то, что узкие checker'ы (стандарты/роутинг/рантайм) не покрывают. Работает в двух режимах: mode=plan (проверяет план) и mode=code (проверяет реализацию).
- `code-reviewer` -> `references/roles/code-reviewer.md` - Проводит детальное ревью написанного кода Chatium-проекта по 10+1 обязательным областям (требования, план, ошибки, типы, безопасность, edge cases, API, архитектура, Chatium-специфика, стандарты, покрытие логами). Область 11 (логирование) проверяется всегда на pp3–4; на pp5+ её покрывает отдельный logging-coverage-checker — при наличии его отчёта в контексте можно пропустить область 11. Использовать ПОСЛЕ реализации, ДО запуска проверок (verification-runner).
- `completeness-reviewer` -> `references/roles/completeness-reviewer.md` - Мета-ревьюер, проверяющий ПОЛНОТУ охвата ревью (плана или кода). Использовать ПОСЛЕ plan-reviewer или code-reviewer. Не оценивает качество выводов — только то, что все обязательные области рассмотрены или явно отмечены как «не применимо».
- `discussion-architect` -> `references/roles/discussion-architect.md` - Режим обсуждения задачи ДО реализации — опытный архитектор-собеседник, помогает уточнить формулировку, границы, риски. Использовать когда пользователь хочет «обсудить идею», «подумать вместе», «как лучше сформулировать», ДО запуска конвейера /ppN. Не пишет код, не планирует, не запускает конвейер.
- `docs-keeper` -> `references/roles/docs-keeper.md` - Обновляет документацию Chatium-проекта (README.md, .CHATIUM-LLM.md, docs/architecture.md, docs/api.md, docs/data.md) после изменений кода. Использовать после реализации, как часть финализации задачи. Не дублирует код в документации — пишет «общую картину» с ссылками на файлы.
- `file-based-routing-checker` -> `references/roles/file-based-routing-checker.md` - Проверяет соблюдение file-based роутинга Chatium — путь "/" в роут-файле, ссылки на не-"/" роуты через withProjectRoot/route.url() с тильдой. Использовать после изменений в файлах api/, pages/, config/routes.tsx или ссылках на роуты. По умолчанию проверяет файлы из git diff; принимает явный список от вызывающего агента.
- `implementer` -> `references/roles/implementer.md` - Пишет код Chatium-проекта строго по утверждённому плану-контракту. Использовать на шаге реализации конвейера ПОСЛЕ одобрения плана. Не расширяет scope, не переосмысляет архитектуру, не задаёт вопросов пользователю — реализует то, что в плане. Возвращает список изменённых файлов и отклонения от плана.
- `logging-coverage-checker` -> `references/roles/logging-coverage-checker.md` - Аудит покрытия логами всех веток управляющего потока в изменённых серверных файлах (lib/, api/, webhook/). Проверяет наличие лога в каждой ветке if/else/catch/switch с бизнес-смыслом и соответствие severity-шкале. Использовать как часть fan-out верификации pp5+. Принимает явный список файлов от оркестратора.
- `llm-conversation-logger` -> `references/roles/llm-conversation-logger.md` - Ведёт полный лог переписки пользователя и Codex в `docs/LLM/` проекта без фрагментов кода. Пишет только при наличии полной истории текущего чата; если контекст неполный, не создаёт частичный лог.
- `plan-reviewer` -> `references/roles/plan-reviewer.md` - Ревьюит план реализации Chatium-задачи по документации платформы и стандартам проекта. Использовать ПОСЛЕ planner и ДО реализации. Возвращает структурированный отчёт с приоритизированными замечаниями и явным вердиктом «можно реализовывать / нужны правки».
- `planner` -> `references/roles/planner.md` - Строит детальный пошаговый план реализации задачи на платформе Chatium. Использовать ПОСЛЕ формализации (task-formalizer), ДО написания кода. Анализирует структуру проекта, определяет затронутые файлы, фиксирует риски. Не пишет код.
- `pp-orchestrator` -> `references/roles/pp-orchestrator.md` - Плейбук масштабируемого конвейера разработки Chatium-задачи с уровнем глубины 1–10. ИСПОЛНЯЕТСЯ ОСНОВНЫМ ЧАТОМ по командам /pp1…/pp10 — это НЕ субагент, через Agent tool его запускать нельзя. Уровень определяет модели, число шагов, параллелизм и бюджет цикла правок: pp1 — минимум шагов и слабые модели (быстро/дёшево), pp10 — тяжёлые модели и максимальная автономная проработка.
- `runtime-architecture-checker` -> `references/roles/runtime-architecture-checker.md` - Ищет рантайм-баги и архитектурные проблемы в свежем коде Chatium — null/undefined, race conditions, необработанные ошибки async, утечки прав, несогласованность данных, нарушения слоёв. Использовать после написания нового кода. По умолчанию проверяет файлы из git diff; принимает явный список от вызывающего агента.
- `standards-checker` -> `references/roles/standards-checker.md` - Проверяет соответствие изменённого кода Chatium-стандартам из inner/docs/001-standards.md (форматирование, структура файлов, JSX, TypeScript, Tailwind, FontAwesome, импорты, типичные ошибки Chatium). Использовать после написания/изменения кода. По умолчанию проверяет файлы из git diff; принимает явный список файлов от вызывающего агента.
- `task-formalizer` -> `references/roles/task-formalizer.md` - Превращает сырой запрос пользователя в формальную постановку с критериями приёмки. Использовать ПЕРВЫМ шагом любого конвейера разработки, ДО планирования или реализации. Возвращает либо готовую формализацию, либо 2–4 уточняющих вопроса при пробелах в постановке.
- `verification-runner` -> `references/roles/verification-runner.md` - Плейбук технических проверок Chatium — строгая проверка типов (vue-tsc), стиль (Prettier), стандарты, роутинг, рантайм, соответствие платформе, тесты. Собирает результаты в единый отчёт. ИСПОЛНЯЕТСЯ ОСНОВНЫМ ЧАТОМ (по /check или как фаза верификации в конвейере /ppN) — это НЕ субагент, его нельзя запускать через Agent tool. Checker'ов порождает напрямую основной чат.
- `pipeline-orchestrator` -> `references/roles/pipeline-orchestrator.md` - backward-compatible alias for `pp-orchestrator`.

## Workflows / Slash Commands

- Platform rules and migrated Cursor topic skills -> `.codex/skills/chatium-platform/SKILL.md` - предметные Chatium references по routing/auth/Vue/Heap/jobs/request/sender/analytics/payments/testing/AI tools/docs/shared imports с проверкой по `inner/docs` и CodeGraph.
- Cursor `run-verification` utility skill -> `references/workflows/run-verification.md` - Codex workflow для сводной проверки изменений: локальные команды, checker references, `inner/docs`, CodeGraph, тестовые сценарии.
- Cursor `final-report` utility skill -> `references/workflows/final-report.md` - шаблон финального отчёта по задаче: что сделано, что проверено, что осталось открытым.
- `/check` -> `references/workflows/check.md` - Технические проверки Chatium — строгая проверка типов (vue-tsc), стиль (Prettier), стандарты, роутинг, рантайм, тесты. Фрагмент или весь workspace.
- `/commit` -> `.agents/skills/auto-commit/SKILL.md` - Разбивает текущие изменения на отдельные логические коммиты с русскими названиями в стиле репозитория (async Haiku-субагенты), коммитит, обновляет CodeGraph индекс и пушит.
- `/to-sync` -> `.agents/skills/auto-commit/SKILL.md` then `.agents/skills/to-prod/SKILL.md` - Полная цепочка доставки: коммитит изменения в dev, переносит committed diff из `s.chtm.khudoley.pro` в `p.chtm.khudoley.pro`, затем синхронизирует prod через `chatium-sync-agent`.
- `/to-prod` -> `.agents/skills/to-prod/SKILL.md` - Переносит выбранный committed diff из dev-workspace `s.chtm.khudoley.pro` в prod-workspace `p.chtm.khudoley.pro` механическим копированием и синхронизирует prod через `chatium-sync-agent`.
- `/pipeline` -> `references/workflows/pipeline.md` - Авто-конвейер. Квалифицирует задачу, сам выбирает уровень глубины 1–10 и передаёт управление плейбуку pp-orchestrator на этом уровне. Для случая «не хочу выбирать /ppN сам».
- `/pp1` ... `/pp10` -> `.agents/skills/source-command-ppN/SKILL.md` - pipeline levels from `.claude/commands/ppN.md`.
- `/pp` -> `references/workflows/pp.md` - Codex workflow based on `.claude/agents/pp-orchestrator.md`; use `/pipeline` for automatic level selection or `/ppN` for a concrete level.

## Vendor Mapping

- Claude `Read/Grep/Glob/Bash/Edit/Write` -> Codex shell execution, `rg`, shell file reads, and `apply_patch` for manual edits.
- Claude `Agent` / `subagent_type` -> Codex subagents only when the user explicitly asks for delegation/parallel agents or invokes a delegated workflow (`/pipeline`, `/pp`, `/ppN`).
- Claude `tools`, `model`, `allowed-tools`, `argument-hint` are historical source metadata, not executable Codex config.
- Claude `settings.json` allowlist is not migrated; Codex follows the current session sandbox/approval instructions.
