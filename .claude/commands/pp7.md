---
description: Конвейер уровня 7 — глубокий. План на Opus, ревью плана + платформенный гейт, реализация (Sonnet), полный fan-out верификации (Opus + checker'ы), fix ≤3, документация, метрики. Для сложной фичи с платформенными тонкостями.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp7 — глубокий конвейер (уровень 7)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=7**.

Профиль: `task-formalizer` (Sonnet, +Q) → `planner` (Opus) → [`plan-reviewer` (Sonnet) + `chatium-platform-checker` mode=plan (Sonnet)] → `implementer` (Sonnet) → fan-out: [`code-reviewer` (Opus) + `chatium-platform-checker` mode=code (Opus) + `standards-checker` (Haiku) + `file-based-routing-checker` (Haiku) + `runtime-architecture-checker` (Opus)] + Bash типы/стиль/тесты → fix ≤3 → `docs-keeper` (Sonnet) → полный отчёт + метрики.

Текст после `/pp7` — задача. Если пусто — возьми из контекста чата. Вопросы формализатора передай дословно и остановись.
