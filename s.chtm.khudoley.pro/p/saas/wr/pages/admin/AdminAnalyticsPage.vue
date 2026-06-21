<template>
  <div class="min-h-screen" style="background: var(--wr-bg)">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <!-- Episode filter -->
      <div class="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div class="flex-1">
          <select
            v-model="selectedEpisode"
            class="w-full input-modern rounded-xl px-4 py-2.5 text-sm wr-text-primary"
            :disabled="episodesLoading"
          >
            <option value="">
              {{
                episodesLoading
                  ? 'Загрузка...'
                  : mode === 'autowebinars'
                    ? 'Выберите автовебинар'
                    : 'Выберите эфир'
              }}
            </option>
            <option v-for="ep in episodes" :key="ep.id" :value="ep.id">
              {{ ep.title }}
            </option>
          </select>
        </div>
      </div>

      <!-- No episode selected -->
      <div v-if="!selectedEpisode" class="glass rounded-xl p-12 text-center">
        <div
          class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style="background: var(--wr-btn-subtle-bg)"
        >
          <i class="fas fa-chart-bar text-primary text-2xl"></i>
        </div>
        <h3 class="font-semibold wr-text-primary mb-2">
          {{ mode === 'autowebinars' ? 'Выберите автовебинар' : 'Выберите эфир' }}
        </h3>
        <p class="text-sm wr-text-tertiary">
          {{
            mode === 'autowebinars'
              ? 'Выберите автовебинар из списка, чтобы увидеть аналитику'
              : 'Выберите эфир из списка, чтобы увидеть аналитику'
          }}
        </p>
      </div>

      <template v-if="selectedEpisode">
        <!-- Tabs -->
        <div class="flex gap-1 mb-6 overflow-x-auto pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            :style="
              activeTab === tab.id
                ? { background: 'var(--wr-primary)', color: '#fff' }
                : { background: 'var(--wr-btn-subtle-bg)', color: 'var(--wr-text-secondary)' }
            "
            @click="switchTab(tab.id)"
          >
            <i :class="tab.icon" class="mr-1.5"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab switching loader -->
        <div v-if="tabSwitching" class="flex items-center justify-center py-12 mb-6">
          <div
            class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <!-- TAB: Overview -->
        <div v-if="activeTab === 'overview' && !tabSwitching">
          <!-- Summary Cards -->
          <div v-if="summary" class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold wr-text-primary">{{ summary.uniqueViewers }}</div>
              <div class="text-xs wr-text-tertiary mt-1">Уникальных</div>
            </div>
            <div v-if="mode === 'episodes'" class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold text-primary">{{ summary.peakViewers }}</div>
              <div class="text-xs wr-text-tertiary mt-1">Пик онлайн</div>
              <div
                v-if="summary.peakViewersTimeFromStart != null"
                class="text-[10px] wr-text-tertiary mt-0.5 font-mono"
              >
                {{ formatPeakTimecode(summary.peakViewersTimeFromStart) }}
              </div>
            </div>
            <div class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold" style="color: #60a5fa">
                {{ summary.avgEngagement || 0 }}%
              </div>
              <div class="text-xs wr-text-tertiary mt-1">Вовлечённость</div>
            </div>
          </div>

          <div v-if="mode === 'episodes'" class="mb-6">
            <!-- Timeline chart -->
            <div class="glass rounded-xl p-5">
              <h3 class="font-semibold text-sm mb-4 wr-text-primary">
                <i class="fas fa-clock mr-2 text-primary"></i>Активность по времени
              </h3>
              <div v-if="timeline.length === 0" class="text-xs wr-text-tertiary py-4 text-center">
                Нет данных
              </div>
              <div v-else class="relative">
                <canvas ref="timelineChartCanvas" style="max-height: 300px"></canvas>
                <div class="flex items-center justify-between text-[10px] wr-text-tertiary mt-2">
                  <span>Макс: {{ timelineMaxViewers }} зрителей</span>
                  <span>{{ timeline.length }} интервалов по 1 мин</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Retention Curve -->
          <div class="mb-6">
            <RetentionCurveChart :retention-curve="summary?.retentionCurve || []" />
          </div>

          <!-- Device, Countries & Event Type Stats -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div class="glass rounded-xl p-4">
              <h3 class="font-semibold text-sm mb-3 wr-text-primary">
                <i class="fas fa-mobile-alt mr-2 text-primary"></i>Устройства
              </h3>
              <div
                v-if="!summary || summary.deviceStats.length === 0"
                class="text-xs wr-text-tertiary"
              >
                Нет данных
              </div>
              <div
                v-for="d in summary?.deviceStats"
                :key="d.deviceType"
                class="flex items-center justify-between py-1.5"
              >
                <span class="text-sm wr-text-secondary">
                  <i
                    :class="d.deviceType === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-desktop'"
                    class="mr-2 w-4 text-center"
                  ></i>
                  {{
                    d.deviceType === 'mobile'
                      ? 'Мобильные'
                      : d.deviceType === 'desktop'
                        ? 'Десктоп'
                        : d.deviceType || 'Неизвестно'
                  }}
                </span>
                <span class="text-sm font-semibold wr-text-primary">{{ d.count }}</span>
              </div>
            </div>

            <div class="glass rounded-xl p-4">
              <h3 class="font-semibold text-sm mb-3 wr-text-primary">
                <i class="fas fa-globe mr-2 text-primary"></i>Страны
              </h3>
              <div
                v-if="!summary || summary.countryStats.length === 0"
                class="text-xs wr-text-tertiary"
              >
                Нет данных
              </div>
              <div
                v-for="c in summary?.countryStats.slice(0, 5)"
                :key="c.country"
                class="flex items-center justify-between py-1.5"
              >
                <span class="text-sm wr-text-secondary">
                  <span
                    class="inline-block w-2 h-2 rounded-full mr-2"
                    style="background: #60a5fa"
                  ></span>
                  {{ getCountryName(c.country) }}
                </span>
                <span class="text-sm font-semibold wr-text-primary">{{ c.count }}</span>
              </div>
            </div>

            <div class="glass rounded-xl p-4">
              <h3 class="font-semibold text-sm mb-3 wr-text-primary">
                <i class="fas fa-list mr-2 text-primary"></i>Типы событий
              </h3>
              <div
                v-if="!summary || summary.eventTypeStats.length === 0"
                class="text-xs wr-text-tertiary"
              >
                Нет данных
              </div>
              <div
                v-for="e in summary?.eventTypeStats.slice(0, 5)"
                :key="e.type"
                class="flex items-center justify-between py-1.5"
              >
                <span class="text-sm wr-text-secondary">
                  <span
                    class="inline-block w-2 h-2 rounded-full mr-2"
                    :style="{ background: eventColor(e.type) }"
                  ></span>
                  {{ eventLabel(e.type) }}
                </span>
                <span class="text-sm font-semibold wr-text-primary">{{ e.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: Viewers -->
        <div v-if="activeTab === 'viewers' && !tabSwitching">
          <!-- Payments Summary Cards -->
          <div v-if="paymentsSummary" class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold" style="color: #4ade80">
                {{ formatMoney(paymentsSummary.totalRevenue, paymentsSummary.currency) }}
              </div>
              <div class="text-xs wr-text-tertiary mt-1">Общая сумма</div>
            </div>
            <div class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold" style="color: #4ade80">
                {{ paymentsSummary.paidViewersCount }}
              </div>
              <div class="text-xs wr-text-tertiary mt-1">Заплатило</div>
            </div>
            <div class="glass rounded-xl p-4 text-center">
              <div class="text-2xl font-bold wr-text-tertiary">
                {{ paymentsSummary.notPaidViewersCount }}
              </div>
              <div class="text-xs wr-text-tertiary mt-1">Не заплатило</div>
            </div>
          </div>

          <div class="flex items-center justify-between mb-4 gap-3">
            <div class="flex items-center gap-3">
              <div class="text-sm wr-text-secondary">
                <span class="font-semibold wr-text-primary">{{ viewersTotalCount }}</span> зрителей
              </div>
              <select
                v-model="viewersPaymentFilter"
                @change="changeViewersPaymentFilter(viewersPaymentFilter)"
                class="input-modern rounded-lg px-3 py-1.5 text-xs wr-text-primary"
              >
                <option value="all">Все</option>
                <option value="paid">Заплатили</option>
                <option value="not_paid">Не заплатили</option>
              </select>
            </div>
            <a
              :href="viewersExportUrl"
              target="_blank"
              class="btn-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2"
            >
              <i class="fas fa-download"></i>
              <span class="hidden sm:inline">Экспорт зрителей</span>
              <span class="sm:hidden">CSV</span>
            </a>
          </div>

          <div v-if="viewersLoading" class="flex items-center justify-center py-12">
            <div
              class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
          </div>

          <div v-else-if="viewers.length > 0" class="glass rounded-xl overflow-hidden">
            <!-- Desktop table (md+) -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-sm" style="min-width: 700px">
                <thead>
                  <tr class="border-b" style="border-color: var(--wr-border)">
                    <th class="text-left px-3 py-3 wr-text-tertiary font-medium text-xs">
                      Зритель
                    </th>
                    <th class="text-left px-3 py-3 wr-text-tertiary font-medium text-xs">Email</th>
                    <th
                      class="text-left px-3 py-3 wr-text-tertiary font-medium text-xs hidden lg:table-cell"
                    >
                      Телефон
                    </th>
                    <th
                      class="text-center px-3 py-3 font-medium text-xs cursor-pointer hover:bg-opacity-50 transition-colors"
                      :style="{
                        color:
                          viewersSortBy === 'engagement'
                            ? 'var(--wr-primary)'
                            : 'var(--wr-text-tertiary)',
                        minWidth: '100px'
                      }"
                      @click="toggleViewersSort('engagement')"
                    >
                      <span class="inline-flex items-center gap-1">
                        Просмотр
                        <i
                          v-if="viewersSortBy === 'engagement'"
                          :class="
                            viewersSortOrder === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up'
                          "
                          class="text-[10px]"
                        ></i>
                      </span>
                    </th>
                    <th
                      class="text-left px-3 py-3 wr-text-tertiary font-medium text-xs hidden xl:table-cell"
                    >
                      Устр.
                    </th>
                    <th class="text-center px-3 py-3 wr-text-tertiary font-medium text-xs">
                      Оплата
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="v in viewers"
                    :key="'d' + v.userId"
                    class="border-b transition-colors"
                    style="border-color: var(--wr-border-light)"
                  >
                    <td class="px-3 py-3">
                      <div class="font-medium text-sm wr-text-primary truncate max-w-[140px]">
                        {{ v.name }}
                      </div>
                      <div
                        v-if="v.isAnonymous"
                        class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-1"
                        style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-tertiary)"
                      >
                        <i class="fas fa-user-secret"></i>
                        <span>Не авториз.</span>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-xs wr-text-secondary">
                      <span v-if="v.email" class="truncate block max-w-[160px]">{{ v.email }}</span>
                      <span v-else class="wr-text-tertiary">—</span>
                    </td>
                    <td class="px-3 py-3 text-xs wr-text-secondary hidden lg:table-cell">
                      <span v-if="v.phone">{{ v.phone }}</span>
                      <span v-else class="wr-text-tertiary">—</span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <div class="inline-flex items-center gap-1">
                        <span class="text-xs font-semibold" style="color: #60a5fa"
                          >{{ v.engagementPercent }}%</span
                        >
                        <span class="text-[10px] wr-text-tertiary font-mono">{{
                          formatWatchedTime(v.watchedSeconds)
                        }}</span>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-xs wr-text-tertiary hidden xl:table-cell">
                      <i
                        :class="v.device === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-desktop'"
                      ></i>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span
                        v-if="v.totalPaid > 0"
                        class="inline-flex items-center gap-1 text-xs font-semibold"
                        style="color: #4ade80"
                      >
                        <i class="fas fa-check-circle text-[10px]"></i>
                        {{ formatMoney(v.totalPaid, v.currency) }}
                      </span>
                      <span v-else class="text-xs wr-text-tertiary">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile cards (<md) -->
            <div class="md:hidden divide-y" style="border-color: var(--wr-border-light)">
              <div
                v-for="v in viewers"
                :key="'m' + v.userId"
                class="px-4 py-3 border-b"
                style="border-color: var(--wr-border-light)"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="min-w-0 flex-1 mr-3">
                    <div class="font-medium text-sm wr-text-primary truncate">{{ v.name }}</div>
                    <div v-if="v.email" class="text-xs wr-text-tertiary truncate">
                      {{ v.email }}
                    </div>
                    <div
                      v-if="v.isAnonymous"
                      class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-1"
                      style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-tertiary)"
                    >
                      <i class="fas fa-user-secret"></i> Не авторизован
                    </div>
                  </div>
                  <div v-if="v.totalPaid > 0" class="flex-shrink-0">
                    <span
                      class="inline-flex items-center gap-1 text-xs font-semibold"
                      style="color: #4ade80"
                    >
                      <i class="fas fa-check-circle text-[10px]"></i>
                      {{ formatMoney(v.totalPaid, v.currency) }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-xs">
                  <div class="flex items-center gap-1">
                    <span class="wr-text-tertiary">Просмотр:</span>
                    <span class="font-semibold" style="color: #60a5fa"
                      >{{ v.engagementPercent }}%</span
                    >
                    <span class="wr-text-tertiary font-mono">{{
                      formatWatchedTime(v.watchedSeconds)
                    }}</span>
                  </div>
                  <div v-if="v.device" class="wr-text-tertiary">
                    <i :class="v.device === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-desktop'"></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="viewersTotalPages > 1"
              class="flex items-center justify-between px-4 py-3 border-t"
              style="border-color: var(--wr-border)"
            >
              <div class="text-xs wr-text-tertiary">
                {{ viewersTotalCount }} зрителей, стр. {{ viewersPage }}/{{ viewersTotalPages }}
              </div>
              <div class="flex items-center gap-1">
                <button
                  :disabled="viewersPage <= 1"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToViewersPage(viewersPage - 1)"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button
                  v-for="p in viewersDisplayedPages"
                  :key="'vp' + p"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  :style="
                    p === viewersPage
                      ? { background: 'var(--wr-primary)', color: '#fff' }
                      : { background: 'var(--wr-btn-subtle-bg)', color: 'var(--wr-text-secondary)' }
                  "
                  @click="typeof p === 'number' && goToViewersPage(p)"
                  :disabled="typeof p !== 'number'"
                >
                  {{ p }}
                </button>
                <button
                  :disabled="viewersPage >= viewersTotalPages"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToViewersPage(viewersPage + 1)"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="glass rounded-xl p-12 text-center">
            <div
              class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <i class="fas fa-users text-primary text-2xl"></i>
            </div>
            <h3 class="font-semibold wr-text-primary mb-2">Нет зрителей</h3>
            <p class="text-sm wr-text-tertiary">
              Данные появятся, когда зрители начнут смотреть эфир
            </p>
          </div>
        </div>

        <!-- TAB: CTA -->
        <div v-if="activeTab === 'cta' && !tabSwitching">
          <!-- CTA Summary Cards -->
          <div v-if="ctaSummary" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="glass rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background: rgba(6, 182, 212, 0.15)"
                >
                  <i class="fas fa-users" style="color: #06b6d4"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-2xl font-bold wr-text-primary">{{ ctaSummary.totalSeen }}</div>
                  <div class="text-xs wr-text-tertiary flex items-center gap-1">
                    Увидели форму
                    <div class="group relative inline-block">
                      <i class="fas fa-info-circle text-[10px] cursor-help"></i>
                      <div
                        class="tooltip-content invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 text-xs rounded-lg shadow-lg z-10"
                        style="background: white; border: 1px solid var(--wr-border)"
                      >
                        <div class="wr-text-primary font-medium mb-1">
                          Всего: {{ ctaSummary.totalSeen }}
                        </div>
                        <div class="wr-text-tertiary text-[10px] space-y-0.5">
                          <div>• Автопоказ: {{ ctaSummary.totalShown }}</div>
                          <div>• Открыли сами: {{ ctaSummary.totalOpened }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="glass rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background: rgba(74, 222, 128, 0.15)"
                >
                  <i class="fas fa-paper-plane" style="color: #4ade80"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold wr-text-primary">
                    {{ ctaSummary.totalSubmitted }}
                  </div>
                  <div class="text-xs wr-text-tertiary">Отправлено</div>
                </div>
              </div>
            </div>
            <div class="glass rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background: rgba(248, 0, 91, 0.15)"
                >
                  <i class="fas fa-check-circle" style="color: #f8005b"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold wr-text-primary">
                    {{ ctaSummary.totalPaymentCompleted }}
                  </div>
                  <div class="text-xs wr-text-tertiary">Оплачено</div>
                </div>
              </div>
            </div>
            <div class="glass rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background: rgba(96, 165, 250, 0.15)"
                >
                  <i class="fas fa-percentage" style="color: #60a5fa"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold wr-text-primary">{{ ctaOverallConversion }}%</div>
                  <div class="text-xs wr-text-tertiary">Конверсия</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Per-form funnels -->
          <div v-if="ctaSummary && ctaSummary.formStats.length > 0" class="space-y-4 mb-6">
            <CtaFormFunnel v-for="form in ctaSummary.formStats" :key="form.formId" :form="form" />
          </div>

          <div
            v-else-if="ctaSummary && ctaSummary.formStats.length === 0"
            class="glass rounded-xl p-8 text-center mb-6"
          >
            <div
              class="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <i class="fas fa-filter text-primary text-lg"></i>
            </div>
            <div class="text-sm wr-text-tertiary">Нет данных по формам для этого эфира</div>
          </div>

          <!-- Events Table -->
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs wr-text-tertiary">{{ ctaTotalCount }} событий CTA</div>
            <div class="flex items-center gap-2">
              <button
                class="admin-btn-subtle px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-all"
                :class="{ 'opacity-50 pointer-events-none': ctaEventsRefreshing }"
                @click="refreshCtaEvents"
              >
                <i class="fas fa-sync-alt" :class="{ 'animate-spin': ctaEventsRefreshing }"></i>
                <span class="hidden sm:inline">Обновить</span>
              </button>
            </div>
          </div>

          <div v-if="ctaEventsLoading" class="flex items-center justify-center py-12">
            <div
              class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
          </div>

          <div v-else-if="ctaEvents.length > 0" class="glass rounded-xl overflow-hidden">
            <!-- Desktop table -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b" style="border-color: var(--wr-border)">
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">Дата</th>
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">
                      Пользователь
                    </th>
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">
                      Событие
                    </th>
                    <th
                      class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs hidden md:table-cell"
                    >
                      Форма
                    </th>
                    <th class="text-right px-4 py-3 wr-text-tertiary font-medium text-xs">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="event in ctaEvents"
                    :key="event.createdAt + event.formId"
                    class="border-b transition-colors"
                    style="border-color: var(--wr-border-light)"
                  >
                    <td class="px-4 py-2.5 wr-text-secondary text-xs whitespace-nowrap">
                      {{ formatDate(event.createdAt) }}
                    </td>
                    <td class="px-4 py-2.5 wr-text-primary text-xs truncate max-w-[140px]">
                      {{ event.userName }}
                    </td>
                    <td class="px-4 py-2.5">
                      <span
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        :style="{
                          background: ctaEventColor(event.eventType) + '22',
                          color: ctaEventColor(event.eventType)
                        }"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :style="{ background: ctaEventColor(event.eventType) }"
                        ></span>
                        {{ ctaEventLabel(event.eventType) }}
                      </span>
                    </td>
                    <td
                      class="px-4 py-2.5 wr-text-secondary text-xs truncate max-w-[180px] hidden md:table-cell"
                    >
                      {{ event.formTitle }}
                    </td>
                    <td class="px-4 py-2.5 text-right wr-text-secondary text-xs font-mono">
                      <template v-if="isPaymentEvent(event.eventType) && event.amount">
                        {{ event.amount }} {{ event.currency || '₽' }}
                      </template>
                      <template v-else>—</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile cards -->
            <div class="sm:hidden divide-y" style="border-color: var(--wr-border-light)">
              <div
                v-for="event in ctaEvents"
                :key="'m-cta-' + event.createdAt + event.formId"
                class="px-4 py-3 border-b"
                style="border-color: var(--wr-border-light)"
              >
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    :style="{
                      background: ctaEventColor(event.eventType) + '22',
                      color: ctaEventColor(event.eventType)
                    }"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="{ background: ctaEventColor(event.eventType) }"
                    ></span>
                    {{ ctaEventLabel(event.eventType) }}
                  </span>
                  <span
                    v-if="isPaymentEvent(event.eventType) && event.amount"
                    class="text-xs font-semibold font-mono"
                    style="color: #4ade80"
                  >
                    {{ event.amount }} {{ event.currency || '₽' }}
                  </span>
                  <span v-else class="text-[10px] wr-text-tertiary whitespace-nowrap">{{
                    formatDate(event.createdAt)
                  }}</span>
                </div>
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="wr-text-primary truncate">{{ event.userName }}</span>
                  <span class="wr-text-tertiary text-[10px] truncate max-w-[120px]">{{
                    event.formTitle
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="ctaTotalPages > 1"
              class="flex items-center justify-between px-4 py-3 border-t"
              style="border-color: var(--wr-border)"
            >
              <div class="text-xs wr-text-tertiary">стр. {{ ctaPage }}/{{ ctaTotalPages }}</div>
              <div class="flex items-center gap-1">
                <button
                  :disabled="ctaPage <= 1"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToCtaPage(ctaPage - 1)"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button
                  v-for="p in makePagination(ctaTotalPages, ctaPage)"
                  :key="'cta' + p"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  :style="
                    p === ctaPage
                      ? { background: 'var(--wr-primary)', color: '#fff' }
                      : { background: 'var(--wr-btn-subtle-bg)', color: 'var(--wr-text-secondary)' }
                  "
                  @click="typeof p === 'number' && goToCtaPage(p)"
                  :disabled="typeof p !== 'number'"
                >
                  {{ p }}
                </button>
                <button
                  :disabled="ctaPage >= ctaTotalPages"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToCtaPage(ctaPage + 1)"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="glass rounded-xl p-12 text-center">
            <div
              class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <i class="fas fa-bullhorn text-primary text-2xl"></i>
            </div>
            <h3 class="font-semibold wr-text-primary mb-2">Нет событий CTA</h3>
            <p class="text-sm wr-text-tertiary">
              События появятся, когда зрители начнут взаимодействовать с формами
            </p>
          </div>
        </div>

        <!-- TAB: Events -->
        <div v-if="activeTab === 'events' && !tabSwitching">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs wr-text-tertiary">{{ totalCount }} событий</div>
            <div class="flex items-center gap-2">
              <button
                class="admin-btn-subtle px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-all"
                :class="{ 'opacity-50 pointer-events-none': eventsRefreshing }"
                @click="refreshEvents"
              >
                <i class="fas fa-sync-alt" :class="{ 'animate-spin': eventsRefreshing }"></i>
                <span class="hidden sm:inline">Обновить</span>
              </button>
            </div>
          </div>

          <div v-if="eventsLoading" class="flex items-center justify-center py-12">
            <div
              class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
          </div>

          <div v-else-if="events.length > 0" class="glass rounded-xl overflow-hidden">
            <!-- Desktop table -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b" style="border-color: var(--wr-border)">
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">Дата</th>
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">
                      Пользователь
                    </th>
                    <th class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs">
                      Событие
                    </th>
                    <th
                      class="text-right px-4 py-3 wr-text-tertiary font-medium text-xs hidden md:table-cell"
                    >
                      Таймкод
                    </th>
                    <th
                      class="text-left px-4 py-3 wr-text-tertiary font-medium text-xs hidden lg:table-cell"
                    >
                      Устройство
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="event in events"
                    :key="event.createdAt + event.sessionId"
                    class="border-b transition-colors"
                    style="border-color: var(--wr-border-light)"
                  >
                    <td class="px-4 py-2.5 wr-text-secondary text-xs whitespace-nowrap">
                      {{ formatDate(event.createdAt) }}
                    </td>
                    <td class="px-4 py-2.5 wr-text-primary text-xs truncate max-w-[140px]">
                      {{ event.userName }}
                    </td>
                    <td class="px-4 py-2.5">
                      <span
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        :style="{
                          background: eventColor(event.eventType) + '22',
                          color: eventColor(event.eventType)
                        }"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :style="{ background: eventColor(event.eventType) }"
                        ></span>
                        {{ eventLabel(event.eventType) }}
                      </span>
                    </td>
                    <td
                      class="px-4 py-2.5 text-right wr-text-secondary text-xs font-mono hidden md:table-cell"
                    >
                      {{ event.streamTimecode != null ? formatTime(event.streamTimecode) : '—' }}
                    </td>
                    <td class="px-4 py-2.5 wr-text-tertiary text-xs hidden lg:table-cell">
                      <i
                        :class="event.device === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-desktop'"
                        class="mr-1"
                      ></i>
                      {{
                        event.device === 'mobile'
                          ? 'Моб'
                          : event.device === 'desktop'
                            ? 'ПК'
                            : event.device || '—'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile cards -->
            <div class="sm:hidden divide-y" style="border-color: var(--wr-border-light)">
              <div
                v-for="event in events"
                :key="'m-ev-' + event.createdAt + event.sessionId"
                class="px-4 py-3 border-b"
                style="border-color: var(--wr-border-light)"
              >
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    :style="{
                      background: eventColor(event.eventType) + '22',
                      color: eventColor(event.eventType)
                    }"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="{ background: eventColor(event.eventType) }"
                    ></span>
                    {{ eventLabel(event.eventType) }}
                  </span>
                  <span class="text-[10px] wr-text-tertiary whitespace-nowrap">{{
                    formatDate(event.createdAt)
                  }}</span>
                </div>
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="wr-text-primary truncate">{{ event.userName }}</span>
                  <div
                    class="flex items-center gap-2 text-xs wr-text-secondary font-mono flex-shrink-0"
                  >
                    <span v-if="event.streamTimecode != null">{{
                      formatTime(event.streamTimecode)
                    }}</span>
                    <i
                      :class="event.device === 'mobile' ? 'fas fa-mobile-alt' : 'fas fa-desktop'"
                      class="wr-text-tertiary"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="totalPages > 1"
              class="flex items-center justify-between px-4 py-3 border-t"
              style="border-color: var(--wr-border)"
            >
              <div class="text-xs wr-text-tertiary">стр. {{ currentPage }}/{{ totalPages }}</div>
              <div class="flex items-center gap-1">
                <button
                  :disabled="currentPage <= 1"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToPage(currentPage - 1)"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button
                  v-for="p in displayedPages"
                  :key="'ep' + p"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  :style="
                    p === currentPage
                      ? { background: 'var(--wr-primary)', color: '#fff' }
                      : { background: 'var(--wr-btn-subtle-bg)', color: 'var(--wr-text-secondary)' }
                  "
                  @click="typeof p === 'number' && goToPage(p)"
                  :disabled="typeof p !== 'number'"
                >
                  {{ p }}
                </button>
                <button
                  :disabled="currentPage >= totalPages"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style="background: var(--wr-btn-subtle-bg); color: var(--wr-text-secondary)"
                  @click="goToPage(currentPage + 1)"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="glass rounded-xl p-12 text-center">
            <div
              class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <i class="fas fa-chart-bar text-primary text-2xl"></i>
            </div>
            <h3 class="font-semibold wr-text-primary mb-2">Нет событий</h3>
            <p class="text-sm wr-text-tertiary">События появятся, когда зрители начнут смотреть</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { apiPlayerAnalyticsListRoute } from '../../api/analytics-modules/player-events-routes'
import {
  apiPlayerAnalyticsSummaryRoute,
  apiPlayerAnalyticsTimelineRoute
} from '../../api/analytics-modules/player-summary-routes'
import {
  apiPlayerAnalyticsViewersRoute,
  apiPlayerAnalyticsViewersExportRoute
} from '../../api/analytics-modules/player-viewers-routes'
import {
  apiFormAnalyticsSummaryRoute,
  apiFormAnalyticsListRoute
} from '../../api/analytics-modules/forms-routes'
import { apiViewersPaymentsSummaryRoute } from '../../api/analytics-modules/payments-routes'
import { apiEpisodesListRoute } from '../../api/episodes'
import { apiAutowebinarsListRoute } from '../../api/autowebinars'
import { initThemeWatcher } from '../../shared/theme'
import { getCountryName } from '../../shared/countries'
import RetentionCurveChart from '../../components/admin/analytics/RetentionCurveChart.vue'
import CtaFormFunnel from '../../components/admin/analytics/CtaFormFunnel.vue'
import {
  eventLabel,
  eventColor,
  ctaEventLabel,
  ctaEventColor,
  isPaymentEvent,
  formatDate,
  formatTime,
  formatWatchedTime,
  formatPeakTimecode,
  formatMoney,
  makePagination
} from '../../shared/analytics-helpers'

initThemeWatcher()

const props = defineProps({
  indexUrl: { type: String, required: true },
  mode: { type: String, default: 'episodes' }
})

const tabs = [
  { id: 'overview', label: 'Обзор', icon: 'fas fa-chart-pie' },
  { id: 'viewers', label: 'Зрители', icon: 'fas fa-users' },
  { id: 'cta', label: 'CTA', icon: 'fas fa-bullhorn' },
  { id: 'events', label: 'События плеера', icon: 'fas fa-stream' }
]

const selectedEpisode = ref('')
const activeTab = ref('overview')
const tabSwitching = ref(false)
const episodes = ref([])
const episodesLoading = ref(false)

// Summary
const summary = ref(null)

// Timeline
const timeline = ref([])
const timelineChartCanvas = ref(null)
let timelineChart = null

// Events tab
const events = ref([])
const eventsLoading = ref(false)
const eventsRefreshing = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

// Viewers tab
const viewers = ref([])
const viewersLoading = ref(false)
const viewersPage = ref(1)
const viewersTotalPages = ref(1)
const viewersTotalCount = ref(0)
const paymentsSummary = ref(null)
const viewersSortBy = ref('firstSeen') // 'firstSeen' | 'engagement'
const viewersSortOrder = ref('desc') // 'asc' | 'desc'
const viewersPaymentFilter = ref('all') // 'all' | 'paid' | 'not_paid'

// CTA tab
const ctaSummary = ref(null)
const ctaEvents = ref([])
const ctaEventsLoading = ref(false)
const ctaEventsRefreshing = ref(false)
const ctaPage = ref(1)
const ctaTotalPages = ref(1)
const ctaTotalCount = ref(0)

// CTA overall conversion
const ctaOverallConversion = computed(() => {
  if (!ctaSummary.value || !ctaSummary.value.totalSeen) return 0
  return Math.round((ctaSummary.value.totalSubmitted / ctaSummary.value.totalSeen) * 100)
})

// Export URLs
const viewersExportUrl = computed(() => {
  if (!selectedEpisode.value) return '#'
  return apiPlayerAnalyticsViewersExportRoute.query({ episodeId: selectedEpisode.value }).url()
})

// Computed properties
const timelineMaxViewers = computed(() => {
  if (timeline.value.length === 0) return 0
  return Math.max(...timeline.value.map((t) => t.viewers), 1)
})

const displayedPages = computed(() => makePagination(currentPage.value, totalPages.value))
const viewersDisplayedPages = computed(() =>
  makePagination(viewersPage.value, viewersTotalPages.value)
)

// Data loaders
async function loadSummary() {
  if (!selectedEpisode.value) {
    summary.value = null
    return
  }
  try {
    summary.value = await apiPlayerAnalyticsSummaryRoute
      .query({ episodeId: selectedEpisode.value })
      .run(ctx)
  } catch (e) {
    console.error('Failed to load summary:', e)
    summary.value = null
  }
}

async function loadTimeline() {
  if (!selectedEpisode.value) {
    timeline.value = []
    return
  }
  try {
    const data = await apiPlayerAnalyticsTimelineRoute
      .query({ episodeId: selectedEpisode.value })
      .run(ctx)
    timeline.value = data.timeline || []
    await nextTick()
    renderTimelineChart()
  } catch (e) {
    console.error('Failed to load timeline:', e)
    timeline.value = []
  }
}

function renderTimelineChart() {
  if (!timelineChartCanvas.value || timeline.value.length === 0) return

  // Destroy existing chart
  if (timelineChart) {
    timelineChart.destroy()
    timelineChart = null
  }

  const Chart = window.Chart
  if (!Chart) return

  const labels = timeline.value.map((t) => {
    const m = t.minute ?? 0
    const hours = Math.floor(m / 60)
    const minutes = m % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  })

  const viewersData = timeline.value.map((t) => t.viewers)

  const maxViewers = Math.max(...viewersData, 0)

  // Detect theme
  const isDark = document.documentElement.classList.contains('theme-dark')
  const textColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'
  const primaryColor = '#f8005b'

  const ctx = timelineChartCanvas.value.getContext('2d')
  timelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Зрители',
          data: viewersData,
          borderColor: primaryColor,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: primaryColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
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
          displayColors: true,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (context) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              return ` ${label}: ${value}`
            }
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
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          suggestedMax: Math.max(maxViewers + 1, 2), // Минимум до 2, чтобы не было плоского графика
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: textColor,
            font: { size: 10, family: 'Inter' },
            precision: 0,
            stepSize: 1 // Шаг 1 зритель
          },
          title: {
            display: true,
            text: 'Зрители',
            color: primaryColor,
            font: { size: 11, weight: 'bold', family: 'Inter' }
          }
        }
      }
    }
  })
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const data = await apiPlayerAnalyticsListRoute
      .query({
        episodeId: selectedEpisode.value || '',
        page: String(currentPage.value)
      })
      .run(ctx)
    events.value = data.events
    totalPages.value = data.totalPages
    totalCount.value = data.totalCount
  } catch (e) {
    console.error('Failed to load events:', e)
  }
  eventsLoading.value = false
}

