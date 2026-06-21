---
description: Конвейер уровня 6 — тщательный. Формализация (Sonnet), план + ревью плана с платформенным гейтом (Sonnet), реализация (Sonnet), полное ревью кода + checker'ы + платформа (code), fix ≤2, документация, метрики.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp6 — тщательный конвейер (уровень 6)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=6**.

Профиль: `task-formalizer` (Sonnet, +Q) → `planner` (Sonnet) → [`plan-reviewer` (Sonnet) + `chatium-platform-checker` mode=plan (Sonnet)] параллельно → `implementer` (Sonnet) → [`code-reviewer` (Sonnet) + `standards-checker` (Haiku) + `file-based-routing-checker` (Haiku) + `chatium-platform-checker` mode=code (Sonnet)] параллельно + Bash типы/стиль/тесты → fix ≤2 → `docs-keeper` (Sonnet) → полный отчёт + метрики.

Текст после `/pp6` — задача. Если пусто — возьми из контекста чата. Вопросы формализатора передай дословно и остановись.
