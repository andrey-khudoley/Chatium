<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-30 border-b border-wr-border">
      <div class="px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="admin-btn-subtle w-10 h-10 rounded-lg flex items-center justify-center"
          >
            <i class="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 class="wr-text-primary font-bold text-xl">Создание автовебинара</h1>
            <p class="wr-text-tertiary text-sm mt-0.5">Настройте параметры автовебинара</p>
          </div>
        </div>
      </div>
    </header>

    <main class="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Основные настройки -->
        <div class="glass rounded-xl p-5 space-y-4">
          <h2 class="wr-text-primary font-semibold text-lg">Основные настройки</h2>

          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-1">Название *</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              placeholder="Название автовебинара"
            />
          </div>

          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-1">Описание</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              placeholder="Описание"
            ></textarea>
          </div>

          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-1"
              >Комната ожидания (секунды)</label
            >
            <input
              v-model.number="form.waitingRoomDuration"
              type="number"
              min="0"
              class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
            />
          </div>
        </div>

        <!-- Видео -->
        <div class="glass rounded-xl p-5 space-y-4">
          <h2 class="wr-text-primary font-semibold text-lg">Видео</h2>

          <MuuveeVideoUploader
            v-model="videoData"
            :videoInfo="videoInfo"
            :muuveeVideoId="muuveeVideoId"
            :kinescopeVideoId="kinescopeVideoId"
            @update:videoInfo="handleVideoInfoUpdate"
            @update:muuveeVideoId="muuveeVideoId = $event"
            @update:kinescopeVideoId="kinescopeVideoId = $event"
          />
        </div>

        <!-- Фейковый онлайн -->
        <div class="glass rounded-xl p-5 space-y-4">
          <h2 class="wr-text-primary font-semibold text-lg">Фейковый онлайн</h2>
          <p v-if="form.duration === 0" class="wr-text-tertiary text-sm">
            <i class="fas fa-info-circle mr-1.5"></i>Выберите видео, чтобы настроить график
            фейкового онлайна
          </p>
          <OnlineChartEditor
            v-else
            :key="'chart-' + (videoData || 'none') + '-' + form.duration"
            v-model="form.fakeOnlineConfig"
            :duration="Math.floor(form.duration / 60)"
          />
        </div>

        <!-- Настройки завершения -->
        <div class="glass rounded-xl p-5 space-y-4">
          <h2 class="wr-text-primary font-semibold text-lg">После завершения</h2>
          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-1">Действие</label>
            <CustomSelect
              v-model="form.finishAction"
              :options="[
                { value: 'page', label: 'Показать страницу' },
                { value: 'redirect', label: 'Редирект' }
              ]"
              size="lg"
            />
          </div>
          <div v-if="form.finishAction === 'redirect'">
            <label class="block wr-text-secondary text-sm font-medium mb-2"
              >Ссылка для редиректа</label
            >
            <input
              v-model="form.resultUrl"
              type="url"
              placeholder="https://..."
              class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
            />
            <p class="wr-text-tertiary text-xs mt-1">
              Зрители будут автоматически перенаправлены на этот URL после завершения автовебинара
            </p>
          </div>
          <div v-if="form.finishAction === 'page'" class="space-y-4">
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1"
                >Текст после завершения</label
              >
              <textarea
                v-model="form.resultText"
                rows="2"
                placeholder="Спасибо за просмотр!"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary resize-none"
              ></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-1">Текст кнопки</label>
                <input
                  v-model="form.resultButtonText"
                  type="text"
                  placeholder="Подробнее"
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
                />
              </div>
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-1"
                  >Ссылка кнопки</label
                >
                <input
                  v-model="form.resultUrl"
                  type="url"
                  placeholder="https://..."
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="btn-primary text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2"
          >
            <i v-if="saving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-save"></i>
            Создать
          </button>
          <button
            type="button"
            @click="goBack"
            class="admin-btn-subtle px-6 py-3 rounded-xl font-medium"
          >
            Отмена
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { apiAutowebinarCreateRoute } from '../../api/autowebinars'
import MuuveeVideoUploader from '../../components/admin/MuuveeVideoUploader.vue'
import OnlineChartEditor from '../../components/admin/OnlineChartEditor.vue'
import CustomSelect from '../../components/CustomSelect.vue'

const saving = ref(false)
const videoInfo = ref(null)
const videoData = ref(null) // videoHash (string)
const muuveeVideoId = ref(null) // ID видео в Muuvee (если выбрано из Muuvee)
const kinescopeVideoId = ref(null) // ID видео в Kinescope (если возвращает listVideos)

const form = reactive({
  title: '',
  description: '',
  duration: 0,
  waitingRoomDuration: 300,
  fakeOnlineConfig: [],
  finishAction: 'page',
  resultUrl: '',
  resultText: '',
  resultButtonText: '',
  chatAccessMode: 'open'
})

function goBack() {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', {
      detail: { section: 'autowebinars', autowebinarId: null, mainTab: 'autowebinars' }
    })
  )
}

function handleVideoInfoUpdate(info) {
  videoInfo.value = info
  if (info) {
    form.duration = Math.floor(info.duration || 0)

    // Автозаполнение названия
    if (info.title && !form.title) {
      form.title = info.title
    }

    // Сброс графика при смене видео
    form.fakeOnlineConfig = []
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    const aw = await apiAutowebinarCreateRoute.run(ctx, {
      title: form.title,
      description: form.description || undefined,
      duration: form.duration,
      waitingRoomDuration: form.waitingRoomDuration || 0,
      videoHash: videoData.value || undefined,
      muuveeVideoId: muuveeVideoId.value || undefined,
      kinescopeVideoId: kinescopeVideoId.value || undefined,
      fakeOnlineConfig: form.fakeOnlineConfig || [],
      finishAction: form.finishAction,
      resultUrl: form.resultUrl || undefined,
      resultText: form.resultText || undefined,
      resultButtonText: form.resultButtonText || undefined,
      chatAccessMode: form.chatAccessMode
    })
    window.dispatchEvent(
      new CustomEvent('admin-navigate', {
        detail: { section: 'autowebinars', autowebinarId: aw.id, mainTab: 'autowebinars' }
      })
    )
  } catch (e) {
    alert(e.message)
  }
  saving.value = false
}
</script>

<style scoped>
.admin-btn-subtle {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  border: 1px solid var(--wr-btn-subtle-border);
}
.admin-btn-subtle:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
</style>
