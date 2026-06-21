<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="content">
      <span class="badge">ИНФРАСТРУКТУРА</span>

      <h2 class="title">Почему нельзя просто взять</h2>

      <div class="tools-grid">
        <div class="tools-row">
          <span class="tool-pill" v-for="t in toolsRow1" :key="t.name" :style="{ '--tc': t.color }">
            {{ t.name }}
          </span>
        </div>
        <div class="tools-row">
          <span class="tool-pill" v-for="t in toolsRow2" :key="t.name" :style="{ '--tc': t.color }">
            {{ t.name }}
          </span>
        </div>
      </div>

      <div class="problem-box">
        <p class="problem-text">
          Они все — <strong>гениальные мозги</strong>. Генерируют код, текст, идеи.<br />
          Но ни один из них <strong>не знает ваших клиентов</strong>. Не может принять оплату.<br />
          Не умеет отправить письмо. Не хранит данные.
        </p>
        <div class="divider"></div>
        <p class="problem-verdict">Они все — <span class="accent-text">мозг без тела</span>.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const toolsRow1 = [
  { name: 'ChatGPT', color: '#10b981' },
  { name: 'Lovable', color: '#f43f5e' }
]
const toolsRow2 = [
  { name: 'Cursor', color: '#06b6d4' },
  { name: 'Claude Code', color: '#8b5cf6' }
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
  animation: float 15s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--accent-indigo);
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-violet);
  bottom: -15%;
  right: -5%;
  animation-delay: -5s;
}
.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
}

.content {
  max-width: 800px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-indigo);
  padding: 5px 14px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
  letter-spacing: 2px;
  background: rgba(99, 102, 241, 0.08);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 44px);
  font-weight: 800;
  line-height: 1.25;
  margin-bottom: 20px;
}

.tools-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-bottom: 36px;
}
.tools-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.tool-pill {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--tc);
  padding: 8px 24px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--tc) 30%, transparent);
  background: color-mix(in srgb, var(--tc) 8%, transparent);
  transition: all 0.3s ease;
}
.tool-pill:hover {
  border-color: var(--tc);
  box-shadow: 0 4px 24px color-mix(in srgb, var(--tc) 20%, transparent);
  transform: translateY(-2px);
}

.problem-box {
  padding: 28px 36px;
  border-radius: 18px;
  background: rgba(245, 158, 11, 0.04);
  border: 1px solid rgba(245, 158, 11, 0.12);
  margin-bottom: 28px;
  width: 100%;
}
.problem-text {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.75;
}
.divider {
  width: 60px;
  height: 2px;
  background: rgba(245, 158, 11, 0.25);
  margin: 16px auto;
  border-radius: 2px;
}
.problem-verdict {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
}
.accent-text {
  background: var(--gradient-warm);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

@media (max-width: 768px) {
  .tool-pill {
    font-size: 16px;
    padding: 6px 16px;
  }
  .solution-box {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 24px 16px 16px;
  }
  .badge {
    font-size: 10px;
    padding: 4px 10px;
    margin-bottom: 16px;
  }
  .title {
    font-size: 22px;
    margin-bottom: 14px;
  }
  .tools-grid {
    margin-bottom: 24px;
    gap: 8px;
  }
  .tools-row {
    gap: 8px;
  }
  .tool-pill {
    font-size: 14px;
    padding: 5px 14px;
  }
  .problem-box {
    padding: 18px 16px;
    border-radius: 14px;
  }
  .problem-text {
    font-size: 14px;
    line-height: 1.6;
  }
  .problem-text br {
    display: none;
  }
  .problem-verdict {
    font-size: 18px;
  }
}
</style>
