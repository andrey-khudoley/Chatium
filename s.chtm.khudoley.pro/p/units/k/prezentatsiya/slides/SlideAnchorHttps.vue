<template>
  <div class="slide dot-grid">
    <div class="anchor-glow"></div>
    <div class="content">
      <h1 class="title">Интеграция — это разговор по <span class="hl">HTTPS</span></h1>
      <span class="strip"></span>
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
}

.content {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  max-width: 1500px;
  animation: fadeInUp 700ms ease-out both;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(38px, 8vw, 124px);
  color: var(--text-primary);
  letter-spacing: -2.5px;
  line-height: 1.05;
  text-shadow: 0 0 60px rgba(0, 217, 255, 0.25);
}
.hl {
  color: var(--accent-cyan);
}

.strip {
  display: block;
  width: 280px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 48px;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.7);
}

@media (max-width: 768px) {
  .strip {
    width: 180px;
  }
}
</style>
