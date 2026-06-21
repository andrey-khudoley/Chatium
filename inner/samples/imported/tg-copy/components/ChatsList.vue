<template>
  <aside class="chats-sidebar">
    <div class="sidebar-header">
      <div class="header-top">
        <h1 class="app-title">{{ isSearchMode ? 'Поиск' : 'Чаты' }}</h1>
        <div class="header-actions">
          <button @click="toggleSearch" :class="['btn-icon', { active: isSearchMode }]">
            <i class="fas fa-search"></i>
          </button>
          <button ref="menuTrigger" @click="toggleMenu" class="btn-icon">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
      
      <!-- Поле поиска -->
      <div v-if="isSearchMode" class="search-container">
        <div class="search-box">
          <i class="fas fa-search search-icon"></i>
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="Поиск по чатам и сообщениям..."
            class="search-input"
            ref="searchInput"
          />
          <button v-if="searchQuery" @click="clearSearch" class="clear-search">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Типы поиска -->
        <div class="search-tabs">
          <button 
            @click="searchType = 'all'" 
            :class="['search-tab', { active: searchType === 'all' }]"
          >
            Все
          </button>
          <button 
            @click="searchType = 'chats'" 
            :class="['search-tab', { active: searchType === 'chats' }]"
          >
            Чаты
          </button>
          <button 
            @click="searchType = 'messages'" 
            :class="['search-tab', { active: searchType === 'messages' }]"
          >
            Сообщения
          </button>
        </div>
      </div>
      
      <!-- Фильтры чатов (когда не в режиме поиска) -->
      <ChatFilters
        v-else
        :filters="[]"
        :custom-folders="customFolders"
        :active-filter="activeFilter"
        :chats="props.chats"
        :filter-orders="filterOrders"
        :inbox-badges="props.inboxBadges"
        @select-filter="onFilterSelect"
        @reorder-filters="onFiltersReorder"
        @create-folder="openFolderModal"
        @edit-folder="editFolder"
        @delete-folder="deleteFolder"
      />
    </div>

    <!-- Кнопка уведомлений (всегда видна) -->
    <div 
      v-if="!isSearchMode && showPushButton" 
      class="push-enable-section"
      @click="handleEnablePush"
    >
      <div class="push-enable-content">
        <i :class="['fas', pushNotificationsEnabled ? 'fa-bell' : 'fa-bell-slash', 'push-bell-icon', { 'enabled': pushNotificationsEnabled }]"></i>
        <div class="push-enable-text">
          <span class="push-enable-title">{{ pushNotificationsEnabled ? 'Уведомления включены' : 'Включить уведомления' }}</span>
          <span class="push-enable-subtitle">{{ pushNotificationsEnabled ? 'Вы будете получать push-уведомления' : 'Не пропускайте сообщения' }}</span>
        </div>
        <i class="fas fa-chevron-right push-arrow"></i>
      </div>
    </div>

    <!-- App install prompt -->
    <div
      v-if="!isSearchMode && appInstallVisible"
      class="push-enable-section app-install-section"
      @click="handleInstallApp"
    >
      <div class="push-enable-content">
        <i :class="['fas', appInstalled ? 'fa-check' : 'fa-mobile-screen-button', 'push-bell-icon', 'app-install-icon', { 'enabled': appInstalled }]"></i>
        <div class="push-enable-text">
          <span class="push-enable-title">{{ appInstalled ? 'Приложение установлено' : 'Установить приложение' }}</span>
          <span class="push-enable-subtitle">{{ appInstalled ? 'Можно запускать с главного экрана' : 'Добавить ярлык на главный экран' }}</span>
        </div>
        <i class="fas fa-chevron-right push-arrow"></i>
      </div>
    </div>

    <!-- Invites list -->
    <InvitesList 
      v-if="ctx.user && !isSearchMode" 
      :invites="invites"
      @accepted="onInviteAccepted" 
      @declined="onInviteDeclined"
    />

    <!-- Режим поиска -->
    <template v-if="isSearchMode">
      <!-- Индикатор загрузки -->
      <div v-if="isSearching" class="search-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Поиск...</span>
      </div>

      <!-- Начальное состояние -->
      <div v-else-if="!searchQuery || searchQuery.length < 2" class="search-empty">
        <i class="fas fa-search"></i>
        <p>Введите минимум 2 символа для поиска</p>
      </div>

      <!-- Нет результатов -->
      <div v-else-if="searchResults.chats.length === 0 && searchResults.messages.length === 0" class="search-empty">
        <i class="fas fa-inbox"></i>
        <p>Ничего не найдено</p>
        <span class="search-hint">Попробуйте изменить запрос</span>
      </div>

      <!-- Результаты поиска -->
      <div v-else class="search-results">
        <!-- Найденные чаты -->
        <div v-if="searchResults.chats.length > 0 && (searchType === 'all' || searchType === 'chats')" class="search-section">
          <h4 class="search-section-title">
            <i class="fas fa-comments"></i>
            Чаты ({{ searchResults.chats.length }})
          </h4>
          <div class="search-items">
            <div
              v-for="chat in searchResults.chats"
              :key="chat.feedId"
              @click="selectChat(chat.feedId)"
              :class="['search-item', 'chat-result', { 'paid-chat': chat.isPaid && chat.requiresSubscription }]"
            >
              <div class="chat-avatar" :style="getAvatarStyle(chat)">
                <span v-if="!hasChatAvatar(chat)">{{ getChatInitials(chat.title) }}</span>
              </div>
              <div class="search-item-content">
                <h5 class="search-item-title">
                  {{ chat.title }}
                  <i v-if="chat.isPaid" class="fas fa-crown paid-icon" title="Платный чат"></i>
                </h5>
                <p v-if="chat.description" class="search-item-desc">{{ chat.description }}</p>
                <span class="search-item-type">
                  <i v-if="chat.type === 'group'" class="fas fa-users"></i>
                  <i v-else-if="chat.type === 'channel'" class="fas fa-bullhorn"></i>
                  <i v-else class="fas fa-user"></i>
                  {{ getChatTypeLabel(chat.type) }}
                  <span v-if="chat.requiresSubscription" class="subscription-required-badge">
                    <i class="fas fa-lock"></i>
                    Требуется подписка
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Найденные сообщения -->
        <div v-if="searchResults.messages.length > 0 && (searchType === 'all' || searchType === 'messages')" class="search-section">
          <h4 class="search-section-title">
            <i class="fas fa-comment-dots"></i>
            Сообщения ({{ searchResults.messages.length }})
          </h4>
          <div class="search-items">
            <div
              v-for="message in searchResults.messages"
              :key="message.id"
              @click="goToMessage(message)"
              class="search-item message-result"
            >
              <div class="message-result-header">
                <span class="message-chat-name">{{ message.chatTitle }}</span>
                <span class="message-time">{{ formatTime(message.createdAt) }}</span>
              </div>
              <div class="message-result-author" v-if="message.author">
                <span class="author-name">{{ message.author.displayName || message.author.firstName }}</span>
              </div>
              <p class="message-result-text" v-html="highlightMatch(message.text)"></p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Обычный список чатов -->
    <template v-else>
      <div v-if="filteredChats.length === 0 && filteredPinnedChats.length === 0" class="empty-state">
        <i class="fas fa-comments"></i>
        <p>У вас пока нет чатов</p>
        <button @click="$emit('create-chat')" class="btn-create-empty">
          Создать первый чат
        </button>
      </div>

      <!-- Единый прокручиваемый список чатов -->
      <div v-if="filteredChats.length > 0 || filteredPinnedChats.length > 0" class="chats-list">
        <!-- Заголовок закрепленных -->
        <div v-if="filteredPinnedChats.length > 0" class="section-header">
          <i class="fas fa-thumbtack"></i>
          <span>Закрепленные</span>
        </div>

        <!-- Закрепленные чаты -->
        <div
          v-for="(chat, index) in filteredPinnedChats"
          :key="'pinned-' + chat.feedId"
          :draggable="activeFilter === 'all'"
          @dragstart="activeFilter === 'all' && onPinnedDragStart($event, index)"
          @dragover.prevent="activeFilter === 'all' && onPinnedDragOver($event, index)"
          @drop="activeFilter === 'all' && onPinnedDrop($event, index)"
          @dragend="activeFilter === 'all' && onPinnedDragEnd($event)"
          @click="selectChat(chat.feedId)"
          @contextmenu.prevent="openChatContextMenu($event, chat)"
          @touchstart="handleTouchStart($event, chat)"
          @touchend="handleTouchEnd"
          @touchmove="handleTouchMove"
          :class="['chat-item', 'pinned-chat-item', { 
            active: chat.feedId === selectedChat,
            dragging: draggedPinnedIndex === index
          }]"
        >
          <div v-if="activeFilter === 'all'" class="drag-handle" title="Перетащить для изменения порядка">
            <i class="fas fa-grip-lines"></i>
          </div>
          <div class="chat-avatar" :style="getAvatarStyle(chat)">
            <span v-if="!hasChatAvatar(chat)">{{ getChatInitials(chat.displayTitle || chat.title) }}</span>
          </div>
          <div class="chat-content">
            <div class="chat-row">
              <h3 class="chat-title">
                {{ chat.displayTitle || chat.title }}
                <span v-if="chat.isPublic" class="public-badge-inline" title="Публичный чат">
                  <i class="fas fa-globe"></i>
                </span>
                <span v-if="chat.isPaid" class="paid-badge-inline" title="Платный чат">
                  <i class="fas fa-crown"></i>
                </span>
              </h3>
              <div class="chat-meta">
                <span v-if="chat.isMember" class="chat-time">{{ formatTime(chat.lastMessage?.createdAt || chat.updatedAt) }}</span>
                <span v-if="getBadgeCount(chat) > 0" class="unread-badge" :title="`${getBadgeCount(chat)} непрочитанных`">
                  {{ getBadgeCount(chat) }}
                </span>
              </div>
            </div>
            <div class="chat-row">
              <p class="chat-preview">
                <template v-if="isSubscriptionExpired(chat)">
                  <span class="subscription-expired">
                    <i class="fas fa-lock"></i>
                    Подписка истекла
                  </span>
                </template>
                <template v-else-if="chat.lastMessage && chat.isMember">
                  <span class="last-message-author">{{ getLastMessageAuthorName(chat) }}:</span>
                  <span class="last-message-text">{{ cleanMentionsForPreview(chat.lastMessage.text) }}</span>
                </template>
                <template v-else-if="chat.isPublic && !chat.isMember">
                  <span class="join-hint">
                    <i class="fas fa-lock-open"></i>
                    Публичный {{ chat.type === 'channel' ? 'канал' : 'чат' }} · {{ chat.participantsCount || 0 }} {{ chat.type === 'channel' ? getSubscribersWord(chat.participantsCount) : getParticipantsWord(chat.participantsCount) }}
                  </span>
                </template>
                <template v-else>
                  <span v-if="chat.type === 'group'" class="type-badge">
                    <i class="fas fa-users"></i>
                  </span>
                  <span v-else-if="chat.type === 'channel'" class="type-badge">
                    <i class="fas fa-bullhorn"></i>
                  </span>
                  <span v-else class="type-badge">
                    <i class="fas fa-user"></i>
                  </span>
                  {{ chat.description || 'Нет сообщений' }}
                </template>
              </p>
            </div>
          </div>
          <button 
            class="unpin-btn" 
            @click.stop="unpinChat(chat.feedId)"
            title="Открепить"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Разделитель между закрепленными и обычными -->
        <div v-if="filteredPinnedChats.length > 0 && sortedChats.length > 0" class="chats-divider"></div>
        
        <!-- Обычные чаты -->
        <div
          v-for="chat in sortedChats"
          :key="chat.id"
          @click="selectChat(chat.feedId)"
          @contextmenu.prevent="openChatContextMenu($event, chat)"
          @touchstart="handleTouchStart($event, chat)"
          @touchend="handleTouchEnd"
          @touchmove="handleTouchMove"
          :class="['chat-item', { 
            active: chat.feedId === selectedChat,
            'public-chat': chat.isPublic && !chat.isMember,
            'long-press': longPressChat?.feedId === chat.feedId
          }]"
        >
          <div class="chat-avatar" :style="getAvatarStyle(chat)">
            <span v-if="!hasChatAvatar(chat)">{{ getChatInitials(chat.displayTitle || chat.title) }}</span>
          </div>
          <div class="chat-content">
            <div class="chat-row">
              <h3 class="chat-title">
                {{ chat.displayTitle || chat.title }}
                <span v-if="chat.isPublic" class="public-badge-inline" title="Публичный чат">
                  <i class="fas fa-globe"></i>
                </span>
                <span v-if="chat.isPaid" class="paid-badge-inline" title="Платный чат">
                  <i class="fas fa-crown"></i>
                </span>
              </h3>
              <div class="chat-meta">
                <span v-if="chat.isMember" class="chat-time">{{ formatTime(chat.lastMessage?.createdAt || chat.updatedAt) }}</span>
                <span v-if="getBadgeCount(chat) > 0" class="unread-badge" :title="`${getBadgeCount(chat)} непрочитанных`">
                  {{ getBadgeCount(chat) }}
                </span>
              </div>
            </div>
            <div class="chat-row">
              <p class="chat-preview">
                <template v-if="isSubscriptionExpired(chat)">
                  <span class="subscription-expired">
                    <i class="fas fa-lock"></i>
                    Подписка истекла
                  </span>
                </template>
                <template v-else-if="chat.lastMessage && chat.isMember">
                  <span class="last-message-author">{{ getLastMessageAuthorName(chat) }}:</span>
                  <span class="last-message-text">{{ cleanMentionsForPreview(chat.lastMessage.text) }}</span>
                </template>
                <template v-else-if="chat.isPublic && !chat.isMember">
                  <span class="join-hint">
                    <i class="fas fa-lock-open"></i>
                    Публичный {{ chat.type === 'channel' ? 'канал' : 'чат' }} · {{ chat.participantsCount || 0 }} {{ chat.type === 'channel' ? getSubscribersWord(chat.participantsCount) : getParticipantsWord(chat.participantsCount) }}
                  </span>
                </template>
                <template v-else>
                  <span v-if="chat.type === 'group'" class="type-badge">
                    <i class="fas fa-users"></i>
                  </span>
                  <span v-else-if="chat.type === 'channel'" class="type-badge">
                    <i class="fas fa-bullhorn"></i>
                  </span>
                  <span v-else class="type-badge">
                    <i class="fas fa-user"></i>
                  </span>
                  {{ chat.description || 'Нет сообщений' }}
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Модалки для работы с папками -->
    <!-- Drag & Drop для закрепленных -->
    <div v-if="draggedPinnedIndex !== -1" class="drag-overlay"></div>
    
    <FolderModal
      :is-open="folderModalOpen"
      :folder="editingFolder"
      :folder-chats="editingFolder ? (editingFolder.chatIds || []) : []"
      :all-chats="props.chats"
      @close="closeFolderModal"
      @save="saveFolder"
    />
    
    <AddToFolderModal
      :is-open="addToFolderModalOpen"
      :folders="customFolders"
      :chat-id="selectedChatForFolder?.feedId"
      :chat-folder-ids="selectedChatFolderIds"
      @close="addToFolderModalOpen = false"
      @toggle-folder="toggleChatInFolder"
      @create-folder="openFolderModal"
    />

    <!-- FAB для создания чата (не в режиме поиска) -->
    <button v-if="!isSearchMode" @click="$emit('create-chat')" class="fab">
      <i class="fas fa-plus"></i>
    </button>

    <!-- Кнопка закрыть поиск (в режиме поиска) -->
    <button v-else @click="closeSearch" class="fab close-search-fab">
      <i class="fas fa-arrow-left"></i>
    </button>

    <!-- Меню профиля -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <div 
        ref="menuElement"
        class="menu-dropdown" 
        @click.stop
        :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px', right: 'auto' }"
      >
        <div class="menu-header">
          <div class="user-avatar" :style="getUserAvatarStyle()">
            <span v-if="!hasUserAvatar">{{ getUserInitials() }}</span>
          </div>
          <div class="user-info">
            <span class="user-name">{{ ctx.user?.displayName || 'Пользователь' }}</span>
            <span class="user-role">{{ ctx.user?.accountRole || 'User' }}</span>
          </div>
        </div>
        <div class="menu-divider"></div>
        <button @click="$emit('show-profile'); showMenu = false" class="menu-item profile-link">
          <i class="fas fa-user-cog"></i>
          <span>Профиль</span>
        </button>
        <button @click="$emit('show-settings'); showMenu = false" class="menu-item settings-link">
          <i class="fas fa-cog"></i>
          <span>Настройки чатов</span>
        </button>
        <button @click="toggleTheme(); showMenu = false" class="menu-item theme-toggle">
          <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
          <span>{{ isDark ? 'Светлая тема' : 'Тёмная тема' }}</span>
        </button>
        <button v-if="canViewUsersList" @click="showUsersList = true; showMenu = false" class="menu-item">
          <i class="fas fa-users"></i>
          <span>Список пользователей</span>
        </button>
        
        <!-- Scale Control -->
        <div class="menu-divider"></div>
        <div class="menu-scale-control" @click.stop>
          <div class="scale-header">
            <i class="fas fa-expand"></i>
            <span>Масштаб</span>
            <span class="scale-value">{{ scaleDisplay }}</span>
          </div>
          <div class="scale-presets">
            <button
              v-for="preset in [100, 110, 125]"
              :key="preset"
              @click="setScale(preset)"
              :class="['scale-preset-btn', { active: scale === preset }]"
            >
              {{ preset }}%
            </button>
          </div>
        </div>
        
        <div class="menu-divider"></div>
        <button class="menu-item logout" @click="logout">
          <i class="fas fa-sign-out-alt"></i>
          <span>Выйти</span>
        </button>
      </div>
    </div>
    
    <!-- Контекстное меню для чата -->
    <div 
      v-if="showChatContextMenu" 
      class="context-menu-overlay"
      @click="showChatContextMenu = false"
    >
      <div 
        class="context-menu"
        :style="{ top: chatContextMenuPos.y + 'px', left: chatContextMenuPos.x + 'px' }"
        @click.stop
      >
        <button @click="openAddToFolder(contextMenuChat); showChatContextMenu = false" class="context-item">
          <i class="fas fa-folder-plus"></i>
          <span>Добавить в папку</span>
        </button>
        <button v-if="!isChatPinned(contextMenuChat)" @click="pinChat(contextMenuChat); showChatContextMenu = false" class="context-item">
          <i class="fas fa-thumbtack"></i>
          <span>Закрепить</span>
        </button>
        <button v-else @click="unpinChat(contextMenuChat?.feedId); showChatContextMenu = false" class="context-item">
          <i class="fas fa-times"></i>
          <span>Открепить</span>
        </button>
        <div class="context-menu-divider"></div>
        <!-- Кнопка удаления для личных чатов -->
        <button 
          v-if="contextMenuChat?.type === 'direct'" 
          @click="deleteDirectChat(contextMenuChat); showChatContextMenu = false" 
          class="context-item danger"
        >
          <i class="fas fa-trash"></i>
          <span>Удалить диалог</span>
        </button>
        <!-- Кнопка выхода для групповых чатов -->
        <button 
          v-else-if="contextMenuChat?.type === 'group' && contextMenuChat?.myRole !== 'owner'" 
          @click="leaveChat(contextMenuChat); showChatContextMenu = false" 
          class="context-item danger"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span>Выйти из чата</span>
        </button>
        <!-- Кнопка отписки для каналов -->
        <button 
          v-else-if="contextMenuChat?.type === 'channel' && contextMenuChat?.myRole !== 'owner'" 
          @click="unsubscribeChannel(contextMenuChat); showChatContextMenu = false" 
          class="context-item danger"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span>Отписаться</span>
        </button>
      </div>
    </div>

    <!-- Модалка списка пользователей -->
    <UsersListModal
      v-if="showUsersList"
      @close="showUsersList = false"
      @start-chat="onUserChatStart"
    />
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import InvitesList from './InvitesList.vue'
import ChatFilters from './ChatFilters.vue'
import FolderModal from './FolderModal.vue'
import AddToFolderModal from './AddToFolderModal.vue'
import UsersListModal from './UsersListModal.vue'

