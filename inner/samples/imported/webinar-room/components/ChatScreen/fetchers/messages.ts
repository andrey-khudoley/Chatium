// @shared

import type { Message } from '../components/Messages.vue'

export async function fetchMessages(url: string) {
  const response = await get(url)
  const messages = processMessages(response.data.messages.reverse())

  return {
    messages,
    lastChangeId: response.data.lastChangeId
  }
}

export async function postMessage(
  url: string,
  message: {
    text: string
    files: any[]
  }
) {
  const response = await post(url, message)
}

function startDay(date: number): number {
  return new Date(date).setHours(0, 0, 0, 0)
}

export function processMessages(messages: Message[]) {
  type Result = { messages: Message[]; prevAuthor: string | null; prevDay: number | null }

  return messages.reduce(
    (result: Result, message: Message) => {
      const isSameAuthor = result.prevAuthor === message.author.id
      const isSameDay = result.prevDay === startDay(message.createdAt)

      result.messages.push(
        message.isSameAuthor === isSameAuthor && message.isSameDay === isSameDay
          ? message
          : { ...message, isSameAuthor, isSameDay }
      )

      result.prevAuthor = message.author.id
      result.prevDay = startDay(message.createdAt)

      return result
    },
    { messages: [], prevAuthor: null, prevDay: null }
  ).messages
}

export const post = async (url: string, data: unknown) =>
  (
    await fetch(url, {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(data)
    })
  ).json()

export const get = async (url: string) => (await fetch(url)).json()
