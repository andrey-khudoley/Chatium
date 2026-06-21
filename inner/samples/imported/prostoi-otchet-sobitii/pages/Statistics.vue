<template>
  <div class="statistics-page">
    <div v-if="loading" class="loading">Загрузка статистики...</div>

    <div v-if="!loading" class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ formatNumber(stats.unique_users) }}</div>
          <div class="stat-label">Уникальные пользователи</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon visits-icon">
          <i class="fas fa-eye"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ formatNumber(stats.total_visits) }}</div>
          <div class="stat-label">Всего посещений</div>
        </div>
      </div>
    </div>

    <div v-if="!loading && stats.total_visits > 0" class="stats-details">
      <div class="detail-card">
        <h3>Подробности</h3>
        <div class="detail-row">
          <span class="detail-label">Среднее количество посещений на пользователя:</span>
          <span class="detail-value">{{ formatNumber(averageVisitsPerUser) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Период анализа:</span>
          <span class="detail-value">{{ formatDate(dateFrom) }} - {{ formatDate(dateTo) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiStatisticsRoute } from '../api/traffic'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const loading = ref(false)
const stats = ref({
  unique_users: 0,
  total_visits: 0
})

const averageVisitsPerUser = computed(() => {
  if (stats.value.unique_users === 0) return 0
  return (stats.value.total_visits / stats.value.unique_users).toFixed(1)
})

const dateFrom = computed(() => props.filters.dateFrom)
const dateTo = computed(() => props.filters.dateTo)

async function loadStatistics() {
  try {
    loading.value = true
    const queryParams = {
      dateFrom: props.filters.dateFrom,
      dateTo: props.filters.dateTo,
      url: props.filters.url,
      userId: props.filters.userId
    }

    const response = await apiStatisticsRoute.query(queryParams).run(ctx)

    if (response.rows && response.rows.length > 0) {
      stats.value = response.rows[0]
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
    stats.value = { unique_users: 0, total_visits: 0 }
  } finally {
    loading.value = false
  }
}

function formatNumber(num) {
  return new Intl.NumberFormat('ru-RU').format(num || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

// Загружаем статистику при изменении фильтров
watch(() => props.filters, loadStatistics, { deep: true })

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.statistics-page {
  padding: 20px 0;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #4a5568;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.stat-card {
  background: transparent;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 60px;
  height: 60px;
  background: #e6fffa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #319795;
}

.visits-icon {
  background: #ebf8ff;
  color: #3182ce;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 16px;
  font-weight: 500;
  color: #4a5568;
}

.stats-details {
  margin-top: 30px;
}

.detail-card {
  background: transparent;
  padding: 24px;
}

.detail-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 20px 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f7fafc;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #4a5568;
}

.detail-value {
  font-weight: 600;
  color: #2d3748;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 20px;
  }

  .stat-number {
    font-size: 28px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
