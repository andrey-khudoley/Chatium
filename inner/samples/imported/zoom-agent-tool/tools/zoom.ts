import { findUserById } from '@app/auth'
import { createZoomMeeting, listCloudRecordings } from '../api/zoom-api'
import ZoomMeetingsTable from '../tables/zoom_meetings.table'
import { parseDateTimeToTimestamp } from '../api/datetime'

interface ZoomMeetingResponse {
  id: string | number
  topic: string
  start_url: string
  join_url: string
  password?: string
  start_time: string
  timezone: string
}

// Регистрация тулов для AI-агента
app.accountHook('@start/agent/tools', async (ctx, params) => {
  ctx.account.log('🔧 Zoom tools hook called', {
    level: 'info',
    json: { params, toolsCount: 3 }
  })

  // Возвращаем массив с зарегистрированными тулхуками
  return [zoomAgentCreateMeetingTool, zoomAgentListRecordingsTool, zoomAgentParseDateTimeTool]
})

export const zoomAgentCreateMeetingTool = app
  .function('/zoomAgentCreateMeeting')
  .meta({
    name: 'zoomAgentCreateMeeting',
    description: 'Создание Zoom-встречи — создаёт конференцию со ссылками для участников',
    llmDescription: `Создание Zoom-встречи для пользователей. ИСПОЛЬЗУЙ этот тул когда пользователь просит создать встречу, зум, конференцию, видеозвонок.

ПАРАМЕТРЫ:
- topic: тема встречи (обязательно)
- agenda: повестка/описание (опционально)
- duration: длительность в минутах, по умолчанию 60
- auto_recording: 'none' | 'local' | 'cloud' — запись встречи
- start_timestamp: Unix timestamp в секундах для запланированной встречи
- timezone: IANA часовой пояс, например 'Europe/Moscow'

⚠️ КРИТИЧЕСКИ ВАЖНО — время начала:
Если пользователь просит встречу на конкретное время (завтра, в понедельник, 20:00 и т.д.),
ОБЯЗАТЕЛЬНО сначала вызови zoomAgentParseDateTime для получения timestamp,
затем передай полученный timestamp сюда.

Если время не указано — создаётся мгновенная встреча (прямо сейчас).`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            topic: s.string().describe('Тема встречи, обязательно укажи понятное название'),
            agenda: s.string().optional().describe('Повестка/описание встречи'),
            duration: s.number().optional().describe('Длительность в минутах, по умолчанию 60'),
            auto_recording: s
              .enum(['none', 'local', 'cloud'])
              .optional()
              .describe(
                'Тип автоматической записи: none - без записи, local - локальная запись, cloud - облачная запись'
              ),
            start_timestamp: s
              .number()
              .optional()
              .describe(
                'Unix timestamp в секундах для времени начала встречи. Получи через zoomAgentParseDateTime!'
              ),
            timezone: s
              .string()
              .optional()
              .describe('IANA часовой пояс: Europe/Moscow, Europe/London, America/New_York')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🎥 zoomAgentCreateMeetingTool', { json: body })

    try {
      const result = await createZoomMeeting(ctx, {
        topic: body.input.topic,
        agenda: body.input.agenda,
        duration: body.input.duration,
        auto_recording: body.input.auto_recording,
        start_timestamp: body.input.start_timestamp,
        timezone: body.input.timezone
      })

      if (!result.ok || !result.meeting) {
        return {
          ok: false,
          result: `❌ Ошибка при создании встречи: ${result.message || 'Неизвестная ошибка'}`
        }
      }

      const meeting = result.meeting as unknown as ZoomMeetingResponse

      // Сохраняем встречу в таблицу для последующего использования
      await ZoomMeetingsTable.create(ctx, {
        meeting_id: meeting.id.toString(),
        topic: meeting.topic || 'Zoom-встреча',
        agenda: body.input.agenda || '',
        start_url: meeting.start_url,
        join_url: meeting.join_url,
        password: meeting.password || '',
        created_at: new Date()
      })

      return {
        ok: true,
        result: `Zoom-встреча создана! 🎥

<b>Информация о встрече:</b>
📋 Тема: ${meeting.topic || 'Zoom-встреча'}
🆔 ID встречи: ${meeting.id}
🔐 Пароль: ${meeting.password || 'нет'}
📅 Время начала: ${meeting.start_time} (${meeting.timezone})
🌍 Часовой пояс: ${meeting.timezone}

<b>Ссылки для участия:</b>
👑 <b>Для организатора (запуск встречи):</b> <a href="${meeting.start_url}">Запустить встречу</a>
⚠️ <i>Ссылка для организатора действует всего 2 часа!</i>

👥 <b>Для участников:</b> <a href="${meeting.join_url}">Присоединиться к встрече</a>

Встреча готова к проведению!`
      }
    } catch (error: any) {
      ctx.account.log('zoomAgentCreateMeetingTool error', {
        level: 'error',
        json: { error: error.message }
      })

      return {
        ok: false,
        result: `❌ Ошибка при создании встречи: ${error.message}`
      }
    }
  })

