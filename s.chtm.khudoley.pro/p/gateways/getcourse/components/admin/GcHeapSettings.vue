<script setup lang="ts">
// Карточка произвольных пар «ключ — значение» в Heap (manual §5.9).
// Самодостаточна: список/сохранение/удаление через api/settings. CSS глобальный (.ap-kv-*).
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { saveSettingRoute } from '../../api/settings/save'
import { deleteSettingRoute } from '../../api/settings/delete'
import { listArbitrarySettingsRoute } from '../../api/settings/list-arbitrary'

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500

type ArbitrarySetting = { key: string; value: unknown }
const kvItems = ref<ArbitrarySetting[]>([])
const kvLoading = ref(false)
const kvError = ref<string | null>(null)
const kvDraftKey = ref('')
const kvDraftValue = ref('')
const kvDraftError = ref<string | null>(null)
const kvSaveLoading = ref(false)
const kvSaveStatus = ref<'saved' | 'error' | null>(null)
const kvSaveStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(status: 'saved' | 'error') {
  if (kvSaveStatusTimeout.id) clearTimeout(kvSaveStatusTimeout.id)
  kvSaveStatus.value = status
  kvSaveStatusTimeout.id = setTimeout(() => {
    kvSaveStatus.value = null
    kvSaveStatusTimeout.id = null
  }, SAVE_STATUS_DURATION_MS)
}

function hasControlChars(s: string): boolean {
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function arbitrarySettingValueToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function loadArbitrarySettings() {
  kvLoading.value = true
  kvError.value = null
  try {
    const res = await listArbitrarySettingsRoute.run(ctx)
    const data = res as { success?: boolean; items?: ArbitrarySetting[]; error?: string }
    if (data?.success && Array.isArray(data.items)) {
      kvItems.value = data.items.slice().sort((a, b) => a.key.localeCompare(b.key))
    } else {
      kvError.value = data?.error || 'Не удалось получить список'
      kvItems.value = []
    }
  } catch (e) {
    kvError.value = (e as Error)?.message || String(e)
    kvItems.value = []
  } finally {
    kvLoading.value = false
  }
}

async function saveArbitrarySetting() {
  kvDraftError.value = null
  const key = kvDraftKey.value.trim()
  if (!key) {
    kvDraftError.value = 'Ключ обязателен (manual §5.9: непустая строка после обрезки пробелов).'
    showSaveStatus('error')
    return
  }
  if (hasControlChars(key)) {
    kvDraftError.value = 'Ключ содержит управляющие символы (manual §5.9).'
    showSaveStatus('error')
    return
  }
  const value = kvDraftValue.value
  kvSaveLoading.value = true
  try {
    const res = await saveSettingRoute.run(ctx, { key, value })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      kvDraftError.value = data.error || 'Ошибка сохранения'
      showSaveStatus('error')
      return
    }
    kvDraftKey.value = ''
    kvDraftValue.value = ''
    showSaveStatus('saved')
    await loadArbitrarySettings()
  } catch (e) {
    kvDraftError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus('error')
  } finally {
    kvSaveLoading.value = false
  }
}

async function startEditArbitrarySetting(key: string) {
  const item = kvItems.value.find((r) => r.key === key)
  if (!item) return
  kvDraftKey.value = item.key
  kvDraftValue.value = arbitrarySettingValueToString(item.value)
  kvDraftError.value = null
}

async function deleteArbitrarySetting(key: string) {
  kvSaveLoading.value = true
  try {
    const res = await deleteSettingRoute.run(ctx, { key })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      kvError.value = data.error || 'Ошибка удаления'
      showSaveStatus('error')
      return
    }
    showSaveStatus('saved')
    await loadArbitrarySettings()
  } catch (e) {
    kvError.value = (e as Error)?.message || String(e)
    showSaveStatus('error')
  } finally {
    kvSaveLoading.value = false
  }
}

onMounted(loadArbitrarySettings)
onBeforeUnmount(() => {
  if (kvSaveStatusTimeout.id) clearTimeout(kvSaveStatusTimeout.id)
})
</script>

<template>
  <section class="ap-card ap-card--stagger-4 ap-kv">
    <div class="ap-card-hd">
      <h2><i class="fas fa-key ap-icon-hd"></i> Произвольные настройки Heap</h2>
      <span
        v-if="kvSaveStatus"
        class="ap-badge"
        :class="kvSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        <i :class="kvSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
        {{ kvSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <p class="ap-gc-lead">
      Универсальный ввод «ключ — значение» (manual §5.9). Используется для
      <code class="ap-gc-code">gc_itest_*</code> (стратегия §5.8, уровень B) и других
      пользовательских строк настроек школы. Секреты (<code class="ap-gc-code"
        >gc_developer_api_key</code
      >, <code class="ap-gc-code">gc_test_school_api_key</code>) сюда не попадают — они задаются в
      форме «Настройки GetCourse» выше.
    </p>

    <div class="ap-kv-form">
      <div class="ap-kv-row">
        <label class="ap-kv-field">
          <span>Ключ</span>
          <input
            v-model="kvDraftKey"
            class="ap-input"
            placeholder="например, gc_itest_offer_id"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <label class="ap-kv-field ap-kv-field--grow">
          <span>Значение</span>
          <input
            v-model="kvDraftValue"
            class="ap-input"
            placeholder="строковое значение"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <button
          type="button"
          class="ap-btn ap-kv-save"
          :disabled="kvSaveLoading || !kvDraftKey.trim()"
          @click="saveArbitrarySetting"
        >
          <i :class="kvSaveLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
          Сохранить
        </button>
      </div>
      <p v-if="kvDraftError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ kvDraftError }}
      </p>
    </div>

    <div class="ap-kv-list">
      <div v-if="kvLoading" class="ap-kv-empty">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка списка…
      </div>
      <div v-else-if="kvError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ kvError }}
      </div>
      <div v-else-if="kvItems.length === 0" class="ap-kv-empty">
        Нет произвольных ключей. Добавьте, например,
        <code class="ap-gc-code">gc_itest_offer_id</code>,
        <code class="ap-gc-code">gc_itest_webhook_event_id</code>,
        <code class="ap-gc-code">gc_itest_webhook_event_object_id</code>,
        <code class="ap-gc-code">gc_itest_webhook_uri</code>.
      </div>
      <ul v-else class="ap-kv-rows">
        <li v-for="item in kvItems" :key="item.key" class="ap-kv-item">
          <code class="ap-gc-code ap-kv-key">{{ item.key }}</code>
          <span class="ap-kv-value">{{ arbitrarySettingValueToString(item.value) || '—' }}</span>
          <div class="ap-kv-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              @click="startEditArbitrarySetting(item.key)"
            >
              <i class="fas fa-pen"></i> Изменить
            </button>
            <button
              type="button"
              class="ap-btn ap-btn--sm ap-btn--danger"
              :disabled="kvSaveLoading"
              @click="deleteArbitrarySetting(item.key)"
            >
              <i class="fas fa-trash"></i> Удалить
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
