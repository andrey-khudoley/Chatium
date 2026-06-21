<script setup lang="ts">
/**
 * Вкладка «Страница оплаты» главной панели.
 *
 * Позволяет настраивать визуальный конфиг встраиваемой страницы оплаты:
 *   - Общий блок: enabled, accentColor, calloutHtml.
 *   - Таблица методов: enabled, min/max, imageUrl, label (текст кнопки), caption (подпись под
 *     методом), resolver, фильтр офферов и скрытие при частичной оплате.
 *   - Секция и порядок — задаются DnD-перетаскиванием или мобайл-кнопками ↑/↓ + select секции.
 *   - Форма добавления кастомного метода.
 *   - Удаление кастомных методов (isSystem=false).
 *   - Сниппет встраивания: тег <script> лоадера + пример прелоадера-оверлея.
 *
 * Данные загружаются через SSR-пропсы (initialPaymentPageGeneral/Methods).
 * Сохранение — через paymentPageSettingsSaveRoute.run(ctx, {key, value}).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { getThumbnailUrl, obtainStorageFilePutUrl } from '@app/storage'
import { paymentPageSettingsSaveRoute } from '../../api/payment-page/settings-save'
import { paymentPageMethodCreateRoute } from '../../api/payment-page/method-create'
import { paymentPageMethodDeleteRoute } from '../../api/payment-page/method-delete'
import { paymentPageMethodRenameRoute } from '../../api/payment-page/method-rename'
import { widgetOffersRoute } from '../../api/widgets/offers'
import { useSettingsAutoSave, type AutoSaveResult } from '../../shared/useSettingsAutoSave'
import {
  PAYMENT_PAGE_SECTIONS,
  PAYMENT_PAGE_SETTING_KEYS,
  PAYMENT_PAGE_DEFAULT_ACCENT,
  PAYMENT_PAGE_DEFAULT_LOGO_WIDTH,
  PAYMENT_PAGE_MIN_LOGO_WIDTH,
  PAYMENT_PAGE_MAX_LOGO_WIDTH,
  isValidHexColor,
  isValidMethodId,
  isPaymentPageSection,
  parsePaymentPageGeneral,
  parsePaymentPageMethodRecord,
  type PaymentPageGeneralConfig,
  type PaymentPageMethodRecord,
  type PaymentPageMenuItem,
  type PaymentPageSection,
  type PaymentPageInteractionMode
} from '../../shared/paymentPageTypes'
import type { AllowedOffer, WidgetOfferListType } from '../../shared/widgetSettingsTypes'
import { createComponentLogger } from '../../shared/logger'
import PaymentMethodOfferList from './HomeWidgetOfferList.vue'

const log = createComponentLogger('HomePaymentPageTab')

declare const ctx: app.Ctx

type CreateResult = { success?: boolean; error?: string; method?: PaymentPageMethodRecord }
type DeleteResult = { success?: boolean; error?: string }
type RenameResult = { success?: boolean; error?: string; method?: PaymentPageMethodRecord }

const props = defineProps<{
  initialPaymentPageGeneral?: PaymentPageGeneralConfig | null
  initialPaymentPageMethods?: PaymentPageMethodRecord[] | null
  anchorBaseUrl?: string
  loaderUrl?: string
}>()

/* ======= Общие настройки ======= */

const defaultGeneral: PaymentPageGeneralConfig = parsePaymentPageGeneral(null)

const generalEnabled = ref<boolean>(
  props.initialPaymentPageGeneral?.enabled ?? defaultGeneral.enabled
)
const generalAccentColor = ref<string>(
  props.initialPaymentPageGeneral?.accentColor ?? defaultGeneral.accentColor
)
const generalCalloutHtml = ref<string>(props.initialPaymentPageGeneral?.calloutHtml ?? '')
const generalLogoUrl = ref<string>(
  props.initialPaymentPageGeneral?.logoUrl ?? defaultGeneral.logoUrl
)
const generalLogoWidth = ref<number>(
  props.initialPaymentPageGeneral?.logoWidth ?? defaultGeneral.logoWidth
)
const generalDefaultMethod = ref<string>(
  props.initialPaymentPageGeneral?.defaultMethod ?? defaultGeneral.defaultMethod
)
const calloutEditorRef = ref<HTMLElement | null>(null)
const logoFileInputRef = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const logoUploadError = ref('')

function onCalloutInput() {
  if (!calloutEditorRef.value) return
  generalCalloutHtml.value = calloutEditorRef.value.innerHTML
}

function execBold() {
  document.execCommand('bold')
  onCalloutInput()
}
function execItalic() {
  document.execCommand('italic')
  onCalloutInput()
}
function execCalloutLink() {
  const url = window.prompt('URL ссылки:', 'https://')
  if (url) document.execCommand('createLink', false, url)
  onCalloutInput()
}
function execCalloutList() {
  document.execCommand('insertUnorderedList')
  onCalloutInput()
}

function normalizeLogoWidthInput(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return PAYMENT_PAGE_DEFAULT_LOGO_WIDTH
  return Math.min(PAYMENT_PAGE_MAX_LOGO_WIDTH, Math.max(PAYMENT_PAGE_MIN_LOGO_WIDTH, Math.floor(n)))
}

function toAbsoluteLogoUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

