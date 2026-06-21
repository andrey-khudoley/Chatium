<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { createComponentLogger } from '../../shared/logger'
import { AVAILABLE_AI_MODELS, DEFAULT_AI_MODEL } from '../../config/prompts'

const log = createComponentLogger('AiSettings')

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 800

const aiModel = ref<string>(DEFAULT_AI_MODEL)
const aiPrompt = ref<string>('')
const lastSavedModel = ref<string>(DEFAULT_AI_MODEL)
const lastSavedPrompt = ref<string>('')

const modelError = ref('')
const promptError = ref('')
const modelSaveStatus = ref<'saved' | 'error' | null>(null)
const promptSaveStatus = ref<'saved' | 'error' | null>(null)

const modelStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const promptStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const modelDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const promptDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(
  statusRef: { value: 'saved' | 'error' | null },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  status: 'saved' | 'error'
) {
  if (timeoutHolder.id) clearTimeout(timeoutHolder.id)
  statusRef.value = status
  timeoutHolder.id = setTimeout(() => {
    statusRef.value = null
    timeoutHolder.id = null
  }, SAVE_STATUS_DURATION_MS)
}

const loadSettings = async () => {
  try {
    const [modelRes, promptRes] = await Promise.all([
      getSettingRoute.query({ key: 'ai_model' }).run(ctx),
      getSettingRoute.query({ key: 'ai_formulate_system_prompt' }).run(ctx)
    ])

    const modelData = modelRes as { success?: boolean; value?: unknown }
    const promptData = promptRes as { success?: boolean; value?: unknown }

    if (modelData?.success && typeof modelData.value === 'string') {
      aiModel.value = modelData.value
      lastSavedModel.value = modelData.value
    }

    if (promptData?.success && typeof promptData.value === 'string') {
      aiPrompt.value = promptData.value
      lastSavedPrompt.value = promptData.value
    }

    log.debug('Настройки AI загружены', { model: aiModel.value, promptLength: aiPrompt.value.length })
  } catch (e) {
    log.warning('Не удалось загрузить настройки AI', e)
  }
}

