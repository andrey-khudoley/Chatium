<template>
  <!-- Error state: no access -->
  <div v-if="!isAdmin && loaded" class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md text-center">
      <div class="bg-red-50 border border-red-200 rounded-lg p-8">
        <div class="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Нет доступа</h1>
        <p class="text-gray-600 mb-6">Проверьте правильность ввода данных</p>
        <button
          @click="logout"
          class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Попробовать еще раз
        </button>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else-if="!loaded" class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
      ></div>
      <p class="text-gray-600">Загрузка...</p>
    </div>
  </div>

  <!-- Admin panel -->
  <div v-else class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Администрация календаря</h1>
        <button @click="logout" class="px-4 py-2 text-red-600 hover:text-red-700 font-medium">
          Выход
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div class="flex gap-4 border-b border-gray-200 justify-between items-center">
        <div class="flex gap-4">
          <button
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            :class="[
              'px-4 py-2 font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            ]"
          >
            {{ tabTitles[tab] }}
          </button>
        </div>
        <a
          :href="bookingIndexRoute.url()"
          target="_blank"
          class="px-4 py-2 font-medium border-b-2 border-transparent text-green-600 hover:text-green-700 hover:border-green-600 transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          Клиентский календарь
        </a>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Настройки календаря</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              v-model="settings.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> Рабочие дни недели </label>
            <div class="flex gap-4 flex-wrap">
              <label
                v-for="day in weekDays"
                :key="day.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="workDaysArray.includes(day.value)"
                  @change="toggleWorkDay(day.value)"
                  class="h-4 w-4 text-blue-600 rounded"
                />
                <span class="text-sm text-gray-700">{{ day.label }}</span>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Время начала работы
              </label>
              <input
                v-model="settings.workStartTime"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Время конца работы
              </label>
              <input
                v-model="settings.workEndTime"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Длительность слота (минуты)
              </label>
              <input
                v-model.number="settings.slotDurationMinutes"
                type="number"
                min="15"
                max="120"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Минимум минут до записи
              </label>
              <input
                v-model.number="settings.noticeBeforeMinutes"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Максимум дней для записи
            </label>
            <input
              v-model.number="settings.maxDaysAhead"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="settings.isActive"
              type="checkbox"
              id="isActive"
              class="h-4 w-4 text-blue-600 rounded"
            />
            <label for="isActive" class="ml-2 text-sm text-gray-700"> Календарь активен </label>
          </div>

          <div
            v-if="settingsMessage"
            :class="[
              'p-3 rounded-lg text-sm',
              settingsMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            ]"
          >
            {{ settingsMessage.text }}
          </div>

          <button
            @click="saveSettings"
            :disabled="savingSettings"
            class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {{ savingSettings ? 'Сохранение...' : 'Сохранить настройки' }}
          </button>
        </div>
      </div>

      <!-- Appointments Tab - Calendar View -->
      <div v-if="activeTab === 'appointments'" class="space-y-6">
        <!-- Navigation -->
        <div class="flex gap-4 items-center">
          <button
            @click="goToPreviousWeek"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Назад на неделю
          </button>
          <div class="flex-1 text-center py-2">
            <p class="text-sm font-medium text-gray-600">
              {{
                appointmentsViewDate.toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              }}
            </p>
          </div>
          <button
            @click="openAddAppointmentModal"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Добавить запись
          </button>
          <button
            @click="goToNextWeek"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Вперед на неделю →
          </button>
        </div>

        <!-- Calendar View -->
        <div
          v-if="appointments.length === 0"
          class="bg-white rounded-lg shadow p-8 text-center text-gray-500"
        >
          Нет записей
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="dayEntry in appointmentsByDay"
            :key="dayEntry.date"
            class="bg-white rounded-lg shadow overflow-hidden"
          >
            <!-- Day Header -->
            <div class="bg-blue-50 px-4 py-3 border-b border-gray-200">
              <div class="text-2xl font-bold text-blue-600">{{ dayEntry.dayNum }}</div>
              <div class="text-sm text-gray-600">{{ dayEntry.dayName }}</div>
            </div>

            <!-- Appointments for this day -->
            <div class="p-2 space-y-1">
              <div
                v-for="apt in dayEntry.appointments"
                :key="apt.id"
                class="flex items-start gap-2 p-2 hover:bg-gray-50 cursor-pointer transition-colors rounded"
                @click="selectedAppointment = apt"
              >
                <span
                  :class="[
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    apt.status === 'new'
                      ? 'bg-yellow-500'
                      : apt.status === 'confirmed'
                        ? 'bg-purple-500'
                        : apt.status === 'in_progress'
                          ? 'bg-blue-500'
                          : apt.status === 'completed'
                            ? 'bg-green-500'
                            : apt.status === 'cancelled'
                              ? 'bg-gray-400'
                              : 'bg-yellow-500'
                  ]"
                ></span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900">{{
                      apt.appointmentTime
                    }}</span>
                    <span class="text-sm text-gray-700">{{ apt.name }}</span>
                    <a
                      v-if="apt.telegramId"
                      :href="`https://t.me/${apt.telegramId.startsWith('@') ? apt.telegramId.slice(1) : apt.telegramId}`"
                      target="_blank"
                      class="text-xs text-blue-500 hover:text-blue-700 underline"
                      @click.stop
                    >
                      {{ apt.telegramId }}
                    </a>
                  </div>
                  <div v-if="apt.comments" class="text-xs text-gray-500 mt-0.5 break-words">
                    {{ apt.comments }}
                  </div>
                </div>
              </div>

              <div
                v-if="dayEntry.appointments.length === 0"
                class="p-4 text-center text-gray-400 text-xs"
              >
                Нет записей
              </div>
            </div>
          </div>
        </div>

        <!-- Add Appointment Modal -->
        <div
          v-if="showAddAppointmentModal"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          @click.self="closeAddAppointmentModal"
        >
          <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Step 1: Select Slot -->
            <div v-if="addAppointmentStep === 1" class="p-6 space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-900">Выберите дату и время</h3>
                <button @click="closeAddAppointmentModal" class="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <!-- Date Navigation -->
              <div class="flex gap-3 items-center justify-center">
                <button
                  @click="goToPreviousDay"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  ← Назад
                </button>
                <div class="text-center py-2 px-4 bg-gray-50 rounded-lg">
                  <p class="text-sm font-medium text-gray-900">
                    {{
                      scheduleViewDate.toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    }}
                  </p>
                </div>
                <button
                  @click="goToNextDay"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Вперед →
                </button>
              </div>

              <!-- Loading -->
              <div v-if="loadingSchedule" class="text-center py-8">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
                ></div>
                <p class="text-gray-600 mt-2">Загрузка расписания...</p>
              </div>

              <!-- Schedule Grid -->
              <div v-else class="space-y-2">
                <div
                  v-for="slot in scheduleData[scheduleViewDate.toISOString().split('T')[0]] || []"
                  :key="slot.time"
                  class="p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="[
                    slot.available
                      ? 'border-green-300 bg-green-50 hover:bg-green-100'
                      : slot.booked
                        ? 'border-red-300 bg-red-50 cursor-not-allowed'
                        : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  ]"
                  @click="
                    slot.available
                      ? selectSlot(scheduleViewDate.toISOString().split('T')[0], slot.time)
                      : null
                  "
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-900">{{ slot.time }}</span>
                    <span v-if="slot.available" class="text-xs font-medium text-green-600">
                      ✓ Свободно
                    </span>
                    <span v-else-if="slot.booked" class="text-xs font-medium text-red-600">
                      ✗ Занято
                    </span>
                    <span v-else class="text-xs font-medium text-gray-500"> Недоступно </span>
                  </div>
                </div>

                <div
                  v-if="
                    (scheduleData[scheduleViewDate.toISOString().split('T')[0]] || []).length === 0
                  "
                  class="text-center py-8 text-gray-500"
                >
                  Нет доступных слотов на эту дату
                </div>
              </div>
            </div>

            <!-- Step 2: Enter Details -->
            <div v-else-if="addAppointmentStep === 2" class="p-6 space-y-4">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Данные клиента</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Дата:
                    {{ new Date(newAppointment.appointmentDate).toLocaleDateString('ru-RU') }},
                    Время: {{ newAppointment.appointmentTime }}
                  </p>
                </div>
                <button @click="closeAddAppointmentModal" class="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Имя клиента *</label>
                  <input
                    v-model="newAppointment.name"
                    type="text"
                    placeholder="Введите имя"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Telegram</label>
                  <input
                    v-model="newAppointment.telegramId"
                    type="text"
                    placeholder="@username или ID"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Почта</label>
                  <input
                    v-model="newAppointment.email"
                    type="email"
                    placeholder="example@mail.com"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                  <textarea
                    v-model="newAppointment.comments"
                    placeholder="Дополнительная информация"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  ></textarea>
                </div>

                <div
                  v-if="addAppointmentError"
                  class="p-3 bg-red-50 text-red-700 rounded-lg text-sm"
                >
                  {{ addAppointmentError }}
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  @click="backToSchedule"
                  class="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  ← Назад
                </button>
                <button
                  @click="createAppointment"
                  :disabled="addingAppointment || !newAppointment.name"
                  class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {{ addingAppointment ? 'Создание...' : 'Создать запись' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Modal -->
        <div
          v-if="selectedAppointment"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          @click.self="selectedAppointment = null"
        >
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div class="flex justify-between items-start">
              <h3 class="text-lg font-bold text-gray-900">{{ selectedAppointment.name }}</h3>
              <button @click="selectedAppointment = null" class="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div class="space-y-3 text-sm">
              <div>
                <span class="text-gray-600">Дата:</span>
                <span class="ml-2 font-medium">{{
                  new Date(selectedAppointment.appointmentDate).toLocaleDateString('ru-RU')
                }}</span>
              </div>
              <div>
                <span class="text-gray-600">Время:</span>
                <span class="ml-2 font-medium">{{ selectedAppointment.appointmentTime }}</span>
              </div>
              <div>
                <span class="text-gray-600">Длительность:</span>
                <span class="ml-2 font-medium">{{ selectedAppointment.duration || 30 }} мин</span>
              </div>
              <div v-if="selectedAppointment.telegramId">
                <span class="text-gray-600">Telegram:</span>
                <a
                  :href="`https://t.me/${selectedAppointment.telegramId.startsWith('@') ? selectedAppointment.telegramId.slice(1) : selectedAppointment.telegramId}`"
                  target="_blank"
                  class="ml-2 font-medium text-blue-500 hover:text-blue-700 underline"
                >
                  {{ selectedAppointment.telegramId }}
                </a>
              </div>
              <div v-if="selectedAppointment.email">
                <span class="text-gray-600">Почта:</span>
                <span class="ml-2 font-medium">{{ selectedAppointment.email }}</span>
              </div>
              <div v-if="selectedAppointment.comments">
                <span class="text-gray-600">Комментарий:</span>
                <p class="ml-0 mt-1 p-2 bg-gray-50 rounded text-gray-700">
                  {{ selectedAppointment.comments }}
                </p>
              </div>
              <div>
                <span class="text-gray-600">Статус:</span>
                <select
                  :value="selectedAppointment.status"
                  @change="
                    (e) => {
                      updateAppointmentStatus(selectedAppointment.id, e.target.value)
                      const updated = appointments.find((a) => a.id === selectedAppointment.id)
                      if (updated) selectedAppointment = { ...updated }
                    }
                  "
                  :class="[
                    'w-full mt-2 px-2 py-1 rounded text-xs font-medium border border-gray-300 cursor-pointer',
                    selectedAppointment.status === 'new'
                      ? 'bg-yellow-50'
                      : selectedAppointment.status === 'confirmed'
                        ? 'bg-purple-50'
                        : selectedAppointment.status === 'in_progress'
                          ? 'bg-blue-50'
                          : selectedAppointment.status === 'completed'
                            ? 'bg-green-50'
                            : selectedAppointment.status === 'cancelled'
                              ? 'bg-gray-50'
                              : 'bg-yellow-50'
                  ]"
                >
                  <option value="new">Новая</option>
                  <option value="confirmed">Подтверждена</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
            </div>

            <button
              @click="
                deleteAppointment(selectedAppointment.id)
                selectedAppointment = null
              "
              class="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Удалить запись
            </button>
          </div>
        </div>
      </div>

      <!-- Admins Tab -->
      <div v-if="activeTab === 'admins'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Добавить администратора</h2>

          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Email администратора</label
              >
              <input
                v-model="newAdmin.email"
                type="email"
                placeholder="admin@example.com"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  v-model="newAdmin.firstName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                <input
                  v-model="newAdmin.lastName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div
              v-if="adminMessage"
              :class="[
                'p-3 rounded-lg text-sm',
                adminMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              ]"
            >
              {{ adminMessage.text }}
            </div>

            <button
              @click="addAdmin"
              :disabled="addingAdmin"
              class="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {{ addingAdmin ? 'Добавление...' : 'Добавить администратора' }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-bold text-gray-900">Список администраторов</h2>
          </div>

          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Имя</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Роль</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Статус</th>
                <th class="px-6 py-3 text-center text-sm font-medium text-gray-700">Удалить</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="admin in admins" :key="admin.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">
                  {{ admin.email }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ admin.firstName }} {{ admin.lastName }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <span
                    v-if="admin.isOwner"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                    Owner
                  </span>
                  <select
                    v-else-if="canChangeRole(admin)"
                    :value="admin.role"
                    @change="(e) => updateAdminRole(admin.id, e.target.value)"
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      admin.role === 'admin'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    ]"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span
                    v-else
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                      admin.role === 'admin'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    ]"
                  >
                    {{ admin.role === 'admin' ? 'Admin' : 'Staff' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm">
                  <select
                    v-if="canToggleActive(admin)"
                    :value="admin.isActive ? 'active' : 'inactive'"
                    @change="(e) => updateAdminStatus(admin.id, e.target.value === 'active')"
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      admin.isActive
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    ]"
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                  <span
                    v-else
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                      admin.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    ]"
                  >
                    {{ admin.isActive ? 'Активен' : 'Неактивен' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-center">
                  <button
                    v-if="canDeleteAdmin(admin)"
                    @click="deleteAdmin(admin.id)"
                    class="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить администратора"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  apiCalendarSettingsRoute,
  apiUpdateSettingsRoute,
  apiAppointmentsListRoute,
  apiDeleteAppointmentRoute,
  apiUpdateAppointmentRoute,
  apiAddAdminRoute,
  apiAdminsListRoute,
  apiCheckAdminRoute,
  apiUpdateAdminRoleRoute,
  apiUpdateAdminStatusRoute,
  apiCreateAppointmentRoute,
  apiScheduleRoute,
  apiDeleteAdminRoute
} from '../api/appointments'
import { initCalendarRoute } from '../api/init'
import { bookingIndexRoute } from '../index'

const activeTab = ref('appointments')
const tabs = ['settings', 'appointments', 'admins']
const tabTitles = {
  settings: 'Настройки',
  appointments: 'Записи',
  admins: 'Администраторы'
}

const settings = ref({
  title: 'Запись на встречу',
  workDaysOfWeek: '1,2,3,4,5',
  workStartTime: '09:00',
  workEndTime: '18:00',
  slotDurationMinutes: 30,
  noticeBeforeMinutes: 60,
  maxDaysAhead: 30,
  isActive: true
})

const appointments = ref([])
const admins = ref([])
const newAdmin = ref({
  email: '',
  firstName: '',
  lastName: ''
})

const appointmentsViewDate = ref(new Date())
const selectedAppointment = ref(null)
const showAddAppointmentModal = ref(false)
const addAppointmentStep = ref(1)
const scheduleData = ref({})
const scheduleViewDate = ref(new Date())
const loadingSchedule = ref(false)
const newAppointment = ref({
  name: '',
  telegramId: '',
  email: '',
  comments: '',
  appointmentDate: '',
  appointmentTime: ''
})
const addingAppointment = ref(false)
const addAppointmentError = ref(null)

const savingSettings = ref(false)
const addingAdmin = ref(false)
const settingsMessage = ref(null)
const adminMessage = ref(null)
const isAdmin = ref(false)
const loaded = ref(false)
const currentAdmin = ref(null)

const weekDays = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' }
]

