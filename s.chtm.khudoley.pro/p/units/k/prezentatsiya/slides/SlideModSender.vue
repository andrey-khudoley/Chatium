<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="content">
      <h2 class="title">
        <span class="module-name">Рассылки</span>
        <span class="module-subtitle">Чат-боты + агенты во всех каналах</span>
      </h2>

      <div class="channels">
        <div
          v-for="(c, i) in channels"
          :key="c.name"
          class="channel"
          :style="{ '--ch-color': c.color, transitionDelay: i * 0.06 + 's' }"
        >
          <i :class="c.icon"></i>
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const channels = [
  { name: 'Telegram', icon: 'fab fa-telegram', color: '#2AABEE' },
  { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
  { name: 'Email', icon: 'fas fa-envelope', color: '#EA4335' },
  { name: 'VK', icon: 'fab fa-vk', color: '#4C75A3' },
  { name: 'SMS', icon: 'fas fa-sms', color: '#f59e0b' },
  { name: 'Авито', icon: 'fas fa-shopping-bag', color: '#00AAFF' },
  { name: 'MAX', icon: 'fas fa-comment-dots', color: '#8b5cf6' },
  { name: 'Wazzup24', icon: 'fas fa-comments', color: '#10b981' }
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
  background: #8b5cf6;
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #06b6d4;
  bottom: -15%;
  right: -5%;
  animation-delay: -6s;
}
.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
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

.title {
  margin-bottom: 32px;
}
.module-name {
  display: block;
  font-family: var(--font-mono);
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
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

.channels {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
}
.channel {
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
.channel:hover {
  border-color: var(--ch-color);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ch-color) 20%, transparent);
}
.channel i {
  color: var(--ch-color);
  font-size: 18px;
}

@media (max-width: 640px) {
  .slide {
    padding: 24px 16px 16px;
    align-items: center;
  }
  .channels {
    gap: 8px;
  }
  .channel {
    padding: 10px 16px;
    font-size: 13px;
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
