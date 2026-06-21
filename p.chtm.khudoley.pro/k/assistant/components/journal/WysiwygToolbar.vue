<script setup lang="ts">
import { ref } from 'vue'

type ActiveStates = Record<string, boolean>

const props = defineProps<{
  activeStates: ActiveStates
  currentBlock: string
  isInTable: boolean
}>()

const emit = defineEmits<{
  (e: 'exec', cmd: string, value?: string): void
  (e: 'insertMedia', type: 'image' | 'video' | 'pdf' | 'file', url: string, filename?: string): void
}>()

const showBlockMenu = ref(false)
const showColorPicker = ref(false)
const showLinkDialog = ref(false)
const showTablePicker = ref(false)
const showTableMenu = ref(false)
const fileUploading = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const linkHref = ref('')
const linkTarget = ref('_blank')
const textColor = ref('#e8e8e8')
const tpHoverR = ref(0)
const tpHoverC = ref(0)

type BtnDef = { cmd: string; icon: string; title: string; active?: string }

const FMT_BTNS: BtnDef[] = [
  { cmd: 'bold', icon: 'fa-bold', title: 'Жирный (Ctrl+B)', active: 'bold' },
  { cmd: 'italic', icon: 'fa-italic', title: 'Курсив (Ctrl+I)', active: 'italic' },
  { cmd: 'underline', icon: 'fa-underline', title: 'Подчёркнутый (Ctrl+U)', active: 'underline' },
  { cmd: 'strikeThrough', icon: 'fa-strikethrough', title: 'Зачёркнутый', active: 'strikeThrough' },
]

const ALIGN_BTNS: BtnDef[] = [
  { cmd: 'justifyLeft', icon: 'fa-align-left', title: 'По левому краю', active: 'justifyLeft' },
  { cmd: 'justifyCenter', icon: 'fa-align-center', title: 'По центру', active: 'justifyCenter' },
  { cmd: 'justifyRight', icon: 'fa-align-right', title: 'По правому краю', active: 'justifyRight' },
  { cmd: 'justifyFull', icon: 'fa-align-justify', title: 'По ширине', active: 'justifyFull' },
]

const BLOCK_TYPES = [
  { tag: 'h1', label: 'Заголовок 1' },
  { tag: 'h2', label: 'Заголовок 2' },
  { tag: 'h3', label: 'Заголовок 3' },
  { tag: 'p', label: 'Абзац' },
  { tag: 'div', label: 'Обычный текст' },
]

const PRESET_COLORS = [
  '#e8e8e8', '#a0a0a0', '#707070', '#ffffff',
  '#d3234b', '#e6395f', '#ff6b6b', '#ffa07a',
  '#ffd700', '#90ee90', '#00bfff', '#9370db',
  '#40e0d0', '#ff69b4', '#ff8c00', '#4169e1',
]

function closeAll() {
  showBlockMenu.value = false
  showColorPicker.value = false
  showLinkDialog.value = false
  showTablePicker.value = false
  showTableMenu.value = false
}

function exec(cmd: string, value?: string) {
  closeAll()
  emit('exec', cmd, value)
}

function setBlock(tag: string) {
  exec('formatBlock', tag)
}

function applyColor(c: string) {
  textColor.value = c
  exec('foreColor', c)
}

function openLinkDialog(href?: string, target?: string) {
  linkHref.value = href || ''
  linkTarget.value = target || '_blank'
  closeAll()
  showLinkDialog.value = true
}

function confirmLink() {
  if (!linkHref.value.trim()) return
  exec('createLink', JSON.stringify({ href: linkHref.value.trim(), target: linkTarget.value }))
  linkHref.value = ''
  linkTarget.value = '_blank'
}

function selectTableCell(r: number, c: number) {
  exec('insertTable', JSON.stringify({ rows: r, cols: c }))
}

function blockLabel(): string {
  const b = props.currentBlock.toLowerCase().replace(/[<>]/g, '')
  return BLOCK_TYPES.find(t => t.tag === b)?.label ?? 'Абзац'
}

