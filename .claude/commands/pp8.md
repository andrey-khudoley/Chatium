---
description: Конвейер уровня 8 — глубокий с гейтами. План на Opus + полный гейт ревью плана на Opus + completeness, реализация (Sonnet), полный fan-out верификации на Opus + completeness кода, fix ≤3, документация, метрики.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp8 — глубокий с гейтами (уровень 8)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=8**.

Профиль: `task-formalizer` (Sonnet, +Q) → `planner` (Opus) → [`plan-reviewer` (Opus) + `chatium-platform-checker` mode=plan (Opus)] → `completeness-reviewer` (Haiku, план) → `implementer` (Sonnet) → fan-out: [`code-reviewer` (Opus) + `chatium-platform-checker` mode=code (Opus) + `standards-checker` (Haiku) + `file-based-routing-checker` (Haiku) + `runtime-architecture-checker` (Opus)] + Bash типы/стиль/тесты → `completeness-reviewer` (Haiku, код) → fix ≤3 → `docs-keeper` (Sonnet) → полный отчёт + метрики.

Текст после `/pp8` — задача. Если пусто — возьми из контекста чата. Вопросы формализатора передай дословно и остановись.
