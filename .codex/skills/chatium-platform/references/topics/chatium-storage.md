# chatium-storage

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-storage/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/027-storage.md; inner/docs/009-files.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-storage
description: Файлы и хранилище в Chatium — obtainStorageFilePutUrl, getThumbnailUrl, загрузка с клиента, типы ImageFile/VideoFile. Использовать при загрузке и отображении файлов.
---

# chatium-storage

Работа с файловым хранилищем Chatium: получение URL для загрузки, загрузка с клиента, превью и скачивание. Модуль `@app/storage`. Использовать при загрузке изображений/файлов и хранении hash в таблицах.

## Когда использовать

- Загрузка файлов с клиента (форма, drag-n-drop)
- Получение URL превью (thumbnail) для изображений и видео
- Хранение hash файла в Heap-таблицах (ImageFile, VideoFile, AudioFile, File)
- Загрузка файла по внешнему URL (fetchUrlToStorage)

## Загрузка с клиента

1. Сервер: получить URL через `obtainStorageFilePutUrl(ctx)` (или `createUploadPutUrl` на бэкенде).
2. Клиент: отправить PUT/POST с телом файла на этот URL.
3. Ответ — hash файла (строка); сохранить в таблице.

```ts
import { obtainStorageFilePutUrl } from '@app/storage'

const uploadUrl = await obtainStorageFilePutUrl(ctx)
// клиент: fetch(uploadUrl, { method: 'POST', body: formData }) → response.text() = hash
```

## Превью и URL

- **getThumbnailUrl(ctx, hash, width?, height?)** — URL превью изображения/видео.
- **getDownloadUrl**, **getOriginalUrl** — URL для скачивания.
- В Heap использовать типы: ImageFile, VideoFile, AudioFile, File (поле с hash).

## Паттерны

- В таблицах хранить hash; URL получать при отдаче клиенту через getThumbnailUrl/getDownloadUrl.
- Загрузка: obtainStorageFilePutUrl на сервере → fetch на клиенте с FormData (Filedata) → сохранить hash.
- Логирование через ctx.account.log().

## Чеклист

- [ ] Импорт из @app/storage (obtainStorageFilePutUrl, getThumbnailUrl и др.)
- [ ] Загрузка: выдача URL клиенту, приём hash после загрузки
- [ ] Сохранение hash в Heap (тип ImageFile/VideoFile/File при необходимости)
- [ ] Превью через getThumbnailUrl при отображении

## Ссылки на документацию

- **009-files.md** — работа с файлами, загрузка с клиента, типы в Heap
- **027-storage.md** — API @app/storage (obtainStorageFilePutUrl, createUploadPutUrl, getThumbnailUrl, fetchUrlToStorage и др.)
