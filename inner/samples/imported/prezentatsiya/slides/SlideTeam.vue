<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <!-- Заголовок + стоимость в одном ряду -->
      <div class="top-section">
        <div class="titles">
          <h2 class="title">За Chatium — <span class="gradient-text">8 лет разработки</span></h2>
          <p class="subtitle">Создатели Геткурс, Мегаплан, Финолог</p>
        </div>
        <div class="cost-badge">
          <span class="cost-value">200 млн ₽<span class="cost-plus">+</span></span>
          <span class="cost-label">вложено в платформу</span>
        </div>
      </div>

      <!-- Команда — одна горизонтальная линия -->
      <div class="team-strip">
        <div v-for="(m, i) in team" :key="i" class="member">
          <div class="photo">
            <img :src="m.photo" :alt="m.name" loading="lazy" />
          </div>
          <div class="info">
            <div class="name">{{ m.name }}</div>
            <div class="role">{{ m.position }}</div>
          </div>
        </div>
      </div>

      <!-- Proof-строки -->
      <div class="proof-row">
        <div class="proof-item">
          <i class="fas fa-shield-halved"></i>
          <span>Миллионы пользователей в продакшене</span>
        </div>
        <div class="proof-item">
          <i class="fas fa-server"></i>
          <span>Серверы в РФ · 152-ФЗ</span>
        </div>
        <div class="proof-item">
          <i class="fas fa-cubes"></i>
          <span>16+ модулей — не повторить за разумные деньги</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const team = [
  {
    name: 'Тимур Каримбаев',
    position: 'CEO',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_P70ueZO8Qu.2257x3385.jpeg/s/400x'
  },
  {
    name: 'Артур Эшенбренер',
    position: 'Директор Ботана',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_qMETMGEC9Z.3523x2318.jpeg/s/400x'
  },
  {
    name: 'Александр Галченков',
    position: 'Продукт',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_3abUfStTH2.3544x4250.jpeg/s/400x'
  },
  {
    name: 'Давид Галоян',
    position: 'CTO',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_A46XUoVA0q.3548x4236.jpeg/s/400x'
  },
  {
    name: 'Ратмир Насыров',
    position: 'Интеграции',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_4GooGn1Y5K.3433x3947.jpeg/s/400x'
  },
  {
    name: 'Даниил Бондаренко',
    position: 'Леночка',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_Tx9OFRnizo.3567x5351.jpeg/s/400x'
  },
  {
    name: 'Денис Карасик',
    position: 'Инженер',
    photo: 'https://fs.chatium.ru/thumbnail/image_msk_TazTT3UuvY.3574x5361.jpeg/s/400x'
  }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 40px 32px;
  background: var(--bg-deep);
  overflow-y: auto;
}

.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--accent-violet);
  top: -20%;
  right: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-indigo);
  bottom: -15%;
  left: -5%;
}

.container {
  position: relative;
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* ====== TOP SECTION: title + cost badge ====== */
.top-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.titles {
  flex: 1;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(26px, 3.5vw, 42px);
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
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
  font-size: clamp(15px, 2vw, 20px);
  color: var(--text-secondary);
  margin-top: 6px;
}

.cost-badge {
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.06));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 20px;
  padding: 18px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cost-value {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.5vw, 44px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cost-plus {
  font-size: 0.65em;
}

.cost-label {
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

/* ====== TEAM STRIP ====== */
.team-strip {
  display: flex;
  justify-content: center;
  gap: clamp(12px, 2.5vw, 32px);
  flex-wrap: nowrap;
}

.member {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex-shrink: 0;
}

.photo {
  width: clamp(80px, 10vw, 120px);
  height: clamp(80px, 10vw, 120px);
  border-radius: 20px;
  overflow: hidden;
  border: 2px solid var(--border-subtle);
  margin-bottom: 10px;
  transition: all 0.4s ease;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.member:hover .photo {
  border-color: var(--accent-indigo);
  transform: scale(1.06);
}

.member:hover .photo img {
  transform: scale(1.1);
}

.name {
  font-size: clamp(12px, 1.4vw, 16px);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
}

.role {
  font-size: clamp(10px, 1.1vw, 13px);
  color: var(--text-muted);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

/* ====== PROOF ROW ====== */
.proof-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.proof-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  font-size: clamp(13px, 1.4vw, 16px);
  color: var(--text-secondary);
  line-height: 1.3;
  transition: border-color 0.3s ease;
  white-space: nowrap;
}

.proof-item:hover {
  border-color: rgba(99, 102, 241, 0.4);
}

.proof-item i {
  font-size: clamp(16px, 1.6vw, 20px);
  color: var(--accent-indigo);
  flex-shrink: 0;
}

/* ====== MOBILE ====== */
@media (max-width: 900px) {
  .top-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .team-strip {
    flex-wrap: wrap;
    gap: 16px;
  }

  .proof-row {
    flex-direction: column;
    gap: 10px;
  }

  .proof-item {
    white-space: normal;
  }
}

@media (max-width: 600px) {
  .slide {
    padding: 20px 14px;
  }

  .container {
    gap: 20px;
  }

  .photo {
    width: 56px;
    height: 56px;
    border-radius: 12px;
  }

  .name {
    font-size: 11px;
  }

  .role {
    font-size: 9px;
  }

  .top-section {
    gap: 12px;
  }

  .title {
    font-size: 22px;
  }

  .subtitle {
    font-size: 13px;
  }

  .cost-badge {
    padding: 14px 20px;
    border-radius: 14px;
  }

  .cost-value {
    font-size: 24px;
  }

  .cost-label {
    font-size: 11px;
  }

  .team-strip {
    gap: 8px;
  }

  .member {
    min-width: 0;
  }

  .proof-item {
    padding: 10px 14px;
    font-size: 12px;
  }

  .proof-item i {
    font-size: 14px;
  }
}
</style>
