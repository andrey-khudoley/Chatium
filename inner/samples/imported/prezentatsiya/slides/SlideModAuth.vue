<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
      <div class="scan-line"></div>
    </div>

    <div class="content">
      <div class="top-section">
        <h2 class="title">
          <span class="lock-icon"><i class="fas fa-fingerprint"></i></span>
          <span class="title-text">Личные кабинеты</span>
        </h2>
        <p class="subtitle">Каждый видит только своё</p>
      </div>

      <div class="doors">
        <div
          v-for="(door, i) in doors"
          :key="door.role"
          class="door"
          :class="['door-' + (i + 1), { hovered: hoveredDoor === i }]"
          @mouseenter="hoveredDoor = i"
          @mouseleave="hoveredDoor = null"
        >
          <div class="door-glow" :style="{ background: door.glow }"></div>
          <div class="door-level">
            <div
              class="level-bar"
              v-for="n in 3"
              :key="n"
              :class="{ active: n <= door.level }"
            ></div>
          </div>
          <div class="door-icon">
            <i :class="door.icon"></i>
          </div>
          <div class="door-role">{{ door.role }}</div>
          <div class="door-desc">{{ door.desc }}</div>
          <div class="door-perms">
            <div v-for="p in door.perms" :key="p" class="perm">
              <i class="fas fa-check"></i>
              <span>{{ p }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="auth-methods">
        <div v-for="m in methods" :key="m.text" class="method">
          <i :class="m.icon"></i>
          <span>{{ m.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ active: Boolean })

const hoveredDoor = ref(null)

const doors = [
  {
    role: 'Клиент',
    icon: 'fas fa-user',
    desc: 'Видит свои заказы и профиль',
    level: 1,
    glow: 'radial-gradient(circle, rgba(20,184,166,0.25), transparent 70%)',
    perms: ['Мои заказы', 'Профиль', 'История']
  },
  {
    role: 'Сотрудник',
    icon: 'fas fa-user-tie',
    desc: 'Управляет клиентами и контентом',
    level: 2,
    glow: 'radial-gradient(circle, rgba(6,214,160,0.25), transparent 70%)',
    perms: ['Все клиенты', 'Контент', 'Аналитика']
  },
  {
    role: 'Админ',
    icon: 'fas fa-crown',
    desc: 'Полный контроль над системой',
    level: 3,
    glow: 'radial-gradient(circle, rgba(251,191,36,0.3), transparent 70%)',
    perms: ['Всё выше', 'Настройки', 'Доступы']
  }
]

const methods = [
  { icon: 'fas fa-envelope', text: 'Email' },
  { icon: 'fas fa-phone', text: 'Телефон' },
  { icon: 'fab fa-telegram', text: 'Telegram' },
  { icon: 'fas fa-key', text: 'JWT' }
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
  filter: blur(140px);
  opacity: 0.1;
  animation: float 18s ease-in-out infinite;
}
.orb-1 {
  width: 600px;
  height: 600px;
  background: #14b8a6;
  top: -25%;
  left: -15%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #06d6a0;
  bottom: -20%;
  right: -10%;
  animation-delay: -7s;
}
.orb-3 {
  width: 300px;
  height: 300px;
  background: #fbbf24;
  top: 30%;
  right: 20%;
  animation-delay: -12s;
  opacity: 0.06;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.4), transparent);
  animation: scanDown 6s ease-in-out infinite;
}

@keyframes scanDown {
  0%,
  100% {
    top: 0;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

.content {
  max-width: 960px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

.top-section {
  text-align: center;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.lock-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(20, 184, 166, 0.1);
  border: 1px solid rgba(20, 184, 166, 0.2);
  color: #14b8a6;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-icon 3s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.3);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(20, 184, 166, 0.15);
  }
}

.title-text {
  font-family: var(--font-display);
  font-size: clamp(32px, 6vw, 52px);
  font-weight: 900;
  background: linear-gradient(135deg, #14b8a6, #06d6a0, #fbbf24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(16px, 3vw, 22px);
  color: var(--text-muted);
  font-weight: 600;
}

/* --- 3 двери-карточки --- */
.doors {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}

.door {
  position: relative;
  padding: 28px 20px 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: default;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.door-glow {
  position: absolute;
  inset: -20px;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.door.hovered {
  border-color: rgba(20, 184, 166, 0.3);
  transform: translateY(-8px) scale(1.02);
}

.door.hovered .door-glow {
  opacity: 1;
}

.door-3.hovered {
  border-color: rgba(251, 191, 36, 0.3);
}
.door-2.hovered {
  border-color: rgba(6, 214, 160, 0.3);
}

/* уровень доступа — три палочки */
.door-level {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.level-bar {
  width: 20px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

.level-bar.active {
  background: #14b8a6;
}
.door-3 .level-bar.active {
  background: #fbbf24;
}
.door-2 .level-bar.active {
  background: #06d6a0;
}

.door-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #14b8a6;
  transition: all 0.4s ease;
}

.door.hovered .door-icon {
  transform: scale(1.1);
  box-shadow: 0 0 24px rgba(20, 184, 166, 0.2);
}

.door-2 .door-icon {
  background: rgba(6, 214, 160, 0.08);
  border-color: rgba(6, 214, 160, 0.15);
  color: #06d6a0;
}
.door-3 .door-icon {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.door-2.hovered .door-icon {
  box-shadow: 0 0 24px rgba(6, 214, 160, 0.2);
}
.door-3.hovered .door-icon {
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.2);
}

.door-role {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
}

.door-desc {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.4;
}

.door-perms {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 4px;
}

.perm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 12px;
  color: var(--text-secondary);
}

.perm i {
  font-size: 9px;
  color: #14b8a6;
}
.door-2 .perm i {
  color: #06d6a0;
}
.door-3 .perm i {
  color: #fbbf24;
}

/* --- методы авторизации --- */
.auth-methods {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.method {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 100px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(20, 184, 166, 0.12);
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.method:hover {
  border-color: rgba(20, 184, 166, 0.3);
  color: #14b8a6;
  background: rgba(20, 184, 166, 0.1);
}

.method i {
  font-size: 14px;
  color: #14b8a6;
  opacity: 0.7;
}
.method:hover i {
  opacity: 1;
}

@media (max-width: 640px) {
  .slide {
    padding: 20px 14px 14px;
    align-items: center;
  }
  .content {
    gap: 14px;
  }
  .top-section {
    margin-bottom: 0;
  }
  .title {
    gap: 8px;
    margin-bottom: 6px;
  }
  .lock-icon {
    width: 34px;
    height: 34px;
    font-size: 16px;
    border-radius: 10px;
  }
  .title-text {
    font-size: 24px;
  }
  .subtitle {
    font-size: 13px;
  }
  .doors {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .door {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 14px;
  }
  .door-glow {
    display: none;
  }
  .door-level {
    display: none;
  }
  .door-icon {
    width: 36px;
    height: 36px;
    min-width: 36px;
    font-size: 15px;
  }
  .door-role {
    font-size: 14px;
    text-align: left;
  }
  .door-desc {
    font-size: 11px;
    text-align: left;
    line-height: 1.3;
  }
  .door-perms {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 0;
  }
  .perm {
    padding: 3px 8px;
    font-size: 10px;
    border-radius: 6px;
  }
  .perm i {
    font-size: 7px;
  }
  .auth-methods {
    gap: 6px;
  }
  .method {
    padding: 6px 12px;
    font-size: 10px;
  }
  .method i {
    font-size: 11px;
  }
}
</style>
