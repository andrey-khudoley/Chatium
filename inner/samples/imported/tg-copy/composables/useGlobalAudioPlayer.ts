// @shared
import { ref, computed, readonly } from 'vue'

export interface AudioTrack {
  id: string
  url: string
  duration: number
  currentTime: number
  messageId: string
  feedId: string
  chatTitle?: string
  senderName?: string
  isOwn?: boolean
}

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2

const currentTrack = ref<AudioTrack | null>(null)
const isPlaying = ref(false)
const playbackSpeed = ref<PlaybackSpeed>(1)
const audioElement = ref<HTMLAudioElement | null>(null)
const playbackProgress = ref(0)

// Скорости воспроизведения
const SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2]

export function useGlobalAudioPlayer() {
  const progressPercent = computed(() => {
    if (!currentTrack.value || currentTrack.value.duration === 0) return 0
    return (playbackProgress.value / currentTrack.value.duration) * 100
  })

  const currentSpeed = computed(() => playbackSpeed.value)

  function initAudioElement() {
    if (!audioElement.value) {
      audioElement.value = new Audio()
      
      audioElement.value.addEventListener('timeupdate', () => {
        if (audioElement.value) {
          playbackProgress.value = audioElement.value.currentTime
          if (currentTrack.value) {
            currentTrack.value.currentTime = audioElement.value.currentTime
          }
        }
      })

      audioElement.value.addEventListener('ended', () => {
        isPlaying.value = false
        playbackProgress.value = 0
        if (currentTrack.value) {
          currentTrack.value.currentTime = 0
        }
      })

      audioElement.value.addEventListener('error', () => {
        console.error('Audio playback error')
        isPlaying.value = false
      })
    }
  }

  function play(track: AudioTrack) {
    initAudioElement()
    
    if (!audioElement.value) return

    // Если это тот же трек - просто продолжаем
    if (currentTrack.value?.id === track.id) {
      audioElement.value.play()
      isPlaying.value = true
      return
    }

    // Новый трек
    currentTrack.value = { ...track, currentTime: track.currentTime || 0 }
    playbackProgress.value = track.currentTime || 0
    
    audioElement.value.src = track.url
    audioElement.value.playbackRate = playbackSpeed.value
    audioElement.value.currentTime = track.currentTime || 0
    
    audioElement.value.play().catch(err => {
      console.error('Failed to play audio:', err)
      isPlaying.value = false
    })
    
    isPlaying.value = true
  }

  function pause() {
    if (audioElement.value) {
      audioElement.value.pause()
      isPlaying.value = false
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else if (currentTrack.value) {
      audioElement.value?.play()
      isPlaying.value = true
    }
  }

  function stop() {
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.currentTime = 0
    }
    isPlaying.value = false
    playbackProgress.value = 0
    if (currentTrack.value) {
      currentTrack.value.currentTime = 0
    }
  }

  function seekTo(percent: number) {
    if (!audioElement.value || !currentTrack.value) return
    
    const newTime = (percent / 100) * currentTrack.value.duration
    audioElement.value.currentTime = newTime
    playbackProgress.value = newTime
    currentTrack.value.currentTime = newTime
  }

  function seekRelative(seconds: number) {
    if (!audioElement.value || !currentTrack.value) return
    
    const newTime = Math.max(0, Math.min(
      currentTrack.value.duration,
      audioElement.value.currentTime + seconds
    ))
    audioElement.value.currentTime = newTime
    playbackProgress.value = newTime
    currentTrack.value.currentTime = newTime
  }

  function cycleSpeed() {
    const currentIndex = SPEEDS.indexOf(playbackSpeed.value)
    const nextIndex = (currentIndex + 1) % SPEEDS.length
    const newSpeed = SPEEDS[nextIndex]
    
    playbackSpeed.value = newSpeed
    
    if (audioElement.value) {
      audioElement.value.playbackRate = newSpeed
    }
  }

  function setSpeed(speed: PlaybackSpeed) {
    playbackSpeed.value = speed
    if (audioElement.value) {
      audioElement.value.playbackRate = speed
    }
  }

  function close() {
    stop()
    currentTrack.value = null
  }

  function updateTrackInfo(updates: Partial<AudioTrack>) {
    if (currentTrack.value) {
      currentTrack.value = { ...currentTrack.value, ...updates }
    }
  }

  return {
    currentTrack: readonly(currentTrack),
    isPlaying: readonly(isPlaying),
    playbackSpeed: currentSpeed,
    progressPercent: readonly(progressPercent),
    playbackProgress: readonly(playbackProgress),
    play,
    pause,
    togglePlay,
    stop,
    seekTo,
    seekRelative,
    cycleSpeed,
    setSpeed,
    close,
    updateTrackInfo,
    SPEEDS,
  }
}

// Глобальный singleton
let globalPlayerInstance: ReturnType<typeof useGlobalAudioPlayer> | null = null

export function useGlobalAudioPlayerSingleton() {
  if (!globalPlayerInstance) {
    globalPlayerInstance = useGlobalAudioPlayer()
  }
  return globalPlayerInstance
}
