<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { pluginLavatopCatalogRoute } from '../../api/plugins/lavatop-catalog'
import { pluginSettingRevealRoute } from '../../api/plugins/setting-reveal'
import { pluginSettingsSaveRoute } from '../../api/plugins/settings-save'
import { useSettingsAutoSave, type AutoSaveResult } from '../../shared/useSettingsAutoSave'
import type {
  LavatopCatalogProduct,
  LavatopCatalogResponse,
  PluginRuntimeConfig,
  PluginSettingField
} from '../../shared/pluginManifestTypes'

declare const ctx: app.Ctx

const props = defineProps<{
  plugin: PluginRuntimeConfig
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:plugin', value: PluginRuntimeConfig): void
}>()

const values = reactive<Record<string, string | boolean>>({})
const errors = reactive<Record<string, string>>({})
const revealed = reactive<Record<string, boolean>>({})
const revealLoaded = reactive<Record<string, boolean>>({})
const savingKey = ref('')
const revealingKey = ref('')
const savedKey = ref('')
const copiedWebhookKey = ref('')
const lavatopCatalogLoading = ref(false)
const lavatopCatalogLoaded = ref(false)
const lavatopCatalogError = ref('')
const lavatopCatalogProducts = ref<LavatopCatalogProduct[]>([])

const LAVATOP_PRODUCT_KEY = 'widget_lavatop_product_id'
const LAVATOP_OFFER_KEY = 'widget_lavatop_offer_id'

const visibleFields = computed(() => props.plugin.manifest.fields.filter((field) => !field.hidden))
const isLavatopPlugin = computed(() => props.plugin.manifest.id === 'lavatop')
const selectedLavatopProductId = computed(() => String(values[LAVATOP_PRODUCT_KEY] ?? '').trim())
const selectedLavatopOfferId = computed(() => String(values[LAVATOP_OFFER_KEY] ?? '').trim())
const selectedLavatopProduct = computed(
  () =>
    lavatopCatalogProducts.value.find((product) => product.id === selectedLavatopProductId.value) ??
    null
)
const selectedLavatopOffers = computed(() => selectedLavatopProduct.value?.offers ?? [])

function resetValues() {
  for (const field of props.plugin.manifest.fields) {
    const publicValue = props.plugin.values[field.key]
    if (field.input === 'boolean') {
      values[field.key] = publicValue?.value === true
    } else if (field.secret || !('value' in (publicValue || {}))) {
      values[field.key] = ''
    } else {
      values[field.key] = typeof publicValue?.value === 'string' ? publicValue.value : ''
    }
    errors[field.key] = ''
    revealed[field.key] = false
    revealLoaded[field.key] = false
  }
}

