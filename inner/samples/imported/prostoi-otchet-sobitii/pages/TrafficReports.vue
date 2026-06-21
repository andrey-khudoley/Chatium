<template>
  <div class="traffic-reports">
    <div class="header">
      <div class="header-top">
        <h1 class="title">Отчеты по трафику сайта</h1>
      </div>

      <!-- Вкладки -->
      <div class="tabs-container">
        <div class="tabs">
          <button
            :class="['tab', { active: activeTab === 'events' }]"
            @click="activeTab = 'events'"
          >
            События
          </button>
          <button
            :class="['tab', { active: activeTab === 'statistics' }]"
            @click="activeTab = 'statistics'"
          >
            Статистика
          </button>
        </div>
      </div>

      <!-- Фильтры -->
      <div class="filters-panel">
        <div class="filter-group">
          <label>Дата события:</label>
          <div class="date-inputs">
            <input
              type="date"
              v-model="filters.dateFrom"
              class="date-input"
              @change="onFiltersChange"
            />
            <span>до</span>
            <input
              type="date"
              v-model="filters.dateTo"
              class="date-input"
              @change="onFiltersChange"
            />
          </div>
        </div>

        <div class="filter-group">
          <label>URL события:</label>
          <input
            type="text"
            v-model="filters.url"
            class="url-input"
            placeholder="Введите начало URL..."
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="filter-group">
          <label>ID пользователя:</label>
          <input
            type="text"
            v-model="filters.userId"
            class="url-input"
            placeholder="Введите ID, имя или email пользователя..."
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="filter-buttons">
          <button @click="applyFilters" class="apply-btn">Применить</button>
          <button @click="clearSearchFilters" class="clear-btn">Сбросить</button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="error-banner">
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" />
        </svg>
        <div class="error-text">
          <div class="error-title">Ошибка загрузки данных</div>
          <div class="error-description">{{ errorMessage }}</div>
        </div>
        <button @click="clearError" class="error-close">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Вкладка статистики -->
    <div v-if="activeTab === 'statistics'" class="main-container">
      <Statistics :filters="filters" />
    </div>

    <div v-if="activeTab === 'events'" class="main-container">
      <div v-if="loading" class="loading">Загрузка...</div>

      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <Pagination
          :total="pagination.total"
          :currentPage="pagination.currentPage"
          :pageSize="pagination.pageSize"
          @page-change="handlePageChange"
        />
      </div>

      <div v-if="!loading" class="report-section">
        <div class="table-wrapper">
          <table class="reports-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>URL / События</th>
                <th>Пользователь</th>
                <th>Инфо</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="visit in recentVisits" :key="visit.id">
                <!-- Parent row (https:// events) -->
                <tr
                  :class="[
                    'parent-row',
                    { 'event-row': visit.url && visit.url.startsWith('event://') }
                  ]"
                >
                  <td>
                    <div class="time-cell">
                      <div class="date-line">{{ formatDate(visit.ts) }}</div>
                      <div class="time-line">
                        <a :href="getEventDetailsUrl(visit.id)" class="event-link">{{
                          formatTime(visit.ts)
                        }}</a>
                      </div>
                    </div>
                  </td>
                  <td class="url-cell parent-url-cell">
                    <div class="parent-url">
                      <i
                        v-if="visit.url && visit.url.startsWith('event://')"
                        class="fas fa-bolt event-icon"
                      ></i>
                      <i v-else class="fas fa-globe parent-icon"></i>
                      {{ visit.url }}
                    </div>
                    <div v-if="visit.action || hasActionParams(visit)" class="action-info">
                      <div v-if="visit.action" class="action-name">{{ visit.action }}</div>
                      <div class="action-params">
                        <div v-if="visit.action_param1" class="action-param">
                          action_param1: {{ visit.action_param1 }}
                        </div>
                        <div v-if="visit.action_param2" class="action-param">
                          action_param2: {{ visit.action_param2 }}
                        </div>
                        <div v-if="visit.action_param3" class="action-param">
                          action_param3: {{ visit.action_param3 }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="user-cell">
                    <div class="user-name">{{ visit.user_name || 'Анонимный' }}</div>
                    <div
                      v-if="visit.user_account_role && visit.user_account_role !== 'None'"
                      class="user-role"
                    >
                      Роль: {{ visit.user_account_role }}
                    </div>
                    <div v-if="visit.resolved_user_id" class="user-id">
                      ID:
                      <a
                        href="#"
                        @click.prevent="filterByUserId(visit.resolved_user_id)"
                        class="user-id-link"
                      >
                        {{ visit.resolved_user_id }}
                      </a>
                    </div>
                    <div v-if="visit.user_email" class="user-email">
                      Email:
                      <a
                        href="#"
                        @click.prevent="filterByUserId(visit.user_email)"
                        class="user-email-link"
                      >
                        {{ visit.user_email }}
                      </a>
                    </div>
                  </td>
                  <td class="device-location-cell">
                    <div v-if="visit.device_info" class="device-info">
                      <i :class="getDeviceIcon(visit.device_info)" class="device-icon"></i>
                      {{ getDeviceInfoWithoutType(visit.device_info) }}
                    </div>
                    <div v-if="visit.location" class="location-info">{{ visit.location }}</div>
                  </td>
                </tr>

                <!-- Child rows (event:// events) -->
                <tr v-for="child in visit.children" :key="child.id" class="child-row event-row">
                  <td>
                    <div class="time-cell child-time-cell">
                      <div class="date-line">{{ formatDate(child.ts) }}</div>
                      <div class="time-line">
                        <a :href="getEventDetailsUrl(child.id)" class="event-link">{{
                          formatTime(child.ts)
                        }}</a>
                      </div>
                    </div>
                  </td>
                  <td class="url-cell child-url-cell">
                    <div class="child-url">
                      <i
                        v-if="child.url && child.url.startsWith('event://')"
                        class="fas fa-bolt event-icon"
                      ></i>
                      <i v-else class="fas fa-globe child-icon"></i>
                      {{ child.url }}
                    </div>
                    <div v-if="child.action || hasActionParams(child)" class="action-info">
                      <div v-if="child.action" class="action-name">{{ child.action }}</div>
                      <div class="action-params">
                        <div v-if="child.action_param1" class="action-param">
                          action_param1: {{ child.action_param1 }}
                        </div>
                        <div v-if="child.action_param2" class="action-param">
                          action_param2: {{ child.action_param2 }}
                        </div>
                        <div v-if="child.action_param3" class="action-param">
                          action_param3: {{ child.action_param3 }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="user-cell child-user-cell">
                    <!-- Empty for child rows to avoid repetition -->
                  </td>
                  <td class="device-location-cell child-device-cell">
                    <!-- Empty for child rows to avoid repetition -->
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div v-if="pagination.total > 0" class="pagination-wrapper">
          <Pagination
            :total="pagination.total"
            :currentPage="pagination.currentPage"
            :pageSize="pagination.pageSize"
            @page-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Pagination from '../components/Pagination.vue'
import Statistics from './Statistics.vue'
import { apiRecentVisitsRoute } from '../api/traffic'
import { indexPageRoute } from '../index'
import { eventDetailsPageRoute } from '../index'

// Реактивные данные
const loading = ref(false)
const errorMessage = ref('')

// Активная вкладка
const activeTab = ref('events')

// Фильтры
const filters = reactive({
  dateFrom: getDateWeekAgo(),
  dateTo: getTodayDate(),
  url: '',
  userId: ''
})

// Данные отчетов
const recentVisits = ref([])

// Пагинация
const pagination = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 20
})

// Методы для получения дат по умолчанию
function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function getDateWeekAgo() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString().split('T')[0]
}

