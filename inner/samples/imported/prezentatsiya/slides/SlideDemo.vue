<template>
  <div class="slide">
    <div class="bg">
      <div class="glow g1"></div>
      <div class="glow g2"></div>
      <div class="grid-bg"></div>
    </div>

    <div class="layout">
      <div class="chat-side">
        <div class="chat-window">
          <div class="chat-header">
            <div class="chat-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="chat-header-info">
              <span class="chat-name">Вы</span>
              <span class="chat-status">онлайн</span>
            </div>
          </div>

          <div class="chat-messages" ref="messagesEl">
            <template v-for="(msg, i) in visibleMessages" :key="i">
              <div
                class="msg"
                :class="{ 'msg-user': msg.type === 'user', 'msg-bot': msg.type === 'bot' }"
              >
                <div class="msg-avatar" v-if="msg.type === 'bot'">
                  <i class="fas fa-robot"></i>
                </div>
                <div class="msg-bubble">
                  <span v-html="msg.text"></span>
                </div>
              </div>
            </template>

            <div class="msg msg-bot typing-msg" v-if="isTyping">
              <div class="msg-avatar">
                <i class="fas fa-robot"></i>
              </div>
              <div class="msg-bubble typing-bubble">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          </div>

          <div class="chat-commands">
            <div class="cmd-label">Попробуйте:</div>
            <div class="cmd-list">
              <button
                v-for="(cmd, i) in commands"
                :key="i"
                class="cmd-btn"
                :class="{ active: activeCommand === i, done: completedCommands.has(i) }"
                @click="runCommand(i)"
                :disabled="isAnimating"
              >
                <i :class="cmd.icon"></i>
                {{ cmd.short }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-side">
        <div class="browser-frame">
          <div class="browser-bar">
            <div class="browser-dots"><span></span><span></span><span></span></div>
            <div class="browser-url">
              <i class="fas fa-lock"></i>
              <span>{{ currentUrl || 'chatium.ru/...' }}</span>
            </div>
          </div>

          <div class="browser-body">
            <transition name="fade" mode="out-in">
              <div class="build-animation" v-if="isBuilding" key="building">
                <div class="build-spinner">
                  <div class="spinner-ring"></div>
                  <i class="fas fa-code"></i>
                </div>
                <div class="build-text">Собираю проект...</div>
                <div class="build-progress">
                  <div class="build-bar" :style="{ width: buildProgress + '%' }"></div>
                </div>
                <div class="build-log">
                  <div v-for="(line, i) in buildLines" :key="i" class="log-line">
                    <span class="log-check">✓</span> {{ line }}
                  </div>
                </div>
              </div>

              <div class="placeholder" v-else-if="!currentIframeUrl" key="placeholder">
                <div class="placeholder-icon">
                  <i class="fas fa-arrow-left"></i>
                </div>
                <p>Напишите команду в чат —<br />результат появится здесь</p>
              </div>

              <iframe
                v-else
                :key="currentIframeUrl"
                :src="currentIframeUrl"
                class="preview-iframe"
                frameborder="0"
              ></iframe>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive } from 'vue'

defineProps({ active: Boolean })
const messagesEl = ref(null)

const visibleMessages = ref([])
const isTyping = ref(false)
const isBuilding = ref(false)
const isAnimating = ref(false)
const buildProgress = ref(0)
const buildLines = ref([])
const currentIframeUrl = ref('')
const currentUrl = ref('')
const activeCommand = ref(-1)
const completedCommands = reactive(new Set())

