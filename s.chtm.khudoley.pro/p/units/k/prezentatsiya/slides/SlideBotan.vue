<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="header">
        <span class="num">04</span>
        <div class="hero">
          <h2 class="title">
            <span class="grad-botan">Ботан</span>
          </h2>
          <div class="subtitle">Вайбкодинг</div>
          <p class="desc">
            Создание полноценных цифровых продуктов с помощью ИИ,
            <span class="highlight">просто описывая словами</span> то, что вы хотите.
          </p>
        </div>
      </div>

      <div class="abilities show">
        <div
          class="ability"
          v-for="(a, i) in abilities"
          :key="i"
          :style="{ '--ability-color': a.color, transitionDelay: i * 0.08 + 's' }"
        >
          <div class="ab-icon">
            <i :class="a.icon"></i>
          </div>
          <div class="ab-content">
            <strong>{{ a.title }}</strong>
            <p>{{ a.desc }}</p>
          </div>
          <div class="ab-glow"></div>
        </div>
      </div>

      <div class="diff show">
        <div class="diff-icon">
          <i class="fas fa-lightbulb"></i>
        </div>
        <div class="diff-content">
          <h3>Почему Ботан ≠ ChatGPT для кода</h3>
          <p>
            Ботан живёт <span class="highlight">ВНУТРИ</span> инфраструктуры Chatium. Знает все 16+
            модулей, видит данные, ходит по проектам, создаёт агентов.
          </p>
        </div>
      </div>

      <div class="tags show">
        <span
          v-for="(t, i) in creates"
          :key="i"
          class="tag"
          :style="{ transitionDelay: i * 0.05 + 's' }"
          >{{ t }}</span
        >
      </div>

      <div class="demo show">
        <div class="demo-header">
          <div class="demo-dots"><span></span><span></span><span></span></div>
          <span class="demo-title"> <i class="fas fa-tv"></i> ДЕМОНСТРАЦИЯ </span>
          <button class="demo-btn" @click="showDemo = !showDemo">
            <i :class="showDemo ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            {{ showDemo ? 'Скрыть' : 'Показать' }}
          </button>
        </div>
        <div class="demo-body" v-if="!showDemo">
          <div class="play-icon">
            <i class="fas fa-play"></i>
          </div>
          <p>Живая демонстрация вайбкодинга</p>
          <span class="demo-hint">Нажмите "Показать" для демо</span>
        </div>
        <div class="demo-iframe-wrap" v-if="showDemo">
          <input
            v-model="iframeUrl"
            class="demo-input"
            placeholder="Введите URL для демонстрации..."
          />
          <iframe
            v-if="iframeUrl"
            :src="iframeUrl"
            class="demo-iframe"
            frameborder="0"
            allowfullscreen
          ></iframe>
          <div v-else class="demo-placeholder">
            <i class="fas fa-link"></i>
            <p>Введите URL проекта для демонстрации</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ active: Boolean })
const showDemo = ref(false)
const iframeUrl = ref('')

const abilities = [
  {
    icon: 'fas fa-brain',
    title: 'Пишет код',
    desc: 'Vue.js, TypeScript, API, базы данных',
    color: '#6366f1'
  },
  {
    icon: 'fas fa-palette',
    title: 'Делает дизайн',
    desc: 'Адаптивные интерфейсы, анимации',
    color: '#8b5cf6'
  },
  {
    icon: 'fas fa-pen-fancy',
    title: 'Пишет тексты',
    desc: 'Контент, описания, формулировки',
    color: '#06b6d4'
  },
  {
    icon: 'fas fa-server',
    title: 'Инфраструктура',
    desc: 'Таблицы, роуты, авторизацию, платежи',
    color: '#10b981'
  },
  {
    icon: 'fas fa-robot',
    title: 'Создаёт агентов',
    desc: 'Леночку для вашего бизнеса',
    color: '#f43f5e'
  },
  {
    icon: 'fas fa-list-check',
    title: 'Раздаёт задачи',
    desc: 'Управляет подчинёнными',
    color: '#f59e0b'
  }
]

const creates = [
  'Лендинги',
  'Веб-приложения',
  'Интернет-магазины',
  'Онлайн-школы',
  'Системы бронирования',
  'Чат-ботов',
  'Порталы',
  'ИИ-агентов'
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
  filter: blur(100px);
  opacity: 0.2;
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--accent-indigo);
  top: -20%;
  right: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-violet);
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
}

.header {
  margin-bottom: 24px;
}

