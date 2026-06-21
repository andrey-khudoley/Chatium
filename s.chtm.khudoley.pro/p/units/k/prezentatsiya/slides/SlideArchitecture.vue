<template>
  <div class="slide dot-grid">
    <span class="ghost">03</span>

    <div class="container">
      <header class="head">
        <h1 class="title">Как это устроено</h1>
        <span class="strip"></span>
        <p class="subtitle">Тонкий клиент в Chatium → gateway → GC API</p>
      </header>

      <div class="flow">
        <template v-for="(box, i) in boxes" :key="box.title">
          <article
            class="box"
            :class="{ accent: box.accent }"
            :style="{ animationDelay: 0.1 + i * 0.1 + 's' }"
          >
            <span v-if="box.accent" class="star"><i class="fas fa-star"></i></span>
            <div class="b-title">{{ box.title }}</div>
            <div class="b-caption" v-html="box.caption"></div>
          </article>
          <div v-if="i < boxes.length - 1" class="conn">
            <i class="fas fa-arrow-left-long"></i>
            <span class="cap" :class="{ accent: i === 1 }" v-html="connectors[i]"></span>
            <i class="fas fa-arrow-right-long"></i>
          </div>
        </template>
      </div>

      <p class="note">
        Ключ разработчика хранится здесь. Ключ школы — в SDK на стороне клиента. В коде сценариев —
        только имя школы.
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const boxes = [
  { title: 'Chatium', caption: 'ваше приложение' },
  { title: 'Тонкий SDK', caption: 'стабильный вызов: <code>op + args</code>' },
  { title: 'Gateway', caption: 'здесь живёт ключ разработчика', accent: true },
  { title: 'GetCourse', caption: 'старый API + новый API' }
]

const connectors = ['приложение зовёт SDK', '<code>op + args</code>', 'HTTPS к API']
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-bg);
  padding: 56px 32px;
  overflow: hidden;
}

.ghost {
  position: absolute;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(220px, 30vw, 420px);
  color: rgba(255, 255, 255, 0.025);
  bottom: 0;
  right: 4%;
  pointer-events: none;
  user-select: none;
  line-height: 1;
}

.container {
  position: relative;
  width: 100%;
  max-width: 1800px;
  display: flex;
  flex-direction: column;
  gap: 40px;
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
  font-size: clamp(15px, 1.5vw, 28px);
  color: var(--text-secondary);
}

.flow {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.box {
  position: relative;
  flex: 1 1 220px;
  max-width: 360px;
  min-height: 180px;
  padding: 28px 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  text-align: left;
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
}
.box.accent {
  background: var(--bg-elevated);
  border: 2px solid var(--border-accent);
  box-shadow: 0 0 32px rgba(0, 217, 255, 0.18);
}
.star {
  position: absolute;
  top: 12px;
  right: 16px;
  color: var(--accent-cyan);
  font-size: 18px;
}
.b-title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(18px, 1.9vw, 30px);
  color: var(--text-primary);
}
.box.accent .b-title {
  color: var(--accent-cyan);
}
.b-caption {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  line-height: 1.4;
}
.b-caption :deep(code) {
  font-family: var(--font-mono);
  background: rgba(0, 217, 255, 0.08);
  color: var(--accent-cyan);
  padding: 2px 6px;
  border-radius: 4px;
}

.conn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 90px;
  padding: 0 8px;
  color: var(--text-secondary);
  font-size: clamp(12px, 1.1vw, 18px);
}
.cap {
  font-family: var(--font-mono);
  font-size: clamp(10px, 0.85vw, 14px);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.2;
}
.cap.accent {
  color: var(--accent-cyan);
  font-weight: 700;
}
.cap :deep(code) {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--accent-cyan);
}

.note {
  text-align: center;
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.45;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .flow {
    flex-direction: column;
    align-items: stretch;
  }
  .conn {
    flex-direction: row;
    min-width: 0;
  }
  .box {
    max-width: 100%;
    min-height: auto;
  }
}
</style>
