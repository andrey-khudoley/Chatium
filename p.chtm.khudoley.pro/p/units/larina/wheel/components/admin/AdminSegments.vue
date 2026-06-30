<script setup lang="ts">
// Карточка управления сегментами колеса: список, добавление, редактирование,
// удаление, переключение enabled, изменение порядка.
// Данные берутся только через API-routes.
import { onMounted, ref } from 'vue'
import { adminListSegmentsRoute } from '../../api/admin/segments/list'
import { adminSaveSegmentRoute } from '../../api/admin/segments/save'
import { adminDeleteSegmentRoute } from '../../api/admin/segments/delete'
import { adminReorderSegmentsRoute } from '../../api/admin/segments/reorder'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminSegments')

declare const ctx: app.Ctx

type Segment = {
  id: string
  order: number
  label: string
  full: string
  weight: number
  maxWins: number | null
  enabled: boolean
  prizeOfferID: string | null
  redirectUrl: string | null
}

type SegmentFormData = {
  id?: string
  label: string
  full: string
  weight: number | string
  maxWins: number | string | null
  enabled: boolean
  prizeOfferID: string
  redirectUrl: string
  order: number
}

const segments = ref<Segment[]>([])
const loading = ref(false)
const listError = ref('')

// Форма: null = скрыта, 'new' = создание нового, id = редактирование существующего
const formMode = ref<null | 'new' | string>(null)
const formData = ref<SegmentFormData>({
  label: '',
  full: '',
  weight: 1,
  maxWins: null,
  enabled: true,
  prizeOfferID: '',
  redirectUrl: '',
  order: 0
})
const formError = ref('')
const formSaving = ref(false)

// Подтверждение удаления
const deleteConfirmId = ref<string | null>(null)
const deleteError = ref('')

async function loadSegments() {
  loading.value = true
  listError.value = ''
  try {
    const res = await adminListSegmentsRoute.run(ctx)
    const data = res as { success?: boolean; segments?: Segment[]; error?: string }
    if (data?.success && Array.isArray(data.segments)) {
      segments.value = data.segments
      log.info('Сегменты загружены', { count: data.segments.length })
    } else {
      listError.value = data?.error || 'Не удалось загрузить сегменты'
      log.error('Ошибка загрузки сегментов', listError.value)
    }
  } catch (e) {
    listError.value = (e as Error)?.message || 'Ошибка загрузки'
    log.error('Ошибка загрузки сегментов', e)
  } finally {
    loading.value = false
  }
}

async function toggleEnabled(seg: Segment) {
  const newEnabled = !seg.enabled
  try {
    const res = await adminSaveSegmentRoute.run(ctx, {
      id: seg.id,
      label: seg.label,
      full: seg.full,
      weight: seg.weight,
      maxWins: seg.maxWins,
      enabled: newEnabled,
      prizeOfferID: seg.prizeOfferID,
      redirectUrl: seg.redirectUrl,
      order: seg.order
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      log.error('Ошибка переключения enabled', data.error)
    } else {
      log.info('enabled переключён', { id: seg.id, enabled: newEnabled })
      await loadSegments()
    }
  } catch (e) {
    log.error('Ошибка переключения enabled', e)
  }
}

async function moveUp(index: number) {
  if (index === 0) return
  const ids = segments.value.map((s) => s.id)
  const tmp = ids[index - 1]!
  ids[index - 1] = ids[index]!
  ids[index] = tmp
  await reorder(ids)
}

async function moveDown(index: number) {
  if (index === segments.value.length - 1) return
  const ids = segments.value.map((s) => s.id)
  const tmp = ids[index + 1]!
  ids[index + 1] = ids[index]!
  ids[index] = tmp
  await reorder(ids)
}

async function reorder(ids: string[]) {
  try {
    const res = await adminReorderSegmentsRoute.run(ctx, { ids })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      log.error('Ошибка изменения порядка', data.error)
    } else {
      log.info('Порядок сегментов изменён')
      await loadSegments()
    }
  } catch (e) {
    log.error('Ошибка изменения порядка', e)
  }
}

function openNewForm() {
  formMode.value = 'new'
  formError.value = ''
  formData.value = {
    label: '',
    full: '',
    weight: 1,
    maxWins: null,
    enabled: true,
    prizeOfferID: '',
    redirectUrl: '',
    order: segments.value.length
  }
}

function openEditForm(seg: Segment) {
  formMode.value = seg.id
  formError.value = ''
  formData.value = {
    id: seg.id,
    label: seg.label,
    full: seg.full,
    weight: seg.weight,
    maxWins: seg.maxWins,
    enabled: seg.enabled,
    prizeOfferID: seg.prizeOfferID ?? '',
    redirectUrl: seg.redirectUrl ?? '',
    order: seg.order
  }
}

