<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">От кабеля к HTTPS</h1>
        <span class="strip"></span>
      </header>

      <div class="chain">
        <template v-for="(step, i) in steps" :key="step.title">
          <div
            class="step"
            :class="{ accent: step.accent }"
            :style="{ animationDelay: 0.05 + i * 0.07 + 's' }"
          >
            <div class="ico">
              <i :class="step.icon"></i>
            </div>
            <div class="step-title">{{ step.title }}</div>
            <div class="step-caption">{{ step.caption }}</div>
          </div>
          <div v-if="i < steps.length - 1" class="arrow"><i class="fas fa-chevron-right"></i></div>
        </template>
      </div>

      <p class="anchor">
        Номера слоёв — ориентир; запоминать не надо. Важно: интеграции вы видите как
        <code>HTTPS</code>.
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const steps = [
  { icon: 'fas fa-circle-nodes', title: 'Два компьютера', caption: 'кабель напрямую' },
  { icon: 'fas fa-network-wired', title: 'Коммутатор', caption: 'локалка → L2' },
  { icon: 'fas fa-route', title: 'Маршрутизаторы', caption: 'сети стыкуются → L3' },
  { icon: 'fas fa-shield-halved', title: 'Надёжность', caption: 'дошло / не дошло → L4' },
  { icon: 'fas fa-clock', title: 'Сеанс', caption: 'долгий обмен → L5' },
  { icon: 'fas fa-compress', title: 'Сжатие', caption: 'единый формат → L6' },
  { icon: 'fas fa-lock', title: 'HTTPS', caption: 'про него эфир', accent: true }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-bg);
  padding: 56px 64px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1700px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 56px);
  color: var(--text-primary);
  letter-spacing: -1px;
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 20px;
}

.chain {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
  gap: 12px;
}

.step {
  flex: 1;
  min-width: 130px;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  opacity: 0;
  animation: fadeInUp 460ms ease-out forwards;
  transition: transform 0.25s ease;
}
.step:hover {
  transform: translateY(-4px);
}
.step.accent {
  background: var(--bg-elevated);
  border: 2px solid var(--border-accent);
  box-shadow: 0 0 24px rgba(0, 217, 255, 0.15);
}

.ico {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: rgba(0, 217, 255, 0.05);
  margin-bottom: 12px;
}
.ico i {
  font-size: 18px;
  color: var(--accent-cyan);
}
.step.accent .ico {
  background: rgba(0, 217, 255, 0.15);
  border-color: var(--border-accent);
}

.step-title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(13px, 1.1vw, 20px);
  color: var(--text-primary);
  margin-bottom: 6px;
}
.step.accent .step-title {
  color: var(--accent-cyan);
}

.step-caption {
  font-family: var(--font-body-new);
  font-size: clamp(11px, 0.9vw, 16px);
  color: var(--text-secondary);
  line-height: 1.35;
}

.arrow {
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
  font-size: 16px;
}

.anchor {
  text-align: center;
  font-family: var(--font-body-new);
  font-weight: 600;
  font-size: clamp(15px, 1.4vw, 24px);
  color: var(--text-secondary);
}
.anchor code {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--accent-cyan);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 217, 255, 0.08);
  margin: 0 4px;
}

@media (max-width: 1024px) {
  .slide {
    padding: 40px 24px;
  }
  .chain {
    gap: 8px;
  }
  .arrow {
    display: none;
  }
  .step {
    min-width: 110px;
  }
}

@media (max-width: 768px) {
  .step {
    min-width: 45%;
  }
}
</style>