watch(() => props.plugin, resetValues, { immediate: true, deep: true })

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes)
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Web Crypto is unavailable')
  }
  crypto.getRandomValues(buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fieldPlaceholder(field: PluginSettingField): string {
  const value = props.plugin.values[field.key]
  if ((field.secret || value?.maskedValue) && value?.hasValue) return value.maskedValue || 'Saved'
  return field.placeholder || ''
}

function maskedValue(field: PluginSettingField): string {
  return props.plugin.values[field.key]?.maskedValue || ''
}

function isSecretField(field: PluginSettingField): boolean {
  return !!field.secret || field.input === 'password'
}

function isEmptySecret(field: PluginSettingField): boolean {
  return !!field.secret && String(values[field.key] ?? '').trim() === ''
}

function inputType(field: PluginSettingField): string {
  if (isSecretField(field)) return revealed[field.key] ? 'text' : 'password'
  return field.input
}

async function toggleReveal(field: PluginSettingField) {
  if (!isSecretField(field)) return
  if (revealed[field.key]) {
    revealed[field.key] = false
    return
  }

  if (
    !revealLoaded[field.key] &&
    String(values[field.key] ?? '').trim() === '' &&
    props.plugin.values[field.key]?.hasValue
  ) {
    errors[field.key] = ''
    revealingKey.value = field.key
    try {
      const response = await pluginSettingRevealRoute.run(ctx, {
        pluginId: props.plugin.manifest.id,
        key: field.key
      })
      if (!(response as { success?: boolean }).success) {
        throw new Error((response as { error?: string }).error || 'Reveal failed')
      }
      values[field.key] = (response as { value?: string }).value || ''
      revealLoaded[field.key] = true
    } catch (e) {
      errors[field.key] = e instanceof Error ? e.message : String(e)
      return
    } finally {
      if (revealingKey.value === field.key) revealingKey.value = ''
    }
  }

  revealed[field.key] = true
}

async function savePluginField(key: string, value: unknown): Promise<AutoSaveResult> {
  const field = props.plugin.manifest.fields.find((item) => item.key === key)
  if (!field || !props.canEdit || field.readonly) return { success: true }
  if (isEmptySecret(field)) return { success: true }

  errors[key] = ''
  savedKey.value = ''
  savingKey.value = key

  try {
    const response = await pluginSettingsSaveRoute.run(ctx, {
      pluginId: props.plugin.manifest.id,
      key,
      value
    })
    if (!(response as { success?: boolean }).success) {
      const error = (response as { error?: string }).error || 'Save failed'
      errors[key] = error
      return { success: false, error }
    }
    emit('update:plugin', (response as { plugin: PluginRuntimeConfig }).plugin)
    savedKey.value = key
    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    errors[key] = error
    return { success: false, error }
  } finally {
    if (savingKey.value === key) savingKey.value = ''
  }
}

const {
  saving,
  saveStatus,
  error: saveError,
  queue,
  flush
} = useSettingsAutoSave({
  save: savePluginField,
  debounceMs: 650,
  statusDurationMs: 1800
})

function queueField(field: PluginSettingField) {
  if (!props.canEdit || field.readonly || isEmptySecret(field)) return
  errors[field.key] = ''
  queue(field.key, values[field.key])
}

async function flushField(field: PluginSettingField) {
  if (!props.canEdit || field.readonly || isEmptySecret(field)) return
  errors[field.key] = ''
  await flush(field.key, values[field.key])
}

function fillGenerated(field: PluginSettingField) {
  errors[field.key] = ''
  try {
    values[field.key] = randomHex(field.generator === 'hex64' ? 32 : 16)
    queueField(field)
  } catch (_e) {
    errors[field.key] = 'Secret generation is unavailable in this browser.'
  }
}

function fieldStatusText(field: PluginSettingField): string {
  if (savingKey.value === field.key) return 'Saving...'
  if (errors[field.key]) return 'Error'
  if (savedKey.value === field.key) return 'Saved'
  return ''
}

function fieldStatusClass(field: PluginSettingField): string {
  if (savingKey.value === field.key) return 'is-saving'
  if (errors[field.key]) return 'is-error'
  if (savedKey.value === field.key) return 'is-saved'
  return ''
}

async function loadLavatopCatalog() {
  if (!props.canEdit || !isLavatopPlugin.value) return
  lavatopCatalogLoading.value = true
  lavatopCatalogError.value = ''
  try {
    const response = (await pluginLavatopCatalogRoute.run(ctx)) as LavatopCatalogResponse
    if (!response.success) {
      lavatopCatalogError.value = response.error || 'Не удалось загрузить каталог Lava.Top'
      return
    }
    lavatopCatalogProducts.value = response.products
    lavatopCatalogLoaded.value = true
  } catch (e) {
    lavatopCatalogError.value = e instanceof Error ? e.message : String(e)
  } finally {
    lavatopCatalogLoading.value = false
  }
}

function productLabel(product: LavatopCatalogProduct): string {
  return product.title && product.title !== product.id
    ? `${product.title} (${product.id})`
    : product.id
}

function offerLabel(offer: { id: string; title: string }): string {
  return offer.title && offer.title !== offer.id ? `${offer.title} (${offer.id})` : offer.id
}

async function saveLavatopSelection(key: string, value: string) {
  const field = props.plugin.manifest.fields.find((item) => item.key === key)
  if (!field) return
  values[key] = value
  await savePluginField(key, value)
}

async function onLavatopProductChange(event: Event) {
  const productId = (event.target as HTMLSelectElement).value
  await saveLavatopSelection(LAVATOP_PRODUCT_KEY, productId)
  if (selectedLavatopOfferId.value) {
    await saveLavatopSelection(LAVATOP_OFFER_KEY, '')
  }
}

async function onLavatopOfferChange(event: Event) {
  await saveLavatopSelection(LAVATOP_OFFER_KEY, (event.target as HTMLSelectElement).value)
}

onMounted(() => {
  if (isLavatopPlugin.value) loadLavatopCatalog()
})

async function copyWebhookUrl(key: string, url: string) {
  try {
    await navigator.clipboard.writeText(url)
    copiedWebhookKey.value = key
    window.setTimeout(() => {
      if (copiedWebhookKey.value === key) copiedWebhookKey.value = ''
    }, 1600)
  } catch (_e) {
    copiedWebhookKey.value = ''
  }
}
</script>

<template>
  <section class="panel-section st-section pm-plugin">
    <header class="panel-section-head pm-head">
      <span class="prompt">›</span>
      <h2>
        <i v-if="plugin.manifest.icon" class="fas" :class="plugin.manifest.icon"></i>
        {{ plugin.manifest.title }}
      </h2>
      <span
        v-if="saving || saveStatus"
        class="st-msg pm-form-state"
        :class="saveStatus === 'error' ? 'is-err' : saveStatus === 'saved' ? 'is-ok' : ''"
      >
        <i v-if="saving" class="fas fa-spinner fa-spin"></i>
        {{ saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error' }}
      </span>
      <span class="st-toggle-state pm-status" :class="plugin.configured ? 'is-on' : ''">
        {{ plugin.configured ? 'Настроен' : 'Нужно заполнить' }}
      </span>
    </header>

    <p v-if="plugin.manifest.description" class="st-section-sub pm-desc">
      {{ plugin.manifest.description }}
    </p>

    <div v-if="plugin.webhookEndpoints?.length" class="pm-webhooks">
      <div
        v-for="endpoint in plugin.webhookEndpoints"
        :key="endpoint.key"
        class="st-field-full pm-field pm-webhook-field"
      >
        <label class="st-field-label pm-label">
          <span>{{ endpoint.label }}</span>
        </label>
        <span class="pm-input-row">
          <input class="st-input pm-readonly-input" type="url" :value="endpoint.url" disabled />
          <button
            type="button"
            class="st-snippet-copy pm-icon-btn"
            :title="copiedWebhookKey === endpoint.key ? 'Copied' : 'Copy URL'"
            @click.prevent="copyWebhookUrl(endpoint.key, endpoint.url)"
          >
            <i class="fas" :class="copiedWebhookKey === endpoint.key ? 'fa-check' : 'fa-copy'"></i>
          </button>
        </span>
        <p v-if="endpoint.hint" class="st-field-hint pm-hint pm-webhook-hint">
          {{ endpoint.hint }}
        </p>
      </div>
    </div>

    <div class="st-grid pm-fields">
      <div v-for="field in visibleFields" :key="field.key" class="st-field-full pm-field">
        <label class="st-field-label pm-label">
          <span>{{ field.label }}</span>
          <span v-if="field.required" class="pm-required">*</span>
        </label>

        <label v-if="field.input === 'boolean'" class="st-toggle-row pm-toggle">
          <span class="st-toggle">
            <input
              v-model="values[field.key]"
              type="checkbox"
              :disabled="!canEdit || !!field.readonly"
              @change="flushField(field)"
            />
            <span class="st-toggle-slider"></span>
          </span>
          <span class="st-toggle-text">
            <span class="st-toggle-title">{{ values[field.key] ? 'Включено' : 'Выключено' }}</span>
            <span class="st-toggle-hint">{{ field.hint || maskedValue(field) }}</span>
          </span>
        </label>

        <span v-else-if="field.input === 'select'" class="pm-input-row">
          <select
            v-model="values[field.key]"
            class="st-input"
            :disabled="!canEdit || !!field.readonly"
            @change="flushField(field)"
          >
            <option v-for="option in field.options || []" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </span>

        <span v-else class="pm-input-row">
          <input
            v-model="values[field.key]"
            class="st-input"
            :type="inputType(field)"
            :placeholder="fieldPlaceholder(field)"
            :disabled="!canEdit || !!field.readonly"
            autocomplete="off"
            @input="queueField(field)"
            @blur="flushField(field)"
          />
          <button
            v-if="field.generator"
            type="button"
            class="st-snippet-copy pm-icon-btn"
            :disabled="!canEdit || !!field.readonly"
            title="Сгенерировать"
            @click.prevent="fillGenerated(field)"
          >
            <i class="fas fa-wand-magic-sparkles"></i>
          </button>
          <button
            v-if="isSecretField(field)"
            type="button"
            class="st-snippet-copy pm-icon-btn"
            :class="revealed[field.key] ? 'is-active' : ''"
            :disabled="!canEdit || !!field.readonly || revealingKey === field.key"
            :title="revealed[field.key] ? 'Скрыть' : 'Показать'"
            @click.prevent="toggleReveal(field)"
          >
            <i
              class="fas"
              :class="
                revealingKey === field.key
                  ? 'fa-spinner fa-spin'
                  : revealed[field.key]
                    ? 'fa-eye-slash'
                    : 'fa-eye'
              "
            ></i>
          </button>
        </span>

        <div class="pm-meta">
          <p v-if="field.hint && field.input !== 'boolean'" class="st-field-hint pm-hint">
            {{ field.hint }}
          </p>
          <p
            v-else-if="maskedValue(field) && field.input !== 'boolean'"
            class="st-field-hint pm-hint"
          >
            Сохранено: {{ maskedValue(field) }}
          </p>
          <p
            v-if="fieldStatusText(field)"
            class="st-msg pm-actions"
            :class="fieldStatusClass(field)"
          >
            <span v-if="fieldStatusText(field)" class="pm-field-status">
              <i v-if="savingKey === field.key" class="fas fa-spinner fa-spin"></i>
              {{ fieldStatusText(field) }}
            </span>
          </p>
          <p v-if="errors[field.key]" class="st-msg is-err pm-error">{{ errors[field.key] }}</p>
        </div>
      </div>
    </div>

    <div v-if="isLavatopPlugin" class="pm-lavatop-catalog">
      <div class="pm-catalog-head">
        <div>
          <h3>Lava.Top deal-поток</h3>
          <p class="st-field-hint pm-catalog-hint">
            {{
              selectedLavatopProductId && selectedLavatopOfferId
                ? 'Продукт и оффер выбраны.'
                : 'Выберите продукт и оффер для создания инвойсов.'
            }}
          </p>
        </div>
        <button
          type="button"
          class="st-snippet-copy pm-catalog-refresh"
          :disabled="!canEdit || lavatopCatalogLoading"
          title="Обновить каталог"
          @click.prevent="loadLavatopCatalog"
        >
          <i class="fas" :class="lavatopCatalogLoading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
        </button>
      </div>

      <div class="pm-lavatop-limits" role="note">
        <i class="fas fa-triangle-exclamation"></i>
        <div>
          <strong>Лимиты Lava.Top</strong>
          <p>
            Минимальная сумма: 50 ₽, 5 $, 5 €. Заказы ниже этих значений не будут отправлены в
            Lava.Top.
          </p>
        </div>
      </div>

      <div class="st-grid pm-catalog-grid">
        <div class="st-field-full pm-field">
          <label class="st-field-label pm-label">
            <span>Продукт</span>
            <span class="pm-required">*</span>
          </label>
          <select
            class="st-input"
            :value="selectedLavatopProductId"
            :disabled="!canEdit || lavatopCatalogLoading || !lavatopCatalogProducts.length"
            @change="onLavatopProductChange"
          >
            <option value="">Выберите продукт</option>
            <option v-for="product in lavatopCatalogProducts" :key="product.id" :value="product.id">
              {{ productLabel(product) }}
            </option>
          </select>
        </div>

        <div class="st-field-full pm-field">
          <label class="st-field-label pm-label">
            <span>Оффер</span>
            <span class="pm-required">*</span>
          </label>
          <select
            class="st-input"
            :value="selectedLavatopOfferId"
            :disabled="
              !canEdit ||
              lavatopCatalogLoading ||
              !selectedLavatopProductId ||
              !selectedLavatopOffers.length
            "
            @change="onLavatopOfferChange"
          >
            <option value="">Выберите оффер</option>
            <option v-for="offer in selectedLavatopOffers" :key="offer.id" :value="offer.id">
              {{ offerLabel(offer) }}
            </option>
          </select>
          <p
            v-if="selectedLavatopProductId && !selectedLavatopOffers.length && lavatopCatalogLoaded"
            class="st-field-hint pm-catalog-hint"
          >
            У выбранного продукта нет офферов в ответе Lava.Top.
          </p>
        </div>
      </div>

      <p v-if="lavatopCatalogLoading" class="st-msg pm-catalog-state">
        <i class="fas fa-spinner fa-spin"></i> Загрузка каталога Lava.Top...
      </p>
      <p v-else-if="lavatopCatalogError" class="st-msg is-err pm-catalog-state">
        <i class="fas fa-exclamation-circle"></i> {{ lavatopCatalogError }}
      </p>
    </div>

    <p v-if="saveError" class="st-msg is-err pm-global-error">{{ saveError }}</p>
  </section>
</template>

<style scoped>
.pm-plugin {
  margin-bottom: 0;
}

.pm-head {
  align-items: center;
  gap: 0.6rem;
}

.pm-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin-right: auto;
}

.pm-form-state {
  margin: 0;
  white-space: nowrap;
}

.pm-status {
  flex-shrink: 0;
}

.pm-desc {
  margin-bottom: 1rem;
}

.pm-fields {
  margin-top: 0.75rem;
}

.pm-webhooks {
  display: grid;
  gap: 0.75rem;
  margin: 0.85rem 0 0.25rem;
}

.pm-lavatop-catalog {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
}

.pm-catalog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.pm-catalog-head h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.pm-catalog-hint,
.pm-catalog-state {
  margin: 0;
}

.pm-lavatop-limits {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.75rem;
  color: var(--color-text, #f8fafc);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.38);
  border-radius: 8px;
}

.pm-lavatop-limits i {
  flex: 0 0 auto;
  margin-top: 0.15rem;
  color: #f59e0b;
}

.pm-lavatop-limits strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.86rem;
}

.pm-lavatop-limits p {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--color-muted, #94a3b8);
}

.pm-catalog-refresh {
  position: static;
  flex: 0 0 2.25rem;
  width: 2.25rem;
  min-height: 2.25rem;
}

.pm-catalog-grid {
  margin-top: 0;
}

.pm-field {
  min-width: 0;
}

.pm-label {
  display: inline-flex;
  gap: 0.25rem;
  align-items: baseline;
}

.pm-required {
  color: var(--color-accent);
}

.pm-input-row {
  display: flex;
  gap: 0.5rem;
  min-width: 0;
}

.pm-input-row .st-input {
  min-width: 0;
}

.pm-icon-btn {
  position: static;
  flex: 0 0 2.25rem;
  width: 2.25rem;
  height: auto;
  min-height: 2.25rem;
}

.pm-icon-btn.is-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.pm-readonly-input:disabled {
  cursor: text;
  opacity: 1;
}

.pm-webhook-hint {
  margin-top: 0.35rem;
}

.pm-toggle {
  margin-top: 0;
}

.pm-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 1.35rem;
  margin-top: 0.35rem;
}

.pm-hint {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pm-actions,
.pm-error,
.pm-global-error {
  margin: 0;
}

.pm-actions {
  flex-shrink: 0;
  white-space: nowrap;
}

.pm-actions.is-saving {
  color: var(--color-muted, var(--color-accent));
}

.pm-actions.is-saved {
  color: var(--color-success, var(--color-accent));
}

.pm-actions.is-error {
  color: var(--color-danger, var(--color-accent));
}

.pm-field-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.pm-error {
  overflow: hidden;
  max-width: 22rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pm-global-error {
  margin-top: 0.75rem;
}

@media (max-width: 760px) {
  .pm-head {
    flex-wrap: wrap;
  }

  .pm-form-state,
  .pm-status {
    order: 2;
  }

  .pm-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .pm-hint,
  .pm-error {
    max-width: none;
    white-space: normal;
  }
}
</style>
