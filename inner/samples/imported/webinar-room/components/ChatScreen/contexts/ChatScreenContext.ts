// @shared
import type { SocketClient } from '@app/socket'
import { inject, InjectionKey, provide, reactive } from 'vue'
import type { Message } from '../components/Messages.vue'

export interface ChatScreenStore {
  chat: ChatiumJsonChatScreen
  messages: Message[]
  lastChangeId: string | null
  lastReadAt: number | null
  socketStore: SocketClient | null
  isAdmin?: boolean
  episodeId?: string
  adminIds?: string[]
  hideCta?: boolean
  paidFormIds?: string[]
  enableReplies?: boolean
  enableReactions?: boolean
}

export interface ChatiumJsonChatScreen {
  title?: string
  description?: string
  messages_get_url?: string
  messages_add_url?: string
  messages_edit_url?: string
  messages_delete_url?: string
  messages_changes_url?: string
  messages_react_url?: string
  on_context_api_call_url?: string
  mark_as_read_url?: string
  last_read_get_url?: string
  support_paging?: boolean
  get_files_put_url?: string
  files_put_url?: string
  reply_quotes_enabled?: boolean
  current_author?: ChatiumJsonChatScreenAuthor
  group_author?: ChatiumJsonChatScreenAuthor | null
  messages_socket_id?: string
  reactions_socket_id?: string
  last_read_at?: number
  last_read_socket_id?: string
  last_message_id?: string
  last_read_message_id?: string
  typing_socket_data?: {
    id?: string
    name?: string
    uid?: string
  }
  pinned?: {
    update_url?: string
  }
  render_inverted?: boolean
  episodeId?: string
}

interface ChatiumJsonChatScreenAuthor {
  id: string
  name: string
  avatar?: {
    image?: string
  }
  onClick?: {
    type: string
    url: string
  } | null
}

// Create a type-safe injection key
export const ChatScreenKey = Symbol('ChatScreenContext') as InjectionKey<ChatScreenStore>

// Create a reactive store with default values
const defaultStore: ChatScreenStore = {
  chat: {},
  messages: [],
  lastChangeId: null,
  lastReadAt: null,
  socketStore: null
}

// Provider function to set up the context
export function provideChatScreen(initialStore: Partial<ChatScreenStore> = {}) {
  const store = reactive<ChatScreenStore>({
    ...defaultStore,
    ...initialStore
  })

  provide(ChatScreenKey, store)

  return store
}

// Provider that directly provides an existing reactive store (no copy)
export function provideExistingChatScreen(store: ChatScreenStore) {
  provide(ChatScreenKey, store)
}

// Consumer function to use the context
export function useChatScreenContext(): ChatScreenStore {
  const context = inject(ChatScreenKey)

  if (!context) {
    console.warn('ChatScreenContext was not provided. Using default empty context.')
    return reactive<ChatScreenStore>({ ...defaultStore })
  }

  return context
}
