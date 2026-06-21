<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="header">
        <span class="num">07</span>
        <h2 class="title">
          Chatium — это <span class="gradient-text">город</span>.<br />
          <span class="subtitle">Остальные — дома в поле.</span>
        </h2>
      </div>

      <div class="metaphor show">
        <div class="m-city">
          <div class="m-label city-label"><i class="fas fa-city"></i> Chatium</div>
          <div class="city-els">
            <div
              class="city-el"
              v-for="(e, i) in cityElements"
              :key="e.name"
              :style="{ '--c': e.color, transitionDelay: i * 0.1 + 's' }"
            >
              <i :class="e.icon"></i><span>{{ e.name }}</span>
            </div>
          </div>
          <p class="m-desc">
            Дороги, здания, жители, банк, почта — <strong>всё связано и работает вместе</strong>
          </p>
        </div>
        <div class="m-vs">
          <span>VS</span>
        </div>
        <div class="m-field">
          <div class="m-label field-label">
            <i class="fas fa-house-crack"></i> Cursor + n8n + Lovable + ...
          </div>
          <div class="field-houses">
            <span class="house">🏠</span>
            <span class="house">🏠</span>
            <span class="house">🏠</span>
            <span class="house">🏠</span>
          </div>
          <p class="m-desc">Отдельные дома посреди поля. Без дорог. Без электричества.</p>
        </div>
      </div>

      <div class="principles show">
        <h3><i class="fas fa-key"></i> Ключевые принципы</h3>
        <div class="pr-grid">
          <div
            class="pr"
            v-for="(p, i) in principles"
            :key="p.title"
            :style="{ '--pr-color': p.color, transitionDelay: i * 0.08 + 's' }"
          >
            <div class="pr-icon"><i :class="p.icon"></i></div>
            <div class="pr-content">
              <strong>{{ p.title }}</strong>
              <p>{{ p.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="summary show">
        <div class="sum-left">
          <div class="sum-label bad"><i class="fas fa-times-circle"></i> Без Chatium</div>
          <p>Cursor + VPS + Supabase + Stripe + n8n + SendGrid + AmoCRM + Telegram API</p>
          <div class="sum-result bad">8 сервисов · $200–500/мес · Месяцы</div>
        </div>
        <div class="sum-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="sum-right">
          <div class="sum-label good"><i class="fas fa-check-circle"></i> С Chatium</div>
          <p>Одна платформа, всё из коробки</p>
          <div class="sum-result good">1 платформа · Рубли · Работает сразу</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const cityElements = [
  { icon: 'fas fa-road', name: 'Инфраструктура', color: '#6366f1' },
  { icon: 'fas fa-building', name: 'Сервисы', color: '#8b5cf6' },
  { icon: 'fas fa-users', name: 'Агенты', color: '#06b6d4' },
  { icon: 'fas fa-shield-halved', name: 'Авторизация', color: '#10b981' },
  { icon: 'fas fa-landmark', name: 'Платежи', color: '#f59e0b' },
  { icon: 'fas fa-envelope', name: 'Рассылки', color: '#f43f5e' }
]

const principles = [
  {
    icon: 'fas fa-puzzle-piece',
    title: 'Целостность',
    desc: 'Все модули работают вместе. Не нужно склеивать 8 сервисов.',
    color: '#6366f1'
  },
  {
    icon: 'fas fa-flag',
    title: 'Сделано для РФ',
    desc: 'Российские серверы, платежи, законодательство.',
    color: '#10b981'
  },
  {
    icon: 'fas fa-brain',
    title: 'ИИ в среде',
    desc: 'Ботан и Леночка живут внутри инфраструктуры.',
    color: '#06b6d4'
  },
  {
    icon: 'fas fa-ban',
    title: 'Не нужны серверы',
    desc: 'Хостинг, CDN, БД — уже встроены.',
    color: '#f59e0b'
  },
  {
    icon: 'fas fa-code',
    title: 'Код = среда',
    desc: 'Код вне Chatium не знает его инфраструктуру.',
    color: '#f43f5e'
  },
  {
    icon: 'fas fa-globe',
    title: 'Уникальность',
    desc: 'Такого нет нигде в мире.',
    color: '#8b5cf6'
  }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 50px 24px 24px;
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
  width: 450px;
  height: 450px;
  background: var(--accent-indigo);
  top: -15%;
  right: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-rose);
  bottom: -15%;
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
}

.header {
  margin-bottom: 28px;
}
.num {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-rose);
  padding: 6px 14px;
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 8px;
  background: rgba(244, 63, 94, 0.05);
}
.title {
  font-family: var(--font-display);
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 800;
  line-height: 1.2;
  margin-top: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
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

.subtitle {
  font-size: clamp(18px, 3vw, 28px);
  color: var(--text-secondary);
  font-weight: 400;
}

.metaphor {
  display: flex;
  align-items: stretch;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.m-city,
.m-field {
  flex: 1;
  min-width: 260px;
  padding: 28px;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  transition: all 0.4s ease;
}

.m-city {
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
  border-color: rgba(99, 102, 241, 0.25);
}

.m-city:hover {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 20px 50px rgba(99, 102, 241, 0.15);
  transform: translateY(-4px);
}

.m-field {
  background: rgba(244, 63, 94, 0.05);
  border-color: rgba(244, 63, 94, 0.2);
}

.m-field:hover {
  border-color: rgba(244, 63, 94, 0.35);
  box-shadow: 0 20px 50px rgba(244, 63, 94, 0.1);
  transform: translateY(-4px);
}

.m-label {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.city-label {
  color: var(--accent-indigo);
}

.field-label {
  color: var(--accent-rose);
  font-size: 15px;
}

.city-els {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.city-el {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  opacity: 0;
  transform: scale(0.9);
}

.metaphor.show .city-el {
  opacity: 1;
  transform: scale(1);
}

.city-el:hover {
  border-color: var(--c);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.city-el i {
  color: var(--c);
  font-size: 14px;
}

.field-houses {
  font-size: 32px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  opacity: 0.7;
}

.house {
  display: inline-block;
  animation: house-float 3s ease-in-out infinite;
}

.house:nth-child(2) {
  animation-delay: 0.5s;
}
.house:nth-child(3) {
  animation-delay: 1s;
}
.house:nth-child(4) {
  animation-delay: 1.5s;
}

@keyframes house-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.m-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.m-desc strong {
  color: var(--accent-emerald);
}

.m-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--text-muted);
  min-width: 60px;
}

.m-vs span {
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}

.principles {
  margin-bottom: 24px;
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
}

.principles h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
}

.principles h3 i {
  color: var(--accent-amber);
}

.pr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.pr {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateX(-10px);
}

.principles.show .pr {
  opacity: 1;
  transform: translateX(0);
}

.pr:hover {
  border-color: var(--pr-color);
  transform: translateX(6px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.pr-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pr-color);
  border-radius: 10px;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
}

.pr-content strong {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.pr-content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.summary {
  display: flex;
  align-items: stretch;
  gap: 14px;
  flex-wrap: wrap;
}

.sum-left,
.sum-right {
  flex: 1;
  min-width: 260px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  transition: all 0.4s ease;
}

.sum-left {
  background: rgba(244, 63, 94, 0.06);
  border-color: rgba(244, 63, 94, 0.2);
}

.sum-left:hover {
  border-color: rgba(244, 63, 94, 0.35);
  transform: translateY(-4px);
}

.sum-right {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
}

.sum-right:hover {
  border-color: rgba(16, 185, 129, 0.35);
  transform: translateY(-4px);
}

.sum-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sum-label.bad {
  color: var(--accent-rose);
}

.sum-label.good {
  color: var(--accent-emerald);
}

.sum-left p,
.sum-right p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  line-height: 1.5;
}

.sum-result {
  font-size: 13px;
  font-weight: 700;
  padding: 10px 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sum-result.bad {
  background: rgba(244, 63, 94, 0.12);
  color: var(--accent-rose);
}

.sum-result.good {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-emerald);
}

.sum-arrow {
  display: flex;
  align-items: center;
  font-size: 24px;
  color: var(--text-muted);
  font-weight: 200;
  min-width: 40px;
  justify-content: center;
}

.sum-arrow i {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  animation: arrow-pulse 2s ease infinite;
}

@keyframes arrow-pulse {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(5px);
  }
}

@media (max-width: 640px) {
  .metaphor {
    flex-direction: column;
  }
  .m-vs {
    order: -1;
  }
  .m-vs span {
    transform: rotate(90deg);
  }
  .summary {
    flex-direction: column;
  }
  .sum-arrow {
    order: -1;
  }
  .sum-arrow i {
    transform: rotate(90deg);
  }
  .m-city,
  .m-field {
    padding: 18px;
    min-width: unset;
  }
  .m-label {
    font-size: 14px;
  }
  .field-label {
    font-size: 12px;
  }
  .pr-grid {
    grid-template-columns: 1fr;
  }
  .pr {
    padding: 12px;
  }
  .pr-icon {
    width: 34px;
    height: 34px;
    font-size: 14px;
    border-radius: 8px;
  }
  .pr-content strong {
    font-size: 12px;
  }
  .pr-content p {
    font-size: 11px;
  }
  .principles {
    padding: 16px;
  }
  .principles h3 {
    font-size: 14px;
  }
  .sum-left,
  .sum-right {
    padding: 16px;
    min-width: unset;
  }
  .sum-left p,
  .sum-right p {
    font-size: 12px;
  }
  .sum-result {
    font-size: 11px;
    padding: 8px 10px;
  }
  .title {
    font-size: 22px;
  }
  .subtitle {
    font-size: 16px;
  }
}
</style>
