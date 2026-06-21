---
name: chatium-ugc
description: Модуль @app/ugc — UGC-файлы, findUgcFile, updateUgcFileSource, права на файлы. Использовать для работы с кодом приложения и правами доступа.
---

# chatium-ugc

Работа с файловой структурой UGC (код приложения в рантайме) и правами доступа к файлам. Модуль `@app/ugc`.

## Когда использовать

- Поиск и обновление файлов кода приложения по пути/id
- Создание директорий, удаление файлов и папок
- Управление правами доступа к UGC-файлам

## Файлы UGC

- **findUgcFile(ctx, path)** / **findUgcFile(ctx, path, options)** — найти файл по пути.
- **findUgcFileById(ctx, id)** — найти файл по id.
- **updateUgcFileSource(ctx, path, source)** — обновить исходный код файла.
- **updateUgcFile** / **updateUgcFilesMulti** — обновление метаданных/нескольких файлов.
- **listUgcFiles(ctx, options)** — список файлов.
- **ensureUgcDirectory(ctx, path)** — создать директорию при необходимости.
- **deleteUgcFile(ctx, path)** — удалить файл.
- **deleteUgcDirectoryRecursive(ctx, path)** — удалить директорию рекурсивно.

Типы: **UgcFile** (UgcUgcFileFull), **UgcFileListItem** (UgcUgcFileListItem).

## Права на файлы

- **listUgcFilePermissions(ctx, path)** — список прав на файл.
- **hasUgcFilePermission(ctx, path, permission)** — проверка права.
- **createOrUpdateUgcFilePermission** — выдать/обновить право.
- **deleteUgcFilePermission** — удалить право.

Тип **UgcFilePermission** (UgcUgcFilePermission).

## Чеклист

- [ ] Импорт из @app/ugc
- [ ] Проверка прав перед изменением файлов (hasUgcFilePermission и т.п.)
- [ ] Типы: UgcFile, UgcFilePermission — в node_modules/@app/ugc/index.d.ts

## Ссылки на документацию

- **032-ugc.md** — @app/ugc, файлы и права
- **019-feed.md** — фиды в UGC контексте
- **025-inbox.md** — инбокс в UGC контексте
- **010-agents.md** — агенты в UGC контексте
- **025-app-modules.md** — сводка по всем модулям @app
