// @shared
// Типы для аналитики плеера
export interface CountResult {
  cnt: number
}

export interface EventRow {
  ts64: Date
  action: string
  episodeId: string
  sessionId: string
  device: string
  currentTime: number
  duration: number
  streamTimecode: number
  user_id?: string
  firstName?: string
  lastName?: string
  uid: string
}

export interface FormCountResult {
  formId: string
  count: number
}