// Функция очистки ошибки
function clearError() {
  errorMessage.value = ''
}

// Функция отображения ошибки
function showError(message) {
  errorMessage.value = message
}

// Загрузка данных
async function loadRecentVisits() {
  try {
    loading.value = true
    clearError()
    const queryParams = {
      ...filters,
      page: pagination.currentPage,
      limit: pagination.pageSize
    }
    const response = await apiRecentVisitsRoute.query(queryParams).run(ctx)

    if (!response.rows) {
      throw new Error(response.error || 'Неизвестная ошибка')
    }

    const data = response
    recentVisits.value = data?.rows || []

    // Обновляем данные пагинации
    pagination.total = data?.data?.total || 0
    pagination.currentPage = data?.data?.page || 1
    pagination.pageSize = data?.data?.limit || 20
  } catch (error) {
    console.error('Ошибка загрузки последних посещений:', error)
    showError(error.message || 'Не удалось загрузить последние посещения')
    recentVisits.value = []
  } finally {
    loading.value = false
  }
}

// Обработчики событий
function handlePageChange(page) {
  pagination.currentPage = page
  loadRecentVisits()
}

function onFiltersChange() {
  pagination.currentPage = 1 // Сбрасываем на первую страницу при изменении фильтров
  loadRecentVisits()
}

