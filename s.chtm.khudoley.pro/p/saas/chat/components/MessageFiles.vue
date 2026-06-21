<template>
  <div v-if="files && files.length > 0" class="message-files">
    <div
      v-for="(file, index) in files"
      :key="file.hash"
      :class="[
        'file-item',
        {
          image: isImage(file),
          video: isVideo(file) && !isVideoNote(file),
          'voice-message': isVoiceMessage(file),
          'video-note': isVideoNote(file)
        }
      ]"
    >
      <!-- Голосовое сообщение -->
      <template v-if="isVoiceMessage(file)">
        <VoiceMessage
          :file="file"
          :is-own="isOwn"
          :message-id="messageId"
          :feed-id="feedId"
          :is-workspace-admin="isWorkspaceAdmin"
          :message-data="messageData"
          :message="message"
          :chat-title="chatTitle"
          :sender-name="senderName"
        />
      </template>

      <!-- Видео-кружочек -->
      <template v-else-if="isVideoNote(file)">
        <VideoNote :file="file" :duration="file.duration" />
      </template>

      <!-- Изображение -->
      <template v-else-if="isImage(file)">
        <div class="image-wrapper" @click.stop="openViewer(index)">
          <img
            :src="file.url || file.previewUrl || getThumbnailUrl(file.hash)"
            :alt="file.name"
            class="file-image"
            loading="lazy"
          />
        </div>
      </template>

      <!-- Видео обычное -->
      <template v-else-if="isVideo(file)">
        <div class="image-wrapper" @click.stop="openViewer(index)">
          <video :src="getFileUrl(file.hash)" class="file-image" preload="metadata" />
          <div class="video-play-overlay">
            <i class="fas fa-play-circle"></i>
          </div>
        </div>
      </template>

      <!-- Аудио файл (не голосовое) -->
      <template v-else-if="isAudio(file)">
        <div class="audio-file">
          <div class="audio-icon">
            <i class="fas fa-music"></i>
          </div>
          <div class="audio-info">
            <div class="audio-name">{{ file.name }}</div>
            <audio :src="getFileUrl(file.hash)" controls preload="metadata" />
          </div>
        </div>
      </template>

      <!-- Другие файлы -->
      <template v-else>
        <div class="file-icon">
          <i :class="getFileIcon(file)"></i>
        </div>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-size">{{ formatFileSize(file.size) }}</div>
        </div>
        <a :href="getFileUrl(file.hash)" target="_blank" download class="file-download">
          <i class="fas fa-download"></i>
        </a>
      </template>
    </div>

    <!-- Media Viewer Modal -->
    <MediaViewer v-model="viewerOpen" :files="mediaFiles" :initial-index="viewerIndex" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MediaViewer from './MediaViewer.vue'
import VoiceMessage from './VoiceMessage.vue'
import VideoNote from './VideoNote.vue'

const props = defineProps({
  files: {
    type: Array,
    default: () => []
  },
  isOwn: {
    type: Boolean,
    default: false
  },
  messageId: {
    type: String,
    default: ''
  },
  feedId: {
    type: String,
    default: ''
  },
  isWorkspaceAdmin: {
    type: Boolean,
    default: false
  },
  messageData: {
    type: Object,
    default: () => ({})
  },
  // Полное сообщение для реактивного доступа к транскрипции
  message: {
    type: Object,
    default: null
  },
  // Данные для глобального аудиоплеера
  chatTitle: {
    type: String,
    default: ''
  },
  senderName: {
    type: String,
    default: ''
  }
})

const viewerOpen = ref(false)
const viewerIndex = ref(0)

const mediaFiles = computed(() => {
  return props.files.filter((file) => isImage(file) || (isVideo(file) && !isVideoNote(file)))
})

