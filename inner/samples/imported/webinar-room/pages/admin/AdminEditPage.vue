<template>
  <div v-if="loading" class="min-h-screen bg-dark flex items-center justify-center">
    <div class="text-center">
      <div
        class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p class="wr-text-secondary">Загрузка...</p>
    </div>
  </div>
  <div v-else-if="!episode" class="min-h-screen bg-dark flex items-center justify-center">
    <div class="text-center">
      <p class="wr-status-red text-lg mb-4">{{ error || 'Эфир не найден' }}</p>
      <a :href="props.indexUrl" class="btn-primary text-white px-6 py-3 rounded-xl"
        >Назад к списку</a
      >
    </div>
  </div>
  <div v-else class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div class="flex items-center gap-2 sm:gap-4">
          <button
            @click="goBack"
            class="admin-btn-subtle w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            title="К списку эфиров"
          >
            <i class="fas fa-arrow-left"></i>
          </button>
          <h1 class="wr-text-primary font-bold text-sm sm:text-base lg:text-lg truncate min-w-0">
            {{ form.title || 'Редактирование' }}
          </h1>
          <span
            :class="statusBadgeClass"
            class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex-shrink-0"
          >
            {{ statusLabel }}
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div
        v-if="saved"
        class="glass-toast rounded-xl p-4 wr-status-green text-sm mb-6 flex items-center gap-2"
      >
        <i class="fas fa-check-circle"></i> Сохранено
      </div>

      <form @submit.prevent="submitForm" class="space-y-6">
        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Название *</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Тема эфира"
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
          />
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Описание</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="О чём будет эфир..."
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Дата и время *</label>
          <input
            v-model="form.scheduledDate"
            type="datetime-local"
            required
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
          />
        </div>

        <!-- Two column layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left column: main form fields -->
          <div class="space-y-6">
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-2">Доступ к чату</label>
              <CustomSelect v-model="form.chatAccessMode" :options="chatAccessOptions" size="lg" />
            </div>

            <div class="space-y-2">
              <div v-if="episode.status === 'scheduled' || episode.status === 'waiting_room'">
                <CustomCheckbox v-model="form.dvr">
                  <span class="wr-text-secondary text-sm font-medium"
                    >DVR (перемотка во время эфира)</span
                  >
                </CustomCheckbox>
              </div>
              <div v-else class="flex items-center gap-3">
                <div
                  :class="[
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                    episode.dvr !== false
                      ? 'wr-badge-green wr-status-green'
                      : 'wr-badge-gray wr-status-gray'
                  ]"
                >
                  <i v-if="episode.dvr !== false" class="fas fa-check text-xs"></i>
                  <i v-else class="fas fa-times text-xs"></i>
                </div>
                <div>
                  <span class="wr-text-secondary text-sm font-medium"
                    >DVR (перемотка во время эфира)</span
                  >
                  <p class="wr-text-tertiary text-xs">
                    {{
                      episode.dvr !== false
                        ? 'Зрители могут перематывать трансляцию'
                        : 'Перемотка отключена'
                    }}
                  </p>
                </div>
              </div>
              <p
                v-if="episode.status === 'scheduled' || episode.status === 'waiting_room'"
                class="wr-text-tertiary text-xs ml-8"
              >
                Зрители смогут перематывать трансляцию
              </p>
            </div>

            <div class="space-y-2">
              <div v-if="episode.status === 'scheduled' || episode.status === 'waiting_room'">
                <CustomCheckbox v-model="form.record">
                  <span class="wr-text-secondary text-sm font-medium">Сохранять запись эфира</span>
                </CustomCheckbox>
              </div>
              <div v-else class="flex items-center gap-3">
                <div
                  :class="[
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                    episode.record !== false
                      ? 'wr-badge-green wr-status-green'
                      : 'wr-badge-gray wr-status-gray'
                  ]"
                >
                  <i v-if="episode.record !== false" class="fas fa-check text-xs"></i>
                  <i v-else class="fas fa-times text-xs"></i>
                </div>
                <div>
                  <span class="wr-text-secondary text-sm font-medium">Сохранение записи эфира</span>
                  <p class="wr-text-tertiary text-xs">
                    {{
                      episode.record !== false
                        ? 'Запись будет сохранена в Kinescope'
                        : 'Запись не сохраняется'
                    }}
                  </p>
                </div>
              </div>
              <p
                v-if="episode.status === 'scheduled' || episode.status === 'waiting_room'"
                class="wr-text-tertiary text-xs ml-8"
              >
                Запись эфира будет сохранена в Kinescope после завершения
              </p>
              <div
                v-if="
                  form.record &&
                  (episode.status === 'scheduled' || episode.status === 'waiting_room')
                "
                class="ml-8"
              >
                <label class="block wr-text-secondary text-sm font-medium mb-2"
                  >Папка для записи в Kinescope</label
                >
                <CustomSelect
                  v-model="form.kinescopeFolderId"
                  :options="folderOptions"
                  :placeholder="loadingFolders ? 'Загрузка папок...' : 'Выберите папку'"
                  :disabled="loadingFolders"
                  size="lg"
                />
                <p v-if="foldersError" class="wr-status-red text-xs mt-1">{{ foldersError }}</p>
                <p v-else-if="form.kinescopeFolderId" class="wr-text-tertiary text-xs mt-1">
                  Выбрана папка: {{ getFolderName(form.kinescopeFolderId) }}
                </p>
                <p v-else class="wr-text-tertiary text-xs mt-1">
                  Выберите папку для сохранения записи
                </p>
              </div>
              <div v-else-if="episode.record !== false && episode.kinescopeFolderId" class="ml-8">
                <p class="wr-text-tertiary text-xs">
                  Папка для записи: {{ getFolderName(episode.kinescopeFolderId) }}
                </p>
              </div>
            </div>

            <div class="glass rounded-2xl p-5 space-y-4">
              <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
                <i class="fas fa-play-circle text-primary"></i>
                Плеер Kinescope
              </h3>
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-2"
                  >Выберите плеер</label
                >
                <CustomSelect
                  v-model="form.kinescopePlayerId"
                  :options="playerOptions"
                  :placeholder="loadingPlayers ? 'Загрузка...' : 'Плеер по умолчанию'"
                  :disabled="loadingPlayers"
                  size="lg"
                />
                <p v-if="playersError" class="wr-status-red text-xs mt-1">{{ playersError }}</p>
                <p v-else class="wr-text-tertiary text-xs mt-1">
                  {{
                    episode.kinescopePlayerId
                      ? 'Выбран плеер: ' + getPlayerName(episode.kinescopePlayerId)
                      : 'Используется плеер по умолчанию'
                  }}
                </p>
              </div>
            </div>

            <div class="glass rounded-2xl p-5 space-y-4">
              <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
                <i class="fas fa-flag-checkered text-primary"></i>
                Действие при завершении эфира
              </h3>
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-2"
                  >Что показать зрителям после завершения</label
                >
                <CustomSelect
                  v-model="form.finishAction"
                  :options="finishActionOptions"
                  size="lg"
                />
                <p class="wr-text-tertiary text-xs mt-1">
                  {{
                    form.finishAction === 'redirect'
                      ? 'Зрители будут автоматически перенаправлены на указанный URL'
                      : 'Зрители увидят страницу с текстом и кнопкой'
                  }}
                </p>
              </div>

              <div v-if="form.finishAction === 'redirect'">
                <label class="block wr-text-secondary text-sm font-medium mb-2"
                  >Ссылка для редиректа</label
                >
                <input
                  v-model="form.resultUrl"
                  type="url"
                  placeholder="https://..."
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
                />
                <p class="wr-text-tertiary text-xs mt-1">
                  Зрители будут автоматически перенаправлены на этот URL после завершения эфира
                </p>
              </div>

              <div v-if="form.finishAction === 'page'" class="space-y-4 pt-2">
                <div>
                  <label class="block wr-text-secondary text-sm font-medium mb-2"
                    >Текст после завершения</label
                  >
                  <textarea
                    v-model="form.resultText"
                    rows="2"
                    placeholder="Спасибо за участие!"
                    class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500 resize-none"
                  ></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block wr-text-secondary text-sm font-medium mb-2"
                      >Текст кнопки</label
                    >
                    <input
                      v-model="form.resultButtonText"
                      type="text"
                      placeholder="Подробнее"
                      class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label class="block wr-text-secondary text-sm font-medium mb-2"
                      >Ссылка кнопки</label
                    >
                    <input
                      v-model="form.resultUrl"
                      type="url"
                      placeholder="https://..."
                      class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column: instructions and link -->
          <div class="space-y-6">
            <div
              v-if="episode.status === 'scheduled' || episode.status === 'waiting_room'"
              class="glass rounded-2xl p-6 space-y-5 border border-primary/30"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-broadcast-tower text-primary text-lg"></i>
                </div>
                <div class="flex-1">
                  <h3 class="wr-text-primary font-bold text-base mb-1">Как запустить эфир</h3>
                  <p class="wr-text-tertiary text-xs">Следуйте этим шагам для начала трансляции</p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex gap-3">
                  <div class="step-number">1</div>
                  <div class="flex-1">
                    <p class="wr-text-primary font-medium text-sm mb-1">
                      Настройте OBS Studio (или другую программу для стриминга)
                    </p>
                    <p class="wr-text-tertiary text-xs">
                      Откройте настройки → Вещание → Выберите "Пользовательский" сервер
                    </p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <div class="step-number">2</div>
                  <div class="flex-1">
                    <p class="wr-text-primary font-medium text-sm mb-2">
                      Скопируйте RTMP URL и Stream Key в OBS/Zoom
                    </p>
                    <div class="space-y-2">
                      <div>
                        <label class="block wr-text-secondary text-xs font-medium mb-1"
                          >RTMP URL (Server)</label
                        >
                        <div class="flex items-center gap-2">
                          <input
                            :value="episode.rtmpLink"
                            readonly
                            class="input-modern w-full px-3 py-2 rounded-lg wr-text-secondary text-xs font-mono"
                          />
                          <button
                            type="button"
                            @click="copyToClipboard(episode.rtmpLink)"
                            class="admin-copy-btn"
                          >
                            <i class="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label class="block wr-text-secondary text-xs font-medium mb-1"
                          >Stream Key (Ключ потока)</label
                        >
                        <div class="flex items-center gap-2">
                          <input
                            :value="episode.streamkey"
                            readonly
                            class="input-modern w-full px-3 py-2 rounded-lg wr-text-secondary text-xs font-mono"
                          />
                          <button
                            type="button"
                            @click="copyToClipboard(episode.streamkey)"
                            class="admin-copy-btn"
                          >
                            <i class="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex gap-3">
                  <div
                    class="w-7 h-7 rounded-lg wr-badge-yellow flex items-center justify-center flex-shrink-0 wr-status-yellow font-bold text-sm"
                  >
                    3
                  </div>
                  <div class="flex-1">
                    <p class="wr-text-primary font-medium text-sm mb-1">
                      Откройте комнату ожидания
                    </p>
                    <p class="wr-text-tertiary text-xs mb-3">
                      Зрители смогут зайти и общаться в чате до начала эфира
                    </p>
                    <button
                      v-if="episode.status === 'scheduled'"
                      @click="openRoom"
                      :disabled="actionLoading"
                      type="button"
                      class="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                    >
                      <i v-if="actionLoading" class="fas fa-spinner fa-spin"></i>
                      <i v-else class="fas fa-door-open"></i>
                      {{ actionLoading ? 'Открытие...' : 'Открыть комнату' }}
                    </button>
                    <div
                      v-else-if="episode.status === 'waiting_room'"
                      class="wr-status-green text-xs font-medium flex items-center gap-1"
                    >
                      <i class="fas fa-check-circle"></i>
                      Комната открыта
                    </div>
                  </div>
                </div>

                <div class="flex gap-3">
                  <div
                    class="w-7 h-7 rounded-lg wr-badge-green flex items-center justify-center flex-shrink-0 wr-status-green font-bold text-sm"
                  >
                    4
                  </div>
                  <div class="flex-1">
                    <p class="wr-text-primary font-medium text-sm mb-1">
                      Запустите трансляцию в OBS
                    </p>
                    <p class="wr-text-tertiary text-xs">
                      Нажмите "Начать трансляцию" в OBS — поток начнёт передаваться на сервер
                    </p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <div
                    class="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm"
                  >
                    5
                  </div>
                  <div class="flex-1">
                    <p class="wr-text-primary font-medium text-sm mb-1">Начните стрим в админке</p>
                    <p class="wr-text-tertiary text-xs mb-3">Зрители увидят ваш видеопоток</p>
                    <button
                      v-if="episode.status === 'waiting_room'"
                      @click="startStream"
                      :disabled="actionLoading"
                      type="button"
                      class="bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                    >
                      <i v-if="actionLoading" class="fas fa-spinner fa-spin"></i>
                      <i v-else class="fas fa-play"></i>
                      {{ actionLoading ? 'Запуск...' : 'Начать стрим' }}
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-if="episode.playLink"
                class="pt-3"
                style="border-top: 1px solid var(--wr-border)"
              >
                <label class="block wr-text-secondary text-xs font-medium mb-2"
                  >Ссылка для предпросмотра в Kinescope</label
                >
                <div class="flex items-center gap-2">
                  <input
                    :value="episode.playLink"
                    readonly
                    class="input-modern w-full px-3 py-2 rounded-lg wr-text-secondary text-xs"
                  />
                  <a :href="episode.playLink" target="_blank" class="admin-copy-btn">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>

              <div v-if="episode.kinescopeId" class="wr-text-tertiary text-xs">
                Kinescope Event ID: {{ episode.kinescopeId }}
              </div>
            </div>

            <div
              v-else-if="episode.streamkey || episode.rtmpLink"
              class="glass rounded-2xl p-5 space-y-4"
            >
              <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
                <i class="fas fa-video text-primary"></i>
                Данные для стриминга
              </h3>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-2">RTMP URL</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="episode.rtmpLink"
                    readonly
                    class="input-modern w-full px-4 py-2 rounded-xl wr-text-secondary text-sm font-mono"
                  />
                  <button
                    type="button"
                    @click="copyToClipboard(episode.rtmpLink)"
                    class="admin-copy-btn"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-2">Stream Key</label>
                <div class="flex items-center gap-2">
                  <input
                    :value="episode.streamkey"
                    readonly
                    class="input-modern w-full px-4 py-2 rounded-xl wr-text-secondary text-sm font-mono"
                  />
                  <button
                    type="button"
                    @click="copyToClipboard(episode.streamkey)"
                    class="admin-copy-btn"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div v-if="episode.playLink">
                <label class="block wr-text-secondary text-xs font-medium mb-2"
                  >Ссылка на просмотр в Kinescope</label
                >
                <div class="flex items-center gap-2">
                  <input
                    :value="episode.playLink"
                    readonly
                    class="input-modern w-full px-4 py-2 rounded-xl wr-text-secondary text-sm"
                  />
                  <a :href="episode.playLink" target="_blank" class="admin-copy-btn">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>
              <div v-if="episode.kinescopeId" class="wr-text-tertiary text-xs">
                Kinescope Event ID: {{ episode.kinescopeId }}
              </div>
            </div>

            <div class="glass rounded-2xl p-5">
              <h3 class="wr-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
                <i class="fas fa-link text-primary"></i>
                Ссылка на эфир
              </h3>
              <div class="flex items-center gap-2">
                <input
                  :value="displayUrl"
                  readonly
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-secondary text-sm"
                  :class="{ 'opacity-50': loadingShortUrl }"
                />
                <button
                  type="button"
                  @click="copyUrl"
                  class="admin-copy-btn px-4 py-3 rounded-xl"
                  :disabled="loadingShortUrl"
                >
                  <i v-if="loadingShortUrl" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-copy"></i>
                </button>
              </div>
              <p v-if="loadingShortUrl" class="wr-text-tertiary text-xs mt-2">
                Создание короткой ссылки...
              </p>
              <p v-else-if="shortUrl" class="wr-status-green text-xs mt-2 flex items-center gap-1">
                <i class="fas fa-check-circle"></i>
                Короткая ссылка создана
              </p>
            </div>
          </div>
        </div>

        <!-- Forms management section -->
        <div class="glass rounded-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
              <i class="fas fa-clipboard-list text-primary"></i>
              Формы для зрителей
            </h3>
            <button
              @click="openCreateFormModal"
              type="button"
              class="bg-primary hover:bg-primary/80 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition"
            >
              <i class="fas fa-plus"></i>
              <span class="hidden sm:inline">Создать форму</span>
            </button>
          </div>
          <div v-if="loadingForms" class="wr-text-tertiary text-xs">Загрузка форм...</div>
          <div v-else-if="allForms.length === 0" class="wr-text-tertiary text-xs">
            Нет форм. Создайте первую форму для зрителей.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="form in allForms"
              :key="form.id"
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg wr-hover-bg"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="wr-text-primary text-sm font-medium truncate">{{ form.title }}</span>
                  <span
                    v-if="isFormShown(form.id)"
                    class="wr-badge-green wr-status-green text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                    >Показана</span
                  >
                </div>
                <div class="wr-text-tertiary text-xs mt-0.5">{{ form.buttonText }}</div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click="toggleFormVisibility(form)"
                  type="button"
                  :class="
                    isFormShown(form.id)
                      ? 'bg-gray-600 hover:bg-gray-700'
                      : 'bg-green-600 hover:bg-green-700'
                  "
                  class="text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition min-h-[36px]"
                >
                  <i :class="isFormShown(form.id) ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  <span class="hidden sm:inline">{{
                    isFormShown(form.id) ? 'Скрыть' : 'Показать'
                  }}</span>
                </button>
                <button
                  @click="openEditFormModal(form)"
                  type="button"
                  class="wr-text-secondary hover:wr-text-primary transition w-9 h-9 flex items-center justify-center"
                >
                  <i class="fas fa-edit text-sm"></i>
                </button>
                <button
                  @click="deleteForm(form.id)"
                  type="button"
                  class="wr-text-secondary hover:wr-status-red transition w-9 h-9 flex items-center justify-center"
                >
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="episode.status === 'live' || episode.status === 'waiting_room'"
          class="glass rounded-2xl p-5 space-y-4"
        >
          <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
            <i class="fas fa-bullhorn text-primary"></i>
            Отправить баннер в чат
          </h3>
          <p class="wr-text-tertiary text-xs">
            Отправляет рекламное сообщение прямо в чат от имени бота. При клике зрители увидят
            выбранную форму.
          </p>
          <div class="space-y-3">
            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1"
                >Форма для показа при клике *</label
              >
              <CustomSelect
                v-model="selectedFormId"
                :options="formSelectOptions"
                placeholder="Выберите форму"
                size="md"
              />
              <p class="wr-text-tertiary text-xs mt-1">
                Эта форма откроется, когда зритель кликнет на баннер в чате
              </p>
            </div>
            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1">Заголовок</label>
              <input
                v-model="bannerTitle"
                type="text"
                class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
              />
            </div>
            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1">Описание</label>
              <input
                v-model="bannerSubtitle"
                type="text"
                class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
              />
            </div>
            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1">Текст кнопки</label>
              <input
                v-model="bannerButtonText"
                type="text"
                class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            @click="sendSaleBanner"
            :disabled="bannerSending || !selectedFormId"
            class="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition cursor-pointer disabled:cursor-wait"
          >
            <i v-if="bannerSending" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-bullhorn"></i>
            {{ bannerSending ? 'Отправка...' : 'Отправить баннер в чат' }}
          </button>
          <div
            v-if="bannerSent"
            class="wr-status-green text-xs font-medium flex items-center gap-1"
          >
            <i class="fas fa-check-circle"></i>
            Баннер отправлен в чат
          </div>
          <div v-if="bannerError" class="wr-status-red text-xs">{{ bannerError }}</div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <button
            type="submit"
            :disabled="saving"
            class="btn-primary text-white font-semibold px-6 sm:px-8 py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
          >
            <i v-if="saving" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-save"></i>
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <a
            :href="props.indexUrl"
            class="wr-text-tertiary hover:wr-text-primary transition text-sm px-4 py-3 text-center sm:text-left"
            >Назад</a
          >
        </div>

        <div v-if="error" class="glass-toast rounded-xl p-4 wr-status-red text-sm">
          <i class="fas fa-exclamation-circle mr-2"></i> {{ error }}
        </div>
      </form>
    </main>

    <FormEditorModal
      :visible="showFormModal"
      :editingForm="editingFormData"
      @close="showFormModal = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  apiEpisodeByIdRoute,
  apiEpisodeUpdateRoute,
  apiEpisodeOpenRoomRoute,
  apiEpisodeStartRoute
} from '../../api/episodes'
import { apiKinescopeFoldersRoute } from '../../api/episodes-kinescope-routes'
import { apiChatSendSaleBannerRoute } from '../../api/chat-admin-routes'
import { apiFormShowRoute, apiFormHideRoute } from '../../api/forms'
import { apiFormsAllRoute, apiFormDeleteRoute } from '../../api/forms-admin-routes'
import { episodePageRoute } from '../../episode'
import FormEditorModal from '../../components/admin/FormEditorModal.vue'
import CustomSelect from '../../components/CustomSelect.vue'
import CustomCheckbox from '../../components/CustomCheckbox.vue'
import { request } from '@app/request'
import { apiKinescopePlayersRoute } from '../../api/episodes-kinescope-routes'

