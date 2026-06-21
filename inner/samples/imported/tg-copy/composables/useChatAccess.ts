// @shared
import { ref } from 'vue'
import { apiChatSubscriptionCheckAccessRoute } from '../api/chat-subscriptions'
import { apiChatPublicInfoRoute } from '../api/chats'

export interface AccessCheckResult {
  loading: boolean
  hasAccess: boolean
  isPaid: boolean
  reason: string | null
  plans: any[]
  subscription: any | null
  chat: any | null
}

export function useChatAccess() {
  const accessCheck = ref<AccessCheckResult>({
    loading: true,
    hasAccess: false,
    isPaid: false,
    reason: null,
    plans: [],
    subscription: null,
    chat: null,
  })

  async function checkAccess(feedId: string) {
    accessCheck.value.loading = true
    try {
      const result = await apiChatSubscriptionCheckAccessRoute({ feedId }).run(ctx, {})
      
      accessCheck.value = {
        loading: false,
        hasAccess: result.hasAccess,
        isPaid: result.isPaid,
        reason: result.reason || null,
        plans: result.plans || [],
        subscription: result.subscription || null,
        chat: result.chat || null,
      }

      // Если нет доступа к платному чату, загружаем публичную инфу
      if (!result.hasAccess && result.isPaid) {
        try {
          const publicInfo = await apiChatPublicInfoRoute({ feedId }).run(ctx)
          accessCheck.value.chat = publicInfo.chat
        } catch (err) {
          console.error('Failed to load public chat info:', err)
        }
      }
      
      return result.hasAccess
    } catch (err) {
      console.error('Failed to check access:', err)
      accessCheck.value = {
        loading: false,
        hasAccess: false,
        isPaid: false,
        reason: 'error',
        plans: [],
        subscription: null,
        chat: null,
      }
      return false
    }
  }

  function reset() {
    accessCheck.value = {
      loading: true,
      hasAccess: false,
      isPaid: false,
      reason: null,
      plans: [],
      subscription: null,
      chat: null,
    }
  }

  return {
    accessCheck,
    checkAccess,
    reset,
  }
}
