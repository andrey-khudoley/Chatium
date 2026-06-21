<template>
  <div class="message-input">
    <div class="message-input__surface" :class="{ 'message-input__surface--disabled': isSending }">
      <button
        type="button"
        class="message-input__action message-input__action--attach"
        @click="triggerFileInput"
        :disabled="isSending"
        aria-label="Прикрепить файл"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16px"
          height="16px"
          fill="currentColor"
        >
          <path
            d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z"
          />
        </svg>
      </button>

      <input
        ref="fileInput"
        type="file"
        class="message-input__file-input"
        multiple
        @change="handleFileSelect"
        :disabled="isSending"
      />

      <div class="message-input__body">
        <div v-if="selectedFiles.length > 0" class="message-input__attachments">
          <div
            v-for="(fileItem, index) in selectedFiles"
            :key="fileItem.file?.name + index"
            :title="fileItem.status === 'error' ? fileItem.error : fileItem.file?.name"
            :class="['message-input__attachment', `message-input__attachment--${fileItem.status}`]"
          >
            <div
              class="message-input__attachment-progress"
              :style="{
                width: `${fileItem.status === 'done' ? 100 : fileItem.progress}%`,
                opacity: ['uploading', 'done'].includes(fileItem.status) ? 1 : 0
              }"
            ></div>
            <div class="message-input__attachment-content">
              <div class="message-input__attachment-icon">
                <i class="fas fa-file"></i>
              </div>
              <div class="message-input__attachment-text">
                <span class="message-input__attachment-name">
                  {{ fileItem.file.name }}
                </span>
                <div class="message-input__attachment-meta">
                  <span class="message-input__attachment-status">
                    <template v-if="fileItem.status === 'uploading'">
                      {{ fileItem.progress }}%
                    </template>
                    <template v-else-if="fileItem.status === 'done'">
                      <i class="fas fa-check"></i>
                      готово
                    </template>
                    <template v-else-if="fileItem.status === 'error'">
                      <i class="fas fa-exclamation-triangle"></i>
                      ошибка
                    </template>
                    <template v-else>в очереди</template>
                  </span>
                  <span class="message-input__attachment-size">
                    {{ formatFileSize(fileItem.file.size) }}
                  </span>
                </div>
              </div>
              <button
                v-if="fileItem.status === 'error'"
                type="button"
                class="message-input__attachment-retry"
                @click="retryUpload(fileItem)"
                :disabled="isSending"
              >
                <i class="fas fa-rotate-right"></i>
              </button>
              <button
                type="button"
                class="message-input__attachment-remove"
                @click="removeFile(index)"
                :disabled="isSending"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
        <textarea
          ref="textInput"
          v-model="text"
          class="message-input__textarea"
          :placeholder="placeholder"
          @keydown.enter.exact.prevent="handleSubmit"
          :disabled="isSending"
          rows="1"
        ></textarea>
      </div>

      <button
        type="button"
        class="message-input__action message-input__action--send"
        :class="{
          'message-input__action--send-active': !isSubmitDisabled,
          'message-input__action--send-loading': isSending
        }"
        @click="handleSubmit"
        :disabled="isSubmitDisabled"
        aria-label="Отправить сообщение"
      >
        <!-- <i
          :class="[
            isSending ? 'fas fa-circle-notch fa-spin' : 'fas fa-arrow-up',
          ]"
        ></i> -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="currentColor"
        >
          <path d="M14,20H10V11L6.5,14.5L4.08,12.08L12,4.16L19.92,12.08L17.5,14.5L14,11V20Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { apiGetUploadUrlRoute } from '../api/files'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Введите сообщение...'
  },
  isSending: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const text = ref('')
const selectedFiles = ref([])
const textInput = ref(null)
const fileInput = ref(null)
const isUploading = computed(() =>
  selectedFiles.value.some((item) => ['pending', 'uploading'].includes(item.status))
)

const hasUploadError = computed(() => selectedFiles.value.some((item) => item.status === 'error'))

const hasUploadedFiles = computed(() => selectedFiles.value.some((item) => item.status === 'done'))

