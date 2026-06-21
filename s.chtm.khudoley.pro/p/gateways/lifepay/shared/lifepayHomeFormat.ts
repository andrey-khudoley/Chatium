// @shared
/**
 * Чистые помощники форматирования/классификации для домашней панели gateway
 * (HomePage и её презентационные подкомпоненты). Без состояния Vue. Вынесено ради
 * лимита размера файла HomePage.vue; поведение и тексты сохранены дословно.
 */

export type LifepayHomeDateTimeParts = { date: string; time: string }

/** Разбивает Unix ms на компоненты date (YYYY-MM-DD) и time (HH:MM) в локальной зоне. */
export function msToDateTimeParts(ms: number | null | undefined): LifepayHomeDateTimeParts {
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

export function formatKpi(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0'
  return String(n)
}

export function formatPercent(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '0.0 %'
  return `${(v * 100).toFixed(1)} %`
}

export function isRequestOk(r: { errorCode?: string; clientHttpStatus: number }): boolean {
  return !r.errorCode && r.clientHttpStatus < 400
}

export function isUpstreamOk(u: { upstreamKind: string; semanticRule?: string }): boolean {
  return u.upstreamKind === 'json_ok' && !u.semanticRule
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

export function updatedSince(now: number, ts: number | null | undefined): string {
  if (!ts) return ''
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 5) return 'только что'
  if (diffSec < 60) return `${diffSec} с назад`
  const min = Math.floor(diffSec / 60)
  return `${min} мин назад`
}

export function rowClassRequest(r: { errorCode?: string; clientHttpStatus: number }): string {
  if (!r.errorCode && r.clientHttpStatus < 400) return 'row-ok'
  return 'row-err'
}

export function rowClassUpstream(u: { upstreamKind: string; semanticRule?: string }): string {
  if (u.upstreamKind === 'json_ok' && !u.semanticRule) return 'row-ok'
  return 'row-err'
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

export function rawJsonString(entry: unknown): string {
  if (!entry) return ''
  try {
    return JSON.stringify(entry, null, 2)
  } catch (_e) {
    return '<unstringifiable>'
  }
}

export type LifepayHomeCounts = {
  totalRequests: number
  totalOk: number
  totalErrors: number
  okShare: number
  avgDurationMs: number
  p95DurationMs: number
  topErrorCode: string
  topErrorCount: number
  upstreamTotal: number
  upstreamOk: number
  upstreamErrors: number
  upstreamOkShare: number
}

/** Начальные нулевые значения сводных счётчиков главной панели. */
export function defaultLifepayHomeCounts(): LifepayHomeCounts {
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
    upstreamOkShare: 0
  }
}

export type LifepayHomeApiUrls = {
  recentRequests: string
  recentUpstream: string
  rawRequest: string
  rawUpstream: string
  counts: string
  filterSave: string
  accessGenerateInvite: string
  accessRevokeInvite: string
  accessRevokeGrant: string
  accessInvites: string
  accessGrants: string
}

/** Пустые URL-ы API по умолчанию для пропа apiUrls главной панели. */
export function defaultLifepayHomeApiUrls(): LifepayHomeApiUrls {
  return {
    recentRequests: '',
    recentUpstream: '',
    rawRequest: '',
    rawUpstream: '',
    counts: '',
    filterSave: '',
    accessGenerateInvite: '',
    accessRevokeInvite: '',
    accessRevokeGrant: '',
    accessInvites: '',
    accessGrants: ''
  }
}
