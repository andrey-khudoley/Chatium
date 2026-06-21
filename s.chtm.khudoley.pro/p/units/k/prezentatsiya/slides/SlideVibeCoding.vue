<template>
  <div class="slide dot-grid">
    <div class="ghost">01</div>

    <div class="content">
      <div class="quote-row">
        <span class="vstrip"></span>
        <h1 class="quote">Мы все сейчас вайб-кодим</h1>
      </div>
      <p class="sub">У этого есть граница, на которую вы уже наступили.</p>
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
  overflow: hidden;
  padding: 64px 96px;
}

.ghost {
  position: absolute;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(220px, 36vw, 480px);
  color: rgba(255, 255, 255, 0.025);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
  line-height: 1;
}

.content {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1300px;
  animation: fadeInUp 600ms ease-out both;
}

.quote-row {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 48px;
}

.vstrip {
  display: block;
  width: 4px;
  height: clamp(80px, 12vw, 200px);
  background: var(--accent-cyan);
  border-radius: 2px;
  box-shadow: 0 0 16px rgba(0, 217, 255, 0.5);
}

.quote {
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(36px, 7vw, 100px);
  color: var(--text-primary);
  letter-spacing: -2px;
  line-height: 1.05;
  text-align: center;
}

.sub {
  font-family: var(--font-body-new);
  font-weight: 400;
  font-size: clamp(18px, 2.1vw, 34px);
  color: var(--text-secondary);
  line-height: 1.4;
  max-width: 900px;
  text-align: center;
}

@media (max-width: 768px) {
  .slide {
    padding: 40px 20px;
  }
  .quote-row {
    gap: 16px;
  }
  .vstrip {
    width: 3px;
  }
}
</style>
