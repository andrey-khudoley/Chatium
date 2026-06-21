<script setup lang="ts">
import { ref } from 'vue'
import { pluginSettingsGetRoute } from '../../api/plugins/settings-get'
import { settingsExportRoute } from '../../api/settings/export'
import { settingsImportRoute } from '../../api/settings/import'
import type { PluginRuntimeConfig } from '../../shared/pluginManifestTypes'
import PluginManifestForm from './PluginManifestForm.vue'

declare const ctx: app.Ctx

const props = defineProps<{
  initialPlugins?: PluginRuntimeConfig[]
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:plugin-settings', value: PluginRuntimeConfig[]): void
}>()

const plugins = ref<PluginRuntimeConfig[]>(
  Array.isArray(props.initialPlugins) ? props.initialPlugins : []
)
const loading = ref(false)
const error = ref('')
const importFileInput = ref<HTMLInputElement | null>(null)
const exportingSettings = ref(false)
const importingSettings = ref(false)
const portableStatus = ref('')
const portableError = ref('')

function publish(next: PluginRuntimeConfig[]) {
  plugins.value = next
  emit('update:plugin-settings', next)
}

function onPluginUpdate(plugin: PluginRuntimeConfig) {
  publish(plugins.value.map((item) => (item.manifest.id === plugin.manifest.id ? plugin : item)))
}

async function reloadPlugins() {
  if (!props.canEdit) return
  loading.value = true
  error.value = ''
  try {
    const response = await pluginSettingsGetRoute.run(ctx)
    publish((response as { plugins: PluginRuntimeConfig[] }).plugins || [])
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function exportSettingsJson() {
  if (!props.canEdit || exportingSettings.value) return
  exportingSettings.value = true
  portableError.value = ''
  portableStatus.value = ''
  try {
    const response = (await settingsExportRoute.run(ctx)) as {
      success?: boolean
      error?: string
      backup?: unknown
    }
    if (response?.success === false || !response?.backup) {
      throw new Error(response?.error || 'Не удалось экспортировать настройки')
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadJson(`yakovleva-pay-settings-${stamp}.json`, response.backup)
    portableStatus.value = 'JSON экспортирован'
  } catch (e) {
    portableError.value = e instanceof Error ? e.message : String(e)
  } finally {
    exportingSettings.value = false
  }
}

function openImportDialog() {
  if (!props.canEdit || importingSettings.value) return
  importFileInput.value?.click()
}

async function importSettingsFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importingSettings.value = true
  portableError.value = ''
  portableStatus.value = ''
  try {
    const backup = JSON.parse(await file.text())
    const response = (await settingsImportRoute.run(ctx, { backup })) as {
      success?: boolean
      error?: string
      settingsSaved?: number
      settingsDeleted?: number
      methodsUpserted?: number
      methodsDeleted?: number
    }
    if (response?.success === false) {
      throw new Error(response?.error || 'Не удалось импортировать настройки')
    }
    portableStatus.value =
      `Импортировано: настроек ${response.settingsSaved ?? 0}, ` +
      `методов ${response.methodsUpserted ?? 0}`
    await reloadPlugins()
    window.setTimeout(() => window.location.reload(), 700)
  } catch (e) {
    portableError.value = e instanceof Error ? e.message : String(e)
  } finally {
    importingSettings.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="st-tab hp-tab">
    <div v-if="!canEdit" class="panel-section hp-guard">
      <i class="fas fa-lock"></i>
      <span>Плагины и секреты платежных систем доступны только администратору.</span>
    </div>

    <div v-else class="hp-toolbar">
      <div class="hp-portable">
        <button
          type="button"
          class="btn-secondary hp-portable-btn"
          :disabled="exportingSettings || importingSettings"
          @click="exportSettingsJson"
        >
          <i v-if="exportingSettings" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-download"></i>
          Экспорт JSON
        </button>
        <button
          type="button"
          class="btn-secondary hp-portable-btn"
          :disabled="exportingSettings || importingSettings"
          @click="openImportDialog"
        >
          <i v-if="importingSettings" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-upload"></i>
          Импорт JSON
        </button>
        <input
          ref="importFileInput"
          type="file"
          accept="application/json,.json"
          class="hp-file-input"
          @change="importSettingsFile"
        />
      </div>
      <button
        type="button"
        class="btn-primary hp-refresh"
        :disabled="loading"
        @click="reloadPlugins"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-rotate"></i>
        Обновить
      </button>
      <span v-if="portableStatus" class="hp-ok">{{ portableStatus }}</span>
      <span v-if="portableError || error" class="hp-error">{{ portableError || error }}</span>
    </div>

    <PluginManifestForm
      v-for="plugin in plugins"
      :key="plugin.manifest.id"
      :plugin="plugin"
      :can-edit="!!canEdit"
      @update:plugin="onPluginUpdate"
    />
  </div>
</template>

<style scoped>
.hp-tab {
  display: grid;
  gap: 16px;
}

.hp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 2.5rem;
  flex-wrap: wrap;
}

.hp-refresh,
.hp-guard,
.hp-portable,
.hp-portable-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hp-refresh {
  min-height: 2.25rem;
}

.hp-refresh:disabled {
  cursor: wait;
  opacity: 0.65;
}

.hp-portable {
  flex-wrap: wrap;
}

.hp-portable-btn:disabled {
  cursor: wait;
  opacity: 0.65;
}

.hp-file-input {
  display: none;
}

.hp-guard {
  width: 100%;
  justify-content: flex-start;
  color: var(--color-warning, var(--color-accent));
}

.hp-error {
  color: var(--color-danger, var(--color-accent));
  font-size: 12px;
}

.hp-ok {
  color: var(--color-success, var(--color-accent));
  font-size: 12px;
}
</style>
