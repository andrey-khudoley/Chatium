<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Как получить доступ</h1>
        <span class="strip"></span>
        <p class="subtitle">Откроем по мере готовности методов в ближайшие недели</p>
      </header>

      <div class="layout">
        <ol class="steps">
          <li
            v-for="(s, i) in steps"
            :key="s.title"
            class="step"
            :style="{ animationDelay: 0.05 + i * 0.1 + 's' }"
          >
            <span class="badge">{{ s.num }}</span>
            <div class="text">
              <div class="s-title">{{ s.title }}</div>
              <div v-if="s.caption" class="s-caption">{{ s.caption }}</div>
            </div>
          </li>
        </ol>

        <aside class="qr-box">
          <div class="qr">
            <div class="qr-inner">
              <span class="qr-label">QR</span>
              <span
                class="qr-pattern"
                v-for="n in 49"
                :key="n"
                :class="{ on: pattern[n - 1] }"
              ></span>
            </div>
          </div>
          <div class="qr-link">форма доступа · ссылка появится в чате</div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const steps = [
  { num: '01', title: 'Оставьте контакт', caption: '' },
  { num: '02', title: 'Опишите кейс', caption: 'какую интеграцию хотите собрать' },
  { num: '03', title: 'Получите доступ', caption: 'по мере готовности нужных вам методов' }
]

const pattern = [
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  true,
  false,
  false,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true
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
  padding: 56px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 56px);
  color: var(--text-primary);
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin: 16px 0;
}
.subtitle {
  font-family: var(--font-body-new);
  font-size: clamp(15px, 1.5vw, 26px);
  color: var(--text-secondary);
}

.layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 64px;
  align-items: center;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.step {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
}
.step:last-child {
  border-bottom: none;
}
.badge {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--accent-cyan);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: clamp(14px, 1.2vw, 22px);
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.05);
}
.s-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.9vw, 32px);
  color: var(--text-primary);
}
.s-caption {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  margin-top: 6px;
}

.qr-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.qr {
  width: 240px;
  height: 240px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
}
.qr-inner {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 4px;
  width: 100%;
  height: 100%;
}
.qr-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 36px;
  color: rgba(0, 217, 255, 0.15);
  pointer-events: none;
  z-index: 1;
}
.qr-pattern {
  background: transparent;
  border-radius: 2px;
}
.qr-pattern.on {
  background: var(--text-primary);
}
.qr-link {
  font-family: var(--font-mono);
  font-size: clamp(11px, 1vw, 16px);
  color: var(--accent-cyan);
  text-align: center;
  text-decoration: underline;
  text-underline-offset: 4px;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .qr-box {
    order: -1;
  }
  .qr {
    width: 180px;
    height: 180px;
  }
}
</style>
