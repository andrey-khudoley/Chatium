// @shared
/**
 * Методы домашней панели Payments Client (loaders для analytics/requests/webhooks,
 * управление доступом, raw-модалка, поиск, фильтр по дате, отправка запросов
 * к выбранному гейтвею, загрузка qrcode.js). Вынесены из HomePage.vue в mixin
 * ради лимита размера файла; `this` — экземпляр HomePage (Options API).
 */
import { generateCorrelationId, appendCorrelationId } from '../shared/correlation'
import { msToLocalDate, msToLocalTime } from '../shared/sbpHomeFormat'
import {
  findClientOperation,
  buildArgs,
  validateForm,
  buildEmptyForm,
  buildGcOperationDescriptor,
  type ClientOperationDescriptor,
  type GcOperationEntry
} from '../shared/operationsClientCatalog'
import { isGatewayId, type GatewayId } from '../shared/invokeApi'
import {
  buildFormRows,
  buildArgsObject,
  buildFieldErrors,
  type FormRow
} from '../shared/gcArgsForm'

/**
 * Найти descriptor для пары (gatewayId, op):
 *   - GC: ищем в SSR-пропе `gcOperations` (динамический каталог);
 *   - остальные: ищем в статическом `OPERATIONS_CLIENT_CATALOG`.
 */
function findDescriptor(
  gatewayId: GatewayId,
  op: string,
  gcOperations: GcOperationEntry[]
): ClientOperationDescriptor | null {
  if (gatewayId === 'gc') {
    const entry = (gcOperations || []).find((e) => e.op === op)
    return entry ? buildGcOperationDescriptor(entry) : null
  }
  return findClientOperation(gatewayId, op)
}

const REFRESH_INTERVAL_MS = 15000

/** Найти `GcOperationEntry` по composite-ключу `gc:<op>` в SSR-пропе. */
function findGcEntryByKey(
  currentOperationKey: string,
  gcOperations: GcOperationEntry[]
): GcOperationEntry | null {
  const idx = (currentOperationKey || '').indexOf(':')
  if (idx <= 0) return null
  const gw = currentOperationKey.slice(0, idx)
  if (gw !== 'gc') return null
  const op = currentOperationKey.slice(idx + 1)
  return (gcOperations || []).find((e) => e.op === op) ?? null
}

/**
 * Готовит payload (`args`) и ошибки валидации для GC-запроса.
 * Если `rootKind !== 'object'` — берёт сырой JSON из `__root__` и парсит.
 * Иначе валидирует листья через `buildFieldErrors` и собирает вложенный объект
 * через `buildArgsObject`. При ошибках возвращает `{ errors }`, кнопка submit
 * должна отрисовать их в `gcErrors`.
 */
function prepareGcSubmit(
  rootKind: string,
  formRows: FormRow[],
  argsValues: Record<string, string>
):
  | { ok: true; args: unknown; errors: Record<string, string> }
  | { ok: false; errors: Record<string, string> } {
  if (rootKind !== 'object') {
    const rawRoot = String(argsValues?.__root__ ?? '').trim()
    if (!rawRoot) return { ok: false, errors: { __root__: 'Обязательное поле (JSON-тело).' } }
    try {
      return { ok: true, args: JSON.parse(rawRoot), errors: {} }
    } catch {
      return { ok: false, errors: { __root__: 'Невалидный JSON.' } }
    }
  }
  // Третий аргумент `buildFieldErrors` (requiredHeaders) на клиенте всегда `[]`:
  // заголовки школы ставит сервер (`gcClient.ts`), клиент в них не участвует.
  const errs = buildFieldErrors(formRows, argsValues || {}, [])
  if (Object.keys(errs).length > 0) return { ok: false, errors: errs }
  return { ok: true, args: buildArgsObject(formRows, argsValues || {}), errors: {} }
}

