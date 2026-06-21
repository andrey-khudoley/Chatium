<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--wr-bg)">
    <div class="max-w-3xl w-full">
      <!-- Главная карточка -->
      <div
        class="rounded-3xl overflow-hidden"
        style="
          background: var(--wr-bg-card);
          border: 1px solid var(--wr-border);
          box-shadow: var(--wr-card-shadow);
        "
      >
        <!-- Заголовок с градиентом -->
        <div class="relative overflow-hidden hero-gradient">
          <div class="hero-pattern"></div>
          <div class="relative p-8 sm:p-12 text-center">
            <div
              class="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-primary glow-primary-sm"
            >
              <i class="fas fa-rocket text-white text-3xl"></i>
            </div>
            <h1 class="wr-text-primary font-bold text-3xl sm:text-4xl mb-3">
              Добро пожаловать! 👋
            </h1>
            <p class="wr-text-secondary text-lg mb-2">
              Для начала работы давайте подключим пару полезных плагинов
            </p>
            <p class="wr-text-tertiary text-sm">Это займёт всего пару минут ⚡</p>
          </div>
        </div>

        <!-- Контент -->
        <div class="p-6 sm:p-8">
          <div class="space-y-4 mb-8">
            <!-- Kinescope -->
            <div
              v-if="!pluginsStatus.kinescope.installed || !pluginsStatus.kinescope.configured"
              class="plugin-card group"
            >
              <div class="flex items-start gap-4">
                <div class="plugin-icon plugin-icon-primary">
                  <i class="fas fa-video text-primary text-2xl"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="wr-text-primary font-bold text-xl">Kinescope</h3>
                    <span
                      v-if="
                        pluginsStatus.kinescope.installed && !pluginsStatus.kinescope.configured
                      "
                      class="plugin-badge-primary"
                    >
                      <i class="fas fa-wrench"></i>
                      Настройка
                    </span>
                  </div>
                  <p class="wr-text-secondary text-sm leading-relaxed mb-4">
                    С этим плагином вы сможете проводить
                    <strong class="wr-text-primary">живые трансляции</strong> 🎥 прямо из вашей
                    комнаты.
                    <span v-if="!pluginsStatus.kinescope.installed"
                      >Просто установите плагин и укажите API ключ — всё готово!</span
                    >
                    <span v-else
                      >Осталось только указать API ключ в настройках, и можно начинать!</span
                    >
                  </p>
                  <a
                    :href="
                      pluginsStatus.kinescope.installed
                        ? '/app/kinescope'
                        : '/app/store/~/kinescope'
                    "
                    target="_blank"
                    class="plugin-button plugin-button-primary"
                  >
                    <i
                      :class="pluginsStatus.kinescope.installed ? 'fas fa-cog' : 'fas fa-download'"
                    ></i>
                    {{
                      pluginsStatus.kinescope.installed ? 'Настроить плагин' : 'Установить плагин'
                    }}
                    <i class="fas fa-arrow-right text-xs"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Muuvee -->
            <div v-if="!pluginsStatus.muuvee.installed" class="plugin-card group">
              <div class="flex items-start gap-4">
                <div class="plugin-icon plugin-icon-secondary">
                  <i class="fas fa-robot text-secondary text-2xl"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="wr-text-primary font-bold text-xl mb-2">Muuvee</h3>
                  <p class="wr-text-secondary text-sm leading-relaxed mb-4">
                    Этот плагин поможет вам создавать
                    <strong class="wr-text-primary">автоматические вебинары</strong> 🤖 которые
                    работают без вашего участия 24/7!
                  </p>
                  <a
                    href="/app/store/~/muuvee"
                    target="_blank"
                    class="plugin-button plugin-button-secondary"
                  >
                    <i class="fas fa-download"></i>
                    Установить плагин
                    <i class="fas fa-arrow-right text-xs"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Knowledge Base -->
            <div v-if="!pluginsStatus.knowledge.installed" class="plugin-card group">
              <div class="flex items-start gap-4">
                <div class="plugin-icon plugin-icon-accent">
                  <i class="fas fa-book text-accent text-2xl"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="wr-text-primary font-bold text-xl mb-2">База знаний</h3>
                  <p class="wr-text-secondary text-sm leading-relaxed mb-4">
                    Этот плагин нужен для работы с контентом и AI-функциями вебинарной комнаты.
                    Установите его одним кликом.
                  </p>
                  <button
                    type="button"
                    :disabled="installingKnowledge"
                    class="plugin-button plugin-button-accent"
                    @click="installKnowledgePlugin"
                  >
                    <i
                      :class="installingKnowledge ? 'fas fa-spinner fa-spin' : 'fas fa-download'"
                    ></i>
                    {{ installingKnowledge ? 'Устанавливаем...' : 'Установить плагин' }}
                    <i class="fas fa-arrow-right text-xs"></i>
                  </button>
                  <p v-if="knowledgeInstallError" class="wr-status-red text-xs mt-2">
                    {{ knowledgeInstallError }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Кнопка проверки -->
          <div class="text-center pt-4">
            <button @click="checkAgain" :disabled="checking" class="check-button">
              <i :class="checking ? 'fas fa-spinner fa-spin' : 'fas fa-sync'"></i>
              <span>{{ checking ? 'Проверяем...' : 'Проверить снова' }}</span>
            </button>
          </div>

          <!-- Подсказка -->
          <div class="mt-8 pt-6" style="border-top: 1px solid var(--wr-border)">
            <div class="text-center">
              <div
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style="background: var(--wr-input-bg)"
              >
                <div class="hint-icon">
                  <i class="fas fa-lightbulb text-primary text-sm"></i>
                </div>
                <p class="wr-text-secondary text-sm">
                  После установки нажмите
                  <strong class="wr-text-primary">«Проверить снова»</strong> — и вы окажетесь в
                  админке!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PluginsStatus } from '../../api/plugins-check'
