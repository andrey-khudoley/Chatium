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
            @click="showManagementModal = true"
            class="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-cog"></i>
            Управление лендами
          </button>
        </div>
        <p class="text-gray-600">Статистика времени пребывания и глубины скроллинга на лендингах</p>
      </div>

      <!-- Период -->
      <div class="bg-white rounded-lg shadow mb-6 p-6">
        <div class="flex items-center gap-4">
          <div class="flex flex-col gap-2 flex-1">
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
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Всего лендингов</p>
                <p class="text-3xl font-bold text-gray-900">{{ engagementStats.length }}</p>
              </div>
              <div class="bg-blue-100 rounded-full p-4">
                <i class="fas fa-file-alt text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Всего визитов</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ (getTotalVisits() || 0).toLocaleString() }}
                </p>
              </div>
              <div class="bg-green-100 rounded-full p-4">
                <i class="fas fa-eye text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Уникальные сессии</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ (getTotalSessions() || 0).toLocaleString() }}
                </p>
              </div>
              <div class="bg-gray-100 rounded-full p-4">
                <i class="fas fa-user text-2xl text-gray-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Среднее время</p>
                <p class="text-3xl font-bold text-gray-900">{{ getAverageTime() }}</p>
              </div>
              <div class="bg-purple-100 rounded-full p-4">
                <i class="fas fa-clock text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Engagement Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900">
              <i class="fas fa-chart-line mr-2 text-gray-600"></i>
              Среднее время на лендингах
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
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template v-for="landing in engagementStats" :key="landing.path">
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        @click.stop="toggleHeatmap(landing.path)"
                        class="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        <i class="fas fa-fire mr-1"></i>
                        {{
                          expandedHeatmapLanding === landing.path
                            ? 'Скрыть карту'
                            : 'Тепловая карта'
                        }}
                      </button>
                    </td>
                  </tr>

                  <!-- Heatmap Details -->
                  <tr v-if="expandedHeatmapLanding === landing.path">
                    <td colspan="7" class="px-6 py-4 bg-gray-50">
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
      </div>

      <!-- No data -->
      <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Нет данных</h3>
        <p class="text-gray-500">За выбранный период нет данных о вовлеченности</p>
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
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="text-sm text-gray-700 mb-1 block">Путь (path)</label>
                  <input
                    type="text"
                    v-model="newLanding.path"
                    placeholder="/landing-1"
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
                <p>Путь должен начинаться с "/" и совпадать с путём к лендингу в системе</p>
              </div>

              <button
                @click="createLanding"
                :disabled="!newLanding.path || !newLanding.title || creatingLanding"
                class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i class="fas fa-plus" :class="{ 'fa-spin fa-spinner': creatingLanding }"></i>
                {{ creatingLanding ? 'Создание...' : 'Создать' }}
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
              <div>
                <p class="font-semibold text-gray-900">{{ landing.title }}</p>
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
import { ref, onMounted } from 'vue'
import {
  apiGetEngagementStatsRoute,
  apiGetScrollHeatmapRoute,
  apiGetUtmStatsRoute
} from '../api/analytics'
import {
  apiGetLandingsRoute,
  apiCreateLandingRoute,
  apiToggleLandingRoute,
  apiDeleteLandingRoute
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

// Management modal
const showManagementModal = ref(false)
const allLandings = ref([])
const loadingLandings = ref(false)
const newLanding = ref({ path: '', title: '' })
const creatingLanding = ref(false)
const createError = ref('')

function getTotalSessions() {
  return engagementStats.value.reduce((sum, item) => sum + (item.sessions_count || 0), 0)
}

function getTotalVisits() {
  return engagementStats.value.reduce((sum, item) => sum + (item.visits_count || 0), 0)
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

    const result = await apiGetEngagementStatsRoute.query(queryParams).run(ctx)

    if (result.success) {
      engagementStats.value = result.data || []
    }

    // Загружаем UTM статистику параллельно
    loadUtmStats()
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
    }
  } catch (e) {
    console.error('Ошибка загрузки лендингов:', e)
  } finally {
    loadingLandings.value = false
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

onMounted(() => {
  loadEngagementStats()
  loadLandings()
})
</script>

<style scoped></style>
