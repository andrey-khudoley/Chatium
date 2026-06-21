import { request } from '@app/request'
import { nanoid } from '@app/nanoid'
import { format, utcToZonedTime } from '@npm/date-fns-tz'
import ZoomSettingsTable from '../tables/zoom_settings.table'

export interface ZoomSettings {
  account_id: string
  client_id: string
  client_secret: string
  secret_token: string
  default_topic: string
  default_agenda: string
  default_auto_recording: 'none' | 'local' | 'cloud'
  default_timezone: string
}

export async function getZoomSettings(ctx: app.Ctx): Promise<ZoomSettings | null> {
  const settings = await ZoomSettingsTable.findAll(ctx, { limit: 1 })

  if (settings.length === 0) {
    return null
  }

  const s = settings[0]!
  return {
    account_id: s.account_id || '',
    client_id: s.client_id || '',
    client_secret: s.client_secret || '',
    secret_token: s.secret_token || '',
    default_topic: s.default_topic || 'Zoom-встреча',
    default_agenda: s.default_agenda || 'ZOOM',
    default_auto_recording: (s.default_auto_recording as 'none' | 'local' | 'cloud') || 'cloud',
    default_timezone: s.default_timezone || 'Europe/Moscow'
  }
}

export async function getZoomAuthToken(
  ctx: app.Ctx
): Promise<string | { ok: false; message: string }> {
  const settings = await getZoomSettings(ctx)

  if (!settings || !settings.account_id || !settings.client_id || !settings.client_secret) {
    return {
      ok: false,
      message:
        'Zoom настройки не configured. Пожалуйста, настройте интеграцию в панели администратора.'
    }
  }

  const authPayload = `${settings.client_id}:${settings.client_secret}`
  const authBytes = new TextEncoder().encode(authPayload)
  let authBinary = ''
  for (const b of authBytes) {
    authBinary += String.fromCharCode(b)
  }
  const authString = btoa(authBinary)

  const result = await request({
    url: `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${settings.account_id}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authString}`
    }
  })

  if (result.statusCode !== 200) {
    return {
      ok: false,
      message: `Response status ${result.statusCode}, body ${JSON.stringify(result.body)}`
    }
  }

  const body = result.body as unknown as { access_token: string }
  return body.access_token
}

export interface CreateMeetingOptions {
  topic?: string
  agenda?: string
  duration?: number
  auto_recording?: 'none' | 'local' | 'cloud'
  start_timestamp?: number
  timezone?: string
}

