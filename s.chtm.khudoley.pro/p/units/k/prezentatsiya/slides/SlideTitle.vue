<template>
  <div class="slide dot-grid">
    <div class="ring ring-tr"></div>
    <div class="ring ring-tr inner"></div>
    <div class="ring ring-bl"></div>
    <div class="ring ring-bl inner"></div>

    <div class="content">
      <h1 class="title">Chatium + GetCourse</h1>
      <span class="strip"></span>
      <p class="subtitle">Что случилось и что с этим делать</p>
      <p class="footer">Эфир для клуба Chatium · Андрей Худолей · 6 мая 2026</p>
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

.ring {
  position: absolute;
  border: 1px solid rgba(0, 217, 255, 0.18);
  border-radius: 50%;
  pointer-events: none;
}
.ring-tr {
  width: 320px;
  height: 320px;
  top: 6%;
  right: 5%;
}
.ring-tr.inner {
  width: 220px;
  height: 220px;
  top: calc(6% + 50px);
  right: calc(5% + 50px);
}
.ring-bl {
  width: 180px;
  height: 180px;
  bottom: 8%;
  left: 4%;
}
.ring-bl.inner {
  width: 110px;
  height: 110px;
  bottom: calc(8% + 35px);
  left: calc(4% + 35px);
}

.content {
  position: relative;
  text-align: center;
  padding: 24px;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeInUp 600ms ease-out both;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(48px, 9vw, 132px);
  line-height: 1;
  letter-spacing: -2px;
  color: var(--text-primary);
  margin-bottom: 32px;
  text-shadow: 0 0 60px rgba(0, 217, 255, 0.18);
}

.strip {
  width: 220px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-bottom: 32px;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.6);
}

.subtitle {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(20px, 2.4vw, 38px);
  color: var(--text-secondary);
  margin-bottom: 96px;
}

.footer {
  font-family: var(--font-body-new);
  font-weight: 500;
  font-size: clamp(13px, 1vw, 20px);
  letter-spacing: 0.18em;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .ring-tr {
    width: 180px;
    height: 180px;
  }
  .ring-tr.inner {
    width: 120px;
    height: 120px;
  }
  .ring-bl {
    width: 110px;
    height: 110px;
  }
  .ring-bl.inner {
    width: 70px;
    height: 70px;
  }
  .subtitle {
    margin-bottom: 56px;
  }
}
</style>