import { apiInstallKnowledgePluginRoute } from '../../api/plugins-check'

const props = defineProps<{
  pluginsStatus: PluginsStatus
}>()

const checking = ref(false)
const installingKnowledge = ref(false)
const knowledgeInstallError = ref('')

async function installKnowledgePlugin() {
  installingKnowledge.value = true
  knowledgeInstallError.value = ''
  try {
    await apiInstallKnowledgePluginRoute.run(ctx, {})
    window.location.reload()
  } catch (e) {
    knowledgeInstallError.value = e instanceof Error ? e.message : 'Не удалось установить плагин'
  }
  installingKnowledge.value = false
}

async function checkAgain() {
  checking.value = true
  // Просто перезагружаем страницу - проверка произойдёт на сервере
  window.location.reload()
}
</script>

<style scoped>
.hero-gradient {
  background: linear-gradient(
    135deg,
    rgba(248, 0, 91, 0.1) 0%,
    rgba(99, 102, 241, 0.08) 50%,
    rgba(6, 182, 212, 0.08) 100%
  );
}

.hero-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.03) 10px,
    rgba(255, 255, 255, 0.03) 20px
  );
}

.plugin-card {
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  background: var(--wr-input-bg);
  border: 1px solid var(--wr-border);
}

.plugin-card:hover {
  transform: scale(1.02);
  border-color: rgba(248, 0, 91, 0.2);
}

.plugin-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.group:hover .plugin-icon {
  transform: scale(1.1);
}

.plugin-icon-primary {
  background: linear-gradient(135deg, rgba(248, 0, 91, 0.15) 0%, rgba(255, 61, 127, 0.1) 100%);
}

.plugin-icon-secondary {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.1) 100%);
}

.plugin-icon-accent {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(14, 165, 233, 0.12) 100%);
}

.plugin-badge-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(248, 0, 91, 0.15);
  color: #f8005b;
}

.theme-light .plugin-badge-primary {
  background: rgba(248, 0, 91, 0.1);
  color: #d90050;
}

.plugin-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  transition: all 0.3s ease;
}

.plugin-button:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.plugin-button-primary {
  background: linear-gradient(135deg, #f8005b 0%, #ff3d7f 100%);
}

.plugin-button-primary:hover {
  box-shadow: 0 10px 25px rgba(248, 0, 91, 0.3);
}

.plugin-button-secondary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.plugin-button-secondary:hover {
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.plugin-button-accent {
  background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
}

.plugin-button-accent:hover {
  box-shadow: 0 10px 25px rgba(14, 165, 233, 0.35);
}

.check-button {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 2rem;
  border-radius: 0.75rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #f8005b 0%, #ff3d7f 100%);
  transition: all 0.3s ease;
}

.check-button:not(:disabled):hover {
  box-shadow: 0 15px 35px rgba(248, 0, 91, 0.3);
  transform: translateY(-2px);
}

.check-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(248, 0, 91, 0.2) 0%, rgba(248, 0, 91, 0.1) 100%);
}
</style>
