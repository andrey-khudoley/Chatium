import PostsTable from '../tables/posts.table'
import BlogSettingsTable from '../tables/blogsettings.table'
import { editPostPageRoute } from '../editPost'
import { calculateReadingTime } from '../shared/readingTime'
import { sendDataToSocket } from '@app/socket'
import { CompletionCompletedBody, CompletionFailedBody, startCompletion } from '@start/sdk'
import { validateCaller } from '@pay/sdk'
import { requireAccountRole } from '@app/auth'

export interface BlogPostDto {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImage?: string
  published: boolean
  publishedAt?: string
  tags: string
  createdAt: string
  readingTime: number
  updatedAt: string
}

// @shared-route
export const apiBlogPostsListRoute = app.get('/list', async (ctx, req) => {
  const posts = await PostsTable.findAll(ctx, {
    where: { published: true },
    order: [{ publishedAt: 'desc' }],
    limit: 50
  })

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    tags: post.tags,
    createdAt: post.createdAt,
    readingTime: post.readingTime
  }))
})

// @shared-route
export const apiBlogPostBySlugRoute = app.get('/post/:slug', async (ctx, req) => {
  const [post] = await PostsTable.findAll(ctx, {
    where: {
      slug: req.params.slug,
      published: true
    },
    limit: 1
  })

  if (!post) {
    return { error: 'Пост не найден' }
  }

  return post
})

// @shared-route
export const apiBlogAllPostsRoute = app.get('/all', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const posts = await PostsTable.findAll(ctx, {
    order: [{ createdAt: 'desc' }],
    limit: 100
  })

  return posts
})

// @shared-route
export const apiBlogGetPostByIdRoute = app.get('/post-by-id/:id', async (ctx, req) => {
  const [post] = await PostsTable.findAll(ctx, {
    where: { id: req.params.id },
    limit: 1
  })

  if (!post) {
    return { error: 'Пост не найден' }
  }

  return post
})

// @shared-route
export const apiBlogCreatePostRoute = app.post('/create', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const readingTime = calculateReadingTime(req.body.content)
  const post = await PostsTable.create(ctx, {
    title: req.body.title,
    slug: req.body.slug,
    content: req.body.content,
    excerpt: req.body.excerpt,
    coverImage: req.body.coverImage,
    published: req.body.published || false,
    publishedAt: req.body.published ? new Date().toISOString() : null,
    tags: req.body.tags || '',
    readingTime: readingTime
  })

  return post
})

// @shared-route
export const apiBlogUpdatePostRoute = app.post('/update/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const readingTime = calculateReadingTime(req.body.content)
  const updateData: any = {
    id: req.params.id,
    title: req.body.title,
    slug: req.body.slug,
    content: req.body.content,
    excerpt: req.body.excerpt,
    coverImage: req.body.coverImage,
    published: req.body.published,
    tags: req.body.tags || '',
    readingTime: readingTime
  }

  // Если пост публикуется впервые, установить дату публикации
  if (req.body.published && !req.body.wasPublished) {
    updateData.publishedAt = new Date().toISOString()
  }

  const post = await PostsTable.update(ctx, updateData)
  return post
})

// @shared-route
export const apiBlogDeletePostRoute = app.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await PostsTable.delete(ctx, req.params.id)
  return { success: true }
})

// @shared-route
export const apiBlogGetSettingsRoute = app.get('/settings', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const [systemPromptSetting] = await BlogSettingsTable.findAll(ctx, {
    where: { key: 'systemPrompt' },
    limit: 1
  })

  return {
    systemPrompt: systemPromptSetting?.value || getDefaultSystemPrompt()
  }
})

// @shared-route
export const apiBlogSaveSettingsRoute = app.post('/settings', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const { systemPrompt } = req.body

  const [existingSetting] = await BlogSettingsTable.findAll(ctx, {
    where: { key: 'systemPrompt' },
    limit: 1
  })

  if (existingSetting) {
    await BlogSettingsTable.update(ctx, {
      id: existingSetting.id,
      value: systemPrompt
    })
  } else {
    await BlogSettingsTable.create(ctx, {
      key: 'systemPrompt',
      value: systemPrompt,
      description: 'Системный промпт для генерации постов с помощью ИИ'
    })
  }

  return { success: true }
})