export const sbpHomePageMethodsMixin = {
  computed: {
    /** Текущая операция — GC? Производное от composite-ключа `gatewayId:op`. */
    isGcOp(this: any): boolean {
      const key: string = this.currentOperationKey || ''
      const idx = key.indexOf(':')
      if (idx <= 0) return false
      return key.slice(0, idx) === 'gc'
    },
    /** Запись из SSR-пропа `gcOperations` для текущей GC-операции. */
    gcEntry(this: any): GcOperationEntry | null {
      if (!this.isGcOp) return null
      return findGcEntryByKey(this.currentOperationKey, this.gcOperations || [])
    },
    /** Плоский список рядов формы (groups + leaves) из `argsTree` текущей GC-операции. */
    gcFormRows(this: any): FormRow[] {
      return buildFormRows(this.gcEntry?.argsTree ?? null)
    },
    /**
     * Тип корня `argsTree`. Если `argsTree` отсутствует — `'object'` (поведение
     * как при пустой схеме). При `kind !== 'object'` форма рендерит одно
     * textarea-поле `__root__` с произвольным JSON.
     */
    gcRootKind(this: any): string {
      return this.gcEntry?.argsTree?.kind ?? 'object'
    }
  },
  methods: {
    /* ====== Маршрутизация загрузок по вкладкам ====== */
    loadForTab(this: any, tab: string) {
      if (tab === 'overview') {
        this.loadAnalytics()
        this.loadRequests()
        this.loadWebhooks()
      } else if (tab === 'requests') {
        this.loadRequests()
      } else if (tab === 'webhooks') {
        this.loadWebhooks()
      } else if (tab === 'access') {
        if (this.isAdmin) this.loadAccess()
      }
    },
    startAutoRefresh(this: any) {
      this.stopAutoRefresh()
      this.refreshTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        this.loadForTab(this.activeTab)
      }, REFRESH_INTERVAL_MS)
    },
    stopAutoRefresh(this: any) {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    /* ====== Управление доступом (Admin) ====== */
    async loadAccess(this: any) {
      this.accessError = ''
      try {
        const [invRes, grRes] = await Promise.all([
          fetch(this.apiUrls?.accessInvites, { headers: { Accept: 'application/json' } }),
          fetch(this.apiUrls?.accessGrants, { headers: { Accept: 'application/json' } })
        ])
        const invData = await invRes.json().catch(() => ({}))
        const grData = await grRes.json().catch(() => ({}))
        this.invites = invData && invData.success ? invData.invites || [] : []
        this.grants = grData && grData.success ? grData.grants || [] : []
        if (!(invData && invData.success) || !(grData && grData.success)) {
          this.accessError = 'Не удалось загрузить данные доступа.'
        }
      } catch (e) {
        this.accessError = 'Не удалось загрузить данные доступа.'
      }
    },
    openInviteModal(this: any) {
      this.inviteModal = { note: '', creating: false, error: '', result: null }
    },
    closeInviteModal(this: any) {
      this.inviteModal = null
      this.loadAccess()
    },
    onInviteNote(this: any, value: string) {
      if (this.inviteModal) this.inviteModal.note = value
    },
    async createInvite(this: any) {
      if (!this.inviteModal || this.inviteModal.creating) return
      this.inviteModal.creating = true
      this.inviteModal.error = ''
      try {
        const resp = await fetch(this.apiUrls?.accessGenerateInvite, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: this.inviteModal.note || '' })
        })
        const data = await resp.json().catch(() => ({}))
        if (data && data.success) {
          this.inviteModal.result = { fullUrl: data.fullUrl, expiresAt: data.expiresAt }
        } else {
          this.inviteModal.error = (data && data.error) || 'Не удалось создать ссылку.'
        }
      } catch (e) {
        this.inviteModal.error = 'Не удалось создать ссылку.'
      } finally {
        if (this.inviteModal) this.inviteModal.creating = false
      }
    },
    async revokeInvite(this: any, inviteId: string) {
      try {
        await fetch(this.apiUrls?.accessRevokeInvite, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId })
        })
      } catch (e) {
        // ignore — обновим список ниже
      }
      this.loadAccess()
    },
    async revokeGrant(this: any, userId: string) {
      try {
        await fetch(this.apiUrls?.accessRevokeGrant, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
      } catch (e) {
        // ignore — обновим список ниже
      }
      this.loadAccess()
    },

    /* ====== Raw payload modal ====== */
    async openRaw(this: any, kind: string, id: string | number) {
      // kind === 'request' → apiUrls.rawRequest, kind === 'webhook' → apiUrls.rawWebhook
      const url = kind === 'webhook' ? this.apiUrls?.rawWebhook : this.apiUrls?.rawRequest
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
            error: data?.error || 'Ошибка загрузки'
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

    /* ====== Search & lookup ====== */
    clearSearch(this: any) {
      this.searchValue = ''
      this.searchResult = null
      this.searchedQuery = ''
    },
    lookupRequest(this: any, requestId: string) {
      if (!requestId) return
      this.searchValue = requestId
      this.doSearch()
    },
    async doSearch(this: any) {
      const url = this.apiUrls?.searchByRequestId
      const q = (this.searchValue || '').trim()
      if (!url || !q) return
      this.searchedQuery = q
      try {
        const resp = await fetch(url + '?requestId=' + encodeURIComponent(q))
        const data = await resp.json()
        this.searchResult = data.success ? data : { request: null, webhooks: [] }
      } catch (_e) {
        this.searchResult = { request: null, webhooks: [] }
      }
    },

    /* ====== Data loaders ====== */
    async loadAnalytics(this: any) {
      const url = this.apiUrls?.analyticsSummary
      if (!url) return
      try {
        const resp = await fetch(url)
        const data = await resp.json()
        if (data.success) this.analytics = data
        this.lastUpdated.analytics = Date.now()
      } catch (_e) {
        // keep prior data
      }
    },
    async loadRequests(this: any) {
      const url = this.apiUrls?.recentRequests
      if (!url) return
      try {
        const resp = await fetch(url + '?limit=50')
        const data = await resp.json()
        if (data.success) this.requests = data.entries || []
        this.lastUpdated.requests = Date.now()
      } catch (_e) {
        // keep prior data
      }
    },
    async loadWebhooks(this: any) {
      const url = this.apiUrls?.recentWebhooks
      if (!url) return
      try {
        const resp = await fetch(url + '?limit=50')
        const data = await resp.json()
        if (data.success) this.webhooks = data.entries || []
        this.lastUpdated.webhooks = Date.now()
      } catch (_e) {
        // keep prior data
      }
    },

    /* ====== Date filter ====== */
    onFilterChange(this: any) {
      this.saveDateFilter()
    },
    applySavedFilter(this: any, saved: { from?: number; to?: number } | null | undefined) {
      const from = saved && typeof saved.from === 'number' ? saved.from : null
      const to = saved && typeof saved.to === 'number' ? saved.to : null
      this.fromDate = msToLocalDate(from)
      this.fromTime = msToLocalTime(from)
      this.toDate = msToLocalDate(to)
      this.toTime = msToLocalTime(to)
    },
    async saveDateFilter(this: any) {
      const url = this.apiUrls?.filterSave
      if (!url) return
      const from = this.fromMs
      const to = this.toMs
      // Клиентская проверка диапазона до запроса — не шлём заведомо невалидное.
      if (from !== null && to !== null && from > to) {
        this.dateFilterError = 'Дата начала не может быть позже даты окончания'
        return
      }
      this.dateFilterError = ''
      this.dateFilterSaving = true
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to })
        })
        const data = await resp.json()
        if (!resp.ok || !data.success) {
          this.dateFilterError = (data && data.error) || 'Не удалось сохранить фильтр'
          return
        }
        // Источник истины — сервер: синхронизируем поля с сохранённым фильтром.
        this.applySavedFilter(data.filter || {})
        this.searchResult = null
        this.loadForTab(this.activeTab)
      } catch (e) {
        this.dateFilterError = 'Ошибка сети при сохранении фильтра'
      } finally {
        this.dateFilterSaving = false
      }
    },
    resetDateFilter(this: any) {
      this.fromDate = ''
      this.fromTime = ''
      this.toDate = ''
      this.toTime = ''
      this.saveDateFilter()
    },

    /* ====== Отправка запроса к выбранному гейтвею + QR ====== */
    resetRequestResult(this: any) {
      this.requestResult = null
    },
    onChangeOperationKey(this: any, key: string) {
      // Смена операции — пересоздаём форму с дефолтами новой операции,
      // включая SSR-предзаполнения callbackUrl (webhookUrl / webhookUrlLavatop).
      this.currentOperationKey = key
      const idx = (key || '').indexOf(':')
      if (idx <= 0) return
      const gw = key.slice(0, idx)
      const op = key.slice(idx + 1)
      if (!isGatewayId(gw)) return
      // Для GC: форма рендерится по argsTree через computed `gcFormRows`,
      // отдельный `requestForm` не пересоздаём. Сбрасываем GC-состояние.
      if (gw === 'gc') {
        this.gcArgsValues = {}
        this.gcErrors = {}
        this.requestResult = null
        return
      }
      const descriptor = findDescriptor(gw, op, this.gcOperations || [])
      if (!descriptor) return
      this.requestForm = buildEmptyForm(descriptor, {
        webhookUrl: this.webhookUrl,
        webhookUrlLavatop: this.webhookUrlLavatop
      })
      this.requestResult = null
    },
    async submitRequest(this: any) {
      const url = this.apiUrls?.invoke
      if (!url) return
      const key: string = this.currentOperationKey || ''
      const idx = key.indexOf(':')
      if (idx <= 0) return
      const gw = key.slice(0, idx)
      if (!isGatewayId(gw)) return
      const gatewayId = gw as GatewayId
      const op = key.slice(idx + 1)
      const descriptor = findDescriptor(gatewayId, op, this.gcOperations || [])
      if (!descriptor) return

      // Для GC — отдельная ветка: валидация и сборка args по argsTree через
      // хелпер `prepareGcSubmit`. При rootKind !== 'object' тело берётся как
      // сырой JSON из `__root__`, иначе — buildArgsObject по дереву.
      let args: unknown
      if (gatewayId === 'gc') {
        const prepared = prepareGcSubmit(this.gcRootKind, this.gcFormRows, this.gcArgsValues || {})
        if (!prepared.ok) {
          this.gcErrors = prepared.errors
          this.requestResult = {
            ok: false,
            gatewayId,
            op,
            error: {
              code: 'CLIENT_VALIDATION_FAILED',
              message: 'Заполните обязательные поля и исправьте ошибки формы.'
            },
            requestId: null
          }
          return
        }
        this.gcErrors = {}
        args = prepared.args
      } else {
        // Клиентская валидация для LifePay/Lava.Top — по плоским полям.
        const errors = validateForm(descriptor, this.requestForm || {})
        if (Object.keys(errors).length > 0) {
          this.requestResult = {
            ok: false,
            gatewayId,
            op,
            error: {
              code: 'CLIENT_VALIDATION_FAILED',
              message: 'Заполните обязательные поля и исправьте ошибки формы.'
            },
            requestId: null
          }
          return
        }
        args = buildArgs(descriptor, this.requestForm || {})
      }

      this.requestLoading = true
      this.requestResult = null
      try {
        // Специфика LifePay.createBill: связка с входящим webhook через correlationId.
        // LifePay не возвращает наш orderNumber в webhook, поэтому генерируем ключ
        // и кладём его и в callbackUrl (query), и в args (сервер сохранит в request_log).
        // Для других операций — отправляем args как есть.
        if (gatewayId === 'lifepay' && op === 'createBill') {
          const argsObj = args as Record<string, unknown>
          const correlationId = generateCorrelationId()
          const cb = appendCorrelationId(String(argsObj.callbackUrl || ''), correlationId)
          argsObj.callbackUrl = cb.url
          argsObj.correlationId = correlationId
        }
        // Для GC передаём httpMethod в тело — без него `api/gateways/invoke.ts`
        // не сможет выбрать метод upstream (каталог GC динамический).
        const requestBody: Record<string, unknown> = { gatewayId, op, args }
        if (gatewayId === 'gc') requestBody.httpMethod = descriptor.httpMethod
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        const data = await resp.json()
        this.requestResult = { ...data, gatewayId, op }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        this.requestResult = {
          ok: false,
          gatewayId,
          op,
          error: { code: 'CLIENT_FETCH_ERROR', message },
          requestId: null
        }
      } finally {
        this.requestLoading = false
      }
    },
    loadQrcodeLib(this: any) {
      if (typeof window === 'undefined') return
      if ((window as any).QRCode) return
      // cdnjs хостит UMD-сборку, выставляющую window.QRCode.toCanvas (API node-qrcode).
      // Путь cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js не работает —
      // папка build/ не публикуется в npm-пакете и отдаётся как 404 text/plain.
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'
      s.async = true
      document.head.appendChild(s)
    }
  }
}
