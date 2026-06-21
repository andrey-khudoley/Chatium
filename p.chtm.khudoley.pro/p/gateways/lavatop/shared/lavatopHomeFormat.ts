// @shared
/**
 * Чистые форматтеры и дефолты главной панели (pages/HomePage.vue). Без состояния
 * Vue — используются мик­сином и презентационными компонентами home/*.
 * Вынесено из HomePage.vue ради лимита размера файла; поведение без изменений.
 */

export type HomeDateTimeParts = { date: string; time: string }

/** Разбивает Unix ms на компоненты date (YYYY-MM-DD) и time (HH:MM) в локальной зоне. */
export function msToDateTimeParts(ms: number | null | undefined): HomeDateTimeParts {
  if (!ms || !Number.isFinite(ms)) return { date: '', time: '' }
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date, time }
}

/** Собирает Unix ms из date+time. Если date пуст — возвращает undefined. */
export function partsToMs(date: string, time: string, endOfDay: boolean): number | undefined {
  if (!date) return undefined
  const t = time || (endOfDay ? '23:59' : '00:00')
  const ms = new Date(`${date}T${t}`).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

export function defaultHomeCounts() {
  return {
    totalRequests: 0,
    totalOk: 0,
    totalErrors: 0,
    okShare: 0,
    avgDurationMs: 0,
    p95DurationMs: 0,
    topErrorCode: '',
    topErrorCount: 0,
    upstreamTotal: 0,
    upstreamOk: 0,
    upstreamErrors: 0,
    upstreamOkShare: 0,
    webhookTotal: 0,
    webhookForwarded: 0,
    webhookFailed: 0
  }
}

export function defaultHomeApiUrls() {
  return {
    recentRequests: '',
    recentUpstream: '',
    rawRequest: '',
    rawUpstream: '',
    counts: '',
    filterSave: '',
    recentWebhooks: '',
    reforwardWebhook: '',
    accessGenerateInvite: '',
    accessRevokeInvite: '',
    accessRevokeGrant: '',
    accessInvites: '',
    accessGrants: ''
  }
}

export type RequestRow = { errorCode?: string; clientHttpStatus: number }
export type UpstreamRow = { upstreamKind: string; semanticRule?: string }
export type WebhookRow = { forward_status_code?: number; processing_error?: string }

export function formatKpi(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0'
  return String(n)
}

export function formatPercent(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '0.0 %'
  return `${(v * 100).toFixed(1)} %`
}

export function isRequestOk(r: RequestRow): boolean {
  return !r.errorCode && r.clientHttpStatus < 400
}

export function isUpstreamOk(u: UpstreamRow): boolean {
  return u.upstreamKind === 'json_ok' && !u.semanticRule
}

export function isWebhookOk(w: WebhookRow): boolean {
  const code = w.forward_status_code
  return !w.processing_error && typeof code === 'number' && code >= 200 && code < 300
}

export function formatTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', { hour12: false })
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('ru-RU', { hour12: false })
  } catch (_e) {
    return '—'
  }
}

export function rowClassRequest(r: RequestRow): string {
  if (!r.errorCode && r.clientHttpStatus < 400) return 'row-ok'
  return 'row-err'
}

export function rowClassUpstream(u: UpstreamRow): string {
  if (u.upstreamKind === 'json_ok' && !u.semanticRule) return 'row-ok'
  return 'row-err'
}

export function rowClassWebhook(w: WebhookRow): string {
  return isWebhookOk(w) ? 'row-ok' : 'row-err'
}

export function inviteStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'активен'
    case 'used':
      return 'использован'
    case 'revoked':
      return 'отозван'
    case 'expired':
      return 'истёк'
    default:
      return status
  }
}

/** «N с/мин назад» относительно now (Unix ms). */
export function updatedSince(now: number, ts: number | null | undefined): string {
  if (!ts) return ''
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 5) return 'только что'
  if (diffSec < 60) return `${diffSec} с назад`
  const min = Math.floor(diffSec / 60)
  return `${min} мин назад`
}

export function rawJsonString(entry: unknown): string {
  if (!entry) return ''
  try {
    return JSON.stringify(entry, null, 2)
  } catch (_e) {
    return '<unstringifiable>'
  }
}

export function copyText(text: string): void {
  try {
    if (navigator && navigator.clipboard) navigator.clipboard.writeText(text)
  } catch (_e) {
    /* clipboard недоступен — игнорируем */
  }
}