import { apiSearchRoute } from '../api/search.ts'
import { apiChatJoinRoute } from '../api/chats.ts'
import { useSmartPosition } from '../composables/useSmartPosition'
import { useTheme } from '../composables/useTheme'
import { apiBlockedUsersListRoute } from '../api/blocked-users'
import { cleanMentionsForPreview } from '../shared/mentions'
import { useScale } from '../composables/useScale'
import {
  apiChatFoldersListRoute,
  apiChatFoldersCreateRoute,
  apiChatFoldersUpdateRoute,
  apiChatFoldersDeleteRoute,
  apiChatFoldersReorderRoute,
  apiChatFoldersAddChatRoute,
  apiChatFoldersRemoveChatRoute,
  apiChatFoldersGetChatsRoute,
  apiChatFoldersGetForChatRoute,
} from '../api/chat-folders'
import {
  apiChatFilterOrdersGetRoute,
  apiChatFilterOrdersUpdateRoute,
} from '../api/chat-filter-orders'
import {
  apiPinnedChatsListRoute,
  apiPinnedChatsPinRoute,
  apiPinnedChatsUnpinRoute,
  apiPinnedChatsReorderRoute,
  apiPinnedChatsCheckRoute,
} from '../api/pinned-chats'
import {
  apiChatLeaveRoute,
  apiChannelUnsubscribeRoute,
  apiDirectChatDeleteRoute,
} from '../api/chat-actions'