const commands = [
  {
    short: 'Сделай сайт',
    icon: 'fas fa-desktop',
    userMsg: 'Сделай мне сайт для бизнеса',
    botMsg: 'Принял! Создаю лендинг с формой, описанием услуг и блоком преимуществ...',
    url: 'chatium.ru/t-biznes',
    iframeUrl: 'https://chatium.ru/t-biznes',
    buildLog: [
      'Создаю структуру страниц',
      'Генерирую дизайн',
      'Подключаю формы',
      'Настраиваю адаптив',
      'Публикую'
    ]
  },
  {
    short: 'Сделай агента',
    icon: 'fas fa-robot',
    userMsg: 'Сделай мне ИИ-агента для продаж',
    botMsg: 'Создаю ИИ-агента! Настраиваю базу знаний, подключаю каналы, обучаю продавать...',
    url: 'chatium.ru/hakaton-avito-demo',
    iframeUrl: 'https://chatium.ru/hakaton-avito-demo',
    buildLog: [
      'Создаю агента',
      'Загружаю базу знаний',
      'Подключаю каналы',
      'Настраиваю инструменты',
      'Агент готов'
    ]
  },
  {
    short: 'Сделай LMS',
    icon: 'fas fa-graduation-cap',
    userMsg: 'Сделай платформу для онлайн-обучения с личным кабинетом',
    botMsg: 'Отлично! Разворачиваю LMS: курсы, уроки, прогресс, личный кабинет, видеоплеер...',
    url: 'chatium.ru/lms',
    iframeUrl: 'https://chatium.ru/lms',
    buildLog: [
      'Создаю базу курсов',
      'Настраиваю авторизацию',
      'Подключаю видеоплеер',
      'Делаю личный кабинет',
      'Готово!'
    ]
  },
  {
    short: 'Контент-завод',
    icon: 'fas fa-industry',
    userMsg: 'Сделай контент-завод для онлайн-школы',
    botMsg: 'Запускаю! Генерация уроков, статей, постов — полный конвейер контента...',
    url: 'chatium.ru/kontent-zavod-dlya-onlain-shkol',
    iframeUrl: 'https://chatium.ru/kontent-zavod-dlya-onlain-shkol',
    buildLog: [
      'Создаю шаблоны контента',
      'Подключаю ИИ-генерацию',
      'Настраиваю конвейер',
      'Добавляю форматы',
      'Завод запущен!'
    ]
  },
  {
    short: 'Доска задач',
    icon: 'fas fa-tasks',
    userMsg: 'Сделай доску задач для команды',
    botMsg: 'Создаю! Канбан-доска, статусы, исполнители, дедлайны — всё как надо...',
    url: 'chatium.ru/doska-zadach',
    iframeUrl: 'https://chatium.ru/doska-zadach',
    buildLog: [
      'Создаю структуру доски',
      'Добавляю колонки статусов',
      'Настраиваю карточки',
      'Подключаю фильтры',
      'Доска готова!'
    ]
  }
]

function scrollChat() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function runCommand(index) {
  if (isAnimating.value) return
  isAnimating.value = true
  activeCommand.value = index
  const cmd = commands[index]

  currentIframeUrl.value = ''
  currentUrl.value = ''

  visibleMessages.value.push({ type: 'user', text: cmd.userMsg })
  scrollChat()

  await sleep(600)

  isTyping.value = true
  scrollChat()
  await sleep(1200)
  isTyping.value = false

  visibleMessages.value.push({ type: 'bot', text: cmd.botMsg })
  scrollChat()

  await sleep(400)

  isBuilding.value = true
  buildProgress.value = 0
  buildLines.value = []

  for (let i = 0; i < cmd.buildLog.length; i++) {
    await sleep(600)
    buildLines.value.push(cmd.buildLog[i])
    buildProgress.value = ((i + 1) / cmd.buildLog.length) * 100
  }

  await sleep(500)
  isBuilding.value = false
  currentUrl.value = cmd.url
  currentIframeUrl.value = cmd.iframeUrl

  await sleep(300)
  visibleMessages.value.push({
    type: 'bot',
    text: '✅ <strong>Готово!</strong> Смотрите результат справа →'
  })
  scrollChat()

  completedCommands.add(index)
  isAnimating.value = false
}
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-deep);
}

.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  animation: glow-float 14s ease-in-out infinite;
}

.g1 {
  width: 500px;
  height: 500px;
  background: #6366f1;
  opacity: 0.12;
  top: -15%;
  left: 5%;
}

.g2 {
  width: 450px;
  height: 450px;
  background: #06b6d4;
  opacity: 0.1;
  bottom: -10%;
  right: 10%;
  animation-delay: -7s;
}

@keyframes glow-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-25px) scale(1.04);
  }
}

.layout {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  gap: 0;
}

/* ========= CHAT SIDE ========= */
.chat-side {
  width: 25%;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  padding: 20px 12px 20px 20px;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-subtle);
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.chat-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  display: block;
}

