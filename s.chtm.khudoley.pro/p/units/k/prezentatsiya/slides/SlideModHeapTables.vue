<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <h2 class="title">
        <span class="module-name">База данных</span>
        <span class="module-subtitle">Храни всё. Находи мгновенно.</span>
      </h2>

      <div class="features">
        <div
          v-for="(f, i) in features"
          :key="f.text"
          class="feature"
          :style="{ transitionDelay: i * 0.08 + 's' }"
        >
          <i :class="f.icon"></i>
          <span>{{ f.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const features = [
  { icon: 'fas fa-table', text: 'Таблицы для всего' },
  { icon: 'fas fa-link', text: 'Связи между данными' },
  { icon: 'fas fa-search', text: 'Полнотекстовый поиск' },
  { icon: 'fas fa-brain', text: 'Поиск по смыслам (AI)' },
  { icon: 'fas fa-chart-bar', text: 'Агрегации и аналитика' },
  { icon: 'fas fa-shield-halved', text: 'Роли и доступы' }
]
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
  opacity: 0.12;
  animation: float 18s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #f97316;
  top: -20%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #ec4899;
  bottom: -15%;
  left: -5%;
  animation-delay: -6s;
}

.content {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.title {
  margin-bottom: 32px;
}
.module-name {
  display: block;
  font-family: var(--font-mono);
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #f97316, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.module-subtitle {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 8px;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 36px;
  justify-content: center;
}
.feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}
.feature:hover {
  border-color: #f97316;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.15);
}
.feature i {
  color: #f97316;
  font-size: 16px;
}

@media (max-width: 640px) {
  .slide {
    padding: 24px 16px 16px;
    align-items: center;
  }
  .features {
    gap: 6px;
  }
  .feature {
    padding: 8px 12px;
    font-size: 12px;
  }
  .module-name {
    font-size: 40px;
  }
  .module-subtitle {
    font-size: 16px;
  }
  .title {
    margin-bottom: 20px;
  }
}
</style>