const props = defineProps({
  chats: {
    type: Array,
    default: () => []
  },
  selectedChat: String,
  invites: {
    type: Array,
    default: () => []
  },
  inboxBadges: {
    type: Map,
    default: () => new Map()
  },
  user: {
    type: Object,
    default: null
  },
  pushNotificationsEnabled: {
    type: Boolean,
    default: false
  },
  pushBannerVisible: {
    type: Boolean,
    default: false
  },
  appInstallVisible: {
    type: Boolean,
    default: false
  },
  appInstalled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select-chat', 'show-profile', 'show-settings', 'create-chat', 'accept-invite', 'decline-invite', 'go-to-message', 'select-user-chat', 'enable-push', 'install-app'])

const { theme, toggleTheme, isDark } = useTheme()
const { scale, scaleDisplay, setScale } = useScale()

// Показ модалки списка пользователей
const showUsersList = ref(false)

// Проверка, может ли пользователь видеть список всех пользователей
const canViewUsersList = computed(() => {
  const role = ctx.user?.accountRole
  return role === 'Admin' || role === 'Staff' || role === 'Developer'
})

// Показывать ли кнопку уведомлений (теперь всегда если поддерживается API)
const showPushButton = computed(() => {
  // Не показываем если API не поддерживается
  if (!('Notification' in window)) {
    console.log('[ChatsList] ❌ Notifications API not supported, hiding button')
    return false
  }
  
  // Не показываем если denied (пользователь отказал)
  if (Notification.permission === 'denied') {
    console.log('[ChatsList] ⛔ Permission denied, hiding button')
    return false
  }
  
  // Проверяем iOS: пуши работают ТОЛЬКО если PWA установлено
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true
  
  if (isIOS && !isStandalone) {
    console.log('[ChatsList] 📱 iOS detected but NOT standalone, hiding button')
    return false
  }
  
  // Показываем кнопку ВСЕГДА (даже если уже granted)
  const status = Notification.permission
  console.log(`[ChatsList] 🔘 Showing push button (permission: ${status}, enabled: ${props.pushNotificationsEnabled})`)
  return true
})

// Обработчик клика по кнопке уведомлений
function handleEnablePush() {
  console.log('[ChatsList] 🔔 Push button clicked, emitting enable-push event')
  console.log(`[ChatsList] 📊 Current state: enabled=${props.pushNotificationsEnabled}, permission=${Notification.permission}`)
  emit('enable-push')
}

function handleInstallApp() {
  console.log('[ChatsList] App install button clicked, emitting install-app event')
  emit('install-app')
}

const showMenu = ref(false)
const menuTrigger = ref(null)
const menuElement = ref(null)
const activeFilter = ref('all')
const joiningChat = ref(null)

// Кастомные папки
const customFolders = ref([])
const folderModalOpen = ref(false)
const editingFolder = ref(null)
const addToFolderModalOpen = ref(false)
const selectedChatForFolder = ref(null)
const selectedChatFolderIds = ref([])

// Порядок фильтров
const filterOrders = ref([])

// Закрепленные чаты
const pinnedChats = ref([])
const pinnedChatIds = computed(() => new Set(pinnedChats.value.map(p => p.feedId)))

// Drag & Drop для закрепленных чатов
const draggedPinnedIndex = ref(-1)

// Закрепленные чаты с полными данными
const pinnedChatsWithData = computed(() => {
  return pinnedChats.value
    .map(pinned => {
      const fullChat = props.chats.find(c => c.feedId === pinned.feedId)
      return fullChat ? { ...fullChat, sortOrder: pinned.sortOrder } : null
    })
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

// Фильтрованные закрепленные чаты (по активному фильтру)
const filteredPinnedChats = computed(() => {
  let result = pinnedChatsWithData.value

  // Фильтрация по выбранному фильтру
  if (activeFilter.value === 'groups') {
    result = result.filter(c => c.type === 'group')
  } else if (activeFilter.value === 'personal') {
    result = result.filter(c => c.type === 'direct')
  } else if (activeFilter.value === 'channels') {
    result = result.filter(c => c.type === 'channel')
  } else if (activeFilter.value.startsWith('folder-')) {
    // Фильтрация по кастомной папке
    const folderId = activeFilter.value.replace('folder-', '')
    const folder = customFolders.value.find(f => f.id === folderId)
    if (folder && folder.chatIds) {
      result = result.filter(c => folder.chatIds.includes(c.feedId))
    }
  }

  return result
})

// Контекстное меню для чата
const showChatContextMenu = ref(false)
const chatContextMenuPos = ref({ x: 0, y: 0 })
const contextMenuChat = ref(null)

// Long press для мобильных устройств
const longPressTimer = ref(null)
const longPressChat = ref(null)
const longPressDuration = 500 // миллисекунд для долгого нажатия

// Локальное состояние участия в чатах (для реактивности)
const joinedChats = ref(new Set())

const { position: menuPosition, updatePosition: updateMenuPosition } = useSmartPosition()

// Чёрный список
const blockedUserIds = ref(new Set())
const blockedUsers = ref([])

async function loadBlockedUsers() {
  try {
    const response = await apiBlockedUsersListRoute.run(ctx)
    blockedUsers.value = response.blockedUsers
    blockedUserIds.value = new Set(response.blockedUsers.map(b => b.blockedUserId))
  } catch (error) {
    console.error('Ошибка загрузки чёрного списка:', error)
  }
}

// Поиск
const isSearchMode = ref(false)
const searchQuery = ref('')
const searchType = ref('all') // 'all' | 'chats' | 'messages'
const isSearching = ref(false)
const searchResults = ref({ chats: [], messages: [], totalCount: 0 })
const searchInput = ref(null)
let searchTimeout = null

const filteredChats = computed(() => {
  let result = props.chats.map(chat => ({
    ...chat,
    // Комбинируем isMember из пропсов и локальное состояние
    isMember: chat.isMember || joinedChats.value.has(chat.feedId)
  }))
  
  // Фильтруем личные чаты с заблокированными пользователями
  result = result.filter(chat => {
    if (chat.type !== 'direct') return true
    // Для личных чатов проверяем, не заблокирован ли собеседник
    const otherParticipant = chat.participants?.find(p => p.userId !== ctx.user?.id)
    if (otherParticipant && blockedUserIds.value.has(otherParticipant.userId)) {
      return false
    }
    return true
  })
  
  // Фильтрация по выбранному фильтру
  if (activeFilter.value === 'groups') {
    result = result.filter(c => c.type === 'group')
  } else if (activeFilter.value === 'personal') {
    result = result.filter(c => c.type === 'direct')
  } else if (activeFilter.value === 'channels') {
    result = result.filter(c => c.type === 'channel')
  } else if (activeFilter.value.startsWith('folder-')) {
    // Фильтрация по кастомной папке
    const folderId = activeFilter.value.replace('folder-', '')
    const folder = customFolders.value.find(f => f.id === folderId)
    console.log('filteredChats debug: folderId =', folderId, 'folder =', folder, 'allFolders =', customFolders.value)
    if (folder && folder.chatIds) {
      console.log('filteredChats debug: folder.chatIds =', folder.chatIds, 'chats feedIds =', result.map(c => c.feedId))
      result = result.filter(c => folder.chatIds.includes(c.feedId))
      console.log('filteredChats debug: filtered result =', result.length)
    }
  }
  
  return result
})

function toggleSearch() {
  isSearchMode.value = !isSearchMode.value
  if (isSearchMode.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  } else {
    clearSearch()
  }
}

async function toggleMenu() {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    await nextTick()
    await updateMenuPosition(menuTrigger.value, menuElement.value, {
      placement: 'bottom',
      alignment: 'end',
      offset: 8,
      fallbackPlacements: ['top', 'left'],
    })
  }
}

function closeSearch() {
  isSearchMode.value = false
  clearSearch()
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = { chats: [], messages: [], totalCount: 0 }
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
}

function onSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = { chats: [], messages: [], totalCount: 0 }
    return
  }
  
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return
  
  isSearching.value = true
  
  try {
    const result = await apiSearchRoute.run(ctx, {
      query: searchQuery.value,
      type: searchType.value,
    })
    
    searchResults.value = result
  } catch (error) {
    console.error('Ошибка поиска:', error)
  } finally {
    isSearching.value = false
  }
}

// Подсветка совпадений
function highlightMatch(text) {
  if (!text || !searchQuery.value) return text
  
  const query = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function getChatTypeLabel(type) {
  const labels = {
    group: 'Группа',
    direct: 'Личный',
    channel: 'Канал',
  }
  return labels[type] || 'Чат'
}

function goToMessage(message) {
  emit('go-to-message', {
    feedId: message.chatFeedId,
    messageId: message.id,
    chatTitle: message.chatTitle,
  })
  closeSearch()
}

// Обработка начала чата с пользователем из списка
function onUserChatStart(chat) {
  emit('select-user-chat', chat)
  selectChat(chat.feedId)
}

// Следим за изменением типа поиска
watch(searchType, () => {
  if (searchQuery.value && searchQuery.value.length >= 2) {
    performSearch()
  }
})

function getChatInitials(title) {
  if (!title) return '?'
  return title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function getUserInitials() {
  const name = ctx.user?.displayName || ctx.user?.firstName || 'U'
  return name.substring(0, 2).toUpperCase()
}

// Проверяем, есть ли у пользователя аватарка
const hasUserAvatar = computed(() => {
  if (props.user?.imageHash) return true
  if (props.user?.imageUrl) return true
  return false
})

// Получаем стиль для аватарки пользователя
function getUserAvatarStyle() {
  // Если есть imageHash - используем его
  if (props.user?.imageHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${props.user.imageHash}/s/128x) center/cover no-repeat`,
    }
  }
  
  // Если есть imageUrl - пробуем извлечь hash или использовать как есть
  if (props.user?.imageUrl) {
    // Если URL содержит chatium CDN - используем как есть
    if (props.user.imageUrl.includes('fs.chatium.ru')) {
      return {
        background: `url(${props.user.imageUrl}) center/cover no-repeat`,
      }
    }
    // Для других URL тоже используем
    return {
      background: `url(${props.user.imageUrl}) center/cover no-repeat`,
    }
  }
  
  // Градиент по умолчанию
  return {
    background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
  }
}

function getAvatarStyle(chat) {
  // Если у чата есть аватарка - показываем её как фон
  if (chat.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.avatarHash}/s/200x) center/cover no-repeat`,
    }
  }
  
  // Для личного чата показываем аватарку собеседника
  if (chat.type === 'direct' && chat.participants) {
    const otherParticipant = chat.participants.find(p => p.userId !== ctx.user?.id)
    if (otherParticipant?.user?.avatar) {
      return {
        background: `url(${otherParticipant.user.avatar}) center/cover no-repeat`,
      }
    }
  }
  
  // Градиент по умолчанию
  const colors = [
    ['#2AABEE', '#229ED9'],
    ['#4FC3F7', '#29B6F6'],
    ['#039BE5', '#0288D1'],
    ['#5C6BC0', '#3F51B5'],
    ['#42A5F5', '#2196F3'],
    ['#29B6F6', '#03A9F4'],
    ['#26C6DA', '#00BCD4'],
    ['#4DD0E1', '#00ACC1'],
  ]
  const index = (chat.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

// Проверяем, есть ли у чата аватарка (чтобы скрыть текстовые инициалы)
function hasChatAvatar(chat) {
  if (chat.avatarHash) return true
  if (chat.type === 'direct' && chat.participants) {
    const otherParticipant = chat.participants.find(p => p.userId !== ctx.user?.id)
    if (otherParticipant?.user?.avatar) return true
  }
  return false
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  
  if (isToday) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Вчера'
  }
  
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

async function selectChat(feedId) {
  // Если чат публичный и пользователь не участник - сначала присоединяемся
  const chat = props.chats.find(c => c.feedId === feedId)
  if (chat && chat.isPublic && !chat.isMember && !joinedChats.value.has(feedId)) {
    joiningChat.value = feedId
    try {
      const result = await apiChatJoinRoute({ feedId }).run(ctx, {})
      if (result.success) {
        joinedChats.value.add(feedId)
        joinedChats.value = new Set(joinedChats.value)
      }
    } catch (error) {
      console.error('Ошибка присоединения к чату:', error)
      alert(error.message || 'Не удалось присоединиться к чату')
      joiningChat.value = null
      return
    }
    joiningChat.value = null
  }
  
  emit('select-chat', feedId)
  window.location.hash = `#/chat/${feedId}`
}

async function logout() {
  try {
    await fetch('/s/auth/sign-out', { method: 'POST' })
    window.location.href = '/s/auth/signin'
  } catch (error) {
    console.error('Ошибка выхода:', error)
  }
}

function onInviteAccepted(feedId) {
  emit('accept-invite', feedId)
  selectChat(feedId)
}

function onInviteDeclined() {
  emit('decline-invite')
}

function getMessageAuthorId(message) {
  if (!message) return null
  if (message.author?.id) return message.author.id
  if (message.createdBy?.id) return message.createdBy.id
  if (message.createdBy) return message.createdBy
  if (message.created_by?.id) return message.created_by.id
  if (message.created_by) return message.created_by
  return null
}

function getLastMessageAuthorName(chat) {
  if (!chat.lastMessage) return 'Нет сообщений'
  
  const authorId = getMessageAuthorId(chat.lastMessage)
  
  if (authorId === ctx.user?.id) {
    return 'Вы'
  }
  
  if (chat.lastMessage.author) {
    const author = chat.lastMessage.author
    return author.firstName || author.displayName?.split(' ')[0] || 'Пользователь'
  }
  
  if (authorId) {
    return 'Пользователь'
  }
  
  return 'Неизвестно'
}

// Проверка, истекла ли подписка на платный чат
function isSubscriptionExpired(chat) {
  if (!chat.isPaid) return false
  if (!chat.subscriptionInfo) return false
  
  // Если статус подписки expired или cancelled - считаем истекшей
  if (chat.subscriptionInfo.status === 'expired' || chat.subscriptionInfo.status === 'cancelled') {
    return true
  }
  
  // Или проверяем по дате окончания
  if (!chat.subscriptionInfo.endDate) return false
  
  const endDate = new Date(chat.subscriptionInfo.endDate)
  return endDate < new Date()
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getParticipantsWord(count) {
  if (!count) return 'участников'
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'участников'
  if (lastDigit === 1) return 'участник'
  if (lastDigit >= 2 && lastDigit <= 4) return 'участника'
  return 'участников'
}

function getSubscribersWord(count) {
  if (!count) return 'подписчиков'
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'подписчиков'
  if (lastDigit === 1) return 'подписчик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'подписчика'
  return 'подписчиков'
}

async function joinChat(feedId) {
  joiningChat.value = feedId
  
  try {
    const result = await apiChatJoinRoute({ feedId }).run(ctx, {})
    
    if (result.success) {
      // Добавляем в локальный Set для реактивности
      joinedChats.value.add(feedId)
      joinedChats.value = new Set(joinedChats.value) // Триггер реактивности
      // Открываем чат
      emit('select-chat', feedId)
      window.location.hash = `#/chat/${feedId}`
    }
  } catch (error) {
    console.error('Ошибка присоединения к чату:', error)
    alert(error.message || 'Не удалось присоединиться к чату')
  } finally {
    joiningChat.value = null
  }
}

// === Работа с папками ===
async function loadFolders() {
  try {
    const [folders, orders] = await Promise.all([
      apiChatFoldersListRoute.run(ctx),
      apiChatFilterOrdersGetRoute.run(ctx).catch(() => []),
    ])
    
    filterOrders.value = orders
    
    // Загружаем чаты для каждой папки
    const foldersWithChats = await Promise.all(
      folders.map(async (folder) => {
        try {
          const chatIds = await apiChatFoldersGetChatsRoute({ id: folder.id }).run(ctx)
          return { ...folder, chatIds }
        } catch (e) {
          return { ...folder, chatIds: [] }
        }
      })
    )
    customFolders.value = foldersWithChats
  } catch (error) {
    console.error('Ошибка загрузки папок:', error)
  }
}

function onFilterSelect(filterId) {
  activeFilter.value = filterId
}

async function onFiltersReorder(newOrder) {
  try {
    // Сохраняем порядок всех фильтров (включая базовые)
    const orders = newOrder.map((item, index) => ({
      filterId: item.id,
      filterType: item.isCustom ? 'custom' : 'base',
      position: index,
    }))
    
    // Сохраняем в БД
    await apiChatFilterOrdersUpdateRoute.run(ctx, { orders })
    
    // Обновляем локальное состояние
    filterOrders.value = orders
    
    // Отправляем порядок кастомных папок отдельно (для совместимости)
    const folderIds = newOrder
      .filter(item => item.isCustom)
      .map(item => item.originalId)
    
    if (folderIds.length > 0) {
      await apiChatFoldersReorderRoute.run(ctx, { folderIds })
    }
    
    // Перезагружаем папки
    await loadFolders()
  } catch (error) {
    console.error('Ошибка изменения порядка папок:', error)
  }
}

function openFolderModal() {
  editingFolder.value = null
  folderModalOpen.value = true
}

function editFolder(folderId) {
  const folder = customFolders.value.find(f => f.id === folderId)
  if (folder) {
    editingFolder.value = folder
    folderModalOpen.value = true
  }
}

async function deleteFolder(folderId) {
  if (!confirm('Удалить эту папку? Чаты не будут удалены.')) return
  
  try {
    await apiChatFoldersDeleteRoute({ id: folderId }).run(ctx, {})
    await loadFolders()
    // Если удаляем активную папку - сбрасываем на "Все"
    if (activeFilter.value === `folder-${folderId}`) {
      activeFilter.value = 'all'
    }
  } catch (error) {
    console.error('Ошибка удаления папки:', error)
    alert('Не удалось удалить папку')
  }
}

function closeFolderModal() {
  folderModalOpen.value = false
  editingFolder.value = null
}

async function saveFolder(data) {
  try {
    if (editingFolder.value) {
      await apiChatFoldersUpdateRoute({ id: editingFolder.value.id }).run(ctx, data)
    } else {
      await apiChatFoldersCreateRoute.run(ctx, data)
    }
    folderModalOpen.value = false
    editingFolder.value = null
    await loadFolders()
  } catch (error) {
    console.error('Ошибка сохранения папки:', error)
    alert('Не удалось сохранить папку')
  }
}

// Добавление чата в папку
async function openAddToFolder(chat) {
  selectedChatForFolder.value = chat
  try {
    const folderIds = await apiChatFoldersGetForChatRoute({ feedId: chat.feedId }).run(ctx)
    selectedChatFolderIds.value = folderIds
    addToFolderModalOpen.value = true
  } catch (error) {
    console.error('Ошибка загрузки папок чата:', error)
    selectedChatFolderIds.value = []
    addToFolderModalOpen.value = true
  }
}

async function toggleChatInFolder(folderId) {
  if (!selectedChatForFolder.value) return
  
  const isInFolder = selectedChatFolderIds.value.includes(folderId)
  console.log('toggleChatInFolder debug:', { folderId, feedId: selectedChatForFolder.value.feedId, isInFolder })
  
  try {
    if (isInFolder) {
      await apiChatFoldersRemoveChatRoute({ id: folderId }).run(ctx, {
        feedId: selectedChatForFolder.value.feedId
      })
      selectedChatFolderIds.value = selectedChatFolderIds.value.filter(id => id !== folderId)
    } else {
      const result = await apiChatFoldersAddChatRoute({ id: folderId }).run(ctx, {
        feedId: selectedChatForFolder.value.feedId
      })
      console.log('toggleChatInFolder debug: add result =', result)
      selectedChatFolderIds.value.push(folderId)
    }
    // Перезагружаем папки для обновления счётчиков
    console.log('toggleChatInFolder debug: reloading folders...')
    await loadFolders()
    console.log('toggleChatInFolder debug: folders reloaded')
  } catch (error) {
    console.error('Ошибка изменения папки чата:', error)
  }
}

function openChatContextMenu(event, chat) {
  contextMenuChat.value = chat
  chatContextMenuPos.value = { x: event.clientX, y: event.clientY }
  showChatContextMenu.value = true
}

// Обработчики long press для мобильных
function handleTouchStart(event, chat) {
  // Не обрабатываем если есть несколько касаний
  if (event.touches.length > 1) return
  
  longPressChat.value = chat
  
  longPressTimer.value = setTimeout(() => {
    // Отменяем стандартное поведение (клик)
    event.preventDefault()
    // Открываем контекстное меню
    const touch = event.touches[0]
    contextMenuChat.value = chat
    // Позиционируем меню по центру экрана для мобильных
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    chatContextMenuPos.value = { 
      x: viewportWidth / 2 - 100, // примерная ширина меню 200px
      y: viewportHeight / 2 - 50
    }
    showChatContextMenu.value = true
    longPressChat.value = null
    
    // Вибрация если поддерживается
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, longPressDuration)
}

function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  longPressChat.value = null
}

function handleTouchMove() {
  // Если пользователь двигает палец - отменяем long press
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  longPressChat.value = null
}

// Сортировка чатов по дате последнего сообщения (исключаем закрепленные)
const sortedChats = computed(() => {
  return [...filteredChats.value]
    .filter(chat => !pinnedChatIds.value.has(chat.feedId))
    .sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
      const dateB = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
      return new Date(dateB) - new Date(dateA)
    })
})

// Удаление личного чата (диалога)
async function deleteDirectChat(chat) {
  if (!confirm('Удалить диалог? Собеседник сможет продолжать отправлять сообщения.')) {
    return
  }
  try {
    await apiDirectChatDeleteRoute.run(ctx, { feedId: chat.feedId })
    // Удаляем чат из списка локально
    emit('select-chat', null)
  } catch (error) {
    console.error('Ошибка удаления диалога:', error)
    alert('Не удалось удалить диалог: ' + error.message)
  }
}

// Выход из группового чата
async function leaveChat(chat) {
  if (!confirm('Выйти из чата? Вы больше не будете получать сообщения.')) {
    return
  }
  try {
    await apiChatLeaveRoute.run(ctx, { feedId: chat.feedId })
    // Удаляем чат из списка локально
    emit('select-chat', null)
  } catch (error) {
    console.error('Ошибка выхода из чата:', error)
    alert('Не удалось выйти из чата: ' + error.message)
  }
}

// Отписка от канала
async function unsubscribeChannel(chat) {
  if (!confirm('Отписаться от канала?')) {
    return
  }
  try {
    await apiChannelUnsubscribeRoute.run(ctx, { feedId: chat.feedId })
    // Удаляем чат из списка локально
    emit('select-chat', null)
  } catch (error) {
    console.error('Ошибка отписки от канала:', error)
    alert('Не удалось отписаться от канала: ' + error.message)
  }
}

defineExpose({
  reload: () => {}
})

function handleResize() {
  if (showMenu.value) {
    updateMenuPosition(menuTrigger.value, menuElement.value, {
      placement: 'bottom',
      alignment: 'end',
      offset: 8,
      fallbackPlacements: ['top', 'left'],
    })
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Загружаем чёрный список для фильтрации чатов
  loadBlockedUsers()
  // Загружаем кастомные папки
  loadFolders()
  // Загружаем закрепленные чаты
  loadPinnedChats()
  
  // Слушаем событие открытия модалки создания папки (из ChatView)
  window.addEventListener('open-create-folder-modal', openFolderModal)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('open-create-folder-modal', openFolderModal)
})

// Получение количества непрочитанных для чата
function getBadgeCount(chat) {
  if (!chat || !chat.inboxSubjectId) return 0
  return props.inboxBadges.get(chat.inboxSubjectId) || 0
}

// === Работа с закрепленными чатами ===
async function loadPinnedChats() {
  try {
    const response = await apiPinnedChatsListRoute.run(ctx)
    pinnedChats.value = response.pinnedChats
  } catch (error) {
    console.error('Ошибка загрузки закрепленных чатов:', error)
  }
}

function isChatPinned(chat) {
  if (!chat) return false
  return pinnedChatIds.value.has(chat.feedId)
}

async function pinChat(chat) {
  if (!chat) return
  try {
    await apiPinnedChatsPinRoute.run(ctx, { feedId: chat.feedId })
    await loadPinnedChats()
  } catch (error) {
    console.error('Ошибка закрепления чата:', error)
  }
}

async function unpinChat(feedId) {
  if (!feedId) return
  try {
    await apiPinnedChatsUnpinRoute.run(ctx, { feedId })
    await loadPinnedChats()
  } catch (error) {
    console.error('Ошибка открепления чата:', error)
  }
}

// Drag & Drop handlers для закрепленных чатов
function onPinnedDragStart(event, index) {
  draggedPinnedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  // Добавляем класс для стилизации
  event.target.classList.add('dragging')
}

function onPinnedDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

async function onPinnedDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedPinnedIndex.value
  
  if (dragIndex === -1 || dragIndex === dropIndex) return
  
  const newOrder = [...pinnedChatsWithData.value]
  const [removed] = newOrder.splice(dragIndex, 1)
  newOrder.splice(dropIndex, 0, removed)
  
  const feedIds = newOrder.map(c => c.feedId)
  
  // Обновляем локально сразу для отзывчивости
  pinnedChats.value = newOrder.map((chat, index) => ({
    feedId: chat.feedId,
    sortOrder: index
  }))
  
  try {
    await apiPinnedChatsReorderRoute.run(ctx, { feedIds })
    await loadPinnedChats()
  } catch (error) {
    console.error('Ошибка изменения порядка закрепленных чатов:', error)
    // Откатываем при ошибке
    await loadPinnedChats()
  }
  
  draggedPinnedIndex.value = -1
}

function onPinnedDragEnd(event) {
  if (event && event.target) {
    event.target.classList.remove('dragging')
  }
  draggedPinnedIndex.value = -1
}
</script>

<style scoped>
.chats-sidebar {
  width: 100%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 1;
  min-height: 0;
  /* Базовый размер шрифта для rem-единиц внутри компонента */
  font-size: 1rem;
}

.sidebar-header {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 0.75rem 1rem;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.125rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
}

.btn-icon.active {
  background: var(--accent-light);
  color: var(--accent-primary);
}

/* Поиск */
.search-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0 12px;
}

