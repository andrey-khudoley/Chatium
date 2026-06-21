# chatium-ugc

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-ugc/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/032-ugc.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-ugc
description: Модуль @app/ugc в Chatium — UGC-файлы, findUgcFile, updateUgcFileSource, права на файлы. Использовать для работы с кодом приложения и правами доступа.
---

# chatium-ugc

Работа с файловой структурой UGC (код приложения в рантайме) и правами доступа к файлам. Модуль `@app/ugc`.

## Когда использовать

- Поиск и обновление файлов кода приложения по пути/id
- Создание директорий, удаление файлов и папок
- Управление правами доступа к UGC-файлам

## Файлы UGC

- **findUgcFile(ctx, path)** / **findUgcFileById(ctx, id)** — найти файл.
- **updateUgcFileSource(ctx, path, source)** — обновить исходный код.
- **updateUgcFile** / **updateUgcFilesMulti** — обновление метаданных/нескольких файлов.
- **listUgcFiles(ctx, options)** — список файлов.
- **ensureUgcDirectory(ctx, path)** — создать директорию при необходимости.
- **deleteUgcFile(ctx, path)** / **deleteUgcDirectoryRecursive(ctx, path)** — удаление.

## Права на файлы

- **listUgcFilePermissions(ctx, path)** — список прав.
- **hasUgcFilePermission(ctx, path, permission)** — проверка права.
- **createOrUpdateUgcFilePermission** — выдать/обновить право.
- **deleteUgcFilePermission** — удалить право.

## Чеклист

- [ ] Импорт из @app/ugc
- [ ] Проверка прав перед изменением файлов (hasUgcFilePermission и т.п.)
- [ ] Типы: UgcFile, UgcFilePermission — в index.d.ts

## Ссылки на документацию

- **032-ugc.md** — @app/ugc, файлы и права
- **019-feed.md**, **025-inbox.md**, **010-agents.md** — UGC-контекст
