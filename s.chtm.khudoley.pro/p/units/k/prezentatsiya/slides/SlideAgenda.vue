<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">О чём поговорим</h1>
        <span class="strip"></span>
        <p class="subtitle">Час, без пауз, с вопросами по ходу</p>
      </header>

      <div class="layout">
        <ol class="list">
          <li
            v-for="(item, i) in items"
            :key="item.title"
            class="row"
            :style="{ animationDelay: 0.05 + i * 0.08 + 's' }"
          >
            <span class="badge">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="text">
              <div class="row-title">{{ item.title }}</div>
              <div class="row-caption">{{ item.caption }}</div>
            </div>
          </li>
        </ol>

        <aside class="timeline">
          <div class="time-cap top">00:00</div>
          <div class="line">
            <span
              v-for="(item, i) in items"
              :key="i"
              class="dot"
              :style="{ top: (i / (items.length - 1)) * 100 + '%' }"
            ></span>
          </div>
          <div class="time-cap mid">60 минут</div>
          <div class="time-cap bottom">01:00</div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const items = [
  { title: 'Что такое интеграция', caption: 'вайб-кодинг и его границы' },
  { title: 'Как устроен HTTPS', caption: 'четыре вещи в каждом запросе' },
  { title: 'Как читать API-спеку', caption: 'пять минут на проверку' },
  { title: 'Что я для вас собрал', caption: 'gateway + тонкий SDK' },
  { title: 'Демо', caption: 'несколько готовых методов' }
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
  padding: 64px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.head {
  display: flex;
  flex-direction: column;
}
.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(32px, 4.4vw, 64px);
  color: var(--text-primary);
  letter-spacing: -1px;
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin: 24px 0 16px;
}
.subtitle {
  font-family: var(--font-body-new);
  font-size: clamp(16px, 1.6vw, 26px);
  color: var(--text-secondary);
}

.layout {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 80px;
  align-items: start;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.row {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
}
.row:last-child {
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
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.04);
}
.text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(20px, 2.1vw, 34px);
  color: var(--text-primary);
}
.row-caption {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 20px);
  color: var(--text-secondary);
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-height: 400px;
}
.line {
  position: relative;
  width: 2px;
  flex: 1;
  background: rgba(0, 217, 255, 0.4);
  margin: 16px 0;
}
.dot {
  position: absolute;
  left: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent-cyan);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 12px rgba(0, 217, 255, 0.5);
}
.time-cap {
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  text-transform: uppercase;
}
.time-cap.mid {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
}

@media (max-width: 1024px) {
  .slide {
    padding: 48px 32px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .timeline {
    display: none;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 32px 16px;
  }
  .badge {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }
  .row {
    gap: 16px;
  }
}
</style>
