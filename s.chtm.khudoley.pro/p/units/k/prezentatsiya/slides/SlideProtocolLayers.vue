<template>
  <div class="slide dot-grid">
    <span class="ghost">04</span>

    <div class="container">
      <header class="head">
        <h1 class="title">Протоколы — слоями</h1>
        <span class="strip"></span>
      </header>

      <div class="stack">
        <div
          v-for="(layer, i) in layers"
          :key="layer.badge"
          class="layer"
          :class="{ top: layer.top }"
          :style="{ opacity: layer.opacity, animationDelay: 0.05 + i * 0.06 + 's' }"
        >
          <span class="badge">{{ layer.badge }}</span>
          <span class="lname">{{ layer.name }}</span>
          <span class="lcaption">{{ layer.caption }}</span>
          <span v-if="layer.top" class="hint"
            >эфир про то, что внутри запроса <i class="fas fa-arrow-right"></i
          ></span>
        </div>
      </div>

      <p class="footnote">
        <i>Кабель и железо — слайдом выше; здесь — правила поверх них.</i>
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const layers = [
  {
    badge: 'app',
    name: 'HTTPS',
    caption: 'запросы к API, интеграции — здесь',
    opacity: 1,
    top: true
  },
  { badge: 'L6', name: 'Представление', caption: 'сжатие, кодирование', opacity: 0.75 },
  { badge: 'L5', name: 'Сеанс', caption: 'долгий обмен, провайдер', opacity: 0.65 },
  { badge: 'L4', name: 'Доставка', caption: 'договорённости «дошло / не дошло»', opacity: 0.55 },
  { badge: 'L3', name: 'Между сетями', caption: 'маршрутизаторы, адреса, маршруты', opacity: 0.45 },
  {
    badge: 'L2',
    name: 'Локальный сегмент',
    caption: 'после коммутатора: одна «комната»',
    opacity: 0.35
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
  background: var(--gradient-bg);
  padding: 48px 96px;
  overflow: hidden;
}

.ghost {
  position: absolute;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(220px, 30vw, 420px);
  color: rgba(255, 255, 255, 0.025);
  bottom: -3%;
  right: 4%;
  pointer-events: none;
  user-select: none;
  line-height: 1;
}

.container {
  position: relative;
  width: 100%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer {
  position: relative;
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  min-height: 64px;
  opacity: 0;
  animation: fadeInLeft 480ms ease-out forwards;
}

.layer.top {
  background: var(--bg-elevated);
  border: 2px solid var(--border-accent);
  box-shadow: 0 0 32px rgba(0, 217, 255, 0.15);
  min-height: 96px;
  padding: 20px 24px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: clamp(11px, 1vw, 18px);
  font-weight: 600;
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}
.layer.top .badge {
  color: var(--accent-cyan);
  border-color: var(--border-accent);
  background: rgba(0, 217, 255, 0.1);
}

.lname {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(15px, 1.5vw, 24px);
  color: var(--text-primary);
}
.layer.top .lname {
  font-size: clamp(20px, 2vw, 32px);
  font-weight: 700;
  color: var(--accent-cyan);
}

.lcaption {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.1vw, 20px);
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
}

.hint {
  font-family: var(--font-body-new);
  font-weight: 600;
  font-size: clamp(12px, 1.1vw, 20px);
  color: var(--accent-cyan);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.footnote {
  text-align: center;
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.1vw, 20px);
  color: var(--text-tertiary);
  font-style: italic;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .layer {
    grid-template-columns: 60px 1fr;
  }
  .lcaption,
  .hint {
    display: none;
  }
}
</style>
