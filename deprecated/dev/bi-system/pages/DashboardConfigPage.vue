<template>
  <div
    class="min-h-screen"
    :class="isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'"
  >
    <!-- Основной контент -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Кнопки действий -->
      <div class="mb-6 flex justify-end items-start" :class="{ hidden: isBoardExpanded }">
        <div class="flex space-x-3">
          <button
            @click="saveDashboard"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            "
            :disabled="isSaving"
          >
            <i class="fas fa-save mr-2"></i>
            {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <a
            :href="indexUrl"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            "
          >
            <i class="fas fa-times mr-2"></i>
            Отменить
          </a>
        </div>
      </div>

      <!-- Основные данные дашборда -->
      <div
        class="mb-6 p-6 rounded-lg"
        :class="[isDark ? 'bg-gray-800' : 'bg-white', { hidden: isBoardExpanded }]"
      >
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-info-circle mr-2"></i>
          Основная информация
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Название дашборда</label>
              <input
                v-model="dashboardName"
                type="text"
                placeholder="Например: Основные метрики продаж"
                class="w-full px-4 py-2 rounded-lg border transition-colors"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                "
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Описание (опционально)</label>
              <textarea
                v-model="dashboardDescription"
                rows="3"
                placeholder="Кратко опишите, что показывает этот дашборд"
                class="w-full px-4 py-2 rounded-lg border transition-colors"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                "
              ></textarea>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Период анализа</label>
              <select
                v-model="timePeriod"
                class="w-full px-4 py-2 rounded-lg border"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                "
              >
                <option v-for="period in timePeriods" :key="period.id" :value="period.id">
                  {{ period.name }}
                </option>
              </select>
              <p class="text-xs mt-1 opacity-70">
                Период применяется ко всем компонентам дашборда при расчёте метрик.
              </p>
            </div>
            <div class="text-sm opacity-80">
              <p class="mb-1">
                Доска дашборда использует <span class="font-semibold">сетку</span> с привязкой
                компонентов.
              </p>
              <p>
                Вы можете перетаскивать и растягивать компоненты на доске, чтобы разместить их как
                вам удобно.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Компоненты дашборда -->
      <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6" :class="{ hidden: isBoardExpanded }">
        <!-- Список компонентов -->
        <div class="p-6 rounded-lg" :class="isDark ? 'bg-gray-800' : 'bg-white'">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">
              <i class="fas fa-layer-group mr-2"></i>
              Компоненты дашборда
            </h2>
            <button
              @click="addNewComponent"
              class="px-4 py-2 rounded-lg font-medium transition-colors"
              :class="
                isDark
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              "
            >
              <i class="fas fa-plus mr-2"></i>
              Добавить компонент
            </button>
          </div>

          <div v-if="components.length === 0" class="text-center py-8 opacity-70">
            <i class="fas fa-inbox text-4xl mb-4"></i>
            <p>Пока нет компонентов. Добавьте первый компонент, чтобы начать!</p>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="(component, index) in components"
              :key="component.id"
              class="p-4 rounded-lg border transition-all"
              :class="
                isDark
                  ? 'bg-gray-700 border-gray-600 hover:border-gray-500'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              "
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <i class="fas fa-chart-bar text-lg"></i>
                    <span class="font-medium">{{ component.title }}</span>
                  </div>
                  <div class="text-xs opacity-70 mb-1">
                    Вид: {{ getViewTypeLabel(component.viewType) }} · Датасет:
                    {{ getDatasetName(component.datasetId) }}
                  </div>
                  <div class="text-xs opacity-70">Метрика: {{ component.metric || 'UNIQ' }}</div>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="editComponent(index)"
                    class="p-2 rounded transition-colors"
                    :class="isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'"
                    title="Редактировать"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="removeComponent(index)"
                    class="p-2 rounded transition-colors text-red-500"
                    :class="isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-100'"
                    title="Удалить"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Доска размещения -->
        <div
          v-if="!isBoardExpanded"
          :class="[
            'rounded-lg transition-all duration-300 p-6',
            isDark ? 'bg-gray-800' : 'bg-white'
          ]"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">
              <i class="fas fa-th-large mr-2"></i>
              Доска дашборда
            </h2>
            <div class="flex items-center gap-3">
              <span class="text-xs opacity-70">
                Перетащите и растяните компоненты для настройки layout
              </span>
              <button
                @click="toggleBoardExpand"
                class="p-2 rounded transition-colors"
                :class="
                  isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                "
                title="Развернуть"
              >
                <i class="fas fa-expand"></i>
              </button>
            </div>
          </div>

          <div
            class="relative border rounded-lg overflow-auto transition-all duration-300"
            :class="[
              isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50',
              isBoardExpanded ? 'border-2' : ''
            ]"
            :style="
              isBoardExpanded
                ? {
                    height: 'calc(100vh - 120px)',
                    minHeight: '600px'
                  }
                : { height: '480px' }
            "
          >
            <!-- Виртуальная область доски -->
            <div
              class="relative"
              :style="{
                width: boardPixelSize + 'px',
                height: boardPixelSize + 'px'
              }"
            >
              <!-- Фоновая сетка -->
              <div class="absolute inset-0 pointer-events-none" :style="gridBackgroundStyle"></div>

              <!-- Компоненты -->
              <div
                v-for="component in components"
                :key="component.id"
                class="absolute rounded-lg shadow-md cursor-move select-none"
                :class="
                  isDark ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                "
                :style="getComponentStyle(component)"
                @mousedown.stop="startDrag(component, $event)"
              >
                <div
                  class="flex justify-between items-center px-3 py-2 border-b text-xs font-medium"
                  :class="isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-100'"
                >
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-arrows-alt"></i>
                    <span class="truncate max-w-[150px]">{{ component.title }}</span>
                  </div>
                  <button
                    class="text-xs px-2 py-1 rounded-md"
                    :class="
                      isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    "
                    @click.stop="openEditFromBoard(component)"
                  >
                    Настроить
                  </button>
                </div>
                <div class="px-3 py-3 text-xs">
                  <div class="mb-1 opacity-80">
                    {{ getViewTypeLabel(component.viewType) }} •
                    {{ getDatasetName(component.datasetId) }}
                  </div>
                  <div class="opacity-60">
                    Метрика: {{ component.metric || 'UNIQ' }} (уникальные значения)
                  </div>
                  <div class="mt-2 opacity-40 italic">
                    Значение счётчика появится после подключения расчёта метрик
                  </div>
                </div>

                <!-- Хендл ресайза -->
                <div
                  class="absolute w-3 h-3 right-1 bottom-1 cursor-se-resize"
                  :class="isDark ? 'bg-gray-400' : 'bg-gray-500'"
                  @mousedown.stop="startResize(component, $event)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Сообщения -->
      <div
        v-if="message && !isBoardExpanded"
        class="mb-6 p-4 rounded-lg"
        :class="
          message.type === 'success'
            ? isDark
              ? 'bg-green-900/50 text-green-300'
              : 'bg-green-100 text-green-800'
            : isDark
              ? 'bg-red-900/50 text-red-300'
              : 'bg-red-100 text-red-800'
        "
      >
        <i
          :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"
          class="mr-2"
        ></i>
        {{ message.text }}
      </div>
    </div>

    <!-- Кнопка сворачивания (вынесена отдельно для гарантированной видимости) -->
    <teleport to="body" v-if="isBoardExpanded">
      <button
        @click="toggleBoardExpand"
        class="fixed top-24 right-8 z-[101] p-2 rounded transition-colors"
        :class="isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'"
        title="Свернуть"
      >
        <i class="fas fa-compress"></i>
      </button>
    </teleport>

    <!-- Доска размещения (вынесена для правильного позиционирования при разворачивании) -->
    <teleport to="body" v-if="isBoardExpanded">
      <div
        class="fixed inset-0 z-50 transition-all duration-300"
        :style="{
          backgroundColor: isDark ? '#111827' : '#f9fafb',
          paddingTop: '5rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          paddingBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden'
        }"
      >
        <div
          class="relative border-2 rounded-lg overflow-auto transition-all duration-300 flex-1"
          :style="{ minHeight: 0 }"
          :class="isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'"
        >
          <!-- Виртуальная область доски -->
          <div
            class="relative"
            :style="{
              width: boardPixelSize + 'px',
              height: boardPixelSize + 'px'
            }"
          >
            <!-- Фоновая сетка -->
            <div class="absolute inset-0 pointer-events-none" :style="gridBackgroundStyle"></div>

            <!-- Компоненты -->
            <div
              v-for="component in components"
              :key="component.id"
              class="absolute rounded-lg shadow-md cursor-move select-none"
              :class="
                isDark ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
              "
              :style="getComponentStyle(component)"
              @mousedown.stop="startDrag(component, $event)"
            >
              <div
                class="flex justify-between items-center px-3 py-2 border-b text-xs font-medium"
                :class="isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-100'"
              >
                <div class="flex items-center space-x-2">
                  <i class="fas fa-arrows-alt"></i>
                  <span class="truncate max-w-[150px]">{{ component.title }}</span>
                </div>
                <button
                  class="text-xs px-2 py-1 rounded-md"
                  :class="
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  "
                  @click.stop="openEditFromBoard(component)"
                >
                  Настроить
                </button>
              </div>
              <div class="px-3 py-3 text-xs">
                <div class="mb-1 opacity-80">
                  {{ getViewTypeLabel(component.viewType) }} •
                  {{ getDatasetName(component.datasetId) }}
                </div>
                <div class="opacity-60">
                  Метрика: {{ component.metric || 'UNIQ' }} (уникальные значения)
                </div>
                <div class="mt-2 opacity-40 italic">
                  Значение счётчика появится после подключения расчёта метрик
                </div>
              </div>

              <!-- Хендл ресайза -->
              <div
                class="absolute w-3 h-3 right-1 bottom-1 cursor-se-resize"
                :class="isDark ? 'bg-gray-400' : 'bg-gray-500'"
                @mousedown.stop="startResize(component, $event)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Модальное окно редактирования компонента -->
    <div
      v-if="editingComponentIndex !== null"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      @click.self="cancelEdit"
    >
      <div
        class="rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        :class="isDark ? 'bg-gray-800' : 'bg-white'"
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">
              <i class="fas fa-edit mr-2"></i>
              Настройки компонента дашборда
            </h3>
            <button @click="cancelEdit" class="p-2 rounded hover:bg-gray-700">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="space-y-6" v-if="editingComponent">
            <!-- Название компонента -->
            <div>
              <label class="block text-sm font-medium mb-2">Название компонента</label>
              <input
                v-model="editingComponent.title"
                type="text"
                placeholder="Например: Уникальные пользователи за 7 дней"
                class="w-full px-4 py-2 rounded-lg border"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                "
              />
            </div>

            <!-- Описание -->
            <div>
              <label class="block text-sm font-medium mb-2">Описание (опционально)</label>
              <textarea
                v-model="editingComponent.description"
                rows="2"
                placeholder="Краткое описание компонента"
                class="w-full px-4 py-2 rounded-lg border"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                "
              ></textarea>
            </div>

            <!-- Мастер шагов -->
            <div class="space-y-4">
              <!-- Шаги -->
              <div class="flex items-center justify-between mb-2 text-xs font-medium">
                <div class="flex items-center space-x-2">
                  <div
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      step >= 1 ? activeStepClass : inactiveStepClass
                    ]"
                  >
                    1
                  </div>
                  <span>Вид компонента</span>
                </div>
                <div class="flex-1 h-px mx-2" :class="isDark ? 'bg-gray-700' : 'bg-gray-200'"></div>
                <div class="flex items-center space-x-2">
                  <div
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      step >= 2 ? activeStepClass : inactiveStepClass
                    ]"
                  >
                    2
                  </div>
                  <span>Выбор датасета</span>
                </div>
                <div class="flex-1 h-px mx-2" :class="isDark ? 'bg-gray-700' : 'bg-gray-200'"></div>
                <div class="flex items-center space-x-2">
                  <div
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      step >= 3 ? activeStepClass : inactiveStepClass
                    ]"
                  >
                    3
                  </div>
                  <span>
                    {{
                      editingComponent && editingComponent.viewType === 'simple-table'
                        ? 'Колонки таблицы'
                        : editingComponent && editingComponent.viewType === 'pivot-table'
                          ? 'Атрибуции'
                          : 'Метрика'
                    }}
                  </span>
                </div>
              </div>

              <!-- Шаг 1: Вид компонента -->
              <div
                v-if="step === 1"
                class="border rounded-lg p-4"
                :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'"
              >
                <h4 class="text-sm font-semibold mb-3">
                  <i class="fas fa-eye mr-2"></i>
                  Вид компонента
                </h4>
                <p class="text-xs opacity-70 mb-3">
                  Выберите тип визуализации: целочисленный счётчик, простая таблица или сводная
                  таблица с атрибуциями.
                </p>
                <div class="space-y-3">
                  <label class="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      class="mt-1"
                      value="counter"
                      v-model="editingComponent.viewType"
                    />
                    <div>
                      <div class="text-sm font-medium">Целочисленный счётчик</div>
                      <div class="text-xs opacity-70">
                        Отображает одно агрегированное значение (например, количество уникальных
                        пользователей или заказов).
                      </div>
                    </div>
                  </label>

                  <label class="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      class="mt-1"
                      value="simple-table"
                      v-model="editingComponent.viewType"
                    />
                    <div>
                      <div class="text-sm font-medium">Простая таблица</div>
                      <div class="text-xs opacity-70">
                        Табличный компонент с настраиваемыми колонками (время, пользователь,
                        география, событие, UTM-метки).
                      </div>
                    </div>
                  </label>

                  <label class="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      class="mt-1"
                      value="pivot-table"
                      v-model="editingComponent.viewType"
                    />
                    <div>
                      <div class="text-sm font-medium">Сводная таблица (атрибуции)</div>
                      <div class="text-xs opacity-70">
                        Иерархическая таблица с развертыванием по атрибуциям (utm_source →
                        utm_medium → ...). При раскрытии строки загружаются значения следующей
                        атрибуции.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Шаг 2: Выбор датасета -->
              <div
                v-if="step === 2"
                class="border rounded-lg p-4"
                :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'"
              >
                <h4 class="text-sm font-semibold mb-3">
                  <i class="fas fa-database mr-2"></i>
                  Выбор датасета
                </h4>
                <p class="text-xs opacity-70 mb-3">
                  Выберите датасет, который будет источником данных для этого компонента.
                </p>

                <div v-if="datasets.length === 0" class="text-xs opacity-70">
                  У вас пока нет датасетов. Сначала создайте датасет на главной странице.
                </div>
                <div v-else class="space-y-2 max-h-56 overflow-y-auto">
                  <label
                    v-for="dataset in datasets"
                    :key="dataset.id"
                    class="flex items-start space-x-3 cursor-pointer p-2 rounded-lg transition-colors"
                    :class="
                      editingComponent.datasetId === dataset.id
                        ? isDark
                          ? 'bg-blue-900/40 border border-blue-500/60'
                          : 'bg-blue-50 border border-blue-200'
                        : isDark
                          ? 'hover:bg-gray-700/80 border border-transparent'
                          : 'hover:bg-gray-100 border border-transparent'
                    "
                  >
                    <input
                      type="radio"
                      class="mt-1"
                      :value="dataset.id"
                      v-model="editingComponent.datasetId"
                    />
                    <div>
                      <div class="text-sm font-medium break-all">
                        {{ dataset.name }}
                      </div>
                      <div class="text-xs opacity-70">
                        {{ dataset.description || 'Без описания' }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Шаг 3: Метрика или колонки в зависимости от типа компонента -->
              <div
                v-if="step === 3"
                class="border rounded-lg p-4"
                :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'"
              >
                <!-- Метрика для счётчиков -->
                <template v-if="editingComponent.viewType === 'counter'">
                  <h4 class="text-sm font-semibold mb-3">
                    <i class="fas fa-sigma mr-2"></i>
                    Метрика
                  </h4>
                  <p class="text-xs opacity-70 mb-3">
                    Для целочисленного счётчика сейчас доступна только метрика уникальных значений
                    (UNIQ).
                  </p>
                  <div class="space-y-2">
                    <label class="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        class="mt-1"
                        value="UNIQ"
                        v-model="editingComponent.metric"
                      />
                      <div>
                        <div class="text-sm font-medium">UNIQ — уникальные значения</div>
                        <div class="text-xs opacity-70">
                          Считает сумму уникальных значений по выбранному атрибуту (детали будут
                          настраиваться в будущем).
                        </div>
                      </div>
                    </label>
                  </div>
                </template>

                <!-- Колонки для простых таблиц -->
                <template v-else-if="editingComponent.viewType === 'simple-table'">
                  <h4 class="text-sm font-semibold mb-3">
                    <i class="fas fa-table mr-2"></i>
                    Колонки таблицы
                  </h4>
                  <p class="text-xs opacity-70 mb-4">
                    Выберите, какие колонки показывать в таблице, и перетащите их для изменения
                    порядка.
                  </p>

                  <!-- Выбранные колонки -->
                  <div class="mb-4">
                    <div class="text-xs font-medium mb-2 opacity-80">Текущий порядок колонок</div>
                    <div
                      v-if="editingComponent.columns && editingComponent.columns.length"
                      class="space-y-2"
                    >
                      <div
                        v-for="(columnId, index) in editingComponent.columns"
                        :key="columnId"
                        class="flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-move"
                        :class="
                          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                        "
                        draggable="true"
                        @dragstart="startColumnDrag(index)"
                        @dragover.prevent
                        @drop.prevent="handleColumnDrop(index)"
                      >
                        <div class="flex items-center gap-2">
                          <i class="fas fa-grip-vertical opacity-60"></i>
                          <div>
                            <div class="font-medium">
                              {{ getColumnLabel(columnId) }}
                            </div>
                            <div class="opacity-60">
                              {{ getColumnDescription(columnId) }}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"
                          @click.prevent="removeColumnAt(index)"
                          title="Удалить колонку"
                        >
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-xs opacity-60 italic">
                      Колонки не выбраны. Выберите их ниже, чтобы отобразить в таблице.
                    </div>
                  </div>

                  <!-- Доступные колонки -->
                  <div>
                    <div class="text-xs font-medium mb-2 opacity-80">Добавить колонку</div>
                    <div class="flex items-center gap-2">
                      <select
                        v-model="columnToAdd"
                        class="px-3 py-2 rounded-lg border text-xs flex-1"
                        :class="
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        "
                      >
                        <option disabled value="">Выберите колонку</option>
                        <option
                          v-for="column in availableColumns"
                          :key="column.id"
                          :value="column.id"
                        >
                          {{ column.label }}
                        </option>
                      </select>
                      <button
                        type="button"
                        class="px-3 py-2 rounded-lg text-xs font-medium"
                        :class="
                          columnToAdd
                            ? isDark
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                            : isDark
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        "
                        :disabled="!columnToAdd"
                        @click.prevent="handleAddColumn"
                      >
                        Добавить
                      </button>
                    </div>
                    <p class="text-[11px] opacity-60 mt-2">
                      В списке доступны только колонки, которых ещё нет в текущем порядке. После
                      добавления их можно перетаскивать выше.
                    </p>
                  </div>
                </template>

                <!-- Атрибуции для сводной таблицы -->
                <template v-else-if="editingComponent.viewType === 'pivot-table'">
                  <h4 class="text-sm font-semibold mb-3">
                    <i class="fas fa-sitemap mr-2"></i>
                    Атрибуции (уровни сводной таблицы)
                  </h4>
                  <p class="text-xs opacity-70 mb-4">
                    Укажите порядок атрибуций. Первая атрибуция будет в первой колонке, при
                    раскрытии строки будут загружаться значения следующей атрибуции.
                  </p>

                  <!-- Текущий порядок атрибуций -->
                  <div class="mb-4">
                    <div class="text-xs font-medium mb-2 opacity-80">Текущий порядок уровней</div>
                    <div
                      v-if="
                        editingComponent.pivotConfig &&
                        editingComponent.pivotConfig.attributions &&
                        editingComponent.pivotConfig.attributions.length
                      "
                      class="space-y-2"
                    >
                      <div
                        v-for="(attrId, index) in editingComponent.pivotConfig.attributions"
                        :key="attrId"
                        class="flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-move"
                        :class="
                          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                        "
                        draggable="true"
                        @dragstart="startPivotAttrDrag(index)"
                        @dragover.prevent
                        @drop.prevent="handlePivotAttrDrop(index)"
                      >
                        <div class="flex items-center gap-2">
                          <i class="fas fa-grip-vertical opacity-60"></i>
                          <div>
                            <div class="font-medium">
                              {{ getPivotAttrLabel(attrId) }}
                            </div>
                            <div class="opacity-60">
                              {{ getPivotAttrDescription(attrId) }}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"
                          @click.prevent="removePivotAttrAt(index)"
                          title="Удалить уровень"
                        >
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-xs opacity-60 italic">
                      Атрибуции не выбраны. Добавьте хотя бы один уровень (например, utm_source).
                    </div>
                  </div>

                  <!-- Доступные атрибуции -->
                  <div>
                    <div class="text-xs font-medium mb-2 opacity-80">Добавить уровень</div>
                    <div class="flex items-center gap-2">
                      <select
                        v-model="pivotAttrToAdd"
                        class="px-3 py-2 rounded-lg border text-xs flex-1"
                        :class="
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        "
                      >
                        <option disabled value="">Выберите атрибуцию</option>
                        <option v-for="attr in availablePivotAttrs" :key="attr.id" :value="attr.id">
                          {{ attr.label }}
                        </option>
                      </select>
                      <button
                        type="button"
                        class="px-3 py-2 rounded-lg text-xs font-medium"
                        :class="
                          pivotAttrToAdd
                            ? isDark
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                            : isDark
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        "
                        :disabled="!pivotAttrToAdd"
                        @click.prevent="handleAddPivotAttr"
                      >
                        Добавить
                      </button>
                    </div>
                    <p class="text-[11px] opacity-60 mt-2">
                      Атрибуции соответствуют UTM-полям в ClickHouse (utm_source, utm_medium,
                      utm_campaign и т.д.).
                    </p>
                  </div>
                </template>
              </div>
            </div>

            <!-- Кнопки шагов -->
            <div
              class="flex justify-between items-center pt-4 border-t"
              :class="isDark ? 'border-gray-700' : 'border-gray-200'"
            >
              <div class="space-x-2">
                <button
                  class="px-3 py-2 text-xs rounded-lg font-medium"
                  :class="
                    step > 1
                      ? isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                  "
                  :disabled="step === 1"
                  @click="prevStep"
                >
                  <i class="fas fa-arrow-left mr-1"></i>
                  Назад
                </button>
                <button
                  class="px-3 py-2 text-xs rounded-lg font-medium"
                  :class="
                    step < 3
                      ? isDark
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-blue-500/40 text-blue-100 cursor-not-allowed'
                  "
                  :disabled="step === 3"
                  @click="nextStep"
                >
                  Далее
                  <i class="fas fa-arrow-right ml-1"></i>
                </button>
              </div>

              <button
                @click="saveEditingComponent"
                class="px-4 py-2 rounded-lg font-medium transition-colors"
                :class="
                  isDark
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                "
              >
                Сохранить компонент
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { TIME_PERIODS } from '../shared/datasetTypes'
import { PIVOT_ATTRIBUTION_FIELDS } from '../shared/dashboardTypes'

// Размер шага сетки в пикселях
const GRID_SIZE = 80
const BOARD_UNITS = 50 // виртуальный размер доски в шагах

// Доступные предустановленные колонки для простых табличных компонентов
const SIMPLE_TABLE_AVAILABLE_COLUMNS = [
  {
    id: 'time',
    label: 'Время',
    description: 'Метка времени события (дата и время).'
  },
  {
    id: 'user',
    label: 'Пользователь',
    description: 'Имя, email и роль пользователя.'
  },
  {
    id: 'location',
    label: 'География и устройство',
    description: 'IP, страна, город, тип устройства и браузер.'
  },
  {
    id: 'event',
    label: 'Событие',
    description: 'Тип события и URL/описание.'
  },
  {
    id: 'utm',
    label: 'UTM-метки',
    description: 'utm_source, utm_medium, utm_campaign и другие метки кампаний.'
  }
]

function getDefaultColumnsForView(viewType) {
  if (viewType === 'simple-table') {
    // По умолчанию показываем все основные колонки в логичном порядке
    return SIMPLE_TABLE_AVAILABLE_COLUMNS.map((c) => c.id)
  }
  return []
}

function getSimpleTableColumnMeta(columnId) {
  return SIMPLE_TABLE_AVAILABLE_COLUMNS.find((c) => c.id === columnId) || null
}

function createEmptyPivotConfig() {
  const defaultIds = PIVOT_ATTRIBUTION_FIELDS.slice(0, 2).map((f) => f.id)
  return {
    attributions: defaultIds,
    metric: 'UNIQ'
  }
}

// Props
const props = defineProps({
  initialDashboard: {
    type: Object,
    default: null
  },
  initialDatasets: {
    type: Array,
    default: () => []
  },
  apiUrls: {
    type: Object,
    required: true
  }
})

// Состояние темы
const isDark = ref(false)

// Основные данные дашборда
const dashboardId = ref(props.initialDashboard?.id || null)
const dashboardName = ref(props.initialDashboard?.name || '')
const dashboardDescription = ref(props.initialDashboard?.description || '')
const timePeriod = ref('7d')
const components = ref([])

// Справочники
const timePeriods = TIME_PERIODS
const datasets = ref(props.initialDatasets || [])

// UI состояния
const isSaving = ref(false)
const message = ref(null)
const isBoardExpanded = ref(false)

// Модальное окно компонента
const editingComponentIndex = ref(null)
const editingComponent = ref(null)
const step = ref(1)

// Перетаскивание колонок для простых табличных компонентов
const columnDragIndex = ref(null)

// Перетаскивание атрибуций для сводных таблиц
const pivotAttrDragIndex = ref(null)
const pivotAttrToAdd = ref('')

// Drag & resize состояние
const draggingComponentId = ref(null)
const resizingComponentId = ref(null)
const dragStart = ref({ x: 0, y: 0, mouseX: 0, mouseY: 0 })
const resizeStart = ref({ w: 0, h: 0, mouseX: 0, mouseY: 0 })

// Вычисляемые
const isEditMode = computed(() => !!dashboardId.value)
const indexUrl = computed(() => props.apiUrls.indexPage)
const boardPixelSize = BOARD_UNITS * GRID_SIZE

const gridBackgroundStyle = computed(() => {
  const color = isDark.value ? 'rgba(156,163,175,0.15)' : 'rgba(156,163,175,0.25)'
  return {
    backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
  }
})

const activeStepClass = computed(() =>
  isDark.value ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
)
const inactiveStepClass = computed(() =>
  isDark.value ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
)

// Инициализация
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'

  // Загружаем конфиг дашборда
  if (props.initialDashboard?.config) {
    try {
      const config = JSON.parse(props.initialDashboard.config)
      timePeriod.value = config.timePeriod || '7d'
      const loadedComponents = config.components || []
      components.value = loadedComponents.map((comp, index) => {
        const viewType = comp.viewType || 'counter'
        return {
          id:
            comp.id ||
            `dashboard_component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: comp.title || `Компонент ${index + 1}`,
          viewType,
          datasetId: comp.datasetId || '',
          metric: comp.metric || 'UNIQ',
          description: comp.description || '',
          columns:
            Array.isArray(comp.columns) && comp.columns.length > 0
              ? comp.columns
              : getDefaultColumnsForView(viewType),
          pivotConfig:
            comp.pivotConfig || (viewType === 'pivot-table' ? createEmptyPivotConfig() : null),
          layout: normaliseLayout(comp.layout, index)
        }
      })
    } catch (error) {
      console.error('Error parsing dashboard config:', error)
      components.value = []
    }
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

// Блокировка скролла при открытии модалки
watch(editingComponentIndex, (newValue) => {
  if (newValue !== null) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// Автоматическая инициализация колонок при переключении вида компонента
watch(
  () => editingComponent.value && editingComponent.value.viewType,
  (newViewType) => {
    if (!editingComponent.value) return
    if (newViewType === 'simple-table') {
      const currentColumns = Array.isArray(editingComponent.value.columns)
        ? editingComponent.value.columns
        : []
      if (currentColumns.length === 0) {
        editingComponent.value.columns = getDefaultColumnsForView('simple-table')
      }
      // Для простых таблиц фиксируем метрику UNIQ
      if (!editingComponent.value.metric) {
        editingComponent.value.metric = 'UNIQ'
      }
    } else if (newViewType === 'pivot-table') {
      // Для сводных таблиц инициализируем pivotConfig если его нет
      if (!editingComponent.value.pivotConfig) {
        editingComponent.value.pivotConfig = createEmptyPivotConfig()
      }
      // Для сводных таблиц фиксируем метрику UNIQ
      if (!editingComponent.value.metric) {
        editingComponent.value.metric = 'UNIQ'
      }
    }
  }
)

// Helpers
function normaliseLayout(layout, index) {
  const fallback = {
    x: 0,
    y: index * 4,
    w: 4,
    h: 3
  }

  if (!layout) return fallback

  const x = typeof layout.x === 'number' && layout.x >= 0 ? layout.x : fallback.x
  const y = typeof layout.y === 'number' && layout.y >= 0 ? layout.y : fallback.y
  const w = typeof layout.w === 'number' && layout.w > 0 ? layout.w : fallback.w
  const h = typeof layout.h === 'number' && layout.h > 0 ? layout.h : fallback.h

  return {
    x: Math.min(x, BOARD_UNITS - 1),
    y: Math.min(y, BOARD_UNITS - 1),
    w: Math.min(w, BOARD_UNITS),
    h: Math.min(h, BOARD_UNITS)
  }
}

function getComponentStyle(component) {
  const layout = normaliseLayout(component.layout, 0)
  return {
    left: layout.x * GRID_SIZE + 'px',
    top: layout.y * GRID_SIZE + 'px',
    width: layout.w * GRID_SIZE + 'px',
    height: layout.h * GRID_SIZE + 'px'
  }
}

function getViewTypeLabel(viewType) {
  switch (viewType) {
    case 'counter':
      return 'Целочисленный счётчик'
    case 'simple-table':
      return 'Простая таблица'
    case 'pivot-table':
      return 'Сводная таблица'
    default:
      return 'Компонент'
  }
}

function getDatasetName(datasetId) {
  if (!datasetId) return 'Датасет не выбран'
  const dataset = datasets.value.find((d) => d.id === datasetId)
  return dataset ? dataset.name : 'Неизвестный датасет'
}

// Тема
function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Работа с компонентами
function addNewComponent() {
  const newComponent = {
    id: `dashboard_component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: `Компонент ${components.value.length + 1}`,
    viewType: 'counter',
    datasetId: '',
    metric: 'UNIQ',
    description: '',
    columns: [],
    layout: {
      x: 0,
      y: components.value.length * 4,
      w: 4,
      h: 3
    }
  }
  components.value.push(newComponent)
  editComponent(components.value.length - 1)
}

function editComponent(index) {
  editingComponentIndex.value = index
  const component = components.value[index]
  const viewType = component.viewType || 'counter'
  editingComponent.value = {
    id: component.id,
    title: component.title,
    viewType,
    datasetId: component.datasetId || '',
    metric: component.metric || 'UNIQ',
    description: component.description || '',
    columns: Array.isArray(component.columns)
      ? [...component.columns]
      : getDefaultColumnsForView(viewType),
    pivotConfig:
      component.pivotConfig || (viewType === 'pivot-table' ? createEmptyPivotConfig() : null),
    layout: { ...normaliseLayout(component.layout, index) }
  }
  step.value = 1
}

function openEditFromBoard(component) {
  const index = components.value.findIndex((c) => c.id === component.id)
  if (index >= 0) {
    editComponent(index)
  }
}

function saveEditingComponent() {
  if (!editingComponent.value.title.trim()) {
    showMessage('Название компонента обязательно', 'error')
    return
  }
  if (!editingComponent.value.viewType) {
    showMessage('Выберите вид компонента', 'error')
    return
  }
  if (!editingComponent.value.datasetId) {
    showMessage('Выберите датасет', 'error')
    return
  }
  if (!editingComponent.value.metric) {
    showMessage('Выберите метрику', 'error')
    return
  }

  const idx = editingComponentIndex.value
  if (idx === null || idx < 0 || idx >= components.value.length) {
    cancelEdit()
    return
  }

  const existing = components.value[idx]
  const viewType = editingComponent.value.viewType
  components.value[idx] = {
    id: existing.id,
    title: editingComponent.value.title,
    viewType,
    datasetId: editingComponent.value.datasetId,
    metric: editingComponent.value.metric,
    description: editingComponent.value.description || '',
    columns: Array.isArray(editingComponent.value.columns)
      ? [...editingComponent.value.columns]
      : [],
    pivotConfig:
      viewType === 'pivot-table'
        ? {
            attributions: Array.isArray(editingComponent.value.pivotConfig?.attributions)
              ? [...editingComponent.value.pivotConfig.attributions]
              : createEmptyPivotConfig().attributions,
            metric: 'UNIQ'
          }
        : null,
    layout: normaliseLayout(editingComponent.value.layout, idx)
  }

  cancelEdit()
  showMessage('Компонент обновлён', 'success')
}

function cancelEdit() {
  editingComponentIndex.value = null
  editingComponent.value = null
}

function removeComponent(index) {
  if (confirm('Вы уверены, что хотите удалить этот компонент?')) {
    components.value.splice(index, 1)
    showMessage('Компонент удалён', 'success')
  }
}

// Шаги мастера
function nextStep() {
  if (step.value < 3) {
    step.value += 1
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value -= 1
  }
}

// Drag & resize
function startDrag(component, event) {
  draggingComponentId.value = component.id
  const layout = normaliseLayout(component.layout, 0)
  dragStart.value = {
    x: layout.x,
    y: layout.y,
    mouseX: event.clientX,
    mouseY: event.clientY
  }
}

function startResize(component, event) {
  resizingComponentId.value = component.id
  const layout = normaliseLayout(component.layout, 0)
  resizeStart.value = {
    w: layout.w,
    h: layout.h,
    mouseX: event.clientX,
    mouseY: event.clientY
  }
}

function handleMouseMove(event) {
  if (draggingComponentId.value) {
    const component = components.value.find((c) => c.id === draggingComponentId.value)
    if (!component) return

    const ds = dragStart.value
    const dx = event.clientX - ds.mouseX
    const dy = event.clientY - ds.mouseY
    const deltaX = Math.round(dx / GRID_SIZE)
    const deltaY = Math.round(dy / GRID_SIZE)

    const newX = Math.max(0, Math.min(BOARD_UNITS - 1, ds.x + deltaX))
    const newY = Math.max(0, Math.min(BOARD_UNITS - 1, ds.y + deltaY))

    component.layout = {
      ...normaliseLayout(component.layout, 0),
      x: newX,
      y: newY
    }
  } else if (resizingComponentId.value) {
    const component = components.value.find((c) => c.id === resizingComponentId.value)
    if (!component) return

    const rs = resizeStart.value
    const dx = event.clientX - rs.mouseX
    const dy = event.clientY - rs.mouseY
    const deltaW = Math.round(dx / GRID_SIZE)
    const deltaH = Math.round(dy / GRID_SIZE)

    const newW = Math.max(2, Math.min(BOARD_UNITS, rs.w + deltaW))
    const newH = Math.max(2, Math.min(BOARD_UNITS, rs.h + deltaH))

    component.layout = {
      ...normaliseLayout(component.layout, 0),
      w: newW,
      h: newH
    }
  }
}

function handleMouseUp() {
  draggingComponentId.value = null
  resizingComponentId.value = null
}

// Работа с колонками простых табличных компонентов
const simpleTableAvailableColumns = SIMPLE_TABLE_AVAILABLE_COLUMNS
const columnToAdd = ref('')

const availableColumns = computed(() => {
  if (!editingComponent.value || !Array.isArray(editingComponent.value.columns)) {
    return simpleTableAvailableColumns
  }
  const selected = new Set(editingComponent.value.columns)
  return simpleTableAvailableColumns.filter((col) => !selected.has(col.id))
})

function getColumnLabel(columnId) {
  const meta = getSimpleTableColumnMeta(columnId)
  return meta ? meta.label : columnId
}

function getColumnDescription(columnId) {
  const meta = getSimpleTableColumnMeta(columnId)
  return meta ? meta.description : ''
}

function isColumnSelected(columnId) {
  if (!editingComponent.value || !Array.isArray(editingComponent.value.columns)) {
    return false
  }
  return editingComponent.value.columns.includes(columnId)
}

function addColumn(columnId) {
  if (!editingComponent.value || !columnId) return
  const current = Array.isArray(editingComponent.value.columns)
    ? [...editingComponent.value.columns]
    : []
  if (!current.includes(columnId)) {
    editingComponent.value.columns = [...current, columnId]
  }
}

function handleAddColumn() {
  if (!columnToAdd.value) return
  addColumn(columnToAdd.value)
  columnToAdd.value = ''
}

function removeColumnAt(index) {
  if (!editingComponent.value || !Array.isArray(editingComponent.value.columns)) return
  const cols = [...editingComponent.value.columns]
  cols.splice(index, 1)
  editingComponent.value.columns = cols
}

function startColumnDrag(index) {
  columnDragIndex.value = index
}

function handleColumnDrop(targetIndex) {
  if (
    columnDragIndex.value === null ||
    !editingComponent.value ||
    !Array.isArray(editingComponent.value.columns)
  ) {
    return
  }
  const from = columnDragIndex.value
  const cols = [...editingComponent.value.columns]
  const [moved] = cols.splice(from, 1)
  cols.splice(targetIndex, 0, moved)
  editingComponent.value.columns = cols
  columnDragIndex.value = null
}

// Работа с атрибуциями сводных таблиц
const availablePivotAttrs = computed(() => {
  if (!editingComponent.value || !editingComponent.value.pivotConfig) {
    return PIVOT_ATTRIBUTION_FIELDS
  }
  const selected = new Set(editingComponent.value.pivotConfig.attributions || [])
  return PIVOT_ATTRIBUTION_FIELDS.filter((a) => !selected.has(a.id))
})

function getPivotAttrLabel(attrId) {
  const meta = PIVOT_ATTRIBUTION_FIELDS.find((a) => a.id === attrId)
  return meta ? meta.label : attrId
}

function getPivotAttrDescription(attrId) {
  const meta = PIVOT_ATTRIBUTION_FIELDS.find((a) => a.id === attrId)
  return meta ? meta.description : ''
}

function ensurePivotConfig() {
  if (!editingComponent.value) return
  if (!editingComponent.value.pivotConfig) {
    editingComponent.value.pivotConfig = createEmptyPivotConfig()
  }
}

function handleAddPivotAttr() {
  if (!pivotAttrToAdd.value || !editingComponent.value) return
  ensurePivotConfig()
  const current = Array.isArray(editingComponent.value.pivotConfig.attributions)
    ? [...editingComponent.value.pivotConfig.attributions]
    : []
  if (!current.includes(pivotAttrToAdd.value)) {
    editingComponent.value.pivotConfig.attributions = [...current, pivotAttrToAdd.value]
  }
  pivotAttrToAdd.value = ''
}

function removePivotAttrAt(index) {
  if (!editingComponent.value || !editingComponent.value.pivotConfig) return
  const current = Array.isArray(editingComponent.value.pivotConfig.attributions)
    ? [...editingComponent.value.pivotConfig.attributions]
    : []
  current.splice(index, 1)
  editingComponent.value.pivotConfig.attributions = current
}

function startPivotAttrDrag(index) {
  pivotAttrDragIndex.value = index
}

function handlePivotAttrDrop(targetIndex) {
  if (
    pivotAttrDragIndex.value === null ||
    !editingComponent.value ||
    !editingComponent.value.pivotConfig ||
    !Array.isArray(editingComponent.value.pivotConfig.attributions)
  ) {
    return
  }
  const from = pivotAttrDragIndex.value
  const attrs = [...editingComponent.value.pivotConfig.attributions]
  const [moved] = attrs.splice(from, 1)
  attrs.splice(targetIndex, 0, moved)
  editingComponent.value.pivotConfig.attributions = attrs
  pivotAttrDragIndex.value = null
}

// Сохранение дашборда
async function saveDashboard() {
  if (!dashboardName.value.trim()) {
    showMessage('Название дашборда обязательно', 'error')
    return
  }

  isSaving.value = true

  try {
    const config = JSON.stringify({
      timePeriod: timePeriod.value,
      components: components.value
    })

    let result
    if (isEditMode.value) {
      const response = await fetch(props.apiUrls.update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dashboardId.value,
          name: dashboardName.value,
          description: dashboardDescription.value,
          config
        })
      })
      result = await response.json()
    } else {
      const response = await fetch(props.apiUrls.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dashboardName.value,
          description: dashboardDescription.value,
          config
        })
      })
      result = await response.json()
    }

    if (result.success) {
      showMessage('Дашборд успешно сохранён!', 'success')

      if (!isEditMode.value && result.dashboard?.id && props.apiUrls.dashboardConfig) {
        setTimeout(() => {
          window.location.href = `${props.apiUrls.dashboardConfig}?id=${result.dashboard.id}`
        }, 1500)
      }
    } else {
      showMessage(result.error || 'Ошибка при сохранении дашборда', 'error')
    }
  } catch (error) {
    console.error('Error saving dashboard:', error)
    showMessage('Ошибка при сохранении дашборда', 'error')
  } finally {
    isSaving.value = false
  }
}

// Сообщения
function showMessage(text, type = 'info') {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 5000)
}

// Разворачивание/сворачивание доски
function toggleBoardExpand() {
  isBoardExpanded.value = !isBoardExpanded.value
  // Блокируем скролл страницы при разворачивании
  if (isBoardExpanded.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}
</script>
