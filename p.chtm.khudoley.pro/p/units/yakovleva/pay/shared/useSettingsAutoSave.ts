// @shared
/**
 * Композэйбл автосохранения настроек по мере их изменения.
 *
 * Инкапсулирует паттерн системной админки (`AdminProjectSettings`/`AdminLogLevel`):
 * debounce на изменения полей + индикатор результата «Сохранено»/«Ошибка» на
 * несколько секунд. Здесь паттерн обобщён на множество ключей: для каждого ключа
 * свой debounce-таймер, статус/ошибка — общие на экземпляр (одна секция = один
 * экземпляр composable).
 *
 * Использование:
 *   const { saving, saveStatus, error, queue, flush } = useSettingsAutoSave({
 *     save: (key, value) => myRoute.run(ctx, { key, value }) as Promise<AutoSaveResult>
 *   })
 *   // текстовое поле → debounce:
 *   watch(field, () => queue(SETTING_KEY, field.value))
 *   // тумблер → немедленно, с откатом при ошибке:
 *   const ok = await flush(SETTING_KEY, value); if (!ok) field.value = prev
 */
import { onBeforeUnmount, ref } from 'vue'

export type AutoSaveResult = { success?: boolean; error?: string }
export type AutoSaveFn = (key: string, value: unknown) => Promise<AutoSaveResult>

export interface UseSettingsAutoSaveOptions {
  /** Функция сохранения одной пары ключ-значение (обычно `route.run`). */
  save: AutoSaveFn
  /** Задержка debounce для `queue` (мс). По умолчанию 600. */
  debounceMs?: number
  /** Сколько держать индикатор «Сохранено»/«Ошибка» (мс). По умолчанию 1500. */
  statusDurationMs?: number
}

const DEFAULT_DEBOUNCE_MS = 600
const DEFAULT_STATUS_DURATION_MS = 1500

export function useSettingsAutoSave(opts: UseSettingsAutoSaveOptions) {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const statusDurationMs = opts.statusDurationMs ?? DEFAULT_STATUS_DURATION_MS

  /** Идёт хотя бы одно сохранение. */
  const saving = ref(false)
  /** Результат последнего завершённого сохранения (для индикатора). */
  const saveStatus = ref<'saved' | 'error' | null>(null)
  /** Текст последней ошибки сохранения. */
  const error = ref('')

  // Свой debounce-таймер на каждый ключ: правки разных полей не «съедают» друг друга.
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const statusTimer = { id: null as ReturnType<typeof setTimeout> | null }
  // Счётчик параллельных сохранений: `saving` гаснет только когда все завершились.
  let inFlight = 0

  function showStatus(status: 'saved' | 'error') {
    if (statusTimer.id) clearTimeout(statusTimer.id)
    saveStatus.value = status
    statusTimer.id = setTimeout(() => {
      saveStatus.value = null
      statusTimer.id = null
    }, statusDurationMs)
  }

  /**
   * Немедленно сохранить пару ключ-значение (отменяя отложенный по этому ключу
   * debounce). Возвращает `true` при успехе — удобно для отката тумблеров.
   */
  async function flush(key: string, value: unknown): Promise<boolean> {
    const pending = debounceTimers.get(key)
    if (pending) {
      clearTimeout(pending)
      debounceTimers.delete(key)
    }
    inFlight++
    saving.value = true
    error.value = ''
    try {
      const res = await opts.save(key, value)
      if (res && res.success === false) {
        error.value = res.error || 'Ошибка сохранения'
        showStatus('error')
        return false
      }
      showStatus('saved')
      return true
    } catch (e) {
      error.value = (e as Error)?.message || String(e)
      showStatus('error')
      return false
    } finally {
      inFlight--
      if (inFlight === 0) saving.value = false
    }
  }

  /** Запланировать сохранение ключа с debounce (для текстовых/числовых полей). */
  function queue(key: string, value: unknown) {
    const pending = debounceTimers.get(key)
    if (pending) clearTimeout(pending)
    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key)
        void flush(key, value)
      }, debounceMs)
    )
  }

  function cancelAll() {
    for (const t of debounceTimers.values()) clearTimeout(t)
    debounceTimers.clear()
    if (statusTimer.id) {
      clearTimeout(statusTimer.id)
      statusTimer.id = null
    }
  }

  onBeforeUnmount(cancelAll)

  return { saving, saveStatus, error, queue, flush }
}
