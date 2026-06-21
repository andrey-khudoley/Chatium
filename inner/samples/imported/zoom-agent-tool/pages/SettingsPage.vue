<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <i class="fas fa-video text-white text-xl"></i>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Настройки Zoom</h1>
            <p class="text-gray-500">Конфигурация интеграции с Zoom API</p>
          </div>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
          <div>
            <p class="text-blue-800 font-medium mb-1">Как получить API-ключи?</p>
            <p class="text-blue-700 text-sm">
              Создайте приложение в Zoom Marketplace для получения credentials.
              <a
                href="https://marketplace.zoom.us/user/build"
                target="_blank"
                class="underline hover:text-blue-900"
              >
                Перейти в Zoom Marketplace
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-600 mb-4"></i>
        <p class="text-gray-500">Загрузка настроек...</p>
      </div>

      <!-- Settings Form -->
      <div v-else class="bg-white rounded-lg shadow-sm">
        <form @submit.prevent="saveSettings" class="p-6 space-y-8">
          <!-- API Credentials Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-key text-gray-400"></i>
              API Credentials
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Account ID <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="settings.account_id"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите Account ID"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Client ID <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="settings.client_id"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите Client ID"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model="settings.client_secret"
                    :type="showSecret ? 'text' : 'password'"
                    class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите Client Secret"
                    required
                  />
                  <button
                    type="button"
                    @click="showSecret = !showSecret"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i :class="showSecret ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Secret Token
                  <span class="text-gray-400 font-normal">(опционально, для вебхуков)</span>
                </label>
                <div class="relative">
                  <input
                    v-model="settings.secret_token"
                    :type="showToken ? 'text' : 'password'"
                    class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите Secret Token"
                  />
                  <button
                    type="button"
                    @click="showToken = !showToken"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i :class="showToken ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr class="border-gray-200" />

          <!-- Default Settings Section -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-sliders-h text-gray-400"></i>
              Настройки встреч по умолчанию
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"> Тема встречи </label>
                <input
                  v-model="settings.default_topic"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Zoom-встреча"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Заголовок, который будет использоваться по умолчанию для новых встреч
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Повестка встречи
                </label>
                <input
                  v-model="settings.default_agenda"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ZOOM"
                />
                <p class="text-xs text-gray-500 mt-1">Описание/повестка по умолчанию</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Автоматическая запись
                </label>
                <select
                  v-model="settings.default_auto_recording"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">Выключена</option>
                  <option value="local">Локальная запись</option>
                  <option value="cloud">Облачная запись</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">Тип записи по умолчанию для новых встреч</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Часовой пояс по умолчанию
                </label>
                <select
                  v-model="settings.default_timezone"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <optgroup label="Россия">
                    <option value="Europe/Moscow">Europe/Moscow (Москва)</option>
                    <option value="Europe/Samara">Europe/Samara (Самара)</option>
                    <option value="Europe/Yekaterinburg">
                      Europe/Yekaterinburg (Екатеринбург)
                    </option>
                    <option value="Asia/Novosibirsk">Asia/Novosibirsk (Новосибирск)</option>
                    <option value="Asia/Vladivostok">Asia/Vladivostok (Владивосток)</option>
                  </optgroup>
                  <optgroup label="Европа">
                    <option value="Europe/London">Europe/London (Лондон)</option>
                    <option value="Europe/Paris">Europe/Paris (Париж)</option>
                    <option value="Europe/Berlin">Europe/Berlin (Берлин)</option>
                    <option value="Europe/Amsterdam">Europe/Amsterdam (Амстердам)</option>
                    <option value="Europe/Madrid">Europe/Madrid (Мадрид)</option>
                    <option value="Europe/Rome">Europe/Rome (Рим)</option>
                    <option value="Europe/Istanbul">Europe/Istanbul (Стамбул)</option>
                  </optgroup>
                  <optgroup label="Америка">
                    <option value="America/New_York">America/New_York (Нью-Йорк)</option>
                    <option value="America/Chicago">America/Chicago (Чикаго)</option>
                    <option value="America/Denver">America/Denver (Денвер)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (Лос-Анджелес)</option>
                    <option value="America/Toronto">America/Toronto (Торонто)</option>
                    <option value="America/Sao_Paulo">America/Sao_Paulo (Сан-Паулу)</option>
                  </optgroup>
                  <optgroup label="Азия">
                    <option value="Asia/Tokyo">Asia/Tokyo (Токио)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (Шанхай)</option>
                    <option value="Asia/Hong_Kong">Asia/Hong_Kong (Гонконг)</option>
                    <option value="Asia/Singapore">Asia/Singapore (Сингапур)</option>
                    <option value="Asia/Dubai">Asia/Dubai (Дубай)</option>
                    <option value="Asia/Seoul">Asia/Seoul (Сеул)</option>
                  </optgroup>
                  <optgroup label="Другое">
                    <option value="Australia/Sydney">Australia/Sydney (Сидней)</option>
                    <option value="Pacific/Auckland">Pacific/Auckland (Окленд)</option>
                    <option value="UTC">UTC</option>
                  </optgroup>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Часовой пояс по умолчанию для новых встреч (IANA формат)
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4">
            <button
              type="button"
              @click="testConnection"
              :disabled="testing || !canTest"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="testing" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-plug"></i>
              {{ testing ? 'Проверка...' : 'Проверить подключение' }}
            </button>

            <button
              type="submit"
              :disabled="saving"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="saving" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ saving ? 'Сохранение...' : 'Сохранить настройки' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Test Result -->
      <div
        v-if="testResult"
        :class="[
          'mt-4 rounded-lg p-4',
          testResult.success
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        ]"
      >
        <div class="flex items-start gap-3">
          <i
            :class="[
              testResult.success
                ? 'fas fa-check-circle text-green-600'
                : 'fas fa-exclamation-circle text-red-600',
              'mt-0.5'
            ]"
          ></i>
          <div>
            <p
              :class="
                testResult.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'
              "
            >
              {{ testResult.success ? 'Подключение успешно!' : 'Ошибка подключения' }}
            </p>
            <p
              v-if="testResult.message"
              :class="testResult.success ? 'text-green-700 text-sm' : 'text-red-700 text-sm'"
            >
              {{ testResult.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Save Result -->
      <div
        v-if="saveResult"
        :class="[
          'mt-4 rounded-lg p-4',
          saveResult.success
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        ]"
      >
        <div class="flex items-start gap-3">
          <i
            :class="[
              saveResult.success
                ? 'fas fa-check-circle text-green-600'
                : 'fas fa-exclamation-circle text-red-600',
              'mt-0.5'
            ]"
          ></i>
          <div>
            <p
              :class="
                saveResult.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'
              "
            >
              {{ saveResult.success ? 'Настройки сохранены!' : 'Ошибка сохранения' }}
            </p>
            <p
              v-if="saveResult.message"
              :class="saveResult.success ? 'text-green-700 text-sm' : 'text-red-700 text-sm'"
            >
              {{ saveResult.message }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiSettingsGetRoute } from '../api/settings/get'