function closeForm() {
  formMode.value = null
  formError.value = ''
}

async function submitForm() {
  formError.value = ''
  const label = String(formData.value.label ?? '').trim()
  if (!label) {
    formError.value = 'Поле label обязательно'
    return
  }

  const weight = Number(formData.value.weight)
  if (!Number.isFinite(weight) || weight < 0) {
    formError.value = 'Вес должен быть ≥ 0'
    return
  }

  const maxWinsRaw = formData.value.maxWins
  const maxWins =
    maxWinsRaw === null || maxWinsRaw === '' || maxWinsRaw === undefined
      ? null
      : parseInt(String(maxWinsRaw), 10)

  const prizeOfferID = String(formData.value.prizeOfferID ?? '').trim() || null
  const redirectUrl = String(formData.value.redirectUrl ?? '').trim() || null
  const id =
    typeof formData.value.id === 'string' && formData.value.id ? formData.value.id : undefined

  formSaving.value = true
  try {
    const res = await adminSaveSegmentRoute.run(ctx, {
      id,
      label,
      full: String(formData.value.full ?? ''),
      weight,
      maxWins,
      enabled: Boolean(formData.value.enabled),
      prizeOfferID,
      redirectUrl,
      order: Number(formData.value.order) || 0
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      formError.value = data.error || 'Ошибка сохранения'
      log.error('Ошибка сохранения сегмента', formError.value)
    } else {
      log.info('Сегмент сохранён', { id })
      closeForm()
      await loadSegments()
    }
  } catch (e) {
    formError.value = (e as Error)?.message || 'Ошибка сохранения'
    log.error('Ошибка сохранения сегмента', e)
  } finally {
    formSaving.value = false
  }
}

function requestDelete(id: string) {
  deleteConfirmId.value = id
  deleteError.value = ''
}

function cancelDelete() {
  deleteConfirmId.value = null
  deleteError.value = ''
}

async function confirmDelete() {
  const id = deleteConfirmId.value
  if (!id) return
  deleteError.value = ''
  try {
    const res = await adminDeleteSegmentRoute.run(ctx, { id })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      deleteError.value = data.error || 'Ошибка удаления'
      log.error('Ошибка удаления сегмента', deleteError.value)
    } else {
      log.info('Сегмент удалён', { id })
      deleteConfirmId.value = null
      await loadSegments()
    }
  } catch (e) {
    deleteError.value = (e as Error)?.message || 'Ошибка удаления'
    log.error('Ошибка удаления сегмента', e)
  }
}

function truncate(str: string | null | undefined, len = 40): string {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}

onMounted(() => {
  log.info('Компонент смонтирован')
  loadSegments()
})
</script>