async function loadViewers() {
  if (!selectedEpisode.value) {
    viewers.value = []
    return
  }
  viewersLoading.value = true
  try {
    const data = await apiPlayerAnalyticsViewersRoute
      .query({
        episodeId: selectedEpisode.value,
        page: String(viewersPage.value),
        sortBy: viewersSortBy.value,
        sortOrder: viewersSortOrder.value,
        paymentFilter: viewersPaymentFilter.value
      })
      .run(ctx)
    viewers.value = data.viewers
    viewersTotalPages.value = data.totalPages
    viewersTotalCount.value = data.totalCount
  } catch (e) {
    console.error('Failed to load viewers:', e)
  }
  viewersLoading.value = false
}

async function loadPaymentsSummary() {
  if (!selectedEpisode.value) {
    paymentsSummary.value = null
    return
  }
  try {
    paymentsSummary.value = await apiViewersPaymentsSummaryRoute
      .query({ episodeId: selectedEpisode.value })
      .run(ctx)
  } catch (e) {
    console.error('Failed to load payments summary:', e)
    paymentsSummary.value = null
  }
}

async function refreshEvents() {
  eventsRefreshing.value = true
  await loadEvents()
  eventsRefreshing.value = false
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadEvents()
}

function goToViewersPage(page) {
  if (page < 1 || page > viewersTotalPages.value) return
  viewersPage.value = page
  loadViewers()
}

