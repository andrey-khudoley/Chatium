<template>
  <div
    v-if="isOpen"
    @click.self="$emit('close')"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold mb-4">Select Icon</h2>

      <!-- Upload Image Section -->
      <div class="mb-6 border-b border-gray-200 pb-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Upload Custom Image</h3>
        <div class="flex items-center gap-4">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden"
          />
          <button
            @click="$refs.fileInput.click()"
            :disabled="isUploading"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isUploading ? 'Uploading...' : 'Choose Image' }}
          </button>

          <!-- Current uploaded image preview -->
          <div v-if="currentImageHash" class="flex items-center gap-2">
            <img
              :src="getThumbnailUrl(currentImageHash, 48)"
              class="w-12 h-12 object-cover rounded border-2 border-gray-300"
              alt="Current image"
            />
            <span class="text-xs text-gray-500">Current image</span>
          </div>

          <!-- Preview of new upload -->
          <div
            v-if="uploadedImageHash && uploadedImageHash !== currentImageHash"
            class="flex items-center gap-2"
          >
            <img
              :src="getThumbnailUrl(uploadedImageHash, 48)"
              class="w-12 h-12 object-cover rounded border-2 border-green-500"
              alt="New image"
            />
            <span class="text-xs text-green-600 font-medium">New!</span>
          </div>

          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="flex-1">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- FontAwesome Icons Section -->
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Or Choose FontAwesome Icon</h3>

      <!-- Search Field -->
      <div class="mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search icons..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Icon Grid -->
      <div class="grid grid-cols-8 gap-3 mb-6 max-h-96 overflow-y-auto">
        <button
          v-for="icon in filteredIcons"
          :key="icon"
          @click="selectIcon(icon)"
          :class="
            selectedIcon === icon
              ? 'p-3 rounded-lg transition-all bg-blue-100 border-2 border-blue-500'
              : 'p-3 rounded-lg transition-all hover:bg-gray-100 border-2 border-transparent'
          "
          title="icon"
        >
          <i :class="['fas', `fa-${icon}`, 'text-lg text-gray-700']"></i>
        </button>
      </div>

      <!-- Clear icon/image option -->
      <div class="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          @click="clearSelection"
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Clear All
        </button>

        <div class="flex space-x-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            @click="handleConfirm"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { getThumbnailUrl } from '@app/storage'
import { obtainStorageFilePutUrl } from '@app/storage'

const props = defineProps({
  isOpen: Boolean,
  currentIcon: String,
  currentImageHash: String
})

const emit = defineEmits(['close', 'select', 'select-image'])

const selectedIcon = ref(props.currentIcon)
const searchQuery = ref('')
const uploadedImageHash = ref(props.currentImageHash)
const isUploading = ref(false)
const uploadProgress = ref(0)
const fileInput = ref(null)

