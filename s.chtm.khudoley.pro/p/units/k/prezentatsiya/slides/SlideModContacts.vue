<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="content">
      <h2 class="title">
        <span class="module-name">Контакты</span>
        <span class="module-subtitle">Единая база клиентов</span>
      </h2>

      <div class="features">
        <div
          v-for="(f, i) in features"
          :key="f.text"
          class="feature"
          :style="{ transitionDelay: i * 0.08 + 's' }"
        >
          <i :class="f.icon"></i>
          <span>{{ f.text }}</span>
        </div>
      </div>

      <button class="demo-btn show" @click="openDemo">
        <span class="demo-btn-glow"></span>
        <i class="fas fa-play"></i>
        <span>Демо</span>
        <i class="fas fa-external-link-alt demo-btn-arrow"></i>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="demo-overlay">
        <div v-if="showDemo" class="demo-overlay" @click.self="closeDemo">
          <div class="demo-container">
            <div class="demo-header">
              <div class="demo-title">
                <i class="fas fa-address-book"></i>
                <span>@contacts — Живое демо</span>
              </div>
              <button class="demo-close" @click="closeDemo">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="demo-iframe-wrap">
              <iframe
                v-if="showDemo"
                :src="demoUrl"
                class="demo-iframe"
                allow="fullscreen"
                @load="onIframeLoad"
              ></iframe>
              <div v-if="!demoLoaded" class="demo-loading">
                <div class="demo-spinner"></div>
                <span>Загрузка демо...</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ active: Boolean })
const showDemo = ref(false)
const demoLoaded = ref(false)
const demoUrl =
  'https://chatium.ru/app/crm/v2/~/customer/QaS7JkkfGCz6a0pzvqH0000ru?search=%D0%93%D0%B0%D0%BB%D1%87%D0%B5%D0%BD%D0%BA%D0%BE%D0%B2'

function openDemo() {
  demoLoaded.value = false
  showDemo.value = true
}

function onIframeLoad() {
  demoLoaded.value = true
}

function closeDemo() {
  showDemo.value = false
}

const features = [
  { icon: 'fas fa-layer-group', text: 'Сбор из всех каналов' },
  { icon: 'fas fa-object-ungroup', text: 'Объединение дублей' },
  { icon: 'fas fa-tags', text: 'Теги и сегментация' },
  { icon: 'fas fa-filter', text: 'Умная фильтрация' },
  { icon: 'fas fa-link', text: 'Связанные записи' },
  { icon: 'fas fa-robot', text: 'Автосбор из форм' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 24px 24px;
  background: var(--bg-deep);
  overflow-y: auto;
  overflow-x: hidden;
}
.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.12;
  animation: float 18s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #06b6d4;
  top: -20%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #8b5cf6;
  bottom: -15%;
  left: -5%;
  animation-delay: -6s;
}
.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
}

.content {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.anim {
  opacity: 0;
  transform: translateY(24px);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.anim.show {
  opacity: 1;
  transform: translateY(0);
}

.module-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.badge-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(6, 182, 212, 0.12);
  color: #06b6d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.badge-group {
  display: block;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: #06b6d4;
  letter-spacing: 2px;
}
.badge-num {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.title {
  margin-bottom: 32px;
}
.module-name {
  display: block;
  font-family: var(--font-mono);
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 900;
  color: var(--text-primary);
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.module-subtitle {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 8px;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 36px;
  justify-content: center;
}
.feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}
.feature:hover {
  border-color: #06b6d4;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.15);
}
.feature i {
  color: #06b6d4;
  font-size: 16px;
}

/* Demo button */
.demo-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 36px;
  margin-top: 28px;
  border: 1px solid rgba(6, 182, 212, 0.4);
  border-radius: 14px;
  background: rgba(6, 182, 212, 0.08);
  color: #06b6d4;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.demo-btn:hover {
  border-color: #06b6d4;
  background: rgba(6, 182, 212, 0.15);
  transform: translateY(-2px);
  box-shadow:
    0 8px 30px rgba(6, 182, 212, 0.25),
    0 0 60px rgba(6, 182, 212, 0.1);
}
.demo-btn:hover .demo-btn-glow {
  opacity: 1;
}
.demo-btn:hover .demo-btn-arrow {
  transform: translate(2px, -2px);
}
.demo-btn-glow {
  position: absolute;
  inset: -2px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.3));
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.4s ease;
  z-index: -1;
}
.demo-btn i:first-of-type {
  font-size: 13px;
}
.demo-btn-arrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.3s ease;
}

/* Demo overlay */
.demo-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.demo-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border: none;
  background: var(--bg-deep);
  overflow: hidden;
}
.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(6, 182, 212, 0.05);
  border-bottom: 1px solid rgba(6, 182, 212, 0.12);
  flex-shrink: 0;
}
.demo-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: #06b6d4;
}
.demo-title i {
  opacity: 0.7;
}
.demo-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}
.demo-close:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  transform: rotate(90deg);
}
.demo-iframe-wrap {
  flex: 1;
  position: relative;
}
.demo-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
.demo-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-muted);
  pointer-events: none;
}
.demo-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(6, 182, 212, 0.15);
  border-top-color: #06b6d4;
  animation: spin-demo 0.8s linear infinite;
}
@keyframes spin-demo {
  to {
    transform: rotate(360deg);
  }
}

/* Overlay transitions */
.demo-overlay-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.demo-overlay-leave-active {
  transition: all 0.3s ease;
}
.demo-overlay-enter-from {
  opacity: 0;
}
.demo-overlay-enter-from .demo-container {
  transform: scale(0.9) translateY(30px);
  opacity: 0;
}
.demo-overlay-leave-to {
  opacity: 0;
}
.demo-overlay-leave-to .demo-container {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.demo-overlay-enter-active .demo-container {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.demo-overlay-leave-active .demo-container {
  transition: all 0.3s ease;
}

@media (max-width: 640px) {
  .slide {
    padding: 24px 16px 16px;
    align-items: center;
  }
  .features {
    gap: 6px;
  }
  .feature {
    padding: 8px 12px;
    font-size: 12px;
  }
  .demo-overlay {
    padding: 0;
  }
  .demo-container {
    height: 100%;
    border-radius: 0;
  }
  .demo-header {
    padding: 12px 16px;
  }
  .demo-btn {
    padding: 12px 22px;
    font-size: 14px;
  }
  .module-name {
    font-size: 40px;
  }
  .module-subtitle {
    font-size: 16px;
  }
  .title {
    margin-bottom: 20px;
  }
}
</style>
