<template>
  <div class="container">
    <button class="button" @click="handleClick">
      <span class="button__emoji" aria-hidden="true">👋</span>
      <span class="button__label sr-only">Открыть чат</span>
    </button>
  </div>
</template>

<script setup>
const handleClick = () => {
  window.parent.postMessage({ type: 'chatiumSenderWidget:open' }, '*')
}
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.button {
  pointer-events: all;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  height: 60px;
  width: 60px;
  border-radius: 60px;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.8);
}

.button:active {
  transform: translateY(0);
}

.button__emoji {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: button-emoji-wave 3s ease-in-out infinite;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes button-emoji-wave {
  0% {
    transform: rotate(0deg) scale(1);
  }
  6% {
    transform: rotate(18deg) scale(1.1);
  }
  12% {
    transform: rotate(-10deg) scale(1.05);
  }
  18% {
    transform: rotate(14deg) scale(1.1);
  }
  22% {
    transform: rotate(0deg) scale(1);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}
</style>