async function onLogoFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  logoUploadError.value = ''
  if (!file.type.startsWith('image/')) {
    logoUploadError.value = 'Выберите файл изображения'
    input.value = ''
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    logoUploadError.value = 'Файл должен быть не больше 3 МБ'
    input.value = ''
    return
  }

  logoUploading.value = true
  try {
    const uploadUrl = await obtainStorageFilePutUrl(ctx, { protected: false })
    const formData = new FormData()
    formData.append('Filedata', file)

    const res = await fetch(uploadUrl, { method: 'POST', body: formData })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)

    const hash = (await res.text()).trim()
    if (!hash) throw new Error('Storage returned empty hash')

    generalLogoUrl.value = toAbsoluteLogoUrl(getThumbnailUrl(ctx, hash, 1200))
    generalLogoWidth.value = normalizeLogoWidthInput(generalLogoWidth.value)
    log.notice('Логотип страницы оплаты загружен', { fileName: file.name, size: file.size })
  } catch (e) {
    logoUploadError.value = 'Не удалось загрузить логотип'
    log.error('Ошибка загрузки логотипа страницы оплаты', (e as Error)?.message || String(e))
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

function clearPaymentPageLogo() {
  generalLogoUrl.value = ''
  logoUploadError.value = ''
  if (logoFileInputRef.value) logoFileInputRef.value.value = ''
}

/* ======= Методы (Record по methodKey) ======= */

function buildInitialMethods(): Record<string, PaymentPageMethodRecord> {
  const result: Record<string, PaymentPageMethodRecord> = {}
  const src = props.initialPaymentPageMethods
  if (!src || !Array.isArray(src)) return result
  for (const rec of src) {
    if (rec && typeof rec === 'object' && typeof rec.methodKey === 'string' && rec.methodKey) {
      result[rec.methodKey] = parsePaymentPageMethodRecord({
        ...rec,
        // Убеждаемся, что resolver передан как объект
        resolver: rec.resolver ?? { type: 'id', value: rec.methodKey }
      })
    }
  }
  return result
}

const methods = ref<Record<string, PaymentPageMethodRecord>>(buildInitialMethods())

/* ======= Автосохранение по мере изменения ======= */

// Сообщение об ошибке удаления метода (создание/удаление — отдельные роуты).
const message = ref('')
const isError = ref(false)

const savePaymentPageSetting = (key: string, value: unknown) =>
  paymentPageSettingsSaveRoute.run(ctx, { key, value }) as Promise<AutoSaveResult>

const {
  saving,
  saveStatus,
  error: saveError,
  queue,
  flush
} = useSettingsAutoSave({ save: savePaymentPageSetting })

function buildGeneralPayload(): PaymentPageGeneralConfig {
  return {
    enabled: generalEnabled.value,
    accentColor: generalAccentColor.value,
    calloutHtml: generalCalloutHtml.value,
    logoUrl: generalLogoUrl.value.trim(),
    logoWidth: normalizeLogoWidthInput(generalLogoWidth.value),
    defaultMethod: generalDefaultMethod.value
  }
}

// Общие настройки хранятся одним объектом (ключ GENERAL) — при любой правке
// поля сохраняем весь объект. Невалидный hex не отправляем (показываем подсказку у поля).
function queueGeneral() {
  if (!isValidHexColor(generalAccentColor.value)) return
  queue(PAYMENT_PAGE_SETTING_KEYS.GENERAL, buildGeneralPayload())
}

// Тумблер «страница включена» сохраняем немедленно; при ошибке откатываем.
async function onGeneralEnabledChange() {
  if (!isValidHexColor(generalAccentColor.value)) return
  const prev = !generalEnabled.value
  const ok = await flush(PAYMENT_PAGE_SETTING_KEYS.GENERAL, buildGeneralPayload())
  if (!ok) generalEnabled.value = prev
}

watch(generalAccentColor, queueGeneral)
watch(generalCalloutHtml, queueGeneral)
watch(generalLogoUrl, queueGeneral)
watch(generalLogoWidth, queueGeneral)
watch(generalDefaultMethod, queueGeneral)

// Любая правка метода (вкл/лимиты/подпись/изображение/резолвер/секция/порядок/офферы)
// уходит debounce-bulk-update'ом массива методов. Создание/удаление идут отдельными
// роутами, но их мутации methods.value тоже попадут сюда — это идемпотентный
// upsert по methodKey (роут METHODS обновляет существующие строки, не удаляет лишние).
//
// Флаг подавления: при добавлении метода create уже персистит строку целиком (включая
// order), поэтому немедленный bulk-autosave только что созданного метода не нужен — и
// мог бы прислать его на сервер раньше, чем зафиксируется create (гонка двух запросов).
// Подавляем ровно одну сработку watch после addMethod.
let suppressMethodsWatch = false
watch(
  methods,
  () => {
    if (suppressMethodsWatch) {
      suppressMethodsWatch = false
      return
    }
    queue(PAYMENT_PAGE_SETTING_KEYS.METHODS, Object.values(methods.value))
  },
  { deep: true }
)

/* ======= Форма добавления кастомного метода ======= */

const newMethodName = ref('')
const newMethodId = ref('')
const newMethodSection = ref<PaymentPageSection>('pay')
const addMethodSaving = ref(false)
const addMethodError = ref('')
const addMethodSuccess = ref('')

// Regex для клиентской валидации id — дублирует isValidMethodId из shared
const METHOD_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/

async function addMethod() {
  addMethodError.value = ''
  addMethodSuccess.value = ''
  addMethodSaving.value = true
  try {
    const idTrimmed = newMethodId.value.trim()
    // Клиентская валидация id до отправки
    if (!METHOD_ID_RE.test(idTrimmed)) {
      addMethodError.value =
        'id должен начинаться с буквы и содержать только буквы, цифры, дефисы и подчёркивания'
      log.error('Ошибка валидации id метода', addMethodError.value)
      return
    }
    // Порядок нового метода вычисляем ДО создания (конец его секции = max+1) и
    // передаём в create, чтобы сервер сразу персистил корректный order, а не 0.
    const targetSection = newMethodSection.value
    const newOrder =
      Object.values(methods.value)
        .filter((m) => m.section === targetSection)
        .reduce((max, m) => (m.order > max ? m.order : max), -1) + 1
    const res = (await paymentPageMethodCreateRoute.run(ctx, {
      name: newMethodName.value.trim(),
      id: idTrimmed,
      section: targetSection,
      order: newOrder
    })) as CreateResult
    if (res?.success === false) {
      addMethodError.value = res.error || 'Ошибка создания метода'
      log.error('Ошибка добавления метода', addMethodError.value)
      return
    }
    if (res?.success === true && res.method) {
      // record приходит полным (включая customScript/menuItems/resolver) — парсим напрямую
      const rec = parsePaymentPageMethodRecord(res.method)
      // Метод уже персистён сервером целиком (включая order) — подавляем немедленный
      // bulk-autosave этой мутации, чтобы не слать только что созданную строку второй
      // раз и не ловить гонку с ещё не зафиксированным create.
      suppressMethodsWatch = true
      methods.value = { ...methods.value, [rec.methodKey]: rec }
      // Раскрываем секцию нового метода
      expandedGroups.value = { ...expandedGroups.value, [rec.section]: true }
      addMethodSuccess.value = `Метод "${rec.methodKey}" добавлен`
      // Сбрасываем форму
      newMethodName.value = ''
      newMethodId.value = ''
      newMethodSection.value = 'pay'
      log.notice('Кастомный метод добавлен', { methodKey: rec.methodKey })
    }
  } catch (e) {
    addMethodError.value = (e as Error)?.message || String(e)
    log.error('Исключение при добавлении метода', addMethodError.value)
  } finally {
    addMethodSaving.value = false
  }
}

/* ======= Переименование кастомного метода ======= */

// Хранит значение нового id в поле rename для каждого methodKey
const renameInputs = ref<Record<string, string>>({})
const renameSaving = ref<Record<string, boolean>>({})
const renameError = ref<Record<string, string>>({})

function getRenameInput(methodKey: string): string {
  return renameInputs.value[methodKey] ?? methodKey
}

function setRenameInput(methodKey: string, val: string) {
  renameInputs.value = { ...renameInputs.value, [methodKey]: val }
}

async function renameMethod(oldKey: string) {
  const newKey = getRenameInput(oldKey).trim()
  // Клиентская валидация
  if (!isValidMethodId(newKey)) {
    renameError.value = {
      ...renameError.value,
      [oldKey]:
        'id должен начинаться с буквы и содержать только буквы, цифры, дефисы и подчёркивания'
    }
    return
  }
  if (newKey === oldKey) {
    renameError.value = { ...renameError.value, [oldKey]: 'Новый id совпадает со старым' }
    return
  }
  if (Object.keys(methods.value).includes(newKey)) {
    renameError.value = { ...renameError.value, [oldKey]: 'Метод с таким id уже существует' }
    return
  }
  renameError.value = { ...renameError.value, [oldKey]: '' }
  renameSaving.value = { ...renameSaving.value, [oldKey]: true }
  try {
    // Сбрасываем накопленную debounce-очередь методов ДО смены ключа,
    // чтобы pending-правки (caption/label/customScript) ушли на сервер со СТАРЫМ ключом.
    const flushOk = await flush(PAYMENT_PAGE_SETTING_KEYS.METHODS, Object.values(methods.value))
    if (!flushOk) {
      renameError.value = {
        ...renameError.value,
        [oldKey]: 'Не удалось сохранить изменения перед переименованием'
      }
      log.error('Flush методов перед rename вернул false', { oldKey })
      return
    }

    const res = (await paymentPageMethodRenameRoute.run(ctx, {
      oldMethodKey: oldKey,
      newMethodKey: newKey
    })) as RenameResult
    if (res?.success === false) {
      renameError.value = { ...renameError.value, [oldKey]: res.error || 'Ошибка переименования' }
      log.error('Ошибка переименования метода', res.error ?? '')
      return
    }
    if (res?.success === true && res.method) {
      const rec = parsePaymentPageMethodRecord(res.method)
      // Атомарно перестраиваем Record: удаляем старый ключ, добавляем новый.
      // methods.value обновляем ПЕРВЫМ (с suppressMethodsWatch), чтобы новый ключ
      // уже был в methods.value когда watch [defaultMethodGroups, generalDefaultMethod]
      // проверит exists — иначе сброс дефолта в '' при переносе.
      const next: Record<string, PaymentPageMethodRecord> = { ...methods.value }
      delete next[oldKey]
      next[newKey] = rec
      // Переносим expandedMethods
      if (expandedMethods.value[oldKey]) {
        const em = { ...expandedMethods.value }
        delete em[oldKey]
        em[newKey] = true
        expandedMethods.value = em
      }
      // Обновляем renameInputs: убираем старый ключ
      const ri = { ...renameInputs.value }
      delete ri[oldKey]
      renameInputs.value = ri
      // Подавляем один watch (методы уже персистены сервером)
      suppressMethodsWatch = true
      methods.value = next
      // Переносим дефолт ПОСЛЕ того, как новый ключ попал в methods.value.
      // Теперь watch [defaultMethodGroups, generalDefaultMethod] найдёт новый ключ
      // в exists и не сбросит дефолт в ''.
      if (generalDefaultMethod.value === oldKey) {
        generalDefaultMethod.value = newKey
        // Ставим general в очередь автосейва с обновлённым дефолтом
        queue(PAYMENT_PAGE_SETTING_KEYS.GENERAL, buildGeneralPayload())
      }
      log.notice('Кастомный метод переименован', { oldKey, newKey })
    }
  } catch (e) {
    renameError.value = {
      ...renameError.value,
      [oldKey]: (e as Error)?.message || String(e)
    }
    log.error('Исключение при переименовании метода', (e as Error)?.message || String(e))
  } finally {
    renameSaving.value = { ...renameSaving.value, [oldKey]: false }
  }
}

/* ======= Удаление кастомного метода ======= */

const deletingMethodKey = ref<string | null>(null)

async function deleteMethod(methodKey: string) {
  deletingMethodKey.value = methodKey
  try {
    const res = (await paymentPageMethodDeleteRoute.run(ctx, { methodKey })) as DeleteResult
    if (res?.success === false) {
      log.error('Ошибка удаления метода', res.error ?? '')
      message.value = res.error || 'Ошибка удаления метода'
      isError.value = true
      return
    }
    // Убираем из state
    const next = { ...methods.value }
    delete next[methodKey]
    methods.value = next
    log.notice('Кастомный метод удалён', { methodKey })
  } catch (e) {
    log.error('Исключение при удалении метода', (e as Error)?.message || String(e))
    message.value = (e as Error)?.message || String(e)
    isError.value = true
  } finally {
    deletingMethodKey.value = null
  }
}

/* ======= Офферы ======= */

type OffersLoadResult = {
  success?: boolean
  offers?: { id: string; name: string; price?: number }[]
  error?: string
}

async function loadOffers(): Promise<OffersLoadResult> {
  return (await widgetOffersRoute.run(ctx)) as OffersLoadResult
}

const offerErrorHints: Record<string, string> = {
  GC_DISABLED:
    'GetCourse-интеграция выключена. Включите её в разделе «Настройки», чтобы получить список офферов.',
  GC_NOT_CONFIGURED: 'Не заполнены секреты GetCourse. Их задаёт администратор в разделе /web/admin.'
}

function getMethodOffers(id: string): AllowedOffer[] {
  return methods.value[id]?.offers ?? []
}
function getMethodOfferListType(id: string): WidgetOfferListType {
  return methods.value[id]?.offerListType ?? 'off'
}
function setMethodOffers(id: string, offers: AllowedOffer[]) {
  if (methods.value[id]) {
    methods.value[id] = { ...methods.value[id], offers }
  }
}
function setMethodOfferListType(id: string, listType: WidgetOfferListType) {
  if (methods.value[id]) {
    methods.value[id] = { ...methods.value[id], offerListType: listType }
  }
}

/* ======= Сниппет встраивания ======= */

const loaderSnippet = computed(() => {
  const url = props.loaderUrl || '{URL загрузчика недоступен — обновите страницу}'
  return `<script src="${url}"><\/script>`
})

const svgPreloaderSnippet = `<div id="pp-preloader" style="position:fixed;inset:0;z-index:99998;background:#fff;display:flex;align-items:center;justify-content:center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="40" height="40" fill="none" stroke="#f85c50" stroke-width="4"><circle cx="25" cy="25" r="20" stroke-opacity="0.2"/><path d="M25 5a20 20 0 0 1 20 20"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/></path></svg>
</div>
<script>
  (function () {
    function hidePpPreloader() {
      var pp = document.getElementById('pp-preloader');
      if (pp) pp.style.display = 'none';
    }

    /* В редакторе конструктора GC (?editMode=1) прелоадер не показываем, даже если pp-loader.js не загрузится. */
    if (/[?&]editMode=1(?:&|$)/.test(location.search)) {
      hidePpPreloader();
      return;
    }

    function hideIfLoaderMissing() {
      if (!window.__PP_LOADER_STARTED__) hidePpPreloader();
    }

    if (document.readyState === 'complete') {
      setTimeout(hideIfLoaderMissing, 0);
    } else {
      window.addEventListener('load', function () {
        setTimeout(hideIfLoaderMissing, 0);
      }, { once: true });
    }
  })();
<\/script>`

const copied = ref<Record<string, boolean>>({})
const copyError = ref<Record<string, boolean>>({})

function markCopied(key: string) {
  copied.value = { ...copied.value, [key]: true }
  setTimeout(() => {
    copied.value = { ...copied.value, [key]: false }
  }, 1500)
}

function markCopyError(key: string, e: unknown) {
  log.error('Не удалось скопировать сниппет', (e as Error)?.message || String(e))
  copyError.value = { ...copyError.value, [key]: true }
  setTimeout(() => {
    copyError.value = { ...copyError.value, [key]: false }
  }, 1500)
}

// «Скопировано» показываем только при реальном успехе clipboard. В небезопасном
// контексте (http) или при отказе в правах промис отклонится — показываем ошибку,
// а не ложный успех. Отклонение промиса обязательно обрабатываем (.catch).
function copySnippet(key: string, text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    markCopyError(key, new Error('clipboard API недоступен'))
    return
  }
  navigator.clipboard.writeText(text).then(
    () => markCopied(key),
    (e) => markCopyError(key, e)
  )
}

