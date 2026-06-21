// @shared

import { request } from '@app/request'

export interface AppUiActionApiCall {
  type: 'apiCall'
  url: string
  apiParams: Record<string, unknown>
}

export interface AppUiActionNavigate {
  type: 'navigate'
  url: string
}

export interface AppUiActionRefresh {
  type: 'refresh'
}

export interface AppUiActionSendMessage {
  type: 'sendMessage'
}

export type AppUiAction =
  | AppUiActionRefresh
  | AppUiActionNavigate
  | AppUiActionApiCall
  | AppUiActionSendMessage
export type AppUiActions = AppUiAction | AppUiAction[]

export async function processActions(actionOrActions: AppUiActions | undefined, navigator: any) {
  if (!actionOrActions) return true

  const actions = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]

  for (const action of actions) {
    if (action.type === 'apiCall') {
      try {
        const response = await request.post<{ success: boolean; appAction?: any }>(
          action.url,
          action.apiParams ?? {}
        )
        if (response.body.success) {
          if (response.body.appAction) {
            return await processActions(response.body.appAction, navigator)
          }
          return true
        }
        return false
      } catch (error) {
        console.error(error)
        return false
      }
    } else if (action.type === 'refresh') {
      navigator?.refresh(action)
      return true
    } else if (action.type === 'sendMessage') {
      await navigator?.sendMessage(action)
      return true
    } else if (action.type === 'navigate') {
      await navigator?.navigate(action)
      return true
    }

    console.log('processAction unknown type', action)

    return true
  }
}

// function handlers(block) {
//   return {
//     onClick: block.onClick ? () => processActions(block.onClick) : undefined,
//   }
// }

// function Box({ block }) {
//   return h(
//     'div',
//     { class: 'chatium-json-presenter-box', style: appUiStyleToCss(block.style) },
//     JSON.stringify(block.containerStyle),
//     h(ChatiumJsonPresenter, { blocks: block.blocks ?? [], onRefresh, onSendMessage }),
//   )
// }

// function Button({ block }) {
//   return h('div', { class: 'chatium-json-presenter-container', style: appUiStyleToCss(block.containerStyle) }, [
//     h('button', { class: 'chatium-json-presenter-button', ...handlers(block) }, block.title),
//   ])
// }