.chat-status {
  font-size: 12px;
  color: #10b981;
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg {
  display: flex;
  gap: 8px;
  animation: msg-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.msg-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22d3ee;
  font-size: 14px;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.5;
}

.msg-user .msg-bubble {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: var(--text-primary);
  border-bottom-right-radius: 4px;
}

.msg-bot .msg-bubble {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  border-bottom-left-radius: 4px;
}

/* Typing */
.typing-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 18px !important;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* Commands */
.chat-commands {
  padding: 14px 16px;
  border-top: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
}

.cmd-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cmd-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cmd-btn {
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.06);
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.cmd-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
}

.cmd-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
  color: white;
}

.cmd-btn.done {
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.cmd-btn.done::after {
  content: '✓';
  font-size: 10px;
}

.cmd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cmd-btn i {
  font-size: 13px;
}

/* ========= PREVIEW SIDE ========= */
.preview-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 20px 12px;
  transition-delay: 0.2s;
}

.browser-frame {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.5s ease;
}

.browser-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-subtle);
}

.browser-dots {
  display: flex;
  gap: 6px;
}

.browser-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.browser-dots span:nth-child(1) {
  background: #f43f5e;
}
.browser-dots span:nth-child(2) {
  background: #f59e0b;
}
.browser-dots span:nth-child(3) {
  background: #10b981;
}

.browser-url {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--text-muted);
}

.browser-url i {
  color: #10b981;
  font-size: 10px;
}

.browser-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Build animation */
.build-animation {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px;
}

.build-spinner {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #6366f1;
  border-right-color: #06b6d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.build-spinner i {
  font-size: 36px;
  color: #818cf8;
  animation: pulse-code 2s ease-in-out infinite;
}

@keyframes pulse-code {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.build-text {
  font-family: var(--font-mono);
  font-size: 20px;
  color: var(--text-secondary);
  font-weight: 600;
}

.build-progress {
  width: 300px;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.build-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #06b6d4);
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
}

.build-log {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 16px;
}

.log-line {
  color: var(--text-muted);
  animation: log-in 0.3s ease;
}

@keyframes log-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.log-check {
  color: #10b981;
  margin-right: 6px;
}

/* Placeholder */
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #818cf8;
  animation: point-left 2s ease-in-out infinite;
}

@keyframes point-left {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-10px);
  }
}

.placeholder p {
  font-size: 14px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
}

/* Iframe */
.preview-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: white;
  border: none;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

/* Mobile */
@media (max-width: 900px) {
  .layout {
    flex-direction: column;
  }

  .chat-side {
    width: 100%;
    min-width: auto;
    padding: 12px 12px 0;
    max-height: 45%;
  }

  .preview-side {
    padding: 0 12px 12px;
    flex: 1;
    min-height: 0;
  }
}

@media (max-width: 600px) {
  .chat-side {
    max-height: 50%;
    padding: 8px 8px 0;
  }

  .preview-side {
    padding: 0 8px 8px;
  }

  .msg-bubble {
    font-size: 12px;
    padding: 8px 12px;
  }

  .cmd-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .cmd-label {
    font-size: 10px;
    margin-bottom: 6px;
  }

  .chat-header {
    padding: 10px 12px;
  }

  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    font-size: 13px;
  }

  .chat-messages {
    padding: 10px;
    gap: 10px;
  }

  .chat-commands {
    padding: 10px 10px;
  }

  .msg-avatar {
    width: 26px;
    height: 26px;
    font-size: 12px;
    border-radius: 8px;
  }

  .browser-bar {
    padding: 8px 12px;
    gap: 8px;
  }

  .browser-dots span {
    width: 8px;
    height: 8px;
  }

  .browser-url {
    font-size: 11px;
    padding: 6px 10px;
  }

  .build-text {
    font-size: 14px;
  }

  .build-progress {
    width: 200px;
  }

  .build-log {
    font-size: 12px;
  }

  .build-spinner {
    width: 60px;
    height: 60px;
  }

  .build-spinner i {
    font-size: 24px;
  }

  .placeholder-icon {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }

  .placeholder p {
    font-size: 12px;
  }
}
</style>