/* ======= Расширение/свёртка методов ======= */

const expandedMethods = ref<Record<string, boolean>>({})
function toggleMethod(id: string) {
  expandedMethods.value = {
    ...expandedMethods.value,
    [id]: !expandedMethods.value[id]
  }
}

/* ======= Группы секций (аккордеон) ======= */

const expandedGroups = ref<Record<string, boolean>>(
  Object.fromEntries(PAYMENT_PAGE_SECTIONS.map((s) => [s, true]))
)

function toggleGroup(section: string) {
  const next = !expandedGroups.value[section]
  expandedGroups.value = { ...expandedGroups.value, [section]: next }
  log.debug('Группа методов переключена', { section, open: next })
}

function setAllGroups(open: boolean) {
  expandedGroups.value = Object.fromEntries(PAYMENT_PAGE_SECTIONS.map((s) => [s, open]))
}

const allGroupsExpanded = computed(() =>
  PAYMENT_PAGE_SECTIONS.every((s) => expandedGroups.value[s])
)

/* ======= Группировка методов по секциям ======= */

// id методов по секциям, отсортированы по order, затем по позиции в исходном массиве (стабильно).
const methodsBySection = computed<Record<PaymentPageSection, string[]>>(() => {
  const groups = Object.fromEntries(
    PAYMENT_PAGE_SECTIONS.map((sec) => [sec, [] as string[]])
  ) as Record<PaymentPageSection, string[]>

  const allKeys = Object.keys(methods.value)
  for (const id of allKeys) {
    const sec = methods.value[id]?.section
    if (sec && isPaymentPageSection(sec)) {
      groups[sec].push(id)
    } else {
      groups['pay'].push(id)
    }
  }
  for (const sec of PAYMENT_PAGE_SECTIONS) {
    groups[sec].sort((a, b) => {
      const oa = getMethod(a).order
      const ob = getMethod(b).order
      if (oa !== ob) return oa - ob
      return a < b ? -1 : a > b ? 1 : 0
    })
  }
  return groups
})

