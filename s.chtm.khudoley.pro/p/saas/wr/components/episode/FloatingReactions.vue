<template>
  <div class="floating-reactions-container">
    <!-- Floating emojis -->
    <div class="floating-emojis-area" v-show="!collapsed">
      <transition-group name="float">
        <div
          v-for="r in floatingReactions"
          :key="r.id"
          class="floating-emoji"
          :style="{ left: r.x + '%', animationDuration: r.duration + 's' }"
        >
          {{ r.emoji }}
        </div>
      </transition-group>
    </div>

    <!-- Reaction buttons (desktop only) -->
    <transition name="reactions-slide">
      <div v-show="!collapsed" class="reaction-buttons">
        <button
          v-for="emoji in emojis"
          :key="emoji"
          class="reaction-btn"
          @click="sendReaction(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </transition>

    <!-- Collapse/expand toggle (desktop only) -->
    <button
      class="reactions-toggle"
      :class="{ 'reactions-toggle--collapsed': collapsed }"
      @click.stop="collapsed = !collapsed"
      :title="collapsed ? 'Показать реакции' : 'Скрыть реакции'"
    >
      <span v-if="collapsed" class="reactions-toggle-emoji">❤️</span>
      <i v-else class="fas fa-chevron-right"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { apiReactionSendRoute } from '../../api/reactions'

const props = defineProps({
  episodeId: { type: String, required: true }
})

const emojis = ['❤️', '🔥', '😂']
const floatingReactions = ref([])
const collapsed = ref(false)
let idCounter = 0

function spawnEmoji(emoji) {
  const id = ++idCounter
  const x = 10 + Math.random() * 80
  const duration = 2 + Math.random() * 1.5

  floatingReactions.value.push({ id, emoji, x, duration })

  setTimeout(() => {
    floatingReactions.value = floatingReactions.value.filter((r) => r.id !== id)
  }, duration * 1000)
}

async function sendReaction(emoji) {
  spawnEmoji(emoji)

  try {
    await apiReactionSendRoute.run(ctx, {
      episodeId: props.episodeId,
      emoji
    })
  } catch (e) {}
}

function handleSocketReaction(emoji) {
  spawnEmoji(emoji)
}

defineExpose({ handleSocketReaction, sendReaction, emojis })
</script>

<style scoped>
.floating-reactions-container {
  position: fixed;
  bottom: 0;
  right: 60px;
  z-index: 30;
  pointer-events: none;
}

.floating-emojis-area {
  position: fixed;
  bottom: 80px;
  right: 60px;
  width: 250px;
  height: 50vh;
  overflow: visible;
  pointer-events: none;
}

.floating-emoji {
  position: absolute;
  bottom: 0;
  font-size: 3.5rem;
  animation: floatUp ease-out forwards;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

@keyframes floatUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-45vh) scale(0.5);
    opacity: 0;
  }
}

.reaction-buttons {
  position: fixed;
  bottom: 16px;
  right: 30px;
  display: flex;
  gap: 6px;
  pointer-events: auto;
}

.reaction-btn {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: var(--wr-reaction-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--wr-reaction-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

.reaction-btn:hover {
  background: var(--wr-reaction-hover);
  transform: scale(1.15);
}

.reaction-btn:active {
  transform: scale(0.9);
}

/* Slide animation for reaction buttons */
.reactions-slide-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.reactions-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.reactions-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.reactions-slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Toggle button (desktop/tablet only) */
.reactions-toggle {
  display: none;
}

@media (min-width: 1024px) {
  .reactions-toggle {
    display: flex;
    position: fixed;
    bottom: 32px;
    right: 30px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--wr-reaction-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--wr-reaction-border);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: auto;
    z-index: 31;
    transition: all 0.2s ease;
    color: var(--wr-text-tertiary);
    font-size: 13px;
  }

  .reactions-toggle:hover {
    background: var(--wr-reaction-hover);
    color: var(--wr-text-primary);
    transform: scale(1.1);
  }

  .reactions-toggle--collapsed {
    bottom: 16px;
    width: 32px;
    height: 32px;
    font-size: 18px;
  }

  .reactions-toggle-emoji {
    font-size: inherit;
    line-height: 1;
  }

  /* When expanded — position toggle next to the reaction row */
  .reactions-toggle:not(.reactions-toggle--collapsed) {
    right: calc(30px + 3 * 66px + 3 * 6px + 8px);
    bottom: 29px;
  }
}

@media (max-width: 1023px) {
  .reaction-buttons {
    display: none;
  }

  .floating-reactions-container {
    z-index: 50;
  }

  .floating-emojis-area {
    width: 100vw;
    right: 0;
    bottom: 110px;
    z-index: 50;
  }

  .floating-emoji {
    font-size: 2rem;
  }
}
</style>