function applyFilters() {
  pagination.currentPage = 1 // Сбрасываем на первую страницу при применении фильтров
  loadRecentVisits()
}

// Функция сброса поисковых фильтров
function clearSearchFilters() {
  filters.url = ''
  filters.userId = ''
  pagination.currentPage = 1 // Сбрасываем на первую страницу при сбросе фильтров
  loadRecentVisits()
}

// Форматирование данных
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('ru-RU')
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('ru-RU')
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('ru-RU')
}

function formatDuration(seconds) {
  if (!seconds) return '0 сек'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (minutes > 0) {
    return `${minutes} мин ${remainingSeconds} сек`
  }
  return `${remainingSeconds} сек`
}

// Функция для получения ссылки на детальную страницу
function getEventDetailsUrl(eventId) {
  return eventDetailsPageRoute.url() + '?id=' + encodeURIComponent(eventId)
}

// Функция для фильтрации по ID пользователя
function filterByUserId(userId) {
  filters.userId = userId
  pagination.currentPage = 1 // Сбрасываем на первую страницу при фильтрации
  loadRecentVisits()
}

// Функция для получения иконки устройства
function getDeviceIcon(deviceInfo) {
  if (!deviceInfo) return ''

  const lowerDevice = deviceInfo.toLowerCase()
  if (lowerDevice.includes('desktop')) {
    return 'fas fa-desktop'
  } else if (lowerDevice.includes('smartphone') || lowerDevice.includes('mobile')) {
    return 'fas fa-mobile-alt'
  } else if (lowerDevice.includes('tablet')) {
    return 'fas fa-tablet-alt'
  }
  return 'fas fa-desktop' // default to desktop icon
}

// Функция для получения информации об устройстве без типа
function getDeviceInfoWithoutType(deviceInfo) {
  if (!deviceInfo) return ''

  return deviceInfo.replace(/^(desktop|smartphone|tablet)\s*/i, '')
}

// Функция для проверки наличия action параметров
function hasActionParams(visit) {
  return visit.action_param1 || visit.action_param2 || visit.action_param3
}

// Загрузка данных при монтировании компонента
onMounted(() => {
  loadRecentVisits()
})
</script>