const workDaysArray = computed(() => {
  if (!settings.value.workDaysOfWeek) return []
  return settings.value.workDaysOfWeek
    .split(',')
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d))
})

const appointmentsByDay = computed(() => {
  const days = []
  const startDate = new Date(appointmentsViewDate.value)
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const dayAppointments = appointments.value
      .filter((apt) => apt.appointmentDate.toISOString().split('T')[0] === dateStr)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))

    days.push({
      date: dateStr,
      dayNum: date.getDate(),
      dayName: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
      appointments: dayAppointments
    })
  }

  return days
})

onMounted(async () => {
  try {
    const checkResult = await apiCheckAdminRoute.run(ctx)
    isAdmin.value = checkResult.isAdmin
    currentAdmin.value = checkResult.currentAdmin

    if (!isAdmin.value) {
      loaded.value = true
      return
    }

    await initCalendarRoute.run(ctx, {})

    const settingsData = await apiCalendarSettingsRoute.run(ctx)
    if (settingsData && !settingsData.error) {
      settings.value = settingsData
    }

    const appointmentsData = await apiAppointmentsListRoute.run(ctx)
    if (Array.isArray(appointmentsData)) {
      appointments.value = appointmentsData
    }

    const adminsData = await apiAdminsListRoute.run(ctx)
    if (Array.isArray(adminsData)) {
      admins.value = adminsData
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loaded.value = true
  }
})

async function saveSettings() {
  savingSettings.value = true
  settingsMessage.value = null

  try {
    const result = await apiUpdateSettingsRoute.run(ctx, settings.value)
    if (result.error) {
      throw new Error(result.error)
    }
    settingsMessage.value = {
      type: 'success',
      text: 'Настройки сохранены успешно'
    }
    const settingsData = await apiCalendarSettingsRoute.run(ctx)
    if (settingsData) {
      settings.value = settingsData
    }
  } catch (err) {
    settingsMessage.value = {
      type: 'error',
      text: 'Ошибка при сохранении настроек: ' + (err.message || '')
    }
  } finally {
    savingSettings.value = false
  }
}

async function updateAppointmentStatus(id, status) {
  try {
    await apiUpdateAppointmentRoute({ id }).run(ctx, { status })
    const apt = appointments.value.find((a) => a.id === id)
    if (apt) {
      apt.status = status
    }
  } catch (err) {
    alert('Ошибка при обновлении статуса')
  }
}

async function deleteAppointment(id) {
  if (!confirm('Вы уверены?')) return

  try {
    await apiDeleteAppointmentRoute({ id }).run(ctx, {})
    appointments.value = appointments.value.filter((apt) => apt.id !== id)
  } catch (err) {
    alert('Ошибка при удалении записи')
  }
}

async function addAdmin() {
  if (!newAdmin.value.email || !newAdmin.value.firstName) {
    adminMessage.value = {
      type: 'error',
      text: 'Заполните обязательные поля'
    }
    return
  }

  addingAdmin.value = true
  adminMessage.value = null

  try {
    const admin = await apiAddAdminRoute.run(ctx, {
      email: newAdmin.value.email,
      firstName: newAdmin.value.firstName,
      lastName: newAdmin.value.lastName || ''
    })

    if (admin.error) {
      throw new Error(admin.error)
    }

    admins.value.push(admin)
    adminMessage.value = {
      type: 'success',
      text: 'Администратор добавлен успешно'
    }

    newAdmin.value = {
      email: '',
      firstName: '',
      lastName: ''
    }
  } catch (err) {
    adminMessage.value = {
      type: 'error',
      text: 'Ошибка при добавлении администратора: ' + (err.message || '')
    }
  } finally {
    addingAdmin.value = false
  }
}

function goToPreviousWeek() {
  appointmentsViewDate.value.setDate(appointmentsViewDate.value.getDate() - 7)
  appointmentsViewDate.value = new Date(appointmentsViewDate.value)
}

function goToNextWeek() {
  appointmentsViewDate.value.setDate(appointmentsViewDate.value.getDate() + 7)
  appointmentsViewDate.value = new Date(appointmentsViewDate.value)
}

async function loadScheduleForAdding() {
  loadingSchedule.value = true
  try {
    const startDate = scheduleViewDate.value.toISOString().split('T')[0]
    const result = await apiScheduleRoute.run(ctx, { startDate, days: 7, isAdmin: true })
    scheduleData.value = result.schedule || {}
  } catch (err) {
    console.error('Error loading schedule:', err)
  } finally {
    loadingSchedule.value = false
  }
}

function goToPreviousDay() {
  scheduleViewDate.value.setDate(scheduleViewDate.value.getDate() - 1)
  scheduleViewDate.value = new Date(scheduleViewDate.value)
  loadScheduleForAdding()
}

function goToNextDay() {
  scheduleViewDate.value.setDate(scheduleViewDate.value.getDate() + 1)
  scheduleViewDate.value = new Date(scheduleViewDate.value)
  loadScheduleForAdding()
}

function selectSlot(dateStr, time) {
  newAppointment.value.appointmentDate = dateStr
  newAppointment.value.appointmentTime = time
  addAppointmentStep.value = 2
}

function backToSchedule() {
  addAppointmentStep.value = 1
  addAppointmentError.value = null
}

function closeAddAppointmentModal() {
  showAddAppointmentModal.value = false
  addAppointmentStep.value = 1
  addAppointmentError.value = null
  newAppointment.value = {
    name: '',
    telegramId: '',
    email: '',
    comments: '',
    appointmentDate: '',
    appointmentTime: ''
  }
}

function openAddAppointmentModal() {
  showAddAppointmentModal.value = true
  addAppointmentStep.value = 1
  scheduleViewDate.value = new Date()
  loadScheduleForAdding()
}

function logout() {
  fetch('/s/auth/sign-out', { method: 'POST' }).then(() => {
    window.location.href = '/s/auth/signin?back=/admin'
  })
}

function canChangeRole(admin) {
  if (!currentAdmin.value) return false
  if (admin.isOwner) return false
  if (currentAdmin.value.isOwner) return true
  if (currentAdmin.value.role === 'staff') return false
  if (currentAdmin.value.role === 'admin') {
    return admin.role === 'staff'
  }
  return false
}

function canToggleActive(admin) {
  if (!currentAdmin.value) return false
  if (admin.isOwner) return false
  if (currentAdmin.value.isOwner) return true
  if (currentAdmin.value.role === 'staff') return false
  if (currentAdmin.value.role === 'admin') {
    return admin.role === 'staff'
  }
  return false
}

async function updateAdminRole(id, role) {
  try {
    const result = await apiUpdateAdminRoleRoute({ id }).run(ctx, { role })
    if (result.error) {
      alert('Ошибка: ' + result.error)
      return
    }
    const admin = admins.value.find((a) => a.id === id)
    if (admin) {
      admin.role = role
    }
  } catch (err) {
    alert('Ошибка при изменении роли')
  }
}

async function updateAdminStatus(id, isActive) {
  try {
    const result = await apiUpdateAdminStatusRoute({ id }).run(ctx, { isActive })
    if (result.error) {
      alert('Ошибка: ' + result.error)
      return
    }
    const admin = admins.value.find((a) => a.id === id)
    if (admin) {
      admin.isActive = isActive
    }
  } catch (err) {
    alert('Ошибка при изменении статуса')
  }
}

function toggleWorkDay(dayNum) {
  const current = workDaysArray.value
  let newDays
  if (current.includes(dayNum)) {
    newDays = current.filter((d) => d !== dayNum)
  } else {
    newDays = [...current, dayNum].sort((a, b) => a - b)
  }
  settings.value.workDaysOfWeek = newDays.join(',')
}

async function createAppointment() {
  if (
    !newAppointment.value.name ||
    !newAppointment.value.appointmentDate ||
    !newAppointment.value.appointmentTime
  ) {
    addAppointmentError.value = 'Заполните обязательные поля'
    return
  }

  addingAppointment.value = true
  addAppointmentError.value = null

  try {
    const result = await apiCreateAppointmentRoute.run(ctx, {
      name: newAppointment.value.name,
      telegramId: newAppointment.value.telegramId || '',
      email: newAppointment.value.email || '',
      comments: newAppointment.value.comments || '',
      appointmentDate: newAppointment.value.appointmentDate,
      appointmentTime: newAppointment.value.appointmentTime
    })

    if (result.error) {
      throw new Error(result.error)
    }

    // Обновляем список записей
    const appointmentsData = await apiAppointmentsListRoute.run(ctx)
    if (Array.isArray(appointmentsData)) {
      appointments.value = appointmentsData
    }

    // Закрываем модальное окно и очищаем форму
    closeAddAppointmentModal()
  } catch (err) {
    addAppointmentError.value = 'Ошибка при создании записи: ' + (err.message || '')
  } finally {
    addingAppointment.value = false
  }
}

function canDeleteAdmin(admin) {
  if (!currentAdmin.value) return false
  if (admin.isOwner) return false
  if (admin.id === currentAdmin.value.id) return false
  if (currentAdmin.value.isOwner) return true
  if (currentAdmin.value.role === 'staff') return false
  if (currentAdmin.value.role === 'admin') {
    return admin.role === 'staff'
  }
  return false
}

async function deleteAdmin(id) {
  if (!confirm('Вы уверены, что хотите удалить этого администратора?')) {
    return
  }

  try {
    const result = await apiDeleteAdminRoute({ id }).run(ctx, {})
    if (result.error) {
      alert('Ошибка: ' + result.error)
      return
    }
    admins.value = admins.value.filter((a) => a.id !== id)
  } catch (err) {
    alert('Ошибка при удалении администратора')
  }
}
</script>

<style scoped>
table {
  border-collapse: collapse;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