.search-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 8px;
  font-size: 14px;
  outline: none;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-search {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.search-tabs {
  display: flex;
  gap: 8px;
}

.search-tab {
  flex: 1;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.search-tab:hover {
  background: var(--bg-hover);
}

.search-tab.active {
  background: var(--accent-light);
  color: var(--accent-primary);
}

/* Состояния поиска */
.search-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 12px;
}

.search-loading i {
  font-size: 32px;
  color: var(--accent-primary);
}

.search-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 40px;
  text-align: center;
}

.search-empty i {
  font-size: 48px;
  margin-bottom: 16px;
}

.search-empty p {
  font-size: 14px;
  margin-bottom: 8px;
}

.search-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Результаты поиска */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.search-section {
  margin-bottom: 16px;
}

.search-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  padding: 8px 16px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-items {
  display: flex;
  flex-direction: column;
}

.search-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--bg-secondary);
}

.search-item:hover {
  background: var(--bg-hover);
}

.search-item-content {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.search-item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-type {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.paid-icon {
  color: #f59e0b;
  font-size: 12px;
  margin-left: 6px;
}

.subscription-required-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chat-result.paid-chat {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
}

/* Результаты сообщений */
.message-result {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.message-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-chat-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
}

.message-result-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.author-name {
  font-weight: 500;
}

.message-result-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 4px 0 0 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-result-text :deep(mark) {
  background: #ffd700;
  color: var(--text-primary);
  padding: 0 2px;
  border-radius: 2px;
}

/* Фильтры импортируются из ChatFilters.vue */

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 40px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 16px;
}

.btn-create-empty {
  padding: 12px 24px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-create-empty:hover {
  background: var(--accent-hover);
}

.chats-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--bg-secondary);
}

