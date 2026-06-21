<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">GC меняет API — у вас не ломается</h1>
        <span class="strip"></span>
      </header>

      <div class="cols">
        <section class="col">
          <span class="tag tag-warn">БЕЗ GATEWAY</span>
          <h3 class="col-title">Каждое изменение GC = ваша работа</h3>
          <div class="domino">
            <span
              v-for="n in 4"
              :key="n"
              class="brick"
              :style="{ animationDelay: (n - 1) * 0.15 + 's' }"
            ></span>
          </div>
          <p class="text">
            GC сменил название поля → ваш сценарий A сломался → сценарий B сломался → C → D
          </p>
        </section>

        <div class="vs">vs</div>

        <section class="col">
          <span class="tag tag-cyan">С GATEWAY</span>
          <h3 class="col-title">Я обновляю gateway, ваш код тот же</h3>
          <div class="anchor-vis">
            <div class="hub"><i class="fas fa-check"></i></div>
            <span class="sat s1"></span>
            <span class="sat s2"></span>
            <span class="sat s3"></span>
            <span class="sat s4"></span>
          </div>
          <p class="text">GC сменил название поля → я обновляю gateway → ваши сценарии работают</p>
        </section>
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
  background: var(--gradient-bg);
  padding: 56px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(26px, 3.4vw, 56px);
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

.cols {
  display: grid;
  grid-template-columns: 1fr 60px 1fr;
  gap: 32px;
  align-items: start;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  min-height: 360px;
}

.tag {
  font-family: var(--font-mono);
  font-size: clamp(11px, 1vw, 18px);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.tag-warn {
  color: var(--status-warning);
}
.tag-cyan {
  color: var(--accent-cyan);
}

.col-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.8vw, 28px);
  color: var(--text-primary);
}

.domino {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100px;
  padding: 0 8px;
}
.brick {
  width: 48px;
  height: 80px;
  background: var(--bg-surface);
  border: 1px solid var(--status-warning);
  border-radius: 6px;
  transform-origin: bottom right;
  animation: domino-fall 1.6s ease-in-out infinite;
}

.anchor-vis {
  position: relative;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hub {
  width: 100px;
  height: 100px;
  background: var(--bg-elevated);
  border: 2px solid var(--border-accent);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-cyan);
  font-size: 32px;
  box-shadow: 0 0 32px rgba(0, 217, 255, 0.2);
}
.sat {
  position: absolute;
  width: 28px;
  height: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}
.sat.s1 {
  left: 8%;
  top: 10%;
}
.sat.s2 {
  right: 8%;
  top: 10%;
}
.sat.s3 {
  left: 8%;
  bottom: 10%;
}
.sat.s4 {
  right: 8%;
  bottom: 10%;
}

.text {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  line-height: 1.45;
}

.vs {
  align-self: center;
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(28px, 3vw, 48px);
  color: var(--text-tertiary);
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .cols {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .vs {
    display: none;
  }
  .col {
    min-height: auto;
    padding: 22px;
  }
}
</style>