// @shared-route
export const apiBlogGeneratePostRoute = app.post('/generate', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const { topic } = req.body

  if (!topic || topic.trim() === '') {
    return { error: 'Тема поста обязательна' }
  }

  // Получаем системный промпт из настроек
  const [systemPromptSetting] = await BlogSettingsTable.findAll(ctx, {
    where: { key: 'systemPrompt' },
    limit: 1
  })
  const systemPrompt = systemPromptSetting?.value || getDefaultSystemPrompt()

  // Создаем черновик поста для отслеживания генерации
  const draftPost = await PostsTable.create(ctx, {
    title: `Генерирую пост: ${topic}`,
    slug: `generating-${Date.now()}`,
    content: 'Идет генерация контента...',
    excerpt: 'Пост генерируется с помощью ИИ',
    published: false,
    tags: '',
    readingTime: 0
  })

  // Отправляем начальный статус через websocket
  const socketId = `post-edit-${draftPost.id}`
  await sendDataToSocket(ctx, socketId, {
    type: 'generation-status',
    generating: true,
    message: 'Генерирую пост с помощью ИИ...',
    postId: draftPost.id
  })

  // Запускаем генерацию с ИИ
  await startCompletion(ctx, {
    onCompletionCompleted: onPostGenerationCompleted,
    onCompletionFailed: onPostGenerationFailed,
    system: systemPrompt,
    model: 'openai/gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Напиши статью для блога на тему: "${topic}"`
          }
        ]
      }
    ],
    context: {
      postId: draftPost.id,
      topic
    }
  })

  return {
    postId: draftPost.id,
    message: 'Генерация поста запущена',
    redirectUrl: editPostPageRoute({ id: draftPost.id }).url()
  }
})

function getDefaultSystemPrompt() {
  return `Пиши ясно, как хороший писатель. Не включай заголовок в контент страницы. Используй минимум разметки: максимум заголовки h3 (###), выделение жирным (**текст**) и курсивом (*текст*). Не используй другие заголовки (h1, h2, h4-h6) и сложную разметку. В конце статьи добавь строку "ТЕГИ:" и перечисли максимум 2-3 релевантных тега через запятую.`
}

const onPostGenerationCompleted = app
  .function('/onPostGenerationCompleted')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error(`Invalid caller`)
    }

    const { postId, topic } = body.context ?? {}

    const messageTexts: string[] = []
    const latestMessage = body.messages[body.messages.length - 1]!
    for (const block of latestMessage.content) {
      if (block.type == 'text') {
        messageTexts.push(block.text)
      }
    }

    const generatedContent = messageTexts.join('\n')

    // Парсим сгенерированный контент
    const lines = generatedContent.split('\n')
    const title =
      lines.find((line) => line.startsWith('# '))?.replace('# ', '') || `Пост на тему: ${topic}`

    // Извлекаем теги из конца текста
    const tagsLine = lines.find((line) => line.startsWith('ТЕГИ:'))
    const tags = tagsLine ? tagsLine.replace('ТЕГИ:', '').trim() : 'блог, разработка'

    // Создаем slug из заголовка
    const slug = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 100)

    // Первый абзац как краткое описание
    const excerpt =
      lines
        .find((line) => line.trim() && !line.startsWith('#') && !line.startsWith('ТЕГИ:'))
        ?.substring(0, 200) + '...' || ''

    // Убираем строку с тегами из основного контента
    const cleanContent = generatedContent.replace(/ТЕГИ:.*$/gm, '').trim()

    const readingTime = calculateReadingTime(cleanContent)

    // Обновляем пост с сгенерированным контентом
    await PostsTable.update(ctx, {
      id: postId,
      title,
      slug,
      content: cleanContent,
      excerpt,
      tags,
      readingTime
    })

    // Отправляем обновление через websocket
    const socketId = `post-edit-${postId}`
    const updatedPost = await PostsTable.findAll(ctx, { where: { id: postId }, limit: 1 })
    await sendDataToSocket(ctx, socketId, {
      type: 'generation-status',
      generating: false,
      message: 'Пост успешно сгенерирован!',
      post: updatedPost[0]
    })

    return null
  })

const onPostGenerationFailed = app
  .function('/onPostGenerationFailed')
  .body(CompletionFailedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error(`Invalid caller`)
    }

    const { postId } = body.context ?? {}

    // Отправляем ошибку через websocket
    const socketId = `post-edit-${postId}`
    await sendDataToSocket(ctx, socketId, {
      type: 'generation-status',
      generating: false,
      message: `Ошибка генерации: ${body.error}`
    })

    // Обновляем пост с информацией об ошибке
    await PostsTable.update(ctx, {
      id: postId,
      title: 'Ошибка генерации поста',
      content: `Произошла ошибка при генерации поста: ${body.error}`,
      excerpt: 'Ошибка генерации'
    })

    return null
  })
