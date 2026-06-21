<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-3xl font-bold text-gray-900">
            <i class="fas fa-chart-line mr-3 text-blue-600"></i>
            Аналитика вовлеченности
          </h1>
          <button
            @click="openManagementModal"
            class="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-cog"></i>
            Управление лендами
          </button>
        </div>
        <p class="text-gray-600">Статистика времени пребывания и глубины скроллинга на лендингах</p>
      </div>

      <!-- Фильтры -->
      <div class="bg-white rounded-lg shadow mb-6 p-6">
        <div class="flex items-center gap-4">
          <div class="flex flex-col gap-2 flex-1">
            <!-- Фильтр по лендингам -->
            <div class="flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700">Лендинг:</label>
              <select
                v-model="selectedLanding"
                @change="loadEngagementStats"
                class="border border-gray-300 rounded-lg px-4 py-2 flex-1"
              >
                <option value="all">Все лендинги</option>
                <option
                  v-for="landing in availableLandings"
                  :key="landing.path"
                  :value="landing.path"
                >
                  {{ landing.title }} ({{ landing.path }})
                </option>
              </select>
            </div>

            <div class="flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700">Тип периода:</label>
              <select
                v-model="periodType"
                @change="onPeriodTypeChange"
                class="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="preset">Быстрый выбор</option>
                <option value="custom">Произвольный период</option>
              </select>
            </div>

            <!-- Быстрый выбор -->
            <div v-if="periodType === 'preset'" class="flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700">Период:</label>
              <select
                v-model="selectedPeriod"
                @change="loadEngagementStats"
                class="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="today">Сегодня</option>
                <option value="yesterday">Вчера</option>
                <option value="7">Последние 7 дней</option>
                <option value="14">Последние 14 дней</option>
                <option value="30">Последние 30 дней</option>
                <option value="60">Последние 60 дней</option>
                <option value="90">Последние 90 дней</option>
              </select>
            </div>

            <!-- Произвольный период -->
            <div v-if="periodType === 'custom'" class="flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700">От:</label>
              <input
                type="date"
                v-model="customStartDate"
                class="border border-gray-300 rounded-lg px-4 py-2"
              />
              <label class="text-sm font-medium text-gray-700">До:</label>
              <input
                type="date"
                v-model="customEndDate"
                class="border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>

          <button
            @click="loadEngagementStats"
            class="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            :disabled="loadingEngagement"
          >
            <i class="fas fa-sync-alt mr-2" :class="{ 'fa-spin': loadingEngagement }"></i>
            Обновить
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loadingEngagement" class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        <p class="mt-4 text-gray-600">Загрузка данных...</p>
      </div>

      <!-- Data -->
      <div v-else-if="engagementStats.length > 0">
        <!-- Summary Cards Row 1: Базовые метрики -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 max-w-fit mx-auto">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Всего лендингов</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ engagementStats.length }}
                </p>
              </div>
              <div class="bg-blue-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-file-alt text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Всего визитов</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ (getTotalVisits() || 0).toLocaleString() }}
                </p>
              </div>
              <div class="bg-green-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-eye text-xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Уникальные сессии</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ (getTotalSessions() || 0).toLocaleString() }}
                </p>
              </div>
              <div class="bg-gray-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-user text-xl text-gray-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Среднее время</p>
                <p class="text-xl font-bold text-gray-900 leading-tight">{{ getAverageTime() }}</p>
              </div>
              <div class="bg-purple-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-clock text-xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary Cards Row 2: Конверсии и продажи -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-fit mx-auto">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Регистрации</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ getTotalRegistrations() }}
                </p>
                <p class="text-xs text-gray-500 mt-1">CR: {{ getAverageConversion() }}%</p>
              </div>
              <div class="bg-orange-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-user-check text-xl text-orange-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Всего заказов</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">{{ getTotalOrders() }}</p>
                <p class="text-xs text-gray-500 mt-1">CR: {{ getOrdersConversion() }}%</p>
              </div>
              <div class="bg-indigo-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-shopping-cart text-xl text-indigo-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Всего оплат</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ getTotalPayments() }}
                </p>
                <p class="text-xs text-gray-500 mt-1">CR: {{ getPaymentsConversion() }}%</p>
              </div>
              <div class="bg-teal-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-credit-card text-xl text-teal-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-600 mb-2 leading-tight">Сумма оплат</p>
                <p class="text-2xl font-bold text-gray-900 leading-none">
                  {{ getTotalPaymentsAmount().toLocaleString() }} ₽
                </p>
              </div>
              <div class="bg-yellow-100 rounded-full p-3 flex-shrink-0">
                <i class="fas fa-ruble-sign text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Engagement Table 1: Время и вовлеченность -->
        <div class="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900">
              <i class="fas fa-clock mr-2 text-gray-600"></i>
              Время на лендингах
            </h2>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Лендинг
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Кол-во визитов
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Уникальные сессии
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Среднее время
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Мин. время
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Макс. время
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Кол-во кликов
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template v-for="landing in engagementStats" :key="landing.path + '_time'">
                  <tr class="hover:bg-gray-50 cursor-pointer" @click="toggleHeatmap(landing.path)">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a
                        :href="landing.path"
                        target="_blank"
                        @click.stop
                        class="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors inline-flex items-center gap-1"
                      >
                        {{ landing.title || landing.path }}
                        <i class="fas fa-external-link-alt text-xs text-gray-400"></i>
                      </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ (landing.visits_count || 0).toLocaleString() }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ (landing.sessions_count || 0).toLocaleString() }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {{ landing.avg_duration_formatted || '0 сек' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ landing.min_duration_formatted || '0 сек' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{
                        landing.max_duration_formatted ||
                        formatSeconds(landing.max_duration_seconds)
                      }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {{ (landing.clicks_count || 0).toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        @click.stop="toggleHeatmap(landing.path)"
                        class="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        <i class="fas fa-fire mr-1"></i>
                        {{ expandedHeatmapLanding === landing.path ? 'Скрыть' : 'Тепловая карта' }}
                      </button>
                    </td>
                  </tr>

                  <!-- Heatmap Details -->
                  <tr v-if="expandedHeatmapLanding === landing.path">
                    <td colspan="8" class="px-6 py-4 bg-gray-50">
                      <div v-if="loadingHeatmap" class="text-center py-4">
                        <i class="fas fa-spinner fa-spin text-purple-600"></i>
                        <span class="ml-2 text-gray-600">Загрузка тепловой карты...</span>
                      </div>
                      <div v-else-if="scrollHeatmapData[landing.path]">
                        <div class="flex items-center justify-between mb-3">
                          <h4 class="font-semibold text-gray-900">
                            <i class="fas fa-fire mr-2 text-purple-600"></i>
                            Тепловая карта скроллинга
                          </h4>
                          <button
                            @click="reloadHeatmap(landing.path)"
                            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            :disabled="loadingHeatmap"
                          >
                            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingHeatmap }"></i>
                            Обновить
                          </button>
                        </div>

                        <!-- Цветовая легенда с count -->
                        <div class="mb-6">
                          <div class="flex items-center gap-2 mb-3">
                            <div
                              class="flex-1 h-6 bg-gradient-to-r from-sky-400 via-yellow-400 to-red-500 rounded"
                            ></div>
                          </div>

                          <div class="grid grid-cols-4 gap-3">
                            <div
                              v-for="item in scrollHeatmapData[landing.path].data"
                              :key="item.depth_range"
                              class="text-center"
                            >
                              <div
                                class="h-16 rounded flex items-center justify-center text-white font-bold mb-2 transition-transform hover:scale-105"
                                :style="{ backgroundColor: getColorForRange(item.depth_range) }"
                              >
                                {{ item.users_count }}
                              </div>
                              <div class="text-xs text-gray-700 font-medium">
                                {{ item.depth_range }}%
                              </div>
                              <div class="text-xs text-gray-500">{{ item.percentage }}%</div>
                            </div>
                          </div>
                        </div>

                        <!-- Визуализация данных -->
                        <div class="space-y-3 mt-6">
                          <div
                            v-for="item in scrollHeatmapData[landing.path].data"
                            :key="item.depth_range"
                            class="flex items-center gap-4"
                          >
                            <div class="w-24 text-sm font-medium text-gray-700">
                              {{ item.depth_range }}%
                            </div>
                            <div
                              class="flex-1 relative h-12 bg-gray-100 rounded-lg overflow-hidden"
                            >
                              <div
                                class="absolute inset-y-0 left-0 transition-all duration-300"
                                :style="{
                                  width: item.percentage + '%',
                                  backgroundColor: getHeatmapColor(item.percentage)
                                }"
                              ></div>
                              <div class="absolute inset-0 flex items-center justify-between px-4">
                                <span class="text-sm font-semibold text-gray-900">
                                  {{ item.users_count }} пользователей
                                </span>
                                <span class="text-sm font-bold text-gray-900">
                                  {{ item.percentage }}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Insights -->
                        <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                          <div class="flex items-start gap-2">
                            <i class="fas fa-lightbulb text-blue-600 mt-1"></i>
                            <div>
                              <p class="text-sm font-medium text-blue-900 mb-1">Анализ:</p>
                              <p class="text-sm text-blue-800">
                                {{ getHeatmapInsight(scrollHeatmapData[landing.path].data) }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="text-center py-4 text-gray-500">
                        <i class="fas fa-info-circle mr-2"></i>
                        Нет данных о скроллинге для этого лендинга
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Engagement Table 2: Конверсии и оплаты -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900">
              <i class="fas fa-chart-bar mr-2 text-gray-600"></i>
              Конверсии и продажи
            </h2>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Лендинг
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Уникальные сессии
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Регистраций
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    КВ реги
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Заказов
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Оплат
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Сумма оплат
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template v-for="landing in engagementStats" :key="landing.path + '_conv'">
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a
                        :href="landing.path"
                        target="_blank"
                        class="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors inline-flex items-center gap-1"
                      >
                        {{ landing.title || landing.path }}
                        <i class="fas fa-external-link-alt text-xs text-gray-400"></i>
                      </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ (landing.sessions_count || 0).toLocaleString() }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800"
                      >
                        {{ landing.registrations_count || 0 }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium"
                        :class="getConversionClass(landing.conversion_rate)"
                      >
                        {{ landing.conversion_rate ? landing.conversion_rate.toFixed(2) : '0.00' }}%
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {{ landing.orders_count || 0 }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800"
                      >
                        {{ landing.payments_count || 0 }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="text-sm font-semibold text-gray-900">
                        {{ (landing.total_payments_amount || 0).toLocaleString() }} ₽
                      </span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No data -->
      <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Нет данных</h3>
        <p class="text-gray-500">За выбранный период нет данных о вовлеченности</p>
      </div>

      <!-- Registrations Chart -->
      <div v-if="!loadingEngagement" class="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-chart-area mr-2 text-gray-600"></i>
            График уникальных сессий по дням
          </h2>
          <button
            @click="loadSessionsChart"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            :disabled="loadingSessions"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingSessions }"></i>
            Обновить
          </button>
        </div>

        <div v-if="loadingSessions" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p class="mt-4 text-gray-600">Загрузка данных графика...</p>
        </div>

        <div v-else-if="sessionsData.length > 0" class="p-6">
          <!-- SVG Chart -->
          <div class="relative" style="height: 300px">
            <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line
                v-for="i in 5"
                :key="'grid-' + i"
                x1="50"
                :y1="50 + (i - 1) * 50"
                x2="950"
                :y2="50 + (i - 1) * 50"
                stroke="#e5e7eb"
                stroke-width="1"
              />

              <!-- Chart line -->
              <polyline :points="getChartPoints()" fill="none" stroke="#3b82f6" stroke-width="3" />

              <!-- Data points with labels -->
              <g v-for="(point, index) in sessionsData" :key="'point-group-' + index">
                <!-- Label background (синий прямоугольник с прозрачностью) -->
                <rect
                  :x="50 + (index / (sessionsData.length - 1 || 1)) * 900 - 18"
                  :y="250 - (point.sessions / getMaxSessions()) * 200 - 28"
                  width="36"
                  height="20"
                  rx="4"
                  fill="#3b82f6"
                  fill-opacity="0.5"
                />

                <!-- Label text (черный текст, обычный шрифт) -->
                <text
                  :x="50 + (index / (sessionsData.length - 1 || 1)) * 900"
                  :y="250 - (point.sessions / getMaxSessions()) * 200 - 14"
                  text-anchor="middle"
                  font-size="12"
                  font-weight="normal"
                  fill="#000000"
                >
                  {{ point.sessions }}
                </text>

                <!-- Data point (точка) -->
                <circle
                  :cx="50 + (index / (sessionsData.length - 1 || 1)) * 900"
                  :cy="250 - (point.sessions / getMaxSessions()) * 200"
                  r="4"
                  fill="#3b82f6"
                >
                  <title>{{ point.date }}: {{ point.sessions }} сессий</title>
                </circle>
              </g>

              <!-- Y-axis labels -->
              <text
                v-for="i in 6"
                :key="'label-y-' + i"
                x="40"
                :y="250 - (i - 1) * 40"
                text-anchor="end"
                font-size="12"
                fill="#6b7280"
              >
                {{ Math.round(((i - 1) * getMaxSessions()) / 5) }}
              </text>
            </svg>
          </div>

          <!-- X-axis labels -->
          <div class="mt-4 flex justify-between text-xs text-gray-600 px-12">
            <span>{{ sessionsData[0]?.date }}</span>
            <span v-if="sessionsData.length > 1">{{
              sessionsData[Math.floor(sessionsData.length / 2)]?.date
            }}</span>
            <span>{{ sessionsData[sessionsData.length - 1]?.date }}</span>
          </div>

          <!-- Stats summary -->
          <div class="mt-6 grid grid-cols-3 gap-4">
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <p class="text-sm text-gray-600">Всего сессий</p>
              <p class="text-2xl font-bold text-blue-600">{{ getTotalSessionsChart() }}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 text-center">
              <p class="text-sm text-gray-600">В среднем за день</p>
              <p class="text-2xl font-bold text-green-600">{{ getAverageSessionsChart() }}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 text-center">
              <p class="text-sm text-gray-600">Максимум за день</p>
              <p class="text-2xl font-bold text-purple-600">{{ getMaxSessions() }}</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-chart-area text-4xl mb-2"></i>
          <p>Нет данных о сессиях за выбранный период</p>
        </div>
      </div>

      <!-- Date Analytics Table -->
      <div v-if="!loadingEngagement" class="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-calendar-alt mr-2 text-gray-600"></i>
            Аналитика по датам
          </h2>
          <button
            @click="loadDateStats"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            :disabled="loadingDate"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingDate }"></i>
            Обновить
          </button>
        </div>

        <div v-if="loadingDate" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p class="mt-4 text-gray-600">Загрузка данных по датам...</p>
        </div>

        <div v-else-if="Object.keys(dateHierarchy).length > 0" class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Иерархия дат
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Визиты
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Сессии
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Среднее
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Мин
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Макс
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Конверсий
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  CR %
                </th>
              </tr>
            </thead>
            <tbody class="bg-white">
              <!-- Year level (root) -->
              <template v-for="(yearData, yearName) in dateHierarchy" :key="yearName">
                <!-- Year row -->
                <tr
                  class="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                  @click="toggleDateNode(yearName)"
                >
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-2">
                      <i
                        class="fas text-gray-400"
                        :class="
                          expandedDateNodes[yearName] ? 'fa-chevron-down' : 'fa-chevron-right'
                        "
                      ></i>
                      <i class="fas fa-calendar text-blue-600"></i>
                      <span class="font-semibold text-gray-900">{{ yearData.label }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-3 text-sm font-semibold text-gray-900">
                    {{ yearData.visits_count }}
                  </td>
                  <td class="px-6 py-3 text-sm font-semibold text-gray-900">
                    {{ yearData.sessions_count }}
                  </td>
                  <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {{ yearData.avg_duration_formatted || '0 сек' }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-600">
                    {{ yearData.min_duration_formatted || '0 сек' }}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-600">
                    {{ yearData.max_duration_formatted || '0 сек' }}
                  </td>
                  <td class="px-6 py-3">
                    <span
                      class="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
                    >
                      {{ yearData.conversions_count || 0 }}
                    </span>
                  </td>
                  <td class="px-6 py-3">
                    <span
                      class="px-2 py-1 rounded text-xs font-medium"
                      :class="getConversionClass(yearData.conversion_rate)"
                    >
                      {{ yearData.conversion_rate ? yearData.conversion_rate.toFixed(2) : '0.00' }}%
                    </span>
                  </td>
                </tr>

                <!-- Month level -->
                <template v-if="expandedDateNodes[yearName]">
                  <template
                    v-for="(monthData, monthKey) in yearData.children"
                    :key="yearName + '_' + monthKey"
                  >
                    <!-- Month row -->
                    <tr
                      class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      @click="toggleDateNode(yearName + '_' + monthKey)"
                    >
                      <td class="px-6 py-2">
                        <div class="flex items-center gap-2" style="padding-left: 2rem">
                          <i
                            class="fas text-gray-400"
                            :class="
                              expandedDateNodes[yearName + '_' + monthKey]
                                ? 'fa-chevron-down'
                                : 'fa-chevron-right'
                            "
                          ></i>
                          <i class="fas fa-calendar-week text-green-500"></i>
                          <span class="font-medium text-gray-700">{{ monthData.label }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-900">{{ monthData.visits_count }}</td>
                      <td class="px-6 py-2 text-sm text-gray-900">
                        {{ monthData.sessions_count }}
                      </td>
                      <td class="px-6 py-2">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                        >
                          {{ monthData.avg_duration_formatted || '0 сек' }}
                        </span>
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-600">
                        {{ monthData.min_duration_formatted || '0 сек' }}
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-600">
                        {{ monthData.max_duration_formatted || '0 сек' }}
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-900">
                        {{ monthData.conversions_count || 0 }}
                      </td>
                      <td class="px-6 py-2">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium"
                          :class="getConversionClass(monthData.conversion_rate)"
                        >
                          {{
                            monthData.conversion_rate
                              ? monthData.conversion_rate.toFixed(2)
                              : '0.00'
                          }}%
                        </span>
                      </td>
                    </tr>

                    <!-- Day level (leaf) -->
                    <template v-if="expandedDateNodes[yearName + '_' + monthKey]">
                      <tr
                        v-for="dayKey in getSortedDayKeys(monthData.children)"
                        :key="yearName + '_' + monthKey + '_' + dayKey"
                        class="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <template v-if="monthData.children[dayKey]">
                          <td class="px-6 py-2">
                            <div class="flex items-center gap-2" style="padding-left: 4rem">
                              <i class="fas fa-circle text-gray-300" style="font-size: 6px"></i>
                              <i class="fas fa-calendar-day text-orange-500"></i>
                              <span class="text-gray-600">{{
                                monthData.children[dayKey].label
                              }}</span>
                            </div>
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ monthData.children[dayKey].visits_count }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ monthData.children[dayKey].sessions_count }}
                          </td>
                          <td class="px-6 py-2">
                            <span
                              class="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                            >
                              {{ monthData.children[dayKey].avg_duration_formatted }}
                            </span>
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-600">
                            {{ monthData.children[dayKey].min_duration_formatted }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-600">
                            {{ monthData.children[dayKey].max_duration_formatted }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ monthData.children[dayKey].conversions_count || 0 }}
                          </td>
                          <td class="px-6 py-2">
                            <span
                              class="px-2 py-1 rounded text-xs font-medium"
                              :class="
                                getConversionClass(monthData.children[dayKey].conversion_rate)
                              "
                            >
                              {{
                                monthData.children[dayKey].conversion_rate
                                  ? monthData.children[dayKey].conversion_rate.toFixed(2)
                                  : '0.00'
                              }}%
                            </span>
                          </td>
                        </template>
                      </tr>
                    </template>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-info-circle text-4xl mb-2"></i>
          <p>Нет данных по датам за выбранный период</p>
        </div>
      </div>

      <!-- UTM Analytics Table -->
      <div v-if="!loadingEngagement" class="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-tags mr-2 text-gray-600"></i>
            Аналитика по UTM меткам
          </h2>
          <button
            @click="loadUtmStats"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            :disabled="loadingUtm"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingUtm }"></i>
            Обновить
          </button>
        </div>

        <div v-if="loadingUtm" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p class="mt-4 text-gray-600">Загрузка UTM данных...</p>
        </div>

        <div v-else-if="utmStats.length > 0" class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Иерархия меток
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Визиты
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Сессии
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Среднее
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Мин
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Макс
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Конверсий
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  CR %
                </th>
              </tr>
            </thead>
            <tbody class="bg-white">
              <template v-for="landing in utmStats" :key="landing.path">
                <!-- Landing row -->
                <tr
                  class="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                  @click="toggleUtmNode(landing.path)"
                >
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-2">
                      <i
                        class="fas text-gray-400"
                        :class="
                          expandedUtmNodes[landing.path] ? 'fa-chevron-down' : 'fa-chevron-right'
                        "
                      ></i>
                      <i class="fas fa-file-alt text-blue-600"></i>
                      <a
                        :href="landing.path"
                        target="_blank"
                        @click.stop
                        class="font-semibold text-blue-900 hover:text-blue-600 hover:underline"
                      >
                        {{ landing.title }}
                      </a>
                    </div>
                  </td>
                  <td class="px-6 py-3 text-sm font-semibold text-gray-900">
                    {{ getLandingTotalVisits(landing) }}
                  </td>
                  <td class="px-6 py-3 text-sm font-semibold text-gray-900">
                    {{ getLandingTotalSessions(landing) }}
                  </td>
                  <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {{ getLandingAvgDuration(landing) }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-600">
                    {{ getLandingMinDuration(landing) }}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-600">
                    {{ getLandingMaxDuration(landing) }}
                  </td>
                  <td class="px-6 py-3">
                    <span
                      class="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
                    >
                      {{ getLandingTotalConversions(landing) }}
                    </span>
                  </td>
                  <td class="px-6 py-3">
                    <span
                      class="px-2 py-1 rounded text-xs font-medium"
                      :class="getConversionClass(getLandingConversionRate(landing))"
                    >
                      {{ getLandingConversionRate(landing).toFixed(2) }}%
                    </span>
                  </td>
                </tr>

                <!-- Source level -->
                <template v-if="expandedUtmNodes[landing.path]">
                  <template
                    v-for="(sourceData, sourceName) in landing.hierarchy"
                    :key="landing.path + '_' + sourceName"
                  >
                    <!-- Source row -->
                    <tr
                      class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      @click="toggleUtmNode(landing.path + '_' + sourceName)"
                    >
                      <td class="px-6 py-2">
                        <div class="flex items-center gap-2" style="padding-left: 2rem">
                          <i
                            class="fas text-gray-400"
                            :class="
                              expandedUtmNodes[landing.path + '_' + sourceName]
                                ? 'fa-chevron-down'
                                : 'fa-chevron-right'
                            "
                          ></i>
                          <span class="font-medium text-gray-900"
                            >source: {{ sourceData.label }}</span
                          >
                        </div>
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-900">{{ sourceData.visits_count }}</td>
                      <td class="px-6 py-2 text-sm text-gray-900">
                        {{ sourceData.sessions_count }}
                      </td>
                      <td class="px-6 py-2">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                        >
                          {{ sourceData.avg_duration_formatted || '0 сек' }}
                        </span>
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-600">
                        {{ sourceData.min_duration_formatted || '0 сек' }}
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-600">
                        {{ sourceData.max_duration_formatted || '0 сек' }}
                      </td>
                      <td class="px-6 py-2 text-sm text-gray-900">
                        {{ sourceData.conversions_count || 0 }}
                      </td>
                      <td class="px-6 py-2">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium"
                          :class="getConversionClass(sourceData.conversion_rate)"
                        >
                          {{
                            sourceData.conversion_rate
                              ? sourceData.conversion_rate.toFixed(2)
                              : '0.00'
                          }}%
                        </span>
                      </td>
                    </tr>

                    <!-- Medium level -->
                    <template v-if="expandedUtmNodes[landing.path + '_' + sourceName]">
                      <template
                        v-for="(mediumData, mediumName) in sourceData.children"
                        :key="landing.path + '_' + sourceName + '_' + mediumName"
                      >
                        <!-- Medium row -->
                        <tr
                          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          @click="toggleUtmNode(landing.path + '_' + sourceName + '_' + mediumName)"
                        >
                          <td class="px-6 py-2">
                            <div class="flex items-center gap-2" style="padding-left: 4rem">
                              <i
                                class="fas text-gray-400"
                                :class="
                                  expandedUtmNodes[
                                    landing.path + '_' + sourceName + '_' + mediumName
                                  ]
                                    ? 'fa-chevron-down'
                                    : 'fa-chevron-right'
                                "
                              ></i>
                              <span class="font-medium text-gray-700"
                                >medium: {{ mediumData.label }}</span
                              >
                            </div>
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ mediumData.visits_count }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ mediumData.sessions_count }}
                          </td>
                          <td class="px-6 py-2">
                            <span
                              class="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                            >
                              {{ mediumData.avg_duration_formatted || '0 сек' }}
                            </span>
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-600">
                            {{ mediumData.min_duration_formatted || '0 сек' }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-600">
                            {{ mediumData.max_duration_formatted || '0 сек' }}
                          </td>
                          <td class="px-6 py-2 text-sm text-gray-900">
                            {{ mediumData.conversions_count || 0 }}
                          </td>
                          <td class="px-6 py-2">
                            <span
                              class="px-2 py-1 rounded text-xs font-medium"
                              :class="getConversionClass(mediumData.conversion_rate)"
                            >
                              {{
                                mediumData.conversion_rate
                                  ? mediumData.conversion_rate.toFixed(2)
                                  : '0.00'
                              }}%
                            </span>
                          </td>
                        </tr>

                        <!-- Campaign level -->
                        <template
                          v-if="
                            expandedUtmNodes[landing.path + '_' + sourceName + '_' + mediumName]
                          "
                        >
                          <template
                            v-for="(campaignData, campaignName) in mediumData.children"
                            :key="
                              landing.path +
                              '_' +
                              sourceName +
                              '_' +
                              mediumName +
                              '_' +
                              campaignName
                            "
                          >
                            <!-- Campaign row -->
                            <tr
                              class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                              @click="
                                toggleUtmNode(
                                  landing.path +
                                    '_' +
                                    sourceName +
                                    '_' +
                                    mediumName +
                                    '_' +
                                    campaignName
                                )
                              "
                            >
                              <td class="px-6 py-2">
                                <div class="flex items-center gap-2" style="padding-left: 6rem">
                                  <i
                                    class="fas text-gray-400"
                                    :class="
                                      expandedUtmNodes[
                                        landing.path +
                                          '_' +
                                          sourceName +
                                          '_' +
                                          mediumName +
                                          '_' +
                                          campaignName
                                      ]
                                        ? 'fa-chevron-down'
                                        : 'fa-chevron-right'
                                    "
                                  ></i>
                                  <span class="font-medium text-gray-600"
                                    >campaign: {{ campaignData.label }}</span
                                  >
                                </div>
                              </td>
                              <td class="px-6 py-2 text-sm text-gray-900">
                                {{ campaignData.visits_count }}
                              </td>
                              <td class="px-6 py-2 text-sm text-gray-900">
                                {{ campaignData.sessions_count }}
                              </td>
                              <td class="px-6 py-2">
                                <span
                                  class="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
                                >
                                  {{ campaignData.avg_duration_formatted || '0 сек' }}
                                </span>
                              </td>
                              <td class="px-6 py-2 text-sm text-gray-600">
                                {{ campaignData.min_duration_formatted || '0 сек' }}
                              </td>
                              <td class="px-6 py-2 text-sm text-gray-600">
                                {{ campaignData.max_duration_formatted || '0 сек' }}
                              </td>
                              <td class="px-6 py-2 text-sm text-gray-900">
                                {{ campaignData.conversions_count || 0 }}
                              </td>
                              <td class="px-6 py-2">
                                <span
                                  class="px-2 py-1 rounded text-xs font-medium"
                                  :class="getConversionClass(campaignData.conversion_rate)"
                                >
                                  {{
                                    campaignData.conversion_rate
                                      ? campaignData.conversion_rate.toFixed(2)
                                      : '0.00'
                                  }}%
                                </span>
                              </td>
                            </tr>

                            <!-- Term level -->
                            <template
                              v-if="
                                expandedUtmNodes[
                                  landing.path +
                                    '_' +
                                    sourceName +
                                    '_' +
                                    mediumName +
                                    '_' +
                                    campaignName
                                ]
                              "
                            >
                              <template
                                v-for="(termData, termName) in campaignData.children"
                                :key="
                                  landing.path +
                                  '_' +
                                  sourceName +
                                  '_' +
                                  mediumName +
                                  '_' +
                                  campaignName +
                                  '_' +
                                  termName
                                "
                              >
                                <!-- Term row -->
                                <tr
                                  class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                  @click="
                                    toggleUtmNode(
                                      landing.path +
                                        '_' +
                                        sourceName +
                                        '_' +
                                        mediumName +
                                        '_' +
                                        campaignName +
                                        '_' +
                                        termName
                                    )
                                  "
                                >
                                  <td class="px-6 py-2">
                                    <div class="flex items-center gap-2" style="padding-left: 8rem">
                                      <i
                                        class="fas text-gray-400"
                                        :class="
                                          expandedUtmNodes[
                                            landing.path +
                                              '_' +
                                              sourceName +
                                              '_' +
                                              mediumName +
                                              '_' +
                                              campaignName +
                                              '_' +
                                              termName
                                          ]
                                            ? 'fa-chevron-down'
                                            : 'fa-chevron-right'
                                        "
                                      ></i>
                                      <span class="font-medium text-gray-500"
                                        >term: {{ termData.label }}</span
                                      >
                                    </div>
                                  </td>
                                  <td class="px-6 py-2 text-sm text-gray-900">
                                    {{ termData.visits_count }}
                                  </td>
                                  <td class="px-6 py-2 text-sm text-gray-900">
                                    {{ termData.sessions_count }}
                                  </td>
                                  <td class="px-6 py-2">
                                    <span
                                      class="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                                    >
                                      {{ termData.avg_duration_formatted || '0 сек' }}
                                    </span>
                                  </td>
                                  <td class="px-6 py-2 text-sm text-gray-600">
                                    {{ termData.min_duration_formatted || '0 сек' }}
                                  </td>
                                  <td class="px-6 py-2 text-sm text-gray-600">
                                    {{ termData.max_duration_formatted || '0 сек' }}
                                  </td>
                                  <td class="px-6 py-2 text-sm text-gray-900">
                                    {{ termData.conversions_count || 0 }}
                                  </td>
                                  <td class="px-6 py-2">
                                    <span
                                      class="px-2 py-1 rounded text-xs font-medium"
                                      :class="getConversionClass(termData.conversion_rate)"
                                    >
                                      {{
                                        termData.conversion_rate
                                          ? termData.conversion_rate.toFixed(2)
                                          : '0.00'
                                      }}%
                                    </span>
                                  </td>
                                </tr>

                                <!-- Content level (leaf) -->
                                <template
                                  v-if="
                                    expandedUtmNodes[
                                      landing.path +
                                        '_' +
                                        sourceName +
                                        '_' +
                                        mediumName +
                                        '_' +
                                        campaignName +
                                        '_' +
                                        termName
                                    ]
                                  "
                                >
                                  <tr
                                    v-for="(contentData, contentName) in termData.children"
                                    :key="
                                      landing.path +
                                      '_' +
                                      sourceName +
                                      '_' +
                                      mediumName +
                                      '_' +
                                      campaignName +
                                      '_' +
                                      termName +
                                      '_' +
                                      contentName
                                    "
                                    class="border-b border-gray-50 hover:bg-gray-50"
                                  >
                                    <td class="px-6 py-2">
                                      <div
                                        class="flex items-center gap-2"
                                        style="padding-left: 10rem"
                                      >
                                        <i
                                          class="fas fa-circle text-gray-300"
                                          style="font-size: 6px"
                                        ></i>
                                        <span class="text-gray-500"
                                          >content: {{ contentData.label }}</span
                                        >
                                      </div>
                                    </td>
                                    <td class="px-6 py-2 text-sm text-gray-900">
                                      {{ contentData.visits_count }}
                                    </td>
                                    <td class="px-6 py-2 text-sm text-gray-900">
                                      {{ contentData.sessions_count }}
                                    </td>
                                    <td class="px-6 py-2">
                                      <span
                                        class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {{ contentData.avg_duration_formatted }}
                                      </span>
                                    </td>
                                    <td class="px-6 py-2 text-sm text-gray-600">
                                      {{ contentData.min_duration_formatted }}
                                    </td>
                                    <td class="px-6 py-2 text-sm text-gray-600">
                                      {{ contentData.max_duration_formatted }}
                                    </td>
                                    <td class="px-6 py-2 text-sm text-gray-900">
                                      {{ contentData.conversions_count || 0 }}
                                    </td>
                                    <td class="px-6 py-2">
                                      <span
                                        class="px-2 py-1 rounded text-xs font-medium"
                                        :class="getConversionClass(contentData.conversion_rate)"
                                      >
                                        {{
                                          contentData.conversion_rate
                                            ? contentData.conversion_rate.toFixed(2)
                                            : '0.00'
                                        }}%
                                      </span>
                                    </td>
                                  </tr>
                                </template>
                              </template>
                            </template>
                          </template>
                        </template>
                      </template>
                    </template>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-info-circle text-4xl mb-2"></i>
          <p>Нет данных по UTM меткам за выбранный период</p>
        </div>
      </div>

      <!-- Demographics Section -->
      <div v-if="!loadingEngagement" class="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-map-marker-alt mr-2 text-gray-600"></i>
            Демография
          </h2>
          <button
            @click="loadDemographics"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            :disabled="loadingDemographics"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingDemographics }"></i>
            Обновить
          </button>
        </div>

        <div v-if="loadingDemographics" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p class="mt-4 text-gray-600">Загрузка демографических данных...</p>
        </div>

        <div
          v-else-if="demographicsData.regions.length > 0 || demographicsData.cities.length > 0"
          class="p-6"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Regions Pie Chart -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                <i class="fas fa-globe-europe mr-2 text-blue-600"></i>
                По регионам
              </h3>
              <div class="flex flex-col items-center">
                <svg width="300" height="300" viewBox="0 0 300 300">
                  <g transform="translate(150, 150)">
                    <path
                      v-for="(sector, index) in getRegionsSectors()"
                      :key="'region-sector-' + index"
                      :d="sector.pathData"
                      :fill="getColorForSector(index)"
                      stroke="white"
                      stroke-width="2"
                      style="transition: all 0.3s ease"
                      class="hover:opacity-80 cursor-pointer"
                    >
                      <title>
                        {{ decodeRegionName(sector.name) }}: {{ sector.count }} ({{
                          sector.percentage
                        }}%)
                      </title>
                    </path>
                  </g>
                </svg>

                <!-- Legend -->
                <div class="mt-4 space-y-2 w-full">
                  <div
                    v-for="(item, index) in demographicsData.regions"
                    :key="'region-legend-' + index"
                    class="flex items-center gap-2 text-sm"
                  >
                    <div
                      class="w-4 h-4 rounded-sm flex-shrink-0"
                      :style="{ backgroundColor: getColorForSector(index) }"
                    ></div>
                    <span class="flex-1 text-gray-700">{{ decodeRegionName(item.name) }}</span>
                    <span class="text-gray-600 font-medium">{{ item.count }}</span>
                    <span class="text-gray-500">({{ item.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cities Pie Chart -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                <i class="fas fa-city mr-2 text-green-600"></i>
                По городам
              </h3>
              <div class="flex flex-col items-center">
                <svg width="300" height="300" viewBox="0 0 300 300">
                  <g transform="translate(150, 150)">
                    <path
                      v-for="(sector, index) in getCitiesSectors()"
                      :key="'city-sector-' + index"
                      :d="sector.pathData"
                      :fill="getColorForSector(index)"
                      stroke="white"
                      stroke-width="2"
                      style="transition: all 0.3s ease"
                      class="hover:opacity-80 cursor-pointer"
                    >
                      <title>
                        {{ decodeCityName(sector.name) }}: {{ sector.count }} ({{
                          sector.percentage
                        }}%)
                      </title>
                    </path>
                  </g>
                </svg>

                <!-- Legend -->
                <div class="mt-4 space-y-2 w-full">
                  <div
                    v-for="(item, index) in demographicsData.cities"
                    :key="'city-legend-' + index"
                    class="flex items-center gap-2 text-sm"
                  >
                    <div
                      class="w-4 h-4 rounded-sm flex-shrink-0"
                      :style="{ backgroundColor: getColorForSector(index) }"
                    ></div>
                    <span class="flex-1 text-gray-700">{{ decodeCityName(item.name) }}</span>
                    <span class="text-gray-600 font-medium">{{ item.count }}</span>
                    <span class="text-gray-500">({{ item.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-info-circle text-4xl mb-2"></i>
          <p>Нет демографических данных за выбранный период</p>
        </div>
      </div>
      <!-- Devices Section -->
      <div v-if="!loadingEngagement" class="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-mobile-alt mr-2 text-gray-600"></i>
            Устройства
          </h2>
          <button
            @click="loadDevices"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            :disabled="loadingDevices"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingDevices }"></i>
            Обновить
          </button>
        </div>

        <div v-if="loadingDevices" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p class="mt-4 text-gray-600">Загрузка данных об устройствах...</p>
        </div>

        <div
          v-else-if="devicesData.deviceTypes.length > 0 || devicesData.deviceBrands.length > 0"
          class="p-6"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Device Types Pie Chart -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                <i class="fas fa-laptop mr-2 text-blue-600"></i>
                Тип устройства
              </h3>
              <div class="flex flex-col items-center">
                <svg width="300" height="300" viewBox="0 0 300 300">
                  <g transform="translate(150, 150)">
                    <path
                      v-for="(sector, index) in getDeviceTypesSectors()"
                      :key="'device-type-sector-' + index"
                      :d="sector.pathData"
                      :fill="getColorForSector(index)"
                      stroke="white"
                      stroke-width="2"
                      style="transition: all 0.3s ease"
                      class="hover:opacity-80 cursor-pointer"
                    >
                      <title>
                        {{ decodeDeviceTypeName(sector.name) }}: {{ sector.count }} ({{
                          sector.percentage
                        }}%)
                      </title>
                    </path>
                  </g>
                </svg>

                <!-- Legend -->
                <div class="mt-4 space-y-2 w-full">
                  <div
                    v-for="(item, index) in devicesData.deviceTypes"
                    :key="'device-type-legend-' + index"
                    class="flex items-center gap-2 text-sm"
                  >
                    <div
                      class="w-4 h-4 rounded-sm flex-shrink-0"
                      :style="{ backgroundColor: getColorForSector(index) }"
                    ></div>
                    <span class="flex-1 text-gray-700">{{ decodeDeviceTypeName(item.name) }}</span>
                    <span class="text-gray-600 font-medium">{{ item.count }}</span>
                    <span class="text-gray-500">({{ item.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Device Brands Pie Chart -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">
                <i class="fas fa-tag mr-2 text-green-600"></i>
                Бренд устройства
              </h3>
              <div class="flex flex-col items-center">
                <svg width="300" height="300" viewBox="0 0 300 300">
                  <g transform="translate(150, 150)">
                    <path
                      v-for="(sector, index) in getDeviceBrandsSectors()"
                      :key="'device-brand-sector-' + index"
                      :d="sector.pathData"
                      :fill="getColorForSector(index)"
                      stroke="white"
                      stroke-width="2"
                      style="transition: all 0.3s ease"
                      class="hover:opacity-80 cursor-pointer"
                    >
                      <title>
                        {{ decodeDeviceBrandName(sector.name) }}: {{ sector.count }} ({{
                          sector.percentage
                        }}%)
                      </title>
                    </path>
                  </g>
                </svg>

                <!-- Legend -->
                <div class="mt-4 space-y-2 w-full">
                  <div
                    v-for="(item, index) in devicesData.deviceBrands"
                    :key="'device-brand-legend-' + index"
                    class="flex items-center gap-2 text-sm"
                  >
                    <div
                      class="w-4 h-4 rounded-sm flex-shrink-0"
                      :style="{ backgroundColor: getColorForSector(index) }"
                    ></div>
                    <span class="flex-1 text-gray-700">{{ decodeDeviceBrandName(item.name) }}</span>
                    <span class="text-gray-600 font-medium">{{ item.count }}</span>
                    <span class="text-gray-500">({{ item.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-info-circle text-4xl mb-2"></i>
          <p>Нет данных об устройствах за выбранный период</p>
        </div>
      </div>
    </div>

    <!-- Management Modal -->
    <div
      v-if="showManagementModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
      @click="showManagementModal = false"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div
          class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
        >
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-cog mr-2"></i>
            Управление лендингами
          </h2>
          <button
            @click="showManagementModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <div class="p-6">
          <!-- Add new landing form -->
          <div class="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-plus-circle text-blue-600"></i>
              Добавить новый лендинг
            </h3>

            <div class="space-y-3">
              <!-- Переключатель между выбором из списка и ручным вводом -->
              <div class="flex items-center gap-4 mb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="select"
                    v-model="pathInputMode"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Выбрать из списка</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="manual"
                    v-model="pathInputMode"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Ввести вручную</span>
                </label>
              </div>

              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="text-sm text-gray-700 mb-1 block">Путь (path)</label>

                  <!-- Режим выбора из списка -->
                  <div v-if="pathInputMode === 'select'">
                    <div
                      v-if="loadingPaths"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-500"
                    >
                      <i class="fas fa-spinner fa-spin mr-2"></i>
                      Загрузка...
                    </div>
                    <select
                      v-else
                      v-model="newLanding.path"
                      @change="onPathSelected"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите лендинг</option>
                      <option v-for="path in filteredAvailablePaths" :key="path" :value="path">
                        {{ path }}
                      </option>
                    </select>
                  </div>

                  <!-- Режим ручного ввода -->
                  <input
                    v-else
                    type="text"
                    v-model="newLanding.path"
                    @input="onPathManualInput"
                    placeholder="/путь/к/лендингу или /path~subpath"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div class="flex-1">
                  <label class="text-sm text-gray-700 mb-1 block">Название (title)</label>
                  <input
                    type="text"
                    v-model="newLanding.title"
                    placeholder="Лендинг 1"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div class="flex items-start gap-2 text-sm text-gray-600">
                <i class="fas fa-info-circle mt-0.5"></i>
                <p>
                  {{
                    pathInputMode === 'select'
                      ? 'Выберите лендинг из списка доступных путей'
                      : 'Введите полный путь к лендингу (начинается с /). Поддерживаются пути с тильдой (~) и вложенные директории'
                  }}. Название заполнится автоматически.
                </p>
              </div>

              <button
                @click="createLanding"
                :disabled="!newLanding.path || !newLanding.title || creatingLanding"
                class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i class="fas fa-plus" :class="{ 'fa-spin fa-spinner': creatingLanding }"></i>
                {{ creatingLanding ? 'Добавление...' : 'Добавить' }}
              </button>

              <div v-if="createError" class="text-sm text-red-600 flex items-center gap-2">
                <i class="fas fa-exclamation-circle"></i>
                {{ createError }}
              </div>
            </div>
          </div>

          <!-- Info message -->
          <p class="text-sm text-gray-600 mb-4">
            Включайте/выключайте лендинги для отслеживания в аналитике. Изменения применяются
            мгновенно.
          </p>

          <!-- Landings list -->
          <div v-if="loadingLandings" class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
            <p class="text-gray-600 mt-2">Загрузка лендингов...</p>
          </div>

          <div v-else-if="allLandings.length === 0" class="text-center py-8 text-gray-500">
            <i class="fas fa-inbox text-4xl mb-2"></i>
            <p>Нет созданных лендингов</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="landing in allLandings"
              :key="landing.id"
              class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex-1">
                <!-- Нередактируемое состояние -->
                <div v-if="editingLandingId !== landing.id" class="flex items-center gap-2">
                  <p class="font-semibold text-gray-900">{{ landing.title }}</p>
                  <button
                    @click="startEditingTitle(landing)"
                    class="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Редактировать название"
                  >
                    <i class="fas fa-pencil-alt text-sm"></i>
                  </button>
                </div>

                <!-- Редактируемое состояние -->
                <div v-else class="flex items-center gap-2">
                  <input
                    type="text"
                    v-model="editingTitle"
                    @keydown="handleTitleKeydown($event, landing.id)"
                    @blur="saveTitle(landing.id)"
                    :data-landing-id="landing.id"
                    class="flex-1 border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-gray-900"
                  />
                  <button
                    @click="saveTitle(landing.id)"
                    class="text-green-600 hover:text-green-800 transition-colors"
                    title="Сохранить"
                  >
                    <i class="fas fa-check"></i>
                  </button>
                </div>

                <p class="text-sm text-gray-500">{{ landing.path }}</p>
              </div>

              <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="landing.isActive"
                    @change="toggleLanding(landing)"
                    class="sr-only peer"
                  />
                  <div
                    class="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"
                  ></div>
                  <span
                    class="ml-3 text-sm font-medium"
                    :class="landing.isActive ? 'text-green-600' : 'text-gray-400'"
                  >
                    {{ landing.isActive ? 'Активен' : 'Неактивен' }}
                  </span>
                </label>

                <button
                  @click="deleteLanding(landing)"
                  class="text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                  title="Удалить лендинг"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import {
  apiGetEngagementStatsRoute,
  apiGetScrollHeatmapRoute,
  apiGetUtmStatsRoute,
  apiGetDateStatsRoute,
  apiGetSessionsByDayRoute,
  apiGetDemographicsRoute,
  apiGetDevicesRoute
} from '../api/analytics'
import {
  apiGetLandingsRoute,
  apiCreateLandingRoute,
  apiToggleLandingRoute,
  apiDeleteLandingRoute,
  apiGetAvailablePathsRoute,
  apiUpdateLandingTitleRoute
} from '../api/landings'

const loadingEngagement = ref(false)
const selectedPeriod = ref('90')
const periodType = ref('preset')
const customStartDate = ref('')
const customEndDate = ref('')
const engagementStats = ref([])
const scrollHeatmapData = ref({})
const loadingHeatmap = ref(false)
const expandedHeatmapLanding = ref(null)
const utmStats = ref([])
const loadingUtm = ref(false)
const expandedUtmNodes = ref({})

// Date stats
const dateHierarchy = ref({})
const loadingDate = ref(false)
const expandedDateNodes = ref({})

// Sessions chart
const sessionsData = ref([])
const loadingSessions = ref(false)
const selectedLanding = ref('all')
const availableLandings = ref([])

// Management modal
const showManagementModal = ref(false)
const allLandings = ref([])
const loadingLandings = ref(false)
const newLanding = ref({ path: '', title: '' })
const creatingLanding = ref(false)
const createError = ref('')
const availablePaths = ref([])
const loadingPaths = ref(false)
const editingLandingId = ref(null)
const editingTitle = ref('')
const isInitialLoad = ref(true)
const pathInputMode = ref('select') // 'select' or 'manual'

// Demographics
const demographicsData = ref({ regions: [], cities: [] })
const loadingDemographics = ref(false)

// Devices
const devicesData = ref({ deviceTypes: [], deviceBrands: [] })
const loadingDevices = ref(false)

// Computed: фильтруем уже добавленные лендинги из списка доступных путей
const filteredAvailablePaths = computed(() => {
  const existingPaths = allLandings.value.map((landing) => landing.path)
  return availablePaths.value.filter((path) => !existingPaths.includes(path))
})

function getTotalSessions() {
  return engagementStats.value.reduce((sum, item) => sum + (item.sessions_count || 0), 0)
}

function getTotalVisits() {
  return engagementStats.value.reduce((sum, item) => sum + (item.visits_count || 0), 0)
}

function getTotalRegistrations() {
  return engagementStats.value.reduce((sum, item) => sum + (item.registrations_count || 0), 0)
}

function getTotalOrders() {
  return engagementStats.value.reduce((sum, item) => sum + (item.orders_count || 0), 0)
}

function getTotalPayments() {
  return engagementStats.value.reduce((sum, item) => sum + (item.payments_count || 0), 0)
}

function getTotalPaymentsAmount() {
  return engagementStats.value.reduce((sum, item) => sum + (item.total_payments_amount || 0), 0)
}

function getAverageConversion() {
  const totalSessions = getTotalSessions()
  const totalRegistrations = getTotalRegistrations()
  if (totalSessions === 0) return '0.00'
  return ((totalRegistrations / totalSessions) * 100).toFixed(2)
}

function getOrdersConversion() {
  const totalRegistrations = getTotalRegistrations()
  const totalOrders = getTotalOrders()
  if (totalRegistrations === 0) return '0.00'
  return ((totalOrders / totalRegistrations) * 100).toFixed(2)
}

function getPaymentsConversion() {
  const totalOrders = getTotalOrders()
  const totalPayments = getTotalPayments()
  if (totalOrders === 0) return '0.00'
  return ((totalPayments / totalOrders) * 100).toFixed(2)
}

function getAverageTime() {
  const totalVisits = getTotalVisits()
  if (totalVisits === 0) return '0 сек'

  const totalSeconds = engagementStats.value.reduce(
    (sum, item) => sum + (item.avg_duration_seconds || 0) * (item.visits_count || 0),
    0
  )
  const avgSeconds = totalSeconds / totalVisits
  return formatAvgTime(avgSeconds)
}

function onPeriodTypeChange() {
  if (periodType.value === 'custom' && !customStartDate.value) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    customEndDate.value = endDate.toISOString().split('T')[0]
    customStartDate.value = startDate.toISOString().split('T')[0]
  }
  loadEngagementStats()
}

async function loadEngagementStats() {
  loadingEngagement.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetEngagementStatsRoute.query(queryParams).run(ctx)

    if (result.success) {
      engagementStats.value = result.data || []
      // Обновляем список доступных лендингов
      if (selectedLanding.value === 'all') {
        availableLandings.value = result.data || []
      }
    }

    // Загружаем UTM, Date, Sessions, Demographics и Devices статистику параллельно
    loadUtmStats()
    loadDateStats()
    loadSessionsChart()
    loadDemographics()
    loadDevices()
  } catch (e) {
    console.error('Ошибка загрузки данных вовлеченности:', e)
  } finally {
    loadingEngagement.value = false
  }
}

async function loadUtmStats() {
  loadingUtm.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetUtmStatsRoute.query(queryParams).run(ctx)

    if (result.success) {
      utmStats.value = result.data || []
    }
  } catch (e) {
    console.error('Ошибка загрузки UTM данных:', e)
  } finally {
    loadingUtm.value = false
  }
}

async function loadDateStats() {
  loadingDate.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetDateStatsRoute.query(queryParams).run(ctx)

    if (result.success) {
      dateHierarchy.value = result.hierarchy || {}

      // Автоматически раскрываем все годы (чтобы показать месяцы)
      expandedDateNodes.value = {}
      for (const yearName in dateHierarchy.value) {
        expandedDateNodes.value[yearName] = true
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки данных по датам:', e)
  } finally {
    loadingDate.value = false
  }
}

async function toggleHeatmap(path) {
  if (expandedHeatmapLanding.value === path) {
    expandedHeatmapLanding.value = null
    return
  }

  expandedHeatmapLanding.value = path

  if (!scrollHeatmapData.value[path]) {
    await loadHeatmapData(path)
  }
}

async function loadHeatmapData(path) {
  loadingHeatmap.value = true

  try {
    // Передаем те же параметры периода, что и в основной аналитике
    const queryParams =
      periodType.value === 'custom'
        ? {
            path,
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : {
            path,
            period: selectedPeriod.value
          }

    const result = await apiGetScrollHeatmapRoute.query(queryParams).run(ctx)

    if (result.success) {
      scrollHeatmapData.value[path] = {
        data: result.data || [],
        totalUsers: result.totalUsers || 0
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки тепловой карты:', e)
  } finally {
    loadingHeatmap.value = false
  }
}

function formatSeconds(seconds) {
  if (!seconds) return '0 сек'

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}ч ${minutes}м`
  } else if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}м ${secs}с`
  } else {
    return `${seconds} сек`
  }
}

function formatAvgTime(avgSeconds) {
  if (!avgSeconds || isNaN(avgSeconds)) return '0 сек'

  const rounded = Math.round(avgSeconds)
  return formatSeconds(rounded)
}

function getColorForRange(depthRange) {
  const colorMap = {
    '0-25%': 'rgb(56, 189, 248)', // Холодный голубой
    '25-50%': 'rgb(250, 204, 21)', // Теплый желтый
    '50-75%': 'rgb(249, 115, 22)', // Оранжевый теплее
    '75-100%': 'rgb(239, 68, 68)' // Красный
  }
  return colorMap[depthRange] || 'rgb(156, 163, 175)'
}

function getHeatmapColor(percentage) {
  if (percentage <= 25) {
    const ratio = percentage / 25
    const r = Math.round(56 + (250 - 56) * ratio)
    const g = Math.round(189 + (204 - 189) * ratio)
    const b = Math.round(248 - (248 - 21) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  } else if (percentage <= 50) {
    const ratio = (percentage - 25) / 25
    const r = Math.round(250 - (250 - 249) * ratio)
    const g = Math.round(204 - (204 - 115) * ratio)
    const b = Math.round(21 - (21 - 22) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  } else if (percentage <= 75) {
    const ratio = (percentage - 50) / 25
    const r = Math.round(249 - (249 - 239) * ratio)
    const g = Math.round(115 - (115 - 68) * ratio)
    const b = Math.round(22 + (68 - 22) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const ratio = (percentage - 75) / 25
    const r = Math.round(239 - (239 - 220) * ratio)
    const g = Math.round(68 - (68 - 38) * ratio)
    const b = Math.round(68 - (68 - 38) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  }
}

async function loadLandings() {
  loadingLandings.value = true
  try {
    const result = await apiGetLandingsRoute.run(ctx)
    if (result.success) {
      allLandings.value = result.data || []

      // Автоматически открываем модальное окно при первой загрузке, если нет лендингов
      if (isInitialLoad.value && allLandings.value.length === 0) {
        showManagementModal.value = true
        await loadAvailablePaths()
      }

      // Больше не первая загрузка
      isInitialLoad.value = false
    }
  } catch (e) {
    console.error('Ошибка загрузки лендингов:', e)
  } finally {
    loadingLandings.value = false
  }
}

async function loadAvailablePaths() {
  loadingPaths.value = true
  try {
    const result = await apiGetAvailablePathsRoute.run(ctx)
    if (result.success) {
      availablePaths.value = result.paths || []
    }
  } catch (e) {
    console.error('Ошибка загрузки доступных путей:', e)
  } finally {
    loadingPaths.value = false
  }
}

async function createLanding() {
  if (!newLanding.value.path || !newLanding.value.title) return

  creatingLanding.value = true
  createError.value = ''

  try {
    const result = await apiCreateLandingRoute.run(ctx, {
      path: newLanding.value.path,
      title: newLanding.value.title
    })

    if (result.success) {
      newLanding.value = { path: '', title: '' }
      await loadLandings()
      await loadEngagementStats()
    } else {
      createError.value = result.error || 'Ошибка создания лендинга'
    }
  } catch (e) {
    console.error('Ошибка создания лендинга:', e)
    createError.value = 'Ошибка создания лендинга'
  } finally {
    creatingLanding.value = false
  }
}

async function toggleLanding(landing) {
  try {
    const result = await apiToggleLandingRoute.run(ctx, {
      id: landing.id,
      isActive: !landing.isActive
    })

    if (result.success) {
      await loadLandings()
      await loadEngagementStats()
    }
  } catch (e) {
    console.error('Ошибка переключения лендинга:', e)
  }
}

async function deleteLanding(landing) {
  if (!confirm(`Вы уверены, что хотите удалить лендинг "${landing.title}"?`)) {
    return
  }

  try {
    const result = await apiDeleteLandingRoute.run(ctx, {
      id: landing.id
    })

    if (result.success) {
      await loadLandings()
      await loadEngagementStats()
    } else {
      alert('Ошибка удаления: ' + (result.error || 'Неизвестная ошибка'))
    }
  } catch (e) {
    console.error('Ошибка удаления лендинга:', e)
    alert('Ошибка удаления лендинга')
  }
}

async function reloadHeatmap(path) {
  // Очищаем старые данные и загружаем заново
  delete scrollHeatmapData.value[path]
  await loadHeatmapData(path)
}

function toggleUtmNode(nodeKey) {
  expandedUtmNodes.value[nodeKey] = !expandedUtmNodes.value[nodeKey]
}

function toggleDateNode(nodeKey) {
  expandedDateNodes.value[nodeKey] = !expandedDateNodes.value[nodeKey]
}

// Helper functions for landing-level aggregation
function getLandingTotalVisits(landing) {
  let total = 0
  for (const sourceName in landing.hierarchy) {
    total += landing.hierarchy[sourceName].visits_count || 0
  }
  return total
}

function getLandingTotalSessions(landing) {
  let total = 0
  for (const sourceName in landing.hierarchy) {
    total += landing.hierarchy[sourceName].sessions_count || 0
  }
  return total
}

function getLandingAvgDuration(landing) {
  const durations = []
  for (const sourceName in landing.hierarchy) {
    const sourceData = landing.hierarchy[sourceName]
    if (sourceData.avg_duration_formatted && sourceData.avg_duration_formatted !== '0 сек') {
      durations.push(sourceData.avg_duration_formatted)
    }
  }
  return durations.length > 0 ? durations[0] : '0 сек'
}

function getLandingMinDuration(landing) {
  const durations = []
  for (const sourceName in landing.hierarchy) {
    const sourceData = landing.hierarchy[sourceName]
    if (sourceData.min_duration_formatted && sourceData.min_duration_formatted !== '0 сек') {
      durations.push(sourceData.min_duration_formatted)
    }
  }
  return durations.length > 0 ? durations[0] : '0 сек'
}

function getLandingMaxDuration(landing) {
  const durations = []
  for (const sourceName in landing.hierarchy) {
    const sourceData = landing.hierarchy[sourceName]
    if (sourceData.max_duration_formatted && sourceData.max_duration_formatted !== '0 сек') {
      durations.push(sourceData.max_duration_formatted)
    }
  }
  return durations.length > 0 ? durations[0] : '0 сек'
}

function getConversionClass(rate) {
  if (!rate || rate === 0) return 'bg-gray-100 text-gray-800'
  if (rate < 1) return 'bg-red-100 text-red-800'
  if (rate < 3) return 'bg-yellow-100 text-yellow-800'
  if (rate < 5) return 'bg-blue-100 text-blue-800'
  return 'bg-green-100 text-green-800'
}

function getLandingTotalConversions(landing) {
  let total = 0
  for (const sourceName in landing.hierarchy) {
    total += landing.hierarchy[sourceName].conversions_count || 0
  }
  return total
}

function getLandingConversionRate(landing) {
  const totalSessions = getLandingTotalSessions(landing)
  const totalConversions = getLandingTotalConversions(landing)
  if (totalSessions === 0) return 0
  return (totalConversions / totalSessions) * 100
}

function getSortedDayKeys(daysObject) {
  if (!daysObject) return []
  // Сортируем ключи как числа (01, 02, 03, ..., 10, 11, ...)
  return Object.keys(daysObject).sort((a, b) => {
    const numA = parseInt(a)
    const numB = parseInt(b)
    return numA - numB
  })
}

function getHeatmapInsight(data) {
  if (!data || data.length === 0) return 'Нет данных для анализа'

  // Проверяем общее количество пользователей
  const totalUsersWithData = data.reduce((sum, item) => sum + (item.users_count || 0), 0)

  if (totalUsersWithData === 0) {
    return 'Нет данных о скроллинге. Пользователи посещали страницу, но данные о глубине просмотра не были собраны.'
  }

  if (totalUsersWithData < 3) {
    return `Недостаточно данных для полноценного анализа (всего ${totalUsersWithData} ${totalUsersWithData === 1 ? 'пользователь' : 'пользователя'}). Рекомендуем подождать больше визитов.`
  }

  const maxItem = data.reduce(
    (max, item) => (item.percentage > max.percentage ? item : max),
    data[0]
  )

  const depth75Plus = data.find((item) => item.depth_range === '75-100')
  const depth50_75 = data.find((item) => item.depth_range === '50-75')
  const depth25_50 = data.find((item) => item.depth_range === '25-50')
  const depth0_25 = data.find((item) => item.depth_range === '0-25')

  if (depth75Plus && depth75Plus.percentage >= 30) {
    return `Отличная вовлеченность! ${depth75Plus.percentage}% пользователей прокручивают страницу до конца (75-100%). Контент удерживает внимание.`
  } else if (depth50_75 && depth50_75.percentage >= 40) {
    return `Хорошая вовлеченность. ${depth50_75.percentage}% пользователей доходят до середины страницы (50-75%). Рекомендуем добавить призыв к действию в этой зоне.`
  } else if (depth25_50 && depth25_50.percentage >= 40) {
    return `Средняя вовлеченность. ${depth25_50.percentage}% пользователей останавливаются в первой трети (25-50%). Стоит улучшить начало страницы.`
  } else if (depth0_25 && depth0_25.percentage >= 50) {
    return `Низкая вовлеченность. ${depth0_25.percentage}% пользователей не скроллят дальше первого экрана (0-25%). Необходимо пересмотреть начало страницы и добавить мотивацию к просмотру.`
  }

  return `Наибольшая активность в диапазоне ${maxItem.depth_range}% (${maxItem.percentage}% пользователей)`
}

async function loadSessionsChart() {
  loadingSessions.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу, если выбран
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetSessionsByDayRoute.query(queryParams).run(ctx)

    if (result.success) {
      sessionsData.value = result.data || []
    }
  } catch (e) {
    console.error('Ошибка загрузки графика сессий:', e)
  } finally {
    loadingSessions.value = false
  }
}

function getChartPoints() {
  if (sessionsData.value.length === 0) return ''

  const maxSessions = getMaxSessions()
  if (maxSessions === 0) return ''

  return sessionsData.value
    .map((point, index) => {
      const x = 50 + (index / (sessionsData.value.length - 1 || 1)) * 900
      const y = 250 - (point.sessions / maxSessions) * 200
      return `${x},${y}`
    })
    .join(' ')
}

function getMaxSessions() {
  if (sessionsData.value.length === 0) return 1
  return Math.max(...sessionsData.value.map((p) => p.sessions), 1)
}

function getTotalSessionsChart() {
  return sessionsData.value.reduce((sum, p) => sum + p.sessions, 0)
}

function getAverageSessionsChart() {
  if (sessionsData.value.length === 0) return 0
  return Math.round(getTotalSessionsChart() / sessionsData.value.length)
}

function generateTitleFromPath(path) {
  if (!path) return ''
  // Убираем слеши и заменяем дефисы на пробелы
  let title = path.replace(/^\/*|\/*$/g, '').replace(/-/g, ' ')
  // Первая буква заглавная
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function onPathSelected() {
  // Автоматически заполняем title если он пустой
  if (newLanding.value.path && !newLanding.value.title) {
    newLanding.value.title = generateTitleFromPath(newLanding.value.path)
  }
}

function onPathManualInput() {
  // Нормализуем путь: убеждаемся что начинается с /
  if (newLanding.value.path && !newLanding.value.path.startsWith('/')) {
    newLanding.value.path = '/' + newLanding.value.path
  }

  // Автоматически заполняем title
  if (newLanding.value.path && !newLanding.value.title) {
    newLanding.value.title = generateTitleFromPath(newLanding.value.path)
  }
}

async function openManagementModal() {
  showManagementModal.value = true
  await loadAvailablePaths()
}

function startEditingTitle(landing) {
  editingLandingId.value = landing.id
  editingTitle.value = landing.title

  // Автофокус на input
  nextTick(() => {
    const input = document.querySelector(`input[data-landing-id="${landing.id}"]`)
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function cancelEditingTitle() {
  editingLandingId.value = null
  editingTitle.value = ''
}

async function saveTitle(landingId) {
  if (!editingTitle.value.trim()) {
    cancelEditingTitle()
    return
  }

  try {
    const result = await apiUpdateLandingTitleRoute.run(ctx, {
      id: landingId,
      title: editingTitle.value.trim()
    })

    if (result.success) {
      cancelEditingTitle()
      // Перезагружаем список лендингов и аналитику
      await loadLandings()
      await loadEngagementStats()
    }
  } catch (e) {
    console.error('Ошибка обновления названия:', e)
  }
}

function handleTitleKeydown(event, landingId) {
  if (event.key === 'Enter') {
    saveTitle(landingId)
  } else if (event.key === 'Escape') {
    cancelEditingTitle()
  }
}

async function loadDemographics() {
  loadingDemographics.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetDemographicsRoute.query(queryParams).run(ctx)

    if (result.success) {
      demographicsData.value = {
        regions: result.regions || [],
        cities: result.cities || []
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки демографических данных:', e)
  } finally {
    loadingDemographics.value = false
  }
}

function getRegionsSectors() {
  return calculateSectors(demographicsData.value.regions)
}

function getCitiesSectors() {
  return calculateSectors(demographicsData.value.cities)
}

function calculateSectors(data) {
  const radius = 120
  let currentAngle = 0

  return data.map((item) => {
    const percentage = parseFloat(item.percentage)
    const angle = (percentage / 100) * 360

    // Вычисляем начальные и конечные углы в радианах
    const startAngle = (currentAngle - 90) * (Math.PI / 180)
    const endAngle = (currentAngle + angle - 90) * (Math.PI / 180)

    // Вычисляем координаты начала и конца дуги
    const x1 = radius * Math.cos(startAngle)
    const y1 = radius * Math.sin(startAngle)
    const x2 = radius * Math.cos(endAngle)
    const y2 = radius * Math.sin(endAngle)

    // Определяем, нужна ли большая дуга
    const largeArcFlag = angle > 180 ? 1 : 0

    // Создаем path data для сектора
    const pathData = [
      `M 0 0`, // Начало в центре
      `L ${x1} ${y1}`, // Линия к началу дуги
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Дуга
      `Z` // Замыкаем путь обратно в центр
    ].join(' ')

    const sector = {
      name: item.name,
      count: item.count,
      percentage: item.percentage,
      pathData: pathData
    }

    currentAngle += angle
    return sector
  })
}

function getColorForSector(index) {
  const colors = [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
    '#84cc16' // lime-500
  ]
  return colors[index % colors.length]
}

function decodeRegionName(code) {
  if (!code) return 'Не указано'

  const regionMap = {
    MOW: 'Москва',
    SPE: 'Санкт-Петербург',
    KDA: 'Краснодарский край',
    TUL: 'Тульская область',
    TA: 'Республика Татарстан',
    NVS: 'Новосибирская область',
    TOM: 'Томская область',
    ULY: 'Ульяновская область',
    SVE: 'Свердловская область',
    ROS: 'Ростовская область',
    NIZ: 'Нижегородская область',
    KRS: 'Курская область',
    YAR: 'Ярославская область',
    SAM: 'Самарская область',
    KEM: 'Кемеровская область',
    KGN: 'Курганская область',
    ORE: 'Оренбургская область',
    PNZ: 'Пензенская область',
    PER: 'Пермский край',
    TVE: 'Тверская область',
    TYU: 'Тюменская область',
    CHE: 'Челябинская область',
    VOR: 'Воронежская область',
    VGG: 'Волгоградская область',
    BA: 'Республика Башкортостан',
    UD: 'Удмуртская Республика',
    ME: 'Республика Марий Эл',
    MO: 'Республика Мордовия',
    CU: 'Чувашская Республика',
    BEL: 'Белгородская область',
    BRY: 'Брянская область',
    VLA: 'Владимирская область',
    KLU: 'Калужская область',
    KOS: 'Костромская область',
    LIP: 'Липецкая область',
    ORL: 'Орловская область',
    RYA: 'Рязанская область',
    SMO: 'Смоленская область',
    TAM: 'Тамбовская область',
    TU: 'Тульская область',
    ALT: 'Алтайский край',
    KYA: 'Красноярский край',
    IRK: 'Иркутская область',
    KHA: 'Хабаровский край',
    PRI: 'Приморский край',
    SAK: 'Сахалинская область',
    KAM: 'Камчатский край',
    MAG: 'Магаданская область',
    11: 'Республика Коми',
    '01': 'Республика Адыгея',
    '04': 'Республика Алтай',
    '03': 'Республика Бурятия',
    '05': 'Республика Дагестан',
    '06': 'Республика Ингушетия',
    '07': 'Кабардино-Балкарская Республика',
    '08': 'Республика Калмыкия',
    '09': 'Карачаево-Черкесская Республика',
    10: 'Республика Карелия',
    12: 'Республика Крым',
    14: 'Республика Саха (Якутия)',
    15: 'Республика Северная Осетия — Алания',
    17: 'Республика Тыва',
    19: 'Республика Хакасия',
    20: 'Чеченская Республика'
  }

  return regionMap[code] || code
}

function decodeCityName(code) {
  if (!code) return 'Не указано'

  const cityMap = {
    Moscow: 'Москва',
    'Saint Petersburg': 'Санкт-Петербург',
    Novosibirsk: 'Новосибирск',
    Yekaterinburg: 'Екатеринбург',
    Kazan: 'Казань',
    'Nizhny Novgorod': 'Нижний Новгород',
    Chelyabinsk: 'Челябинск',
    Samara: 'Самара',
    Omsk: 'Омск',
    'Rostov-on-Don': 'Ростов-на-Дону',
    Ufa: 'Уфа',
    Krasnoyarsk: 'Красноярск',
    Voronezh: 'Воронеж',
    Perm: 'Пермь',
    Volgograd: 'Волгоград',
    Krasnodar: 'Краснодар',
    Saratov: 'Саратов',
    Tyumen: 'Тюмень',
    Tolyatti: 'Тольятти',
    Izhevsk: 'Ижевск',
    Barnaul: 'Барнаул',
    Ulyanovsk: 'Ульяновск',
    Irkutsk: 'Иркутск',
    Khabarovsk: 'Хабаровск',
    Yaroslavl: 'Ярославль',
    Vladivostok: 'Владивосток',
    Makhachkala: 'Махачкала',
    Tomsk: 'Томск',
    Orenburg: 'Оренбург',
    Kemerovo: 'Кемерово',
    Novokuznetsk: 'Новокузнецк',
    Ryazan: 'Рязань',
    'Naberezhnye Chelny': 'Набережные Челны',
    Astrakhan: 'Астрахань',
    Penza: 'Пенза',
    Kirov: 'Киров',
    Lipetsk: 'Липецк',
    Balashikha: 'Балашиха',
    Cheboksary: 'Чебоксары',
    Kaliningrad: 'Калининград',
    Tula: 'Тула',
    Kursk: 'Курск',
    Stavropol: 'Ставрополь',
    Sochi: 'Сочи',
    'Ulan-Ude': 'Улан-Удэ',
    Tver: 'Тверь',
    Magnitogorsk: 'Магнитогорск',
    Bryansk: 'Брянск',
    Ivanovo: 'Иваново',
    Belgorod: 'Белгород',
    Surgut: 'Сургут'
  }

  return cityMap[code] || code
}

async function loadDevices() {
  loadingDevices.value = true

  try {
    const queryParams =
      periodType.value === 'custom'
        ? {
            startDate: customStartDate.value,
            endDate: customEndDate.value
          }
        : { period: selectedPeriod.value }

    // Добавляем фильтр по лендингу
    if (selectedLanding.value && selectedLanding.value !== 'all') {
      queryParams.landingPath = selectedLanding.value
    }

    const result = await apiGetDevicesRoute.query(queryParams).run(ctx)

    if (result.success) {
      devicesData.value = {
        deviceTypes: result.deviceTypes || [],
        deviceBrands: result.deviceBrands || []
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки данных об устройствах:', e)
  } finally {
    loadingDevices.value = false
  }
}

function getDeviceTypesSectors() {
  return calculateSectors(devicesData.value.deviceTypes)
}

function getDeviceBrandsSectors() {
  return calculateSectors(devicesData.value.deviceBrands)
}

function decodeDeviceTypeName(type) {
  if (!type) return 'Не указано'

  const typeMap = {
    desktop: 'Компьютер',
    mobile: 'Мобильный',
    tablet: 'Планшет',
    tv: 'Smart TV',
    console: 'Консоль',
    wearable: 'Носимое устройство'
  }

  return typeMap[type.toLowerCase()] || type
}

function decodeDeviceBrandName(brand) {
  if (!brand) return 'Не указано'

  const brandMap = {
    Apple: 'Apple',
    Samsung: 'Samsung',
    Xiaomi: 'Xiaomi',
    Huawei: 'Huawei',
    OPPO: 'OPPO',
    Vivo: 'Vivo',
    Realme: 'Realme',
    OnePlus: 'OnePlus',
    Google: 'Google',
    LG: 'LG',
    Sony: 'Sony',
    Nokia: 'Nokia',
    Motorola: 'Motorola',
    Lenovo: 'Lenovo',
    Asus: 'Asus',
    Acer: 'Acer',
    HP: 'HP',
    Dell: 'Dell',
    Microsoft: 'Microsoft',
    Unknown: 'Неизвестно'
  }

  return brandMap[brand] || brand
}

onMounted(() => {
  // Сначала загружаем список лендингов
  loadLandings().then(() => {
    // После загрузки лендингов обновляем availableLandings
    const allLandingsActive = allLandings.value.filter((l) => l.isActive)
    availableLandings.value = allLandingsActive
    // Затем загружаем статистику
    loadEngagementStats()
  })
})
</script>

<style scoped></style>