import { apiSettingsSaveRoute } from '../api/settings/save'
import { apiZoomTestRoute } from '../api/zoom/test'

interface Settings {
  account_id: string
  client_id: string
  client_secret: string
  secret_token: string
  default_topic: string
  default_agenda: string
  default_auto_recording: 'none' | 'local' | 'cloud'
  default_timezone: string
}

const settings = ref<Settings>({
  account_id: '',
  client_id: '',
  client_secret: '',
  secret_token: '',
  default_topic: 'Zoom-встреча',
  default_agenda: 'ZOOM',
  default_auto_recording: 'cloud',
  default_timezone: 'Europe/Moscow'
})

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const showSecret = ref(false)
const showToken = ref(false)
const testResult = ref<{ success: boolean; message?: string } | null>(null)
const saveResult = ref<{ success: boolean; message?: string } | null>(null)

const canTest = computed(() => {
  return settings.value.account_id && settings.value.client_id && settings.value.client_secret
})

async function loadSettings() {
  try {
    const result = await apiSettingsGetRoute.run(ctx)
    settings.value = {
      ...settings.value,
      ...result,
      default_auto_recording: result.default_auto_recording as 'none' | 'local' | 'cloud'
    }
  } catch (error: any) {
    console.error('Failed to load settings:', error)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  saveResult.value = null

  try {
    await apiSettingsSaveRoute.run(ctx, {
      account_id: settings.value.account_id,
      client_id: settings.value.client_id,
      client_secret: settings.value.client_secret,
      secret_token: settings.value.secret_token,
      default_topic: settings.value.default_topic,
      default_agenda: settings.value.default_agenda,
      default_auto_recording: settings.value.default_auto_recording as 'none' | 'local' | 'cloud',
      default_timezone: settings.value.default_timezone
    })

    saveResult.value = {
      success: true,
      message: 'Настройки успешно сохранены в базе данных.'
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      saveResult.value = null
    }, 3000)
  } catch (error: any) {
    saveResult.value = {
      success: false,
      message: error.message || 'Не удалось сохранить настройки'
    }
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  testResult.value = null

  try {
    // First save current settings
    await apiSettingsSaveRoute.run(ctx, {
      account_id: settings.value.account_id,
      client_id: settings.value.client_id,
      client_secret: settings.value.client_secret,
      secret_token: settings.value.secret_token,
      default_topic: settings.value.default_topic,
      default_agenda: settings.value.default_agenda,
      default_auto_recording: settings.value.default_auto_recording as 'none' | 'local' | 'cloud',
      default_timezone: settings.value.default_timezone
    })

    // Then test the connection
    const result = await apiZoomTestRoute.run(ctx)

    testResult.value = {
      success: result.success,
      message: result.message
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || 'Ошибка при проверке подключения'
    }
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>
