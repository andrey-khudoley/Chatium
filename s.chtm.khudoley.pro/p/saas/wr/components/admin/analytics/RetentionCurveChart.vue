<template>
  <div class="glass rounded-xl p-5">
    <h3 class="font-semibold text-sm mb-4 wr-text-primary">
      <i class="fas fa-chart-area mr-2 text-primary"></i>Кривая удержания
    </h3>
    <div v-if="retentionCurve.length === 0" class="text-xs wr-text-tertiary py-4 text-center">
      Нет данных
    </div>
    <div v-else class="relative">
      <canvas ref="chartCanvas" style="max-height: 300px"></canvas>
      <div class="flex items-center justify-between text-[10px] wr-text-tertiary mt-2">
        <span>Макс: {{ maxRetention }}% зрителей</span>
        <span>{{ retentionCurve.length }} минут</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  retentionCurve: { type: Array, default: () => [] }
})

const chartCanvas = ref(null)
let chart = null

const maxRetention = computed(() => {
  if (props.retentionCurve.length === 0) return 0
  return Math.max(...props.retentionCurve.map((d) => d.retentionPercent), 100)
})

function renderChart() {
  if (!chartCanvas.value || props.retentionCurve.length === 0) return

  if (chart) {
    chart.destroy()
    chart = null
  }

  const Chart = window.Chart
  if (!Chart) return

  const labels = props.retentionCurve.map((d) => `${d.minute} мин`)
  const data = props.retentionCurve.map((d) => d.retentionPercent)

  const isDark = document.documentElement.classList.contains('theme-dark')
  const textColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'
  const fillColor = isDark ? 'rgba(248, 0, 91, 0.1)' : 'rgba(248, 0, 91, 0.08)'

  const ctx = chartCanvas.value.getContext('2d')
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Удержание (%)',
          data,
          borderColor: '#f8005b',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#f8005b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: true,
          backgroundColor: fillColor
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30, 30, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#fff' : '#000',
          bodyColor: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => `Минута ${items[0]?.parsed.x + 1}`,
            label: (context) => `Осталось ${context.parsed.y}% зрителей`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: { size: 9, family: 'monospace' },
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 10,
            maxTicksLimit: 12
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: textColor,
            font: { size: 10, family: 'Inter' },
            callback: (value) => value + '%'
          }
        }
      }
    }
  })
}

watch(
  () => props.retentionCurve,
  async () => {
    await nextTick()
    renderChart()
  },
  { deep: true }
)

onMounted(async () => {
  await nextTick()
  renderChart()
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>