function toggleViewersSort(column) {
  if (viewersSortBy.value === column) {
    // Toggle order
    viewersSortOrder.value = viewersSortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    // New column, default desc
    viewersSortBy.value = column
    viewersSortOrder.value = 'desc'
  }
  viewersPage.value = 1
  loadViewers()
}

function changeViewersPaymentFilter(value) {
  viewersPaymentFilter.value = value
  viewersPage.value = 1
  loadViewers()
}

function goToCtaPage(page) {
  if (page < 1 || page > ctaTotalPages.value) return
  ctaPage.value = page
  loadCtaEvents()
}

// CTA loaders
async function loadCtaSummary() {
  if (!selectedEpisode.value) {
    ctaSummary.value = null
    return
  }
  try {
    ctaSummary.value = await apiFormAnalyticsSummaryRoute
      .query({ episodeId: selectedEpisode.value })
      .run(ctx)
  } catch (e) {
    console.error('Failed to load CTA summary:', e)
    ctaSummary.value = null
  }
}

async function loadCtaEvents() {
  if (!selectedEpisode.value) {
    ctaEvents.value = []
    return
  }
  ctaEventsLoading.value = true
  try {
    const data = await apiFormAnalyticsListRoute
      .query({
        episodeId: selectedEpisode.value,
        page: String(ctaPage.value)
      })
      .run(ctx)
    ctaEvents.value = data.events
    ctaTotalPages.value = data.totalPages
    ctaTotalCount.value = data.totalCount
  } catch (e) {
    console.error('Failed to load CTA events:', e)
  }
  ctaEventsLoading.value = false
}

