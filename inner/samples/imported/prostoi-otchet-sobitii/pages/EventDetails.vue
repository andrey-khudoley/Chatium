<template>
  <div class="event-details">
    <div class="header">
      <div class="back-navigation">
        <a :href="indexPageRoute.url()" class="back-link">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M12 19L5 12L12 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Назад к отчетам
        </a>
      </div>
      <h1 class="title">Детали события</h1>
    </div>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-if="error" class="error-banner">
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" />
        </svg>
        <div class="error-text">
          <div class="error-title">Ошибка загрузки</div>
          <div class="error-description">{{ error }}</div>
        </div>
      </div>
    </div>

    <div v-if="event && !loading" class="main-container">
      <div class="two-column-layout">
        <!-- Левая колонка с деталями -->
        <div class="left-column">
          <div class="details-grid">
            <!-- Основная информация -->
            <div class="detail-section">
              <h3>Основная информация</h3>
              <div class="detail-item">
                <span class="label">Время события:</span>
                <span class="value">{{ formatDateTime(event.ts) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">URL:</span>
                <span class="value url-value">{{ event.url }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Путь URL:</span>
                <span class="value url-value">{{ event.urlPath }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Дата (dt):</span>
                <span class="value">{{ event.dt }}</span>
              </div>
              <div class="detail-item" v-if="event.action">
                <span class="label">Действие (action):</span>
                <span class="value action-value">{{ event.action }}</span>
              </div>
              <div class="detail-item" v-if="event.action_param1">
                <span class="label">Action Param 1:</span>
                <span class="value action-value">{{ event.action_param1 }}</span>
              </div>
              <div class="detail-item" v-if="event.action_param2">
                <span class="label">Action Param 2:</span>
                <span class="value action-value">{{ event.action_param2 }}</span>
              </div>
              <div class="detail-item" v-if="event.action_param3">
                <span class="label">Action Param 3:</span>
                <span class="value action-value">{{ event.action_param3 }}</span>
              </div>
            </div>

            <!-- Пользователь -->
            <div class="detail-section">
              <h3>Информация о пользователе</h3>
              <div class="detail-item">
                <span class="label">ID пользователя:</span>
                <span class="value">{{ event.resolved_user_id || 'Не определен' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Имя:</span>
                <span class="value">{{ event.user_first_name || 'Не указано' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Фамилия:</span>
                <span class="value">{{ event.user_last_name || 'Не указано' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Тип пользователя:</span>
                <span class="value">{{ event.user_type || 'Не определен' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">UID сессии:</span>
                <span class="value">{{ event.uid }}</span>
              </div>
            </div>

            <!-- Дополнительные блоки только для событий с URL начинающимся с https -->
            <template v-if="event.url && event.url.startsWith('https')">
              <!-- Техническая информация -->
              <div class="detail-section">
                <h3>Техническая информация</h3>
                <div class="detail-item">
                  <span class="label">User Agent:</span>
                  <span class="value">{{ event.user_agent || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Тип устройства:</span>
                  <span class="value">{{ event.ua_device_type || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Бренд устройства:</span>
                  <span class="value">{{ event.ua_device_brand || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">ОС:</span>
                  <span class="value">{{ event.os_name || 'Не определена' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Браузер:</span>
                  <span class="value">{{ event.ua_client_name || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">IP адрес:</span>
                  <span class="value">{{ event.ip || 'Не определен' }}</span>
                </div>
              </div>

              <!-- Геолокация -->
              <div class="detail-section">
                <h3>Геолокация</h3>
                <div class="detail-item">
                  <span class="label">Страна:</span>
                  <span class="value">{{ event.location_country || 'Не определена' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Город:</span>
                  <span class="value">{{ event.location_city || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Регион:</span>
                  <span class="value">{{ event.location_region || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Широта:</span>
                  <span class="value">{{
                    event.location_coordinates_latitude || 'Не определена'
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Долгота:</span>
                  <span class="value">{{
                    event.location_coordinates_longitude || 'Не определена'
                  }}</span>
                </div>
              </div>

              <!-- HTTP информация -->
              <div class="detail-section">
                <h3>HTTP информация</h3>
                <div class="detail-item">
                  <span class="label">HTTP метод:</span>
                  <span class="value">{{ event.http_method || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Referer:</span>
                  <span class="value">{{ event.referer || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Accept Language:</span>
                  <span class="value">{{ event.accept_language || 'Не определен' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status Code:</span>
                  <span class="value">{{ event.status_code || 'Не определен' }}</span>
                </div>
              </div>
            </template>

            <!-- UTM параметры -->
            <div class="detail-section" v-if="hasUtmData">
              <h3>UTM параметры</h3>
              <div class="detail-item" v-if="event.utm_source">
                <span class="label">UTM Source:</span>
                <span class="value">{{ event.utm_source }}</span>
              </div>
              <div class="detail-item" v-if="event.utm_medium">
                <span class="label">UTM Medium:</span>
                <span class="value">{{ event.utm_medium }}</span>
              </div>
              <div class="detail-item" v-if="event.utm_campaign">
                <span class="label">UTM Campaign:</span>
                <span class="value">{{ event.utm_campaign }}</span>
              </div>
              <div class="detail-item" v-if="event.utm_term">
                <span class="label">UTM Term:</span>
                <span class="value">{{ event.utm_term }}</span>
              </div>
              <div class="detail-item" v-if="event.utm_content">
                <span class="label">UTM Content:</span>
                <span class="value">{{ event.utm_content }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Правая колонка с JSON -->
        <div class="right-column">
          <div class="json-section">
            <h3>JSON события</h3>
            <div class="json-container">
              <pre class="json-content">{{ JSON.stringify(event, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiEventDetailsRoute } from '../api/traffic'
import { indexPageRoute } from '../index'

// Получаем ID события из URL
const eventId = new URLSearchParams(window.location.search).get('id')

// Реактивные данные
const loading = ref(true)
const error = ref('')
const event = ref(null)

// Computed свойства
const hasUtmData = computed(() => {
  return (
    event.value &&
    (event.value.utm_source ||
      event.value.utm_medium ||
      event.value.utm_campaign ||
      event.value.utm_term ||
      event.value.utm_content)
  )
})

// Методы
function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('ru-RU')
}

async function loadEventDetails() {
  if (!eventId) {
    error.value = 'ID события не указан'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''

    const response = await apiEventDetailsRoute.run(ctx, { id: eventId })

    if (!response.success) {
      throw new Error(response.error || 'Событие не найдено')
    }

    event.value = response.event
  } catch (err) {
    console.error('Ошибка загрузки события:', err)
    error.value = err.message || 'Не удалось загрузить событие'
  } finally {
    loading.value = false
  }
}

// Загрузка данных при монтировании
onMounted(() => {
  loadEventDetails()
})
</script>

<style scoped>
.event-details {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header {
  margin-bottom: 30px;
}

.back-navigation {
  margin-bottom: 16px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4299e1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover {
  color: #3182ce;
}

.title {
  font-size: 32px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #4a5568;
}

.error-banner {
  background: #fed7d7;
  border: 1px solid #feb2b2;
  border-radius: 8px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.error-icon {
  width: 20px;
  height: 20px;
  color: #e53e3e;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-text {
  flex: 1;
}

.error-title {
  font-weight: 600;
  color: #742a2a;
  margin-bottom: 4px;
}

.error-description {
  color: #9b2c2c;
  font-size: 14px;
  line-height: 1.4;
}

.main-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.two-column-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.left-column {
  min-width: 0;
}

.right-column {
  min-width: 0;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.detail-section,
.json-section {
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.json-section {
  height: fit-content;
  position: sticky;
  top: 20px;
}

.json-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.json-container {
  background: #1a1a1a;
  border-radius: 6px;
  overflow: auto;
  max-height: 80vh;
}

.json-content {
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #4a5568;
  min-width: 140px;
  flex-shrink: 0;
}

.value {
  color: #2d3748;
  word-break: break-all;
  text-align: right;
  flex: 1;
  margin-left: 16px;
}

.url-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.code-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: #edf2f7;
  padding: 4px 6px;
  border-radius: 4px;
}

.action-value {
  color: #38a169;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }

  .json-section {
    position: static;
  }
}

@media (max-width: 768px) {
  .event-details {
    padding: 15px;
  }

  .main-container {
    padding: 20px;
  }

  .detail-section,
  .json-section {
    padding: 16px;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .value {
    margin-left: 0;
    margin-top: 4px;
    text-align: left;
  }

  .json-container {
    max-height: 60vh;
  }
}
</style>
