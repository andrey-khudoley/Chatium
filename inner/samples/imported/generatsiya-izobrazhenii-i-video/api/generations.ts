import Generations from '../tables/generations.table'
import { requireRealUser } from '@app/auth'
import { startCompletion, CompletionCompletedBody, CompletionFailedBody } from '@start/sdk'

// @shared-route
export const apiGenerateImageRoute = app
  .body((s) => ({
    prompt: s.string(),
    model: s.string(),
    mode: s.string(),
    uploadedImageHash: s.string().optional()
  }))
  .post('/generate-image', async (ctx, req) => {
    const user = await requireRealUser(ctx)

    const generation = await Generations.create(ctx, {
      userId: user.id,
      type: 'image',
      mode: req.body.mode,
      model: req.body.model,
      prompt: req.body.prompt,
      uploadedImageHash: req.body.uploadedImageHash || '',
      status: 'processing'
    })

    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: req.body.prompt + '\nВ ответе пришли только ссылку на изображение'
          }
        ]
      }
    ]

    if (req.body.mode === 'image-to-image' && req.body.uploadedImageHash) {
      messages[0].content.push({
        type: 'image',
        source: {
          type: 'url',
          url: `https://fs.cdn-chatium.io/get/${req.body.uploadedImageHash}`
        }
      })
    }

    await startCompletion(ctx, {
      model: req.body.model,
      messages,
      context: {
        generationId: generation.id
      },
      onCompletionCompleted: onImageGenerationCompleted,
      onCompletionFailed: onGenerationFailed
    })

    return { success: true, generationId: generation.id }
  })

// @shared-route
export const apiGenerateVideoRoute = app
  .body((s) => ({
    prompt: s.string(),
    model: s.string(),
    mode: s.string(),
    uploadedImageHash: s.string().optional()
  }))
  .post('/generate-video', async (ctx, req) => {
    const user = await requireRealUser(ctx)

    const generation = await Generations.create(ctx, {
      userId: user.id,
      type: 'video',
      mode: req.body.mode,
      model: req.body.model,
      prompt: req.body.prompt,
      uploadedImageHash: req.body.uploadedImageHash || '',
      status: 'processing'
    })

    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              req.body.mode === 'image-to-video'
                ? 'Анимируй приложенное изображение по промту:\n' +
                  req.body.prompt +
                  '\nВ ответе пришли только ссылку на сгенерированное видео.'
                : req.body.prompt + '\nВ ответе пришли только ссылку на сгенерированное видео.'
          }
        ]
      }
    ]

    if (req.body.mode === 'image-to-video' && req.body.uploadedImageHash) {
      messages[0].content.push({
        type: 'image',
        source: {
          type: 'url',
          url: `https://fs.cdn-chatium.io/get/${req.body.uploadedImageHash}`
        }
      })
    }

    await startCompletion(ctx, {
      model: 'openai/gpt-4.1-mini',
      system: 'You are a video generation assistant',
      messages,
      nativeTools: [{ name: 'generate-video', model: req.body.model }],
      context: {
        generationId: generation.id
      },
      onCompletionCompleted: onVideoGenerationCompleted,
      onCompletionFailed: onGenerationFailed
    })

    return { success: true, generationId: generation.id }
  })

// @shared-route
export const apiGetGenerationsRoute = app.get('/generations', async (ctx) => {
  const user = await requireRealUser(ctx)

  const generations = await Generations.findAll(ctx, {
    where: { userId: user.id },
    order: [{ createdAt: 'desc' }],
    limit: 100
  })

  return generations
})

// @shared-route
export const apiUploadImageRoute = app
  .body((s) => ({
    imageHash: s.string()
  }))
  .post('/upload-image', async (ctx, req) => {
    const user = await requireRealUser(ctx)

    const generation = await Generations.create(ctx, {
      userId: user.id,
      type: 'upload',
      uploadedImageHash: req.body.imageHash,
      status: 'completed'
    })

    return { success: true, generationId: generation.id }
  })

const onImageGenerationCompleted = app
  .function('/onImageGenerationCompleted')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { generationId } = body.context ?? {}

    let imageHash = null
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const message = body.messages[i]
      if (message.role !== 'assistant') continue

      if (typeof message.content === 'string' && message.content.includes('cdn-chatium.io/get/')) {
        const match = message.content.match(/\/get\/([^\/\s?]+)/)
        if (match) {
          imageHash = match[1]
          break
        }
      }

      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (
            block.type === 'text' &&
            typeof block.text === 'string' &&
            block.text.includes('cdn-chatium.io/get/')
          ) {
            const match = block.text.match(/\/get\/([^\/\s?]+)/)
            if (match) {
              imageHash = match[1]
              break
            }
          }
          if (block.type === 'image' && block.source?.type === 'url') {
            const match = block.source.url.match(/\/get\/([^\/\s?]+)/)
            if (match) {
              imageHash = match[1]
              break
            }
          }
        }
      }
      if (imageHash) break
    }

    await Generations.update(ctx, {
      id: generationId,
      generatedImageHash: imageHash || '',
      status: 'completed'
    })

    return null
  })

const onVideoGenerationCompleted = app
  .function('/onVideoGenerationCompleted')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { generationId } = body.context ?? {}

    let videoHash = null
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const message = body.messages[i]
      if (message.role !== 'assistant') continue

      if (
        typeof message.content === 'string' &&
        message.content.includes('cdn-chatium.io/get/') &&
        message.content.includes('.mp4')
      ) {
        videoHash = message.content
        break
      }

      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (
            block.type === 'text' &&
            typeof block.text === 'string' &&
            block.text.includes('cdn-chatium.io/get/') &&
            block.text.includes('.mp4')
          ) {
            videoHash = block.text
            break
          }
          if (block.type === 'video' && block.source?.type === 'url') {
            const match = block.source.url.match(/\/storage\/files\/([^\/\?]+)/)
            if (match) {
              videoHash = match[1]
              break
            }
          }
        }
      }
      if (videoHash) break
    }

    await Generations.update(ctx, {
      id: generationId,
      generatedVideoHash: videoHash || '',
      status: 'completed'
    })

    return null
  })

const onGenerationFailed = app
  .function('/onGenerationFailed')
  .body(CompletionFailedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { generationId } = body.context ?? {}

    await Generations.update(ctx, {
      id: generationId,
      status: 'failed',
      error: body.error || 'Unknown error'
    })

    return null
  })
