---
description: Конвейер уровня 9 — максимальный. Опциональный архитектор-обсуждение, план на Opus + полный гейт + completeness, fan-out верификации на Opus с adversarial-проходом критичных находок, loop-until-clean, документация, метрики. Для крупных/рискованных задач.
allowed-tools: Agent, Read, Edit, Write, Glob, Grep, Bash, TodoWrite
---

# /pp9 — максимальный конвейер (уровень 9)

Прими роль оркестратора и веди задачу по плейбуку `.claude/agents/pp-orchestrator.md` с **N=9**.

Профиль: (опц.) `discussion-architect` (Opus) для скоупинга → `task-formalizer` (Sonnet, +Q) → `planner` (Opus) → полный гейт плана [`plan-reviewer` (Opus) + `chatium-platform-checker` mode=plan (Opus)] + `completeness-reviewer` → `implementer` (Sonnet; Opus если отмечен блокер) → fan-out верификации (Opus) + `completeness-reviewer` + **adversarial 2-й проход** по подтверждённым критичным находкам (скептик отсекает ложные) + Bash типы/стиль/тесты → **loop-until-clean** (правки → повтор верификации, пока находки не исчерпаны или бюджет) → `docs-keeper` (Sonnet) → полный отчёт + метрики.

Текст после `/pp9` — задача. Если пусто — возьми из контекста чата. Вопросы формализатора передай дословно и остановись.
