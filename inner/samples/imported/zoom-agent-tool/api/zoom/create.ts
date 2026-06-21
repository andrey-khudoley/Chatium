import { createZoomMeeting } from '../zoom-api'
import ZoomMeetingsTable from '../../tables/zoom_meetings.table'

interface ZoomMeetingResponse {
  id: string | number
  topic: string
  agenda?: string
  start_url: string
  join_url: string
  password?: string
  start_time: string
  timezone: string
}

export const apiZoomCreateRoute = app
  .post('/')
  .body((s) => ({
    topic: s.string().optional(),
    agenda: s.string().optional(),
    duration: s.number().optional(),
    auto_recording: s.enum(['none', 'local', 'cloud']).optional(),
    start_timestamp: s.number().optional(),
    timezone: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    const result = await createZoomMeeting(ctx, {
      topic: req.body.topic,
      agenda: req.body.agenda,
      duration: req.body.duration,
      auto_recording: req.body.auto_recording,
      start_timestamp: req.body.start_timestamp,
      timezone: req.body.timezone
    })

    if (!result.ok || !result.meeting) {
      return result
    }

    const meeting = result.meeting as unknown as ZoomMeetingResponse

    // Save to table
    await ZoomMeetingsTable.create(ctx, {
      meeting_id: meeting.id.toString(),
      topic: meeting.topic || 'Zoom-встреча',
      agenda: meeting.agenda || '',
      start_url: meeting.start_url,
      join_url: meeting.join_url,
      password: meeting.password || '',
      created_at: new Date()
    })

    return {
      ok: true,
      meeting: {
        id: meeting.id,
        topic: meeting.topic,
        password: meeting.password,
        start_time: meeting.start_time,
        timezone: meeting.timezone,
        start_url: meeting.start_url,
        join_url: meeting.join_url
      }
    }
  })