const chatAccessOptions = [
  { value: 'open', label: 'Открытый (все могут писать)' },
  { value: 'auth-only', label: 'Только авторизованные' },
  { value: 'disabled', label: 'Чат отключён' }
]

const finishActionOptions = [
  { value: 'page', label: 'Показать финальную страницу с кнопкой' },
  { value: 'redirect', label: 'Перенаправить на другую страницу' }
]

const props = defineProps({
  episodeId: { type: String, required: true },
  indexUrl: String
})

const saving = ref(false)
const saved = ref(false)
const error = ref('')
const actionLoading = ref(false)
const players = ref([])
const loadingPlayers = ref(false)
const playersError = ref('')
const folders = ref([])
const loadingFolders = ref(false)
const foldersError = ref('')
const bannerSending = ref(false)
const bannerSent = ref(false)
const bannerError = ref('')
const bannerTitle = ref('Подключить Чатиум AI')
const bannerSubtitle = ref('Создавайте сайты, автоматизируйте бизнес, подключайте ИИ-агентов')
const bannerButtonText = ref('Подключить')
const selectedFormId = ref('')
const allForms = ref([])
const loadingForms = ref(false)
const showFormModal = ref(false)
const editingFormData = ref(null)
const episode = ref(null)
const loading = ref(true)
const shortUrl = ref('')
const loadingShortUrl = ref(false)

