<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="media-viewer-overlay" @click="closeOnOverlay">
        <div class="media-viewer-content" @click.stop>
          <!-- Top bar with close button -->
          <div class="viewer-top-bar">
            <button class="viewer-close" @click="close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Navigation buttons (for multiple images) -->
          <template v-if="mediaList.length > 1">
            <button 
              v-if="currentIndex > 0" 
              class="viewer-nav viewer-prev"
              @click="prev"
            >
              <i class="fas fa-chevron-left"></i>
            </button>
            <button 
              v-if="currentIndex < mediaList.length - 1" 
              class="viewer-nav viewer-next"
              @click="next"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </template>
          
          <!-- Image -->
          <img 
            v-if="currentMedia?.type === 'image'"
            :src="currentMedia?.url"
            :alt="currentMedia?.name"
            class="viewer-media viewer-image"
            @click.stop
          />
          
          <!-- Video -->
          <video 
            v-else-if="currentMedia?.type === 'video'"
            :src="currentMedia?.url"
            controls
            autoplay
            class="viewer-media viewer-video"
            @click.stop
          />
          
          <!-- Bottom bar with counter and download -->
          <div class="viewer-bottom-bar">
            <span v-if="mediaList.length > 1" class="viewer-counter">
              {{ currentIndex + 1 }} / {{ mediaList.length }}
            </span>
            <span v-else></span>
            <a 
              :href="currentMedia?.url"
              download
              class="viewer-download"
              @click.stop
            >
              <i class="fas fa-download"></i>
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  files: {
    type: Array,
    default: () => [],
  },
  initialIndex: {
    type: Number,
    default: 0,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const currentIndex = ref(props.initialIndex)

const mediaList = computed(() => {
  return props.files
    .filter(file => {
      const mime = file.mimeType || file.mime_type || ''
      const name = file.name || ''
      const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
      const isVideo = mime.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(name)
      return isImage || isVideo
    })
    .map(file => {
      const mime = file.mimeType || file.mime_type || ''
      const name = file.name || ''
      const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
      const fileId = file.hash || file.uid || ''
      return {
        ...file,
        url: fileId ? `https://fs.chatium.ru/get/${fileId}` : '',
        type: isImage ? 'image' : 'video',
      }
    })
})

const currentMedia = computed(() => mediaList.value[currentIndex.value] || null)

function close() {
  isOpen.value = false
}

function closeOnOverlay(event) {
  if (event.target === event.currentTarget) {
    close()
  }
}

function next() {
  if (currentIndex.value < mediaList.value.length - 1) {
    currentIndex.value++
  }
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function handleKeydown(e) {
  if (!isOpen.value) return
  
  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowRight':
      next()
      break
    case 'ArrowLeft':
      prev()
      break
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    currentIndex.value = props.initialIndex
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.media-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-viewer-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.viewer-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  z-index: 10;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
}

.viewer-close {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.viewer-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

.viewer-media {
  flex: 1;
  width: 100%;
  max-height: calc(100% - 120px);
  object-fit: contain;
  align-self: center;
}

.viewer-image {
  cursor: zoom-in;
}

.viewer-video {
  min-width: 300px;
  max-width: 90%;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.viewer-nav:hover {
  background: rgba(255, 255, 255, 0.25);
}

.viewer-prev {
  left: 20px;
}

.viewer-next {
  right: 20px;
}

.viewer-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
}

.viewer-counter {
  font-size: 14px;
  color: white;
  opacity: 0.9;
}

.viewer-download {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: background 0.2s;
}

.viewer-download:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Mobile styles */
@media (max-width: 768px) {
  .viewer-top-bar {
    padding: 12px;
  }
  
  .viewer-close {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .viewer-nav {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .viewer-prev {
    left: 8px;
  }
  
  .viewer-next {
    right: 8px;
  }
  
  .viewer-bottom-bar {
    padding: 12px 16px;
  }
  
  .viewer-download {
    width: 40px;
    height: 40px;
  }
}

/* Small mobile styles */
@media (max-width: 480px) {
  .viewer-nav {
    display: none;
  }
  
  .viewer-media {
    max-height: calc(100% - 100px);
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>