async function refreshCtaEvents() {
  ctaEventsRefreshing.value = true
  await loadCtaEvents()
  ctaEventsRefreshing.value = false
}

// Load data for active tab
async function loadActiveTabData() {
  if (!selectedEpisode.value) return
  if (activeTab.value === 'overview') {
    await loadTimeline()
  } else if (activeTab.value === 'viewers') {
    await Promise.all([loadViewers(), loadPaymentsSummary()])
  } else if (activeTab.value === 'cta') {
    await Promise.all([loadCtaSummary(), loadCtaEvents()])
  } else if (activeTab.value === 'events') {
    await loadEvents()
  }
}

// Switch tab with loader
async function switchTab(tabId) {
  if (activeTab.value === tabId) return
  tabSwitching.value = true
  activeTab.value = tabId
  await new Promise((resolve) => setTimeout(resolve, 150)) // Small delay for visual feedback
  tabSwitching.value = false
}

watch(selectedEpisode, () => {
  currentPage.value = 1
  viewersPage.value = 1
  ctaPage.value = 1
  summary.value = null
  timeline.value = []
  events.value = []
  viewers.value = []
  ctaSummary.value = null
  ctaEvents.value = []
  paymentsSummary.value = null

  // Обновляем URL с query параметром
  if (selectedEpisode.value) {
    const url = new URL(window.location.href)
    url.searchParams.set('episodeId', selectedEpisode.value)
    window.history.pushState({}, '', url.toString())

    loadSummary()
    loadActiveTabData()
  } else {
    // Удаляем параметр если эфир не выбран
    const url = new URL(window.location.href)
    url.searchParams.delete('episodeId')
    window.history.pushState({}, '', url.toString())
  }
})

watch(activeTab, () => {
  loadActiveTabData()
})

async function loadEpisodes() {
  episodesLoading.value = true
  try {
    if (props.mode === 'autowebinars') {
      episodes.value = await apiAutowebinarsListRoute.run(ctx)
    } else {
      episodes.value = await apiEpisodesListRoute.run(ctx)
    }

    const urlParams = new URLSearchParams(window.location.search)
    const episodeIdFromQuery = urlParams.get('episodeId')

    if (episodeIdFromQuery && episodes.value.some((ep) => ep.id === episodeIdFromQuery)) {
      selectedEpisode.value = episodeIdFromQuery
    } else if (!selectedEpisode.value && episodes.value.length > 0) {
      selectedEpisode.value = episodes.value[0].id
    }

    if (selectedEpisode.value) {
      loadSummary()
      loadActiveTabData()
    }
  } catch (e) {
    console.error('Failed to load list:', e)
  }
  episodesLoading.value = false
}

function navigateBack() {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', {
      detail: { section: 'episodes' }
    })
  )
}

onMounted(() => {
  loadEpisodes()
})

onUnmounted(() => {
  if (timelineChart) {
    timelineChart.destroy()
    timelineChart = null
  }
})
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