function getBannerStorageKey() {
  return `wr:episode:${props.episodeId}:last-sale-banner`
}

function restoreBannerFields() {
  try {
    const raw = localStorage.getItem(getBannerStorageKey())
    if (!raw) return

    const saved = JSON.parse(raw)
    if (typeof saved.title === 'string' && saved.title.trim()) {
      bannerTitle.value = saved.title
    }
    if (typeof saved.subtitle === 'string' && saved.subtitle.trim()) {
      bannerSubtitle.value = saved.subtitle
    }
    if (typeof saved.buttonText === 'string' && saved.buttonText.trim()) {
      bannerButtonText.value = saved.buttonText
    }
    if (typeof saved.formId === 'string') {
      selectedFormId.value = saved.formId
    }
  } catch (e) {
    console.error('Failed to restore banner fields:', e)
  }
}

function saveBannerFields() {
  try {
    localStorage.setItem(
      getBannerStorageKey(),
      JSON.stringify({
        title: bannerTitle.value,
        subtitle: bannerSubtitle.value,
        buttonText: bannerButtonText.value,
        formId: selectedFormId.value
      })
    )
  } catch (e) {
    console.error('Failed to save banner fields:', e)
  }
}

function toLocalDatetime(d) {
  if (!d) return ''
  const date = new Date(d)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const form = reactive({
  title: '',
  description: '',
  scheduledDate: '',
  chatAccessMode: 'open',
  kinescopePlayerId: '',
  dvr: true,
  record: true,
  kinescopeFolderId: '',
  finishAction: 'page',
  resultText: '',
  resultButtonText: '',
  resultUrl: ''
})

const statusLabel = computed(() => {
  if (!episode.value) return ''
  const map = { scheduled: 'Запланирован', live: 'В эфире', finished: 'Завершён' }
  return map[episode.value.status] || episode.value.status
})

const statusBadgeClass = computed(() => {
  if (!episode.value) return 'wr-badge-gray wr-status-gray'
  const map = {
    scheduled: 'wr-badge-blue wr-status-blue',
    waiting_room: 'wr-badge-yellow wr-status-yellow',
    live: 'wr-badge-green wr-status-green',
    finished: 'wr-badge-gray wr-status-gray'
  }
  return map[episode.value.status] || 'wr-badge-gray wr-status-gray'
})

const episodeUrl = computed(() => {
  if (!episode.value?.id) return ''
  return episodePageRoute({ id: episode.value.id }).url()
})

const displayUrl = computed(() => shortUrl.value || episodeUrl.value)

const folderOptions = computed(() => [
  { value: '', label: loadingFolders.value ? 'Загрузка папок...' : 'Выберите папку' },
  ...folders.value.map((f) => ({ value: f.id, label: `${f.projectName} / ${f.name}` }))
])

const playerOptions = computed(() => [
  { value: '', label: loadingPlayers.value ? 'Загрузка...' : 'Плеер по умолчанию' },
  ...players.value.map((p) => ({ value: p.id, label: p.name }))
])

const formSelectOptions = computed(() =>
  allForms.value.map((f) => ({ value: f.id, label: f.title }))
)

function getPlayerName(playerId) {
  const player = players.value.find((p) => p.id === playerId)
  return player ? player.name : playerId
}

function getFolderName(folderId) {
  const folder = folders.value.find((f) => f.id === folderId)
  return folder ? `${folder.projectName} / ${folder.name}` : folderId
}

async function makeShortUrl(url) {
  try {
    const result = await request({
      method: 'post',
      url: 'https://app.chatium.io/api/2.0/shortLink/create',
      json: { url },
      responseType: 'json'
    })
    return result.body.redirectShortLink || url
  } catch (e) {
    console.error('Failed to create short link:', e)
    return url
  }
}

async function loadEpisode() {
  loading.value = true
  try {
    const response = await apiEpisodeByIdRoute({ id: props.episodeId }).run(ctx)
    episode.value = response.episode

    // Заполняем форму данными эпизода
    form.title = episode.value.title || ''
    form.description = episode.value.description || ''
    form.scheduledDate = toLocalDatetime(episode.value.scheduledDate)
    form.chatAccessMode = episode.value.chatAccessMode || 'open'
    form.kinescopePlayerId = episode.value.kinescopePlayerId || ''
    form.dvr = episode.value.dvr !== false
    form.record = episode.value.record !== false
    form.kinescopeFolderId = episode.value.kinescopeFolderId || ''
    form.finishAction = episode.value.finishAction || 'page'
    form.resultText = episode.value.resultText || ''
    form.resultButtonText = episode.value.resultButtonText || ''
    form.resultUrl = episode.value.resultUrl || ''

    // Создаём короткую ссылку
    if (episode.value.id) {
      loadingShortUrl.value = true
      shortUrl.value = await makeShortUrl(episodeUrl.value)
      loadingShortUrl.value = false
    }
  } catch (e) {
    error.value = 'Не удалось загрузить эфир: ' + e.message
  }
  loading.value = false
}

async function loadPlayers() {
  loadingPlayers.value = true
  playersError.value = ''
  try {
    const data = await apiKinescopePlayersRoute.run(ctx)
    players.value = data
  } catch (e) {
    playersError.value = 'Не удалось загрузить плееры: ' + e.message
  }
  loadingPlayers.value = false
}

async function loadFolders() {
  loadingFolders.value = true
  foldersError.value = ''
  try {
    const data = await apiKinescopeFoldersRoute.run(ctx)
    folders.value = data
  } catch (e) {
    foldersError.value = 'Не удалось загрузить папки: ' + e.message
  }
  loadingFolders.value = false
}

onMounted(async () => {
  restoreBannerFields()

  // Критичные данные грузим сначала
  await loadEpisode()

  // Остальное параллельно
  Promise.all([loadPlayers(), loadFolders(), loadForms()])
})

async function loadForms() {
  loadingForms.value = true
  try {
    allForms.value = await apiFormsAllRoute.run(ctx)
  } catch (e) {
    console.error('Failed to load forms:', e)
  }
  loadingForms.value = false
}

function isFormShown(formId) {
  if (!episode.value) return false
  const shownIds = Array.isArray(episode.value.shownFormIds) ? episode.value.shownFormIds : []
  return shownIds.includes(formId)
}

async function toggleFormVisibility(form) {
  const isShown = isFormShown(form.id)
  try {
    if (isShown) {
      await apiFormHideRoute.run(ctx, { formId: form.id, episodeId: episode.value.id })
    } else {
      await apiFormShowRoute.run(ctx, { formId: form.id, episodeId: episode.value.id })
    }
    window.location.reload()
  } catch (e) {
    error.value = e.message
  }
}

function openCreateFormModal() {
  editingFormData.value = null
  showFormModal.value = true
}

function openEditFormModal(form) {
  editingFormData.value = form
  showFormModal.value = true
}

async function onFormSaved() {
  showFormModal.value = false
  await loadForms()
}

async function deleteForm(formId) {
  if (!confirm('Удалить форму?')) return
  try {
    await apiFormDeleteRoute({ id: formId }).run(ctx, {})
    await loadForms()
  } catch (e) {
    error.value = e.message
  }
}

function copyUrl() {
  navigator.clipboard.writeText(displayUrl.value)
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
}

function goBack() {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', {
      detail: { section: 'episodes', episodeId: null, mainTab: 'episodes' }
    })
  )
}

