<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <h1 class="wr-text-primary font-bold text-base sm:text-lg">Формы для зрителей</h1>
      </div>
    </header>

    <main
      class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6"
    >
      <div class="glass rounded-2xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <button
            @click="defaultProvidersExpanded = !defaultProvidersExpanded"
            class="flex items-center gap-2 hover:opacity-80 transition flex-1 text-left"
          >
            <i class="fas fa-credit-card text-primary"></i>
            <h3 class="wr-text-primary font-semibold text-sm">Провайдеры оплаты по умолчанию</h3>
            <i
              class="fas fa-chevron-down text-xs wr-text-tertiary transition-transform"
              :class="{ 'rotate-180': defaultProvidersExpanded }"
            ></i>
          </button>
          <button
            v-if="defaultProvidersEditing"
            @click="saveDefaultProviders"
            class="bg-primary hover:bg-primary/80 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
          >
            <i class="fas fa-check"></i>
            Сохранить
          </button>
        </div>
        <transition
          name="accordion"
          @enter="accordionEnter"
          @after-enter="accordionAfterEnter"
          @leave="accordionLeave"
        >
          <div v-if="defaultProvidersExpanded" class="space-y-4">
            <p class="wr-text-tertiary text-xs">
              Выберите провайдеры, которые будут автоматически выбраны при создании новой формы с
              оплатой
            </p>
            <div v-if="loadingDefaultProviders" class="flex justify-center py-4">
              <div
                class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            </div>
            <div v-else-if="allProviders.length === 0" class="wr-text-tertiary text-xs">
              Нет доступных провайдеров.
              <a
                href="/app/pay?tab=providers&action=add"
                target="_blank"
                class="text-primary hover:underline"
                >Настройте платёжную систему</a
              >.
            </div>
            <div v-else>
              <PaymentProvidersSelector
                :model-value="defaultProviders"
                @update:model-value="toggleDefaultProvider"
                :providers="allProviders"
                :loading="false"
                :columns="2"
              >
                <template #hint>
                  Эти провайдеры будут выбраны при создании новой формы с оплатой. В существующих
                  формах настройки не изменятся.
                </template>
              </PaymentProvidersSelector>
            </div>
          </div>
        </transition>
      </div>
      <div class="glass rounded-2xl p-5 space-y-5">
        <div class="flex items-center justify-between gap-2">
          <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
            <i class="fas fa-clipboard-list text-primary"></i>
            Все формы
          </h3>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="goToSubmissions"
              class="admin-btn-subtle px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <i class="fas fa-inbox"></i>
              Ответы
            </button>
            <button
              type="button"
              @click="openCreateForm"
              class="bg-primary hover:bg-primary/80 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <i class="fas fa-plus"></i>
              Создать форму
            </button>
          </div>
        </div>

        <div class="relative">
          <i
            class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 wr-text-tertiary text-xs"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск форм..."
            class="w-full pl-9 pr-3 py-2 rounded-lg text-sm transition"
            style="
              background: var(--wr-input-bg);
              color: var(--wr-text-primary);
              border: 1px solid var(--wr-input-border);
            "
          />
        </div>

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

        <div v-else-if="forms.length === 0 && searchQuery.trim()" class="text-center py-6">
          <div
            class="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style="background: var(--wr-btn-subtle-bg)"
          >
            <i class="fas fa-search text-primary text-lg"></i>
          </div>
          <p class="wr-text-tertiary text-sm">Ничего не найдено</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="f in forms" :key="f.id" class="glass-light rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="wr-text-primary font-medium text-sm truncate">{{ f.title }}</span>
                </div>
                <div class="wr-text-tertiary text-xs mt-0.5">
                  {{ submitActionLabel(f.submitAction) }} · {{ (f.fields || []).length }}
                  {{ pluralFields((f.fields || []).length) }}
                  <span v-if="submissionCounts[f.id]" class="ml-1">
                    ·
                    <a
                      href="#"
                      @click.prevent="goToSubmissions(f.id)"
                      class="text-primary hover:underline"
                      >{{ submissionCounts[f.id] }}
                      {{ pluralSubmissions(submissionCounts[f.id]) }}</a
                    >
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
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
      </div>
    </main>

    <FormEditorModal
      :visible="showEditor"
      :editingForm="editingFormData"
      @close="showEditor = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { apiPaymentProvidersRoute } from '../../api/forms'