const isSubmitDisabled = computed(() => {
  const trimmedText = text.value.trim()

  return (
    props.isSending ||
    isUploading.value ||
    hasUploadError.value ||
    (!trimmedText && !hasUploadedFiles.value)
  )
})

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / Math.pow(1024, exponent)

  const formatted = size < 10 && exponent > 0 ? size.toFixed(1) : size.toFixed(0)

  return `${formatted} ${units[exponent]}`
}

const refreshSelectedFiles = () => {
  selectedFiles.value = [...selectedFiles.value]
}

const triggerFileInput = () => {
  if (props.isSending) {
    return
  }
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  addFilesToUpload(files)
  event.target.value = ''
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
  refreshSelectedFiles()
}

const createFileItem = (file) => ({
  file,
  progress: 0,
  status: 'pending',
  hash: null,
  error: null,
  uploaded: null
})

const addFilesToUpload = (files) => {
  if (!files?.length) {
    return
  }

  const fileItems = files.map(createFileItem)
  selectedFiles.value.push(...fileItems)
  refreshSelectedFiles()

  fileItems.forEach((item) => {
    startUpload(item)
  })
}

const startUpload = async (fileItem) => {
  if (!fileItem?.file) {
    return
  }

  fileItem.status = 'uploading'
  fileItem.progress = 0
  refreshSelectedFiles()

  try {
    const uploaded = await uploadFile(fileItem.file, (progress) => {
      fileItem.progress = progress
      refreshSelectedFiles()
    })

    fileItem.status = 'done'
    fileItem.progress = 100
    fileItem.hash = uploaded.hash
    fileItem.uploaded = uploaded
    fileItem.error = null
    refreshSelectedFiles()
  } catch (error) {
    fileItem.status = 'error'
    fileItem.progress = 0
    fileItem.hash = null
    fileItem.uploaded = null
    fileItem.error = error instanceof Error ? error.message : String(error ?? 'Ошибка')
    console.error('Не удалось загрузить файл', fileItem.file?.name ?? '', error)
    refreshSelectedFiles()
  }
}

const retryUpload = (fileItem) => {
  if (!fileItem || fileItem.status === 'uploading') {
    return
  }

  fileItem.status = 'pending'
  fileItem.progress = 0
  fileItem.error = null
  fileItem.hash = null
  fileItem.uploaded = null
  refreshSelectedFiles()

  startUpload(fileItem)
}

const focusInput = () => {
  nextTick(() => {
    if (textInput.value) {
      textInput.value.focus()
      const length = text.value.length
      textInput.value.setSelectionRange?.(length, length)
    }
  })
}

const uploadFile = async (file, onProgress) => {
  try {
    // Get upload URL
    const { uploadUrl } = await apiGetUploadUrlRoute.run(ctx)

    // Upload file
    const formData = new FormData()
    formData.append('Filedata', file)

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          onProgress?.(100)
          resolve({
            hash: xhr.responseText,
            mime: file.type,
            size: file.size,
            name: file.name
          })
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Upload failed')))

      xhr.open('POST', uploadUrl)
      xhr.send(formData)
    })
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    onProgress?.(0)
    throw error
  }
}

const handleSubmit = async () => {
  if (props.isSending || isUploading.value || hasUploadError.value) {
    return
  }

  const trimmedText = text.value.trim()

  if (!trimmedText && !hasUploadedFiles.value) {
    return
  }

  const uploadedFiles = selectedFiles.value
    .filter((item) => item.status === 'done' && item.uploaded)
    .map((item) => item.uploaded)

  emit('submit', {
    text: trimmedText,
    files: uploadedFiles
  })

  text.value = ''
  selectedFiles.value = []
}

watch(text, async () => {
  await nextTick()
  if (textInput.value) {
    textInput.value.style.height = 'auto'
    textInput.value.style.height = textInput.value.scrollHeight + 'px'
  }
})

defineExpose({
  focus: focusInput
})
</script>

<style scoped>
.message-input {
  width: 100%;
  color: #f4f7ff;
}

