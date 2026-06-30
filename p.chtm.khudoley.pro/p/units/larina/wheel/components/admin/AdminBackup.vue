<script setup lang="ts">
// Карточка резервного копирования: экспорт всех настроек и сегментов в JSON-файл
// и импорт (восстановление/перенос) из такого файла.
// Данные берутся/применяются только через API-routes.
import { onBeforeUnmount, ref } from 'vue'
import { exportSettingsRoute } from '../../api/admin/settings/export'
import { importSettingsRoute } from '../../api/admin/settings/import'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminBackup')

declare const ctx: app.Ctx

const STATUS_DURATION_MS = 4000

const exporting = ref(false)
const exportError = ref('')

const importing = ref(false)
const importError = ref('')
const importSummary = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// Файл выбран, ждём подтверждения замены
const pendingBackup = ref<unknown>(null)
const pendingFileName = ref('')

const summaryTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSummary(msg: string) {
  importSummary.value = msg
  if (summaryTimeout.id) clearTimeout(summaryTimeout.id)
  summaryTimeout.id = setTimeout(() => {
    importSummary.value = ''
    summaryTimeout.id = null
  }, STATUS_DURATION_MS)
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function buildFileName(): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
  return `larina-wheel-backup_${stamp}.json`
}

async function doExport() {
  exporting.value = true
  exportError.value = ''
  try {
    const res = await exportSettingsRoute.run(ctx)
    const data = res as { success?: boolean; backup?: unknown; error?: string }
    if (!data?.success || !data.backup) {
      exportError.value = data?.error || 'Не удалось сформировать экспорт'
      log.error('Ошибка экспорта настроек', exportError.value)
      return
    }
    const json = JSON.stringify(data.backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildFileName()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    log.info('Экспорт настроек скачан')
  } catch (e) {
    exportError.value = (e as Error)?.message || 'Ошибка экспорта'
    log.error('Ошибка экспорта настроек', e)
  } finally {
    exporting.value = false
  }
}

function triggerFilePick() {
  importError.value = ''
  importSummary.value = ''
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Сбрасываем input, чтобы повторный выбор того же файла снова сработал
  input.value = ''
  if (!file) return

  importError.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      pendingBackup.value = parsed
      pendingFileName.value = file.name
      log.info('Файл бэкапа прочитан', { name: file.name })
    } catch (e) {
      importError.value = 'Не удалось прочитать JSON из файла'
      log.error('Ошибка парсинга файла бэкапа', e)
    }
  }
  reader.onerror = () => {
    importError.value = 'Ошибка чтения файла'
    log.error('Ошибка FileReader', reader.error)
  }
  reader.readAsText(file)
}

function cancelImport() {
  pendingBackup.value = null
  pendingFileName.value = ''
}

async function confirmImport() {
  if (!pendingBackup.value) return
  importing.value = true
  importError.value = ''
  try {
    const res = await importSettingsRoute.run(ctx, { backup: pendingBackup.value })
    const data = res as {
      success?: boolean
      settingsApplied?: number
      settingsSkipped?: string[]
      segmentsImported?: number
      segmentsImportedOk?: boolean
      segmentsMessage?: string
      error?: string
    }
    if (!data?.success) {
      importError.value = data?.error || 'Ошибка импорта'
      log.error('Ошибка импорта настроек', importError.value)
      return
    }
    const parts: string[] = []
    parts.push(`Настроек применено: ${data.settingsApplied ?? 0}`)
    const skipped = Array.isArray(data.settingsSkipped) ? data.settingsSkipped : []
    if (skipped.length > 0) {
      parts.push(`пропущено настроек: ${skipped.length} (${skipped.join(', ')})`)
    }
    if (data.segmentsImportedOk) {
      parts.push(`сегментов импортировано: ${data.segmentsImported ?? 0}`)
    } else if (data.segmentsMessage) {
      parts.push(data.segmentsMessage)
    }
    showSummary(parts.join('. ') + '. Перезагрузите страницу, чтобы увидеть изменения.')
    log.notice('Импорт настроек выполнен', {
      settingsApplied: data.settingsApplied,
      settingsSkipped: skipped,
      segmentsImported: data.segmentsImported,
      segmentsImportedOk: data.segmentsImportedOk
    })
  } catch (e) {
    importError.value = (e as Error)?.message || 'Ошибка импорта'
    log.error('Ошибка импорта настроек', e)
  } finally {
    importing.value = false
    pendingBackup.value = null
    pendingFileName.value = ''
  }
}

onBeforeUnmount(() => {
  if (summaryTimeout.id) clearTimeout(summaryTimeout.id)
})
</script>

<template>
  <section class="ap-card ap-card--stagger-5">
    <div class="ap-card-hd">
      <h2><i class="fas fa-database ap-icon-hd"></i> Бэкап настроек</h2>
    </div>

    <p class="ap-label" style="opacity: 0.75; margin-bottom: 10px">
      Экспорт сохраняет все настройки проекта, GetCourse и сегменты колеса в JSON-файл. Импорт
      восстанавливает их из файла (заменяет текущие значения) — удобно для бэкапа или переноса на
      другой экземпляр.
    </p>

    <!-- Экспорт -->
    <button type="button" class="ap-btn" :disabled="exporting" @click="doExport">
      <i class="fas fa-file-export" style="margin-right: 6px"></i>
      {{ exporting ? 'Экспорт…' : 'Экспорт в JSON' }}
    </button>
    <p v-if="exportError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ exportError }}
    </p>

    <!-- Импорт -->
    <div class="ap-field-row" style="margin-top: 16px">
      <label class="ap-label">Импорт из JSON-файла</label>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      style="display: none"
      @change="onFileSelected"
    />

    <!-- Подтверждение замены -->
    <div v-if="pendingBackup" class="ap-confirm">
      <p class="ap-confirm__msg">
        <i class="fas fa-exclamation-triangle" style="color: #e07070; margin-right: 6px"></i>
        Импортировать «{{ pendingFileName }}»? Это заменит текущие настройки и сегменты.
      </p>
      <div class="ap-confirm__actions">
        <button
          type="button"
          class="ap-btn ap-btn--danger"
          :disabled="importing"
          @click="confirmImport"
        >
          {{ importing ? 'Импорт…' : 'Да, импортировать' }}
        </button>
        <button
          type="button"
          class="ap-btn ap-btn--secondary"
          :disabled="importing"
          @click="cancelImport"
        >
          Отмена
        </button>
      </div>
    </div>

    <button
      v-if="!pendingBackup"
      type="button"
      class="ap-btn ap-btn--secondary"
      :disabled="importing"
      @click="triggerFilePick"
    >
      <i class="fas fa-file-import" style="margin-right: 6px"></i>
      Выбрать файл…
    </button>

    <p v-if="importError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ importError }}
    </p>
    <p v-if="importSummary" class="ap-badge ap-badge--ok" style="margin-top: 10px; display: block">
      <i class="fas fa-check" style="margin-right: 6px"></i>{{ importSummary }}
    </p>
  </section>
</template>
