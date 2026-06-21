<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Каталог операций</h1>
        <span class="strip"></span>
        <p class="subtitle">Стабильные имена. Внутри API GC может меняться — у вас в коде нет.</p>
      </header>

      <div class="grid">
        <span
          v-for="(op, i) in operations"
          :key="i"
          class="op"
          :class="{ ghost: op === '' }"
          :style="{ animationDelay: 0.02 + i * 0.025 + 's' }"
          >{{ op || '·' }}</span
        >
      </div>

      <p class="footer-note">… и ещё ~30 операций под четыре сценария. Полный реестр на портале.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const operations = [
  'findUserByEmail',
  'upsertUser',
  'setUserField',
  'getUser',
  'getUserOrders',
  'getDealById',
  'addUserToGroup',
  'removeUserFromGroup',
  'trackPayment',
  'createDeal',
  'updateDealStatus',
  'handleWebhook',
  'getGroups',
  '',
  'subscribeWebhook'
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
  padding: 56px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 32px;
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
  font-size: clamp(15px, 1.5vw, 26px);
  color: var(--text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px 56px;
  padding: 24px 0;
}

.op {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: clamp(15px, 1.6vw, 28px);
  color: var(--accent-cyan);
  letter-spacing: 0.01em;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 217, 255, 0.1);
  opacity: 0;
  animation: fadeInUp 360ms ease-out forwards;
}
.op.ghost {
  color: var(--text-tertiary);
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}

.footer-note {
  font-family: var(--font-body-new);
  font-style: italic;
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  text-align: right;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
  }
}
@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .footer-note {
    text-align: left;
  }
}
</style>
