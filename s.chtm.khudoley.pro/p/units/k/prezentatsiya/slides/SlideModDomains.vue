<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Мультидоменность</h2>
        <p class="subtitle">Несколько доменов — <span class="accent">одна база</span></p>
      </div>

      <div class="schema">
        <div class="domains-col">
          <div class="domain-card" v-for="(d, i) in domains" :key="i">
            <div class="domain-dot" :style="{ background: d.color }"></div>
            <div class="domain-url">{{ d.url }}</div>
            <div class="domain-label">{{ d.label }}</div>
          </div>
        </div>

        <div class="arrow-col">
          <div class="connector-line"></div>
          <div class="connector-node">
            <i class="fas fa-link"></i>
          </div>
          <div class="connector-line"></div>
        </div>

        <div class="center-col">
          <div class="center-block">
            <div class="center-icon">
              <i class="fas fa-database"></i>
            </div>
            <div class="center-title">Один аккаунт</div>
            <div class="center-desc">Общие пользователи, данные, платежи</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const domains = [
  { url: 'shop.company.ru', label: 'Интернет-магазин', color: '#3b82f6' },
  { url: 'school.company.ru', label: 'Онлайн-курсы', color: '#10b981' },
  { url: 'blog.company.ru', label: 'Блог', color: '#f59e0b' }
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
  filter: blur(140px);
  opacity: 0.12;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #3b82f6;
  top: -15%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #2563eb;
  bottom: -15%;
  right: -5%;
  animation-delay: -7s;
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
  max-width: 860px;
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
  font-size: clamp(44px, 7vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #3b82f6, #60a5fa, #93c5fd);
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
  background: linear-gradient(135deg, #3b82f6, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Schema */
.schema {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.domains-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.domain-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.04);
  border: 1px solid rgba(59, 130, 246, 0.1);
  transition: all 0.3s ease;
}

.domain-card:hover {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.08);
  transform: translateX(4px);
}

.domain-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 12px currentColor;
}

.domain-url {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 600;
  color: #93c5fd;
  flex: 1;
}

.domain-label {
  font-size: clamp(12px, 1.5vw, 15px);
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

/* Arrow */
.arrow-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.connector-line {
  width: 2px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.connector-node {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.12);
  border: 2px solid rgba(59, 130, 246, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
  font-size: 18px;
}

/* Center */
.center-col {
  flex: 1;
  display: flex;
  justify-content: center;
}

.center-block {
  padding: 36px 28px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.12));
  border: 1px solid rgba(59, 130, 246, 0.2);
  text-align: center;
  width: 100%;
}

.center-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(59, 130, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.center-icon i {
  font-size: 28px;
  color: #60a5fa;
}

.center-title {
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 8px;
}

.center-desc {
  font-size: clamp(14px, 1.8vw, 18px);
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.5;
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
    font-size: clamp(28px, 6vw, 44px);
  }
  .subtitle {
    font-size: clamp(16px, 2.5vw, 22px);
    margin-top: 8px;
  }
  .schema {
    flex-direction: column;
    gap: 10px;
  }
  .arrow-col {
    flex-direction: row;
  }
  .connector-line {
    width: 30px;
    height: 2px;
    background: linear-gradient(to right, transparent, rgba(59, 130, 246, 0.3), transparent);
  }
  .connector-node {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  .domain-card {
    padding: 8px 12px;
    gap: 8px;
    border-radius: 10px;
  }
  .domain-url {
    font-size: 13px;
  }
  .domain-label {
    font-size: 11px;
  }
  .center-block {
    padding: 16px 14px;
    border-radius: 16px;
  }
  .center-icon {
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
    border-radius: 12px;
  }
  .center-icon i {
    font-size: 18px;
  }
  .center-title {
    font-size: 18px;
    margin-bottom: 4px;
  }
  .center-desc {
    font-size: 13px;
  }
}
</style>
