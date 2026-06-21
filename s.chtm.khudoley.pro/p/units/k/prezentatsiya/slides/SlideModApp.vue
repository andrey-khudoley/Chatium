<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">APP</h2>
        <p class="subtitle">Ваш бизнес — в <span class="accent">каждом кармане</span></p>
      </div>

      <div class="platforms">
        <div
          class="platform-card"
          v-for="(p, i) in platforms"
          :key="i"
          :style="{ '--card-color': p.color, '--card-glow': p.glow }"
        >
          <div class="card-icon">
            <i :class="p.icon"></i>
          </div>
          <div class="card-name">{{ p.name }}</div>
          <div class="card-desc">{{ p.desc }}</div>
        </div>
      </div>

      <div class="bottom-line">
        <div class="line-icon"><i class="fas fa-rocket"></i></div>
        <span>Одно приложение — <span class="accent-text">все платформы сразу</span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const platforms = [
  {
    icon: 'fab fa-telegram',
    name: 'Telegram',
    desc: 'MiniApp',
    badge: 'TWA / WebApp',
    color: '#2AABEE',
    glow: 'rgba(42, 171, 238, 0.15)'
  },
  {
    icon: 'fab fa-vk',
    name: 'ВКонтакте',
    desc: 'MiniApp',
    badge: 'VK Mini Apps',
    color: '#0077FF',
    glow: 'rgba(0, 119, 255, 0.15)'
  },
  {
    icon: 'fab fa-apple',
    name: 'App Store',
    desc: 'iOS',
    badge: 'PWA & Native',
    color: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.08)'
  },
  {
    icon: 'fab fa-google-play',
    name: 'Google Play',
    desc: 'Android',
    badge: 'TWA & PWA',
    color: '#34A853',
    glow: 'rgba(52, 168, 83, 0.15)'
  }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 24px;
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
  filter: blur(160px);
  opacity: 0.1;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #2aabee;
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #0077ff;
  bottom: -15%;
  right: -5%;
  animation-delay: -6s;
}
.orb-3 {
  width: 350px;
  height: 350px;
  background: #34a853;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -12s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-30px);
  }
}

.content {
  max-width: 960px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 44px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(56px, 8vw, 100px);
  font-weight: 900;
  background: linear-gradient(135deg, #2aabee, #0077ff, #34a853);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1;
  letter-spacing: -2px;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 32px);
  color: var(--text-secondary);
  margin: 14px 0 0;
  font-weight: 500;
}

.accent {
  background: linear-gradient(135deg, #2aabee, #34a853);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Platform cards */
.platforms {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
}

.platform-card {
  position: relative;
  padding: 28px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.platform-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: radial-gradient(ellipse at 50% 0%, var(--card-glow), transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.platform-card:hover {
  border-color: var(--card-color);
  transform: translateY(-8px);
  box-shadow: 0 20px 60px var(--card-glow);
}

.platform-card:hover::before {
  opacity: 1;
}

.card-icon {
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: var(--card-glow);
  border: 1px solid color-mix(in srgb, var(--card-color) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: var(--card-color);
  transition: all 0.4s ease;
}

.platform-card:hover .card-icon {
  transform: scale(1.1);
  box-shadow: 0 0 30px var(--card-glow);
}

.card-name {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.card-desc {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: clamp(14px, 1.6vw, 18px);
  font-weight: 500;
  color: var(--card-color);
  opacity: 0.8;
}

.card-badge {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--card-color);
  animation: pulse-badge 2s ease infinite;
}

@keyframes pulse-badge {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* Bottom */
.bottom-line {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 32px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-display);
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 500;
  color: var(--text-secondary);
}

.line-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(42, 171, 238, 0.12), rgba(52, 168, 83, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.line-icon i {
  font-size: 18px;
  background: linear-gradient(135deg, #2aabee, #34a853);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.accent-text {
  background: linear-gradient(135deg, #2aabee, #34a853);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

@media (max-width: 768px) {
  .slide {
    padding: 30px 16px 16px;
  }
  .content {
    gap: 32px;
  }
  .platforms {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .platform-card {
    padding: 20px 16px;
    gap: 10px;
  }
  .card-icon {
    width: 56px;
    height: 56px;
    font-size: 26px;
    border-radius: 16px;
  }
  .bottom-line {
    padding: 12px 20px;
  }
  .line-icon {
    width: 34px;
    height: 34px;
  }
}
</style>
