---
description: Полная цепочка доставки: auto-commit, перенос diff из d/ в p/ через to-prod, затем публикация через chatium-sync-agent.
argument-hint: '[опц.: подсказка для auto-commit или commit/range для to-prod]'
allowed-tools: Skill, Bash(git:*), Bash(node:*), Bash(powershell:*), Read, Glob, Grep
---

# /to-sync

Выполни полную цепочку доставки:

1. Вызови навык **`auto-commit`** для текущих незакоммиченных изменений воркспейса.
2. Затем вызови навык **`to-prod`**:
   - если `auto-commit` создал commit — используй его как источник переноса;
   - если незакоммиченных изменений не было — используй `HEAD`, если пользователь не передал другой commit/range.
3. `to-prod` обязан механически перенести выбранный committed diff из `d/`-копии проекта в прод-каталог `p/` того же воркспейса (трансформации: `config/routes.tsx` + сегмент id в `tables/*.table.ts`) и опубликовать через `chatium-sync-agent`.

Текст после команды — `$ARGUMENTS`. Используй его как подсказку для `auto-commit`; если он выглядит как явный commit/range, передай его в `to-prod`.

Не редактируй файлы прод-копий (`p/<проект>` с парой окружений) вручную.