<style scoped>
.traffic-reports {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header {
  margin-bottom: 30px;
}

.tabs-container {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 20px;
}

.tab {
  background: none;
  border: none;
  padding: 0;
  font-weight: 400;
  color: #4299e1;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 14px;
  text-decoration: underline;
}

.tab.active {
  font-weight: 600;
  text-decoration: none;
  color: #1a202c;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.title {
  font-size: 32px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.filters-panel {
  background: #f7fafc;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: end;
}

.filter-buttons {
  display: flex;
  gap: 10px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #4a5568;
  font-size: 14px;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input,
.url-input {
  padding: 8px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 14px;
  min-width: 140px;
}

.url-input {
  min-width: 250px;
}

.apply-btn {
  background: #4299e1;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-btn {
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #cbd5e0;
}

.apply-btn:hover {
  background: #3182ce;
}

.main-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.report-section {
  padding: 15px;
}

.report-section h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 20px;
}

.events-count {
  margin-bottom: 16px;
  font-weight: 500;
  color: #4a5568;
}

.table-wrapper {
  overflow-x: auto;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.reports-table th {
  background: #f7fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.reports-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f7fafc;
  font-size: 14px;
  color: #2d3748;
}

/* Parent row styles */
.parent-row {
  background: white;
}

.parent-row:hover {
  background: #f7fafc;
}

.parent-url-cell {
  font-weight: 500;
}

.parent-url {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
}

.parent-icon {
  color: #4299e1;
  font-size: 14px;
}

/* Child row styles */
.child-row {
  background: #faf9f6 !important;
  border-left: 4px solid #4299e1;
}

.child-row:hover {
  background: #f5f5dc !important;
}

.child-time-cell {
  padding-left: 0;
}

.child-url-cell {
  padding-left: 0;
}

.child-url {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #718096;
}

.child-icon {
  color: #f6ad55;
  font-size: 14px;
}

.child-user-cell,
.child-device-cell {
  background: transparent;
  border: none;
}

.event-row {
  background: #faf9f6 !important;
}
.event-row:hover {
  background: #f5f5dc !important;
}

.reports-table tr:hover {
  background: #f7fafc;
}

.url-cell {
  max-width: 300px;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
}

.action-info {
  margin-top: 6px;
  font-size: 13px;
  color: #38a169;
}

.action-name {
  font-weight: 500;
  color: #38a169;
}

.action-params {
  margin-top: 2px;
}

.action-param {
  color: #38a169;
}

.event-link {
  color: #4299e1;
  text-decoration: none;
  transition: color 0.2s;
}

.event-link:hover {
  color: #3182ce;
  text-decoration: underline;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-line {
  font-size: 13px;
}

.user-cell {
  min-width: 150px;
}

.user-name {
  font-weight: 500;
}

.user-id {
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.user-id-link {
  color: #4299e1;
  text-decoration: none;
  transition: color 0.2s;
}

.user-id-link:hover {
  color: #3182ce;
  text-decoration: underline;
}

.user-email {
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.user-email-link {
  color: #4299e1;
  text-decoration: none;
  transition: color 0.2s;
}

.user-email-link:hover {
  color: #3182ce;
  text-decoration: underline;
}

.user-role {
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.device-location-cell {
  min-width: 90px;
}

.device-icon {
  margin-right: 8px;
  color: #4a5568;
  width: 16px;
}

.event-icon {
  color: #f6ad55 !important;
  margin-right: 8px;
  font-size: 14px;
}

.location-info {
  color: #718096;
  font-size: 13px;
  margin-top: 2px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #4a5568;
}

.pagination-wrapper {
  padding: 0 20px;
}

.error-banner {
  background: #fed7d7;
  border: 1px solid #feb2b2;
  border-radius: 8px;
  margin-bottom: 20px;
  animation: slideDown 0.3s ease-out;
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
  min-width: 0;
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
  word-wrap: break-word;
}

.error-close {
  background: none;
  border: none;
  color: #e53e3e;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.error-close:hover {
  background: #feb2b2;
}

.error-close svg {
  width: 16px;
  height: 16px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .traffic-reports {
    padding: 15px;
  }

  .filters-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .date-inputs {
    flex-wrap: wrap;
  }

  .report-section {
    padding: 15px;
  }

  .reports-table {
    font-size: 13px;
  }

  .reports-table th,
  .reports-table td {
    padding: 8px 12px;
  }
}
</style>