async function submitForm() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    await apiEpisodeUpdateRoute({ id: episode.value.id }).run(ctx, {
      title: form.title,
      description: form.description || undefined,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      chatAccessMode: form.chatAccessMode,
      kinescopePlayerId: form.kinescopePlayerId || undefined,
      dvr: form.dvr,
      record: form.record,
      kinescopeFolderId: form.kinescopeFolderId || undefined,
      finishAction: form.finishAction,
      resultText: form.resultText || undefined,
      resultButtonText: form.resultButtonText || undefined,
      resultUrl: form.resultUrl || undefined
    })
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 3000)
  } catch (e) {
    error.value = e.message
  }
  saving.value = false
}

async function openRoom() {
  actionLoading.value = true
  error.value = ''
  try {
    await apiEpisodeOpenRoomRoute({ id: episode.value.id }).run(ctx, {})
    window.location.reload()
  } catch (e) {
    error.value = e.message
    actionLoading.value = false
  }
}

async function sendSaleBanner() {
  if (!selectedFormId.value) {
    bannerError.value = 'Выберите форму для показа при клике на баннер'
    return
  }
  bannerSending.value = true
  bannerSent.value = false
  bannerError.value = ''
  try {
    await apiChatSendSaleBannerRoute.run(ctx, {
      episodeId: episode.value.id,
      title: bannerTitle.value,
      subtitle: bannerSubtitle.value,
      buttonText: bannerButtonText.value,
      formId: selectedFormId.value
    })
    saveBannerFields()
    bannerSent.value = true
    setTimeout(() => {
      bannerSent.value = false
    }, 3000)
  } catch (e) {
    bannerError.value = e.message
  }
  bannerSending.value = false
}

async function startStream() {
  actionLoading.value = true
  error.value = ''
  try {
    await apiEpisodeStartRoute({ id: episode.value.id }).run(ctx, {})
    window.location.reload()
  } catch (e) {
    error.value = e.message
    actionLoading.value = false
  }
}
</script>

<style scoped>
.step-number {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  background: var(--wr-btn-subtle-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--wr-text-primary);
  font-weight: 700;
  font-size: 0.875rem;
}
.admin-copy-btn {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 0.875rem;
}
.admin-copy-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
</style>
