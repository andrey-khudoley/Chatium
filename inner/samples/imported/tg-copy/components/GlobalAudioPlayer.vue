<template>
  <Transition name="player-slide">
    <div v-if="currentTrack" class="global-audio-player" :class="{ 'floating': isFloating }">
      <div class="player-content">
        <!-- Первая строка: управление -->
        <div class="player-row player-controls-row">
          <!-- Кнопка Play/Pause слева -->
          <button class="btn-play" @click="togglePlay" :title="isPlaying ? 'Пауза' : 'Воспроизвести'">
            <i class="fas" :class="isPlaying ? 'fa-pause' : 'fa-play'"></i>
          </button>

          <!-- Прогресс-бар по центру (занимает всё доступное место) -->
          <div class="progress-section">
            <span class="time time-current">{{ formatTime(playbackProgress) }}</span>
            <div class="progress-bar" @click="handleProgressClick">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            <span class="time time-total">{{ formatTime(currentTrack.duration) }}</span>
          </div>

          <!-- Скорость воспроизведения справа -->
          <button class="btn-speed" @click="cycleSpeed" title="Изменить скорость">
            {{ playbackSpeed }}x
          </button>

          <!-- Кнопка закрыть -->
          <button class="btn-close" @click="close" title="Закрыть">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Вторая строка: информация о треке -->
        <div class="player-row player-info-row">
          <div class="track-info">
            <span class="track-sender">{{ currentTrack.senderName || 'Неизвестно' }}</span>
            <span class="track-divider">в</span>
            <span class="track-chat">{{ currentTrack.chatTitle || 'Голосовое сообщение' }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useGlobalAudioPlayerSingleton } from '../composables/useGlobalAudioPlayer.ts'

const props = defineProps({
  isFloating: {
    type: Boolean,
    default: false
  }
})

const {
  currentTrack,
  isPlaying,
  playbackSpeed,
  progressPercent,
  playbackProgress,
  togglePlay,
  seekTo,
  cycleSpeed,
  close
} = useGlobalAudioPlayerSingleton()

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleProgressClick(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = (x / rect.width) * 100
  seekTo(percent)
}
</script>

<style scoped>
.global-audio-player {
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  position: relative;
  flex-shrink: 0;
}

.global-audio-player.floating {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 12px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-top: none;
  z-index: 200;
}

.player-content {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 6px;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted, #8696a0);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-hover, #f5f6f8);
  color: var(--text-danger, #ef4444);
}

/* Первая строка: управление */
.player-controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-play {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--accent-primary, #2AABEE);
  color: white;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-play:hover {
  background: var(--accent-hover, #229ED9);
}

/* Прогресс-бар (занимает всё доступное место) */
.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.time {
  font-size: 12px;
  color: var(--text-muted, #8696a0);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 36px;
  text-align: center;
}

.time-current {
  text-align: right;
}

.time-total {
  text-align: left;
}

.progress-bar {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--bg-secondary, #f0f2f5);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-track:hover {
  height: 6px;
  border-radius: 3px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary, #2AABEE);
  border-radius: 2px;
  transition: width 0.1s linear;
}

/* Кнопка скорости */
.btn-speed {
  padding: 6px 12px;
  border: 1px solid var(--border-light, #d1d7db);
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #111b21);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px;
  flex-shrink: 0;
  min-width: 48px;
  transition: all 0.2s;
}

.btn-speed:hover {
  background: var(--bg-hover, #e8eaed);
  border-color: var(--accent-primary, #2AABEE);
}

/* Вторая строка: информация */
.player-info-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #667781);
  white-space: nowrap;
  overflow: hidden;
}

.track-sender {
  font-weight: 500;
  color: var(--text-primary, #111b21);
}

.track-divider {
  color: var(--text-muted, #8696a0);
}

.track-chat {
  color: var(--text-secondary, #667781);
}

/* Анимация появления/исчезновения */
.player-slide-enter-active,
.player-slide-leave-active {
  transition: all 0.3s ease;
}

.player-slide-enter-from,
.player-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Мобильные стили */
@media (max-width: 768px) {
  .player-content {
    padding: 8px 10px;
    gap: 4px;
  }

  .player-controls-row {
    gap: 8px;
  }

  .btn-play {
    width: 36px;
    height: 36px;
    font-size: 12px;
  }

  .progress-section {
    gap: 6px;
  }

  .time {
    font-size: 11px;
    min-width: 32px;
  }

  .btn-speed {
    padding: 4px 10px;
    font-size: 12px;
    min-width: 42px;
  }

  .btn-close {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .track-info {
    font-size: 12px;
  }
}

/* Тёмная тема */
[data-theme="dark"] .global-audio-player {
  background: var(--bg-primary, #111b21);
  border-color: var(--border-color, #2a3942);
}

[data-theme="dark"] .track-sender {
  color: var(--text-primary, #e9edef);
}

[data-theme="dark"] .track-chat {
  color: var(--text-secondary, #8696a0);
}

[data-theme="dark"] .btn-speed {
  background: var(--bg-secondary, #1f2c33);
  border-color: var(--border-light, #374045);
  color: var(--text-primary, #e9edef);
}

[data-theme="dark"] .time {
  color: var(--text-muted, #667781);
}

[data-theme="dark"] .progress-track {
  background: var(--bg-secondary, #2a3942);
}
</style>