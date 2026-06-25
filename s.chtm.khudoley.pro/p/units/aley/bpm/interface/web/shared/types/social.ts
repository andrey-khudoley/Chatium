// @shared

export interface Message {
  id: string
  role: 'me' | 'ai' | 'them'
  text: string
  time: string
}

export interface Thread {
  id: string
  name: string
  ai: boolean
  last: string
  time: string
  unread: number
  messages: Message[]
}

export interface Service {
  id: string
  name: string
  desc: string
  cat: string
  on: boolean
  tag?: string
  glyph: string
  last: string
}