function toggleDropdown(which: 'block' | 'color' | 'link' | 'table' | 'tableMenu') {
  const wasOpen = {
    block: showBlockMenu.value,
    color: showColorPicker.value,
    link: showLinkDialog.value,
    table: showTablePicker.value,
    tableMenu: showTableMenu.value,
  }[which]
  closeAll()
  if (!wasOpen) {
    if (which === 'block') showBlockMenu.value = true
    if (which === 'color') showColorPicker.value = true
    if (which === 'link') showLinkDialog.value = true
    if (which === 'table') showTablePicker.value = true
    if (which === 'tableMenu') showTableMenu.value = true
  }
}

defineExpose({ openLinkDialog, closeAll })

const MAX_FILE_SIZE_MB = 50
const ALLOWED_TYPES = [
  'image/*',
  'video/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    alert(`Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE_MB} МБ`)
    input.value = ''
    return
  }

  fileUploading.value = true

  const objectUrl = URL.createObjectURL(file)
  const fileType = getFileType(file)

  setTimeout(() => {
    emit('insertMedia', fileType, objectUrl, file.name)
    fileUploading.value = false
    input.value = ''
  }, 300)
}

function getFileType(file: File): 'image' | 'video' | 'pdf' | 'file' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf') return 'pdf'
  return 'file'
}
</script>

