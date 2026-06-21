@chatium

# Работа с файлами в Chatium

Исчерпывающее руководство по загрузке, хранению и использованию файлов в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Загрузка файлов с клиента](#загрузка-файлов-с-клиента)
  - [obtainStorageFilePutUrl - получение URL загрузки](#obtainstoragfileputurl---получение-url-загрузки)
  - [Загрузка изображений](#загрузка-изображений)
  - [Загрузка файлов](#загрузка-файлов)
- [Работа с изображениями](#работа-с-изображениями)
  - [getThumbnailUrl - получение thumbnail](#getthumbnailurl---получение-thumbnail)
  - [Адаптивные изображения](#адаптивные-изображения)
  - [Retina дисплеи](#retina-дисплеи)
- [Работа с видео](#работа-с-видео)
  - [getVideoInfo - информация о видео](#getvideoinfo---информация-о-видео)
  - [Встраивание видеоплеера](#встраивание-видеоплеера)
  - [Интеграция Kinescope](#интеграция-kinescope)
- [Типы файлов в Heap](#типы-файлов-в-heap)
  - [ImageFile - изображения](#imagefile---изображения)
  - [VideoFile - видео](#videofile---видео)
  - [AudioFile - аудио](#audiofile---аудио)
  - [File - файлы](#file---файлы)
- [Хранение файлов в таблицах](#хранение-файлов-в-таблицах)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Файловое хранилище Chatium** — система для загрузки, хранения и доступа к файлам. Полный справочник по API модуля `@app/storage` (все функции и типы по index.d.ts): [027-storage.md](027-storage.md).

### Ключевые понятия

- **Hash** — уникальный идентификатор файла в хранилище
- **obtainStorageFilePutUrl** — получение URL для загрузки
- **getThumbnailUrl** — получение URL thumbnail изображения
- **Storage File Types** — ImageFile, VideoFile, AudioFile, File

### Принципы работы

1. Клиент получает URL для загрузки
2. Загружает файл напрямую в хранилище
3. Получает hash файла
4. Сохраняет hash в таблице
5. Использует hash для доступа к файлу

---

## Загрузка файлов с клиента

### obtainStorageFilePutUrl - получение URL загрузки

```typescript
import { obtainStorageFilePutUrl } from '@app/storage'

const uploadUrl = await obtainStorageFilePutUrl(ctx)
```

### Загрузка изображений

```vue
<script setup>
import { ref } from 'vue'
import { obtainStorageFilePutUrl } from '@app/storage'

const uploading = ref(false)
const imageHash = ref(null)
const error = ref(null)

async function uploadImage(file) {
  uploading.value = true
  error.value = null

  try {
    // Получаем URL для загрузки
    const uploadUrl = await obtainStorageFilePutUrl(ctx)

    // Создаём FormData
    const formData = new FormData()
    formData.append('Filedata', file)

    // Загружаем файл
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Ошибка загрузки')
    }

    // Получаем hash файла
    const hash = await response.text()
    imageHash.value = hash

    ctx.account.log('Image uploaded', {
      level: 'info',
      json: {
        hash,
        fileName: file.name,
        fileSize: file.size
      }
    })

    return {
      hash,
      name: file.name,
      size: file.size,
      type: file.type
    }
  } catch (e) {
    error.value = e.message
    throw e
  } finally {
    uploading.value = false
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    uploadImage(file)
  }
}
</script>

<template>
  <div>
    <input type="file" @change="handleFileSelect" accept="image/*" :disabled="uploading" />

    <div v-if="uploading">Загрузка...</div>
    <div v-if="error">Ошибка: {{ error }}</div>
    <div v-if="imageHash">
      <img :src="getThumbnailUrl(imageHash, 300, 300)" alt="Uploaded" />
    </div>
  </div>
</template>
```

### Загрузка файлов

```vue
<script setup>
import { ref } from 'vue'
import { obtainStorageFilePutUrl } from '@app/storage'
import { apiSaveFileRoute } from '../api/files'

const files = ref([])

async function uploadFile(file) {
  const uploadUrl = await obtainStorageFilePutUrl(ctx)

  const formData = new FormData()
  formData.append('Filedata', file)

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const hash = await response.text()

  // Сохраняем в БД через API
  const result = await apiSaveFileRoute.run(ctx, {
    hash,
    name: file.name,
    size: file.size,
    type: file.type
  })

  files.value.push(result.file)
}

function handleMultipleFiles(event) {
  const fileList = event.target.files
  for (const file of fileList) {
    uploadFile(file)
  }
}
</script>

<template>
  <input type="file" @change="handleMultipleFiles" multiple />

  <div v-for="file in files" :key="file.hash">{{ file.name }} ({{ file.size }} bytes)</div>
</template>
```

---

## Работа с изображениями

### getThumbnailUrl - получение thumbnail

```typescript
import { getThumbnailUrl } from '@app/storage'

// С шириной и высотой
const url = getThumbnailUrl(imageHash, 300, 200) // 300x200

// Только ширина (высота пропорциональная)
const url = getThumbnailUrl(imageHash, 400, undefined)

// Только высота (ширина пропорциональная)
const url = getThumbnailUrl(imageHash, undefined, 300)
```

**В Vue компонентах**:

```vue
<script setup>
import { getThumbnailUrl } from '@app/storage'

const product = {
  imageHash: 'abc123...'
}
</script>

<template>
  <img :src="getThumbnailUrl(product.imageHash, 300, 300)" alt="Product" />
</template>
```

### Адаптивные изображения

```vue
<template>
  <!-- Мобильные -->
  <img v-if="isMobile" :src="getThumbnailUrl(imageHash, 400, undefined)" alt="Product" />

  <!-- Десктоп -->
  <img v-else :src="getThumbnailUrl(imageHash, 800, undefined)" alt="Product" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getThumbnailUrl } from '@app/storage'

const isMobile = ref(false)

onMounted(() => {
  isMobile.value = window.innerWidth < 768
})
</script>
```

### Retina дисплеи

Для Retina дисплеев используйте размер в 2 раза больше:

```vue
<template>
  <!-- Отображаем 200x200, но загружаем 400x400 -->
  <img
    :src="getThumbnailUrl(imageHash, 400, 400)"
    style="width: 200px; height: 200px;"
    alt="Product"
  />
</template>
```

---

## Работа с видео

### getVideoInfo - информация о видео

```typescript
import { getVideoInfo } from '@app/storage'

const videoInfo = await getVideoInfo(ctx, videoHash)

// Доступные свойства
videoInfo.hlsUrl // URL для HLS стриминга
videoInfo.mp4Url // URL MP4 файла
videoInfo.poster // URL постера (обложки)
```

**Использование в Vue**:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getVideoInfo } from "@app/storage"

const props = defineProps<{
  videoHash: string
}>()

const videoInfo = ref(null)

onMounted(async () => {
  videoInfo.value = await getVideoInfo(ctx, props.videoHash)
})
</script>

<template>
  <video v-if="videoInfo" :src="videoInfo.mp4Url" :poster="videoInfo.poster" controls />
</template>
```

### Встраивание видеоплеера

Полноценный пример видеоплеера с постером и информацией о видео.

**Серверная часть**:

```typescript
// pages/video.tsx
import { getVideoInfo, getThumbnailUrl } from "@app/storage"

export default app.html('/video/:id', async (ctx, req) => {
  const videoHash = req.params.id

  // Получаем информацию о видео
  const videoInfo = await getVideoInfo(ctx, videoHash)

  // Генерируем постер, если его нет
  let poster = videoInfo.poster
  if (!poster && videoHash) {
    poster = getThumbnailUrl(videoHash, 800, 450)
  }

  return (
    <html>
      <body>
        <VuePage
          videoInfo={videoInfo}
          poster={poster}
        />
      </body>
    </html>
  )
})
```

**Vue компонент**:

```vue
<template>
  <div class="video-player">
    <video
      v-if="props.videoInfo"
      :src="props.videoInfo.mp4Url"
      :poster="props.poster"
      controls
      playsinline
      class="video-element"
    >
      Ваш браузер не поддерживает видео.
    </video>

    <div v-if="props.videoInfo" class="video-info">
      <p>Разрешение: {{ videoWidth }} x {{ videoHeight }}</p>
      <p>Соотношение сторон: {{ aspectRatio }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps<{
  videoInfo: {
    hash: string
    hlsUrl: string
    mp4Url: string
    status: string
    progress: number
    imageUrl: string
    videoSize: {
      width: number
      height: number
    }
    videoAspectRatio: [number, number]
  }
  poster: string
}>()

const videoWidth = computed(() =>
  Math.round(props.videoInfo.videoSize.width / 1000)
)

const videoHeight = computed(() =>
  Math.round(props.videoInfo.videoSize.height / 1000)
)

const aspectRatio = computed(() =>
  `${props.videoInfo.videoAspectRatio[0]}:${props.videoInfo.videoAspectRatio[1]}`
)
</script>

<style scoped>
.video-player {
  max-width: 100%;
  margin: 0 auto;
}

.video-element {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.video-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
```

**Структура videoInfo**:

```typescript
type VideoInfo = {
  hash: string // Hash видео
  url: string // Устаревшее поле
  hlsUrl: string // URL для HLS стриминга
  mp4Url: string // URL MP4 файла
  status: 'done' | 'processing' // Статус обработки
  progress: number // Прогресс обработки (0-100)
  imageUrl: string // URL изображения-превью
  poster?: string // URL постера
  videoSize: {
    width: number // Ширина в микронах (делить на 1000)
    height: number // Высота в микронах (делить на 1000)
  }
  videoAspectRatio: [number, number] // Соотношение сторон [443, 960]
}
```

### Интеграция Kinescope

Для встраивания видео из Kinescope используйте iframe.

**Простая встройка**:

```vue
<template>
  <div class="kinescope-player">
    <div style="position: relative; padding-top: 56.25%; width: 100%">
      <iframe
        src="https://kinescope.io/embed/mtrgdfMo3EtAYTervjGNsL"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
        frameborder="0"
        allowfullscreen
        style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"
      />
    </div>
  </div>
</template>
```

**С динамическим ID видео**:

```vue
<template>
  <div class="kinescope-player">
    <div style="position: relative; padding-top: 56.25%; width: 100%">
      <iframe
        :src="`https://kinescope.io/embed/${props.kinescopeId}`"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
        frameborder="0"
        allowfullscreen
        style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps<{
  kinescopeId: string  // Например: 'mtrgdfMo3EtAYTervjGNsL'
}>()
</script>
```

**Адаптивная встройка с разными пропорциями**:

```vue
<template>
  <div class="kinescope-player">
    <div :style="containerStyle">
      <iframe
        :src="`https://kinescope.io/embed/${props.kinescopeId}`"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
        frameborder="0"
        allowfullscreen
        style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps<{
  kinescopeId: string
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16'
}>()

const aspectRatios = {
  '16:9': 56.25,   // (9/16) * 100
  '4:3': 75,       // (3/4) * 100
  '1:1': 100,      // (1/1) * 100
  '9:16': 177.78   // (16/9) * 100
}

const containerStyle = computed(() => ({
  position: 'relative',
  paddingTop: `${aspectRatios[props.aspectRatio || '16:9']}%`,
  width: '100%'
}))
</script>

<style scoped>
.kinescope-player {
  max-width: 100%;
  margin: 0 auto;
}
</style>
```

**Kinescope с дополнительными параметрами**:

```vue
<template>
  <div class="kinescope-player">
    <div style="position: relative; padding-top: 56.25%; width: 100%">
      <iframe
        :src="kinescopeUrl"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
        frameborder="0"
        allowfullscreen
        style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps<{
  kinescopeId: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  time?: number  // Начать с определённой секунды
}>()

const kinescopeUrl = computed(() => {
  const params = new URLSearchParams()

  if (props.autoplay) params.append('autoplay', '1')
  if (props.muted) params.append('muted', '1')
  if (props.loop) params.append('loop', '1')
  if (props.time) params.append('t', props.time.toString())

  const queryString = params.toString()
  const baseUrl = `https://kinescope.io/embed/${props.kinescopeId}`

  return queryString ? `${baseUrl}?${queryString}` : baseUrl
})
</script>
```

---

## Типы файлов в Heap

### ImageFile - изображения

```typescript
import { Heap } from '@app/heap'

export const Products = Heap.Table('products', {
  image: Heap.ImageFile({
    customMeta: { title: 'Изображение' }
  })
})
```

**Использование**:

```typescript
// Создание
await Products.create(ctx, {
  name: 'Product',
  image: imageHash // Hash от загруженного файла
})

// Получение и отображение
const product = await Products.findById(ctx, productId)
const imageUrl = getThumbnailUrl(product.image, 500, 500)
```

### VideoFile - видео

```typescript
export const Lessons = Heap.Table('lessons', {
  video: Heap.VideoFile({
    customMeta: { title: 'Видео урока' }
  })
})
```

### AudioFile - аудио

```typescript
export const Podcasts = Heap.Table('podcasts', {
  audio: Heap.AudioFile({
    customMeta: { title: 'Аудио' }
  })
})
```

### File - файлы

```typescript
export const Documents = Heap.Table('documents', {
  file: Heap.File({
    customMeta: { title: 'Файл' }
  })
})
```

---

## Хранение файлов в таблицах

### Полный пример с загрузкой

**Таблица**:

```typescript
// tables/gallery.table.ts
import { Heap } from '@app/heap'

export const Gallery = Heap.Table('gallery', {
  title: Heap.String({
    customMeta: { title: 'Название' }
  }),
  image: Heap.ImageFile({
    customMeta: { title: 'Изображение' }
  }),
  description: Heap.String({
    customMeta: { title: 'Описание' }
  })
})
```

**API роут**:

```typescript
// api/gallery.ts
// @shared-route
import Gallery from '../tables/gallery.table'

export const apiUploadImageRoute = app.post('/upload', async (ctx, req) => {
  const { hash, title, description } = req.body

  if (!hash) {
    return { success: false, error: 'Image hash is required' }
  }

  const image = await Gallery.create(ctx, {
    title,
    image: hash,
    description
  })

  return { success: true, image }
})

export const apiGetGalleryRoute = app.get('/list', async (ctx) => {
  const images = await Gallery.findAll(ctx, {
    order: [{ createdAt: 'desc' }],
    limit: 100
  })

  return { success: true, images }
})
```

**Vue компонент**:

```vue
<script setup>
import { ref } from 'vue'
import { obtainStorageFilePutUrl, getThumbnailUrl } from '@app/storage'
import { apiUploadImageRoute, apiGetGalleryRoute } from '../api/gallery'

const images = ref([])
const uploading = ref(false)

async function uploadImage(file, title, description) {
  uploading.value = true

  try {
    // 1. Получаем URL для загрузки
    const uploadUrl = await obtainStorageFilePutUrl(ctx)

    // 2. Загружаем файл
    const formData = new FormData()
    formData.append('Filedata', file)

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error('Upload failed')
    }

    const hash = await uploadResponse.text()

    // 3. Сохраняем в БД
    const result = await apiUploadImageRoute.run(ctx, {
      hash,
      title,
      description
    })

    if (result.success) {
      images.value.unshift(result.image)
    }
  } catch (error) {
    // Обработка ошибки
  } finally {
    uploading.value = false
  }
}

async function loadGallery() {
  const result = await apiGetGalleryRoute.run(ctx)
  if (result.success) {
    images.value = result.images
  }
}

onMounted(() => {
  loadGallery()
})
</script>

<template>
  <div class="gallery">
    <div v-for="image in images" :key="image.id">
      <img :src="getThumbnailUrl(image.image, 300, 300)" :alt="image.title" />
      <h3>{{ image.title }}</h3>
      <p>{{ image.description }}</p>
    </div>
  </div>
</template>
```

---

## Серверный API для работы с файлами (ctx.storage)

**ВАЖНО:** Это альтернативный API для работы с файлами на стороне сервера. Используется в примерах, но не является основным рекомендуемым подходом.

### Обзор ctx.storage API

`ctx.storage` предоставляет набор методов для работы с файлами напрямую из серверного кода. Этот API удобен для прямой загрузки и обработки файлов на сервере.

### Доступные методы

#### ctx.storage.uploadFile()

Загружает файл в хранилище из серверного кода.

```typescript
// Загрузка файла из запроса
export const uploadRoute = app.post('/files/upload', async (ctx, req) => {
  const file = req.files?.file

  if (!file) {
    return { success: false, error: 'Файл не найден' }
  }

  const uploadResult = await ctx.storage.uploadFile({
    name: file.name,
    type: file.type,
    data: file.data
  })

  return {
    success: true,
    fileId: uploadResult.fileId,
    url: uploadResult.url
  }
})
```

#### ctx.storage.getFileInfo()

Получает информацию о файле по его ID.

```typescript
export const getFileInfoRoute = app.get('/files/:fileId/info', async (ctx, req) => {
  const { fileId } = req.params

  const fileInfo = await ctx.storage.getFileInfo(fileId)

  if (!fileInfo) {
    return { success: false, error: 'Файл не найден' }
  }

  return {
    success: true,
    file: {
      name: fileInfo.name,
      type: fileInfo.type,
      size: fileInfo.size,
      url: fileInfo.url
    }
  }
})
```

#### ctx.storage.getFileStream()

Получает поток данных файла для скачивания или обработки.

```typescript
export const downloadRoute = app.get('/files/:fileId/download', async (ctx, req) => {
  const { fileId } = req.params

  const fileStream = await ctx.storage.getFileStream(fileId)
  const fileInfo = await ctx.storage.getFileInfo(fileId)

  ctx.resp.setHeader('Content-Type', fileInfo.type)
  ctx.resp.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`)

  return ctx.resp.send(fileStream)
})
```

#### ctx.storage.deleteFile()

Удаляет файл из хранилища.

```typescript
export const deleteRoute = app.delete('/files/:fileId', async (ctx, req) => {
  const { fileId } = req.params

  await ctx.storage.deleteFile(fileId)

  return {
    success: true,
    message: 'Файл успешно удален'
  }
})
```

#### ctx.storage.listFiles()

Получает список файлов с пагинацией.

```typescript
export const listRoute = app.get('/files', async (ctx, req) => {
  const { limit = 50, offset = 0, type } = req.query

  const files = await ctx.storage.listFiles({
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    filter: type ? { type } : {}
  })

  return {
    success: true,
    files,
    pagination: {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      hasMore: files.length === parseInt(limit as string)
    }
  }
})
```

#### ctx.storage.createThumbnail()

Создает thumbnail изображения с заданными параметрами.

```typescript
export const createThumbnailRoute = app.post('/files/:fileId/thumbnail', async (ctx, req) => {
  const { fileId } = req.params
  const { width, height, quality = 80 } = req.body

  const thumbnail = await ctx.storage.createThumbnail(fileId, parseInt(width), parseInt(height), {
    quality: parseInt(quality)
  })

  return {
    success: true,
    thumbnail: {
      url: thumbnail.url,
      width: thumbnail.width,
      height: thumbnail.height
    }
  }
})
```

### Когда использовать ctx.storage API

✅ **Используйте ctx.storage когда:**

- Нужна прямая загрузка файлов из серверного кода
- Обрабатываете файлы из внешних источников (API, webhooks)
- Требуется серверная обработка файлов перед сохранением
- Нужен полный контроль над процессом загрузки

❌ **Не используйте ctx.storage когда:**

- Загружаете файлы с клиента (используйте `obtainStorageFilePutUrl`)
- Просто отображаете изображения (используйте `getThumbnailUrl`)
- Работаете с hash файлов в таблицах (используйте ImageFile, VideoFile)

### Пример: Полный CRUD для файлов

```typescript
// Загрузка
export const uploadRoute = app.post('/files/upload', async (ctx, req) => {
  const file = req.files?.file
  if (!file) return { success: false, error: 'Файл не найден' }

  const result = await ctx.storage.uploadFile({
    name: file.name,
    type: file.type,
    data: file.data
  })

  return { success: true, fileId: result.fileId }
})

// Получение информации
export const infoRoute = app.get('/files/:fileId', async (ctx, req) => {
  const fileInfo = await ctx.storage.getFileInfo(req.params.fileId)
  return { success: true, file: fileInfo }
})

// Скачивание
export const downloadRoute = app.get('/files/:fileId/download', async (ctx, req) => {
  const stream = await ctx.storage.getFileStream(req.params.fileId)
  const info = await ctx.storage.getFileInfo(req.params.fileId)

  ctx.resp.setHeader('Content-Disposition', `attachment; filename="${info.name}"`)
  return ctx.resp.send(stream)
})

// Удаление
export const deleteRoute = app.delete('/files/:fileId', async (ctx, req) => {
  await ctx.storage.deleteFile(req.params.fileId)
  return { success: true }
})
```

### Обработка ошибок

```typescript
export const safeUploadRoute = app.post('/upload', async (ctx, req) => {
  try {
    const file = req.files?.file

    if (!file) {
      return { success: false, error: 'Файл не найден' }
    }

    // Валидация типа
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Недопустимый тип файла' }
    }

    // Валидация размера (макс 10 МБ)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'Размер файла превышает 10 МБ' }
    }

    const result = await ctx.storage.uploadFile({
      name: file.name,
      type: file.type,
      data: file.data
    })

    return { success: true, fileId: result.fileId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка загрузки'
    }
  }
})
```

### Примечание

**Документация API:** `ctx.storage` API используется в примерах кода, но основная рекомендация — использовать `obtainStorageFilePutUrl()` для клиентской загрузки и `getThumbnailUrl()` для работы с изображениями.

**Примеры использования:** См. `examples/integrations/files/index.tsx` в проекте templates.

---

## Лучшие практики

### Загрузка

✅ **Проверяйте тип файла**:

```vue
<script setup>
function handleFileSelect(event) {
  const file = event.target.files[0]

  if (!file.type.startsWith('image/')) {
    error.value = 'Только изображения разрешены'
    return
  }

  uploadImage(file)
}
</script>

<template>
  <input type="file" @change="handleFileSelect" accept="image/*" />
</template>
```

✅ **Проверяйте размер**:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

if (file.size > MAX_FILE_SIZE) {
  return { success: false, error: 'Файл слишком большой' }
}
```

✅ **Показывайте прогресс**:

```vue
<div v-if="uploading">
  <div class="spinner"></div>
  <p>Загрузка...</p>
</div>
```

### Изображения

✅ **Используйте правильные размеры**:

```typescript
// Для карточек товаров
getThumbnailUrl(hash, 300, 300)

// Для превью
getThumbnailUrl(hash, 150, 150)

// Для полноэкранного просмотра
getThumbnailUrl(hash, 1200, undefined)
```

✅ **Учитывайте Retina**:

```typescript
// Отображаем 200x200, загружаем 400x400
getThumbnailUrl(hash, 400, 400)
```

✅ **Добавляйте alt текст**:

```vue
<img :src="getThumbnailUrl(hash, 300, 300)" :alt="product.title" />
```

### Безопасность

✅ **Валидируйте hash перед использованием**:

```typescript
if (!hash || typeof hash !== 'string' || hash.length === 0) {
  return { success: false, error: 'Invalid hash' }
}
```

✅ **Проверяйте права доступа**:

```typescript
import { requireRealUser } from '@app/auth'

export const uploadRoute = app.post('/upload', async (ctx, req) => {
  requireRealUser(ctx) // Только авторизованные могут загружать

  // Загрузка файла
})
```

---

## Связанные документы

- **008-heap.md** — Хранение файлов в таблицах
- **007-vue.md** — Загрузка файлов в Vue компонентах
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.1  
**Дата**: 2025-11-08  
**Последнее обновление**: Добавлена документация ctx.storage API для серверной работы с файлами