<template>
  <section class="ap-card ap-card--stagger-5">
    <div class="ap-card-hd">
      <h2><i class="fas fa-list ap-icon-hd"></i> Сегменты колеса</h2>
      <button
        type="button"
        class="ap-btn ap-btn--sm"
        @click="openNewForm"
        :disabled="formMode !== null"
      >
        <i class="fas fa-plus"></i> Добавить
      </button>
    </div>

    <p v-if="listError" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ listError }}</p>

    <!-- Форма нового/редактируемого сегмента -->
    <div v-if="formMode !== null" class="ap-segment-form">
      <h3 class="ap-segment-form__title">
        {{ formMode === 'new' ? 'Новый сегмент' : 'Редактирование сегмента' }}
      </h3>
      <div class="ap-field-row">
        <label class="ap-label" for="seg-label">Метка (label, допускает &lt;br&gt;)</label>
      </div>
      <input
        id="seg-label"
        v-model="formData.label"
        type="text"
        class="ap-input"
        placeholder="Текст на секторе"
      />

      <div class="ap-field-row">
        <label class="ap-label" for="seg-full">Полный текст приза (full)</label>
      </div>
      <input
        id="seg-full"
        v-model="formData.full"
        type="text"
        class="ap-input"
        placeholder="Текст приза на экране результата"
      />

      <div class="ap-field-row">
        <label class="ap-label" for="seg-weight">Вес (weight ≥ 0)</label>
      </div>
      <input
        id="seg-weight"
        v-model.number="formData.weight"
        type="number"
        min="0"
        step="0.1"
        class="ap-input"
        placeholder="1"
      />

      <div class="ap-field-row">
        <label class="ap-label" for="seg-max-wins">Макс. выигрышей (maxWins, опц.)</label>
      </div>
      <input
        id="seg-max-wins"
        v-model="formData.maxWins"
        type="number"
        min="0"
        step="1"
        class="ap-input"
        placeholder="Без ограничения"
      />

      <div class="ap-field-row">
        <label class="ap-label" for="seg-prize-offer"
          >ID предложения GetCourse (prizeOfferID, опц.)</label
        >
      </div>
      <input
        id="seg-prize-offer"
        v-model="formData.prizeOfferID"
        type="text"
        class="ap-input"
        placeholder="offer_id"
      />

      <div class="ap-field-row">
        <label class="ap-label" for="seg-redirect">URL редиректа (redirectUrl, опц.)</label>
      </div>
      <input
        id="seg-redirect"
        v-model="formData.redirectUrl"
        type="text"
        class="ap-input"
        placeholder="https://..."
      />

      <div class="ap-field-row ap-field-row--checkbox">
        <label class="ap-label">
          <input type="checkbox" v-model="formData.enabled" class="ap-checkbox" />
          Сегмент включён (enabled)
        </label>
      </div>

      <p v-if="formError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ formError }}
      </p>

      <div class="ap-segment-form__actions">
        <button type="button" class="ap-btn" @click="submitForm" :disabled="formSaving">
          <i class="fas fa-save"></i> {{ formSaving ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button
          type="button"
          class="ap-btn ap-btn--ghost"
          @click="closeForm"
          :disabled="formSaving"
        >
          Отмена
        </button>
      </div>
    </div>

    <!-- Диалог подтверждения удаления -->
    <div v-if="deleteConfirmId !== null" class="ap-confirm">
      <p class="ap-confirm__msg">
        <i class="fas fa-exclamation-triangle"></i> Удалить сегмент? Это действие необратимо.
      </p>
      <p v-if="deleteError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ deleteError }}
      </p>
      <div class="ap-confirm__actions">
        <button type="button" class="ap-btn ap-btn--danger" @click="confirmDelete">
          <i class="fas fa-trash"></i> Удалить
        </button>
        <button type="button" class="ap-btn ap-btn--ghost" @click="cancelDelete">Отмена</button>
      </div>
    </div>

    <!-- Список сегментов -->
    <div v-if="loading" class="ap-loading">
      <i class="fas fa-circle-notch fa-spin"></i> Загрузка…
    </div>

    <div v-else-if="segments.length === 0 && !listError" class="ap-empty">
      Сегменты не найдены. Добавьте первый сегмент.
    </div>

    <div v-else class="ap-segments-list">
      <div
        v-for="(seg, index) in segments"
        :key="seg.id"
        class="ap-segment-row"
        :class="{ 'ap-segment-row--disabled': !seg.enabled }"
      >
        <div class="ap-segment-row__order">{{ seg.order }}</div>

        <div class="ap-segment-row__info">
          <span class="ap-segment-row__label" :title="seg.label">{{ seg.label }}</span>
          <span class="ap-segment-row__full" :title="seg.full">{{ truncate(seg.full) }}</span>
          <span class="ap-segment-row__meta">
            вес: {{ seg.weight }}
            <template v-if="seg.maxWins !== null"> · лимит: {{ seg.maxWins }}</template>
            <template v-if="seg.prizeOfferID"> · offer: {{ seg.prizeOfferID }}</template>
            <template v-if="seg.redirectUrl"> · url: {{ truncate(seg.redirectUrl, 30) }}</template>
          </span>
        </div>

        <div class="ap-segment-row__actions">
          <!-- Порядок -->
          <button
            type="button"
            class="ap-btn ap-btn--icon"
            title="Вверх"
            :disabled="index === 0"
            @click="moveUp(index)"
          >
            <i class="fas fa-chevron-up"></i>
          </button>
          <button
            type="button"
            class="ap-btn ap-btn--icon"
            title="Вниз"
            :disabled="index === segments.length - 1"
            @click="moveDown(index)"
          >
            <i class="fas fa-chevron-down"></i>
          </button>

          <!-- enabled toggle -->
          <button
            type="button"
            class="ap-btn ap-btn--icon"
            :title="seg.enabled ? 'Отключить' : 'Включить'"
            @click="toggleEnabled(seg)"
          >
            <i :class="seg.enabled ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
          </button>

          <!-- Изменить -->
          <button
            type="button"
            class="ap-btn ap-btn--icon"
            title="Изменить"
            :disabled="formMode !== null"
            @click="openEditForm(seg)"
          >
            <i class="fas fa-pen"></i>
          </button>

          <!-- Удалить -->
          <button
            type="button"
            class="ap-btn ap-btn--icon ap-btn--danger"
            title="Удалить"
            :disabled="deleteConfirmId !== null"
            @click="requestDelete(seg.id)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
