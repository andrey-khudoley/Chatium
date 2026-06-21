<template>
  <div
    class="app-layout min-h-screen bg-transparent text-[var(--color-text)] flex flex-col"
    @animationend="onAppLayoutAnimationEnd"
  >
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :uiUrl="props.uiUrl"
      :testsUrl="props.testsUrl"
    />
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Секция загрузки файлов -->
        <section class="ui-section">
          <h2 class="ui-section-title">
            <i class="fas fa-upload text-[var(--color-accent)] mr-2"></i>
            Загрузка файла
          </h2>
          <div
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
            ]"
          >
            <i class="fas fa-cloud-upload-alt text-4xl text-[var(--color-text-tertiary)] mb-3"></i>
            <p class="text-[var(--color-text-secondary)] mb-2">
              Перетащите сюда файл .js или .css
            </p>
            <p class="text-sm text-[var(--color-text-tertiary)] mb-4">или</p>
            <label class="inline-block px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-accent-hover)] transition-colors">
              <i class="fas fa-folder-open mr-2"></i>
              Выбрать файл
              <input
                type="file"
                accept=".js,.css"
                @change="handleFileSelect"
                class="hidden"
              />
            </label>
          </div>
          <div v-if="uploading" class="mt-4 flex items-center justify-center gap-2">
            <i class="fas fa-spinner fa-spin text-[var(--color-accent)] text-2xl"></i>
            <span class="text-[var(--color-text-secondary)]">Загрузка файла...</span>
          </div>
        </section>

        <!-- Список скриптов -->
        <section class="ui-section">
          <div class="flex items-center justify-between mb-4">
            <h2 class="ui-section-title">
              <i class="fas fa-list text-[var(--color-accent)] mr-2"></i>
              Скрипты ({{ scripts.length }})
            </h2>
            <button
              @click="loadScripts"
              :disabled="loading"
              class="px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] text-sm rounded border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors disabled:opacity-60"
            >
              <i v-if="loading" class="fas fa-sync fa-spin"></i>
              <i v-else class="fas fa-sync"></i>
              Загрузить
            </button>
          </div>
          <div v-if="loading" class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-[var(--color-accent)]"></i>
            <p class="mt-2 text-[var(--color-text-secondary)]">Загрузка...</p>
          </div>
          <div v-else-if="scripts.length === 0" class="text-center py-8">
            <i class="fas fa-inbox text-4xl text-[var(--color-text-tertiary)] mb-2"></i>
            <p class="text-[var(--color-text-secondary)]">Нет скриптов</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="script in scripts"
              :key="script.id"
              class="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-light)] transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <i v-if="script.type === 'script'" class="fas fa-file-code text-[var(--color-accent)]"></i>
                    <i v-else class="fas fa-file-css text-[var(--color-accent)]"></i>
                    <h3 class="font-semibold text-lg text-[var(--color-text)]">{{ script.name }}</h3>
                    <span v-if="script.type === 'script'" class="px-2 py-1 text-xs rounded bg-[var(--color-accent-light)] text-[var(--color-accent)]">JS</span>
                    <span v-else class="px-2 py-1 text-xs rounded bg-[var(--color-accent-medium)] text-[var(--color-accent)]">CSS</span>
                  </div>
                  <p v-if="script.description" class="text-sm text-[var(--color-text-secondary)] mb-2">{{ script.description }}</p>
                </div>
                <div class="flex items-center gap-2 ml-4">
                  <button
                    @click="viewScript(script)"
                    class="px-3 py-1 bg-[var(--color-accent)] text-white text-sm rounded hover:bg-[var(--color-accent-hover)] transition-colors"
                    title="Просмотр"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button
                    @click="editScript(script)"
                    class="px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] text-sm rounded hover:border-[var(--color-border-light)] transition-colors"
                    title="Редактировать"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="copyEmbedLink(script)"
                    class="px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] text-sm rounded hover:border-[var(--color-border-light)] transition-colors"
                    title="Копировать ссылку"
                  >
                    <i class="fas fa-link"></i>
                  </button>
                  <button
                    @click="deleteScript(script)"
                    class="px-3 py-1 border border-[var(--color-border)] text-[var(--color-accent)] text-sm rounded hover:bg-[var(--color-accent-light)] transition-colors"
                    title="Удалить"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />

    <!-- Модальное окно просмотра -->
    <div
      v-if="viewModal && selectedScript"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="closeViewModal"
    >
      <div class="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 class="text-xl font-bold text-[var(--color-text)]">
            <i v-if="selectedScript.type === 'script'" class="fas fa-file-code text-[var(--color-accent)] mr-2"></i>
            <i v-else class="fas fa-file-css text-[var(--color-accent)] mr-2"></i>
            {{ selectedScript.name }}
          </h3>
          <button @click="closeViewModal" class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <p v-if="selectedScript.description" class="text-sm text-[var(--color-text-secondary)] mb-2">{{ selectedScript.description }}</p>
          <div class="bg-[var(--color-bg-tertiary)] text-[var(--color-text)] p-4 rounded-lg overflow-x-auto border border-[var(--color-border)]">
            <pre class="text-sm font-mono">{{ selectedScript.content }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно редактирования -->
    <div
      v-if="editModal"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="closeEditModal"
    >
      <div class="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 class="text-xl font-bold text-[var(--color-text)]">
            <i class="fas fa-edit text-[var(--color-accent)] mr-2"></i>
            Редактировать: {{ editForm.name }}
          </h3>
          <button @click="closeEditModal" class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Описание</label>
            <input
              v-model="editForm.description"
              type="text"
              class="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="Описание скрипта"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Содержимое</label>
            <textarea
              v-model="editForm.content"
              rows="15"
              class="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg font-mono text-sm text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
              placeholder="Код скрипта или стиля"
            ></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 p-4 border-t border-[var(--color-border)]">
          <button
            @click="closeEditModal"
            class="px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-border-light)]"
          >
            Отмена
          </button>
          <button
            @click="saveEdit"
            :disabled="saving"
            class="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            <i v-if="saving" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-save mr-2"></i>
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Уведомления -->
    <div
      v-if="copyNotification"
      class="fixed top-4 right-4 bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in border border-[var(--color-border-light)]"
    >
      <i class="fas fa-check-circle mr-2"></i>
      {{ uploading ? 'Файл успешно загружен!' : 'Ссылка скопирована в буфер обмена!' }}
    </div>
  </div>
</template>

<script setup lang="ts">
declare const ctx: app.Ctx
import { ref, onMounted, onUnmounted } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { listScriptsRoute } from '../api/scripts/list'
import { updateScriptRoute } from '../api/scripts/update'
import { deleteScriptRoute } from '../api/scripts/delete'
import { uploadScriptRoute } from '../api/scripts/upload'

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  uiUrl: string
  testsUrl: string
  serveBaseUrl: string
}>()

