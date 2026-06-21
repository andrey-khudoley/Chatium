import { requireRealUser, requireAccountRole } from '@app/auth'
import { transcriptAudio } from '@start/sdk'
import Transcriptions from '../tables/voice-transcriptions.table'
import { sendDataToSocket } from '@app/socket'
import { updateFeedMessage, findFeedMessageById } from '@app/feed'

// Helper для логирования
function logTranscription(ctx: any, stage: string, data: Record<string, any>) {
//   ctx.account.log(`[VoiceTranscription] ${stage}`, {
//     level: 'info',
//     json: {
//       timestamp: new Date().toISOString(),
//       stage,
//       ...data,
//     },
//   })
}

// Получить транскрибацию для файла
export const apiVoiceTranscriptionGetRoute = app.get('/:fileHash', async (ctx, req) => {
  requireRealUser(ctx)
  
  logTranscription(ctx, 'GET_REQUEST', { 
    fileHash: req.params.fileHash,
    userId: ctx.user?.id 
  })
  
  const transcription = await Transcriptions.findOneBy(ctx, {
    fileHash: req.params.fileHash,
  })
  
  logTranscription(ctx, 'GET_RESULT', { 
    fileHash: req.params.fileHash,
    found: !!transcription,
    status: transcription?.status 
  })
  
  return {
    transcription: transcription || null,
  }
})

