<template>
  <div class="slide dot-grid">
    <div class="ghost">G</div>

    <div class="content">
      <p class="line line-1">Я сделал отдельный сервис</p>
      <p class="line line-2">Он стоит между Chatium и GetCourse</p>
      <p class="line line-3">
        Все интеграционные звонки идут <span class="hl">через него</span>
        <span class="strip"></span>
      </p>
      <p class="caption">
        <i>Когда GC меняет API — я обновляю прокладку. Ваш код не трогается.</i>
      </p>
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
  padding: 56px 64px;
  overflow: hidden;
}

.ghost {
  position: absolute;
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(360px, 50vw, 720px);
  color: rgba(0, 217, 255, 0.05);
  right: -2%;
  top: 50%;
  transform: translateY(-50%);
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
  max-width: 1400px;
  gap: 28px;
}

.line {
  font-family: var(--font-display-new);
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1.15;
  opacity: 0;
  animation: fadeInUp 600ms ease-out forwards;
}
.line-1 {
  font-size: clamp(20px, 2.8vw, 48px);
  color: var(--text-secondary);
  animation-delay: 0.1s;
}
.line-2 {
  font-size: clamp(24px, 3.4vw, 56px);
  color: var(--text-primary);
  animation-delay: 0.3s;
}
.line-3 {
  font-size: clamp(28px, 4vw, 64px);
  color: var(--text-primary);
  animation-delay: 0.5s;
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.line-3 .hl {
  color: var(--text-primary);
  display: inline-block;
}
.line-3 .strip {
  display: block;
  width: 60%;
  max-width: 420px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  box-shadow: 0 0 14px rgba(0, 217, 255, 0.55);
}

.caption {
  margin-top: 80px;
  font-family: var(--font-body-new);
  font-style: italic;
  font-size: clamp(15px, 1.6vw, 28px);
  color: var(--text-secondary);
  max-width: 900px;
  opacity: 0;
  animation: fadeInUp 600ms ease-out forwards;
  animation-delay: 0.7s;
}

@media (max-width: 768px) {
  .slide {
    padding: 32px 16px;
  }
  .caption {
    margin-top: 40px;
  }
}
</style>