<template>
  <div class="wy-toolbar" @mousedown.prevent>
    <div class="wy-toolbar-row">
      <div class="wy-btn-group">
        <button
          v-for="btn in FMT_BTNS"
          :key="btn.cmd"
          type="button"
          class="wy-btn"
          :class="{ 'wy-btn--active': props.activeStates[btn.active || btn.cmd] }"
          :title="btn.title"
          @click="exec(btn.cmd)"
        >
          <i class="fa-solid" :class="btn.icon" aria-hidden="true" />
        </button>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group wy-relative">
        <button
          type="button"
          class="wy-btn"
          title="Цвет текста"
          @click="toggleDropdown('color')"
        >
          <i class="fa-solid fa-palette" aria-hidden="true" />
          <span class="wy-color-dot" :style="{ background: textColor }" />
        </button>
        <div v-if="showColorPicker" class="wy-dropdown wy-color-drop">
          <div class="wy-color-grid">
            <button
              v-for="c in PRESET_COLORS"
              :key="c"
              type="button"
              class="wy-color-swatch"
              :style="{ background: c }"
              :title="c"
              @click="applyColor(c)"
            />
          </div>
          <div class="wy-color-custom">
            <input type="color" v-model="textColor" class="wy-color-input" @change="applyColor(textColor)" />
            <span class="wy-color-hex">{{ textColor }}</span>
          </div>
        </div>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group wy-relative">
        <button type="button" class="wy-btn wy-btn--wide" title="Тип блока" @click="toggleDropdown('block')">
          <span>{{ blockLabel() }}</span>
          <i class="fa-solid fa-chevron-down wy-chevron" aria-hidden="true" />
        </button>
        <div v-if="showBlockMenu" class="wy-dropdown">
          <button
            v-for="bt in BLOCK_TYPES"
            :key="bt.tag"
            type="button"
            class="wy-drop-item"
            :class="{ 'wy-drop-item--active': currentBlock.toLowerCase().replace(/[<>]/g, '') === bt.tag }"
            @click="setBlock(bt.tag)"
          >
            {{ bt.label }}
          </button>
        </div>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button
          type="button"
          class="wy-btn"
          :class="{ 'wy-btn--active': props.activeStates.insertUnorderedList }"
          title="Маркированный список"
          @click="exec('insertUnorderedList')"
        >
          <i class="fa-solid fa-list-ul" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="wy-btn"
          :class="{ 'wy-btn--active': props.activeStates.insertOrderedList }"
          title="Нумерованный список"
          @click="exec('insertOrderedList')"
        >
          <i class="fa-solid fa-list-ol" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Увеличить отступ" @click="exec('indent')">
          <i class="fa-solid fa-indent" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Уменьшить отступ" @click="exec('outdent')">
          <i class="fa-solid fa-outdent" aria-hidden="true" />
        </button>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button
          v-for="btn in ALIGN_BTNS"
          :key="btn.cmd"
          type="button"
          class="wy-btn"
          :class="{ 'wy-btn--active': props.activeStates[btn.active || btn.cmd] }"
          :title="btn.title"
          @click="exec(btn.cmd)"
        >
          <i class="fa-solid" :class="btn.icon" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="wy-toolbar-row">
      <div class="wy-btn-group wy-relative">
        <button type="button" class="wy-btn" title="Ссылка" @click="toggleDropdown('link')">
          <i class="fa-solid fa-link" aria-hidden="true" />
        </button>
        <div v-if="showLinkDialog" class="wy-dropdown wy-link-drop">
          <label class="wy-link-label">URL</label>
          <input
            v-model="linkHref"
            type="text"
            class="wy-link-input"
            placeholder="https://..."
            @keydown.enter.prevent="confirmLink"
          />
          <label class="wy-link-label">Открывать</label>
          <select v-model="linkTarget" class="wy-link-input">
            <option value="_blank">В новом окне</option>
            <option value="_self">В текущем окне</option>
          </select>
          <div class="wy-link-actions">
            <button type="button" class="wy-link-ok" @click="confirmLink">Вставить</button>
            <button type="button" class="wy-link-cancel" @click="exec('unlink')">Убрать ссылку</button>
          </div>
        </div>
      </div>

      <div class="wy-btn-group wy-relative">
        <button type="button" class="wy-btn" title="Таблица" @click="toggleDropdown('table')">
          <i class="fa-solid fa-table" aria-hidden="true" />
        </button>
        <div v-if="showTablePicker" class="wy-dropdown wy-table-drop">
          <div class="wy-table-grid">
            <div
              v-for="r in 6"
              :key="'r' + r"
              class="wy-table-row"
            >
              <button
                v-for="c in 6"
                :key="'c' + c"
                type="button"
                class="wy-table-cell"
                :class="{ 'wy-table-cell--hl': r <= tpHoverR && c <= tpHoverC }"
                @mouseenter="tpHoverR = r; tpHoverC = c"
                @click="selectTableCell(r, c)"
              />
            </div>
          </div>
          <span class="wy-table-size">{{ tpHoverR || '—' }} × {{ tpHoverC || '—' }}</span>
        </div>
      </div>

      <template v-if="props.isInTable">
        <div class="wy-btn-group wy-relative">
          <button type="button" class="wy-btn" title="Операции с таблицей" @click="toggleDropdown('tableMenu')">
            <i class="fa-solid fa-table-cells" aria-hidden="true" />
            <i class="fa-solid fa-chevron-down wy-chevron" aria-hidden="true" />
          </button>
          <div v-if="showTableMenu" class="wy-dropdown">
            <button type="button" class="wy-drop-item" @click="exec('addRowAbove')">Строка выше</button>
            <button type="button" class="wy-drop-item" @click="exec('addRowBelow')">Строка ниже</button>
            <button type="button" class="wy-drop-item" @click="exec('addColLeft')">Столбец слева</button>
            <button type="button" class="wy-drop-item" @click="exec('addColRight')">Столбец справа</button>
            <div class="wy-sep-h" />
            <button type="button" class="wy-drop-item wy-drop-item--danger" @click="exec('deleteRow')">Удалить строку</button>
            <button type="button" class="wy-drop-item wy-drop-item--danger" @click="exec('deleteCol')">Удалить столбец</button>
          </div>
        </div>
      </template>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button type="button" class="wy-btn" title="Горизонтальная линия" @click="exec('insertHorizontalRule')">
          <i class="fa-solid fa-minus" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Inline code" @click="exec('insertInlineCode')">
          <i class="fa-solid fa-code" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Блок кода" @click="exec('insertCodeBlock')">
          <i class="fa-solid fa-file-code" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Цитата" @click="exec('insertBlockquote')">
          <i class="fa-solid fa-quote-right" aria-hidden="true" />
        </button>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button type="button" class="wy-btn" title="Отменить (Ctrl+Z)" @click="exec('undo')">
          <i class="fa-solid fa-rotate-left" aria-hidden="true" />
        </button>
        <button type="button" class="wy-btn" title="Повторить (Ctrl+Y)" @click="exec('redo')">
          <i class="fa-solid fa-rotate-right" aria-hidden="true" />
        </button>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button type="button" class="wy-btn" title="Очистить форматирование" @click="exec('removeFormat')">
          <i class="fa-solid fa-eraser" aria-hidden="true" />
        </button>
      </div>

      <div class="wy-sep" />

      <div class="wy-btn-group">
        <button
          type="button"
          class="wy-btn wy-btn--file"
          :class="{ 'wy-btn--uploading': fileUploading }"
          title="Добавить файл"
          @click="openFilePicker"
          :disabled="fileUploading"
        >
          <i class="fa-solid fa-paperclip" aria-hidden="true" />
          <span v-if="fileUploading" class="wy-upload-spinner" />
        </button>
        <input
          ref="fileInputRef"
          type="file"
          class="wy-file-input"
          :accept="ALLOWED_TYPES.join(',')"
          @change="handleFileUpload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.wy-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
}
.wy-toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
}
.wy-btn-group {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}
.wy-relative { position: relative; }
.wy-sep {
  width: 1px;
  height: 1.1rem;
  background: var(--color-border-light);
  margin: 0 0.2rem;
  flex-shrink: 0;
}
.wy-sep-h {
  height: 1px;
  background: var(--color-border);
  margin: 0.15rem 0;
}
.wy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.3rem;
  font-family: inherit;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.wy-btn:hover {
  color: var(--color-text);
  background: var(--color-bg-tertiary);
  border-color: var(--color-border);
}
.wy-btn--active {
  color: var(--color-accent);
  background: var(--color-accent-light);
  border-color: var(--color-accent);
}
.wy-btn--wide {
  min-width: 5.5rem;
  justify-content: space-between;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.wy-chevron { font-size: 0.55rem; margin-left: 0.15rem; }
.wy-color-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid var(--color-border-light);
  margin-left: 0.1rem;
}

