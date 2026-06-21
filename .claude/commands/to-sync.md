---
description: Полная цепочка доставки: auto-commit в dev, перенос diff из s в p через to-prod, затем Chatium sync/publish prod.
argument-hint: '[опц.: подсказка для auto-commit или commit/range для to-prod]'
allowed-tools: Skill, Bash(git:*), Bash(node:*), Bash(powershell:*), Read, Glob, Grep
---

# /to-sync

Выполни полную цепочку доставки:

1. Вызови навык **`auto-commit`** для текущих незакоммиченных изменений в `s.chtm.khudoley.pro`.
2. Затем вызови навык **`to-prod`**:
   - если `auto-commit` создал commit — используй его как источник переноса;
   - если незакоммиченных изменений не было — используй `HEAD`, если пользователь не передал другой commit/range.
3. `to-prod` обязан механически перенести выбранный committed diff из `s` в `p` и выполнить prod sync/publish через `chatium-sync-agent`.

Текст после команды — `$ARGUMENTS`. Используй его как подсказку для `auto-commit`; если он выглядит как явный commit/range, передай его в `to-prod`.

Не редактируй файлы в `p.chtm.khudoley.pro` вручную.