watch(aiModel, () => {
  if (modelDebounceTimer.id) clearTimeout(modelDebounceTimer.id)
  modelDebounceTimer.id = setTimeout(() => {
    modelDebounceTimer.id = null
    if (aiModel.value !== lastSavedModel.value) {
      saveModel()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(aiPrompt, () => {
  if (promptDebounceTimer.id) clearTimeout(promptDebounceTimer.id)
  promptDebounceTimer.id = setTimeout(() => {
    promptDebounceTimer.id = null
    const trimmed = aiPrompt.value.trim()
    if (trimmed !== lastSavedPrompt.value) {
      savePrompt()
    }
  }, INPUT_DEBOUNCE_MS)
})

const saveModel = async () => {
  modelError.value = ''
  const prev = aiModel.value
  try {
    log.debug('Сохранение модели AI', { value: aiModel.value })
    const res = await saveSettingRoute.run(ctx, {
      key: 'ai_model',
      value: aiModel.value
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      modelError.value = data.error || 'Ошибка сохранения'
      aiModel.value = prev
      showSaveStatus(modelSaveStatus, modelStatusTimeout, 'error')
      log.error('Ошибка сохранения модели AI', modelError.value)
    } else {
      lastSavedModel.value = aiModel.value
      showSaveStatus(modelSaveStatus, modelStatusTimeout, 'saved')
      log.info('Модель AI успешно сохранена', aiModel.value)
    }
  } catch (e) {
    modelError.value = (e as Error)?.message || 'Ошибка сохранения'
    aiModel.value = prev
    showSaveStatus(modelSaveStatus, modelStatusTimeout, 'error')
    log.error('Ошибка сохранения модели AI', e)
  }
}

const savePrompt = async () => {
  promptError.value = ''
  const prev = aiPrompt.value
  try {
    log.debug('Сохранение промпта AI', { length: aiPrompt.value.length })
    const res = await saveSettingRoute.run(ctx, {
      key: 'ai_formulate_system_prompt',
      value: aiPrompt.value.trim()
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      promptError.value = data.error || 'Ошибка сохранения'
      aiPrompt.value = prev
      showSaveStatus(promptSaveStatus, promptStatusTimeout, 'error')
      log.error('Ошибка сохранения промпта AI', promptError.value)
    } else {
      lastSavedPrompt.value = aiPrompt.value.trim()
      showSaveStatus(promptSaveStatus, promptStatusTimeout, 'saved')
      log.info('Промпт AI успешно сохранён')
    }
  } catch (e) {
    promptError.value = (e as Error)?.message || 'Ошибка сохранения'
    aiPrompt.value = prev
    showSaveStatus(promptSaveStatus, promptStatusTimeout, 'error')
    log.error('Ошибка сохранения промпта AI', e)
  }
}

onMounted(() => {
  log.info('Компонент AiSettings смонтирован')
  loadSettings()
})

onBeforeUnmount(() => {
  if (modelStatusTimeout.id) clearTimeout(modelStatusTimeout.id)
  if (promptStatusTimeout.id) clearTimeout(promptStatusTimeout.id)
  if (modelDebounceTimer.id) clearTimeout(modelDebounceTimer.id)
  if (promptDebounceTimer.id) clearTimeout(promptDebounceTimer.id)
})
</script>

<template>
  <div class="admin-card">
    <span
      v-if="modelSaveStatus || promptSaveStatus"
      class="admin-card-status"
      :class="(modelSaveStatus === 'saved' || promptSaveStatus === 'saved') ? 'status-saved' : 'status-error'"
    >
      {{ (modelSaveStatus === 'saved' || promptSaveStatus === 'saved') ? 'Сохранено' : 'Ошибка' }}
    </span>
    <div class="admin-card-header">
      <i class="fas fa-brain admin-card-icon"></i>
      <h2 class="admin-card-title">Настройки AI (формулирование задач)</h2>
    </div>

    <div class="settings-form">
      <div class="settings-field">
        <label class="settings-label" for="ai-model">Модель AI</label>
        <select
          id="ai-model"
          v-model="aiModel"
          class="settings-select"
        >
          <option
            v-for="model in AVAILABLE_AI_MODELS"
            :key="model.value"
            :value="model.value"
          >
            {{ model.label }}
          </option>
        </select>
        <p v-if="modelError" class="field-error">{{ modelError }}</p>
      </div>

      <div class="settings-field">
        <label class="settings-label" for="ai-prompt">Системный промпт</label>
        <textarea
          id="ai-prompt"
          v-model="aiPrompt"
          class="settings-textarea"
          rows="12"
          placeholder="Введите системный промпт для AI..."
        ></textarea>
        <p class="settings-hint">
          Промпт определяет, как AI будет обрабатывать запрос и формулировать задачи.
        </p>
        <p v-if="promptError" class="field-error">{{ promptError }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-label {
  font-size: 1.02rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.settings-select,
.settings-textarea {
  padding: 0.7rem 0.9rem;
  font-family: inherit;
  font-size: 1.06rem;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.settings-select:focus,
.settings-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(211, 35, 75, 0.1);
}

.settings-textarea {
  resize: vertical;
  min-height: 200px;
  line-height: 1.5;
  font-family: 'Courier New', Courier, monospace;
}

.settings-hint {
  font-size: 0.98rem;
  color: var(--color-text-secondary);
  margin: 0;
  opacity: 0.8;
}

.field-error {
  margin: 0;
  font-size: 0.98rem;
  color: #e74c3c;
}

.admin-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
}

.admin-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.admin-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.admin-card-icon {
  color: var(--color-accent);
  font-size: 1rem;
}

.admin-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.admin-card-status {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.98rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  animation: statusFadeIn 0.2s ease;
}

.admin-card-status.status-saved {
  color: #27ae60;
}

.admin-card-status.status-error {
  color: #e74c3c;
}

@keyframes statusFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>