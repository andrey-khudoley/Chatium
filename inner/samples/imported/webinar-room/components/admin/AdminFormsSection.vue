<template>
  <div class="glass rounded-2xl p-5 space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
        <i class="fas fa-clipboard-list text-primary"></i>
        Формы для зрителей
      </h3>
      <button
        type="button"
        @click="openCreateForm"
        class="bg-primary hover:bg-primary/80 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
      >
        <i class="fas fa-plus"></i>
        Создать форму
      </button>
    </div>

    <p class="wr-text-tertiary text-xs">
      Создайте формы и показывайте их зрителям во время эфира. Форма откроется попапом поверх видео.
    </p>

    <div v-if="loading" class="flex justify-center py-4">
      <div
        class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
      ></div>
    </div>

    <div v-else-if="forms.length === 0" class="text-center py-6">
      <div
        class="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
        style="background: var(--wr-btn-subtle-bg)"
      >
        <i class="fas fa-clipboard-list text-primary text-lg"></i>
      </div>
      <p class="wr-text-tertiary text-sm">Нет созданных форм</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="f in forms" :key="f.id" class="glass-light rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="wr-text-primary font-medium text-sm truncate">{{ f.title }}</span>
            </div>
            <div class="wr-text-tertiary text-xs mt-0.5">
              {{ submitActionLabel(f.submitAction) }} · {{ (f.fields || []).length }}
              {{ pluralFields((f.fields || []).length) }}
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button
              v-if="isLiveOrWaiting"
              type="button"
              @click="toggleFormVisibility(f)"
              :disabled="formActionLoading === f.id"
              class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition wr-btn-green"
            >
              <i v-if="formActionLoading === f.id" class="fas fa-spinner fa-spin"></i>
              <template v-else>
                <i class="fas fa-paper-plane"></i>
                Показать
              </template>
            </button>
            <button
              type="button"
              @click="openEditForm(f)"
              class="admin-icon-btn"
              title="Редактировать"
            >
              <i class="fas fa-pen"></i>
            </button>
            <button
              type="button"
              @click="deleteForm(f.id)"
              :disabled="formActionLoading === f.id"
              class="admin-icon-btn admin-icon-btn--danger"
              title="Удалить"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="listError" class="wr-status-red text-xs">{{ listError }}</div>

    <FormEditorModal
      :visible="showEditor"
      :editingForm="editingFormData"
      @close="showEditor = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFormShowRoute, apiFormHideRoute } from '../../api/forms'
import { apiFormsAllRoute, apiFormDeleteRoute } from '../../api/forms-admin-routes'
import FormEditorModal from './FormEditorModal.vue'

const props = defineProps({
  episodeId: { type: String, required: true },
  episodeStatus: { type: String, default: '' }
})

const isLiveOrWaiting = ['live', 'waiting_room'].includes(props.episodeStatus)

const forms = ref([])
const loading = ref(true)
const listError = ref('')
const formActionLoading = ref('')
const showEditor = ref(false)
const editingFormData = ref(null)

function submitActionLabel(action) {
  const map = { thank_you: 'Стр. спасибо', redirect: 'Редирект', payment: 'Оплата' }
  return map[action] || action
}

function pluralFields(n) {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'полей'
  if (last > 1 && last < 5) return 'поля'
  if (last === 1) return 'поле'
  return 'полей'
}

function openCreateForm() {
  editingFormData.value = null
  showEditor.value = true
}

function openEditForm(f) {
  editingFormData.value = f
  showEditor.value = true
}

async function onFormSaved() {
  showEditor.value = false
  await loadForms()
}

async function loadForms() {
  loading.value = true
  listError.value = ''
  try {
    forms.value = await apiFormsAllRoute.run(ctx)
  } catch (e) {
    listError.value = e.message
  }
  loading.value = false
}

async function deleteForm(id) {
  if (!confirm('Удалить форму?')) return
  formActionLoading.value = id
  try {
    await apiFormDeleteRoute({ id }).run(ctx, {})
    await loadForms()
  } catch (e) {
    listError.value = e.message
  }
  formActionLoading.value = ''
}

async function toggleFormVisibility(f) {
  formActionLoading.value = f.id
  try {
    if (f.isShown) {
      await apiFormHideRoute.run(ctx, { formId: f.id })
    } else {
      await apiFormShowRoute.run(ctx, { formId: f.id })
    }
    await loadForms()
  } catch (e) {
    listError.value = e.message
  }
  formActionLoading.value = ''
}

onMounted(loadForms)
</script>

<style scoped>
.admin-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  flex-shrink: 0;
}
.admin-icon-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
.admin-icon-btn--danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
</style>
