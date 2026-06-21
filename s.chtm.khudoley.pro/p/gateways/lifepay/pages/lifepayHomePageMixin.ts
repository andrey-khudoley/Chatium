// @shared
/**
 * Методы домашней панели gateway (загрузка counts/журналов, фильтр по дате,
 * raw-модалка, доступы). Вынесены из HomePage.vue в mixin ради лимита размера
 * файла; `this` — экземпляр HomePage (Options API). Поведение сохранено дословно.
 */
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('GatewayHomePage')

export const lifepayHomePageMethodsMixin = {
  methods: {
    /** Дописывает dateFrom/dateTo к URL журнала, если фильтр активен. */
    withDateRange(this: any, url: string): string {
      if (!this.hasFilter) return url
      const params: string[] = []
      if (this.fromMs !== undefined) params.push(`dateFrom=${this.fromMs}`)
      if (this.toMs !== undefined) params.push(`dateTo=${this.toMs}`)
      if (params.length === 0) return url
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}${params.join('&')}`
    },

    async loadCounts(this: any) {
      const url = this.apiUrls && this.apiUrls.counts
      if (!url) return
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        const data = await res.json()
        if (data && data.success && data.counts) {
          this.counts = { ...this.counts, ...data.counts }
          this.lastUpdated.counts = Date.now()
        }
      } catch (e) {
        log.error('loadCounts failed', { error: String(e) })
      }
    },
    async loadRequests(this: any) {
      const base = this.apiUrls && this.apiUrls.recentRequests
      if (!base) return
      try {
        const res = await fetch(this.withDateRange(base), {
          headers: { Accept: 'application/json' }
        })
        const data = await res.json()
        if (data && data.success && Array.isArray(data.entries)) {
          this.requests = data.entries
          this.lastUpdated.requests = Date.now()
        }
      } catch (e) {
        log.error('loadRequests failed', { error: String(e) })
      }
    },
    async loadUpstream(this: any) {
      const base = this.apiUrls && this.apiUrls.recentUpstream
      if (!base) return
      try {
        const res = await fetch(this.withDateRange(base), {
          headers: { Accept: 'application/json' }
        })
        const data = await res.json()
        if (data && data.success && Array.isArray(data.entries)) {
          this.upstream = data.entries
          this.lastUpdated.upstream = Date.now()
        }
      } catch (e) {
        log.error('loadUpstream failed', { error: String(e) })
      }
    },

    /* ===== Date filter ===== */
    async applyFilter(this: any) {
      if (!this.filterValid || this.filterSaving) return
      const url = this.apiUrls && this.apiUrls.filterSave
      if (!url) return
      this.filterSaving = true
      this.filterError = ''
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: this.fromMs ?? null, to: this.toMs ?? null })
        })
        const data = await res.json().catch(() => ({}))
        if (!data || data.success !== true) {
          this.filterError = (data && data.error) || 'Не удалось сохранить фильтр'
        } else {
          this.loadCounts()
          this.loadRequests()
          this.loadUpstream()
        }
      } catch (e) {
        this.filterError = String(e)
      } finally {
        this.filterSaving = false
      }
    },
    async resetFilter(this: any) {
      const url = this.apiUrls && this.apiUrls.filterSave
      if (!url || this.filterSaving) return
      this.filterSaving = true
      this.filterError = ''
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: null, to: null })
        })
        const data = await res.json().catch(() => ({}))
        if (data && data.success === true) {
          this.filter = { fromDate: '', fromTime: '', toDate: '', toTime: '' }
          this.loadCounts()
          this.loadRequests()
          this.loadUpstream()
        } else {
          this.filterError = (data && data.error) || 'Не удалось сбросить фильтр'
        }
      } catch (e) {
        this.filterError = String(e)
      } finally {
        this.filterSaving = false
      }
    },

    async openRaw(this: any, kind: string, id: unknown) {
      const url =
        kind === 'upstream'
          ? this.apiUrls && this.apiUrls.rawUpstream
          : this.apiUrls && this.apiUrls.rawRequest
      if (!url || !id) {
        this.rawModal = { kind, id, entry: null, loading: false, error: 'URL или id отсутствуют' }
        return
      }
      this.rawModal = { kind, id, entry: null, loading: true, error: '' }
      try {
        const sep = url.includes('?') ? '&' : '?'
        const res = await fetch(`${url}${sep}id=${encodeURIComponent(String(id))}`, {
          method: 'GET',
          headers: { Accept: 'application/json' }
        })
        const data = await res.json()
        if (!data || data.success !== true) {
          this.rawModal = {
            kind,
            id,
            entry: null,
            loading: false,
            error: (data && data.error) || 'Ошибка загрузки'
          }
          return
        }
        this.rawModal = { kind, id, entry: data.entry || null, loading: false, error: '' }
      } catch (e) {
        this.rawModal = { kind, id, entry: null, loading: false, error: String(e) }
      }
    },
    closeRaw(this: any) {
      this.rawModal = null
    },

    /* ===== Access (Admin only) ===== */
    async loadInvites(this: any) {
      const url = this.apiUrls && this.apiUrls.accessInvites
      if (!url) return
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        const data = await res.json()
        if (data && data.success && Array.isArray(data.invites)) {
          this.invites = data.invites
        }
      } catch (e) {
        log.error('loadInvites failed', { error: String(e) })
      }
    },
    async loadGrants(this: any) {
      const url = this.apiUrls && this.apiUrls.accessGrants
      if (!url) return
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        const data = await res.json()
        if (data && data.success && Array.isArray(data.grants)) {
          this.grants = data.grants
        }
      } catch (e) {
        log.error('loadGrants failed', { error: String(e) })
      }
    },
    openCreateInvite(this: any) {
      this.createModal = { note: '', submitting: false, error: '', result: null }
    },
    closeCreateInvite(this: any) {
      this.createModal = null
      this.loadInvites()
    },
    onCreateInviteNote(this: any, value: string) {
      if (this.createModal) this.createModal.note = value
    },
    async submitCreateInvite(this: any) {
      const url = this.apiUrls && this.apiUrls.accessGenerateInvite
      if (!url || !this.createModal || this.createModal.submitting) return
      this.createModal.submitting = true
      this.createModal.error = ''
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: this.createModal.note || '' })
        })
        const data = await res.json().catch(() => ({}))
        if (data && data.success && data.fullUrl) {
          this.createModal.result = { fullUrl: data.fullUrl }
        } else {
          this.createModal.error = (data && data.error) || 'Не удалось создать ссылку'
        }
      } catch (e) {
        this.createModal.error = String(e)
      } finally {
        if (this.createModal) this.createModal.submitting = false
      }
    },
    async revokeInvite(this: any, inviteId: unknown) {
      const url = this.apiUrls && this.apiUrls.accessRevokeInvite
      if (!url || !inviteId) return
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId })
        })
        this.loadInvites()
      } catch (e) {
        log.error('revokeInvite failed', { error: String(e) })
      }
    },
    async revokeGrant(this: any, userId: unknown) {
      const url = this.apiUrls && this.apiUrls.accessRevokeGrant
      if (!url || !userId) return
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        this.loadGrants()
      } catch (e) {
        log.error('revokeGrant failed', { error: String(e) })
      }
    }
  }
}
