<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="header">
        <h2 class="title">
          Chatium — не нейронка.<br />Это
          <span class="grad-warm">инструмент для замены сотрудников</span>
        </h2>
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
  background: var(--bg-deep);
}

.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--accent-amber);
  top: -10%;
  right: -5%;
}

.orb-2 {
  width: 450px;
  height: 450px;
  background: var(--accent-rose);
  bottom: -10%;
  left: -5%;
  animation-delay: -4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.container {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  padding: 0 24px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.5vw, 64px);
  font-weight: 800;
  line-height: 1.15;
}

.grad-warm {
  background: linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>
