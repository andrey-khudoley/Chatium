<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="content">
      <span class="badge">ПЛАТФОРМА</span>

      <h2 class="title">
        Chatium — <span class="gradient-text">мозг</span> и
        <span class="gradient-text-2">тело</span>
      </h2>

      <p class="subtitle">Среда, в которой ИИ не просто генерирует — а действует</p>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-clock-rotate-left"></i></div>
          <div class="stat-value">8 лет</div>
          <div class="stat-label">разработки</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-icon"><i class="fas fa-coins"></i></div>
          <div class="stat-value">200 млн ₽</div>
          <div class="stat-label">вложено в инфраструктуру</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-cubes"></i></div>
          <div class="stat-value">16+</div>
          <div class="stat-label">готовых модулей</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })
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
  opacity: 0.15;
  animation: float 15s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #6366f1;
  top: -15%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #06b6d4;
  bottom: -10%;
  right: -5%;
  animation-delay: -5s;
}
.orb-3 {
  width: 300px;
  height: 300px;
  background: #8b5cf6;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
}
.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

.content {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-indigo);
  padding: 5px 14px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
  letter-spacing: 2px;
  background: rgba(99, 102, 241, 0.08);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(30px, 5vw, 52px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.gradient-text {
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gradient-text-2 {
  background: linear-gradient(135deg, #06b6d4, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 40px;
  line-height: 1.5;
}

.stats-row {
  display: flex;
  gap: 20px;
  margin-bottom: 36px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 36px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 180px;
  transition: all 0.3s ease;
}
.stat-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.15);
}
.stat-card.accent {
  background: rgba(99, 102, 241, 0.06);
  border-color: rgba(99, 102, 241, 0.15);
}

.stat-icon {
  font-size: 24px;
  color: var(--accent-indigo);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(99, 102, 241, 0.1);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.3;
}

@media (max-width: 768px) {
  .slide {
    align-items: center;
    padding: 24px 16px 16px;
  }
  .badge {
    margin-bottom: 12px;
    font-size: 10px;
    padding: 4px 10px;
  }
  .title {
    font-size: 26px;
    margin-bottom: 8px;
  }
  .subtitle {
    font-size: 15px;
    margin-bottom: 20px;
  }
  .stats-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 16px;
  }
  .stat-card {
    min-width: unset;
    padding: 14px 20px;
    flex-direction: row;
    gap: 12px;
    border-radius: 14px;
  }
  .stat-icon {
    width: 38px;
    height: 38px;
    font-size: 18px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .stat-value {
    font-size: 22px;
  }
  .stat-label {
    font-size: 13px;
  }
  .bottom-line {
    font-size: 14px;
    flex-direction: column;
    text-align: center;
  }
}
</style>
