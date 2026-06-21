<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Мультиязычность</h2>
        <p class="subtitle">Один продукт — <span class="accent">весь мир</span></p>
      </div>

      <div class="lang-switch">
        <div class="switch-row">
          <div class="lang-block lang-from">
            <div class="lang-flag">🇷🇺</div>
            <div class="lang-lines">
              <div class="line-item">Добро пожаловать</div>
              <div class="line-item dim">Оплатить заказ</div>
              <div class="line-item dim">Мой профиль</div>
            </div>
          </div>

          <div class="switch-arrow">
            <div class="arrow-circle">
              <i class="fas fa-right-left"></i>
            </div>
            <div class="arrow-label">auto</div>
          </div>

          <div class="lang-block lang-to">
            <div class="lang-flag">🇬🇧</div>
            <div class="lang-lines">
              <div class="line-item">Welcome</div>
              <div class="line-item dim">Pay for order</div>
              <div class="line-item dim">My profile</div>
            </div>
          </div>
        </div>

        <div class="lang-hint">
          Компьютер на английском → интерфейс <span class="accent-text">автоматически</span> на
          английском
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
  filter: blur(140px);
  opacity: 0.12;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 450px;
  height: 450px;
  background: #06b6d4;
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 350px;
  height: 350px;
  background: #0891b2;
  bottom: -15%;
  right: -5%;
  animation-delay: -6s;
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
  max-width: 800px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 84px);
  font-weight: 900;
  background: linear-gradient(135deg, #06b6d4, #22d3ee, #67e8f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 32px);
  color: var(--text-secondary);
  margin: 14px 0 0;
  font-weight: 500;
}

.accent {
  background: linear-gradient(135deg, #06b6d4, #67e8f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Lang switch */
.lang-switch {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.lang-block {
  flex: 1;
  padding: 28px 24px;
  border-radius: 20px;
  border: 1px solid rgba(6, 182, 212, 0.12);
  background: rgba(6, 182, 212, 0.03);
}

.lang-flag {
  font-size: 42px;
  margin-bottom: 16px;
}

.lang-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.line-item {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.2;
}

.line-item.dim {
  font-size: clamp(16px, 2vw, 22px);
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
}

.switch-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.arrow-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(6, 182, 212, 0.12);
  border: 2px solid rgba(6, 182, 212, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22d3ee;
  font-size: 22px;
}

.arrow-label {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 12px;
  color: rgba(6, 182, 212, 0.5);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.lang-hint {
  text-align: center;
  font-size: clamp(15px, 2vw, 20px);
  color: var(--text-secondary);
  line-height: 1.5;
}

.accent-text {
  color: #22d3ee;
  font-weight: 700;
}

@media (max-width: 768px) {
  .slide {
    padding: 20px 16px 12px;
    align-items: center;
  }
  .content {
    gap: 16px;
  }
  .title {
    font-size: clamp(32px, 8vw, 48px);
  }
  .subtitle {
    font-size: 16px;
    margin-top: 6px;
  }
  .switch-row {
    flex-direction: column;
    gap: 8px;
  }
  .switch-arrow {
    flex-direction: row;
  }
  .arrow-circle {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  .arrow-circle i {
    transform: rotate(90deg);
  }
  .lang-block {
    padding: 14px 12px;
    border-radius: 14px;
  }
  .lang-flag {
    font-size: 24px;
    margin-bottom: 8px;
  }
  .line-item {
    font-size: 16px;
  }
  .line-item.dim {
    font-size: 13px;
  }
  .lang-hint {
    font-size: 13px;
  }
  .lang-switch {
    gap: 12px;
  }
}
</style>
