---
description: Переносит выбранный committed diff из dev-копии проекта (каталог d/) в прод-каталог p/ того же воркспейса s.chtm.khudoley.pro и публикует через chatium-sync-agent.
argument-hint: '[commit|range|пусто = HEAD; опционально: --all-pending-prod]'
allowed-tools: Skill, Bash(git:*), Bash(node:*), Bash(powershell:*), Read, Glob, Grep
---

# /to-prod

Вызови навык **`to-prod`** и передай ему `$ARGUMENTS`.

Если аргументов нет, источник переноса — `HEAD`.

Прод и dev — один воркспейс `s.chtm.khudoley.pro` (один аккаунт): dev-копии живут в `d/`, прод — в `p/`. Не редактируй файлы прод-копий (`p/<проект>` с парой окружений) вручную. Перенос — механическая копия выбранного committed diff `d/<путь>` → `p/<путь>` с двумя детерминированными трансформациями: `config/routes.tsx` (`PROJECT_ROOT`; `DOMAIN` не меняется — домен один) и `tables/*.table.ts` (сегмент id `__stage_`→`__prod_` — id объявляется ровно в одном файле аккаунта, `008-heap.md`). Затем dry-run и публикация через `chatium-sync-agent` воркспейса.
