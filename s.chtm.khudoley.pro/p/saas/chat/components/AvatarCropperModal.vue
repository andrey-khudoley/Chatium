<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content avatar-modal" @click.stop>
      <div class="avatar-modal-header">
        <h3>{{ title }}</h3>
        <button @click="close" class="btn-close">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="avatar-modal-body">
        <!-- File Input -->
        <div v-if="!cropperImage" class="file-upload-area" @click="$refs.fileInput.click()">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileSelect"
          />
          <i class="fas fa-cloud-arrow-up text-4xl mb-4" style="color: var(--primary-color)"></i>
          <p class="text-gray-600 mb-2">Нажмите или перетащите фото</p>
          <p class="text-sm text-gray-400">JPG, PNG до 5MB</p>
        </div>

        <!-- Cropper -->
        <div v-else class="cropper-container">
          <img
            ref="cropperImageElement"
            :src="cropperImage"
            class="max-w-full"
            style="max-height: 400px"
          />
        </div>
      </div>

      <div class="avatar-modal-footer">
        <button v-if="cropperImage" @click="resetFileInput" class="btn-secondary">
          Выбрать другое
        </button>
        <button
          v-if="cropperImage"
          @click="saveCroppedAvatar"
          :disabled="uploading"
          class="btn-primary"
          :class="{ loading: uploading }"
        >
          <i v-if="uploading" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ saveButtonText }}</span>
        </button>
        <button v-if="!cropperImage && currentAvatarHash" @click="removeAvatar" class="btn-danger">
          <i class="fas fa-trash"></i>
          Удалить фото
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { apiFilesGetUploadUrlRoute } from '../api/files'

const props = defineProps({
  isOpen: Boolean,
  title: {
    type: String,
    default: 'Выберите фото'
  },
  saveButtonText: {
    type: String,
    default: 'Сохранить фото'
  },
  currentAvatarHash: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'save', 'remove'])

const fileInput = ref(null)
const cropperImage = ref('')
const cropperImageElement = ref(null)
const cropperInstance = ref(null)
const uploading = ref(false)

// Очистка при закрытии
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      resetFileInput()
    }
  }
)

function close() {
  emit('close')
}

function resetFileInput() {
  cropperImage.value = ''
  if (cropperInstance.value) {
    cropperInstance.value.destroy()
    cropperInstance.value = null
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Выберите изображение')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Файл слишком большой (макс 5MB)')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    cropperImage.value = e.target.result
    // Initialize cropper after image loads
    setTimeout(() => {
      initCropper()
    }, 100)
  }
  reader.readAsDataURL(file)
}

function initCropper() {
  const image = cropperImageElement.value
  if (!image) return

  if (cropperInstance.value) {
    cropperInstance.value.destroy()
  }

  cropperInstance.value = new Cropper(image, {
    aspectRatio: 1,
    viewMode: 2,
    dragMode: 'move',
    autoCropArea: 0.9,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
    minCropBoxWidth: 100,
    minCropBoxHeight: 100,
    ready() {
      const imageData = this.cropper.getImageData()
      const containerData = this.cropper.getContainerData()

      // Если изображение квадратное (допуск 5%), выделяем все
      const aspectRatio = imageData.width / imageData.height
      if (Math.abs(aspectRatio - 1) < 0.05) {
        // Квадратное фото - выделяем всё
        this.cropper.setCropBoxData({
          left: 0,
          top: 0,
          width: containerData.width,
          height: containerData.height
        })
      } else {
        // Не квадратное - выделяем центральную квадратную область
        const size = Math.min(containerData.width, containerData.height) * 0.9
        this.cropper.setCropBoxData({
          left: (containerData.width - size) / 2,
          top: (containerData.height - size) / 2,
          width: size,
          height: size
        })
      }
    }
  })
}

async function saveCroppedAvatar() {
  if (!cropperInstance.value) return

  uploading.value = true

  try {
    // Get cropped canvas
    const canvas = cropperInstance.value.getCroppedCanvas({
      width: 400,
      height: 400,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    })

    // Convert canvas to Blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })

    if (!blob) {
      throw new Error('Failed to create image blob')
    }

    // Get upload URL from server
    const { uploadUrl } = await apiFilesGetUploadUrlRoute.run(ctx)

    // Upload file directly to storage
    const uploadedFile = await uploadFileToStorage(uploadUrl, blob)

    // Emit save event with hash
    emit('save', uploadedFile.hash)
    close()
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error)
    alert('Не удалось загрузить аватар: ' + error.message)
  } finally {
    uploading.value = false
  }
}

// Upload file directly to storage
function uploadFileToStorage(uploadUrl, file) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('Filedata', file, 'avatar.jpg')

    const request = new XMLHttpRequest()
    request.open('POST', uploadUrl)

    request.upload.addEventListener('progress', function (e) {
      const progress = e.total !== 0 ? (e.loaded / e.total) * 100 : 0
      console.log('Upload progress:', Math.round(progress) + '%')
    })

    request.addEventListener('load', function () {
      if (request.status === 200) {
        const hash = request.response
        resolve({
          hash: hash,
          type: file.type,
          size: file.size
        })
      } else {
        reject(new Error('Upload failed: ' + request.statusText))
      }
    })

    request.addEventListener('error', function () {
      reject(new Error('Upload error'))
    })

    request.send(formData)
  })
}