type ScriptRow = { id: string; name: string; description?: string; type: string; content?: string }
const scripts = ref<ScriptRow[]>([])
const loading = ref(false)
const viewModal = ref(false)
const editModal = ref(false)
const selectedScript = ref<ScriptRow | null>(null)
const saving = ref(false)
const copyNotification = ref(false)
const isDragging = ref(false)
const uploading = ref(false)
const bootLoaderDone = ref(false)

const editForm = ref({
  id: '',
  name: '',
  description: '',
  content: ''
})

function onAppLayoutAnimationEnd(e: AnimationEvent) {
  if (e.animationName === 'crt-power-on') {
    (e.target as HTMLElement).classList.add('app-layout-appeared')
  }
}

function startAnimations() {
  bootLoaderDone.value = true
}

function triggerGlitch() {
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')
    setTimeout(() => appLayout.classList.remove('global-glitch-active'), 500)
  }
}

function openChatiumLink() {
  triggerGlitch()
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

async function loadScripts() {
  loading.value = true
  try {
    const result = await listScriptsRoute.run(ctx)
    if (result.success) {
      scripts.value = result.scripts || []
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

function viewScript(script: ScriptRow) {
  selectedScript.value = script
  viewModal.value = true
}

function closeViewModal() {
  viewModal.value = false
  selectedScript.value = null
}

function editScript(script: ScriptRow) {
  editForm.value = {
    id: script.id,
    name: script.name,
    description: script.description || '',
    content: script.content || ''
  }
  editModal.value = true
}

function closeEditModal() {
  editModal.value = false
  editForm.value = { id: '', name: '', description: '', content: '' }
}

async function saveEdit() {
  if (!editForm.value.id) return
  saving.value = true
  try {
    const result = await updateScriptRoute.run(ctx, {
      id: editForm.value.id,
      description: editForm.value.description,
      content: editForm.value.content
    })
    if (result.success) {
      await loadScripts()
      closeEditModal()
    } else {
      alert('Ошибка при сохранении: ' + (result.error || 'Неизвестная ошибка'))
    }
  } catch (error) {
    console.error(error)
    alert('Ошибка при сохранении')
  } finally {
    saving.value = false
  }
}

async function deleteScript(script: ScriptRow) {
  if (!confirm('Удалить скрипт "' + script.name + '"?')) return
  try {
    const result = await deleteScriptRoute.run(ctx, { id: script.id })
    if (result.success) {
      await loadScripts()
    } else {
      alert('Ошибка при удалении: ' + (result.error || 'Неизвестная ошибка'))
    }
  } catch (error) {
    console.error(error)
    alert('Ошибка при удалении')
  }
}

function copyEmbedLink(script: ScriptRow) {
  const ext = script.type === 'script' ? 'js' : 'css'
  const url = props.serveBaseUrl + '?file=' + encodeURIComponent(script.name + '.' + ext)
  const embedCode =
    script.type === 'script'
      ? '<' + 'script src="' + url + '"><' + '/script>'
      : '<link rel="stylesheet" href="' + url + '" />'
  navigator.clipboard
    .writeText(embedCode)
    .then(() => {
      copyNotification.value = true
      setTimeout(() => (copyNotification.value = false), 3000)
    })
    .catch(() => {
      const textArea = document.createElement('textarea')
      textArea.value = embedCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      copyNotification.value = true
      setTimeout(() => (copyNotification.value = false), 3000)
    })
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length && files[0]) await uploadFile(files[0])
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input?.files
  if (files?.length && files[0]) await uploadFile(files[0])
  if (input) input.value = ''
}

async function uploadFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension !== 'js' && extension !== 'css') {
    alert('Поддерживаются только файлы .js и .css')
    return
  }
  uploading.value = true
  try {
    const content = await readFileContent(file)
    const result = await uploadScriptRoute.run(ctx, { filename: file.name, content })
    if (result.success) {
      copyNotification.value = true
      setTimeout(() => (copyNotification.value = false), 3000)
      await loadScripts()
    } else {
      alert('Ошибка загрузки: ' + (result.error || 'Неизвестная ошибка'))
    }
  } catch (error) {
    console.error(error)
    alert('Ошибка при чтении файла')
  } finally {
    uploading.value = false
  }
}

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => resolve((e.target?.result as string) ?? '')
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsText(file)
  })
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.hideAppLoader) window.hideAppLoader()
  if (typeof window !== 'undefined' && window.bootLoaderComplete) {
    startAnimations()
  } else if (typeof window !== 'undefined') {
    window.addEventListener('bootloader-complete', startAnimations)
  }
  loadScripts()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('bootloader-complete', startAnimations)
  }
})
</script>

<style scoped>
.ui-section {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.ui-section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  padding: 2rem 0;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>