.wy-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  margin-top: 0.15rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  min-width: 8rem;
}
.wy-drop-item {
  display: block;
  width: 100%;
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
}
.wy-drop-item:hover { background: var(--color-bg-tertiary); color: var(--color-text); }
.wy-drop-item--active { color: var(--color-accent); }
.wy-drop-item--danger { color: var(--color-accent-hover); }

.wy-color-drop { min-width: 10rem; padding: 0.4rem; }
.wy-color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  margin-bottom: 0.3rem;
}
.wy-color-swatch {
  width: 1.3rem;
  height: 1.3rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  padding: 0;
}
.wy-color-swatch:hover { border-color: var(--color-text); transform: scale(1.15); }
.wy-color-custom {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.wy-color-input {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg);
  cursor: pointer;
}
.wy-color-hex { font-size: 0.72rem; color: var(--color-text-tertiary); }

.wy-link-drop { min-width: 14rem; padding: 0.4rem; }
.wy-link-label {
  display: block;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  margin-bottom: 0.15rem;
}
.wy-link-label + .wy-link-label { margin-top: 0.3rem; }
.wy-link-input {
  width: 100%;
  padding: 0.25rem 0.3rem;
  font-family: inherit;
  font-size: 0.76rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-sizing: border-box;
}
.wy-link-input:focus { border-color: var(--color-accent); outline: none; }
.wy-link-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.35rem;
}
.wy-link-ok,
.wy-link-cancel {
  padding: 0.2rem 0.4rem;
  font-family: inherit;
  font-size: 0.72rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
.wy-link-ok { background: var(--color-accent-light); border-color: var(--color-accent); color: var(--color-text); }
.wy-link-ok:hover { background: var(--color-accent-medium); }
.wy-link-cancel:hover { color: var(--color-accent-hover); }

.wy-table-drop { min-width: auto; padding: 0.4rem; }
.wy-table-grid { display: flex; flex-direction: column; gap: 2px; }
.wy-table-row { display: flex; gap: 2px; }
.wy-table-cell {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.wy-table-cell:hover,
.wy-table-cell--hl {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
}
.wy-table-size {
  display: block;
  text-align: center;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  margin-top: 0.2rem;
}

.wy-file-input {
  display: none;
}
.wy-btn--file {
  position: relative;
}
.wy-btn--uploading {
  opacity: 0.7;
  pointer-events: none;
}
.wy-upload-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: wy-spin 0.8s linear infinite;
}
@keyframes wy-spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>