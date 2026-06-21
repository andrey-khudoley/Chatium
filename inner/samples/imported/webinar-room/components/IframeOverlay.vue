<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="show" class="iframe-overlay" @click.self="$emit('close')">
        <div class="iframe-overlay-container">
          <button class="iframe-overlay-close" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </button>
          <iframe :src="url" class="iframe-overlay-frame" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  url: { type: String, default: '' }
})

defineEmits(['close'])
</script>

<style scoped>
.iframe-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.iframe-overlay-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  height: 85vh;
  max-height: 85vh;
  border-radius: 16px;
  overflow: hidden;
  background: var(--wr-bg-card, #1a1a2e);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.iframe-overlay-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  border: none;
}

.iframe-overlay-close:hover {
  background: rgba(0, 0, 0, 0.8);
}

.iframe-overlay-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
