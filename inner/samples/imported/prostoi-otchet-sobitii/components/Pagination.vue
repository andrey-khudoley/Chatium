<template>
  <div class="pagination" v-if="totalPages > 1">
    <div class="pagination-info">
      Показано {{ formatNumber(startItem) }}-{{ formatNumber(endItem) }} из
      {{ formatNumber(total) }} записей
    </div>

    <div class="pagination-controls">
      <button
        @click="goToPage(1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
        title="Первая страница"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M11 17L6 12L11 7M18 17L13 12L18 7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
        title="Предыдущая страница"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          :class="['page-btn', { active: page === currentPage }]"
        >
          {{ page }}
        </button>
      </div>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="pagination-btn"
        title="Следующая страница"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18L15 12L9 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        @click="goToPage(totalPages)"
        :disabled="currentPage === totalPages"
        class="pagination-btn"
        title="Последняя страница"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 17L18 12L13 7M6 17L11 12L6 7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: {
    type: Number,
    required: true
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 20
  }
})

const emit = defineEmits(['page-change'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const startItem = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  const end = props.currentPage * props.pageSize
  return Math.min(end, props.total)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.currentPage

  if (total <= 7) {
    // Показываем все страницы если их мало
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Показываем умно: первая, текущая +/- 2, последняя
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

function goToPage(page) {
  if (
    typeof page === 'number' &&
    page !== props.currentPage &&
    page >= 1 &&
    page <= totalPages.value
  ) {
    emit('page-change', page)
  }
}

function formatNumber(num) {
  if (!num) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.pagination-info {
  font-size: 14px;
  color: #4a5568;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.pagination-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0 8px;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.page-btn:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.page-btn.active {
  background: #4299e1;
  border-color: #4299e1;
  color: white;
}

@media (max-width: 768px) {
  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .pagination-info {
    text-align: center;
  }
}
</style>