.chat-item:hover {
  background: var(--bg-hover);
}

.chat-item.active {
  background: var(--accent-light);
}

.chat-item.long-press {
  background: var(--bg-hover);
  transform: scale(0.98);
  transition: transform 0.1s, background 0.1s;
}

.chat-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.125rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.chat-content {
  flex: 1;
  min-width: 0;
}

.chat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.chat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chat-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.unread-badge {
  background: var(--accent-primary);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.chat-preview {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 2.25rem;
}

.last-message-author {
  color: var(--text-primary);
  font-weight: 500;
  margin-right: 5px;
}

.last-message-text {
  color: var(--text-secondary);
  
}

.type-badge {
  color: var(--text-muted);
  font-size: 12px;
}

.public-badge {
  color: #53bdeb;
  font-size: 12px;
}

.public-badge-inline {
  color: #53bdeb;
  font-size: 12px;
  margin-left: 6px;
}

.paid-badge-inline {
  color: #f59e0b;
  font-size: 12px;
  margin-left: 6px;
}

.join-hint {
  color: var(--text-muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.subscription-expired {
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-join {
  padding: 6px 14px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-join:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-join:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.public-chat {
  background: linear-gradient(90deg, rgba(0, 128, 105, 0.05) 0%, transparent 100%);
}

.fab {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.fab:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.close-search-fab {
  background: var(--text-secondary);
}

.close-search-fab:hover {
  background: var(--text-muted);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.menu-dropdown {
  position: fixed;
  width: 16.25rem;
  background: var(--menu-bg);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  padding: 0.75rem 0;
  z-index: 101;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.user-avatar {
  width: 3.025rem;
  height: 3.025rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.user-role {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.menu-divider {
  height: 1px;
  background: var(--menu-divider);
  margin: 8px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s;
  border: none;
  background: none;
  width: 100%;
  font-size: 0.875rem;
}

.menu-item:hover {
  background: var(--menu-hover);
}

.menu-item.logout {
  color: var(--danger-color);
}

.menu-item.profile-link {
  color: var(--accent-primary);
}

.menu-item.settings-link {
  color: var(--text-primary);
}

.menu-item.theme-toggle {
  color: var(--text-secondary);
}

.menu-item i {
  font-size: 18px;
}

/* Scale control in menu */
.menu-scale-control {
  padding: 12px 16px;
}

.scale-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-primary);
}

.scale-header i {
  font-size: 16px;
  color: var(--text-secondary);
}

.scale-value {
  margin-left: auto;
  font-weight: 600;
  color: var(--accent-primary);
  font-size: 13px;
}

.scale-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.625rem;
}

.scale-preset-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.scale-preset-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.scale-preset-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

/* Контекстное меню для чата */
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
}

.context-menu {
  position: fixed;
  min-width: 10rem;
  background: var(--menu-bg);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  padding: 0.375rem 0;
  z-index: 1001;
}

/* Мобильное контекстное меню */
@media (max-width: 768px) {
  .context-menu {
    position: fixed;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    min-width: 280px;
    max-width: 90vw;
    border-radius: 0.75rem;
    padding: 0.5rem 0;
  }
  
  .context-item {
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }
  
  .context-item i {
    font-size: 1.125rem;
    width: 1.5rem;
  }
}

.context-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  width: 100%;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
}

.context-item:hover {
  background: var(--menu-hover);
}

.context-item.danger {
  color: var(--danger-color);
}

.context-item i {
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.25rem 0;
}

/* Ширина управляется из App.vue через resize-handle */

@media (max-width: 768px) {
  .chats-sidebar {
    width: 100% !important;
    height: 100dvh;
    flex: 1;
  }
}

@media (max-width: 480px) {
  .sidebar-header {
    padding: 0.625rem 0.75rem;
  }
  
  .app-title {
    font-size: 1.125rem;
  }
  
  .chat-item {
    padding: 0.625rem 0.75rem;
  }
  
  .chat-avatar {
    width: 3.3rem;
    height: 3.3rem;
    font-size: 1rem;
  }
  
  .fab {
    bottom: 1rem;
    right: 1rem;
    width: 3.125rem;
    height: 3.125rem;
    font-size: 1.25rem;
  }
  
  .search-item {
    padding: 0.625rem 0.75rem;
  }
  
  .chat-avatar {
    width: 3.025rem;
    height: 3.025rem;
    font-size: 1rem;
  }
}

/* Заголовок секции закрепленных */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 5;
}

.section-header i {
  font-size: 0.625rem;
  transform: rotate(-45deg);
}

/* Разделитель между закрепленными и обычными чатами */
.chats-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

/* Drag handle для закрепленных чатов */
.pinned-chat-item {
  position: relative;
  padding-left: 0.5rem;
}

.drag-handle {
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: grab;
  padding: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pinned-chat-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.pinned-chat-item.dragging {
  opacity: 0.7;
  background: var(--accent-light);
}

/* Кнопка открепления */
.unpin-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  opacity: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.pinned-chat-item:hover .unpin-btn {
  opacity: 1;
}

.unpin-btn:hover {
  background: var(--bg-hover);
  color: var(--danger-color);
}

/* Overlay для drag & drop */
.drag-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.05);
  z-index: 50;
  pointer-events: none;
}

/* Мобильные стили */
@media (max-width: 768px) {
  .drag-handle {
    opacity: 1;
  }
  
  .unpin-btn {
    opacity: 1;
  }
  
  .section-header {
    padding: 0.625rem 0.75rem 0.375rem;
  }
}

/* Секция включения уведомлений */
.push-enable-section {
  background: linear-gradient(135deg, var(--accent-light, rgba(0, 128, 105, 0.1)) 0%, var(--accent-lighter, rgba(0, 128, 105, 0.05)) 100%);
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.push-enable-section:hover {
  background: linear-gradient(135deg, var(--accent-light-hover, rgba(0, 128, 105, 0.15)) 0%, var(--accent-lighter-hover, rgba(0, 128, 105, 0.08)) 100%);
}

.push-enable-content {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.push-bell-icon {
  width: 2.25rem;
  height: 2.25rem;
  background: var(--accent-color, #008069);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.app-install-icon {
  background: #2563eb;
}

.push-bell-icon.enabled {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

/* Темная тема для активной иконки */
[data-theme="dark"] .push-bell-icon.enabled {
  background: linear-gradient(135deg, #34D399 0%, #10B981 100%);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.push-enable-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.push-enable-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #111b21);
  line-height: 1.3;
}

.push-enable-subtitle {
  font-size: 0.8125rem;
  color: var(--text-secondary, #667781);
  line-height: 1.3;
}

.push-arrow {
  color: var(--text-muted, #8696a0);
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* Темная тема */
[data-theme="dark"] .push-enable-section {
  background: linear-gradient(135deg, rgba(0, 128, 105, 0.15) 0%, rgba(0, 128, 105, 0.08) 100%);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .push-enable-section:hover {
  background: linear-gradient(135deg, rgba(0, 128, 105, 0.2) 0%, rgba(0, 128, 105, 0.12) 100%);
}

[data-theme="dark"] .push-enable-title {
  color: var(--text-primary-dark, #ffffff);
}

[data-theme="dark"] .push-enable-subtitle {
  color: var(--text-secondary-dark, #aebac1);
}

[data-theme="dark"] .push-arrow {
  color: var(--text-muted-dark, #8696a0);
}

/* Мобильные стили для кнопки уведомлений */
@media (max-width: 768px) {
  .push-enable-section {
    padding: 0.75rem 0.875rem;
  }
  
  .push-bell-icon {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }
  
  .push-enable-title {
    font-size: 0.875rem;
  }
  
  .push-enable-subtitle {
    font-size: 0.75rem;
  }
}
</style>