import { apiFormsSearchRoute, apiFormDeleteRoute } from '../../api/forms-admin-routes'
import { apiFormSubmissionsCountRoute } from '../../api/forms-submissions-routes'
import FormEditorModal from '../../components/admin/FormEditorModal.vue'
import PaymentProvidersSelector from '../../components/admin/PaymentProvidersSelector.vue'

const props = defineProps({
  adminListUrl: String
})

const forms = ref([])
const loading = ref(true)
const listError = ref('')
const formActionLoading = ref('')
const showEditor = ref(false)
const editingFormData = ref(null)
const submissionCounts = ref({})
const searchQuery = ref('')

// Глобальные настройки провайдеров
const loadingDefaultProviders = ref(true)
const allProviders = ref([])
const defaultProviders = ref([])
const defaultProvidersEditing = ref(false)
const defaultProvidersExpanded = ref(false)

let searchDebounceTimer = null

watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadForms()
  }, 600)
})

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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

function pluralSubmissions(n) {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'ответов'
  if (last > 1 && last < 5) return 'ответа'
  if (last === 1) return 'ответ'
  return 'ответов'
}

async function loadSubmissionCounts() {
  try {
    submissionCounts.value = await apiFormSubmissionsCountRoute.run(ctx)
  } catch (e) {}
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

function goToSubmissions(formId) {
  const detail = { section: 'submissions' }
  window.dispatchEvent(new CustomEvent('admin-navigate', { detail }))
  if (formId) {
    setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('formId', formId)
      window.history.replaceState({}, '', url.toString())
      window.dispatchEvent(new CustomEvent('admin-submissions-filter', { detail: { formId } }))
    }, 100)
  }
}

async function loadForms() {
  loading.value = true
  listError.value = ''
  try {
    forms.value = await apiFormsSearchRoute.query({ q: searchQuery.value.trim() }).run(ctx)
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

async function loadDefaultProviders() {
  loadingDefaultProviders.value = true
  try {
    const result = await apiPaymentProvidersRoute.run(ctx)
    const configured = (result.configured || []).map((p) => ({ ...p, _configured: true }))
    const notConfigured = (result.notConfigured || []).map((p) => ({ ...p, _configured: false }))
    allProviders.value = [...configured, ...notConfigured]
    const saved = localStorage.getItem('webinar-default-payment-providers')
    if (saved) {
      defaultProviders.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load providers:', e)
  }
  loadingDefaultProviders.value = false
}

function toggleDefaultProvider(newValue) {
  defaultProviders.value = newValue
  defaultProvidersEditing.value = true
}

function saveDefaultProviders() {
  localStorage.setItem('webinar-default-payment-providers', JSON.stringify(defaultProviders.value))
  defaultProvidersEditing.value = false
}

function accordionEnter(el) {
  el.style.height = '0'
  el.style.overflow = 'hidden'
}

function accordionAfterEnter(el) {
  el.style.height = 'auto'
  el.style.overflow = ''
}

function accordionLeave(el) {
  el.style.height = el.scrollHeight + 'px'
  el.offsetHeight
  el.style.height = '0'
  el.style.overflow = 'hidden'
}

onMounted(async () => {
  await loadForms()
  await loadSubmissionCounts()
  await loadDefaultProviders()
})
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
.admin-btn-subtle {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  border: 1px solid var(--wr-btn-subtle-border);
  text-decoration: none;
}
.admin-btn-subtle:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

.accordion-enter-active,
.accordion-leave-active {
  transition: height 0.3s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  height: 0;
}
</style>