// счётчик включённых/всего по секции
const enabledCountBySection = computed<
  Record<PaymentPageSection, { enabled: number; total: number }>
>(() => {
  return Object.fromEntries(
    PAYMENT_PAGE_SECTIONS.map((sec) => {
      const ids = methodsBySection.value[sec]
      return [sec, { total: ids.length, enabled: ids.filter((id) => getMethod(id).enabled).length }]
    })
  ) as Record<PaymentPageSection, { enabled: number; total: number }>
})

/* ======= Метки секций ======= */

const sectionLabels: Record<string, string> = {
  recommended: 'Рекомендуемые',
  pay: 'Оплата',
  cards_rf: 'Карты РФ',
  cards_world: 'Карты мира',
  installments: 'Рассрочка',
  payparts: 'Оплата частями',
  noncash: 'Безналичный расчёт'
}

/* ======= Опции для «метод по умолчанию» ======= */

// Список методов для select «выделить по умолчанию», сгруппированный по секциям
// в порядке отображения. Включаем только enabled-методы: выделять по умолчанию
// скрытый метод бессмысленно (на странице он не отрисуется).
const defaultMethodGroups = computed<{ section: string; label: string; ids: string[] }[]>(() => {
  return PAYMENT_PAGE_SECTIONS.map((sec) => ({
    section: sec,
    label: sectionLabels[sec] ?? sec,
    ids: methodsBySection.value[sec].filter((id) => getMethod(id).enabled)
  })).filter((g) => g.ids.length > 0)
})

// Если выбранный по умолчанию метод исчез/выключен — сбрасываем в «не выделять»,
// чтобы не сохранять «висячий» ключ (автосейв подхватит изменение через watch).
watch([defaultMethodGroups, generalDefaultMethod], () => {
  const cur = generalDefaultMethod.value
  if (!cur) return
  const exists = defaultMethodGroups.value.some((g) => g.ids.includes(cur))
  if (!exists) generalDefaultMethod.value = ''
})

/** Методы, для которых показываем подсказку про допуск СБП/зарубежных оплат. */
const SBP_NOTICE_IDS = new Set(['sbp-pay', 'alpha-bank-podeli'])

/** Безопасный геттер метода: всегда возвращает объект (дефолт при отсутствии). */
function getMethod(id: string): PaymentPageMethodRecord {
  return (
    methods.value[id] ?? {
      methodKey: id,
      name: id,
      resolver: { type: 'id' as const, value: id },
      enabled: true,
      hideOnPartialPayment: false,
      hideOnTopUpPayment: false,
      isSystem: false,
      minAmount: 0,
      maxAmount: 0,
      imageUrl: '',
      section: 'pay' as const,
      order: 0,
      offerListType: 'off' as const,
      offers: [],
      label: '',
      caption: '',
      customScript: '',
      menuItems: [],
      interactionMode: 'standard' as const
    }
  )
}

function setMethodField<K extends keyof PaymentPageMethodRecord>(
  id: string,
  field: K,
  val: PaymentPageMethodRecord[K]
) {
  if (methods.value[id]) {
    methods.value[id] = { ...methods.value[id], [field]: val }
    if (field === 'section') {
      expandedGroups.value = { ...expandedGroups.value, [val as string]: true }
    }
  }
}

/* ======= DnD — живой предпросмотр + атомарное перестроение ======= */

const dragMethodId = ref<string | null>(null)
const dragFromSection = ref<PaymentPageSection | null>(null)
const dragOverSection = ref<PaymentPageSection | null>(null)
const dragOverBeforeId = ref<string | null>(null)

const displayedMethodsBySection = computed<Record<PaymentPageSection, string[]>>(() => {
  const base = methodsBySection.value
  const id = dragMethodId.value
  const target = dragOverSection.value
  if (!id || !target) return base
  const result = Object.fromEntries(
    PAYMENT_PAGE_SECTIONS.map((sec) => [sec, base[sec].filter((x) => x !== id)])
  ) as Record<PaymentPageSection, string[]>
  const arr = result[target]
  const beforeId = dragOverBeforeId.value
  const pos = beforeId ? arr.indexOf(beforeId) : -1
  if (pos >= 0) arr.splice(pos, 0, id)
  else arr.push(id)
  return result
})

function applyLayout(
  updates: { id: string; section: PaymentPageSection }[],
  sectionOrder: Record<string, string[]>
) {
  const next: Record<string, PaymentPageMethodRecord> = { ...methods.value }
  for (const u of updates) {
    const cur = next[u.id]
    if (cur) next[u.id] = { ...cur, section: u.section }
  }
  for (const sec of Object.keys(sectionOrder)) {
    const ids = sectionOrder[sec]
    if (ids) {
      ids.forEach((id, idx) => {
        const cur = next[id]
        if (cur) next[id] = { ...cur, order: idx }
      })
    }
  }
  methods.value = next
}

function onMethodDragStart(ev: DragEvent, id: string, section: PaymentPageSection) {
  dragMethodId.value = id
  dragFromSection.value = section
  dragOverSection.value = section
  const arr = methodsBySection.value[section]
  const idx = arr.indexOf(id)
  dragOverBeforeId.value = idx >= 0 && idx + 1 < arr.length ? (arr[idx + 1] ?? null) : null
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
  log.debug('DnD старт', { id, section })
}

function onMethodDragEnd() {
  dragMethodId.value = null
  dragFromSection.value = null
  dragOverSection.value = null
  dragOverBeforeId.value = null
}

function onRowDragOver(ev: DragEvent, section: PaymentPageSection, overId: string) {
  ev.preventDefault()
  dragOverSection.value = section
  if (overId === dragMethodId.value) return
  const el = ev.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const after = ev.clientY > rect.top + rect.height / 2
  if (after) {
    const arr = methodsBySection.value[section].filter((x) => x !== dragMethodId.value)
    const p = arr.indexOf(overId)
    dragOverBeforeId.value = p >= 0 && p + 1 < arr.length ? (arr[p + 1] ?? null) : null
  } else {
    dragOverBeforeId.value = overId
  }
}

function onBodyDragOver(ev: DragEvent, section: PaymentPageSection) {
  ev.preventDefault()
  dragOverSection.value = section
  dragOverBeforeId.value = null
}

function onHeadDragOver(ev: DragEvent, section: PaymentPageSection) {
  if (!dragMethodId.value) return
  ev.preventDefault()
  if (!expandedGroups.value[section]) {
    expandedGroups.value = { ...expandedGroups.value, [section]: true }
  }
  dragOverSection.value = section
  dragOverBeforeId.value = null
}

function onDrop(ev: DragEvent) {
  ev.preventDefault()
  const id = dragMethodId.value
  const target = dragOverSection.value
  if (!id || !target) {
    onMethodDragEnd()
    return
  }
  const from = dragFromSection.value
  const preview = displayedMethodsBySection.value
  const sectionOrder: Record<string, string[]> = { [target]: [...preview[target]] }
  if (from && from !== target) sectionOrder[from] = [...preview[from]]
  const updates: { id: string; section: PaymentPageSection }[] =
    from && from !== target ? [{ id, section: target }] : []
  log.debug('DnD дроп', { id, from, to: target })
  applyLayout(updates, sectionOrder)
  onMethodDragEnd()
}