// Создать транскрибацию голосового сообщения
export const apiVoiceTranscriptionCreateRoute = app
  .body((s) => ({
    fileHash: s.string(),
    messageId: s.string(),
    feedId: s.string(),
  }))
  .post('/create', async (ctx, req) => {
    // Только админы воркспейса могут создавать транскрибации
    requireAccountRole(ctx, 'Admin')
    
    const { fileHash, messageId, feedId } = req.body
    
    logTranscription(ctx, 'CREATE_REQUEST', { 
      fileHash, 
      messageId, 
      feedId,
      userId: ctx.user?.id,
      userName: ctx.user?.displayName 
    })
    
    // Проверяем, есть ли уже транскрибация
    logTranscription(ctx, 'CHECK_EXISTING', { fileHash, messageId })
    
    const existing = await Transcriptions.findOneBy(ctx, {
      fileHash,
    })
    
    if (existing && existing.status === 'completed') {
      logTranscription(ctx, 'CACHE_HIT', { 
        fileHash, 
        transcriptionId: existing.id,
        preview: existing.transcription?.substring(0, 100) 
      })
      return {
        success: true,
        transcription: existing,
        fromCache: true,
      }
    }
    
    logTranscription(ctx, existing ? 'CACHE_PENDING' : 'CACHE_MISS', { 
      fileHash, 
      existingStatus: existing?.status 
    })
    
    // Создаем запись о транскрибации со статусом processing
    let transcriptionRecord = existing
    if (!existing) {
      logTranscription(ctx, 'DB_CREATE', { fileHash, messageId, feedId })
      transcriptionRecord = await Transcriptions.create(ctx, {
        fileHash,
        messageId,
        feedId,
        transcription: '',
        status: 'processing',
        requestedBy: ctx.user.id,
      })
      logTranscription(ctx, 'DB_CREATED', { 
        fileHash, 
        transcriptionId: transcriptionRecord.id 
      })
    } else {
      // Обновляем существующую запись
      logTranscription(ctx, 'DB_UPDATE', { 
        fileHash, 
        existingId: existing.id,
        oldStatus: existing.status 
      })
      transcriptionRecord = await Transcriptions.update(ctx, {
        id: existing.id,
        status: 'processing',
        errorMessage: null,
      })
      logTranscription(ctx, 'DB_UPDATED', { 
        fileHash, 
        transcriptionId: transcriptionRecord.id 
      })
    }
    
    // Формируем URL аудиофайла
    const audioUrl = `https://fs.chatium.ru/get/${fileHash}`
    
    logTranscription(ctx, 'TRANSCRIPT_START', { 
      fileHash, 
      audioUrl,
      transcriptionId: transcriptionRecord.id 
    })
    
    try {
      // Запускаем транскрибацию через transcriptAudio
      const result = await transcriptAudio(ctx, audioUrl)
      
      logTranscription(ctx, 'TRANSCRIPT_SUCCESS', { 
        fileHash,
        transcriptionId: transcriptionRecord.id,
        textLength: result.text?.length,
        preview: result.text?.substring(0, 200)
      })
      
      // Сохраняем результат в таблицу
      const updatedTranscription = await Transcriptions.update(ctx, {
        id: transcriptionRecord.id,
        transcription: result.text || '',
        status: 'completed',
      })
      
      logTranscription(ctx, 'DB_UPDATE_SUCCESS', { 
        transcriptionId: transcriptionRecord.id,
        updatedAt: updatedTranscription.updatedAt 
      })
      
      // Обновляем сообщение в Feed API, добавляя транскрипцию в data
      if (feedId && messageId) {
        try {
          logTranscription(ctx, 'FEED_UPDATE_START', { 
            transcriptionId: transcriptionRecord.id, 
            feedId, 
            messageId 
          })
          const message = await findFeedMessageById(ctx, feedId, messageId)
          if (message) {
            const existingData = message.data || {}
            await updateFeedMessage(ctx, feedId, messageId, {
              data: {
                ...existingData,
                voiceTranscription: result.text || '',
                voiceTranscriptionAt: new Date().toISOString(),
              }
            })
            logTranscription(ctx, 'FEED_UPDATE_SUCCESS', { 
              transcriptionId: transcriptionRecord.id, 
              feedId, 
              messageId 
            })
          } else {
            logTranscription(ctx, 'FEED_MESSAGE_NOT_FOUND', { 
              transcriptionId: transcriptionRecord.id, 
              feedId, 
              messageId 
            })
          }
        } catch (err) {
          logTranscription(ctx, 'FEED_UPDATE_ERROR', { 
            transcriptionId: transcriptionRecord.id, 
            feedId, 
            messageId,
            error: String(err) 
          })
          console.error('Failed to update message with transcription:', err)
        }
      }
      
      // Отправляем уведомление через WebSocket всем участникам чата
      const channelName = `chat-${feedId}`
      logTranscription(ctx, 'WEBSOCKET_SEND_START', { 
        transcriptionId: transcriptionRecord.id,
        feedId,
        messageId,
        channel: channelName,
        transcriptionLength: result.text?.length,
        feedIdType: typeof feedId,
        feedIdLength: feedId?.length
      })
      
      try {
        // Логируем контекст перед отправкой
        logTranscription(ctx, 'WEBSOCKET_SEND_CONTEXT', {
          accountId: ctx.account?.id,
          userId: ctx.user?.id,
          channel: channelName,
          hasSendDataToSocket: typeof sendDataToSocket === 'function'
        })
        
        await sendDataToSocket(ctx, channelName, {
          type: 'transcription-completed',
          messageId,
          fileHash,
          transcription: result.text || '',
          feedId, // Дублируем для проверки на клиенте
          timestamp: new Date().toISOString(),
        })
        
        logTranscription(ctx, 'WEBSOCKET_SEND_SUCCESS', { 
          feedId,
          messageId,
          channel: channelName
        })
      } catch (wsError) {
        logTranscription(ctx, 'WEBSOCKET_SEND_ERROR', { 
          feedId,
          messageId,
          channel: channelName,
          error: String(wsError),
          errorStack: wsError?.stack
        })
        console.error('[VoiceTranscription] WebSocket send failed:', wsError)
      }
      
      logTranscription(ctx, 'TRANSCRIPTION_COMPLETE', { 
        transcriptionId: transcriptionRecord.id,
        fileHash,
        feedId,
        messageId,
        textLength: result.text?.length 
      })
      
      return {
        success: true,
        transcription: updatedTranscription,
        fromCache: false,
      }
      
    } catch (error) {
      logTranscription(ctx, 'TRANSCRIPT_ERROR', { 
        fileHash,
        transcriptionId: transcriptionRecord.id,
        error: String(error)
      })
      
      // Сохраняем ошибку в таблицу
      await Transcriptions.update(ctx, {
        id: transcriptionRecord.id,
        status: 'error',
        errorMessage: String(error) || 'Transcription failed',
      })
      
      // Отправляем уведомление об ошибке
      await sendDataToSocket(ctx, `chat-${feedId}`, {
        type: 'transcription-error',
        messageId,
        fileHash,
        error: String(error),
      })
      
      logTranscription(ctx, 'TRANSCRIPTION_FAILED_COMPLETE', { 
        transcriptionId: transcriptionRecord.id,
        fileHash,
        error: String(error)
      })
      
      throw new Error(`Transcription failed: ${error}`)
    }
  })