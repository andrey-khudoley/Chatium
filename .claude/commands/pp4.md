---
description: Конвейер уровня 4 — стандарт. Планировщик (Sonnet), реализация implementer (Sonnet), консолидированное ревью кода (Sonnet), типы/стиль, fix ≤2, условная документация. Для обычной фичи.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp4 — стандартный конвейер (уровень 4)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=4**.

Профиль: acceptance inline → `planner` (Sonnet) → `implementer` (Sonnet) → `code-reviewer` (Sonnet, диф-скоуп, консолидированный) + Bash типы/стиль → fix ≤2 → `docs-keeper` (Haiku, если затронуты API/таблицы/роуты/арх) → отчёт + блоки «## Метрики цикла» и «## Лимиты подписки» (токены/лимиты/время — на всех уровнях). Вопросов не задавай.

Текст после `/pp4` — задача. Если пусто — возьми из контекста чата.