/* ======= Мобайл/тач fallback (↑/↓ + смена секции) ======= */

function moveMethod(id: string, section: PaymentPageSection, delta: -1 | 1) {
  const ids = [...methodsBySection.value[section]]
  const idx = ids.indexOf(id)
  if (idx < 0) return
  const newIdx = idx + delta
  if (newIdx < 0 || newIdx >= ids.length) return
  const a = ids[idx]
  const b = ids[newIdx]
  if (a === undefined || b === undefined) return
  ids[idx] = b
  ids[newIdx] = a
  applyLayout([], { [section]: ids })
}

function onMoveSectionChange(ev: Event, id: string, _currentSection: PaymentPageSection) {
  const target = ev.target as HTMLSelectElement
  if (!(PAYMENT_PAGE_SECTIONS as readonly string[]).includes(target.value)) return
  const newSection = target.value as PaymentPageSection
  if (newSection === _currentSection) return
  const sourceIds = methodsBySection.value[_currentSection].filter((x) => x !== id)
  const targetIds = [...methodsBySection.value[newSection], id]
  applyLayout([{ id, section: newSection }], {
    [_currentSection]: sourceIds,
    [newSection]: targetIds
  })
  expandedGroups.value = { ...expandedGroups.value, [newSection]: true }
  target.value = _currentSection
}

/* ======= Обработчики полей метода ======= */

function onMethodEnabledChange(id: string, ev: Event) {
  setMethodField(id, 'enabled', (ev.target as HTMLInputElement).checked)
}
function onMethodPartialHideChange(id: string, ev: Event) {
  setMethodField(id, 'hideOnPartialPayment', (ev.target as HTMLInputElement).checked)
}
function onMethodTopUpHideChange(id: string, ev: Event) {
  setMethodField(id, 'hideOnTopUpPayment', (ev.target as HTMLInputElement).checked)
}
function onMethodNumberChange(id: string, field: 'minAmount' | 'maxAmount', ev: Event) {
  setMethodField(id, field, Number((ev.target as HTMLInputElement).value) || 0)
}
function onMethodTextInput(
  id: string,
  field: 'name' | 'label' | 'caption' | 'imageUrl',
  ev: Event
) {
  setMethodField(id, field, (ev.target as HTMLInputElement).value)
}

function onMethodInteractionModeChange(id: string, ev: Event) {
  const val = (ev.target as HTMLSelectElement).value
  const mode: PaymentPageInteractionMode = val === 'widget' ? 'widget' : 'standard'
  setMethodField(id, 'interactionMode', mode)
}

/* ======= Хелперы редактора menuItems ======= */

function addMenuItem(methodId: string) {
  const cur = getMethod(methodId)
  const newItems: PaymentPageMenuItem[] = [...cur.menuItems, { label: '', value: '' }]
  setMethodField(methodId, 'menuItems', newItems)
}

function updateMenuItem(methodId: string, idx: number, key: 'label' | 'value', val: string) {
  const cur = getMethod(methodId)
  const newItems: PaymentPageMenuItem[] = cur.menuItems.map((item, i) =>
    i === idx ? { ...item, [key]: val } : item
  )
  setMethodField(methodId, 'menuItems', newItems)
}

function removeMenuItem(methodId: string, idx: number) {
  const cur = getMethod(methodId)
  const newItems: PaymentPageMenuItem[] = cur.menuItems.filter((_, i) => i !== idx)
  setMethodField(methodId, 'menuItems', newItems)
}

onMounted(() => {
  log.info('Компонент смонтирован', {
    generalEnabled: generalEnabled.value,
    methodCount: Object.keys(methods.value).length
  })
  if (calloutEditorRef.value) {
    calloutEditorRef.value.innerHTML = generalCalloutHtml.value
  }
})
</script>