.num {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-indigo);
  padding: 6px 14px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
  background: rgba(99, 102, 241, 0.05);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(40px, 7vw, 64px);
  font-weight: 800;
  line-height: 1;
  margin: 0;
}

.grad-botan {
  background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #c4b5fd 100%);
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
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.desc {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 550px;
  line-height: 1.6;
}

.highlight {
  color: var(--text-primary);
  font-weight: 600;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
  padding: 2px 8px;
  border-radius: 4px;
}

.abilities {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.ability {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px);
}

.abilities.show .ability {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.ability:hover {
  border-color: var(--ability-color);
  transform: translateX(6px) translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.ab-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ability-color);
  border-radius: 12px;
  font-size: 18px;
  color: white;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.ab-content {
  position: relative;
  z-index: 2;
}

.ab-content strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.ab-content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.ab-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0% 50%, var(--ability-color) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.ability:hover .ab-glow {
  opacity: 0.08;
}

.diff {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 16px;
  transition: all 0.4s ease;
}

.diff:hover {
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(99, 102, 241, 0.1);
}

.diff-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-hero);
  border-radius: 14px;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.diff h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--accent-indigo);
}

.diff p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.diff .highlight {
  color: var(--accent-amber);
  font-weight: 700;
  background: none;
  padding: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.tag {
  padding: 8px 18px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-violet);
  transition: all 0.3s ease;
  opacity: 0;
  transform: scale(0.9);
}

.tags.show .tag {
  opacity: 1;
  transform: scale(1);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.tag:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--accent-indigo);
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
}

.demo {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s ease;
}

.demo:hover {
  border-color: rgba(99, 102, 241, 0.3);
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.demo-dots {
  display: flex;
  gap: 6px;
}

.demo-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.demo:hover .demo-dots span:nth-child(1) {
  transform: scale(1.2);
}
.demo:hover .demo-dots span:nth-child(2) {
  transform: scale(1.2);
  transition-delay: 0.1s;
}
.demo:hover .demo-dots span:nth-child(3) {
  transform: scale(1.2);
  transition-delay: 0.2s;
}

.demo-dots span:nth-child(1) {
  background: #f43f5e;
}
.demo-dots span:nth-child(2) {
  background: #f59e0b;
}
.demo-dots span:nth-child(3) {
  background: #10b981;
}

.demo-title {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-btn {
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: var(--accent-indigo);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.demo-btn:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}

.demo-body {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.play-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: rgba(99, 102, 241, 0.1);
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--accent-indigo);
  transition: all 0.4s ease;
  cursor: pointer;
}

.play-icon:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--accent-indigo);
  transform: scale(1.05);
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.3);
}

.demo-body p {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.demo-hint {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.demo-iframe-wrap {
  padding: 16px;
}

.demo-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-mono);
  margin-bottom: 12px;
  outline: none;
  transition: all 0.3s ease;
}

.demo-input:focus {
  border-color: var(--accent-indigo);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.demo-iframe {
  width: 100%;
  height: 400px;
  border-radius: 10px;
  background: white;
}

.demo-placeholder {
  padding: 60px;
  text-align: center;
  color: var(--text-muted);
}

.demo-placeholder i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

@media (max-width: 640px) {
  .abilities {
    grid-template-columns: 1fr;
  }
  .diff {
    flex-direction: column;
    text-align: center;
  }
  .diff-icon {
    margin: 0 auto;
  }
  .slide {
    padding: 24px 14px 14px;
  }
  .container {
    max-width: 100%;
  }
  .title {
    font-size: 36px;
  }
  .desc {
    font-size: 14px;
  }
  .ability {
    padding: 12px 14px;
  }
  .ab-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
    border-radius: 10px;
  }
  .ab-content strong {
    font-size: 13px;
  }
  .ab-content p {
    font-size: 11px;
  }
  .diff {
    padding: 14px 16px;
  }
  .diff-icon {
    width: 40px;
    height: 40px;
    font-size: 16px;
    border-radius: 12px;
  }
  .diff h3 {
    font-size: 14px;
  }
  .diff p {
    font-size: 12px;
  }
  .tag {
    padding: 6px 14px;
    font-size: 12px;
  }
  .demo-body {
    padding: 24px;
  }
  .play-icon {
    width: 56px;
    height: 56px;
    font-size: 22px;
  }
  .demo-body p {
    font-size: 14px;
  }
  .demo-iframe {
    height: 280px;
  }
}
</style>
