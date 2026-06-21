<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <!-- Приветственное окно (онбординг) -->
    <div v-if="!agent && !hasChannels" class="bg-white rounded-lg shadow-md p-8 w-full max-w-2xl">
      <!-- Градиентная линия сверху -->
      <div
        class="h-1.5 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-800 rounded-t-lg -mx-8 -mt-8 mb-8"
      ></div>

      <div>
        <!-- Заголовок -->
        <h1 class="text-3xl font-bold text-gray-900 mb-6">
          Умный помощник для общения <br />с клиентами
        </h1>

        <!-- Основной текст -->
        <div class="text-gray-600 text-lg leading-relaxed mb-8 space-y-4">
          <p>
            Представьте, что у вас есть сотрудник, который всегда на связи: отвечает в чате,
            принимает заказы, записывает на услуги и напоминает о встречах. Такой сотрудник работает
            круглосуточно и не устает.
          </p>
          <p>
            Наш сервис помогает создать такого помощника —
            <span
              @click="openAgentInfoModal"
              class="border-b border-dashed border-blue-600 text-blue-600 cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              >Агента</span
            >. Он общается с клиентами по заданному сценарию, понимает запросы и выполняет нужные
            действия.
          </p>
          <p>
            Чтобы Агент мог разговаривать с вашими клиентами, ему нужен канал связи — например,
            Телеграм. Подключите его, и ваш Агент начнёт работать.
          </p>
        </div>

        <!-- Кнопка -->
        <button
          @click="openAgentModal"
          type="button"
          class="relative overflow-hidden px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-lg hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <span class="relative z-10">Начать работать</span>
          <!-- Скользящий луч -->
          <div class="absolute top-0 left-0 w-full h-full">
            <div
              class="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 animate-slide-beam"
            ></div>
          </div>
        </button>

        <style>
          @keyframes slide-beam {
            0% {
              left: -100%;
            }
            50% {
              left: -100%;
            }
            100% {
              left: 100%;
            }
          }
          .animate-slide-beam {
            animation: slide-beam 3s ease-in-out infinite;
          }
        </style>
      </div>
    </div>

    <!-- Основная форма настроек -->
    <div v-else class="bg-white rounded-lg shadow-md p-8 w-full max-w-xl">
      <!-- Градиентная линия сверху -->
      <div
        class="h-1.5 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-800 rounded-t-lg -mx-8 -mt-8 mb-6"
      ></div>

      <h1 class="text-2xl font-bold text-gray-900 mb-8 text-center">
        ИИ<span style="font-size: 1.5rem">-агент</span>
      </h1>

      <!-- Статус настройки -->
      <div class="mb-6 bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div v-if="agent && hasChannels" class="text-green-600 font-semibold text-sm">
              Полностью настроен
            </div>
            <div
              v-else-if="agent || hasChannels"
              class="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold"
            >
              Частично настроен
            </div>
            <div v-else class="text-red-500 font-semibold text-sm">Не настроен</div>
          </div>
        </div>
        <div class="mt-3 text-sm space-y-1">
          <div class="flex items-center">
            <span v-if="agent" class="text-green-600 mr-2">✓</span>
            <span v-else class="text-red-500 mr-2">✗</span>
            <span :class="agent ? 'text-green-600' : 'text-red-500'">{{
              agent ? 'Агент настроен' : 'Агент не настроен'
            }}</span>
          </div>
          <div class="flex items-center">
            <span v-if="hasChannels" class="text-green-600 mr-2">✓</span>
            <span v-else class="text-red-500 mr-2">✗</span>
            <span :class="hasChannels ? 'text-green-600' : 'text-red-500'">{{
              hasChannels ? 'Каналы настроены' : 'Каналы не настроены'
            }}</span>
          </div>
        </div>
      </div>

      <!-- Настройка агента -->
      <div class="mb-8 bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center">
            <div
              v-if="agent"
              class="mr-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <div
              v-else
              class="mr-3 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
            Подключенный агент
          </h2>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Он общается с клиентами по вашим правилам и умеет действовать (вести запись на услуги,
          напоминать о встречах, принимать заказы, отвечать на частые вопросы, уведомлять об акциях
          и новостях).
        </p>

        <div v-if="!agent">
          <button
            @click="openAgentModal"
            type="button"
            class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Создать агента
          </button>
        </div>

        <div v-else class="flex items-center py-3">
          <div
            class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              {{ agent.title }}
            </div>
            <div class="text-xs text-gray-500">Агент активен</div>
          </div>
          <div class="flex-shrink-0 ml-3">
            <button
              @click="openAgentSettings"
              class="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Настройки агента
            </button>
          </div>
        </div>

        <!-- Инструменты агента -->
        <div v-if="agent && workspaceTools.length > 0" class="mt-4 pt-4 border-t border-gray-200">
          <h3 class="text-sm font-medium text-gray-900 mb-2">
            Инструменты агента в этом воркспейсе
          </h3>
          <div class="space-y-2">
            <div v-for="tool in workspaceTools" :key="tool.name" class="flex items-start py-1.5">
              <div class="flex-shrink-0 mr-3 mt-0.5">
                <!-- Подключенный инструмент -->
                <svg v-if="selectedTools?.includes(tool.key)" class="w-5 h-5" viewBox="0 0 24 24">
                  <!-- Синий квадрат -->
                  <path d="M3 3h18v18H3V3z" fill="#2563eb" />
                  <!-- Белая галочка -->
                  <path
                    d="M9 15.17L6.83 13l-1.41 1.41L9 18 18 9l-1.41-1.41L9 15.17z"
                    fill="white"
                  />
                </svg>
                <!-- Неподключенный инструмент -->
                <svg v-else class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h18v18H3V3zm16 2H5v14h14V5z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="block">
                  <div class="text-sm text-gray-900 leading-snug">
                    {{ tool.description }}
                  </div>
                  <div class="text-xs text-gray-500">{{ tool.name }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
            Для управления доступными тулами перейдите в
            <button @click="openAgentSettings" class="text-blue-600 hover:text-blue-800 underline">
              настройки агента</button
            >.
          </div>
        </div>
      </div>

      <!-- Настройка каналов -->
      <div class="mb-8 bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center">
            <div
              v-if="hasChannels"
              class="mr-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <div
              v-else
              class="mr-3 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
            Настройка транспортов
          </h2>
        </div>

        <p class="text-sm text-gray-600 mb-6">
          Транспорт (канал связи) — это место, где клиенты пишут Агенту.<br />
          На старте мы используем Telegram. Подключаете — и ваш Агент доступен для клиентов сразу.
        </p>
        <p class="mb-6">
          <button
            @click="openTelegramModal"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Подключить Telegram-бота
          </button>
        </p>

        <!-- Список доступных каналов для выбора -->
        <div v-if="props.availableChannels && props.availableChannels.length > 0" class="space-y-3">
          <div
            v-for="channel in props.availableChannels"
            :key="channel.id"
            class="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <!-- Чекбокс -->
            <div class="flex-shrink-0 mr-3">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :value="channel.id"
                  v-model="selectedChannelIds"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span class="sr-only">Выбрать {{ channel.title }}</span>
              </label>
            </div>

            <!-- Фото/Аватар канала -->
            <div class="flex-shrink-0 mr-3">
              <div v-if="channel.photo" class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                <img
                  :src="getThumbnailUrl(channel.photo, 32, 32)"
                  :alt="channel.title"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm"
              >
                {{ getChannelInitials(channel.title) }}
              </div>
            </div>

            <!-- Информация о канале -->
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">
                {{ channel.title }}
              </div>
              <div class="text-xs text-gray-500">
                {{
                  channel.description ||
                  (channel.username ? '@' + channel.username : getChannelSourceName(channel.source))
                }}
              </div>
            </div>

            <!-- Кнопка тестирования -->
            <div
              v-if="channel.username && selectedChannelIds.includes(channel.id)"
              class="flex-shrink-0 ml-3"
            >
              <button
                @click="testChannel(channel)"
                class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <svg
                  class="w-3 h-3 inline mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  ></path>
                </svg>
                @{{ channel.username }}
              </button>
            </div>
          </div>

          <!-- Кнопка сохранения -->
          <div class="flex justify-between pt-4 border-t border-gray-200">
            <div class="flex items-center space-x-4">
              <a
                href="/app/sender/v2#/settings/channel/add"
                class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                Добавить транспорт
              </a>
            </div>
            <button
              @click="saveChannels"
              :disabled="isSavingChannels"
              class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSavingChannels ? 'Сохраняю...' : 'Сохранить' }}
            </button>
          </div>
        </div>

        <!-- Нет каналов -->
        <div
          v-else-if="props.availableChannels && props.availableChannels.length === 0"
          class="text-center py-6"
        >
          <p class="text-gray-500 mb-4">Нет ни одного канала</p>
          <a
            href="/app/sender/v2#/settings/channel/add"
            class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Добавить канал
          </a>
        </div>

        <!-- Fallback для старого интерфейса -->
        <div v-else-if="!props.availableChannels && !hasChannels">
          <button
            v-if="ctx.user?.is('Admin')"
            @click="openTelegramModal"
            type="button"
            class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Подключить телеграм
          </button>
        </div>

        <!-- Отображение текущих подключенных каналов (если есть, но нет availableChannels) -->
        <div
          v-else-if="
            hasChannels && (!props.availableChannels || props.availableChannels.length === 0)
          "
          class="space-y-3"
        >
          <div v-for="channel in props.channels" :key="channel.id" class="flex items-center py-3">
            <div class="flex-shrink-0 mr-3">
              <div v-if="channel.photo" class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                <img
                  :src="getThumbnailUrl(channel.photo, 32, 32)"
                  :alt="channel.title"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm"
              >
                {{ getChannelInitials(channel.title) }}
              </div>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">
                {{ channel.title }}
              </div>
              <div class="text-xs text-gray-500">подключен</div>
            </div>
            <div v-if="channel.username" class="flex-shrink-0 ml-3">
              <button
                @click="testChannel(channel)"
                class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <svg
                  class="w-3 h-3 inline mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  ></path>
                </svg>
                Тестировать @{{ channel.username }}
              </button>
            </div>
          </div>
        </div>

        <!-- Fallback для старого интерфейса -->
        <div v-else-if="!props.availableChannels && !hasChannels">
          <button
            v-if="ctx.user?.is('Admin')"
            @click="openTelegramModal"
            type="button"
            class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Подключить телеграм
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно информации об агенте -->
    <div
      v-if="isAgentInfoModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div class="p-8">
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              <strong>Агент — это сердце системы.</strong>
            </h2>
          </div>

          <div class="text-gray-600 text-base leading-relaxed space-y-4 mb-6">
            <p>
              У него есть промт (инструкция), по которой он понимает, как вести себя с клиентами.
            </p>
            <p>
              Он может вести диалоги и пользоваться инструментами (например, календарём для записи
              или CRM для сохранения клиентов).
            </p>
            <p>
              Вы сами решаете, что именно он будет делать: записывать на услуги, принимать заказы,
              напоминать о встречах или рассказывать про акции.
            </p>

            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="font-medium text-blue-900 mb-2">Примеры:</p>
              <ul class="text-blue-800 space-y-1 list-disc list-inside text-sm">
                <li>
                  <strong>Школа рисования:</strong> Агент записывает новых учеников на диагностику.
                </li>
                <li><strong>Парикмахерская:</strong> Агент ведёт запись на стрижки.</li>
                <li><strong>Кафе:</strong> Агент принимает заказы и сообщает о скидках.</li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="closeAgentInfoModal"
              class="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания агента -->
    <div
      v-if="isAgentModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Создать агента</h2>

          <form @submit.prevent="connectAgent">
            <div class="mb-4">
              <label for="agentTitle" class="block text-sm font-medium text-gray-700 mb-2">
                Название агента
              </label>
              <input
                id="agentTitle"
                v-model="agentTitle"
                type="text"
                placeholder="Например: Консультант по продуктам"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div class="mb-6">
              <label for="agentPrompt" class="block text-sm font-medium text-gray-700 mb-2">
                Инструкции для агента
              </label>
              <textarea
                id="agentPrompt"
                v-model="agentPrompt"
                rows="6"
                placeholder="Опишите как должен вести себя агент, какие задачи решать..."
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>

            <div class="flex space-x-3">
              <button
                @click="closeAgentModal"
                type="button"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Отмена
              </button>
              <button
                :disabled="!agentTitle || !agentPrompt || isConnectingAgent"
                type="submit"
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isConnectingAgent ? 'Создаю...' : 'Создать' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Модальное окно подключения телеграм -->
    <div
      v-if="isTelegramModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Подключить телеграм бота</h2>

          <div class="mb-4">
            <label for="telegramToken" class="block text-sm font-medium text-gray-700 mb-2">
              Токен бота
            </label>
            <input
              id="telegramToken"
              v-model="telegramToken"
              type="text"
              placeholder="Введите токен от BotFather"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div class="mt-3 p-3 bg-blue-50 rounded-md">
              <p class="text-sm font-medium text-blue-900 mb-2">Как получить токен бота:</p>
              <ol class="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>
                  Откройте Telegram и найдите бота
                  <a href="https://t.me/BotFather" target="_blank" class="underline font-medium"
                    >@BotFather</a
                  >
                </li>
                <li>Отправьте команду /newbot</li>
                <li>Придумайте название для вашего бота</li>
                <li>Придумайте username (должен заканчиваться на _bot)</li>
                <li>
                  BotFather пришлет вам токен вида: 123456789:ABCdef1234567890ABCdef1234567890ABC
                </li>
                <li>Скопируйте этот токен и вставьте в поле выше</li>
              </ol>
              <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p class="text-xs text-yellow-800">
                  <strong>Важно:</strong> Не передавайте токен третьим лицам. Токен дает полный
                  доступ к управлению ботом.
                </p>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="closeTelegramModal"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              @click="connectTelegram"
              :disabled="!telegramToken || isConnectingTelegram"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isConnectingTelegram ? 'Подключаю...' : 'Подключить' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, nextTick, onMounted } from 'vue'