<template>
  <div class="st-tab">
    <form class="ap-set-form" @submit.prevent>
      <!-- Блок «Общие» -->
      <section class="panel-section st-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Страница оплаты — общие настройки</h2>
        </header>
        <p class="st-section-sub">
          Управление встраиваемой страницей оплаты. Лоадер-скрипт загружает конфиг с этого сервера и
          отображает методы оплаты на странице заказа.
        </p>

        <label class="st-toggle-row" for="pp-enabled-toggle">
          <span class="st-toggle">
            <input
              id="pp-enabled-toggle"
              v-model="generalEnabled"
              type="checkbox"
              @change="onGeneralEnabledChange"
            />
            <span class="st-toggle-slider"></span>
          </span>
          <span class="st-toggle-text">
            <span class="st-toggle-title">Страница оплаты включена</span>
            <span class="st-toggle-hint">
              Когда выключено — конфиг-эндпоинт возвращает enabled:false, страница не отображает
              методы.
            </span>
          </span>
          <span class="st-toggle-state" :class="generalEnabled ? 'is-on' : ''">
            {{ generalEnabled ? 'Включена' : 'Выключена' }}
          </span>
        </label>

        <div class="st-grid">
          <div>
            <label class="st-field-label" for="pp-accent-color">Акцентный цвет</label>
            <input
              id="pp-accent-color"
              v-model="generalAccentColor"
              type="text"
              class="st-input"
              :placeholder="PAYMENT_PAGE_DEFAULT_ACCENT"
              maxlength="7"
            />
            <p class="st-field-hint">
              Hex-формат, например {{ PAYMENT_PAGE_DEFAULT_ACCENT }}.
              <span
                v-if="generalAccentColor && !isValidHexColor(generalAccentColor)"
                style="color: var(--err)"
              >
                Невалидный hex.
              </span>
            </p>
          </div>
          <div class="st-field-full">
            <label class="st-field-label" for="pp-logo-file">Логотип над информацией</label>
            <div class="pp-logo-settings">
              <div class="pp-logo-upload">
                <input
                  id="pp-logo-file"
                  ref="logoFileInputRef"
                  type="file"
                  class="st-input"
                  accept="image/*"
                  :disabled="logoUploading"
                  @change="onLogoFileChange"
                />
                <button
                  v-if="generalLogoUrl"
                  type="button"
                  class="pp-callout-btn"
                  :disabled="logoUploading"
                  @click="clearPaymentPageLogo"
                >
                  Убрать логотип
                </button>
              </div>
              <div>
                <label class="st-field-label" for="pp-logo-width">Ширина, px</label>
                <input
                  id="pp-logo-width"
                  v-model.number="generalLogoWidth"
                  type="number"
                  class="st-input"
                  :min="PAYMENT_PAGE_MIN_LOGO_WIDTH"
                  :max="PAYMENT_PAGE_MAX_LOGO_WIDTH"
                  step="1"
                  @change="generalLogoWidth = normalizeLogoWidthInput(generalLogoWidth)"
                />
              </div>
              <div v-if="generalLogoUrl" class="pp-logo-preview">
                <img
                  :src="generalLogoUrl"
                  alt="Логотип страницы оплаты"
                  :style="{ width: normalizeLogoWidthInput(generalLogoWidth) + 'px' }"
                />
              </div>
            </div>
            <p class="st-field-hint">
              Показывается над заголовком «Оплата заказа». Допустимы изображения до 3 МБ, ширина —
              от {{ PAYMENT_PAGE_MIN_LOGO_WIDTH }} до {{ PAYMENT_PAGE_MAX_LOGO_WIDTH }} px.
              <span v-if="logoUploading">Загрузка…</span>
              <span v-if="logoUploadError" style="color: var(--err)">{{ logoUploadError }}</span>
            </p>
          </div>
        </div>

        <label class="st-field-label">Коллаут-блок над способами оплаты (HTML)</label>
        <div class="pp-callout-toolbar">
          <button type="button" class="pp-callout-btn" @click="execBold">Жирный</button>
          <button type="button" class="pp-callout-btn" @click="execItalic">Курсив</button>
          <button type="button" class="pp-callout-btn" @click="execCalloutLink">Ссылка</button>
          <button type="button" class="pp-callout-btn" @click="execCalloutList">Список</button>
        </div>
        <div
          ref="calloutEditorRef"
          class="pp-callout-editor"
          contenteditable="true"
          @input="onCalloutInput"
        ></div>
        <p class="st-field-hint">
          Произвольный HTML. Показывается на странице оплаты над блоком «Рекомендуемые способы
          оплаты». Если пусто — блок не отображается. Удобно для контактов поддержки и телефона.
        </p>

        <div class="st-grid">
          <div class="st-field-full">
            <label class="st-field-label" for="pp-default-method">
              Метод, выделенный по умолчанию
            </label>
            <select id="pp-default-method" v-model="generalDefaultMethod" class="st-input">
              <option value="">— Не выделять ни один —</option>
              <optgroup v-for="grp in defaultMethodGroups" :key="grp.section" :label="grp.label">
                <option v-for="id in grp.ids" :key="id" :value="id">
                  {{ getMethod(id).name || id }}
                </option>
              </optgroup>
            </select>
            <p class="st-field-hint">
              Какой способ оплаты подсвечен сразу при открытии страницы. «Не выделять ни один» —
              кнопка оплаты заблокирована, пока покупатель не выберет способ сам (рекомендуется). В
              списке только включённые методы.
            </p>
          </div>
        </div>
      </section>

      <!-- Таблица методов -->
      <section class="panel-section st-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Методы оплаты</h2>
          <button
            type="button"
            class="pp-group-toggle-all"
            @click="setAllGroups(!allGroupsExpanded)"
          >
            <i class="fas" :class="allGroupsExpanded ? 'fa-angles-up' : 'fa-angles-down'"></i>
            {{ allGroupsExpanded ? 'Свернуть все' : 'Развернуть все' }}
          </button>
        </header>
        <p class="st-section-sub">
          Настройте каждый метод: включение, ценовые ограничения, текст кнопки, подпись под методом
          и фильтр офферов. Секция и порядок — перетаскиванием или кнопками ↑/↓. Разворачивайте
          строку метода для детальной настройки. Системные методы нельзя удалить.
        </p>

        <template v-for="sectionId in PAYMENT_PAGE_SECTIONS" :key="sectionId">
          <div class="pp-group" :class="{ 'is-dnd-over': dragOverSection === sectionId }">
            <div
              class="pp-group-head"
              @click="toggleGroup(sectionId)"
              @dragover="onHeadDragOver($event, sectionId)"
              @drop="onDrop($event)"
            >
              <i
                class="fas fa-chevron-right pp-group-chevron"
                :class="expandedGroups[sectionId] ? 'is-open' : ''"
              ></i>
              <span class="pp-group-title">{{ sectionLabels[sectionId] ?? sectionId }}</span>
              <span class="pp-group-counter">
                {{ enabledCountBySection[sectionId].enabled }} вкл /
                {{ enabledCountBySection[sectionId].total }}
              </span>
            </div>
            <div
              v-if="expandedGroups[sectionId]"
              class="pp-group-body"
              @dragover="onBodyDragOver($event, sectionId)"
              @drop="onDrop($event)"
            >
              <div
                v-if="displayedMethodsBySection[sectionId].length === 0"
                class="pp-group-empty-drop"
              >
                Перетащите способ оплаты в этот раздел
              </div>
              <div
                v-for="methodId in displayedMethodsBySection[sectionId]"
                :key="methodId"
                class="st-method-row"
                :class="{ 'is-dragging': dragMethodId === methodId }"
                :draggable="true"
                @dragstart="onMethodDragStart($event, methodId, sectionId)"
                @dragend="onMethodDragEnd()"
                @dragover.stop="onRowDragOver($event, sectionId, methodId)"
                @drop.stop="onDrop($event)"
              >
                <!-- Сводная строка метода -->
                <div class="st-method-summary" @click="toggleMethod(methodId)">
                  <span class="pp-dnd-handle" aria-hidden="true">⠿</span>
                  <label class="st-toggle st-method-toggle" :for="'pp-method-' + methodId">
                    <input
                      :id="'pp-method-' + methodId"
                      :checked="getMethod(methodId).enabled"
                      type="checkbox"
                      @click.stop
                      @change="onMethodEnabledChange(methodId, $event)"
                    />
                    <span class="st-toggle-slider"></span>
                  </label>
                  <span class="st-method-id">{{ getMethod(methodId).name || methodId }}</span>
                  <span v-if="getMethod(methodId).label" class="st-method-label-preview">
                    {{ getMethod(methodId).label }}
                  </span>
                  <!-- Бейдж «Системный» -->
                  <span v-if="getMethod(methodId).isSystem" class="pp-badge-system">Системный</span>
                  <span class="st-method-section-badge">
                    {{ sectionLabels[getMethod(methodId).section] ?? getMethod(methodId).section }}
                  </span>
                  <i
                    class="fas"
                    :class="expandedMethods[methodId] ? 'fa-chevron-up' : 'fa-chevron-down'"
                    style="margin-left: auto; opacity: 0.5"
                  ></i>
                </div>

                <!-- Детальная настройка (раскрытая) -->
                <div v-if="expandedMethods[methodId]" class="st-method-detail">
                  <!-- Подсказка для СБП/зарубежных -->
                  <p v-if="SBP_NOTICE_IDS.has(methodId)" class="st-method-notice">
                    <i class="fas fa-circle-info"></i>
                    Платёжный допуск и лимиты СБП/зарубежных оплат настраиваются в разделе «Виджеты
                    оплаты».
                  </p>

                  <div class="st-grid">
                    <div class="st-field-full">
                      <label class="st-field-label" :for="'pp-name-' + methodId"
                        >Название метода</label
                      >
                      <input
                        :id="'pp-name-' + methodId"
                        :value="getMethod(methodId).name"
                        type="text"
                        class="st-input"
                        :disabled="getMethod(methodId).isSystem"
                        placeholder="Например: Моя оплата"
                        @input="onMethodTextInput(methodId, 'name', $event)"
                      />
                      <p v-if="getMethod(methodId).isSystem" class="st-field-hint">
                        Название системного метода изменить нельзя.
                      </p>
                    </div>
                    <!-- id метода (переименование) — только для кастомных -->
                    <div v-if="!getMethod(methodId).isSystem" class="st-field-full">
                      <label class="st-field-label" :for="'pp-rename-' + methodId">id метода</label>
                      <div class="pp-rename-row">
                        <input
                          :id="'pp-rename-' + methodId"
                          :value="getRenameInput(methodId)"
                          type="text"
                          class="st-input"
                          placeholder="my-pay-method"
                          @input="
                            setRenameInput(methodId, ($event.target as HTMLInputElement).value)
                          "
                        />
                        <button
                          type="button"
                          class="pp-rename-btn"
                          :disabled="renameSaving[methodId] ?? false"
                          @click="renameMethod(methodId)"
                        >
                          {{
                            (renameSaving[methodId] ?? false) ? 'Переименование…' : 'Переименовать'
                          }}
                        </button>
                      </div>
                      <p
                        v-if="(renameError[methodId] ?? '') !== ''"
                        class="st-msg is-err"
                        style="margin-top: 4px"
                      >
                        <i class="fas fa-exclamation-circle"></i>
                        {{ renameError[methodId] ?? '' }}
                      </p>
                      <p class="st-field-hint">
                        id элемента, который скрипт создаёт на странице GC. Начинается с буквы,
                        только латиница/цифры/дефис/подчёркивание. Переименование — явное действие
                        по кнопке.
                      </p>
                    </div>
                    <!-- Для системных методов — показываем id как read-only -->
                    <div v-if="getMethod(methodId).isSystem" class="st-field-full">
                      <label class="st-field-label">id метода</label>
                      <p class="st-field-hint" style="font-family: monospace">{{ methodId }}</p>
                    </div>
                    <div class="st-field-full">
                      <label class="st-field-label" :for="'pp-image-' + methodId"
                        >URL изображения</label
                      >
                      <input
                        :id="'pp-image-' + methodId"
                        :value="getMethod(methodId).imageUrl"
                        type="text"
                        class="st-input"
                        placeholder="https://..."
                        @input="onMethodTextInput(methodId, 'imageUrl', $event)"
                      />
                    </div>
                    <div class="st-field-full">
                      <label class="st-field-label" :for="'pp-caption-' + methodId"
                        >Подпись под методом</label
                      >
                      <input
                        :id="'pp-caption-' + methodId"
                        :value="getMethod(methodId).caption"
                        type="text"
                        class="st-input"
                        placeholder="Например: Оплата картой любого банка РФ"
                        maxlength="120"
                        @input="onMethodTextInput(methodId, 'caption', $event)"
                      />
                      <p class="st-field-hint">
                        Короткий поясняющий текст под методом — вместо скрытых системных подписей.
                        Пусто — ничего не показывается. До 2 строк на странице.
                      </p>
                    </div>
                    <!-- Режим взаимодействия — только для кастомных методов -->
                    <div v-if="!getMethod(methodId).isSystem" class="st-field-full">
                      <label class="st-field-label" :for="'pp-mode-' + methodId"
                        >Режим работы метода</label
                      >
                      <select
                        :id="'pp-mode-' + methodId"
                        :value="getMethod(methodId).interactionMode"
                        class="st-input"
                        @change="onMethodInteractionModeChange(methodId, $event)"
                      >
                        <option value="standard">
                          Стандартный — выбор метода и кнопка «Оплатить заказ» справа
                        </option>
                        <option value="widget">С меню и кнопкой на методе (как рассрочка)</option>
                      </select>
                      <p class="st-field-hint">
                        Стандартный — покупатель выделяет метод и платит штатной кнопкой справа (для
                        оплаты по QR/ссылке, напр. LifePay). С меню — выбор варианта и оплата
                        кнопкой внутри метода; карточка не подсвечивается рамкой (как блоки
                        рассрочки).
                      </p>
                    </div>
                    <!-- Текст кнопки — у системных методов (как раньше) и у кастомных в режиме widget.
                         У кастомных в режиме standard своей кнопки нет, поэтому поле скрыто. -->
                    <div
                      v-if="
                        getMethod(methodId).isSystem ||
                        getMethod(methodId).interactionMode === 'widget'
                      "
                      class="st-field-full"
                    >
                      <label class="st-field-label" :for="'pp-label-' + methodId"
                        >Текст кнопки</label
                      >
                      <input
                        :id="'pp-label-' + methodId"
                        :value="getMethod(methodId).label"
                        type="text"
                        class="st-input"
                        placeholder="Например: Тинькофф Рассрочка"
                        @input="onMethodTextInput(methodId, 'label', $event)"
                      />
                      <p class="st-field-hint">
                        Подменяет надпись на самой кнопке метода. Пусто — остаётся штатный текст.
                      </p>
                    </div>
                    <!-- Редактор customScript — только для кастомных методов (оба режима) -->
                    <div v-if="!getMethod(methodId).isSystem" class="st-field-full">
                      <label class="st-field-label" :for="'pp-script-' + methodId"
                        >JS-скрипт метода</label
                      >
                      <textarea
                        :id="'pp-script-' + methodId"
                        :value="getMethod(methodId).customScript"
                        class="st-input pp-script-editor"
                        placeholder="// Код выполняется при нажатии кнопки метода"
                        rows="5"
                        @input="
                          setMethodField(
                            methodId,
                            'customScript',
                            ($event.target as HTMLTextAreaElement).value
                          )
                        "
                      ></textarea>
                      <p class="st-field-hint">
                        JS-код. Выполнится по нажатию кнопки метода. Доступна переменная
                        <code>selectedMenuValue</code> — значение выбранного пункта меню.
                      </p>
                    </div>
                    <!-- Редактор menuItems — только для кастомных методов в режиме widget -->
                    <div
                      v-if="
                        !getMethod(methodId).isSystem &&
                        getMethod(methodId).interactionMode === 'widget'
                      "
                      class="st-field-full"
                    >
                      <label class="st-field-label">Пункты меню (radio)</label>
                      <div
                        v-for="(item, idx) in getMethod(methodId).menuItems"
                        :key="idx"
                        class="pp-menu-item-row"
                      >
                        <input
                          :value="item.label"
                          type="text"
                          class="st-input"
                          placeholder="Подпись"
                          @input="
                            updateMenuItem(
                              methodId,
                              idx,
                              'label',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                        <input
                          :value="item.value"
                          type="text"
                          class="st-input"
                          placeholder="Значение"
                          @input="
                            updateMenuItem(
                              methodId,
                              idx,
                              'value',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                        <button
                          type="button"
                          class="pp-menu-item-remove"
                          title="Удалить пункт"
                          @click="removeMenuItem(methodId, idx)"
                        >
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                      <button type="button" class="pp-menu-item-add" @click="addMenuItem(methodId)">
                        <i class="fas fa-plus"></i> Добавить пункт
                      </button>
                      <p class="st-field-hint">
                        Пункты меню (radio). Выбранный value доступен в скрипте как
                        <code>selectedMenuValue</code>.
                      </p>
                    </div>
                  </div>

                  <!-- Мобайл/тач: кнопки ↑/↓ и смена секции (раздел — как есть) -->
                  <div class="pp-mobile-actions">
                    <button
                      type="button"
                      class="pp-mobile-btn"
                      :disabled="methodsBySection[sectionId].indexOf(methodId) === 0"
                      @click="moveMethod(methodId, sectionId, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="pp-mobile-btn"
                      :disabled="
                        methodsBySection[sectionId].indexOf(methodId) ===
                        methodsBySection[sectionId].length - 1
                      "
                      @click="moveMethod(methodId, sectionId, 1)"
                    >
                      ↓
                    </button>
                    <select
                      class="st-input pp-mobile-section-select"
                      :value="sectionId"
                      @change="onMoveSectionChange($event, methodId, sectionId)"
                    >
                      <option v-for="sec in PAYMENT_PAGE_SECTIONS" :key="sec" :value="sec">
                        {{ sectionLabels[sec] ?? sec }}
                      </option>
                    </select>
                  </div>

                  <!-- Пунктирная черта: ниже — условия показа метода (лимиты + офферы) -->
                  <div class="st-dashed-sep" role="separator" aria-hidden="true"></div>

                  <label class="st-toggle-row" :for="'pp-hide-partial-' + methodId">
                    <span class="st-toggle">
                      <input
                        :id="'pp-hide-partial-' + methodId"
                        :checked="getMethod(methodId).hideOnPartialPayment"
                        type="checkbox"
                        @change="onMethodPartialHideChange(methodId, $event)"
                      />
                      <span class="st-toggle-slider"></span>
                    </span>
                    <span class="st-toggle-text">
                      <span class="st-toggle-title">Скрывать при частичной оплате</span>
                      <span class="st-toggle-hint">
                        Метод будет скрыт, если страница заказа открыта с параметром
                        <code>paymentValue</code>.
                      </span>
                    </span>
                  </label>

                  <label class="st-toggle-row" :for="'pp-hide-topup-' + methodId">
                    <span class="st-toggle">
                      <input
                        :id="'pp-hide-topup-' + methodId"
                        :checked="getMethod(methodId).hideOnTopUpPayment"
                        type="checkbox"
                        @change="onMethodTopUpHideChange(methodId, $event)"
                      />
                      <span class="st-toggle-slider"></span>
                    </span>
                    <span class="st-toggle-text">
                      <span class="st-toggle-title">Скрывать при доплате</span>
                      <span class="st-toggle-hint">
                        Метод будет скрыт, если по заказу уже есть внесённая оплата.
                      </span>
                    </span>
                  </label>

                  <!-- Лимиты суммы заказа -->
                  <div class="st-grid">
                    <div>
                      <label class="st-field-label" :for="'pp-min-' + methodId"
                        >Мин. сумма, ₽</label
                      >
                      <input
                        :id="'pp-min-' + methodId"
                        :value="getMethod(methodId).minAmount"
                        type="number"
                        min="0"
                        step="1"
                        class="st-input"
                        placeholder="0 — без ограничений"
                        @change="onMethodNumberChange(methodId, 'minAmount', $event)"
                      />
                    </div>
                    <div>
                      <label class="st-field-label" :for="'pp-max-' + methodId"
                        >Макс. сумма, ₽</label
                      >
                      <input
                        :id="'pp-max-' + methodId"
                        :value="getMethod(methodId).maxAmount"
                        type="number"
                        min="0"
                        step="1"
                        class="st-input"
                        placeholder="0 — без ограничений"
                        @change="onMethodNumberChange(methodId, 'maxAmount', $event)"
                      />
                    </div>
                  </div>

                  <!-- Фильтр офферов -->
                  <div class="st-offer-block">
                    <PaymentMethodOfferList
                      :list-type="getMethodOfferListType(methodId)"
                      :selected-offers="getMethodOffers(methodId)"
                      :title="'Фильтр офферов — ' + methodId"
                      hint="«Выключен» — метод доступен для всех заказов. «Только выбранные» — только для заказов с выбранными офферами."
                      :error-hints="offerErrorHints"
                      :loader="loadOffers"
                      @update:list-type="
                        (v: WidgetOfferListType) => setMethodOfferListType(methodId, v)
                      "
                      @update:selected-offers="(v: AllowedOffer[]) => setMethodOffers(methodId, v)"
                    />
                  </div>

                  <!-- Кнопка удаления (только для кастомных) -->
                  <div v-if="!getMethod(methodId).isSystem" class="pp-delete-method-row">
                    <button
                      type="button"
                      class="pp-delete-method-btn"
                      :disabled="deletingMethodKey === methodId"
                      @click.stop="deleteMethod(methodId)"
                    >
                      <i class="fas fa-trash"></i>
                      {{ deletingMethodKey === methodId ? 'Удаление…' : 'Удалить метод' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- Форма добавления кастомного метода -->
      <section class="panel-section st-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Добавить кастомный метод</h2>
        </header>
        <p class="st-section-sub">
          Добавьте кастомный метод оплаты. Скрипт <code>pp-script-11.js</code> создаст контейнер с
          заданным id на странице GC. Укажите название, id и секцию.
        </p>
        <div class="st-grid">
          <div class="st-field-full">
            <label class="st-field-label" for="new-method-name">Название</label>
            <input
              id="new-method-name"
              v-model="newMethodName"
              type="text"
              class="st-input"
              placeholder="Например: Моя оплата"
            />
          </div>
          <div class="st-field-full">
            <label class="st-field-label" for="new-method-id">id метода</label>
            <input
              id="new-method-id"
              v-model="newMethodId"
              type="text"
              class="st-input"
              placeholder="my-pay-method"
            />
            <p class="st-field-hint">
              Латиница/цифры/дефис/подчёркивание, начинается с буквы. Это id создаваемого на
              странице блока.
            </p>
          </div>
          <div>
            <label class="st-field-label" for="new-method-section">Секция</label>
            <select id="new-method-section" v-model="newMethodSection" class="st-input">
              <option v-for="sec in PAYMENT_PAGE_SECTIONS" :key="sec" :value="sec">
                {{ sectionLabels[sec] ?? sec }}
              </option>
            </select>
          </div>
        </div>
        <div class="st-actions" style="margin-top: 0.75rem">
          <button type="button" class="btn-primary" :disabled="addMethodSaving" @click="addMethod">
            <i class="fas fa-plus"></i>
            {{ addMethodSaving ? 'Добавление…' : 'Добавить метод' }}
          </button>
          <p v-if="addMethodError" class="st-msg is-err">
            <i class="fas fa-exclamation-circle"></i>
            {{ addMethodError }}
          </p>
          <p v-if="addMethodSuccess" class="st-msg is-ok">
            <i class="fas fa-check-circle"></i>
            {{ addMethodSuccess }}
          </p>
        </div>
      </section>

      <!-- Сниппет встраивания -->
      <section class="panel-section st-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Встраивание на страницу заказа</h2>
        </header>
        <p class="st-section-sub">
          Вставьте скрипт-лоадер в HTML страницы заказа перед закрывающим тегом
          <code>&lt;/body&gt;</code>. Лоадер загружает конфиг и инициализирует страницу оплаты.
        </p>

        <div class="st-snippet">
          <pre><code>{{ loaderSnippet }}</code></pre>
          <button
            type="button"
            class="st-snippet-copy"
            :class="copied['pp-loader'] ? 'is-copied' : copyError['pp-loader'] ? 'is-err' : ''"
            @click="copySnippet('pp-loader', loaderSnippet)"
          >
            <i
              class="fas"
              :class="
                copied['pp-loader']
                  ? 'fa-check'
                  : copyError['pp-loader']
                    ? 'fa-exclamation-circle'
                    : 'fa-copy'
              "
            ></i>
            {{
              copied['pp-loader']
                ? 'Скопировано'
                : copyError['pp-loader']
                  ? 'Не удалось'
                  : 'Копировать'
            }}
          </button>
        </div>

        <p class="st-field-hint" style="margin-top: 0.75rem">
          Пример прелоадера. Вставьте его в HTML страницы заказа (лучше сразу после открывающего
          <code>&lt;body&gt;</code>) — он перекроет «сырую» страницу сразу при загрузке.
        </p>
        <div class="st-snippet">
          <pre><code>{{ svgPreloaderSnippet }}</code></pre>
          <button
            type="button"
            class="st-snippet-copy"
            :class="copied['pp-svg'] ? 'is-copied' : copyError['pp-svg'] ? 'is-err' : ''"
            @click="copySnippet('pp-svg', svgPreloaderSnippet)"
          >
            <i
              class="fas"
              :class="
                copied['pp-svg']
                  ? 'fa-check'
                  : copyError['pp-svg']
                    ? 'fa-exclamation-circle'
                    : 'fa-copy'
              "
            ></i>
            {{
              copied['pp-svg'] ? 'Скопировано' : copyError['pp-svg'] ? 'Не удалось' : 'Копировать'
            }}
          </button>
        </div>
      </section>

      <!-- Статус автосохранения -->
      <div class="st-actions">
        <span v-if="saving" class="st-msg">
          <i class="fas fa-spinner fa-spin"></i> Сохранение…
        </span>
        <span v-else-if="saveStatus === 'saved'" class="st-msg is-ok">
          <i class="fas fa-check-circle"></i> Сохранено
        </span>
        <span v-else-if="saveStatus === 'error'" class="st-msg is-err">
          <i class="fas fa-exclamation-circle"></i> {{ saveError }}
        </span>
        <span v-else class="st-field-hint">
          <i class="fas fa-bolt"></i> Изменения сохраняются автоматически
        </span>
        <p v-if="message" class="st-msg" :class="isError ? 'is-err' : 'is-ok'">
          <i class="fas" :class="isError ? 'fa-exclamation-circle' : 'fa-check-circle'"></i>
          {{ message }}
        </p>
      </div>
    </form>
  </div>
</template>
