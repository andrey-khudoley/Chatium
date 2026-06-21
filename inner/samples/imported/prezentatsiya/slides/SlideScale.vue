<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb1"></div>
      <div class="glow-orb orb2"></div>
      <div class="glow-orb orb3"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="container">
      <div class="hero-number">
        <span class="number-prefix">+</span>
        <span class="number-value">1 000</span>
      </div>

      <h2 class="title">
        сотрудников.<br />
        <span class="gradient-text">Ноль собеседований.</span>
      </h2>

      <p class="subtitle">
        Chatium — это команда AI-агентов, живущая<br class="hide-mobile" />
        в готовой инфраструктуре. Ваш виртуальный офис.
      </p>

      <div class="props">
        <div class="prop">
          <div class="prop-icon">
            <i class="fas fa-brain"></i>
          </div>
          <div class="prop-text">
            <div class="prop-title">Автономные</div>
            <div class="prop-desc">Думают, решают и действуют сами</div>
          </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop">
          <div class="prop-icon icon-scale">
            <i class="fas fa-arrows-up-down-left-right"></i>
          </div>
          <div class="prop-text">
            <div class="prop-title">Масштаб за секунды</div>
            <div class="prop-desc">Нужно 10 — будет 10. Нужно 1 000 — будет 1 000</div>
          </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop">
          <div class="prop-icon icon-clock">
            <i class="fas fa-clock"></i>
          </div>
          <div class="prop-text">
            <div class="prop-title">24 / 7 / 365</div>
            <div class="prop-desc">Не устают, не болеют, не увольняются</div>
          </div>
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
  overflow-y: auto;
  padding: 60px 24px 24px;
  background: var(--bg-deep);
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
  filter: blur(140px);
  animation: float 16s ease-in-out infinite;
}

.orb1 {
  width: 500px;
  height: 500px;
  background: #10b981;
  opacity: 0.15;
  top: -15%;
  left: 10%;
}

.orb2 {
  width: 400px;
  height: 400px;
  background: #6366f1;
  opacity: 0.12;
  bottom: 5%;
  right: -5%;
  animation-delay: -6s;
}

.orb3 {
  width: 300px;
  height: 300px;
  background: #06b6d4;
  opacity: 0.1;
  top: 60%;
  left: 50%;
  animation-delay: -10s;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-25px) scale(1.04);
  }
}

.container {
  position: relative;
  max-width: 900px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-number {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.number-prefix {
  font-family: var(--font-display);
  font-size: clamp(48px, 10vw, 100px);
  font-weight: 800;
  color: rgba(16, 185, 129, 0.4);
  line-height: 1;
}

.number-value {
  font-family: var(--font-display);
  font-size: clamp(64px, 14vw, 140px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
  letter-spacing: -2px;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 52px);
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: clamp(15px, 2vw, 20px);
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 48px;
  max-width: 600px;
}

.props {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  max-width: 820px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  padding: 28px 8px;
}

.prop {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
}

.prop-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  flex-shrink: 0;
}

.prop-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  font-size: 22px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
  transition: all 0.3s ease;
}

.prop:hover .prop-icon {
  transform: scale(1.1) translateY(-4px);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.2);
}

.icon-scale {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.25);
  color: #818cf8;
}

.prop:hover .icon-scale {
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.2);
}

.icon-clock {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.25);
  color: #22d3ee;
}

.prop:hover .icon-clock {
  box-shadow: 0 12px 32px rgba(6, 182, 212, 0.2);
}

.prop-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.prop-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}

.prop-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 768px) {
  .props {
    flex-direction: column;
    gap: 20px;
    padding: 24px 20px;
  }

  .prop {
    flex-direction: row;
    text-align: left;
    padding: 0;
  }

  .prop-text {
    align-items: flex-start;
  }

  .prop-desc {
    text-align: left;
  }

  .prop-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
  }

  .prop-icon {
    width: 48px;
    height: 48px;
    font-size: 18px;
    flex-shrink: 0;
  }

  .subtitle {
    margin-bottom: 32px;
  }

  .hide-mobile {
    display: none;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 24px 16px 16px;
  }
  .hero-number {
    margin-bottom: 4px;
  }
  .number-prefix {
    font-size: 36px;
  }
  .number-value {
    font-size: 52px;
  }
  .title {
    font-size: 24px;
    margin-bottom: 12px;
  }
  .subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }
  .props {
    padding: 18px 16px;
    border-radius: 18px;
    gap: 16px;
  }
  .prop-title {
    font-size: 16px;
  }
  .prop-desc {
    font-size: 12px;
  }
  .prop-icon {
    width: 42px;
    height: 42px;
    font-size: 16px;
    border-radius: 14px;
  }
}
</style>
