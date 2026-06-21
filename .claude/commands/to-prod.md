---
description: Переносит выбранный committed diff из dev-workspace s.chtm.khudoley.pro в prod-workspace p.chtm.khudoley.pro и синхронизирует prod через chatium-sync-agent.
argument-hint: '[commit|range|пусто = HEAD; опционально: --all-pending-prod]'
allowed-tools: Skill, Bash(git:*), Bash(node:*), Bash(powershell:*), Read, Glob, Grep
---

# /to-prod

Вызови навык **`to-prod`** и передай ему `$ARGUMENTS`.

Если аргументов нет, источник переноса — `HEAD`.

Не редактируй файлы в `p.chtm.khudoley.pro` вручную. Все изменения в prod должны быть механической копией выбранного committed diff из `s.chtm.khudoley.pro`, затем проверены dry-run и опубликованы через `chatium-sync-agent`.
