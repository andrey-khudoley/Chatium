<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Декабрь 2025 — что у них произошло</h1>
        <span class="strip"></span>
      </header>

      <div class="layout">
        <div class="timeline">
          <div class="line"></div>
          <div
            v-for="(ev, i) in events"
            :key="ev.label"
            class="event"
            :style="{ animationDelay: 0.05 + i * 0.1 + 's' }"
          >
            <span class="dot"></span>
            <div class="when">{{ ev.when }}</div>
            <div class="text">{{ ev.text }}</div>
          </div>
        </div>
      </div>

      <div class="callout">
        <i class="fas fa-triangle-exclamation"></i>
        <span
          >Хочешь интегрироваться сейчас → упрёшься либо в умерший плагин, либо в нестабильный новый
          API.</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const events = [
  { when: 'Декабрь 2025', text: 'SDK и плагины из Chatium закрыли' },
  { when: 'После', text: 'Появился новый API — рядом со старым' },
  { when: 'Сейчас', text: 'Новый API нестабилен, требует ключа разработчика (не школьного)' }
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
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(26px, 3.2vw, 52px);
  color: var(--text-primary);
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 16px;
}

.timeline {
  position: relative;
  padding-left: 36px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.line {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: rgba(255, 179, 71, 0.5);
}
.event {
  position: relative;
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: start;
  gap: 24px;
  opacity: 0;
  animation: fadeInLeft 500ms ease-out forwards;
}
.dot {
  position: absolute;
  left: -32px;
  top: 12px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-amber);
  box-shadow: 0 0 14px rgba(255, 179, 71, 0.5);
}
.when {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: clamp(13px, 1.1vw, 20px);
  color: var(--accent-amber);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-top: 4px;
}
.text {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.8vw, 30px);
  color: var(--text-primary);
}

.callout {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  background: rgba(255, 179, 71, 0.08);
  border-left: 4px solid var(--accent-amber);
  border-radius: 12px;
}
.callout i {
  font-size: clamp(20px, 1.8vw, 30px);
  color: var(--accent-amber);
  flex-shrink: 0;
}
.callout span {
  font-family: var(--font-body-new);
  font-weight: 600;
  font-size: clamp(15px, 1.5vw, 28px);
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .event {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
