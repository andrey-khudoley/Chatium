<template>
  <div class="min-h-screen bg-background">
    <!-- Контент -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Действия -->
      <div
        class="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 space-y-4 md:space-y-0"
      >
        <div class="flex items-center space-x-3">
          <button
            v-if="!isMonitoring"
            @click="startMonitoring"
            :disabled="loading || isSearchMode"
            class="btn-primary"
          >
            <i class="fas fa-play mr-2"></i>
            Начать мониторинг
          </button>
          <button v-else @click="stopMonitoring" class="btn-secondary">
            <i class="fas fa-stop mr-2"></i>
            Остановить
          </button>
          <button @click="refreshEvents" :disabled="loading" class="btn-secondary">
            <i class="fas fa-sync-alt mr-2" :class="{ 'animate-spin': loading }"></i>
            Обновить
          </button>
          <button @click="showFilterModal = true" class="btn-secondary">
            <i class="fas fa-filter mr-2"></i>
            Настроить
          </button>
        </div>
      </div>

      <!-- Поиск событий -->
      <div class="card mb-6">
        <div class="search-container">
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <input
                v-model="searchQuery"
                @keydown="handleSearchKeydown"
                type="text"
                placeholder="Поиск по email, user_id, uid, IP, URL, title страницы, параметрам и другим полям..."
                class="search-input"
                :disabled="searchLoading"
              />
            </div>
            <button
              @click="searchEvents"
              :disabled="searchLoading || !searchQuery || searchQuery.trim() === ''"
              class="btn-primary whitespace-nowrap"
            >
              <i class="fas fa-search mr-2"></i>
              Найти
            </button>
            <button
              v-if="isSearchMode"
              @click="clearSearch"
              class="btn-secondary whitespace-nowrap"
            >
              <i class="fas fa-times mr-2"></i>
              Сбросить
            </button>
          </div>
        </div>

        <!-- Индикатор режима поиска -->
        <div v-if="isSearchMode" class="mt-3 flex items-center text-sm">
          <i class="fas fa-info-circle text-primary mr-2"></i>
          <span class="text-muted">
            Показаны результаты поиска:
            <span class="font-semibold text-foreground">{{ events.length }}</span> из
            <span class="font-semibold text-foreground">{{ searchTotal }}</span> событий
          </span>
        </div>
      </div>

      <!-- Список событий -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">
            <i class="fas fa-stream mr-2 text-primary"></i>
            Последние события
          </h2>
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted">
              Всего: {{ isSearchMode ? searchTotal : events.length }}
            </span>
            <!-- Пагинация -->
            <div class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="
                  isSearchMode
                    ? searchCurrentPage === 1 || searchLoading
                    : currentPage === 1 || loading
                "
                class="px-3 py-1 rounded transition-colors text-sm"
                :class="
                  (
                    isSearchMode
                      ? searchCurrentPage === 1 || searchLoading
                      : currentPage === 1 || loading
                  )
                    ? 'text-muted cursor-not-allowed opacity-50'
                    : 'text-primary hover:bg-primary/10 cursor-pointer'
                "
              >
                <i class="fas fa-chevron-left"></i>
              </button>

              <span class="text-sm text-muted">
                Страница {{ isSearchMode ? searchCurrentPage : currentPage }}
              </span>

              <button
                @click="nextPage"
                :disabled="
                  isSearchMode
                    ? searchLoading || searchCurrentPage * pageSize >= searchTotal
                    : loading || events.length < pageSize
                "
                class="px-3 py-1 rounded transition-colors text-sm"
                :class="
                  (
                    isSearchMode
                      ? searchLoading || searchCurrentPage * pageSize >= searchTotal
                      : loading || events.length < pageSize
                  )
                    ? 'text-muted cursor-not-allowed opacity-50'
                    : 'text-primary hover:bg-primary/10 cursor-pointer'
                "
              >
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="loading && events.length === 0" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-muted mb-4"></i>
          <p class="text-muted">Загрузка событий...</p>
        </div>

        <div v-else-if="events.length === 0" class="text-center py-12">
          <i class="fas fa-inbox text-4xl text-muted mb-4"></i>
          <p class="text-muted">Событий пока нет</p>
          <p class="text-sm text-muted mt-2">
            Начните мониторинг для отслеживания событий в реальном времени
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <tbody>
              <tr
                v-for="(event, index) in events"
                :key="index"
                class="border-b border-border hover:bg-accent/5 transition-colors"
                :class="{ 'bg-success/5': event.isNew }"
              >
                <!-- Колонка 1: Время + UID/GC IDs для HTTP событий -->
                <td
                  class="px-3 text-xs align-top"
                  style="width: 140px; height: 88px; padding-top: 12px; padding-bottom: 12px"
                >
                  <div class="font-medium">{{ formatTimestamp(event.ts) }}</div>
                  <div v-if="isHttpEvent(event)" class="mt-1 space-y-0.5">
                    <div
                      v-if="event.uid"
                      class="font-mono text-muted text-xs truncate"
                      :title="event.uid"
                      style="
                        max-width: 120px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                      "
                    >
                      {{ event.uid }}
                    </div>
                    <div
                      v-if="event.gc_visitor_id"
                      class="font-mono text-muted text-xs truncate"
                      :title="event.gc_visitor_id"
                      style="
                        max-width: 120px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                      "
                    >
                      {{ event.gc_visitor_id }}
                    </div>
                  </div>
                </td>

                <!-- Колонка 2: IP, страна, город, устройство -->
                <td
                  class="px-3 text-xs align-top"
                  style="width: 180px; height: 88px; padding-top: 12px; padding-bottom: 12px"
                >
                  <div v-if="event.ip" class="font-mono mb-1">{{ event.ip }}</div>
                  <div v-if="event.location_country || event.location_city" class="mb-1 truncate">
                    <i class="fas fa-flag mr-1 text-muted"></i>
                    <span class="text-muted">{{
                      [event.location_country, event.location_city].filter(Boolean).join(', ')
                    }}</span>
                  </div>
                  <div v-if="getUserDevice(event)" class="text-muted truncate">
                    {{ getUserDevice(event) }}
                  </div>
                </td>

                <!-- Колонка 3: Пользователь -->
                <td
                  class="px-3 text-sm align-top"
                  style="width: 200px; height: 88px; padding-top: 12px; padding-bottom: 12px"
                >
                  <div class="min-w-0">
                    <div class="font-medium truncate">
                      {{ getUserDisplayName(event) }}
                    </div>
                    <div v-if="event.user_email" class="text-xs text-muted truncate">
                      {{ event.user_email }}
                    </div>
                    <div
                      v-if="event.user_account_role && event.user_account_role !== 'None'"
                      class="mt-1"
                    >
                      <span
                        class="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style="
                          background-color: rgba(147, 51, 234, 0.15);
                          color: #a855f7;
                          border: 1px solid rgba(147, 51, 234, 0.3);
                        "
                      >
                        {{ event.user_account_role }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Колонка 4: Событие и описание -->
                <td
                  class="px-3 text-sm align-top"
                  style="height: 88px; padding-top: 12px; padding-bottom: 12px"
                >
                  <div v-if="isHttpEvent(event)">
                    <!-- HTTP события (pageview и т.д.) -->
                    <div v-if="event.title" class="font-medium mb-1 truncate">
                      {{ event.title }}
                    </div>
                    <div class="text-xs break-all line-clamp-2">
                      <span
                        v-if="getUrlProtocol(event.url || event.urlPath)"
                        class="text-muted"
                        style="opacity: 0.5"
                        >{{ getUrlProtocol(event.url || event.urlPath) }}</span
                      ><span class="font-medium" style="color: var(--color-foreground)">{{
                        getUrlPath(event.url || event.urlPath)
                      }}</span
                      ><span
                        v-if="getUrlParams(event.url || event.urlPath)"
                        class="text-muted"
                        style="opacity: 0.5"
                        >{{ getUrlParams(event.url || event.urlPath) }}</span
                      >
                    </div>
                    <!-- UTM метки для HTTP событий -->
                    <div
                      v-if="
                        event.utm_source ||
                        event.utm_medium ||
                        event.utm_campaign ||
                        event.utm_term ||
                        event.utm_content
                      "
                      class="mt-2 space-y-1"
                    >
                      <div v-if="event.utm_source" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">utm_source:</span>
                          <span>{{ event.utm_source }}</span>
                        </span>
                      </div>
                      <div v-if="event.utm_medium" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">utm_medium:</span>
                          <span>{{ event.utm_medium }}</span>
                        </span>
                      </div>
                      <div v-if="event.utm_campaign" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">utm_campaign:</span>
                          <span>{{ event.utm_campaign }}</span>
                        </span>
                      </div>
                      <div v-if="event.utm_term" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">utm_term:</span>
                          <span>{{ event.utm_term }}</span>
                        </span>
                      </div>
                      <div v-if="event.utm_content" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">utm_content:</span>
                          <span>{{ event.utm_content }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <!-- GetCourse события -->
                    <div class="mb-1 text-sm truncate">{{ event.urlPath }}</div>
                    <div
                      v-if="event.action_param1 || event.action_param2 || event.action_param3"
                      class="mt-2 space-y-1"
                    >
                      <div v-if="event.action_param1" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">action_param1:</span>
                          <span>{{ event.action_param1 }}</span>
                        </span>
                      </div>
                      <div v-if="event.action_param2" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">action_param2:</span>
                          <span>{{ event.action_param2 }}</span>
                        </span>
                      </div>
                      <div v-if="event.action_param3" class="text-xs">
                        <span class="param-badge">
                          <span class="font-medium mr-1">action_param3:</span>
                          <span>{{ event.action_param3 }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Колонка 5: Кнопка меню -->
                <td
                  class="px-3 text-center align-top"
                  style="width: 40px; height: 88px; padding-top: 12px; padding-bottom: 12px"
                >
                  <button
                    @click="openEventDetails(event)"
                    class="text-muted hover:text-foreground transition-colors"
                    :title="'Показать все параметры события'"
                  >
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Модальное окно с фильтром событий -->
    <div
      v-if="showFilterModal"
      @click.self="closeFilterModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div
        @click.stop
        class="rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-[var(--color-bg-secondary)] text-[var(--color-text)] border border-[var(--color-border)]"
      >
        <!-- Заголовок модального окна -->
        <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <i class="fas fa-filter text-lg" style="color: var(--color-primary)"></i>
            </div>
            <h3 class="text-2xl font-bold text-[var(--color-text)]">Фильтр событий</h3>
          </div>
          <button
            @click="closeFilterModal"
            class="transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Содержимое модального окна -->
        <div class="flex-1 overflow-y-auto p-6">
          <p class="text-[var(--color-text-secondary)] mb-6">
            Выберите, какие типы событий будут отслеживаться на странице мониторинга (сохраняются
            автоматически)
          </p>

          <!-- HTTP События (Traffic) -->
          <div class="mb-6">
            <div
              class="flex items-center justify-between mb-3 p-3 rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <div
                class="flex items-center justify-between flex-1 cursor-pointer"
                @click="trafficExpanded = !trafficExpanded"
              >
                <h3 class="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
                  <i class="fas fa-globe text-blue-500"></i>
                  HTTP События (Traffic)
                  <span class="text-sm font-normal text-[var(--color-text-secondary)]">
                    ({{ selectedTrafficEventsCount }} из {{ trafficEvents.length }}
                    {{ getEventWord(selectedTrafficEventsCount) }})
                  </span>
                </h3>
                <i
                  :class="trafficExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                  class="text-[var(--color-text-secondary)]"
                ></i>
              </div>
              <div class="flex items-center gap-2 ml-4" @click.stop>
                <button
                  @click="selectAllTrafficEvents"
                  class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style="background: var(--color-border); color: var(--color-text)"
                  :class="
                    selectedTrafficEventsCount === trafficEvents.length
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                  "
                  :disabled="selectedTrafficEventsCount === trafficEvents.length"
                >
                  <i class="fas fa-check-double mr-1"></i>
                  Все
                </button>
                <button
                  @click="deselectAllTrafficEvents"
                  class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style="background: var(--color-border); color: var(--color-text)"
                  :class="
                    selectedTrafficEventsCount === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                  "
                  :disabled="selectedTrafficEventsCount === 0"
                >
                  <i class="fas fa-times mr-1"></i>
                  Снять
                </button>
              </div>
            </div>
            <div
              v-show="trafficExpanded"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
            >
              <div
                v-for="eventDef in trafficEvents"
                :key="eventDef.name"
                class="p-3 border rounded-md cursor-pointer transition-all hover:shadow-sm"
                :class="
                  selectedEventTypes.includes(eventDef.name)
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 bg-white dark:bg-gray-800'
                "
                @click="toggleEventType(eventDef.name)"
              >
                <div class="flex items-start gap-2">
                  <input
                    type="checkbox"
                    :checked="selectedEventTypes.includes(eventDef.name)"
                    class="w-4 h-4 flex-shrink-0 mt-0.5"
                    @click.stop="toggleEventType(eventDef.name)"
                  />
                  <div class="flex-1">
                    <h4
                      class="font-medium text-sm leading-tight"
                      :class="
                        selectedEventTypes.includes(eventDef.name)
                          ? 'text-blue-900 dark:text-blue-200'
                          : 'text-gray-800 dark:text-gray-100'
                      "
                    >
                      {{ eventDef.description }}
                    </h4>
                    <p
                      class="text-xs mt-1 break-all"
                      :class="
                        selectedEventTypes.includes(eventDef.name)
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300'
                      "
                    >
                      {{ eventDef.name }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- События GetCourse -->
          <div class="mb-6">
            <div
              class="flex items-center justify-between mb-3 p-3 rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <div
                class="flex items-center justify-between flex-1 cursor-pointer"
                @click="getcourseExpanded = !getcourseExpanded"
              >
                <h3 class="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
                  <i class="fas fa-graduation-cap text-purple-500"></i>
                  События GetCourse
                  <span class="text-sm font-normal text-[var(--color-text-secondary)]">
                    ({{ selectedGetcourseEventsCount }} из {{ getcourseEvents.length }}
                    {{ getEventWord(selectedGetcourseEventsCount) }})
                  </span>
                </h3>
                <i
                  :class="getcourseExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                  class="text-[var(--color-text-secondary)]"
                ></i>
              </div>
              <div class="flex items-center gap-2 ml-4" @click.stop>
                <button
                  @click="selectAllGetcourseEvents"
                  class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style="background: var(--color-border); color: var(--color-text)"
                  :class="
                    selectedGetcourseEventsCount === getcourseEvents.length
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                  "
                  :disabled="selectedGetcourseEventsCount === getcourseEvents.length"
                >
                  <i class="fas fa-check-double mr-1"></i>
                  Все
                </button>
                <button
                  @click="deselectAllGetcourseEvents"
                  class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style="background: var(--color-border); color: var(--color-text)"
                  :class="
                    selectedGetcourseEventsCount === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                  "
                  :disabled="selectedGetcourseEventsCount === 0"
                >
                  <i class="fas fa-times mr-1"></i>
                  Снять
                </button>
              </div>
            </div>
            <div v-show="getcourseExpanded" class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div
                v-for="eventDef in getcourseEvents"
                :key="eventDef.name"
                class="p-3 border rounded-md cursor-pointer transition-all hover:shadow-sm"
                :class="
                  selectedEventTypes.includes(eventDef.name)
                    ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 bg-white dark:bg-gray-800'
                "
                @click="toggleEventType(eventDef.name)"
              >
                <div class="flex items-start gap-2">
                  <input
                    type="checkbox"
                    :checked="selectedEventTypes.includes(eventDef.name)"
                    class="w-4 h-4 flex-shrink-0 mt-0.5"
                    @click.stop="toggleEventType(eventDef.name)"
                  />
                  <div class="flex-1">
                    <h4
                      class="font-medium text-sm leading-tight mb-1"
                      :class="
                        selectedEventTypes.includes(eventDef.name)
                          ? 'text-purple-900 dark:text-purple-200'
                          : 'text-gray-800 dark:text-gray-100'
                      "
                    >
                      {{ eventDef.description }}
                    </h4>
                    <p
                      class="text-xs font-mono break-all"
                      :class="
                        selectedEventTypes.includes(eventDef.name)
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-600 dark:text-gray-300'
                      "
                    >
                      {{ eventDef.urlPath || eventDef.name }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-6 flex flex-col md:flex-row items-center justify-end gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--color-text-secondary)]">Выбрано:</span>
              <span class="text-lg font-bold" style="color: var(--color-primary)">{{
                selectedEventTypes.length
              }}</span>
              <span class="text-sm text-[var(--color-text-secondary)]"
                >из {{ trafficEvents.length + getcourseEvents.length }}</span
              >
            </div>
          </div>
        </div>

        <!-- Футер модального окна -->
        <div class="flex items-center justify-end p-6 border-t border-[var(--color-border)]">
          <button
            @click="closeFilterModal"
            class="px-4 py-2 rounded-lg transition-colors bg-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            <i class="fas fa-times mr-2"></i>
            Закрыть
          </button>
        </div>
      </div>
    </div>

    <!-- Тост успешного сохранения -->
    <div
      v-if="showSuccessToast"
      class="fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in"
      style="
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        border: 1px solid #6ee7b7;
      "
    >
      <i class="fas fa-check-circle text-green-700 text-xl"></i>
      <span class="text-green-900 font-medium">Сохранено</span>
    </div>

    <!-- Модальное окно с деталями события -->
    <div
      v-if="showDetailsModal"
      @click="closeDetailsModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div
        @click.stop
        class="rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-[var(--color-bg-secondary)] text-[var(--color-text)] border border-[var(--color-border)]"
      >
        <!-- Заголовок модального окна -->
        <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h3 class="text-xl font-semibold text-[var(--color-text)]">
            <i class="fas fa-info-circle text-primary mr-2"></i>
            Детали события
          </h3>
          <button
            @click="closeDetailsModal"
            class="transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Содержимое модального окна -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="loadingDetails" class="text-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-muted mb-4"></i>
            <p class="text-muted">Загрузка данных...</p>
          </div>

          <div v-else-if="detailsError" class="text-center py-12">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <p class="text-red-500">{{ detailsError }}</p>
          </div>

          <div v-else-if="eventDetails" class="space-y-6">
            <!-- Основная информация -->
            <div class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-calendar-alt mr-2 text-primary"></i>
                Основная информация
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Время события</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ formatTime(eventDetails.ts) }}
                  </div>
                  <div class="text-sm text-[var(--color-text-secondary)]">
                    {{ formatDate(eventDetails.dt) }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Действие</div>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getActionBadgeClass(getEventAction(eventDetails))"
                  >
                    {{ getEventAction(eventDetails) }}
                  </span>
                </div>
                <div v-if="eventDetails.url" class="md:col-span-2">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">URL</div>
                  <div class="font-mono text-sm break-all text-[var(--color-text)]">
                    {{ eventDetails.url }}
                  </div>
                </div>
                <div v-if="eventDetails.title" class="md:col-span-2">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Заголовок страницы
                  </div>
                  <div class="font-medium text-[var(--color-text)]">{{ eventDetails.title }}</div>
                </div>
                <div v-if="eventDetails.referer" class="md:col-span-2">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Реферер</div>
                  <div class="font-mono text-sm break-all text-[var(--color-text)]">
                    {{ eventDetails.referer }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Параметры действия -->
            <div
              v-if="
                eventDetails.action_param1 ||
                eventDetails.action_param2 ||
                eventDetails.action_param3
              "
              class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
            >
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-sliders-h mr-2 text-primary"></i>
                Параметры действия
              </h4>
              <div class="space-y-3">
                <div v-if="eventDetails.action_param1">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">action_param1</div>
                  <div class="param-field">
                    {{ eventDetails.action_param1 }}
                  </div>
                </div>
                <div v-if="eventDetails.action_param2">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">action_param2</div>
                  <div class="param-field">
                    {{ eventDetails.action_param2 }}
                  </div>
                </div>
                <div v-if="eventDetails.action_param3">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">action_param3</div>
                  <div class="param-field">
                    {{ eventDetails.action_param3 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- UTM метки -->
            <div
              v-if="
                eventDetails.utm_source ||
                eventDetails.utm_medium ||
                eventDetails.utm_campaign ||
                eventDetails.utm_term ||
                eventDetails.utm_content
              "
              class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
            >
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-tag mr-2 text-primary"></i>
                UTM метки
              </h4>
              <div class="space-y-3">
                <div v-if="eventDetails.utm_source">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">utm_source</div>
                  <div class="param-field">
                    {{ eventDetails.utm_source }}
                  </div>
                </div>
                <div v-if="eventDetails.utm_medium">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">utm_medium</div>
                  <div class="param-field">
                    {{ eventDetails.utm_medium }}
                  </div>
                </div>
                <div v-if="eventDetails.utm_campaign">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">utm_campaign</div>
                  <div class="param-field">
                    {{ eventDetails.utm_campaign }}
                  </div>
                </div>
                <div v-if="eventDetails.utm_term">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">utm_term</div>
                  <div class="param-field">
                    {{ eventDetails.utm_term }}
                  </div>
                </div>
                <div v-if="eventDetails.utm_content">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">utm_content</div>
                  <div class="param-field">
                    {{ eventDetails.utm_content }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Информация о пользователе -->
            <div class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-user mr-2 text-primary"></i>
                Информация о пользователе
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Имя</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ getUserFullName(eventDetails) || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Email</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.user_email || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Телефон</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.user_phone || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Роль</div>
                  <div>
                    <span
                      v-if="
                        eventDetails.user_account_role && eventDetails.user_account_role !== 'None'
                      "
                      class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                    >
                      {{ eventDetails.user_account_role }}
                    </span>
                    <span v-else class="text-[var(--color-text)]">-</span>
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">User ID</div>
                  <div class="font-mono text-sm break-all text-[var(--color-text)]">
                    {{ eventDetails.user_id || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">UID</div>
                  <div class="font-mono text-sm break-all text-[var(--color-text)]">
                    {{ eventDetails.uid || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Session ID</div>
                  <div class="font-mono text-sm break-all text-[var(--color-text)]">
                    {{ eventDetails.session_id || '-' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Технические данные -->
            <div class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-laptop mr-2 text-primary"></i>
                Технические данные
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Устройство -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Тип устройства</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.ua_device_type || eventDetails.device_type || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Название устройства
                  </div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.device_name || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Бренд устройства
                  </div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.ua_device_brand || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Модель устройства
                  </div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.ua_device_model || '-' }}
                  </div>
                </div>

                <!-- Браузер и ОС -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Браузер</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ formatBrowser(eventDetails) }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Операционная система
                  </div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ formatOS(eventDetails) }}
                  </div>
                </div>

                <!-- Экран -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Разрешение экрана
                  </div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{
                      eventDetails.screen_width && eventDetails.screen_height
                        ? `${eventDetails.screen_width} × ${eventDetails.screen_height}`
                        : '-'
                    }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Pixel Ratio</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.screen_pixel_ratio || '-' }}
                  </div>
                </div>

                <!-- Местоположение -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">IP адрес</div>
                  <div class="font-mono text-sm text-[var(--color-text)]">
                    {{ eventDetails.ip || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Страна</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.location_country || eventDetails.country || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Регион</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.location_region || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Город</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.location_city || eventDetails.city || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Часовой пояс</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{ eventDetails.location_time_zone || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">Координаты</div>
                  <div class="font-medium text-[var(--color-text)]">
                    {{
                      eventDetails.location_coordinates_latitude &&
                      eventDetails.location_coordinates_longitude
                        ? `${eventDetails.location_coordinates_latitude}, ${eventDetails.location_coordinates_longitude}`
                        : '-'
                    }}
                  </div>
                </div>

                <!-- Роль пользователя -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Роль пользователя
                  </div>
                  <div>
                    <span
                      v-if="
                        eventDetails.user_account_role && eventDetails.user_account_role !== 'None'
                      "
                      class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                    >
                      {{ eventDetails.user_account_role }}
                    </span>
                    <span v-else class="text-[var(--color-text)]">{{
                      eventDetails.user_account_role || '-'
                    }}</span>
                  </div>
                </div>

                <!-- GetCourse -->
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">GC Visit ID</div>
                  <div class="font-mono text-sm text-[var(--color-text)]">
                    {{ eventDetails.gc_visit_id || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">GC Visitor ID</div>
                  <div class="font-mono text-sm text-[var(--color-text)]">
                    {{ eventDetails.gc_visitor_id || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">GC Session ID</div>
                  <div class="font-mono text-sm text-[var(--color-text)]">
                    {{ eventDetails.gc_session_id || '-' }}
                  </div>
                </div>

                <!-- User Agent -->
                <div class="md:col-span-2">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">User Agent</div>
                  <div
                    class="font-mono text-xs break-all p-3 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    {{ eventDetails.user_agent || '-' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Сырые данные -->
            <div class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-semibold text-[var(--color-text)]">
                  <i class="fas fa-code mr-2 text-primary"></i>
                  Сырые данные (JSON)
                </h4>
                <button
                  @click="copyRawData"
                  class="px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-2"
                  :class="
                    jsonCopied
                      ? 'bg-green-500/20 text-green-400 dark:text-green-300'
                      : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                  "
                  :title="jsonCopied ? 'Скопировано!' : 'Копировать JSON'"
                >
                  <i :class="jsonCopied ? 'fas fa-check' : 'fas fa-copy'"></i>
                  {{ jsonCopied ? 'Скопировано' : 'Копировать' }}
                </button>
              </div>
              <div
                class="p-4 rounded-lg overflow-x-auto bg-[var(--color-bg-secondary)] border border-[var(--color-border)] max-h-[400px] overflow-y-auto"
              >
                <pre class="json-text">{{ formatRawData(eventDetails) }}</pre>
              </div>
            </div>

            <!-- Вычисленные параметры по первому клику -->
            <div
              v-if="eventDetails.user_id && !isHttpEvent(eventDetails)"
              class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
            >
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-mouse-pointer mr-2 text-primary"></i>
                Вычисленные параметры по первому клику
              </h4>

              <div v-if="loadingAttribution" class="text-center py-6">
                <i class="fas fa-spinner fa-spin text-2xl text-muted"></i>
                <p class="text-sm text-muted mt-2">Загрузка атрибуции...</p>
              </div>

              <div
                v-else-if="attributionFirst && Object.keys(attributionFirst.params).length > 0"
                class="space-y-3"
              >
                <div v-for="(value, key) in attributionFirst.params" :key="key">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">{{ key }}</div>
                  <div class="param-field">
                    {{ value || '-' }}
                  </div>
                </div>

                <div v-if="attributionFirst.url" class="pt-3 border-t border-[var(--color-border)]">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Первый URL сессии
                  </div>
                  <div class="font-mono text-xs break-all text-[var(--color-text)] opacity-70">
                    {{ attributionFirst.url }}
                  </div>
                </div>

                <div
                  v-if="attributionFirst.timestamp"
                  class="text-xs text-[var(--color-text-secondary)]"
                >
                  Время первого клика: {{ formatTimestamp(attributionFirst.timestamp) }}
                </div>
              </div>

              <div v-else class="text-center py-6">
                <i class="fas fa-info-circle text-2xl text-muted mb-2"></i>
                <p class="text-sm text-muted">Параметры первого клика не найдены</p>
                <p class="text-xs text-muted mt-1">Возможно, пользователь перешел без UTM-меток</p>
              </div>
            </div>

            <!-- Вычисленные параметры по последнему клику -->
            <div
              v-if="eventDetails.user_id && !isHttpEvent(eventDetails)"
              class="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
            >
              <h4 class="text-lg font-semibold mb-4 text-[var(--color-text)]">
                <i class="fas fa-hand-pointer mr-2 text-primary"></i>
                Вычисленные параметры по последнему клику
              </h4>

              <div v-if="loadingAttribution" class="text-center py-6">
                <i class="fas fa-spinner fa-spin text-2xl text-muted"></i>
                <p class="text-sm text-muted mt-2">Загрузка атрибуции...</p>
              </div>

              <div
                v-else-if="attributionLast && Object.keys(attributionLast.params).length > 0"
                class="space-y-3"
              >
                <div v-for="(value, key) in attributionLast.params" :key="key">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">{{ key }}</div>
                  <div class="param-field">
                    {{ value || '-' }}
                  </div>
                </div>

                <div v-if="attributionLast.url" class="pt-3 border-t border-[var(--color-border)]">
                  <div class="text-xs mb-1 text-[var(--color-text-secondary)]">
                    Последний URL сессии
                  </div>
                  <div class="font-mono text-xs break-all text-[var(--color-text)] opacity-70">
                    {{ attributionLast.url }}
                  </div>
                </div>

                <div
                  v-if="attributionLast.timestamp"
                  class="text-xs text-[var(--color-text-secondary)]"
                >
                  Время последнего клика: {{ formatTimestamp(attributionLast.timestamp) }}
                </div>
              </div>

              <div v-else class="text-center py-6">
                <i class="fas fa-info-circle text-2xl text-muted mb-2"></i>
                <p class="text-sm text-muted">Параметры последнего клика не найдены</p>
                <p class="text-xs text-muted mt-1">Возможно, пользователь перешел без UTM-меток</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Футер модального окна -->
        <div class="flex items-center justify-end p-6 border-t border-[var(--color-border)]">
          <button
            @click="closeDetailsModal"
            class="px-4 py-2 rounded-lg transition-colors bg-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
          >
            <i class="fas fa-times mr-2"></i>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import {
  apiEventsRoute,
  apiStartMonitoringRoute,
  apiStopMonitoringRoute,
  apiMonitoringStatusRoute,
  apiEventDetailsRoute,
  apiSearchEventsRoute
} from '../api/events'
import { apiAttributionRoute } from '../api/attribution'
import { apiGetEventFilterRoute, apiSaveEventFilterRoute } from '../api/settings'
import { getAllEvents, TRAFFIC_EVENTS, GETCOURSE_EVENTS } from '../shared/eventTypes'

// Props
const props = defineProps({
  encodedSocketId: {
    type: String,
    required: true
  },
  apiUrls: {
    type: Object,
    required: true
  }
})

const events = ref([])
const loading = ref(false)
const isMonitoring = ref(false)
const socketClient = ref(null)
const socketSubscription = ref(null)
const checkingStatus = ref(false)

// Пагинация
const currentPage = ref(1)
const pageSize = ref(25)
const maxTimestamp = ref(null) // Фиксируем момент времени для всех страниц

// Поиск
const searchQuery = ref('')
const isSearchMode = ref(false)
const searchLoading = ref(false)
const searchCurrentPage = ref(1)
const searchTotal = ref(0)

// Модальное окно деталей события
const showDetailsModal = ref(false)
const loadingDetails = ref(false)
const detailsError = ref(null)
const eventDetails = ref(null)
const jsonCopied = ref(false)

// Атрибуция (first/last touch)
const attributionFirst = ref(null)
const attributionLast = ref(null)
const loadingAttribution = ref(false)

// Фильтр событий
const showFilterModal = ref(false)
const trafficEvents = ref(TRAFFIC_EVENTS)
const getcourseEvents = ref(GETCOURSE_EVENTS)
const selectedEventTypes = ref([])
const showSuccessToast = ref(false)
const trafficExpanded = ref(false)
const getcourseExpanded = ref(false)

// Computed для подсчета активных событий в каждой категории
const selectedTrafficEventsCount = computed(() => {
  return trafficEvents.value.filter((e) => selectedEventTypes.value.includes(e.name)).length
})

const selectedGetcourseEventsCount = computed(() => {
  return getcourseEvents.value.filter((e) => selectedEventTypes.value.includes(e.name)).length
})

// Загрузка событий
const loadEvents = async () => {
  console.log('[loadEvents] START')
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value

    console.log('[loadEvents] Calling apiEventsRoute.run with:', {
      mode: 'list',
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      offset: offset,
      limit: pageSize.value,
      maxTimestamp: maxTimestamp.value
    })

    const result = await apiEventsRoute.run(ctx, {
      mode: 'list',
      limit: pageSize.value,
      offset: offset,
      maxTimestamp: maxTimestamp.value
    })

    console.log('[loadEvents] API result:', {
      success: result.success,
      eventsCount: result.events?.length || 0,
      total: result.total,
      hasEvents: !!result.events,
      firstEventTs: result.events?.[0]?.ts || 'none'
    })

    if (result.success) {
      const newEvents = result.events || []
      console.log('[loadEvents] Setting events.value to:', newEvents.length, 'events')

      events.value = newEvents

      // На первой странице фиксируем maxTimestamp из ПЕРВОГО события
      if (currentPage.value === 1 && newEvents.length > 0 && newEvents[0].ts) {
        maxTimestamp.value = newEvents[0].ts
        console.log('[loadEvents] Fixed maxTimestamp:', maxTimestamp.value)
      }

      console.log('[loadEvents] events.value.length after assignment:', events.value.length)
    } else {
      console.error('[loadEvents] API returned success=false')
    }
  } catch (error) {
    console.error('[loadEvents] ERROR:', error)
  } finally {
    loading.value = false
    console.log('[loadEvents] END, loading=false, events.length=', events.value.length)
  }
}

// Обновить список событий (сбрасывает на первую страницу)
const refreshEvents = async () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    events.value = []
  }
  // Сбрасываем maxTimestamp чтобы получить свежие данные
  maxTimestamp.value = null
  await loadEvents()
}

// Поиск событий
const searchEvents = async (page = 1) => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    // Если запрос пустой - выходим из режима поиска
    clearSearch()
    return
  }

  searchLoading.value = true
  isSearchMode.value = true
  searchCurrentPage.value = page

  // Останавливаем мониторинг при поиске
  if (isMonitoring.value) {
    await stopMonitoring()
  }

  try {
    const offset = (page - 1) * pageSize.value
    console.log(
      '[searchEvents] Searching for:',
      searchQuery.value,
      'page:',
      page,
      'offset:',
      offset
    )

    const result = await apiSearchEventsRoute.run(ctx, {
      query: searchQuery.value,
      limit: pageSize.value,
      offset: offset
    })

    console.log('[searchEvents] Search result:', {
      success: result.success,
      eventsCount: result.events?.length || 0,
      total: result.total
    })

    if (result.success) {
      events.value = result.events || []
      // Обновляем total только на первой странице, чтобы он не менялся при пагинации
      if (page === 1 && result.total !== undefined && result.total !== null) {
        searchTotal.value = result.total
        console.log('[searchEvents] Updated searchTotal on first page:', searchTotal.value)
      } else if (page === 1) {
        // Если на первой странице total не пришел, устанавливаем 0
        searchTotal.value = 0
        console.log('[searchEvents] First page but no total, setting to 0')
      } else {
        // На последующих страницах не обновляем total - используем значение с первой страницы
        console.log(
          '[searchEvents] Keeping previous total:',
          searchTotal.value,
          '(not updating from result.total:',
          result.total,
          ')'
        )
      }
      console.log(
        '[searchEvents] Updated events.value to:',
        events.value.length,
        'events, total:',
        searchTotal.value
      )
    } else {
      console.error('[searchEvents] Search failed:', result.message)
      events.value = []
      if (page === 1) {
        searchTotal.value = 0
      }
    }
  } catch (error) {
    console.error('[searchEvents] Error:', error)
    events.value = []
    if (page === 1) {
      searchTotal.value = 0
    }
  } finally {
    searchLoading.value = false
  }
}

// Очистить поиск и вернуться к обычному режиму
const clearSearch = async () => {
  searchQuery.value = ''
  isSearchMode.value = false
  searchCurrentPage.value = 1
  searchTotal.value = 0
  currentPage.value = 1
  maxTimestamp.value = null
  await loadEvents()
}

// Обработка нажатия Enter в поле поиска
const handleSearchKeydown = (event) => {
  if (event.key === 'Enter') {
    searchEvents()
  }
}

// Проверка статуса мониторинга
const checkMonitoringStatus = async () => {
  checkingStatus.value = true
  try {
    const result = await apiMonitoringStatusRoute.run(ctx)
    if (result.success) {
      isMonitoring.value = result.isActive
    }
  } catch (error) {
    console.error('Failed to check monitoring status:', error)
  } finally {
    checkingStatus.value = false
  }
}

// Настройка WebSocket (подключается автоматически при входе на страницу)
const setupWebSocket = async () => {
  try {
    if (!props.encodedSocketId) {
      console.error('No encodedSocketId provided for WebSocket connection')
      return
    }

    socketClient.value = await getOrCreateBrowserSocketClient()

    // Подписываемся на обновления используя ЗАКОДИРОВАННЫЙ socketId
    socketSubscription.value = socketClient.value.subscribeToData(props.encodedSocketId)

    // Слушаем данные через subscription.listen()
    socketSubscription.value.listen((message) => {
      console.log('WebSocket data received:', {
        type: message.type,
        eventsCount: message.data?.length || 0,
        timestamp: new Date().toISOString()
      })

      if (message.type === 'events-update') {
        // WebSocket события добавляем только на первой странице
        if (currentPage.value !== 1) {
          console.log(
            'Ignoring WebSocket events: not on page 1 (current page:',
            currentPage.value,
            ')'
          )
          return
        }

        // Дедупликация новых событий перед добавлением
        const incomingEvents = message.data.map((e) => ({ ...e, isNew: true }))

        // Берем первое (самое новое) событие из уже загруженных для проверки
        let lastAddedKey = null
        let lastAddedTs = null

        if (events.value.length > 0) {
          const firstEvent = events.value[0]
          const urlPath = firstEvent.urlPath || ''
          const uid = firstEvent.uid || firstEvent.user_id || ''
          lastAddedKey = `${urlPath}:${uid}`
          lastAddedTs = new Date(firstEvent.ts || '').getTime()
        }

        // Фильтруем последовательные дубликаты
        const newEvents = []

        for (const event of incomingEvents) {
          const urlPath = event.urlPath || ''
          const uid = event.uid || event.user_id || ''
          const key = `${urlPath}:${uid}`
          const eventTs = new Date(event.ts || '').getTime()

          let isDuplicate = false

          // Проверяем только с ПОСЛЕДНИМ ДОБАВЛЕННЫМ
          if (lastAddedKey && lastAddedTs) {
            if (key === lastAddedKey) {
              const diffSeconds = Math.abs(eventTs - lastAddedTs) / 1000

              // Если разница <= 5 секунд - дубликат
              if (diffSeconds <= 5) {
                console.log(
                  'Skipping duplicate event:',
                  event.urlPath,
                  'time diff:',
                  diffSeconds.toFixed(2),
                  'sec'
                )
                isDuplicate = true
              }
            }
          }

          if (!isDuplicate) {
            // Добавляем и обновляем "последнее добавленное"
            newEvents.push(event)
            lastAddedKey = key
            lastAddedTs = eventTs
          }
          // Если дубликат - НЕ обновляем "последнее добавленное"
        }

        if (newEvents.length > 0) {
          events.value = [...newEvents, ...events.value]
          console.log(
            'Added new events to UI:',
            newEvents.length,
            'filtered from',
            incomingEvents.length
          )

          // Убираем флаг isNew через 3 секунды
          setTimeout(() => {
            events.value = events.value.map((e) => ({ ...e, isNew: false }))
          }, 3000)

          // Ограничиваем количество событий на первой странице
          const maxEventsOnPage1 = pageSize.value * 2 // Держим 2 страницы в памяти
          if (events.value.length > maxEventsOnPage1) {
            events.value = events.value.slice(0, maxEventsOnPage1)
          }
        } else {
          console.log('No new unique events received (all were duplicates)')
        }
      }
    })

    console.log('WebSocket connected automatically on page load')
  } catch (error) {
    console.error('Failed to setup WebSocket:', error)
  }
}

// Начать мониторинг (запускает джобу И подключает WebSocket)
const startMonitoring = async () => {
  try {
    // Сначала обновляем события - загружаем свежие данные
    await refreshEvents()

    // Берем timestamp самого нового события (первого в списке)
    const lastProcessedTs =
      events.value.length > 0 && events.value[0].ts ? events.value[0].ts : new Date().toISOString()

    console.log('Starting monitoring with lastProcessedTs:', lastProcessedTs)

    const result = await apiStartMonitoringRoute.run(ctx, {
      lastProcessedTs
    })

    if (result.success) {
      isMonitoring.value = true
      console.log('Monitoring job started successfully')

      // Подключаем WebSocket только если на первой странице
      if (currentPage.value === 1 && !socketSubscription.value) {
        await setupWebSocket()
        console.log('WebSocket connected after starting monitoring')
      }
    } else {
      console.error('Failed to start monitoring:', result.message)
    }
  } catch (error) {
    console.error('Failed to start monitoring:', error)
  }
}

// Остановить мониторинг (останавливает джобу И отключает WebSocket)
const stopMonitoring = async () => {
  try {
    const result = await apiStopMonitoringRoute.run(ctx)
    if (result.success) {
      isMonitoring.value = false
      console.log('Monitoring job stopped successfully')

      // Отключаем WebSocket
      if (socketSubscription.value && typeof socketSubscription.value.unsubscribe === 'function') {
        socketSubscription.value.unsubscribe()
        socketSubscription.value = null
        console.log('WebSocket disconnected after stopping monitoring')
      }
    } else {
      console.error('Failed to stop monitoring:', result.message)
    }
  } catch (error) {
    console.error('Failed to stop monitoring:', error)
  }
}

// Открыть модальное окно с деталями события
const openEventDetails = async (event) => {
  showDetailsModal.value = true
  loadingDetails.value = false // Данные уже есть в event
  detailsError.value = null
  attributionFirst.value = null
  attributionLast.value = null

  // Используем данные из события напрямую (они уже загружены в списке)
  eventDetails.value = event

  // Если есть user_id, загружаем атрибуцию в фоне
  if (event.user_id) {
    loadAttribution(event)
  }
}

// Загрузить данные атрибуции для события
const loadAttribution = async (event) => {
  console.log('[loadAttribution] START for user_id:', event.user_id)

  if (!event.user_id) {
    console.log('[loadAttribution] SKIP: no user_id')
    return
  }

  loadingAttribution.value = true

  try {
    console.log('[loadAttribution] Calling apiAttributionRoute for first click...')

    // ТОЧЕЧНЫЙ запрос атрибуции по user_id
    // API сам создаст маппинг если его нет
    const firstResult = await apiAttributionRoute.run(ctx, {
      userId: event.user_id,
      attribution: 'first'
    })

    console.log('[loadAttribution] First click result:', {
      success: firstResult.success,
      hasParams: !!firstResult.params,
      paramsCount: firstResult.params ? Object.keys(firstResult.params).length : 0
    })

    if (firstResult.success && firstResult.params) {
      attributionFirst.value = firstResult
    }

    console.log('[loadAttribution] Calling apiAttributionRoute for last click...')

    const lastResult = await apiAttributionRoute.run(ctx, {
      userId: event.user_id,
      attribution: 'last'
    })

    console.log('[loadAttribution] Last click result:', {
      success: lastResult.success,
      hasParams: !!lastResult.params,
      paramsCount: lastResult.params ? Object.keys(lastResult.params).length : 0
    })

    if (lastResult.success && lastResult.params) {
      attributionLast.value = lastResult
    }

    console.log('[loadAttribution] END')
  } catch (error) {
    console.error('[loadAttribution] ERROR:', error)
  } finally {
    loadingAttribution.value = false
  }
}

// Закрыть модальное окно
const closeDetailsModal = () => {
  showDetailsModal.value = false
  eventDetails.value = null
  detailsError.value = null
  jsonCopied.value = false // Сбрасываем состояние кнопки копирования
  attributionFirst.value = null
  attributionLast.value = null
  loadingAttribution.value = false
}

// Копировать JSON в буфер обмена
const copyRawData = async () => {
  if (!eventDetails.value) return

  try {
    const jsonText = formatRawData(eventDetails.value)
    await navigator.clipboard.writeText(jsonText)

    // Показываем индикацию успешного копирования
    jsonCopied.value = true

    // Сбрасываем индикацию через 2 секунды
    setTimeout(() => {
      jsonCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy JSON to clipboard:', error)
  }
}

// Переход на следующую страницу
const nextPage = async () => {
  if (isSearchMode.value) {
    // Режим поиска
    if (!searchLoading.value && searchCurrentPage.value * pageSize.value < searchTotal.value) {
      await searchEvents(searchCurrentPage.value + 1)
    }
  } else {
    // Обычный режим
    if (!loading.value) {
      currentPage.value++
      events.value = [] // Очищаем перед загрузкой

      // Останавливаем мониторинг если он запущен (автоматически отключит WebSocket)
      if (isMonitoring.value) {
        await stopMonitoring()
      }

      await loadEvents()
    }
  }
}

// Переход на предыдущую страницу
const prevPage = async () => {
  if (isSearchMode.value) {
    // Режим поиска
    if (searchCurrentPage.value > 1 && !searchLoading.value) {
      await searchEvents(searchCurrentPage.value - 1)
    }
  } else {
    // Обычный режим
    if (currentPage.value > 1 && !loading.value) {
      currentPage.value--
      events.value = [] // Очищаем перед загрузкой

      await loadEvents()
    }
  }
}

// Получить информацию об устройстве
const getUserDevice = (event) => {
  const parts = []

  // ОС
  const osName = event.ua_os_name || event.os_name || event.os
  if (osName) parts.push(osName)

  // Тип устройства
  const deviceType = event.ua_device_type || event.device_type
  if (deviceType) parts.push(deviceType)

  // Браузер
  const browserName = event.ua_client_name || event.browser
  const browserVersion = event.ua_client_version || ''
  if (browserName) {
    parts.push(browserVersion ? `${browserName} ${browserVersion}` : browserName)
  }

  return parts.length > 0 ? parts.join(', ') : null
}

// Получить полное имя пользователя
const getUserFullName = (event) => {
  if (!event) return null

  const firstName = event.user_first_name || ''
  const lastName = event.user_last_name || ''

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) return firstName
  if (lastName) return lastName

  return null
}

// Получить отображаемое имя пользователя (для таблицы)
const getUserDisplayName = (event) => {
  if (!event) return 'Анонимный'

  // Сначала пробуем полное имя
  const fullName = getUserFullName(event)
  if (fullName) return fullName

  // Если есть user_id, показываем его укороченным
  if (event.user_id) {
    const shortId = event.user_id.substring(0, 20)
    return shortId.length < event.user_id.length ? `${shortId}...` : shortId
  }

  // Иначе - анонимный
  return 'Анонимный'
}

// Форматировать информацию о браузере
const formatBrowser = (event) => {
  if (!event) return '-'

  const name = event.ua_client_name || event.browser || ''
  const version = event.ua_client_version || ''

  if (name && version) {
    return `${name} ${version}`
  }

  return name || '-'
}

// Форматировать информацию об ОС
const formatOS = (event) => {
  if (!event) return '-'

  const name = event.ua_os_name || event.os_name || event.os || ''
  const version = event.ua_os_version || ''

  if (name && version) {
    return `${name} ${version}`
  }

  return name || '-'
}

// Форматировать сырые данные в JSON
const formatRawData = (event) => {
  if (!event) return '{}'

  try {
    return JSON.stringify(event, null, 2)
  } catch (error) {
    return JSON.stringify({ error: 'Не удалось сериализовать данные' })
  }
}

// Получить действие события
const getEventAction = (event) => {
  // Если есть action - используем его
  if (event.action) {
    return event.action
  }

  // Если нет action, но есть urlPath, начинающийся с http - это pageview
  if (event.urlPath && event.urlPath.startsWith('http')) {
    return 'pageview'
  }

  // Если начинается с event://getcourse/ - событие GetCourse
  if (event.urlPath && event.urlPath.startsWith('event://getcourse/')) {
    const parts = event.urlPath.split('?')[0].split('/')
    return parts.slice(2).join('/') // Например: dealCreated, user/created
  }

  // Если начинается с event://refunnels/ - событие ReFunnels
  if (event.urlPath && event.urlPath.startsWith('event://refunnels/')) {
    return 'refunnels'
  }

  // Если начинается с event://workspace/ - событие workspace
  if (event.urlPath && event.urlPath.startsWith('event://workspace/')) {
    const parts = event.urlPath.split('?')[0].split('/')
    return parts.slice(2).join('/') || 'workspace'
  }

  // Если начинается с event:// - custom event
  if (event.urlPath && event.urlPath.startsWith('event://')) {
    return 'custom'
  }

  return 'unknown'
}

// Получить заголовок страницы из URL
const getPageTitle = (urlPath) => {
  if (!urlPath) return '-'

  // Если это http URL, извлекаем последнюю часть пути
  if (urlPath.startsWith('http')) {
    try {
      const url = new URL(urlPath)
      const path = url.pathname
      const lastPart = path
        .split('/')
        .filter((p) => p)
        .pop()
      return lastPart || url.hostname
    } catch {
      return urlPath.substring(0, 50) + '...'
    }
  }

  return urlPath
}

// Форматирование времени
const formatTime = (ts) => {
  if (!ts) return '-'
  const date = new Date(ts)
  return date.toLocaleTimeString('ru-RU')
}

const formatDate = (dt) => {
  if (!dt) return '-'
  const date = new Date(dt)
  return date.toLocaleDateString('ru-RU')
}

// Форматирование полного timestamp (дата и время)
const formatTimestamp = (ts) => {
  if (!ts) return '-'
  // ts приходит в формате "2025-11-10 09:01:08.000"
  return ts.substring(0, 19).replace('T', ' ')
}

// Проверка, является ли событие HTTP событием
const isHttpEvent = (event) => {
  if (!event) return false

  // HTTP события - это те, у которых urlPath начинается с http:// или https://
  // или есть action (pageview, button_click и т.д.)
  return !!(event.action || (event.urlPath && event.urlPath.startsWith('http')))
}

// Получить протокол из URL (https:// или http://)
const getUrlProtocol = (url) => {
  if (!url) return ''

  if (url.startsWith('https://')) return 'https://'
  if (url.startsWith('http://')) return 'http://'

  return ''
}

// Получить путь URL без параметров, хэша и без протокола (hostname + pathname)
const getUrlPath = (url) => {
  if (!url) return ''

  try {
    if (url.startsWith('http')) {
      const urlObj = new URL(url)
      // Возвращаем hostname + pathname (без query string, хэша и протокола)
      return urlObj.hostname + urlObj.pathname
    }
    // Для не-http URL удаляем query параметры и хэш
    let cleanUrl = url.split('?')[0] // Убираем query параметры
    cleanUrl = cleanUrl.split('#')[0] // Убираем хэш
    return cleanUrl
  } catch {
    // Если ошибка парсинга, удаляем вручную
    let cleanUrl = url.split('?')[0] // Убираем query параметры
    cleanUrl = cleanUrl.split('#')[0] // Убираем хэш
    return cleanUrl
  }
}

// Получить параметры URL (query string с ? и хэш с #)
const getUrlParams = (url) => {
  if (!url) return ''

  // Ищем начало query параметров
  const paramsIndex = url.indexOf('?')
  // Ищем начало хэша
  const hashIndex = url.indexOf('#')

  // Если есть query параметры, возвращаем всё после ?
  if (paramsIndex !== -1) {
    return url.substring(paramsIndex)
  }

  // Если нет query параметров, но есть хэш, возвращаем хэш
  if (hashIndex !== -1) {
    return url.substring(hashIndex)
  }

  return ''
}

// Получить домен из URL (только hostname/)
const getUrlDomain = (url) => {
  if (!url) return ''

  try {
    if (url.startsWith('http')) {
      const urlObj = new URL(url)
      return urlObj.hostname + '/'
    }
    return url
  } catch {
    return url
  }
}

// Проверить, нужно ли показывать referer (только если это другой домен)
const shouldShowReferer = (event) => {
  if (!event || !event.referer || !event.urlPath) return false

  try {
    const refererDomain = getUrlDomain(event.referer)
    const currentDomain = event.urlPath.startsWith('http') ? getUrlDomain(event.urlPath) : ''

    // Показываем referer только если это другой домен
    return refererDomain && currentDomain && refererDomain !== currentDomain
  } catch {
    return false
  }
}

// Цвет бейджа для типа действия
const getActionBadgeClass = (action) => {
  // HTTP события (traffic)
  if (action === 'pageview') return 'action-badge-blue'
  if (action === 'button_click') return 'action-badge-green'
  if (action === 'link_click') return 'action-badge-purple'
  if (action === 'scroll') return 'action-badge-yellow'
  if (action === 'form_submit') return 'action-badge-red'
  if (action === 'video_play') return 'action-badge-pink'
  if (action === 'video_pause') return 'action-badge-orange'
  if (action === 'video_complete') return 'action-badge-teal'

  // События GetCourse (по префиксу)
  if (action.startsWith('deal')) return 'action-badge-purple'
  if (action.startsWith('user/')) return 'action-badge-cyan'
  if (action.startsWith('teach/')) return 'action-badge-indigo'
  if (action.startsWith('message/')) return 'action-badge-blue'
  if (action.startsWith('form/')) return 'action-badge-green'
  if (action.startsWith('survey/')) return 'action-badge-lime'
  if (action.startsWith('conversation/')) return 'action-badge-amber'
  if (action.startsWith('contact/')) return 'action-badge-rose'
  if (action.startsWith('vk/')) return 'action-badge-sky'

  // Другие события
  if (action === 'refunnels') return 'action-badge-fuchsia'
  if (action === 'workspace') return 'action-badge-emerald'
  if (action === 'custom') return 'action-badge-slate'

  return 'action-badge-gray'
}

// Обработчик нажатия клавиши Esc для закрытия модального окна
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && showDetailsModal.value) {
    closeDetailsModal()
  }
}

// Добавляем/удаляем обработчик Esc при открытии/закрытии модального окна
watch(showDetailsModal, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleEscapeKey)
  } else {
    window.removeEventListener('keydown', handleEscapeKey)
  }
})

// Функции для работы с фильтром событий
async function loadEventFilter() {
  try {
    const result = await apiGetEventFilterRoute.run(ctx)

    if (result.success) {
      const loadedEventTypes = result.eventTypes || []
      // Фильтруем только те события, которые есть в Traffic и GetCourse (убираем категории)
      const validEventNames = new Set([
        ...trafficEvents.value.map((e) => e.name),
        ...getcourseEvents.value.map((e) => e.name)
      ])
      selectedEventTypes.value = loadedEventTypes.filter((name) => validEventNames.has(name))

      // Если фильтр пустой - выбираем все события по умолчанию (только Traffic и GetCourse, без категорий)
      if (selectedEventTypes.value.length === 0) {
        selectedEventTypes.value = [
          ...trafficEvents.value.map((e) => e.name),
          ...getcourseEvents.value.map((e) => e.name)
        ]
        // Сохраняем обновленный фильтр (без категорий)
        await autoSaveEventFilter()
      } else if (loadedEventTypes.length !== selectedEventTypes.value.length) {
        // Если были удалены категории - сохраняем обновленный фильтр
        await autoSaveEventFilter()
      }
    }
  } catch (e) {
    console.error('Failed to load event filter:', e)
  }
}

async function toggleEventType(eventName) {
  const index = selectedEventTypes.value.indexOf(eventName)
  if (index > -1) {
    selectedEventTypes.value.splice(index, 1)
  } else {
    selectedEventTypes.value.push(eventName)
  }
  await autoSaveEventFilter()
}

async function selectAllTrafficEvents() {
  const trafficEventNames = trafficEvents.value.map((e) => e.name)
  // Добавляем только те, которых еще нет
  for (const name of trafficEventNames) {
    if (!selectedEventTypes.value.includes(name)) {
      selectedEventTypes.value.push(name)
    }
  }
  await autoSaveEventFilter()
}

async function deselectAllTrafficEvents() {
  const trafficEventNames = trafficEvents.value.map((e) => e.name)
  selectedEventTypes.value = selectedEventTypes.value.filter(
    (name) => !trafficEventNames.includes(name)
  )
  await autoSaveEventFilter()
}

async function selectAllGetcourseEvents() {
  const getcourseEventNames = getcourseEvents.value.map((e) => e.name)
  // Добавляем только те, которых еще нет
  for (const name of getcourseEventNames) {
    if (!selectedEventTypes.value.includes(name)) {
      selectedEventTypes.value.push(name)
    }
  }
  await autoSaveEventFilter()
}

async function deselectAllGetcourseEvents() {
  const getcourseEventNames = getcourseEvents.value.map((e) => e.name)
  selectedEventTypes.value = selectedEventTypes.value.filter(
    (name) => !getcourseEventNames.includes(name)
  )
  await autoSaveEventFilter()
}

// Автосохранение с тостом (без перезапуска мониторинга)
async function autoSaveEventFilter() {
  try {
    const result = await apiSaveEventFilterRoute.run(ctx, {
      eventTypes: selectedEventTypes.value
    })

    if (result.success) {
      // Показываем тост на 1.5 секунды
      showSuccessToast.value = true
      setTimeout(() => {
        showSuccessToast.value = false
      }, 1500)
    }
  } catch (e) {
    console.error('Auto-save failed:', e)
  }
}

function closeFilterModal() {
  showFilterModal.value = false
}

// Функция для правильного склонения слова "событие"
function getEventWord(count) {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  // Исключения для 11-14
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'событий'
  }

  // Для остальных случаев
  if (lastDigit === 1) {
    return 'событие'
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'события'
  } else {
    return 'событий'
  }
}

onMounted(async () => {
  // НЕ подключаем WebSocket автоматически - только при запуске мониторинга
  // Это предотвращает добавление событий на страницах 2+

  await loadEvents()
  await loadEventFilter()

  // Проверяем статус мониторинга и подключаем WebSocket если нужно
  const statusResult = await apiMonitoringStatusRoute.run(ctx)
  if (statusResult.success) {
    isMonitoring.value = statusResult.isActive

    // Подключаем WebSocket только если мониторинг активен И мы на первой странице
    if (statusResult.isActive && currentPage.value === 1) {
      await setupWebSocket()
      console.log('WebSocket auto-connected because monitoring is active')
    }
  }

  window.hideAppLoader()
})

onUnmounted(() => {
  // Отключаем WebSocket при размонтировании, но НЕ останавливаем мониторинг на сервере
  if (socketSubscription.value && typeof socketSubscription.value.unsubscribe === 'function') {
    socketSubscription.value.unsubscribe()
  }
  socketSubscription.value = null
  socketClient.value = null
  encodedSocketId.value = null

  // Удаляем обработчик Esc если компонент размонтируется
  window.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bg-success\/5 {
  animation: fadeIn 0.5s ease-out;
}

/* Контейнер поиска с подчёркиванием */
.search-container {
  border-bottom: 2px solid rgba(156, 163, 175, 0.3);
  transition: border-color 0.3s ease;
}

.search-container:hover {
  border-bottom-color: rgba(156, 163, 175, 0.5);
}

.search-container:focus-within {
  border-bottom-color: var(--color-primary);
}

/* Тёмная тема для контейнера */
.dark .search-container {
  border-bottom-color: rgba(156, 163, 175, 0.2);
}

.dark .search-container:hover {
  border-bottom-color: rgba(156, 163, 175, 0.4);
}

/* Поле поиска без нижней границы */
.search-input {
  width: 100%;
  padding: 0.75rem 0.5rem 0.75rem 0.5rem;
  background: transparent;
  border: none;
  color: var(--color-foreground);
  font-size: 0.95rem;
  transition: all 0.3s ease;
  outline: none;
}

.search-input::placeholder {
  color: rgba(156, 163, 175, 0.6);
}

.search-input:focus {
  padding-bottom: 0.7rem;
}

.search-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .search-input::placeholder {
  color: rgba(156, 163, 175, 0.4);
}

/* Стили для параметров и меток - адаптивные под тему */
.param-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  /* Светлая тема - серый фон и чёрный текст */
  background: #e5e7eb;
  color: #111827;
  border: 1px solid #9ca3af;
}

.dark .param-badge {
  /* Тёмная тема - зелёный фон и СВЕТЛЫЙ текст для читаемости */
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.param-field {
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  word-break: break-all;
  /* Светлая тема - серый фон и чёрный текст */
  background: #e5e7eb;
  color: #111827;
  border: 1px solid #9ca3af;
}

.dark .param-field {
  /* Тёмная тема - зелёный фон и СВЕТЛЫЙ текст для читаемости */
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.json-text {
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  white-space: pre-wrap;
  word-break: break-words;
  margin: 0;
  /* Светлая тема - чёрный текст */
  color: #111827;
}

.dark .json-text {
  /* Тёмная тема - СВЕТЛЫЙ зелёный текст для читаемости */
  color: #bbf7d0;
}

/* Стили для бейджей действий */
.action-badge-blue {
  background: #dbeafe;
  color: #1e3a8a;
  border: 1px solid #93c5fd;
}
.dark .action-badge-blue {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.action-badge-green {
  background: #dcfce7;
  color: #14532d;
  border: 1px solid #86efac;
}
.dark .action-badge-green {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.action-badge-purple {
  background: #f3e8ff;
  color: #581c87;
  border: 1px solid #d8b4fe;
}
.dark .action-badge-purple {
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.action-badge-yellow {
  background: #fef3c7;
  color: #78350f;
  border: 1px solid #fde047;
}
.dark .action-badge-yellow {
  background: rgba(234, 179, 8, 0.2);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.4);
}

.action-badge-red {
  background: #fee2e2;
  color: #7f1d1d;
  border: 1px solid #fca5a5;
}
.dark .action-badge-red {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.action-badge-pink {
  background: #fce7f3;
  color: #831843;
  border: 1px solid #f9a8d4;
}
.dark .action-badge-pink {
  background: rgba(236, 72, 153, 0.2);
  color: #f9a8d4;
  border: 1px solid rgba(236, 72, 153, 0.4);
}

.action-badge-orange {
  background: #ffedd5;
  color: #7c2d12;
  border: 1px solid #fdba74;
}
.dark .action-badge-orange {
  background: rgba(249, 115, 22, 0.2);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.action-badge-teal {
  background: #ccfbf1;
  color: #134e4a;
  border: 1px solid #5eead4;
}
.dark .action-badge-teal {
  background: rgba(20, 184, 166, 0.2);
  color: #5eead4;
  border: 1px solid rgba(20, 184, 166, 0.4);
}

.action-badge-cyan {
  background: #cffafe;
  color: #164e63;
  border: 1px solid #67e8f9;
}
.dark .action-badge-cyan {
  background: rgba(6, 182, 212, 0.2);
  color: #67e8f9;
  border: 1px solid rgba(6, 182, 212, 0.4);
}

.action-badge-indigo {
  background: #e0e7ff;
  color: #312e81;
  border: 1px solid #a5b4fc;
}
.dark .action-badge-indigo {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.action-badge-lime {
  background: #ecfccb;
  color: #365314;
  border: 1px solid #bef264;
}
.dark .action-badge-lime {
  background: rgba(132, 204, 22, 0.2);
  color: #bef264;
  border: 1px solid rgba(132, 204, 22, 0.4);
}

.action-badge-amber {
  background: #fef3c7;
  color: #78350f;
  border: 1px solid #fcd34d;
}
.dark .action-badge-amber {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.action-badge-rose {
  background: #ffe4e6;
  color: #881337;
  border: 1px solid #fda4af;
}
.dark .action-badge-rose {
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
  border: 1px solid rgba(244, 63, 94, 0.4);
}

.action-badge-sky {
  background: #e0f2fe;
  color: #0c4a6e;
  border: 1px solid #7dd3fc;
}
.dark .action-badge-sky {
  background: rgba(14, 165, 233, 0.2);
  color: #7dd3fc;
  border: 1px solid rgba(14, 165, 233, 0.4);
}

.action-badge-fuchsia {
  background: #fae8ff;
  color: #701a75;
  border: 1px solid #f0abfc;
}
.dark .action-badge-fuchsia {
  background: rgba(217, 70, 239, 0.2);
  color: #f0abfc;
  border: 1px solid rgba(217, 70, 239, 0.4);
}

.action-badge-emerald {
  background: #d1fae5;
  color: #064e3b;
  border: 1px solid #6ee7b7;
}
.dark .action-badge-emerald {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.action-badge-slate {
  background: #e2e8f0;
  color: #0f172a;
  border: 1px solid #94a3b8;
}
.dark .action-badge-slate {
  background: rgba(100, 116, 139, 0.2);
  color: #cbd5e1;
  border: 1px solid rgba(100, 116, 139, 0.4);
}

.action-badge-gray {
  background: #e5e7eb;
  color: #111827;
  border: 1px solid #9ca3af;
}
.dark .action-badge-gray {
  background: rgba(75, 85, 99, 0.2);
  color: #d1d5db;
  border: 1px solid rgba(75, 85, 99, 0.4);
}
</style>