// Проверка на голосовое сообщение
function isVoiceMessage(file) {
  // Проверяем флаг isVoiceMessage или по MIME типу и имени
  if (file.isVoiceMessage) return true

  const mimeType = file.mimeType || file.mime_type || ''
  const name = file.name || ''

  // Голосовые сообщения имеют специфичные паттерны в имени
  if (name.startsWith('voice-message-')) return true

  // Или по MIME типу аудио
  if (mimeType.startsWith('audio/') && !name.match(/\.(mp3|m4a|ogg|wav)$/)) {
    return true
  }

  return false
}

// Проверка на видео-кружочек
function isVideoNote(file) {
  if (file.isVideoNote) return true

  const name = file.name || ''
  if (name.startsWith('video-note-')) return true

  return false
}

function isImage(file) {
  if (isVoiceMessage(file) || isVideoNote(file)) return false
  return (
    file.mimeType?.startsWith('image/') ||
    file.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
  )
}

function isVideo(file) {
  if (isVideoNote(file)) return true
  return (
    file.mimeType?.startsWith('video/') ||
    file.mime_type?.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|avi)$/i.test(file.name)
  )
}

function isAudio(file) {
  if (isVoiceMessage(file)) return false
  return (
    file.mimeType?.startsWith('audio/') ||
    file.mime_type?.startsWith('audio/') ||
    /\.(mp3|m4a|ogg|wav|flac)$/i.test(file.name)
  )
}

function getFileUrl(hash) {
  const fileId = hash || ''
  return fileId ? `https://fs.chatium.ru/get/${fileId}` : ''
}

function getThumbnailUrl(hash) {
  const fileId = hash || ''
  return fileId ? `https://fs.chatium.ru/thumbnail/${fileId}/s/600x` : ''
}

function getFileIcon(file) {
  const mimeType = file.mimeType || file.mime_type || ''
  const name = file.name || ''

  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return 'fas fa-file-pdf'
  if (mimeType.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return 'fas fa-file-word'
  if (mimeType.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx'))
    return 'fas fa-file-excel'
  if (mimeType.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx'))
    return 'fas fa-file-powerpoint'
  if (mimeType.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar'))
    return 'fas fa-file-archive'
  if (mimeType.includes('audio')) return 'fas fa-file-audio'
  if (mimeType.includes('video')) return 'fas fa-file-video'
  if (mimeType.includes('text') || name.endsWith('.txt')) return 'fas fa-file-alt'

  return 'fas fa-file'
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function openViewer(index) {
  const targetFile = props.files[index]
  const targetId = targetFile.hash || targetFile.uid
  const mediaIndex = mediaFiles.value.findIndex((f) => {
    const fId = f.hash || f.uid
    return fId === targetId
  })
  viewerIndex.value = mediaIndex >= 0 ? mediaIndex : 0
  viewerOpen.value = true
}
</script>

<style scoped>
.message-files {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.5rem 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  transition: background 0.2s;
}

.file-item:hover {
  background: rgba(0, 0, 0, 0.08);
}

.file-item.image,
.file-item.video:not(.video-note) {
  padding: 0;
  background: transparent;
  width: 100%;
}

.file-item.video-note,
.file-item.voice-message {
  padding: 0.5rem;
  background: transparent;
}

.file-item.voice-message {
  border-radius: 12px;
}

.image-wrapper {
  width: 100%;
  min-height: 200px;
  max-height: 480px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary, #f0f2f5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.image-wrapper img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 480px;
  min-height: 150px;
  object-fit: contain;
  display: block;
}

.file-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Файл-видео (устаревшие стили) */
.file-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s;
  pointer-events: none;
}

.image-wrapper:hover .video-play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.video-play-overlay i {
  font-size: 48px;
  color: white;
  opacity: 0.9;
}

/* Убрали file-name-overlay для изображений */

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #008069;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #111b21;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #667781;
  margin-top: 2px;
}

.file-download {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667781;
  text-decoration: none;
  transition: all 0.2s;
}

.file-download:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #008069;
}

/* Аудио файл (не голосовое) */
.audio-file {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
}

.audio-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-name {
  font-size: 13px;
  color: #111b21;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.audio-info audio {
  width: 100%;
  height: 32px;
  border-radius: 4px;
}
</style>