function removeAvatar() {
  if (!confirm('Удалить фото?')) return
  emit('remove')
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.avatar-modal {
  max-width: 500px;
}

.avatar-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.avatar-modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.btn-close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.avatar-modal-body {
  padding: 1.5rem;
}

.avatar-modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.file-upload-area {
  border: 2px dashed var(--primary-color);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--accent-light);
}

.file-upload-area:hover {
  background: var(--bg-hover);
}

.cropper-container {
  max-height: 400px;
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
}

.hidden {
  display: none;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: var(--danger-color, #ef4444);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

.text-gray-600 {
  color: var(--text-secondary);
}

.text-gray-400 {
  color: var(--text-muted);
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-4xl {
  font-size: 2.25rem;
}

/* Cropper.js styles */
:deep(.cropper-container) {
  direction: ltr;
  font-size: 0;
  line-height: 0;
  position: relative;
  touch-action: none;
  user-select: none;
}

:deep(.cropper-wrap-box) {
  overflow: hidden;
}

:deep(.cropper-drag-box) {
  background-color: #fff;
  opacity: 0;
}

:deep(.cropper-modal) {
  background-color: #000;
  opacity: 0.5;
}

:deep(.cropper-view-box) {
  display: block;
  height: 100%;
  outline: 3px solid var(--primary-color);
  outline-color: var(--primary-color);
  overflow: hidden;
  width: 100%;
}

:deep(.cropper-dashed) {
  border: 0 dashed rgba(255, 255, 255, 0.5);
  display: block;
  opacity: 0.7;
  position: absolute;
}

:deep(.cropper-dashed.dashed-h) {
  border-top-width: 1px;
  border-bottom-width: 1px;
  height: calc(100% / 3);
  left: 0;
  top: calc(100% / 3);
  width: 100%;
}

:deep(.cropper-dashed.dashed-v) {
  border-left-width: 1px;
  border-right-width: 1px;
  height: 100%;
  left: calc(100% / 3);
  top: 0;
  width: calc(100% / 3);
}

:deep(.cropper-center) {
  display: block;
  height: 0;
  left: 50%;
  opacity: 0.75;
  position: absolute;
  top: 50%;
  width: 0;
}

:deep(.cropper-center::before),
:deep(.cropper-center::after) {
  background-color: #fff;
  content: ' ';
  display: block;
  position: absolute;
}

:deep(.cropper-center::before) {
  height: 1px;
  left: -3px;
  top: 0;
  width: 7px;
}

:deep(.cropper-center::after) {
  height: 7px;
  left: 0;
  top: -3px;
  width: 1px;
}

:deep(.cropper-face),
:deep(.cropper-line),
:deep(.cropper-point) {
  display: block;
  height: 100%;
  opacity: 0.1;
  position: absolute;
  width: 100%;
}

:deep(.cropper-face) {
  background-color: #fff;
  opacity: 0;
}

/* Линии для изменения размера */
:deep(.cropper-line) {
  background-color: var(--primary-color);
}

:deep(.cropper-line.line-e) {
  cursor: ew-resize;
  right: -3px;
  top: 0;
  width: 6px;
}

:deep(.cropper-line.line-n) {
  cursor: ns-resize;
  height: 6px;
  left: 0;
  top: -3px;
}

:deep(.cropper-line.line-w) {
  cursor: ew-resize;
  left: -3px;
  top: 0;
  width: 6px;
}

:deep(.cropper-line.line-s) {
  bottom: -3px;
  cursor: ns-resize;
  height: 6px;
  left: 0;
}

/* Точки в углах и по сторонам */
:deep(.cropper-point) {
  background-color: var(--primary-color);
  height: 10px;
  opacity: 0.9;
  width: 10px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

:deep(.cropper-point.point-e) {
  cursor: ew-resize;
  margin-top: -5px;
  right: -5px;
  top: 50%;
}

:deep(.cropper-point.point-n) {
  cursor: ns-resize;
  left: 50%;
  margin-left: -5px;
  top: -5px;
}

:deep(.cropper-point.point-w) {
  cursor: ew-resize;
  left: -5px;
  margin-top: -5px;
  top: 50%;
}

:deep(.cropper-point.point-s) {
  bottom: -5px;
  cursor: s-resize;
  left: 50%;
  margin-left: -5px;
}

:deep(.cropper-point.point-ne) {
  cursor: nesw-resize;
  right: -5px;
  top: -5px;
}

:deep(.cropper-point.point-nw) {
  cursor: nwse-resize;
  left: -5px;
  top: -5px;
}

:deep(.cropper-point.point-sw) {
  bottom: -5px;
  cursor: nesw-resize;
  left: -5px;
}

:deep(.cropper-point.point-se) {
  bottom: -5px;
  cursor: nwse-resize;
  right: -5px;
}

:deep(.cropper-bg) {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC');
}

@media (max-width: 480px) {
  .avatar-modal {
    max-width: 100%;
    margin: 16px;
  }

  .file-upload-area {
    padding: 2rem 1rem;
  }
}
</style>