import { getThumbnailUrl } from '@app/storage'
import { apiConnectTelegramRoute, apiConnectAgentRoute } from '../api/connect'
import { apiGetToolsRoute } from '../api/agent'
import { apiSaveChannelsRoute } from '../api/connect'

const props = defineProps({
  channels: Array,
  agent: Object,
  availableChannels: Array
})

const workspaceTools = ref([])
const selectedTools = ref([])

// Состояние выбранных каналов - инициализируем сразу из пропсов
const selectedChannelIds = ref(props.channels ? props.channels.map((channel) => channel.id) : [])
const isSavingChannels = ref(false)

// Вычисляемое свойство для наличия каналов
onMounted(async () => {
  try {
    const response = await apiGetToolsRoute.run(ctx)
    workspaceTools.value = response?.workspaceTools || []
    selectedTools.value = response?.agentTools || []
  } catch (error) {
    console.error('Ошибка загрузки инструментов:', error)
  }
})

const hasChannels = computed(() => {
  return props.channels && props.channels.length > 0
})

// Состояние модального окна агента
const isAgentModalOpen = ref(false)
const agentTitle = ref('')
const agentPrompt = ref(`Ты — бот-ассистент, созданный для помощи пользователям в различных задачах.

Твоя основная цель — предоставлять точную и полезную информацию, а также помогать в решении повседневных задач.`)
const isConnectingAgent = ref(false)