.message-input__surface {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px;
  background: var(--chat-surface-alt, rgba(18, 40, 88, 0.92));
  border: 1px solid var(--chat-border, rgba(79, 140, 255, 0.25));
  border-radius: 28px;
  box-shadow: 0 16px 32px rgba(5, 12, 32, 0.35);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.message-input__surface:focus-within {
  border-color: var(--chat-accent, #4f8cff);
  box-shadow: 0 0 0 4px rgba(79, 140, 255, 0.18);
}

.message-input__surface--disabled {
  opacity: 0.75;
}

.message-input__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-input__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-input__attachment {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid rgba(117, 150, 220, 0.25);
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(6, 18, 48, 0.85);
  min-width: 0;
  overflow: hidden;
  color: #f4f7ff;
}

.message-input__attachment--uploading {
  border-color: rgba(79, 140, 255, 0.5);
}

.message-input__attachment--done {
  border-color: rgba(46, 217, 126, 0.65);
}

.message-input__attachment--error {
  border-color: rgba(255, 115, 114, 0.65);
}

.message-input__attachment-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(79, 140, 255, 0.35), rgba(85, 196, 255, 0.25));
  transition:
    width 0.3s ease,
    opacity 0.3s ease;
  pointer-events: none;
}

.message-input__attachment-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.message-input__attachment-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(12, 31, 68, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b9c6ff;
  flex-shrink: 0;
}

.message-input__attachment-icon i {
  font-size: 11px;
}

.message-input__attachment-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.message-input__attachment-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #f4f7ff;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-input__attachment-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(190, 208, 255, 0.7);
}

.message-input__attachment-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.message-input__attachment-status i {
  margin-right: 2px;
}

.message-input__attachment--uploading .message-input__attachment-status {
  color: rgba(190, 208, 255, 0.85);
}

.message-input__attachment--done .message-input__attachment-status {
  color: rgba(124, 235, 190, 0.95);
}

.message-input__attachment--error .message-input__attachment-status {
  color: rgba(255, 163, 163, 0.9);
}

.message-input__attachment-size {
  color: rgba(190, 208, 255, 0.55);
}

.message-input__attachment-retry,
.message-input__attachment-remove {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: rgba(190, 208, 255, 0.7);
  cursor: pointer;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.message-input__attachment--error .message-input__attachment-retry {
  color: rgba(255, 196, 120, 0.95);
}

.message-input__attachment--error .message-input__attachment-retry:hover:not(:disabled) {
  color: rgba(255, 210, 150, 1);
}

.message-input__attachment-retry:hover,
.message-input__attachment-remove:hover {
  color: #fff;
  transform: translateY(-1px);
}

.message-input__attachment-retry:disabled,
.message-input__attachment-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.message-input__attachment-retry i,
.message-input__attachment-remove i {
  font-size: 12px;
}

.message-input__textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: #f4f7ff;
  font-size: 15px;
  line-height: 1.6;
  min-height: 24px;
  max-height: 160px;
  padding: 0;
  margin: 0;
}

.message-input__textarea::placeholder {
  color: rgba(190, 208, 255, 0.55);
}

.message-input__textarea:disabled {
  color: rgba(190, 208, 255, 0.5);
}

.message-input__action {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(79, 140, 255, 0.25);
  background: rgba(5, 14, 37, 0.7);
  color: rgba(155, 179, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
}

.message-input__action i {
  font-size: 14px;
}

.message-input__action:hover:not(:disabled) {
  background: #2471ff;
  border-color: #2471ff;
  color: #fff;
  /* transform: translateY(-1px); */
}

.message-input__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.message-input__action--attach {
  margin-right: 4px;
}

.message-input__action--send {
  background: rgba(15, 36, 84, 0.4);
  border-color: rgba(79, 140, 255, 0.15);
  color: rgba(155, 179, 255, 0.6);
}

.message-input__action--send-active {
  background: var(--chat-accent, #4f8cff);
  border-color: transparent;
  color: #fff;
}

.message-input__action--send-loading {
  cursor: wait;
}

.message-input__file-input {
  display: none;
}

@media (max-width: 480px) {
  .message-input__action {
    width: 38px;
    height: 38px;
  }

  .message-input__attachments {
    gap: 6px;
  }

  .message-input__attachment-name {
    max-width: 160px;
  }
}

textarea {
  font-family: inherit;
}
</style>
