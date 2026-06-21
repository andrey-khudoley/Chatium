@chatium

# Модуль @app/storage: Файловое хранилище

Справочник по API модуля `@app/storage` для загрузки файлов, получения URL (в т.ч. превью и скачивания) и работы с типами файлов. Документ опирается на `node_modules/@app/storage/index.d.ts`. Общая тема «файлы и загрузка» в приложении: [009-files.md](009-files.md).

## Содержание

- [Назначение](#назначение)
- [Загрузка файлов](#загрузка-файлов)
  - [obtainStorageFilePutUrl](#obtainstoragefileputurl)
  - [createUploadPutUrl](#createuploadputurl)
  - [getUploadGetPutUrl](#getuploadgetputurl)
- [Загрузка по URL](#загрузка-по-url)
- [Частичная загрузка (chunked)](#частичная-загрузка-chunked)
- [Превью и скачивание](#превью-и-скачивание)
  - [getThumbnailUrl](#getthumbnailurl)
  - [getDownloadUrl / getOriginalUrl](#getdownloadurl--getoriginalurl)
  - [Shared-URL для защищённых файлов](#shared-url-для-защищённых-файлов)
- [Типы и метаданные файлов](#типы-и-метаданные-файлов)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/storage** — доступ к файловому хранилищу Chatium: получение URL для загрузки (put), загрузка по внешнему URL, превью (thumbnail), скачивание, типы файлов (image/video/audio), частичная загрузка и пересылка файлов на внешний URL.

---

## Загрузка файлов

### obtainStorageFilePutUrl

Универсальный способ получить URL для загрузки файла. Работает и в браузере, и на сервере; в браузере обычно используется getPutUrl из окружения или опция `getPutUrl`/`filePutUrl`. На бэкенде предпочтительно использовать `createUploadPutUrl`.

```ts
import { obtainStorageFilePutUrl } from '@app/storage'

const putUrl = await obtainStorageFilePutUrl(ctx, { protected: true })
// отправить PUT/POST с телом файла на putUrl
```

**Опции:** `protected`, `expiresInSeconds`, на клиенте — `getPutUrl`, `filePutUrl`.

### createUploadPutUrl

Возвращает прямой URL в файловое хранилище для загрузки. Только для бэкенда. По умолчанию URL действует 10 минут (`expiresInSeconds`).

```ts
import { createUploadPutUrl } from '@app/storage'

const putUrl = await createUploadPutUrl(ctx, { protected: false })
```

### getUploadGetPutUrl

Возвращает URL, который можно использовать как get_put_url для компонентов загрузки: по запросу на этот URL выдаётся прямой upload URL. Подходит для авторизации текущего пользователя/сессии на загрузку от имени аккаунта.

```ts
import { getUploadGetPutUrl } from '@app/storage'

const getPutUrl = getUploadGetPutUrl(ctx, { protected: false, expiresInSeconds: 3600 })
```

---

## Загрузка по URL

- **getFetchAuthUrl(ctx, fetchUrl, options?)** — возвращает URL авторизации для загрузки файла с указанного URL (редирект на короткоживущий URL хранилища).
- **createFetchUrl(ctx, fetchUrl, options?)** — прямой URL для загрузки с fetchUrl в хранилище (бэкенд).
- **fetchUrlToStorage(ctx, fetchUrl, options?)** — скачивает файл по URL и загружает в хранилище, возвращает hash.

---

## Частичная загрузка (chunked)

Для больших файлов: создать частичную загрузку, дописывать чанки, завершить и получить итоговый hash.

- **startPartialStorageFileUpload(ctx, fileName, options?)** — создаёт частичную загрузку, возвращает `partialUploadHash`.
- **appendToPartialStorageFile(ctx, partialUploadHash, dataChunk)** — дописать чанк.
- **finalizePartialStorageFileUpload(ctx, partialUploadHash)** — завершить и получить постоянный hash.

Либо через URL (бэкенд): **createPartialUploadUrl**, **createPartialAppendUrl**, **createPartialPublishUrl**.

---

## Превью и скачивание

### getThumbnailUrl

URL превью изображения/видео с опциональными шириной и высотой.

```ts
import { getThumbnailUrl } from '@app/storage'

const thumbUrl = getThumbnailUrl(ctx, hash, 200, 200)
```

### getDownloadUrl / getOriginalUrl

- **getDownloadUrl(ctx, hash)** — URL оригинала с заголовками «сохранить как» (оригинальное имя).
- **getOriginalUrl(ctx, hash)** — URL оригинала для отображения в браузере (изображения, PDF и т.д.).

### Shared-URL для защищённых файлов

Для защищённых файлов (private) — короткоживущие shared-URL:

- **createSharedThumbnailUrl(ctx, hash, options?)**
- **createSharedDownloadUrl(ctx, hash, options?)**
- **createSharedOriginalUrl(ctx, hash, options?)**

В опциях: `width`, `height`, `expiresInSeconds`, `allowNonProtected`.

---

## Типы и метаданные файлов

- **getFileTypeFromHash(hash)** — `'file' | 'video' | 'image' | 'audio'`.
- **getSizesFromHash(hash)** — `{ width, height }` или undefined.
- **getDurationFromHash(hash)** — длительность (видео/аудио).
- **StorageFile**, **StorageImageFile**, **StorageVideoFile**, **StorageAudioFile** — классы типов.
- **isImageFile(file)**, **isVideoFile(file)**, **isAudioFile(file)** — type guards.
- **createStorageFileFromHash(hash)** — создать объект StorageFile по hash.
- **getVideoInfo(ctx, hash)** / **getAudioInfo(ctx, hash)** — метаданные видео/аудио (статус обработки, длительность и т.д.).
- **getImageSrcFromHash(ctx, hash)** — URL изображения для отображения.

---

## Связанные документы

- [009-files.md](009-files.md) — работа с файлами в приложении (загрузка в UI, Kinescope и т.д.)
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/storage/index.d.ts`
