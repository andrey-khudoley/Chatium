---
description: Технические проверки Chatium — строгая проверка типов (vue-tsc), стиль (Prettier), стандарты, роутинг, рантайм, тесты. Фрагмент или весь workspace.
argument-hint: '[пути через пробел | --all для всего workspace | пусто = текущие изменения]'
---

# /check

Запусти технические проверки по плейбуку `verification-runner`. **Этот чат сам исполняет плейбук** — типы/стиль/тесты прогоняет через Bash, а checker'ов порождает напрямую через Agent.

> **Почему не через субагента.** `verification-runner` сам порождает checker'ов через Agent, а субагент вложенных субагентов порождать не может. Поэтому плейбук исполняет основной чат (он порождать субагентов вправе).

## Что произойдёт

По плейбуку `verification-runner` основной чат выполнит:

1. **Строгая проверка типов** — `node scripts/check-types.mjs` (vue-tsc + конфиг, наследующий корневой `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess`, реальные глобальные типы Chatium; облегчённые локальные шимы проектов исключаются, `.vue` проверяются).
2. **Стиль** — `node scripts/check-style.mjs` (Prettier по `.prettierrc`).
3. **Параллельный fan-out checker'ов** (Agent, одним сообщением):
   - `standards-checker` (по 001-standards.md, haiku);
   - `file-based-routing-checker` (роутинг и ссылки, haiku);
   - `runtime-architecture-checker` (рантайм-баги и архитектура, opus);
   - `chatium-platform-checker` mode=code (соответствие подсистемам по `inner/docs/`, opus).
4. **Тесты** — определит способ запуска (страница `./web/tests`, `api/tests/endpoints-check`, `*.test.ts`) или отметит «не применимо».
5. **Сводный отчёт** с приоритизированными проблемами.

## Режимы

- **Текущие изменения** (по умолчанию, без аргументов): проверяются файлы из `git diff` + untracked.
- **Фрагмент(ы):** `/check p/saas/gw/gc` или `/check p/a/index.tsx p/b` — проверяются указанные пути/проекты.
- **Весь workspace:** `/check --all` (также `всё` / `workspace`) — типы и стиль прогоняются по всему репозиторию, sub-checker'ам передаётся полный охват.

## Инструкция запуска

1. Прочитай плейбук `.claude/agents/verification-runner.md` через Read.
2. **Исполни его сам в этом чате** (не вызывай `Agent` с `subagent_type: verification-runner` — это вложенный субагент, checker'ы не запустятся).
3. Аргументы режима — `$ARGUMENTS`:
   - пусто → определи затронутые файлы сам (`git diff --name-only` + untracked), режим «фрагмент»;
   - `--all` / `всё` / `workspace` → режим «весь workspace»;
   - иначе → переданные пути как фрагменты.
4. Типы/стиль/тесты прогоняй сам через Bash; `standards-checker`, `file-based-routing-checker`, `runtime-architecture-checker`, `chatium-platform-checker`(code) порождай через Agent параллельно одним сообщением. Контекст задачи (acceptance criteria, план — если обсуждались) передай checker'ам.

## Когда использовать

- Перед коммитом, когда пользователь сказал «готово?», «можно коммитить?», «всё ок?».
- В рамках конвейера `/ppN` (фаза верификации).
- Для быстрой проверки текущего состояния без формализации/планирования.