export async function createZoomMeeting(ctx: app.Ctx, options: CreateMeetingOptions = {}) {
  const settings = await getZoomSettings(ctx)

  if (!settings || !settings.account_id || !settings.client_id || !settings.client_secret) {
    return {
      ok: false,
      message:
        'Zoom настройки не configured. Пожалуйста, настройте интеграцию в панели администратора.'
    }
  }

  const tokenResult = await getZoomAuthToken(ctx)

  if (typeof tokenResult !== 'string') {
    return tokenResult
  }

  const token = tokenResult

  // Get current user
  const userResult = await request({
    url: 'https://api.zoom.us/v2/users/me',
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`
    }
  })

  if (userResult.statusCode !== 200) {
    return { ok: false, message: `Failed to get user: ${JSON.stringify(userResult.body)}` }
  }

  const user = userResult.body as unknown as { id: string; email: string; display_name: string }

  const topic = options.topic || settings.default_topic
  const agenda = options.agenda || settings.default_agenda
  const autoRecording = options.auto_recording || settings.default_auto_recording
  const duration = options.duration || 60

  // Обработка времени начала
  const timezone = options.timezone || settings.default_timezone || 'Europe/Moscow'
  let startTime: string

  if (options.start_timestamp) {
    // Если передан timestamp (в секундах), конвертируем в дату UTC
    const utcDate = new Date(options.start_timestamp * 1000)
    // Конвертируем UTC дату в локальное время указанной таймзоны
    const zonedDate = utcToZonedTime(utcDate, timezone)
    // Форматируем без Z в конце - Zoom ожидает локальное время для указанного таймзона
    startTime = format(zonedDate, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: timezone })
  } else {
    // По умолчанию - прямо сейчас в указанном таймзоне
    const nowUtc = new Date()
    const zonedDate = utcToZonedTime(nowUtc, timezone)
    startTime = format(zonedDate, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: timezone })
  }

  // Create meeting
  const meetingResult = await request({
    url: `https://api.zoom.us/v2/users/${user.id}/meetings`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    json: {
      agenda: agenda,
      default_password: true,
      duration: duration,
      password: nanoid(8),
      pre_schedule: false,
      schedule_for: user.id,
      settings: {
        allow_multiple_devices: true,
        alternative_hosts_email_notification: true,
        approval_type: 2,
        audio: 'both',
        auto_recording: autoRecording,
        calendar_type: 2,
        close_registration: false,
        contact_email: user.email,
        contact_name: user.display_name,
        email_notification: true,
        encryption_type: 'enhanced_encryption',
        focus_mode: true,
        host_video: true,
        jbh_time: 0,
        join_before_host: true,
        question_and_answer: {
          enable: true,
          allow_submit_questions: true,
          allow_anonymous_questions: true,
          question_visibility: 'all',
          attendees_can_comment: true,
          attendees_can_upvote: true
        },
        language_interpretation: {
          enable: true,
          interpreters: [
            {
              email: 'interpreter@example.com',
              interpreter_languages: 'English,French'
            }
          ]
        },
        sign_language_interpretation: {
          enable: true,
          interpreters: [{ email: 'interpreter@example.com', sign_language: 'American' }]
        },
        meeting_authentication: false,
        mute_upon_entry: false,
        participant_video: true,
        private_meeting: false,
        registration_type: 1,
        show_share_button: true,
        use_pMI: false,
        waiting_room: false,
        watermark: false,
        host_save_video_order: true,
        alternative_host_update_polls: true,
        alternative_host_manage_meeting_summary: true,
        alternative_host_manage_cloud_recording: false,
        internal_meeting: false,
        continuous_meeting_chat: { enable: true },
        participant_focused_meeting: false,
        push_change_to_calendar: false,
        auto_start_meeting_summary: false,
        who_will_receive_summary: 1,
        who_can_ask_questions: 1,
        device_testing: false,
        allow_host_control_participant_mute_state: true,
        disable_participant_video: false,
        email_in_attendee_report: true
      },
      start_time: startTime,
      timezone: timezone,
      topic: topic,
      type: 2
    }
  })

  if (meetingResult.statusCode !== 201 && meetingResult.statusCode !== 200) {
    return { ok: false, message: `Failed to create meeting: ${JSON.stringify(meetingResult.body)}` }
  }

  return { ok: true, meeting: meetingResult.body }
}

export async function listCloudRecordings(ctx: app.Ctx) {
  const settings = await getZoomSettings(ctx)

  if (!settings || !settings.account_id || !settings.client_id || !settings.client_secret) {
    return {
      ok: false,
      message:
        'Zoom настройки не configured. Пожалуйста, настройте интеграцию в панели администратора.'
    }
  }

  const tokenResult = await getZoomAuthToken(ctx)

  if (typeof tokenResult !== 'string') {
    return tokenResult
  }

  const token = tokenResult

  // Get user
  const userResult = await request({
    url: 'https://api.zoom.us/v2/users/me',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (userResult.statusCode !== 200) {
    return { ok: false, message: `Failed to get user: ${JSON.stringify(userResult.body)}` }
  }

  const user = userResult.body as unknown as { id: string }

  // Get recordings from last 30 days
  const dateStart = new Date()
  dateStart.setDate(dateStart.getDate() - 30)
  const ds = format(dateStart, 'yyyy-MM-dd', { timeZone: 'Europe/Moscow' })

  const recordListResult = await request({
    url: `https://api.zoom.us/v2/users/${user.id}/recordings?page_size=30&from=${ds}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (recordListResult.statusCode !== 200) {
    return {
      ok: false,
      message: `Failed to get recordings: ${JSON.stringify(recordListResult.body)}`
    }
  }

  const body = recordListResult.body as unknown as { meetings: unknown[] }
  return { ok: true, meetings: body.meetings || [] }
}
