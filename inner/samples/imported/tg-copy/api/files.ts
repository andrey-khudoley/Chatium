import { requireRealUser } from '@app/auth'
import {
  createFeedMessage,
  findFeedParticipants,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import { getThumbnailUrl, obtainStorageFilePutUrl } from '@app/storage'
import Chats from '../tables/chats.table'

interface FileUpload {
  hash?: string
  uid?: string
  name: string
  size: number
  mimeType: string
  isVoiceMessage?: boolean
  isVideoNote?: boolean
  duration?: number
}

// Загрузить файл и создать сообщение с файлом
export const apiFilesUploadRoute = app
  .body((s) => ({
    files: s.array(s.object({
      hash: s.string().optional(),
      uid: s.string().optional(),
      name: s.string(),
      size: s.number(),
      mimeType: s.string(),
      isVoiceMessage: s.boolean().optional(),
      isVideoNote: s.boolean().optional(),
      duration: s.number().optional(),
    })),
    text: s.string().optional(),
    replyTo: s.string().optional(),
    forwardedFrom: s.object({
      feedId: s.string(),
      title: s.string(),
      type: s.string(),
      avatarHash: s.string().optional(),
      isPublic: s.boolean().optional(),
      isPaid: s.boolean().optional(),
      authorName: s.string().optional(),
      authorId: s.string().optional(),
    }).optional(),
  }))
  .post('/:feedId/upload', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const { files, text, replyTo, forwardedFrom } = req.body

    // Преобразуем файлы в формат Feed API
    // При пересылке используем uid/hash из оригинального сообщения
    const messageFiles = files.map((file: FileUpload) => {
      const fileUid = file.uid || file.hash
      return {
        uid: fileUid,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        // Для изображений добавляем превью
        previewUrl: file.mimeType.startsWith('image/') 
          ? getThumbnailUrl(fileUid, 400, 400)
          : undefined,
        // Сохраняем метаданные голосовых и видео сообщений
        isVoiceMessage: file.isVoiceMessage,
        isVideoNote: file.isVideoNote,
        duration: file.duration,
      }
    })

    // Формируем данные для сохранения источника пересылки
    const messageData: any = {}
    if (forwardedFrom) {
      messageData.forwardedFrom = forwardedFrom
    }

    const message = await createFeedMessage(ctx, req.params.feedId, ctx.user, {
      text: text || '',
      type: 'Message',
      files: messageFiles,
      reply_to: replyTo || null,
      data: Object.keys(messageData).length > 0 ? messageData : undefined,
    })

    // Отправляем событие всем участникам
    for (const participant of participants) {
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: 'new-message',
        feedId: req.params.feedId,
        message: {
          ...message,
          files: messageFiles,
          data: Object.keys(messageData).length > 0 ? messageData : undefined,
        },
      })
    }

    return {
      success: true,
      message,
    }
  })

// Получить URL для загрузки файла
export const apiFilesGetUploadUrlRoute = app
  .get('/upload-url', async (ctx, req) => {
    requireRealUser(ctx)

    const uploadUrl = await obtainStorageFilePutUrl(ctx)

    return { uploadUrl }
  })

// Получить информацию о файле
export const apiFilesGetRoute = app
  .get('/:hash', async (ctx, req) => {
    requireRealUser(ctx)

    const { hash } = req.params

    return {
      url: getThumbnailUrl(hash, undefined, undefined),
      thumbnailUrl: getThumbnailUrl(hash, 400, 400),
    }
  })