const availableIcons = [
  // Documents
  'file',
  'file-lines',
  'file-pdf',
  'file-word',
  'file-excel',
  'file-code',
  'file-archive',
  'file-image',
  'file-invoice',
  'file-contract',
  'file-signature',
  'file-medical',
  'file-prescription',

  // Books & References
  'book',
  'book-open',
  'book-reader',
  'bookmark',
  'atlas',
  'graduation-cap',
  'chalkboard',

  // Folders
  'folder',
  'folder-open',
  'folder-plus',
  'archive',
  'folder-tree',

  // Writing & Editing
  'pen',
  'pencil',
  'pen-fancy',
  'pen-to-square',
  'feather',
  'highlighter',
  'marker',
  'pen-nib',
  'pen-clip',

  // Common Actions
  'check',
  'xmark',
  'plus',
  'minus',
  'equals',
  'asterisk',
  'exclamation',
  'question',
  'info',
  'circle-exclamation',
  'ban',
  'arrow-rotate-left',
  'arrow-rotate-right',

  // Favorites & Ratings
  'star',
  'star-half',
  'heart',
  'thumbs-up',
  'thumbs-down',

  // UI & Interaction
  'lightbulb',
  'bell',
  'clock',
  'clock-rotate-left',
  'arrows-rotate',
  'rotate',
  'arrow-up',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'chevron-up',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'expand',
  'compress',

  // Settings & Configuration
  'gear',
  'sliders',
  'wrench',
  'hammer',
  'screwdriver',
  'screwdriver-wrench',

  // Development
  'code',
  'code-branch',
  'terminal',

  // Data & Charts
  'database',
  'chart-bar',
  'chart-line',
  'chart-pie',
  'signal',
  'gauge',
  'gauge-high',

  // Organization
  'puzzle-piece',
  'cube',
  'cubes',
  'box',
  'layer-group',
  'sitemap',
  'diagram-project',

  // Lists & Navigation
  'list',
  'list-ul',
  'list-ol',
  'list-check',
  'indent',
  'outdent',
  'align-left',
  'align-center',
  'align-right',
  'bars',

  // Communication
  'comment',
  'comments',
  'envelope',
  'message',
  'phone',
  'users',
  'user-circle',
  'user',
  'handshake',
  'user-tie',

  // Media
  'image',
  'images',
  'video',
  'film',
  'play',
  'pause',
  'stop',
  'volume-high',
  'volume-xmark',
  'camera',
  'camera-retro',
  'eye',
  'eye-slash',
  'magnifying-glass',

  // System
  'house',
  'building',
  'location-dot',
  'map',
  'compass',
  'globe',
  'earth-americas',
  'wifi',
  'cloud',
  'cloud-arrow-up',
  'cloud-arrow-down',
  'server',
  'desktop',
  'mobile',
  'tablet',
  'laptop',
  'keyboard',
  'computer-mouse',
  'print',
  'floppy-disk',
  'download',
  'upload',
  'share-nodes',
  'link',
  'paperclip',
  'thumbtack',
  'tag',
  'tags',
  'trash',
  'trash-can',
  'recycle',
  'lock',
  'unlock',
  'key',

  // Status
  'circle',
  'circle-pause',
  'circle-play',
  'hourglass',
  'hourglass-half',
  'spinner',

  // Misc
  'apple',
  'windows',
  'android',
  'linux',
  'copyright',
  'registered',
  'trademark',
  'certificate',
  'medal',
  'trophy',
  'award',
  'ribbon',

  // Additional
  'rocket',
  'fire',
  'bolt',
  'wand-magic-sparkles',
  'shield',
  'shield-halved',
  'bug',
  'flask',
  'microscope',
  'atom',
  'dna',
  'pills',
  'syringe',
  'heart-pulse',
  'briefcase',
  'calendar',
  'clipboard',
  'clipboard-list',
  'clipboard-check',
  'flag',
  'flag-checkered',
  'bell-slash',
  'brain',
  'circle-info',
  'circle-question',
  'triangle-exclamation',
  'circle-check',
  'circle-xmark',
  'square-check',
  'square-xmark'
]

const filteredIcons = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableIcons
  }

  const query = searchQuery.value.toLowerCase()
  return availableIcons.filter((icon) => icon.toLowerCase().includes(query))
})

watch(
  () => props.currentIcon,
  (newIcon) => {
    selectedIcon.value = newIcon
  },
  { immediate: true }
)

watch(
  () => props.currentImageHash,
  (newHash) => {
    uploadedImageHash.value = newHash
  },
  { immediate: true }
)

function selectIcon(icon) {
  selectedIcon.value = icon
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploading.value = true
    uploadProgress.value = 0

    const uploadUrl = await obtainStorageFilePutUrl(ctx)
    const formData = new FormData()
    formData.append('Filedata', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        uploadedImageHash.value = xhr.response
        selectedIcon.value = null // Clear icon selection when image is uploaded
        uploadProgress.value = 100
      }
      isUploading.value = false
    })

    xhr.addEventListener('error', () => {
      isUploading.value = false
      uploadProgress.value = 0
      alert('Failed to upload image')
    })

    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  } catch (error) {
    console.error('Upload error:', error)
    isUploading.value = false
    uploadProgress.value = 0
    alert('Failed to upload image')
  }
}

function clearSelection() {
  selectedIcon.value = null
  uploadedImageHash.value = null
}

function handleConfirm() {
  // If image is uploaded, use it; otherwise use selected icon
  if (uploadedImageHash.value) {
    emit('select-image', uploadedImageHash.value)
  } else {
    emit('select', selectedIcon.value)
  }
  emit('close')
}
</script>
