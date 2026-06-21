<template>
  <div class="attach-menu">
    <!-- Кнопка открытия меню -->
    <button
      type="button"
      class="btn-attach-menu"
      :class="{ active: showMenu }"
      @click="toggleMenu"
      title="Прикрепить"
    >
      <i class="fas fa-plus"></i>
    </button>

    <!-- Всплывающее меню -->
    <div v-if="showMenu" class="attach-menu-popup" @click.stop>
      <button class="attach-option" @click="selectFiles">
        <div class="option-icon file">
          <i class="fas fa-file-alt"></i>
        </div>
        <span class="option-label">Файл</span>
      </button>

      <button class="attach-option" @click="openVoiceRecorder">
        <div class="option-icon voice">
          <i class="fas fa-microphone"></i>
        </div>
        <span class="option-label">Голосовое</span>
      </button>

      <button class="attach-option" @click="openVideoRecorder">
        <div class="option-icon video">
          <i class="fas fa-video"></i>
        </div>
        <span class="option-label">Видео</span>
      </button>
    </div>

    <!-- Модалка записи голосового -->
    <VoiceRecorderModal
      v-if="showVoiceRecorder"
      @recorded="onVoiceRecorded"
      @close="showVoiceRecorder = false"
    />

    <!-- Модалка записи видео -->
    <VideoRecorderModal
      v-if="showVideoRecorder"
      @recorded="onVideoRecorded"
      @close="showVideoRecorder = false"
    />
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import VoiceRecorderModal from './VoiceRecorderModal.vue'
import VideoRecorderModal from './VideoRecorderModal.vue'

const emit = defineEmits(['file-select', 'voice-recorded', 'video-recorded'])

const showMenu = ref(false)
const showVoiceRecorder = ref(false)
const showVideoRecorder = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    // Закрываем меню при клике вне
    setTimeout(() => {
      document.addEventListener('click', closeMenuOnClickOutside, { once: true })
    }, 0)
  }
}

function closeMenuOnClickOutside(event) {
  const menu = document.querySelector('.attach-menu-popup')
  const button = document.querySelector('.btn-attach-menu')
  if (menu && !menu.contains(event.target) && button && !button.contains(event.target)) {
    showMenu.value = false
  }
}

function selectFiles() {
  showMenu.value = false
  emit('file-select')
}

function openVoiceRecorder() {
  showMenu.value = false
  showVoiceRecorder.value = true
}

function openVideoRecorder() {
  showMenu.value = false
  showVideoRecorder.value = true
}

function onVoiceRecorded(data) {
  emit('voice-recorded', data)
  showVoiceRecorder.value = false
}

function onVideoRecorded(data) {
  emit('video-recorded', data)
  showVideoRecorder.value = false
}

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})
</script>

<style scoped>
.attach-menu {
  position: relative;
}

.btn-attach-menu {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #667781;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s;
}

.btn-attach-menu:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #008069;
}

.btn-attach-menu.active {
  transform: rotate(45deg);
  color: #008069;
}

/* Всплывающее меню */
.attach-menu-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: white;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  z-index: 100;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.attach-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.attach-option:hover {
  background: #f0f2f5;
}

.option-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.option-icon.file {
  background: #e3f2fd;
  color: #1976d2;
}

.option-icon.voice {
  background: #e8f5e9;
  color: #388e3c;
}

.option-icon.video {
  background: #fce4ec;
  color: #c2185b;
}

.option-label {
  font-size: 14px;
  color: #111b21;
  font-weight: 500;
}

/* Адаптивность */
@media (max-width: 480px) {
  .attach-menu-popup {
    left: -8px;
  }
}
</style>
