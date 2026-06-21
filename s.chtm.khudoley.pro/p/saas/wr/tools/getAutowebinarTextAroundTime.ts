import { formatTime, parseVTT } from '../shared/vtt-parser'
import { loadAutowebinarSubtitles } from './shared'

export const getAutowebinarTextAroundTimeTool = app
  .function('/get-autowebinar-text-around-time')
  .meta({
    name: 'get_autowebinar_text_around_time',
    description:
      'Получить фрагменты трансрибированного текста видео автовебинара вокруг таймкода: до и после заданного offsetSeconds.'
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            autowebinarId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            autowebinarId: s.string().optional(),
            offsetSeconds: s.number().describe('Целевой таймкод в секундах.'),
            windowSeconds: s
              .number()
              .optional()
              .describe('Размер окна в секундах (по умолчанию 120).'),
            limit: s
              .number()
              .optional()
              .describe('Максимум сообщений (по умолчанию 50, максимум 200).')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    try {
      const autowebinarId = body.input?.autowebinarId
      const offsetSeconds = Number(body.input?.offsetSeconds)
      const windowSeconds = Math.max(5, Number(body.input?.windowSeconds) || 120)
      const limit = Math.max(1, Math.min(200, Number(body.input?.limit) || 50))

      if (!autowebinarId) throw new Error('autowebinarId is required')
      if (!Number.isFinite(offsetSeconds)) throw new Error('offsetSeconds is required')

      const minOffset = Math.max(0, Math.floor(offsetSeconds - windowSeconds))
      const maxOffset = Math.max(minOffset, Math.ceil(offsetSeconds + windowSeconds))

      const subtitles = await loadAutowebinarSubtitles(ctx, autowebinarId)
      const cues = parseVTT(subtitles)
      if (cues.length === 0) throw new Error('Субтитры не содержат таймкодов VTT')

      const normalized = cues
        .filter((cue) => Number(cue.startTime) <= maxOffset && Number(cue.endTime) >= minOffset)
        .slice(0, limit)
        .map((cue) => ({
          startTimeSeconds: Number(cue.startTime || 0),
          endTimeSeconds: Number(cue.endTime || 0),
          timecode: `${formatTime(Number(cue.startTime || 0))} - ${formatTime(Number(cue.endTime || 0))}`,
          deltaSeconds: Number(cue.startTime || 0) - offsetSeconds,
          text: cue.text || ''
        }))

      return {
        ok: true,
        result: {
          autowebinarId,
          targetOffsetSeconds: offsetSeconds,
          windowSeconds,
          found: normalized.length,
          messages: normalized
        }
      }
    } catch (error) {
      return {
        ok: false,
        result: `Ошибка: ${(error as Error).message}`
      }
    }
  })
