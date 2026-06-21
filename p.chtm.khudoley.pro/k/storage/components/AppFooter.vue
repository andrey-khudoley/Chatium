<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="footer-left">ИП Худолей Андрей Германович</div>
      <div class="footer-center">Все права сохранены © 2018-{{ currentYear }}</div>
      <div class="footer-right">
        <button class="footer-link" @click="onChatiumClick">
          Сделано с <i class="fas fa-heart footer-heart"></i> на Chatium
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('AppFooter')
const currentYear = new Date().getFullYear()
const emit = defineEmits<{ 'chatium-click': [] }>()

function onChatiumClick() {
  log.notice('Chatium link clicked')
  emit('chatium-click')
}

onMounted(() => {
  log.info('Component mounted')
})
</script>

<style scoped>
.app-footer {
  background: transparent;
  padding: 1.5rem 0;
  flex-shrink: 0;
  position: relative;
  z-index: 200;
}

.app-footer::before {
  content: '';
  position: absolute;
  bottom: 10px; left: 10px;
  width: 20px; height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.app-footer::after {
  content: '';
  position: absolute;
  bottom: 10px; right: 10px;
  width: 20px; height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.footer-content {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  position: relative;
}

.footer-left:hover, .footer-center:hover {
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-footer {
  0%, 100% { transform: translate(0); text-shadow: none; }
  10% { transform: translate(-1.5px, 0); text-shadow: 1px 0 #ff00ff, -1px 0 #00ffff; }
  20% { transform: translate(1.5px, 0); text-shadow: -1px 0 #ff00ff, 1px 0 #00ffff; }
  30% { transform: translate(-1px, 0); text-shadow: 1.5px 0 #ff00ff, -1.5px 0 #00ffff; }
  40% { transform: translate(1px, 0); text-shadow: -1.5px 0 #ff00ff, 1.5px 0 #00ffff; }
  50% { transform: translate(-1.5px, 0); text-shadow: 1px 0 #ff00ff, -1px 0 #00ffff; }
  60% { transform: translate(1.5px, 0); text-shadow: -1px 0 #ff00ff, 1px 0 #00ffff; }
  70% { transform: translate(-1px, 0); text-shadow: 1px 0 #ff00ff, -1px 0 #00ffff; }
  80% { transform: translate(1px, 0); text-shadow: -1.5px 0 #ff00ff, 1.5px 0 #00ffff; }
  90% { transform: translate(-0.5px, 0); text-shadow: 0.5px 0 #ff00ff, -0.5px 0 #00ffff; }
}

.footer-left { flex: 1; text-align: left; color: var(--color-text-secondary); }
.footer-center { flex: 0 0 auto; text-align: center; color: var(--color-text-secondary); }
.footer-right { flex: 1; text-align: right; }

.footer-link {
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.25s ease;
  user-select: none;
  position: relative;
  z-index: 10;
}

.footer-link:hover {
  color: var(--color-text);
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.footer-heart {
  color: #dd3057;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .footer-content { flex-direction: column; gap: 0.5rem; font-size: 0.8125rem; }
  .footer-left, .footer-center, .footer-right { text-align: center; flex: none; }
}

@media (max-width: 480px) {
  .footer-content { font-size: 0.75rem; }
}

@media (min-width: 1201px) {
  .app-footer { padding: 1rem 0; }
}
</style>
