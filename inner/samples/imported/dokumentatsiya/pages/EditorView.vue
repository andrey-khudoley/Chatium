<template>
  <div class="flex flex-col">
    <!-- Main Content -->
    <div class="bg-white shadow-sm">
      <div class="max-w-5xl mx-auto">
        <!-- Editor/Content -->
        <div>
          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <div class="flex flex-col items-center">
              <div
                class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"
              ></div>
              <p style="color: rgb(222, 227, 230)">{{ ctx.t('Loading document...') }}</p>
            </div>
          </div>
          <MarkdownEditor
            v-else
            v-model="document.mdxCode"
            :edit-mode="editMode"
            @changed="handleChanged"
          />

          <!-- Next Article Link -->
          <div v-if="nextArticle && !editMode" class="mt-12 mb-8">
            <a
              :href="buildNextArticleUrl()"
              @click.prevent="navigateToNext"
              class="block group bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 transition-all duration-200 hover:from-blue-100 hover:to-blue-200"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-600 mb-1">{{ ctx.t('Next article') }}</p>
                  <h3
                    class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                  >
                    {{ nextArticle.document.title }}
                  </h3>
                </div>
                <div class="ml-4">
                  <i
                    class="fas fa-arrow-right text-2xl text-blue-600 group-hover:translate-x-1 transition-transform"
                  ></i>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Bar (for edit mode) -->
    <div
      v-if="ctx.user?.is('Admin') && !isViewMode"
      class="fixed bottom-6 right-6 flex items-center space-x-3 bg-white rounded-lg shadow-lg p-2"
    >
      <button
        @click="saveDocument"
        :disabled="saving || !hasUnsavedChanges"
        :class="[
          'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          hasUnsavedChanges && !saving
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        ]"
      >
        <i class="fas fa-save mr-1"></i>{{ saving ? ctx.t('Saving...') : ctx.t('Save') }}
      </button>

      <button
        @click="exportMDX"
        class="px-3 py-1.5 font-medium text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
      >
        <i class="fas fa-download mr-1"></i>{{ ctx.t('Export') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import {
  apiDocumentByIdRoute,
  apiDocumentUpdateRoute,
  apiDocumentNextRoute
} from '../api/documents'
import { MarkdownEditor } from '@vue/ui'

const props = defineProps({
  documentId: String,
  isViewMode: Boolean
})

const emit = defineEmits(['reload-tree', 'unsaved-state-changed', 'navigate'])

const document = ref({
  id: props.documentId,
  title: 'Loading...',
  mdxCode: ''
})

const saving = ref(false)
const hasUnsavedChanges = ref(false)
const isLoading = ref(true)
const nextArticle = ref(null)

// Computed editMode from prop
const editMode = computed(() => !props.isViewMode)

let localStorageKey = ''

onMounted(async () => {
  localStorageKey = `editor_${props.documentId}`
  await loadDocument()
  window.addEventListener('keydown', handleKeyboardSave)
  console.log('EditorView mounted, checking localStorage for:', localStorageKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardSave)
})

watch(
  () => props.documentId,
  () => {
    // Save current document changes to localStorage before switching
    if (hasUnsavedChanges.value && document.value.mdxCode) {
      try {
        localStorage.setItem(
          localStorageKey,
          JSON.stringify({
            mdxCode: document.value.mdxCode
          })
        )
        console.log('saved to localStorage before switching:', localStorageKey)
      } catch (e) {
        console.error('Failed to save to localStorage before switching:', e)
      }
    }

    // Reset hasUnsavedChanges but don't reload until @update is called
    hasUnsavedChanges.value = false
    localStorageKey = `editor_${props.documentId}`
  }
)

// Note: mdxCode changes are handled by @changed event from MarkdownEditor

// Watch for unsaved changes and emit to parent
watch(
  () => hasUnsavedChanges.value,
  (newVal) => {
    emit('unsaved-state-changed', { documentId: props.documentId, hasUnsavedChanges: newVal })
  }
)

async function loadDocument() {
  isLoading.value = true
  try {
    const response = await apiDocumentByIdRoute({ id: props.documentId }).run(ctx)
    if (response?.document) {
      document.value = response.document

      // Load from localStorage if available
      const savedDraft = localStorage.getItem(localStorageKey)
      console.log('checking localStorage key:', localStorageKey)
      console.log('savedDraft found:', savedDraft ? 'yes' : 'no')

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          console.log('loaded draft from localStorage:', draft)
          document.value.mdxCode = draft.mdxCode
          hasUnsavedChanges.value = true
        } catch (e) {
          console.error('Failed to parse draft from localStorage', e)
        }
      } else {
        hasUnsavedChanges.value = false
      }
    }

    // Load next article
    await loadNextArticle()
  } catch (error) {
    console.error('Failed to load document:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadNextArticle() {
  try {
    const response = await apiDocumentNextRoute({ id: props.documentId }).run(ctx)
    nextArticle.value = response
  } catch (error) {
    console.error('Failed to load next article:', error)
    nextArticle.value = null
  }
}

function buildNextArticleUrl() {
  if (!nextArticle.value) return '#'

  if (nextArticle.value.slugPath) {
    return `/${nextArticle.value.slugPath}`
  }

  return `/${nextArticle.value.document.id}`
}

function navigateToNext() {
  if (!nextArticle.value) return

  emit('navigate', nextArticle.value.document.id)
}

function handleKeyboardSave(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (!props.isViewMode && hasUnsavedChanges.value) {
      saveDocument()
    }
  }
}

function handleChanged() {
  // Mark as having unsaved changes and save to localStorage
  hasUnsavedChanges.value = true
  saveToLocalStorage()
}

function saveToLocalStorage() {
  if (props.isViewMode) return

  console.log('saveToLocalStorage called, localStorage key:', localStorageKey)
  console.log('mdxCode to save:', document.value.mdxCode)

  // Save to localStorage only (no autosave to server)
  try {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        mdxCode: document.value.mdxCode
      })
    )
    console.log('saved to localStorage successfully')
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

async function saveDocument() {
  if (saving.value || props.isViewMode) return

  saving.value = true

  console.log('Saving document:', {
    id: document.value.id,
    title: document.value.title,
    mdxCodeLength: document.value.mdxCode?.length || 0,
    mdxCode: document.value.mdxCode
  })

  try {
    const result = await apiDocumentUpdateRoute({ id: document.value.id }).run(ctx, {
      title: document.value.title,
      mdxCode: document.value.mdxCode
    })
    console.log('Save result:', result)
    hasUnsavedChanges.value = false
    // Clear localStorage after successful save
    localStorage.removeItem(localStorageKey)
  } catch (error) {
    console.error('Failed to save document:', error)
  } finally {
    saving.value = false
  }
}

async function exportMDX() {
  try {
    const blob = new Blob([document.value.mdxCode], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = `${document.value.title || 'document'}.mdx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export MDX:', error)
  }
}
</script>
