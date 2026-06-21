---
description: Конвейер уровня 5 — стандарт+. Формализация (Haiku, с вопросами при пробелах), план (Sonnet) + ревью плана (Sonnet), реализация (Sonnet), ревью кода (Sonnet) + стандарты/роутинг (Haiku), fix ≤2, метрики. Для фичи со связями.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp5 — стандарт+ (уровень 5)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=5**.

Профиль: `task-formalizer` (Haiku, может задать вопросы при пробелах) → `planner` (Sonnet) → `plan-reviewer` (Sonnet) → `implementer` (Sonnet) → `code-reviewer` (Sonnet) + `standards-checker` (Haiku) + `file-based-routing-checker` (Haiku) параллельно + Bash типы/стиль → fix ≤2 → `docs-keeper` (Sonnet, условно) → отчёт + метрики.

Текст после `/pp5` — задача. Если пусто — возьми из контекста чата. Если формализатор задал вопросы — передай их пользователю дословно и остановись.