export const zoomAgentListRecordingsTool = app
  .function('/zoomAgentListRecordings')
  .meta({
    name: 'zoomAgentListRecordings',
    description: 'Получение списка записей Zoom-встреч с ссылками для скачивания',
    llmDescription: `Получение списка записей прошедших Zoom-встреч.

ИСПОЛЬЗУЙ когда пользователь просит:
- показать записи встреч
- дать ссылки на записи зума
- скачать запись встречи
- архив записей

Возвращает список записей за последние 30 дней с:
- названием встречи
- датой и временем
- размером файлов
- ссылками для скачивания (действуют 24 часа)`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object({}, { additionalProperties: true })
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('📹 zoomAgentListRecordingsTool', { json: body })

    try {
      const result = await listCloudRecordings(ctx)

      if (!result.ok) {
        return {
          ok: false,
          result: `❌ Ошибка при получении записей: ${result.message}`
        }
      }

      const recordings = result.meetings as any[]

      if (!recordings || recordings.length === 0) {
        return {
          ok: true,
          result: `📹 Записей встреч пока нет или они не найдены.

Возможные причины:
• Встречи не записывались автоматически
• Записи еще обрабатываются (может занять несколько часов после окончания встречи)
• Записи были удалены или архивированы`
        }
      }

      // Форматируем записи для красивого отображения
      let formattedRecordings = `📹 **Записи ваших Zoom-встреч** (найдено: ${recordings.length})\n\n`

      recordings.forEach((meeting, index) => {
        // Преобразуем дату начала в московское время
        const startDate = new Date(meeting.start_time)
        const moscowTime = startDate.toLocaleString('ru-RU', {
          timeZone: 'Europe/Moscow',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        formattedRecordings += `**${index + 1}. ${meeting.topic}** (${moscowTime})\n`

        if (meeting.recording_files && meeting.recording_files.length > 0) {
          meeting.recording_files.forEach((file: any) => {
            const sizeInMB = (file.file_size / 1024 / 1024).toFixed(1)
            const recordingType =
              file.recording_type === 'audio_only' ? 'Аудиозапись' : 'Видеозапись'
            const format = file.file_type || 'неизвестный'

            formattedRecordings += `   • ${recordingType} (${format}) — ${sizeInMB} МБ\n`
          })

          // Добавляем общую ссылку для скачивания всех записей встречи
          if (meeting.share_url && meeting.recording_play_passcode) {
            const downloadLink = `${meeting.share_url}?pwd=${meeting.recording_play_passcode}`
            formattedRecordings += `   🔗 [Скачать все записи встречи](${downloadLink})\n`
          }
        } else {
          formattedRecordings += `   • Файлы записи отсутствуют\n`
        }

        formattedRecordings += `\n`
      })

      formattedRecordings += `⚠️ **Важно:** Ссылки для скачивания действуют только 24 часа!\n`
      formattedRecordings += `Если нужна запись позже — сохраните файлы на устройство.`

      return {
        ok: true,
        result: formattedRecordings
      }
    } catch (error: any) {
      ctx.account.log('zoomAgentListRecordingsTool error', {
        level: 'error',
        json: { error: error.message }
      })

      return {
        ok: false,
        result: `❌ Ошибка при получении записей: ${error.message}`
      }
    }
  })

export const zoomAgentParseDateTimeTool = app
  .function('/zoomAgentParseDateTime')
  .meta({
    name: 'zoomAgentParseDateTime',
    description: 'Конвертация удобочитаемой даты/времени в Unix timestamp для Zoom',
    llmDescription: `⚠️ ОБЯЗАТЕЛЬНЫЙ ПРЕДВАРИТЕЛЬНЫЙ ТУЛ перед созданием запланированной встречи!

ИСПОЛЬЗУЙ когда пользователь просит создать встречу на конкретное время:
- "завтра в 20:00"
- "в понедельник в 10:00"
- "2026-05-03 20:00"
- "через 2 часа"

НЕ ПЫТАЙСЯ сам вычислять Unix timestamp — это сложно и часто приводит к ошибкам!

ПОРЯДОК ДЕЙСТВИЙ:
1. Вызови этот тул с date_time из запроса пользователя
2. Получи в ответе timestamp (число)
3. Передай этот timestamp в zoomAgentCreateMeeting

ПАРАМЕТРЫ:
- date_time: удобочитаемая дата ("завтра 20:00", "понедельник 10:00", "2026-05-03 20:00")
- timezone: IANA часовой пояс (Europe/Moscow, Europe/London, America/New_York)

Возвращает объект с timestamp для использования в zoomAgentCreateMeeting.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            date_time: s
              .string()
              .describe(
                'Удобочитаемая дата и время. Примеры: "завтра 20:00", "2026-05-03 20:00", "понедельник 10:00", "через 2 часа"'
              ),
            timezone: s
              .string()
              .optional()
              .describe(
                'IANA часовой пояс (например: Europe/Moscow, America/New_York). Если не указано - используется Europe/Moscow'
              )
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('📅 zoomAgentParseDateTimeTool', { json: body })

    try {
      const timezone = body.input.timezone || 'Europe/Moscow'
      const dateTime = body.input.date_time

      const result = await parseDateTimeToTimestamp(ctx, dateTime, timezone)

      if (!result.ok) {
        return {
          ok: false,
          result: `❌ Ошибка при обработке даты/времени: ${result.error}`
        }
      }

      return {
        ok: true,
        result: `✅ Дата/время успешно обработаны!

📅 Исходная строка: "${dateTime}"
🌍 Часовой пояс: ${timezone}

📊 Результат:
• Unix timestamp: ${result.timestamp}
• Форматированная дата: ${result.formatted_date}
• ISO строка: ${result.iso_string}

Теперь используй timestamp ${result.timestamp} в туле zoomAgentCreateMeeting для создания встречи.`
      }
    } catch (error: any) {
      ctx.account.log('zoomAgentParseDateTimeTool error', {
        level: 'error',
        json: { error: error.message }
      })

      return {
        ok: false,
        result: `❌ Ошибка при обработке даты/времени: ${error.message}`
      }
    }
  })