// Состояние модального окна телеграма
const isTelegramModalOpen = ref(false)
const telegramToken = ref('')
const isConnectingTelegram = ref(false)

// Состояние модального окна информации об агенте
const isAgentInfoModalOpen = ref(false)

const openAgentInfoModal = () => {
  isAgentInfoModalOpen.value = true
}
const closeAgentInfoModal = () => {
  isAgentInfoModalOpen.value = false
}

// Получение инициалов для аватара канала
const getChannelInitials = (name) => {
  if (!name) return 'C'
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Получение названия источника канала
const getChannelSourceName = (source) => {
  const sourceNames = {
    Telegram: 'Телеграм',
    WhatsApp: 'WhatsApp',
    Viber: 'Viber',
    VK: 'ВКонтакте',
    Avito: 'Авито'
  }
  return sourceNames[source] || source
}

// Тестирование канала
const testChannel = (channel) => {
  window.open(`https://t.me/${channel.username}`, '_blank')
}

// Открытие настроек агента
const openAgentSettings = () => {
  window.parent?.postMessage(
    JSON.stringify({
      action: 'preview/agents'
    })
  )
  window.location.href = ctx.account.url(`/app/agent-process/~agent/${props.agent.id}`)
}

// Управление модальным окном агента
const openAgentModal = async () => {
  isAgentModalOpen.value = true
  agentTitle.value = ''
  agentPrompt.value = `Ты — бот-ассистент, созданный для помощи пользователям в различных задачах.

Твоя основная цель — предоставлять точную и полезную информацию, а также помогать в решении повседневных задач.`

  // Устанавливаем фокус на поле имени агента
  await nextTick()
  const titleInput = document.getElementById('agentTitle')
  if (titleInput) titleInput.focus()
}

const closeAgentModal = () => {
  isAgentModalOpen.value = false
  agentTitle.value = ''
  agentPrompt.value = `Ты — бот-ассистент, созданный для помощи пользователям в различных задачах.

Твоя основная цель — предоставлять точную и полезную информацию, а также помогать в решении повседневных задач.`
}

// Создание агента
const connectAgent = async () => {
  if (!agentTitle.value || !agentPrompt.value) return

  isConnectingAgent.value = true
  try {
    await apiConnectAgentRoute.run(ctx, {
      title: agentTitle.value,
      prompt: agentPrompt.value
    })
    closeAgentModal()
    window.location.reload()
  } catch (error) {
    alert('Ошибка создания агента: ' + error.message)
  } finally {
    isConnectingAgent.value = false
  }
}

// Управление модальным окном телеграма
const openTelegramModal = () => {
  isTelegramModalOpen.value = true
  telegramToken.value = ''
}

const closeTelegramModal = () => {
  isTelegramModalOpen.value = false
  telegramToken.value = ''
}

// Подключение телеграм бота
const connectTelegram = async () => {
  if (!telegramToken.value) return

  isConnectingTelegram.value = true
  try {
    await apiConnectTelegramRoute.run(ctx, { token: telegramToken.value })
    closeTelegramModal()
    window.location.reload()
  } catch (error) {
    alert('Ошибка подключения: ' + error.message)
  } finally {
    isConnectingTelegram.value = false
  }
}

// Сохранение выбранных каналов
const saveChannels = async () => {
  isSavingChannels.value = true
  try {
    await apiSaveChannelsRoute.run(ctx, {
      channelIds: selectedChannelIds.value
    })
    // Перезагружаем страницу для обновления данных
    window.location.reload()
  } catch (error) {
    alert('Ошибка сохранения каналов: ' + error.message)
  } finally {
    isSavingChannels.value = false
  }
}
</script>
